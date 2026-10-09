import { Panel, PanelCabecera } from "@/components/ui/Panel";
import type { MesResumen } from "@/lib/api";
import { formatearCLP, formatearMontoCorto, nombreMes, nombreMesLargo } from "@/lib/formato";

/* ============================================================================
   Ingresos y gastos del ejercicio: barras pareadas por mes.

   ---------------------------------------------------------------------------
   QUE MUESTRA (Y QUE NO)
   ---------------------------------------------------------------------------
   Es el resultado devengado que sale del libro: cuentas de ingreso contra
   cuentas de gasto, mes a mes. No es flujo de caja: una venta a credito ya es
   ingreso aunque el cliente no haya pagado.

   ---------------------------------------------------------------------------
   SVG A MANO, SIN LIBRERIA
   ---------------------------------------------------------------------------
   La CSP de next.config.ts solo admite scripts propios y el proyecto no tiene
   dependencias de UI (ver Icon.tsx). Son dos series y hasta doce meses: el
   SVG cabe en una pantalla.

   ---------------------------------------------------------------------------
   COLORES
   ---------------------------------------------------------------------------
   Ingresos y gastos son identidades, no estados: no van en el verde y el rojo
   de --positivo/--critico, que se reservan para "bien"/"mal". Celeste y rosa
   del estuche de destacadores, con el rosa un punto mas profundo que
   --hl-pink: asi el par pasa los chequeos de luminosidad, daltonismo y
   contraste (validate_palette.js del skill de visualizacion) en tema claro Y
   oscuro con los mismos valores.
   ========================================================================== */

const COLOR_INGRESOS = "#2f8cff";
const COLOR_GASTOS = "#f2437f";

/** Geometria del dibujo. El viewBox reserva margen para las etiquetas de ambos ejes. */
const ANCHO = 520;
const ALTO = 220;
const MARGEN_IZQ = 46; // etiquetas del eje vertical
const MARGEN_DER = 8;
const BASE = 199; // linea del cero
const TOPE = 18; // primera linea de grilla
const SEPARACION = 2; // entre las dos barras de un mes

type GraficoIngresosGastosProps = {
    readonly meses: readonly MesResumen[];
    readonly anio: number;
};

/**
 * Tope del eje redondeado a una cifra "limpia" de la magnitud del dato: 4,6
 * millones sube a 5 millones y 450 mil a 500 mil. Un redondeo fijo a decenas
 * de millon dejaba las barras de una PYME chica pegadas al cero.
 */
function topeDelEje(maximo: number): number {
    if (maximo <= 0) return 1;
    const magnitud = 10 ** Math.floor(Math.log10(maximo));
    return Math.ceil(maximo / magnitud) * magnitud;
}

export function GraficoIngresosGastos({ meses, anio }: GraficoIngresosGastosProps) {
    // Los montos llegan en string; se pasan a numero SOLO para la geometria.
    // Los rotulos salen siempre del string original con formatearCLP.
    const datos = meses.map((m) => ({ ...m, nIngresos: Number(m.ingresos), nGastos: Number(m.gastos) }));
    const sinMovimiento = datos.every((d) => d.nIngresos === 0 && d.nGastos === 0);
    const ultimo = meses[meses.length - 1];

    return (
        <Panel sinRelleno>
            <div className="px-5 pt-4">
                <PanelCabecera titulo="Ingresos y gastos" nota={`Ejercicio ${anio} · según el libro`} />
            </div>

            {ultimo ? (
                <div className="flex flex-wrap gap-5 px-5 pt-3.5">
                    <Cifra
                        etiqueta={`Ingresos de ${nombreMesLargo(ultimo.mes).toLowerCase()}`}
                        valor={ultimo.ingresos}
                        color={COLOR_INGRESOS}
                    />
                    <Cifra
                        etiqueta={`Gastos de ${nombreMesLargo(ultimo.mes).toLowerCase()}`}
                        valor={ultimo.gastos}
                        color={COLOR_GASTOS}
                    />
                    <Cifra etiqueta="Resultado del mes" valor={ultimo.resultado} />
                </div>
            ) : null}

            <div className="px-3 pb-4 pt-2.5">
                {sinMovimiento ? (
                    <p className="mx-2 rounded-lg border border-dashed border-[var(--border-strong)] px-4 py-10 text-center text-[13px] text-[var(--foreground-muted)]">
                        Aún no hay asientos de ingresos o gastos en {anio}.
                    </p>
                ) : (
                    <Barras datos={datos} />
                )}
            </div>
        </Panel>
    );
}

