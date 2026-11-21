// Pruebas de lib/auditoria.ts: cómo se nombra en pantalla lo que el backend registra.
//
// lib/auditoria.ts importa "./formato" sin la extensión .ts (el resto de lib/ la
// escribe), y node --test no resuelve eso solo. Se registra aquí un resolvedor
// mínimo para poder probar el archivo tal como está.
import assert from "node:assert/strict";
import { register } from "node:module";
import { test } from "node:test";

register(
    "data:text/javascript," +
        encodeURIComponent(`
export async function resolve(especificador, contexto, siguiente) {
    try {
        return await siguiente(especificador, contexto);
    } catch (error) {
        const relativoSinExtension = especificador.startsWith("./") && !especificador.slice(2).includes(".");
        if (error?.code === "ERR_MODULE_NOT_FOUND" && relativoSinExtension) return siguiente(especificador + ".ts", contexto);
        throw error;
    }
}`),
    import.meta.url,
);

const {
    ACCIONES,
    ENTIDADES,
    PAGINA_MAXIMA,
    cambiosVisibles,
    enlaceAlRegistro,
    etiquetaAccion,
    etiquetaCampo,
    etiquetaEntidad,
    formatearValorAuditado,
    paginaPedida,
    paginaValida,
} = await import("./auditoria.ts");

/** Claves que existen en todo objeto: nunca deben tomarse por una etiqueta. */
const CLAVES_DEL_PROTOTIPO = ["constructor", "__proto__", "toString", "hasOwnProperty", "valueOf", "isPrototypeOf"];

test("etiquetaAccion: las acciones conocidas", () => {
    assert.equal(etiquetaAccion("crear"), "Creó");
    assert.equal(etiquetaAccion("leer"), "Consultó");
    assert.equal(etiquetaAccion("actualizar"), "Modificó");
    assert.equal(etiquetaAccion("eliminar"), "Eliminó");
    assert.equal(etiquetaAccion("exportar"), "Exportó");
    assert.equal(etiquetaAccion("login"), "Inició sesión");
    assert.equal(etiquetaAccion("login_fallido"), "Intento de ingreso fallido");
    assert.equal(etiquetaAccion("cambiar_empresa"), "Cambió de empresa");
});

test("etiquetaAccion: una acción que no conoce se muestra tal cual", () => {
    assert.equal(etiquetaAccion("aprobar"), "aprobar");
    assert.equal(etiquetaAccion(""), "");
    assert.equal(etiquetaAccion("CREAR"), "CREAR");
});

test("etiquetaAccion: las claves del prototipo no son etiquetas", () => {
    for (const clave of CLAVES_DEL_PROTOTIPO) assert.equal(etiquetaAccion(clave), clave);
});

test("ACCIONES: lo que ofrece el filtro, en orden", () => {
    assert.deepEqual(ACCIONES, [
        "crear",
        "leer",
        "actualizar",
        "eliminar",
        "exportar",
        "login",
        "login_fallido",
        "cambiar_empresa",
    ]);
});

test("etiquetaEntidad: las entidades conocidas, y 'users' como las filas viejas de Usuario", () => {
    assert.equal(etiquetaEntidad("terceros"), "Tercero");
    assert.equal(etiquetaEntidad("usuarios"), "Usuario");
    assert.equal(etiquetaEntidad("users"), "Usuario");
    assert.equal(etiquetaEntidad("asientos-contables"), "Asiento");
    assert.equal(etiquetaEntidad("cuentas-contables"), "Cuenta contable");
    assert.equal(etiquetaEntidad("periodos-contables"), "Período");
    assert.equal(etiquetaEntidad("configuracion-impuestos"), "Configuración de impuestos");
    assert.equal(etiquetaEntidad("f29"), "Formulario F29");
    assert.equal(etiquetaEntidad("auditoria"), "Auditoría");
});

