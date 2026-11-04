/**
 * Nombre de cada pantalla del panel, para que un error o un "no existe" diga
 * de cuál se trata ("No pudimos mostrar el libro mayor") y no un mensaje
 * genérico igual en todas.
 *
 * Es una tabla y no un archivo error.tsx por carpeta: son ~20 pantallas con el
 * mismo comportamiento, y una tabla se prueba sin navegador.
 */

export type Vista = {
    /** Con artículo, para completar la frase: "No pudimos mostrar {nombre}". */
    readonly nombre: string;
    /** A qué listado volver desde esta pantalla. */
    readonly volverA: string;
    /** Lo que se pierde o no se pierde por el error, si vale la pena decirlo. */
    readonly nota?: string;
};

const NOTA_ASIENTOS = "Ningún asiento se pierde por esto: los contabilizados ya están guardados.";

/**
 * De lo más específico a lo más general: gana la primera coincidencia, así que
 * `/dashboard/core-contable/nuevo` tiene que ir antes que `/dashboard/core-contable/:id`.
 */
const VISTAS: readonly (readonly [RegExp, Vista])[] = [
    [/^\/dashboard\/core-contable\/nuevo$/, { nombre: "el formulario de asiento", volverA: "/dashboard/core-contable", nota: NOTA_ASIENTOS }],
    [/^\/dashboard\/core-contable\/borradores\/[^/]+$/, { nombre: "el borrador", volverA: "/dashboard/core-contable", nota: NOTA_ASIENTOS }],
    [/^\/dashboard\/core-contable\/[^/]+$/, { nombre: "el asiento", volverA: "/dashboard/core-contable", nota: NOTA_ASIENTOS }],
    [/^\/dashboard\/core-contable$/, { nombre: "el libro diario", volverA: "/dashboard", nota: NOTA_ASIENTOS }],
    [/^\/dashboard\/libro-mayor$/, { nombre: "el libro mayor", volverA: "/dashboard" }],
    [/^\/dashboard\/balance\/general$/, { nombre: "el balance general", volverA: "/dashboard/balance" }],
    [/^\/dashboard\/balance\/resultados$/, { nombre: "el estado de resultados", volverA: "/dashboard/balance" }],
    [/^\/dashboard\/balance\/notas$/, { nombre: "las notas a los estados financieros", volverA: "/dashboard/balance" }],
    [/^\/dashboard\/balance\/comprobacion$/, { nombre: "el balance de comprobación", volverA: "/dashboard/balance" }],
    [/^\/dashboard\/balance\/tributario$/, { nombre: "el balance tributario", volverA: "/dashboard/balance" }],
    [/^\/dashboard\/balance$/, { nombre: "los balances", volverA: "/dashboard" }],
    [/^\/dashboard\/plan-cuentas\/configurar$/, { nombre: "el configurador del plan de cuentas", volverA: "/dashboard/plan-cuentas" }],
    [/^\/dashboard\/plan-cuentas$/, { nombre: "el plan de cuentas", volverA: "/dashboard" }],
    [/^\/dashboard\/periodos$/, { nombre: "los períodos", volverA: "/dashboard" }],
    [/^\/dashboard\/parametros$/, { nombre: "los parámetros de contabilización", volverA: "/dashboard" }],
    [/^\/dashboard\/contabilizacion$/, { nombre: "la contabilización", volverA: "/dashboard" }],
    [/^\/dashboard\/f29$/, { nombre: "el Formulario 29", volverA: "/dashboard" }],
    [/^\/dashboard\/documentos\/[^/]+$/, { nombre: "el documento", volverA: "/dashboard/documentos" }],
    [/^\/dashboard\/documentos$/, { nombre: "los documentos", volverA: "/dashboard" }],
    [/^\/dashboard\/terceros\/nuevo$/, { nombre: "el formulario de tercero", volverA: "/dashboard/terceros" }],
    [/^\/dashboard\/terceros\/[^/]+$/, { nombre: "el tercero", volverA: "/dashboard/terceros" }],
    [/^\/dashboard\/terceros$/, { nombre: "los terceros", volverA: "/dashboard" }],
    [/^\/dashboard\/usuarios$/, { nombre: "los usuarios", volverA: "/dashboard" }],
    [/^\/dashboard\/copiloto$/, { nombre: "el Copiloto IA", volverA: "/dashboard" }],
    [/^\/dashboard\/auditoria$/, { nombre: "la auditoría", volverA: "/dashboard" }],
    [/^\/dashboard$/, { nombre: "el panel de control", volverA: "/dashboard" }],
];

const GENERICA: Vista = { nombre: "esta pantalla", volverA: "/dashboard" };

/** La vista a la que pertenece una ruta del panel; una genérica si no se reconoce. */
export function vistaDeLaRuta(ruta: string): Vista {
    const limpia = ruta.length > 1 ? ruta.replace(/\/+$/, "") : ruta;
    return VISTAS.find(([patron]) => patron.test(limpia))?.[1] ?? GENERICA;
}
