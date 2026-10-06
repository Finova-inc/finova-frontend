/**
 * Franja con los módulos del producto en carrusel, bajo el hero.
 *
 * Componente de SERVIDOR, CSS puro: la lista se renderiza dos veces y
 * marquee-scroll (globals.css, 5b) recorre exactamente la mitad, así el bucle
 * no tiene costura. Decorativa (aria-hidden): los módulos ya aparecen en el pie.
 */

/** Los módulos del producto, construidos y del roadmap. */
const ACCOUNTING_MODULES = [
    "Plan de cuentas",
    "Asientos contables",
    "Libro diario",
    "Libro mayor",
    "Balance de comprobación",
    "Balance 8 columnas",
    "Libro de compra",
    "Libro de venta",
    "Centros de costo",
    "Períodos contables",
    "Balances tributarios",
    "Auditoría continua",
] as const;

const MODULE_COLORS = [
    "var(--hl-orange)",
    "var(--hl-pink)",
    "var(--hl-violet)",
    "var(--hl-sky)",
    "var(--hl-mint)",
    "var(--hl-yellow)",
] as const;

/** Duración de una vuelta del carrusel, en segundos. */
const MARQUEE_SECONDS = 48;

export function ModuleStrip() {
    return (
        <div
            aria-hidden
            className="flex overflow-hidden border-y border-[var(--border-subtle)] py-8"
            style={{
                maskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
                WebkitMaskImage: "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
            }}
        >
            <div
                className="flex shrink-0 items-center gap-3 pr-3"
                style={{ animation: `marquee-scroll ${MARQUEE_SECONDS}s linear infinite` }}
            >
                {[...ACCOUNTING_MODULES, ...ACCOUNTING_MODULES].map((moduleName, index) => (
                    <span
                        key={`${moduleName}-${index}`}
                        className="flex shrink-0 items-center gap-2.5 rounded-full border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-2 font-display text-[13px] font-medium"
                    >
                        <span
                            className="h-3.5 w-1.5 -skew-y-[28deg] rounded-[1px]"
                            style={{ background: MODULE_COLORS[index % MODULE_COLORS.length] }}
                        />
                        {moduleName}
                    </span>
                ))}
            </div>
        </div>
    );
}
