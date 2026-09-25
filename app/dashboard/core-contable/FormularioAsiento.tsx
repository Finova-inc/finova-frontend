"use client";

/* ============================================================================
   Formulario de asiento: alta directa o edicion de un borrador.

   Es componente cliente por las lineas dinamicas y el cuadre en vivo. Los
   datos se envian a Server Actions (./actions.ts): el token nunca pasa por
   aqui, y las reglas contables las decide el backend. El formulario solo
   impide contabilizar lo que el backend igual rechazaria, para no hacer
   esperar a nadie por un "no cuadra".
   ========================================================================== */

import Link from "next/link";
import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import type { AsientoBorrador, TipoComprobante } from "@/lib/api";
import { CERO, formatearPesos, separarMiles, soloDigitos, sumarPesos, tieneMonto } from "@/lib/decimal";
import {
    contabilizarBorrador,
    contabilizarNuevo,
    descartarBorrador,
    guardarBorrador,
    type DatosAsiento,
    type LineaFormulario,
} from "./actions";

export interface CuentaOpcion {
    readonly id_cuenta: string;
    readonly codigo: string;
    readonly nombre: string;
    readonly id_tipo_cuenta: number;
}

export interface TerceroOpcion {
    readonly id_tercero: string;
    readonly rut: string;
    readonly razon_social: string;
}

type FormularioAsientoProps = {
    readonly cuentas: readonly CuentaOpcion[];
    readonly terceros: readonly TerceroOpcion[];
    /** Hoy en Chile, calculado en el servidor: el reloj del navegador puede mentir. */
    readonly hoy: string;
    readonly borrador?: AsientoBorrador | null;
};

const TIPOS: readonly { valor: TipoComprobante; nombre: string; ayuda: string }[] = [
    { valor: "I", nombre: "Ingreso", ayuda: "Entra dinero a caja o banco" },
    { valor: "E", nombre: "Egreso", ayuda: "Sale dinero de caja o banco" },
    { valor: "T", nombre: "Traspaso", ayuda: "Sin movimiento de dinero" },
];

const GRUPOS_CUENTA: Record<number, string> = {
    1: "Activo",
    2: "Pasivo",
    3: "Patrimonio",
    4: "Ingresos",
    5: "Gastos",
};

const LARGO_GLOSA = 120;

const CLASES_CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]";

const CLASES_CELDA =
    "w-full min-w-0 rounded-md border border-[var(--border-subtle)] bg-[var(--background)] px-2 py-1.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]";

type LineaEnPantalla = LineaFormulario & { readonly clave: string };

function lineaNueva(parcial: Partial<LineaFormulario> = {}): LineaEnPantalla {
    return {
        clave: crypto.randomUUID(),
        id_cuenta: parcial.id_cuenta ?? "",
        debe: parcial.debe ?? "",
        haber: parcial.haber ?? "",
        glosa: parcial.glosa ?? "",
        id_tercero: parcial.id_tercero ?? "",
    };
}

function lineasIniciales(borrador?: AsientoBorrador | null): LineaEnPantalla[] {
    const desdeBorrador = (borrador?.lineas ?? []).map((linea) => lineaNueva(linea));
    // Siempre al menos dos filas: un asiento con una sola linea no puede cuadrar.
    while (desdeBorrador.length < 2) desdeBorrador.push(lineaNueva());
    return desdeBorrador;
}

/**
 * Campo de pesos: muestra "119.000" y edita "119000".
 *
 * Con el separador de miles mientras se escribe, el cursor saltaria al
 * insertarse cada punto. Se muestra formateado solo fuera del foco.
 */
function CampoPesos({
    valor,
    alCambiar,
    etiqueta,
}: {
    readonly valor: string;
    readonly alCambiar: (digitos: string) => void;
    readonly etiqueta: string;
}) {
    const [enFoco, setEnFoco] = useState(false);

    return (
        <input
            inputMode="numeric"
            autoComplete="off"
            aria-label={etiqueta}
            placeholder="0"
            maxLength={19}
            value={enFoco ? valor : separarMiles(valor)}
            onFocus={() => setEnFoco(true)}
            onBlur={() => setEnFoco(false)}
            onChange={(evento) => alCambiar(soloDigitos(evento.target.value))}
            className={`tabular text-right ${CLASES_CELDA}`}
        />
    );
}

