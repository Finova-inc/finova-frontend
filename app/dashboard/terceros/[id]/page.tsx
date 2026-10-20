/* ============================================================================
   /dashboard/terceros/[id] — ficha de un tercero.

   Responde "qué negocios tengo con él": sus documentos del SII (como
   proveedor o como cliente), sus boletas de honorarios y las líneas de
   asientos donde aparece, con los totales. Los documentos del SII se enlazan
   por RUT, así que aparecen aunque se hayan importado antes de registrarlo.

   Si es una persona natural, su historial de compras y ventas revela su
   situación socioeconómica (dato sensible en Chile): el backend registra cada
   consulta de esta ficha en la auditoría.
   ========================================================================== */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import type { ReactNode } from "react";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, tercerosApi, type ActividadTercero, type Tercero } from "@/lib/api";
import { formatearCLP, formatearComprobante, formatearFechaContable, formatearFechaLarga } from "@/lib/formato";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { nombreTipoDte } from "@/lib/sii";
import { nombreRoles } from "@/lib/terceros";
import { Aviso, CLASES_TH, Encabezado } from "../../core-contable/partes";
import { AccionesTercero } from "../AccionesTercero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Tercero" };

type Parametros = Record<string, string | string[] | undefined>;

/** Notas de crédito: restan en los totales, igual que en Documentos. */
const NOTAS_DE_CREDITO = new Set([60, 61, 112]);

const CELDA = "px-4 py-2.5";
const NUMERO = `tabular ${CELDA} text-right`;

function Cifra({ titulo, valor, detalle }: { readonly titulo: string; readonly valor: ReactNode; readonly detalle?: ReactNode }) {
    return (
        <div className="flex flex-col gap-1">
            <span className="text-[11px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">{titulo}</span>
            <span className="tabular font-display text-lg font-semibold">{valor}</span>
            {detalle ? <span className="text-[12px] text-[var(--foreground-muted)]">{detalle}</span> : null}
        </div>
    );
}

function NotaLimite({ mostradas, total, limite }: { readonly mostradas: number; readonly total: number; readonly limite: number }) {
    return mostradas >= limite && total > mostradas ? (
        <p className="px-4 py-2.5 text-[12px] text-[var(--foreground-muted)]">
            Se muestran los {limite} más recientes de {total}; los totales suman todos.
        </p>
    ) : null;
}

