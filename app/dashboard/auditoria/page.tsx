import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Auditoría" };

export default function AuditoriaPage() {
    return (
        <PantallaPendiente
            titulo="Auditoría"
            icono="clock"
            descripcion="Podrás ver quién hizo qué y cuándo en tu empresa, con un historial que nadie puede modificar."
        />
    );
}
