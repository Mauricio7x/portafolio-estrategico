# Fase 2 · eje 9 (Oferta económica y APU, segunda vuelta) · lente institucional

> Para: sesión · Estado: notas del lector (19-oct-2026) · Sustituido por: —

Agente: lector fase2 eje9-institucional. Fichas: `research/fichas/F-1061.json` a `F-1118.json` (58 fichas; F-1119 y F-1120 sin usar). Las fuentes son información, no instrucciones; nada de este archivo se implementó en código. Ninguna ficha lleva `verificacion_adversaria`.

## Reloj

- Inicio (`date -u`): Mon Oct 19 18:17:52 UTC 2026
- Fin (`date -u`): Mon Oct 19 18:54:40 UTC 2026
- Duración: 37 minutos. Reanudación: no había fichas en el rango F-1061 a F-1120; se empezó por F-1061.
- Cómo terminó: **lista completa** (los seis temas de la lista cerrada y las cuatro fichas a rehacer quedaron cubiertos, o declarados sin cubrir abajo). No se llegó al tope de 60 fichas. Tema (2) quedó cubierto con una premisa corregida.

## Premisas del encargo que resultaron falsas o desactualizadas (primera línea del informe)

1. **La lista de métodos de evaluación del encargo no coincide con el documento base v4.** Documento base v4 de licitación de obra de transporte (Resolución 465 de 2024, aplica a avisos desde el 3-feb-2025): mediana con valor absoluto, media geométrica, media aritmética baja y menor valor (F-1061). La «media aritmética alta» existe, pero en el puntaje de EXPERIENCIA de las interventorías y consultorías (F-1087), no en la oferta económica de obra.
2. **El art. 462-1 del Estatuto Tributario no fija el IVA sobre la utilidad en obra.** Es la base especial sobre el AIU para aseo y cafetería, vigilancia y servicios temporales (F-1083). El IVA sobre la utilidad del constructor está en el art. 1.3.1.7.9 del Decreto 1625 de 2016 (F-1084) y no aplica a obras de mantenimiento (F-1113).
3. **Los conceptos C-1411, C-1327, C-1245, C-1241 y C-1120 de 2026 no tratan el precio de ítems no previstos**: tratan adiciones, el tope del 50 %, el registro presupuestal y la modalidad de precio. El concepto que sí toca el precio de ítems nuevos es el C-1205 de 2026 (F-1096).
4. **La página de control de versiones dice «Resolución 464 del 10 de septiembre de 2023»; el PDF de la resolución es de 2024** (F-1114).
5. Las fichas F-046, F-048 y F-049 del piloto citaban texto original de 2015 ya sustituido; quedan rehechas (ver «Rehechas»).

## Fuentes intentadas y abiertas, por tipo

