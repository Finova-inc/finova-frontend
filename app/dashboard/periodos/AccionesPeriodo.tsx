"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { abrirMes, cerrarPeriodo, reabrirPeriodo, type EstadoPeriodo } from "./actions";

type AccionesPeriodoProps = {
    /** null: el mes todavía no está abierto. */
    readonly idPeriodo: string | null;
    readonly anio: number;
    readonly mes: number;
    /** "septiembre 2026". */
    readonly nombre: string;
    readonly estado: "abierto" | "cerrado" | "sin-abrir";
    /** Por qué todavía no se puede cerrar (mes en curso, un mes anterior abierto), o null. */
    readonly bloqueoCierre: string | null;
    /** Borradores con fecha de este mes: quedarían sin contabilizar al cerrarlo. */
    readonly borradores: number;
    /** El mes todavía no comienza: no se puede abrir. */
    readonly futuro: boolean;
    /** "1 de noviembre": desde cuándo se podrá abrir un mes futuro. */
    readonly disponibleDesde: string;
    /** Mes de un año anterior: en pantalla se "carga" en vez de "abrirse". */
    readonly esHistoria: boolean;
    /** "enero 2026": el mes cerrado más antiguo posterior a este, o null. */
    readonly cerradoPosterior: string | null;
    /** Administrador o contador: abre y cierra. */
    readonly puedeRegistrar: boolean;
    /** Solo el administrador reabre. */
    readonly puedeReabrir: boolean;
};

/**
 * Abrir, cerrar o reabrir un mes, cada uno con su confirmación en línea.
 *
 * Abrir es inmediato, salvo que el mes quede detrás de meses ya cerrados: ahí
 * se advierte antes. Un mes que todavía no comienza no se abre.
 *
 * Cerrar impide registrar asientos en el mes. Reabrir es más delicado: un mes
 * cerrado suele estar ya declarado en el F29, y registrar algo en él obliga a
 * rectificar. Por eso pide un motivo que queda en la auditoría.
 */
