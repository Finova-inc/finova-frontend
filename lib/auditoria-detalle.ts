/* ============================================================================
   Detalle de un evento de auditoría: qué campos se muestran, en qué orden y
   cómo se leen. Texto puro, sin React ni servidor, para probarlo sin navegador.

   El backend guarda la "foto" de cada registro tal como la tiene: con sus ids
   internos, objetos y listas anidadas. Aquí se convierte en lo que una persona
   quiere leer, igual para TODAS las entidades auditadas:

   - los ids internos (uuid) no se muestran como datos: van aparte, en un
     "Detalle técnico";
   - los campos vacíos de una creación no se muestran;
   - las listas conocidas (movimientos, líneas, impuestos) salen como tabla;
   - lo más importante de cada entidad va primero (ORDEN_POR_ENTIDAD).

   Lo que el evento no guardó no se inventa, y nada consulta al backend: una
   cuenta que solo trae su id se nombra "Cuenta 1a2b3c4d".
   ========================================================================== */

import type { CambioAuditado } from "./api";
import {
    CAMPO_DE_PERSONA,
    cambiosVisibles,
    esUuid,
    etiquetaCampo,
    etiquetaEntidad,
    formatearValorAuditado,
    nombreDeImpuesto,
    sinValor,
    textoLegible,
} from "./auditoria.ts";
import { formatearCLP, formatearComprobante, nombrePeriodo } from "./formato.ts";

export type Datos = Readonly<Record<string, unknown>>;

export type ContextoDelDetalle = {
    readonly entidad: string;
    /** uuid en minúsculas → nombre. */
    readonly personas?: ReadonlyMap<string, string>;
    /** Solo el administrador ve el correo: para el resto el campo no se dibuja. */
    readonly verCorreo: boolean;
};

export type Columna = { readonly titulo: string; readonly numerica: boolean };

export type Entrada =
    | { readonly tipo: "texto"; readonly clave: string; readonly etiqueta: string; readonly valor: string; readonly items?: readonly string[] }
    | {
          readonly tipo: "tabla";
          readonly clave: string;
          readonly etiqueta: string;
          readonly columnas: readonly Columna[];
          readonly filas: readonly (readonly string[])[];
      };

/* ---------------------------------------------------------------------------
   Orden: lo importante primero. Un arreglo por entidad; lo que no figura va al
   final, en el orden en que el backend lo guardó.
   -------------------------------------------------------------------------- */

export const ORDEN_POR_ENTIDAD: Readonly<Record<string, readonly string[]>> = {
    "asientos-contables": [
        "comprobante", "tipo_comprobante", "numero", "fecha_contable", "glosa", "valor_comprobante",
        "origen", "periodo", "revierte_a", "revertido_por", "movimientos",
    ],
    "asientos-borradores": ["glosa", "fecha_contable", "tipo_comprobante", "valor_comprobante", "origen", "periodo", "lineas"],
    documentos: [
        "codigo_sii", "estado", "fecha_emision", "fecha_vencimiento", "monto_neto", "monto_total",
        "codigo_iso", "tasa_cambio_historica", "origen_transaccion", "detalles", "impuestos",
    ],
    terceros: ["rut", "razon_social", "tipo_persona", "es_cliente", "es_proveedor", "is_active"],
    "cuentas-contables": ["codigo", "nombre", "id_tipo_cuenta", "acepta_movimiento", "analitica", "rubro_eeff", "codigo_sii", "is_active"],
    articulos: ["nombre", "is_active"],
    "periodos-contables": ["periodo", "estado", "cerrado_at", "cerrado_por", "motivo_reapertura"],
    empresas: ["rut", "razon_social", "message"],
    usuarios: ["nombre_completo", "rut", "correo", "id_rol", "desde", "vinculado", "is_active", "motivo"],
    users: ["nombre_completo", "rut", "correo", "id_rol", "desde", "vinculado", "is_active"],
    f29: [
        "periodo", "estado", "total_a_pagar", "remanente_anterior", "remanente_siguiente", "utm_actual", "utm_anterior",
        "folio_sii", "fecha_presentacion", "aprobada_en", "aprobada_por", "declarada_en", "declarada_por", "foto",
    ],
    "configuracion-impuestos": ["id_impuesto", "id_cuenta"],
    contabilizacion: ["creados", "contabilizados", "con_error", "errores", "resultados"],
    "notas-eeff": ["ejercicio", "clave", "giro", "domicilio", "fecha_autorizacion", "texto"],
    sii: ["tipo", "nombre_archivo", "periodo", "estado", "modo", "resumen", "avisos"],
};

