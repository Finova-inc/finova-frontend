/* ============================================================================
   Balance de comprobación (4 columnas) y balance tributario (8 columnas).

   Los dos salen del mismo cálculo del backend (GET /asientos-contables/balance):
   la comprobación muestra sumas y saldos; el tributario agrega inventario y
   resultados, con la utilidad o pérdida que iguala las columnas.

   Server Component: los filtros son un <form method="get"> que queda en la URL.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { BotonCsv } from "@/components/ui/BotonCsv";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, asientosApi, type BalanceComprobacion, type ColumnasBalance } from "@/lib/api";
import { tieneMonto } from "@/lib/decimal";
import { formatearCLP, formatearFechaContable } from "@/lib/formato";
import { balanceACsv } from "@/lib/libros";
import { exigirTokenSesion } from "@/lib/session";
import { BotonImprimir } from "../core-contable/BotonImprimir";
import { Aviso, CLASES_TH, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { FormularioPeriodo, leerPeriodo, type Parametros } from "./partes";

type Columna = { readonly clave: keyof ColumnasBalance; readonly titulo: string };

const COLUMNAS: readonly Columna[] = [
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

const VARIANTES = {
    comprobacion: {
        ruta: "/dashboard/balance/comprobacion",
        titulo: "Balance de comprobación",
        descripcion: "Debe, haber y saldos de cada cuenta con movimientos en el período. Verifica que el libro cuadre.",
        guia: "Cómo leer el balance de comprobación",
        reglas: [
            "Debe y haber: todo lo cargado y abonado a cada cuenta en el período. Saldo deudor o acreedor: la diferencia, del lado que corresponda.",
            "Los totales de debe y haber tienen que ser iguales, y también los de saldo deudor y acreedor. Si no, hay un error en el libro.",
            "Solo aparecen las cuentas con movimientos en el período. Haz clic en una cuenta para ver su libro mayor.",
        ],
        columnas: COLUMNAS.slice(0, 4),
    },
    tributario: {
        ruta: "/dashboard/balance/tributario",
        titulo: "Balance tributario (8 columnas)",
        descripcion: "Sumas, saldos, inventario y resultados de cada cuenta, con la utilidad o pérdida del período.",
        guia: "Cómo leer el balance de 8 columnas",
        reglas: [
            "Sumas: todo lo cargado (débitos) y abonado (créditos) a cada cuenta. Saldos: la diferencia, del lado que corresponda.",
            "Inventario: los saldos de activo, pasivo y patrimonio. Resultados: los de ingresos y gastos.",
            "La utilidad (o pérdida) del ejercicio es lo que falta para que inventario y resultados cuadren: se agrega del lado contrario y las cuatro parejas de columnas quedan con sumas iguales.",
            "Control: el resultado que muestra Inventario tiene que coincidir con el de Resultados.",
        ],
        columnas: COLUMNAS,
    },
} as const;

/** Un monto, o vacío si es cero: en un balance las celdas en cero se dejan en blanco. */
const celda = (monto: string) => (tieneMonto(monto) ? formatearCLP(monto) : "");

export async function PaginaBalance({
    variante,
    searchParams,
}: {
    readonly variante: keyof typeof VARIANTES;
    readonly searchParams: Promise<Parametros>;
}) {
    const token = await exigirTokenSesion();
    const { anio, mes, desdeMes } = leerPeriodo(await searchParams);
    const v = VARIANTES[variante];

    let balance: BalanceComprobacion | null = null;
    let error = false;
    try {
        balance = await asientosApi.balance(anio, mes, desdeMes, { token, cache: "no-store" });
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) redirect("/login");
        error = true;
    }

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo={v.titulo}
                descripcion={v.descripcion}
                volverA="/dashboard/balance"
                acciones={
                    balance ? (
                        <div className="flex gap-2">
                            <BotonCsv csv={balanceACsv(balance, variante === "tributario")} archivo={`${variante}-${balance.hasta}.csv`} />
                            <BotonImprimir texto="Imprimir" />
                        </div>
                    ) : undefined
                }
            />

            <Guia titulo={v.guia}>
                <ReglasGuia reglas={v.reglas} />
            </Guia>

            <FormularioPeriodo ruta={v.ruta} anio={anio} mes={mes} desdeMes={desdeMes} conDesde />

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
                <TablaBalance balance={balance} columnas={v.columnas} ocho={variante === "tributario"} />
            )}
        </div>
    );
}

