import Link from "next/link";

import { Icon } from "@/components/ui/Icon";
import { SectionShell } from "@/components/ui/SectionShell";

/**
 * "Precios": tres planes según el tamaño de quien contrata.
 *
 * Los valores están en pesos chilenos y son referenciales, algo que se dice
 * explícitamente en la sección: el producto está en desarrollo y publicar
 * precios como definitivos sería faltar a la verdad.
 *
 * PriceTier es local a este archivo por la misma razón que FeatureCard: un solo
 * consumidor.
 */

const PRICING_TIERS: ReadonlyArray<{
    name: string;
    price: string;
    period: string;
    audience: string;
    features: readonly string[];
    /** El plan sugerido se destaca visualmente. */
    isFeatured: boolean;
    ctaLabel: string;
}> = [
    {
        name: "Independiente",
        price: "$ 19.900",
        period: "al mes",
        audience: "Para quien lleva su propia contabilidad.",
        features: [
            "Una empresa",
            "Importación de DTE desde el SII",
            "Propuesta de F29",
            "Libros de compra y venta",
            "Soporte por correo",
        ],
        isFeatured: false,
        ctaLabel: "Empezar",
    },
    {
        name: "Estudio",
        price: "$ 49.900",
        period: "al mes",
        audience: "Para contadores con cartera de clientes.",
        features: [
            "Hasta 15 empresas",
            "Todo lo del plan Independiente",
            "Copiloto tributario con IA",
            "Detección de inconsistencias",
            "Roles y permisos por empresa",
            "Auditoría y trazabilidad",
        ],
        isFeatured: true,
        ctaLabel: "Empezar",
    },
    {
        name: "Corporativo",
        price: "A conversar",
        period: "",
        audience: "Para empresas con volumen y reglas propias.",
        features: [
            "Empresas ilimitadas",
            "Todo lo del plan Estudio",
            "Integraciones a medida",
            "Reglas tributarias propias",
            "Acompañamiento en la puesta en marcha",
        ],
        isFeatured: false,
        ctaLabel: "Hablemos",
    },
];

/** Tarjeta de un plan. Local a esta sección. */
function PriceTier({
    tier,
}: {
    readonly tier: (typeof PRICING_TIERS)[number];
}) {
    return (
        <article
            className={`relative flex flex-col rounded-2xl border p-7 ${
                tier.isFeatured
                    ? "border-[var(--accent)] bg-[var(--background)] shadow-lg shadow-[var(--accent)]/5"
                    : "border-[var(--border-subtle)] bg-[var(--background)]"
            }`}
        >
            {tier.isFeatured && (
                <span className="absolute -top-3 left-7 rounded-full bg-[var(--accent)] px-3 py-1 font-display text-[11px] font-semibold uppercase tracking-wider text-white">
                    El más elegido
                </span>
            )}

            <h3 className="font-display text-lg font-bold tracking-tight">
                {tier.name}
            </h3>

            <p className="mt-1.5 text-[14px] text-[var(--foreground-muted)]">
                {tier.audience}
            </p>

            <p className="mt-6 flex items-baseline gap-1.5">
                <span className="tabular font-display text-4xl font-bold tracking-tight">
                    {tier.price}
                </span>
                {tier.period && (
                    <span className="text-sm text-[var(--foreground-muted)]">
                        {tier.period}
                    </span>
                )}
            </p>

            <ul className="mt-7 flex flex-1 flex-col gap-3">
                {tier.features.map((feature) => (
                    <li key={feature} className="flex items-start gap-2.5 text-[15px]">
                        <Icon
                            name="check"
                            className="mt-1 size-4 shrink-0 text-[var(--accent)]"
                        />
                        <span className="text-[var(--foreground-muted)]">
                            {feature}
                        </span>
                    </li>
                ))}
            </ul>

            <Link
                href="/login"
                className={`mt-8 rounded-xl px-5 py-3 text-center font-display text-[15px] font-medium transition-opacity hover:opacity-90 ${
                    tier.isFeatured
                        ? "bg-[var(--accent)] text-white"
                        : "border border-[var(--border-subtle)]"
                }`}
            >
                {tier.ctaLabel}
            </Link>
        </article>
    );
}

export function PricingSection() {
    return (
        <SectionShell
            id="precios"
            eyebrow="Precios"
            title="Un plan por tamaño, sin letra chica"
            description="Valores en pesos chilenos, sin IVA. Puedes cambiar de plan o cancelar cuando quieras."
        >
            <div className="grid gap-5 lg:grid-cols-3">
                {PRICING_TIERS.map((tier) => (
                    <PriceTier key={tier.name} tier={tier} />
                ))}
            </div>

            {/* Advertencia honesta: el producto está en construcción y estos
                precios todavía no son un compromiso comercial. */}
            <p className="mt-8 text-[13px] text-[var(--foreground-muted)]">
                Precios referenciales. Finova está en desarrollo y los valores
                definitivos se confirmarán antes del lanzamiento.
            </p>
        </SectionShell>
    );
}
