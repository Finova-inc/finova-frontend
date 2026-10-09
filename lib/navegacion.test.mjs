// Check de a dónde vuelve el enlace "← Volver", sin navegador: el historial
// se pasa como una lista de rutas y la pantalla actual es siempre la última.
import assert from "node:assert/strict";
import { test } from "node:test";
import { pasosHastaLaPantallaAnterior } from "./navegacion.ts";

const PANEL = "/dashboard";
const DIARIO = "/dashboard/core-contable";
const PLAN = "/dashboard/plan-cuentas";
const PERIODOS = "/dashboard/periodos";

/** Pasos desde la última entrada del historial. */
const pasos = (historial, porDefecto = PANEL) =>
    pasosHastaLaPantallaAnterior(historial, historial.length - 1, porDefecto);

test("vuelve a la pantalla desde la que se llegó", () => {
    assert.equal(pasos([PANEL, PERIODOS]), 1);
    // Períodos -> "Ver asientos" -> Libro diario: volver regresa a Períodos.
    assert.equal(pasos([PANEL, PERIODOS, DIARIO]), 1);
});

test("sin pantalla anterior del panel, no retrocede (se usa el destino fijo)", () => {
    // Enlace abierto en una pestaña nueva.
    assert.equal(pasos([PERIODOS]), 0);
    // Se llegó desde la página pública o el inicio de sesión.
    assert.equal(pasos(["/", PERIODOS]), 0);
    assert.equal(pasos(["/login", PERIODOS]), 0);
    // Una ruta que solo empieza parecido no es del panel.
    assert.equal(pasos(["/dashboard-viejo", PERIODOS]), 0);
    // Una entrada ilegible corta la búsqueda en vez de adivinar.
    assert.equal(pasos([PANEL, null, PERIODOS]), 0);
});

test("salta los otros estados de la misma pantalla: sale de ella de un paso", () => {
    // Tres filtros aplicados en el libro diario: tres entradas con la misma ruta.
    assert.equal(pasos([PANEL, DIARIO, DIARIO, DIARIO]), 3);
});

test("desde un detalle vuelve a la lista, saltando el formulario ya enviado", () => {
    const detalle = `${DIARIO}/7f3c`;
    // Libro diario -> Nuevo asiento -> contabilizar -> detalle del asiento.
    assert.equal(pasos([PANEL, DIARIO, `${DIARIO}/nuevo`, detalle], DIARIO), 2);
    // Nuevo -> guardar borrador -> borrador -> contabilizar -> detalle.
    assert.equal(pasos([DIARIO, `${DIARIO}/nuevo`, `${DIARIO}/borradores/9a1`, detalle], DIARIO), 3);
    // De un asiento a su reversa: volver lleva a la lista, no al otro detalle.
    assert.equal(pasos([DIARIO, `${DIARIO}/aaa`, `${DIARIO}/bbb`], DIARIO), 2);
});

test("desde un detalle vuelve a la pantalla de otra sección que lo abrió", () => {
    // Libro mayor -> comprobante: volver regresa al libro mayor.
    assert.equal(pasos([PANEL, "/dashboard/libro-mayor", `${DIARIO}/7f3c`], DIARIO), 1);
});

test("una pantalla de primer nivel salta sus propios formularios y detalles", () => {
    // Plan -> Configurar -> guardar -> Plan: volver no regresa al configurador.
    assert.equal(pasos([PANEL, PLAN, `${PLAN}/configurar`, PLAN]), 3);
    // Libro diario -> detalle -> Libro diario (por el menú): vuelve al panel.
    assert.equal(pasos([PANEL, DIARIO, `${DIARIO}/7f3c`, DIARIO]), 3);
});

test("un formulario vuelve a la pantalla que lo abrió, aunque sea de otra sección", () => {
    // Formulario de asiento -> "Ver períodos" -> Períodos: volver regresa al formulario.
    assert.equal(pasos([DIARIO, `${DIARIO}/nuevo`, PERIODOS]), 1);
});

test("si todo el historial es de la misma sección, no retrocede", () => {
    assert.equal(pasos([DIARIO, `${DIARIO}/nuevo`, DIARIO]), 0);
    assert.equal(pasos([`${DIARIO}/nuevo`, `${DIARIO}/7f3c`], DIARIO), 0);
});