function TablaBalance({
    balance,
    columnas,
    ocho,
}: {
    readonly balance: BalanceComprobacion;
    readonly columnas: readonly Columna[];
    readonly ocho: boolean;
}) {
    const { cuadra, resultado } = balance;
    const todoCuadra = ocho ? cuadra.sumas && cuadra.saldos && cuadra.inventario_resultados : cuadra.sumas && cuadra.saldos;
    const hayUtilidad = tieneMonto(resultado.utilidad);
    const hayPerdida = tieneMonto(resultado.perdida);
    const mayor = (idCuenta: string) =>
        `/dashboard/libro-mayor?cuenta=${idCuenta}&desde=${balance.desde}&hasta=${balance.hasta}`;
    const PIE = "tabular border-t border-[var(--border-strong)] px-3 py-2.5 text-right font-semibold";
    const borde = (i: number) => (i % 2 === 0 ? "border-l border-[var(--border-subtle)]" : "");

    return (
        <Panel sinRelleno>
            <div className="flex flex-wrap items-center justify-between gap-2 px-4 pt-4">
                <PanelCabecera
                    titulo={`Del ${formatearFechaContable(balance.desde)} al ${formatearFechaContable(balance.hasta)}`}
                    nota={`${balance.filas.length} cuentas · pesos chilenos`}
                />
                {todoCuadra ? <Etiqueta tono="positivo">Cuadra</Etiqueta> : <Etiqueta tono="critico">No cuadra</Etiqueta>}
            </div>
            <div className="overflow-x-auto pt-2">
                <table className={`w-full border-collapse text-left text-[12.5px] ${ocho ? "min-w-[1100px]" : "min-w-[640px]"}`}>
                    <thead className="border-b border-[var(--border-subtle)]">
                        {ocho ? (
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
                        ) : null}
                        <tr>
                            {!ocho ? (
                                <th scope="col" className={CLASES_TH}>
                                    Cuenta
                                </th>
                            ) : null}
                            {columnas.map((c, i) => (
                                <th key={c.clave} scope="col" className={`${CLASES_TH} text-right ${ocho ? borde(i) : ""}`}>
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
                                {columnas.map((c, i) => (
                                    <td key={c.clave} className={`tabular px-3 py-2 text-right whitespace-nowrap ${ocho ? borde(i) : ""}`}>
                                        {celda(f[c.clave])}
                                    </td>
                                ))}
                            </tr>
                        ))}
                    </tbody>
                    <tfoot>
                        <tr>
                            <td className="border-t border-[var(--border-strong)] px-3 py-2.5 font-semibold">Totales</td>
                            {columnas.map((c) => (
                                <td key={c.clave} className={PIE}>
                                    {formatearCLP(balance.totales[c.clave])}
                                </td>
                            ))}
                        </tr>
                        {ocho ? (
                            <>
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
                                    {columnas.map((c) => (
                                        <td key={c.clave} className="tabular px-3 py-2.5 text-right font-bold">
                                            {formatearCLP(balance.sumas_iguales[c.clave])}
                                        </td>
                                    ))}
                                </tr>
                            </>
                        ) : null}
                    </tfoot>
                </table>
            </div>
            {!todoCuadra ? (
                <div className="p-4">
                    <Aviso tono="critico">
                        {!cuadra.sumas ? "El debe no suma lo mismo que el haber. " : ""}
                        {!cuadra.saldos ? "Los saldos deudores no suman lo mismo que los acreedores. " : ""}
                        {ocho && !cuadra.inventario_resultados ? "El resultado de Inventario no coincide con el de Resultados. " : ""}
                        Revisa el libro diario del período.
                    </Aviso>
                </div>
            ) : null}
        </Panel>
    );
}
