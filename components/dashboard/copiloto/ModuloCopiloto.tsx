"use client";

import { useSyncExternalStore } from "react";
import { ChatCopiloto } from "./ChatCopiloto";

const sinCambios = () => () => {};

/**
 * El chat del modulo /dashboard/copiloto. Se dibuja solo en el navegador:
 * lee la conversacion guardada en localStorage al montarse, y en el servidor
 * no hay localStorage (el HTML no coincidiria y React avisaria de hidratacion).
 */
export function ModuloCopiloto({ idUsuario, idEmpresa }: { readonly idUsuario: string | null; readonly idEmpresa: string | null }) {
    const enNavegador = useSyncExternalStore(sinCambios, () => true, () => false);
    return enNavegador ? <ChatCopiloto abierto idUsuario={idUsuario} idEmpresa={idEmpresa} /> : null;
}
