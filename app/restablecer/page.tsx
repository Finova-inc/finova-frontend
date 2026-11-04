import type { Metadata } from "next";
import Link from "next/link";
import { FormularioRestablecer } from "@/components/login/FormularioRestablecer";
import { CLASES_BOTON_RECUPERACION, MarcoRecuperacion } from "@/components/login/MarcoRecuperacion";
import { tokenDeUrl } from "@/lib/recuperacion";

export const metadata: Metadata = {
    title: "Nueva contraseña",
    robots: { index: false, follow: false },
    // El token va en la URL: que no salga en el Referer hacia otros sitios.
    referrer: "no-referrer",
};

/** Pública: el token del correo es la credencial. Lee ?token=... en el servidor y lo pasa al formulario. */
export default async function RestablecerPage({ searchParams }: { searchParams: Promise<Record<string, string | string[] | undefined>> }) {
    const token = tokenDeUrl((await searchParams).token);

    if (!token) {
        return (
            <MarcoRecuperacion titulo="Enlace incompleto">
                <div className="flex flex-col gap-5">
                    <p role="alert" className="rounded-lg border border-[var(--critico)]/30 bg-[var(--critico-bg)] px-4 py-3 text-sm text-[var(--foreground)]">
                        Falta el enlace de recuperación. Abre el que te enviamos por correo o pide uno nuevo.
                    </p>
                    <Link href="/recuperar" className={`${CLASES_BOTON_RECUPERACION} mt-0`}>
                        Pedir un enlace nuevo
                    </Link>
                </div>
            </MarcoRecuperacion>
        );
    }

    return (
        <MarcoRecuperacion titulo="Elige una contraseña nueva" descripcion="Al cambiarla, se cerrarán las sesiones abiertas en otros dispositivos.">
            <FormularioRestablecer token={token} />
        </MarcoRecuperacion>
    );
}
