// Check de las piezas puras del plan de cuentas, sin dependencias:
// `npm test` corre node --test, y Node 24 quita los tipos de planCuentas.ts
// al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { planACsv, problemaDePropia, resumenConfiguracion } from "./planCuentas.ts";

const cuenta = (codigo, nombre, padre, extra = {}) => ({
    id_cuenta: codigo,
    id_empresa: "empresa",
    codigo,
    nombre,
    id_tipo_cuenta: Number(codigo[0]),
    is_active: true,
    id_cuenta_padre: padre,
    acepta_movimiento: codigo.length === 7,
    codigo_sii: null,
    tiene_movimientos: false,
    ...extra,
});

test("planACsv: encabezado, orden jerárquico y nivel de cada fila", () => {
    const csv = planACsv([
        cuenta("1", "Activos", null),
        cuenta("1101001", "Caja", "1101", { tiene_movimientos: true, codigo_sii: "1.01.10" }),
        cuenta("11", "Activos corrientes", "1"),
        cuenta("1101", "Efectivo y equivalentes al efectivo", "11"),
        cuenta("1101002", "Fondo fijo", "1101", { is_active: false }),
    ]);

    assert.deepEqual(csv.split("\r\n"), [
        "Código;Nombre;Nivel;Clase;Código SII;Estado;Con asientos",
        "1;Activos;Clase;Activos;;Activa;No",
        "11;Activos corrientes;Grupo;Activos;;Activa;No",
        "1101;Efectivo y equivalentes al efectivo;Rubro;Activos;;Activa;No",
        "1101001;Caja;Cuenta;Activos;1.01.10;Activa;Sí",
        "1101002;Fondo fijo;Cuenta;Activos;;Inactiva;No",
    ]);
});

test("planACsv: una cuenta suelta de un plan plano es Cuenta, no Clase", () => {
    assert.equal(planACsv([cuenta("1101001", "Caja", null)]).split("\r\n")[1], "1101001;Caja;Cuenta;Activos;;Activa;No");
});

// Un nombre como =HIPERVINCULO(...) se ejecutaría al abrir el archivo en Excel.
test("planACsv: comillas donde hace falta y nada que Excel lea como fórmula", () => {
    const [, fila] = planACsv([cuenta("1101001", '=HIPERVINCULO("x");"y"', null)]).split("\r\n");

    assert.ok(fila.startsWith(`1101001;"'=HIPERVINCULO(""x"");""y""";`), fila);
});

const PLANTILLA = [
    { codigo: "1", nombre: "Activos", id_tipo_cuenta: 1, acepta_movimiento: false },
    { codigo: "11", nombre: "Activos corrientes", id_tipo_cuenta: 1, acepta_movimiento: false, codigoPadre: "1" },
    { codigo: "1101", nombre: "Efectivo", id_tipo_cuenta: 1, acepta_movimiento: false, codigoPadre: "11" },
    { codigo: "1101001", nombre: "Caja", id_tipo_cuenta: 1, codigoPadre: "1101" },
    { codigo: "1101002", nombre: "Fondo fijo", id_tipo_cuenta: 1, codigoPadre: "1101" },
    { codigo: "1103", nombre: "Deudores", id_tipo_cuenta: 1, acepta_movimiento: false, codigoPadre: "11" },
    { codigo: "1103001", nombre: "Clientes", id_tipo_cuenta: 1, codigoPadre: "1103" },
];

test("resumenConfiguracion: cada cuenta marcada trae las agrupaciones que faltan", () => {
    assert.deepEqual(resumenConfiguracion(PLANTILLA, {}, ["1101001", "1103001"], []), { cuentas: 2, agrupaciones: 4 });
});

test("resumenConfiguracion: no cuenta lo que la empresa ya tiene", () => {
    const provistas = { 1: "a", 11: "b", 1101: "c", 1101001: "d" };

    assert.deepEqual(resumenConfiguracion(PLANTILLA, provistas, ["1101002", "1103001"], []), {
        cuentas: 2,
        agrupaciones: 1,
    });
});

test("resumenConfiguracion: una cuenta propia trae su rubro", () => {
    assert.deepEqual(resumenConfiguracion(PLANTILLA, {}, [], ["1103"]), { cuentas: 0, agrupaciones: 3 });
});

// Como planificarPlantilla en el backend: el plan plano gana sus agrupaciones aunque no se marque nada.
test("resumenConfiguracion: completa la estructura de las cuentas que la empresa ya tiene", () => {
    assert.deepEqual(resumenConfiguracion(PLANTILLA, { 1101001: "caja" }, [], []), { cuentas: 0, agrupaciones: 3 });
});

const ocupados = new Map([
    ["1101004", '"Depósitos a plazo" del plan base'],
    ["1101005", 'tu cuenta "Banco Estado"'],
]);
const propia = (codigo, nombre = "Banco Santander") => ({ codigo, nombre, codigoPadre: "1101" });

test("problemaDePropia: acepta un código libre dentro de su rubro", () => {
    assert.equal(problemaDePropia(propia("1101006"), ocupados, []), null);
});

test("problemaDePropia: rechaza lo mismo que el backend, antes de guardar", () => {
    assert.match(problemaDePropia(propia("11-01"), ocupados, []), /solo dígitos/);
    assert.match(problemaDePropia(propia("9006"), ocupados, []), /empezar con 1101/);
    assert.match(problemaDePropia(propia("1101"), ocupados, []), /empezar con 1101/);
    assert.match(problemaDePropia(propia("1101004"), ocupados, []), /Depósitos a plazo/);
    assert.match(problemaDePropia(propia("1101005"), ocupados, []), /Banco Estado/);
    assert.match(problemaDePropia(propia("1101006"), ocupados, ["1101006"]), /se repite/);
    assert.match(problemaDePropia(propia("1101006", " B "), ocupados, []), /3 caracteres/);
});
