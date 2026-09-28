"use client";

/* ============================================================================
   Fila de una cuenta: vista + acciones (editar/desactivar/reactivar).

   Antes el formulario de edicion se embutia en la celda angosta de
   "Acciones" (~10rem) y quedaba amontonado. Ahora, al editar o confirmar una
   baja/reactivacion, se agrega una SEGUNDA <tr> con un <td colSpan> que ocupa
   todo el ancho de la tabla — mismo patron que un panel expandible, pero con
   filas de verdad porque el contenido es una tabla.
   ========================================================================== */

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import type { CuentaContable } from "@/lib/api";
import { desactivarCuenta, reactivarCuenta } from "./actions";
import { FormularioCuenta } from "./FormularioCuenta";

type FilaCuentaProps = {
    readonly cuenta: CuentaContable;
    /** Todas las cuentas de la empresa: FormularioCuenta las necesita para el
     *  selector de cuenta padre. */
    readonly cuentas: readonly CuentaContable[];
    readonly puedeEditar: boolean;
    readonly profundidad: number;
};

/** Confirmación inline de una acción de un solo paso (desactivar/reactivar):
 *  misma forma para las dos, solo cambian el texto y qué Server Action llaman. */
function ConfirmacionAccion({
    pregunta,
    textoConfirmar,
    textoEnCurso,
    accion,
    alTerminar,
}: {
    readonly pregunta: string;
    readonly textoConfirmar: string;
    readonly textoEnCurso: string;
    readonly accion: () => Promise<{ errores?: readonly string[]; ok?: boolean }>;
    readonly alTerminar: () => void;
}) {
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    return (
        <div className="flex flex-wrap items-center justify-between gap-3 text-[13px]">
            <p>{pregunta}</p>
            <div className="flex items-center gap-2">
                {errores.length > 0 ? (
                    <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                        {errores.join(" ")}
                    </p>
                ) : null}
                <Boton
                    variante="acento"
                    disabled={enCurso}
                    onClick={() => {
                        setErrores([]);
                        iniciar(async () => {
                            const resultado = await accion();
                            if (resultado.errores) {
                                setErrores(resultado.errores);
                                return;
                            }
                            alTerminar();
                        });
                    }}
                >
                    {enCurso ? textoEnCurso : textoConfirmar}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={alTerminar}>
                    Cancelar
                </Boton>
            </div>
        </div>
    );
}

export function FilaCuenta({ cuenta, cuentas, puedeEditar, profundidad }: FilaCuentaProps) {
    const [modo, setModo] = useState<"nada" | "editar" | "desactivar" | "reactivar">("nada");
    const esAgrupacion = !cuenta.acepta_movimiento;
    const cerrar = () => setModo("nada");

    return (
        <>
            <tr className="border-b border-[var(--border-subtle)] align-top last:border-0">
                <td
                    className="tabular px-4 py-2.5 font-medium"
                    style={{ paddingLeft: `${1 + profundidad * 1.25}rem` }}
                >
                    {cuenta.codigo}
                </td>
                <td className={`px-4 py-2.5 ${esAgrupacion ? "font-semibold" : ""}`}>
                    {cuenta.nombre}
                    {esAgrupacion ? (
                        <Etiqueta tono="neutro" className="ml-2">
                            Agrupación
                        </Etiqueta>
                    ) : null}
                </td>
                <td className="px-4 py-2.5">
                    {cuenta.is_active ? (
                        <Etiqueta tono="positivo">Activa</Etiqueta>
                    ) : (
                        <Etiqueta tono="neutro">Inactiva</Etiqueta>
                    )}
                </td>
                <td className="px-4 py-2.5 text-right">
                    {!puedeEditar ? null : modo === "nada" ? (
                        <div className="flex justify-end gap-1">
                            <Boton variante="fantasma" onClick={() => setModo("editar")}>
                                Editar
                            </Boton>
                            {cuenta.is_active ? (
                                <Boton variante="fantasma" onClick={() => setModo("desactivar")}>
                                    Desactivar
                                </Boton>
                            ) : (
                                <Boton variante="fantasma" onClick={() => setModo("reactivar")}>
                                    Reactivar
                                </Boton>
                            )}
                        </div>
                    ) : (
                        <span className="text-[12px] text-[var(--foreground-muted)]">
                            {modo === "editar" ? "Editando…" : "¿Confirmar?"}
                        </span>
                    )}
                </td>
            </tr>
            {/* Ancho completo, no la celda angosta de acciones: un formulario o
                una confirmacion amontonados en ~10rem se ven mal. */}
            {modo === "editar" ? (
                <tr className="border-b border-[var(--border-subtle)]">
                    <td colSpan={4} className="bg-[var(--background-raised)] px-4 py-4">
                        <FormularioCuenta cuenta={cuenta} cuentas={cuentas} alGuardar={cerrar} alCancelar={cerrar} />
                    </td>
                </tr>
            ) : null}
            {modo === "desactivar" ? (
                <tr className="border-b border-[var(--border-subtle)]">
                    <td colSpan={4} className="bg-[var(--background-raised)] px-4 py-4">
                        <ConfirmacionAccion
                            pregunta={`¿Desactivar ${cuenta.codigo} · ${cuenta.nombre}? Deja de ofrecerse para nuevos movimientos; su historial no se toca.`}
                            textoConfirmar="Sí, desactivar"
                            textoEnCurso="Desactivando…"
                            accion={() => desactivarCuenta(cuenta.id_cuenta)}
                            alTerminar={cerrar}
                        />
                    </td>
                </tr>
            ) : null}
            {modo === "reactivar" ? (
                <tr className="border-b border-[var(--border-subtle)]">
                    <td colSpan={4} className="bg-[var(--background-raised)] px-4 py-4">
                        <ConfirmacionAccion
                            pregunta={`¿Reactivar ${cuenta.codigo} · ${cuenta.nombre}? Vuelve a ofrecerse para nuevos movimientos.`}
                            textoConfirmar="Sí, reactivar"
                            textoEnCurso="Reactivando…"
                            accion={() => reactivarCuenta(cuenta.id_cuenta)}
                            alTerminar={cerrar}
                        />
                    </td>
                </tr>
            ) : null}
        </>
    );
}
