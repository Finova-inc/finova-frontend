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
