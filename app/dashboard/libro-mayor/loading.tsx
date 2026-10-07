/** Mientras carga el libro mayor: Render duerme y la primera consulta puede tardar. */
export default function CargandoLibroMayor() {
    return (
        <div role="status" aria-live="polite" className="flex flex-col gap-4">
            <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--background-raised)]" />
            <div className="h-64 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]" />
            <span className="sr-only">Cargando el libro mayor…</span>
        </div>
    );
}
