"use client";

import { useEffect } from "react";
import { publicarDetalle } from "./contexto-pantalla";

/**
 * Sin interfaz: una pagina lo dibuja para contarle al copiloto que tiene
 * abierto la persona ("cuenta 1101 Caja"). Al salir de la pagina se limpia.
 */
export function ContextoCopiloto({ detalle }: { readonly detalle: string }) {
    useEffect(() => {
        publicarDetalle(detalle);
        return () => publicarDetalle(null);
    }, [detalle]);
    return null;
}
