/**
 * Tipografías del sitio.
 *
 * Se cargan con next/font, que las autohospeda: los archivos se sirven desde
 * nuestro propio dominio, sin request a Google, y con el CSS de @font-face
 * generado en build para que no haya salto de layout al cargar.
 *
 * - Newsreader: titulares del panel y de la landing, y la serifa editorial del
 *   hero. Es una serifa de texto con eje de tamaño óptico: se lee bien a 15 px
 *   y se ve elegante a 80 px.
 * - Inter: cuerpo e interfaz. Altura-x alta y cifras tabulares, para que los
 *   montos y los RUT no se muevan al actualizarse.
 *
 * Los componentes no nombran la familia: usan las utilidades font-display,
 * font-serif y font-sans, que globals.css mapea a estas variables. Para cambiar
 * una tipografía se edita aquí y en globals.css, y nada más.
 */

import { Inter, Newsreader } from "next/font/google";

/**
 * Titulares y serifa editorial.
 *
 * Se expone como variable CSS en vez de className para poder combinarla con la
 * de cuerpo en el mismo <html> y elegir cuál aplica desde Tailwind. Va en
 * <html> y no solo en la landing porque el panel también usa los titulares.
 */
export const displayFont = Newsreader({
    subsets: ["latin"],
    variable: "--font-newsreader",
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
