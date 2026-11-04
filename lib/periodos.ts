/**
 * Reglas de calendario de los períodos contables, sin dependencias.
 *
 * Un solo archivo, sin "use client"/"use server", para importarlo desde la
 * página (Server Component), las acciones y los componentes cliente. Las
 * fechas van como texto 'YYYY-MM-DD' y los meses como números: nada pasa por
 * Date con zona horaria.
 *
 * El backend aplica estas mismas reglas y es quien decide. Aquí se calculan
 * para dibujar la pantalla sin ofrecer lo que la API va a rechazar.
 */

import type { PeriodoContable } from "./api";

/** Primer año admitido, igual que el DTO del backend. */
export const ANIO_MINIMO = 2000;

export interface AnioMes {
    readonly anio: number;
    readonly mes: number;
}

/** Lo mínimo de un período para ubicarlo en el calendario. */
type PeriodoEnCalendario = Pick<PeriodoContable, "anio" | "mes" | "estado">;

export function esAnterior(a: AnioMes, b: AnioMes): boolean {
    return a.anio < b.anio || (a.anio === b.anio && a.mes < b.mes);
}

/** Año y mes de una fecha 'YYYY-MM-DD', sin pasar por Date. */
export function anioMesDe(fecha: string): AnioMes {
    const [anio, mes] = fecha.split("-").map(Number);
    return { anio, mes };
}

/** Último día del mes 'YYYY-MM-DD', sin pasar por la zona horaria. */
export function ultimoDiaDelMes(anio: number, mes: number): string {
    const dosDigitos = (valor: number) => String(valor).padStart(2, "0");
    return `${anio}-${dosDigitos(mes)}-${dosDigitos(new Date(Date.UTC(anio, mes, 0)).getUTCDate())}`;
}

/**
 * True si el mes todavía no comienza.
 *
 * Un mes futuro no se abre: un asiento no admite fecha posterior a hoy (solo
 * se registran operaciones ya ocurridas, art. 27 del Código de Comercio), así
 * que no podría recibir nada. El corte es por mes: el día 1 ya es "en curso".
 */
export function esMesFuturo(periodo: AnioMes, hoy: string): boolean {
    return esAnterior(anioMesDe(hoy), periodo);
}

export type EstadoMes = "abierto" | "cerrado" | "sin-abrir";

export interface MesDelEjercicio<P> {
    readonly anio: number;
    readonly numero: number;
    readonly periodo: P | null;
    readonly estado: EstadoMes;
    /** El mes ya acabó: es el requisito para cerrarlo. */
    readonly terminado: boolean;
    readonly enCurso: boolean;
    /** El mes todavía no comienza: no se abre ni admite asientos. */
    readonly futuro: boolean;
    /** Primer mes abierto anterior a este: los meses se cierran en orden. */
    readonly anteriorAbierto: AnioMes | null;
    /**
     * Mes cerrado más antiguo posterior a este. Abrir un mes que queda detrás
     * de meses cerrados cambia los saldos con que esos meses parten: se
     * advierte antes de hacerlo.
     */
    readonly cerradoPosterior: AnioMes | null;
}

/**
 * Los doce meses de un ejercicio, cada uno con su período (si existe) y lo
 * que el calendario permite hacer con él.
 *
 * `periodos` son todos los de la empresa, no solo los del año: cerrar en
 * orden y la advertencia de meses cerrados miran también los otros años.
 */
export function mesesDelEjercicio<P extends PeriodoEnCalendario>(
    anio: number,
    periodos: readonly P[],
    hoy: string,
): MesDelEjercicio<P>[] {
    const actual = anioMesDe(hoy);
    const enOrden = [...periodos].sort((a, b) => (esAnterior(a, b) ? -1 : esAnterior(b, a) ? 1 : 0));
    const abiertos = enOrden.filter((p) => p.estado === "abierto");
    const cerrados = enOrden.filter((p) => p.estado === "cerrado");
    const delAnio = new Map(periodos.filter((p) => p.anio === anio).map((p) => [p.mes, p]));
    const soloFecha = (p: AnioMes | undefined): AnioMes | null => (p ? { anio: p.anio, mes: p.mes } : null);

    return Array.from({ length: 12 }, (_, indice) => {
        const numero = indice + 1;
        const mes = { anio, mes: numero };
        const periodo = delAnio.get(numero) ?? null;
        return {
            anio,
            numero,
            periodo,
            estado: periodo ? (periodo.estado === "cerrado" ? "cerrado" : "abierto") : "sin-abrir",
            terminado: ultimoDiaDelMes(anio, numero) < hoy,
            enCurso: anio === actual.anio && numero === actual.mes,
            futuro: esMesFuturo(mes, hoy),
            anteriorAbierto: soloFecha(abiertos.find((p) => esAnterior(p, mes))),
            cerradoPosterior: soloFecha(cerrados.find((p) => esAnterior(mes, p))),
        };
    });
}

export interface AniosDelSelector {
    /** Año que queda elegido: el pedido si es válido, o el actual. */
    readonly anio: number;
    /** Años que se ofrecen, de corrido y en orden. */
    readonly anios: readonly number[];
    /** Año anterior al primero ofrecido, para retroceder; null si ya es el mínimo. */
    readonly anterior: number | null;
}

/**
 * Años del selector de ejercicios.
 *
 * Van siempre el año pasado y el actual, y se extiende hacia atrás hasta el
 * año elegido o el más antiguo con períodos, de corrido: un año intermedio
 * vacío tiene que poder elegirse para cargar su historia.
 *
 * El año siguiente no se ofrece, porque en él no se puede abrir nada. Aparece
 * solo si conserva períodos abiertos antes de que existiera esa regla.
 */
