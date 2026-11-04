// Check de la UTM sugerida del F29, sin dependencias:
// `npm test` corre node --test, y Node quita los tipos de utm-sugerida.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { anioYMes, marcaUtm, TEXTO_A_MANO, TEXTO_SIN_SUGERENCIA, TEXTO_SUGERIDA, valorInicialUtm } from "./utm-sugerida.ts";

test("marcaUtm: igual a la sugerida → «Sugerida desde mindicador.cl»", () => {
    assert.deepEqual(marcaUtm("72151", "72151"), { tipo: "sugerida", texto: TEXTO_SUGERIDA });
});

test("marcaUtm: la comparación es por el monto, con puntos de miles, espacios o «$»", () => {
    for (const escrito of ["72.151", " 72.151 ", "$ 72.151", "072151"]) {
        assert.equal(marcaUtm(escrito, "72151")?.tipo, "sugerida", escrito);
    }
});

test("marcaUtm: distinta de la sugerida → «Ingresada a mano»", () => {
    assert.deepEqual(marcaUtm("72.152", "72151"), { tipo: "a-mano", texto: TEXTO_A_MANO });
    assert.equal(marcaUtm("7215", "72151")?.tipo, "a-mano");
});

test("marcaUtm: sin sugerencia y con algo escrito → «Ingresada a mano»", () => {
    assert.deepEqual(marcaUtm("69.751", null), { tipo: "a-mano", texto: TEXTO_A_MANO });
});

test("marcaUtm: texto que no es un monto → «Ingresada a mano», nunca «Sugerida»", () => {
    for (const escrito of ["abc", "72.151,5", "-72151", "72151 pesos"]) {
        assert.equal(marcaUtm(escrito, "72151")?.tipo, "a-mano", escrito);
    }
});

test("marcaUtm: vacío y sin sugerencia → el aviso de escribirla a mano", () => {
    assert.deepEqual(marcaUtm("", null), { tipo: "sin-sugerencia", texto: TEXTO_SIN_SUGERENCIA });
    assert.equal(marcaUtm("  ", null)?.tipo, "sin-sugerencia");
});

test("marcaUtm: vacío pero con sugerencia disponible → sin marca", () => {
    assert.equal(marcaUtm("", "72151"), null);
});

test("valorInicialUtm: el valor guardado manda; la sugerida solo rellena lo que no hay", () => {
    assert.equal(valorInicialUtm("69751", "72151"), "69751"); // guardado: no se sobrescribe
    assert.equal(valorInicialUtm(null, "72151"), "72151"); // sin guardado: se precarga
    assert.equal(valorInicialUtm(null, null), null);
    assert.equal(valorInicialUtm("69751", null), "69751");
});

test("anioYMes: lee el período AAAA-MM", () => {
    assert.deepEqual(anioYMes("2026-10"), { anio: 2026, mes: 10 });
    assert.deepEqual(anioYMes("2027-01"), { anio: 2027, mes: 1 });
});
