/* ============================================================================
   Barra — indicador de progreso.

   Se usa para el avance de conciliacion del mes. No es un <progress> nativo
   porque ese elemento es notoriamente resistente a darle estilo entre
   navegadores: hacen falta tres pseudoelementos distintos con prefijo y aun asi
   el radio del relleno no se respeta en todos.

   La accesibilidad se cubre con los atributos ARIA equivalentes, que es lo que
   el propio <progress> expone al lector de pantalla.
   ========================================================================== */

type BarraProps = {
    /** Porcentaje 0-100. Se acota por si llega un valor calculado fuera de rango. */
    readonly porcentaje: number;
    /** Descripcion para lectores de pantalla, p. ej. "Avance de conciliacion". */
    readonly etiqueta: string;
    readonly className?: string;
};

export function Barra({ porcentaje, etiqueta, className = "" }: BarraProps) {
    // Un valor fuera de rango desbordaria la barra o la dejaria en negativo.
    const acotado = Math.max(0, Math.min(100, porcentaje));

    return (
        <div
            role="progressbar"
            aria-valuenow={acotado}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={etiqueta}
            className={`h-2 overflow-hidden rounded-full bg-[var(--background-raised)] ${className}`}
        >
            <div
                className="h-full rounded-full bg-[var(--accent)]"
                style={{ width: `${acotado}%` }}
            />
        </div>
    );
}
