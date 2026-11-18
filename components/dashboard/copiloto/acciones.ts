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
import { exigirTokenSesion } from "@/lib/session";

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Marca una respuesta propia como util o no util; null quita la marca. `ok: false` si no se pudo guardar. */
export async function valorarRespuesta(idUso: string, valor: ValorValoracionCopiloto): Promise<{ ok: boolean }> {
    if (typeof idUso !== "string" || !PATRON_UUID.test(idUso)) return { ok: false };
    if (valor !== "util" && valor !== "no_util" && valor !== null) return { ok: false };

    const token = await exigirTokenSesion();
    try {
        await copilotoApi.valorar({ id_uso: idUso, valor }, { token });
        return { ok: true };
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        return { ok: false };
    }
}
