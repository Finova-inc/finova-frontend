"use client";

import Link from "next/link";
import { useEffect } from "react";

import { Boton } from "@/components/ui/Boton";
import { MensajeDeEstado } from "@/components/ui/MensajeDeEstado";

/** Error inesperado en la parte pública (landing, login, recuperar, restablecer). El del panel es app/dashboard/error.tsx. */
export default function ErrorPublico({
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
        <main className="flex flex-1 items-center justify-center bg-[var(--background)] px-4 py-16">
            <MensajeDeEstado
                codigo="Error"
                tono="critico"
                titulo="No pudimos mostrar esta página."
                acciones={
                    <>
                        <Boton variante="acento" onClick={() => retry()}>
                            Reintentar
                        </Boton>
                        <Link
                            href="/"
                            className="inline-flex items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--background-raised)]"
                        >
                            Ir al inicio
                        </Link>
                    </>
                }
            >
                <p>Algo falló de nuestro lado. Reintenta en un momento.</p>
                {error.digest ? <p className="mt-3 text-[12px]">Código de referencia: {error.digest}</p> : null}
            </MensajeDeEstado>
        </main>
    );
}
