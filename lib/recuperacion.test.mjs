// Check de la recuperación de contraseña, sin dependencias:
// `npm test` corre node --test, y Node quita los tipos de recuperacion.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { errorDeConfirmacion, MENSAJE_ENLACE_INVALIDO, MENSAJE_RECUPERACION, mensajeDeError, tokenDeUrl } from "./recuperacion.ts";

test("MENSAJE_RECUPERACION es el mismo texto neutro que responde el backend", () => {
    assert.equal(MENSAJE_RECUPERACION, "Si la cuenta existe, enviaremos un enlace al correo registrado.");
});

test("MENSAJE_ENLACE_INVALIDO es el texto que responde el backend para un enlace inválido, usado o vencido", () => {
    assert.equal(MENSAJE_ENLACE_INVALIDO, "El enlace no es válido o ya venció.");
});

test("tokenDeUrl: un token normal pasa, recortado", () => {
    const token = "A".repeat(43);
    assert.equal(tokenDeUrl(token), token);
    assert.equal(tokenDeUrl(`  ${token}  `), token);
});

test("tokenDeUrl: falta, vacío, repetido, con espacios o demasiado largo → null", () => {
    for (const malo of [undefined, "", "   ", ["a", "b"], "con espacio", "x".repeat(201)]) {
        assert.equal(tokenDeUrl(malo), null, JSON.stringify(malo));
    }
});

test("errorDeConfirmacion: coincide → null; distinta → aviso", () => {
    assert.equal(errorDeConfirmacion("Nueva-Clave-2026!", "Nueva-Clave-2026!"), null);
    assert.equal(errorDeConfirmacion("Nueva-Clave-2026!", "nueva-clave-2026!"), "Las contraseñas no coinciden.");
    assert.equal(errorDeConfirmacion("a", ""), "Las contraseñas no coinciden.");
});

test("mensajeDeError: el límite de tasa (429) tiene su mensaje, no el genérico", () => {
    for (const paso of ["recuperar", "restablecer"]) {
        assert.match(mensajeDeError(429, paso), /demasiados intentos/);
    }
});

test("mensajeDeError: sin respuesta del servidor (0 y 408) dice que no pudimos contactarlo", () => {
    for (const status of [0, 408]) {
        assert.match(mensajeDeError(status, "recuperar"), /contactar al servidor/);
        assert.match(mensajeDeError(status, "restablecer"), /contactar al servidor/);
    }
});

test("mensajeDeError: 400 al restablecer es enlace inválido o vencido, con salida (pedir otro)", () => {
    assert.match(mensajeDeError(400, "restablecer"), /no es válido o ya venció/);
    assert.match(mensajeDeError(400, "restablecer"), /Pide uno nuevo/);
});

test("mensajeDeError: cualquier otro código da el genérico de cada paso", () => {
    assert.match(mensajeDeError(500, "recuperar"), /procesar la solicitud/);
    assert.match(mensajeDeError(500, "restablecer"), /cambiar la contraseña/);
    assert.match(mensajeDeError(400, "recuperar"), /procesar la solicitud/);
});
