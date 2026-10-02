# Fase 2 · Eje 4 (RUP, experiencia, capacidad residual, plurales y UNSPSC, segunda vuelta) · lente académica

> Para: sesión · Estado: nota de agente lector de la Fase 2 · Sustituido por: —

- **Agente**: lector fase2 eje4-academica. **Fichas**: F-0521 a F-0563 (43 de 60 ids), en `research/fichas/`. El rango estaba vacío al empezar (los F-0581 a F-0589 que ya había pertenecen a otro lector y no se tocaron).
- **Inicio UTC**: 2026-10-02T13:47:24Z. **Fin UTC**: 2026-10-02T14:04:16Z (unos 17 minutos de reloj).
- Cada JSON se validó (campos obligatorios, valores permitidos del esquema, cita de 300 caracteres o menos, sin la grafía antigua de la marca). Cada `cita_textual` se comprobó como subcadena literal del texto descargado con `pdftotext` (una cita partida con «[…]» solo si ambas partes caen en la misma página PDF) y de ahí salió `pagina_pdf`. No se escribió `verificacion_adversaria`. Todas las fichas son A6 (lo que el trabajo dice, no lo que la norma dice) y llevan `vigencia_verificada` = «[sin verificar]» con el motivo; todas las fuentes son anteriores al Decreto 0997 de 2026 salvo una de junio de 2026 (F-0526 a F-0530), que no lo aplica.
- Cifras recalculadas (campo `cifra_comprobada`): F-0527 (82 % cuadra con el extremo 1,1 del rango, no con 1,5), F-0532 (cuadra con su Tabla 13), F-0542 (el +11 y el 366 % cuadran con la Tabla 18; el resumen dice «13 oferentes», que no cuadra: se repite 11,22), F-0543 (el «13,33 %» no cuadra con nada de la fuente; se repite 1,81), F-0548 (cuadra, 70 %), F-0549 (5/25 = 20 %), F-0558 (39/583 = 6,7 %).

## 1. Fuentes intentadas y abiertas, por tipo

| Tipo | Intentadas | Abiertas (descargadas y leídas, total o en parte) | Con ficha |
|---|---|---|---|
| academia | 45 | 41 | 19 fuentes (F-0521 a F-0563) |

Las 41 abiertas incluyen 22 que se leyeron para triage (resumen, índice y búsqueda de términos) y no dieron ficha (ver § 1.2); 3 son duplicados (la misma obra en dos repositorios o en dos versiones). No hay fichas de otro tipo: el encargo es lente académica y una afirmación sobre una norma se cita desde la norma (lente institucional).

### 1.1 Con ficha (URL exacta que respondió; HTTP 200)

