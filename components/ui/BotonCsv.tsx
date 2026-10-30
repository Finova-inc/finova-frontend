"use client";

import { Boton } from "@/components/ui/Boton";

/** Descarga `csv` como archivo. La BOM hace que Excel lea UTF-8 (tildes y ñ). */
export function BotonCsv({ csv, archivo, texto = "Exportar CSV" }: { csv: string; archivo: string; texto?: string }) {
    function descargar() {
        const blob = new Blob(["﻿", csv], { type: "text/csv;charset=utf-8" });
        const enlace = document.createElement("a");
        enlace.href = URL.createObjectURL(blob);
        enlace.download = archivo;
        enlace.click();
        setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
    }

    return (
        <Boton variante="neutro" onClick={descargar} className="no-imprimir">
            {texto}
        </Boton>
    );
}
