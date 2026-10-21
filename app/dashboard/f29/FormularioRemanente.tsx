"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { formatearCLP } from "@/lib/formato";
import { aPesosEnteros, nombreDelMes, reajustar } from "@/lib/f29";
import { guardarRemanenteF29, type EstadoF29 } from "./actions";

const CLASES_CAMPO =
    "tabular w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)]";

/** "69751" → "69.751" para mostrarlo en el campo; vacío si no hay valor. */
const conPuntos = (valor: string | null) => (valor ? BigInt(valor).toLocaleString("es-CL") : "");

/**
 * Remanente de crédito fiscal del mes anterior (código 504).
 *
 * Art. 27 del DL 825: el remanente se convierte a UTM del mes en que se
 * produjo y se reconvierte a la UTM del mes en que se usa. El contador
 * escribe las dos UTM (las publica el SII) y Finova calcula el reajuste; sin
 * UTM, el remanente entra tal cual.
 */
export function FormularioRemanente({
    periodo,
    periodoAnterior,
    inicial,
    sugerido,
    version,
}: {
    readonly periodo: string;
    readonly periodoAnterior: string;
    readonly inicial: { readonly remanente: string; readonly utmAnterior: string | null; readonly utmActual: string | null };
    /** El 77 del F29 aprobado del mes anterior, si Finova lo tiene. */
    readonly sugerido: string | null;
    readonly version?: number;
}) {
    const id = useId();
    const [remanente, setRemanente] = useState(conPuntos(inicial.remanente === "0" ? null : inicial.remanente));
    const [utmAnterior, setUtmAnterior] = useState(conPuntos(inicial.utmAnterior));
    const [utmActual, setUtmActual] = useState(conPuntos(inicial.utmActual));
    const [estado, setEstado] = useState<EstadoF29>({});
    const [enCurso, iniciar] = useTransition();

    const montoRemanente = aPesosEnteros(remanente);
    const reajustado = reajustar(montoRemanente || "0", aPesosEnteros(utmAnterior) ?? "", aPesosEnteros(utmActual) ?? "");

    function guardar(evento: FormEvent) {
        evento.preventDefault();
        setEstado({});
        iniciar(async () => setEstado(await guardarRemanenteF29(periodo, { remanente, utmAnterior, utmActual, version })));
    }

    const mesAnterior = nombreDelMes(periodoAnterior);
    const mesActual = nombreDelMes(periodo);

    return (
        <form onSubmit={guardar} className="no-imprimir flex flex-col gap-3 text-[13px]">
            <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-rem`} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                        Remanente de {mesAnterior} (código 77)
                    </label>
                    <input
                        id={`${id}-rem`}
                        inputMode="numeric"
                        placeholder="0"
                        value={remanente}
                        onChange={(e) => setRemanente(e.target.value)}
                        className={CLASES_CAMPO}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-utm-ant`} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                        UTM de {mesAnterior}
                    </label>
                    <input
                        id={`${id}-utm-ant`}
                        inputMode="numeric"
                        placeholder="Ej.: 69.751"
                        value={utmAnterior}
                        onChange={(e) => setUtmAnterior(e.target.value)}
                        className={CLASES_CAMPO}
                    />
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${id}-utm-act`} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                        UTM de {mesActual}
                    </label>
                    <input
                        id={`${id}-utm-act`}
                        inputMode="numeric"
                        placeholder="Ej.: 69.889"
                        value={utmActual}
                        onChange={(e) => setUtmActual(e.target.value)}
                        className={CLASES_CAMPO}
                    />
                </div>
            </div>

            <p className="text-[12.5px] text-[var(--foreground-muted)]">
                {sugerido !== null ? (
                    <>
                        El F29 aprobado de {mesAnterior} dejó un remanente de{" "}
                        <span className="tabular font-medium text-[var(--foreground)]">{formatearCLP(sugerido)}</span>.{" "}
                    </>
                ) : null}
                {montoRemanente === null ? (
                    <span className="text-[var(--critico)]">El remanente tiene que ser un monto en pesos, sin decimales.</span>
                ) : reajustado !== null ? (
                    <>
                        Reajustado por la UTM, entra al código 504 como{" "}
                        <span className="tabular font-semibold text-[var(--foreground)]">{formatearCLP(reajustado)}</span>.
                    </>
                ) : (
                    <>Con la UTM de los dos meses (las publica el SII), Finova calcula el reajuste del art. 27 del DL 825.</>
                )}
            </p>

            <div className="flex flex-wrap items-center gap-2">
                <Boton type="submit" variante="neutro" disabled={enCurso}>
                    {enCurso ? "Guardando…" : "Guardar remanente"}
                </Boton>
                {estado.ok ? <span className="text-[12.5px] text-[var(--positivo)]">Guardado. La propuesta se recalculó.</span> : null}
            </div>
            {estado.errores && estado.errores.length > 0 ? (
                <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                    {estado.errores.join(" ")}
                </p>
            ) : null}
        </form>
    );
}
