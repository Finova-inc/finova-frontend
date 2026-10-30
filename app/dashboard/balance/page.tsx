/* ============================================================================
   /dashboard/balance — Módulo Balance: una tarjeta por reporte.

   Cada reporte vive en su ruta, con selector de período y exportación. Todos
   salen del mismo libro que el diario y el mayor: no hay otra fuente de cifras.
   ========================================================================== */

import Link from "next/link";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Encabezado } from "../core-contable/partes";

export const metadata = { title: "Balance" };

const REPORTES: readonly { href?: string; titulo: string; descripcion: string }[] = [
    {
        href: "/dashboard/balance/comprobacion",
        titulo: "Balance de comprobación",
        descripcion: "Debe, haber y saldos deudor y acreedor de cada cuenta. Verifica que el libro cuadre.",
    },
    {
        href: "/dashboard/balance/general",
        titulo: "Balance general",
        descripcion: "Activos, pasivos y patrimonio al cierre del mes, con el resultado del ejercicio.",
    },
    {
        href: "/dashboard/balance/tributario",
        titulo: "Balance tributario (8 columnas)",
        descripcion: "Sumas, saldos, inventario y resultados por cuenta, con la utilidad o pérdida del período.",
    },
    {
        href: "/dashboard/balance/resultados",
        titulo: "Estado de resultados",
        descripcion: "Ingresos y gastos del período, con el resultado: ganancia menos pérdida.",
    },
    {
        href: "/dashboard/balance/notas",
        titulo: "Notas a los estados financieros",
        descripcion: "Información general, políticas contables y una nota por partida, según la Sección 8 de la NIIF para PYMES.",
    },
];

export default function BalanceHubPage() {
    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Balance"
                descripcion="Elige un reporte. Todos tienen selector de período y se pueden exportar a CSV o imprimir."
            />
            <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {REPORTES.map((r) => (
                    <li key={r.titulo}>
                        {r.href ? (
                            <Link
                                href={r.href}
                                className="flex h-full flex-col gap-1.5 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4 transition-colors hover:border-[var(--accent)] hover:bg-[var(--background-raised)]"
                            >
                                <span className="font-display text-[14px] font-semibold">{r.titulo}</span>
                                <span className="text-[12.5px] text-[var(--foreground-muted)]">{r.descripcion}</span>
                            </Link>
                        ) : (
                            <div className="flex h-full flex-col gap-1.5 rounded-xl border border-dashed border-[var(--border-strong)] p-4 opacity-70">
                                <span className="flex items-center justify-between gap-2 font-display text-[14px] font-semibold">
                                    {r.titulo}
                                    <Etiqueta tono="neutro">Próximamente</Etiqueta>
                                </span>
                                <span className="text-[12.5px] text-[var(--foreground-muted)]">{r.descripcion}</span>
                            </div>
                        )}
                    </li>
                ))}
            </ul>
        </div>
    );
}
