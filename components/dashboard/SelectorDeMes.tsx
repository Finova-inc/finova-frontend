"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { desplazarMes, nombreDelMes } from "@/lib/f29";
import { CuadriculaMeses, FLECHA, useCerrarAlSalir } from "@/app/dashboard/documentos/CuadriculaMeses";

/**
 * Selector de mes de una pantalla que lleva el mes en la URL (?periodo=AAAA-MM):
 * flechas al mes anterior o siguiente, y el nombre abre la cuadrícula de meses
 * (la misma de Documentos). `ruta` es la pantalla, sin parámetros.
 */
export function SelectorDeMes({ ruta, periodo }: { readonly ruta: string; readonly periodo: string }) {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    useCerrarAlSalir(abierto, contenedor, () => setAbierto(false));
    const url = (p: string) => `${ruta}?periodo=${p}`;

    return (
        <div ref={contenedor} className="no-imprimir relative">
            <nav aria-label="Período" className="inline-flex items-center rounded-lg border border-[var(--border-strong)] p-0.5">
                <Link replace aria-label="Mes anterior" href={url(desplazarMes(periodo, -1))} className={FLECHA}>
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
                <Link replace aria-label="Mes siguiente" href={url(desplazarMes(periodo, 1))} className={FLECHA}>
                    <Icon name="chevron" className="size-4" />
                </Link>
            </nav>
            {abierto ? <CuadriculaMeses key={periodo} periodo={periodo} hrefDe={url} onCerrar={() => setAbierto(false)} /> : null}
        </div>
    );
}
