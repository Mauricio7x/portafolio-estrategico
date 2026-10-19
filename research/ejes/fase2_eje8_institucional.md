# Fase 2 · Eje 8 (La oferta de cero, paso a paso) · lente institucional · notas del lector

> Para: sesión · Estado: referencia · Sustituido por: —

Lector: «lector fase2 eje8-institucional». Alcance: obra pública, interventoría y consultoría. Rango de ids F-0941 a F-1000 (60 de 60). Esta corrida es una REANUDACIÓN: el rango tenía ya 37 fichas (F-0941 a F-0977, consulta del 2-oct-2026, 7 documentos de Colombia Compra: cinco guías de SECOP II para proveedores y dos pliegos tipo) que no se tocaron; esta corrida escribió **F-0978 a F-1000 (23 fichas nuevas)**, consulta del 2026-10-19. Ningún POST hacia fuera; solo GET.

## 1. Tiempos y cómo terminó
- Inicio: lunes 19-oct-2026 18:12:19 UTC (`date -u` al empezar).
- Fin: Mon Oct 19 18:27:58 UTC 2026 (`date -u` al cerrar, tomado después de validar las 60 fichas y escribir estas notas).
- **Terminó por rango de ids lleno (60/60)**, no por una de las tres condiciones del encargo: no hubo saturación (las últimas fuentes —documento base de consultoría, Pacto de Transparencia, sentencia del Consejo de Estado, guía de la cuenta de proveedor— seguían trayendo problemas nuevos), el tiempo fue de unos 15 minutos (lejos de los 90) y el tope de 40 fuentes abiertas se alcanzó solo según cómo se cuenten las páginas de cotejo de vigencia (ver sección 2).
- Había 7 documentos leídos en la corrida anterior; sumados a los 30 de lectura de esta corrida son 37 fuentes de lectura acumuladas, por debajo de 40; con las 15 páginas de cotejo serían 52.

## 2. Fuentes intentadas y abiertas por tipo (claves de la taxonomía)
Se cuenta una dirección distinta que respondió. «Cotejo» = página de la relatoría abierta solo para buscar si modifica un artículo citado (búsqueda por número, no lectura completa); se separan porque no alimentan fichas, pero la regla de vigencia las exige.

| Tipo | Intentadas | Abiertas | Detalle |
|---|---|---|---|
| `cce_guia` | 7 | 7 | Guía de garantías 2026 (F-0989), Guía de contratación de obra pública 2026 (F-0991), guía CCE-SEC-GI-05 de la cuenta de proveedor (F-0992, F-1000); sin ficha: guía CCE-SEC-GI-16 (concurso de méritos abierto, lado entidad), ABC del Decreto 0997 de 2026, página del curso de proveedores de la escuela virtual (solo agendas de capacitación), nota de prensa de Colombia Compra sobre documentos tipo de infraestructura social (sin enlaces útiles) |
| `ley` | 7 | 7 | De lectura 3: Ley 1150 de 2007 (F-0978, F-0979, F-0980), Ley 1882 de 2018 (contraste), Ley 80 de 1993 (F-0995). Cotejo 4: Ley 2022 de 2020, Ley 2069 de 2020, Ley 2294 de 2023, Ley 2195 de 2022 |
| `decreto` | 14 | 14 | De lectura 3: Decreto 1082 de 2015 en la relatoría (F-0981, F-0982, F-0983, F-0986, F-0988), Decreto 0997 de 2026 (F-0984, F-0985), Decreto 399 de 2021 (F-0987). Cotejo 11: Decretos 287 y 1860 de 2021 (este último sí toca el art. 2.2.1.2.3.1.9), 142 de 2023, 680, 310 y 579 de 2021, 594 de 2020, 442 de 2022, 957 de 2019, 392 de 2018, 342 de 2019 |
| `cce_concepto` | 12 | 12 | Con ficha: C-1238 de 2026 (F-0990), C-1388 de 2026 (F-0993). Ojeados sin ficha: C-1301, C-1302, C-1304, C-1284, C-1401, C-1291, C-1363, C-1222, C-1402, C-1286 de 2026 (repiten la regla de subsanabilidad o tratan otros temas) |
| `doc_tipo` | 4 | 3 | Documento base de consultoría de infraestructura social (F-0996, F-0997, F-0998), Anexo 4 Pacto de Transparencia (F-0994), Formato 1 carta de presentación de interventoría social (citado en notas de F-0994). Descargado y NO leído: Formato 2 de conformación de proponente plural |
| `juris` | 2 | 2 | Sentencia del Consejo de Estado del 1-jun-2026 sobre la garantía de seriedad (F-0999); sentencia de mayo de 2026 sobre una entidad financiera de régimen privado (ojeada, sin ficha: no aplica al Estatuto) |
| `practica` | 2 | 0 | Dos videos de YouTube (tutoriales de SECOP II de una gobernación y de un canal de proveedores): ver sección 3 |
| `control`, `internacional`, `gremio`, `academia`, `dato` | 0 | 0 | La lente institucional de este eje cubre Colombia Compra; la lente académica va en otro lector |
| **Total** | **48** | **45** | De las 45, 15 son cotejos; 30 son de lectura |

