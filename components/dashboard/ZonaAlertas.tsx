import Link from "next/link";

import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import { formatearCLP } from "@/lib/formato";
import type { Alerta, SeveridadAlerta } from "@/lib/datos-ejemplo";

/* ============================================================================
   Zona 1 — Lo urgente.

   ---------------------------------------------------------------------------
   POR QUE ESTAS FILAS NO SON TARJETAS
   ---------------------------------------------------------------------------
   El impulso natural seria una tarjeta por alerta. Se descarto: tres tarjetas
   flotando compiten entre si y con el resto del panel, y el ojo no sabe cual
   mirar primero. Aqui van como filas dentro de un solo contenedor, separadas
   por una linea de un pixel, con una franja de severidad de 3px a la izquierda.

   La franja hace un trabajo que el color solo no hace: da POSICION y FORMA al
   estado. Quien no distingue bien el rojo del ambar sigue viendo que hay una
   marca, y el texto de la etiqueta la nombra.
   ========================================================================== */

const FRANJA: Record<SeveridadAlerta, string> = {
    critica: "bg-[var(--critico)]",
    aviso: "bg-[var(--aviso)]",
    info: "bg-[var(--accent)]",
};

const CAJA_ICONO: Record<SeveridadAlerta, string> = {
    critica: "bg-[var(--critico-bg)] text-[var(--critico)]",
    aviso: "bg-[var(--aviso-bg)] text-[var(--aviso)]",
    info: "bg-[rgb(255_106_26_/_0.1)] text-[var(--accent)]",
};

const TONO_INSIGNIA: Record<SeveridadAlerta, "critico" | "aviso" | "neutro"> = {
    critica: "critico",
    aviso: "aviso",
    info: "neutro",
};

type ZonaAlertasProps = {
    readonly alertas: readonly Alerta[];
};

export function ZonaAlertas({ alertas }: ZonaAlertasProps) {
    return (
        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--border-subtle)]">
            {alertas.map((alerta) => (
                <article
                    key={alerta.id}
                    className="flex items-center gap-3 bg-[var(--surface)] py-3 pr-4"
                >
                    <div className={`w-[3px] self-stretch ${FRANJA[alerta.severidad]}`} />

                    <div
                        className={`ml-3 hidden size-8 shrink-0 place-items-center rounded-lg sm:grid ${
                            CAJA_ICONO[alerta.severidad]
                        }`}
                    >
                        <Icon name={alerta.icono} className="size-4" />
                    </div>

                    <div className="min-w-0 flex-1 pl-3 sm:pl-0">
                        <div className="flex flex-wrap items-center gap-2">
                            <span className="text-[13.5px] font-semibold">
                                {alerta.titulo}
                            </span>
                            {alerta.insignia ? (
                                <Etiqueta tono={TONO_INSIGNIA[alerta.severidad]}>
                                    {alerta.insignia}
                                </Etiqueta>
                            ) : null}
                        </div>

                        <p className="mt-0.5 text-[12.5px] text-[var(--foreground-muted)]">
                            {alerta.detalle}
                        </p>
                    </div>

                    {alerta.monto ? (
                        <span className="tabular shrink-0 pl-3 font-display text-[15px] font-semibold">
                            {formatearCLP(alerta.monto)}
                        </span>
                    ) : null}

                    {alerta.accion ? (
                        <Link
                            href={alerta.accion.href}
                            className="shrink-0 pl-3 text-[12.5px] font-semibold text-[var(--accent)] hover:underline"
                        >
                            {alerta.accion.texto} →
                        </Link>
                    ) : null}
                </article>
            ))}
        </div>
    );
}
