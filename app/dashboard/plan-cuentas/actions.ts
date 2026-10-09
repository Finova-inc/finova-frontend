"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
    ApiError,
    cuentasApi,
    mensajesDelBackend,
    type ActualizarCuentaInput,
    type ConfigurarPlanInput,
    type CrearCuentaInput,
    type CuentaContable,
} from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";

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

/** Quita la cuenta del plan: el backend la borra si nunca tuvo historia y, si la tiene, la desactiva. */
export async function eliminarCuenta(id: string): Promise<{ errores?: readonly string[]; ok?: boolean }> {
    const token = await exigirTokenSesion();

    try {
        await cuentasApi.eliminar(id, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos quitar la cuenta del plan.") };
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
 * "Configurar plan de cuentas": crea lo marcado del plan base y las cuentas
 * propias, y completa la estructura de lo existente. Administrador o
 * contador; 409 si el plan es propio o una cuenta propia choca con otra.
 */
export async function configurarPlan(
    datos: ConfigurarPlanInput,
): Promise<{ errores?: readonly string[]; creadas?: number }> {
    const token = await exigirTokenSesion();

    let creadas: number;
    try {
        ({ cuentas_creadas: creadas } = await cuentasApi.configurar(datos, { token }));
    } catch (error) {
        return { errores: traducirError(error, "No pudimos guardar la configuración del plan de cuentas.") };
    }

    revalidar();
    return { creadas };
}
