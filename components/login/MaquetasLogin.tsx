import type { ReactNode } from "react";

import { Icon } from "@/components/ui/Icon";

/**
 * Maquetas del carrusel del login.
 *
 * Decorativas (el carrusel las marca aria-hidden): los datos son de ejemplo y
 * no vienen del backend. Solo muestran funciones que ya existen en Finova
 * (libro diario, plan de cuentas, multiempresa), nada del roadmap.
 *
 * Colores FIJOS de papel y tinta, no las variables del tema: las tarjetas
 * son claras en ambos temas. Sobre el fondo oscuro de la vitrina contrastan
 * solas; sobre el claro las despegan el blanco cálido y la sombra. Una tarjeta
 * que siguiera el tema oscuro quedaría oscura sobre oscuro.
 *
 * Las animaciones son de una sola pasada: el carrusel desmonta la maqueta al
 * cambiar de diapositiva, así que vuelven a empezar cada vez que se muestra.
 */

const TARJETA =
    "rounded-xl border border-black/10 bg-[#fffdfa] text-[var(--color-ink)] shadow-[0_24px_60px_-24px_rgb(20_17_15/0.45)]";
const TENUE = "text-[var(--color-graphite)]";
const POSITIVO = "bg-[#2f6b4f]/10 text-[#2f6b4f]";

/** Retardo escalonado para la entrada de filas. */
function retardo(indice: number, inicioMs = 250, pasoMs = 160) {
    return { animationDelay: `${inicioMs + indice * pasoMs}ms` };
}

/** Tarjeta pequeña que flota sobre la principal, desplazada. */
function Flotante({ className, children }: { className: string; children: ReactNode }) {
    return (
        <div className={`absolute animate-pop p-3 text-[12px] ${TARJETA} ${className}`}>
            {children}
        </div>
    );
}

/* ------------------------------------------------------------------------ */

const LINEAS_ASIENTO = [
    { codigo: "1101001", cuenta: "Caja", debe: "1.190.000", haber: "" },
    { codigo: "4101001", cuenta: "Ventas", debe: "", haber: "1.000.000" },
    { codigo: "2105001", cuenta: "IVA débito fiscal", debe: "", haber: "190.000" },
] as const;

export function MaquetaAsiento() {
    return (
        <div className="relative w-full max-w-[26rem]">
            <div className={`p-5 ${TARJETA}`}>
                <div className="flex items-start justify-between gap-3">
                    <div>
                        <p className="font-display text-[14px] font-semibold">Comprobante de ingreso N° 128</p>
                        <p className={`mt-0.5 text-[12px] ${TENUE}`}>Venta al contado · septiembre 2026</p>
                    </div>
                    <Icon name="ledger" className={`size-4 ${TENUE}`} />
                </div>

                <div className={`mt-4 grid grid-cols-[1fr_5rem_5rem] gap-x-3 border-b border-black/10 pb-1.5 text-[10px] font-medium uppercase tracking-wider ${TENUE}`}>
                    <span>Cuenta</span>
                    <span className="text-right">Debe</span>
                    <span className="text-right">Haber</span>
                </div>

                {LINEAS_ASIENTO.map((linea, indice) => (
                    <div
                        key={linea.codigo}
                        className="grid animate-fade-up grid-cols-[1fr_5rem_5rem] items-baseline gap-x-3 border-b border-black/10 py-2 text-[13px]"
                        style={retardo(indice)}
                    >
                        <span className="min-w-0 truncate">
                            <span className={`mr-1.5 font-mono text-[11px] ${TENUE}`}>{linea.codigo}</span>
                            {linea.cuenta}
                        </span>
                        <span className="tabular text-right">{linea.debe}</span>
                        <span className="tabular text-right">{linea.haber}</span>
                    </div>
                ))}

                <div
                    className="grid animate-fade-up grid-cols-[1fr_5rem_5rem] gap-x-3 pt-2 text-[13px] font-semibold"
                    style={retardo(LINEAS_ASIENTO.length)}
                >
                    <span>Totales</span>
                    <span className="tabular text-right">1.190.000</span>
                    <span className="tabular text-right">1.190.000</span>
                </div>
            </div>

            <Flotante className="-right-6 -bottom-6 flex items-center gap-2 font-medium [animation-delay:1100ms]">
                <span className={`grid size-6 place-items-center rounded-full ${POSITIVO}`}>
                    <Icon name="check" className="size-3.5" />
                </span>
                Debe = Haber
            </Flotante>
        </div>
    );
}

