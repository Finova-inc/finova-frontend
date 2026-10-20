"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { nombrePeriodo } from "@/lib/formato";
import { mesDesplazado, urlLibro } from "@/lib/sii";
import { CuadriculaMeses, FLECHA, useCerrarAlSalir } from "./CuadriculaMeses";

/**
 * Selector de mes de la pantalla: las flechas van al mes anterior o al
 * siguiente, y el nombre del mes abre la cuadrícula de meses para saltar a
 * cualquiera. Es el único control de mes de la vista.
 *
 * Los meses son enlaces, así que el mes queda en la URL como el resto de la vista.
 */
export function SelectorMes({ libro, periodo }: { readonly libro: string; readonly periodo: string }) {
    const [anio, mes] = periodo.split("-").map(Number);
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    useCerrarAlSalir(abierto, contenedor, () => setAbierto(false));

    return (
        <div ref={contenedor} className="relative">
            <nav aria-label="Período" className="inline-flex items-center rounded-lg border border-[var(--border-strong)] p-0.5">
                <Link replace aria-label="Mes anterior" href={urlLibro({ libro, periodo: mesDesplazado(periodo, -1) })} className={FLECHA}>
                    <Icon name="chevron" className="size-4 rotate-180" />
                </Link>
                <button
                    type="button"
                    aria-expanded={abierto}
                    aria-haspopup="dialog"
                    title="Elegir otro mes"
                    onClick={() => setAbierto((valor) => !valor)}
                    className="flex min-w-40 items-center justify-center gap-1.5 rounded-md px-2 py-1.5 text-[14px] font-semibold capitalize hover:bg-[var(--background-raised)]"
                >
                    {nombrePeriodo(anio, mes)}
                    <Icon name="chevron" className={`size-3.5 text-[var(--foreground-muted)] transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`} />
                </button>
                <Link replace aria-label="Mes siguiente" href={urlLibro({ libro, periodo: mesDesplazado(periodo, 1) })} className={FLECHA}>
                    <Icon name="chevron" className="size-4" />
                </Link>
            </nav>
            {/* key: cada vez que se abre, la cuadrícula parte en el año del mes mostrado. */}
            {abierto ? (
                <CuadriculaMeses key={periodo} periodo={periodo} hrefDe={(p) => urlLibro({ libro, periodo: p })} onCerrar={() => setAbierto(false)} />
            ) : null}
        </div>
    );
}
