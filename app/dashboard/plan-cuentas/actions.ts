"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
    ApiError,
    cuentasApi,
    mensajesDelBackend,
    type ActualizarCuentaInput,
    type CrearCuentaInput,
    type CuentaContable,
} from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";

export interface EstadoPlantilla {
    readonly errores?: readonly string[];
    readonly creadas?: number;
}

export interface EstadoCuenta {
    readonly errores?: readonly string[];
    readonly cuenta?: CuentaContable;
}

function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return ["Tu rol en esta empresa no permite esta operación."];
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

/** El selector de cuenta del libro diario tambien depende del plan de cuentas. */
function revalidar() {
    revalidatePath("/dashboard/plan-cuentas");
    revalidatePath("/dashboard/core-contable");
}

export async function crearCuenta(datos: CrearCuentaInput): Promise<EstadoCuenta> {
    const token = await exigirTokenSesion();

    let cuenta: CuentaContable;
    try {
        cuenta = await cuentasApi.crear(datos, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos crear la cuenta.") };
    }

    revalidar();
    return { cuenta };
}

export async function actualizarCuenta(id: string, datos: ActualizarCuentaInput): Promise<EstadoCuenta> {
    const token = await exigirTokenSesion();

    let cuenta: CuentaContable;
    try {
        cuenta = await cuentasApi.actualizar(id, datos, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos actualizar la cuenta.") };
    }

    revalidar();
    return { cuenta };
}

export async function desactivarCuenta(id: string): Promise<{ errores?: readonly string[]; ok?: boolean }> {
    const token = await exigirTokenSesion();

    try {
        await cuentasApi.desactivar(id, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos desactivar la cuenta.") };
    }

    revalidar();
    return { ok: true };
}

/** Vuelve a ofrecer la cuenta para nuevos movimientos. El DELETE solo
 *  desactiva (nunca borra), así que reactivar es un PATCH normal. */
export async function reactivarCuenta(id: string): Promise<{ errores?: readonly string[]; ok?: boolean }> {
    const token = await exigirTokenSesion();

    try {
        await cuentasApi.actualizar(id, { is_active: true }, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos reactivar la cuenta.") };
    }

    revalidar();
    return { ok: true };
}

/**
 * Carga el plan de cuentas base PYME. El backend solo lo acepta de un
 * administrador y en una empresa sin cuentas (409 si ya tiene).
 */
export async function cargarPlanBase(): Promise<EstadoPlantilla> {
    const token = await exigirTokenSesion();

    let creadas: number;
    try {
        creadas = (await cuentasApi.cargarPlantilla({ token })).cuentas_creadas;
    } catch (error) {
        if (error instanceof ApiError) {
            if (error.status === 401) redirect("/login");
            if (error.status === 403) {
                return { errores: ["Solo un administrador de la empresa puede cargar el plan de cuentas."] };
            }
        }
        return { errores: mensajesDelBackend(error) ?? ["No pudimos cargar el plan de cuentas."] };
    }

    revalidatePath("/dashboard/plan-cuentas");
    revalidatePath("/dashboard/core-contable");
    return { creadas };
}
