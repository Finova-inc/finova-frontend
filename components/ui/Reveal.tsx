"use client";

import { useEffect, useRef, type ReactNode } from "react";

/**
 * Revela su contenido cuando entra en pantalla.
 *
 * IMPORTANTE PARA QUIEN LO USE: las secciones se pasan como `children` desde un
 * componente de servidor:
 *
 *     <Reveal><AboutSection /></Reveal>        ← correcto
 *
 * Importar la sección DENTRO de este archivo la arrastraría al grafo del
 * cliente y engordaría el bundle en silencio. Al recibirla como children, la
 * sección sigue renderizándose en el servidor.
 */

type RevealProps = {
    readonly children: ReactNode;
    /** Retraso en milisegundos, para escalonar elementos hermanos. */
    readonly delayMs?: number;
    readonly className?: string;
};

export function Reveal({ children, delayMs = 0, className = "" }: RevealProps) {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const element = containerRef.current;

        if (!element) {
            return;
        }

        /**
         * Muestra el contenido de inmediato, sin animación.
         *
         * Se llama en los dos casos en que animar sería incorrecto o imposible.
         */
        const revealImmediately = () => {
            element.dataset.reveal = "true";
        };

        // Caso 1: la persona pidió reducir el movimiento en su sistema.
        // El CSS ya lo cubre, pero dejarlo también aquí evita que el contenido
        // quede invisible si alguna vez cambia la especificidad de esa regla.
        // Tratándose de contenido que podría no verse, la redundancia se justifica.
        const prefersReducedMotion = window.matchMedia(
            "(prefers-reduced-motion: reduce)",
        ).matches;

        // Caso 2: el navegador no soporta IntersectionObserver.
        // El contenido nunca debe quedar oculto por falta de una API.
        const lacksObserverSupport = typeof IntersectionObserver === "undefined";

        if (prefersReducedMotion || lacksObserverSupport) {
            revealImmediately();
            return;
        }

        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        revealImmediately();
                        // Se deja de observar tras el primer disparo: el revelado
                        // ocurre una sola vez y no se repite al volver a subir.
                        observer.unobserve(entry.target);
                    }
                }
            },
            {
                // Se dispara cuando el elemento entró un poco en pantalla, no
                // apenas asoma: la animación acompaña la lectura en vez de
                // adelantarse a ella.
                rootMargin: "0px 0px -10% 0px",
                threshold: 0.1,
            },
        );

        observer.observe(element);

        return () => observer.disconnect();
    }, []);

    return (
        <div
            ref={containerRef}
            /* El servidor y el cliente renderizan ambos "false", así que no hay
               desajuste de hidratación. El observador lo cambia a "true" y la
               transición la hace CSS: escribir un atributo evita un re-render. */
            data-reveal="false"
            style={delayMs > 0 ? { transitionDelay: `${delayMs}ms` } : undefined}
            className={className}
        >
            {children}
        </div>
    );
}
