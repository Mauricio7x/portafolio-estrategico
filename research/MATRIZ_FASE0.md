# Matriz de cobertura · tema → cubierto / a medias / vacío (Fase 0 · 2-oct-2026)

> Para: dueño · Estado: informe fechado · Sustituido por: —

Cómo leer: **Detekta hoy** se midió leyendo el árbol (`node tests/mapa.js`, cabeceras de los módulos,
`grep` por tema) y los informes del repositorio; **Docs** dice si la documentación del árbol ya trata el
tema (cubrirlo en papel no es cubrirlo en pantalla). La prueba que sostiene cada módulo es el bloque de
`tests/e2e.js` que se nombra (se corre con `E2E_SOLO=«rótulo»`); en esta fase se leyeron los rótulos y
corrió la suite entera una vuelta, no cada bloque aparte. Códigos de etapa, decisión y módulo:
`research/TAXONOMIA.md`. «Pendiente» cita el id que ya existe en el árbol (`N`, `R`, `D`, `P`, `V`) o el
marcador de `docs/MEMORIA.md` que `node tests/estado.js` imprime.

Leyenda: ● cubierto · ◐ a medias (existe pero incompleto, o dice algo falso reproducido) · ○ vacío.

## Eje 1 · Marco vigente

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Estatuto general (Ley 80, 1150, 1474, 1882, 2022, 2195) y su texto vigente | E0 | D1 D3 | ◐ | `lib/requisitos_ley.js` cita Ley 1150 art. 6 y D.L. 19/2012 (`unidad requisitos por tipo y modalidad`) | ◐ `docs/GUIA_ANALISTA_LICITACIONES.md` tabla maestra; `docs/LEGAL_COLOMBIA.md` advierte que verificó con buscador, no con el texto | 121 citas distintas en el árbol sin verificación en texto oficial (`research/censo_citas_normativas.tsv`) |
| Decreto 1082 de 2015, artículos de contratación | E0 | D1 D3 | ◐ | `lib/requisitos_ley.js`, `lib/garantia_seriedad.js`, `lib/capacidad.js` citan artículos puntuales | ◐ | Lista cerrada de artículos: no existe |
| Decreto 0997 de 2026 (RUP, anticorrupción, listas, transición) | E0 | D1 D3 | ○ | 0 menciones en `lib/`, `public/`, `docs/` | ○ | — |
| Decreto 0287 de 2026 (preferencias por discapacidad) | E2 | D1 | ○ | 0 menciones | ○ | — |
| Documentos tipo: versiones, fecha de aplicación, anexos | E2 | D1 D3 | ◐ | `lib/tabla_experiencia.js` (numerales 3.5.7-3.5.9), `lib/capital_trabajo.js`, `lib/garantia_seriedad.js` leen cláusulas del pliego tipo | ◐ `COMPLEMENTO` V-01 (v2 desde 16-feb-2026) | P-04 (texto del documento tipo no descargado), «tabla de meses del capital de trabajo por familia de pliego» (MEMORIA) |
| Circulares y conceptos de Colombia Compra | E0 | D3 | ○ | — | ○ | relatoría respondía 403 en ago-2026; hoy 200 (medido 2-oct) |
| Reforma en trámite (marcada no vigente) | E0 | — | ○ | — | ◐ `COMPLEMENTO` V-17, P-09 | P-09 |
| Régimen especial (manual propio de la entidad) | E0 | D1 D3 | ◐ | `lib/requisitos_ley.js` → `null`; `lib/filtros_lista.js` clasifica «especial» | ◐ | — |
| Ley de garantías y ciclo electoral | E1 E2 | D1 | ○ | — | ◐ `COMPLEMENTO` V-02 | P-07 (efecto en oferentes, calculable del histórico) |
| Cuantías, SMMLV y umbrales 2026 | E0 | D1 | ◐ | `lib/parametros.js` SMMLV «verificado» (Decreto 1469/2025, auto del Consejo de Estado por prensa) | ◐ `COMPLEMENTO` V-12 | P-05 (tabla de cuantías por entidad), P-10 (litigio del decreto) |

