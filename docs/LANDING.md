# Landing page de Finova — documentación de la implementación

Este documento describe qué se construyó, cómo está organizado y qué prácticas
de seguridad se aplicaron. Está pensado para que alguien que no participó en la
implementación pueda revisarla o continuarla.

---

## 1. Resumen

Se reemplazó la página de inicio —que era una pantalla de 19 líneas con el texto
"Finova" centrado— por una landing completa, con tema claro y oscuro, animaciones
en CSS, iconos propios y una ruta de acceso.

| Antes | Ahora |
|---|---|
| Una pantalla estática sin diseño | Landing de 8 secciones |
| Sin tema oscuro | Tema claro/oscuro con persistencia y sin parpadeo |
| Metadata "Create Next App" | Metadata real, en español, con Open Graph |
| Botón sin destino | Ruta `/login` con formulario accesible |
| Sin cabeceras de seguridad | 6 cabeceras aplicadas a todas las rutas |
| Fuentes rotas (`body` forzaba Arial) | Space Grotesk + Inter, autohospedadas |

---

## 2. Decisiones de diseño

### 2.1 Tipografía: por qué no es Styrene

El brief pedía **Styrene**, tipografía comercial de Commercial Type. No está en
Google Fonts, requiere licencia pagada y no había archivos en el repositorio.
Descargarla de un espejo no autorizado habría sido una infracción de licencia,
así que se usaron fuentes libres.

| Rol | Fuente | Razón |
|---|---|---|
| Titulares | **Space Grotesk** | Comparte con Styrene la construcción de grotesca geométrica, los bowls ligeramente cuadrados y el aire técnico algo irregular en las diagonales. |
| Cuerpo e interfaz | **Inter** | Altura-x alta y cifras tabulares reales, necesarias en una interfaz llena de montos y RUT. |

`lib/fonts.ts` documenta la ruta exacta de migración a Styrene si se compra la
licencia: se cambian tres líneas y nada más, porque los componentes consumen la
utilidad `font-display`, nunca el nombre de la familia.

### 2.2 Paleta: el naranjo y el amarillo tienen una razón

No son un degradado decorativo. Son **colores de destacador**: el naranjo del
lápiz con que un contador marca un formulario en papel. Por eso el naranjo marca
las acciones y el amarillo resalta la palabra clave del titular.

| Token | Valor | Uso |
|---|---|---|
| `--color-ink` | `#0B0B0C` | Texto en claro, fondo en oscuro |
| `--color-paper` | `#FFFFFF` | Fondo en claro |
| `--color-bone` | `#F7F6F3` | Superficies elevadas en claro |
| `--color-marker` | `#FF6A1A` | Acento principal, botones |
| `--color-marker-soft` | `#FF8642` | Igual, en tema oscuro (el naranjo puro vibra sobre negro) |
| `--color-highlight` | `#FFC53D` | Resaltado de texto |
| `--color-graphite` | `#6B6B70` | Texto secundario |

### 2.3 Las imágenes de referencia

`images/Header.png` y `images/Hero.png` son mockups de otras marcas ("SoRun",
"Partify") en lavanda y verde lima. Se tomó **solo la estructura** —barra de
navegación en pastilla negra flotante, hero partido con frases resaltadas— y se
aplicó la paleta de Finova.

**Esos PNG no se renderizan ni se copiaron a `public/`.** Están fuera de esa
carpeta, son material de terceros y no hay licencia para publicarlos.

### 2.4 Posicionamiento: SaaS contable, no una herramienta de F29

La landing NO presenta a Finova como una herramienta para el Formulario 29. El
mensaje es que se trata de un sistema contable completo, definido por tres
atributos que se repiten a lo largo de la pagina: **intuitivo, centralizado y
automatizado con inteligencia artificial**.

El F29 sigue existiendo como modulo del producto y aparece en el pie y en el
carrusel, pero no encabeza el discurso.

### 2.5 Assets de marca

