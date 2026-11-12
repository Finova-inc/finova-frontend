---
description: Revisa los cambios contra las reglas del repo, sin modificar nada
argument-hint: "[rama o rango; por defecto el diff contra development]"
---

Revisa los cambios de este repo y reporta problemas. **No edites archivos.**

1. Determina qué revisar:
   - Si `$ARGUMENTS` trae una rama o un rango, usa `git diff $ARGUMENTS`.
   - Si no, usa `git diff development...HEAD` más los cambios sin commitear (`git diff` y `git status --short`).
2. Lee `CLAUDE.md` y cada archivo de `.claude/rules/` que aplique a los archivos tocados.
3. Revisa cada archivo cambiado completo, no solo las líneas del diff. Busca:
   - Errores de lógica.
   - Violaciones de las reglas (empresa del token, roles, montos, migraciones, Server Components, capa de API, seguridad).
   - Pruebas que faltan para lo que cambió.
   - La entrada de `CHANGELOG.md`.
   - Cambios de forma de respuesta que el otro repo no recoge.
4. Responde con una lista ordenada por gravedad (bloqueante, importante, menor). Cada punto lleva `archivo:línea`, qué pasa y la corrección mínima. Si no hay nada que objetar, dilo en una línea.