## Eje 2 · Planeación, estudios previos, presupuesto oficial y riesgos

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Plan Anual de Adquisiciones y su acierto | E1 | D1 | ● | `lib/paa.js`, `lib/paa_acierto.js` (dataset 9sue-ezhx) | ◐ | — |
| Estudios previos y análisis del sector | E1 | D1 D4 | ◐ | `lib/documentos_proceso.js` los lee si están en PDF con texto; escaneados exigen OCR | ◐ | OCR sin configurar en producción (MEMORIA) |
| Presupuesto oficial: cómo lo construye la entidad (APU oficial, AIU oficial) | E1 | D2 | ◐ | `lib/apu_extraer.js`, `lib/apu_pliego.js` leen el presupuesto publicado; su construcción no se analiza | ◐ `docs/APU_Y_RENTABILIDAD.md` | — |
| Matriz de riesgos previsibles (CONPES 3714) | E1 | D4 | ○ | — | ◐ `COMPLEMENTO` V-11 | — |
| Proyecto de pliego y observaciones | E1 | D1 D3 | ◐ | `lib/documentos_proceso.js` clasifica; `lib/cronograma.js`; fechas del proyecto confundidas con el definitivo (N15, reproducido) | ◐ | N15' |
| Aviso de convocatoria y plazos mínimos | E2 | D1 | ◐ | `lib/cronograma.js`, `lib/manifestacion.js` (`unidad manifestación calibrada`) | ◐ | — |

## Eje 3 · Selección

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Modalidades y cómo se gana en cada una | E2 | D1 D2 | ● | `lib/filtros_lista.js` `modalidadDe`, `lib/requisitos_ley.js`, `lib/guia_proceso.js` (`unidad modalidades`, `unidad cómo se gana por modalidad`) | ● `GUIA` cap. 3 | «Subasta de prueba» entra como real (espera visto bueno) |
| Habilitantes jurídicos y documentos de la oferta | E2 | D3 | ◐ | `lib/formato_entidad.js` llena solo lo inequívoco (13 formatos medidos) | ◐ `GUIA` cap. 8 | «formatos que HOY no se llenan» (MEMORIA) |
| Habilitantes financieros y organizacionales, fórmula del plural | E2 | D1 D3 | ● | `lib/perfiles.js`, `lib/consorcio.js`, `lib/capital_trabajo.js` (`unidad indicadores del consorcio con la fórmula del pliego`) | ● `docs/PROPONENTE_PLURAL.md` | `lib/rup_pdf.js` no lee el balance (MEMORIA) |
| Experiencia habilitante (tabla del pliego tipo, códigos) | E2 | D1 D3 | ◐ | `lib/tabla_experiencia.js`, `lib/codigos_experiencia.js`, dictamen R-02 | ◐ | «la experiencia se juzga sumando» con plan pendiente |
| Factores de puntaje (precio, calidad, industria nacional, Mipyme, discapacidad) | E2 | D2 | ○ | sin puntaje en código; `lib/socio_por_proceso.js` solo avisa limitación Mipyme | ◐ `GUIA` cap. 9 | — |
| Subsanación (Ley 1882 de 2018) y qué no se corrige | E2 | D3 | ◐ | `lib/formulario1.js` cita Ley 1882; `lib/dictamen_reglas.js` detecta | ◐ `GUIA` cap. 13 | R-08 («se puede corregir / no se corrige») |
| Causales de rechazo | E2 | D3 | ◐ | `lib/dictamen_reglas.js`; `lib/formulario1.js` afirma un rechazo universal que CCE no sostiene (N11) | ◐ `GUIA` índice de errores | N11-A [VB] |
| Informe de evaluación, traslado y observaciones | E2 | D3 | ◐ | `lib/documentos_proceso.js` puede listarlo; no se interpreta | ◐ `GUIA` cap. 12, 14 | R-08 |
| Audiencia, adjudicación, declaratoria de desierta | E2 | D1 | ◐ | `lib/indice_competencia.js` cuenta desiertas por entidad | ◐ `GUIA` cap. 15 | P-06 (tasa de desierta, calculable) |
| Limitación a Mipyme | E2 | D1 | ◐ | `lib/socio_por_proceso.js` avisa por monto; el lector devuelve vacío con cláusulas reales (N25) | ◐ | N25 |

