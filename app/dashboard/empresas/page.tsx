/* ============================================================================
   /dashboard/empresas — Server Component.

   Tiene que ser Server Component: la cookie de sesión es httpOnly y solo se
   puede leer en el servidor (cookies() de next/headers). Un Client Component
   no puede verla, que es justamente el punto de httpOnly.
   ========================================================================== */

import { ApiError, empresasApi, type Empresa } from "@/lib/api";
import { formatearFecha } from "@/lib/formato";
import { exigirTokenSesion } from "@/lib/session";
import { NuevaEmpresaForm } from "./NuevaEmpresaForm";

// Los datos dependen de la sesión: sin esto Next podría cachear la respuesta
// y mostrarle a un usuario los datos de otro.
export const dynamic = "force-dynamic";

export default async function EmpresasPage() {
    const token = await exigirTokenSesion();

    let empresas: Empresa[] = [];
    let errorCarga: string | null = null;

    try {
        empresas = await empresasApi.listar({ token, cache: "no-store" });
    } catch (error) {
        errorCarga =
            error instanceof ApiError && error.status === 0
                ? "No pudimos contactar al servidor."
                : "No pudimos cargar las empresas.";
    }

    return (
        <div>
            <div className="mb-6">
                <h1 className="font-display text-xl font-semibold tracking-[-0.015em]">
                    Empresas
                </h1>
                <p className="mt-1 text-[13.5px] text-[var(--foreground-muted)]">
                    Empresas registradas en Finova.
                </p>
            </div>

            <NuevaEmpresaForm />

            {errorCarga ? (
                <p
                    role="alert"
                    className="mt-6 rounded-xl bg-[var(--critico-bg)] p-4 text-sm text-[var(--critico)]"
                >
                    {errorCarga}
                </p>
            ) : empresas.length === 0 ? (
                <p className="mt-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 text-[13.5px] text-[var(--foreground-muted)]">
                    Todavía no hay empresas registradas.
                </p>
            ) : (
                <div className="mt-6 overflow-x-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)]">
                    <table className="w-full text-left text-[13px]">
                        <thead className="border-b border-[var(--border-subtle)] text-[var(--foreground-muted)]">
                            <tr>
                                <th scope="col" className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em]">RUT</th>
                                <th scope="col" className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em]">Razón social</th>
                                <th scope="col" className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em]">Usuarios</th>
                                <th scope="col" className="px-5 py-2.5 text-[10.5px] font-semibold uppercase tracking-[0.07em]">Creada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empresas.map((empresa) => (
                                <tr
                                    key={empresa.id_empresa}
                                    className="border-b border-[var(--border-subtle)] last:border-0"
                                >
                                    {/* .tabular en vez de font-mono: la clase existe en
                                        globals.css justamente para que las cifras no
                                        bailen, y conserva la tipografía de la interfaz. */}
                                    <td className="tabular px-5 py-3">{empresa.rut}</td>
                                    <td className="px-5 py-3">{empresa.razon_social}</td>
                                    <td className="tabular px-5 py-3 text-[var(--foreground-muted)]">
                                        {empresa.usuarios?.length ?? 0}
                                    </td>
                                    <td className="tabular px-5 py-3 text-[var(--foreground-muted)]">
                                        {formatearFecha(empresa.created_at)}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}
