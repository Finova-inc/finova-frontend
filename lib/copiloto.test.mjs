// Chat del copiloto: lectura del stream, historial y validacion del puente.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    armarHistorial,
    esMismoOrigen,
    etiquetaHerramienta,
    leerEventosSse,
    MAX_HISTORIAL,
    MAX_MENSAJE,
    MAX_TEXTO_HISTORIAL,
    mensajeDeError,
    validarCuerpoChat,
    validarPregunta,
} from "./copiloto.ts";

const linea = (evento) => `data: ${JSON.stringify(evento)}\n\n`;

test("leerEventosSse entrega los eventos completos y guarda lo que llego a medias", () => {
    const completo = linea({ tipo: "texto", texto: "Hola" }) + linea({ tipo: "herramienta", nombre: "buscar_cuentas" });
    const aMedias = 'data: {"tipo":"texto","te';
    const { eventos, resto } = leerEventosSse(completo + aMedias);
    assert.deepEqual(eventos, [
        { tipo: "texto", texto: "Hola" },
        { tipo: "herramienta", nombre: "buscar_cuentas" },
    ]);
    assert.equal(resto, aMedias);

    // El trozo siguiente completa el evento.
    const segunda = leerEventosSse(resto + 'xto":" mundo"}\n\n');
    assert.deepEqual(segunda.eventos, [{ tipo: "texto", texto: " mundo" }]);
    assert.equal(segunda.resto, "");
});

test("leerEventosSse acepta fin de linea \\r\\n aunque llegue partido entre dos trozos", () => {
    const primero = leerEventosSse('data: {"tipo":"fin","motivo":"completo","aviso":null}\r\n\r');
    assert.deepEqual(primero.eventos, []);
    const segundo = leerEventosSse(primero.resto + "\n");
    assert.deepEqual(segundo.eventos, [{ tipo: "fin", motivo: "completo", aviso: null }]);
});

test("leerEventosSse descarta JSON roto y eventos desconocidos sin cortar los demas", () => {
    const buffer =
        "data: {roto\n\n" +
        linea({ tipo: "desconocido" }) +
        linea({ tipo: "texto", texto: 5 }) +
        linea({ tipo: "error", mensaje: "falló" });
    assert.deepEqual(leerEventosSse(buffer).eventos, [{ tipo: "error", mensaje: "falló" }]);
});

test("el texto con saltos de linea y signos llega intacto", () => {
    const texto = "Saldo: **$1.234.567**\n- uno\n- dos «ñ»";
    assert.deepEqual(leerEventosSse(linea({ tipo: "texto", texto })).eventos, [{ tipo: "texto", texto }]);
});

test("armarHistorial empieza por el usuario, deja los ultimos y recorta textos largos", () => {
    assert.deepEqual(
        armarHistorial([
            { rol: "asistente", texto: "¿En qué te ayudo?" },
            { rol: "usuario", texto: "  Saldo de caja  " },
            { rol: "asistente", texto: "" },
            { rol: "asistente", texto: "$100" },
        ]),
        [
            { rol: "usuario", texto: "Saldo de caja" },
            { rol: "asistente", texto: "$100" },
        ],
    );

    const muchos = Array.from({ length: MAX_HISTORIAL + 4 }, (_, i) => ({
        rol: i % 2 === 0 ? "usuario" : "asistente",
        texto: `m${i}`,
    }));
    const recortado = armarHistorial(muchos);
    assert.ok(recortado.length <= MAX_HISTORIAL);
    assert.equal(recortado[0].rol, "usuario");
    assert.equal(recortado.at(-1).texto, `m${MAX_HISTORIAL + 3}`);

    const largo = armarHistorial([{ rol: "usuario", texto: "x".repeat(MAX_TEXTO_HISTORIAL + 50) }]);
    assert.equal(largo[0].texto.length, MAX_TEXTO_HISTORIAL);
});

test("validarPregunta exige texto y respeta el largo maximo", () => {
    assert.equal(validarPregunta("¿Saldo de caja?"), null);
    assert.equal(validarPregunta("   "), "Escribe una pregunta.");
    assert.match(validarPregunta("x".repeat(MAX_MENSAJE + 1)), /como máximo/);
});

test("validarCuerpoChat deja pasar solo los campos conocidos", () => {
    const ok = validarCuerpoChat({
        mensaje: " hola ",
        historial: [{ rol: "usuario", texto: "antes", extra: 1 }],
        id_empresa: "otra",
    });
    assert.deepEqual(ok, { ok: true, valor: { mensaje: "hola", historial: [{ rol: "usuario", texto: "antes" }] } });
    assert.deepEqual(validarCuerpoChat({ mensaje: "hola" }), { ok: true, valor: { mensaje: "hola", historial: [] } });
});

test("validarCuerpoChat rechaza formas invalidas", () => {
    for (const cuerpo of [
        null,
        "texto",
        [],
        { mensaje: 5 },
        { mensaje: "" },
        { mensaje: "hola", historial: "no" },
        { mensaje: "hola", historial: [{ rol: "sistema", texto: "x" }] },
        { mensaje: "hola", historial: [{ rol: "usuario", texto: "" }] },
        { mensaje: "hola", historial: Array.from({ length: MAX_HISTORIAL + 1 }, () => ({ rol: "usuario", texto: "x" })) },
    ]) {
        assert.equal(validarCuerpoChat(cuerpo).ok, false, JSON.stringify(cuerpo));
    }
});

test("esMismoOrigen compara el host del Origin con el del sitio", () => {
    assert.equal(esMismoOrigen("http://localhost:3001", "localhost:3001"), true);
    assert.equal(esMismoOrigen("https://finova.vercel.app", "finova.vercel.app"), true);
    assert.equal(esMismoOrigen("https://atacante.com", "finova.vercel.app"), false);
    assert.equal(esMismoOrigen("https://finova.vercel.app.atacante.com", "finova.vercel.app"), false);
    assert.equal(esMismoOrigen(null, "finova.vercel.app"), false);
    assert.equal(esMismoOrigen("null", "finova.vercel.app"), false);
});

test("etiquetaHerramienta nunca muestra el nombre tecnico", () => {
    assert.equal(etiquetaHerramienta("libro_mayor_cuenta"), "Revisando el libro mayor…");
    assert.equal(etiquetaHerramienta("algo_nuevo"), "Consultando tus datos…");
});

test("mensajeDeError usa el mensaje del servidor solo cuando es para el usuario", () => {
    assert.equal(mensajeDeError(429, "Llegaste al limite diario."), "Llegaste al limite diario.");
    assert.match(mensajeDeError(503, "detalle"), /todavía no está disponible/);
    assert.match(mensajeDeError(504, null), /despertando/);
    assert.equal(mensajeDeError(500, "stack interno"), "El copiloto tuvo un problema. Intenta de nuevo.");
});
