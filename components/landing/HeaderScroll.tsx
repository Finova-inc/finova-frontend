"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Header fijo que se compacta al hacer scroll.
 *
 * Solo escribe data-compact en el <header>; el cambio de alto y el pliegue
 * del nombre "Finova" los hace CSS (globals.css, .wordmark-letter, y las
 * variantes group-data-[compact=true] de SiteHeader). Mismo patrón que Reveal:
 * escribir un atributo evita un re-render de React.
 *
 * El contenido llega como `children` desde SiteHeader, que es de servidor, así
 * que el marcado del nav no entra al bundle del navegador.
 *
 * Se observa un centinela de 24px pegado al tope del documento en vez de
 * escuchar el evento scroll: el observador no corre en cada píxel de scroll y
 * solo avisa cuando el centinela entra o sale de pantalla.
 */
export function HeaderScroll({ children }: { readonly children: ReactNode }) {
    const sentinelRef = useRef<HTMLDivElement>(null);
    const headerRef = useRef<HTMLElement>(null);

    useEffect(() => {
        const sentinel = sentinelRef.current;
        const header = headerRef.current;

        // Sin IntersectionObserver el header simplemente no se compacta.
        if (!sentinel || !header || typeof IntersectionObserver === "undefined") {
            return;
        }

        const observer = new IntersectionObserver(([entry]) => {
            header.dataset.compact = String(!entry.isIntersecting);
        });

        observer.observe(sentinel);

        return () => observer.disconnect();
    }, []);

    return (
        <>
            <div
                ref={sentinelRef}
                aria-hidden
                className="pointer-events-none absolute inset-x-0 top-0 h-6"
            />

            <header ref={headerRef} data-compact="false" className="site-header-bar group z-50">
                {children}
            </header>
        </>
    );
}
