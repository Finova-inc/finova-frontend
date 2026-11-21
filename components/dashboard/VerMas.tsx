"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import { useId, useState, type ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";

/**
 * «Ver N más» de las alertas: un boton con aria-expanded que despliega el resto
 * con la altura animada.
 *
 * Antes era un <details> nativo. Para animar la altura (y la salida) hace falta
 * controlar el estado, asi que ahora es un boton; la accesibilidad se conserva
 * con aria-expanded y aria-controls. Cerrado, las filas no estan en el DOM.
 * `children` son las filas ya dibujadas en el servidor.
 */
export function VerMas({ cantidad, children }: { readonly cantidad: number; readonly children: ReactNode }) {
    const [abierto, setAbierto] = useState(false);
    const id = useId();
    const reducido = useReducedMotion();

    return (
        <div className="bg-[var(--surface)]">
            <button
                type="button"
                aria-expanded={abierto}
                aria-controls={id}
                onClick={() => setAbierto((valor) => !valor)}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2 text-left text-sm font-semibold text-[var(--accent-text)] hover:underline"
            >
                {abierto ? "Ver menos" : `Ver ${cantidad} más`}
                <Icon name="chevron" className={`size-4 shrink-0 transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`} />
            </button>
            <AnimatePresence initial={false}>
                {abierto ? (
                    <m.div
                        key="resto"
                        id={id}
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: reducido ? 0 : 0.25, ease: [0.22, 1, 0.36, 1] }}
                        style={{ overflow: "hidden" }}
                    >
                        <div className="flex flex-col gap-px border-t border-[var(--border-subtle)] bg-[var(--border-subtle)]">{children}</div>
                    </m.div>
                ) : null}
            </AnimatePresence>
        </div>
    );
}
