"use server";

/* ============================================================================
   Server Actions de "por contabilizar".

   Corren en el servidor con la cookie httpOnly. Quién puede proponer y
   contabilizar (administrador o contador), qué se puede proponer y las
   validaciones del asiento las aplica el backend.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, contabilizacionApi, mensajesDelBackend, type FuncionCuenta, type ProponerInput } from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";

export interface EstadoContabilizacion {
    readonly errores?: readonly string[];
    /** Resumen de lo que salió bien. */
    readonly ok?: string;
    /** Lo que no se pudo, documento por documento. */
    readonly detalle?: readonly string[];
}

function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return ["Tu rol en esta empresa solo permite consultar."];
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

/** Las pantallas que muestran asientos o el estado de los documentos. */
function revalidar() {
    revalidatePath("/dashboard/contabilizacion");
    revalidatePath("/dashboard/core-contable");
    revalidatePath("/dashboard/f29");
}

export async function proponerAsientos(datos: ProponerInput): Promise<EstadoContabilizacion> {
    const token = await exigirTokenSesion();
    if ((datos.documentos?.length ?? 0) + (datos.honorarios?.length ?? 0) === 0) {
        return { errores: ["Marca al menos un documento."] };
    }
    try {
        const r = await contabilizacionApi.proponer(datos, { token });
        revalidar();
        return {
            ok: `${r.creados.length} ${r.creados.length === 1 ? "borrador creado" : "borradores creados"}. Revísalos y contabilízalos.`,
            detalle: r.errores.map((e) => `${e.folio ? `N° ${e.folio}: ` : ""}${e.motivo}`),
        };
    } catch (error) {
        return { errores: traducirError(error, "No pudimos proponer los asientos.") };
    }
}

export async function contabilizarBorradores(borradores: readonly string[]): Promise<EstadoContabilizacion> {
    const token = await exigirTokenSesion();
    if (borradores.length === 0) return { errores: ["No hay borradores para contabilizar."] };
    try {
        const r = await contabilizacionApi.contabilizar(borradores, { token });
        revalidar();
        return {
            ok: `${r.contabilizados} ${r.contabilizados === 1 ? "asiento contabilizado" : "asientos contabilizados"}.`,
            detalle: r.resultados.filter((x) => x.error).map((x) => x.error as string),
        };
    } catch (error) {
        return { errores: traducirError(error, "No pudimos contabilizar los borradores.") };
    }
}

export async function guardarCuentasContabilizacion(
    cuentas: readonly { readonly funcion: FuncionCuenta; readonly id_cuenta: string | null }[],
): Promise<EstadoContabilizacion> {
    const token = await exigirTokenSesion();
    try {
        await contabilizacionApi.guardarCuentas(cuentas, { token });
        revalidar();
        return { ok: "Cuentas guardadas." };
    } catch (error) {
        return { errores: traducirError(error, "No pudimos guardar las cuentas.") };
    }
}
