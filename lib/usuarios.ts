/**
 * Piezas puras de la pantalla de usuarios, sin dependencias.
 *
 * Sin imports de valor (solo de tipos), para que `npm test` las pruebe con
 * node --test. Quien autoriza es el backend: esto solo presenta.
 */

/** Los roles de cat_rol, con lo que permite cada uno en la empresa. */
export const ROLES: readonly { readonly id: number; readonly nombre: string; readonly permite: string }[] = [
    { id: 1, nombre: "Administrador", permite: "Todo, incluida la gestión de usuarios y la reapertura de períodos." },
    { id: 2, nombre: "Contador", permite: "Registra asientos, importa documentos y aprueba el F29. No gestiona usuarios." },
    { id: 3, nombre: "Consulta", permite: "Solo puede ver: no registra ni modifica nada." },
];

export function nombreRol(id: number): string {
    return ROLES.find((r) => r.id === id)?.nombre ?? `Rol ${id}`;
}

/** Solo uno de los tres roles del catálogo. */
export function rolValido(valor: unknown): valor is 1 | 2 | 3 {
    return valor === 1 || valor === 2 || valor === 3;
}

/** Correo con forma de correo: lo valida de verdad el backend (IsEmail). */
export function correoValido(correo: string): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(correo.trim());
}
