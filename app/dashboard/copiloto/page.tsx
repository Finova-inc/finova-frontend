import type { Metadata } from "next";
import { ModuloCopiloto } from "@/components/dashboard/copiloto/ModuloCopiloto";
import { exigirTokenSesion, obtenerEmpresaDelToken, obtenerUsuarioDelToken } from "@/lib/session";

/* /dashboard/copiloto — el Copiloto IA como un modulo mas del panel. Es la
   misma conversacion del copiloto flotante o anclado, guardada en el navegador
   por usuario y empresa; en esta pantalla ese panel y su boton de la cabecera
   no se dibujan. */

export const metadata: Metadata = { title: "Copiloto IA" };

export default async function CopilotoPage() {
    await exigirTokenSesion();
    const [idUsuario, idEmpresa] = await Promise.all([obtenerUsuarioDelToken(), obtenerEmpresaDelToken()]);

    return (
        <div className="copiloto-tema flex h-[calc(100dvh-60px-2.5rem)] min-h-[480px] flex-col overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] text-[var(--foreground)]">
            <div aria-hidden="true" className="h-[3px] shrink-0 bg-[image:var(--copiloto-franja)]" />
            {/* La empresa como key: al cambiarla, el chat lee la conversacion de esa empresa. */}
            <ModuloCopiloto key={idEmpresa ?? "sin-empresa"} idUsuario={idUsuario} idEmpresa={idEmpresa} />
        </div>
    );
}
