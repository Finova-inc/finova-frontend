import type { Metadata } from "next";

import { InlineScript } from "@/components/ui/InlineScript";
import { fontVariables } from "@/lib/fonts";
import { THEME_INIT_SCRIPT } from "@/lib/theme";

import "./globals.css";

export const metadata: Metadata = {
    title: {
        default: "Finova — Tu F29, cuadrado antes de declararlo",
        template: "%s · Finova",
    },
    description:
        "Finova importa tus DTE desde el SII, arma la propuesta de Formulario 29 y revisa las inconsistencias antes de que declares.",
    keywords: ["F29", "SII", "DTE", "contabilidad", "PYME", "Chile", "tributario"],
    authors: [{ name: "Finova Networks SpA" }],
    openGraph: {
        type: "website",
        locale: "es_CL",
        siteName: "Finova",
        title: "Finova — Tu F29, cuadrado antes de declararlo",
        description:
            "Importa tus DTE desde el SII, arma la propuesta de F29 y detecta inconsistencias antes de declarar.",
    },
};

/**
 * Layout raíz de la aplicación.
 *
 * Dos detalles no evidentes:
 *
 * 1. `suppressHydrationWarning` en <html> es OBLIGATORIO, no opcional. El script
 *    inline de abajo modifica el DOM antes de que React hidrate. Sin este
 *    atributo React detecta la diferencia entre lo que renderizó el servidor y
 *    lo que hay en el DOM, la trata como error, y se recupera renderizando de
 *    nuevo en el cliente — descartando la corrección del script y devolviendo
 *    justo el parpadeo que se quería evitar. Es superficial: solo afecta a este
 *    elemento, no oculta desajustes dentro de los componentes.
 *
 * 2. El script va en <head>, antes de cualquier contenido, porque ahí es donde
 *    el navegador lo ejecuta mientras parsea, es decir antes del primer paint.
 */
export default function RootLayout({ children }: LayoutProps<"/">) {
    return (
        <html
            lang="es"
            suppressHydrationWarning
            className={`${fontVariables} h-full antialiased`}
        >
            <head>
                <InlineScript html={THEME_INIT_SCRIPT} />
            </head>

            <body className="flex min-h-full flex-col">{children}</body>
        </html>
    );
}
