# finova-frontend-main

> Memoria técnica de este repo, actualizada tras una auditoría de código completa (24-sep-2026). Ver también `../CLAUDE.md` (memoria general de FINOVA) y `../finova-backend-main/CLAUDE.md`. Esta versión reestructura y actualiza la anterior: el contexto de negocio/equipo se conserva íntegro (movido a la sección "Contexto de negocio y visión del producto" al final), pero separado con claridad de lo que hoy existe en código — la versión previa mezclaba stack objetivo (Redis, OCR, IA) con la implementación real sin distinguirlos.

## Arquitectura

Next.js 16.3.4, **App Router** (`app/`), React 19.2.8, TypeScript estricto. Sin librerías externas de UI/estado/forms (confirmado contra `package-lock.json`: no hay Radix, shadcn, Redux, Zustand, React Query, SWR, react-hook-form; `zod` está presente solo como dependencia transitiva de ESLint, no se usa en código de la app). Todo hand-rolled — decisión de equipo documentada en `docs/LANDING.md` (p. ej. el gráfico del dashboard es SVG dibujado a mano porque la CSP bloquea CDNs de librerías de gráficos).

Next 16 renombró `middleware.ts` a **`proxy.ts`** (en la raíz del repo) — no confundirlo con un archivo faltante.

## Estructura de rutas (App Router)

```
app/
├── layout.tsx                    Server Component — tema anti-flash, fuentes
├── page.tsx                      "/" landing
├── login/page.tsx                "/login"
├── api/auth/login/route.ts       POST — login real, setea cookie httpOnly
├── api/auth/logout/route.ts      POST — limpia cookie
└── dashboard/
    ├── layout.tsx                 Sidebar + header, exige sesión (Server Component)
    ├── page.tsx                    "/dashboard" — mezcla datos reales y de ejemplo
    ├── acciones-empresa.ts         Server Actions: cambiar, agregar y eliminar empresas (las usa el popup de la cabecera)
    ├── periodos/                    ✅ real (abrir/cerrar/reabrir)
    ├── plan-cuentas/                ✅ real (árbol, crear/editar/eliminar, exportar CSV; configurar/ = configurador del plan — 8-oct-2026)
    ├── core-contable/                ✅ real — el módulo más completo (ver abajo)
    ├── documentos/page.tsx          🚧 placeholder (PantallaPendiente)
    ├── terceros/page.tsx            🚧 placeholder
    ├── f29/page.tsx                  🚧 placeholder
    ├── copiloto/page.tsx             🚧 placeholder
    └── auditoria/page.tsx            🚧 placeholder
```

**`core-contable/`** (libro diario): `page.tsx` (listado + vista imprimible), `[id]/page.tsx` (detalle read-only), `nuevo/page.tsx` (alta), `borradores/[id]/page.tsx` (edición de borrador), `FormularioAsiento.tsx` (~550 líneas, cliente, con balance en vivo vía `lib/decimal.ts`), `DialogoRevertir.tsx`, `BotonImprimir.tsx`, `actions.ts` (Server Actions), `error.tsx` (usa el nuevo prop `retry` de Next 16.3, no el `reset` anterior).

**Componentes cliente** (`"use client"` — confirmado por grep, más de lo que dice un comentario obsoleto en `ThemeToggle.tsx`/`docs/LANDING.md` que afirma "solo tres"): `ThemeToggle`, `Reveal`, `HeaderScroll` (header fijo de la landing que se compacta al hacer scroll), `LoginForm`, `Sidebar`, `CerrarSesionBoton`, `SelectorEmpresa`, `BotonImprimir`, `DialogoRevertir`, `FormularioAsiento`, `core-contable/error.tsx`, `AccionesPeriodo`, `NuevoPeriodoForm`, `BotonPlanBase`. Todo lo demás es Server Component, incluyendo `dashboard/layout.tsx` y todas las páginas de core-contable.

## `proxy.ts` (raíz, ~45 líneas)

Verifica **solo la presencia** de la cookie `finova_session` para rutas `matcher: ["/dashboard/:path*"]`; si falta, redirige a `/login?redirigir=<ruta>`. **No verifica la firma del JWT** — documentado explícitamente en el propio archivo: el runtime Edge no tiene `crypto` de Node, verificar ahí obligaría a exponer `JWT_SECRET` a Edge, y es redundante porque `JwtAuthGuard` en el backend es la autorización real. Una cookie falsificada pasa este proxy y muere en el primer `GET /empresas` con 401. Es gatekeeping de UX, no de seguridad — y sí está activo (contradice una línea obsoleta de "deuda técnica" en el `README.md` que afirma que `/dashboard` no tiene protección; ver "Deuda técnica" más abajo).

