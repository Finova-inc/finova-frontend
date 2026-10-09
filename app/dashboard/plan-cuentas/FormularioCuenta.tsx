"use client";

/* ============================================================================
   Formulario de cuenta: crear (suelta o dentro de una agrupación) o editar.

   Lo que decide la estructura se deriva en vez de preguntarse:
   - La clase sale de la agrupación padre: una cuenta es del mismo tipo que
     su rubro (el backend lo exige igual).
   - El código se sugiere a partir del padre (1101 → 1101005) y se deja de
     sugerir en cuanto la persona escribe el suyo. La sugerencia salta los
     códigos del plan base aunque la empresa no los haya elegido: así, si
     después los agrega desde el configurador, no chocan con una cuenta suya.
   - Si la cuenta ya tiene asientos, código, clase e imputabilidad aparecen
     bloqueados y con el motivo, en vez de dejar que el backend los rechace.
   Quitar la cuenta del plan no vive aquí: es la papelera de la fila.
   ========================================================================== */

import { useId, useMemo, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import type { ActualizarCuentaInput, CuentaContable, FilaPlantilla } from "@/lib/api";
import { CLASES_DE_CUENTA, claseDe, descendientesDe, nombreNivel, siguienteCodigo } from "@/lib/planCuentas";
import { actualizarCuenta, crearCuenta } from "./actions";

type FormularioCuentaProps = {
    /** Todas las cuentas de la empresa: de aquí salen las agrupaciones y el código sugerido. */
    readonly cuentas: readonly CuentaContable[];
    /** Filas del plan base, para que el código sugerido no use uno de ellas. */
    readonly plantilla: readonly FilaPlantilla[];
    /** Si viene, el formulario edita esta cuenta. */
    readonly cuenta?: CuentaContable | null;
    /** Crear dentro de esta agrupación (fija): "Agregar cuenta aquí". */
    readonly padreInicial?: CuentaContable | null;
    /** Se llama al guardar o al cancelar. */
    readonly alTerminar: () => void;
};

const CLASES_CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] disabled:cursor-not-allowed disabled:bg-[var(--background-raised)] disabled:text-[var(--foreground-muted)]";
const CLASES_ETIQUETA = "flex flex-col gap-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)]";
const CLASES_FIJO =
    "w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background-raised)] px-3 py-2 text-[13px] font-normal text-[var(--foreground)]";
const CLASES_AYUDA = "text-[11.5px] font-normal text-[var(--foreground-muted)]";

type Cambios = { -readonly [K in keyof ActualizarCuentaInput]: ActualizarCuentaInput[K] };

/** Profundidad de una cuenta en su árbol: 0 = clase, 1 = grupo, 2 = rubro, 3 = cuenta. */
function profundidad(cuenta: CuentaContable, porId: ReadonlyMap<string, CuentaContable>): number {
    let nivel = 0;
    for (let actual = cuenta.id_cuenta_padre; actual && nivel < 50; actual = porId.get(actual)?.id_cuenta_padre ?? null) {
        nivel += 1;
    }
    return nivel;
}

