"use client";

/* ============================================================================
   Configurador del plan de cuentas.

   El plan base se muestra con su organización (clase → grupo → rubro →
   cuenta) y se marcan las cuentas que la empresa usa; sus agrupaciones se
   crean solas. Dentro de cada rubro se agregan cuentas propias con su
   código, que siempre empieza con el del rubro: así el panel de control las
   suma donde corresponden. Lo que ya está en el plan aparece marcado y fijo;
   quitar una cuenta se hace con "Eliminar" en el plan, que revisa su
   historia.

   ---------------------------------------------------------------------------
   AVANCE EN EL NAVEGADOR
   ---------------------------------------------------------------------------
   Hasta guardar, la selección vive en localStorage (una clave por empresa):
   salir a mitad de camino no pierde lo marcado. Se lee con
   useSyncExternalStore, como el tema: en el servidor no existe, y leerlo en
   el primer render del cliente descuadraría la hidratación. Se escribe en
   cada cambio, desde el manejador del evento.
   ========================================================================== */

import { useMemo, useRef, useState, useSyncExternalStore, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import { Panel } from "@/components/ui/Panel";
import type { CuentaContable, CuentaPropiaInput, FilaPlantilla, PlantillaCuentas } from "@/lib/api";
import { claseDe, normalizar, problemaDePropia, resumenConfiguracion, siguienteCodigo } from "@/lib/planCuentas";
import { Aviso, EnlaceAccion } from "../../core-contable/partes";
import { configurarPlan } from "../actions";

type PropiaNueva = CuentaPropiaInput & { readonly clave: string };

interface Seleccion {
    /** Códigos del plan base que se agregan (nunca los que ya están en el plan). */
    readonly marcadas: ReadonlySet<string>;
    readonly propias: readonly PropiaNueva[];
}

const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-1.5 text-[13px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)] aria-[invalid=true]:border-[var(--critico)]";

/* ----------------------------------------------------------------------------
   Lo que no cambia mientras se configura: la estructura del plan base y qué
   cubre ya la empresa.
   -------------------------------------------------------------------------- */

function derivar(plantilla: PlantillaCuentas, cuentas: readonly CuentaContable[]) {
    const hijas = new Map<string, FilaPlantilla[]>();
    for (const fila of plantilla.cuentas) {
        if (fila.codigoPadre) hijas.set(fila.codigoPadre, [...(hijas.get(fila.codigoPadre) ?? []), fila]);
    }
    const disponibles = new Set(
        plantilla.cuentas
            .filter((fila) => fila.acepta_movimiento !== false && !(fila.codigo in plantilla.provistas))
            .map((fila) => fila.codigo),
    );
    return {
        hijas,
        clases: plantilla.cuentas.filter((fila) => !fila.codigoPadre),
        disponibles,
        recomendadas: plantilla.cuentas.filter((fila) => fila.recomendada && disponibles.has(fila.codigo)).map((fila) => fila.codigo),
        /** Agrupaciones que contienen cuentas imputables: donde van las propias. */
        rubros: new Set(
            plantilla.cuentas
                .filter((fila) => (hijas.get(fila.codigo) ?? []).some((hija) => hija.acepta_movimiento !== false))
                .map((fila) => fila.codigo),
        ),
        porId: new Map(cuentas.map((cuenta) => [cuenta.id_cuenta, cuenta])),
        idsProvistos: new Set(Object.values(plantilla.provistas)),
        /** Quién tiene ya cada código, para explicar por qué una cuenta propia no puede usarlo. */
        ocupados: new Map<string, string>([
            ...plantilla.cuentas.map((fila) => [fila.codigo, `"${fila.nombre}" del plan base`] as const),
            ...cuentas.map((cuenta) => [cuenta.codigo, `tu cuenta "${cuenta.nombre}"`] as const),
        ]),
    };
}

