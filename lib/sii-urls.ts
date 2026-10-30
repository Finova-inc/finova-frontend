/* De dónde sale el archivo que se importa: del computador, o del portal del SII. */

import type { TipoImportacionSii } from "./api";

/**
 * Portal del SII al que lleva "Ir al SII".
 * TODO: confirmar URL del SII. Hoy es solo el dominio; falta la página de descarga de cada reporte.
 */
export const URL_SII = "https://www.sii.cl";

export const TEXTO_DESCARGA_SII = "Descarga el archivo en el SII, vuelve aquí y cambia el origen a Archivo local para subirlo.";

export type OrigenImportacion = "local" | "sii";

/** Cómo se consigue el archivo del SII. Cuando exista la API aparece otra variante (ej.: "archivo"), y solo cambia obtenerArchivoDesdeSii. */
export type ArchivoDesdeSii = { readonly tipo: "redireccion"; readonly url: string };

/** Punto de extensión: hoy el archivo se descarga a mano en el SII; no llama a ninguna API. */
/* Los parámetros aún no se usan: son los que pedirá la API del SII. */
/* eslint-disable-next-line @typescript-eslint/no-unused-vars */
export function obtenerArchivoDesdeSii(_tipo: TipoImportacionSii, _periodo: string): ArchivoDesdeSii {
    return { tipo: "redireccion", url: URL_SII };
}

/** Atributos del enlace "Ir al SII": pestaña nueva, y sin que el SII pueda manejar esta ventana. */
export function atributosDelEnlace(archivo: ArchivoDesdeSii) {
    return { href: archivo.url, target: "_blank", rel: "noopener noreferrer" } as const;
}

/** Lo que ofrece el diálogo de "Elegir archivo": subir del computador o conseguirlo en el SII. */
export function opcionesDeArchivo(archivoSii: ArchivoDesdeSii) {
    return [
        { origen: "local", etiqueta: "Subir desde mi computador", enlace: undefined },
        { origen: "sii", etiqueta: "Ir al SII", enlace: atributosDelEnlace(archivoSii) },
    ] as const;
}

/** Qué se ve según el origen. Con SII no hay archivo que revisar, así que "Revisar" no se envía. */
export function vistaDeOrigen(origen: OrigenImportacion, archivoSii: ArchivoDesdeSii) {
    return {
        campoArchivo: origen === "local",
        botonIrAlSii: origen === "sii" && archivoSii.tipo === "redireccion",
        puedeRevisar: origen === "local",
    };
}
