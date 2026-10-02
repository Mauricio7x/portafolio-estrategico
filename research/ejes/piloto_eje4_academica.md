# Piloto eje 4 (RUP, experiencia, capacidad residual, plurales, UNSPSC) · lente académica

> Para: sesión · Estado: nota de agente lector del piloto · Sustituido por: —

- **Agente**: lector eje4-academica. **Fichas**: F-021 a F-040 (20 de 20 ids), en `research/fichas/`.
- **Inicio UTC**: 2026-10-02T03:20:49Z · **Fin UTC**: 2026-10-02T03:39:52Z (unos 20 minutos de reloj; no se llegó al tope de 90 minutos: el límite que mordió fue el de 12 fuentes y el de 20 ids).
- Todo JSON se validó con `node -e 'JSON.parse(...)'`, contra los campos y valores de `ESQUEMA_FICHA.json`, y cada `cita_textual` y cada cita de `notas` se comprobó como subcadena literal del texto descargado (`pdftotext` o HTML de la relatoría) antes de guardar. No se escribió `verificacion_adversaria`.

## 1. Fuentes intentadas y abiertas, por tipo

| Tipo | Intentadas | Abiertas y leídas | Con ficha |
|---|---|---|---|
| decreto | 1 | 1 | F-021 a F-024 |
| cce_guia | 3 (2 guías + 1 cotejo de la guía UNSPSC) | 2 | F-025 a F-028 |
| academia | 22 | 9 | F-029 a F-040 (8 trabajos; el noveno, Cerón 2022, quedó sin ficha por el tope de ids) |
| **Total** | **26** | **12** | **11 fuentes con ficha** |

Abiertas con lectura (URL exacta que respondió):

1. Decreto 0997 de 2026, relatoría de Colombia Compra: https://relatoria.colombiacompra.gov.co/normativa/decreto-0997-de-2026/ (HTTP 200; lectura parcial: título, considerandos del RUP, arts. 1 a 8 y art. 14)
2. Guía de capacidad residual v01 del 29-sep-2023: https://www.colombiacompra.gov.co/wp-content/uploads/2024/08/2023-Guia-para-determinar-y-verificar-la-Capacidad-Residual-del-proponente-en-los-Procesos-de-Contratacion-de-obra-publica-CCE-REC-GI-22.pdf
3. Guía UNSPSC (G-CBS-02): https://www.colombiacompra.gov.co/wp-content/uploads/2025/05/Guia-de-Codificacion-ByS-V3-2026-Final.pdf (y, para cotejo, la URL «…G-CBS-02-V2-MAR2026.pdf»)
4. Henao y López 2021, Revista Sinergia (AmeliCA): https://portal.amelica.org/ameli/journal/675/6753947007/6753947007.pdf
5. Carrillo Torres 2018, UPB Bucaramanga: https://repository.upb.edu.co/server/api/core/bitstreams/513cfe4e-06c8-457d-954c-aeb258eacd30/content
6. Betancur, Calderón y Marín 2023, Ratio Juris (Redalyc): https://www.redalyc.org/journal/5857/585781460013/585781460013.pdf
7. Otálora Daza 2015, Revista de Derecho Privado de Los Andes (Redalyc): https://www.redalyc.org/pdf/3600/360043572006.pdf
8. Cadena Ávila 2015, tesis Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/b140c93d-c548-45aa-adf7-391b6c6708ee/content
9. Núñez Aldana 2022, tesis Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/69a44334-a06d-444f-b66a-e502dd35f321/content
10. Valencia Rodríguez 2019, tesis Nacional (Medellín): https://repositorio.unal.edu.co/bitstream/handle/unal/76110/1152446026.2019.pdf?sequence=1&isAllowed=y
11. Osorio Gutiérrez 2018, Advocatus (Dialnet): https://dialnet.unirioja.es/descarga/articulo/7021703.pdf
12. Cerón Castañeda 2022, Uniandes (sin ficha, ver § 5): https://repositorio.uniandes.edu.co/server/api/core/bitstreams/14bb448f-0e6f-404a-a114-c45dea9a7c54/content

Descargadas y hojeadas solo para triage, **sin ficha** (cabecera, resumen o búsqueda de términos; cuentan como intentadas, no como lectura): Álvarez Acevedo 2012 (Verba Iuris 27, capacidad procesal de consorcios; fuera de tema y anterior a 2018), Quiñones (Dialnet 5979000, rasgos distintivos de consorcio y unión temporal; sin pasaje sobre experiencia o RUP en la búsqueda), Ríos Parra 2017 (Lámpsakos 18, mínima cuantía; Dialnet 6551470), Católica del Norte (Redalyc 194252398002; solo cabecera), Benavides 2009 (Redalyc 503856222002; solo la mención de capacidad residual), Díaz Jiménez 2020 (Uniandes, competencia en vías primarias; modelo estadístico, sin pasaje normativo útil), Gallego Peláez 2016 (Uniandes, subsanabilidad; descargada, no leída), Dialnet 7513032 (planeación en obra pública; descargada, no leída).

