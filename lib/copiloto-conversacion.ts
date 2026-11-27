/* ============================================================================
   Copiloto IA: la conversacion en curso, fuera de los componentes.

   Si la conversacion y la peticion fueran estado del chat, desmontarlo
   cortaria la respuesta y perderia la pregunta: por eso viven aqui, y el chat
   solo las muestra (useSyncExternalStore con suscribir y leer).

   Una respuesta solo se corta con "Detener", "Nueva conversacion" o al salir
   del panel (cambio de empresa, cierre de sesion): cortarTodas.

   La pregunta se guarda en el navegador apenas se envia; si se recarga antes
   de que termine, vuelve con AVISO_INTERRUMPIDA en el lugar de la respuesta.
   ========================================================================== */

import {
    armarHistorial,
    etiquetaHerramienta,
    leerEventosSse,
    mensajeDeError,
    unirEnlaces,
    type PropuestaAsiento,
} from "./copiloto.ts";
import { guardarMemoria, leerMemoria, type Almacen, type MensajeGuardado, type Valoracion } from "./copiloto-memoria.ts";

export const AVISO_INTERRUMPIDA = "La respuesta se interrumpió antes de terminar. Vuelve a preguntar.";

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
    /** Texto de la pantalla adjunto a la pregunta (mensajes del usuario). */
    readonly seleccion?: string;
    /** Fila de uso de la respuesta, para valorarla (mensajes del asistente). */
    readonly idUso?: string;
    readonly valoracion?: Valoracion;
    /** Comprobante citado -> id del asiento, para enlazarlo (mensajes del asistente). */
    readonly enlaces?: Readonly<Record<string, string>>;
    readonly propuesta?: PropuestaAsiento;
};

export type Conversacion = {
    readonly mensajes: readonly MensajeVista[];
    /** Cuando se guardo lo que se recupero del navegador, o null si empezo aqui. */
    readonly restauradaEl: string | null;
    /** Lo que costaron las preguntas de esta sesion, para estimar cuantas quedan. */
    readonly medida: { readonly preguntas: number; readonly tokens: number };
    /** Uso de hoy segun la ultima respuesta; null si el estado del servidor es mas nuevo. */
    readonly tokensHoy: number | null;
};

export type Pregunta = { readonly texto: string; readonly pantalla?: string; readonly seleccion?: string };

export type ResultadoEnvio = "ocupado" | "terminada" | "detenida" | "sesion-expirada";

type Entrada = { vista: Conversacion; corte: AbortController | null };

type Dependencias = {
    readonly almacen: () => Almacen | null;
    readonly pedir: (url: string, opciones: RequestInit) => Promise<Response>;
    readonly ahora: () => Date;
};

const hayRespuestaEnCurso = (mensajes: readonly MensajeVista[]) => mensajes.some((m) => m.estado === "respondiendo");

