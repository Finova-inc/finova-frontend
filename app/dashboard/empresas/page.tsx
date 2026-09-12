/* ============================================================================
   /dashboard/empresas — Server Component.

   Tiene que ser Server Component: la cookie de sesión es httpOnly y solo se
   puede leer en el servidor (cookies() de next/headers). Un Client Component
   no puede verla, que es justamente el punto de httpOnly.
   ========================================================================== */

import { ApiError, empresasApi, type Empresa } from "@/lib/api";
import { exigirTokenSesion } from "@/lib/session";
import { NuevaEmpresaForm } from "./NuevaEmpresaForm";

// Los datos dependen de la sesión: sin esto Next podría cachear la respuesta
// y mostrarle a un usuario los datos de otro.
export const dynamic = "force-dynamic";

function formatearFecha(iso: string): string {
    return new Date(iso).toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

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
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">Empresas</h1>
                <p className="mt-2 text-slate-600">
                    Empresas registradas en Finova.
                </p>
            </div>

            <NuevaEmpresaForm />

            {errorCarga ? (
                <p
                    role="alert"
                    className="mt-6 rounded-xl bg-red-50 p-4 text-sm text-red-700"
                >
                    {errorCarga}
                </p>
            ) : empresas.length === 0 ? (
                <p className="mt-6 rounded-xl bg-white p-6 text-slate-600 shadow-sm">
                    Todavía no hay empresas registradas.
                </p>
            ) : (
                <div className="mt-6 overflow-x-auto rounded-xl bg-white shadow-sm">
                    <table className="w-full text-left text-sm">
                        <thead className="border-b border-slate-200 text-slate-500">
                            <tr>
                                <th scope="col" className="px-6 py-3 font-medium">RUT</th>
                                <th scope="col" className="px-6 py-3 font-medium">Razón social</th>
                                <th scope="col" className="px-6 py-3 font-medium">Usuarios</th>
                                <th scope="col" className="px-6 py-3 font-medium">Creada</th>
                            </tr>
                        </thead>
                        <tbody>
                            {empresas.map((empresa) => (
                                <tr
                                    key={empresa.id_empresa}
                                    className="border-b border-slate-100 last:border-0"
                                >
                                    <td className="px-6 py-4 font-mono text-slate-900">
                                        {empresa.rut}
                                    </td>
                                    <td className="px-6 py-4 text-slate-900">
                                        {empresa.razon_social}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
                                        {empresa.usuarios?.length ?? 0}
                                    </td>
                                    <td className="px-6 py-4 text-slate-600">
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
