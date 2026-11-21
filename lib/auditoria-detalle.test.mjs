// Pruebas del detalle de un evento de auditoría (lib/auditoria-detalle.ts y el formato de lib/auditoria.ts).
// Los datos de ejemplo tienen la forma de las filas reales de la tabla auditoria.
import assert from "node:assert/strict";
import { test } from "node:test";
import {
    descripcionDelRegistro,
    esCampoTecnico,
    nombreDeCuentaDeLinea,
    ordenarClaves,
    prepararCambios,
    prepararDatos,
    tablaDeLista,
    tituloDeDatos,
} from "./auditoria-detalle.ts";
import { esMonto, etiquetaCampo, formatearValorAuditado, sinValor, textoLegible } from "./auditoria.ts";

const ID = (n) => `0a1b2c3d-0000-4000-8000-${String(n).padStart(12, "0")}`;
const ctx = (entidad, extra = {}) => ({ entidad, verCorreo: false, ...extra });

// Un asiento recién creado, como lo guarda el backend (movimientos con su cuenta anidada).
const ASIENTO = {
    anio: 2026,
    glosa: "Esto es una prueba",
    numero: 3,
    origen: "manual",
    periodo: { mes: 11, anio: 2026, estado: "abierto" },
    created_at: "2026-11-20T15:30:00.000Z",
    created_by: ID(1),
    id_asiento: ID(2),
    id_periodo: ID(3),
    revierte_a: null,
    revertido_por: null,
    id_asiento_revertido: null,
    id_documento: null,
    fecha_contable: "2026-11-20",
    tipo_comprobante: "T",
    valor_comprobante: "12000.0000",
    movimientos: [
        { orden: 2, debe: "0.0000", haber: "12000.0000", glosa: null, id_cuenta: ID(11), cuenta: { codigo: "4101001", nombre: "Ventas" }, id_movimiento: ID(21) },
        { orden: 1, debe: "12000.0000", haber: "0.0000", glosa: null, id_cuenta: ID(12), cuenta: { codigo: "1101001", nombre: "Caja" }, id_movimiento: ID(22) },
    ],
};

test("etiquetas: lo desconocido se lee como texto y nunca en MAYUSCULAS_CON_GUION_BAJO", () => {
    assert.equal(etiquetaCampo("revierte_a"), "Revierte a");
    assert.equal(etiquetaCampo("revertido_por"), "Revertido por");
    assert.equal(etiquetaCampo("fecha_contable"), "Fecha contable");
    assert.equal(etiquetaCampo("tipo_comprobante"), "Tipo de comprobante");
    assert.equal(etiquetaCampo("valor_comprobante"), "Valor del comprobante");
    // Respaldo: ni siquiera con mayúsculas.
    for (const campo of ["campo_nuevo", "ID_ASIENTO_REVERTIDO", "REVIERTE_A", "algoRaro-X"]) {
        const etiqueta = etiquetaCampo(campo);
        assert.doesNotMatch(etiqueta, /_/);
        assert.doesNotMatch(etiqueta, /^[A-Z_ ]+$/);
    }
    assert.equal(textoLegible("REVIERTE_A"), "Revierte a");
    assert.equal(textoLegible("fechaContable"), "Fecha contable");
});

test("fechas: siempre DD-MM-AAAA, y con hora de Chile cuando traen hora", () => {
    assert.equal(formatearValorAuditado("fecha_contable", "2026-11-20"), "20-11-2026");
    assert.equal(formatearValorAuditado("fecha_emision", "2026-09-13"), "13-09-2026");
    assert.equal(formatearValorAuditado("created_at", "2026-11-20T15:30:00.000Z"), "20-11-2026 12:30:00");
    assert.equal(formatearValorAuditado("periodo", "2026-10", undefined, "f29"), "Octubre 2026");
});

