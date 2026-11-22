/* ============================================================================
   Auditoría: cómo se nombra en pantalla lo que el backend registra.

   Todo es texto puro, sin nada de servidor ni de React. Lo que el backend
   agregue y aquí no figure (una acción, un tipo de registro o un campo nuevo)
   se muestra tal cual viene, para no romper la pantalla.
   ========================================================================== */

import {
    formatearCLP,
    formatearComprobante,
    formatearFechaContable,
    formatearFechaHoraChile,
    nombrePeriodo,
} from "./formato.ts";

/** Busca solo en la tabla, no en el prototipo: una acción llamada "constructor" no es una etiqueta. */
function propio<T>(tabla: Readonly<Record<string, T>>, clave: string): T | undefined {
    return Object.prototype.hasOwnProperty.call(tabla, clave) ? tabla[clave] : undefined;
}

const ETIQUETA_ACCION: Readonly<Record<string, string>> = {
    crear: "Creó",
    leer: "Consultó",
    actualizar: "Modificó",
    eliminar: "Eliminó",
    exportar: "Exportó",
    login: "Inició sesión",
    login_fallido: "Intento de ingreso fallido",
    cambiar_empresa: "Cambió de empresa",
};

/** Las acciones que el filtro ofrece, en el orden de la lista. */
export const ACCIONES: readonly string[] = Object.keys(ETIQUETA_ACCION);

export const etiquetaAccion = (accion: string): string => propio(ETIQUETA_ACCION, accion) ?? accion;

const ETIQUETA_ENTIDAD: Readonly<Record<string, string>> = {
    terceros: "Tercero",
    usuarios: "Usuario",
    // Las filas anteriores a que /users se llamara usuarios dicen "users".
    users: "Usuario",
    documentos: "Documento",
    "asientos-contables": "Asiento",
    "asientos-borradores": "Borrador de asiento",
    empresas: "Empresa",
    "cuentas-contables": "Cuenta contable",
    articulos: "Artículo",
    "periodos-contables": "Período",
    "configuracion-impuestos": "Configuración de impuestos",
    contabilizacion: "Contabilización",
    f29: "Formulario F29",
    "notas-eeff": "Notas de los estados financieros",
    sii: "Importación del SII",
    auditoria: "Auditoría",
    auth: "Sesión",
    copiloto: "Copiloto",
};

/** Los tipos de registro que el filtro ofrece. "users" no: filtrar por "usuarios" ya trae también esas filas. */
export const ENTIDADES: readonly string[] = Object.keys(ETIQUETA_ENTIDAD).filter((e) => e !== "users");

export const etiquetaEntidad = (entidad: string): string => propio(ETIQUETA_ENTIDAD, entidad) ?? entidad;

/** Pantallas de detalle que existen hoy; el resto de los registros se nombra sin enlace. */
const RUTA_DEL_DETALLE: Readonly<Record<string, string>> = {
    "asientos-contables": "/dashboard/core-contable",
    terceros: "/dashboard/terceros",
};

export function enlaceAlRegistro(entidad: string, idRegistro: string | null): string | null {
    const base = propio(RUTA_DEL_DETALLE, entidad);
    return base && idRegistro ? `${base}/${encodeURIComponent(idRegistro)}` : null;
}

