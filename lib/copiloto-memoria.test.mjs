// Memoria de la conversacion del copiloto en el navegador (localStorage).
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    claveDeMemoria,
    DIAS_DE_MEMORIA,
    guardarMemoria,
    leerMemoria,
    MAX_CARACTERES_GUARDADOS,
    MAX_MENSAJES_GUARDADOS,
    olvidarTodo,
    restaurarConversacion,
    serializarConversacion,
} from "./copiloto-memoria.ts";

const AHORA = new Date("2026-11-16T12:00:00Z");
const haceDias = (dias, minutos = 0) => new Date(AHORA.getTime() - dias * 86_400_000 - minutos * 60_000);

const MENSAJES = [
    { id: 0, rol: "usuario", texto: "¿Saldo de caja?", aviso: null, pantalla: "el libro mayor · cuenta 1101 Caja" },
    {
        id: 1,
        rol: "asistente",
        texto: "El saldo es **$100**.",
        aviso: null,
        idUso: "55555555-5555-4555-8555-555555555555",
        valoracion: "util",
    },
    { id: 2, rol: "usuario", texto: "¿Y el banco?", aviso: null },
    { id: 3, rol: "asistente", texto: "No alcancé a terminar.", aviso: "Detuviste la respuesta." },
];

/** Doble de localStorage en memoria. */
function almacenFalso(inicial = {}) {
    const datos = new Map(Object.entries(inicial));
    return {
        datos,
        get length() {
            return datos.size;
        },
        key: (i) => [...datos.keys()][i] ?? null,
        getItem: (clave) => (datos.has(clave) ? datos.get(clave) : null),
        setItem: (clave, valor) => void datos.set(clave, String(valor)),
        removeItem: (clave) => void datos.delete(clave),
    };
}

test("claveDeMemoria separa por usuario y empresa, y no existe sin los dos", () => {
    assert.equal(claveDeMemoria("u1", "e1"), "finova:copiloto:v1:u1:e1");
    assert.notEqual(claveDeMemoria("u1", "e1"), claveDeMemoria("u2", "e1"));
    assert.notEqual(claveDeMemoria("u1", "e1"), claveDeMemoria("u1", "e2"));
    assert.equal(claveDeMemoria(null, "e1"), null);
    assert.equal(claveDeMemoria("u1", null), null);
    assert.equal(claveDeMemoria("", "e1"), null);
});

test("serializar y restaurar devuelve los mismos mensajes, con pantalla, id de uso y valoracion", () => {
    const restaurada = restaurarConversacion(serializarConversacion(MENSAJES, AHORA), AHORA);
    assert.deepEqual(restaurada, { guardadoEn: AHORA.toISOString(), mensajes: MENSAJES });
});

test("la conversacion vence a los 7 dias", () => {
    assert.equal(DIAS_DE_MEMORIA, 7);
    const casiVencida = serializarConversacion(MENSAJES, haceDias(6, 23 * 60));
    assert.equal(restaurarConversacion(casiVencida, AHORA)?.mensajes.length, 4);
    const vencida = serializarConversacion(MENSAJES, haceDias(7, 1));
    assert.equal(restaurarConversacion(vencida, AHORA), null);
    // Una fecha futura (reloj cambiado) tampoco se acepta.
    assert.equal(restaurarConversacion(serializarConversacion(MENSAJES, haceDias(-2)), AHORA), null);
});

test("lo que no tiene la forma esperada no se restaura", () => {
    const base = JSON.parse(serializarConversacion(MENSAJES, AHORA));
    const con = (cambios) => JSON.stringify({ ...base, ...cambios });
    for (const basura of [
        null,
        "",
        "{",
        "null",
        "[]",
        con({ v: 2 }),
        con({ guardadoEn: "ayer" }),
        con({ mensajes: "hola" }),
        con({ mensajes: [] }),
        con({ mensajes: [{ id: 0, rol: "sistema", texto: "x", aviso: null }] }),
        con({ mensajes: [{ id: 0, rol: "usuario", texto: 5, aviso: null }] }),
        con({ mensajes: [{ id: "0", rol: "usuario", texto: "x", aviso: null }] }),
        con({ mensajes: [{ id: 0, rol: "usuario", texto: "x", aviso: 7 }] }),
    ]) {
        assert.equal(restaurarConversacion(basura, AHORA), null, String(basura).slice(0, 60));
    }
});

