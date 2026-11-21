"use client";

import { useEffect, useRef, useState, type CSSProperties, type KeyboardEvent, type RefObject } from "react";

import { EstadoVacio } from "@/components/ui/EstadoVacio";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import type { MesResumen } from "@/lib/api";
import { formatearCLP, formatearMontoCorto, nombreMes, nombreMesLargo } from "@/lib/formato";
import {
    acumulado,
    alternarSeleccion,
    mesActivo,
    resultadoConSigno,
    tieneMovimiento,
    tonoDelResultado,
    type TonoResultado,
} from "@/lib/resumen-mensual";

/* ============================================================================
   Ingresos y gastos del ejercicio: barras pareadas por mes, con un mes elegido.

   ---------------------------------------------------------------------------
   QUE MUESTRA (Y QUE NO)
   ---------------------------------------------------------------------------
   Es el resultado devengado que sale del libro: cuentas de ingreso contra
   cuentas de gasto, mes a mes. No es flujo de caja: una venta a credito ya es
   ingreso aunque el cliente no haya pagado.

   ---------------------------------------------------------------------------
   QUE MES SE RESUME ARRIBA
   ---------------------------------------------------------------------------
   Por defecto, el ultimo mes CON movimiento, no el ultimo a secas: el mes en
   curso suele estar en $0 y resumir un $0 mientras las barras grandes son del
   mes anterior confunde. Quien quiera otro lo elige con un clic (o Enter) y
   otro clic en el mismo vuelve al de por defecto. La logica esta en
   lib/resumen-mensual.ts, con sus pruebas.

   ---------------------------------------------------------------------------
   COMPONENTE DE CLIENTE, CON EL HTML DE SERVIDOR COMPLETO
   ---------------------------------------------------------------------------
   Es "use client" porque la cabecera y las columnas comparten el mes elegido.
   El primer render (el del servidor) ya muestra el mes por defecto: el estado
   inicial es "sin eleccion" y los tooltips parten cerrados, asi que no hay
   cambio brusco ni diferencia de hidratacion. Los datos llegan como props
   serializables desde el Server Component del panel.

   ---------------------------------------------------------------------------
   HTML Y CSS, SIN LIBRERIA NI SVG
   ---------------------------------------------------------------------------
   La CSP de next.config.ts solo admite scripts propios y el proyecto no tiene
   dependencias de UI (ver Icon.tsx). Son dos series y hasta doce meses: barras
   que son <span> con la altura en porcentaje del tope del eje, y rotulos que
   son texto normal. Con un SVG de viewBox fijo el texto crecia con el ancho de
   la pantalla (de 12 a casi 19px en un monitor ancho); asi mide 12px siempre.
   Cada mes es un <button> de la altura completa de la columna (barras y
   rotulo): no hay elementos interactivos dentro de nada oculto a lectores.

   ---------------------------------------------------------------------------
   COLORES
   ---------------------------------------------------------------------------
   Ingresos y gastos son identidades, no estados: no van en el verde y el rojo
   de --positivo/--critico, que se reservan para "bien"/"mal". Celeste y rosa
   del estuche de destacadores, con el rosa un punto mas profundo que
   --hl-pink: asi el par pasa los chequeos de luminosidad, daltonismo y
   contraste (validate_palette.js del skill de visualizacion) en tema claro Y
   oscuro con los mismos valores. El Resultado si es un estado (utilidad o
   perdida) y usa los tokens de estado, siempre con el signo y la palabra.
   ========================================================================== */

const COLOR_INGRESOS = "#2f8cff";
const COLOR_GASTOS = "#f2437f";

/** Alto del area de barras. El ancho lo reparte CSS: el texto del grafico es HTML y mide 12px reales a cualquier ancho. */
const ALTO_AREA = "h-44";
/** Lineas de grilla, como fraccion del tope del eje. */
const FRACCIONES_GRILLA = [0.2, 0.4, 0.6, 0.8, 1];
/** Ancho del recuadro de datos (w-52) y espacio entre el recuadro y la columna. */
const ANCHO_TOOLTIP = "13rem";
const SEPARACION_TOOLTIP = "0.5rem";

