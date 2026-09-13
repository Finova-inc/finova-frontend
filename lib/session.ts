/* ============================================================================
   Sesión — lectura del token en el servidor.

   El JWT vive en una cookie httpOnly que pone el route handler /api/auth/login.
   httpOnly significa que el JavaScript del navegador NO puede leerla: por eso
   todo lo de este archivo es exclusivamente de servidor (Server Components,
   Server Actions y route handlers).

   El token se manda al backend NestJS como `Authorization: Bearer`, nunca como
   cookie: NestJS es stateless y su JwtStrategy lee el header.
   ========================================================================== */

import { cookies } from "next/headers";
import { redirect } from "next/navigation";

/** Nombre de la cookie de sesión. Un solo sitio donde cambiarlo. */
export const NOMBRE_COOKIE_SESION = "finova_session";

/**
 * Vida de la cookie, alineada con JWT_EXPIRES_IN del backend (1d).
 *
 * Vive aquí y no en el route handler del login porque ahora hay dos sitios que
 * emiten la cookie: el login y el cambio de empresa. Con el valor duplicado,
 * cambiar uno y olvidar el otro dejaría sesiones que caducan antes o después
 * que su propio token, y el síntoma —cerrarse sola— no apunta a la causa.
 */
export const DURACION_SESION_SEGUNDOS = 60 * 60 * 24;

/**
 * Opciones de la cookie de sesión.
 *
 * httpOnly: el JavaScript de la página no puede leerla, que es lo que impide
 * que un XSS se lleve el token. sameSite lax: la cookie la emite el propio
 * dominio de Next, así que no hace falta None (que reabriría CSRF).
 */
export const OPCIONES_COOKIE_SESION = {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
} as const;

/**
 * Devuelve el token si hay sesión, o null si no la hay.
 * Úsalo cuando la página deba renderizar algo también sin sesión.
 */
export async function obtenerTokenSesion(): Promise<string | null> {
    const almacen = await cookies();
    return almacen.get(NOMBRE_COOKIE_SESION)?.value ?? null;
}

/**
 * Devuelve el token o interrumpe el render y manda a /login.
 * Úsalo en páginas que no tienen sentido sin sesión.
 *
 * Esto no es el control de seguridad: la autorización real la hace el
 * JwtAuthGuard del backend en cada petición. Aquí solo se evita renderizar
 * una pantalla privada que igualmente fallaría al pedir datos.
 */
export async function exigirTokenSesion(): Promise<string> {
    const token = await obtenerTokenSesion();
    if (!token) redirect("/login");
    return token;
}

/**
 * Lee la empresa activa del JWT, sin verificar la firma.
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO SE VERIFICA LA FIRMA AQUI
 * ---------------------------------------------------------------------------
 * Esto NO es un control de seguridad y no debe usarse como tal. Sirve solo para
 * saber qué empresa marcar en el selector, un dato de presentación.
 *
 * El control real lo hace el backend: cada petición lleva el token y NestJS
 * valida la firma con JWT_SECRET. Si alguien manipulara la cookie, el panel
 * podría marcar la empresa equivocada en el desplegable, pero toda consulta de
 * datos sería rechazada con 401. Verificar aquí exigiría traer JWT_SECRET al
 * frontend, que es exactamente lo que no queremos.
 *
 * Devuelve null ante cualquier token mal formado en vez de lanzar: un fallo al
 * decodificar no debe tumbar el panel entero.
 */
export async function obtenerEmpresaDelToken(): Promise<string | null> {
    const token = await obtenerTokenSesion();
    if (!token) return null;

    try {
        const carga = token.split(".")[1];
        if (!carga) return null;

        // base64url -> base64: el JWT usa el alfabeto seguro para URL, donde
        // '-' y '_' sustituyen a '+' y '/'.
        const normalizada = carga.replace(/-/g, "+").replace(/_/g, "/");
        const json = Buffer.from(normalizada, "base64").toString("utf8");
        const payload = JSON.parse(json) as { empresaId?: unknown };

        return typeof payload.empresaId === "string" ? payload.empresaId : null;
    } catch {
        return null;
    }
}
