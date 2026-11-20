/* ============================================================================
   /dashboard/auditoria — quién hizo qué y cuándo.

   La ven el administrador y el contador. El menú y esta página solo lo
   muestran u ocultan: quien autoriza es el backend, que responde 403 a otro
   rol, y aquí se trata igual que un "no existe".

   Server Component. Los filtros son un <form method="get">, así que quedan en
   la URL, y el detalle de un evento se abre con ?evento=<id> y también se
   dibuja en el servidor. Ese detalle se pide solo si viene ?evento: el
   backend deja registrado cada detalle que se abre, y por eso los enlaces a él
   no se precargan.
   ========================================================================== */

import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel } from "@/components/ui/Panel";
import {
    ApiError,
    auditoriaApi,
    type EventoAuditoria,
    type Paginado,
    type PersonaAuditoria,
} from "@/lib/api";
import {
    ACCIONES,
    ENTIDADES,
    enlaceAlRegistro,
    etiquetaAccion,
    etiquetaEntidad,
    paginaPedida,
    paginaValida,
} from "@/lib/auditoria";
import { formatearFechaHoraChile } from "@/lib/formato";
import { exigirTokenSesion, obtenerRolDelToken, puedeAuditar, puedeVerCorreo, puedeVerIp } from "@/lib/session";
import { Aviso, CLASES_TH, Encabezado } from "../core-contable/partes";
import { DetalleEvento } from "./DetalleEvento";

export const dynamic = "force-dynamic";
export const metadata = { title: "Auditoría" };

type Parametros = Record<string, string | string[] | undefined>;
type Valores = Record<string, string | number | undefined>;

const PATRON_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const PATRON_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const PATRON_ENTIDAD = /^[a-z0-9-]{1,60}$/;
const RUTA = "/dashboard/auditoria";

const CLASES_CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-1.5 text-[13px] text-[var(--foreground)]";
const ENLACE = "text-[var(--accent)] underline-offset-4 hover:underline";

function texto(parametros: Parametros, clave: string): string | undefined {
    const valor = parametros[clave];
    return typeof valor === "string" && valor.trim() !== "" ? valor.trim() : undefined;
}

/** Arma una URL de la pantalla con estos valores; lo vacío se omite. */
function urlCon(valores: Valores): string {
    const url = new URLSearchParams();
    for (const [clave, valor] of Object.entries(valores)) {
        if (valor !== undefined && String(valor) !== "") url.set(clave, String(valor));
    }
    const consulta = url.toString();
    return consulta ? `${RUTA}?${consulta}` : RUTA;
}

function estadoDe(resultado: PromiseSettledResult<unknown>): number | null {
    return resultado.status === "rejected" && resultado.reason instanceof ApiError ? resultado.reason.status : null;
}