1. Cerón Castañeda 2022, Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/14bb448f-0e6f-404a-a114-c45dea9a7c54/content (F-0521 a F-0523; era el «Cerón 2022» que el piloto dejó sin ficha)
2. Barreto, Villarreal y López 2015 (concurso de méritos INVÍAS), Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/a92d70f1-daa7-4a85-be8a-000eb50f0967/content (F-0524, F-0525)
3. Valdés 2026 (empresa constructora en etapa inicial), Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/6de48be8-8800-4452-845b-6d72391ca84e/content (F-0526 a F-0530)
4. Daza Gallo 2016 (microempresas de ingeniería civil), UMNG: https://repository.umng.edu.co/server/api/core/bitstreams/e712a377-5737-4711-930c-269ee38b48d6/content (F-0531 a F-0534)
5. Díaz Díez 2020 (documentos tipo obligatorios), Redalyc: https://www.redalyc.org/journal/5038/503865772006/503865772006.pdf (F-0535, F-0536)
6. López Rodríguez 2019 (subsanabilidad), Dialnet: https://dialnet.unirioja.es/descarga/articulo/6733367.pdf (F-0537, F-0538, F-0563)
7. Torres Caballero 2016, Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/5b67e5ad-ac94-478c-8a8f-4f8fedef385b/content (F-0539, F-0540)
8. Charris y Llamas 2016 (riesgo del proveedor), Redalyc: https://www.redalyc.org/journal/3376/337650446003/337650446003.pdf (F-0541)
9. Moreno Mier 2022 (documentos tipo y competencia), Documento CEDE, Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/d99425d6-4b23-425a-9c13-bd1bc4902ea2/content (F-0542 a F-0544)
10. Hernández Cortés 2020 (subjetividad en pliegos), UMNG: https://repository.umng.edu.co/server/api/core/bitstreams/4a4c21f6-8af2-41ea-826f-848a10b79830/content (F-0545 a F-0548)
11. Serrano y otros 2019 (terminación anormal en el Valle), Redalyc: https://www.redalyc.org/journal/2739/273963938005/273963938005.pdf (F-0549)
12. Leal 2015, Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/b9ce8e94-9609-4524-b8b6-30aec47e1000/content (F-0550)
13. García Aponte 2013, UMNG: https://repository.umng.edu.co/server/api/core/bitstreams/ce5292ab-9869-4cd4-951f-6657192fa5ac/content (F-0551)
14. Jiménez y Restrepo 2020 (concurso de méritos y mínima cuantía), UPB: https://repository.upb.edu.co/server/api/core/bitstreams/50450999-dec5-4046-bc78-27085fec69b6/content (F-0552)
15. Chamorro, Pérez y Serrano 2022 (rol del interventor), Redalyc: https://www.redalyc.org/journal/104/10469617002/10469617002.pdf (F-0553)
16. Zárate 2013 (editorial sobre el Decreto 1510 y el RUP), Redalyc: https://www.redalyc.org/pdf/5038/503856213001.pdf (F-0554 a F-0556; el PDF imprime «xref num 24 not found» y se reconstruye; el texto sale completo)
17. Díaz Jiménez 2020 (vías primarias), Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/1fc569ce-03b8-4396-8be8-53d176d6b376/content (F-0557 a F-0559)
18. Cantor Monroy 2018, Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/130f1e84-11a8-41eb-9c2a-2653c37eb60b/content (F-0560)
19. Gallego Peláez 2016 (subsanabilidad), Uniandes: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/bc2d5131-ec05-4f54-ada2-6f38c6e6a42a/content (F-0561, F-0562)

### 1.2 Abiertas y hojeadas, sin ficha (no sostienen ninguna afirmación nueva del eje)

Pineda 2015 (UMNG, eficiencia de habilitantes), Daza Gallo 2013 (UMNG, microempresa; describe el CIIU anterior, lo recoge F-0555 desde otra fuente), un volumen de Uniandes 2015 sobre el factor multiplicador de consultoría (eje 9, no de este), Romero 2019 (Uniandes, interventoría y anticorrupción), Quiñones (Dialnet 5979000, consorcio y unión temporal), Mesa 2018 (UMNG, SECOP II: el clasificador aparece solo en las palabras clave), Ríos Parra 2017 (Dialnet 6551470, mínima cuantía en el Valle), Bedoya y Unigarro (Uniandes, incentivos a mipymes), Vargas 2023 (Uniandes; misma propuesta de Cerón con el mismo grupo asesor), Cárdenas 2020 y Bejarano 2021 y Melo y Sánchez 2021 (documentos tipo; generales o sin pasaje sobre experiencia o RUP), Rojas 2019 (Uniandes, pliegos tipo y colusión: eje 6), Pinzón y Romero 2021 (Redalyc, pliegos de condiciones: general), Padilla (Dialnet 9742853: solo cabecera), Gutiérrez 2021 y Cruz 2021 (informes de práctica de la UPB: descripción sin evidencia citable), Pérez 2024 (Uniandes, guía de competencia: general), Moreno 2022 en versión de tesis (duplicado del CEDE), Dialnet 7471556 (duplicado de Díaz Díez en Dialnet), Dialnet 5805148 (duplicado de Charris).

## 2. No abiertas, con el error literal

| URL o recurso | Resultado literal |
|---|---|
| https://repository.upb.edu.co/server/api/core/items/4b7f9e91-716f-4bf4-b6d6-8a10ee123c19/bundles (Reflexión crítica sobre selección de consultores en mínima cuantía, 2016) | «curl: (35) Recv failure: Connection reset by peer» (un intento) |
| https://repository.upb.edu.co/server/api/core/items/3029ba71-c627-4fa4-bc13-54ea034ceede/bundles (informe de práctica 2021) | «curl: (56) CONNECT tunnel failed, response 502» (un intento) |
| https://repository.unimilitar.edu.co/server/api/discover/search/objects?… (el host que usé por error; el correcto es repository.umng.edu.co) | respuesta que no era JSON: «Expecting value: line 1 column 1 (char 0)» |
| https://repositorio.unal.edu.co/server/api/discover/search/objects?… | respuesta que no era JSON: «Expecting value: line 1 column 1 (char 0)» (el piloto ya anotó 404 en `/discover`) |
| https://bffrepositorio.unal.edu.co/server/api/discover/search/objects?… (tres términos: capacidad residual, registro único de proponentes, requisitos habilitantes obra pública) | responde JSON pero sin ningún trabajo del tema (resultados de otras disciplinas): no hay fuente |