type GraficoIngresosGastosProps = {
    readonly meses: readonly MesResumen[];
    readonly anio: number;
};

/**
 * Tope del eje: la cifra "limpia" mas chica que cubre el dato, en pasos de la
 * magnitud (1; 1,5; 2; 2,5; 3; 4; 5; 6; 8; 10). Son pasos en que cada una de las
 * cinco lineas de grilla cae en un valor de un decimal (con 1,5 las lineas
 * valen 0,3 - 0,6 - 0,9...). Redondear siempre a la magnitud siguiente dejaba
 * 1,1 millones en un eje de 2: las barras ocupaban la mitad del alto. La
 * escala sigue siendo lineal y parte del cero: la proporcion no se deforma.
 */
function topeDelEje(maximo: number): number {
    if (maximo <= 0) return 1;
    const magnitud = 10 ** Math.floor(Math.log10(maximo));
    const paso = [1, 1.5, 2, 2.5, 3, 4, 5, 6, 8, 10].find((p) => p * magnitud >= maximo) ?? 10;
    return paso * magnitud;
}

const conMayuscula = (texto: string) => texto.charAt(0).toUpperCase() + texto.slice(1);
const enMinuscula = (mes: number) => nombreMesLargo(mes).toLowerCase();

/** Color del texto del Resultado: tokens de estado; el neutro (cero) va en tinta. */
const COLOR_RESULTADO: Record<TonoResultado, string> = {
    utilidad: "text-[var(--positivo)]",
    perdida: "text-[var(--critico)]",
    neutro: "text-[var(--foreground)]",
};
const PALABRA_RESULTADO: Record<TonoResultado, string | null> = {
    utilidad: "Utilidad",
    perdida: "Pérdida",
    neutro: null,
};

/** Lo que dice el lector de pantalla de un mes: "octubre: ingresos $X, gastos $Y, resultado $Z". */
function etiquetaDelMes(mes: MesResumen): string {
    if (!tieneMovimiento(mes)) return `${enMinuscula(mes.mes)}: sin movimientos`;
    return `${enMinuscula(mes.mes)}: ingresos ${formatearCLP(mes.ingresos)}, gastos ${formatearCLP(mes.gastos)}, resultado ${resultadoConSigno(mes.resultado)}`;
}

export function GraficoIngresosGastos({ meses, anio }: GraficoIngresosGastosProps) {
    // null = nadie eligio: se muestra el mes por defecto.
    const [seleccion, setSeleccion] = useState<number | null>(null);
    // Mes con el recuadro de datos abierto (cursor o foco).
    const [mesTooltip, setMesTooltip] = useState<number | null>(null);
    // Mes que entra con Tab (los demas, con flechas): null = el mostrado.
    const [mesFoco, setMesFoco] = useState<number | null>(null);
    // El cruce suave de la cabecera solo existe despues de la primera eleccion: al cargar no hay nada que cruzar.
    const [huboEleccion, setHuboEleccion] = useState(false);
    const botones = useRef(new Map<number, HTMLButtonElement>());

    const mesMostrado = mesActivo(meses, seleccion);
    const activo = meses.find((m) => m.mes === mesMostrado);
    const mesConTab = mesFoco !== null && meses.some((m) => m.mes === mesFoco) ? mesFoco : mesMostrado;

    // Escape cierra el recuadro aunque el foco no este en el grafico (caso del cursor encima).
    useEffect(() => {
        if (mesTooltip === null) return;
        const alTeclear = (evento: globalThis.KeyboardEvent) => {
            if (evento.key === "Escape") setMesTooltip(null);
        };
        window.addEventListener("keydown", alTeclear);
        return () => window.removeEventListener("keydown", alTeclear);
    }, [mesTooltip]);

    const ultimo = meses[meses.length - 1];

    function elegir(mes: number) {
        setSeleccion(alternarSeleccion(mesMostrado, mes));
        setMesFoco(mes);
        setHuboEleccion(true);
    }

    return (
        <Panel sinRelleno>
            <div className="px-5 pt-4">
                <PanelCabecera titulo="Ingresos y gastos" nota={`Ejercicio ${anio} · según el libro`} escala="legible" />
            </div>

            {activo && ultimo ? (
                <Resumen activo={activo} ultimo={ultimo} meses={meses} cruzar={huboEleccion} />
            ) : null}

            <div className="px-3 pb-4 pt-2">
                {activo === undefined ? (
                    <div className="px-2 py-6">
                        <EstadoVacio icono="ledger">Aún no hay asientos de ingresos o gastos en {anio}.</EstadoVacio>
                    </div>
                ) : (
                    <>
                        {/* Región con scroll: enfocable para que el teclado también pueda desplazarla. */}
                        <div
                            role="region"
                            aria-label={`Gráfico de ingresos y gastos de ${anio}; se desplaza en horizontal`}
                            tabIndex={0}
                            className="overflow-x-auto rounded-lg focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--accent)]"
                        >
                            <div className="min-w-[32rem]">
                                <Barras
                                    meses={meses}
                                    mesMostrado={activo.mes}
                                    mesConTab={mesConTab}
                                    mesTooltip={mesTooltip}
                                    botones={botones}
                                    alElegir={elegir}
                                    alAbrirDatos={setMesTooltip}
                                    alEnfocar={setMesFoco}
                                />
                            </div>
                        </div>
                        <TablaDeDatos datos={meses} anio={anio} />
                    </>
                )}
            </div>
        </Panel>
    );
}

