// Origen del archivo del SII en el importador, sin dependencias: `npm test` corre
// node --test, y Node quita los tipos de sii-urls.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { IMPORTABLES } from "./sii.ts";
import { URL_SII, atributosDelEnlace, obtenerArchivoDesdeSii, opcionesDeArchivo, vistaDeOrigen } from "./sii-urls.ts";

test("opcionesDeArchivo: el diálogo ofrece subir desde el computador o ir al SII, con el enlace solo en el SII", () => {
    const opciones = opcionesDeArchivo(obtenerArchivoDesdeSii("compras", "2026-09"));
    assert.deepEqual(opciones.map((o) => [o.origen, o.etiqueta]), [["local", "Subir desde mi computador"], ["sii", "Ir al SII"]]);
    assert.equal(opciones[0].enlace, undefined);
    assert.deepEqual(opciones[1].enlace, { href: URL_SII, target: "_blank", rel: "noopener noreferrer" });
});

test("URL_SII: es una URL https, una sola constante", () => {
    assert.match(URL_SII, /^https:\/\/[^\s]+$/);
});

test("obtenerArchivoDesdeSii: hoy redirige al SII, para cada tipo que se puede importar", () => {
    for (const { id } of IMPORTABLES) {
        assert.deepEqual(obtenerArchivoDesdeSii(id, "2026-09"), { tipo: "redireccion", url: URL_SII }, id);
    }
});

test("atributosDelEnlace: pestaña nueva, sin opener, apuntando a la URL de la redirección", () => {
    const archivo = obtenerArchivoDesdeSii("compras", "2026-09");
    assert.deepEqual(atributosDelEnlace(archivo), { href: URL_SII, target: "_blank", rel: "noopener noreferrer" });
});

test("vistaDeOrigen: con archivo local se ve el campo de archivo y se puede revisar, sin botón del SII", () => {
    const archivo = obtenerArchivoDesdeSii("compras", "2026-09");
    assert.deepEqual(vistaDeOrigen("local", archivo), { campoArchivo: true, botonIrAlSii: false, puedeRevisar: true });
});

test("vistaDeOrigen: con SII no hay campo de archivo ni revisión, y sí el botón", () => {
    const archivo = obtenerArchivoDesdeSii("compras", "2026-09");
    assert.deepEqual(vistaDeOrigen("sii", archivo), { campoArchivo: false, botonIrAlSii: true, puedeRevisar: false });
});
