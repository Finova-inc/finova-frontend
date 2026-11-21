import type { ReactNode } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";

/* ============================================================================
   Cifra — una cifra con su título y una nota: la pieza de los resúmenes del
   panel (cifras clave, indicadores de «Por contabilizar», totales de
   Documentos y del F29).

   Tres tamaños:
   - normal: el de la portada del panel.
   - grande: un paso más; para la cifra que el resto del panel resume (Resultado).
   - compacta: el de los resúmenes de Documentos y F29, que van sobre una
     tabla y no deben competir con ella (letra menor que la de la portada,
     borde fino y sin ícono ni tinte).

   `tono` tiñe la tarjeta con el fondo suave de utilidad (positivo) o pérdida
   (crítico): destaca la cifra sin pintar su número, que sigue en tinta de
   texto. `icono` es una marca discreta del sprite del sistema.

   `valor` undefined significa que la consulta falló: se dibuja un guion y el
   lector de pantalla lee «No pudimos consultarlo». "$0" y "no se pudo
   consultar" son cosas distintas, y en un panel contable confundirlas lleva a
   malas decisiones.
   ========================================================================== */

type TamanoCifra = "compacta" | "normal" | "grande";
type TonoCifra = "neutro" | "positivo" | "critico";

const CLASES: Record<TamanoCifra, { caja: string; borde: string; titulo: string; valor: string; nota: string }> = {
    compacta: {
        caja: "px-4 py-3",
        borde: "border-[var(--border-subtle)]",
        titulo: "text-[11.5px]",
        valor: "mt-0.5 text-[19px] tracking-[-0.01em]",
        nota: "mt-0.5 text-[11px]",
    },
    normal: {
        caja: "px-4 py-3.5",
        borde: "border-[var(--border-strong)]",
        titulo: "text-xs",
        valor: "mt-1 text-2xl",
        nota: "mt-1.5 text-xs",
    },
    grande: {
        caja: "px-4 py-3.5",
        borde: "border-[var(--border-strong)]",
        titulo: "text-xs",
        valor: "mt-1 text-3xl",
        nota: "mt-1.5 text-xs",
    },
};

/** Fondo y borde de cada tono (los tokens de estado; el borde es el mismo color a media fuerza). */
const TONOS: Record<TonoCifra, { fondo: string; borde: string | null; icono: string }> = {
    neutro: {
        fondo: "bg-[var(--surface)]",
        borde: null,
        icono: "bg-[var(--background-raised)] text-[var(--foreground-muted)]",
    },
    positivo: {
        fondo: "bg-[var(--positivo-bg)]",
        borde: "border-[color-mix(in_srgb,var(--positivo)_40%,transparent)]",
        icono: "bg-[var(--surface)] text-[var(--positivo)]",
    },
    critico: {
        fondo: "bg-[var(--critico-bg)]",
        borde: "border-[color-mix(in_srgb,var(--critico)_40%,transparent)]",
        icono: "bg-[var(--surface)] text-[var(--critico)]",
    },
};

export function Cifra({
    titulo,
    valor,
    nota,
    tamano = "normal",
    tono = "neutro",
    icono,
}: {
    readonly titulo: string;
    readonly valor: ReactNode;
    readonly nota?: ReactNode;
    readonly tamano?: TamanoCifra;
    readonly tono?: TonoCifra;
    readonly icono?: IconName;
}) {
    const clases = CLASES[tamano];
    const tinte = TONOS[tono];

    return (
        <div className={`rounded-xl border ${tinte.borde ?? clases.borde} ${tinte.fondo} ${clases.caja}`}>
            <div className="flex items-start justify-between gap-2">
                <p className={`${clases.titulo} font-medium text-[var(--foreground-muted)]`}>{titulo}</p>
                {icono ? (
                    <span className={`grid size-6 shrink-0 place-items-center rounded-md ${tinte.icono}`}>
                        <Icon name={icono} className="size-3.5" />
                    </span>
                ) : null}
            </div>
            <p className={`tabular font-display font-semibold ${clases.valor}`}>
                {valor === undefined ? (
                    <>
                        <span aria-hidden="true">—</span>
                        <span className="sr-only">No pudimos consultarlo</span>
                    </>
                ) : (
                    valor
                )}
            </p>
            {nota ? <div className={`${clases.nota} text-[var(--foreground-muted)]`}>{nota}</div> : null}
        </div>
    );
}
