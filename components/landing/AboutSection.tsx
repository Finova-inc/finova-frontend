import { SectionShell } from "@/components/ui/SectionShell";

/**
 * "Qué es Finova".
 *
 * Se presenta en tipografía grande y con muy poco alrededor: es la declaración
 * de qué es el producto, y compite mal si se la rodea de adornos. Tres frases
 * cortas, cada una con una palabra resaltada, sostienen toda la sección.
 *
 * Las tres palabras destacadas son las mismas del posicionamiento —intuitivo,
 * centralizado, automatizado— repetidas aquí de forma deliberada: en una landing
 * la repetición de los tres atributos clave es lo que los deja fijados.
 */

/**
 * Frases de la declaración.
 *
 * `highlight` es el fragmento que va resaltado dentro de la frase; el texto se
 * parte en torno a esa palabra al renderizar.
 */
const STATEMENT_LINES: ReadonlyArray<{
    before: string;
    highlight: string;
    after: string;
}> = [
    {
        before: "Un sistema contable que se entiende ",
        highlight: "sin manual",
        after: ".",
    },
    {
        before: "Todo el trabajo del mes ",
        highlight: "en un solo lugar",
        after: ".",
    },
    {
        before: "Y la parte repetitiva, ",
        highlight: "hecha por la IA",
        after: ".",
    },
];

export function AboutSection() {
    return (
        <SectionShell id="producto">
            <div className="mx-auto max-w-5xl">
                <p className="mb-10 font-display text-xs font-medium uppercase tracking-[0.18em] text-[var(--accent)]">
                    Qué es Finova
                </p>

                {/* La declaración. El tamaño es el mensaje: esto se lee de lejos. */}
                <div className="flex flex-col gap-3">
                    {STATEMENT_LINES.map((line) => (
                        <p
                            key={line.highlight}
                            className="font-display text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-balance sm:text-4xl md:text-5xl lg:text-[3.4rem]"
                        >
                            {line.before}
                            <span className="text-[var(--accent)]">
                                {line.highlight}
                            </span>
                            {line.after}
                        </p>
                    ))}
                </div>

                <p className="mt-12 max-w-[46rem] text-lg leading-relaxed text-[var(--foreground-muted)] text-pretty">
                    Finova reúne los módulos contables de una empresa en una sola
                    plataforma y automatiza con inteligencia artificial lo que hoy
                    se hace a mano. No reemplaza al contador: le devuelve las horas
                    que hoy se van en digitar.
                </p>
            </div>
        </SectionShell>
    );
}
