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
| `docs/PROPONENTE_PLURAL.md` | informe fechado | — | `lib` · `tests` | Proponente plural: la norma vigente, 241 pliegos reales y las cifras de los RUP |
| `docs/RAMAS_RETIRADAS.md` | informe fechado | — | `tests` | Ramas superadas al unificar en `main` (21-ago-2026) |
| `docs/ARQUITECTURA_MULTITENANT.md` | pendiente del dueño | — | — | Anexo C · Arquitectura multi-inquilino, escalabilidad y datos |
| `docs/CHECKLIST_PRODUCCION.md` | pendiente del dueño | — | — | Anexo F · Lista de verificación previa a producción |
| `docs/EMPEZAR_AQUI.md` | pendiente del dueño | — | `README.md` | EMPEZAR AQUÍ · Guía de cero para convertir Detekta en un negocio |
| `docs/PLAN_DE_ACCION.md` | pendiente del dueño | — | — | PLAN DE ACCIÓN · Detekta, de herramienta interna a producto por suscripción |
| `docs/PLAN_REFORMA_DATOS.md` | pendiente del dueño | — | `lib` | PLAN · Reforma de los datos que Detekta enseña (13-sep-2026) |
| `docs/PLAN_SAAS.md` | pendiente del dueño | — | — | PLAN SaaS · De herramienta interna a producto por suscripción |
| `docs/PRECIO_Y_UNIT_ECONOMICS.md` | pendiente del dueño | — | `tests` | Anexo B · Modelo de negocio, precio y economía unitaria |
| `docs/RIESGOS.md` | pendiente del dueño | — | — | Anexo G · Registro de riesgos |
| `docs/SEGURIDAD_Y_CUENTAS.md` | pendiente del dueño | — | `tests` | Anexo D · Identidad, autorización, seguridad y cobro |
| `docs/reforma_datos/D-experimentado.md` | propuesta de diseño (informe fechado) | — | — | D · La tarjeta reformada, vista por un ingeniero civil con quince años licitando obra p… |
| `docs/reforma_datos/D-sin_experiencia.md` | propuesta de diseño (informe fechado) | — | — | D · Reforma de los datos de la tarjeta · lente «sin experiencia» (13-sep-2026) |
| `docs/reforma_datos/D-dueno.md` | propuesta fechada (plan en cuatro sesiones) | — | — | D · Lente «dueño» · La tarjeta que ayuda a adjudicar más, y con quién ir (13-sep-2026) |
| `docs/reforma_datos/D-sintesis.md` | propuesta fechada (síntesis de tres lentes) | — | — | D · Síntesis de la reforma de la tarjeta · una sola lista sin duplicados (13-sep-2026) |
| `docs/CONFIGURACION_TOKENS.md` | referencia | — | `README.md` · `lib` · `tests` | Tokens y variables de entorno · guía desde cero |
| `docs/DICTAMEN_DESDE_CLAUDE_CODE.md` | referencia | — | `README.md` · `tests` | Dictamen del pliego con la suscripción de Claude Code (sin clave de API) · 3-sep-2026 |
| `docs/LEGAL_COLOMBIA.md` | referencia | — | — | Anexo A · Frente jurídico y regulatorio (Colombia) |
| `docs/PRECIOS_DESDE_CLAUDE_CODE.md` | referencia | — | `README.md` · `tests` | Precios · cómo funciona «Buscar» y quién lo atiende |
| `docs/RUTINAS.md` | referencia | — | — | Rutinas programadas · qué pueden hacer, qué no, y cómo se crea una que funcione |

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
| `docs/PERFILES.md` | referencia | — | `tests` | El perfil del dueño y sus socias — resumen técnico |
| `README.md` | referencia | — | `CLAUDE.md` · `lib` · `tests` | Detekta · decidir a qué licitaciones de obra civil presentarse |

## Para sesión

