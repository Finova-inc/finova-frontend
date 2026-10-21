/**
 * Cliente HTTP hacia el backend NestJS de Finova.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTE ARCHIVO EXISTE
 * ---------------------------------------------------------------------------
 * El frontend (Vercel) y el backend (NestJS + PostgreSQL, en contenedor) viven
 * en dominios distintos. Cada componente que necesite datos podría llamar a
 * fetch() por su cuenta, pero entonces la URL base, el manejo de errores, el
 * tiempo de espera y el envío de credenciales quedarían repetidos y divergiendo.
 *
 * Todo el tráfico hacia el backend pasa por aquí. Si mañana cambia el dominio,
 * el prefijo de rutas o la forma de autenticar, se cambia en un solo lugar.
 *
 * ---------------------------------------------------------------------------
 * VARIABLES DE ENTORNO (ver .env.example)
 * ---------------------------------------------------------------------------
 * NEXT_PUBLIC_API_URL  URL pública del backend. El prefijo NEXT_PUBLIC_ hace
 *                      que Next la incruste en el bundle del navegador, así que
 *                      es VISIBLE PARA CUALQUIERA: nunca poner secretos ahí.
 *                      Una URL de API no es secreta; una contraseña sí.
 *
 * API_URL_INTERNA      Opcional. URL que usan SOLO los componentes de servidor
 *                      (sin prefijo NEXT_PUBLIC_, nunca llega al navegador).
 *                      Sirve cuando el backend es alcanzable por una red
 *                      privada más corta que la ruta pública.
 */

/** Se normaliza sin barra final para que unir rutas nunca produzca una doble barra. */
function normalizeBaseUrl(rawUrl: string): string {
    return rawUrl.trim().replace(/\/+$/, "");
}

/**
 * URL base efectiva.
 *
 * En el servidor se prefiere API_URL_INTERNA si existe; en el navegador esa
 * variable simplemente no está definida, así que cae a la pública sin ningún
 * condicional sobre `typeof window`.
 */
export const API_BASE_URL = normalizeBaseUrl(
    process.env.API_URL_INTERNA ??
        process.env.NEXT_PUBLIC_API_URL ??
        "http://localhost:3001",
);

/** Milisegundos antes de abortar una petición colgada. */
const REQUEST_TIMEOUT_MS = 15_000;

/**
 * Error de una llamada a la API.
 *
 * Lleva el código HTTP y el cuerpo crudo para que la interfaz decida qué
 * mostrar. El cuerpo no se expone directamente a la persona usuaria: puede
 * contener detalles internos del servidor.
 */
export class ApiError extends Error {
    readonly status: number;
    readonly body: unknown;

    constructor(message: string, status: number, body: unknown) {
        super(message);
        this.name = "ApiError";
        this.status = status;
        this.body = body;
    }
}

/** Opciones aceptadas por apiFetch, sobre las de fetch nativo. */
export interface ApiFetchOptions extends Omit<RequestInit, "body"> {
    /** Cuerpo en objeto plano: se serializa a JSON y se pone el Content-Type. */
    readonly json?: unknown;
    /** Cuerpo multipart (subida de archivos). El navegador pone el Content-Type con su boundary. */
    readonly formData?: FormData;
    /** Token de acceso a enviar como Bearer, cuando exista autenticación real. */
    readonly token?: string;
}

/**
 * Llama al backend y devuelve el JSON tipado.
 *
 * `path` se escribe SIEMPRE relativo y con barra inicial: "/empresas".
 * Concatenar la base aquí evita que una ruta absoluta accidental mande datos a
 * un dominio ajeno.
 *
 * El AbortController con temporizador es lo que impide que una pestaña quede
 * esperando indefinidamente si el backend no responde (contenedor caído,
 * arranque en frío del proveedor, red intermitente).
 */
export async function apiFetch<T>(
    path: string,
    { json, formData, token, headers, signal, ...init }: ApiFetchOptions = {},
): Promise<T> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

    // Si quien llama ya traía su propio signal (por ejemplo, de un efecto de
    // React que se desmonta), se encadena para respetar ambas cancelaciones.
    signal?.addEventListener("abort", () => controller.abort(), { once: true });

    const requestHeaders = new Headers(headers);
    requestHeaders.set("Accept", "application/json");

    if (json !== undefined) {
        requestHeaders.set("Content-Type", "application/json");
    }

    if (token) {
        requestHeaders.set("Authorization", `Bearer ${token}`);
    }

    try {
        const response = await fetch(`${API_BASE_URL}${path}`, {
            ...init,
            headers: requestHeaders,
            body: formData ?? (json === undefined ? undefined : JSON.stringify(json)),
            signal: controller.signal,
            /**
             * Envía cookies al backend aunque esté en otro dominio.
             *
             * Requiere que el backend responda con un Access-Control-Allow-Origin
             * concreto (nunca comodín) y Access-Control-Allow-Credentials en
             * true. Ver docs/DESPLIEGUE-VERCEL.md, el paso de CORS.
             */
            credentials: "include",
        });

        // 204 y 205 no traen cuerpo: intentar parsearlo lanzaría.
        const payload =
            response.status === 204 || response.status === 205
                ? null
                : await response.json().catch(() => null);

        if (!response.ok) {
            throw new ApiError(
                `La API respondió ${response.status} en ${path}`,
                response.status,
                payload,
            );
        }

        return payload as T;
    } catch (error) {
        if (error instanceof ApiError) {
            throw error;
        }

        if (error instanceof DOMException && error.name === "AbortError") {
            throw new ApiError("La petición al servidor tardó demasiado.", 408, null);
        }

        // Falla de red, DNS, CORS o certificado. fetch no distingue el motivo a
        // propósito, para no filtrar información de la red al script.
        throw new ApiError("No se pudo contactar al servidor.", 0, null);
    } finally {
        clearTimeout(timeoutId);
    }
}

/** Atajos por verbo, para que las llamadas se lean como lo que hacen. */
export const api = {
    get: <T,>(path: string, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { ...options, method: "GET" }),

    post: <T,>(path: string, json?: unknown, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { ...options, method: "POST", json }),

    patch: <T,>(path: string, json?: unknown, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { ...options, method: "PATCH", json }),

    delete: <T,>(path: string, options?: ApiFetchOptions) =>
        apiFetch<T>(path, { ...options, method: "DELETE" }),
};

