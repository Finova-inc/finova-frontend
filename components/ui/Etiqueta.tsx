import type { ReactNode } from "react";

/* ============================================================================
   Etiqueta — pastilla de estado.

   ---------------------------------------------------------------------------
   EL COLOR NO ES EL UNICO PORTADOR
   ---------------------------------------------------------------------------
   Una pastilla que solo se distingue por el tono deja fuera a quien no separa
   bien rojo de verde, que es cerca del 8% de los hombres. Por eso la etiqueta
   SIEMPRE lleva texto que nombra el estado ("Vencido", "Al dia"), y el color
   acompana en vez de informar por su cuenta.

   La variante `demo` existe para un caso concreto de este producto: marcar los
   bloques del panel que todavia muestran datos de ejemplo porque el backend no
   tiene de donde sacarlos. Lleva borde punteado —otra senal no cromatica— para
   que se lea como "provisional" de un vistazo.
   ========================================================================== */

type TonoEtiqueta = "critico" | "aviso" | "positivo" | "neutro" | "demo";

const TONOS: Record<TonoEtiqueta, string> = {
    critico: "bg-[var(--critico-bg)] text-[var(--critico)]",
    aviso: "bg-[var(--aviso-bg)] text-[var(--aviso)]",
    positivo: "bg-[var(--positivo-bg)] text-[var(--positivo)]",
    neutro: "bg-[var(--background-raised)] text-[var(--foreground-muted)]",
    demo: "bg-[var(--background-raised)] text-[var(--foreground-muted)] border border-dashed border-[var(--border-strong)]",
};

type EtiquetaProps = {
    readonly children: ReactNode;
    readonly tono?: TonoEtiqueta;
    readonly className?: string;
};

export function Etiqueta({ children, tono = "neutro", className = "" }: EtiquetaProps) {
    return (
        <span
            className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-[0.07em] ${TONOS[tono]} ${className}`}
        >
            {children}
        </span>
    );
}
