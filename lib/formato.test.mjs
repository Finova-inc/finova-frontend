// formatearCLP es el único formateador de pesos: el signo va antes del símbolo
// ("-$100"), no entre el símbolo y la cifra ("$-100", como lo pone Intl en es-CL).
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatearCLP } from "./formato.ts";

test("positivos, con puntos de miles y sin decimales", () => {
    assert.equal(formatearCLP(100), "$100");
    assert.equal(formatearCLP("1250000"), "$1.250.000");
    assert.equal(formatearCLP("1250000.0000"), "$1.250.000");
    assert.equal(formatearCLP(1250000.6), "$1.250.001");
});

test("negativos: el signo va antes del símbolo", () => {
    assert.equal(formatearCLP(-100), "-$100");
    assert.equal(formatearCLP("-100.0000"), "-$100");
    assert.equal(formatearCLP("-1250000"), "-$1.250.000");
});

test("cero, y lo que redondea a cero, sin signo", () => {
    assert.equal(formatearCLP(0), "$0");
    assert.equal(formatearCLP(-0), "$0");
    assert.equal(formatearCLP("0.0000"), "$0");
    assert.equal(formatearCLP(-0.4), "$0");
    assert.equal(formatearCLP(0.4), "$0");
});

test("bigint, el tipo que usa el formulario de asientos", () => {
    assert.equal(formatearCLP(BigInt(1190000)), "$1.190.000");
    assert.equal(formatearCLP(BigInt(-1190000)), "-$1.190.000");
    assert.equal(formatearCLP(BigInt(0)), "$0");
});

test("lo que no es un número se muestra como guion, no como $NaN", () => {
    assert.equal(formatearCLP("abc"), "—");
    assert.equal(formatearCLP(NaN), "—");
    assert.equal(formatearCLP(Infinity), "—");
});
