"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
    ApiError,
    mensajesDelBackend,
    notasEeffApi,
    type ClaveTexto,
    type DatosEjercicioInput,
} from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";

export interface EstadoNota {
    readonly errores?: readonly string[];
    readonly ok?: boolean;
}

function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

// Hoy cualquier usuario de la empresa puede editar: los permisos por rol aún no existen en la app.
export async function guardarTextoNota(ejercicio: number, clave: ClaveTexto, texto: string): Promise<EstadoNota> {
    const token = await exigirTokenSesion();
    try {
        await notasEeffApi.guardarTexto(ejercicio, clave, texto, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos guardar la sección.") };
    }
    revalidatePath("/dashboard/balance/notas");
    return { ok: true };
}

export async function guardarDatosEjercicio(ejercicio: number, datos: DatosEjercicioInput): Promise<EstadoNota> {
    const token = await exigirTokenSesion();
    try {
        await notasEeffApi.guardarEjercicio(ejercicio, datos, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos guardar los datos del ejercicio.") };
    }
    revalidatePath("/dashboard/balance/notas");
    return { ok: true };
}
