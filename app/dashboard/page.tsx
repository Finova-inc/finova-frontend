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

   La sección «Por contabilizar» (#por-contabilizar) es el antiguo módulo
   /dashboard/contabilizacion, hoy integrado aquí: el mes va en ?periodo=.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";

import { GraficoIngresosGastos } from "@/components/dashboard/GraficoIngresosGastos";
import { ZonaAlertas, type Alerta } from "@/components/dashboard/ZonaAlertas";
import { Cifra } from "@/components/ui/Cifra";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import {
    ApiError,
    asientosApi,
    borradoresApi,
    contabilizacionApi,
    cuentasApi,
    f29Api,
    periodosApi,
    type AsientoBorrador,
    type AsientoListado,
    type CuentaContable,
    type PeriodoContable,
    type PorContabilizar,
    type ResumenPanel,
    type ResumenPropuestaF29,
} from "@/lib/api";
import { periodoPorDefecto } from "@/lib/f29";
import {
    formatearCLP,
    formatearComprobante,
    formatearFechaContable,
    hoyEnChile,
    nombreMesLargo,
    nombrePeriodo,
} from "@/lib/formato";
import { insigniaPlazoF29, plazoF29, severidadPlazoF29 } from "@/lib/periodos";
import { periodoValido } from "@/lib/sii";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { SeccionPorContabilizar } from "./SeccionPorContabilizar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Panel de control" };

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
    /** Documentos del SII del mes elegido en la sección «Por contabilizar»; null si la consulta falló. */
    readonly porContabilizar: PorContabilizar | null;
    /** Mes de esa sección (?periodo=; por defecto el anterior al actual). */
    readonly periodoContab: string;
    /** Mes de la alerta de «Lo urgente» (siempre el anterior al actual) y cuántos documentos tiene por contabilizar; null si no se pudo saber. */
    readonly periodoAlerta: string;
    readonly pendientesAlerta: number | null;
    /** Propuestas de F29 del año del mes anterior, para saber si ya se declaró; null si la consulta falló. */
    readonly propuestasF29: readonly ResumenPropuestaF29[] | null;
    readonly sinConexion: boolean;
};

async function cargarPanel(token: string, periodoContab: string): Promise<DatosPanel> {
    const opciones = { token, cache: "no-store" } as const;
    const hoy = hoyEnChile();
    const periodoAlerta = periodoPorDefecto(hoy);
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
        contabilizacionApi.listar(periodoContab, opciones),
        // La alerta mira siempre el mes por defecto; si la sección está en otro mes, hace falta su propia consulta.
        periodoContab === periodoAlerta ? Promise.resolve(null) : contabilizacionApi.listar(periodoAlerta, opciones),
        // El F29 del mes anterior es el del plazo que corre; el de diciembre es del año anterior.
        f29Api.listar(Number(periodoAlerta.slice(0, 4)), opciones),
    ]);
    // Una sesión vencida da 401 en todas: se vuelve al login en vez de mostrar un panel de "—".
    if (resultados.some((r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401)) {
        redirect("/login");
    }
    const [resumen, resumenAnterior, periodos, recientes, cuentas, borradores, porContabilizar, deLaAlerta, propuestasF29] = resultados;

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
        porContabilizar: valor(porContabilizar),
        periodoContab,
        periodoAlerta,
        propuestasF29: valor(propuestasF29),
        pendientesAlerta: (periodoContab === periodoAlerta ? valor(porContabilizar) : valor(deLaAlerta))?.resumen.pendientes ?? null,
        sinConexion: resultados.every(
            (r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 0,
        ),
    };
}