/* ----------------------------------------------------------------------------
   Avance en el navegador.
   -------------------------------------------------------------------------- */

const sinSuscripcion = () => () => {};

function leerAvance(clave: string): string | null {
    try {
        return window.localStorage.getItem(clave);
    } catch {
        return null;
    }
}

function guardarAvance(clave: string, seleccion: Seleccion) {
    try {
        window.localStorage.setItem(
            clave,
            JSON.stringify({
                codigos: [...seleccion.marcadas],
                propias: seleccion.propias.map(({ codigo, nombre, codigoPadre }) => ({ codigo, nombre, codigoPadre })),
            }),
        );
    } catch {
        // Sin almacenamiento (ventana privada, cuota llena): el avance no se recuerda, nada más.
    }
}

function borrarAvance(clave: string) {
    try {
        window.localStorage.removeItem(clave);
    } catch {
        // Igual que al guardar.
    }
}

/** El avance guardado, con solo lo que sigue teniendo sentido: cuentas que faltan y propias en un rubro conocido. */
function parsearAvance(crudo: string | null, disponibles: ReadonlySet<string>, rubros: ReadonlySet<string>): Seleccion | null {
    if (!crudo) return null;
    try {
        const datos = JSON.parse(crudo) as { codigos?: unknown; propias?: unknown };
        if (!Array.isArray(datos.codigos) || !Array.isArray(datos.propias)) return null;
        const propias = datos.propias.filter(
            (propia): propia is CuentaPropiaInput =>
                typeof propia?.codigo === "string" && typeof propia?.nombre === "string" && rubros.has(propia?.codigoPadre),
        );
        return {
            marcadas: new Set(datos.codigos.filter((codigo): codigo is string => typeof codigo === "string" && disponibles.has(codigo))),
            propias: propias.map(({ codigo, nombre, codigoPadre }, indice) => ({ codigo, nombre, codigoPadre, clave: `guardada-${indice}` })),
        };
    } catch {
        return null;
    }
}

/** "a", "a y b", "a, b y c". */
function enumerar(partes: readonly string[]): string {
    return partes.length <= 1 ? (partes[0] ?? "") : `${partes.slice(0, -1).join(", ")} y ${partes[partes.length - 1]}`;
}

function cantidad(numero: number, singular: string, plural: string): string {
    return `${numero} ${numero === 1 ? singular : plural}`;
}

/* ----------------------------------------------------------------------------
   El configurador.
   -------------------------------------------------------------------------- */

type ConfiguradorPlanProps = {
    readonly plantilla: PlantillaCuentas;
    /** Todas las cuentas de la empresa (activas e inactivas). */
    readonly cuentas: readonly CuentaContable[];
    /** El avance se guarda por empresa: dos empresas no comparten selección. */
    readonly idEmpresa: string;
};

