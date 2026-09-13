import Sidebar from "@/components/Sidebar";
import { CerrarSesionBoton } from "@/components/CerrarSesionBoton";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

/* ============================================================================
   Estructura del panel: barra lateral fija + cabecera pegajosa + lienzo.

   ---------------------------------------------------------------------------
   POR QUE CAMBIO RESPECTO A LA VERSION ANTERIOR
   ---------------------------------------------------------------------------
   El layout previo usaba la paleta por defecto de Tailwind (bg-gray-100,
   bg-white, text-slate-900). Eso tenia una consecuencia concreta y no
   cosmetica: como esas clases son colores fijos y no variables del tema, el
   panel se veia EXACTAMENTE IGUAL en tema claro y oscuro. El boton de tema
   existia en el sitio publico pero no en el panel, asi que el problema pasaba
   desapercibido.

   Ahora todo sale de las variables de globals.css y el ThemeToggle esta en la
   cabecera, que es donde se puede comprobar.
   ========================================================================== */

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="flex min-h-screen flex-col bg-[var(--background)] md:flex-row">
            <Sidebar />

            <div className="flex min-w-0 flex-1 flex-col">
                {/* La cabecera es sticky para que el buscador y la accion rapida
                    sigan al alcance al recorrer una tabla larga. z-10 la mantiene
                    sobre el contenido al desplazarse. */}
                <header className="sticky top-0 z-10 flex h-[60px] items-center gap-4 border-b border-[var(--border-subtle)] bg-[var(--surface)] px-4 sm:px-6">
                    <label className="hidden min-w-0 max-w-[420px] flex-1 items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-1.5 text-[var(--foreground-muted)] sm:flex">
                        <Icon name="search" className="size-4 shrink-0" />
                        <input
                            id="busqueda-panel"
                            type="search"
                            placeholder="Buscar documentos, terceros, asientos…"
                            aria-label="Buscar en el panel"
                            className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)]"
                        />
                    </label>

                    <div className="ml-auto flex items-center gap-2">
                        <ThemeToggle />
                        <CerrarSesionBoton />
                    </div>
                </header>

                {/* El relleno lateral vive aqui, una sola vez, y el vertical va
                    con padding-block para no anular los costados. */}
                <main className="w-full max-w-[1320px] px-4 py-5 sm:px-6">
                    {children}
                </main>
            </div>
        </div>
    );
}
