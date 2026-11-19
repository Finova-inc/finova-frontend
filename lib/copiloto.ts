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
/** Largo maximo del texto seleccionado que se adjunta a una pregunta (src/copiloto/pantalla.ts). */
export const MAX_SELECCION = 1000;
/** Tokens de una pregunta tipica, para estimar cuantas quedan antes de tener una medida. */
const TOKENS_POR_PREGUNTA_ESTIMADOS = 13000;

export type RolChat = "usuario" | "asistente";

/**
 * `pantalla`: lo que la persona tenia abierto al preguntar; `seleccion`: el texto
 * que selecciono y adjunto. Los dos, solo en mensajes del usuario.
 */
export type MensajeHistorial = { rol: RolChat; texto: string; pantalla?: string; seleccion?: string };

/** Linea de un asiento que arma el copiloto. Montos en pesos, solo digitos ("" en el lado sin monto). */
export type LineaPropuesta = { id_cuenta: string; cuenta: string; debe: string; haber: string; glosa: string };

/** Asiento propuesto por el copiloto (proponer_asiento en el backend). No esta registrado. */
export type PropuestaAsiento = {
    fecha: string;
    tipo_comprobante: "I" | "E" | "T";
    glosa: string;
    lineas: LineaPropuesta[];
};

/** GET /copiloto/avisos: lo que el chat sugiere revisar al abrirse (consultas, sin tokens). */
export type AvisosCopiloto = {
    borradores_por_revisar: number;
    mes_en_curso: { anio: number; mes: number; estado: "abierto" | "cerrado" | "sin_abrir" };
};

/** Lo que el backend manda por el stream, un evento por linea `data:`. */
export type EventoChat =
    | { tipo: "texto"; texto: string }
    | { tipo: "herramienta"; nombre: string }
    /** Comprobante citado ("T-15") -> id del asiento, para enlazarlo en la respuesta. */
    | { tipo: "enlaces"; asientos: Record<string, string> }
    | { tipo: "propuesta_asiento"; propuesta: PropuestaAsiento }
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
    estado_periodos: "Revisando los períodos…",
    buscar_borradores: "Revisando los borradores…",
    comparar_meses: "Comparando los meses…",
    revisar_inconsistencias: "Revisando el libro…",
    proponer_asiento: "Armando el asiento…",
};

/** Texto para mostrar mientras el copiloto consulta; nunca el nombre tecnico. */
export function etiquetaHerramienta(nombre: string): string {
    return ETIQUETAS_HERRAMIENTA[nombre] ?? "Consultando tus datos…";
}

const esConteo = (valor: unknown): valor is number =>
    typeof valor === "number" && Number.isFinite(valor) && valor >= 0;

const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATRON_COMPROBANTE = /^[IET]-\d{1,9}$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_PESOS = /^\d{0,15}$/;
const esTextoCorto = (valor: unknown, maximo: number): valor is string =>
    typeof valor === "string" && valor.length <= maximo;

/**
 * Solo los pares comprobante -> id validos, o null si no queda ninguno. Lo
 * leen el stream y la memoria del navegador: los dos son datos ajenos.
 */
export function comoEnlaces(valor: unknown): Record<string, string> | null {
    if (!valor || typeof valor !== "object" || Array.isArray(valor)) return null;
    const pares = Object.entries(valor).filter(
        ([clave, id]) => PATRON_COMPROBANTE.test(clave) && typeof id === "string" && PATRON_UUID.test(id),
    );
    return pares.length > 0 ? (Object.fromEntries(pares) as Record<string, string>) : null;
}

/**
 * Junta los enlaces de varias consultas de una misma respuesta. Si un
 * comprobante apunta a dos asientos (el numero se repite entre anios), queda
 * en "" y no se enlaza: mejor sin enlace que llevar al asiento equivocado.
 */
export function unirEnlaces(
    previos: Readonly<Record<string, string>> | undefined,
    nuevos: Readonly<Record<string, string>>,
): Record<string, string> {
    const unidos: Record<string, string> = { ...previos };
    for (const [clave, id] of Object.entries(nuevos)) {
        unidos[clave] = unidos[clave] === undefined || unidos[clave] === id ? id : "";
    }
    return unidos;
}

/** La propuesta con solo los campos conocidos y validos, o null. */
export function comoPropuesta(valor: unknown): PropuestaAsiento | null {
    if (!valor || typeof valor !== "object") return null;
    const p = valor as Record<string, unknown>;
    if (typeof p.fecha !== "string" || !PATRON_FECHA.test(p.fecha)) return null;
    if (p.tipo_comprobante !== "I" && p.tipo_comprobante !== "E" && p.tipo_comprobante !== "T") return null;
    if (!esTextoCorto(p.glosa, 120) || !Array.isArray(p.lineas) || p.lineas.length < 2 || p.lineas.length > 20) {
        return null;
    }
    const lineas: LineaPropuesta[] = [];
    for (const item of p.lineas) {
        const l = item as Record<string, unknown> | null;
        const valida =
            !!l &&
            typeof l.id_cuenta === "string" &&
            PATRON_UUID.test(l.id_cuenta) &&
            esTextoCorto(l.cuenta, 200) &&
            esTextoCorto(l.debe, 15) &&
            PATRON_PESOS.test(l.debe) &&
            esTextoCorto(l.haber, 15) &&
            PATRON_PESOS.test(l.haber) &&
            esTextoCorto(l.glosa, 120);
        if (!valida) return null;
        lineas.push({
            id_cuenta: l.id_cuenta as string,
            cuenta: l.cuenta as string,
            debe: l.debe as string,
            haber: l.haber as string,
            glosa: l.glosa as string,
        });
    }
    return { fecha: p.fecha, tipo_comprobante: p.tipo_comprobante, glosa: p.glosa, lineas };
}

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
        case "enlaces": {
            const asientos = comoEnlaces(e.asientos);
            return asientos ? { tipo: "enlaces", asientos } : null;
        }
        case "propuesta_asiento": {
            const propuesta = comoPropuesta(e.propuesta);
            return propuesta ? { tipo: "propuesta_asiento", propuesta } : null;
        }
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