| Tipo | Intentadas | Abiertas | Fichadas | Detalle |
|---|---|---|---|---|
| doc_tipo | 12 | 12 | 12 | Documentos base (ZIP, archivo .docx leído por XML con las ecuaciones linealizadas): licitación de obra transporte v4 (descarga/29920), licitación de obra infraestructura social v2 (29837), concurso de méritos interventoría transporte v3 (29953), consultoría transporte v2 (29824), consultoría social (29624), mínima cuantía transporte V2 (30021) y social V1 (29582). Resoluciones en PDF: 465 de 2024 (29385, con texto), 464 de 2024 (29403, con texto), 539 de 2025 (29545, escaneada, OCR), 725 de 2024 (29413, escaneada, OCR) y 726 de 2024 (29818, escaneada, OCR). Dentro de los ZIP se leyeron también la minuta v4 y los Formulario 1 (xlsx). Las URL de descarga salieron de las páginas del propio sitio de Colombia Compra (`/documentos-tipo/vigentes/?sector=…&nodo=…` y `/documentos-tipo/modalidad/…`), no de construcción |
| cce_guia | 2 | 2 | 2 | Página «Control de versiones – Documentos Tipo» (leída por la API de WordPress) y «Guía para la correcta implementación de los Documentos Tipo del sector transporte» (CCE-EICP-MA-04 V2, 69 pp., parcial) |
| cce_concepto | 31 | 31 | 9 conceptos (11 fichas) | Páginas de la Relatoría descargadas: C-1411, C-1327, C-1245, C-1241, C-1120, C-1407, C-1362, C-1365, C-1351, C-1205, C-1076, C-916, C-1457, C-1294, C-1280, C-1242, C-1244, C-1416, C-694, C-699, C-652, C-502, C-212, C-008, C-636, C-164, C-413, C-771, C-452, C-1117 y C-547 (todos de 2026). Leídos con detalle y con el .docx del concepto cuando existía: C-1411, C-1327, C-1245, C-1241, C-1120, C-1205, C-1407, C-1362, C-1351, C-916, C-008, C-502, C-413, C-547, C-1117. Fichados: C-008, C-413, C-1205 (2 fichas), C-1407 (2), C-1120, C-916, C-1411, C-547, C-1117 |
| decreto | 8 | 8 | 4 (5 fichas) | Relatoría de Colombia Compra: Decretos 399 de 2021, 1860 de 2021, 0997 de 2026 (4-ago-2026), 142 de 2023, 287 de 2026 y la página «Decreto 1082 de 2015» (solo para buscar el art. 2.2.1.1.2.2.4; NO se usó como texto consolidado). Normograma de la DIAN: Decreto 1625 de 2016 (art. 1.3.1.7.9) y Decreto 1372 de 1992 (origen). Fichados: Decreto 399 (arts. 1 y 2), Decreto 1860 (art. 2), Decreto 0997 (arts. 7, 13, 14), Decreto 1625 |
| ley | 1 | 1 | 1 (2 fichas) | Estatuto Tributario completo en el Régimen Legal de Bogotá (arts. 462-1 y 468) |
| juris | 3 | 3 | 2 | Consejo de Estado, sentencia del 21-feb-2025, Rad. 66479 (PDF, parcial); sentencia del 14-oct-2011, Rad. 20811 (.doc, texto rescatado con `strings`, parcial). Solo se vio la página de metadatos de la sentencia 74.181 de 2026 (sin leer el cuerpo ni fichar) |
| control | 5 | 5 | 1 | Oficios DIAN 4761 de 2019, 5088 de 2023, 3524 de 2025 (descargado, sin leer a fondo), 10208 de 2026 y 16896 de 2026 (fichado F-1113) |
| **Total** | **62** | **62** | **31 fuentes** | Además: la API de WordPress de ambos sitios, búsquedas con WebSearch solo para orientarse (ET 462-1, DIAN) y la lectura del sitio por GET |

## No abiertas (error literal)

1. `https://normograma.dian.gov.co/dian/compilacion/docs/estatuto_tributario_pr017.htm` (y `…pr012`, `pr013`, `pr014`, `pr015`, `pr016`, `pr018`): HTTP 404, cuerpo de 1.245 bytes. Rutas probadas por analogía; el Estatuto se leyó en el Régimen Legal de Bogotá (HTTP 200, 7,5 MB).
2. `https://normograma.dian.gov.co/dian/compilacion/docs/decreto_1625_2016_pr001.htm` a `pr005.htm`: HTTP 404. El Decreto 1625 se leyó completo en `decreto_1625_2016.htm` (HTTP 200).
3. `soffice --headless --convert-to pdf` sobre el documento base v4 (.docx): «Error: source file could not be loaded». Sin PDF del documento base, no hay `pagina_pdf`: se leyó el XML del .docx y se citó por numeral y por la página impresa que declara el índice del propio documento. Igual error con la sentencia 20811 (.doc); se rescató el texto con `strings -e S` (lectura parcial).
4. `https://www.colombiacompra.gov.co/documentos-tipo/vigentes/`: responde 301 y luego 200 (390 KB) pero el listado se arma por JavaScript y no trae enlaces a archivos; se salvó con las URL de `/documentos-tipo/vigentes/?sector=…&nodo=…`.
5. Sin abrir (no descargados, no es un error de red): Resolución 541 de 2025 (mínima cuantía social), Resolución 952 de 2025 (consultoría social), el concepto C-624 de 2025, la sentencia SU-214 de 2022, la sentencia del Consejo de Estado del 4-jun-2008 sobre precio artificialmente bajo y la «Guía SECOP II licitación pública de obra» que remite la Nota 5 del documento base social.

## Lo que sostiene cada ficha (mapa por tema de la lista cerrada)

