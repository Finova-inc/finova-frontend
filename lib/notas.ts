/* Lógica pura de las notas a los estados financieros: qué texto muestra cada
   sección y qué advertir antes de exportar. */

import type { NotaEeff } from "./api";

export const LEYENDA_SIN_INFORMACION = "Sin información registrada por la empresa";

type NotaDeTexto = Extract<NotaEeff, { tipo: "texto" }>;

/** El texto que se muestra: lo guardado, o la plantilla si nunca se guardó. */
export function textoVigente(nota: NotaDeTexto): string {
    return nota.texto_guardado ?? nota.plantilla;
}

/** Secciones de texto que saldrían con la leyenda "Sin información registrada". */
export function seccionesVacias(notas: readonly NotaEeff[]): NotaEeff[] {
    return notas.filter((n) => n.tipo === "texto" && textoVigente(n).trim() === "");
}

/** Secciones con huecos [entre corchetes] sin completar ni borrar. */
export function seccionesConHuecos(notas: readonly NotaEeff[]): NotaEeff[] {
    return notas.filter((n) => n.tipo === "texto" && /\[[^\]]*\]/.test(textoVigente(n)));
}

/** Número de nota de cada rubro, para enlazarlo desde los estados. */
export function numeroPorRubro(notas: readonly NotaEeff[]): Record<string, number> {
    return Object.fromEntries(notas.filter((n) => n.tipo === "partida").map((n) => [n.clave, n.numero]));
}