test("montos: pesos con formato chileno solo en los campos de monto de la entidad", () => {
    assert.equal(formatearValorAuditado("valor_comprobante", "12000.0000", undefined, "asientos-contables"), "$12.000");
    assert.equal(formatearValorAuditado("monto_total", "119000.0000", undefined, "documentos"), "$119.000");
    assert.equal(formatearValorAuditado("total_a_pagar", "-4500", undefined, "f29"), "-$4.500");
    assert.equal(esMonto("documentos", "monto_neto"), true);
    assert.equal(esMonto("terceros", "monto_neto"), false);
    // Fuera de un campo de monto, solo se quitan los decimales sobrantes.
    assert.equal(formatearValorAuditado("cantidad", "2.0000"), "2");
    assert.equal(formatearValorAuditado("tasa_cambio_historica", "1.0000", undefined, "documentos"), "1");
    assert.equal(formatearValorAuditado("x", "0.0190"), "0,019");
    assert.equal(formatearValorAuditado("numero", 3), "3");
});

test("objetos conocidos como frase: período, comprobante y cuenta", () => {
    assert.equal(formatearValorAuditado("periodo", { mes: 11, anio: 2026, estado: "abierto" }), "Noviembre 2026 · abierto");
    assert.equal(formatearValorAuditado("periodo", { mes: 11, anio: 2026 }), "Noviembre 2026");
    assert.equal(
        formatearValorAuditado("revierte_a", { tipo_comprobante: "I", numero: 3, anio: 2026, fecha_contable: "2026-10-30", id_asiento: ID(9) }),
        "I-3 / 2026 · 30-10-2026",
    );
    assert.equal(formatearValorAuditado("cuenta", { codigo: "1101001", nombre: "Caja" }), "1101001 · Caja");
    assert.equal(formatearValorAuditado("is_active", true), "Sí");
    assert.equal(formatearValorAuditado("tipo_comprobante", "T"), "Traspaso");
    assert.equal(formatearValorAuditado("id_tipo_cuenta", 4), "Ingresos");
    assert.equal(formatearValorAuditado("id_impuesto", 1), "IVA");
    assert.equal(formatearValorAuditado("origen", "manual"), "Manual");
    assert.equal(formatearValorAuditado("rubro_eeff", "activo_corriente"), "Activo corriente");
    // Un objeto desconocido sigue saliendo como JSON compacto, y uno vacío como "vacío".
    assert.equal(formatearValorAuditado("raro", { a: 1 }), '{"a":1}');
    assert.equal(sinValor({}), true);
});

test("lista de movimientos: mini tabla con cuenta, debe y haber, en orden", () => {
    const tabla = tablaDeLista("movimientos", ASIENTO.movimientos);
    assert.deepEqual(tabla.columnas.map((c) => c.titulo), ["Cuenta", "Debe", "Haber"]);
    assert.deepEqual(tabla.filas, [
        ["1101001 · Caja", "$12.000", "—"],
        ["4101001 · Ventas", "—", "$12.000"],
    ]);
    assert.equal(tabla.columnas[1].numerica, true);
});

test("líneas con solo el id de la cuenta: 'Cuenta' y una versión corta, sin inventar nada", () => {
    const tabla = tablaDeLista("lineas", [{ id_cuenta: "f880a2e5-44bf-4a75-bd3a-06e00c76a60e", debe: "1650040" }, { haber: "1963548" }]);
    assert.deepEqual(tabla.filas, [
        ["Cuenta f880a2e5", "$1.650.040", "—"],
        ["Cuenta", "—", "$1.963.548"],
    ]);
    assert.equal(nombreDeCuentaDeLinea({ cuenta: { codigo: "1101001" } }), "1101001");
});

test("listas desconocidas o vacías no son tabla: salen como conteo", () => {
    assert.equal(tablaDeLista("cosas", [{ a: 1 }]), null);
    assert.equal(tablaDeLista("movimientos", []), null);
    assert.equal(tablaDeLista("movimientos", ["texto"]), null);
    assert.equal(formatearValorAuditado("cosas", [1, 2]), "2 elementos");
    assert.equal(formatearValorAuditado("creados", [{ id: "x" }]), "1 elemento");
});

