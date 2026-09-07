"use client";

import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import {
    EMAIL_MAX_LENGTH,
    PASSWORD_MAX_LENGTH,
    validateEmail,
    validatePassword,
} from "@/lib/validation";

/**
 * Formulario de acceso — ESQUEMA VISUAL, SIN LÓGICA DE AUTENTICACIÓN.
 *
 * No hay backend detrás: no se envía nada a ningún servidor y no se valida
 * ninguna credencial. Lo que sí demuestra es la higiene con que debe construirse
 * un formulario de credenciales, que es lo que se pidió.
 *
 * ---------------------------------------------------------------------------
 * DECISIONES DE SEGURIDAD Y POR QUÉ
 * ---------------------------------------------------------------------------
 *
 * 1. Sin atributo `action` y con preventDefault.
 *    Un <form> sin action ni method hace GET a la URL actual al enviarse, lo que
 *    pondría la contraseña en la barra de direcciones, en el historial del
 *    navegador y en los logs del servidor. Es un error clásico y silencioso.
 *
 * 2. La contraseña vive solo en el estado del componente.
 *    Nunca en localStorage, sessionStorage, cookies ni en la URL. Se limpia al
 *    fallar un intento.
 *
 * 3. Mensaje de error genérico.
 *    Nunca "ese correo no existe" ni "contraseña incorrecta". Distinguir ambos
 *    casos permite enumerar usuarios: probando correos se descubre quién tiene
 *    cuenta. Un solo mensaje para las dos situaciones.
 *
 * 4. spellCheck desactivado en la contraseña.
 *    Algunos correctores ortográficos envían el texto a un servicio remoto.
 *
 * 5. El límite de intentos es COMODIDAD, NO SEGURIDAD.
 *    Se explica en detalle junto a su implementación, más abajo.
 */

/** Intentos permitidos antes de pedir una pausa. */
const MAX_ATTEMPTS = 5;

/** Duración de la pausa, en segundos. */
const LOCKOUT_SECONDS = 30;

