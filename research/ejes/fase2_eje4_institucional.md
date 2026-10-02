# Fase 2 · eje 4 (RUP, experiencia, capacidad residual, plurales y UNSPSC, segunda vuelta) · lente institucional

> Para: sesión · Estado: nota de agente de la Fase 2 (2-oct-2026) · Sustituido por: —

Agente: «lector fase2 eje4-institucional». Rango F-0461 a F-0520: el rango estaba vacío al empezar (reanudación sin fichas previas). Escritas **57 fichas, F-0461 a F-0517** (quedaron libres F-0518 a F-0520). Ninguna lleva `verificacion_adversaria`. No se tocó ningún otro archivo del repositorio.

## 1. Tiempos

- Inicio UTC: **2026-10-02T13:27:58Z**.
- Fin UTC: **2026-10-02T13:58Z** (último `date -u` consultado a las 13:57:30Z, al terminar de escribir esta nota).
- Las citas de las fichas se verificaron por programa contra el texto descargado (normalizado: espacios, comillas, ligadura «fi») antes de guardar cada archivo; 3 citas se corrigieron por esa vía (columnas intercaladas de una tabla, comillas) y varias fichas se editaron después para corregir una afirmación (páginas, un rango de cifras, una nota sin sustento).

## 2. Fuentes por tipo (claves de la taxonomía)

Abiertas (se descargó y se leyó, entera o por partes; «con ficha» = al menos una ficha):

| Tipo | Abiertas | Con ficha | Qué |
|---|---|---|---|
| ley | 3 | 3 | D.L. 19 de 2012 art. 221 y Ley 1150 (alcaldiabogota, régimen legal con notas de vigencia), Ley 2080 de 2021 art. 87 (relatoría) |
| decreto | 3 | 1 | Decreto 997 de 2026 en Bogotá (ficha F-0505); PDF de DAPRE del 0997 (releído, solo art. 14); Decreto 287 de 2026 (relatoría; trata preferencias de discapacidad, sin ficha) |
| doc_tipo | 6 | 6 | zips de Colombia Compra: transporte licitación v4 (29920), interventoría v3 (29953), consultoría v2 (29824), social licitación v2 (29837), social interventoría v2 (29844, abierto, sin ficha propia); Resolución 726 de 2024 (PDF escaneado, leído por OCR) |
| cce_guia | 27 | 14 | guía de capacidad residual (página oficial), manual de requisitos habilitantes v3 (2023), guía de codificación UNSPSC (releída), ABC del 0997 (releído), memoria de revisión de capacidad financiera (zip 29921) y tres zips hermanos vacíos (29922, 29923, 29926), borrador de guía de implementación de los DT de transporte, Guía de contratación de obra pública 2026 (136 págs., solo búsqueda de palabras, sin ficha), comunicado de renovación del RUP, 3 preguntas frecuentes, 2 convocatorias de participación ciudadana, 10 circulares externas 2025-2026 (solo asunto, sin ficha), Formato 5 xlsx |
| cce_concepto | 162 textos bajados por la API de la relatoría (tres búsquedas), 17 leídos en su cabeza | 12 | C-1299, C-1101, C-1253, C-1214, C-1008 (capacidad residual); C-1196 (dos fichas), C-1295, C-1275 (experiencia); C-1271, C-1189 (RUP, UNSPSC); C-1258 (plurales). Otros leídos sin ficha por repetir: C-1215, C-1130, C-943, C-1114, C-1303, C-1206, C-1289, C-1125, C-1232, C-1104 |
| juris | 11 | 2 | Consejo de Estado, Sección Tercera, Subsección A: sentencia del 1-sep-2025 (firmeza del RUP) y del 13-feb-2026 (experiencia de socios); 9 providencias más leídas en su tesauro y descartadas |
| dato | 12 | 5 | control de versiones de Documentos Tipo; ventana de métricas UNSPSC; codigos.csv (zip de 243 MB descomprimidos, 149.850 filas); datos abiertos p6dx-8zbt y hgi6-6wh3 por consultas GET agregadas (8 consultas); listado de la API de releases de aplicaciones; página de RUES (aplicación de una sola página de 4 KB, sin contenido legible) |
| practica | 1 | 0 | blog de una firma de abogados sobre el 0997 (solo como pista para la fecha de publicación; sin la fecha) |
| internacional, control, gremio, academia | 0 | 0 | fuera de la lente institucional de este reparto |

Total abiertas con contenido leído: unas 65 (sin contar los 162 conceptos de la búsqueda); intentadas: unas 75.

