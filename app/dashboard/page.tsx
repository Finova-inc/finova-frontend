/* ============================================================================
   /dashboard — Panel de control.

   Server Component: la cookie de sesion es httpOnly y solo se lee en el
   servidor.

   ---------------------------------------------------------------------------
   TODO LO QUE SE VE ES REAL
   ---------------------------------------------------------------------------
   Las cifras salen del libro diario (GET /asientos-contables/resumen): saldos
   de efectivo, por cobrar y por pagar, resultado e IVA por mes. Las alertas se
   derivan de datos reales: periodos, borradores, plan de cuentas y el IVA del
   mes anterior. Lo que el backend todavia no sabe (conciliacion bancaria,
   cobranza por vencimiento) no se muestra: una cifra inventada en una
   herramienta contable se lee como el saldo real de la empresa.
   ========================================================================== */

import Link from "next/link";
import type { ReactNode } from "react";

import { GraficoIngresosGastos } from "@/components/dashboard/GraficoIngresosGastos";
import { ZonaAlertas, type Alerta } from "@/components/dashboard/ZonaAlertas";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import {
    ApiError,
    asientosApi,
    borradoresApi,
    cuentasApi,
    periodosApi,
    type AsientoBorrador,
    type AsientoListado,
    type CuentaContable,
    type PeriodoContable,
    type ResumenPanel,
} from "@/lib/api";
import {
    formatearCLP,
    formatearComprobante,
    formatearFechaContable,
    hoyEnChile,
    nombreMesLargo,
    nombrePeriodo,
} from "@/lib/formato";
import { exigirTokenSesion } from "@/lib/session";

export const dynamic = "force-dynamic";

/**
 * Dia del mes siguiente en que vence el F29.
 *
 * ponytail: plazo fijo del dia 20 (facturador electronico que declara por
 * internet; quien no, tiene hasta el 12) y sin correr por dias inhabiles.
 * Supuesto a confirmar con el PO; si cambia, se cambia aqui.
 */
const DIA_VENCE_F29 = 20;

type DatosPanel = {
    readonly hoy: string;
    readonly anio: number;
    readonly mes: number;
    readonly resumen: ResumenPanel | null;
    /** Solo en enero: el F29 de diciembre es del ejercicio anterior. */
    readonly resumenAnterior: ResumenPanel | null;
    readonly periodos: readonly PeriodoContable[] | null;
    readonly recientes: readonly AsientoListado[] | null;
    readonly cuentas: readonly CuentaContable[] | null;
    readonly borradores: readonly AsientoBorrador[] | null;
    readonly sinConexion: boolean;
};

