"use client";

import { ErrorDeVista } from "@/components/dashboard/EstadoDeVista";

/** Error de cualquier pantalla del panel que no tenga uno más específico. Ver lib/vistas.ts. */
export default function ErrorDelPanel(props: { error: Error & { digest?: string }; retry: () => void }) {
    return <ErrorDeVista {...props} />;
}
