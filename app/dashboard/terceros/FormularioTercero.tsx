"use client";

import { useId, useState, useTransition } from "react";
import { Boton } from "@/components/ui/Boton";
import type { TerceroInput } from "@/lib/api";
import { formatearRutAlEscribir } from "@/lib/formato";
import { sugerirTipoPersona } from "@/lib/terceros";
import { validarRazonSocial, validateRut } from "@/lib/validation";
import { editarTercero, registrarTercero, type EstadoTercero } from "./actions";

const CAMPO =
    "rounded-lg border border-[var(--border-strong)] bg-[var(--background)] px-3 py-2 text-[13.5px] text-[var(--foreground)] disabled:cursor-not-allowed disabled:opacity-60";
const ETIQUETA = "flex flex-col gap-1.5 text-[12.5px] font-medium text-[var(--foreground-muted)]";

type Props = {
    readonly inicial?: Partial<TerceroInput>;
    /**
     * Motivo de la sugerencia de tipo de persona cuando los datos vienen de los
     * documentos del SII; sin él, la sugerencia se calcula del RUT al escribir.
     */
    readonly motivoSugerencia?: string;
} & (
    | { readonly modo: "registrar" }
    | {
          readonly modo: "editar";
          readonly idTercero: string;
          /** El tercero ya tiene documentos o asientos: su RUT no se puede cambiar. */
          readonly rutBloqueado: boolean;
          readonly onListo: () => void;
          readonly onCancelar: () => void;
      }
);

/**
 * Registrar o editar un tercero.
 *
 * El tipo de persona se sugiere y la persona confirma: el SII no publica un
 * rango de RUT por tipo de contribuyente, así que la sugerencia es una pista,
 * no una regla. Mientras no se toque la elección, sigue a la sugerencia.
 */
