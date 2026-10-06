import Image from "next/image";
import type { CSSProperties } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";

/**
 * Demo animada del dashboard, bajo el titular del hero (formato de
 * images/image.png: captura ancha del producto).
 *
 * Cuenta en 16 s cómo se contabiliza una factura, con recursos de video
 * explicativo: una "cámara" que hace zoom y paneo, un cursor que hace clic y
 * anillos de foco numerados. Cierra con una cortina que trae la marca y el
 * lema; detrás de ella el dashboard se reinicia sin que se vea. Decorativa
 * (aria-hidden): el titular y la bajada del hero ya dan el mensaje.
 *
 *   1. Llega la factura      → zoom a la bandeja, clic en la fila
 *   2. La IA propone          → paneo al editor, aparece el copiloto, clic en Aplicar
 *   3. Cuadra en vivo         → entran las líneas, "Descuadre" pasa a "Cuadrado"
 *   4. Contabilizas           → clic en Contabilizar, la fila pasa a "Contabilizado"
 *   cierre                    → cortina, "Finova" y "Tu contabilidad, más fácil que nunca."
 *
 * LIVIANA A PROPÓSITO
 * - Solo CSS (globals.css, sección 5b), solo transform/opacity: la GPU mueve
 *   capas ya pintadas y el hilo principal casi no trabaja.
 * - La cámara es UNA capa: el zoom no repinta, escala lo ya rasterizado.
 * - Todo se mide en `em` y el escenario fija font-size = ancho/80 (unidades
 *   de contenedor), así la maqueta escala completa sin JavaScript.
 *
 * TIEMPOS
 * Todas las animaciones duran LOOP_SECONDS y arrancan juntas, así comparten
 * reloj. Las de forma fija (cursor, clic, foco) se ubican en el
 * ciclo con su retraso; las de estado (filas, chips, avisos) llevan sus
 * instantes dentro del keyframe.
 *
 * El estilo BASE de cada elemento es el estado final, completo: con "reducir
 * movimiento" se ve el dashboard terminado y quieto, sin cursor ni anillos.
 *
 * Fidelidad: etiquetas del menú de components/Sidebar.tsx, textos de cuadre de
 * FormularioAsiento.tsx y cuentas del plan base del backend. Las cifras cuadran
 * (neto 1.000.000 + IVA 190.000 = 1.190.000).
 */

/** Duración del ciclo, en segundos. Los keyframes de 5b asumen este valor. */
const LOOP_SECONDS = 16;

/** Curva de la cámara y el cursor: aceleración y frenado suaves ("easy ease"). */
const EASY_EASE = "cubic-bezier(0.65, 0, 0.35, 1)";

/** Reproduce un keyframe del ciclo, desplazado `delayS` segundos. */
function play(name: string, delayS = 0, easing = "cubic-bezier(0.16, 1, 0.3, 1)"): CSSProperties {
    return { animation: `${name} ${LOOP_SECONDS}s ${easing} ${delayS}s infinite backwards` };
}

/** Cursor que llega desde abajo a la derecha y hace clic en `clickAtS`. */
function Tap({ clickAtS }: { readonly clickAtS: number }) {
    return (
        <span className="pointer-events-none absolute left-[58%] top-[55%] z-20">
            <span
                className="absolute -left-[1.2em] -top-[1.2em] size-[2.4em] rounded-full bg-[var(--hl-orange)] opacity-0"
                style={play("demo-ripple", clickAtS, "ease-out")}
            />
            {/* demo-tap llega al 12% del ciclo: 1,92 s antes del clic. Se anima
                el span y no el <svg>: Chrome no compone en GPU las animaciones
                de translate/scale sobre un elemento svg (medido). */}
            <span
                className="relative block size-[1.5em] opacity-0"
                style={play("demo-tap", clickAtS - 1.92, EASY_EASE)}
            >
                <svg viewBox="0 0 16 16" className="block size-full drop-shadow-[0_0.15em_0.25em_rgb(0_0_0/0.3)]">
                    <path
                        d="M2 1.5 13.5 7.6 8.2 9.1 5.6 14z"
                        fill="#fff"
                        stroke="#14110f"
                        strokeWidth="1.1"
                        strokeLinejoin="round"
                    />
                </svg>
            </span>
        </span>
    );
}

