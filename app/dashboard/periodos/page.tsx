/* ============================================================================
   /dashboard/periodos — periodos contables de la empresa.

   Un periodo abierto admite asientos con fechas de ese mes; uno cerrado no,
   aunque cuadren: es un mes ya declarado al SII. Cerrar lo puede hacer el
   administrador o el contador; reabrir, solo el administrador y con motivo.
   ========================================================================== */

import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel } from "@/components/ui/Panel";
import { ApiError, periodosApi, type PeriodoContable } from "@/lib/api";
import { formatearFechaLarga, hoyEnChile, nombrePeriodo } from "@/lib/formato";
import { ROL, exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, CLASES_TH, Encabezado } from "../core-contable/partes";
import { AccionesPeriodo } from "./AccionesPeriodo";
import { NuevoPeriodoForm } from "./NuevoPeriodoForm";

export const dynamic = "force-dynamic";
export const metadata = { title: "Períodos contables" };

/** Ultimo dia del mes 'YYYY-MM-DD', sin pasar por la zona horaria. */
function ultimoDia(anio: number, mes: number): string {
    const dia = new Date(Date.UTC(anio, mes, 0)).getUTCDate();
    return `${anio}-${String(mes).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export default async function PeriodosPage() {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const hoy = hoyEnChile();
    const [anio, mes] = hoy.split("-").map(Number);

    let periodos: PeriodoContable[] = [];
    let errorCarga: string | null = null;
    try {
        periodos = await periodosApi.listar({ token, cache: "no-store" });
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
        errorCarga =
            "No pudimos cargar los períodos. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la página.";
    }

    const puede = puedeRegistrar(rol);

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Períodos contables"
                descripcion="Cada mes se abre para registrar asientos y se cierra cuando ya está declarado. Un período cerrado rechaza asientos aunque cuadren."
            />

            {puede ? <NuevoPeriodoForm anio={anio} mes={mes} /> : null}

            {errorCarga ? (
                <Aviso tono="critico">{errorCarga}</Aviso>
            ) : periodos.length === 0 ? (
                <Aviso>
                    Todavía no hay períodos. Abre el mes en curso para empezar a registrar asientos.
                </Aviso>
            ) : (
                <Panel sinRelleno>
                    <div className="overflow-x-auto">
                        <table className="w-full min-w-[640px] border-collapse text-left text-[13px]">
                            <thead className="border-b border-[var(--border-subtle)]">
                                <tr>
                                    <th scope="col" className={CLASES_TH}>Período</th>
                                    <th scope="col" className={CLASES_TH}>Estado</th>
                                    <th scope="col" className={CLASES_TH}>Detalle</th>
                                    <th scope="col" className={`${CLASES_TH} text-right`}>
                                        <span className="sr-only">Acciones</span>
                                    </th>
                                </tr>
                            </thead>
                            <tbody>
                                {periodos.map((periodo) => {
                                    const nombre = nombrePeriodo(periodo.anio, periodo.mes);
                                    return (
                                        <tr key={periodo.id_periodo} className="border-b border-[var(--border-subtle)] align-top last:border-0">
                                            <td className="px-4 py-3 font-medium capitalize">{nombre}</td>
                                            <td className="px-4 py-3">
                                                {periodo.estado === "cerrado" ? (
                                                    <Etiqueta tono="neutro">Cerrado</Etiqueta>
                                                ) : (
                                                    <Etiqueta tono="positivo">Abierto</Etiqueta>
                                                )}
                                            </td>
                                            <td className="px-4 py-3 text-[12.5px] text-[var(--foreground-muted)]">
                                                {periodo.estado === "cerrado" && periodo.cerrado_at
                                                    ? `Cerrado el ${formatearFechaLarga(periodo.cerrado_at)}`
                                                    : periodo.motivo_reapertura
                                                      ? `Reabierto: ${periodo.motivo_reapertura}`
                                                      : ""}
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <AccionesPeriodo
                                                    idPeriodo={periodo.id_periodo}
                                                    nombre={nombre}
                                                    estado={periodo.estado}
                                                    terminado={ultimoDia(periodo.anio, periodo.mes) < hoy}
                                                    puedeCerrar={puede}
                                                    puedeReabrir={rol === ROL.ADMINISTRADOR}
                                                />
                                            </td>
                                        </tr>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </Panel>
            )}
        </div>
    );
}
