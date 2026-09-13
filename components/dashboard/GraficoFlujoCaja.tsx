import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { formatearCLP, formatearMontoCorto, nombreMes } from "@/lib/formato";
import type { MesFlujo } from "@/lib/datos-ejemplo";

/* ============================================================================
   Grafico de flujo de caja: barras pareadas por mes.

   ---------------------------------------------------------------------------
   SVG A MANO, SIN LIBRERIA
   ---------------------------------------------------------------------------
   Tres razones, en orden de peso:

   1. La CSP de next.config.ts solo admite 'self' para scripts. Una libreria de
      graficos desde CDN no cargaria, y sin error visible.
   2. El proyecto no tiene ninguna dependencia de UI: Icon.tsx ya documenta el
      rechazo a lucide-react por traer cientos de iconos que no se usan. Meter
      recharts por un grafico de barras seria la primera grieta en esa decision.
   3. Son seis meses y dos series. El SVG cabe en una pantalla.

   ---------------------------------------------------------------------------
   UNA SOLA ESCALA
   ---------------------------------------------------------------------------
   El maximo del eje se calcula de los datos y se redondea hacia arriba a la
   decena de millon siguiente, para que las lineas de grilla caigan en cifras
   redondas. Las barras, las marcas y las etiquetas se posicionan todas con la
   misma funcion `y()`: si la escala cambia, nada se descoloca.
   ========================================================================== */

/** Geometria del dibujo. El viewBox reserva margen para las etiquetas de ambos ejes. */
const ANCHO = 520;
const ALTO = 220;
const MARGEN_IZQ = 46; // etiquetas del eje vertical
const MARGEN_DER = 8;
const BASE = 199; // linea del cero
const TOPE = 18; // primera linea de grilla
const ANCHO_BARRA = 20;

type GraficoFlujoCajaProps = {
    readonly datos: readonly MesFlujo[];
    /** Marca el bloque como datos de ejemplo. */
    readonly esEjemplo?: boolean;
};