test("etiquetaEntidad: una entidad desconocida se muestra tal cual, y el prototipo no cuenta", () => {
    assert.equal(etiquetaEntidad("inventario"), "inventario");
    for (const clave of CLAVES_DEL_PROTOTIPO) assert.equal(etiquetaEntidad(clave), clave);
});

test("ENTIDADES: ofrece 'usuarios' pero no 'users', y todas tienen etiqueta propia", () => {
    assert.ok(ENTIDADES.includes("usuarios"));
    assert.ok(!ENTIDADES.includes("users"));
    assert.equal(new Set(ENTIDADES).size, ENTIDADES.length, "sin repetidas");
    for (const entidad of ENTIDADES) assert.notEqual(etiquetaEntidad(entidad), entidad, `${entidad} sin etiqueta`);
});

test("enlaceAlRegistro: asientos y terceros llevan a su detalle", () => {
    assert.equal(enlaceAlRegistro("asientos-contables", "abc-123"), "/dashboard/core-contable/abc-123");
    assert.equal(enlaceAlRegistro("terceros", "abc-123"), "/dashboard/terceros/abc-123");
});

test("enlaceAlRegistro: sin id_registro, o de otra entidad, no hay enlace", () => {
    assert.equal(enlaceAlRegistro("terceros", null), null);
    assert.equal(enlaceAlRegistro("asientos-contables", null), null);
    assert.equal(enlaceAlRegistro("terceros", ""), null);
    assert.equal(enlaceAlRegistro("articulos", "abc-123"), null);
    assert.equal(enlaceAlRegistro("usuarios", "abc-123"), null);
    for (const clave of CLAVES_DEL_PROTOTIPO) assert.equal(enlaceAlRegistro(clave, "abc-123"), null);
});

test("enlaceAlRegistro: un id con caracteres raros se codifica y no cambia la ruta", () => {
    const enlace = enlaceAlRegistro("terceros", "a/b?c=1&d#x ñ");

    assert.equal(enlace, "/dashboard/terceros/a%2Fb%3Fc%3D1%26d%23x%20%C3%B1");
    assert.equal(enlaceAlRegistro("terceros", "../../api/logout"), "/dashboard/terceros/..%2F..%2Fapi%2Flogout");
});

test("etiquetaCampo: campos conocidos, desconocidos y del prototipo", () => {
    assert.equal(etiquetaCampo("rut"), "RUT");
    assert.equal(etiquetaCampo("razon_social"), "Razón social");
    assert.equal(etiquetaCampo("id_rol"), "Rol");
    assert.equal(etiquetaCampo("iva_debito"), "Cuenta de IVA débito");
    // Un campo que el diccionario no conoce se lee como texto, nunca como nombre técnico.
    assert.equal(etiquetaCampo("campo_nuevo"), "Campo nuevo");
    assert.equal(etiquetaCampo("FECHA_CONTABLE"), "Fecha contable");
    // Una clave heredada del prototipo no es una etiqueta: sale como texto, no como la función.
    for (const clave of CLAVES_DEL_PROTOTIPO) assert.equal(typeof etiquetaCampo(clave), "string");
    assert.equal(etiquetaCampo("constructor"), "Constructor");
});

test("formatearValorAuditado: sin valor se lee 'vacío'", () => {
    assert.equal(formatearValorAuditado("nombre", null), "vacío");
    assert.equal(formatearValorAuditado("nombre", undefined), "vacío");
    assert.equal(formatearValorAuditado("nombre", ""), "vacío");
});

test("formatearValorAuditado: el cero y el texto en blanco no son 'vacío'", () => {
    assert.equal(formatearValorAuditado("mes", 0), "0");
    assert.equal(formatearValorAuditado("nombre", " "), " ");
});

test("formatearValorAuditado: booleanos", () => {
    assert.equal(formatearValorAuditado("is_active", true), "Sí");
    assert.equal(formatearValorAuditado("is_active", false), "No");
});

