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
                        detalle={
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

            {/* ---- Por contabilizar: antes una pantalla aparte. scroll-mt deja el título debajo de la cabecera fija. ---- */}
            <section id="por-contabilizar" className="scroll-mt-20">
                <EncabezadoZona titulo="Por contabilizar" nota="Los documentos del SII del mes, de factura a asiento" />
                <SeccionPorContabilizar
                    periodo={datos.periodoContab}
                    datos={datos.porContabilizar}
                    plan={datos.cuentas}
                    registra={puedeRegistrar(rol)}
                />
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
