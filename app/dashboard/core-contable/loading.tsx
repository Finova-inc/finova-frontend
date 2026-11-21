import { EsperaConLimite } from "@/components/dashboard/EsperaConLimite";

/**
 * Mientras carga el libro diario.
 *
 * Render duerme tras unos minutos sin trafico y la primera consulta puede
 * tardar varios segundos: sin esto la pantalla quedaria en blanco sin
 * explicacion. Pasado el limite de espera se avisa que el servicio esta
 * despertando y se ofrece reintentar.
 */
export default function CargandoLibroDiario() {
    return (
        <EsperaConLimite textoLector="Cargando el libro diario…">
            <div className="h-7 w-48 esqueleto rounded-md bg-[var(--background-raised)]" />
            <div className="h-4 w-full max-w-xl esqueleto rounded bg-[var(--background-raised)]" />
            <div className="h-64 esqueleto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]" />
        </EsperaConLimite>
    );
}