/** Anillo de foco con su etiqueta numerada, visible ~2,4 s desde `atS`. */
function Focus({ atS, step, label, color, below = false }: {
    readonly atS: number;
    readonly step: number;
    readonly label: string;
    readonly color: string;
    /** Etiqueta bajo el elemento, para no chocar con un foco vecino. */
    readonly below?: boolean;
}) {
    return (
        <span
            className="pointer-events-none absolute -inset-[0.45em] z-10 rounded-[0.85em] border-[0.14em] opacity-0"
            style={{
                ...play("demo-focus", atS),
                borderColor: color,
                boxShadow: `0 0 0 0.45em color-mix(in srgb, ${color} 16%, transparent)`,
            }}
        >
            <span className={`absolute ${below ? "-bottom-[2.6em]" : "-top-[2.6em]"} right-0 flex items-center gap-[0.45em] whitespace-nowrap rounded-full bg-ink py-[0.3em] pl-[0.3em] pr-[0.85em] text-[0.74em] font-medium text-[#f4f1ec] shadow-[0_0.4em_1em_-0.3em_rgb(0_0_0/0.4)]`}>
                <span
                    className="grid size-[1.55em] place-items-center rounded-full font-bold text-ink"
                    style={{ background: color }}
                >
                    {step}
                </span>
                {label}
            </span>
        </span>
    );
}

/** Pastilla de estado de un documento. */
function StatusChip({ done, className = "", style }: {
    readonly done: boolean;
    readonly className?: string;
    readonly style?: CSSProperties;
}) {
    return (
        <span
            className={`whitespace-nowrap rounded-full px-[0.7em] py-[0.2em] text-[0.62em] font-medium ${
                done
                    ? "bg-[var(--positivo-bg)] text-[var(--positivo)]"
                    : "bg-[var(--aviso-bg)] text-[var(--aviso)]"
            } ${className}`}
            style={style}
        >
            {done ? "Contabilizado" : "Por clasificar"}
        </span>
    );
}

const SIDEBAR_GROUPS: ReadonlyArray<{
    title: string;
    links: ReadonlyArray<{ label: string; icon: IconName; isActive?: boolean }>;
}> = [
    {
        title: "Principal",
        links: [
            { label: "Panel de control", icon: "grid" },
            { label: "Empresas", icon: "building" },
            { label: "Documentos", icon: "document", isActive: true },
            { label: "Terceros", icon: "users" },
        ],
    },
    {
        title: "Contabilidad",
        links: [
            { label: "Libro diario", icon: "calculator" },
            { label: "Plan de cuentas", icon: "ledger" },
            { label: "Períodos", icon: "lock" },
            { label: "Formulario F29", icon: "check" },
        ],
    },
    {
        title: "Inteligencia",
        links: [
            { label: "Copiloto IA", icon: "sparkle" },
            { label: "Auditoría", icon: "clock" },
        ],
    },
];

/** Bandeja de documentos. El primero es el que se contabiliza en la demo. */
const DOCUMENTS = [
    { issuer: "Distribuidora Andes", detail: "Factura 33 · N° 4.521", amount: "$1.190.000", color: "var(--hl-sky)", done: false },
    { issuer: "Servicios Cordillera", detail: "Factura 33 · N° 882", amount: "$476.000", color: "var(--hl-pink)", done: false },
    { issuer: "Transportes Maipo", detail: "Factura 33 · N° 1.307", amount: "$238.000", color: "var(--hl-mint)", done: true },
    { issuer: "Ferretería Los Robles", detail: "Factura 33 · N° 9.114", amount: "$95.200", color: "var(--hl-yellow)", done: true },
    { issuer: "Inmobiliaria Centro", detail: "Factura exenta 34 · N° 210", amount: "$850.000", color: "var(--hl-violet)", done: true },
] as const;

/** Líneas del asiento y su keyframe de entrada (globals.css, 5b). */
const ENTRY_LINES = [
    { code: "1106001", account: "Mercaderías", debit: "1.000.000", credit: "", enter: "demo-in-b" },
    { code: "1104001", account: "IVA crédito fiscal", debit: "190.000", credit: "", enter: "demo-in-c" },
    { code: "2101001", account: "Proveedores", debit: "", credit: "1.190.000", enter: "demo-in-d" },
] as const;

