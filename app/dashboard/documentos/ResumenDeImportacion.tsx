import { Etiqueta } from "@/components/ui/Etiqueta";
import type { DetalleLineaSii, ImportacionSii } from "@/lib/api";
import { Aviso } from "../core-contable/partes";

/** El formato anterior era un texto "Fila 9: mensaje": se separa para mostrarlo igual que el nuevo. */
function normalizar(linea: DetalleLineaSii | string): DetalleLineaSii {
    if (typeof linea !== "string") return linea;
    const partes = /^Fila (d+): ([sS]*)$/.exec(linea);
    return partes ? { fila: Number(partes[1]), mensaje: partes[2], contenido: "" } : { fila: null, mensaje: linea, contenido: "" };
}

/**
 * Las líneas de un archivo que no se pudieron leer (o que se leyeron con
 * advertencia), una por fila: su número, qué pasó y lo que decía la línea, para
 * encontrarla en el CSV sin adivinar. La fila cuenta los registros: el primero
 * con datos es la 1 y la cabecera no cuenta (en Excel es la fila siguiente).
 */
export function TablaDeLineas({ lineas: crudas, total }: { readonly lineas: readonly (DetalleLineaSii | string)[]; readonly total: number }) {
    if (crudas.length === 0) return null;
    const lineas = crudas.map(normalizar);
    return (
        <div className="mt-2 overflow-hidden rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)]">
            <div className="max-h-[32rem] overflow-auto">
                <table className="w-full min-w-[560px] border-collapse text-left text-[12.5px]">
                    <thead className="sticky top-0 bg-[var(--background-raised)] text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">
                        <tr>
                            <th scope="col" className="w-16 px-3 py-2 text-right">Fila</th>
                            <th scope="col" className="w-[34%] px-3 py-2">Qué pasó</th>
                            <th scope="col" className="px-3 py-2">Lo que decía la línea</th>
                        </tr>
                    </thead>
                    <tbody>
                        {lineas.map((l, i) => (
                            <tr key={`${l.fila ?? "-"}-${i}`} className="border-t border-[var(--border-subtle)] align-top">
                                <td className="tabular px-3 py-2 text-right text-[13px] font-semibold">{l.fila ?? "—"}</td>
                                <td className="px-3 py-2">{l.mensaje}</td>
                                <td className="break-words px-3 py-2 text-[11.5px] text-[var(--foreground-muted)]">{l.contenido || "—"}</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {total > lineas.length ? (
                <p className="border-t border-[var(--border-subtle)] px-3 py-2 text-[12px] text-[var(--foreground-muted)]">
                    Se muestran las primeras {lineas.length} de {total}.
                </p>
            ) : null}
        </div>
    );
}

/** Con título plegable: para las advertencias y para el historial, donde no deben ocupar toda la pantalla. */
export function LineasPlegables({ titulo, lineas, total }: { readonly titulo: string; readonly lineas: readonly (DetalleLineaSii | string)[]; readonly total: number }) {
    // Las advertencias pueden traer un aviso del archivo (codificación) que no cuenta como fila.
    const cuenta = Math.max(total, lineas.length);
    if (cuenta === 0) return null;
    return (
        <details className="mt-2">
            <summary className="cursor-pointer text-[12.5px] font-medium underline-offset-4 hover:underline">
                {titulo} ({cuenta})
            </summary>
            <TablaDeLineas lineas={lineas} total={total} />
        </details>
    );
}

/**
 * Qué pasó con un archivo recién subido: cuántas líneas entraron y, a la vista
 * (no escondidas), las que se rechazaron y por qué.
 */
export function ResumenDeImportacion({ importacion }: { readonly importacion: ImportacionSii }) {
    const { resumen: r } = importacion;
    const hayRechazos = r.con_error > 0;

    return (
        <Aviso tono={hayRechazos ? "aviso" : "neutro"}>
            <p className="flex flex-wrap items-center gap-2 font-medium">
                {importacion.nombre_archivo}
                <Etiqueta tono={hayRechazos ? "aviso" : "positivo"}>{hayRechazos ? "Con líneas rechazadas" : "Completa"}</Etiqueta>
            </p>
            <p className="mt-1">
                Se leyeron <span className="tabular font-semibold">{r.leidos}</span> líneas:{" "}
                <span className="tabular font-semibold">{r.nuevos}</span> nuevas,{" "}
                <span className="tabular font-semibold">{r.actualizados}</span> actualizadas,{" "}
                <span className="tabular font-semibold">{r.omitidos}</span> sin cambios
                {hayRechazos ? (
                    <>
                        , <span className="tabular font-semibold text-[var(--critico)]">{r.con_error}</span> rechazadas
                    </>
                ) : null}
                .
            </p>

            {hayRechazos ? (
                <div className="mt-3">
                    <p className="font-medium">Líneas rechazadas: no se guardaron</p>
                    <p className="text-[12.5px] text-[var(--foreground-muted)]">
                        Corrígelas en el archivo y vuelve a subirlo: lo que ya se guardó no se duplica. La fila cuenta los
                        registros del archivo: la primera línea con datos es la 1 (la cabecera no cuenta).
                    </p>
                    <TablaDeLineas lineas={r.errores} total={r.con_error} />
                </div>
            ) : null}

            <LineasPlegables titulo="Guardadas con advertencia" lineas={r.advertencias} total={r.con_advertencia} />
        </Aviso>
    );
}
