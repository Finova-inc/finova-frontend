/* ============================================================================
   /dashboard/contabilizacion — documentos del SII por contabilizar.

   El flujo que pidió Paola: SII → por contabilizar → revisión y clasificación
   → asiento. Finova propone un borrador por documento con las cuentas de la
   configuración (o la que la persona elija para cada venta o compra); una
   persona lo revisa y lo contabiliza. Así los libros, el balance y el F29
   salen de los mismos documentos.

   Server Component: el mes va en la URL (?periodo=2026-09).
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { SelectorDeMes } from "@/components/dashboard/SelectorDeMes";
import { ApiError, contabilizacionApi, cuentasApi, type CuentaContable, type PorContabilizar } from "@/lib/api";
import { periodoPorDefecto } from "@/lib/f29";
import { hoyEnChile } from "@/lib/formato";
import { periodoValido } from "@/lib/sii";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";
import { Indicador } from "../documentos/partes";
import { TablaPorContabilizar } from "./TablaPorContabilizar";

export const dynamic = "force-dynamic";
export const metadata = { title: "Por contabilizar" };

const REGLAS: readonly string[] = [
    "Aquí están las compras y ventas del RCV del mes y las boletas de honorarios recibidas que importaste en Documentos.",
    "Marca los documentos y elige la cuenta de cada venta o compra (si no, se usa la de la configuración). «Proponer asientos» crea un borrador por documento: nada entra al libro todavía.",
    "Revisa los borradores (puedes abrirlos y corregirlos) y contabilízalos. Desde ahí son asientos del libro diario, enlazados a su documento, y ya no se modifican: un error se corrige con una reversa, y el documento vuelve a quedar por contabilizar.",
    "Venta: Clientes a Ventas e IVA débito. Compra: gasto (o activo fijo) e IVA crédito a Proveedores; el IVA sin derecho a crédito va al costo. Boleta de honorarios: Honorarios a Retención y Honorarios por pagar. Las notas de crédito invierten los lados.",
    "No se proponen solos: los documentos que no están en el RCV, las compras pendientes o reclamadas, las ventas de activo fijo, los que traen otros impuestos y las boletas anuladas. Cada uno dice por qué.",
    "Las facturas de compra que emites (cambio de sujeto) necesitan una cuenta de «IVA retenido a terceros», que el plan base no trae: créala en el plan de cuentas y elígela en Parámetros.",
];

type Parametros = Record<string, string | string[] | undefined>;

const etiqueta = (c: CuentaContable) => `${c.codigo} · ${c.nombre}`;

export default async function ContabilizacionPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const parametros = await searchParams;
    const pedido = typeof parametros.periodo === "string" ? parametros.periodo : undefined;
    const periodo = periodoValido(pedido) ?? periodoPorDefecto(hoyEnChile());
    const opciones = { token, cache: "no-store" } as const;

    let datos: PorContabilizar | null = null;
    let plan: CuentaContable[] = [];
    try {
        [datos, plan] = await Promise.all([contabilizacionApi.listar(periodo, opciones), cuentasApi.listar(opciones)]);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
    }

    const imputables = plan
        .filter((c) => c.acepta_movimiento && c.is_active)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));
    const registra = puedeRegistrar(rol);

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Por contabilizar"
                descripcion="Los documentos del SII del mes, de factura a asiento: Finova propone un borrador por documento, tú lo revisas y lo contabilizas."
            />

            <Guia titulo="Cómo se contabilizan los documentos">
                <ReglasGuia reglas={REGLAS} />
            </Guia>

            <SelectorDeMes ruta="/dashboard/contabilizacion" periodo={periodo} />

            {!datos ? (
                <Aviso tono="critico">
                    No pudimos cargar los documentos. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la
                    página.
                </Aviso>
            ) : (
                <>
                    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
                        <Indicador titulo="Por contabilizar" valor={datos.resumen.pendientes} />
                        <Indicador titulo="En borrador" valor={datos.resumen.borradores} nota="Revisados, falta contabilizar" />
                        <Indicador titulo="Contabilizados" valor={datos.resumen.contabilizados} />
                        <Indicador titulo="No se proponen" valor={datos.resumen.no_contabilizables} nota="Cada uno dice por qué" />
                    </div>

                    {!registra ? (
                        <Aviso>Tu rol en esta empresa solo permite consultar. Un administrador o contador propone y contabiliza.</Aviso>
                    ) : null}

                    {datos.items.length === 0 ? (
                        <Aviso>
                            No hay documentos del SII en este mes.{" "}
                            <Link href={`/dashboard/documentos?libro=compras&periodo=${periodo}`} className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                                Impórtalos en Documentos
                            </Link>
                            .
                        </Aviso>
                    ) : (
                        // key: al cambiar de mes o tras proponer, la selección parte de nuevo.
                        <TablaPorContabilizar
                            key={`${periodo}-${datos.resumen.pendientes}-${datos.resumen.borradores}`}
                            periodo={periodo}
                            items={datos.items}
                            opcionesVenta={imputables.filter((c) => c.id_tipo_cuenta === 4).map((c) => ({ id_cuenta: c.id_cuenta, etiqueta: etiqueta(c) }))}
                            opcionesCompra={imputables
                                .filter((c) => c.id_tipo_cuenta === 5 || c.id_tipo_cuenta === 1)
                                .map((c) => ({ id_cuenta: c.id_cuenta, etiqueta: etiqueta(c) }))}
                            puedeRegistrar={registra}
                        />
                    )}

                    {datos.cuentas.some((c) => !c.cuenta && c.funcion !== "iva_retenido") ? (
                        <Aviso>
                            Hay funciones contables sin cuenta.{" "}
                            <Link href="/dashboard/parametros" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                                Defínelas en Parámetros
                            </Link>
                            .
                        </Aviso>
                    ) : null}
                </>
            )}
        </div>
    );
}
