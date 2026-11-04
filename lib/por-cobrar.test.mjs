import assert from "node:assert/strict";
import { test } from "node:test";
import { dejaPorCobrarNegativo, proyectarPorCobrar, saldoConSigno } from "./por-cobrar.ts";

const CUENTAS = [
    { id_cuenta: "caja", codigo: "1101001" },
    { id_cuenta: "clientes", codigo: "1103001" },
    { id_cuenta: "ventas", codigo: "4101001" },
];

test("saldoConSigno lee el signo de la API", () => {
    assert.equal(saldoConSigno("300.0000"), BigInt(300));
    assert.equal(saldoConSigno("-100.0000"), BigInt(-100));
    assert.equal(saldoConSigno("0.0000"), BigInt(0));
    assert.equal(saldoConSigno(null), null);
    assert.equal(saldoConSigno("abc"), null);
});

test("un cobro sin venta previa (Caja a Clientes con saldo cero) deja Por cobrar en negativo", () => {
    const cobro = [
        { id_cuenta: "caja", debe: "100", haber: "" },
        { id_cuenta: "clientes", debe: "", haber: "100" },
    ];
    const p = proyectarPorCobrar("0.0000", cobro, CUENTAS);
    assert.deepEqual(p, { proyectado: BigInt(-100), cambio: BigInt(-100) });
    assert.equal(dejaPorCobrarNegativo(p), true);
});

test("un cobro con venta previa que lo cubre no avisa", () => {
    const cobro = [
        { id_cuenta: "caja", debe: "100", haber: "" },
        { id_cuenta: "clientes", debe: "", haber: "100" },
    ];
    assert.equal(dejaPorCobrarNegativo(proyectarPorCobrar("500.0000", cobro, CUENTAS)), false);
    assert.equal(dejaPorCobrarNegativo(proyectarPorCobrar("100.0000", cobro, CUENTAS)), false); // queda en cero
});

test("una venta (Clientes al debe) nunca avisa, aunque el saldo siga negativo", () => {
    const venta = [
        { id_cuenta: "clientes", debe: "50", haber: "" },
        { id_cuenta: "ventas", debe: "", haber: "50" },
    ];
    const p = proyectarPorCobrar("-100.0000", venta, CUENTAS);
    assert.equal(p?.proyectado, BigInt(-50));
    assert.equal(dejaPorCobrarNegativo(p), false);
});

test("un asiento que no toca clientes, o sin saldo conocido, no proyecta nada", () => {
    const otro = [
        { id_cuenta: "caja", debe: "100", haber: "" },
        { id_cuenta: "ventas", debe: "", haber: "100" },
    ];
    assert.equal(proyectarPorCobrar("0.0000", otro, CUENTAS), null);
    assert.equal(proyectarPorCobrar(null, otro, CUENTAS), null);
    assert.equal(dejaPorCobrarNegativo(null), false);
});