export function ConfiguradorPlan({ plantilla, cuentas, idEmpresa }: ConfiguradorPlanProps) {
    const router = useRouter();
    const claveAvance = `finova:plan-cuentas:${idEmpresa}`;
    const { provistas } = plantilla;
    const datos = useMemo(() => derivar(plantilla, cuentas), [plantilla, cuentas]);
    const primeraVez = cuentas.length === 0;

    // La primera vez parte con las recomendadas; al volver a configurar, sin nada marcado.
    const inicial = useMemo<Seleccion>(
        () => ({ marcadas: new Set(primeraVez ? datos.recomendadas : []), propias: [] }),
        [primeraVez, datos],
    );
    const avanceCrudo = useSyncExternalStore(sinSuscripcion, () => leerAvance(claveAvance), () => null);
    const avance = useMemo(() => parsearAvance(avanceCrudo, datos.disponibles, datos.rubros), [avanceCrudo, datos]);
    const [edicion, setEdicion] = useState<Seleccion | null>(null);
    const seleccion = edicion ?? avance ?? inicial;

    const [busqueda, setBusqueda] = useState("");
    const [intento, setIntento] = useState(false);
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();
    const contador = useRef(0);

    function actualizar(cambio: (actual: Seleccion) => Seleccion) {
        const nueva = cambio(seleccion);
        setEdicion(nueva);
        guardarAvance(claveAvance, nueva);
    }

    function alternar(codigos: readonly string[], marcar: boolean) {
        actualizar((actual) => {
            const marcadas = new Set(actual.marcadas);
            for (const codigo of codigos) {
                if (marcar) marcadas.add(codigo);
                else marcadas.delete(codigo);
            }
            return { ...actual, marcadas };
        });
    }

    /** Siguiente código libre del rubro, saltando los del plan base aunque no estén marcados. */
    function codigoSugerido(rubro: FilaPlantilla, actual: Seleccion): string {
        const idRubro = provistas[rubro.codigo];
        return siguienteCodigo(rubro, [
            ...(datos.hijas.get(rubro.codigo) ?? []),
            ...cuentas.filter((cuenta) => idRubro !== undefined && cuenta.id_cuenta_padre === idRubro),
            ...actual.propias.filter((propia) => propia.codigoPadre === rubro.codigo),
        ]);
    }

    function agregarPropia(rubro: FilaPlantilla) {
        contador.current += 1;
        const clave = `nueva-${contador.current}`;
        actualizar((actual) => ({
            ...actual,
            propias: [...actual.propias, { clave, codigo: codigoSugerido(rubro, actual), nombre: "", codigoPadre: rubro.codigo }],
        }));
    }

    function cambiarPropia(clave: string, cambios: Partial<CuentaPropiaInput>) {
        actualizar((actual) => ({
            ...actual,
            propias: actual.propias.map((propia) => (propia.clave === clave ? { ...propia, ...cambios } : propia)),
        }));
    }

    function quitarPropia(clave: string) {
        actualizar((actual) => ({ ...actual, propias: actual.propias.filter((propia) => propia.clave !== clave) }));
    }

    function empezarDeNuevo() {
        borrarAvance(claveAvance);
        setEdicion(inicial);
        setIntento(false);
    }

    const resumen = resumenConfiguracion(
        plantilla.cuentas,
        provistas,
        seleccion.marcadas,
        seleccion.propias.map((propia) => propia.codigoPadre),
    );
    const problemas = new Map(
        seleccion.propias.map((propia) => [
            propia.clave,
            problemaDePropia(
                propia,
                datos.ocupados,
                seleccion.propias.filter((otra) => otra.clave !== propia.clave).map((otra) => otra.codigo),
            ),
        ]),
    );
    const hayProblemas = [...problemas.values()].some(Boolean);
    const porHacer = resumen.cuentas + resumen.agrupaciones + seleccion.propias.length + plantilla.reubicar;

    function guardar() {
        setIntento(true);
        if (hayProblemas) return;
        setErrores([]);
        iniciar(async () => {
            const resultado = await configurarPlan({
                codigos: [...seleccion.marcadas],
                propias: seleccion.propias.map(({ codigo, nombre, codigoPadre }) => ({ codigo, nombre: nombre.trim(), codigoPadre })),
            });
            if (resultado.errores) {
                setErrores(resultado.errores);
                return;
            }
            borrarAvance(claveAvance);
            router.push(`/dashboard/plan-cuentas?agregadas=${resultado.creadas ?? 0}`);
        });
    }

    // Búsqueda: un rubro que coincide se muestra entero; si no, solo sus cuentas que coinciden.
    const consulta = normalizar(busqueda.trim());
    const coincide = (codigo: string, nombre: string) =>
        !consulta || codigo.startsWith(consulta) || normalizar(nombre).includes(consulta);
    const paneles = datos.clases
        .map((clase) => ({
            clase,
            grupos: (datos.hijas.get(clase.codigo) ?? [])
                .map((grupo) => ({
                    grupo,
                    rubros: (datos.hijas.get(grupo.codigo) ?? []).flatMap((rubro) => {
                        const todas = datos.hijas.get(rubro.codigo) ?? [];
                        const idRubro = provistas[rubro.codigo];
                        const propiasExistentes = cuentas.filter(
                            (cuenta) =>
                                idRubro !== undefined &&
                                cuenta.id_cuenta_padre === idRubro &&
                                !datos.idsProvistos.has(cuenta.id_cuenta),
                        );
                        const entero = coincide(rubro.codigo, rubro.nombre);
                        const filas = todas.filter((fila) => entero || coincide(fila.codigo, fila.nombre));
                        const existentes = propiasExistentes.filter((cuenta) => entero || coincide(cuenta.codigo, cuenta.nombre));
                        return entero || filas.length > 0 || existentes.length > 0 ? [{ rubro, todas, filas, existentes }] : [];
                    }),
                }))
                .filter((grupo) => grupo.rubros.length > 0),
        }))
        .filter((panel) => panel.grupos.length > 0);

    const cantidades = [
        [resumen.cuentas, "cuenta del plan base", "cuentas del plan base"],
        [seleccion.propias.length, "cuenta propia", "cuentas propias"],
        [resumen.agrupaciones, "agrupación", "agrupaciones"],
    ] as const;
    const agregar = cantidades.filter(([numero]) => numero > 0);
    // "Se agregará 1 cuenta", pero "Se agregarán 1 cuenta y 2 agrupaciones".
    const verbo = agregar.length === 1 && agregar[0][0] === 1 ? "Se agregará" : "Se agregarán";
    const frases = [
        agregar.length > 0 ? `${verbo} ${enumerar(agregar.map(([numero, uno, varios]) => cantidad(numero, uno, varios)))}` : "",
        plantilla.reubicar > 0
            ? `${cantidad(plantilla.reubicar, "cuenta tuya pasará", "cuentas tuyas pasarán")} a su rubro NIIF`
            : "",
    ].filter(Boolean);
    const textoResumen =
        frases.length > 0
            ? `${frases.join(" · ")}.`
            : "Marca las cuentas que quieras agregar o crea una propia dentro de un rubro.";

    const erroresVisibles = intento && hayProblemas ? ["Revisa las cuentas propias marcadas en rojo antes de guardar."] : errores;
    const restaurado = edicion === null && avance !== null;

    return (
        <div className="flex flex-col gap-4">
            {primeraVez ? (
                <p className="max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                    Marcamos las cuentas que casi toda PYME necesita. Quita las que no uses, marca las de tu giro y
                    agrega las tuyas dentro de cada rubro.
                </p>
            ) : null}

            {restaurado ? (
                <Aviso>
                    <span className="flex flex-wrap items-center justify-between gap-2">
                        <span className="text-[var(--foreground)]">Retomamos la selección que dejaste sin guardar.</span>
                        <Boton variante="fantasma" onClick={empezarDeNuevo}>
                            Empezar de nuevo
                        </Boton>
                    </span>
                </Aviso>
            ) : null}

            <div className="flex flex-wrap items-center gap-2">
                <label className="relative min-w-60 flex-1">
                    <span className="sr-only">Buscar cuenta del plan base por código o nombre</span>
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
                <div className="flex flex-wrap gap-1">
                    <Boton
                        variante="fantasma"
                        disabled={datos.recomendadas.every((codigo) => seleccion.marcadas.has(codigo))}
                        onClick={() => alternar(datos.recomendadas, true)}
                    >
                        Marcar recomendadas
                    </Boton>
                    <Boton
                        variante="fantasma"
                        disabled={seleccion.marcadas.size === datos.disponibles.size}
                        onClick={() => alternar([...datos.disponibles], true)}
                    >
                        Marcar todas
                    </Boton>
                    <Boton
                        variante="fantasma"
                        disabled={seleccion.marcadas.size === 0}
                        onClick={() => alternar([...seleccion.marcadas], false)}
                    >
                        Limpiar
                    </Boton>
                </div>
            </div>

            {paneles.length === 0 ? (
                <Aviso>
                    Ninguna cuenta del plan base coincide con “{busqueda.trim()}”. Prueba con parte del nombre o con el
                    inicio del código.
                </Aviso>
            ) : (
                paneles.map(({ clase, grupos }) => (
                    <Panel key={clase.codigo} sinRelleno>
                        <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-5 pb-3 pt-4">
                            <h2 className="font-display text-[15px] font-semibold tracking-[-0.01em]">
                                <span className="tabular mr-2 text-[var(--foreground-muted)]">{clase.codigo}</span>
                                {clase.nombre}
                            </h2>
                            <p className="text-[11.5px] text-[var(--foreground-muted)]">
                                Naturaleza {claseDe(clase.id_tipo_cuenta).naturaleza}
                            </p>
                        </div>
                        <div className="flex flex-col gap-5 border-t border-[var(--border-subtle)] px-3 py-4 sm:px-5">
                            {grupos.map(({ grupo, rubros }) => (
                                <section key={grupo.codigo} aria-labelledby={`grupo-${grupo.codigo}`}>
                                    <h3
                                        id={`grupo-${grupo.codigo}`}
                                        className="text-[11.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]"
                                    >
                                        <span className="tabular mr-1.5">{grupo.codigo}</span>
                                        {grupo.nombre}
                                    </h3>
                                    <div className="mt-2 grid items-start gap-3 lg:grid-cols-2">
                                        {rubros.map(({ rubro, todas, filas, existentes }) => (
                                            <Rubro
                                                key={rubro.codigo}
                                                rubro={rubro}
                                                todas={todas}
                                                filas={filas}
                                                existentes={existentes}
                                                propias={seleccion.propias.filter((propia) => propia.codigoPadre === rubro.codigo)}
                                                marcadas={seleccion.marcadas}
                                                provistas={provistas}
                                                porId={datos.porId}
                                                problemas={problemas}
                                                mostrarProblemas={intento}
                                                alAlternar={alternar}
                                                alAgregarPropia={() => agregarPropia(rubro)}
                                                alCambiarPropia={cambiarPropia}
                                                alQuitarPropia={quitarPropia}
                                            />
                                        ))}
                                    </div>
                                </section>
                            ))}
                        </div>
                    </Panel>
                ))
            )}

            {/* Los errores van en el pie fijo, junto al botón que los provoca:
                al final del contenido quedarían fuera de la vista. */}
            <div className="sticky bottom-3 z-10 flex flex-col gap-3 rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] px-4 py-3 shadow-[0_12px_32px_rgb(20_17_15_/_0.16)]">
                {erroresVisibles.length > 0 ? (
                    <ul role="alert" className="flex flex-col gap-1 rounded-lg bg-[var(--critico-bg)] px-3 py-2 text-[12.5px] text-[var(--critico)]">
                        {erroresVisibles.map((error) => (
                            <li key={error}>{error}</li>
                        ))}
                    </ul>
                ) : null}
                <div className="flex flex-wrap items-center justify-between gap-3">
                    {/* min-w-56: en un teléfono el resumen pasa a su propia línea
                        en vez de quedar en una columna de una palabra. */}
                    <p aria-live="polite" className="min-w-56 flex-1 text-[13px]">
                        {textoResumen}
                    </p>
                    <div className="flex gap-2">
                        <EnlaceAccion href="/dashboard/plan-cuentas" variante="neutro">
                            Cancelar
                        </EnlaceAccion>
                        <Boton variante="acento" disabled={porHacer === 0 || enCurso} onClick={guardar}>
                            {enCurso ? "Guardando…" : "Guardar configuración"}
                        </Boton>
                    </div>
                </div>
            </div>
        </div>
    );
}

