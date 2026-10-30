"use client";

import { useState } from "react";
import { Boton } from "@/components/ui/Boton";

/**
 * Imprime / guarda como PDF la nota completa. Antes avisa qué secciones están
 * vacías o con huecos sin completar; el aviso no impide exportar.
 */
export function BotonExportarNotas({
    vacias,
    conHuecos,
}: {
    readonly vacias: readonly string[];
    readonly conHuecos: readonly string[];
}) {
    const [aviso, setAviso] = useState(false);
    const hayAdvertencias = vacias.length + conHuecos.length > 0;

    return (
        <div className="no-imprimir flex flex-col items-end gap-2">
            <Boton variante="neutro" onClick={() => (hayAdvertencias ? setAviso(true) : window.print())}>
                Exportar a PDF
            </Boton>
            {aviso ? (
                <div role="alert" className="max-w-md rounded-lg border border-[var(--aviso)] bg-[var(--surface)] p-3 text-left text-[12.5px]">
                    <p className="font-semibold">Antes de exportar</p>
                    {vacias.length > 0 ? (
                        <>
                            <p className="mt-1 text-[var(--foreground-muted)]">
                                Sin información (saldrán con la leyenda «Sin información registrada por la empresa»):
                            </p>
                            <ul className="list-disc pl-5">
                                {vacias.map((titulo) => (
                                    <li key={titulo}>{titulo}</li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                    {conHuecos.length > 0 ? (
                        <>
                            <p className="mt-1 text-[var(--foreground-muted)]">Con huecos [entre corchetes] sin completar:</p>
                            <ul className="list-disc pl-5">
                                {conHuecos.map((titulo) => (
                                    <li key={titulo}>{titulo}</li>
                                ))}
                            </ul>
                        </>
                    ) : null}
                    <div className="mt-3 flex gap-2">
                        <Boton
                            variante="acento"
                            onClick={() => {
                                setAviso(false);
                                window.print();
                            }}
                        >
                            Exportar de todos modos
                        </Boton>
                        <Boton variante="fantasma" onClick={() => setAviso(false)}>
                            Volver a editar
                        </Boton>
                    </div>
                </div>
            ) : null}
        </div>
    );
}
