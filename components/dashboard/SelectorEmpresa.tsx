"use client";

import {
    startTransition,
    useActionState,
    useId,
    useRef,
    useState,
    useTransition,
    type CSSProperties,
    type FormEvent,
    type ReactNode,
} from "react";
import { useFormStatus } from "react-dom";

import { Boton } from "@/components/ui/Boton";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import {
    cambiarEmpresa,
    crearEmpresa,
    eliminarEmpresa,
    renombrarEmpresa,
    type EstadoCambioEmpresa,
} from "@/app/dashboard/acciones-empresa";
import type { EmpresaDelUsuario } from "@/lib/api";
import { formatearRut, formatearRutAlEscribir } from "@/lib/formato";
import { validarNuevaEmpresa, validarRazonSocial } from "@/lib/validation";

/* ============================================================================
   Empresas del usuario: popup para cambiar de empresa, agregar y eliminar.

   ---------------------------------------------------------------------------
   POR QUE UN <dialog> NATIVO
   ---------------------------------------------------------------------------
   showModal() ya trae lo que un modal hecho a mano tiene que imitar: atrapa el
   foco, deja inerte el resto de la página, cierra con Escape y pinta el fondo
   con ::backdrop. Sin librerías, que es una regla del proyecto.

   ---------------------------------------------------------------------------
   POR QUE PASOS Y NO TODO EN UNA VISTA
   ---------------------------------------------------------------------------
   Agregar, cambiar el nombre y eliminar abren su propio paso con "Volver": cada acción tiene la
   atención completa, y la de eliminar no queda a un clic de distancia de
   entrar a otra empresa. Eliminar pide dos confirmaciones: la papelera y
   escribir el RUT, que se muestra para no tener que buscarlo.

   ---------------------------------------------------------------------------
   POR QUE UN FORMULARIO POR EMPRESA PARA CAMBIAR
   ---------------------------------------------------------------------------
   El cambio de empresa termina escribiendo una cookie httpOnly, y eso solo
   puede hacerlo el servidor. Con un formulario y una Server Action, el token
   nuevo nunca toca el JavaScript del cliente.
   ========================================================================== */

/** Nombres de los roles del catálogo (cat_rol). */
const NOMBRE_ROL: Record<number, string> = {
    1: "Administrador",
    2: "Contador",
    3: "Solo consulta",
};

/**
 * Ids de cat_rol. ROL de lib/session.ts no se puede importar aquí: ese módulo
 * lee cookies del servidor y no entra en un componente cliente.
 */
const ADMINISTRADOR = 1;
const CONTADOR = 2;

/**
 * Estuche de destacadores (globals.css). Cada empresa toma uno fijo según su
 * RUT, como la etiqueta de color en el lomo del archivador de cada cliente:
 * ayuda a reconocerla de un vistazo y no cambia entre visitas.
 */
const DESTACADORES = [
    "var(--hl-orange)",
    "var(--hl-mint)",
    "var(--hl-sky)",
    "var(--hl-violet)",
    "var(--hl-pink)",
    "var(--hl-yellow)",
] as const;

const ESTADO_INICIAL: EstadoCambioEmpresa = {};

const CLASES_CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13.5px] text-[var(--foreground)] placeholder:text-[var(--foreground-muted)]";

type Paso =
    | { readonly tipo: "lista" }
    | { readonly tipo: "agregar" }
    | { readonly tipo: "editar"; readonly empresa: EmpresaDelUsuario }
    | { readonly tipo: "eliminar"; readonly empresa: EmpresaDelUsuario };

type Mensaje = { readonly tono: "positivo" | "critico"; readonly texto: string };

type SelectorEmpresaProps = {
    readonly empresas: readonly EmpresaDelUsuario[];
    readonly idEmpresaActual: string | null;
};

