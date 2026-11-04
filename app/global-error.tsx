"use client";

import { Boton } from "@/components/ui/Boton";
import { InlineScript } from "@/components/ui/InlineScript";
import { MensajeDeEstado } from "@/components/ui/MensajeDeEstado";
import { fontVariables } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

/**
 * Último recurso: falló el layout raíz mismo. Reemplaza al layout, así que
 * repite <html>/<body>, los estilos y el script de tema; sin ellos saldría
 * blanco y sin fuentes.
 */
export default function ErrorGlobal({ retry }: { error: Error & { digest?: string }; retry: () => void }) {
    return (
        <html lang="es" suppressHydrationWarning className={`${fontVariables} h-full antialiased`}>
            <head>
                <title>Error · Finova</title>
                <InlineScript html={THEME_INIT_SCRIPT} />
            </head>
            <body className="flex min-h-full flex-col items-center justify-center bg-[var(--background)] px-4">
                <MensajeDeEstado
                    codigo="Error"
                    tono="critico"
                    titulo="Finova no pudo arrancar."
                    acciones={
                        <Boton variante="acento" onClick={() => retry()}>
                            Reintentar
                        </Boton>
                    }
                >
                    <p>Ocurrió un error inesperado. Reintenta; si sigue pasando, vuelve en unos minutos.</p>
                </MensajeDeEstado>
            </body>
        </html>
    );
}
