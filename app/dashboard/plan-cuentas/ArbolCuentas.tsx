"use client";

/* ============================================================================
   Árbol del plan de cuentas: un panel por clase, con sus grupos plegables.

   Componente cliente por la búsqueda, el pliegue y los formularios en línea.
   La búsqueda no pierde el contexto: de cada coincidencia conserva sus
   agrupaciones (para saber en qué rubro cae) y, si coincide una agrupación,
   todo lo que hay dentro.

   "Exportar CSV" arma el archivo aquí mismo, con las cuentas ya cargadas:
   para el cliente, la auditoría o el Diccionario de Cuentas del LCE.
   ========================================================================== */

import { useMemo, useState, type ReactNode } from "react";
import { Boton } from "@/components/ui/Boton";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import type { CuentaContable, FilaPlantilla } from "@/lib/api";
import { hoyEnChile } from "@/lib/formato";
import { CLASES_DE_CUENTA, construirArbol, normalizar, planACsv, type NodoCuenta } from "@/lib/planCuentas";
import { Aviso, CLASES_TH } from "../core-contable/partes";
import { FilaCuenta } from "./FilaCuenta";
import { FormularioCuenta } from "./FormularioCuenta";

type Nodo = NodoCuenta<CuentaContable>;

function contarImputables(nodo: Nodo): number {
    return nodo.hijas.reduce(
        (total, hija) => total + contarImputables(hija),
        nodo.cuenta.acepta_movimiento && nodo.cuenta.is_active ? 1 : 0,
    );
}

/** Lo que se ve con la búsqueda: coincidencias, sus agrupaciones y el contenido de las agrupaciones que coinciden. */
function filtrar(cuentas: readonly CuentaContable[], consulta: string): CuentaContable[] {
    const porId = new Map(cuentas.map((c) => [c.id_cuenta, c]));
    const hijasDe = new Map<string, CuentaContable[]>();
    for (const c of cuentas) {
        if (c.id_cuenta_padre) hijasDe.set(c.id_cuenta_padre, [...(hijasDe.get(c.id_cuenta_padre) ?? []), c]);
    }

    const visibles = new Set<string>();
    const agregarContenido = (c: CuentaContable) => {
        for (const hija of hijasDe.get(c.id_cuenta) ?? []) {
            visibles.add(hija.id_cuenta);
            agregarContenido(hija);
        }
    };
    for (const c of cuentas) {
        if (!c.codigo.startsWith(consulta) && !normalizar(c.nombre).includes(consulta)) continue;
        for (let actual: CuentaContable | undefined = c; actual; actual = porId.get(actual.id_cuenta_padre ?? "")) {
            visibles.add(actual.id_cuenta);
        }
        if (!c.acepta_movimiento) agregarContenido(c);
    }
    return cuentas.filter((c) => visibles.has(c.id_cuenta));
}

/** Descarga el plan completo (también las inactivas) como CSV para Excel. */
function exportarCsv(cuentas: readonly CuentaContable[]) {
    // La BOM hace que Excel lea el archivo como UTF-8 (tildes y ñ).
    const archivo = new Blob(["﻿", planACsv(cuentas)], { type: "text/csv;charset=utf-8" });
    const enlace = document.createElement("a");
    enlace.href = URL.createObjectURL(archivo);
    enlace.download = `plan-de-cuentas-${hoyEnChile()}.csv`;
    enlace.click();
    setTimeout(() => URL.revokeObjectURL(enlace.href), 0);
}

