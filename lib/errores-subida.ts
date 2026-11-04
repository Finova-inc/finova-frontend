/* ============================================================================
   Mensajes de los errores al subir un archivo del SII.

   Función pura (sin next ni red) para poder probarla con `node --test`.
   ========================================================================== */

/** Mensajes que el backend escribió en el cuerpo de la respuesta, o null si no trae. */
function mensajesDelCuerpo(cuerpo: unknown): string[] | null {
    const mensaje = (cuerpo as { message?: unknown } | null)?.message;
    if (typeof mensaje === "string") return [mensaje];
    if (Array.isArray(mensaje) && mensaje.every((m) => typeof m === "string")) return mensaje as string[];
    return null;
}

/**
 * Mensaje propio para un error HTTP al revisar o importar un archivo, o null si
 * ese código no tiene uno (400, 404, 409 y los demás: los resuelve quien llama
 * con el mensaje del backend o el que tenga por defecto).
 *
 * El 401 no está aquí: no es un mensaje, es redirigir al login.
 */
export function mensajeDeSubida(status: number, cuerpo: unknown): string[] | null {
    if (status === 0 || status === 408) {
        return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
    }
    if (status === 403) return ["Tu rol en esta empresa no permite importar archivos."];
    // El 10 MB es el mismo tope que TAMANO_MAXIMO_ARCHIVO (lib/sii.ts).
    if (status === 413) {
        return ["El archivo es demasiado grande (máximo 10 MB). Revisa que sea el reporte descargado del SII y no uno con más contenido."];
    }
    if (status === 415) {
        return ["Ese formato de archivo no es compatible. Sube el CSV tal como se descarga del SII, sin abrirlo ni guardarlo desde otro programa."];
    }
    if (status === 422) {
        return mensajesDelCuerpo(cuerpo) ?? ["No pudimos leer el archivo. Revisa que sea el reporte del SII y que no esté dañado."];
    }
    if (status >= 500 && status < 600) {
        return ["El servidor tuvo un problema; no es culpa de tu archivo. Reintenta en unos minutos."];
    }
    return null;
}
