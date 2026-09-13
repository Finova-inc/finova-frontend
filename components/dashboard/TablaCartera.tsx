import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { formatearCLP } from "@/lib/formato";
import type { TramoCartera } from "@/lib/datos-ejemplo";

/**
 * Estado de cartera por antiguedad: cuentas por cobrar y por pagar.
 *
 * Los totales se suman aqui con `Number` y no con aritmetica exacta porque son
 * cifras de presentacion. Cuando esto venga del backend, el total debe llegar
 * calculado por el servidor: sumar dinero en el cliente es justo lo que
 * decimal.util.ts existe para evitar en el lado que importa.
 */
type TablaCarteraProps = {
    readonly tramos: readonly TramoCartera[];
    readonly esEjemplo?: boolean;
};

export function TablaCartera({ tramos, esEjemplo = false }: TablaCarteraProps) {
    const totalCobrar = tramos.reduce((suma, t) => suma + Number(t.porCobrar), 0);
    const totalPagar = tramos.reduce((suma, t) => suma + Number(t.porPagar), 0);

    return (
        <Panel sinRelleno>
            <div className="px-5 pt-4">
                <PanelCabecera
                    titulo="Estado de cartera"
                    nota={
                        esEjemplo ? <Etiqueta tono="demo">Sin backend</Etiqueta> : "Por antigüedad"
                    }
                />
            </div>

            {/* El contenedor propio con overflow-x evita que una tabla ancha
                empuje el scroll horizontal a toda la pagina. */}
            <div className="overflow-x-auto px-5 pb-4 pt-3">
                <table className="w-full border-collapse text-[13px]">
                    <thead>
                        <tr>
                            <th
                                scope="col"
                                className="border-b border-[var(--border-subtle)] pb-2 pr-1.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]"
                            >
                                Tramo
                            </th>
                            <th
                                scope="col"
                                className="border-b border-[var(--border-subtle)] px-1.5 pb-2 text-right text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]"
                            >
                                Por cobrar
                            </th>
                            <th
                                scope="col"
                                className="border-b border-[var(--border-subtle)] pb-2 pl-1.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]"
                            >
                                Por pagar
                            </th>
                        </tr>
                    </thead>

                    <tbody>
                        {tramos.map((tramo) => (
                            <tr key={tramo.tramo}>
                                <td className="border-b border-[var(--border-subtle)] py-2.5 pr-1.5 text-[var(--foreground-muted)]">
                                    {tramo.tramo === "Al día" ? (
                                        <strong className="font-medium text-[var(--foreground)]">
                                            {tramo.tramo}
                                        </strong>
                                    ) : (
                                        tramo.tramo
                                    )}
                                </td>
                                <td
                                    className={`tabular border-b border-[var(--border-subtle)] px-1.5 py-2.5 text-right ${
                                        tramo.vencido
                                            ? "font-semibold text-[var(--critico)]"
                                            : ""
                                    }`}
                                >
                                    {formatearCLP(tramo.porCobrar)}
                                </td>
                                <td className="tabular border-b border-[var(--border-subtle)] py-2.5 pl-1.5 text-right">
                                    {formatearCLP(tramo.porPagar)}
                                </td>
                            </tr>
                        ))}

                        <tr>
                            <td className="border-t-2 border-[var(--border-strong)] pr-1.5 pt-3 font-bold">
                                Total
                            </td>
                            <td className="tabular border-t-2 border-[var(--border-strong)] px-1.5 pt-3 text-right font-bold">
                                {formatearCLP(totalCobrar)}
                            </td>
                            <td className="tabular border-t-2 border-[var(--border-strong)] pl-1.5 pt-3 text-right font-bold">
                                {formatearCLP(totalPagar)}
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </Panel>
    );
}
