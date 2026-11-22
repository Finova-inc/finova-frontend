"use client";

import * as m from "motion/react-m";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";

import { COOKIE_MENU, guardarPreferencia, MENU_PLEGADO } from "@/components/dashboard/preferencias-panel";
import { Icon, type IconName } from "@/components/ui/Icon";
import { puedeAuditar } from "@/lib/roles";

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
    /** Solo se muestra a quien puede ver la auditoría. Es presentación: el backend es quien autoriza. */
    readonly soloAuditores?: boolean;
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
            // Las empresas se gestionan desde el popup de la cabecera.
            { href: "/dashboard/documentos", etiqueta: "Documentos", icono: "document" },
            { href: "/dashboard/terceros", etiqueta: "Terceros", icono: "users" },
        ],
    },
    {
        titulo: "Contabilidad",
        enlaces: [
            { href: "/dashboard/core-contable", etiqueta: "Libro diario", icono: "calculator" },
            { href: "/dashboard/libro-mayor", etiqueta: "Libro mayor", icono: "ledger" },
            { href: "/dashboard/balance", etiqueta: "Balance", icono: "calculator" },
            { href: "/dashboard/plan-cuentas", etiqueta: "Plan de cuentas", icono: "ledger" },
            { href: "/dashboard/periodos", etiqueta: "Períodos", icono: "lock" },
            { href: "/dashboard/parametros", etiqueta: "Parámetros", icono: "pencil" },
            { href: "/dashboard/f29", etiqueta: "Formulario F29", icono: "check" },
        ],
    },
    {
        titulo: "Inteligencia",
        enlaces: [
            { href: "/dashboard/copiloto", etiqueta: "Copiloto IA", icono: "sparkle" },
            { href: "/dashboard/auditoria", etiqueta: "Auditoría", icono: "clock", soloAuditores: true },
        ],
    },
    {
        titulo: "Empresa",
        enlaces: [{ href: "/dashboard/usuarios", etiqueta: "Usuarios", icono: "shield" }],
    },
];

/**
 * Decide si un enlace corresponde a la ruta actual.
 *
 * /dashboard se compara de forma exacta; el resto por prefijo, para que una
 * subruta como /dashboard/core-contable/nuevo siga marcando "Libro diario". Sin la
 * excepcion, /dashboard quedaria activo en TODAS las pantallas del panel,
 * porque es prefijo de todas.
 */
function esRutaActiva(pathname: string, href: string): boolean {
    if (href === "/dashboard") {
        return pathname === "/dashboard";
    }

    return pathname === href || pathname.startsWith(`${href}/`);
}

