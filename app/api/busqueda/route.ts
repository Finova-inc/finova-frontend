/* ============================================================================
   GET /api/busqueda?q=

   Puente entre la barra de búsqueda del panel y GET /busqueda del backend, con
   el token de la cookie httpOnly, que nunca llega al JavaScript del navegador.

   Es un route handler y no una Server Action: la barra cancela la consulta
   anterior cuando la persona sigue escribiendo, y eso necesita un fetch con
   AbortController. Si la persona cancela, el corte llega hasta el backend.
   ========================================================================== */

import { ApiError, busquedaApi } from "@/lib/api";
import { LARGO_MAXIMO_BUSQUEDA, comoResultados } from "@/lib/busqueda";
import { obtenerTokenSesion } from "@/lib/session";

export async function GET(request: Request) {
    const q = (new URL(request.url).searchParams.get("q") ?? "").trim();
    if (!q || q.length > LARGO_MAXIMO_BUSQUEDA) return Response.json([], { headers: { "Cache-Control": "no-store" } });

    const token = await obtenerTokenSesion();
    if (!token) return Response.json({ message: "Tu sesión expiró. Vuelve a iniciar sesión." }, { status: 401 });

    try {
        const resultados = await busquedaApi.buscar(q, { token, cache: "no-store", signal: request.signal });
        return Response.json(comoResultados(resultados), { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        // 0 y 408 son red o tiempo agotado (lib/api.ts): hacia afuera, 504.
        const status = error instanceof ApiError && error.status >= 400 ? error.status : 504;
        const message = status === 429 ? "Muchas búsquedas seguidas. Espera unos segundos." : "No pudimos buscar.";
        return Response.json({ message }, { status });
    }
}
