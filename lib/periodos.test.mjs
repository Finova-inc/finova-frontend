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

// ---- Plazo del F29 y resumen (FIN-89 / FIN-90) ----------------------------
import { DIA_VENCE_F29, f29Vigente, plazoF29, resumenDelEjercicio, severidadPlazoF29 } from "./periodos.ts";

test("plazoF29: vence el 20 del mes siguiente y cuenta los días", () => {
    assert.deepEqual(plazoF29(2026, 9, "2026-10-09"), { anio: 2026, mes: 9, vence: "2026-10-20", dias: 11 });
    assert.equal(plazoF29(2026, 9, "2026-10-20").dias, 0);
    assert.equal(DIA_VENCE_F29, 20);
});

test("plazoF29: pasado el plazo los días son negativos (vencido)", () => {
    // Febrero, visto desde fines de octubre: venció el 20 de marzo hace ~7 meses.
    const p = plazoF29(2026, 2, "2026-10-09");
    assert.equal(p.vence, "2026-03-20");
    assert.ok(p.dias < 0);
    assert.equal(plazoF29(2026, 9, "2026-10-25").dias, -5);
});

test("plazoF29: diciembre vence en enero del año siguiente", () => {
    assert.deepEqual(plazoF29(2025, 12, "2026-01-05"), { anio: 2025, mes: 12, vence: "2026-01-20", dias: 15 });
});

test("f29Vigente: hasta el 20 el del mes anterior; después, el del mes en curso", () => {
    assert.deepEqual(f29Vigente("2026-10-09"), { anio: 2026, mes: 9 });
    assert.deepEqual(f29Vigente("2026-10-20"), { anio: 2026, mes: 9 });
    assert.deepEqual(f29Vigente("2026-10-21"), { anio: 2026, mes: 10 });
    assert.deepEqual(f29Vigente("2026-01-05"), { anio: 2025, mes: 12 });
});

test("severidadPlazoF29: crítica a 3 días o menos y vencido, aviso hasta 10", () => {
    assert.equal(severidadPlazoF29(-30), "critica");
    assert.equal(severidadPlazoF29(0), "critica");
    assert.equal(severidadPlazoF29(3), "critica");
    assert.equal(severidadPlazoF29(4), "aviso");
    assert.equal(severidadPlazoF29(10), "aviso");
    assert.equal(severidadPlazoF29(11), "info");
});

test("resumenDelEjercicio: los doce meses quedan contados, los sin abrir también", () => {
    // El caso del reporte: ene-feb y oct-dic con período; mar-sep sin abrir.
    const meses = mesesDelEjercicio(
        2026,
        [periodo(2026, 1, "cerrado"), periodo(2026, 2), periodo(2026, 10)],
        HOY,
    );
    const r = resumenDelEjercicio(meses);
    assert.deepEqual(r, { abiertos: 2, cerrados: 1, porCerrar: 1, sinAbrir: 7, porComenzar: 2 });
    assert.equal(r.abiertos + r.cerrados + r.sinAbrir + r.porComenzar, 12);
});

import { insigniaPlazoF29 } from "./periodos.ts";

test("insigniaPlazoF29: futuro, hoy y vencido, con singular", () => {
    assert.equal(insigniaPlazoF29(5), "vence en 5 días");
    assert.equal(insigniaPlazoF29(1), "vence en 1 día");
    assert.equal(insigniaPlazoF29(0), "vence hoy");
    assert.equal(insigniaPlazoF29(-1), "venció hace 1 día");
    assert.equal(insigniaPlazoF29(-12), "venció hace 12 días");
});
