import type { ButtonHTMLAttributes, ReactNode } from "react";

/* ============================================================================
   Boton — primitivo de accion.

   Hasta ahora cada boton del proyecto se escribia con clases sueltas en el
   sitio de uso. A dos o tres botones eso es razonable; a partir del panel de
   control dejan de ser tres, y la unica forma de que el relleno y el radio
   coincidan entre pantallas es que salgan del mismo lugar.

   No usa `clsx` ni `cn`: el proyecto no tiene esa dependencia y la composicion
   con plantillas de texto es el patron que ya sigue SectionShell.
   ========================================================================== */

type Variante = "acento" | "neutro" | "fantasma";

const VARIANTES: Record<Variante, string> = {
    /* Accion principal. El naranjo es el color de accion de la marca; se usa
       una sola vez por grupo, si no deja de significar "esto primero". */
    acento:
        "bg-[var(--accent)] border-[var(--accent)] text-white font-semibold hover:brightness-110",
    /* Accion secundaria: mismo peso visual que el fondo, contorno definido. */
    neutro:
        "bg-[var(--surface)] border-[var(--border-strong)] text-[var(--foreground)] hover:bg-[var(--background-raised)]",
    /* Sin contorno: para barras de iconos donde el marco seria ruido. */
    fantasma:
        "bg-transparent border-transparent text-[var(--foreground-muted)] hover:bg-[var(--background-raised)] hover:text-[var(--foreground)]",
};

type BotonProps = {
    readonly children: ReactNode;
    readonly variante?: Variante;
    /** Boton cuadrado para un icono solo. Exige `aria-label` en quien lo usa. */
    readonly soloIcono?: boolean;
} & ButtonHTMLAttributes<HTMLButtonElement>;

export function Boton({
    children,
    variante = "neutro",
    soloIcono = false,
    className = "",
    type = "button",
    ...props
}: BotonProps) {
    return (
        <button
            /* El type explicito no es cosmetico: sin el, un boton dentro de un
               <form> es submit por defecto y envia el formulario al pulsarlo. */
            type={type}
            className={`inline-flex items-center justify-center gap-2 rounded-lg border text-[13px] font-medium transition-[background-color,filter] disabled:cursor-not-allowed disabled:opacity-60 ${
                soloIcono ? "size-9" : "px-3.5 py-2"
            } ${VARIANTES[variante]} ${className}`}
            {...props}
        >
            {children}
        </button>
    );
}
