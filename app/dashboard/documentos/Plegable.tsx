"use client";

import { useState, type ReactNode } from "react";
import { Icon } from "@/components/ui/Icon";

/**
 * Panel que se abre y se cierra con su título. Mantiene lo que lleva dentro
 * aunque se cierre (solo lo oculta), así un formulario a medio llenar o el
 * resultado de una importación no se pierden al plegarlo.
 */
export function Plegable({
    titulo,
    nota,
    abiertoInicial = false,
    children,
}: {
    readonly titulo: string;
    readonly nota?: ReactNode;
    readonly abiertoInicial?: boolean;
    readonly children: ReactNode;
}) {
    const [abierto, setAbierto] = useState(abiertoInicial);
    return (
        <section className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_1px_2px_rgb(20_17_15_/_0.04)]">
            <button
                type="button"
                aria-expanded={abierto}
                onClick={() => setAbierto((valor) => !valor)}
                className="flex w-full items-center justify-between gap-3 px-5 py-3.5 text-left"
            >
                <span className="flex items-baseline gap-3">
                    <span className="font-display text-sm font-semibold">{titulo}</span>
                    {nota ? <span className="text-[12px] text-[var(--foreground-muted)]">{nota}</span> : null}
                </span>
                <Icon name="chevron" className={`size-4 shrink-0 text-[var(--foreground-muted)] transition-transform ${abierto ? "rotate-90" : ""}`} />
            </button>
            <div hidden={!abierto} className="border-t border-[var(--border-subtle)] px-5 pb-5 pt-4">
                {children}
            </div>
        </section>
    );
}