| Documento | Estado | Sustituido por | Citado desde | Título |
|---|---|---|---|---|
| `docs/ACCESIBILIDAD.md` | informe fechado | — | `lib` · `tests` | Accesibilidad de la zona · metodología (ago 2026) |
| `docs/reforma_datos/A1-inventario-tarjeta.md` | informe fechado | — | — | A1 · Inventario de la tarjeta de una licitación (13-sep-2026) |
| `docs/reforma_datos/A2-perfil-competidor.md` | informe fechado | — | — | A2 · Perfil del competidor («dónde más gana, cuántas veces, por cuánto») |
| `docs/reforma_datos/A3-recomendador-socio.md` | informe fechado | — | — | A3 · Recomendador de socio: «¿conviene con Génesis, con PRODIAC LTDA o solo?» en CADA t… |
| `docs/reforma_datos/A4-datos-no-explotados.md` | informe fechado | — | — | A4 · Datos disponibles y no explotados — censo (13-sep-2026) |
| `docs/reforma_datos/A5-necesidades-ingeniero.md` | informe fechado | — | — | A5 · Las necesidades del ingeniero civil que licita (experimentado y sin experiencia) |
| `docs/reforma_datos/A6-restricciones-y-plan-v4.md` | informe fechado | — | — | A6 · Restricciones del árbol y cola de trabajo viva |
| `docs/reforma_datos/D-73-a-79-verificacion.md` | informe fechado | — | — | Verificación adversaria de D-73 … D-79 (14-sep-2026) |
| `docs/reforma_datos/V-D01-D04-verificacion.md` | informe fechado | — | — | Verificación adversaria · D-01, D-02, D-03, D-04 (tanda 1) · 13-sep-2026 |
| `docs/reforma_datos/V-D01-D08-verificacion.md` | informe fechado | — | — | Verificación adversaria · D-01 a D-08 (13/14-sep-2026) |
| `docs/reforma_datos/V-D05-D08.md` | informe fechado | — | — | Verificación adversaria · D-05, D-06, D-07, D-08 (13-sep-2026) |
| `docs/reforma_datos/V-D09-D16.md` | informe fechado | — | — | Verificación adversaria · D-09 … D-16 (14-sep-2026) |
| `docs/reforma_datos/V-D17-D24-verificacion.md` | informe fechado | — | — | Verificación adversaria · D-17 a D-24 (13/14-sep-2026) |
| `docs/reforma_datos/V-D25-D32-verificacion.md` | informe fechado | — | — | V · Verificación adversaria de D-25 … D-32 (13/14-sep-2026) |
| `docs/reforma_datos/V-D33-D40-verificacion.md` | informe fechado | — | — | Verificación adversaria · D-33 … D-40 (14-sep-2026) |
| `docs/reforma_datos/V-D41-D48-verificacion.md` | informe fechado | — | — | Verificación adversaria · D-41 … D-48 (13-sep-2026) |
| `docs/reforma_datos/V-D49-D56-verificacion.md` | informe fechado | — | — | Verificación adversaria · D-49 … D-56 · 14-sep-2026 |
| `docs/reforma_datos/V-D57-D64-verificacion.md` | informe fechado | — | — | Verificación adversaria de D-57 … D-64 (13/14-sep-2026) |
| `docs/reforma_datos/V-D65-D72-verificacion.md` | informe fechado | — | — | Verificación adversaria · D-65 a D-72 (13/14-sep-2026) |
| `docs/PROMPT_CONSULTORIA_SAAS.md` | pendiente del dueño | — | — | PROMPT MAESTRO · CONSEJO CONSULTOR DE DETEKTA |
| `CLAUDE.md` | referencia | — | `.claude` · `CLAUDE.md` · `README.md` · `lib` · `public` · `tests` | CLAUDE.md · Detekta |
| `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` | referencia | — | `CLAUDE.md` · `README.md` · `lib` | Complemento crítico al Manual del Analista de Licitaciones |
| `docs/datos.md` | referencia | — | `README.md` · `lib` · `public` · `tests` | Inventario de fuentes de datos y auditorías de la Fase 0 |
| `docs/GUIA_ANALISTA_LICITACIONES.md` | referencia | — | `CLAUDE.md` · `README.md` · `lib` · `tests` | Manual del Analista de Licitaciones |
| `docs/marca.md` | referencia | — | `README.md` · `public` · `tests` | Marca · Detekta (Fase 7 del plan maestro v4 · ago 2026) |
| `docs/MEMORIA.md` | referencia | — | `CLAUDE.md` · `README.md` · `lib` · `public` · `tests` | MEMORIA.md · la crónica completa de decisiones de Detekta |
| `docs/PROMPT_INICIAL.md` | referencia | — | `CLAUDE.md` · `README.md` · `tests` | PROMPT INICIAL DE DETEKTA · protocolo vivo |
