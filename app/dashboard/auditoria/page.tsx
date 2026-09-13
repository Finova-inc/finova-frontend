import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Auditoría" };

export default function AuditoriaPage() {
    return (
        <PantallaPendiente
            titulo="Auditoría"
            icono="clock"
            descripcion="Historial de quién hizo qué y cuándo. La tabla es append-only y no expone UPDATE ni DELETE: un registro de auditoría que se puede modificar no sirve como prueba ante la Agencia de Protección de Datos."
            disponible={[
                "GET /auditoria/:entidad/:id — historial de un registro",
                "Registro de accesos a datos personales y de login fallido",
            ]}
        />
    );
}
