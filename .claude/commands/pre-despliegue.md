---
description: Checklist antes de integrar el frontend a main (despliegue en Vercel). No despliega.
argument-hint: "[rama a revisar; por defecto la actual]"
---

Verifica que la rama `$ARGUMENTS` (o la actual) está lista para integrarse a `main`, que despliega solo en Vercel. **No hagas push, merge ni despliegues** (nada de `vercel`). Reporta cada punto como OK, FALLA o NO APLICA, con el detalle.

1. `npm test`, `npm run lint` y `npm run build` sin errores.
2. **Dependencias del backend:** si la rama usa rutas o campos nuevos, el PR del backend ya está integrado o se integra antes. El backend se despliega primero.
3. **Variables de entorno nuevas:** están documentadas en `.env.example` y en el apartado de variables del `CHANGELOG.md`.
   - Si alguna es `NEXT_PUBLIC_*`, recuerda que se lee al compilar: hay que redeployar sin caché.
   - Si cambia la URL del backend, `CSP_CONNECT_SRC` tiene que cambiar con ella.
   - Ningún secreto lleva prefijo `NEXT_PUBLIC_`.
4. **`CHANGELOG.md`:** tiene en `[Sin publicar]` una entrada con ticket por cada cambio de comportamiento.
5. **Pantallas nuevas:** están en `lib/vistas.ts` y en el `Sidebar`. Ninguna mezcla datos de ejemplo sin rotular.
6. **CSP:** si se agregó un origen externo, está en `next.config.ts`, en la directiva exacta y sin comodines.
7. **`vercel.json`:** no hay uno nuevo. No se usa, a propósito (`docs/DESPLIEGUE-VERCEL.md`).

Termina con un veredicto de una línea: lista o no lista, y qué falta.
