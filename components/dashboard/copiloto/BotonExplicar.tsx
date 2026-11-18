"use client";

import { Icon } from "@/components/ui/Icon";
import { preguntasPendientes } from "./buzon";

/**
 * Le pregunta al copiloto sobre un dato de la pantalla: abre el chat y envia
 * `pregunta`, ya armada, para que nadie tenga que saber que escribir.
 */
export function BotonExplicar({ pregunta, etiqueta }: { readonly pregunta: string; readonly etiqueta?: string }) {
    return (
        <button
            type="button"
            onClick={() => preguntasPendientes.dejar(pregunta)}
            aria-label={`Preguntar al copiloto: ${pregunta}`}
            title="Preguntar al copiloto"
            className="no-imprimir inline-flex items-center gap-1 rounded-md px-1.5 py-0.5 align-middle text-[12px] text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--accent)]"
        >
            <Icon name="sparkle" className="size-3.5" />
            {etiqueta && <span>{etiqueta}</span>}
        </button>
    );
}
