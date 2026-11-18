import type { MetricasCopiloto } from "@/lib/api";
import { formatearUsd } from "@/lib/metricas-ia";

const ANCHO = 720;
const ALTO = 180;
const BASE = 160;
const TOPE = 12;
const MARGEN = 8;

/**
 * Gasto por día del mes: una barra por día, SVG a mano (la CSP bloquea las
 * librerías de gráficos). La altura se calcula en BigInt sobre micro-dólares
 * y recién al final se pasa a píxeles.
 */
export function GraficoGastoDiario({ dias }: { readonly dias: MetricasCopiloto["por_dia"] }) {
    const maximo = dias.reduce((max, d) => {
        const valor = BigInt(d.costo_micro_usd);
        return valor > max ? valor : max;
    }, BigInt(0));
    const paso = (ANCHO - 2 * MARGEN) / dias.length;
    const anchoBarra = Math.max(2, paso * 0.6);
    // Milésimas de la altura útil: suficiente resolución para un gráfico.
    const alto = (micro: string) =>
        maximo === BigInt(0) ? 0 : (Number((BigInt(micro) * BigInt(1000)) / maximo) / 1000) * (BASE - TOPE);

    return (
        <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            className="block h-auto w-full max-w-full"
            role="img"
            aria-label={`Gasto por día. ${dias
                .filter((d) => d.preguntas > 0)
                .map((d) => `${d.fecha.slice(8)}: ${formatearUsd(d.costo_micro_usd)}`)
                .join("; ")}.`}
        >
            <line x1={MARGEN} y1={BASE} x2={ANCHO - MARGEN} y2={BASE} stroke="var(--border-subtle)" strokeWidth="1" />
            {dias.map((d, i) => {
                const h = alto(d.costo_micro_usd);
                const x = MARGEN + i * paso + (paso - anchoBarra) / 2;
                return (
                    <g key={d.fecha}>
                        <title>{`${d.fecha}: ${formatearUsd(d.costo_micro_usd)} · ${d.preguntas} preguntas`}</title>
                        <rect x={x} y={BASE - h} width={anchoBarra} height={h} rx="2" fill="var(--accent)" />
                        {(i === 0 || (i + 1) % 5 === 0) && (
                            <text
                                x={x + anchoBarra / 2}
                                y={BASE + 14}
                                fontSize="10"
                                fontFamily="var(--font-sans)"
                                textAnchor="middle"
                                fill="var(--foreground-muted)"
                            >
                                {Number(d.fecha.slice(8))}
                            </text>
                        )}
                    </g>
                );
            })}
        </svg>
    );
}
