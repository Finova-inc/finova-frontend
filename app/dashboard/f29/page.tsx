/* ============================================================================
   /dashboard/f29 — propuesta del Formulario 29.

   Finova arma la propuesta con los documentos del SII importados en
   Documentos (RCV de compras y ventas, boletas de honorarios recibidas). El
   contador la revisa, la aprueba y la presenta él en sii.cl: Finova no
   declara ni paga. El cálculo vive en el backend (src/f29/f29.calculo.ts).

   Server Component: el mes va en la URL (?periodo=2026-09), así la vista se
   puede recargar, compartir o volver atrás sin perderla.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, f29Api, type F29DelMes, type ResumenPropuestaF29 } from "@/lib/api";
import { desplazarMes, ESTADOS, nombreDelMes, periodoPorDefecto } from "@/lib/f29";
import { formatearCLP, hoyEnChile } from "@/lib/formato";
import { periodoValido } from "@/lib/sii";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { SelectorDeMes } from "@/components/dashboard/SelectorDeMes";
import { BotonImprimir } from "../core-contable/BotonImprimir";
import { Aviso, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { Indicador } from "../documentos/partes";
import { AccionesF29 } from "./AccionesF29";
import { FormularioRemanente } from "./FormularioRemanente";
import {
    Conciliacion,
    diaDelVencimiento,
    fechaEnChile,
    LineaDelAnio,
    ListaAlertas,
    ListaExcluidos,
    TablaCambios,
    TablaFormulario,
} from "./partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Formulario F29" };

const REGLAS: readonly string[] = [
    "La propuesta sale de lo que importaste en Documentos: el RCV de compras y ventas del mes y las boletas de honorarios recibidas. Finova solo los lee: no crea ni cambia documentos ni asientos.",
    "Cada documento cae en su código según su tipo (factura, boleta, nota de crédito o de débito) y el tipo de compra o venta del RCV (del giro, supermercado, activo fijo, sin derecho a crédito…). Las notas de crédito restan.",
    "Débitos (538) menos créditos (537): si da positivo es el IVA a pagar (89); si da negativo, el remanente para el mes siguiente (77). El crédito incluye el remanente del mes anterior (504), reajustado por la UTM (art. 27 del DL 825).",
    "La retención de las boletas de honorarios recibidas va al código 151 (15,25 % del bruto en 2026). Las boletas anuladas no suman.",
    "Factura de compra (cambio de sujeto): si la emite tu empresa, su IVA va como crédito (520) y como retención total (39), así que no cambia lo que se paga; si te la emite un cliente, se informa en las líneas 5 o 16 según cuánto retuvo.",
    "Lo que Finova aún no calcula —retención parcial en facturas de compra emitidas, IVA de uso común, importaciones, impuesto único de trabajadores, PPM— queda fuera con una alerta, para que lo agregues a mano.",
    "Aprobar guarda una copia de los montos. Si después cambia un documento, la pantalla lo avisa. Cuando presentes el F29 en el SII, anota su folio: desde ahí la propuesta queda cerrada.",
    "Plazo: día 20 del mes siguiente si declaras y pagas por internet siendo facturador electrónico; día 28 si la declaración es sin pago; día 12 en los demás casos. Si cae en fin de semana o feriado, pasa al día hábil siguiente.",
    "Los códigos y líneas siguen las instrucciones de llenado del Formulario 29 del SII.",
];

type Parametros = Record<string, string | string[] | undefined>;

export default async function F29Page({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const parametros = await searchParams;
    const hoy = hoyEnChile();
    const pedido = typeof parametros.periodo === "string" ? parametros.periodo : undefined;
    const periodo = periodoValido(pedido) ?? periodoPorDefecto(hoy);
    const anio = Number(periodo.slice(0, 4));
    const opciones = { token, cache: "no-store" } as const;

    let datos: F29DelMes | null = null;
    let delAnio: ResumenPropuestaF29[] = [];
    try {
        [datos, delAnio] = await Promise.all([
            f29Api.obtener(periodo, opciones),
            // Si falla, la pantalla se ve igual, solo que sin los estados del año.
            f29Api.listar(anio, opciones).catch(() => []),
        ]);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
    }

    const encabezado = (
        <Encabezado
            titulo="Formulario F29"
            descripcion="Propuesta de declaración mensual de IVA y retenciones, armada con los documentos del SII que importaste. Finova no declara ni paga: tú la revisas, la apruebas y la presentas en sii.cl."
            acciones={<BotonImprimir />}
        />
    );

    if (!datos) {
        return (
            <div className="flex flex-col gap-4">
                {encabezado}
                <SelectorDeMes ruta="/dashboard/f29" periodo={periodo} />
                <Aviso tono="critico">
                    No pudimos cargar la propuesta. Si el servidor estaba inactivo puede tardar unos segundos en despertar:
                    recarga la página.
                </Aviso>
            </div>
        );
    }

    const { propuesta, calculo, remanente } = datos;
    const estado = propuesta?.estado ?? "sin_guardar";
    // Aprobada o declarada: se muestra lo que se aprobó; los cambios van aparte.
    const vigente = propuesta?.foto ?? { lineas: calculo.lineas, totales: calculo.totales };
    const totales = vigente.totales;
    const criticas = calculo.alertas.filter((a) => a.nivel === "critico").length;
    const editable = puedeRegistrar(rol) && (estado === "sin_guardar" || estado === "borrador");
    const mesSiguiente = desplazarMes(periodo, 1);
    const hayDocumentos = datos.documentos.ventas + datos.documentos.compras + datos.documentos.honorarios > 0;
    const remanenteAnterior = vigente.lineas.find((l) => l.clave === "remanente_anterior")?.monto ?? "0";

    return (
        <div className="flex flex-col gap-4">
            {encabezado}

            <Guia titulo="Cómo se arma la propuesta">
                <ReglasGuia reglas={REGLAS} />
            </Guia>

            <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-3">
                    <SelectorDeMes ruta="/dashboard/f29" periodo={periodo} />
                    <Etiqueta tono={ESTADOS[estado].tono}>{ESTADOS[estado].etiqueta}</Etiqueta>
                    {/* En papel no se ve el selector: el mes va escrito. */}
                    <span className="hidden text-[14px] font-semibold capitalize print:inline">{datos.nombre}</span>
                </div>
                <p className="text-[12.5px] text-[var(--foreground-muted)]">
                    Vence el <span className="font-medium text-[var(--foreground)]">{diaDelVencimiento(datos.vencimiento.con_pago_internet)}</span>{" "}
                    pagando por internet · sin pago, el {diaDelVencimiento(datos.vencimiento.sin_pago)}
                </p>
            </div>
            <LineaDelAnio anio={anio} periodo={periodo} propuestas={delAnio} hoy={hoy} />

            {!datos.mes_terminado ? (
                <Aviso tono="aviso">
                    {datos.nombre.charAt(0).toUpperCase() + datos.nombre.slice(1)} todavía no termina: la propuesta puede
                    cambiar con los documentos que faltan. Se declara en {nombreDelMes(mesSiguiente)}.
                </Aviso>
            ) : null}
            {!hayDocumentos ? (
                <Aviso>
                    No hay documentos importados de {datos.nombre}.{" "}
                    <Link href={`/dashboard/documentos?libro=ventas&periodo=${periodo}`} className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                        Importa el RCV y las boletas en Documentos
                    </Link>{" "}
                    para armar la propuesta.
                </Aviso>
            ) : null}
            {estado === "declarada" && propuesta ? (
                <Aviso>
                    <span className="font-medium text-[var(--foreground)]">Declarado en el SII</span> el{" "}
                    {propuesta.fecha_presentacion?.split("-").reverse().join("-")}, folio{" "}
                    <span className="tabular font-medium text-[var(--foreground)]">{propuesta.folio_sii}</span>. Esta propuesta ya
                    no cambia; si hubiera que corregir algo, se hace con una rectificatoria en el SII.
                </Aviso>
            ) : estado === "aprobada" && propuesta ? (
                <Aviso>
                    <span className="font-medium text-[var(--foreground)]">Aprobada el {fechaEnChile(propuesta.aprobada_en)}.</span>{" "}
                    Los montos de abajo son los aprobados. Preséntalo en sii.cl y luego anota aquí el folio.
                </Aviso>
            ) : null}

            <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Indicador titulo="IVA débito fiscal · 538" valor={formatearCLP(totales.debitos)} nota={`${datos.documentos.ventas} ventas del RCV`} />
                <Indicador
                    titulo="IVA crédito fiscal · 537"
                    valor={formatearCLP(totales.creditos)}
                    nota={remanenteAnterior !== "0" ? `Incluye ${formatearCLP(remanenteAnterior)} de remanente` : `${datos.documentos.compras} compras del RCV`}
                />
                {totales.iva_determinado !== "0" ? (
                    <Indicador titulo="IVA a pagar · 89" valor={formatearCLP(totales.iva_determinado)} nota="Débitos menos créditos" />
                ) : (
                    <Indicador
                        titulo="Remanente · 77"
                        valor={formatearCLP(totales.remanente_siguiente)}
                        nota={`Crédito que pasa a ${nombreDelMes(mesSiguiente)}`}
                    />
                )}
                <Indicador
                    titulo="Total a pagar · 91"
                    valor={formatearCLP(totales.total_a_pagar)}
                    nota={
                        totales.retencion_cambio_sujeto && totales.retencion_cambio_sujeto !== "0"
                            ? `Incluye ${formatearCLP(totales.retencion_honorarios)} de honorarios y ${formatearCLP(totales.retencion_cambio_sujeto)} de IVA retenido`
                            : `Incluye ${formatearCLP(totales.retencion_honorarios)} de retención de honorarios`
                    }
                />
            </div>

            <Panel>
                <PanelCabecera
                    titulo="Antes de aprobar"
                    nota={criticas > 0 ? `${criticas} ${criticas === 1 ? "alerta crítica" : "alertas críticas"}` : undefined}
                />
                <div className="mt-3">
                    <ListaAlertas alertas={calculo.alertas} periodo={periodo} />
                </div>
            </Panel>

            {datos.cambios.length > 0 ? (
                <Panel sinRelleno>
                    <div className="px-5 pt-4">
                        <PanelCabecera titulo="Cambios desde la aprobación" nota="Códigos que ya no coinciden con lo aprobado" />
                    </div>
                    <div className="overflow-x-auto pt-2">
                        <TablaCambios cambios={datos.cambios} />
                    </div>
                </Panel>
            ) : null}

            <Panel>
                <PanelCabecera titulo={`Remanente de ${nombreDelMes(desplazarMes(periodo, -1))}`} nota="Código 504" />
                <div className="mt-3">
                    {editable ? (
                        <FormularioRemanente
                            // key: al cambiar de mes o guardar, el formulario parte de lo guardado.
                            key={`${periodo}-${propuesta?.version ?? 0}`}
                            periodo={periodo}
                            periodoAnterior={desplazarMes(periodo, -1)}
                            inicial={{ remanente: remanente.mes_anterior, utmAnterior: remanente.utm_anterior, utmActual: remanente.utm_actual }}
                            sugerido={remanente.sugerido?.monto ?? null}
                            version={propuesta?.version}
                        />
                    ) : (
                        <p className="text-[13px] text-[var(--foreground-muted)]">
                            {remanente.mes_anterior === "0" ? (
                                "Sin remanente del mes anterior."
                            ) : (
                                <>
                                    Remanente de <span className="tabular text-[var(--foreground)]">{formatearCLP(remanente.mes_anterior)}</span>
                                    {remanente.utm_anterior && remanente.utm_actual
                                        ? `, reajustado con UTM ${formatearCLP(remanente.utm_anterior)} → ${formatearCLP(remanente.utm_actual)}`
                                        : ", sin reajuste"}
                                    : entra como <span className="tabular font-medium text-[var(--foreground)]">{formatearCLP(remanente.reajustado)}</span>.
                                </>
                            )}
                            {!puedeRegistrar(rol) ? " Tu rol en esta empresa solo permite consultar." : ""}
                        </p>
                    )}
                </div>
            </Panel>

            <Panel sinRelleno>
                <div className="px-5 pt-4">
                    <PanelCabecera
                        titulo="Propuesta del formulario"
                        nota={propuesta?.foto ? `Montos aprobados el ${fechaEnChile(propuesta.aprobada_en)}` : "Con los documentos de hoy"}
                    />
                </div>
                <div className="overflow-x-auto pt-2">
                    <TablaFormulario lineas={vigente.lineas} totales={totales} periodo={periodo} />
                </div>
            </Panel>

            <Panel sinRelleno>
                <div className="px-5 pt-4">
                    <PanelCabecera titulo="Cruce con la contabilidad" nota="Primero contabilidad, después tributación" />
                    <p className="mt-1 text-[12.5px] text-[var(--foreground-muted)]">
                        El IVA que se declara tiene que estar registrado en el libro mayor del mes. Mientras los documentos no
                        se contabilicen, no va a cuadrar.
                    </p>
                </div>
                <div className="overflow-x-auto pt-2">
                    <Conciliacion conciliacion={datos.conciliacion} />
                </div>
            </Panel>

            {calculo.excluidos.length > 0 ? (
                <Panel>
                    <PanelCabecera titulo="No incluidos en la propuesta" nota={`${calculo.excluidos.length} ${calculo.excluidos.length === 1 ? "documento" : "documentos"}`} />
                    <div className="mt-3">
                        <ListaExcluidos excluidos={calculo.excluidos} />
                    </div>
                </Panel>
            ) : null}

            {puedeRegistrar(rol) && estado !== "declarada" ? (
                <Panel>
                    <PanelCabecera titulo={estado === "aprobada" ? "Declaración" : "Aprobación"} />
                    <div className="mt-3">
                        <AccionesF29
                            periodo={periodo}
                            estado={estado}
                            mesTerminado={datos.mes_terminado}
                            desde={`${mesSiguiente}-01`}
                            criticas={criticas}
                            cambios={datos.cambios.length}
                            version={propuesta?.version}
                            hoy={hoy}
                        />
                    </div>
                </Panel>
            ) : null}
        </div>
    );
}
