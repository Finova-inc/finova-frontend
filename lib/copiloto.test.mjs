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

// --- Historial por bloques, pantalla, sugerencias y preguntas restantes ------
import {
    BLOQUE_HISTORIAL,
    esPantallaValida,
    MAX_CARACTERES_HISTORIAL,
    PREGUNTAS_SUGERIDAS,
    preguntasRestantes,
    sugerenciasPara,
} from "./copiloto.ts";

/** n mensajes alternados usuario/asistente, cada uno con `largo` caracteres. */
function conversacion(n, largo = 10) {
    return Array.from({ length: n }, (_, i) => ({
        rol: i % 2 === 0 ? "usuario" : "asistente",
        texto: String(i).padStart(largo, "x"),
    }));
}

test("armarHistorial recorta por bloques de 10 para no mover la ventana en cada pregunta", () => {
    assert.equal(BLOQUE_HISTORIAL, 10);
    assert.equal(armarHistorial(conversacion(9)).length, 9);
    assert.equal(armarHistorial(conversacion(10)).length, 10);
    assert.equal(armarHistorial(conversacion(19)).length, 19);
    assert.equal(armarHistorial(conversacion(20)).length, 10);
    assert.equal(armarHistorial(conversacion(25)).length, 15);
    assert.equal(armarHistorial(conversacion(30)).length, 10);
});

test("armarHistorial mantiene el mismo inicio entre 10 y 19 mensajes (la cache del modelo se conserva)", () => {
    const primero = armarHistorial(conversacion(10))[0].texto;
    for (let n = 11; n <= 19; n++) assert.equal(armarHistorial(conversacion(n))[0].texto, primero);
    assert.notEqual(armarHistorial(conversacion(20))[0].texto, primero);
});

test("armarHistorial respeta el presupuesto de caracteres avanzando de bloque en bloque", () => {
    // 12 mensajes de 4.000: los 12 pasan el presupuesto, queda el bloque desde el 10.
    const doce = armarHistorial(conversacion(12, 4000));
    assert.equal(doce.length, 2);
    assert.equal(doce[0].rol, "usuario");

    // 10 mensajes de 4.000: no hay otro bloque, se mandan los ultimos que caben.
    const diez = armarHistorial(conversacion(10, 4000));
    const total = diez.reduce((suma, m) => suma + m.texto.length, 0);
    assert.ok(total <= MAX_CARACTERES_HISTORIAL);
    assert.ok(diez.length >= 1);
    assert.equal(diez[0].rol, "usuario");
    assert.equal(diez.at(-1).texto, conversacion(10, 4000).at(-1).texto);
});

test("armarHistorial con dos preguntas seguidas (una respuesta fallo) sigue empezando por el usuario", () => {
    const mensajes = conversacion(20);
    // La respuesta 11 fallo y no esta: quedan dos mensajes de usuario seguidos.
    mensajes.splice(11, 1);
    const historial = armarHistorial(mensajes);
    assert.equal(historial[0].rol, "usuario");
    assert.ok(historial.length <= MAX_HISTORIAL);
});

test("armarHistorial conserva la pantalla de los mensajes del usuario", () => {
    const historial = armarHistorial([
        { rol: "usuario", texto: "¿saldo?", pantalla: "el libro mayor" },
        { rol: "asistente", texto: "$100", pantalla: "no va" },
        { rol: "usuario", texto: "¿y ahora?" },
    ]);
    assert.deepEqual(historial, [
        { rol: "usuario", texto: "¿saldo?", pantalla: "el libro mayor" },
        { rol: "asistente", texto: "$100" },
        { rol: "usuario", texto: "¿y ahora?" },
    ]);
});

test("esPantallaValida: una linea de hasta 200 caracteres sin < ni >", () => {
    assert.equal(esPantallaValida("el balance"), true);
    assert.equal(esPantallaValida("a".repeat(200)), true);
    for (const malo of ["", "a".repeat(201), "a<b", "a>b", "a\nb", "a\rb", 5, null, undefined]) {
        assert.equal(esPantallaValida(malo), false);
    }
});

