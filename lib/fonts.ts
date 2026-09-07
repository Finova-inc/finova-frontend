/**
 * Tipografías del sitio.
 *
 * Se cargan con next/font, que las autohospeda: los archivos se sirven desde
 * nuestro propio dominio, sin request a Google, y con el CSS de @font-face
 * generado en build para que no haya salto de layout al cargar.
 *
 * ---------------------------------------------------------------------------
 * NOTA SOBRE STYRENE
 * ---------------------------------------------------------------------------
 * El brief original pedía Styrene. Es una tipografía comercial de Commercial
 * Type: no está en Google Fonts y requiere licencia pagada, así que no se puede
 * incluir en el repositorio.
 *
 * Space Grotesk es el reemplazo elegido por cercanía real, no por conveniencia:
 * comparte con Styrene la construcción de grotesca geométrica, los bowls
 * ligeramente cuadrados y el aire técnico algo irregular en las diagonales.
 *
 * Para migrar a Styrene cuando exista la licencia:
 *   1. Copiar los .woff2 a app/fonts/
 *   2. Reemplazar el bloque de displayFont por:
 *
 *      import localFont from "next/font/local";
 *
 *      const displayFont = localFont({
 *          src: [
 *              { path: "../app/fonts/StyreneA-Regular.woff2", weight: "400", style: "normal" },
 *              { path: "../app/fonts/StyreneA-Medium.woff2",  weight: "500", style: "normal" },
 *              { path: "../app/fonts/StyreneA-Bold.woff2",    weight: "700", style: "normal" },
 *          ],
 *          variable: "--font-space-grotesk",
 *          display: "swap",
 *      });
 *
 * El resto del proyecto no cambia: globals.css mapea esa variable al token
 * --font-display de Tailwind, y los componentes solo usan la utilidad
 * font-display. Nunca se referencia el nombre de la familia directamente.
 */

import { Inter, Space_Grotesk } from "next/font/google";

/**
 * Tipografía de titulares.
 *
 * Se expone como variable CSS en vez de className para poder combinarla con la
 * de cuerpo en el mismo <html> y elegir cuál aplica desde Tailwind.
 */
export const displayFont = Space_Grotesk({
    subsets: ["latin"],
    variable: "--font-space-grotesk",
    display: "swap",
});

/**
 * Tipografía de cuerpo e interfaz.
 *
 * Inter tiene altura-x alta y cifras tabulares reales, que es justo lo que pide
 * una interfaz llena de montos y RUT: los números no bailan al actualizarse.
 */
export const bodyFont = Inter({
    subsets: ["latin"],
    variable: "--font-inter",
    display: "swap",
});

/** Clases de variables de fuente para aplicar en <html>. */
export const fontVariables = `${displayFont.variable} ${bodyFont.variable}`;