| Archivo en public/ | Origen | Uso |
|---|---|---|
| `logo-finova.png` | `images/Logo Finova.png` | Marca, en header y login |
| `login-photo.png` | mitad izquierda de `images/Login_view.png` | Fondo del login |

Ambos se procesaron antes de usarse:

**El logo** venia como una imagen de 672x675 con fondo casi negro incrustado.
Sobre un header crema eso habria mostrado un rectangulo oscuro. Se recorto a la
marca (135x184) y se hizo transparente el fondo, con transicion suave en los
bordes para que no queden dientes de sierra. El archivo original trae ademas una
franja espuria en el borde superior, que hubo que excluir para que el recorte
detectara la marca real.

**La foto del login** se recorto dejando FUERA las zonas donde el mockup traia
texto dibujado (logo, titular y testimonio). El titular se compone ahora en HTML
sobre la foto. La razon es doble: `object-cover` mutilaba el texto al recortar en
distintos anchos, y un texto dentro de un mapa de bits no lo lee un lector de
pantalla, no se traduce y no escala como tipografia real.

> **Nota de cache**: el optimizador de imagenes de Next indexa por URL. Si se
> reemplaza el contenido de un archivo conservando su nombre, sigue sirviendo la
> version anterior aunque el archivo en disco ya sea otro. Al cambiar una imagen
> hay que renombrarla o borrar `.next/cache/images`.

### 2.6 El header

Color plano **blanco crema** (`--color-cream`, `#f7f4ec`), de ancho completo,
esquinas rectas y sin transparencia ni desenfoque. Es el mismo en tema claro y
oscuro: la barra funciona como elemento constante de la marca en vez de cambiar
de identidad al alternar el tema.

Al ser opaca no necesita `backdrop-filter`, que es un filtro caro de recomponer
en cada scroll.

### 2.7 Elementos distintivos

**La banda ASCII.** Entre el hero y la presentacion del producto hay una franja
con el logotipo "FINOVA" dibujado en arte ASCII y un carrusel horizontal con los
modulos contables, tambien en ASCII. Los modulos contables son, en el fondo, las
columnas de un libro: el arte ASCII cita esa herencia del reporte de ancho fijo.
El logo se genera a partir de una matriz de glifos, de modo que todas las filas
miden exactamente lo mismo.

**Glassmorfismo invertido en el header.** La barra usa fondo translucido,
`backdrop-filter` y un borde claro. El color se invierte con el tema: **naranjo
en claro, blanco en oscuro**, de modo que siempre contrasta con la pagina. Se
gobierna con las variables `--header-*` de `globals.css`.

**Secuencia de procesos en el hero.** Reemplaza a la antigua animacion del F29.
Muestra el flujo completo, de documento a informe, con los pasos encendiendose por
turnos. No muestra cifras a proposito: numeros concretos en una ilustracion de
marketing se leen como datos reales.

**Ventajas sin tarjetas.** Cada ventaja es una palabra en tipografia grande junto
a una maqueta animada de la pantalla correspondiente. Sin iconos genericos: un
icono de reloj o escudo no aporta nada que la palabra no diga mejor.

**Testimonios en vez de acordeon.** Las preguntas frecuentes se presentan como
personas respondiendo dudas concretas. Ver la advertencia en la seccion 6.5.

---

## 3. Archivos

### 3.1 Creados

