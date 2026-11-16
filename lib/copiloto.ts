/* ============================================================================
   Copiloto IA: logica pura del chat.

   Vive aqui y no en el componente para probarla sin navegador
   (lib/copiloto.test.mjs). La usan el componente del chat y el route handler
   que hace de puente con el backend (app/api/copiloto/chat/route.ts).

   Los limites son los mismos del DTO del backend (src/copiloto/dto/chat.dto.ts):
   si cambian alla, se cambian aqui.
   ========================================================================== */

export const MAX_MENSAJE = 2000;
export const MAX_HISTORIAL = 20;
export const MAX_TEXTO_HISTORIAL = 4000;
/** El historial se recorta de a bloques: ver armarHistorial. */
export const BLOQUE_HISTORIAL = 10;
/** Presupuesto del historial que viaja con cada pregunta (~7.000 tokens). */
export const MAX_CARACTERES_HISTORIAL = 24000;
/** Largo maximo de la descripcion de la pantalla abierta (src/copiloto/pantalla.ts). */
export const MAX_PANTALLA = 200;
/** Tokens de una pregunta tipica, para estimar cuantas quedan antes de tener una medida. */
const TOKENS_POR_PREGUNTA_ESTIMADOS = 13000;

export type RolChat = "usuario" | "asistente";

/** `pantalla`: lo que la persona tenia abierto al preguntar; solo en mensajes del usuario. */
export type MensajeHistorial = { rol: RolChat; texto: string; pantalla?: string };

/** Lo que el backend manda por el stream, un evento por linea `data:`. */
export type EventoChat =
    | { tipo: "texto"; texto: string }
    | { tipo: "herramienta"; nombre: string }
    | {
          tipo: "fin";
          motivo: string;
          aviso: string | null;
          /** Fila de uso de la respuesta, para valorarla. */
          id_uso?: string;
          /** Tokens descontados hoy del tope diario, incluida esta pregunta. */
          tokens_hoy?: number;
          tokens_pregunta?: number;
      }
    | { tipo: "error"; mensaje: string };

export const PREGUNTAS_SUGERIDAS = [
    "¿Cuál es el saldo del banco a fin de mes?",
    "¿Cuadra el balance de comprobación de este año?",
    "¿Cuánto les debemos a los proveedores?",
    "Muéstrame los últimos asientos de egreso",
] as const;

const ETIQUETAS_HERRAMIENTA: Record<string, string> = {
    buscar_cuentas: "Buscando cuentas…",
    libro_mayor_cuenta: "Revisando el libro mayor…",
    balance_comprobacion: "Calculando el balance de comprobación…",
    buscar_asientos: "Buscando asientos…",
};

/** Texto para mostrar mientras el copiloto consulta; nunca el nombre tecnico. */
export function etiquetaHerramienta(nombre: string): string {
    return ETIQUETAS_HERRAMIENTA[nombre] ?? "Consultando tus datos…";
}

const esConteo = (valor: unknown): valor is number =>
    typeof valor === "number" && Number.isFinite(valor) && valor >= 0;

/**
 * El evento con solo los campos conocidos, o null si no se entiende. Los datos
 * opcionales del `fin` (id de uso y tokens) se descartan si vienen con otro
 * tipo, sin descartar el evento: un backend anterior no los manda.
 */
function comoEventoChat(valor: unknown): EventoChat | null {
    if (!valor || typeof valor !== "object") return null;
    const e = valor as Record<string, unknown>;
    switch (e.tipo) {
        case "texto":
            return typeof e.texto === "string" ? { tipo: "texto", texto: e.texto } : null;
        case "herramienta":
            return typeof e.nombre === "string" ? { tipo: "herramienta", nombre: e.nombre } : null;
        case "fin":
            if (typeof e.motivo !== "string" || !(e.aviso === null || typeof e.aviso === "string")) return null;
            return {
                tipo: "fin",
                motivo: e.motivo,
                aviso: e.aviso,
                ...(typeof e.id_uso === "string" ? { id_uso: e.id_uso } : {}),
                ...(esConteo(e.tokens_hoy) ? { tokens_hoy: e.tokens_hoy } : {}),
                ...(esConteo(e.tokens_pregunta) ? { tokens_pregunta: e.tokens_pregunta } : {}),
            };
        case "error":
            return typeof e.mensaje === "string" ? { tipo: "error", mensaje: e.mensaje } : null;
        default:
            return null;
    }
}

/**
 * Separa del buffer los eventos ya completos (terminan en linea en blanco).
 * Lo que queda a medias vuelve como `resto` y se antepone al trozo siguiente:
 * la red corta donde quiere, incluso a mitad de un caracter o de un JSON.
 * Un evento que no se entiende se descarta en vez de cortar la respuesta.
 */
