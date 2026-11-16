/* ============================================================================
   GET /api/copiloto/estado

   Le dice al chat si el copiloto esta disponible y cuanto del tope diario lleva
   gastado la persona, para avisar "te quedan unas X preguntas hoy" antes de
   preguntar. Reenvia GET /copiloto/estado del backend con el token de la
   cookie httpOnly, que nunca llega al JavaScript del navegador.

   Es una lectura y la pide el chat al abrirse (un componente cliente), por eso
   es un route handler y no una Server Action. No consume tokens del modelo.
   ========================================================================== */

import { ApiError, copilotoApi } from "@/lib/api";
import { obtenerTokenSesion } from "@/lib/session";

export async function GET() {
    const token = await obtenerTokenSesion();
    if (!token) return Response.json({ message: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });

    try {
        const estado = await copilotoApi.estado({ token, cache: "no-store" });
        return Response.json(estado, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        // 0 y 408 son red o tiempo agotado (lib/api.ts): hacia afuera, 504.
        const status = error instanceof ApiError && error.status >= 400 ? error.status : 504;
        return Response.json({ message: "No pudimos consultar el estado del copiloto." }, { status });
    }
}