/** Texto de 1 a MAX_SELECCION caracteres que no sea solo espacios. El backend cambia los RUT por [RUT]. */
export function esSeleccionValida(valor: unknown): valor is string {
    return typeof valor === "string" && valor.length <= MAX_SELECCION && valor.trim().length > 0;
}

/**
 * Lo que la persona selecciono en la pantalla, listo para adjuntar: sin espacios
 * repetidos (una fila de tabla trae tabulaciones y saltos) y cortado al maximo.
 * null si no queda nada que valga la pena preguntar.
 */
export function recortarSeleccion(texto: string): string | null {
    const limpio = texto
        .replace(/[ \t\u00a0]+/g, " ")
        .replace(/\s*\n\s*/g, "\n")
        .trim();
    if (limpio.length < 2) return null;
    return limpio.length > MAX_SELECCION ? `${limpio.slice(0, MAX_SELECCION - 1)}…` : limpio;
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
        .map(({ rol, texto, pantalla, seleccion }) => ({
            rol,
            texto: texto.trim().slice(0, MAX_TEXTO_HISTORIAL),
            ...(rol === "usuario" && esPantallaValida(pantalla) ? { pantalla } : {}),
            ...(rol === "usuario" && esSeleccionValida(seleccion) ? { seleccion } : {}),
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
    // Antes que el libro diario: estas rutas viven dentro de /dashboard/core-contable.
    [
        /^\/dashboard\/core-contable\/(nuevo|borradores\/[^/]+)$/,
        [
            "¿Qué le falta a este borrador para contabilizarlo?",
            "¿Qué borradores tengo pendientes?",
            "¿Está abierto el mes de este asiento?",
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
 * Suma a las sugerencias de la pantalla las que salen del estado de la empresa
 * (borradores pendientes, mes sin abrir). Van primero; como maximo 4 en total.
 */
export function sugerenciasConAvisos(
    base: readonly string[],
    avisos: AvisosCopiloto | null | undefined,
): readonly string[] {
    if (!avisos) return base;
    const extra: string[] = [];
    const n = avisos.borradores_por_revisar;
    if (n === 1) extra.push("Tengo un borrador sin cuadrar o incompleto: ¿qué le falta?");
    else if (n > 1) extra.push(`Tengo ${n} borradores sin cuadrar o incompletos: ¿qué les falta?`);
    if (avisos.mes_en_curso.estado === "sin_abrir") extra.push("El mes en curso no está abierto: ¿cómo lo abro?");
    return [...extra, ...base].slice(0, 4);
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

/** null si la pregunta se puede enviar; si no, el motivo para mostrar. */
export function validarPregunta(texto: string): string | null {
    const limpio = texto.trim();
    if (limpio.length === 0) return "Escribe una pregunta.";
    if (limpio.length > MAX_MENSAJE) return `La pregunta puede tener como máximo ${MAX_MENSAJE} caracteres.`;
    return null;
}

type CuerpoChat = { mensaje: string; historial: MensajeHistorial[]; pantalla?: string; seleccion?: string };

const ERROR_PANTALLA = "La pantalla actual no tiene el formato esperado.";
const ERROR_SELECCION = `El texto seleccionado puede tener como máximo ${MAX_SELECCION} caracteres.`;

/**
 * Valida en el servidor lo que manda el navegador antes de reenviarlo. Los
 * tipos de TypeScript no existen en tiempo de ejecucion: cualquiera puede
 * llamar al route handler con lo que quiera. Solo pasan los campos conocidos.
 */
export function validarCuerpoChat(cuerpo: unknown): { ok: true; valor: CuerpoChat } | { ok: false; error: string } {
    if (!cuerpo || typeof cuerpo !== "object" || Array.isArray(cuerpo)) {
        return { ok: false, error: "La pregunta no tiene el formato esperado." };
    }
    const { mensaje, historial = [], pantalla, seleccion } = cuerpo as Record<string, unknown>;
    if (typeof mensaje !== "string") return { ok: false, error: "Escribe una pregunta." };
    const errorMensaje = validarPregunta(mensaje);
    if (errorMensaje) return { ok: false, error: errorMensaje };
    if (pantalla !== undefined && !esPantallaValida(pantalla)) return { ok: false, error: ERROR_PANTALLA };
    if (seleccion !== undefined && !esSeleccionValida(seleccion)) return { ok: false, error: ERROR_SELECCION };
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
        const conSeleccion = m.rol === "usuario" && m.seleccion !== undefined;
        if (conSeleccion && !esSeleccionValida(m.seleccion)) return { ok: false, error: ERROR_SELECCION };
        limpio.push({
            rol: m.rol as RolChat,
            texto: m.texto as string,
            ...(conPantalla ? { pantalla: m.pantalla as string } : {}),
            ...(conSeleccion ? { seleccion: m.seleccion as string } : {}),
        });
    }
    return {
        ok: true,
        valor: {
            mensaje: mensaje.trim(),
            historial: limpio,
            ...(pantalla !== undefined ? { pantalla } : {}),
            ...(seleccion !== undefined ? { seleccion } : {}),
        },
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