/* ==========================================================================
   ENDPOINTS CONOCIDOS
   ==========================================================================
   Se declaran como funciones con tipo de retorno explícito, en vez de llamar a
   api.get("/empresas") desde el componente. Así el contrato con el backend
   queda escrito en un solo archivo y TypeScript avisa cuando cambia.

   El módulo `empresas` es el único que el backend expone hoy
   (finova-backend/src/empresas). El resto —DTE, F29, copiloto, auditoría— se
   agrega aquí a medida que exista.
   ========================================================================== */

/**
 * Usuario.
 *
 * Forma confirmada contra finova-backend/src/users/entities/user.entity.ts.
 * `password_hash` es `select:false` en el backend, asi que nunca llega aqui.
 */
export interface Usuario {
    readonly id_usuario: string;
    readonly id_empresa: string;
    /** Credencial de acceso. null en usuarios creados antes del login por RUT. */
    readonly rut: string | null;
    readonly correo: string;
    readonly nombre_completo: string;
}

/**
 * Empresa.
 *
 * Forma confirmada contra finova-backend/src/empresas/entities/empresa.entity.ts
 * y verificada con una respuesta real de GET /empresas.
 *
 * Notas:
 * - `id_empresa` es un uuid (string), no un entero.
 * - `created_at` / `deleted_at` llegan como ISO string: JSON no tiene tipo fecha.
 * - `usuarios` viene incluido porque EmpresasService carga la relacion.
 */
export interface Empresa {
    readonly id_empresa: string;
    readonly rut: string;
    readonly razon_social: string;
    readonly created_at: string;
    readonly deleted_at: string | null;
    readonly usuarios?: readonly Usuario[];
}

/**
 * Campos que acepta POST /empresas.
 *
 * Se declara explicito en vez de derivarlo de `Empresa` con Omit porque el
 * backend usa ValidationPipe con `forbidNonWhitelisted: true`: mandar un
 * campo de mas (created_at, usuarios...) devuelve 400, no se ignora.
 */
export interface CrearEmpresaInput {
    readonly rut: string;
    readonly razon_social: string;
}

/**
 * Respuesta de POST /empresas. `recuperada` llega en true cuando el RUT era
 * de una empresa dada de baja que quien la agrega administraba: vuelve con
 * todos sus datos en vez de crearse vacia.
 */
export type EmpresaCreada = Empresa & { readonly recuperada?: boolean };

export const empresasApi = {
    listar: (opciones?: ApiFetchOptions) => api.get<Empresa[]>("/empresas", opciones),
    obtener: (id: string, opciones?: ApiFetchOptions) =>
        api.get<Empresa>(`/empresas/${id}`, opciones),
    /** Admin o contador de la empresa activa; quien la crea queda como su administrador. */
    crear: (datos: CrearEmpresaInput, opciones?: ApiFetchOptions) =>
        api.post<EmpresaCreada>("/empresas", datos, opciones),
    /**
     * Corrige la razon social; el RUT no se edita (el backend responde 400).
     * Solo el administrador de ESA empresa.
     */
    actualizar: (id: string, datos: { readonly razon_social: string }, opciones?: ApiFetchOptions) =>
        api.patch<Empresa>(`/empresas/${encodeURIComponent(id)}`, datos, opciones),
    /**
     * Baja logica: solo el administrador de ESA empresa, y nunca la unica que
     * le queda (409). Los libros se conservan.
     */
    eliminar: (id: string, opciones?: ApiFetchOptions) =>
        api.delete<{ message: string }>(`/empresas/${id}`, opciones),
};

/* --------------------------------------------------------------------------
   MODULOS CONTABLES

   Formas confirmadas contra las entidades del backend. Los montos llegan como
   STRING y no como number: TypeORM entrega asi las columnas numeric(19,4),
   porque 19 digitos no caben en el double de JavaScript. Se usa formatearCLP()
   de lib/formato.ts para mostrarlos; nunca se suman con `+` en el cliente.
   -------------------------------------------------------------------------- */

/** Tercero: cliente o proveedor. `tipo_persona` 'N' natural, 'J' juridica. */
export interface Tercero {
    readonly id_tercero: string;
    readonly id_empresa: string;
    readonly rut: string;
    readonly razon_social: string;
    readonly tipo_persona: "N" | "J";
    /** Puede ser cliente y proveedor a la vez. */
    readonly es_cliente: boolean;
    readonly es_proveedor: boolean;
    /** false: desactivado, ya no se ofrece al registrar asientos. */
    readonly is_active: boolean;
    readonly created_at: string;
    readonly deleted_at: string | null;
}

/** Lo que se envía al registrar o editar un tercero (CreateTerceroDto). */
export interface TerceroInput {
    readonly rut: string;
    readonly razon_social: string;
    readonly tipo_persona: "N" | "J";
    readonly es_cliente: boolean;
    readonly es_proveedor: boolean;
}

export interface FiltroTerceros {
    /** Parte de la razón social o del RUT, con o sin puntos. */
    readonly buscar?: string;
    readonly rol?: "cliente" | "proveedor";
    readonly estado?: "activos" | "inactivos";
}

/** Contraparte de los documentos del SII que todavía no es un tercero. */
export interface ContraparteSugerida {
    readonly rut: string;
    readonly nombre: string | null;
    readonly como_proveedor: boolean;
    readonly como_cliente: boolean;
    readonly cantidad_documentos: number;
    /** Suma de sus documentos (las notas de crédito restan). */
    readonly monto_total: string;
    readonly ultima_fecha: string;
    readonly tipo_persona_sugerido: "N" | "J";
    readonly motivo_tipo_persona: string;
}

export interface TotalesDocumentosTercero {
    readonly cantidad: number;
    readonly neto: string;
    readonly iva: string;
    readonly total: string;
}

/**
 * Lo que la empresa tiene con un tercero (GET /terceros/:id/actividad). Los
 * documentos del SII se enlazan por RUT: aparecen aunque se hayan importado
 * antes de registrarlo. Cada lista trae hasta `limite` filas; los totales
 * suman todas.
 */
