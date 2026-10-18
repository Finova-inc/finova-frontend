"use client";

import Link from "next/link";
import { useEffect, useState, type RefObject } from "react";
import { Icon } from "@/components/ui/Icon";
import { nombreMes } from "@/lib/formato";

const ANIO_MIN = 2000;
const ANIO_MAX = 2100;

/** Cierra un desplegable con Escape o con un clic fuera de su contenedor. */
export function useCerrarAlSalir(abierto: boolean, contenedor: RefObject<HTMLElement | null>, cerrar: () => void) {
    useEffect(() => {
        if (!abierto) return;
        const alTeclear = (e: KeyboardEvent) => e.key === "Escape" && cerrar();
        const alHacerClic = (e: MouseEvent) => {
            if (contenedor.current && !contenedor.current.contains(e.target as Node)) cerrar();
        };
        document.addEventListener("keydown", alTeclear);
        document.addEventListener("mousedown", alHacerClic);
        return () => {
            document.removeEventListener("keydown", alTeclear);
            document.removeEventListener("mousedown", alHacerClic);
        };
    }, [abierto, contenedor, cerrar]);
}

export const FLECHA = "rounded-md px-2 py-1.5 text-[var(--foreground-muted)] hover:text-[var(--foreground)]";

/**
 * Cuadrícula de los 12 meses de un año, con flechas para cambiar de año. Sirve
 * para dos usos: moverse por la pantalla (`hrefDe`: cada mes es un enlace) y
 * elegir un mes en un formulario (`onElegir`: cada mes es un botón).
 *
 * Reemplaza a <input type="month">, que el navegador muestra en su idioma
 * (inglés en muchos equipos) y no en el del panel.
 */
export function CuadriculaMeses({
    periodo,
    hrefDe,
    onElegir,
    onCerrar,
}: {
    /** 'AAAA-MM' que se muestra marcado; el año con el que parte la cuadrícula. */
    readonly periodo: string;
    readonly hrefDe?: (periodo: string) => string;
    readonly onElegir?: (periodo: string) => void;
    readonly onCerrar: () => void;
}) {
    const [anioActual, mesActual] = periodo.split("-").map(Number);
    const [anio, setAnio] = useState(anioActual);

    return (
        <div
            role="dialog"
            aria-label="Elegir mes"
            className="absolute left-0 top-full z-20 mt-2 w-72 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-3 shadow-[0_8px_24px_rgb(20_17_15_/_0.18)]"
        >
            <div className="mb-2 flex items-center justify-between">
                <button type="button" aria-label="Año anterior" disabled={anio <= ANIO_MIN} onClick={() => setAnio(anio - 1)} className={`${FLECHA} disabled:opacity-40`}>
                    <Icon name="chevron" className="size-4 rotate-180" />
                </button>
                <span className="tabular text-[14px] font-semibold">{anio}</span>
                <button type="button" aria-label="Año siguiente" disabled={anio >= ANIO_MAX} onClick={() => setAnio(anio + 1)} className={FLECHA}>
                    <Icon name="chevron" className="size-4" />
                </button>
            </div>
            <div className="grid grid-cols-4 gap-1.5">
                {Array.from({ length: 12 }, (_, i) => i + 1).map((mes) => {
                    const destino = `${anio}-${String(mes).padStart(2, "0")}`;
                    const elegido = anio === anioActual && mes === mesActual;
                    const clases = `rounded-md px-2 py-2 text-center text-[13px] font-medium capitalize ${
                        elegido ? "bg-[var(--accent)] text-white" : "hover:bg-[var(--background-raised)]"
                    }`;
                    return hrefDe ? (
                        <Link key={mes} replace href={hrefDe(destino)} aria-current={elegido ? "date" : undefined} onClick={onCerrar} className={clases}>
                            {nombreMes(mes)}
                        </Link>
                    ) : (
                        <button
                            key={mes}
                            type="button"
                            aria-current={elegido ? "date" : undefined}
                            onClick={() => {
                                onElegir?.(destino);
                                onCerrar();
                            }}
                            className={clases}
                        >
                            {nombreMes(mes)}
                        </button>
                    );
                })}
            </div>
        </div>
    );
}