const TABLE_COLUMNS = "grid grid-cols-[1fr_7em_7em] items-center gap-[0.6em]";

function TopBar() {
    return (
        <div className="flex h-[3.2em] shrink-0 items-center gap-[0.8em] border-b border-[var(--border-subtle)] px-[1.2em]">
            <span className="flex gap-[0.4em]">
                <span className="size-[0.7em] rounded-full bg-[var(--hl-orange)]" />
                <span className="size-[0.7em] rounded-full bg-[var(--hl-yellow)]" />
                <span className="size-[0.7em] rounded-full bg-[var(--hl-mint)]" />
            </span>
            <span className="ml-[0.6em] text-[0.8em] text-[var(--foreground-muted)]">
                Principal / <span className="font-medium text-[var(--foreground)]">Documentos</span>
            </span>
            <span className="ml-auto flex h-[2em] w-[15em] items-center gap-[0.5em] rounded-[0.5em] border border-[var(--border-subtle)] px-[0.7em] text-[var(--foreground-muted)]">
                <Icon name="search" className="size-[0.9em]" />
                <span className="text-[0.72em]">Buscar documentos…</span>
            </span>
            <span className="flex items-center gap-[0.45em] rounded-full border border-[var(--border-subtle)] px-[0.8em] py-[0.35em]">
                <Icon name="building" className="size-[0.85em] text-[var(--foreground-muted)]" />
                <span className="text-[0.72em] font-medium">Comercial Andes SpA</span>
            </span>
            <span className="flex items-center gap-[0.45em] rounded-full border border-[var(--border-subtle)] px-[0.8em] py-[0.35em]">
                <span className="size-[0.5em] rounded-full bg-[var(--hl-mint)]" />
                <span className="text-[0.72em]">Sep 2026 · Abierto</span>
            </span>
            <span className="grid size-[2em] place-items-center rounded-full bg-[var(--hl-orange)] text-ink">
                <span className="text-[0.7em] font-bold">CM</span>
            </span>
        </div>
    );
}

function Sidebar() {
    return (
        <div className="flex w-[13em] shrink-0 flex-col gap-[1.2em] bg-[var(--sidebar-bg)] p-[1em] text-[var(--sidebar-ink)]">
            <span className="flex items-center gap-[0.5em] px-[0.4em]">
                <Icon name="logo" className="size-[1.3em] text-[var(--hl-orange)]" />
                <span className="font-display text-[1em] font-bold">Finova</span>
            </span>
            {SIDEBAR_GROUPS.map((group) => (
                <div key={group.title} className="flex flex-col gap-[0.15em]">
                    <span className="mb-[0.3em] px-[0.6em] text-[0.6em] font-semibold uppercase tracking-[0.1em] text-[var(--sidebar-muted)]">
                        {group.title}
                    </span>
                    {group.links.map((link) => (
                        <span
                            key={link.label}
                            className={`flex items-center gap-[0.6em] rounded-[0.5em] px-[0.6em] py-[0.4em] ${
                                link.isActive ? "bg-[var(--sidebar-hover)]" : "text-[var(--sidebar-muted)]"
                            }`}
                        >
                            <Icon
                                name={link.icon}
                                className={`size-[0.95em] ${link.isActive ? "text-[var(--hl-orange)]" : ""}`}
                            />
                            <span className={`text-[0.78em] ${link.isActive ? "font-medium" : ""}`}>{link.label}</span>
                        </span>
                    ))}
                </div>
            ))}
        </div>
    );
}

