"use client";

/* ============================================================================
   Formulario de cuenta: crear o editar, segun si recibe `cuenta`.

   Se usa en dos lugares:
   - Al tope de la pagina, sin `cuenta`: administra su propio boton "Nueva
     cuenta" que se expande a este formulario (no recibe alCancelar).
   - Dentro de AccionesCuenta, con `cuenta`: siempre expandido, y quien decide
     cuando ocultarlo es el padre (alGuardar/alCancelar), porque ahi la
     visibilidad la controla el modo "editar" de esa fila.
   ========================================================================== */

import { useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import type { CuentaContable } from "@/lib/api";
import { CLASES_DE_CUENTA } from "@/lib/planCuentas";
import { actualizarCuenta, crearCuenta } from "./actions";

type FormularioCuentaProps = {
    /** Todas las cuentas de la empresa: de aqui salen las opciones de cuenta padre. */
    readonly cuentas: readonly CuentaContable[];
    /** Si viene, el formulario edita esta cuenta; si no, crea una nueva. */
    readonly cuenta?: CuentaContable | null;
    /** Solo se usan en modo edicion: quien la muestra decide cuando ocultarla. */
    readonly alGuardar?: () => void;
    readonly alCancelar?: () => void;
};

const CLASES_CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13px] text-[var(--foreground)]";

/** Ids de todos los descendientes de `raizId` (para no poder asignarse un
 *  hijo propio como padre, cosa que el servicio igual rechaza pero que aqui
 *  se puede evitar de entrada). */
function calcularDescendientes(cuentas: readonly CuentaContable[], raizId: string): Set<string> {
    const hijosPorPadre = new Map<string, string[]>();
    for (const cuenta of cuentas) {
        if (!cuenta.id_cuenta_padre) continue;
        const lista = hijosPorPadre.get(cuenta.id_cuenta_padre) ?? [];
        lista.push(cuenta.id_cuenta);
        hijosPorPadre.set(cuenta.id_cuenta_padre, lista);
    }

    const descendientes = new Set<string>();
    const pendientes = [...(hijosPorPadre.get(raizId) ?? [])];
    while (pendientes.length > 0) {
        const id = pendientes.pop()!;
        if (descendientes.has(id)) continue;
        descendientes.add(id);
        pendientes.push(...(hijosPorPadre.get(id) ?? []));
    }
    return descendientes;
}

