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

import { formatearRut } from "./formato";

/** Resultado de validar un campo: válido, o inválido con un mensaje para la persona. */
export type ValidationResult =
    | { readonly isValid: true }
    | { readonly isValid: false; readonly message: string };

/**
 * Largo máximo del campo RUT. "12.345.678-9" son 12; se deja holgura para
 * que quien escriba espacios o guiones de más no quede cortado a mitad.
 */
export const RUT_MAX_LENGTH = 16;

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
 * RUT ya formateado por formatearRut(): "12.345.678-9".
 *
 * Mismo patrón que PATRON_RUT de
 * finova-backend/src/common/validators/rut.validator.ts.
 */
const RUT_PATTERN = /^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/;

/** Dígito verificador por módulo 11. */
function calcularDvRut(cuerpo: string): string {
    let suma = 0;
    let factor = 2;
    for (let i = cuerpo.length - 1; i >= 0; i--) {
        suma += Number(cuerpo[i]) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const resto = 11 - (suma % 11);
    return resto === 11 ? "0" : resto === 10 ? "K" : String(resto);
}

/**
 * Valida un RUT escrito con o sin puntos.
 *
 * Revisa el dígito verificador: un RUT mal tipeado se corrige aquí, sin gastar
 * uno de los intentos que el servidor cuenta. Saber que el DV no cuadra no
 * revela nada de ninguna cuenta: se calcula sin consultar a nadie.
 */
export function validateRut(rawRut: string): ValidationResult {
    if (rawRut.trim().length === 0) {
        return { isValid: false, message: "Escribe tu RUT." };
    }

    if (rawRut.length > RUT_MAX_LENGTH) {
        return { isValid: false, message: "Revisa tu RUT." };
    }

    const rut = formatearRut(rawRut);
    if (!RUT_PATTERN.test(rut)) {
        return { isValid: false, message: "Revisa el formato del RUT (12.345.678-9)." };
    }

    const [cuerpo, dv] = rut.replace(/\./g, "").split("-");
    if (calcularDvRut(cuerpo) !== dv) {
        return { isValid: false, message: "El dígito verificador no corresponde a ese RUT." };
    }

    return { isValid: true };
}

/**
 * Valida el alta de una empresa desde el popup de empresas.
 *
 * Mismas reglas que CreateEmpresaDto del backend (RUT con dígito verificador
 * válido, razón social de 3 a 150 caracteres). La usan el formulario, para
 * avisar antes de enviar, y la Server Action, porque el navegador se la puede
 * saltar. Devuelve los mensajes en el orden de los campos; vacío si está bien.
 */
export function validarNuevaEmpresa(rut: string, razonSocial: string): string[] {
    const errores: string[] = [];

    if (rut.trim().length === 0) {
        errores.push("Escribe el RUT de la empresa.");
    } else {
        const resultado = validateRut(rut);
        if (!resultado.isValid) errores.push(resultado.message);
    }

    const largo = razonSocial.trim().length;
    if (largo < 3 || largo > 150) {
        errores.push("La razón social debe tener entre 3 y 150 caracteres.");
    }

    return errores;
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
