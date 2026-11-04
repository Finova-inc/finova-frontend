/**
 * Aviso de saldo negativo en "Por cobrar" (clientes), sin dependencias.
 *
 * Un cobro sin venta previa (Caja a Clientes sin factura) deja Clientes con
 * saldo acreedor, que se ve como "-$100" en el panel. Es contablemente válido
 * (un anticipo, o una venta que falta contabilizar), así que solo se avisa:
 * nunca se bloquea el asiento.
 *
 * Se calcula en el navegador con el saldo que ya trae el panel y las líneas del
 * formulario, porque así el aviso sale ANTES de contabilizar y no hace falta
 * tocar el backend. Con BigInt, igual que el resto del formulario.
 */

import { aPesos, CERO } from "./decimal.ts";

/** Rubro del plan base que suma "Por cobrar"; espejo de RUBROS_PANEL.por_cobrar del backend. */
export const RUBRO_POR_COBRAR = "1103";

/** Saldo con signo desde lo que devuelve la API ("-100.0000"); null si no es un monto. */
export function saldoConSigno(texto: string | null | undefined): bigint | null {
    const partes = /^(-?)(\d+(?:\.\d+)?)$/.exec((texto ?? "").trim());
    if (!partes) return null;
    const pesos = aPesos(partes[2]);
    return partes[1] ? -pesos : pesos;
}

interface LineaDelAsiento {
    readonly id_cuenta: string;
    readonly debe: string;
    readonly haber: string;
}

export interface ProyeccionPorCobrar {
    /** Saldo de Por cobrar después de contabilizar este asiento. */
    readonly proyectado: bigint;
    /** Lo que este asiento mueve en Por cobrar: positivo aumenta lo que nos deben, negativo lo reduce. */
    readonly cambio: bigint;
}

/**
 * Cómo quedaría Por cobrar con este asiento, o null si no se puede saber (el
 * saldo actual no cargó) o el asiento no toca cuentas de clientes.
 */
export function proyectarPorCobrar(
    saldoActual: string | null | undefined,
    lineas: readonly LineaDelAsiento[],
    cuentas: readonly { readonly id_cuenta: string; readonly codigo: string }[],
): ProyeccionPorCobrar | null {
    const actual = saldoConSigno(saldoActual);
    if (actual === null) return null;

    const deClientes = new Set(cuentas.filter((c) => c.codigo.startsWith(RUBRO_POR_COBRAR)).map((c) => c.id_cuenta));
    const tocadas = lineas.filter((l) => deClientes.has(l.id_cuenta));
    if (tocadas.length === 0) return null;

    // Clientes es una cuenta deudora: el debe la aumenta y el haber la reduce.
    const cambio = tocadas.reduce((total, l) => total + aPesos(l.debe) - aPesos(l.haber), CERO);
    return { proyectado: actual + cambio, cambio };
}

/** True si el asiento reduce Por cobrar y lo deja bajo cero. Mejorar un saldo ya negativo no es la falta de este asiento. */
export function dejaPorCobrarNegativo(proyeccion: ProyeccionPorCobrar | null): boolean {
    return proyeccion !== null && proyeccion.cambio < CERO && proyeccion.proyectado < CERO;
}
