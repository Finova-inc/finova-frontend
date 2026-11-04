// Check de los mensajes al subir un archivo del SII, sin dependencias:
// `npm test` corre node --test, y Node quita los tipos de errores-subida.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { mensajeDeSubida } from "./errores-subida.ts";

test("0 y 408: el servidor no respondió, reintentar", () => {
    for (const status of [0, 408]) {
        const [mensaje] = mensajeDeSubida(status, null);
        assert.match(mensaje, /no respondió a tiempo/, String(status));
    }
});

test("403: el rol no permite importar", () => {
    assert.match(mensajeDeSubida(403, null)[0], /rol/);
});

test("413: archivo demasiado grande, con el tope de 10 MB", () => {
    const [mensaje] = mensajeDeSubida(413, null);
    assert.match(mensaje, /demasiado grande/);
    assert.match(mensaje, /10 MB/);
});

test("415: formato no compatible, pide el CSV del SII", () => {
    const [mensaje] = mensajeDeSubida(415, null);
    assert.match(mensaje, /formato/);
    assert.match(mensaje, /CSV/);
});

test("422: muestra el mensaje del backend, sea texto o lista", () => {
    assert.deepEqual(mensajeDeSubida(422, { message: "Faltan las columnas Folio y RUT." }), ["Faltan las columnas Folio y RUT."]);
    assert.deepEqual(mensajeDeSubida(422, { message: ["Fila 2: RUT inválido", "Fila 5: fecha inválida"] }), [
        "Fila 2: RUT inválido",
        "Fila 5: fecha inválida",
    ]);
});

test("422 sin mensaje utilizable: mensaje genérico de que no se pudo leer", () => {
    for (const cuerpo of [null, undefined, {}, { message: 42 }, { message: [1, 2] }]) {
        assert.match(mensajeDeSubida(422, cuerpo)[0], /No pudimos leer el archivo/, JSON.stringify(cuerpo));
    }
});

test("5xx: problema del servidor, no del archivo", () => {
    for (const status of [500, 503]) {
        const [mensaje] = mensajeDeSubida(status, { message: "detalle técnico que no se debe mostrar" });
        assert.match(mensaje, /problema/, String(status));
        assert.match(mensaje, /no es culpa de tu archivo/, String(status));
        assert.doesNotMatch(mensaje, /detalle técnico/, String(status));
    }
});

test("400, 404, 409 y códigos no esperados: sin mensaje propio (quien llama usa el del backend o el suyo)", () => {
    for (const status of [400, 404, 409, 418, 429, 302]) {
        assert.equal(mensajeDeSubida(status, { message: "x" }), null, String(status));
    }
});
