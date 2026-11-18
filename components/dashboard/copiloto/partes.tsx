import Link from "next/link";
import { Boton } from "@/components/ui/Boton";
import { BotonCsv } from "@/components/ui/BotonCsv";
import { Icon } from "@/components/ui/Icon";
import type { PropuestaAsiento } from "@/lib/copiloto";
import type { Valoracion } from "@/lib/copiloto-memoria";
import { filasACsv } from "@/lib/csv";
import { formatearCLP, formatearFechaContable } from "@/lib/formato";
import {
    interpretarLinea,
    interpretarTexto,
    pareceCifra,
    partirComprobantes,
    textoPlano,
    type Fragmento,
} from "@/lib/texto-enriquecido";

/* Piezas de presentacion del chat del copiloto. Sin estado: lo maneja ChatCopiloto. */

export type EstadoMensaje = "respondiendo" | "listo" | "error";

export type MensajeVista = {
    readonly id: number;
    readonly rol: "usuario" | "asistente";
    readonly texto: string;
    readonly estado: EstadoMensaje;
    /** Que esta consultando el copiloto en este momento ("Revisando el libro mayor…"). */
    readonly consultando: string | null;
    /** Nota bajo la respuesta (detenida, incompleta) o el error si estado es "error". */
    readonly aviso: string | null;
    /** Pantalla abierta al preguntar (mensajes del usuario). */
    readonly pantalla?: string;
    /** Fila de uso de la respuesta, para valorarla (mensajes del asistente). */
    readonly idUso?: string;
    readonly valoracion?: Valoracion;
    /** Comprobante citado -> id del asiento, para enlazarlo (mensajes del asistente). */
    readonly enlaces?: Readonly<Record<string, string>>;
    readonly propuesta?: PropuestaAsiento;
};

type Enlaces = Readonly<Record<string, string>> | undefined;

/** Los "T-15" que el backend resolvio llevan al detalle del asiento. */
function ConEnlaces({ texto, enlaces }: { readonly texto: string; readonly enlaces: Enlaces }) {
    return (
        <>
            {partirComprobantes(texto, enlaces).map((t, i) =>
                t.tipo === "comprobante" ? (
                    <Link
                        key={i}
                        href={`/dashboard/core-contable/${t.id}`}
                        className="tabular font-medium text-[var(--accent)] underline underline-offset-2"
                    >
                        {t.texto}
                    </Link>
                ) : (
                    <span key={i}>{t.texto}</span>
                ),
            )}
        </>
    );
}

function Fragmentos({ fragmentos, enlaces }: { readonly fragmentos: readonly Fragmento[]; readonly enlaces: Enlaces }) {
    return (
        <>
            {fragmentos.map((f, i) =>
                f.tipo === "negrita" ? (
                    <strong key={i} className="font-semibold text-[var(--foreground)]">
                        <ConEnlaces texto={f.texto} enlaces={enlaces} />
                    </strong>
                ) : f.tipo === "codigo" ? (
                    <code key={i} className="rounded bg-[var(--background-raised)] px-1 py-px font-mono text-[12.5px]">
                        {f.texto}
                    </code>
                ) : (
                    <ConEnlaces key={i} texto={f.texto} enlaces={enlaces} />
                ),
            )}
        </>
    );
}

/**
 * Tabla de la respuesta: se desplaza dentro de su caja en el panel angosto,
 * con el foco de teclado para poder recorrerla, y se descarga como CSV.
 */
