import assert from "node:assert/strict";
import test from "node:test";
import { numeroPorRubro, seccionesConHuecos, seccionesVacias, textoVigente } from "./notas.ts";

const texto = (clave, texto_guardado, plantilla = "[completar]") => ({
    numero: 1, clave, tipo: "texto", titulo: clave, texto_guardado, plantilla,
});

test("nunca guardada muestra la plantilla; guardada vacía queda vacía", () => {
    assert.equal(textoVigente(texto("a", null, "Borrador")), "Borrador");
    assert.equal(textoVigente(texto("a", "", "Borrador")), "");
});

test("las secciones vacías son las guardadas en blanco, no las que solo tienen plantilla", () => {
    const notas = [texto("a", ""), texto("b", "   "), texto("c", null), texto("d", "Listo")];
    assert.deepEqual(seccionesVacias(notas).map((n) => n.clave), ["a", "b"]);
});

test("los huecos entre corchetes se detectan en plantilla y en texto guardado", () => {
    const notas = [texto("a", null), texto("b", "Ejercicio [año]"), texto("c", "Completo"), texto("d", "")];
    assert.deepEqual(seccionesConHuecos(notas).map((n) => n.clave), ["a", "b"]);
});

test("numeroPorRubro solo incluye las notas por partida", () => {
    const notas = [
        texto("a", "x"),
        { numero: 4, clave: "activo_corriente", tipo: "partida", titulo: "t", cuentas: [], total: "0" },
        { numero: 5, clave: "gastos", tipo: "partida", titulo: "t", cuentas: [], total: "0" },
    ];
    assert.deepEqual(numeroPorRubro(notas), { activo_corriente: 4, gastos: 5 });
});
