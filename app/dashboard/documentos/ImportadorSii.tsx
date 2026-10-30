"use client";

import Link from "next/link";
import { startTransition, useActionState, useEffect, useRef, useState, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import type { TipoImportacionSii } from "@/lib/api";
import { nombrePeriodo } from "@/lib/formato";
import { COOKIE_IMPORTADOR, IMPORTABLES, importableDe, urlLibro } from "@/lib/sii";
import { TEXTO_DESCARGA_SII, atributosDelEnlace, obtenerArchivoDesdeSii, opcionesDeArchivo, vistaDeOrigen, type OrigenImportacion } from "@/lib/sii-urls";
import { Aviso } from "../core-contable/partes";
import { importarArchivo, previsualizarArchivo, type EstadoImportacion, type EstadoRevision } from "./actions";
import { CampoMes } from "./CampoMes";
import { ResumenDeImportacion } from "./ResumenDeImportacion";
import { VistaPrevia } from "./VistaPrevia";

const CAMPO =
    "w-full rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3 py-2 text-[13px] text-[var(--foreground)]";

function recordarEleccion(tipo: string, periodo: string) {
    document.cookie = `${COOKIE_IMPORTADOR}=${tipo}|${periodo}; path=/dashboard/documentos; max-age=31536000; samesite=lax`;
}

/** En qué paso va quien importa: elegir el archivo, revisar lo que entraría, o ver lo que se importó. */
type Paso = "elegir" | "revisar" | "importado";

/**
 * Importación en dos pasos: primero se REVISA el archivo (no guarda nada: dice
 * qué entraría, qué se rechazaría y por qué, con la fila de cada línea), y solo
 * después se importa.
 *
 * Lo que eliges (qué subir, el período y el archivo) se queda: no se borra al
 * revisar ni al importar, ni al cambiar de libro o de mes, ni al recargar. Por
 * eso el formulario NO usa `action`: React vacía los campos de un formulario
 * cuando su acción termina. Cambiar cualquier campo descarta la revisión, que
 * dejaría de ser del archivo que se ve.
 */
export function ImportadorSii({
    tipoInicial,
    periodoInicial,
}: {
    readonly tipoInicial: TipoImportacionSii;
    readonly periodoInicial: string;
}) {
    const formulario = useRef<HTMLFormElement>(null);
    const [tipo, setTipo] = useState<TipoImportacionSii>(tipoInicial);
    const [periodo, setPeriodo] = useState(periodoInicial);
    const [paso, setPaso] = useState<Paso>("elegir");
    const [nombreArchivo, setNombreArchivo] = useState<string | null>(null);
    const [revision, revisar, revisando] = useActionState<EstadoRevision, FormData>(previsualizarArchivo, {});
    const [importacion, importar, importando] = useActionState<EstadoImportacion, FormData>(importarArchivo, {});
    const [origen, setOrigen] = useState<OrigenImportacion>("local");
    const [dialogoArchivo, setDialogoArchivo] = useState(false);
    const inputArchivo = useRef<HTMLInputElement>(null);
    useEffect(() => {
        if (!dialogoArchivo) return;
        const cerrarConEscape = (e: KeyboardEvent) => e.key === "Escape" && setDialogoArchivo(false);
        window.addEventListener("keydown", cerrarConEscape);
        return () => window.removeEventListener("keydown", cerrarConEscape);
    }, [dialogoArchivo]);
    const importable = importableDe(tipo);
    const archivoSii = obtenerArchivoDesdeSii(tipo, periodo);
    const vista = vistaDeOrigen(origen, archivoSii);

    function alRevisar(evento: FormEvent<HTMLFormElement>) {
        evento.preventDefault();
        const datos = new FormData(evento.currentTarget);
        setPaso("revisar");
        startTransition(() => revisar(datos));
    }

    function alImportar() {
        if (!formulario.current) return;
        const datos = new FormData(formulario.current);
        setPaso("importado");
        startTransition(() => importar(datos));
    }

    const resultado = importacion.resultado;
    const libroImportado = resultado && (resultado.tipo === "compras" || resultado.tipo === "ventas") && resultado.periodo;

    return (
        <div>
            <form ref={formulario} onSubmit={alRevisar} className="grid gap-4 md:grid-cols-[9rem_1.2fr_11rem_1.4fr_auto] md:items-end">
                {/* El origen no viaja en el formulario (sin name): la revisión y la importación siguen recibiendo solo tipo, período y archivo. */}
                <label className="flex flex-col gap-1.5 text-[12.5px] font-medium">
                    Origen
                    <select
                        value={origen}
                        onChange={(e) => {
                            setOrigen(e.target.value as OrigenImportacion);
                            setPaso("elegir");
                        }}
                        className={CAMPO}
                    >
                        <option value="local">Archivo local</option>
                        <option value="sii">SII</option>
                    </select>
                </label>

                <label className="flex flex-col gap-1.5 text-[12.5px] font-medium">
                    Qué vas a subir
                    <select
                        name="tipo"
                        value={tipo}
                        onChange={(e) => {
                            const nuevo = e.target.value as TipoImportacionSii;
                            setTipo(nuevo);
                            setNombreArchivo(null);
                            setPaso("elegir");
                            recordarEleccion(nuevo, periodo);
                        }}
                        className={CAMPO}
                    >
                        {IMPORTABLES.map((i) => (
                            <option key={i.id} value={i.id}>
                                {i.etiqueta}
                            </option>
                        ))}
                    </select>
                </label>

                {/* Las boletas y los DTE traen su propia fecha: el período solo aplica al RCV. */}
                {importable.esRcv ? (
                    <div className="flex flex-col gap-1.5 text-[12.5px] font-medium">
                        Período
                        <CampoMes
                            valor={periodo}
                            onCambio={(nuevo) => {
                                setPeriodo(nuevo);
                                setPaso("elegir");
                                recordarEleccion(tipo, nuevo);
                            }}
                        />
                    </div>
                ) : (
                    <div className="hidden md:block" />
                )}

                {vista.botonIrAlSii ? (
                    <a
                        {...atributosDelEnlace(archivoSii)}
                        className="inline-flex items-center justify-center gap-2 rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] transition-[background-color,filter] hover:bg-[var(--background-raised)]"
                    >
                        Ir al SII
                        <span className="sr-only">(se abre en una pestaña nueva)</span>
                    </a>
                ) : null}

                {vista.campoArchivo ? (
                <div className="flex flex-col gap-1.5 text-[12.5px] font-medium">
                    <span>Archivo</span>
                    {/* "Elegir archivo" abre un diálogo: subir desde el computador (abre el selector del navegador) o ir al SII.
                        El selector nativo muestra "Choose File / No file chosen" en el idioma del navegador:
                        se oculta y se dibuja uno en español sobre el mismo <input>. */}
                    <button
                        type="button"
                        aria-haspopup="dialog"
                        onClick={() => setDialogoArchivo(true)}
                        className={`${CAMPO} flex items-center gap-3 text-left hover:border-[var(--accent)] focus-visible:border-[var(--accent)]`}
                    >
                        <span className="shrink-0 rounded bg-[var(--background-raised)] px-2 py-1 text-[12px] font-medium">Elegir archivo</span>
                        <span className="truncate font-normal text-[var(--foreground-muted)]" title={nombreArchivo ?? undefined}>
                            {nombreArchivo ?? "Ningún archivo seleccionado"}
                        </span>
                    </button>
                    <input
                        ref={inputArchivo}
                        // Cambiar de tipo vacía el archivo: lo que acepta cada tipo es distinto.
                        key={tipo}
                        type="file"
                        name="archivo"
                        accept={importable.acepta}
                        tabIndex={-1}
                        onChange={(e) => {
                            setNombreArchivo(e.target.files?.[0]?.name ?? null);
                            setPaso("elegir");
                        }}
                        className="sr-only"
                    />
                </div>
                ) : null}

                {dialogoArchivo ? (
                    <div
                        role="dialog"
                        aria-modal="true"
                        aria-labelledby="importador-dialogo-titulo"
                        className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setDialogoArchivo(false);
                        }}
                    >
                        <section className="w-full max-w-md rounded-xl border border-[var(--border-strong)] bg-[var(--surface)] p-5 text-[13px] shadow-xl">
                            <h2 id="importador-dialogo-titulo" className="text-[14px] font-semibold text-[var(--foreground)]">
                                ¿De dónde viene el archivo?
                            </h2>
                            <p className="mt-1 text-[var(--foreground-muted)]">Dónde se descarga: {importable.reporte}.</p>
                            <div className="mt-4 grid gap-3">
                                {opcionesDeArchivo(archivoSii).map((opcion) =>
                                    opcion.enlace ? (
                                        <div key={opcion.origen}>
                                            <a
                                                {...opcion.enlace}
                                                onClick={() => setDialogoArchivo(false)}
                                                className="inline-flex w-full items-center justify-center rounded-lg border border-[var(--border-strong)] bg-[var(--surface)] px-3.5 py-2 text-[13px] font-medium text-[var(--foreground)] hover:bg-[var(--background-raised)]"
                                            >
                                                {opcion.etiqueta}
                                                <span className="sr-only">(se abre en una pestaña nueva)</span>
                                            </a>
                                            <p className="mt-1.5 text-[12px] text-[var(--foreground-muted)]">{TEXTO_DESCARGA_SII}</p>
                                        </div>
                                    ) : (
                                        <Boton
                                            key={opcion.origen}
                                            variante="acento"
                                            onClick={() => {
                                                setDialogoArchivo(false);
                                                inputArchivo.current?.click();
                                            }}
                                        >
                                            {opcion.etiqueta}
                                        </Boton>
                                    ),
                                )}
                            </div>
                            <div className="mt-4 flex justify-end">
                                <Boton variante="fantasma" onClick={() => setDialogoArchivo(false)}>
                                    Cancelar
                                </Boton>
                            </div>
                        </section>
                    </div>
                ) : null}

                <Boton type="submit" variante={paso === "revisar" ? "neutro" : "acento"} disabled={revisando || importando || !vista.puedeRevisar}>
                    {revisando ? "Revisando…" : paso === "revisar" ? "Revisar de nuevo" : "Revisar archivo"}
                </Boton>
            </form>

            <p className="mt-3 text-[12px] text-[var(--foreground-muted)]">
                Dónde se descarga: {importable.reporte}.
            </p>
            {vista.botonIrAlSii ? (
                <p className="mt-1 text-[12px] text-[var(--foreground-muted)]">{TEXTO_DESCARGA_SII}</p>
            ) : null}

            {/* Errores de lo elegido o del archivo (columnas que faltan, archivo vacío...) */}
            {paso === "revisar" && !revisando && revision.errores ? (
                <div className="mt-4">
                    <Aviso tono="critico">
                        <ul className="list-disc pl-4">
                            {revision.errores.map((mensaje) => (
                                <li key={mensaje}>{mensaje}</li>
                            ))}
                        </ul>
                    </Aviso>
                </div>
            ) : null}

            {/* Mientras se importa, la revisión sigue a la vista: así no hay un hueco entre un paso y otro. */}
            {((paso === "revisar" && !revisando) || (paso === "importado" && importando)) && revision.vista ? (
                <div className="mt-4">
                    <VistaPrevia vista={revision.vista} importando={importando} onImportar={alImportar} onCancelar={() => setPaso("elegir")}
                        onUsarPeriodo={(nuevo) => {
                            setPeriodo(nuevo);
                            setPaso("elegir");
                            recordarEleccion(tipo, nuevo);
                        }}
                    />
                </div>
            ) : null}

            {paso === "importado" && importacion.errores && !importando ? (
                <div className="mt-4">
                    <Aviso tono="critico">
                        <ul className="list-disc pl-4">
                            {importacion.errores.map((mensaje) => (
                                <li key={mensaje}>{mensaje}</li>
                            ))}
                        </ul>
                    </Aviso>
                </div>
            ) : null}

            {paso === "importado" && resultado && !importando ? (
                <div className="mt-4">
                    <ResumenDeImportacion importacion={resultado} />
                    {libroImportado ? (
                        <Link
                            href={urlLibro({ libro: resultado.tipo, periodo: resultado.periodo as string })}
                            className="mt-2 inline-block text-[13px] font-medium text-[var(--accent)] underline-offset-4 hover:underline"
                        >
                            Ver el {resultado.tipo === "compras" ? "libro de compras" : "libro de ventas"} de{" "}
                            {nombrePeriodo(Number((resultado.periodo as string).slice(0, 4)), Number((resultado.periodo as string).slice(5)))} →
                        </Link>
                    ) : null}
                </div>
            ) : null}
        </div>
    );
}
