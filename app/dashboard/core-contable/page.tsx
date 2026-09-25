/* ============================================================================
   /dashboard/core-contable — Libro diario.

   Dos vistas de los mismos comprobantes:
   - Comprobantes: listado paginado con filtros, para encontrar un asiento.
   - Libro diario: el libro tal como lo exige el art. 27 del Codigo de
     Comercio, "por orden cronologico y dia por dia", con el resumen diario del
     formato de libros electronicos del SII. Es la vista que se imprime.

   Server Component: la cookie de sesion es httpOnly y solo se lee aqui. Los
   filtros son un <form method="get">: funcionan sin JavaScript y quedan en la
   URL, asi que un filtro se puede compartir o recargar.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import {
    ApiError,
    asientosApi,
    borradoresApi,
    cuentasApi,
    periodosApi,
    type AsientoBorrador,
    type AsientoListado,
    type LibroDiario,
    type Paginado,
    type TipoComprobante,
} from "@/lib/api";
import {
    NOMBRE_TIPO_COMPROBANTE,
    formatearCLP,
    formatearComprobante,
    formatearFechaContable,
    formatearFechaLarga,
    formatearRut,
    hoyEnChile,
    nombrePeriodo,
} from "@/lib/formato";
import { tieneMonto } from "@/lib/decimal";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { BotonImprimir } from "./BotonImprimir";
import { Aviso, CLASES_TH, EnlaceAccion, Encabezado, EtiquetasDeEstado } from "./partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Libro diario" };

type Parametros = Record<string, string | string[] | undefined>;

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const TIPOS: readonly TipoComprobante[] = ["I", "E", "T"];
const RUTA = "/dashboard/core-contable";

const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)]";

function texto(parametros: Parametros, clave: string): string | undefined {
    const valor = parametros[clave];
    return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

/** Arma una URL del libro conservando los filtros vigentes. */
function urlCon(parametros: Parametros, cambios: Record<string, string | number | undefined>): string {
    const url = new URLSearchParams();
    for (const [clave, valor] of Object.entries({ ...parametros, ...cambios })) {
        if (typeof valor === "string" || typeof valor === "number") {
            if (String(valor) !== "") url.set(clave, String(valor));
        }
    }
    const consulta = url.toString();
    return consulta ? `${RUTA}?${consulta}` : RUTA;
}

