// Ancho del copiloto anclado: limites al arrastrar y lectura de la cookie.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ANCHO_MIN, MIN_CONTENIDO, leerAncho, limitarAncho } from "./ancho-copiloto.ts";

test("limitarAncho respeta el minimo del chat y llega hasta el menu de modulos", () => {
    assert.equal(limitarAncho(200, 1400), ANCHO_MIN);
    assert.equal(limitarAncho(600.6, 1400), 601);
    assert.equal(limitarAncho(5000, 1400), 1400 - MIN_CONTENIDO);
    // Ventana tan chica que no caben los dos: gana el minimo del chat (el CSS no lo deja pasar).
    assert.equal(limitarAncho(500, 400), ANCHO_MIN);
});

test("leerAncho acepta solo anchos razonables", () => {
    assert.equal(leerAncho("520"), 520);
    assert.equal(leerAncho(undefined), null);
    assert.equal(leerAncho(""), null);
    assert.equal(leerAncho("100"), null);
    assert.equal(leerAncho("99999"), null);
    assert.equal(leerAncho("520px"), null);
    assert.equal(leerAncho("-520"), null);
});
