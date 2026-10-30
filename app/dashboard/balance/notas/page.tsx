/* ============================================================================
   /dashboard/balance/notas — Notas a los estados financieros (anuales).

   Orden de la Sección 8 de NIIF para PYMES: información general, bases de
   preparación, políticas contables, una nota por partida de los estados,
   juicios, incertidumbre y hechos posteriores. Las notas por partida salen del
   libro; los textos los escribe el contador, con una plantilla como borrador.

   Arriba, el índice y los editores (no se imprimen). Abajo, la nota completa:
   es lo que se ve en la vista previa y lo que sale al exportar a PDF.
   ========================================================================== */

import Link from "next/link";
import { redirect } from "next/navigation";
import { Panel } from "@/components/ui/Panel";
import { ApiError, notasEeffApi, type NotaEeff, type NotasDelEjercicio } from "@/lib/api";
import { formatearCLP, formatearFechaContable, hoyEnChile } from "@/lib/formato";
import { LEYENDA_SIN_INFORMACION, seccionesConHuecos, seccionesVacias, textoVigente } from "@/lib/notas";
import { exigirTokenSesion, obtenerRolDelToken, puedeRegistrar } from "@/lib/session";
import { Aviso, Encabezado } from "../../core-contable/partes";
import { CLASES_CAMPO, type Parametros } from "../partes";
import { BotonExportarNotas } from "./BotonExportarNotas";
import { EditorGeneral, EditorNota } from "./EditorNota";

export const dynamic = "force-dynamic";
export const metadata = { title: "Notas a los estados financieros" };

export default async function NotasPage({ searchParams }: { searchParams: Promise<Parametros> }) {
    const token = await exigirTokenSesion();
    const registra = puedeRegistrar(await obtenerRolDelToken());
    const parametros = await searchParams;
    const anioActual = Number(hoyEnChile().slice(0, 4));
    const pedido = Number(parametros.ejercicio);
    const ejercicio = Number.isInteger(pedido) && pedido >= 2000 && pedido <= 2100 ? pedido : anioActual;

    let datos: NotasDelEjercicio | null = null;
    try {
        datos = await notasEeffApi.obtener(ejercicio, { token, cache: "no-store" });
    } catch (e) {
        if (e instanceof ApiError && e.status === 401) redirect("/login");
    }

    const anios = Array.from({ length: 6 }, (_, i) => anioActual - 4 + i);
    const titulos = (notas: NotaEeff[]) => notas.map((n) => `Nota ${n.numero} · ${n.titulo}`);

    return (
        <div className="flex flex-col gap-4">
            <Encabezado
                titulo="Notas a los estados financieros"
                descripcion="Las notas del ejercicio anual, en el orden de la Sección 8. Los saldos salen del libro; los textos los redacta quien firma los estados."
                volverA="/dashboard/balance"
                acciones={
                    datos ? (
                        <BotonExportarNotas
                            vacias={titulos(seccionesVacias(datos.notas))}
                            conHuecos={titulos(seccionesConHuecos(datos.notas))}
                        />
                    ) : undefined
                }
            />

            <form method="get" action="/dashboard/balance/notas" className="no-imprimir flex flex-wrap items-end gap-3">
                <label className="flex flex-col gap-1 text-[12px] text-[var(--foreground-muted)]">
                    Ejercicio
                    <select name="ejercicio" defaultValue={ejercicio} className={`tabular ${CLASES_CAMPO}`}>
                        {anios.map((a) => (
                            <option key={a} value={a}>
                                {a}
                            </option>
                        ))}
                    </select>
                </label>
                <button
                    type="submit"
                    className="rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-1.5 text-[13px] font-medium hover:bg-[var(--background-raised)]"
                >
                    Ver notas
                </button>
            </form>

            {!datos ? (
                <Aviso tono="critico">
                    No pudimos cargar las notas. Si el servidor estaba inactivo puede tardar unos segundos en despertar: recarga la página.
                </Aviso>
            ) : (
                <>
                    <div className="no-imprimir flex flex-col gap-4">
                        <Indice notas={datos.notas} />
                        {registra ? (
                            <Aviso>
                                Los textos pueden quedar vacíos: no hay bloqueo. Las plantillas son borradores con huecos; no afirman nada
                                por sí solas, en particular no declaran que la empresa cumpla alguna norma contable.
                            </Aviso>
                        ) : (
                            <Aviso>Tu rol en esta empresa solo permite consultar las notas. Un administrador o contador las redacta.</Aviso>
                        )}
                        {(registra ? datos.notas : []).map((n) =>
                            n.tipo === "general" ? (
                                <EditorGeneral key={n.clave} ejercicio={ejercicio} datos={n.datos} />
                            ) : n.tipo === "texto" ? (
                                <EditorNota
                                    key={n.clave}
                                    ejercicio={ejercicio}
                                    clave={n.clave}
                                    numero={n.numero}
                                    titulo={n.titulo}
                                    guardado={n.texto_guardado}
                                    plantilla={n.plantilla}
                                />
                            ) : null,
                        )}
                    </div>
                    <Vista datos={datos} />
                </>
            )}
        </div>
    );
}

