/* ============================================================================
   /dashboard/balance — Balance de comprobación y saldos (8 columnas).

   Sumas, saldos, inventario y resultados de cada cuenta con movimientos en el
   ejercicio, con la utilidad o pérdida que iguala las columnas. Sale del mismo
   libro que el diario y el mayor: no hay otra fuente de cifras.

   Server Component, igual que el libro mayor: los filtros son un
   <form method="get"> que queda en la URL.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, asientosApi, type BalanceComprobacion, type ColumnasBalance } from "@/lib/api";
import { tieneMonto } from "@/lib/decimal";
import { formatearCLP, formatearFechaContable, hoyEnChile, nombreMesLargo } from "@/lib/formato";
import { exigirTokenSesion } from "@/lib/session";
import { BotonImprimir } from "../core-contable/BotonImprimir";
import { Aviso, CLASES_TH, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Balance" };

type Parametros = Record<string, string | string[] | undefined>;

const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)]";

const COLUMNAS: readonly { readonly clave: keyof ColumnasBalance; readonly titulo: string }[] = [
    { clave: "debitos", titulo: "Débitos" },
    { clave: "creditos", titulo: "Créditos" },
    { clave: "deudor", titulo: "Deudor" },
    { clave: "acreedor", titulo: "Acreedor" },
    { clave: "activo", titulo: "Activo" },
    { clave: "pasivo", titulo: "Pasivo" },
    { clave: "perdidas", titulo: "Pérdidas" },
    { clave: "ganancias", titulo: "Ganancias" },
];

const GRUPOS = [
    { titulo: "Sumas", span: 2 },
    { titulo: "Saldos", span: 2 },
    { titulo: "Inventario", span: 2 },
    { titulo: "Resultados", span: 2 },
] as const;

const REGLAS: readonly string[] = [
    "Sumas: todo lo cargado (débitos) y abonado (créditos) a cada cuenta en el rango. Saldos: la diferencia, del lado que corresponda.",
    "Inventario: los saldos de activo, pasivo y patrimonio. Resultados: los de ingresos y gastos.",
    "La utilidad (o pérdida) del ejercicio es lo que falta para que inventario y resultados cuadren: se agrega del lado contrario y las cuatro parejas de columnas quedan con sumas iguales.",
    "Si alguna pareja no cuadra, hay un error en el libro: la partida doble se valida al registrar, así que no debería pasar.",
    "Solo aparecen las cuentas con movimientos en el rango. Haz clic en una cuenta para ver su libro mayor.",
];

function numero(parametros: Parametros, clave: string, min: number, max: number): number | undefined {
    const valor = Number(parametros[clave]);
    return Number.isInteger(valor) && valor >= min && valor <= max ? valor : undefined;
}

/** Un monto, o vacío si es cero: en un balance de 8 columnas las celdas en cero se dejan en blanco. */
const celda = (monto: string) => (tieneMonto(monto) ? formatearCLP(monto) : "");