export function SelectorEmpresa({ empresas, idEmpresaActual }: SelectorEmpresaProps) {
    const dialogo = useRef<HTMLDialogElement>(null);
    const pulsoFuera = useRef(false);
    const idTitulo = useId();
    const [paso, setPaso] = useState<Paso>({ tipo: "lista" });
    const [mensaje, setMensaje] = useState<Mensaje | null>(null);

    /**
     * Cambio de empresa: la misma Server Action de siempre, envuelta para
     * cerrar el popup cuando termina bien (el panel ya se está pintando con la
     * empresa nueva) o mostrar el error en la lista si no.
     */
    const [, accionCambio] = useActionState(
        async (previo: EstadoCambioEmpresa, datos: FormData) => {
            const resultado = await cambiarEmpresa(previo, datos);
            if (resultado.error) {
                setMensaje({ tono: "critico", texto: resultado.error });
            } else {
                dialogo.current?.close();
            }
            return resultado;
        },
        ESTADO_INICIAL,
    );

    // null si otra persona eliminó la empresa del token: mostrar otro nombre
    // sobre esos datos sería engañoso, así que el botón pide elegir.
    const actual = empresas.find((e) => e.id_empresa === idEmpresaActual) ?? null;
    const ordenadas = [...empresas].sort((a, b) =>
        (a.razon_social ?? "").localeCompare(b.razon_social ?? "", "es"),
    );
    const puedeAgregar = actual?.id_rol === ADMINISTRADOR || actual?.id_rol === CONTADOR;

    function abrir() {
        setPaso({ tipo: "lista" });
        setMensaje(null);
        dialogo.current?.showModal();
    }

    function cerrar() {
        dialogo.current?.close();
    }

    function volverALista(aviso?: Mensaje) {
        setPaso({ tipo: "lista" });
        setMensaje(aviso ?? null);
    }

    return (
        <>
            <button
                type="button"
                onClick={abrir}
                aria-haspopup="dialog"
                className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--background-raised)] px-3 py-1.5 text-[13px] font-medium transition-colors hover:border-[var(--border-strong)]"
            >
                <Icon name="building" className="size-3.5 shrink-0" />
                <span className="max-w-[22ch] truncate">
                    {actual?.razon_social ?? "Elige una empresa"}
                </span>
                <Icon name="chevron" className="size-3.5 shrink-0 rotate-90" />
            </button>

            {/* Cerrar al pulsar el fondo: el clic en ::backdrop llega al propio
                <dialog>, y el contenido lo cubre entero (p-0). Se exige que
                también el pointerdown haya sido fuera, para que seleccionar
                texto en un campo y soltar fuera no cierre el popup. */}
            <dialog
                ref={dialogo}
                aria-labelledby={idTitulo}
                onPointerDown={(evento) => {
                    pulsoFuera.current = evento.target === evento.currentTarget;
                }}
                onClick={(evento) => {
                    if (pulsoFuera.current && evento.target === evento.currentTarget) cerrar();
                }}
                className="m-auto w-[min(30rem,calc(100vw-2rem))] overflow-hidden rounded-2xl border border-[var(--border-subtle)] bg-[var(--surface)] p-0 text-[var(--foreground)] shadow-[0_24px_64px_rgb(20_17_15_/_0.28)] backdrop:bg-[rgb(20_17_15_/_0.45)] open:animate-[soft-in_220ms_cubic-bezier(0.16,1,0.3,1)]"
            >
                <div className="flex max-h-[min(40rem,calc(100dvh-2rem))] flex-col">
                    {paso.tipo === "lista" ? (
                        <PasoLista
                            idTitulo={idTitulo}
                            empresas={ordenadas}
                            idActual={actual?.id_empresa ?? null}
                            puedeAgregar={puedeAgregar}
                            mensaje={mensaje}
                            accionCambio={accionCambio}
                            onCerrar={cerrar}
                            onAgregar={() => setPaso({ tipo: "agregar" })}
                            onEditar={(empresa) => setPaso({ tipo: "editar", empresa })}
                            onEliminar={(empresa) => setPaso({ tipo: "eliminar", empresa })}
                        />
                    ) : paso.tipo === "agregar" ? (
                        <PasoAgregar
                            idTitulo={idTitulo}
                            onCerrar={cerrar}
                            onVolver={() => volverALista()}
                            onListo={(texto) => volverALista({ tono: "positivo", texto })}
                        />
                    ) : paso.tipo === "editar" ? (
                        <PasoEditar
                            idTitulo={idTitulo}
                            empresa={paso.empresa}
                            onCerrar={cerrar}
                            onVolver={() => volverALista()}
                            onListo={(texto) => volverALista({ tono: "positivo", texto })}
                        />
                    ) : (
                        <PasoEliminar
                            idTitulo={idTitulo}
                            empresa={paso.empresa}
                            onCerrar={cerrar}
                            onVolver={() => volverALista()}
                            onListo={(texto) => volverALista({ tono: "positivo", texto })}
                        />
                    )}
                </div>
            </dialog>
        </>
    );
}

