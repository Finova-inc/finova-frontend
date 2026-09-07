/**
 * Validadores del formulario de acceso.
 *
 * Son funciones puras, sin dependencia de React ni del DOM, para que puedan
 * probarse con Jest de forma aislada y, llegado el caso, reutilizarse en el
 * backend NestJS.
 *
 * ---------------------------------------------------------------------------
 * ADVERTENCIA DE SEGURIDAD
 * ---------------------------------------------------------------------------
 * Toda esta validación es de EXPERIENCIA DE USUARIO, no un control de
 * seguridad. Corre en el navegador, así que cualquiera la desactiva desde las
 * herramientas de desarrollo. Sirve para dar retroalimentación inmediata y
 * evitar viajes al servidor innecesarios.
 *
 * Cuando exista backend, el servidor debe volver a validar TODO desde cero y
 * tratar cada campo como entrada hostil. La regla es: validación en el cliente
 * por comodidad, validación en el servidor por seguridad.
 */

/** Resultado de validar un campo: válido, o inválido con un mensaje para la persona. */
export type ValidationResult =
    | { readonly isValid: true }
    | { readonly isValid: false; readonly message: string };

/** Longitud máxima aceptada en el campo de correo. */
export const EMAIL_MAX_LENGTH = 254;

/** Longitud mínima de contraseña que se pide en la interfaz. */
export const PASSWORD_MIN_LENGTH = 8;

/** Longitud máxima de contraseña, para acotar el input. */
export const PASSWORD_MAX_LENGTH = 128;

/**
 * Patrón de correo deliberadamente conservador.
 *
 * No intenta implementar el RFC 5322 completo: esa expresión es enorme, difícil
 * de auditar y propensa a ReDoS. Aquí solo se descartan errores de tipeo
 * evidentes; la validación real de que un correo existe es enviar un mensaje.
 */
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

/**
 * Valida el correo.
 *
 * Se comprueba el largo ANTES que el patrón: así una cadena desmedida nunca
 * llega a la expresión regular.
 */
export function validateEmail(rawEmail: string): ValidationResult {
    const email = rawEmail.trim();

    if (email.length === 0) {
        return { isValid: false, message: "Escribe tu correo." };
    }

    if (email.length > EMAIL_MAX_LENGTH) {
        return { isValid: false, message: "El correo es demasiado largo." };
    }

    if (!EMAIL_PATTERN.test(email)) {
        return { isValid: false, message: "Revisa el formato del correo." };
    }

    return { isValid: true };
}

/**
 * Valida la contraseña.
 *
 * Solo se exige largo mínimo. No se piden mayúsculas, dígitos ni símbolos a
 * propósito: las reglas de composición empujan a la gente hacia contraseñas
 * predecibles ("Password1!") y hoy tanto NIST como el OWASP recomiendan
 * priorizar longitud y comparación contra listas de contraseñas filtradas,
 * lo que corresponde hacer en el servidor.
 */
export function validatePassword(password: string): ValidationResult {
    if (password.length === 0) {
        return { isValid: false, message: "Escribe tu contraseña." };
    }

    if (password.length < PASSWORD_MIN_LENGTH) {
        return {
            isValid: false,
            message: `La contraseña necesita al menos ${PASSWORD_MIN_LENGTH} caracteres.`,
        };
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
        return { isValid: false, message: "La contraseña es demasiado larga." };
    }

    return { isValid: true };
}