## Eje 4 · RUP, experiencia, capacidad residual, plurales y clasificador

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| RUP: inscripción, renovación, firmeza, vigencia del certificado | E0 | D1 D3 | ◐ | `lib/rup.js`, `lib/config_rup.js`, `lib/rup_pdf.js` (`unidad perfiles contra el RUP`) | ◐ `GUIA` cap. 5 | lo que cambió en 2026 (Decreto 0997): 0 menciones |
| Clasificador UNSPSC: versión vigente, equivalencias, cruce RUP↔proceso | E0 | D1 | ◐ | `lib/unspsc.js` (jerárquico), `lib/equivalencias.js` (aprendidas del histórico), `lib/cobertura_rup.js` (`unidad UNSPSC (jerarquía)`, `unidad equivalencias`) | ◐ | versión del clasificador: 0 menciones; decisión del dueño sobre «prestar el código de la gemela» (MEMORIA) |
| Capacidad residual: fórmula de la Guía CCE-EICP-GI-22 | E2 | D1 | ● | `lib/capacidad.js` (fórmula única), `lib/contratos_en_ejecucion.js`, `lib/requisitos_ley.js` (`unidad capacidad`, `unidad contratos en consorcio`) | ● | «Cumple» con lista de contratos vacía (plan pendiente); `crp` sin reloj inyectado |
| Experiencia: acreditación, en consorcio, por códigos | E2 | D1 D3 | ◐ | `lib/codigos_experiencia.js`, `lib/experiencia.js` | ● `PROPONENTE_PLURAL` § 4 | «cláusulas que dependen de quién aporta la experiencia» (MEMORIA) |
| Proponente plural: porcentaje mínimo, reparto, cuenta en SECOP II | E2 | D1 D3 | ◐ | `lib/reparto.js`, `lib/participacion.js`, `lib/consorcio.js` | ● `PROPONENTE_PLURAL` § 3 | N23 (cuentas de consorcio), frases por modalidad |
| Indicadores del plural: sumar o ponderar | E2 | D3 | ● | `unidad indicadores del consorcio con la fórmula del pliego` | ● | — |

## Eje 5 · Ejecución

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Adiciones (tope del 50 %) y prórrogas | E4 | D4 | ◐ | `lib/ejecucion.js`: prórrogas por entidad (dataset jbjy-vk9h); adición de valor no está en el dato | ◐ `COMPLEMENTO` V-03 | — |
| Mayores cantidades de obra | E4 | D4 | ○ | — | ◐ V-03 | — |
| Ítems no previstos y su precio | E4 | D2 D4 | ○ | 0 menciones en código | ◐ 2 documentos lo nombran | — |
| Reajuste de precios (fórmulas, ICOCIV) | E4 | D2 D4 | ○ | `lib/apu/*` usa el ICOCIV para actualizar precios del catálogo, no para reajuste contractual | ◐ V-04 | P-08 (cartilla INVÍAS) |
| Anticipo, pago anticipado, fiducia, amortización | E3 E4 | D2 D4 | ◐ | `lib/apu/rentabilidad.js` (caja), `lib/documentos_proceso.js` sí/no/mención sin porcentaje (N30) | ◐ V-08 | N30 |
| Desequilibrio económico | E4 | D4 | ○ | — | ◐ V-06 | — |
| Suspensiones y salvedades | E4 | D4 | ◐ | `lib/ejecucion.js` cuenta «Suspendido» | ◐ V-05 (corrige al manual) | P-03 (radicado de la unificación) |
| Multas, caducidad, cláusulas excepcionales, inhabilidad por incumplimiento | E4 E5 | D4 | ◐ | `lib/socio.js` (antecedentes del socio) | ◐ V-07 | L-3b (riesgo legal del módulo) |
| Garantías: seriedad, cumplimiento, única | E2 E3 | D2 D3 | ◐ | `lib/garantia_seriedad.js` (seriedad y Mipyme); cumplimiento no | ◐ | — |
| Pagos tardíos y plazo real de pago | E4 | D2 D4 | ◐ | `lib/ejecucion.js`: `valor_pagado` sin dato en media Colombia | ◐ | N04 retirado por el dueño el 2-sep-2026; R-06 en la ruta del mercado (contradicción a resolver) |
| Liquidación | E5 | D4 | ○ | — | ◐ `GUIA` cap. 20 | — |
| Descuentos de cada pago (estampillas, contribución del 5 %) | E4 | D2 | ◐ | `lib/deducciones.js` existe y ninguna pantalla lo llama (N05) | ◐ V-09 | N05 [VB], aparcado por el dueño (20-ago) |
| Interventoría como contraparte | E4 | D4 | ◐ | `lib/requisitos_ley.js` la excluye de la K | ◐ V-16 | — |