/* ----------------------------------------------------------------------------
   Paso 1: la lista de empresas.
   -------------------------------------------------------------------------- */

function PasoLista({
    idTitulo,
    empresas,
    idActual,
    puedeAgregar,
    mensaje,
    accionCambio,
    onCerrar,
    onAgregar,
    onEditar,
    onEliminar,
}: {
    readonly idTitulo: string;
    readonly empresas: readonly EmpresaDelUsuario[];
    readonly idActual: string | null;
    readonly puedeAgregar: boolean;
    readonly mensaje: Mensaje | null;
    readonly accionCambio: (datos: FormData) => void;
    readonly onCerrar: () => void;
    readonly onAgregar: () => void;
    readonly onEditar: (empresa: EmpresaDelUsuario) => void;
    readonly onEliminar: (empresa: EmpresaDelUsuario) => void;
}) {
    return (
        <>
            <Encabezado idTitulo={idTitulo} titulo="Tus empresas" onCerrar={onCerrar}>
                Elige con cuál trabajar: todo el panel muestra los datos de la empresa activa.
            </Encabezado>

            {mensaje ? (
                <p
                    role={mensaje.tono === "critico" ? "alert" : "status"}
                    className={`mx-5 mb-3 flex items-start gap-2 rounded-lg px-3 py-2 text-[12.5px] ${
                        mensaje.tono === "critico"
                            ? "bg-[var(--critico-bg)] text-[var(--critico)]"
                            : "bg-[var(--positivo-bg)] text-[var(--positivo)]"
                    }`}
                >
                    <Icon
                        name={mensaje.tono === "critico" ? "alert" : "check"}
                        className="mt-px size-4 shrink-0"
                    />
                    {mensaje.texto}
                </p>
            ) : null}

            <ul className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-5 pb-5">
                {empresas.map((empresa) => {
                    const esActual = empresa.id_empresa === idActual;
                    const esAdmin = empresa.id_rol === ADMINISTRADOR;

                    return (
                        <li key={empresa.id_empresa} className="relative">
                            <form action={accionCambio}>
                                <input type="hidden" name="id_empresa" value={empresa.id_empresa} />
                                <FilaEmpresa empresa={empresa} esActual={esActual} conAcciones={esAdmin} />
                            </form>

                            {/* Fuera del <form>: un botón dentro de otro no es
                                HTML válido, y estos no cambian de empresa. Solo
                                aparecen para quien administra esa empresa; el
                                backend lo exige igual. */}
                            {esAdmin ? (
                                <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center">
                                    <button
                                        type="button"
                                        onClick={() => onEditar(empresa)}
                                        aria-label={`Cambiar el nombre de ${empresa.razon_social ?? "la empresa"}`}
                                        title="Cambiar nombre"
                                        className="grid size-8 place-items-center rounded-md text-[var(--foreground-muted)] transition-colors hover:bg-[var(--background-raised)] hover:text-[var(--foreground)]"
                                    >
                                        <Icon name="pencil" className="size-4" />
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onEliminar(empresa)}
                                        aria-label={`Eliminar ${empresa.razon_social ?? "empresa"}`}
                                        title="Eliminar empresa"
                                        className="grid size-8 place-items-center rounded-md text-[var(--foreground-muted)] transition-colors hover:bg-[var(--critico-bg)] hover:text-[var(--critico)]"
                                    >
                                        <Icon name="trash" className="size-4" />
                                    </button>
                                </div>
                            ) : null}
                        </li>
                    );
                })}
            </ul>

            {puedeAgregar ? (
                <div className="border-t border-[var(--border-subtle)] px-5 py-4">
                    <Boton variante="acento" onClick={onAgregar} className="w-full sm:w-auto">
                        <Icon name="plus" className="size-4" />
                        Agregar empresa
                    </Boton>
                </div>
            ) : null}
        </>
    );
}

