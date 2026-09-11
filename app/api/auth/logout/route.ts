/* ============================================================================
   POST /api/auth/logout

   Borra la cookie de sesión. El JWT sigue siendo válido en el backend hasta
   que expire (NestJS es stateless y no lleva lista de revocados), pero deja
   de estar accesible desde este navegador.
   ========================================================================== */

import { NextResponse } from "next/server";
import { NOMBRE_COOKIE_SESION } from "@/lib/session";

export async function POST() {
    const respuesta = NextResponse.json({ ok: true });
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
