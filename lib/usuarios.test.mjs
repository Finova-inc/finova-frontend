// Check de las piezas puras de usuarios, sin dependencias: `npm test` corre
// node --test, y Node quita los tipos de usuarios.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { correoValido, nombreRol, rolValido, ROLES } from "./usuarios.ts";

test("ROLES: los tres del catálogo, en orden", () => {
    assert.deepEqual(ROLES.map((r) => r.id), [1, 2, 3]);
});

test("nombreRol: nombre del catálogo, o un texto neutro si no existe", () => {
    assert.equal(nombreRol(1), "Administrador");
    assert.equal(nombreRol(3), "Consulta");
    assert.equal(nombreRol(9), "Rol 9");
});

test("rolValido: solo 1, 2 o 3 como número", () => {
    assert.equal(rolValido(2), true);
    assert.equal(rolValido("2"), false);
    assert.equal(rolValido(4), false);
});

test("correoValido: forma básica de un correo", () => {
    assert.equal(correoValido("ana@finova.cl"), true);
    assert.equal(correoValido(" ana@finova.cl "), true);
    assert.equal(correoValido("ana@finova"), false);
    assert.equal(correoValido("ana finova.cl"), false);
});