const ETIQUETA_CAMPO: Readonly<Record<string, string>> = {
    rut: "RUT",
    razon_social: "Razón social",
    tipo_persona: "Tipo de persona",
    es_cliente: "Es cliente",
    es_proveedor: "Es proveedor",
    is_active: "Activo",
    id_rol: "Rol",
    codigo: "Código",
    nombre: "Nombre",
    id_tipo_cuenta: "Tipo de cuenta",
    id_cuenta_padre: "Cuenta padre",
    acepta_movimiento: "Acepta movimientos",
    analitica: "Analítica",
    codigo_sii: "Código SII",
    rubro_eeff: "Rubro de los estados financieros",
    id_cuenta_ingreso: "Cuenta de ingreso",
    id_cuenta_costo: "Cuenta de costo",
    id_cuenta: "Cuenta",
    estado: "Estado",
    cerrado_at: "Cerrado el",
    cerrado_por: "Cerrado por",
    motivo_reapertura: "Motivo de reapertura",
    anio: "Año",
    mes: "Mes",
    // Lo que trae el registro completo de una creación.
    created_at: "Creado el",
    created_by: "Creado por",
    updated_at: "Modificado el",
    deleted_at: "Dado de baja el",
    id_empresa: "Empresa",
    id_tercero: "Tercero",
    id_articulo: "Artículo",
    id_documento: "Documento",
    id_asiento: "Asiento",
    id_periodo: "Período",
    id_usuario: "Persona",
    // Cambio de empresa y lo que guardan otras rutas con su propio nombre.
    id_empresa_nueva: "Empresa nueva",
    motivo: "Motivo",
    id_empresa_impuesto: "Configuración de impuestos",
    id_propuesta_f29: "Propuesta del F29",
    id_importacion: "Importación",
    // Lo que trae el registro completo de un documento, un período del F29 o una importación.
    detalles: "Detalle",
    impuestos: "Impuestos",
    codigo_iso: "Moneda",
    monto_neto: "Monto neto",
    monto_total: "Monto total",
    version: "Versión",
    version_lock: "Versión",
    fecha_emision: "Fecha de emisión",
    fecha_vencimiento: "Fecha de vencimiento",
    fecha_presentacion: "Fecha de presentación",
    idempotency_key: "Clave de idempotencia",
    origen_transaccion: "Origen",
    origen: "Origen",
    tasa_cambio_historica: "Tasa de cambio",
    periodo: "Período",
    folio_sii: "Folio SII",
    foto: "Cálculo guardado",
    utm_actual: "UTM actual",
    utm_anterior: "UTM anterior",
    remanente_anterior: "Remanente anterior",
    remanente_siguiente: "Remanente siguiente",
    total_a_pagar: "Total a pagar",
    updated_by: "Modificado por",
    aprobada_por: "Aprobada por",
    aprobada_en: "Aprobada el",
    declarada_por: "Declarada por",
    declarada_en: "Declarada el",
    tipo: "Tipo",
    sha256: "Huella del archivo (SHA-256)",
    resumen: "Resumen",
    nombre_archivo: "Archivo",
    nombre_completo: "Nombre",
    correo: "Correo",
    desde: "Con acceso desde",
    vinculado: "Ya tenía cuenta",
    // Las cuentas de contabilización se registran por función.
    clientes: "Cuenta de clientes",
    proveedores: "Cuenta de proveedores",
    ventas: "Cuenta de ventas",
    compras: "Cuenta de compras",
    activo_fijo: "Cuenta de activo fijo",
    iva_debito: "Cuenta de IVA débito",
    iva_credito: "Cuenta de IVA crédito",
    iva_retenido: "Cuenta de IVA retenido",
    honorarios_gasto: "Cuenta de gasto en honorarios",
    retencion_honorarios: "Cuenta de retención de honorarios",
    honorarios_por_pagar: "Cuenta de honorarios por pagar",
    // Asientos y borradores.
    comprobante: "Comprobante",
    tipo_comprobante: "Tipo de comprobante",
    numero: "Número",
    fecha_contable: "Fecha contable",
    glosa: "Glosa",
    valor_comprobante: "Valor del comprobante",
    revierte_a: "Revierte a",
    revertido_por: "Revertido por",
    id_asiento_revertido: "Asiento revertido",
    movimientos: "Movimientos",
    lineas: "Líneas",
    id_borrador: "Borrador",
    id_documento_sii: "Documento del SII",
    id_honorario_sii: "Boleta de honorarios",
    id_movimiento: "Movimiento",
    orden: "Orden",
    debe: "Debe",
    haber: "Haber",
    cuenta: "Cuenta",
    tercero: "Tercero",
    // Documentos.
    id_impuesto: "Impuesto",
    id_doc_impuesto: "Impuesto del documento",
    id_detalle: "Línea",
    monto_impuesto: "Monto del impuesto",
    cantidad: "Cantidad",
    subtotal: "Subtotal",
    precio_unitario: "Precio unitario",
    snapshot_nombre: "Descripción",
    // Contabilización y cuentas.
    creados: "Asientos creados",
    contabilizados: "Contabilizados",
    con_error: "Con error",
    errores: "Errores",
    resultados: "Resultados",
    cuentas_creadas: "Cuentas creadas",
    cuentas_reubicadas: "Cuentas reubicadas",
    // Notas de los estados financieros, importaciones del SII y otros.
    message: "Mensaje",
    giro: "Giro",
    domicilio: "Domicilio",
    ejercicio: "Ejercicio",
    fecha_autorizacion: "Fecha de autorización",
    clave: "Clave",
    texto: "Texto",
    actualizado_en: "Actualizado el",
    avisos: "Avisos",
    muestra: "Muestra del archivo",
    totales: "Totales",
    modo: "Modo",
    periodo_sugerido: "Período sugerido",
};

