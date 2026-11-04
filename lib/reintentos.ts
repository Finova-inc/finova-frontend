/**
 * Reintento con espera creciente, sin dependencias.
 *
 * Neon (base) y Render (backend) se duermen sin uso y tardan unos segundos en
 * despertar: la primera llamada falla (503, o red cortada) y la siguiente
 * funciona. Reintentar solo esos fallos rápidos evita mostrar un error por
 * algo que se resuelve solo.
 *
 * Solo se reintenta lo que es seguro repetir: lecturas (GET) y el login. Una
 * escritura (crear un asiento, importar un archivo) NO se reintenta: si la
 * primera llegó y solo se perdió la respuesta, repetirla duplicaría datos.
 */

/** Esperas antes de cada reintento: 3 intentos en total. */
export const ESPERAS_REINTENTO_MS: readonly number[] = [2_000, 4_000];

/**
 * Estados que indican "el servicio todavía no está listo": red cortada (0),
 * 502 y 504 del proxy y 503 del backend. No incluye el 408: ese ya esperó el
 * tiempo límite completo de una petición (15 s), y repetirlo haría esperar
 * minutos antes de decirle algo a la persona.
 */
export function esFalloTransitorio(status: number): boolean {
    return status === 0 || status === 502 || status === 503 || status === 504;
}

const dormirDeVerdad = (ms: number) => new Promise<void>((resolver) => setTimeout(resolver, ms));

export async function conReintentos<T>(
    operacion: () => Promise<T>,
    {
        reintentar,
        esperas = ESPERAS_REINTENTO_MS,
        dormir = dormirDeVerdad,
    }: {
        /** Decide si el error vale otro intento. */
        readonly reintentar: (error: unknown) => boolean;
        readonly esperas?: readonly number[];
        /** Se inyecta en las pruebas para no esperar de verdad. */
        readonly dormir?: (ms: number) => Promise<void>;
    },
): Promise<T> {
    for (let intento = 0; ; intento += 1) {
        try {
            return await operacion();
        } catch (error) {
            if (intento >= esperas.length || !reintentar(error)) throw error;
            await dormir(esperas[intento]);
        }
    }
}
