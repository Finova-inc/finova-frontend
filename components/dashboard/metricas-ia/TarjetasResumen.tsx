import type { ReactNode } from "react";
import { formatearCLP } from "@/lib/formato";
import type { MetricasCopiloto } from "@/lib/api";
import { estadoPresupuesto, formatearUsd, porcentaje } from "@/lib/metricas-ia";

const ENTERO = new Intl.NumberFormat("es-CL");

function Tarjeta({
    titulo,
    valor,
    detalle,
    critico = false,
}: {
    readonly titulo: string;
    readonly valor: string;
    readonly detalle: ReactNode;
    readonly critico?: boolean;
}) {
    return (
        <div
            className={`rounded-xl border bg-[var(--surface)] p-4 ${
                critico ? "border-[var(--critico)]" : "border-[var(--border-subtle)]"
            }`}
        >
            <p className="text-[12px] text-[var(--foreground-muted)]">{titulo}</p>
            <p
                className={`mt-1 font-display text-[22px] font-semibold tabular-nums ${
                    critico ? "text-[var(--critico)]" : "text-[var(--foreground)]"
                }`}
            >
                {valor}
            </p>
            <p className="mt-0.5 text-[12px] text-[var(--foreground-muted)]">{detalle}</p>
        </div>
    );
}

/** Las cuatro cifras de arriba: gasto, proyección contra presupuesto, preguntas y costo por pregunta. */
export function TarjetasResumen({ metricas }: { readonly metricas: MetricasCopiloto }) {
    const { totales, supuestos } = metricas;
    const estado = estadoPresupuesto(metricas.proyeccion_micro_usd, supuestos.presupuesto_micro_usd);
    const mesCerrado = metricas.dias_transcurridos === metricas.dias_del_mes;

    return (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <Tarjeta
                titulo="Gasto del mes"
                valor={formatearUsd(totales.costo_micro_usd)}
                detalle={`≈ ${formatearCLP(totales.costo_clp)}`}
            />
            <Tarjeta
                titulo={mesCerrado ? "Total del mes" : "Proyección a fin de mes"}
                valor={formatearUsd(metricas.proyeccion_micro_usd)}
                critico={estado === "excedido"}
                detalle={
                    estado === "sin-presupuesto"
                        ? "Sin presupuesto"
                        : `${porcentaje(
                              BigInt(metricas.proyeccion_micro_usd),
                              BigInt(supuestos.presupuesto_micro_usd ?? "0"),
                          )} del presupuesto (${formatearUsd(supuestos.presupuesto_micro_usd ?? "0")})${
                              estado === "excedido" ? ": lo supera" : ""
                          }`
                }
            />
            <Tarjeta
                titulo="Preguntas"
                valor={ENTERO.format(totales.preguntas)}
                detalle={`${totales.usuarios} ${totales.usuarios === 1 ? "usuario" : "usuarios"} · ${totales.empresas} ${
                    totales.empresas === 1 ? "empresa" : "empresas"
                }`}
            />
            <Tarjeta
                titulo="Costo por pregunta"
                valor={formatearUsd(totales.promedio_por_pregunta.costo_micro_usd)}
                detalle={`${ENTERO.format(totales.promedio_por_pregunta.tokens)} tokens en promedio`}
            />
        </div>
    );
}
