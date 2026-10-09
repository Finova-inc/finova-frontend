"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { nombreMesLargo, nombrePeriodo } from "@/lib/formato";
import { AvisoMesesCerrados } from "./AccionesPeriodo";
import { abrirMes } from "./actions";

export interface MesElegible {
    readonly numero: number;
    /** "enero 2026": el mes cerrado más antiguo posterior a este, o null. */
    readonly cerradoPosterior: string | null;
}

/**
 * Primer período de un ejercicio que todavía no tiene ninguno.
 *
 * Los meses no se abren en bloque: se elige el que se va a trabajar, y solo
 * ese queda abierto. En un año anterior eso es "cargar" (historia que se
 * registra después de ocurrida); en el año en curso, "abrir". La página pasa
 * solo los meses que ya comenzaron: un mes futuro no se puede abrir.
 *
 * Al abrir el primero, la página muestra las doce tarjetas del año y los
 * demás meses se abren desde la suya.
 */
export function SelectorPeriodo({
    anio,
    esHistoria,
    meses,
}: {
    readonly anio: number;
    /** Año anterior al actual: se "carga" en vez de "abrirse". */
    readonly esHistoria: boolean;
    readonly meses: readonly MesElegible[];
}) {
    const idBase = useId();
    const [desplegado, setDesplegado] = useState(false);
    const [porConfirmar, setPorConfirmar] = useState<MesElegible | null>(null);
    const [mesPendiente, setMesPendiente] = useState<number | null>(null);
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    const verbo = esHistoria ? "Cargar" : "Abrir";
    const enProgreso = esHistoria ? "Cargando…" : "Abriendo…";

    function abrir(mes: number) {
        setErrores([]);
        setMesPendiente(mes);
        iniciar(async () => {
            const resultado = await abrirMes(anio, mes);
            // Si sale bien no hay nada que limpiar: la página se vuelve a
            // dibujar con las tarjetas del año y este selector desaparece.
            if (resultado.errores) {
                setErrores(resultado.errores);
                setMesPendiente(null);
            }
        });
    }

    function elegir(mes: MesElegible) {
        if (mes.cerradoPosterior) setPorConfirmar(mes);
        else abrir(mes.numero);
    }

    function cancelar() {
        setDesplegado(false);
        setPorConfirmar(null);
        setErrores([]);
    }

    if (meses.length === 0) return null;

    if (!desplegado) {
        return (
            <div>
                <Boton variante="acento" onClick={() => setDesplegado(true)}>
                    {verbo} período
                </Boton>
            </div>
        );
    }

    return (
        <div role="group" aria-labelledby={`${idBase}-titulo`} className="flex flex-col gap-3">
            <p id={`${idBase}-titulo`} className="text-[13.5px] font-medium">
                ¿Qué mes de {anio} quieres {verbo.toLowerCase()}?
            </p>

            {porConfirmar?.cerradoPosterior ? (
                <AvisoMesesCerrados
                    idTitulo={`${idBase}-aviso`}
                    nombre={nombrePeriodo(anio, porConfirmar.numero)}
                    cerradoPosterior={porConfirmar.cerradoPosterior}
                    verbo={verbo}
                    enCurso={enCurso}
                    onConfirmar={() => abrir(porConfirmar.numero)}
                    onCancelar={() => setPorConfirmar(null)}
                />
            ) : (
                <>
                    <ul className="grid max-w-xl grid-cols-3 gap-2 sm:grid-cols-4">
                        {meses.map((mes) => (
                            <li key={mes.numero}>
                                <Boton
                                    variante="neutro"
                                    className="w-full capitalize"
                                    disabled={enCurso}
                                    onClick={() => elegir(mes)}
                                >
                                    {enCurso && mesPendiente === mes.numero ? enProgreso : nombreMesLargo(mes.numero)}
                                </Boton>
                            </li>
                        ))}
                    </ul>
                    {meses.length < 12 ? (
                        <p className="text-[12px] text-[var(--foreground-muted)]">
                            Solo aparecen los meses que ya comenzaron. Los demás se abren cuando llegue su fecha.
                        </p>
                    ) : null}
                    <div>
                        {/* Margen negativo igual al relleno: el texto queda alineado con el título. */}
                        <Boton variante="fantasma" className="-ml-3.5" disabled={enCurso} onClick={cancelar}>
                            Cancelar
                        </Boton>
                    </div>
                </>
            )}

            {errores.length > 0 ? (
                <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                    {errores.join(" ")}
                </p>
            ) : null}
        </div>
    );
}
