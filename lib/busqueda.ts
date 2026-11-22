/* ============================================================================
   Barra de búsqueda del panel: a dónde lleva cada resultado y los recientes.

   Funciones puras (sin React ni red) para probarlas con `node --test`.

   Recientes: lo último que la persona abrió desde la barra, en localStorage.
   - Una clave por usuario y empresa, como la memoria del copiloto: otra
     persona en el mismo navegador no los ve, y cada empresa tiene los suyos.
   - Se borran al cerrar sesión (olvidarRecientes).
   - Nada de aquí lanza: en modo privado o con el almacenamiento bloqueado, la
     barra funciona sin recientes.
   - Lo guardado se trata como dato ajeno al leerlo.
   ========================================================================== */

import type { ResultadoBusqueda, TipoResultadoBusqueda as TipoResultado } from "./api.ts";

export type { ResultadoBusqueda };

export const PREFIJO_RECIENTES = "finova:busqueda:v1:";
export const MAX_RECIENTES = 8;
export const LARGO_MAXIMO_BUSQUEDA = 100;

/** Título de cada grupo, en el orden en que se muestran. */
export const GRUPOS: ReadonlyArray<{ readonly tipo: TipoResultado; readonly titulo: string }> = [
    { tipo: "asiento", titulo: "Asientos" },
    { tipo: "borrador", titulo: "Borradores" },
    { tipo: "tercero", titulo: "Terceros" },
    { tipo: "cuenta", titulo: "Cuentas" },
    { tipo: "documento", titulo: "Documentos del SII" },
];

const TIPOS = new Set<string>(GRUPOS.map((g) => g.tipo));
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** La pantalla de cada resultado. */
export function hrefDe(r: Pick<ResultadoBusqueda, "tipo" | "id">): string {
    const id = encodeURIComponent(r.id);
    switch (r.tipo) {
        case "asiento":
            return `/dashboard/core-contable/${id}`;
        case "borrador":
            return `/dashboard/core-contable/borradores/${id}`;
        case "tercero":
            return `/dashboard/terceros/${id}`;
        case "cuenta":
            return `/dashboard/libro-mayor?cuenta=${id}`;
        case "documento":
            return `/dashboard/documentos/${id}`;
    }
}

/** El resultado con solo los campos conocidos y válidos, o null. Sirve para la respuesta y para lo guardado. */
export function comoResultado(valor: unknown): ResultadoBusqueda | null {
    if (!valor || typeof valor !== "object") return null;
    const r = valor as Record<string, unknown>;
    const valido =
        typeof r.tipo === "string" &&
        TIPOS.has(r.tipo) &&
        typeof r.id === "string" &&
        PATRON_UUID.test(r.id) &&
        typeof r.titulo === "string" &&
        r.titulo.length <= 500 &&
        typeof r.detalle === "string" &&
        r.detalle.length <= 200 &&
        (r.fecha === null || (typeof r.fecha === "string" && /^\d{4}-\d{2}-\d{2}$/.test(r.fecha)));
    if (!valido) return null;
    return {
        tipo: r.tipo as TipoResultado,
        id: r.id as string,
        titulo: r.titulo as string,
        detalle: r.detalle as string,
        fecha: r.fecha as string | null,
    };
}

export function comoResultados(valor: unknown): ResultadoBusqueda[] {
    return Array.isArray(valor) ? valor.map(comoResultado).filter((r): r is ResultadoBusqueda => r !== null) : [];
}

/** Lo que se usa de localStorage; así los tests pasan un doble en memoria. */
export type Almacen = Pick<Storage, "getItem" | "setItem" | "removeItem" | "key" | "length">;

/** null si falta el usuario o la empresa: sin los dos no se guarda nada. */
export function claveRecientes(idUsuario: string | null, idEmpresa: string | null): string | null {
    return idUsuario && idEmpresa ? `${PREFIJO_RECIENTES}${idUsuario}:${idEmpresa}` : null;
}

export function leerRecientes(almacen: Almacen | null, clave: string | null): ResultadoBusqueda[] {
    if (!almacen || !clave) return [];
    try {
        return comoResultados(JSON.parse(almacen.getItem(clave) ?? "[]")).slice(0, MAX_RECIENTES);
    } catch {
        return [];
    }
}

/** Pone el resultado primero (sin repetirlo) y devuelve la lista nueva. */
export function guardarReciente(
    almacen: Almacen | null,
    clave: string | null,
    resultado: ResultadoBusqueda,
): ResultadoBusqueda[] {
    const anteriores = leerRecientes(almacen, clave).filter((r) => !(r.tipo === resultado.tipo && r.id === resultado.id));
    const lista = [resultado, ...anteriores].slice(0, MAX_RECIENTES);
    if (almacen && clave) {
        try {
            almacen.setItem(clave, JSON.stringify(lista));
        } catch {
            // Almacenamiento lleno o bloqueado: la lista vale solo en esta pestaña.
        }
    }
    return lista;
}

/** Al cerrar sesión: borra los recientes de todas las personas y empresas de este navegador. */
export function olvidarRecientes(almacen: Almacen | null): void {
    if (!almacen) return;
    try {
        const claves: string[] = [];
        for (let i = 0; i < almacen.length; i++) {
            const clave = almacen.key(i);
            if (clave?.startsWith(PREFIJO_RECIENTES)) claves.push(clave);
        }
        claves.forEach((c) => almacen.removeItem(c));
    } catch {
        // Bloqueado: no hay nada que borrar.
    }
}
