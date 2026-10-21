"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import type { EstadoPropuestaF29 } from "@/lib/api";
import { aprobarF29, declararF29, desaprobarF29, type EstadoF29 } from "./actions";

const CLASES_CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)]";

/**
 * Aprobación humana del F29 (reglas de aprobación del CLAUDE.md raíz):
 *
 *   borrador ──aprobar──► aprobada ──declarar──► declarada
 *       ▲                    │
 *       └──volver a borrador─┘
 *
 * Aprobar guarda una copia de los montos. Con alertas críticas, la persona
 * marca que las revisó: Finova no da por buenos montos que no cuadran sin que
 * alguien los mire. "Declarada" no la decide Finova: es el contador anotando
 * que ya presentó el F29 en el SII, con el folio que le dio el SII.
 */
export function AccionesF29({
    periodo,
    estado,
    mesTerminado,
    desde,
    criticas,
    cambios,
    version,
    hoy,
}: {
    readonly periodo: string;
    readonly estado: EstadoPropuestaF29 | "sin_guardar";
    readonly mesTerminado: boolean;
    /** Primer día del mes siguiente: desde ahí se aprueba y se presenta. 'AAAA-MM-DD'. */
    readonly desde: string;
    readonly criticas: number;
    /** Códigos que cambiaron desde la aprobación. */
    readonly cambios: number;
    readonly version?: number;
    readonly hoy: string;
}) {
    const id = useId();
    const [revisadas, setRevisadas] = useState(false);
    const [declarando, setDeclarando] = useState(false);
    const [folio, setFolio] = useState("");
    const [fecha, setFecha] = useState(hoy);
    const [resultado, setResultado] = useState<EstadoF29>({});
    const [enCurso, iniciar] = useTransition();

    function ejecutar(accion: () => Promise<EstadoF29>) {
        setResultado({});
        iniciar(async () => {
            const r = await accion();
            setResultado(r);
            if (r.ok) setDeclarando(false);
        });
    }

    const errores =
        resultado.errores && resultado.errores.length > 0 ? (
            <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                {resultado.errores.join(" ")}
            </p>
        ) : null;

    if (estado === "declarada") return null;

    if (estado === "aprobada") {
        return (
            <div className="no-imprimir flex flex-col gap-3 text-[13px]">
                {declarando ? (
                    <form
                        onSubmit={(e) => {
                            e.preventDefault();
                            ejecutar(() => declararF29(periodo, { folio, fecha, version }));
                        }}
                        className="flex max-w-2xl flex-col gap-3 rounded-xl border border-[var(--border-strong)] p-4"
                    >
                        <p className="text-[12.5px] text-[var(--foreground-muted)]">
                            Anótalo después de presentar el F29 en sii.cl. Desde ahí la propuesta queda cerrada: si
                            hubiera que corregir algo, se hace con una rectificatoria en el SII.
                        </p>
                        <div className="grid gap-3 sm:grid-cols-2">
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`${id}-folio`} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                                    Folio de la declaración en el SII
                                </label>
                                <input
                                    id={`${id}-folio`}
                                    required
                                    inputMode="numeric"
                                    maxLength={20}
                                    value={folio}
                                    onChange={(e) => setFolio(e.target.value)}
                                    className={`tabular ${CLASES_CAMPO}`}
                                />
                            </div>
                            <div className="flex flex-col gap-1.5">
                                <label htmlFor={`${id}-fecha`} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                                    Fecha de presentación
                                </label>
                                <input
                                    id={`${id}-fecha`}
                                    type="date"
                                    required
                                    min={desde}
                                    max={hoy}
                                    value={fecha}
                                    onChange={(e) => setFecha(e.target.value)}
                                    className={`tabular ${CLASES_CAMPO}`}
                                />
                            </div>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            <Boton type="submit" variante="acento" disabled={enCurso}>
                                {enCurso ? "Guardando…" : "Registrar declaración"}
                            </Boton>
                            <Boton variante="neutro" disabled={enCurso} onClick={() => setDeclarando(false)}>
                                Cancelar
                            </Boton>
                        </div>
                    </form>
                ) : (
                    <div className="flex flex-wrap gap-2">
                        <Boton variante="acento" disabled={enCurso || cambios > 0} onClick={() => setDeclarando(true)}>
                            <Icon name="check" className="size-4" />
                            Marcar como declarada
                        </Boton>
                        <Boton variante="fantasma" disabled={enCurso} onClick={() => ejecutar(() => desaprobarF29(periodo))}>
                            <Icon name="undo" className="size-4" />
                            {enCurso ? "Volviendo…" : "Volver a borrador"}
                        </Boton>
                    </div>
                )}
                {cambios > 0 ? (
                    <p className="text-[12.5px] text-[var(--foreground-muted)]">
                        Los documentos cambiaron después de aprobar: vuelve a borrador, revisa y aprueba de nuevo antes de declarar.
                    </p>
                ) : null}
                {errores}
            </div>
        );
    }

    // Sin guardar o en borrador.
    if (!mesTerminado) {
        return (
            <p className="no-imprimir text-[12.5px] text-[var(--foreground-muted)]">
                El mes todavía no termina: la propuesta se puede aprobar desde el {desde.split("-").reverse().join("-")}.
            </p>
        );
    }

    return (
        <div className="no-imprimir flex flex-col gap-3 text-[13px]">
            {criticas > 0 ? (
                <label className="flex max-w-2xl items-start gap-2.5 rounded-xl bg-[var(--critico-bg)] p-3 text-[12.5px]">
                    <input
                        type="checkbox"
                        checked={revisadas}
                        onChange={(e) => setRevisadas(e.target.checked)}
                        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                    />
                    <span>
                        Revisé {criticas === 1 ? "la alerta crítica" : `las ${criticas} alertas críticas`}. Lo que Finova
                        no incluyó lo agregaré a mano al presentar el F29 en el SII.
                    </span>
                </label>
            ) : null}
            <div className="flex flex-wrap items-center gap-2">
                <Boton
                    variante="acento"
                    disabled={enCurso || (criticas > 0 && !revisadas)}
                    onClick={() => ejecutar(() => aprobarF29(periodo, criticas > 0 && revisadas, version))}
                >
                    <Icon name="check" className="size-4" />
                    {enCurso ? "Aprobando…" : "Aprobar propuesta"}
                </Boton>
                <span className="text-[12.5px] text-[var(--foreground-muted)]">
                    Guarda una copia de los montos y quién aprobó. Se puede volver a borrador mientras no se declare.
                </span>
            </div>
            {errores}
        </div>
    );
}
