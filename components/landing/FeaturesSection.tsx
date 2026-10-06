import { SectionShell } from "@/components/ui/SectionShell";

/**
 * "Ventajas".
 *
 * Cuatro tarjetas de distinto ancho (grilla de 6 columnas: 4+2 / 2+4), cada
 * una con su destacador, una cifra y una línea de por qué Finova ayuda. Antes
 * eran cuatro filas gigantes con maquetas; se compactaron porque convencían
 * menos de lo que ocupaban.
 *
 * Las cifras describen el PROBLEMA, no resultados de Finova, y cada una cita
 * su fuente. La única propia es la del plan de cuentas base, que sale del
 * código del backend (cuentas-contables/plantillas/plan-base-pyme.ts: 68
 * cuentas de movimiento); si la plantilla cambia, actualizarla aquí.
 */

const ADVANTAGES: ReadonlyArray<{
    word: string;
    figure: string;
    figureLabel: string;
    description: string;
    source: string;
    href?: string;
    color: string;
    span: string;
}> = [
    {
        word: "Automatizado",
        figure: "60 h",
        figureLabel: "al mes se pierden en tareas fáciles de automatizar",
        description:
            "Finova lee el documento, propone la cuenta y arma el asiento. Tú revisas en minutos lo que antes se digitaba a mano.",
        source: "Automation Anywhere / OnePoll, 2020",
        href: "https://www.automationanywhere.com/company/press-room/global-research-reveals-world-s-most-hated-office-tasks",
        color: "var(--hl-mint)",
        span: "md:col-span-4",
    },
    {
        word: "Vigilado",
        figure: "30%",
        figureLabel: "de multa máxima sobre el impuesto adeudado por declarar fuera de plazo",
        description:
            "Finova revisa mientras trabajas y avisa las inconsistencias antes de cerrar el período.",
        source: "Código Tributario, art. 97 N°2",
        href: "https://iura.cl/ctrib/97",
        color: "var(--hl-pink)",
        span: "md:col-span-2",
    },
    {
        word: "Centralizado",
        figure: "6 días",
        figureLabel: "tarda la organización mediana en cerrar el mes",
        description:
            "Libros, períodos y plan de cuentas en un mismo sistema: no hay planillas que conciliar entre sí.",
        source: "APQC, vía CFO.com",
        href: "https://www.cfo.com/news/metric-of-the-month-cycle-time-for-monthly-close/659297/",
        color: "var(--hl-sky)",
        span: "md:col-span-2",
    },
    {
        word: "Intuitivo",
        figure: "68 cuentas",
        figureLabel: "listas en el plan de cuentas base",
        description:
            "Empiezas a registrar el primer día, sin armar el plan desde cero ni capacitaciones de tres días.",
        source: "Plan de cuentas base de Finova",
        color: "var(--hl-orange)",
        span: "md:col-span-4",
    },
];

export function FeaturesSection() {
    return (
        <SectionShell
            id="ventajas"
            title="Cuatro razones, con cifras"
            description="Los números describen el problema que Finova resuelve, y cada uno cita su fuente."
            tone="raised"
        >
            <div className="grid gap-4 md:grid-cols-6">
                {ADVANTAGES.map((advantage) => (
                    <article
                        key={advantage.word}
                        className={`relative flex flex-col overflow-hidden rounded-3xl border border-[var(--border-subtle)] p-6 sm:p-8 ${advantage.span}`}
                        style={{
                            background: `color-mix(in srgb, ${advantage.color} 10%, var(--surface))`,
                        }}
                    >
                        {/* Barra inclinada del logo, en el color de la ventaja. */}
                        <span
                            aria-hidden
                            className="absolute -right-5 -top-12 h-44 w-14 -skew-y-[28deg] rounded-[1.1rem] opacity-70"
                            style={{ background: advantage.color }}
                        />

                        <h3 className="relative font-display text-[1.35rem] font-bold tracking-tight">
                            {advantage.word}
                        </h3>

                        <p className="relative mt-8 font-display text-5xl font-bold tracking-[-0.03em] sm:text-6xl">
                            {advantage.figure}
                        </p>
                        <p className="relative mt-2 max-w-[30rem] text-[15px] font-medium leading-snug text-pretty">
                            {advantage.figureLabel}
                        </p>

                        <p className="relative mt-4 max-w-[34rem] flex-1 text-[15px] leading-relaxed text-[var(--foreground-muted)] text-pretty">
                            {advantage.description}
                        </p>

                        {advantage.href ? (
                            <a
                                href={advantage.href}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="relative mt-5 self-start text-[12.5px] text-[var(--foreground-muted)] underline decoration-[var(--border-strong)] underline-offset-4 transition-colors hover:text-[var(--foreground)] hover:decoration-current"
                            >
                                Fuente: {advantage.source}
                            </a>
                        ) : (
                            <p className="relative mt-5 text-[12.5px] text-[var(--foreground-muted)]">
                                Fuente: {advantage.source}
                            </p>
                        )}
                    </article>
                ))}
            </div>
        </SectionShell>
    );
}
