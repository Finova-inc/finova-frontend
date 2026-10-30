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
    /** El texto del botón que abre el diálogo; en las filas del libro, la versión corta. */
    readonly etiqueta?: string;
    /** Dentro de una tabla: el diálogo flota bajo el botón en vez de abrirse en la celda y apretar las columnas. */
    readonly flotante?: boolean;
};

const CLASES_CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)]";

export function DialogoRevertir({
    idAsiento,
    comprobante,
    fechaMinima,
    hoy,
    etiqueta = "Revertir asiento",
    flotante = false,
}: DialogoRevertirProps) {
    const idBase = useId();
    const [abierto, setAbierto] = useState(false);
    const [fecha, setFecha] = useState(hoy);
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    const motivoValido = motivo.trim().length >= 3;

    const botonQueAbre = (
        <Boton variante="neutro" onClick={() => setAbierto(true)}>
            <Icon name="undo" className="size-4" />
            {etiqueta}
        </Boton>
    );
    if (!abierto) return botonQueAbre;

    function alConfirmar() {
        setErrores([]);
        iniciar(async () => {
            // Si sale bien, la accion redirige a la reversa recien creada.
            const resultado = await revertirAsiento(idAsiento, fecha, motivo);
            if (resultado.errores) setErrores(resultado.errores);
        });
    }

    const panel = (
        <section
            aria-labelledby={`${idBase}-titulo`}
            className={`rounded-xl border border-[var(--aviso)] p-4 text-[13px] ${
                flotante
                    ? "max-h-full w-full max-w-md overflow-y-auto whitespace-normal bg-[var(--surface)] shadow-xl"
                    : "w-full bg-[var(--aviso-bg)] sm:max-w-md"
            }`}
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

    // Modal fijo: ni el scroll horizontal de la tabla ni sus columnas lo recortan o lo aprietan.
    return flotante ? (
        <>
            {botonQueAbre}
            <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={`${idBase}-titulo`}
                className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                onClick={(evento) => {
                    if (evento.target === evento.currentTarget && !enCurso) setAbierto(false);
                }}
            >
                {panel}
            </div>
        </>
    ) : (
        panel
    );
}
