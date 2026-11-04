import { EnlaceVolver } from "@/components/ui/EnlaceVolver";
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

   Dice QUE va a hacer la seccion, en lenguaje de producto. Aqui no van notas
   de desarrollo (endpoints, tablas, pendientes del equipo): lo ve el usuario.
   lib/textos-internos.test.mjs lo vigila.
   ========================================================================== */

type PantallaPendienteProps = {
    readonly titulo: string;
    readonly icono: IconName;
    readonly descripcion: string;
};

export function PantallaPendiente({
    titulo,
    icono,
    descripcion,
}: PantallaPendienteProps) {
    return (
        <div className="flex flex-col gap-5">
            <div>
                {/* El mismo "← Volver" de las pantallas ya construidas, en el mismo lugar. */}
                <EnlaceVolver />
                <div className="flex flex-wrap items-center gap-3">
                    <h1 className="font-display text-xl font-semibold tracking-[-0.015em] text-balance">
                        {titulo}
                    </h1>
                    <Etiqueta tono="demo">Próximamente</Etiqueta>
                </div>
            </div>

            <div className="flex max-w-[65ch] flex-col items-start gap-3 rounded-xl border border-dashed border-[var(--border-strong)] bg-[var(--surface)] px-5 py-6">
                <div className="grid size-10 place-items-center rounded-lg bg-[var(--background-raised)] text-[var(--foreground-muted)]">
                    <Icon name={icono} className="size-5" />
                </div>

                <p className="text-[13.5px] leading-relaxed text-[var(--foreground-muted)]">
                    {descripcion}
                </p>

            </div>
        </div>
    );
}