function TablaRespuesta({
    encabezados,
    filas,
    enlaces,
}: {
    readonly encabezados: readonly string[];
    readonly filas: readonly (readonly string[])[];
    readonly enlaces: Enlaces;
}) {
    const csv = filasACsv([encabezados, ...filas].map((fila) => fila.map(textoPlano)));
    return (
        <div className="flex flex-col items-start gap-1.5">
            <div
                role="region"
                aria-label="Tabla de la respuesta"
                tabIndex={0}
                className="max-h-80 w-full overflow-auto rounded-lg border border-[var(--border-subtle)]"
            >
                <table className="w-full border-separate border-spacing-0 text-[12.5px]">
                    <thead className="sticky top-0 bg-[var(--background-raised)]">
                        <tr>
                            {encabezados.map((celda, i) => (
                                <th key={i} scope="col" className="whitespace-nowrap px-2.5 py-1.5 text-left font-semibold">
                                    <Fragmentos fragmentos={interpretarLinea(celda)} enlaces={enlaces} />
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {filas.map((fila, i) => (
                            <tr key={i}>
                                {fila.map((celda, j) => {
                                    const clases = `border-t border-[var(--border-subtle)] px-2.5 py-1.5 ${
                                        pareceCifra(celda) ? "tabular whitespace-nowrap text-right" : "text-left"
                                    }`;
                                    const contenido = <Fragmentos fragmentos={interpretarLinea(celda)} enlaces={enlaces} />;
                                    return j === 0 ? (
                                        <th key={j} scope="row" className={`font-normal ${clases}`}>
                                            {contenido}
                                        </th>
                                    ) : (
                                        <td key={j} className={clases}>
                                            {contenido}
                                        </td>
                                    );
                                })}
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            <BotonCsv csv={csv} archivo="copiloto.csv" texto="Descargar CSV" />
        </div>
    );
}

/** El texto del modelo pasa por React como texto: nunca como HTML. */
export function TextoEnriquecido({ texto, enlaces }: { readonly texto: string; readonly enlaces?: Enlaces }) {
    return (
        <div className="flex flex-col gap-2">
            {interpretarTexto(texto).map((bloque, i) => {
                if (bloque.tipo === "parrafo") {
                    return (
                        <p key={i} className="whitespace-pre-line">
                            <Fragmentos fragmentos={bloque.fragmentos} enlaces={enlaces} />
                        </p>
                    );
                }
                if (bloque.tipo === "tabla") {
                    return <TablaRespuesta key={i} encabezados={bloque.encabezados} filas={bloque.filas} enlaces={enlaces} />;
                }
                const Lista = bloque.ordenada ? "ol" : "ul";
                return (
                    <Lista key={i} className={`flex flex-col gap-1 pl-5 ${bloque.ordenada ? "list-decimal" : "list-disc"}`}>
                        {bloque.items.map((item, j) => (
                            <li key={j}>
                                <Fragmentos fragmentos={item} enlaces={enlaces} />
                            </li>
                        ))}
                    </Lista>
                );
            })}
        </div>
    );
}

export function BurbujaUsuario({ texto }: { readonly texto: string }) {
    return (
        <div className="ml-auto max-w-[85%] whitespace-pre-wrap rounded-xl rounded-br-sm bg-[var(--background-raised)] px-3.5 py-2.5 text-[13.5px] leading-relaxed text-[var(--foreground)]">
            {texto}
        </div>
    );
}

const BOTON_VALORAR =
    "grid size-7 place-items-center rounded-md text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--foreground)] aria-pressed:bg-[var(--background-raised)] aria-pressed:text-[var(--accent)]";

const NOMBRE_TIPO: Record<PropuestaAsiento["tipo_comprobante"], string> = { I: "Ingreso", E: "Egreso", T: "Traspaso" };

/** El asiento que armo el copiloto. No esta registrado: la persona lo revisa en el formulario. */
function TarjetaPropuesta({
    propuesta,
    alLlenar,
}: {
    readonly propuesta: PropuestaAsiento;
    readonly alLlenar: (propuesta: PropuestaAsiento) => void;
}) {
    return (
        <div className="mt-2 rounded-lg border border-[var(--border-subtle)] p-3">
            <p className="text-[12px] text-[var(--foreground-muted)]">
                Asiento propuesto · {NOMBRE_TIPO[propuesta.tipo_comprobante]} · {formatearFechaContable(propuesta.fecha)}
            </p>
            <p className="mt-0.5 font-medium">{propuesta.glosa}</p>
            <table className="mt-2 w-full text-[12.5px]">
                <thead className="sr-only">
                    <tr>
                        <th scope="col">Cuenta</th>
                        <th scope="col">Debe</th>
                        <th scope="col">Haber</th>
                    </tr>
                </thead>
                <tbody>
                    {propuesta.lineas.map((l, i) => (
                        <tr key={i}>
                            <th scope="row" className="py-0.5 pr-2 text-left font-normal">
                                {l.cuenta}
                            </th>
                            <td className="tabular whitespace-nowrap py-0.5 pr-2 text-right">{l.debe ? formatearCLP(l.debe) : ""}</td>
                            <td className="tabular whitespace-nowrap py-0.5 text-right">{l.haber ? formatearCLP(l.haber) : ""}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
            <div className="mt-2.5">
                <Boton variante="acento" onClick={() => alLlenar(propuesta)}>
                    Llenar el formulario
                </Boton>
            </div>
        </div>
    );
}

type BurbujaAsistenteProps = {
    readonly mensaje: MensajeVista;
    /** Pulsar el boton ya marcado quita la marca (null). */
    readonly alValorar: (idMensaje: number, valor: Valoracion | null) => void;
    readonly alLlenarFormulario: (propuesta: PropuestaAsiento) => void;
};

export function BurbujaAsistente({ mensaje, alValorar, alLlenarFormulario }: BurbujaAsistenteProps) {
    const esperando = mensaje.estado === "respondiendo" && (mensaje.consultando !== null || mensaje.texto === "");
    const valorable = mensaje.estado === "listo" && mensaje.idUso !== undefined;
    const alternar = (valor: Valoracion) => alValorar(mensaje.id, mensaje.valoracion === valor ? null : valor);
    return (
        <div className="flex max-w-[92%] gap-3">
            <div
                aria-hidden="true"
                className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--background-raised)] text-[var(--accent)]"
            >
                <Icon name="sparkle" className="size-4" />
            </div>
            <div className="min-w-0 flex-1 pt-0.5 text-[13.5px] leading-relaxed text-[var(--foreground)]">
                {mensaje.texto && <TextoEnriquecido texto={mensaje.texto} enlaces={mensaje.enlaces} />}
                {mensaje.propuesta && <TarjetaPropuesta propuesta={mensaje.propuesta} alLlenar={alLlenarFormulario} />}
                {esperando && (
                    <p className="flex items-center gap-2 text-[12.5px] text-[var(--foreground-muted)]">
                        {/* Solo opacidad: con "reducir movimiento" el punto queda quieto. */}
                        <span aria-hidden="true" className="size-1.5 rounded-full bg-[var(--accent)] motion-safe:animate-pulse" />
                        {mensaje.consultando ?? "Pensando…"}
                    </p>
                )}
                {mensaje.aviso && (
                    <p
                        role={mensaje.estado === "error" ? "alert" : undefined}
                        className={`mt-2 text-[12.5px] ${
                            mensaje.estado === "error" ? "text-[var(--critico)]" : "text-[var(--foreground-muted)]"
                        }`}
                    >
                        {mensaje.aviso}
                    </p>
                )}
                {valorable && (
                    <div className="mt-1.5 flex gap-1">
                        <button
                            type="button"
                            onClick={() => alternar("util")}
                            aria-pressed={mensaje.valoracion === "util"}
                            aria-label="Respuesta útil"
                            title="Útil"
                            className={BOTON_VALORAR}
                        >
                            <Icon name="thumbUp" className="size-3.5" />
                        </button>
                        <button
                            type="button"
                            onClick={() => alternar("no_util")}
                            aria-pressed={mensaje.valoracion === "no_util"}
                            aria-label="Respuesta no útil"
                            title="No útil"
                            className={BOTON_VALORAR}
                        >
                            <Icon name="thumbDown" className="size-3.5" />
                        </button>
                    </div>
                )}
            </div>
        </div>
    );
}

type SugerenciasProps = {
    /** Segun la pantalla abierta: ver sugerenciasPara. */
    readonly preguntas: readonly string[];
    readonly alElegir: (pregunta: string) => void;
};

export function Sugerencias({ preguntas, alElegir }: SugerenciasProps) {
    return (
        <div className="m-auto flex max-w-lg flex-col items-center gap-4 py-6 text-center">
            <div className="grid size-10 place-items-center rounded-lg bg-[var(--background-raised)] text-[var(--accent)]">
                <Icon name="sparkle" className="size-5" />
            </div>
            <div>
                <p className="font-display text-[15px] font-semibold text-[var(--foreground)]">
                    ¿Qué quieres saber de tu contabilidad?
                </p>
                <p className="mt-1 text-[12.5px] text-[var(--foreground-muted)]">
                    Prueba con una de estas preguntas o escribe la tuya.
                </p>
            </div>
            <div className="flex flex-wrap justify-center gap-2">
                {preguntas.map((pregunta) => (
                    <Boton key={pregunta} onClick={() => alElegir(pregunta)}>
                        {pregunta}
                    </Boton>
                ))}
            </div>
        </div>
    );
}
