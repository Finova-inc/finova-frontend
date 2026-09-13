"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Icon } from "@/components/ui/Icon";

/**
 * Cierra la sesion y vuelve al login.
 *
 * El router.refresh() posterior al replace no es redundante: obliga a los
 * Server Components a re-ejecutarse ya sin la cookie. Sin el, una pantalla
 * privada renderizada antes podria quedar en la cache del cliente.
 */
export function CerrarSesionBoton() {
    const router = useRouter();
    const [saliendo, setSaliendo] = useState(false);

    async function cerrarSesion() {
        setSaliendo(true);
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            router.replace("/login");
            router.refresh();
        } finally {
            setSaliendo(false);
        }
    }

    return (
        <button
            type="button"
            onClick={cerrarSesion}
            disabled={saliendo}
            title="Cerrar sesión"
            className="inline-flex items-center gap-2 rounded-lg border border-transparent px-3 py-2 text-[13px] font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60"
        >
            <Icon name="logout" className="size-4" />
            <span className="hidden sm:inline">
                {saliendo ? "Saliendo…" : "Cerrar sesión"}
            </span>
        </button>
    );
}