export default async function LibroDiarioPage({
    searchParams,
}: {
    searchParams: Promise<Parametros>;
}) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const parametros = await searchParams;

    const vista = texto(parametros, "vista") === "libro" ? "libro" : "comprobantes";
    const hoy = hoyEnChile();
    const [anioHoy, mesHoy] = hoy.split("-").map(Number);
    const inicioDelMes = `${hoy.slice(0, 8)}01`;

    const desde = texto(parametros, "desde");
    const hasta = texto(parametros, "hasta");
    const tipo = texto(parametros, "tipo");
    const filtros = {
        desde: desde && PATRON_FECHA.test(desde) ? desde : undefined,
        hasta: hasta && PATRON_FECHA.test(hasta) ? hasta : undefined,
        tipo: TIPOS.includes(tipo as TipoComprobante) ? (tipo as TipoComprobante) : undefined,
        texto: texto(parametros, "texto")?.slice(0, 100),
        pagina: Math.max(1, Number.parseInt(texto(parametros, "pagina") ?? "1", 10) || 1),
    };
    // El libro siempre pide un rango: por defecto, el mes en curso.
    const rangoLibro = { desde: filtros.desde ?? inicioDelMes, hasta: filtros.hasta ?? hoy };

    const opciones = { token, cache: "no-store" } as const;
    const [cuentas, periodos, borradores, listado, libro] = await Promise.allSettled([
        cuentasApi.listar(opciones),
        periodosApi.listar(opciones),
        borradoresApi.listar(opciones),
        vista === "comprobantes" ? asientosApi.listar(filtros, opciones) : Promise.resolve(null),
        vista === "libro"
            ? asientosApi.libroDiario(rangoLibro.desde, rangoLibro.hasta, opciones)
            : Promise.resolve(null),
    ]);

    const resultados = [cuentas, periodos, borradores, listado, libro];
    if (resultados.some((r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401)) {
        redirect("/login");
    }

    const principal = vista === "libro" ? libro : listado;
    const errorPrincipal =
        principal.status === "rejected"
            ? principal.reason instanceof ApiError && principal.reason.status === 400
                ? "Revisa el rango de fechas: el libro diario se consulta en rangos de hasta un año."
                : "No pudimos cargar el libro diario. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la página."
            : null;

    const puede = puedeRegistrar(rol);
    const hayCuentas = cuentas.status === "fulfilled" && cuentas.value.some((c) => c.is_active);
    const periodoActual =
        periodos.status === "fulfilled"
            ? periodos.value.find((p) => p.anio === anioHoy && p.mes === mesHoy) ?? null
            : undefined;
    const listaBorradores = borradores.status === "fulfilled" ? borradores.value : [];

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Libro diario"
                descripcion="Comprobantes contables de la empresa por orden cronológico y día por día (art. 27 del Código de Comercio). Un asiento contabilizado no se modifica ni se elimina: se corrige con una reversión."
                acciones={
                    puede && hayCuentas ? (
                        <EnlaceAccion href={`${RUTA}/nuevo`}>
                            <Icon name="plus" className="size-4" />
                            Nuevo asiento
                        </EnlaceAccion>
                    ) : undefined
                }
            />

            {cuentas.status === "fulfilled" && !hayCuentas ? (
                <Aviso tono="aviso">
                    <p className="font-medium">Primero, el plan de cuentas.</p>
                    <p className="mt-1">
                        La empresa todavía no tiene cuentas activas, así que no hay a qué imputar un asiento.
                    </p>
                    <div className="mt-3">
                        <EnlaceAccion href="/dashboard/plan-cuentas">Ir al plan de cuentas</EnlaceAccion>
                    </div>
                </Aviso>
            ) : null}

            {periodoActual === null ? (
                <Aviso tono="aviso">
                    <span className="capitalize">{nombrePeriodo(anioHoy, mesHoy)}</span> no tiene un período
                    abierto: no se pueden registrar asientos con fecha de este mes.{" "}
                    <Link href="/dashboard/periodos" className="font-medium underline underline-offset-4">
                        Abrir el período
                    </Link>
                </Aviso>
            ) : periodoActual?.estado === "cerrado" ? (
                <Aviso tono="neutro">
                    <Icon name="lock" className="mr-1.5 inline size-4 align-[-2px]" />
                    El período de <span className="capitalize">{nombrePeriodo(anioHoy, mesHoy)}</span> está
                    cerrado y no admite asientos.
                </Aviso>
            ) : null}

            <nav aria-label="Vistas del libro" className="no-imprimir flex gap-1 border-b border-[var(--border-subtle)]">
                {(["comprobantes", "libro"] as const).map((opcion) => (
                    <Link
                        key={opcion}
                        href={urlCon({}, { vista: opcion === "libro" ? "libro" : undefined })}
                        aria-current={vista === opcion ? "page" : undefined}
                        className={`-mb-px border-b-2 px-3 py-2 text-[13px] font-medium ${
                            vista === opcion
                                ? "border-[var(--accent)] text-[var(--foreground)]"
                                : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                        }`}
                    >
                        {opcion === "libro" ? "Libro diario" : "Comprobantes"}
                    </Link>
                ))}
            </nav>

            <form method="get" action={RUTA} className="no-imprimir flex flex-wrap items-end gap-3">
                {vista === "libro" ? <input type="hidden" name="vista" value="libro" /> : null}
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Desde
                    <input
                        type="date"
                        name="desde"
                        defaultValue={vista === "libro" ? rangoLibro.desde : filtros.desde}
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Hasta
                    <input
                        type="date"
                        name="hasta"
                        defaultValue={vista === "libro" ? rangoLibro.hasta : filtros.hasta}
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                </label>
                {vista === "comprobantes" ? (
                    <>
                        <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                            Tipo
                            <select name="tipo" defaultValue={filtros.tipo ?? ""} className={CLASES_CAMPO}>
                                <option value="">Todos</option>
                                {TIPOS.map((t) => (
                                    <option key={t} value={t}>
                                        {NOMBRE_TIPO_COMPROBANTE[t]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="flex min-w-48 flex-1 flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                            Glosa
                            <input
                                type="search"
                                name="texto"
                                defaultValue={filtros.texto}
                                placeholder="Buscar en la glosa…"
                                className={CLASES_CAMPO}
                            />
                        </label>
                    </>
                ) : null}
                <button
                    type="submit"
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium hover:bg-[var(--background-raised)]"
                >
                    Filtrar
                </button>
                <Link
                    href={urlCon({}, { vista: vista === "libro" ? "libro" : undefined })}
                    className="py-1.5 text-[13px] text-[var(--foreground-muted)] underline-offset-4 hover:underline"
                >
                    Limpiar
                </Link>
                {vista === "libro" ? (
                    <div className="ml-auto">
                        <BotonImprimir texto="Imprimir libro" />
                    </div>
                ) : null}
            </form>

            {errorPrincipal ? (
                <Aviso tono="critico">{errorPrincipal}</Aviso>
            ) : vista === "comprobantes" && listado.status === "fulfilled" && listado.value ? (
                <TablaComprobantes pagina={listado.value} parametros={parametros} />
            ) : vista === "libro" && libro.status === "fulfilled" && libro.value ? (
                <VistaLibro libro={libro.value} />
            ) : null}

            {listaBorradores.length > 0 ? <ListaBorradores borradores={listaBorradores} /> : null}
        </div>
    );
}

function TablaComprobantes({
    pagina,
    parametros,
}: {
    readonly pagina: Paginado<AsientoListado>;
    readonly parametros: Parametros;
}) {
    if (pagina.total === 0) {
        return (
            <Aviso>
                No hay comprobantes con estos filtros. Los asientos aparecen aquí al contabilizarlos.
            </Aviso>
        );
    }

    const primero = (pagina.pagina - 1) * pagina.por_pagina + 1;
    const ultimo = primero + pagina.items.length - 1;
    const hayAnterior = pagina.pagina > 1;
    const haySiguiente = ultimo < pagina.total;

    return (
        <Panel sinRelleno>
            <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                    <thead className="border-b border-[var(--border-subtle)]">
                        <tr>
                            <th scope="col" className={CLASES_TH}>N°</th>
                            <th scope="col" className={CLASES_TH}>Fecha</th>
                            <th scope="col" className={CLASES_TH}>Tipo</th>
                            <th scope="col" className={CLASES_TH}>Glosa</th>
                            <th scope="col" className={`${CLASES_TH} text-right`}>Valor</th>
                            <th scope="col" className={CLASES_TH}>Estado</th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagina.items.map((asiento) => (
                            <tr key={asiento.id_asiento} className="border-b border-[var(--border-subtle)] last:border-0">
                                <td className="px-4 py-2.5">
                                    <Link
                                        href={`${RUTA}/${asiento.id_asiento}`}
                                        className="tabular font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                                    >
                                        {formatearComprobante(asiento.tipo_comprobante, asiento.numero, asiento.anio)}
                                    </Link>
                                </td>
                                <td className="tabular px-4 py-2.5">{formatearFechaContable(asiento.fecha_contable)}</td>
                                <td className="px-4 py-2.5 text-[var(--foreground-muted)]">
                                    {NOMBRE_TIPO_COMPROBANTE[asiento.tipo_comprobante]}
                                </td>
                                <td className="max-w-[340px] truncate px-4 py-2.5" title={asiento.glosa}>
                                    {asiento.glosa}
                                </td>
                                <td className="tabular px-4 py-2.5 text-right">{formatearCLP(asiento.valor_comprobante)}</td>
                                <td className="px-4 py-2.5">
                                    <EtiquetasDeEstado asiento={asiento} revertidoPor={asiento.revertido_por} />
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="no-imprimir flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3 text-[12.5px] text-[var(--foreground-muted)]">
                <span className="tabular">
                    {primero}–{ultimo} de {pagina.total}
                </span>
                <span className="flex gap-3">
                    {hayAnterior ? (
                        <Link href={urlCon(parametros, { pagina: pagina.pagina - 1 })} className="font-medium text-[var(--foreground)] hover:underline">
                            Anterior
                        </Link>
                    ) : null}
                    {haySiguiente ? (
                        <Link href={urlCon(parametros, { pagina: pagina.pagina + 1 })} className="font-medium text-[var(--foreground)] hover:underline">
                            Siguiente
                        </Link>
                    ) : null}
                </span>
            </div>
        </Panel>
    );
}

/**
 * El libro diario: cada dia con su resumen (comprobantes, movimientos y suma,
 * como el "Resumen Diario" del formato LCE del SII) y cada comprobante con
 * sus lineas.
 */
function VistaLibro({ libro }: { readonly libro: LibroDiario }) {
    const periodoImpreso = `${formatearFechaContable(libro.desde)} al ${formatearFechaContable(libro.hasta)}`;

    if (libro.dias.length === 0) {
        return <Aviso>No hay comprobantes entre el {periodoImpreso}.</Aviso>;
    }

    return (
        <Panel sinRelleno>
            <div className="px-4 pt-4">
                <PanelCabecera titulo={`Libro diario del ${periodoImpreso}`} nota="Montos en pesos chilenos" />
            </div>
            <div className="overflow-x-auto pt-2">
                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                    <thead className="border-b border-[var(--border-subtle)]">
                        <tr>
                            <th scope="col" className={CLASES_TH}>Cuenta</th>
                            <th scope="col" className={CLASES_TH}>Detalle</th>
                            <th scope="col" className={CLASES_TH}>RUT</th>
                            <th scope="col" className={`${CLASES_TH} text-right`}>Debe</th>
                            <th scope="col" className={`${CLASES_TH} text-right`}>Haber</th>
                        </tr>
                    </thead>
                    {libro.dias.map((dia) => (
                        <tbody key={dia.fecha} className="break-inside-avoid-page">
                            <tr className="bg-[var(--background-raised)]">
                                <th scope="rowgroup" colSpan={5} className="px-4 py-2 text-[12.5px] font-semibold">
                                    <span className="tabular">{formatearFechaContable(dia.fecha)}</span>
                                    <span className="ml-3 font-normal text-[var(--foreground-muted)]">
                                        {dia.cantidad_comprobantes}{" "}
                                        {dia.cantidad_comprobantes === 1 ? "comprobante" : "comprobantes"} ·{" "}
                                        {dia.cantidad_movimientos} movimientos · {formatearCLP(dia.suma_valor)}
                                    </span>
                                </th>
                            </tr>
                            {dia.comprobantes.map((comprobante) => (
                                <FilasComprobante key={comprobante.id_asiento} comprobante={comprobante} />
                            ))}
                        </tbody>
                    ))}
                    <tfoot>
                        <tr>
                            <td colSpan={3} className="border-t-2 border-[var(--border-strong)] px-4 py-3 font-bold">
                                Totales · {libro.totales.cantidad_comprobantes} comprobantes ·{" "}
                                {libro.totales.cantidad_movimientos} movimientos
                            </td>
                            <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                {formatearCLP(libro.totales.total_debe)}
                            </td>
                            <td className="tabular border-t-2 border-[var(--border-strong)] px-4 py-3 text-right font-bold">
                                {formatearCLP(libro.totales.total_haber)}
                            </td>
                        </tr>
                    </tfoot>
                </table>
            </div>
        </Panel>
    );
}

function FilasComprobante({ comprobante }: { readonly comprobante: LibroDiario["dias"][number]["comprobantes"][number] }) {
    return (
        <>
            <tr>
                <td colSpan={5} className="px-4 pt-3 pb-1 text-[12.5px]">
                    <Link
                        href={`${RUTA}/${comprobante.id_asiento}`}
                        className="tabular font-semibold text-[var(--accent)] underline-offset-4 hover:underline"
                    >
                        {formatearComprobante(comprobante.tipo_comprobante, comprobante.numero, comprobante.anio)}
                    </Link>
                    <span className="ml-2 text-[var(--foreground-muted)]">{comprobante.glosa}</span>
                </td>
            </tr>
            {comprobante.movimientos.map((movimiento) => (
                <tr key={movimiento.id_movimiento} className="align-top">
                    <td className="py-1 pl-8 pr-4">
                        <span className="tabular">{movimiento.cuenta?.codigo}</span>{" "}
                        <span className="text-[var(--foreground-muted)]">{movimiento.cuenta?.nombre}</span>
                    </td>
                    <td className="px-4 py-1 text-[var(--foreground-muted)]">{movimiento.glosa ?? ""}</td>
                    <td className="tabular px-4 py-1 text-[var(--foreground-muted)]">
                        {movimiento.tercero ? formatearRut(movimiento.tercero.rut) : ""}
                    </td>
                    <td className="tabular px-4 py-1 text-right">
                        {tieneMonto(movimiento.debe) ? formatearCLP(movimiento.debe) : ""}
                    </td>
                    <td className="tabular px-4 py-1 text-right">
                        {tieneMonto(movimiento.haber) ? formatearCLP(movimiento.haber) : ""}
                    </td>
                </tr>
            ))}
        </>
    );
}

function ListaBorradores({ borradores }: { readonly borradores: readonly AsientoBorrador[] }) {
    return (
        <Panel sinRelleno className="no-imprimir">
            <div className="px-4 pt-4">
                <PanelCabecera
                    titulo={`Borradores (${borradores.length})`}
                    nota="No forman parte del libro ni tienen número hasta contabilizarse"
                />
            </div>
            <ul className="mt-2 divide-y divide-[var(--border-subtle)]">
                {borradores.map((borrador) => (
                    <li key={borrador.id_borrador} className="flex flex-wrap items-center justify-between gap-2 px-4 py-2.5 text-[13px]">
                        <span className="min-w-0">
                            <span className="font-medium">{borrador.glosa || "(sin glosa)"}</span>
                            <span className="ml-2 text-[var(--foreground-muted)]">
                                {borrador.fecha_contable ? formatearFechaContable(borrador.fecha_contable) : "sin fecha"}{" "}
                                · {borrador.lineas.length} {borrador.lineas.length === 1 ? "línea" : "líneas"} · editado{" "}
                                {formatearFechaLarga(borrador.updated_at)}
                            </span>
                        </span>
                        <Link
                            href={`${RUTA}/borradores/${borrador.id_borrador}`}
                            className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                        >
                            Continuar
                        </Link>
                    </li>
                ))}
            </ul>
        </Panel>
    );
}
