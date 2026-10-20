/* ============================================================================
   /dashboard/terceros — clientes y proveedores de la empresa.

   La libreta de contrapartes: con quién se hizo cada compra y cada venta. El
   RUT es la clave (único por empresa, con dígito verificador válido) y por
   él se enlazan los documentos importados del SII.

   Las contrapartes del SII que todavía no están registradas aparecen como
   sugerencias, con rol y tipo de persona propuestos. No se registran solas:
   el RUT de una persona natural es un dato personal (Ley 21.719) y lo decide
   el contador.

   Server Component: la búsqueda y los filtros van en la URL
   (?buscar=&rol=&estado=), así la vista se puede recargar, compartir o volver
   atrás sin perderla.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import { Panel, PanelCabecera } from "@/components/ui/Panel";
import { ApiError, tercerosApi, type ContraparteSugerida, type FiltroTerceros, type Tercero } from "@/lib/api";
import { formatearCLP, formatearFechaContable } from "@/lib/formato";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { filtrosDesdeUrl, nombreRoles, urlRegistrar, urlTerceros } from "@/lib/terceros";
import { Aviso, CLASES_TH, EnlaceAccion, Encabezado, Guia, ReglasGuia } from "../core-contable/partes";

export const dynamic = "force-dynamic";
export const metadata = { title: "Terceros" };

type Parametros = Record<string, string | string[] | undefined>;

const REGLAS: readonly string[] = [
    "Un tercero es un cliente, un proveedor o ambos. El RUT es único dentro de la empresa: si ya existe, Finova lo avisa y no lo duplica. El mismo RUT sí puede estar en otra empresa.",
    "Los documentos importados del SII se enlazan solos con el tercero que tiene su RUT, aunque se hayan importado antes de registrarlo.",
    "Las contrapartes del SII sin registrar aparecen abajo como sugerencias. No se registran solas: el RUT de una persona natural es un dato personal (Ley 21.719).",
    "Desactivar lo saca de los asientos nuevos y se deshace con un clic. Dar de baja es la supresión de la Ley 21.719: deja de aparecer, pero sus documentos se conservan por obligación tributaria.",
    "Si el tercero ya tiene documentos o asientos, su RUT no se puede cambiar: un RUT mal escrito se corrige registrando el tercero correcto.",
];

const CELDA = "px-4 py-2.5";

function chip(activo: boolean): string {
    return `inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[12.5px] font-medium transition-colors ${
        activo
            ? "border-[var(--accent)] bg-[var(--accent)] text-white"
            : "border-[var(--border-strong)] text-[var(--foreground-muted)] hover:text-[var(--foreground)]"
    }`;
}

function Filtros({ filtros, todos }: { readonly filtros: FiltroTerceros; readonly todos: readonly Tercero[] }) {
    const contar = (condicion: (t: Tercero) => boolean) => todos.filter(condicion).length;
    const rol = (valor: FiltroTerceros["rol"]) => urlTerceros({ ...filtros, rol: valor });
    const estado = (valor: FiltroTerceros["estado"]) => urlTerceros({ ...filtros, estado: valor });

    return (
        <div className="flex flex-col gap-3">
            <form method="get" action="/dashboard/terceros" role="search" className="flex max-w-xl gap-2">
                {/* Buscar conserva los demás filtros. */}
                {filtros.rol ? <input type="hidden" name="rol" value={filtros.rol} /> : null}
                {filtros.estado ? <input type="hidden" name="estado" value={filtros.estado} /> : null}
                <label className="flex min-w-0 flex-1 items-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[var(--foreground-muted)]">
                    <Icon name="search" className="size-4 shrink-0" />
                    <input
                        type="search"
                        name="buscar"
                        defaultValue={filtros.buscar ?? ""}
                        maxLength={100}
                        placeholder="Buscar por nombre o RUT…"
                        aria-label="Buscar terceros por nombre o RUT"
                        className="min-w-0 flex-1 bg-transparent text-[13.5px] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)]"
                    />
                </label>
                <button
                    type="submit"
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium hover:bg-[var(--background-raised)]"
                >
                    Buscar
                </button>
            </form>
            <div className="flex flex-wrap items-center gap-x-5 gap-y-2">
                {/* replace: cambiar de filtro no es ir a otra pantalla, y así "Volver" sale de un paso. */}
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por rol">
                    <Link replace href={rol(undefined)} className={chip(!filtros.rol)}>
                        Todos <span className="tabular">{todos.length}</span>
                    </Link>
                    <Link replace href={rol("proveedor")} className={chip(filtros.rol === "proveedor")}>
                        Proveedores <span className="tabular">{contar((t) => t.es_proveedor)}</span>
                    </Link>
                    <Link replace href={rol("cliente")} className={chip(filtros.rol === "cliente")}>
                        Clientes <span className="tabular">{contar((t) => t.es_cliente)}</span>
                    </Link>
                </div>
                <div className="flex flex-wrap items-center gap-2" role="group" aria-label="Filtrar por estado">
                    <span className="text-[12px] font-medium text-[var(--foreground-muted)]">Estado:</span>
                    <Link replace href={estado(undefined)} className={chip(!filtros.estado)}>
                        Todos
                    </Link>
                    <Link replace href={estado("activos")} className={chip(filtros.estado === "activos")}>
                        Activos <span className="tabular">{contar((t) => t.is_active)}</span>
                    </Link>
                    <Link replace href={estado("inactivos")} className={chip(filtros.estado === "inactivos")}>
                        Inactivos <span className="tabular">{contar((t) => !t.is_active)}</span>
                    </Link>
                </div>
            </div>
        </div>
    );
}

