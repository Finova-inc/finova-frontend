"use server";

/* ============================================================================
   Server Actions de terceros.

   Corren siempre en el servidor: leen la cookie httpOnly, llaman a NestJS con
   Bearer y revalidan las pantallas que muestran terceros. Las reglas (RUT
   válido y único, quién puede escribir, RUT fijo con historia) las aplica el
   backend; aquí se repiten solo las de forma, para responder con un mensaje
   claro antes del viaje.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, mensajesDelBackend, tercerosApi, type TerceroInput } from "@/lib/api";
import { formatearRut } from "@/lib/formato";
import { exigirTokenSesion } from "@/lib/session";
import { validarRazonSocial, validateRut } from "@/lib/validation";

export interface EstadoTercero {
    readonly errores?: readonly string[];
    readonly ok?: boolean;
}

function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return ["Tu rol en esta empresa no permite registrar ni editar terceros."];
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

/** Terceros, documentos (enlaza las contrapartes) y libro diario (los ofrece en los asientos). */
function revalidar(idTercero?: string) {
    revalidatePath("/dashboard/terceros");
    if (idTercero) revalidatePath(`/dashboard/terceros/${idTercero}`);
    revalidatePath("/dashboard/documentos");
    revalidatePath("/dashboard/core-contable");
}

/** Mismas reglas de forma que CreateTerceroDto, más al menos un rol. */
function validar(datos: TerceroInput): string[] {
    const errores: string[] = [];
    const rut = validateRut(datos.rut);
    if (!rut.isValid) errores.push(rut.message);
    errores.push(...validarRazonSocial(datos.razon_social));
    if (datos.tipo_persona !== "N" && datos.tipo_persona !== "J") {
        errores.push("Indica si es persona natural o jurídica.");
    }
    if (!datos.es_cliente && !datos.es_proveedor) {
        errores.push("Marca si es cliente, proveedor o ambos.");
    }
    return errores;
}

function normalizado(datos: TerceroInput): TerceroInput {
    return { ...datos, rut: formatearRut(datos.rut.trim()), razon_social: datos.razon_social.trim() };
}

/**
 * Registra un tercero y lleva a su ficha. Si el RUT era de un tercero dado de
 * baja, el backend lo recupera (con su historia) y la ficha lo avisa.
 */
export async function registrarTercero(datos: TerceroInput): Promise<EstadoTercero> {
    const token = await exigirTokenSesion();

    const errores = validar(datos);
    if (errores.length > 0) return { errores };

    let destino: string;
    try {
        const creado = await tercerosApi.crear(normalizado(datos), { token });
        destino = `/dashboard/terceros/${creado.id_tercero}?${creado.recuperado ? "recuperado" : "registrado"}=1`;
    } catch (error) {
        return { errores: traducirError(error, "No pudimos registrar el tercero.") };
    }

    revalidar();
    redirect(destino);
}

export async function editarTercero(id: string, datos: TerceroInput, rutBloqueado: boolean): Promise<EstadoTercero> {
    const token = await exigirTokenSesion();

    const errores = validar(datos);
    if (errores.length > 0) return { errores };

    // Con historia el RUT no se envía: el backend lo rechazaría igual, y así
    // editar el nombre o los roles nunca choca con esa regla.
    const { rut, ...resto } = normalizado(datos);
    try {
        await tercerosApi.actualizar(id, rutBloqueado ? resto : { rut, ...resto }, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos guardar los cambios.") };
    }

    revalidar(id);
    return { ok: true };
}

/** Desactivar lo saca de los asientos nuevos sin perder nada; reactivar lo devuelve. */
export async function cambiarEstadoTercero(id: string, activo: boolean): Promise<EstadoTercero> {
    const token = await exigirTokenSesion();

    try {
        await tercerosApi.actualizar(id, { is_active: activo }, { token });
    } catch (error) {
        return { errores: traducirError(error, activo ? "No pudimos reactivarlo." : "No pudimos desactivarlo.") };
    }

    revalidar(id);
    return { ok: true };
}

/**
 * Baja lógica: la supresión de la Ley 21.719. El tercero deja de aparecer,
 * pero sus documentos y asientos se conservan por obligación tributaria.
 */
export async function darDeBajaTercero(id: string): Promise<EstadoTercero> {
    const token = await exigirTokenSesion();

    try {
        await tercerosApi.darDeBaja(id, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos darlo de baja.") };
    }

    revalidar(id);
    redirect("/dashboard/terceros?baja=1");
}
