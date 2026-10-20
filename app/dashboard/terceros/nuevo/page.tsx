/* ============================================================================
   /dashboard/terceros/nuevo — registrar un cliente o proveedor.

   Llega vacío desde el botón "Nuevo tercero", o con los datos de una
   contraparte de los documentos del SII (?rut=&nombre=&rol=&tipo=&motivo=),
   desde la lista de sugerencias o desde la pantalla de Documentos. En ese
   caso los datos vienen propuestos y la persona los revisa antes de
   registrar: nada se crea solo (Ley 21.719).
   ========================================================================== */

import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado } from "../../core-contable/partes";
import { FormularioTercero } from "../FormularioTercero";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nuevo tercero" };

type Parametros = Record<string, string | string[] | undefined>;

function texto(parametros: Parametros, clave: string, largo: number): string | undefined {
    const valor = parametros[clave];
    return typeof valor === "string" && valor.trim() ? valor.trim().slice(0, largo) : undefined;
}

export default async function NuevoTerceroPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const parametros = await searchParams;

    const encabezado = (
        <Encabezado
            titulo="Nuevo tercero"
            descripcion="Un cliente o proveedor de la empresa. Con su RUT, sus documentos del SII quedan enlazados a su ficha."
            volverA="/dashboard/terceros"
        />
    );

    // Solo presentación: el backend responde 403 igual si alguien fuerza el alta.
    if (!puedeRegistrar(rol)) {
        return (
            <div className="flex flex-col gap-4">
                {encabezado}
                <Aviso>Tu rol en esta empresa permite consultar terceros, pero no registrarlos.</Aviso>
            </div>
        );
    }

    const rolSugerido = texto(parametros, "rol", 10);
    const tipo = texto(parametros, "tipo", 1);
    const motivo = texto(parametros, "motivo", 120);
    const desdeSii = Boolean(texto(parametros, "rut", 16));

    return (
        <div className="flex flex-col gap-4">
            {encabezado}
            {desdeSii ? (
                <Aviso>
                    Datos propuestos desde los documentos del SII. Revisa el nombre, el tipo de persona y el rol antes de
                    registrar.
                </Aviso>
            ) : null}
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                <FormularioTercero
                    modo="registrar"
                    inicial={{
                        rut: texto(parametros, "rut", 16),
                        razon_social: texto(parametros, "nombre", 150),
                        tipo_persona: tipo === "N" || tipo === "J" ? tipo : undefined,
                        es_proveedor: rolSugerido === "proveedor" || rolSugerido === "ambos",
                        es_cliente: rolSugerido === "cliente" || rolSugerido === "ambos",
                    }}
                    motivoSugerencia={tipo === "N" || tipo === "J" ? motivo : undefined}
                />
            </div>
        </div>
    );
}
