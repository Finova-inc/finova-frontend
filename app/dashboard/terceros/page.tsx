import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Terceros" };

export default function TercerosPage() {
    return (
        <PantallaPendiente
            titulo="Terceros"
            icono="users"
            descripcion="Clientes y proveedores de la empresa. El backend ya expone el CRUD completo y distingue personas naturales de jurídicas, que es lo que exige la Ley 21.719 para responder una solicitud de acceso."
            disponible={[
                "GET /terceros — listado filtrado por empresa",
                "POST, PATCH y DELETE (baja lógica con deleted_at)",
                "GET /terceros/:id/datos-personales — portabilidad ARCOP",
            ]}
        />
    );
}
