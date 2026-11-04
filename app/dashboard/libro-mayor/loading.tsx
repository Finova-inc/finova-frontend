import { EsperaConLimite } from "@/components/dashboard/EsperaConLimite";

/** Mientras carga el libro mayor: Render duerme y la primera consulta puede tardar. Ver EsperaConLimite. */
export default function CargandoLibroMayor() {
    return (
        <EsperaConLimite textoLector="Cargando el libro mayor…">
            <div className="h-7 w-48 animate-pulse rounded-md bg-[var(--background-raised)]" />
            <div className="h-64 animate-pulse rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]" />
        </EsperaConLimite>
    );
}
