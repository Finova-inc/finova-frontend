/* CSV de los libros y reportes. Funciones puras: la página arma las filas en el
   servidor y BotonCsv solo las descarga. */

import type { BalanceComprobacion, BalanceGeneral, ColumnasBalance, EstadoResultados, LibroMayor } from "./api";
import { filasACsv } from "./csv.ts";

/** Montos tal como los da el backend ("1500.0000"), sin formato: Excel los lee como número. */
const monto = (valor: string) => valor.replace(/\.0000$/, "");

const COLUMNAS_8: readonly (readonly [keyof ColumnasBalance, string])[] = [
    ["debitos", "Débitos"],
    ["creditos", "Créditos"],
    ["deudor", "Saldo deudor"],
    ["acreedor", "Saldo acreedor"],
    ["activo", "Inventario activo"],
    ["pasivo", "Inventario pasivo"],
    ["perdidas", "Resultado pérdidas"],
    ["ganancias", "Resultado ganancias"],
];

/** Balance de comprobación (4 columnas) o tributario (las 8). */
export function balanceACsv(balance: BalanceComprobacion, ocho: boolean): string {
    const columnas = ocho ? COLUMNAS_8 : COLUMNAS_8.slice(0, 4);
    return filasACsv([
        [`${balance.desde} al ${balance.hasta}`],
        ["Código", "Cuenta", ...columnas.map(([, titulo]) => titulo)],
        ...balance.filas.map((f) => [f.codigo, f.nombre, ...columnas.map(([clave]) => monto(f[clave]))]),
        ["", "Totales", ...columnas.map(([clave]) => monto(balance.totales[clave]))],
        ...(ocho
            ? [
                  // Lo que iguala las columnas: la utilidad va a pasivo y pérdidas; la pérdida, a activo y ganancias.
                  [
                      "",
                      "Resultado del ejercicio",
                      "", "", "", "",
                      monto(balance.resultado.perdida),
                      monto(balance.resultado.utilidad),
                      monto(balance.resultado.utilidad),
                      monto(balance.resultado.perdida),
                  ],
                  ["", "Sumas iguales", ...columnas.map(([clave]) => monto(balance.sumas_iguales[clave]))],
              ]
            : []),
    ]);
}

export function balanceGeneralACsv(b: BalanceGeneral): string {
    const t = b.totales;
    const seccion = (s: BalanceGeneral["secciones"][number]) => [
        [s.titulo, "", monto(s.total)],
        ...s.cuentas.map((c) => [c.codigo, c.nombre, monto(c.saldo)]),
    ];
    const de = (...rubros: string[]) => b.secciones.filter((s) => rubros.includes(s.rubro)).flatMap(seccion);
    return filasACsv([
        [`Balance general al ${b.hasta}`],
        ["Código", "Cuenta", "Saldo"],
        ...de("activo_corriente", "activo_no_corriente"),
        ["", "Total activos", monto(t.activo)],
        ...de("pasivo_corriente", "pasivo_no_corriente"),
        ["", "Total pasivos", monto(t.pasivo)],
        ...de("patrimonio"),
        ["", "Resultados de ejercicios anteriores", monto(t.resultados_anteriores)],
        ["", "Resultado del ejercicio", monto(t.resultado_ejercicio)],
        ["", "Total pasivos y patrimonio", monto(t.pasivo_mas_patrimonio)],
    ]);
}

export function estadoResultadosACsv(e: EstadoResultados): string {
    const lineas = (cuentas: EstadoResultados["ingresos"]["cuentas"]) => cuentas.map((c) => [c.codigo, c.nombre, monto(c.saldo)]);
    return filasACsv([
        [`Estado de resultados ${e.desde} al ${e.hasta}`],
        ["Código", "Cuenta", "Monto"],
        ["", "Ingresos", monto(e.ingresos.total)],
        ...lineas(e.ingresos.cuentas),
        ["", "Gastos", monto(e.gastos.total)],
        ...lineas(e.gastos.cuentas),
        ["", "Resultado del período", monto(e.resultado)],
    ]);
}

/** Libro mayor de una cuenta; con `conAnalitico`, sigue el saldo por tercero. */
export function mayorACsv(mayor: LibroMayor, conAnalitico: boolean): string {
    const filas: string[][] = [
        [`${mayor.cuenta.codigo} ${mayor.cuenta.nombre}`, `${mayor.desde} al ${mayor.hasta}`],
        [],
        ["Fecha", "Comprobante", "Glosa", "Debe", "Haber", "Saldo"],
        ["", "", "Saldo anterior", "", "", monto(mayor.saldo_anterior)],
        ...mayor.movimientos.map((m) => [
            m.fecha_contable,
            `${m.tipo_comprobante}-${m.anio}-${m.numero}`,
            m.glosa ?? m.glosa_asiento,
            monto(m.debe),
            monto(m.haber),
            monto(m.saldo),
        ]),
        ["", "", "Totales", monto(mayor.totales.total_debe), monto(mayor.totales.total_haber), monto(mayor.totales.saldo_final)],
    ];
    if (conAnalitico && mayor.analitico) {
        filas.push(
            [],
            ["Detalle analítico"],
            ["Cuenta", "Código tercero (RUT)", "Nombre tercero", "Saldo anterior", "Debe", "Haber", "Saldo"],
            ...mayor.analitico.map((a) => [
                mayor.cuenta.codigo,
                a.rut ?? "",
                a.razon_social ?? "Sin tercero",
                monto(a.saldo_anterior),
                monto(a.debe),
                monto(a.haber),
                monto(a.saldo),
            ]),
        );
    }
    return filasACsv(filas);
}
