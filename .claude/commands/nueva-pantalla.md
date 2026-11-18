---
description: Construye una pantalla del panel conectada al backend, siguiendo el patrón de core-contable
argument-hint: "<módulo> [qué debe mostrar o hacer]"
---

Construye la pantalla del módulo `$ARGUMENTS` siguiendo la skill `pantalla-de-modulo`.

1. **Antes de escribir código:** confirma qué endpoints del backend existen para este módulo (revisa `lib/api.ts` y, si está disponible, `../finova-backend/src/<modulo>`). Si faltan, detente y dile al usuario qué hay que construir primero en el backend.
2. **Propón la estructura** (archivos, qué es Server Component y qué es cliente, qué acciones habrá) en pocas líneas, y sigue.
3. **Implementa** siguiendo la skill paso a paso, incluidas la entrada en `lib/vistas.ts`, el `Sidebar`, la lógica pura en `lib/` con su test y la entrada en `CHANGELOG.md`.
4. **Termina** con `npm test`, `npm run lint` y `npm run build`, y un resumen de lo creado.
