---
paths:
  - "proxy.ts"
  - "next.config.ts"
  - "lib/session.ts"
  - "lib/api.ts"
  - "lib/ip-*.ts"
  - "lib/navegacion.ts"
  - "lib/csv.ts"
  - "lib/recuperacion.ts"
  - "lib/cierre-sesion.ts"
  - "app/api/**"
  - "app/**/actions.ts"
  - "app/**/acciones-*.ts"
  - "app/**/route.ts"
  - "app/login/**"
  - "app/recuperar/**"
  - "app/restablecer/**"
  - "components/ui/InlineScript.tsx"
  - "components/login/**"
---

# Seguridad (frontend)

Controles que existen y no se deben debilitar sin discutirlo con el equipo:

- **Sesión:**
  - El JWT vive solo en la cookie `finova_session`: `httpOnly`, `sameSite: lax`, `secure` en producción, 24 h. Sus opciones están en `lib/session.ts`.
  - Nunca va en el cuerpo de una respuesta ni en `localStorage`, ni llega al JavaScript del navegador.
  - `obtenerEmpresaDelToken()` y `obtenerRolDelToken()` decodifican el JWT **sin verificar la firma**: sirven solo para presentación, nunca para decidir permisos.
- **`proxy.ts`** solo verifica que exista la cookie en `/dashboard/*`. Es experiencia de usuario, no seguridad: cada página y acción llama a `exigirTokenSesion()`, y el backend valida el token.
- **Cerrar sesión:** el route handler de logout borra la cookie y pide al backend revocar el token. Si cambias opciones de la cookie, cámbialas en todos los lugares que la escriben o borran (`login/route.ts`, `logout/route.ts`, `acciones-empresa.ts`).
- **Redirecciones:** todo destino que venga de la URL pasa por `destinoTrasLogin` (`lib/navegacion.ts`), que exige el mismo origen. No construyas `redirect()` ni `router.replace` con texto del usuario sin validar.
- **Renderizado:** React escapa el texto. No uses `dangerouslySetInnerHTML` con datos: el único uso es `components/ui/InlineScript.tsx`, con un script constante. Los `href` y `src` armados con datos llevan un prefijo fijo interno y valores codificados.
- **CSV:** toda exportación pasa por `celdaCsv` y `filasACsv` (`lib/csv.ts`), que neutralizan fórmulas de planilla. Un exportador nuevo no arma el CSV a mano.
- **Cabeceras y CSP** en `next.config.ts`: `frame-ancestors 'none'`, `form-action 'self'`, `base-uri 'self'`, HSTS y `nosniff`. Si agregas un origen externo, va en la directiva exacta, nunca un comodín. `script-src` permite `'unsafe-inline'` por el script anti-parpadeo del tema; la justificación está en el archivo.
- **IP del visitante:** se firma con HMAC (`lib/ip-firmada.ts`) y se envía en `x-finova-ip`, solo en login, recuperar y restablecer. `IP_FIRMA_SECRETO` es solo de servidor: nunca con prefijo `NEXT_PUBLIC_`.
- **Secretos:** solo en variables de servidor. Todo lo que empieza con `NEXT_PUBLIC_` termina en el bundle del navegador.
- **Archivos del SII:** el frontend revisa tipo, extensión y tamaño solo por comodidad. El control real está en el backend.

*Auditoría de seguridad de noviembre de 2026 en curso: cuando cierre, sus hallazgos y lecciones se agregan a este archivo.*
