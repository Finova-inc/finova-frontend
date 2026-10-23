"use client";

import { useId, useState, useTransition, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import { formatearRutAlEscribir } from "@/lib/formato";
import { ROLES } from "@/lib/usuarios";
import { agregarUsuario, type EstadoUsuarios } from "./actions";

const CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13.5px] text-[var(--foreground)]";
const ETIQUETA = "flex flex-col gap-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)]";

/**
 * Dar acceso a la empresa a una persona.
 *
 * El RUT es la credencial del login y es único en Finova. Si la persona ya
 * tiene cuenta (por ejemplo, un contador que lleva otras empresas), basta su
 * RUT y el rol: entra con su contraseña de siempre. Si no la tiene, se crea
 * con nombre, correo y una contraseña inicial que el administrador le entrega.
 */
export function FormularioUsuario() {
    const id = useId();
    const [rut, setRut] = useState("");
    const [rol, setRol] = useState(2);
    const [nombre, setNombre] = useState("");
    const [correo, setCorreo] = useState("");
    const [password, setPassword] = useState("");
    const [estado, setEstado] = useState<EstadoUsuarios>({});
    const [enviando, iniciar] = useTransition();

    function enviar(evento: FormEvent) {
        evento.preventDefault();
        setEstado({});
        iniciar(async () => {
            const r = await agregarUsuario({ rut, id_rol: rol, nombre_completo: nombre, correo, password });
            setEstado(r);
            if (r.ok) {
                setRut("");
                setNombre("");
                setCorreo("");
                setPassword("");
            }
        });
    }

    return (
        <form onSubmit={enviar} className="flex flex-col gap-4">
            <div className="grid gap-3 sm:grid-cols-2">
                <label className={ETIQUETA}>
                    RUT
                    <input
                        required
                        value={rut}
                        onChange={(e) => setRut(formatearRutAlEscribir(e.target.value))}
                        placeholder="12.345.678-9"
                        className={`tabular ${CAMPO}`}
                    />
                </label>
                <label className={ETIQUETA}>
                    Rol en esta empresa
                    <select value={rol} onChange={(e) => setRol(Number(e.target.value))} className={CAMPO}>
                        {ROLES.map((r) => (
                            <option key={r.id} value={r.id}>
                                {r.nombre}
                            </option>
                        ))}
                    </select>
                    <span className="font-normal">{ROLES.find((r) => r.id === rol)?.permite}</span>
                </label>
            </div>

            <fieldset className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] p-4">
                <legend className="px-1 text-[12.5px] font-medium">Solo si el RUT todavía no tiene cuenta en Finova</legend>
                <div className="grid gap-3 sm:grid-cols-3">
                    <label className={ETIQUETA}>
                        Nombre completo
                        <input value={nombre} onChange={(e) => setNombre(e.target.value)} maxLength={150} className={CAMPO} />
                    </label>
                    <label className={ETIQUETA}>
                        Correo
                        <input type="email" value={correo} onChange={(e) => setCorreo(e.target.value)} maxLength={150} className={CAMPO} />
                    </label>
                    <label className={ETIQUETA} htmlFor={`${id}-clave`}>
                        Contraseña inicial
                        <input
                            id={`${id}-clave`}
                            type="password"
                            autoComplete="new-password"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            maxLength={128}
                            className={CAMPO}
                        />
                    </label>
                </div>
                <p className="text-[12px] text-[var(--foreground-muted)]">
                    Mínimo 12 caracteres, con mayúscula, minúscula, número y símbolo. Entrégasela a la persona por un
                    canal seguro. Si su RUT ya tiene cuenta, estos campos se ignoran y entra con su contraseña de siempre.
                </p>
            </fieldset>

            <div className="flex flex-wrap items-center gap-3">
                <Boton type="submit" variante="acento" disabled={enviando}>
                    {enviando ? "Agregando…" : "Dar acceso"}
                </Boton>
                {estado.ok ? (
                    <span role="status" className="text-[12.5px] text-[var(--positivo)]">
                        {estado.ok}
                    </span>
                ) : null}
            </div>
            {estado.errores && estado.errores.length > 0 ? (
                <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                    {estado.errores.join(" ")}
                </p>
            ) : null}
        </form>
    );
}