## 2. No abiertas, con el error literal

| URL o recurso | Resultado literal |
|---|---|
| http://www.scielo.org.co/pdf/rium/v20n39/1692-3324-rium-20-39-213.pdf (2 intentos) | HTTP 503; cuerpo: «upstream connect error or disconnect/reset before headers. retried and the latest reset reason: connection timeout» |
| https://search.scielo.org/?q=%22registro+%C3%BAnico+de+proponentes%22… | HTTP 403; cuerpo: «Establishing a secure connection ...» (página de desafío) |
| https://repository.eafit.edu.co/server/api/core/bitstreams/fedd3c3c-08a5-44a7-af0a-1e782d1789e1/content y …/2b65cbd1-8e9c-420a-aa39-4be665bb5fe2/content | HTTP 200 con página de bloqueo: «Request unsuccessful. Incapsula incident ID: 1016000071954351665-1141357640236401139» (se reintentó una vez, igual) |
| https://bdigital.uexternado.edu.co/server/api/core/bitstreams/786285f9-8e93-4331-9556-c279e67bdb63/content | HTTP 200 text/html de 12.582 bytes, título «Bot Detection», descripción «Please prove that you are Human before accessing this website» |
| https://repository.uexternado.edu.co/ | «curl: (56) CONNECT tunnel failed, response 502» |
| https://repository.usergioarboleda.edu.co/ (y su API de búsqueda) | HTTP 200 text/html con título «Making sure you're not a bot!» (desafío anti-robot) |
| https://repository.javeriana.edu.co/server/api/discover/search/objects?… | HTTP 200 text/html: devuelve la carcasa Angular de DSpace (`<ds-app></ds-app>`), no JSON; no hay búsqueda programática disponible |
| https://repositorio.unal.edu.co/discover?query=… | HTTP 404 text/html (el repositorio sí entrega ficheros por la URL `bitstream/handle`, así se abrió Valencia 2019) |
| https://repository.upb.edu.co/server/api/discover/search/objects?query=registro… (segunda consulta) | «curl: (35) Recv failure: Connection reset by peer» (la primera consulta a UPB respondió) |
| https://www.redalyc.org/pdf/1514/151468724003.pdf | HTTP 404; «Error 404: java.io.FileNotFoundException: SRVE0190E: File not found: /pdf/1514/151468724003.pdf». Esa URL la construí yo desde el id del artículo (el buscador dio otra forma, `/journal/1514/151468724003/movil/`); no se usó ni como fuente |

Medio de descubrimiento: WebSearch (con y sin filtro de dominios) y, donde el repositorio es DSpace 7 y respondió JSON (Uniandes, UPB, Militar), su API de búsqueda. En Militar los resultados sobre «capacidad residual» y «RUP» eran trabajos de 2011 a 2017 y no se abrió ninguno; de Uniandes se abrieron los indicados en el § 1. No se usó WebFetch.

## 3. Problemas candidatos (los sostienen las fichas indicadas; ninguno está verificado por la Fase 3)