/**
 * Cabecera: el mes elegido en grande, sus tres cifras (el Resultado con mas
 * peso) y, discreto, el acumulado del ejercicio. Es una region aria-live: al
 * elegir otro mes el lector de pantalla anuncia el cambio.
 */
function Resumen({
    activo,
    ultimo,
    meses,
    cruzar,
}: {
    readonly activo: MesResumen;
    readonly ultimo: MesResumen;
    readonly meses: readonly MesResumen[];
    /** Despues de la primera eleccion, cada mes nuevo entra con un fundido corto (las cifras no se animan: aparecen exactas). */
    readonly cruzar: boolean;
}) {
    const nombre = enMinuscula(activo.mes);
    const tono = tonoDelResultado(activo.resultado);
    const palabra = PALABRA_RESULTADO[tono];
    const total = acumulado(meses);
    const tonoTotal = tonoDelResultado(total.resultado);

    // El mes en curso vacio se avisa mientras no sea el que se mira.
    const enCursoVacio = !tieneMovimiento(ultimo) && ultimo.mes !== activo.mes;
    const notas = [
        tieneMovimiento(activo) ? null : `Sin movimientos en ${nombre}`,
        enCursoVacio ? `${conMayuscula(enMinuscula(ultimo.mes))}: sin movimientos aún` : null,
    ].filter((nota): nota is string => nota !== null);

    return (
        <div aria-live="polite" aria-atomic="true" className="px-5 pt-3">
            {/* key por mes: el contenido se vuelve a montar y su fundido corre de nuevo; la region aria-live no. */}
            <div key={activo.mes} className={cruzar ? "animate-aparecer" : undefined}>
                <p className="font-display text-2xl font-semibold tracking-[-0.01em]">{conMayuscula(nombre)}</p>

                <div className="mt-2 flex flex-wrap items-end gap-x-6 gap-y-3">
                    <CifraDelMes etiqueta={`Ingresos de ${nombre}`} valor={formatearCLP(activo.ingresos)} color={COLOR_INGRESOS} />
                    <CifraDelMes etiqueta={`Gastos de ${nombre}`} valor={formatearCLP(activo.gastos)} color={COLOR_GASTOS} />

                    <div className="flex flex-col gap-0.5">
                        <span className="text-xs text-[var(--foreground-muted)]">Resultado de {nombre}</span>
                        <span className="flex items-baseline gap-2">
                            <span className={`tabular font-display text-2xl font-bold ${COLOR_RESULTADO[tono]}`}>
                                {resultadoConSigno(activo.resultado)}
                            </span>
                            {palabra ? <span className={`text-xs font-semibold ${COLOR_RESULTADO[tono]}`}>{palabra}</span> : null}
                        </span>
                    </div>
                </div>

                {notas.map((nota) => (
                    <p key={nota} className="mt-2 text-xs text-[var(--foreground-muted)]">
                        {nota}
                    </p>
                ))}

                <p className="tabular mt-3 border-t border-[var(--border-subtle)] pt-2 text-xs text-[var(--foreground-muted)]">
                    Acumulado de enero a {enMinuscula(ultimo.mes)}: ingresos {formatearCLP(total.ingresos)} · gastos{" "}
                    {formatearCLP(total.gastos)} · resultado{" "}
                    <span className="font-semibold text-[var(--foreground)]">{resultadoConSigno(total.resultado)}</span>
                    {PALABRA_RESULTADO[tonoTotal] ? ` (${PALABRA_RESULTADO[tonoTotal]?.toLowerCase()})` : ""}
                </p>
            </div>
        </div>
    );
}

