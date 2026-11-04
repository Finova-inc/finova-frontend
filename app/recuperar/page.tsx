import type { Metadata } from "next";
import { FormularioRecuperar } from "@/components/login/FormularioRecuperar";
import { MarcoRecuperacion } from "@/components/login/MarcoRecuperacion";

export const metadata: Metadata = {
    title: "Recuperar contraseña",
    description: "Pide un enlace para elegir una contraseña nueva.",
    // Como el login: sin interés en resultados de búsqueda.
    robots: { index: false, follow: false },
};

/** Pública (el proxy solo protege /dashboard): quien olvidó su contraseña no tiene sesión. */
export default function RecuperarPage() {
    return (
        <MarcoRecuperacion
            titulo="¿Olvidaste tu contraseña?"
            descripcion="Escribe tu RUT y, si la cuenta existe, te enviaremos un enlace al correo registrado para elegir una nueva."
        >
            <FormularioRecuperar />
        </MarcoRecuperacion>
    );
}
