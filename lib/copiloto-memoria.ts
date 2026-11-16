/* ============================================================================
   Copiloto IA: memoria de la conversacion en el navegador.

   La conversacion se guarda en localStorage para recuperarla al recargar o
   reabrir el chat. Solo en el navegador de la persona: el servidor de Finova no
   guarda el texto de ninguna conversacion.

   - Una clave por usuario y empresa: otra persona en el mismo navegador no ve
     la conversacion de alguien mas, y cada empresa tiene la suya.
   - Vence a los 7 dias, y se borra al cerrar sesion (olvidarTodo) o con
     "Nueva conversacion".
   - Nada de aqui lanza: en modo privado, con el almacenamiento lleno o
     bloqueado, el chat sigue funcionando en memoria.
   - Lo guardado se trata como dato ajeno al leerlo: pudo escribirlo otra
     version del sitio o la propia persona desde la consola.
   ========================================================================== */

import { esPantallaValida, type RolChat } from "./copiloto.ts";

export const PREFIJO_MEMORIA = "finova:copiloto:v1:";
export const DIAS_DE_MEMORIA = 7;
export const MAX_MENSAJES_GUARDADOS = 40;
export const MAX_CARACTERES_GUARDADOS = 60000;

const VERSION = 1;
const MS_POR_DIA = 86_400_000;
/** Margen por relojes desajustados: una fecha mas adelantada que esto no se acepta. */
const TOLERANCIA_FUTURO_MS = 5 * 60_000;

export type Valoracion = "util" | "no_util";

/** Un mensaje terminado de la conversacion, tal como se guarda. */
export type MensajeGuardado = {
    id: number;
    rol: RolChat;
    texto: string;
    aviso: string | null;
    /** Pantalla abierta al preguntar (mensajes del usuario). */
    pantalla?: string;
    /** Fila de uso de la respuesta, para valorarla (mensajes del asistente). */
    idUso?: string;
    valoracion?: Valoracion;
};

export type ConversacionGuardada = { guardadoEn: string; mensajes: MensajeGuardado[] };

/** Lo que se usa de localStorage; asi los tests pasan un doble en memoria. */
export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

/** null si falta el usuario o la empresa: sin los dos no se guarda nada. */
export function claveDeMemoria(idUsuario: string | null, idEmpresa: string | null): string | null {
    return idUsuario && idEmpresa ? `${PREFIJO_MEMORIA}${idUsuario}:${idEmpresa}` : null;
}

/** El mensaje con solo los campos conocidos y validos, o null si no tiene la forma minima. */
function comoMensajeGuardado(valor: unknown): MensajeGuardado | null {
    if (!valor || typeof valor !== "object") return null;
    const m = valor as Record<string, unknown>;
    const formaMinima =
        typeof m.id === "number" &&
        Number.isInteger(m.id) &&
        (m.rol === "usuario" || m.rol === "asistente") &&
        typeof m.texto === "string" &&
        (m.aviso === null || typeof m.aviso === "string");
    if (!formaMinima) return null;
    return {
        id: m.id as number,
        rol: m.rol as RolChat,
        texto: m.texto as string,
        aviso: m.aviso as string | null,
        ...(m.rol === "usuario" && esPantallaValida(m.pantalla) ? { pantalla: m.pantalla } : {}),
        ...(typeof m.idUso === "string" && m.idUso.length <= 64 ? { idUso: m.idUso } : {}),
        ...(m.valoracion === "util" || m.valoracion === "no_util" ? { valoracion: m.valoracion } : {}),
    };
}

/** Los ultimos mensajes que caben en los dos limites, descartando los mas antiguos. */
function recortar(mensajes: readonly MensajeGuardado[]): MensajeGuardado[] {
    const ultimos = mensajes.slice(-MAX_MENSAJES_GUARDADOS);
    let total = ultimos.reduce((suma, m) => suma + m.texto.length, 0);
    let desde = 0;
    while (desde < ultimos.length - 1 && total > MAX_CARACTERES_GUARDADOS) {
        total -= ultimos[desde].texto.length;
        desde += 1;
    }
    return ultimos.slice(desde);
}

export function serializarConversacion(mensajes: readonly MensajeGuardado[], ahora: Date): string {
    return JSON.stringify({ v: VERSION, guardadoEn: ahora.toISOString(), mensajes: recortar(mensajes) });
}

/** La conversacion guardada, o null si esta rota, es de otra version, vencio o no tiene mensajes. */
export function restaurarConversacion(texto: string | null, ahora: Date): ConversacionGuardada | null {
    if (!texto) return null;
    let datos: unknown;
    try {
        datos = JSON.parse(texto);
    } catch {
        return null;
    }
    if (!datos || typeof datos !== "object" || Array.isArray(datos)) return null;
    const { v, guardadoEn, mensajes } = datos as Record<string, unknown>;
    if (v !== VERSION || typeof guardadoEn !== "string" || !Array.isArray(mensajes) || mensajes.length === 0) {
        return null;
    }

    const edad = ahora.getTime() - Date.parse(guardadoEn);
    if (Number.isNaN(edad) || edad < -TOLERANCIA_FUTURO_MS || edad > DIAS_DE_MEMORIA * MS_POR_DIA) return null;

    const limpios: MensajeGuardado[] = [];
    for (const mensaje of mensajes) {
        const limpio = comoMensajeGuardado(mensaje);
        if (!limpio) return null;
        limpios.push(limpio);
    }
    return { guardadoEn, mensajes: recortar(limpios) };
}

/** Lee la conversacion de esa clave. Si lo guardado no sirve, lo borra. Nunca lanza. */
export function leerMemoria(almacen: Almacen | null, clave: string | null, ahora: Date): ConversacionGuardada | null {
    if (!almacen || !clave) return null;
    try {
        const texto = almacen.getItem(clave);
        const conversacion = restaurarConversacion(texto, ahora);
        if (!conversacion && texto !== null) almacen.removeItem(clave);
        return conversacion;
    } catch {
        return null;
    }
}

/** Guarda la conversacion; vacia, borra la clave. Nunca lanza. */
export function guardarMemoria(
    almacen: Almacen | null,
    clave: string | null,
    mensajes: readonly MensajeGuardado[],
    ahora: Date,
): void {
    if (!almacen || !clave) return;
    try {
        if (mensajes.length === 0) almacen.removeItem(clave);
        else almacen.setItem(clave, serializarConversacion(mensajes, ahora));
    } catch {
        // Sin almacenamiento (modo privado, cuota llena): la conversacion sigue en memoria.
    }
}

/** Borra las conversaciones guardadas de todos los usuarios de este navegador (al cerrar sesion). Nunca lanza. */
export function olvidarTodo(almacen: Almacen | null): void {
    if (!almacen) return;
    try {
        const claves: string[] = [];
        for (let i = 0; i < almacen.length; i++) {
            const clave = almacen.key(i);
            if (clave?.startsWith(PREFIJO_MEMORIA)) claves.push(clave);
        }
        for (const clave of claves) almacen.removeItem(clave);
    } catch {
        // Nada que hacer: no hay acceso al almacenamiento.
    }
}
