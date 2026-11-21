"use client";

import { LazyMotion, MotionConfig } from "motion/react";
import type { ReactNode } from "react";

/**
 * Motion para el panel: se monta UNA vez, en el layout de /dashboard, y solo
 * sirve a lo que el CSS no puede (ver el comentario de cada uso):
 *  - el indicador del menu lateral que se desliza (layoutId),
 *  - la salida de mensajes de estado (AnimatePresence),
 *  - el «Ver N más» de las alertas con la altura animada.
 *
 * LazyMotion con `strict`: solo vale el componente `m`, y se importa de
 * "motion/react-m" (el `m` de "motion/react" arrastraba ~36 KB gzip mas). Las
 * funciones se piden con import(): en una pagina de prueba midieron +22 KB gzip
 * al cargar y +34 KB mas ya despues, sin bloquear. Hasta que llegan, `m` pinta
 * su HTML estatico sin animar.
 *
 * Se usa domMax y no domAnimation porque layoutId (el indicador del menu) es
 * una animacion de layout, y esas viven solo en domMax (domAnimation ahorra
 * ~15 KB gzip diferidos, pero la pildora dejaria de deslizarse).
 *
 * reducedMotion="user": con "reducir movimiento" Motion apaga las animaciones
 * de transform y de layout. La altura y la opacidad no las cubre: los
 * componentes que las animan consultan useReducedMotion() y quedan sin duracion.
 */
const cargarFunciones = () => import("./funciones-motion").then((modulo) => modulo.default);

export function MovimientoProvider({ children }: { readonly children: ReactNode }) {
    return (
        <LazyMotion features={cargarFunciones} strict>
            <MotionConfig reducedMotion="user">{children}</MotionConfig>
        </LazyMotion>
    );
}
