import type { Metadata } from "next";
import { ModuloCopiloto } from "@/components/dashboard/copiloto/ModuloCopiloto";
import { exigirTokenSesion, obtenerEmpresaDelToken, obtenerUsuarioDelToken } from "@/lib/session";

/* /dashboard/copiloto — el Copiloto IA como un modulo mas del panel. Es la
   misma conversacion del boton flotante, guardada en el navegador por usuario
   y empresa; en esta pantalla el boton flotante no se dibuja. */

export const metadata: Metadata = { title: "Copiloto IA" };

export default async function CopilotoPage() {
    await exigirTokenSesion();
    const [idUsuario, idEmpresa] = await Promise.all([obtenerUsuarioDelToken(), obtenerEmpresaDelToken()]);

    return (
        <div className="h-[calc(100dvh-60px-2.5rem)] min-h-[480px] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)]">
            {/* La empresa como key: al cambiarla, el chat lee la conversacion de esa empresa. */}
            <ModuloCopiloto key={idEmpresa ?? "sin-empresa"} idUsuario={idUsuario} idEmpresa={idEmpresa} />
        </div>
    );
}
