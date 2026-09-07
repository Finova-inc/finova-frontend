import Link from "next/link";

import { Icon } from "@/components/ui/Icon";

/**
 * Pie de página.
 *
 * Reúne lo que se espera de un pie completo: identidad, navegación por
 * categorías, contacto, legales y datos de la empresa.
 *
 * Sobre los enlaces legales: apuntan a rutas que TODAVÍA NO EXISTEN
 * (/privacidad, /terminos, /cookies). Se dejan como texto y no como enlaces
 * rotos, porque un enlace que no lleva a ninguna parte confunde a quien navega
 * con teclado o lector de pantalla, y en el caso de documentos legales da a
 * entender que existen cuando no es así. Al crear esas páginas hay que
 * convertirlos en <Link>.
 *
 * Los datos de contacto son marcadores de posición y están señalados como tales.
 */

/** Rutas del producto que ya existen en la aplicación. */
const PRODUCT_LINKS = [
    { href: "/dashboard", label: "Panel" },
    { href: "/empresas", label: "Empresas" },
    { href: "/documentos", label: "Documentos" },
    { href: "/core-contable", label: "Core contable" },
    { href: "/f29", label: "Formulario 29" },
    { href: "/copiloto", label: "Copiloto" },
    { href: "/auditoria", label: "Auditoría" },
] as const;

/** Anclas de esta misma página. */
const PAGE_LINKS = [
    { href: "#producto", label: "Qué es Finova" },
    { href: "#ventajas", label: "Ventajas" },
    { href: "#precios", label: "Precios" },
    { href: "#preguntas", label: "Preguntas" },
] as const;

/**
 * Documentos legales.
 *
 * `pending: true` indica que la página aún no existe, así que se renderiza como
 * texto inerte en vez de un enlace roto.
 */
const LEGAL_LINKS = [
    { label: "Política de privacidad", pending: true },
    { label: "Términos y condiciones", pending: true },
    { label: "Política de cookies", pending: true },
    { label: "Tratamiento de datos", pending: true },
] as const;

export function SiteFooter() {
    const currentYear = new Date().getFullYear();

    return (
        <footer className="border-t border-[var(--border-subtle)] bg-[var(--background-raised)]">
            <div className="mx-auto w-full max-w-6xl px-5 py-16 sm:px-8">
                {/* -----------------------------------------------------------
                    Bloque principal: identidad + tres columnas de navegación
                    ----------------------------------------------------------- */}
                <div className="grid gap-12 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
                    {/* Identidad y contacto */}
                    <div>
                        <Link
                            href="/"
                            className="inline-flex items-center gap-2.5 font-display text-[19px] font-bold tracking-tight"
                        >
                            <Icon
                                name="logo"
                                className="size-7 text-[var(--accent)]"
                            />
                            Finova
                        </Link>

                        <p className="mt-4 max-w-[34ch] text-[15px] leading-relaxed text-[var(--foreground-muted)]">
                            Software contable para empresas y contadores en Chile.
                            Centralizado, intuitivo y automatizado con inteligencia
                            artificial.
                        </p>

                        {/* Contacto. Los datos son provisionales. */}
                        <dl className="mt-7 flex flex-col gap-3 text-[15px]">
                            <div className="flex items-center gap-2.5">
                                <dt className="sr-only">Correo</dt>
                                <Icon
                                    name="document"
                                    className="size-4 shrink-0 text-[var(--accent)]"
                                />
                                <dd>
                                    <a
                                        href="mailto:contacto@finova.cl"
                                        className="text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                                    >
                                        contacto@finova.cl
                                    </a>
                                </dd>
                            </div>

                            <div className="flex items-center gap-2.5">
                                <dt className="sr-only">Ubicación</dt>
                                <Icon
                                    name="building"
                                    className="size-4 shrink-0 text-[var(--accent)]"
                                />
                                <dd className="text-[var(--foreground-muted)]">
                                    Santiago, Chile
                                </dd>
                            </div>
                        </dl>
                    </div>

                    {/* Módulos del producto */}
                    <nav aria-label="Módulos del producto">
                        <h2 className="mb-4 font-display text-[13px] font-semibold uppercase tracking-[0.14em]">
                            Producto
                        </h2>

                        <ul className="flex flex-col gap-2.5">
                            {PRODUCT_LINKS.map((link) => (
                                <li key={link.href}>
                                    <Link
                                        href={link.href}
                                        className="text-[15px] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                                    >
                                        {link.label}
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </nav>

                    {/* Secciones de esta página */}
                    <nav aria-label="Secciones de esta página">
                        <h2 className="mb-4 font-display text-[13px] font-semibold uppercase tracking-[0.14em]">
                            Explorar
                        </h2>

                        <ul className="flex flex-col gap-2.5">
                            {PAGE_LINKS.map((link) => (
                                <li key={link.href}>
                                    <a
                                        href={link.href}
                                        className="text-[15px] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                                    >
                                        {link.label}
                                    </a>
                                </li>
                            ))}

                            <li>
                                <Link
                                    href="/login"
                                    className="text-[15px] text-[var(--foreground-muted)] transition-colors hover:text-[var(--foreground)]"
                                >
                                    Entrar
                                </Link>
                            </li>
                        </ul>
                    </nav>

                    {/* Legales */}
                    <nav aria-label="Información legal">
                        <h2 className="mb-4 font-display text-[13px] font-semibold uppercase tracking-[0.14em]">
                            Legal
                        </h2>

                        <ul className="flex flex-col gap-2.5">
                            {LEGAL_LINKS.map((item) => (
                                <li
                                    key={item.label}
                                    className="text-[15px] text-[var(--foreground-muted)]"
                                >
                                    {/* Texto inerte: la página todavía no existe.
                                        Ver la nota al inicio del archivo. */}
                                    {item.label}
                                    <span className="ml-1.5 text-[11px] opacity-60">
                                        (pronto)
                                    </span>
                                </li>
                            ))}
                        </ul>
                    </nav>
                </div>

                {/* -----------------------------------------------------------
                    Barra inferior: razón social, derechos y estado
                    ----------------------------------------------------------- */}
                <div className="mt-14 flex flex-col gap-4 border-t border-[var(--border-subtle)] pt-8 text-[13px] text-[var(--foreground-muted)] md:flex-row md:items-center md:justify-between">
                    <div className="flex flex-col gap-1.5">
                        <p>
                            © {currentYear} Finova Networks SpA. Todos los derechos
                            reservados.
                        </p>
                        <p className="opacity-80">
                            Proyecto en desarrollo. Los datos de contacto y los
                            documentos legales son provisionales.
                        </p>
                    </div>

                    <p className="shrink-0">Hecho en Chile.</p>
                </div>
            </div>
        </footer>
    );
}
