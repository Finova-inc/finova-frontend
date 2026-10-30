/* Qué se puede hacer con un asiento ya contabilizado y cómo se marca en el libro (art. 32 del Código de Comercio). */

import type { ReferenciaComprobante } from "./api";
import { puedeRegistrar } from "./roles.ts";

type AsientoConReversa = {
    readonly origen: string;
    readonly revertido_por: ReferenciaComprobante | null;
    readonly revierte_a: ReferenciaComprobante | null;
};

/** La regla del botón "Revertir", la misma en el detalle y en el libro diario. El backend la repite con @Roles. */
export function puedeRevertir(rol: number | null, asiento: Pick<AsientoConReversa, "origen" | "revertido_por">): boolean {
    return puedeRegistrar(rol) && asiento.origen !== "reversa" && asiento.revertido_por === null;
}

export type MarcaDeReversa =
    | { readonly tipo: "anulado"; readonly reversa: ReferenciaComprobante }
    | { readonly tipo: "reversa"; readonly original: ReferenciaComprobante | null };

/** La etiqueta con su enlace: "Anulado" + la reversa, o "Reversa de" + el original. */
export function marcaDeReversa(asiento: AsientoConReversa): MarcaDeReversa | null {
    if (asiento.revertido_por) return { tipo: "anulado", reversa: asiento.revertido_por };
    if (asiento.origen === "reversa") return { tipo: "reversa", original: asiento.revierte_a };
    return null;
}