export default async function BalancePage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const parametros = await searchParams;
    const hoy = hoyEnChile();
    const anio = numero(parametros, "anio", 2000, 2100) ?? Number(hoy.slice(0, 4));
    // Por defecto, hasta el mes en curso del ejercicio actual, o diciembre de uno pasado.
    const mesPorDefecto = anio === Number(hoy.slice(0, 4)) ? Number(hoy.slice(5, 7)) : 12;
    const mes = numero(parametros, "mes", 1, 12) ?? mesPorDefecto;
    const desdeMes = Math.min(numero(parametros, "desde", 1, 12) ?? 1, mes);

    let balance: BalanceComprobacion | null = null;
    let error = false;
    try {
        balance = await asientosApi.balance(anio, mes, desdeMes, { token, cache: "no-store" });
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) redirect("/login");
        error = true;
    }

    const anios = Array.from({ length: 6 }, (_, i) => Number(hoy.slice(0, 4)) - 4 + i);

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Balance de comprobación y saldos"
                descripcion="El balance de 8 columnas del ejercicio: sumas, saldos, inventario y resultados de cada cuenta, con la utilidad o pérdida del período."
                acciones={balance ? <BotonImprimir texto="Imprimir balance" /> : undefined}
            />

            <Guia titulo="Cómo leer el balance de 8 columnas">
                <ReglasGuia reglas={REGLAS} />
            </Guia>

            <form method="get" action="/dashboard/balance" className="no-imprimir flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Ejercicio
                    <select name="anio" defaultValue={anio} className={`tabular ${CLASES_CAMPO}`}>
                        {anios.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Desde
                    <select name="desde" defaultValue={desdeMes} className={`capitalize ${CLASES_CAMPO}`}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                                {nombreMesLargo(m)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Hasta
                    <select name="mes" defaultValue={mes} className={`capitalize ${CLASES_CAMPO}`}>
                        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => (
                            <option key={m} value={m}>
                                {nombreMesLargo(m)}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="submit"
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium hover:bg-[var(--background-raised)]"
                >
                    Ver balance
                </button>
            </form>

            {error || !balance ? (
                <Aviso tono="critico">
                    No pudimos cargar el balance. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la
                    página.
                </Aviso>
            ) : balance.filas.length === 0 ? (
                <Aviso>
                    No hay asientos entre el {formatearFechaContable(balance.desde)} y el {formatearFechaContable(balance.hasta)}.
                    El balance se arma con lo registrado en el libro diario.
                </Aviso>
            ) : (
                <TablaBalance balance={balance} />
            )}
        </div>
    );
}

function TablaBalance({ balance }: { readonly balance: BalanceComprobacion }) {
    const { cuadra, resultado } = balance;
    const todoCuadra = cuadra.sumas && cuadra.saldos && cuadra.inventario_resultados;
    const hayUtilidad = tieneMonto(resultado.utilidad);
    const hayPerdida = tieneMonto(resultado.perdida);
    const mayor = (idCuenta: string) =>
        `/dashboard/libro-mayor?cuenta=${idCuenta}&desde=${balance.desde}&hasta=${balance.hasta}`;
    const PIE = "tabular border-t border-[var(--border-strong)] px-3 py-2.5 text-right font-semibold";

    return (
        <Panel sinRelleno>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
                <PanelCabecera
                    titulo={`Del ${formatearFechaContable(balance.desde)} al ${formatearFechaContable(balance.hasta)}`}
                    nota={`${balance.filas.length} cuentas · pesos chilenos`}
                />
                {todoCuadra ? (
                    <Etiqueta tono="positivo">Sumas iguales</Etiqueta>
                ) : (
                    <Etiqueta tono="critico">No cuadra</Etiqueta>
                )}
            </div>
            <div className="overflow-x-auto pt-2">
                <table className="w-full min-w-[1100px] border-collapse text-left text-[12.5px]">
                    <thead className="border-b border-[var(--border-subtle)]">
                        <tr>
                            <th scope="col" rowSpan={2} className={`${CLASES_TH} align-bottom`}>
                                Cuenta
                            </th>
                            {GRUPOS.map((g) => (
                                <th key={g.titulo} scope="colgroup" colSpan={g.span} className={`${CLASES_TH} border-l border-[var(--border-subtle)] text-center`}>
                                    {g.titulo}
                                </th>
                            ))}
                        </tr>
                        <tr>
                            {COLUMNAS.map((c, i) => (
                                <th key={c.clave} scope="col" className={`${CLASES_TH} text-right ${i % 2 === 0 ? "border-l border-[var(--border-subtle)]" : ""}`}>
                                    {c.titulo}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {balance.filas.map((f) => (
                            <tr key={f.id_cuenta} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--background-raised)]">
                                <td className="px-3 py-2">
                                    <Link href={mayor(f.id_cuenta)} className="underline-offset-4 hover:text-[var(--accent)] hover:underline" title="Ver su libro mayor">
                                        <span className="tabular text-[var(--foreground-muted)]">{f.codigo}</span> {f.nombre}
                                    </Link>
                                </td>
                                {COLUMNAS.map((c, i) => (
                                    <td key={c.clave} className={`tabular px-3 py-2 text-right whitespace-nowrap ${i % 2 === 0 ? "border-l border-[var(--border-subtle)]" : ""}`}>
                                        {celda(f[c.clave])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="border-t border-[var(--border-strong)] px-3 py-2.5 font-semibold">Totales</td>
                            {COLUMNAS.map((c) => (
                                <td key={c.clave} className={PIE}>
                                    {formatearCLP(balance.totales[c.clave])}
                                </td>
                            ))}
                        </tr>
                        <tr>
                            <td className="px-3 py-2 text-[var(--foreground-muted)]">
                                {hayPerdida ? "Pérdida del ejercicio" : "Utilidad del ejercicio"}
                            </td>
                            <td colSpan={4} />
                            <td className="tabular px-3 py-2 text-right">{hayPerdida ? formatearCLP(resultado.perdida) : ""}</td>
                            <td className="tabular px-3 py-2 text-right">{hayUtilidad ? formatearCLP(resultado.utilidad) : ""}</td>
                            <td className="tabular px-3 py-2 text-right">{hayUtilidad ? formatearCLP(resultado.utilidad) : ""}</td>
                            <td className="tabular px-3 py-2 text-right">{hayPerdida ? formatearCLP(resultado.perdida) : ""}</td>
                        </tr>
                        <tr className="bg-[var(--background-raised)]">
                            <td className="px-3 py-2.5 font-bold">Sumas iguales</td>
                            {COLUMNAS.map((c) => (
                                <td key={c.clave} className="tabular px-3 py-2.5 text-right font-bold">
                                    {formatearCLP(balance.sumas_iguales[c.clave])}
                                </td>
                            ))}
                        </tr>
                    </tfoot>
                </table>
            </div>
            {!todoCuadra ? (
                <div className="p-4">
                    <Aviso tono="critico">
                        {!cuadra.sumas ? "Los débitos no suman lo mismo que los créditos. " : ""}
                        {!cuadra.saldos ? "Los saldos deudores no suman lo mismo que los acreedores. " : ""}
                        {!cuadra.inventario_resultados ? "Inventario y resultados no cuadran con la utilidad. " : ""}
                        Revisa el libro diario del período.
                    </Aviso>
                </div>
            ) : null}
        </Panel>
    );
}
