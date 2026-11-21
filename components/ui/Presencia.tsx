"use client";

import { AnimatePresence, useReducedMotion } from "motion/react";
import * as m from "motion/react-m";
import type { ReactNode } from "react";

/**
 * Un mensaje de estado (error, aviso, exito) que aparece Y SALE con suavidad:
 * fundido y altura. El CSS ya anima la entrada de cualquier role="alert" o
 * "status"; esto agrega lo que el CSS no puede, que es la salida (el elemento
 * ya no esta en el DOM cuando termina de desaparecer).
 *
 * El componente que lo usa sigue siendo quien decide si hay mensaje: aqui solo
 * se retrasa el desmontaje lo que dura la salida. Al cargar la pantalla un
 * mensaje que ya existe aparece sin animar (initial={false}).
 *
 * Con "reducir movimiento" no hay duracion: Motion no cubre la altura, asi que
 * se consulta useReducedMotion().
 */
export function Presencia({ mostrar, children }: { readonly mostrar: boolean; readonly children: ReactNode }) {
    const reducido = useReducedMotion();

    return (
        <AnimatePresence initial={false}>
            {mostrar ? (
                <m.div
                    key="mensaje"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: reducido ? 0 : 0.2, ease: [0.22, 1, 0.36, 1] }}
                    style={{ overflow: "hidden" }}
                >
                    {children}
                </m.div>
            ) : null}
        </AnimatePresence>
    );
}