/**
 * Una empresa de la lista.
 *
 * Va en su propio componente porque useFormStatus() solo informa del formulario
 * que lo contiene: llamado desde el padre, `pending` se activaría en todas las
 * filas a la vez al pulsar cualquiera.
 */
function FilaEmpresa({
    empresa,
    esActual,
    conAcciones,
}: {
    readonly empresa: EmpresaDelUsuario;
    readonly esActual: boolean;
    /** Deja lugar a la derecha para los botones de editar y eliminar. */
    readonly conAcciones: boolean;
}) {
    const { pending } = useFormStatus();

    return (
        <button
            type="submit"
            disabled={esActual || pending}
            aria-current={esActual ? "true" : undefined}
            className={`group flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors disabled:cursor-default ${
                conAcciones ? "pr-[4.75rem]" : ""
            } ${
                esActual
                    ? "border-[var(--border-strong)] bg-[var(--background-raised)]"
                    : "border-[var(--border-subtle)] hover:border-[var(--border-strong)] hover:bg-[var(--background-raised)]"
            }`}
        >
            <Monograma empresa={empresa} />

            <span className="min-w-0 flex-1">
                <span className="block truncate text-[13.5px] font-semibold">
                    {empresa.razon_social ?? "Sin nombre"}
                </span>
                <span className="tabular block truncate text-[11.5px] text-[var(--foreground-muted)]">
                    {empresa.rut} · {NOMBRE_ROL[empresa.id_rol] ?? `Rol ${empresa.id_rol}`}
                </span>
            </span>

            {pending ? (
                <span className="shrink-0 text-[11.5px] text-[var(--foreground-muted)]">Entrando…</span>
            ) : esActual ? (
                <Etiqueta tono="positivo" className="shrink-0">
                    Activa
                </Etiqueta>
            ) : (
                // En pantallas angostas queda solo la flecha: el ancho es para el nombre.
                <span className="inline-flex shrink-0 items-center gap-1 text-[12px] font-medium text-[var(--foreground-muted)] transition-colors group-hover:text-[var(--accent)]">
                    <span className="hidden sm:inline">Entrar</span>
                    <Icon name="arrowRight" className="size-3.5" />
                </span>
            )}
        </button>
    );
}

/** Iniciales de la empresa sobre su color de destacador, con el lomo marcado. */
function Monograma({ empresa }: { readonly empresa: EmpresaDelUsuario }) {
    const palabras = (empresa.razon_social ?? "").trim().split(/\s+/).filter(Boolean);
    const iniciales = palabras
        .slice(0, 2)
        .map((palabra) => palabra[0])
        .join("")
        .toUpperCase();

    return (
        <span
            aria-hidden="true"
            style={{ "--hl": colorDeEmpresa(empresa.rut) } as CSSProperties}
            className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg bg-[color-mix(in_srgb,var(--hl)_18%,var(--surface))] font-display text-[13px] font-bold tracking-[-0.01em]"
        >
            <span className="absolute inset-y-0 left-0 w-[3px] bg-[var(--hl)]" />
            {iniciales || "?"}
        </span>
    );
}

