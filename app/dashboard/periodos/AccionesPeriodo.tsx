"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { cerrarPeriodo, reabrirPeriodo } from "./actions";

type AccionesPeriodoProps = {
    readonly idPeriodo: string;
    readonly nombre: string;
    readonly estado: string;
    /** El mes ya termino: solo entonces se puede cerrar. */
    readonly terminado: boolean;
    readonly puedeCerrar: boolean;
    readonly puedeReabrir: boolean;
};

/**
 * Cerrar o reabrir un periodo, cada uno con su confirmacion.
 *
 * Cerrar impide registrar asientos en el mes. Reabrir es mas delicado: un mes
 * cerrado suele estar ya declarado en el F29, y registrar algo en el obliga a
 * rectificar. Por eso pide un motivo que queda en el historial.
 */
export function AccionesPeriodo({
    idPeriodo,
    nombre,
    estado,
    terminado,
    puedeCerrar,
    puedeReabrir,
}: AccionesPeriodoProps) {
    const idBase = useId();
    const [modo, setModo] = useState<"nada" | "cerrar" | "reabrir">("nada");
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    function ejecutar(accion: () => Promise<{ errores?: readonly string[]; ok?: boolean }>) {
        setErrores([]);
        iniciar(async () => {
            const resultado = await accion();
            if (resultado.errores) setErrores(resultado.errores);
            if (resultado.ok) {
                setModo("nada");
                setMotivo("");
            }
        });
    }

    if (estado === "abierto") {
        if (!puedeCerrar) return null;
        if (!terminado) {
            return <span className="text-[12px] text-[var(--foreground-muted)]">Se cierra al terminar el mes</span>;
        }
        if (modo !== "cerrar") {
            return (
                <Boton variante="neutro" onClick={() => setModo("cerrar")}>
                    Cerrar
                </Boton>
            );
        }
        return (
            <div className="flex flex-col items-end gap-2 text-[12.5px]">
                <p className="max-w-xs text-right">
                    ¿Cerrar {nombre}? Desde ahora no se podrán registrar asientos con fechas de ese mes.
                </p>
                <div className="flex gap-2">
                    <Boton variante="acento" disabled={enCurso} onClick={() => ejecutar(() => cerrarPeriodo(idPeriodo))}>
                        {enCurso ? "Cerrando…" : "Sí, cerrar"}
                    </Boton>
                    <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("nada")}>
                        Cancelar
                    </Boton>
                </div>
                {errores.length > 0 ? (
                    <p role="alert" className="text-[var(--critico)]">{errores.join(" ")}</p>
                ) : null}
            </div>
        );
    }

    if (!puedeReabrir) return null;
    if (modo !== "reabrir") {
        return (
            <Boton variante="fantasma" onClick={() => setModo("reabrir")}>
                Reabrir
            </Boton>
        );
    }

    return (
        <div className="flex w-full max-w-sm flex-col gap-2 text-[12.5px]">
            <p>
                Si {nombre} ya se declaró en el F29, registrar cambios en él obliga a rectificar la
                declaración. El motivo queda registrado en la auditoría.
            </p>
            <label htmlFor={`${idBase}-motivo`} className="font-medium text-[var(--foreground-muted)]">
                Motivo de la reapertura
            </label>
            <input
                id={`${idBase}-motivo`}
                value={motivo}
                minLength={10}
                maxLength={255}
                onChange={(evento) => setMotivo(evento.target.value)}
                placeholder="Ej.: factura de proveedor recibida tarde"
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px]"
            />
            <div className="flex gap-2">
                <Boton
                    variante="acento"
                    disabled={enCurso || motivo.trim().length < 10}
                    onClick={() => ejecutar(() => reabrirPeriodo(idPeriodo, motivo))}
                >
                    {enCurso ? "Reabriendo…" : "Reabrir período"}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("nada")}>
                    Cancelar
                </Boton>
            </div>
            {errores.length > 0 ? (
                <p role="alert" className="text-[var(--critico)]">{errores.join(" ")}</p>
            ) : null}
        </div>
    );
}
