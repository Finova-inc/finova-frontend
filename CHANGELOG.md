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

### Seguridad
- Auditoría: toda llamada al backend con sesión (`lib/api.ts`) lleva ahora la IP real del visitante firmada (`x-finova-ip`, la misma cabecera y el mismo secreto `IP_FIRMA_SECRETO` que ya usaban el login y la recuperación). Así la auditoría del backend guarda la IP del visitante y no la de salida de Vercel. Sin secreto, o fuera de una petición de Next, la llamada sale sin la cabecera y el backend usa la IP de la conexión. No hay variables de entorno nuevas (FIN-xx pendiente).

### Agregado
- Copiloto: botón con el ícono de la IA en la cabecera del panel, junto al cambio de tema, con un halo muy tenue en los colores del copiloto que respira (quieto con «reducir movimiento»). Abre el copiloto anclado al costado y, si ya está así, lo cierra. Muestra el número de avisos y el punto de respuesta nueva que antes tenía el botón redondo. No se dibuja en el módulo del copiloto (FIN-xx pendiente).
- Copiloto anclado: sin la barra de botones sobre la conversación. Sus opciones (Nueva, Flotante, Ampliar, Cerrar, cada una con ícono y nombre) van en un menú discreto «⋯» dentro del tablero donde se escribe, con flechas y Escape (`MenuCopiloto.tsx`). Flotante y en el celular conserva su cabecera (FIN-xx pendiente).
- Copiloto anclado: el borde izquierdo es un divisor que se arrastra para repartir el espacio entre la pantalla de trabajo y el chat (también con las flechas del teclado, con el foco en el divisor). El chat va desde 380 px hasta el borde del menú de módulos, también si la ventana se achica después. Doble clic vuelve a llenar el espacio libre. El ancho se guarda en la cookie `finova_copiloto_ancho` y la pantalla se dibuja ya con él. Lógica en `lib/ancho-copiloto.ts` (FIN-xx pendiente).
- Copiloto: el botón del copiloto muestra cuántos avisos tiene la empresa (F29 por vencer en 7 días o menos, documentos del SII por contabilizar, borradores por revisar, mes sin abrir) hasta que se abre el chat, que los sugiere como preguntas. Las alertas de «Lo urgente» del inicio traen «Preguntar», que abre el copiloto con la pregunta armada. Lógica en `lib/copiloto.ts` (`f29PorVencer`, `contarAvisos`) (FIN-xx pendiente).
- Barra de búsqueda en la cabecera del panel (desde 640 px de ancho). Mientras se escribe muestra asientos, borradores, terceros, cuentas y documentos del SII que coinciden, agrupados y hasta 5 por tipo, sin que importen tildes ni mayúsculas; espera una pausa de 250 ms y cancela la consulta anterior. Flechas, Enter y Escape para moverse; Ctrl+K (⌘K) lleva a la barra. Con la barra vacía muestra los 8 últimos resultados abiertos (recientes), guardados solo en el navegador por usuario y empresa y borrados al cerrar sesión. Lo que coincide se marca en amarillo, también sin tildes; el resaltado del plan de cuentas pasa a `components/ui/Resaltado.tsx` y lo usan los dos. Puente `GET /api/busqueda` y lógica en `lib/busqueda.ts` (FIN-xx pendiente).
- Auditoría: `/dashboard/auditoria` deja de ser «Próximamente» y muestra quién hizo qué y cuándo en la empresa: tabla paginada (fecha y hora en horario de Chile, persona, acción, registro afectado e IP) con filtros por rango de fechas, persona, acción y tipo de registro, que quedan en la URL. «Ver detalle» abre el evento (`?evento=`), dibujado en el servidor, con quién, cuándo, IP, navegador y los cambios «campo: antes → después». La ven el administrador y el contador (`ROLES_QUE_AUDITAN` en `lib/roles.ts`); a consulta la página le responde como una ruta que no existe. La columna y el dato «IP» (y el «Navegador» del detalle) solo se dibujan para el administrador (`ROLES_QUE_VEN_IP`); al contador el backend se los manda en `null`. El filtro «Persona» y los nombres del detalle («Creado por», «Cerrado por»…) salen de `GET /auditoria/personas`, así que funcionan igual para administrador y contador (quien ya no tiene acceso también figura; sin nombre se muestra «Persona sin nombre»). El correo bajo el nombre solo se muestra al administrador (`ROLES_QUE_VEN_CORREO`): al contador el backend se lo manda en `null` y no se dibuja. Los enlaces al detalle y a los registros no se precargan, porque el backend deja registrado cada detalle que se abre (FIN-xx pendiente).
- `formatearFechaHoraChile` en `lib/formato.ts`: fecha y hora de un instante en horario de Chile, sin depender de la zona del servidor (FIN-xx pendiente).
- Copiloto IA: al marcar una respuesta como no útil se envía también la pregunta; el backend la guarda sin RUT por 90 días. `/dashboard/interno/ia` lista esas preguntas del mes, sin usuario ni empresa, con lo que consultó el copiloto. Requiere el backend con `pregunta` en `POST /copiloto/valoracion` y la migración `CopilotoUsoPregunta` (FIN-xx pendiente).
- Panel: el menú lateral se pliega a una franja de íconos desde 1024 px (botón al pie del menú o `Ctrl+B`), para dar espacio en pantallas chicas. La preferencia se guarda en una cookie y la pantalla se dibuja ya plegada (FIN-xx pendiente).
- Copiloto IA: se puede anclar como columna a la derecha que llena el espacio libre junto al contenido (también el que deja el menú plegado) y lo empuja en vez de taparlo. Un botón en la cabecera del chat vuelve a flotante y la elección se guarda en una cookie. Bajo 1024 px sigue flotante (FIN-xx pendiente).
- Copiloto IA: al seleccionar texto en una pantalla del panel aparece «Preguntar al copiloto». El texto queda adjunto en el chat con preguntas listas («Explícame esto», «¿Está bien?», «¿Qué hago con esto?») y viaja como `seleccion`; el backend cambia los RUT por `[RUT]` antes del modelo. Requiere el backend con `seleccion` en `POST /copiloto/chat` (FIN-xx pendiente).

