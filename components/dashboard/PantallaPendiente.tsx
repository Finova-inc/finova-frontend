import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon, type IconName } from "@/components/ui/Icon";

/* ============================================================================
   Pantalla de seccion todavia no construida.

   ---------------------------------------------------------------------------
   POR QUE UN COMPONENTE Y NO SIETE PAGINAS SUELTAS
   ---------------------------------------------------------------------------
   Las cinco paginas stub del panel eran identicas salvo el texto, y ninguna
   tenia una sola clase de estilo: se veian como HTML sin CSS dentro de un panel
   cuidado. Con un componente comun, el dia que una seccion se construya de
   verdad se borra su uso y el resto sigue coherente.

   Dice QUE va a haber aqui y QUE se puede hacer mientras tanto. Una pantalla
   que solo dice "proximamente" deja a quien llega sin salida.
   ========================================================================== */

type PantallaPendienteProps = {
    readonly titulo: string;
    readonly icono: IconName;
    readonly descripcion: string;
    /** Lo que ya existe en el backend y se podra mostrar aqui. */
    readonly disponible?: readonly string[];
};

export function PantallaPendiente({
    titulo,
    icono,
    descripcion,
    disponible,
}: PantallaPendienteProps) {
    return (
        <div className="flex flex-col gap-5">
            <div className="flex flex-wrap items-center gap-3">
                <h1 className="font-display text-xl font-semibold tracking-[-0.015em] text-balance">
                    {titulo}
                </h1>
                <Etiqueta tono="demo">En construcción</Etiqueta>
            </div>

            <div className="flex max-w-[65ch] flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-6">
                <div className="grid size-10 place-items-center rounded-lg bg-[var(--background-raised)] text-[var(--foreground-muted)]">
                    <Icon name={icono} className="size-5" />
                </div>

                <p className="text-[13.5px] leading-relaxed text-[var(--foreground-muted)]">
                    {descripcion}
                </p>

                {disponible && disponible.length > 0 ? (
                    <div className="mt-1">
                        <p className="text-[11px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                            Ya disponible en la API
                        </p>
                        <ul className="mt-2 flex flex-col gap-1.5">
                            {disponible.map((item) => (
                                <li
                                    key={item}
                                    className="flex items-start gap-2 text-[13px]"
                                >
                                    <Icon
                                        name="check"
                                        className="mt-0.5 size-3.5 shrink-0 text-[var(--positivo)]"
                                    />
                                    {item}
                                </li>
                            ))}
                        </ul>
                    </div>
                ) : null}
            </div>
        </div>
    );
}