async function cargarPanel(token: string): Promise<DatosPanel> {
    const opciones = { token, cache: "no-store" } as const;
    const hoy = hoyEnChile();
    const anio = Number(hoy.slice(0, 4));
    const mes = Number(hoy.slice(5, 7));

    /**
     * En paralelo, no en cascada: el backend esta en el plan gratuito de
     * Render y, si duerme, la primera llamada paga el arranque en frio. En
     * serie serian varias esperas sumadas.
     *
     * allSettled y no all: que falle una consulta no debe dejar en blanco los
     * bloques que si respondieron. Cada bloque caido muestra "—".
     */
    const resultados = await Promise.allSettled([
        asientosApi.resumen(anio, opciones),
        mes === 1 ? asientosApi.resumen(anio - 1, opciones) : Promise.resolve(null),
        periodosApi.listar(opciones),
        asientosApi.listar({ por_pagina: 5 }, opciones),
        cuentasApi.listar(opciones),
        borradoresApi.listar(opciones),
    ]);
    const [resumen, resumenAnterior, periodos, recientes, cuentas, borradores] = resultados;

    const valor = <T,>(resultado: PromiseSettledResult<T>): T | null =>
        resultado.status === "fulfilled" ? resultado.value : null;

    return {
        hoy,
        anio,
        mes,
        resumen: valor(resumen),
        resumenAnterior: valor(resumenAnterior),
        periodos: valor(periodos),
        recientes: valor(recientes)?.items ?? null,
        cuentas: valor(cuentas),
        borradores: valor(borradores),
        sinConexion: resultados.every(
            (r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 0,
        ),
    };
}

export default async function DashboardPage() {
    const token = await exigirTokenSesion();
    const datos = await cargarPanel(token);
    const { resumen, anio, mes } = datos;
    const periodoActual = datos.periodos?.find((p) => p.anio === anio && p.mes === mes);

    return (
        <div className="flex flex-col gap-6">
            <div className="flex flex-wrap items-center gap-3.5">
                <h1 className="font-display text-xl font-semibold tracking-[-0.015em] text-balance">
                    Panel de control
                </h1>

                {/* La empresa activa ya la muestra la cabecera: aqui va el mes. */}
                {datos.periodos ? (
                    <span className="ml-auto inline-flex items-center gap-2 text-[12px] text-[var(--foreground-muted)]">
                        <span
                            className={`size-[7px] shrink-0 rounded-full ${
                                periodoActual?.estado === "abierto"
                                    ? "bg-[var(--positivo)]"
                                    : "bg-[var(--foreground-muted)]"
                            }`}
                        />
                        Período {nombrePeriodo(anio, mes)} ·{" "}
                        {periodoActual ? periodoActual.estado : "sin abrir"}
                    </span>
                ) : null}
            </div>

            {datos.sinConexion ? (
                <p role="alert" className="rounded-xl bg-[var(--critico-bg)] p-4 text-sm text-[var(--critico)]">
                    No pudimos contactar al servidor. Si el backend estaba dormido, recarga en unos segundos.
                </p>
            ) : null}

            {/* ---- Cifras clave: saldos a la fecha de corte y resultado ---- */}
            <section>
                <EncabezadoZona
                    titulo="Cifras clave"
                    nota={resumen ? `Según el libro al ${formatearFechaContable(resumen.hasta)}` : "Sin datos"}
                />
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <CifraClave etiqueta="Efectivo" valor={resumen?.saldos.efectivo} detalle="Caja y bancos" />
                    <CifraClave
                        etiqueta="Por cobrar"
                        valor={resumen?.saldos.por_cobrar}
                        detalle="Clientes y otros deudores"
                    />
                    <CifraClave
                        etiqueta="Por pagar"
                        valor={resumen?.saldos.por_pagar}
                        detalle="Proveedores y otras cuentas"
                    />
                    <CifraClave
                        etiqueta={`Resultado ${anio}`}
                        valor={resumen?.resultado_ejercicio}
                        detalle={resumen ? <EtiquetaResultado monto={resumen.resultado_ejercicio} /> : null}
                    />
                </div>
            </section>

            {/* ---- Lo urgente: solo alertas que salen de datos reales ---- */}
            <section>
                <EncabezadoZona titulo="Lo urgente" nota="Pendientes del libro y del IVA" />
                <ZonaAlertas alertas={construirAlertas(datos)} />
            </section>

            {/* ---- El ejercicio: resultado mes a mes y ultimos asientos ---- */}
            <section>
                <EncabezadoZona titulo="El ejercicio" nota={`Enero a ${nombreMesLargo(mes).toLowerCase()} de ${anio}`} />
                {/* minmax(0, ...): sin el, los textos truncados de la lista fijan
                    un ancho minimo a la columna y en un celular la grilla se sale
                    de la pantalla. */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)]">
                    {resumen ? (
                        <GraficoIngresosGastos meses={resumen.meses} anio={anio} />
                    ) : (
                        <Panel>
                            <p className="text-[13px] text-[var(--foreground-muted)]">
                                No pudimos cargar los ingresos y gastos del ejercicio.
                            </p>
                        </Panel>
                    )}
                    <UltimosAsientos asientos={datos.recientes} />
                </div>
            </section>
        </div>
    );
}

/* ----------------------------------------------------------------------------
   Alertas: cada regla mira un dato real y, si no hay nada que decir, calla.
   -------------------------------------------------------------------------- */

const esNegativo = (monto: string) => monto.trim().startsWith("-");
const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const esCero = (monto: string) => /^-?0+(\.0+)?$/.test(monto.trim());

