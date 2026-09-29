"use client";

/* ============================================================================
   Cargar el plan base NIIF, o completar su estructura sobre un plan plano.

   Completar es un cambio de estructura sobre cuentas que pueden tener
   asientos: antes de hacerlo se dice exactamente qué va a pasar (cuántas se
   crean, cuántas se ordenan) y qué no (ningún asiento ni código cambia).
   ========================================================================== */

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { cargarPlanBase } from "./actions";

type AccionPlantillaProps = {
    readonly modo: "cargar" | "completar";
    /** Cuentas que se crearían (agrupaciones y cuentas nuevas del plan base). */
    readonly insertar: number;
    /** Cuentas existentes que pasarían a su rubro. */
    readonly reubicar: number;
};

export function AccionPlantilla({ modo, insertar, reubicar }: AccionPlantillaProps) {
    const [confirmando, setConfirmando] = useState(false);
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    function ejecutar() {
        setErrores([]);
        iniciar(async () => {
            const resultado = await cargarPlanBase();
            if (resultado.errores) {
                setErrores(resultado.errores);
                setConfirmando(false);
            }
        });
    }

    return (
        <div className="flex flex-col gap-3">
            {modo === "completar" && confirmando ? (
                <div role="alertdialog" aria-labelledby="confirmar-plantilla" className="flex flex-col gap-3">
                    <p id="confirmar-plantilla" className="text-[13px]">
                        Se crearán <strong className="tabular">{insertar}</strong> cuentas del plan base y{" "}
                        <strong className="tabular">{reubicar}</strong> de tus cuentas pasarán a su rubro NIIF. Ningún
                        asiento cambia y tus cuentas conservan su código.
                    </p>
                    <div className="flex flex-wrap gap-2">
                        <Boton variante="acento" disabled={enCurso} onClick={ejecutar}>
                            {enCurso ? "Completando…" : "Sí, completar estructura"}
                        </Boton>
                        <Boton variante="neutro" disabled={enCurso} onClick={() => setConfirmando(false)}>
                            Cancelar
                        </Boton>
                    </div>
                </div>
            ) : (
                <div>
                    <Boton
                        variante="acento"
                        disabled={enCurso}
                        onClick={modo === "cargar" ? ejecutar : () => setConfirmando(true)}
                    >
                        {modo === "cargar"
                            ? enCurso
                                ? "Cargando plan base…"
                                : "Cargar plan base NIIF"
                            : "Completar estructura NIIF"}
                    </Boton>
                </div>
            )}
            {errores.length > 0 ? (
                <p role="alert" className="text-[13px] text-[var(--critico)]">
                    {errores.join(" ")}
                </p>
            ) : null}
        </div>
    );
}
