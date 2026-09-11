import type { Metadata } from "next";
import { Suspense } from "react";
import Image from "next/image";
import Link from "next/link";

import { LoginForm } from "@/components/login/LoginForm";
import { Icon } from "@/components/ui/Icon";

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
 * Sigue la estructura de images/Login_view.png: dos columnas a pantalla
 * completa. A la izquierda una fotografía con el titular y un testimonio
 * compuestos en HTML encima; a la derecha el formulario sobre negro.
 *
 * En móvil la columna de imagen se oculta: a ese ancho, una foto de media
 * pantalla empuja el formulario fuera de la vista y obliga a hacer scroll para
 * llegar a lo único que la persona vino a hacer.
 *
 * Es un componente de SERVIDOR: solo arma la estructura y delega la parte
 * interactiva en LoginForm. El formulario envía las credenciales a /api/auth/login —es
 * el esquema visual que se pidió— y así se declara en la propia pantalla.
 */

export default function LoginPage() {
    return (
        <main className="grid min-h-dvh lg:grid-cols-2">
            {/* ===============================================================
                Columna izquierda: fotografia con titular y testimonio.

                El texto se compone en HTML SOBRE la foto, no viene incrustado
                en el mapa de bits. El mockup original traia el titular dibujado
                dentro de la imagen, lo que causaba dos problemas: object-cover
                lo mutilaba al recortar, y un lector de pantalla no podia leerlo.
                Por eso public/login-photo.png es solo la fotografia.
                =============================================================== */}
            <section className="relative hidden overflow-hidden bg-ink lg:block">
                {/*
                    fill + object-cover: la foto cubre la columna completa sin
                    deformarse. Al no llevar texto encima, recortar es inocuo.

                    alt vacio: es decorativa. El titular contiguo, que ahora si
                    es texto real, ya comunica el mensaje.
                */}
                <Image
                    src="/login-photo.png"
                    alt=""
                    fill
                    priority
                    sizes="50vw"
                    className="object-cover object-center"
                />

                {/* Velo oscuro: sin el, el texto blanco compite con las zonas
                    claras de la foto y pierde legibilidad. */}
                <div
                    aria-hidden
                    className="absolute inset-0 bg-gradient-to-t from-ink via-ink/75 to-ink/25"
                />

                <div className="relative flex h-full flex-col justify-between p-12">
                    <Link
                        href="/"
                        className="flex w-fit items-center gap-2.5 font-display text-[19px] font-bold tracking-tight text-white"
                    >
                        <Image
                            src="/logo-finova.png"
                            alt=""
                            width={135}
                            height={184}
                            priority
                            className="h-8 w-auto"
                        />
                        Finova
                    </Link>

                    <div>
                        <h2 className="max-w-[15ch] font-display text-4xl font-bold leading-[1.1] tracking-tight text-balance text-white xl:text-5xl">
                            Contabilidad al día, sin sorpresas de último minuto.
                        </h2>

                        <p className="mt-5 max-w-[40ch] text-lg leading-relaxed text-white/65 text-pretty">
                            El sistema revisa cada documento antes de que llegue a
                            tu declaración.
                        </p>

                        {/* Testimonio. PERSONA FICTICIA, igual que los de la
                            landing: hay que reemplazarlo por uno real con
                            autorizacion antes de publicar. Ver docs/LANDING.md. */}
                        <figure className="mt-12 max-w-md border border-white/12 bg-white/5 p-6 backdrop-blur-sm">
                            <blockquote className="text-[15px] leading-relaxed text-white/85">
                                Antes cerraba el mes revisando documento por
                                documento. Ahora reviso lo que el sistema ya dejó
                                cuadrado.
                            </blockquote>

                            <figcaption className="mt-5 flex items-center gap-3">
                                <span
                                    aria-hidden
                                    className="grid size-9 shrink-0 place-items-center rounded-full bg-[var(--color-highlight)] font-display text-[13px] font-bold text-ink"
                                >
                                    MF
                                </span>

                                <span className="min-w-0">
                                    <span className="block truncate font-display text-[14px] font-semibold text-white">
                                        María Fernández
                                    </span>
                                    <span className="block truncate text-[13px] text-white/55">
                                        Auditora externa
                                    </span>
                                </span>
                            </figcaption>
                        </figure>
                    </div>
                </div>
            </section>

            {/* ===============================================================
                Columna derecha: el formulario.
                =============================================================== */}
            <section className="flex flex-col justify-center bg-ink px-6 py-14 sm:px-10 lg:px-16">
                <div className="mx-auto w-full max-w-[26rem]">
                    {/* La marca se repite aquí para móvil, donde la columna de
                        imagen no existe. En escritorio queda oculta, porque ya
                        aparece arriba a la izquierda. */}
                    <Link
                        href="/"
                        className="mb-10 flex w-fit items-center gap-2.5 font-display text-[19px] font-bold tracking-tight text-white lg:hidden"
                    >
                        <Image
                            src="/logo-finova.png"
                            alt=""
                            width={135}
                            height={184}
                            priority
                            className="h-8 w-auto"
                        />
                        Finova
                    </Link>

                    <h1 className="font-display text-3xl font-bold tracking-tight text-white">
                        Inicia sesión
                    </h1>

                    <p className="mt-3 mb-9 text-[15px] leading-relaxed text-white/55">
                        Accede a tu estudio contable en Finova.
                    </p>

                    {/* useSearchParams() dentro de LoginForm obliga a este
                        límite de Suspense para poder prerenderizar la página. */}
                    <Suspense fallback={null}>
                        <LoginForm />
                    </Suspense>

                    {/* Enlace de registro. La ruta todavía no existe, así que se
                        deja como texto: un enlace a una página inexistente
                        confunde a quien navega con teclado o lector de pantalla. */}
                    <p className="mt-8 text-center text-[14px] text-white/55">
                        ¿Nueva o nuevo en Finova?{" "}
                        <span className="font-medium text-white/75">
                            Crear cuenta (pronto)
                        </span>
                    </p>

                    {/* Sello de seguridad, alineado con lo que la landing promete. */}
                    <p className="mt-8 flex items-center justify-center gap-2 border-t border-white/10 pt-8 text-[13px] text-white/40">
                        <Icon name="shield" className="size-3.5" />
                        Conexión cifrada
                    </p>
                </div>
            </section>
        </main>
    );
}