function construirAlertas(datos: DatosPanel): Alerta[] {
    const { hoy, anio, mes } = datos;
    const alertas: Alerta[] = [];

    // F29 del mes anterior, mientras corre el plazo. Despues del dia 20 no se
    // sabe si ya se declaro (no hay registro de la declaracion), asi que calla.
    const dia = Number(hoy.slice(8, 10));
    const mesF29 = mes === 1 ? 12 : mes - 1;
    const resumenF29 = mes === 1 ? datos.resumenAnterior : datos.resumen;
    const ivaF29 = resumenF29?.meses.find((m) => m.mes === mesF29);
    if (ivaF29 && dia <= DIA_VENCE_F29 && !(esCero(ivaF29.iva_debito) && esCero(ivaF29.iva_credito))) {
        const quedan = DIA_VENCE_F29 - dia;
        const insignia = quedan === 0 ? "vence hoy" : `vence en ${quedan} día${quedan === 1 ? "" : "s"}`;
        const nombreMes = nombreMesLargo(mesF29).toLowerCase();
        const desglose = `Débito ${formatearCLP(ivaF29.iva_debito)} − crédito ${formatearCLP(ivaF29.iva_credito)} según el libro.`;

        if (esNegativo(ivaF29.iva_neto)) {
            alertas.push({
                id: "f29",
                severidad: "info",
                icono: "check",
                titulo: `F29 de ${nombreMes}: remanente de crédito`,
                detalle: `${desglose} No hay IVA que pagar; el remanente pasa al mes siguiente.`,
                insignia,
                monto: ivaF29.iva_neto.replace(/^-/, ""),
            });
        } else if (!esCero(ivaF29.iva_neto)) {
            alertas.push({
                id: "f29",
                severidad: quedan <= 3 ? "critica" : "aviso",
                icono: "alert",
                titulo: `F29 de ${nombreMes}: IVA estimado a pagar`,
                detalle: `${desglose} Faltan PPM y retenciones.`,
                insignia,
                monto: ivaF29.iva_neto,
            });
        }
    }

    // Empresa recien creada desde el popup: sin plan no hay donde imputar.
    if (datos.cuentas?.length === 0) {
        alertas.push({
            id: "plan-vacio",
            severidad: "aviso",
            icono: "ledger",
            titulo: "Esta empresa aún no tiene plan de cuentas",
            detalle: "Carga el plan base NIIF para PYMES para empezar a registrar asientos.",
            accion: { texto: "Cargar plan", href: "/dashboard/plan-cuentas" },
        });
    }

    if (datos.periodos) {
        const actual = datos.periodos.find((p) => p.anio === anio && p.mes === mes);
        if (!actual || actual.estado !== "abierto") {
            alertas.push({
                id: "periodo-actual",
                severidad: "aviso",
                icono: "lock",
                titulo: actual
                    ? `${conMayuscula(nombrePeriodo(anio, mes))} está cerrado`
                    : `No hay período abierto para ${nombrePeriodo(anio, mes)}`,
                detalle: "Sin un período abierto no se pueden registrar asientos de este mes.",
                accion: { texto: actual ? "Ver períodos" : "Abrir ejercicio", href: "/dashboard/periodos" },
            });
        }

        const terminadosAbiertos = datos.periodos
            .filter((p) => p.estado === "abierto" && (p.anio < anio || (p.anio === anio && p.mes < mes)))
            .sort((a, b) => a.anio - b.anio || a.mes - b.mes);
        if (terminadosAbiertos.length > 0) {
            const [primero] = terminadosAbiertos;
            alertas.push({
                id: "meses-abiertos",
                severidad: "info",
                icono: "lock",
                titulo:
                    terminadosAbiertos.length === 1
                        ? `${conMayuscula(nombrePeriodo(primero.anio, primero.mes))} terminó y sigue abierto`
                        : `${terminadosAbiertos.length} meses terminados siguen abiertos`,
                detalle: "Ciérralos en orden, desde el más antiguo, cuando ya estén declarados.",
                accion: { texto: "Cerrar períodos", href: "/dashboard/periodos" },
            });
        }
    }

    const cantidadBorradores = datos.borradores?.length ?? 0;
    if (cantidadBorradores > 0) {
        alertas.push({
            id: "borradores",
            severidad: "info",
            icono: "document",
            titulo:
                cantidadBorradores === 1
                    ? "1 borrador sin contabilizar"
                    : `${cantidadBorradores} borradores sin contabilizar`,
            detalle: "No forman parte del libro hasta que se contabilizan.",
            accion: { texto: "Revisar", href: "/dashboard/core-contable" },
        });
    }

    return alertas;
}

