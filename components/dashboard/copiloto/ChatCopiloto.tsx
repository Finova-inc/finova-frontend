"use client";

import { useRouter } from "next/navigation";
import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import {
    armarHistorial,
    etiquetaHerramienta,
    leerEventosSse,
    MAX_MENSAJE,
    mensajeDeError,
    validarPregunta,
} from "@/lib/copiloto";
import { BurbujaAsistente, BurbujaUsuario, Sugerencias, type MensajeVista } from "./partes";

/* ============================================================================
   Chat del copiloto, dentro del panel flotante (CopilotoFlotante).

   Le habla a /api/copiloto/chat (mismo sitio; el route handler agrega el
   token) y lee la respuesta a medida que llega. Sigue montado aunque el panel
   este cerrado: asi la conversacion sobrevive a abrir y cerrar, y una
   respuesta en curso termina igual. Vive solo en memoria: se pierde al
   recargar y al cambiar de empresa.
   ========================================================================== */

const CAMPO =
    "w-full resize-none rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13.5px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]";

/** Si quien lee esta a menos de esto del final, la respuesta nueva lo arrastra hacia abajo. */
const MARGEN_PEGADO_PX = 80;

type ChatCopilotoProps = {
    /** Para llevar el foco al cuadro de texto cada vez que se abre el panel. */
    readonly abierto: boolean;
    readonly alCerrar: () => void;
    /** Avisa que termino una respuesta (para marcar el boton si el panel esta cerrado). */
    readonly alResponder: () => void;
};

