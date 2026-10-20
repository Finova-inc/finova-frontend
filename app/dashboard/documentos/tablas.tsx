import Link from "next/link";
import { Etiqueta } from "@/components/ui/Etiqueta";
import type { LibroDocumentos, LibroHonorarios } from "@/lib/api";
import { formatearCLP, formatearFechaContable } from "@/lib/formato";
import { nombreTipoDte, type ParametrosLibro } from "@/lib/sii";
import { urlRegistrar } from "@/lib/terceros";
import { CLASES_TH } from "../core-contable/partes";
import { EtiquetaCuadratura, ThOrdenable } from "./partes";

const TONO_ESTADO_RCV: Record<string, "positivo" | "aviso" | "critico"> = {
    confirmada: "positivo",
    registro: "positivo",
    pendiente: "aviso",
    reclamado: "critico",
};

const CELDA = "px-4 py-2.5";
const NUMERO = `tabular ${CELDA} text-right`;

/** Qué contrapartes ya son terceros, para enlazarlas con su ficha. */
export interface EnlaceTerceros {
    /** RUT -> id_tercero de los terceros registrados (sin los dados de baja). */
    readonly ids: ReadonlyMap<string, string>;
    /** Administrador o contador: ve "Registrar" junto a las contrapartes sin registrar. */
    readonly puedeRegistrar: boolean;
}

/**
 * Nombre y RUT de la contraparte. Si ya es un tercero, el nombre lleva a su
 * ficha; si no, "Registrar" abre el formulario con sus datos propuestos. No
 * se registra sola: el RUT de una persona natural es un dato personal.
 */
function Contraparte({
    nombre,
    rut,
    comoProveedor,
    terceros,
}: {
    readonly nombre: string | null;
    readonly rut: string;
    /** En una compra o una boleta recibida la contraparte es proveedor; si no, cliente. */
    readonly comoProveedor: boolean;
    readonly terceros?: EnlaceTerceros;
}) {
    const idTercero = terceros?.ids.get(rut);
    return (
        <>
            {idTercero ? (
                <Link
                    href={`/dashboard/terceros/${idTercero}`}
                    className="block truncate underline-offset-4 hover:underline"
                    title={nombre ?? undefined}
                >
                    {nombre ?? "—"}
                </Link>
            ) : (
                <p className="truncate" title={nombre ?? undefined}>
                    {nombre ?? "—"}
                </p>
            )}
            <p className="tabular whitespace-nowrap text-[11.5px] text-[var(--foreground-muted)]">
                {rut}
                {!idTercero && terceros?.puedeRegistrar ? (
                    <>
                        {" · "}
                        <Link
                            href={urlRegistrar({ rut, nombre, comoProveedor, comoCliente: !comoProveedor })}
                            className="font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                        >
                            Registrar
                        </Link>
                    </>
                ) : null}
            </p>
        </>
    );
}

