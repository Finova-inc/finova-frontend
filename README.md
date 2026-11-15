# Finova — Frontend

Interfaz web de **Finova**, un SaaS de contabilidad y automatización tributaria para el mercado chileno. Permite:
- importar los reportes del SII (registro de compras y ventas, honorarios y DTE);
- llevar el libro contable;
- armar la propuesta del **Formulario 29**;
- y, a futuro, revisar inconsistencias con un copiloto de IA antes de declarar.

Este repositorio contiene **solo el frontend**. La lógica de negocio, la base de datos y la importación del SII viven en `finova-backend` (NestJS + PostgreSQL).

> **Estado del proyecto (2026-11-12):** la landing, el acceso y todo el panel funcionan contra el backend real. Eso incluye libros diario y mayor, balances, plan de cuentas, períodos, importación del SII, contabilización, F29, terceros y usuarios. El copiloto de IA está en beta (solo el core contable) y queda pendiente la auditoría. Ver [Estado real de cada ruta](#estado-real-de-cada-ruta). Los cambios se registran en [`CHANGELOG.md`](CHANGELOG.md).

---

## 1. Tabla de contenidos

1. [Tabla de contenidos](#1-tabla-de-contenidos)
2. [Stack y versiones](#2-stack-y-versiones)
3. [Puesta en marcha](#3-puesta-en-marcha)
4. [Variables de entorno](#4-variables-de-entorno)
5. [Estructura del proyecto](#5-estructura-del-proyecto)
6. [Estado real de cada ruta](#estado-real-de-cada-ruta)
7. [Sistema de diseño](#7-sistema-de-diseño)
8. [Tema claro/oscuro sin parpadeo](#8-tema-clarooscuro-sin-parpadeo)
9. [Seguridad](#9-seguridad)
10. [Conexión con el backend](#10-conexión-con-el-backend)
11. [Despliegue en Vercel](#11-despliegue-en-vercel)
12. [Convenciones de código](#12-convenciones-de-código)
13. [Deuda técnica conocida](#13-deuda-técnica-conocida)
14. [Equipo](#14-equipo)

---

## 2. Stack y versiones

| Pieza | Versión | Nota |
|---|---|---|
| **Next.js** | 16.3.4 | App Router. Ojo: Next 16 renombró `middleware.ts` a `proxy.ts` y cambió varias APIs respecto de Next 14/15 (ver `AGENTS.md`). |
| **React** | 19.2.8 | Server Components por defecto. |
| **TypeScript** | 5.x | `strict: true`. Alias `@/*` apunta a la raíz. |
| **Tailwind CSS** | 4.x | Configuración **en CSS**, no en `tailwind.config.js`. Los tokens viven en `@theme` dentro de `app/globals.css`. |
| **ESLint** | 9.x | Flat config (`eslint.config.mjs`) con `core-web-vitals` + `typescript`. |
| **Node** | ≥ 20 para correr, ≥ 22.18 para `npm test` | Los tests importan los `.ts` directamente; Node les quita los tipos. |

**Sin dependencias de UI de terceros.** No hay Radix, shadcn, framer-motion, librerías de iconos, de estado ni de formularios. Todo está construido a mano con CSS y APIs del navegador: iconos, animaciones, gráficos, diálogos y formularios. Eso mantiene el bundle pequeño y el control total sobre la accesibilidad, y permite una CSP estricta.

---

## 3. Puesta en marcha

```bash
# 1. Dependencias
npm install

# 2. Variables de entorno
cp .env.example .env.local     # y ajusta los valores

# 3. Servidor de desarrollo
npm run dev                    # http://localhost:3000
```

| Script | Qué hace |
|---|---|
| `npm run dev` | Servidor de desarrollo con recarga en caliente. |
| `npm run build` | Compilación de producción. **Ejecútalo antes de cada push:** es lo mismo que corre Vercel, y falla ante cualquier error de tipos. |
| `npm start` | Sirve la compilación de producción localmente. |
| `npm run lint` | ESLint sobre todo el proyecto. |
| `npm test` | Pruebas unitarias de `lib/` con `node --test`, sin dependencias. |

### Levantar frontend y backend a la vez

La convención es frontend en el 3000 y backend en el 3001. Las plantillas `.env.example` de ambos repos ya vienen así: si las copias sin cambiar los puertos, funcionan juntas.

```bash
# Terminal 1 — base de datos
cd ../finova-backend && docker compose up -d postgres

# Terminal 2 — API (toma PORT=3001 de su .env)
cd ../finova-backend && npm run start:dev

# Terminal 3 — frontend
npm run dev
```

**Para entrar en local** usa la cuenta de desarrollo común: RUT `11.111.111-1`, contraseña `FinovaLocal-2026`. Se crea con `npm run seed:dev` en el backend; el detalle está en la sección 6 de su README. Esa cuenta solo existe en la base local.

Si cambias los puertos, ajusta `NEXT_PUBLIC_API_URL` y `CSP_CONNECT_SRC` en `.env.local`, y `CORS_ORIGINS` en el `.env` del backend.

---

## 4. Variables de entorno

La plantilla completa y comentada está en [`.env.example`](.env.example).
Resumen:

| Variable | Ámbito | Para qué |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Navegador + servidor | URL pública del backend NestJS, sin barra final. Se lee **al compilar**: cambiarla en Vercel exige redeploy sin caché. |
| `API_URL_INTERNA` | Solo servidor | Opcional. Ruta privada al backend para componentes de servidor. |
| `CSP_CONNECT_SRC` | Build | Orígenes que la Content Security Policy autoriza en `connect-src`. **Sin esto, el navegador bloquea todo fetch al backend en producción.** |
| `NEXT_PUBLIC_SITE_URL` | Navegador | Opcional. URL canónica para las etiquetas Open Graph. |
| `IP_FIRMA_SECRETO` | Solo servidor | Firma la IP del visitante que se envía al backend para el límite de intentos de login. Mínimo 32 caracteres, el mismo valor que en el backend. |

> **Regla de oro:** todo lo que lleve el prefijo `NEXT_PUBLIC_` queda incrustado en el JavaScript que descarga el navegador y es **público**. Ningún secreto lleva ese prefijo.

---

## 5. Estructura del proyecto

```
finova-frontend/
├── app/                          Rutas (App Router)
│   ├── layout.tsx                Layout raíz: fuentes, metadata, script de tema
│   ├── globals.css               Tokens de diseño + animaciones (Tailwind v4)
│   ├── page.tsx                  Landing pública
│   ├── login/ recuperar/ restablecer/   Acceso y recuperación de contraseña
│   ├── api/auth/{login,logout}/  Route handlers que fijan y borran la cookie de sesión
│   ├── error.tsx, not-found.tsx, global-error.tsx
│   └── dashboard/                Panel privado (exige sesión)
│       ├── layout.tsx            Barra lateral + cabecera con el selector de empresa
│       ├── page.tsx              Panel de control
│       ├── acciones-empresa.ts   Server Actions del popup de empresas
│       ├── core-contable/        Libro diario (patrón de referencia del panel)
│       ├── libro-mayor/  balance/  plan-cuentas/  periodos/
│       ├── documentos/  contabilizacion/  parametros/  f29/
│       ├── terceros/  usuarios/
│       ├── auditoria/           Pantalla pendiente
│       └── [...ruta]/            Rutas inventadas → 404 dentro del panel
│
├── components/
│   ├── ui/                       Sistema de diseño propio (Icon, Boton, Etiqueta, Panel,
│   │                             MensajeDeEstado, ThemeToggle, InlineScript…)
│   ├── dashboard/                Selector de empresa, gráfico, alertas, estados de error/espera
│   ├── landing/                  Una sección de la landing por archivo
│   ├── login/                    Formularios de acceso y recuperación
│   ├── Sidebar.tsx               Navegación del panel
│   └── CerrarSesionBoton.tsx
│
├── lib/                          Lógica sin interfaz, probada con node --test
│   ├── api.ts                    Única capa de comunicación con el backend + tipos
│   ├── session.ts                Cookie de sesión
│   ├── decimal.ts, formato.ts    Montos exactos y formato chileno
│   ├── vistas.ts                 Nombre de cada pantalla para errores y 404
│   ├── ip-firmada.ts             IP del visitante firmada para el backend
│   ├── csv.ts                    Exportación CSV segura
│   └── *.ts + *.test.mjs         Funciones puras de cada módulo y sus pruebas
│
├── proxy.ts                      Exige la cookie para entrar a /dashboard (Next 16)
├── next.config.ts                Cabeceras de seguridad y CSP
├── docs/                         Despliegue, landing y guía de Claude para el equipo
├── .claude/, CLAUDE.md           Configuración de Claude Code (ver docs/CLAUDE-EQUIPO.md)
├── public/                       Assets servidos: logo, foto de login
├── images/, Referencias/         Mockups y referencias de diseño (NO se sirven)
├── scripts/generar-iconos.py     Regenera los íconos de app/ desde el logo (manual)
└── Fase 1/                       Entregables académicos del Capstone (no es código)
```

### Nota sobre `images/` vs `public/`

Son cosas distintas y se confunden con facilidad. `public/` se sirve tal cual en la raíz del sitio: cualquiera puede abrir `/logo-finova.png`. `images/` guarda los mockups de referencia del diseño y **no** se publica. No muevas archivos entre ambas sin pensar en eso.

---

## Estado real de cada ruta

| Ruta | Estado | Detalle |
|---|---|---|
| `/` | ✅ Terminada | Landing con cabecera que se compacta al hacer scroll, hero con demo animada del panel, carrusel de módulos, tema claro/oscuro y animaciones solo CSS. |
| `/login` | ✅ Real | Acceso por RUT y contraseña contra el backend. El JWT queda en una cookie httpOnly. Avisa si la sesión expiró. |
| `/recuperar`, `/restablecer` | ✅ Real | Recuperación de contraseña por correo, con enlace de un solo uso. |
| `/dashboard` | ✅ Real | Panel de control con datos reales del libro: efectivo, por cobrar, por pagar, resultado del ejercicio, ingresos y gastos por mes, últimos asientos y documentos por contabilizar. Alertas de IVA estimado, vencimiento del F29, meses sin cerrar y borradores. |
| Popup de empresas (cabecera) | ✅ Real | Cambiar la empresa activa, agregar, renombrar (solo la razón social) y eliminar con doble confirmación. |
| `/dashboard/core-contable` | ✅ Real | Libro diario: comprobantes con filtros y paginación, vista imprimible, borradores, alta con cuadre en vivo (`lib/decimal.ts`), detalle y reversión. |
| `/dashboard/libro-mayor` | ✅ Real | Mayor por cuenta y rango de fechas, con vista analítica y exportación CSV. |
| `/dashboard/balance` | ✅ Real | Balance de comprobación, balance general, estado de resultados, balance tributario y notas a los estados financieros (editables y exportables). |
| `/dashboard/plan-cuentas` | ✅ Real | Árbol del plan con crear, editar, eliminar y exportar CSV. `configurar/` elige las cuentas del plan base NIIF y agrega cuentas propias. |
| `/dashboard/periodos` | ✅ Real | Abrir meses, cerrar en orden (administrador o contador) y reabrir con motivo (solo administrador). |
| `/dashboard/documentos` | ✅ Real | Importación de reportes del SII, con vista previa e historial: compras y ventas, honorarios, y XML o ZIP de DTE. Libros de compras y ventas con filtros, y detalle de cada documento. |
| `/dashboard/contabilizacion` | ✅ Real | Documentos del SII por contabilizar: Finova propone el asiento y la persona lo revisa y lo contabiliza. |
| `/dashboard/parametros` | ✅ Real | Cuentas que usa la contabilización para cada función. |
| `/dashboard/f29` | ✅ Real | Propuesta del Formulario 29 del mes a partir de compras, ventas y honorarios. Incluye remanente con UTM sugerida, aprobación y folio de la declaración. No presenta ante el SII. |
| `/dashboard/terceros` | ✅ Real | Libreta de clientes y proveedores, con sugerencias desde los documentos del SII, ficha con actividad y descarga de datos personales (Ley 21.719). |
| `/dashboard/usuarios` | ✅ Real | Miembros de la empresa: agregar, cambiar rol y quitar acceso (administrador). |
| Copiloto IA (flotante, en todo el panel) | 🧪 Beta | `components/dashboard/copiloto/`, montado en `app/dashboard/layout.tsx`. Chat en streaming vía `/api/copiloto/chat` → `POST /copiloto/chat`. Solo consulta el core contable. Sin `ANTHROPIC_API_KEY` en el backend muestra que no está disponible. Arquitectura y límites: `finova-backend/docs/MODULO-COPILOTO.md`. |
| `/dashboard/auditoria` | 🚧 Pendiente | `PantallaPendiente`. Ya tiene endpoint en el backend. |

Los botones que registran se ocultan al rol "consulta" leyendo el rol del JWT (`obtenerRolDelToken`). Es solo presentación: el backend responde 403 igual si alguien fuerza la llamada.

---

## 7. Sistema de diseño

La paleta parte de una idea concreta y no de un gusto: son **colores de destacador**, el lápiz con que un contador marca un formulario en papel.

**Ningún fondo es blanco ni negro puro.**
- El blanco puro deslumbra en una herramienta donde se pasan horas revisando montos.
- El negro puro genera halo contra el texto claro y arrastre al hacer scroll en pantallas OLED.
- Ambos fondos comparten temperatura cálida a propósito: con un fondo neutro frío, el naranjo de acento se veía sucio.

En oscuro, la superficie elevada es `#1E1A17` y el texto `#F4F1EC`; en claro, `#F1EBE1` y `#14110F`.

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#14110F` | Tinta café: texto en claro, fondo en oscuro |
| `--color-paper` | `#FAF7F2` | Papel cálido: fondo en claro |
| `--color-bone` | `#F1EBE1` | Papel sombreado: superficies elevadas en claro |
| `--color-cream` | `#F7F4EC` | Barra de navegación |
| `--color-marker` | `#FF6A1A` | Acento principal, botones |
| `--color-marker-soft` | `#FF8642` | El mismo naranjo en tema oscuro (el puro vibra sobre negro) |
| `--color-highlight` | `#FFC53D` | Resaltado de texto |
| `--color-graphite` | `#6E6459` | Gris cálido: texto secundario |

La landing suma una paleta de destacadores (`--hl-*`) y su propio tema oscuro.

**Tipografía** (`lib/fonts.ts`), autohospedada por `next/font`, sin petición a Google desde el navegador:
- **Space Grotesk:** titulares (`font-display`).
- **Inter:** cuerpo e interfaz (`font-sans`), por sus cifras tabulares.
- **Instrument Serif:** solo el titular del hero de la landing.

El brief original pedía **Styrene**, que es comercial; `lib/fonts.ts` documenta cómo migrar si algún día se compra.

**Tailwind v4 se configura en CSS.** No busques `tailwind.config.js`: no existe. Los tokens se declaran con `@theme` en `app/globals.css`, y el `dark:` se activa por clase mediante `@custom-variant dark`, no por `prefers-color-scheme`.

---

## 8. Tema claro/oscuro sin parpadeo

Es la parte menos obvia del proyecto y conviene entenderla antes de tocarla.

El servidor no puede saber qué tema eligió la persona: `localStorage` solo existe en el navegador. Si React resolviera el tema al hidratar, el navegador ya habría pintado la página en claro y se vería un destello blanco antes de pasar a oscuro.

La solución tiene tres piezas que dependen entre sí:

1. **`lib/theme.ts`** exporta `THEME_INIT_SCRIPT`, un script minificado. Lee `localStorage`, cae a la preferencia del sistema si no hay nada válido, y aplica la clase `.dark` más `color-scheme` sobre `<html>`.
2. **`app/layout.tsx`** lo inyecta en `<head>` con `InlineScript`, de modo que corre de forma síncrona durante el parseo, **antes del primer paint**.
3. **`suppressHydrationWarning` en `<html>` es obligatorio.** Sin él, React detecta que el DOM no coincide con lo que renderizó el servidor, lo trata como error y vuelve a renderizar en el cliente. Eso descarta la corrección del script y devuelve justo el parpadeo que se quería evitar.

Si cambias la clave de `localStorage` o el nombre de la clase, hazlo **solo** en `lib/theme.ts`: es la fuente única de verdad, y el `ThemeToggle` lee de ahí.

---

## 9. Seguridad

**Sesión.**
- El backend emite el JWT, pero el navegador nunca lo ve: `app/api/auth/login/route.ts` lo guarda en la cookie `finova_session`, con `httpOnly`, `sameSite: lax`, `secure` en producción y 24 h de duración.
- Las páginas y Server Actions lo leen en el servidor y lo envían al backend como `Authorization: Bearer`.
- `proxy.ts` solo comprueba que exista la cookie para entrar a `/dashboard`. La autorización real (rol, empresa, validez del token) la hace el backend en cada petición.
- El cierre de sesión borra la cookie y pide al backend revocar el token.

**Cabeceras.** `next.config.ts` aplica seis cabeceras a todas las rutas:

| Cabecera | Qué previene |
|---|---|
| `Strict-Transport-Security` | Degradación a HTTP en la primera petición. |
| `X-Frame-Options: DENY` | Clickjacking mediante iframe. |
| `X-Content-Type-Options: nosniff` | Que el navegador adivine el tipo de un archivo. |
| `Referrer-Policy` | Fuga de rutas internas al salir hacia otro dominio. |
| `Permissions-Policy` | Acceso a cámara, micrófono, ubicación, pagos y USB. |
| `Content-Security-Policy` | Ejecución de scripts y conexiones no autorizadas. |

Además, `poweredByHeader: false` quita la cabecera que anuncia el framework y su versión.

**Sobre `unsafe-inline` en `script-src`:** está aceptado a conciencia. El script anti-parpadeo es inline por definición y no interpola nada controlado por el usuario. El endurecimiento posible está documentado en los comentarios de `next.config.ts`, con su costo explicado: un hash del script, o un nonce que obligaría a perder el prerenderizado estático.

**Límite de intentos.** El backend limita los intentos de login y recuperación por IP y por RUT. Para que vea la IP real del visitante, y no la de Vercel, el frontend la envía firmada con HMAC en la cabecera `x-finova-ip` (`lib/ip-firmada.ts`, secreto `IP_FIRMA_SECRETO`).

**La validación del navegador es de experiencia de usuario, no de seguridad.** `lib/validation.ts` lo dice en su encabezado. El backend vuelve a validar todo.

Otras decisiones deliberadas en el acceso:
- El formulario de login no hace GET: la contraseña nunca queda en la URL, el historial ni los logs.
- El error de acceso es **genérico**. Distinguir "ese RUT no existe" de "contraseña incorrecta" permite enumerar usuarios. La recuperación responde lo mismo exista o no la cuenta.
- La contraseña vive solo en el estado del componente; nunca en `localStorage`, cookies ni URL.
- La pausa tras varios intentos fallidos en el formulario es **comodidad, no seguridad**. El límite real lo aplica el backend.

**Exportaciones.** Los CSV se arman con `lib/csv.ts`, que neutraliza las celdas que una planilla interpretaría como fórmula.

---

## 10. Conexión con el backend

Todo el tráfico hacia NestJS pasa por **`lib/api.ts`**. No llames a `fetch()` directamente desde un componente: la URL base, el timeout, el token y el manejo de errores quedarían repetidos y divergiendo.

- **Grupos tipados** por módulo del backend, mapeados 1:1 con sus rutas: `authApi`, `empresasApi`, `usuariosApi`, `cuentasApi`, `periodosApi`, `asientosApi`, `borradoresApi`, `documentosApi`, `siiApi`, `contabilizacionApi`, `f29Api`, `utmApi`, `notasEeffApi`, `tercerosApi`. Para rutas sueltas existe el cliente genérico `api`.
- **Timeout de 15 s** con `AbortController`. Sin esto, una pestaña queda colgada indefinidamente si el backend está caído o despertando.
- **`ApiError`** con `status` y cuerpo crudo, para que la interfaz decida qué mostrar. `status 0` o `408` significan red o timeout.
- **Reintentos con espera creciente**, solo en lecturas y login, ante 0, 502, 503 y 504 (`lib/reintentos.ts`). El plan free de Render duerme el backend tras unos minutos sin uso. Las escrituras nunca se reintentan solas.
- **Montos siempre como `string`**, operados con `lib/decimal.ts`.

Cada `actions.ts` traduce los errores del backend a mensajes para la persona:

```ts
function traducirError(error: unknown, porDefecto: string): string[] {
    if (error instanceof ApiError) {
        if (error.status === 401) redirect("/login");
        if (error.status === 403) return ["Tu rol en esta empresa no permite esta operación."];
        if (error.status === 0 || error.status === 408) {
            return ["El servidor no respondió a tiempo (puede estar despertando). Reintenta en unos segundos."];
        }
    }
    return mensajesDelBackend(error) ?? [porDefecto];
}
```

---

## 11. Despliegue en Vercel

El plan completo, paso a paso, está en **[`docs/DESPLIEGUE-VERCEL.md`](docs/DESPLIEGUE-VERCEL.md)**. Hoy sirve como runbook para rehacer o revisar el despliegue.

En corto:
- El frontend va a Vercel sin configuración especial: no se usa `vercel.json`, a propósito. Un merge a `main` despliega solo.
- El backend corre en Render (no puede ir a Vercel: es un servidor persistente con conexiones a PostgreSQL), con la base en Neon.
- Hay tres cosas que rompen el despliegue si se olvidan:
  - `CORS_ORIGINS` en el backend;
  - `CSP_CONNECT_SRC` en Vercel;
  - HTTPS en la URL de la API.

  Además, `IP_FIRMA_SECRETO` tiene que ser igual en ambos lados.

---

## 12. Convenciones de código

El detalle está en `.claude/rules/` y en `CLAUDE.md`, que sirven igual para personas que para Claude. Lo esencial:

- **Indentación de 4 espacios** y comillas dobles en TS/TSX.
- **Comentarios que explican el porqué, no el qué.** Es un Capstone y cada decisión no evidente lleva su justificación: mantén ese registro.
- **Server Components por defecto.** `"use client"` solo donde hay estado, efectos o eventos. Recuerda que `"use client"` marca un **módulo**, no un subárbol.
- **Mutaciones con Server Actions** (`actions.ts` junto a cada página), no con route handlers.
- **Alias `@/`** para toda importación entre carpetas; nada de `../../`.
- **Textos de interfaz en español de Chile**, incluidos los mensajes de error.
- **Nombres de dominio en español** (`asientosApi`, `traducirError`), consistentes con el backend.
- **Lógica pura en `lib/`** con su prueba `*.test.mjs`.
- **Todo cambio de comportamiento va en `CHANGELOG.md`** con su ticket `FIN-xx`.

---

## 13. Deuda técnica conocida

| # | Asunto | Impacto |
|---|---|---|
| 1 | Las opiniones de clientes de la landing (`components/landing/FaqSection.tsx`) son **personas ficticias**, marcadas así en el código. | Legal: reemplazar por opiniones reales antes de publicar. |
| 2 | Los precios de la landing son referenciales (lo dice la propia sección). | Bajo: definir precios reales. |
| 3 | Auditoría sigue como `PantallaPendiente`. | Funcional: ya tiene backend. |
| 4 | Solo hay pruebas unitarias de `lib/`; no hay pruebas de interfaz ni de extremo a extremo en navegador. | Medio. |
| 5 | SVGs de `create-next-app` sin uso en `public/` (`file`, `globe`, `next`, `vercel`, `window`). | Bajo: borrarlos. |

---

## 14. Equipo

Proyecto Capstone (APT), Ingeniería en Informática, sede Plaza Vespucio.

| Persona | Rol |
|---|---|
| Pedro Ahumada | Product Owner · Lógica de backend · QA |
| Nicolás Sazo | Scrum Master · Arquitectura de base de datos |
| Vicente San Martín | Development Team · Frontend e integración |

Metodología Scrumban. El backlog se gestiona en Jira (proyecto KAN) con seis épicas:
1. Core Contable.
2. Motor Tributario y F29.
3. Ingesta de DTE.
4. Usuarios y Empresas.
5. Copiloto con IA.
6. Auditoría y Seguridad.

- Contexto de producto y alcance del MVP: [`.claude/skills/contexto-negocio/SKILL.md`](.claude/skills/contexto-negocio/SKILL.md).
- Cómo trabajamos con Claude Code: [`docs/CLAUDE-EQUIPO.md`](docs/CLAUDE-EQUIPO.md).
- Documentación de la landing: [`docs/LANDING.md`](docs/LANDING.md).
