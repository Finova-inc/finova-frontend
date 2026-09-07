/**
 * Inserta un script que corre de forma síncrona durante el parseo del HTML.
 *
 * Se usa para corregir el DOM antes del primer paint, en los casos donde el
 * servidor no puede conocer el valor correcto (tema, zona horaria, preferencias
 * guardadas en el navegador).
 *
 * El cambio de `type` entre servidor y cliente no es un truco: es el patrón que
 * documenta Next.js. React advierte en desarrollo cuando un componente renderiza
 * etiquetas <script>, y además, en navegaciones con <Link>, el script insertado
 * por actualización del DOM no se ejecutaría de todos modos. Marcarlo como
 * text/plain en el cliente lo vuelve inerte y silencia la advertencia; en el
 * servidor, que es donde importa, sale como JavaScript real.
 *
 * `suppressHydrationWarning` cubre precisamente esa diferencia de type.
 *
 * Nota de seguridad: `dangerouslySetInnerHTML` es seguro aquí porque el HTML es
 * una constante del propio código, sin interpolación de datos externos. Nunca
 * se debe pasar por aquí contenido derivado de entrada de usuario.
 */
export function InlineScript({ html }: { html: string }) {
    return (
        <script
            type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
            suppressHydrationWarning
            dangerouslySetInnerHTML={{ __html: html }}
        />
    );
}
