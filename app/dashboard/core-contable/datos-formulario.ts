import { ApiError, cuentasApi, periodosApi, tercerosApi } from "@/lib/api";
import { claseDe } from "@/lib/planCuentas";
import type { CuentaOpcion, PeriodoOpcion, TerceroOpcion } from "./FormularioAsiento";

/**
 * Cuentas imputables, terceros y períodos para el formulario de asiento.
 *
 * Solo cuentas ACTIVAS y que ACEPTEN MOVIMIENTO: una desactivada, o una de
 * agrupación (solo ordena el árbol del plan de cuentas), no admite asientos
 * nuevos (el backend la rechaza), así que ofrecerla solo llevaría a un error
 * al final. Cada una lleva el nombre de su rubro, que es como se agrupan en
 * el selector: "1101 · Efectivo y equivalentes al efectivo".
 *
 * Solo se envían los campos que el formulario usa: el tercero completo trae
 * datos que no hacen falta en el navegador.
 */
export async function cargarOpcionesDelFormulario(token: string): Promise<{
    readonly cuentas: CuentaOpcion[];
    readonly terceros: TerceroOpcion[];
    /** null si no se pudieron cargar: el formulario no avisa y decide el backend. */
    readonly periodos: PeriodoOpcion[] | null;
    readonly error: ApiError | null;
}> {
    const opciones = { token, cache: "no-store" } as const;
    const [cuentas, terceros, periodos] = await Promise.allSettled([
        cuentasApi.listar(opciones),
        tercerosApi.listar(opciones),
        periodosApi.listar(opciones),
    ]);

    const error =
        cuentas.status === "rejected" && cuentas.reason instanceof ApiError ? cuentas.reason : null;

    const porId = new Map(cuentas.status === "fulfilled" ? cuentas.value.map((c) => [c.id_cuenta, c]) : []);

    return {
        cuentas:
            cuentas.status === "fulfilled"
                ? cuentas.value
                      .filter((cuenta) => cuenta.is_active && cuenta.acepta_movimiento)
                      .map(({ id_cuenta, codigo, nombre, id_cuenta_padre, id_tipo_cuenta }) => {
                          const rubro = id_cuenta_padre ? porId.get(id_cuenta_padre) : undefined;
                          return {
                              id_cuenta,
                              codigo,
                              nombre,
                              grupo: rubro ? `${rubro.codigo} · ${rubro.nombre}` : claseDe(id_tipo_cuenta).nombre,
                          };
                      })
                : [],
        // Sin terceros el asiento igual se puede registrar: el RUT por linea
        // es opcional. Por eso un fallo aqui no se reporta como error.
        terceros:
            terceros.status === "fulfilled"
                ? terceros.value.map(({ id_tercero, rut, razon_social }) => ({
                      id_tercero,
                      rut,
                      razon_social,
                  }))
                : [],
        periodos:
            periodos.status === "fulfilled"
                ? periodos.value.map(({ anio, mes, estado }) => ({ anio, mes, estado }))
                : null,
        error,
    };
}
