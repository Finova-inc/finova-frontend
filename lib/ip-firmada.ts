/**
 * IP real del visitante, firmada para el backend. SOLO servidor (usa node:crypto).
 *
 * Las llamadas a /auth/login, /auth/recuperar y /auth/restablecer salen del
 * servidor de Next, no del navegador: el backend vería siempre la IP de salida
 * de Vercel y todos los visitantes compartirían el mismo contador de intentos
 * (con 5 intentos por minuto, uno solo bloquearía el login de todos).
 *
 * Aquí se firma la IP real con HMAC-SHA256 y un secreto que solo conocen los
 * dos servicios (IP_FIRMA_SECRETO), más una marca de tiempo. El backend la usa
 * solo si la firma es válida y reciente (ver src/common/utils/ip-firmada.util.ts
 * del backend, que define el mismo formato); si no, usa la IP de la conexión.
 *
 * Formato: `<marca de tiempo en ms>|<ip>|<HMAC-SHA256 hex de "marca|ip">`.
 */

import { createHmac } from "node:crypto";
import { isIP } from "node:net";

export const CABECERA_IP_FIRMADA = "x-finova-ip";

/** Largo mínimo del secreto; el backend descarta uno más corto, y aquí tampoco se firma con él. */
const LARGO_MINIMO_SECRETO = 32;

export function firmarIp(ip: string, secreto: string, ahoraMs: number): string {
    const marca = String(ahoraMs);
    const firma = createHmac("sha256", secreto).update(`${marca}|${ip}`).digest("hex");
    return `${marca}|${ip}|${firma}`;
}

/**
 * La IP del visitante según las cabeceras que pone la plataforma (en Vercel,
 * x-real-ip y x-forwarded-for traen la IP del cliente y Vercel las sobrescribe,
 * así que el visitante no las puede falsificar). null si no hay una IP válida.
 *
 * shortcut: esto confía en esas cabeceras. Es correcto en Vercel; si el
 * frontend se aloja detrás de otro proxy que no las sobrescriba, un visitante
 * podría elegir su propia IP, y habría que fijar de cuál confiar.
 */
export function ipDelVisitante(leer: (nombre: string) => string | null): string | null {
    const candidata = leer("x-real-ip")?.trim() || leer("x-forwarded-for")?.split(",")[0]?.trim() || "";
    return isIP(candidata) !== 0 ? candidata : null;
}

/**
 * Las cabeceras a enviar al backend: `{ x-finova-ip: ... }`, o `{}` si no hay
 * secreto (configuración faltante), o no hay IP (desarrollo local). Nunca firma
 * con un secreto corto ni inventa una IP.
 */
export function cabecerasDeIp(
    leer: (nombre: string) => string | null,
    secreto: string | undefined,
    ahoraMs: number,
): Record<string, string> {
    if (!secreto || secreto.length < LARGO_MINIMO_SECRETO) return {};
    const ip = ipDelVisitante(leer);
    return ip ? { [CABECERA_IP_FIRMADA]: firmarIp(ip, secreto, ahoraMs) } : {};
}
