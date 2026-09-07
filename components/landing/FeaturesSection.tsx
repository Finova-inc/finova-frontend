import { SectionShell } from "@/components/ui/SectionShell";

/**
 * "Ventajas".
 *
 * Cada ventaja es UNA PALABRA en tipografía grande, acompañada de una maqueta
 * animada de la pantalla correspondiente del producto. Sin tarjetas y sin
 * iconos: un icono genérico de reloj o escudo no aporta nada que la palabra no
 * diga mejor, y llena la sección de ruido visual.
 *
 * Las maquetas son provisionales: representan la FORMA de cada pantalla, no su
 * contenido real. Por eso no muestran cifras, ya que números concretos en una
 * ilustración se leen como datos verdaderos.
 *
 * Se dibujan con divs y CSS, sin imágenes: no pesan, se adaptan solas al tema
 * claro y oscuro, y se reemplazan por capturas reales cuando el producto las
 * tenga.
 */

/** Tipos de maqueta disponibles, uno por pantalla del producto. */
type MockupVariant = "tabla" | "grafico" | "carga" | "alertas";

/** Las ventajas, cada una con su palabra y su maqueta. */
const ADVANTAGES: ReadonlyArray<{
    word: string;
    description: string;
    mockup: MockupVariant;
}> = [
    {
        word: "Centralizado",
        description:
            "Compras, ventas, libros y reportes viven en el mismo sistema. Se acabó el archivo que solo tiene una persona.",
        mockup: "tabla",
    },
    {
        word: "Automatizado",
        description:
            "La IA lee los documentos, propone la clasificación y genera los asientos. Tú confirmas.",
        mockup: "carga",
    },
    {
        word: "Intuitivo",
        description:
            "Cada pantalla muestra lo que hay que hacer ahora. Sin capacitación de tres días para emitir un informe.",
        mockup: "grafico",
    },
    {
        word: "Vigilado",
        description:
            "El sistema revisa mientras trabajas y avisa de las inconsistencias antes de que cierres el período.",
        mockup: "alertas",
    },
];

/** Maqueta de listado: filas que aparecen en secuencia. */
function TableMockup() {
    return (
        <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4].map((row) => (
                <div
                    key={row}
                    className="flex items-center gap-2.5"
                    style={{
                        animation: `dte-row-in 0.5s ease-out ${row * 0.16}s both`,
                    }}
                >
                    <span className="h-6 w-9 shrink-0 rounded bg-[var(--accent)]/15" />
                    <span
                        className="h-2 rounded-full bg-[var(--foreground)]/12"
                        style={{ width: `${52 - row * 6}%` }}
                    />
                    <span className="ml-auto h-2 w-10 rounded-full bg-[var(--foreground)]/18" />
                </div>
            ))}
        </div>
    );
}