/** Los mensajes terminados; una respuesta en curso se guarda como interrumpida. */
function aGuardados(mensajes: readonly MensajeVista[]): MensajeGuardado[] {
    return mensajes
        .filter((m) => m.estado !== "error")
        .map(({ id, rol, texto, estado, aviso, pantalla, seleccion, idUso, valoracion, enlaces, propuesta }) => {
            if (estado === "respondiendo") return { id, rol, texto: "", aviso: AVISO_INTERRUMPIDA };
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

export function crearConversaciones({ almacen, pedir, ahora }: Dependencias) {
    /** Una por usuario y empresa (claveDeMemoria); sin clave, "" y solo en memoria. */
    const entradas = new Map<string, Entrada>();
    const oyentes = new Set<() => void>();

    const avisar = () => {
        for (const oyente of oyentes) oyente();
    };

    function entradaDe(clave: string | null): Entrada {
        let entrada = entradas.get(clave ?? "");
        if (!entrada) {
            const guardada = leerMemoria(almacen(), clave, ahora());
            entrada = {
                corte: null,
                vista: {
                    mensajes: (guardada?.mensajes ?? []).map((m) => ({ ...m, estado: "listo", consultando: null })),
                    restauradaEl: guardada?.guardadoEn ?? null,
                    medida: { preguntas: 0, tokens: 0 },
                    tokensHoy: null,
                },
            };
            entradas.set(clave ?? "", entrada);
        }
        return entrada;
    }

    /** Una entrada descartada (nueva conversacion, salida del panel) ya no cambia ni se guarda. */
    const vigente = (clave: string | null, entrada: Entrada) => entradas.get(clave ?? "") === entrada;

    const guardar = (clave: string | null, entrada: Entrada) =>
        guardarMemoria(almacen(), clave, aGuardados(entrada.vista.mensajes), ahora());

    function cambiarMensaje(clave: string | null, entrada: Entrada, id: number, cambio: (m: MensajeVista) => Partial<MensajeVista>) {
        if (!vigente(clave, entrada)) return;
        const mensajes = entrada.vista.mensajes.map((m) => (m.id === id ? { ...m, ...cambio(m) } : m));
        entrada.vista = { ...entrada.vista, mensajes };
        // No se guarda mientras llega el texto, solo cuando ya no hay nada en curso.
        if (!hayRespuestaEnCurso(mensajes)) guardar(clave, entrada);
        avisar();
    }

    async function enviar(clave: string | null, { texto, pantalla, seleccion }: Pregunta): Promise<ResultadoEnvio> {
        const entrada = entradaDe(clave);
        const previos = entrada.vista.mensajes;
        if (hayRespuestaEnCurso(previos)) return "ocupado";

        const historial = armarHistorial(previos.filter((m) => m.estado === "listo"));
        const idPregunta = previos.length > 0 ? previos[previos.length - 1].id + 1 : 0;
        const idRespuesta = idPregunta + 1;
        const conPantalla = pantalla ? { pantalla } : {};
        const conSeleccion = seleccion ? { seleccion } : {};
        const corte = new AbortController();
        entrada.corte = corte;
        entrada.vista = {
            ...entrada.vista,
            mensajes: [
                ...previos,
                { id: idPregunta, rol: "usuario", texto, estado: "listo", consultando: null, aviso: null, ...conPantalla, ...conSeleccion },
                { id: idRespuesta, rol: "asistente", texto: "", estado: "respondiendo", consultando: null, aviso: null },
            ],
        };
        guardar(clave, entrada);
        avisar();

        const actualizar = (cambio: (m: MensajeVista) => Partial<MensajeVista>) =>
            cambiarMensaje(clave, entrada, idRespuesta, cambio);
        const fallar = (aviso: string) => actualizar(() => ({ estado: "error", consultando: null, aviso }));

        try {
            const respuesta = await pedir("/api/copiloto/chat", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ mensaje: texto, historial, ...conPantalla, ...conSeleccion }),
                signal: corte.signal,
            });
            if (!respuesta.ok || !respuesta.body) {
                const datos: unknown = await respuesta.json().catch(() => null);
                const mensaje = (datos as { message?: unknown } | null)?.message;
                fallar(mensajeDeError(respuesta.status, typeof mensaje === "string" ? mensaje : null));
                return respuesta.status === 401 ? "sesion-expirada" : "terminada";
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
                        const { tokens_hoy: tokensHoy, tokens_pregunta: tokensPregunta } = evento;
                        const { medida } = entrada.vista;
                        entrada.vista = {
                            ...entrada.vista,
                            ...(tokensHoy !== undefined ? { tokensHoy } : {}),
                            ...(tokensPregunta !== undefined && tokensPregunta > 0
                                ? { medida: { preguntas: medida.preguntas + 1, tokens: medida.tokens + tokensPregunta } }
                                : {}),
                        };
                        actualizar(() => ({
                            estado: "listo",
                            consultando: null,
                            aviso: evento.aviso,
                            ...(evento.id_uso ? { idUso: evento.id_uso } : {}),
                        }));
                    } else if (evento.tipo === "error") {
                        termino = true;
                        fallar(evento.mensaje);
                    }
                }
            }
            if (!termino) fallar("La respuesta se cortó antes de terminar. Intenta de nuevo.");
        } catch {
            if (corte.signal.aborted) {
                actualizar(() => ({ estado: "listo", consultando: null, aviso: "Detuviste la respuesta." }));
            } else {
                fallar(mensajeDeError(0, null));
            }
        } finally {
            if (entrada.corte === corte) entrada.corte = null;
        }
        return corte.signal.aborted ? "detenida" : "terminada";
    }

    return {
        suscribir(oyente: () => void): () => void {
            oyentes.add(oyente);
            return () => {
                oyentes.delete(oyente);
            };
        },
        leer: (clave: string | null): Conversacion => entradaDe(clave).vista,
        enviar,
        detener(clave: string | null): void {
            entradaDe(clave).corte?.abort();
        },
        /** Nueva conversacion: corta lo que haya y borra lo guardado. */
        vaciar(clave: string | null): void {
            const anterior = entradaDe(clave);
            const entrada: Entrada = { corte: null, vista: { ...anterior.vista, mensajes: [], restauradaEl: null } };
            entradas.set(clave ?? "", entrada);
            anterior.corte?.abort();
            guardar(clave, entrada);
            avisar();
        },
        marcarValoracion(clave: string | null, id: number, valoracion: Valoracion | undefined): void {
            cambiarMensaje(clave, entradaDe(clave), id, () => ({ valoracion }));
        },
        /** El estado recien leido del servidor ya incluye lo que dijo la ultima respuesta. */
        olvidarTokensHoy(clave: string | null): void {
            const entrada = entradaDe(clave);
            if (entrada.vista.tokensHoy === null) return;
            entrada.vista = { ...entrada.vista, tokensHoy: null };
            avisar();
        },
        /** Al salir del panel: corta todo sin guardar. No avisa: quien miraba se esta desmontando. */
        cortarTodas(): void {
            const cortadas = [...entradas.values()];
            entradas.clear();
            for (const entrada of cortadas) entrada.corte?.abort();
        },
    };
}

export const conversaciones = crearConversaciones({
    almacen: () => {
        try {
            return window.localStorage;
        } catch {
            return null; // Modo privado o almacenamiento bloqueado.
        }
    },
    pedir: (url, opciones) => fetch(url, opciones),
    ahora: () => new Date(),
});
