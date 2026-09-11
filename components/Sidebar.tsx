import Link from "next/link";

export default function Sidebar() {
    return (
        <aside className="w-64 bg-slate-950 text-white">
            <div className="p-6">
                <h1 className="text-2xl font-bold">
                    Finova
                </h1>

                <p className="mt-1 text-sm text-slate-400">
                    Gestión contable inteligente
                </p>
            </div>

            <nav className="px-4">
                <p className="mb-2 px-3 text-xs font-semibold uppercase text-slate-500">
                    Principal
                </p>

                <Link
                    href="/dashboard"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                >
                    Dashboard
                </Link>

                <Link
                    href="/dashboard/empresas"
                    className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                >
                    Empresas
                </Link>

                <Link
                    href="/dashboard/documentos"
                    className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                >
                    Documentos Tributarios
                </Link>

                <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase text-slate-500">
                    Contabilidad
                </p>

                <Link
                    href="/dashboard/core-contable"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                >
                    Core Contable
                </Link>

                <Link
                    href="/dashboard/f29"
                    className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                >
                    Formulario F29
                </Link>

                <p className="mb-2 mt-6 px-3 text-xs font-semibold uppercase text-slate-500">
                    Inteligencia
                </p>

                <Link
                    href="/dashboard/copiloto"
                    className="block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                >
                    Copiloto IA
                </Link>

                <Link
                    href="/dashboard/auditoria"
                    className="mt-1 block rounded-lg px-3 py-2 text-sm hover:bg-slate-800"
                >
                    Auditoría
                </Link>
            </nav>
        </aside>
    );
}