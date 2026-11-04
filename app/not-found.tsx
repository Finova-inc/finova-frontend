import Link from "next/link";

import { MensajeDeEstado } from "@/components/ui/MensajeDeEstado";

/** 404 de la parte pública (el del panel es app/dashboard/not-found.tsx). */
export default function NoEncontrada() {
    const enlace =
        "inline-flex items-center justify-center rounded-lg border px-3.5 py-2 text-[13px] font-medium transition-[background-color,filter]";
    return (
        <main className="flex flex-1 items-center justify-center bg-[var(--background)] px-4 py-16">
            <MensajeDeEstado
                codigo="404"
                titulo="Esta página no existe."
                acciones={
                    <>
                        <Link
                            href="/"
                            className={`${enlace} border-[var(--accent)] bg-[var(--accent)] font-semibold text-white hover:brightness-110`}
                        >
                            Ir al inicio
                        </Link>
                        <Link
                            href="/login"
                            className={`${enlace} border-[var(--border-strong)] bg-[var(--surface)] text-[var(--foreground)] hover:bg-[var(--background-raised)]`}
                        >
                            Iniciar sesión
                        </Link>
                    </>
                }
            >
                <p>La dirección no existe o fue movida. Revisa que esté bien escrita.</p>
            </MensajeDeEstado>
        </main>
    );
}
