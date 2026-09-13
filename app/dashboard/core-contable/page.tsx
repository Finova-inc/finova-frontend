import { PantallaPendiente } from "@/components/dashboard/PantallaPendiente";

export const metadata = { title: "Libro diario" };

export default function CoreContablePage() {
    return (
        <PantallaPendiente
            titulo="Libro diario"
            icono="calculator"
            descripcion="Asientos contables de partida doble. El cuadre se valida en dos capas: el servicio antes de abrir la transacción y un trigger en PostgreSQL al confirmarla, así que un asiento descuadrado no se puede guardar ni con SQL directo."
            disponible={[
                "GET /asientos-contables — listado por empresa",
                "POST con asiento y movimientos en una sola transacción",
                "GET /asientos-contables/:id — incluye los movimientos",
            ]}
        />
    );
}
