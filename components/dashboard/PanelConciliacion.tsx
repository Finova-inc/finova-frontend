import { Barra } from "@/components/ui/Barra";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import { formatearCLP } from "@/lib/formato";
import type { Conciliacion } from "@/lib/datos-ejemplo";

/**
 * Zona 2 — Estado de conciliacion bancaria.
 *
 * Bloque integramente de ejemplo: no existe modulo de bancos en el backend, ni
 * tabla, ni entidad. Va rotulado con la etiqueta "Sin backend" por eso mismo.
 *
 * La diferencia entre saldos se muestra en rojo aunque no sea un error: en
 * conciliacion, una diferencia distinta de cero es exactamente el trabajo
 * pendiente, y es el numero que la persona vino a buscar.
 */
type PanelConciliacionProps = {
    readonly datos: Conciliacion;
};

export function PanelConciliacion({ datos }: PanelConciliacionProps) {
    const diferencia = Number(datos.saldoBanco) - Number(datos.saldoLibros);

    return (
        <Panel>
            <div className="flex flex-wrap items-start gap-3">
                <div className="flex items-center gap-3">
                    <div className="grid size-10 shrink-0 place-items-center rounded-lg border border-[var(--border-subtle)] bg-[var(--background-raised)] text-[var(--foreground-muted)]">
                        <Icon name="bank" className="size-5" />
                    </div>

                    <div className="min-w-0">
                        <div className="text-[14.5px] font-semibold">{datos.banco}</div>
                        <div className="tabular text-[12px] text-[var(--foreground-muted)]">
                            {datos.cuenta}
                        </div>
                    </div>
                </div>

                <Etiqueta tono="demo" className="ml-auto self-center">
                    Sin backend
                </Etiqueta>
            </div>

            <div className="mt-4 grid gap-5 lg:grid-cols-2">
                <dl className="flex flex-col gap-3">
                    <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-[12.5px] text-[var(--foreground-muted)]">
                            Saldo según banco
                        </dt>
                        <dd className="tabular font-display text-[17px] font-semibold">
                            {formatearCLP(datos.saldoBanco)}
                        </dd>
                    </div>

                    <div className="flex items-baseline justify-between gap-4">
                        <dt className="text-[12.5px] text-[var(--foreground-muted)]">
                            Saldo según libros
                        </dt>
                        <dd className="tabular font-display text-[17px] font-semibold">
                            {formatearCLP(datos.saldoLibros)}
                        </dd>
                    </div>

                    <div className="flex items-baseline justify-between gap-4 border-t border-[var(--border-subtle)] pt-3">
                        <dt className="text-[12.5px] font-medium">Diferencia por conciliar</dt>
                        <dd className="tabular font-display text-[17px] font-semibold text-[var(--critico)]">
                            {formatearCLP(diferencia)}
                        </dd>
                    </div>
                </dl>

                <div className="flex flex-col gap-2">
                    <div className="flex items-baseline justify-between text-[12.5px]">
                        <span className="text-[var(--foreground-muted)]">Avance del mes</span>
                        <span className="tabular font-display text-sm font-semibold">
                            {datos.porcentajeAvance}%
                        </span>
                    </div>

                    <Barra
                        porcentaje={datos.porcentajeAvance}
                        etiqueta="Avance de conciliación del mes"
                    />

                    <p className="text-[12.5px] text-[var(--foreground-muted)]">
                        <strong className="font-semibold text-[var(--foreground)]">
                            {datos.movimientosConciliados}
                        </strong>{" "}
                        movimientos conciliados ·{" "}
                        <strong className="font-semibold text-[var(--foreground)]">
                            {datos.movimientosPendientes}
                        </strong>{" "}
                        pendientes
                    </p>

                    <p className="text-[12.5px] text-[var(--foreground-muted)]">
                        Última importación: {datos.ultimaImportacion}
                    </p>
                </div>
            </div>

            <div className="mt-4 flex flex-wrap gap-2 border-t border-[var(--border-subtle)] pt-4">
                <Boton variante="acento" disabled>
                    Ir a conciliar
                </Boton>
                <Boton disabled>Ver diferencias</Boton>
                <Boton disabled>Importar cartola</Boton>
            </div>
        </Panel>
    );
}
