// Check de la extensión de los archivos, sin dependencias:
// `npm test` corre node --test, y Node quita los tipos de extension-archivo.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { extensionDe, extensionPermitida, listaDeExtensiones, mensajeExtensionNoPermitida } from "./extension-archivo.ts";

const TABLA = [".csv", ".txt", ".xlsx"];
const XML = [".xml", ".zip"];

test("extensionPermitida: las extensiones de la lista pasan", () => {
    for (const nombre of ["compras.csv", "reporte.txt", "libro.xlsx", "RCV septiembre 2026.csv", "a.b.c.xlsx"]) {
        assert.equal(extensionPermitida(nombre, TABLA), true, nombre);
    }
});

test("extensionPermitida: las que no están en la lista no pasan", () => {
    for (const nombre of ["libro.xls", "libro.xlsm", "reporte.pdf", "foto.png", "programa.exe", "datos.xml", "datos.zip"]) {
        assert.equal(extensionPermitida(nombre, TABLA), false, nombre);
    }
});

test("extensionPermitida: da igual si viene en mayúsculas o mezclada", () => {
    for (const nombre of ["LIBRO.XLSX", "Compras.CSV", "REPORTE.Txt", "Libro.XlSx"]) {
        assert.equal(extensionPermitida(nombre, TABLA), true, nombre);
    }
    // y la lista también puede escribirse en mayúsculas
    assert.equal(extensionPermitida("libro.csv", [".CSV"]), true);
});

test("extensionPermitida: sin extensión no pasa", () => {
    for (const nombre of ["compras", "", "sin-extension", ".", "terminaenpunto.", ".csv", ".xlsx"]) {
        assert.equal(extensionPermitida(nombre, TABLA), false, JSON.stringify(nombre));
    }
});

test("extensionPermitida: con doble extensión manda la última («libro.csv.exe» no pasa)", () => {
    assert.equal(extensionPermitida("libro.csv.exe", TABLA), false);
    assert.equal(extensionPermitida("factura.pdf.xlsx", TABLA), true); // termina en .xlsx
    assert.equal(extensionPermitida("libro.xlsx.xls", TABLA), false);
    assert.equal(extensionPermitida("libro.csv .exe", TABLA), false);
});

test("extensionPermitida: una ruta con carpetas mira solo el nombre del archivo", () => {
    assert.equal(extensionPermitida("C:\\datos.v2\\compras", TABLA), false);
    assert.equal(extensionPermitida("C:\\datos.v2\\compras.csv", TABLA), true);
    assert.equal(extensionPermitida("/tmp/x.y/z.xlsx", TABLA), true);
});

test("extensionPermitida: el tipo XML acepta .xml y .zip y no las de tabla", () => {
    assert.equal(extensionPermitida("dte.xml", XML), true);
    assert.equal(extensionPermitida("dtes.ZIP", XML), true);
    assert.equal(extensionPermitida("compras.csv", XML), false);
    assert.equal(extensionPermitida("libro.xlsx", XML), false);
});

test("extensionDe: lo que sigue al último punto, en minúsculas", () => {
    assert.equal(extensionDe("Libro.XLSX"), "xlsx");
    assert.equal(extensionDe("a.b.csv"), "csv");
    assert.equal(extensionDe("sin"), "");
    assert.equal(extensionDe(".oculto"), "");
});

test("listaDeExtensiones: separa con comas y cierra con «o»", () => {
    assert.equal(listaDeExtensiones(TABLA), ".csv, .txt o .xlsx");
    assert.equal(listaDeExtensiones(XML), ".xml o .zip");
    assert.equal(listaDeExtensiones([".csv"]), ".csv");
});

test("mensajeExtensionNoPermitida: dice qué se acepta", () => {
    assert.equal(mensajeExtensionNoPermitida("reporte.pdf", TABLA), "Este tipo de archivo acepta solo .csv, .txt o .xlsx.");
    assert.equal(mensajeExtensionNoPermitida("libro.csv.exe", TABLA), "Este tipo de archivo acepta solo .csv, .txt o .xlsx.");
    assert.equal(mensajeExtensionNoPermitida("compras.csv", XML), "Este tipo de archivo acepta solo .xml o .zip.");
});

test("mensajeExtensionNoPermitida: para .xls y .xlsm agrega cómo guardarlo", () => {
    for (const nombre of ["libro.xls", "LIBRO.XLSM", "Libro.xlsb"]) {
        assert.equal(
            mensajeExtensionNoPermitida(nombre, TABLA),
            "Este tipo de archivo acepta solo .csv, .txt o .xlsx. Guarda el archivo como .xlsx o como CSV.",
            nombre,
        );
    }
});

test("mensajeExtensionNoPermitida: en el tipo XML no se sugiere Excel", () => {
    assert.equal(mensajeExtensionNoPermitida("libro.xls", XML), "Este tipo de archivo acepta solo .xml o .zip.");
});