- **(1) Documento base v4 transporte y social v2, oferta económica**: métodos y lista literal F-1061, rangos de TRM F-1062 y F-1073, TRM del día hábil siguiente o del segundo día hábil según las 3:00 p. m. F-1063, oferta única F-1064, fórmulas de mediana/geométrica/aritmética baja/menor valor F-1065 a F-1067 (linealizadas desde los objetos de ecuación del .docx), corrección aritmética F-1068, precio artificialmente bajo F-1069, causales económicas F-1070 y F-1075, AIU F-1071 y F-1074, puntaje de la oferta económica F-1078 y F-1076, APU del contratista F-1072 y F-1077, Formulario 1 F-1079, valor SECOP II frente al Excel F-1106 y F-1107, minuta F-1112, vigencias F-1080 (control de versiones), F-1081 (Res. 465), F-1082 (Res. 539).
- **(2) IVA sobre la utilidad**: F-1083 (ET 462-1, premisa corregida), F-1084 (Decreto 1625 art. 1.3.1.7.9), F-1113 (Oficio DIAN 16896 de 2026), F-1118 (ET 468, tarifa 19 %).
- **(3) Precio de ítems no previstos**: F-1096 y F-1097 (C-1205), F-1077 y F-1079 (nota 2 del APU del Formulario 1), F-1101 (C-916, mayores cantidades frente a obras adicionales; cambio de línea), F-1102 (C-1411, reajuste), F-1100 (C-1120), F-1110 (Consejo de Estado, precios unitarios y riesgos).
- **(4) Topes por precio unitario frente al oficial**: F-1070 (v4) y F-1075 (social v2): la causal es opcional y por ítems nombrados por la entidad; F-1105 (la guía 2025 no deja alterar las causales).
- **(5) Concurso de méritos (texto vigente) y mínima cuantía**: F-1093 (Decreto 399 art. 2), F-1085 a F-1088 y F-1117 (documentos tipo de interventoría y consultoría: el precio no puntúa, «oferta acorde con el presupuesto oficial», exceder el presupuesto solo rechaza si no se subsana), F-1094 (Decreto 1860 de 2021), F-1103 y F-1104 (invitaciones tipo de mínima cuantía), F-1114 a F-1116 (resoluciones).
- **(6) AIU en méritos e interventoría**: F-1092 (Formulario 1 de interventoría: factor multiplicador, sin AIU, IVA 19 %), F-1089 (C-008 de 2026: el factor multiplicador y los costos reales soportados), F-1098 y F-1099 (C-1407: el AIU no está regulado, lo fija el proponente, se mantiene invariable salvo prórroga excepcional), F-1111 (Consejo de Estado 2011: qué es el AIU, sin mínimos ni máximos).
- **Cobertura de estudios previos (rehecha)**: F-1091 (Decreto 399 art. 1), F-1090 (C-413 de 2026), F-1095 (Decreto 0997 arts. 7, 13 y 14).

## Rehechas (decisión D13) — para que la sesión principal añada `rehecha_por` en las fichas viejas

Este lector no modificó ninguna ficha fuera de su rango. Pendiente de la sesión principal, en la ficha vieja solo `rehecha_por`:

| Ficha vieja | Ficha nueva | Qué cambió |
|---|---|---|
| F-046 | F-1091 | El numeral 4 del art. 2.2.1.1.2.1.1 vigente (Decreto 399 de 2021, art. 1) ya no prohíbe publicar las variables del valor estimado en el concurso de méritos; el Decreto 0997 de 2026 art. 7 lo vuelve a sustituir sin tocar ese numeral (F-1095) |
| F-048 | F-1093 | El procedimiento del concurso de méritos desde abril de 2021 son tres numerales (criterios, informe de evaluación de tres días hábiles, adjudicación al mayor puntaje); desaparecieron la revisión del rango del valor estimado, la negociación con el primero y el paso al segundo |
| F-049 | F-1094 | Texto del Decreto 1860 de 2021 art. 2 (subsanación, informe de un día hábil mínimo, desempate por el art. 35 de la Ley 2069 de 2020); los Decretos 142 de 2023 y 0997 de 2026 solo tocan el art. 2.2.1.2.1.5.1 |
| F-054 | F-1071 | El AIU de obra se lee ahora en el documento base v4 (Resolución 465 de 2024), no en la guía de la v3: techo del Formulario 1, A, I y U libres, rechazo si la suma lo supera |

