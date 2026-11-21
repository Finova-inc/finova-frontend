import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { GraficoGastoDiario } from "@/components/dashboard/metricas-ia/GraficoGastoDiario";
import { SimuladorIa } from "@/components/dashboard/metricas-ia/SimuladorIa";
import { TablasMetricas } from "@/components/dashboard/metricas-ia/TablasMetricas";
import { TarjetasResumen } from "@/components/dashboard/metricas-ia/TarjetasResumen";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { MensajeDeEstado } from "@/components/ui/MensajeDeEstado";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, copilotoApi, type MetricasCopiloto } from "@/lib/api";
import { formatearFecha } from "@/lib/formato";
import { exigirTokenSesion } from "@/lib/session";

/* ============================================================================
   Costos de IA: página interna del equipo Finova, no de los clientes.

   No está en el menú y no se indexa. La protección real es el backend: a
   quien no está en FINOVA_EQUIPO_RUTS le responde 404 y aquí se muestra el
   mismo "no existe" que cualquier ruta inventada.
   ========================================================================== */

export const metadata: Metadata = {
    title: "Costos de IA",
    robots: { index: false, follow: false },
};

type Parametros = Record<string, string | string[] | undefined>;

const CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)]";

export default async function CostosIaPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const { mes } = await searchParams;
    const mesPedido = typeof mes === "string" && /^\d{4}-(0[1-9]|1[0-2])$/.test(mes) ? mes : undefined;

    let metricas: MetricasCopiloto;
    try {
        metricas = await copilotoApi.metricas(mesPedido, { token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError && error.status === 404) notFound();
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        throw error;
    }

    const { supuestos } = metricas;
    const sinUso = Object.values(metricas.resultados).every((n) => n === 0);

    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-end justify-between gap-3">
                <div>
                    <div className="flex items-center gap-2">
                        <h1 className="font-display text-xl font-semibold text-[var(--foreground)]">Costos de IA</h1>
                        <Etiqueta tono="aviso">Interno</Etiqueta>
                    </div>
                    <p className="mt-1 text-[13px] text-[var(--foreground-muted)]">
                        Uso y costo del copiloto en todas las empresas. Solo lo ve el equipo Finova.
                    </p>
                </div>
                <form method="get" className="flex items-center gap-2">
                    <label htmlFor="mes" className="text-[12.5px] text-[var(--foreground-muted)]">
                        Mes
                    </label>
                    <input id="mes" name="mes" type="month" defaultValue={metricas.mes} className={CAMPO} />
                    <Boton type="submit" variante="neutro">
                        Ver
                    </Boton>
                </form>
            </div>

            {sinUso ? (
                <MensajeDeEstado
                    codigo="Sin datos"
                    titulo="Todavía no hay preguntas registradas en este mes"
                    acciones={
                        <Link href="/dashboard" className="text-[13px] text-[var(--accent-text)] underline">
                            Volver al panel
                        </Link>
                    }
                >
                    Cada pregunta al copiloto queda registrada con sus tokens y su costo. En local puedes cargar datos
                    ficticios con <code>npm run seed:copiloto-uso</code> en el backend.
                </MensajeDeEstado>
            ) : (
                <>
                    <TarjetasResumen metricas={metricas} />
                    <Panel>
                        <PanelCabecera titulo="Gasto por día" nota="Pasa el cursor sobre una barra para ver el detalle" />
                        <GraficoGastoDiario dias={metricas.por_dia} />
                    </Panel>
                    <TablasMetricas metricas={metricas} />
                </>
            )}

            <Panel>
                <PanelCabecera titulo="Simulador" nota="Costo de IA contra lo que pagarían los usuarios" />
                <SimuladorIa
                    costoPorPreguntaMicroUsd={
                        metricas.totales.preguntas > 0 ? metricas.totales.promedio_por_pregunta.costo_micro_usd : null
                    }
                    tokensPorPregunta={metricas.totales.promedio_por_pregunta.tokens_tope}
                    topeDiarioTokens={supuestos.tope_diario_tokens}
                    dolar={supuestos.dolar.valor}
                />
            </Panel>

            <p className="text-[12px] text-[var(--foreground-muted)]">
                Supuestos:{" "}
                {supuestos.dolar.fuente === "respaldo"
                    ? `dólar de respaldo $${supuestos.dolar.valor.replace(".", ",")} (mindicador.cl no respondió)`
                    : `dólar observado $${supuestos.dolar.valor.replace(".", ",")}${
                          supuestos.dolar.fecha ? ` del ${formatearFecha(supuestos.dolar.fecha)}` : ""
                      } (mindicador.cl)`}
                {" · "}modelo {supuestos.modelo} · tope diario {supuestos.tope_diario_tokens.toLocaleString("es-CL")}{" "}
                tokens por usuario · plan Estudio $49.900 con IVA.
            </p>
        </div>
    );
}
