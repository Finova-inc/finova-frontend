/**
 * Primer enlace de la página: quien navega con teclado salta el encabezado y el
 * menú y cae en el contenido. Está oculto hasta recibir foco (sr-only) y entonces
 * aparece arriba a la izquierda, por encima de todo.
 *
 * `destino` es el ancla (#id) del contenido principal de esa pantalla.
 */
export function SaltarAlContenido({ destino }: { readonly destino: string }) {
    return (
        <a
            href={destino}
            className="no-imprimir sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-[var(--foreground)] focus:px-4 focus:py-2.5 focus:text-[13px] focus:font-medium focus:text-[var(--background)]"
        >
            Saltar al contenido
        </a>
    );
}