export default async function DashboardPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const pedido = (await searchParams).periodo;
    const periodoContab = periodoValido(typeof pedido === "string" ? pedido : undefined) ?? periodoPorDefecto(hoyEnChile());
    const datos = await cargarPanel(token, periodoContab);
    const { resumen, anio, mes } = datos;
    const periodoActual = datos.periodos?.find((p) => p.anio === anio && p.mes === mes);
    // Reintentar = pedir la misma pantalla otra vez al servidor (un Link, sin JavaScript propio).
    const reintento = { texto: "Reintentar", href: `/dashboard?periodo=${datos.periodoContab}` };

    return (
        <div className="flex flex-col gap-10">
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                <h1 className="font-display text-xl font-semibold tracking-[-0.015em] text-balance">
                    Panel de control
                </h1>

                {/* La empresa activa ya la muestra la cabecera: aqui va el mes. El estado se dice con
                    palabras y con la forma del punto (lleno = abierto, aro = no), no solo con el color. */}
                {datos.periodos ? (
                    <p className="inline-flex items-center gap-2 text-sm text-[var(--foreground-muted)]">
                        <span
                            aria-hidden="true"
                            className={`size-2.5 shrink-0 rounded-full ${
                                periodoActual?.estado === "abierto"
                                    ? "bg-[var(--positivo)]"
                                    : "border-2 border-[var(--foreground-muted)]"
                            }`}
                        />
                        Período {nombrePeriodo(anio, mes)} ·{" "}
                        {periodoActual ? periodoActual.estado : "sin abrir"}
                    </p>
                ) : null}
            </div>

            {datos.sinConexion ? (
                <p role="alert" className="rounded-xl bg-[var(--critico-bg)] p-4 text-sm text-[var(--critico)]">
                    No pudimos contactar al servidor. Si el backend estaba dormido, recarga en unos segundos.
                </p>
            ) : null}

            {/* ---- Lo urgente: solo alertas que salen de datos reales ---- */}
            <section className="animate-entrada">
                <EncabezadoZona titulo="Lo urgente" nota="Pendientes del libro y del IVA" />
                <ZonaAlertas alertas={construirAlertas(datos)} />
            </section>

            {/* ---- Cifras clave: saldos a la fecha de corte y resultado ---- */}
            <section className="@container animate-entrada [animation-delay:50ms]">
                <EncabezadoZona
                    titulo="Cifras clave"
                    nota={
                        resumen ? (
                            `Según el libro al ${formatearFechaContable(resumen.hasta)}`
                        ) : (
                            <>
                                Sin datos ·{" "}
                                <Link href={reintento.href} className="font-semibold text-[var(--accent-text)] hover:underline">
                                    Reintentar
                                </Link>
                            </>
                        )
                    }
                />
                <div className="grid gap-4 @md:grid-cols-2 @4xl:grid-cols-4">
                    <Cifra titulo="Efectivo" icono="bank" valor={clp(resumen?.saldos.efectivo)} nota="Caja y bancos" />
                    <Cifra
                        titulo="Por cobrar"
                        icono="document"
                        valor={clp(resumen?.saldos.por_cobrar)}
                        nota={
                            resumen && esNegativo(resumen.saldos.por_cobrar) ? (
                                <span role="note">
                                    <span className="font-semibold text-[var(--aviso)]">Saldo negativo.</span> Hay más cobros
                                    que ventas contabilizadas (por ejemplo, un cobro sin factura previa). Revisa las cuentas de
                                    clientes en el{" "}
                                    <Link href="/dashboard/libro-mayor" className="font-semibold underline-offset-2 hover:underline">
                                        libro mayor
                                    </Link>
                                    .
                                </span>
                            ) : (
                                "Clientes y otros deudores"
                            )
                        }
                    />
                    <Cifra titulo="Por pagar" icono="clock" valor={clp(resumen?.saldos.por_pagar)} nota="Proveedores y otras cuentas" />
                    <Cifra
                        titulo={`Resultado ${anio}`}
                        icono="calculator"
                        tono={tonoDelResultado(resumen?.resultado_ejercicio)}
                        valor={clp(resumen?.resultado_ejercicio)}
                        nota={resumen ? <EtiquetaResultado monto={resumen.resultado_ejercicio} /> : null}
                        tamano="grande"
                    />
                </div>
            </section>

            {/* ---- El ejercicio: resultado mes a mes y ultimos asientos ---- */}
            <section className="animate-entrada [animation-delay:100ms]">
                <EncabezadoZona titulo="El ejercicio" nota={`Enero a ${nombreMesLargo(mes).toLowerCase()} de ${anio}`} />
                {/* minmax(0, ...): sin el, los textos truncados de la lista fijan
                    un ancho minimo a la columna y en un celular la grilla se sale
                    de la pantalla. */}
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,1fr)] 2xl:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
                    {resumen ? (
                        <GraficoIngresosGastos meses={resumen.meses} anio={anio} />
                    ) : (
                        <Panel>
                            <EstadoVacio icono="alert" tono="critico" accion={reintento}>
                                No pudimos cargar los ingresos y gastos del ejercicio.
                            </EstadoVacio>
                        </Panel>
                    )}
                    <UltimosAsientos asientos={datos.recientes} reintento={reintento} />
                </div>
            </section>

            {/* ---- Por contabilizar: antes una pantalla aparte; va al final porque es la zona más larga. scroll-mt deja el título debajo de la cabecera fija. ---- */}
            <section id="por-contabilizar" className="scroll-mt-20 animate-entrada [animation-delay:150ms]">
                <EncabezadoZona titulo="Por contabilizar" nota="Los documentos del SII del mes, de factura a asiento" />
                <SeccionPorContabilizar
                    periodo={datos.periodoContab}
                    datos={datos.porContabilizar}
                    plan={datos.cuentas}
                    registra={puedeRegistrar(rol)}
                />
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
/** Utilidad tiñe de positivo y pérdida de crítico; cero o sin dato, neutro. */
const tonoDelResultado = (monto: string | undefined) =>
    monto === undefined || esCero(monto) ? "neutro" : esNegativo(monto) ? "critico" : "positivo";
