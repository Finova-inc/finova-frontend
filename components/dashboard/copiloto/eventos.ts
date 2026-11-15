/* El menu lateral abre el copiloto sin compartir estado con el: un evento del
   navegador basta y evita un contexto de React solo para esto. */

export const EVENTO_ABRIR_COPILOTO = "finova:abrir-copiloto";

export function abrirCopiloto(): void {
    window.dispatchEvent(new Event(EVENTO_ABRIR_COPILOTO));
}
