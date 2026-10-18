import Link from "next/link";
import { ESTADOS_RCV, TIPOS_DEL_FILTRO, nombreTipoDte, urlLibro, type ParametrosLibro } from "@/lib/sii";

const CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-2.5 py-1.5 text-[13px] text-[var(--foreground)]";

/**
 * Barra de filtros del libro. Es un formulario GET: lo que se filtra queda en
 * la URL, así se puede recargar, compartir o volver atrás sin perderlo. El
 * orden va en campos ocultos para que filtrar no lo borre.
 */
export function Filtros({ base, esRcv }: { readonly base: ParametrosLibro; readonly esRcv: boolean }) {
    const hayFiltros = Boolean(base.texto || base.tipo || base.estado || base.cuadratura);
    return (
        // key: los campos no controlados conservan lo que se escribio aunque la URL cambie
        // (un chip, un orden, "Quitar filtros"); al cambiar el filtro, el formulario parte de nuevo.
        <form
            key={[base.texto, base.tipo, base.estado, base.cuadratura].join("|")}
            method="get"
            action="/dashboard/documentos"
            className="flex flex-wrap items-end gap-3"
        >
            <input type="hidden" name="libro" value={base.libro} />
            <input type="hidden" name="periodo" value={base.periodo} />
            {base.orden ? <input type="hidden" name="orden" value={base.orden} /> : null}
            {base.dir ? <input type="hidden" name="dir" value={base.dir} /> : null}
            {/* La cuadratura se filtra con los chips de arriba: aquí solo se conserva al filtrar. */}
            {base.cuadratura ? <input type="hidden" name="cuadratura" value={base.cuadratura} /> : null}

            <label className="flex min-w-[15rem] flex-1 flex-col gap-1 text-[12px] font-medium">
                Buscar
                <input
                    type="search"
                    name="texto"
                    defaultValue={base.texto}
                    placeholder="Nombre, RUT o N° de folio"
                    className={`${CAMPO} w-full`}
                />
            </label>

            {esRcv ? (
                <>
                    <label className="flex flex-col gap-1 text-[12px] font-medium">
                        Tipo de documento
                        <select name="tipo" defaultValue={base.tipo ?? ""} className={CAMPO}>
                            <option value="">Todos</option>
                            {TIPOS_DEL_FILTRO.map((t) => (
                                <option key={t} value={t}>
                                    {t} · {nombreTipoDte(t)}
                                </option>
                            ))}
                        </select>
                    </label>
                    <label className="flex flex-col gap-1 text-[12px] font-medium">
                        Estado en el RCV
                        <select name="estado" defaultValue={base.estado ?? ""} className={CAMPO}>
                            <option value="">Todos</option>
                            {ESTADOS_RCV.map((e) => (
                                <option key={e} value={e}>
                                    {e}
                                </option>
                            ))}
                        </select>
                    </label>
                </>
            ) : (
                <label className="flex flex-col gap-1 text-[12px] font-medium">
                    Estado
                    <select name="estado" defaultValue={base.estado ?? ""} className={CAMPO}>
                        <option value="">Todas</option>
                        <option value="vigente">Vigentes</option>
                        <option value="anulada">Anuladas</option>
                    </select>
                </label>
            )}

            <div className="flex items-center gap-2">
                <button type="submit" className="rounded-lg border border-[var(--accent)] bg-[var(--accent)] px-3.5 py-1.5 text-[13px] font-semibold text-white hover:brightness-110">
                    Filtrar
                </button>
                {hayFiltros ? (
                    <Link
                        href={urlLibro({ libro: base.libro, periodo: base.periodo })}
                        className="text-[12.5px] font-medium text-[var(--foreground-muted)] underline-offset-4 hover:underline"
                    >
                        Quitar filtros
                    </Link>
                ) : null}
            </div>
        </form>
    );
}
