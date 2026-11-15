// Formato minimo de las respuestas del copiloto: estructura, nunca HTML.
import assert from "node:assert/strict";
import { test } from "node:test";
import { interpretarLinea, interpretarTexto } from "./texto-enriquecido.ts";

test("negrita y codigo dentro de una linea", () => {
    assert.deepEqual(interpretarLinea("El saldo es **$27.165.100** en la cuenta `1101003`."), [
        { tipo: "texto", texto: "El saldo es " },
        { tipo: "negrita", texto: "$27.165.100" },
        { tipo: "texto", texto: " en la cuenta " },
        { tipo: "codigo", texto: "1101003" },
        { tipo: "texto", texto: "." },
    ]);
});

test("un ** sin cerrar (respuesta a medias) se muestra tal cual", () => {
    assert.deepEqual(interpretarLinea("El saldo es **$27.1"), [{ tipo: "texto", texto: "El saldo es **$27.1" }]);
});

test("el HTML queda como texto: React lo escapa al mostrarlo", () => {
    assert.deepEqual(interpretarLinea('<img src=x onerror="alert(1)">'), [
        { tipo: "texto", texto: '<img src=x onerror="alert(1)">' },
    ]);
});

test("parrafos separados por linea en blanco y listas con guion o numeradas", () => {
    const bloques = interpretarTexto("Primero.\nSigue igual.\n\n- uno\n- **dos**\n\n1. a\n2) b\nCierre.");
    assert.deepEqual(bloques, [
        { tipo: "parrafo", fragmentos: [{ tipo: "texto", texto: "Primero.\nSigue igual." }] },
        {
            tipo: "lista",
            ordenada: false,
            items: [[{ tipo: "texto", texto: "uno" }], [{ tipo: "negrita", texto: "dos" }]],
        },
        { tipo: "lista", ordenada: true, items: [[{ tipo: "texto", texto: "a" }], [{ tipo: "texto", texto: "b" }]] },
        { tipo: "parrafo", fragmentos: [{ tipo: "texto", texto: "Cierre." }] },
    ]);
});

test("un titulo se muestra como parrafo en negrita y el texto vacio no produce bloques", () => {
    assert.deepEqual(interpretarTexto("## Resumen\nTodo cuadra."), [
        { tipo: "parrafo", fragmentos: [{ tipo: "negrita", texto: "Resumen" }] },
        { tipo: "parrafo", fragmentos: [{ tipo: "texto", texto: "Todo cuadra." }] },
    ]);
    assert.deepEqual(interpretarTexto(""), []);
    assert.deepEqual(interpretarTexto("\r\n\r\n"), []);
});

test("un monto negativo al inicio de linea no se confunde con una vineta", () => {
    assert.deepEqual(interpretarTexto("-$100 de diferencia"), [
        { tipo: "parrafo", fragmentos: [{ tipo: "texto", texto: "-$100 de diferencia" }] },
    ]);
});