test("creación de un asiento: comprobante primero, ids al detalle técnico, vacíos ocultos", () => {
    const { entradas, tecnicos } = prepararDatos(ASIENTO, ctx("asientos-contables", { personas: new Map([[ID(1), "Ana Pérez"]]) }));
    const etiquetas = entradas.map((e) => e.etiqueta);
    // Lo más importante primero (comprobante, fecha, glosa, valor, origen, período, movimientos); el resto, después.
    assert.deepEqual(etiquetas, [
        "Comprobante", "Fecha contable", "Glosa", "Valor del comprobante", "Origen", "Período", "Movimientos", "Creado el", "Creado por",
    ]);
    const valor = (clave) => entradas.find((e) => e.clave === clave)?.valor;
    assert.equal(valor("comprobante"), "T-3 / 2026");
    assert.equal(valor("fecha_contable"), "20-11-2026");
    assert.equal(valor("valor_comprobante"), "$12.000");
    assert.equal(valor("origen"), "Manual");
    assert.equal(valor("periodo"), "Noviembre 2026 · abierto");
    assert.equal(valor("created_by"), "Ana Pérez");
    // Lo vacío de una creación no se muestra, ni como campo ni como "vacío".
    for (const clave of ["revierte_a", "revertido_por", "id_asiento_revertido", "id_documento"]) {
        assert.equal(entradas.some((e) => e.clave === clave), false, clave);
        assert.equal(tecnicos.some((e) => e.clave === clave), false, clave);
    }
    assert.equal(JSON.stringify(entradas).includes("vacío"), false);
    // Los ids internos no son datos: van al detalle técnico, con su uuid.
    assert.deepEqual(tecnicos.map((t) => t.clave).sort(), ["id_asiento", "id_periodo"]);
    assert.equal(tecnicos.find((t) => t.clave === "id_asiento").valor, ID(2));
    assert.equal(tecnicos.find((t) => t.clave === "id_asiento").etiqueta, "Asiento (ID)");
    // Ningún uuid se cuela en los datos normales.
    assert.equal(JSON.stringify(entradas).includes("0a1b2c3d-0000"), false);
    // Dos campos nunca comparten etiqueta.
    assert.equal(new Set(etiquetas).size, etiquetas.length);
});

test("el uuid de una persona que no se conoce va al detalle técnico, no a los datos", () => {
    const sin = prepararDatos({ nombre: "A", created_by: ID(1) }, ctx("terceros"));
    assert.deepEqual(sin.entradas.map((e) => e.clave), ["nombre"]);
    assert.deepEqual(sin.tecnicos.map((e) => e.clave), ["created_by"]);
    const con = prepararDatos({ nombre: "A", created_by: ID(1) }, ctx("terceros", { personas: new Map([[ID(1), "Ana"]]) }));
    assert.deepEqual(con.entradas.map((e) => e.clave), ["nombre", "created_by"]);
    assert.equal(esCampoTecnico("id_rol", 2, ctx("usuarios")), false);
    assert.equal(esCampoTecnico("clientes", ID(5), ctx("contabilizacion")), true);
    assert.equal(esCampoTecnico("version_lock", 3, ctx("documentos")), true);
});

test("una creación sin otros datos deja la lista vacía (la pantalla dice 'Sin otros datos')", () => {
    const { entradas, tecnicos } = prepararDatos({ id_empresa: ID(1), nombre: null, codigo_sii: "", analitica: null }, ctx("cuentas-contables"));
    assert.deepEqual(entradas, []);
    assert.deepEqual(tecnicos.map((t) => t.clave), ["id_empresa"]);
    assert.deepEqual(prepararDatos(null, ctx("terceros")), { entradas: [], tecnicos: [] });
});

test("actualización: lo que pasó a vacío SÍ se muestra; vacío → vacío no", () => {
    const cambios = [
        { campo: "nombre", antes: "Caja", despues: "Caja general" },
        { campo: "codigo_sii", antes: "123", despues: null },
        { campo: "motivo_reapertura", antes: null, despues: null },
        { campo: "id_cuenta_padre", antes: ID(1), despues: ID(2) },
        { campo: "is_active", antes: true, despues: false },
    ];
    const { cambios: visibles, tecnicos } = prepararCambios(cambios, ctx("cuentas-contables"));
    assert.deepEqual(visibles.map((c) => [c.etiqueta, c.antes, c.despues]), [
        ["Nombre", "Caja", "Caja general"],
        ["Código SII", "123", "vacío"],
        ["Activo", "Sí", "No"],
    ]);
    // El cambio de un id interno no se lee como dato: va al detalle técnico.
    assert.deepEqual(tecnicos.map((c) => [c.etiqueta, c.antes, c.despues]), [["Cuenta padre (ID)", ID(1), ID(2)]]);
});

