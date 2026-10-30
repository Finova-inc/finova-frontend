/* ============================================================================
   /dashboard/balance/resultados — Estado de resultados.

   Ingresos y gastos del período y su resultado (ganancia menos pérdida).
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonCsv } from "@/components/ui/BotonCsv";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, asientosApi, type EstadoResultados } from "@/lib/api";
import { tieneMonto } from "@/lib/decimal";
import { formatearCLP, formatearFechaContable } from "@/lib/formato";
import { estadoResultadosACsv } from "@/lib/libros";
import { exigirTokenSesion } from "@/lib/session";
import { BotonImprimir } from "../../core-contable/BotonImprimir";
import { Aviso, Encabezado } from "../../core-contable/partes";
import { cargarNotasDeRubros, EnlaceNota, FormularioPeriodo, leerPeriodo, type NotasDeRubros, type Parametros } from "../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Estado de resultados" };

export default async function EstadoResultadosPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const { anio, mes, desdeMes } = leerPeriodo(await searchParams);

    let estado: EstadoResultados | null = null;
    const notasPromesa = cargarNotasDeRubros(anio, token);
    try {
        estado = await asientosApi.estadoResultados(anio, mes, desdeMes, { token, cache: "no-store" });
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) redirect("/login");
    }

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Estado de resultados"
                descripcion="Los ingresos y gastos del período, y el resultado: ganancia si los ingresos superan a los gastos, pérdida si no."
                volverA="/dashboard/balance"
                acciones={
                    estado ? (
                        <div className="flex gap-2">
                            <BotonCsv csv={estadoResultadosACsv(estado)} archivo={`estado-resultados-${estado.hasta}.csv`} />
                            <BotonImprimir texto="Imprimir" />
                        </div>
                    ) : undefined
                }
            />
            <FormularioPeriodo ruta="/dashboard/balance/resultados" anio={anio} mes={mes} desdeMes={desdeMes} conDesde />
            {!estado ? (
                <Aviso tono="critico">
                    No pudimos cargar el estado de resultados. Si el servidor estaba inactivo puede tardar unos segundos en despertar:
                    recarga la página.
                </Aviso>
            ) : estado.ingresos.cuentas.length + estado.gastos.cuentas.length === 0 ? (
                <Aviso>
                    No hay ingresos ni gastos entre el {formatearFechaContable(estado.desde)} y el {formatearFechaContable(estado.hasta)}.
                </Aviso>
            ) : (
                <Cuerpo estado={estado} notas={await notasPromesa} />
            )}
        </div>
    );
}

function Bloque({ titulo, rubro, seccion, mayor, notas }: { titulo: string; rubro: string; seccion: EstadoResultados["ingresos"]; mayor: (id: string) => string; notas: NotasDeRubros }) {
    return (
        <>
            <tr className="bg-[var(--background-raised)]">
                <th scope="col" className="px-4 py-2 text-left font-bold">
                    {titulo}
                    <EnlaceNota notas={notas} rubro={rubro} />
                </th>
                <td className="tabular px-4 py-2 text-right font-bold">{formatearCLP(seccion.total)}</td>
            </tr>
            {seccion.cuentas.map((c) => (
                <tr key={c.id_cuenta}>
                    <td className="py-1 pl-8 pr-4">
                        <Link href={mayor(c.id_cuenta)} className="underline-offset-4 hover:text-[var(--accent)] hover:underline" title="Ver su libro mayor">
                            <span className="tabular text-[var(--foreground-muted)]">{c.codigo}</span> {c.nombre}
                        </Link>
                    </td>
                    <td className="tabular px-4 py-1 text-right text-[var(--foreground-muted)]">{formatearCLP(c.saldo)}</td>
                </tr>
            ))}
        </>
    );
}

function Cuerpo({ estado, notas }: { readonly estado: EstadoResultados; readonly notas: NotasDeRubros }) {
    const perdida = tieneMonto(estado.resultado) && estado.resultado.startsWith("-");
    const mayor = (id: string) => `/dashboard/libro-mayor?cuenta=${id}&desde=${estado.desde}&hasta=${estado.hasta}`;

    return (
        <Panel sinRelleno>
            <div className="px-4 pt-4">
                <PanelCabecera
                    titulo={`Del ${formatearFechaContable(estado.desde)} al ${formatearFechaContable(estado.hasta)}`}
                    nota="pesos chilenos"
                />
            </div>
            <div className="overflow-x-auto pt-2">
                <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                    <tbody>
                        <Bloque titulo="Ingresos" rubro="ingresos" seccion={estado.ingresos} mayor={mayor} notas={notas} />
                        <Bloque titulo="Gastos" rubro="gastos" seccion={estado.gastos} mayor={mayor} notas={notas} />
                        <tr>
                            <th scope="row" className="border-t-2 border-[var(--border-strong)] px-4 py-3 text-left font-bold">
                                {perdida ? "Pérdida del período" : "Ganancia del período"}
                            </th>
                            <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                {formatearCLP(estado.resultado)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}