## 3. Fuentes no abiertas, con el error literal
| Dirección | Qué pasó |
|---|---|
| https://www.youtube.com/watch?v=OQEGyqCBpoE (tutorial SECOP II de una gobernación, 10:07) | La página respondió 200 pero `playabilityStatus` = `LOGIN_REQUIRED` y no trae `captionTracks`: sin transcripción descargable por GET → `no_abierta`. |
| https://www.youtube.com/watch?v=mf8_0r1Z9As (tutorial «Cómo crear y presentar una oferta en el SECOP II», 24:16) | Igual: `LOGIN_REQUIRED`, sin `captionTracks` → `no_abierta`. |
| Formato 2 de conformación de proponente plural (Documentos Tipo de infraestructura social, .docx) | Descargado (200) y convertido a texto, pero no leído: el rango de ids se llenó. No sostiene ninguna afirmación. |
| Documento base de la licitación de OBRA de infraestructura social (versión 2) | No se halló por la API de medios de Colombia Compra con 12 búsquedas distintas (las respuestas devolvieron solo los documentos de interventoría y consultoría, los formatos y los anexos). Consecuencia: el plazo de 5 días hábiles de F-0993 se apoya en un concepto y no en el documento base. |
| Conversión .docx → texto con LibreOffice (`soffice --headless --convert-to txt`) | Terminó sin archivo de salida y sin mensaje; se reemplazó por lectura directa del XML del .docx. No afecta ninguna ficha. |

Nada devolvió 403, 429 ni muro de bots en las páginas de Colombia Compra, su relatoría y su API de medios en esta corrida.