## Autenticación

Flujo real (no mockeado):
1. `components/login/LoginForm.tsx` (cliente) valida en el navegador (`lib/validation.ts`, solo UX) y hace `fetch("/api/auth/login", { credentials: "include" })`.
2. `app/api/auth/login/route.ts` re-valida en servidor, llama a `authApi.login()` (`POST /auth/login` del backend real) y, si tiene éxito, setea la cookie `finova_session` (`httpOnly`, `secure` en prod, `sameSite: lax`, 24h — opciones centralizadas en `lib/session.ts`). El cuerpo de la respuesta **nunca** incluye el token.
3. `lib/session.ts`: `exigirTokenSesion()` (redirige a `/login` si no hay cookie) se llama en cada Server Component bajo `dashboard/` y en cada Server Action. `obtenerEmpresaDelToken()`/`obtenerRolDelToken()` decodifican el payload del JWT (base64url) **sin verificar la firma** — documentado como uso solo de presentación (qué empresa/rol mostrar en la UI), nunca como control de acceso.
4. El token nunca llega a JS de cliente; se envía al backend como `Authorization: Bearer <token>` solo desde código de servidor (`lib/api.ts`).
5. `app/api/auth/logout/route.ts` limpia la cookie. El backend no tiene lista de revocación (JWT stateless), así que el token viejo sigue siendo técnicamente válido hasta su expiración natural.

**Comentario obsoleto detectado**: `components/login/LoginForm.tsx` líneas ~105-111 todavía dicen *"como no hay servidor, siempre termina en el mismo error genérico... el objetivo es mostrar el comportamiento de la interfaz, no simular una sesión"* — residuo de antes de conectar el backend; el código justo debajo ya hace un fetch real y redirige en éxito. Candidato a limpieza, no representa el comportamiento actual.

## Capa de comunicación con el backend

**`lib/api.ts`** (625 líneas) es la **única** capa de datos — no hay otros archivos de servicio.

- `API_BASE_URL = API_URL_INTERNA ?? NEXT_PUBLIC_API_URL ?? "http://localhost:3001"` (servidor prefiere la URL interna/privada; el navegador solo ve `NEXT_PUBLIC_API_URL`).
- `apiFetch<T>()`: wrapper de `fetch` con timeout de 15s (`AbortController`), siempre `credentials: "include"`, serializa/parsea JSON, lanza `ApiError extends Error { status, body }` en no-2xx (`status 0`/`408` = fallo de red/timeout).
- `mensajesDelBackend(error)`: extrae mensajes en español desde el cuerpo del error (`{ message: string | string[] }`).
- Grupos tipados 1:1 con rutas reales del backend: `empresasApi`, `tercerosApi`, `documentosApi`, `asientosApi`, `borradoresApi`, `cuentasApi`, `periodosApi`, `authApi`, más `verificarBackend()` (ping a `GET /`).
- Manejo de errores por página: Server Components usan `try/catch`/`Promise.allSettled`; Server Actions usan `traducirError()` local (401→redirect a login, 403→mensaje de rol, 0/408→mensaje de cold-start de Render).

## Componentes