export function FormularioTercero(props: Props) {
    const idBase = useId();
    const { inicial = {} } = props;
    const [rut, setRut] = useState(inicial.rut ?? "");
    const [razonSocial, setRazonSocial] = useState(inicial.razon_social ?? "");
    const [tipoElegido, setTipoElegido] = useState<"N" | "J" | null>(inicial.tipo_persona ?? null);
    const [esCliente, setEsCliente] = useState(inicial.es_cliente ?? false);
    const [esProveedor, setEsProveedor] = useState(inicial.es_proveedor ?? false);
    const [estado, setEstado] = useState<EstadoTercero>({});
    const [enviando, iniciar] = useTransition();

    const editando = props.modo === "editar";
    const rutBloqueado = props.modo === "editar" && props.rutBloqueado;
    const sugerencia = props.motivoSugerencia
        ? inicial.tipo_persona
            ? { tipo_persona: inicial.tipo_persona, motivo: props.motivoSugerencia }
            : null
        : sugerirTipoPersona(rut);
    const tipo = tipoElegido ?? sugerencia?.tipo_persona ?? null;

    // Avisos mientras se escribe: los mismos que daría el servidor.
    const rutCompleto = rut.replace(/[^0-9kK]/g, "").length >= 8;
    const avisoRut = !rutBloqueado && rutCompleto ? validateRut(rut) : null;

    function enviar() {
        if (!tipo) {
            setEstado({ errores: ["Indica si es persona natural o jurídica."] });
            return;
        }
        const datos: TerceroInput = {
            rut,
            razon_social: razonSocial,
            tipo_persona: tipo,
            es_cliente: esCliente,
            es_proveedor: esProveedor,
        };
        setEstado({});
        iniciar(async () => {
            const resultado =
                props.modo === "registrar"
                    ? await registrarTercero(datos)
                    : await editarTercero(props.idTercero, datos, props.rutBloqueado);
            setEstado(resultado);
            if (resultado.ok && props.modo === "editar") props.onListo();
        });
    }

    const erroresRazon = razonSocial.trim().length > 0 ? validarRazonSocial(razonSocial) : [];

    return (
        <form
            className="flex max-w-2xl flex-col gap-5"
            onSubmit={(evento) => {
                evento.preventDefault();
                enviar();
            }}
        >
            <div className="grid gap-4 sm:grid-cols-[minmax(0,14rem)_minmax(0,1fr)]">
                <label className={ETIQUETA}>
                    RUT
                    <input
                        value={rut}
                        onChange={(evento) => setRut(formatearRutAlEscribir(evento.target.value))}
                        disabled={rutBloqueado}
                        inputMode="text"
                        autoComplete="off"
                        spellCheck={false}
                        placeholder="76.123.456-7"
                        aria-invalid={avisoRut ? !avisoRut.isValid : undefined}
                        aria-describedby={`${idBase}-rut`}
                        className={`tabular ${CAMPO}`}
                    />
                    <span id={`${idBase}-rut`} className="text-[11.5px] font-normal">
                        {rutBloqueado
                            ? "Tiene documentos o asientos: el RUT ya no se puede cambiar."
                            : avisoRut && !avisoRut.isValid
                              ? <span className="text-[var(--critico)]">{avisoRut.message}</span>
                              : "Con o sin puntos; el dígito verificador se revisa."}
                    </span>
                </label>
                <label className={ETIQUETA}>
                    Razón social o nombre
                    <input
                        value={razonSocial}
                        onChange={(evento) => setRazonSocial(evento.target.value)}
                        maxLength={150}
                        autoComplete="off"
                        placeholder="Distribuidora Sur SpA"
                        className={CAMPO}
                    />
                    {erroresRazon.length > 0 ? (
                        <span className="text-[11.5px] font-normal text-[var(--critico)]">{erroresRazon[0]}</span>
                    ) : (
                        <span className="text-[11.5px] font-normal">El nombre legal, como figura en sus documentos.</span>
                    )}
                </label>
            </div>

            <fieldset className="flex flex-col gap-2">
                <legend className="text-[12.5px] font-medium text-[var(--foreground-muted)]">Tipo de persona</legend>
                <div className="flex flex-wrap gap-2">
                    {(
                        [
                            ["J", "Persona jurídica", "Una sociedad: SpA, Ltda., S.A., EIRL…"],
                            ["N", "Persona natural", "Una persona, con o sin giro comercial."],
                        ] as const
                    ).map(([valor, titulo, detalle]) => (
                        <label
                            key={valor}
                            className={`flex min-w-56 flex-1 cursor-pointer gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] ${
                                tipo === valor
                                    ? "border-[var(--accent)] bg-[var(--background-raised)]"
                                    : "border-[var(--border-strong)]"
                            }`}
                        >
                            <input
                                type="radio"
                                name={`${idBase}-tipo`}
                                checked={tipo === valor}
                                onChange={() => setTipoElegido(valor)}
                                className="mt-0.5 accent-[var(--accent)]"
                            />
                            <span>
                                <span className="font-medium">{titulo}</span>
                                <span className="block text-[12px] text-[var(--foreground-muted)]">{detalle}</span>
                            </span>
                        </label>
                    ))}
                </div>
                {sugerencia ? (
                    <p className="text-[12px] text-[var(--foreground-muted)]">
                        Sugerencia: {sugerencia.motivo.replace(/\.$/, "")}. Es una pista, no una regla del SII: confírmala.
                    </p>
                ) : null}
                {tipo === "N" ? (
                    <p className="rounded-lg bg-[var(--aviso-bg)] px-3 py-2 text-[12.5px]">
                        Los datos de una persona natural son datos personales (Ley 21.719): registra solo lo necesario.
                        Las consultas a su ficha quedan en la auditoría.
                    </p>
                ) : null}
            </fieldset>

            <fieldset className="flex flex-col gap-2">
                <legend className="text-[12.5px] font-medium text-[var(--foreground-muted)]">Rol con la empresa</legend>
                <div className="flex flex-wrap gap-x-6 gap-y-2 text-[13.5px]">
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={esProveedor}
                            onChange={(evento) => setEsProveedor(evento.target.checked)}
                            className="accent-[var(--accent)]"
                        />
                        Proveedor <span className="text-[12px] text-[var(--foreground-muted)]">(le compras)</span>
                    </label>
                    <label className="flex cursor-pointer items-center gap-2">
                        <input
                            type="checkbox"
                            checked={esCliente}
                            onChange={(evento) => setEsCliente(evento.target.checked)}
                            className="accent-[var(--accent)]"
                        />
                        Cliente <span className="text-[12px] text-[var(--foreground-muted)]">(le vendes)</span>
                    </label>
                </div>
            </fieldset>

            {estado.errores && estado.errores.length > 0 ? (
                <ul role="alert" className="flex flex-col gap-1 text-[13px] text-[var(--critico)]">
                    {estado.errores.map((error) => (
                        <li key={error}>{error}</li>
                    ))}
                </ul>
            ) : null}

            <div className="flex flex-wrap gap-2">
                <Boton type="submit" variante="acento" disabled={enviando}>
                    {enviando ? "Guardando…" : editando ? "Guardar cambios" : "Registrar tercero"}
                </Boton>
                {props.modo === "editar" ? (
                    <Boton variante="neutro" disabled={enviando} onClick={props.onCancelar}>
                        Cancelar
                    </Boton>
                ) : null}
            </div>
        </form>
    );
}
