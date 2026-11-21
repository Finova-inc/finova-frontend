"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COOKIE_COPILOTO, COPILOTO_ANCLADO, guardarPreferencia } from "@/components/dashboard/preferencias-panel";
import { Icon } from "@/components/ui/Icon";
import { preguntasPendientes, seleccionesPendientes } from "./buzon";
import { ChatCopiloto, RUTA_MODULO_COPILOTO } from "./ChatCopiloto";

/* ============================================================================
   Copiloto IA como chat flotante: un boton circular en la esquina inferior
   derecha de todo el panel que despliega la conversacion encima de la
   pantalla actual. La version grande es el modulo /dashboard/copiloto.

   - Vive en app/dashboard/layout.tsx, que no se remonta al navegar. El layout
     le pasa la empresa activa como key, asi que al cambiar de empresa empieza
     de cero.
   - El panel no es modal: se puede seguir usando la pantalla de atras. En el
     celular ocupa toda la pantalla y el boton se esconde mientras esta abierto
     (la X de la cabecera lo cierra).
   - Ctrl+J (Cmd+J en Mac) lo abre y lo cierra desde cualquier pantalla.
   - Un "Explicar esto" de otra pantalla (buzon.ts) lo abre; el chat envia
     la pregunta.
   - z-30: por encima del contenido, por debajo del menu lateral del celular
     (z-40) y de los dialogos (z-50).
   - En el modulo no se dibuja: ahi el chat ya ocupa la pantalla. Al salir, el
     chat se monta de nuevo y lee la conversacion guardada en el navegador.
   - El chat se monta recien la primera vez que se abre: asi lee la
     conversacion guardada sin diferencias con el HTML del servidor.
   - Anclado (desde 1024 px): en vez de flotar, es una columna a la derecha,
     bajo la cabecera del panel, que llena todo el espacio que deja el
     contenido (max 1320 px, 380 px como minimo para el chat): asi no queda
     un hueco al plegar el menu. Sin cabecera propia ni linea de color, para
     no cortar la del panel: sus botones quedan en una esquina y uno vuelve
     a flotante. La eleccion se guarda en una cookie (preferencias-panel.ts).
     Bajo 1024 px no cabe una columna y se comporta como flotante.
   ========================================================================== */

type CopilotoFlotanteProps = {
    /** Para guardar la conversacion en el navegador; null si el token no se pudo leer. */
    readonly idUsuario: string | null;
    readonly idEmpresa: string | null;
    /** De la cookie: el layout la lee para dibujarlo en su lugar desde el servidor. */
    readonly ancladoInicial?: boolean;
};

export function CopilotoFlotante({ idUsuario, idEmpresa, ancladoInicial = false }: CopilotoFlotanteProps) {
    const ruta = usePathname();
    const [abierto, setAbierto] = useState(false);
    const [anclado, setAnclado] = useState(ancladoInicial);
    const [montado, setMontado] = useState(false);
    const [respuestaSinVer, setRespuestaSinVer] = useState(false);
    const boton = useRef<HTMLButtonElement>(null);
    const abiertoActual = useRef(abierto);

    useEffect(() => {
        abiertoActual.current = abierto;
    }, [abierto]);

    // En el modulo el chat ya esta en pantalla: ni el atajo ni los pedidos abren el flotante.
    const enModulo = ruta === RUTA_MODULO_COPILOTO;

    useEffect(() => {
        if (enModulo) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "j") return;
            e.preventDefault();
            setMontado(true);
            setRespuestaSinVer(false);
            setAbierto((actual) => !actual);
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [enModulo]);

    // "Explicar esto" y el texto seleccionado en una pantalla abren el chat; el chat los toma.
    useEffect(() => {
        if (enModulo) return;
        const abrirSiHay = () => {
            if (!preguntasPendientes.mirar() && !seleccionesPendientes.mirar()) return;
            setMontado(true);
            setRespuestaSinVer(false);
            setAbierto(true);
        };
        const dejarPregunta = preguntasPendientes.suscribir(abrirSiHay);
        const dejarSeleccion = seleccionesPendientes.suscribir(abrirSiHay);
        return () => {
            dejarPregunta();
            dejarSeleccion();
        };
    }, [enModulo]);


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

    if (enModulo) return null;

    function alternar() {
        if (!abierto) {
            setMontado(true);
            setRespuestaSinVer(false);
        }
        setAbierto(!abierto);
    }

    function cerrar() {
        setAbierto(false);
        boton.current?.focus();
    }

    function cambiarLado() {
        guardarPreferencia(COOKIE_COPILOTO, anclado ? null : COPILOTO_ANCLADO);
        setAnclado(!anclado);
    }

    // Desde lg, anclado: columna fija a la altura de la pantalla, sin sombra ni esquinas.
    const claseAnclado = anclado
        ? "copiloto-anclado lg:sticky lg:top-[60px] lg:bottom-auto lg:right-auto lg:z-auto lg:h-[calc(100dvh-60px)] lg:w-auto lg:min-w-[380px] lg:flex-1 lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:shadow-none"
        : "";

    return (
        <>
            <section
                id="panel-copiloto"
                role="dialog"
                aria-modal="false"
                aria-label="Copiloto IA"
                className={`copiloto-tema no-imprimir fixed inset-0 z-30 flex-col bg-[var(--surface)] text-[var(--foreground)] sm:inset-auto sm:bottom-24 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[var(--border-subtle)] sm:shadow-[0_16px_48px_rgb(0_0_0/0.22)] ${claseAnclado} ${
                    abierto ? "flex animate-pantalla" : "hidden"
                }`}
            >
                <div
                    aria-hidden="true"
                    className={`h-[3px] shrink-0 bg-[image:var(--copiloto-franja)] ${anclado ? "lg:hidden" : ""}`}
                />
                {montado && (
                    <ChatCopiloto
                        abierto={abierto}
                        alCerrar={cerrar}
                        anclado={anclado}
                        alCambiarLado={cambiarLado}
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
                title={abierto ? "Cerrar el copiloto (Ctrl+J)" : "Copiloto IA (Ctrl+J)"}
                aria-keyshortcuts="Control+J Meta+J"
                className={`no-imprimir fixed bottom-5 right-5 z-30 grid size-14 place-items-center rounded-full bg-[var(--accent)] text-ink shadow-[0_8px_24px_rgb(0_0_0/0.25)] transition-[scale,box-shadow] hover:scale-105 hover:shadow-[0_10px_28px_rgb(0_0_0/0.3)] active:scale-95 motion-reduce:transition-none motion-reduce:hover:scale-100 motion-reduce:active:scale-100 sm:bottom-6 sm:right-6 ${
                    abierto ? `max-sm:hidden ${anclado ? "lg:hidden" : ""}` : ""
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
