/* ============================================================================
   Cierre de sesión — revocar el token en el backend sin que un fallo lo impida.

   Función pura (sin next ni red) para probarla con `node --test`: el route
   handler le pasa la llamada real al backend.
   ========================================================================== */

/**
 * Pide al backend que revoque el token. Nunca lanza: devuelve si lo logró.
 *
 * Cerrar sesión no puede depender de que el backend responda (puede estar
 * dormido o caído): quien llama limpia la cookie igual. Si esto devuelve false,
 * el token sigue siendo válido en el backend hasta que venza, pero ya no está
 * en este navegador.
 */
export async function revocarEnBackend(
    token: string | null | undefined,
    logout: (token: string) => Promise<unknown>,
): Promise<boolean> {
    if (!token) return false;
    try {
        await logout(token);
        return true;
    } catch {
        return false;
    }
}
