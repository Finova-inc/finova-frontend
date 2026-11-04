// Check del cierre de sesión, sin dependencias:
// `npm test` corre node --test, y Node quita los tipos de cierre-sesion.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { revocarEnBackend } from "./cierre-sesion.ts";

test("revocarEnBackend: llama al backend con el token y devuelve true", async () => {
    const llamadas = [];
    const resultado = await revocarEnBackend("token-123", async (token) => {
        llamadas.push(token);
    });

    assert.equal(resultado, true);
    assert.deepEqual(llamadas, ["token-123"]);
});

test("revocarEnBackend: si el backend falla (401, caído, sin respuesta) no lanza y devuelve false", async () => {
    for (const fallo of [new Error("401"), new Error("No se pudo contactar al servidor."), "texto suelto", undefined]) {
        const resultado = await revocarEnBackend("token-123", async () => {
            throw fallo;
        });
        assert.equal(resultado, false, String(fallo));
    }
});

test("revocarEnBackend: sin token no llama al backend", async () => {
    let llamado = false;
    for (const vacio of [null, undefined, ""]) {
        const resultado = await revocarEnBackend(vacio, async () => {
            llamado = true;
        });
        assert.equal(resultado, false);
    }
    assert.equal(llamado, false);
});