function Barras({
    meses,
    mesMostrado,
    mesConTab,
    mesTooltip,
    botones,
    alElegir,
    alAbrirDatos,
    alEnfocar,
}: {
    readonly meses: readonly MesResumen[];
    readonly mesMostrado: number;
    readonly mesConTab: number | null;
    readonly mesTooltip: number | null;
    readonly botones: RefObject<Map<number, HTMLButtonElement>>;
    readonly alElegir: (mes: number) => void;
    readonly alAbrirDatos: (mes: number | null) => void;
    readonly alEnfocar: (mes: number) => void;
}) {
    // Los montos llegan en string; se pasan a numero SOLO para la geometria.
    // Un mes con ingresos negativos (una nota de credito mayor que las ventas)
    // se dibuja en cero: el recuadro y la cabecera muestran la cifra real.
    const valores = meses.map((m) => ({ ingresos: Number(m.ingresos), gastos: Number(m.gastos) }));
    const tope = topeDelEje(Math.max(...valores.flatMap((v) => [v.ingresos, v.gastos]), 0));
    // Una barra con dato nunca desaparece: min-h de 2px.
    const alto = (valor: number) => ({ height: `${(Math.max(valor, 0) / tope) * 100}%` });

    // Flechas, Inicio y Fin pasan el foco de un mes a otro (Tab entra una sola vez al grupo).
    function alTeclear(evento: KeyboardEvent<HTMLButtonElement>, indice: number) {
        const destino =
            evento.key === "ArrowRight" ? indice + 1
            : evento.key === "ArrowLeft" ? indice - 1
            : evento.key === "Home" ? 0
            : evento.key === "End" ? meses.length - 1
            : null;
        if (destino === null) return;
        evento.preventDefault();
        botones.current.get(meses[Math.min(Math.max(destino, 0), meses.length - 1)].mes)?.focus();
    }

    const indiceTooltip = meses.findIndex((m) => m.mes === mesTooltip);

    return (
        <div className="grid grid-cols-[3rem_minmax(0,1fr)] gap-x-2 pb-8 pt-2">
            {/* Eje vertical: cada rotulo centrado en su linea de grilla. */}
            <div aria-hidden="true" className={`relative ${ALTO_AREA} text-xs tabular text-[var(--foreground-muted)]`}>
                {[...FRACCIONES_GRILLA, 0].map((f) => (
                    <span key={f} className="absolute right-0 translate-y-1/2 leading-none" style={{ bottom: `${f * 100}%` }}>
                        {f === 0 ? "0" : formatearMontoCorto(f * tope)}
                    </span>
                ))}
            </div>

            <div className={`relative ${ALTO_AREA} border-b border-[var(--border-strong)]`}>
                <div aria-hidden="true">
                    {FRACCIONES_GRILLA.map((f) => (
                        <div
                            key={f}
                            className="absolute inset-x-0 border-t border-[var(--border-subtle)]"
                            style={{ bottom: `${f * 100}%` }}
                        />
                    ))}
                </div>

                {/* Un boton por mes, de la altura de la columna mas el rotulo (que cuelga bajo la linea del cero). */}
                <div
                    role="group"
                    aria-label="Meses del ejercicio: elige uno para ver su resumen"
                    className="absolute inset-x-0 -bottom-8 top-0 flex"
                >
                    {meses.map((mes, indice) => {
                        const mostrado = mes.mes === mesMostrado;
                        const vacio = !tieneMovimiento(mes);

                        return (
                            <button
                                key={mes.mes}
                                ref={(el) => {
                                    if (el) botones.current.set(mes.mes, el);
                                    else botones.current.delete(mes.mes);
                                }}
                                type="button"
                                aria-pressed={mostrado}
                                aria-label={etiquetaDelMes(mes)}
                                tabIndex={mes.mes === mesConTab ? 0 : -1}
                                onClick={() => alElegir(mes.mes)}
                                onKeyDown={(evento) => alTeclear(evento, indice)}
                                onMouseEnter={() => alAbrirDatos(mes.mes)}
                                onMouseLeave={() => alAbrirDatos(null)}
                                onFocus={() => {
                                    alEnfocar(mes.mes);
                                    alAbrirDatos(mes.mes);
                                }}
                                onBlur={() => alAbrirDatos(null)}
                                className={`flex min-w-0 flex-1 cursor-pointer flex-col rounded-md px-1 outline-offset-[-2px] focus-visible:outline-2 focus-visible:outline-[color:var(--foreground)] ${
                                    mostrado
                                        ? "bg-[var(--background-raised)]"
                                        : "hover:bg-[color-mix(in_srgb,var(--background-raised)_60%,transparent)]"
                                }`}
                            >
                                <span className={`flex ${ALTO_AREA} w-full items-end justify-center gap-[3px]`}>
                                    {vacio ? (
                                        // Mes sin movimiento: una marca baja en lugar de dos barras de alto cero. Se atenua
                                        // por forma y no con opacidad: el rotulo del mes conserva su contraste.
                                        <span className="mb-px block h-0.5 w-4 rounded-full bg-[var(--border-strong)]" />
                                    ) : (
                                        <>
                                            {/* Las barras crecen desde la base al montar (animate-barra), con 25 ms de
                                                retraso por mes. Son los mismos elementos mientras se elige otro mes: no se repite. */}
                                            <span
                                                className="block min-h-[2px] w-full max-w-[2rem] origin-bottom animate-barra rounded-t-[3px] [animation-delay:calc(var(--i)*25ms)]"
                                                style={{ ...alto(valores[indice].ingresos), background: COLOR_INGRESOS, "--i": indice } as CSSProperties}
                                            />
                                            <span
                                                className="block min-h-[2px] w-full max-w-[2rem] origin-bottom animate-barra rounded-t-[3px] [animation-delay:calc(var(--i)*25ms)]"
                                                style={{ ...alto(valores[indice].gastos), background: COLOR_GASTOS, "--i": indice } as CSSProperties}
                                            />
                                        </>
                                    )}
                                </span>
                                <span
                                    className={`block h-8 pt-1.5 text-center text-xs ${
                                        mostrado ? "font-bold text-[var(--foreground)]" : "text-[var(--foreground-muted)]"
                                    }`}
                                >
                                    {nombreMes(mes.mes)}
                                </span>
                            </button>
                        );
                    })}
                </div>

                {indiceTooltip >= 0 ? (
                    <DatosDelMes mes={meses[indiceTooltip]} indice={indiceTooltip} total={meses.length} />
                ) : null}
            </div>
        </div>
    );
}

