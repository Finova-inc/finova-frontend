import type { ReactNode } from "react";

/* ============================================================================
   Panel — contenedor de superficie elevada.

   ---------------------------------------------------------------------------
   POR QUE NO TODO ES UN PANEL
   ---------------------------------------------------------------------------
   Borde, relleno, radio y sombra dicen cada uno "esto es un objeto aparte".
   Gastarlos en todos los bloques por igual aplana la jerarquia: si todo flota,
   nada destaca.

   Por eso el panel se usa para agrupar contenido que se lee como una unidad
   —un grafico con su resumen, una tabla con su cabecera— y NO para envolver
   cada fila de una lista. Las alertas del panel de control, por ejemplo, no son
   paneles: son filas con una franja de severidad dentro de un solo contenedor.
   ========================================================================== */

type PanelProps = {
    readonly children: ReactNode;
    /** Quita el relleno interno, para paneles que traen su propia cabecera y cuerpo. */
    readonly sinRelleno?: boolean;
    readonly className?: string;
};

export function Panel({ children, sinRelleno = false, className = "" }: PanelProps) {
    return (
        <div
            className={`rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_1px_2px_rgb(20_17_15_/_0.04)] ${
                sinRelleno ? "" : "p-5"
            } ${className}`}
        >
            {children}
        </div>
    );
}

type PanelCabeceraProps = {
    readonly titulo: string;
    /** Texto secundario a la derecha: rango temporal, unidad, origen del dato. */
    readonly nota?: ReactNode;
    readonly className?: string;
};

/**
 * Cabecera de panel: titulo a la izquierda, nota a la derecha.
 *
 * Se alinean por la linea base y no por el centro, para que el titulo de 14px y
 * la nota de 11.5px se apoyen sobre el mismo renglon.
 */
export function PanelCabecera({ titulo, nota, className = "" }: PanelCabeceraProps) {
    return (
        <div className={`flex items-baseline justify-between gap-3 ${className}`}>
            <h3 className="font-display text-sm font-semibold">{titulo}</h3>
            {nota ? (
                <span className="text-[11.5px] text-[var(--foreground-muted)]">{nota}</span>
            ) : null}
        </div>
    );
}
