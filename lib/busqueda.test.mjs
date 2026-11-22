// Barra de búsqueda: enlaces de cada resultado y recientes en localStorage.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    MAX_RECIENTES,
    claveRecientes,
    comoResultados,
    guardarReciente,
    hrefDe,
    leerRecientes,
    olvidarRecientes,
} from "./busqueda.ts";

const ID = "aaaaaaaa-1111-4111-8111-111111111111";
const resultado = (n, tipo = "asiento") => ({
    tipo,
    id: `aaaaaaaa-1111-4111-8111-${String(n).padStart(12, "0")}`,
    titulo: `Contabilidad avanzada ${n}`,
    detalle: "Asiento T-1",
    fecha: "2026-11-03",
});

function almacenEnMemoria() {
    const datos = new Map();
    return {
        getItem: (k) => (datos.has(k) ? datos.get(k) : null),
        setItem: (k, v) => datos.set(k, String(v)),
        removeItem: (k) => datos.delete(k),
        key: (i) => [...datos.keys()][i] ?? null,
        get length() {
            return datos.size;
        },
    };
}

test("hrefDe lleva cada tipo a su pantalla", () => {
    assert.equal(hrefDe({ tipo: "asiento", id: ID }), `/dashboard/core-contable/${ID}`);
    assert.equal(hrefDe({ tipo: "borrador", id: ID }), `/dashboard/core-contable/borradores/${ID}`);
    assert.equal(hrefDe({ tipo: "tercero", id: ID }), `/dashboard/terceros/${ID}`);
    assert.equal(hrefDe({ tipo: "cuenta", id: ID }), `/dashboard/libro-mayor?cuenta=${ID}`);
    assert.equal(hrefDe({ tipo: "documento", id: ID }), `/dashboard/documentos/${ID}`);
});

test("comoResultados descarta lo que no tiene la forma esperada", () => {
    const bueno = resultado(1);
    assert.deepEqual(comoResultados([bueno, { ...bueno, tipo: "otro" }, { ...bueno, id: "../x" }, null, "x"]), [bueno]);
    assert.deepEqual(comoResultados({ no: "lista" }), []);
});

test("guardarReciente pone primero, no repite y guarda hasta el maximo", () => {
    const almacen = almacenEnMemoria();
    const clave = claveRecientes("u1", "e1");
    for (let i = 1; i <= MAX_RECIENTES + 2; i++) guardarReciente(almacen, clave, resultado(i));
    guardarReciente(almacen, clave, resultado(5));
    const lista = leerRecientes(almacen, clave);
    assert.equal(lista.length, MAX_RECIENTES);
    assert.equal(lista[0].titulo, "Contabilidad avanzada 5");
    assert.equal(lista.filter((r) => r.titulo === "Contabilidad avanzada 5").length, 1);
});

test("los recientes son por usuario y empresa, y se borran al cerrar sesion", () => {
    const almacen = almacenEnMemoria();
    guardarReciente(almacen, claveRecientes("u1", "e1"), resultado(1));
    almacen.setItem("otra-app", "x");
    assert.deepEqual(leerRecientes(almacen, claveRecientes("u2", "e1")), []);
    assert.deepEqual(leerRecientes(almacen, claveRecientes("u1", "e2")), []);
    assert.equal(claveRecientes(null, "e1"), null);

    olvidarRecientes(almacen);
    assert.deepEqual(leerRecientes(almacen, claveRecientes("u1", "e1")), []);
    assert.equal(almacen.getItem("otra-app"), "x");
});

test("nada lanza con lo guardado roto o el almacenamiento bloqueado", () => {
    const almacen = almacenEnMemoria();
    almacen.setItem(claveRecientes("u1", "e1"), "{roto");
    assert.deepEqual(leerRecientes(almacen, claveRecientes("u1", "e1")), []);
    const bloqueado = { ...almacenEnMemoria(), setItem: () => { throw new Error("lleno"); } };
    assert.equal(guardarReciente(bloqueado, claveRecientes("u1", "e1"), resultado(1)).length, 1);
    assert.deepEqual(leerRecientes(null, "x"), []);
});
