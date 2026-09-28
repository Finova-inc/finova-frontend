import { ApiError, cuentasApi, tercerosApi } from "@/lib/api";
import type { CuentaOpcion, TerceroOpcion } from "./FormularioAsiento";

/**
 * Cuentas activas e imputables, y terceros, para el formulario de asiento.
 *
 * Solo cuentas ACTIVAS y que ACEPTEN MOVIMIENTO: una desactivada, o una de
 * agrupacion (acepta_movimiento:false, solo ordena el arbol del plan de
 * cuentas), no admite movimientos nuevos (el backend la rechaza), asi que
 * ofrecerla solo llevaria a un error al final. Solo se envian los campos que
 * el formulario usa: el tercero completo trae datos que no hacen falta en el
 * navegador.
 */
export async function cargarOpcionesDelFormulario(token: string): Promise<{
    readonly cuentas: CuentaOpcion[];
    readonly terceros: TerceroOpcion[];
    readonly error: ApiError | null;
}> {
    const opciones = { token, cache: "no-store" } as const;
    const [cuentas, terceros] = await Promise.allSettled([
        cuentasApi.listar(opciones),
        tercerosApi.listar(opciones),
    ]);

    const error =
        cuentas.status === "rejected" && cuentas.reason instanceof ApiError ? cuentas.reason : null;

    return {
        cuentas:
            cuentas.status === "fulfilled"
                ? cuentas.value
                      .filter((cuenta) => cuenta.is_active && cuenta.acepta_movimiento)
                      .map(({ id_cuenta, codigo, nombre, id_tipo_cuenta }) => ({
                          id_cuenta,
                          codigo,
                          nombre,
                          id_tipo_cuenta,
                      }))
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
        error,
    };
}
