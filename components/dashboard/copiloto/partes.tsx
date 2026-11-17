import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import type { Valoracion } from "@/lib/copiloto-memoria";
import { interpretarTexto, type Fragmento } from "@/lib/texto-enriquecido";

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
};

function Fragmentos({ fragmentos }: { readonly fragmentos: readonly Fragmento[] }) {
    return (
        <>
            {fragmentos.map((f, i) =>
                f.tipo === "negrita" ? (
                    <strong key={i} className="font-semibold text-[var(--foreground)]">
                        {f.texto}
                    </strong>
                ) : f.tipo === "codigo" ? (
                    <code key={i} className="rounded bg-[var(--background-raised)] px-1 py-px font-mono text-[12.5px]">
                        {f.texto}
                    </code>
                ) : (
                    <span key={i}>{f.texto}</span>
                ),
            )}
        </>
    );
}

/** El texto del modelo pasa por React como texto: nunca como HTML. */
export function TextoEnriquecido({ texto }: { readonly texto: string }) {
    return (
        <div className="flex flex-col gap-2">
            {interpretarTexto(texto).map((bloque, i) => {
                if (bloque.tipo === "parrafo") {
                    return (
                        <p key={i} className="whitespace-pre-line">
                            <Fragmentos fragmentos={bloque.fragmentos} />
                        </p>
                    );
                }
                const Lista = bloque.ordenada ? "ol" : "ul";
                return (
                    <Lista key={i} className={`flex flex-col gap-1 pl-5 ${bloque.ordenada ? "list-decimal" : "list-disc"}`}>
                        {bloque.items.map((item, j) => (
                            <li key={j}>
                                <Fragmentos fragmentos={item} />
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

type BurbujaAsistenteProps = {
    readonly mensaje: MensajeVista;
    /** Pulsar el boton ya marcado quita la marca (null). */
    readonly alValorar: (idMensaje: number, valor: Valoracion | null) => void;
};

export function BurbujaAsistente({ mensaje, alValorar }: BurbujaAsistenteProps) {
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
                {mensaje.texto && <TextoEnriquecido texto={mensaje.texto} />}
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
