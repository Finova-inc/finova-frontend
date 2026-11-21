import type { ReactNode } from "react";
import Link from "next/link";
import { Panel } from "@/components/ui/Panel";
import { ApiError, type DetalleEventoAuditoria } from "@/lib/api";
import { enlaceAlRegistro, etiquetaAccion, etiquetaEntidad } from "@/lib/auditoria";
import {
    descripcionDelRegistro,
    prepararCambios,
    prepararDatos,
    tituloDeDatos,
    type CambioLegible,
    type ContextoDelDetalle,
    type Entrada,
} from "@/lib/auditoria-detalle";
import { formatearFechaHoraChile } from "@/lib/formato";
import { Aviso } from "../core-contable/partes";

/* ============================================================================
   Detalle de un evento, dibujado en el servidor: no hay JavaScript de cliente.

   Lo pide la página solo cuando la URL trae ?evento=<id>, porque el backend
   deja registrado cada detalle que se abre (puede mostrar datos personales).

   Qué se muestra y cómo se lee (etiquetas, fechas, montos, orden, ids internos
   aparte) lo decide lib/auditoria-detalle.ts, igual para todas las entidades.
   ========================================================================== */

const ENLACE = "text-[var(--accent-text)] underline-offset-4 hover:underline";
const TITULO_DE_BLOQUE = "text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]";

function Dato({ titulo, children, ancho = false }: { readonly titulo: string; readonly children: ReactNode; readonly ancho?: boolean }) {
    return (
        <div className={`min-w-0 ${ancho ? "sm:col-span-2" : ""}`}>
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">{titulo}</dt>
            <dd className="mt-0.5 break-words">{children}</dd>
        </div>
    );
}

