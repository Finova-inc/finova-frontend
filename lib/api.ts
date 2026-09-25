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
    { json, token, headers, signal, ...init }: ApiFetchOptions = {},
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
            body: json === undefined ? undefined : JSON.stringify(json),
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

export const empresasApi = {
    listar: (opciones?: ApiFetchOptions) => api.get<Empresa[]>("/empresas", opciones),
    obtener: (id: string, opciones?: ApiFetchOptions) =>
        api.get<Empresa>(`/empresas/${id}`, opciones),
    crear: (datos: CrearEmpresaInput, opciones?: ApiFetchOptions) =>
        api.post<Empresa>("/empresas", datos, opciones),
    actualizar: (id: string, datos: Partial<CrearEmpresaInput>, opciones?: ApiFetchOptions) =>
        api.patch<Empresa>(`/empresas/${id}`, datos, opciones),
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
    readonly created_at: string;
    readonly deleted_at: string | null;
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
    readonly texto?: string;
    readonly pagina?: number;
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

/** Cuenta del plan contable. */
export interface CuentaContable {
    readonly id_cuenta: string;
    readonly id_empresa: string;
    readonly codigo: string;
    readonly nombre: string;
    /** 1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingreso, 5 Gasto. */
    readonly id_tipo_cuenta: number;
    readonly is_active: boolean;
}

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
}

export const tercerosApi = {
    listar: (opciones?: ApiFetchOptions) => api.get<Tercero[]>("/terceros", opciones),
};

export const documentosApi = {
    listar: (opciones?: ApiFetchOptions) => api.get<Documento[]>("/documentos", opciones),
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
    /** Solo administrador, y solo en una empresa sin cuentas. */
    cargarPlantilla: (opciones?: ApiFetchOptions) =>
        api.post<{ cuentas_creadas: number }>("/cuentas-contables/plantilla", {}, opciones),
};

export const periodosApi = {
    listar: (opciones?: ApiFetchOptions) =>
        api.get<PeriodoContable[]>("/periodos-contables", opciones),
    crear: (datos: { readonly anio: number; readonly mes: number }, opciones?: ApiFetchOptions) =>
        api.post<PeriodoContable>("/periodos-contables", datos, opciones),
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
    login: (correo: string, password: string) =>
        api.post<LoginResponse>("/auth/login", { correo, password }),

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
