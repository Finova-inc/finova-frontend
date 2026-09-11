"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function CerrarSesionBoton() {
    const router = useRouter();
    const [saliendo, setSaliendo] = useState(false);

    async function cerrarSesion() {
        setSaliendo(true);
        try {
            await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
            router.replace("/login");
            // Obliga a los Server Components a re-ejecutarse ya sin cookie.
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
            className="text-sm text-slate-600 underline-offset-4 hover:underline disabled:opacity-60"
        >
            {saliendo ? "Saliendo…" : "Cerrar sesión"}
        </button>
    );
}