- Copiloto IA (beta): botón flotante en todas las pantallas del panel que abre un chat. Responde en streaming preguntas sobre saldos, libro mayor, balance y asientos de la empresa activa, con preguntas sugeridas, botón Detener y formato simple (negrita y listas). La conversación se mantiene al navegar y empieza de cero al cambiar de empresa. Reemplaza la pantalla «Próximamente» de `/dashboard/copiloto`. El navegador le habla a `/api/copiloto/chat`, que agrega el token desde la cookie y reenvía la respuesta del backend (FIN-xx pendiente).
- `/dashboard/interno/ia`: página interna de costos de IA para el equipo Finova (gasto del mes en dólares y pesos, proyección contra presupuesto, gasto por día, cómo terminan las respuestas, topes, herramientas, empresas y usuarios anónimos que más gastan, y un simulador por usuarios y precio). No está en el menú ni se indexa; a quien no es del equipo le muestra el 404 del panel (FIN-xx pendiente).
- Copiloto IA: la conversación se guarda en el navegador (hasta 7 días, por usuario y empresa) y vuelve al recargar; se borra con «Nueva conversación» y al cerrar sesión. El chat le cuenta al copiloto qué pantalla está abierta («Viendo: el libro mayor · cuenta 1101 Caja»), sugiere preguntas según la pantalla, avisa cuántas preguntas quedan hoy y permite marcar cada respuesta como útil o no útil (FIN-xx pendiente).
- Copiloto IA: si se le pide registrar un asiento, muestra la propuesta en el chat con «Llenar el formulario», que abre el nuevo asiento ya llenado y avisa que lo armó el copiloto. Guardar sigue siendo de la persona (FIN-xx pendiente).
- Copiloto IA: botones «Explicar» en los movimientos del libro mayor, en las cuentas del balance, en el aviso de balance descuadrado y en lo que falta para contabilizar un asiento: abren el chat con la pregunta ya armada (FIN-xx pendiente).
- Copiloto IA: los comprobantes citados («T-15») llevan al detalle del asiento, y las tablas de las respuestas se ven como tabla, con desplazamiento propio y «Descargar CSV» (FIN-xx pendiente).
- Copiloto IA: Ctrl+J (Cmd+J en Mac) abre y cierra el chat desde cualquier pantalla (FIN-xx pendiente).
- Copiloto IA: preguntas sugeridas según el estado de la empresa («Tengo 3 borradores sin cuadrar…», mes en curso sin abrir) (FIN-xx pendiente).
- Costos de IA: la página interna muestra, por herramienta, cuántas respuestas fueron útiles y cuántas no (FIN-xx pendiente).
- Costos de IA: la página interna muestra las valoraciones de las respuestas, y el simulador calcula el perfil «Máximo» con los tokens que cuentan para el tope (FIN-xx pendiente).

### Eliminado
- Copiloto: el botón redondo de la esquina inferior derecha. Ahora se abre desde el botón de la cabecera o con Ctrl+J, y el contenido del panel ya no reserva espacio abajo para él (FIN-xx pendiente).