export interface ActividadTercero {
    readonly documentos: readonly {
        readonly id_documento_sii: string;
        readonly tipo_dte: number;
        readonly folio: string;
        readonly fecha_emision: string;
        readonly sentido: "compra" | "venta";
        readonly monto_neto: string;
        readonly monto_iva: string;
        readonly monto_total: string;
        readonly estado_rcv: string | null;
    }[];
    readonly totales_documentos: {
        readonly compras: TotalesDocumentosTercero;
        readonly ventas: TotalesDocumentosTercero;
    };
    readonly honorarios: readonly {
        readonly id_honorario_sii: string;
        readonly folio: string;
        readonly fecha_emision: string;
        readonly sentido: "recibida" | "emitida";
        readonly monto_bruto: string;
        readonly retencion: string;
        readonly monto_liquido: string;
        readonly estado: string;
    }[];
    readonly totales_honorarios: {
        readonly cantidad: number;
        readonly bruto: string;
        readonly retencion: string;
        readonly liquido: string;
    };
    readonly movimientos: readonly {
        readonly id_asiento: string;
        readonly tipo_comprobante: string;
        readonly numero: number;
        readonly anio: number;
        readonly fecha_contable: string;
        readonly glosa: string;
        readonly codigo_cuenta: string;
        readonly nombre_cuenta: string;
        readonly debe: string;
        readonly haber: string;
    }[];
    readonly totales_movimientos: { readonly cantidad: number; readonly debe: string; readonly haber: string };
    readonly documentos_manuales: number;
    readonly limite: number;
}

/**
 * Documento tributario.
 *
 * ADVERTENCIA: GET /documentos no carga relaciones, asi que `id_tercero` y
 * `codigo_sii` llegan crudos, sin el nombre del tercero ni el del tipo de
 * documento. Mostrarlos tal cual pondria UUIDs en pantalla. Se resuelve en la
 * Fase 4 anadiendo `relations` en documentos.service.ts.
 *
 * Tampoco existen todavia fecha_emision ni fecha_vencimiento: la unica fecha
 * es created_at, que es cuando se inserto la fila.
 */
export interface Documento {
    readonly id_documento: string;
    readonly id_empresa: string;
    readonly id_tercero: string;
    readonly codigo_sii: string;
    readonly codigo_iso: string;
    readonly monto_neto: string;
    readonly monto_total: string;
    readonly estado: string;
    readonly created_at: string;
}

/* --------------------------------------------------------------------------
   ASIENTOS CONTABLES

   Formas confirmadas contra finova-backend/src/asientos-contables/asientos.tipos.ts.

   - `fecha_contable` llega como 'YYYY-MM-DD' (columna date, sin hora). Se
     muestra con formatearFechaContable(), NUNCA con new Date(): leida como
     medianoche UTC, en Chile se veria el dia anterior.
   - Los importes son pesos enteros con 4 decimales en cero ('119000.0000').
     Se suman con lib/decimal.ts, no con `+`.
   -------------------------------------------------------------------------- */

/** I ingreso, E egreso, T traspaso: los tipos del formato de libros electronicos del SII. */
export type TipoComprobante = "I" | "E" | "T";

export type OrigenAsiento = "manual" | "apertura" | "reversa" | "documento";

/** Como se cita un comprobante desde otro (reversa <-> original). */
export interface ReferenciaComprobante {
    readonly id_asiento: string;
    readonly tipo_comprobante: TipoComprobante;
    readonly numero: number;
    readonly anio: number;
    readonly fecha_contable: string;
}

export interface AsientoResumen extends ReferenciaComprobante {
    readonly glosa: string;
    readonly origen: OrigenAsiento;
    readonly valor_comprobante: string;
    readonly id_asiento_revertido: string | null;
    readonly created_by: string;
    readonly created_at: string;
}

export interface AsientoListado extends AsientoResumen {
    readonly revertido_por: ReferenciaComprobante | null;
}

export interface MovimientoContable {
    readonly id_movimiento: string;
    readonly orden: number;
    readonly id_cuenta: string;
    readonly cuenta: { readonly codigo: string; readonly nombre: string } | null;
    readonly debe: string;
    readonly haber: string;
    readonly glosa: string | null;
    readonly id_tercero: string | null;
    readonly tercero: { readonly rut: string; readonly razon_social: string } | null;
    readonly id_documento: string | null;
    readonly codigo_iso: string | null;
    readonly monto_moneda_original: string | null;
    readonly tipo_cambio: string | null;
}

export interface AsientoDetalle extends AsientoResumen {
    readonly id_periodo: string;
    readonly periodo: { readonly anio: number; readonly mes: number; readonly estado: string } | null;
    readonly id_documento: string | null;
    /** Si este asiento es una reversa, el que corrige. */
    readonly revierte_a: ReferenciaComprobante | null;
    /** Si este asiento fue revertido, su reversa. */
    readonly revertido_por: ReferenciaComprobante | null;
    readonly movimientos: readonly MovimientoContable[];
}

export interface Paginado<T> {
    readonly items: readonly T[];
    readonly total: number;
    readonly pagina: number;
    readonly por_pagina: number;
}

export interface AsientoDelLibro extends AsientoResumen {
    readonly movimientos: readonly MovimientoContable[];
}

/** Un dia del libro, con los totales del "Resumen Diario" del formato LCE. */
export interface DiaLibroDiario {
    readonly fecha: string;
    readonly cantidad_comprobantes: number;
    readonly cantidad_movimientos: number;
    readonly suma_valor: string;
    readonly comprobantes: readonly AsientoDelLibro[];
}

export interface LibroDiario {
    readonly desde: string;
    readonly hasta: string;
    readonly dias: readonly DiaLibroDiario[];
    readonly totales: {
        readonly cantidad_comprobantes: number;
        readonly cantidad_movimientos: number;
        readonly total_debe: string;
        readonly total_haber: string;
    };
}

/** Un movimiento de la cuenta con el saldo que deja despues de aplicarlo. */
export interface MovimientoDelMayor {
    readonly id_movimiento: string;
    readonly id_asiento: string;
    readonly fecha_contable: string;
    readonly tipo_comprobante: TipoComprobante;
    readonly numero: number;
    readonly anio: number;
    readonly origen: OrigenAsiento;
    readonly glosa_asiento: string;
    readonly glosa: string | null;
    readonly debe: string;
    readonly haber: string;
    readonly saldo: string;
}

export interface LibroMayor {
    readonly cuenta: {
        readonly id_cuenta: string;
        readonly codigo: string;
        readonly nombre: string;
        /** "D" deudora, "H" acreedora: decide el signo del saldo. */
        readonly naturaleza: "D" | "H";
    };
    readonly desde: string;
    readonly hasta: string;
    /** Todo el historico previo a `desde`. */
    readonly saldo_anterior: string;
    readonly movimientos: readonly MovimientoDelMayor[];
    readonly totales: {
        readonly total_debe: string;
        readonly total_haber: string;
        readonly saldo_final: string;
    };
}

