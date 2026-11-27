"use client";

import { usePathname } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { COOKIE_ANCHO_COPILOTO, guardarPreferencia } from "@/components/dashboard/preferencias-panel";
import { ANCHO_MIN, MIN_CONTENIDO, PASO_TECLADO, limitarAncho } from "@/lib/ancho-copiloto";
import { contarAvisos, type AvisosCopiloto } from "@/lib/copiloto";
import { hoyEnChile } from "@/lib/formato";
import {
    EVENTO_COPILOTO_CABECERA,
    ID_BOTON_CABECERA,
    indicadorCopiloto,
    preguntasPendientes,
    seleccionesPendientes,
} from "./buzon";
import { conversaciones } from "@/lib/copiloto-conversacion";
import { ChatCopiloto } from "./ChatCopiloto";

/* ============================================================================
   Copiloto IA: columna al costado de la pantalla abierta. Se abre con el boton
   de la cabecera del panel (BotonCopilotoCabecera) o con Ctrl+J. (El nombre
   del archivo es de cuando tambien flotaba.)

   - Vive en app/dashboard/layout.tsx, que no se remonta al navegar. El layout
     le pasa la empresa activa como key, asi que al cambiar de empresa empieza
     de cero.
   - El panel no es modal: se puede seguir usando la pantalla de al lado.
   - Ctrl+J (Cmd+J en Mac) lo abre y lo cierra desde cualquier pantalla.
   - Al montarse pide los avisos de la empresa (F29 por vencer, documentos por
     contabilizar, borradores, mes sin abrir; sin gastar tokens) y el boton
     de la cabecera (via indicadorCopiloto) muestra cuantos hay hasta que se abre el chat, que los sugiere como preguntas.
   - Un "Explicar esto" de otra pantalla (buzon.ts) lo abre; el chat envia
     la pregunta.
   - El chat se monta recien la primera vez que se abre: asi lee la
     conversacion guardada sin diferencias con el HTML del servidor.
   - Desde 1024 px es una columna a la derecha, bajo la cabecera del panel, que
     llena el espacio que deja el contenido (380 px como minimo). Sin cabecera
     propia ni linea de color, para no cortar la del panel: sus opciones van en
     un menu del tablero (MenuCopiloto). Bajo 1024 px no cabe una columna: es
     una ventana sobre la pantalla, a pantalla completa en el celular.
   - "Agrandar" (en el menu) le da todo el espacio de la pantalla abierta y
     "Reducir" lo devuelve al costado. La pantalla solo se oculta (layout.tsx,
     por data-agrandado): no pierde lo escrito. Navegar o cerrar lo reduce.
   - z-30: por encima del contenido, por debajo del menu lateral del celular
     (z-40) y de los dialogos (z-50).
   - El borde izquierdo es un divisor: arrastrarlo (o las flechas con el foco
     en el) fija el ancho del chat, guardado en una cookie; doble clic vuelve a
     llenar el espacio libre. Limites en lib/ancho-copiloto.ts.
   ========================================================================== */

type CopilotoFlotanteProps = {
    /** Para guardar la conversacion en el navegador; null si el token no se pudo leer. */
    readonly idUsuario: string | null;
    readonly idEmpresa: string | null;
    /** De la cookie: ancho en px elegido con el divisor, o null para llenar el espacio libre. */
    readonly anchoInicial?: number | null;
};

