"use server";

/* ============================================================================
   Server Actions del libro diario.

   Corren SIEMPRE en el servidor: leen la cookie httpOnly, llaman a NestJS con
   Bearer y revalidan la ruta. El token nunca cruza al cliente.

   Las reglas contables (partida doble, periodo abierto, pesos enteros, cuenta
   activa) las decide el backend en dos capas. Aqui solo se da forma a los
   datos del formulario y se traducen sus errores: repetir las reglas en el
   frontend crearia una tercera copia que tarde o temprano diria otra cosa.
   ========================================================================== */

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import {
    ApiError,
    asientosApi,
    borradoresApi,
    mensajesDelBackend,
    type GuardarBorradorInput,
    type LineaBorrador,
    type MovimientoInput,
    type TipoComprobante,
} from "@/lib/api";
import { tieneMonto } from "@/lib/decimal";
import { exigirTokenSesion } from "@/lib/session";

const RUTA_LIBRO = "/dashboard/core-contable";

/** Una linea tal como esta en pantalla: todo texto, "" si esta vacio. */
export interface LineaFormulario {
    readonly id_cuenta: string;
    readonly debe: string;
    readonly haber: string;
    readonly glosa: string;
    readonly id_tercero: string;
}

/** El estado del formulario, tal cual. */
export interface DatosAsiento {
    readonly tipo_comprobante: TipoComprobante | "";
    readonly fecha_contable: string;
    readonly glosa: string;
    readonly lineas: readonly LineaFormulario[];
}

export interface ResultadoAsiento {
    readonly errores?: readonly string[];
    /** Version vigente del borrador despues de guardarlo. */
    readonly version?: number;
    readonly guardado?: boolean;
}

/** Referencia al borrador que se esta editando, con la version leida. */
export interface RefBorrador {
    readonly id: string;
    readonly version: number;
}

/**
 * Error de la API -> mensajes para la pantalla.
 *
 * redirect() lanza, asi que un 401 sale de la accion desde aqui mismo, fuera
 * de cualquier try (quien llama esta en un catch).
 */
function traducirError(error: unknown, porDefecto: string, idempotente = false): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) {
            return ["Tu rol en esta empresa no permite registrar asientos."];
        }
        // Render duerme tras 15 minutos sin trafico y tarda en despertar mas
        // que el tiempo de espera del cliente.
        if (error.status === 0 || error.status === 408) {
            return [
                idempotente
                    ? "El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos: el asiento no se duplicará."
                    : "El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos.",
            ];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}

function lineaVacia(linea: LineaFormulario): boolean {
    return (
        !linea.id_cuenta &&
        !tieneMonto(linea.debe) &&
        !tieneMonto(linea.haber) &&
        !linea.glosa.trim() &&
        !linea.id_tercero
    );
}

/**
 * Lineas para POST /asientos-contables. Los campos vacios se OMITEN: el
 * backend rechaza campos de mas y un id "" no es un uuid.
 */
function aMovimientos(lineas: readonly LineaFormulario[]): MovimientoInput[] {
    return lineas
        .filter((linea) => !lineaVacia(linea))
        .map((linea) => ({
            id_cuenta: linea.id_cuenta,
            ...(tieneMonto(linea.debe) ? { debe: linea.debe } : {}),
            ...(tieneMonto(linea.haber) ? { haber: linea.haber } : {}),
            ...(linea.glosa.trim() ? { glosa: linea.glosa.trim() } : {}),
            ...(linea.id_tercero ? { id_tercero: linea.id_tercero } : {}),
        }));
}

/** Un borrador guarda tambien lo incompleto, pero no filas en blanco. */
function aBorrador(datos: DatosAsiento): GuardarBorradorInput {
    const lineas: LineaBorrador[] = datos.lineas
        .filter((linea) => !lineaVacia(linea))
        .map((linea) => ({
            ...(linea.id_cuenta ? { id_cuenta: linea.id_cuenta } : {}),
            ...(linea.debe ? { debe: linea.debe } : {}),
            ...(linea.haber ? { haber: linea.haber } : {}),
            ...(linea.glosa.trim() ? { glosa: linea.glosa.trim() } : {}),
            ...(linea.id_tercero ? { id_tercero: linea.id_tercero } : {}),
        }));

    return {
        tipo_comprobante: datos.tipo_comprobante || null,
        fecha_contable: datos.fecha_contable || null,
        glosa: datos.glosa.trim() || null,
        lineas,
    };
}

/**
 * Guarda el formulario como borrador. Un borrador nuevo lleva a su pagina de
 * edicion; uno existente devuelve su nueva version.
 */