- **`components/ui/`** (sistema de diseño propio, sin librería externa): `Icon.tsx` (sprite SVG único, ~30 íconos, rechaza deliberadamente `lucide-react`), `Boton.tsx`, `Etiqueta.tsx` (pill de estado, incluye tono `demo`), `Panel.tsx`, `Barra.tsx`, `SectionShell.tsx`, `Reveal.tsx`, `ThemeToggle.tsx` (variante `icon` por omisión, usada en panel y login; variante `switch` —pastilla con sol y luna y perilla deslizante— solo en el header de la landing), `InlineScript.tsx`.
- **Formularios**: sin react-hook-form. `<form>` nativo + `useActionState`/`useFormStatus` de React 19 atados a Server Actions (`NuevoPeriodoForm`, el cambio de empresa de `SelectorEmpresa`), o estado controlado + `useTransition` en los más complejos (`FormularioAsiento`, `DialogoRevertir`, `AccionesPeriodo`, `SelectorEmpresa`).
- **Tablas**: `<table>` HTML plano en cada página, sin librería.
- **`components/dashboard/`**: `GraficoIngresosGastos.tsx` (SVG a mano; colores de serie validados con el validador de paleta, no los de estado), `ZonaAlertas.tsx` (dueño del tipo `Alerta`; muestra "Todo al día" si no hay alertas), `SelectorEmpresa.tsx` (popup de empresas con `<dialog>` nativo: cambiar la activa, agregar, cambiar el nombre (solo razón social, solo admin de esa empresa) y eliminar con confirmación por RUT; reemplazó a la página `/dashboard/empresas`), `PantallaPendiente.tsx` (pantalla genérica reusada por los 5 módulos no construidos).
- **`components/landing/`**: solo marketing, sin llamadas al backend; todos Server Components salvo `HeaderScroll`. Rediseñada el 2-oct-2026 y el hero de nuevo el 5-oct-2026: header fijo con el nombre que se pliega hacia el logo; hero centrado según `images/image.png` (titular en serifa Instrument Serif, cargada solo en "/" vía `serifFont.variable` en el envoltorio `.landing`) sin botones ni pastilla (la acción de entrar vive en el header) y `HeroDemo` debajo: dashboard animado de 16 s con "cámara" (zoom/paneo), cursor, clics y anillos de foco numerados, que cierra con una cortina con la marca y el lema "Tu contabilidad, más fácil que nunca." (el reinicio del dashboard ocurre oculto detrás de ella). Ojo: `--font-serif` se redeclara en `.landing` porque la de @theme se resuelve en :root, donde la variable de la serifa no existe, y caería en Inter sin error visible; `ModuleStrip` (carrusel de módulos) bajo el hero; "Qué es Finova" y "Ventajas" con cifras públicas citadas (SII, INE, APQC, Código Tributario, Automation Anywhere). Animaciones solo CSS (`globals.css`, sección 5b), y solo de propiedades que compone la GPU (opacity/translate/scale/transform; nunca clip-path, mask ni width, y nunca transform sobre un `<svg>`: Chrome no lo compone, se anima un span envoltorio). `HeroDemo` mide todo en `em` con font-size = ancho del contenedor/80 (`cqw`), así escala sin JS. Verificado: 0 animaciones no compuestas, 60 fps con CPU 4× más lenta. El estilo base de cada elemento es su estado final y, con "reducir movimiento", se anulan duraciones y retrasos, así todo aparece completo. Las secciones bajo el hero llevan `content-visibility: auto` (medido: layout de carga ~40% menor). Paleta extendida de destacadores (`--hl-*`: naranjo, amarillo, menta, rosa, celeste, lila) y tema oscuro propio de la landing vía `.dark:has(.landing)` — el panel y el login no lo heredan.
- **Trampa de Lightning CSS** (compilador de Tailwind v4): si `-webkit-backdrop-filter` va DESPUÉS de `backdrop-filter`, descarta la versión sin prefijo y Chrome/Edge quedan sin desenfoque. Siempre declarar el prefijo primero.

## Tipos

Todos los tipos de datos de API viven inline en `lib/api.ts` (sin carpeta `types/` separada): `Usuario`, `Empresa`, `Tercero`, `Documento`, `TipoComprobante`, `AsientoResumen/Listado/Detalle`, `MovimientoContable`, `Paginado<T>`, `AsientoBorrador`, `CuentaContable`, `PeriodoContable`, `LoginResponse`, `EmpresaDelUsuario`. **Los montos se tipan como `string`, nunca `number`** — TypeORM devuelve `numeric` como string; usar `lib/decimal.ts` para cualquier operación, nunca `+`/`-` de JS directamente.

## Estado y validación

Sin estado global (Context/Redux/Zustand/React Query/SWR) — solo primitivas de React 19 (`useState`, `useTransition`, `useActionState`, `useFormStatus`, `useSyncExternalStore` para el tema) + Server Actions/`revalidatePath` + parámetros de URL para filtros (core-contable usa `<form method="get">`). `lib/validation.ts` tiene validadores puros hand-written (email, password) explícitamente documentados como UX, no seguridad — la validación real ocurre en el backend.

## Panel de control y datos de ejemplo

