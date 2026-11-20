import { headers } from "next/headers";

import { agregarCabecerasDeIp, cabecerasDeIp } from "./ip-firmada";

/**
 * Agrega la IP real del visitante, firmada, a las cabeceras de una llamada al
 * backend con sesión: la auditoría del backend la guarda en vez de la IP de
 * salida de Vercel. Si no hay petición en curso (headers() falla) no hace nada:
 * la llamada sigue sin la cabecera y el backend usa la IP de la conexión.
 */
export async function agregarIpFirmada(cabeceras: Headers): Promise<void> {
    try {
        agregarCabecerasDeIp(cabeceras, (await opcionesConIp()).headers);
    } catch {
        // sin petición de Next: nada que firmar
    }
}

/**
 * Opciones para las llamadas públicas de auth (login, recuperar, restablecer):
 * llevan la IP real del visitante firmada, para que el backend cuente los
 * intentos por visitante y no por la IP de salida de Vercel. Ver lib/ip-firmada.ts.
 *
 * Solo en el servidor (route handlers y Server Actions).
 */
export async function opcionesConIp(): Promise<{ readonly headers: Record<string, string> }> {
    const entrantes = await headers();
    return { headers: cabecerasDeIp((nombre) => entrantes.get(nombre), process.env.IP_FIRMA_SECRETO, Date.now()) };
}
