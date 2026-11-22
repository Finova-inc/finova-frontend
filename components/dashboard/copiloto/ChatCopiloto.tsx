"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useRef, useState, useSyncExternalStore, type FormEvent, type KeyboardEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import type { EstadoCopiloto } from "@/lib/api";
import {
    armarHistorial,
    etiquetaHerramienta,
    leerEventosSse,
    MAX_MENSAJE,
    mensajeDeError,
    preguntasRestantes,
    sugerenciasConAvisos,
    sugerenciasPara,
    unirEnlaces,
    validarPregunta,
    type AvisosCopiloto,
    type PropuestaAsiento,
} from "@/lib/copiloto";
import {
    claveDeMemoria,
    guardarMemoria,
    leerMemoria,
    type Almacen,
    type MensajeGuardado,
    type Valoracion,
} from "@/lib/copiloto-memoria";
import { describirPantalla } from "@/lib/copiloto-pantalla";
import { formatearFecha } from "@/lib/formato";
import { valorarRespuesta } from "./acciones";
import { preguntasPendientes, propuestasPendientes, seleccionesPendientes } from "./buzon";
import { leerDetalle, suscribir } from "./contexto-pantalla";
import { MenuCopiloto } from "./MenuCopiloto";
import { BurbujaAsistente, BurbujaUsuario, Sugerencias, type MensajeVista } from "./partes";

/* ============================================================================
   Chat del copiloto. Se usa en el panel flotante (CopilotoFlotante) y en el
   modulo /dashboard/copiloto, con la misma conversacion guardada.

   Le habla a /api/copiloto/chat (mismo sitio; el route handler agrega el
   token) y lee la respuesta a medida que llega. Se monta la primera vez que se
   abre el panel y despues sigue montado aunque se cierre: asi una respuesta en
   curso termina igual.

   La conversacion se guarda en el navegador (lib/copiloto-memoria.ts), por
   usuario y empresa: vuelve al recargar y se borra con "Nueva conversacion",
   al cerrar sesion o a los 7 dias. El servidor nunca guarda el texto.

   El tablero para escribir flota sobre la lista (vidrio al 30%): los mensajes
   pasan por detras, y la lista lleva relleno abajo para que el ultimo no quede
   tapado.
   ========================================================================== */

/** Sin borde ni fondo propios: el foco se marca en el tablero completo (.copiloto-tablero). */
const CAMPO =
    "w-full resize-none bg-transparent px-1.5 py-1 text-[13.5px] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] disabled:cursor-not-allowed";

/** Si quien lee esta a menos de esto del final, la respuesta nueva lo arrastra hacia abajo. */
const MARGEN_PEGADO_PX = 80;

/** Desde cuantas preguntas restantes el aviso cambia de tono. */
const POCAS_PREGUNTAS = 3;

/** Con un texto adjunto, se puede preguntar sin escribir nada. */
const PREGUNTAS_SOBRE_SELECCION = ["Explícame esto", "¿Está bien?", "¿Qué hago con esto?"] as const;

export const RUTA_MODULO_COPILOTO = "/dashboard/copiloto";
const RUTA_NUEVO_ASIENTO = "/dashboard/core-contable/nuevo";

type ChatCopilotoProps = {
    /** Para llevar el foco al cuadro de texto cada vez que se abre el panel. */
    readonly abierto: boolean;
    /** Solo en el panel flotante: sin esto, el chat es el modulo de pantalla completa. */
    readonly alCerrar?: () => void;
    /** Avisa que termino una respuesta (para marcar el boton si el panel esta cerrado). */
    readonly alResponder?: () => void;
    /** Solo en el panel flotante: si esta anclado al costado y como cambiarlo. */
    readonly anclado?: boolean;
    readonly alCambiarLado?: () => void;
    readonly idUsuario: string | null;
    readonly idEmpresa: string | null;
};

/** localStorage, o null si el navegador no deja usarlo (modo privado, bloqueado). */
function almacen(): Almacen | null {
    try {
        return window.localStorage;
    } catch {
        return null;
    }
}

function aGuardados(mensajes: readonly MensajeVista[]): MensajeGuardado[] {
    return mensajes
        .filter((m) => m.estado === "listo")
        .map(({ id, rol, texto, aviso, pantalla, seleccion, idUso, valoracion, enlaces, propuesta }) => {
            // Los comprobantes ambiguos ("") no se enlazan: no vale la pena guardarlos.
            const conId = Object.entries(enlaces ?? {}).filter(([, idAsiento]) => idAsiento !== "");
            return {
                id,
                rol,
                texto,
                aviso,
                ...(pantalla ? { pantalla } : {}),
                ...(seleccion ? { seleccion } : {}),
                ...(idUso ? { idUso } : {}),
                ...(valoracion ? { valoracion } : {}),
                ...(conId.length > 0 ? { enlaces: Object.fromEntries(conId) } : {}),
                ...(propuesta ? { propuesta } : {}),
            };
        });
}

