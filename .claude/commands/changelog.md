---
description: Agrega la entrada de CHANGELOG.md para el cambio actual
argument-hint: "FIN-xx [descripción opcional]"
---

Agrega a `CHANGELOG.md` la entrada del cambio en curso. Ticket y descripción: `$ARGUMENTS`.

1. Mira qué cambió: `git diff`, `git diff --staged` y `git status --short`. Si `$ARGUMENTS` no trae un ticket `FIN-xx`, pídeselo al usuario antes de escribir.
2. Escribe en la sección `## [Sin publicar]`, bajo la categoría que corresponda: `### Agregado`, `### Cambiado`, `### Corregido`, `### Eliminado` o `### Seguridad`. Crea el encabezado de la categoría si no existe.
3. Una línea por cambio, en español, desde el punto de vista de quien usa el sistema, terminada en `(FIN-xx)`. Sigue el estilo de las entradas existentes.
4. Si hay variables de entorno nuevas, migraciones (backend) o dependencias del otro repo (frontend), anótalas en su propio apartado dentro de `[Sin publicar]`.
5. No toques las secciones ya publicadas.