test("formatearValorAuditado: id_rol por nombre, venga como número o texto", () => {
    assert.equal(formatearValorAuditado("id_rol", 1), "Administrador");
    assert.equal(formatearValorAuditado("id_rol", 2), "Contador");
    assert.equal(formatearValorAuditado("id_rol", 3), "Consulta");
    assert.equal(formatearValorAuditado("id_rol", "2"), "Contador");
    assert.equal(formatearValorAuditado("id_rol", 7), "7");
    assert.equal(formatearValorAuditado("id_rol", "constructor"), "constructor");
});

test("formatearValorAuditado: tipo_persona", () => {
    assert.equal(formatearValorAuditado("tipo_persona", "N"), "Persona natural");
    assert.equal(formatearValorAuditado("tipo_persona", "J"), "Persona jurídica");
    assert.equal(formatearValorAuditado("tipo_persona", "X"), "X");
});

test("formatearValorAuditado: un instante ISO en UTC sale en horario de Chile", () => {
    assert.equal(formatearValorAuditado("cerrado_at", "2026-11-20T15:30:00Z"), "20-11-2026 12:30:00");
    assert.equal(formatearValorAuditado("cerrado_at", "2026-11-20T15:30:00.123Z"), "20-11-2026 12:30:00");
    assert.equal(formatearValorAuditado("created_at", "2026-07-01T12:00:00.000Z"), "01-07-2026 08:00:00");
});

test("formatearValorAuditado: lo que no es un instante UTC completo queda como texto", () => {
    // Una fecha sola (sin hora) sale como DD-MM-AAAA; con hora y sin "Z" no es un instante UTC y queda como texto.
    assert.equal(formatearValorAuditado("fecha_emision", "2026-11-20"), "20-11-2026");
    assert.equal(formatearValorAuditado("x", "2026-11-20T15:30:00"), "2026-11-20T15:30:00");
    assert.equal(formatearValorAuditado("x", "2026-11-20T15:30:00+02:00"), "2026-11-20T15:30:00+02:00");
});

test("formatearValorAuditado: un objeto sale como JSON compacto", () => {
    assert.equal(formatearValorAuditado("detalles", { a: 1, b: "x" }), '{"a":1,"b":"x"}');
});

test("formatearValorAuditado: una lista sale como conteo, y una vacía como vacío", () => {
    assert.equal(formatearValorAuditado("detalles", [1, 2, 3]), "3 elementos");
    assert.equal(formatearValorAuditado("lineas", [{ id: "x".repeat(1000) }]), "1 elemento");
    assert.equal(formatearValorAuditado("detalles", []), "vacío");
});

test("formatearValorAuditado: el uuid de una persona se cambia por su nombre solo si es miembro", () => {
    const id = "0a1b2c3d-0000-4000-8000-000000000001";
    const personas = new Map([[id, "Ana Pérez"]]);
    for (const campo of ["created_by", "cerrado_por", "id_usuario"]) {
        assert.equal(formatearValorAuditado(campo, id, personas), "Ana Pérez");
        assert.equal(formatearValorAuditado(campo, id.toUpperCase(), personas), "Ana Pérez");
    }
    const otro = "0a1b2c3d-0000-4000-8000-000000000002";
    assert.equal(formatearValorAuditado("created_by", otro, personas), otro);
    assert.equal(formatearValorAuditado("created_by", id), id);
    // Otros campos con uuid no se tocan, ni las claves del prototipo.
    assert.equal(formatearValorAuditado("id_tercero", id, personas), id);
    assert.equal(formatearValorAuditado("created_by", "constructor", personas), "constructor");
});

test("cambiosVisibles: quita solo lo que sería «vacío → vacío»", () => {
    const cambios = [
        { campo: "nombre", antes: "A", despues: null },
        { campo: "codigo_sii", antes: null, despues: null },
        { campo: "lineas", antes: [], despues: undefined },
        { campo: "razon_social", antes: "", despues: "B" },
        { campo: "is_active", antes: false, despues: null },
    ];
    assert.deepEqual(cambiosVisibles(cambios).map((c) => c.campo), ["nombre", "razon_social", "is_active"]);
    assert.deepEqual(cambiosVisibles([{ campo: "x", antes: null, despues: null }]), []);
    assert.deepEqual(cambiosVisibles([]), []);
});

