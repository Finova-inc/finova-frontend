"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { crearEmpresa, type EstadoFormulario } from "./actions";

const ESTADO_INICIAL: EstadoFormulario = {};

function BotonEnviar() {
    const { pending } = useFormStatus();
    return (
        <button
            type="submit"
            disabled={pending}
            className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-medium text-white disabled:opacity-60"
        >
            {pending ? "Guardando…" : "Agregar empresa"}
        </button>
    );
}

export function NuevaEmpresaForm() {
    const [estado, accion] = useActionState(crearEmpresa, ESTADO_INICIAL);

    return (
        <form action={accion} className="rounded-xl bg-white p-6 shadow-sm">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-end">
                <div className="flex flex-1 flex-col gap-2">
                    <label htmlFor="rut" className="text-sm font-medium text-slate-700">
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
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                </div>

                <div className="flex flex-[2] flex-col gap-2">
                    <label htmlFor="razon_social" className="text-sm font-medium text-slate-700">
                        Razón social
                    </label>
                    <input
                        id="razon_social"
                        name="razon_social"
                        required
                        minLength={3}
                        maxLength={150}
                        placeholder="Finova SpA"
                        className="rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-900"
                    />
                </div>

                <BotonEnviar />
            </div>

            {estado.error ? (
                <p role="alert" className="mt-4 text-sm text-red-700">
                    {estado.error}
                </p>
            ) : null}
        </form>
    );
}
