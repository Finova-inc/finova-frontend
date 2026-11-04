import { headers } from "next/headers";

import { cabecerasDeIp } from "./ip-firmada";

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
