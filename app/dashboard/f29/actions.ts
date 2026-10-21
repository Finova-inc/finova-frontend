"use server";

/* ============================================================================
   Server Actions del F29.

   Corren en el servidor: leen la cookie httpOnly y llaman a NestJS con Bearer.
   Las reglas (quién puede aprobar, alertas críticas, mes terminado, propuesta
   declarada inmutable) las aplica el backend; aquí se repiten solo las de
   forma, para responder con un mensaje claro antes del viaje.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, f29Api, mensajesDelBackend } from "@/lib/api";
import { aPesosEnteros, folioValido } from "@/lib/f29";
import { exigirTokenSesion } from "@/lib/session";

export interface EstadoF29 {
    readonly errores?: readonly string[];
    readonly ok?: boolean;
}

const PATRON_PERIODO = /^\d{4}-(0[1-9]|1[0-2])$/;
const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;

function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return ["Tu rol en esta empresa solo permite consultar el F29."];
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

/** Ejecuta la llamada y recarga la pantalla; los errores vuelven como mensajes. */
async function ejecutar(periodo: string, llamada: (token: string) => Promise<unknown>, porDefecto: string): Promise<EstadoF29> {
    if (!PATRON_PERIODO.test(periodo)) return { errores: ["El mes no es válido."] };
    const token = await exigirTokenSesion();
    try {
        await llamada(token);
    } catch (error) {
        return { errores: traducirError(error, porDefecto) };
    }
    revalidatePath("/dashboard/f29");
    return { ok: true };
}

/** Guarda el remanente del mes anterior y, si vienen, las dos UTM para reajustarlo. */
export async function guardarRemanenteF29(
    periodo: string,
    datos: { readonly remanente: string; readonly utmAnterior: string; readonly utmActual: string; readonly version?: number },
): Promise<EstadoF29> {
    const remanente = aPesosEnteros(datos.remanente);
    const utmAnterior = aPesosEnteros(datos.utmAnterior);
    const utmActual = aPesosEnteros(datos.utmActual);
    const errores: string[] = [];
    if (remanente === null) errores.push("El remanente tiene que ser un monto en pesos, sin decimales.");
    if (utmAnterior === null || utmActual === null) errores.push("Las UTM tienen que ser montos en pesos, sin decimales.");
    else if ((utmAnterior === "") !== (utmActual === "")) {
        errores.push("Para reajustar hacen falta las dos UTM: la del mes anterior y la del mes que declaras.");
    } else if (utmAnterior === "0" || utmActual === "0") errores.push("La UTM tiene que ser mayor que cero.");
    if (errores.length > 0) return { errores };

    return ejecutar(
        periodo,
        (token) =>
            f29Api.guardarRemanente(
                periodo,
                {
                    remanente_anterior: remanente || "0",
                    utm_anterior: utmAnterior || null,
                    utm_actual: utmActual || null,
                    version: datos.version,
                },
                { token },
            ),
        "No pudimos guardar el remanente.",
    );
}

export async function aprobarF29(periodo: string, alertasRevisadas: boolean, version?: number): Promise<EstadoF29> {
    return ejecutar(
        periodo,
        (token) => f29Api.aprobar(periodo, { alertas_revisadas: alertasRevisadas, version }, { token }),
        "No pudimos aprobar la propuesta.",
    );
}

export async function desaprobarF29(periodo: string): Promise<EstadoF29> {
    return ejecutar(periodo, (token) => f29Api.desaprobar(periodo, { token }), "No pudimos volver la propuesta a borrador.");
}

export async function declararF29(
    periodo: string,
    datos: { readonly folio: string; readonly fecha: string; readonly version?: number },
): Promise<EstadoF29> {
    const errores: string[] = [];
    if (!folioValido(datos.folio)) errores.push("Escribe el folio que te dio el SII, solo con números.");
    if (!PATRON_FECHA.test(datos.fecha)) errores.push("Indica la fecha en que presentaste el F29.");
    if (errores.length > 0) return { errores };

    return ejecutar(
        periodo,
        (token) =>
            f29Api.declarar(periodo, { folio_sii: datos.folio.trim(), fecha_presentacion: datos.fecha, version: datos.version }, { token }),
        "No pudimos registrar la declaración.",
    );
}
