/* ============================================================================
   POST /api/copiloto/chat

   Puente entre el chat del navegador y POST /copiloto/chat del backend.

   Existe porque el token de sesion vive en una cookie httpOnly y nunca llega
   al JavaScript del navegador: el navegador le habla a este mismo sitio, y
   aqui se agrega el token y se reenvia. La respuesta del backend es un stream
   (Server-Sent Events) y se devuelve tal cual, a medida que llega. Una Server
   Action no sirve para esto: no entrega una respuesta por partes.

   - Si el usuario pulsa "Detener" o cierra la pestana, el corte llega hasta el
     backend, que deja de pedirle texto al modelo (y de pagarlo).
   - La espera hasta los encabezados es larga (Render despierta en ~30-50 s),
     pero una vez que el stream empieza no se corta por tiempo.
   - Los errores previos al stream (401, 429, 503, 400) pasan con su estado y
     un mensaje; el componente decide que mostrar.
   ========================================================================== */

import { copilotoApi } from "@/lib/api";
import { esMismoOrigen, validarCuerpoChat } from "@/lib/copiloto";
import { obtenerTokenSesion } from "@/lib/session";

/** Vercel corta la funcion despues de esto; una respuesta normal tarda segundos. */
export const maxDuration = 120;

const ESPERA_ENCABEZADOS_MS = 60_000;

const respuestaJson = (status: number, message: string) => Response.json({ message }, { status });

function mensajeDelBackend(datos: unknown): string | null {
    const message = (datos as { message?: unknown } | null)?.message;
    if (typeof message === "string") return message;
    if (Array.isArray(message)) return message.filter((m) => typeof m === "string").join(" ");
    return null;
}

export async function POST(request: Request) {
    const host = request.headers.get("x-forwarded-host") ?? request.headers.get("host");
    if (!esMismoOrigen(request.headers.get("origin"), host)) {
        return respuestaJson(403, "Solicitud no permitida.");
    }

    const token = await obtenerTokenSesion();
    if (!token) return respuestaJson(401, "Tu sesión expiró. Vuelve a iniciar sesión.");

    let cuerpo: unknown;
    try {
        cuerpo = await request.json();
    } catch {
        return respuestaJson(400, "La pregunta no tiene el formato esperado.");
    }
    const validado = validarCuerpoChat(cuerpo);
    if (!validado.ok) return respuestaJson(400, validado.error);

    const corte = new AbortController();
    request.signal.addEventListener("abort", () => corte.abort(), { once: true });
    const espera = setTimeout(() => corte.abort(), ESPERA_ENCABEZADOS_MS);

    let respuesta: Response;
    try {
        respuesta = await copilotoApi.chat(validado.valor, { token, signal: corte.signal });
    } catch {
        // Cancelado por el usuario (nadie lee esta respuesta) o sin conexion/espera agotada.
        return respuestaJson(request.signal.aborted ? 499 : 504, "No pudimos conectar con el servidor.");
    } finally {
        clearTimeout(espera);
    }

    if (!respuesta.ok || !respuesta.body) {
        const datos: unknown = await respuesta.json().catch(() => null);
        return respuestaJson(respuesta.status, mensajeDelBackend(datos) ?? "El copiloto tuvo un problema.");
    }

    return new Response(respuesta.body, {
        headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            "X-Accel-Buffering": "no",
        },
    });
}
