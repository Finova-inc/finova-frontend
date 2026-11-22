"use client";

import { useRouter } from "next/navigation";
import { useEffect, useId, useMemo, useRef, useState, type KeyboardEvent } from "react";

import { Icon, type IconName } from "@/components/ui/Icon";
import { Resaltado } from "@/components/ui/Resaltado";
import {
    GRUPOS,
    LARGO_MAXIMO_BUSQUEDA,
    claveRecientes,
    comoResultados,
    guardarReciente,
    hrefDe,
    leerRecientes,
    type ResultadoBusqueda,
} from "@/lib/busqueda";
import { formatearFechaContable } from "@/lib/formato";

/* ============================================================================
   Barra de búsqueda del panel.

   Busca lo que la empresa creó (asientos, borradores, terceros, cuentas y
   documentos del SII) mientras se escribe: espera una pausa de 250 ms y cancela
   la consulta anterior, así que escribir de corrido hace una o dos consultas,
   no una por letra. Con la barra vacía muestra los recientes: lo último que la
   persona abrió desde aquí, guardado solo en su navegador (lib/busqueda.ts).

   Es un combobox ARIA: el foco se queda en el campo y las flechas mueven la
   opción activa (aria-activedescendant). Ctrl+K (⌘K en Mac) lleva a la barra.
   Lo que coincide se marca con <Resaltado>, el mismo del plan de cuentas.
   ========================================================================== */

const ESPERA_MS = 250;

const ICONO: Record<ResultadoBusqueda["tipo"], IconName> = {
    asiento: "ledger",
    borrador: "pencil",
    tercero: "users",
    cuenta: "grid",
    documento: "document",
};

type Estado = "inactivo" | "buscando" | "listo" | "error";

