---
paths:
  - "lib/api.ts"
  - "app/**/actions.ts"
  - "app/**/acciones-*.ts"
  - "app/**/route.ts"
  - "app/**/page.tsx"
---

# Capa de comunicación con el backend

- **`lib/api.ts` es la única capa de datos.** Nada de `fetch` directo en componentes ni en acciones.
  - Cada recurso tiene su grupo tipado (`empresasApi`, `asientosApi`, `siiApi`…), mapeado 1:1 con la ruta real del backend.
  - Los tipos de respuesta viven ahí mismo.
  - Si el backend cambia una respuesta, se actualizan aquí en un PR enlazado.
- **`apiFetch<T>()`:**
  - timeout de 15 s;
  - `Authorization: Bearer` solo desde el servidor;
  - lanza `ApiError { status, body }`, donde `status 0` y `408` significan red o timeout.
- **URL base:** `API_URL_INTERNA ?? NEXT_PUBLIC_API_URL ?? "http://localhost:3001"`.
- **Parámetros de ruta siempre con `encodeURIComponent`**, incluso ids que "siempre son UUID" y números: un valor con `/`, `..` o `?` cambiaría la ruta del backend que recibe el token del usuario. Los parámetros de query van por `consulta()` (`URLSearchParams`).
- **Los argumentos de una Server Action llegan del cliente:** los tipos de TypeScript no se verifican en tiempo de ejecución, y cualquiera puede invocar la acción con lo que quiera. Antes de reenviarlos, valida su forma: formato, rango, largo, lista permitida.
- **Errores en acciones:** un `traducirError` local en cada `actions.ts`.

  | Caso | Respuesta |
  |---|---|
  | 401 | `redirect("/login")` |
  | 403 | "Tu rol en esta empresa no permite esta operación." |
  | 0 o 408 | Aviso de que el servidor puede estar despertando |
  | Lo demás | `mensajesDelBackend(error)` o un mensaje por defecto |

  Los mensajes del backend se muestran tal cual al usuario: el backend los escribe en español para un contador.
- **Reintentos:** solo lecturas (GET) y login se reintentan, con espera creciente ante 0, 502, 503 y 504 (`lib/reintentos.ts`). **Las escrituras nunca se reintentan solas**: podrían duplicar un asiento. Para eso existe la clave de idempotencia de `contabilizarNuevo`.
- **Grupo nuevo de API:** sigue el patrón de los existentes: tipos explícitos, montos como `string` y nombres iguales a los del backend.
