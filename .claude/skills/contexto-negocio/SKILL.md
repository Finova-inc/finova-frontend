---
name: contexto-negocio
description: Contexto de producto y equipo de Finova (qué es, alcance del MVP, actores, metas, épicas de Jira, metodología). Úsala cuando la tarea toque decisiones de producto, alcance, prioridades, textos para usuarios o cuando haga falta saber quién hace qué en el equipo.
---

# Finova: producto y equipo

*Visión de producto, no descripción del código. Para saber qué existe hoy, manda el código y el `CLAUDE.md` de cada repo. Si algo cambió (alcance, equipo, metas), actualiza este archivo en ambos repos.*

## Qué es
SaaS de contabilidad y automatización tributaria para el mercado chileno: contadores, PYMEs y, a futuro, empresas grandes. Busca:
- importar compras, ventas y Documentos Tributarios Electrónicos (DTE) del Servicio de Impuestos Internos (SII);
- contabilizarlos;
- proponer el Formulario 29;
- a futuro, un copiloto de IA que detecte errores antes de declarar.

Es a la vez el proyecto Capstone (APT) del equipo (Ingeniería en Informática, sede Plaza Vespucio) y un emprendimiento real. Nació de una propuesta de Pedro Ahumada a Vicente San Martín en octubre de 2025.

## Equipo (Scrumban)
| Persona | Rol |
|---|---|
| Pedro Ahumada | Product Owner · lógica de backend · QA (Jest) |
| Nicolás Sazo | Scrum Master · arquitectura de base de datos (PostgreSQL) |
| Vicente San Martín | Desarrollo frontend e integración (Next.js) |

El backlog está en Jira, proyecto **KAN** ("Finova: El futuro"). Los tickets se citan como `FIN-xx`. Épicas:
1. Core Contable.
2. Motor Tributario y Propuesta F29.
3. Ingesta y Gestión de DTE.
4. Usuarios y Empresas.
5. Copiloto Tributario con IA.
6. Auditoría, Trazabilidad y Seguridad.

## Alcance del MVP
**Dentro:**
- usuarios y empresas con roles;
- importación de DTE, compras y ventas;
- períodos contables y core contable (plan de cuentas, asientos, libros diario y mayor, balances);
- reglas tributarias y propuesta del F29;
- asistente de IA y alertas;
- seguridad, auditoría y trazabilidad.

**Fuera:**
- presentar o pagar declaraciones ante el SII;
- Formulario 22;
- contabilidad financiera completa;
- remuneraciones, inventario y conciliación bancaria avanzada;
- ERP completo;
- reemplazar al contador.

## Actores
| Actor | Peso | Estrategia |
|---|---|---|
| SII | Alto poder e interés | Mantener satisfecho |
| Proveedores de infraestructura (Vercel, Render, Neon, LLM) | — | Monitorear |
| Sponsor (Finova Networks SpA) | — | Gestionar de cerca |
| Contador tributario, el usuario final | — | Mantener informado |

## Metas (Product Vision Board v1.0)
- 60 usuarios activos mensuales en 6 meses.
- 98 % de éxito en la sincronización con el SII en 4 meses.
- 85 % de retención mensual en 8 meses.
- 1 contrato corporativo en 18 meses.

## Normativa que condiciona el diseño
- **Libros inmutables:** un asiento no se edita ni se borra; un error se corrige con un asiento de reversión (Código de Comercio y Código Tributario).
- **Ley 21.719:** protección de datos personales de terceros. Ver `docs/LEY-21719-CUMPLIMIENTO.md` del backend.
- **Plan de cuentas:** basado en NIIF para PYMES.