export default async function AuditoriaPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    // El rol del token solo sirve para mostrar u ocultar; el backend autoriza.
    const rol = await obtenerRolDelToken();
    if (!puedeAuditar(rol)) notFound();
    // La IP solo la manda el backend al administrador; aquí además no se dibuja la columna para quien no la ve.
    const verIp = puedeVerIp(rol);
    // Igual con el correo: el backend lo manda null a quien no lo ve, y aquí no se deja el hueco bajo el nombre.
    const verCorreo = puedeVerCorreo(rol);

    const parametros = await searchParams;
    const desde = texto(parametros, "desde");
    const hasta = texto(parametros, "hasta");
    const persona = texto(parametros, "id_usuario");
    const accion = texto(parametros, "accion");
    const entidad = texto(parametros, "entidad");
    const evento = texto(parametros, "evento");
    const filtros = {
        desde: desde && PATRON_FECHA.test(desde) ? desde : undefined,
        hasta: hasta && PATRON_FECHA.test(hasta) ? hasta : undefined,
        id_usuario: persona && PATRON_UUID.test(persona) ? persona : undefined,
        accion: accion && ACCIONES.includes(accion) ? accion : undefined,
        entidad: entidad && PATRON_ENTIDAD.test(entidad) ? entidad : undefined,
    };
    const pagina = paginaPedida(texto(parametros, "pagina"));
    const idEvento = evento && PATRON_UUID.test(evento) ? evento : undefined;

    const opciones = { token, cache: "no-store" } as const;
    const [listado, autores] = await Promise.allSettled([
        auditoriaApi.listar({ ...filtros, pagina }, opciones),
        auditoriaApi.personas(opciones),
    ]);
    const avisarSiNoPuede = (resultados: PromiseSettledResult<unknown>[]) => {
        if (resultados.some((r) => estadoDe(r) === 401)) redirect("/login");
        // Otro rol: 403. Si el backend responde 404 aquí tampoco se revela la pantalla.
        if (resultados.some((r) => estadoDe(r) === 403) || estadoDe(listado) === 404) notFound();
    };
    avisarSiNoPuede([listado, autores]);

    // Una página que se pasa del final (un enlace viejo, una URL escrita a mano) va a la última, sin el detalle abierto.
    if (listado.status === "fulfilled" && listado.value.total > 0) {
        const valida = paginaValida(pagina, listado.value.total, listado.value.por_pagina);
        if (valida < pagina) redirect(urlCon({ ...filtros, pagina: valida }));
    }

    // El detalle se pide recién ahora: el backend registra cada detalle que se abre, y un redirect no debe dejar esa fila.
    const detalle = await Promise.allSettled([idEvento ? auditoriaApi.detalle(idEvento, opciones) : Promise.resolve(null)]).then(
        ([r]) => r,
    );
    avisarSiNoPuede([detalle]);

    const errorListado =
        listado.status === "rejected"
            ? estadoDe(listado) === 400
                ? "Revisa los filtros: una fecha no es válida, o «desde» es posterior a «hasta»."
                : "No pudimos cargar la auditoría. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la página."
            : null;

    // Ya viene ordenada por nombre. Si falla por otra causa, la pantalla sigue con el filtro vacío.
    const personas = autores.status === "fulfilled" ? autores.value : [];
    // Los filtros vigentes sin el detalle abierto: lo que usan "Cerrar" y la paginación.
    const vigentes: Valores = { ...filtros };
    const nombres = new Map(personas.flatMap((p) => (p.nombre ? [[p.id_usuario.toLowerCase(), p.nombre] as const] : [])));

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Auditoría"
                descripcion="Quién hizo qué y cuándo en tu empresa. Este historial no se puede editar ni borrar."
            />

            {idEvento ? <DetalleEvento resultado={detalle} personas={nombres} verIp={verIp} verCorreo={verCorreo} cerrarHref={urlCon({ ...vigentes, pagina })} /> : null}

            <form method="get" action={RUTA} className="flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Desde
                    <input type="date" name="desde" defaultValue={filtros.desde} className={`tabular ${CLASES_CAMPO}`} />
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Hasta
                    <input type="date" name="hasta" defaultValue={filtros.hasta} className={`tabular ${CLASES_CAMPO}`} />
                </label>
                {/* Sin la lista de personas (el backend no respondió) el filtro solo ofrecería "Todas". */}
                {personas.length > 0 ? (
                    <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                        Persona
                        <select name="id_usuario" defaultValue={filtros.id_usuario ?? ""} className={CLASES_CAMPO}>
                            <option value="">Todas</option>
                            {personas.map((persona) => (
                                <OpcionPersona key={persona.id_usuario} persona={persona} />
                            ))}
                            {filtros.id_usuario && !personas.some((p) => p.id_usuario === filtros.id_usuario) ? (
                                <option value={filtros.id_usuario}>Otra persona (ya sin acceso)</option>
                            ) : null}
                        </select>
                    </label>
                ) : null}
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Acción
                    <select name="accion" defaultValue={filtros.accion ?? ""} className={CLASES_CAMPO}>
                        <option value="">Todas</option>
                        {ACCIONES.map((a) => (
                            <option key={a} value={a}>
                                {etiquetaAccion(a)}
                            </option>
                        ))}
                    </select>
                </label>
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Tipo de registro
                    <select name="entidad" defaultValue={filtros.entidad ?? ""} className={CLASES_CAMPO}>
                        <option value="">Todos</option>
                        {ENTIDADES.map((e) => (
                            <option key={e} value={e}>
                                {etiquetaEntidad(e)}
                            </option>
                        ))}
                        {filtros.entidad && !ENTIDADES.includes(filtros.entidad) ? (
                            <option value={filtros.entidad}>{etiquetaEntidad(filtros.entidad)}</option>
                        ) : null}
                    </select>
                </label>
                <button
                    type="submit"
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium hover:bg-[var(--background-raised)]"
                >
                    Filtrar
                </button>
                <Link href={RUTA} className="py-1.5 text-[13px] text-[var(--foreground-muted)] underline-offset-4 hover:underline">
                    Limpiar
                </Link>
            </form>

            {errorListado ? (
                <Aviso tono="critico">{errorListado}</Aviso>
            ) : listado.status === "fulfilled" ? (
                <TablaEventos pagina={listado.value} vigentes={vigentes} verIp={verIp} verCorreo={verCorreo} />
            ) : null}
        </div>
    );
}

function OpcionPersona({ persona }: { readonly persona: PersonaAuditoria }) {
    return <option value={persona.id_usuario}>{persona.nombre ?? "Persona sin nombre"}</option>;
}

