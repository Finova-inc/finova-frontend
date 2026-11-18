# Ramas, commits y pull requests

Aplica a `finova-backend` y `finova-frontend` (mismo archivo en ambos repos).

- **Flujo:** cada cambio en su rama (`feat/...`, `fix/...`, `chore/...`, `docs/...`) → PR a `development` → PR de `development` a `main`. Un merge a `main` despliega solo: Render (backend) y Vercel (frontend). **Nunca** push directo a `main` ni `--force` sobre ramas compartidas.
- **Commits:** `tipo(ámbito): descripción en español (FIN-xx)`, por ejemplo `feat(auth): limitar intentos por IP real del visitante con cabecera firmada (FIN-98)`. Tipos: `feat`, `fix`, `test`, `docs`, `refactor`, `chore`. Un commit = un cambio con sentido propio.
- **CHANGELOG.md**, en el mismo commit que el cambio: línea en `[Sin publicar]` bajo Agregado, Cambiado, Corregido, Eliminado o Seguridad, con su ticket. Las variables de entorno nuevas, las migraciones (backend) y las dependencias del backend (frontend) van en su propio apartado. Usa `/changelog`.
- **Antes de abrir un PR:** `npm run lint`, `npm run build` y `npm test` en verde, y `/revisar` sobre el diff.
- **Cambios que cruzan repos** (forma de una respuesta, ruta nueva, variable compartida como `IP_FIRMA_SECRETO`): un PR en cada repo, enlazados entre sí. El del backend se despliega primero.
- **Nunca se commitea:** `.env*` (salvo `.env.example`), `CLAUDE.local.md`, `.claude/settings.local.json`, datos reales de clientes ni archivos del SII con RUT reales.
- Los tickets viven en Jira, proyecto KAN ("Finova: El futuro").
