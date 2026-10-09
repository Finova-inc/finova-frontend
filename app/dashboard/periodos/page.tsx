/* ============================================================================
   /dashboard/periodos — ejercicio contable y sus doce meses.

   El ejercicio comercial en Chile es el año calendario. Los meses se abren de
   a uno: el que se va a trabajar, nunca uno que todavía no comienza (un
   asiento no admite fecha futura, así que no podría recibir nada). En un año
   anterior, abrir un mes se llama "cargar": es historia que se registra
   después de ocurrida.

   Cada mes abierto recibe asientos y se cierra, en orden, cuando ya terminó y
   está declarado; un mes cerrado rechaza asientos aunque cuadren. Cerrar lo
   puede hacer el administrador o el contador; reabrir, solo el administrador
   y con motivo.

   Server Component: el año elegido va en la URL (?anio=2026), así que la
   vista se puede recargar o compartir. Las reglas de calendario viven en
   lib/periodos.ts, con sus pruebas.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, periodosApi, type PeriodoContable } from "@/lib/api";
import { formatearFechaLarga, hoyEnChile, nombreMesLargo, nombrePeriodo } from "@/lib/formato";
import { aniosDelSelector, mesesDelEjercicio, ultimoDiaDelMes, type MesDelEjercicio } from "@/lib/periodos";
import { ROL, exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { AccionesPeriodo } from "./AccionesPeriodo";
import { SelectorPeriodo } from "./SelectorPeriodo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Períodos contables" };

type Parametros = Record<string, string | string[] | undefined>;

const REGLAS: readonly string[] = [
    "El ejercicio comercial es el año calendario, del 1 de enero al 31 de diciembre. Los meses se abren de a uno: abre el mes en curso para registrar sus operaciones y carga los meses anteriores que necesites trabajar.",
    "Un mes que todavía no comienza no se puede abrir. Los asientos no admiten fecha futura, porque solo se registran operaciones ya ocurridas (Código de Comercio, art. 27).",
    "Un asiento solo se registra en un mes abierto. El mes se cierra cuando ya terminó y está declarado, y los meses se cierran en orden.",
    "Cargar un mes anterior a meses ya cerrados cambia los saldos con que esos meses parten. La pantalla lo advierte antes de cargarlo.",
    "El F29 de cada mes se presenta el mes siguiente: hasta el día 20 si emites documentos tributarios electrónicos y declaras y pagas por internet, hasta el 12 en los demás casos con pago, y hasta el 28 si declaras sin pago por internet. Si el día cae en sábado o feriado, pasa al siguiente día hábil.",
    "Reabrir un mes cerrado es excepcional: solo un administrador, con un motivo que queda en la auditoría. Si el mes ya se declaró, el cambio obliga a rectificar el F29.",
    "Para corregir un asiento no hace falta reabrir el mes: se registra un asiento de reversión en un mes abierto (Código de Comercio, art. 32).",
];

type Mes = MesDelEjercicio<PeriodoContable>;

const dosDigitos = (valor: number) => String(valor).padStart(2, "0");

/** "20 de octubre": vencimiento del F29 del mes (facturadores electrónicos). */
function vencimientoF29(anio: number, mes: number): string {
    const siguiente = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
    return `20 de ${nombreMesLargo(siguiente.mes)}${siguiente.anio !== anio ? ` ${siguiente.anio}` : ""}`;
}

/** "1 de noviembre", con el año solo si no es el actual: cuándo comienza un mes futuro. */
function primerDia(anio: number, mes: number, anioHoy: number): string {
    return `1 de ${nombreMesLargo(mes)}${anio !== anioHoy ? ` de ${anio}` : ""}`;
}

/** Por qué un mes abierto todavía no se puede cerrar, o null si ya se puede. */
function bloqueoDeCierre(mes: Mes): string | null {
    if (mes.futuro) return "Todavía no comienza.";
    if (!mes.terminado) return "Se cierra al terminar el mes.";
    if (mes.anteriorAbierto) {
        return `Cierra primero ${nombrePeriodo(mes.anteriorAbierto.anio, mes.anteriorAbierto.mes)}.`;
    }
    return null;
}

