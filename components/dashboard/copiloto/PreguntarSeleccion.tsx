"use client";

import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { recortarSeleccion } from "@/lib/copiloto";
import { seleccionesPendientes } from "./buzon";
import { RUTA_MODULO_COPILOTO } from "./ChatCopiloto";

/* ============================================================================
   Al seleccionar texto en una pantalla del panel aparece, junto a la
   seleccion, un boton "Preguntar al copiloto". Lo deja en el buzon, el panel
   se abre y el chat lo muestra adjunto, con preguntas listas para no escribir.

   - Solo dentro de <main id="contenido-panel">: no en el menu, la cabecera ni
     el propio chat, ni en campos de texto (ahi seleccionar es para editar).
   - Se ubica con la caja de la seleccion y position: fixed. El anclaje de
     CSS (anchor positioning) necesita un elemento como ancla y una seleccion
     no lo es; ademas Firefox aun no lo soporta.
   - onPointerDown cancela el evento por defecto: si no, el clic borraria la
     seleccion antes de leerla.
   - Los RUT del texto los cambia el backend por [RUT] antes del modelo.
   ========================================================================== */

type Posicion = { readonly arriba: number; readonly izquierda: number; readonly texto: string };

const ANCHO_BOTON = 196;
const ALTO_BOTON = 36;
const MARGEN = 8;

/** Lo seleccionado dentro del contenido, o null si no corresponde ofrecer el boton. */
function leerSeleccion(): Posicion | null {
    const seleccion = document.getSelection();
    if (!seleccion || seleccion.isCollapsed || seleccion.rangeCount === 0) return null;
    const rango = seleccion.getRangeAt(0);
    const nodo = rango.commonAncestorContainer;
    const elemento = nodo instanceof Element ? nodo : nodo.parentElement;
    const zona = document.getElementById("contenido-panel");
    if (!zona || !elemento || !zona.contains(elemento)) return null;
    if (elemento.closest("input, textarea, select, [contenteditable='true']")) return null;
    const texto = recortarSeleccion(seleccion.toString());
    if (!texto) return null;

    const caja = rango.getBoundingClientRect();
    if (caja.bottom < 0 || caja.top > window.innerHeight) return null;
    const abajo = caja.bottom + MARGEN;
    // Sin espacio abajo, va arriba de la seleccion.
    const arriba = abajo + ALTO_BOTON > window.innerHeight ? caja.top - MARGEN - ALTO_BOTON : abajo;
    const centro = caja.left + caja.width / 2 - ANCHO_BOTON / 2;
    const izquierda = Math.min(Math.max(centro, MARGEN), window.innerWidth - ANCHO_BOTON - MARGEN);
    return { arriba: Math.max(arriba, MARGEN), izquierda, texto };
}

export function PreguntarSeleccion() {
    const ruta = usePathname();
    const [posicion, setPosicion] = useState<Posicion | null>(null);
    const enModulo = ruta === RUTA_MODULO_COPILOTO;

    useEffect(() => {
        if (enModulo) return;
        let cuadro = 0;
        // Una lectura por cuadro: selectionchange llega muchas veces mientras se arrastra.
        const revisar = () => {
            cancelAnimationFrame(cuadro);
            cuadro = requestAnimationFrame(() => setPosicion(leerSeleccion()));
        };
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === "Escape") setPosicion(null);
        };
        document.addEventListener("selectionchange", revisar);
        // En captura: tambien se desplazan las tablas con scroll propio.
        window.addEventListener("scroll", revisar, { passive: true, capture: true });
        window.addEventListener("resize", revisar, { passive: true });
        window.addEventListener("keydown", alTeclear);
        return () => {
            cancelAnimationFrame(cuadro);
            document.removeEventListener("selectionchange", revisar);
            window.removeEventListener("scroll", revisar, { capture: true });
            window.removeEventListener("resize", revisar);
            window.removeEventListener("keydown", alTeclear);
        };
    }, [enModulo]);

    if (enModulo || !posicion) return null;

    return (
        <button
            type="button"
            onPointerDown={(e) => e.preventDefault()}
            onClick={() => {
                seleccionesPendientes.dejar(posicion.texto);
                document.getSelection()?.removeAllRanges();
                setPosicion(null);
            }}
            style={{ top: posicion.arriba, left: posicion.izquierda, width: ANCHO_BOTON, height: ALTO_BOTON }}
            className="copiloto-tema no-imprimir fixed z-[35] inline-flex items-center justify-center gap-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] text-[12.5px] font-medium text-[var(--foreground)] shadow-[0_8px_24px_rgb(0_0_0/0.18)] transition-colors hover:border-[var(--accent)] hover:text-[var(--accent)]"
        >
            <Icon name="sparkle" className="size-3.5 text-[var(--accent)]" />
            Preguntar al copiloto
        </button>
    );
}
