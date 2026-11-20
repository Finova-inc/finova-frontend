// Pruebas de formatearFechaHoraChile: la hora de Chile, con su horario de verano, sin depender de la zona del servidor.
import assert from "node:assert/strict";
import { test } from "node:test";
import { formatearFechaHoraChile } from "./formato.ts";

/** Instantes en que el reloj de Chile cambia de hora durante `anio`, buscados con Intl (no de memoria). */
function cambiosDeHora(anio) {
    const zona = new Intl.DateTimeFormat("en-US", { timeZone: "America/Santiago", timeZoneName: "longOffset", hour: "numeric" });
    const desfase = (ms) => zona.formatToParts(new Date(ms)).find((p) => p.type === "timeZoneName").value;
    const cambios = [];
    let anterior = desfase(Date.UTC(anio, 0, 1));
    for (let t = Date.UTC(anio, 0, 1); t < Date.UTC(anio + 1, 0, 1); t += 3600_000) {
        const actual = desfase(t);
        if (actual !== anterior) cambios.push({ instante: new Date(t).toISOString(), de: anterior, a: actual });
        anterior = actual;
    }
    return cambios;
}

// Las fechas de abajo salen de esta búsqueda, y el primer test la repite: si el
// calendario de Chile cambia, falla ahí y se actualizan los demás.
const ABRIL = "2026-04-05T03:00:00.000Z";
const SEPTIEMBRE = "2026-09-06T04:00:00.000Z";

test("el cambio de hora de Chile en 2026 es el 5 de abril y el 6 de septiembre (UTC)", () => {
    assert.deepEqual(cambiosDeHora(2026), [
        { instante: ABRIL, de: "GMT-03:00", a: "GMT-04:00" },
        { instante: SEPTIEMBRE, de: "GMT-04:00", a: "GMT-03:00" },
    ]);
});

test("un instante normal, en verano y en invierno", () => {
    assert.equal(formatearFechaHoraChile("2026-11-20T15:30:00Z"), "20-11-2026 12:30:00");
    assert.equal(formatearFechaHoraChile("2026-01-15T12:00:00Z"), "15-01-2026 09:00:00");
    assert.equal(formatearFechaHoraChile("2026-07-01T12:00:00Z"), "01-07-2026 08:00:00");
});

test("medianoche de Chile: un segundo antes es el día anterior", () => {
    assert.equal(formatearFechaHoraChile("2026-11-20T03:00:00Z"), "20-11-2026 00:00:00");
    assert.equal(formatearFechaHoraChile("2026-11-20T02:59:59Z"), "19-11-2026 23:59:59");
});

test("sin '24:00' a medianoche (hourCycle h23)", () => {
    assert.ok(!formatearFechaHoraChile("2026-11-20T03:00:00Z").includes("24:"));
});

test("cambio de abril: el reloj retrasa y la hora 23:xx del 4 de abril ocurre dos veces", () => {
    assert.equal(formatearFechaHoraChile("2026-04-05T01:59:59Z"), "04-04-2026 22:59:59");
    assert.equal(formatearFechaHoraChile("2026-04-05T02:00:00Z"), "04-04-2026 23:00:00");
    assert.equal(formatearFechaHoraChile("2026-04-05T02:59:59Z"), "04-04-2026 23:59:59");
    // Una hora después, el reloj vuelve a marcar 23:00: instantes distintos, misma lectura.
    assert.equal(formatearFechaHoraChile(ABRIL), "04-04-2026 23:00:00");
    assert.equal(formatearFechaHoraChile("2026-04-05T03:59:59Z"), "04-04-2026 23:59:59");
    assert.equal(formatearFechaHoraChile("2026-04-05T04:00:00Z"), "05-04-2026 00:00:00");
});

test("cambio de septiembre: el reloj adelanta y la hora 00:xx del 6 de septiembre no existe", () => {
    assert.equal(formatearFechaHoraChile("2026-09-06T03:59:59Z"), "05-09-2026 23:59:59");
    assert.equal(formatearFechaHoraChile(SEPTIEMBRE), "06-09-2026 01:00:00");
    assert.equal(formatearFechaHoraChile("2026-09-06T04:30:00Z"), "06-09-2026 01:30:00");
    assert.equal(formatearFechaHoraChile("2026-09-06T05:00:00Z"), "06-09-2026 02:00:00");
});

test("una fecha inválida se escribe '—'", () => {
    assert.equal(formatearFechaHoraChile("no-es-fecha"), "—");
    assert.equal(formatearFechaHoraChile(""), "—");
    assert.equal(formatearFechaHoraChile("2026-13-01T10:00:00Z"), "—");
    // Un día que no existe ("2026-02-30") no es inválido para Date: se desborda al 2 de marzo.
    // El backend manda solo instantes reales, así que no se fija aquí ese comportamiento.
});

test("el resultado no depende de la zona horaria del servidor", () => {
    const original = process.env.TZ;
    try {
        for (const zona of ["UTC", "Asia/Tokyo", "America/Santiago", "Pacific/Auckland"]) {
            process.env.TZ = zona;
            assert.equal(formatearFechaHoraChile("2026-11-20T15:30:00Z"), "20-11-2026 12:30:00", zona);
            assert.equal(formatearFechaHoraChile(SEPTIEMBRE), "06-09-2026 01:00:00", zona);
        }
    } finally {
        if (original === undefined) delete process.env.TZ;
        else process.env.TZ = original;
    }
});
