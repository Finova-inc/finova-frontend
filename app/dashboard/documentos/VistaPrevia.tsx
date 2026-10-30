import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import type { VistaPreviaSii } from "@/lib/api";
import { nombrePeriodo } from "@/lib/formato";
import { Aviso } from "../core-contable/partes";
import { LineasPlegables, TablaDeLineas } from "./ResumenDeImportacion";

function Cifra({ titulo, valor, tono = "normal", nota }: { readonly titulo: string; readonly valor: number | string; readonly tono?: "normal" | "malo" | "aviso"; readonly nota?: string }) {
    const color = tono === "malo" ? "text-[var(--critico)]" : tono === "aviso" ? "text-[var(--aviso)]" : "";
    return (
        <div className="rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] px-3.5 py-2.5">
            <p className="text-[11.5px] font-medium text-[var(--foreground-muted)]">{titulo}</p>
            <p className={`tabular font-display text-[18px] font-semibold ${color}`}>{valor}</p>
            {nota ? <p className="text-[11px] text-[var(--foreground-muted)]">{nota}</p> : null}
        </div>
    );
}

/**
 * Lo que pasaría si se importa el archivo, antes de guardar nada: cuántas
 * líneas entran, cuáles se rechazarían (con su fila y su contenido), los totales
 * del archivo para compararlos con el portal del SII, y cómo se leyeron las
 * primeras líneas. Recién aquí se decide importar.
 */