## 4. Fichas escritas en esta corrida (F-0978 a F-1000)
| Id | Tipo | Qué sostiene |
|---|---|---|
| F-0978 | ley | La garantía de seriedad no entregada con la propuesta no se subsana: rechazo (Ley 1150 art. 5 par. 3) |
| F-0979 | ley | Lo que no da puntaje se subsana hasta el traslado del informe; después, rechazo (Ley 1150 art. 5 par. 1) |
| F-0980 | ley | En licitación la adjudicación es en audiencia pública y allí se responde a la evaluación (Ley 1150 art. 9) |
| F-0981 | decreto | En la audiencia el oferente no puede mejorar su oferta y habla una sola vez (Decreto 1082 art. 2.2.1.2.1.1.2) |
| F-0982 | decreto | Vigencia y valor de la póliza de seriedad: 10 % de la oferta (10 % del presupuesto en concurso de méritos) (art. 2.2.1.2.3.1.9) |
| F-0983 | decreto | En consorcio o unión temporal la póliza la otorgan todos los integrantes (art. 2.2.1.2.3.1.4) |
| F-0984 | decreto | El pliego debe pedir un compromiso anticorrupción con la oferta (Decreto 0997 de 2026 art. 8) |
| F-0985 | decreto | Los procesos con documentos tipo siguen con las reglas anteriores hasta que Colombia Compra actualice (Decreto 0997 art. 14 par. 3) |
| F-0986 | decreto | Renovar el RUP a más tardar el quinto día hábil de abril (art. 2.2.1.1.1.5.1) |
| F-0987 | decreto | Concurso de méritos: informe de 3 días hábiles y adjudicación al mayor puntaje (Decreto 399 de 2021 art. 2); la relatoría del 1082 aún muestra el texto anterior |
| F-0988 | decreto | Oferta artificialmente baja: la entidad pide explicación; se rechaza o se sigue (art. 2.2.1.1.2.2.4) |
| F-0989 | cce_guia | Guía de garantías 2026: la póliza se actualiza si cambia el cronograma |
| F-0990 | cce_concepto | C-1238 de 2026: el tomador de la póliza es el proponente, no el apoderado |
| F-0991 | cce_guia | Guía de obra 2026: se subsana la prueba, no la condición |
| F-0992 | cce_guia | Guía de la cuenta de proveedor: avisos de oportunidades por áreas de interés UNSPSC |
| F-0993 | cce_concepto | C-1388 de 2026: informe de 5 días hábiles en el documento tipo de infraestructura social v2 |
| F-0994 | doc_tipo | Pacto de Transparencia: se acepta con la firma de la carta de presentación |
| F-0995 | ley | Ley 80 art. 30 num. 8: 5 días hábiles de observaciones al informe en licitación |
| F-0996 | doc_tipo | Consultoría: rechazo si el RUP no está en firme al cierre o no se renovó a tiempo |
| F-0997 | doc_tipo | Consultoría: causales de rechazo de la oferta económica (formulario alterado, presupuesto excedido, precio artificialmente bajo, dos ofertas) |
| F-0998 | doc_tipo | Consultoría: ofertas fuera de SECOP II no valen; indisponibilidad solo con certificado |
| F-0999 | juris | Consejo de Estado 2026: no firmar el contrato cuesta la póliza y 5 años de inhabilidad |
| F-1000 | cce_guia | Guía de la cuenta de proveedor: multas, sanciones e inhabilidades quedan visibles |

## 5. Problemas candidatos
Cada uno con título, etapa, decisión, tipo de contrato, fichas (las 37 de la corrida anterior se citan por su id), consecuencia en plata si la fuente la da, y la señal observable en los datos abiertos de SECOP II. «No detectable» = el hecho vive en documentos del proceso o en el certificado, no en columnas de un conjunto de datos; ningún conjunto de datos se abrió en esta lectura, así que donde digo «no verificado» es una pregunta para la Fase 3.