/** Mismo RUT, mismo color, en cualquier pantalla y sesión. */
function colorDeEmpresa(rut: string | null): string {
    let suma = 0;
    for (const digito of (rut ?? "").replace(/\D/g, "")) suma += Number(digito);
    return DESTACADORES[suma % DESTACADORES.length];
}

/* ----------------------------------------------------------------------------
   Paso 2: agregar empresa.
   -------------------------------------------------------------------------- */

function PasoAgregar({
    idTitulo,
    onCerrar,
    onVolver,
    onListo,
}: {
    readonly idTitulo: string;
    readonly onCerrar: () => void;
    readonly onVolver: () => void;
    readonly onListo: (aviso: string) => void;
}) {
    const idBase = useId();
    const [rut, setRut] = useState("");
    const [razonSocial, setRazonSocial] = useState("");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    function alEnviar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();

        const locales = validarNuevaEmpresa(rut, razonSocial);
        setErrores(locales);
        if (locales.length > 0) return;

        iniciar(async () => {
            const resultado = await crearEmpresa(rut, razonSocial);
            // Tras un await, React ya no cuenta las actualizaciones como parte
            // de la transición: sin envolverlas de nuevo, el aviso "Agregaste X"
            // se pinta antes que la lista refrescada que trae a X.
            startTransition(() => {
                if (resultado.errores) setErrores(resultado.errores);
                else onListo(resultado.aviso ?? "Agregaste la empresa.");
            });
        });
    }

    return (
        <form onSubmit={alEnviar} noValidate className="flex min-h-0 flex-1 flex-col">
            <Encabezado idTitulo={idTitulo} titulo="Agregar empresa" onCerrar={onCerrar} onVolver={onVolver}>
                Quedarás como administrador de la empresa nueva. Revisamos que el RUT sea válido y que no
                esté registrado en Finova.
            </Encabezado>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 pb-5">
                <Campo id={`${idBase}-rut`} etiqueta="RUT de la empresa">
                    <input
                        id={`${idBase}-rut`}
                        value={rut}
                        onChange={(evento) => setRut(formatearRutAlEscribir(evento.target.value))}
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="76.543.210-3"
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                </Campo>

                <Campo id={`${idBase}-razon`} etiqueta="Razón social">
                    <input
                        id={`${idBase}-razon`}
                        value={razonSocial}
                        onChange={(evento) => setRazonSocial(evento.target.value)}
                        maxLength={150}
                        autoComplete="organization"
                        placeholder="Comercial Los Andes SpA"
                        className={CLASES_CAMPO}
                    />
                </Campo>

                <Errores errores={errores} />
            </div>

            <Pie>
                <Boton variante="neutro" onClick={onVolver} disabled={enCurso}>
                    Cancelar
                </Boton>
                <Boton variante="acento" type="submit" disabled={enCurso}>
                    {enCurso ? "Agregando…" : "Agregar empresa"}
                </Boton>
            </Pie>
        </form>
    );
}

/* ----------------------------------------------------------------------------
   Paso 3: cambiar el nombre (solo la razón social; el RUT no se edita).
   -------------------------------------------------------------------------- */

