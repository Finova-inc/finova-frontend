"use server";

/* ============================================================================
   Server Actions de la importación de archivos del SII.

   El archivo viaja del navegador a Next y de Next al backend: el token vive en
   una cookie httpOnly y solo el servidor de Next puede ponerlo en el header.
   Las reglas de lectura (columnas, RUT, fechas, duplicados) las aplica el
   backend; aquí se traducen sus respuestas.

   Hay dos acciones sobre el mismo archivo: revisarlo (no guarda nada) e
   importarlo. La pantalla pide primero la revisión.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { ApiError, mensajesDelBackend, siiApi, type ImportacionSii, type VistaPreviaSii } from "@/lib/api";
import { IMPORTABLES, periodoValido } from "@/lib/sii";
import { exigirTokenSesion } from "@/lib/session";

export interface EstadoImportacion {
    readonly errores?: readonly string[];
    readonly resultado?: ImportacionSii;
}

export interface EstadoRevision {
    readonly errores?: readonly string[];
    readonly vista?: VistaPreviaSii;
}

/** Igual que el tope del backend (10 MB). */
const MAX_BYTES = 10 * 1024 * 1024;

/** Valida lo que se eligió y arma el FormData que el backend espera, o los mensajes de lo que falta. */
function prepararEnvio(formData: FormData): { envio: FormData } | { errores: string[] } {
    const libro = IMPORTABLES.find((l) => l.id === formData.get("tipo"));
    if (!libro) return { errores: ["Elige qué vas a subir."] };

    const archivo = formData.get("archivo");
    if (!(archivo instanceof File) || archivo.size === 0) {
        return { errores: ["Elige el archivo que descargaste del SII."] };
    }
    if (archivo.size > MAX_BYTES) {
        return { errores: ["El archivo pesa más de 10 MB. Un reporte mensual normal pesa mucho menos: revisa que sea el correcto."] };
    }

    const periodo = periodoValido(String(formData.get("periodo") ?? ""));
    if (libro.esRcv && !periodo) return { errores: ["Indica el período (mes y año) del registro."] };

    // Se arma un FormData nuevo para mandar solo lo que el backend espera.
    const envio = new FormData();
    envio.set("tipo", libro.id);
    if (libro.esRcv && periodo) envio.set("periodo", periodo);
    envio.set("archivo", archivo, archivo.name);
    return { envio };
}

function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return ["Tu rol en esta empresa no permite importar archivos."];
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

/** Revisa el archivo sin guardar nada: qué entraría, qué se rechazaría y los totales. */
export async function previsualizarArchivo(_anterior: EstadoRevision, formData: FormData): Promise<EstadoRevision> {
    const token = await exigirTokenSesion();
    const preparado = prepararEnvio(formData);
    if ("errores" in preparado) return { errores: preparado.errores };

    try {
        return { vista: await siiApi.previsualizar(preparado.envio, { token }) };
    } catch (error) {
        return { errores: traducirError(error, "No pudimos revisar el archivo.") };
    }
}

export async function importarArchivo(_anterior: EstadoImportacion, formData: FormData): Promise<EstadoImportacion> {
    const token = await exigirTokenSesion();
    const preparado = prepararEnvio(formData);
    if ("errores" in preparado) return { errores: preparado.errores };

    try {
        const resultado = await siiApi.importar(preparado.envio, { token });
        revalidatePath("/dashboard/documentos");
        return { resultado };
    } catch (error) {
        return { errores: traducirError(error, "No pudimos importar el archivo.") };
    }
}
