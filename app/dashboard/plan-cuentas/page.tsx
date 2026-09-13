import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Plan de cuentas" };

export default function PlanCuentasPage() {
    return (
        <PantallaPendiente
            titulo="Plan de cuentas"
            icono="ledger"
            descripcion="Estructura de cuentas contables de la empresa. Cada cuenta es única por empresa, así que dos empresas pueden tener ambas una cuenta 1101 sin colisionar."
            disponible={[
                "GET /cuentas-contables — listado por empresa",
                "POST y PATCH con unicidad (id_empresa, codigo)",
                "DELETE desactiva en vez de borrar, para no romper asientos",
            ]}
        />
    );
}
