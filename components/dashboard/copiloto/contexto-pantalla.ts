/* Almacen minimo del detalle que la pantalla abierta le declara al copiloto
   ("cuenta 1101 Caja"). Lo publica ContextoCopiloto y lo lee el chat con
   useSyncExternalStore. Solo vive en el navegador. */

let detalle: string | null = null;
const oyentes = new Set<() => void>();

export function publicarDetalle(nuevo: string | null): void {
    if (nuevo === detalle) return;
    detalle = nuevo;
    for (const oyente of oyentes) oyente();
}

export function suscribir(oyente: () => void): () => void {
    oyentes.add(oyente);
    return () => {
        oyentes.delete(oyente);
    };
}

export function leerDetalle(): string | null {
    return detalle;
}
