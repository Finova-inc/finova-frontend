/* ============================================================================
   /dashboard/plan-cuentas — plan de cuentas de la empresa.

   Estructura NIIF para PYMES en cuatro niveles: clase → grupo → rubro →
   cuenta imputable. Solo el último nivel recibe asientos; los demás ordenan
   y suman, y son las partidas de los estados financieros.

   - Empresa sin cuentas: vista previa del plan base y, para el
     administrador, el botón que lo carga.
   - Plan plano (el de 47 cuentas de la primera versión): aviso para
     completar la estructura sin tocar asientos ni códigos.
   - Plan con estructura: el árbol, con búsqueda y edición en línea.
   ========================================================================== */

import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, cuentasApi, type CuentaContable, type FilaPlantilla, type PlantillaCuentas } from "@/lib/api";
import { CLASES_DE_CUENTA } from "@/lib/planCuentas";
import { ROL, exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { AccionPlantilla } from "./AccionPlantilla";
import { ArbolCuentas } from "./ArbolCuentas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan de cuentas" };

/** Una cuenta de ejemplo recorrida de la clase a la cuenta imputable. */
const RUTA_DE_EJEMPLO = [
    { nivel: "Clase", codigo: "1", nombre: "Activos" },
    { nivel: "Grupo", codigo: "11", nombre: "Activos corrientes" },
    { nivel: "Rubro", codigo: "1101", nombre: "Efectivo y equivalentes al efectivo" },
    { nivel: "Cuenta", codigo: "1101001", nombre: "Caja" },
] as const;

const REGLAS: readonly string[] = [
    "Solo las cuentas del último nivel reciben asientos. Clase, grupo y rubro ordenan y suman: son las partidas del estado de situación financiera y del estado de resultados.",
    "El código de cada cuenta empieza con el de su agrupación, y es el mismo que va a los libros.",
    "Una cuenta con asientos no se borra ni cambia de código o de clase: se desactiva cuando su saldo es cero (Código de Comercio, arts. 31 y 32). Los libros se conservan mientras el SII pueda revisarlos (Código Tributario, arts. 17 y 200).",
    "La estructura sigue NIIF para PYMES: activos y pasivos separados en corrientes y no corrientes, y resultados por función, con los costos financieros y el impuesto a las ganancias aparte.",
    "El código SII es opcional: anótalo si ya relacionaste tus cuentas con las de tus declaraciones.",
];

function GuiaPlanCuentas() {
    return (
        <Guia titulo="Cómo se organiza el plan de cuentas">
            <ol aria-label="Ruta de una cuenta en el plan" className="flex flex-wrap items-center gap-x-2 gap-y-3">
                {RUTA_DE_EJEMPLO.map((paso, indice) => (
                    <li key={paso.codigo} className="flex items-center gap-2">
                        {indice > 0 ? <Icon name="chevron" className="size-3.5 shrink-0 text-[var(--foreground-muted)]" /> : null}
                        <span className="flex flex-col">
                            <span className="text-[11px] text-[var(--foreground-muted)]">{paso.nivel}</span>
                            <span className="text-[13px]">
                                <span className="tabular font-semibold">{paso.codigo}</span> {paso.nombre}
                            </span>
                        </span>
                    </li>
                ))}
            </ol>
            <ReglasGuia reglas={REGLAS} />
        </Guia>
    );
}

