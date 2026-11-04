// Reintentos de lecturas contra un backend que despierta. Sin esperas reales:
// `dormir` se reemplaza y registra cuánto se habría esperado.
import assert from "node:assert/strict";
import { test } from "node:test";
import { conReintentos, ESPERAS_REINTENTO_MS, esFalloTransitorio } from "./reintentos.ts";

const falla = (status) => Object.assign(new Error(`HTTP ${status}`), { status });
const reintentable = (error) => esFalloTransitorio(error.status);

/** Operación que falla `fallos` veces con `status` y luego responde. */
function operacion(fallos, status = 503) {
    const llamadas = { n: 0 };
    const fn = async () => {
        llamadas.n += 1;
        if (llamadas.n <= fallos) throw falla(status);
        return "ok";
    };
    return { fn, llamadas };
}

function reloj() {
    const esperas = [];
    return { esperas, dormir: async (ms) => void esperas.push(ms) };
}

test("qué estados cuentan como 'el servicio está despertando'", () => {
    for (const s of [0, 502, 503, 504]) assert.equal(esFalloTransitorio(s), true, String(s));
    for (const s of [200, 400, 401, 403, 404, 408, 409, 429, 500]) assert.equal(esFalloTransitorio(s), false, String(s));
});

test("un 503 que se resuelve al segundo intento devuelve el resultado, esperando 2 s", async () => {
    const { fn, llamadas } = operacion(1);
    const { esperas, dormir } = reloj();
    assert.equal(await conReintentos(fn, { reintentar: reintentable, dormir }), "ok");
    assert.equal(llamadas.n, 2);
    assert.deepEqual(esperas, [2_000]);
});

test("espera creciente: 2 s y luego 4 s, y 3 intentos en total", async () => {
    const { fn, llamadas } = operacion(2);
    const { esperas, dormir } = reloj();
    assert.equal(await conReintentos(fn, { reintentar: reintentable, dormir }), "ok");
    assert.equal(llamadas.n, 3);
    assert.deepEqual(esperas, [...ESPERAS_REINTENTO_MS]);
});

test("si sigue fallando, tras el último intento lanza el error original", async () => {
    const { fn, llamadas } = operacion(10);
    const { dormir } = reloj();
    await assert.rejects(conReintentos(fn, { reintentar: reintentable, dormir }), { status: 503 });
    assert.equal(llamadas.n, 3);
});

test("lo que no es transitorio no se reintenta: 401, 404, 429, 500 y el tiempo agotado (408)", async () => {
    for (const status of [401, 404, 429, 500, 408]) {
        const { fn, llamadas } = operacion(10, status);
        const { esperas, dormir } = reloj();
        await assert.rejects(conReintentos(fn, { reintentar: reintentable, dormir }), { status });
        assert.equal(llamadas.n, 1, `status ${status}`);
        assert.deepEqual(esperas, []);
    }
});

test("sin fallos, una sola llamada y ninguna espera", async () => {
    const { fn, llamadas } = operacion(0);
    const { esperas, dormir } = reloj();
    assert.equal(await conReintentos(fn, { reintentar: reintentable, dormir }), "ok");
    assert.equal(llamadas.n, 1);
    assert.deepEqual(esperas, []);
});