export default async function TerceroPage({
    params,
    searchParams,
}: {
    params: Promise<{ id: string }>;
    searchParams: Promise<Parametros>;
}) {
    const { id } = await params;
    const aviso = await searchParams;
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const opciones = { token, cache: "no-store" as const };

    let tercero: Tercero;
    let actividad: ActividadTercero | null = null;
    try {
        [tercero, actividad] = await Promise.all([
            tercerosApi.obtener(id, opciones),
            tercerosApi.actividad(id, opciones).catch(() => null),
        ]);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        // 404 también para un tercero de otra empresa: el backend no confirma
        // que exista. 400: el id no es un uuid.
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
        throw error;
    }

    const esNatural = tercero.tipo_persona === "N";
    const totalesDocs = actividad?.totales_documentos;
    const cantidadDocumentos = (totalesDocs?.compras.cantidad ?? 0) + (totalesDocs?.ventas.cantidad ?? 0);
    // Las mismas fuentes que revisa el backend para dejar el RUT fijo.
    const tieneHistoria =
        actividad === null ||
        actividad.documentos.length > 0 ||
        actividad.honorarios.length > 0 ||
        actividad.totales_movimientos.cantidad > 0 ||
        actividad.documentos_manuales > 0;

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo={tercero.razon_social}
                volverA="/dashboard/terceros"
                descripcion={
                    <span className="flex flex-wrap items-center gap-x-2 gap-y-1">
                        <span className="tabular">RUT {tercero.rut}</span>
                        <span aria-hidden>·</span>
                        <span>{esNatural ? "Persona natural" : "Persona jurídica"}</span>
                        <span aria-hidden>·</span>
                        <span>{nombreRoles(tercero)}</span>
                        <span aria-hidden>·</span>
                        <span>Registrado el {formatearFechaLarga(tercero.created_at)}</span>
                    </span>
                }
                acciones={
                    <span className="flex flex-wrap gap-1">
                        {tercero.es_proveedor ? <Etiqueta tono="neutro">Proveedor</Etiqueta> : null}
                        {tercero.es_cliente ? <Etiqueta tono="neutro">Cliente</Etiqueta> : null}
                        <Etiqueta tono={tercero.is_active ? "positivo" : "aviso"}>{tercero.is_active ? "Activo" : "Inactivo"}</Etiqueta>
                    </span>
                }
            />

            {aviso.registrado ? <Aviso>Tercero registrado. Sus documentos del SII ya aparecen aquí, enlazados por su RUT.</Aviso> : null}
            {aviso.recuperado ? (
                <Aviso tono="aviso">
                    Ese RUT era de un tercero dado de baja: se recuperó con los datos nuevos y conserva toda su historia.
                </Aviso>
            ) : null}
            {!tercero.is_active ? (
                <Aviso tono="aviso">
                    Desactivado: no se ofrece al registrar asientos nuevos. Su historia se conserva y se reactiva con un clic.
                </Aviso>
            ) : null}

            <AccionesTercero tercero={tercero} rutBloqueado={tieneHistoria} puedeRegistrar={puedeRegistrar(rol)} />

            {actividad === null ? (
                <Aviso tono="critico">
                    No pudimos cargar sus documentos ni sus asientos. Si el servidor estaba inactivo puede tardar unos
                    segundos en despertar: recarga la página.
                </Aviso>
            ) : (
                <>
                    <Panel>
                        <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
                            <Cifra
                                titulo="Compras"
                                valor={formatearCLP(actividad.totales_documentos.compras.total)}
                                detalle={`${actividad.totales_documentos.compras.cantidad} documentos · IVA ${formatearCLP(actividad.totales_documentos.compras.iva)}`}
                            />
                            <Cifra
                                titulo="Ventas"
                                valor={formatearCLP(actividad.totales_documentos.ventas.total)}
                                detalle={`${actividad.totales_documentos.ventas.cantidad} documentos · IVA ${formatearCLP(actividad.totales_documentos.ventas.iva)}`}
                            />
                            <Cifra
                                titulo="Honorarios"
                                valor={formatearCLP(actividad.totales_honorarios.bruto)}
                                detalle={`${actividad.totales_honorarios.cantidad} boletas vigentes · retención ${formatearCLP(actividad.totales_honorarios.retencion)}`}
                            />
                            <Cifra
                                titulo="En asientos"
                                valor={`${actividad.totales_movimientos.cantidad} líneas`}
                                detalle={`Debe ${formatearCLP(actividad.totales_movimientos.debe)} · Haber ${formatearCLP(actividad.totales_movimientos.haber)}`}
                            />
                        </div>
                        <p className="mt-4 border-t border-[var(--border-subtle)] pt-3 text-[12px] text-[var(--foreground-muted)]">
                            Totales de los documentos importados del SII; las notas de crédito restan.
                            {actividad.documentos_manuales > 0
                                ? ` Además tiene ${actividad.documentos_manuales} documentos del registro manual.`
                                : ""}
                        </p>
                    </Panel>

                    <Panel sinRelleno>
                        <div className="px-5 pt-5 pb-3">
                            <PanelCabecera titulo="Documentos del SII" nota={`${cantidadDocumentos} en total`} />
                        </div>
                        {actividad.documentos.length === 0 ? (
                            <p className="px-5 pb-5 text-[13px] text-[var(--foreground-muted)]">
                                No hay documentos importados del SII con su RUT.{" "}
                                <Link href="/dashboard/documentos" className="text-[var(--accent)] underline-offset-4 hover:underline">
                                    Ir a Documentos
                                </Link>
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[760px] border-collapse text-left text-[13px]">
                                    <thead className="border-y border-[var(--border-subtle)]">
                                        <tr>
                                            <th scope="col" className={CLASES_TH}>Fecha</th>
                                            <th scope="col" className={CLASES_TH}>Documento</th>
                                            <th scope="col" className={CLASES_TH}>Operación</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>Neto</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>IVA</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>Total</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {actividad.documentos.map((d) => {
                                            const nota = NOTAS_DE_CREDITO.has(d.tipo_dte);
                                            return (
                                                <tr key={d.id_documento_sii} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--background-raised)]">
                                                    <td className={`tabular whitespace-nowrap ${CELDA}`}>{formatearFechaContable(d.fecha_emision)}</td>
                                                    <td className={CELDA}>
                                                        <Link
                                                            href={`/dashboard/documentos/${d.id_documento_sii}`}
                                                            className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                                                        >
                                                            N° {d.folio}
                                                        </Link>
                                                        <p className="text-[11.5px] text-[var(--foreground-muted)]">{nombreTipoDte(d.tipo_dte)}</p>
                                                    </td>
                                                    <td className={CELDA}>
                                                        <span className="flex flex-wrap gap-1">
                                                            <Etiqueta tono="neutro">{d.sentido === "compra" ? "Compra" : "Venta"}</Etiqueta>
                                                            {nota ? <Etiqueta tono="aviso">Resta</Etiqueta> : null}
                                                        </span>
                                                    </td>
                                                    <td className={NUMERO}>{formatearCLP(d.monto_neto)}</td>
                                                    <td className={NUMERO}>{formatearCLP(d.monto_iva)}</td>
                                                    <td className={`${NUMERO} font-medium`}>{formatearCLP(d.monto_total)}</td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                                <NotaLimite mostradas={actividad.documentos.length} total={cantidadDocumentos} limite={actividad.limite} />
                            </div>
                        )}
                    </Panel>

                    {actividad.honorarios.length > 0 ? (
                        <Panel sinRelleno>
                            <div className="px-5 pt-5 pb-3">
                                <PanelCabecera titulo="Boletas de honorarios" nota={`${actividad.totales_honorarios.cantidad} vigentes`} />
                            </div>
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[680px] border-collapse text-left text-[13px]">
                                    <thead className="border-y border-[var(--border-subtle)]">
                                        <tr>
                                            <th scope="col" className={CLASES_TH}>Fecha</th>
                                            <th scope="col" className={CLASES_TH}>N° boleta</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>Bruto</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>Retención</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>Líquido</th>
                                            <th scope="col" className={CLASES_TH}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {actividad.honorarios.map((h) => {
                                            const anulada = h.estado === "anulada";
                                            return (
                                                <tr
                                                    key={h.id_honorario_sii}
                                                    className={`border-b border-[var(--border-subtle)] last:border-0 ${anulada ? "text-[var(--foreground-muted)]" : ""}`}
                                                >
                                                    <td className={`tabular whitespace-nowrap ${CELDA}`}>{formatearFechaContable(h.fecha_emision)}</td>
                                                    <td className={`tabular ${CELDA}`}>
                                                        N° {h.folio}
                                                        <p className="text-[11.5px] text-[var(--foreground-muted)]">
                                                            {h.sentido === "recibida" ? "Recibida" : "Emitida"}
                                                        </p>
                                                    </td>
                                                    <td className={`${NUMERO} ${anulada ? "line-through" : ""}`}>{formatearCLP(h.monto_bruto)}</td>
                                                    <td className={`${NUMERO} ${anulada ? "line-through" : ""}`}>{formatearCLP(h.retencion)}</td>
                                                    <td className={`${NUMERO} font-medium ${anulada ? "line-through" : ""}`}>{formatearCLP(h.monto_liquido)}</td>
                                                    <td className={CELDA}>
                                                        <Etiqueta tono={anulada ? "neutro" : "positivo"}>{anulada ? "Anulada" : "Vigente"}</Etiqueta>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    ) : null}

                    <Panel sinRelleno>
                        <div className="px-5 pt-5 pb-3">
                            <PanelCabecera titulo="Asientos contables" nota={`${actividad.totales_movimientos.cantidad} líneas`} />
                        </div>
                        {actividad.movimientos.length === 0 ? (
                            <p className="px-5 pb-5 text-[13px] text-[var(--foreground-muted)]">
                                Todavía no aparece en ningún asiento. Al registrar un asiento, elígelo en la columna
                                Tercero de cada línea.
                            </p>
                        ) : (
                            <div className="overflow-x-auto">
                                <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
                                    <thead className="border-y border-[var(--border-subtle)]">
                                        <tr>
                                            <th scope="col" className={CLASES_TH}>Fecha</th>
                                            <th scope="col" className={CLASES_TH}>Comprobante</th>
                                            <th scope="col" className={CLASES_TH}>Cuenta</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>Debe</th>
                                            <th scope="col" className={`${CLASES_TH} text-right`}>Haber</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {actividad.movimientos.map((m, indice) => (
                                            <tr key={`${m.id_asiento}-${indice}`} className="border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--background-raised)]">
                                                <td className={`tabular whitespace-nowrap ${CELDA}`}>{formatearFechaContable(m.fecha_contable)}</td>
                                                <td className={`max-w-[260px] ${CELDA}`}>
                                                    <Link
                                                        href={`/dashboard/core-contable/${m.id_asiento}`}
                                                        className="tabular font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                                                    >
                                                        {formatearComprobante(m.tipo_comprobante, m.numero, m.anio)}
                                                    </Link>
                                                    <p className="truncate text-[11.5px] text-[var(--foreground-muted)]" title={m.glosa}>
                                                        {m.glosa}
                                                    </p>
                                                </td>
                                                <td className={CELDA}>
                                                    <span className="tabular">{m.codigo_cuenta}</span> {m.nombre_cuenta}
                                                </td>
                                                <td className={NUMERO}>{Number(m.debe) > 0 ? formatearCLP(m.debe) : ""}</td>
                                                <td className={NUMERO}>{Number(m.haber) > 0 ? formatearCLP(m.haber) : ""}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                                <NotaLimite
                                    mostradas={actividad.movimientos.length}
                                    total={actividad.totales_movimientos.cantidad}
                                    limite={actividad.limite}
                                />
                            </div>
                        )}
                    </Panel>

                    {esNatural ? (
                        <p className="text-[12px] text-[var(--foreground-muted)]">
                            Persona natural: esta ficha contiene datos personales (Ley 21.719). Cada consulta queda
                            registrada en la auditoría, y sus datos se pueden exportar con el botón de arriba.
                        </p>
                    ) : null}
                </>
            )}
        </div>
    );
}