| Archivo | Tipo | Propósito |
|---|---|---|
| `lib/theme.ts` | módulo | Fuente única de verdad del tema |
| `lib/fonts.ts` | módulo | Carga de tipografías |
| `lib/validation.ts` | módulo | Validadores puros del formulario |
| `components/ui/InlineScript.tsx` | servidor | Inserta scripts pre-hidratación |
| `components/ui/Icon.tsx` | servidor | Registro de 16 iconos SVG |
| `components/ui/SectionShell.tsx` | servidor | Contenedor común de secciones |
| `components/ui/ThemeToggle.tsx` | **cliente** | Botón sol/luna |
| `components/ui/Reveal.tsx` | **cliente** | Revelado al hacer scroll |
| `components/landing/SiteHeader.tsx` | servidor | Barra de navegación |
| `components/landing/HeroSection.tsx` | servidor | Sección principal |
| `components/landing/F29Animation.tsx` | servidor | Animación del formulario |
| `components/landing/AboutSection.tsx` | servidor | "Qué es Finova" |
| `components/landing/FeaturesSection.tsx` | servidor | "Ventajas" |
| `components/landing/PricingSection.tsx` | servidor | "Precios" |
| `components/landing/TrustSection.tsx` | servidor | "Confianza" |
| `components/landing/FaqSection.tsx` | servidor | Preguntas frecuentes |
| `components/landing/CtaSection.tsx` | servidor | Llamado final |
| `components/landing/SiteFooter.tsx` | servidor | Pie de página |
| `components/login/LoginForm.tsx` | **cliente** | Formulario de acceso |
| `app/login/page.tsx` | servidor | Ruta de acceso |
| `docs/LANDING.md` | documento | Este archivo |

### 3.2 Modificados

| Archivo | Cambio |
|---|---|
| `app/layout.tsx` | `lang="es"`, script anti-parpadeo, metadata real, fuentes nuevas |
| `app/globals.css` | Variante `dark` de clase, tokens, keyframes, movimiento reducido |
| `app/page.tsx` | Reemplazo completo por la composición de secciones |
| `next.config.ts` | Cabeceras de seguridad, `poweredByHeader: false` |

### 3.3 Nomenclatura

- **Componentes**: PascalCase, archivo y función con el mismo nombre
  (`SiteHeader.tsx` → `SiteHeader()`).
- **Funciones**: verbo + sustantivo en camelCase (`applyTheme`,
  `resolveStoredTheme`, `validateEmail`, `handleToggle`, `handleSubmit`).
- **Constantes de módulo**: `SCREAMING_SNAKE_CASE` (`THEME_STORAGE_KEY`,
  `MAX_ATTEMPTS`, `PRICING_TIERS`).
- **Tipos**: PascalCase (`Theme`, `IconName`, `ValidationResult`).
- **Booleanos**: prefijo `is`/`has` (`isLockedOut`, `isFeatured`,
  `hasRestoredRef`).
- **Referencias**: sufijo `Ref` (`containerRef`, `attemptCountRef`).

---

## 4. Funciones y componentes principales

### `lib/theme.ts`

| Nombre | Firma | Qué hace |
|---|---|---|
| `Theme` | `"light" \| "dark"` | Los dos únicos temas válidos |
| `applyTheme` | `(theme: Theme) => void` | Aplica la clase en `<html>` y setea `color-scheme` |
| `resolveStoredTheme` | `() => Theme` | Lee localStorage; si no hay valor válido, cae a la preferencia del sistema |
| `prefersDarkScheme` | `() => boolean` | Consulta la preferencia del sistema operativo |
| `THEME_INIT_SCRIPT` | `string` | Script que corre antes del primer paint |

### `lib/validation.ts`

| Nombre | Firma | Qué hace |
|---|---|---|
| `ValidationResult` | unión discriminada | Válido, o inválido con mensaje |
| `validateEmail` | `(raw: string) => ValidationResult` | Valida largo y formato |
| `validatePassword` | `(pw: string) => ValidationResult` | Valida largo mínimo y máximo |

### Componentes con lógica

| Componente | Detalle técnico |
|---|---|
| `ThemeToggle` | Usa `useSyncExternalStore` porque el tema vive en el DOM, no en el árbol de React |
| `Reveal` | `IntersectionObserver` que deja de observar tras el primer disparo |
| `LoginForm` | `useId` para accesibilidad, `useRef` para el contador de intentos |
| `Icon` | `IconName` derivado de las claves del registro: un typo es error de compilación |

---

## 5. Decisiones técnicas que importan

