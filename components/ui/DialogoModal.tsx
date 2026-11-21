"use client";

import { useEffect, useRef, type ReactNode, type RefObject } from "react";

/**
 * Cierre con salida animada de un <dialog> nativo, sin librerias: marca el
 * dialogo como "saliendo" (el CSS de globals.css lo funde y le quita el
 * fondo), espera lo que dura esa transicion y recien entonces lo cierra con
 * close(); su evento "close" avisa a quien lo monto, que lo desmonta. Asi el
 * dialogo sigue en pantalla mientras sale.
 *
 * Sin duracion (reducir movimiento) cierra de inmediato. Lo usan quienes
 * cierran el dialogo por Escape o por un clic en el fondo; un boton que
 * desmonta el dialogo por su cuenta lo quita sin salida.
 */
export function useSalidaDeDialogo(dialogo: RefObject<HTMLDialogElement | null>): () => void {
    return () => {
        const elemento = dialogo.current;
        if (!elemento || !elemento.open || elemento.hasAttribute("data-saliendo")) return;
        const ms = Number.parseFloat(getComputedStyle(elemento).transitionDuration.split(",")[0]) * 1000;
        if (!(ms > 20)) {
            elemento.close();
            return;
        }
        elemento.setAttribute("data-saliendo", "true");
        window.setTimeout(() => elemento.close(), ms);
    };
}

/**
 * Ventana modal sobre un <dialog> nativo abierto con showModal(), como el popup
 * de empresas y el de eliminar una cuenta. El navegador se encarga de lo que
 * importa: el foco entra al abrir y queda atrapado dentro, el resto de la página
 * queda inerte y Escape cierra.
 *
 * Quien lo usa lo monta cuando hay que mostrarlo y lo desmonta al cerrar (igual
 * que DialogoEliminarCuenta). Al desmontarse, el foco vuelve a lo que lo tenía al
 * abrir, normalmente el botón que lo abrió.
 *
 * El contenido pone su propio marco (borde, fondo, relleno): el <dialog> es
 * transparente y sin relleno, así que un clic en el fondo oscuro llega al
 * <dialog> y uno en el contenido, no.
 */
export function DialogoModal({
    children,
    idTitulo,
    alCerrar,
    bloqueado = false,
    className = "",
}: {
    readonly children: ReactNode;
    /** id del título (h2) del contenido: lo anuncia el lector de pantalla al abrir. */
    readonly idTitulo: string;
    /** Se llama al cerrarlo con Escape o con un clic en el fondo. */
    readonly alCerrar: () => void;
    /** Mientras algo se guarda, ni Escape ni el fondo lo cierran. */
    readonly bloqueado?: boolean;
    /** Ancho: lo decide quien lo usa. */
    readonly className?: string;
}) {
    const dialogo = useRef<HTMLDialogElement>(null);
    const pulsoFuera = useRef(false);
    // Quién tenía el foco al abrir. Se guarda una sola vez: con StrictMode el efecto corre dos veces.
    const disparador = useRef<HTMLElement | null>(null);
    const salir = useSalidaDeDialogo(dialogo);

    useEffect(() => {
        disparador.current ??= document.activeElement as HTMLElement | null;
        dialogo.current?.showModal();
        return () => {
            const volverA = disparador.current;
            if (volverA?.isConnected) volverA.focus();
        };
    }, []);

    return (
        <dialog
            ref={dialogo}
            aria-labelledby={idTitulo}
            onClose={alCerrar}
            onCancel={(evento) => {
                // Escape: el cierre pasa por salir() para que el dialogo salga con fundido.
                evento.preventDefault();
                if (!bloqueado) salir();
            }}
            onPointerDown={(evento) => {
                pulsoFuera.current = evento.target === evento.currentTarget;
            }}
            onClick={(evento) => {
                if (pulsoFuera.current && evento.target === evento.currentTarget && !bloqueado) salir();
            }}
            className={`m-auto overflow-visible whitespace-normal border-0 bg-transparent p-0 text-left text-[var(--foreground)] backdrop:bg-black/40 ${className}`}
        >
            {children}
        </dialog>
    );
}
