import type { CSSProperties } from "react";

import { HeroDemo } from "@/components/landing/HeroDemo";

/**
 * Sección principal, lo primero que se ve.
 *
 * Formato clásico, tomado de images/image.png: titular y bajada centrados y,
 * debajo, una vista ancha del producto, que aquí es la demo animada del
 * dashboard (HeroDemo). Sin botones: la acción de entrar vive en el header.
 * El fondo es el de la página (papel / negro cálido) con halos de color.
 *
 * El titular va en serifa editorial (Instrument Serif, solo aquí) y se pinta
 * de inmediato, sin animación: con un fade desde opacity 0 la página se veía
 * vacía un instante y se sentía lenta. El resto entra con soft-in, corto y con
 * retrasos mínimos.
 *
 * El padding superior reserva el alto del header, que es fijo y no ocupa
 * espacio en el flujo.
 */

/** Halos de color: degradados estáticos, sin filter: blur. */
const HALOS = [
    "radial-gradient(44rem 30rem at 10% 0%, color-mix(in srgb, var(--hl-orange) var(--halo), transparent), transparent 70%)",
    "radial-gradient(40rem 30rem at 92% 8%, color-mix(in srgb, var(--hl-pink) var(--halo), transparent), transparent 70%)",
    "radial-gradient(60rem 30rem at 50% 70%, color-mix(in srgb, var(--hl-violet) var(--halo), transparent), transparent 70%)",
    "radial-gradient(34rem 24rem at 15% 95%, color-mix(in srgb, var(--hl-mint) var(--halo), transparent), transparent 70%)",
].join(", ");

/** Entrada suave y breve; el retraso escalona los bloques. */
function enter(delayMs: number): CSSProperties {
    return { animation: `soft-in 0.45s cubic-bezier(0.22, 1, 0.36, 1) ${delayMs}ms both` };
}

export function HeroSection() {
    return (
        // El id sirve de destino al enlace "Inicio" del header.
        <section
            id="inicio"
            className="relative overflow-hidden px-5 pb-20 pt-32 sm:px-8 md:pb-24 md:pt-40"
            style={{ backgroundImage: HALOS }}
        >
            <div className="relative mx-auto max-w-4xl text-center">
                <h1 className="font-serif text-[2.75rem] font-normal leading-[1.02] tracking-[-0.015em] text-balance sm:text-6xl lg:text-[5rem]">
                    Tu contabilidad al día,{" "}
                    <br className="hidden sm:block" />
                    {/* Trazo de destacador que desborda un poco la palabra,
                        como al marcar a mano. isolate encierra el -z-10 del
                        trazo: sin él quedaría detrás del fondo de la sección. */}
                    <span className="relative isolate mx-[0.08em] inline-block">
                        <span
                            aria-hidden
                            className="absolute inset-x-[-0.1em] inset-y-[0.14em] -z-10 rounded-[0.15em] bg-[var(--color-highlight)]"
                        />
                        <span className="relative text-ink">cuadrada</span>
                    </span>{" "}
                    y sin digitar
                </h1>

                <p
                    className="mx-auto mt-6 max-w-[38rem] text-lg leading-relaxed text-[var(--foreground-muted)] text-pretty"
                    style={enter(40)}
                >
                    Finova reúne compras, ventas y libros de tu empresa en un solo
                    sistema, y la IA se encarga de la parte repetitiva. Tú revisas
                    y decides.
                </p>
            </div>

            <div className="relative mt-14 md:mt-20" style={enter(80)}>
                <HeroDemo />
            </div>
        </section>
    );
}
