/* ============================================================================
   /dashboard — Panel de control.

   Server Component por la misma razon que /dashboard/empresas: la cookie de
   sesion es httpOnly y solo se lee en el servidor.

   ---------------------------------------------------------------------------
   QUE ES REAL Y QUE ES EJEMPLO EN ESTA PANTALLA
   ---------------------------------------------------------------------------
   REAL, consultado al backend:
     - Conteo de documentos, terceros y cuentas contables
     - Empresa vigente y periodo contable abierto

   EJEMPLO, sin origen de datos todavia (ver lib/datos-ejemplo.ts):
     - Alertas, conciliacion bancaria, flujo de caja y cartera

   Cada bloque de ejemplo lleva su etiqueta "Sin backend" y la pantalla abre con
   el aviso de maqueta. Esa distincion no es opcional: una cifra inventada sin
   marcar, en una herramienta contable, se lee como el saldo real de la empresa.
   ========================================================================== */

import { AvisoMaqueta } from "@/components/dashboard/AvisoMaqueta";
import { GraficoFlujoCaja } from "@/components/dashboard/GraficoFlujoCaja";
import { PanelConciliacion } from "@/components/dashboard/PanelConciliacion";
import { TablaCartera } from "@/components/dashboard/TablaCartera";
import { ZonaAlertas } from "@/components/dashboard/ZonaAlertas";
import { Etiqueta } from "@/components/ui/Etiqueta";
import { Icon } from "@/components/ui/Icon";
import {
    ApiError,
    cuentasApi,
    documentosApi,
    empresasApi,
    periodosApi,
    tercerosApi,
} from "@/lib/api";
import {
    ALERTAS_EJEMPLO,
    CARTERA_EJEMPLO,
    CONCILIACION_EJEMPLO,
    FLUJO_EJEMPLO,
} from "@/lib/datos-ejemplo";
import { formatearRut, nombreMes } from "@/lib/formato";
import { exigirTokenSesion } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Resumen de lo que se pudo leer del backend. */
type ResumenReal = {
    readonly empresa: string | null;
    readonly rut: string | null;
    readonly periodo: string | null;
    readonly periodoAbierto: boolean;
    readonly documentos: number | null;
    readonly terceros: number | null;
    readonly cuentas: number | null;
    readonly error: string | null;
};

async function cargarResumen(token: string): Promise<ResumenReal> {
    const opciones = { token, cache: "no-store" } as const;

    try {
        /**
         * Las cinco peticiones van EN PARALELO, no en cascada.
         *
         * Son independientes entre si, y el backend esta en el plan gratuito de
         * Render: si duerme, la primera llamada paga el arranque en frio. En
         * serie eso serian cinco esperas sumadas; asi se paga una sola vez.
         *
         * allSettled y no all: que falte el listado de terceros no debe dejar la
         * pantalla entera en blanco si el resto respondio.
         */
        const [empresas, documentos, terceros, cuentas, periodos] = await Promise.allSettled([
            empresasApi.listar(opciones),
            documentosApi.listar(opciones),
            tercerosApi.listar(opciones),
            cuentasApi.listar(opciones),
            periodosApi.listar(opciones),
        ]);

        const empresa = empresas.status === "fulfilled" ? empresas.value[0] : undefined;

        // periodos llega ordenado por anio y mes descendente desde el backend.
        const periodo =
            periodos.status === "fulfilled"
                ? periodos.value.find((p) => p.estado === "abierto") ?? periodos.value[0]
                : undefined;

        return {
            empresa: empresa?.razon_social ?? null,
            rut: empresa?.rut ?? null,
            periodo: periodo ? `${nombreMes(periodo.mes)} ${periodo.anio}` : null,
            periodoAbierto: periodo?.estado === "abierto",
            documentos: documentos.status === "fulfilled" ? documentos.value.length : null,
            terceros: terceros.status === "fulfilled" ? terceros.value.length : null,
            cuentas: cuentas.status === "fulfilled" ? cuentas.value.length : null,
            error: null,
        };
    } catch (error) {
        return {
            empresa: null,
            rut: null,
            periodo: null,
            periodoAbierto: false,
            documentos: null,
            terceros: null,
            cuentas: null,
            error:
                error instanceof ApiError && error.status === 0
                    ? "No pudimos contactar al servidor."
                    : "No pudimos cargar los datos del panel.",
        };
    }
}