function CamposCuenta({
    cuentas,
    cuenta,
    onSubmit,
    errores,
    enCurso,
    alCancelar,
    textoGuardar,
}: {
    readonly cuentas: readonly CuentaContable[];
    readonly cuenta?: CuentaContable | null;
    readonly onSubmit: (datos: {
        codigo: string;
        nombre: string;
        id_tipo_cuenta: number;
        id_cuenta_padre: string;
        acepta_movimiento: boolean;
        codigo_sii: string;
    }) => void;
    readonly errores: readonly string[];
    readonly enCurso: boolean;
    readonly alCancelar: () => void;
    readonly textoGuardar: string;
}) {
    const [codigo, setCodigo] = useState(cuenta?.codigo ?? "");
    const [nombre, setNombre] = useState(cuenta?.nombre ?? "");
    const [idTipoCuenta, setIdTipoCuenta] = useState(cuenta?.id_tipo_cuenta ?? CLASES_DE_CUENTA[0].id);
    const [idCuentaPadre, setIdCuentaPadre] = useState(cuenta?.id_cuenta_padre ?? "");
    const [aceptaMovimiento, setAceptaMovimiento] = useState(cuenta?.acepta_movimiento ?? true);
    const [codigoSii, setCodigoSii] = useState(cuenta?.codigo_sii ?? "");

    const excluidas = cuenta ? calcularDescendientes(cuentas, cuenta.id_cuenta) : new Set<string>();
    const opcionesPadre = cuentas
        .filter((c) => c.is_active && c.id_cuenta !== cuenta?.id_cuenta && !excluidas.has(c.id_cuenta))
        .sort((a, b) => a.codigo.localeCompare(b.codigo));

    return (
        <form
            onSubmit={(evento) => {
                evento.preventDefault();
                onSubmit({ codigo, nombre, id_tipo_cuenta: Number(idTipoCuenta), id_cuenta_padre: idCuentaPadre, acepta_movimiento: aceptaMovimiento, codigo_sii: codigoSii });
            }}
            className="flex flex-col gap-3 text-[12.5px]"
        >
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                <label className="flex flex-col gap-1.5 font-medium text-[var(--foreground-muted)]">
                    Código
                    <input
                        value={codigo}
                        onChange={(evento) => setCodigo(evento.target.value)}
                        maxLength={20}
                        required
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                </label>
                <label className="flex flex-col gap-1.5 font-medium text-[var(--foreground-muted)]">
                    Nombre
                    <input
                        value={nombre}
                        onChange={(evento) => setNombre(evento.target.value)}
                        minLength={3}
                        maxLength={150}
                        required
                        className={CLASES_CAMPO}
                    />
                </label>
                <label className="flex flex-col gap-1.5 font-medium text-[var(--foreground-muted)]">
                    Tipo de cuenta
                    <select
                        value={idTipoCuenta}
                        onChange={(evento) => setIdTipoCuenta(Number(evento.target.value))}
                        className={CLASES_CAMPO}
                    >
                        {CLASES_DE_CUENTA.map((clase) => (
                            <option key={clase.id} value={clase.id}>
                                {clase.nombre}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5 font-medium text-[var(--foreground-muted)]">
                    Cuenta padre
                    <select
                        value={idCuentaPadre}
                        onChange={(evento) => setIdCuentaPadre(evento.target.value)}
                        className={CLASES_CAMPO}
                    >
                        <option value="">— Sin padre (cuenta de primer nivel) —</option>
                        {opcionesPadre.map((opcion) => (
                            <option key={opcion.id_cuenta} value={opcion.id_cuenta}>
                                {opcion.codigo} · {opcion.nombre}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1.5 font-medium text-[var(--foreground-muted)]">
                    Código SII (opcional)
                    <input
                        value={codigoSii}
                        onChange={(evento) => setCodigoSii(evento.target.value)}
                        maxLength={20}
                        placeholder="Diccionario de Cuentas LCE, si lo tienes"
                        className={CLASES_CAMPO}
                    />
                </label>
                <label className="flex items-end gap-2 pb-2 font-medium text-[var(--foreground-muted)]">
                    <input
                        type="checkbox"
                        checked={aceptaMovimiento}
                        onChange={(evento) => setAceptaMovimiento(evento.target.checked)}
                        className="size-4"
                    />
                    Acepta movimientos (desmárcala si es solo de agrupación)
                </label>
            </div>

            {errores.length > 0 ? (
                <p role="alert" className="text-[var(--critico)]">
                    {errores.join(" ")}
                </p>
            ) : null}

            <div className="flex gap-2">
                <Boton type="submit" variante="acento" disabled={enCurso}>
                    {enCurso ? "Guardando…" : textoGuardar}
                </Boton>
                <Boton variante="neutro" disabled={enCurso} onClick={alCancelar}>
                    Cancelar
                </Boton>
            </div>
        </form>
    );
}

export function FormularioCuenta({ cuentas, cuenta = null, alGuardar, alCancelar }: FormularioCuentaProps) {
    const [mostrar, setMostrar] = useState(false);
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    // Modo edicion: la visibilidad la controla quien usa el formulario
    // (AccionesCuenta, via el prop `cuenta`). Modo creacion (sin `cuenta`,
    // usado al tope de la pagina): la visibilidad la controla este mismo
    // componente con un boton "Nueva cuenta".
    const modoEdicion = cuenta !== null;
    if (!modoEdicion && !mostrar) {
        return (
            <Boton variante="acento" onClick={() => setMostrar(true)}>
                Nueva cuenta
            </Boton>
        );
    }

    function guardar(datos: {
        codigo: string;
        nombre: string;
        id_tipo_cuenta: number;
        id_cuenta_padre: string;
        acepta_movimiento: boolean;
        codigo_sii: string;
    }) {
        setErrores([]);
        iniciar(async () => {
            const payload = {
                codigo: datos.codigo.trim(),
                nombre: datos.nombre.trim(),
                id_tipo_cuenta: datos.id_tipo_cuenta,
                acepta_movimiento: datos.acepta_movimiento,
                codigo_sii: datos.codigo_sii.trim() || null,
            };
            const resultado = modoEdicion
                ? await actualizarCuenta(cuenta!.id_cuenta, {
                      ...payload,
                      id_cuenta_padre: datos.id_cuenta_padre || null,
                  })
                : await crearCuenta({
                      ...payload,
                      id_cuenta_padre: datos.id_cuenta_padre || undefined,
                  });

            if (resultado.errores) {
                setErrores(resultado.errores);
                return;
            }
            if (modoEdicion) {
                alGuardar?.();
            } else {
                setMostrar(false);
            }
        });
    }

    return (
        <CamposCuenta
            cuentas={cuentas}
            cuenta={cuenta}
            onSubmit={guardar}
            errores={errores}
            enCurso={enCurso}
            alCancelar={modoEdicion ? () => alCancelar?.() : () => setMostrar(false)}
            textoGuardar={modoEdicion ? "Guardar cambios" : "Crear cuenta"}
        />
    );
}
