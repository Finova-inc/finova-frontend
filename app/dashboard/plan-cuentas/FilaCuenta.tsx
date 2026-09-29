"use client";

/* ============================================================================
   Fila de una cuenta en el árbol del plan.

   Al editar, agregar una cuenta dentro o reactivar, se abre una SEGUNDA <tr>
   con un <td colSpan> a todo el ancho de la tabla: el formulario tiene espacio
   y la persona no pierde de vista la fila que está tocando.

   Desactivar vive dentro de "Editar", no como botón suelto en la fila: es la
   acción menos frecuente y la que más conviene pensar.
   ========================================================================== */

import Link from "next/link";
import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import type { CuentaContable } from "@/lib/api";
import { normalizar } from "@/lib/planCuentas";
import { reactivarCuenta } from "./actions";
import { FormularioCuenta } from "./FormularioCuenta";

type FilaCuentaProps = {
    readonly cuenta: CuentaContable;
    /** Todas las cuentas: el formulario las necesita para agrupaciones y códigos. */
    readonly cuentas: readonly CuentaContable[];
    /** Nivel dentro del panel de su clase: 0 = grupo, 1 = rubro, 2 = cuenta. */
    readonly nivel: number;
    /** Cuentas imputables activas dentro de esta agrupación. */
    readonly imputablesDentro: number;
    readonly puedeEditar: boolean;
    /** Texto buscado, para resaltarlo. */
    readonly busqueda: string;
    /** Solo en las filas que pliegan una sección (los grupos). */
    readonly plegada?: boolean;
    readonly alPlegar?: () => void;
};

type Modo = "nada" | "editar" | "agregar" | "reactivar";

/**
 * Marca la coincidencia con el amarillo destacador de la paleta, que existe
 * justamente para resaltar. Busca sin tildes pero marca sobre el texto
 * original: cada letra original se mapea a su letra normalizada.
 */
function Resaltado({ texto, busqueda }: { readonly texto: string; readonly busqueda: string }) {
    const consulta = normalizar(busqueda.trim());
    if (!consulta) return <>{texto}</>;

    let plano = "";
    const origen: number[] = [];
    [...texto].forEach((letra, indice) => {
        for (const normalizada of normalizar(letra)) {
            plano += normalizada;
            origen.push(indice);
        }
    });
    const inicio = plano.indexOf(consulta);
    if (inicio < 0) return <>{texto}</>;

    const letras = [...texto];
    const desde = origen[inicio];
    const hasta = origen[inicio + consulta.length - 1] + 1;
    return (
        <>
            {letras.slice(0, desde).join("")}
            <mark className="rounded-[3px] bg-[rgb(255_197_61_/_0.5)] px-0.5 text-inherit">
                {letras.slice(desde, hasta).join("")}
            </mark>
            {letras.slice(hasta).join("")}
        </>
    );
}

