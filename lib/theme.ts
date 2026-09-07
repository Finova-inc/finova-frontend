/**
 * Fuente única de verdad del tema claro/oscuro.
 *
 * Tanto el script inline que corre antes del primer paint como el componente
 * ThemeToggle leen de aquí. Si la clave o los valores válidos vivieran en dos
 * lugares distintos, bastaría con que uno cambiara para que el tema dejara de
 * persistir sin ningún error visible.
 */

/** Los dos únicos temas válidos. El tipo se usa para validar lo que sale de localStorage. */
export type Theme = "light" | "dark";

/** Clave de localStorage. Lleva prefijo del producto para no chocar con otras apps en el mismo origen. */
export const THEME_STORAGE_KEY = "finova-theme";

/** Clase que se aplica en <html>. Debe coincidir con el @custom-variant dark de globals.css. */
export const THEME_CLASS_NAME = "dark";

/**
 * Aplica un tema al documento.
 *
 * Además de la clase que consume Tailwind, setea `color-scheme`, que es lo que
 * hace que el navegador pinte scrollbars, inputs y demás controles nativos en
 * el color correcto. Omitirlo deja un destello de scrollbar blanca en tema oscuro.
 */
export function applyTheme(theme: Theme): void {
    document.documentElement.classList.toggle(THEME_CLASS_NAME, theme === "dark");
    document.documentElement.style.colorScheme = theme;
}

/**
 * Lee el tema persistido, validándolo contra la unión literal.
 *
 * localStorage es escribible por el usuario, así que su contenido es entrada no
 * confiable: cualquier valor distinto de "light"/"dark" se descarta y se cae a
 * la preferencia del sistema operativo.
 */
export function resolveStoredTheme(): Theme {
    try {
        const stored = localStorage.getItem(THEME_STORAGE_KEY);

        if (stored === "light" || stored === "dark") {
            return stored;
        }
    } catch {
        // localStorage lanza en modo privado de Safari y en iframes con sandbox.
        // No es un caso de error: simplemente no hay preferencia guardada.
    }

    return prefersDarkScheme() ? "dark" : "light";
}

/** Preferencia declarada por el sistema operativo. */
export function prefersDarkScheme(): boolean {
    return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

/**
 * Script que se inyecta en <head> y corre de forma síncrona mientras el
 * navegador parsea el HTML, es decir ANTES del primer paint.
 *
 * Esto es lo que evita el parpadeo (FOUC): sin él, el navegador pinta el HTML
 * del servidor —que siempre es tema claro, porque el servidor no puede conocer
 * localStorage— y recién después React corrige, con un flash blanco visible.
 *
 * Va minificado a una línea a propósito: es texto que viaja en cada respuesta HTML.
 * No interpola nada controlado por el usuario, así que no es un vector de XSS.
 */
export const THEME_INIT_SCRIPT = `(function(){try{var t=localStorage.getItem("${THEME_STORAGE_KEY}");if(t!=="light"&&t!=="dark"){t=window.matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light"}document.documentElement.classList.toggle("${THEME_CLASS_NAME}",t==="dark");document.documentElement.style.colorScheme=t}catch(e){}})()`;
