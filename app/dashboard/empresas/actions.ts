"use server";

/* ============================================================================
   Server Actions de empresas.

   Corren SIEMPRE en el servidor: leen la cookie httpOnly, llaman a NestJS con
   Bearer y revalidan la ruta. El token nunca cruza al cliente.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, empresasApi } from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";

const RUTA_EMPRESAS = "/dashboard/empresas";

/** El backend exige exactamente este formato (CreateEmpresaDto). */
const PATRON_RUT = /^\d{1,2}\.\d{3}\.\d{3}-[0-9K]$/;

export interface EstadoFormulario {
    readonly error?: string;
    readonly ok?: boolean;
}

export async function crearEmpresa(
    _estadoPrevio: EstadoFormulario,
    datosFormulario: FormData,
): Promise<EstadoFormulario> {
    const token = await exigirTokenSesion();

    const rut = String(datosFormulario.get("rut") ?? "").trim().toUpperCase();
    const razonSocial = String(datosFormulario.get("razonSocial") ?? "").trim();

    // Se valida aquí además de en el navegador: un cliente puede saltarse la
    // validación del formulario. Replica las reglas del DTO del backend para
    // dar un mensaje útil en vez de un 400 opaco.
    if (!PATRON_RUT.test(rut)) {
        return { error: "El RUT debe tener el formato 76.123.456-7 (con puntos y guión)." };
    }
    if (razonSocial.length < 3 || razonSocial.length > 150) {
        return { error: "La razón social debe tener entre 3 y 150 caracteres." };
    }

    try {
        await empresasApi.crear({ rut, razonSocial }, { token });
    } catch (error) {
        if (error instanceof ApiError) {
            if (error.status === 401) redirect("/login");
            if (error.status === 400) {
                return { error: "Ya existe una empresa con ese RUT, o los datos no son válidos." };
            }
        }
        return { error: "No pudimos crear la empresa. Inténtalo de nuevo." };
    }

    revalidatePath(RUTA_EMPRESAS);
    return { ok: true };
}

export async function eliminarEmpresa(idEmpresa: string): Promise<EstadoFormulario> {
    const token = await exigirTokenSesion();

    try {
        await empresasApi.eliminar(idEmpresa, { token });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        return { error: "No pudimos eliminar la empresa." };
    }

    revalidatePath(RUTA_EMPRESAS);
    return { ok: true };
}
