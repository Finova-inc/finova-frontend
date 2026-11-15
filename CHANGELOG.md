# Changelog — finova-frontend

Todos los cambios relevantes del frontend se registran aquí. Formato basado en
[Keep a Changelog](https://keepachangelog.com/es-ES/1.1.0/).

**Cómo mantenerlo:** cada PR que cambie comportamiento agrega su línea en
`[Sin publicar]`, en la categoría que corresponda, con el ticket (`FIN-xx`).
Al hacer merge de `development` a `main`, ese bloque pasa a una sección con la
fecha y el número del PR. Categorías: **Agregado**, **Cambiado**, **Corregido**,
**Eliminado**, **Seguridad**. Si hay variables de entorno nuevas o cambios que
dependen del backend, se anotan en su propio apartado.

## [Sin publicar]

### Agregado
- Copiloto IA (beta): botón flotante en todas las pantallas del panel que abre un chat (también desde «Copiloto IA» en el menú). Responde en streaming preguntas sobre saldos, libro mayor, balance y asientos de la empresa activa, con preguntas sugeridas, botón Detener y formato simple (negrita y listas). La conversación se mantiene al navegar y empieza de cero al cambiar de empresa. Reemplaza la pantalla «Próximamente» de `/dashboard/copiloto`, que se elimina. El navegador le habla a `/api/copiloto/chat`, que agrega el token desde la cookie y reenvía la respuesta del backend (FIN-xx pendiente).
- `/dashboard/interno/ia`: página interna de costos de IA para el equipo Finova (gasto del mes en dólares y pesos, proyección contra presupuesto, gasto por día, cómo terminan las respuestas, topes, herramientas, empresas y usuarios anónimos que más gastan, y un simulador por usuarios y precio). No está en el menú ni se indexa; a quien no es del equipo le muestra el 404 del panel (FIN-xx pendiente).

### Dependencias del backend
- `GET /copiloto/metricas` (responde solo a los RUT de `FINOVA_EQUIPO_RUTS`).
- `POST /copiloto/chat` (módulo `copiloto` del backend, con `ANTHROPIC_API_KEY` configurada).

### Cambiado
- Documentación para el equipo: `docs/HERRAMIENTAS-CLAUDE.md` (plugins y skills personales con su instalación y uso en Finova) y `.claude/settings.json` declara los plugins `superpowers` y `claude-mem` para que Claude Code los ofrezca al abrir el repo (FIN-xx pendiente).

## 2026-11-04 — PR #13

### Agregado
- Pantallas propias de error y 404, con el nombre de cada vista (`lib/vistas.ts`); también rutas inventadas dentro del panel.
- Importación de reportes del SII en Excel, con validación de la extensión al elegir el archivo (FIN-95).
- "Por contabilizar" integrado en el panel de control (FIN-97).
- Alerta de vencimiento del F29 en el panel, con severidad según los días que faltan o si ya venció (FIN-90).
- Confirmación fuerte al eliminar una empresa, validada también en el servidor (FIN-91).
- Períodos: leyenda de estados, resumen completo y marca de plazo F29 vencido (FIN-89).
- Envío de la IP real del visitante, firmada, para que el backend limite intentos por persona (FIN-98).

### Cambiado
- Las lecturas (GET) y el login se reintentan con espera creciente ante 0/502/503/504; los `loading` avisan a los 10 s que el servicio está despertando (FIN-84).
- Menú lateral colapsable y tablas que caben en pantallas chicas (FIN-88).

### Corregido
- Montos negativos se muestran como "-$100"; aviso de saldo negativo en Por cobrar (FIN-86).
- El libro mayor oculta del desplegable las cuentas inactivas sin movimientos (FIN-87).
- Copiloto IA y Auditoría muestran "Próximamente" sin notas internas (FIN-85).

### Eliminado
- `app/dashboard/core-contable/error.tsx`: ahora lo cubre `app/dashboard/error.tsx`.

### Variables de entorno
- `IP_FIRMA_SECRETO` (solo servidor, el mismo valor que en el backend).

## 2026-11-03 — PR #12

### Agregado
- Recuperación de contraseña por correo: páginas `/recuperar` y `/restablecer` (FIN-96).
- F29: sugerencia de las UTM para el reajuste del remanente (FIN-94).
- Aviso en el panel de los documentos del SII por contabilizar (FIN-97).

### Cambiado
- Mensajes claros al subir archivos del SII (FIN-95).

### Seguridad
- Cerrar sesión revoca el token en el backend; aviso en el login cuando la sesión expira (FIN-30).

### Depende del backend
- Requiere backend PR #11 (recuperación, UTM y revocación de tokens).

## 2026-10-30 — PR #11

### Agregado
- Módulo Balance y notas a los EEFF, analítica, revertir desde el libro diario e importador con origen SII.

### Seguridad
- Se cierra la redirección abierta del login; diagrama de despliegue actualizado.

---

Para lo anterior al 30-oct-2026: `git log --first-parent main`.
