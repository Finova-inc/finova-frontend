/* ============================================================================
   Formato de cifras, fechas e identificadores chilenos.

   ---------------------------------------------------------------------------
   POR QUE UN MODULO Y NO UNA FUNCION EN CADA PAGINA
   ---------------------------------------------------------------------------
   `formatearFecha` ya estaba escrita dentro de app/dashboard/empresas/page.tsx.
   En cuanto una segunda pantalla necesitara lo mismo, habria dos copias que se
   separan con el tiempo: una muestra "05-09-2026" y otra "5 sep 2026", y nadie
   nota que son la misma funcion divergiendo.

   El formato de montos es peor todavia si se duplica, porque ahi un error no se
   ve raro: se ve como otra cifra.
   ========================================================================== */

/**
 * Formatea un monto en pesos chilenos.
 *
 * ---------------------------------------------------------------------------
 * POR QUE EL PARAMETRO ACEPTA STRING
 * ---------------------------------------------------------------------------
 * El backend define los montos como `numeric(19,4)` y TypeORM los entrega como
 * STRING, no como number. Es deliberado de su parte: un numeric de 19 digitos
 * no cabe en el double de JavaScript, que solo garantiza 15-16 digitos
 * significativos. Convertir a number puede perder precision en silencio.
 *
 * Aqui se convierte igual, porque Intl.NumberFormat necesita un number, pero
 * el riesgo real es nulo: para que un monto en pesos pierda precision tendria
 * que superar los nueve mil billones. Lo que NO se debe hacer es sumar montos
 * en el cliente con `+`; para eso el backend tiene decimal.util.ts.
 *
 * El peso chileno no usa decimales en la practica, asi que se redondea a entero:
 * mostrar "$1.250.000,00" en una interfaz contable chilena se ve como un error
 * de localizacion.
 */
export function formatearCLP(monto: string | number): string {
    const valor = typeof monto === "string" ? Number(monto) : monto;

    // Un NaN llegando a pantalla como "$NaN" es peor que un guion: parece un
    // fallo del sistema en vez de un dato ausente.
    if (!Number.isFinite(valor)) {
        return "—";
    }

    return new Intl.NumberFormat("es-CL", {
        style: "currency",
        currency: "CLP",
        maximumFractionDigits: 0,
    }).format(valor);
}

/**
 * Formatea un monto abreviado para ejes de graficos: 45000000 -> "45M".
 *
 * En un eje vertical no cabe "$45.000.000" seis veces sin encimarse, y la
 * precision ahi no aporta: el valor exacto se lee en la tarjeta de resumen.
 */
export function formatearMontoCorto(monto: string | number): string {
    const valor = typeof monto === "string" ? Number(monto) : monto;

    if (!Number.isFinite(valor)) {
        return "—";
    }

    const absoluto = Math.abs(valor);

    if (absoluto >= 1_000_000) {
        return `${Math.round(valor / 1_000_000)}M`;
    }

    if (absoluto >= 1_000) {
        return `${Math.round(valor / 1_000)}k`;
    }

    return String(Math.round(valor));
}

/**
 * Fecha corta: "05-09-2026".
 *
 * Reemplaza la copia local que vivia en la pagina de empresas.
 */
export function formatearFecha(iso: string): string {
    const fecha = new Date(iso);

    if (Number.isNaN(fecha.getTime())) {
        return "—";
    }

    return fecha.toLocaleDateString("es-CL", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
    });
}

/**
 * Fecha legible: "5 sep 2026". Para textos donde la fecha se lee, no se compara.
 */
export function formatearFechaLarga(iso: string): string {
    const fecha = new Date(iso);

    if (Number.isNaN(fecha.getTime())) {
        return "—";
    }

    return fecha.toLocaleDateString("es-CL", {
        day: "numeric",
        month: "short",
        year: "numeric",
    });
}

/**
 * Formatea un RUT chileno con puntos y guion: "765432104" -> "76.543.210-4".
 *
 * El backend ya guarda el RUT formateado (CreateEmpresaDto exige el patron con
 * puntos), asi que esto es defensivo: si llega sin formato, se muestra bien
 * igual. No valida el digito verificador; eso es trabajo del backend.
 */
export function formatearRut(rut: string): string {
    const limpio = rut.replace(/[^0-9kK]/g, "").toUpperCase();

    if (limpio.length < 2) {
        return rut;
    }

    const cuerpo = limpio.slice(0, -1);
    const verificador = limpio.slice(-1);

    return `${cuerpo.replace(/\B(?=(\d{3})+(?!\d))/g, ".")}-${verificador}`;
}

/**
 * Fecha contable 'YYYY-MM-DD' como "30-09-2026".
 *
 * ---------------------------------------------------------------------------
 * POR QUE NO USA formatearFecha
 * ---------------------------------------------------------------------------
 * formatearFecha hace new Date(iso). Una fecha sin hora ('2026-09-30') se lee
 * como medianoche UTC, y en Chile (UTC-3 o UTC-4) eso es el 29 de septiembre:
 * el asiento apareceria un dia antes, y el del ultimo dia del mes, en el mes
 * anterior. Aqui se reordena el texto sin convertirlo nunca en instante.
 */
export function formatearFechaContable(fecha: string | null | undefined): string {
    const partes = /^(\d{4})-(\d{2})-(\d{2})$/.exec(fecha ?? "");
    return partes ? `${partes[3]}-${partes[2]}-${partes[1]}` : "—";
}

/**
 * La fecha de hoy en Chile, 'YYYY-MM-DD'.
 *
 * Vercel ejecuta el servidor en UTC: toISOString() daria la fecha de manana
 * desde las 20:00 o 21:00 de Chile. Se arma con formatToParts para no depender
 * del orden de dia y mes de un locale.
 */
export function hoyEnChile(ahora: Date = new Date()): string {
    const partes = new Intl.DateTimeFormat("en-US", {
        timeZone: "America/Santiago",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).formatToParts(ahora);
    const parte = (tipo: Intl.DateTimeFormatPartTypes) =>
        partes.find((p) => p.type === tipo)?.value ?? "";
    return `${parte("year")}-${parte("month")}-${parte("day")}`;
}

/** Nombre de cada tipo de comprobante del formato de libros electronicos del SII. */
export const NOMBRE_TIPO_COMPROBANTE: Record<string, string> = {
    I: "Ingreso",
    E: "Egreso",
    T: "Traspaso",
    U: "Único",
    O: "Otro",
};

/** "T-12 / 2026": como se cita un comprobante. */
export function formatearComprobante(tipo: string, numero: number, anio: number): string {
    return `${tipo}-${numero} / ${anio}`;
}

/** Nombres de los meses en español, para ejes y rotulos de periodo. */
const MESES = [
    "ene", "feb", "mar", "abr", "may", "jun",
    "jul", "ago", "sep", "oct", "nov", "dic",
] as const;

const MESES_LARGOS = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre",
] as const;

/** "septiembre 2026", para periodos contables. */
export function nombrePeriodo(anio: number, mes: number): string {
    return `${MESES_LARGOS[mes - 1] ?? ""} ${anio}`.trim();
}

/**
 * Nombre corto del mes a partir del numero 1-12 que usa `periodo_contable.mes`.
 *
 * Devuelve cadena vacia ante un mes fuera de rango en vez de lanzar: un rotulo
 * en blanco degrada mejor que una pantalla caida.
 */
export function nombreMes(mes: number): string {
    return MESES[mes - 1] ?? "";
}