| # | Título | Etapa | Decisión | Tipo de contrato | Fichas | Consecuencia en plata, si la fuente la da |
|---|---|---|---|---|---|---|
| 1 | Caución para impugnar un RUP: antes 8% del K o del capital de trabajo del impugnado (decretos derogados), ahora 10% de la utilidad operacional del inscrito | E0 | D3 | todos | F-021, F-031 | 10% de la utilidad operacional reportada en el último registro (1% de los ingresos operacionales si no hay utilidad positiva), vigente hasta un año tras la decisión (F-021) |
| 2 | Reforma 0997: la «transición» es por tipo de entidad (6, 9, 12 o 15 meses) y los Documento Tipo quedan con las reglas anteriores hasta que Colombia Compra los modifique | E0 | D3 | todos | F-022, F-024 | ninguna en la fuente |
| 3 | Multas, sanciones e inhabilidades visibles en el certificado del RUP (multas un año; inhabilidad civil 10 años desde la ejecutoria) | E0 | D3 | todos | F-023 | ninguna en pesos; plazo de 10 años de inhabilidad (F-023) |
| 4 | Capacidad residual de un consorcio: suma de los integrantes sin ponderar por participación; la de un socio negativa se resta | E2 | D1 | obra | F-027, F-025, F-026 | K del proceso = presupuesto oficial menos anticipo (proporcional a 12 meses); el K del plural es la suma, y un socio con K negativa lo reduce (F-026, F-027) |
| 5 | En un plural, la experiencia sí se pondera por participación (y entra al K con su participación) pero la capacidad residual no: dos reglas distintas que se confunden | E2 | D1 | obra | F-027, F-035 | ninguna en la fuente |
| 6 | Indicadores financieros de un plural: tres lecturas (todos cumplen cada uno; suma según participación; cálculo independiente) | E2 | D1 | todos | F-034, F-036 | ninguna en la fuente |
| 7 | Experiencia de un integrante: consorcio vale por el total y unión temporal por su porcentaje, según un autor; el pliego debe fijarlo | E2 | D1 | todos | F-035 | ninguna en la fuente |
| 8 | Renovación del RUP a más tardar el quinto día hábil de abril; si no, cesan los efectos; una devolución sin corregir en 30 días también los hace cesar | E0 | D3 | todos | F-030 | ninguna directa (pérdida de efectos del RUP) |
| 9 | Plazo del recurso contra la inscripción en el RUP: 30 días (artículo de 2018) frente a 10 días hábiles (considerando del Decreto 0997) | E0 | D3 | todos | F-031 | ninguna en la fuente |
| 10 | Pliegos con requisitos de un decreto derogado (experiencia probable en puntos, Decreto 734 de 2012) | E2 | D3 | obra | F-034, F-032 | ninguna en la fuente |
| 11 | Indicadores financieros desproporcionados que reducen la pluralidad (liquidez; capital de trabajo mayor o igual al 150% del presupuesto con pago por actas) | E2 | D1 | obra | F-029, F-033 | capital de trabajo exigido de 150% del presupuesto oficial en un proceso de 2013 (F-033); cada unidad de liquidez baja 0,105 la probabilidad de pluralidad según un logit (F-029) |
| 12 | Experiencia con contratos de particulares: debe aceptarse, pero solo cuenta si está inscrita en el RUP con códigos del clasificador | E2 | D3 | todos | F-037, F-028, F-033 | ninguna en la fuente |
| 13 | RUP no exigido (contratación directa, mínima cuantía, concesión, etc.): la entidad verifica o define cómo se acredita | E2 | D3 | todos | F-032, F-030, F-037 | ninguna en la fuente |
| 14 | Definición errónea de capacidad residual en una tesis (cociente) frente a la Guía (diferencia) | E2 | D3 | obra | F-038, F-025 | ninguna en la fuente |
| 15 | Guía UNSPSC: rótulo «V3» en el archivo y «VERSION 2» en el texto; sin reglas de códigos deshabilitados ni equivalencias; no dice qué versión usa el RUP | E0 | D3 | todos | F-028 | ninguna en la fuente |
| 16 | Concurso de méritos: la experiencia puntúa y el precio no es factor de escogencia | E2 | D3 | consultoría (la tesis no distingue interventoría) | F-039 | ninguna en la fuente |
| 17 | Matriz de Experiencia: exigencia adicional de un contrato en madera, guadua o bahareque en edificaciones de esos materiales | E2 | D3 | obra | F-040 | ninguna en la fuente |

## 4. Lo que la sesión debe saber antes de usar las fichas

- **Premisa del encargo contrastada**: el Decreto 0997 de 2026 (texto de la relatoría) no trae un régimen de transición propio del RUP. Su art. 14 escalona la entrada en vigor por tipo de entidad, y solo los arts. 2, 3, 8 y 11 rigen al día siguiente de la publicación en el Diario Oficial. Lo que toca al RUP es el art. 2 (caución de la impugnación) y el art. 3 (permanencia de multas, sanciones e inhabilidades en el certificado). En el texto leído no aparecen los números de artículo de la inscripción, la renovación ni el cálculo de la capacidad residual (búsqueda de texto, cero coincidencias; los artículos 9 a 13 se leyeron solo en parte).
- **Fecha y número del Diario Oficial del Decreto 0997: sin verificar.** La relatoría transcribe el decreto con el día de «Dado en Bogotá» en blanco; el adjunto se titula «…DEL 4 DE AGOSTO DE 2026.pdf» y la página muestra un rótulo 13/08/2026 sin explicar. Las fichas de la reforma llevan en `vigencia_verificada` la relatoría como fuente y dicen que no se abrió el Diario Oficial.
- **Todas las fichas académicas (A6) dicen lo que el trabajo dice**, no lo que la norma dice. Varias reproducen textos de Colombia Compra o de leyes de segunda mano (Otálora cita el Manual; Betancur cita la Ley 1882 y a Colombia Compra; Osorio y Henao citan la Ley 1150). Ninguna está cotejada con el texto primario; todas llevan «[sin verificar]» con el motivo.
- **Anteriores a la reforma (reverificar)**: todas las académicas son anteriores al Decreto 0997 de 2026; las de 2015 a 2019 son además anteriores a la Ley 2022 de 2020 y a las versiones actuales de los documentos tipo.
- **Guía de capacidad residual**: el documento se rotula «CCE-REC-GI-22» en el pie y «CCE-EICP-GI-22» en el encabezado (el encargo usa el segundo). Es la versión 01 del 29-sep-2023; no se verificó si hay una posterior.
- **Guía UNSPSC**: el encargo la llama «V3 2026» (como el nombre del archivo), pero el documento dice «G-CBS-02 – VERSION 2 – MARZO 2026» y declara la versión UNv260801 del 18-mar-2025 como la implementada en Colombia Compra.

