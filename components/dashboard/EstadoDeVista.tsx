"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";

import { Boton } from "@/components/ui/Boton";
import { MensajeDeEstado } from "@/components/ui/MensajeDeEstado";
import { vistaDeLaRuta } from "@/lib/vistas";

const CLASES_ENLACE =
    "inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] transition-[background-color,filter] hover:bg-[var(--background-raised)]";

/**
 * Error inesperado en una pantalla del panel (lo que ningún try/catch de la
 * página atrapó). Dice de CUÁL pantalla se trata y deja la barra lateral y la
 * cabecera en pie, porque vive dentro del layout del panel.
 *
 * El mensaje del error no se muestra: en producción Next lo reemplaza por uno
 * genérico para no filtrar detalles del servidor; se deja el `digest` para
 * cruzarlo con los logs.
 */
export function ErrorDeVista({
    error,
    retry,
}: {
    readonly error: Error & { digest?: string };
    readonly retry: () => void;
}) {
    const vista = vistaDeLaRuta(usePathname());

    useEffect(() => {
        console.error(error);
    }, [error]);

    return (
        <MensajeDeEstado
            codigo="Error"
            tono="critico"
            titulo={`No pudimos mostrar ${vista.nombre}.`}
            acciones={
                <>
                    <Boton variante="acento" onClick={() => retry()}>
                        Reintentar
                    </Boton>
                    <Link href={vista.volverA} className={CLASES_ENLACE}>
                        Volver
                    </Link>
                </>
            }
        >
            <p>
                Algo falló de nuestro lado. Si el servidor estaba inactivo puede tardar unos segundos en despertar:
                reintenta en un momento.
            </p>
            {vista.nota ? <p className="mt-1">{vista.nota}</p> : null}
            {error.digest ? <p className="mt-3 text-[12px]">Código de referencia: {error.digest}</p> : null}
        </MensajeDeEstado>
    );
}

/** "No existe" dentro del panel: un id que no es de esta empresa, o una ruta inventada. */
export function NoEncontradoDeVista() {
    const vista = vistaDeLaRuta(usePathname());
    const conocida = vista.nombre !== "esta pantalla";

    return (
        <MensajeDeEstado
            codigo="404"
            titulo={conocida ? `No encontramos ${vista.nombre}.` : "Esa pantalla no existe."}
            acciones={
                <Link href={vista.volverA} className={CLASES_ENLACE}>
                    {vista.volverA === "/dashboard" ? "Ir al panel de control" : "Volver al listado"}
                </Link>
            }
        >
            <p>
                {conocida
                    ? "Puede que ya no exista o que pertenezca a otra empresa. Revisa que estés en la empresa correcta."
                    : "Revisa la dirección o vuelve al panel y elige la pantalla desde el menú."}
            </p>
        </MensajeDeEstado>
    );
}