Resultados de búsqueda web que NO se abrieron y quedan solo como pista (no sostienen nada): Dialnet 5137172 (reforma de la Ley 80), Redalyc 669770733005 y 669770725009 (cláusulas y sistemas de contratación), repositorio de la UGC sobre colusión en licitaciones, Corte Constitucional C-1016 de 2012 (RUP y cámaras de comercio: es jurisprudencia, tarea del lector institucional), blogs y páginas de cámaras de comercio, y publicaciones en redes sobre el Decreto 0997 (no valen como fuente).

Medio de descubrimiento: WebSearch (con y sin filtro de dominios) y la API de DSpace de Uniandes y de la UMNG (`/server/api/discover/search/objects`, bundles y bitstreams), que respondió JSON sin problema; UPB respondió a medias (dos fallos de red). No se usó WebFetch. Todo por GET.

## 3. Problemas candidatos (los sostienen las fichas indicadas; ninguno está verificado por la Fase 3)

Todos con evidencia académica (A6) anterior al Decreto 0997 de 2026. «Señal en SECOP II» es una hipótesis de dónde mirar en los datos abiertos; no se consultó ningún dataset en esta lectura.

| # | Título | Etapa | Decisión | Tipo de contrato | Fichas | Consecuencia en plata, si la fuente la da | Señal observable en datos abiertos de SECOP II |
|---|---|---|---|---|---|---|---|
| 1 | La «paradoja de la capacidad residual»: la empresa nueva necesita K para ganar y contratos ganados para tener K; la ruta es menor cuantía y plurales | E2 | D1 | obra | F-0526, F-0528, F-0529, F-0530 | Liquidez de 0,20 frente a un rango de 1,1 a 1,5: 82 % por debajo del mínimo y no se habilita sola (F-0527); margen del caso 3,6 % sobre la oferta | no detectable (el K y los saldos de contratos en ejecución no están en los datos abiertos de procesos) |
| 2 | Umbrales financieros fijados a criterio de la entidad, sin soporte en los estudios previos, y que no guardan relación con el monto (capital de trabajo de 70 % del presupuesto oficial sin anticipo; interventoría con indicadores que solo cumple el 6 % de las empresas) | E2 | D3 | obra, interventoría | F-0522, F-0548, F-0553, F-0521 | Capital de trabajo de $702.514.792 igual al 70 % del presupuesto oficial en un pliego (F-0548); 6 % y 51 % de empresas que cumplen según dos procesos de interventoría (F-0553) | no detectable (los umbrales están en el pliego, no en el dataset); el efecto indirecto se vería como pocos proponentes por proceso (dataset de proponentes, sin verificar) |
| 3 | Experiencia exigida desproporcionada o contradictoria (hasta 3 o 4 veces el presupuesto oficial; 100 % del presupuesto como regla más frecuente; cinco certificados de 20 % con suma de 100 %; un contrato por integrante del plural) | E2 | D3 | obra | F-0531, F-0546, F-0547, F-0534, F-0560 | ninguna en pesos; 20 % de los pliegos de una muestra de 138 pedían experiencia general en valor (F-0531) | no detectable en el dato abierto (la regla está en el pliego); el documento tipo la limita desde 2019 (ver F-0535) |
| 4 | Pliegos que exigen códigos UNSPSC específicos, y uno por integrante en el plural; desde 2013 el clasificador es el medio de acreditar experiencia (a tercer nivel) | E2 | D3 | todos | F-0545, F-0555, F-0556 | ninguna | no detectable; el código UNSPSC del objeto sí está en el dataset de procesos (campo de clasificación, sin verificar su nombre) |
| 5 | Subsanación del RUP y de la experiencia: con la regla de 2014 la falta del RUP o de un certificado era subsanable, pero una insuficiencia de experiencia, de liquidez o de capacidad residual no; el contratista puede perder por «no tenerlo», no por «no probarlo» | E2 | D3 | todos | F-0537, F-0538, F-0561, F-0562, F-0563 | ninguna en pesos; rechazo del proceso | no detectable (el motivo de rechazo está en el informe de evaluación, no en el dato abierto) |
| 6 | Procesos de licitación que no se adjudican porque el proponente no cumple el RUP | E2 | D3 | obra | F-0549 | 5 de 25 procesos terminados anormalmente en el Valle, 2013 a 2016 (20 %) | posible: procesos con estado de terminación anormal sin adjudicación en el dataset de procesos (sin verificar el campo) |
| 7 | Los documentos tipo aumentan los oferentes al cierre (de 3 a 14 en el estudio) pero sin efecto medible en la diferencia entre presupuesto oficial y adjudicado | E2 | D1 | obra (vías) | F-0542, F-0543, F-0544 | +11,22 oferentes al cierre en promedio (ATT, Tabla 18); +1,81 de la implementación total sobre la parcial; sin efecto en la diferencia presupuestal | posible: número de proponentes por proceso, antes y después de 2019, con los datasets de proponentes y de ofertas (sin verificar) |
| 8 | Concentración de la adjudicación de vías primarias en grupos económicos, con más de un proponente plural del mismo grupo en un contrato | E2 | D1 | obra | F-0559 | ninguna en pesos (muestra de 65 contratos de 2014 a 2018) | posible: integrantes comunes entre plurales de un mismo proceso (dataset de consorcios y de proponentes, sin verificar) |
| 9 | El «sin dato» se vuelve cero al caracterizar proponentes: 39 de 583 participantes no estaban en el RUES y se les puso 0 en experiencia, empleados y puntaje | E2 | D1 | obra | F-0557, F-0558 | ninguna | detectable en el propio dato: participantes sin registro en el RUES; el RUES muestra matrícula, empleados y actividades (F-0557) |
| 10 | Concurso de méritos de interventoría: la experiencia puntúa y el precio no es factor; en el método INVÍAS de 2014 se elegían de 4 a 6 contratos y el puntaje salía de plazos y facturación mensual, de modo que elegir QUÉ certificados presentar decide | E2 | D1 | interventoría, consultoría | F-0524, F-0525, F-0539, F-0540 | ninguna | no detectable |
| 11 | Mínima cuantía prevalece sobre el concurso de méritos cuando una interventoría o consultoría cabe en ella (posición de Colombia Compra y sentencia C-004 de 2017 según los autores): cambian las reglas de acreditación | E2 | D1 | interventoría, consultoría | F-0552 | ninguna | posible: modalidad registrada en el dataset de procesos para contratos de interventoría (sin verificar) |
| 12 | No hay evidencia de que los habilitantes (experiencia, liquidez, endeudamiento) predigan atrasos o sobrecostos (muestra de 56 contratos, sin significancia) | E4 | D4 | obra | F-0550 | ninguna | no detectable |
| 13 | Definiciones antiguas del K circulan (capital de trabajo menos saldos, Decreto 1397 de 2012; fórmula de 2014 con ingresos de cinco años y mínimo de 125.000 USD): no mezclarlas con la Guía vigente | E2 | D3 | obra | F-0551, F-0533 | ninguna | no detectable |
| 14 | El RUP no mide el riesgo del proveedor extranjero o nuevo en el país | E0 | D3 | todos | F-0541 | ninguna | no detectable |
| 15 | Inalterabilidad de los documentos tipo: la entidad no puede incluir ni modificar habilitantes distintos del documento tipo (art. 2.2.1.2.6.1.4 según el autor) | E2 | D3 | obra, interventoría, consultoría | F-0535, F-0536 | ninguna | no detectable (la desviación solo se ve leyendo el pliego) |
| 16 | La renovación del RUP a más tardar el quinto día hábil de abril y la clasificación por UNSPSC nacen del Decreto 1510 de 2013 (reportado por un editorial de 2013) | E0 | D3 | todos | F-0554, F-0555, F-0556 | ninguna | no detectable |