export function ChatCopiloto({
    abierto,
    alCerrar,
    alResponder,
    anclado = false,
    alCambiarLado,
    idUsuario,
    idEmpresa,
}: ChatCopilotoProps) {
    const router = useRouter();
    const ruta = usePathname();
    const parametros = useSearchParams();
    const detalle = useSyncExternalStore(suscribir, leerDetalle, () => null);
    const clave = claveDeMemoria(idUsuario, idEmpresa);

    // Se lee una sola vez, al montar, y el montaje ocurre solo en el navegador.
    const [guardada] = useState(() => leerMemoria(almacen(), clave, new Date()));
    const [restauradaEl, setRestauradaEl] = useState<string | null>(guardada?.guardadoEn ?? null);
    const [mensajes, setMensajes] = useState<MensajeVista[]>(() =>
        (guardada?.mensajes ?? []).map((m) => ({ ...m, estado: "listo", consultando: null })),
    );
    const [entrada, setEntrada] = useState("");
    const [errorEntrada, setErrorEntrada] = useState<string | null>(null);
    const [estado, setEstado] = useState<(EstadoCopiloto & { avisos?: AvisosCopiloto | null }) | null>(null);
    /** Lo que costaron las preguntas de esta sesion, para estimar cuantas quedan. */
    const [medida, setMedida] = useState({ preguntas: 0, tokens: 0 });
    const controlador = useRef<AbortController | null>(null);
    const lista = useRef<HTMLDivElement>(null);
    const pegadoAbajo = useRef(true);
    const campo = useRef<HTMLTextAreaElement>(null);
    const recienMontado = useRef(true);

    const respondiendo = mensajes.some((m) => m.estado === "respondiendo");
    const enModulo = alCerrar === undefined;
    // En el modulo la pantalla abierta es el propio chat: no aporta contexto.
    const pantalla = enModulo ? null : describirPantalla(ruta, Object.fromEntries(parametros.entries()), detalle);

    const noDisponible = estado !== null && !estado.disponible;
    const restantes = estado
        ? preguntasRestantes(
              estado.tokens_hoy,
              estado.tope_diario,
              medida.preguntas > 0 ? medida.tokens / medida.preguntas : 0,
          )
        : null;
    const sinPreguntas = restantes === 0;
    const bloqueado = noDisponible || sinPreguntas;

    // "Explicar esto" de otra pantalla: se envia apenas el chat esta abierto y libre.
    const preguntaPendiente = useSyncExternalStore(preguntasPendientes.suscribir, preguntasPendientes.mirar, () => null);
    const enviarActual = useRef(enviar);
    useEffect(() => {
        enviarActual.current = enviar;
    });
    useEffect(() => {
        if (!preguntaPendiente || !abierto || respondiendo || bloqueado) return;
        const pregunta = preguntasPendientes.tomar();
        if (pregunta) void enviarActual.current(pregunta);
    }, [preguntaPendiente, abierto, respondiendo, bloqueado]);

    // Texto seleccionado en otra pantalla (PreguntarSeleccion): espera en el buzon,
    // adjunto a la proxima pregunta, hasta enviarla o quitarlo.
    const seleccion = useSyncExternalStore(seleccionesPendientes.suscribir, seleccionesPendientes.mirar, () => null);
    useEffect(() => {
        if (seleccion && abierto) campo.current?.focus();
    }, [seleccion, abierto]);

    // Al cambiar de empresa (el componente se remonta) o cerrar sesion, se corta la respuesta en curso.
    useEffect(() => () => controlador.current?.abort(), []);

    useEffect(() => {
        if (abierto) campo.current?.focus();
    }, [abierto]);

    useEffect(() => {
        if (pegadoAbajo.current && lista.current) lista.current.scrollTop = lista.current.scrollHeight;
    }, [mensajes, abierto]);

    // Cuanto queda del tope diario: se pregunta al abrir y despues lo actualiza cada respuesta.
    useEffect(() => {
        if (!abierto) return;
        const corte = new AbortController();
        fetch("/api/copiloto/estado", { signal: corte.signal })
            .then((respuesta) => (respuesta.ok ? (respuesta.json() as Promise<EstadoCopiloto>) : null))
            .then((datos) => {
                if (datos) setEstado(datos);
            })
            .catch(() => {
                // Sin estado no se muestra el aviso; el servidor igual aplica el tope.
            });
        return () => corte.abort();
    }, [abierto]);

    // Se guarda al terminar cada respuesta, no mientras llega el texto. La primera
    // pasada se salta: reescribir lo recien leido le renovaria el vencimiento.
    useEffect(() => {
        if (recienMontado.current) {
            recienMontado.current = false;
            return;
        }
        if (respondiendo) return;
        guardarMemoria(almacen(), clave, aGuardados(mensajes), new Date());
    }, [mensajes, respondiendo, clave]);

    async function enviar(pregunta: string) {
        if (respondiendo || bloqueado) return;
        const error = validarPregunta(pregunta);
        if (error) {
            setErrorEntrada(error);
            return;
        }
        const texto = pregunta.trim();
        const historial = armarHistorial(mensajes.filter((m) => m.estado === "listo"));
        const idPregunta = mensajes.length > 0 ? mensajes[mensajes.length - 1].id + 1 : 0;
        const idRespuesta = idPregunta + 1;
        const conPantalla = pantalla ? { pantalla } : {};
        const conSeleccion = seleccion ? { seleccion } : {};
        setMensajes((previos) => [
            ...previos,
            {
                id: idPregunta,
                rol: "usuario",
                texto,
                estado: "listo",
                consultando: null,
                aviso: null,
                ...conPantalla,
                ...conSeleccion,
            },
            { id: idRespuesta, rol: "asistente", texto: "", estado: "respondiendo", consultando: null, aviso: null },
        ]);
        setEntrada("");
        setErrorEntrada(null);
        seleccionesPendientes.tomar();
        pegadoAbajo.current = true;

        const actualizar = (cambio: (m: MensajeVista) => Partial<MensajeVista>) =>
            setMensajes((previos) => previos.map((m) => (m.id === idRespuesta ? { ...m, ...cambio(m) } : m)));
        const corte = new AbortController();
        controlador.current = corte;

        try {
            const respuesta = await fetch("/api/copiloto/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mensaje: texto, historial, ...conPantalla, ...conSeleccion }),
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
                    } else if (evento.tipo === "enlaces") {
                        actualizar((m) => ({ enlaces: unirEnlaces(m.enlaces, evento.asientos) }));
                    } else if (evento.tipo === "propuesta_asiento") {
                        actualizar(() => ({ propuesta: evento.propuesta }));
                    } else if (evento.tipo === "fin") {
                        termino = true;
                        actualizar(() => ({
                            estado: "listo",
                            consultando: null,
                            aviso: evento.aviso,
                            ...(evento.id_uso ? { idUso: evento.id_uso } : {}),
                        }));
                        const { tokens_hoy: tokensHoy, tokens_pregunta: tokensPregunta } = evento;
                        if (tokensHoy !== undefined) {
                            setEstado((previo) => (previo ? { ...previo, tokens_hoy: tokensHoy } : previo));
                        }
                        if (tokensPregunta !== undefined && tokensPregunta > 0) {
                            setMedida((m) => ({ preguntas: m.preguntas + 1, tokens: m.tokens + tokensPregunta }));
                        }
                    } else if (evento.tipo === "error") {
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
            if (!corte.signal.aborted) alResponder?.();
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
        setRestauradaEl(null);
        setErrorEntrada(null);
        // El efecto de guardado no corre si habia una respuesta a medias: se borra aqui.
        guardarMemoria(almacen(), clave, [], new Date());
        campo.current?.focus();
    }

    /** Deja la propuesta para el formulario de nuevo asiento y lo abre; guardar sigue siendo de la persona. */
    function llenarFormulario(propuesta: PropuestaAsiento) {
        propuestasPendientes.dejar(propuesta);
        if (ruta !== RUTA_NUEVO_ASIENTO) router.push(RUTA_NUEVO_ASIENTO);
        // En el celular el panel tapa el formulario.
        if (alCerrar && window.matchMedia("(max-width: 639px)").matches) alCerrar();
    }

    // La marca se pinta de inmediato y se revierte si el servidor no la guardo.
    function valorar(idMensaje: number, valor: Valoracion | null) {
        const mensaje = mensajes.find((m) => m.id === idMensaje);
        if (!mensaje?.idUso) return;
        const anterior = mensaje.valoracion;
        const marcar = (marca: Valoracion | undefined) =>
            setMensajes((previos) => previos.map((m) => (m.id === idMensaje ? { ...m, valoracion: marca } : m)));
        marcar(valor ?? undefined);
        // La pregunta que origino esta respuesta: el mensaje del usuario justo antes.
        const indice = mensajes.findIndex((m) => m.id === idMensaje);
        const pregunta = mensajes
            .slice(0, indice)
            .reverse()
            .find((m) => m.rol === "usuario")?.texto;
        valorarRespuesta(mensaje.idUso, valor, valor === "no_util" ? pregunta : undefined)
            .then((resultado) => {
                if (!resultado.ok) marcar(anterior);
            })
            .catch(() => marcar(anterior));
    }

    const ayuda = errorEntrada
        ? errorEntrada
        : noDisponible
          ? "El copiloto no está disponible en este servidor"
          : sinPreguntas
            ? "Llegaste al límite de hoy. Vuelve mañana."
            : "Enter envía · Shift + Enter, nueva línea";
    // Anclado, la columna llena el espacio que deja el contenido; la conversacion queda centrada y legible.
    const ancho = enModulo
        ? "mx-auto w-full max-w-[720px]"
        : anclado
          ? "lg:mx-auto lg:w-full lg:max-w-[720px]"
          : "";

    return (
        <div className="relative flex min-h-0 flex-1 flex-col">
            {/* Anclado (desde lg) no hay cabecera: las opciones van en el menu del tablero (MenuCopiloto). */}
            <div
                className={`flex items-center gap-2 border-b border-[var(--border-subtle)] px-4 py-3 ${
                    anclado ? "lg:hidden" : ""
                }`}
            >
                <div
                    aria-hidden="true"
                    className={`grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--background-raised)] text-[var(--accent)] ${
                        anclado ? "lg:hidden" : ""
                    }`}
                >
                    <Icon name="sparkle" className="size-4" />
                </div>
                <div className={`min-w-0 flex-1 ${anclado ? "lg:sr-only" : ""}`}>
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
                {alCerrar && (
                    <>
                        {alCambiarLado && (
                            // Solo desde 1024 px: bajo eso no cabe una columna al costado.
                            <button
                                type="button"
                                onClick={alCambiarLado}
                                aria-pressed={anclado}
                                aria-label="Anclar el copiloto al costado"
                                title={anclado ? "Volver a flotante" : "Anclar al costado"}
                                className="grid size-8 place-items-center rounded-md text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--foreground)] aria-pressed:text-[var(--accent-text)] max-lg:hidden"
                            >
                                <Icon name="panel" className="size-4" />
                            </button>
                        )}
                        {/* En el celular el panel ya es pantalla completa. */}
                        <Link
                            href={RUTA_MODULO_COPILOTO}
                            onClick={alCerrar}
                            aria-label="Abrir el copiloto en pantalla completa"
                            title="Pantalla completa"
                            className="grid size-8 place-items-center rounded-md text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--foreground)] max-sm:hidden"
                        >
                            <Icon name="expand" className="size-4" />
                        </Link>
                        <Boton variante="fantasma" soloIcono onClick={alCerrar} aria-label="Cerrar el copiloto" title="Cerrar">
                            <Icon name="close" className="size-4" />
                        </Boton>
                    </>
                )}
            </div>

            <div className="relative flex min-h-0 flex-1 flex-col">
                <div
                    ref={lista}
                    role="log"
                    aria-label="Conversación con el copiloto"
                    aria-busy={respondiendo}
                    onScroll={(evento) => {
                        const el = evento.currentTarget;
                        pegadoAbajo.current = el.scrollHeight - el.scrollTop - el.clientHeight < MARGEN_PEGADO_PX;
                    }}
                    className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 pb-40 pt-4"
                >
                    <div className={`flex flex-1 flex-col gap-5 ${ancho}`}>
                        {mensajes.length === 0 ? (
                            <Sugerencias
                                preguntas={sugerenciasConAvisos(sugerenciasPara(ruta), estado?.avisos)}
                                alElegir={(pregunta) => void enviar(pregunta)}
                            />
                        ) : (
                            <>
                                {restauradaEl && (
                                    <p className="text-center text-[11.5px] text-[var(--foreground-muted)]">
                                        Conversación guardada en este navegador el {formatearFecha(restauradaEl)}.
                                    </p>
                                )}
                                {mensajes.map((m) =>
                                    m.rol === "usuario" ? (
                                        <BurbujaUsuario key={m.id} texto={m.texto} seleccion={m.seleccion} />
                                    ) : (
                                        <BurbujaAsistente key={m.id} mensaje={m} alValorar={valorar} alLlenarFormulario={llenarFormulario} />
                                    ),
                                )}
                            </>
                        )}
                    </div>
                </div>

                <div className="pointer-events-none absolute inset-x-3 bottom-3">
                    <form onSubmit={alEnviar} className={`copiloto-tablero pointer-events-auto p-2.5 ${ancho}`}>
                        {pantalla && (
                            <p className="mb-1 truncate px-1.5 text-[11px] text-[var(--foreground-muted)]" title={pantalla}>
                                Viendo: {pantalla}
                            </p>
                        )}
                        {seleccion && (
                            <div className="mb-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background-raised)] p-2">
                                <div className="flex items-start gap-2">
                                    <Icon name="document" className="mt-0.5 size-3.5 shrink-0 text-[var(--accent)]" />
                                    <p className="line-clamp-3 min-w-0 flex-1 whitespace-pre-wrap text-[12px] text-[var(--foreground)]">
                                        <span className="sr-only">Texto adjunto: </span>
                                        {seleccion}
                                    </p>
                                    <button
                                        type="button"
                                        onClick={() => {
                                            seleccionesPendientes.tomar();
                                            campo.current?.focus();
                                        }}
                                        aria-label="Quitar el texto adjunto"
                                        title="Quitar"
                                        className="grid size-6 shrink-0 place-items-center rounded-md text-[var(--foreground-muted)] hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                                    >
                                        <Icon name="close" className="size-3.5" />
                                    </button>
                                </div>
                                {entrada.trim() === "" && !respondiendo && !bloqueado && (
                                    <div className="mt-2 flex flex-wrap gap-1.5">
                                        {PREGUNTAS_SOBRE_SELECCION.map((pregunta) => (
                                            <button
                                                key={pregunta}
                                                type="button"
                                                onClick={() => void enviar(pregunta)}
                                                className="rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-2.5 py-1 text-[12px] text-[var(--foreground)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent-text)]"
                                            >
                                                {pregunta}
                                            </button>
                                        ))}
                                    </div>
                                )}
                            </div>
                        )}
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
                                disabled={bloqueado}
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
                            {anclado && alCerrar && (
                                <div className="max-lg:hidden">
                                    <MenuCopiloto
                                        opciones={[
                                            ...(mensajes.length > 0
                                                ? [{ icono: "plus", etiqueta: "Nueva", descripcion: "Empezar una conversación nueva", alElegir: nuevaConversacion } as const]
                                                : []),
                                            ...(alCambiarLado
                                                ? [{ icono: "float", etiqueta: "Flotante", descripcion: "Soltar el copiloto como ventana flotante", alElegir: alCambiarLado } as const]
                                                : []),
                                            { icono: "expand", etiqueta: "Ampliar", descripcion: "Abrir el copiloto en pantalla completa", href: RUTA_MODULO_COPILOTO, alElegir: alCerrar },
                                            { icono: "close", etiqueta: "Cerrar", descripcion: "Cerrar el copiloto", alElegir: alCerrar },
                                        ]}
                                    />
                                </div>
                            )}
                            {respondiendo ? (
                                <Boton soloIcono onClick={() => controlador.current?.abort()} aria-label="Detener la respuesta" title="Detener">
                                    <Icon name="close" className="size-4" />
                                </Boton>
                            ) : (
                                <Boton
                                    type="submit"
                                    variante="acento"
                                    soloIcono
                                    disabled={bloqueado || entrada.trim() === ""}
                                    aria-label="Enviar la pregunta"
                                    title="Enviar"
                                >
                                    <Icon name="arrowRight" className="size-4" />
                                </Boton>
                            )}
                        </div>
                        <div className="mt-1 flex items-baseline justify-between gap-3 px-1.5 text-[11px]">
                            <p
                                id="ayuda-copiloto"
                                className={
                                    errorEntrada || bloqueado ? "text-[var(--critico)]" : "text-[var(--foreground-muted)]"
                                }
                            >
                                {ayuda}
                            </p>
                            {restantes !== null && restantes > 0 && !noDisponible && (
                                <p
                                    className={`shrink-0 ${
                                        restantes <= POCAS_PREGUNTAS
                                            ? "font-medium text-[var(--critico)]"
                                            : "text-[var(--foreground-muted)]"
                                    }`}
                                >
                                    {restantes === 1 ? "Te queda 1 pregunta hoy" : `Te quedan unas ${restantes} preguntas hoy`}
                                </p>
                            )}
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}
