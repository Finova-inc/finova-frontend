/* ============================================================================
   Importación de archivos del SII — constantes y helpers de presentación.

   Qué libros hay, cómo se llaman, cómo se arma la URL de la pantalla y cómo
   se nombran los tipos de documento. Las reglas de lectura de los archivos
   viven en el backend (src/sii).
   ========================================================================== */

import type { Cuadratura, TipoImportacionSii } from "./api";

export interface Libro {
    readonly id: Exclude<TipoImportacionSii, "xml">;
    readonly etiqueta: string;
    /** Etiqueta corta, para la pestaña. */
    readonly corta: string;
    /** Los libros del RCV se importan por período; las boletas traen su propia fecha. */
    readonly esRcv: boolean;
}

export const LIBROS: readonly Libro[] = [
    { id: "compras", etiqueta: "Libro de compras", corta: "Compras", esRcv: true },
    { id: "ventas", etiqueta: "Libro de ventas", corta: "Ventas", esRcv: true },
    { id: "honorarios_recibidas", etiqueta: "Honorarios recibidos", corta: "Honorarios recibidos", esRcv: false },
    { id: "honorarios_emitidas", etiqueta: "Honorarios emitidos", corta: "Honorarios emitidos", esRcv: false },
];

/** Lo que se puede subir: los cuatro libros más los DTE (los XML de los documentos). */
export interface Importable {
    readonly id: TipoImportacionSii;
    readonly etiqueta: string;
    readonly esRcv: boolean;
    readonly acepta: string;
    /** Dónde se descarga en el portal del SII. */
    readonly reporte: string;
}

export const IMPORTABLES: readonly Importable[] = [
    { id: "compras", etiqueta: "Libro de compras (CSV)", esRcv: true, acepta: ".csv,.txt,text/csv", reporte: "Registro de Compras y Ventas → Compras → Exportar CSV" },
    { id: "ventas", etiqueta: "Libro de ventas (CSV)", esRcv: true, acepta: ".csv,.txt,text/csv", reporte: "Registro de Compras y Ventas → Ventas → Exportar CSV" },
    { id: "honorarios_recibidas", etiqueta: "Honorarios recibidos (CSV)", esRcv: false, acepta: ".csv,.txt,text/csv", reporte: "Boletas de honorarios → Boletas recibidas → Descargar CSV" },
    { id: "honorarios_emitidas", etiqueta: "Honorarios emitidos (CSV)", esRcv: false, acepta: ".csv,.txt,text/csv", reporte: "Boletas de honorarios → Boletas emitidas → Descargar CSV" },
    { id: "xml", etiqueta: "DTE (XML suelto, sobre EnvioDTE o ZIP)", esRcv: false, acepta: ".xml,.zip,application/xml,text/xml,application/zip", reporte: "Mis DTE → descargar los DTE (archivos XML): sueltos, en un sobre EnvioDTE o en un ZIP" },
];

/**
 * Cookie con lo último que se eligió en el importador (`tipo|periodo`). Vive aquí y no
 * en el componente: un archivo "use client" no puede dar constantes a un Server
 * Component (llega una referencia, no el valor).
 */
export const COOKIE_IMPORTADOR = "finova_importador";

export function importableDe(valor: string | undefined): Importable {
    return IMPORTABLES.find((i) => i.id === valor) ?? IMPORTABLES[0];
}

export function libroDe(valor: string | undefined): Libro {
    return LIBROS.find((libro) => libro.id === valor) ?? LIBROS[0];
}

/** 'AAAA-MM' válido, o undefined. */
export function periodoValido(valor: string | undefined): string | undefined {
    return valor && /^\d{4}-(0[1-9]|1[0-2])$/.test(valor) ? valor : undefined;
}

/** El período `delta` meses después (o antes, si es negativo): ("2026-01", -1) → "2025-12". */
export function mesDesplazado(periodo: string, delta: number): string {
    const [anio, mes] = periodo.split("-").map(Number);
    const indice = anio * 12 + (mes - 1) + delta;
    return `${Math.floor(indice / 12)}-${String((indice % 12) + 1).padStart(2, "0")}`;
}

/** Los parámetros que la pantalla guarda en su URL. */
export interface ParametrosLibro {
    libro: string;
    periodo: string;
    texto?: string;
    tipo?: string;
    estado?: string;
    cuadratura?: string;
    orden?: string;
    dir?: string;
    pagina?: number;
}

/**
 * URL de la pantalla con los parámetros dados. Lo vacío no se escribe. Al
 * cambiar de libro o de período se parte sin filtros: un filtro de compras no
 * significa nada en honorarios.
 */
export function urlLibro(parametros: ParametrosLibro): string {
    const pares = Object.entries(parametros).filter(
        (par): par is [string, string | number] => par[1] !== undefined && par[1] !== "" && par[1] !== 1,
    );
    return `/dashboard/documentos?${new URLSearchParams(pares.map(([k, v]) => [k, String(v)])).toString()}`;
}

/** Códigos de tipo de documento del SII que aparecen en el RCV. */
const NOMBRE_TIPO_DTE: Record<number, string> = {
    30: "Factura",
    32: "Factura de venta exenta",
    33: "Factura electrónica",
    34: "Factura exenta electrónica",
    35: "Boleta",
    38: "Boleta exenta",
    39: "Boleta electrónica",
    41: "Boleta exenta electrónica",
    43: "Liquidación-factura electrónica",
    45: "Factura de compra",
    46: "Factura de compra electrónica",
    52: "Guía de despacho electrónica",
    55: "Nota de débito",
    56: "Nota de débito electrónica",
    60: "Nota de crédito",
    61: "Nota de crédito electrónica",
    110: "Factura de exportación electrónica",
    111: "Nota de débito de exportación",
    112: "Nota de crédito de exportación",
};

export function nombreTipoDte(tipo: number): string {
    return NOMBRE_TIPO_DTE[tipo] ?? `Documento tipo ${tipo}`;
}

/** Los tipos que ofrece el filtro: los que de verdad se ven en un libro del RCV. */
export const TIPOS_DEL_FILTRO = [33, 34, 39, 41, 46, 52, 56, 61] as const;

/** Estados del RCV según el SII. */
export const ESTADOS_RCV = ["Registro", "Pendiente", "Reclamado", "Confirmada"] as const;

export const CUADRATURAS: readonly {
    readonly id: Cuadratura;
    readonly etiqueta: string;
    readonly ayuda: string;
}[] = [
    { id: "cuadra", etiqueta: "Cuadra", ayuda: "Está en el RCV y en el DTE, con los mismos montos" },
    { id: "difiere", etiqueta: "Difiere", ayuda: "Está en el RCV y en el DTE, pero algún monto no coincide" },
    { id: "sin_xml", etiqueta: "Sin DTE", ayuda: "Está en el RCV y todavía no subes su DTE" },
    { id: "solo_xml", etiqueta: "Solo DTE", ayuda: "Subiste su DTE, pero el RCV no lo trae" },
];

/** Resta de dos montos enteros (strings del backend) sin pasar por number. */
export function diferencia(a: string, b: string): string {
    return String(BigInt(a) - BigInt(b));
}
