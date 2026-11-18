// Copiloto: enlaces a comprobantes, asiento propuesto, tablas y sugerencias por avisos.
import assert from "node:assert/strict";
import { test } from "node:test";
import { comoEnlaces, comoPropuesta, leerEventosSse, sugerenciasConAvisos, unirEnlaces } from "./copiloto.ts";
import { restaurarConversacion, serializarConversacion } from "./copiloto-memoria.ts";
import { interpretarTexto, pareceCifra, partirComprobantes, textoPlano } from "./texto-enriquecido.ts";

const ID_A = "aaaaaaaa-1111-4111-8111-111111111111";
const ID_B = "bbbbbbbb-2222-4222-8222-222222222222";
const linea = (evento) => `data: ${JSON.stringify(evento)}\n\n`;

const PROPUESTA = {
    fecha: "2026-11-15",
    tipo_comprobante: "E",
    glosa: "Pago luz",
    lineas: [
        { id_cuenta: ID_A, cuenta: "5101 Luz", debe: "45000", haber: "", glosa: "" },
        { id_cuenta: ID_B, cuenta: "1102 Banco", debe: "", haber: "45000", glosa: "Transferencia" },
    ],
};

test("comoEnlaces deja solo comprobantes con id valido", () => {
    assert.deepEqual(comoEnlaces({ "T-15": ID_A, "X-1": ID_B, "E-2": "no-es-uuid", __proto__x: ID_A }), { "T-15": ID_A });
    assert.equal(comoEnlaces({ "X-1": ID_A }), null);
    assert.equal(comoEnlaces(["T-1"]), null);
});

test("unirEnlaces deja sin enlace un comprobante que apunta a dos asientos", () => {
    const unidos = unirEnlaces({ "T-15": ID_A, "E-2": ID_B }, { "T-15": ID_B, "I-3": ID_A, "E-2": ID_B });
    assert.deepEqual(unidos, { "T-15": "", "E-2": ID_B, "I-3": ID_A });
});

test("comoPropuesta valida montos, cuentas y largo", () => {
    assert.deepEqual(comoPropuesta(PROPUESTA), PROPUESTA);
    assert.equal(comoPropuesta({ ...PROPUESTA, lineas: [PROPUESTA.lineas[0]] }), null);
    assert.equal(comoPropuesta({ ...PROPUESTA, tipo_comprobante: "X" }), null);
    const conDecimales = { ...PROPUESTA.lineas[0], debe: "45000.5" };
    assert.equal(comoPropuesta({ ...PROPUESTA, lineas: [conDecimales, PROPUESTA.lineas[1]] }), null);
    const sinUuid = { ...PROPUESTA.lineas[0], id_cuenta: "1101" };
    assert.equal(comoPropuesta({ ...PROPUESTA, lineas: [sinUuid, PROPUESTA.lineas[1]] }), null);
});

test("el stream entrega enlaces y propuesta, y descarta los que vienen mal", () => {
    const { eventos } = leerEventosSse(
        linea({ tipo: "enlaces", asientos: { "T-15": ID_A } }) +
            linea({ tipo: "propuesta_asiento", propuesta: PROPUESTA }) +
            linea({ tipo: "propuesta_asiento", propuesta: { ...PROPUESTA, fecha: "ayer" } }) +
            linea({ tipo: "enlaces", asientos: { "T-1": "x" } }),
    );
    assert.deepEqual(eventos, [
        { tipo: "enlaces", asientos: { "T-15": ID_A } },
        { tipo: "propuesta_asiento", propuesta: PROPUESTA },
    ]);
});

test("la memoria guarda enlaces y propuesta solo en mensajes del asistente", () => {
    const ahora = new Date("2026-11-17T12:00:00Z");
    const texto = serializarConversacion(
        [
            { id: 0, rol: "usuario", texto: "Registra la luz", aviso: null, enlaces: { "T-1": ID_A }, propuesta: PROPUESTA },
            { id: 1, rol: "asistente", texto: "Listo", aviso: null, enlaces: { "T-1": ID_A }, propuesta: PROPUESTA },
        ],
        ahora,
    );
    const [usuario, asistente] = restaurarConversacion(texto, ahora).mensajes;
    assert.equal(usuario.enlaces, undefined);
    assert.equal(usuario.propuesta, undefined);
    assert.deepEqual(asistente.enlaces, { "T-1": ID_A });
    assert.deepEqual(asistente.propuesta, PROPUESTA);
});

test("partirComprobantes enlaza solo los comprobantes conocidos", () => {
    assert.deepEqual(partirComprobantes("Ver T-15 y E-2, no IVA-3.", { "T-15": ID_A, "E-2": "" }), [
        { tipo: "texto", texto: "Ver " },
        { tipo: "comprobante", texto: "T-15", id: ID_A },
        { tipo: "texto", texto: " y E-2, no IVA-3." },
    ]);
    assert.deepEqual(partirComprobantes("T-15", undefined), [{ tipo: "texto", texto: "T-15" }]);
});

test("interpretarTexto arma una tabla markdown y completa filas cortas", () => {
    const bloques = interpretarTexto(
        "Gastos:\n| Cuenta | Octubre | Noviembre |\n|---|---:|---:|\n| **5101** Luz | $45.000 | $50.000 |\n| 5102 Agua | $9.000 |\nFin.",
    );
    assert.deepEqual(bloques[1], {
        tipo: "tabla",
        encabezados: ["Cuenta", "Octubre", "Noviembre"],
        filas: [
            ["**5101** Luz", "$45.000", "$50.000"],
            ["5102 Agua", "$9.000", ""],
        ],
    });
    assert.equal(bloques[0].tipo, "parrafo");
    assert.equal(bloques[2].tipo, "parrafo");
});

test("mientras no llega el separador, la fila de encabezado se ve como texto", () => {
    assert.equal(interpretarTexto("| Cuenta | Saldo |")[0].tipo, "parrafo");
});

test("textoPlano y pareceCifra para el CSV y la alineacion", () => {
    assert.equal(textoPlano("**5101** `Luz`"), "5101 Luz");
    assert.equal(pareceCifra("**$1.234.567**"), true);
    assert.equal(pareceCifra("-$500"), true);
    assert.equal(pareceCifra("12,5%"), true);
    assert.equal(pareceCifra("5101 Luz"), false);
});

test("sugerenciasConAvisos antepone borradores y mes sin abrir, hasta 4", () => {
    const base = ["a", "b", "c"];
    const avisos = (n, estado) => ({ borradores_por_revisar: n, mes_en_curso: { anio: 2026, mes: 11, estado } });
    assert.deepEqual(sugerenciasConAvisos(base, null), base);
    assert.deepEqual(sugerenciasConAvisos(base, avisos(0, "abierto")), base);
    assert.deepEqual(sugerenciasConAvisos(base, avisos(1, "abierto"))[0], "Tengo un borrador sin cuadrar o incompleto: ¿qué le falta?");
    const ambas = sugerenciasConAvisos(base, avisos(3, "sin_abrir"));
    assert.equal(ambas.length, 4);
    assert.match(ambas[0], /3 borradores/);
    assert.match(ambas[1], /no está abierto/);
});
