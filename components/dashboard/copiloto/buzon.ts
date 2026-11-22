/* ============================================================================
   Puente entre el copiloto y el resto del panel, solo en el navegador:
   - una pantalla le pide al chat que responda algo (BotonExplicar);
   - el chat le deja al formulario de asiento la propuesta del copiloto.

   Cada pedido espera en su buzon hasta que alguien lo toma: si el chat o el
   formulario no estan montados todavia, lo toman al montarse. Mismo patron que
   contexto-pantalla.ts, que el chat lee con useSyncExternalStore.
   ========================================================================== */

import type { PropuestaAsiento } from "@/lib/copiloto";

function crearBuzon<T>() {
    let valor: T | null = null;
    const oyentes = new Set<() => void>();
    return {
        dejar(nuevo: T): void {
            valor = nuevo;
            for (const oyente of oyentes) oyente();
        },
        /** Lo que espera, sin sacarlo. */
        mirar(): T | null {
            return valor;
        },
        /** Lo saca: solo un componente lo usa. */
        tomar(): T | null {
            const tomado = valor;
            if (tomado !== null) {
                valor = null;
                for (const oyente of oyentes) oyente();
            }
            return tomado;
        },
        suscribir(oyente: () => void): () => void {
            oyentes.add(oyente);
            return () => {
                oyentes.delete(oyente);
            };
        },
    };
}

export const preguntasPendientes = crearBuzon<string>();
/** Texto que la persona selecciono en una pantalla para adjuntarlo a su pregunta (PreguntarSeleccion). */
export const seleccionesPendientes = crearBuzon<string>();
export const propuestasPendientes = crearBuzon<PropuestaAsiento>();

/** El boton de la cabecera abre el copiloto anclado al costado, o lo cierra si ya esta asi. */
export const EVENTO_COPILOTO_CABECERA = "finova:copiloto-cabecera";
/** Al cerrar el panel, el foco vuelve a ese boton. */
export const ID_BOTON_CABECERA = "boton-copiloto";

/** Lo que el boton de la cabecera muestra del panel: si esta abierto, avisos sin ver y respuesta nueva. */
export type IndicadorCopiloto = { readonly abierto: boolean; readonly avisos: number; readonly respuestaNueva: boolean };
/** Lo escribe CopilotoFlotante y lo lee BotonCopilotoCabecera; nadie lo toma. */
export const indicadorCopiloto = crearBuzon<IndicadorCopiloto>();
