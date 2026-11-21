import type { MesResumen } from "./api";
import { CERO } from "./decimal.ts";
import { formatearCLP } from "./formato.ts";

/* ============================================================================
   Logica pura del grafico «Ingresos y gastos» del panel: que mes se muestra,
   como se alterna la seleccion, el acumulado del ejercicio y el signo del
   resultado. Vive aqui, y no en el componente, para probarla sin navegador.

   Los montos llegan como string (regla del proyecto) y se suman con BigInt. Los
   de este resumen pueden ser negativos (una nota de credito mayor que las
   ventas), cosa que aPesos de decimal.ts descarta, de ahi pesosConSigno.
   ========================================================================== */

export type MesDelResumen = Pick<MesResumen, "mes" | "ingresos" | "gastos" | "resultado">;

const PATRON_CON_SIGNO = /^-?\d+(\.\d+)?$/;

/** Pesos enteros de un monto de la API, con signo. Vacio o invalido cuenta como cero. */
export function pesosConSigno(valor: string | null | undefined): bigint {
    const texto = (valor ?? "").trim();
    if (!PATRON_CON_SIGNO.test(texto)) return CERO;
    return BigInt(texto.split(".")[0]);
}

/** Un mes tiene movimiento si ingresos o gastos no son cero. */
export function tieneMovimiento(mes: Pick<MesDelResumen, "ingresos" | "gastos">): boolean {
    return pesosConSigno(mes.ingresos) !== CERO || pesosConSigno(mes.gastos) !== CERO;
}

/** El ultimo mes CON movimiento (el que resume el grafico si nadie elige otro); null si ninguno tiene. */
export function mesPorDefecto(meses: readonly MesDelResumen[]): number | null {
    for (let i = meses.length - 1; i >= 0; i--) {
        if (tieneMovimiento(meses[i])) return meses[i].mes;
    }
    return null;
}

/**
 * El mes que se muestra: el elegido, si existe en los datos; si no, el de por
 * defecto. Una seleccion que ya no esta (los datos cambiaron) no deja el grafico
 * sin mes.
 */
export function mesActivo(meses: readonly MesDelResumen[], seleccion: number | null): number | null {
    if (seleccion !== null && meses.some((m) => m.mes === seleccion)) return seleccion;
    return mesPorDefecto(meses);
}

/**
 * Nueva seleccion al hacer clic en `clicado`. Clic en el mes que ya se muestra
 * devuelve null: se vuelve al de por defecto.
 */
export function alternarSeleccion(activo: number | null, clicado: number): number | null {
    return clicado === activo ? null : clicado;
}

export type TonoResultado = "utilidad" | "perdida" | "neutro";

/** Utilidad si es positivo, perdida si es negativo, neutro si es cero. */
export function tonoDelResultado(monto: string): TonoResultado {
    const pesos = pesosConSigno(monto);
    if (pesos === CERO) return "neutro";
    return pesos < CERO ? "perdida" : "utilidad";
}

/** Resultado con signo explicito: "+$1.000", "-$200", "$0". */
export function resultadoConSigno(monto: string): string {
    return `${tonoDelResultado(monto) === "utilidad" ? "+" : ""}${formatearCLP(monto)}`;
}

/** Suma de enero al ultimo mes de los datos (el mes en curso). Montos como string. */
export function acumulado(meses: readonly MesDelResumen[]): { ingresos: string; gastos: string; resultado: string } {
    const suma = (campo: "ingresos" | "gastos" | "resultado") =>
        String(meses.reduce<bigint>((total, m) => total + pesosConSigno(m[campo]), CERO));
    return { ingresos: suma("ingresos"), gastos: suma("gastos"), resultado: suma("resultado") };
}
