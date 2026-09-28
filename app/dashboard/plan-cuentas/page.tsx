/* ============================================================================
   /dashboard/plan-cuentas — plan de cuentas de la empresa.

   Una empresa nueva puede partir del plan base PYME: 60 cuentas (13 de
   agrupación + 47 de movimiento) con lo que la operación tributaria chilena
   necesita desde el primer día (IVA crédito y débito fiscal por separado,
   PPM, retenciones, cotizaciones), ya organizadas en clase → grupo → cuenta
   de movimiento. Administrador y contador pueden además crear, editar y
   desactivar cuentas manualmente.
   ========================================================================== */

import type { ReactNode } from "react";
import { redirect } from "next/navigation";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, cuentasApi, type CuentaContable } from "@/lib/api";
import { ROL, exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { CLASES_DE_CUENTA } from "@/lib/planCuentas";
import { Aviso, CLASES_TH, Encabezado } from "../core-contable/partes";
import { BotonPlanBase } from "./BotonPlanBase";
import { FilaCuenta } from "./FilaCuenta";
import { FormularioCuenta } from "./FormularioCuenta";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan de cuentas" };

type CuentaConHijas = CuentaContable & { readonly hijas: CuentaConHijas[] };

/**
 * Bosque de un grupo (una clase de cat_tipo_cuenta): cada cuenta cuelga de su
 * padre si hay uno EN ESE MISMO GRUPO, si no es raíz. Una empresa que cargó
 * el plan plano de antes de esta jerarquía (o construyó el suyo a mano, sin
 * padres) simplemente no tiene ninguna, y esto se ve identico a la lista
 * plana de siempre: es un degradado gracioso, no un requisito.
 */
function construirBosque(cuentasDelGrupo: readonly CuentaContable[]): CuentaConHijas[] {
    const porId = new Map<string, CuentaConHijas>(
        cuentasDelGrupo.map((cuenta) => [cuenta.id_cuenta, { ...cuenta, hijas: [] }]),
    );
    const raices: CuentaConHijas[] = [];
    for (const cuenta of porId.values()) {
        const padre = cuenta.id_cuenta_padre ? porId.get(cuenta.id_cuenta_padre) : undefined;
        if (padre) padre.hijas.push(cuenta);
        else raices.push(cuenta);
    }
    return raices;
}

/** Filas de una cuenta y sus descendientes. Recursivo pero devuelve un array
 *  plano: un <tr> no puede anidar otro <tr>. Cada cuenta es una FilaCuenta
 *  (cliente): en modo edición agrega ella misma una segunda <tr> a todo el
 *  ancho, en vez de amontonar el formulario en la celda angosta de acciones. */
function filasDe(
    cuenta: CuentaConHijas,
    cuentas: readonly CuentaContable[],
    puedeEditar: boolean,
    profundidad = 0,
): ReactNode[] {
    return [
        <FilaCuenta
            key={cuenta.id_cuenta}
            cuenta={cuenta}
            cuentas={cuentas}
            puedeEditar={puedeEditar}
            profundidad={profundidad}
        />,
        ...cuenta.hijas.flatMap((hija) => filasDe(hija, cuentas, puedeEditar, profundidad + 1)),
    ];
}

export default async function PlanCuentasPage() {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const puedeEditar = puedeRegistrar(rol);

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
                acciones={!errorCarga && cuentas.length > 0 && puedeEditar ? <FormularioCuenta cuentas={cuentas} /> : undefined}
            />

            {errorCarga ? (
                <Aviso tono="critico">{errorCarga}</Aviso>
            ) : cuentas.length === 0 ? (
                <Panel>
                    <PanelCabecera titulo="Esta empresa todavía no tiene plan de cuentas" />
                    <p className="mt-2 max-w-2xl text-[13.5px] text-[var(--foreground-muted)]">
                        Puedes partir del plan base para PYME: 60 cuentas (13 de agrupación y 47 de
                        movimiento) con lo que exige la operación tributaria en Chile, organizadas en
                        clase → grupo → cuenta de movimiento, e incluyendo IVA crédito y débito fiscal
                        por separado, PPM, retenciones de impuesto único y de honorarios, y cotizaciones
                        previsionales por pagar. Después se pueden agregar, editar o desactivar cuentas.
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
                CLASES_DE_CUENTA.map((clase) => {
                    const delGrupo = cuentas.filter((cuenta) => cuenta.id_tipo_cuenta === clase.id);
                    if (delGrupo.length === 0) return null;
                    const bosque = construirBosque(delGrupo);
                    return (
                        <Panel key={clase.id} sinRelleno>
                            <div className="px-4 pt-4">
                                <PanelCabecera titulo={clase.nombre} nota={`${delGrupo.length} cuentas`} />
                            </div>
                            <div className="overflow-x-auto pt-2">
                                <table className="w-full min-w-[560px] border-collapse text-left text-[13px]">
                                    <thead className="border-b border-[var(--border-subtle)]">
                                        <tr>
                                            <th scope="col" className={`${CLASES_TH} w-32`}>Código</th>
                                            <th scope="col" className={CLASES_TH}>Nombre</th>
                                            <th scope="col" className={`${CLASES_TH} w-32`}>Estado</th>
                                            <th scope="col" className={`${CLASES_TH} w-40`}>
                                                <span className="sr-only">Acciones</span>
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {bosque.flatMap((raiz) => filasDe(raiz, cuentas, puedeEditar))}
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