/** undefined (la consulta falló) pasa tal cual: la Cifra lo dibuja como "—", nunca como $0. */
const clp = (monto: string | undefined) => (monto === undefined ? undefined : formatearCLP(monto));

function construirAlertas(datos: DatosPanel): Alerta[] {
    const { hoy, anio, mes } = datos;
    const alertas: Alerta[] = [];

    // F29 del mes anterior: su plazo (día 20, lib/periodos.ts) corre este mes. Se avisa
    // con la urgencia de los días que faltan, y también cuando ya venció y no se
    // declaró. "Declarado" solo se sabe si se anotó en la pantalla del F29.
    const [anioF29, mesF29] = datos.periodoAlerta.split("-").map(Number);
    const plazo = plazoF29(anioF29, mesF29, hoy);
    const propuesta = datos.propuestasF29?.find((p) => p.periodo === datos.periodoAlerta);
    const resumenF29 = mes === 1 ? datos.resumenAnterior : datos.resumen;
    const ivaF29 = resumenF29?.meses.find((m) => m.mes === mesF29);
    const hayMovimiento = ivaF29 !== undefined && !(esCero(ivaF29.iva_debito) && esCero(ivaF29.iva_credito));
    // Sin la lista de propuestas no se sabe si ya se declaró: un plazo vencido calla en vez de alarmar de más.
    const sePuedeAvisar = plazo.dias >= 0 || datos.propuestasF29 !== null;

    if (sePuedeAvisar && propuesta?.estado !== "declarada" && (hayMovimiento || propuesta)) {
        const vencido = plazo.dias < 0;
        const [, mesPlazo, diaPlazo] = plazo.vence.split("-").map(Number);
        const insignia = insigniaPlazoF29(plazo.dias);
        const nombreMes = nombreMesLargo(mesF29).toLowerCase();
        const limite = `Plazo: ${diaPlazo} de ${nombreMesLargo(mesPlazo).toLowerCase()}.`;
        const sigueAbierto = vencido ? " Si ya lo declaraste, anótalo en el F29 para quitar este aviso." : "";
        const accion = { texto: "Ver F29", href: `/dashboard/f29?periodo=${datos.periodoAlerta}` };
        const urgencia = severidadPlazoF29(plazo.dias);

        // Propuesta en curso o IVA neto cero: no hay monto que mostrar, pero el F29 igual se presenta.
        const sinMonto: Alerta = {
            id: "f29",
            severidad: urgencia,
            icono: "alert",
            titulo: `F29 de ${nombreMes}: ${vencido ? "plazo vencido" : "falta declararlo"}`,
            detalle: `Revisa la propuesta y presenta la declaración en el SII. ${limite}${sigueAbierto}`,
            insignia,
            accion,
        };

        if (hayMovimiento && ivaF29) {
            const desglose = `Débito ${formatearCLP(ivaF29.iva_debito)} − crédito ${formatearCLP(ivaF29.iva_credito)} según el libro.`;
            if (esNegativo(ivaF29.iva_neto)) {
                alertas.push({
                    id: "f29",
                    // Sin IVA que pagar, solo urge cuando ya venció.
                    severidad: vencido ? "aviso" : "info",
                    icono: vencido ? "alert" : "check",
                    titulo: `F29 de ${nombreMes}: remanente de crédito`,
                    detalle: `${desglose} No hay IVA que pagar; el remanente pasa al mes siguiente. ${limite}${sigueAbierto}`,
                    insignia,
                    monto: ivaF29.iva_neto.replace(/^-/, ""),
                    accion,
                });
            } else if (!esCero(ivaF29.iva_neto)) {
                alertas.push({
                    id: "f29",
                    // Con IVA a pagar nunca baja de aviso, aunque falten muchos días.
                    severidad: urgencia === "info" ? "aviso" : urgencia,
                    icono: "alert",
                    titulo: `F29 de ${nombreMes}: IVA estimado a pagar${vencido ? " (plazo vencido)" : ""}`,
                    detalle: `${desglose} Faltan PPM y retenciones. ${limite}${sigueAbierto}`,
                    insignia,
                    monto: ivaF29.iva_neto,
                    accion,
                });
            } else {
                alertas.push(sinMonto);
            }
        } else {
            alertas.push(sinMonto);
        }
    }

    // Empresa recien creada desde el popup: sin plan no hay donde imputar.
    if (datos.cuentas?.length === 0) {
        alertas.push({
            id: "plan-vacio",
            severidad: "aviso",
            icono: "ledger",
            titulo: "Esta empresa aún no tiene plan de cuentas",
            detalle: "Configúralo eligiendo las cuentas que usa la empresa para empezar a registrar asientos.",
            accion: { texto: "Configurar plan", href: "/dashboard/plan-cuentas" },
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
                accion: { texto: actual ? "Ver períodos" : "Abrir período", href: "/dashboard/periodos" },
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

    // Un cero o una consulta caída no dicen nada: la alerta solo existe si hay pendientes.
    const pendientesSii = datos.pendientesAlerta ?? 0;
    if (pendientesSii > 0) {
        alertas.push({
            id: "por-contabilizar",
            severidad: "info",
            icono: "document",
            titulo:
                pendientesSii === 1
                    ? "1 documento del SII por contabilizar"
                    : `${pendientesSii} documentos del SII por contabilizar`,
            detalle: "Finova propone un borrador por documento; tú lo revisas y lo contabilizas.",
            accion: { texto: "Ver documentos", href: `/dashboard?periodo=${datos.periodoAlerta}#por-contabilizar` },
        });
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

/*
   Movimiento de la portada: las cuatro zonas entran con fundido y una subida
   corta (animate-entrada), con 50 ms entre una y otra. Es una animacion CSS al
   montar: ocurre al abrir la pantalla y no se repite al cambiar de mes ni en
   un re-render. Con "reducir movimiento" aparecen ya en su sitio.

   Escala tipografica de la portada (y de sus componentes): seis pasos fijos y
   ningun texto menor de 12px.
     12px  notas, rotulos y detalle
     14px  cuerpo: filas, titulos de alerta, enlaces
     15px  titulo de zona (h2) y monto de una alerta
     20px  titulo de la pantalla (h1) y cifras del mes en el grafico
     24px  cifra clave (Cifra "normal")
     30px  la cifra que resume el ejercicio (Cifra "grande")
   Excepcion: las pastillas (Etiqueta) siguen en 10px: son un componente
   compartido con todo el panel.
*/

/**
 * Rotulo de zona. No es una tarjeta: es un encabezado, y gastarle borde y
 * sombra lo pondria al mismo nivel visual que el contenido que titula.
 */
function EncabezadoZona({ titulo, nota }: { readonly titulo: string; readonly nota: ReactNode }) {
    return (
        <div className="mb-4 flex flex-wrap items-baseline gap-x-3 gap-y-0.5 border-b border-[var(--border-subtle)] pb-2.5">
            <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">{titulo}</h2>
            <span className="text-xs text-[var(--foreground-muted)]">{nota}</span>
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

/** Comprobante y fecha, glosa (la que se acorta) y monto, de ancho fijo para que las cifras se alineen. */
const COLUMNAS_ASIENTO = "grid grid-cols-[6.5rem_minmax(0,1fr)_6.5rem] items-center gap-3";

function UltimosAsientos({
    asientos,
    reintento,
}: {
    readonly asientos: readonly AsientoListado[] | null;
    readonly reintento: { readonly texto: string; readonly href: string };
}) {
    return (
        <Panel sinRelleno>
            <div className="flex items-baseline justify-between gap-3 px-5 pb-2 pt-4">
                <PanelCabecera titulo="Últimos asientos" escala="legible" />
                <Link
                    href="/dashboard/core-contable"
                    className="text-xs font-semibold text-[var(--accent-text)] hover:underline"
                >
                    Ver libro diario →
                </Link>
            </div>

            {asientos === null ? (
                <div className="px-5 pb-5">
                    <EstadoVacio icono="alert" tono="critico" accion={reintento}>
                        No pudimos cargar los asientos.
                    </EstadoVacio>
                </div>
            ) : asientos.length === 0 ? (
                <div className="px-5 pb-5">
                    <EstadoVacio
                        icono="document"
                        accion={{ texto: "Registrar el primero", href: "/dashboard/core-contable/nuevo" }}
                    >
                        Todavía no hay asientos.
                    </EstadoVacio>
                </div>
            ) : (
                <div className="pb-2">
                    {/* Las tres columnas son las mismas en la cabecera y en cada fila: así las cifras quedan alineadas. */}
                    <div className={`${COLUMNAS_ASIENTO} px-5 pb-1.5 text-xs font-medium text-[var(--foreground-muted)]`}>
                        <span>Comprobante</span>
                        <span>Glosa</span>
                        <span className="text-right">Monto</span>
                    </div>
                    <ul>
                        {asientos.map((asiento) => (
                            <li key={asiento.id_asiento} className="border-t border-[var(--border-subtle)]">
                                <Link
                                    href={`/dashboard/core-contable/${asiento.id_asiento}`}
                                    className={`${COLUMNAS_ASIENTO} px-5 py-2.5 transition-colors hover:bg-[var(--background-raised)]`}
                                >
                                    <span className="tabular text-xs text-[var(--foreground-muted)]">
                                        <span className="block font-semibold text-[var(--foreground)]">
                                            {formatearComprobante(asiento.tipo_comprobante, asiento.numero, asiento.anio)}
                                        </span>
                                        {formatearFechaContable(asiento.fecha_contable)}
                                    </span>
                                    <span className="flex min-w-0 items-center gap-2">
                                        <span className="min-w-0 truncate text-sm">{asiento.glosa}</span>
                                        {asiento.revertido_por ? <Etiqueta tono="neutro">Revertido</Etiqueta> : null}
                                    </span>
                                    <span className="tabular text-right text-sm font-semibold">
                                        {formatearCLP(asiento.valor_comprobante)}
                                    </span>
                                </Link>
                            </li>
                        ))}
                    </ul>
                </div>
            )}
        </Panel>
    );
}