export function AccionesPeriodo({
    idPeriodo,
    anio,
    mes,
    nombre,
    estado,
    bloqueoCierre,
    borradores,
    futuro,
    disponibleDesde,
    esHistoria,
    cerradoPosterior,
    puedeRegistrar,
    puedeReabrir,
}: AccionesPeriodoProps) {
    const idBase = useId();
    const [modo, setModo] = useState<"nada" | "abrir" | "cerrar" | "reabrir">("nada");
    const [motivo, setMotivo] = useState("");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    function ejecutar(accion: () => Promise<EstadoPeriodo>) {
        setErrores([]);
        iniciar(async () => {
            const resultado = await accion();
            if (resultado.errores) setErrores(resultado.errores);
            if (resultado.ok) {
                setModo("nada");
                setMotivo("");
            }
        });
    }

    const listaErrores =
        errores.length > 0 ? (
            <p role="alert" className="text-[12.5px] text-[var(--critico)]">
                {errores.join(" ")}
            </p>
        ) : null;

    if (estado === "sin-abrir") {
        if (futuro) {
            return (
                <p className="text-[12px] text-[var(--foreground-muted)]">Se podrá abrir desde el {disponibleDesde}.</p>
            );
        }
        if (!puedeRegistrar) return null;
        const verbo = esHistoria ? "Cargar" : "Abrir";
        if (modo === "abrir" && cerradoPosterior) {
            return (
                <div className="flex flex-col gap-2">
                    <AvisoMesesCerrados
                        idTitulo={`${idBase}-abrir`}
                        nombre={nombre}
                        cerradoPosterior={cerradoPosterior}
                        verbo={verbo}
                        enCurso={enCurso}
                        onConfirmar={() => ejecutar(() => abrirMes(anio, mes))}
                        onCancelar={() => setModo("nada")}
                    />
                    {listaErrores}
                </div>
            );
        }
        return (
            <div className="flex flex-col gap-2">
                <div>
                    <Boton
                        variante="neutro"
                        disabled={enCurso}
                        onClick={() => (cerradoPosterior ? setModo("abrir") : ejecutar(() => abrirMes(anio, mes)))}
                    >
                        {enCurso ? (esHistoria ? "Cargando…" : "Abriendo…") : `${verbo} mes`}
                    </Boton>
                </div>
                {listaErrores}
            </div>
        );
    }

    if (estado === "abierto") {
        if (!puedeRegistrar || !idPeriodo) return null;
        if (bloqueoCierre) {
            return <p className="text-[12px] text-[var(--foreground-muted)]">{bloqueoCierre}</p>;
        }
        if (modo !== "cerrar") {
            return (
                <div>
                    <Boton variante="neutro" onClick={() => setModo("cerrar")}>
                        Cerrar mes
                    </Boton>
                </div>
            );
        }
        return (
            <div role="alertdialog" aria-labelledby={`${idBase}-cerrar`} className="flex flex-col gap-2 text-[12.5px]">
                <p id={`${idBase}-cerrar`}>
                    ¿Cerrar <span className="capitalize">{nombre}</span>? Desde ahora no se podrán registrar asientos
                    con fechas de ese mes.
                </p>
                {borradores > 0 ? (
                    <p className="rounded-lg bg-[var(--aviso-bg)] px-2.5 py-2">
                        Hay {borradores} {borradores === 1 ? "borrador" : "borradores"} con fecha de este mes: no se
                        podrán contabilizar en él.
                    </p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                    <Boton variante="acento" disabled={enCurso} onClick={() => ejecutar(() => cerrarPeriodo(idPeriodo))}>
                        {enCurso ? "Cerrando…" : "Sí, cerrar"}
                    </Boton>
                    <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("nada")}>
                        Cancelar
                    </Boton>
                </div>
                {listaErrores}
            </div>
        );
    }

    if (!puedeReabrir || !idPeriodo) return null;
    if (modo !== "reabrir") {
        return (
            <div>
                {/* Margen negativo igual al relleno: el texto queda alineado con el de la tarjeta. */}
                <Boton variante="fantasma" className="-ml-3.5" onClick={() => setModo("reabrir")}>
                    Reabrir
                </Boton>
            </div>
        );
    }

    return (
        <div className="flex flex-col gap-2 text-[12.5px]">
            <p>
                Si <span className="capitalize">{nombre}</span> ya se declaró en el F29, registrar cambios en él obliga
                a rectificar la declaración. El motivo queda en la auditoría.
            </p>
            <label htmlFor={`${idBase}-motivo`} className="font-medium text-[var(--foreground-muted)]">
                Motivo de la reapertura
            </label>
            <input
                id={`${idBase}-motivo`}
                value={motivo}
                minLength={10}
                maxLength={255}
                onChange={(evento) => setMotivo(evento.target.value)}
                placeholder="Ej.: factura de proveedor recibida tarde"
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px]"
            />
            <div className="flex flex-wrap gap-2">
                <Boton
                    variante="acento"
                    disabled={enCurso || motivo.trim().length < 10}
                    onClick={() => ejecutar(() => reabrirPeriodo(idPeriodo, motivo))}
                >
                    {enCurso ? "Reabriendo…" : "Reabrir mes"}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={() => setModo("nada")}>
                    Cancelar
                </Boton>
            </div>
            {listaErrores}
        </div>
    );
}

/**
 * Confirmación antes de abrir un mes que queda detrás de meses ya cerrados.
 *
 * No lo impide: cargar historia después de haber cerrado meses es legítimo.
 * Pero lo que se registre ahí cambia los saldos con que parten esos meses (y
 * el remanente de IVA que arrastran), el mismo efecto que tiene una
 * reapertura. Por eso se dice antes de abrir y no después.
 */
export function AvisoMesesCerrados({
    idTitulo,
    nombre,
    cerradoPosterior,
    verbo,
    enCurso,
    onConfirmar,
    onCancelar,
}: {
    readonly idTitulo: string;
    /** "marzo 2025": el mes que se va a abrir. */
    readonly nombre: string;
    /** "enero 2026": el mes cerrado más antiguo posterior a ese. */
    readonly cerradoPosterior: string;
    readonly verbo: "Cargar" | "Abrir";
    readonly enCurso: boolean;
    readonly onConfirmar: () => void;
    readonly onCancelar: () => void;
}) {
    return (
        <div role="alertdialog" aria-labelledby={idTitulo} className="flex flex-col gap-2 text-[12.5px]">
            <p id={idTitulo} className="max-w-xl rounded-lg bg-[var(--aviso-bg)] px-2.5 py-2">
                <span className="capitalize">{nombre}</span> es anterior a meses que ya están cerrados (desde{" "}
                {cerradoPosterior}). Lo que registres en él cambia los saldos con que parten esos meses; si ya se
                declararon, puede obligar a rectificar.
            </p>
            <div className="flex flex-wrap gap-2">
                <Boton variante="acento" disabled={enCurso} onClick={onConfirmar}>
                    {enCurso ? (verbo === "Cargar" ? "Cargando…" : "Abriendo…") : `${verbo} igual`}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={onCancelar}>
                    Cancelar
                </Boton>
            </div>
        </div>
    );
}
