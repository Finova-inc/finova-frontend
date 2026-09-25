/* ============================================================================
   /dashboard/core-contable/nuevo — alta de un asiento.

   Server Component que prepara los datos (cuentas activas, terceros, la fecha
   de hoy en Chile) y entrega la edicion al formulario cliente.
   ========================================================================== */

import { redirect } from "next/navigation";
import { hoyEnChile } from "@/lib/formato";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { FormularioAsiento } from "../FormularioAsiento";
import { cargarOpcionesDelFormulario } from "../datos-formulario";
import { Aviso, EnlaceAccion, Encabezado } from "../partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo asiento" };

export default async function NuevoAsientoPage() {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();

    const encabezado = (
        <Encabezado
            titulo="Nuevo asiento"
            descripcion="Guárdalo como borrador para completarlo después, o contabilízalo cuando cuadre."
        />
    );

    // Solo presentacion: el backend responde 403 igual si alguien fuerza el alta.
    if (!puedeRegistrar(rol)) {
        return (
            <div>
                {encabezado}
                <Aviso tono="aviso">
                    Tu rol en esta empresa es de solo consulta: puedes revisar el libro diario, pero no
                    registrar asientos.
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
                    No pudimos cargar el plan de cuentas. Si el servidor estaba inactivo puede tardar unos
                    segundos en despertar: recarga la página.
                </Aviso>
            </div>
        );
    }

    if (cuentas.length === 0) {
        return (
            <div>
                {encabezado}
                <Aviso tono="aviso">
                    <p>La empresa no tiene cuentas activas: sin plan de cuentas no hay a qué imputar.</p>
                    <div className="mt-3">
                        <EnlaceAccion href="/dashboard/plan-cuentas">Ir al plan de cuentas</EnlaceAccion>
                    </div>
                </Aviso>
            </div>
        );
    }

    return (
        <div>
            {encabezado}
            <FormularioAsiento cuentas={cuentas} terceros={terceros} hoy={hoyEnChile()} />
        </div>
    );
}
