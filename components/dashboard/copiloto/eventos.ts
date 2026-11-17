/* El menu lateral abre el copiloto sin compartir estado con el: un evento del
   navegador basta y evita un contexto de React solo para esto. */

export const EVENTO_ABRIR_COPILOTO = "finova:abrir-copiloto";

/** "compacto": el panel chico de la esquina. "ampliado": la ventana grande sobre la pantalla. */
export type ModoCopiloto = "compacto" | "ampliado";

export type DetalleAbrirCopiloto = { readonly modo: ModoCopiloto };

export function abrirCopiloto(modo: ModoCopiloto = "compacto"): void {
    window.dispatchEvent(new CustomEvent<DetalleAbrirCopiloto>(EVENTO_ABRIR_COPILOTO, { detail: { modo } }));
}
