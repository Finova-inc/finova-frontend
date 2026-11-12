# finova-frontend

Interfaz web de Finova, un SaaS contable multiempresa para PYMEs chilenas.
- **Stack:** Next.js 16.3.4 (App Router), React 19.2.8, TypeScript estricto, Tailwind 4. Solo tres dependencias de runtime: no hay librerías de UI, estado ni formularios.
- **Despliegue:** Vercel, automático al integrar a `main`.
- **Backend:** NestJS en `../finova-backend`, la autoridad real de permisos y datos. Este repo no tiene base de datos.

@AGENTS.md

`README.md` tiene secciones desactualizadas: "Conexión con el backend" y "Deuda técnica conocida". Su sección "6. Estado real de cada ruta" sí está al día. **El código es la fuente de verdad.**

## Comandos
- **Levantar en local:** `npm run dev`. Next toma el 3000 o, si el backend lo ocupa, el siguiente libre. `NEXT_PUBLIC_API_URL` en `.env.local` apunta al backend, y el `CORS_ORIGINS` del backend tiene que incluir el origen del frontend.
- **Pruebas:** `npm test` (`node --test lib/*.test.mjs`, sin dependencias; requiere Node ≥ 22.18).
- **Calidad y build:** `npm run lint` (eslint), `npm run build`.

## Reglas que no se negocian
- **Todo cambio de comportamiento se anota en `CHANGELOG.md`** (sección `[Sin publicar]`, con su ticket `FIN-xx`), en el mismo commit. Variables de entorno nuevas y dependencias del backend van en su propio apartado.
- **Server Component por defecto.** `"use client"` solo si hace falta estado, efectos o listeners.
- **Mutaciones vía Server Actions** (`actions.ts` junto a cada página). La excepción es login y logout, que son route handlers porque fijan la cookie.
- **Toda llamada al backend pasa por `lib/api.ts`**, y el token nunca llega al JavaScript del navegador.
- **El frontend no autoriza nada.** `proxy.ts` (así se llama el middleware en Next 16) solo mira que exista la cookie, y el rol y la empresa se decodifican del JWT sin verificarlo, solo para mostrar u ocultar UI. La autorización real es el backend.
- **Montos como `string`.** Toda aritmética con `lib/decimal.ts`, nunca `number`.
- No agregar librerías de UI, estado o formularios sin decisión del equipo: la CSP es restrictiva y se prefiere controlar el bundle.
- No leer ni editar `.env.local` y no hacer push a `main`.

## Dónde está el detalle
- **`.claude/rules/`:** reglas por tema. Cada una se carga sola al tocar sus archivos:
  - `estilo-codigo.md`
  - `server-components.md`
  - `capa-api.md`
  - `montos.md`
  - `seguridad.md`
  - `pr.md`, que aplica siempre: ramas, commits y PR.
- **`.claude/skills/`:** `patrones-de-testing`, `pantalla-de-modulo`, `contexto-negocio` (producto, equipo y alcance).
- **`.claude/commands/`:** `/revisar`, `/changelog`, `/pre-despliegue`, `/nueva-pantalla`.
- **`.claude/agents/`:** `revisor-codigo`, `auditor-seguridad`.
- **Uso en el equipo:** `docs/CLAUDE-EQUIPO.md`.
- **Notas personales:** `CLAUDE.local.md`, que no se versiona (plantilla en `CLAUDE.local.md.example`).

## Mapa del repo
- **`app/`:**
  - Landing `/`, `login`, `recuperar`, `restablecer`.
  - `api/auth/{login,logout}/route.ts`.
  - `dashboard/`: panel con layout que exige sesión.
    - Módulos reales: `core-contable` (libro diario, el más completo y el patrón de referencia), `libro-mayor`, `balance`, `plan-cuentas`, `periodos`, `documentos` (importación del SII), `terceros`, `f29`, `contabilizacion`, `usuarios`, `parametros`.
    - Pendientes, con `PantallaPendiente`: `auditoria`, `copiloto`.
    - Las empresas se gestionan en el popup `components/dashboard/SelectorEmpresa.tsx`, con las acciones en `app/dashboard/acciones-empresa.ts`.
- **`lib/`:**
  - `api.ts`: única capa de datos y tipos de la API.
  - `session.ts`: cookie `finova_session`.
  - `decimal.ts`, `formato.ts`.
  - `vistas.ts`: nombre de cada pantalla para errores y 404.
  - `ip-firmada.ts`: IP del visitante firmada para el backend.
  - `csv.ts`, `navegacion.ts`.
  - Funciones puras con sus tests `*.test.mjs`.
- **`components/`:**
  - `ui/`: sistema de diseño propio (`Icon.tsx` con sprite SVG, `Boton`, `Etiqueta`, `Panel`…).
  - `dashboard/`, `landing/` (solo marketing), `login/`.
- **`next.config.ts`:** cabeceras de seguridad y CSP.
- **`docs/`:** `DESPLIEGUE-VERCEL.md` (§C.2 desactualizado) y `LANDING.md` (cita archivos que ya no existen).

## Variables de entorno
- `NEXT_PUBLIC_API_URL`: URL del backend. Se lee **al compilar**: cambiarla en Vercel exige redeploy sin caché.
- `CSP_CONNECT_SRC`: debe ir sincronizada con la anterior. Si falta, el navegador bloquea los fetch al backend con solo una línea de CSP en la consola.
- `API_URL_INTERNA` (opcional): URL privada para llamadas de servidor.
- `NEXT_PUBLIC_SITE_URL` (opcional): para Open Graph.
- `IP_FIRMA_SECRETO`: solo servidor, 32 caracteres o más. Tiene el mismo valor que en el backend.

## Pendientes conocidos
- Opiniones de personas ficticias en `components/landing/FaqSection.tsx`, marcadas para reemplazar antes de publicar.
- Precios "referenciales" en la landing.
- SVGs de `create-next-app` sin uso en `public/`.
