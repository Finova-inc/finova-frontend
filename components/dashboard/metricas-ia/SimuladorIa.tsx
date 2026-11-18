"use client";

import { useState } from "react";
import { formatearCLP } from "@/lib/formato";
import {
    COSTO_ESTIMADO_POR_PREGUNTA_MICRO_USD,
    formatearUsd,
    leerPrecio,
    leerUsuarios,
    PRECIO_PLAN_ESTUDIO_CLP,
    PREGUNTAS_POR_PERFIL,
    preguntasMaximasAlMes,
    simular,
    type Simulacion,
} from "@/lib/metricas-ia";

/* Simulador: ¿cuánto se lleva la IA del ingreso con N usuarios a tal precio?
   Es el único componente cliente de la página: recalcula al escribir. Un
   valor inválido no recalcula; deja el último resultado y avisa junto al campo. */

type Perfil = keyof typeof PREGUNTAS_POR_PERFIL | "maximo";

const CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)]";

const PERFILES: readonly { readonly valor: Perfil; readonly texto: string }[] = [
    { valor: "ligero", texto: "Ligero (5 al día hábil)" },
    { valor: "medio", texto: "Medio (15 al día hábil)" },
    { valor: "intenso", texto: "Intenso (30 al día hábil)" },
    { valor: "maximo", texto: "Máximo (llega al tope todos los días)" },
];

export function SimuladorIa({
    costoPorPreguntaMicroUsd,
    tokensPorPregunta,
    topeDiarioTokens,
    dolar,
}: {
    /** El promedio medido del mes; null si todavía no hay preguntas. */
    readonly costoPorPreguntaMicroUsd: string | null;
    readonly tokensPorPregunta: number;
    readonly topeDiarioTokens: number;
    readonly dolar: string;
}) {
    const costo =
        costoPorPreguntaMicroUsd !== null ? BigInt(costoPorPreguntaMicroUsd) : COSTO_ESTIMADO_POR_PREGUNTA_MICRO_USD;
    const preguntas = (perfil: Perfil) =>
        perfil === "maximo" ? preguntasMaximasAlMes(topeDiarioTokens, tokensPorPregunta) : PREGUNTAS_POR_PERFIL[perfil];
    const calcular = (usuarios: number, perfil: Perfil, precio: bigint): Simulacion =>
        simular({
            usuarios,
            preguntasPorUsuario: preguntas(perfil),
            costoPorPreguntaMicroUsd: costo,
            dolar,
            precioPorUsuarioClp: precio,
        });

    const [usuarios, setUsuarios] = useState("10");
    const [perfil, setPerfil] = useState<Perfil>("medio");
    const [precio, setPrecio] = useState(PRECIO_PLAN_ESTUDIO_CLP.toString());
    const [resultado, setResultado] = useState<Simulacion>(() => calcular(10, "medio", PRECIO_PLAN_ESTUDIO_CLP));

    const usuariosValidos = leerUsuarios(usuarios);
    const precioValido = leerPrecio(precio);

    function recalcular(texto: { usuarios?: string; perfil?: Perfil; precio?: string }) {
        const u = leerUsuarios(texto.usuarios ?? usuarios);
        const p = leerPrecio(texto.precio ?? precio);
        if (u !== null && p !== null) setResultado(calcular(u, texto.perfil ?? perfil, p));
    }

    return (
        <div className="grid gap-4 md:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
            <div className="grid gap-3 sm:grid-cols-3 md:grid-cols-1">
                <div>
                    <label htmlFor="sim-usuarios" className="text-[12px] text-[var(--foreground-muted)]">
                        Usuarios
                    </label>
                    <input
                        id="sim-usuarios"
                        inputMode="numeric"
                        value={usuarios}
                        onChange={(e) => {
                            setUsuarios(e.target.value);
                            recalcular({ usuarios: e.target.value });
                        }}
                        aria-invalid={usuariosValidos === null}
                        aria-describedby="sim-usuarios-ayuda"
                        className={CAMPO}
                    />
                    {usuariosValidos === null && (
                        <p id="sim-usuarios-ayuda" className="mt-1 text-[11.5px] text-[var(--critico)]">
                            Un número entero entre 1 y 10.000.
                        </p>
                    )}
                </div>
                <div>
                    <label htmlFor="sim-perfil" className="text-[12px] text-[var(--foreground-muted)]">
                        Uso del copiloto
                    </label>
                    <select
                        id="sim-perfil"
                        value={perfil}
                        onChange={(e) => {
                            const nuevo = e.target.value as Perfil;
                            setPerfil(nuevo);
                            recalcular({ perfil: nuevo });
                        }}
                        className={CAMPO}
                    >
                        {PERFILES.map((p) => (
                            <option key={p.valor} value={p.valor}>
                                {p.texto}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="sim-precio" className="text-[12px] text-[var(--foreground-muted)]">
                        Precio por usuario al mes (con IVA)
                    </label>
                    <input
                        id="sim-precio"
                        inputMode="numeric"
                        value={precio}
                        onChange={(e) => {
                            setPrecio(e.target.value);
                            recalcular({ precio: e.target.value });
                        }}
                        aria-invalid={precioValido === null}
                        aria-describedby="sim-precio-ayuda"
                        className={CAMPO}
                    />
                    {precioValido === null && (
                        <p id="sim-precio-ayuda" className="mt-1 text-[11.5px] text-[var(--critico)]">
                            Pesos enteros, por ejemplo 49900.
                        </p>
                    )}
                </div>
            </div>

            <dl aria-live="polite" className="grid content-start gap-3 rounded-xl bg-[var(--background-raised)] p-4">
                <div>
                    <dt className="text-[12px] text-[var(--foreground-muted)]">Costo de IA al mes</dt>
                    <dd className="font-display text-[20px] font-semibold tabular-nums">
                        {formatearCLP(resultado.costoIaClp)}
                    </dd>
                </div>
                <div>
                    <dt className="text-[12px] text-[var(--foreground-muted)]">Ingreso neto de IVA</dt>
                    <dd className="font-display text-[20px] font-semibold tabular-nums">
                        {formatearCLP(resultado.ingresoNetoClp)}
                    </dd>
                </div>
                <div>
                    <dt className="text-[12px] text-[var(--foreground-muted)]">La IA se lleva</dt>
                    <dd className="font-display text-[20px] font-semibold tabular-nums">{resultado.porcentajeIa}</dd>
                </div>
                <p className="text-[11.5px] text-[var(--foreground-muted)]">
                    {costoPorPreguntaMicroUsd !== null
                        ? `Con el costo medido este mes: ${formatearUsd(costoPorPreguntaMicroUsd)} por pregunta.`
                        : `Sin preguntas medidas: usa la estimación de ${formatearUsd(
                              COSTO_ESTIMADO_POR_PREGUNTA_MICRO_USD.toString(),
                          )} por pregunta.`}
                </p>
            </dl>
        </div>
    );
}