function Inbox() {
    return (
        <div className="flex w-[27em] shrink-0 flex-col gap-[0.6em] border-r border-[var(--border-subtle)] p-[1.2em]">
            <div className="flex items-center justify-between">
                <span className="font-display text-[1.05em] font-bold">Documentos recibidos</span>
                <span className="grid justify-items-end">
                    <span
                        className="rounded-full bg-[var(--aviso-bg)] px-[0.7em] py-[0.2em] text-[0.62em] font-medium text-[var(--aviso)] opacity-0 [grid-area:1/1]"
                        style={play("demo-chip-out")}
                    >
                        2 por clasificar
                    </span>
                    <span
                        className="rounded-full bg-[var(--aviso-bg)] px-[0.7em] py-[0.2em] text-[0.62em] font-medium text-[var(--aviso)] [grid-area:1/1]"
                        style={play("demo-in-f")}
                    >
                        1 por clasificar
                    </span>
                </span>
            </div>

            <div className="mb-[0.6em] flex gap-[1.2em] border-b border-[var(--border-subtle)]">
                <span className="-mb-px border-b-[0.15em] border-[var(--hl-orange)] pb-[0.5em] text-[0.72em] font-semibold">Todos</span>
                <span className="pb-[0.5em] text-[0.72em] text-[var(--foreground-muted)]">Por clasificar</span>
                <span className="pb-[0.5em] text-[0.72em] text-[var(--foreground-muted)]">Contabilizados</span>
            </div>

            {DOCUMENTS.map((doc, index) => {
                const isTarget = index === 0;
                return (
                    <div
                        key={doc.detail}
                        className="relative flex items-center gap-[0.7em] rounded-[0.6em] border border-[var(--border-subtle)] px-[0.8em] py-[0.65em]"
                    >
                        {isTarget && (
                            <span
                                className="absolute inset-0 rounded-[0.6em] bg-[color-mix(in_srgb,var(--hl-orange)_9%,transparent)]"
                                style={play("demo-select")}
                            />
                        )}
                        <span
                            className="relative grid size-[2em] shrink-0 place-items-center rounded-[0.5em] text-ink"
                            style={{ background: doc.color }}
                        >
                            <Icon name="document" className="size-[1em]" />
                        </span>
                        <span className="relative min-w-0 flex-1">
                            <span className="block truncate text-[0.8em] font-semibold">{doc.issuer}</span>
                            <span className="block truncate text-[0.66em] text-[var(--foreground-muted)]">{doc.detail}</span>
                        </span>
                        <span className="relative flex flex-col items-end gap-[0.25em]">
                            <span className="tabular text-[0.8em] font-semibold">{doc.amount}</span>
                            {isTarget ? (
                                /* Los dos estados en la misma celda: "Por
                                   clasificar" se apaga cuando se contabiliza. */
                                <span className="grid justify-items-end">
                                    <StatusChip done={false} className="opacity-0 [grid-area:1/1]" style={play("demo-chip-out")} />
                                    <StatusChip done className="[grid-area:1/1]" style={play("demo-in-f")} />
                                </span>
                            ) : (
                                <StatusChip done={doc.done} />
                            )}
                        </span>
                        {isTarget && (
                            <>
                                <Focus atS={2.4} step={1} label="Llega la factura" color="var(--hl-orange)" />
                                <Tap clickAtS={3.2} />
                            </>
                        )}
                    </div>
                );
            })}
        </div>
    );
}