export default async function DashboardPage() {
    const token = await exigirTokenSesion();
    const resumen = await cargarResumen(token);

    return (
        <div className="flex flex-col gap-6">
            {/* Identidad de la empresa y periodo vigente: datos reales. */}
            <div className="flex flex-wrap items-center gap-3.5">
                <h1 className="font-display text-xl font-semibold tracking-[-0.015em] text-balance">
                    Panel de control
                </h1>

                {resumen.empresa ? (
                    <span className="inline-flex items-center gap-2 rounded-full border border-[var(--border-subtle)] bg-[var(--background-raised)] px-3 py-1.5 text-[13px] font-medium">
                        <Icon name="building" className="size-3.5" />
                        {resumen.empresa}
                        {resumen.rut ? (
                            <span className="tabular text-[12px] text-[var(--foreground-muted)]">
                                {formatearRut(resumen.rut)}
                            </span>
                        ) : null}
                    </span>
                ) : null}

                {resumen.periodo ? (
                    <span className="ml-auto inline-flex items-center gap-2 text-[12px] text-[var(--foreground-muted)]">
                        <span
                            className={`size-[7px] shrink-0 rounded-full ${
                                resumen.periodoAbierto
                                    ? "bg-[var(--positivo)]"
                                    : "bg-[var(--foreground-muted)]"
                            }`}
                        />
                        Período {resumen.periodo} ·{" "}
                        {resumen.periodoAbierto ? "abierto" : "cerrado"}
                    </span>
                ) : null}
            </div>

            {resumen.error ? (
                <p
                    role="alert"
                    className="rounded-xl bg-[var(--critico-bg)] p-4 text-sm text-[var(--critico)]"
                >
                    {resumen.error}
                </p>
            ) : null}

            <AvisoMaqueta />

            {/* ---- Cifras reales del backend ---- */}
            <section>
                <EncabezadoZona
                    titulo="En el sistema"
                    nota="Datos reales de tu empresa"
                />

                <div className="grid gap-3 sm:grid-cols-3">
                    <Contador etiqueta="Documentos tributarios" valor={resumen.documentos} />
                    <Contador etiqueta="Terceros registrados" valor={resumen.terceros} />
                    <Contador etiqueta="Cuentas contables" valor={resumen.cuentas} />
                </div>
            </section>

            {/* ---- Zona 1: lo urgente ---- */}
            <section>
                <EncabezadoZona
                    titulo="Lo urgente"
                    nota={`${ALERTAS_EJEMPLO.length} asuntos requieren atención`}
                    etiquetaDemo
                />
                <ZonaAlertas alertas={ALERTAS_EJEMPLO} />
            </section>

            {/* ---- Zona 2: el trabajo diario ---- */}
            <section>
                <EncabezadoZona
                    titulo="El trabajo diario"
                    nota="Estado de conciliación bancaria"
                />
                <PanelConciliacion datos={CONCILIACION_EJEMPLO} />
            </section>

            {/* ---- Zona 3: salud financiera ---- */}
            <section>
                <EncabezadoZona titulo="Salud financiera" nota="Indicadores del período" />

                <div className="grid gap-4 lg:grid-cols-[1.15fr_1fr]">
                    <GraficoFlujoCaja datos={FLUJO_EJEMPLO} esEjemplo />
                    <TablaCartera tramos={CARTERA_EJEMPLO} esEjemplo />
                </div>
            </section>
        </div>
    );
}

/**
 * Rotulo de zona. No es una tarjeta: es un encabezado, y gastarle borde y
 * sombra lo pondria al mismo nivel visual que el contenido que titula.
 */
function EncabezadoZona({
    titulo,
    nota,
    etiquetaDemo = false,
}: {
    readonly titulo: string;
    readonly nota: string;
    readonly etiquetaDemo?: boolean;
}) {
    return (
        <div className="mb-2.5 flex flex-wrap items-baseline gap-2.5">
            <h2 className="font-display text-xs font-semibold uppercase tracking-[0.1em]">
                {titulo}
            </h2>
            <span className="text-[12px] text-[var(--foreground-muted)]">{nota}</span>
            {etiquetaDemo ? <Etiqueta tono="demo">Sin backend</Etiqueta> : null}
        </div>
    );
}

/**
 * Contador de un listado real.
 *
 * Un null significa que esa llamada fallo, y se muestra un guion en vez de un
 * cero: "0 documentos" y "no pudimos consultarlo" son cosas distintas, y
 * confundirlas en un panel contable lleva a decisiones equivocadas.
 */
function Contador({
    etiqueta,
    valor,
}: {
    readonly etiqueta: string;
    readonly valor: number | null;
}) {
    return (
        <div className="rounded-xl border border-[var(--border-subtle)] bg-[var(--surface)] px-4 py-3.5">
            <p className="text-[12px] text-[var(--foreground-muted)]">{etiqueta}</p>
            <p className="tabular mt-1 font-display text-2xl font-semibold">
                {valor ?? "—"}
            </p>
        </div>
    );
}