/** Libro de compras o ventas: una fila por documento, con su cuadratura. */
export function TablaDocumentos({
    libro,
    base,
    terceros,
}: {
    readonly libro: LibroDocumentos;
    readonly base: ParametrosLibro;
    readonly terceros?: EnlaceTerceros;
}) {
    const esCompra = base.libro === "compras";
    return (
        <table className="w-full min-w-[960px] border-collapse text-left text-[13px]">
            <thead className="border-b border-[var(--border-subtle)]">
                <tr>
                    <ThOrdenable campo="fecha" etiqueta="Fecha" base={base} />
                    <ThOrdenable campo="folio" etiqueta="Documento" base={base} primero="asc" />
                    <ThOrdenable campo="nombre" etiqueta={esCompra ? "Proveedor" : "Cliente"} base={base} primero="asc" />
                    <th scope="col" className={`${CLASES_TH} text-right`}>Exento</th>
                    <th scope="col" className={`${CLASES_TH} text-right`}>Neto</th>
                    <th scope="col" className={`${CLASES_TH} text-right`}>IVA</th>
                    <ThOrdenable campo="total" etiqueta="Total" base={base} derecha />
                    <th scope="col" className={CLASES_TH}>Estado</th>
                </tr>
            </thead>
            <tbody>
                {libro.datos.map((d) => (
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
                        <td className={`max-w-[280px] ${CELDA}`}>
                            <Contraparte
                                nombre={d.razon_social_contraparte}
                                rut={esCompra ? d.rut_emisor : d.rut_receptor}
                                comoProveedor={esCompra}
                                terceros={terceros}
                            />
                        </td>
                        <td className={NUMERO}>{formatearCLP(d.monto_exento)}</td>
                        <td className={NUMERO}>{formatearCLP(d.monto_neto)}</td>
                        <td className={NUMERO}>{formatearCLP(d.monto_iva)}</td>
                        <td className={`${NUMERO} font-medium`}>{formatearCLP(d.monto_total)}</td>
                        <td className={CELDA}>
                            <span className="flex flex-wrap items-center gap-1">
                                <EtiquetaCuadratura estado={d.cuadratura} />
                                {d.estado_rcv ? (
                                    <Etiqueta tono={TONO_ESTADO_RCV[d.estado_rcv.toLowerCase()] ?? "neutro"}>{d.estado_rcv}</Etiqueta>
                                ) : null}
                                {d.advertencias.length > 0 ? (
                                    <span title={d.advertencias.join("\n")}>
                                        <Etiqueta tono="aviso">Revisar</Etiqueta>
                                    </span>
                                ) : null}
                            </span>
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/** Boletas de honorarios recibidas o emitidas. */
export function TablaHonorarios({
    libro,
    base,
    terceros,
}: {
    readonly libro: LibroHonorarios;
    readonly base: ParametrosLibro;
    readonly terceros?: EnlaceTerceros;
}) {
    const recibida = base.libro === "honorarios_recibidas";
    return (
        <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
            <thead className="border-b border-[var(--border-subtle)]">
                <tr>
                    <ThOrdenable campo="fecha" etiqueta="Fecha" base={base} />
                    <ThOrdenable campo="folio" etiqueta="N° boleta" base={base} primero="asc" />
                    <ThOrdenable campo="nombre" etiqueta={recibida ? "Profesional" : "Cliente"} base={base} primero="asc" />
                    <ThOrdenable campo="bruto" etiqueta="Bruto" base={base} derecha />
                    <th scope="col" className={`${CLASES_TH} text-right`}>Retención</th>
                    <th scope="col" className={`${CLASES_TH} text-right`}>Líquido</th>
                    <th scope="col" className={CLASES_TH}>Estado</th>
                </tr>
            </thead>
            <tbody>
                {libro.datos.map((h) => {
                    const anulada = h.estado === "anulada";
                    return (
                        <tr
                            key={h.id_honorario_sii}
                            className={`border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--background-raised)] ${anulada ? "text-[var(--foreground-muted)]" : ""}`}
                        >
                            <td className={`tabular whitespace-nowrap ${CELDA}`}>{formatearFechaContable(h.fecha_emision)}</td>
                            <td className={`tabular ${CELDA} font-medium`}>N° {h.folio}</td>
                            <td className={`max-w-[280px] ${CELDA}`}>
                                <Contraparte
                                    nombre={h.nombre_contraparte}
                                    rut={recibida ? h.rut_emisor : h.rut_receptor}
                                    comoProveedor={recibida}
                                    terceros={terceros}
                                />
                            </td>
                            <td className={`${NUMERO} ${anulada ? "line-through" : ""}`}>{formatearCLP(h.monto_bruto)}</td>
                            <td className={`${NUMERO} ${anulada ? "line-through" : ""}`}>{formatearCLP(h.retencion)}</td>
                            <td className={`${NUMERO} font-medium ${anulada ? "line-through" : ""}`}>{formatearCLP(h.monto_liquido)}</td>
                            <td className={CELDA}>
                                <span className="flex flex-wrap items-center gap-1">
                                    <Etiqueta tono={anulada ? "neutro" : "positivo"}>{anulada ? "Anulada" : "Vigente"}</Etiqueta>
                                    {h.advertencias.length > 0 ? (
                                        <span title={h.advertencias.join("\n")}>
                                            <Etiqueta tono="aviso">Revisar</Etiqueta>
                                        </span>
                                    ) : null}
                                </span>
                            </td>
                        </tr>
                    );
                })}
            </tbody>
        </table>
    );
}