function Editor() {
    return (
        <div className="relative flex min-w-0 flex-1 flex-col p-[1.4em]">
            <div className="flex items-center gap-[0.7em]">
                <span className="font-display text-[1.15em] font-bold">Nuevo asiento</span>
                <span className="rounded-full bg-[var(--aviso-bg)] px-[0.7em] py-[0.2em] text-[0.62em] font-medium text-[var(--aviso)]">
                    Borrador
                </span>
            </div>

            <div className="relative mt-[1em] flex-1">
                {/* Estado vacío antes de elegir la factura. Opacity 0 de base:
                    sin animación se ve el asiento terminado. */}
                <div
                    className="absolute inset-0 flex flex-col items-center justify-center gap-[0.5em] rounded-[0.8em] border border-dashed border-[var(--border-strong)] opacity-0"
                    style={play("demo-empty")}
                >
                    <span className="grid size-[3em] place-items-center rounded-full bg-[var(--background-raised)] text-[var(--foreground-muted)]">
                        <Icon name="ledger" className="size-[1.4em]" />
                    </span>
                    <span className="text-[0.85em] font-semibold">Selecciona una factura</span>
                    <span className="text-[0.72em] text-[var(--foreground-muted)]">Finova arma el asiento por ti.</span>
                </div>

                {/* Todo el asiento entra junto con la sugerencia (4,2 s); las
                    líneas, el cuadre y el aviso tienen además su propio instante. */}
                <div className="flex flex-col gap-[1em]" style={play("demo-in-a")}>
                    {/* Sugerencia del copiloto */}
                    <div className="relative rounded-[0.8em] border border-[color-mix(in_srgb,var(--hl-violet)_40%,transparent)] bg-[color-mix(in_srgb,var(--hl-violet)_7%,transparent)] p-[0.9em]">
                        <span className="flex items-center gap-[0.45em]">
                            <Icon name="sparkle" className="size-[0.95em] text-[var(--hl-violet)]" />
                            <span className="text-[0.74em] font-semibold">Copiloto IA</span>
                        </span>
                        <p className="mt-[0.4em] text-[0.74em] leading-[1.5] text-[var(--foreground-muted)]">
                            Leí la factura N° 4.521 de Distribuidora Andes. Propongo cargar Mercaderías e IVA
                            crédito fiscal contra Proveedores.
                        </p>
                        <span
                            className="relative mt-[0.6em] inline-flex rounded-[0.5em] bg-[var(--hl-violet)] px-[0.9em] py-[0.35em] text-ink"
                            style={play("demo-press", 5.6, "ease-out")}
                        >
                            <span className="text-[0.72em] font-semibold">Aplicar sugerencia</span>
                            <Tap clickAtS={5.6} />
                        </span>
                        <Focus atS={4.6} step={2} label="La IA propone el asiento" color="var(--hl-violet)" />
                    </div>

                    <div className="grid grid-cols-[8em_1fr] gap-[0.7em]">
                        <span className="flex flex-col gap-[0.3em]">
                            <span className="text-[0.62em] text-[var(--foreground-muted)]">Fecha</span>
                            <span className="tabular rounded-[0.5em] border border-[var(--border-subtle)] px-[0.7em] py-[0.45em] text-[0.74em]">
                                28-09-2026
                            </span>
                        </span>
                        <span className="flex min-w-0 flex-col gap-[0.3em]">
                            <span className="text-[0.62em] text-[var(--foreground-muted)]">Glosa</span>
                            <span className="truncate rounded-[0.5em] border border-[var(--border-subtle)] px-[0.7em] py-[0.45em] text-[0.74em]">
                                Compra de mercaderías · Factura 4.521
                            </span>
                        </span>
                    </div>

                    {/* Líneas del asiento */}
                    <div>
                        <div className={`${TABLE_COLUMNS} border-b border-[var(--border-subtle)] pb-[0.5em] text-[0.6em] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]`}>
                            <span>Cuenta</span>
                            <span className="text-right">Debe</span>
                            <span className="text-right">Haber</span>
                        </div>
                        {ENTRY_LINES.map((line) => (
                            <div
                                key={line.code}
                                className={`${TABLE_COLUMNS} border-b border-[var(--border-subtle)] py-[0.55em]`}
                                style={play(line.enter)}
                            >
                                <span className="min-w-0">
                                    <span className="tabular block text-[0.6em] text-[var(--foreground-muted)]">{line.code}</span>
                                    <span className="block truncate text-[0.78em]">{line.account}</span>
                                </span>
                                <span className="tabular text-right text-[0.78em]">{line.debit}</span>
                                <span className="tabular text-right text-[0.78em]">{line.credit}</span>
                            </div>
                        ))}
                        <div className={`${TABLE_COLUMNS} pt-[0.55em] font-semibold`}>
                            <span className="text-[0.78em]">Totales</span>
                            <span className="tabular text-right text-[0.78em]" style={play("demo-in-c")}>1.190.000</span>
                            <span className="tabular text-right text-[0.78em]" style={play("demo-in-d")}>1.190.000</span>
                        </div>
                    </div>

                    {/* Balance: descuadre y cuadre en la misma celda. */}
                    <div className="relative grid">
                        <span
                            className="flex items-center gap-[0.5em] rounded-[0.6em] bg-[var(--aviso-bg)] px-[0.8em] py-[0.55em] text-[var(--aviso)] opacity-0 [grid-area:1/1]"
                            style={play("demo-window")}
                        >
                            <Icon name="alert" className="size-[0.95em] shrink-0" />
                            <span className="text-[0.74em] font-medium">Descuadre de $1.190.000 (falta haber)</span>
                        </span>
                        <span
                            className="flex items-center gap-[0.5em] rounded-[0.6em] bg-[var(--positivo-bg)] px-[0.8em] py-[0.55em] text-[var(--positivo)] [grid-area:1/1]"
                            style={play("demo-in-d")}
                        >
                            <Icon name="check" className="size-[0.95em] shrink-0" />
                            <span className="text-[0.74em] font-medium">Cuadrado: debe y haber suman $1.190.000</span>
                        </span>
                        <Focus atS={7.5} step={3} label="Cuadra en vivo" color="var(--hl-mint)" />
                    </div>

                    <div className="flex items-center gap-[0.6em]">
                        <span className="flex items-center gap-[0.5em]" style={play("demo-in-e")}>
                            <span className="grid size-[1.4em] place-items-center rounded-full bg-[var(--hl-mint)] text-ink">
                                <Icon name="check" className="size-[0.8em]" />
                            </span>
                            <span className="text-[0.74em] font-medium">Asiento N° 1.284 contabilizado</span>
                        </span>
                        <span className="ml-auto rounded-[0.5em] border border-[var(--border-subtle)] px-[0.9em] py-[0.45em] text-[0.74em] font-medium">
                            Guardar borrador
                        </span>
                        <span
                            className="relative rounded-[0.5em] bg-[var(--accent)] px-[0.9em] py-[0.45em] text-ink"
                            style={play("demo-press", 9.5, "ease-out")}
                        >
                            <span className="text-[0.74em] font-semibold">Contabilizar</span>
                            <Focus atS={9} step={4} label="Contabilizas con un clic" color="var(--hl-sky)" below />
                            <Tap clickAtS={9.5} />
                        </span>
                    </div>
                </div>
            </div>
        </div>
    );
}

