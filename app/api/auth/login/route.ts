/* ============================================================================
   POST /api/auth/login

   Intermediario entre el navegador y NestJS. Existe para que el JWT nunca
   llegue al JavaScript del cliente:

     navegador --(mismo origen)--> este handler --(Bearer)--> NestJS
     navegador <--Set-Cookie httpOnly-- este handler

   Al emitir la cookie desde el propio dominio de Next (y no desde el backend)
   la cookie es same-site: basta SameSite=Lax, que protege contra CSRF. Si la
   emitiera NestJS haría falta SameSite=None, que reabre esa superficie y
   además choca con el bloqueo de cookies de terceros de Safari y Firefox.
   ========================================================================== */

import { NextResponse } from "next/server";
import { authApi, ApiError } from "@/lib/api";
import { validateEmail, validatePassword } from "@/lib/validation";
import { NOMBRE_COOKIE_SESION } from "@/lib/session";

/** Debe ir alineado con JWT_EXPIRES_IN del backend (1d). */
const DURACION_SESION_SEGUNDOS = 60 * 60 * 24;

const ERROR_GENERICO = "No pudimos validar esas credenciales.";

export async function POST(request: Request) {
    let cuerpo: unknown;
    try {
        cuerpo = await request.json();
    } catch {
        return NextResponse.json({ error: "Petición mal formada." }, { status: 400 });
    }

    const { correo, password } = (cuerpo ?? {}) as {
        correo?: unknown;
        password?: unknown;
    };

    if (typeof correo !== "string" || typeof password !== "string") {
        return NextResponse.json({ error: ERROR_GENERICO }, { status: 400 });
    }

    // Se revalida en el servidor: la validación del formulario es de interfaz
    // y un cliente puede saltársela llamando directamente a este endpoint.
    const correoNormalizado = correo.trim().toLowerCase();
    const correoValido = validateEmail(correoNormalizado);
    const passwordValida = validatePassword(password);
    if (!correoValido.isValid || !passwordValida.isValid) {
        return NextResponse.json({ error: ERROR_GENERICO }, { status: 400 });
    }

    try {
        const { access_token } = await authApi.login(correoNormalizado, password);

        // La respuesta NO incluye el token: si viajara en el cuerpo, el
        // JavaScript de la página podría leerlo y httpOnly no serviría de nada.
        const respuesta = NextResponse.json({ ok: true });

        respuesta.cookies.set({
            name: NOMBRE_COOKIE_SESION,
            value: access_token,
            httpOnly: true,
            secure: process.env.NODE_ENV === "production",
            sameSite: "lax",
            path: "/",
            maxAge: DURACION_SESION_SEGUNDOS,
        });

        return respuesta;
    } catch (error) {
        if (error instanceof ApiError) {
            // 429: el backend aplicó su límite de intentos. Se propaga tal cual
            // para que el formulario pueda decir "demasiados intentos".
            if (error.status === 429) {
                return NextResponse.json(
                    { error: "Demasiados intentos. Espera un minuto e inténtalo de nuevo." },
                    { status: 429 },
                );
            }
            if (error.status === 401 || error.status === 400) {
                return NextResponse.json({ error: ERROR_GENERICO }, { status: 401 });
            }
            if (error.status === 0 || error.status === 408) {
                return NextResponse.json(
                    { error: "No pudimos contactar al servidor. Inténtalo más tarde." },
                    { status: 503 },
                );
            }
        }
        console.error("Error inesperado en /api/auth/login:", error);
        return NextResponse.json({ error: "Error inesperado. Inténtalo más tarde." }, { status: 500 });
    }
}
