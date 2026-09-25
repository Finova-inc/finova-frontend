/* ============================================================================
   /dashboard/core-contable/[id] — un comprobante contabilizado.

   Solo lectura: un asiento contabilizado no se modifica ni se elimina (art. 31
   del Codigo de Comercio). La unica accion es revertirlo (art. 32).
   ========================================================================== */

import { notFound, redirect } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { ApiError, asientosApi, type AsientoDetalle } from "@/lib/api";
import { formatearPesos, sumarPesos, tieneMonto } from "@/lib/decimal";
import {
    NOMBRE_TIPO_COMPROBANTE,
    formatearCLP,
    formatearComprobante,
    formatearFechaContable,
    formatearFechaLarga,
    formatearRut,
    hoyEnChile,
    nombrePeriodo,
} from "@/lib/formato";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { BotonImprimir } from "../BotonImprimir";
import { DialogoRevertir } from "../DialogoRevertir";
import { Aviso, CLASES_TH, EnlaceAccion, EnlaceComprobante, Encabezado, EtiquetasDeEstado } from "../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Asiento contable" };

const NOMBRE_ORIGEN: Record<string, string> = {
    manual: "Registro manual",
    apertura: "Asiento de apertura",
    reversa: "Reversa",
    documento: "Centralización de documento",
};

