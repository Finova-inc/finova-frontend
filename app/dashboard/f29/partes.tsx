import type { ReactNode } from "react";
import Link from "next/link";
import { Etiqueta } from "@/components/ui/Etiqueta";
import type { AlertaF29, CambioF29, DocumentoExcluidoF29, F29DelMes, LineaF29, ResumenPropuestaF29, TotalesF29 } from "@/lib/api";
import { codigosDeLinea, documentosDeAlerta, documentosDeLinea, ESTADOS, nombreDelMes, SECCIONES } from "@/lib/f29";
import { formatearCLP } from "@/lib/formato";
import { nombreTipoDte, urlLibro } from "@/lib/sii";
import { CLASES_TH } from "../core-contable/partes";

/* ============================================================================
   Piezas de la pantalla del F29. Server Components: no tienen estado.
   ========================================================================== */

const CELDA = "px-4 py-2";
const NUMERO = `tabular ${CELDA} text-right whitespace-nowrap`;
const ENLACE = "underline-offset-4 hover:text-[var(--accent)] hover:underline";

/** Fecha y hora de Chile de un instante del backend: "21-10-2026". */
export function fechaEnChile(iso: string | null): string {
    if (!iso) return "—";
    const fecha = new Date(iso);
    if (Number.isNaN(fecha.getTime())) return "—";
    return fecha.toLocaleDateString("es-CL", { timeZone: "America/Santiago", day: "2-digit", month: "2-digit", year: "numeric" });
}

/** "2026-10-20" → "martes 20 de octubre". La fecha no pasa por la zona horaria. */
export function diaDelVencimiento(fecha: string): string {
    const [anio, mes, dia] = fecha.split("-").map(Number);
    const semana = new Date(Date.UTC(anio, mes - 1, dia)).toLocaleDateString("es-CL", { weekday: "long", timeZone: "UTC" });
    return `${semana} ${dia} de ${nombreDelMes(fecha.slice(0, 7))}`;
}

const esCero = (monto: string) => /^-?0+$/.test(monto);

/* ---------------------------------------------------------------- formulario */

function FilaTotal({ linea, codigo, concepto, monto, destacado = false }: {
    readonly linea: number;
    readonly codigo: string;
    readonly concepto: string;
    readonly monto: string;
    readonly destacado?: boolean;
}) {
    return (
        <tr className={`border-b border-[var(--border-subtle)] font-semibold ${destacado ? "bg-[var(--background-raised)] text-[14px]" : ""}`}>
            <td className={`tabular ${CELDA} text-[var(--foreground-muted)]`}>{linea}</td>
            <td className={`tabular ${CELDA}`}>{codigo}</td>
            <td className={CELDA}>{concepto}</td>
            <td className={CELDA} />
            <td className={NUMERO}>{formatearCLP(monto)}</td>
        </tr>
    );
}

function FilaLinea({ linea, periodo }: { readonly linea: LineaF29; readonly periodo: string }) {
    const cero = linea.cantidad === 0 && esCero(linea.monto);
    const filtro = documentosDeLinea(linea.clave, periodo);
    const resta = linea.suma === -1 && !esCero(linea.monto);
    return (
        <tr className={`border-b border-[var(--border-subtle)] ${cero ? "text-[var(--foreground-muted)]" : ""}`}>
            <td className={`tabular ${CELDA} text-[var(--foreground-muted)]`}>{linea.linea}</td>
            <td className={`tabular ${CELDA} whitespace-nowrap`}>{codigosDeLinea(linea)}</td>
            <td className={CELDA}>
                {filtro && !cero ? (
                    <Link href={urlLibro(filtro)} className={ENLACE} title="Ver los documentos de esta línea">
                        {linea.concepto}
                    </Link>
                ) : (
                    linea.concepto
                )}
                {linea.suma === -1 ? <span className="text-[11.5px] text-[var(--foreground-muted)]"> · resta</span> : null}
            </td>
            <td className={NUMERO}>{linea.codigo_cantidad === null ? "" : linea.cantidad}</td>
            <td className={NUMERO}>
                {resta ? "− " : ""}
                {formatearCLP(linea.monto)}
            </td>
        </tr>
    );
}

/**
 * La propuesta con la forma del formulario: línea, códigos (cantidad · monto),
 * concepto, documentos y monto. Todas las líneas, aunque estén en cero: el
 * contador las transcribe una a una al portal del SII.
 */