export function LoginForm() {
    // useId genera identificadores estables entre servidor y cliente, necesarios
    // para asociar cada <label> con su campo y cada error con su input.
    const emailFieldId = useId();
    const passwordFieldId = useId();
    const formErrorId = useId();

    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{
        email?: string;
        password?: string;
    }>({});
    const [formError, setFormError] = useState<string | null>(null);
    const [isSubmitting, setIsSubmitting] = useState(false);

    /**
     * Contador de intentos en una ref y no en estado: cambiarlo no debe provocar
     * un re-render, solo se consulta al enviar.
     */
    const attemptCountRef = useRef(0);

    /**
     * Estado del bloqueo temporal.
     *
     * Se guarda un booleano y no un instante de expiración: comparar Date.now()
     * durante el render sería impuro —el resultado cambia entre renders sin que
     * nada lo provoque— y, peor aún, el bloqueo no se levantaría solo, porque
     * nada dispararía un nuevo render al vencer el plazo. Un temporizador que
     * apaga el estado es correcto y además se puede limpiar.
     */
    const [isLockedOut, setIsLockedOut] = useState(false);

    // Levanta el bloqueo cuando se cumple el plazo.
    useEffect(() => {
        if (!isLockedOut) {
            return;
        }

        const timerId = window.setTimeout(() => {
            setIsLockedOut(false);
            setFormError(null);
        }, LOCKOUT_SECONDS * 1000);

        // Cancela el temporizador si el componente se desmonta antes de vencer,
        // evitando actualizar estado de un componente que ya no existe.
        return () => window.clearTimeout(timerId);
    }, [isLockedOut]);

    /**
     * Procesa el envío.
     *
     * Como no hay servidor, siempre termina en el mismo error genérico. Eso es
     * lo esperado: el objetivo es mostrar el comportamiento de la interfaz, no
     * simular una sesión.
     */
    function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        // Impide la navegación por defecto, que expondría las credenciales.
        event.preventDefault();

        if (isLockedOut) {
            return;
        }

        const emailResult = validateEmail(email);
        const passwordResult = validatePassword(password);

        const nextFieldErrors = {
            email: emailResult.isValid ? undefined : emailResult.message,
            password: passwordResult.isValid ? undefined : passwordResult.message,
        };

        setFieldErrors(nextFieldErrors);

        if (!emailResult.isValid || !passwordResult.isValid) {
            setFormError(null);
            return;
        }

        setIsSubmitting(true);

        /**
         * LÍMITE DE INTENTOS EN EL CLIENTE: ES UNA AYUDA DE INTERFAZ, NO UN
         * CONTROL DE SEGURIDAD.
         *
         * Cualquiera lo evita desde las herramientas de desarrollo o enviando
         * peticiones directamente a la API sin pasar por esta página. Sirve para
         * frenar el error humano —alguien que reintenta a ciegas— y para dejar
         * claro en la interfaz que los intentos se cuentan.
         *
         * La defensa real contra fuerza bruta va en el servidor: límite por IP
         * y por cuenta, retroceso exponencial, y bloqueo temporal de la cuenta.
         */
        attemptCountRef.current += 1;

        if (attemptCountRef.current >= MAX_ATTEMPTS) {
            setIsLockedOut(true);
            attemptCountRef.current = 0;
        }

        // Se simula la latencia de red para que el estado de carga sea visible.
        window.setTimeout(() => {
            setIsSubmitting(false);
            // Mensaje deliberadamente genérico: no revela si el correo existe.
            setFormError("No pudimos validar esas credenciales.");
            // La contraseña se descarta tras un intento fallido.
            setPassword("");
        }, 600);
    }

    return (
        <form
            onSubmit={handleSubmit}
            // noValidate desactiva los globos del navegador para usar mensajes
            // propios, consistentes en idioma y estilo con el resto del sitio.
            noValidate
            className="flex flex-col gap-5"
        >
            {/* ---------------------------------------------------------------
                Campo de correo
                --------------------------------------------------------------- */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor={emailFieldId}
                    className="text-sm font-medium text-white/85"
                >
                    Correo electrónico
                </label>

                <input
                    id={emailFieldId}
                    name="email"
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    // autoComplete correcto: deja que el gestor de contraseñas
                    // haga su trabajo. Bloquearlo empuja a la gente a repetir
                    // contraseñas fáciles de recordar, que es peor.
                    autoComplete="email"
                    inputMode="email"
                    maxLength={EMAIL_MAX_LENGTH}
                    spellCheck={false}
                    autoCapitalize="none"
                    autoCorrect="off"
                    required
                    disabled={isLockedOut}
                    // aria-invalid y aria-describedby conectan el campo con su
                    // error para quien usa lector de pantalla.
                    aria-invalid={fieldErrors.email !== undefined}
                    aria-describedby={
                        fieldErrors.email ? `${emailFieldId}-error` : undefined
                    }
                    placeholder="contador@estudio.cl"
                    className="w-full border border-white/12 bg-white/[0.04] px-4 py-3 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-marker)] disabled:opacity-50"
                />

                {fieldErrors.email && (
                    <p
                        id={`${emailFieldId}-error`}
                        className="text-sm text-[var(--color-marker)]"
                    >
                        {fieldErrors.email}
                    </p>
                )}
            </div>

            {/* ---------------------------------------------------------------
                Campo de contraseña
                --------------------------------------------------------------- */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor={passwordFieldId}
                    className="text-sm font-medium text-white/85"
                >
                    Contraseña
                </label>

                <div className="relative">
                    <input
                        id={passwordFieldId}
                        name="password"
                        type={isPasswordVisible ? "text" : "password"}
                        value={password}
                        onChange={(event) => setPassword(event.target.value)}
                        autoComplete="current-password"
                        maxLength={PASSWORD_MAX_LENGTH}
                        // spellCheck en un campo de contraseña puede enviar el
                        // texto a un corrector remoto en algunas plataformas.
                        spellCheck={false}
                        autoCapitalize="none"
                        autoCorrect="off"
                        required
                        disabled={isLockedOut}
                        aria-invalid={fieldErrors.password !== undefined}
                        aria-describedby={
                            fieldErrors.password
                                ? `${passwordFieldId}-error`
                                : undefined
                        }
                        placeholder="••••••••"
                        className="w-full border border-white/12 bg-white/[0.04] px-4 py-3 pr-12 text-[15px] text-white outline-none transition-colors placeholder:text-white/30 focus:border-[var(--color-marker)] disabled:opacity-50"
                    />

                    {/* Mostrar la contraseña ayuda a escribirla bien en el móvil
                        y reduce los reintentos por error de tipeo. */}
                    <button
                        type="button"
                        onClick={() => setIsPasswordVisible((visible) => !visible)}
                        aria-pressed={isPasswordVisible}
                        aria-label={
                            isPasswordVisible
                                ? "Ocultar contraseña"
                                : "Mostrar contraseña"
                        }
                        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-white/45 transition-colors hover:text-white"
                    >
                        <Icon
                            name={isPasswordVisible ? "eyeOff" : "eye"}
                            className="size-[18px]"
                        />
                    </button>
                </div>

                {fieldErrors.password && (
                    <p
                        id={`${passwordFieldId}-error`}
                        className="text-sm text-[var(--color-marker)]"
                    >
                        {fieldErrors.password}
                    </p>
                )}
            </div>

            {/* ---------------------------------------------------------------
                Error general del formulario

                role="alert" hace que el lector de pantalla lo anuncie apenas
                aparece, sin que la persona tenga que ir a buscarlo.
                --------------------------------------------------------------- */}
            {formError && !isLockedOut && (
                <p
                    id={formErrorId}
                    role="alert"
                    className="border border-[var(--color-marker)]/40 bg-[var(--color-marker)]/10 px-4 py-3 text-sm text-white/90"
                >
                    {formError}
                </p>
            )}

            {isLockedOut && (
                <p
                    role="alert"
                    className="border border-white/12 bg-white/5 px-4 py-3 text-sm text-white/65"
                >
                    Demasiados intentos. Espera {LOCKOUT_SECONDS} segundos antes de
                    volver a probar.
                </p>
            )}

            <button
                type="submit"
                disabled={isSubmitting || isLockedOut}
                className="mt-1 flex items-center justify-center gap-2 bg-[var(--color-cream)] px-5 py-3.5 font-display text-[15px] font-medium text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isSubmitting ? "Verificando…" : "Continuar"}
                {!isSubmitting && <Icon name="arrowRight" className="size-4" />}
            </button>
        </form>
    );
}