### 5.1 Solo tres componentes de cliente

`ThemeToggle`, `Reveal` y `LoginForm`. Todo lo demás se renderiza en el servidor.

`SiteHeader` **sigue siendo de servidor** aunque contenga el botón de tema:
`"use client"` marca un módulo, no un subárbol. Convertir todo el header en
cliente enviaría su marcado y sus textos al navegador solo para un botón.

Consecuencias prácticas:
- El menú desplegable se evitó: en móvil la landing se recorre con scroll.
- El FAQ usa `<details>/<summary>` nativo, que trae semántica, teclado y lector
  de pantalla gratis. **Funciona con JavaScript desactivado.**
- El header fijo es CSS (`sticky`), sin escuchar el evento de scroll.

### 5.2 El tema no parpadea

El problema: el servidor no puede conocer `localStorage`, así que siempre
renderiza tema claro. Sin intervención, quien usa tema oscuro ve un destello
blanco en cada carga.

La solución, siguiendo la guía oficial de Next.js:

1. Un script en `<head>` corre **durante el parseo del HTML**, antes del primer
   paint. Lee la preferencia y aplica la clase.
2. `suppressHydrationWarning` en `<html>` es **obligatorio**. Sin él, React
   detecta la diferencia entre lo que renderizó y lo que hay en el DOM, la trata
   como error y vuelve a renderizar, descartando la corrección del script.
3. `ThemeToggle` usa `useSyncExternalStore` para leer el tema desde el DOM, que
   es donde realmente vive.
4. Los dos iconos se renderizan siempre y CSS elige cuál se ve, de modo que el
   correcto aparece desde el primer paint.

**Detalle de desarrollo:** el Modo Estricto de React remonta los componentes una
vez y, al hacerlo, borra la clase que puso el script. Por eso `ThemeToggle`
reaplica el tema en un `useLayoutEffect`. Es una operación sin efecto en
producción, pero sin ella el tema se revierte solo en `next dev`.

### 5.3 Tailwind v4

El proyecto usa Tailwind 4 en modo CSS-first: **no hay archivo de configuración**,
todo vive en `app/globals.css`.

Dos líneas críticas:

```css
@custom-variant dark (&:where(.dark, .dark *));
```
Sin esto las utilidades `dark:` siguen al sistema operativo y el botón parece no
hacer nada.

```css
@theme { ... }   /* no @theme inline */
```
`inline` fija los valores en tiempo de compilación y anularía los cambios de
tema en runtime.

### 5.4 Accesibilidad

- Foco visible en todo elemento interactivo.
- `aria-pressed` en los interruptores, `aria-label` en botones sin texto.
- Iconos decorativos ocultos a lectores de pantalla; los informativos llevan
  etiqueta.
- Errores del formulario conectados con `aria-describedby` y anunciados con
  `role="alert"`.
- Etiquetas reales asociadas a cada campo, no marcadores de posición como
  etiqueta.
- **`prefers-reduced-motion` respetado**: quien lo activa ve todo el contenido en
  su estado final, sin animación. `Reveal` además lo comprueba en JavaScript, para
  que el contenido nunca quede invisible.
- La página funciona sin JavaScript: se lee completa, el FAQ se despliega y los
  enlaces de ancla navegan.

---

## 6. Seguridad

Esta sección distingue tres cosas: lo que se implementó, lo que **no puede**
resolverse en esta capa, y lo que corresponde al backend. La distinción importa:
afirmar que una landing estática previene inyección SQL sería falso.

### 6.1 Implementado y verificable

**Cabeceras en `next.config.ts`**, aplicadas a todas las rutas:

| Cabecera | Qué bloquea |
|---|---|
| `Strict-Transport-Security` | Degradación a HTTP e intercepción de la primera petición |
| `X-Frame-Options: DENY` | Clickjacking mediante iframe |
| `X-Content-Type-Options: nosniff` | Que el navegador adivine tipos y ejecute un archivo como script |
| `Referrer-Policy` | Fuga de rutas internas al navegar hacia otro dominio |
| `Permissions-Policy` | Acceso a cámara, micrófono, ubicación, pago y USB |
| `Content-Security-Policy` | Orígenes de scripts, estilos, imágenes y destinos de formularios |

Además `poweredByHeader: false` elimina `X-Powered-By`, que anunciaba el
framework y su versión.

**Higiene del formulario de acceso** (`components/login/LoginForm.tsx`):

- **Sin atributo `action` y con `preventDefault`.** Un formulario sin `action`
  hace GET a la URL actual al enviarse, lo que pondría la contraseña en la barra
  de direcciones, el historial y los registros del servidor.
- **La contraseña solo en estado del componente.** Nunca en `localStorage`,
  `sessionStorage`, cookies ni URL. Se limpia tras un intento fallido.
- **Mensaje de error genérico.** Nunca "ese correo no existe": distinguir los
  casos permitiría enumerar usuarios probando correos.
- **`spellCheck` desactivado** en la contraseña, porque algunos correctores
  envían el texto a un servicio remoto.
- **`autoComplete` correcto**, para no empujar a la gente a contraseñas
  memorizables.
- Longitud máxima en ambos campos, validada antes de aplicar cualquier expresión
  regular.

**Sin secretos en el cliente.** Todo lo que está en `components/` viaja al
navegador. No hay claves, URL de API ni credenciales en ningún archivo.

**Sin `dangerouslySetInnerHTML` sobre datos externos.** El único uso está en
`InlineScript`, y recibe una constante del propio código, sin interpolación.

### 6.2 Lo que esta capa NO puede resolver

**Inyección SQL.** Es un problema de servidor y base de datos. Esta superficie
no tiene base de datos ni emite consultas, así que no es candidata a este
ataque. Cuando llegue el backend NestJS con PostgreSQL, el control real son las
**consultas parametrizadas** (nunca concatenación de cadenas) y usuarios de base
de datos con privilegio mínimo. La validación del formulario en el navegador no
aporta nada contra esto: se salta con las herramientas de desarrollo.

**Denegación de servicio (DDoS).** No se mitiga en código de aplicación. Es
responsabilidad de la infraestructura: la red de borde de Vercel, un WAF y
límites de tasa a nivel de red. Ninguna cantidad de código en el navegador
cambia esto.

**El límite de intentos del formulario es experiencia de usuario, no
seguridad.** Cualquiera lo evita desde las herramientas de desarrollo o enviando
peticiones directamente a la API. Sirve para frenar el reintento a ciegas y para
comunicar que los intentos se cuentan. La defensa real contra fuerza bruta va en
el servidor.

**Autenticación, sesiones y CSRF** son concerns del backend. El formulario de
esta entrega es un esquema visual sin lógica de autenticación, tal como se pidió.

### 6.3 Pendiente para la fase de backend

Corresponde a la épica **06 Auditoría, Trazabilidad y Seguridad** del proyecto:

- Consultas parametrizadas en todo acceso a datos.
- Límite de tasa por IP y por cuenta, con retroceso exponencial.
- Hashing de contraseñas con bcrypt o argon2, nunca almacenamiento reversible.
- Cookies de sesión `httpOnly`, `Secure` y `SameSite`.
- Tokens CSRF en operaciones que modifican estado.
- Aislamiento multi-tenant verificado en cada consulta, no solo en la interfaz.
- Registro de auditoría de operaciones sensibles.
- Validación en el servidor de todo lo que valida el cliente, tratando cada campo
  como entrada hostil.

### 6.4 Contenido que DEBE reemplazarse antes de publicar

Tres bloques de la landing contienen material provisional. Publicarlos tal cual
seria enganoso, y en el caso de los testimonios, una practica sancionable en
materia de publicidad.

