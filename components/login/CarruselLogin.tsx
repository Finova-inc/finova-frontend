"use client";

import { useEffect, useState, type ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { MaquetaAsiento, MaquetaEmpresas, MaquetaPlanCuentas } from "@/components/login/MaquetasLogin";

/**
 * Vitrina del login: carrusel de lo que hace Finova.
 *
 * Avanza solo, siempre: un setTimeout por diapositiva. No se pausa con el
 * mouse ni depende de animationend, porque con "reducir movimiento" activado
 * en el sistema las animaciones CSS terminan al instante y el carrusel se
 * quedaba quieto. La barra del segmento activo es solo indicador visual.
 */

/**
 * Duración de cada diapositiva. Debe coincidir con los 8s de
 * --animate-carrusel y de [data-progreso-carrusel] en globals.css.
 */
const DURACION_MS = 8000;

interface Diapositiva {
    readonly id: string;
    readonly icono: IconName;
    readonly titulo: string;
    readonly destacado: string;
    readonly descripcion: string;
    readonly maqueta: ReactNode;
}

const DIAPOSITIVAS: readonly Diapositiva[] = [
    {
        id: "libro-diario",
        icono: "ledger",
        titulo: "Cada asiento,",
        destacado: "cuadrado antes de registrarse",
        descripcion:
            "La partida doble se valida en cada línea y el libro diario queda inmutable, como exige el Código de Comercio.",
        maqueta: <MaquetaAsiento />,
    },
    {
        id: "plan-cuentas",
        icono: "grid",
        titulo: "Tu plan de cuentas NIIF,",
        destacado: "listo en un clic",
        descripcion:
            "Carga la plantilla base para PYMES y ajústala a tu cliente, con la jerarquía de agrupación siempre consistente.",
        maqueta: <MaquetaPlanCuentas />,
    },
    {
        id: "empresas",
        icono: "building",
        titulo: "Todas tus empresas,",
        destacado: "una sola cuenta",
        descripcion:
            "Cambia de cliente sin cerrar sesión. Tu rol se respeta en cada empresa y los datos nunca se mezclan.",
        maqueta: <MaquetaEmpresas />,
    },
];

export function CarruselLogin({ className = "" }: { className?: string }) {
    const [actual, setActual] = useState(0);
    const diapositiva = DIAPOSITIVAS[actual];

    // Depende de `actual`: elegir un segmento a mano reinicia la cuenta, así
    // la diapositiva elegida dura completa y la barra queda sincronizada.
    useEffect(() => {
        const id = window.setTimeout(
            () => setActual((indice) => (indice + 1) % DIAPOSITIVAS.length),
            DURACION_MS,
        );
        return () => window.clearTimeout(id);
    }, [actual]);

    return (
        <section
            aria-roledescription="carrusel"
            aria-label="Qué puedes hacer en Finova"
            className={`login-vitrina relative isolate flex-col overflow-hidden px-10 pt-12 pb-8 xl:px-16 ${className}`}
        >
            {/* key: remonta la diapositiva al cambiar, así sus animaciones de
                entrada vuelven a correr desde el principio. */}
            <div key={diapositiva.id} className="relative flex flex-1 flex-col">
                <div aria-hidden className="flex flex-1 items-center justify-center py-6">
                    {diapositiva.maqueta}
                </div>

                <div className="animate-fade-up text-center [animation-delay:300ms]">
                    <span className="mx-auto grid size-14 place-items-center rounded-2xl bg-[var(--color-marker)] text-[var(--color-ink)] shadow-[0_10px_30px_-8px_rgb(255_106_26/0.6)]">
                        <Icon name={diapositiva.icono} className="size-7" />
                    </span>

                    {/* aria-live: quien usa lector de pantalla se entera del
                        cambio sin que le interrumpa lo que esté leyendo. */}
                    <div aria-live="polite">
                        <h2 className="mx-auto mt-6 max-w-[22ch] font-display text-3xl font-bold leading-tight tracking-tight text-balance">
                            {diapositiva.titulo}{" "}
                            <span className="text-[var(--vitrina-muted)]">{diapositiva.destacado}</span>
                        </h2>
                        <p className="mx-auto mt-4 max-w-[46ch] text-[15px] leading-relaxed text-[var(--vitrina-muted)] text-pretty">
                            {diapositiva.descripcion}
                        </p>
                    </div>
                </div>
            </div>

            <div className="relative mt-10 flex gap-2">
                {DIAPOSITIVAS.map((d, indice) => (
                    <button
                        key={d.id}
                        type="button"
                        onClick={() => setActual(indice)}
                        aria-label={`Ver diapositiva ${indice + 1} de ${DIAPOSITIVAS.length}`}
                        aria-current={indice === actual}
                        // py amplía el área de clic sin engrosar la barra.
                        className="flex-1 py-2"
                    >
                        <span className="block h-1 overflow-hidden rounded-full bg-[var(--vitrina-pista)]">
                            {indice === actual ? (
                                <span
                                    data-progreso-carrusel
                                    className="block h-full origin-left animate-carrusel rounded-full bg-[var(--color-marker)]"
                                />
                            ) : (
                                indice < actual && <span className="block h-full rounded-full bg-[var(--vitrina-pasado)]" />
                            )}
                        </span>
                    </button>
                ))}
            </div>
        </section>
    );
}
