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
 * Empresa.
 *
 * ATENCIÓN: hoy `Empresa` en el backend es una clase vacía, y los DTO también
 * (src/empresas/entities/empresa.entity.ts). Estos campos son la forma
 * esperada, no la confirmada. Al definir la entidad real hay que sincronizar
 * esta interfaz.
 */
export interface Empresa {
    readonly id: number;
    readonly rut: string;
    readonly razonSocial: string;
    readonly giro?: string;
}

export const empresasApi = {
    listar: () => api.get<Empresa[]>("/empresas"),
    obtener: (id: number) => api.get<Empresa>(`/empresas/${id}`),
    crear: (datos: Omit<Empresa, "id">) => api.post<Empresa>("/empresas", datos),
    actualizar: (id: number, datos: Partial<Omit<Empresa, "id">>) =>
        api.patch<Empresa>(`/empresas/${id}`, datos),
    eliminar: (id: number) => api.delete<void>(`/empresas/${id}`),
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
