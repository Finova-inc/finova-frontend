// Check de los helpers de la pantalla de documentos del SII, sin dependencias:
// `npm test` corre node --test, y Node quita los tipos de sii.ts al importarlo.
import assert from "node:assert/strict";
import { test } from "node:test";
import { diferencia, importableDe, libroDe, mesDesplazado, nombreTipoDte, periodoValido, urlLibro } from "./sii.ts";

test("mesDesplazado: cruza el año hacia los dos lados", () => {
    assert.equal(mesDesplazado("2026-09", 1), "2026-10");
    assert.equal(mesDesplazado("2026-12", 1), "2027-01");
    assert.equal(mesDesplazado("2026-01", -1), "2025-12");
    assert.equal(mesDesplazado("2026-03", -14), "2025-01");
});

test("periodoValido: solo AAAA-MM con mes de 01 a 12", () => {
    assert.equal(periodoValido("2026-09"), "2026-09");
    for (const malo of ["2026-13", "2026-00", "26-09", "2026-9", "", undefined, "2026-09-01"]) {
        assert.equal(periodoValido(malo), undefined, String(malo));
    }
});

test("urlLibro: omite lo vacío y la página 1, y codifica el texto", () => {
    assert.equal(urlLibro({ libro: "compras", periodo: "2026-09" }), "/dashboard/documentos?libro=compras&periodo=2026-09");
    assert.equal(
        urlLibro({ libro: "ventas", periodo: "2026-09", texto: "Ñandú & Cía", cuadratura: "difiere", pagina: 3, tipo: "", orden: undefined }),
        "/dashboard/documentos?libro=ventas&periodo=2026-09&texto=%C3%91and%C3%BA+%26+C%C3%ADa&cuadratura=difiere&pagina=3",
    );
    assert.ok(!urlLibro({ libro: "compras", periodo: "2026-09", pagina: 1 }).includes("pagina"));
});

test("diferencia: enteros grandes sin perder precisión", () => {
    assert.equal(diferencia("250000", "238000"), "12000");
    assert.equal(diferencia("0", "5"), "-5");
    assert.equal(diferencia("9007199254740993", "1"), "9007199254740992");
});

test("libroDe e importableDe: un valor raro cae al primero", () => {
    assert.equal(libroDe("mentira").id, "compras");
    assert.equal(libroDe("honorarios_emitidas").id, "honorarios_emitidas");
    assert.equal(importableDe("xml").esRcv, false);
    assert.equal(importableDe(undefined).id, "compras");
});

test("nombreTipoDte: los conocidos con nombre y los demás con su código", () => {
    assert.equal(nombreTipoDte(61), "Nota de crédito electrónica");
    assert.equal(nombreTipoDte(999), "Documento tipo 999");
});