export function TablaFormulario({
    lineas,
    totales,
    periodo,
}: {
    readonly lineas: readonly LineaF29[];
    readonly totales: TotalesF29;
    readonly periodo: string;
}) {
    const determinado = !esCero(totales.iva_determinado);
    return (
        <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
            <thead className="border-b border-[var(--border-subtle)]">
                <tr>
                    <th scope="col" className={`${CLASES_TH} w-14`}>Línea</th>
                    <th scope="col" className={`${CLASES_TH} w-24`}>Código</th>
                    <th scope="col" className={CLASES_TH}>Concepto</th>
                    <th scope="col" className={`${CLASES_TH} w-24 text-right`}>Documentos</th>
                    <th scope="col" className={`${CLASES_TH} w-36 text-right`}>Monto</th>
                </tr>
            </thead>
            <tbody>
                {SECCIONES.map((seccion) => (
                    <SeccionDelFormulario key={seccion.id} titulo={seccion.titulo} nota={seccion.nota}>
                        {lineas.filter((l) => l.seccion === seccion.id).map((l) => (
                            <FilaLinea key={l.clave} linea={l} periodo={periodo} />
                        ))}
                        {seccion.id === "debitos" ? <FilaTotal linea={23} codigo="538" concepto="Total débitos" monto={totales.debitos} /> : null}
                        {seccion.id === "creditos" ? (
                            <>
                                <FilaTotal linea={49} codigo="537" concepto="Total créditos" monto={totales.creditos} />
                                <FilaTotal
                                    linea={50}
                                    codigo={determinado ? "89" : "77"}
                                    concepto={determinado ? "IVA determinado (débitos − créditos)" : "Remanente de crédito fiscal para el período siguiente"}
                                    monto={determinado ? totales.iva_determinado : totales.remanente_siguiente}
                                />
                            </>
                        ) : null}
                        {/* El 595 cierra el anverso; el reverso (cambio de sujeto) viene después. */}
                        {seccion.id === "retenciones" ? (
                            <FilaTotal linea={80} codigo="595" concepto="Subtotal impuesto determinado del anverso (IVA + retenciones)" monto={totales.subtotal} />
                        ) : null}
                        {seccion.id === "cambio_sujeto" ? (
                            <>
                                <FilaTotal linea={122} codigo="596" concepto="Total retenciones por cambio de sujeto" monto={totales.retencion_cambio_sujeto ?? "0"} />
                                <FilaTotal linea={134} codigo="547" concepto="Total determinado (anverso + reverso)" monto={totales.total_determinado ?? totales.subtotal} />
                            </>
                        ) : null}
                    </SeccionDelFormulario>
                ))}
                <FilaTotal linea={140} codigo="91" concepto="Total a pagar dentro del plazo legal" monto={totales.total_a_pagar} destacado />
            </tbody>
        </table>
    );
}

function SeccionDelFormulario({ titulo, nota, children }: { readonly titulo: string; readonly nota?: string; readonly children: ReactNode }) {
    return (
        <>
            <tr className="border-b border-[var(--border-subtle)] bg-[var(--background-raised)]">
                <th scope="colgroup" colSpan={5} className="px-4 py-2 text-[12px] font-semibold">
                    {titulo}
                    {nota ? <span className="ml-2 font-normal text-[var(--foreground-muted)]">{nota}</span> : null}
                </th>
            </tr>
            {children}
        </>
    );
}

/* ---------------------------------------------------------------- alertas */

const NIVEL: Record<AlertaF29["nivel"], { readonly etiqueta: string; readonly tono: "critico" | "aviso" | "neutro" }> = {
    critico: { etiqueta: "Crítica", tono: "critico" },
    aviso: { etiqueta: "Revisar", tono: "aviso" },
    info: { etiqueta: "Info", tono: "neutro" },
};

/** Lo que el contador tiene que mirar antes de aprobar, de lo más grave a lo informativo. */
export function ListaAlertas({ alertas, periodo }: { readonly alertas: readonly AlertaF29[]; readonly periodo: string }) {
    if (alertas.length === 0) {
        return <p className="text-[13px] text-[var(--foreground-muted)]">Sin observaciones: los documentos del mes no tienen alertas.</p>;
    }
    return (
        <ul className="flex flex-col divide-y divide-[var(--border-subtle)]">
            {alertas.map((alerta) => {
                const filtro = documentosDeAlerta(alerta, periodo);
                return (
                    <li key={alerta.codigo} className="flex flex-col gap-1.5 py-2.5 text-[13px] first:pt-0 last:pb-0 sm:flex-row sm:items-start sm:gap-3">
                        <span className="shrink-0 sm:w-16">
                            <Etiqueta tono={NIVEL[alerta.nivel].tono}>{NIVEL[alerta.nivel].etiqueta}</Etiqueta>
                        </span>
                        <span className="flex-1">{alerta.mensaje}</span>
                        {filtro ? (
                            <Link href={urlLibro(filtro)} className="no-imprimir shrink-0 text-[12.5px] font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                                Ver documentos
                            </Link>
                        ) : null}
                    </li>
                );
            })}
        </ul>
    );
}

/* ---------------------------------------------------------------- el año */

/**
 * Los 12 meses del año con el estado de su F29: de un vistazo, qué meses
 * faltan por revisar, aprobar o declarar.
 */