## Eje 6 · Patologías

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Pliego sastre / direccionamiento | E1 E2 | D1 | ◐ | señales indirectas (competencia, concentración); sin detector | ◐ `GUIA` cap. 19 | R-17 fuera del horizonte (sin evidencia de pago) |
| Proponente único y baja competencia | E2 | D1 D2 | ◐ | `lib/indice_competencia.js` promedio por entidad **sin modalidad** (N02, medido) | ◐ | N02 + N01 [VB] (apuesta grande) |
| Concentración del ganador | E2 | D1 | ◐ | `lib/competencia_detalle.js` decide con porcentaje redondeado | ◐ | N01 |
| Colusión (SIC) | E2 | D1 D4 | ○ | — | ◐ `COMPLEMENTO` § colusión | — |
| Obras inconclusas (Ley 2020 de 2020) | E4 E5 | D4 | ○ | — | ◐ 2 menciones | — |
| Pagos tardíos | E4 | D4 | ◐ | ver eje 5 | ◐ | — |
| Antecedentes del socio (sanciones, multas) | E2 | D1 | ◐ | `lib/socio.js`, `lib/socio_por_proceso.js` | ◐ | L-3b |

## Eje 7 · SECOP II, datos abiertos y señales

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Datasets abiertos usados (p6dx, jbjy, dmgg, wi7w, hgi6, ceth, 9sue, u8cx, 4n4q) | E0 | todas | ● | `lib/socrata.js` y módulos por dataset | ● `docs/datos.md` | P-01 diccionario (hoy `api/views` responde 200, medido) |
| Cambios de la plataforma (releases de SECOP) | E0 | D3 | ○ | — | ○ | — |
| Señales de alerta en el dato (precio_base 0, «Confidencial», «No Definido», NIT compartido, subasta de prueba) | E0 | D1 | ◐ | `lib/ofertas.js`, `lib/proponentes.js`, identidad de entidad | ◐ | «Subasta de prueba» [VB] |
| Cuenta de proveedor, mensajes, bandeja, hora de publicación | E2 | D3 | ○ | ningún dato abierto lo trae (N15 descartado) | ○ | — |
| Documentos del proceso (índice dmgg-8hin y descarga) | E2 | D3 | ● | `lib/documentos_proceso.js` (medido 3-sep: la página pública redirige a reCAPTCHA; la descarga directa no) | ● | plan de lectura confunde archivos de proponentes el día del cierre (MEMORIA) |

