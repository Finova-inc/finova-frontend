"use server";

/* ============================================================================
   Server Action de "¿Olvidaste tu contraseña?".

   Llama al backend por lib/api.ts. Tras pedir el enlace SIEMPRE se muestra el
   mismo mensaje: el backend responde igual exista o no la cuenta, y aquí no se
   agrega nada que la distinga.
   ========================================================================== */

import { ApiError, authApi } from "@/lib/api";
import { formatearRut } from "@/lib/formato";
import { mensajeDeError, MENSAJE_RECUPERACION } from "@/lib/recuperacion";
import { validateRut } from "@/lib/validation";

export interface EstadoRecuperar {
    readonly enviado?: boolean;
    readonly mensaje?: string;
    readonly errorRut?: string;
    readonly error?: string;
}

export async function solicitarRecuperacion(_anterior: EstadoRecuperar, formData: FormData): Promise<EstadoRecuperar> {
    const rut = String(formData.get("rut") ?? "");
    const valido = validateRut(rut);
    if (!valido.isValid) return { errorRut: valido.message };

    try {
        await authApi.recuperar(formatearRut(rut));
        return { enviado: true, mensaje: MENSAJE_RECUPERACION };
    } catch (error) {
        return { error: mensajeDeError(error instanceof ApiError ? error.status : 500, "recuperar") };
    }
}