/**
 * Recuadro con los datos del mes bajo el cursor o el foco. Solo visual
 * (aria-hidden): el lector de pantalla ya tiene el aria-label del boton.
 *
 * Va junto a la columna, no encima: en la mitad izquierda, a su derecha; en la
 * derecha, a su izquierda. clamp() lo mantiene dentro del area del grafico sin
 * medir nada (los extremos se desplazan), y pointer-events-none evita que
 * atrape el puntero. Sin animacion: aparece y desaparece.
 */
function DatosDelMes({ mes, indice, total }: { readonly mes: MesResumen; readonly indice: number; readonly total: number }) {
    const izquierda = (indice / total) * 100;
    const derecha = ((indice + 1) / total) * 100;
    const ladoDerecho = indice < total / 2;
    const maximo = `calc(100% - ${ANCHO_TOOLTIP})`;
    const left = ladoDerecho
        ? `clamp(0px, calc(${derecha}% + ${SEPARACION_TOOLTIP}), ${maximo})`
        : `clamp(0px, calc(${izquierda}% - ${SEPARACION_TOOLTIP} - ${ANCHO_TOOLTIP}), ${maximo})`;
    const tono = tonoDelResultado(mes.resultado);

    return (
        <div
            aria-hidden="true"
            style={{ left, width: ANCHO_TOOLTIP }}
            className="pointer-events-none absolute top-1 z-20 animate-aparecer rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] p-3 text-xs text-[var(--foreground)] shadow-[0_8px_24px_rgb(0_0_0/0.18)]"
        >
            <p className="font-display text-sm font-semibold">{conMayuscula(enMinuscula(mes.mes))}</p>
            {tieneMovimiento(mes) ? (
                <dl className="mt-2 grid grid-cols-[1fr_auto] gap-x-3 gap-y-1">
                    <dt className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)]">
                        <span className="size-2 shrink-0 rounded-sm" style={{ background: COLOR_INGRESOS }} />
                        Ingresos
                    </dt>
                    <dd className="tabular text-right font-semibold">{formatearCLP(mes.ingresos)}</dd>
                    <dt className="inline-flex items-center gap-1.5 text-[var(--foreground-muted)]">
                        <span className="size-2 shrink-0 rounded-sm" style={{ background: COLOR_GASTOS }} />
                        Gastos
                    </dt>
                    <dd className="tabular text-right font-semibold">{formatearCLP(mes.gastos)}</dd>
                    <dt className="border-t border-[var(--border-subtle)] pt-1 text-[var(--foreground-muted)]">Resultado</dt>
                    <dd className={`tabular border-t border-[var(--border-subtle)] pt-1 text-right font-bold ${COLOR_RESULTADO[tono]}`}>
                        {resultadoConSigno(mes.resultado)}
                    </dd>
                </dl>
            ) : (
                <p className="mt-1 text-[var(--foreground-muted)]">Sin movimientos</p>
            )}
        </div>
    );
}

