"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type KeyboardEvent, type ReactNode } from "react";
import { Icon, type IconName } from "@/components/ui/Icon";

/* ============================================================================
   Opciones del copiloto anclado (nueva, flotante, ampliar, cerrar), en un menu
   discreto dentro del tablero donde se escribe, para que la columna no tenga
   una barra de botones encima de la conversacion.

   Patron de menu de ARIA: flechas, Inicio/Fin, Escape vuelve al boton y un
   clic afuera lo cierra. Escape no sube hasta el panel (que se cerraria).
   ========================================================================== */

export type OpcionMenu = {
    readonly icono: IconName;
    readonly etiqueta: string;
    readonly descripcion: string;
} & ({ readonly alElegir: () => void; readonly href?: never } | { readonly href: string; readonly alElegir?: () => void });

const ITEM =
    "flex w-full items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] text-[var(--foreground)] outline-none hover:bg-[var(--background-raised)] focus-visible:bg-[var(--background-raised)]";

export function MenuCopiloto({ opciones }: { readonly opciones: readonly OpcionMenu[] }) {
    const [abierto, setAbierto] = useState(false);
    const caja = useRef<HTMLDivElement>(null);
    const disparador = useRef<HTMLButtonElement>(null);
    const lista = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (!abierto) return;
        lista.current?.querySelector<HTMLElement>("[role=menuitem]")?.focus();
        const alTocarAfuera = (e: PointerEvent) => {
            if (!caja.current?.contains(e.target as Node)) setAbierto(false);
        };
        document.addEventListener("pointerdown", alTocarAfuera);
        return () => document.removeEventListener("pointerdown", alTocarAfuera);
    }, [abierto]);

    function cerrar(devolverFoco: boolean) {
        setAbierto(false);
        if (devolverFoco) disparador.current?.focus();
    }

    function alTeclear(e: KeyboardEvent<HTMLDivElement>) {
        const items = [...(lista.current?.querySelectorAll<HTMLElement>("[role=menuitem]") ?? [])];
        const actual = items.indexOf(document.activeElement as HTMLElement);
        const destino =
            e.key === "ArrowDown" ? (actual + 1) % items.length
            : e.key === "ArrowUp" ? (actual - 1 + items.length) % items.length
            : e.key === "Home" ? 0
            : e.key === "End" ? items.length - 1
            : null;
        if (destino !== null) {
            e.preventDefault();
            items[destino]?.focus();
        } else if (e.key === "Escape") {
            e.preventDefault();
            e.stopPropagation();
            cerrar(true);
        } else if (e.key === "Tab") {
            setAbierto(false);
        }
    }

    function contenido(opcion: OpcionMenu): ReactNode {
        return (
            <>
                <Icon name={opcion.icono} className="size-4 shrink-0 text-[var(--foreground-muted)]" />
                <span>{opcion.etiqueta}</span>
            </>
        );
    }

    return (
        <div ref={caja} className="relative">
            <button
                ref={disparador}
                type="button"
                onClick={() => setAbierto(!abierto)}
                aria-haspopup="menu"
                aria-expanded={abierto}
                aria-label="Opciones del copiloto"
                title="Opciones"
                className="grid size-9 place-items-center rounded-lg text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--foreground)] aria-expanded:bg-[var(--background-raised)] aria-expanded:text-[var(--foreground)]"
            >
                <Icon name="more" className="size-4" />
            </button>
            {abierto && (
                <div
                    ref={lista}
                    role="menu"
                    aria-label="Opciones del copiloto"
                    onKeyDown={alTeclear}
                    className="absolute bottom-full right-0 z-20 mb-2 w-40 animate-aparecer rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-1 shadow-[0_8px_24px_rgb(0_0_0/0.18)]"
                >
                    {opciones.map((opcion) =>
                        opcion.href ? (
                            <Link
                                key={opcion.etiqueta}
                                href={opcion.href}
                                role="menuitem"
                                tabIndex={-1}
                                title={opcion.descripcion}
                                onClick={() => {
                                    setAbierto(false);
                                    opcion.alElegir?.();
                                }}
                                className={ITEM}
                            >
                                {contenido(opcion)}
                            </Link>
                        ) : (
                            <button
                                key={opcion.etiqueta}
                                type="button"
                                role="menuitem"
                                tabIndex={-1}
                                title={opcion.descripcion}
                                onClick={() => {
                                    cerrar(false);
                                    opcion.alElegir?.();
                                }}
                                className={ITEM}
                            >
                                {contenido(opcion)}
                            </button>
                        ),
                    )}
                </div>
            )}
        </div>
    );
}
