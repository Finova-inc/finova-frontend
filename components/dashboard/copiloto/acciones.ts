"use server";

/* ============================================================================
   Server Actions del copiloto.

   Corren SIEMPRE en el servidor: leen la cookie httpOnly y llaman a NestJS con
   Bearer. Viven junto al componente y no junto a una pagina porque el chat esta
   en el layout del panel, no en una ruta.

   Los argumentos llegan del navegador y cualquiera puede invocar la accion con
   lo que quiera: se valida su forma antes de reenviarlos. El backend vuelve a
   comprobar que la respuesta sea de quien la valora.
   ========================================================================== */

import { redirect } from "next/navigation";
import { ApiError, copilotoApi, type ValorValoracionCopiloto } from "@/lib/api";
import { MAX_MENSAJE } from "@/lib/copiloto";
import { exigirTokenSesion } from "@/lib/session";

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Marca una respuesta propia como util o no util; null quita la marca. Con no
 * util viaja tambien la pregunta: el backend la guarda sin RUT por 90 dias para
 * que el equipo vea que falla. `ok: false` si no se pudo guardar.
 */
export async function valorarRespuesta(
    idUso: string,
    valor: ValorValoracionCopiloto,
    pregunta?: string,
): Promise<{ ok: boolean }> {
    if (typeof idUso !== "string" || !PATRON_UUID.test(idUso)) return { ok: false };
    if (valor !== "util" && valor !== "no_util" && valor !== null) return { ok: false };
    const conPregunta =
        valor === "no_util" && typeof pregunta === "string" && pregunta.trim() !== ""
            ? { pregunta: pregunta.trim().slice(0, MAX_MENSAJE) }
            : {};

    const token = await exigirTokenSesion();
    try {
        await copilotoApi.valorar({ id_uso: idUso, valor, ...conPregunta }, { token });
        return { ok: true };
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        return { ok: false };
    }
}
