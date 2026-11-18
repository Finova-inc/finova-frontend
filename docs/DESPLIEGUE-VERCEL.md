# Despliegue en Vercel — plan de trabajo

Guía paso a paso para publicar `finova-frontend` en Vercel y dejarlo conversando
con `finova-backend` (NestJS + PostgreSQL + Docker).

> **Estado (2026-11-12):** todo el despliegue está hecho:
> - frontend en `https://finova-frontend-livid.vercel.app`;
> - backend en Render;
> - base en Neon.
>
> Esta guía queda como runbook para rehacerlo (cuenta nueva, entorno de pruebas) o revisar la configuración. Los pasos ya resueltos en el código lo dicen en cada sección.

---

## 0. Lo primero: el backend NO va a Vercel

Antes de tocar nada conviene entender la arquitectura de destino, porque el
error más caro de este despliegue es intentar subir NestJS a Vercel.

Vercel ejecuta **funciones serverless**: procesos efímeros que arrancan con una
petición y mueren después. NestJS con TypeORM es un **servidor persistente** que
mantiene un pool de conexiones a PostgreSQL vivo entre peticiones. En serverless
ese pool se recrea en cada invocación fría y agota los slots de conexión de la
base de datos. Y el `docker-compose.yml` del backend simplemente no tiene dónde
correr: Vercel no ejecuta contenedores.

La arquitectura correcta es:

```
   Navegador
       │
       ▼
   Vercel                    finova-frontend (Next.js)
   CDN global + SSR/edge     el navegador solo habla con Next
       │
       ▼  Authorization: Bearer <JWT>, desde código de servidor
   Render (Docker)           finova-backend (NestJS)
       │
       ▼
   Neon (PostgreSQL 17)      finova-database-neon, aws-sa-east-1
```

**Vercel es solo para el frontend.** Esta guía cubre eso en detalle y da el
camino corto para el backend.

---

## 1. Resumen del plan

| Fase | Qué | Tiempo estimado |
|---|---|---|
| **A** | Preparar el repositorio: build limpio, `.env.example`, `.gitignore` | 30 min |
| **B** | Desplegar el frontend en Vercel (sin backend aún) | 20 min |
| **C** | Desplegar el backend en un proveedor de contenedores | 1–2 h |
| **D** | Conectar ambos: CORS, CSP, variables de entorno | 45 min |
| **E** | Endurecer: dominio, ramas, protección de Preview | 1 h |

Las cinco fases ya están hechas. Si se rehace desde cero, el orden sigue siendo
este: el frontend puede desplegarse antes que el backend (la landing es
estática), pero el panel no funciona hasta completar la Fase D.

---

## Fase A — Preparar el repositorio

### A.1 Verifica que la compilación de producción pasa

Este es el mismo comando que ejecuta Vercel. Si falla acá, falla allá.

```bash
npm run build
```

Un error de tipos que `next dev` tolera puede tumbar el build de producción.
Hazlo **antes** de conectar el repositorio, no después.

### A.2 Comprueba que no hay secretos versionados

```bash
git ls-files | grep -E "\.env" 
```

Solo debería aparecer `.env.example`. Si aparece un `.env` o `.env.local`, sácalo
del historial **y rota cualquier credencial que contuviera** — borrarlo del
último commit no lo borra del historial de GitHub.

### A.3 Pruebas y lint

```bash
npm test && npm run lint
```

### A.4 Versión de Node

Ya está fijada en `package.json` (`"engines": { "node": ">=20.0.0" }`), así que
Vercel y tu máquina usan un runtime compatible. Para correr `npm test` en local
hace falta Node ≥ 22.18.

### A.5 Integra por PR

El repositorio es `https://github.com/Finova-inc/finova-frontend`. El flujo del
equipo es rama → PR a `development` → PR de `development` a `main`. **Cada merge
a `main` despliega a producción**, así que no se hace push directo a `main`.

---

## Fase B — Desplegar el frontend en Vercel

### B.1 Crear el proyecto

