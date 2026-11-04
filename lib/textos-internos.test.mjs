// Las pantallas "Próximamente" las ve el usuario: nada de endpoints ni notas del equipo.
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";

const ARCHIVOS = [
    "components/dashboard/PantallaPendiente.tsx",
    "app/dashboard/copiloto/page.tsx",
    "app/dashboard/auditoria/page.tsx",
];

// Cada patrón es una nota de desarrollo que ya apareció en pantalla.
const NOTAS_INTERNAS = [
    /\b(GET|POST|PUT|PATCH|DELETE)\s+\//,
    /append-only|idempoten|\bUPDATE\b|\bDELETE\b/i,
    /Pendiente de definir/i,
    /Ya disponible en la API/i,
    /En construcci[oó]n/i,
];

test("las pantallas Próximamente no muestran notas internas", () => {
    for (const archivo of ARCHIVOS) {
        // Se quitan los comentarios: ahí sí se puede hablar de la implementación.
        const visible = readFileSync(archivo, "utf8").replace(/\/\*[\s\S]*?\*\/|^\s*\/\/.*$/gm, "");
        for (const patron of NOTAS_INTERNAS) {
            assert.doesNotMatch(visible, patron, `${archivo} muestra «${patron}»`);
        }
    }
});
