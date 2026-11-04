import { notFound } from "next/navigation";

/**
 * Cualquier dirección de /dashboard que no sea una pantalla real. Sin esto, el
 * "no existe" de Next se dibuja fuera del panel (sin barra lateral); con esto
 * pasa por app/dashboard/not-found.tsx, dentro del layout.
 */
export default function RutaInexistente() {
    notFound();
}