/** Linea como la acepta el backend: solo digitos en debe/haber, campos vacios omitidos. */
export interface MovimientoInput {
    readonly id_cuenta: string;
    readonly debe?: string;
    readonly haber?: string;
    readonly glosa?: string;
    readonly id_tercero?: string;
}

/** POST /asientos-contables. No lleva periodo: el backend lo deduce de la fecha. */
export interface CrearAsientoInput {
    readonly tipo_comprobante: TipoComprobante;
    readonly fecha_contable: string;
    readonly glosa: string;
    readonly idempotency_key?: string;
    readonly movimientos: readonly MovimientoInput[];
}

export interface FiltroAsientos {
    readonly desde?: string;
    readonly hasta?: string;
    readonly tipo?: TipoComprobante;
    /** Solo asientos que mueven esta cuenta. */
    readonly id_cuenta?: string;
    readonly texto?: string;
    readonly pagina?: number;
    /** Tamano de pagina; el backend admite hasta 200. */
    readonly por_pagina?: number;
}

/** Linea de borrador: cualquier campo puede faltar. */
export interface LineaBorrador {
    readonly id_cuenta?: string;
    readonly debe?: string;
    readonly haber?: string;
    readonly glosa?: string;
    readonly id_tercero?: string;
}

export interface AsientoBorrador {
    readonly id_borrador: string;
    readonly tipo_comprobante: TipoComprobante | null;
    readonly fecha_contable: string | null;
    readonly glosa: string | null;
    readonly lineas: readonly LineaBorrador[];
    /** Bloqueo optimista: el guardado exige la version que se leyo. */
    readonly version: number;
    readonly created_at: string;
    readonly updated_at: string;
}

export interface GuardarBorradorInput {
    readonly tipo_comprobante?: TipoComprobante | null;
    readonly fecha_contable?: string | null;
    readonly glosa?: string | null;
    readonly lineas?: readonly LineaBorrador[];
}

/** Arma la query string omitiendo los filtros vacios. */
function consulta(parametros: Record<string, string | number | undefined>): string {
    const pares = Object.entries(parametros).filter(
        (par): par is [string, string | number] => par[1] !== undefined && par[1] !== "",
    );
    return pares.length === 0
        ? ""
        : `?${new URLSearchParams(pares.map(([clave, valor]) => [clave, String(valor)])).toString()}`;
}

/**
 * Un mes del resumen del panel. Montos en string con signo: un mes puede
 * cerrar en perdida, y un IVA neto negativo es remanente de credito.
 */
export interface MesResumen {
    readonly mes: number;
    readonly ingresos: string;
    readonly gastos: string;
    readonly resultado: string;
    readonly iva_debito: string;
    readonly iva_credito: string;
    /** Debito menos credito: positivo, IVA a pagar; negativo, remanente. */
    readonly iva_neto: string;
}

/**
 * GET /asientos-contables/resumen. Lo calcula el backend desde el libro:
 * meses de enero a la fecha de corte (`hasta`) y saldos de balance a esa
 * fecha (efectivo = rubro 1101, por cobrar = 1103, por pagar = 2101).
 */
export interface ResumenPanel {
    readonly anio: number;
    readonly hasta: string;
    readonly meses: readonly MesResumen[];
    readonly resultado_ejercicio: string;
    readonly saldos: {
        readonly efectivo: string;
        readonly por_cobrar: string;
        readonly por_pagar: string;
    };
}

/** Cuenta del plan contable. */
export interface CuentaContable {
    readonly id_cuenta: string;
    readonly id_empresa: string;
    readonly codigo: string;
    readonly nombre: string;
    /** 1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingreso, 5 Gasto. */
    readonly id_tipo_cuenta: number;
    readonly is_active: boolean;
    /** Cuenta padre, o null si es de primer nivel (clase). */
    readonly id_cuenta_padre: string | null;
    /** false = cuenta de agrupación: no admite movimientos, solo ordena el árbol. */
    readonly acepta_movimiento: boolean;
    /** Código del Diccionario de Cuentas LCE del SII, si se conoce. */
    readonly codigo_sii: string | null;
    /** Ya tiene asientos: su código, tipo e imputabilidad quedan fijos (art. 31 CCom). */
    readonly tiene_movimientos: boolean;
}

/** Fila del plan base NIIF, tal como la devuelve GET /cuentas-contables/plantilla. */
export interface FilaPlantilla {
    readonly codigo: string;
    readonly nombre: string;
    readonly id_tipo_cuenta: number;
    /** false = agrupación; omitido = cuenta imputable. */
    readonly acepta_movimiento?: boolean;
    readonly codigoPadre?: string;
    /** Viene marcada la primera vez que se configura el plan. */
    readonly recomendada?: boolean;
}

/** El plan base contra el plan actual de la empresa. */
export interface PlantillaCuentas {
    readonly cuentas: readonly FilaPlantilla[];
    /** Agrupaciones que faltan para completar la estructura de las cuentas existentes. */
    readonly insertar: number;
    /** Cuentas existentes que pasarían a colgar de su rubro NIIF. */
    readonly reubicar: number;
    /** Por qué no se puede aplicar (plan propio, código en conflicto), o null. */
    readonly conflicto: string | null;
    /** Código del plan base → id de la cuenta de la empresa que lo cubre. */
    readonly provistas: Readonly<Record<string, string>>;
}

/** Cuenta imputable propia, dentro de un rubro del plan base. */
export interface CuentaPropiaInput {
    readonly codigo: string;
    readonly nombre: string;
    /** Código del rubro del plan base donde va. */
    readonly codigoPadre: string;
}

/** Cuerpo de "Configurar plan de cuentas" (POST /cuentas-contables/plantilla). */
export interface ConfigurarPlanInput {
    /** Códigos del plan base que se agregan; sus agrupaciones se crean solas. */
    readonly codigos: readonly string[];
    readonly propias: readonly CuentaPropiaInput[];
}

export interface CrearCuentaInput {
    readonly id_tipo_cuenta: number;
    readonly codigo: string;
    readonly nombre: string;
    readonly id_cuenta_padre?: string;
    readonly acepta_movimiento?: boolean;
    readonly codigo_sii?: string | null;
}

/** id_cuenta_padre acepta null explícito (quitar el padre), a diferencia de
 *  CrearCuentaInput donde solo puede omitirse. */
