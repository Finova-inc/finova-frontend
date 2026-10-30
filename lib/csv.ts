/* CSV para Excel en español: separado por punto y coma. Compartido por el plan
   de cuentas y los libros y reportes. */

/**
 * Celda de CSV: entre comillas si lo necesita, y nunca algo que Excel ejecute
 * como fórmula (un nombre "=HIPERVINCULO(...)" se escribe como texto).
 */
export function celdaCsv(valor: string): string {
    // Un monto negativo ("-1500.0000") no es una fórmula: solo se protege lo que no es número.
    const texto = /^[=+\-@\t\r]/.test(valor) && !/^-?\d+(\.\d+)?$/.test(valor) ? `'${valor}` : valor;
    return /[;"\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

export function filasACsv(filas: readonly (readonly string[])[]): string {
    return filas.map((fila) => fila.map(celdaCsv).join(";")).join("\r\n");
}