/* ----------------------------------------------------------------------------
   Piezas de la pagina.
   -------------------------------------------------------------------------- */

/**
 * Rotulo de zona. No es una tarjeta: es un encabezado, y gastarle borde y
 * sombra lo pondria al mismo nivel visual que el contenido que titula.
 */
function EncabezadoZona({ titulo, nota }: { readonly titulo: string; readonly nota: string }) {
    return (
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.1em]">{titulo}</h2>
            <span className="text-[12px] text-[var(--foreground-muted)]">{nota}</span>
        </div>
    );
}

/**
 * Cifra clave del panel.
 *
 * `undefined` significa que la consulta fallo, y se muestra un guion en vez
 * de un cero: "$0 de efectivo" y "no pudimos consultarlo" son cosas
 * distintas, y confundirlas en un panel contable lleva a malas decisiones.
 */
function CifraClave({
    etiqueta,
    valor,
    detalle,
}: {
    readonly etiqueta: string;
    readonly valor: string | undefined;
    readonly detalle: ReactNode;
}) {
    return (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3.5">
            <p className="text-[12px] text-[var(--foreground-muted)]">{etiqueta}</p>
            <p className="tabular mt-1 font-display text-2xl font-semibold">
                {valor === undefined ? "—" : formatearCLP(valor)}
            </p>
            <div className="mt-1 text-[11.5px] text-[var(--foreground-muted)]">{detalle}</div>
        </div>
    );
}

/** Utilidad o perdida dicho con palabras: el color solo acompana. */
function EtiquetaResultado({ monto }: { readonly monto: string }) {
    if (esCero(monto)) return <Etiqueta tono="neutro">Sin movimientos</Etiqueta>;
    return esNegativo(monto) ? (
        <Etiqueta tono="critico">Pérdida</Etiqueta>
    ) : (
        <Etiqueta tono="positivo">Utilidad</Etiqueta>
    );
}

function UltimosAsientos({ asientos }: { readonly asientos: readonly AsientoListado[] | null }) {
    return (
        <Panel sinRelleno>
            <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4">
                <PanelCabecera titulo="Últimos asientos" />
                <Link
                    href="/dashboard/core-contable"
                    className="text-[12px] font-semibold text-[var(--accent)] hover:underline"
                >
                    Ver libro diario →
                </Link>
            </div>

            {asientos === null ? (
                <p className="px-5 pb-5 text-[13px] text-[var(--foreground-muted)]">
                    No pudimos cargar los asientos.
                </p>
            ) : asientos.length === 0 ? (
                <p className="px-5 pb-5 text-[13px] text-[var(--foreground-muted)]">
                    Todavía no hay asientos.{" "}
                    <Link href="/dashboard/core-contable/nuevo" className="font-semibold text-[var(--accent)] hover:underline">
                        Registrar el primero
                    </Link>
                </p>
            ) : (
                <ul className="pb-2">
                    {asientos.map((asiento) => (
                        <li key={asiento.id_asiento} className="border-t border-[var(--border-subtle)]">
                            <Link
                                href={`/dashboard/core-contable/${asiento.id_asiento}`}
                                className="flex items-center gap-3 px-5 py-2.5 transition-colors hover:bg-[var(--background-raised)]"
                            >
                                <span className="tabular w-[84px] shrink-0 text-[12px] text-[var(--foreground-muted)]">
                                    <span className="block font-semibold text-[var(--foreground)]">
                                        {formatearComprobante(asiento.tipo_comprobante, asiento.numero, asiento.anio)}
                                    </span>
                                    {formatearFechaContable(asiento.fecha_contable)}
                                </span>
                                <span className="min-w-0 flex-1 truncate text-[13px]">{asiento.glosa}</span>
                                {asiento.revertido_por ? <Etiqueta tono="neutro">Revertido</Etiqueta> : null}
                                <span className="tabular shrink-0 text-[13px] font-semibold">
                                    {formatearCLP(asiento.valor_comprobante)}
                                </span>
                            </Link>
                        </li>
                    ))}
                </ul>
            )}
        </Panel>
    );
}
