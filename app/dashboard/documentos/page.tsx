import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Documentos tributarios" };

export default function DocumentosPage() {
    return (
        <PantallaPendiente
            titulo="Documentos tributarios"
            icono="document"
            descripcion="Facturas, boletas y notas de crédito con los códigos del SII. Los documentos son inmutables: no tienen PATCH ni DELETE, y una corrección se hace emitiendo una nota de crédito."
            disponible={[
                "GET /documentos — listado por empresa",
                "POST con idempotencia por empresa",
                "GET /documentos/:id — incluye detalle e impuestos",
            ]}
        />
    );
}
