/* Roles de la sesión, sin nada de servidor: lo importan session.ts y los helpers que se prueban con node --test. */

/** Roles de cat_rol en el backend. El rol es el de la empresa activa. */
export const ROL = { ADMINISTRADOR: 1, CONTADOR: 2, CONSULTA: 3 } as const;

/** Administrador o contador: los roles que registran en el libro. */
export function puedeRegistrar(rol: number | null): boolean {
    return rol === ROL.ADMINISTRADOR || rol === ROL.CONTADOR;
}

/** Quienes ven la auditoría; espejo de ROLES_QUE_AUDITAN del backend. Para dar acceso a otro rol, agregarlo aquí. */
export const ROLES_QUE_AUDITAN: readonly number[] = [ROL.ADMINISTRADOR, ROL.CONTADOR];

/** Quienes ven la IP y el navegador de cada evento; espejo de ROLES_QUE_VEN_IP del backend. Para dar acceso a otro rol, agregarlo aquí. */
export const ROLES_QUE_VEN_IP: readonly number[] = [ROL.ADMINISTRADOR];

export function puedeVerIp(rol: number | null): boolean {
    return rol !== null && ROLES_QUE_VEN_IP.includes(rol);
}

/** Quienes ven el correo de quien actuó; espejo de ROLES_QUE_VEN_CORREO del backend. Para dar acceso a otro rol, agregarlo aquí. */
export const ROLES_QUE_VEN_CORREO: readonly number[] = [ROL.ADMINISTRADOR];

export function puedeVerCorreo(rol: number | null): boolean {
    return rol !== null && ROLES_QUE_VEN_CORREO.includes(rol);
}

export function puedeAuditar(rol: number | null): boolean {
    return rol !== null && ROLES_QUE_AUDITAN.includes(rol);
}