test("el orden de los campos sale del arreglo de la entidad; lo que no figura va al final", () => {
    assert.deepEqual(
        ordenarClaves("asientos-contables", ["glosa", "campo_nuevo", "movimientos", "fecha_contable", "comprobante", "otro_nuevo"]),
        ["comprobante", "fecha_contable", "glosa", "movimientos", "campo_nuevo", "otro_nuevo"],
    );
    // Una entidad sin orden definido conserva el orden en que llegó.
    assert.deepEqual(ordenarClaves("entidad-nueva", ["b", "a"]), ["b", "a"]);
    assert.deepEqual(ordenarClaves("constructor", ["b", "a"]), ["b", "a"]);
    const { entradas } = prepararDatos({ is_active: true, rut: "76.123.456-7", razon_social: "Ñandú SpA", tipo_persona: "J" }, ctx("terceros"));
    assert.deepEqual(entradas.map((e) => e.clave), ["rut", "razon_social", "tipo_persona", "is_active"]);
});

test("el correo no se muestra a quien no puede verlo, ni en datos ni en cambios", () => {
    const datos = { nombre_completo: "Ana", correo: "ana@finova.cl", id_rol: 2 };
    assert.equal(prepararDatos(datos, ctx("usuarios")).entradas.some((e) => e.clave === "correo"), false);
    assert.equal(prepararDatos(datos, ctx("usuarios", { verCorreo: true })).entradas.some((e) => e.clave === "correo"), true);
    const cambios = [{ campo: "correo", antes: "a@x.cl", despues: "b@x.cl" }];
    assert.deepEqual(prepararCambios(cambios, ctx("usuarios")).cambios, []);
    assert.equal(prepararCambios(cambios, ctx("usuarios", { verCorreo: true })).cambios.length, 1);
    // Nunca aparece la IP ni el navegador: no son campos de la foto del evento.
    assert.equal(JSON.stringify(prepararDatos(datos, ctx("usuarios"))).includes("ana@finova.cl"), false);
});

test("encabezados: creación y demás 'Datos registrados'; eliminación 'Datos eliminados'", () => {
    assert.equal(tituloDeDatos("crear"), "Datos registrados");
    assert.equal(tituloDeDatos("exportar"), "Datos registrados");
    assert.equal(tituloDeDatos("eliminar"), "Datos eliminados");
});

test("registro afectado: dice cuál es cuando la foto trae un dato legible", () => {
    assert.equal(descripcionDelRegistro("asientos-contables", null, ASIENTO), "Asiento T-3 / 2026");
    assert.equal(descripcionDelRegistro("terceros", null, { razon_social: "Ferretería Ñandú Ltda", rut: "76.1-9" }), "Tercero · Ferretería Ñandú Ltda");
    assert.equal(descripcionDelRegistro("terceros", { rut: "76.1-9" }, null), "Tercero · 76.1-9");
    assert.equal(descripcionDelRegistro("cuentas-contables", null, { codigo: "1101001", nombre: "Caja" }), "Cuenta contable · 1101001 · Caja");
    assert.equal(descripcionDelRegistro("periodos-contables", null, { mes: 11, anio: 2026 }), "Período · Noviembre 2026");
    assert.equal(descripcionDelRegistro("f29", null, { periodo: "2026-10" }), "Formulario F29 · Octubre 2026");
    // Sin dato legible, o con una entidad que no se sabe nombrar, se queda solo el tipo (null).
    assert.equal(descripcionDelRegistro("terceros", { is_active: true }, null), null);
    assert.equal(descripcionDelRegistro("asientos-contables", null, { glosa: "x" }), null);
    assert.equal(descripcionDelRegistro("entidad-nueva", null, { nombre: "x" }), null);
});

