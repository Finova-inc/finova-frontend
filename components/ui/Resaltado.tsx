import { normalizar } from "@/lib/planCuentas";

/**
 * Marca la coincidencia con el amarillo destacador de la paleta, que existe
 * justamente para resaltar. Busca sin tildes pero marca sobre el texto
 * original: cada letra original se mapea a su letra normalizada.
 */
export function Resaltado({ texto, busqueda }: { readonly texto: string; readonly busqueda: string }) {
    const consulta = normalizar(busqueda.trim());
    if (!consulta) return <>{texto}</>;

    let plano = "";
    const origen: number[] = [];
    [...texto].forEach((letra, indice) => {
        for (const normalizada of normalizar(letra)) {
            plano += normalizada;
            origen.push(indice);
        }
    });
    const inicio = plano.indexOf(consulta);
    if (inicio < 0) return <>{texto}</>;

    const letras = [...texto];
    const desde = origen[inicio];
    const hasta = origen[inicio + consulta.length - 1] + 1;
    return (
        <>
            {letras.slice(0, desde).join("")}
            <mark className="rounded-[3px] bg-[rgb(255_197_61_/_0.5)] px-0.5 text-inherit">
                {letras.slice(desde, hasta).join("")}
            </mark>
            {letras.slice(hasta).join("")}
        </>
    );
}
