"use client";

import { useCallback, useLayoutEffect, useRef, useSyncExternalStore } from "react";

import { Icon } from "@/components/ui/Icon";
import {
    applyTheme,
    resolveStoredTheme,
    THEME_CLASS_NAME,
    THEME_STORAGE_KEY,
    type Theme,
} from "@/lib/theme";

/**
 * Botón de cambio entre tema claro y oscuro.
 *
 * Es uno de los tres únicos componentes cliente del proyecto, porque necesita
 * onClick y localStorage. El header que lo contiene sigue siendo componente de
 * servidor: "use client" marca un módulo, no un subárbol, así que un padre de
 * servidor puede renderizar un hijo de cliente sin arrastrar su propio marcado
 * al bundle.
 *
 * ---------------------------------------------------------------------------
 * POR QUÉ useSyncExternalStore Y NO useState
 * ---------------------------------------------------------------------------
 * El tema no vive en el árbol de React: vive en el DOM, como una clase en
 * <html> que pone un script antes de que React exista. Eso lo convierte en
 * estado EXTERNO, y useSyncExternalStore es el hook diseñado para leerlo.
 *
 * La alternativa —useState más un efecto que lo sincroniza— provoca un render
 * en cascada y el linter de React la marca con razón: cada montaje renderizaría
 * dos veces para llegar al mismo valor que el DOM ya tenía.
 *
 * Este hook además resuelve solo el renderizado en servidor: recibe un lector
 * aparte para SSR, así que no hay desajuste de hidratación.
 */

/**
 * Se suscribe a los cambios de la clase de tema en <html>.
 *
 * El observador es necesario porque la clase puede cambiar por fuera de React
 * (el script inline al cargar, o el remonte del Modo Estricto en desarrollo).
 */
function subscribeToThemeClass(onStoreChange: () => void): () => void {
    const observer = new MutationObserver(onStoreChange);

    observer.observe(document.documentElement, {
        attributes: true,
        attributeFilter: ["class"],
    });

    return () => observer.disconnect();
}

/** Lee el tema vigente desde el DOM. Es la fuente de verdad en el cliente. */
function getThemeFromDocument(): Theme {
    return document.documentElement.classList.contains(THEME_CLASS_NAME)
        ? "dark"
        : "light";
}

/**
 * Valor durante el renderizado en servidor.
 *
 * En el servidor no hay DOM ni localStorage, así que se asume el tema claro.
 * El script inline corrige la clase antes del primer paint y el observador de
 * arriba avisa del cambio, de modo que la interfaz converge sin parpadeo.
 */
function getServerTheme(): Theme {
    return "light";
}

/**
 * `icon` (por omisión): un solo ícono que cambia, el del panel y el login.
 * `switch`: pastilla con sol y luna siempre visibles y una perilla que se
 * desliza bajo el activo (header de la landing, según images/image.png).
 */
type ThemeToggleProps = {
    readonly variant?: "icon" | "switch";
};

export function ThemeToggle({ variant = "icon" }: ThemeToggleProps) {
    const theme = useSyncExternalStore(
        subscribeToThemeClass,
        getThemeFromDocument,
        getServerTheme,
    );

    /**
     * Marca si ya se reaplicó el tema tras el montaje, para no repetirlo.
     */
    const hasRestoredRef = useRef(false);

    /**
     * Reaplica el tema guardado después del montaje.
     *
     * Parece redundante —el script inline ya puso la clase— pero cubre un caso
     * real: en desarrollo, el Modo Estricto de React remonta los componentes una
     * vez y, al hacerlo, reinicia <html> dejando solo los atributos que
     * administra desde JSX, borrando la clase del script. Sin esto el tema se
     * revierte solo en `next dev` y se persigue un fantasma. En producción es
     * una operación sin efecto.
     *
     * Se usa useLayoutEffect porque corre antes del paint: con useEffect se
     * vería un fotograma con el tema equivocado.
     *
     * No llama a setState: solo toca el DOM. El observador de arriba se encarga
     * de avisarle a React si algo cambió.
     */
    useLayoutEffect(() => {
        if (hasRestoredRef.current) {
            return;
        }

        hasRestoredRef.current = true;
        applyTheme(resolveStoredTheme());
    }, []);

    /**
     * Alterna el tema.
     *
     * Solo escribe en el DOM y en localStorage. React se entera por el
     * observador, no por una llamada a setState.
     */
    const handleToggle = useCallback(() => {
        const nextTheme: Theme =
            getThemeFromDocument() === "dark" ? "light" : "dark";

        applyTheme(nextTheme);

        try {
            localStorage.setItem(THEME_STORAGE_KEY, nextTheme);
        } catch {
            // Si el almacenamiento no está disponible, el tema igual cambia:
            // simplemente no sobrevive a la recarga.
        }
    }, []);

    if (variant === "switch") {
        return (
            <button
                type="button"
                onClick={handleToggle}
                aria-pressed={theme === "dark"}
                aria-label="Cambiar entre tema claro y oscuro"
                title="Cambiar tema"
                className="relative inline-flex h-9 w-16 shrink-0 items-center rounded-full bg-[var(--header-hover)] p-1 ring-1 ring-inset ring-[var(--header-border)] transition-colors hover:bg-[var(--header-divider)]"
            >
                {/*
                    La posición de la perilla y el color de cada ícono salen de
                    la clase .dark (variantes dark:), no del estado de React:
                    así el primer paint ya es el correcto, igual que en la
                    variante de ícono. La transición la hace CSS al cambiar la
                    clase.
                */}
                <span
                    aria-hidden
                    className="absolute left-1 top-1 size-7 rounded-full bg-white shadow-[0_1px_3px_rgb(0_0_0/0.16),0_1px_1px_rgb(0_0_0/0.06)] transition-transform duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] dark:translate-x-7"
                />
                <span className="relative grid size-7 place-items-center text-[var(--color-marker)] transition-colors duration-300 dark:text-[var(--header-ink-muted)]">
                    <Icon name="sun" className="size-4 fill-current" />
                </span>
                <span className="relative grid size-7 place-items-center text-[var(--header-ink-muted)] transition-colors duration-300 dark:text-[var(--color-violet)]">
                    <Icon name="moon" className="size-[15px] fill-current" />
                </span>
            </button>
        );
    }

    return (
        <button
            type="button"
            onClick={handleToggle}
            /* aria-pressed comunica a los lectores de pantalla que esto es un
               interruptor con estado, no un botón de acción puntual. */
            aria-pressed={theme === "dark"}
            aria-label="Cambiar entre tema claro y oscuro"
            title="Cambiar tema"
            /* Los colores vienen de las variables del header, no fijos:
               la barra es crema en ambos temas, asi que el icono debe ser
               oscuro siempre, tambien en tema oscuro. */
            className="grid size-10 place-items-center text-[var(--header-ink-muted)] transition-colors hover:bg-[var(--header-hover)] hover:text-[var(--header-ink)]"
        >
            {/*
                Se renderizan AMBOS iconos y CSS elige cuál se ve.
                Esto es intencional: si el icono dependiera del estado de React,
                se pintaría el equivocado hasta que hidratara. Al dejarlo en manos
                de la clase .dark que puso el script inline, el icono correcto
                aparece desde el primer paint.
            */}
            <Icon name="sun" className="size-5 dark:hidden" />
            <Icon name="moon" className="hidden size-5 dark:block" />
        </button>
    );
}