`/dashboard` ya no usa datos de ejemplo (se borraron `lib/datos-ejemplo.ts`, `AvisoMaqueta`, `PanelConciliacion` y `TablaCartera` el 2026-10-07). Todo sale del backend en paralelo con `Promise.allSettled`: `asientosApi.resumen` (saldos de los rubros 1101/1103/2101, resultado e IVA por mes; los cálculos de dinero los hace el backend con BigInt), períodos, borradores, cuentas y los últimos 5 asientos. Las alertas las arma `construirAlertas()` en `app/dashboard/page.tsx`; el vencimiento del F29 está fijo en el día 20 (`DIA_VENCE_F29`, supuesto a confirmar con el PO). Un bloque cuya consulta falla muestra "—", nunca un cero. Conciliación bancaria y cartera por vencimiento no se muestran: no hay módulo bancario ni registro de pagos.

Otros hallazgos menores: testimonio ficticio "María Fernández, Auditora externa" en `app/login/page.tsx` (marcado en el propio código como "PERSONA FICTICIA, reemplazar antes de publicar"); precios "referenciales" marcados como tales en `PricingSection.tsx`; SVGs boilerplate de `create-next-app` en `public/` sin ninguna referencia en el código (candidatos a limpieza, no funcionales).

## Variables de entorno

- `NEXT_PUBLIC_API_URL` — URL pública del backend (default local `http://localhost:3001`; prod `https://finova-backend-qkq0.onrender.com`). **Se lee en build-time**, no runtime — cambiarla en Vercel exige redeploy sin caché.
- `CSP_CONNECT_SRC` — debe mantenerse sincronizada con la anterior; si falta, el navegador bloquea los fetches al backend en producción con solo una línea de CSP en consola (sin error de red ni 4xx, fácil de confundir con un problema de CORS).
- `API_URL_INTERNA` — opcional, solo para Server Components en red privada, tiene prioridad sobre `NEXT_PUBLIC_API_URL` en llamadas de servidor.
- `NEXT_PUBLIC_SITE_URL` — opcional, para Open Graph.

## Configuración

`next.config.ts` (183 líneas, casi enteramente headers de seguridad): sin rewrites ni redirects. Construye una CSP donde `connect-src` es `'self'` + `CSP_CONNECT_SRC`; `script-src` agrega `'unsafe-eval'` solo en desarrollo y `'unsafe-inline'` siempre (justificado en comentarios: necesario para el script anti-flash de tema que corre antes del primer paint; alternativas con hash/nonce fueron evaluadas y descartadas porque un nonce forzaría renderizado dinámico y perdería el prerenderizado estático). Además: HSTS, `X-Frame-Options: DENY`, `nosniff`, `Referrer-Policy`, `Permissions-Policy` (bloquea cámara/mic/geo/pago/usb). `tsconfig.json`: `strict: true`, alias `@/*` apunta a la raíz del repo (no a `src/`).

## Funcionalidades completas

Login/logout con JWT real, popup de empresas (cambiar la activa, agregar, cambiar el nombre, eliminar con doble confirmación), apertura/cierre/reapertura de períodos contables, libro diario completo (alta de asiento con balance en vivo, detalle, reversión, borradores con contabilización), plan de cuentas completo: árbol jerárquico (clase → grupo → rubro → cuenta, indentado por profundidad) con solo las cuentas que la empresa eligió; crear/editar cuentas (`FormularioCuenta.tsx`, gateado por rol vía `puedeRegistrar`); eliminar con un popup de confirmación (`DialogoEliminarCuenta.tsx`: borra una cuenta sin historia, ofrece desactivar una con asientos); exportar a CSV (`planACsv`). "Configurar plan de cuentas" (`plan-cuentas/configurar/ConfiguradorPlan.tsx`, admin o contador) elige por rubro las cuentas del plan base (la primera vez vienen marcadas las `recomendada`) y agrega cuentas propias con código del rubro; el avance se guarda en `localStorage` por empresa hasta guardar. El selector de cuenta del libro diario (`FormularioAsiento.tsx`) excluye las cuentas de agrupación (`acepta_movimiento:false`) — solo se pueden imputar cuentas de movimiento.

## Funcionalidades pendientes

Documentos, terceros, Formulario 29, copiloto de IA, auditoría — las 5 son pantallas `PantallaPendiente` que listan qué endpoints del backend ya existen, sin lógica de UI real construida todavía. En `/dashboard` faltan conciliación bancaria y cartera por vencimiento (sin backend).

