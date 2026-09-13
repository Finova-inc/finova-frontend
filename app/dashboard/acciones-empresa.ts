"use server";

/* ============================================================================
   Cambio de empresa activa.

   ---------------------------------------------------------------------------
   POR QUE UNA SERVER ACTION Y NO UN ROUTE HANDLER
   ---------------------------------------------------------------------------
   El login usa un route handler porque lo llama el navegador con fetch. Aquí no
   hace falta: el selector es un formulario, y una Server Action puede escribir
   cookies directamente (un Server Component no).

   Lo importante es que el token nuevo NUNCA pasa por el cliente. Llega del
   backend a este código de servidor, se guarda en la cookie httpOnly y se
   descarta. El navegador solo ve que la página se recargó con otros datos.
   ========================================================================== */

import { cookies } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, authApi } from "@/lib/api";
import {
    DURACION_SESION_SEGUNDOS,
    NOMBRE_COOKIE_SESION,
    OPCIONES_COOKIE_SESION,
    exigirTokenSesion,
} from "@/lib/session";

export interface EstadoCambioEmpresa {
    readonly error?: string;
}

export async function cambiarEmpresa(
    _estadoPrevio: EstadoCambioEmpresa,
    datosFormulario: FormData,
): Promise<EstadoCambioEmpresa> {
    const token = await exigirTokenSesion();
    const id_empresa = String(datosFormulario.get("id_empresa") ?? "").trim();

    if (!id_empresa) {
        return { error: "No se indicó a qué empresa cambiar." };
    }

    let nuevoToken: string;

    try {
        const respuesta = await authApi.cambiarEmpresa(id_empresa, { token });
        nuevoToken = respuesta.access_token;
    } catch (error) {
        if (error instanceof ApiError) {
            if (error.status === 401) redirect("/login");
            // 404 es la respuesta del backend cuando el usuario no pertenece a
            // esa empresa. Se devuelve 404 y no 403 a propósito: un 403
            // confirmaría que esa empresa existe.
            if (error.status === 404) {
                return { error: "No tienes acceso a esa empresa." };
            }
            if (error.status === 0 || error.status === 408) {
                return { error: "No pudimos contactar al servidor." };
            }
        }
        return { error: "No pudimos cambiar de empresa. Inténtalo de nuevo." };
    }

    const almacen = await cookies();
    almacen.set({
        name: NOMBRE_COOKIE_SESION,
        value: nuevoToken,
        ...OPCIONES_COOKIE_SESION,
        maxAge: DURACION_SESION_SEGUNDOS,
    });

    /**
     * Se revalida el layout entero, no solo la página.
     *
     * Todos los datos del panel dependen de la empresa del token. Revalidar
     * una sola ruta dejaría el resto en caché mostrando cifras de la empresa
     * anterior, que en una herramienta contable es peor que un error visible.
     */
    revalidatePath("/dashboard", "layout");

    return {};
}