/* ----------------------------------------------------------------------------
   Un rubro: casilla para todas sus cuentas, cada cuenta del plan base, las
   propias que ya existen y las que se están agregando.
   -------------------------------------------------------------------------- */

type RubroProps = {
    readonly rubro: FilaPlantilla;
    /** Todas las cuentas del plan base del rubro (para la casilla y el contador). */
    readonly todas: readonly FilaPlantilla[];
    /** Las que se ven con la búsqueda actual. */
    readonly filas: readonly FilaPlantilla[];
    /** Cuentas propias que la empresa ya tiene en el rubro. */
    readonly existentes: readonly CuentaContable[];
    readonly propias: readonly PropiaNueva[];
    readonly marcadas: ReadonlySet<string>;
    readonly provistas: Readonly<Record<string, string>>;
    readonly porId: ReadonlyMap<string, CuentaContable>;
    readonly problemas: ReadonlyMap<string, string | null>;
    /** Tras intentar guardar, también se marcan las cuentas propias que nadie tocó. */
    readonly mostrarProblemas: boolean;
    readonly alAlternar: (codigos: readonly string[], marcar: boolean) => void;
    readonly alAgregarPropia: () => void;
    readonly alCambiarPropia: (clave: string, cambios: Partial<CuentaPropiaInput>) => void;
    readonly alQuitarPropia: (clave: string) => void;
};

