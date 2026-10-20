/* ============================================================================
   GET /dashboard/terceros/:id/datos-personales — descarga de los datos
   personales de un tercero persona natural (Ley 21.719, derecho de acceso y
   portabilidad).

   Route handler y no Server Action: el navegador tiene que recibir un ARCHIVO.
   El token se lee de la cookie httpOnly aquí, en el servidor; la página solo
   enlaza a esta ruta. El backend registra cada exportación en la auditoría
   antes de entregar los datos, y si no puede registrarla, no los entrega.
   ========================================================================== */

import { NextResponse } from "next/server";
import { ApiError, mensajesDelBackend, tercerosApi } from "@/lib/api";
import { obtenerTokenSesion } from "@/lib/session";

export async function GET(solicitud: Request, { params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await obtenerTokenSesion();
    if (!token) return NextResponse.redirect(new URL("/login", solicitud.url));

    try {
        const datos = await tercerosApi.datosPersonales(id, { token, cache: "no-store" });
        const rut = String((datos.datos as { rut?: unknown } | undefined)?.rut ?? id).replace(/[^0-9kK]/g, "");
        return new NextResponse(JSON.stringify(datos, null, 2), {
            headers: {
                "Content-Type": "application/json; charset=utf-8",
                "Content-Disposition": `attachment; filename="datos-personales-${rut}.json"`,
                // Datos personales: que ningún intermediario los guarde.
                "Cache-Control": "no-store",
            },
        });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) {
            return NextResponse.redirect(new URL("/login", solicitud.url));
        }
        const mensaje =
            mensajesDelBackend(error)?.join(" ") ??
            "No pudimos exportar los datos. Si el servidor estaba inactivo, reintenta en unos segundos.";
        return new NextResponse(mensaje, {
            status: error instanceof ApiError && error.status ? error.status : 500,
            headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
        });
    }
}
