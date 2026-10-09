/* ============================================================================
   /dashboard/plan-cuentas/configurar — "Configurar plan de cuentas".

   La empresa elige qué cuentas del plan base usa y agrega las suyas; las
   agrupaciones se crean solas. Sirve la primera vez y cada vez que se
   quieran sumar cuentas: lo que ya está en el plan aparece marcado y fijo.
   ========================================================================== */

import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { ApiError, cuentasApi } from "@/lib/api";
import { exigirTokenSesion, obtenerEmpresaDelToken, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado, EnlaceAccion } from "../../core-contable/partes";
import { ConfiguradorPlan } from "./ConfiguradorPlan";

export const dynamic = "force-dynamic";
export const metadata = { title: "Configurar plan de cuentas" };

function Pantalla({ children }: { readonly children: ReactNode }) {
    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Configurar plan de cuentas"
                descripcion="Marca las cuentas del plan base que usa la empresa y agrega las tuyas dentro de cada rubro. Las agrupaciones (clase, grupo y rubro) se crean solas, y lo que ya está en tu plan aparece marcado."
                acciones={
                    <EnlaceAccion href="/dashboard/plan-cuentas" variante="neutro">
                        Volver al plan
                    </EnlaceAccion>
                }
            />
            {children}
        </div>
    );
}

export default async function ConfigurarPlanPage() {
    const token = await exigirTokenSesion();
    const [rol, idEmpresa] = await Promise.all([obtenerRolDelToken(), obtenerEmpresaDelToken()]);

    if (!puedeRegistrar(rol)) {
        return (
            <Pantalla>
                <Aviso>
                    Tu rol en esta empresa no permite configurar el plan de cuentas: pídeselo a un administrador o
                    contador.
                </Aviso>
            </Pantalla>
        );
    }

    const opciones = { token, cache: "no-store" } as const;
    const [cuentas, plantilla] = await Promise.allSettled([cuentasApi.listar(opciones), cuentasApi.plantilla(opciones)]);
    if ([cuentas, plantilla].some((r) => r.status === "rejected" && r.reason instanceof ApiError && r.reason.status === 401)) {
        redirect("/login");
    }

    if (cuentas.status === "rejected" || plantilla.status === "rejected") {
        return (
            <Pantalla>
                <Aviso tono="critico">
                    No pudimos cargar el plan de cuentas. Si el servidor estaba inactivo puede tardar unos segundos en
                    despertar: recarga la página.
                </Aviso>
            </Pantalla>
        );
    }

    // Un plan propio (sin ningún código del plan base) no se mezcla con él.
    if (plantilla.value.conflicto) {
        return (
            <Pantalla>
                <Aviso tono="aviso">{plantilla.value.conflicto}</Aviso>
            </Pantalla>
        );
    }

    return (
        <Pantalla>
            <ConfiguradorPlan plantilla={plantilla.value} cuentas={cuentas.value} idEmpresa={idEmpresa ?? "sin-empresa"} />
        </Pantalla>
    );
}
