import Link from "next/link";
import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";

/* ============================================================================
   EstadoVacio — lo que se ve cuando no hay nada que mostrar o la consulta falló.

   Un solo diseño para los dos casos: ícono, texto y, si hay algo que hacer,
   un enlace. Un hueco en blanco se lee como "no cargó", no como "no hay
   nada", así que siempre se dice qué pasa.

   El reintento de un error es un Link a la misma ruta (el panel se vuelve a
   pedir al servidor): no hace falta JavaScript.

   `marco` lo dibuja como fila suelta (borde y fondo propios); sin él, va dentro
   de un Panel que ya tiene los suyos.
   ========================================================================== */

type TonoEstado = "neutro" | "positivo" | "critico";

const CAJA_ICONO: Record<TonoEstado, string> = {
    neutro: "bg-[var(--background-raised)] text-[var(--foreground-muted)]",
    positivo: "bg-[var(--positivo-bg)] text-[var(--positivo)]",
    critico: "bg-[var(--critico-bg)] text-[var(--critico)]",
};

export function EstadoVacio({
    icono,
    tono = "neutro",
    titulo,
    children,
    accion,
    marco = false,
}: {
    readonly icono: IconName;
    readonly tono?: TonoEstado;
    /** Frase corta en negrita antes del texto. */
    readonly titulo?: string;
    readonly children?: ReactNode;
    readonly accion?: { readonly texto: string; readonly href: string };
    readonly marco?: boolean;
}) {
    return (
        <div
            role={tono === "critico" ? "alert" : undefined}
            className={`flex animate-aparecer flex-wrap items-center gap-x-3 gap-y-1.5 text-sm ${
                marco ? "rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3" : ""
            }`}
        >
            <span className={`grid size-8 shrink-0 place-items-center rounded-lg ${CAJA_ICONO[tono]}`}>
                <Icon name={icono} className="size-4" />
            </span>
            <p className="min-w-[12rem] flex-1">
                {titulo ? <span className="font-semibold">{titulo} </span> : null}
                <span className="text-[var(--foreground-muted)]">{children}</span>
            </p>
            {accion ? (
                <Link href={accion.href} className="shrink-0 font-semibold text-[var(--accent-text)] hover:underline">
                    {accion.texto} →
                </Link>
            ) : null}
        </div>
    );
}