## 5. Lo que quedó sin cubrir

- **(a) RUP**: firmeza del acto de inscripción y sus plazos con texto de ley o decreto (solo un artículo de 2018 y un considerando de 2026, que difieren: 30 días contra 10 días hábiles); quién debe inscribirse y las excepciones por modalidad con el texto de la Ley 1150 de 2007, art. 6, y del Decreto 1082 de 2015 (solo citas de segunda mano); qué acredita el RUP en el texto vigente del Decreto 1082 (art. 2.2.1.1.1.5.3, no abierto); el texto del Diario Oficial del Decreto 0997. Salvo Betancur 2023, de pasada, ninguna fuente académica abierta trata el RUP después de 2021.
- **(b) Experiencia**: la Matriz de Experiencia misma de los documentos tipo (solo lo que dice una tesis); experiencia en el concurso de méritos de interventoría con un documento tipo (solo la regla general); el texto del parágrafo 5 de la Ley 1882 de 2018. En las búsquedas hechas no apareció una tesis o artículo indexado que trate la experiencia en consultoría o interventoría con detalle.
- **(c) Capacidad residual**: la Guía se leyó hasta §9.2; faltan CF (§9.3), CT (§9.4), saldo de contratos en ejecución (§9.5, con y sin suspensión), extranjeros (§10) y el ejemplo (§12). Ninguna fuente académica abierta calcula la capacidad residual correctamente (la única que la define lo hace mal: F-038).
- **(d) Plurales**: porcentaje mínimo de participación, documento de conformación (más allá de la propuesta de Otálora) y cuenta en SECOP II: sin fuente abierta. Cómo se juzgan los indicadores de un plural: solo lo que Otálora dice del Manual y una afirmación contradictoria de Carrillo.
- **(e) UNSPSC**: códigos deshabilitados, equivalencias entre versiones y versión vigente en SECOP II y en el RUP: la guía abierta no los trata; ninguna fuente académica abierta los trata (la búsqueda de repositorios no arrojó trabajos sobre UNSPSC distintos de mínima cuantía de 2017).
- **Repositorios bloqueados o sin búsqueda**: Javeriana, Externado, Sergio Arboleda, EAFIT, SciELO Colombia y UIS (la búsqueda en UIS devolvió solo prácticas empresariales ajenas); ver § 2.
- **Afirmación sostenida pero sin ficha por el tope de 20 ids**: Cerón Castañeda 2022 (Uniandes, https://repositorio.uniandes.edu.co/server/api/core/bitstreams/14bb448f-0e6f-404a-a114-c45dea9a7c54/content), pdf p. 3: «el documento tipo definido para el análisis de la capacidad financiera, limita al oferente a cinco (5) indicadores» y su tabla «Índice de liquidez >1 Índice de endeudamiento < 70% Razón de cobertura de intereses >1 Rentabilidad del patrimonio >0 Rentabilidad del activo >0», atribuida por el autor a Colombia Compra Eficiente 2021 y a la Resolución 1798 de 2019 para obra pública de infraestructura de transporte. Es lo que el trabajo dice (A6, no cotejado con el documento tipo, posiblemente desactualizado); su tesis central (un modelo de predicción de quiebras) es una propuesta del autor, no una regla.
- Afirmaciones menores solo en `notas`: ver F-022 (escalones de 9, 12 y 15 meses), F-024 (art. 8 sobre el nivel del clasificador en el pliego) y F-029 (cifras adicionales de la tesis de la Nacional).

## 6. Ritmo del piloto (para el PC1)

- 20 fichas de 11 fuentes con ficha (12 abiertas con lectura) en unos 20 minutos de reloj. El tiempo se fue sobre todo en localizar, descargar y convertir; la mayor parte de las fuentes académicas útiles salió de dos vías: el buscador web con filtro de dominios y la API de búsqueda de DSpace 7.
- El esfuerzo de verificación de citas (comprobar cada cita como subcadena literal del texto convertido) corrigió cuatro citas que no casaban por maquetación a dos columnas (se resolvió usando `pdftotext -raw` en vez de `-layout`). Sin esa comprobación habría entrado texto reordenado.
- Tokens: no medidos desde este agente.
