/**
 * "Qué es Finova".
 *
 * Banda de tinta (.band-ink en globals.css: oscura en ambos temas) con la
 * declaración en tipografía grande, una ilustración de fondo y tres cifras
 * públicas que dimensionan el problema.
 *
 * La ilustración es un SVG en línea, no una foto: barras inclinadas del logo a
 * gran escala, en los colores destacadores y con opacidad baja. No pesa, no
 * necesita permisos de imagen en la CSP y se adapta sola al tema.
 *
 * Las cifras NO son resultados de Finova: describen el contexto (volumen de
 * documentos, cantidad de empresas, tiempo perdido en tareas manuales) y cada
 * una enlaza a su fuente. Si una fuente se actualiza, cambiar aquí el dato y
 * el año juntos.
 */

/**
 * Frases de la declaración.
 *
 * `highlight` es el fragmento resaltado dentro de la frase; cada uno toma un
 * destacador distinto.
 */
const STATEMENT_LINES: ReadonlyArray<{
    before: string;
    highlight: string;
    after: string;
    color: string;
}> = [
    {
        before: "Un sistema contable que se entiende ",
        highlight: "sin manual",
        after: ".",
        color: "var(--hl-orange)",
    },
    {
        before: "Todo el trabajo del mes ",
        highlight: "en un solo lugar",
        after: ".",
        color: "var(--hl-mint)",
    },
    {
        before: "Y la parte repetitiva, ",
        highlight: "hecha por la IA",
        after: ".",
        color: "var(--hl-pink)",
    },
];

/** Cifras de contexto, cada una con su fuente verificable. */
const FACTS: ReadonlyArray<{
    figure: string;
    text: string;
    source: string;
    href: string;
    color: string;
}> = [
    {
        figure: "+695 millones",
        text: "de documentos tributarios electrónicos se emitieron en Chile durante 2023.",
        source: "SII, estadísticas de factura electrónica",
        href: "https://www.sii.cl/servicios_online/1039-estadistic-1182.html",
        color: "var(--hl-orange)",
    },
    {
        figure: "1,2 millones",
        text: "de empresas activas en Chile en 2025, y el 91,8% son micro o pequeñas.",
        source: "INE, Registro Único de Empresas",
        href: "https://www.ine.gob.cl/docs/default-source/estadisticas-experimentales-rue/rue-demografia-de-empresas.html",
        color: "var(--hl-mint)",
    },
    {
        figure: "+3 horas al día",
        text: "dedica un oficinista promedio a tareas manuales y repetitivas en el computador.",
        source: "Automation Anywhere / OnePoll, 2020",
        href: "https://www.automationanywhere.com/company/press-room/global-research-reveals-world-s-most-hated-office-tasks",
        color: "var(--hl-pink)",
    },
];

/** Barras de la ilustración: posición, alto y color (unidades del viewBox). */
const ILLUSTRATION_BARS = [
    { x: 560, height: 260, color: "var(--hl-orange)" },
    { x: 700, height: 380, color: "var(--hl-pink)" },
    { x: 840, height: 500, color: "var(--hl-violet)" },
    { x: 980, height: 620, color: "var(--hl-mint)" },
    { x: 1120, height: 740, color: "var(--hl-yellow)" },
] as const;

