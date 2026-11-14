# Cómo trabajamos con Claude Code en Finova

Este documento es para el equipo (Pedro, Nicolás, Vicente). Explica qué hay en `.claude/` y en la raíz de cada repo, para qué sirve cada pieza y cómo proponer cambios. Es el mismo archivo en `finova-backend` y `finova-frontend`.

La idea: que Claude trabaje igual para los tres, con las mismas reglas, comandos y protecciones, sin que nadie tenga que repetirle el contexto en cada sesión.

## Qué hay y para qué sirve

| Pieza | Dónde | Qué hace | ¿Se versiona? |
|---|---|---|---|
| `CLAUDE.md` | raíz | Se carga en **cada sesión**: qué es el repo, comandos, reglas que no se negocian y dónde está el detalle. Se mantiene corto. | Sí |
| `CLAUDE.local.md` | raíz | Tus notas personales (puertos, tu rama de Neon, cómo te gusta trabajar). Copia `CLAUDE.local.md.example`. | No |
| `.mcp.json` | raíz | Conexiones de Claude con Jira (Atlassian) y GitHub. | Sí |
| `settings.json` | `.claude/` | Permisos (qué corre sin preguntar, qué pide confirmación, qué está prohibido) y registro de los hooks. | Sí |
| `settings.local.json` | `.claude/` | Tus permisos personales. | No |
| `rules/*.md` | `.claude/` | Reglas por tema. Las que tienen `paths:` se cargan solo cuando Claude toca esos archivos; `pr.md` se carga siempre. | Sí |
| `commands/*.md` | `.claude/` | Comandos que se escriben con `/` (por ejemplo `/revisar`). | Sí |
| `skills/<nombre>/SKILL.md` | `.claude/` | Procedimientos que Claude carga solo cuando la tarea lo pide (o con `/nombre`). | Sí |
| `agents/*.md` | `.claude/` | Subagentes con contexto propio, que se piden con `@nombre`. | Sí |
| `hooks/*.cjs` | `.claude/` | Scripts que se ejecutan siempre, sin depender de que Claude se acuerde. | Sí |

## Comandos

| Comando | Repo | Para qué |
|---|---|---|
| `/revisar [rama]` | ambos | Revisa el diff contra las reglas del repo, sin modificar nada. |
| `/changelog FIN-xx` | ambos | Agrega la entrada de `CHANGELOG.md`. |
| `/pre-despliegue` | ambos | Checklist antes de integrar a `main` (Render o Vercel). No despliega. |
| `/nuevo-modulo <nombre>` | backend | Esqueleto de módulo Nest siguiendo el patrón de `articulos`. |
| `/nueva-migracion <Nombre>` | backend | Migración TypeORM con el procedimiento seguro. |
| `/nueva-pantalla <módulo>` | frontend | Pantalla del panel siguiendo el patrón de `core-contable`. |

## Skills

| Skill | Repo | Qué cubre |
|---|---|---|
| `contexto-negocio` | ambos | Producto, alcance del MVP, equipo y metas. |
| `patrones-de-testing` | ambos | Cómo se prueba en cada repo. |
| `migraciones-typeorm` | backend | Procedimiento de migraciones. |
| `pantalla-de-modulo` | frontend | Cómo se arma una pantalla del panel. |

## Agentes

| Agente | Qué hace |
|---|---|
| `@revisor-codigo` | Revisa un cambio contra las reglas. |
| `@auditor-seguridad` | Busca fallas de seguridad reales: aislamiento entre empresas, roles, sesión, archivos subidos. |

Ambos solo leen; no modifican archivos.

## Hooks

| Hook | Cuándo corre | Qué hace |
|---|---|---|
| `proteger-secretos.cjs` | Antes de cada lectura, edición o comando | Bloquea leer o editar `.env` (secretos reales) y escribir `synchronize: true` en código. |
| `validar-codigo.cjs` | Después de cada edición | Corre el linter sobre el archivo editado (oxlint en backend, eslint en frontend). Si hay errores, Claude los ve y los corrige. |
| `recordar-changelog.cjs` | Al terminar Claude, una vez por sesión | Avisa si cambió código sin tocar `CHANGELOG.md`. |

Los hooks se registran en `.claude/settings.json` con `node -e "require(...)"`. La forma es rara, pero funciona igual en Git Bash, PowerShell y macOS, y no depende de que tu shell expanda `$CLAUDE_PROJECT_DIR`.

## Primera vez en tu máquina
1. Haz `git pull` y abre Claude Code **en la raíz del repo** (`finova-backend/` o `finova-frontend/`). Si lo abres en otra carpeta, no se carga `.claude/`.
2. Claude te preguntará si confías en los servidores MCP de `.mcp.json`. Para Jira, acepta y ejecuta `/mcp` → `atlassian` → se abre el navegador para iniciar sesión (OAuth, sin tokens en archivos).
3. Para GitHub, crea un token personal en GitHub (solo los repos de `Finova-inc`) y defínelo como variable de entorno `GITHUB_PERSONAL_ACCESS_TOKEN` en tu sistema. Sin esa variable, el servidor de GitHub no conecta: el resto sigue funcionando.
4. Copia `CLAUDE.local.md.example` a `CLAUDE.local.md` y completa lo tuyo.
5. Revisa los hooks con `/hooks` la primera vez, para saber qué corre.
6. Instala los plugins y skills personales que usa el equipo (superpowers, claude-mem, security-audit y otros): están en `docs/HERRAMIENTAS-CLAUDE.md`, con el comando de cada uno y para qué sirve en Finova.

## Cómo proponer cambios a esta configuración
- Las reglas, los comandos y los agentes se cambian por PR, como cualquier código, con un commit `docs(claude): ...` o `chore(claude): ...`.
- Si Claude se equivoca dos veces en lo mismo, eso es una regla que falta: agrégala al archivo de `.claude/rules/` que corresponda, no a `CLAUDE.md`.
- `CLAUDE.md` solo lleva lo que tiene que estar en todas las sesiones. Lo específico de un tema va en `rules/`; un procedimiento paso a paso va en `skills/`.
- Lo compartido entre repos (`pr.md`, `contexto-negocio`, agentes, hooks, este documento y `HERRAMIENTAS-CLAUDE.md`) se cambia en **ambos** repos a la vez.