/** Las claves, en el orden de la entidad; las que no figuran quedan al final con el orden que traían. */
export function ordenarClaves(entidad: string, claves: readonly string[]): string[] {
    const orden = Object.prototype.hasOwnProperty.call(ORDEN_POR_ENTIDAD, entidad) ? ORDEN_POR_ENTIDAD[entidad] : [];
    const posicion = (clave: string): number => {
        const i = orden.indexOf(clave);
        return i === -1 ? orden.length : i;
    };
    // sort es estable: a igual posición se conserva el orden de llegada.
    return [...claves].sort((a, b) => posicion(a) - posicion(b));
}

/* ---------------------------------------------------------------------------
   Ids internos y campos técnicos.
   -------------------------------------------------------------------------- */

/** Campos que no le dicen nada a quien lee la auditoría: versiones, claves, huellas y la copia de un archivo. */
const CAMPOS_TECNICOS: ReadonlySet<string> = new Set(["version", "version_lock", "idempotency_key", "sha256", "muestra"]);
/** id_* que SÍ son un dato legible (un rol, una clase de cuenta, un impuesto): no son uuid. */
const ID_QUE_SE_LEE: ReadonlySet<string> = new Set(["id_rol", "id_tipo_cuenta", "id_impuesto"]);

/**
 * ¿Va al "Detalle técnico" y no a los datos? Un id interno (id_*, o cualquier uuid), una versión,
 * una clave. El uuid de una persona se muestra si se sabe su nombre; si no, es un id más.
 */
export function esCampoTecnico(campo: string, valor: unknown, ctx: ContextoDelDetalle): boolean {
    if (CAMPOS_TECNICOS.has(campo)) return true;
    // El id de la persona que se creó ya está en su nombre y su RUT.
    if (campo === "id_usuario" && (ctx.entidad === "usuarios" || ctx.entidad === "users")) return true;
    if (CAMPO_DE_PERSONA.test(campo)) return esUuid(valor) && !ctx.personas?.has(valor.toLowerCase());
    if (campo.startsWith("id_") && !ID_QUE_SE_LEE.has(campo)) return true;
    return esUuid(valor);
}

/** El nombre de un campo técnico: el de siempre, con "(ID)" si es un identificador. */
function etiquetaTecnica(campo: string, valor: unknown): string {
    const etiqueta = etiquetaCampo(campo);
    return campo.startsWith("id_") || esUuid(valor) ? `${etiqueta} (ID)` : etiqueta;
}

/* ---------------------------------------------------------------------------
   Datos derivados: varios campos que se leen mejor juntos.
   -------------------------------------------------------------------------- */

/** El comprobante de un asiento (tipo, número y año) y el período de un período contable, en un solo campo. */
function derivar(entidad: string, datos: Datos): Datos {
    const copia: Record<string, unknown> = { ...datos };
    if ((entidad === "asientos-contables" || entidad === "asientos-borradores") && copia.numero != null && copia.anio != null && copia.tipo_comprobante != null) {
        const { tipo_comprobante, numero, anio } = copia;
        delete copia.tipo_comprobante;
        delete copia.numero;
        delete copia.anio;
        // El comprobante pasa a ser el primer campo de la entidad: se arma como objeto y lo dice formatearObjeto.
        return { comprobante: { tipo_comprobante, numero, anio }, ...copia };
    }
    if (entidad === "periodos-contables" && Number.isInteger(copia.mes) && Number.isInteger(copia.anio)) {
        const { mes, anio } = copia;
        delete copia.mes;
        delete copia.anio;
        return { periodo: { mes, anio }, ...copia };
    }
    return copia;
}

