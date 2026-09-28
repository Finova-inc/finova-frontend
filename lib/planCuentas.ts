/**
 * Constantes compartidas del plan de cuentas.
 *
 * Antes existían dos copias independientes del mismo mapa (5 clases de
 * cat_tipo_cuenta): `CLASES` en plan-cuentas/page.tsx y `GRUPOS_CUENTA` en
 * FormularioAsiento.tsx. Un solo archivo, sin "use client"/"use server", para
 * poder importarlo tanto desde un Server Component como desde un cliente.
 */

export interface ClaseDeCuenta {
    readonly id: number;
    readonly nombre: string;
}

/** 1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingreso, 5 Gasto (cat_tipo_cuenta). */
export const CLASES_DE_CUENTA: readonly ClaseDeCuenta[] = [
    { id: 1, nombre: "Activo" },
    { id: 2, nombre: "Pasivo" },
    { id: 3, nombre: "Patrimonio" },
    { id: 4, nombre: "Ingresos" },
    { id: 5, nombre: "Gastos" },
];