/*
   Bajo 1024 px la barra es un cajon: sale de la pantalla y se abre con el boton
   de la esquina. Con ella fija, a 800 px el contenido quedaba en ~540 px y las
   tablas (720-760 px) escondian columnas enteras (Valor, Estado, Debe, Haber).
   El breakpoint es `lg` a proposito, no `md`: tiene que coincidir con el
   `lg:flex-row` de app/dashboard/layout.tsx.

   Desde 1024 px se puede plegar a una franja de iconos (boton al pie o
   Ctrl+B) para dar espacio a tablas y formularios en pantallas chicas. La
   preferencia va en una cookie (preferencias-panel.ts). Al plegar o expandir,
   el ancho del menu SI se anima (250 ms, curva de salida): es la excepcion a
   "no animar width" que se pidio a proposito, porque el cambio de golpe se
   veia tosco. Es un solo elemento, y el relleno y las etiquetas cambian junto
   con el ancho para que el icono no salte (ver el comentario dentro del aside).
*/
export default function Sidebar({
    plegadoInicial = false,
    rol = null,
}: {
    readonly plegadoInicial?: boolean;
    /** El rol del token, para mostrar u ocultar enlaces. Sin rol, solo los que no piden uno. */
    readonly rol?: number | null;
}) {
    const pathname = usePathname();
    const [abierto, setAbierto] = useState(false);
    const [plegado, setPlegado] = useState(plegadoInicial);
    // Solo pesa desde lg: bajo eso la barra es el cajon de siempre.
    const angosto = plegado;

    function alternarPlegado() {
        setPlegado((actual) => {
            guardarPreferencia(COOKIE_MENU, actual ? null : MENU_PLEGADO);
            return !actual;
        });
    }

    useEffect(() => {
        const alTeclear = (e: KeyboardEvent) => {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "b") return;
            // En un editor de texto enriquecido Ctrl+B es negrita.
            if (e.target instanceof HTMLElement && e.target.isContentEditable) return;
            if (!window.matchMedia("(min-width: 1024px)").matches) return;
            e.preventDefault();
            alternarPlegado();
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, []);

    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => {
            if (e.key === "Escape") setAbierto(false);
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [abierto]);

    return (
        <>
            {/* Va fijo en la esquina de la cabecera (que deja ese hueco con pl-14). */}
            <button
                type="button"
                onClick={() => setAbierto(true)}
                aria-label="Abrir el menú"
                aria-expanded={abierto}
                aria-controls="menu-lateral"
                className="no-imprimir fixed left-3 top-[10px] z-20 grid size-10 place-items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)] lg:hidden"
            >
                <Icon name="menu" className="size-5" />
            </button>

            {abierto ? (
                <button
                    type="button"
                    aria-label="Cerrar el menú"
                    tabIndex={-1}
                    onClick={() => setAbierto(false)}
                    className="fixed inset-0 z-30 bg-black/50 lg:hidden"
                />
            ) : null}

            <aside
                id="menu-lateral"
                /* Cerrado y chico: invisible, para que tampoco reciba el foco del teclado. */
                className={`fixed inset-y-0 left-0 z-40 flex w-[260px] flex-col gap-1 overflow-y-auto overflow-x-hidden border-r border-[var(--sidebar-borde)] bg-[var(--sidebar-bg)] py-5 text-[var(--sidebar-ink)] transition-[translate,visibility,width] duration-(--duracion-larga) ease-(--curva-salida) lg:sticky lg:top-0 lg:z-auto lg:h-screen lg:shrink-0 lg:translate-x-0 lg:visible ${
                    abierto ? "visible translate-x-0" : "invisible -translate-x-full"
                } ${angosto ? "lg:w-16" : "lg:w-[236px]"}`}
            >
                {/* Plegar anima el ancho del menu (aside) y, a la vez, el relleno y el texto de cada
                    pieza: el icono queda siempre en su sitio y las etiquetas se funden y se cierran
                    en vez de aparecer y desaparecer de golpe. Las etiquetas siguen en el DOM
                    (opacity 0, ancho 0): el lector de pantalla las lee igual. */}
                <div className={`flex items-center pb-5 pl-5 pr-5 transition-[padding] duration-(--duracion-larga) ease-(--curva-salida) ${angosto ? "lg:pl-[19px] lg:pr-0" : ""}`}>
                    <GlifoFinova />

                    <div className={`ml-2.5 max-w-[200px] min-w-0 flex-1 overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-(--duracion-larga) ease-(--curva-salida) ${angosto ? "lg:ml-0 lg:max-w-0 lg:opacity-0" : ""}`}>
                        <div className="font-display text-[17px] font-bold leading-tight tracking-[-0.01em]">
                            Finova
                        </div>
                        <div className="text-[11px] leading-tight text-[var(--sidebar-muted)]">
                            Gestión contable
                        </div>
                    </div>

                    <button
                        type="button"
                        onClick={() => setAbierto(false)}
                        aria-label="Cerrar el menú"
                        className="grid size-8 shrink-0 place-items-center rounded-md hover:bg-[var(--sidebar-hover)] lg:hidden"
                    >
                        <Icon name="close" className="size-4" />
                    </button>
                </div>

                <nav className="flex flex-col gap-0.5">
                    {GRUPOS.map((grupo) => (
                        <div key={grupo.titulo} className="flex flex-col gap-0.5">
                            {/* Plegada, el titulo queda para el lector de pantalla y una linea separa los grupos. */}
                            <p
                                className={`border-t border-transparent px-5 pb-1.5 pt-4 text-[10px] font-semibold uppercase tracking-[0.09em] text-[var(--sidebar-muted)] transition-[margin,padding,border-color] duration-(--duracion-larga) ease-(--curva-salida) ${
                                    angosto ? "lg:mx-4 lg:mt-2 lg:border-[var(--sidebar-hover)] lg:px-0 lg:pb-0 lg:pt-2" : ""
                                }`}
                            >
                                <span className={`block max-h-5 overflow-hidden whitespace-nowrap transition-[max-height,opacity] duration-(--duracion-larga) ease-(--curva-salida) ${angosto ? "lg:max-h-0 lg:opacity-0" : ""}`}>{grupo.titulo}</span>
                            </p>

                            {grupo.enlaces.filter((enlace) => !enlace.soloAuditores || puedeAuditar(rol)).map((enlace) => {
                                const activo = esRutaActiva(pathname, enlace.href);

                                return (
                                    <Link
                                        key={enlace.href}
                                        href={enlace.href}
                                        onClick={() => setAbierto(false)}
                                        /* aria-current es lo que anuncia "estas aqui" a un
                                           lector de pantalla. El color por si solo no lo dice. */
                                        aria-current={activo ? "page" : undefined}
                                        title={angosto ? enlace.etiqueta : undefined}
                                        className={`relative isolate mx-2.5 flex items-center rounded-md py-2 pl-2.5 pr-2.5 text-[13.5px] transition-[padding,background-color,color] duration-(--duracion-larga) ease-(--curva-salida) ${
                                            angosto ? "lg:pl-[14px] lg:pr-0" : ""
                                        } ${
                                            activo
                                                ? "font-semibold text-[var(--sidebar-activo-ink)]"
                                                : "hover:bg-[var(--sidebar-hover)]"
                                        }`}
                                    >
                                        {/* Pildora de la pagina activa: es UNA sola (mismo layoutId), asi que al cambiar de
                                            opcion se desliza de un enlace al otro en vez de apagarse y encenderse. Va detras
                                            del texto (-z-10 dentro del isolate) y es decorativa: la pagina actual la sigue
                                            anunciando aria-current. Con "reducir movimiento" salta sin animar. */}
                                        {activo ? (
                                            <m.span
                                                layoutId="pildora-menu"
                                                aria-hidden="true"
                                                className="absolute inset-0 -z-10 rounded-md bg-[var(--sidebar-activo-bg)]"
                                                transition={{ type: "spring", stiffness: 520, damping: 42 }}
                                            />
                                        ) : null}
                                        <Icon name={enlace.icono} className="size-4 shrink-0 opacity-85" />
                                        <span className={`ml-2.5 max-w-[180px] overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-(--duracion-larga) ease-(--curva-salida) ${angosto ? "lg:ml-0 lg:max-w-0 lg:opacity-0" : ""}`}>{enlace.etiqueta}</span>
                                    </Link>
                                );
                            })}
                        </div>
                    ))}
                </nav>

                <button
                        type="button"
                        onClick={alternarPlegado}
                        aria-expanded={!plegado}
                        aria-controls="menu-lateral"
                        aria-keyshortcuts="Control+B Meta+B"
                        title={plegado ? "Expandir el menú (Ctrl+B)" : "Plegar el menú (Ctrl+B)"}
                        className={`mx-2.5 mt-auto hidden items-center rounded-md py-2 pl-2.5 pr-2.5 text-[12.5px] text-[var(--sidebar-muted)] transition-[padding,background-color,color] duration-(--duracion-larga) ease-(--curva-salida) hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-ink)] lg:flex ${
                            plegado ? "lg:pl-[14px] lg:pr-0" : ""
                        }`}
                    >
                        <Icon name="panel" className="size-4 shrink-0" />
                        <span className={`overflow-hidden whitespace-nowrap transition-[max-width,margin,opacity] duration-(--duracion-larga) ease-(--curva-salida) ${plegado ? "ml-0 max-w-0 opacity-0" : "ml-2.5 max-w-[180px]"}`}>{plegado ? "Expandir el menú" : "Plegar el menú"}</span>
                    </button>
            </aside>
        </>
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
