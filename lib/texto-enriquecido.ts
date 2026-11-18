/* ============================================================================
   Texto con formato minimo para las respuestas del copiloto.

   Interpreta solo lo que el prompt del backend le permite al modelo: parrafos,
   **negrita**, `codigo`, listas con guion o numeradas y tablas markdown. Devuelve una
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
    | { tipo: "lista"; ordenada: boolean; items: Fragmento[][] }
    /** Celdas en texto crudo (con sus ** y `): el componente las interpreta y el CSV las limpia. */
    | { tipo: "tabla"; encabezados: string[]; filas: string[][] };

const VINETA = /^\s*[-*•]\s+(.*)$/;
const NUMERADA = /^\s*\d{1,3}[.)]\s+(.*)$/;
const TITULO = /^\s*#{1,6}\s+(.*)$/;
const FILA_TABLA = /^\s*\|.*\|\s*$/;
const SEPARADOR_TABLA = /^\s*\|?\s*:?-{3,}:?\s*(\|\s*:?-{3,}:?\s*)*\|?\s*$/;

function celdas(linea: string): string[] {
    return linea
        .trim()
        .replace(/^\|/, "")
        .replace(/\|$/, "")
        .split("|")
        .map((celda) => celda.trim());
}

/** El texto de una celda sin las marcas de formato, para el CSV. */
export function textoPlano(celda: string): string {
    return celda.replace(/\*\*([^*\n]+?)\*\*/g, "$1").replace(/`([^`\n]+)`/g, "$1");
}

/** Monto o porcentaje ("$1.234", "-$500", "12,5%"): se alinea a la derecha. */
export function pareceCifra(celda: string): boolean {
    return /^-?\$?\s?\d[\d.]*(,\d+)?\s?%?$/.test(textoPlano(celda).trim());
}

export type TrozoConEnlace = { tipo: "texto"; texto: string } | { tipo: "comprobante"; texto: string; id: string };

/**
 * Parte un texto donde cita comprobantes con enlace conocido ("T-15"). Solo
 * enlaza los que el backend resolvio en esa respuesta: el resto queda como texto.
 */
export function partirComprobantes(
    texto: string,
    enlaces: Readonly<Record<string, string>> | undefined,
): TrozoConEnlace[] {
    if (!enlaces) return [{ tipo: "texto", texto }];
    const trozos: TrozoConEnlace[] = [];
    let desde = 0;
    for (const coincidencia of texto.matchAll(/\b[IET]-\d{1,9}\b/g)) {
        const id = enlaces[coincidencia[0]];
        if (!id) continue;
        const inicio = coincidencia.index ?? 0;
        if (inicio > desde) trozos.push({ tipo: "texto", texto: texto.slice(desde, inicio) });
        trozos.push({ tipo: "comprobante", texto: coincidencia[0], id });
        desde = inicio + coincidencia[0].length;
    }
    if (desde < texto.length) trozos.push({ tipo: "texto", texto: texto.slice(desde) });
    return trozos;
}

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

    const lineas = texto.replace(/\r\n/g, "\n").split("\n");
    for (let i = 0; i < lineas.length; i++) {
        const linea = lineas[i];
        // Tabla: encabezado y separador. Mientras llega el separador, el encabezado se ve como texto.
        if (FILA_TABLA.test(linea) && SEPARADOR_TABLA.test(lineas[i + 1] ?? "")) {
            cerrarParrafo();
            cerrarLista();
            const encabezados = celdas(linea);
            const filas: string[][] = [];
            let j = i + 2;
            while (j < lineas.length && FILA_TABLA.test(lineas[j])) {
                const fila = celdas(lineas[j]).slice(0, encabezados.length);
                while (fila.length < encabezados.length) fila.push("");
                filas.push(fila);
                j += 1;
            }
            bloques.push({ tipo: "tabla", encabezados, filas });
            i = j - 1;
            continue;
        }
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
