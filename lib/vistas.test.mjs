// Cada pantalla del panel debe tener su propio nombre en los mensajes de error.
// El archivo de rutas se lee del disco: si se agrega una pantalla y no se
// registra en lib/vistas.ts, este test falla en vez de dejarla con el mensaje genérico.
import assert from "node:assert/strict";
import { readdirSync, statSync } from "node:fs";
import { join, sep } from "node:path";
import { test } from "node:test";
import { vistaDeLaRuta } from "./vistas.ts";

/** Rutas reales de app/dashboard/**\/page.tsx, con [id] reemplazado por un valor. */
function rutasDeLasPaginas(dir = "app/dashboard", acc = []) {
    for (const nombre of readdirSync(dir)) {
        const ruta = join(dir, nombre);
        if (statSync(ruta).isDirectory()) rutasDeLasPaginas(ruta, acc);
        else if (nombre === "page.tsx") acc.push(dir);
    }
    return acc;
}

test("toda pantalla del panel tiene nombre propio", () => {
    const sinNombre = rutasDeLasPaginas()
        .map((dir) => "/" + dir.split(sep).slice(1).join("/").replace(/\[\.\.\.[^\]]+\]/g, "x"))
        .filter((ruta) => !ruta.includes("/x")) // el comodín de "no existe" no es una pantalla
        .map((ruta) => ruta.replace(/\[[^\]]+\]/g, "abc-123"))
        .map((ruta) => (ruta === "/" ? "/dashboard" : "/dashboard" + ruta.replace(/^\/dashboard/, "")))
        .filter((ruta) => vistaDeLaRuta(ruta).nombre === "esta pantalla");
    assert.deepEqual(sinNombre, []);
});

test("lo específico gana a lo general", () => {
    assert.equal(vistaDeLaRuta("/dashboard/core-contable/nuevo").nombre, "el formulario de asiento");
    assert.equal(vistaDeLaRuta("/dashboard/core-contable/9f2c").nombre, "el asiento");
    assert.equal(vistaDeLaRuta("/dashboard/core-contable/borradores/9f2c").nombre, "el borrador");
    assert.equal(vistaDeLaRuta("/dashboard/terceros/nuevo").nombre, "el formulario de tercero");
    assert.equal(vistaDeLaRuta("/dashboard/terceros/77").nombre, "el tercero");
});

test("barra final y rutas desconocidas", () => {
    assert.equal(vistaDeLaRuta("/dashboard/libro-mayor/").nombre, "el libro mayor");
    assert.equal(vistaDeLaRuta("/dashboard/no-existe").nombre, "esta pantalla");
    assert.equal(vistaDeLaRuta("/dashboard/no-existe").volverA, "/dashboard");
});
