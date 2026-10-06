"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useId, useRef, useState } from "react";

import { Icon } from "@/components/ui/Icon";
import { formatearRut, formatearRutAlEscribir } from "@/lib/formato";
import {
    PASSWORD_MAX_LENGTH,
    RUT_MAX_LENGTH,
    validatePassword,
    validateRut,
} from "@/lib/validation";

/**
 * Formulario de acceso — CONECTADO al backend.
 *
 * Envía las credenciales a /api/auth/login (route handler del propio Next),
 * que a su vez llama a NestJS y guarda el JWT en una cookie httpOnly. El token
 * nunca pasa por este componente ni por ningún JavaScript del navegador.
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
 *    Nunca "ese RUT no existe" ni "contraseña incorrecta". Distinguir ambos
 *    casos permite enumerar usuarios: probando RUT se descubre quién tiene
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
    const router = useRouter();
    const searchParams = useSearchParams();

    const rutFieldId = useId();
    const passwordFieldId = useId();
    const formErrorId = useId();

    const [rut, setRut] = useState("");
    const [password, setPassword] = useState("");
    const [isPasswordVisible, setIsPasswordVisible] = useState(false);
    const [fieldErrors, setFieldErrors] = useState<{
        rut?: string;
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
     * Procesa el envío: valida, llama a /api/auth/login y, si responde bien,
     * redirige al panel. Cualquier fallo de credenciales termina en el mismo
     * mensaje genérico.
     */
    async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
        // Impide la navegación por defecto, que expondría las credenciales.
        event.preventDefault();

        if (isLockedOut) {
            return;
        }

        const rutResult = validateRut(rut);
        const passwordResult = validatePassword(password);

        const nextFieldErrors = {
            rut: rutResult.isValid ? undefined : rutResult.message,
            password: passwordResult.isValid ? undefined : passwordResult.message,
        };

        setFieldErrors(nextFieldErrors);

        if (!rutResult.isValid || !passwordResult.isValid) {
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

        try {
            const respuesta = await fetch("/api/auth/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                // Necesario para que la cookie de sesión que devuelve el
                // handler se guarde en el navegador.
                credentials: "include",
                body: JSON.stringify({ rut: formatearRut(rut), password }),
            });

            if (respuesta.ok) {
                // La contraseña se descarta en cuanto deja de hacer falta.
                setPassword("");
                const destino = searchParams.get("redirigir") ?? "/dashboard";
                // refresh() es imprescindible: obliga a los Server Components a
                // volver a ejecutarse y leer la cookie recién creada.
                router.replace(destino.startsWith("/") ? destino : "/dashboard");
                router.refresh();
                return;
            }

            const datos = (await respuesta.json().catch(() => null)) as { error?: string } | null;
            // Mensaje genérico salvo que el servidor dé uno más útil (429).
            setFormError(datos?.error ?? "No pudimos validar esas credenciales.");
            setPassword("");
        } catch {
            setFormError("No pudimos contactar al servidor. Revisa tu conexión.");
            setPassword("");
        } finally {
            setIsSubmitting(false);
        }
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
                Campo de RUT
                --------------------------------------------------------------- */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor={rutFieldId}
                    className="text-sm font-medium text-[var(--foreground)]"
                >
                    RUT
                </label>

                <div className="relative">
                    <Icon
                        name="users"
                        className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-[var(--foreground-muted)]"
                    />
                    <input
                        id={rutFieldId}
                        name="username"
                        type="text"
                        value={rut}
                        // Puntos y guion aparecen a medida que se escribe: la
                        // persona ve el RUT tal como quedará y detecta un error
                        // de tipeo antes de enviar. Pegar "123456789" también
                        // queda formateado.
                        onChange={(event) => setRut(formatearRutAlEscribir(event.target.value))}
                        // "username" deja que el gestor de contraseñas asocie el RUT
                        // con la contraseña guardada. Bloquearlo empuja a la gente a
                        // repetir contraseñas fáciles de recordar, que es peor.
                        autoComplete="username"
                        // text y no numeric: el dígito verificador puede ser K.
                        inputMode="text"
                        maxLength={RUT_MAX_LENGTH}
                        spellCheck={false}
                        autoCapitalize="characters"
                        autoCorrect="off"
                        required
                        disabled={isLockedOut}
                        // aria-invalid y aria-describedby conectan el campo con su
                        // error para quien usa lector de pantalla.
                        aria-invalid={fieldErrors.rut !== undefined}
                        aria-describedby={
                            fieldErrors.rut ? `${rutFieldId}-error` : undefined
                        }
                        placeholder="12.345.678-9"
                        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] py-3 pr-4 pl-11 text-[15px] tabular-nums text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--placeholder)] focus:border-[var(--accent)] disabled:opacity-50"
                    />
                </div>

                {fieldErrors.rut && (
                    <p
                        id={`${rutFieldId}-error`}
                        className="text-sm text-[var(--critico)]"
                    >
                        {fieldErrors.rut}
                    </p>
                )}
            </div>

            {/* ---------------------------------------------------------------
                Campo de contraseña
                --------------------------------------------------------------- */}
            <div className="flex flex-col gap-2">
                <label
                    htmlFor={passwordFieldId}
                    className="text-sm font-medium text-[var(--foreground)]"
                >
                    Contraseña
                </label>

                <div className="relative">
                    <Icon
                        name="lock"
                        className="pointer-events-none absolute top-1/2 left-4 size-[18px] -translate-y-1/2 text-[var(--foreground-muted)]"
                    />
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
                        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] py-3 pr-12 pl-11 text-[15px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--placeholder)] focus:border-[var(--accent)] disabled:opacity-50"
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
                        className="absolute right-1.5 top-1/2 grid size-9 -translate-y-1/2 place-items-center text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
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
                        className="text-sm text-[var(--critico)]"
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
                    className="rounded-lg border border-[var(--critico)]/30 bg-[var(--critico-bg)] px-4 py-3 text-sm text-[var(--foreground)]"
                >
                    {formError}
                </p>
            )}

            {isLockedOut && (
                <p
                    role="alert"
                    className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-raised)] px-4 py-3 text-sm text-[var(--foreground-muted)]"
                >
                    Demasiados intentos. Espera {LOCKOUT_SECONDS} segundos antes de
                    volver a probar.
                </p>
            )}

            <button
                type="submit"
                disabled={isSubmitting || isLockedOut}
                className="mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3.5 font-display text-[15px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
                {isSubmitting ? "Verificando…" : "Iniciar sesión"}
                {!isSubmitting && <Icon name="arrowRight" className="size-4" />}
            </button>
        </form>
    );
}
