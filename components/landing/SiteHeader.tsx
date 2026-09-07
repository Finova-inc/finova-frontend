import Image from "next/image";
import Link from "next/link";

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
 * - Los enlaces se agrupan al centro, juntos entre sí.
 * - A la derecha, dos acciones: una secundaria de contorno y una principal
 *   sólida, separadas del resto por una línea vertical.
 *
 * Lo que NO se toma: el mockup es una cápsula negra flotante. Aquí la barra es
 * de ancho completo, esquinas rectas y cristal crema, según lo ya definido.
 *
 * El efecto de vidrio se define en globals.css (.site-header-bar) y se arma en
 * cuatro capas: un degradado vertical que imita la luz entrando por el canto,
 * el desenfoque de lo que pasa por detrás, un brillo interior en el borde
 * superior, y un filo inferior en el color de acento.
 *
 * NO es fija: se queda arriba de la página y desaparece al bajar. Consecuencia
 * a tener presente: la navegación deja de estar a mano en secciones bajas, y
 * por eso el pie repite los enlaces a todas las secciones.
 *
 * Sigue siendo un componente de SERVIDOR aunque contenga el botón de tema, que
 * es de cliente. "use client" marca un módulo, no un subárbol.
 */

/**
 * Enlaces de navegación.
 *
 * `isCurrent` marca cuál se muestra en la pastilla. Hoy es el primero, porque
 * la landing empieza arriba; seguir la sección visible al hacer scroll exigiría
 * convertir el header en componente de cliente para un beneficio menor.
 */
const NAV_LINKS = [
    { href: "#inicio", label: "Inicio", isCurrent: true },
    { href: "#producto", label: "Producto", isCurrent: false },
    { href: "#ventajas", label: "Ventajas", isCurrent: false },
    { href: "#precios", label: "Precios", isCurrent: false },
    { href: "#preguntas", label: "Preguntas", isCurrent: false },
] as const;

export function SiteHeader() {
    return (
        <header className="site-header-bar relative z-50">
            <nav
                aria-label="Navegación principal"
                className="mx-auto flex w-full max-w-6xl items-center gap-5 px-5 py-5 sm:px-8 sm:py-6"
            >
                {/* Marca */}
                <Link
                    href="/"
                    className="flex shrink-0 items-center gap-3 font-display text-[21px] font-bold tracking-tight text-[var(--header-ink)] sm:text-[23px]"
                >
                    {/*
                        priority: el logo está sobre la línea de flotación, así
                        que se carga sin esperar al observador de imágenes
                        diferidas. Sin esto aparecería con un salto visible.

                        Las dimensiones reales del archivo son 135x184; se
                        declaran para que Next reserve el espacio exacto y no
                        haya salto de layout al cargar.
                    */}
                    <Image
                        src="/logo-finova.png"
                        alt=""
                        width={135}
                        height={184}
                        priority
                        className="h-10 w-auto sm:h-11"
                    />
                    Finova
                </Link>

                {/* ---------------------------------------------------------------
                    Enlaces de sección, agrupados al centro.

                    Se ocultan bajo md: en móvil la landing se recorre haciendo
                    scroll, y un menú desplegable exigiría estado de cliente para
                    un beneficio marginal en una página de una sola columna.
                    --------------------------------------------------------------- */}
                <ul className="mx-auto hidden items-center gap-0.5 md:flex">
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

                {/* ---------------------------------------------------------------
                    Acciones a la derecha.

                    ml-auto sostiene la alineación cuando los enlaces del centro
                    están ocultos en móvil.
                    --------------------------------------------------------------- */}
                <div className="ml-auto flex items-center gap-2 md:ml-0">
                    <ThemeToggle />

                    <div
                        aria-hidden
                        className="mx-1.5 hidden h-6 w-px bg-[var(--header-divider)] sm:block"
                    />

                    {/* Acción secundaria: contorno sin relleno. En el mockup es
                        "Login"; aquí lleva a la demostración, porque entrar a la
                        cuenta es la acción principal y no puede duplicarse. */}
                    <a
                        href="#producto"
                        className="hidden items-center gap-2 rounded-full border border-[var(--header-ghost-border)] px-5 py-2.5 font-display text-[15px] font-medium text-[var(--header-ink)] transition-colors hover:bg-[var(--header-hover)] sm:inline-flex"
                    >
                        <Icon name="eye" className="size-4" />
                        Ver demo
                    </a>

                    {/* Acción principal: sólida, la de mayor peso visual. */}
                    <Link
                        href="/login"
                        className="rounded-full bg-[var(--header-cta-bg)] px-5 py-2.5 font-display text-[15px] font-medium text-[var(--header-cta-ink)] transition-opacity hover:opacity-90 sm:px-6"
                    >
                        Entrar
                    </Link>
                </div>
            </nav>
        </header>
    );
}