/* ---------------------------------------------------------------------------
   Listas conocidas: una mini tabla con lo que el evento guardó.
   -------------------------------------------------------------------------- */

const esObjeto = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

/** "Cuenta 1a2b3c4d": lo más legible que se puede decir de una cuenta de la que solo se guardó el id. */
const cuentaCorta = (id: unknown): string => (typeof id === "string" && id ? `Cuenta ${id.slice(0, 8)}` : "Cuenta");

/** El nombre de la cuenta de una línea: "1101001 · Caja" si la línea lo trae; si no, "Cuenta 1a2b3c4d". */
export function nombreDeCuentaDeLinea(linea: Record<string, unknown>): string {
    const cuenta = linea.cuenta;
    if (esObjeto(cuenta) && typeof cuenta.codigo === "string") {
        return typeof cuenta.nombre === "string" && cuenta.nombre ? `${cuenta.codigo} · ${cuenta.nombre}` : cuenta.codigo;
    }
    return cuentaCorta(linea.id_cuenta);
}

const montoOGuion = (valor: unknown): string => {
    if (sinValor(valor)) return "—";
    const texto = formatearCLP(typeof valor === "number" || typeof valor === "string" ? valor : 0);
    return texto === "$0" ? "—" : texto;
};

const cantidad = (valor: unknown): string => formatearValorAuditado("cantidad", valor);

/** Las líneas de un asiento o de un borrador: cuenta, debe y haber, en el orden en que se guardaron. */
function tablaDeLineas(lista: readonly Record<string, unknown>[]): Pick<Extract<Entrada, { tipo: "tabla" }>, "columnas" | "filas"> {
    const ordenadas = [...lista].sort((a, b) => Number(a.orden ?? 0) - Number(b.orden ?? 0));
    return {
        columnas: [
            { titulo: "Cuenta", numerica: false },
            { titulo: "Debe", numerica: true },
            { titulo: "Haber", numerica: true },
        ],
        filas: ordenadas.map((l) => [nombreDeCuentaDeLinea(l), montoOGuion(l.debe), montoOGuion(l.haber)]),
    };
}

const TABLAS: Readonly<Record<string, (lista: readonly Record<string, unknown>[]) => Pick<Extract<Entrada, { tipo: "tabla" }>, "columnas" | "filas">>> = {
    movimientos: tablaDeLineas,
    lineas: tablaDeLineas,
    detalles: (lista) => ({
        columnas: [
            { titulo: "Descripción", numerica: false },
            { titulo: "Cantidad", numerica: true },
            { titulo: "Precio unitario", numerica: true },
            { titulo: "Subtotal", numerica: true },
        ],
        filas: lista.map((l) => [
            typeof l.snapshot_nombre === "string" && l.snapshot_nombre ? l.snapshot_nombre : "Línea",
            cantidad(l.cantidad),
            montoOGuion(l.precio_unitario),
            montoOGuion(l.subtotal),
        ]),
    }),
    impuestos: (lista) => ({
        columnas: [
            { titulo: "Impuesto", numerica: false },
            { titulo: "Monto", numerica: true },
        ],
        filas: lista.map((l) => [nombreDeImpuesto(l.id_impuesto), montoOGuion(l.monto_impuesto)]),
    }),
};

/** Listas de textos que se leen mejor como viñetas (avisos de una importación). */
const LISTAS_DE_TEXTOS: ReadonlySet<string> = new Set(["avisos", "advertencias"]);

