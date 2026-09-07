import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Secuencia de procesos contables del hero.
 *
 * Reemplaza a la antigua animación del F29: el posicionamiento del producto no
 * es "una herramienta para el Formulario 29" sino un SaaS contable completo, así
 * que la ilustración muestra el flujo entero —de documento a informe— y no un
 * único trámite.
 *
 * No se muestran cifras ni cálculos a propósito. Números concretos en una
 * ilustración de marketing invitan a leerlos como datos reales; aquí lo que
 * importa es que el proceso avanza solo.
 *
 * Es un componente de SERVIDOR: toda la animación es CSS. Los pasos se
 * encienden en secuencia y el ciclo se repite indefinidamente.
 *
 * Accesibilidad: el bloque es decorativo y va marcado aria-hidden; el titular
 * contiguo ya comunica el mensaje. Con "reducir movimiento" activo las reglas de
 * globals.css dejan todos los pasos visibles y quietos.
 */

/** Etapas del flujo contable, en el orden en que ocurren. */
const PROCESS_STEPS: ReadonlyArray<{
    icon: IconName;
    title: string;
    detail: string;
}> = [
    {
        icon: "document",
        title: "Ingreso de documentos",
        detail: "Compras, ventas y respaldos entran sin digitación",
    },
    {
        icon: "sparkle",
        title: "Lectura con IA",
        detail: "El sistema reconoce y clasifica cada documento",
    },
    {
        icon: "calculator",
        title: "Registro contable",
        detail: "Los asientos se generan y cuadran solos",
    },
    {
        icon: "shield",
        title: "Revisión automática",
        detail: "Se detectan inconsistencias antes de cerrar",
    },
    {
        icon: "check",
        title: "Informes al día",
        detail: "Libros y reportes quedan listos para revisar",
    },
];

/** Duración de una vuelta completa del ciclo, en segundos. */
const CYCLE_SECONDS = 12;

export function ProcessSequence() {
    return (
        <div
            aria-hidden
            className="glass-panel relative w-full rounded-3xl p-6 sm:p-7"
        >
            {/* Encabezado del panel: da contexto de que esto es el flujo. */}
            <div className="mb-6 flex items-center gap-2.5">
                <span className="flex gap-1.5">
                    {/* Tres puntos: convención visual de una ventana de aplicación. */}
                    <span className="size-2.5 rounded-full bg-[var(--accent)]/70" />
                    <span className="size-2.5 rounded-full bg-[var(--color-highlight)]/70" />
                    <span className="size-2.5 rounded-full bg-[var(--foreground)]/20" />
                </span>

                <span className="ml-1 font-display text-[13px] font-medium text-[var(--foreground-muted)]">
                    Flujo contable automatizado
                </span>
            </div>

            {/* Pasos del proceso. Cada uno se enciende en su turno. */}
            <ol className="flex flex-col gap-1">
                {PROCESS_STEPS.map((step, index) => {
                    // Cada paso arranca desfasado, de modo que el foco recorre
                    // la lista de arriba abajo y vuelve a empezar.
                    const delaySeconds =
                        (index * CYCLE_SECONDS) / PROCESS_STEPS.length;

                    return (
                        <li
                            key={step.title}
                            className="relative flex items-start gap-3.5 rounded-xl px-3 py-3"
                            style={{
                                animation: `step-cycle ${CYCLE_SECONDS}s ease-in-out ${delaySeconds}s infinite`,
                            }}
                        >
                            <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-[var(--accent)]/12">
                                <Icon
                                    name={step.icon}
                                    className="size-[17px] text-[var(--accent)]"
                                />
                            </span>

                            <div className="min-w-0 flex-1">
                                <p className="font-display text-[15px] font-semibold leading-tight">
                                    {step.title}
                                </p>
                                <p className="mt-1 text-[13px] leading-snug text-[var(--foreground-muted)]">
                                    {step.detail}
                                </p>

                                {/* Barra que recorre el paso mientras está activo. */}
                                <div className="mt-2.5 h-[3px] overflow-hidden rounded-full bg-[var(--foreground)]/8">
                                    <div
                                        className="h-full origin-left rounded-full bg-[var(--accent)]"
                                        style={{
                                            animation: `progress-sweep ${CYCLE_SECONDS}s ease-in-out ${delaySeconds}s infinite`,
                                        }}
                                    />
                                </div>
                            </div>
                        </li>
                    );
                })}
            </ol>
        </div>
    );
}