export function LineaDelAnio({
    anio,
    periodo,
    propuestas,
    hoy,
}: {
    readonly anio: number;
    readonly periodo: string;
    readonly propuestas: readonly ResumenPropuestaF29[];
    readonly hoy: string;
}) {
    const PUNTO: Record<string, string> = {
        declarada: "bg-[var(--positivo)]",
        aprobada: "bg-[var(--aviso)]",
        borrador: "border border-[var(--foreground-muted)]",
        sin_guardar: "border border-dashed border-[var(--border-strong)]",
    };
    return (
        <nav aria-label={`F29 de ${anio}`} className="no-imprimir flex flex-wrap items-center gap-1">
            {Array.from({ length: 12 }, (_, i) => `${anio}-${String(i + 1).padStart(2, "0")}`).map((mes) => {
                const propuesta = propuestas.find((p) => p.periodo === mes);
                const estado = propuesta?.estado ?? "sin_guardar";
                const futuro = mes >= hoy.slice(0, 7);
                const actual = mes === periodo;
                return (
                    <Link
                        key={mes}
                        replace
                        href={`/dashboard/f29?periodo=${mes}`}
                        aria-current={actual ? "date" : undefined}
                        title={`${nombreDelMes(mes)}: ${futuro ? "el mes no ha terminado" : ESTADOS[estado].etiqueta.toLowerCase()}`}
                        className={`flex items-center gap-1.5 rounded-md px-2 py-1 text-[12px] font-medium capitalize ${
                            actual ? "bg-[var(--background-raised)] text-[var(--foreground)]" : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                        } ${futuro ? "opacity-50" : ""}`}
                    >
                        <span aria-hidden className={`size-2 rounded-full ${PUNTO[estado]}`} />
                        {nombreDelMes(mes).slice(0, 3)}
                    </Link>
                );
            })}
        </nav>
    );
}

/* ---------------------------------------------------------------- contabilidad */

/**
 * PRIMERO CONTABILIDAD, DESPUÉS TRIBUTACIÓN: el IVA que se declara tiene que
 * estar en el libro mayor. Mientras los documentos no se contabilicen, la
 * diferencia es esperable; se muestra para que no pase inadvertida.
 */
export function Conciliacion({ conciliacion }: { readonly conciliacion: F29DelMes["conciliacion"] }) {
    const filas = [
        { nombre: "IVA débito fiscal", ...conciliacion.debito },
        { nombre: "IVA crédito fiscal (sin el remanente)", ...conciliacion.credito },
    ];
    return (
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <thead className="border-b border-[var(--border-subtle)]">
                <tr>
                    <th scope="col" className={CLASES_TH}>Cuenta</th>
                    <th scope="col" className={`${CLASES_TH} text-right`}>Libro mayor</th>
                    <th scope="col" className={`${CLASES_TH} text-right`}>Propuesta F29</th>
                    <th scope="col" className={CLASES_TH}>Estado</th>
                </tr>
            </thead>
            <tbody>
                {filas.map((f) => (
                    <tr key={f.cuenta} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className={CELDA}>
                            {f.nombre} <span className="tabular text-[11.5px] text-[var(--foreground-muted)]">{f.cuenta}</span>
                        </td>
                        <td className={NUMERO}>{formatearCLP(f.libro)}</td>
                        <td className={NUMERO}>{formatearCLP(f.propuesta)}</td>
                        <td className={CELDA}>
                            {f.libro === f.propuesta ? <Etiqueta tono="positivo">Cuadra</Etiqueta> : <Etiqueta tono="aviso">No cuadra</Etiqueta>}
                        </td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

/* ---------------------------------------------------------------- lo que cambió y lo que quedó fuera */

export function TablaCambios({ cambios }: { readonly cambios: readonly CambioF29[] }) {
    return (
        <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
            <thead className="border-b border-[var(--border-subtle)]">
                <tr>
                    <th scope="col" className={CLASES_TH}>Código</th>
                    <th scope="col" className={CLASES_TH}>Concepto</th>
                    <th scope="col" className={`${CLASES_TH} text-right`}>Aprobado</th>
                    <th scope="col" className={`${CLASES_TH} text-right`}>Con los documentos de hoy</th>
                </tr>
            </thead>
            <tbody>
                {cambios.map((c) => (
                    <tr key={c.codigo} className="border-b border-[var(--border-subtle)] last:border-0">
                        <td className={`tabular ${CELDA}`}>{c.codigo}</td>
                        <td className={CELDA}>{c.concepto}</td>
                        <td className={NUMERO}>{formatearCLP(c.aprobado)}</td>
                        <td className={`${NUMERO} font-semibold`}>{formatearCLP(c.actual)}</td>
                    </tr>
                ))}
            </tbody>
        </table>
    );
}

export function ListaExcluidos({ excluidos }: { readonly excluidos: readonly DocumentoExcluidoF29[] }) {
    return (
        <ul className="flex flex-col divide-y divide-[var(--border-subtle)] text-[13px]">
            {excluidos.map((d) => (
                <li key={d.id_documento_sii} className="flex flex-col gap-0.5 py-2 first:pt-0 last:pb-0 sm:flex-row sm:gap-3">
                    <Link
                        href={`/dashboard/documentos/${d.id_documento_sii}`}
                        className="shrink-0 font-medium text-[var(--accent)] underline-offset-4 hover:underline sm:w-72"
                    >
                        {d.sentido === "compra" ? "Compra" : "Venta"} · {nombreTipoDte(d.tipo_dte)} N° {d.folio}
                    </Link>
                    <span className="text-[var(--foreground-muted)]">{d.motivo}</span>
                </li>
            ))}
        </ul>
    );
}
