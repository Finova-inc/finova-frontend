/* ============================================================================
   /dashboard/parametros — parámetros de la contabilización.

   Qué cuenta usa Finova para cada función contable (clientes, proveedores,
   ventas, compras, IVA...) al proponer los asientos de los documentos del SII.
   La lista de documentos por contabilizar vive en su propia pantalla.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { ApiError, contabilizacionApi, cuentasApi, type CuentaContable, type CuentaDeFuncion } from "@/lib/api";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado } from "../core-contable/partes";
import { CuentasContabilizacion } from "../contabilizacion/CuentasContabilizacion";

export const dynamic = "force-dynamic";
export const metadata = { title: "Parámetros" };

export default async function ParametrosPage() {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const opciones = { token, cache: "no-store" } as const;

    let cuentasDeFuncion: CuentaDeFuncion[] | null = null;
    let plan: CuentaContable[] = [];
    try {
        [cuentasDeFuncion, plan] = await Promise.all([contabilizacionApi.cuentas(opciones), cuentasApi.listar(opciones)]);
    } catch (error) {
        if (error instanceof ApiError && error.status === 401) redirect("/login");
    }

    const imputables = plan
        .filter((c) => c.acepta_movimiento && c.is_active)
        .sort((a, b) => a.codigo.localeCompare(b.codigo, "es", { numeric: true }));

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Parámetros"
                descripcion="Las cuentas que usa Finova al proponer los asientos de los documentos del SII. Si una función queda en «Plan base», se usa la cuenta con el código sugerido."
            />

            {!cuentasDeFuncion ? (
                <Aviso tono="critico">
                    No pudimos cargar los parámetros. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la
                    página.
                </Aviso>
            ) : (
                <>
                    {!puedeRegistrar(rol) ? <Aviso>Tu rol en esta empresa solo permite consultar los parámetros.</Aviso> : null}
                    <CuentasContabilizacion
                        key={cuentasDeFuncion.map((c) => c.cuenta?.id_cuenta ?? "-").join()}
                        cuentas={cuentasDeFuncion}
                        elegibles={imputables.map((c) => ({
                            id_cuenta: c.id_cuenta,
                            etiqueta: `${c.codigo} · ${c.nombre}`,
                            id_tipo_cuenta: c.id_tipo_cuenta,
                        }))}
                        puedeRegistrar={puedeRegistrar(rol)}
                    />
                    <p className="text-[12.5px] text-[var(--foreground-muted)]">
                        Los documentos pendientes se contabilizan en{" "}
                        <Link href="/dashboard/contabilizacion" className="font-medium text-[var(--accent)] underline-offset-4 hover:underline">
                            Por contabilizar
                        </Link>
                        .
                    </p>
                </>
            )}
        </div>
    );
}