/** Maqueta de ingesta: documentos que se procesan uno tras otro. */
function UploadMockup() {
    return (
        <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map((row) => (
                <div
                    key={row}
                    className="rounded-lg border border-[var(--border-subtle)] p-2.5"
                >
                    <div className="mb-2 flex items-center gap-2">
                        <span className="size-4 rounded bg-[var(--accent)]/25" />
                        <span
                            className="h-2 rounded-full bg-[var(--foreground)]/14"
                            style={{ width: `${46 - row * 8}%` }}
                        />
                    </div>

                    {/* Barra de procesamiento, escalonada por fila. */}
                    <div className="h-1.5 overflow-hidden rounded-full bg-[var(--foreground)]/8">
                        <div
                            className="h-full origin-left rounded-full bg-[var(--accent)]"
                            style={{
                                animation: `cell-fill 1.6s ease-in-out ${row * 0.5}s infinite`,
                            }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

/** Maqueta de informe: barras que crecen desde la base. */
function ChartMockup() {
    const barHeights = [42, 68, 54, 86, 62, 94];

    return (
        <div className="flex h-[11rem] flex-col">
            <div className="mb-3 h-2 w-24 rounded-full bg-[var(--foreground)]/12" />

            <div className="flex flex-1 items-end gap-2 pb-1">
                {barHeights.map((height, index) => (
                    <div
                        key={index}
                        className="flex-1 rounded-t bg-[var(--accent)]"
                        style={{
                            height: `${height}%`,
                            opacity: 0.32 + index * 0.11,
                            transformOrigin: "bottom",
                            animation: `grow-up 0.7s cubic-bezier(0.16, 1, 0.3, 1) ${index * 0.09}s both`,
                        }}
                    />
                ))}
            </div>
        </div>
    );
}

/** Maqueta de alertas: avisos que entran de a uno. */
function AlertsMockup() {
    return (
        <div className="flex flex-col gap-2.5">
            {[0, 1, 2].map((row) => (
                <div
                    key={row}
                    className="flex items-start gap-2.5 rounded-lg border border-[var(--border-subtle)] p-2.5"
                    style={{
                        animation: `check-pop 0.5s ease-out ${0.3 + row * 0.35}s both`,
                    }}
                >
                    <span
                        className={`mt-0.5 size-3.5 shrink-0 rounded-full ${
                            row === 0
                                ? "bg-[var(--accent)]"
                                : "bg-[var(--color-highlight)]"
                        }`}
                    />

                    <div className="flex flex-1 flex-col gap-1.5">
                        <span
                            className="h-2 rounded-full bg-[var(--foreground)]/16"
                            style={{ width: `${74 - row * 12}%` }}
                        />
                        <span
                            className="h-1.5 rounded-full bg-[var(--foreground)]/8"
                            style={{ width: `${52 - row * 8}%` }}
                        />
                    </div>
                </div>
            ))}
        </div>
    );
}

/**
 * Contenedor de la maqueta.
 *
 * Es decorativa: va marcada aria-hidden porque el texto contiguo ya explica de
 * qué se trata cada pantalla.
 */
function DashboardMockup({ variant }: { readonly variant: MockupVariant }) {
    return (
        <div
            aria-hidden
            /* La maqueta se dimensiona por su contenido, sin proporcion fija:
               con aspect-[4/3] las variantes cortas quedaban con la mitad del
               panel vacio. El minimo evita que las mas breves se vean apretadas. */
            className="glass-panel relative min-h-[15rem] w-full overflow-hidden rounded-2xl p-4 sm:p-5"
        >
            {/* Barra superior: convención visual de ventana de aplicación. */}
            <div className="mb-4 flex items-center gap-1.5">
                <span className="size-2 rounded-full bg-[var(--accent)]/60" />
                <span className="size-2 rounded-full bg-[var(--color-highlight)]/60" />
                <span className="size-2 rounded-full bg-[var(--foreground)]/15" />
            </div>

            {variant === "tabla" && <TableMockup />}
            {variant === "carga" && <UploadMockup />}
            {variant === "grafico" && <ChartMockup />}
            {variant === "alertas" && <AlertsMockup />}
        </div>
    );
}

export function FeaturesSection() {
    return (
        <SectionShell
            id="ventajas"
            eyebrow="Ventajas"
            title="Cuatro razones, sin vueltas"
            tone="raised"
        >
            <div className="flex flex-col gap-20 md:gap-24">
                {ADVANTAGES.map((advantage, index) => (
                    <article
                        key={advantage.word}
                        className="grid items-center gap-8 md:grid-cols-2 md:gap-14"
                    >
                        {/* Se alterna el lado de la maqueta para que la lectura
                            zigzaguee en vez de caer siempre en la misma columna.
                            El orden solo cambia desde md: en móvil el texto va
                            siempre primero. */}
                        <div
                            className={`min-w-0 ${index % 2 === 1 ? "md:order-2" : ""}`}
                        >
                            <h3 className="font-display text-[2.5rem] font-bold leading-none tracking-[-0.03em] sm:text-6xl md:text-[4.5rem]">
                                {advantage.word}
                            </h3>

                            <p className="mt-5 max-w-[34rem] text-lg leading-relaxed text-[var(--foreground-muted)] text-pretty">
                                {advantage.description}
                            </p>
                        </div>

                        <div
                            className={`min-w-0 ${index % 2 === 1 ? "md:order-1" : ""}`}
                        >
                            <DashboardMockup variant={advantage.mockup} />
                        </div>
                    </article>
                ))}
            </div>
        </SectionShell>
    );
}
