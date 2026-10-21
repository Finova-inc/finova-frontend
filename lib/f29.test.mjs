// Check de las piezas puras del F29, sin dependencias: `npm test` corre
// node --test, y Node quita los tipos de f29.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    aPesosEnteros,
    codigosDeLinea,
    desplazarMes,
    documentosDeAlerta,
    documentosDeLinea,
    folioValido,
    periodoPorDefecto,
    reajustar,
} from "./f29.ts";

test("periodoPorDefecto: el F29 que se declara es el del mes anterior", () => {
    assert.equal(periodoPorDefecto("2026-10-21"), "2026-09");
    assert.equal(periodoPorDefecto("2027-01-05"), "2026-12");
});

test("desplazarMes: cruza el cambio de año en los dos sentidos", () => {
    assert.equal(desplazarMes("2026-12", 1), "2027-01");
    assert.equal(desplazarMes("2026-01", -1), "2025-12");
    assert.equal(desplazarMes("2026-09", 0), "2026-09");
});

test("aPesosEnteros: acepta lo que se escribe con puntos y signo, rechaza decimales", () => {
    assert.equal(aPesosEnteros("$ 1.234.567"), "1234567");
    assert.equal(aPesosEnteros("0050000"), "50000");
    assert.equal(aPesosEnteros("   "), "");
    assert.equal(aPesosEnteros("12,5"), null);
    assert.equal(aPesosEnteros("-100"), null);
    assert.equal(aPesosEnteros("abc"), null);
});

test("reajustar: igual que el backend (art. 27 DL 825), redondeado al peso", () => {
    // 100.000 x 69.889 / 69.751 = 100.197,84
    assert.equal(reajustar("100000", "69751", "69889"), "100198");
    assert.equal(reajustar("100000", "0", "69889"), null);
    assert.equal(reajustar("100000", "", "69889"), null);
});

test("codigosDeLinea: cantidad y monto, o solo el monto", () => {
    assert.equal(codigosDeLinea({ codigo_cantidad: 503, codigo_monto: 502 }), "503 · 502");
    assert.equal(codigosDeLinea({ codigo_cantidad: null, codigo_monto: 151 }), "151");
});

test("documentosDeLinea: cada línea lleva a su libro y tipo; el remanente a ninguno", () => {
    assert.deepEqual(documentosDeLinea("facturas_emitidas", "2026-09"), { libro: "ventas", periodo: "2026-09", tipo: "33" });
    assert.deepEqual(documentosDeLinea("retencion_honorarios", "2026-09"), { libro: "honorarios_recibidas", periodo: "2026-09" });
    assert.equal(documentosDeLinea("remanente_anterior", "2026-09"), null);
});

test("documentosDeAlerta: arma el filtro con lo que trae la alerta", () => {
    assert.deepEqual(
        documentosDeAlerta({ codigo: "difiere_compras", nivel: "critico", mensaje: "", libro: "compras", cuadratura: "difiere" }, "2026-09"),
        { libro: "compras", periodo: "2026-09", cuadratura: "difiere" },
    );
    assert.deepEqual(
        documentosDeAlerta({ codigo: "factura_de_compra", nivel: "critico", mensaje: "", libro: "compras", tipo_dte: 46 }, "2026-09"),
        { libro: "compras", periodo: "2026-09", tipo: "46" },
    );
    assert.equal(documentosDeAlerta({ codigo: "conciliacion", nivel: "aviso", mensaje: "" }, "2026-09"), null);
});

test("folioValido: solo dígitos", () => {
    assert.equal(folioValido("8123456789"), true);
    assert.equal(folioValido(" 123 "), true);
    assert.equal(folioValido("F-123"), false);
    assert.equal(folioValido(""), false);
});
