import Link from "next/link";
import type { ReactNode } from "react";
import { Cifra } from "@/components/ui/Cifra";
import { Etiqueta } from "@/components/ui/Etiqueta";
import type { Cuadratura } from "@/lib/api";
import { CUADRATURAS, urlLibro, type ParametrosLibro } from "@/lib/sii";
import { CLASES_TH } from "../core-contable/partes";

const TONO_CUADRATURA = {
    cuadra: "positivo",
    difiere: "critico",
    sin_xml: "aviso",
    solo_xml: "neutro",
} as const;

/** Pastilla del estado de cuadratura de un documento. */
export function EtiquetaCuadratura({ estado }: { readonly estado: Cuadratura }) {
    const datos = CUADRATURAS.find((c) => c.id === estado);
    return (
        <span title={datos?.ayuda}>
            <Etiqueta tono={TONO_CUADRATURA[estado]}>{datos?.etiqueta ?? estado}</Etiqueta>
        </span>
    );
}

/** Una cifra grande con su título: el resumen de lo que hay en el filtro (la Cifra compacta). */
export function Indicador({ titulo, valor, nota }: { readonly titulo: string; readonly valor: ReactNode; readonly nota?: string }) {
    return <Cifra titulo={titulo} valor={valor} nota={nota} tamano="compacta" />;
}

/**
 * Encabezado de columna que ordena. El primer clic ordena en el sentido
 * natural (fechas y montos, de más a menos; nombres y folios, de la A a la Z);
 * el siguiente lo invierte. La columna activa lleva una flecha y aria-sort.
 */
export function ThOrdenable({
    campo,
    etiqueta,
    base,
    derecha = false,
    primero = "desc",
}: {
    readonly campo: string;
    readonly etiqueta: string;
    readonly base: ParametrosLibro;
    readonly derecha?: boolean;
    readonly primero?: "asc" | "desc";
}) {
    // Sin orden en la URL, el listado ya viene por fecha, de la más nueva a la más vieja.
    const activo = (base.orden ?? "fecha") === campo;
    const dir = base.dir ?? "desc";
    const siguiente = activo ? (dir === "desc" ? "asc" : "desc") : primero;
    return (
        <th
            scope="col"
            aria-sort={activo ? (dir === "asc" ? "ascending" : "descending") : "none"}
            className={`${CLASES_TH} ${derecha ? "text-right" : ""}`}
        >
            <Link
                href={urlLibro({ ...base, orden: campo, dir: siguiente, pagina: undefined })}
                replace
                title={`Ordenar por ${etiqueta.toLowerCase()}`}
                className={`inline-flex items-center gap-1 hover:text-[var(--foreground)] ${activo ? "text-[var(--foreground)]" : ""}`}
            >
                {etiqueta}
                {activo ? <span aria-hidden>{dir === "asc" ? "↑" : "↓"}</span> : null}
            </Link>
        </th>
    );
}
