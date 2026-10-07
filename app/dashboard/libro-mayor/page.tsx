/* ============================================================================
   /dashboard/libro-mayor — Libro mayor de una cuenta.

   Los movimientos de UNA cuenta en un rango, en orden cronologico, con el
   saldo anterior y el saldo despues de cada movimiento. Es el libro diario
   visto por cuenta en vez de por dia.

   Server Component, igual que el libro diario: la cookie es httpOnly y solo se
   lee aqui, y los filtros son un <form method="get"> que queda en la URL.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, asientosApi, cuentasApi, type LibroMayor } from "@/lib/api";
import {
    formatearCLP,
    formatearComprobante,
    formatearFechaContable,
    hoyEnChile,
} from "@/lib/formato";
import { tieneMonto } from "@/lib/decimal";
import { exigirTokenSesion } from "@/lib/session";
import { BotonImprimir } from "../core-contable/BotonImprimir";
import { Aviso, CLASES_TH, Encabezado } from "../core-contable/partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Libro mayor" };

type Parametros = Record<string, string | string[] | undefined>;

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const RUTA_DIARIO = "/dashboard/core-contable";

const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)]";

function texto(parametros: Parametros, clave: string): string | undefined {
    const valor = parametros[clave];
    return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

export default async function LibroMayorPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const parametros = await searchParams;

    const hoy = hoyEnChile();
    const desde = texto(parametros, "desde");
    const hasta = texto(parametros, "hasta");
    const cuenta = texto(parametros, "cuenta");
    const idCuenta = cuenta && PATRON_UUID.test(cuenta) ? cuenta : undefined;
    // Por defecto, el ejercicio en curso: del 1 de enero a hoy.
    const rango = {
        desde: desde && PATRON_FECHA.test(desde) ? desde : `${hoy.slice(0, 4)}-01-01`,
        hasta: hasta && PATRON_FECHA.test(hasta) ? hasta : hoy,
    };

    const opciones = { token, cache: "no-store" } as const;
    const [cuentas, mayor] = await Promise.allSettled([
        cuentasApi.listar(opciones),
        idCuenta ? asientosApi.libroMayor(idCuenta, rango.desde, rango.hasta, opciones) : Promise.resolve(null),
    ]);

    for (const resultado of [cuentas, mayor]) {
        if (resultado.status === "rejected" && resultado.reason instanceof ApiError && resultado.reason.status === 401) {
            redirect("/login");
        }
    }

    // Cuentas imputables, y las de agrupacion que alguna vez tuvieron
    // movimientos (una cuenta ya usada puede haber pasado a agrupacion).
    const imputables =
        cuentas.status === "fulfilled"
            ? cuentas.value
                  .filter((c) => c.acepta_movimiento || c.tiene_movimientos)
                  .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }))
            : [];

    const error =
        cuentas.status === "rejected"
            ? "No pudimos cargar el plan de cuentas. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la página."
            : mayor.status === "rejected"
              ? mayor.reason instanceof ApiError && mayor.reason.status === 400
                  ? "Revisa el rango de fechas: el libro mayor se consulta en rangos de hasta un año."
                  : mayor.reason instanceof ApiError && mayor.reason.status === 404
                    ? "La cuenta no existe en esta empresa."
                    : "No pudimos cargar el libro mayor. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la página."
              : null;

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Libro mayor"
                descripcion="Los movimientos de una cuenta en orden cronológico, con su saldo después de cada uno. El saldo anterior suma todo el historial previo al rango."
            />

            <form method="get" action="/dashboard/libro-mayor" className="no-imprimir flex flex-wrap items-end gap-3">
                <label className="flex min-w-64 flex-1 flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Cuenta
                    <select name="cuenta" defaultValue={idCuenta ?? ""} required className={CLASES_CAMPO}>
                        <option value="" disabled>
                            Elige una cuenta…
                        </option>
                        {imputables.map((c) => (
                            <option key={c.id_cuenta} value={c.id_cuenta}>
                                {c.codigo} · {c.nombre}
                                {c.is_active ? "" : " (inactiva)"}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Desde
                    <input type="date" name="desde" defaultValue={rango.desde} className={`tabular ${CLASES_CAMPO}`} />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Hasta
                    <input type="date" name="hasta" defaultValue={rango.hasta} className={`tabular ${CLASES_CAMPO}`} />
                </label>
                <button
                    type="submit"
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium hover:bg-[var(--background-raised)]"
                >
                    Ver mayor
                </button>
                {mayor.status === "fulfilled" && mayor.value ? (
                    <div className="ml-auto">
                        <BotonImprimir texto="Imprimir mayor" />
                    </div>
                ) : null}
            </form>

            {error ? (
                <Aviso tono="critico">{error}</Aviso>
            ) : mayor.status === "fulfilled" && mayor.value ? (
                <TablaMayor mayor={mayor.value} />
            ) : (
                <Aviso>Elige una cuenta para ver su libro mayor.</Aviso>
            )}
        </div>
    );
}

function TablaMayor({ mayor }: { readonly mayor: LibroMayor }) {
    const { cuenta, totales } = mayor;
    const periodo = `${formatearFechaContable(mayor.desde)} al ${formatearFechaContable(mayor.hasta)}`;

    return (
        <Panel sinRelleno>
            <div className="px-4 pt-4">
                <PanelCabecera
                    titulo={`${cuenta.codigo} · ${cuenta.nombre}`}
                    nota={`${cuenta.naturaleza === "D" ? "Cuenta deudora" : "Cuenta acreedora"} · ${periodo} · pesos chilenos`}
                />
            </div>
            <div className="overflow-x-auto pt-2">
                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                    <thead className="border-b border-[var(--border-subtle)]">
                        <tr>
                            <th scope="col" className={CLASES_TH}>Fecha</th>
                            <th scope="col" className={CLASES_TH}>Comprobante</th>
                            <th scope="col" className={CLASES_TH}>Glosa</th>
                            <th scope="col" className={`${CLASES_TH} text-right`}>Debe</th>
                            <th scope="col" className={`${CLASES_TH} text-right`}>Haber</th>
                            <th scope="col" className={`${CLASES_TH} text-right`}>Saldo</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr className="border-b border-[var(--border-subtle)] bg-[var(--background-raised)]">
                            <td colSpan={5} className="px-4 py-2 font-medium">
                                Saldo anterior
                            </td>
                            <td className="tabular px-4 py-2 text-right font-medium">
                                {formatearCLP(mayor.saldo_anterior)}
                            </td>
                        </tr>
                        {mayor.movimientos.map((m) => (
                            <tr key={m.id_movimiento} className="border-b border-[var(--border-subtle)] align-top last:border-0">
                                <td className="tabular px-4 py-2">{formatearFechaContable(m.fecha_contable)}</td>
                                <td className="px-4 py-2">
                                    <Link
                                        href={`${RUTA_DIARIO}/${m.id_asiento}`}
                                        className="tabular font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                                    >
                                        {formatearComprobante(m.tipo_comprobante, m.numero, m.anio)}
                                    </Link>
                                    {m.origen === "reversa" || m.origen === "apertura" ? (
                                        <Etiqueta tono="neutro" className="ml-2">
                                            {m.origen === "reversa" ? "Reversa" : "Apertura"}
                                        </Etiqueta>
                                    ) : null}
                                </td>
                                <td className="px-4 py-2 text-[var(--foreground-muted)]">{m.glosa ?? m.glosa_asiento}</td>
                                <td className="tabular px-4 py-2 text-right">{tieneMonto(m.debe) ? formatearCLP(m.debe) : ""}</td>
                                <td className="tabular px-4 py-2 text-right">{tieneMonto(m.haber) ? formatearCLP(m.haber) : ""}</td>
                                <td className="tabular px-4 py-2 text-right">{formatearCLP(m.saldo)}</td>
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td colSpan={3} className="border-t-2 border-[var(--border-strong)] px-4 py-3 font-bold">
                                Totales · {mayor.movimientos.length}{" "}
                                {mayor.movimientos.length === 1 ? "movimiento" : "movimientos"}
                            </td>
                            <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                {formatearCLP(totales.total_debe)}
                            </td>
                            <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                {formatearCLP(totales.total_haber)}
                            </td>
                            <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                {formatearCLP(totales.saldo_final)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Panel>
    );
}