export function FormularioAsiento({ cuentas, terceros, hoy, borrador = null }: FormularioAsientoProps) {
    const idBase = useId();
    const [tipo, setTipo] = useState<TipoComprobante | "">(borrador?.tipo_comprobante ?? "T");
    const [fecha, setFecha] = useState(borrador?.fecha_contable ?? hoy);
    const [glosa, setGlosa] = useState(borrador?.glosa ?? "");
    const [lineas, setLineas] = useState<LineaEnPantalla[]>(() => lineasIniciales(borrador));
    const [version, setVersion] = useState(borrador?.version ?? 0);
    // Una clave por formulario: si la respuesta se pierde y se reintenta, el
    // backend reconoce el asiento y no lo duplica.
    const [claveIdempotencia] = useState(() => crypto.randomUUID());

    const [errores, setErrores] = useState<readonly string[]>([]);
    const [aviso, setAviso] = useState<string | null>(null);
    const [confirmando, setConfirmando] = useState(false);
    const [enCurso, iniciar] = useTransition();

    const totalDebe = sumarPesos(lineas.map((linea) => linea.debe));
    const totalHaber = sumarPesos(lineas.map((linea) => linea.haber));
    const diferencia = totalDebe > totalHaber ? totalDebe - totalHaber : totalHaber - totalDebe;
    const cuadra = totalDebe === totalHaber && totalDebe > CERO;

    // Lo que falta para poder contabilizar, en el orden en que se llena la
    // pantalla. Es la misma lista que haria rechazar el asiento en el backend.
    const faltantes: string[] = [];
    if (!tipo) faltantes.push("Elige el tipo de comprobante");
    if (!fecha) faltantes.push("Indica la fecha contable");
    if (fecha > hoy) faltantes.push("La fecha no puede ser posterior a hoy");
    if (glosa.trim().length < 3) faltantes.push("Escribe una glosa de al menos 3 caracteres");
    const conDatos = lineas.filter(
        (l) => l.id_cuenta || tieneMonto(l.debe) || tieneMonto(l.haber) || l.glosa.trim(),
    );
    if (conDatos.length < 2) faltantes.push("Completa al menos dos líneas");
    conDatos.forEach((linea, indice) => {
        if (!linea.id_cuenta) faltantes.push(`Línea ${indice + 1}: elige la cuenta`);
        if (tieneMonto(linea.debe) === tieneMonto(linea.haber)) {
            faltantes.push(`Línea ${indice + 1}: indica un monto en debe o en haber`);
        }
    });
    if (!cuadra && totalDebe + totalHaber > CERO) {
        faltantes.push(`El asiento no cuadra: diferencia de ${formatearPesos(diferencia)}`);
    }
    const listoParaContabilizar = faltantes.length === 0;

    function cambiarLinea(clave: string, cambios: Partial<LineaFormulario>) {
        setLineas((actuales) =>
            actuales.map((linea) => (linea.clave === clave ? { ...linea, ...cambios } : linea)),
        );
        setConfirmando(false);
    }

    function datos(): DatosAsiento {
        return {
            tipo_comprobante: tipo,
            fecha_contable: fecha,
            glosa,
            lineas: lineas.map((linea) => ({
                id_cuenta: linea.id_cuenta,
                debe: linea.debe,
                haber: linea.haber,
                glosa: linea.glosa,
                id_tercero: linea.id_tercero,
            })),
        };
    }

    function alGuardar() {
        setErrores([]);
        setAviso(null);
        iniciar(async () => {
            const resultado = await guardarBorrador(
                datos(),
                borrador ? { id: borrador.id_borrador, version } : null,
            );
            if (resultado.errores) setErrores(resultado.errores);
            if (resultado.version) setVersion(resultado.version);
            if (resultado.guardado) {
                setAviso(
                    `Borrador guardado a las ${new Date().toLocaleTimeString("es-CL", { hour: "2-digit", minute: "2-digit" })}.`,
                );
            }
        });
    }

    function alContabilizar() {
        setErrores([]);
        setAviso(null);
        iniciar(async () => {
            const resultado = borrador
                ? await contabilizarBorrador(datos(), { id: borrador.id_borrador, version })
                : await contabilizarNuevo(datos(), claveIdempotencia);
            // Si todo sale bien la accion redirige al asiento y esto no corre.
            if (resultado.version) setVersion(resultado.version);
            if (resultado.errores) {
                setErrores(resultado.errores);
                setConfirmando(false);
            }
        });
    }

    function alDescartar() {
        if (!borrador) return;
        // Un borrador no es parte del libro y se borra de verdad: se pregunta.
        if (!window.confirm("¿Descartar este borrador? Se perderá lo que tiene y no se puede deshacer.")) {
            return;
        }
        setErrores([]);
        iniciar(async () => {
            const resultado = await descartarBorrador(borrador.id_borrador);
            if (resultado.errores) setErrores(resultado.errores);
        });
    }

    const nombreTipo = TIPOS.find((t) => t.valor === tipo)?.nombre ?? "";
    const cuentasPorGrupo = Object.entries(GRUPOS_CUENTA).map(([id, nombre]) => ({
        nombre,
        cuentas: cuentas.filter((cuenta) => cuenta.id_tipo_cuenta === Number(id)),
    }));

    return (
        <form onSubmit={(evento) => evento.preventDefault()} className="flex flex-col gap-4">
            <Panel>
                <div className="grid gap-4 md:grid-cols-[auto_180px_1fr] md:items-start">
                    <fieldset>
                        <legend className="mb-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)]">
                            Tipo de comprobante
                        </legend>
                        <div className="inline-flex rounded-lg border border-[var(--border-strong)] p-0.5">
                            {TIPOS.map((opcion) => (
                                <label
                                    key={opcion.valor}
                                    title={opcion.ayuda}
                                    className={`cursor-pointer rounded-md px-3 py-1.5 text-[13px] font-medium transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent)] ${
                                        tipo === opcion.valor
                                            ? "bg-[var(--accent)] text-white"
                                            : "text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name={`${idBase}-tipo`}
                                        value={opcion.valor}
                                        checked={tipo === opcion.valor}
                                        onChange={() => {
                                            setTipo(opcion.valor);
                                            setConfirmando(false);
                                        }}
                                        className="sr-only"
                                    />
                                    {opcion.nombre}
                                </label>
                            ))}
                        </div>
                    </fieldset>

                    <div className="flex flex-col gap-1.5">
                        <label
                            htmlFor={`${idBase}-fecha`}
                            className="text-[12.5px] font-medium text-[var(--foreground-muted)]"
                        >
                            Fecha contable
                        </label>
                        <input
                            id={`${idBase}-fecha`}
                            type="date"
                            required
                            max={hoy}
                            value={fecha}
                            onChange={(evento) => {
                                setFecha(evento.target.value);
                                setConfirmando(false);
                            }}
                            className={`tabular ${CLASES_CAMPO}`}
                        />
                    </div>

                    <div className="flex flex-col gap-1.5">
                        <div className="flex items-baseline justify-between">
                            <label
                                htmlFor={`${idBase}-glosa`}
                                className="text-[12.5px] font-medium text-[var(--foreground-muted)]"
                            >
                                Glosa
                            </label>
                            <span className="tabular text-[11px] text-[var(--foreground-muted)]">
                                {glosa.length}/{LARGO_GLOSA}
                            </span>
                        </div>
                        {/* Art. 27 del Codigo de Comercio: cada operacion se anota
                            "expresando detalladamente el caracter y circunstancias". */}
                        <input
                            id={`${idBase}-glosa`}
                            required
                            maxLength={LARGO_GLOSA}
                            value={glosa}
                            onChange={(evento) => {
                                setGlosa(evento.target.value);
                                setConfirmando(false);
                            }}
                            placeholder="Ej.: Venta al contado factura 1234 a Comercial Sur"
                            className={CLASES_CAMPO}
                        />
                    </div>
                </div>
            </Panel>

            <Panel sinRelleno>
                <div className="overflow-x-auto">
                    <table className="w-full min-w-[760px] border-collapse text-[13px]">
                        <thead className="text-[var(--foreground-muted)]">
                            <tr className="border-b border-[var(--border-subtle)]">
                                <th scope="col" className="w-8 px-3 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em]">#</th>
                                <th scope="col" className="px-2 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em]">Cuenta</th>
                                <th scope="col" className="px-2 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em]">Glosa de la línea</th>
                                <th scope="col" className="px-2 py-2.5 text-left text-[10.5px] font-semibold uppercase tracking-[0.07em]">RUT (opcional)</th>
                                <th scope="col" className="w-36 px-2 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.07em]">Debe</th>
                                <th scope="col" className="w-36 px-2 py-2.5 text-right text-[10.5px] font-semibold uppercase tracking-[0.07em]">Haber</th>
                                <th scope="col" className="w-10 px-2 py-2.5"><span className="sr-only">Quitar</span></th>
                            </tr>
                        </thead>
                        <tbody>
                            {lineas.map((linea, indice) => (
                                <tr key={linea.clave} className="border-b border-[var(--border-subtle)] align-top">
                                    <td className="tabular px-3 py-2 text-[var(--foreground-muted)]">{indice + 1}</td>
                                    <td className="px-2 py-2">
                                        <select
                                            aria-label={`Cuenta de la línea ${indice + 1}`}
                                            value={linea.id_cuenta}
                                            onChange={(evento) => cambiarLinea(linea.clave, { id_cuenta: evento.target.value })}
                                            className={CLASES_CELDA}
                                        >
                                            <option value="">Elige una cuenta…</option>
                                            {cuentasPorGrupo
                                                .filter((grupo) => grupo.cuentas.length > 0)
                                                .map((grupo) => (
                                                    <optgroup key={grupo.nombre} label={grupo.nombre}>
                                                        {grupo.cuentas.map((cuenta) => (
                                                            <option key={cuenta.id_cuenta} value={cuenta.id_cuenta}>
                                                                {cuenta.codigo} · {cuenta.nombre}
                                                            </option>
                                                        ))}
                                                    </optgroup>
                                                ))}
                                        </select>
                                    </td>
                                    <td className="px-2 py-2">
                                        <input
                                            aria-label={`Glosa de la línea ${indice + 1}`}
                                            maxLength={120}
                                            value={linea.glosa}
                                            onChange={(evento) => cambiarLinea(linea.clave, { glosa: evento.target.value })}
                                            className={CLASES_CELDA}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <select
                                            aria-label={`Tercero de la línea ${indice + 1}`}
                                            value={linea.id_tercero}
                                            onChange={(evento) => cambiarLinea(linea.clave, { id_tercero: evento.target.value })}
                                            className={CLASES_CELDA}
                                        >
                                            <option value="">—</option>
                                            {terceros.map((tercero) => (
                                                <option key={tercero.id_tercero} value={tercero.id_tercero}>
                                                    {tercero.rut} · {tercero.razon_social}
                                                </option>
                                            ))}
                                        </select>
                                    </td>
                                    <td className="px-2 py-2">
                                        {/* Escribir en una columna vacia la otra: una linea
                                            carga o abona, nunca las dos cosas. */}
                                        <CampoPesos
                                            etiqueta={`Debe de la línea ${indice + 1}`}
                                            valor={linea.debe}
                                            alCambiar={(debe) => cambiarLinea(linea.clave, { debe, haber: debe ? "" : linea.haber })}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <CampoPesos
                                            etiqueta={`Haber de la línea ${indice + 1}`}
                                            valor={linea.haber}
                                            alCambiar={(haber) => cambiarLinea(linea.clave, { haber, debe: haber ? "" : linea.debe })}
                                        />
                                    </td>
                                    <td className="px-2 py-2 text-center">
                                        <Boton
                                            variante="fantasma"
                                            soloIcono
                                            aria-label={`Quitar la línea ${indice + 1}`}
                                            disabled={lineas.length <= 2}
                                            onClick={() => {
                                                setLineas((actuales) => actuales.filter((l) => l.clave !== linea.clave));
                                                setConfirmando(false);
                                            }}
                                        >
                                            <Icon name="trash" className="size-4" />
                                        </Boton>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colSpan={4} className="border-t-2 border-[var(--border-strong)] px-3 pt-3 pb-3">
                                    <Boton
                                        variante="neutro"
                                        onClick={() => setLineas((actuales) => [...actuales, lineaNueva()])}
                                    >
                                        <Icon name="plus" className="size-4" />
                                        Agregar línea
                                    </Boton>
                                </td>
                                <td className="tabular border-t-2 border-[var(--border-strong)] px-2 pt-4 text-right font-bold">
                                    {formatearPesos(totalDebe)}
                                </td>
                                <td className="tabular border-t-2 border-[var(--border-strong)] px-2 pt-4 text-right font-bold">
                                    {formatearPesos(totalHaber)}
                                </td>
                                <td className="border-t-2 border-[var(--border-strong)]" />
                            </tr>
                        </tfoot>
                    </table>
                </div>

                {/* aria-live: quien usa lector de pantalla oye si el asiento
                    cuadra mientras escribe, sin tener que buscar el total. */}
                <div
                    aria-live="polite"
                    className={`flex items-center gap-2 border-t border-[var(--border-subtle)] px-5 py-3 text-[13px] font-medium ${
                        cuadra
                            ? "text-[var(--positivo)]"
                            : totalDebe + totalHaber > CERO
                              ? "text-[var(--critico)]"
                              : "text-[var(--foreground-muted)]"
                    }`}
                >
                    <Icon name={cuadra ? "check" : "alert"} className="size-4 shrink-0" />
                    {cuadra
                        ? `Cuadrado: debe y haber suman ${formatearPesos(totalDebe)}`
                        : totalDebe + totalHaber > CERO
                          ? `Descuadre de ${formatearPesos(diferencia)} (${totalDebe > totalHaber ? "falta haber" : "falta debe"})`
                          : "Sin montos todavía"}
                </div>
            </Panel>

            {errores.length > 0 ? (
                <div role="alert" className="rounded-xl bg-[var(--critico-bg)] p-4 text-[13px] text-[var(--critico)]">
                    <p className="font-semibold">No se pudo completar la operación:</p>
                    <ul className="mt-1 list-disc pl-5">
                        {errores.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                </div>
            ) : null}

            {confirmando ? (
                <div
                    role="alertdialog"
                    aria-labelledby={`${idBase}-confirmar`}
                    className="rounded-xl border border-[var(--aviso)] bg-[var(--aviso-bg)] p-4 text-[13px]"
                >
                    <p id={`${idBase}-confirmar`} className="font-semibold text-[var(--foreground)]">
                        ¿Contabilizar este {nombreTipo.toLowerCase()} por {formatearPesos(totalDebe)} con fecha{" "}
                        {fecha.split("-").reverse().join("-")}?
                    </p>
                    <p className="mt-1 text-[var(--foreground-muted)]">
                        Recibirá su número correlativo y no se podrá modificar ni eliminar (art. 31 del
                        Código de Comercio). Si después encuentras un error, se corrige con un asiento de
                        reversión.
                    </p>
                    <div className="mt-3 flex flex-wrap gap-2">
                        <Boton variante="acento" disabled={enCurso} onClick={alContabilizar}>
                            {enCurso ? "Contabilizando…" : "Sí, contabilizar"}
                        </Boton>
                        <Boton variante="neutro" disabled={enCurso} onClick={() => setConfirmando(false)}>
                            Revisar
                        </Boton>
                    </div>
                </div>
            ) : null}

            <div className="flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-wrap items-center gap-2">
                    <Link
                        href="/dashboard/core-contable"
                        className="px-1 text-[13px] text-[var(--foreground-muted)] underline-offset-4 hover:underline"
                    >
                        Volver al libro diario
                    </Link>
                    {borrador ? (
                        <Boton variante="fantasma" disabled={enCurso} onClick={alDescartar}>
                            <Icon name="trash" className="size-4" />
                            Descartar borrador
                        </Boton>
                    ) : null}
                    {aviso ? (
                        <span role="status" className="text-[12.5px] text-[var(--positivo)]">
                            {aviso}
                        </span>
                    ) : null}
                </div>

                <div className="flex flex-col items-stretch gap-2 sm:items-end">
                    <div className="flex flex-wrap gap-2">
                        <Boton variante="neutro" disabled={enCurso} onClick={alGuardar}>
                            {enCurso && !confirmando ? "Guardando…" : "Guardar borrador"}
                        </Boton>
                        <Boton
                            variante="acento"
                            disabled={enCurso || !listoParaContabilizar || confirmando}
                            onClick={() => setConfirmando(true)}
                        >
                            Contabilizar
                        </Boton>
                    </div>
                    {!listoParaContabilizar ? (
                        <p className="max-w-md text-right text-[12px] text-[var(--foreground-muted)]">
                            Para contabilizar: {faltantes[0].charAt(0).toLowerCase() + faltantes[0].slice(1)}.
                        </p>
                    ) : null}
                </div>
            </div>
        </form>
    );
}
