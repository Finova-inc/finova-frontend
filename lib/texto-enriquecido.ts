/* ============================================================================
   Texto con formato minimo para las respuestas del copiloto.

   Interpreta solo lo que el prompt del backend le permite al modelo: parrafos,
   **negrita**, `codigo` y listas con guion o numeradas. Devuelve una
   estructura que el componente pinta con elementos de React, nunca HTML: el
   texto viene del modelo, que a su vez lee glosas escritas por usuarios, y
   React escapa todo lo que se muestra como texto. Sin dependencias, por la
   regla del repo.

   La respuesta llega por partes: un ** sin cerrar se muestra tal cual hasta
   que llegue su pareja.
   ========================================================================== */

export type Fragmento = { tipo: "texto" | "negrita" | "codigo"; texto: string };

export type Bloque =
    | { tipo: "parrafo"; fragmentos: Fragmento[] }
    | { tipo: "lista"; ordenada: boolean; items: Fragmento[][] };

const VINETA = /^\s*[-*•]\s+(.*)$/;
const NUMERADA = /^\s*\d{1,3}[.)]\s+(.*)$/;
const TITULO = /^\s*#{1,6}\s+(.*)$/;

/** **negrita** y `codigo` dentro de una linea; lo demas queda como texto. */
export function interpretarLinea(linea: string): Fragmento[] {
    const fragmentos: Fragmento[] = [];
    const patron = /\*\*([^*\n]+?)\*\*|`([^`\n]+)`/g;
    let desde = 0;
    for (const coincidencia of linea.matchAll(patron)) {
        const inicio = coincidencia.index ?? 0;
        if (inicio > desde) fragmentos.push({ tipo: "texto", texto: linea.slice(desde, inicio) });
        if (coincidencia[1] !== undefined) fragmentos.push({ tipo: "negrita", texto: coincidencia[1] });
        else fragmentos.push({ tipo: "codigo", texto: coincidencia[2] });
        desde = inicio + coincidencia[0].length;
    }
    if (desde < linea.length) fragmentos.push({ tipo: "texto", texto: linea.slice(desde) });
    return fragmentos;
}

export function interpretarTexto(texto: string): Bloque[] {
    const bloques: Bloque[] = [];
    let parrafo: string[] = [];
    let lista: { ordenada: boolean; items: Fragmento[][] } | null = null;

    const cerrarParrafo = () => {
        if (parrafo.length > 0) {
            bloques.push({ tipo: "parrafo", fragmentos: interpretarLinea(parrafo.join("\n")) });
            parrafo = [];
        }
    };
    const cerrarLista = () => {
        if (lista) {
            bloques.push({ tipo: "lista", ...lista });
            lista = null;
        }
    };

    for (const linea of texto.replace(/\r\n/g, "\n").split("\n")) {
        const vineta = VINETA.exec(linea);
        const numerada = vineta ? null : NUMERADA.exec(linea);
        if (vineta || numerada) {
            const ordenada = Boolean(numerada);
            cerrarParrafo();
            if (lista && lista.ordenada !== ordenada) cerrarLista();
            lista ??= { ordenada, items: [] };
            lista.items.push(interpretarLinea((vineta ?? numerada)![1]));
            continue;
        }
        cerrarLista();
        if (linea.trim() === "") {
            cerrarParrafo();
            continue;
        }
        // Un titulo no deberia llegar (el prompt lo prohibe); si llega, se ve como un parrafo en negrita.
        const titulo = TITULO.exec(linea);
        if (titulo) {
            cerrarParrafo();
            bloques.push({ tipo: "parrafo", fragmentos: [{ tipo: "negrita", texto: titulo[1] }] });
            continue;
        }
        parrafo.push(linea);
    }
    cerrarParrafo();
    cerrarLista();
    return bloques;
}
