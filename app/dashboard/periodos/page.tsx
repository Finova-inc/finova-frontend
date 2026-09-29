/* ============================================================================
   /dashboard/periodos — ejercicio contable y sus doce meses.

   El ejercicio comercial en Chile es el año calendario. Cada mes se abre para
   registrar asientos y se cierra, en orden, cuando ya terminó y está
   declarado; un mes cerrado rechaza asientos aunque cuadren. Cerrar lo puede
   hacer el administrador o el contador; reabrir, solo el administrador y con
   motivo.

   Server Component: el año elegido va en la URL (?anio=2026), así que la
   vista se puede recargar o compartir.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, periodosApi, type PeriodoContable } from "@/lib/api";
import { formatearFechaLarga, hoyEnChile, nombreMesLargo, nombrePeriodo } from "@/lib/formato";
import { ROL, exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { AbrirEjercicio, AccionesPeriodo } from "./AccionesPeriodo";
import { NuevoPeriodoForm } from "./NuevoPeriodoForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Períodos contables" };

type Parametros = Record<string, string | string[] | undefined>;

const REGLAS: readonly string[] = [
    "El ejercicio comercial es el año calendario, del 1 de enero al 31 de diciembre. Ábrelo completo o, si la empresa inició actividades a mitad de año, desde el mes de inicio.",
    "Un asiento solo se registra en un mes abierto. El mes se cierra cuando ya terminó y está declarado, y los meses se cierran en orden.",
    "El F29 de cada mes se presenta hasta el día 20 del mes siguiente si emites documentos tributarios electrónicos (el 12 en los demás casos). Si ese día es inhábil, se corre al siguiente día hábil.",
    "Reabrir un mes cerrado es excepcional: solo un administrador, con un motivo que queda en la auditoría. Si el mes ya se declaró, el cambio obliga a rectificar el F29.",
    "Para corregir un asiento no hace falta reabrir el mes: se registra un asiento de reversión en un mes abierto (Código de Comercio, art. 32).",
];

type EstadoMes = "abierto" | "cerrado" | "sin-abrir";

interface Mes {
    readonly anio: number;
    readonly numero: number;
    readonly periodo: PeriodoContable | null;
    readonly estado: EstadoMes;
    readonly terminado: boolean;
    readonly enCurso: boolean;
    readonly bloqueoCierre: string | null;
}

const dosDigitos = (valor: number) => String(valor).padStart(2, "0");

/** Último día del mes 'YYYY-MM-DD', sin pasar por la zona horaria. */
function ultimoDia(anio: number, mes: number): string {
    return `${anio}-${dosDigitos(mes)}-${dosDigitos(new Date(Date.UTC(anio, mes, 0)).getUTCDate())}`;
}

function esAnterior(a: { anio: number; mes: number }, b: { anio: number; mes: number }): boolean {
    return a.anio < b.anio || (a.anio === b.anio && a.mes < b.mes);
}

/** "20 de octubre": vencimiento del F29 del mes (facturadores electrónicos). */
function vencimientoF29(anio: number, mes: number): string {
    const siguiente = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
    return `20 de ${nombreMesLargo(siguiente.mes)}${siguiente.anio !== anio ? ` ${siguiente.anio}` : ""}`;
}

function texto(parametros: Parametros, clave: string): string | undefined {
    const valor = parametros[clave];
    return typeof valor === "string" ? valor : undefined;
}

function EtiquetaMes({ mes }: { readonly mes: Mes }) {
    if (mes.estado === "cerrado") {
        return (
            <Etiqueta tono="neutro">
                <Icon name="lock" className="mr-1 size-3" />
                Cerrado
            </Etiqueta>
        );
    }
    if (mes.estado === "sin-abrir") return <Etiqueta tono="neutro">Sin abrir</Etiqueta>;
    return mes.terminado ? <Etiqueta tono="aviso">Por cerrar</Etiqueta> : <Etiqueta tono="positivo">Abierto</Etiqueta>;
}

