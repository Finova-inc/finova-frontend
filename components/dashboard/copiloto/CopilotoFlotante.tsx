"use client";

import { useEffect, useRef, useState, type KeyboardEvent as TeclaReact } from "react";
import { Icon } from "@/components/ui/Icon";
import { indiceDeFoco } from "@/lib/copiloto";
import { ChatCopiloto } from "./ChatCopiloto";
import { EVENTO_ABRIR_COPILOTO, type DetalleAbrirCopiloto, type ModoCopiloto } from "./eventos";

/* ============================================================================
   Copiloto IA como chat flotante, en dos tamaños con la misma conversacion.

   - Compacto: lo abre el boton redondo. Panel chico abajo a la derecha, no
     modal (se puede seguir usando la pantalla de atras), z-30: por encima del
     contenido y por debajo del menu lateral del celular (z-40).
   - Ampliado: lo abre "Copiloto IA" del menu lateral. Dialogo modal centrado
     (z-50) sobre un velo; el foco queda dentro y un clic en el velo cierra.
   - En el celular los dos ocupan toda la pantalla.

   Vive en app/dashboard/layout.tsx, que no se remonta al navegar: la
   conversacion sigue ahi al cambiar de pantalla. El layout le pasa la empresa
   activa como key, asi que al cambiar de empresa empieza de cero.

   El chat se monta recien la primera vez que se abre: asi lee la conversacion
   guardada en el navegador sin diferencias con el HTML del servidor.
   ========================================================================== */

const ENFOCABLES = 'button:not([disabled]), textarea:not([disabled]), input:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

const CLASES_COMPACTO =
    "z-30 bg-[var(--surface)] sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[var(--border-subtle)] sm:shadow-[0_16px_48px_rgb(0_0_0/0.22)]";
const CLASES_AMPLIADO =
    "copiloto-vidrio z-50 sm:inset-auto sm:left-1/2 sm:top-1/2 sm:h-[min(860px,86dvh)] sm:w-[min(960px,calc(100vw-3rem))] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[var(--border-subtle)] sm:shadow-[0_24px_64px_rgb(0_0_0/0.3)]";

type CopilotoFlotanteProps = {
    /** Para guardar la conversacion en el navegador; null si el token no se pudo leer. */
    readonly idUsuario: string | null;
    readonly idEmpresa: string | null;
};

export function CopilotoFlotante({ idUsuario, idEmpresa }: CopilotoFlotanteProps) {
    const [abierto, setAbierto] = useState(false);
    const [montado, setMontado] = useState(false);
    const [modo, setModo] = useState<ModoCopiloto>("compacto");
    const [respuestaSinVer, setRespuestaSinVer] = useState(false);
    const boton = useRef<HTMLButtonElement>(null);
    const panel = useRef<HTMLElement>(null);
    /** A quien devolverle el foco al cerrar: el boton redondo o la entrada del menu. */
    const quienAbrio = useRef<HTMLElement | null>(null);
    const abiertoActual = useRef(abierto);

    const ampliado = abierto && modo === "ampliado";

    useEffect(() => {
        abiertoActual.current = abierto;
    }, [abierto]);

    // La entrada "Copiloto IA" del menu lateral (y cualquier otro que llame a abrirCopiloto).
    useEffect(() => {
        const abrirDesdeFuera = (evento: Event) => {
            const pedido = (evento as CustomEvent<DetalleAbrirCopiloto | undefined>).detail?.modo;
            quienAbrio.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
            setModo(pedido === "ampliado" ? "ampliado" : "compacto");
            setMontado(true);
            setAbierto(true);
            setRespuestaSinVer(false);
        };
        window.addEventListener(EVENTO_ABRIR_COPILOTO, abrirDesdeFuera);
        return () => window.removeEventListener(EVENTO_ABRIR_COPILOTO, abrirDesdeFuera);
    }, []);

    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            setAbierto(false);
            (quienAbrio.current ?? boton.current)?.focus();
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [abierto]);

    function alternar() {
        if (!abierto) {
            quienAbrio.current = boton.current;
            setModo("compacto");
            setMontado(true);
            setRespuestaSinVer(false);
        }
        setAbierto(!abierto);
    }

    function cerrar() {
        setAbierto(false);
        (quienAbrio.current ?? boton.current)?.focus();
    }

    // En el dialogo modal, Tab y Shift+Tab dan la vuelta sin salir del panel.
    function atraparFoco(evento: TeclaReact<HTMLElement>) {
        if (!ampliado || evento.key !== "Tab" || !panel.current) return;
        const enfocables = Array.from(panel.current.querySelectorAll<HTMLElement>(ENFOCABLES)).filter(
            (el) => el.offsetParent !== null,
        );
        const actual = enfocables.indexOf(document.activeElement as HTMLElement);
        const destino = indiceDeFoco(actual, enfocables.length, evento.shiftKey);
        if (destino === -1) return;
        evento.preventDefault();
        enfocables[destino].focus();
    }

    return (
        <>
            {ampliado && (
                <div aria-hidden="true" onClick={cerrar} className="copiloto-velo no-imprimir fixed inset-0 z-50 max-sm:hidden" />
            )}

            <section
                ref={panel}
                id="panel-copiloto"
                role="dialog"
                aria-modal={ampliado}
                aria-label="Copiloto IA"
                onKeyDown={atraparFoco}
                className={`no-imprimir fixed inset-0 flex-col ${modo === "ampliado" ? CLASES_AMPLIADO : CLASES_COMPACTO} ${
                    abierto ? "flex" : "hidden"
                }`}
            >
                {montado && (
                    <ChatCopiloto
                        abierto={abierto}
                        modo={modo}
                        alCambiarModo={() => setModo(modo === "ampliado" ? "compacto" : "ampliado")}
                        alCerrar={cerrar}
                        alResponder={() => {
                            if (!abiertoActual.current) setRespuestaSinVer(true);
                        }}
                        idUsuario={idUsuario}
                        idEmpresa={idEmpresa}
                    />
                )}
            </section>

            <button
                ref={boton}
                type="button"
                onClick={alternar}
                aria-label={abierto ? "Cerrar el copiloto" : "Abrir el copiloto IA"}
                aria-expanded={abierto}
                aria-controls="panel-copiloto"
                title={abierto ? "Cerrar el copiloto" : "Copiloto IA"}
                className={`no-imprimir fixed bottom-5 right-5 z-30 size-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_rgb(0_0_0/0.25)] transition-[scale] hover:scale-105 motion-reduce:transition-none sm:bottom-6 sm:right-6 ${
                    ampliado ? "hidden" : abierto ? "grid max-sm:hidden" : "grid"
                }`}
            >
                <Icon name={abierto ? "close" : "sparkle"} className="size-6" />
                {respuestaSinVer && (
                    <span className="absolute right-0.5 top-0.5 size-3.5 rounded-full border-2 border-[var(--surface)] bg-[var(--critico)]">
                        <span className="sr-only">Hay una respuesta nueva</span>
                    </span>
                )}
            </button>
        </>
    );
}
