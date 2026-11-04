// La IP firmada que el frontend manda al backend. Reloj fijo, sin red.
// El formato se verifica con un cálculo HMAC independiente, el mismo que hace
// el backend (src/common/utils/ip-firmada.util.ts).
import assert from "node:assert/strict";
import { createHmac } from "node:crypto";
import { test } from "node:test";
import { CABECERA_IP_FIRMADA, cabecerasDeIp, firmarIp, ipDelVisitante } from "./ip-firmada.ts";

const SECRETO = "secreto-de-prueba-con-mas-de-treinta-y-dos-caracteres";
const T0 = Date.UTC(2026, 10, 4, 12, 0, 0);
const cabeceras = (mapa) => (nombre) => mapa[nombre] ?? null;

test("firmarIp: marca|ip|HMAC-SHA256 de 'marca|ip' (el formato que verifica el backend)", () => {
    const esperada = createHmac("sha256", SECRETO).update(`${T0}|190.1.2.3`).digest("hex");
    assert.equal(firmarIp("190.1.2.3", SECRETO, T0), `${T0}|190.1.2.3|${esperada}`);
});

test("la firma cambia con la IP, la hora y el secreto", () => {
    const base = firmarIp("190.1.2.3", SECRETO, T0);
    assert.notEqual(firmarIp("190.9.9.9", SECRETO, T0), base);
    assert.notEqual(firmarIp("190.1.2.3", SECRETO, T0 + 1), base);
    assert.notEqual(firmarIp("190.1.2.3", SECRETO + "x", T0), base);
});

test("ipDelVisitante: x-real-ip primero, luego el primer valor de x-forwarded-for", () => {
    assert.equal(ipDelVisitante(cabeceras({ "x-real-ip": "190.1.2.3", "x-forwarded-for": "10.0.0.1" })), "190.1.2.3");
    assert.equal(ipDelVisitante(cabeceras({ "x-forwarded-for": "190.4.5.6, 76.76.21.21" })), "190.4.5.6");
    assert.equal(ipDelVisitante(cabeceras({ "x-real-ip": "2800:200:1::1" })), "2800:200:1::1");
});

test("ipDelVisitante: sin cabecera o con algo que no es una IP, null", () => {
    assert.equal(ipDelVisitante(cabeceras({})), null);
    assert.equal(ipDelVisitante(cabeceras({ "x-real-ip": "no-soy-una-ip" })), null);
    assert.equal(ipDelVisitante(cabeceras({ "x-forwarded-for": "<script>, 1.2.3.4" })), null);
});

test("cabecerasDeIp: manda la cabecera firmada cuando hay secreto e IP", () => {
    const r = cabecerasDeIp(cabeceras({ "x-real-ip": "190.1.2.3" }), SECRETO, T0);
    assert.deepEqual(r, { [CABECERA_IP_FIRMADA]: firmarIp("190.1.2.3", SECRETO, T0) });
});

test("cabecerasDeIp: sin secreto, con secreto corto o sin IP no manda nada (cae a la IP de la conexión)", () => {
    const con = cabeceras({ "x-real-ip": "190.1.2.3" });
    assert.deepEqual(cabecerasDeIp(con, undefined, T0), {});
    assert.deepEqual(cabecerasDeIp(con, "", T0), {});
    assert.deepEqual(cabecerasDeIp(con, "corto", T0), {});
    assert.deepEqual(cabecerasDeIp(cabeceras({}), SECRETO, T0), {});
});
