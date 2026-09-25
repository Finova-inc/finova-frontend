/**
 * Mientras carga el libro diario.
 *
 * Render duerme tras unos minutos sin trafico y la primera consulta puede
 * tardar varios segundos: sin esto la pantalla quedaria en blanco sin
 * explicacion.
 */
export default function CargandoLibroDiario() {
    return (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
            <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--background-raised)]" />
            <div className="h-4 w-full max-w-xl animate-pulse rounded bg-[var(--background-raised)]" />
            <div className="h-64 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]" />
            <span className="sr-only">Cargando el libro diario…</span>
        </div>
    );
}
