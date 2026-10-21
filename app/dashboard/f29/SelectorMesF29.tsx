"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { desplazarMes, nombreDelMes } from "@/lib/f29";
import { CuadriculaMeses, FLECHA, useCerrarAlSalir } from "../documentos/CuadriculaMeses";

/** URL de la pantalla en un mes: el mes va en la URL, como en Documentos. */
const urlF29 = (periodo: string) => `/dashboard/f29?periodo=${periodo}`;

/**
 * Selector del mes que se declara: flechas al mes anterior o siguiente, y el
 * nombre abre la cuadrícula de meses (la misma de Documentos).
 */
export function SelectorMesF29({ periodo }: { readonly periodo: string }) {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    useCerrarAlSalir(abierto, contenedor, () => setAbierto(false));

    return (
        <div ref={contenedor} className="no-imprimir relative">
            <nav aria-label="Período" className="inline-flex items-center rounded-lg border border-[var(--border-strong)] p-0.5">
                <Link replace aria-label="Mes anterior" href={urlF29(desplazarMes(periodo, -1))} className={FLECHA}>
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
                    {nombreDelMes(periodo)} {periodo.slice(0, 4)}
                    <Icon name="chevron" className={`size-3.5 text-[var(--foreground-muted)] transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`} />
                </button>
                <Link replace aria-label="Mes siguiente" href={urlF29(desplazarMes(periodo, 1))} className={FLECHA}>
                    <Icon name="chevron" className="size-4" />
                </Link>
            </nav>
            {abierto ? <CuadriculaMeses key={periodo} periodo={periodo} hrefDe={urlF29} onCerrar={() => setAbierto(false)} /> : null}
        </div>
    );
}
