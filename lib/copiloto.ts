/* ============================================================================
   Copiloto IA: logica pura del chat.

   Vive aqui y no en el componente para probarla sin navegador
   (lib/copiloto.test.mjs). La usan el componente del chat y el route handler
   que hace de puente con el backend (app/api/copiloto/chat/route.ts).

   Los limites son los mismos del DTO del backend (src/copiloto/dto/chat.dto.ts):
   si cambian alla, se cambian aqui.
   ========================================================================== */

export const MAX_MENSAJE = 2000;
export const MAX_HISTORIAL = 10;
export const MAX_TEXTO_HISTORIAL = 4000;

export type RolChat = "usuario" | "asistente";

export type MensajeHistorial = { rol: RolChat; texto: string };

/** Lo que el backend manda por el stream, un evento por linea `data:`. */
export type EventoChat =
    | { tipo: "texto"; texto: string }
    | { tipo: "herramienta"; nombre: string }
    | { tipo: "fin"; motivo: string; aviso: string | null }
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

function esEventoChat(valor: unknown): valor is EventoChat {
    if (!valor || typeof valor !== "object") return false;
    const e = valor as Record<string, unknown>;
    switch (e.tipo) {
        case "texto":
            return typeof e.texto === "string";
        case "herramienta":
            return typeof e.nombre === "string";
        case "fin":
            return typeof e.motivo === "string" && (e.aviso === null || typeof e.aviso === "string");
        case "error":
            return typeof e.mensaje === "string";
        default:
            return false;
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
            const evento: unknown = JSON.parse(datos);
            if (esEventoChat(evento)) eventos.push(evento);
        } catch {
            // JSON roto: se ignora ese evento.
        }
    }
    return { eventos, resto };
}

/**
 * Turnos anteriores que viajan con la pregunta: los ultimos MAX_HISTORIAL con
 * texto, recortados, y empezando por el usuario (la API del modelo lo exige).
 */
export function armarHistorial(mensajes: readonly MensajeHistorial[]): MensajeHistorial[] {
    const conTexto = mensajes
        .map(({ rol, texto }) => ({ rol, texto: texto.trim().slice(0, MAX_TEXTO_HISTORIAL) }))
        .filter((m) => m.texto.length > 0)
        .slice(-MAX_HISTORIAL);
    const inicio = conTexto.findIndex((m) => m.rol === "usuario");
    return inicio === -1 ? [] : conTexto.slice(inicio);
}

/** null si la pregunta se puede enviar; si no, el motivo para mostrar. */
export function validarPregunta(texto: string): string | null {
    const limpio = texto.trim();
    if (limpio.length === 0) return "Escribe una pregunta.";
    if (limpio.length > MAX_MENSAJE) return `La pregunta puede tener como máximo ${MAX_MENSAJE} caracteres.`;
    return null;
}

type CuerpoChat = { mensaje: string; historial: MensajeHistorial[] };

/**
 * Valida en el servidor lo que manda el navegador antes de reenviarlo. Los
 * tipos de TypeScript no existen en tiempo de ejecucion: cualquiera puede
 * llamar al route handler con lo que quiera. Solo pasan los campos conocidos.
 */
export function validarCuerpoChat(cuerpo: unknown): { ok: true; valor: CuerpoChat } | { ok: false; error: string } {
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
        return { ok: false, error: "La pregunta no tiene el formato esperado." };
    }
    const { mensaje, historial = [] } = cuerpo as Record<string, unknown>;
    if (typeof mensaje !== "string") return { ok: false, error: "Escribe una pregunta." };
    const errorMensaje = validarPregunta(mensaje);
    if (errorMensaje) return { ok: false, error: errorMensaje };
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
        limpio.push({ rol: m.rol as RolChat, texto: m.texto as string });
    }
    return { ok: true, valor: { mensaje: mensaje.trim(), historial: limpio } };
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
