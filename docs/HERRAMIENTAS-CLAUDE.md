# Plugins y skills personales para trabajar en Finova

Lo que está en `.claude/` llega con `git pull`. Lo de este documento no: son plugins y skills que cada uno instala en su máquina (a nivel de usuario) y que Claude usa en todos los proyectos. Aquí está qué usa el equipo, cómo instalarlo y cuándo sirve en Finova. Es el mismo archivo en `finova-backend` y `finova-frontend`.

Si te falta algo de esta lista, instálalo con los comandos de abajo. Si empiezas a usar algo nuevo que le sirva al equipo, agrégalo aquí (ver el final).

## Resumen

| Herramienta | Tipo | Nivel | Para qué en Finova |
|---|---|---|---|
| `superpowers` | plugin | Recomendado | Proceso: depurar con método, planificar antes de construir, verificar antes de decir "listo". |
| `claude-mem` | plugin | Recomendado | Memoria entre sesiones: retomar el trabajo sin volver a explicar el contexto. |
| `ponytail` | plugin | Opcional, en evaluación | Que Claude escriba el mínimo código necesario. |
| `security-audit` | skill | Recomendado | Auditoría de seguridad de un repo o módulo completo. |
| `grill-me` | skill | Opcional | Que Claude interrogue un plan o diseño hasta encontrarle los huecos. |
| `agent-browser` | skill + CLI | Opcional | Que Claude abra el frontend local en un navegador y lo pruebe. |
| `find-skills` | skill | Opcional | Buscar e instalar skills nuevas. |

## Instalación rápida

**Dentro de Claude Code** (uno por línea):

```
/plugin install superpowers@claude-plugins-official
/plugin marketplace add thedotmack/claude-mem
/plugin install claude-mem@thedotmack
```

Opcional: `/plugin marketplace add DietrichGebert/ponytail` y luego `/plugin install ponytail@ponytail`.

**En una terminal** (necesita Node; `-g` las deja disponibles en todos tus proyectos):

```bash
npx skills add cloudflare/security-audit-skill --skill security-audit -g
npx skills add mattpocock/skills --skill grill-me -g
npx skills add vercel-labs/skills --skill find-skills -g
npx skills add vercel-labs/agent-browser -g
npm i -g agent-browser && agent-browser install   # la CLI que usa la skill agent-browser
```

Después reinicia Claude Code. Para ver qué tienes: `/plugin` (pestaña de instalados) y la carpeta `~/.claude/skills/`.

## Plugins

### superpowers (recomendado)

Un conjunto de skills de proceso que Claude activa solo según la tarea: `brainstorming`, `writing-plans`, `executing-plans`, `systematic-debugging`, `test-driven-development`, `verification-before-completion`, `requesting-code-review`, entre otras.

- **Instalar:** `/plugin install superpowers@claude-plugins-official`. El marketplace oficial viene agregado; si no aparece, `/plugin marketplace add anthropics/claude-plugins-official`.
- **En Finova:**
  - Un bug: `systematic-debugging` busca la causa antes de proponer el arreglo, y después va el test de regresión que pide `patrones-de-testing`.
  - Un módulo o pantalla nueva: `brainstorming` y `writing-plans` antes de escribir código.
  - Antes de dar algo por terminado: `verification-before-completion` corre lint, build y tests, lo mismo que exige `pr.md` antes de un PR.
- **Ojo:** se activa solo y sigue el proceso completo. En tareas chicas puede sentirse lento; puedes pedirle que vaya directo.

### claude-mem (recomendado)

Memoria persistente entre sesiones. Registra lo que pasa en cada sesión en una base local (`~/.claude-mem/`) y, al empezar la siguiente, le entrega a Claude un resumen del trabajo reciente del proyecto.