export function leerEventosSse(buffer: string): { eventos: EventoChat[]; resto: string } {
    const bloques = buffer.replace(/\r\n/g, "\n").split("\n\n");
    const resto = bloques.pop() ?? "";
    const eventos: EventoChat[] = [];
    for (const bloque of bloques) {
        const datos = bloque
            .split("\n")
            .filter((linea) => linea.startsWith("data:"))
            .map((linea) => linea.slice(5).trimStart())
            .join("\n");
        if (!datos) continue;
        try {
            const evento = comoEventoChat(JSON.parse(datos) as unknown);
            if (evento) eventos.push(evento);
        } catch {
            // JSON roto: se ignora ese evento.
        }
    }
    return { eventos, resto };
}

/** Una linea de hasta MAX_PANTALLA caracteres, sin < ni > (no puede cerrar la etiqueta que la envuelve). */
export function esPantallaValida(valor: unknown): valor is string {
    return typeof valor === "string" && valor.length >= 1 && valor.length <= MAX_PANTALLA && !/[<>\r\n]/.test(valor);
}

/**
 * Turnos anteriores que viajan con la pregunta, con el texto recortado y
 * empezando por el usuario (la API del modelo lo exige).
 *
 * La ventana se corta POR BLOQUES de 10 y no un mensaje por pregunta: el modelo
 * cachea el prompt por prefijo exacto, y si el primer mensaje enviado cambiara
 * en cada pregunta, la cache del historial no serviria nunca. Asi el inicio se
 * mantiene durante 10 mensajes (5 preguntas) y viajan entre 10 y 19.
 *
 * Si la ventana pasa el presupuesto de caracteres, se avanza de bloque en
 * bloque; si ni el ultimo cabe, van los ultimos mensajes que entren.
 */
export function armarHistorial(mensajes: readonly MensajeHistorial[]): MensajeHistorial[] {
    const conTexto: MensajeHistorial[] = mensajes
        .map(({ rol, texto, pantalla }) => ({
            rol,
            texto: texto.trim().slice(0, MAX_TEXTO_HISTORIAL),
            ...(rol === "usuario" && esPantallaValida(pantalla) ? { pantalla } : {}),
        }))
        .filter((m) => m.texto.length > 0);
    const n = conTexto.length;
    const caracteresDesde = (desde: number) => conTexto.slice(desde).reduce((suma, m) => suma + m.texto.length, 0);

    let inicio = Math.max(0, Math.floor((n - BLOQUE_HISTORIAL) / BLOQUE_HISTORIAL) * BLOQUE_HISTORIAL);
    while (inicio < n && caracteresDesde(inicio) > MAX_CARACTERES_HISTORIAL) inicio += BLOQUE_HISTORIAL;
    if (inicio >= n) {
        let total = 0;
        inicio = n;
        while (inicio > 0 && total + conTexto[inicio - 1].texto.length <= MAX_CARACTERES_HISTORIAL) {
            inicio -= 1;
            total += conTexto[inicio].texto.length;
        }
    }

    const ventana = conTexto.slice(inicio);
    const primerUsuario = ventana.findIndex((m) => m.rol === "usuario");
    return primerUsuario === -1 ? [] : ventana.slice(primerUsuario);
}

const SUGERENCIAS_POR_PANTALLA: readonly (readonly [RegExp, readonly string[]])[] = [
    [
        /^\/dashboard\/libro-mayor(\/|$)/,
        [
            "¿Cuál es el saldo de esta cuenta a la fecha?",
            "¿Qué movimientos explican el saldo de este período?",
            "¿Cuáles son los movimientos más grandes de esta cuenta?",
        ],
    ],
    [
        /^\/dashboard\/balance(\/|$)/,
        [
            "¿Cuadra el balance de comprobación de este mes?",
            "¿Cuál es el resultado del ejercicio a la fecha?",
            "¿Qué cuentas tienen el saldo más alto?",
        ],
    ],
    [
        /^\/dashboard\/core-contable(\/|$)/,
        [
            "¿Cuáles fueron los últimos asientos registrados?",
            "¿Qué asientos de este mes mueven el banco?",
            "Muéstrame los asientos de egreso de este mes",
        ],
    ],
    [
        /^\/dashboard\/plan-cuentas(\/|$)/,
        [
            "¿Qué cuentas de gasto tengo en el plan?",
            "¿Qué cuentas de activo tienen saldo?",
            "Busca las cuentas relacionadas con el IVA",
        ],
    ],
];

/**
 * Preguntas sugeridas segun la pantalla abierta. Todas se pueden responder con
 * las herramientas actuales (cuentas, libro mayor, balance y asientos); en las
 * pantallas de modulos que el copiloto aun no cubre van las generales.
 */
export function sugerenciasPara(ruta: string): readonly string[] {
    return SUGERENCIAS_POR_PANTALLA.find(([patron]) => patron.test(ruta))?.[1] ?? PREGUNTAS_SUGERIDAS;
}

