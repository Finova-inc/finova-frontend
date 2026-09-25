"use client";

/* ============================================================================
   Revertir un asiento contabilizado.

   Art. 32 del Codigo de Comercio: los errores "se salvaran en otro nuevo
   [asiento] en la fecha en que se notare la falta". Por eso la fecha propuesta
   es hoy y el original no se toca: queda en el libro, enlazado a su reversa.
   ========================================================================== */

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import { revertirAsiento } from "./actions";

type DialogoRevertirProps = {
    readonly idAsiento: string;
    /** "I-5 / 2026", para que la persona sepa que esta revirtiendo. */
    readonly comprobante: string;
    /** La reversa no puede ser anterior al asiento que corrige. */
    readonly fechaMinima: string;
    readonly hoy: string;
};

const CLASES_CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)]";

export function DialogoRevertir({ idAsiento, comprobante, fechaMinima, hoy }: DialogoRevertirProps) {
    const idBase = useId();
    const [abierto, setAbierto] = useState(false);
    const [fecha, setFecha] = useState(hoy);
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    const motivoValido = motivo.trim().length >= 3;

    if (!abierto) {
        return (
            <Boton variante="neutro" onClick={() => setAbierto(true)}>
                <Icon name="undo" className="size-4" />
                Revertir asiento
            </Boton>
        );
    }

    function alConfirmar() {
        setErrores([]);
        iniciar(async () => {
            // Si sale bien, la accion redirige a la reversa recien creada.
            const resultado = await revertirAsiento(idAsiento, fecha, motivo);
            if (resultado.errores) setErrores(resultado.errores);
        });
    }

    return (
        <section
            aria-labelledby={`${idBase}-titulo`}
            className="w-full rounded-xl border border-[var(--aviso)] bg-[var(--aviso-bg)] p-4 text-[13px] sm:max-w-md"
        >
            <h2 id={`${idBase}-titulo`} className="font-semibold text-[var(--foreground)]">
                Revertir {comprobante}
            </h2>
            <p className="mt-1 text-[var(--foreground-muted)]">
                Se registrará un traspaso con los mismos montos en las columnas contrarias, que anula el
                efecto de este asiento. El original no se modifica: los dos quedan en el libro, enlazados.
            </p>

            <div className="mt-3 grid gap-3">
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${idBase}-fecha`} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                        Fecha de la reversa
                    </label>
                    <input
                        id={`${idBase}-fecha`}
                        type="date"
                        min={fechaMinima}
                        max={hoy}
                        value={fecha}
                        onChange={(evento) => setFecha(evento.target.value)}
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                    <span className="text-[11.5px] text-[var(--foreground-muted)]">
                        Por norma, la fecha en que se detectó el error. Tiene que caer en un período abierto.
                    </span>
                </div>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor={`${idBase}-motivo`} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                        Motivo
                    </label>
                    <input
                        id={`${idBase}-motivo`}
                        required
                        minLength={3}
                        maxLength={80}
                        value={motivo}
                        onChange={(evento) => setMotivo(evento.target.value)}
                        placeholder="Ej.: cuenta de gasto equivocada"
                        className={CLASES_CAMPO}
                    />
                </div>
            </div>

            {errores.length > 0 ? (
                <ul role="alert" className="mt-3 list-disc pl-5 text-[var(--critico)]">
                    {errores.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            ) : null}

            <div className="mt-4 flex flex-wrap gap-2">
                <Boton variante="acento" disabled={enCurso || !motivoValido} onClick={alConfirmar}>
                    {enCurso ? "Revirtiendo…" : "Registrar reversa"}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={() => setAbierto(false)}>
                    Cancelar
                </Boton>
            </div>
        </section>
    );
}