- **Instalar:** `/plugin marketplace add thedotmack/claude-mem` y `/plugin install claude-mem@thedotmack`. Requisitos y configuración en el README de [thedotmack/claude-mem](https://github.com/thedotmack/claude-mem).
- **En Finova:**
  - Retomar al día siguiente, o con otra cuenta de Claude si se acabó el uso, sin volver a explicar en qué ibas.
  - `/mem-search` para preguntar "¿cómo resolvimos X la otra vez?".
  - `/handoff` genera un `HANDOFF.md` para traspasar un trabajo a medias.
- **Ojo:**
  - La memoria es de cada uno: no se comparte con el equipo. Lo que deba saber el equipo va en el repo (`CLAUDE.md`, reglas, `CHANGELOG.md`).
  - Guarda comandos, rutas y fragmentos de código de tus sesiones. No pegues secretos en el chat.
  - Sus notas pueden quedar viejas. Si discrepan del código, manda el código.

### ponytail (opcional, en evaluación)

Activa al iniciar cada sesión un modo de "desarrollador senior perezoso": Claude prefiere la solución más simple y evita la sobreingeniería. Niveles con `/ponytail lite`, `/ponytail full` o `/ponytail ultra`; se apaga escribiendo "stop ponytail" o "normal mode".

- **Instalar:** `/plugin marketplace add DietrichGebert/ponytail` y `/plugin install ponytail@ponytail`.
- **En Finova:** sirve para correcciones puntuales y cambios chicos.
- **Ojo:** "mínimo" no autoriza saltarse las reglas del repo: entrada en `CHANGELOG.md`, test de regresión, DTOs validados, filtro por `id_empresa`, montos sin `number`. Si chocan, mandan `.claude/rules/`.

### github (no hace falta)

El repo ya conecta GitHub por `.mcp.json` (ver `CLAUDE-EQUIPO.md`). El plugin `github@claude-plugins-official` agrega el mismo servidor por segunda vez. En ambos casos hace falta la variable `GITHUB_PERSONAL_ACCESS_TOKEN`; sin ella el servidor falla al conectar con "Authorization header is badly formatted".

## Skills globales

Se instalan con la CLI [`skills`](https://skills.sh) (`npx skills add <repo> --skill <nombre> -g`). Quedan en `~/.agents/skills/`, enlazadas desde `~/.claude/skills/`, y se usan escribiendo `/nombre` o dejando que Claude las cargue cuando la tarea lo pide.

| Skill | Origen | Cuándo usarla en Finova |
|---|---|---|
| `security-audit` | `cloudflare/security-audit-skill` | Auditar un repo o módulo completo (aislamiento entre empresas, sesión, archivos del SII). Para revisar un cambio puntual, el agente `@auditor-seguridad` del repo es más rápido. |
| `grill-me` | `mattpocock/skills` | Antes de una épica, de cambiar el modelo de datos o de una decisión de arquitectura: `/grill-me` y Claude te pregunta hasta que el plan no tenga huecos. |
| `agent-browser` | `vercel-labs/agent-browser` | Que Claude abra el frontend local, entre con la cuenta de desarrollo y pruebe una pantalla de verdad. Necesita además la CLI (`npm i -g agent-browser && agent-browser install`). |
| `find-skills` | `vercel-labs/skills` | Buscar si existe una skill para algo antes de escribirla. |

## Conectores de claude.ai

Se conectan en claude.ai → Configuración → Conectores, cada uno con su propio acceso, y aparecen en Claude Code si inicias sesión con esa cuenta.

| Conector | Para qué | Cuidado |
|---|---|---|
| Atlassian (Jira) | Tickets del proyecto KAN. | También está en `.mcp.json`; basta con uno. |
| Neon | Revisar la base de producción, sus ramas y consultas lentas. | Trae herramientas que borran ramas o ejecutan SQL. Nunca escribas en la rama `main`; para probar, crea una rama. |
| Render | Logs y despliegues del backend. | Desplegar es integrar a `main`, no un botón. |
| Vercel | Despliegues y logs del frontend. | Igual que Render. |

## Skills de cuenta (no se instalan por comando)

Las skills creadas en una cuenta de claude.ai (por ejemplo `contexto-finova`, `creador-documentos-word`, `finova-pitch-deck-canva` y `finova-presentaciones`, de Vicente) solo existen en esa cuenta. `contexto-finova` ya está cubierta por la skill `contexto-negocio` del repo. Si necesitas las de documentos o presentaciones, pídele a quien las tenga que te comparta la carpeta de la skill y súbela en tu cuenta.

## Cómo sumar una herramienta a esta lista

- Agrégala por PR en **ambos** repos, con un commit `docs(claude): ...`.
- Incluye cómo se instala, para qué sirve en Finova y qué cuidado tener.
- Si es personal y no le sirve al equipo, no va aquí: anótala en tu `CLAUDE.local.md`.