## 4. Temas de la lista del eje 4 (segunda vuelta)

**Cubiertos por la lente académica** (con fichas): (6) experiencia en el concurso de méritos (F-0524, F-0525, F-0539, F-0540, F-0552), solo como lo describe la academia; (7) indicadores financieros (F-0521, F-0522, F-0523, F-0527, F-0532, F-0548, F-0553, F-0560), con los umbrales tal como los reportan los autores; (8) RUP de persona natural en lo que toca a la experiencia del socio (F-0530) y riesgo del proveedor extranjero (F-0541); (9) renovación (F-0554) y consulta pública del RUES (F-0557, F-0558); además, plurales y experiencia (F-0545, F-0546, F-0528), subsanación del RUP y de la experiencia (F-0537, F-0538, F-0561 a F-0563), documentos tipo y competencia (F-0535, F-0542 a F-0544), capacidad residual en la práctica (F-0526, F-0529, F-0533, F-0551).

**Sin cubrir en esta lente** (lo cubre el lector institucional, o no hay fuente académica abierta; ninguno se da por cubierto):
1. Fecha y número del Diario Oficial del Decreto 0997 de 2026: sin cubrir. No se intentó el buscador de imprenta.gov.co (lente institucional). Una búsqueda web solo trajo publicaciones en redes y un blog de abogados, que no valen como fuente.
2. Versión del UNSPSC que usan SECOP II y el RUP hoy: sin fuente académica. La búsqueda web apunta, como pista sin abrir, a la página de Colombia Compra sobre el clasificador y a una versión «UNv260801» del 18-mar-2025; hay que abrir la fuente primaria (lector institucional). La única fuente académica abierta sobre el clasificador es la de 2013 (F-0555), que no dice la versión.
3. Códigos deshabilitados y equivalencias: sin fuente académica; sin cubrir.
4. Ley 1150 art. 6 texto vigente y plazo del recurso (Decreto-Ley 19 de 2012 art. 221): sin cubrir en esta lente (una fuente académica sobre el RUP del piloto, F-031, ya reporta el plazo; no se reabrió).
5. Versión vigente de la Guía de capacidad residual posterior a la 01 de 2023: sin cubrir (no es materia académica).
6. Fórmulas y tabla de experiencia del documento tipo de interventoría y consultoría vigente: sin cubrir aquí; las fichas académicas describen métodos anteriores (INVÍAS 2014) o generales.
7. Umbrales del documento tipo de obra v4 (lista): sin cubrir; las fichas F-0521 y F-0548 traen umbrales de 2021 o de pliegos antiguos, no los de la versión 4.
8. RUP de persona natural y extranjera: solo lo recogido en F-0530 y F-0541; el régimen (quién se inscribe, qué presenta una sociedad extranjera) sin cubrir; búsquedas en repositorios de Uniandes, UMNG y UPB y en Redalyc no dieron un trabajo académico abierto del tema.
9. Firmeza del RUP y qué muestra el RUES del RUP: solo se cubrió qué trae el RUES por participante (F-0557); la firmeza (diez días hábiles tras la publicación) no tiene ficha propia en esta lente.

