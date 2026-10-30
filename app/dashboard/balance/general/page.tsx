/* ============================================================================
   /dashboard/balance/general — Balance general.

   Activos, pasivos y patrimonio al cierre del mes elegido, más el resultado del
   ejercicio. Cada cuenta se ubica por su rubro de estados financieros (plan de
   cuentas). Control: Activo = Pasivo + Patrimonio.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { BotonCsv } from "@/components/ui/BotonCsv";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, asientosApi, type BalanceGeneral } from "@/lib/api";
import { formatearCLP, formatearFechaContable } from "@/lib/formato";
import { balanceGeneralACsv } from "@/lib/libros";
import { exigirTokenSesion } from "@/lib/session";
import { BotonImprimir } from "../../core-contable/BotonImprimir";
import { Aviso, Encabezado } from "../../core-contable/partes";
import { cargarNotasDeRubros, EnlaceNota, FormularioPeriodo, leerPeriodo, type NotasDeRubros, type Parametros } from "../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Balance general" };

const CELDA = "tabular px-4 py-1.5 text-right";

export default async function BalanceGeneralPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const { anio, mes } = leerPeriodo(await searchParams);

    let balance: BalanceGeneral | null = null;
    const notasPromesa = cargarNotasDeRubros(anio, token);
    try {
        balance = await asientosApi.balanceGeneral(anio, mes, { token, cache: "no-store" });
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) redirect("/login");
    }

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Balance general"
                descripcion="Lo que la empresa tiene (activos), lo que debe (pasivos) y su patrimonio, al cierre del mes, con el resultado del ejercicio."
                volverA="/dashboard/balance"
                acciones={
                    balance ? (
                        <div className="flex gap-2">
                            <BotonCsv csv={balanceGeneralACsv(balance)} archivo={`balance-general-${balance.hasta}.csv`} />
                            <BotonImprimir texto="Imprimir" />
                        </div>
                    ) : undefined
                }
            />
            <FormularioPeriodo ruta="/dashboard/balance/general" anio={anio} mes={mes} desdeMes={1} conDesde={false} />
            {!balance ? (
                <Aviso tono="critico">
                    No pudimos cargar el balance general. Si el servidor estaba inactivo puede tardar unos segundos en despertar:
                    recarga la página.
                </Aviso>
            ) : (
                <Cuerpo balance={balance} notas={await notasPromesa} />
            )}
        </div>
    );
}

function Cuerpo({ balance, notas }: { readonly balance: BalanceGeneral; readonly notas: NotasDeRubros }) {
    const { totales, secciones } = balance;
    const de = (...rubros: string[]) => secciones.filter((s) => rubros.includes(s.rubro) && s.cuentas.length > 0);
    const mayor = (id: string) => `/dashboard/libro-mayor?cuenta=${id}&desde=${balance.hasta.slice(0, 4)}-01-01&hasta=${balance.hasta}`;

    return (
        <Panel sinRelleno>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
                <PanelCabecera titulo={`Al ${formatearFechaContable(balance.hasta)}`} nota="pesos chilenos" />
                {balance.cuadra ? <Etiqueta tono="positivo">Activo = Pasivo + Patrimonio</Etiqueta> : <Etiqueta tono="critico">No cuadra</Etiqueta>}
            </div>
            <div className="overflow-x-auto pt-2">
                <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                    <tbody>
                        <Bloque titulo="Activos" secciones={de("activo_corriente", "activo_no_corriente")} total={totales.activo} mayor={mayor} notas={notas} />
                        <Bloque titulo="Pasivos" secciones={de("pasivo_corriente", "pasivo_no_corriente")} total={totales.pasivo} mayor={mayor} notas={notas} />
                        <tr className="bg-[var(--background-raised)]">
                            <th scope="colgroup" colSpan={2} className="px-4 py-2 text-left font-bold">
                                Patrimonio
                            </th>
                        </tr>
                        {de("patrimonio").map((s) => (
                            <Seccion key={s.rubro} seccion={s} mayor={mayor} notas={notas} />
                        ))}
                        <tr>
                            <td className="px-4 py-1.5 text-[var(--foreground-muted)]">Resultados de ejercicios anteriores</td>
                            <td className={CELDA}>{formatearCLP(totales.resultados_anteriores)}</td>
                        </tr>
                        <tr>
                            <td className="px-4 py-1.5 text-[var(--foreground-muted)]">Resultado del ejercicio</td>
                            <td className={CELDA}>{formatearCLP(totales.resultado_ejercicio)}</td>
                        </tr>
                        <tr>
                            <td className="border-t border-[var(--border-strong)] px-4 py-2 font-bold">Total pasivos y patrimonio</td>
                            <td className={`${CELDA} border-t border-[var(--border-strong)] font-bold`}>{formatearCLP(totales.pasivo_mas_patrimonio)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
            {!balance.cuadra ? (
                <div className="p-4">
                    <Aviso tono="critico">
                        Los activos no suman lo mismo que pasivos más patrimonio. Revisa que cada cuenta tenga su rubro en el plan de
                        cuentas y el libro diario del período.
                    </Aviso>
                </div>
            ) : null}
        </Panel>
    );
}

function Bloque({
    titulo,
    secciones,
    total,
    mayor,
    notas,
}: {
    readonly titulo: string;
    readonly secciones: BalanceGeneral["secciones"];
    readonly total: string;
    readonly mayor: (id: string) => string;
    readonly notas: NotasDeRubros;
}) {
    return (
        <>
            <tr className="bg-[var(--background-raised)]">
                <th scope="colgroup" colSpan={2} className="px-4 py-2 text-left font-bold">
                    {titulo}
                </th>
            </tr>
            {secciones.map((s) => (
                <Seccion key={s.rubro} seccion={s} mayor={mayor} notas={notas} />
            ))}
            <tr>
                <td className="border-t border-[var(--border-strong)] px-4 py-2 font-bold">Total {titulo.toLowerCase()}</td>
                <td className={`${CELDA} border-t border-[var(--border-strong)] font-bold`}>{formatearCLP(total)}</td>
            </tr>
        </>
    );
}

function Seccion({ seccion, mayor, notas }: { readonly seccion: BalanceGeneral["secciones"][number]; readonly mayor: (id: string) => string; readonly notas: NotasDeRubros }) {
    return (
        <>
            <tr>
                <td className="px-4 py-1.5 font-medium">
                    {seccion.titulo}
                    <EnlaceNota notas={notas} rubro={seccion.rubro} />
                </td>
                <td className={`${CELDA} font-medium`}>{formatearCLP(seccion.total)}</td>
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