1. Entra a [vercel.com](https://vercel.com) y crea la cuenta **con GitHub**. Eso
   ahorra el paso de conectar la integración después.
2. **Add New → Project**.
3. Importa `Finova-inc/finova-frontend`.

### B.2 Configuración de build

Vercel detecta Next.js y rellena todo solo. **No cambies nada**:

| Campo | Valor |
|---|---|
| Framework Preset | Next.js |
| Root Directory | `./` |
| Build Command | `next build` (por defecto) |
| Output Directory | (por defecto) |
| Install Command | `npm install` (por defecto) |

> **No creas `vercel.json`.** Para un proyecto Next.js estándar no aporta nada y
> es una fuente habitual de configuraciones contradictorias. Las cabeceras de
> seguridad ya se aplican desde `next.config.ts`, que Vercel respeta.

### B.3 Variables de entorno (primera pasada)

En **Settings → Environment Variables**, define para los tres entornos
(Production, Preview, Development):

| Nombre | Valor por ahora |
|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` |
| `CSP_CONNECT_SRC` | *(déjala vacía o sin crear)* |

Se corrigen en la Fase D, cuando exista la URL real del backend. Hasta entonces
la landing funciona, pero el login y el panel no pueden llegar a la API.

### B.4 Deploy

Pulsa **Deploy**. En dos o tres minutos tendrás
`https://finova-frontend-<hash>.vercel.app`.

### B.5 Verificación

```bash
# 1. La landing responde
curl -s -o /dev/null -w "%{http_code}\n" https://<tu-url>.vercel.app/

# 2. Las cabeceras de seguridad llegaron
curl -sI https://<tu-url>.vercel.app/ | grep -iE "content-security|strict-transport|x-frame|x-content-type|referrer|permissions"

# 3. No se anuncia el framework
curl -sI https://<tu-url>.vercel.app/ | grep -i "x-powered-by"   # no debe salir nada
```

Y en el navegador, con la consola abierta:

- `/` carga completa, con las animaciones corriendo.
- El botón de tema alterna claro/oscuro **y persiste al recargar**.
- Al recargar en tema oscuro **no hay destello blanco**. Si lo hay, la CSP está
  bloqueando el script inline: revisa `script-src` en `next.config.ts`.
- `/login` se ve en dos columnas en escritorio y en una en móvil.
- La consola no tiene errores rojos.

**A partir de aquí cada push a `main` despliega automáticamente**, y cada pull
request genera su propia URL de Preview.

---

## Fase C — Desplegar el backend

El backend está fuera del alcance de Vercel, pero sin él la Fase D no tiene qué
conectar. Camino más corto:

### C.1 Base de datos gestionada

No lleves el contenedor de PostgreSQL a producción: el `docker-compose.yml`
actual no tiene respaldos, ni réplica, ni TLS, y la contraseña es `root`.

Opciones con plan gratuito razonable: **Neon**, **Supabase**, o el PostgreSQL
gestionado del propio proveedor donde subas el backend. Todas entregan una
cadena de conexión del tipo `postgresql://usuario:clave@host/base?sslmode=require`.

### C.2 Requisitos del backend para producción (ya cumplidos)

Esta sección pedía cuatro arreglos en `finova-backend`. Hoy están todos hechos, y
el backend es la referencia: no copies código de esta guía.

1. **Credenciales fuera del código.** La conexión sale de `DATABASE_URL`, y en
   producción se verifica el certificado TLS de Neon.
2. **`synchronize: false` en todos los entornos.** No basta con apagarlo solo
   en producción: un `.env` de desarrollo que apuntaba a Neon ya borró CHECK
   reales. El esquema cambia solo con migraciones, que en producción corren al
   arrancar.
3. **CORS** con la lista explícita de `CORS_ORIGINS`, nunca `*`, y escucha en
   `0.0.0.0` (`src/main.ts`).
4. **Validación global** con `whitelist` y `forbidNonWhitelisted`: un campo
   extra en el body devuelve 400.

Detalle en el `README.md` del backend.

### C.3 Publicar

> **Estado real (septiembre 2026):** esta fase YA ESTÁ HECHA. El backend vive en
> Render en `https://finova-backend-qkq0.onrender.com` y la base en Neon
> (proyecto `finova-database-neon`, región `aws-sa-east-1`). El repositorio
> `Finova-inc/finova-backend` trae un `render.yaml` que crea el servicio desde
> **New > Blueprint**, así que no hay que rellenar el formulario a mano. Lo que
> sigue queda como referencia de qué configura ese blueprint.

**Render** es el camino usado: conectas el repositorio de GitHub y el
`render.yaml` define el servicio. Las variables que pide:

| Variable | Valor |
|---|---|
| `DATABASE_URL` | cadena de Neon, con el host `-pooler` y `?sslmode=require` |
| `NODE_ENV` | `production` |
| `PORT` | lo inyecta Render solo (10000); `main.ts` ya lo respeta |
| `JWT_SECRET` | lo genera Render (`generateValue: true`); no se escribe a mano |
| `CORS_ORIGINS` | se rellena en la Fase D.1 |
| `IP_FIRMA_SECRETO` | el mismo valor que en Vercel (Fase D.2); mínimo 32 caracteres |
| `RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL` | no están en el Blueprint: se agregan en el panel. Sin ellas no sale el correo de recuperación de contraseña |

La URL resultante es `https://finova-backend-qkq0.onrender.com`. Comprobación
rápida de que quedó sano: `GET /health` responde
`{"status":"ok","database":"conectada"}`.

> **Plan free de Render:** el servicio se duerme tras ~15 min sin tráfico y la
> siguiente petición tarda ~50 s. `lib/api.ts` aborta cada intento a los 15 s,
> pero las lecturas y el login se reintentan solos con espera creciente
> (`lib/reintentos.ts`), y las pantallas lentas avisan que el servicio está
> despertando. Para uso real hace falta un plan de pago.

> Si prefieres usar el `docker-compose.yml` que ya existe, Fly.io o un VPS con
> Docker son la vía. Es más control y más trabajo: te haces cargo del
> certificado TLS, el proxy inverso y los respaldos.

---

## Fase D — Conectar frontend y backend

Aquí es donde se pierde tiempo si no se sigue el orden. **Tres cosas** tienen que
coincidir, y cada una falla de forma distinta.

### D.1 CORS en el backend

En el proveedor del backend, define:

```
CORS_ORIGINS=https://finova-frontend-livid.vercel.app
```

Sin puerto, sin barra final, con el esquema. Redespliega el backend.

**Cómo falla si te equivocas:** el navegador muestra
*"blocked by CORS policy: No 'Access-Control-Allow-Origin' header"*. La petición
sí sale y el backend sí responde; el navegador descarta la respuesta.

> Las URLs de Preview de Vercel cambian en cada PR
> (`finova-frontend-git-rama-usuario.vercel.app`). Si necesitas que los previews
> lleguen al backend, o los agregas a la lista, o pasas `origin` a una función
> que valide con expresión regular. No uses `origin: true`: acepta cualquier
> dominio.

### D.2 Variables en Vercel

En **Settings → Environment Variables**, ahora con los valores reales:

| Nombre | Production | Preview |
|---|---|---|
| `NEXT_PUBLIC_API_URL` | `https://finova-backend-qkq0.onrender.com` | igual, o una API de staging |
| `CSP_CONNECT_SRC` | `https://finova-backend-qkq0.onrender.com` | igual |
| `IP_FIRMA_SECRETO` | el mismo valor que en Render | igual |

**Sin barra final** en las URLs. `IP_FIRMA_SECRETO` es solo de servidor: nunca
con prefijo `NEXT_PUBLIC_`. Si falta o no coincide con el del backend, todos los
visitantes comparten el mismo contador de intentos de login.

### D.3 Redespliega — esto no es opcional

`NEXT_PUBLIC_*` y `CSP_CONNECT_SRC` se resuelven **en tiempo de build**, no en
tiempo de ejecución. Cambiarlas en el panel de Vercel no afecta al despliegue ya
publicado.

En **Deployments → ⋯ → Redeploy**, y **desmarca "Use existing build cache"**.

### D.4 Verificación de la conexión

```bash
# 1. La CSP autoriza el origen del backend
curl -sI https://<tu-url>.vercel.app/ | grep -i content-security-policy
#    Debe aparecer: connect-src 'self' https://finova-backend...

# 2. El backend acepta el origen del frontend
curl -sI -H "Origin: https://<tu-url>.vercel.app" https://<tu-backend>/empresas | grep -i access-control-allow-origin
#    Debe devolver tu dominio exacto, NO un asterisco
```

### D.5 Guía de síntomas

Los tres fallos se parecen en el navegador y tienen causas distintas:

| Lo que ves en la consola | Causa | Dónde se arregla |
|---|---|---|
| `Refused to connect ... violates Content Security Policy` | La CSP no autoriza el origen. La petición **no sale**. | `CSP_CONNECT_SRC` en Vercel + redespliegue |
| `blocked by CORS policy` | El backend no autoriza el origen. La petición sale y vuelve, el navegador la descarta. | `CORS_ORIGINS` en el backend |
| `Mixed Content: ... was loaded over HTTPS but requested an insecure resource` | El backend está en HTTP. | Poner HTTPS en el backend |
| `ApiError: No se pudo contactar al servidor` | Backend caído o dormido, DNS mal, o URL con typo. | `curl https://<tu-backend>/health` |

La distinción clave: **CSP bloquea antes de salir, CORS bloquea al volver.**

---

## Fase E — Endurecer

### E.1 Dominio propio

En **Settings → Domains** agrega `finova.cl` y `www.finova.cl`. Vercel entrega
los registros DNS a copiar en tu registrador y emite el certificado TLS solo.

Al hacerlo, recuerda actualizar `CORS_ORIGINS` en el backend con el dominio
nuevo, y `NEXT_PUBLIC_SITE_URL` en Vercel.

### E.2 Proteger los Preview

Por defecto, cualquiera con la URL puede abrir un deployment de Preview. Para un
proyecto que va a mostrar datos contables, actívalo:
**Settings → Deployment Protection → Vercel Authentication**.

### E.3 Ramas y flujo

| Rama | Entorno |
|---|---|
| `main` | Production |
| `development` y cualquier otra | Preview, con su propia URL |

El flujo del equipo:
1. Trabajar en una rama por ticket (`feat/...`, `fix/...`).
2. Abrir un PR a `development` y revisarlo en su URL de Preview.
3. Pasar a `main` con un PR de `development` a `main`.

El detalle está en `.claude/rules/pr.md`.

### E.4 Observabilidad

Activa **Analytics** y **Speed Insights** en el panel (el plan gratuito los
incluye). Vercel también expone los logs de build y de runtime en cada
deployment: es el primer lugar donde mirar cuando algo falla en producción.

---

## Lista de verificación final

**Antes de considerar el despliegue terminado:**

- [ ] `npm run build`, `npm test` y `npm run lint` pasan localmente
- [ ] No hay archivos `.env` versionados (`git ls-files | grep .env`)
- [ ] La landing carga en la URL de Vercel
- [ ] Las 6 cabeceras de seguridad aparecen en la respuesta
- [ ] El tema persiste y no parpadea al recargar
- [ ] `/login` se ve correcto en móvil y escritorio
- [ ] Backend desplegado y respondiendo por HTTPS
- [ ] `GET /health` del backend responde `integridad: ok`
- [ ] `CORS_ORIGINS` incluye el dominio exacto del frontend
- [ ] `CSP_CONNECT_SRC` incluye el origen exacto del backend
- [ ] `IP_FIRMA_SECRETO` es igual en Vercel y en Render
- [ ] El correo de recuperación de contraseña llega (`RESEND_API_KEY`, `MAIL_FROM`, `FRONTEND_URL` en Render)
- [ ] Redespliegue hecho **sin caché** después de cambiar variables
- [ ] Login y panel funcionan contra el backend real
- [ ] Las opiniones ficticias de la landing reemplazadas o etiquetadas como ejemplo

---

## Anexo — De landing a producto

Este anexo listaba lo que faltaba para que el área privada sirviera. Hoy está
todo hecho:
- módulos dentro de `app/dashboard/`, con su barra lateral;
- autenticación real con JWT en una cookie `httpOnly`, y `proxy.ts` protegiendo
  el panel;
- pantallas conectadas al backend;
- migraciones de TypeORM en lugar de `synchronize`;
- pruebas: Jest en el backend y `node --test` en el frontend.

Lo que queda pendiente está en la sección "Deuda técnica conocida" del
`README.md`.
