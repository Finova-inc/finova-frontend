"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { Icon, type IconName } from "@/components/ui/Icon";

/* ============================================================================
   Barra lateral del panel.

   ---------------------------------------------------------------------------
   POR QUE ES COMPONENTE CLIENTE
   ---------------------------------------------------------------------------
   Necesita usePathname() para marcar el enlace vigente. La version anterior era
   de servidor y no tenia estado activo en absoluto: los siete enlaces se veian
   identicos estuvieras donde estuvieras, que en un panel con tres secciones es
   justo la informacion que mas se busca al orientarse.

   El coste es pequeno: la barra es marcado estatico salvo por una comparacion
   de texto, y no arrastra al layout que la contiene, porque "use client" marca
   un modulo y no un subarbol.

   ---------------------------------------------------------------------------
   POR QUE LOS ENLACES SALEN DE UN ARREGLO
   ---------------------------------------------------------------------------
   Antes eran siete bloques <Link> escritos a mano con las mismas clases
   repetidas. Cualquier ajuste de relleno habia que hacerlo siete veces, y basta
   olvidar uno para que un enlace quede desalineado sin que nadie lo note.
   ========================================================================== */

type EnlaceNav = {
    readonly href: string;
    readonly etiqueta: string;
    readonly icono: IconName;
};

type GrupoNav = {
    readonly titulo: string;
    readonly enlaces: readonly EnlaceNav[];
};

const GRUPOS: readonly GrupoNav[] = [
    {
        titulo: "Principal",
        enlaces: [
            { href: "/dashboard", etiqueta: "Panel de control", icono: "grid" },
            { href: "/dashboard/empresas", etiqueta: "Empresas", icono: "building" },
            { href: "/dashboard/documentos", etiqueta: "Documentos", icono: "document" },
            { href: "/dashboard/terceros", etiqueta: "Terceros", icono: "users" },
        ],
    },
    {
        titulo: "Contabilidad",
        enlaces: [
            { href: "/dashboard/core-contable", etiqueta: "Libro diario", icono: "calculator" },
            { href: "/dashboard/plan-cuentas", etiqueta: "Plan de cuentas", icono: "ledger" },
            { href: "/dashboard/periodos", etiqueta: "Períodos", icono: "lock" },
            { href: "/dashboard/f29", etiqueta: "Formulario F29", icono: "check" },
        ],
    },
    {
        titulo: "Inteligencia",
        enlaces: [
            { href: "/dashboard/copiloto", etiqueta: "Copiloto IA", icono: "sparkle" },
            { href: "/dashboard/auditoria", etiqueta: "Auditoría", icono: "clock" },
        ],
    },
];

/**
 * Decide si un enlace corresponde a la ruta actual.
 *
 * /dashboard se compara de forma exacta; el resto por prefijo, para que una
 * subruta como /dashboard/empresas/nueva siga marcando "Empresas". Sin la
 * excepcion, /dashboard quedaria activo en TODAS las pantallas del panel,
 * porque es prefijo de todas.
 */
function esRutaActiva(pathname: string, href: string): boolean {
    if (href === "/dashboard") {
        return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

export default function Sidebar() {
    const pathname = usePathname();

    return (
        <aside className="flex shrink-0 flex-col gap-1 overflow-y-auto bg-[var(--sidebar-bg)] py-5 text-[var(--sidebar-ink)] md:sticky md:top-0 md:h-screen md:w-[236px]">
            <div className="flex items-center gap-2.5 px-5 pb-5">
                <GlifoFinova />

                <div className="min-w-0">
                    <div className="font-display text-[17px] font-bold leading-tight tracking-[-0.01em]">
                        Finova
                    </div>
                    <div className="text-[11px] leading-tight text-[var(--sidebar-muted)]">
                        Gestión contable
                    </div>
                </div>
            </div>

            <nav className="flex flex-col gap-0.5">
                {GRUPOS.map((grupo) => (
                    <div key={grupo.titulo} className="flex flex-col gap-0.5">
                        <p className="px-5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--sidebar-muted)]">
                            {grupo.titulo}
                        </p>

                        {grupo.enlaces.map((enlace) => {
                            const activo = esRutaActiva(pathname, enlace.href);

                            return (
                                <Link
                                    key={enlace.href}
                                    href={enlace.href}
                                    /* aria-current es lo que anuncia "estas aqui" a un
                                       lector de pantalla. El color por si solo no lo dice. */
                                    aria-current={activo ? "page" : undefined}
                                    className={`mx-2.5 flex items-center gap-2.5 rounded-md px-2.5 py-2 text-[13.5px] transition-colors ${
                                        activo
                                            ? "bg-[rgb(255_106_26_/_0.16)] font-semibold text-[#ffd9c2]"
                                            : "hover:bg-[var(--sidebar-hover)]"
                                    }`}
                                >
                                    <Icon name={enlace.icono} className="size-4 shrink-0 opacity-85" />
                                    {enlace.etiqueta}
                                </Link>
                            );
                        })}
                    </div>
                ))}
            </nav>
        </aside>
    );
}

/**
 * Glifo de la marca.
 *
 * Redibujado del logotipo: dos barras inclinadas, la delantera en naranjo
 * solido y la trasera en degradado hacia el grafito. Va como SVG inline y no
 * como <img> para que herede el tamano del contenedor y no cueste una peticion.
 */
function GlifoFinova() {
    return (
        <svg
            width="26"
            height="26"
            viewBox="0 0 26 26"
            fill="none"
            aria-hidden="true"
            className="shrink-0"
        >
            <defs>
                <linearGradient id="glifo-finova" x1="0" y1="0" x2="1" y2="1">
                    <stop offset="0%" stopColor="#ff8642" />
                    <stop offset="100%" stopColor="#6e6459" />
                </linearGradient>
            </defs>
            <path d="M5 17.5 L8.5 5.5 L11 5.5 L7.5 17.5 Z" fill="#ff6a1a" />
            <path
                d="M12.5 20.5 L17 3.5 L21 3.5 L20 7.5 L16.5 7.5 L15.5 11 L19 11 L16.5 20.5 Z"
                fill="url(#glifo-finova)"
            />
        </svg>
    );
}
