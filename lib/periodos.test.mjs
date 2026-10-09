// Check de las reglas de calendario de los períodos, sin dependencias:
// `npm test` corre node --test, y Node quita los tipos de periodos.ts al
// importarlo. "Hoy" va fijo en cada caso: nada depende del reloj.
import assert from "node:assert/strict";
import { test } from "node:test";
import { aniosDelSelector, esMesFuturo, mesesDelEjercicio, ultimoDiaDelMes } from "./periodos.ts";

const HOY = "2026-10-09";
const periodo = (anio, mes, estado = "abierto") => ({ anio, mes, estado });

test("esMesFuturo: el corte es por mes, y el mes en curso no es futuro", () => {
    assert.equal(esMesFuturo({ anio: 2026, mes: 11 }, HOY), true);
    assert.equal(esMesFuturo({ anio: 2027, mes: 1 }, HOY), true);
    assert.equal(esMesFuturo({ anio: 2026, mes: 10 }, HOY), false);
    assert.equal(esMesFuturo({ anio: 2026, mes: 9 }, HOY), false);
    assert.equal(esMesFuturo({ anio: 2025, mes: 12 }, HOY), false);
    // Desde su primer día el mes ya se puede abrir; el día anterior, no.
    assert.equal(esMesFuturo({ anio: 2026, mes: 11 }, "2026-11-01"), false);
    assert.equal(esMesFuturo({ anio: 2026, mes: 11 }, "2026-10-31"), true);
});

test("ultimoDiaDelMes: febrero bisiesto y diciembre", () => {
    assert.equal(ultimoDiaDelMes(2024, 2), "2024-02-29");
    assert.equal(ultimoDiaDelMes(2026, 2), "2026-02-28");
    assert.equal(ultimoDiaDelMes(2026, 12), "2026-12-31");
});

test("mesesDelEjercicio: año en curso, con meses pasados, actual y futuros", () => {
    const meses = mesesDelEjercicio(2026, [periodo(2026, 9), periodo(2026, 10), periodo(2026, 11)], HOY);
    const mes = (numero) => meses[numero - 1];

    assert.equal(meses.length, 12);
    // Septiembre ya terminó y está abierto: se puede cerrar.
    assert.deepEqual(
        [mes(9).estado, mes(9).terminado, mes(9).enCurso, mes(9).futuro],
        ["abierto", true, false, false],
    );
    // Octubre es el mes en curso: abierto, sin terminar.
    assert.deepEqual([mes(10).terminado, mes(10).enCurso, mes(10).futuro], [false, true, false]);
    // Noviembre existe desde antes de la regla: sigue abierto, pero es futuro.
    assert.deepEqual([mes(11).estado, mes(11).futuro], ["abierto", true]);
    // Diciembre no existe y es futuro: no se ofrece abrirlo.
    assert.deepEqual([mes(12).estado, mes(12).futuro, mes(12).periodo], ["sin-abrir", true, null]);
    // Agosto no existe y ya pasó: se puede abrir.
    assert.deepEqual([mes(8).estado, mes(8).futuro], ["sin-abrir", false]);
});

test("mesesDelEjercicio: cerrar en orden mira los meses abiertos de otros años", () => {
    const meses = mesesDelEjercicio(2026, [periodo(2025, 12), periodo(2026, 1), periodo(2026, 2)], HOY);

    assert.deepEqual(meses[0].anteriorAbierto, { anio: 2025, mes: 12 });
    assert.deepEqual(meses[1].anteriorAbierto, { anio: 2025, mes: 12 });
});

test("mesesDelEjercicio: avisa cuando el mes queda detrás de meses ya cerrados", () => {
    const periodos = [periodo(2026, 1, "cerrado"), periodo(2026, 2, "cerrado"), periodo(2026, 3)];

    // Todo 2025 queda detrás de enero 2026, el cerrado más antiguo posterior.
    const historia = mesesDelEjercicio(2025, periodos, HOY);
    assert.deepEqual(historia[2].cerradoPosterior, { anio: 2026, mes: 1 });
    assert.deepEqual(historia[11].cerradoPosterior, { anio: 2026, mes: 1 });

    // En 2026, abril en adelante no tiene cerrados posteriores.
    const actual = mesesDelEjercicio(2026, periodos, HOY);
    assert.deepEqual(actual[0].cerradoPosterior, { anio: 2026, mes: 2 });
    assert.equal(actual[3].cerradoPosterior, null);
    assert.equal(actual[0].anteriorAbierto, null);
});

test("aniosDelSelector: por defecto, el año pasado y el actual; el siguiente no", () => {
    assert.deepEqual(aniosDelSelector(NaN, [], HOY), { anio: 2026, anios: [2025, 2026], anterior: 2024 });
    // Pedir el año siguiente sin que tenga períodos cae al actual.
    assert.equal(aniosDelSelector(2027, [], HOY).anio, 2026);
    assert.equal(aniosDelSelector(1999, [], HOY).anio, 2026);
    assert.equal(aniosDelSelector(2026.5, [], HOY).anio, 2026);
});

test("aniosDelSelector: el año siguiente aparece solo si conserva períodos", () => {
    const seleccion = aniosDelSelector(2027, [periodo(2027, 1), periodo(2026, 10)], HOY);

    assert.equal(seleccion.anio, 2027);
    assert.deepEqual(seleccion.anios, [2025, 2026, 2027]);
});

test("aniosDelSelector: hacia atrás ofrece los años de corrido, para cargar historia", () => {
    // Elegir 2023 muestra también 2024, aunque esté vacío.
    assert.deepEqual(aniosDelSelector(2023, [], HOY), {
        anio: 2023,
        anios: [2023, 2024, 2025, 2026],
        anterior: 2022,
    });
    // Un año antiguo con períodos se mantiene a la vista aunque se elija otro.
    assert.deepEqual(aniosDelSelector(2026, [periodo(2024, 5)], HOY).anios, [2024, 2025, 2026]);
    // En el mínimo ya no se puede retroceder más.
    assert.equal(aniosDelSelector(2000, [], HOY).anterior, null);
});
