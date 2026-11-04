/* ============================================================================
   Extensión de los archivos que se suben — pieza pura (sin next ni red) para
   probarla con `node --test`.

   Es una comodidad: avisa al elegir el archivo y evita subir uno que el
   servidor va a rechazar. El control real lo hace el backend.
   ========================================================================== */

/** Formatos de Excel que NO se leen, y para los que conviene decir cómo guardar el archivo. */
const EXCEL_NO_SOPORTADO = ["xls", "xlsm", "xlsb"];

/**
 * La extensión en minúsculas y sin el punto: lo que sigue al ÚLTIMO punto del
 * nombre ("libro.csv.exe" → "exe"). "" si no tiene, o si el nombre es solo una
 * extensión (".csv").
 */
export function extensionDe(nombre: string): string {
    const base = nombre.split(/[\\/]/).pop() ?? "";
    const punto = base.lastIndexOf(".");
    return punto > 0 ? base.slice(punto + 1).toLowerCase() : "";
}

/** `permitidas` se escribe con punto (".csv"); el nombre puede venir en mayúsculas. */
export function extensionPermitida(nombre: string, permitidas: readonly string[]): boolean {
    const extension = extensionDe(nombre);
    return extension !== "" && permitidas.some((p) => p.replace(/^\./, "").toLowerCase() === extension);
}

/** [".csv", ".txt", ".xlsx"] → ".csv, .txt o .xlsx" */
export function listaDeExtensiones(permitidas: readonly string[]): string {
    if (permitidas.length <= 1) return permitidas.join("");
    return `${permitidas.slice(0, -1).join(", ")} o ${permitidas[permitidas.length - 1]}`;
}

/**
 * El aviso para un archivo con extensión no permitida. Si el tipo acepta Excel
 * y se eligió un .xls o .xlsm, se dice cómo guardarlo.
 */
export function mensajeExtensionNoPermitida(nombre: string, permitidas: readonly string[]): string {
    const base = `Este tipo de archivo acepta solo ${listaDeExtensiones(permitidas)}.`;
    const aceptaExcel = permitidas.some((p) => p.toLowerCase() === ".xlsx");
    return aceptaExcel && EXCEL_NO_SOPORTADO.includes(extensionDe(nombre)) ? `${base} Guarda el archivo como .xlsx o como CSV.` : base;
}
