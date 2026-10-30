/* ============================================================================
   /dashboard/documentos — libros del SII importados desde archivos.

   El contador descarga del portal del SII, con su propia clave, el CSV del
   Registro de Compras y Ventas (o el de boletas de honorarios) y los DTE de
   los documentos, y los sube aquí. Finova los lee, los guarda y los cruza: el
   RCV contra el DTE de cada documento es la cuadratura.

   Server Component: el libro, el mes, los filtros y el orden van en la URL
   (?libro=compras&periodo=2026-09&cuadratura=difiere), así la vista se puede
   recargar, compartir o volver atrás sin perderla.
   ========================================================================== */

import { cookies } from "next/headers";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import {
    ApiError,
    siiApi,
    tercerosApi,
    type ConteoLibroSii,
    type FiltroLibroSii,
    type ImportacionSii,
    type LibroDocumentos,
    type LibroHonorarios,
    type ResumenSii,
} from "@/lib/api";
import { formatearCLP, hoyEnChile, nombrePeriodo } from "@/lib/formato";
import {
    COOKIE_IMPORTADOR,
    CUADRATURAS,
    IMPORTABLES,
    LIBROS,
    fechaValida,
    hayFiltrosEn,
    libroDe,
    periodoValido,
    rangoInvertido,
    urlLibro,
    type ParametrosLibro,
} from "@/lib/sii";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { Filtros } from "./Filtros";
import { Historial } from "./Historial";
import { ImportadorSii } from "./ImportadorSii";
import { Plegable } from "./Plegable";
import { SelectorMes } from "./SelectorMes";
import { Indicador } from "./partes";
import { TablaDocumentos, TablaHonorarios, type EnlaceTerceros } from "./tablas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documentos tributarios" };

type Parametros = Record<string, string | string[] | undefined>;

const POR_PAGINA = 50;

const REGLAS: readonly string[] = [
    "Finova nunca ve la clave del SII: entras tú al portal, descargas los archivos y los subes aquí.",
    "Para cada mes sube el CSV del Registro de Compras y Ventas (compras y ventas) y, si quieres cuadrarlo, los DTE de los documentos (archivos XML): sueltos, en un sobre EnvioDTE o en un ZIP. Las boletas de honorarios traen su propia fecha.",
    "La cuadratura compara el RCV con el DTE de cada documento. «Cuadra»: están los dos y los montos coinciden. «Difiere»: algún monto no coincide (el RCV conserva sus montos). «Sin DTE»: está en el RCV y falta su DTE. «Solo DTE»: subiste el DTE, pero el RCV no lo trae.",
    "Subir el mismo archivo dos veces no duplica nada; si subes uno corregido, solo se actualiza lo que cambió. Cada documento se identifica por emisor, tipo y folio.",
    "Una línea con un dato inválido (RUT con dígito verificador incorrecto, fecha inexistente, monto ilegible, documento repetido) se rechaza y se informa con su número; las demás sí se guardan.",
    "Las notas de crédito restan en los totales. Las boletas de honorarios anuladas se muestran, pero no suman.",
    "El SII no publica un formato oficial del CSV: las columnas se reconocen por su nombre, no por su posición. La firma digital del DTE no se verifica.",
];