function Indice({ notas }: { readonly notas: readonly NotaEeff[] }) {
    return (
        <Panel>
            <h2 className="font-display text-[14px] font-semibold">Índice</h2>
            <ol className="mt-2 flex flex-col gap-1 text-[13px]">
                {notas.map((n) => (
                    <li key={n.clave}>
                        <a href={`#nota-${n.clave}`} className="underline-offset-4 hover:text-[var(--accent)] hover:underline">
                            Nota {n.numero} · {n.titulo}
                        </a>
                        {n.tipo === "partida" ? <span className="text-[var(--foreground-muted)]"> · automática, del libro</span> : null}
                    </li>
                ))}
            </ol>
        </Panel>
    );
}

/** La nota completa: vista previa en pantalla y lo que se imprime. */
function Vista({ datos }: { readonly datos: NotasDelEjercicio }) {
    return (
        <article className="flex flex-col gap-6 rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] p-6 print:border-0 print:p-0">
            <header>
                <p className="no-imprimir text-[11px] font-bold uppercase tracking-[0.07em] text-[var(--foreground-muted)]">
                    Vista previa
                </p>
                <h2 className="font-display text-lg font-semibold">
                    Notas a los estados financieros · Ejercicio {datos.ejercicio}
                </h2>
                <p className="text-[13px] text-[var(--foreground-muted)]">
                    Del {formatearFechaContable(datos.desde)} al {formatearFechaContable(datos.hasta)} · pesos chilenos
                </p>
            </header>
            {datos.notas.map((n) => (
                <section key={n.clave} id={`nota-${n.clave}`} className="scroll-mt-20 break-inside-avoid">
                    <h3 className="font-display text-[15px] font-semibold">
                        Nota {n.numero} · {n.titulo}
                    </h3>
                    {n.tipo === "general" ? (
                        <dl className="mt-2 grid grid-cols-[10rem_1fr] gap-y-1 text-[13px]">
                            <Dato nombre="Razón social" valor={n.datos.razon_social} />
                            <Dato nombre="RUT" valor={n.datos.rut} />
                            <Dato nombre="Giro" valor={n.datos.giro} />
                            <Dato nombre="Domicilio" valor={n.datos.domicilio} />
                            <Dato
                                nombre="Autorización de los estados"
                                valor={n.datos.fecha_autorizacion ? formatearFechaContable(n.datos.fecha_autorizacion) : null}
                            />
                        </dl>
                    ) : n.tipo === "texto" ? (
                        textoVigente(n).trim() === "" ? (
                            <p className="mt-2 text-[13px] italic text-[var(--foreground-muted)]">{LEYENDA_SIN_INFORMACION}</p>
                        ) : (
                            <p className="mt-2 whitespace-pre-wrap text-[13px]">{textoVigente(n)}</p>
                        )
                    ) : (
                        <table className="mt-2 w-full border-collapse text-[13px]">
                            <tbody>
                                {n.cuentas.map((c) => (
                                    <tr key={c.id_cuenta} className="border-b border-[var(--border-subtle)]">
                                        <td className="py-1 pr-4">
                                            <Link
                                                href={`/dashboard/libro-mayor?cuenta=${c.id_cuenta}&desde=${datos.desde}&hasta=${datos.hasta}`}
                                                className="underline-offset-4 hover:text-[var(--accent)] hover:underline"
                                                title="Ver su libro mayor"
                                            >
                                                <span className="tabular text-[var(--foreground-muted)]">{c.codigo}</span> {c.nombre}
                                            </Link>
                                        </td>
                                        <td className="tabular py-1 text-right">{formatearCLP(c.saldo)}</td>
                                    </tr>
                                ))}
                                <tr>
                                    <th scope="row" className="py-1.5 pr-4 text-left font-bold">
                                        Total {n.titulo.toLowerCase()}
                                    </th>
                                    <td className="tabular py-1.5 text-right font-bold">{formatearCLP(n.total)}</td>
                                </tr>
                            </tbody>
                        </table>
                    )}
                </section>
            ))}
        </article>
    );
}

function Dato({ nombre, valor }: { readonly nombre: string; readonly valor: string | null }) {
    return (
        <>
            <dt className="text-[var(--foreground-muted)]">{nombre}</dt>
            <dd className={valor ? "" : "italic text-[var(--foreground-muted)]"}>{valor ?? "pendiente"}</dd>
        </>
    );
}