/**
 * Un nombre de campo en palabras, para lo que el diccionario no conoce:
 * "fecha_contable" -> "Fecha contable". Nunca queda en MAYUSCULAS_CON_GUION_BAJO.
 */
export function textoLegible(clave: string): string {
    const texto = clave
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_\-.]+/g, " ")
        .trim()
        .toLowerCase();
    return texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : clave;
}

export const etiquetaCampo = (campo: string): string => propio(ETIQUETA_CAMPO, campo) ?? textoLegible(campo);

const NOMBRE_ROL: Readonly<Record<string, string>> = { "1": "Administrador", "2": "Contador", "3": "Consulta" };
const NOMBRE_TIPO_PERSONA: Readonly<Record<string, string>> = { N: "Persona natural", J: "Persona jurídica" };
const NOMBRE_TIPO_COMPROBANTE: Readonly<Record<string, string>> = { I: "Ingreso", E: "Egreso", T: "Traspaso" };
/** cat_tipo_cuenta: 1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingreso, 5 Gasto (el mismo orden de lib/planCuentas.ts). */
const NOMBRE_TIPO_CUENTA: Readonly<Record<string, string>> = {
    "1": "Activos",
    "2": "Pasivos",
    "3": "Patrimonio",
    "4": "Ingresos",
    "5": "Costos y gastos",
};
const NOMBRE_IMPUESTO: Readonly<Record<string, string>> = { "1": "IVA" };

/** Nombre de un impuesto por su id; sin nombre conocido, "Impuesto 7". */
export const nombreDeImpuesto = (id: unknown): string => propio(NOMBRE_IMPUESTO, String(id)) ?? `Impuesto ${String(id)}`;

/** Campos que guardan el uuid de una persona: created_by, cerrado_por, id_usuario… */
export const CAMPO_DE_PERSONA = /^id_usuario$|_por$|_by$/;

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
export const esUuid = (valor: unknown): valor is string => typeof valor === "string" && UUID.test(valor);

/**
 * Campos que son un monto en pesos, por entidad. Un monto sale como "$12.000"; el mismo nombre
 * en otra entidad (una "cantidad", un "numero") no se toca.
 */
const CAMPOS_DE_MONTO: Readonly<Record<string, readonly string[]>> = {
    "asientos-contables": ["valor_comprobante", "debe", "haber"],
    "asientos-borradores": ["valor_comprobante", "debe", "haber"],
    documentos: ["monto_neto", "monto_total", "monto_impuesto", "subtotal", "precio_unitario"],
    f29: ["total_a_pagar", "remanente_anterior", "remanente_siguiente", "utm_actual", "utm_anterior"],
};

export function esMonto(entidad: string | undefined, campo: string): boolean {
    const lista = entidad === undefined ? undefined : propio(CAMPOS_DE_MONTO, entidad);
    return lista?.includes(campo) ?? false;
}

/** Campos cuyo valor es una palabra clave del sistema ("abierto", "activo_corriente"): se leen como frase. */
const CAMPOS_CON_PALABRA_CLAVE: ReadonlySet<string> = new Set(["estado", "origen", "origen_transaccion", "modo", "tipo", "rubro_eeff"]);

