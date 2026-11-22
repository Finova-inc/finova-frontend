import Sidebar from "@/components/Sidebar";
import { CerrarSesionBoton } from "@/components/CerrarSesionBoton";
import { SelectorEmpresa } from "@/components/dashboard/SelectorEmpresa";
import { CopilotoFlotante } from "@/components/dashboard/copiloto/CopilotoFlotante";
import { MovimientoProvider } from "@/components/dashboard/MovimientoProvider";
import { SaltarAlContenido } from "@/components/ui/SaltarAlContenido";
import { ThemeToggle } from "@/components/ui/ThemeToggle";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
    COOKIE_COPILOTO,
    COOKIE_MENU,
    COPILOTO_ANCLADO,
    MENU_PLEGADO,
} from "@/components/dashboard/preferencias-panel";
import { PreguntarSeleccion } from "@/components/dashboard/copiloto/PreguntarSeleccion";
import { ApiError, authApi, type EmpresaDelUsuario } from "@/lib/api";
import { exigirTokenSesion, obtenerEmpresaDelToken, obtenerRolDelToken, obtenerUsuarioDelToken } from "@/lib/session";

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

export default async function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    const token = await exigirTokenSesion();
    const idEmpresaActual = await obtenerEmpresaDelToken();
    // Solo para la clave con que el copiloto guarda la conversacion en el navegador.
    const idUsuario = await obtenerUsuarioDelToken();
    // Solo para mostrar u ocultar enlaces del menú; el backend autoriza.
    const rol = await obtenerRolDelToken();
    // Como se reparte el espacio (menu plegado, copiloto anclado): ver preferencias-panel.ts.
    const preferencias = await cookies();
    const menuPlegado = preferencias.get(COOKIE_MENU)?.value === MENU_PLEGADO;
    const copilotoAnclado = preferencias.get(COOKIE_COPILOTO)?.value === COPILOTO_ANCLADO;

    // Un fallo aquí no debe tumbar el panel: sin empresas el selector
    // simplemente no se dibuja, y el resto de la pantalla sigue funcionando.
    let empresas: EmpresaDelUsuario[] = [];
    try {
        empresas = await authApi.misEmpresas({ token, cache: "no-store" });
    } catch (error) {
        // Excepto una sesión vencida o revocada: ahí no hay panel que mostrar.
        // Es el único sitio que corre antes de cualquier pantalla del panel, así
        // que cubre también las que no tratan el 401 por su cuenta.
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        empresas = [];
    }

    return (
        <MovimientoProvider>
            <div className="flex min-h-screen flex-col bg-[var(--background)] lg:flex-row">
                <SaltarAlContenido destino="#contenido-panel" />
                <Sidebar plegadoInicial={menuPlegado} rol={rol} />

                <div className="flex min-w-0 flex-1 flex-col">
                    {/* La cabecera es sticky para que el selector de empresa y el tema
                        sigan al alcance al recorrer una tabla larga. z-10 la mantiene
                        sobre el contenido al desplazarse. */}
                    <header className="sticky top-0 z-10 flex h-[60px] items-center gap-2 border-b border-[var(--border-subtle)] bg-[var(--surface)] pl-16 pr-3 sm:gap-4 sm:pr-6 lg:pl-6">
                        {empresas.length > 0 ? (
                            <SelectorEmpresa
                                empresas={empresas}
                                idEmpresaActual={idEmpresaActual}
                            />
                        ) : null}

                        <div className="ml-auto flex shrink-0 items-center gap-1 sm:gap-2">
                            <ThemeToggle variant="panel" />
                            <CerrarSesionBoton />
                        </div>
                    </header>

                    <div className="flex min-w-0 flex-1">
                        {/* El relleno lateral vive aqui, una sola vez, y el vertical va
                            con padding-block para no anular los costados. El pb-24 deja sitio al
                            boton flotante del copiloto (56px + 24px de margen) para que, al
                            llegar al final, no tape lo ultimo de la pantalla. El id delimita
                            donde seleccionar texto ofrece preguntarle al copiloto. */}
                        <main id="contenido-panel" className="w-full min-w-0 max-w-[1600px] px-4 pb-24 pt-5 sm:px-6">
                            {children}
                        </main>
                        {/* Bajo la cabecera y despues del contenido: anclado, el copiloto es la
                            columna de la derecha y la cabecera del panel sigue de lado a lado;
                            el orden del DOM coincide con el visual para el teclado. Flotante,
                            es fixed y su lugar en el DOM no se nota. La empresa como key: al
                            cambiarla, la conversacion empieza de cero. */}
                        <CopilotoFlotante
                            key={idEmpresaActual ?? "sin-empresa"}
                            idUsuario={idUsuario}
                            idEmpresa={idEmpresaActual}
                            ancladoInicial={copilotoAnclado}
                        />
                    </div>
                </div>
                <PreguntarSeleccion />
            </div>
        </MovimientoProvider>
    );
}
