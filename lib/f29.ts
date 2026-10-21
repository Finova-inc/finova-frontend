/**
 * Piezas puras de la pantalla del F29, sin dependencias.
 *
 * Sin "use client"/"use server" y sin imports de valor (solo de tipos), para
 * usarlas desde la página, las acciones y los componentes cliente, y para que
 * `npm test` las pruebe con node --test. El cálculo de la propuesta vive en el
 * backend (src/f29/f29.calculo.ts); aquí solo se presenta.
 */

import type { AlertaF29, EstadoPropuestaF29, LineaF29, SeccionF29 } from "./api";

const MESES = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

/** El período `delta` meses después (o antes): ("2026-01", -1) → "2025-12". */
export function desplazarMes(periodo: string, delta: number): string {
    const [anio, mes] = periodo.split("-").map(Number);
    const indice = anio * 12 + (mes - 1) + delta;
    return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, "0")}`;
}

/**
 * El F29 que se declara en un mes es el del mes anterior (vence el 12, 20 o 28
 * del mes siguiente): es el que la pantalla abre si no se elige otro.
 */
export function periodoPorDefecto(hoy: string): string {
    return desplazarMes(hoy.slice(0, 7), -1);
}

/** "2026-09" → "septiembre". */
export function nombreDelMes(periodo: string): string {
    return MESES[Number(periodo.slice(5, 7)) - 1] ?? "";
}

/** Cómo se ve cada estado de la propuesta. "sin_guardar": nadie la ha tocado todavía. */
export const ESTADOS: Record<EstadoPropuestaF29 | "sin_guardar", { readonly etiqueta: string; readonly tono: "positivo" | "aviso" | "neutro" }> = {
    sin_guardar: { etiqueta: "Sin revisar", tono: "neutro" },
    borrador: { etiqueta: "Borrador", tono: "neutro" },
    aprobada: { etiqueta: "Aprobada", tono: "aviso" },
    declarada: { etiqueta: "Declarada", tono: "positivo" },
};

/** Las secciones del formulario, en su orden, con el total que las cierra. */
export const SECCIONES: readonly {
    readonly id: SeccionF29;
    readonly titulo: string;
    readonly nota?: string;
}[] = [
    { id: "ventas", titulo: "Información de ventas", nota: "Informativas: no generan débito" },
    { id: "debitos", titulo: "Débitos" },
    { id: "compras", titulo: "Compras sin derecho a crédito", nota: "Informativas: no generan crédito" },
    { id: "creditos", titulo: "Créditos" },
    { id: "retenciones", titulo: "Retenciones de impuesto a la renta" },
];

/** "503 · 502": cantidad y monto; solo el del monto si la línea no lleva cantidad. */
export function codigosDeLinea(linea: Pick<LineaF29, "codigo_cantidad" | "codigo_monto">): string {
    return linea.codigo_cantidad === null ? String(linea.codigo_monto) : `${linea.codigo_cantidad} · ${linea.codigo_monto}`;
}

/** Los filtros de la pantalla de Documentos (ver ParametrosLibro en lib/sii.ts). */
export interface FiltroDocumentos {
    readonly libro: string;
    readonly periodo: string;
    readonly tipo?: string;
    readonly cuadratura?: string;
}

/**
 * De qué libro y tipo de documento sale cada línea, para revisar sus
 * documentos. Las líneas que juntan varios tipos (activo fijo, supermercados)
 * llevan solo el libro.
 */
const ORIGEN_DE_LINEA: Record<string, { readonly libro: string; readonly tipo?: number }> = {
    exportaciones: { libro: "ventas", tipo: 110 },
    ventas_exentas: { libro: "ventas", tipo: 34 },
    facturas_emitidas: { libro: "ventas", tipo: 33 },
    facturas_inmuebles: { libro: "ventas" },
    ventas_no_giro: { libro: "ventas" },
    boletas: { libro: "ventas", tipo: 39 },
    nd_emitidas: { libro: "ventas", tipo: 56 },
    nc_emitidas: { libro: "ventas", tipo: 61 },
    nc_emitidas_no_giro: { libro: "ventas", tipo: 61 },
    compras_sin_credito: { libro: "compras" },
    compras_exentas: { libro: "compras", tipo: 34 },
    facturas_recibidas: { libro: "compras", tipo: 33 },
    supermercados: { libro: "compras", tipo: 33 },
    activo_fijo: { libro: "compras", tipo: 33 },
    nc_recibidas: { libro: "compras", tipo: 61 },
    nd_recibidas: { libro: "compras", tipo: 56 },
    retencion_honorarios: { libro: "honorarios_recibidas" },
};

/** Dónde se revisan los documentos de una línea; null si no salen de documentos (el remanente). */
export function documentosDeLinea(clave: string, periodo: string): FiltroDocumentos | null {
    const origen = ORIGEN_DE_LINEA[clave];
    if (!origen) return null;
    return { libro: origen.libro, periodo, ...(origen.tipo ? { tipo: String(origen.tipo) } : {}) };
}

/** Dónde se revisa lo que señala una alerta; null si no es de documentos. */
export function documentosDeAlerta(alerta: AlertaF29, periodo: string): FiltroDocumentos | null {
    if (!alerta.libro) return null;
    return {
        libro: alerta.libro,
        periodo,
        ...(alerta.tipo_dte ? { tipo: String(alerta.tipo_dte) } : {}),
        ...(alerta.cuadratura ? { cuadratura: alerta.cuadratura } : {}),
    };
}

/**
 * Lo que la persona escribe en un campo de pesos, como el backend lo espera:
 * "$ 1.234.567" → "1234567". Vacío → "". null si trae algo que no es un monto
 * entero (decimales, letras, negativo).
 */
export function aPesosEnteros(texto: string): string | null {
    const limpio = texto.replace(/[\s$.]/g, "");
    if (limpio === "") return "";
    if (!/^\d{1,15}$/.test(limpio)) return null;
    return String(BigInt(limpio));
}

/**
 * Remanente reajustado por la UTM (art. 27 DL 825), igual que el backend:
 * remanente × UTM actual / UTM anterior, redondeado al peso. null si falta
 * algún dato o la UTM anterior es cero.
 */
export function reajustar(remanente: string, utmAnterior: string, utmActual: string): string | null {
    if (!/^\d+$/.test(remanente) || !/^\d+$/.test(utmAnterior) || !/^\d+$/.test(utmActual)) return null;
    const anterior = BigInt(utmAnterior);
    if (anterior === BigInt(0)) return null;
    const dos = BigInt(2);
    return String((BigInt(remanente) * BigInt(utmActual) * dos + anterior) / (dos * anterior));
}

/** Folio de la declaración: solo dígitos, como lo muestra el SII. */
export function folioValido(texto: string): boolean {
    return /^\d{1,20}$/.test(texto.trim());
}
