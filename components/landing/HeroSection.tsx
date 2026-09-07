import Link from "next/link";

import { ProcessSequence } from "@/components/landing/ProcessSequence";
import { Icon } from "@/components/ui/Icon";

/**
 * Sección principal, lo primero que se ve.
 *
 * El mensaje posiciona a Finova como un SaaS contable completo —intuitivo,
 * centralizado y automatizado con IA— y no como una herramienta de un solo
 * trámite.
 *
 * Lleva una imagen de fondo con opacidad baja, para dar textura sin competir con
 * el texto. La imagen es un marcador de posición generado en SVG; se reemplaza
 * cambiando la constante HERO_BACKGROUND_URL.
 *
 * No se envuelve en Reveal a propósito: está sobre la línea de flotación, y
 * animar la entrada de algo ya visible se lee como un tartamudeo de carga y
 * perjudica la métrica LCP.
 */

/**
 * Imagen de fondo del hero, provisional.
 *
 * Es un SVG embebido como data URI, así que no agrega ninguna petición de red.
 * Dibuja una retícula tenue, que evoca el papel cuadriculado de un libro
 * contable sin representar nada literal.
 *
 * PARA REEMPLAZAR: dejar la imagen definitiva en public/ y cambiar esta
 * constante por su ruta, por ejemplo: url("/hero-background.jpg")
 */
const HERO_BACKGROUND_URL = `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='120' viewBox='0 0 120 120'%3E%3Cg fill='none' stroke='%23FF6A1A' stroke-width='0.6'%3E%3Cpath d='M0 30h120M0 60h120M0 90h120M30 0v120M60 0v120M90 0v120'/%3E%3C/g%3E%3Ccircle cx='60' cy='60' r='2' fill='%23FF6A1A'/%3E%3C/svg%3E")`;

export function HeroSection() {
    return (
        // El id sirve de destino al enlace "Inicio" del header.
        <section
            id="inicio"
            className="relative overflow-hidden px-5 pb-16 pt-14 sm:px-8 md:pb-24 md:pt-20"
        >
            {/* -------------------------------------------------------------------
                Fondo de imagen con opacidad.

                Va en una capa propia y no como background del <section> para
                poder bajarle la opacidad sin afectar al contenido. La máscara
                radial lo desvanece hacia los bordes, evitando el corte duro.
                ------------------------------------------------------------------- */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-[0.07] dark:opacity-[0.12]"
                style={{
                    backgroundImage: HERO_BACKGROUND_URL,
                    backgroundSize: "120px 120px",
                    maskImage:
                        "radial-gradient(ellipse 90% 80% at 50% 35%, black 20%, transparent 85%)",
                    WebkitMaskImage:
                        "radial-gradient(ellipse 90% 80% at 50% 35%, black 20%, transparent 85%)",
                }}
            />

            {/* Halo cálido detrás del titular, que da profundidad al fondo. */}
            <div
                aria-hidden
                className="pointer-events-none absolute inset-0 opacity-30"
                style={{
                    background:
                        "radial-gradient(ellipse 45% 55% at 18% 28%, var(--color-marker), transparent 70%)",
                    filter: "blur(80px)",
                }}
            />

            <div className="relative mx-auto grid w-full max-w-6xl items-center gap-14 lg:grid-cols-[1.05fr_1fr] lg:gap-16">
                {/* ---------------------------------------------------------------
                    Columna de texto

                    min-w-0 es imprescindible: los elementos de un grid tienen
                    min-width:auto por omisión, así que se niegan a encogerse por
                    debajo del ancho de su contenido. Sin esto, un texto largo
                    ensancha la columna y la página termina con scroll horizontal
                    en móvil.
                    --------------------------------------------------------------- */}
                <div className="min-w-0">
                    <h1 className="font-display text-[2.15rem] font-bold leading-[1.06] tracking-[-0.02em] text-balance sm:text-5xl md:text-6xl lg:text-[4.1rem]">
                        Toda tu contabilidad,{" "}
                        {/* El resaltado se dibuja con un fondo desplazado detrás
                            del texto, para imitar el trazo de un destacador que
                            desborda un poco la palabra, como al marcar a mano.

                            El margen horizontal compensa ese desborde: sin él, el
                            trazo se comería el espacio con la palabra siguiente. */}
                        <span className="relative mx-[0.15em] inline-block">
                            <span
                                aria-hidden
                                className="absolute inset-x-[-0.15em] inset-y-[0.12em] -z-10 rounded-[0.2em] bg-[var(--color-highlight)]"
                            />
                            <span className="relative text-ink">en un lugar</span>
                        </span>{" "}
                        y en automático.
                    </h1>

                    <p className="mt-7 max-w-[34rem] text-lg leading-relaxed text-[var(--foreground-muted)] text-pretty">
                        Finova centraliza el trabajo contable de tu empresa y lo
                        automatiza con inteligencia artificial. Sin planillas
                        sueltas, sin digitación y sin sistemas que no se hablan
                        entre sí.
                    </p>

                    <div className="mt-9 flex flex-wrap items-center gap-3">
                        <Link
                            href="/login"
                            className="inline-flex items-center gap-2 rounded-full bg-[var(--accent)] px-6 py-3.5 font-display text-[15px] font-medium text-white transition-opacity hover:opacity-90"
                        >
                            Entrar
                            <Icon name="arrowRight" className="size-4" />
                        </Link>

                        <a
                            href="#producto"
                            className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] px-6 py-3.5 font-display text-[15px] font-medium transition-colors hover:bg-[var(--background-raised)]"
                        >
                            Ver cómo funciona
                        </a>
                    </div>

                    {/* Los tres atributos que definen al producto. Son las mismas
                        tres palabras del posicionamiento, no métricas inventadas. */}
                    <ul className="mt-12 flex flex-wrap gap-x-8 gap-y-4 border-t border-[var(--border-subtle)] pt-7">
                        {["Intuitivo", "Centralizado", "Automatizado"].map(
                            (attribute) => (
                                <li key={attribute} className="flex items-center gap-2">
                                    <Icon
                                        name="check"
                                        className="size-4 text-[var(--accent)]"
                                    />
                                    <span className="font-display text-[15px] font-medium">
                                        {attribute}
                                    </span>
                                </li>
                            ),
                        )}
                    </ul>
                </div>

                {/* ---------------------------------------------------------------
                    Columna visual: la secuencia de procesos contables
                    --------------------------------------------------------------- */}
                <div className="min-w-0 lg:pl-4">
                    <ProcessSequence />
                </div>
            </div>
        </section>
    );
}
