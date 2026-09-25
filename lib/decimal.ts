/* ============================================================================
   Aritmetica exacta de pesos en el cliente.

   ---------------------------------------------------------------------------
   POR QUE EXISTE SI "NO SE SUMA DINERO EN EL CLIENTE"
   ---------------------------------------------------------------------------
   La regla del proyecto sigue en pie para todo lo que se GUARDA: la partida
   doble la decide el backend (decimal.util.ts) y un trigger de Postgres. Pero
   el formulario de asientos necesita mostrar mientras se escribe si el
   asiento cuadra, y hacerlo con `Number` y `+` es exactamente el error que la
   regla quiere evitar: un indicador que dice "cuadrado" cuando no lo esta, o
   al reves.

   Aqui se trabaja con BigInt, igual que en el backend. Los pesos no tienen
   decimales (art. 18 del Codigo Tributario: contabilidad en moneda nacional),
   asi que basta con enteros.
   ========================================================================== */

const PATRON_IMPORTE = /^\d+(\.\d+)?$/;

/**
 * Cero como BigInt. Se construye con BigInt() y no con un literal porque el
 * tsconfig del proyecto apunta a ES2017, que no admite literales BigInt.
 */
export const CERO = BigInt(0);

/**
 * Pesos enteros a partir de lo que escribio la persona ('119000') o de lo que
 * devuelve la API ('119000.0000'). Los puntos de miles no se aceptan aqui:
 * soloDigitos() los quita antes. Vacio o invalido cuenta como cero, porque
 * una celda en blanco no aporta al total.
 */
export function aPesos(valor: string | null | undefined): bigint {
    const texto = (valor ?? "").trim();
    if (!PATRON_IMPORTE.test(texto)) return CERO;
    return BigInt(texto.split(".")[0]);
}

export function sumarPesos(valores: readonly (string | null | undefined)[]): bigint {
    return valores.reduce<bigint>((total, valor) => total + aPesos(valor), CERO);
}

/** True si el texto tiene un monto mayor que cero. */
export function tieneMonto(valor: string | null | undefined): boolean {
    return aPesos(valor) > CERO;
}

/** Deja solo los digitos: "119.000" -> "119000". Sin signo ni decimales. */
export function soloDigitos(texto: string): string {
    return texto.replace(/\D/g, "").replace(/^0+(?=\d)/, "");
}

const FORMATO_CLP = new Intl.NumberFormat("es-CL", {
    style: "currency",
    currency: "CLP",
    maximumFractionDigits: 0,
});

/** $1.190.000, sin pasar por Number: Intl acepta BigInt directamente. */
export function formatearPesos(valor: bigint): string {
    return FORMATO_CLP.format(valor);
}

/** 1190000 -> "1.190.000", para mostrar dentro de un campo de monto. */
export function separarMiles(digitos: string): string {
    return digitos === "" ? "" : new Intl.NumberFormat("es-CL").format(BigInt(digitos));
}
