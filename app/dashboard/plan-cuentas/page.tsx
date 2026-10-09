/* ============================================================================
   /dashboard/plan-cuentas — plan de cuentas de la empresa.

   Estructura NIIF para PYMES en cuatro niveles: clase → grupo → rubro →
   cuenta imputable. Solo el último nivel recibe asientos; los demás ordenan
   y suman, y son las partidas de los estados financieros.

   - Empresa sin cuentas: invitación a "Configurar plan de cuentas"
     (/dashboard/plan-cuentas/configurar), donde se elige qué cuentas del plan
     base usa la empresa y se agregan las propias.
   - Plan plano (el de 47 cuentas de la primera versión): aviso para
     completar la estructura desde el configurador.
   - Plan con estructura: el árbol con solo las cuentas que tiene la empresa,
     con búsqueda, edición en línea y el acceso para volver a configurar.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Icon } from "@/components/ui/Icon";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, cuentasApi, type CuentaContable } from "@/lib/api";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado, EnlaceAccion, Guia, ReglasGuia } from "../core-contable/partes";
import { ArbolCuentas } from "./ArbolCuentas";

export const dynamic = "force-dynamic";
export const metadata = { title: "Plan de cuentas" };

const RUTA_CONFIGURAR = "/dashboard/plan-cuentas/configurar";

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
    "Una cuenta sin asientos se puede eliminar. Una con asientos no se borra ni cambia de código o de clase: se desactiva cuando su saldo es cero (Código de Comercio, arts. 31 y 32). Los libros se conservan mientras el SII pueda revisarlos (Código Tributario, arts. 17 y 200).",
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

/** Primera vez: todavía no hay cuentas. */
function PlanVacio({ puedeConfigurar }: { readonly puedeConfigurar: boolean }) {
    return (
        <Panel>
            <PanelCabecera titulo="Esta empresa todavía no tiene plan de cuentas" />
            <p className="mt-2 max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                Elige del plan base para PYMES, ordenado según NIIF, las cuentas que usa la empresa: vienen marcadas
                las que casi toda PYME necesita (caja, banco, clientes, proveedores, IVA, PPM, retenciones y
                remuneraciones). Agrega también las tuyas, con el código que necesites. Puedes volver a configurarlo
                cuando quieras para sumar más cuentas.
            </p>
            <div className="mt-5 border-t border-[var(--border-subtle)] pt-4">
                {puedeConfigurar ? (
                    <EnlaceAccion href={RUTA_CONFIGURAR}>
                        <Icon name="plus" className="size-4" />
                        Configurar plan de cuentas
                    </EnlaceAccion>
                ) : (
                    <p className="text-[13px] text-[var(--foreground-muted)]">
                        Pide a un administrador o contador de la empresa que configure el plan de cuentas.
                    </p>
                )}
            </div>
        </Panel>
    );
}

/** Plan que viene del plan base pero sin su estructura completa (el plano de la primera versión). */
function AvisoCompletar({ puedeConfigurar }: { readonly puedeConfigurar: boolean }) {
    return (
        <Panel>
            <PanelCabecera titulo="Falta la estructura NIIF en este plan" />
            <p className="mt-2 max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                Hay cuentas que todavía no pertenecen a un rubro. Al guardar la configuración del plan, cada cuenta
                queda en su partida NIIF (por ejemplo, el banco en efectivo y equivalentes, y los gastos financieros
                fuera de los gastos de administración). Ningún asiento cambia y tus cuentas conservan su código.
            </p>
            <div className="mt-4">
                {puedeConfigurar ? (
                    <EnlaceAccion href={RUTA_CONFIGURAR}>Completar estructura</EnlaceAccion>
                ) : (
                    <p className="text-[13px] text-[var(--foreground-muted)]">
                        Pide a un administrador o contador de la empresa que complete la estructura.
                    </p>
                )}
            </div>
        </Panel>
    );
}

/** Vuelta del configurador: cuántas cuentas (con sus agrupaciones) se crearon. */
function AvisoAgregadas({ cantidad }: { readonly cantidad: number }) {
    return (
        <Aviso>
            <span className="flex flex-wrap items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-[var(--foreground)]">
                    <Icon name="check" className="size-4 shrink-0 text-[var(--positivo)]" />
                    {cantidad === 0
                        ? "Listo: tu plan ya tenía todo lo que elegiste."
                        : cantidad === 1
                          ? "Listo: se agregó 1 cuenta al plan."
                          : `Listo: se agregaron ${cantidad} cuentas al plan, contando sus agrupaciones.`}
                </span>
                <Link href="/dashboard/plan-cuentas" className="text-[12.5px] font-medium underline-offset-2 hover:underline">
                    Ocultar
                </Link>
            </span>
        </Aviso>
    );
}

export default async function PlanCuentasPage({
    searchParams,
}: {
    searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const puedeConfigurar = puedeRegistrar(rol);
    const { agregadas } = await searchParams;
    const cantidadAgregada = typeof agregadas === "string" && /^\d+$/.test(agregadas) ? Number(agregadas) : null;

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
                descripcion="Las agrupaciones (clase, grupo y rubro) ordenan y suman; solo las cuentas imputables reciben asientos. Una cuenta con historia no se borra: se desactiva."
                acciones={
                    puedeConfigurar && lista.length > 0 ? (
                        <EnlaceAccion href={RUTA_CONFIGURAR} variante="neutro">
                            <Icon name="plus" className="size-4" />
                            Configurar plan de cuentas
                        </EnlaceAccion>
                    ) : undefined
                }
            />

            <GuiaPlanCuentas />

            {cantidadAgregada !== null ? <AvisoAgregadas cantidad={cantidadAgregada} /> : null}

            {cuentas.status === "rejected" ? (
                <Aviso tono="critico">
                    No pudimos cargar el plan de cuentas. Si el servidor estaba inactivo puede tardar unos segundos en
                    despertar: recarga la página.
                </Aviso>
            ) : lista.length === 0 ? (
                <PlanVacio puedeConfigurar={puedeConfigurar} />
            ) : (
                <>
                    {incompleta ? <AvisoCompletar puedeConfigurar={puedeConfigurar} /> : null}
                    <ArbolCuentas cuentas={lista} plantilla={vista?.cuentas ?? []} puedeEditar={puedeConfigurar} />
                </>
            )}
        </div>
    );
}
