import type { ReactNode } from "react";

/**
 * Bloque de "algo salió mal / no existe", compartido por el 404 y el error del
 * panel y de la parte pública. Solo presenta: no decide nada ni usa el cliente,
 * así que sirve en componentes de servidor y de cliente.
 */
export function MensajeDeEstado({
    codigo,
    titulo,
    tono = "neutro",
    children,
    acciones,
}: {
    /** "404", "Error"…: la etiqueta chica de arriba. */
    readonly codigo: string;
    readonly titulo: string;
    /** `critico` se anuncia a lectores de pantalla como alerta; el "no existe" no. */
    readonly tono?: "neutro" | "critico";
    readonly children: ReactNode;
    readonly acciones: ReactNode;
}) {
    return (
        <div
            role={tono === "critico" ? "alert" : undefined}
            className="mx-auto w-full max-w-[560px] rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-[var(--foreground)] sm:p-8"
        >
            <p
                className={`text-[12px] font-semibold uppercase tracking-wide ${
                    tono === "critico" ? "text-[var(--critico)]" : "text-[var(--foreground-muted)]"
                }`}
            >
                {codigo}
            </p>
            <h1 className="mt-2 text-xl font-semibold">{titulo}</h1>
            <div className="mt-2 text-[13.5px] leading-relaxed text-[var(--foreground-muted)]">{children}</div>
            <div className="mt-5 flex flex-wrap gap-2">{acciones}</div>
        </div>
    );
}