function TarjetaMes({
    mes,
    puede,
    esAdmin,
}: {
    readonly mes: Mes;
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
                <EtiquetaMes mes={mes} />
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
                <p className="text-[12.5px] text-[var(--foreground-muted)]">No admite asientos hasta abrirlo.</p>
            )}

            <div className="mt-auto flex flex-wrap items-end justify-between gap-2 pt-1">
                <AccionesPeriodo
                    idPeriodo={periodo?.id_periodo ?? null}
                    anio={anio}
                    mes={numero}
                    nombre={nombre}
                    estado={mes.estado}
                    bloqueoCierre={mes.bloqueoCierre}
                    borradores={periodo?.cantidad_borradores ?? 0}
                    puedeRegistrar={puede}
                    puedeReabrir={esAdmin}
                />
                {periodo && periodo.cantidad_asientos > 0 ? (
                    <Link
                        href={`/dashboard/core-contable?desde=${anio}-${dosDigitos(numero)}-01&hasta=${ultimoDia(anio, numero)}`}
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

    const pedido = Number(texto(parametros, "anio"));
    const anio = Number.isInteger(pedido) && pedido >= 2000 && pedido <= anioHoy + 1 ? pedido : anioHoy;
    const anios = [...new Set([anioHoy - 1, anioHoy, anioHoy + 1, anio, ...periodos.map((p) => p.anio)])].sort(
        (a, b) => a - b,
    );

    const delAnio = new Map(periodos.filter((p) => p.anio === anio).map((p) => [p.mes, p]));
    const abiertos = periodos.filter((p) => p.estado === "abierto").sort((a, b) => (esAnterior(a, b) ? -1 : 1));

    const meses: Mes[] = Array.from({ length: 12 }, (_, indice) => {
        const numero = indice + 1;
        const periodo = delAnio.get(numero) ?? null;
        const terminado = ultimoDia(anio, numero) < hoy;
        const enCurso = anio === anioHoy && numero === mesHoy;
        const anteriorAbierto = abiertos.find((p) => esAnterior(p, { anio, mes: numero }));
        return {
            anio,
            numero,
            periodo,
            estado: periodo ? (periodo.estado === "cerrado" ? "cerrado" : "abierto") : "sin-abrir",
            terminado,
            enCurso,
            bloqueoCierre: !terminado
                ? enCurso
                    ? "Se cierra al terminar el mes."
                    : "Todavía no termina."
                : anteriorAbierto
                  ? `Cierra primero ${nombrePeriodo(anteriorAbierto.anio, anteriorAbierto.mes)}.`
                  : null,
        };
    });

    const cuenta = (estado: EstadoMes, terminado?: boolean) =>
        meses.filter((m) => m.estado === estado && (terminado === undefined || m.terminado === terminado)).length;
    // Hasta el día 20 vence el F29 del mes anterior; después, el del mes en curso.
    const f29 = diaHoy <= 20 ? (mesHoy === 1 ? { anio: anioHoy - 1, mes: 12 } : { anio: anioHoy, mes: mesHoy - 1 }) : { anio: anioHoy, mes: mesHoy };

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Períodos contables"
                descripcion="El ejercicio contable es el año calendario. Cada mes se abre para registrar asientos y se cierra, en orden, cuando ya está declarado. Un mes cerrado rechaza asientos aunque cuadren."
            />

            <Guia titulo="Cómo funciona el cierre mensual">
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
                        <nav aria-label="Ejercicio contable" className="inline-flex rounded-lg border border-[var(--border-strong)] p-0.5">
                            {anios.map((opcion) => (
                                <Link
                                    key={opcion}
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
                            {delAnio.size > 0 ? (
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
                            ) : null}
                            F29 de {nombreMesLargo(f29.mes)}: hasta el {vencimientoF29(f29.anio, f29.mes)}
                        </p>
                    </div>

                    {delAnio.size === 0 ? (
                        <Panel>
                            <PanelCabecera titulo={`El ejercicio ${anio} no está abierto`} />
                            <p className="mt-2 max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                                Abre los doce meses del año de una vez: quedan listos para registrar asientos y se van
                                cerrando en orden a medida que declaras cada F29. Si la empresa inició actividades a mitad
                                de año, abre solo desde el mes de inicio.
                            </p>
                            {puede ? (
                                <div className="mt-4 flex flex-col gap-5 border-t border-[var(--border-subtle)] pt-4 lg:flex-row lg:items-end lg:gap-10">
                                    <AbrirEjercicio anio={anio} />
                                    <div className="flex flex-col gap-2">
                                        <p className="text-[12.5px] text-[var(--foreground-muted)]">O un mes suelto:</p>
                                        <NuevoPeriodoForm anio={anio} mes={anio === anioHoy ? mesHoy : 1} />
                                    </div>
                                </div>
                            ) : (
                                <p className="mt-3 text-[13px] text-[var(--foreground-muted)]">
                                    Pide a un administrador o contador de la empresa que abra el ejercicio.
                                </p>
                            )}
                        </Panel>
                    ) : (
                        <ol aria-label={`Meses del ejercicio ${anio}`} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4">
                            {meses.map((mes) => (
                                <TarjetaMes key={mes.numero} mes={mes} puede={puede} esAdmin={esAdmin} />
                            ))}
                        </ol>
                    )}
                </>
            )}
        </div>
    );
}
