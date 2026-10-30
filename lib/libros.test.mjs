import assert from "node:assert/strict";
import test from "node:test";
import { balanceACsv, mayorACsv } from "./libros.ts";

const columnas = (valor) => ({ debitos: valor, creditos: valor, deudor: valor, acreedor: "0.0000", activo: valor, pasivo: "0.0000", perdidas: "0.0000", ganancias: "0.0000" });

const balance = {
    desde: "2026-01-01",
    hasta: "2026-09-30",
    filas: [{ id_cuenta: "a", codigo: "1101001", nombre: "Caja", id_tipo_cuenta: 1, ...columnas("1500.0000") }],
    totales: columnas("1500.0000"),
    resultado: { utilidad: "0.0000", perdida: "0.0000" },
    sumas_iguales: columnas("1500.0000"),
    cuadra: { sumas: true, saldos: true, inventario_resultados: true },
};

test("el balance de comprobación exporta 4 columnas y el tributario 8", () => {
    const cuatro = balanceACsv(balance, false).split("\r\n");
    const ocho = balanceACsv(balance, true).split("\r\n");
    assert.equal(cuatro[1], "Código;Cuenta;Débitos;Créditos;Saldo deudor;Saldo acreedor");
    assert.equal(ocho[1].split(";").length, 10);
    assert.equal(cuatro[2], "1101001;Caja;1500;1500;1500;0");
});

test("el mayor agrega el detalle analítico solo si se pide y la cuenta lo lleva", () => {
    const mayor = {
        cuenta: { id_cuenta: "a", codigo: "1103001", nombre: "Clientes", naturaleza: "D", analitica: true },
        desde: "2026-01-01",
        hasta: "2026-09-30",
        saldo_anterior: "0.0000",
        movimientos: [],
        totales: { total_debe: "0.0000", total_haber: "0.0000", saldo_final: "0.0000" },
        analitico: [{ id_tercero: "t", rut: "76.123.456-7", razon_social: "Cliente SpA", saldo_anterior: "0.0000", debe: "1000.0000", haber: "0.0000", saldo: "1000.0000" }],
    };
    assert.ok(!mayorACsv(mayor, false).includes("Detalle analítico"));
    assert.ok(mayorACsv(mayor, true).includes("1103001;76.123.456-7;Cliente SpA;0;1000;0;1000"));
    assert.ok(!mayorACsv({ ...mayor, analitico: null }, true).includes("Detalle analítico"));
});
