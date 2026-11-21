"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

/**
 * Entrada de cada pantalla del panel: un fundido con una subida minima (250 ms).
 *
 * Un template, a diferencia del layout, se vuelve a montar al navegar a OTRA
 * ruta; con solo cambiar los searchParams (filtros, ?periodo=, paginacion) Next
 * conserva el mismo arbol, asi que esos cambios no la repiten. Se midio en esta
 * version de Next.
 *
 * El template no toca la respuesta del servidor: notFound() sigue dando 404 y
 * redirect() 307.
 *
 * La portada (/dashboard) se salta el efecto: sus cuatro zonas ya entran
 * escalonadas, y los dos juntos serian un doble fundido.
 */
export default function Template({ children }: { readonly children: ReactNode }) {
    const ruta = usePathname();
    return <div className={ruta === "/dashboard" ? undefined : "animate-pantalla"}>{children}</div>;
}
