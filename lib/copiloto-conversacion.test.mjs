// La conversacion del copiloto vive fuera de los componentes: cambiar de pantalla
// no corta la respuesta ni pierde la pregunta.
import assert from "node:assert/strict";
import { test } from "node:test";
import { AVISO_INTERRUMPIDA, crearConversaciones } from "./copiloto-conversacion.ts";
import { claveDeMemoria, leerMemoria } from "./copiloto-memoria.ts";

const CLAVE = claveDeMemoria("usuario", "empresa");
const AHORA = new Date("2026-11-26T12:00:00Z");

function almacenFalso() {
    const datos = new Map();
    return {
        getItem: (k) => datos.get(k) ?? null,
        setItem: (k, v) => datos.set(k, v),
        removeItem: (k) => datos.delete(k),
        key: (i) => [...datos.keys()][i] ?? null,
        get length() {
            return datos.size;
        },
    };
}

/** Un backend que responde cuando el test lo decide, y se corta si abortan. */
function backendFalso() {
    let flujo;
    const pedir = async (_url, opciones) => {
        const cuerpo = new ReadableStream({
            start(c) {
                flujo = c;
                opciones.signal.addEventListener("abort", () => c.error(new Error("abortado")));
            },
        });
        return new Response(cuerpo);
    };
    const mandar = (evento) => flujo.enqueue(new TextEncoder().encode(`data: ${JSON.stringify(evento)}\n\n`));
    return { pedir, mandar, cerrar: () => flujo.close() };
}

const nuevas = (almacen, pedir) => crearConversaciones({ almacen: () => almacen, pedir, ahora: () => AHORA });
const pasarTurno = () => new Promise((listo) => setImmediate(listo));
const guardados = (almacen) => leerMemoria(almacen, CLAVE, AHORA)?.mensajes ?? [];

test("la respuesta termina y se guarda aunque ya nadie la este mirando", async () => {
    const almacen = almacenFalso();
    const backend = backendFalso();
    const conversaciones = nuevas(almacen, backend.pedir);
    const dejarDeMirar = conversaciones.suscribir(() => {});

    const envio = conversaciones.enviar(CLAVE, { texto: "¿Saldo de caja?" });
    // Se guarda al enviar: si se recarga ahora, la pregunta no desaparece.
    assert.deepEqual(
        guardados(almacen).map((m) => [m.texto, m.aviso]),
        [["¿Saldo de caja?", null], ["", AVISO_INTERRUMPIDA]],
    );

    dejarDeMirar(); // la persona cambio de modulo
    await pasarTurno();
    backend.mandar({ tipo: "texto", texto: "Son $100." });
    backend.mandar({ tipo: "fin", motivo: "completa", aviso: null, tokens_hoy: 7, tokens_pregunta: 7 });
    backend.cerrar();
    assert.equal(await envio, "terminada");

    const conversacion = conversaciones.leer(CLAVE);
    assert.equal(conversacion.mensajes[1].texto, "Son $100.");
    assert.equal(conversacion.mensajes[1].estado, "listo");
    assert.equal(conversacion.tokensHoy, 7);
    assert.deepEqual(guardados(almacen).map((m) => m.texto), ["¿Saldo de caja?", "Son $100."]);
});

test("mientras responde no acepta otra pregunta; Detener conserva lo que habia", async () => {
    const almacen = almacenFalso();
    const backend = backendFalso();
    const conversaciones = nuevas(almacen, backend.pedir);

    const envio = conversaciones.enviar(CLAVE, { texto: "Primera" });
    assert.equal(await conversaciones.enviar(CLAVE, { texto: "Segunda" }), "ocupado");
    await pasarTurno();
    conversaciones.detener(CLAVE);
    assert.equal(await envio, "detenida");
    assert.equal(conversaciones.leer(CLAVE).mensajes.length, 2);
    assert.equal(guardados(almacen)[1].aviso, "Detuviste la respuesta.");
});

test("cortarTodas y vaciar abortan sin volver a escribir lo borrado", async () => {
    for (const borrar of [(c) => c.cortarTodas(), (c) => c.vaciar(CLAVE)]) {
        const almacen = almacenFalso();
        const backend = backendFalso();
        const conversaciones = nuevas(almacen, backend.pedir);

        const envio = conversaciones.enviar(CLAVE, { texto: "Hola" });
        await pasarTurno();
        borrar(conversaciones);
        almacen.removeItem(CLAVE); // como al cerrar sesion
        assert.equal(await envio, "detenida");
        assert.equal(almacen.getItem(CLAVE), null);
        assert.equal(conversaciones.leer(CLAVE).mensajes.length, 0);
    }
});

test("un 401 avisa que la sesion expiro y un error del servidor queda en el mensaje", async () => {
    const expirada = nuevas(almacenFalso(), async () => new Response("{}", { status: 401 }));
    assert.equal(await expirada.enviar(CLAVE, { texto: "Hola" }), "sesion-expirada");

    const caida = nuevas(almacenFalso(), async () => {
        throw new Error("sin red");
    });
    assert.equal(await caida.enviar(CLAVE, { texto: "Hola" }), "terminada");
    assert.equal(caida.leer(CLAVE).mensajes[1].estado, "error");
});
