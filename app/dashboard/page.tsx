export default function DashboardPage() {
    return (
        <div>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-slate-900">
                    Bienvenido a Finova
                </h1>

                <p className="mt-2 text-slate-600">
                    Centro de control contable y tributario.
                </p>
            </div>

            <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">

                <div className="rounded-xl bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Empresas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        0
                    </p>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Documentos tributarios
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        0
                    </p>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Compras
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        $0
                    </p>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm">
                    <p className="text-sm text-slate-500">
                        Ventas
                    </p>
                    <p className="mt-2 text-3xl font-bold text-slate-900">
                        $0
                    </p>
                </div>

            </div>

            <div className="mt-8 grid gap-6 lg:grid-cols-2">

                <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Estado tributario
                    </h2>

                    <p className="mt-3 text-sm text-slate-500">
                        No existen períodos procesados todavía.
                    </p>
                </div>

                <div className="rounded-xl bg-white p-6 shadow-sm">
                    <h2 className="text-lg font-semibold text-slate-900">
                        Alertas
                    </h2>

                    <p className="mt-3 text-sm text-slate-500">
                        No existen alertas pendientes.
                    </p>
                </div>

            </div>
        </div>
    );
}