export function CopilotoFlotante({ idUsuario, idEmpresa, anchoInicial = null }: CopilotoFlotanteProps) {
    const ruta = usePathname();
    const [abierto, setAbierto] = useState(false);
    const [agrandado, setAgrandado] = useState(false);
    const [rutaVista, setRutaVista] = useState(ruta);
    const [ancho, setAncho] = useState(anchoInicial);
    const panel = useRef<HTMLElement>(null);
    const [montado, setMontado] = useState(false);
    const [respuestaSinVer, setRespuestaSinVer] = useState(false);
    const [cantidadAvisos, setCantidadAvisos] = useState(0);
    // El chat se monta al abrirlo por primera vez: desde ahi los avisos ya se vieron como sugerencias.
    const avisosSinVer = montado ? 0 : cantidadAvisos;
    const abiertoActual = useRef(abierto);

    // Al navegar o cerrar vuelve al costado: agrandado taparia la pantalla recien elegida.
    // Se ajusta durante el render, sin un efecto que dibuje un cuadro de mas.
    if (rutaVista !== ruta) {
        setRutaVista(ruta);
        setAgrandado(false);
    } else if (agrandado && !abierto) {
        setAgrandado(false);
    }

    useEffect(() => {
        abiertoActual.current = abierto;
    }, [abierto]);

    // El boton de la cabecera muestra si esta abierto, los avisos y la respuesta nueva.
    useEffect(() => {
        indicadorCopiloto.dejar({ abierto, avisos: avisosSinVer, respuestaNueva: respuestaSinVer });
    }, [abierto, avisosSinVer, respuestaSinVer]);

    // Una vez por empresa (el layout no se remonta al navegar). Si falla, el boton queda sin numero.
    useEffect(() => {
        const corte = new AbortController();
        fetch("/api/copiloto/estado", { signal: corte.signal })
            .then((r) => (r.ok ? (r.json() as Promise<{ avisos?: AvisosCopiloto | null }>) : null))
            .then((datos) => {
                if (datos && !abiertoActual.current) setCantidadAvisos(contarAvisos(datos.avisos, hoyEnChile()));
            })
            .catch(() => {});
        return () => corte.abort();
    }, []);

    // El layout solo lo desmonta al salir del panel o al cambiar de empresa (su key): se corta
    // la respuesta en curso. Navegar entre modulos no pasa por aqui.
    useEffect(() => () => conversaciones.cortarTodas(), []);

    function cerrar() {
        setAbierto(false);
        document.getElementById(ID_BOTON_CABECERA)?.focus();
    }

    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "j") return;
            e.preventDefault();
            setMontado(true);
            setRespuestaSinVer(false);
            setAbierto((actual) => !actual);
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, []);

    // Boton de la cabecera (BotonCopilotoCabecera): abre el panel, o lo cierra si ya esta abierto.
    useEffect(() => {
        const alPedir = () => {
            if (abiertoActual.current) {
                setAbierto(false);
                return;
            }
            setMontado(true);
            setRespuestaSinVer(false);
            setAbierto(true);
        };
        window.addEventListener(EVENTO_COPILOTO_CABECERA, alPedir);
        return () => window.removeEventListener(EVENTO_COPILOTO_CABECERA, alPedir);
    }, []);

    // "Explicar esto" y el texto seleccionado en una pantalla abren el chat; el chat los toma.
    useEffect(() => {
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
    }, []);

    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key !== "Escape") return;
            cerrar();
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [abierto]);

    /** Ancho permitido para el panel segun el espacio de la fila (contenido + copiloto). */
    function anchoPara(pedido: number): number {
        const fila = panel.current?.parentElement?.getBoundingClientRect().width ?? pedido + MIN_CONTENIDO;
        return limitarAncho(pedido, fila);
    }

    function fijarAncho(nuevo: number | null) {
        setAncho(nuevo);
        guardarPreferencia(COOKIE_ANCHO_COPILOTO, nuevo === null ? null : String(nuevo));
    }

    function alPresionarDivisor(e: React.PointerEvent<HTMLDivElement>) {
        if (e.button !== 0) return;
        e.preventDefault(); // sin seleccionar texto mientras se arrastra
        e.currentTarget.setPointerCapture(e.pointerId);
    }

    function alMoverDivisor(e: React.PointerEvent<HTMLDivElement>) {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        const derecha = panel.current?.parentElement?.getBoundingClientRect().right ?? 0;
        setAncho(anchoPara(derecha - e.clientX));
    }

    function alSoltarDivisor(e: React.PointerEvent<HTMLDivElement>) {
        if (!e.currentTarget.hasPointerCapture(e.pointerId)) return;
        e.currentTarget.releasePointerCapture(e.pointerId);
        if (ancho !== null) fijarAncho(ancho);
    }

    function alTeclearDivisor(e: React.KeyboardEvent<HTMLDivElement>) {
        // El divisor esta a la izquierda: hacia la izquierda el chat crece.
        const paso = e.key === "ArrowLeft" ? PASO_TECLADO : e.key === "ArrowRight" ? -PASO_TECLADO : 0;
        if (paso === 0) return;
        e.preventDefault();
        const actual = ancho ?? panel.current?.getBoundingClientRect().width ?? ANCHO_MIN;
        fijarAncho(anchoPara(actual + paso));
    }

    // Desde lg: columna fija a la altura de la pantalla, sin sombra ni esquinas.
    // Con ancho elegido: ese ancho (crece solo si sobra espacio), y el min() deja siempre
    // MIN_CONTENIDO (el relleno del contenido): el chat llega hasta el menu de modulos sin
    // desbordar la fila, tambien si la ventana se achica despues. Agrandado, ocupa la fila.
    const usaAncho = !agrandado && ancho !== null;
    const claseColumna = `copiloto-anclado lg:sticky lg:top-[60px] lg:bottom-auto lg:right-auto lg:z-auto lg:h-[calc(100dvh-60px)] lg:w-auto lg:min-w-[380px] lg:rounded-none lg:border-y-0 lg:border-r-0 lg:border-l lg:shadow-none ${
        usaAncho ? "lg:[flex:1_0_min(var(--ancho-copiloto),calc(100%_-_48px))]" : "lg:flex-1"
    }`;
    const estiloAncho = usaAncho ? ({ "--ancho-copiloto": `${ancho}px` } as React.CSSProperties) : undefined;

    return (
        <>
            <section
                ref={panel}
                style={estiloAncho}
                id="panel-copiloto"
                data-agrandado={agrandado ? "" : undefined}
                role="dialog"
                aria-modal="false"
                aria-label="Copiloto IA"
                className={`copiloto-tema no-imprimir fixed inset-0 z-30 flex-col bg-[var(--surface)] text-[var(--foreground)] sm:inset-auto sm:bottom-6 sm:right-6 sm:h-[min(640px,calc(100dvh-8rem))] sm:w-[400px] sm:overflow-hidden sm:rounded-2xl sm:border sm:border-[var(--border-subtle)] sm:shadow-[0_16px_48px_rgb(0_0_0/0.22)] ${claseColumna} ${
                    abierto ? "flex animate-pantalla" : "hidden"
                }`}
            >
                <div aria-hidden="true" className="h-[3px] shrink-0 bg-[image:var(--copiloto-franja)] lg:hidden" />
                {!agrandado && (
                    <div
                        role="separator"
                        aria-orientation="vertical"
                        aria-label="Ancho del copiloto (flechas para cambiarlo, doble clic para llenar el espacio libre)"
                        aria-controls="panel-copiloto"
                        aria-valuemin={ANCHO_MIN}
                        aria-valuenow={ancho ?? undefined}
                        tabIndex={0}
                        title="Arrastra para cambiar el ancho · doble clic para llenar el espacio"
                        onPointerDown={alPresionarDivisor}
                        onPointerMove={alMoverDivisor}
                        onPointerUp={alSoltarDivisor}
                        onPointerCancel={alSoltarDivisor}
                        onDoubleClick={() => fijarAncho(null)}
                        onKeyDown={alTeclearDivisor}
                        className="absolute inset-y-0 left-0 z-10 hidden w-2 cursor-col-resize touch-none outline-none transition-colors hover:bg-[var(--accent)]/40 focus-visible:bg-[var(--accent)]/60 active:bg-[var(--accent)]/60 lg:block"
                    />
                )}
                {montado && (
                    <ChatCopiloto
                        abierto={abierto}
                        alCerrar={cerrar}
                        agrandado={agrandado}
                        alAgrandar={setAgrandado}
                        alResponder={() => {
                            if (!abiertoActual.current) setRespuestaSinVer(true);
                        }}
                        idUsuario={idUsuario}
                        idEmpresa={idEmpresa}
                    />
                )}
            </section>

        </>
    );
}
