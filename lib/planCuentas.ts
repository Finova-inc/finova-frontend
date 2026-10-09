/**
 * Piezas compartidas del plan de cuentas.
 *
 * Un solo archivo, sin "use client"/"use server", para poder importarlo tanto
 * desde un Server Component (la página, el libro diario) como desde un
 * componente cliente (el árbol, el formulario). Lo prueba planCuentas.test.mjs.
 */

import type { CuentaContable, CuentaPropiaInput, FilaPlantilla } from "./api";

export interface ClaseDeCuenta {
    readonly id: number;
    readonly nombre: string;
    /** Lado en que crece el saldo: deudora (activos, gastos) o acreedora (pasivos, patrimonio, ingresos). */
    readonly naturaleza: "deudora" | "acreedora";
}

/** 1 Activo, 2 Pasivo, 3 Patrimonio, 4 Ingreso, 5 Gasto (cat_tipo_cuenta), con los nombres NIIF. */
export const CLASES_DE_CUENTA: readonly ClaseDeCuenta[] = [
    { id: 1, nombre: "Activos", naturaleza: "deudora" },
    { id: 2, nombre: "Pasivos", naturaleza: "acreedora" },
    { id: 3, nombre: "Patrimonio", naturaleza: "acreedora" },
    { id: 4, nombre: "Ingresos", naturaleza: "acreedora" },
    { id: 5, nombre: "Costos y gastos", naturaleza: "deudora" },
];

export function claseDe(idTipoCuenta: number): ClaseDeCuenta {
    return CLASES_DE_CUENTA.find((clase) => clase.id === idTipoCuenta) ?? CLASES_DE_CUENTA[0];
}

/** Nombre del nivel según su profundidad en el árbol del plan base. */
const NIVELES = ["Clase", "Grupo", "Rubro", "Cuenta"] as const;
export function nombreNivel(profundidad: number): string {
    return NIVELES[Math.min(profundidad, NIVELES.length - 1)];
}

/** Lo mínimo de una cuenta para armar el árbol. */
interface Enlazable {
    readonly id_cuenta: string;
    readonly id_cuenta_padre: string | null;
}

export interface NodoCuenta<C extends Enlazable> {
    readonly cuenta: C;
    readonly hijas: NodoCuenta<C>[];
}

/**
 * Bosque de cuentas: cada una cuelga de su padre si está en la lista; si no,
 * es raíz. Conserva el orden de entrada (la API entrega por código), así que
 * las hermanas quedan ordenadas por código.
 *
 * Un plan plano (sin padres) es simplemente un bosque de raíces: se degrada a
 * la lista de siempre.
 */
export function construirArbol<C extends Enlazable>(cuentas: readonly C[]): NodoCuenta<C>[] {
    const nodos = new Map(cuentas.map((cuenta) => [cuenta.id_cuenta, { cuenta, hijas: [] as NodoCuenta<C>[] }]));
    const raices: NodoCuenta<C>[] = [];
    for (const nodo of nodos.values()) {
        const padre = nodo.cuenta.id_cuenta_padre ? nodos.get(nodo.cuenta.id_cuenta_padre) : undefined;
        if (padre) padre.hijas.push(nodo);
        else raices.push(nodo);
    }
    return raices;
}

/** Ids de todos los descendientes de `raiz`: ninguno puede ser su cuenta padre (sería un ciclo). */
export function descendientesDe(cuentas: readonly Enlazable[], raiz: string): Set<string> {
    const hijasPorPadre = new Map<string, string[]>();
    for (const cuenta of cuentas) {
        if (!cuenta.id_cuenta_padre) continue;
        hijasPorPadre.set(cuenta.id_cuenta_padre, [
            ...(hijasPorPadre.get(cuenta.id_cuenta_padre) ?? []),
            cuenta.id_cuenta,
        ]);
    }
    const encontrados = new Set<string>();
    const pendientes = [...(hijasPorPadre.get(raiz) ?? [])];
    while (pendientes.length > 0) {
        const id = pendientes.pop()!;
        if (encontrados.has(id)) continue;
        encontrados.add(id);
        pendientes.push(...(hijasPorPadre.get(id) ?? []));
    }
    return encontrados;
}

/**
 * Siguiente código libre dentro de una agrupación: el código del padre más un
 * correlativo. Respeta el ancho que ya usan sus hijas; si no tiene, usa el del
 * plan base (clase 1 → grupo 11 → rubro 1101 → cuenta 1101001).
 *
 * Devuelve "" si el correlativo ya no cabe en ese ancho.
 */
export function siguienteCodigo(
    padre: { readonly codigo: string },
    hijas: readonly { readonly codigo: string }[],
): string {
    const propias = hijas
        .map((hija) => hija.codigo)
        .filter((codigo) => /^\d+$/.test(codigo) && codigo.startsWith(padre.codigo) && codigo.length > padre.codigo.length);
    const ancho =
        propias.length > 0
            ? propias[0].length - padre.codigo.length
            : padre.codigo.length === 1
              ? 1
              : padre.codigo.length === 2
                ? 2
                : 3;
    const usados = propias
        .filter((codigo) => codigo.length === padre.codigo.length + ancho)
        .map((codigo) => Number(codigo.slice(padre.codigo.length)));
    const siguiente = (usados.length > 0 ? Math.max(...usados) : 0) + 1;
    return siguiente < 10 ** ancho ? `${padre.codigo}${String(siguiente).padStart(ancho, "0")}` : "";
}

