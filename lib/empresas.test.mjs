import assert from "node:assert/strict";
import { test } from "node:test";
import { confirmaEliminacion, textoDeConfirmacion } from "./empresas.ts";

const EMPRESA = { rut: "76.543.210-K", razon_social: "Empresa Prueba SpA" };

test("confirma con el RUT, con o sin puntos, guion o mayúsculas", () => {
    assert.equal(confirmaEliminacion("76.543.210-K", EMPRESA), true);
    assert.equal(confirmaEliminacion("76543210k", EMPRESA), true);
    assert.equal(confirmaEliminacion(" 76.543.210-k ", EMPRESA), true);
});

test("rechaza vacío, RUT distinto, incompleto o el nombre cuando hay RUT", () => {
    assert.equal(confirmaEliminacion("", EMPRESA), false);
    assert.equal(confirmaEliminacion("76.543.210-1", EMPRESA), false);
    assert.equal(confirmaEliminacion("76.543.210", EMPRESA), false);
    assert.equal(confirmaEliminacion("Empresa Prueba SpA", EMPRESA), false);
});

test("sin RUT se pide el nombre exacto", () => {
    const sinRut = { rut: null, razon_social: "Empresa Prueba SpA" };
    assert.equal(confirmaEliminacion("Empresa Prueba SpA", sinRut), true);
    assert.equal(confirmaEliminacion("empresa prueba spa", sinRut), false);
    assert.equal(confirmaEliminacion("", sinRut), false);
    assert.equal(confirmaEliminacion("", { rut: null, razon_social: null }), false);
    assert.equal(textoDeConfirmacion(sinRut), "Empresa Prueba SpA");
    assert.equal(textoDeConfirmacion(EMPRESA), "76.543.210-K");
});
