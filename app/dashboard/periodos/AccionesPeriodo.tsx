"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { abrirEjercicio, abrirMes, cerrarPeriodo, reabrirPeriodo, type EstadoPeriodo } from "./actions";

type AccionesPeriodoProps = {
    /** null: el mes todavía no está abierto. */
    readonly idPeriodo: string | null;
    readonly anio: number;
    readonly mes: number;
    /** "septiembre 2026". */
    readonly nombre: string;
    readonly estado: "abierto" | "cerrado" | "sin-abrir";
    /** Por qué todavía no se puede cerrar (mes en curso, un mes anterior abierto), o null. */
    readonly bloqueoCierre: string | null;
    /** Borradores con fecha de este mes: quedarían sin contabilizar al cerrarlo. */
    readonly borradores: number;
    /** Administrador o contador: abre y cierra. */
    readonly puedeRegistrar: boolean;
    /** Solo el administrador reabre. */
    readonly puedeReabrir: boolean;
};

/**
 * Abrir, cerrar o reabrir un mes, cada uno con su confirmación en línea.
 *
 * Cerrar impide registrar asientos en el mes. Reabrir es más delicado: un mes
 * cerrado suele estar ya declarado en el F29, y registrar algo en él obliga a
 * rectificar. Por eso pide un motivo que queda en la auditoría.
 */
export function AccionesPeriodo({
    idPeriodo,
    anio,
    mes,
    nombre,
    estado,
    bloqueoCierre,
    borradores,
    puedeRegistrar,
    puedeReabrir,
}: AccionesPeriodoProps) {
    const idBase = useId();
    const [modo, setModo] = useState<"nada" | "cerrar" | "reabrir">("nada");
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    function ejecutar(accion: () => Promise<EstadoPeriodo>) {
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

    const listaErrores =
        errores.length > 0 ? (
            <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                {errores.join(" ")}
            </p>
        ) : null;

    if (estado === "sin-abrir") {
        if (!puedeRegistrar) return null;
        return (
            <div className="flex flex-col gap-2">
                <div>
                    <Boton variante="neutro" disabled={enCurso} onClick={() => ejecutar(() => abrirMes(anio, mes))}>
                        {enCurso ? "Abriendo…" : "Abrir mes"}
                    </Boton>
                </div>
                {listaErrores}
            </div>
        );
    }

    if (estado === "abierto") {
        if (!puedeRegistrar || !idPeriodo) return null;
        if (bloqueoCierre) {
            return <p className="text-[12px] text-[var(--foreground-muted)]">{bloqueoCierre}</p>;
        }
        if (modo !== "cerrar") {
            return (
                <div>
                    <Boton variante="neutro" onClick={() => setModo("cerrar")}>
                        Cerrar mes
                    </Boton>
                </div>
            );
        }
        return (
            <div role="alertdialog" aria-labelledby={`${idBase}-cerrar`} className="flex flex-col gap-2 text-[12.5px]">
                <p id={`${idBase}-cerrar`}>
                    ¿Cerrar <span className="capitalize">{nombre}</span>? Desde ahora no se podrán registrar asientos
                    con fechas de ese mes.
                </p>
                {borradores > 0 ? (
                    <p className="rounded-lg bg-[var(--aviso-bg)] px-2.5 py-2">
                        Hay {borradores} {borradores === 1 ? "borrador" : "borradores"} con fecha de este mes: no se
                        podrán contabilizar en él.
                    </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                    <Boton variante="acento" disabled={enCurso} onClick={() => ejecutar(() => cerrarPeriodo(idPeriodo))}>
                        {enCurso ? "Cerrando…" : "Sí, cerrar"}
                    </Boton>
                    <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("nada")}>
                        Cancelar
                    </Boton>
                </div>
                {listaErrores}
            </div>
        );
    }

    if (!puedeReabrir || !idPeriodo) return null;
    if (modo !== "reabrir") {
        return (
            <div>
                {/* Margen negativo igual al relleno: el texto queda alineado con el de la tarjeta. */}
                <Boton variante="fantasma" className="-ml-3.5" onClick={() => setModo("reabrir")}>
                    Reabrir
                </Boton>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 text-[12.5px]">
            <p>
                Si <span className="capitalize">{nombre}</span> ya se declaró en el F29, registrar cambios en él obliga
                a rectificar la declaración. El motivo queda en la auditoría.
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
            <div className="flex flex-wrap gap-2">
                <Boton
                    variante="acento"
                    disabled={enCurso || motivo.trim().length < 10}
                    onClick={() => ejecutar(() => reabrirPeriodo(idPeriodo, motivo))}
                >
                    {enCurso ? "Reabriendo…" : "Reabrir mes"}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("nada")}>
                    Cancelar
                </Boton>
            </div>
            {listaErrores}
        </div>
    );
}

/** Abre los doce meses del ejercicio de una vez. */
export function AbrirEjercicio({ anio }: { readonly anio: number }) {
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
                            const resultado = await abrirEjercicio(anio);
                            if (resultado.errores) setErrores(resultado.errores);
                        });
                    }}
                >
                    {enCurso ? "Abriendo…" : `Abrir ejercicio ${anio}`}
                </Boton>
            </div>
            {errores.length > 0 ? (
                <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                    {errores.join(" ")}
                </p>
            ) : null}
        </div>
    );
}
