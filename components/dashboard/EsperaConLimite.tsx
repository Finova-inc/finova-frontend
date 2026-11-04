"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Boton } from "@/components/ui/Boton";

/** Segundos que se espera en silencio antes de explicar que el servicio está despertando. */
export const LIMITE_DE_ESPERA_MS = 10_000;

/**
 * Pantalla de carga con tope de espera.
 *
 * Tras un rato sin uso, Neon (base) y Render (backend) tardan en despertar y la
 * pantalla se quedaba en "Cargando…" sin decir nada. Pasado el límite se
 * explica qué pasa y se ofrece reintentar, sin quitar el esqueleto: si el
 * servicio despierta, la pantalla aparece sola.
 */
export function EsperaConLimite({
    children,
    textoLector,
    limiteMs = LIMITE_DE_ESPERA_MS,
}: {
    /** El esqueleto de la pantalla. */
    readonly children: ReactNode;
    /** Lo que anuncia un lector de pantalla mientras carga ("Cargando el libro diario…"). */
    readonly textoLector: string;
    /** Se cambia solo en pruebas. */
    readonly limiteMs?: number;
}) {
    const [lento, setLento] = useState(false);

    useEffect(() => {
        const espera = setTimeout(() => setLento(true), limiteMs);
        return () => clearTimeout(espera);
    }, [limiteMs]);

    return (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
            {children}
            <span className="sr-only">{textoLector}</span>
            {lento ? (
                <div className="flex flex-wrap items-center gap-3 rounded-xl bg-[var(--aviso-bg)] p-4 text-[13.5px] text-[var(--foreground)]">
                    <p className="min-w-0 flex-1">
                        <span className="font-semibold">El servicio está despertando.</span> Tras un rato sin uso puede tardar
                        unos segundos más. Si no carga, reintenta.
                    </p>
                    <Boton variante="neutro" onClick={() => window.location.reload()}>
                        Reintentar
                    </Boton>
                </div>
            ) : null}
        </div>
    );
}