const capitalizar = (texto: string): string => (texto ? texto.charAt(0).toUpperCase() + texto.slice(1) : texto);
const FECHA_SOLA = /^\d{4}-\d{2}-\d{2}$/;
const PERIODO_TEXTO = /^(\d{4})-(\d{2})$/;
const NUMERO_CON_DECIMALES = /^-?\d+\.\d+$/;
const NUMERO_CHILE = new Intl.NumberFormat("es-CL", { maximumFractionDigits: 4 });

/** "Noviembre 2026" a partir del año y el mes (1-12). */
const periodoEnPalabras = (anio: number, mes: number): string => capitalizar(nombrePeriodo(anio, mes));
const esObjeto = (valor: unknown): valor is Record<string, unknown> =>
    typeof valor === "object" && valor !== null && !Array.isArray(valor);

const INSTANTE_ISO = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d+)?Z$/;
const LARGO_MAXIMO = 400;

/** null, "", una lista sin elementos o un objeto sin claves: no hay dato que mostrar. */
export function sinValor(valor: unknown): boolean {
    if (valor === null || valor === undefined || valor === "") return true;
    if (Array.isArray(valor)) return valor.length === 0;
    return esObjeto(valor) && Object.keys(valor).length === 0;
}

/**
 * Un valor del antes o del después, legible. Es texto: React lo escapa al
 * mostrarlo.
 *
 * - Fechas: DD-MM-AAAA; con hora, la de Chile.
 * - Montos (según `entidad`): "$12.000". Números sin decimales de más: 12000.0000 -> 12000.
 * - Objetos conocidos como frase: un período ("Noviembre 2026 · abierto"), un
 *   comprobante ("T-3 / 2026"), una cuenta ("1101001 · Caja").
 * - Sí / No para los booleanos; las listas, como un conteo.
 * - Lo demás, tal cual: un objeto desconocido sale como JSON compacto (lo muy
 *   largo se corta).
 *
 * `personas` (uuid en minúsculas → nombre) cambia el uuid de una persona de la
 * empresa por su nombre; si no está, queda el valor.
 */
export function formatearValorAuditado(
    campo: string,
    valor: unknown,
    personas?: ReadonlyMap<string, string>,
    entidad?: string,
): string {
    if (sinValor(valor)) return "vacío";
    if (Array.isArray(valor)) return `${valor.length} ${valor.length === 1 ? "elemento" : "elementos"}`;
    if (typeof valor === "string" && CAMPO_DE_PERSONA.test(campo)) return personas?.get(valor.toLowerCase()) ?? valor;
    if (typeof valor === "boolean") return valor ? "Sí" : "No";
    if (campo === "id_rol" && (typeof valor === "number" || typeof valor === "string")) {
        return propio(NOMBRE_ROL, String(valor)) ?? String(valor);
    }
    if (campo === "tipo_persona" && typeof valor === "string") return propio(NOMBRE_TIPO_PERSONA, valor) ?? valor;
    if (campo === "tipo_comprobante" && typeof valor === "string") return propio(NOMBRE_TIPO_COMPROBANTE, valor) ?? valor;
    if (campo === "id_tipo_cuenta" && (typeof valor === "number" || typeof valor === "string")) {
        return propio(NOMBRE_TIPO_CUENTA, String(valor)) ?? String(valor);
    }
    if (campo === "id_impuesto" && (typeof valor === "number" || typeof valor === "string")) return nombreDeImpuesto(valor);

    if (esObjeto(valor)) return formatearObjeto(campo, valor, entidad);

    // Un instante llega en UTC; en pantalla va en horario de Chile.
    if (typeof valor === "string" && INSTANTE_ISO.test(valor)) return formatearFechaHoraChile(valor);
    if (typeof valor === "string" && FECHA_SOLA.test(valor)) return formatearFechaContable(valor);
    if ((campo === "periodo" || campo === "periodo_sugerido") && typeof valor === "string") {
        const periodo = PERIODO_TEXTO.exec(valor);
        if (periodo) return periodoEnPalabras(Number(periodo[1]), Number(periodo[2]));
    }
    if (esMonto(entidad, campo) && (typeof valor === "number" || (typeof valor === "string" && /^-?\d+(\.\d+)?$/.test(valor)))) {
        return formatearCLP(valor);
    }
    if (typeof valor === "number") return String(valor);
    if (typeof valor === "string" && NUMERO_CON_DECIMALES.test(valor)) return NUMERO_CHILE.format(Number(valor));
    if (typeof valor === "string" && CAMPOS_CON_PALABRA_CLAVE.has(campo)) return capitalizar(valor.replace(/_/g, " "));

    const texto = String(valor);
    return texto.length > LARGO_MAXIMO ? `${texto.slice(0, LARGO_MAXIMO)}…` : texto;
}

