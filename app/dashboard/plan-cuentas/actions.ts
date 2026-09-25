"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, cuentasApi, mensajesDelBackend } from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";

export interface EstadoPlantilla {
    readonly errores?: readonly string[];
    readonly creadas?: number;
}

/**
 * Carga el plan de cuentas base PYME. El backend solo lo acepta de un
 * administrador y en una empresa sin cuentas (409 si ya tiene).
 */
export async function cargarPlanBase(): Promise<EstadoPlantilla> {
    const token = await exigirTokenSesion();

    let creadas: number;
    try {
        creadas = (await cuentasApi.cargarPlantilla({ token })).cuentas_creadas;
    } catch (error) {
        if (error instanceof ApiError) {
            if (error.status === 401) redirect("/login");
            if (error.status === 403) {
                return { errores: ["Solo un administrador de la empresa puede cargar el plan de cuentas."] };
            }
        }
        return { errores: mensajesDelBackend(error) ?? ["No pudimos cargar el plan de cuentas."] };
    }

    revalidatePath("/dashboard/plan-cuentas");
    revalidatePath("/dashboard/core-contable");
    return { creadas };
}