export default async function DetalleAsientoPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();

    let asiento: AsientoDetalle;
    try {
        asiento = await asientosApi.obtener(id, { token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        // 404 tambien para un asiento de otra empresa: el backend no confirma
        // que exista. 400: el id no es un uuid.
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
        throw error;
    }

    const comprobante = formatearComprobante(asiento.tipo_comprobante, asiento.numero, asiento.anio);
    const totalDebe = sumarPesos(asiento.movimientos.map((m) => m.debe));
    const totalHaber = sumarPesos(asiento.movimientos.map((m) => m.haber));
    const puedeRevertir =
        puedeRegistrar(rol) && asiento.origen !== "reversa" && asiento.revertido_por === null;

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo={`${NOMBRE_TIPO_COMPROBANTE[asiento.tipo_comprobante] ?? "Comprobante"} ${comprobante}`}
                descripcion={asiento.glosa}
                acciones={
                    <>
                        <EnlaceAccion href="/dashboard/core-contable" variante="neutro">
                            Volver al libro diario
                        </EnlaceAccion>
                        <BotonImprimir />
                    </>
                }
            />

            {asiento.revertido_por ? (
                <Aviso tono="aviso">
                    Este asiento fue revertido por <EnlaceComprobante referencia={asiento.revertido_por} /> el{" "}
                    {formatearFechaContable(asiento.revertido_por.fecha_contable)}. Ambos siguen en el libro
                    diario y su efecto neto es cero.
                </Aviso>
            ) : null}
            {asiento.revierte_a ? (
                <Aviso tono="neutro">
                    Este asiento revierte a <EnlaceComprobante referencia={asiento.revierte_a} />, registrado el{" "}
                    {formatearFechaContable(asiento.revierte_a.fecha_contable)}.
                </Aviso>
            ) : null}

            <Panel>
                <dl className="grid gap-4 text-[13px] sm:grid-cols-2 lg:grid-cols-4">
                    <div>
                        <dt className="text-[11.5px] text-[var(--foreground-muted)]">Fecha contable</dt>
                        <dd className="tabular mt-0.5 font-medium">{formatearFechaContable(asiento.fecha_contable)}</dd>
                    </div>
                    <div>
                        <dt className="text-[11.5px] text-[var(--foreground-muted)]">Período</dt>
                        <dd className="mt-0.5 font-medium capitalize">
                            {asiento.periodo ? nombrePeriodo(asiento.periodo.anio, asiento.periodo.mes) : "—"}
                            {asiento.periodo?.estado === "cerrado" ? (
                                <Etiqueta tono="neutro" className="ml-2">Cerrado</Etiqueta>
                            ) : null}
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[11.5px] text-[var(--foreground-muted)]">Valor del comprobante</dt>
                        <dd className="tabular mt-0.5 font-medium">{formatearCLP(asiento.valor_comprobante)}</dd>
                    </div>
                    <div>
                        <dt className="text-[11.5px] text-[var(--foreground-muted)]">Estado</dt>
                        <dd className="mt-1">
                            <EtiquetasDeEstado asiento={asiento} revertidoPor={asiento.revertido_por} />
                        </dd>
                    </div>
                    <div>
                        <dt className="text-[11.5px] text-[var(--foreground-muted)]">Origen</dt>
                        <dd className="mt-0.5">{NOMBRE_ORIGEN[asiento.origen] ?? asiento.origen}</dd>
                    </div>
                    <div className="sm:col-span-2 lg:col-span-3">
                        <dt className="text-[11.5px] text-[var(--foreground-muted)]">Registrado</dt>
                        <dd className="mt-0.5">{formatearFechaLarga(asiento.created_at)}</dd>
                    </div>
                </dl>
            </Panel>

            <Panel sinRelleno>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
                        <thead className="border-b border-[var(--border-subtle)]">
                            <tr>
                                <th scope="col" className={CLASES_TH}>#</th>
                                <th scope="col" className={CLASES_TH}>Cuenta</th>
                                <th scope="col" className={CLASES_TH}>Glosa</th>
                                <th scope="col" className={CLASES_TH}>RUT</th>
                                <th scope="col" className={`${CLASES_TH} text-right`}>Debe</th>
                                <th scope="col" className={`${CLASES_TH} text-right`}>Haber</th>
                            </tr>
                        </thead>
                        <tbody>
                            {asiento.movimientos.map((movimiento) => (
                                <tr key={movimiento.id_movimiento} className="border-b border-[var(--border-subtle)] align-top">
                                    <td className="tabular px-4 py-2.5 text-[var(--foreground-muted)]">{movimiento.orden}</td>
                                    <td className="px-4 py-2.5">
                                        <span className="tabular font-medium">{movimiento.cuenta?.codigo ?? "—"}</span>{" "}
                                        <span className="text-[var(--foreground-muted)]">{movimiento.cuenta?.nombre}</span>
                                    </td>
                                    <td className="px-4 py-2.5 text-[var(--foreground-muted)]">
                                        {movimiento.glosa ?? ""}
                                        {movimiento.codigo_iso ? (
                                            <span className="block text-[11.5px]">
                                                {movimiento.monto_moneda_original} {movimiento.codigo_iso} a {movimiento.tipo_cambio}
                                            </span>
                                        ) : null}
                                    </td>
                                    <td className="tabular px-4 py-2.5">
                                        {movimiento.tercero ? (
                                            <>
                                                {formatearRut(movimiento.tercero.rut)}
                                                <span className="block text-[11.5px] text-[var(--foreground-muted)]">
                                                    {movimiento.tercero.razon_social}
                                                </span>
                                            </>
                                        ) : (
                                            "—"
                                        )}
                                    </td>
                                    <td className="tabular px-4 py-2.5 text-right">
                                        {tieneMonto(movimiento.debe) ? formatearCLP(movimiento.debe) : ""}
                                    </td>
                                    <td className="tabular px-4 py-2.5 text-right">
                                        {tieneMonto(movimiento.haber) ? formatearCLP(movimiento.haber) : ""}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={4} className="border-t-2 border-[var(--border-strong)] px-4 py-3 font-bold">
                                    Totales
                                </td>
                                <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                    {formatearPesos(totalDebe)}
                                </td>
                                <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                    {formatearPesos(totalHaber)}
                                </td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </Panel>

            <div className="no-imprimir flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <p className="max-w-xl text-[12.5px] text-[var(--foreground-muted)]">
                    Un asiento contabilizado no se modifica ni se elimina (art. 31 del Código de Comercio). Si
                    tiene un error, se revierte con un asiento nuevo y se registra el correcto (art. 32).
                </p>
                {puedeRevertir ? (
                    <DialogoRevertir
                        idAsiento={asiento.id_asiento}
                        comprobante={comprobante}
                        fechaMinima={asiento.fecha_contable}
                        hoy={hoyEnChile()}
                    />
                ) : null}
            </div>
        </div>
    );
}
