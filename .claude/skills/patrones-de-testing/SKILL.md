---
name: patrones-de-testing
description: Cómo escribir y correr pruebas en finova-frontend: tests puros con node --test sobre funciones de lib/, sin dependencias ni navegador. Úsala al agregar o modificar tests, al extraer lógica a lib/ para probarla o al corregir un bug (lleva prueba de regresión).
---

# Pruebas en finova-frontend

## Correr
- `npm test`: corre `node --test lib/*.test.mjs`. No hay Jest, Vitest ni Playwright: es una decisión deliberada para no sumar dependencias.
- Un archivo suelto: `node --test lib/terceros.test.mjs`.
- Requiere **Node ≥ 22.18**: los tests importan `./x.ts` directamente y Node les quita los tipos al cargarlos.

## Cómo es un test
Ejemplo de referencia: `lib/terceros.test.mjs`.

```js
import assert from "node:assert/strict";
import { test } from "node:test";
import { urlTerceros } from "./terceros.ts";

test("urlTerceros: ...", () => {
    assert.equal(urlTerceros({ ... }), "/dashboard/terceros?...");
});
```

- **Qué se prueba:** solo funciones puras de `lib/`. Un módulo que importa `next/headers`, `next/navigation` o React no se puede importar desde `node --test`. Ejemplos: `lib/session.ts` y `lib/ip-visitante.ts`.
- **Si quieres probar lógica de una página o acción:** extráela primero a una función pura en `lib/` y pruébala ahí. Es el patrón del repo (`lib/periodos.ts`, `lib/f29.ts`, `lib/reversion.ts`…).
- **Reloj y red:** fíjalos. Pasa `ahora` o `dormir` como parámetro (ver `lib/reintentos.ts` y `lib/ip-firmada.test.mjs`). Nunca uses red real.
- **Tests que leen archivos del repo** con `node:fs`:
  - `lib/vistas.test.mjs` exige que cada pantalla esté en `lib/vistas.ts`.
  - `lib/textos-internos.test.mjs` impide notas del equipo en pantallas pendientes.

## Reglas
- Todo bug corregido lleva su prueba de regresión, que falla sin el arreglo.
- **Montos:** prueba con decimales y negativos. **URLs:** prueba la codificación de caracteres especiales (`/`, `?`, `&`, espacios, tildes). **CSV:** prueba celdas que empiezan con `=`, `+`, `-`, `@`.
- Antes de dar algo por terminado: `npm test`, `npm run lint` y `npm run build` en verde.
