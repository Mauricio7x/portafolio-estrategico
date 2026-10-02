# Muestra SECOP II · Fase 2 · lote 1 (procesos 0-9 de `muestra_fase2.json`) · notas del agente

> Para: sesión · Estado: referencia · Sustituido por: —

Agente: «agente muestra fase2 lote 1». Dos corridas de la misma sesión: la primera (≈04:29-04:59 UTC del
2-oct-2026) se cortó por el límite de la sesión después de escribir los 10 JSON de proceso y las fichas
F-1181 a F-1186; la segunda (reanudación) empezó a las **13:27:09 UTC** y terminó a las **13:40:05 UTC**
(`date -u` al cierre, en la línea final). La reanudación no rehízo ningún JSON: los leyó, comprobó que
no traen nombres de personas ni de proponentes y que tienen conteos, y escribió las fichas que faltaban
(F-1187 a F-1210) y estas notas.

## Qué se leyó y qué no

| Proceso | Tipo · modalidad | Informes en el índice | Páginas | Escaneado | Leído | Minutos (1.ª corrida) |
|---|---|---|---|---|---|---|
| CO1.REQ.11039785 (Puerto Salgar) | Consultoría · mínima cuantía | 1 (solo el final) | 5 | no | completo | 7 |
| CO1.REQ.10675464 (INVIAS) | Interventoría · mínima cuantía | 1 (definitivo) | 9 | no | completo | 11 |
| CO1.REQ.10235784 (CORPOCESAR) | Interventoría · concurso de méritos | 2 (preliminar 52 p., final 42 p.) | 94 | **sí, ambos** | parcial: p. 3 y pp. 48-52 del preliminar; pp. 1-4 y 36-42 del final, como imagen | 15 |
| CO1.REQ.10323879 (EPC Cundinamarca) | Interventoría · concurso de méritos | 1 (técnico preliminar, de Excel) | 44 | no | pp. 1-19 completas, pp. 20-44 por grep | 14 |
| CO1.REQ.10190438 (Paipa) | Consultoría · mínima cuantía | 2 | 56 | no | completo | 10 |
| CO1.REQ.10433735 (DAGRAN) | Interventoría · concurso de méritos | 1 (definitivo consolidado) | 19 | no | completo | 11 |
| CO1.REQ.10276438 (Floridablanca) | Interventoría · mínima cuantía | 2 | 10 | no | completo | 7 |
| CO1.REQ.10231558 (Algarrobo) | Interventoría · concurso de méritos | 2 | 46 | no | completo (anexo financiero del preliminar por muestreo) | 13 |
| CO1.REQ.10336823 (Valle del Guamuez) | Consultoría · concurso de méritos | 3 (jurídico 4 p., técnico 6 p., financiero 1 p.) | 11 | **sí, los tres** | completo, como imagen | 13 |
| CO1.REQ.10270147 (Betéitiva) | Consultoría · mínima cuantía | 2 | 6 | no | completo | 6 |

- 17 informes de evaluación descargados (200 todos; cinco necesitaron reintento tras un 403 «Azure WAF»
  y uno —el financiero de Valle del Guamuez— solo respondió en una tercera pasada). **5 de 17 son PDF
  escaneados sin capa de texto** (2 procesos de 10). md5 distintos en todos los pares: ningún duplicado
  en este lote.
- 10 pliegos o invitaciones bajados para la pregunta de documentos tipo (pp. 1-3 + grep de «versión»,
  «documento tipo», «CCE-EICP», «resolución»); el de Valle del Guamuez también está escaneado (80 p.,
  15,7 MB) y solo se leyeron sus dos primeras páginas como imagen.
- 10 consultas a `dmgg-8hin` (índice) y 10 a `p6dx-8zbt`; todas respondieron 200. Ningún POST.
- Reanudación: la lectura para las fichas se hizo sobre los PDF ya descargados en la primera corrida
  (misma sesión, mismo directorio de scratchpad; md5 cotejados contra los JSON). Las 20 citas de informes
  con capa de texto salieron de `pdftotext -layout -f N -l N`; las 4 de informes escaneados (F-1187,
  F-1188, F-1204, F-1205) se transcribieron de la imagen de la página (`pdftoppm -r 100/110`), porque el
  OCR con tesseract no termina en esta máquina (en la primera corrida, carga 44 en 4 núcleos; en la
  reanudación, carga 25 con los otros lotes haciendo OCR a la vez: una página consumía más de 7 min de
  CPU y se abandonó). Lo dice cada ficha en `notas`.
- No se leyó nada más del repositorio que lo indicado en el encargo.

## Qué fue difícil de contar

- **Subsanaciones**: casi ningún informe las lista; se reconstruyen comparando el preliminar con el
  definitivo (celdas NO CUMPLE → CUMPLE, «REQUERIDO» → «SUBSANA DE CONFORMIDAD», «Debe subsanar»). Cuando
  solo hay un informe en el índice (Puerto Salgar: solo el final; EPC: solo el técnico preliminar; DAGRAN:
  remite el detalle técnico y financiero a anexos que el índice no lista como informe) el conteo queda
  parcial o `null` (DAGRAN), nunca 0 por ausencia. Los ceros de Paipa y Valle del Guamuez están
  documentados por el propio informe.
- **Mínima cuantía**: solo se evalúa la oferta de menor precio; «habilitados» es 1 aunque haya 2 o 12
  proponentes (Paipa, INVIAS), y los demás no son «no habilitados» sino «no evaluados».