function TablaEventos({
    pagina,
    vigentes,
    verIp,
    verCorreo,
}: {
    readonly pagina: Paginado<EventoAuditoria>;
    readonly vigentes: Valores;
    readonly verIp: boolean;
    readonly verCorreo: boolean;
}) {
    if (pagina.total === 0) {
        return <Aviso>Todavía no hay movimientos con estos filtros.</Aviso>;
    }

    const primero = (pagina.pagina - 1) * pagina.por_pagina + 1;
    const ultimo = primero + pagina.items.length - 1;

    return (
        <Panel sinRelleno>
            <div className="overflow-x-auto">
                <table className={`w-full border-collapse text-left text-[13px] ${verIp ? "min-w-[820px]" : "min-w-[700px]"}`}>
                    <thead className="border-b border-[var(--border-subtle)]">
                        <tr>
                            <th scope="col" className={CLASES_TH}>Fecha y hora (Chile)</th>
                            <th scope="col" className={CLASES_TH}>Persona</th>
                            <th scope="col" className={CLASES_TH}>Acción</th>
                            <th scope="col" className={CLASES_TH}>Registro afectado</th>
                            {verIp ? (
                                <th scope="col" className={CLASES_TH}>IP</th>
                            ) : null}
                            <th scope="col" className={CLASES_TH}>
                                <span className="sr-only">Detalle</span>
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        {pagina.items.map((e) => (
                            <FilaEvento key={e.id_auditoria} evento={e} vigentes={vigentes} pagina={pagina.pagina} verIp={verIp} verCorreo={verCorreo} />
                        ))}
                    </tbody>
                </table>
            </div>
            <div className="flex items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-4 py-3 text-[12.5px] text-[var(--foreground-muted)]">
                <span className="tabular">
                    {pagina.items.length > 0 ? `${primero}–${ultimo}` : "0"} de {pagina.total}
                </span>
                <span className="flex gap-3">
                    {pagina.pagina > 1 ? (
                        <Link href={urlCon({ ...vigentes, pagina: pagina.pagina - 1 })} className="font-medium text-[var(--foreground)] hover:underline">
                            Anterior
                        </Link>
                    ) : null}
                    {ultimo < pagina.total ? (
                        <Link href={urlCon({ ...vigentes, pagina: pagina.pagina + 1 })} className="font-medium text-[var(--foreground)] hover:underline">
                            Siguiente
                        </Link>
                    ) : null}
                </span>
            </div>
        </Panel>
    );
}

function FilaEvento({
    evento,
    vigentes,
    pagina,
    verIp,
    verCorreo,
}: {
    readonly evento: EventoAuditoria;
    readonly vigentes: Valores;
    readonly pagina: number;
    readonly verIp: boolean;
    readonly verCorreo: boolean;
}) {
    const enlace = enlaceAlRegistro(evento.entidad, evento.id_registro);
    const tono = evento.accion === "login_fallido" ? "critico" : evento.accion === "eliminar" ? "aviso" : "neutro";
    const cuando = formatearFechaHoraChile(evento.created_at);

    return (
        <tr className="border-b border-[var(--border-subtle)] last:border-0">
            <td className="tabular whitespace-nowrap px-4 py-2.5">
                <time dateTime={evento.created_at}>{cuando}</time>
            </td>
            <td className="px-4 py-2.5">
                {evento.usuario_nombre ? (
                    <>
                        <span className="font-medium">{evento.usuario_nombre}</span>
                        {verCorreo && evento.usuario_correo ? (
                            <span className="block text-[12px] text-[var(--foreground-muted)]">{evento.usuario_correo}</span>
                        ) : null}
                    </>
                ) : (
                    <span className="text-[var(--foreground-muted)]">
                        {evento.id_usuario ? "Persona desconocida" : "Sistema o sin sesión"}
                    </span>
                )}
            </td>
            <td className="whitespace-nowrap px-4 py-2.5">
                <Etiqueta tono={tono}>{etiquetaAccion(evento.accion)}</Etiqueta>
            </td>
            <td className="px-4 py-2.5">
                {enlace ? (
                    // Sin precarga: abrir un tercero puede dejar registrada una consulta de datos personales.
                    <Link href={enlace} prefetch={false} className={ENLACE}>
                        {etiquetaEntidad(evento.entidad)}
                    </Link>
                ) : (
                    etiquetaEntidad(evento.entidad)
                )}
            </td>
            {verIp ? (
                <td className="tabular whitespace-nowrap px-4 py-2.5 text-[var(--foreground-muted)]">{evento.ip ?? "—"}</td>
            ) : null}
            <td className="whitespace-nowrap px-4 py-2.5 text-right">
                <Link
                    href={`${urlCon({ ...vigentes, pagina, evento: evento.id_auditoria })}#detalle`}
                    prefetch={false}
                    aria-label={`Ver detalle: ${etiquetaAccion(evento.accion)}, ${etiquetaEntidad(evento.entidad)}, ${cuando}`}
                    className={`font-medium ${ENLACE}`}
                >
                    Ver detalle
                </Link>
            </td>
        </tr>
    );
}
