# Taxonomía común de la base de conocimiento (Fase 0 · 2-oct-2026)

> Para: sesión · Estado: referencia · Sustituido por: —

Toda ficha, problema y propuesta se etiqueta con estas cinco dimensiones. Un agente que no pueda
clasificar algo lo marca `sin_clasificar` y lo anota: la taxonomía se ajusta en el PC1, no se tuerce
en silencio. Las claves (en `código`) son las que van en los JSON.

## 0. Alcance (decisión del dueño D3, 2-oct-2026)

Obra pública **más consultoría e interventoría**: cada regla dice a qué tipo de contrato aplica
(`tipo_contrato`: `obra` · `interventoria` · `consultoria` · `todos`). El concurso de méritos entra como
modalidad propia; la capacidad residual solo aplica a obra; la oferta económica del concurso de méritos
sigue sus propias reglas.

## 1. Etapa del ciclo (desde el contratista)

| Código | Etapa | Qué pasa aquí |
|---|---|---|
| `E0` | Transversal | Marco normativo, SECOP II como plataforma, RUP y clasificador: aplican en todas las etapas |
| `E1` | Antes del aviso | PAA, estudios previos, presupuesto oficial, matriz de riesgos, proyecto de pliego y observaciones |
| `E2` | Selección | Aviso y pliego definitivo, manifestación de interés, adendas, armado y carga de la oferta, cierre, evaluación, subsanación, traslado del informe, observaciones, audiencia, adjudicación o desierta |
| `E3` | Firma y arranque | Perfeccionamiento, garantías, registro presupuestal, acta de inicio, anticipo |
| `E4` | Ejecución | Mayores cantidades, ítems no previstos, adiciones y prórrogas, reajustes, suspensiones, multas, desequilibrio, pagos y descuentos |
| `E5` | Cierre y después | Recibo, liquidación, garantías posteriores, sanciones e inhabilidades que quedan |

## 2. Decisión del contratista que afecta

| Código | Pregunta |
|---|---|
| `D1` | ¿Me presento? (incluye «¿con quién?»: solo o en consorcio, y con cuál socio) |
| `D2` | ¿A qué precio? |
| `D3` | ¿Qué me hace rechazar o no habilitar? |
| `D4` | ¿Qué riesgo trae la ejecución? (caja, plazo, sanciones, liquidación) |

## 3. Módulo de Detekta que toca

| Código | Módulo | Archivos de referencia (`node tests/mapa.js <término>` da el resto) |
|---|---|---|
| `M-ING` | Ingesta y listado | `lib/handlers/procesos/sync.js`, `lib/filtros.js`, `lib/filtros_lista.js`, `lib/handlers/procesos/listar.js` |
| `M-RUP` | RUP y clasificador | `lib/rup.js`, `lib/unspsc.js`, `lib/config_rup.js`, `lib/rup_pdf.js`, `lib/cobertura_rup.js`, `lib/equivalencias.js` |
| `M-K` | Capacidad y habilitantes financieros | `lib/capacidad.js`, `lib/contratos_en_ejecucion.js`, `lib/requisitos_ley.js`, `lib/capital_trabajo.js`, `lib/perfiles.js` |
| `M-EXP` | Experiencia | `lib/experiencia.js`, `lib/codigos_experiencia.js`, `lib/tabla_experiencia.js` |
| `M-TARJ` | Tarjeta y veredicto graduado | `lib/puertas.js`, `lib/probabilidad.js`, `lib/indice_baja.js`, `lib/indice_competencia.js`, `lib/manifestacion.js` |
| `M-APU` | Costeo (APU) y lector de pliegos | `lib/apu/*`, `lib/apu_extraer.js`, `lib/apu_pliego.js`, `lib/parametros.js` |
| `M-PRECIO` | Precio de oferta y caja | `lib/apu/optimizador.js`, `lib/apu/rentabilidad.js`, `lib/ganancia.js`, `lib/deducciones.js` |
| `M-F1` | La oferta que se radica | `lib/formulario1.js`, `lib/formato_entidad.js`, `public/apu_libro.js` |
| `M-VIGIA` | Adendas, cronograma y documentos del proceso | `lib/adendas.js`, `lib/diff.js`, `lib/cronograma.js`, `lib/documentos_proceso.js` |
| `M-DICT` | Dictamen y guía del pliego | `lib/dictamen.js`, `lib/dictamen_reglas.js`, `lib/guia_proceso.js`, `lib/garantia_seriedad.js` |
| `M-CONS` | Consorcio y socio | `lib/consorcio.js`, `lib/reparto.js`, `lib/participacion.js`, `lib/socio.js`, `lib/socio_por_proceso.js` |
| `M-INT` | Inteligencia de entidad y competencia | `lib/proponentes.js`, `lib/ofertas.js`, `lib/ejecucion.js`, `lib/competencia_detalle.js`, `lib/paa.js` |
| `M-NUEVO` | No existe hoy en Detekta | — |
| `M-DOC` | Solo documentación (sin código) | `docs/` |