test("documentos: líneas e impuestos como tabla, versión y claves en el detalle técnico", () => {
    const documento = {
        estado: "borrador",
        codigo_iso: "CLP",
        monto_neto: "100000.0000",
        monto_total: "119000.0000",
        version_lock: 1,
        idempotency_key: null,
        id_documento: ID(1),
        id_tercero: ID(2),
        fecha_emision: "2026-09-13",
        fecha_vencimiento: null,
        detalles: [{ snapshot_nombre: "Asesoría", cantidad: "2.0000", precio_unitario: "50000.0000", subtotal: "100000.0000", id_detalle: ID(3) }],
        impuestos: [{ id_impuesto: 1, monto_impuesto: "19000.0000", id_doc_impuesto: ID(4) }],
    };
    const { entradas, tecnicos } = prepararDatos(documento, ctx("documentos"));
    assert.deepEqual(entradas.map((e) => e.clave), ["estado", "fecha_emision", "monto_neto", "monto_total", "codigo_iso", "detalles", "impuestos"]);
    assert.deepEqual(entradas.find((e) => e.clave === "detalles").filas, [["Asesoría", "2", "$50.000", "$100.000"]]);
    assert.deepEqual(entradas.find((e) => e.clave === "impuestos").filas, [["IVA", "$19.000"]]);
    assert.equal(entradas.find((e) => e.clave === "monto_total").valor, "$119.000");
    assert.deepEqual(tecnicos.map((t) => t.clave).sort(), ["id_documento", "id_tercero", "version_lock"]);
});

test("otras entidades: período contable, importación del SII, avisos y empresa eliminada", () => {
    const periodo = prepararDatos({ mes: 10, anio: 2026, estado: "abierto", cerrado_at: null, id_periodo: ID(1), id_empresa: ID(2) }, ctx("periodos-contables"));
    assert.deepEqual(periodo.entradas.map((e) => [e.etiqueta, e.valor]), [["Período", "Octubre 2026"], ["Estado", "Abierto"]]);

    const sii = prepararDatos(
        { tipo: "compras", nombre_archivo: "rcv.csv", estado: "completada", modo: "confirmar", resumen: { leidos: 7, nuevos: 7, errores: [], omitidos: 0, con_error: 0 }, avisos: ["Aviso uno", "Aviso dos"], muestra: { filas: [["x"]] }, sha256: "abc" },
        ctx("sii"),
    );
    assert.equal(sii.entradas.find((e) => e.clave === "resumen").valor, "7 leídos · 7 nuevos");
    assert.deepEqual(sii.entradas.find((e) => e.clave === "avisos").items, ["Aviso uno", "Aviso dos"]);
    assert.deepEqual(sii.tecnicos.map((t) => t.clave).sort(), ["muestra", "sha256"]);

    assert.deepEqual(prepararDatos({ message: "Empresa eliminada" }, ctx("empresas")).entradas.map((e) => [e.etiqueta, e.valor]), [["Mensaje", "Empresa eliminada"]]);
    assert.deepEqual(prepararDatos({ creados: [{ id: ID(1), id_borrador: ID(2) }], errores: [], con_error: null }, ctx("contabilizacion")).entradas.map((e) => [e.etiqueta, e.valor]), [["Asientos creados", "1 elemento"]]);
});

test("el detalle técnico es siempre una lista aparte: ningún uuid queda entre los datos de ninguna entidad", () => {
    const fotos = {
        articulos: { nombre: "A", is_active: true, id_empresa: ID(1), id_articulo: ID(2), id_cuenta_costo: null, id_cuenta_ingreso: ID(3) },
        "configuracion-impuestos": { id_cuenta: ID(1), id_empresa: ID(2), id_impuesto: 1, id_empresa_impuesto: ID(3) },
        contabilizacion: { clientes: ID(1) },
        terceros: { rut: "1-9", razon_social: "X", id_empresa: ID(1), id_tercero: ID(2), created_by: ID(3), deleted_at: null },
        usuarios: { id_usuario: ID(1), nombre_completo: "N", id_rol: 2, rut: "1-9" },
        f29: { periodo: "2026-10", estado: "borrador", version: 4, created_by: ID(1), id_propuesta_f29: ID(2), foto: null },
    };
    for (const [entidad, foto] of Object.entries(fotos)) {
        const { entradas } = prepararDatos(foto, ctx(entidad));
        assert.equal(JSON.stringify(entradas).includes("0a1b2c3d-0000"), false, entidad);
    }
});