export type ActualizarCuentaInput = Partial<Omit<CrearCuentaInput, 'id_cuenta_padre'>> & {
    readonly id_cuenta_padre?: string | null;
    /** Para reactivar una cuenta desactivada (no existe en CrearCuentaInput:
     *  una cuenta nueva siempre nace activa). */
    readonly is_active?: boolean;
};

/** Periodo contable. `estado` es 'abierto' o 'cerrado'. */
export interface PeriodoContable {
    readonly id_periodo: string;
    readonly id_empresa: string;
    readonly anio: number;
    readonly mes: number;
    readonly estado: string;
    readonly cerrado_at?: string | null;
    readonly cerrado_por?: string | null;
    readonly motivo_reapertura?: string | null;
    /** Asientos contabilizados en el mes (incluidas reversas). */
    readonly cantidad_asientos: number;
    /** Borradores con fecha de ese mes: quedarían sin contabilizar si se cierra. */
    readonly cantidad_borradores: number;
}

export const tercerosApi = {
    /** Todos los de la empresa, sin los dados de baja (lo usa el formulario de asientos). */
    listar: (opciones?: ApiFetchOptions) => api.get<Tercero[]>("/terceros", opciones),
    filtrar: (filtros: FiltroTerceros, opciones?: ApiFetchOptions) =>
        api.get<Tercero[]>(`/terceros${consulta({ ...filtros })}`, opciones),
    obtener: (id: string, opciones?: ApiFetchOptions) =>
        api.get<Tercero>(`/terceros/${encodeURIComponent(id)}`, opciones),
    actividad: (id: string, opciones?: ApiFetchOptions) =>
        api.get<ActividadTercero>(`/terceros/${encodeURIComponent(id)}/actividad`, opciones),
    /** Contrapartes del SII sin registrar: se proponen, no se crean solas (Ley 21.719). */
    sugerencias: (opciones?: ApiFetchOptions) =>
        api.get<ContraparteSugerida[]>("/terceros/sugerencias", opciones),
    /** `recuperado`: el RUT era de un tercero dado de baja y se recuperó. */
    crear: (datos: TerceroInput, opciones?: ApiFetchOptions) =>
        api.post<Tercero & { readonly recuperado?: boolean }>("/terceros", datos, opciones),
    actualizar: (
        id: string,
        datos: Partial<TerceroInput> & { readonly is_active?: boolean },
        opciones?: ApiFetchOptions,
    ) => api.patch<Tercero>(`/terceros/${encodeURIComponent(id)}`, datos, opciones),
    /** Baja lógica (supresión de la Ley 21.719): sus documentos se conservan. */
    darDeBaja: (id: string, opciones?: ApiFetchOptions) =>
        api.delete<{ message: string }>(`/terceros/${encodeURIComponent(id)}`, opciones),
    /** Derecho de acceso y portabilidad (Ley 21.719): solo personas naturales; queda auditado. */
    datosPersonales: (id: string, opciones?: ApiFetchOptions) =>
        api.get<Record<string, unknown>>(`/terceros/${encodeURIComponent(id)}/datos-personales`, opciones),
};

export const documentosApi = {
    listar: (opciones?: ApiFetchOptions) => api.get<Documento[]>("/documentos", opciones),
};

/* --------------------------------------------------------------------------
   Importación de archivos del SII (opción A): CSV del RCV y de honorarios, y DTE (XML).
   Los montos son pesos enteros; el backend los devuelve como string (bigint).
   -------------------------------------------------------------------------- */

export type TipoImportacionSii = "compras" | "ventas" | "honorarios_recibidas" | "honorarios_emitidas" | "xml";

/** Una línea rechazada o con advertencia. `fila` es null si no es de una fila (un XML, un aviso del archivo). */
export interface DetalleLineaSii {
    readonly fila: number | null;
    readonly mensaje: string;
    /** Lo que decía la línea: "Tipo Doc: 33 · Folio: 9001 · …", sin las celdas vacías. */
    readonly contenido: string;
}

export interface ResumenImportacionSii {
    readonly leidos: number;
    readonly nuevos: number;
    readonly actualizados: number;
    readonly omitidos: number;
    readonly con_error: number;
    readonly con_advertencia: number;
    /** Las importaciones hechas antes de guardar la fila y su contenido traen texto ("Fila 9: …"). */
    readonly errores: readonly (DetalleLineaSii | string)[];
    readonly advertencias: readonly (DetalleLineaSii | string)[];
}

export interface ImportacionSii {
    readonly id_importacion: string;
    readonly tipo: TipoImportacionSii;
    readonly periodo: string | null;
    readonly nombre_archivo: string;
    readonly estado: "completada" | "con_errores";
    readonly resumen: ResumenImportacionSii;
    readonly created_at: string;
}

/**
 * Cuadratura de un documento: el RCV contra su XML.
 * solo_xml: vino el XML y el RCV no lo trae. sin_xml: está en el RCV y falta el XML.
 * difiere: están los dos y algún monto no coincide. cuadra: coinciden.
 */
export type Cuadratura = "cuadra" | "difiere" | "sin_xml" | "solo_xml";

/** Lo que se ve de un archivo antes de importarlo. Nada de esto está guardado todavía. */
export interface VistaPreviaSii {
    readonly tipo: TipoImportacionSii;
    readonly periodo: string | null;
    readonly nombre_archivo: string;
    /** Los mismos conteos que daría importarlo: nuevas, actualizadas, sin cambios, rechazadas. */
    readonly resumen: ResumenImportacionSii;
    /** Las primeras líneas válidas, ya formateadas, para comprobar que se leyó bien. */
    readonly muestra: {
        readonly columnas: readonly string[];
        readonly filas: readonly (readonly string[])[];
        /** Cuántas líneas válidas hay en total. */
        readonly total: number;
    };
    readonly totales: readonly { readonly titulo: string; readonly valor: string }[];
    /** Lo que no es un error del archivo pero conviene saber antes de importar (p. ej. un período que no calza). */
    readonly avisos: readonly string[];
}

export interface DocumentoSii {
    readonly id_documento_sii: string;
    readonly tipo_dte: number;
    readonly folio: string;
    readonly rut_emisor: string;
    readonly rut_receptor: string;
    readonly razon_social_contraparte: string | null;
    readonly fecha_emision: string;
    readonly periodo_rcv: string | null;
    readonly monto_neto: string;
    readonly monto_exento: string;
    readonly monto_iva: string;
    readonly monto_total: string;
    readonly sentido: "compra" | "venta";
    readonly estado_rcv: string | null;
    readonly advertencias: readonly string[];
    readonly en_rcv: boolean;
    readonly tiene_xml: boolean;
    readonly cuadratura: Cuadratura;
}