### Dependencias del backend
- Los avisos de F29 y documentos del copiloto necesitan `GET /copiloto/avisos` con `f29` y `documentos_por_contabilizar` (finova-backend, rama `feat/busqueda-global`); sin ellos, el botón cuenta solo borradores y mes sin abrir.
- La barra de búsqueda necesita `GET /busqueda` (finova-backend, rama `feat/busqueda-global`): despliega el backend primero.
- `GET /auditoria` y `GET /auditoria/:id_auditoria` (administrador y contador; consulta recibe 403; la IP y el navegador solo llegan al administrador). Además `GET /auditoria/personas` (administrador y contador; consulta recibe 403) para el filtro «Persona» y los nombres del detalle, y el correo (`usuario_correo`) solo llega al administrador. El backend los despliega primero (FIN-xx pendiente).
- `GET /copiloto/avisos` y los eventos `enlaces` y `propuesta_asiento` del chat. Sin ellos el chat sigue funcionando, sin sugerencias por avisos, enlaces ni propuestas.
- `GET /copiloto/metricas` (responde solo a los RUT de `FINOVA_EQUIPO_RUTS`).
- `GET /copiloto/estado` y `POST /copiloto/valoracion`. `POST /copiloto/chat` debe aceptar `pantalla` y un historial de 20 mensajes: el backend se despliega primero, porque el anterior rechaza esos campos con 400.
- `POST /copiloto/chat` (módulo `copiloto` del backend, con `ANTHROPIC_API_KEY` configurada).

### Cambiado
- Menú lateral en modo claro: pasa de casi negro a papel sombreado (`--color-bone`) con un filo a la derecha, y la opción activa en naranjo oscuro. En modo oscuro no cambia. Tokens nuevos `--sidebar-borde`, `--sidebar-activo-ink` y `--sidebar-activo-bg` (FIN-xx pendiente).
- Auditoría: el detalle de un evento ya no muestra «vacío → pasó a vacío» (en las eliminaciones), no pone «Sin detalle de cambios» sobre los datos de una creación, cambia el uuid de «Creado por», «Cerrado por» y similares por el nombre del miembro de la empresa, nombra «Empresa nueva» y otras claves que salían crudas, y resume las listas («3 elementos») en vez de cortar su JSON (FIN-xx pendiente).
- Panel: el enlace «Auditoría» del menú lateral solo se muestra a quien puede verla (administrador y contador); el layout le entrega el rol del token al menú (FIN-xx pendiente).
- Copiloto IA: paleta derivada de la del panel en cada tema, para que combine: en claro suma el crema de la marca y en oscuro es negro, con un resplandor naranjo y lila de la marca y el borde de la columna anclada en naranjo. El flotante lleva una línea de color arriba; anclado no tiene cabecera propia y queda bajo la del panel (FIN-xx pendiente).
- Copiloto IA: «Copiloto IA» en el menú abre el módulo `/dashboard/copiloto`, con el chat a pantalla completa; el botón redondo sigue abriendo el chat chico en las demás pantallas, con un botón para pasar al módulo. Los dos comparten la conversación. El tablero para escribir es de vidrio y flota sobre los mensajes (FIN-xx pendiente).
- Copiloto IA: muestra «Revisando los períodos…» y «Revisando los borradores…» cuando consulta esos datos, y la página de costos nombra esas herramientas (FIN-xx pendiente).
- Copiloto IA: el borrador y el detalle de un asiento le dicen al copiloto cuál está abierto («Viendo: el borrador · borrador «Pago luz»»), y el formulario de asiento y los borradores tienen sus propias preguntas sugeridas (FIN-xx pendiente).
- Copiloto IA: el historial que acompaña a cada pregunta se recorta por bloques de 10 mensajes (viajan entre 10 y 19) y con un presupuesto de 24.000 caracteres, para que el modelo reutilice su caché en conversaciones largas (FIN-xx pendiente).
- Tipografía: los titulares del panel y de la landing, y la serifa del hero, usan Newsreader (antes Space Grotesk e Instrument Serif). El cuerpo sigue en Inter (FIN-xx pendiente).
- Documentación para el equipo: `docs/HERRAMIENTAS-CLAUDE.md` (plugins y skills personales con su instalación y uso en Finova) y `.claude/settings.json` declara los plugins `superpowers` y `claude-mem` para que Claude Code los ofrezca al abrir el repo (FIN-xx pendiente).
- Herramientas de Claude para el equipo: el plugin `ponytail` (cambios mínimos, sin sobreingeniería) pasa a recomendado y queda declarado en `.claude/settings.json` junto a `superpowers` y `claude-mem`. `CLAUDE.md` aclara que las reglas del repo mandan sobre él (FIN-xx pendiente).

### Corregido
- Panel, Documentos y F29: los montos de las tarjetas de cifras ya no se salen de la tarjeta en pantallas medianas (1366×768) ni con el copiloto anclado. La cifra se achica con el ancho de su tarjeta y las columnas (4, 2 o 1) dependen del espacio disponible, no del ancho de la pantalla (FIN-xx pendiente).
- Auditoría: una página más allá de la última (`?pagina=500`) mostraba la tabla vacía con el pie «151–150 de 138»; ahora redirige a la última página con los mismos filtros, sin el detalle abierto. La página que se pide al backend se limita a 1.000.000, su tope (FIN-xx pendiente).

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
