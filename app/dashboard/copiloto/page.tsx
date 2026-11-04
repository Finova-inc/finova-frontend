import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Copiloto IA" };

export default function CopilotoPage() {
    return (
        <PantallaPendiente
            titulo="Copiloto IA"
            icono="sparkle"
            descripcion="Un asistente que te ayudará a clasificar tus documentos y a detectar inconsistencias antes de declarar."
        />
    );
}
