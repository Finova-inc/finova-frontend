"use client";

import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { ChatCopiloto } from "./ChatCopiloto";
import { EVENTO_ABRIR_COPILOTO } from "./eventos";

/* ============================================================================
   Copiloto IA como chat flotante: un boton circular en la esquina inferior
   derecha de todo el panel que despliega la conversacion encima de la
   pantalla actual.

   - Vive en app/dashboard/layout.tsx, que no se remonta al navegar: la
     conversacion sigue ahi al cambiar de pantalla. El layout le pasa la
     empresa activa como key, asi que al cambiar de empresa empieza de cero.
   - El panel no es modal: se puede seguir usando la pantalla de atras. En el
     celular ocupa toda la pantalla y el boton se esconde mientras esta abierto
     (la X de la cabecera lo cierra).
   - z-30: por encima del contenido, por debajo del menu lateral del celular
     (z-40) y de los dialogos (z-50).
   ========================================================================== */

export function CopilotoFlotante() {
    const [abierto, setAbierto] = useState(false);
    const [respuestaSinVer, setRespuestaSinVer] = useState(false);
    const boton = useRef<HTMLButtonElement>(null);
    const abiertoActual = useRef(abierto);

    useEffect(() => {
        abiertoActual.current = abierto;
    }, [abierto]);

    // La entrada "Copiloto IA" del menu lateral.
    useEffect(() => {
        const abrirDesdeMenu = () => {
            setAbierto(true);
            setRespuestaSinVer(false);
        };
        window.addEventListener(EVENTO_ABRIR_COPILOTO, abrirDesdeMenu);
        return () => window.removeEventListener(EVENTO_ABRIR_COPILOTO, abrirDesdeMenu);
    }, []);

    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            setAbierto(false);
            boton.current?.focus();
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [abierto]);

    function alternar() {
        if (!abierto) setRespuestaSinVer(false);
        setAbierto(!abierto);
    }

    function cerrar() {
        setAbierto(false);
        boton.current?.focus();
    }

    return (
        <>
            <section
                id="panel-copiloto"
                role="dialog"
                aria-modal="false"
                aria-label="Copiloto IA"
                className={`no-imprimir fixed inset-0 z-30 flex-col bg-[var(--surface)] sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[var(--border-subtle)] sm:shadow-[0_16px_48px_rgb(0_0_0/0.22)] ${
                    abierto ? "flex" : "hidden"
                }`}
            >
                <ChatCopiloto
                    abierto={abierto}
                    alCerrar={cerrar}
                    alResponder={() => {
                        if (!abiertoActual.current) setRespuestaSinVer(true);
                    }}
                />
            </section>

            <button
                ref={boton}
                type="button"
                onClick={alternar}
                aria-label={abierto ? "Cerrar el copiloto" : "Abrir el copiloto IA"}
                aria-expanded={abierto}
                aria-controls="panel-copiloto"
                title={abierto ? "Cerrar el copiloto" : "Copiloto IA"}
                className={`no-imprimir fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[var(--accent)] text-white shadow-[0_8px_24px_rgb(0_0_0/0.25)] transition-[scale] hover:scale-105 motion-reduce:transition-none sm:bottom-6 sm:right-6 ${
                    abierto ? "max-sm:hidden" : ""
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
