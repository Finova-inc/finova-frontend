"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { crearEmpresa, type EstadoFormulario } from "./actions";

const ESTADO_INICIAL: EstadoFormulario = {};

/** Clases compartidas por los campos, para que ambos queden identicos. */
const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]";

/**
 * Boton de envio.
 *
 * Va en su propio componente porque useFormStatus() solo funciona dentro de un
 * hijo del <form>: llamado desde el mismo componente que renderiza el form,
 * `pending` seria siempre false.
 */
function BotonEnviar() {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? "Guardando…" : "Agregar empresa"}
        </button>
    );
}

export function NuevaEmpresaForm() {
    const [estado, accion] = useActionState(crearEmpresa, ESTADO_INICIAL);

    return (
        <form
            action={accion}
            className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5"
        >
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-1.5">
                    <label
                        htmlFor="rut"
                        className="text-[12.5px] font-medium text-[var(--foreground-muted)]"
                    >
                        RUT
                    </label>
                    <input
                        id="rut"
                        name="rut"
                        required
                        placeholder="76.123.456-7"
                        // Mismo patrón que el DTO del backend, para avisar antes
                        // de enviar en vez de recibir un 400.
                        pattern="\d{1,2}\.\d{3}\.\d{3}-[0-9Kk]"
                        title="Formato: 76.123.456-7"
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                </div>

                <div className="flex flex-[2] flex-col gap-1.5">
                    <label
                        htmlFor="razon_social"
                        className="text-[12.5px] font-medium text-[var(--foreground-muted)]"
                    >
                        Razón social
                    </label>
                    <input
                        id="razon_social"
                        name="razon_social"
                        required
                        minLength={3}
                        maxLength={150}
                        placeholder="Finova SpA"
                        className={CLASES_CAMPO}
                    />
                </div>

                <BotonEnviar />
            </div>

            {estado.error ? (
                <p role="alert" className="mt-4 text-[13px] text-[var(--critico)]">
                    {estado.error}
                </p>
            ) : null}
        </form>
    );
}
