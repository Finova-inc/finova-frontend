"use server";

/* ============================================================================
   Server Actions de periodos contables.

   Abrir, cerrar y reabrir meses. Las reglas (quien puede, que meses se pueden
   cerrar) las aplica el backend; aqui se traducen sus respuestas.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, mensajesDelBackend, periodosApi } from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";

export interface EstadoPeriodo {
    readonly errores?: readonly string[];
    readonly ok?: boolean;
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

/** El libro diario muestra si el mes en curso tiene periodo: se revalida tambien. */
function revalidar() {
    revalidatePath("/dashboard/periodos");
    revalidatePath("/dashboard/core-contable");
}

export async function abrirPeriodo(
    _estadoPrevio: EstadoPeriodo,
    datosFormulario: FormData,
): Promise<EstadoPeriodo> {
    const token = await exigirTokenSesion();
    const anio = Number(datosFormulario.get("anio"));
    const mes = Number(datosFormulario.get("mes"));

    if (!Number.isInteger(anio) || anio < 2000 || anio > 2100) {
        return { errores: ["El año debe estar entre 2000 y 2100."] };
    }
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) {
        return { errores: ["Elige un mes válido."] };
    }

    try {
        await periodosApi.crear({ anio, mes }, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos abrir el período.") };
    }

    revalidar();
    return { ok: true };
}

export async function cerrarPeriodo(id: string): Promise<EstadoPeriodo> {
    const token = await exigirTokenSesion();

    try {
        await periodosApi.cerrar(id, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos cerrar el período.") };
    }

    revalidar();
    return { ok: true };
}

export async function reabrirPeriodo(id: string, motivo: string): Promise<EstadoPeriodo> {
    const token = await exigirTokenSesion();

    const motivoLimpio = motivo.trim();
    if (motivoLimpio.length < 10 || motivoLimpio.length > 255) {
        return { errores: ["El motivo debe tener entre 10 y 255 caracteres."] };
    }

    try {
        await periodosApi.reabrir(id, motivoLimpio, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos reabrir el período.") };
    }

    revalidar();
    return { ok: true };
}
