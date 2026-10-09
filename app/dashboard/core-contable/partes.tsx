import type { ReactNode } from "react";
import Link from "next/link";
import { EnlaceVolver } from "@/components/ui/EnlaceVolver";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import type { AsientoResumen, ReferenciaComprobante } from "@/lib/api";
import { formatearComprobante } from "@/lib/formato";

/* ============================================================================
   Piezas compartidas por las pantallas del libro diario. Server Components:
   no tienen estado, y asi no llegan al bundle del navegador.
   ========================================================================== */

/**
 * Encabezado de una pantalla del panel: "← Volver", título, descripción y
 * acciones.
 *
 * `volverA` es la sección a la que pertenece la pantalla, y solo hace falta
 * en detalles y formularios (el detalle de un asiento pertenece al libro
 * diario). Ver components/ui/EnlaceVolver.tsx.
 */
export function Encabezado({
    titulo,
    descripcion,
    acciones,
    volverA,
}: {
    readonly titulo: string;
    readonly descripcion?: ReactNode;
    readonly acciones?: ReactNode;
    readonly volverA?: string;
}) {
    return (
        <div className="mb-6 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
                <EnlaceVolver porDefecto={volverA} />
                <h1 className="font-display text-xl font-semibold tracking-[-0.015em]">{titulo}</h1>
                {descripcion ? (
                    <p className="mt-1 max-w-2xl text-[13.5px] text-[var(--foreground-muted)]">{descripcion}</p>
                ) : null}
            </div>
            {acciones ? <div className="no-imprimir flex shrink-0 flex-wrap gap-2">{acciones}</div> : null}
        </div>
    );
}

type TonoAviso = "critico" | "aviso" | "neutro";

const TONOS_AVISO: Record<TonoAviso, string> = {
    critico: "bg-[var(--critico-bg)] text-[var(--critico)]",
    aviso: "bg-[var(--aviso-bg)] text-[var(--foreground)]",
    neutro: "border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground-muted)]",
};

/** Bloque de aviso. `critico` se anuncia como alerta; los demas no interrumpen. */
export function Aviso({
    tono = "neutro",
    children,
}: {
    readonly tono?: TonoAviso;
    readonly children: ReactNode;
}) {
    return (
        <div
            role={tono === "critico" ? "alert" : undefined}
            className={`rounded-xl p-4 text-[13.5px] ${TONOS_AVISO[tono]}`}
        >
            {children}
        </div>
    );
}

/**
 * Guía plegable de buenas prácticas de una pantalla.
 *
 * <details> nativo: se abre con teclado y lector de pantalla sin JavaScript,
 * y cerrada no le roba espacio a la tarea.
 */
export function Guia({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
    return (
        <details className="group no-imprimir rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
            <summary className="flex cursor-pointer list-none items-center gap-2.5 rounded-xl px-4 py-3 text-[13.5px] font-medium transition-colors hover:bg-[var(--background-raised)] [&::-webkit-details-marker]:hidden">
                <Icon name="info" className="size-4 shrink-0 text-[var(--accent)]" />
                {titulo}
                <Icon
                    name="chevron"
                    className="ml-auto size-4 shrink-0 text-[var(--foreground-muted)] transition-transform duration-150 group-open:rotate-90"
                />
            </summary>
            <div className="flex flex-col gap-4 border-t border-[var(--border-subtle)] p-4">{children}</div>
        </details>
    );
}

/** Lista de reglas de una Guia, cada una con su marca de verificación. */
export function ReglasGuia({ reglas }: { readonly reglas: readonly string[] }) {
    return (
        <ul className="flex max-w-3xl flex-col gap-2 text-[13px] text-[var(--foreground-muted)]">
            {reglas.map((regla) => (
                <li key={regla} className="flex gap-2.5">
                    <Icon name="check" className="mt-0.5 size-4 shrink-0 text-[var(--positivo)]" />
                    <span>{regla}</span>
                </li>
            ))}
        </ul>
    );
}

/** Enlace con aspecto de boton principal. */
export function EnlaceAccion({
    href,
    children,
    variante = "acento",
}: {
    readonly href: string;
    readonly children: ReactNode;
    readonly variante?: "acento" | "neutro";
}) {
    const clases =
        variante === "acento"
            ? "border-[var(--accent)] bg-[var(--accent)] font-semibold text-white hover:brightness-110"
            : "border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--background-raised)]";
    return (
        <Link
            href={href}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-[background-color,filter] ${clases}`}
        >
            {children}
        </Link>
    );
}

/** Enlace a otro comprobante, citado como "T-12 / 2026". */
export function EnlaceComprobante({ referencia }: { readonly referencia: ReferenciaComprobante }) {
    return (
        <Link
            href={`/dashboard/core-contable/${referencia.id_asiento}`}
            className="tabular font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        >
            {formatearComprobante(referencia.tipo_comprobante, referencia.numero, referencia.anio)}
        </Link>
    );
}

/** Estado de un comprobante: el color acompana al texto, no lo reemplaza. */
export function EtiquetasDeEstado({
    asiento,
    revertidoPor,
}: {
    readonly asiento: AsientoResumen;
    readonly revertidoPor: ReferenciaComprobante | null;
}) {
    return (
        <span className="inline-flex flex-wrap gap-1">
            {revertidoPor ? <Etiqueta tono="aviso">Revertido</Etiqueta> : null}
            {asiento.origen === "reversa" ? <Etiqueta tono="neutro">Reversa</Etiqueta> : null}
            {asiento.origen === "apertura" ? <Etiqueta tono="neutro">Apertura</Etiqueta> : null}
            {!revertidoPor && asiento.origen !== "reversa" ? (
                <Etiqueta tono="positivo">Contabilizado</Etiqueta>
            ) : null}
        </span>
    );
}

/** Clases de las celdas de cabecera de tabla, iguales en todo el modulo. */
export const CLASES_TH =
    "px-4 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]";