## 5. Cómo terminó

**Saturación de la literatura académica abierta, no tope.** Se escribieron 43 de 60 ids y no se llegó al tope de ids ni de tiempo. Las últimas siete búsquedas (RUP y firmeza, extranjeros, capacidad residual, plurales, interventoría, documentos tipo y competencia, habilitantes y rechazos) devolvieron sobre todo trabajos ya leídos en el piloto o fuentes institucionales, y los hallazgos nuevos de las últimas rondas fueron de períodos anteriores a 2019 o de temas laterales (F-0561 a F-0563 fueron los últimos útiles). La razón de fondo: sobre capacidad residual y K casi no hay literatura académica abierta; lo poco que hay es la Guía de capacidad residual y las tesis ya fichadas. Lo que falta (temas 1 a 9 de § 4) es de lectura de norma y de documento tipo, no de academia.

**Límites declarados**: (a) todas las fichas son lo que el autor dice (A6) y casi todas describen un régimen anterior a los documentos tipo vigentes y al Decreto 0997 de 2026 (la excepción es la tesis de 2026, que no lo aplica); (b) varias reproducen sentencias o normas de segunda mano (F-0537, F-0538, F-0561, F-0562, F-0535, F-0539), y ninguna sentencia se abrió; (c) los repositorios con muro anti-robot (EAFIT, Externado, La Sabana, Sergio Arboleda, Javeriana) no se reintentaron, según la instrucción; (d) las cifras de F-0542 y F-0543 tienen inconsistencias internas de la fuente (anotadas en `cifra_comprobada`).