export function FilaCuenta({
    cuenta,
    cuentas,
    nivel,
    imputablesDentro,
    puedeEditar,
    busqueda,
    plegada,
    alPlegar,
}: FilaCuentaProps) {
    const [modo, setModo] = useState<Modo>("nada");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();
    const cerrar = () => {
        setModo("nada");
        setErrores([]);
    };

    const esAgrupacion = !cuenta.acepta_movimiento;
    // Por nivel y no por el botón de pliegue: al buscar no hay pliegue, pero
    // el grupo tiene que seguir viéndose como grupo.
    const esGrupo = nivel === 0 && esAgrupacion;
    const inactiva = !cuenta.is_active;

    return (
        <>
            <tr
                // En oscuro, --background-raised casi no se distingue de la
                // superficie: el grupo se marca con un velo claro traslúcido.
                className={`border-b border-[var(--border-subtle)] ${
                    esGrupo ? "bg-[var(--background-raised)] dark:bg-[rgb(255_255_255_/_0.05)]" : ""
                } ${
                    inactiva ? "text-[var(--foreground-muted)]" : ""
                }`}
            >
                <td className={`tabular whitespace-nowrap px-4 py-2 align-middle ${esAgrupacion ? "font-semibold" : "font-medium"}`}>
                    <Resaltado texto={cuenta.codigo} busqueda={busqueda} />
                </td>
                <td className="py-2 pr-4 align-middle" style={{ paddingLeft: `${1 + nivel * 1.25}rem` }}>
                    <div className="flex min-w-0 items-center gap-1.5">
                        {alPlegar ? (
                            <button
                                type="button"
                                onClick={alPlegar}
                                aria-expanded={!plegada}
                                aria-label={`${plegada ? "Desplegar" : "Plegar"} ${cuenta.nombre}`}
                                className="-ml-1.5 grid size-6 shrink-0 place-items-center rounded-md text-[var(--foreground-muted)] transition-colors hover:bg-[var(--surface)] hover:text-[var(--foreground)]"
                            >
                                <Icon
                                    name="chevron"
                                    className={`size-3.5 transition-transform duration-150 ${plegada ? "" : "rotate-90"}`}
                                />
                            </button>
                        ) : null}
                        <span
                            className={
                                esGrupo
                                    ? "font-display text-[13.5px] font-semibold"
                                    : esAgrupacion
                                      ? "font-semibold"
                                      : ""
                            }
                        >
                            <Resaltado texto={cuenta.nombre} busqueda={busqueda} />
                        </span>
                        {cuenta.codigo_sii ? (
                            <span className="tabular ml-1 shrink-0 text-[11px] text-[var(--foreground-muted)]" title="Código SII">
                                SII {cuenta.codigo_sii}
                            </span>
                        ) : null}
                    </div>
                </td>
                <td className="whitespace-nowrap px-4 py-2 align-middle text-[12px] text-[var(--foreground-muted)]">
                    {inactiva ? (
                        <Etiqueta tono="neutro">Inactiva</Etiqueta>
                    ) : esAgrupacion ? (
                        `${imputablesDentro} ${imputablesDentro === 1 ? "cuenta" : "cuentas"}`
                    ) : cuenta.tiene_movimientos ? (
                        <span className="inline-flex items-center gap-1" title="Código, clase e imputabilidad fijos">
                            <Icon name="lock" className="size-3.5" />
                            Con asientos
                        </span>
                    ) : null}
                </td>
                <td className="whitespace-nowrap px-2 py-1 text-right align-middle">
                    <div className="flex justify-end gap-0.5">
                        {!esAgrupacion && cuenta.tiene_movimientos ? (
                            <Link
                                href={`/dashboard/core-contable?cuenta=${cuenta.id_cuenta}`}
                                className="inline-flex items-center gap-1.5 rounded-lg border border-transparent px-3.5 py-2 text-[13px] font-medium text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--foreground)]"
                            >
                                Asientos
                                <Icon name="arrowRight" className="size-3.5" />
                            </Link>
                        ) : null}
                        {puedeEditar && modo === "nada" ? (
                            inactiva ? (
                                <Boton variante="fantasma" onClick={() => setModo("reactivar")}>
                                    Reactivar
                                </Boton>
                            ) : (
                                <>
                                    {esAgrupacion ? (
                                        <Boton
                                            variante="fantasma"
                                           
                                            aria-label={`Agregar una cuenta dentro de ${cuenta.nombre}`}
                                            onClick={() => setModo("agregar")}
                                        >
                                            <Icon name="plus" className="size-3.5" />
                                            Agregar
                                        </Boton>
                                    ) : null}
                                    <Boton
                                        variante="fantasma"
                                       
                                        aria-label={`Editar ${cuenta.codigo} ${cuenta.nombre}`}
                                        onClick={() => setModo("editar")}
                                    >
                                        Editar
                                    </Boton>
                                </>
                            )
                        ) : null}
                    </div>
                </td>
            </tr>

            {modo === "editar" || modo === "agregar" ? (
                <tr className="border-b border-[var(--border-subtle)]">
                    <td colSpan={4} className="bg-[var(--background-raised)] px-4 py-5 sm:px-6">
                        <FormularioCuenta
                            cuentas={cuentas}
                            cuenta={modo === "editar" ? cuenta : null}
                            padreInicial={modo === "agregar" ? cuenta : null}
                            alTerminar={cerrar}
                        />
                    </td>
                </tr>
            ) : null}

            {modo === "reactivar" ? (
                <tr className="border-b border-[var(--border-subtle)]">
                    <td colSpan={4} className="bg-[var(--background-raised)] px-4 py-4 sm:px-6">
                        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
                            <p>
                                ¿Reactivar {cuenta.codigo} · {cuenta.nombre}? Vuelve a ofrecerse para nuevos asientos.
                            </p>
                            <div className="flex items-center gap-2">
                                <Boton
                                    variante="acento"
                                    disabled={enCurso}
                                    onClick={() =>
                                        iniciar(async () => {
                                            const resultado = await reactivarCuenta(cuenta.id_cuenta);
                                            if (resultado.errores) setErrores(resultado.errores);
                                            else cerrar();
                                        })
                                    }
                                >
                                    {enCurso ? "Reactivando…" : "Sí, reactivar"}
                                </Boton>
                                <Boton variante="neutro" disabled={enCurso} onClick={cerrar}>
                                    Cancelar
                                </Boton>
                            </div>
                        </div>
                        {errores.length > 0 ? (
                            <p role="alert" className="mt-2 text-[12.5px] text-[var(--critico)]">
                                {errores.join(" ")}
                            </p>
                        ) : null}
                    </td>
                </tr>
            ) : null}
        </>
    );
}
