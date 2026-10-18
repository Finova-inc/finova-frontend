/* ============================================================================
   /dashboard/documentos/[id] — un documento del SII.

   Muestra sus datos, la cuadratura (lo que dice el RCV contra lo que dice su
   DTE, monto por monto) y las líneas de detalle del DTE. Es solo lectura: un
   documento del SII no se edita aquí; si hay una diferencia, se corrige en el
   origen y se vuelve a importar el archivo.
   ========================================================================== */

import { redirect } from "next/navigation";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, siiApi, type DetalleDocumentoSii } from "@/lib/api";
import { formatearCLP, formatearFechaContable, formatearFechaLarga, nombrePeriodo } from "@/lib/formato";
import { diferencia, nombreTipoDte } from "@/lib/sii";
import { exigirTokenSesion } from "@/lib/session";
import { Aviso, CLASES_TH, Encabezado } from "../../core-contable/partes";
import { EtiquetaCuadratura } from "../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Documento del SII" };

const FILAS_MONTOS = [
    ["Neto", "monto_neto"],
    ["Exento", "monto_exento"],
    ["IVA", "monto_iva"],
    ["Total", "monto_total"],
] as const;

function Dato({ titulo, children }: { readonly titulo: string; readonly children: React.ReactNode }) {
    return (
        <div>
            <dt className="text-[11.5px] font-medium text-[var(--foreground-muted)]">{titulo}</dt>
            <dd className="mt-0.5 text-[13.5px]">{children}</dd>
        </div>
    );
}

const TEXTO_FIRMA = {
    si: "Firma verificada",
    no: "No trae firma digital",
    no_verificada: "Trae firma digital; Finova no la verifica",
} as const;

/** "−$12.000" / "+$12.000": el signo antes del peso, no dentro (Intl lo deja como "$-12.000"). */
function conSigno(monto: string): string {
    const negativo = monto.startsWith("-");
    return `${negativo ? "−" : "+"}${formatearCLP(negativo ? monto.slice(1) : monto)}`;
}

