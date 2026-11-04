"use server";

/* ============================================================================
   Server Action de "Elegir una contraseña nueva" (enlace del correo).

   La validación de aquí es de experiencia de usuario; el backend aplica la
   política desde cero. Éxito: vuelve a /login con el aviso de contraseña
   actualizada. Si el enlace no sirve, devuelve `enlaceInvalido` para que la
   pantalla ofrezca pedir otro.
   ========================================================================== */

import { redirect } from "next/navigation";
import { ApiError, authApi, mensajesDelBackend } from "@/lib/api";
import { errorDeConfirmacion, mensajeDeError, MENSAJE_ENLACE_INVALIDO, tokenDeUrl } from "@/lib/recuperacion";
import { validateNuevaPassword } from "@/lib/validation";

export interface EstadoRestablecer {
    readonly errorClave?: string;
    readonly errorConfirmacion?: string;
    readonly error?: string;
    /** El enlace no sirve (inválido, usado o vencido): la pantalla ofrece pedir otro. */
    readonly enlaceInvalido?: boolean;
}

export async function restablecerClave(_anterior: EstadoRestablecer, formData: FormData): Promise<EstadoRestablecer> {
    const token = tokenDeUrl(String(formData.get("token") ?? ""));
    if (!token) return { enlaceInvalido: true };

    const clave = String(formData.get("clave") ?? "");
    const confirmacion = String(formData.get("confirmacion") ?? "");

    const validacion = validateNuevaPassword(clave);
    if (!validacion.isValid) return { errorClave: validacion.message };
    const noCoincide = errorDeConfirmacion(clave, confirmacion);
    if (noCoincide) return { errorConfirmacion: noCoincide };

    try {
        await authApi.restablecer(token, clave);
    } catch (error) {
        if (error instanceof ApiError) {
            // Con 400 puede ser el enlace o la política (el backend dice cuál): la política se muestra tal cual.
            if (error.status === 400) {
                const delBackend = mensajesDelBackend(error)?.join(" ");
                if (delBackend && delBackend !== MENSAJE_ENLACE_INVALIDO) return { errorClave: delBackend };
                return { enlaceInvalido: true };
            }
            return { error: mensajeDeError(error.status, "restablecer") };
        }
        return { error: mensajeDeError(500, "restablecer") };
    }

    redirect("/login?clave=actualizada");
}