/* ------------------------------------------------------------------------ */

const ARBOL_CUENTAS = [
    { nivel: 0, codigo: "1", nombre: "Activo" },
    { nivel: 1, codigo: "11", nombre: "Activo corriente" },
    { nivel: 2, codigo: "1101001", nombre: "Caja", movimiento: true },
    { nivel: 2, codigo: "1102001", nombre: "Banco", movimiento: true },
    { nivel: 0, codigo: "2", nombre: "Pasivo" },
    { nivel: 1, codigo: "21", nombre: "Pasivo corriente" },
    { nivel: 2, codigo: "2105001", nombre: "IVA débito fiscal", movimiento: true },
] as const;

export function MaquetaPlanCuentas() {
    return (
        <div className="relative w-full max-w-[26rem]">
            <div className={`p-5 ${TARJETA}`}>
                <div className="flex items-center justify-between">
                    <p className="font-display text-[14px] font-semibold">Plan de cuentas</p>
                    <span className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${POSITIVO}`}>NIIF PYMES</span>
                </div>

                <ul className="mt-3">
                    {ARBOL_CUENTAS.map((cuenta, indice) => (
                        <li
                            key={cuenta.codigo}
                            className="flex animate-fade-up items-center gap-2 border-b border-black/5 py-1.5 text-[13px] last:border-0"
                            style={{ ...retardo(indice, 200, 110), paddingLeft: `${cuenta.nivel * 1.1}rem` }}
                        >
                            <span className={`w-14 shrink-0 font-mono text-[11px] ${TENUE}`}>{cuenta.codigo}</span>
                            <span className={"movimiento" in cuenta ? "" : "font-semibold"}>{cuenta.nombre}</span>
                            {"movimiento" in cuenta ? null : (
                                <span className={`ml-auto text-[10px] uppercase tracking-wider ${TENUE}`}>Agrupación</span>
                            )}
                        </li>
                    ))}
                </ul>
            </div>

            <Flotante className="-top-5 -right-5 [animation-delay:1000ms]">
                <p className={TENUE}>Plantilla base</p>
                <p className="font-display text-[15px] font-semibold">60 cuentas</p>
            </Flotante>
        </div>
    );
}

/* ------------------------------------------------------------------------ */

const EMPRESAS = [
    { nombre: "Panadería Los Andes SpA", rol: "Administrador", activa: true },
    { nombre: "Ferretería Central Ltda.", rol: "Contador", activa: false },
    { nombre: "Transportes del Sur SpA", rol: "Consulta", activa: false },
] as const;

export function MaquetaEmpresas() {
    return (
        <div className="relative w-full max-w-[26rem]">
            <div className={`p-5 ${TARJETA}`}>
                <div className="flex items-center justify-between">
                    <p className="font-display text-[14px] font-semibold">Mis empresas</p>
                    <Icon name="building" className={`size-4 ${TENUE}`} />
                </div>

                <ul className="mt-3 flex flex-col gap-2">
                    {EMPRESAS.map((empresa, indice) => (
                        <li
                            key={empresa.nombre}
                            className={`flex animate-fade-up items-center gap-3 rounded-lg border p-3 text-[13px] ${
                                empresa.activa
                                    ? "border-[var(--color-marker)]/50 bg-[var(--color-marker)]/8"
                                    : "border-black/10"
                            }`}
                            style={retardo(indice, 200, 180)}
                        >
                            <span className="grid size-8 shrink-0 place-items-center rounded-md bg-[var(--color-ink)] font-display text-[12px] font-bold text-[var(--color-cream)]">
                                {empresa.nombre.slice(0, 1)}
                            </span>
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-medium">{empresa.nombre}</span>
                                <span className={`text-[12px] ${TENUE}`}>{empresa.rol}</span>
                            </span>
                            {empresa.activa && <Icon name="check" className="size-4 text-[var(--color-marker)]" />}
                        </li>
                    ))}
                </ul>
            </div>

            <Flotante className="-bottom-5 -left-6 flex items-center gap-2 [animation-delay:1000ms]">
                <Icon name="shield" className={`size-4 ${TENUE}`} />
                Rol por empresa
            </Flotante>
        </div>
    );
}
