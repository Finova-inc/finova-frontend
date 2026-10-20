// Check de las piezas puras de terceros, sin dependencias: `npm test` corre
// node --test, y Node quita los tipos de terceros.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { filtrosDesdeUrl, nombreRoles, sugerirTipoPersona, urlRegistrar, urlTerceros } from "./terceros.ts";

test("urlRegistrar: propone el rol según cómo aparece en los documentos", () => {
    const url = (datos) => new URL(urlRegistrar(datos), "http://x").searchParams;
    assert.equal(url({ rut: "76.123.456-7", comoProveedor: true, comoCliente: false }).get("rol"), "proveedor");
    assert.equal(url({ rut: "76.123.456-7", comoProveedor: false, comoCliente: true }).get("rol"), "cliente");
    assert.equal(url({ rut: "76.123.456-7", comoProveedor: true, comoCliente: true }).get("rol"), "ambos");
    const completa = url({ rut: "12.345.678-5", nombre: "Ana Pérez & Cía", comoProveedor: true, comoCliente: false, tipo: "N", motivo: "Emite boletas" });
    assert.equal(completa.get("nombre"), "Ana Pérez & Cía");
    assert.equal(completa.get("tipo"), "N");
    assert.equal(completa.get("rut"), "12.345.678-5");
    // Sin nombre no manda un parámetro vacío.
    assert.equal(url({ rut: "76.123.456-7", nombre: null, comoProveedor: true, comoCliente: false }).has("nombre"), false);
});

test("sugerirTipoPersona: sobre 50 millones sugiere empresa, bajo eso persona natural", () => {
    assert.equal(sugerirTipoPersona("76.123.456-7").tipo_persona, "J");
    assert.equal(sugerirTipoPersona("761234567").tipo_persona, "J");
    assert.equal(sugerirTipoPersona("12.345.678-5").tipo_persona, "N");
    assert.equal(sugerirTipoPersona("9.876.543-3").tipo_persona, "N");
    assert.match(sugerirTipoPersona("76.123.456-7").motivo, /50 millones/);
});

test("sugerirTipoPersona: sin un RUT completo todavía no sugiere nada", () => {
    assert.equal(sugerirTipoPersona(""), null);
    assert.equal(sugerirTipoPersona("76.12"), null);
});

test("nombreRoles: los cuatro casos", () => {
    assert.equal(nombreRoles({ es_cliente: true, es_proveedor: true }), "Cliente y proveedor");
    assert.equal(nombreRoles({ es_cliente: true, es_proveedor: false }), "Cliente");
    assert.equal(nombreRoles({ es_cliente: false, es_proveedor: true }), "Proveedor");
    assert.equal(nombreRoles({ es_cliente: false, es_proveedor: false }), "Sin rol");
});

test("filtrosDesdeUrl: conserva lo válido y descarta lo demás", () => {
    assert.deepEqual(filtrosDesdeUrl({ buscar: "  Sur ", rol: "proveedor", estado: "inactivos" }), {
        buscar: "Sur",
        rol: "proveedor",
        estado: "inactivos",
    });
    assert.deepEqual(filtrosDesdeUrl({ rol: "socio", estado: "todos", buscar: "   " }), {});
    assert.deepEqual(filtrosDesdeUrl({ rol: ["cliente", "proveedor"] }), {});
    assert.equal(filtrosDesdeUrl({ buscar: "x".repeat(300) }).buscar.length, 100);
});

test("urlTerceros: arma la URL y omite lo vacío", () => {
    assert.equal(urlTerceros({}), "/dashboard/terceros");
    assert.equal(urlTerceros({ rol: "cliente", buscar: "" }), "/dashboard/terceros?rol=cliente");
    assert.equal(urlTerceros({ buscar: "76.123", estado: "activos" }), "/dashboard/terceros?buscar=76.123&estado=activos");
});
