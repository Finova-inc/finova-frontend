/**
 * Piezas puras del módulo de terceros, sin dependencias.
 *
 * Un solo archivo, sin "use client"/"use server", para importarlo desde las
 * páginas, las acciones y los componentes cliente; y sin imports de valor
 * (solo de tipos), para que `npm test` lo pruebe con node --test.
 */

import type { FiltroTerceros, Tercero } from "./api";

/**
 * Umbral que se usa como PISTA para distinguir empresa de persona.
 *
 * No es una regla del SII: el SII no publica rangos de RUT por tipo de
 * contribuyente. Es la convención de bancos y otros sistemas (las sociedades
 * suelen tener RUT sobre 50 millones). Por eso solo se sugiere y la persona
 * confirma. Mismo criterio que terceros.util.ts del backend.
 */
export const UMBRAL_RUT_EMPRESA = 50_000_000;

export interface SugerenciaTipoPersona {
    readonly tipo_persona: "N" | "J";
    readonly motivo: string;
}

/** Sugiere persona natural o jurídica a partir del RUT; null si todavía no se puede leer. */
export function sugerirTipoPersona(rut: string): SugerenciaTipoPersona | null {
    const limpio = rut.replace(/[^0-9kK]/g, "");
    // Sin el dígito verificador no hay cuerpo completo que comparar.
    if (limpio.length < 8) return null;
    const cuerpo = Number(limpio.slice(0, -1));
    return cuerpo >= UMBRAL_RUT_EMPRESA
        ? { tipo_persona: "J", motivo: "RUT sobre 50 millones: suele ser una empresa." }
        : { tipo_persona: "N", motivo: "RUT bajo 50 millones: suele ser una persona natural." };
}

/** "Cliente", "Proveedor", "Cliente y proveedor" o "Sin rol". */
export function nombreRoles(tercero: Pick<Tercero, "es_cliente" | "es_proveedor">): string {
    if (tercero.es_cliente && tercero.es_proveedor) return "Cliente y proveedor";
    if (tercero.es_cliente) return "Cliente";
    if (tercero.es_proveedor) return "Proveedor";
    return "Sin rol";
}

/** Largo máximo de la búsqueda, igual que FiltroTercerosDto. */
const BUSQUEDA_MAX = 100;

/**
 * Filtros del listado leídos de la URL. Lo que no es válido se descarta en
 * vez de mandarlo al backend, que lo rechazaría con un 400.
 */
export function filtrosDesdeUrl(parametros: Record<string, string | string[] | undefined>): FiltroTerceros {
    const texto = (clave: string) => {
        const valor = parametros[clave];
        return typeof valor === "string" ? valor : undefined;
    };
    const buscar = texto("buscar")?.trim().slice(0, BUSQUEDA_MAX);
    const rol = texto("rol");
    const estado = texto("estado");
    return {
        ...(buscar ? { buscar } : {}),
        ...(rol === "cliente" || rol === "proveedor" ? { rol } : {}),
        ...(estado === "activos" || estado === "inactivos" ? { estado } : {}),
    };
}

/**
 * Enlace al formulario de registro con los datos de una contraparte del SII
 * ya propuestos. Lo usan la lista de sugerencias y la pantalla de Documentos.
 */
export function urlRegistrar(datos: {
    readonly rut: string;
    readonly nombre?: string | null;
    readonly comoProveedor: boolean;
    readonly comoCliente: boolean;
    readonly tipo?: "N" | "J";
    readonly motivo?: string;
}): string {
    const rol = datos.comoProveedor && datos.comoCliente ? "ambos" : datos.comoCliente ? "cliente" : "proveedor";
    const pares: [string, string][] = [["rut", datos.rut], ["rol", rol]];
    if (datos.nombre) pares.push(["nombre", datos.nombre]);
    if (datos.tipo) pares.push(["tipo", datos.tipo]);
    if (datos.motivo) pares.push(["motivo", datos.motivo]);
    return `/dashboard/terceros/nuevo?${new URLSearchParams(pares).toString()}`;
}

/** URL del listado con esos filtros; sin filtros, la ruta limpia. */
export function urlTerceros(filtros: FiltroTerceros): string {
    const pares = Object.entries(filtros).filter(([, valor]) => valor !== undefined && valor !== "");
    return pares.length === 0
        ? "/dashboard/terceros"
        : `/dashboard/terceros?${new URLSearchParams(pares as [string, string][]).toString()}`;
}
