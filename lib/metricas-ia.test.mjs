// Costos de IA (pagina interna): formatos, presupuesto y simulador, con BigInt.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    COSTO_ESTIMADO_POR_PREGUNTA_MICRO_USD,
    estadoPresupuesto,
    formatearUsd,
    leerPrecio,
    leerUsuarios,
    microUsdAPesos,
    netoSinIva,
    porcentaje,
    PRECIO_PLAN_ESTUDIO_CLP,
    PREGUNTAS_POR_PERFIL,
    preguntasMaximasAlMes,
    simular,
} from "./metricas-ia.ts";

test("simular: 10 usuarios de uso medio en el plan Estudio", () => {
    assert.deepEqual(
        simular({
            usuarios: 10,
            preguntasPorUsuario: PREGUNTAS_POR_PERFIL.medio,
            costoPorPreguntaMicroUsd: COSTO_ESTIMADO_POR_PREGUNTA_MICRO_USD,
            dolar: "950.00",
            precioPorUsuarioClp: PRECIO_PLAN_ESTUDIO_CLP,
        }),
        { costoIaClp: 5330n, ingresoNetoClp: 419330n, porcentajeIa: "1,3%" },
    );
});

test("netoSinIva descuenta el 19% y redondea al peso", () => {
    assert.equal(netoSinIva(49900n), 41933n);
    assert.equal(netoSinIva(0n), 0n);
});

test("microUsdAPesos usa el mismo redondeo que el backend", () => {
    assert.equal(microUsdAPesos(5_610_000n, "950.00"), 5330n);
    assert.equal(microUsdAPesos(1_625n, "945.32"), 2n);
    assert.equal(microUsdAPesos(0n, "945.32"), 0n);
});

test("formatearUsd: 2 decimales desde un centavo, 4 bajo eso", () => {
    assert.equal(formatearUsd("4200000"), "US$4,20");
    assert.equal(formatearUsd("1700"), "US$0,0017");
    assert.equal(formatearUsd("10000"), "US$0,01");
    assert.equal(formatearUsd("0"), "US$0,00");
    assert.equal(formatearUsd("1234567890"), "US$1.234,57");
});

test("porcentaje con un decimal, y guion si no hay total", () => {
    assert.equal(porcentaje(5330n, 419330n), "1,3%");
    assert.equal(porcentaje(1n, 0n), "—");
    assert.equal(porcentaje(1n, 1n), "100,0%");
});

test("estadoPresupuesto compara la proyeccion con el presupuesto", () => {
    assert.equal(estadoPresupuesto("9800000", "20000000"), "dentro");
    assert.equal(estadoPresupuesto("20000000", "20000000"), "dentro");
    assert.equal(estadoPresupuesto("25000000", "20000000"), "excedido");
    assert.equal(estadoPresupuesto("1", null), "sin-presupuesto");
});

test("preguntasMaximasAlMes: el tope diario lleno los 30 dias", () => {
    assert.equal(preguntasMaximasAlMes(200000, 13000), 450);
    assert.equal(preguntasMaximasAlMes(200000, 0), 450);
});

test("leerUsuarios acepta enteros de 1 a 10.000", () => {
    assert.equal(leerUsuarios("10"), 10);
    assert.equal(leerUsuarios(" 1.000 "), 1000);
    for (const malo of ["", "0", "10001", "2,5", "-3", "abc"]) assert.equal(leerUsuarios(malo), null);
});

test("leerPrecio acepta pesos enteros con o sin puntos de miles", () => {
    assert.equal(leerPrecio("49900"), 49900n);
    assert.equal(leerPrecio("$49.900"), 49900n);
    for (const malo of ["", "0", "49900,5", "abc", "100000000"]) assert.equal(leerPrecio(malo), null);
});