export async function guardarBorrador(
    datos: DatosAsiento,
    borrador: RefBorrador | null,
): Promise<ResultadoAsiento> {
    const token = await exigirTokenSesion();
    let idCreado: string;

    try {
        if (borrador) {
            const guardado = await borradoresApi.guardar(
                borrador.id,
                { ...aBorrador(datos), version: borrador.version },
                { token },
            );
            revalidatePath(RUTA_LIBRO);
            return { version: guardado.version, guardado: true };
        }
        idCreado = (await borradoresApi.crear(aBorrador(datos), { token })).id_borrador;
    } catch (error) {
        return { errores: traducirError(error, "No pudimos guardar el borrador.") };
    }

    revalidatePath(RUTA_LIBRO);
    redirect(`${RUTA_LIBRO}/borradores/${idCreado}`);
}

/**
 * Contabiliza sin pasar por un borrador.
 *
 * La clave de idempotencia la genera el formulario una vez: si la respuesta se
 * pierde (Render despertando, red cortada) y se reintenta, el backend devuelve
 * el asiento ya creado en vez de registrar otro.
 */
export async function contabilizarNuevo(
    datos: DatosAsiento,
    claveIdempotencia: string,
): Promise<ResultadoAsiento> {
    const token = await exigirTokenSesion();
    if (!datos.tipo_comprobante) {
        return { errores: ["Elige el tipo de comprobante."] };
    }

    let idAsiento: string;
    try {
        const asiento = await asientosApi.crear(
            {
                tipo_comprobante: datos.tipo_comprobante,
                fecha_contable: datos.fecha_contable,
                glosa: datos.glosa.trim(),
                idempotency_key: claveIdempotencia,
                movimientos: aMovimientos(datos.lineas),
            },
            { token },
        );
        idAsiento = asiento.id_asiento;
    } catch (error) {
        return { errores: traducirError(error, "No pudimos contabilizar el asiento.", true) };
    }

    revalidatePath(RUTA_LIBRO);
    redirect(`${RUTA_LIBRO}/${idAsiento}`);
}

/**
 * Guarda la ultima version del borrador y lo contabiliza.
 *
 * Si el guardado responde 404, el borrador ya no existe: lo mas probable es
 * que un intento anterior SI lo contabilizara y se perdiera la respuesta. La
 * contabilizacion del backend es idempotente, asi que se pide igual y devuelve
 * el asiento que ya existe.
 */
export async function contabilizarBorrador(
    datos: DatosAsiento,
    borrador: RefBorrador,
): Promise<ResultadoAsiento> {
    const token = await exigirTokenSesion();
    let version = borrador.version;
    let idAsiento: string;

    try {
        try {
            version = (
                await borradoresApi.guardar(
                    borrador.id,
                    { ...aBorrador(datos), version },
                    { token },
                )
            ).version;
        } catch (error) {
            if (!(error instanceof ApiError && error.status === 404)) throw error;
        }
        idAsiento = (await borradoresApi.contabilizar(borrador.id, { token })).id_asiento;
    } catch (error) {
        return {
            errores: traducirError(error, "No pudimos contabilizar el borrador.", true),
            version,
        };
    }

    revalidatePath(RUTA_LIBRO);
    redirect(`${RUTA_LIBRO}/${idAsiento}`);
}

export async function descartarBorrador(id: string): Promise<ResultadoAsiento> {
    const token = await exigirTokenSesion();

    try {
        await borradoresApi.descartar(id, { token });
    } catch (error) {
        return { errores: traducirError(error, "No pudimos descartar el borrador.") };
    }

    revalidatePath(RUTA_LIBRO);
    redirect(RUTA_LIBRO);
}

/**
 * Revierte un asiento contabilizado (art. 32 del Codigo de Comercio) y lleva
 * a la reversa recien creada, que muestra a cual corrige.
 */
export async function revertirAsiento(
    id: string,
    fecha: string,
    motivo: string,
): Promise<ResultadoAsiento> {
    const token = await exigirTokenSesion();

    const motivoLimpio = motivo.trim();
    if (motivoLimpio.length < 3 || motivoLimpio.length > 80) {
        return { errores: ["El motivo debe tener entre 3 y 80 caracteres."] };
    }

    let idReversa: string;
    try {
        const reversa = await asientosApi.revertir(
            id,
            { ...(fecha ? { fecha_contable: fecha } : {}), motivo: motivoLimpio },
            { token },
        );
        idReversa = reversa.id_asiento;
    } catch (error) {
        return { errores: traducirError(error, "No pudimos revertir el asiento.", true) };
    }

    revalidatePath(RUTA_LIBRO);
    redirect(`${RUTA_LIBRO}/${idReversa}`);
}
