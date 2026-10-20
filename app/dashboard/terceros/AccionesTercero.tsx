"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import type { Tercero } from "@/lib/api";
import { cambiarEstadoTercero, darDeBajaTercero, type EstadoTercero } from "./actions";
import { FormularioTercero } from "./FormularioTercero";

/**
 * Lo que se puede hacer con un tercero desde su ficha.
 *
 * Desactivar y dar de baja son cosas distintas, y la pantalla lo dice:
 *   - Desactivar lo saca de los asientos nuevos y se deshace con un clic.
 *   - Dar de baja es la supresión de la Ley 21.719: deja de aparecer en
 *     Finova, pero sus documentos y asientos se conservan, porque la ley
 *     tributaria obliga a guardarlos. Si después se vuelve a registrar el
 *     mismo RUT, se recupera con su historia.
 */
export function AccionesTercero({
    tercero,
    rutBloqueado,
    puedeRegistrar,
}: {
    readonly tercero: Tercero;
    /** Tiene documentos o asientos: su RUT ya no se puede cambiar. */
    readonly rutBloqueado: boolean;
    /** Administrador o contador. */
    readonly puedeRegistrar: boolean;
}) {
    const idBase = useId();
    const [modo, setModo] = useState<"nada" | "editar" | "baja">("nada");
    const [estado, setEstado] = useState<EstadoTercero>({});
    const [enCurso, iniciar] = useTransition();
    const esNatural = tercero.tipo_persona === "N";

    function ejecutar(accion: () => Promise<EstadoTercero>) {
        setEstado({});
        iniciar(async () => {
            const resultado = await accion();
            setEstado(resultado);
            if (resultado.ok) setModo("nada");
        });
    }

    const errores =
        estado.errores && estado.errores.length > 0 ? (
            <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                {estado.errores.join(" ")}
            </p>
        ) : null;

    if (modo === "editar") {
        return (
            <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-5">
                <h2 className="mb-4 font-display text-sm font-semibold">Editar tercero</h2>
                <FormularioTercero
                    modo="editar"
                    idTercero={tercero.id_tercero}
                    rutBloqueado={rutBloqueado}
                    inicial={tercero}
                    onListo={() => setModo("nada")}
                    onCancelar={() => setModo("nada")}
                />
            </div>
        );
    }

    return (
        <div className="no-imprimir flex flex-col gap-3">
            <div className="flex flex-wrap gap-2">
                {puedeRegistrar ? (
                    <>
                        <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("editar")}>
                            <Icon name="pencil" className="size-4" />
                            Editar
                        </Boton>
                        <Boton
                            variante="neutro"
                            disabled={enCurso}
                            onClick={() => ejecutar(() => cambiarEstadoTercero(tercero.id_tercero, !tercero.is_active))}
                        >
                            {enCurso && modo === "nada"
                                ? "Guardando…"
                                : tercero.is_active
                                  ? "Desactivar"
                                  : "Reactivar"}
                        </Boton>
                    </>
                ) : null}
                {esNatural ? (
                    // Enlace y no fetch: el navegador descarga el archivo que arma el
                    // route handler, y el token nunca pasa por el JavaScript de la página.
                    <a
                        href={`/dashboard/terceros/${tercero.id_tercero}/datos-personales`}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] transition-colors hover:bg-[var(--background-raised)]"
                    >
                        <Icon name="document" className="size-4" />
                        Exportar datos personales
                    </a>
                ) : null}
                {puedeRegistrar ? (
                    <Boton variante="fantasma" disabled={enCurso} onClick={() => setModo("baja")}>
                        <Icon name="trash" className="size-4" />
                        Dar de baja
                    </Boton>
                ) : null}
            </div>

            {modo === "baja" ? (
                <div
                    role="alertdialog"
                    aria-labelledby={`${idBase}-baja`}
                    className="flex max-w-2xl flex-col gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-4 text-[13px]"
                >
                    <p id={`${idBase}-baja`} className="font-medium">
                        ¿Dar de baja a {tercero.razon_social}?
                    </p>
                    <ul className="flex list-disc flex-col gap-1 pl-5 text-[12.5px] text-[var(--foreground-muted)]">
                        <li>Deja de aparecer en Terceros y en los asientos nuevos.</li>
                        <li>
                            Sus documentos y asientos se conservan: la ley tributaria obliga a guardarlos, y es la base
                            legal para mantenerlos aunque se pida suprimir los datos (Ley 21.719).
                        </li>
                        <li>Si más adelante registras el mismo RUT, se recupera con toda su historia.</li>
                        <li>Si solo quieres dejar de usarlo por un tiempo, es mejor desactivarlo.</li>
                    </ul>
                    <div className="flex flex-wrap gap-2">
                        <Boton variante="peligro" disabled={enCurso} onClick={() => ejecutar(() => darDeBajaTercero(tercero.id_tercero))}>
                            {enCurso ? "Dando de baja…" : "Sí, dar de baja"}
                        </Boton>
                        <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("nada")}>
                            Cancelar
                        </Boton>
                    </div>
                </div>
            ) : null}

            {errores}
        </div>
    );
}
