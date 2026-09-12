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

/**
 * Longitud mínima al INICIAR SESIÓN.
 *
 * Es a propósito más laxa que la política de creación: una cuenta creada antes
 * de endurecer las reglas debe poder entrar igual. El backend tampoco exige
 * composición en el login, por la misma razón.
 */
export const PASSWORD_MIN_LENGTH = 8;

/**
 * Longitud mínima al CREAR o CAMBIAR una contraseña.
 *
 * Debe coincidir con PASSWORD_MIN_LENGTH de
 * finova-backend/src/common/validators/password.validator.ts. Si aquí se pide
 * menos que allá, la persona rellena el formulario y recibe un 400 del
 * servidor que este formulario debió anticipar.
 */
export const PASSWORD_NUEVA_MIN_LENGTH = 12;

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
 * Valida la contraseña AL INICIAR SESIÓN.
 *
 * Solo se comprueba el largo, nunca la composición. Exigir mayúscula o símbolo
 * en el login dejaría fuera a quien tenga una contraseña anterior a la política
 * actual, y además le describiría las reglas a quien esté probando credenciales
 * ajenas antes de autenticarse. Para crear o cambiar una contraseña se usa
 * validateNuevaPassword().
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

/**
 * Requisitos de composición al crear o cambiar una contraseña.
 *
 * Réplica exacta de las reglas de
 * finova-backend/src/common/validators/password.validator.ts. Se validan por
 * separado, y no con una sola expresión con lookaheads, para poder decir qué
 * falta en concreto en vez de un genérico "no cumple el formato".
 */
const REQUISITOS_PASSWORD: readonly { readonly patron: RegExp; readonly nombre: string }[] = [
    { patron: /[a-z]/, nombre: "una minúscula" },
    { patron: /[A-Z]/, nombre: "una mayúscula" },
    { patron: /\d/, nombre: "un número" },
    { patron: /[!@#$%^&*()\-_=+[\]{};:'",.<>\/?\\|`~]/, nombre: "un símbolo" },
];

/**
 * Valida una contraseña NUEVA (registro o cambio).
 *
 * ADVERTENCIA: como el resto de este archivo, esto es experiencia de usuario,
 * no un control de seguridad. Quien quiera saltárselo solo tiene que llamar a
 * la API directamente; por eso el backend valida lo mismo desde cero.
 */
export function validateNuevaPassword(password: string): ValidationResult {
    if (password.length === 0) {
        return { isValid: false, message: "Escribe una contraseña." };
    }

    if (password.length < PASSWORD_NUEVA_MIN_LENGTH) {
        return {
            isValid: false,
            message: `La contraseña necesita al menos ${PASSWORD_NUEVA_MIN_LENGTH} caracteres.`,
        };
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
        return { isValid: false, message: "La contraseña es demasiado larga." };
    }

    const faltantes = REQUISITOS_PASSWORD.filter(({ patron }) => !patron.test(password)).map(
        ({ nombre }) => nombre,
    );

    if (faltantes.length > 0) {
        return {
            isValid: false,
            message: `La contraseña necesita ${faltantes.join(", ")}.`,
        };
    }

    return { isValid: true };
}
