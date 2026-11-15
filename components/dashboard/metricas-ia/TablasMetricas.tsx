import type { ReactNode } from "react";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { formatearCLP } from "@/lib/formato";
import type { MetricasCopiloto, ResultadoUsoCopiloto } from "@/lib/api";
import { formatearUsd, netoSinIva, porcentaje, PRECIO_PLAN_ESTUDIO_CLP } from "@/lib/metricas-ia";

const RESULTADOS: readonly { readonly clave: ResultadoUsoCopiloto; readonly texto: string }[] = [
    { clave: "completo", texto: "Completas" },
    { clave: "respuesta_cortada", texto: "Cortadas (límite de largo)" },
    { clave: "rechazo", texto: "Rechazadas por el modelo" },
    { clave: "limite_vueltas", texto: "Demasiadas consultas" },
    { clave: "cancelado", texto: "Detenidas por el usuario" },
    { clave: "error", texto: "Con error" },
];

const HERRAMIENTAS: Readonly<Record<string, string>> = {
    buscar_cuentas: "Buscar cuentas",
    libro_mayor_cuenta: "Libro mayor",
    balance_comprobacion: "Balance de comprobación",
    buscar_asientos: "Buscar asientos",
};

const CELDA = "px-4 py-2 text-[13px]";
const CABECERA = "px-4 py-2 text-left text-[12px] font-medium text-[var(--foreground-muted)]";

function Tabla({ cabeceras, children }: { readonly cabeceras: readonly string[]; readonly children: ReactNode }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full border-collapse">
                <thead>
                    <tr className="border-b border-[var(--border-subtle)]">
                        {cabeceras.map((c, i) => (
                            <th key={c} scope="col" className={`${CABECERA} ${i > 0 ? "text-right" : ""}`}>
                                {c}
                            </th>
                        ))}
                    </tr>
                </thead>
                <tbody className="tabular-nums">{children}</tbody>
            </table>
        </div>
    );
}

/** Cómo terminan las respuestas, topes, herramientas y quién más gasta. */
export function TablasMetricas({ metricas }: { readonly metricas: MetricasCopiloto }) {
    const respondidas = RESULTADOS.reduce((suma, r) => suma + metricas.resultados[r.clave], 0);
    const netoPlan = netoSinIva(PRECIO_PLAN_ESTUDIO_CLP);

    return (
        <div className="grid gap-4 lg:grid-cols-2">
            <Panel sinRelleno>
                <PanelCabecera
                    titulo="Cómo terminan las respuestas"
                    nota={`Tope diario alcanzado: ${metricas.topes.veces} ${metricas.topes.veces === 1 ? "vez" : "veces"} (${
                        metricas.topes.usuarios
                    } ${metricas.topes.usuarios === 1 ? "usuario" : "usuarios"}) · Frenadas por ráfaga: ${metricas.resultados.rafaga}`}
                />
                <Tabla cabeceras={["Resultado", "Preguntas", "%"]}>
                    {RESULTADOS.map((r) => (
                        <tr key={r.clave} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className={CELDA}>{r.texto}</td>
                            <td className={`${CELDA} text-right`}>{metricas.resultados[r.clave]}</td>
                            <td className={`${CELDA} text-right`}>
                                {porcentaje(BigInt(metricas.resultados[r.clave]), BigInt(respondidas))}
                            </td>
                        </tr>
                    ))}
                </Tabla>
            </Panel>

            <Panel sinRelleno>
                <PanelCabecera titulo="Consultas que hizo el copiloto" />
                <Tabla cabeceras={["Herramienta", "Usos"]}>
                    {metricas.herramientas.map((h) => (
                        <tr key={h.nombre} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className={CELDA}>{HERRAMIENTAS[h.nombre] ?? h.nombre}</td>
                            <td className={`${CELDA} text-right`}>{h.usos}</td>
                        </tr>
                    ))}
                </Tabla>
            </Panel>

            <Panel sinRelleno>
                <PanelCabecera titulo="Empresas que más gastan" nota="% sobre el plan Estudio neto de IVA" />
                <Tabla cabeceras={["Empresa", "Gasto", "Preguntas", "% del plan"]}>
                    {metricas.empresas.map((e) => (
                        <tr key={e.razon_social} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className={CELDA}>{e.razon_social}</td>
                            <td className={`${CELDA} text-right`}>
                                {formatCLPconUsd(e.costo_clp, e.costo_micro_usd)}
                            </td>
                            <td className={`${CELDA} text-right`}>{e.preguntas}</td>
                            <td className={`${CELDA} text-right`}>{porcentaje(BigInt(e.costo_clp), netoPlan)}</td>
                        </tr>
                    ))}
                </Tabla>
            </Panel>

            <Panel sinRelleno>
                <PanelCabecera titulo="Usuarios que más gastan" nota="Anónimos: la etiqueta cambia cada mes" />
                <Tabla cabeceras={["Usuario", "Gasto", "Preguntas", "Topes"]}>
                    {metricas.usuarios.map((u) => (
                        <tr key={`${u.etiqueta}`} className="border-b border-[var(--border-subtle)] last:border-0">
                            <td className={CELDA}>
                                {u.etiqueta}
                                <span className="block text-[11.5px] text-[var(--foreground-muted)]">{u.razon_social}</span>
                            </td>
                            <td className={`${CELDA} text-right`}>{formatearUsd(u.costo_micro_usd)}</td>
                            <td className={`${CELDA} text-right`}>{u.preguntas}</td>
                            <td className={`${CELDA} text-right`}>{u.topes}</td>
                        </tr>
                    ))}
                </Tabla>
            </Panel>
        </div>
    );
}

function formatCLPconUsd(clp: string, microUsd: string): string {
    return `${formatearCLP(clp)} (${formatearUsd(microUsd)})`;
}
