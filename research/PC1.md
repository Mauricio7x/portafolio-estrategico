# PC1 · Punto de control de la Fase 1 (piloto) · 2-oct-2026

> Para: dueño · Estado: informe fechado · Sustituido por: —

Copia en disco del informe entregado en el chat. Las respuestas del dueño se anotan al pie.

## 1. Qué hice

- Piloto en tres flujos paralelos (03:20 a 04:13 UTC): eje 4 (RUP, experiencia, capacidad residual,
  plurales, UNSPSC) y eje 9 (oferta económica y APU), cada uno con un lector institucional y uno
  académico y un verificador adversario distinto por lector; y la muestra SECOP II (5 procesos:
  3 obra, 1 interventoría, 1 consultoría; licitación, menor cuantía, mínima cuantía y concurso de
  méritos) con un recuento adversario de 2.
- 85 fichas en `research/fichas/` (F-001 a F-085) desde 42 fuentes distintas; notas de cada agente en
  `research/ejes/` y `research/muestra_secop/piloto/`.
- Con lo aprendido ajusté la ficha (versión 2 del esquema), la taxonomía y las instrucciones de los
  agentes (§ 4).

## 2. Cifras

| Medida | Valor |
|---|---|
| Fichas | 85: eje 4 → 40 · eje 9 → 40 · muestra → 5 |
| Fuentes abiertas por tipo (según las fichas) | decreto 15 · ley 10 · documento tipo 9 · guía CCE 10 · concepto CCE 5 · jurisprudencia 2 · academia 28 · dato (SECOP) 6 |
| Autoridad | A1 10 · A2 15 · A3 19 · A4 2 · A5 5 · A6 28 · A7 6 |
| Tipo de contrato | obra 40 · todos 37 · interventoría 4 · consultoría 4 |
| Fuentes intentadas y no abiertas | eje 4: 14 · eje 9: 12 (muros anti-robot de EAFIT, Externado, Sabana, Sergio Arboleda; SciELO Colombia 503; Javeriana sin API; dos consultas públicas del RUP) |
| Verificación adversaria (80 fichas, 100 %) | **73 sostiene · 5 parcial · 2 no sostiene** → 2,5 % no sostenidas; 8,8 % con reparo |
| Por lote | eje 4 institucional 20/20 · eje 4 académico 20/20 · eje 9 académico 17/20 (3 parciales: página del PDF, una cifra del autor que no cuadra) · eje 9 institucional 16/20 (2 no sostienen, 2 parciales) |
| Por modelo del lector | lectores con sonnet (eje 4): 0 de 40 con reparo · lectores con el modelo de la sesión (eje 9): 7 de 40. Está confundido con el eje: el 9 exigía cotejar reformas |
| Recuento adversario de la muestra | 21 comparaciones en 2 procesos: 18 coinciden; 3 discrepancias de detalle (no de conteo); 0 datos personales hallados |
| Ritmo de lectura | 20 fichas por lector en 19 a 25 min (tope de ids, no de tiempo): **≥ 48 a 63 fichas por hora**; 11 a 16 fuentes abiertas por lector |
| Ritmo de verificación | 20 fichas en 9,5 a 14 min; 30 min cuando hubo que abrir las normas reformadoras |
| Muestra | 5 procesos en 32 min (6,4 min por proceso) · recuento de 2 en 18 min |
| Tokens de agentes | eje 4: 1.295.993 · eje 9: 1.039.390 · muestra: 522.440 · **total 2.857.823** (más un primer flujo detenido a los 10 min, no medido). ≈ 29 mil por ficha leída y verificada; ≈ 104 mil por proceso de la muestra con recuento |
| Tiempo de reloj | 53 min los tres flujos en paralelo; con los 10 min perdidos, 63 |
| Costo en dinero | no medible (suscripción); los tokens son la medida |

## 3. Lo que el piloto corrige del encargo (premisas)

1. **Decreto 0997 de 2026 y el RUP.** No modifica la inscripción, la renovación, la clasificación
   UNSPSC, la experiencia ni la capacidad residual (arts. 2.2.1.1.1.5.1 a 5.3 y 2.2.1.1.1.6.4 no están
   entre los 14 artículos que toca). Lo que sí toca del RUP: la caución para impugnar (art. 2: 10 % de
   la utilidad operacional del impugnado, 1 % de ingresos si no hay utilidad), el reporte de sanciones y
   un parágrafo sobre sentencias civiles (art. 3) y los habilitantes financieros fuera de documentos tipo
   (art. 6). Transición (art. 14): los arts. 2, 3, 8 y 11 rigen al día siguiente de la publicación; el
   resto a 6, 9, 12 o 15 meses según la entidad; los procesos con documento tipo siguen con las reglas
   anteriores. **Fecha de publicación en el Diario Oficial: sin verificar** (firmado el 4-ago-2026
   según la relatoría). Fichas F-004 a F-008, F-021 a F-024.