function TablaTerceros({ terceros }: { readonly terceros: readonly Tercero[] }) {
    return (
        <div className="overflow-x-auto">
            <table className="w-full min-w-[720px] border-collapse text-left text-[13px]">
                <thead className="border-b border-[var(--border-subtle)]">
                    <tr>
                        <th scope="col" className={CLASES_TH}>Razón social</th>
                        <th scope="col" className={CLASES_TH}>RUT</th>
                        <th scope="col" className={CLASES_TH}>Tipo</th>
                        <th scope="col" className={CLASES_TH}>Rol</th>
                        <th scope="col" className={CLASES_TH}>Estado</th>
                    </tr>
                </thead>
                <tbody>
                    {terceros.map((t) => (
                        <tr
                            key={t.id_tercero}
                            className={`border-b border-[var(--border-subtle)] last:border-0 hover:bg-[var(--background-raised)] ${
                                t.is_active ? "" : "text-[var(--foreground-muted)]"
                            }`}
                        >
                            <td className={`max-w-[340px] ${CELDA}`}>
                                <Link
                                    href={`/dashboard/terceros/${t.id_tercero}`}
                                    className="block truncate font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                                    title={t.razon_social}
                                >
                                    {t.razon_social}
                                </Link>
                            </td>
                            <td className={`tabular whitespace-nowrap ${CELDA}`}>{t.rut}</td>
                            <td className={CELDA}>{t.tipo_persona === "N" ? "Persona natural" : "Persona jurídica"}</td>
                            <td className={CELDA}>{nombreRoles(t)}</td>
                            <td className={CELDA}>
                                <Etiqueta tono={t.is_active ? "positivo" : "aviso"}>{t.is_active ? "Activo" : "Inactivo"}</Etiqueta>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

function Sugerencias({ sugerencias, puede }: { readonly sugerencias: readonly ContraparteSugerida[]; readonly puede: boolean }) {
    return (
        <Panel sinRelleno>
            {/* <details> nativo: plegable sin JavaScript; abierto cuando son pocas. */}
            <details open={sugerencias.length <= 8} className="group">
                <summary className="flex cursor-pointer list-none flex-wrap items-baseline justify-between gap-2 px-5 py-4 [&::-webkit-details-marker]:hidden">
                    <span className="flex items-center gap-2 font-display text-sm font-semibold">
                        <Icon name="chevron" className="size-4 shrink-0 text-[var(--foreground-muted)] transition-transform duration-150 group-open:rotate-90" />
                        Por registrar desde el SII
                        <Etiqueta tono="aviso">{sugerencias.length}</Etiqueta>
                    </span>
                    <span className="text-[12px] text-[var(--foreground-muted)]">
                        Contrapartes de tus documentos importados que todavía no son terceros
                    </span>
                </summary>
                <div className="overflow-x-auto border-t border-[var(--border-subtle)]">
                    <table className="w-full min-w-[820px] border-collapse text-left text-[13px]">
                        <thead className="border-b border-[var(--border-subtle)]">
                            <tr>
                                <th scope="col" className={CLASES_TH}>Contraparte</th>
                                <th scope="col" className={CLASES_TH}>Aparece como</th>
                                <th scope="col" className={`${CLASES_TH} text-right`}>Documentos</th>
                                <th scope="col" className={`${CLASES_TH} text-right`}>Monto</th>
                                <th scope="col" className={CLASES_TH}>Último</th>
                                <th scope="col" className={CLASES_TH}>Tipo sugerido</th>
                                <th scope="col" className={CLASES_TH}>
                                    <span className="sr-only">Acción</span>
                                </th>
                            </tr>
                        </thead>
                        <tbody>
                            {sugerencias.map((s) => (
                                <tr key={s.rut} className="border-b border-[var(--border-subtle)] last:border-0">
                                    <td className={`max-w-[280px] ${CELDA}`}>
                                        <p className="truncate font-medium" title={s.nombre ?? undefined}>
                                            {s.nombre ?? "Sin nombre en el documento"}
                                        </p>
                                        <p className="tabular text-[11.5px] text-[var(--foreground-muted)]">{s.rut}</p>
                                    </td>
                                    <td className={CELDA}>
                                        {nombreRoles({ es_proveedor: s.como_proveedor, es_cliente: s.como_cliente })}
                                    </td>
                                    <td className={`tabular ${CELDA} text-right`}>{s.cantidad_documentos}</td>
                                    <td className={`tabular ${CELDA} text-right`}>{formatearCLP(s.monto_total)}</td>
                                    <td className={`tabular whitespace-nowrap ${CELDA}`}>{formatearFechaContable(s.ultima_fecha)}</td>
                                    <td className={CELDA} title={s.motivo_tipo_persona}>
                                        {s.tipo_persona_sugerido === "N" ? "Natural" : "Jurídica"}
                                        <span className="block text-[11px] text-[var(--foreground-muted)]">sugerido</span>
                                    </td>
                                    <td className={`${CELDA} text-right`}>
                                        {puede ? (
                                            <Link
                                                href={urlRegistrar({
                                                    rut: s.rut,
                                                    nombre: s.nombre,
                                                    comoProveedor: s.como_proveedor,
                                                    comoCliente: s.como_cliente,
                                                    tipo: s.tipo_persona_sugerido,
                                                    motivo: s.motivo_tipo_persona,
                                                })}
                                                className="inline-flex items-center gap-1 whitespace-nowrap font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                                            >
                                                Registrar
                                                <Icon name="arrowRight" className="size-3.5" />
                                            </Link>
                                        ) : null}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
                <p className="border-t border-[var(--border-subtle)] px-5 py-3 text-[12px] text-[var(--foreground-muted)]">
                    El tipo de persona es una sugerencia (el SII no publica rangos de RUT): se confirma al registrar. Si
                    no quieres registrar a alguien, basta con no hacerlo; sus documentos se conservan igual.
                </p>
            </details>
        </Panel>
    );
}

export default async function TercerosPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const rol = await obtenerRolDelToken();
    const parametros = await searchParams;
    const filtros = filtrosDesdeUrl(parametros);
    const hayFiltros = Object.keys(filtros).length > 0;
    const puede = puedeRegistrar(rol);
    const opciones = { token, cache: "no-store" as const };

    // allSettled: si fallan las sugerencias, la libreta se ve igual.
    const [todos, filtrados, sugerencias] = await Promise.allSettled([
        tercerosApi.listar(opciones),
        hayFiltros ? tercerosApi.filtrar(filtros, opciones) : Promise.resolve(null),
        tercerosApi.sugerencias(opciones),
    ]);
    for (const resultado of [todos, filtrados, sugerencias]) {
        if (resultado.status === "rejected" && resultado.reason instanceof ApiError && resultado.reason.status === 401) {
            redirect("/login");
        }
    }

    const lista = todos.status === "fulfilled" ? todos.value : null;
    const visibles = hayFiltros ? (filtrados.status === "fulfilled" ? filtrados.value : null) : lista;
    const porRegistrar = sugerencias.status === "fulfilled" ? sugerencias.value : [];

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Terceros"
                descripcion="Clientes y proveedores de la empresa: con quién se hizo cada compra y cada venta. Sus documentos del SII se enlazan por RUT."
                acciones={
                    puede ? (
                        <EnlaceAccion href="/dashboard/terceros/nuevo">
                            <Icon name="plus" className="size-4" />
                            Nuevo tercero
                        </EnlaceAccion>
                    ) : null
                }
            />

            <Guia titulo="Cómo funcionan los terceros">
                <ReglasGuia reglas={REGLAS} />
            </Guia>

            {parametros.baja ? (
                <Aviso>
                    Tercero dado de baja. Sus documentos y asientos se conservan; si vuelves a registrar su RUT, se
                    recupera con su historia.
                </Aviso>
            ) : null}

            {porRegistrar.length > 0 ? <Sugerencias sugerencias={porRegistrar} puede={puede} /> : null}

            {lista === null || visibles === null ? (
                <Aviso tono="critico">
                    No pudimos cargar los terceros. Si el servidor estaba inactivo puede tardar unos segundos en
                    despertar: recarga la página.
                </Aviso>
            ) : lista.length === 0 ? (
                <Panel>
                    <PanelCabecera titulo="Todavía no hay terceros registrados" />
                    <p className="mt-2 max-w-3xl text-[13.5px] text-[var(--foreground-muted)]">
                        Registra a tus clientes y proveedores con su RUT y su razón social.
                        {porRegistrar.length > 0
                            ? " Puedes partir por las contrapartes de tus documentos del SII, que aparecen arriba con sus datos ya propuestos."
                            : " Si importas documentos del SII, sus contrapartes aparecerán aquí como sugerencias."}
                    </p>
                    {puede ? (
                        <div className="mt-4">
                            <EnlaceAccion href="/dashboard/terceros/nuevo">
                                <Icon name="plus" className="size-4" />
                                Registrar el primero
                            </EnlaceAccion>
                        </div>
                    ) : null}
                </Panel>
            ) : (
                <>
                    <Filtros filtros={filtros} todos={lista} />
                    <Panel sinRelleno>
                        {visibles.length === 0 ? (
                            <p className="p-5 text-[13px] text-[var(--foreground-muted)]">
                                Ningún tercero coincide con la búsqueda.{" "}
                                <Link replace href="/dashboard/terceros" className="text-[var(--accent)] underline-offset-4 hover:underline">
                                    Ver todos
                                </Link>
                            </p>
                        ) : (
                            <TablaTerceros terceros={visibles} />
                        )}
                    </Panel>
                </>
            )}
        </div>
    );
}