function Cuadratura({ detalle }: { readonly detalle: DetalleDocumentoSii }) {
    const { documento: d, xml } = detalle;
    if (!xml) {
        return (
            <p className="text-[13.5px] text-[var(--foreground-muted)]">
                Todavía no se importó el DTE de este documento, así que no se puede cuadrar. Súbelo desde la pantalla de
                documentos, suelto, en un sobre EnvioDTE o dentro de un ZIP.
            </p>
        );
    }
    return (
        <div className="overflow-x-auto">
            {!d.en_rcv ? (
                <p className="mb-3 text-[13px] text-[var(--foreground-muted)]">
                    Este documento no figura en el RCV: los montos son los del DTE. Cuando importes el RCV del mes se comparará.
                </p>
            ) : null}
            <table className="w-full min-w-[480px] border-collapse text-left text-[13px]">
                <thead className="border-b border-[var(--border-subtle)]">
                    <tr>
                        <th scope="col" className={CLASES_TH}>Monto</th>
                        <th scope="col" className={`${CLASES_TH} text-right`}>RCV</th>
                        <th scope="col" className={`${CLASES_TH} text-right`}>DTE</th>
                        <th scope="col" className={`${CLASES_TH} text-right`} title="RCV menos DTE">Diferencia</th>
                    </tr>
                </thead>
                <tbody>
                    {FILAS_MONTOS.map(([titulo, campo]) => {
                        const resta = d.en_rcv ? diferencia(d[campo], xml[campo]) : null;
                        return (
                            <tr key={campo} className="border-b border-[var(--border-subtle)] last:border-0">
                                <td className="px-4 py-2.5 font-medium">{titulo}</td>
                                <td className="tabular px-4 py-2.5 text-right">{d.en_rcv ? formatearCLP(d[campo]) : "—"}</td>
                                <td className="tabular px-4 py-2.5 text-right">{formatearCLP(xml[campo])}</td>
                                <td className={`tabular px-4 py-2.5 text-right font-medium ${resta && resta !== "0" ? "text-[var(--critico)]" : "text-[var(--foreground-muted)]"}`}>
                                    {resta === null ? "—" : resta === "0" ? "Sin diferencia" : conSigno(resta)}
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default async function DocumentoSiiPage({ params }: { params: Promise<{ id: string }> }) {
    const token = await exigirTokenSesion();
    const { id } = await params;

    let detalle: DetalleDocumentoSii | null = null;
    let errorCarga = false;
    let noExiste = false;
    try {
        detalle = await siiApi.documento(id, { token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError) {
            if (error.status === 401) redirect("/login");
            // Un id mal formado o de otra empresa es lo mismo que uno que no existe.
            noExiste = error.status === 404 || error.status === 400;
        }
        errorCarga = !noExiste;
    }

    if (noExiste) {
        return (
            <div className="flex flex-col gap-4">
                <Encabezado titulo="No encontramos ese documento" volverA="/dashboard/documentos" />
                <Aviso>Ese documento no existe o no es de esta empresa. Vuelve al listado y elígelo desde ahí.</Aviso>
            </div>
        );
    }

    if (errorCarga || !detalle) {
        return (
            <div className="flex flex-col gap-4">
                <Encabezado titulo="Documento del SII" volverA="/dashboard/documentos" />
                <Aviso tono="critico">No pudimos cargar el documento. Recarga la página en unos segundos.</Aviso>
            </div>
        );
    }

    const { documento: d, xml, lineas } = detalle;
    const esCompra = d.sentido === "compra";
    const advertencias = [...d.advertencias, ...(xml?.validacion.advertencias ?? [])];
    const [anioRcv, mesRcv] = (d.periodo_rcv ?? d.fecha_emision.slice(0, 7)).split("-").map(Number);

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo={`${nombreTipoDte(d.tipo_dte)} N° ${d.folio}`}
                volverA="/dashboard/documentos"
                descripcion={
                    <span className="flex flex-wrap items-center gap-2">
                        {esCompra ? "Compra" : "Venta"} de {d.razon_social_contraparte ?? (esCompra ? d.rut_emisor : d.rut_receptor)}
                        <EtiquetaCuadratura estado={d.cuadratura} />
                    </span>
                }
            />

            <Panel>
                <PanelCabecera titulo="Datos del documento" />
                <dl className="mt-4 grid grid-cols-2 gap-x-6 gap-y-4 md:grid-cols-4">
                    <Dato titulo="Emisor"><span className="tabular">{d.rut_emisor}</span></Dato>
                    <Dato titulo="Receptor"><span className="tabular">{d.rut_receptor}</span></Dato>
                    <Dato titulo="Fecha de emisión">{formatearFechaContable(d.fecha_emision)}</Dato>
                    <Dato titulo="Mes del libro">{nombrePeriodo(anioRcv, mesRcv)}</Dato>
                    <Dato titulo="En el RCV">{d.en_rcv ? `Sí${d.estado_rcv ? ` · ${d.estado_rcv}` : ""}` : "No figura"}</Dato>
                    <Dato titulo="DTE">{xml ? `Sí · subido el ${formatearFechaLarga(xml.created_at)}` : "No se ha subido"}</Dato>
                    <Dato titulo="Firma del DTE">{xml ? TEXTO_FIRMA[xml.firma_verificada] : "—"}</Dato>
                </dl>
            </Panel>

            <Panel>
                <PanelCabecera titulo="Cuadratura: RCV contra DTE" />
                <div className="mt-4">
                    <Cuadratura detalle={detalle} />
                </div>
            </Panel>

            {xml ? (
                <Panel sinRelleno>
                    <div className="px-5 pt-4">
                        <PanelCabecera titulo="Líneas del documento" nota="según el DTE" />
                    </div>
                    {lineas.length > 0 ? (
                        <div className="overflow-x-auto pt-2">
                            <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                                <thead className="border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th scope="col" className={`${CLASES_TH} text-right`}>N°</th>
                                        <th scope="col" className={CLASES_TH}>Descripción</th>
                                        <th scope="col" className={`${CLASES_TH} text-right`}>Cantidad</th>
                                        <th scope="col" className={`${CLASES_TH} text-right`}>Precio</th>
                                        <th scope="col" className={`${CLASES_TH} text-right`}>Monto</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {lineas.map((l) => (
                                        <tr key={l.linea} className="border-b border-[var(--border-subtle)] last:border-0">
                                            <td className="tabular px-4 py-2.5 text-right text-[var(--foreground-muted)]">{l.linea}</td>
                                            <td className="px-4 py-2.5">{l.nombre || "—"}</td>
                                            <td className="tabular px-4 py-2.5 text-right">{l.cantidad ?? "—"}</td>
                                            <td className="tabular px-4 py-2.5 text-right">{l.precio ? formatearCLP(l.precio) : "—"}</td>
                                            <td className="tabular px-4 py-2.5 text-right font-medium">{formatearCLP(l.monto)}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    ) : (
                        <p className="px-5 py-6 text-[13px] text-[var(--foreground-muted)]">El DTE no trae líneas de detalle.</p>
                    )}
                </Panel>
            ) : null}

            {advertencias.length > 0 ? (
                <Aviso tono="aviso">
                    <p className="font-medium">Advertencias al leer este documento</p>
                    <ul className="mt-1.5 list-disc pl-5">
                        {advertencias.map((a) => (
                            <li key={a}>{a}</li>
                        ))}
                    </ul>
                </Aviso>
            ) : null}
        </div>
    );
}
