"use server";

/* ============================================================================
   Empresas del usuario: cambiar la activa, agregar y eliminar.

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
import { ApiError, authApi, empresasApi, mensajesDelBackend, type Empresa, type EmpresaCreada } from "@/lib/api";
import { formatearRut } from "@/lib/formato";
import {
    DURACION_SESION_SEGUNDOS,
    NOMBRE_COOKIE_SESION,
    OPCIONES_COOKIE_SESION,
    exigirTokenSesion,
    obtenerEmpresaDelToken,
} from "@/lib/session";
import { validarNuevaEmpresa, validarRazonSocial } from "@/lib/validation";

export interface EstadoCambioEmpresa {
    readonly error?: string;
}

/** Resultado de agregar o eliminar: errores para el paso, o un aviso para la lista. */
export interface ResultadoEmpresa {
    readonly errores?: readonly string[];
    readonly aviso?: string;
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

    await guardarSesion(nuevoToken);

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

/**
 * Agrega una empresa; quien la crea queda como su administrador.
 *
 * Quién puede hacerlo lo decide el backend (administrador o contador de la
 * empresa activa). Aquí solo se repiten las reglas de formato para responder
 * en el idioma del formulario en vez de con un 400.
 */
export async function crearEmpresa(rut: string, razon_social: string): Promise<ResultadoEmpresa> {
    const token = await exigirTokenSesion();

    const errores = validarNuevaEmpresa(rut, razon_social);
    if (errores.length > 0) return { errores };

    let empresa: EmpresaCreada;
    try {
        empresa = await empresasApi.crear(
            { rut: formatearRut(rut), razon_social: razon_social.trim() },
            { token },
        );
    } catch (error) {
        return {
            errores: traducirError(
                error,
                "No pudimos agregar la empresa. Inténtalo de nuevo.",
                "Tu rol en la empresa activa no permite agregar empresas.",
            ),
        };
    }

    // La lista del popup sale de mis-empresas, que lee el layout.
    revalidatePath("/dashboard", "layout");

    return {
        aviso: empresa.recuperada
            ? `Recuperamos ${empresa.razon_social} con todos sus datos.`
            : `Agregaste ${empresa.razon_social}. Entra a ella desde la lista.`,
    };
}

/**
 * Da de baja una empresa (el backend exige ser su administrador).
 *
 * `razon_social` solo arma el aviso; la autorización va por el id.
 *
 * Si era la empresa activa, el token queda apuntando a una empresa que ya no
 * existe para nadie, así que se cambia a otra antes de volver a pintar el
 * panel: mostrar cifras de una empresa eliminada sería peor que un error.
 */
export async function eliminarEmpresa(
    id_empresa: string,
    razon_social: string,
): Promise<ResultadoEmpresa> {
    const token = await exigirTokenSesion();
    const idEmpresaActual = await obtenerEmpresaDelToken();

    try {
        await empresasApi.eliminar(id_empresa, { token });
    } catch (error) {
        return {
            errores: traducirError(
                error,
                "No pudimos eliminar la empresa. Inténtalo de nuevo.",
                "Solo un administrador de esa empresa puede eliminarla.",
            ),
        };
    }

    let aviso = `Eliminaste ${razon_social}.`;

    if (id_empresa === idEmpresaActual) {
        try {
            // El backend no deja eliminar la única empresa, así que siempre queda otra.
            const [siguiente] = await authApi.misEmpresas({ token, cache: "no-store" });
            const respuesta = await authApi.cambiarEmpresa(siguiente.id_empresa, { token });
            await guardarSesion(respuesta.access_token);
            aviso = `Eliminaste ${razon_social}. Ahora estás en ${siguiente.razon_social ?? "otra de tus empresas"}.`;
        } catch {
            revalidatePath("/dashboard", "layout");
            return {
                errores: [
                    `Eliminaste ${razon_social}, pero no pudimos cambiarte a otra empresa. Elige una de la lista.`,
                ],
            };
        }
    }

    revalidatePath("/dashboard", "layout");
    return { aviso };
}

/**
 * Corrige la razon social de una empresa (el backend exige ser su
 * administrador). El RUT no se toca: si esta mal, se elimina y se agrega.
 */
export async function renombrarEmpresa(id_empresa: string, razon_social: string): Promise<ResultadoEmpresa> {
    const token = await exigirTokenSesion();

    const errores = validarRazonSocial(razon_social);
    if (errores.length > 0) return { errores };

    let empresa: Empresa;
    try {
        empresa = await empresasApi.actualizar(id_empresa, { razon_social: razon_social.trim() }, { token });
    } catch (error) {
        return {
            errores: traducirError(
                error,
                "No pudimos cambiar el nombre. Inténtalo de nuevo.",
                "Solo un administrador de esa empresa puede cambiarle el nombre.",
            ),
        };
    }

    // El nombre aparece en la cabecera y en la lista: los lee el layout.
    revalidatePath("/dashboard", "layout");
    return { aviso: `Listo: la empresa ahora se llama ${empresa.razon_social}.` };
}

/** Guarda el token en la cookie httpOnly. Un solo sitio que la escribe. */
async function guardarSesion(token: string): Promise<void> {
    const almacen = await cookies();
    almacen.set({
        name: NOMBRE_COOKIE_SESION,
        value: token,
        ...OPCIONES_COOKIE_SESION,
        maxAge: DURACION_SESION_SEGUNDOS,
    });
}

/**
 * Error de la API -> mensajes para el paso del popup. Mismo patrón que
 * periodos/actions.ts; el 403 cambia según la operación, porque al eliminar
 * cuenta el rol en ESA empresa y al agregar el de la activa.
 */
function traducirError(error: unknown, porDefecto: string, sinPermiso: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return [sinPermiso];
        // Render duerme tras 15 minutos sin tráfico y tarda en despertar más
        // que el tiempo de espera del cliente.
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}
