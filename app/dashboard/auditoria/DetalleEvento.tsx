import type { ReactNode } from "react";
import Link from "next/link";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Panel } from "@/components/ui/Panel";
import { ApiError, type DetalleEventoAuditoria } from "@/lib/api";
import {
    enlaceAlRegistro,
    etiquetaAccion,
    etiquetaCampo,
    cambiosVisibles,
    etiquetaEntidad,
    formatearValorAuditado,
} from "@/lib/auditoria";
import { formatearFechaHoraChile } from "@/lib/formato";
import { Aviso } from "../core-contable/partes";

/* ============================================================================
   Detalle de un evento, dibujado en el servidor: no hay JavaScript de cliente.

   Lo pide la página solo cuando la URL trae ?evento=<id>, porque el backend
   deja registrado cada detalle que se abre (puede mostrar datos personales).
   ========================================================================== */

const ENLACE = "text-[var(--accent)] underline-offset-4 hover:underline";

function Dato({ titulo, children }: { readonly titulo: string; readonly children: ReactNode }) {
    return (
        <div className="min-w-0">
            <dt className="text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">{titulo}</dt>
            <dd className="mt-0.5 break-words">{children}</dd>
        </div>
    );
}

export function DetalleEvento({
    resultado,
    personas,
    verIp,
    verCorreo,
    cerrarHref,
}: {
    readonly resultado: PromiseSettledResult<DetalleEventoAuditoria | null>;
    /** uuid en minúsculas → nombre, de las personas que aparecen en la auditoría de la empresa. */
    readonly personas: ReadonlyMap<string, string>;
    /** Quien no ve la IP tampoco ve el navegador: el backend manda los dos null y no se dibuja ninguno. */
    readonly verIp: boolean;
    /** Solo el administrador ve el correo: el backend lo manda null a los demás y no se deja el hueco. */
    readonly verCorreo: boolean;
    readonly cerrarHref: string;
}) {
    if (resultado.status === "rejected") {
        const noExiste = resultado.reason instanceof ApiError && resultado.reason.status === 404;
        return (
            <section id="detalle" aria-label="Detalle del evento" className="scroll-mt-20">
                <Aviso tono={noExiste ? "neutro" : "critico"}>
                    {noExiste
                        ? "No encontramos ese evento. Puede que ya no esté disponible."
                        : "No pudimos cargar el detalle. Si el servidor estaba inactivo puede tardar unos segundos en despertar: vuelve a abrirlo."}{" "}
                    <Link href={cerrarHref} className={`font-medium ${ENLACE}`}>
                        Cerrar
                    </Link>
                </Aviso>
            </section>
        );
    }

    const evento = resultado.value;
    if (!evento) return null;

    const enlace = enlaceAlRegistro(evento.entidad, evento.id_registro);
    const cambios = evento.cambios ? cambiosVisibles(evento.cambios) : null;
    const datos = [
        ["Datos anteriores", evento.datos_antes],
        ["Datos registrados", evento.datos_despues],
    ] as const;

    return (
        <section id="detalle" aria-label="Detalle del evento" className="scroll-mt-20">
            <Panel>
                <div className="flex items-baseline justify-between gap-3">
                    <h2 className="font-display text-sm font-semibold">Detalle del evento</h2>
                    <Link href={cerrarHref} className={`text-[13px] ${ENLACE}`}>
                        Cerrar
                    </Link>
                </div>

                <dl className="mt-4 grid gap-x-6 gap-y-3 text-[13px] sm:grid-cols-2">
                    <Dato titulo="Quién">
                        {evento.usuario_nombre ?? (evento.id_usuario ? "Persona desconocida" : "Sistema o sin sesión")}
                        {verCorreo && evento.usuario_correo ? (
                            <span className="block text-[12px] text-[var(--foreground-muted)]">{evento.usuario_correo}</span>
                        ) : null}
                    </Dato>
                    <Dato titulo="Cuándo (hora de Chile)">
                        <time dateTime={evento.created_at} className="tabular">
                            {formatearFechaHoraChile(evento.created_at)}
                        </time>
                    </Dato>
                    <Dato titulo="Acción">{etiquetaAccion(evento.accion)}</Dato>
                    <Dato titulo="Registro afectado">
                        {enlace ? (
                            <Link href={enlace} prefetch={false} className={ENLACE}>
                                {etiquetaEntidad(evento.entidad)}
                            </Link>
                        ) : (
                            etiquetaEntidad(evento.entidad)
                        )}
                    </Dato>
                    {verIp ? (
                        <>
                            <Dato titulo="Dirección IP">
                                <span className="tabular">{evento.ip ?? "—"}</span>
                            </Dato>
                            <Dato titulo="Navegador">{evento.user_agent ?? "—"}</Dato>
                        </>
                    ) : null}
                </dl>

                <h3 className="mt-6 text-[10.5px] font-semibold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">
                    Cambios
                </h3>
                {cambios && cambios.length > 0 ? (
                    <ul className="mt-2 flex flex-col gap-1.5 text-[13px]">
                        {cambios.map((cambio) => (
                            <li key={cambio.campo} className="break-words">
                                <span className="font-medium">{etiquetaCampo(cambio.campo)}</span>:{" "}
                                <span className="text-[var(--foreground-muted)]">
                                    {formatearValorAuditado(cambio.campo, cambio.antes, personas)}
                                </span>{" "}
                                <span aria-hidden="true">→</span>
                                <span className="sr-only"> pasó a </span>{" "}
                                <span>{formatearValorAuditado(cambio.campo, cambio.despues, personas)}</span>
                            </li>
                        ))}
                    </ul>
                ) : cambios ? (
                    <p className="mt-2 text-[13px] text-[var(--foreground-muted)]">
                        Este evento no cambió ningún campo de los que se registran.
                    </p>
                ) : (
                    <>
                        {evento.accion !== "crear" || !evento.datos_despues || Object.keys(evento.datos_despues).length === 0 ? (
                            <p className="mt-2 text-[13px] text-[var(--foreground-muted)]">
                                Sin detalle de cambios para este evento.
                            </p>
                        ) : null}
                        {datos.map(([titulo, valores]) =>
                            valores && Object.keys(valores).length > 0 ? (
                                <div key={titulo} className="mt-4">
                                    <Etiqueta>{titulo}</Etiqueta>
                                    <dl className="mt-2 grid gap-x-6 gap-y-2 text-[13px] sm:grid-cols-2">
                                        {Object.entries(valores).map(([campo, valor]) => (
                                            <Dato key={campo} titulo={etiquetaCampo(campo)}>
                                                {formatearValorAuditado(campo, valor, personas)}
                                            </Dato>
                                        ))}
                                    </dl>
                                </div>
                            ) : null,
                        )}
                    </>
                )}
            </Panel>
        </section>
    );
}
