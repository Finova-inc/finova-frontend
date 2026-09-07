@AGENTS.md
Contexto Finova
Qué es

Finova es un SaaS de contabilidad y automatización de procesos financieros con IA, orientado a contadores, PYMEs y grandes empresas. Centraliza en una sola plataforma la gestión contable-tributaria: importación automática de compras, ventas y Documentos Tributarios Electrónicos (DTE) desde el Servicio de Impuestos Internos (SII) de Chile, generación de una propuesta de Formulario 29, y un "copiloto tributario" de IA que detecta errores o inconsistencias antes de declarar.

Es simultáneamente el proyecto Capstone (APT) universitario del equipo (carrera Ingeniería en Informática, sede Plaza Vespucio) y una idea de emprendimiento real, nacida de una propuesta de Pedro Ahumada a Vicente San Martín en octubre 2025.

Equipo (Squad)
Pedro Ahumada — Product Owner / Lógica de Backend. También asume rol de QA/Tester (diseño y ejecución de pruebas funcionales/unitarias con Jest).
Nicolás Sazo — Scrum Master / Arquitectura de Base de Datos. Modela y administra el esquema relacional en PostgreSQL.
Vicente San Martín — Development Team / Frontend e Integración. Desarrolla interfaces en Next.js, integra servicios externos (APIs, OCR) y articula la interacción visual con el modelo de IA.
Alcance del MVP

Dentro de alcance: gestión de usuarios y empresas; importación y administración de DTE; compras y ventas; períodos contables; Core Contable; reglas tributarias; propuesta/simulación del Formulario 29; asistente de IA; alertas; roles, seguridad, auditoría y trazabilidad.

Fuera de alcance: presentación automática de declaraciones ante el SII; pago de impuestos; Formulario 22; contabilidad financiera completa; remuneraciones; inventario; conciliación bancaria avanzada; ERP completo; reemplazo del contador mediante IA.

Stack tecnológico
Frontend: Next.js (React) + TypeScript, SSR/edge para SEO y velocidad.
Backend: NestJS (Node.js), arquitectura modular (facturación, remuneraciones, tesorería, etc. como módulos independientes).
Base de datos: PostgreSQL (transacciones ACID, integridad referencial, precisión numérica para montos) + Redis (cache, colas de trabajo, sesiones).
IA: OCR especializado para boletas/facturas/DTE (extracción de montos, fechas, RUT) + LLM de propósito general para chatbot de soporte y sugerencias.
Infraestructura: Vercel (edge + serverless, CDN global, CI/CD automatizado, monitoreo y logs).
Seguridad: autenticación JWT/OAuth2, cifrado en tránsito y en reposo, aislamiento multi-tenant.
Integración SII: módulo propio en el backend para emisión de DTE y envío de libros de compra/venta, aislado del resto de la lógica contable.
Módulos contables centralizados

Configuración y Core, Plan de Cuentas, Asientos Contables, Libro Diario y Mayor, Períodos, Balance de Comprobación, Balance General 8 Columnas, Balances Tributarios, Libro de Compra, Libro de Venta, Libros Auxiliares SII, Centros de Costo (con sus grupos e informes de movimientos), Formulario 29, Ingesta OCR de DTE, Asistente de IA, Chatbot de Soporte, Auditoría Continua, Detección de Anomalías.

Actores clave (stakeholder map)
SII (Servicio de Impuestos Internos): alto poder e interés — mantener satisfecho.
Proveedores de infraestructura (Vercel, LLM): monitorear.
Sponsors (Finova Networks SpA): gestionar de cerca.
Contador tributario (usuario final): mantener informado.
Metas de negocio (Product Vision Board v1.0, responsable Pedro Ahumada)
60 usuarios activos mensuales en 6 meses.
98% de éxito en sincronización con el SII en 4 meses.
85% de retención mensual en 8 meses.
1 contrato corporativo firmado en 18 meses.
Metodología y gestión

El equipo usa Scrumban. Existe un kit de plantillas (Análisis del Caso, Squad y Matriz RACI, Épicas, Historias de Usuario, Product Backlog, etc.) y un checklist de entregables por fase (Fase 1, 2, 3) que distingue metodología ágil vs. tradicional. El Product Backlog priorizado y el Sprint Backlog se gestionan en Jira (proyecto KAN — "Finova: El futuro", sitio pedrojahumadaf.atlassian.net), con 6 épicas definidas: 01 Gestión del Core Contable, 02 Motor Tributario y Propuesta F29, 03 Ingesta y Gestión de Documentos Tributarios, 04 Gestión de Usuarios y Empresas, 05 Copiloto Tributario con IA, 06 Auditoría, Trazabilidad y Seguridad. El Modelo Relacional Normalizado y los Diagramas de Arquitectura (componentes y despliegue) son entregables técnicos de Fase 1 aún en curso.

Notas

Este contexto se extrajo de la carpeta de Google Drive "Finova Capstone" (documento de propuesta, guía APT, Product Vision Board, Matriz RACI, Stack Tecnológico, Mapa de Actores, Mapa Mental) y del proyecto KAN en Jira, el 2026-08-29. Si algo cambia (stack, alcance, metas, equipo), actualiza esta skill en lugar de asumir que sigue vigente indefinidamente.