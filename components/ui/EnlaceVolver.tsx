"use client";

import Link from "next/link";
import type { MouseEvent } from "react";
import { Icon } from "@/components/ui/Icon";
import { RAIZ_DEL_PANEL, pasosHastaLaPantallaAnterior } from "@/lib/navegacion";

/* ============================================================================
   EnlaceVolver — el "← Volver" de las pantallas del panel.

   ---------------------------------------------------------------------------
   QUE HACE
   ---------------------------------------------------------------------------
   Vuelve a la pantalla del panel desde la que se llegó, tal como quedó: con su
   año, sus filtros y su posición. Hace el trabajo de la flecha "atrás" del
   navegador, pero a la vista y siempre en el mismo lugar.

   No es un "atrás" a ciegas: se salta los otros estados de la misma pantalla
   y los formularios ya enviados de su sección. Esa regla, con sus casos, está
   en lib/navegacion.ts.

   Si no queda una pantalla anterior del panel (el enlace se abrió en una
   pestaña nueva, o se llegó desde fuera), es un enlace normal a `porDefecto`,
   la sección a la que pertenece la pantalla.

   ---------------------------------------------------------------------------
   POR QUE ASI
   ---------------------------------------------------------------------------
   Los filtros de cada pantalla viven en la URL, así que el historial los
   devuelve gratis; un enlace fijo ("volver al libro diario") los pierde.

   Para leer el historial se usa la Navigation API, que solo expone las
   entradas de este mismo sitio. Donde no existe no se adivina con
   history.length, que también cuenta otros sitios: "volver" podría sacar a la
   persona de Finova. Ahí se usa el destino fijo.

   Es un <a> real: sin JavaScript, con clic central o con Ctrl+clic sigue
   llevando a `porDefecto`.
   ========================================================================== */

/** Lo mínimo de la Navigation API que se usa aquí; lib.dom todavía no la trae. */
interface NavegacionDelNavegador {
    readonly currentEntry: { readonly index: number } | null;
    entries(): readonly { readonly url: string | null }[];
}

/** Ruta de una entrada del historial, sin parámetros; null si no se puede leer. */
function rutaDe(url: string | null): string | null {
    if (!url) return null;
    try {
        return new URL(url).pathname;
    } catch {
        return null;
    }
}

export function EnlaceVolver({
    porDefecto = RAIZ_DEL_PANEL,
}: {
    /** Dónde lleva si no hay pantalla anterior: la sección de esta pantalla. */
    readonly porDefecto?: string;
}) {
    function volver(evento: MouseEvent<HTMLAnchorElement>) {
        // Abrir en otra pestaña (Ctrl, Cmd, Shift, botón central) es una
        // navegación nueva: ahí el enlace va a su destino fijo.
        if (evento.button !== 0 || evento.metaKey || evento.ctrlKey || evento.shiftKey || evento.altKey) return;

        const navegacion = (window as unknown as { navigation?: NavegacionDelNavegador }).navigation;
        const indice = navegacion?.currentEntry?.index;
        if (!navegacion || indice === undefined) return;

        const rutas = navegacion.entries().map((entrada) => rutaDe(entrada.url));
        const pasos = pasosHastaLaPantallaAnterior(rutas, indice, porDefecto);
        if (pasos === 0) return;

        evento.preventDefault();
        window.history.go(-pasos);
    }

    return (
        <Link
            href={porDefecto}
            onClick={volver}
            className="no-imprimir -ml-1 mb-1.5 flex w-fit items-center gap-1.5 rounded-md px-1 py-1 text-[12.5px] font-medium text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
        >
            <Icon name="arrowRight" className="size-3.5 rotate-180" />
            Volver
        </Link>
    );
}
