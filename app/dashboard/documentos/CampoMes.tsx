"use client";

import { useRef, useState } from "react";
import { Icon } from "@/components/ui/Icon";
import { nombrePeriodo } from "@/lib/formato";
import { CuadriculaMeses, useCerrarAlSalir } from "./CuadriculaMeses";

/**
 * Campo de formulario para elegir un mes. Muestra "Octubre 2026" y, al pulsarlo,
 * abre la cuadrícula de meses. Manda el valor como `periodo` ('AAAA-MM') en un
 * campo oculto, igual que lo haría un <input type="month">.
 */
export function CampoMes({ valor, onCambio }: { readonly valor: string; readonly onCambio: (periodo: string) => void }) {
    const [abierto, setAbierto] = useState(false);
    const contenedor = useRef<HTMLDivElement>(null);
    useCerrarAlSalir(abierto, contenedor, () => setAbierto(false));

    const [anio, mes] = valor.split("-").map(Number);

    return (
        <div ref={contenedor} className="relative">
            <input type="hidden" name="periodo" value={valor} />
            <button
                type="button"
                aria-haspopup="dialog"
                aria-expanded={abierto}
                onClick={() => setAbierto((v) => !v)}
                className="flex w-full items-center justify-between gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-left text-[13px] capitalize text-[var(--foreground)]"
            >
                {nombrePeriodo(anio, mes)}
                <Icon name="chevron" className={`size-3.5 text-[var(--foreground-muted)] transition-transform ${abierto ? "-rotate-90" : "rotate-90"}`} />
            </button>
            {abierto ? <CuadriculaMeses periodo={valor} onElegir={onCambio} onCerrar={() => setAbierto(false)} /> : null}
        </div>
    );
}