## 4. Tipo de fuente

| Código | Tipo | Ejemplos |
|---|---|---|
| `ley` | Ley o decreto ley | Ley 80 de 1993, Ley 1150 de 2007, Decreto Ley 19 de 2012 |
| `decreto` | Decreto reglamentario | Decreto 1082 de 2015 y sus modificaciones |
| `doc_tipo` | Documento tipo de Colombia Compra | Pliego tipo de obra, sus matrices y anexos |
| `cce_guia` | Circular, guía o manual de Colombia Compra | Guía de capacidad residual, manuales de SECOP II |
| `cce_concepto` | Concepto de Colombia Compra (no vinculante) | Relatoría de conceptos |
| `juris` | Jurisprudencia | Consejo de Estado, Corte Constitucional (`unificacion: true` si lo es) |
| `control` | Órgano de control o vigilancia | Contraloría, Procuraduría, SIC |
| `internacional` | Organismo internacional | OCDE, Banco Mundial, BID |
| `gremio` | Gremio u organización civil | CCI, Transparencia por Colombia, Fedesarrollo |
| `academia` | Tesis o artículo indexado | Repositorios universitarios, SciELO, Redalyc, Dialnet |
| `practica` | Práctica documentada | Manual de una entidad, lista de precios oficial, tutorial con transcripción |
| `dato` | Dato abierto o documento de SECOP | Datasets de datos.gov.co, informe de evaluación de un proceso |

## 5. Nivel de autoridad (jerarquía del encargo; va en cada ficha)

| Código | Nivel | Regla de uso |
|---|---|---|
| `A1` | Ley | Manda. Se cita la reforma vigente, no la ley original modificada |
| `A2` | Decreto | Manda dentro de la ley. Un ABC o una guía no lo reemplazan |
| `A3` | Documento tipo, circular o guía de Colombia Compra | Obligatorio donde el documento tipo aplica; la guía orienta |
| `A4` | Jurisprudencia (`A4u` si es de unificación) | Sostiene una interpretación; la de unificación pesa más |
| `A5` | Concepto de Colombia Compra | No vinculante: orienta, no decide |
| `A6` | Academia | Evidencia de un problema o de una lectura; no autoridad normativa |
| `A7` | Práctica (manuales de entidad, videos con transcripción) | Evidencia de un problema; nunca autoridad |

Vigencia: toda afirmación normativa lleva `vigencia_verificada` con fecha y fuente del texto oficial;
si la fuente es anterior a una reforma que toca su tema, su afirmación no se usa sin reverificarla.

## 6. Estado de lectura de una fuente

`completa` · `parcial` (con la lista de partes leídas: páginas, secciones o minutos) · `no_abierta`
(solo se cita como pista; no sostiene ninguna afirmación). Un video sin transcripción descargable es
`no_abierta`.

## 7. Identificadores (decisión de la sesión, 2-oct-2026; el dueño puede cambiarla en el PC0)

El encargo pide `P-###` y `R-###`. En el árbol ya existen `P-01…P-12` (temas pendientes de
`docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`), `R-01…R-17` (ruta de
`docs/INVESTIGACION_MERCADO_LICITADOR.md`), `N01…N31` (`docs/INVESTIGACION_LICITANTE.md`) y
`D-01…D-79` (`docs/reforma_datos/`). Dos cosas distintas no pueden llevar nombres parecidos, así que
la base usa un prefijo propio:

| Objeto | Id | Ejemplo |
|---|---|---|
| Ficha de fuente | `F-###` | `F-014` |
| Problema del catálogo | `CP-###` | `CP-003` |
| Propuesta de la ruta | `CR-###` | `CR-007` |
| Proceso de la muestra SECOP | su número de proceso | `CO1.REQ.11013791` (nunca nombres de personas) |

Una propuesta que ya existe como `R-nn`, `N-nn` o `D-nn` lo dice en su campo `ya_existe` y no se
renumera: la ruta única enlaza, no duplica.