## Tests

Solo `lib/planCuentas.test.mjs`: `npm test` corre `node --test` sin dependencias (Node ≥ 22.18 quita los tipos de `planCuentas.ts` al importarlo). Cubre las piezas puras del plan de cuentas (CSV, resumen y validación del configurador). Sin Jest, Cypress ni Playwright: el `README.md` lo declara deuda técnica ("El equipo definió Jest como herramienta de QA" pero nunca implementada); `lib/validation.ts` tiene funciones puras escritas pensando en tests que aún no existen.

## Deployment

Vercel, conectado a GitHub, deploy automático en push a `main` (`docs/DESPLIEGUE-VERCEL.md`). Sin `vercel.json` (decisión explícita — el propio doc advierte no crear uno). El backend no puede desplegarse en Vercel (serverless no soporta un pool de conexiones persistente a Postgres) — de ahí la separación a Render. Producción confirmada activa: `finova-frontend-livid.vercel.app` (según `ARQUITECTURA-NEON-RENDER.docx` del backend, 11-sep-2026).

## Archivos importantes

- `lib/api.ts` — toda la comunicación con el backend.
- `lib/session.ts` — manejo de la cookie de sesión y decodificación (no verificación) del JWT.
- `lib/decimal.ts` — aritmética exacta de montos (BigInt), espejo de `common/utils/decimal.util.ts` del backend.
- `proxy.ts` — gate de UX para `/dashboard/*`.
- `app/dashboard/core-contable/` y `app/dashboard/plan-cuentas/` — los módulos más completos, referencia de patrón para nuevas features conectadas al backend (lista + árbol + formulario + acciones por fila).
- `lib/planCuentas.ts` — constante `CLASES_DE_CUENTA` compartida entre `plan-cuentas/page.tsx` y `FormularioAsiento.tsx` (antes duplicada como `CLASES`/`GRUPOS_CUENTA`).
- `docs/DESPLIEGUE-VERCEL.md` — runbook de despliegue (parcialmente desactualizado, ver "Deuda técnica").
- `docs/LANDING.md` — decisiones de diseño de la landing (parcialmente desactualizado).

## Deuda técnica

- **`README.md` tiene secciones desactualizadas** que describen un backend anterior: la sección "Conexión con el backend" afirma que el backend "expone hoy un solo módulo (`/empresas`) y su entidad `Empresa` es una clase vacía", y la tabla de "deuda técnica conocida" del propio README dice "no hay ninguna llamada real al backend todavía", "no hay autenticación: `/dashboard` es accesible sin sesión", y que el backend tiene "credenciales hardcodeadas" y `synchronize: true`. **Todo esto está contradicho por el código actual**, verificado directamente: `lib/api.ts` se usa extensamente, la autenticación es real (ver arriba), `proxy.ts` sí protege `/dashboard/*`, y el backend (`app.module.ts`/`main.ts`, verificado línea por línea) usa variables de entorno, `synchronize: false` y CORS habilitado. La sección "6. Estado real de cada ruta" del mismo README, en cambio, **sí está actualizada** y coincide con el código.
- **`docs/DESPLIEGUE-VERCEL.md` §C.2** lista 4 "arreglos pendientes del backend" (mover credenciales a env vars, habilitar CORS, agregar `ValidationPipe`, definir la entidad `Empresa`) que ya están resueltos en el backend actual — es una instantánea de una fase anterior nunca actualizada.
- **`docs/LANDING.md`** referencia archivos que ya no existen (`F29Animation.tsx`, `CtaSection.tsx`) y afirma "aquí no se usa ninguno de los dos [`middleware.ts` o `proxy.ts`]" — contradicho por el `proxy.ts` actual, que sí es load-bearing.
- Comentario obsoleto en `LoginForm.tsx` (ver "Autenticación").
- Sin tests (ver arriba).
- `mk.tmp.py` mencionado como script temporal accidentalmente versionado en la tabla de deuda técnica del README — **no existe** en el repo actual; el único script real es `scripts/generar-iconos.py` (regenera íconos desde `public/logo-finova.png`, no corre en build/CI).
- SVGs boilerplate de `create-next-app` sin usar en `public/`.

