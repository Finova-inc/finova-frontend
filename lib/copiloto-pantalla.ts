/* ============================================================================
   Copiloto IA: descripcion de la pantalla que la persona tiene abierta.

   El chat la manda con cada pregunta para que el modelo entienda "esta cuenta"
   o "este periodo". Es una sola linea, armada con:
   - el nombre de la pantalla (lib/vistas.ts);
   - el detalle que declara la pagina con <ContextoCopiloto /> (por ejemplo,
     "cuenta 1101 Caja");
   - los filtros de la URL que tienen el formato esperado.

   No lleva ids ni nada que la persona no este viendo. El backend la valida de
   nuevo (src/copiloto/pantalla.ts): sin < ni >, una linea, 200 caracteres.
   ========================================================================== */

import { MAX_PANTALLA } from "./copiloto.ts";
import { vistaDeLaRuta } from "./vistas.ts";

const FECHA = /^\d{4}-\d{2}-\d{2}$/;
const MES = /^\d{4}-(0[1-9]|1[0-2])$/;
const ANIO = /^\d{4}$/;

/** Filtros de la URL que se le cuentan al modelo, en este orden: [parametro, etiqueta, formato]. */
const FILTROS: readonly (readonly [string, string, RegExp])[] = [
    ["desde", "desde", FECHA],
    ["hasta", "hasta", FECHA],
    ["mes", "mes", MES],
    ["periodo", "período", MES],
    ["anio", "año", ANIO],
];

/** Sin < ni >, en una linea y sin espacios repetidos. */
function sanear(texto: string): string {
    return texto
        .replace(/[<>\r\n]/g, " ")
        .replace(/\s+/g, " ")
        .trim();
}

/**
 * "el libro mayor · cuenta 1101 Caja · desde 2026-10-01 · hasta 2026-10-31".
 * null si la pantalla no tiene nombre propio (ruta interna o desconocida): ahi
 * el chat no manda contexto.
 */
export function describirPantalla(
    ruta: string,
    parametros: Readonly<Record<string, string | undefined>>,
    detalle: string | null,
): string | null {
    const { nombre } = vistaDeLaRuta(ruta);
    if (nombre === "esta pantalla") return null;

    const partes = [nombre];
    const detalleLimpio = detalle ? sanear(detalle) : "";
    if (detalleLimpio) partes.push(detalleLimpio);
    for (const [parametro, etiqueta, formato] of FILTROS) {
        const valor = parametros[parametro];
        if (valor && formato.test(valor)) partes.push(`${etiqueta} ${valor}`);
    }
    return sanear(partes.join(" · ")).slice(0, MAX_PANTALLA).trim();
}