/** El plan base agrupado por clase, para verlo antes de cargarlo. */
function VistaPlantilla({ plantilla, esAdmin }: { readonly plantilla: PlantillaCuentas | null; readonly esAdmin: boolean }) {
    const filas = plantilla?.cuentas ?? [];
    const hijasDe = (codigo: string) => filas.filter((fila) => fila.codigoPadre === codigo);
    const porLargo = (largo: number) => filas.filter((fila) => fila.acepta_movimiento === false && fila.codigo.length === largo).length;
    const imputables = filas.filter((fila) => fila.acepta_movimiento !== false).length;

    return (
        <Panel>
            <PanelCabecera
                titulo="Esta empresa todavía no tiene plan de cuentas"
                nota={filas.length > 0 ? `${filas.length} cuentas` : undefined}
            />
            <p className="mt-2 max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                Parte del plan base para PYMES, ordenado según NIIF para PYMES y con lo que la operación
                tributaria chilena necesita desde el primer día: IVA crédito y débito fiscal por separado, PPM,
                retenciones, cotizaciones previsionales y provisión de vacaciones. Después puedes agregar,
                renombrar o desactivar cuentas.
            </p>

            {filas.length > 0 ? (
                <>
                    <p className="tabular mt-4 text-[12.5px] font-medium">
                        {porLargo(1)} clases · {porLargo(2)} grupos · {porLargo(4)} rubros · {imputables} cuentas imputables
                    </p>
                    <div className="mt-3 grid gap-x-8 gap-y-6 border-t border-[var(--border-subtle)] pt-5 md:grid-cols-2 xl:grid-cols-3">
                        {CLASES_DE_CUENTA.map((clase) => {
                            const nodoClase = filas.find((fila) => fila.codigo === String(clase.id));
                            if (!nodoClase) return null;
                            return (
                                <section key={clase.id} aria-labelledby={`clase-${clase.id}`}>
                                    <h3 id={`clase-${clase.id}`} className="font-display text-[14px] font-semibold">
                                        <span className="tabular mr-1.5 text-[var(--foreground-muted)]">{nodoClase.codigo}</span>
                                        {nodoClase.nombre}
                                    </h3>
                                    <ul className="mt-2 flex flex-col gap-2.5">
                                        {hijasDe(nodoClase.codigo).map((grupo) => (
                                            <li key={grupo.codigo}>
                                                <p className="text-[12.5px] font-medium">
                                                    <span className="tabular mr-1.5 text-[var(--foreground-muted)]">{grupo.codigo}</span>
                                                    {grupo.nombre}
                                                </p>
                                                <ul className="mt-1 flex flex-col gap-0.5 border-l border-[var(--border-subtle)] pl-3">
                                                    {hijasDe(grupo.codigo).map((rubro: FilaPlantilla) => (
                                                        <li key={rubro.codigo} className="text-[12px] text-[var(--foreground-muted)]">
                                                            <span className="tabular mr-1.5">{rubro.codigo}</span>
                                                            {rubro.nombre}
                                                            <span className="tabular"> ({hijasDe(rubro.codigo).length})</span>
                                                        </li>
                                                    ))}
                                                </ul>
                                            </li>
                                        ))}
                                    </ul>
                                </section>
                            );
                        })}
                    </div>
                </>
            ) : null}

            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                {esAdmin ? (
                    <AccionPlantilla modo="cargar" insertar={filas.length} reubicar={0} />
                ) : (
                    <p className="text-[13px] text-[var(--foreground-muted)]">
                        Pide a un administrador de la empresa que cargue el plan base.
                    </p>
                )}
            </div>
        </Panel>
    );
}

/** Plan que viene del plan base pero sin su estructura completa (el plano de la primera versión). */
function AvisoCompletar({ plantilla, esAdmin }: { readonly plantilla: PlantillaCuentas; readonly esAdmin: boolean }) {
    return (
        <Panel>
            <PanelCabecera titulo="Falta la estructura NIIF en este plan" />
            <p className="mt-2 max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                Hay cuentas que todavía no pertenecen a un rubro, o agrupaciones del plan base que faltan. Al
                completar la estructura, cada cuenta queda en su partida NIIF: por ejemplo, el banco en efectivo y
                equivalentes, y los gastos financieros fuera de los gastos de administración.
            </p>
            <div className="mt-4">
                {esAdmin ? (
                    <AccionPlantilla modo="completar" insertar={plantilla.insertar} reubicar={plantilla.reubicar} />
                ) : (
                    <p className="text-[13px] text-[var(--foreground-muted)]">
                        Pide a un administrador de la empresa que complete la estructura.
                    </p>
                )}
            </div>
        </Panel>
    );
}

export default async function PlanCuentasPage() {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const esAdmin = rol === ROL.ADMINISTRADOR;

    const opciones = { token, cache: "no-store" } as const;
    const [cuentas, plantilla] = await Promise.allSettled([cuentasApi.listar(opciones), cuentasApi.plantilla(opciones)]);
    if ([cuentas, plantilla].some((r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401)) {
        redirect("/login");
    }

    const lista: CuentaContable[] = cuentas.status === "fulfilled" ? cuentas.value : [];
    const vista = plantilla.status === "fulfilled" ? plantilla.value : null;
    const incompleta = vista !== null && lista.length > 0 && !vista.conflicto && vista.insertar + vista.reubicar > 0;

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Plan de cuentas"
                descripcion="Las agrupaciones (clase, grupo y rubro) ordenan y suman; solo las cuentas imputables reciben asientos. Nada se borra: una cuenta con historia se desactiva."
            />

            <GuiaPlanCuentas />

            {cuentas.status === "rejected" ? (
                <Aviso tono="critico">
                    No pudimos cargar el plan de cuentas. Si el servidor estaba inactivo puede tardar unos segundos en
                    despertar: recarga la página.
                </Aviso>
            ) : lista.length === 0 ? (
                <VistaPlantilla plantilla={vista} esAdmin={esAdmin} />
            ) : (
                <>
                    {incompleta ? <AvisoCompletar plantilla={vista} esAdmin={esAdmin} /> : null}
                    <ArbolCuentas cuentas={lista} puedeEditar={puedeRegistrar(rol)} />
                </>
            )}
        </div>
    );
}
