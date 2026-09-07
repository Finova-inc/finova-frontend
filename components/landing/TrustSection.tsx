import { Icon, type IconName } from "@/components/ui/Icon";
import { SectionShell } from "@/components/ui/SectionShell";

/**
 * "Confianza": cómo se cuidan los datos y qué NO hace el producto.
 *
 * Los datos contables de una empresa son material sensible, así que esta
 * sección existe para responder la pregunta que un contador se hace de
 * inmediato: quién puede ver esto y qué pasa si algo sale mal.
 *
 * La última tarjeta dice explícitamente lo que Finova no hace. Declarar los
 * límites genera más confianza que prometer de más, y además evita el
 * malentendido de que el sistema declara por cuenta propia ante el SII.
 */

const TRUST_POINTS: ReadonlyArray<{
    icon: IconName;
    title: string;
    description: string;
}> = [
    {
        icon: "shield",
        title: "Datos aislados por empresa",
        description:
            "Cada empresa vive en su propio espacio lógico. Un usuario de un estudio contable solo alcanza las empresas que tiene asignadas.",
    },
    {
        icon: "clock",
        title: "Historial completo",
        description:
            "Toda operación queda registrada con autor y fecha. Si una cifra cambió, se puede reconstruir cuándo y por quién.",
    },
    {
        icon: "document",
        title: "Cifrado en tránsito y en reposo",
        description:
            "La información viaja por HTTPS y se almacena cifrada. Las contraseñas nunca se guardan en texto plano.",
    },
    {
        icon: "alert",
        title: "Tú declaras, no el sistema",
        description:
            "Finova prepara y revisa la propuesta de F29, pero la presentación ante el SII siempre la haces tú. La decisión final es humana.",
    },
];

export function TrustSection() {
    return (
        <SectionShell
            eyebrow="Confianza"
            title="Datos contables, tratados como tales"
            description="Cómo Finova cuida la información de tus clientes, y dónde termina su responsabilidad."
            tone="raised"
        >
            <div className="grid gap-4 sm:grid-cols-2">
                {TRUST_POINTS.map((point) => (
                    <article
                        key={point.title}
                        className="flex gap-4 rounded-2xl border border-[var(--border-subtle)] bg-[var(--background)] p-6"
                    >
                        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--background-raised)]">
                            <Icon
                                name={point.icon}
                                className="size-[18px] text-[var(--accent)]"
                            />
                        </span>

                        <div>
                            <h3 className="mb-2 font-display text-[17px] font-bold tracking-tight">
                                {point.title}
                            </h3>
                            <p className="text-[15px] leading-relaxed text-[var(--foreground-muted)] text-pretty">
                                {point.description}
                            </p>
                        </div>
                    </article>
                ))}
            </div>
        </SectionShell>
    );
}