1. **La póliza de seriedad que falta, o llega mal, no se corrige.** Etapa E2 · decisión D3 · tipo todos. Fichas F-0978, F-0982, F-0983, F-0989, F-0990 (y F-0965, F-0966, F-0943 de la corrida anterior). Falta de entrega: rechazo sin subsanación. Fallas de forma (tomador distinto del proponente, un solo integrante en la póliza de un plural, vigencia o valor por debajo del mínimo) pueden o no ser subsanables según el pliego; las fuentes de esta lectura solo prueban la regla de la falta de entrega. Consecuencia en plata: oferta perdida y prima pagada; valor mínimo 10 % de la oferta. Señal: no detectable.
2. **Prórroga del cierre o de la adjudicación sin actualizar la póliza.** Etapa E2-E3 · D4 · todos. Fichas F-0989, F-0999 (notas), F-0982. La guía de 2026 pone la carga de actualizar la póliza en el oferente; la no ampliación de la vigencia cuando la prórroga es inferior a tres meses es un evento amparado por la póliza (siniestro). Consecuencia: pérdida de la póliza. Señal: las adendas que prorrogan existen como documentos del proceso (no verificado en datos abiertos); que el oferente actualizó la póliza: no detectable.
3. **Subsanar la condición en lugar de la prueba, o llevar tarde lo que ocurrió después del cierre.** E2 · D3 · obra. Fichas F-0979, F-0991, F-0993. Consecuencia: rechazo de una oferta que ya había pasado la parte cara (armado y póliza). Señal: no detectable.
4. **El plazo del traslado del informe cambia con la modalidad y el documento tipo** (5 días hábiles en licitación y en el documento tipo de infraestructura social v2; 3 días hábiles en concurso de méritos y en los documentos tipo de interventoría y consultoría social). E2 · D3 · todos. Fichas F-0995, F-0993, F-0987 (notas: numeral 2.6 del documento de consultoría), F-0962 (anterior). Quien responde tarde el requerimiento de subsanación es rechazado (Ley 1150 art. 5 par. 1). Señal: fechas del cronograma del proceso, no verificado.
5. **RUP: renovación a más tardar el quinto día hábil de abril, y primera inscripción en firme al cierre.** E0 y E2 · D3 · todos. Fichas F-0986, F-0996 (y F-0950). Consecuencia: si no renueva, cesan los efectos y no habilita; si es nuevo y no está en firme al cierre, se rechaza. Señal: no detectable en los datos del proceso; el estado vive en el certificado.
6. **Compromiso anticorrupción: decreto nuevo, pliego tipo viejo.** E2 · D3 · todos. Fichas F-0984, F-0985, F-0994. El Decreto 0997 de 2026 obliga a pedirlo con la oferta, pero los procesos con documentos tipo siguen con el instrumento vigente (hoy, el Pacto de Transparencia aceptado con la firma de la carta) hasta que Colombia Compra actualice. Riesgo: el contratista entrega un formato que el pliego ya no pide o no entrega el que sí pide. Señal: no detectable; la fecha de publicación del decreto en el Diario Oficial quedó sin verificar.
7. **Tocar el formulario de presupuesto oficial, exceder el presupuesto, ofrecer un valor artificialmente bajo o presentar dos ofertas económicas distintas.** E2 · D2 y D3 · consultoría e interventoría (documento tipo de consultoría social leído; para obra, ver F-0970, F-0972, F-0975 de la corrida anterior). Fichas F-0997, F-0988, F-0970. Consecuencia: rechazo de la oferta económica; la explicación del precio artificialmente bajo cae sobre el oferente. Señal: la razón entre valor ofertado y presupuesto oficial se podría calcular si el conjunto de ofertas publica ambos valores; no verificado.
8. **Creer que en el concurso de méritos se negocia el valor con el primer lugar.** E2 · D2 · consultoría (interventoría de obra también va por concurso de méritos). Fichas F-0987, F-0997. La relatoría del Decreto 1082 aún transcribe un texto que el Consejo de Estado había suspendido y el Decreto 399 de 2021 reemplazó; el documento tipo de consultoría rechaza lo que excede el presupuesto. Consecuencia: ofertar a ciegas esperando ajustar el alcance después. Señal: no detectable.
9. **Carga tardía en SECOP II.** E2 · D3 · todos. Fichas F-0998, F-0945, F-0968 (anteriores). Lo no entregado por la plataforma a la hora del cronograma se da por no presentado; solo una indisponibilidad certificada por Colombia Compra abre otro medio. Señal: la hora de carga de la oferta frente al cierre: no verificado en datos abiertos.
10. **No firmar el contrato adjudicado.** E3 · D4 · todos. Fichas F-0999, F-0995 (numeral 12 en las notas). Consecuencia: pérdida de la póliza de seriedad y 5 años de inhabilidad para licitar y contratar. Señal: las inhabilidades y multas registradas se ven en la cuenta y en la vista pública del detalle del contrato (F-1000); el conjunto de datos que las publica: no verificado.
11. **Audiencia de adjudicación vista como segunda oportunidad.** E2 · D3 · licitación (obra). Fichas F-0980, F-0981. El oferente responde a observaciones sobre su evaluación, una sola vez, sin mejorar la oferta. Señal: no detectable.
12. **Alertas de oportunidades dependen del nivel UNSPSC registrado en la cuenta de proveedor** (niveles 3 y 4). E0 · D1 · todos. Ficha F-0992. Consecuencia: oportunidades no vistas. Señal: no detectable.

