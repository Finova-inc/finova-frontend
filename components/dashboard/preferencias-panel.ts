/* ============================================================================
   Como se reparte el espacio del panel, por navegador: el menu lateral plegado
   y el copiloto anclado al costado.

   Van en cookies y no en localStorage porque el layout del servidor las lee y
   dibuja la pantalla ya plegada: con localStorage el menu se veria ancho un
   instante y despues saltaria. No son datos ni dan permisos: solo como se ve.

   Ademas, el copiloto anclado y abierto pliega el menu para dejarle espacio.
   Ese aviso (copilotoAnclado) vive solo en el navegador, con el mismo patron
   de useSyncExternalStore que contexto-pantalla.ts.
   ========================================================================== */

export const COOKIE_MENU = "finova_menu";
export const COOKIE_COPILOTO = "finova_copiloto";
export const MENU_PLEGADO = "plegado";
export const COPILOTO_ANCLADO = "anclado";

/** Un año; null la borra. */
export function guardarPreferencia(nombre: string, valor: string | null): void {
    const vigencia = valor ? "max-age=31536000" : "max-age=0";
    document.cookie = `${nombre}=${valor ?? ""}; path=/; ${vigencia}; samesite=lax`;
}