/** Una lista conocida (movimientos de un asiento, líneas de un documento) como mini tabla. */
function MiniTabla({ entrada }: { readonly entrada: Extract<Entrada, { tipo: "tabla" }> }) {
    return (
        <div className="mt-1 overflow-x-auto">
            <table className="w-full min-w-[20rem] border-collapse text-left text-[12.5px]">
                <caption className="sr-only">{entrada.etiqueta}</caption>
                <thead>
                    <tr>
                        {entrada.columnas.map((columna) => (
                            <th
                                key={columna.titulo}
                                scope="col"
                                className={`border-b border-[var(--border-strong)] py-1.5 pr-3 text-[12px] font-semibold text-[var(--foreground-muted)] ${
                                    columna.numerica ? "text-right" : ""
                                }`}
                            >
                                {columna.titulo}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody>
                    {entrada.filas.map((fila, indice) => (
                        <tr key={indice} className="border-b border-[var(--border-subtle)] last:border-0">
                            {fila.map((celda, columna) => (
                                <td key={columna} className={`py-1.5 pr-3 ${entrada.columnas[columna]?.numerica ? "tabular text-right" : ""}`}>
                                    {celda}
                                </td>
                            ))}
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Entradas({ entradas }: { readonly entradas: readonly Entrada[] }) {
    return (
        <dl className="mt-2 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
            {entradas.map((entrada) =>
                entrada.tipo === "tabla" ? (
                    <Dato key={entrada.clave} titulo={entrada.etiqueta} ancho>
                        <MiniTabla entrada={entrada} />
                    </Dato>
                ) : (
                    <Dato key={entrada.clave} titulo={entrada.etiqueta} ancho={Boolean(entrada.items)}>
                        {entrada.items ? (
                            <>
                                <span className="sr-only">{entrada.valor}: </span>
                                <ul className="list-disc pl-5">
                                    {entrada.items.map((item) => (
                                        <li key={item}>{item}</li>
                                    ))}
                                </ul>
                            </>
                        ) : (
                            entrada.valor
                        )}
                    </Dato>
                ),
            )}
        </dl>
    );
}

/** Lo que cambió: antes → después, uno por línea. */
function ListaDeCambios({ cambios }: { readonly cambios: readonly CambioLegible[] }) {
    return (
        <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
            {cambios.map((cambio) => (
                <li key={cambio.clave} className="break-words">
                    <span className="font-medium">{cambio.etiqueta}</span>:{" "}
                    <span className="text-[var(--foreground-muted)]">{cambio.antes}</span>{" "}
                    <span aria-hidden="true">→</span>
                    <span className="sr-only"> pasó a </span> <span>{cambio.despues}</span>
                </li>
            ))}
        </ul>
    );
}

/**
 * Los identificadores internos y los datos del sistema (ids, versiones), fuera de la lectura
 * normal. Cerrado por defecto; lo puede abrir cualquier rol que ve el evento.
 */
function DetalleTecnico({ grupos }: { readonly grupos: readonly { readonly titulo: string | null; readonly filas: readonly { readonly etiqueta: string; readonly valor: ReactNode }[] }[] }) {
    const conDatos = grupos.filter((g) => g.filas.length > 0);
    if (conDatos.length === 0) return null;
    return (
        <details className="mt-5 rounded-lg border border-[var(--border-subtle)]">
            <summary className="cursor-pointer rounded-lg px-3 py-2 text-[12.5px] font-medium text-[var(--foreground-muted)] hover:text-[var(--foreground)]">
                Detalle técnico
            </summary>
            <div className="al-abrir border-t border-[var(--border-subtle)] px-3 py-3">
                <p className="text-[12px] text-[var(--foreground-muted)]">Identificadores internos y datos del sistema.</p>
                {conDatos.map((grupo) => (
                    <div key={grupo.titulo ?? "tecnico"} className="mt-3">
                        {grupo.titulo ? <h4 className={TITULO_DE_BLOQUE}>{grupo.titulo}</h4> : null}
                        <dl className="mt-2 grid gap-x-6 gap-y-2 text-[12.5px] sm:grid-cols-2">
                            {grupo.filas.map((fila) => (
                                <Dato key={fila.etiqueta} titulo={fila.etiqueta}>
                                    <span className="font-mono text-[12px]">{fila.valor}</span>
                                </Dato>
                            ))}
                        </dl>
                    </div>
                ))}
            </div>
        </details>
    );
}

const filasTecnicas = (entradas: readonly Entrada[]) =>
    entradas.flatMap((e) => (e.tipo === "texto" ? [{ etiqueta: e.etiqueta, valor: e.valor }] : []));

export function DetalleEvento({
    resultado,
    personas,
    verIp,
    verCorreo,
    cerrarHref,
}: {
    readonly resultado: PromiseSettledResult<DetalleEventoAuditoria | null>;
    /** uuid en minúsculas → nombre, de las personas que aparecen en la auditoría de la empresa. */
    readonly personas: ReadonlyMap<string, string>;
    /** Quien no ve la IP tampoco ve el navegador: el backend manda los dos null y no se dibuja ninguno. */
    readonly verIp: boolean;
    /** Solo el administrador ve el correo: el backend lo manda null a los demás y no se deja el hueco. */
    readonly verCorreo: boolean;
    readonly cerrarHref: string;
}) {
    if (resultado.status === "rejected") {
        const noExiste = resultado.reason instanceof ApiError && resultado.reason.status === 404;
        return (
            <section id="detalle" aria-label="Detalle del evento" className="scroll-mt-20 animate-aparecer">
                <Aviso tono={noExiste ? "neutro" : "critico"}>
                    {noExiste
                        ? "No encontramos ese evento. Puede que ya no esté disponible."
                        : "No pudimos cargar el detalle. Si el servidor estaba inactivo puede tardar unos segundos en despertar: vuelve a abrirlo."}{" "}
                    <Link href={cerrarHref} className={`font-medium ${ENLACE}`}>
                        Cerrar
                    </Link>
                </Aviso>
            </section>
        );
    }

    const evento = resultado.value;
    if (!evento) return null;

    const ctx: ContextoDelDetalle = { entidad: evento.entidad, personas, verCorreo };
    const enlace = enlaceAlRegistro(evento.entidad, evento.id_registro);
    const registro = descripcionDelRegistro(evento.entidad, evento.datos_antes, evento.datos_despues) ?? etiquetaEntidad(evento.entidad);
    const esEliminacion = evento.accion === "eliminar";

    // Una actualización con "antes" muestra qué cambió; una eliminación, lo que se eliminó; lo demás, lo que quedó registrado.
    const cambios = !esEliminacion && evento.cambios ? prepararCambios(evento.cambios, ctx) : null;
    const bloques = cambios
        ? []
        : esEliminacion
          ? [{ titulo: tituloDeDatos("eliminar"), datos: evento.datos_antes ?? evento.datos_despues }]
          : [
                ...(evento.datos_antes ? [{ titulo: "Datos anteriores", datos: evento.datos_antes }] : []),
                { titulo: tituloDeDatos(evento.accion), datos: evento.datos_despues },
            ];
    const preparados = bloques.map((b) => ({ titulo: b.titulo, ...prepararDatos(b.datos, ctx), hayDatos: Boolean(b.datos && Object.keys(b.datos).length > 0) }));
    const conContenido = preparados.filter((p) => p.hayDatos);

    return (
        <section id="detalle" aria-label="Detalle del evento" className="scroll-mt-20 animate-aparecer">
            <Panel>
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-sm font-semibold">Detalle del evento</h2>
                    <Link href={cerrarHref} className={`text-[13px] ${ENLACE}`}>
                        Cerrar
                    </Link>
                </div>

                <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                    <Dato titulo="Quién">
                        {evento.usuario_nombre ?? (evento.id_usuario ? "Persona desconocida" : "Sistema o sin sesión")}
                        {verCorreo && evento.usuario_correo ? (
                            <span className="block text-[12px] text-[var(--foreground-muted)]">{evento.usuario_correo}</span>
                        ) : null}
                    </Dato>
                    <Dato titulo="Cuándo (hora de Chile)">
                        <time dateTime={evento.created_at} className="tabular">
                            {formatearFechaHoraChile(evento.created_at)}
                        </time>
                    </Dato>
                    <Dato titulo="Acción">{etiquetaAccion(evento.accion)}</Dato>
                    <Dato titulo="Registro afectado">
                        {enlace ? (
                            <Link href={enlace} prefetch={false} className={ENLACE}>
                                {registro}
                            </Link>
                        ) : (
                            registro
                        )}
                    </Dato>
                    {verIp ? (
                        <>
                            <Dato titulo="Dirección IP">
                                <span className="tabular">{evento.ip ?? "—"}</span>
                            </Dato>
                            <Dato titulo="Navegador">{evento.user_agent ?? "—"}</Dato>
                        </>
                    ) : null}
                </dl>

                {cambios ? (
                    <>
                        <h3 className={`mt-6 ${TITULO_DE_BLOQUE}`}>Cambios</h3>
                        {cambios.cambios.length > 0 ? (
                            <ListaDeCambios cambios={cambios.cambios} />
                        ) : (
                            <p className="mt-2 text-[13px] text-[var(--foreground-muted)]">
                                {cambios.tecnicos.length > 0
                                    ? "Este evento solo cambió datos internos (ver el detalle técnico)."
                                    : "Este evento no cambió ningún campo de los que se registran."}
                            </p>
                        )}
                        <DetalleTecnico
                            grupos={[
                                {
                                    titulo: null,
                                    filas: cambios.tecnicos.map((c) => ({
                                        etiqueta: c.etiqueta,
                                        valor: `${c.antes} → ${c.despues}`,
                                    })),
                                },
                            ]}
                        />
                    </>
                ) : conContenido.length === 0 ? (
                    <p className="mt-6 text-[13px] text-[var(--foreground-muted)]">Sin detalle de cambios para este evento.</p>
                ) : (
                    <>
                        {conContenido.map((bloque, indice) => (
                            <div key={bloque.titulo}>
                                <h3 className={`${indice === 0 ? "mt-6" : "mt-5"} ${TITULO_DE_BLOQUE}`}>{bloque.titulo}</h3>
                                {bloque.entradas.length > 0 ? (
                                    <Entradas entradas={bloque.entradas} />
                                ) : (
                                    <p className="mt-2 text-[13px] text-[var(--foreground-muted)]">Sin otros datos</p>
                                )}
                            </div>
                        ))}
                        <DetalleTecnico
                            grupos={conContenido.map((bloque) => ({
                                titulo: conContenido.length > 1 ? bloque.titulo : null,
                                filas: filasTecnicas(bloque.tecnicos),
                            }))}
                        />
                    </>
                )}
            </Panel>
        </section>
    );
}
