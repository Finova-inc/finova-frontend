/**
 * Banda divisoria entre el hero y la presentación del producto.
 *
 * Dos piezas: el logotipo "FINOVA" dibujado en arte ASCII y, bajo él, un
 * carrusel horizontal con los módulos contables, también en ASCII.
 *
 * Por qué ASCII: los módulos contables son, en el fondo, las columnas de un
 * libro. El arte ASCII cita esa herencia —el reporte de ancho fijo, la salida de
 * terminal— y de paso da a la landing un momento con carácter propio, distinto
 * del resto de las secciones.
 *
 * Es un componente de SERVIDOR. El carrusel es CSS puro: la lista se renderiza
 * dos veces y la animación desplaza exactamente la mitad, de modo que el bucle
 * no tiene costura visible.
 */

/**
 * Logotipo en arte ASCII.
 *
 * Se guarda como arreglo de líneas y no como cadena con saltos, para que el
 * formateador de código no altere el dibujo al reacomodar el archivo.
 */
const ASCII_LOGO = [
    "███████  ███████  ██   ██   █████   ██   ██    ███  ",
    "██         ███    ███  ██  ██   ██  ██   ██   ██ ██ ",
    "██████     ███    ████ ██  ██   ██  ██   ██  ██   ██",
    "██         ███    ██ ████  ██   ██   ██ ██   ███████",
    "██       ███████  ██  ███   █████     ███    ██   ██",
] as const;

/**
 * Módulos contables que recorren el carrusel.
 *
 * Son los módulos reales del producto, no etiquetas de relleno.
 */
const ACCOUNTING_MODULES = [
    "PLAN DE CUENTAS",
    "ASIENTOS CONTABLES",
    "LIBRO DIARIO",
    "LIBRO MAYOR",
    "BALANCE DE COMPROBACION",
    "BALANCE 8 COLUMNAS",
    "LIBRO DE COMPRA",
    "LIBRO DE VENTA",
    "CENTROS DE COSTO",
    "PERIODOS CONTABLES",
    "BALANCES TRIBUTARIOS",
    "AUDITORIA CONTINUA",
] as const;

/** Duración de una vuelta completa del carrusel, en segundos. */
const MARQUEE_SECONDS = 42;

export function AsciiBanner() {
    return (
        <section className="relative overflow-hidden border-y border-[var(--border-subtle)] py-14 md:py-16">
            {/* ---------------------------------------------------------------
                Logotipo en ASCII
                --------------------------------------------------------------- */}
            <div className="mb-10 flex justify-center px-5">
                {/*
                    El dibujo se expone a lectores de pantalla como el texto
                    "Finova", no como la maraña de caracteres: role="img" más
                    aria-label sustituyen el contenido por esa etiqueta.
                */}
                <pre
                    role="img"
                    aria-label="Finova"
                    className="overflow-x-auto font-mono text-[7px] leading-[1.15] text-[var(--accent)] sm:text-[10px] md:text-[13px]"
                >
                    {ASCII_LOGO.join("\n")}
                </pre>
            </div>

            {/* ---------------------------------------------------------------
                Carrusel de módulos

                aria-hidden porque es decorativo y su contenido ya está listado
                en la sección de producto y en el pie; leerlo en bucle sería
                ruido para quien usa lector de pantalla.
                --------------------------------------------------------------- */}
            <div
                aria-hidden
                className="relative flex overflow-hidden"
                style={{
                    // Desvanece los extremos, para que las tarjetas entren y
                    // salgan sin un corte abrupto contra el borde.
                    maskImage:
                        "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
                    WebkitMaskImage:
                        "linear-gradient(to right, transparent, black 8%, black 92%, transparent)",
                }}
            >
                {/*
                    El contenido va duplicado: la animación recorre el 50% del
                    ancho total, así que al terminar el fotograma coincide
                    exactamente con el inicial y el bucle es imperceptible.
                */}
                <div
                    className="flex shrink-0 items-center gap-3 pr-3"
                    style={{
                        animation: `marquee-scroll ${MARQUEE_SECONDS}s linear infinite`,
                    }}
                >
                    {[...ACCOUNTING_MODULES, ...ACCOUNTING_MODULES].map(
                        (moduleName, index) => (
                            <span
                                key={`${moduleName}-${index}`}
                                className="flex shrink-0 items-center gap-2.5 rounded-lg border border-[var(--border-subtle)] px-4 py-2 font-mono text-[11px] tracking-wide text-[var(--foreground-muted)] sm:text-[12px]"
                            >
                                {/* Corchetes y guiones: sintaxis de un listado
                                    de terminal, coherente con el logotipo. */}
                                <span className="text-[var(--accent)]">[</span>
                                {moduleName}
                                <span className="text-[var(--accent)]">]</span>
                            </span>
                        ),
                    )}
                </div>
            </div>

            {/* Pie de la banda: da sentido al carrusel en una línea. */}
            <p className="mt-10 px-5 text-center font-mono text-[11px] tracking-wide text-[var(--foreground-muted)] sm:text-[12px]">
                <span className="text-[var(--accent)]">&gt;</span> 19 módulos
                contables, un solo sistema
                <span
                    className="ml-1 inline-block text-[var(--accent)]"
                    style={{ animation: "caret-blink 1.1s steps(1) infinite" }}
                >
                    _
                </span>
            </p>
        </section>
    );
}
