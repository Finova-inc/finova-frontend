# Finova — Frontend

Interfaz web de **Finova**, un SaaS de contabilidad y automatización tributaria
para el mercado chileno: importa Documentos Tributarios Electrónicos (DTE) desde
el SII, arma una propuesta de **Formulario 29** y revisa inconsistencias con un
copiloto de IA antes de declarar.

Este repositorio contiene **solo el frontend**. La lógica de negocio, la base de
datos y la integración con el SII viven en `finova-backend` (NestJS + PostgreSQL
+ Docker).

> **Estado del proyecto:** la landing pública y la pantalla de acceso están
> terminadas y pulidas. El área privada (dashboard y módulos) son maquetas
> estáticas: **todavía no hay ninguna llamada real al backend**. Ver
> [Estado real de cada ruta](#estado-real-de-cada-ruta).

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
| **Next.js** | 16.3.4 | App Router. Ojo: Next 16 renombró `middleware.ts` a `proxy.ts` y cambió varias APIs respecto de Next 14/15. |
| **React** | 19.2.8 | Server Components por defecto. |
| **TypeScript** | 5.x | `strict: true`. Alias `@/*` apunta a la raíz. |
| **Tailwind CSS** | 4.x | Configuración **en CSS**, no en `tailwind.config.js`. Los tokens viven en `@theme` dentro de `app/globals.css`. |
| **ESLint** | 9.x | Flat config (`eslint.config.mjs`) con `core-web-vitals` + `typescript`. |
| **Node** | ≥ 20 (probado en 24) | Vercel usa 20/22 según lo que configures. |

**Sin dependencias de UI de terceros.** No hay Radix, shadcn, framer-motion ni
librerías de iconos: todo —iconos, animaciones, acordeón del FAQ, revelado al
hacer scroll— está construido a mano con CSS y APIs del navegador. Eso mantiene
el bundle pequeño y el control total sobre la accesibilidad.

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

### Levantar frontend y backend a la vez

Ambos usan el puerto 3000 por defecto, así que chocan. La convención de este
proyecto es dejar Next en 3000 y mover Nest a 3001:

```bash
# Terminal 1 — base de datos
cd ../finova-backend && docker compose up -d

# Terminal 2 — API
cd ../finova-backend && PORT=3001 npm run start:dev

# Terminal 3 — frontend
npm run dev
```

En PowerShell, la segunda terminal es `$env:PORT = "3001"; npm run start:dev`.

---

## 4. Variables de entorno

La plantilla completa y comentada está en [`.env.example`](.env.example).
Resumen:

| Variable | Ámbito | Para qué |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | Navegador + servidor | URL pública del backend NestJS, sin barra final. |
| `API_URL_INTERNA` | Solo servidor | Opcional. Ruta privada al backend para componentes de servidor. |
| `CSP_CONNECT_SRC` | Build | Orígenes que la Content Security Policy autoriza en `connect-src`. **Sin esto, el navegador bloquea todo fetch al backend en producción.** |
| `NEXT_PUBLIC_SITE_URL` | Navegador | Opcional. URL canónica para las etiquetas Open Graph. |

> **Regla de oro:** todo lo que lleve el prefijo `NEXT_PUBLIC_` queda incrustado
> en el JavaScript que descarga el navegador y es **público**. Claves de API de
> LLM, credenciales del SII o secretos de base de datos nunca llevan ese
> prefijo — de hecho, no deberían estar en este repositorio en absoluto: van en
> el backend.

---

## 5. Estructura del proyecto

```
finova-frontend/
├── app/                        Rutas (App Router)
│   ├── layout.tsx              Layout raíz: fuentes, metadata, script de tema
│   ├── globals.css             Tokens de diseño + animaciones (Tailwind v4)
│   ├── favicon.ico             Icono 16/32/48/64 — Next lo enlaza solo
│   ├── icon.png                Icono 256 px para navegadores modernos
│   ├── apple-icon.png          Icono 180 px para iOS
│   ├── page.tsx                Landing pública — solo composición de secciones
│   ├── login/page.tsx          Pantalla de acceso (dos columnas)
│   ├── dashboard/
│   │   ├── layout.tsx          Layout privado: sidebar + cabecera
│   │   └── page.tsx            Panel con tarjetas de métricas (en cero)
│   ├── empresas/page.tsx       ┐
│   ├── documentos/page.tsx     │
│   ├── core-contable/page.tsx  ├ Placeholders de 7 líneas, uno por épica
│   ├── f29/page.tsx            │
│   ├── copiloto/page.tsx       │
│   └── auditoria/page.tsx      ┘
│
├── components/
│   ├── landing/                Una sección de la landing por archivo
│   │   ├── SiteHeader.tsx      Cabecera con navegación y ThemeToggle
│   │   ├── HeroSection.tsx     Titular + animación del ciclo DTE → F29
│   │   ├── AsciiBanner.tsx     Marquesina ASCII de módulos contables
│   │   ├── AboutSection.tsx    Qué es Finova
│   │   ├── FeaturesSection.tsx Capacidades del producto
│   │   ├── ProcessSequence.tsx Secuencia animada del proceso contable
│   │   ├── PricingSection.tsx  Planes
│   │   ├── TrustSection.tsx    Señales de confianza
│   │   ├── FaqSection.tsx      Acordeón accesible
│   │   └── SiteFooter.tsx      Pie con enlaces y aviso legal
│   ├── login/LoginForm.tsx     Formulario de credenciales (cliente)
│   ├── Sidebar.tsx             Navegación del área privada
│   └── ui/
│       ├── Icon.tsx            14 iconos SVG propios, tipados por nombre
│       ├── InlineScript.tsx    Inyecta el script anti-parpadeo en <head>
│       ├── Reveal.tsx          Revelado al entrar en viewport
│       ├── SectionShell.tsx    Contenedor común de las secciones
│       └── ThemeToggle.tsx     Botón de tema claro/oscuro
│
├── lib/
│   ├── api.ts                  Cliente HTTP hacia el backend NestJS
│   ├── fonts.ts                Space Grotesk + Inter vía next/font
│   ├── theme.ts                Fuente única de verdad del tema
│   └── validation.ts           Validadores puros del formulario de acceso
│
├── docs/
│   ├── LANDING.md              Documentación detallada de la landing
│   └── DESPLIEGUE-VERCEL.md    Plan paso a paso de despliegue
│
├── images/                     Mockups de referencia (NO se sirven)
├── public/                     Assets servidos: logo, foto de login, SVG
├── next.config.ts              Cabeceras de seguridad y CSP
├── .env.example                Plantilla de variables de entorno
├── CLAUDE.md                   Contexto de producto para agentes de IA
└── AGENTS.md                   Aviso de Next 16 (autogenerado por `next dev`)
```

### Nota sobre `images/` vs `public/`

Son cosas distintas y se confunden con facilidad. `public/` se sirve tal cual en
la raíz del sitio: cualquiera puede abrir `/logo-finova.png`. `images/` guarda
los mockups de referencia del diseño y **no** se publica. No muevas archivos
entre ambas sin pensar en eso.

---

## Estado real de cada ruta

| Ruta | Estado | Detalle |
|---|---|---|
| `/` | ✅ Terminada | Landing de 8 secciones, tema claro/oscuro, animaciones CSS. |
| `/login` | ⚠️ Maqueta | Formulario completo y accesible, con validación de cliente y límite de intentos, pero **no autentica a nadie**: no hay servidor detrás. La propia pantalla lo declara. |
| `/dashboard` | ⚠️ Maqueta | Tarjetas de métricas fijas en cero. Sin datos reales. |
| `/empresas`, `/documentos`, `/core-contable`, `/f29`, `/copiloto`, `/auditoria` | 🚧 Placeholder | Siete líneas cada una: un `<h1>` y un párrafo. |

### ⚠️ Las rutas de módulos están fuera del layout privado

`app/dashboard/layout.tsx` aplica la barra lateral únicamente al subárbol
`app/dashboard/`. Las páginas de módulos viven en la raíz de `app/`, así que
**se renderizan sin sidebar y sin cabecera**: el `Sidebar` enlaza a `/empresas`
y al hacer clic la navegación desaparece.

La corrección es mover esas carpetas dentro de `app/dashboard/` (y actualizar
los `href` del `Sidebar`), o convertir el layout en un grupo de rutas
`app/(privado)/`. Está pendiente.

---

## 7. Sistema de diseño

La paleta parte de una idea concreta y no de un gusto: son **colores de
destacador**, el lápiz con que un contador marca un formulario en papel.

**Ningún fondo es blanco ni negro puro.** El blanco puro deslumbra en una
herramienta donde se pasan horas revisando montos; el negro puro genera halo
contra texto claro y arrastre al hacer scroll en pantallas OLED. Ambos fondos
comparten temperatura cálida a propósito: con un fondo neutro frío el naranjo
de acento se veía sucio. En oscuro la superficie elevada es `#1E1A17` y el
texto `#F4F1EC`; en claro, `#F1EBE1` y `#14110F`.

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

**Tipografía:** Space Grotesk para titulares (`font-display`), Inter para cuerpo
e interfaz (`font-sans`). Ambas autohospedadas por `next/font`, sin petición a
Google. El brief original pedía **Styrene**, que es comercial y requiere
licencia; `lib/fonts.ts` documenta la migración exacta —tres líneas— si algún
día se compra.

**Tailwind v4 se configura en CSS.** No busques `tailwind.config.js`: no existe.
Los tokens se declaran con `@theme` en `app/globals.css`, y el `dark:` se activa
por clase mediante `@custom-variant dark`, no por `prefers-color-scheme`.

---

## 8. Tema claro/oscuro sin parpadeo

Es la parte menos obvia del proyecto y conviene entenderla antes de tocarla.

El servidor no puede saber qué tema eligió la persona: `localStorage` solo
existe en el navegador. Si React resolviera el tema al hidratar, el navegador ya
habría pintado la página en claro y se vería un destello blanco antes de pasar a
oscuro.

La solución tiene tres piezas que dependen entre sí:

1. **`lib/theme.ts`** exporta `THEME_INIT_SCRIPT`, un script minificado que lee
   `localStorage`, cae a la preferencia del sistema si no hay nada válido, y
   aplica la clase `.dark` más `color-scheme` sobre `<html>`.
2. **`app/layout.tsx`** lo inyecta en `<head>` con `InlineScript`, de modo que
   corre de forma síncrona durante el parseo, **antes del primer paint**.
3. **`suppressHydrationWarning` en `<html>` es obligatorio.** Sin él, React
   detecta que el DOM no coincide con lo que renderizó el servidor, lo trata
   como error y vuelve a renderizar en el cliente descartando la corrección del
   script — devolviendo justo el parpadeo que se quería evitar.

Si cambias la clave de `localStorage` o el nombre de la clase, hazlo **solo** en
`lib/theme.ts`: es la fuente única de verdad, y el `ThemeToggle` lee de ahí.

---

## 9. Seguridad

`next.config.ts` aplica seis cabeceras a todas las rutas:

| Cabecera | Qué previene |
|---|---|
| `Strict-Transport-Security` | Degradación a HTTP en la primera petición. |
| `X-Frame-Options: DENY` | Clickjacking mediante iframe. |
| `X-Content-Type-Options: nosniff` | Que el navegador adivine el tipo de un archivo. |
| `Referrer-Policy` | Fuga de rutas internas al salir hacia otro dominio. |
| `Permissions-Policy` | Acceso a cámara, micrófono, ubicación, pagos y USB. |
| `Content-Security-Policy` | Ejecución de scripts y conexiones no autorizadas. |

Además, `poweredByHeader: false` quita la cabecera que anuncia el framework y su
versión.

**Sobre `unsafe-inline` en `script-src`:** está aceptado a conciencia. El script
anti-parpadeo es inline por definición y no interpola nada controlado por el
usuario. El endurecimiento posible —hash SHA-256 del script— está documentado en
los comentarios de `next.config.ts`, con su costo de mantenimiento explicado.

**La validación del formulario es de experiencia de usuario, no de seguridad.**
`lib/validation.ts` lo dice en su encabezado: corre en el navegador y cualquiera
la desactiva. Cuando exista autenticación real, el backend NestJS debe volver a
validar todo desde cero tratando cada campo como entrada hostil.

Otras decisiones deliberadas en `LoginForm.tsx`:

- El formulario no tiene `action` y llama a `preventDefault()`: un `<form>` sin
  `action` hace GET a la URL actual, lo que dejaría la contraseña en la barra de
  direcciones, el historial y los logs del servidor.
- El error de acceso es **genérico**. Distinguir "ese correo no existe" de
  "contraseña incorrecta" permite enumerar usuarios.
- La contraseña vive solo en el estado del componente; nunca en `localStorage`,
  cookies ni URL, y se limpia al fallar.
- `spellCheck` desactivado: algunos correctores envían el texto a un servicio
  remoto.
- El límite de 5 intentos con pausa de 30 segundos es **comodidad, no
  seguridad**: se salta recargando la página. El límite real va en el servidor.

---

## 10. Conexión con el backend

Todo el tráfico hacia NestJS pasa por **`lib/api.ts`**. No llames a `fetch()`
directamente desde un componente: la URL base, el timeout, el manejo de errores
y el envío de credenciales quedarían repetidos y divergiendo.

```tsx
import { empresasApi, ApiError } from "@/lib/api";

// Componente de servidor
export default async function EmpresasPage() {
    try {
        const empresas = await empresasApi.listar();
        return <ListaEmpresas empresas={empresas} />;
    } catch (error) {
        if (error instanceof ApiError) {
            return <p>No se pudieron cargar las empresas.</p>;
        }
        throw error;
    }
}
```

Para rutas ad hoc está el cliente genérico:

```ts
import { api } from "@/lib/api";

const propuesta = await api.get<PropuestaF29>("/f29/2026-08");
await api.post("/documentos/importar", { periodo: "2026-08" });
```

Lo que `lib/api.ts` te da y `fetch` no:

- **Timeout de 15 s** con `AbortController`, encadenado con cualquier `signal`
  que le pases. Sin esto, una pestaña queda colgada indefinidamente si el
  contenedor del backend está caído.
- **`ApiError`** con `status` y cuerpo crudo, para que la interfaz decida qué
  mostrar sin filtrar detalles internos del servidor.
- **`credentials: "include"`**, para cookies entre dominios distintos.
- **Contrato tipado** por módulo (`empresasApi`), de modo que TypeScript avise
  cuando el backend cambie.
- **`verificarBackend()`**, útil para diagnosticar un despliegue: si eso falla,
  ninguna otra llamada va a funcionar.

> El backend expone hoy un solo módulo (`/empresas`) y su entidad `Empresa` es
> una clase vacía. La interfaz `Empresa` de `lib/api.ts` es la forma **esperada**
> y hay que sincronizarla cuando se defina la entidad real.

---

## 11. Despliegue en Vercel

El plan completo, paso a paso, está en
**[`docs/DESPLIEGUE-VERCEL.md`](docs/DESPLIEGUE-VERCEL.md)**.

En una línea: el frontend va a Vercel sin ninguna configuración especial, pero
el backend **no** puede ir a Vercel tal como está (es un servidor persistente
con conexiones a PostgreSQL, no una función serverless). Necesita un proveedor
con contenedores. Hay tres puntos que rompen el despliegue si se olvidan: CORS
en NestJS, `CSP_CONNECT_SRC` en Vercel, y HTTPS en la API.

---

## 12. Convenciones de código

- **Indentación de 4 espacios** en TS/TSX.
- **Comentarios que explican el porqué, no el qué.** El código de este proyecto
  está densamente comentado a propósito: es un Capstone y cada decisión no
  evidente lleva su justificación. Mantén ese registro.
- **Server Components por defecto.** `"use client"` solo donde hay estado,
  efectos o eventos: `LoginForm`, `Reveal`, `ThemeToggle`, `SiteHeader`.
  Recuerda que `"use client"` marca un **módulo**, no un subárbol: las secciones
  pasadas como `children` desde un componente de servidor siguen siendo de
  servidor.
- **Alias `@/`** para toda importación entre carpetas; nada de `../../`.
- **Textos de interfaz en español de Chile**, incluidos los mensajes de error.
- **Nombres de dominio en español** (`empresasApi.listar`), consistentes con el
  backend y con el lenguaje del negocio.

---

## 13. Deuda técnica conocida

Nada de esto está oculto, y conviene atacarlo antes de mostrar el proyecto:

| # | Asunto | Impacto |
|---|---|---|
| 1 | Los módulos (`/empresas`, `/f29`, …) están fuera de `app/dashboard/`, así que se ven sin sidebar. | Alto — la navegación se rompe al primer clic. |
| 2 | No hay ninguna llamada real al backend todavía; `lib/api.ts` está listo pero sin usar. | Alto — es el siguiente paso funcional. |
| 3 | No hay autenticación: `/dashboard` es accesible sin sesión. | Alto — antes de cualquier dato real. |
| 4 | Los testimonios (María Fernández y los de la landing) son **personas ficticias**. | Legal — hay que reemplazarlos o etiquetarlos como ejemplo antes de publicar. |
| 5 | `mk.tmp.py` es un script temporal versionado por accidente. | Bajo — borrarlo. |
| 6 | No hay pruebas. El equipo definió Jest como herramienta de QA. | Medio. |
| 7 | El backend tiene credenciales de PostgreSQL escritas fijas en `app.module.ts` y `synchronize: true`. | Crítico en producción — pero se corrige en el otro repositorio. |

---

## 14. Equipo

Proyecto Capstone (APT), Ingeniería en Informática, sede Plaza Vespucio.

| Persona | Rol |
|---|---|
| Pedro Ahumada | Product Owner · Lógica de backend · QA |
| Nicolás Sazo | Scrum Master · Arquitectura de base de datos |
| Vicente San Martín | Development Team · Frontend e integración |

Metodología Scrumban. El backlog se gestiona en Jira (proyecto KAN) con seis
épicas: Core Contable, Motor Tributario y F29, Ingesta de DTE, Usuarios y
Empresas, Copiloto con IA, y Auditoría y Seguridad.

Contexto ampliado de producto y alcance del MVP: [`CLAUDE.md`](CLAUDE.md).
Documentación de la landing: [`docs/LANDING.md`](docs/LANDING.md).
