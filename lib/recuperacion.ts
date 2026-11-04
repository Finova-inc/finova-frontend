/* ============================================================================
   Recuperación de contraseña — piezas puras (sin next ni red) para probarlas
   con `node --test`.
   ========================================================================== */

/** Lo que se muestra siempre tras pedir el enlace; es el mismo texto que responde el backend. */
export const MENSAJE_RECUPERACION = "Si la cuenta existe, enviaremos un enlace al correo registrado.";

/** Lo que responde el backend (400) cuando el token no existe, ya se usó o venció. Es el mismo en los tres casos. */
export const MENSAJE_ENLACE_INVALIDO = "El enlace no es válido o ya venció.";

export const MENSAJE_CLAVE_ACTUALIZADA = "Contraseña actualizada. Inicia sesión.";

/** Largo máximo razonable de un token en la URL (el real tiene 43 caracteres). */
const TOKEN_MAX = 200;

/**
 * El token de `?token=...`: un texto sin espacios y de largo razonable, o null.
 * Next entrega un arreglo si el parámetro se repite; en ese caso no se adivina.
 */
export function tokenDeUrl(valor: string | string[] | undefined): string | null {
    if (typeof valor !== "string") return null;
    const token = valor.trim();
    return token.length > 0 && token.length <= TOKEN_MAX && !/\s/.test(token) ? token : null;
}

/** null si la confirmación coincide; si no, el aviso para mostrar. */
export function errorDeConfirmacion(clave: string, confirmacion: string): string | null {
    return clave === confirmacion ? null : "Las contraseñas no coinciden.";
}

/**
 * Mensaje claro para un error del backend al pedir o usar el enlace, según el
 * código HTTP (0 y 408: no hubo respuesta; los pone apiFetch).
 */
export function mensajeDeError(status: number, paso: "recuperar" | "restablecer"): string {
    if (status === 429) return "Hiciste demasiados intentos. Espera un momento y vuelve a intentarlo.";
    if (status === 0 || status === 408) return "No pudimos contactar al servidor. Inténtalo en unos minutos.";
    if (status === 400 && paso === "restablecer") return "El enlace no es válido o ya venció. Pide uno nuevo.";
    return paso === "recuperar"
        ? "No pudimos procesar la solicitud. Inténtalo en unos minutos."
        : "No pudimos cambiar la contraseña. Inténtalo en unos minutos.";
}
