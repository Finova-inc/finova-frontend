---
paths:
  - "app/**"
  - "components/**"
---

# Server Components, Server Actions y pantallas

Next 16 difiere de versiones anteriores. Ante la duda, lee la guía en `node_modules/next/dist/docs/` (ver `AGENTS.md`). Ejemplos: el middleware se llama `proxy.ts`, y los error boundaries reciben `retry`, no `reset`.

- **Server Component por defecto.** La lista de componentes cliente es corta a propósito (formularios complejos, diálogos, el selector de empresa, el tema). Antes de agregar `"use client"`, intenta mover solo la parte interactiva a un componente hijo.
- **Datos:**
  - Las páginas de `app/dashboard/` llaman a `exigirTokenSesion()` y leen el backend con `lib/api.ts`.
  - Si una página junta varias lecturas, las hace en paralelo con `Promise.allSettled`.
  - Un bloque cuya consulta falla muestra "—", nunca un cero.
- **Mutaciones:** en `actions.ts` junto a la página.
  - Formularios simples: `<form>` nativo con `useActionState` o `useFormStatus`.
  - Formularios complejos: estado controlado con `useTransition`.
  - Después de mutar: `revalidatePath` de las rutas afectadas.
- **Filtros de listados:** se pasan por la URL (`<form method="get">`, `searchParams`), no en estado del cliente.
- **Errores y 404:**
  - `app/dashboard/error.tsx` y `not-found.tsx` usan `components/dashboard/EstadoDeVista.tsx`.
  - Cada pantalla nueva se registra en `lib/vistas.ts`; su test falla si falta.
  - Los `loading.tsx` de pantallas lentas usan `EsperaConLimite`, que avisa a los 10 s que el servicio está despertando.
- **Roles en la UI:** `puedeRegistrar(rol)` (`lib/roles.ts`) solo decide si se muestra un botón o un formulario. La autorización real la hace el backend, que responde 403.
- **Datos de ejemplo:** si algo se muestra sin backend, el mock va centralizado en un archivo de `lib/` y el componente lleva una `Etiqueta` de tono `demo`. Nunca mezcles datos falsos sin rotular con datos reales.
- **Módulos pendientes** (`auditoria`, `copiloto`): usan `PantallaPendiente`, y lo que muestran lo ve el usuario. `lib/textos-internos.test.mjs` impide filtrar notas del equipo o endpoints en esas pantallas.
