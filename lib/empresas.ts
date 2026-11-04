/**
 * Confirmación fuerte al eliminar una empresa, sin dependencias.
 *
 * La usan el diálogo (para habilitar el botón) y la Server Action (para
 * rechazar si el texto no coincide): una sola regla en los dos lados, porque
 * validar solo en el cliente no protege de quien llama a la acción directo.
 */

interface EmpresaAConfirmar {
    readonly rut: string | null;
    readonly razon_social: string | null;
}

/** Solo dígitos y K en mayúscula: "76.543.210-k" y "76543210K" son el mismo RUT. */
const soloRut = (texto: string): string => texto.replace(/[^0-9kK]/g, "").toUpperCase();

/** Lo que hay que escribir para confirmar: el RUT, o el nombre si la empresa no tiene RUT. */
export function textoDeConfirmacion(empresa: EmpresaAConfirmar): string | null {
    return empresa.rut ? empresa.rut : empresa.razon_social;
}

/** True si lo escrito es el RUT de la empresa (o, sin RUT, su nombre exacto). */
export function confirmaEliminacion(escrito: string, empresa: EmpresaAConfirmar): boolean {
    if (empresa.rut) {
        const rut = soloRut(empresa.rut);
        return rut.length >= 2 && soloRut(escrito) === rut;
    }
    // shortcut: sin RUT se pide el nombre tal cual (mayúsculas y tildes incluidas); basta porque el RUT es obligatorio al crearla.
    return empresa.razon_social !== null && empresa.razon_social !== "" && escrito.trim() === empresa.razon_social;
}