export function BarraBusqueda({
    idUsuario,
    idEmpresa,
}: {
    readonly idUsuario: string | null;
    readonly idEmpresa: string | null;
}) {
    const router = useRouter();
    const idBase = useId();
    const idLista = `${idBase}-lista`;
    const campo = useRef<HTMLInputElement>(null);
    const contenedor = useRef<HTMLDivElement>(null);
    const clave = claveRecientes(idUsuario, idEmpresa);

    const [texto, setTexto] = useState("");
    const [abierto, setAbierto] = useState(false);
    const [resultados, setResultados] = useState<ResultadoBusqueda[]>([]);
    const [estado, setEstado] = useState<Estado>("inactivo");
    const [mensajeError, setMensajeError] = useState("");
    const [activo, setActivo] = useState(-1);
    const [recientes, setRecientes] = useState<ResultadoBusqueda[]>([]);

    const consulta = texto.trim();

    // Consulta con pausa y cancelación: cada tecla reinicia la espera y corta la consulta en curso.
    useEffect(() => {
        if (!consulta) return;
        const corte = new AbortController();
        const espera = setTimeout(() => {
            setEstado("buscando");
            fetch(`/api/busqueda?q=${encodeURIComponent(consulta)}`, { signal: corte.signal })
                .then(async (r) => {
                    const datos: unknown = await r.json().catch(() => null);
                    if (!r.ok) {
                        if (r.status === 401) {
                            router.push("/login");
                            return;
                        }
                        const message = (datos as { message?: unknown } | null)?.message;
                        setMensajeError(typeof message === "string" ? message : "No pudimos buscar.");
                        setEstado("error");
                        return;
                    }
                    setResultados(comoResultados(datos));
                    setActivo(-1);
                    setEstado("listo");
                })
                .catch(() => {
                    if (corte.signal.aborted) return;
                    setMensajeError("No pudimos conectar con el servidor. Si estaba inactivo, reintenta en unos segundos.");
                    setEstado("error");
                });
        }, ESPERA_MS);
        return () => {
            clearTimeout(espera);
            corte.abort();
        };
    }, [consulta, router]);

    // Ctrl+K / ⌘K desde cualquier parte del panel.
    useEffect(() => {
        function alPresionar(e: globalThis.KeyboardEvent) {
            if (!(e.ctrlKey || e.metaKey) || e.altKey || e.shiftKey || e.key.toLowerCase() !== "k") return;
            e.preventDefault();
            campo.current?.focus();
            campo.current?.select();
        }
        window.addEventListener("keydown", alPresionar);
        return () => window.removeEventListener("keydown", alPresionar);
    }, []);

    // Clic fuera: se cierra.
    useEffect(() => {
        if (!abierto) return;
        function alTocar(e: PointerEvent) {
            if (!contenedor.current?.contains(e.target as Node)) setAbierto(false);
        }
        document.addEventListener("pointerdown", alTocar);
        return () => document.removeEventListener("pointerdown", alTocar);
    }, [abierto]);

    /** Lo que se ve, en grupos y en el orden del teclado. */
    const grupos = useMemo(() => {
        if (!consulta) return recientes.length > 0 ? [{ titulo: "Recientes", items: recientes }] : [];
        return GRUPOS.map((g) => ({ titulo: g.titulo, items: resultados.filter((r) => r.tipo === g.tipo) })).filter(
            (g) => g.items.length > 0,
        );
    }, [consulta, recientes, resultados]);
    const opciones = grupos.flatMap((g) => g.items);
    const idOpcion = (i: number) => `${idBase}-opcion-${i}`;

    function abrir() {
        setRecientes(leerRecientes(typeof window === "undefined" ? null : window.localStorage, clave));
        setAbierto(true);
    }

    function cambiarTexto(valor: string) {
        setTexto(valor);
        setActivo(-1);
        if (!valor.trim()) {
            setResultados([]);
            setEstado("inactivo");
        }
        if (!abierto) abrir();
    }

    function elegir(r: ResultadoBusqueda) {
        setRecientes(guardarReciente(window.localStorage, clave, r));
        setAbierto(false);
        setTexto("");
        setResultados([]);
        setEstado("inactivo");
        campo.current?.blur();
        router.push(hrefDe(r));
    }

    function alTeclear(e: KeyboardEvent<HTMLInputElement>) {
        if (e.key === "ArrowDown" || e.key === "ArrowUp") {
            e.preventDefault();
            if (!abierto) abrir();
            if (opciones.length === 0) return;
            const paso = e.key === "ArrowDown" ? 1 : -1;
            setActivo((a) => (a + paso + opciones.length) % opciones.length);
        } else if (e.key === "Enter") {
            const elegido = opciones[activo] ?? (consulta ? opciones[0] : undefined);
            if (elegido) {
                e.preventDefault();
                elegir(elegido);
            }
        } else if (e.key === "Escape") {
            if (abierto) setAbierto(false);
            else cambiarTexto("");
        }
    }

    const sinResultados = Boolean(consulta) && estado === "listo" && opciones.length === 0;
    const mostrarPanel = abierto && (opciones.length > 0 || sinResultados || estado === "error" || (estado === "buscando" && opciones.length === 0) || !consulta);
    const anuncio =
        estado === "buscando"
            ? "Buscando…"
            : estado === "error"
              ? mensajeError
              : sinResultados
                ? `Sin resultados para «${consulta}»`
                : consulta && estado === "listo"
                  ? `${opciones.length} ${opciones.length === 1 ? "resultado" : "resultados"}`
                  : "";

    return (
        <div ref={contenedor} className="relative hidden min-w-0 max-w-[460px] flex-1 sm:block">
            <label className="flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] px-3 py-1.5 text-[var(--foreground-muted)] focus-within:border-[var(--accent)]">
                <Icon name="search" className="size-4 shrink-0" />
                <input
                    ref={campo}
                    type="search"
                    role="combobox"
                    aria-label="Buscar en la empresa"
                    aria-expanded={mostrarPanel}
                    aria-controls={idLista}
                    aria-autocomplete="list"
                    aria-activedescendant={activo >= 0 && mostrarPanel ? idOpcion(activo) : undefined}
                    autoComplete="off"
                    spellCheck={false}
                    maxLength={LARGO_MAXIMO_BUSQUEDA}
                    placeholder="Buscar asientos, terceros, cuentas…"
                    value={texto}
                    onChange={(e) => cambiarTexto(e.target.value)}
                    onFocus={abrir}
                    onKeyDown={alTeclear}
                    className="min-w-0 flex-1 bg-transparent text-[13px] text-[var(--foreground)] outline-none placeholder:text-[var(--foreground-muted)] [&::-webkit-search-cancel-button]:hidden"
                />
                <kbd className="hidden shrink-0 rounded border border-[var(--border-subtle)] px-1.5 text-[10.5px] font-medium md:inline">
                    Ctrl K
                </kbd>
            </label>

            <p role="status" className="sr-only">
                {anuncio}
            </p>

            {mostrarPanel ? (
                <div className="absolute inset-x-0 top-full z-30 mt-1.5 max-h-[min(70vh,480px)] overflow-y-auto rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] py-1.5 shadow-[0_12px_32px_rgb(20_17_15_/_0.16)]">
                    <ul id={idLista} role="listbox" aria-label="Resultados de la búsqueda">
                        {grupos.map((g) => (
                            <li key={g.titulo} role="presentation">
                                <p className="px-3.5 pb-1 pt-2 text-[10.5px] font-semibold uppercase tracking-[0.08em] text-[var(--foreground-muted)]">
                                    {g.titulo}
                                </p>
                                <ul role="group" aria-label={g.titulo}>
                                    {g.items.map((r) => {
                                        const i = opciones.indexOf(r);
                                        return (
                                            <li
                                                key={`${r.tipo}-${r.id}`}
                                                id={idOpcion(i)}
                                                role="option"
                                                aria-selected={i === activo}
                                                // mousedown sin foco: el campo no pierde el foco antes del clic.
                                                onMouseDown={(e) => e.preventDefault()}
                                                onClick={() => elegir(r)}
                                                onMouseEnter={() => setActivo(i)}
                                                className={`mx-1.5 flex cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 ${
                                                    i === activo ? "bg-[var(--background-raised)]" : ""
                                                }`}
                                            >
                                                <span className="grid size-7 shrink-0 place-items-center rounded-md bg-[var(--background-raised)] text-[var(--foreground-muted)]">
                                                    <Icon name={ICONO[r.tipo]} className="size-3.5" />
                                                </span>
                                                <span className="min-w-0 flex-1">
                                                    <span className="block truncate text-[13px] text-[var(--foreground)]">
                                                        <Resaltado texto={r.titulo} busqueda={consulta} />
                                                    </span>
                                                    <span className="block truncate text-[11.5px] text-[var(--foreground-muted)]">
                                                        <Resaltado texto={r.detalle} busqueda={consulta} />
                                                        {r.fecha ? ` · ${formatearFechaContable(r.fecha)}` : ""}
                                                    </span>
                                                </span>
                                            </li>
                                        );
                                    })}
                                </ul>
                            </li>
                        ))}
                    </ul>

                    {!consulta && opciones.length === 0 ? (
                        <p className="px-3.5 py-2.5 text-[12.5px] text-[var(--foreground-muted)]">
                            Escribe parte de una glosa, una razón social, un RUT, un código de cuenta o un folio.
                        </p>
                    ) : null}
                    {estado === "buscando" && opciones.length === 0 ? (
                        <p className="px-3.5 py-2.5 text-[12.5px] text-[var(--foreground-muted)]">Buscando…</p>
                    ) : null}
                    {sinResultados ? (
                        <p className="px-3.5 py-2.5 text-[12.5px] text-[var(--foreground-muted)]">
                            Nada coincide con «{consulta}».
                        </p>
                    ) : null}
                    {estado === "error" ? (
                        <p className="px-3.5 py-2.5 text-[12.5px] text-[var(--critico)]">{mensajeError}</p>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