2. **Ley 80 art. 30**: hoy tiene un parágrafo sin número (original) y los parágrafos 2.º y 3.º que
   añadió el art. 1 de la Ley 1882 de 2018; no existe un «parágrafo 1.º». La ley dice «método aleatorio
   que se establezca en los pliegos»: no nombra la TRM. Fichas F-061, F-063, F-064 (texto compilado del
   Régimen Legal de Bogotá; Diario Oficial no abierto).
3. **Guía UNSPSC**: el archivo se llama V3-2026 pero el documento dice «G-CBS-02 versión 2, marzo
   2026» y declara implementada la UNv260801 del 18-mar-2025; el sitio muestra métricas de una «nueva
   versión» (149.850 códigos, 11.958 deshabilitados) sin fecha. Qué versión usan SECOP II y el RUP:
   **sin verificar**, como usted anotó.
4. **Métodos de evaluación económica del documento tipo v4 de obra**: el concepto C-1778 de 2025
   atribuye a la v4 mediana con valor absoluto, media geométrica con presupuesto oficial, media
   aritmética baja y menor valor; la lista del encargo (media aritmética, media aritmética alta,
   geométrica con presupuesto oficial, menor valor) no coincide. El documento base v4 no se pudo abrir
   (el listado se arma con JavaScript y la API de medios solo devolvió versiones 3): **sin verificar**.
5. **Hallazgo transversal**: la página «Decreto 1082 de 2015» de la relatoría de Colombia Compra no es
   un texto consolidado: transcribe el texto original en artículos ya reformados (Decreto 399 de 2021,
   Decreto 1860 de 2021). Causó las 2 fichas no sostenidas (F-046, F-048) y 1 parcial (F-049). Los
   textos consolidados oficiales (SUIN, Función Pública, síntesis de CCE, DNP) no responden desde este
   entorno; la relatoría sí tiene una página por decreto modificatorio, que es lo que se cotejará.

## 4. Lo que decidí y ya apliqué (entre PC0 y PC1)

- **Ficha versión 2** (`research/fichas/ESQUEMA_FICHA.json`): `url_final`, `pagina_pdf`, `anio_origen`,
  `cifra_comprobada` (una cifra de la fuente se recalcula antes de repetirla: el piloto halló un
  «78,3 %» que con los datos del autor da 86,7 %), `reformas_cotejadas` (sin ella, la vigencia es
  «[sin verificar]»), vocabulario único del resultado de verificación, excepción declarada para la
  autoría bibliográfica en `autor`, y la prohibición de declarar vigencia verificada con la página no
  consolidada de la relatoría.
- **Taxonomía**: eje «muestra» para las fichas de dato de SECOP II.
- **Instrucciones** (§ 4 bis): API de WordPress de Colombia Compra, repositorios con muro, WAF de
  SECOP II (descargas en secuencia con pausa), informes escaneados (OCR con tesseract en español, que
  está instalado), y conteo de páginas por el archivo PDF.
- **F-029**: la URL del repositorio de la Nacional llevaba un nombre de archivo de diez dígitos que
  puede ser un documento de identidad; se sustituyó por la URL final (UUID) a la que redirige.
- Las 7 fichas con reparo no se corrigen en el piloto: quedan con su resultado y se rehacen en la
  Fase 2 con `reformas_cotejadas` (la crónica no se reescribe).
- **Desviación que debo contarle**: el lector institucional del eje 4 hizo 31 consultas POST de solo
  lectura al módulo UNSPSC del sitio de Colombia Compra (la misma consulta que hace el botón de la
  página) para ver códigos deshabilitados. No escribió nada, pero la regla del repositorio dice que
  cualquier POST hacia fuera espera su visto bueno; quedó prohibido en las instrucciones.

## 5. Lo que la muestra enseñó (5 procesos; describe la muestra, no el universo)