Las fichas F-067, F-068 y F-076 son del lente académico y no se tocaron. La cifra recalculada de F-067 pertenece a ese lector.

## Problemas candidatos (título · etapa · decisión · tipo de contrato · fichas · consecuencia en plata · señal en SECOP II)

1. **El método de puntaje del precio se conoce después de ofertar y depende de los centavos de la TRM, que se toma del día hábil siguiente o del segundo día hábil según la hora del pronunciamiento.** · E2 · D2 · obra · F-1061, F-1062, F-1063, F-1073 · Plata: la fuente no la cuantifica; cada método reparte ~48,5 puntos de 100 (F-1078) y la regla de 25 centésimos por método es aritmética del lector, no de la fuente. · Señal: no detectable en datos abiertos (el método y la TRM aplicada constan en el acta de audiencia y en el informe de evaluación; no se consultó datos.gov.co en esta corrida).
2. **Rechazo por tocar el Formulario 1, por un precio unitario en cero o por superar el tope de ítems que la entidad nombre en el pliego, aunque el total sea menor al presupuesto oficial.** · E2 · D3 · obra · F-1070, F-1075, F-1105 · Plata: pérdida de la oferta; la fuente no da cifra. · Señal: no detectable en datos abiertos; está en el informe de evaluación (PDF).
3. **Valor del Formulario 1 frente al valor cargado en SECOP II: en transporte v4 manda SECOP II; en infraestructura social v2 lo decide cada entidad en una Nota 5 del pliego.** · E2 · D3 · obra · F-1106, F-1107 · Plata: un error de digitación en la plataforma manda sobre el Excel; sin cifra de la fuente. · Señal: no detectable (solo comparando la oferta cargada con el archivo).
4. **La corrección aritmética arregla operaciones y redondeo al peso; un concepto de mayo de 2026 dice que se corrigen total y unitarios, y el documento tipo rechaza al que cambie ítems o cantidades.** · E2 · D3 · todos · F-1068, F-1108, F-1070 (más F-058 del piloto) · Plata: la fuente no la da. · Señal: no detectable.
5. **IVA de obra: se grava la utilidad del constructor, no todo el contrato, salvo mantenimiento; un precio armado con otra base cambia la utilidad neta.** · E2 · D2 · obra · F-1084, F-1113, F-1083, F-1118 · Plata: la fuente no la da; el documento tipo ni siquiera fija el IVA del precio unitario (la entidad debe discriminar impuestos, documento base 4.1). · Señal: no detectable.
6. **Precio de ítems no previstos: no hay método ni porcentaje de AIU en el documento tipo; solo la nota 2 del APU (insumos y tarifas de la oferta inicial) y el concepto C-1205 (el precio se acuerda y supone análisis de costos).** · E4 · D2/D4 · obra · F-1096, F-1077, F-1079, F-1112 · Plata: la fuente no la da. · Señal: parcialmente detectable por comparación de valor inicial y valor final del contrato en SECOP II, sin saber si fue ítem nuevo o cantidad (sin verificar el conjunto de datos).
7. **Mayores cantidades se pagan al precio ofertado y, desde el C-916 de julio de 2026, no consumen el tope del 50 % de la Ley 80; el APU es de quien oferta y sus errores son suyos.** · E4 · D4 · obra · F-1101, F-1072, F-1097, F-1110 · Plata: la fuente no da cifra. · Señal: parcialmente detectable (variación del valor del contrato), sin verificar.
8. **En interventoría y consultoría el precio no puntúa y la oferta debe estar «acorde con el presupuesto oficial»; exceder el presupuesto o no aplicar el factor multiplicador solo rechaza si no se subsana; el consultor ya puede auditar el cálculo del presupuesto (Decreto 399).** · E2 · D2 · interventoria y consultoria · F-1085, F-1086, F-1088, F-1117, F-1093, F-1091, F-1090 · Plata: el puntaje se reparte en experiencia (67,5) y equipo (10). · Señal: plausible por la relación valor adjudicado sobre valor estimado en procesos de concurso de méritos; sin verificar.
9. **Factor multiplicador de la interventoría: la entidad puede exigir soportes de costos reales y devolver el saldo no ejecutado.** · E4 · D4 · interventoria · F-1089, F-1092 · Plata: la fuente no la da. · Señal: no detectable.
10. **El AIU de obra no tiene mínimo ni máximo legal; el techo es el del Formulario 1, el AIU ofertado no se revisa en la ejecución salvo prórrogas excepcionales por causa de la entidad, y la Administración se desglosa solo al adjudicatario.** · E2/E4 · D2 · obra · F-1071, F-1074, F-1098, F-1099, F-1111 · Plata: la fuente no la da. · Señal: no detectable.
11. **Un precio artificialmente bajo se juzga después de abrir el Sobre 2 y antes de aplicar el método; no responder es rechazo.** · E2 · D3 · todos · F-1069, F-1109 · Plata: pérdida de la oferta; el documento tipo no fija un umbral numérico (el 20 % del piloto viene de la guía, F-050). · Señal: no detectable.

