"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { cargarPlanBase } from "./actions";

export function BotonPlanBase() {
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    return (
        <div className="flex flex-col gap-2">
            <div>
                <Boton
                    variante="acento"
                    disabled={enCurso}
                    onClick={() => {
                        setErrores([]);
                        iniciar(async () => {
                            const resultado = await cargarPlanBase();
                            if (resultado.errores) setErrores(resultado.errores);
                        });
                    }}
                >
                    {enCurso ? "Cargando…" : "Cargar plan de cuentas base"}
                </Boton>
            </div>
            {errores.length > 0 ? (
                <p role="alert" className="text-[13px] text-[var(--critico)]">
                    {errores.join(" ")}
                </p>
            ) : null}
        </div>
    );
}