type MesDibujado = MesResumen & { readonly nIngresos: number; readonly nGastos: number };

function Barras({ datos }: { readonly datos: readonly MesDibujado[] }) {
    // Un mes con ingresos negativos (una nota de credito mayor que las ventas)
    // se dibuja en cero: el tooltip y el resumen muestran la cifra real.
    const tope = topeDelEje(Math.max(...datos.flatMap((d) => [d.nIngresos, d.nGastos]), 0));
    const y = (valor: number) => BASE - (Math.max(valor, 0) / tope) * (BASE - TOPE);
    const lineas = [1, 0.8, 0.6, 0.4, 0.2].map((f) => f * tope);

    const anchoUtil = ANCHO - MARGEN_IZQ - MARGEN_DER;
    const pasoMes = anchoUtil / datos.length;
    // Con seis meses las barras miden 20; con doce se angostan para no encimarse.
    const anchoBarra = Math.min(20, pasoMes * 0.34);

    return (
        <svg
            viewBox={`0 0 ${ANCHO} ${ALTO}`}
            className="block h-auto w-full max-w-full"
            role="img"
            aria-label={`Ingresos y gastos mensuales. ${datos
                .map(
                    (d) =>
                        `${nombreMes(d.mes)}: ingresos ${formatearCLP(d.ingresos)}, gastos ${formatearCLP(d.gastos)}`,
                )
                .join("; ")}.`}
        >
            <g stroke="var(--border-subtle)" strokeWidth="1">
                {lineas.map((valor) => (
                    <line key={valor} x1={MARGEN_IZQ} y1={y(valor)} x2={ANCHO - MARGEN_DER} y2={y(valor)} />
                ))}
            </g>

            <g fill="var(--foreground-muted)" fontSize="10" fontFamily="var(--font-sans)" textAnchor="end">
                {lineas.map((valor) => (
                    <text key={valor} x={MARGEN_IZQ - 6} y={y(valor) + 3}>
                        {formatearMontoCorto(valor)}
                    </text>
                ))}
                <text x={MARGEN_IZQ - 6} y={BASE + 4}>
                    0
                </text>
            </g>

            <line
                x1={MARGEN_IZQ}
                y1={BASE}
                x2={ANCHO - MARGEN_DER}
                y2={BASE}
                stroke="var(--border-strong)"
                strokeWidth="1"
            />

            {datos.map((mes, indice) => {
                const centro = MARGEN_IZQ + pasoMes * indice + pasoMes / 2;
                const actual = indice === datos.length - 1;

                return (
                    <g key={mes.mes}>
                        {/* <title> es el tooltip nativo: sin JS, con la cifra exacta. */}
                        <rect
                            x={centro - anchoBarra - SEPARACION / 2}
                            y={y(mes.nIngresos)}
                            width={anchoBarra}
                            height={BASE - y(mes.nIngresos)}
                            rx="2"
                            fill={COLOR_INGRESOS}
                        >
                            <title>{`${nombreMesLargo(mes.mes)}: ingresos ${formatearCLP(mes.ingresos)}`}</title>
                        </rect>
                        <rect
                            x={centro + SEPARACION / 2}
                            y={y(mes.nGastos)}
                            width={anchoBarra}
                            height={BASE - y(mes.nGastos)}
                            rx="2"
                            fill={COLOR_GASTOS}
                        >
                            <title>{`${nombreMesLargo(mes.mes)}: gastos ${formatearCLP(mes.gastos)}`}</title>
                        </rect>
                        <text
                            x={centro}
                            y={ALTO - 5}
                            fill={actual ? "var(--foreground)" : "var(--foreground-muted)"}
                            fontSize="10.5"
                            fontFamily="var(--font-sans)"
                            fontWeight={actual ? "600" : "400"}
                            textAnchor="middle"
                        >
                            {nombreMes(mes.mes)}
                        </text>
                    </g>
                );
            })}
        </svg>
    );
}

/**
 * Cifra del mes en curso. Las de ingresos y gastos llevan la muestra de color
 * de su serie: hacen de leyenda del grafico. El valor va en tinta de texto,
 * nunca en el color de la serie.
 */
function Cifra({
    etiqueta,
    valor,
    color,
}: {
    readonly etiqueta: string;
    readonly valor: string;
    readonly color?: string;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 text-[11.5px] text-[var(--foreground-muted)]">
                {color ? <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} /> : null}
                {etiqueta}
            </span>
            <span className="tabular font-display text-lg font-semibold">{formatearCLP(valor)}</span>
        </div>
    );
}