/** Fondo ilustrado: barras inclinadas como las del logo, más dos halos. */
function Illustration() {
    return (
        <svg
            aria-hidden
            viewBox="0 0 1200 800"
            preserveAspectRatio="xMaxYMax slice"
            className="pointer-events-none absolute inset-0 size-full"
        >
            <defs>
                {/* Los colores van en style y no como atributo: var() en
                    atributos de presentación SVG no es confiable. */}
                <radialGradient id="about-halo-a" cx="0.85" cy="0.15" r="0.6">
                    <stop offset="0" style={{ stopColor: "var(--hl-violet)", stopOpacity: 0.35 }} />
                    <stop offset="1" style={{ stopColor: "var(--hl-violet)", stopOpacity: 0 }} />
                </radialGradient>
                <radialGradient id="about-halo-b" cx="0.1" cy="1" r="0.55">
                    <stop offset="0" style={{ stopColor: "var(--hl-orange)", stopOpacity: 0.28 }} />
                    <stop offset="1" style={{ stopColor: "var(--hl-orange)", stopOpacity: 0 }} />
                </radialGradient>
                <linearGradient id="about-bar-fade" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0" stopColor="white" stopOpacity="1" />
                    <stop offset="1" stopColor="white" stopOpacity="0" />
                </linearGradient>
                <mask id="about-bar-mask">
                    <rect width="1200" height="800" fill="url(#about-bar-fade)" />
                </mask>
            </defs>

            <rect width="1200" height="800" fill="url(#about-halo-a)" />
            <rect width="1200" height="800" fill="url(#about-halo-b)" />

            {/* skewY(-28) inclina las barras igual que el logo, pero también
                las sube en proporción a x (tan 28° ≈ 0,53); el translate previo
                lo compensa para que todas apoyen en la misma base. La máscara
                las desvanece hacia abajo para que no compitan con las cifras. */}
            <g mask="url(#about-bar-mask)" opacity="0.22">
                {ILLUSTRATION_BARS.map((bar) => (
                    <rect
                        key={bar.x}
                        x={bar.x}
                        y={820 - bar.height}
                        width="96"
                        height={bar.height}
                        rx="22"
                        style={{ fill: bar.color }}
                        transform={`skewY(-28) translate(0 ${bar.x * 0.53})`}
                    />
                ))}
            </g>
        </svg>
    );
}

export function AboutSection() {
    return (
        <section
            id="producto"
            className="band-ink relative overflow-hidden px-5 py-24 sm:px-8 md:py-32"
        >
            <Illustration />

            <div className="relative mx-auto w-full max-w-6xl">
                <h2 className="mb-10 font-display text-xs font-medium uppercase tracking-[0.18em] text-[var(--hl-orange)]">
                    Qué es Finova
                </h2>

                {/* La declaración. El tamaño es el mensaje: esto se lee de lejos. */}
                <div className="flex max-w-5xl flex-col gap-3">
                    {STATEMENT_LINES.map((line) => (
                        <p
                            key={line.highlight}
                            className="font-display text-[1.75rem] font-bold leading-[1.15] tracking-[-0.02em] text-balance sm:text-4xl md:text-5xl lg:text-[3.4rem]"
                        >
                            {line.before}
                            <span style={{ color: line.color }}>{line.highlight}</span>
                            {line.after}
                        </p>
                    ))}
                </div>

                <p className="mt-10 max-w-[46rem] text-lg leading-relaxed text-[var(--foreground-muted)] text-pretty">
                    Finova reúne los módulos contables de una empresa en una sola
                    plataforma y automatiza con inteligencia artificial lo que hoy
                    se hace a mano. No reemplaza al contador: le devuelve las horas
                    que hoy se van en digitar.
                </p>

                {/* Cifras de contexto. Cada una abre su fuente. */}
                <ul className="mt-16 grid gap-10 border-t border-[var(--border-subtle)] pt-10 md:grid-cols-3 md:gap-8">
                    {FACTS.map((fact) => (
                        <li key={fact.figure}>
                            <p className="flex items-center gap-3 font-display text-4xl font-bold tracking-[-0.02em] sm:text-[2.6rem]">
                                <span
                                    aria-hidden
                                    className="h-8 w-3 -skew-y-[28deg] rounded-[3px]"
                                    style={{ background: fact.color }}
                                />
                                {fact.figure}
                            </p>
                            <p className="mt-3 text-[15px] leading-relaxed text-[var(--foreground-muted)] text-pretty">
                                {fact.text}
                            </p>
                            <a
                                href={fact.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="mt-3 inline-block text-[12.5px] text-[var(--foreground-muted)] underline decoration-[var(--border-subtle)] underline-offset-4 transition-colors hover:text-[var(--foreground)] hover:decoration-current"
                            >
                                Fuente: {fact.source}
                            </a>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    );
}
