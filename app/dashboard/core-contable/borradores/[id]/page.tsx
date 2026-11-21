/* ============================================================================
   /dashboard/core-contable/borradores/[id] — seguir editando un borrador.
   ========================================================================== */

import { notFound, redirect } from "next/navigation";
import { ContextoCopiloto } from "@/components/dashboard/copiloto/ContextoCopiloto";
import { ApiError, borradoresApi } from "@/lib/api";
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

    // El borrador y las opciones del formulario no dependen una de la otra: se piden a la vez.
    // Quien solo consulta no ve el formulario, así que para él no se piden las opciones.
    const registra = puedeRegistrar(rol);
    const [borrador, opciones] = await Promise.all([
        borradoresApi.obtener(id, { token, cache: "no-store" }).catch((error: unknown): never => {
            if (error instanceof ApiError && error.status === 401) redirect("/login");
            // 404: no existe o es de otra empresa (el backend no distingue, a
            // proposito). 400: el id no es un uuid.
            if (error instanceof ApiError && (error.status === 404 || error.status === 400)) notFound();
            throw error;
        }),
        registra ? cargarOpcionesDelFormulario(token) : null,
    ]);

    const encabezado = (
        <>
            <ContextoCopiloto detalle={`borrador «${borrador.glosa || "sin glosa"}»`} />
            <Encabezado
                titulo="Borrador de asiento"
                descripcion={`Última modificación: ${formatearFechaLarga(borrador.updated_at)}. Los borradores no forman parte del libro diario ni tienen número hasta contabilizarse.`}
                volverA="/dashboard/core-contable"
            />
        </>
    );

    if (opciones === null) {
        return (
            <div>
                {encabezado}
                <Aviso tono="aviso">
                    Tu rol en esta empresa es de solo consulta: no puedes editar ni contabilizar borradores.
                </Aviso>
            </div>
        );
    }

    const { cuentas, terceros, periodos, saldoPorCobrar, error } = opciones;
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
                periodos={periodos}
                saldoPorCobrar={saldoPorCobrar}
                puedeAbrirPeriodo
                hoy={hoyEnChile()}
                borrador={borrador}
            />
        </div>
    );
}
