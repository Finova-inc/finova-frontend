// Pruebas de quién ve la auditoría. El rol solo muestra u oculta la pantalla: el backend es quien autoriza.
import assert from "node:assert/strict";
import { test } from "node:test";
import { ROL, ROLES_QUE_AUDITAN, ROLES_QUE_VEN_CORREO, ROLES_QUE_VEN_IP, puedeAuditar, puedeVerCorreo, puedeVerIp } from "./roles.ts";

test("puedeAuditar: el administrador y el contador, no la consulta", () => {
    assert.equal(puedeAuditar(ROL.ADMINISTRADOR), true);
    assert.equal(puedeAuditar(ROL.CONTADOR), true);
    assert.equal(puedeAuditar(ROL.CONSULTA), false);
});

test("puedeAuditar: sin rol o con un número inexistente, no", () => {
    assert.equal(puedeAuditar(null), false);
    assert.equal(puedeAuditar(0), false);
    assert.equal(puedeAuditar(99), false);
    assert.equal(puedeAuditar(-1), false);
});

test("puedeVerIp: solo el administrador", () => {
    assert.equal(puedeVerIp(ROL.ADMINISTRADOR), true);
    for (const rol of [ROL.CONTADOR, ROL.CONSULTA, null, 0, 99, -1]) assert.equal(puedeVerIp(rol), false);
});

test("puedeVerCorreo: solo el administrador", () => {
    assert.equal(puedeVerCorreo(ROL.ADMINISTRADOR), true);
    for (const rol of [ROL.CONTADOR, ROL.CONSULTA, null, 0, 99, -1]) assert.equal(puedeVerCorreo(rol), false);
});

test("las listas son el espejo del backend", () => {
    assert.deepEqual([...ROLES_QUE_AUDITAN], [1, 2]);
    assert.deepEqual([...ROLES_QUE_VEN_IP], [1]);
    assert.deepEqual([...ROLES_QUE_VEN_CORREO], [1]);
});