/** Minúsculas y sin tildes, para que "deposito" encuentre "Depósitos a plazo". */
export function normalizar(texto: string): string {
    return texto.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

/**
 * Celda de CSV: entre comillas si lo necesita, y nunca algo que Excel ejecute
 * como fórmula (un nombre "=HIPERVINCULO(...)" se escribe como texto).
 */
function celdaCsv(valor: string): string {
    const texto = /^[=+\-@\t\r]/.test(valor) ? `'${valor}` : valor;
    return /[;"\r\n]/.test(texto) ? `"${texto.replaceAll('"', '""')}"` : texto;
}

/**
 * El plan de cuentas en CSV para Excel en español (separado por punto y coma),
 * en orden jerárquico: cada agrupación seguida de lo que contiene.
 */
export function planACsv(cuentas: readonly CuentaContable[]): string {
    const filas = [["Código", "Nombre", "Nivel", "Clase", "Código SII", "Estado", "Con asientos"]];
    const recorrer = (nodos: readonly NodoCuenta<CuentaContable>[], profundidad: number) => {
        for (const { cuenta, hijas } of nodos) {
            filas.push([
                cuenta.codigo,
                cuenta.nombre,
                // Una imputable es "Cuenta" aunque cuelgue suelta (plan plano).
                cuenta.acepta_movimiento ? "Cuenta" : nombreNivel(Math.min(profundidad, 2)),
                claseDe(cuenta.id_tipo_cuenta).nombre,
                cuenta.codigo_sii ?? "",
                cuenta.is_active ? "Activa" : "Inactiva",
                cuenta.tiene_movimientos ? "Sí" : "No",
            ]);
            recorrer(hijas, profundidad + 1);
        }
    };
    recorrer(construirArbol(cuentas), 0);
    return filas.map((fila) => fila.map(celdaCsv).join(";")).join("\r\n");
}

/**
 * Cuántas cuentas y agrupaciones crearía "Configurar plan de cuentas": cada
 * código marcado, el rubro de cada cuenta propia y cada cuenta que la empresa
 * ya tiene, con su cadena de agrupaciones; menos lo que ya existe. Es el
 * cálculo de planificarPlantilla en el backend.
 *
 * ponytail: una cuenta que el usuario sacó de su rubro del plan base cuenta
 * ese rubro como nuevo, y el backend no lo crea; el aviso tras guardar da la
 * cifra real. Mandar la selección a GET /plantilla si hace falta exactitud.
 */
export function resumenConfiguracion(
    plantilla: readonly FilaPlantilla[],
    provistas: Readonly<Record<string, string>>,
    codigos: Iterable<string>,
    rubrosDePropias: Iterable<string>,
): { cuentas: number; agrupaciones: number } {
    const porCodigo = new Map(plantilla.map((fila) => [fila.codigo, fila]));
    const queridas = new Set<string>();
    const conAgrupaciones = (codigo: string) => {
        for (
            let actual: string | undefined = codigo;
            actual && !queridas.has(actual);
            actual = porCodigo.get(actual)?.codigoPadre
        ) {
            queridas.add(actual);
        }
    };
    [...codigos, ...rubrosDePropias, ...Object.keys(provistas)].forEach(conAgrupaciones);

    let cuentas = 0;
    let agrupaciones = 0;
    for (const codigo of queridas) {
        if (codigo in provistas) continue;
        if (porCodigo.get(codigo)?.acepta_movimiento === false) agrupaciones += 1;
        else cuentas += 1;
    }
    return { cuentas, agrupaciones };
}

/**
 * Lo que el backend rechazaría de una cuenta propia, dicho antes de guardar.
 * `ocupados` describe quién tiene ya cada código (`"Caja" del plan base`,
 * `tu cuenta "Banco Estado"`); `otrasPropias`, los códigos de las demás
 * cuentas propias de esta configuración.
 */
export function problemaDePropia(
    propia: CuentaPropiaInput,
    ocupados: ReadonlyMap<string, string>,
    otrasPropias: readonly string[],
): string | null {
    const { codigo, codigoPadre } = propia;
    if (!/^\d{1,20}$/.test(codigo)) return "El código lleva solo dígitos.";
    // El panel de control suma por prefijo: con otro código no contaría en su rubro.
    if (!codigo.startsWith(codigoPadre) || codigo.length === codigoPadre.length) {
        return `El código tiene que empezar con ${codigoPadre}, el de su rubro, y seguir con más dígitos.`;
    }
    const ocupado = ocupados.get(codigo);
    if (ocupado) return `El código ${codigo} ya es ${ocupado}.`;
    if (otrasPropias.includes(codigo)) return `El código ${codigo} se repite en otra cuenta propia.`;
    if (propia.nombre.trim().length < 3) return "El nombre necesita al menos 3 caracteres.";
    return null;
}