/** "enero 2026": el mes cerrado más antiguo posterior a este, o null. */
function cerradoPosterior(mes: Mes): string | null {
    return mes.cerradoPosterior ? nombrePeriodo(mes.cerradoPosterior.anio, mes.cerradoPosterior.mes) : null;
}

function texto(parametros: Parametros, clave: string): string | undefined {
    const valor = parametros[clave];
    return typeof valor === "string" ? valor : undefined;
}

function EtiquetaMes({ mes, esHistoria }: { readonly mes: Mes; readonly esHistoria: boolean }) {
    if (mes.estado === "cerrado") {
        return (
            <Etiqueta tono="neutro">
                <Icon name="lock" className="mr-1 size-3" />
                Cerrado
            </Etiqueta>
        );
    }
    if (mes.estado === "sin-abrir") {
        return (
            <Etiqueta tono="neutro">{mes.futuro ? "Aún no comienza" : esHistoria ? "Sin cargar" : "Sin abrir"}</Etiqueta>
        );
    }
    // Abierto antes de que existiera la regla de no abrir el futuro: el
    // período se respeta, pero se distingue de un mes que ya recibe asientos.
    if (mes.futuro) return <Etiqueta tono="neutro">Abierto por anticipado</Etiqueta>;
    return mes.terminado ? <Etiqueta tono="aviso">Por cerrar</Etiqueta> : <Etiqueta tono="positivo">Abierto</Etiqueta>;
}

function TarjetaMes({
    mes,
    esHistoria,
    anioHoy,
    puede,
    esAdmin,
}: {
    readonly mes: Mes;
    /** Año anterior al actual: sus meses se "cargan" en vez de "abrirse". */
    readonly esHistoria: boolean;
    readonly anioHoy: number;
    readonly puede: boolean;
    readonly esAdmin: boolean;
}) {
    const { anio, numero, periodo } = mes;
    const nombre = nombrePeriodo(anio, numero);
    const sinAbrir = mes.estado === "sin-abrir";
    // Color del borde: el mes en curso manda; un mes sin abrir es un hueco punteado.
    const borde = mes.enCurso
        ? "border-[var(--accent)]"
        : sinAbrir
          ? "border-[var(--border-strong)]"
          : "border-[var(--border-subtle)]";

    return (
        <li
            className={`flex min-h-44 flex-col gap-3 rounded-xl border p-4 ${borde} ${
                sinAbrir ? "border-dashed" : "bg-[var(--surface)] shadow-[0_1px_2px_rgb(20_17_15_/_0.04)]"
            }`}
        >
            <div className="flex items-start justify-between gap-2">
                <div>
                    <h3 className="font-display text-[15px] font-semibold capitalize">{nombreMesLargo(numero)}</h3>
                    {mes.enCurso ? <p className="text-[11.5px] font-medium text-[var(--accent)]">Mes en curso</p> : null}
                </div>
                <EtiquetaMes mes={mes} esHistoria={esHistoria} />
            </div>

            {periodo ? (
                <div className="flex flex-col gap-1 text-[12.5px] text-[var(--foreground-muted)]">
                    <p>
                        <span className="tabular font-semibold text-[var(--foreground)]">{periodo.cantidad_asientos}</span>{" "}
                        {periodo.cantidad_asientos === 1 ? "asiento" : "asientos"}
                        {periodo.cantidad_borradores > 0 ? (
                            <>
                                {" · "}
                                <span className="tabular font-semibold text-[var(--foreground)]">
                                    {periodo.cantidad_borradores}
                                </span>{" "}
                                {periodo.cantidad_borradores === 1 ? "borrador" : "borradores"}
                            </>
                        ) : null}
                    </p>
                    {mes.futuro && mes.estado === "abierto" ? (
                        <p>Admitirá asientos desde el {primerDia(anio, numero, anioHoy)}.</p>
                    ) : null}
                    <p>F29 hasta el {vencimientoF29(anio, numero)}</p>
                    {mes.estado === "cerrado" && periodo.cerrado_at ? (
                        <p>Cerrado el {formatearFechaLarga(periodo.cerrado_at)}</p>
                    ) : periodo.motivo_reapertura ? (
                        <p className="line-clamp-2" title={periodo.motivo_reapertura}>
                            Reabierto: {periodo.motivo_reapertura}
                        </p>
                    ) : null}
                </div>
            ) : (
                <p className="text-[12.5px] text-[var(--foreground-muted)]">
                    {mes.futuro
                        ? "Todavía no comienza."
                        : esHistoria
                          ? "No admite asientos hasta cargarlo."
                          : "No admite asientos hasta abrirlo."}
                </p>
            )}

            <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
                <AccionesPeriodo
                    idPeriodo={periodo?.id_periodo ?? null}
                    anio={anio}
                    mes={numero}
                    nombre={nombre}
                    estado={mes.estado}
                    bloqueoCierre={bloqueoDeCierre(mes)}
                    borradores={periodo?.cantidad_borradores ?? 0}
                    futuro={mes.futuro}
                    disponibleDesde={primerDia(anio, numero, anioHoy)}
                    esHistoria={esHistoria}
                    cerradoPosterior={cerradoPosterior(mes)}
                    puedeRegistrar={puede}
                    puedeReabrir={esAdmin}
                />
                {periodo && periodo.cantidad_asientos > 0 ? (
                    <Link
                        href={`/dashboard/core-contable?desde=${anio}-${dosDigitos(numero)}-01&hasta=${ultimoDiaDelMes(anio, numero)}`}
                        className="inline-flex items-center gap-1 py-2 text-[12.5px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                    >
                        Ver asientos
                        <Icon name="arrowRight" className="size-3.5" />
                    </Link>
                ) : null}
            </div>
        </li>
    );
}

