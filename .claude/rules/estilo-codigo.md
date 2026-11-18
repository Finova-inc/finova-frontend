---
paths:
  - "app/**"
  - "components/**"
  - "lib/**"
  - "proxy.ts"
  - "next.config.ts"
---

# Estilo de código (frontend)

- **TypeScript estricto.** El alias `@/*` apunta a la raíz del repo, no a `src/`. Indentación de 4 espacios y comillas dobles, como el código existente. eslint con los presets de Next (`eslint.config.mjs`).
- **Nombres del dominio en español:** `FormularioAsiento`, `exigirTokenSesion`, `traducirError`, `puedeRegistrar`.
- **Sin librerías de UI, estado ni formularios.** Es una decisión del equipo, no un descuido.
  - Componentes base: `components/ui/` (`Boton`, `Etiqueta` con su tono `demo`, `Panel`, `Barra`, `SectionShell`, `MensajeDeEstado`).
  - Íconos: el sprite de `components/ui/Icon.tsx`; se rechazó `lucide-react` a propósito.
  - Gráficos: SVG dibujado a mano, porque la CSP bloquea CDNs.
  - Tablas: `<table>` HTML.
- **Tailwind 4** con tokens en `app/globals.css`. Trampa de Lightning CSS: si `-webkit-backdrop-filter` va después de `backdrop-filter`, se descarta la versión sin prefijo y Chrome queda sin desenfoque. Declara siempre el prefijo primero.
- **Animaciones** solo de propiedades que compone la GPU (`opacity`, `transform`, `translate`, `scale`). Nunca `clip-path`, `mask` ni `width`, y nunca `transform` sobre un `<svg>`: se anima un `span` envoltorio. Con "reducir movimiento" todo aparece en su estado final.
- **Fechas, montos y RUT** se formatean con `lib/formato.ts` (`formatearCLP`, `formatearFecha`, `formatearRut`, `hoyEnChile`), no a mano.
- **Lógica pura** (cálculos, validaciones, armado de URLs y CSV) va en `lib/`, con su `*.test.mjs`. Así se prueba sin navegador.
- **Comentarios:** explican el porqué, no el qué. Si cambias una decisión documentada en un comentario, actualízalo.
