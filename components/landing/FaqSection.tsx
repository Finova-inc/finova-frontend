import { SectionShell } from "@/components/ui/SectionShell";

/**
 * Testimonios en formato de pregunta y respuesta.
 *
 * En vez de un acordeón de preguntas frecuentes, cada tarjeta muestra a una
 * persona respondiendo una duda concreta sobre el producto. La misma información
 * que daría un FAQ, pero dicha por alguien con nombre y oficio, que es como se
 * lee de verdad en una decisión de compra.
 *
 * ---------------------------------------------------------------------------
 * IMPORTANTE: SON PERSONAS FICTICIAS
 * ---------------------------------------------------------------------------
 * Finova está en desarrollo y todavía no tiene clientes, así que estos
 * testimonios son ilustrativos y así se declara al pie de la sección. Publicar
 * reseñas inventadas como si fueran reales sería engañoso y, en publicidad, una
 * práctica sancionable. Antes de lanzar hay que reemplazarlos por testimonios
 * reales con autorización, o quitar la sección.
 *
 * Los retratos son iniciales sobre un color de la paleta, no fotos de personas
 * que no dieron su consentimiento.
 */

/** Testimonios ilustrativos. Ver la advertencia de arriba. */
const TESTIMONIALS: ReadonlyArray<{
    question: string;
    answer: string;
    name: string;
    role: string;
    /** Iniciales para el retrato. */
    initials: string;
}> = [
    {
        question: "¿Cuánto se demora en aprenderlo un equipo?",
        answer:
            "Lo que más me sorprendió fue no tener que capacitar a nadie. Mi asistente entró y a la media hora ya estaba emitiendo informes sola. Eso con el sistema anterior nos tomó tres semanas.",
        name: "Marcela Fuentes",
        role: "Contadora, estudio propio",
        initials: "MF",
    },
    {
        question: "¿De verdad deja de digitarse todo a mano?",
        answer:
            "Antes dedicaba los primeros cinco días del mes solo a cargar documentos. Ahora reviso lo que el sistema propone y corrijo lo que haga falta. El mes pasado fueron dos horas.",
        name: "Rodrigo Peña",
        role: "Jefe de administración, PYME",
        initials: "RP",
    },
    {
        question: "¿Qué pasa si la IA se equivoca en algo?",
        answer:
            "Nunca me cambia nada sin avisar. Marca lo que le parece raro y yo decido. Un par de veces se equivocó, lo descarté y listo. Prefiero eso a que pase algo por alto.",
        name: "Camila Ortiz",
        role: "Contadora general",
        initials: "CO",
    },
    {
        question: "¿Sirve si llevo varias empresas a la vez?",
        answer:
            "Llevo once clientes. Cambio de empresa desde el mismo menú y cada una tiene sus datos y sus permisos aparte. Se acabó tener una planilla distinta por cada uno.",
        name: "Ignacio Vera",
        role: "Contador auditor",
        initials: "IV",
    },
    {
        question: "¿Es fácil encontrar de dónde salió una cifra?",
        answer:
            "Esa era mi pelea de siempre. Ahora abro el movimiento y veo el documento que lo originó, quién lo tocó y cuándo. Cuando el cliente pregunta, respondo en el momento.",
        name: "Paula Sandoval",
        role: "Contadora, empresa mediana",
        initials: "PS",
    },
    {
        question: "¿Cómo fue pasarse desde el sistema anterior?",
        answer:
            "Me daba susto migrar en medio del año. Subimos el histórico, cuadró contra los saldos que ya tenía y seguimos trabajando. No perdimos un solo período.",
        name: "Andrés Lagos",
        role: "Gerente de finanzas",
        initials: "AL",
    },
];

/** Colores de retrato, alternados para que la grilla no se vea monótona. */
const AVATAR_TONES = [
    "bg-[var(--accent)] text-white",
    "bg-[var(--color-highlight)] text-ink",
    "bg-[var(--foreground)] text-[var(--background)]",
] as const;

export function FaqSection() {
    return (
        <SectionShell
            id="preguntas"
            eyebrow="Preguntas"
            title="Lo que responden quienes ya lo usan"
            description="Las dudas que más nos llegan, contestadas por contadores y equipos de administración."
        >
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {TESTIMONIALS.map((testimonial, index) => (
                    <article
                        key={testimonial.name}
                        className="glass-panel flex flex-col rounded-2xl p-6"
                    >
                        {/* La pregunta encabeza la tarjeta: es el gancho de
                            lectura, y deja claro de qué trata el testimonio. */}
                        <h3 className="mb-4 font-display text-[17px] font-bold leading-snug tracking-tight text-balance">
                            {testimonial.question}
                        </h3>

                        <blockquote className="flex-1 text-[15px] leading-relaxed text-[var(--foreground-muted)] text-pretty">
                            {testimonial.answer}
                        </blockquote>

                        {/* Firma de quien responde. */}
                        <footer className="mt-6 flex items-center gap-3 border-t border-[var(--border-subtle)] pt-5">
                            <span
                                aria-hidden
                                className={`grid size-10 shrink-0 place-items-center rounded-full font-display text-[13px] font-bold ${
                                    AVATAR_TONES[index % AVATAR_TONES.length]
                                }`}
                            >
                                {testimonial.initials}
                            </span>

                            <div className="min-w-0">
                                <p className="truncate font-display text-[14px] font-semibold">
                                    {testimonial.name}
                                </p>
                                <p className="truncate text-[13px] text-[var(--foreground-muted)]">
                                    {testimonial.role}
                                </p>
                            </div>
                        </footer>
                    </article>
                ))}
            </div>

            {/* Declaración obligatoria mientras los testimonios no sean reales. */}
            <p className="mt-8 text-[13px] text-[var(--foreground-muted)]">
                Testimonios ilustrativos. Finova está en desarrollo y estas
                personas son ficticias; se reemplazarán por opiniones reales antes
                del lanzamiento.
            </p>
        </SectionShell>
    );
}