function PasoEditar({
    idTitulo,
    empresa,
    onCerrar,
    onVolver,
    onListo,
}: {
    readonly idTitulo: string;
    readonly empresa: EmpresaDelUsuario;
    readonly onCerrar: () => void;
    readonly onVolver: () => void;
    readonly onListo: (aviso: string) => void;
}) {
    const idCampo = useId();
    const original = empresa.razon_social ?? "";
    const [nombre, setNombre] = useState(original);
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    // Guardar el mismo nombre seria un viaje al servidor que no cambia nada.
    const sinCambios = nombre.trim() === original.trim();

    function alGuardar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();

        const locales = validarRazonSocial(nombre);
        setErrores(locales);
        if (locales.length > 0 || sinCambios) return;

        iniciar(async () => {
            const resultado = await renombrarEmpresa(empresa.id_empresa, nombre);
            // Igual que al agregar: el aviso y la lista con el nombre nuevo, juntos.
            startTransition(() => {
                if (resultado.errores) setErrores(resultado.errores);
                else onListo(resultado.aviso ?? "Cambiaste el nombre de la empresa.");
            });
        });
    }

    return (
        <form onSubmit={alGuardar} noValidate className="flex min-h-0 flex-1 flex-col">
            <Encabezado idTitulo={idTitulo} titulo="Cambiar nombre" onCerrar={onCerrar} onVolver={onVolver}>
                Corrige la razón social si quedó mal escrita. El RUT{" "}
                <span className="tabular font-semibold text-[var(--foreground)]">{empresa.rut}</span> no cambia:
                si el error está en el RUT, elimina la empresa y agrégala de nuevo.
            </Encabezado>

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 pb-5">
                <Campo id={idCampo} etiqueta="Razón social">
                    <input
                        id={idCampo}
                        value={nombre}
                        onChange={(evento) => setNombre(evento.target.value)}
                        onFocus={(evento) => evento.currentTarget.select()}
                        autoFocus
                        maxLength={150}
                        autoComplete="organization"
                        className={CLASES_CAMPO}
                    />
                </Campo>

                <Errores errores={errores} />
            </div>

            <Pie>
                <Boton variante="neutro" onClick={onVolver} disabled={enCurso}>
                    Cancelar
                </Boton>
                <Boton variante="acento" type="submit" disabled={enCurso || sinCambios}>
                    {enCurso ? "Guardando…" : "Guardar nombre"}
                </Boton>
            </Pie>
        </form>
    );
}

/* ----------------------------------------------------------------------------
   Paso 4: eliminar empresa (segunda confirmación).
   -------------------------------------------------------------------------- */

function PasoEliminar({
    idTitulo,
    empresa,
    onCerrar,
    onVolver,
    onListo,
}: {
    readonly idTitulo: string;
    readonly empresa: EmpresaDelUsuario;
    readonly onCerrar: () => void;
    readonly onVolver: () => void;
    readonly onListo: (aviso: string) => void;
}) {
    const idCampo = useId();
    const [escrito, setEscrito] = useState("");
    const [errores, setErrores] = useState<readonly string[]>([]);
    const [enCurso, iniciar] = useTransition();

    const nombre = empresa.razon_social ?? "esta empresa";
    // Se compara normalizado: da igual escribirlo con o sin puntos.
    const coincide = empresa.rut !== null && formatearRut(escrito) === empresa.rut;

    function alConfirmar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        if (!coincide) return;

        setErrores([]);
        iniciar(async () => {
            const resultado = await eliminarEmpresa(empresa.id_empresa, nombre);
            // Igual que al agregar: el aviso y la lista sin la empresa, juntos.
            startTransition(() => {
                if (resultado.errores) setErrores(resultado.errores);
                else onListo(resultado.aviso ?? `Eliminaste ${nombre}.`);
            });
        });
    }

    return (
        <form onSubmit={alConfirmar} className="flex min-h-0 flex-1 flex-col">
            <Encabezado
                idTitulo={idTitulo}
                titulo={`Eliminar ${nombre}`}
                critico
                onCerrar={onCerrar}
                onVolver={onVolver}
            />

            <div className="grid min-h-0 flex-1 gap-4 overflow-y-auto px-5 pb-5">
                <ul className="grid gap-2 rounded-xl border border-[var(--border-subtle)] bg-[var(--background-raised)] p-3.5 text-[13px]">
                    <Consecuencia>Desaparece del panel para todas las personas con acceso a ella.</Consecuencia>
                    <Consecuencia>
                        Sus libros y comprobantes no se borran: la ley exige conservarlos.
                    </Consecuencia>
                    <Consecuencia>Si vuelves a agregar su RUT, la recuperas con todos sus datos.</Consecuencia>
                </ul>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor={idCampo} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                        Para confirmar, escribe el RUT de la empresa:{" "}
                        <span className="tabular font-semibold text-[var(--foreground)]">{empresa.rut}</span>
                    </label>
                    <input
                        id={idCampo}
                        value={escrito}
                        onChange={(evento) => setEscrito(formatearRutAlEscribir(evento.target.value))}
                        autoFocus
                        autoComplete="off"
                        spellCheck={false}
                        aria-invalid={escrito.length > 0 && !coincide}
                        className={`tabular ${CLASES_CAMPO}`}
                    />
                </div>

                <Errores errores={errores} />
            </div>

            <Pie>
                <Boton variante="neutro" onClick={onVolver} disabled={enCurso}>
                    Cancelar
                </Boton>
                <Boton variante="peligro" type="submit" disabled={!coincide || enCurso}>
                    {enCurso ? "Eliminando…" : "Eliminar empresa"}
                </Boton>
            </Pie>
        </form>
    );
}