test("los campos opcionales con forma invalida se descartan, no el mensaje", () => {
    const base = JSON.parse(serializarConversacion(MENSAJES, AHORA));
    base.mensajes = [
        { id: 0, rol: "usuario", texto: "x", aviso: null, pantalla: "a<b", idUso: 5, valoracion: "quizas", otro: 1 },
    ];
    assert.deepEqual(restaurarConversacion(JSON.stringify(base), AHORA)?.mensajes, [
        { id: 0, rol: "usuario", texto: "x", aviso: null },
    ]);
});

test("guarda como maximo los ultimos 40 mensajes y 60.000 caracteres", () => {
    const cincuenta = Array.from({ length: 50 }, (_, i) => ({
        id: i,
        rol: i % 2 === 0 ? "usuario" : "asistente",
        texto: `m${i}`,
        aviso: null,
    }));
    const guardados = restaurarConversacion(serializarConversacion(cincuenta, AHORA), AHORA).mensajes;
    assert.equal(guardados.length, MAX_MENSAJES_GUARDADOS);
    assert.equal(guardados[0].texto, "m10");
    assert.equal(guardados.at(-1).texto, "m49");

    const largos = Array.from({ length: 30 }, (_, i) => ({ id: i, rol: "usuario", texto: String(i).padStart(3000, "x"), aviso: null }));
    const recortados = restaurarConversacion(serializarConversacion(largos, AHORA), AHORA).mensajes;
    const total = recortados.reduce((suma, m) => suma + m.texto.length, 0);
    assert.ok(total <= MAX_CARACTERES_GUARDADOS);
    assert.equal(recortados.length, 20);
    assert.equal(recortados.at(-1).id, 29);
});

test("guardarMemoria y leerMemoria usan la clave y no lanzan nunca", () => {
    const almacen = almacenFalso();
    const clave = claveDeMemoria("u1", "e1");
    guardarMemoria(almacen, clave, MENSAJES, AHORA);
    assert.deepEqual(leerMemoria(almacen, clave, AHORA)?.mensajes, MENSAJES);
    // Otro usuario en el mismo navegador no la ve.
    assert.equal(leerMemoria(almacen, claveDeMemoria("u2", "e1"), AHORA), null);

    // Sin almacen o sin clave: en memoria, como antes.
    assert.equal(leerMemoria(null, clave, AHORA), null);
    assert.equal(leerMemoria(almacen, null, AHORA), null);
    assert.doesNotThrow(() => guardarMemoria(null, clave, MENSAJES, AHORA));
    assert.doesNotThrow(() => guardarMemoria(almacen, null, MENSAJES, AHORA));

    // Almacenamiento lleno o bloqueado.
    const roto = {
        length: 0,
        key: () => {
            throw new Error("bloqueado");
        },
        getItem: () => {
            throw new Error("bloqueado");
        },
        setItem: () => {
            throw new Error("QuotaExceededError");
        },
        removeItem: () => {
            throw new Error("bloqueado");
        },
    };
    assert.doesNotThrow(() => guardarMemoria(roto, clave, MENSAJES, AHORA));
    assert.equal(leerMemoria(roto, clave, AHORA), null);
    assert.doesNotThrow(() => olvidarTodo(roto));
    assert.doesNotThrow(() => olvidarTodo(null));
});

test("guardar una conversacion vacia borra la clave", () => {
    const almacen = almacenFalso();
    const clave = claveDeMemoria("u1", "e1");
    guardarMemoria(almacen, clave, MENSAJES, AHORA);
    guardarMemoria(almacen, clave, [], AHORA);
    assert.equal(almacen.datos.has(clave), false);
});

test("leerMemoria borra lo vencido o roto que encuentra", () => {
    const clave = claveDeMemoria("u1", "e1");
    const conBasura = almacenFalso({ [clave]: "{" });
    assert.equal(leerMemoria(conBasura, clave, AHORA), null);
    assert.equal(conBasura.datos.has(clave), false);

    const vencido = almacenFalso({ [clave]: serializarConversacion(MENSAJES, haceDias(8)) });
    assert.equal(leerMemoria(vencido, clave, AHORA), null);
    assert.equal(vencido.datos.has(clave), false);
});

test("olvidarTodo borra las conversaciones de todos los usuarios y nada mas", () => {
    const almacen = almacenFalso({
        "finova:copiloto:v1:u1:e1": "a",
        "finova:copiloto:v1:u2:e9": "b",
        tema: "oscuro",
        "otra:clave": "c",
    });
    olvidarTodo(almacen);
    assert.deepEqual([...almacen.datos.keys()].sort(), ["otra:clave", "tema"]);
});
