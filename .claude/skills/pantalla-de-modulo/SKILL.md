---
name: pantalla-de-modulo
description: Cómo construir una pantalla nueva del panel de Finova (listado, detalle, formulario y acciones) conectada al backend, siguiendo el patrón de app/dashboard/core-contable. Úsala al crear o rehacer un módulo del panel, por ejemplo auditoría o copiloto, que hoy son PantallaPendiente.
---

# Pantalla de módulo del panel

El patrón de referencia es `app/dashboard/core-contable/` (libro diario). Léelo antes de empezar:

| Archivo | Qué hace |
|---|---|
| `page.tsx` | Listado, Server Component. Filtros por `searchParams` desde un `<form method="get">`. |
| `[id]/page.tsx` | Detalle de solo lectura. |
| `nuevo/page.tsx` | Alta. |
| `borradores/[id]/page.tsx` | Edición de borrador. |
| `actions.ts` | Server Actions, con su `traducirError`. |
| `FormularioAsiento.tsx` | El único componente cliente grande. |
| `partes.tsx` | Piezas de presentación. |
| `datos-formulario.ts` | Lógica pura del formulario. |
| `loading.tsx` | Espera con `EsperaConLimite`. |

## Pasos
1. **Backend primero.** Confirma que existen los endpoints. Si no, se construyen antes en `finova-backend`, con `/nuevo-modulo`.
2. **API.** Agrega o completa el grupo `xApi` en `lib/api.ts`:
   - tipos de respuesta explícitos y montos como `string`;
   - parámetros de ruta con `encodeURIComponent`;
   - query con `consulta()`.
3. **Página de listado** (`app/dashboard/<modulo>/page.tsx`):
   - `export const dynamic = "force-dynamic"`;
   - `exigirTokenSesion()`;
   - lecturas en paralelo con `Promise.allSettled`;
   - filtros validados desde `searchParams` (regex, listas permitidas, largo máximo);
   - "—" si un bloque falla.
4. **Acciones** (`actions.ts`, con `"use server"` arriba):
   - cada acción llama a `exigirTokenSesion()` y valida sus argumentos antes de reenviarlos;
   - `traducirError` local (401 → login, 403 → mensaje de rol, 0/408 → servidor despertando);
   - `revalidatePath` de lo afectado.
5. **Interactividad:** formularios con `useActionState` o `useTransition`. Solo la parte interactiva lleva `"use client"`.
6. **Roles en la UI:** `puedeRegistrar(rol)` decide si se muestran los botones de escritura. No es seguridad: el backend responde 403.
7. **Navegación y errores:**
   - entrada en `components/Sidebar.tsx`;
   - nombre de la vista en `lib/vistas.ts` (su test falla si falta);
   - `loading.tsx` con `EsperaConLimite` si la lectura puede tardar.
8. **Lógica pura y pruebas:** cálculos, URLs y CSV van a `lib/<modulo>.ts`, con su `lib/<modulo>.test.mjs`. Las exportaciones usan `lib/csv.ts`.
9. **Cierre:**
   - `npm test`, `npm run lint`, `npm run build`;
   - entrada en `CHANGELOG.md`, con el apartado de dependencias del backend si aplica;
   - si reemplaza una `PantallaPendiente`, quítala de `lib/textos-internos.test.mjs`.