## 6. Temas cubiertos y sin cubrir (lista del eje)
Cubiertos, con fichas de las dos corridas: registro en SECOP II (F-0949 a F-0953, F-0992, F-1000); RUP (F-0950, F-0986, F-0996); manifestación de interés de menor cuantía (F-0942, F-0954, F-0955); observaciones (F-0956, F-0957); garantía de seriedad (F-0943, F-0965 a F-0967, F-0978, F-0982, F-0983, F-0989, F-0990, F-0999); compromiso anticorrupción (F-0984, F-0985, F-0994); carta de presentación (F-0971, F-0972; contenido de la carta de interventoría social en las notas de F-0994); Formulario 1 y oferta económica (F-0944, F-0970, F-0975, F-0997); APU (F-0973, F-0974); carga por sobres y cuestionario (F-0946, F-0947, F-0948); cierre y carga fuera de plazo (F-0945, F-0968, F-0998); subsanación (F-0961 a F-0963, F-0979, F-0991, F-0993, F-0995); audiencia (F-0980, F-0981); consorcios (F-0941, F-0955, F-0958 a F-0960, F-0964, F-0977, F-0983); visita a la obra (F-0976); precio artificialmente bajo (F-0988); concurso de méritos (F-0987, F-0996 a F-0998).

Sin cubrir (declarados):
- **Firma de la oferta en SECOP II** (firma electrónica, certificado digital, quién firma): no se halló ni se leyó fuente; solo la firma del Formulario 1 y del compromiso en pliegos tipo (F-0970, F-0997).
- **Tutoriales en video**: los dos intentados exigen sesión (sección 3).
- **Documento base de la licitación de obra de infraestructura social v2** (carta, formatos, causales de rechazo de obra): no se encontró por la API de medios; el documento de transporte V3 (zip) se leyó solo en parte en la corrida anterior. Es el hueco más importante para el usuario de Detekta, que oferta obra.
- **Guía de SECOP II para presentar oferta en concurso de méritos desde el lado del proveedor**: la guía GI-16 hallada es del lado de la entidad.
- **Plazos concretos por paso** (horas hábiles, tiempo de armado): las fuentes dan reglas, no tiempos de armado; «tiempo por paso» no tiene fuente oficial en esta lectura.
- **Protocolo para actuar ante una indisponibilidad del SECOP II** (citado en F-0998): no se abrió.
- **Concepto jurídico sobre qué defectos de la póliza (tomador, vigencia, valor) son subsanables**: solo se abrió el extracto de C-1238 sobre el tomador; la guía de 2026 dice que solo la NO entrega es insubsanable, sin resolver los demás defectos.

## 7. Hallazgos de método (no son fichas)
- **La relatoría del Decreto 1082 de 2015 no es consolidada y puede traer texto ya reemplazado.** Caso comprobado en este eje: el art. 2.2.1.2.1.3.2 (concurso de méritos) aparece con el texto anterior (negociación con el primer lugar, numerales suspendidos por el Consejo de Estado) mientras el Decreto 399 de 2021 lo reemplazó; solo se detectó abriendo el decreto modificatorio. El art. 2.2.1.2.3.1.9 sí aparece con las reglas posteriores (valores para acuerdo marco y valores altos) y el Decreto 1860 de 2021 solo le agregó un parágrafo.
- **El cotejo por número de artículo contra las normas modificatorias** (descargar cada decreto y buscar el número) fue barato y destapó el caso anterior; no sustituye la lectura de cada decreto.
- **Las fechas de la relatoría pueden no coincidir**: el Decreto 0997 de 2026 muestra 13/08/2026 en la cabecera y 04/08/2026 al pie.
- **Los extractos de conceptos y sentencias de la relatoría** no son el oficio ni la sentencia completos; las fichas lo dicen.
- Sin nombres de personas ligadas a procesos: la sentencia F-0999 nombra a un particular como demandante y no se recogió; el ponente figura como atribución bibliográfica.
- Sin la grafía antigua de la marca en ninguna ficha de este rango (verificado con grep).

Fin: Mon Oct 19 18:27:58 UTC 2026.