- **Rechazado frente a no habilitado**: DAGRAN rechaza a los que no subsanan (literal D del num. 1.15);
  Algarrobo distingue NO HABILITADO (3) de RECHAZADO (1, literal F); INVIAS rechaza por un formato del
  Decreto 1600 de 2024 entregado tarde. Se guardó cada categoría como la nombra el informe.
- **Tablas exportadas de Excel** (EPC, 44 p.): una frase se parte en varias líneas y columnas; los
  puntajes de experiencia salen en blanco en el texto extraído para 20 de 24 proponentes.
- **Documentos tipo**: solo 2 de 10 pliegos los declaran con versión (Algarrobo: «Versión: 2 del 15 de
  diciembre de 2025»; EPC: «Código CCE-EICP-GI-20 Versión No. 1»); ninguno cita el número de la
  resolución adoptante. DAGRAN los usa «como referencia» con adecuaciones. Las mínimas cuantías y la
  consultoría del PBOT van en formatos propios.
- **p6dx**: `categorias_adicionales` = «No definido» en los 10 (dudoso en todos); valor adjudicado 0 en
  tres procesos con recomendación de adjudicar (Paipa, Algarrobo, Valle del Guamuez) y «adjudicado: No» con
  estado Seleccionado; fechas de recepción que contradicen el informe en Floridablanca (errata del
  informe), Betéitiva y Valle del Guamuez; duración 0 «día(s)» y respuestas 0 con una oferta en Valle del
  Guamuez.

## Incidencias

1. Corte de sesión en la primera corrida después de escribir los 10 JSON y 6 fichas; reanudación sin
   rehacer nada.
2. WAF de SECOP II: 403 con HTML en 6 descargas (5 informes + 1 pliego); todas resueltas en el reintento
   a 10 s salvo el financiero de Valle del Guamuez (dos 403; 200 tres minutos después).
3. OCR inviable por carga de la máquina (dos corridas): los informes escaneados se leyeron como imagen y
   solo en sus páginas de proponentes y conclusiones; en CORPOCESAR las páginas intermedias (5-39 del final,
   4-47 del preliminar) podrían traer requerimientos no contados.
4. Erratas de los informes que confunden a un parseo automático: «MC-001-2026» en un proceso MC-003 y
   «20 de febrero» por 20 de marzo (Floridablanca); «MC-004 DE 2029» y «$27.0000.000» (Paipa);
   «eveluacion», «requeire», «susbanar» (Betéitiva); «#¡REF!» de Excel en una sumatoria de experiencia
   (Floridablanca); «valor mínimo aceptable $24.000.000 (Equivalente al 20% del P.O.)» cuando es el 80 %
   (Paipa).
5. Fechas escritas en el informe posteriores a su carga en el índice (Betéitiva, Valle del Guamuez):
   `fecha_carga` del índice no es la fecha del documento.
6. Un error del evaluador que solo se corrige en el definitivo y sin traslado: Algarrobo calificó CUMPLE un
   endeudamiento 0,73 con tope 0,65 en el preliminar y NO CUMPLE en el final.
7. Datos personales: todos los informes traen nombres y cédulas (representantes, personas naturales
   proponentes, profesionales, evaluadores); ninguno se guardó. Las citas de las fichas los sustituyen por
   «[…]» y lo dicen en `notas`.

## Problemas candidatos vistos en el lote (título · etapa · decisión · tipo · fichas · plata)

- El puntaje de experiencia se pierde por la forma del Formato 3 (no distinguir el contrato habilitante de
  los puntuables) y no es subsanable · E2 · D1/D3 · interventoría · F-1196, F-1197 · 3 de 4 hábiles con 0
  de 68,75 puntos; la adjudicación fue por $249.534.076.
- Un documento con fecha (RUP > 30 días, REDAM vencido, seguridad social de persona natural) no subsanado
  en el traslado rechaza la oferta · E2 · D3 · todos · F-1194, F-1195, F-1200, F-1184.
- La subsanación salva la habilitación pero pierde los puntos (RUP de integrante aportado tarde: el contrato
  no pondera) · E2 · D1 · interventoría · F-1203.
- Inconsistencias entre actas del mismo contrato → rechazo por posible falsedad (literal F) sin traslado ·
  E2 · D3 · todos · F-1202.
- El evaluador se equivoca en el preliminar y lo corrige en el definitivo sin requerimiento · E2 · D3 ·
  todos · F-1201.
- La entidad reconoce un error de digitación en su presupuesto oficial y pide ajustar el Formulario 1 ·
  E2 · D2 · interventoría · F-1191 · diferencia de $69.331 y $20.255 sobre $203.293.675.
- Mínima cuantía: el único evaluado es el de menor precio; ofertas al 90 % y 99,8 % del PO · E2 · D2 ·
  consultoría/interventoría · F-1192, F-1193, F-1207.
- Indicadores financieros desproporcionados para una consultoría (endeudamiento ≤ 0,31, cobertura ≥ 21,34)
  y «Indeterminado» calificado CUMPLE sin regla · E2 · D1 · consultoría · F-1205.
- Informes publicados fuera del índice con el nombre esperado (anexos financiero y técnico de DAGRAN;
  jurídico, financiero y definitivo de EPC): Detekta no puede contar lo que el índice no nombra · E2 ·
  D3 · todos · F-1190, F-1195.
- Informes escaneados (5 de 17): un lector automático no los ve · E2 · D3 · todos · F-1187, F-1188, F-1204,
  F-1205.

Cierre de la reanudación (`date -u`): 2026-10-02 13:40:05 UTC.