test("etiquetaCampo: claves del cambio de empresa y de otras rutas", () => {
    assert.equal(etiquetaCampo("id_empresa_nueva"), "Empresa nueva");
    assert.equal(etiquetaCampo("motivo"), "Motivo");
    assert.equal(etiquetaCampo("id_empresa_impuesto"), "Configuración de impuestos");
    assert.equal(etiquetaCampo("id_propuesta_f29"), "Propuesta del F29");
    assert.equal(etiquetaCampo("id_importacion"), "Importación");
    for (const [clave, etiqueta] of [["monto_neto", "Monto neto"], ["version_lock", "Versión"], ["total_a_pagar", "Total a pagar"], ["declarada_por", "Declarada por"]]) {
        assert.equal(etiquetaCampo(clave), etiqueta);
    }
});

test("paginaValida: en rango se queda; pasada del final va a la última", () => {
    assert.equal(paginaValida(1, 138, 50), 1);
    assert.equal(paginaValida(3, 138, 50), 3); // 138 con 50 → última 3
    assert.equal(paginaValida(4, 138, 50), 3);
    assert.equal(paginaValida(500, 138, 50), 3);
    assert.equal(paginaValida(2, 100, 50), 2); // múltiplo exacto
    assert.equal(paginaValida(3, 100, 50), 2);
    assert.equal(paginaValida(138, 138, 1), 138);
    assert.equal(paginaValida(139, 138, 1), 138);
    assert.equal(paginaValida(2, 138, 100), 2);
    assert.equal(paginaValida(3, 138, 100), 2);
});

test("paginaValida: total 0, página 0, negativa o rara, por_pagina inválido", () => {
    assert.equal(paginaValida(5, 0, 50), 1);
    assert.equal(paginaValida(1, 0, 50), 1);
    assert.equal(paginaValida(0, 138, 50), 1);
    assert.equal(paginaValida(-7, 138, 50), 1);
    assert.equal(paginaValida(Number.NaN, 138, 50), 1);
    assert.equal(paginaValida(2.9, 138, 50), 2);
    assert.equal(paginaValida(5, 138, 0), 1);
});

test("paginaPedida: entera entre 1 y el tope del backend", () => {
    assert.equal(paginaPedida(undefined), 1);
    assert.equal(paginaPedida("3"), 3);
    assert.equal(paginaPedida("0"), 1);
    assert.equal(paginaPedida("-4"), 1);
    assert.equal(paginaPedida("abc"), 1);
    assert.equal(paginaPedida("500"), 500);
    assert.equal(paginaPedida("1000000"), 1_000_000);
    assert.equal(paginaPedida("1000001"), PAGINA_MAXIMA);
    assert.equal(paginaPedida("99999999999"), PAGINA_MAXIMA);
    assert.equal(paginaPedida("1e20"), PAGINA_MAXIMA);
    assert.equal(paginaPedida("1e999"), PAGINA_MAXIMA);
});

test("formatearValorAuditado: más de 400 caracteres se corta con puntos suspensivos", () => {
    const justo = "a".repeat(400);
    const largo = "b".repeat(500);

    assert.equal(formatearValorAuditado("nombre", justo), justo);
    assert.equal(formatearValorAuditado("nombre", largo), "b".repeat(400) + "…");
    assert.equal(formatearValorAuditado("nombre", "c".repeat(401)).length, 401);
    // También un objeto grande, ya convertido a texto.
    const grande = formatearValorAuditado("lineas", { texto: "d".repeat(1000) });
    assert.equal(grande.length, 401);
    assert.ok(grande.endsWith("…"));
});

test("formatearValorAuditado: un texto con HTML se devuelve tal cual (React lo escapa al dibujarlo)", () => {
    const peligroso = '<img src=x onerror="alert(1)">';

    assert.equal(formatearValorAuditado("razon_social", peligroso), peligroso);
});
