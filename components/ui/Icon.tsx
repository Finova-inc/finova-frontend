/**
 * Registro único de iconos en SVG inline.
 *
 * Se optó por un solo módulo en vez de una librería o un archivo por icono:
 *
 * - Sin librería: son ~14 iconos. Una dependencia como lucide-react traería
 *   cientos que nunca se usan, más un paso de build.
 * - Sin archivo por icono: a este volumen, 14 archivos es ruido de navegación
 *   sin ninguna ganancia.
 * - En un solo lugar: varios iconos se repiten entre secciones (el check aparece
 *   en Ventajas y en Precios). Duplicar los trazos haría que el grosor de línea
 *   se desviara con el tiempo.
 *
 * Este es un Server Component: los trazos no llegan al bundle del cliente salvo
 * donde los use un componente cliente.
 */

import type { SVGProps } from "react";

/**
 * Trazos de cada icono, dibujados sobre una grilla de 24x24.
 *
 * Todos comparten `stroke` sin `fill` para que el grosor sea homogéneo y el
 * color lo herede del texto contenedor.
 */
const ICON_PATHS = {
    /** Marca de Finova: círculos concéntricos, eco del logo del mockup. */
    logo: (
        <>
            <circle cx="12" cy="12" r="9" />
            <circle cx="12" cy="12" r="5" />
            <circle cx="12" cy="12" r="1.5" />
        </>
    ),
    /** Tema claro. */
    sun: (
        <>
            <circle cx="12" cy="12" r="4" />
            <path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4" />
        </>
    ),
    /** Tema oscuro. */
    moon: <path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z" />,
    /** Confirmación. */
    check: <path d="M20 6 9 17l-5-5" />,
    /** Flecha de avance en botones y enlaces. */
    arrowRight: <path d="M5 12h14M13 6l6 6-6 6" />,
    /** Documento tributario. */
    document: (
        <>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <path d="M14 2v6h6M8 13h8M8 17h5" />
        </>
    ),
    /** Sincronización con el SII. */
    sync: (
        <>
            <path d="M21 12a9 9 0 0 1-9 9 9 9 0 0 1-7.5-4" />
            <path d="M3 12a9 9 0 0 1 9-9 9 9 0 0 1 7.5 4" />
            <path d="M21 3v5h-5M3 21v-5h5" />
        </>
    ),
    /** Copiloto de IA. */
    sparkle: (
        <>
            <path d="M12 3l1.9 5.6L19.5 10l-5.6 1.9L12 17.5l-1.9-5.6L4.5 10l5.6-1.4z" />
            <path d="M18.5 16.5l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7z" />
        </>
    ),
    /** Alerta de inconsistencia. */
    alert: (
        <>
            <path d="M12 9v4M12 17h.01" />
            <path d="M10.3 3.9 1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z" />
        </>
    ),
    /** Seguridad y cifrado. */
    shield: (
        <>
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="M9 12l2 2 4-4" />
        </>
    ),
    /** Trazabilidad y auditoría. */
    clock: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 7v5l3 2" />
        </>
    ),
    /** Ahorro de tiempo. */
    bolt: <path d="M13 2 4 14h7l-1 8 9-12h-7z" />,
    /** Empresas y multi-tenant. */
    building: (
        <>
            <path d="M3 21h18M5 21V7l7-4 7 4v14" />
            <path d="M9 9h.01M15 9h.01M9 13h.01M15 13h.01M9 17h.01M15 17h.01" />
        </>
    ),
    /** Mostrar contraseña. */
    eye: (
        <>
            <path d="M2 12s3.6-7 10-7 10 7 10 7-3.6 7-10 7-10-7-10-7z" />
            <circle cx="12" cy="12" r="3" />
        </>
    ),
    /** Ocultar contraseña. */
    eyeOff: (
        <>
            <path d="M10.6 6.2A9.9 9.9 0 0 1 12 6c6.4 0 10 7 10 7a17 17 0 0 1-2.6 3.4M6.6 6.6A17 17 0 0 0 2 13s3.6 7 10 7a9.7 9.7 0 0 0 5.4-1.6" />
            <path d="M9.9 9.9a3 3 0 0 0 4.2 4.2M3 3l18 18" />
        </>
    ),
    /** Cálculo y cuadratura. */
    calculator: (
        <>
            <rect x="4" y="2" width="16" height="20" rx="2" />
            <path d="M8 6h8M8 11h.01M12 11h.01M16 11h.01M8 15h.01M12 15h.01M16 15v4M8 19h4" />
        </>
    ),

    /* ----------------------------------------------------------------------
       Iconografía del panel de control.

       Se añaden aquí y no en un registro aparte por el mismo motivo que
       explica la cabecera del archivo: varios se repiten entre la barra
       lateral y el cuerpo del panel (`document` ya existía y lo usan las dos),
       y separarlos haría que el grosor de línea se desviara con el tiempo.
       ---------------------------------------------------------------------- */

    /** Panel de control: cuadrícula de módulos. */
    grid: (
        <>
            <rect x="3" y="3" width="7" height="9" rx="1" />
            <rect x="14" y="3" width="7" height="5" rx="1" />
            <rect x="14" y="12" width="7" height="9" rx="1" />
            <rect x="3" y="16" width="7" height="5" rx="1" />
        </>
    ),
    /** Terceros: clientes y proveedores. */
    users: (
        <>
            <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
            <circle cx="9" cy="7" r="4" />
            <path d="M22 21v-2a4 4 0 0 0-3-3.9" />
        </>
    ),
    /** Plan de cuentas: estructura jerárquica. */
    ledger: (
        <>
            <path d="M4 4h16v16H4z" />
            <path d="M4 9h16M9 9v11M12 13h5M12 16h5" />
        </>
    ),
    /** Banco: frontis con columnas. */
    bank: (
        <>
            <path d="M3 10h18L12 4 3 10z" />
            <path d="M5 10v8M10 10v8M14 10v8M19 10v8M3 20h18" />
        </>
    ),
    /** Notificaciones. */
    bell: (
        <>
            <path d="M18 8a6 6 0 0 0-12 0c0 7-3 9-3 9h18s-3-2-3-9" />
            <path d="M13.7 21a2 2 0 0 1-3.4 0" />
        </>
    ),
    /** Búsqueda. */
    search: (
        <>
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.5-3.5" />
        </>
    ),
    /** Añadir: acción rápida. */
    plus: <path d="M12 5v14M5 12h14" />,
    /** Información y notas al pie. */
    info: (
        <>
            <circle cx="12" cy="12" r="9" />
            <path d="M12 8h.01M11 12h1v4h1" />
        </>
    ),
    /** Salir de la sesión. */
    logout: (
        <>
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
            <path d="M16 17l5-5-5-5M21 12H9" />
        </>
    ),
    /** Quitar una línea o descartar un borrador. */
    trash: (
        <>
            <path d="M3 6h18M8 6V4h8v2" />
            <path d="M19 6l-1 14H6L5 6M10 11v6M14 11v6" />
        </>
    ),
    /** Revertir un asiento: flecha que vuelve. */
    undo: (
        <>
            <path d="M9 14 4 9l5-5" />
            <path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11" />
        </>
    ),
    /** Periodo cerrado. */
    lock: (
        <>
            <rect x="4" y="11" width="16" height="10" rx="2" />
            <path d="M8 11V7a4 4 0 0 1 8 0v4" />
        </>
    ),
} as const;

/** Nombres válidos de icono. Tipar esto da autocompletado y error de compilación ante un typo. */
export type IconName = keyof typeof ICON_PATHS;

type IconProps = {
    readonly name: IconName;
    /** Etiqueta accesible. Si se omite, el icono se marca como decorativo. */
    readonly label?: string;
} & Omit<SVGProps<SVGSVGElement>, "children">;

/**
 * Renderiza un icono del registro.
 *
 * Por defecto el icono es DECORATIVO: se oculta a los lectores de pantalla con
 * aria-hidden. Esto es lo correcto en la mayoría de los casos, porque el icono
 * suele acompañar a un texto que ya dice lo mismo, y anunciarlo dos veces
 * estorba. Cuando el icono es la única información —un botón sin texto— hay que
 * pasar `label`.
 */
export function Icon({ name, label, className, ...svgProps }: IconProps) {
    const isDecorative = label === undefined;

    return (
        <svg
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.75}
            strokeLinecap="round"
            strokeLinejoin="round"
            className={className}
            aria-hidden={isDecorative || undefined}
            role={isDecorative ? undefined : "img"}
            aria-label={label}
            focusable="false"
            {...svgProps}
        >
            {ICON_PATHS[name]}
        </svg>
    );
}
