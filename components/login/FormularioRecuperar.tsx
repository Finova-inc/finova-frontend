"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { solicitarRecuperacion, type EstadoRecuperar } from "@/app/recuperar/actions";
import { formatearRutAlEscribir } from "@/lib/formato";
import { CLASES_BOTON_RECUPERACION, CLASES_CAMPO_RECUPERACION } from "./MarcoRecuperacion";

/**
 * Pide el enlace para restablecer la contraseña. Tras enviar, SIEMPRE muestra el
 * mismo mensaje neutro; no dice si la cuenta existe.
 */
export function FormularioRecuperar() {
    const idRut = useId();
    const [rut, setRut] = useState("");
    const [estado, accion, enCurso] = useActionState<EstadoRecuperar, FormData>(solicitarRecuperacion, {});

    if (estado.enviado) {
        return (
            <div className="flex flex-col gap-5">
                <p role="status" className="rounded-lg border border-[var(--border-subtle)] bg-[var(--background-raised)] px-4 py-3 text-sm text-[var(--foreground)]">
                    {estado.mensaje}
                </p>
                <p className="text-sm text-[var(--foreground-muted)]">El enlace vence en 30 minutos. Revisa también la carpeta de correo no deseado.</p>
                <Link href="/login" className="text-center text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                    Volver a iniciar sesión
                </Link>
            </div>
        );
    }

    return (
        <form action={accion} noValidate className="flex flex-col gap-5">
            <div className="flex flex-col gap-2">
                <label htmlFor={idRut} className="text-sm font-medium text-[var(--foreground)]">
                    RUT
                </label>
                <input
                    id={idRut}
                    name="rut"
                    type="text"
                    value={rut}
                    onChange={(e) => setRut(formatearRutAlEscribir(e.target.value))}
                    autoComplete="username"
                    inputMode="text"
                    spellCheck={false}
                    autoCapitalize="characters"
                    autoCorrect="off"
                    required
                    aria-invalid={estado.errorRut !== undefined}
                    aria-describedby={estado.errorRut ? `${idRut}-error` : undefined}
                    placeholder="12.345.678-9"
                    className={`${CLASES_CAMPO_RECUPERACION} tabular-nums`}
                />
                {estado.errorRut ? (
                    <p id={`${idRut}-error`} className="text-sm text-[var(--critico)]">
                        {estado.errorRut}
                    </p>
                ) : null}
            </div>

            {estado.error ? (
                <p role="alert" className="rounded-lg border border-[var(--critico)]/30 bg-[var(--critico-bg)] px-4 py-3 text-sm text-[var(--foreground)]">
                    {estado.error}
                </p>
            ) : null}

            <button type="submit" disabled={enCurso} className={CLASES_BOTON_RECUPERACION}>
                {enCurso ? "Enviando…" : "Enviar enlace"}
            </button>

            <Link href="/login" className="text-center text-sm font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                Volver a iniciar sesión
            </Link>
        </form>
    );
}
