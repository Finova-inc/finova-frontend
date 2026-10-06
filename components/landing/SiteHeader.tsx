import Image from "next/image";
import Link from "next/link";
import type { CSSProperties } from "react";

import { HeaderScroll } from "@/components/landing/HeaderScroll";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/**
 * Barra de navegación superior.
 *
 * ---------------------------------------------------------------------------
 * QUÉ SE TOMA DE images/Header.png
 * ---------------------------------------------------------------------------
 * El mockup es de otra marca ("SoRun"), así que se copia su ESTRUCTURA, no su
 * paleta ni su forma exterior:
 *
 * - El enlace vigente va dentro de una pastilla de color y el resto son texto
 *   plano. Es la seña más característica de esa barra.
 *
 * Distribución de images/image.png: la marca sola a la izquierda y, a la
 * derecha, los enlaces, el interruptor de tema (sol y luna con una perilla que
 * se desliza) y la acción principal.
 *
 * El efecto de vidrio se define en globals.css (.site-header-bar).
 *
 * Es FIJA y se compacta al hacer scroll: HeaderScroll marca data-compact y,
 * con eso, baja el alto, se achica el logo y las letras de "Finova" se pliegan
 * hacia el símbolo (al estilo del logotipo de Anthropic). Al volver arriba se
 * despliegan.
 *
 * Sigue siendo un componente de SERVIDOR aunque contenga piezas de cliente
 * (HeaderScroll, ThemeToggle): "use client" marca un módulo, no un subárbol.
 */

/**
 * Enlaces de navegación.
 *
 * `isCurrent` marca cuál se muestra en la pastilla. Hoy es el primero, porque
 * la landing empieza arriba; seguir la sección visible al hacer scroll exigiría
 * más código de cliente para un beneficio menor.
 */
const NAV_LINKS = [
    { href: "#inicio", label: "Inicio", isCurrent: true },
    { href: "#producto", label: "Producto", isCurrent: false },
    { href: "#ventajas", label: "Ventajas", isCurrent: false },
    { href: "#precios", label: "Precios", isCurrent: false },
    { href: "#preguntas", label: "Preguntas", isCurrent: false },
] as const;

/** Letras del nombre, cada una se pliega por separado. */
const WORDMARK = ["F", "i", "n", "o", "v", "a"] as const;

export function SiteHeader() {
    return (
        <HeaderScroll>
            <nav
                aria-label="Navegación principal"
                className="mx-auto flex w-full max-w-6xl items-center gap-5 px-5 py-5 transition-[padding] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[compact=true]:py-2.5 sm:px-8 sm:py-6"
            >
                {/* Marca. aria-label porque las letras sueltas van ocultas
                    para lectores de pantalla: así el enlace se lee "Finova"
                    y no letra por letra. */}
                <Link
                    href="/"
                    aria-label="Finova"
                    className="flex shrink-0 items-center font-display text-[21px] font-bold tracking-tight text-[var(--header-ink)] sm:text-[23px]"
                >
                    {/*
                        priority: el logo está sobre la línea de flotación, así
                        que se carga sin esperar al observador de imágenes
                        diferidas. Las dimensiones reales del archivo son
                        135x184; se declaran para que no haya salto de layout.
                    */}
                    <Image
                        src="/logo-finova.png"
                        alt=""
                        width={135}
                        height={184}
                        priority
                        className="h-10 w-auto transition-[height] duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] group-data-[compact=true]:h-8 sm:h-11"
                    />

                    <span
                        aria-hidden
                        className="ml-3 flex transition-[margin] duration-500 group-data-[compact=true]:ml-0"
                    >
                        {WORDMARK.map((letter, index) => (
                            <span
                                key={index}
                                className="wordmark-letter"
                                style={{ "--i": index } as CSSProperties}
                            >
                                {letter}
                            </span>
                        ))}
                    </span>
                </Link>

                {/* ---------------------------------------------------------------
                    Enlaces de sección, agrupados a la derecha.

                    Se ocultan bajo md: en móvil la landing se recorre haciendo
                    scroll, y un menú desplegable exigiría estado de cliente para
                    un beneficio marginal en una página de una sola columna.
                    --------------------------------------------------------------- */}
                <ul className="ml-auto hidden items-center gap-0.5 md:flex">
                    {NAV_LINKS.map((link) => (
                        <li key={link.href}>
                            <a
                                href={link.href}
                                /* aria-current comunica a los lectores de pantalla
                                   cuál es la sección vigente. Sin esto, la pastilla
                                   sería una señal solo visual. */
                                aria-current={link.isCurrent ? "true" : undefined}
                                className={
                                    link.isCurrent
                                        ? "rounded-full bg-[var(--header-pill-bg)] px-4 py-2 text-[15px] font-medium text-[var(--header-pill-ink)]"
                                        : "rounded-full px-4 py-2 text-[15px] text-[var(--header-ink-muted)] transition-colors hover:bg-[var(--header-hover)] hover:text-[var(--header-ink)]"
                                }
                            >
                                {link.label}
                            </a>
                        </li>
                    ))}
                </ul>

                {/* ml-auto sostiene la alineación cuando los enlaces están
                    ocultos en móvil. */}
                <div className="ml-auto flex items-center gap-3 md:ml-4">
                    <ThemeToggle variant="switch" />

                    <Link
                        href="/login"
                        className="inline-flex items-center gap-2 rounded-full bg-[var(--header-cta-bg)] px-5 py-2.5 font-display text-[15px] font-medium text-[var(--header-cta-ink)] transition-opacity hover:opacity-90"
                    >
                        Entrar
                        <Icon name="arrowRight" className="size-4" />
                    </Link>
                </div>
            </nav>
        </HeaderScroll>
    );
}