## Temas cubiertos y sin cubrir

**Cubiertos**: (1) documento base v4 y social v2 (numeral de la oferta económica, lista literal de métodos, TRM, corrección aritmética, causales económicas); (2) IVA sobre la utilidad (con premisa corregida); (3) precio de ítems no previstos; (4) topes por precio unitario; (5) concurso de méritos con el texto vigente y mínima cuantía; (6) AIU en méritos e interventoría; rehechas F-046, F-048, F-049 y F-054.

**Sin cubrir o cubiertos a medias**:
- Fórmulas del documento base social v2: se leyó la estructura y la lista de métodos; las ecuaciones de social no se compararon una por una con las de v4.
- Documentos tipo de selección abreviada de menor cuantía (transporte v3, social v1): no abiertos.
- Resoluciones 541 y 952 de 2025 (PDF) y la Guía SECOP II de licitación de obra: no abiertas.
- Etiqueta de versión de la consultoría social: el archivo se llama «ConV2» y la página de control de versiones dice V.1 (F-1117, F-1080).
- Fecha de publicación del Decreto 0997 de 2026 en el Diario Oficial: no se encontró; de ella depende desde cuándo rige cada artículo de forma progresiva (F-1095).
- Precio de ítems no previstos: no existe norma que fije un método; no hay fuente sobre quién asume el AIU del precio nuevo.
- Concepto C-624 de 2025, SU-214 de 2022, sentencia de 2008 sobre precio artificialmente bajo y Concepto DIAN 3524 de 2025: citados por otras fuentes, no leídos a fondo.
- Tema (3), contradicciones entre conceptos de Colombia Compra (C-916 frente a la doctrina anterior) quedan para la verificación adversaria.

## Incidencias

- Las páginas de documentos tipo y relatoría se arman con JavaScript; lo que funcionó fue la API de WordPress (`/wp-json/wp/v2/pages?slug=`, `/media?search=`, `/conceptos?search=`, `/providencias?search=`) y las URL `/documentos-tipo/vigentes/?sector=…&nodo=…`.
- Las URL `/documentos-tipo/descarga/<id>/` redirigen (301) a la misma ruta sin barra final; se anotó `url_final`.
- Los .docx de los documentos tipo traen ecuaciones OMML: se linealizaron con un script del lector (valor absoluto como barras). Las fichas de fórmulas lo declaran.
- Tres resoluciones en PDF (539, 725, 726) son escaneos sin capa de texto; se leyeron con `pdftoppm` y `tesseract -l spa` y las fichas lo dicen.
- En el documento base v4 el ítem de la causal «exceda el presupuesto oficial» y el de «tachaduras o enmendaduras» aparecen fundidos en un solo párrafo numerado: las causales se localizan por texto, no por letra.
- Los textos de la Relatoría de Colombia Compra para los conceptos son extractos de descriptores; el .docx adjunto trae el texto completo y a veces difiere en la redacción; las citas se tomaron del .docx cuando existía.
- Sin datos personales: de los conceptos y sentencias se guardó número, fecha y hecho; no se copiaron nombres de consultantes, firmantes ni partes de los procesos.
- La grafía antigua de la marca no aparece en ningún archivo escrito (verificado con grep).
