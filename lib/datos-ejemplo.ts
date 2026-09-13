/* ============================================================================
   Datos de ejemplo del panel de control.

   ---------------------------------------------------------------------------
   POR QUE EXISTE ESTE ARCHIVO Y POR QUE ES UNO SOLO
   ---------------------------------------------------------------------------
   El diseno del panel pide cifras que el backend todavia no puede entregar:
   conciliacion bancaria (no existe el modulo), vencimientos (documento no tiene
   fecha_vencimiento) y flujo de caja (sin fechas de negocio no hay serie
   temporal).

   La alternativa a inventarlas seria dejar esos bloques vacios, pero entonces
   no se puede evaluar el diseno ni mostrarselo a nadie. Se opta por datos de
   ejemplo con dos condiciones estrictas:

   1. Todo vive AQUI. Cuando cada bloque se conecte a su endpoint, se borra su
      constante de este archivo y se elimina el import. Si los datos estuvieran
      repartidos por los componentes, quedarian restos meses despues.

   2. Todo bloque que los use se rotula en pantalla. La etiqueta "Sin backend" y
      el aviso de maqueta no son decorativos: presentar cifras inventadas sin
      marcarlas, en una herramienta contable, es hacerle creer a alguien que son
      sus numeros.

   Los tipos se declaran como los devolvera la API real —montos en string, como
   entrega numeric(19,4) de TypeORM— para que al conectar el backend cambie el
   origen del dato y no la forma del componente.
   ========================================================================== */

/* -------------------------------------------------------------------------
   ALERTAS
   ------------------------------------------------------------------------- */

export type SeveridadAlerta = "critica" | "aviso" | "info";

export type Alerta = {
    readonly id: string;
    readonly severidad: SeveridadAlerta;
    readonly icono: "alert" | "document" | "sync";
    readonly titulo: string;
    readonly detalle: string;
    /** Pastilla corta a la derecha del titulo: fecha limite o categoria. */
    readonly insignia?: string;
    /** Monto destacado. Excluyente con `accion`. */
    readonly monto?: string;
    /** Enlace de resolucion. Excluyente con `monto`. */
    readonly accion?: { readonly texto: string; readonly href: string };
};

export const ALERTAS_EJEMPLO: readonly Alerta[] = [
    {
        id: "iva-f29",
        severidad: "critica",
        icono: "alert",
        titulo: "IVA del F29 vence en 3 días",
        detalle: "Período agosto 2026 · débito $4.180.000 − crédito $2.930.000",
        insignia: "12 sep",
        monto: "1250000",
    },
    {
        id: "pagos-proveedores",
        severidad: "aviso",
        icono: "document",
        titulo: "5 facturas de proveedores vencen hoy",
        detalle: "Distribuidora Norte Ltda., Insumos Maipo SpA y 3 más",
        insignia: "Pagos",
        accion: { texto: "Ver listado", href: "/dashboard/documentos" },
    },
    {
        id: "dte-sin-contabilizar",
        severidad: "info",
        icono: "sync",
        titulo: "12 documentos del SII sin contabilizar",
        detalle: "9 facturas afectas (33) y 3 notas de crédito (61) recibidas esta semana",
        accion: { texto: "Contabilizar", href: "/dashboard/documentos" },
    },
];

/* -------------------------------------------------------------------------
   CONCILIACION BANCARIA
   ------------------------------------------------------------------------- */

export type Conciliacion = {
    readonly banco: string;
    readonly cuenta: string;
    readonly saldoBanco: string;
    readonly saldoLibros: string;
    readonly porcentajeAvance: number;
    readonly movimientosConciliados: number;
    readonly movimientosPendientes: number;
    readonly ultimaImportacion: string;
};

export const CONCILIACION_EJEMPLO: Conciliacion = {
    banco: "Banco Santander",
    cuenta: "Cuenta corriente ····1234",
    saldoBanco: "15450000",
    saldoLibros: "12300000",
    porcentajeAvance: 75,
    movimientosConciliados: 102,
    movimientosPendientes: 34,
    ultimaImportacion: "11 sep 2026, 08:42",
};

/* -------------------------------------------------------------------------
   FLUJO DE CAJA
   ------------------------------------------------------------------------- */

export type MesFlujo = {
    readonly mes: number;
    readonly ingresos: number;
    readonly egresos: number;
};

/**
 * Seis meses de flujo. Los valores estan en pesos, no abreviados: la
 * abreviacion del eje la hace formatearMontoCorto en el componente, para que el
 * dia que estos numeros vengan del backend no haya que preprocesarlos.
 */
export const FLUJO_EJEMPLO: readonly MesFlujo[] = [
    { mes: 4, ingresos: 31_000_000, egresos: 25_000_000 },
    { mes: 5, ingresos: 36_000_000, egresos: 28_000_000 },
    { mes: 6, ingresos: 34_000_000, egresos: 24_000_000 },
    { mes: 7, ingresos: 41_000_000, egresos: 30_000_000 },
    { mes: 8, ingresos: 38_000_000, egresos: 29_000_000 },
    { mes: 9, ingresos: 45_000_000, egresos: 32_000_000 },
];

/* -------------------------------------------------------------------------
   CARTERA
   ------------------------------------------------------------------------- */

export type TramoCartera = {
    readonly tramo: string;
    readonly porCobrar: string;
    readonly porPagar: string;
    /** Marca el tramo como moroso: se resalta la cifra por cobrar. */
    readonly vencido?: boolean;
};

export const CARTERA_EJEMPLO: readonly TramoCartera[] = [
    { tramo: "Al día", porCobrar: "12000000", porPagar: "8000000" },
    { tramo: "31 a 60 días", porCobrar: "4000000", porPagar: "2000000" },
    { tramo: "61 a 90 días", porCobrar: "1000000", porPagar: "0", vencido: true },
    { tramo: "Más de 90 días", porCobrar: "640000", porPagar: "0", vencido: true },
];