function texto(parametros: Parametros, clave: string): string | undefined {
    const valor = parametros[clave];
    return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

/** Un folio es un número: lo demás no se envía (el backend respondería 400). */
function solodigitos(valor: string | undefined): string | undefined {
    return valor && /^[0-9]{1,12}$/.test(valor) ? valor : undefined;
}

/** Deja pasar solo valores que el backend acepta: un enlace a mano con basura no debe dar un 400. */
function dentro<T extends string>(valor: string | undefined, validos: readonly T[]): T | undefined {
    return validos.find((v) => v === valor);
}

function ChipsDeCuadratura({ conteo, base }: { readonly conteo: ConteoLibroSii; readonly base: ParametrosLibro }) {
    if (conteo.total === 0) return null;
    const chip = (activo: boolean) =>
        `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${
            activo
                ? "border-[var(--accent)] bg-[var(--accent)] text-white"
                : "border-[var(--border-strong)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
        }`;
    return (
        <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por cuadratura">
            <span className="text-[12px] font-medium text-[var(--foreground-muted)]">Cuadratura:</span>
            <Link replace href={urlLibro({ ...base, cuadratura: undefined, pagina: undefined })} className={chip(!base.cuadratura)}>
                Todos <span className="tabular">{conteo.total}</span>
            </Link>
            {CUADRATURAS.map((c) => (
                <Link
                    key={c.id}
                    replace
                    title={c.ayuda}
                    href={urlLibro({ ...base, cuadratura: c.id, pagina: undefined })}
                    aria-current={base.cuadratura === c.id ? "true" : undefined}
                    className={chip(base.cuadratura === c.id)}
                >
                    {c.etiqueta} <span className="tabular">{conteo[c.id]}</span>
                </Link>
            ))}
            {conteo.sin_xml === conteo.total ? (
                <span className="text-[12px] text-[var(--foreground-muted)]">Sube los DTE de este mes para cuadrarlos.</span>
            ) : null}
        </div>
    );
}

function Paginacion({ base, pagina, porPagina, total }: { readonly base: ParametrosLibro; readonly pagina: number; readonly porPagina: number; readonly total: number }) {
    const paginas = Math.max(1, Math.ceil(total / porPagina));
    if (paginas === 1) return null;
    const clase = "rounded-md border border-[var(--border-strong)] px-3 py-1.5 text-[12.5px] font-medium hover:bg-[var(--background-raised)]";
    return (
        <nav aria-label="Páginas del libro" className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3 text-[12.5px] text-[var(--foreground-muted)]">
            <span>
                Página <span className="tabular font-semibold text-[var(--foreground)]">{pagina}</span> de {paginas}
            </span>
            <span className="flex gap-2">
                {pagina > 1 ? <Link className={clase} href={urlLibro({ ...base, pagina: pagina - 1 })}>Anterior</Link> : null}
                {pagina < paginas ? <Link className={clase} href={urlLibro({ ...base, pagina: pagina + 1 })}>Siguiente</Link> : null}
            </span>
        </nav>
    );
}

export default async function DocumentosPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const parametros = await searchParams;
    // Lo último que se eligió en el importador (qué subir y el mes), si lo hay.
    const [tipoGuardado, periodoGuardado] = ((await cookies()).get(COOKIE_IMPORTADOR)?.value ?? "").split("|");

    const libro = libroDe(texto(parametros, "libro"));
    const periodo = periodoValido(texto(parametros, "periodo")) ?? hoyEnChile().slice(0, 7);
    const tipo = Number(texto(parametros, "tipo"));
    const base: ParametrosLibro = {
        libro: libro.id,
        periodo,
        texto: libro.esRcv ? undefined : texto(parametros, "texto"),
        // Solo el RCV tiene los campos separados y las fechas de emisión.
        rut: libro.esRcv ? texto(parametros, "rut") : undefined,
        folio: libro.esRcv ? solodigitos(texto(parametros, "folio")) : undefined,
        nombre: libro.esRcv ? texto(parametros, "nombre") : undefined,
        desde: libro.esRcv ? fechaValida(texto(parametros, "desde")) : undefined,
        hasta: libro.esRcv ? fechaValida(texto(parametros, "hasta")) : undefined,
        tipo: Number.isInteger(tipo) && tipo >= 1 && tipo <= 999 ? String(tipo) : undefined,
        estado: texto(parametros, "estado"),
        cuadratura: dentro(texto(parametros, "cuadratura"), CUADRATURAS.map((c) => c.id)),
        orden: dentro(texto(parametros, "orden"), libro.esRcv ? ["fecha", "folio", "total", "nombre"] : ["fecha", "folio", "bruto", "nombre"]),
        dir: dentro(texto(parametros, "dir"), ["asc", "desc"]),
        pagina: Math.max(1, Math.floor(Number(texto(parametros, "pagina"))) || 1),
    };
    // Un «desde» posterior al «hasta» no devuelve filas: se avisa y no se consulta.
    const invertido = rangoInvertido(base.desde, base.hasta);
    const filtro: FiltroLibroSii = {
        periodo,
        texto: base.texto,
        // En honorarios el estado es vigente o anulada; en el RCV es el del registro.
        ...(libro.esRcv
            ? {
                  tipo_dte: base.tipo ? Number(base.tipo) : undefined,
                  estado_rcv: base.estado,
                  cuadratura: base.cuadratura,
                  rut: base.rut,
                  folio: base.folio,
                  nombre: base.nombre,
                  desde: base.desde,
                  hasta: base.hasta,
              }
            : { estado: base.estado }),
        orden: base.orden,
        dir: base.dir,
        pagina: base.pagina,
        por_pagina: POR_PAGINA,
    };
    const opciones = { token, cache: "no-store" } as const;

    let importaciones: ImportacionSii[] = [];
    let resumen: ResumenSii | null = null;
    let rcv: LibroDocumentos | null = null;
    let honorarios: LibroHonorarios | null = null;
    let terceros: EnlaceTerceros | undefined;
    let errorCarga = false;

    // Solo los datos se piden dentro del try: el linter no admite armar JSX ahi.
    try {
        let registrados;
        [importaciones, resumen, rcv, honorarios, registrados] = await Promise.all([
            siiApi.importaciones(opciones),
            siiApi.resumen(periodo, opciones),
            libro.esRcv && !invertido ? siiApi.documentos(libro.id === "compras" ? "compra" : "venta", filtro, opciones) : null,
            libro.esRcv ? null : siiApi.honorarios(libro.id === "honorarios_recibidas" ? "recibida" : "emitida", filtro, opciones),
            // Para enlazar cada contraparte con su ficha. Si falla, el libro se
            // ve igual, solo que sin esos enlaces.
            tercerosApi.listar(opciones).catch(() => null),
        ]);
        if (registrados) {
            terceros = {
                ids: new Map(registrados.map((t) => [t.rut, t.id_tercero])),
                puedeRegistrar: puedeRegistrar(rol),
            };
        }
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        errorCarga = true;
    }

    const [anio, mes] = periodo.split("-").map(Number);
    const total = rcv?.total ?? honorarios?.total ?? 0;
    const hayFiltros = hayFiltrosEn(base);
    const conteoLibro = resumen && libro.esRcv ? resumen[libro.id as "compras" | "ventas"] : null;
    const cuentaDe = (id: string) => {
        if (!resumen) return null;
        return id === "compras" || id === "ventas" ? resumen[id].total : resumen[id as "honorarios_recibidas" | "honorarios_emitidas"];
    };

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Documentos tributarios"
                descripcion="Importa lo que descargas del portal del SII —compras, ventas, honorarios y los DTE— y revisa cada mes con sus totales y su cuadratura."
            />

            <Guia titulo="Cómo funciona la importación y la cuadratura">
                <ReglasGuia reglas={REGLAS} />
            </Guia>

            {puedeRegistrar(rol) ? (
                // Sin key: el importador conserva lo que elegiste al cambiar de libro o de mes.
                <Plegable titulo="Importar archivos del SII" nota="Revisión previa antes de importar" abiertoInicial>
                    <ImportadorSii
                        tipoInicial={IMPORTABLES.find((i) => i.id === tipoGuardado)?.id ?? libro.id}
                        periodoInicial={periodoValido(periodoGuardado) ?? periodo}
                    />
                </Plegable>
            ) : (
                <Aviso>Tu rol en esta empresa solo permite consultar. Pide a un administrador o contador que importe los archivos.</Aviso>
            )}

            {/* Un solo control de mes (flechas y cuadrícula), y debajo el libro. */}
            <SelectorMes libro={libro.id} periodo={periodo} />

            <nav aria-label="Libro" className="flex flex-wrap gap-1 border-b border-[var(--border-subtle)]">
                {LIBROS.map((l) => {
                    const cuenta = cuentaDe(l.id);
                    const activo = l.id === libro.id;
                    return (
                        <Link
                            key={l.id}
                            replace
                            href={urlLibro({ libro: l.id, periodo })}
                            aria-current={activo ? "page" : undefined}
                            className={`-mb-px flex items-center gap-2 border-b-2 px-3.5 py-2 text-[13.5px] font-medium transition-colors ${
                                activo ? "border-[var(--accent)] text-[var(--foreground)]" : "border-transparent text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                            }`}
                        >
                            {l.corta}
                            {cuenta !== null ? (
                                <span className={`tabular rounded-full px-1.5 py-0.5 text-[11px] ${cuenta > 0 ? "bg-[var(--background-raised)] text-[var(--foreground)]" : "text-[var(--foreground-muted)]"}`}>
                                    {cuenta}
                                </span>
                            ) : null}
                        </Link>
                    );
                })}
            </nav>

            {errorCarga ? (
                <Aviso tono="critico">
                    No pudimos cargar los documentos. Si el servidor estaba inactivo puede tardar unos segundos en despertar:
                    recarga la página.
                </Aviso>
            ) : (
                <>
                    {/* Los totales de TODO el filtro, no solo de la página: viven aquí y no se repiten al pie de la tabla. */}
                    {rcv ? (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                            <Indicador titulo="Neto" valor={formatearCLP(rcv.totales.neto)} />
                            <Indicador titulo="Exento" valor={formatearCLP(rcv.totales.exento)} />
                            <Indicador titulo={libro.id === "compras" ? "IVA crédito fiscal" : "IVA débito fiscal"} valor={formatearCLP(rcv.totales.iva)} />
                            <Indicador titulo="Total" valor={formatearCLP(rcv.totales.total)} nota="Las notas de crédito restan" />
                        </div>
                    ) : honorarios ? (
                        <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
                            <Indicador titulo="Bruto" valor={formatearCLP(honorarios.totales.bruto)} nota="Sin las anuladas" />
                            <Indicador titulo="Retención" valor={formatearCLP(honorarios.totales.retencion)} />
                            <Indicador titulo="Líquido a pagar" valor={formatearCLP(honorarios.totales.liquido)} />
                        </div>
                    ) : null}

                    {conteoLibro ? <ChipsDeCuadratura conteo={conteoLibro} base={base} /> : null}

                    <Filtros base={base} esRcv={libro.esRcv} />

                    {invertido ? (
                        <Aviso tono="aviso">
                            La fecha «desde» ({base.desde}) es posterior a la fecha «hasta» ({base.hasta}). Cambia el rango para ver los
                            documentos.
                        </Aviso>
                    ) : null}

                    <Panel sinRelleno>
                        <div className="px-5 pt-4">
                            {/* El libro y el mes ya están en las pestañas y el selector: aquí solo la cantidad. */}
                            <PanelCabecera
                                titulo={`${total} ${libro.esRcv ? (total === 1 ? "documento" : "documentos") : total === 1 ? "boleta" : "boletas"}`}
                                nota={hayFiltros ? "con los filtros aplicados" : undefined}
                            />
                        </div>
                        {total > 0 ? (
                            <>
                                <div className="overflow-x-auto pt-2">
                                    {rcv ? <TablaDocumentos libro={rcv} base={base} terceros={terceros} /> : null}
                                    {honorarios ? <TablaHonorarios libro={honorarios} base={base} terceros={terceros} /> : null}
                                </div>
                                <Paginacion base={base} pagina={rcv?.pagina ?? honorarios?.pagina ?? 1} porPagina={POR_PAGINA} total={total} />
                            </>
                        ) : (
                            <p className="px-5 py-8 text-[13.5px] text-[var(--foreground-muted)]">
                                {invertido ? (
                                    "Corrige el rango de fechas para ver los documentos."
                                ) : hayFiltros ? (
                                    <>
                                        Ningún documento coincide con esos filtros.{" "}
                                        <Link className="font-medium text-[var(--accent)] underline-offset-4 hover:underline" href={urlLibro({ libro: libro.id, periodo })}>
                                            Quitar filtros
                                        </Link>
                                    </>
                                ) : (
                                    <>
                                        No hay documentos de este libro en {nombrePeriodo(anio, mes)}.
                                        {puedeRegistrar(rol) ? " Importa el archivo desde «Importar archivos del SII», arriba." : ""}
                                    </>
                                )}
                            </p>
                        )}
                    </Panel>
                </>
            )}

            <Plegable titulo="Archivos importados" nota={importaciones.length > 0 ? `los últimos ${importaciones.length}` : undefined}>
                <Historial importaciones={importaciones} />
            </Plegable>
        </div>
    );
}
