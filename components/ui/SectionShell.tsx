import type { ReactNode } from "react";

/**
 * Envoltorio común de las secciones de la landing.
 *
 * Centraliza el ancho máximo, el espaciado vertical y el ancla de navegación.
 * Sin esto, ocho secciones repetirían las mismas clases de contenedor y bastaría
 * con que una divergiera para que el ritmo vertical se rompiera.
 *
 * El espaciado vive solo aquí, nunca en los componentes de sección: así se evita
 * el problema clásico de márgenes que se pisan entre reglas de distinta
 * especificidad.
 */

type SectionShellProps = {
    /** Ancla para la navegación del header. */
    readonly id?: string;
    /** Etiqueta pequeña sobre el título, que dice de qué trata la sección. */
    readonly eyebrow?: string;
    /** Título de la sección. */
    readonly title?: ReactNode;
    /** Bajada opcional bajo el título. */
    readonly description?: ReactNode;
    /** Cambia el fondo para separar secciones contiguas. */
    readonly tone?: "base" | "raised";
    readonly className?: string;
    readonly children: ReactNode;
};

export function SectionShell({
    id,
    eyebrow,
    title,
    description,
    tone = "base",
    className = "",
    children,
}: SectionShellProps) {
    const hasHeading = eyebrow !== undefined || title !== undefined;

    return (
        <section
            id={id}
            className={`px-5 py-20 sm:px-8 md:py-28 ${
                tone === "raised" ? "bg-[var(--background-raised)]" : ""
            } ${className}`}
        >
            <div className="mx-auto w-full max-w-6xl">
                {hasHeading && (
                    <header className="mb-12 max-w-2xl md:mb-16">
                        {eyebrow && (
                            <p className="mb-4 font-display text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                                {eyebrow}
                            </p>
                        )}

                        {title && (
                            <h2 className="font-display text-3xl font-bold leading-[1.1] tracking-tight text-balance sm:text-4xl md:text-5xl">
                                {title}
                            </h2>
                        )}

                        {description && (
                            <p className="mt-5 text-lg leading-relaxed text-[var(--foreground-muted)] text-pretty">
                                {description}
                            </p>
                        )}
                    </header>
                )}

                {children}
            </div>
        </section>
    );
}
