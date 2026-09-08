<!-- GENERADO por `node tests/mapa.js --escribir` · NO editar a mano: se regenera y se pierde.
     Lo que declara el autor (para quién, si vale, qué lo sustituyó) sale de la línea
     «> Para: … · Estado: … · Sustituido por: …» de cada documento; lo demás se deriva. -->

# Qué documento sirve para qué

Una fila por documento. **Para** dice a quién está escrito; **Estado** si es una referencia que se
mantiene, un informe fechado (una foto de su fecha), algo pendiente de una decisión del dueño o algo
archivado; **Citado desde** se deriva leyendo el árbol. El estado del sistema NO está aquí: se mide
con `node tests/estado.js`, y las coordenadas las da `node tests/mapa.js <término>`.

## Para contratista

| Documento | Estado | Sustituido por | Citado desde | Título |
|---|---|---|---|---|
| `docs/metodologia.md` | referencia | — | `README.md` · `lib` · `public` · `tests` | Metodología de cálculo del costo real (Fase 1 · Detekta v3) |

## Para dueño

| Documento | Estado | Sustituido por | Citado desde | Título |
|---|---|---|---|---|
| `docs/archivo/ANALISIS_ESTRATEGICO.md` | archivado | docs/CONSULTORIA_2026-09-04_RESUMEN.md | — | Análisis estratégico de Detekta · agosto 2026 |
| `docs/CONSULTORIA_2026-09-04_RESUMEN.md` | informe fechado | — | `tests` | Consultoría integral sobre Detekta · resumen para el dueño (antes → mejora) |
| `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md` | informe fechado | — | `tests` | Investigación · Las cinco mejores plataformas de licitación pública del mundo |
| `docs/RAMAS_RETIRADAS.md` | informe fechado | — | `tests` | Ramas superadas al unificar en `main` (21-ago-2026) |
| `docs/ARQUITECTURA_MULTITENANT.md` | pendiente del dueño | — | — | Anexo C · Arquitectura multi-inquilino, escalabilidad y datos |
| `docs/CHECKLIST_PRODUCCION.md` | pendiente del dueño | — | — | Anexo F · Lista de verificación previa a producción |
| `docs/EMPEZAR_AQUI.md` | pendiente del dueño | — | `README.md` | EMPEZAR AQUÍ · Guía de cero para convertir Detekta en un negocio |
| `docs/PLAN_DE_ACCION.md` | pendiente del dueño | — | — | PLAN DE ACCIÓN · Detekta, de herramienta interna a producto por suscripción |
| `docs/PLAN_SAAS.md` | pendiente del dueño | — | — | PLAN SaaS · De herramienta interna a producto por suscripción |
| `docs/PRECIO_Y_UNIT_ECONOMICS.md` | pendiente del dueño | — | `tests` | Anexo B · Modelo de negocio, precio y economía unitaria |
| `docs/RIESGOS.md` | pendiente del dueño | — | — | Anexo G · Registro de riesgos |
| `docs/SEGURIDAD_Y_CUENTAS.md` | pendiente del dueño | — | `tests` | Anexo D · Identidad, autorización, seguridad y cobro |
| `docs/CONFIGURACION_TOKENS.md` | referencia | — | `README.md` · `lib` · `tests` | Tokens y variables de entorno · guía desde cero |
| `docs/DICTAMEN_DESDE_CLAUDE_CODE.md` | referencia | — | `README.md` · `tests` | Dictamen del pliego con la suscripción de Claude Code (sin clave de API) · 3-sep-2026 |
| `docs/LEGAL_COLOMBIA.md` | referencia | — | — | Anexo A · Frente jurídico y regulatorio (Colombia) |
| `docs/PRECIOS_DESDE_CLAUDE_CODE.md` | referencia | — | `README.md` · `tests` | Precios · cómo funciona «Buscar» y quién lo atiende |
| `docs/MIS_PROCESOS_V2.md` | vigente | — | — | Mis procesos, del interés a la liquidación · especificación, plan y decisiones de panta… |

## Para ingeniero

