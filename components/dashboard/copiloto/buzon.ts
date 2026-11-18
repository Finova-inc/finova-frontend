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
export const propuestasPendientes = crearBuzon<PropuestaAsiento>();