function Rubro({
    rubro,
    todas,
    filas,
    existentes,
    propias,
    marcadas,
    provistas,
    porId,
    problemas,
    mostrarProblemas,
    alAlternar,
    alAgregarPropia,
    alCambiarPropia,
    alQuitarPropia,
}: RubroProps) {
    const disponibles = todas.filter((fila) => !(fila.codigo in provistas)).map((fila) => fila.codigo);
    const marcadasAqui = disponibles.filter((codigo) => marcadas.has(codigo)).length;
    const todasMarcadas = disponibles.length > 0 && marcadasAqui === disponibles.length;
    const elegidas = todas.length - disponibles.length + marcadasAqui;
    const idCasilla = `rubro-${rubro.codigo}`;

    return (
        <div className="flex flex-col rounded-xl border border-[var(--border-subtle)] bg-[var(--background)] p-1.5">
            <div className="flex items-center gap-3 rounded-lg px-2.5 py-2">
                <input
                    id={idCasilla}
                    type="checkbox"
                    ref={(casilla) => {
                        if (casilla) casilla.indeterminate = marcadasAqui > 0 && !todasMarcadas;
                    }}
                    checked={disponibles.length === 0 || todasMarcadas}
                    disabled={disponibles.length === 0}
                    onChange={() => alAlternar(disponibles, !todasMarcadas)}
                    className="size-4 shrink-0 accent-[var(--accent)]"
                />
                <label htmlFor={idCasilla} className="min-w-0 flex-1 text-[13px] font-semibold">
                    <span className="tabular mr-1.5 text-[var(--foreground-muted)]">{rubro.codigo}</span>
                    {rubro.nombre}
                    <span className="sr-only"> (todas sus cuentas)</span>
                </label>
                <span className="tabular shrink-0 text-[11.5px] text-[var(--foreground-muted)]">
                    {elegidas} de {todas.length}
                </span>
            </div>

            <ul className="flex flex-col">
                {filas.map((fila) => {
                    const idExistente = provistas[fila.codigo];
                    const existente = idExistente ? porId.get(idExistente) : undefined;
                    const enPlan = idExistente !== undefined;
                    return (
                        <li key={fila.codigo}>
                            <label
                                className={`flex items-center gap-3 rounded-lg px-2.5 py-1.5 text-[13px] ${
                                    enPlan ? "" : "cursor-pointer hover:bg-[var(--background-raised)]"
                                }`}
                            >
                                <input
                                    type="checkbox"
                                    checked={enPlan || marcadas.has(fila.codigo)}
                                    disabled={enPlan}
                                    onChange={(evento) => alAlternar([fila.codigo], evento.target.checked)}
                                    className="size-4 shrink-0 accent-[var(--accent)]"
                                />
                                <span className="tabular w-[4.5rem] shrink-0 text-[12.5px] text-[var(--foreground-muted)]">
                                    {existente?.codigo ?? fila.codigo}
                                </span>
                                <span className={`min-w-0 flex-1 ${enPlan ? "text-[var(--foreground-muted)]" : ""}`}>
                                    {existente?.nombre ?? fila.nombre}
                                </span>
                                {enPlan ? (
                                    <Etiqueta tono="positivo" className="shrink-0">
                                        En tu plan
                                    </Etiqueta>
                                ) : fila.recomendada ? (
                                    <Etiqueta className="shrink-0">Recomendada</Etiqueta>
                                ) : null}
                            </label>
                        </li>
                    );
                })}

                {existentes.map((cuenta) => (
                    <li key={cuenta.id_cuenta} className="flex items-center gap-3 px-2.5 py-1.5 text-[13px]">
                        <Icon name="check" className="size-4 shrink-0 text-[var(--foreground-muted)]" />
                        <span className="tabular w-[4.5rem] shrink-0 text-[12.5px] text-[var(--foreground-muted)]">
                            {cuenta.codigo}
                        </span>
                        <span className="min-w-0 flex-1 text-[var(--foreground-muted)]">{cuenta.nombre}</span>
                        <Etiqueta tono="positivo" className="shrink-0">
                            Propia
                        </Etiqueta>
                    </li>
                ))}

                {propias.map((propia) => {
                    const problema = problemas.get(propia.clave) ?? null;
                    const visible = problema !== null && (mostrarProblemas || propia.nombre !== "");
                    return (
                        <li key={propia.clave} className="mx-1 my-1 rounded-lg border border-dashed border-[var(--border-strong)] p-2">
                            <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap">
                                <input
                                    aria-label="Código de la cuenta propia"
                                    value={propia.codigo}
                                    onChange={(evento) => alCambiarPropia(propia.clave, { codigo: evento.target.value.replace(/\D/g, "") })}
                                    inputMode="numeric"
                                    maxLength={20}
                                    aria-invalid={visible}
                                    className={`tabular w-28 ${CLASES_CAMPO}`}
                                />
                                <input
                                    aria-label="Nombre de la cuenta propia"
                                    value={propia.nombre}
                                    onChange={(evento) => alCambiarPropia(propia.clave, { nombre: evento.target.value })}
                                    maxLength={150}
                                    autoFocus={propia.clave.startsWith("nueva-")}
                                    placeholder="Ej.: Banco Santander cta. cte."
                                    aria-invalid={visible}
                                    className={`min-w-0 flex-1 basis-48 ${CLASES_CAMPO}`}
                                />
                                <Boton
                                    variante="fantasma"
                                    soloIcono
                                    aria-label={`Quitar la cuenta propia ${propia.nombre || propia.codigo}`}
                                    onClick={() => alQuitarPropia(propia.clave)}
                                >
                                    <Icon name="trash" className="size-4" />
                                </Boton>
                            </div>
                            {visible ? (
                                <p className="mt-1.5 text-[12px] text-[var(--critico)]">{problema}</p>
                            ) : propia.nombre.trim().length > 40 ? (
                                <p className="mt-1.5 text-[12px] text-[var(--aviso)]">
                                    Los libros electrónicos del SII muestran hasta 40 caracteres del nombre.
                                </p>
                            ) : null}
                        </li>
                    );
                })}
            </ul>

            <Boton variante="fantasma" onClick={alAgregarPropia} className="mt-0.5 self-start">
                <Icon name="plus" className="size-3.5" />
                Cuenta propia
            </Boton>
        </div>
    );
}
