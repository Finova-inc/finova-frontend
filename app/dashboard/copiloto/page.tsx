import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Copiloto IA" };

export default function CopilotoPage() {
    return (
        <PantallaPendiente
            titulo="Copiloto IA"
            icono="sparkle"
            descripcion="Asistente para clasificar documentos y detectar inconsistencias antes de declarar. Pendiente de definir el modelo y, sobre todo, qué datos salen de la base: un tercero persona natural es dato personal bajo la Ley 21.719."
        />
    );
}