| Proceso | Tipo · modalidad | Proponentes | Rechazos y causas | Subsanaciones | Adendas | Documento tipo |
|---|---|---|---|---|---|---|
| CO1.REQ.10579597 (Cajicá) | obra · menor cuantía | 2 | 1: AIU ofertado 33 % frente al 30 % fijado en el Formulario 1 (literal Q) | no documentadas | 0 | SAMC transporte v3 |
| CO1.REQ.10276184 (El Doncello) | obra · licitación | 1 | 0 (4 reparos subsanados: identidad del suplente, REDAM, soporte de nómina para la capacidad residual, Formato 3 de experiencia) | 4 | 0 | infraestructura social, versión no declarada |
| CO1.REQ.10489956 (Floresta) | interventoría · concurso de méritos | 1 (p6dx dice 2) | 0 | no documentadas | 0 | interventoría social v2 (15-dic-2025) |
| CO1.REQ.10434312 (Puerto Rondón) | obra · mínima cuantía | 1 | 0 | no documentadas | 0 | mínima cuantía obra social v1 (21-ago-2025) |
| CO1.REQ.11018097 (Otanche) | consultoría · mínima cuantía | 1 | 0 | 9 | 0 | formato propio |

Campos de `p6dx-8zbt` que usaría una propuesta: `categorias_adicionales` «No definido» en 5 de 5;
`codigo_principal_de_categoria` UNSPECIFIED en 1 y atípico en 1; `duracion` 0 con unidad «día(s)» en 1;
descripción «No definido» en 1; `respuestas_al_procedimiento` discrepante con el informe en 1. Tres de los
cinco informes son escaneados sin capa de texto; dos ids del índice eran el mismo archivo; el WAF de
SECOP II bloqueó descargas en paralelo. Solo 1 de cada 5 expedientes «Seleccionado/Evaluación» de 2026
trae un archivo llamado informe de evaluación en el índice (5 tomados de 24 revisados).

## 6. Tamaño N de la muestra (propuesta)

Con proponentes por proceso tan bajos (1 a 2), lo que la muestra mide bien es la **frecuencia por
proceso** (hubo rechazo, hubo subsanación, hubo adenda, qué documento tipo y versión, qué campos vienen
vacíos), no la tasa por proponente. Propongo **N = 40**, estratificada por modalidad (10 licitaciones,
10 menores cuantías, 10 mínimas cuantías, 10 concursos de méritos) y con al menos 8 interventorías y
8 consultorías: da proporciones con ±15 puntos al 95 % y cuesta ≈ 5 horas-agente de lectura (8 min por
proceso con OCR) repartidas en 4 agentes (≈ 1,5 h de reloj), ≈ 190 consultas al índice de documentos y
≈ 4 millones de tokens con el recuento del 20 %. N = 80 bajaría a ±11 puntos por el doble de costo;
N = 20 solo daría ejemplos.

## 7. Proyección de la Fase 2 con estos ritmos

9 ejes × 2 lentes = 18 lectores, 40 fichas cada uno con la regla de saturación (parar cuando 10 fuentes
seguidas de 2 tipos no den problema nuevo) o a los 90 min: ≈ 9 a 13 millones de tokens y ≈ 1,5 h de
reloj en 3 flujos; la muestra (§ 6) en paralelo; la verificación de la Fase 3 (100 % de lo normativo,
que es casi la mitad de las fichas, más el 20 % del resto) ≈ 3 a 5 millones. Total Fases 2 y 3:
≈ 16 a 23 millones de tokens y 4 a 5 horas de reloj. El tope D5 de 30 fuentes por eje casi se alcanza en
una sola vuelta (24 fuentes por eje en el piloto): en los ejes de problemas (2, 5, 6, 7, 8) impediría
llegar a la saturación.

## 8. Lo que decide usted

| # | Decisión | Opciones | Recomendación |
|---|---|---|---|
| D10 | N de la muestra | 20 · **40 estratificada por modalidad** · 80 | **40** (§ 6) |
| D11 | Modelo de los lectores en la Fase 2 | (a) sonnet para leer y el modelo de la sesión para verificar · (b) el modelo de la sesión en todo | **(a)**: en el piloto los lectores con sonnet no tuvieron reparos y cuestan menos; la verificación, que es lo que decide, sigue con el más capaz |
| D12 | Tope de fuentes por eje de problemas | (a) 30, como se acordó · (b) 40 con la regla de saturación | **(b)**: 30 corta antes de saturar |
| D13 | Las 7 fichas con reparo del piloto | (a) rehacerlas en la Fase 2 con `reformas_cotejadas` y volver a verificar · (b) borrarlas | **(a)**: la crónica se desmiente, no se borra |
| D14 | POST de solo lectura a módulos web de Colombia Compra (consultas que hace la propia página) | (a) prohibidos · (b) permitidos si son de solo lectura y se declaran | **(a)** hasta que usted diga otra cosa |

## 9. Respuestas del dueño (2-oct-2026, 04:25 UTC)

D10 40 · D11 (a) · D12 (b) · D13 (a) · D14 (a).
