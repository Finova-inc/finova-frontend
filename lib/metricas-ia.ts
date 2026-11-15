/**
 * Cálculos de la página interna de costos de IA (/dashboard/interno/ia):
 * formatos en dólares, porcentajes, presupuesto y simulador.
 *
 * Todo el dinero va en enteros BigInt: micro-dólares (millonésimas de dólar)
 * o pesos. `microUsdAPesos` es el espejo de src/copiloto/precios.ts del
 * backend, con el mismo redondeo: si cambia uno, cambia el otro.
 */

/**
 * Precio del plan Estudio con IVA, el que incluye el copiloto. Copia de
 * components/landing/PricingSection.tsx: Finova no sabe qué plan paga cada
 * empresa, así que la página compara contra este.
 */
export const PRECIO_PLAN_ESTUDIO_CLP = 49900n;

/** Preguntas al mes por usuario, según cuánto usa el copiloto (días hábiles). */
export const PREGUNTAS_POR_PERFIL = { ligero: 110, medio: 330, intenso: 660 } as const;

/** Estimación del 2026-11-14, para simular mientras no hay preguntas medidas. */
export const COSTO_ESTIMADO_POR_PREGUNTA_MICRO_USD = 1700n;

const TOKENS_POR_PREGUNTA_ESTIMADOS = 13000;
const IVA_PORCENTAJE = 19n;

function separarMiles(digitos: string): string {
    return digitos.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
}

/** "945.32" → 94532n. */
function aCentavos(dolar: string): bigint {
    const partes = /^(\d+)(?:\.(\d{1,2}))?$/.exec(dolar);
    if (!partes) throw new Error(`Valor de dólar inválido: ${dolar}`);
    return BigInt(partes[1]) * 100n + BigInt((partes[2] ?? "").padEnd(2, "0"));
}

/** Micro-dólares a pesos enteros, redondeando al peso más cercano. */
export function microUsdAPesos(microUsd: bigint, dolar: string): bigint {
    const divisor = 100_000_000n;
    return (microUsd * aCentavos(dolar) + divisor / 2n) / divisor;
}

/** Precio con IVA a neto, redondeado al peso. */
export function netoSinIva(bruto: bigint): bigint {
    const divisor = 100n + IVA_PORCENTAJE;
    return (bruto * 100n + divisor / 2n) / divisor;
}

/**
 * "4200000" → "US$4,20". Bajo un centavo (y sobre cero) usa 4 decimales,
 * porque el costo de una pregunta es de décimas de centavo: "US$0,0017".
 */
export function formatearUsd(microUsd: string): string {
    const micro = BigInt(microUsd);
    if (micro >= 10_000n || micro === 0n) {
        const centavos = (micro + 5_000n) / 10_000n;
        const entero = separarMiles((centavos / 100n).toString());
        return `US$${entero},${(centavos % 100n).toString().padStart(2, "0")}`;
    }
    const diezmilesimos = (micro + 50n) / 100n;
    return `US$0,${diezmilesimos.toString().padStart(4, "0")}`;
}

/** Porcentaje con un decimal y coma: "1,3%". Sin total, un guion. */
export function porcentaje(parte: bigint, total: bigint): string {
    if (total === 0n) return "—";
    const decimas = (parte * 1000n + total / 2n) / total;
    return `${decimas / 10n},${decimas % 10n}%`;
}

export type EstadoPresupuesto = "sin-presupuesto" | "dentro" | "excedido";

export function estadoPresupuesto(
    proyeccionMicroUsd: string,
    presupuestoMicroUsd: string | null,
): EstadoPresupuesto {
    if (presupuestoMicroUsd === null) return "sin-presupuesto";
    return BigInt(proyeccionMicroUsd) > BigInt(presupuestoMicroUsd) ? "excedido" : "dentro";
}

/** Preguntas al mes de quien llena el tope diario los 30 días. */
export function preguntasMaximasAlMes(topeDiarioTokens: number, tokensPorPregunta: number): number {
    const porPregunta = tokensPorPregunta > 0 ? tokensPorPregunta : TOKENS_POR_PREGUNTA_ESTIMADOS;
    return Math.floor(topeDiarioTokens / porPregunta) * 30;
}

export type Simulacion = {
    readonly costoIaClp: bigint;
    readonly ingresoNetoClp: bigint;
    readonly porcentajeIa: string;
};

/** Costo de IA al mes contra el ingreso neto de IVA, si cada usuario paga `precioPorUsuarioClp`. */
export function simular(e: {
    readonly usuarios: number;
    readonly preguntasPorUsuario: number;
    readonly costoPorPreguntaMicroUsd: bigint;
    readonly dolar: string;
    readonly precioPorUsuarioClp: bigint;
}): Simulacion {
    const usuarios = BigInt(e.usuarios);
    const costoMicroUsd = usuarios * BigInt(e.preguntasPorUsuario) * e.costoPorPreguntaMicroUsd;
    const costoIaClp = microUsdAPesos(costoMicroUsd, e.dolar);
    const ingresoNetoClp = usuarios * netoSinIva(e.precioPorUsuarioClp);
    return { costoIaClp, ingresoNetoClp, porcentajeIa: porcentaje(costoIaClp, ingresoNetoClp) };
}