test("validarCuerpoChat acepta y devuelve la pantalla, y la rechaza si es invalida", () => {
    const ok = validarCuerpoChat({
        mensaje: "hola",
        pantalla: "el balance",
        historial: [
            { rol: "usuario", texto: "¿saldo?", pantalla: "el libro mayor" },
            { rol: "asistente", texto: "$100" },
        ],
    });
    assert.deepEqual(ok, {
        ok: true,
        valor: {
            mensaje: "hola",
            pantalla: "el balance",
            historial: [
                { rol: "usuario", texto: "¿saldo?", pantalla: "el libro mayor" },
                { rol: "asistente", texto: "$100" },
            ],
        },
    });
    assert.equal(validarCuerpoChat({ mensaje: "hola", pantalla: "a<b" }).ok, false);
    assert.equal(validarCuerpoChat({ mensaje: "hola", pantalla: "a".repeat(201) }).ok, false);
    assert.equal(
        validarCuerpoChat({ mensaje: "hola", historial: [{ rol: "usuario", texto: "x", pantalla: "</pantalla>" }] }).ok,
        false,
    );
    // Sin pantalla, el cuerpo no lleva la clave.
    assert.deepEqual(validarCuerpoChat({ mensaje: "hola" }), { ok: true, valor: { mensaje: "hola", historial: [] } });
});

test("validarCuerpoChat admite 20 mensajes de historial y no 21", () => {
    assert.equal(MAX_HISTORIAL, 20);
    assert.equal(validarCuerpoChat({ mensaje: "hola", historial: conversacion(20) }).ok, true);
    assert.equal(validarCuerpoChat({ mensaje: "hola", historial: conversacion(21) }).ok, false);
});

test("leerEventosSse conserva el id de uso y los tokens del evento fin", () => {
    const fin = { tipo: "fin", motivo: "completo", aviso: null, id_uso: "abc", tokens_hoy: 5500, tokens_pregunta: 1500 };
    assert.deepEqual(leerEventosSse(`data: ${JSON.stringify(fin)}\n\n`).eventos, [fin]);
    // Un backend anterior no los manda: el evento sigue siendo valido.
    const viejo = { tipo: "fin", motivo: "completo", aviso: null };
    assert.deepEqual(leerEventosSse(`data: ${JSON.stringify(viejo)}\n\n`).eventos, [viejo]);
    // Con un tipo inesperado se descartan esos campos, no el evento.
    const raro = { tipo: "fin", motivo: "completo", aviso: null, id_uso: 7, tokens_hoy: "muchos" };
    assert.deepEqual(leerEventosSse(`data: ${JSON.stringify(raro)}\n\n`).eventos, [viejo]);
});

test("sugerenciasPara cambia segun la pantalla y cae en las generales", () => {
    const mayor = sugerenciasPara("/dashboard/libro-mayor");
    assert.equal(mayor.length, 3);
    assert.notDeepEqual(mayor, [...PREGUNTAS_SUGERIDAS].slice(0, 3));
    assert.equal(sugerenciasPara("/dashboard/balance/comprobacion").length, 3);
    assert.equal(sugerenciasPara("/dashboard/core-contable/nuevo").length, 3);
    // El borrador y el formulario tienen las suyas; el detalle de un asiento, las del libro diario.
    assert.deepEqual(sugerenciasPara("/dashboard/core-contable/borradores/abc"), sugerenciasPara("/dashboard/core-contable/nuevo"));
    assert.notDeepEqual(sugerenciasPara("/dashboard/core-contable/nuevo"), sugerenciasPara("/dashboard/core-contable"));
    assert.deepEqual(sugerenciasPara("/dashboard/core-contable/abc"), sugerenciasPara("/dashboard/core-contable"));
    assert.equal(sugerenciasPara("/dashboard/plan-cuentas").length, 3);
    assert.deepEqual(sugerenciasPara("/dashboard/f29"), PREGUNTAS_SUGERIDAS);
    assert.deepEqual(sugerenciasPara("/dashboard"), PREGUNTAS_SUGERIDAS);
});

test("preguntasRestantes estima cuantas preguntas quedan en el tope de hoy", () => {
    assert.equal(preguntasRestantes(0, 200000, 13000), 15);
    assert.equal(preguntasRestantes(190000, 200000, 13000), 0);
    assert.equal(preguntasRestantes(250000, 200000, 13000), 0);
    assert.equal(preguntasRestantes(0, 200000, 0), 15);
    assert.equal(preguntasRestantes(100000, 200000, 20000), 5);
});
