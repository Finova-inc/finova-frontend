import { Etiqueta } from "@/components/ui/Etiqueta";
import type { ImportacionSii } from "@/lib/api";
import { formatearFechaLarga, nombrePeriodo } from "@/lib/formato";
import { IMPORTABLES } from "@/lib/sii";
import { LineasPlegables } from "./ResumenDeImportacion";

/** Los archivos que se han subido, una línea cada uno; los problemas se abren aparte. */
export function Historial({ importaciones }: { readonly importaciones: readonly ImportacionSii[] }) {
    if (importaciones.length === 0) {
        return <p className="text-[13px] text-[var(--foreground-muted)]">Todavía no se ha importado ningún archivo.</p>;
    }
    return (
        <ul className="flex flex-col">
            {importaciones.map((i) => {
                const r = i.resumen;
                return (
                    <li key={i.id_importacion} className="border-b border-[var(--border-subtle)] py-2.5 first:pt-0 last:border-0 last:pb-0">
                        <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px]">
                            <span className="font-medium">{i.nombre_archivo}</span>
                            <Etiqueta tono={i.estado === "con_errores" ? "aviso" : "positivo"}>
                                {i.estado === "con_errores" ? `${r.con_error} rechazadas` : "Completa"}
                            </Etiqueta>
                        </p>
                        <p className="mt-0.5 text-[12px] text-[var(--foreground-muted)]">
                            {formatearFechaLarga(i.created_at)} · {IMPORTABLES.find((x) => x.id === i.tipo)?.etiqueta ?? i.tipo}
                            {i.periodo ? ` · ${nombrePeriodo(Number(i.periodo.slice(0, 4)), Number(i.periodo.slice(5)))}` : ""}
                            {" · "}
                            <span className="tabular">{r.nuevos}</span> nuevas, <span className="tabular">{r.actualizados}</span> actualizadas,{" "}
                            <span className="tabular">{r.omitidos}</span> sin cambios
                        </p>
                        <LineasPlegables titulo="Líneas rechazadas" lineas={r.errores} total={r.con_error} />
                        <LineasPlegables titulo="Advertencias" lineas={r.advertencias} total={r.con_advertencia} />
                    </li>
                );
            })}
        </ul>
    );
}
