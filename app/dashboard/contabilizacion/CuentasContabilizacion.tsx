"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import type { CuentaDeFuncion, FuncionCuenta } from "@/lib/api";
import { guardarCuentasContabilizacion, type EstadoContabilizacion } from "./actions";

export interface CuentaElegible {
    readonly id_cuenta: string;
    readonly etiqueta: string;
    readonly id_tipo_cuenta: number;
}

/** Valor del select que significa "la del plan base" (o ninguna, si no hay). */
const PLAN_BASE = "";

/**
 * Las cuentas que usa la contabilización, una por función: la parametrización
 * que pidió Paola ("las cuentas conocen su comportamiento"). Cada función
 * admite solo cuentas imputables y activas de su tipo; dejar "plan base"
 * vuelve a la cuenta del plan base con el código sugerido.
 */
export function CuentasContabilizacion({
    cuentas,
    elegibles,
    puedeRegistrar,
}: {
    readonly cuentas: readonly CuentaDeFuncion[];
    readonly elegibles: readonly CuentaElegible[];
    readonly puedeRegistrar: boolean;
}) {
    const inicial = Object.fromEntries(
        cuentas.map((c) => [c.funcion, c.origen === "configurada" ? (c.cuenta?.id_cuenta ?? PLAN_BASE) : PLAN_BASE]),
    ) as Record<FuncionCuenta, string>;
    const [valores, setValores] = useState(inicial);
    const [estado, setEstado] = useState<EstadoContabilizacion>({});
    const [enCurso, iniciar] = useTransition();
    const cambiadas = cuentas.filter((c) => valores[c.funcion] !== inicial[c.funcion]);

    function guardar() {
        setEstado({});
        iniciar(async () =>
            setEstado(
                await guardarCuentasContabilizacion(
                    cambiadas.map((c) => ({ funcion: c.funcion, id_cuenta: valores[c.funcion] === PLAN_BASE ? null : valores[c.funcion] })),
                ),
            ),
        );
    }

    return (
        <div className="flex flex-col gap-3">
            <ul className="flex flex-col divide-y divide-[var(--border-subtle)] text-[13px]">
                {cuentas.map((c) => (
                    <li key={c.funcion} className="grid gap-2 py-2.5 first:pt-0 sm:grid-cols-[1fr_minmax(0,320px)] sm:items-center">
                        <div>
                            <p className="font-medium">
                                {c.nombre}
                                {!c.cuenta ? <span className="ml-2 text-[12px] font-normal text-[var(--critico)]">Sin cuenta</span> : null}
                            </p>
                            <p className="text-[12px] text-[var(--foreground-muted)]">{c.uso}</p>
                        </div>
                        {puedeRegistrar ? (
                            <select
                                aria-label={`Cuenta de ${c.nombre}`}
                                value={valores[c.funcion]}
                                onChange={(e) => setValores((actual) => ({ ...actual, [c.funcion]: e.target.value }))}
                                className="rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-2 py-1.5 text-[12.5px]"
                            >
                                <option value={PLAN_BASE}>
                                    {c.codigo_sugerido
                                        ? `Plan base (${c.codigo_sugerido}${c.origen === "plan_base" && c.cuenta ? ` · ${c.cuenta.nombre}` : ", no la tienes"})`
                                        : "Sin cuenta: elige una"}
                                </option>
                                {elegibles
                                    .filter((e) => c.tipos.includes(e.id_tipo_cuenta))
                                    .map((e) => (
                                        <option key={e.id_cuenta} value={e.id_cuenta}>
                                            {e.etiqueta}
                                        </option>
                                    ))}
                            </select>
                        ) : (
                            <p className="tabular text-[12.5px]">{c.cuenta ? `${c.cuenta.codigo} · ${c.cuenta.nombre}` : "—"}</p>
                        )}
                    </li>
                ))}
            </ul>
            {puedeRegistrar ? (
                <div className="flex flex-wrap items-center gap-3">
                    <Boton variante="neutro" disabled={enCurso || cambiadas.length === 0} onClick={guardar}>
                        {enCurso ? "Guardando…" : `Guardar cambios${cambiadas.length > 0 ? ` (${cambiadas.length})` : ""}`}
                    </Boton>
                    {estado.ok ? <span className="text-[12.5px] text-[var(--positivo)]">{estado.ok}</span> : null}
                    {estado.errores && estado.errores.length > 0 ? (
                        <span role="alert" className="text-[12.5px] text-[var(--critico)]">
                            {estado.errores.join(" ")}
                        </span>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