export function FormularioCuenta({
    cuentas,
    plantilla,
    cuenta = null,
    padreInicial = null,
    alTerminar,
}: FormularioCuentaProps) {
    const idBase = useId();
    const edicion = cuenta !== null;
    const conAsientos = edicion && cuenta.tiene_movimientos;
    const porId = useMemo(() => new Map(cuentas.map((c) => [c.id_cuenta, c])), [cuentas]);
    const tieneHijas = edicion && cuentas.some((c) => c.id_cuenta_padre === cuenta.id_cuenta);

    // Bajo un rubro (profundidad 2) va una cuenta imputable; bajo una clase o un grupo, otra agrupación.
    const imputablePorDefecto = (candidata: CuentaContable | null) =>
        candidata ? profundidad(candidata, porId) >= 2 : false;

    const [idPadre, setIdPadre] = useState(cuenta?.id_cuenta_padre ?? padreInicial?.id_cuenta ?? "");
    const [imputable, setImputable] = useState(cuenta?.acepta_movimiento ?? imputablePorDefecto(padreInicial));
    const [tipoSinPadre, setTipoSinPadre] = useState(cuenta?.id_tipo_cuenta ?? CLASES_DE_CUENTA[0].id);
    const [codigoEscrito, setCodigoEscrito] = useState<string | null>(cuenta?.codigo ?? null);
    const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
    const [codigoSii, setCodigoSii] = useState(cuenta?.codigo_sii ?? "");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    const padre = idPadre ? (porId.get(idPadre) ?? null) : null;
    const tipo = padre ? padre.id_tipo_cuenta : tipoSinPadre;
    const clase = claseDe(tipo);
    // Las hijas del plan base primero: fijan el ancho del correlativo (1101 → 1101005).
    const sugerido = padre
        ? siguienteCodigo(padre, [
              ...plantilla.filter((fila) => fila.codigoPadre === padre.codigo),
              ...cuentas.filter((c) => c.id_cuenta_padre === padre.id_cuenta),
          ])
        : "";
    const codigo = codigoEscrito ?? sugerido;

    // Con asientos o con hijas, la clase no puede cambiar: el padre se elige
    // entonces solo entre agrupaciones de la misma clase.
    const claseFija = conAsientos || tieneHijas;
    const excluidas = edicion ? descendientesDe(cuentas, cuenta.id_cuenta) : new Set<string>();
    const opcionesPadre = cuentas.filter(
        (c) =>
            !c.acepta_movimiento &&
            c.is_active &&
            c.id_cuenta !== cuenta?.id_cuenta &&
            !excluidas.has(c.id_cuenta) &&
            (!claseFija || c.id_tipo_cuenta === cuenta?.id_tipo_cuenta),
    );

    const avisos: string[] = [];
    if (padre && codigo && !codigo.startsWith(padre.codigo)) {
        avisos.push(`Buena práctica: el código comienza con el de su agrupación (${padre.codigo}…).`);
    }
    if (imputable && nombre.trim().length > 40) {
        avisos.push("Los libros electrónicos del SII muestran hasta 40 caracteres del nombre.");
    }

    function validar(): string[] {
        const problemas: string[] = [];
        if (!/^\d{1,20}$/.test(codigo)) problemas.push("El código lleva solo dígitos (ej. 1101005).");
        if (nombre.trim().length < 3) problemas.push("El nombre necesita al menos 3 caracteres.");
        if (imputable && !padre) problemas.push("Una cuenta imputable va dentro de un rubro: elige su agrupación.");
        return problemas;
    }

    function guardar() {
        const problemas = validar();
        setErrores(problemas);
        if (problemas.length > 0) return;

        iniciar(async () => {
            if (!cuenta) {
                const resultado = await crearCuenta({
                    id_tipo_cuenta: tipo,
                    codigo,
                    nombre: nombre.trim(),
                    id_cuenta_padre: padre?.id_cuenta,
                    acepta_movimiento: imputable,
                    codigo_sii: codigoSii.trim() || null,
                });
                if (resultado.errores) setErrores(resultado.errores);
                else alTerminar();
                return;
            }

            // Solo lo que cambió: reenviar el padre de siempre lo volvería a
            // validar, y un padre desactivado después haría fallar un simple
            // cambio de nombre.
            const cambios: Cambios = {};
            if (nombre.trim() !== cuenta.nombre) cambios.nombre = nombre.trim();
            if ((codigoSii.trim() || null) !== cuenta.codigo_sii) cambios.codigo_sii = codigoSii.trim() || null;
            if (codigo !== cuenta.codigo) cambios.codigo = codigo;
            if ((padre?.id_cuenta ?? null) !== cuenta.id_cuenta_padre) cambios.id_cuenta_padre = padre?.id_cuenta ?? null;
            if (tipo !== cuenta.id_tipo_cuenta) cambios.id_tipo_cuenta = tipo;
            if (imputable !== cuenta.acepta_movimiento) cambios.acepta_movimiento = imputable;
            if (Object.keys(cambios).length === 0) {
                alTerminar();
                return;
            }
            const resultado = await actualizarCuenta(cuenta.id_cuenta, cambios);
            if (resultado.errores) setErrores(resultado.errores);
            else alTerminar();
        });
    }

    return (
        <form
            onSubmit={(evento) => {
                evento.preventDefault();
                guardar();
            }}
            aria-labelledby={`${idBase}-titulo`}
            className="flex flex-col gap-4 text-[13px]"
        >
            <p id={`${idBase}-titulo`} className="font-display text-[14px] font-semibold">
                {cuenta
                    ? `Editar ${cuenta.codigo} · ${cuenta.nombre}`
                    : padreInicial
                      ? `Nueva cuenta en ${padreInicial.codigo} · ${padreInicial.nombre}`
                      : "Nueva cuenta"}
            </p>

            {conAsientos ? (
                <p className="flex gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--surface)] p-3 text-[12.5px] text-[var(--foreground-muted)]">
                    <Icon name="lock" className="mt-0.5 size-4 shrink-0" />
                    <span>
                        Esta cuenta ya tiene asientos: su código, su clase y su condición de imputable quedan fijos
                        (art. 31 del Código de Comercio). Si está mal clasificada, crea la cuenta correcta y traspasa
                        el saldo con un asiento.
                    </span>
                </p>
            ) : null}

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-6">
                <label className={`${CLASES_ETIQUETA} sm:col-span-2 lg:col-span-4`}>
                    Agrupación
                    {padreInicial && !cuenta ? (
                        <span className={CLASES_FIJO}>
                            <span className="tabular font-medium">{padreInicial.codigo}</span> · {padreInicial.nombre}
                        </span>
                    ) : (
                        <select
                            value={idPadre}
                            onChange={(evento) => {
                                setIdPadre(evento.target.value);
                                if (!cuenta) setImputable(imputablePorDefecto(porId.get(evento.target.value) ?? null));
                            }}
                            className={CLASES_CAMPO}
                        >
                            <option value="">Sin agrupación (primer nivel)</option>
                            {CLASES_DE_CUENTA.map((opcion) => {
                                const delTipo = opcionesPadre.filter((c) => c.id_tipo_cuenta === opcion.id);
                                return delTipo.length === 0 ? null : (
                                    <optgroup key={opcion.id} label={opcion.nombre}>
                                        {delTipo.map((c) => (
                                            <option key={c.id_cuenta} value={c.id_cuenta}>
                                                {"  ".repeat(profundidad(c, porId))}
                                                {c.codigo} · {c.nombre}
                                            </option>
                                        ))}
                                    </optgroup>
                                );
                            })}
                        </select>
                    )}
                    <span className={CLASES_AYUDA}>
                        {padre
                            ? `Queda como ${nombreNivel(profundidad(padre, porId) + 1).toLowerCase()} dentro de ${padre.nombre}.`
                            : "Solo una clase o un grupo nuevo van sin agrupación."}
                    </span>
                </label>

                <div className={`${CLASES_ETIQUETA} lg:col-span-2`}>
                    <span id={`${idBase}-clase`}>Clase</span>
                    {padre ? (
                        <span className={CLASES_FIJO}>
                            {clase.nombre}
                            <span className="text-[var(--foreground-muted)]"> · naturaleza {clase.naturaleza}</span>
                        </span>
                    ) : (
                        <select
                            aria-labelledby={`${idBase}-clase`}
                            value={tipoSinPadre}
                            disabled={claseFija}
                            onChange={(evento) => setTipoSinPadre(Number(evento.target.value))}
                            className={CLASES_CAMPO}
                        >
                            {CLASES_DE_CUENTA.map((opcion) => (
                                <option key={opcion.id} value={opcion.id}>
                                    {opcion.nombre}
                                </option>
                            ))}
                        </select>
                    )}
                    <span className={CLASES_AYUDA}>{padre ? "La hereda de su agrupación." : "Define su naturaleza."}</span>
                </div>

                <fieldset className="sm:col-span-2 lg:col-span-6">
                    <legend className="mb-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)]">Tipo</legend>
                    <div className="grid gap-2 sm:grid-cols-2">
                        {(
                            [
                                { valor: true, titulo: "Cuenta imputable", ayuda: "Recibe asientos: es el último nivel del plan." },
                                { valor: false, titulo: "Agrupación", ayuda: "Ordena y suma a sus cuentas; no recibe asientos." },
                            ] as const
                        ).map((opcion) => {
                            const elegido = imputable === opcion.valor;
                            const bloqueado = !elegido && (opcion.valor ? tieneHijas : conAsientos);
                            return (
                                <label
                                    key={opcion.titulo}
                                    className={`flex gap-3 rounded-lg border p-3 transition-colors has-[:focus-visible]:outline has-[:focus-visible]:outline-2 has-[:focus-visible]:outline-[var(--accent)] ${
                                        elegido
                                            ? "border-[var(--accent)] bg-[var(--surface)]"
                                            : "border-[var(--border-strong)] hover:bg-[var(--background-raised)]"
                                    } ${bloqueado ? "cursor-not-allowed opacity-55" : "cursor-pointer"}`}
                                >
                                    <input
                                        type="radio"
                                        name={`${idBase}-tipo`}
                                        checked={elegido}
                                        disabled={bloqueado}
                                        onChange={() => setImputable(opcion.valor)}
                                        className="mt-0.5 size-4 shrink-0 accent-[var(--accent)]"
                                    />
                                    <span className="flex flex-col gap-0.5">
                                        <span className="font-medium text-[var(--foreground)]">{opcion.titulo}</span>
                                        <span className="text-[12px] text-[var(--foreground-muted)]">
                                            {bloqueado
                                                ? opcion.valor
                                                    ? "No disponible: tiene cuentas dentro."
                                                    : "No disponible: ya tiene asientos."
                                                : opcion.ayuda}
                                        </span>
                                    </span>
                                </label>
                            );
                        })}
                    </div>
                </fieldset>

                <label className={`${CLASES_ETIQUETA} lg:col-span-2`}>
                    Código
                    <input
                        value={codigo}
                        onChange={(evento) => setCodigoEscrito(evento.target.value.replace(/\D/g, ""))}
                        inputMode="numeric"
                        maxLength={20}
                        required
                        disabled={conAsientos}
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                    <span className={CLASES_AYUDA}>
                        {conAsientos
                            ? "Fijo: la cuenta tiene asientos."
                            : sugerido && codigo === sugerido
                              ? "Siguiente correlativo libre de su agrupación."
                              : "Solo dígitos."}
                    </span>
                </label>

                <label className={`${CLASES_ETIQUETA} sm:col-span-1 lg:col-span-3`}>
                    Nombre
                    <input
                        value={nombre}
                        onChange={(evento) => setNombre(evento.target.value)}
                        maxLength={150}
                        required
                        placeholder={imputable ? "Ej.: Banco Estado cuenta corriente" : "Ej.: Inversiones financieras"}
                        className={CLASES_CAMPO}
                    />
                </label>

                <label className={`${CLASES_ETIQUETA} lg:col-span-1`}>
                    Código SII
                    <input
                        value={codigoSii}
                        onChange={(evento) => setCodigoSii(evento.target.value)}
                        maxLength={20}
                        placeholder="Opcional"
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                </label>
            </div>

            {avisos.length > 0 ? (
                <ul className="flex flex-col gap-1 text-[12.5px] text-[var(--aviso)]">
                    {avisos.map((aviso) => (
                        <li key={aviso} className="flex gap-2">
                            <Icon name="info" className="mt-0.5 size-4 shrink-0" />
                            {aviso}
                        </li>
                    ))}
                </ul>
            ) : null}

            {errores.length > 0 ? (
                <ul role="alert" className="flex flex-col gap-1 rounded-lg bg-[var(--critico-bg)] p-3 text-[12.5px] text-[var(--critico)]">
                    {errores.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                <Boton type="submit" variante="acento" disabled={enCurso}>
                    {enCurso ? "Guardando…" : cuenta ? "Guardar cambios" : "Crear cuenta"}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={alTerminar}>
                    Cancelar
                </Boton>
            </div>
        </form>
    );
}
