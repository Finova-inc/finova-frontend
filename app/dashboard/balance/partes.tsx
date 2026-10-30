/* Piezas comunes de los reportes del módulo Balance: el período de la URL y su selector. */

import Link from "next/link";
import { notasEeffApi } from "@/lib/api";
import { hoyEnChile, nombreMesLargo } from "@/lib/formato";
import { numeroPorRubro } from "@/lib/notas";

export type Parametros = Record<string, string | string[] | undefined>;

export const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)]";

function numero(parametros: Parametros, clave: string, min: number, max: number): number | undefined {
    const valor = Number(parametros[clave]);
    return Number.isInteger(valor) && valor >= min && valor <= max ? valor : undefined;
}

/** Ejercicio y meses de la URL; por defecto, el mes en curso (o diciembre de un ejercicio pasado). */
export function leerPeriodo(parametros: Parametros) {
    const hoy = hoyEnChile();
    const anio = numero(parametros, "anio", 2000, 2100) ?? Number(hoy.slice(0, 4));
    const mesPorDefecto = anio === Number(hoy.slice(0, 4)) ? Number(hoy.slice(5, 7)) : 12;
    const mes = numero(parametros, "mes", 1, 12) ?? mesPorDefecto;
    const desdeMes = Math.min(numero(parametros, "desde", 1, 12) ?? 1, mes);
    return { anio, mes, desdeMes };
}

const MESES = Array.from({ length: 12 }, (_, i) => i + 1);

/** Selector de período: ejercicio, mes de inicio (si el reporte es de un rango) y mes de corte. */
export function FormularioPeriodo({
    ruta,
    anio,
    mes,
    desdeMes,
    conDesde,
}: {
    readonly ruta: string;
    readonly anio: number;
    readonly mes: number;
    readonly desdeMes: number;
    /** false = reporte a una fecha de corte (balance general). */
    readonly conDesde: boolean;
}) {
    const anioActual = Number(hoyEnChile().slice(0, 4));
    const anios = Array.from({ length: 6 }, (_, i) => anioActual - 4 + i);
    return (
        <form method="get" action={ruta} className="no-imprimir flex flex-wrap items-end gap-3">
            <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                Ejercicio
                <select name="anio" defaultValue={anio} className={`tabular ${CLASES_CAMPO}`}>
                    {anios.map((a) => (
                        <option key={a} value={a}>
                            {a}
                        </option>
                    ))}
                </select>
            </label>
            {conDesde ? (
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Desde
                    <select name="desde" defaultValue={desdeMes} className={`capitalize ${CLASES_CAMPO}`}>
                        {MESES.map((m) => (
                            <option key={m} value={m}>
                                {nombreMesLargo(m)}
                            </option>
                        ))}
                    </select>
                </label>
            ) : null}
            <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                {conDesde ? "Hasta" : "Al cierre de"}
                <select name="mes" defaultValue={mes} className={`capitalize ${CLASES_CAMPO}`}>
                    {MESES.map((m) => (
                        <option key={m} value={m}>
                            {nombreMesLargo(m)}
                        </option>
                    ))}
                </select>
            </label>
            <button
                type="submit"
                className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium hover:bg-[var(--background-raised)]"
            >
                Ver reporte
            </button>
        </form>
    );
}

/** Números de nota por rubro del ejercicio (null si las notas no se pudieron cargar). */
export type NotasDeRubros = { readonly ejercicio: number; readonly numeros: Readonly<Record<string, number>> } | null;

/** "Nota 4" enlazado a la nota del rubro; nada si el rubro no tiene nota (sin saldo en el ejercicio). */
export function EnlaceNota({ notas, rubro }: { readonly notas: NotasDeRubros; readonly rubro: string }) {
    const numero = notas?.numeros[rubro];
    if (!notas || !numero) return null;
    return (
        <Link
            href={`/dashboard/balance/notas?ejercicio=${notas.ejercicio}#nota-${rubro}`}
            className="no-imprimir ml-2 text-[11px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
        >
            Nota {numero}
        </Link>
    );
}

/** Los números de nota del ejercicio, para enlazar los estados; un fallo no rompe el reporte. */
export async function cargarNotasDeRubros(ejercicio: number, token: string): Promise<NotasDeRubros> {
    try {
        const datos = await notasEeffApi.obtener(ejercicio, { token, cache: "no-store" });
        return { ejercicio, numeros: numeroPorRubro(datos.notas) };
    } catch {
        return null;
    }
}