**Conclusión para futuras sesiones**: al leer `README.md` de este repo, tratar la sección "6. Estado real de cada ruta" como confiable, pero verificar contra el código cualquier afirmación de las secciones "Conexión con el backend" y "Deuda técnica conocida" antes de repetirla — ambas describen una fase del proyecto ya superada.

## Cómo seguir desarrollando este Frontend

- **Server Component por defecto**; agregar `"use client"` solo cuando sea estrictamente necesario (estado, efectos, listeners) — el proyecto mantiene deliberadamente esa lista corta (13 componentes).
- **Mutaciones vía Server Actions** (`actions.ts` junto a cada página), no vía route handlers — la única excepción real es login/logout, porque necesitan setear la cookie httpOnly antes del primer render.
- **Toda llamada al backend pasa por `lib/api.ts`** — no hacer `fetch` directo desde componentes; agregar un nuevo grupo tipado (`xApi`) ahí siguiendo el patrón existente (`apiFetch<T>`, tipos de respuesta explícitos, mapeo 1:1 con la ruta real del backend).
- **Montos**: nunca `number`/aritmética JS directa. Usar `lib/decimal.ts`, igual que el backend usa `common/utils/decimal.util.ts` — los tipos de `lib/api.ts` ya tipan montos como `string` a propósito.
- **No agregar librerías de UI/estado/forms externas** sin confirmar que es una decisión consciente — es una restricción de equipo documentada (CSP restrictiva, preferencia por control total sobre el bundle), no un descuido.
- **Datos de ejemplo**: si hace falta mostrar algo sin backend todavía, centralizar el mock en un solo archivo de `lib/` y marcar visualmente el componente con una `Etiqueta` de tono `demo`; nunca mezclar datos falsos sin rotular con datos reales.
- **Nueva pantalla de un módulo pendiente** (documentos/terceros/F29/copiloto/auditoría): el backend ya tiene los endpoints para documentos/terceros/auditoría (ver `../finova-backend-main/CLAUDE.md`) — se puede construir la UI real siguiendo el patrón de `core-contable/` como referencia. F29 y copiloto no tienen backend todavía; construir la UI ahí implicaría además definir y construir esos endpoints en el backend primero.
- Antes de citar el `README.md` de este repo como fuente de verdad, revisar la sección "Deuda técnica" de este archivo — dos de sus secciones están confirmadas como obsoletas.

---

## Contexto de negocio y visión del producto

*(Contenido preservado de la versión anterior de este archivo, extraído originalmente el 2026-08-29 de la carpeta de Google Drive "Finova Capstone" y del proyecto KAN en Jira. Es visión de producto y contexto de equipo — no describe necesariamente lo que existe en código hoy; para eso ver las secciones técnicas arriba y `../CLAUDE.md`.)*

### Qué es

Finova es un SaaS de contabilidad y automatización de procesos financieros con IA, orientado a contadores, PYMEs y grandes empresas. Busca centralizar en una sola plataforma la gestión contable-tributaria: importación automática de compras, ventas y Documentos Tributarios Electrónicos (DTE) desde el Servicio de Impuestos Internos (SII) de Chile, generación de una propuesta de Formulario 29, y un "copiloto tributario" de IA que detecta errores o inconsistencias antes de declarar.

Es simultáneamente el proyecto Capstone (APT) universitario del equipo (carrera Ingeniería en Informática, sede Plaza Vespucio) y una idea de emprendimiento real, nacida de una propuesta de Pedro Ahumada a Vicente San Martín en octubre 2025.

### Equipo (Squad)

- **Pedro Ahumada** — Product Owner / Lógica de Backend. También asume rol de QA/Tester (diseño y ejecución de pruebas funcionales/unitarias con Jest).
- **Nicolás Sazo** — Scrum Master / Arquitectura de Base de Datos. Modela y administra el esquema relacional en PostgreSQL.
- **Vicente San Martín** — Development Team / Frontend e Integración. Desarrolla interfaces en Next.js, integra servicios externos (APIs, OCR) y articula la interacción visual con el modelo de IA.

### Alcance del MVP

**Dentro de alcance**: gestión de usuarios y empresas; importación y administración de DTE; compras y ventas; períodos contables; Core Contable; reglas tributarias; propuesta/simulación del Formulario 29; asistente de IA; alertas; roles, seguridad, auditoría y trazabilidad.

