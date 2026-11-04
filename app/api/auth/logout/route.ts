/* ============================================================================
   POST /api/auth/logout

   Cierra la sesión en dos pasos:

     1. Pide al backend que revoque el token (POST /auth/logout), para que deje
        de valer aunque alguien lo hubiera copiado.
     2. Borra la cookie de este navegador.

   El paso 2 se hace SIEMPRE, aunque el backend no responda o rechace el token
   (ya vencido o ya revocado): cerrar sesión no puede quedar atascado por eso ni
   mostrar un error. Si el paso 1 falla, el token sigue siendo válido en el
   backend hasta que venza (`revocado: false` en la respuesta lo deja a la vista).
   ========================================================================== */

import { NextResponse } from "next/server";
import { authApi } from "@/lib/api";
import { revocarEnBackend } from "@/lib/cierre-sesion";
import { NOMBRE_COOKIE_SESION, obtenerTokenSesion } from "@/lib/session";

export async function POST() {
    const token = await obtenerTokenSesion();
    const revocado = await revocarEnBackend(token, (t) => authApi.logout({ token: t, cache: "no-store" }));

    const respuesta = NextResponse.json({ ok: true, revocado });
    respuesta.cookies.set({
        name: NOMBRE_COOKIE_SESION,
        value: "",
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: "lax",
        path: "/",
        maxAge: 0,
    });
    return respuesta;
}