## Eje 8 · La oferta de cero

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Paso a paso (registro, RUP, pliego, manifestación, observaciones, armado, carga, cierre) | E2 | D3 | ◐ | `lib/guia_proceso.js` (requisitos, pasos, consejos; `unidad guía · orden del paso a paso`) | ◐ `GUIA` cap. 7 | «Lo siguiente que tiene que hacer» con fecha pasada (MEMORIA) |
| Tiempo por paso y error típico | E2 | D3 | ○ | — | ◐ `MERCADO` § 4 (supuestos declarados) | «Medir el uso» (ruta) |
| Manuales de Colombia Compra para proveedores y tutoriales | E2 | D3 | ○ | — | ○ | — |
| Documentos de la oferta (carta, anticorrupción, garantía, certificados) | E2 | D3 | ◐ | `lib/formato_entidad.js` | ◐ | formatos no llenados (MEMORIA) |

## Eje 9 · Oferta económica y APU

| Tema | Etapa | Decisión | Detekta hoy | Dónde | Docs | Pendiente |
|---|---|---|---|---|---|---|
| Presupuesto oficial y APU oficiales leídos del pliego | E2 | D2 | ● | `lib/apu_extraer.js`, `lib/apu_pliego.js` (`node tests/apu_bench.js`) | ● | — |
| AIU: composición, tope, IVA sobre la utilidad | E2 | D2 | ● | `lib/apu/normativa.js`, `lib/apu/calculo.js` (`unidad IVA DE LA UTILIDAD`); bandas del manual, no de norma | ◐ `APU_INFORME_COMPLETO` § 1.C | — |
| Listas de precios oficiales (INVIAS, IDU, ICCU, EPC, FFIE) | E2 | D2 | ● | `lib/apu/*_items.js` | ● `docs/INSUMOS_2026.md` | L-7 (autorización INVIAS sin pedir) |
| Corrección aritmética | E2 | D3 | ○ | 0 en código | ◐ 2 documentos | — |
| Precio artificialmente bajo | E2 | D2 D3 | ◐ | `lib/apu/optimizador.js`, `lib/apu/rentabilidad.js` (6 archivos lo nombran) | ◐ | — |
| Método aleatorio de evaluación económica (art. 30 par. 3 Ley 80 / Ley 1882) y TRM | E2 | D2 | ◐ | `lib/apu/rentabilidad.js` dice «se sortea en la audiencia» en mínima cuantía (N13, reproducido); regla vieja de la TRM en MEMORIA y guía | ◐ | N13' [VB] |
| Precio de ítems no previstos | E4 | D2 | ○ | — | ○ | — |
| Unitario vs global; tope por unitario; suma mayor al presupuesto | E2 | D2 D3 | ◐ | `lib/formulario1.js` (defectos reproducidos 26-sep con plan pendiente) | ◐ V-03 | N11-A [VB] |
| Capital de trabajo y caja de la oferta | E2 | D2 | ● | `lib/apu/rentabilidad.js`, `lib/capital_trabajo.js` | ● | costo fijo de preparar la oferta ($5 M fijos) |

## Resumen de la matriz (conteo de filas, 2-oct-2026)

| Eje | ● | ◐ | ○ | Filas |
|---|---|---|---|---|
| 1 Marco vigente | 0 | 6 | 4 | 10 |
| 2 Planeación | 1 | 4 | 1 | 6 |
| 3 Selección | 2 | 7 | 1 | 10 |
| 4 RUP y capacidad | 2 | 4 | 0 | 6 |
| 5 Ejecución | 0 | 8 | 5 | 13 |
| 6 Patologías | 0 | 5 | 2 | 7 |
| 7 SECOP II y datos | 2 | 1 | 2 | 5 |
| 8 Oferta de cero | 0 | 2 | 2 | 4 |
| 9 Oferta económica | 4 | 3 | 2 | 9 |
| **Total** | **11** | **40** | **19** | **70** |

Lo que la matriz dice en una línea: Detekta cubre bien lo que decide **antes del cierre** (modalidad,
capacidad, plural, costeo, precio) y casi nada de lo que pasa **después de firmar** (eje 5) ni del
**marco nuevo de 2026** (Decretos 0997 y 0287, versión del clasificador): ahí la base parte de cero.
