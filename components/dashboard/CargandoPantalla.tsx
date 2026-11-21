import { EsperaConLimite } from "@/components/dashboard/EsperaConLimite";

/**
 * Esqueleto de las pantallas del panel mientras el servidor responde.
 *
 * Cada pantalla lo usa desde su propio loading.tsx (ver el comentario de
 * EsperaConLimite: tras unos segundos explica que el servicio está despertando).
 * No hay uno en app/dashboard/: un loading.tsx envía el 200 antes de que la
 * página decida, y con eso notFound() y redirect() dejan de dar 404 y 307. Por
 * eso no lo llevan auditoría, interno/ia ni las pantallas de detalle (:id).
 */
export function CargandoPantalla() {
    return (
        <EsperaConLimite textoLector="Cargando la pantalla…">
            <div className="h-7 w-48 esqueleto rounded-md bg-[var(--background-raised)]" />
            <div className="h-4 w-full max-w-xl esqueleto rounded bg-[var(--background-raised)]" />
            <div className="h-64 esqueleto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]" />
        </EsperaConLimite>
    );
}