/** Cierre: cortina con la marca y el lema. Base: fuera de cuadro, abajo. */
function Outro() {
    return (
        <div
            className="absolute inset-0 z-30 flex translate-y-full flex-col items-center justify-center gap-[1.4em] bg-ink text-[#f4f1ec]"
            style={{
                ...play("demo-curtain", 0, EASY_EASE),
                backgroundImage:
                    "radial-gradient(40em 26em at 18% 12%, rgb(255 106 26 / 0.35), transparent 70%), radial-gradient(38em 26em at 85% 92%, rgb(255 79 139 / 0.3), transparent 70%)",
            }}
        >
            {/* Cada línea sube desde detrás de su propio borde (overflow
                hidden): el "text reveal" clásico, sin máscaras animadas. */}
            <span className="block overflow-hidden pb-[0.3em]">
                <span className="flex items-center gap-[0.45em]" style={play("demo-rise-1")}>
                    <Image src="/logo-finova.png" alt="" width={135} height={184} className="h-[5.6em] w-auto" />
                    <span className="font-display text-[6.2em] font-bold leading-none tracking-[-0.03em]">Finova</span>
                </span>
            </span>
            <span className="block overflow-hidden pb-[0.2em]">
                <span className="block font-serif text-[2.7em] leading-tight text-[#f4f1ec]/85" style={play("demo-rise-2")}>
                    Tu contabilidad, más fácil que nunca.
                </span>
            </span>
        </div>
    );
}

export function HeroDemo() {
    return (
        <div className="mx-auto w-full max-w-6xl">
            {/* Contenedor de consulta: el escenario mide su letra en cqw. */}
            <div aria-hidden className="[container-type:inline-size]">
                <div
                    className="relative aspect-[80/46] overflow-hidden rounded-[1.1em] border border-[var(--border-subtle)] bg-[var(--surface)] text-left shadow-[0_2.5em_5em_-2.5em_rgb(20_17_15/0.45)]"
                    style={{ fontSize: "calc(100cqw / 80)" }}
                >
                    {/* La cámara: el lienzo completo mide 80 x 46 em y se mueve
                        entero con transform (origen arriba a la izquierda). */}
                    <div
                        className="absolute left-0 top-0 flex h-[46em] w-[80em] origin-top-left flex-col"
                        style={play("demo-camera", 0, EASY_EASE)}
                    >
                        <TopBar />
                        <div className="flex min-h-0 flex-1">
                            <Sidebar />
                            <Inbox />
                            <Editor />
                        </div>
                    </div>

                    <Outro />
                </div>
            </div>
        </div>
    );
}