**Fuera de alcance**: presentación automática de declaraciones ante el SII; pago de impuestos; Formulario 22; contabilidad financiera completa; remuneraciones; inventario; conciliación bancaria avanzada; ERP completo; reemplazo del contador mediante IA.

### Stack tecnológico objetivo (visión — ver secciones técnicas arriba para el stack real implementado)

- Frontend: Next.js (React) + TypeScript, SSR/edge para SEO y velocidad.
- Backend: NestJS (Node.js), arquitectura modular (facturación, remuneraciones, tesorería, etc. como módulos independientes).
- Base de datos: PostgreSQL (transacciones ACID, integridad referencial, precisión numérica para montos) + **Redis** (cache, colas de trabajo, sesiones) — *no implementado en código, ver "Servicios externos" en `../CLAUDE.md`*.
- IA: **OCR** especializado para boletas/facturas/DTE (extracción de montos, fechas, RUT) + **LLM** de propósito general para chatbot de soporte y sugerencias — *no implementado en código*.
- Infraestructura: Vercel (edge + serverless, CDN global, CI/CD automatizado, monitoreo y logs).
- Seguridad: autenticación JWT/OAuth2, cifrado en tránsito y en reposo, aislamiento multi-tenant.
- Integración SII: módulo propio en el backend para emisión de DTE y envío de libros de compra/venta, aislado del resto de la lógica contable — *no implementado en código*.

### Módulos contables centralizados (visión de producto)

Configuración y Core, Plan de Cuentas, Asientos Contables, Libro Diario y Mayor, Períodos, Balance de Comprobación, Balance General 8 Columnas, Balances Tributarios, Libro de Compra, Libro de Venta, Libros Auxiliares SII, Centros de Costo (con sus grupos e informes de movimientos), Formulario 29, Ingesta OCR de DTE, Asistente de IA, Chatbot de Soporte, Auditoría Continua, Detección de Anomalías.

*De esta lista, lo implementado en código hoy es: Plan de Cuentas, Asientos Contables, Libro Diario, Períodos. El resto es roadmap.*

### Actores clave (stakeholder map)

- SII (Servicio de Impuestos Internos): alto poder e interés — mantener satisfecho.
- Proveedores de infraestructura (Vercel, LLM): monitorear.
- Sponsors (Finova Networks SpA): gestionar de cerca.
- Contador tributario (usuario final): mantener informado.

### Metas de negocio (Product Vision Board v1.0, responsable Pedro Ahumada)

- 60 usuarios activos mensuales en 6 meses.
- 98% de éxito en sincronización con el SII en 4 meses.
- 85% de retención mensual en 8 meses.
- 1 contrato corporativo firmado en 18 meses.

### Metodología y gestión

El equipo usa Scrumban. Existe un kit de plantillas (Análisis del Caso, Squad y Matriz RACI, Épicas, Historias de Usuario, Product Backlog, etc.) y un checklist de entregables por fase (Fase 1, 2, 3) que distingue metodología ágil vs. tradicional. El Product Backlog priorizado y el Sprint Backlog se gestionan en Jira (proyecto KAN — "Finova: El futuro", sitio pedrojahumadaf.atlassian.net), con 6 épicas definidas: 01 Gestión del Core Contable, 02 Motor Tributario y Propuesta F29, 03 Ingesta y Gestión de Documentos Tributarios, 04 Gestión de Usuarios y Empresas, 05 Copiloto Tributario con IA, 06 Auditoría, Trazabilidad y Seguridad. El Modelo Relacional Normalizado y los Diagramas de Arquitectura (componentes y despliegue) son entregables técnicos de Fase 1 aún en curso.

La carpeta `Fase 1/` de este repo contiene entregables académicos del programa Capstone (autoevaluaciones, diarios de reflexión, presentación del proyecto) — no es documentación técnica del producto.

### Notas

Este contexto se extrajo originalmente de la carpeta de Google Drive "Finova Capstone" (documento de propuesta, guía APT, Product Vision Board, Matriz RACI, Stack Tecnológico, Mapa de Actores, Mapa Mental) y del proyecto KAN en Jira, el 2026-08-29. Si algo cambia (stack, alcance, metas, equipo), actualizar esta sección en lugar de asumir que sigue vigente indefinidamente. Las secciones técnicas de arriba se actualizaron el 2026-09-24 contra el código real y deben ser la referencia principal para cualquier trabajo de desarrollo.
