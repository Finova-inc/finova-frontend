"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import { ROLES } from "@/lib/usuarios";
import { cambiarRolUsuario, quitarAccesoUsuario, type EstadoUsuarios } from "./actions";

/**
 * Rol y acceso de una persona en la empresa. Cambiar el rol o quitar el
 * acceso rige de inmediato: el backend revisa la pertenencia en cada petición.
 * Nadie se quita el acceso a sí mismo, y la empresa nunca queda sin
 * administrador (lo controla el backend; aquí solo se evita ofrecerlo).
 */
export function AccionesMiembro({
    id,
    nombre,
    rol,
    esUnoMismo,
}: {
    readonly id: string;
    readonly nombre: string;
    readonly rol: number;
    readonly esUnoMismo: boolean;
}) {
    const [confirmando, setConfirmando] = useState(false);
    const [estado, setEstado] = useState<EstadoUsuarios>({});
    const [enCurso, iniciar] = useTransition();

    function ejecutar(accion: () => Promise<EstadoUsuarios>) {
        setEstado({});
        iniciar(async () => {
            const r = await accion();
            setEstado(r);
            if (r.ok) setConfirmando(false);
        });
    }

    return (
        <div className="no-imprimir flex flex-col items-end gap-1.5">
            <div className="flex flex-wrap items-center justify-end gap-2">
                <label className="sr-only" htmlFor={`rol-${id}`}>
                    Rol de {nombre}
                </label>
                <select
                    id={`rol-${id}`}
                    value={rol}
                    disabled={enCurso}
                    onChange={(e) => ejecutar(() => cambiarRolUsuario(id, Number(e.target.value)))}
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-2 py-1.5 text-[12.5px]"
                >
                    {ROLES.map((r) => (
                        <option key={r.id} value={r.id}>
                            {r.nombre}
                        </option>
                    ))}
                </select>
                {esUnoMismo ? null : confirmando ? (
                    <>
                        <Boton variante="peligro" disabled={enCurso} onClick={() => ejecutar(() => quitarAccesoUsuario(id))}>
                            {enCurso ? "Quitando…" : "Sí, quitar acceso"}
                        </Boton>
                        <Boton variante="neutro" disabled={enCurso} onClick={() => setConfirmando(false)}>
                            Cancelar
                        </Boton>
                    </>
                ) : (
                    <Boton variante="fantasma" soloIcono aria-label={`Quitar el acceso de ${nombre}`} title="Quitar acceso" disabled={enCurso} onClick={() => setConfirmando(true)}>
                        <Icon name="trash" className="size-4" />
                    </Boton>
                )}
            </div>
            {confirmando ? (
                <p className="max-w-xs text-right text-[11.5px] text-[var(--foreground-muted)]">
                    Deja de entrar a esta empresa desde ya. Su cuenta y todo lo que registró se conservan.
                </p>
            ) : null}
            {estado.errores && estado.errores.length > 0 ? (
                <p role="alert" className="max-w-xs text-right text-[12px] text-[var(--critico)]">
                    {estado.errores.join(" ")}
                </p>
            ) : null}
        </div>
    );
}
