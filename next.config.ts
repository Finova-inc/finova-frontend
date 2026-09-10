import type { NextConfig } from "next";

/**
 * Política de seguridad de contenido.
 *
 * ---------------------------------------------------------------------------
 * SOBRE 'unsafe-inline' EN script-src
 * ---------------------------------------------------------------------------
 * El script que evita el parpadeo de tema es, por definición, un script inline:
 * tiene que correr durante el parseo del HTML, antes del primer paint. Una
 * política estricta de script-src 'self' lo bloquearía y devolvería el
 * parpadeo.
 *
 * Se acepta 'unsafe-inline' de forma consciente. En esta superficie el riesgo
 * es bajo: la landing no tiene base de datos, no acepta contenido de terceros y
 * no renderiza nada proveniente de entrada de usuario, así que no hay por dónde
 * inyectar un script.
 *
 * El endurecimiento posible, cuando el proyecto lo amerite, es reemplazarlo por
 * el hash SHA-256 del script:
 *
 *     script-src 'self' 'sha256-<hash de THEME_INIT_SCRIPT>'
 *
 * Tiene un costo de mantenimiento real: hay que regenerar el hash cada vez que
 * cambie el texto del script, y si alguien lo olvida el fallo es silencioso.
 * La otra alternativa, nonces por petición, obligaría a renderizar la página de
 * forma dinámica en cada visita y se perdería el prerenderizado estático, que
 * es justo lo que hace rápida a una página de marketing.
 */
const IS_DEVELOPMENT = process.env.NODE_ENV === "development";

/**
 * Orígenes externos a los que el navegador puede abrir conexiones.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ ESTO NO PUEDE QUEDAR EN 'self'
 * ---------------------------------------------------------------------------
 * El backend NestJS vive en otro dominio que el frontend en Vercel. Con
 * connect-src 'self' a secas, el navegador bloquea cada fetch hacia la API
 * ANTES de que salga de la máquina. El síntoma es engañoso: no hay error de
 * red ni respuesta 4xx, solo una línea de CSP en la consola, así que es fácil
 * perder horas culpando a CORS o al backend.
 *
 * El origen se lee de CSP_CONNECT_SRC (ver .env.example) y no se escribe fijo
 * aquí porque cambia entre local, Preview y Production. Se leen SOLO esquema y
 * host, nunca rutas ni comodines abiertos.
 *
 * Es una variable de build: Next evalúa este archivo al compilar, así que
 * cambiarla en Vercel exige un redespliegue para que tenga efecto.
 */
const EXTRA_CONNECT_SRC = (process.env.CSP_CONNECT_SRC ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .join(" ");

const CONNECT_SRC = ["connect-src 'self'", EXTRA_CONNECT_SRC]
    .filter(Boolean)
    .join(" ");

const CONTENT_SECURITY_POLICY = [
    "default-src 'self'",
    /**
     * script-src.
     *
     * 'unsafe-inline' es necesario para el script anti-parpadeo. Ver arriba.
     *
     * 'unsafe-eval' se agrega SOLO en desarrollo. React lo necesita para
     * reconstruir las trazas de error entre servidor y navegador; sin él, la
     * consola pierde utilidad al depurar. En producción React nunca usa eval(),
     * así que la política queda estricta donde importa.
     */
    IS_DEVELOPMENT
        ? "script-src 'self' 'unsafe-inline' 'unsafe-eval'"
        : "script-src 'self' 'unsafe-inline'",
    // Next.js inyecta estilos en línea; Tailwind se sirve como hoja propia.
    "style-src 'self' 'unsafe-inline'",
    // next/font autohospeda las tipografías, así que basta con 'self'.
    "font-src 'self'",
    "img-src 'self' data: blob:",
    // Backend NestJS y cualquier otro origen declarado. Ver EXTRA_CONNECT_SRC.
    CONNECT_SRC,
    // Impide que la página sea embebida en un iframe ajeno (clickjacking).
    "frame-ancestors 'none'",
    // Impide que un <base> inyectado reescriba las URL relativas.
    "base-uri 'self'",
    // Los formularios solo pueden enviarse a nuestro propio origen.
    "form-action 'self'",
    // Sin plugins: <object>, <embed> y <applet> quedan bloqueados.
    "object-src 'none'",
    // Fuerza HTTPS en cualquier subrecurso que quedara en HTTP.
    "upgrade-insecure-requests",
].join("; ");

/**
 * Cabeceras de seguridad aplicadas a todas las rutas.
 *
 * Se definen aquí y no en proxy.ts (antes middleware.ts, renombrado en Next 16)
 * a propósito: son valores estáticos, iguales para toda petición, así que el
 * borde las aplica sin costo de renderizado y la página conserva su
 * prerenderizado estático.
 */
const SECURITY_HEADERS = [
    {
        /**
         * Obliga al navegador a usar HTTPS durante dos años.
         *
         * Bloquea el ataque de degradación a HTTP, en el que alguien en la red
         * intercepta la primera petición en texto plano.
         *
         * Solo tiene efecto en producción sobre HTTPS; en localhost se ignora.
         */
        key: "Strict-Transport-Security",
        value: "max-age=63072000; includeSubDomains; preload",
    },
    {
        /**
         * Impide que el sitio sea cargado dentro de un iframe.
         *
         * Evita el clickjacking: superponer nuestra interfaz bajo una página
         * ajena para que alguien haga clic donde no cree estar haciéndolo.
         */
        key: "X-Frame-Options",
        value: "DENY",
    },
    {
        /**
         * Impide que el navegador adivine el tipo de un archivo.
         *
         * Sin esto, un archivo servido como texto podría interpretarse como
         * JavaScript si su contenido lo aparenta.
         */
        key: "X-Content-Type-Options",
        value: "nosniff",
    },
    {
        /**
         * Limita la información que se envía en la cabecera Referer.
         *
         * Al salir hacia otro dominio solo viaja el origen, nunca la ruta
         * completa, que podría contener identificadores internos.
         */
        key: "Referrer-Policy",
        value: "strict-origin-when-cross-origin",
    },
    {
        /**
         * Desactiva APIs del navegador que este sitio no necesita.
         *
         * Si algún día se colara un script malicioso, no podría pedir cámara,
         * micrófono ni ubicación.
         */
        key: "Permissions-Policy",
        value: "camera=(), microphone=(), geolocation=(), payment=(), usb=()",
    },
    {
        key: "Content-Security-Policy",
        value: CONTENT_SECURITY_POLICY,
    },
];

const nextConfig: NextConfig = {
    /**
     * Elimina la cabecera X-Powered-By.
     *
     * Anunciar el framework y su versión le ahorra trabajo de reconocimiento a
     * quien busca vulnerabilidades conocidas. No es una defensa por sí sola,
     * pero no hay razón para regalar la información.
     */
    poweredByHeader: false,

    async headers() {
        return [
            {
                // Aplica a todas las rutas del sitio.
                source: "/:path*",
                headers: SECURITY_HEADERS,
            },
        ];
    },
};

export default nextConfig;