| Donde | Que hay ahora | Que hacer antes de lanzar |
|---|---|---|
| Seccion de preguntas | **Seis testimonios de personas ficticias** con nombre y cargo | Reemplazar por testimonios reales con autorizacion escrita, o eliminar la seccion |
| Pie de pagina | Correo `contacto@finova.cl` y direccion generica | Poner los datos de contacto reales |
| Pie de pagina | Cuatro documentos legales marcados "(pronto)" | Redactar las paginas y convertir el texto en enlaces |
| Seccion de precios | Valores referenciales | Confirmar los precios definitivos |

Los tres primeros ya llevan una declaracion visible en la propia pagina, de modo
que nadie pueda confundirlos con informacion real mientras tanto. Esa declaracion
es un parche temporal, no una solucion: el contenido hay que reemplazarlo.

Sobre los testimonios en particular: se eligieron iniciales sobre un color de la
paleta en lugar de fotografias, precisamente para no usar la imagen de personas
que no dieron su consentimiento.

### 6.5 Una tensión declarada: CSP y el script de tema

La política incluye `'unsafe-inline'` en `script-src`. Es una concesión
consciente: el script anti-parpadeo es inline por necesidad, y una política
estricta lo bloquearía devolviendo el parpadeo.

El riesgo aquí es bajo —la landing no tiene base de datos, no acepta contenido de
terceros y no renderiza entrada de usuario— pero conviene saberlo. El
endurecimiento posible es usar el hash SHA-256 del script, a cambio de tener que
regenerarlo cada vez que cambie, con fallo silencioso si alguien lo olvida.

**`unsafe-eval`, solo en desarrollo.** React necesita `eval()` en modo desarrollo
para reconstruir las trazas de error entre servidor y navegador; sin él, la
consola pierde utilidad al depurar. La política lo agrega únicamente cuando
`NODE_ENV === "development"`. En producción React nunca usa `eval()`, así que la
cabecera queda estricta:

```
# desarrollo:  script-src 'self' 'unsafe-inline' 'unsafe-eval'
# producción:  script-src 'self' 'unsafe-inline'
```

Verificado en ambos modos con `curl -sI`.

---

## 7. Cómo verificar

```bash
npx tsc --noEmit     # tipos, en modo estricto
npm run lint         # reglas de React y Next
npm run build        # / y /login deben quedar estáticas (○)
npm run dev
```

Comprobaciones manuales:

| Qué | Cómo | Resultado esperado |
|---|---|---|
| Sin parpadeo | Tema oscuro, red lenta, recarga dura | Cero destello blanco |
| Persistencia | Cambiar tema, recargar | Se mantiene |
| Preferencia del sistema | Borrar localStorage, recargar | Sigue al sistema operativo |
| Movimiento reducido | Emular `prefers-reduced-motion` | Todo visible, sin animación |
| Sin JavaScript | Desactivarlo | Contenido legible, FAQ funcional |
| Cabeceras | `curl -I http://localhost:3000/` | Las 6 presentes, sin `X-Powered-By` |
| Teclado | Tabular por la página | Foco visible siempre |
| Responsive | 390, 768 y 1440 px | Sin scroll horizontal |

---

## 8. Notas para quien continúe

- **Las rutas tipadas de Next 16** validan `href` contra las rutas que existen.
  Un enlace a una ruta inexistente es error de compilación, no un 404 en
  ejecución. Al agregar una ruta nueva, crear el archivo antes de enlazarla.
- **`middleware.ts` no existe en Next 16**: se renombró a `proxy.ts`. Aquí no se
  usa ninguno de los dos, porque las cabeceras estáticas en `next.config.ts` no
  requieren renderizado dinámico.
- **Los elementos de un grid tienen `min-width: auto`** y no se encogen bajo el
  ancho de su contenido. Si aparece scroll horizontal, casi siempre falta un
  `min-w-0` en un hijo de grid o flex.
- **Los precios son referenciales** y así se declara en la propia sección. Hay
  que confirmarlos antes de cualquier lanzamiento.
