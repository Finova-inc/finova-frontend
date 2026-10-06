import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

import { CarruselLogin } from "@/components/login/CarruselLogin";
import { LoginForm } from "@/components/login/LoginForm";
import { Icon } from "@/components/ui/Icon";
import { ThemeToggle } from "@/components/ui/ThemeToggle";

export const metadata: Metadata = {
    title: "Entrar",
    description: "Accede a tu cuenta de Finova.",
    // Una página de acceso no aporta nada en resultados de búsqueda y su
    // presencia en un índice solo facilita el reconocimiento automatizado.
    robots: {
        index: false,
        follow: false,
    },
};

/**
 * Página de acceso.
 *
 * Dos paneles a pantalla completa, sin marco: a la izquierda el formulario,
 * a la derecha la vitrina (CarruselLogin), con un carrusel de lo que hace
 * Finova. Ambos siguen el tema claro/oscuro.
 *
 * En móvil y tablet la vitrina se oculta: empujaría el formulario fuera de la
 * vista, y el formulario es lo único que la persona vino a hacer.
 *
 * Es un componente de SERVIDOR: lo interactivo vive en LoginForm, ThemeToggle
 * y CarruselLogin.
 */
export default function LoginPage() {
    return (
        <main className="flex min-h-dvh bg-[var(--surface)] text-[var(--foreground)]">
            {/* =========================================================
                Panel del formulario.
                ========================================================= */}
            <section className="flex min-w-0 flex-1 flex-col px-6 py-6 sm:px-10 lg:max-w-[40rem] lg:py-8">
                <header className="flex items-center justify-between">
                    <Link
                        href="/"
                        className="flex w-fit items-center gap-3 font-display text-[28px] font-bold tracking-tight sm:text-[30px]"
                    >
                        <Image
                            src="/logo-finova.png"
                            alt=""
                            width={135}
                            height={184}
                            priority
                            className="h-11 w-auto"
                        />
                        Finova
                    </Link>

                    {/* El botón usa las variables del header, pensadas para
                        el crema de la marca: por eso va sobre una pastilla
                        crema, que se lee igual en ambos temas. */}
                    <div className="overflow-hidden rounded-xl border border-[var(--border-subtle)] bg-[var(--color-cream)]">
                        <ThemeToggle />
                    </div>
                </header>

                <div className="mx-auto flex w-full max-w-[25rem] flex-1 animate-fade-up flex-col justify-center py-12">
                    <h1 className="text-center font-display text-3xl font-bold tracking-tight">
                        Bienvenido a Finova
                    </h1>

                    <p className="mt-3 mb-10 text-center text-[15px] leading-relaxed text-[var(--foreground-muted)]">
                        Ingresa con tu RUT y contraseña para continuar.
                    </p>

                    {/* useSearchParams() dentro de LoginForm obliga a este
                        límite de Suspense para poder prerenderizar la página. */}
                    <Suspense fallback={null}>
                        <LoginForm />
                    </Suspense>

                    {/* Sin enlace de registro: las cuentas las crea el
                        equipo de Finova, que registra el RUT de cada contador. */}
                </div>

                <footer className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] text-[var(--foreground-muted)]">
                    <span>© {new Date().getFullYear()} Finova</span>
                    <span className="flex items-center gap-1.5">
                        <Icon name="shield" className="size-3.5" />
                        Conexión cifrada
                    </span>
                </footer>
            </section>

            <CarruselLogin className="hidden flex-1 lg:flex" />
        </main>
    );
}
