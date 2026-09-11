# Despliegue en Vercel — plan de trabajo

Guía paso a paso para publicar `finova-frontend` en Vercel y dejarlo conversando
con `finova-backend` (NestJS + PostgreSQL + Docker).

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
       ├──────────►  Vercel                    finova-frontend (Next.js)
       │             CDN global + SSR/edge
       │
       └──────────►  Proveedor de contenedores  finova-backend (NestJS)
                            │                   Railway · Render · Fly.io · VPS
                            ▼
                     PostgreSQL gestionado      Neon · Supabase · Railway
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

Las fases A y B se pueden hacer hoy mismo: **el frontend despliega sin backend**,
porque todo lo que hay hoy es estático.

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

### A.3 Limpieza

```bash
git rm --cached mk.tmp.py && rm mk.tmp.py
```

Es un script temporal que quedó versionado por accidente.

### A.4 Fija la versión de Node

Añade a `package.json` para que Vercel y tu máquina usen el mismo runtime:

```json
"engines": {
    "node": ">=20.0.0"
}
```

### A.5 Sube todo

```bash
git add -A
git commit -m "Preparar despliegue: cliente de API, plantilla de entorno y CSP configurable"
git push origin main
```

El repositorio ya apunta a `https://github.com/BrokenPeter16/finova-frontend.git`.

---

## Fase B — Desplegar el frontend en Vercel

### B.1 Crear el proyecto

1. Entra a [vercel.com](https://vercel.com) y crea la cuenta **con GitHub**. Eso
   ahorra el paso de conectar la integración después.
2. **Add New → Project**.
3. Importa `BrokenPeter16/finova-frontend`.
haz 
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

Se corrigen en la Fase D, cuando exista la URL real del backend. Como todavía
ninguna página llama a la API, no rompen nada.

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

### C.2 Corregir el backend antes de subirlo

Cuatro cambios en `finova-backend` que son obligatorios en producción:

**1. Credenciales fuera del código.** Hoy `src/app.module.ts` tiene host, usuario
y contraseña escritos fijos. Cámbialo a:

```ts
TypeOrmModule.forRoot({
    type: "postgres",
    url: process.env.DATABASE_URL,
    autoLoadEntities: true,
    // NUNCA true en producción: synchronize altera el esquema en cada arranque
    // y puede borrar columnas con datos. En producción se usan migraciones.
    synchronize: process.env.NODE_ENV !== "production",
    ssl: process.env.NODE_ENV === "production"
        ? { rejectUnauthorized: false }
        : false,
})
```

**2. Habilitar CORS** en `src/main.ts` — sin esto el navegador bloquea toda
respuesta del backend cuando la pide el dominio de Vercel:

```ts
const app = await NestFactory.create(AppModule);

app.enableCors({
    // Lista explícita, nunca "*": con credentials: true el comodín es inválido
    // y el navegador rechaza la respuesta.
    origin: (process.env.CORS_ORIGINS ?? "").split(",").filter(Boolean),
    credentials: true,
    methods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
});

await app.listen(process.env.PORT ?? 3000, "0.0.0.0");
```

El `"0.0.0.0"` importa: dentro de un contenedor, escuchar en `localhost` deja el
servicio inalcanzable desde fuera.

**3. Validación de entrada global**, ya que `lib/api.ts` envía JSON:

```ts
app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
```

**4. Definir la entidad `Empresa`**, que hoy es una clase vacía. Mientras lo
esté, `/empresas` no puede devolver datos reales.

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

La URL resultante es `https://finova-backend-qkq0.onrender.com`. Comprobación
rápida de que quedó sano: `GET /health` responde
`{"status":"ok","database":"conectada"}`.

> **Plan free de Render:** el servicio se duerme tras ~15 min sin tráfico y la
> siguiente petición tarda ~50 s. `lib/api.ts` aborta a los 15 s, así que el
> primer login tras una pausa larga puede fallar por tiempo de espera y hay que
> reintentar. Para uso real hace falta un plan de pago.

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

**Sin barra final** en ninguna de las dos.

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
| `ApiError: No se pudo contactar al servidor` | Backend caído, DNS mal, o URL con typo. | Comprueba con `verificarBackend()` o `curl` |

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
| cualquier otra | Preview, con su propia URL |

La disciplina que conviene al equipo: trabajar en ramas por historia de usuario,
abrir PR, revisar en la URL de Preview, y recién ahí mezclar a `main`.

### E.4 Observabilidad

Activa **Analytics** y **Speed Insights** en el panel (el plan gratuito los
incluye). Vercel también expone los logs de build y de runtime en cada
deployment: es el primer lugar donde mirar cuando algo falla en producción.

---

## Lista de verificación final

**Antes de considerar el despliegue terminado:**

- [ ] `npm run build` pasa localmente sin errores ni advertencias nuevas
- [ ] No hay archivos `.env` versionados (`git ls-files | grep .env`)
- [ ] `mk.tmp.py` eliminado
- [ ] La landing carga en la URL de Vercel
- [ ] Las 6 cabeceras de seguridad aparecen en la respuesta
- [ ] El tema persiste y no parpadea al recargar
- [ ] `/login` se ve correcto en móvil y escritorio
- [ ] Backend desplegado y respondiendo por HTTPS
- [ ] `synchronize` desactivado en producción en el backend
- [ ] Credenciales de PostgreSQL fuera del código
- [ ] `CORS_ORIGINS` incluye el dominio exacto del frontend
- [ ] `CSP_CONNECT_SRC` incluye el origen exacto del backend
- [ ] Redespliegue hecho **sin caché** después de cambiar variables
- [ ] Los testimonios ficticios reemplazados o etiquetados como ejemplo

---

## Anexo — Qué falta para que esto sea un producto, no una landing

El despliegue de esta guía publica una landing y una maqueta de acceso. Para que
el área privada sirva de algo, en orden:

1. **Mover los módulos dentro de `app/dashboard/`** para que hereden el layout
   con sidebar. Hoy `/empresas` se ve sin navegación (ver README, sección 6).
2. **Autenticación real**: NestJS emite JWT, el frontend lo guarda en una cookie
   `httpOnly` `Secure` `SameSite=Lax` —nunca en `localStorage`, que es legible
   por cualquier script— y `proxy.ts` protege el subárbol privado.
3. **Conectar la primera pantalla real** usando `empresasApi` de `lib/api.ts`,
   una vez que la entidad `Empresa` exista en el backend.
4. **Migraciones de TypeORM** en lugar de `synchronize`.
5. **Pruebas con Jest**, que es la herramienta que el equipo ya definió para QA.
