// Logica del grafico «Ingresos y gastos»: mes por defecto, seleccion, acumulado y signo.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    acumulado,
    alternarSeleccion,
    mesActivo,
    mesPorDefecto,
    pesosConSigno,
    resultadoConSigno,
    tieneMovimiento,
    tonoDelResultado,
} from "./resumen-mensual.ts";

const mes = (m, ingresos, gastos) => ({ mes: m, ingresos, gastos, resultado: String(Number(ingresos) - Number(gastos)) });
const AÑO = [
    mes(1, "0", "0"),
    mes(2, "1200000.0000", "800000.0000"),
    mes(3, "0", "0"),
    mes(4, "15400000", "15600000"),
    mes(5, "0.0000", "0.0000"),
];

test("pesosConSigno: negativos, decimales de la API e invalidos", () => {
    assert.equal(pesosConSigno("-200000"), BigInt(-200000));
    assert.equal(pesosConSigno("1250000.0000"), BigInt(1250000));
    assert.equal(pesosConSigno("-0.5"), BigInt(0));
    assert.equal(pesosConSigno(""), BigInt(0));
    assert.equal(pesosConSigno("abc"), BigInt(0));
    assert.equal(pesosConSigno(undefined), BigInt(0));
    // mas alla de 2^53: con Number se perderia
    assert.equal(pesosConSigno("9007199254740993"), BigInt("9007199254740993"));
});

test("tieneMovimiento: ceros con decimales no cuentan; un negativo si", () => {
    assert.equal(tieneMovimiento({ ingresos: "0.0000", gastos: "0" }), false);
    assert.equal(tieneMovimiento({ ingresos: "0", gastos: "10" }), true);
    assert.equal(tieneMovimiento({ ingresos: "-5", gastos: "0" }), true);
});

test("mesPorDefecto: el ultimo con movimiento, aunque el mes en curso este vacio", () => {
    assert.equal(mesPorDefecto(AÑO), 4);
    assert.equal(mesPorDefecto([mes(1, "0", "0"), mes(2, "0", "0")]), null);
    assert.equal(mesPorDefecto([]), null);
});

test("mesActivo: la seleccion manda, cualquier mes sirve (tambien uno vacio)", () => {
    assert.equal(mesActivo(AÑO, null), 4);
    assert.equal(mesActivo(AÑO, 2), 2);
    assert.equal(mesActivo(AÑO, 5), 5);
});

test("mesActivo: una seleccion que no esta en los datos cae al mes por defecto", () => {
    assert.equal(mesActivo(AÑO, 11), 4);
});

test("alternarSeleccion: otro mes lo elige; el mismo vuelve al de por defecto", () => {
    assert.equal(alternarSeleccion(4, 2), 2);
    assert.equal(alternarSeleccion(2, 2), null);
    // sin seleccion manual el activo es el de por defecto: clic en el vuelve a "por defecto"
    assert.equal(alternarSeleccion(4, 4), null);
    assert.equal(alternarSeleccion(2, 5), 5);
});

test("tonoDelResultado y signo: utilidad, perdida y cero", () => {
    assert.equal(tonoDelResultado("1000"), "utilidad");
    assert.equal(tonoDelResultado("-200000"), "perdida");
    assert.equal(tonoDelResultado("0.0000"), "neutro");
    assert.equal(resultadoConSigno("1250000"), "+$1.250.000");
    assert.equal(resultadoConSigno("-200000"), "-$200.000");
    assert.equal(resultadoConSigno("0"), "$0");
});

test("acumulado: suma exacta de enero al ultimo mes, con negativos", () => {
    const a = acumulado(AÑO);
    assert.equal(a.ingresos, "16600000");
    assert.equal(a.gastos, "16400000");
    assert.equal(a.resultado, "200000"); // (1.200.000 - 800.000) + (15.400.000 - 15.600.000)
    assert.deepEqual(acumulado([]), { ingresos: "0", gastos: "0", resultado: "0" });
});

test("acumulado: las fracciones de peso se truncan, como en decimal.ts", () => {
    const a = acumulado([mes(1, "0.1000", "0"), mes(2, "0.2000", "0")]);
    assert.equal(a.ingresos, "0");
});
