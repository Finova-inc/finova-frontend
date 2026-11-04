"use client";

import Link from "next/link";
import { useActionState, useId, useState } from "react";
import { restablecerClave, type EstadoRestablecer } from "@/app/restablecer/actions";
import { PASSWORD_MAX_LENGTH } from "@/lib/validation";
import { CLASES_BOTON_RECUPERACION, CLASES_CAMPO_RECUPERACION } from "./MarcoRecuperacion";

/** Elegir la contraseña nueva con el token del correo (llega por la URL y viaja como campo oculto). */
export function FormularioRestablecer({ token }: { readonly token: string }) {
    const idClave = useId();
    const idConfirmacion = useId();
    const [verClave, setVerClave] = useState(false);
    const [estado, accion, enCurso] = useActionState<EstadoRestablecer, FormData>(restablecerClave, {});

    if (estado.enlaceInvalido) {
        return (
            <div className="flex flex-col gap-5">
                <p role="alert" className="rounded-lg border border-[var(--critico)]/30 bg-[var(--critico-bg)] px-4 py-3 text-sm text-[var(--foreground)]">
                    El enlace no es válido o ya venció.
                </p>
                <Link href="/recuperar" className={`${CLASES_BOTON_RECUPERACION} mt-0`}>
                    Pedir un enlace nuevo
                </Link>
            </div>
        );
    }

    const tipo = verClave ? "text" : "password";
    return (
        <form action={accion} noValidate className="flex flex-col gap-5">
            <input type="hidden" name="token" value={token} />

            <div className="flex flex-col gap-2">
                <label htmlFor={idClave} className="text-sm font-medium text-[var(--foreground)]">
                    Contraseña nueva
                </label>
                <input
                    id={idClave}
                    name="clave"
                    type={tipo}
                    autoComplete="new-password"
                    spellCheck={false}
                    maxLength={PASSWORD_MAX_LENGTH}
                    required
                    aria-invalid={estado.errorClave !== undefined}
                    aria-describedby={`${idClave}-ayuda${estado.errorClave ? ` ${idClave}-error` : ""}`}
                    className={CLASES_CAMPO_RECUPERACION}
                />
                <p id={`${idClave}-ayuda`} className="text-[12.5px] text-[var(--foreground-muted)]">
                    Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo.
                </p>
                {estado.errorClave ? (
                    <p id={`${idClave}-error`} className="text-sm text-[var(--critico)]">
                        {estado.errorClave}
                    </p>
                ) : null}
            </div>

            <div className="flex flex-col gap-2">
                <label htmlFor={idConfirmacion} className="text-sm font-medium text-[var(--foreground)]">
                    Repite la contraseña
                </label>
                <input
                    id={idConfirmacion}
                    name="confirmacion"
                    type={tipo}
                    autoComplete="new-password"
                    spellCheck={false}
                    maxLength={PASSWORD_MAX_LENGTH}
                    required
                    aria-invalid={estado.errorConfirmacion !== undefined}
                    aria-describedby={estado.errorConfirmacion ? `${idConfirmacion}-error` : undefined}
                    className={CLASES_CAMPO_RECUPERACION}
                />
                {estado.errorConfirmacion ? (
                    <p id={`${idConfirmacion}-error`} className="text-sm text-[var(--critico)]">
                        {estado.errorConfirmacion}
                    </p>
                ) : null}
            </div>

            <label className="flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                <input type="checkbox" checked={verClave} onChange={(e) => setVerClave(e.target.checked)} />
                Mostrar contraseñas
            </label>

            {estado.error ? (
                <p role="alert" className="rounded-lg border border-[var(--critico)]/30 bg-[var(--critico-bg)] px-4 py-3 text-sm text-[var(--foreground)]">
                    {estado.error}
                </p>
            ) : null}

            <button type="submit" disabled={enCurso} className={CLASES_BOTON_RECUPERACION}>
                {enCurso ? "Guardando…" : "Cambiar contraseña"}
            </button>
        </form>
    );
}