/**
 * Los datos del gráfico como tabla, solo para lector de pantalla (sr-only): el
 * dibujo es decorativo y esta tabla dice lo mismo, mes por mes y con la cifra exacta.
 */
function TablaDeDatos({ datos, anio }: { readonly datos: readonly MesResumen[]; readonly anio: number }) {
    return (
        // El div recorta: una <table> con sr-only no respeta el ancho de 1px y ensancha la pagina en un celular.
        <div className="sr-only">
            <table>
                <caption>Ingresos y gastos por mes, ejercicio {anio}</caption>
                <thead>
                    <tr>
                        <th scope="col">Mes</th>
                        <th scope="col">Ingresos</th>
                        <th scope="col">Gastos</th>
                        <th scope="col">Resultado</th>
                    </tr>
                </thead>
                <tbody>
                    {datos.map((d) => (
                        <tr key={d.mes}>
                            <th scope="row">{nombreMesLargo(d.mes)}</th>
                            <td>{formatearCLP(d.ingresos)}</td>
                            <td>{formatearCLP(d.gastos)}</td>
                            <td>{resultadoConSigno(d.resultado)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

/**
 * Cifra del mes elegido. Las de ingresos y gastos llevan la muestra de color
 * de su serie: hacen de leyenda del grafico. El valor va en tinta de texto,
 * nunca en el color de la serie.
 */
function CifraDelMes({
    etiqueta,
    valor,
    color,
}: {
    readonly etiqueta: string;
    readonly valor: string;
    readonly color: string;
}) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="inline-flex items-center gap-1.5 text-xs text-[var(--foreground-muted)]">
                <span className="size-2 shrink-0 rounded-sm" style={{ background: color }} />
                {etiqueta}
            </span>
            <span className="tabular font-display text-xl font-semibold">{valor}</span>
        </div>
    );
}
