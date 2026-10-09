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
