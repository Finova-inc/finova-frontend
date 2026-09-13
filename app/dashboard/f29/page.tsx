import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Formulario F29" };

export default function F29Page() {
    return (
        <PantallaPendiente
            titulo="Formulario F29"
            icono="check"
            descripcion="Propuesta de declaración mensual de IVA. Requiere primero las agregaciones del backend: totales de débito y crédito fiscal por período, que hoy no tienen endpoint."
            disponible={[
                "GET /periodos-contables — períodos abiertos y cerrados",
                "GET /catalogos/impuestos — IVA 19% configurado",
            ]}
        />
    );
}