### No abiertas o sin contenido (con el error literal)

| Fuente | Motivo |
|---|---|
| https://www.colombiacompra.gov.co/secop/release-de-aplicaciones-del-secop | abre (200) pero se arma por JavaScript: solo trae la ventana «Métricas de la nueva Versión» del UNSPSC (sin fecha) y dos comunicados de «Prueba»; la lista de releases salió de la API `release-aplicacion` (último: dic-2025, sin mención del UNSPSC) |
| https://www.colombiacompra.gov.co/secop/consulta-rup y https://www.colombiacompra.gov.co/consulta-rup | HTTP 404 |
| https://www.colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo-v2 | HTTP 404 |
| https://www.colombiacompra.gov.co/documentos-tipo/vigentes/ y .../proyectos-documentos-tipo | abren (200) pero sin listado (JavaScript) |
| https://www.rues.org.co/ y /RUP | HTTP 200, 4.304 bytes: aplicación de una sola página; la consulta pública del RUP es por formulario (POST), «no consultable desde aquí» |
| Diario Oficial / Imprenta Nacional | buscador por formulario (POST): no consultable desde aquí; sin la fecha de publicación del Decreto 0997 |
| zips 29922, 29923 y 29926 («Revisión capacidad financiera» de social y agua) | HTTP 200, pero solo traen archivos de sistema (.DS_Store), sin documento |
| tuits y enlaces SUCOP que citaron los buscadores (x.com, sucop.gov.co) | no se abrieron (x.com no es fuente; el borrador de la guía de capacidad residual en SUCOP no se descargó) |
| Guía de contratación de obra pública 2026 (136 págs.) | abierta pero de dos columnas con texto intercalado: se buscó por palabras y no se ficha (las citas literales no son fiables) |

## 3. Cobertura de la lista del eje (cerrada)

| # | Tema | Resultado | Fichas |
|---|---|---|---|
| 1 | Fecha de publicación del Decreto 0997 en el Diario Oficial | **SIN COBERTURA.** La ficha de Bogotá deja vacíos «entrada en vigencia» y «medio de publicación»; el decreto, DAPRE y el ABC solo dicen «a partir del día siguiente a su publicación en el Diario Oficial». Sin esa fecha no se calculan los plazos de 6, 9, 12 y 15 meses | F-0505 |
| 2 | Versión del UNSPSC en SECOP II y el RUP | **PARCIAL.** La agencia declara UNv260801 (18-mar-2025) en su guía de marzo de 2026 y el catálogo descargable (25-feb-2026) está en esa versión; pero un concepto de septiembre de 2026 cita la guía como «V.14.080», los datos abiertos de procesos siguen con «V1.<código>» y desde el 16-sep-2026 casi todos los procesos nuevos llegan sin código. Desde cuándo está activa la versión en SECOP II y en el RUP: sin fuente | F-0467, F-0491, F-0506, F-0507 (y F-019, F-020 del piloto) |
| 3 | Códigos deshabilitados y equivalencias | **PARCIAL.** Deshabilitados: se cotejó (por GET) el catálogo nuevo contra los códigos que el módulo de métricas marca como deshabilitados (no están en el archivo) y se midió que siguen apareciendo en procesos publicados hasta 2026. **Equivalencias (por qué código se reemplaza cada uno): sin cobertura**, no hay tabla abierta por GET | F-0467, F-0507 |
| 4 | Ley 1150 art. 6, texto vigente (D.L. 19 de 2012 art. 221), plazo del recurso contra la inscripción | **CUBIERTO.** 10 días hábiles desde la publicación del acto de inscripción; reformas cotejadas: Ley 2080 de 2021 art. 87 (solo deroga «única instancia»); el Decreto 0997 de 2026 cambia la caución, no el plazo | F-0461 a F-0464 |
| 5 | Versión vigente de la guía de capacidad residual | **CUBIERTO** (con la salvedad de ausencia de evidencia): la página oficial dice «Última actualización 17/10/2023»; no hay guía posterior a la 01 de 2023. En 2026 salió el Formato 5 del paquete de agua (borrador V2), no una guía | F-0465 |
| 6 | Experiencia en concurso de méritos (interventoría y consultoría): fórmulas y tabla | **CUBIERTO** para transporte: interventoría v3 (Matriz 1, cortes por cuantía y complejidad, 100% del presupuesto como suma) y consultoría v2 (notas generales de fase, 100%, 67,50 puntos, efecto de subsanar). Social interventoría v2 y consultoría v1 (vigentes desde 16-feb-2026): zip abierto, **no leído** | F-0480 a F-0483 (y F-013 del piloto) |
| 7 | Indicadores financieros de los documentos tipo de obra v4 (umbrales) y de interventoría | **CUBIERTO**: obra v4 (Mipyme y no Mipyme, capital de trabajo, patrimonio), interventoría v3, consultoría v2, social licitación v2, y la revisión anual con porcentajes de cumplimiento. Agua V.1: no leído | F-0468 a F-0474, F-0484, F-0495, F-0475 a F-0479, F-0509 |
| 8 | RUP de persona natural y extranjera | **PARCIAL.** Extranjera sin domicilio ni sucursal: cubierto (no necesita RUP; estados financieros y Formato 4). Persona natural: solo su capacidad jurídica en el manual; los requisitos de inscripción no se leyeron en texto consolidado | F-0493, F-0497 |
| 9 | Renovación, firmeza y consulta pública del RUP (RUES) | **PARCIAL.** Renovación (quinto día hábil de abril) y firmeza cubiertas por concepto, comunicado y sentencia del Consejo de Estado. **Qué muestra la consulta pública (RUES): sin cobertura** (aplicación de una sola página con POST) | F-0466, F-0490, F-0498, F-0503, F-0504 |

