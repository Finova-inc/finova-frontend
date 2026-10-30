// Reglas de reversión del libro diario, sin dependencias: `npm test` corre
// node --test, y Node quita los tipos de reversion.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { marcaDeReversa, puedeRevertir } from "./reversion.ts";

const ADMIN = 1;
const CONTADOR = 2;
const CONSULTA = 3;

const original = { id_asiento: "a-1", tipo_comprobante: "I", numero: 5, anio: 2026, fecha_contable: "2026-10-01" };
const reversa = { id_asiento: "a-2", tipo_comprobante: "T", numero: 9, anio: 2026, fecha_contable: "2026-10-02" };

const normal = { origen: "manual", revertido_por: null, revierte_a: null };
const anulado = { origen: "manual", revertido_por: reversa, revierte_a: null };
const esReversa = { origen: "reversa", revertido_por: null, revierte_a: original };

test("puedeRevertir: contador y administrador ven el botón en un asiento vigente", () => {
    assert.equal(puedeRevertir(CONTADOR, normal), true);
    assert.equal(puedeRevertir(ADMIN, normal), true);
});

test("puedeRevertir: consulta y sin rol no lo ven", () => {
    assert.equal(puedeRevertir(CONSULTA, normal), false);
    assert.equal(puedeRevertir(null, normal), false);
});

test("puedeRevertir: ni una reversa ni un asiento ya revertido se revierten", () => {
    assert.equal(puedeRevertir(CONTADOR, esReversa), false);
    assert.equal(puedeRevertir(CONTADOR, anulado), false);
});

test("marcaDeReversa: el asiento revertido queda anulado y apunta a su reversa", () => {
    assert.deepEqual(marcaDeReversa(anulado), { tipo: "anulado", reversa });
});

test("marcaDeReversa: la reversa apunta al original", () => {
    assert.deepEqual(marcaDeReversa(esReversa), { tipo: "reversa", original });
});

test("marcaDeReversa: un asiento común no lleva marca", () => {
    assert.equal(marcaDeReversa(normal), null);
});
