"use server";

/* ============================================================================
   Server Actions de periodos contables.

   Abrir, cerrar y reabrir meses, siempre de a uno: no hay apertura en bloque.
   Las reglas (quien puede, que meses se pueden abrir o cerrar) las aplica el
   backend; aqui se traducen sus respuestas.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, mensajesDelBackend, periodosApi } from "@/lib/api";
import { hoyEnChile, nombreMesLargo, nombrePeriodo } from "@/lib/formato";
import { esMesFuturo } from "@/lib/periodos";
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

function anioValido(anio: number): boolean {
    return Number.isInteger(anio) && anio >= 2000 && anio <= 2100;
}

/**
 * Abre un mes: el selector de un ejercicio vacío, la tarjeta del mes y el
 * aviso del formulario de asiento. En un año anterior la pantalla lo llama
 * "cargar", pero es la misma operación.
 */
export async function abrirMes(anio: number, mes: number): Promise<EstadoPeriodo> {
    const token = await exigirTokenSesion();

    if (!anioValido(anio)) return { errores: ["El año debe estar entre 2000 y 2100."] };
    if (!Number.isInteger(mes) || mes < 1 || mes > 12) return { errores: ["Elige un mes válido."] };

    // El backend rechaza un mes que todavía no comienza. Se revisa también
    // aquí solo para responder en lenguaje llano en vez de "11/2026".
    if (esMesFuturo({ anio, mes }, hoyEnChile())) {
        return {
            errores: [
                `El período de ${nombrePeriodo(anio, mes)} todavía no comienza: se podrá abrir desde el 1 de ${nombreMesLargo(mes)}.`,
            ],
        };
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
