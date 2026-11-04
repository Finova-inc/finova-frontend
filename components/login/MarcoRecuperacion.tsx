import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

/**
 * Marco de las pantallas de recuperación de contraseña: logo, título y una
 * tarjeta centrada, con los mismos colores del login. Sin recursos de terceros
 * (el logo es un archivo propio) para respetar la CSP.
 */
export function MarcoRecuperacion({
    titulo,
    descripcion,
    children,
}: {
    readonly titulo: string;
    readonly descripcion?: string;
    readonly children: ReactNode;
}) {
    return (
        <main className="flex min-h-dvh flex-col items-center bg-[var(--surface)] px-6 py-8 text-[var(--foreground)]">
            <header className="flex w-full max-w-[25rem] items-center">
                <Link href="/" className="flex w-fit items-center gap-3 font-display text-[26px] font-bold tracking-tight">
                    <Image src="/logo-finova.png" alt="" width={135} height={184} priority className="h-10 w-auto" />
                    Finova
                </Link>
            </header>

            <div className="flex w-full max-w-[25rem] flex-1 flex-col justify-center py-10">
                <h1 className="text-center font-display text-2xl font-bold tracking-tight">{titulo}</h1>
                {descripcion ? (
                    <p className="mt-3 mb-8 text-center text-[15px] leading-relaxed text-[var(--foreground-muted)]">{descripcion}</p>
                ) : null}
                {children}
            </div>
        </main>
    );
}

/** Estilo del campo de texto, igual que el del login. */
export const CLASES_CAMPO_RECUPERACION =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-4 py-3 text-[15px] text-[var(--foreground)] outline-none transition-colors placeholder:text-[var(--placeholder)] focus:border-[var(--accent)] disabled:opacity-50";

export const CLASES_BOTON_RECUPERACION =
    "mt-2 flex items-center justify-center gap-2 rounded-lg bg-[var(--accent)] px-5 py-3.5 font-display text-[15px] font-semibold text-ink transition-opacity hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-50";
