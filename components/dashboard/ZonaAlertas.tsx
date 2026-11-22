import Link from "next/link";

import { VerMas } from "@/components/dashboard/VerMas";
import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon, type IconName } from "@/components/ui/Icon";
import { formatearCLP } from "@/lib/formato";

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

   ---------------------------------------------------------------------------
   ORDEN Y TOPE
   ---------------------------------------------------------------------------
   Van de la mas grave a la menos (a igual gravedad, en el orden en que las
   arma el panel). Se ven las primeras MAXIMO_VISIBLES; el resto queda tras un
   «Ver N más» (un boton con aria-expanded, VerMas: la altura se anima).
   ========================================================================== */

export type SeveridadAlerta = "critica" | "aviso" | "info";

/** Un asunto pendiente que sale de los datos reales de la empresa. */
export type Alerta = {
    readonly id: string;
    readonly severidad: SeveridadAlerta;
    readonly icono: IconName;
    readonly titulo: string;
    readonly detalle: string;
    /** Pastilla corta a la derecha del titulo: fecha limite o categoria. */
    readonly insignia?: string;
    /** Monto destacado, en string como lo entrega la API. */
    readonly monto?: string;
    /** Enlace de resolucion. */
    readonly accion?: { readonly texto: string; readonly href: string };
};

const MAXIMO_VISIBLES = 4;

const GRAVEDAD: Record<SeveridadAlerta, number> = { critica: 0, aviso: 1, info: 2 };

const FRANJA: Record<SeveridadAlerta, string> = {
    critica: "bg-[var(--critico)]",
    aviso: "bg-[var(--aviso)]",
    info: "bg-[var(--accent)]",
};

const CAJA_ICONO: Record<SeveridadAlerta, string> = {
    critica: "bg-[var(--critico-bg)] text-[var(--critico)]",
    aviso: "bg-[var(--aviso-bg)] text-[var(--aviso)]",
    info: "bg-[var(--accent-bg)] text-[var(--accent-text)]",
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
    // Sin pendientes se dice explicitamente: un hueco vacio se lee como "no
    // cargo", no como "esta todo en orden".
    if (alertas.length === 0) {
        return (
            <EstadoVacio icono="check" tono="positivo" titulo="Todo al día." marco>
                No hay meses por cerrar, borradores pendientes ni IVA por declarar.
            </EstadoVacio>
        );
    }

    // sort es estable: a igual gravedad se conserva el orden de llegada.
    const ordenadas = [...alertas].sort((a, b) => GRAVEDAD[a.severidad] - GRAVEDAD[b.severidad]);
    const visibles = ordenadas.slice(0, MAXIMO_VISIBLES);
    const resto = ordenadas.slice(MAXIMO_VISIBLES);

    return (
        <div className="flex flex-col gap-px overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--border-subtle)]">
            {visibles.map((alerta) => (
                <FilaAlerta key={alerta.id} alerta={alerta} />
            ))}

            {resto.length > 0 ? (
                <VerMas cantidad={resto.length}>
                    {resto.map((alerta) => (
                        <FilaAlerta key={alerta.id} alerta={alerta} />
                    ))}
                </VerMas>
            ) : null}
        </div>
    );
}

function FilaAlerta({ alerta }: { readonly alerta: Alerta }) {
    return (
        // En pantalla angosta el monto y el enlace bajan de línea en vez de pisar el título; la franja es absoluta para cubrir todas las líneas.
        <article className="relative flex flex-wrap items-center gap-x-3 gap-y-1 bg-[var(--surface)] py-2 pl-[15px] pr-4 sm:flex-nowrap">
            <div className={`absolute inset-y-0 left-0 w-[3px] ${FRANJA[alerta.severidad]}`} />

            <div
                className={`ml-3 hidden size-7 shrink-0 place-items-center rounded-md sm:grid ${CAJA_ICONO[alerta.severidad]}`}
            >
                <Icon name={alerta.icono} className="size-3.5" />
            </div>

            <div className="min-w-0 basis-40 flex-1 pl-3 sm:pl-0">
                <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                    <span className="text-sm font-semibold leading-snug">{alerta.titulo}</span>
                    {alerta.insignia ? (
                        <Etiqueta tono={TONO_INSIGNIA[alerta.severidad]}>{alerta.insignia}</Etiqueta>
                    ) : null}
                </div>

                <p className="line-clamp-2 text-xs leading-snug text-[var(--foreground-muted)]">{alerta.detalle}</p>
            </div>

            {alerta.monto ? (
                <span className="tabular shrink-0 pl-2 font-display text-[15px] font-semibold">
                    {formatearCLP(alerta.monto)}
                </span>
            ) : null}

            {alerta.accion ? (
                <Link
                    href={alerta.accion.href}
                    className="shrink-0 pl-2 text-sm font-semibold text-[var(--accent-text)] hover:underline"
                >
                    {alerta.accion.texto} →
                </Link>
            ) : null}
        </article>
    );
}