/** La mini tabla de una lista conocida cuyos elementos son objetos; null si no corresponde. */
export function tablaDeLista(clave: string, valor: unknown): Extract<Entrada, { tipo: "tabla" }> | null {
    const armar = Object.prototype.hasOwnProperty.call(TABLAS, clave) ? TABLAS[clave] : undefined;
    if (!armar || !Array.isArray(valor) || valor.length === 0 || !valor.every(esObjeto)) return null;
    return { tipo: "tabla", clave, etiqueta: etiquetaCampo(clave), ...armar(valor) };
}

/* ---------------------------------------------------------------------------
   Datos de una foto: creación, eliminación o lo que quedó guardado.
   -------------------------------------------------------------------------- */

export type DatosPreparados = {
    /** Lo que se lee: en el orden de la entidad, sin vacíos ni ids. */
    readonly entradas: readonly Entrada[];
    /** Ids internos y campos técnicos, para el desplegable "Detalle técnico". */
    readonly tecnicos: readonly Entrada[];
};

const textoDeLista = (v: unknown): readonly string[] | undefined =>
    Array.isArray(v) && v.length > 0 && v.every((x) => typeof x === "string") ? (v as readonly string[]) : undefined;

/** Si dos campos quedaran con la misma etiqueta, el segundo se distingue por su nombre en el backend. */
function sinEtiquetasRepetidas(entradas: readonly Entrada[]): Entrada[] {
    const vistas = new Set<string>();
    return entradas.map((entrada) => {
        const repetida = vistas.has(entrada.etiqueta);
        vistas.add(entrada.etiqueta);
        return repetida ? { ...entrada, etiqueta: `${entrada.etiqueta} (${textoLegible(entrada.clave).toLowerCase()})` } : entrada;
    });
}

/**
 * Convierte la foto de un evento en lo que se dibuja. Los campos vacíos no se
 * muestran (en una creación no dicen nada), los ids internos van a `tecnicos` y
 * el correo no sale para quien no puede verlo.
 */
export function prepararDatos(datos: Datos | null | undefined, ctx: ContextoDelDetalle): DatosPreparados {
    if (!datos) return { entradas: [], tecnicos: [] };
    const base = derivar(ctx.entidad, datos);
    const entradas: Entrada[] = [];
    const tecnicos: Entrada[] = [];

    for (const clave of ordenarClaves(ctx.entidad, Object.keys(base))) {
        const valor = base[clave];
        if (clave === "correo" && !ctx.verCorreo) continue;
        if (sinValor(valor)) continue;

        if (esCampoTecnico(clave, valor, ctx)) {
            tecnicos.push({
                tipo: "texto",
                clave,
                etiqueta: etiquetaTecnica(clave, valor),
                valor: esUuid(valor) ? valor : formatearValorAuditado(clave, valor, ctx.personas, ctx.entidad),
            });
            continue;
        }
        const tabla = tablaDeLista(clave, valor);
        if (tabla) {
            entradas.push(tabla);
            continue;
        }
        const items = LISTAS_DE_TEXTOS.has(clave) ? textoDeLista(valor) : undefined;
        entradas.push({
            tipo: "texto",
            clave,
            etiqueta: etiquetaCampo(clave),
            valor: items ? `${items.length} ${items.length === 1 ? "aviso" : "avisos"}` : formatearValorAuditado(clave, valor, ctx.personas, ctx.entidad),
            ...(items ? { items } : {}),
        });
    }
    return { entradas: sinEtiquetasRepetidas(entradas), tecnicos };
}

/* ---------------------------------------------------------------------------
   Cambios (antes → después).
   -------------------------------------------------------------------------- */

export type CambioLegible = {
    readonly clave: string;
    readonly etiqueta: string;
    readonly antes: string;
    readonly despues: string;
};

export type CambiosPreparados = {
    readonly cambios: readonly CambioLegible[];
    readonly tecnicos: readonly CambioLegible[];
};

/**
 * Los cambios de una actualización. Un campo que pasó de un valor a vacío SÍ
 * se muestra: es un cambio. Solo se quitan los «vacío → vacío».
 */