export interface HonorarioSii {
    readonly id_honorario_sii: string;
    readonly folio: string;
    readonly rut_emisor: string;
    readonly rut_receptor: string;
    readonly nombre_contraparte: string | null;
    readonly fecha_emision: string;
    readonly periodo: string;
    readonly monto_bruto: string;
    readonly retencion: string;
    readonly monto_liquido: string;
    readonly sentido: "recibida" | "emitida";
    readonly estado: "vigente" | "anulada";
    readonly advertencias: readonly string[];
}

export interface LibroSii<T, Totales> {
    readonly datos: readonly T[];
    readonly total: number;
    readonly pagina: number;
    readonly por_pagina: number;
    /** Suma de TODO el filtro, no solo de la página. */
    readonly totales: Totales;
}

export type LibroDocumentos = LibroSii<DocumentoSii, Record<"neto" | "exento" | "iva" | "total", string>>;
export type LibroHonorarios = LibroSii<HonorarioSii, Record<"bruto" | "retencion" | "liquido", string>>;

/** Documentos de cada libro en un mes, para las pestañas y los chips. */
export interface ResumenSii {
    readonly compras: ConteoLibroSii;
    readonly ventas: ConteoLibroSii;
    readonly honorarios_recibidas: number;
    readonly honorarios_emitidas: number;
}

export type ConteoLibroSii = { readonly total: number } & Record<Cuadratura, number>;

export interface DetalleDocumentoSii {
    readonly documento: DocumentoSii;
    /** null si no se ha importado el XML de este documento. */
    readonly xml: {
        readonly monto_neto: string;
        readonly monto_exento: string;
        readonly monto_iva: string;
        readonly monto_total: string;
        readonly firma_verificada: "si" | "no" | "no_verificada";
        readonly validacion: { readonly advertencias: readonly string[] };
        readonly created_at: string;
    } | null;
    readonly lineas: readonly {
        readonly linea: number;
        readonly nombre: string;
        readonly cantidad: string | null;
        readonly precio: string | null;
        readonly monto: number;
    }[];
}

/** Filtros de los libros. Cada uno tiene su campo en la URL de la pantalla. */
export interface FiltroLibroSii {
    readonly periodo?: string;
    readonly texto?: string;
    readonly tipo_dte?: number;
    readonly estado_rcv?: string;
    readonly estado?: string;
    readonly cuadratura?: string;
    readonly orden?: string;
    readonly dir?: string;
    readonly pagina?: number;
    readonly por_pagina?: number;
}

export const siiApi = {
    importar: (formData: FormData, opciones?: ApiFetchOptions) =>
        apiFetch<ImportacionSii>("/sii/importaciones", { ...opciones, method: "POST", formData }),
    previsualizar: (formData: FormData, opciones?: ApiFetchOptions) =>
        apiFetch<VistaPreviaSii>("/sii/importaciones/previsualizar", { ...opciones, method: "POST", formData }),
    importaciones: (opciones?: ApiFetchOptions) => api.get<ImportacionSii[]>("/sii/importaciones", opciones),
    resumen: (periodo: string, opciones?: ApiFetchOptions) =>
        api.get<ResumenSii>(`/sii/resumen${consulta({ periodo })}`, opciones),
    documentos: (sentido: "compra" | "venta", filtros: FiltroLibroSii = {}, opciones?: ApiFetchOptions) =>
        api.get<LibroDocumentos>(`/sii/documentos${consulta({ sentido, ...filtros })}`, opciones),
    documento: (id: string, opciones?: ApiFetchOptions) =>
        api.get<DetalleDocumentoSii>(`/sii/documentos/${encodeURIComponent(id)}`, opciones),
    honorarios: (sentido: "recibida" | "emitida", filtros: FiltroLibroSii = {}, opciones?: ApiFetchOptions) =>
        api.get<LibroHonorarios>(`/sii/honorarios${consulta({ sentido, ...filtros })}`, opciones),
};

/* ----------------------------------------------------------------------------
   F29 — propuesta de declaración mensual. Forma confirmada contra
   finova-backend/src/f29 (f29.calculo.ts, f29.service.ts y la entidad).
   ---------------------------------------------------------------------------- */

export type SeccionF29 = "ventas" | "debitos" | "compras" | "creditos" | "retenciones";

/** Una línea del formulario con lo que Finova propone. Montos en pesos, como string. */
export interface LineaF29 {
    readonly clave: string;
    readonly linea: number;
    /** Código de la cantidad de documentos; null si la línea solo lleva monto. */
    readonly codigo_cantidad: number | null;
    readonly codigo_monto: number;
    readonly concepto: string;
    readonly seccion: SeccionF29;
    /** 1 suma a su total, -1 resta (notas de crédito), 0 es informativa. */
    readonly suma: -1 | 0 | 1;
    readonly cantidad: number;
    readonly monto: string;
}

export interface TotalesF29 {
    /** 538 */
    readonly debitos: string;
    /** 537 */
    readonly creditos: string;
    /** 89 */
    readonly iva_determinado: string;
    /** 77 */
    readonly remanente_siguiente: string;
    /** 151 */
    readonly retencion_honorarios: string;
    /** 595 */
    readonly subtotal: string;
    /** 91 */
    readonly total_a_pagar: string;
}

export interface AlertaF29 {
    readonly codigo: string;
    readonly nivel: "critico" | "aviso" | "info";
    readonly mensaje: string;
    /** Con qué libro de Documentos se revisa. */
    readonly libro?: "compras" | "ventas" | "honorarios_recibidas";
    readonly tipo_dte?: number;
    readonly cuadratura?: string;
}

export interface DocumentoExcluidoF29 {
    readonly id_documento_sii: string;
    readonly sentido: "compra" | "venta";
    readonly tipo_dte: number;
    readonly folio: string;
    readonly motivo: string;
}

export type EstadoPropuestaF29 = "borrador" | "aprobada" | "declarada";

