"use client";

/* ============================================================================
   Popup de "Eliminar" una cuenta: la segunda confirmación.

   Lo que va a pasar depende de la historia de la cuenta, y se dice antes:
   - Sin asientos ni cuentas dentro: se borra.
   - Con asientos (o una agrupación cuyas cuentas ya tienen historia): la ley
     obliga a conservar los libros, así que no se borra; se ofrece
     desactivarla, que exige saldo cero.
   - Una agrupación con cuentas activas dentro: hay que vaciarla primero.
   El backend decide con las mismas reglas (DELETE /cuentas-contables/:id).

   <dialog> nativo con showModal(), como el popup de empresas: atrapa el
   foco, deja inerte el resto de la página y cierra con Escape.
   ========================================================================== */

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import type { CuentaContable } from "@/lib/api";
import { eliminarCuenta } from "./actions";

type DialogoEliminarCuentaProps = {
    readonly cuenta: CuentaContable;
    /** Todas las cuentas: de aquí salen las que tiene dentro. */
    readonly cuentas: readonly CuentaContable[];
    /** Se llama cuando el popup se cierra, por cualquier vía. */
    readonly alCerrar: () => void;
};

export function DialogoEliminarCuenta({ cuenta, cuentas, alCerrar }: DialogoEliminarCuentaProps) {
    const dialogo = useRef<HTMLDialogElement>(null);
    const pulsoFuera = useRef(false);
    const idTitulo = useId();
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    const hijas = cuentas.filter((otra) => otra.id_cuenta_padre === cuenta.id_cuenta);
    const hijasActivas = hijas.filter((hija) => hija.is_active).length;
    const caso =
        hijasActivas > 0 ? "bloqueada" : cuenta.tiene_movimientos || hijas.length > 0 ? "desactivar" : "eliminar";
    const nombre = `${cuenta.codigo} · ${cuenta.nombre}`;

    // Existe mientras se muestra: se abre al montarse.
    useEffect(() => {
        dialogo.current?.showModal();
    }, []);

    function cerrar() {
        dialogo.current?.close();
    }

    function confirmar() {
        setErrores([]);
        iniciar(async () => {
            const resultado = await eliminarCuenta(cuenta.id_cuenta);
            if (resultado.errores) setErrores(resultado.errores);
            else cerrar();
        });
    }

    return (
        // Vive dentro de una celda de la tabla: el texto no hereda su
        // alineación ni su nowrap. Cerrar al pulsar el fondo, como el popup de
        // empresas: el clic en ::backdrop llega al propio <dialog>.
        <dialog
            ref={dialogo}
            aria-labelledby={idTitulo}
            onClose={alCerrar}
            onCancel={(evento) => {
                if (enCurso) evento.preventDefault();
            }}
            onPointerDown={(evento) => {
                pulsoFuera.current = evento.target === evento.currentTarget;
            }}
            onClick={(evento) => {
                if (pulsoFuera.current && evento.target === evento.currentTarget && !enCurso) cerrar();
            }}
            className="m-auto w-[min(28rem,calc(100vw-2rem))] overflow-hidden whitespace-normal rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-0 text-left text-[13.5px] text-[var(--foreground)] shadow-[0_24px_64px_rgb(20_17_15_/_0.28)] backdrop:bg-[rgb(20_17_15_/_0.45)] open:animate-[soft-in_220ms_cubic-bezier(0.16,1,0.3,1)]"
        >
            <div className="flex flex-col gap-3 px-5 pb-4 pt-5">
                <h2
                    id={idTitulo}
                    className={`flex items-start gap-2 font-display text-[17px] font-semibold leading-snug tracking-[-0.015em] ${
                        caso === "eliminar" ? "text-[var(--critico)]" : ""
                    }`}
                >
                    {caso === "eliminar" ? <Icon name="trash" className="mt-0.5 size-[18px] shrink-0" /> : null}
                    <span>
                        {caso === "eliminar"
                            ? `¿Eliminar ${nombre}?`
                            : caso === "desactivar"
                              ? `${nombre} tiene historia`
                              : `Primero vacía ${nombre}`}
                    </span>
                </h2>

                <p className="leading-relaxed text-[var(--foreground-muted)]">
                    {caso === "eliminar"
                        ? `${
                              cuenta.acepta_movimiento
                                  ? "Nunca tuvo asientos: se borra del plan sin perder ningún registro."
                                  : "No tiene cuentas dentro: se borra del plan."
                          } Si la vuelves a necesitar, agrégala desde “Configurar plan de cuentas”.`
                        : caso === "desactivar"
                          ? cuenta.tiene_movimientos
                              ? "Tiene asientos, y los libros contables se conservan (Código de Comercio, arts. 31 y 32): no se puede borrar. Puedes desactivarla: deja de ofrecerse en nuevos asientos, su historia queda intacta y se puede reactivar. Solo se desactiva con saldo cero."
                              : "Sus cuentas tienen historia y siguen en los libros: la agrupación no se borra, se desactiva. Se puede reactivar."
                          : `Tiene ${hijasActivas} ${hijasActivas === 1 ? "cuenta activa" : "cuentas activas"} dentro. Elimínalas o desactívalas primero; después podrás quitar esta agrupación.`}
                </p>

                {errores.length > 0 ? (
                    <ul role="alert" className="grid gap-1 rounded-lg bg-[var(--critico-bg)] px-3 py-2 text-[12.5px] text-[var(--critico)]">
                        {errores.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                ) : null}
            </div>

            <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
                {caso === "bloqueada" ? (
                    <Boton variante="neutro" onClick={cerrar} autoFocus>
                        Entendido
                    </Boton>
                ) : (
                    <>
                        <Boton variante="neutro" onClick={cerrar} disabled={enCurso} autoFocus>
                            Cancelar
                        </Boton>
                        <Boton variante={caso === "eliminar" ? "peligro" : "acento"} onClick={confirmar} disabled={enCurso}>
                            {caso === "eliminar"
                                ? enCurso
                                    ? "Eliminando…"
                                    : "Eliminar"
                                : enCurso
                                  ? "Desactivando…"
                                  : "Desactivar"}
                        </Boton>
                    </>
                )}
            </div>
        </dialog>
    );
}
