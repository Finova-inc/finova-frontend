"use client";

import { useEffect } from "react";
import { Boton } from "@/components/ui/Boton";

/**
 * Error inesperado en el libro diario.
 *
 * Next 16.3 entrega `retry` (vuelve a pedir los datos y re-renderiza) en vez
 * del antiguo `reset`. El mensaje del error no se muestra: en produccion Next
 * lo reemplaza por uno generico para no filtrar detalles del servidor.
 */
export default function ErrorLibroDiario({
    error,
    retry,
}: {
    error: Error & { digest?: string };
    retry: () => void;
}) {
    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <div
            role="alert"
            className="rounded-xl bg-[var(--critico-bg)] p-5 text-[13.5px] text-[var(--critico)]"
        >
            <p className="font-semibold">No pudimos mostrar el libro diario.</p>
            <p className="mt-1">
                Si el servidor estaba inactivo puede tardar unos segundos en despertar. Ningún asiento se
                pierde por esto: los contabilizados ya están guardados.
            </p>
            <div className="mt-3">
                <Boton variante="neutro" onClick={() => retry()}>
                    Reintentar
                </Boton>
            </div>
        </div>
    );
}