## 4. Problemas candidatos que vio

Cada uno: título · etapa · decisión · tipo de contrato · fichas · consecuencia en plata si la fuente la da · señal observable en los datos abiertos de SECOP II.

1. **En obra grande el contratista solo no cumple el capital de trabajo ni el patrimonio: solo sirve el plural** · E2 · D1 · obra · F-0471, F-0472, F-0478, F-0479, F-0494, F-0508. Plata: cumpliría individualmente el 5,79% de la muestra en un proceso de 80.216 millones de pesos, el 2,64% en uno de 337.847 millones y el 1% en uno de 657.000 millones; capital de trabajo demandado de 26.738.986.877, 52.481.100.821 y 139.716.455.696 pesos y patrimonio de 84.461.771.634 y 164.250.000.000 en los dos últimos. Señal: en «Proponentes por Proceso» el nombre empieza por CONSORCIO en 43,1% de las filas de procesos de construcción, pavimento o interventoría de 2026 (heurística, no hay indicador de plural).
2. **El umbral financiero cambia con el sector, el tipo de contrato y el rango; usar uno solo habilita mal** · E2 · D3 · todos · F-0468 a F-0470, F-0473, F-0484, F-0495, F-0496. Plata: la fuente no la da. Señal: no detectable (el umbral exigido no está en los datos abiertos de SECOP II).
3. **Mipyme: umbral menor solo con RUP vigente y en firme y, en plural, con un integrante Mipyme de 10% o más** · E2 · D1 · obra, interventoría, consultoría · F-0470, F-0499, F-0517. Señal: no detectable.
4. **El patrimonio demandado del plural está mal redactado en el documento tipo (fórmula copiada del capital de trabajo) y solo trae la redacción para 40.000 SMMLV y 24 meses** · E2 · D3 · obra · F-0472. Señal: no detectable.
5. **Capacidad residual: omitir un contrato en ejecución (sin acta de inicio, suspendido, en el exterior) es motivo de rechazo aunque no cambie el cálculo** · E2 · D3 · obra · F-0485, F-0487, F-0515, F-0516, F-016 del piloto. Plata: la oferta completa. Señal: no detectable con los conjuntos de procesos; los contratos en ejecución por NIT existen en otros conjuntos de datos abiertos de contratación que no se consultaron.
6. **Capacidad residual de un plural: suma de los K (un K negativo resta) y experiencia ponderada por participación** · E2 · D1 · obra · F-0494. Señal: no detectable.
7. **Firmeza del RUP al cierre: el Consejo de Estado (Subsección A) exige inscripción en firme; Colombia Compra acepta ofertar sin firmeza pero no habilita; el recurso de 10 días con caución retrasa la firmeza** · E2 · D3 · todos · F-0461, F-0466, F-0490, F-0503. Plata: la caución del 0997 es 10% de la utilidad operacional del último registro del impugnado (1% de ingresos si no hay utilidad), según el piloto (F-004). Señal: no detectable.
8. **RUP que no se renueva antes del quinto día hábil de abril pierde efectos, y con él la experiencia heredada de socios de una sociedad nueva** · E2 · D3 · todos · F-0466, F-0490, F-0498, F-0503, F-0504. Señal: no detectable.
9. **Sociedad nueva: experiencia de los socios y retiro posterior del socio** (la entidad puede cuestionar el RUP vigente) · E2 · D1 · todos, con sentencia sobre un concurso de méritos · F-0488, F-0489, F-0498, F-0504. Señal: no detectable.
10. **Experiencia: autocertificación del propio grupo empresarial descartable y, en consultoría con documento tipo, subsanar la experiencia habilita pero hace perder el puntaje (hasta 67,50 puntos)** · E2 · D3 · consultoría, todos · F-0483, F-0511, F-0510. Señal: no detectable.
11. **UNSPSC: códigos deshabilitados en el catálogo nuevo que siguen en procesos y probablemente en la experiencia inscrita en el RUP; sin tabla de equivalencias abierta** · E0 · D3 · obra · F-0467, F-0507, F-0491, F-0502. Señal: observable (101 filas desde marzo de 2026 con códigos de la familia 7214 deshabilitados; 971 en total).
12. **Desde el 16-sep-2026 casi todos los procesos nuevos de SECOP II llegan con UNSPSC «UNSPECIFIED» en los datos abiertos** (96,8% en obra, 98% en interventoría): un filtro por código pierde los procesos nuevos; la causa no se estableció · E0 · D1 · todos · F-0506. Señal: observable (consulta GET con fecha y conteos en la ficha).
13. **Los documentos tipo están cambiando y la fecha de entrada en vigor del 0997 no se conoce**: social v2 desde 16-feb-2026, agua V.2 en borrador (comentarios hasta el 14-oct-2026), transición del art. 14 del 0997 sin fecha de publicación · E0/E1 · D3 · todos · F-0496, F-0512, F-0505, F-0514. Señal: no detectable.
14. **Las causales de rechazo de los documentos tipo son taxativas: la entidad no puede añadir otras, salvo la ley** · E2 · D3 · todos · F-0513, F-0516. Señal: no detectable.
15. **Proponente extranjero sin domicilio: sin RUP, con estados financieros convertidos y Formato 4; discrepancias favorecen a los estados financieros** · E2 · D3 · obra · F-0493, F-0497. Señal: no detectable.
16. **Descuidos de redacción en los documentos tipo y su memoria** (la Matriz 2 de consultoría habla de interventoría; la memoria rotula obra la sección de interventoría y da dos tamaños de muestra): generan observaciones y dudas · E2 · D3 · consultoría, interventoría · F-0484, F-0509, F-0477. Señal: no detectable.

