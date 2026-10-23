"use server";

/* ============================================================================
   Server Actions de usuarios.

   Corren en el servidor: leen la cookie httpOnly y llaman a NestJS con Bearer.
   Quién puede gestionar usuarios (solo el administrador), la regla del último
   administrador y la de no quitarse el acceso a sí mismo las aplica el
   backend; aquí se repiten solo las de forma, para responder antes del viaje.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, mensajesDelBackend, usuariosApi } from "@/lib/api";
import { formatearRut } from "@/lib/formato";
import { exigirTokenSesion } from "@/lib/session";
import { correoValido, rolValido } from "@/lib/usuarios";
import { validateNuevaPassword, validateRut } from "@/lib/validation";

export interface EstadoUsuarios {
    readonly errores?: readonly string[];
    /** Mensaje para mostrar cuando salió bien. */
    readonly ok?: string;
}

function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return ["Solo el administrador de la empresa puede gestionar usuarios."];
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

/**
 * Da acceso a una persona. Si el RUT ya tiene cuenta en Finova, solo hacen
 * falta el RUT y el rol; si no, también nombre, correo y contraseña inicial.
 * Como no se sabe de antemano, aquí solo se valida lo que viene escrito.
 */
export async function agregarUsuario(datos: {
    readonly rut: string;
    readonly id_rol: number;
    readonly nombre_completo: string;
    readonly correo: string;
    readonly password: string;
}): Promise<EstadoUsuarios> {
    const token = await exigirTokenSesion();

    const errores: string[] = [];
    const rut = validateRut(datos.rut);
    if (!rut.isValid) errores.push(rut.message);
    if (!rolValido(datos.id_rol)) errores.push("Elige un rol.");
    const nombre = datos.nombre_completo.trim();
    const correo = datos.correo.trim();
    if (nombre && (nombre.length < 3 || nombre.length > 150)) errores.push("El nombre debe tener entre 3 y 150 caracteres.");
    if (correo && !correoValido(correo)) errores.push("El correo no es válido.");
    if (datos.password) {
        const clave = validateNuevaPassword(datos.password);
        if (!clave.isValid) errores.push(clave.message);
    }
    if (errores.length > 0) return { errores };

    try {
        const r = await usuariosApi.agregar(
            {
                rut: formatearRut(datos.rut.trim()),
                id_rol: datos.id_rol,
                // Vacío no se manda: el backend lo exige solo si el RUT no tiene cuenta.
                ...(nombre ? { nombre_completo: nombre } : {}),
                ...(correo ? { correo } : {}),
                ...(datos.password ? { password: datos.password } : {}),
            },
            { token },
        );
        revalidatePath("/dashboard/usuarios");
        return {
            ok: r.vinculado
                ? `${r.nombre_completo} ya tenía cuenta en Finova: ahora también tiene acceso a esta empresa, con su contraseña de siempre.`
                : `Listo: ${r.nombre_completo} ya puede iniciar sesión con su RUT y la contraseña inicial.`,
        };
    } catch (error) {
        return { errores: traducirError(error, "No pudimos agregar a la persona.") };
    }
}

export async function cambiarRolUsuario(id: string, id_rol: number): Promise<EstadoUsuarios> {
    const token = await exigirTokenSesion();
    if (!rolValido(id_rol)) return { errores: ["Elige un rol."] };
    try {
        await usuariosApi.cambiarRol(id, id_rol, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos cambiar el rol.") };
    }
    revalidatePath("/dashboard/usuarios");
    return { ok: "Rol actualizado. Rige desde su próxima acción." };
}

export async function quitarAccesoUsuario(id: string): Promise<EstadoUsuarios> {
    const token = await exigirTokenSesion();
    try {
        const r = await usuariosApi.quitarAcceso(id, { token });
        revalidatePath("/dashboard/usuarios");
        return { ok: r.message };
    } catch (error) {
        return { errores: traducirError(error, "No pudimos quitar el acceso.") };
    }
}