/** Los objetos que el backend guarda con una forma conocida, dichos en una frase. */
function formatearObjeto(campo: string, valor: Record<string, unknown>, entidad: string | undefined): string {
    const { mes, anio, estado, numero, tipo_comprobante: tipo, codigo, nombre } = valor;
    if (Number.isInteger(mes) && Number.isInteger(anio)) {
        return `${periodoEnPalabras(anio as number, mes as number)}${typeof estado === "string" && estado ? ` · ${estado}` : ""}`;
    }
    if (typeof tipo === "string" && Number.isInteger(numero) && Number.isInteger(anio)) {
        const fecha = valor.fecha_contable;
        const cuando = typeof fecha === "string" && FECHA_SOLA.test(fecha) ? ` · ${formatearFechaContable(fecha)}` : "";
        return `${formatearComprobante(tipo, numero as number, anio as number)}${cuando}`;
    }
    if (typeof codigo === "string") return typeof nombre === "string" && nombre ? `${codigo} · ${nombre}` : codigo;
    if (entidad === "sii" && campo === "resumen") return resumenDeImportacion(valor);
    if (campo === "foto" && Array.isArray(valor.lineas)) return `${valor.lineas.length} líneas del cálculo`;

    const texto = JSON.stringify(valor);
    return texto.length > LARGO_MAXIMO ? `${texto.slice(0, LARGO_MAXIMO)}…` : texto;
}

const CONTEOS_DE_IMPORTACION: readonly (readonly [string, string])[] = [
    ["leidos", "leídos"],
    ["nuevos", "nuevos"],
    ["actualizados", "actualizados"],
    ["omitidos", "omitidos"],
    ["con_error", "con error"],
    ["con_advertencia", "con advertencia"],
];

/** "7 leídos · 7 nuevos": los conteos de una importación del SII que no son cero. */
function resumenDeImportacion(resumen: Record<string, unknown>): string {
    const partes = CONTEOS_DE_IMPORTACION.flatMap(([clave, texto]) =>
        typeof resumen[clave] === "number" && resumen[clave] !== 0 ? [`${resumen[clave]} ${texto}`] : [],
    );
    return partes.length > 0 ? partes.join(" · ") : "Sin documentos";
}

const esVacio = (campo: string, valor: unknown): boolean => formatearValorAuditado(campo, valor) === "vacío";

/** Quita los campos que en pantalla serían "vacío → vacío" (una eliminación trae muchos). */
export function cambiosVisibles<T extends { readonly campo: string; readonly antes?: unknown; readonly despues?: unknown }>(
    cambios: readonly T[],
): T[] {
    return cambios.filter((c) => !(esVacio(c.campo, c.antes) && esVacio(c.campo, c.despues)));
}

/** El backend rechaza una página mayor a esto con 400 (PAGINA_MAXIMA). */
export const PAGINA_MAXIMA = 1_000_000;

/** La página que pide la URL: entera, entre 1 y PAGINA_MAXIMA. "1e20" cuenta como enorme, no como 1. */
export function paginaPedida(texto: string | undefined): number {
    const n = Math.floor(Number(texto ?? "1"));
    return Number.isFinite(n) ? Math.min(Math.max(n, 1), PAGINA_MAXIMA) : n > 0 ? PAGINA_MAXIMA : 1;
}

/** La página pedida si existe; si se pasa, la última (mínimo 1). Con total 0, 1. */
export function paginaValida(pagina: number, total: number, porPagina: number): number {
    const ultima = porPagina >= 1 && total > 0 ? Math.ceil(total / porPagina) : 1;
    return Math.min(Math.max(Math.floor(pagina) || 1, 1), ultima);
}
