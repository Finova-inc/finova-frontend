"use client";

import { Boton } from "@/components/ui/Boton";

/**
 * Imprime la pagina (o la guarda como PDF desde el dialogo del navegador).
 * Las reglas @media print de globals.css quitan la barra lateral, la
 * cabecera y los controles marcados con .no-imprimir.
 */
export function BotonImprimir({ texto = "Imprimir" }: { readonly texto?: string }) {
    return (
        <Boton variante="neutro" onClick={() => window.print()}>
            {texto}
        </Boton>
    );
}
