/* Roles de la sesión, sin nada de servidor: lo importan session.ts y los helpers que se prueban con node --test. */

/** Roles de cat_rol en el backend. El rol es el de la empresa activa. */
export const ROL = { ADMINISTRADOR: 1, CONTADOR: 2, CONSULTA: 3 } as const;

/** Administrador o contador: los roles que registran en el libro. */
export function puedeRegistrar(rol: number | null): boolean {
    return rol === ROL.ADMINISTRADOR || rol === ROL.CONTADOR;
}