## 5. Calidad y límites de lo leído (para la verificación adversaria)

- Las cifras de la revisión de capacidad financiera (F-0477, F-0509) son de la agencia, con muestras que ella misma cita con tamaños distintos (591 y 605; 392 y 364): no se repiten como tamaño de muestra.
- Los conceptos de la relatoría se leyeron por la API de WordPress (campo content), no por la página renderizada; son A5 y no vinculan. La jurisprudencia se leyó en el PDF de la sentencia.
- Las ecuaciones de los .docx salen aplanadas (capital de trabajo, CRPC): la lectura de la fórmula es del texto de apoyo y está marcada «sin verificar contra el Word original» en F-0471 y F-0474.
- Todas las fichas de documentos tipo son anteriores al Decreto 0997 de 2026 o contemporáneas; el art. 14 del decreto dice que los Documentos Tipo siguen vigentes hasta que Colombia Compra los actualice (F-006 y F-007 del piloto), pero con la fecha de publicación sin conocer no se puede decir desde cuándo empiezan a regir los demás artículos.
- Los conteos de datos abiertos (F-0506 a F-0508) son de filas del conjunto observadas el 2-oct-2026 mediante consultas GET reproducibles; no se recontó por proceso único.
- El directorio de trabajo temporal (/tmp/claude-0/w) parece compartido con otros agentes (se vieron archivos ajenos con nombres como dtcom.pdf); las citas de cada ficha se verificaron contra el texto en el momento de escribirla.

## 6. Cómo terminó

**Lista completa dentro de lo que las fuentes abiertas permiten**: 4 de los 9 temas cubiertos (4, 5, 6 y 7), 4 parciales (2, 3, 8 y 9) y 1 sin cobertura (1, fecha del Diario Oficial); dentro de los parciales quedan declarados sin cobertura las equivalencias de códigos, la inscripción de la persona natural en texto consolidado y la consulta pública de RUES. No fue saturación (las últimas fuentes aún traían hallazgos nuevos) ni tope de ids (quedaron 3 libres) ni de tiempo: se paró al dar cuenta de cada tema de la lista cerrada, a los 30 minutos de reloj.