export function ChatCopiloto({ abierto, alCerrar, alResponder }: ChatCopilotoProps) {
    const router = useRouter();
    const [mensajes, setMensajes] = useState<MensajeVista[]>([]);
    const [entrada, setEntrada] = useState("");
    const [errorEntrada, setErrorEntrada] = useState<string | null>(null);
    const siguienteId = useRef(0);
    const controlador = useRef<AbortController | null>(null);
    const lista = useRef<HTMLDivElement>(null);
    const pegadoAbajo = useRef(true);
    const campo = useRef<HTMLTextAreaElement>(null);

    const respondiendo = mensajes.some((m) => m.estado === "respondiendo");

    // Al cambiar de empresa (el componente se remonta) o cerrar sesion, se corta la respuesta en curso.
    useEffect(() => () => controlador.current?.abort(), []);

    useEffect(() => {
        if (abierto) campo.current?.focus();
    }, [abierto]);

    useEffect(() => {
        if (pegadoAbajo.current && lista.current) lista.current.scrollTop = lista.current.scrollHeight;
    }, [mensajes, abierto]);

    async function enviar(pregunta: string) {
        if (respondiendo) return;
        const error = validarPregunta(pregunta);
        if (error) {
            setErrorEntrada(error);
            return;
        }
        const texto = pregunta.trim();
        const historial = armarHistorial(mensajes.filter((m) => m.estado === "listo"));
        const idPregunta = siguienteId.current++;
        const idRespuesta = siguienteId.current++;
        setMensajes((previos) => [
            ...previos,
            { id: idPregunta, rol: "usuario", texto, estado: "listo", consultando: null, aviso: null },
            { id: idRespuesta, rol: "asistente", texto: "", estado: "respondiendo", consultando: null, aviso: null },
        ]);
        setEntrada("");
        setErrorEntrada(null);
        pegadoAbajo.current = true;

        const actualizar = (cambio: (m: MensajeVista) => Partial<MensajeVista>) =>
            setMensajes((previos) => previos.map((m) => (m.id === idRespuesta ? { ...m, ...cambio(m) } : m)));
        const corte = new AbortController();
        controlador.current = corte;

        try {
            const respuesta = await fetch("/api/copiloto/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mensaje: texto, historial }),
                signal: corte.signal,
            });
            if (respuesta.status === 401) {
                router.push("/login");
                return;
            }
            if (!respuesta.ok || !respuesta.body) {
                const datos: unknown = await respuesta.json().catch(() => null);
                const mensaje = (datos as { message?: unknown } | null)?.message;
                actualizar(() => ({
                    estado: "error",
                    aviso: mensajeDeError(respuesta.status, typeof mensaje === "string" ? mensaje : null),
                }));
                return;
            }

            const lector = respuesta.body.getReader();
            const decodificador = new TextDecoder();
            let resto = "";
            let termino = false;
            for (;;) {
                const { value, done } = await lector.read();
                if (done) break;
                const leido = leerEventosSse(resto + decodificador.decode(value, { stream: true }));
                resto = leido.resto;
                for (const evento of leido.eventos) {
                    if (evento.tipo === "texto") {
                        actualizar((m) => ({ texto: m.texto + evento.texto, consultando: null }));
                    } else if (evento.tipo === "herramienta") {
                        actualizar(() => ({ consultando: etiquetaHerramienta(evento.nombre) }));
                    } else if (evento.tipo === "fin") {
                        termino = true;
                        actualizar(() => ({ estado: "listo", consultando: null, aviso: evento.aviso }));
                    } else {
                        termino = true;
                        actualizar(() => ({ estado: "error", consultando: null, aviso: evento.mensaje }));
                    }
                }
            }
            if (!termino) {
                actualizar(() => ({
                    estado: "error",
                    consultando: null,
                    aviso: "La respuesta se cortó antes de terminar. Intenta de nuevo.",
                }));
            }
        } catch {
            actualizar(() =>
                corte.signal.aborted
                    ? { estado: "listo", consultando: null, aviso: "Detuviste la respuesta." }
                    : { estado: "error", consultando: null, aviso: mensajeDeError(0, null) },
            );
        } finally {
            if (controlador.current === corte) controlador.current = null;
            if (!corte.signal.aborted) alResponder();
            campo.current?.focus();
        }
    }

    function alEnviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        void enviar(entrada);
    }

    function alPresionarTecla(evento: KeyboardEvent<HTMLTextAreaElement>) {
        // Enter envia; Shift+Enter hace salto de linea; mientras se compone un acento, nada.
        if (evento.key === "Enter" && !evento.shiftKey && !evento.nativeEvent.isComposing) {
            evento.preventDefault();
            void enviar(entrada);
        }
    }

    function nuevaConversacion() {
        controlador.current?.abort();
        setMensajes([]);
        setErrorEntrada(null);
        campo.current?.focus();
    }

    return (
        <div className="flex h-full min-h-0 flex-col">
            <div className="flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3">
                <div
                    aria-hidden="true"
                    className="grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--background-raised)] text-[var(--accent)]"
                >
                    <Icon name="sparkle" className="size-4" />
                </div>
                <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                        <h2 className="font-display text-[15px] font-semibold text-[var(--foreground)]">Copiloto IA</h2>
                        <Etiqueta tono="aviso">Beta</Etiqueta>
                    </div>
                    <p className="truncate text-[11.5px] text-[var(--foreground-muted)]">
                        Solo consulta tu contabilidad. Verifica las cifras importantes.
                    </p>
                </div>
                {mensajes.length > 0 && (
                    <Boton variante="fantasma" soloIcono onClick={nuevaConversacion} aria-label="Nueva conversación" title="Nueva conversación">
                        <Icon name="undo" className="size-4" />
                    </Boton>
                )}
                <Boton variante="fantasma" soloIcono onClick={alCerrar} aria-label="Cerrar el copiloto" title="Cerrar">
                    <Icon name="close" className="size-4" />
                </Boton>
            </div>

            <div
                ref={lista}
                role="log"
                aria-label="Conversación con el copiloto"
                aria-busy={respondiendo}
                onScroll={(evento) => {
                    const el = evento.currentTarget;
                    pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < MARGEN_PEGADO_PX;
                }}
                className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-4"
            >
                {mensajes.length === 0 ? (
                    <Sugerencias alElegir={(pregunta) => void enviar(pregunta)} />
                ) : (
                    mensajes.map((m) =>
                        m.rol === "usuario" ? (
                            <BurbujaUsuario key={m.id} texto={m.texto} />
                        ) : (
                            <BurbujaAsistente key={m.id} mensaje={m} />
                        ),
                    )
                )}
            </div>

            <form onSubmit={alEnviar} className="border-t border-[var(--border-subtle)] p-3">
                <label htmlFor="pregunta-copiloto" className="sr-only">
                    Tu pregunta para el copiloto
                </label>
                <div className="flex items-end gap-2">
                    <textarea
                        id="pregunta-copiloto"
                        ref={campo}
                        rows={2}
                        maxLength={MAX_MENSAJE}
                        value={entrada}
                        onChange={(evento) => {
                            setEntrada(evento.target.value);
                            if (errorEntrada) setErrorEntrada(null);
                        }}
                        onKeyDown={alPresionarTecla}
                        placeholder="Pregunta por saldos, movimientos o el balance…"
                        aria-describedby="ayuda-copiloto"
                        aria-invalid={errorEntrada !== null}
                        className={CAMPO}
                    />
                    {respondiendo ? (
                        <Boton soloIcono onClick={() => controlador.current?.abort()} aria-label="Detener la respuesta" title="Detener">
                            <Icon name="close" className="size-4" />
                        </Boton>
                    ) : (
                        <Boton
                            type="submit"
                            variante="acento"
                            soloIcono
                            disabled={entrada.trim() === ""}
                            aria-label="Enviar la pregunta"
                            title="Enviar"
                        >
                            <Icon name="arrowRight" className="size-4" />
                        </Boton>
                    )}
                </div>
                <p
                    id="ayuda-copiloto"
                    className={`mt-1.5 text-[11px] ${errorEntrada ? "text-[var(--critico)]" : "text-[var(--foreground-muted)]"}`}
                >
                    {errorEntrada ?? "Enter envía · Shift + Enter, nueva línea"}
                </p>
            </form>
        </div>
    );
}
