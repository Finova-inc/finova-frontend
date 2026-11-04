import { ApiError, authApi } from "@/lib/api";
import { obtenerTokenSesion } from "@/lib/session";

/**
 * Avisa en /login que la sesión se terminó.
 *
 * Todas las pantallas privadas mandan a /login cuando el backend responde 401,
 * sin decir por qué. Aquí se explica una sola vez: si llegas a /login con una
 * cookie de sesión, o nunca la hubo (y no hay nada que decir) o el token ya no
 * vale (vencido, revocado o alterado). Se pregunta al backend y solo se avisa si
 * responde 401; si no responde, no se afirma nada.
 *
 * No redirige: /login con cookie vigente sigue mostrando el formulario, así que
 * una cookie inválida no puede producir un bucle con /dashboard.
 */
export async function AvisoSesionExpirada() {
    const token = await obtenerTokenSesion();
    if (!token) return null;

    try {
        await authApi.misEmpresas({ token, cache: "no-store" });
        return null;
    } catch (error) {
        if (!(error instanceof ApiError && error.status === 401)) return null;
    }

    return (
        <p role="alert" className="mb-6 rounded-xl bg-[var(--critico-bg)] px-4 py-3 text-center text-sm text-[var(--critico)]">
            Tu sesión expiró. Vuelve a iniciar sesión.
        </p>
    );
}
