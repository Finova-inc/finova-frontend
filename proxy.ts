/* ============================================================================
   Proxy (Next 16 — antes se llamaba middleware.ts)

   Portero barato del subárbol privado: si no hay cookie de sesión, redirige a
   /login antes de renderizar nada.

   IMPORTANTE — esto NO es el control de seguridad. Deliberadamente no verifica
   la firma del JWT, por tres razones:

     1. Corre en el runtime Edge, donde no existe el crypto de Node; haría
        falta traer `jose`.
     2. Verificar aquí exigiría exponer JWT_SECRET al runtime Edge, ampliando
        la superficie del secreto.
     3. Es redundante: la autorización real la hace el JwtAuthGuard de NestJS
        en cada petición.

   Una cookie falsificada pasa este proxy y muere en el primer GET /empresas
   con un 401, que es el comportamiento correcto. El proxy es UX; el guard del
   backend es seguridad.
   ========================================================================== */

import { NextResponse, type NextRequest } from "next/server";

const NOMBRE_COOKIE_SESION = "finova_session";

export function proxy(request: NextRequest) {
    const tieneSesion = Boolean(request.cookies.get(NOMBRE_COOKIE_SESION)?.value);

    if (!tieneSesion) {
        const destino = new URL("/login", request.url);
        // Se recuerda a dónde iba para volver ahí tras iniciar sesión.
        destino.searchParams.set("redirigir", request.nextUrl.pathname);
        return NextResponse.redirect(destino);
    }

    return NextResponse.next();
}

export const config = {
    // Solo el subárbol privado. Incluir /login aquí crearía un bucle infinito
    // de redirecciones; los assets y los route handlers de auth quedan fuera
    // porque deben responder sin sesión.
    matcher: ["/dashboard/:path*"],
};