export function aniosDelSelector(pedido: number, periodos: readonly AnioMes[], hoy: string): AniosDelSelector {
    const anioHoy = anioMesDe(hoy).anio;
    const conPeriodos = periodos.map((p) => p.anio);
    const ultimo = Math.max(anioHoy, ...conPeriodos);
    const anio = Number.isInteger(pedido) && pedido >= ANIO_MINIMO && pedido <= ultimo ? pedido : anioHoy;
    const primero = Math.max(ANIO_MINIMO, Math.min(anioHoy - 1, anio, ...conPeriodos));

    return {
        anio,
        anios: Array.from({ length: ultimo - primero + 1 }, (_, indice) => primero + indice),
        anterior: primero > ANIO_MINIMO ? primero - 1 : null,
    };
}

/* ----------------------------------------------------------------------------
   Plazo del F29 y resumen del ejercicio.

   Las usan Períodos y el panel: el vencimiento se calcula en un solo lugar.
   Solo presentación; el cálculo de la propuesta es del backend y lib/f29.ts.
   -------------------------------------------------------------------------- */

/**
 * Día del mes siguiente en que vence el F29.
 *
 * shortcut: plazo fijo del día 20 (facturador electrónico que declara y paga por
 * internet; quien no, tiene hasta el 12 o el 28) y sin correr por fin de semana
 * ni feriado. Cambiarlo aquí cambia Períodos y el panel a la vez; un calendario
 * de feriados haría falta si se quiere el día hábil exacto.
 */
export const DIA_VENCE_F29 = 20;

export interface PlazoF29 {
    /** Mes cuyo F29 se declara (no el mes del plazo). */
    readonly anio: number;
    readonly mes: number;
    /** Fecha límite 'YYYY-MM-DD': el día 20 del mes siguiente. */
    readonly vence: string;
    /** Días de hoy al plazo: positivo faltan, 0 vence hoy, negativo ya venció. */
    readonly dias: number;
}

/** El plazo del F29 del mes (anio, mes), visto desde `hoy`. */
export function plazoF29(anio: number, mes: number, hoy: string): PlazoF29 {
    const siguiente = mes === 12 ? { anio: anio + 1, mes: 1 } : { anio, mes: mes + 1 };
    const dosDigitos = (valor: number) => String(valor).padStart(2, "0");
    const vence = `${siguiente.anio}-${dosDigitos(siguiente.mes)}-${dosDigitos(DIA_VENCE_F29)}`;
    const aMilisegundos = (fecha: string) => {
        const [a, m, d] = fecha.split("-").map(Number);
        return Date.UTC(a, m - 1, d);
    };
    return { anio, mes, vence, dias: Math.round((aMilisegundos(vence) - aMilisegundos(hoy)) / 86_400_000) };
}

/**
 * El F29 que toca mirar hoy: hasta el día 20 corre el del mes anterior; pasado
 * el 20, ya no se mira ese y toca el del mes en curso.
 */
export function f29Vigente(hoy: string): AnioMes {
    const { anio, mes } = anioMesDe(hoy);
    const dia = Number(hoy.slice(8, 10));
    if (dia > DIA_VENCE_F29) return { anio, mes };
    return mes === 1 ? { anio: anio - 1, mes: 12 } : { anio, mes: mes - 1 };
}

/** Qué tan urgente es un plazo: de 3 días o menos (o ya vencido) es crítico. */
export function severidadPlazoF29(dias: number): "critica" | "aviso" | "info" {
    if (dias <= 3) return "critica";
    return dias <= 10 ? "aviso" : "info";
}

export interface ResumenDelEjercicio {
    /** Con período abierto, incluidos los que ya terminaron y esperan su cierre. */
    readonly abiertos: number;
    readonly cerrados: number;
    /** Abiertos cuyo mes ya terminó: son un subconjunto de `abiertos`. */
    readonly porCerrar: number;
    /** Meses que ya comenzaron y no tienen período (hay que abrirlos o cargarlos). */
    readonly sinAbrir: number;
    /** Meses que todavía no comienzan y no tienen período. */
    readonly porComenzar: number;
}

/** Cuenta los doce meses del ejercicio por estado, sin dejar ninguno fuera. */
export function resumenDelEjercicio(meses: readonly Pick<MesDelEjercicio<unknown>, "estado" | "terminado" | "futuro">[]): ResumenDelEjercicio {
    const cuenta = (condicion: (m: (typeof meses)[number]) => boolean) => meses.filter(condicion).length;
    return {
        abiertos: cuenta((m) => m.estado === "abierto"),
        cerrados: cuenta((m) => m.estado === "cerrado"),
        porCerrar: cuenta((m) => m.estado === "abierto" && m.terminado),
        sinAbrir: cuenta((m) => m.estado === "sin-abrir" && !m.futuro),
        porComenzar: cuenta((m) => m.estado === "sin-abrir" && m.futuro),
    };
}

/** "vence hoy", "vence en 3 días", "venció hace 1 día": la insignia del aviso del plazo. */
export function insigniaPlazoF29(dias: number): string {
    const plural = (n: number) => `${n} día${n === 1 ? "" : "s"}`;
    if (dias < 0) return `venció hace ${plural(-dias)}`;
    return dias === 0 ? "vence hoy" : `vence en ${plural(dias)}`;
}
