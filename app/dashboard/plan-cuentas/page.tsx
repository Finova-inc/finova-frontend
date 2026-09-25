/* ============================================================================
   /dashboard/plan-cuentas — plan de cuentas de la empresa (solo lectura).

   Una empresa nueva puede partir del plan base PYME: 47 cuentas con lo que la
   operacion tributaria chilena necesita desde el primer dia (IVA credito y
   debito fiscal por separado, PPM, retenciones, cotizaciones). La edicion
   completa del plan es un modulo aparte.
   ========================================================================== */

import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, cuentasApi, type CuentaContable } from "@/lib/api";
import { ROL, exigirTokenSesion, obtenerRolDelToken } from "@/lib/session";
import { Aviso, CLASES_TH, Encabezado } from "../core-contable/partes";
import { BotonPlanBase } from "./BotonPlanBase";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan de cuentas" };

const CLASES: readonly { id: number; nombre: string }[] = [
    { id: 1, nombre: "Activo" },
    { id: 2, nombre: "Pasivo" },
    { id: 3, nombre: "Patrimonio" },
    { id: 4, nombre: "Ingresos" },
    { id: 5, nombre: "Gastos" },
];

export default async function PlanCuentasPage() {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();

    let cuentas: CuentaContable[] = [];
    let errorCarga: string | null = null;
    try {
        cuentas = await cuentasApi.listar({ token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        errorCarga =
            "No pudimos cargar el plan de cuentas. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la página.";
    }

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Plan de cuentas"
                descripcion="Cuentas a las que se imputan los asientos. Cada código es único dentro de la empresa; una cuenta con movimientos no se borra, se desactiva."
            />

            {errorCarga ? (
                <Aviso tono="critico">{errorCarga}</Aviso>
            ) : cuentas.length === 0 ? (
                <Panel>
                    <PanelCabecera titulo="Esta empresa todavía no tiene plan de cuentas" />
                    <p className="mt-2 max-w-2xl text-[13.5px] text-[var(--foreground-muted)]">
                        Puedes partir del plan base para PYME: 47 cuentas con lo que exige la operación
                        tributaria en Chile, como IVA crédito y débito fiscal por separado, PPM, retenciones de
                        impuesto único y de honorarios, y cotizaciones previsionales por pagar. Después se
                        pueden agregar o desactivar cuentas.
                    </p>
                    <div className="mt-4">
                        {rol === ROL.ADMINISTRADOR ? (
                            <BotonPlanBase />
                        ) : (
                            <p className="text-[13px] text-[var(--foreground-muted)]">
                                Pide a un administrador de la empresa que cargue el plan base.
                            </p>
                        )}
                    </div>
                </Panel>
            ) : (
                CLASES.map((clase) => {
                    const delGrupo = cuentas.filter((cuenta) => cuenta.id_tipo_cuenta === clase.id);
                    if (delGrupo.length === 0) return null;
                    return (
                        <Panel key={clase.id} sinRelleno>
                            <div className="px-4 pt-4">
                                <PanelCabecera titulo={clase.nombre} nota={`${delGrupo.length} cuentas`} />
                            </div>
                            <div className="overflow-x-auto pt-2">
                                <table className="w-full min-w-[480px] border-collapse text-left text-[13px]">
                                    <thead className="border-b border-[var(--border-subtle)]">
                                        <tr>
                                            <th scope="col" className={`${CLASES_TH} w-32`}>Código</th>
                                            <th scope="col" className={CLASES_TH}>Nombre</th>
                                            <th scope="col" className={`${CLASES_TH} w-32`}>Estado</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {delGrupo.map((cuenta) => (
                                            <tr key={cuenta.id_cuenta} className="border-b border-[var(--border-subtle)] last:border-0">
                                                <td className="tabular px-4 py-2.5 font-medium">{cuenta.codigo}</td>
                                                <td className="px-4 py-2.5">{cuenta.nombre}</td>
                                                <td className="px-4 py-2.5">
                                                    {cuenta.is_active ? (
                                                        <Etiqueta tono="positivo">Activa</Etiqueta>
                                                    ) : (
                                                        <Etiqueta tono="neutro">Inactiva</Etiqueta>
                                                    )}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </Panel>
                    );
                })
            )}
        </div>
    );
}
