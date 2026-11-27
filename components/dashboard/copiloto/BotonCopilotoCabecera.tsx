"use client";

import { useSyncExternalStore } from "react";
import { Icon } from "@/components/ui/Icon";
import { EVENTO_COPILOTO_CABECERA, ID_BOTON_CABECERA, indicadorCopiloto } from "./buzon";

/* ============================================================================
   Acceso al copiloto en la cabecera del panel, junto al cambio de tema. Es el
   unico acceso (ademas de Ctrl+J): abre su columna al costado, o la cierra si
   ya esta abierta. Quien escucha es CopilotoFlotante, por un evento del
   navegador; de vuelta, CopilotoFlotante publica en indicadorCopiloto si esta
   abierto, los avisos sin ver y si hay una respuesta nueva, que el boton
   muestra como numero o punto.

   Un halo muy tenue con los colores del copiloto respira detras para que se
   note que es la IA; con "reducir movimiento" queda quieto.
   ========================================================================== */

const sinIndicador = () => null;

export function BotonCopilotoCabecera() {
    const indicador = useSyncExternalStore(indicadorCopiloto.suscribir, indicadorCopiloto.mirar, sinIndicador);

    const abierto = indicador?.abierto ?? false;
    const avisos = indicador?.avisos ?? 0;
    const etiqueta = abierto
        ? "Cerrar el copiloto"
        : avisos > 0
          ? `Abrir el copiloto IA (${avisos} ${avisos === 1 ? "aviso" : "avisos"})`
          : "Abrir el copiloto IA";

    return (
        <button
            id={ID_BOTON_CABECERA}
            type="button"
            onClick={() => window.dispatchEvent(new Event(EVENTO_COPILOTO_CABECERA))}
            aria-controls="panel-copiloto"
            aria-expanded={abierto}
            aria-label={etiqueta}
            aria-keyshortcuts="Control+J Meta+J"
            title={abierto ? "Cerrar el copiloto (Ctrl+J)" : "Copiloto IA (Ctrl+J)"}
            className="copiloto-tema group relative grid size-9 shrink-0 place-items-center rounded-lg"
        >
            <span
                aria-hidden="true"
                className="absolute inset-0 animate-brillo rounded-lg bg-[image:var(--copiloto-franja)] blur-[8px]"
            />
            <span className="relative grid size-full place-items-center rounded-lg border border-[var(--accent)]/35 bg-[var(--surface)] text-[var(--accent)] transition-colors group-hover:bg-[var(--background-raised)]">
                <Icon name="sparkle" className="size-[18px]" />
            </span>
            {indicador?.respuestaNueva ? (
                <span className="absolute -right-1 -top-1 size-3 rounded-full border-2 border-[var(--surface)] bg-[var(--critico)]">
                    <span className="sr-only">Hay una respuesta nueva</span>
                </span>
            ) : avisos > 0 ? (
                <span
                    aria-hidden="true"
                    className="tabular absolute -right-1.5 -top-1.5 grid h-4 min-w-4 place-items-center rounded-full bg-[var(--critico)] px-1 text-[10px] font-semibold leading-none text-white"
                >
                    {avisos}
                </span>
            ) : null}
        </button>
    );
}
