/* ============================================================================
   Ancho del copiloto anclado, cuando la persona arrastra el divisor.

   Sin ancho guardado, el copiloto llena el espacio libre (comportamiento de
   siempre). Con ancho, se respeta, pero el contenido nunca queda con menos de
   MIN_CONTENIDO: el chat puede llegar hasta el menu de modulos, y el CSS lo vuelve
   a limitar si la ventana se achica despues.
   ========================================================================== */

export const ANCHO_MIN = 380;
/** Lo que queda de la pantalla de trabajo con el chat al maximo: solo su relleno lateral (px-6). Igual que en CopilotoFlotante.tsx (clase del flex). */
export const MIN_CONTENIDO = 48;
/** Cuanto mueve cada flecha del teclado. */
export const PASO_TECLADO = 32;
/** Tope para descartar cookies alteradas; ninguna pantalla real llega aqui. */
const ANCHO_MAX_COOKIE = 4000;

/** El ancho pedido, dentro de lo que permite el espacio disponible (px enteros). */
export function limitarAncho(ancho: number, disponible: number): number {
    const tope = Math.max(ANCHO_MIN, disponible - MIN_CONTENIDO);
    return Math.round(Math.min(Math.max(ancho, ANCHO_MIN), tope));
}

/** Lee la cookie; cualquier cosa que no sea un ancho razonable es "sin ancho". */
export function leerAncho(valor: string | undefined): number | null {
    if (!valor || !/^\d{1,4}$/.test(valor)) return null;
    const ancho = Number(valor);
    return ancho >= ANCHO_MIN && ancho <= ANCHO_MAX_COOKIE ? ancho : null;
}
