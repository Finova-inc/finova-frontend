"use client";

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import type { ClaveTexto, DatosGenerales } from "@/lib/api";
import { guardarDatosEjercicio, guardarTextoNota, type EstadoNota } from "./actions";

const CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)]";

/** Editor de una sección de texto: guardar y estado "guardado" / "sin guardar". */
export function EditorNota({
    ejercicio,
    clave,
    numero,
    titulo,
    guardado,
    plantilla,
}: {
    readonly ejercicio: number;
    readonly clave: ClaveTexto;
    readonly numero: number;
    readonly titulo: string;
    /** null = nunca guardada: el editor parte de la plantilla como borrador. */
    readonly guardado: string | null;
    readonly plantilla: string;
}) {
    const [texto, setTexto] = useState(guardado ?? plantilla);
    const [base, setBase] = useState(guardado);
    const [estado, setEstado] = useState<EstadoNota>({});
    const [enCurso, iniciar] = useTransition();
    const sinGuardar = texto !== base;

    function guardar() {
        iniciar(async () => {
            const resultado = await guardarTextoNota(ejercicio, clave, texto);
            setEstado(resultado);
            if (resultado.ok) setBase(texto);
        });
    }

    return (
        <section id={`editar-${clave}`} className="flex flex-col gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
            <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-display text-[14px] font-semibold">
                    Nota {numero} · {titulo}
                </h3>
                {sinGuardar ? (
                    <Etiqueta tono="aviso">Sin guardar</Etiqueta>
                ) : base === null ? (
                    <Etiqueta tono="neutro">Borrador sin guardar</Etiqueta>
                ) : (
                    <Etiqueta tono="positivo">Guardado</Etiqueta>
                )}
            </div>
            <textarea
                aria-label={titulo}
                value={texto}
                onChange={(evento) => {
                    setTexto(evento.target.value);
                    setEstado({});
                }}
                rows={Math.min(14, Math.max(4, texto.split("\n").length + 1))}
                maxLength={20000}
                className={CAMPO}
            />
            <p className="text-[12px] text-[var(--foreground-muted)]">
                Completa o borra los huecos [entre corchetes]. Puedes dejarla vacía: saldrá con la leyenda «Sin información registrada por la
                empresa».
            </p>
            {estado.errores ? (
                <ul role="alert" className="rounded-lg bg-[var(--critico-bg)] p-3 text-[12.5px] text-[var(--critico)]">
                    {estado.errores.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            ) : null}
            <div>
                <Boton variante="neutro" onClick={guardar} disabled={enCurso || !sinGuardar}>
                    {enCurso ? "Guardando…" : "Guardar"}
                </Boton>
            </div>
        </section>
    );
}

/** Giro, domicilio y fecha de autorización de los estados: lo que la nota general no puede sacar del libro. */
export function EditorGeneral({ ejercicio, datos }: { readonly ejercicio: number; readonly datos: DatosGenerales }) {
    const [giro, setGiro] = useState(datos.giro ?? "");
    const [domicilio, setDomicilio] = useState(datos.domicilio ?? "");
    const [fecha, setFecha] = useState(datos.fecha_autorizacion ?? "");
    const [estado, setEstado] = useState<EstadoNota>({});
    const [enCurso, iniciar] = useTransition();

    function guardar() {
        iniciar(async () => {
            setEstado(
                await guardarDatosEjercicio(ejercicio, {
                    giro: giro.trim() || null,
                    domicilio: domicilio.trim() || null,
                    fecha_autorizacion: fecha || null,
                }),
            );
        });
    }

    return (
        <section id="editar-general" className="flex flex-col gap-3 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-4">
            <h3 className="font-display text-[14px] font-semibold">Nota 1 · Información general</h3>
            <p className="text-[12px] text-[var(--foreground-muted)]">
                La razón social ({datos.razon_social}) y el RUT ({datos.rut}) salen de la empresa. Lo demás se completa por ejercicio.
            </p>
            <div className="grid gap-3 sm:grid-cols-2">
                <label className="flex flex-col gap-1 text-[12.5px] font-medium text-[var(--foreground-muted)]">
                    Giro
                    <input value={giro} onChange={(e) => setGiro(e.target.value)} maxLength={200} className={CAMPO} />
                </label>
                <label className="flex flex-col gap-1 text-[12.5px] font-medium text-[var(--foreground-muted)]">
                    Fecha de autorización de los estados
                    <input type="date" value={fecha} onChange={(e) => setFecha(e.target.value)} className={`tabular ${CAMPO}`} />
                </label>
                <label className="flex flex-col gap-1 text-[12.5px] font-medium text-[var(--foreground-muted)] sm:col-span-2">
                    Domicilio
                    <input value={domicilio} onChange={(e) => setDomicilio(e.target.value)} maxLength={250} className={CAMPO} />
                </label>
            </div>
            {estado.errores ? (
                <ul role="alert" className="rounded-lg bg-[var(--critico-bg)] p-3 text-[12.5px] text-[var(--critico)]">
                    {estado.errores.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            ) : null}
            <div className="flex items-center gap-3">
                <Boton variante="neutro" onClick={guardar} disabled={enCurso}>
                    {enCurso ? "Guardando…" : "Guardar"}
                </Boton>
                {estado.ok ? <Etiqueta tono="positivo">Guardado</Etiqueta> : null}
            </div>
        </section>
    );
}