/**
 * Cuantas preguntas quedan hoy, aproximadamente: lo que falta del tope diario
 * dividido por lo que cuesta una pregunta (el promedio medido en esta sesion, o
 * una estimacion si aun no hay). El servidor es quien decide: esto solo avisa.
 */
export function preguntasRestantes(tokensHoy: number, tope: number, tokensPorPregunta: number): number {
    const porPregunta = tokensPorPregunta > 0 ? tokensPorPregunta : TOKENS_POR_PREGUNTA_ESTIMADOS;
    return Math.max(0, Math.floor((tope - tokensHoy) / porPregunta));
}

/**
 * A que elemento pasa el foco con Tab (o Shift+Tab) dentro de un dialogo modal,
 * en circulo. `actual` es -1 si el foco esta fuera. -1 si no hay a donde ir.
 */
export function indiceDeFoco(actual: number, total: number, haciaAtras: boolean): number {
    if (total <= 0) return -1;
    if (actual < 0) return haciaAtras ? total - 1 : 0;
    return (actual + (haciaAtras ? -1 : 1) + total) % total;
}

/** null si la pregunta se puede enviar; si no, el motivo para mostrar. */
export function validarPregunta(texto: string): string | null {
    const limpio = texto.trim();
    if (limpio.length === 0) return "Escribe una pregunta.";
    if (limpio.length > MAX_MENSAJE) return `La pregunta puede tener como máximo ${MAX_MENSAJE} caracteres.`;
    return null;
}

type CuerpoChat = { mensaje: string; historial: MensajeHistorial[]; pantalla?: string };

const ERROR_PANTALLA = "La pantalla actual no tiene el formato esperado.";

/**
 * Valida en el servidor lo que manda el navegador antes de reenviarlo. Los
 * tipos de TypeScript no existen en tiempo de ejecucion: cualquiera puede
 * llamar al route handler con lo que quiera. Solo pasan los campos conocidos.
 */
export function validarCuerpoChat(cuerpo: unknown): { ok: true; valor: CuerpoChat } | { ok: false; error: string } {
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
        return { ok: false, error: "La pregunta no tiene el formato esperado." };
    }
    const { mensaje, historial = [], pantalla } = cuerpo as Record<string, unknown>;
    if (typeof mensaje !== "string") return { ok: false, error: "Escribe una pregunta." };
    const errorMensaje = validarPregunta(mensaje);
    if (errorMensaje) return { ok: false, error: errorMensaje };
    if (pantalla !== undefined && !esPantallaValida(pantalla)) return { ok: false, error: ERROR_PANTALLA };
    if (!Array.isArray(historial) || historial.length > MAX_HISTORIAL) {
        return { ok: false, error: "La conversación anterior no tiene el formato esperado." };
    }
    const limpio: MensajeHistorial[] = [];
    for (const item of historial) {
        const m = item as Record<string, unknown> | null;
        const valido =
            !!m &&
            (m.rol === "usuario" || m.rol === "asistente") &&
            typeof m.texto === "string" &&
            m.texto.length > 0 &&
            m.texto.length <= MAX_TEXTO_HISTORIAL;
        if (!valido) return { ok: false, error: "La conversación anterior no tiene el formato esperado." };
        // La pantalla solo acompaña a los mensajes del usuario; en los del asistente se descarta.
        const conPantalla = m.rol === "usuario" && m.pantalla !== undefined;
        if (conPantalla && !esPantallaValida(m.pantalla)) return { ok: false, error: ERROR_PANTALLA };
        limpio.push({
            rol: m.rol as RolChat,
            texto: m.texto as string,
            ...(conPantalla ? { pantalla: m.pantalla as string } : {}),
        });
    }
    return {
        ok: true,
        valor: { mensaje: mensaje.trim(), historial: limpio, ...(pantalla !== undefined ? { pantalla } : {}) },
    };
}

/**
 * Defensa contra CSRF ademas de la cookie SameSite=Lax: el navegador siempre
 * manda Origin en un POST, y tiene que ser este mismo sitio. Detras de un
 * proxy (Vercel) el host publico llega en x-forwarded-host.
 */
export function esMismoOrigen(origen: string | null, host: string | null): boolean {
    if (!origen || !host) return false;
    try {
        return new URL(origen).host === host;
    } catch {
        return false;
    }
}

/** Mensaje para el usuario segun la respuesta HTTP del puente (el 401 se maneja aparte: va al login). */
export function mensajeDeError(status: number, mensajeServidor: string | null): string {
    if (status === 429 || status === 400) return mensajeServidor ?? "No se pudo enviar la pregunta.";
    if (status === 503) return "El copiloto todavía no está disponible en este servidor.";
    if (status === 0 || status === 408 || status === 502 || status === 504) {
        return "No pudimos conectar con el servidor. Puede estar despertando: intenta de nuevo en unos segundos.";
    }
    return "El copiloto tuvo un problema. Intenta de nuevo.";
}