export function prepararCambios(cambios: readonly CambioAuditado[], ctx: ContextoDelDetalle): CambiosPreparados {
    const visibles = cambiosVisibles(cambios).filter((c) => c.campo !== "correo" || ctx.verCorreo);
    const legibles = ordenarClaves(ctx.entidad, visibles.map((c) => c.campo)).map((campo) => {
        const c = visibles.find((v) => v.campo === campo) as CambioAuditado;
        const tecnico = esCampoTecnico(campo, c.antes, ctx) || esCampoTecnico(campo, c.despues, ctx);
        const crudo = (v: unknown) => (esUuid(v) ? v : formatearValorAuditado(campo, v, ctx.personas, ctx.entidad));
        return {
            tecnico,
            cambio: {
                clave: campo,
                etiqueta: tecnico ? etiquetaTecnica(campo, c.antes ?? c.despues) : etiquetaCampo(campo),
                antes: tecnico ? crudo(c.antes) : formatearValorAuditado(campo, c.antes, ctx.personas, ctx.entidad),
                despues: tecnico ? crudo(c.despues) : formatearValorAuditado(campo, c.despues, ctx.personas, ctx.entidad),
            },
        };
    });
    return {
        cambios: legibles.filter((l) => !l.tecnico).map((l) => l.cambio),
        tecnicos: legibles.filter((l) => l.tecnico).map((l) => l.cambio),
    };
}

/* ---------------------------------------------------------------------------
   Encabezado y registro afectado.
   -------------------------------------------------------------------------- */

/** El título del bloque de datos: una eliminación guarda lo que se eliminó; lo demás, lo que quedó registrado. */
export const tituloDeDatos = (accion: string): string => (accion === "eliminar" ? "Datos eliminados" : "Datos registrados");

const texto = (v: unknown): string | null => (typeof v === "string" && v.trim() ? v.trim() : null);

/**
 * "Asiento T-1 / 2026", "Tercero · Ferretería Ñandú Ltda": el registro afectado con un dato
 * legible de la foto del evento. null si la foto no trae ninguno (entonces se dice solo el tipo).
 */
export function descripcionDelRegistro(entidad: string, antes: Datos | null | undefined, despues: Datos | null | undefined): string | null {
    const d: Record<string, unknown> = { ...(antes ?? {}), ...(despues ?? {}) };
    const tipo = etiquetaEntidad(entidad);
    const con = (dato: string | null): string | null => (dato ? `${tipo} · ${dato}` : null);

    switch (entidad) {
        case "asientos-contables":
        case "asientos-borradores":
            return typeof d.tipo_comprobante === "string" && Number.isInteger(d.numero) && Number.isInteger(d.anio)
                ? `${tipo} ${formatearComprobante(d.tipo_comprobante, d.numero as number, d.anio as number)}`
                : null;
        case "terceros":
            return con(texto(d.razon_social) ?? texto(d.rut));
        case "empresas":
            return con(texto(d.razon_social) ?? texto(d.rut));
        case "cuentas-contables": {
            const codigo = texto(d.codigo);
            const nombre = texto(d.nombre);
            return con(codigo && nombre ? `${codigo} · ${nombre}` : (codigo ?? nombre));
        }
        case "articulos":
            return con(texto(d.nombre));
        case "periodos-contables":
            return Number.isInteger(d.mes) && Number.isInteger(d.anio) ? con(capitalizada(nombrePeriodo(d.anio as number, d.mes as number))) : null;
        case "usuarios":
        case "users":
            return con(texto(d.nombre_completo) ?? texto(d.rut));
        case "f29": {
            const periodo = texto(d.periodo);
            const m = periodo ? /^(\d{4})-(\d{2})$/.exec(periodo) : null;
            return m ? con(capitalizada(nombrePeriodo(Number(m[1]), Number(m[2])))) : null;
        }
        case "sii":
            return con(texto(d.nombre_archivo));
        default:
            return null;
    }
}

const capitalizada = (t: string): string => (t ? t.charAt(0).toUpperCase() + t.slice(1) : t);