export function GraficoFlujoCaja({ datos, esEjemplo = false }: GraficoFlujoCajaProps) {
    // Escala redondeada a la decena de millon superior, con un minimo por si
    // llegan datos vacios (evita dividir por cero).
    const maximoReal = Math.max(...datos.flatMap((d) => [d.ingresos, d.egresos]), 1);
    const tope = Math.ceil(maximoReal / 10_000_000) * 10_000_000;

    /** Convierte un monto en coordenada vertical. Una sola funcion para todo. */
    const y = (valor: number) => BASE - (valor / tope) * (BASE - TOPE);

    // Cinco lineas de grilla ademas del cero.
    const lineas = [1, 0.8, 0.6, 0.4, 0.2].map((f) => f * tope);

    const anchoUtil = ANCHO - MARGEN_IZQ - MARGEN_DER;
    const pasoMes = anchoUtil / datos.length;

    const ultimo = datos[datos.length - 1];
    const totalIngresos = ultimo?.ingresos ?? 0;
    const totalEgresos = ultimo?.egresos ?? 0;
    const resultado = totalIngresos - totalEgresos;

    return (
        <Panel sinRelleno>
            <div className="px-5 pt-4">
                <PanelCabecera
                    titulo="Flujo de caja"
                    nota={
                        esEjemplo ? (
                            <Etiqueta tono="demo">Sin backend</Etiqueta>
                        ) : (
                            "Últimos 6 meses"
                        )
                    }
                />
            </div>

            <div className="flex flex-wrap gap-5 px-5 pt-3.5">
                <Resumen
                    etiqueta="Ingresos del mes"
                    valor={formatearCLP(totalIngresos)}
                    marca="bg-[var(--positivo)]"
                />
                <Resumen
                    etiqueta="Egresos del mes"
                    valor={formatearCLP(totalEgresos)}
                    marca="bg-[var(--critico)]"
                />
                <Resumen
                    etiqueta="Resultado"
                    valor={formatearCLP(resultado)}
                    color={resultado >= 0 ? "text-[var(--positivo)]" : "text-[var(--critico)]"}
                />
            </div>

            <div className="px-3 pb-4 pt-2.5">
                <svg
                    viewBox={`0 0 ${ANCHO} ${ALTO}`}
                    className="block h-auto w-full max-w-full"
                    role="img"
                    aria-label={`Ingresos y egresos mensuales. ${datos
                        .map(
                            (d) =>
                                `${nombreMes(d.mes)}: ingresos ${formatearMontoCorto(
                                    d.ingresos,
                                )}, egresos ${formatearMontoCorto(d.egresos)}`,
                        )
                        .join("; ")}.`}
                >
                    {/* Grilla */}
                    <g stroke="var(--border-subtle)" strokeWidth="1">
                        {lineas.map((valor) => (
                            <line
                                key={valor}
                                x1={MARGEN_IZQ}
                                y1={y(valor)}
                                x2={ANCHO - MARGEN_DER}
                                y2={y(valor)}
                            />
                        ))}
                    </g>

                    {/* Etiquetas del eje vertical. Cada una nombra un valor que
                        el grafico efectivamente alcanza. */}
                    <g
                        fill="var(--foreground-muted)"
                        fontSize="10"
                        fontFamily="var(--font-sans)"
                        textAnchor="end"
                    >
                        {lineas.map((valor) => (
                            <text key={valor} x={MARGEN_IZQ - 6} y={y(valor) + 3}>
                                {formatearMontoCorto(valor)}
                            </text>
                        ))}
                        <text x={MARGEN_IZQ - 6} y={BASE + 4}>
                            0
                        </text>
                    </g>

                    {/* Linea del cero, mas marcada que la grilla */}
                    <line
                        x1={MARGEN_IZQ}
                        y1={BASE}
                        x2={ANCHO - MARGEN_DER}
                        y2={BASE}
                        stroke="var(--border-strong)"
                        strokeWidth="1"
                    />

                    {/* Barras pareadas */}
                    {datos.map((mes, indice) => {
                        const centro = MARGEN_IZQ + pasoMes * indice + pasoMes / 2;
                        const xIngreso = centro - ANCHO_BARRA - 1.5;
                        const xEgreso = centro + 1.5;

                        return (
                            <g key={mes.mes}>
                                <rect
                                    x={xIngreso}
                                    y={y(mes.ingresos)}
                                    width={ANCHO_BARRA}
                                    height={BASE - y(mes.ingresos)}
                                    rx="3"
                                    fill="var(--positivo)"
                                />
                                <rect
                                    x={xEgreso}
                                    y={y(mes.egresos)}
                                    width={ANCHO_BARRA}
                                    height={BASE - y(mes.egresos)}
                                    rx="3"
                                    fill="var(--critico)"
                                    opacity="0.85"
                                />
                                <text
                                    x={centro}
                                    y={ALTO - 5}
                                    fill={
                                        indice === datos.length - 1
                                            ? "var(--foreground)"
                                            : "var(--foreground-muted)"
                                    }
                                    fontSize="10.5"
                                    fontFamily="var(--font-sans)"
                                    fontWeight={indice === datos.length - 1 ? "600" : "400"}
                                    textAnchor="middle"
                                >
                                    {nombreMes(mes.mes)}
                                </text>
                            </g>
                        );
                    })}
                </svg>
            </div>
        </Panel>
    );
}

type ResumenProps = {
    readonly etiqueta: string;
    readonly valor: string;
    readonly marca?: string;
    readonly color?: string;
};

function Resumen({ etiqueta, valor, marca, color }: ResumenProps) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--foreground-muted)]">
                {marca ? <span className={`size-2 shrink-0 rounded-sm ${marca}`} /> : null}
                {etiqueta}
            </span>
            <span className={`tabular font-display text-lg font-semibold ${color ?? ""}`}>
                {valor}
            </span>
        </div>
    );
}
