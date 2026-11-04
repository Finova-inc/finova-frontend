/* ============================================================================
   /dashboard/contabilizacion — ya no es una pantalla.

   «Por contabilizar» vive en el Panel de control (/dashboard#por-contabilizar).
   Esta ruta queda solo para no romper los enlaces guardados: lleva a la misma
   sección y conserva el mes (?periodo=AAAA-MM) si venía.
   ========================================================================== */

import { redirect } from "next/navigation";
import { periodoValido } from "@/lib/sii";

export default async function ContabilizacionPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const pedido = (await searchParams).periodo;
    const periodo = periodoValido(typeof pedido === "string" ? pedido : undefined);
    redirect(periodo ? `/dashboard?periodo=${periodo}#por-contabilizar` : "/dashboard#por-contabilizar");
}
