import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <div className="min-h-screen bg-gray-100">
            <div className="flex min-h-screen">

                <Sidebar />

                <main className="flex-1">
                    <header className="flex h-16 items-center justify-between border-b bg-white px-8">
                        <h2 className="text-lg font-semibold text-slate-900">
                            Panel de control
                        </h2>

                        <div className="text-sm text-slate-600">
                            Usuario
                        </div>
                    </header>

                    <section className="p-8">
                        {children}
                    </section>
                </main>

            </div>
        </div>
    );
}