export default async function PeriodosPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const parametros = await searchParams;
    const hoy = hoyEnChile();
    const [anioHoy, mesHoy, diaHoy] = hoy.split("-").map(Number);
    const puede = puedeRegistrar(rol);
    const esAdmin = rol === ROL.ADMINISTRADOR;

    let periodos: PeriodoContable[] = [];
    let errorCarga = false;
    try {
        periodos = await periodosApi.listar({ token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        errorCarga = true;
    }

    const { anio, anios, anterior } = aniosDelSelector(Number(texto(parametros, "anio")), periodos, hoy);
    // Un año anterior no se "abre": se carga, mes a mes, la historia que falte.
    const esHistoria = anio < anioHoy;
    const meses = mesesDelEjercicio(anio, periodos, hoy);
    const sinPeriodos = meses.every((mes) => mes.periodo === null);

    const cuenta = (estado: Mes["estado"], terminado?: boolean) =>
        meses.filter((m) => m.estado === estado && (terminado === undefined || m.terminado === terminado)).length;
    // Hasta el día 20 vence el F29 del mes anterior; después, el del mes en curso.
    const f29 = diaHoy <= 20 ? (mesHoy === 1 ? { anio: anioHoy - 1, mes: 12 } : { anio: anioHoy, mes: mesHoy - 1 }) : { anio: anioHoy, mes: mesHoy };

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Períodos contables"
                descripcion="El ejercicio contable es el año calendario. Cada mes se abre para registrar asientos y se cierra, en orden, cuando ya está declarado. Un mes cerrado rechaza asientos aunque cuadren."
            />

            <Guia titulo="Cómo funcionan los períodos y el cierre mensual">
                <ReglasGuia reglas={REGLAS} />
            </Guia>

            {errorCarga ? (
                <Aviso tono="critico">
                    No pudimos cargar los períodos. Si el servidor estaba inactivo puede tardar unos segundos en
                    despertar: recarga la página.
                </Aviso>
            ) : (
                <>
                    <div className="flex flex-wrap items-center justify-between gap-3">
                        {/* `replace`: cambiar de año es mirar otra pestaña de la misma
                            pantalla, no ir a otra. Así "Volver" (y la flecha del
                            navegador) salen de Períodos de un paso, en vez de
                            recorrer uno a uno los años visitados. */}
                        <nav
                            aria-label="Ejercicio contable"
                            className="inline-flex flex-wrap items-center rounded-lg border border-[var(--border-strong)] p-0.5"
                        >
                            {anterior !== null ? (
                                <Link
                                    replace
                                    href={`/dashboard/periodos?anio=${anterior}`}
                                    aria-label={`Ver el ejercicio ${anterior}`}
                                    title={`Ejercicio ${anterior}`}
                                    className="rounded-md px-1.5 py-1.5 text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                                >
                                    <Icon name="chevron" className="size-4 rotate-180" />
                                </Link>
                            ) : null}
                            {anios.map((opcion) => (
                                <Link
                                    key={opcion}
                                    replace
                                    href={`/dashboard/periodos?anio=${opcion}`}
                                    aria-current={opcion === anio ? "page" : undefined}
                                    className={`tabular rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors ${
                                        opcion === anio
                                            ? "bg-[var(--accent)] text-white"
                                            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                                    }`}
                                >
                                    {opcion}
                                </Link>
                            ))}
                        </nav>
                        <p className="text-[12.5px] text-[var(--foreground-muted)]">
                            {sinPeriodos ? null : (
                                <>
                                    <span className="tabular font-semibold text-[var(--foreground)]">{cuenta("abierto")}</span> abiertos
                                    {" · "}
                                    <span className="tabular font-semibold text-[var(--foreground)]">{cuenta("cerrado")}</span> cerrados
                                    {cuenta("abierto", true) > 0 ? (
                                        <>
                                            {" · "}
                                            <span className="tabular font-semibold text-[var(--aviso)]">{cuenta("abierto", true)}</span> por cerrar
                                        </>
                                    ) : null}
                                    {" · "}
                                </>
                            )}
                            F29 de {nombreMesLargo(f29.mes)}: hasta el {vencimientoF29(f29.anio, f29.mes)}
                        </p>
                    </div>

                    {sinPeriodos ? (
                        <Panel>
                            <PanelCabecera
                                titulo={
                                    esHistoria
                                        ? `El ejercicio ${anio} no tiene períodos cargados`
                                        : `El ejercicio ${anio} no tiene períodos abiertos`
                                }
                            />
                            <p className="mt-2 max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                                {esHistoria
                                    ? "Carga solo los meses que vas a trabajar. Cada uno queda abierto para registrar sus asientos y después se cierra, en orden; los que no cargues siguen sin admitir asientos."
                                    : "Abre el mes que vas a trabajar. Los meses se abren de a uno y a medida que comienzan: uno que todavía no empieza no se puede abrir, porque no se registran operaciones con fecha futura."}
                            </p>
                            {puede ? (
                                <div className="mt-4 border-t border-[var(--border-subtle)] pt-4">
                                    {/* key: al cambiar de año el selector parte plegado. */}
                                    <SelectorPeriodo
                                        key={anio}
                                        anio={anio}
                                        esHistoria={esHistoria}
                                        meses={meses
                                            .filter((mes) => !mes.futuro)
                                            .map((mes) => ({ numero: mes.numero, cerradoPosterior: cerradoPosterior(mes) }))}
                                    />
                                </div>
                            ) : (
                                <p className="mt-3 text-[13px] text-[var(--foreground-muted)]">
                                    Pide a un administrador o contador de la empresa que {esHistoria ? "cargue" : "abra"} el
                                    período.
                                </p>
                            )}
                        </Panel>
                    ) : (
                        <ol aria-label={`Meses del ejercicio ${anio}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {meses.map((mes) => (
                                // La clave lleva el año: al cambiar de pestaña cada tarjeta
                                // parte de cero, sin heredar una confirmación a medio hacer.
                                <TarjetaMes
                                    key={`${anio}-${mes.numero}`}
                                    mes={mes}
                                    esHistoria={esHistoria}
                                    anioHoy={anioHoy}
                                    puede={puede}
                                    esAdmin={esAdmin}
                                />
                            ))}
                        </ol>
                    )}
                </>
            )}
        </div>
    );
}
