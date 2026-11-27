/* ============================================================================
   Como se reparte el espacio del panel, por navegador: el menu lateral plegado
   y el ancho de la columna del copiloto.

   Van en cookies y no en localStorage porque el layout del servidor las lee y
   dibuja la pantalla ya plegada: con localStorage el menu se veria ancho un
   instante y despues saltaria. No son datos ni dan permisos: solo como se ve.
   ========================================================================== */

export const COOKIE_MENU = "finova_menu";
/** Ancho en px de la columna del copiloto si se arrastro el divisor (lib/ancho-copiloto.ts). */
export const COOKIE_ANCHO_COPILOTO = "finova_copiloto_ancho";
export const MENU_PLEGADO = "plegado";

/** Un año; null la borra. */
export function guardarPreferencia(nombre: string, valor: string | null): void {
    const vigencia = valor ? "max-age=31536000" : "max-age=0";
    document.cookie = `${nombre}=${valor ?? ""}; path=/; ${vigencia}; samesite=lax`;
}
