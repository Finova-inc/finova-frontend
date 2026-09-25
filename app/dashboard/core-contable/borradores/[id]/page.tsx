/* ============================================================================
   /dashboard/core-contable/borradores/[id] — seguir editando un borrador.
   ========================================================================== */

import { notFound, redirect } from "next/navigation";
import { ApiError, borradoresApi, type AsientoBorrador } from "@/lib/api";
import { formatearFechaLarga, hoyEnChile } from "@/lib/formato";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { FormularioAsiento } from "../../FormularioAsiento";
import { cargarOpcionesDelFormulario } from "../../datos-formulario";
import { Aviso, Encabezado } from "../../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Borrador de asiento" };

export default async function BorradorPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();

    let borrador: AsientoBorrador;
    try {
        borrador = await borradoresApi.obtener(id, { token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        // 404: no existe o es de otra empresa (el backend no distingue, a
        // proposito). 400: el id no es un uuid.
        if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
        throw error;
    }

    const encabezado = (
        <Encabezado
            titulo="Borrador de asiento"
            descripcion={`Última modificación: ${formatearFechaLarga(borrador.updated_at)}. Los borradores no forman parte del libro diario ni tienen número hasta contabilizarse.`}
        />
    );

    if (!puedeRegistrar(rol)) {
        return (
            <div>
                {encabezado}
                <Aviso tono="aviso">
                    Tu rol en esta empresa es de solo consulta: no puedes editar ni contabilizar borradores.
                </Aviso>
            </div>
        );
    }

    const { cuentas, terceros, error } = await cargarOpcionesDelFormulario(token);
    if (error?.status === 401) redirect("/login");
    if (error) {
        return (
            <div>
                {encabezado}
                <Aviso tono="critico">
                    No pudimos cargar el plan de cuentas. Recarga la página en unos segundos.
                </Aviso>
            </div>
        );
    }

    return (
        <div>
            {encabezado}
            <FormularioAsiento
                cuentas={cuentas}
                terceros={terceros}
                hoy={hoyEnChile()}
                borrador={borrador}
            />
        </div>
    );
}