/* ----------------------------------------------------------------------------
   Piezas compartidas por los pasos.
   -------------------------------------------------------------------------- */

function Encabezado({
    idTitulo,
    titulo,
    critico = false,
    onCerrar,
    onVolver,
    children,
}: {
    readonly idTitulo: string;
    readonly titulo: string;
    readonly critico?: boolean;
    readonly onCerrar: () => void;
    readonly onVolver?: () => void;
    readonly children?: ReactNode;
}) {
    return (
        <header className="flex items-start gap-2 px-5 pb-4 pt-5">
            {onVolver ? (
                <Boton variante="fantasma" soloIcono aria-label="Volver a la lista" onClick={onVolver} className="-ml-2 shrink-0">
                    <Icon name="arrowRight" className="size-4 rotate-180" />
                </Boton>
            ) : null}

            <div className="min-w-0 flex-1 pt-1.5">
                <h2
                    id={idTitulo}
                    className={`flex items-center gap-2 font-display text-[17px] font-semibold leading-tight tracking-[-0.015em] ${
                        critico ? "text-[var(--critico)]" : ""
                    }`}
                >
                    {critico ? <Icon name="alert" className="size-[18px] shrink-0" /> : null}
                    <span className="truncate">{titulo}</span>
                </h2>
                {children ? (
                    <p className="mt-1 text-[12.5px] leading-relaxed text-[var(--foreground-muted)]">{children}</p>
                ) : null}
            </div>

            <Boton variante="fantasma" soloIcono aria-label="Cerrar" onClick={onCerrar} className="-mr-2 shrink-0">
                <Icon name="close" className="size-4" />
            </Boton>
        </header>
    );
}

function Campo({ id, etiqueta, children }: { readonly id: string; readonly etiqueta: string; readonly children: ReactNode }) {
    return (
        <div className="flex flex-col gap-1.5">
            <label htmlFor={id} className="text-[12.5px] font-medium text-[var(--foreground-muted)]">
                {etiqueta}
            </label>
            {children}
        </div>
    );
}

function Consecuencia({ children }: { readonly children: ReactNode }) {
    return (
        <li className="flex gap-2">
            <span aria-hidden="true" className="mt-[7px] size-1.5 shrink-0 rounded-full bg-[var(--critico)]" />
            <span>{children}</span>
        </li>
    );
}

function Errores({ errores }: { readonly errores: readonly string[] }) {
    if (errores.length === 0) return null;

    return (
        <ul role="alert" className="grid gap-1 rounded-lg bg-[var(--critico-bg)] px-3 py-2 text-[12.5px] text-[var(--critico)]">
            {errores.map((error) => (
                <li key={error}>{error}</li>
            ))}
        </ul>
    );
}

function Pie({ children }: { readonly children: ReactNode }) {
    return (
        <div className="flex flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
            {children}
        </div>
    );
}
