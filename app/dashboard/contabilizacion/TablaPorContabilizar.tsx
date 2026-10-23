"use client";

import Link from "next/link";
import { useMemo, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import type { EstadoContabilizacion as Estado, ItemPorContabilizar } from "@/lib/api";
import { formatearCLP, formatearFechaContable } from "@/lib/formato";
import { nombreTipoDte } from "@/lib/sii";
import { CLASES_TH } from "../core-contable/partes";
import { contabilizarBorradores, proponerAsientos, type EstadoContabilizacion } from "./actions";

export interface OpcionCuenta {
    readonly id_cuenta: string;
    readonly etiqueta: string;
}

const ESTADO: Record<Estado, { readonly etiqueta: string; readonly tono: "aviso" | "neutro" | "positivo" | "critico" }> = {
    pendiente: { etiqueta: "Por contabilizar", tono: "aviso" },
    borrador: { etiqueta: "En borrador", tono: "neutro" },
    contabilizado: { etiqueta: "Contabilizado", tono: "positivo" },
    no_contabilizable: { etiqueta: "No se propone", tono: "critico" },
};

const SECCIONES: readonly { readonly sentido: ItemPorContabilizar["sentido"]; readonly titulo: string; readonly cuenta: string }[] = [
    { sentido: "venta", titulo: "Ventas", cuenta: "Cuenta de ingreso" },
    { sentido: "compra", titulo: "Compras", cuenta: "Cuenta de gasto o activo" },
    { sentido: "honorario", titulo: "Boletas de honorarios recibidas", cuenta: "Cuentas" },
];

const CELDA = "px-3 py-2 align-top";

/**
 * Lo que hay por contabilizar en el mes, separado en ventas, compras y
 * boletas. La persona marca los documentos, elige la cuenta de cada venta o
 * compra (clasificación) y Finova propone un borrador por documento. Después
 * revisa los borradores y los contabiliza: Finova nunca contabiliza solo.
 */
export function TablaPorContabilizar({
    periodo,
    items,
    opcionesVenta,
    opcionesCompra,
    puedeRegistrar,
}: {
    readonly periodo: string;
    readonly items: readonly ItemPorContabilizar[];
    readonly opcionesVenta: readonly OpcionCuenta[];
    readonly opcionesCompra: readonly OpcionCuenta[];
    readonly puedeRegistrar: boolean;
}) {
    const pendientes = useMemo(() => items.filter((i) => i.estado === "pendiente"), [items]);
    const borradores = useMemo(() => items.filter((i) => i.estado === "borrador" && i.id_borrador), [items]);
    const [marcados, setMarcados] = useState<ReadonlySet<string>>(() => new Set(pendientes.map((i) => i.id)));
    const [cuentas, setCuentas] = useState<Readonly<Record<string, string>>>({});
    const [confirmando, setConfirmando] = useState(false);
    const [estado, setEstado] = useState<EstadoContabilizacion>({});
    const [enCurso, iniciar] = useTransition();

    const alternar = (id: string) =>
        setMarcados((actual) => {
            const nuevo = new Set(actual);
            if (nuevo.has(id)) nuevo.delete(id);
            else nuevo.add(id);
            return nuevo;
        });
    const marcadosPendientes = pendientes.filter((i) => marcados.has(i.id));

    function proponer() {
        setEstado({});
        iniciar(async () => {
            const r = await proponerAsientos({
                periodo,
                documentos: marcadosPendientes
                    .filter((i) => i.tipo === "documento")
                    .map((i) => ({ id: i.id, ...(cuentas[i.id] && cuentas[i.id] !== i.id_cuenta_propuesta ? { id_cuenta: cuentas[i.id] } : {}) })),
                honorarios: marcadosPendientes.filter((i) => i.tipo === "honorario").map((i) => i.id),
            });
            setEstado(r);
        });
    }

    function contabilizar() {
        setEstado({});
        iniciar(async () => {
            setEstado(await contabilizarBorradores(borradores.map((i) => i.id_borrador as string)));
            setConfirmando(false);
        });
    }

    return (
        <div className="flex flex-col gap-4">
            {puedeRegistrar ? (
                <div className="no-imprimir flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
                    <div className="flex flex-wrap items-center gap-2">
                        <Boton variante="acento" disabled={enCurso || marcadosPendientes.length === 0} onClick={proponer}>
                            {enCurso ? "Trabajando…" : `Proponer asientos (${marcadosPendientes.length})`}
                        </Boton>
                        {borradores.length > 0 ? (
                            confirmando ? (
                                <>
                                    <Boton variante="acento" disabled={enCurso} onClick={contabilizar}>
                                        Sí, contabilizar {borradores.length}
                                    </Boton>
                                    <Boton variante="neutro" disabled={enCurso} onClick={() => setConfirmando(false)}>
                                        Cancelar
                                    </Boton>
                                </>
                            ) : (
                                <Boton variante="neutro" disabled={enCurso} onClick={() => setConfirmando(true)}>
                                    Contabilizar los borradores ({borradores.length})
                                </Boton>
                            )
                        ) : null}
                    </div>
                    <p className="text-[12.5px] text-[var(--foreground-muted)]">
                        {confirmando
                            ? "Los asientos entran al libro diario con número correlativo y ya no se modifican: si algo está mal, se corrige con una reversa. Revisa los borradores antes."
                            : "Proponer crea un borrador por documento, que puedes abrir y corregir. Nada entra al libro hasta que contabilizas."}
                    </p>
                    {estado.ok ? (
                        <p role="status" className="text-[12.5px] text-[var(--positivo)]">
                            {estado.ok}
                        </p>
                    ) : null}
                    {estado.detalle && estado.detalle.length > 0 ? (
                        <ul className="list-disc pl-5 text-[12.5px] text-[var(--critico)]">
                            {estado.detalle.map((d) => (
                                <li key={d}>{d}</li>
                            ))}
                        </ul>
                    ) : null}
                    {estado.errores && estado.errores.length > 0 ? (
                        <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                            {estado.errores.join(" ")}
                        </p>
                    ) : null}
                </div>
            ) : null}

            {SECCIONES.map((seccion) => {
                const filas = items.filter((i) => i.sentido === seccion.sentido);
                if (filas.length === 0) return null;
                const opciones = seccion.sentido === "venta" ? opcionesVenta : seccion.sentido === "compra" ? opcionesCompra : [];
                const pendientesDeSeccion = filas.filter((i) => i.estado === "pendiente");
                const todos = pendientesDeSeccion.length > 0 && pendientesDeSeccion.every((i) => marcados.has(i.id));
                return (
                    <section key={seccion.sentido} className="overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                        <h2 className="px-4 pt-3 font-display text-sm font-semibold">
                            {seccion.titulo} <span className="tabular font-normal text-[var(--foreground-muted)]">· {filas.length}</span>
                        </h2>
                        <table className="mt-2 w-full min-w-[860px] border-collapse text-left text-[13px]">
                            <thead className="border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th scope="col" className={`${CLASES_TH} w-8`}>
                                        {puedeRegistrar && pendientesDeSeccion.length > 0 ? (
                                            <input
                                                type="checkbox"
                                                aria-label={`Marcar todos los pendientes de ${seccion.titulo.toLowerCase()}`}
                                                checked={todos}
                                                onChange={() =>
                                                    setMarcados((actual) => {
                                                        const nuevo = new Set(actual);
                                                        for (const i of pendientesDeSeccion) {
                                                            if (todos) nuevo.delete(i.id);
                                                            else nuevo.add(i.id);
                                                        }
                                                        return nuevo;
                                                    })
                                                }
                                                className="accent-[var(--accent)]"
                                            />
                                        ) : null}
                                    </th>
                                    <th scope="col" className={CLASES_TH}>Fecha</th>
                                    <th scope="col" className={CLASES_TH}>Documento</th>
                                    <th scope="col" className={CLASES_TH}>Contraparte</th>
                                    <th scope="col" className={`${CLASES_TH} text-right`}>Total</th>
                                    <th scope="col" className={CLASES_TH}>{seccion.cuenta}</th>
                                    <th scope="col" className={CLASES_TH}>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filas.map((i) => (
                                    <tr key={i.id} className="border-b border-[var(--border-subtle)] last:border-0">
                                        <td className={CELDA}>
                                            {puedeRegistrar && i.estado === "pendiente" ? (
                                                <input
                                                    type="checkbox"
                                                    aria-label={`Marcar N° ${i.folio}`}
                                                    checked={marcados.has(i.id)}
                                                    onChange={() => alternar(i.id)}
                                                    className="accent-[var(--accent)]"
                                                />
                                            ) : null}
                                        </td>
                                        <td className={`tabular whitespace-nowrap ${CELDA}`}>{formatearFechaContable(i.fecha_emision)}</td>
                                        <td className={`whitespace-nowrap ${CELDA}`}>
                                            {i.tipo === "documento" ? (
                                                <Link href={`/dashboard/documentos/${i.id}`} className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                                                    N° {i.folio}
                                                </Link>
                                            ) : (
                                                <span className="font-medium">N° {i.folio}</span>
                                            )}
                                            <p className="text-[11.5px] text-[var(--foreground-muted)]">
                                                {i.tipo_dte ? nombreTipoDte(i.tipo_dte) : "Boleta de honorarios"}
                                            </p>
                                        </td>
                                        <td className={`max-w-[240px] ${CELDA}`}>
                                            <p className="truncate" title={i.contraparte ?? undefined}>
                                                {i.contraparte ?? "—"}
                                            </p>
                                            <p className="tabular text-[11.5px] text-[var(--foreground-muted)]">{i.rut}</p>
                                        </td>
                                        <td className={`tabular whitespace-nowrap text-right ${CELDA}`}>{formatearCLP(i.monto_total)}</td>
                                        <td className={CELDA}>
                                            {puedeRegistrar && i.estado === "pendiente" && opciones.length > 0 ? (
                                                <select
                                                    aria-label={`Cuenta para N° ${i.folio}`}
                                                    value={cuentas[i.id] ?? i.id_cuenta_propuesta ?? ""}
                                                    onChange={(e) => setCuentas((actual) => ({ ...actual, [i.id]: e.target.value }))}
                                                    className="max-w-[220px] rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-2 py-1 text-[12.5px]"
                                                >
                                                    {i.id_cuenta_propuesta ? null : <option value="">Elige una cuenta…</option>}
                                                    {opciones.map((o) => (
                                                        <option key={o.id_cuenta} value={o.id_cuenta}>
                                                            {o.etiqueta}
                                                        </option>
                                                    ))}
                                                </select>
                                            ) : (
                                                <span className="text-[12px] text-[var(--foreground-muted)]">
                                                    {seccion.sentido === "honorario" && i.estado === "pendiente" ? "Honorarios, retención y por pagar" : ""}
                                                </span>
                                            )}
                                        </td>
                                        <td className={CELDA}>
                                            <Etiqueta tono={ESTADO[i.estado].tono}>{ESTADO[i.estado].etiqueta}</Etiqueta>
                                            {i.estado === "borrador" && i.id_borrador ? (
                                                <Link href={`/dashboard/core-contable/borradores/${i.id_borrador}`} className="ml-2 text-[12px] font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                                                    Revisar
                                                </Link>
                                            ) : null}
                                            {i.estado === "contabilizado" && i.asiento ? (
                                                <Link href={`/dashboard/core-contable/${i.asiento.id_asiento}`} className="tabular ml-2 text-[12px] font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                                                    {i.asiento.cita}
                                                </Link>
                                            ) : null}
                                            {i.motivo ? <p className="mt-1 max-w-[260px] text-[11.5px] text-[var(--foreground-muted)]">{i.motivo}</p> : null}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </section>
                );
            })}
        </div>
    );
}