| Documento | Estado | Sustituido por | Citado desde | Título |
|---|---|---|---|---|
| `docs/archivo/AUDITORIA_INVESTIGACION_EXTERNA.md` | archivado | docs/MEMORIA.md | — | Auditoría de la investigación externa (ago 2026) |
| `docs/archivo/README_2026-09.md` | archivado | README.md | `README.md` · `tests` | Detekta · Oportunidades de licitación SECOP II |
| `docs/ATRACTIVIDAD.md` | informe fechado | — | `lib` · `public` · `tests` | Atractividad de una licitación — análisis iterativo y diseño |
| `docs/AUDITORIA_INTEGRAL.md` | informe fechado | — | `tests` | Auditoría integral · Detekta |
| `docs/AUDITORIA_MODULO_APU.md` | informe fechado | — | — | Consultoría y auditoría del módulo APU (24-ago-2026) |
| `docs/BANCO_PRECIOS_2026-08-26.md` | informe fechado | — | — | Banco de Precios Verificable · censo y contraste del informe del 26-ago-2026 |
| `docs/CALIBRACION_APU.md` | informe fechado | — | — | Calibración del catálogo APU con el Presupuesto Nogal 4 (ago 2026) |
| `docs/DIFERENCIAS_APU.md` | informe fechado | — | — | Diferencias declaradas · APU generado vs archivos de referencia (ago 2026) |
| `docs/INSUMOS_2026.md` | informe fechado | — | `lib` · `tests` | Insumos de precios 2026 · censo, contraste y qué hacer con ellos |
| `docs/INVESTIGACION_COMPETENCIA_APU.md` | informe fechado | — | `lib` · `tests` | Investigación de competencia del módulo APU · cómo operan, de dónde sacan los datos y c… |
| `docs/INVESTIGACION_DISENO_WEB.md` | informe fechado | — | `public` · `tests` | Investigación · Cómo están hechas las mejores páginas web del mundo (4-sep-2026) |
| `docs/PROBABILIDAD_MEJORADA.md` | informe fechado | — | `lib` · `tests` | Probabilidad de ganar — auditoría de la fórmula vigente y propuesta de mejora |
| `docs/VALIDACION_MODELOS.md` | pendiente del dueño | — | — | Anexo E · Ciencia de datos: calibración, validación y vigilancia |
| `docs/APU_DIAGNOSTICO.md` | referencia | — | `tests` | Diagnóstico del módulo APU frente a la especificación «APU profesional» |
| `docs/APU_FUENTES.md` | referencia | — | `lib` | Fuentes de precio del APU · qué se intentó, qué respondió y qué falta |
| `docs/APU_INFORME_COMPLETO.md` | referencia | — | `lib` · `public` · `tests` | APU automatizado y rentabilidad real de contratos de obra pública en Colombia |
| `docs/APU_Y_RENTABILIDAD.md` | referencia | — | `CLAUDE.md` · `README.md` · `lib` · `tests` | APU y rentabilidad — investigación de fuentes de precios |
| `docs/DON_HECTOR_DICTAMEN_DEL_PLIEGO.md` | referencia | — | `lib` · `tests` | Don Héctor · el dictamen del pliego (investigación y diseño · 2-sep-2026) |
| `docs/insumos_2026_pendiente/LEEME.md` | referencia | — | — | Insumos de precios 2026 · las FUENTES de los bancos del módulo APU |
| `docs/PERFILES.md` | referencia | — | `tests` | Perfiles del negocio — resumen técnico |
| `README.md` | referencia | — | `CLAUDE.md` · `lib` · `tests` | Detekta · decidir a qué licitaciones de obra civil presentarse |

## Para sesión

| Documento | Estado | Sustituido por | Citado desde | Título |
|---|---|---|---|---|
| `docs/ACCESIBILIDAD.md` | informe fechado | — | `lib` · `tests` | Accesibilidad de la zona · metodología (ago 2026) |
| `docs/PROMPT_CONSULTORIA_SAAS.md` | pendiente del dueño | — | — | PROMPT MAESTRO · CONSEJO CONSULTOR DE DETEKTA |
| `CLAUDE.md` | referencia | — | `.claude` · `CLAUDE.md` · `README.md` · `lib` · `public` · `tests` | CLAUDE.md · Detekta |
| `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` | referencia | — | `CLAUDE.md` · `README.md` · `lib` | Complemento crítico al Manual del Analista de Licitaciones |
| `docs/datos.md` | referencia | — | `README.md` · `lib` · `public` · `tests` | Inventario de fuentes de datos y auditorías de la Fase 0 |
| `docs/GUIA_ANALISTA_LICITACIONES.md` | referencia | — | `CLAUDE.md` · `README.md` · `lib` · `tests` | Manual del Analista de Licitaciones |
| `docs/marca.md` | referencia | — | `README.md` · `public` · `tests` | Marca · Detekta (Fase 7 del plan maestro v4 · ago 2026) |
| `docs/MEMORIA.md` | referencia | — | `CLAUDE.md` · `README.md` · `lib` · `public` · `tests` | MEMORIA.md · la crónica completa de decisiones de Detekta |
| `docs/PROMPT_INICIAL.md` | referencia | — | `CLAUDE.md` · `README.md` · `tests` | PROMPT INICIAL DE DETEKTA · protocolo vivo |
