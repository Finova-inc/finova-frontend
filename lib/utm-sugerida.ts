/* ============================================================================
   UTM sugerida en el formulario del remanente del F29 — piezas puras.

   El backend sugiere la UTM de cada mes (la lee de una API pública); la persona
   puede dejarla o escribir otra. Aquí vive qué valor parte en el campo y qué
   marca de origen se muestra, sin dependencias de servidor para probarlo con
   `node --test`.
   ========================================================================== */

import { aPesosEnteros } from "./f29.ts";

export const TEXTO_SUGERIDA = "Sugerida desde mindicador.cl";
export const TEXTO_A_MANO = "Ingresada a mano";
export const TEXTO_SIN_SUGERENCIA = "No pudimos obtener la UTM automáticamente; escríbela a mano.";

/** "2026-10" → { anio: 2026, mes: 10 }. */
export function anioYMes(periodo: string): { readonly anio: number; readonly mes: number } {
    return { anio: Number(periodo.slice(0, 4)), mes: Number(periodo.slice(5, 7)) };
}

/**
 * Con qué valor parte el campo: el que la persona ya guardó, y solo si no hay
 * ninguno, la sugerida. Nunca se sobrescribe un valor guardado.
 */
export function valorInicialUtm(guardado: string | null, sugerida: string | null): string | null {
    return guardado ?? sugerida;
}

export type MarcaUtm = { readonly tipo: "sugerida" | "a-mano" | "sin-sugerencia"; readonly texto: string } | null;

/**
 * La marca de origen junto a un campo de UTM, según lo que hay escrito ahora:
 * - igual a la sugerida (aunque tenga puntos de miles o "$") → «Sugerida desde mindicador.cl»;
 * - distinta, o escrita cuando no hubo sugerencia → «Ingresada a mano»;
 * - vacío y sin sugerencia → el aviso de que se escriba a mano;
 * - vacío con sugerencia disponible → nada.
 */
export function marcaUtm(valorDelCampo: string, sugerida: string | null): MarcaUtm {
    const escrito = aPesosEnteros(valorDelCampo);
    if (escrito === "") return sugerida === null ? { tipo: "sin-sugerencia", texto: TEXTO_SIN_SUGERENCIA } : null;
    if (escrito !== null && sugerida !== null && escrito === sugerida) return { tipo: "sugerida", texto: TEXTO_SUGERIDA };
    return { tipo: "a-mano", texto: TEXTO_A_MANO };
}