export function VistaPrevia({
    vista,
    importando,
    onImportar,
    onCancelar,
    onUsarPeriodo,
}: {
    readonly vista: VistaPreviaSii;
    readonly importando: boolean;
    readonly onImportar: () => void;
    readonly onCancelar: () => void;
    /** Cambia el período del formulario al que sugieren las fechas del archivo. */
    readonly onUsarPeriodo: (periodo: string) => void;
}) {
    const r = vista.resumen;
    // Los DTE se cuentan en documentos (masculino); las filas de un CSV, en líneas (femenino).
    const dte = vista.tipo === "xml";
    const unidad = dte ? "documentos" : "líneas";
    const validos = dte ? "válidos" : "válidas";
    const validas = r.nuevos + r.actualizados + r.omitidos;
    const hayRechazos = r.con_error > 0;
    const sinNada = validas === 0;
    const soloSinCambios = !sinNada && r.nuevos === 0 && r.actualizados === 0;

    return (
        <section aria-label="Revisión del archivo" className="rounded-xl border border-[var(--accent)] bg-[var(--surface)] p-4">
            <p className="flex flex-wrap items-center gap-2 font-medium">
                Revisión de {vista.nombre_archivo}
                <Etiqueta tono="neutro">Todavía no se guardó nada</Etiqueta>
            </p>

            <div className="mt-3 grid grid-cols-2 gap-3 lg:grid-cols-4">
                <Cifra titulo={dte ? "Documentos leídos" : "Líneas leídas"} valor={r.leidos} />
                <Cifra
                    titulo="Se importarían"
                    valor={validas}
                    nota={`${r.nuevos} nuevas · ${r.actualizados} se actualizan · ${r.omitidos} sin cambios`}
                />
                <Cifra titulo="Se rechazan" valor={r.con_error} tono={hayRechazos ? "malo" : "normal"} nota={hayRechazos ? "No se guardarían" : "Ninguna"} />
                <Cifra titulo="Con advertencia" valor={r.con_advertencia} tono={r.con_advertencia > 0 ? "aviso" : "normal"} nota={r.con_advertencia > 0 ? "Se guardan; conviene revisarlas" : "Ninguna"} />
            </div>

            {vista.avisos.map((aviso) => (
                <div key={aviso} className="mt-3">
                    <Aviso tono="aviso">
                        <p className="font-medium">Revisa esto antes de importar</p>
                        <p>{aviso}</p>
                        {vista.periodo_sugerido ? (
                            <Boton variante="neutro" className="mt-2" onClick={() => onUsarPeriodo(vista.periodo_sugerido as string)}>
                                Usar {nombrePeriodo(Number(vista.periodo_sugerido.slice(0, 4)), Number(vista.periodo_sugerido.slice(5)))}
                            </Boton>
                        ) : null}
                    </Aviso>
                </div>
            ))}

            {vista.totales.length > 0 ? (
                <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-[12.5px]">
                    {vista.totales.map((t) => (
                        <div key={t.titulo} className="flex gap-1.5">
                            <dt className="text-[var(--foreground-muted)]">{t.titulo}:</dt>
                            <dd className="tabular font-semibold">{t.valor}</dd>
                        </div>
                    ))}
                </dl>
            ) : null}

            {hayRechazos ? (
                <div className="mt-4">
                    <p className="font-medium text-[var(--critico)]">{dte ? "Estos documentos" : "Estas líneas"} se rechazarían</p>
                    <p className="text-[12.5px] text-[var(--foreground-muted)]">
                        Puedes importar el resto ahora, o corregirlas en el archivo y revisarlo de nuevo. La fila cuenta los
                        registros del archivo: la primera línea con datos es la 1 (la cabecera no cuenta).
                    </p>
                    <TablaDeLineas lineas={r.errores} total={r.con_error} />
                </div>
            ) : null}

            <LineasPlegables titulo="Se guardarían con advertencia" lineas={r.advertencias} total={r.con_advertencia} />

            {vista.muestra.filas.length > 0 ? (
                <details className="mt-2">
                    <summary className="cursor-pointer text-[12.5px] font-medium underline-offset-4 hover:underline">
                        Cómo se leyeron {dte ? "los" : "las"} {vista.muestra.total} {unidad} {validos}
                    </summary>
                    <div className="mt-2 max-h-[32rem] overflow-auto rounded-lg border border-[var(--border-subtle)]">
                        <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
                            <thead className="sticky top-0 bg-[var(--background-raised)] text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">
                                <tr>
                                    {vista.muestra.columnas.map((c) => (
                                        <th key={c} scope="col" className="px-3 py-2">
                                            {c}
                                        </th>
                                    ))}
                                </tr>
                            </thead>
                            <tbody>
                                {vista.muestra.filas.map((fila, i) => (
                                    <tr key={i} className="border-t border-[var(--border-subtle)]">
                                        {fila.map((celda, j) => (
                                            <td key={j} className="tabular px-3 py-1.5">
                                                {celda}
                                            </td>
                                        ))}
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {vista.muestra.filas.length < vista.muestra.total ? (
                        <p className="mt-1.5 text-[12px] text-[var(--foreground-muted)]">
                            Se muestran las primeras {vista.muestra.filas.length} de {vista.muestra.total}; todas se importarían.
                        </p>
                    ) : null}
                </details>
            ) : null}

            <div className="mt-4 flex flex-wrap items-center gap-3 border-t border-[var(--border-subtle)] pt-4">
                <Boton variante="acento" onClick={onImportar} disabled={importando || sinNada}>
                    {importando
                        ? "Importando…"
                        : sinNada
                          ? "No hay nada que importar"
                          : soloSinCambios
                            ? `Importar de todos modos (${validas} sin cambios)`
                            : hayRechazos
                              ? `Importar ${dte ? "los" : "las"} ${validas} ${unidad} ${validos}`
                              : `Importar ${validas} ${unidad}`}
                </Boton>
                <Boton onClick={onCancelar} disabled={importando}>
                    Cancelar
                </Boton>
                {sinNada ? (
                    <span className="text-[12.5px] text-[var(--foreground-muted)]">Ninguna línea se pudo leer: revisa que sea el archivo correcto.</span>
                ) : hayRechazos ? (
                    <span className="text-[12.5px] text-[var(--foreground-muted)]">Las {r.con_error} rechazadas no se guardarán.</span>
                ) : null}
            </div>
        </section>
    );
}
