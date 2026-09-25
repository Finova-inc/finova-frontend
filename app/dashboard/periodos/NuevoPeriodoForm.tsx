"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { abrirPeriodo, type EstadoPeriodo } from "./actions";

const ESTADO_INICIAL: EstadoPeriodo = {};

const MESES = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre",
];

const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)]";

/** useFormStatus solo funciona en un hijo del <form>. */
function BotonAbrir() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="inline-flex items-center justify-center rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-2 text-[13px] font-semibold text-white transition-[filter] hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-60"
        >
            {pending ? "Abriendo…" : "Abrir período"}
        </button>
    );
}

export function NuevoPeriodoForm({ anio, mes }: { readonly anio: number; readonly mes: number }) {
    const [estado, accion] = useActionState(abrirPeriodo, ESTADO_INICIAL);

    return (
        <form action={accion} className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
            <div className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)]">
                    Mes
                    <select name="mes" defaultValue={mes} className={CLASES_CAMPO}>
                        {MESES.map((nombre, indice) => (
                            <option key={nombre} value={indice + 1}>
                                {nombre}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)]">
                    Año
                    <input
                        name="anio"
                        type="number"
                        min={2000}
                        max={2100}
                        required
                        defaultValue={anio}
                        className={`tabular w-28 ${CLASES_CAMPO}`}
                    />
                </label>
                <BotonAbrir />
            </div>
            {estado.errores ? (
                <ul role="alert" className="mt-3 text-[13px] text-[var(--critico)]">
                    {estado.errores.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            ) : estado.ok ? (
                <p role="status" className="mt-3 text-[13px] text-[var(--positivo)]">
                    Período abierto: ya se pueden registrar asientos con fechas de ese mes.
                </p>
            ) : null}
        </form>
    );
}
