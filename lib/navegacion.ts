/**
 * A qué pantalla vuelve el enlace "← Volver" del panel, sin dependencias.
 *
 * Es la parte que decide de components/ui/EnlaceVolver.tsx, separada para
 * poder probarla sin navegador: recibe el historial como una lista de rutas.
 */

export const RAIZ_DEL_PANEL = "/dashboard";

function esDelPanel(ruta: string): boolean {
    return ruta === RAIZ_DEL_PANEL || ruta.startsWith(`${RAIZ_DEL_PANEL}/`);
}

/**
 * Cuántas entradas del historial hay que retroceder para llegar a la pantalla
 * anterior del panel, o 0 si no hay ninguna a la que volver.
 *
 * `rutas` son las rutas (sin parámetros) de las entradas del historial de este
 * sitio, en orden, e `indice` es la posición de la pantalla actual. Una ruta
 * null es una entrada que no se pudo leer: corta la búsqueda.
 *
 * `porDefecto` dice a qué sección pertenece la pantalla: la raíz del panel si
 * es una pantalla de primer nivel (Períodos, Libro diario…), o su pantalla
 * madre si es un detalle o un formulario (el detalle de un asiento pertenece
 * al Libro diario).
 *
 * Al retroceder se salta lo que no es "otra pantalla":
 *   - otros estados de la misma pantalla (cada filtro aplicado deja una
 *     entrada): volver sale de la pantalla, no deshace el último filtro;
 *   - los formularios y detalles de la misma sección: después de contabilizar
 *     un asiento, volver lleva al libro diario y no al formulario ya enviado.
 *
 * La primera entrada distinta decide. Si no es del panel (el inicio de sesión,
 * la página pública) devuelve 0, y quien llama usa su destino fijo.
 */
export function pasosHastaLaPantallaAnterior(
    rutas: readonly (string | null)[],
    indice: number,
    porDefecto: string,
): number {
    const actual = rutas[indice];
    if (!actual || indice < 1) return 0;

    const seccion = porDefecto === RAIZ_DEL_PANEL ? actual : porDefecto;

    for (let i = indice - 1; i >= 0; i -= 1) {
        const ruta = rutas[i];
        if (!ruta) return 0;
        if (ruta === actual || ruta.startsWith(`${seccion}/`)) continue;
        return esDelPanel(ruta) ? indice - i : 0;
    }
    return 0;
}