export interface PropuestaF29 {
    readonly id_propuesta_f29: string;
    readonly periodo: string;
    readonly estado: EstadoPropuestaF29;
    readonly remanente_anterior: string;
    readonly utm_anterior: string | null;
    readonly utm_actual: string | null;
    /** Lo que se aprobó; null mientras es borrador. */
    readonly foto: { readonly lineas: readonly LineaF29[]; readonly totales: TotalesF29 } | null;
    readonly total_a_pagar: string | null;
    readonly remanente_siguiente: string | null;
    readonly aprobada_en: string | null;
    readonly folio_sii: string | null;
    readonly fecha_presentacion: string | null;
    readonly declarada_en: string | null;
    readonly version: number;
}

/** Lo que muestra la cuadrícula del año. */
export type ResumenPropuestaF29 = Pick<
    PropuestaF29,
    "id_propuesta_f29" | "periodo" | "estado" | "total_a_pagar" | "remanente_siguiente" | "folio_sii" | "fecha_presentacion"
>;

export interface CambioF29 {
    readonly codigo: number;
    readonly concepto: string;
    readonly aprobado: string;
    readonly actual: string;
}

export interface F29DelMes {
    readonly periodo: string;
    /** "septiembre de 2026". */
    readonly nombre: string;
    /** El F29 se aprueba cuando el mes ya terminó. */
    readonly mes_terminado: boolean;
    readonly vencimiento: { readonly general: string; readonly con_pago_internet: string; readonly sin_pago: string };
    readonly propuesta: PropuestaF29 | null;
    readonly remanente: {
        /** Código 77 del mes anterior, sin reajustar. */
        readonly mes_anterior: string;
        readonly utm_anterior: string | null;
        readonly utm_actual: string | null;
        /** Código 504. */
        readonly reajustado: string;
        /** El 77 del F29 aprobado del mes anterior, si Finova lo tiene. */
        readonly sugerido: { readonly periodo: string; readonly monto: string; readonly estado: EstadoPropuestaF29 } | null;
    };
    /** Calculado con los documentos de hoy. Si la propuesta está aprobada, `propuesta.foto` es lo aprobado. */
    readonly calculo: {
        readonly lineas: readonly LineaF29[];
        readonly totales: TotalesF29;
        readonly alertas: readonly AlertaF29[];
        readonly excluidos: readonly DocumentoExcluidoF29[];
    };
    readonly cambios: readonly CambioF29[];
    readonly conciliacion: {
        readonly debito: { readonly cuenta: string; readonly libro: string; readonly propuesta: string };
        readonly credito: { readonly cuenta: string; readonly libro: string; readonly propuesta: string };
        readonly cuadra: boolean;
    };
    readonly documentos: { readonly ventas: number; readonly compras: number; readonly honorarios: number };
}

export interface RemanenteF29Input {
    readonly remanente_anterior: string;
    readonly utm_anterior: string | null;
    readonly utm_actual: string | null;
    readonly version?: number;
}

const rutaF29 = (periodo: string) => `/f29/${encodeURIComponent(periodo)}`;

export const f29Api = {
    listar: (anio: number, opciones?: ApiFetchOptions) =>
        api.get<ResumenPropuestaF29[]>(`/f29${consulta({ anio })}`, opciones),
    obtener: (periodo: string, opciones?: ApiFetchOptions) => api.get<F29DelMes>(rutaF29(periodo), opciones),
    /** Administrador o contador. Crea el borrador si no existe. */
    guardarRemanente: (periodo: string, datos: RemanenteF29Input, opciones?: ApiFetchOptions) =>
        apiFetch<PropuestaF29>(`${rutaF29(periodo)}/remanente`, { ...opciones, method: "PUT", json: datos }),
    /** Con alertas críticas, `alertas_revisadas` tiene que ser true. */
    aprobar: (periodo: string, datos: { readonly alertas_revisadas: boolean; readonly version?: number }, opciones?: ApiFetchOptions) =>
        api.post<PropuestaF29>(`${rutaF29(periodo)}/aprobacion`, datos, opciones),
    desaprobar: (periodo: string, opciones?: ApiFetchOptions) =>
        api.delete<PropuestaF29>(`${rutaF29(periodo)}/aprobacion`, opciones),
    /** Anota que el contador lo presentó en el SII. Desde ahí la propuesta no cambia. */
    declarar: (
        periodo: string,
        datos: { readonly folio_sii: string; readonly fecha_presentacion: string; readonly version?: number },
        opciones?: ApiFetchOptions,
    ) => api.post<PropuestaF29>(`${rutaF29(periodo)}/declaracion`, datos, opciones),
};

export const asientosApi = {
    listar: (filtros: FiltroAsientos = {}, opciones?: ApiFetchOptions) =>
        api.get<Paginado<AsientoListado>>(
            `/asientos-contables${consulta({ ...filtros })}`,
            opciones,
        ),
    obtener: (id: string, opciones?: ApiFetchOptions) =>
        api.get<AsientoDetalle>(`/asientos-contables/${encodeURIComponent(id)}`, opciones),
    crear: (datos: CrearAsientoInput, opciones?: ApiFetchOptions) =>
        api.post<AsientoDetalle>("/asientos-contables", datos, opciones),
    /** Art. 32 del Codigo de Comercio: el error se salva con un asiento nuevo. */
    revertir: (
        id: string,
        datos: { readonly fecha_contable?: string; readonly motivo: string },
        opciones?: ApiFetchOptions,
    ) =>
        api.post<AsientoDetalle>(
            `/asientos-contables/${encodeURIComponent(id)}/reversion`,
            datos,
            opciones,
        ),
    libroDiario: (desde: string, hasta: string, opciones?: ApiFetchOptions) =>
        api.get<LibroDiario>(`/asientos-contables/libro-diario${consulta({ desde, hasta })}`, opciones),
    libroMayor: (id_cuenta: string, desde: string, hasta: string, opciones?: ApiFetchOptions) =>
        api.get<LibroMayor>(
            `/asientos-contables/libro-mayor${consulta({ id_cuenta, desde, hasta })}`,
            opciones,
        ),
    /** Cifras del panel de control; sin anio, el ejercicio en curso. */
    resumen: (anio?: number, opciones?: ApiFetchOptions) =>
        api.get<ResumenPanel>(`/asientos-contables/resumen${consulta({ anio })}`, opciones),
};

