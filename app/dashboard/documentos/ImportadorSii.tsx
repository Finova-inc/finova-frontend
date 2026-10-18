"use client";

import Link from "next/link";
import { startTransition, useActionState, useRef, useState, type FormEvent } from "react";
import { Boton } from "@/components/ui/Boton";
import type { TipoImportacionSii } from "@/lib/api";
import { nombrePeriodo } from "@/lib/formato";
import { COOKIE_IMPORTADOR, IMPORTABLES, importableDe, urlLibro } from "@/lib/sii";
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
    const importable = importableDe(tipo);

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
            <form ref={formulario} onSubmit={alRevisar} className="grid gap-4 md:grid-cols-[1.2fr_11rem_1.4fr_auto] md:items-end">
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

                <label className="group flex cursor-pointer flex-col gap-1.5 text-[12.5px] font-medium">
                    Archivo
                    {/* El selector nativo muestra "Choose File / No file chosen" en el idioma del navegador:
                        se oculta y se dibuja uno en español sobre el mismo <input>. */}
                    <span className={`${CAMPO} flex items-center gap-3 group-focus-within:border-[var(--accent)]`}>
                        <span className="shrink-0 rounded bg-[var(--background-raised)] px-2 py-1 text-[12px] font-medium">Elegir archivo</span>
                        <span className="truncate font-normal text-[var(--foreground-muted)]" title={nombreArchivo ?? undefined}>
                            {nombreArchivo ?? "Ningún archivo seleccionado"}
                        </span>
                    </span>
                    <input
                        // Cambiar de tipo vacía el archivo: lo que acepta cada tipo es distinto.
                        key={tipo}
                        type="file"
                        name="archivo"
                        accept={importable.acepta}
                        onChange={(e) => {
                            setNombreArchivo(e.target.files?.[0]?.name ?? null);
                            setPaso("elegir");
                        }}
                        className="sr-only"
                    />
                </label>

                <Boton type="submit" variante={paso === "revisar" ? "neutro" : "acento"} disabled={revisando || importando}>
                    {revisando ? "Revisando…" : paso === "revisar" ? "Revisar de nuevo" : "Revisar archivo"}
                </Boton>
            </form>

            <p className="mt-3 text-[12px] text-[var(--foreground-muted)]">
                Dónde se descarga: {importable.reporte}.
            </p>

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
                    <VistaPrevia vista={revision.vista} importando={importando} onImportar={alImportar} onCancelar={() => setPaso("elegir")} />
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