export function ArbolCuentas({
    cuentas,
    plantilla,
    puedeEditar,
}: {
    readonly cuentas: readonly CuentaContable[];
    /** Filas del plan base: el código sugerido de una cuenta nueva no usa ninguna. */
    readonly plantilla: readonly FilaPlantilla[];
    readonly puedeEditar: boolean;
}) {
    const [busqueda, setBusqueda] = useState("");
    const [verInactivas, setVerInactivas] = useState(false);
    const [plegados, setPlegados] = useState<ReadonlySet<string>>(new Set());
    const [creando, setCreando] = useState(false);

    const consulta = normalizar(busqueda.trim());
    const inactivas = cuentas.filter((c) => !c.is_active).length;

    const paneles = useMemo(() => {
        const base = verInactivas ? cuentas : cuentas.filter((c) => c.is_active);
        const visibles = consulta ? filtrar(base, consulta) : base;
        return CLASES_DE_CUENTA.map((clase) => {
            const raices = construirArbol(visibles.filter((c) => c.id_tipo_cuenta === clase.id));
            // La clase del plan base (código de un dígito) va como título del
            // panel; lo que cuelga de ella son las secciones plegables.
            const nodoClase = raices.find((r) => !r.cuenta.acepta_movimiento && r.cuenta.codigo === String(clase.id));
            const secciones = nodoClase ? [...nodoClase.hijas, ...raices.filter((r) => r !== nodoClase)] : raices;
            return { clase, nodoClase, secciones, total: secciones.reduce((t, s) => t + contarImputables(s), 0) };
        }).filter((panel) => panel.secciones.length > 0);
    }, [cuentas, verInactivas, consulta]);

    const idsSecciones = paneles.flatMap((panel) =>
        panel.secciones.filter((s) => !s.cuenta.acepta_movimiento).map((s) => s.cuenta.id_cuenta),
    );
    const encontradas = paneles.reduce((t, p) => t + p.total, 0);

    function alternar(id: string) {
        setPlegados((actuales) => {
            const nuevos = new Set(actuales);
            if (nuevos.has(id)) nuevos.delete(id);
            else nuevos.add(id);
            return nuevos;
        });
    }

    function filas(nodo: Nodo, nivel: number): ReactNode[] {
        const esSeccion = nivel === 0 && !nodo.cuenta.acepta_movimiento;
        const plegada = esSeccion && !consulta && plegados.has(nodo.cuenta.id_cuenta);
        return [
            <FilaCuenta
                key={nodo.cuenta.id_cuenta}
                cuenta={nodo.cuenta}
                cuentas={cuentas}
                plantilla={plantilla}
                nivel={nivel}
                imputablesDentro={contarImputables(nodo)}
                puedeEditar={puedeEditar}
                busqueda={busqueda}
                plegada={esSeccion ? plegada : undefined}
                alPlegar={esSeccion && !consulta ? () => alternar(nodo.cuenta.id_cuenta) : undefined}
            />,
            ...(plegada ? [] : nodo.hijas.flatMap((hija) => filas(hija, nivel + 1))),
        ];
    }

    return (
        <div className="flex flex-col gap-4">
            <div className="no-imprimir flex flex-wrap items-center gap-2">
                <label className="relative min-w-60 flex-1">
                    <span className="sr-only">Buscar cuenta por código o nombre</span>
                    <Icon
                        name="search"
                        className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[var(--foreground-muted)]"
                    />
                    <input
                        type="search"
                        value={busqueda}
                        onChange={(evento) => setBusqueda(evento.target.value)}
                        placeholder="Buscar por código o nombre…"
                        className="w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] py-2 pl-9 pr-3 text-[13px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]"
                    />
                </label>
                <label className="inline-flex cursor-pointer items-center gap-2 px-2 py-2 text-[13px] text-[var(--foreground-muted)]">
                    <input
                        type="checkbox"
                        checked={verInactivas}
                        onChange={(evento) => setVerInactivas(evento.target.checked)}
                        className="size-4 accent-[var(--accent)]"
                    />
                    Mostrar inactivas{inactivas > 0 ? ` (${inactivas})` : ""}
                </label>
                {idsSecciones.length > 0 ? (
                    <div className="flex gap-1">
                        <Boton variante="fantasma" disabled={Boolean(consulta)} onClick={() => setPlegados(new Set(idsSecciones))}>
                            Plegar todo
                        </Boton>
                        <Boton variante="fantasma" disabled={Boolean(consulta)} onClick={() => setPlegados(new Set())}>
                            Desplegar todo
                        </Boton>
                    </div>
                ) : null}
                <Boton variante="fantasma" onClick={() => exportarCsv(cuentas)}>
                    <Icon name="document" className="size-4" />
                    Exportar CSV
                </Boton>
                {puedeEditar ? (
                    <Boton variante="acento" disabled={creando} onClick={() => setCreando(true)}>
                        <Icon name="plus" className="size-4" />
                        Nueva cuenta
                    </Boton>
                ) : null}
            </div>

            <p aria-live="polite" className="sr-only">
                {consulta ? `${encontradas} cuentas imputables coinciden con la búsqueda` : ""}
            </p>

            {creando ? (
                <Panel>
                    <FormularioCuenta cuentas={cuentas} plantilla={plantilla} alTerminar={() => setCreando(false)} />
                </Panel>
            ) : null}

            {paneles.length === 0 ? (
                <Aviso>
                    {consulta
                        ? `Ninguna cuenta coincide con “${busqueda.trim()}”. Prueba con parte del nombre o con el inicio del código.`
                        : "No hay cuentas activas. Marca “Mostrar inactivas” para ver las desactivadas."}
                </Aviso>
            ) : (
                paneles.map(({ clase, nodoClase, secciones, total }) => (
                    <Panel key={clase.id} sinRelleno>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pb-3 pt-4">
                            <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
                                <span className="tabular mr-2 text-[var(--foreground-muted)]">
                                    {nodoClase?.cuenta.codigo ?? clase.id}
                                </span>
                                {nodoClase?.cuenta.nombre ?? clase.nombre}
                            </h2>
                            <p className="text-[11.5px] text-[var(--foreground-muted)]">
                                Naturaleza {clase.naturaleza} · {total} {total === 1 ? "cuenta imputable" : "cuentas imputables"}
                            </p>
                        </div>
                        {/* relative: el sr-only de "Acciones" es absoluto; sin un
                            ancestro posicionado escapa del recorte del scroll y
                            ensancha la página en móvil. */}
                        <div className="relative overflow-x-auto border-t border-[var(--border-subtle)]">
                            <table className="w-full min-w-[780px] table-fixed border-collapse text-left text-[13px]">
                                <colgroup>
                                    <col className="w-32" />
                                    <col />
                                    <col className="w-36" />
                                    {/* Mayor, Asientos, Editar y la papelera. */}
                                    <col className="w-72" />
                                </colgroup>
                                <thead className="border-b border-[var(--border-subtle)]">
                                    <tr>
                                        <th scope="col" className={CLASES_TH}>Código</th>
                                        <th scope="col" className={CLASES_TH}>Cuenta</th>
                                        <th scope="col" className={CLASES_TH}>Detalle</th>
                                        <th scope="col" className={CLASES_TH}>
                                            <span className="sr-only">Acciones</span>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody>{secciones.flatMap((seccion) => filas(seccion, 0))}</tbody>
                            </table>
                        </div>
                    </Panel>
                ))
            )}
        </div>
    );
}