export const borradoresApi = {
    listar: (opciones?: ApiFetchOptions) =>
        api.get<AsientoBorrador[]>("/asientos-borradores", opciones),
    obtener: (id: string, opciones?: ApiFetchOptions) =>
        api.get<AsientoBorrador>(`/asientos-borradores/${encodeURIComponent(id)}`, opciones),
    crear: (datos: GuardarBorradorInput, opciones?: ApiFetchOptions) =>
        api.post<AsientoBorrador>("/asientos-borradores", datos, opciones),
    guardar: (
        id: string,
        datos: GuardarBorradorInput & { readonly version: number },
        opciones?: ApiFetchOptions,
    ) => api.patch<AsientoBorrador>(`/asientos-borradores/${encodeURIComponent(id)}`, datos, opciones),
    descartar: (id: string, opciones?: ApiFetchOptions) =>
        api.delete<{ message: string }>(`/asientos-borradores/${encodeURIComponent(id)}`, opciones),
    contabilizar: (id: string, opciones?: ApiFetchOptions) =>
        api.post<AsientoDetalle>(
            `/asientos-borradores/${encodeURIComponent(id)}/contabilizar`,
            {},
            opciones,
        ),
};

export const cuentasApi = {
    listar: (opciones?: ApiFetchOptions) =>
        api.get<CuentaContable[]>("/cuentas-contables", opciones),
    plantilla: (opciones?: ApiFetchOptions) =>
        api.get<PlantillaCuentas>("/cuentas-contables/plantilla", opciones),
    /**
     * Administrador o contador. Crea lo marcado del plan base (con sus
     * agrupaciones) y las cuentas propias, y completa la estructura de las
     * cuentas que la empresa ya tiene.
     */
    configurar: (datos: ConfigurarPlanInput, opciones?: ApiFetchOptions) =>
        api.post<{ cuentas_creadas: number; cuentas_reubicadas: number }>(
            "/cuentas-contables/plantilla",
            datos,
            opciones,
        ),
    crear: (datos: CrearCuentaInput, opciones?: ApiFetchOptions) =>
        api.post<CuentaContable>("/cuentas-contables", datos, opciones),
    actualizar: (id: string, datos: ActualizarCuentaInput, opciones?: ApiFetchOptions) =>
        api.patch<CuentaContable>(`/cuentas-contables/${encodeURIComponent(id)}`, datos, opciones),
    /** Borra la cuenta si nunca tuvo historia; con asientos o cuentas dentro, la desactiva (con saldo cero). */
    eliminar: (id: string, opciones?: ApiFetchOptions) =>
        api.delete<{ message: string }>(`/cuentas-contables/${encodeURIComponent(id)}`, opciones),
};

export const periodosApi = {
    listar: (opciones?: ApiFetchOptions) =>
        api.get<PeriodoContable[]>("/periodos-contables", opciones),
    crear: (datos: { readonly anio: number; readonly mes: number }, opciones?: ApiFetchOptions) =>
        api.post<PeriodoContable>("/periodos-contables", datos, opciones),
    /**
     * Los meses del ejercicio que ya comenzaron; solo crea los que faltan y
     * rechaza un año futuro. La pantalla de períodos ya no lo usa: abre mes a
     * mes con `crear`.
     */
    abrirEjercicio: (anio: number, opciones?: ApiFetchOptions) =>
        api.post<PeriodoContable[]>("/periodos-contables/ejercicio", { anio }, opciones),
    cerrar: (id: string, opciones?: ApiFetchOptions) =>
        api.patch<PeriodoContable>(`/periodos-contables/${encodeURIComponent(id)}/cerrar`, {}, opciones),
    /** Solo administrador; el motivo queda registrado. */
    reabrir: (id: string, motivo: string, opciones?: ApiFetchOptions) =>
        api.patch<PeriodoContable>(
            `/periodos-contables/${encodeURIComponent(id)}/reabrir`,
            { motivo },
            opciones,
        ),
};

/**
 * Mensajes que el backend escribio para la persona usuaria.
 *
 * Los 400, 404 y 409 del modulo contable traen mensajes en espanol pensados
 * para mostrarse ("El periodo 9/2026 esta cerrado..."). Un 500 no: su cuerpo
 * es generico o tecnico, y ahi se usa el mensaje por defecto de quien llama.
 */
export function mensajesDelBackend(error: unknown): string[] | null {
    if (!(error instanceof ApiError) || ![400, 404, 409].includes(error.status)) {
        return null;
    }
    const cuerpo = error.body as { message?: unknown } | null;
    const mensaje = cuerpo?.message;
    if (typeof mensaje === "string") return [mensaje];
    if (Array.isArray(mensaje) && mensaje.every((m) => typeof m === "string")) {
        return mensaje as string[];
    }
    return null;
}

/** Respuesta de POST /auth/login. */
export interface LoginResponse {
    readonly access_token: string;
    readonly user: Usuario;
}

/**
 * Una empresa a la que el usuario tiene acceso, con su rol EN ella.
 *
 * El rol es por empresa, no por persona: el mismo usuario puede ser
 * administrador en una y solo-consulta en otra.
 */
export interface EmpresaDelUsuario {
    readonly id_empresa: string;
    readonly razon_social: string | null;
    readonly rut: string | null;
    readonly id_rol: number;
}

export const authApi = {
    /**
     * Se llama SOLO desde el servidor (route handler de Next), nunca desde el
     * navegador: el access_token no debe pasar por JavaScript del cliente.
     */
    login: (rut: string, password: string) =>
        api.post<LoginResponse>("/auth/login", { rut, password }),

    /** Empresas del usuario, para poblar el selector de la cabecera. */
    misEmpresas: (opciones?: ApiFetchOptions) =>
        api.get<EmpresaDelUsuario[]>("/auth/mis-empresas", opciones),

    /**
     * Pide un token nuevo para otra empresa.
     *
     * El backend comprueba la pertenencia antes de firmar: si el usuario no
     * tiene acceso a esa empresa responde 404 y no devuelve token alguno.
     */
    cambiarEmpresa: (id_empresa: string, opciones?: ApiFetchOptions) =>
        api.post<LoginResponse>("/auth/cambiar-empresa", { id_empresa }, opciones),
};

/**
 * Comprobación de vida del backend.
 *
 * El backend responde texto plano en la raíz (AppController.getHello), no JSON,
 * así que no puede pasar por apiFetch. Sirve para diagnosticar despliegues: si
 * esto falla, ninguna otra llamada va a funcionar.
 */
export async function verificarBackend(): Promise<boolean> {
    try {
        const response = await fetch(`${API_BASE_URL}/`, { cache: "no-store" });
        return response.ok;
    } catch {
        return false;
    }
}
