"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";

import { Icon } from "@/components/ui/Icon";
import { cambiarEmpresa, type EstadoCambioEmpresa } from "@/app/dashboard/acciones-empresa";
import type { EmpresaDelUsuario } from "@/lib/api";

/* ============================================================================
   Selector de empresa activa.

   ---------------------------------------------------------------------------
   POR QUE UN FORMULARIO Y NO UN onChange CON FETCH
   ---------------------------------------------------------------------------
   El cambio de empresa termina escribiendo una cookie httpOnly, y eso solo
   puede hacerlo el servidor. Con un formulario y una Server Action, el token
   nuevo nunca toca el JavaScript del cliente: se emite, se guarda en la cookie
   y se descarta, todo del lado del servidor.

   Cada empresa es su propio <form> con un campo oculto. Es más marcado que un
   <select>, pero evita el patrón de "seleccionar y luego confirmar" y permite
   mostrar el rol de cada una en la lista, que es información que importa: no
   es lo mismo entrar como administrador que como solo-consulta.
   ========================================================================== */

/** Nombres de los roles del catálogo (cat_rol). */
const NOMBRE_ROL: Record<number, string> = {
    1: "Administrador",
    2: "Contador",
    3: "Solo consulta",
};

const ESTADO_INICIAL: EstadoCambioEmpresa = {};

type SelectorEmpresaProps = {
    readonly empresas: readonly EmpresaDelUsuario[];
    readonly idEmpresaActual: string | null;
};

export function SelectorEmpresa({ empresas, idEmpresaActual }: SelectorEmpresaProps) {
    const [abierto, setAbierto] = useState(false);
    const [estado, accion] = useActionState(cambiarEmpresa, ESTADO_INICIAL);
    const contenedor = useRef<HTMLDivElement>(null);

    const actual = empresas.find((e) => e.id_empresa === idEmpresaActual) ?? empresas[0];

    // Cierra al hacer clic fuera o al pulsar Escape. Sin esto el menú queda
    // abierto tapando contenido y solo se cierra volviendo a pulsar el botón.
    useEffect(() => {
        if (!abierto) return;

        function alPulsarFuera(evento: MouseEvent) {
            if (!contenedor.current?.contains(evento.target as Node)) {
                setAbierto(false);
            }
        }
        function alPulsarTecla(evento: KeyboardEvent) {
            if (evento.key === "Escape") setAbierto(false);
        }

        document.addEventListener("mousedown", alPulsarFuera);
        document.addEventListener("keydown", alPulsarTecla);
        return () => {
            document.removeEventListener("mousedown", alPulsarFuera);
            document.removeEventListener("keydown", alPulsarTecla);
        };
    }, [abierto]);

    if (!actual) {
        return null;
    }

    // Con una sola empresa no hay nada que elegir: se muestra el nombre sin
    // desplegable, para no ofrecer un control que no hace nada.
    if (empresas.length === 1) {
        return (
            <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--background-raised)] px-3 py-1.5 text-[13px] font-medium">
                <Icon name="building" className="size-3.5 shrink-0" />
                <span className="max-w-[22ch] truncate">{actual.razon_social}</span>
            </span>
        );
    }

    return (
        <div ref={contenedor} className="relative">
            <button
                type="button"
                onClick={() => setAbierto((previo) => !previo)}
                aria-expanded={abierto}
                aria-haspopup="menu"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--background-raised)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-[var(--border-strong)]"
            >
                <Icon name="building" className="size-3.5 shrink-0" />
                <span className="max-w-[22ch] truncate">{actual.razon_social}</span>
                <Icon
                    name="arrowRight"
                    className={`size-3.5 shrink-0 transition-transform ${
                        abierto ? "-rotate-90" : "rotate-90"
                    }`}
                />
            </button>

            {abierto ? (
                <div
                    role="menu"
                    className="absolute left-0 top-[calc(100%+6px)] z-20 w-[280px] overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] shadow-[0_8px_28px_rgb(20_17_15_/_0.12)]"
                >
                    <p className="border-b border-[var(--border-subtle)] px-3 py-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                        Cambiar de empresa
                    </p>

                    <ul className="flex flex-col py-1">
                        {empresas.map((empresa) => {
                            const esActual = empresa.id_empresa === actual.id_empresa;

                            return (
                                <li key={empresa.id_empresa}>
                                    <form action={accion}>
                                        <input
                                            type="hidden"
                                            name="id_empresa"
                                            value={empresa.id_empresa}
                                        />
                                        <OpcionEmpresa empresa={empresa} esActual={esActual} />
                                    </form>
                                </li>
                            );
                        })}
                    </ul>

                    {estado.error ? (
                        <p
                            role="alert"
                            className="border-t border-[var(--border-subtle)] bg-[var(--critico-bg)] px-3 py-2 text-[12px] text-[var(--critico)]"
                        >
                            {estado.error}
                        </p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}

/**
 * Una empresa de la lista.
 *
 * Va en su propio componente porque useFormStatus() solo informa del formulario
 * que lo contiene: llamado desde el padre, `pending` se activaría en todas las
 * filas a la vez al pulsar cualquiera.
 */
function OpcionEmpresa({
    empresa,
    esActual,
}: {
    readonly empresa: EmpresaDelUsuario;
    readonly esActual: boolean;
}) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            role="menuitem"
            disabled={esActual || pending}
            className={`flex w-full items-center gap-2.5 px-3 py-2 text-left transition-colors disabled:cursor-default ${
                esActual ? "bg-[var(--background-raised)]" : "hover:bg-[var(--background-raised)]"
            }`}
        >
            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13px] font-medium">
                    {empresa.razon_social ?? "Sin nombre"}
                </span>
                <span className="tabular block truncate text-[11.5px] text-[var(--foreground-muted)]">
                    {empresa.rut} · {NOMBRE_ROL[empresa.id_rol] ?? `Rol ${empresa.id_rol}`}
                </span>
            </span>

            {pending ? (
                <span className="shrink-0 text-[11px] text-[var(--foreground-muted)]">…</span>
            ) : esActual ? (
                <Icon name="check" className="size-4 shrink-0 text-[var(--accent)]" />
            ) : null}
        </button>
    );
}
