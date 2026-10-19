# Contratación estatal de obra en Colombia · base de conocimiento

> Para: dueño · Estado: informe fechado (19-oct-2026) · Sustituido por: —

Lo que la investigación de fuentes abiertas encontró sobre la Ley 80 de 1993 y su régimen de obra: problemas que cuestan plata, normas y cifras con su verificación, propuestas para Detekta y los vacíos que queda por cubrir. Es una foto de su fecha. Antes de citar una norma, confirme su vigencia en la fuente oficial. El índice de cada fuente está en `docs/CONTRATACION_ESTATAL_FUENTES.md`.

## 0. Cómo se hizo y qué no se midió

- **Barrido (iniciado el 2-oct-2026).** 40 agentes: 30 en 15 ejes, cada uno con un agente académico y otro institucional; 2 ejes académicos de derecho comparado y de tecnología; y 8 que leyeron videos por sus subtítulos. Cada agente fichó fuentes con su página o sección y una cita textual.
- **Depuración (con reintentos hasta el 19-oct-2026).** Un agente por etapa del proceso unificó los problemas repetidos. Otro agente reunió las ideas en propuestas, y otros verificaron cada propuesta contra el código de la aplicación.
- **Normas, crítico y revalidación (19-oct-2026).** Los agentes abrieron el texto oficial de las normas, plazos, porcentajes y sentencias citados por los problemas de gravedad media o alta. Un crítico buscó vacíos. Las 22 propuestas vivas se volvieron a contrastar con el código de hoy.
- **Fuentes declaradas por los agentes:** 826 abiertas y 275 que no pudieron abrir. Los videos cuentan como evidencia de que un problema existe, no como autoridad sobre la norma.
- **Cobertura de Detekta: no medida.** Los agentes clasificaron cada problema como «cubierto», «a medias» o «no cubierto», leyendo documentos y no el código. Esa clasificación no se publica aquí. Para medirla hay que contrastar cada problema con `lib/` y eso queda como trabajo pendiente.
- **No incluido:** los 281 ideas en bruto de los agentes (las 43 propuestas las resumen) y 632 «datos clave» que los agentes extrajeron. Cada uno trae su fuente, pero no pasó la verificación de normas.

## 1. Cifras de la investigación

| Dato | Cantidad | Cómo se contó |
|---|---|---|
| Problemas en bruto | 580 | Suma de lo que devolvieron los 40 agentes de barrido |
| Problemas depurados | 188 | Un agente por etapa unificó duplicados |
| Problemas vigentes en esta base | 187 | 188 menos 1 retirado (§2.1) |
| Gravedad de los vigentes | alta 87 · media 88 · baja 12 | Asignada por el agente que consolidó, con su motivo en cada ficha |
| Fuentes fichadas | 750 | Fichas de los agentes de barrido |
| Direcciones distintas en el índice de fuentes | 594 | Mismo documento fichado dos veces cuenta una vez |
| Ideas en bruto | 281 | Salida de los agentes de barrido; no se publican |
| Normas y cifras verificadas | 173 | confirmadas 136 · corregidas 4 · derogadas o modificadas 2 · sin verificar 31 |
| Propuestas | 43 | ya existen 4 · se descartan 17 · vivas 22 (mejoran lo existente 21, construir 1) |
| Vacíos del crítico | 16 | Dos ya están en el código (§2.4) |
| Contradicciones por resolver | 11 | §7 |
| Cifras de la base sin verificar | 155 | 6 de problemas de gravedad baja, y 149 que no citan norma, plazo, porcentaje ni sentencia |

## 2. Correcciones y retiros

Esta sección cambia lo que decía la investigación antes de que alguien la use. Cada corrección viene de la verificación de un agente contra el texto oficial. No se aplicó ninguna corrección que no tuviera fuente abierta.

### 2.1 Retirado: DET-25

Problema original: «Suministros a entidades: el acuerdo marco y la Tienda Virtual cierran el mercado y no garantizan ventas». Se retira porque la verificación encontró lo siguiente:

- «78 % de las órdenes de compra 2019-2021 concentradas en los 10 instrumentos de mayores ventas»: confirmado. Ubicación: p. 17 del PDF, no p. 18.
- «TVEC obligatoria para compras que no excedan el 10 % de la menor cuantía»: derogado o modificado. La regla legal de la TVEC quedó fuera del texto vigente del numeral 5 del art. 2 de la Ley 1150 tras la Ley 2069 de 2020; hoy sobrevive, si acaso, en el reglamento (Decreto 1082/2015 art. 2.2.1.2.1.5.1, mod. Decreto 1860/2021), que no se pudo abrir hoy. Citar la Ley 1955 art. 42 como fuente vigente es incorrecto; mostrar como «reglamentaria, sin verificar» o no mostrar.
- «Liquidez mayor o igual a 1 y endeudamiento menor o igual a 85 %»: sin verificar. YouTube bloqueado. No es una regla legal: los indicadores financieros los fija cada pliego (en documentos tipo, la matriz de indicadores por rango de valor); mostrar como ejemplo, nunca como umbral normativo.

### 2.2 Retirada una cifra de PRE-18

- PRE-18: «Decreto 777 de 1992: monto máximo del 5 % para honorarios (solo convenios)». El 5 % era el tope de gastos de interventoría contratada en los contratos del art. 355 CP con entidades sin ánimo de lucro (art. 6), y el decreto entero está derogado por el Decreto 92 de 2017. El artículo de Scielo (sección 3.2) lo cita como si estuviera vigente; citar el Decreto 92 de 2017 si hace falta la regla actual.

### 2.3 Cifras corregidas

- PLA-18. Texto original: «677 procesos terminados anormalmente en mínima cuantía, 35,62 % del total nacional en el sector G (2010-2015)». Corrección verificada: El texto dice: «el 35.62% (677 procesos) del total de procesos terminados después de convocados (1901 procesos)». El denominador son los 1.901 procesos terminados tras la convocatoria en todas las modalidades; la Tabla 5 lista 12 procesos de mínima cuantía y §4.2 trata capacidad financiera. El acotamiento «total nacional en el sector G» no aparece con esa cifra.
- PRE-18. Texto original: «Capital de trabajo para plazos menores de 12 meses: 25 % de (presupuesto − anticipo)». Corrección verificada: La guía trae TRES fórmulas para plazo < 12 meses, por modalidad: Licitación pública y Selección Abreviada de Menor Cuantía (obra): «CTd = (POE − Anticipo o Pago anticipado) x 33%» (p. 51); Concurso de méritos (consultoría/interventoría): «x 25%» (p. 52); Mínima cuantía: «x 15%» (p. 52). Para obra civil el porcentaje es 33 %, no 25 %; el 25 % solo aplica a concurso de méritos.
- TRA-06. Texto original: «30 días para corregir y reingresar desde la primera carta de devolución; si no, cesan los efectos del RUP». Corrección verificada: El artículo dice: 30 días desde la primera carta de devolución para corregir y reingresar; si no lo hace, «si es inscripción por primera vez ... se le devolverá el dinero al proponente, si es renovación o actualización, habrá entonces que cesar los efectos de su Registro Único de Proponentes». La cesación de efectos aplica solo a renovación/actualización; en inscripción nueva se devuelve el dinero. Es doctrina, no la norma.
- TRA-25. Texto original: «Inhabilidad de hasta 10 años cuando el daño supera 100 SMMLV, según los ponentes (no verificado en la ley)». Corrección verificada: La ley sí lo sustenta, con condiciones: el responsable fiscal es inhábil para contratar con el Estado 5 años desde la ejecutoria del fallo; si pasados esos 5 años no ha pagado ni ha sido excluido del boletín, «continuará siendo inhábil por cinco años si la cuantía ... fuere superior a 100 salarios mínimos legales mensuales vigentes» (2 años si >50 y ≤100; 1 año si >10 y ≤50; 3 meses si ≤10). Total hasta 10 años, pero cesa cuando la Contraloría certifica el pago. No está en Ley 2195/2022.

### 2.4 Dos vacíos del crítico que el código ya cubre

El crítico de completitud no revisó el código. Estos dos temas figuran como vacíos y ya están implementados:

- **Contribución especial del 5 % de obra pública.** Ya en el código: `lib/apu/calculo.js:79` (`CONTRIBUCION_OBRA_PUBLICA = 5`), y el APU la calcula. El vacío era de la investigación, no de la aplicación.
- **Inhabilidad por incumplimiento reiterado (Ley 1474 de 2011, art. 90).** Ya en el código para los socios: `lib/socio.js:114` (`inhabilidad_reiterada`). No se verificó si el chequeo cubre también a la propia empresa del usuario.

### 2.5 Lo que no se pudo verificar

31 de 173 normas y cifras quedaron sin verificar, y 155 cifras de la base no entraron en la verificación. Las causas declaradas por los agentes son bloqueos de YouTube, de repositorios con verificación anti-bots y de un servidor que respondió 503. Están marcadas como «sin verificar» en cada sección y en §4.

## 3. Catálogo de problemas por etapa

Cada ficha trae su causa, su consecuencia en plata, la solución que documentan las fuentes, las cifras con su verificación y su fuente. Las cifras que no están verificadas se dicen así, sin reescribirlas.

### 3.1 Planeación de la entidad (24)

#### PLA-01 · La entidad puede abrir una obra de transporte solo con factibilidad (fase 2), sin diseños para construir (fase 3)

- **Gravedad:** alta. A precio global, la diferencia de cantidades por diseño inmaduro la paga el contratista y puede comerse la utilidad del contrato.
- **Tipos de contrato:** obra
- **Descripción:** La Ley 1682 de 2013 (art. 16) permite abrir procesos de infraestructura de transporte con estudios de ingeniería en etapa de factibilidad «como mínimo», y la Ley 1474 (art. 87) pide estudios que establezcan la «viabilidad», no diseños definitivos. Las cantidades del presupuesto pueden no salir de un diseño construible. Para otras obras rige el art. 25 num. 12 de la Ley 80 modificado por el art. 87 de la Ley 1474.
- **Causa:** Piso legal bajo: factibilidad como mínimo (Ley 1682 art. 16) y «viabilidad» (Ley 1474 art. 87); la fase 3 (la que permite que «un constructor pueda materializar el proyecto») puede no existir al ofertar.
- **Consecuencia en plata:** Mayores cantidades, ítems no previstos y mayor permanencia cuando se diseña el detalle; a precio global la diferencia es del contratista (Guía de obra CCE, p. 93). Ninguna fuente da cifra.
- **Solución documentada:** CCE recomienda que el presupuesto a precio global se soporte en diseños fase III «completos y suficientes» y sin «alcances pendientes por definir» (Guía de obra, p. 30); la tesis de ingeniería recoge la recomendación gremial de contar con fase III cuando el riesgo de imprevistos es alto. Para el contratista: verificar en los estudios previos qué fase de diseños existe antes de aceptar un precio global.
- **Vigencia a revisar:** Solo aplica a infraestructura de transporte. La página del Senado no mostró modificación del art. 16, pero la Ley 1682 ha tenido reformas (Ley 1742 de 2014 en otros artículos); verificar vigencia antes de citarla.
- **Fuentes (4):** F-006, F-144, F-146, F-378

#### PLA-02 · Obra licitada con estudios y diseños deficientes o viejos: termina en adiciones, prórrogas, suspensiones y pleitos

- **Gravedad:** alta. Mayor permanencia y obras no previstas sin reconocimiento, más riesgo fiscal: pérdidas grandes y pleitos largos.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** Las fuentes coinciden en que la planeación deficiente de la entidad (estudios previos pobres, diseños incompletos o desactualizados, ajustes de diseño que en realidad son diseños nuevos) se traduce en adiciones, prórrogas y suspensiones, obras inconclusas y litigios, y que luego el retraso se le atribuye al contratista. Cumplir plazo y costo pactados es la excepción. Según la ANDJE (citada en una tesis), la deficiente planeación es la causa más común de los pleitos contractuales; y el Estado también demanda a sus contratistas.
- **Causa:** Planeación deficiente de la entidad; diseños ausentes, incompletos o de baja calidad (también los de un consultor externo); proyectos aprobados sin factibilidad; interventoría y supervisión débiles o con rol mal definido.
- **Consecuencia en plata:** Precios no previstos, mayor permanencia, prórrogas, riesgo de no pago, hallazgos y responsabilidad fiscal compartida, y pleitos. Ejemplos: el IDU adicionó $9.521.683.656 para reconocer la consultoría hecha por el contratista de obra y pagó $16.370.453.439 en obras complementarias; una fuente de materiales pasó de 5 km a 90 km. El consultor de diseños queda expuesto a repetición (art. 53 Ley 80; inferencia del agente, la sentencia no lo condena).
- **Solución documentada:** Revisar la madurez del proyecto (estudios y diseños previos, art. 25 num. 12 Ley 80 modificado por la Ley 1474) antes de ofertar; presupuestar el riesgo de prórrogas; dejar constancia escrita del estado de los diseños antes del acta de inicio y formalizar los ajustes. Para el consultor: delimitar el alcance y documentar supuestos.
- **Cifras:**
  - «Solo 10 de 64 procesos de interventoría cumplieron tiempos y precio pactado (15,63 %); en 18 hubo adiciones presupuestales y prórrogas» (verificada: confirmada). Chamorro/Serrano et al. 2022, Cuadro 1, Resultados y Conclusiones · F-353.
  - «Auditoría de 46 contratos de obra con gestión «Desfavorable» (78,01)» (sin verificar (no entró en la verificación de normas)). CGR 2011, Informe «Obras inconclusas», pág. 5-6 · F-466.
  - «IDU adicionó $9.521.683.656 por consultoría hecha por el contratista de obra y pagó $16.370.453.439 en obras complementarias» (sin verificar (no entró en la verificación de normas)). Consejo de Estado, rad. 68440 (12-abr-2024), hechos num. 11-13 · F-210.
  - «2.908 procesos contractuales activos contra entidades nacionales, pretensiones por $6,8 billones (ANDJE 2015, vía tesis)» (sin verificar (no entró en la verificación de normas)). Unigarro 2015, p. 13 · F-431.
  - «La Nación como demandante: 1.433 controversias contractuales por $10,2 billones (28,7 % del valor que reclama)» (verificada: confirmada). ANDJE, Informe de litigiosidad 2.º trimestre 2026, pág. 32 · F-456.
  - «Fuente de materiales que pasó de 5 km a 90 km por estudios de 2020 usados en una contratación de 2024» (sin verificar (no entró en la verificación de normas)). Video «Responsabilidad fiscal del contratista», min 24 · F-533.
- **Vigencia a revisar:** CGR 2011 y muestra de interventoría de 2016 o anterior (un solo departamento). Las cifras 2014-2015 de la ANDJE vienen de derechos de petición citados en una tesis, sin verificar en la fuente primaria; las de 2026 sí son de la ANDJE.
- **Fuentes (9):** F-114, F-144, F-210, F-353, F-431, F-456, F-466, F-533, F-539

#### PLA-03 · Predios sin comprar o con títulos dudosos y licencias o permisos sin tramitar al abrir el proceso

- **Gravedad:** alta. Puede terminar en contrato liquidado sin obra o en paralizaciones largas que solo se cobran si hubo salvedad.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** La entidad licita sin gestión predial, sin estudio de títulos actualizado o sin las licencias y permisos (ambientales, urbanísticos, de redes), o traslada su trámite al contratista y al interventor. La licencia urbanística no garantiza la titularidad del predio. Resultado: obra paralizada o contrato liquidado sin ejecutar.
- **Causa:** La entidad no hace en planeación la gestión predial, los estudios de títulos ni los trámites de licencias y permisos que son su responsabilidad.
- **Consecuencia en plata:** Suspensiones, mayor permanencia y costos de la paralización; el cobro depende de que el contratista haya dejado salvedad en las actas. Caso CGR: proyecto de $443.105.016 liquidado anticipadamente sin obra por falsa tradición del predio (la fuente no cuantifica lo que perdió el contratista).
- **Solución documentada:** La adquisición predial es responsabilidad del Estado (Ley 1682, art. 20) y en transporte la viabilidad ambiental y la consulta previa son requisito previo de apertura (art. 39). La entidad responde por no obtener la licencia ambiental. CCE pide revisar en planeación licencias y permisos «completos y suficientes» (Guía de obra p. 51) y los incluye como riesgo recurrente de la matriz (p. 38). Para el contratista: pedir certificado de tradición y matrícula inmobiliaria antes de ofertar (inferencia) y dejar salvedad en las actas; planes de contingencia para entrega tardía de predios (Mesa y Muñoz).
- **Cifras:**
  - «Proyecto de $443.105.016 liquidado anticipadamente «sin ejecución de obra» por falsa tradición del predio» (sin verificar (no entró en la verificación de normas)). CGR 010-2025 (Fonvivienda), p. 80 impresa · F-464.
- **Vigencia a revisar:** La tesis de reparto de riesgos (2012) es anterior al Decreto 1082 de 2015 y a los documentos tipo: cede ante la matriz concreta del pliego.
- **Fuentes (6):** F-006, F-146, F-167, F-316, F-428, F-464

#### PLA-04 · El contrato puede anularse por falta de planeación de la entidad y el contratista quedar sin indemnización

- **Gravedad:** alta. Puede costar el contrato y la indemnización reclamada.
- **Tipos de contrato:** obra
- **Descripción:** Una línea del Consejo de Estado (Sección Tercera, Subsección C, 2013; radicados 27315, 24809 y 26637) considera que licitar sin predios, licencias o diseños vuelve ilícito el objeto, y el juez puede anular de oficio. Esa línea está disputada: las Secciones Cuarta y Quinta la cuestionaron por tutela.
- **Causa:** La entidad licita sin predios, licencias o diseños; la falta de planeación se traslada al contrato como objeto ilícito.
- **Consecuencia en plata:** El contratista que demanda perjuicios puede salir con el contrato anulado y sin indemnización, o con rubros no reconocidos en la liquidación.
- **Solución documentada:** Divulgar antes del proceso los componentes de la planeación y reforma normativa (propuesta de los autores). Para el oferente: investigar la viabilidad (predios, licencias, diseños) antes de ofertar.
- **Vigencia a revisar:** Línea jurisprudencial disputada; verificar la postura vigente de la Sección Tercera antes de tratarla como regla.
- **Fuentes (1):** F-344

#### PLA-05 · Indicadores financieros exigidos sin relación con el monto ni con el sector: dejan fuera a empresas aptas

- **Gravedad:** media. Cuesta la preparación de una oferta perdida y la oportunidad; no la garantía ni el contrato firmado.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** Las entidades fijan liquidez, endeudamiento, capital de trabajo, ROE y ROA de forma arbitraria, sin anclarlos al análisis del sector ni a la responsabilidad financiera del contrato. Los estudios lo leen como un medio para dirigir el proceso («pliego sastre»). Medido sobre todo en procesos anteriores a los documentos tipo obligatorios.
- **Causa:** Cada entidad fija libremente los indicadores; no existe relación entre requisitos financieros y montos de contratación.
- **Consecuencia en plata:** El contratista capaz queda fuera por un indicador y pierde lo invertido en preparar la oferta; la competencia se restringe.
- **Solución documentada:** Documentos tipo obligatorios (Ley 1882 de 2018 y Ley 2022 de 2020) que fijan habilitantes; que las entidades fijen requisitos «acordes y cumplibles» según el sector. Fuera del alcance de los documentos tipo: observar el proyecto de pliego con el dato del sector.
- **Cifras:**
  - «Requisitos financieros de una interventoría de unos 62 SMMLV cumplidos simultáneamente solo por el 6 % de las empresas colombianas (51 % para una de 120 SMMLV)» (verificada: confirmada). Serrano Guzmán et al. 2022, Cuadro 5 · F-353.
  - «Solo el 9,51 % de las licitaciones de 2017 exigió una liquidez acorde con el promedio del sector según la CCI (1,31)» (verificada: confirmada). Rojas et al. 2021, p. 222 (pág. PDF 10) · F-336.
- **Vigencia a revisar:** Datos de 2010-2017, anteriores a los documentos tipo de obra (desde 2019; v2 de feb-2026). Hoy aplica sobre todo a procesos o entidades no cubiertos por documentos tipo; no se midió el estado actual.
- **Fuentes (5):** F-328, F-337, F-352, F-353, F-445

#### PLA-06 · Pliego sastre por experiencia o requisito técnico: solo cumple un proponente

- **Gravedad:** media. Pérdida acotada: la oferta preparada y la oportunidad.
- **Tipos de contrato:** obra, interventoría, consultoría, bienes
- **Descripción:** La entidad exige experiencia acumulada superior al presupuesto, más específica que la que el objeto necesita, exclusiva con entidades estatales o en un territorio, o un requisito técnico o de equipo innecesario (planta de asfalto propia, ficha técnica a la medida). A veces el pliego lo redacta el futuro ganador. Incluso con documentos tipo la entidad conserva discrecionalidad para definir qué experiencia pedir.
- **Causa:** Exigencias habilitantes sin proporción con el contrato y sin justificación en el análisis del sector; direccionamiento, sobre todo en municipios.
- **Consecuencia en plata:** Oferta preparada para un proceso con dueño, o un proceso cerrado de antemano del que el contratista ni se entera. Ninguna fuente cuantifica el costo para el proponente.
- **Solución documentada:** Principio de proporcionalidad: experiencia mínima necesaria, «adecuada y proporcional» y sin exigir objetos idénticos (Manual de habilitantes CCE, p. 15); justificar los criterios en el estudio previo (Procuraduría). Documentos tipo obligatorios e inalterables (Ley 2022 de 2020; C-034 de 2026). Para el contratista: observar el proyecto de pliego pidiendo la justificación; inferencia de un agente: pedir que se acepte equipo alquilado o comprometido.
- **Cifras:**
  - «La ausencia de competidores está asociada a los requisitos habilitantes en el 32 % de los procesos; 53 % en gobiernos municipales» (verificada: confirmada). Meléndez, Foco Económico, entrada del 02-feb-2016 · F-593.
  - «Se exigió como requisito técnico contar con planta de asfalto en un contrato de mantenimiento de malla vial» (sin verificar (no entró en la verificación de normas)). NoticiasUno, video, 1:31 · F-574.
- **Vigencia a revisar:** Datos de 2014-2016, antes de los documentos tipo; la matriz de experiencia ha cambiado entre versiones (v2 feb-2026). El Decreto 342 de 2019 citado aplicaba a bienes y servicios dentro del pliego tipo; el boletín de la Procuraduría no se abrió.
- **Fuentes (12):** F-047, F-064, F-107, F-279, F-359, F-451, F-562, F-566, F-570, F-573, F-574, F-593

#### PLA-07 · La entidad no aplica el documento tipo o lo altera (sobre todo la experiencia) y reduce la competencia

- **Gravedad:** media. Proceso perdido para quien queda fuera; no compromete garantía ni contrato.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** Una parte de las entidades no implementa el pliego tipo o le introduce ajustes: cambian la matriz de experiencia, piden un segmento UNSPSC distinto del 72, agregan causales de rechazo o factores de calidad, piden la garantía extendida donde está prohibida o usan una versión no vigente. La modificación más recurrente es la de experiencia. La revisión de CCE era manual y SECOP no tenía un campo que identificara los procesos de pliego tipo, así que un pliego alterado puede llegar al cierre sin observación. Las fuentes dan cifras distintas de cumplimiento y de oferentes según fecha y muestra (20 % no implementa y 30 % ajusta, según CCI 2025; 35 % completa, 50 % con modificación y 15 % se aparta, según el Observatorio ~2021-2022; 23,38 frente a 4 proponentes en una infografía y 17 frente a 2-3 en una capacitación).
- **Causa:** Baja capacidad institucional, direccionamiento, estructurador que no usa la matriz correcta; control manual (unos 5 procesos al día por persona) y procesos ubicados por palabras clave.
- **Consecuencia en plata:** Oferta preparada que queda fuera por un requisito que no debía existir. Sin documento tipo, 2-3 oferentes y precio casi igual al presupuesto oficial.
- **Solución documentada:** Cláusula de inalterabilidad (art. 2.2.1.2.6.1.4 Decreto 1082 de 2015; Res. 240 de 2020 según la infografía) y revisión del Observatorio de CCE, que oficia a la entidad en etapa de borrador. La Corte (C-119 de 2020) declaró exequibles los documentos tipo sin condicionamiento. Para el contratista: observar en el plazo de observaciones señalando los requisitos añadidos; el pliego es demandable por nulidad simple. Propuesta académica: comparar cada apartado con el documento base (similitud bajo 90 %) para reducir ~97 % el tiempo de revisión.
- **Cifras:**
  - «20 % de las entidades no implementó el pliego tipo y 30 % introdujo ajustes (OCCI 2025, de segunda mano)» (sin verificar). Toloza y Amaya 2025, pág. 26 · F-370. Nota del verificador: El repositorio responde con el muro anti-bots Anubis («Making sure you're not a bot!», reto JS; en WebFetch: «acceso denegado… Anubis código 9e4edb5b6b850c41»). Nota: las cifras de primera mano de Moreno Mier (Uniandes, Tabla 3) son 35,36 / 50,29 / 14,34 %, que no coinciden con 20 %/30 %.
  - «Un solo oferente en obras viales bajó de 17 % a 12 %» (verificada: confirmada). Open Contracting Partnership, 16-jul-2020 · F-479.
  - «23,38 proponentes en promedio con documento tipo frente a 4 sin él (transporte, 2021)» (sin verificar (no entró en la verificación de normas)). Infografía CCE 23-ene-2021, punto 01 · F-002.
  - «Implementación completa del 35 %, con alguna modificación del 50 % y 15 % se apartó; con documento tipo 17 oferentes en promedio y 12 habilitados» (sin verificar). Capacitación Documentos Tipo CCE, min 99-106 · F-518. Nota del verificador: YouTube redirige a google.com/sorry (captcha); sin transcripción accesible desde este entorno. Las tres proporciones coinciden con la Tabla 3 de Moreno Mier (Uniandes DCEDE 2022-32): 35,36 / 50,29 / 14,34 %, verificada en DET-10.
  - «En 2020 se revisaron 1.522 procesos de 645 entidades; cada integrante revisaba unos 5 procesos al día» (sin verificar (no entró en la verificación de normas)). Melo y Sánchez 2021, PDF p. 6 · F-409.
- **Vigencia a revisar:** Cifras de 2020-2022 (Observatorio y OCP) y de 2025 de segunda mano (CCI vía Unilibre); no actualizadas. Documentos tipo vigentes: v2 feb-2026. CCE pudo haber agregado después una marca de documento tipo en SECOP II; verificar en el dataset vivo.
- **Fuentes (7):** F-001, F-002, F-244, F-370, F-409, F-479, F-518

#### PLA-08 · Pliego tipo inmodificable que no encaja con la región: procesos desiertos repetidos

- **Gravedad:** baja. Molestia y tiempo de preparación; no hay pérdida de contrato ni garantía.
- **Tipos de contrato:** obra
- **Descripción:** Según un abogado (2019), como las condiciones del documento tipo no se pueden cambiar ni después de declarar desierto el proceso, una entidad puede quedarse «de manera indefinida» declarando desierto. La Ley 2022 de 2020 ordena considerar regiones, cuantía y economía local al adoptar los documentos tipo.
- **Causa:** Inalterabilidad del documento tipo aun tras un desierto.
- **Consecuencia en plata:** Inferencia: tiempo perdido preparando ofertas para procesos que se declaran desiertos y reaparecen igual. Sin cifra.
- **Solución documentada:** La Ley 2022 de 2020 (art. 1) ordena tener en cuenta las características de las regiones, la cuantía y la economía local.
- **Vigencia a revisar:** Opinión de 2019, anterior a la Ley 2022 de 2020; no se verificó si la norma actual permite ajustar el pliego tras un desierto.
- **Fuentes (2):** F-107, F-566

#### PLA-09 · Presupuesto oficial desactualizado: precios históricos indexados con IPC y sin ajuste por cambio de vigencia

- **Gravedad:** alta. Ofertar con descuento sobre un presupuesto corto es pérdida asumida por el contratista y, según el Consejo de Estado, no reclamable.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** La guía de CCE recomienda indexar precios históricos con el IPC (del año anterior), y entidades pequeñas actualizan sus bases de APU igual; el IPC no sigue el costo de insumos de construcción, que sube por saltos (acero). Además, el presupuesto se calcula a precios del momento aunque la ejecución cruce al año siguiente: el IDU lo prevé con el ICCP, la guía de CCE solo indexa los precios históricos.
- **Causa:** Indexación con IPC en lugar de índices de costos de construcción; pocas cotizaciones («la mayor cantidad posible», sin mínimo); falta de previsión de ajuste por vigencia.
- **Consecuencia en plata:** En ítems ligados a commodities el tope puede quedar bajo el costo real y el margen de ofertar al 93-95 % se reduce (inferencia). Si el contratista oferta cerca del presupuesto con APU subestimados, la pérdida es suya porque aceptó los precios (CE 59309). Sin cláusula de reajuste, el alza del año siguiente es suya (inferencia).
- **Solución documentada:** CCE: dejar constancia de bases e indexaciones, usar mediana y coeficiente de variación, tratar atípicos; la hoja de APU del Formulario 1 existe para que el interesado observe «que el presupuesto no es suficiente» o decida no ofertar (C-065 de 2020); la entidad debe declarar el AIU (C-093 de 2020). IDU: precios tope de la vigencia y ajuste por cambio de vigencia con el ICCP (A = v/pc × m × f). Para el contratista: observar el presupuesto.
- **Cifras:**
  - «Ítem INVIAS 640.1 (acero): precio promedio de $4.905 en 2017 a $6.585 en 2021» (sin verificar (no entró en la verificación de normas)). Nieto Taborda 2021, p. 11-12 · F-446.
  - «Se sugiere tomar el IPC del año anterior para actualizar un precio de 2024 en 2025» (sin verificar (no entró en la verificación de normas)). Training CCE «Guía de análisis del sector», min 48 · F-528.
- **Vigencia a revisar:** C-065 y C-093 son de 2020 y comentan versiones anteriores de los documentos tipo (v2 feb-2026); verificar que la hoja de APU siga en el Formulario 1 vigente.
- **Fuentes (9):** F-007, F-050, F-052, F-138, F-139, F-197, F-444, F-446, F-528

#### PLA-10 · Estudio de mercado mal hecho, ajustado o no publicado: el presupuesto no refleja el precio real

- **Gravedad:** media. Afecta la referencia de precio; el daño depende de que el contratista no lo detecte al ofertar.
- **Tipos de contrato:** obra, bienes, servicios, todos los tipos
- **Descripción:** Estudios de mercado basados en la cotización más baja o en cotizaciones que no dicen si incluyen IVA o transporte; cotizaciones elevadas o ajustadas para sostener un precio; precios históricos de SECOP poco usados. La Guía de Estudios del Sector 2025 imprime con signo menos la fórmula del límite superior de atípicos (Q3 − RIC×1,5) aunque su ejemplo suma: aplicada literal descarta cotizaciones altas legítimas. Si el estudio de mercado no está publicado o es opaco, el contratista no puede saber si el presupuesto está desfasado. Las fuentes apuntan en ambos sentidos: presupuestos inflados por cotizaciones elevadas (bienes, 2014) y presupuestos sesgados a la baja.
- **Causa:** Sin metodología obligatoria (el Decreto 1600 de 2024 exige análisis «públicos y abiertos» pero no impone método); cotizaciones entregadas por los dominadores del mercado; ningún umbral legal de sobreprecio.
- **Consecuencia en plata:** Presupuestos fuera de mercado: deprimidos (obra no rentable o proceso poco atractivo que luego se adiciona) o inflados (sobreprecio). Distorsiona la referencia sobre la que el contratista fija su descuento. Ninguna fuente da cifra.
- **Solución documentada:** Publicar en SECOP el estudio del sector y de mercado con su metodología (D. 1082 art. 2.2.1.1.1.7.1; C-818 de 2025). CCE: no limitar el presupuesto a la cotización menor, documentar empresas, bases e indexación. IDU: mínimo tres cotizaciones por insumo con IVA, transporte, descuentos y fecha. Usar precios históricos como punto de partida. Medir sobreprecio con cotizaciones de los mismos productos más impuestos, transporte y pólizas (Corte Suprema, proceso 24158 de 2007, citado en tesis).
- **Vigencia a revisar:** Ramírez Rusinque es de 2014 (anterior a SECOP II y a los datos abiertos) y se refiere a bienes. El texto del Decreto 1600 de 2024 no se abrió; se cita por el concepto C-818 de 2025.
- **Fuentes (7):** F-007, F-019, F-025, F-032, F-139, F-331, F-413

#### PLA-11 · El borrador del pliego trae APU con errores y al corregirlos la entidad sube unos ítems y baja otros para no mover el total

- **Gravedad:** alta. Superar el precio oficial de un ítem vuelve la oferta no admisible: se pierde el proceso entero.
- **Tipos de contrato:** obra
- **Descripción:** Por errores aritméticos o de estructura del presupuesto, la entidad corrige APU entre el borrador y el pliego definitivo, pero como el total está comprometido en el CDP compensa cambiando el precio de otras actividades.
- **Causa:** Errores en los estudios previos y un total fijado por el CDP que no se puede mover sin suspender el proceso.
- **Consecuencia en plata:** Quien no compara borrador y definitivo puede ofertar un ítem por encima del tope oficial y quedar no admisible; los ítems bajados para compensar pueden quedar bajo el costo real. La fuente no cuantifica la pérdida.
- **Solución documentada:** Observar el borrador: según la fuente, los proponentes que detectaron los errores lograron que se corrigieran. Comparar ítem por ítem el presupuesto del borrador con el definitivo.
- **Cifras:**
  - «La entidad corrigió el 16,20 % de los APU contratados (2016-2017) y el 5,32 % en 2021, compensando con otras actividades» (verificada: confirmada). Nieto Taborda 2021, p. 9-10 · F-446.
- **Vigencia a revisar:** Muestra del INVIAS 2016-2017 y 2021; el método de evaluación pudo cambiar con los documentos tipo v2.
- **Fuentes (1):** F-446

#### PLA-12 · Los APU de referencia del INVIAS no coinciden con el presupuesto oficial y suponen 1 km de acarreo

- **Gravedad:** media. Reproceso o margen mal calculado; puede llevar a no admisibilidad de un ítem si se copia la lista.
- **Tipos de contrato:** obra
- **Descripción:** La lista de APU de referencia del INVIAS es orientativa y declara que no es vinculante; sus precios no coinciden con los presupuestos oficiales de la propia entidad (en algunos ítems por encima, en otros por debajo). Supone 1 km de acarreo y precios de insumo en planta sin transporte, «para que el usuario las modifique»; una entidad que los copia sin ajustar presupuesta corto en zonas alejadas.
- **Causa:** Listas orientativas: cada proyecto ajusta rendimientos, acarreos e insumos; entidades que copian sin estudio de campo.
- **Consecuencia en plata:** Ítems con transporte de material subpresupuestados; el contratista que presupuesta copiando la lista en vez de los precios del pliego puede pasarse del tope de un ítem o dejar margen sin usar.
- **Solución documentada:** INVIAS: cada estructurador debe hacer estudios de campo y ajustar a las condiciones del proyecto; la lista no obliga a otras entidades. Para el contratista: presupuestar con los precios del pliego y ajustar acarreos reales.
- **Cifras:**
  - «Antioquia 2021: subbase 320.1 a 143.126 $/m3 en el presupuesto oficial frente a 96.031 $/m3 en la lista de referencia» (sin verificar (no entró en la verificación de normas)). Nieto Taborda 2021, p. 15 y anexo, Tabla 4 · F-446.
  - «Acarreo asumido de 1 km en todos los APU de referencia; precios en planta sin transporte» (sin verificar (no entró en la verificación de normas)). INVIAS APU regionalizados 2026-1, Consideraciones No. 4 y 5 · F-141.
- **Vigencia a revisar:** La lista de 2021 fue reemplazada por los APU regionalizados por provincia (2026-1); verificar si la brecha persiste.
- **Fuentes (2):** F-141, F-446

#### PLA-13 · Indirectos del presupuesto oficial sin método: AIU sin desglose en obra y factores multiplicadores de 2004 en consultoría e interventoría

- **Gravedad:** media. Pérdida acotada de margen, no del contrato.
- **Tipos de contrato:** obra, consultoría, interventoría
- **Descripción:** En obra, la mayoría de entidades municipales asigna el AIU por experiencia, sin método ni desglose, así que el proponente no puede comprobar si cubre personal, pólizas, impuestos y estampillas. En consultoría e interventoría el IDU arma el presupuesto con un factor multiplicador sobre el personal (2,55 a 2,35 según cuantía) fijado en una mesa de trabajo IDU-CCI-ECI de 2004, más 1,10 sobre costos directos operacionales.
- **Causa:** No hay norma que fije el método del AIU; factores multiplicadores heredados sin actualización documentada.
- **Consecuencia en plata:** Si la A oficial o el factor no alcanzan para las cargas reales, la diferencia sale de la utilidad del contratista. Las fuentes no cuantifican el efecto; en Manizales la A promedio (21,24 %) quedó por encima del rango del manual de Detekta (12-20 %).
- **Solución documentada:** Parametrizar el AIU: personal, dedicaciones, pólizas y carga tributaria municipal dentro de la A; I de 2 % justificado; utilidad escalonada por tamaño (matriz IDU 2012). Asignar gastos generales como porcentaje del costo directo «ha dado lugar a costosos errores». En consultoría: comparar el factor del pliego con la carga prestacional y tributaria real de la firma (inferencia).
- **Cifras:**
  - «60 % de la muestra no usa método para el AIU y solo el 24 % presenta AIU detallado» (verificada: confirmada). Castro y Rodríguez 2018, p. 44-45 · F-383.
  - «Manizales: A promedio 21,24 %, U 5,96 %, AIU 28,73 %» (verificada: confirmada). Castro y Rodríguez 2018, p. 51-52 · F-383.
  - «Factor multiplicador de 2,55 a 2,35 según valor del contrato en SMMLV, fijado en 2004» (verificada: confirmada). IDU GU-DP-017 v1.0 (2013), p. 7 · F-138.
- **Vigencia a revisar:** Muestra de Manizales de 2018 (25 contratos); escala de utilidad del IDU de 2012 llegó por fuente secundaria. La guía del IDU de 2013 cita el Decreto 734 de 2012, derogado; verificar si el IDU mantiene los factores.
- **Fuentes (3):** F-138, F-383, F-449

#### PLA-14 · Matriz de riesgos copiada, mal hecha u omitida: no refleja los riesgos reales del contrato

- **Gravedad:** media. Expone a asumir riesgos no previstos; el monto depende del riesgo que se materialice.
- **Tipos de contrato:** obra, servicios, consultoría
- **Descripción:** Los funcionarios reutilizan matrices de otras entidades sin revisarlas, incluyen riesgos ya cubiertos por póliza y aplican mal la valoración; en la contratación directa de servicios profesionales a veces se omite la matriz.
- **Causa:** Desconocimiento de la metodología (Decreto 1082 art. 2.2.1.1.1.6.3, CONPES 3714) y copia sistemática de matrices.
- **Consecuencia en plata:** Un riesgo previsible mal asignado o no previsto termina en discusión durante la ejecución y, por defecto, a cargo del contratista. Ninguna fuente da cifra en pesos.
- **Solución documentada:** Aplicar estimación, tipificación y asignación de riesgos también en contratación directa; memoria organizacional en las entidades. No hay solución documentada desde el lado del contratista.
- **Cifras:**
  - «De 3.947 riesgos evaluados en 369 procesos, 216 correctamente identificados y 3.731 mal clasificados» (sin verificar (no entró en la verificación de normas)). Ramírez-Pérez et al. 2022, p. 13 · F-332.
- **Vigencia a revisar:** Datos de SECOP I (2016-2021); las matrices de los documentos tipo vigentes pueden haber reducido el problema, sin verificar.
- **Fuentes (2):** F-313, F-332

#### PLA-15 · Obra, diseños o interventoría que nunca salen a proceso competitivo: convenios, contratos interadministrativos, urgencias de ESP y consultoría disfrazada de servicios

- **Gravedad:** media. Oportunidad perdida de mercado; no hay pérdida directa sobre un contrato propio.
- **Tipos de contrato:** obra, interventoría, consultoría, servicios
- **Descripción:** Se usa un convenio de cooperación o asociación con una ESAL (art. 355 C.P., art. 96 Ley 489), un contrato interadministrativo con una universidad pública, una SEM o asociación de entidades (que luego subcontrata con particulares sin proceso), una figura casi igual a la urgencia manifiesta en los manuales de las ESP, o un contrato de prestación de servicios profesionales para diseños y factibilidades, para lo que en realidad es un contrato de obra o una consultoría que debería ir por licitación, selección abreviada o concurso de méritos.
- **Causa:** Elusión de la modalidad competitiva por contratación directa; lectura errada del lit. c del num. 4 del art. 2 de la Ley 1150 (modificado por la Ley 1474 art. 92); frontera difusa entre servicios profesionales y consultoría.
- **Consecuencia en plata:** El contratista pierde el mercado: no hay proceso al cual presentarse. En regalías, cerca de $4,2 billones fueron por contratación directa hasta jun-2019.
- **Solución documentada:** La obra con universidad, SEM o asociación de entidades exige licitación o selección abreviada y su ejecución (incluida la subcontratación) se rige por el Estatuto (Concepto CE 2092/2012). Un contrato conmutativo con una ESAL va por el Estatuto General, no por el Decreto 092 de 2017; el convenio de asociación sin competencia exige aporte de la ESAL de al menos 30 % en dinero. Diseños y factibilidades van por concurso de méritos. Para el contratista: observaciones o denuncia ante los órganos de control.
- **Cifras:**
  - «En regalías, cerca de $4,2 billones (12 % de $33,9 billones) por contratación directa hasta jun-2019» (verificada: confirmada). CGR, «La contratación directa como mecanismo excepcional…», p. 8 · F-465.
- **Vigencia a revisar:** Concepto CE de 2012 (sobre el Decreto 734 de 2012, derogado); la regla de la Ley 1150 sigue en el texto compilado a sep-2026, sin revisar si la Ley 2294 de 2023 la tocó. El Decreto 092 se cita por un proyecto de guía CCE de sep-2025. La tesis de ESP es de 2014, anterior a la publicación obligatoria en SECOP II (Ley 2195 de 2022). Los videos citan el Decreto 1082 art. 2.2.1.2.1.4.9 y la sentencia CE 41719 de 2013 sin abrirlos. La CGR reporta que los convenios decrecieron desde 2017.
- **Fuentes (7):** F-009, F-098, F-117, F-142, F-452, F-465, F-511

#### PLA-16 · La contratación directa con la economía popular (APPo) para obras y vías terciarias ya no existe desde febrero de 2026

- **Gravedad:** baja. Es un cambio favorable al contratista; el riesgo es solo apoyarse en guías desactualizadas.
- **Tipos de contrato:** obra
- **Descripción:** La Corte (C-033 de 2026, 25-feb-2026) declaró inexequibles los arts. 100 y 101 de la Ley 2294 de 2023 por violar la reserva de ley del Estatuto; el Decreto 874 de 2024 perdió fuerza ejecutoria. Una guía de CCE de dic-2024 todavía presenta las APPo como vigentes.
- **Causa:** Inexequibilidad de la vía directa con organizaciones comunitarias.
- **Consecuencia en plata:** La mínima cuantía de obra (vías terciarias, infraestructura social) vuelve a la competencia abierta. Sin cifra.
- **Solución documentada:** Si una entidad sigue usando la figura APPo después del 25-feb-2026, es una observación o denuncia válida.
- **Vigencia a revisar:** Se leyó el comunicado, no el texto íntegro: puede haber efectos modulados para contratos en curso.
- **Fuentes (3):** F-060, F-134, F-240

#### PLA-17 · Bienes y servicios uniformes en acuerdo marco: la compra va por la Tienda Virtual y el proveedor fuera del acuerdo pierde ese mercado

- **Gravedad:** media. Pérdida de mercado, no de un contrato en curso.
- **Tipos de contrato:** bienes, servicios
- **Descripción:** Si el bien está en un acuerdo marco, las entidades del Estatuto General deben comprarlo por la TVEC; la subasta y la bolsa quedan como vía residual, y esas órdenes no aparecen en los buscadores de SECOP II. Por miedo a investigaciones, las entidades rebajan sus requisitos para encajar en el catálogo en vez de justificar otra vía. Antes de la obligatoriedad, la queja era la selección solo por precio y el poco uso de la agregación de demanda en lo territorial (OCDE 2016). Las fuentes difieren por fecha sobre el alcance: CE 56.307 (2021) lo limitaba a la rama ejecutiva nacional bajo el Decreto 1510 de 2013; la Ley 1955 de 2019, el Decreto 310 de 2021 y la C-138 de 2025 lo fijan para las entidades del Estatuto General, con respeto a la autonomía de las demás.
- **Causa:** Art. 41 Ley 1955 de 2019, Decreto 310 de 2021 y Circular CCE-004-2021; justificación para salir del AMP vista como subjetiva por los entes de control.
- **Consecuencia en plata:** Quien no está adjudicado en el AMP pierde las ventas de ese bien a entidades obligadas, salvo mínima cuantía; se pierde mercado sin enterarse porque el proceso no aparece en la búsqueda.
- **Solución documentada:** La entidad puede apartarse con justificación técnica escrita, o ir a bolsa si el precio es menor al promedio de las órdenes de los últimos 6 meses; la mínima cuantía no está obligada (FAQ Decreto 310, preg. 5). Para el proveedor: entrar al acuerdo marco del sector o volverse proveedor de un adjudicado.
- **Cifras:**
  - «En 2014 la agregación de demanda nacional sumó USD 118,9 millones frente a USD 510,7 millones de subastas» (sin verificar (no entró en la verificación de normas)). OCDE 2016, Tabla 3.1, p. 68 impresa · F-473.
- **Vigencia a revisar:** El texto del Decreto 310 de 2021 no se abrió (alcance tomado de la FAQ de CCE y de videos). Entrevistas de Fedesarrollo de 2020 y datos OCDE de 2014, anteriores a la C-138 de 2025.
- **Fuentes (9):** F-058, F-142, F-183, F-241, F-472, F-473, F-507, F-529, F-579

#### PLA-18 · Mínima cuantía de obra con pago 100 % contra entrega y sin verificar capacidad financiera

- **Gravedad:** media. Exige financiar el 100 % de la obra; el riesgo está acotado al valor de la mínima cuantía.
- **Tipos de contrato:** obra
- **Descripción:** Por norma, la capacidad financiera solo puede exigirse si hay pago antes de la entrega; si la entidad paga contra entrega, no la verifica. El contratista financia toda la obra y quien no tiene caja puede ganar con el precio más bajo y luego no terminar. CCE (2024) mantiene que la capacidad financiera es discrecional y solo procede con pago anticipado.
- **Causa:** Regla de la mínima cuantía sobre capacidad financiera ligada a la forma de pago.
- **Consecuencia en plata:** El contratista carga con el costo total de la obra hasta el acta de recibo; los procesos terminados anormalmente se concentran en mínima cuantía.
- **Solución documentada:** Los autores proponen mejorar el sistema de información y la verificación previa de requisitos. Para el contratista: presupuestar el capital de trabajo de toda la obra antes de ofertar.
- **Cifras:**
  - «El texto dice: «el 35.62% (677 procesos) del total de procesos terminados después de convocados (1901 procesos)». El denominador son los 1.901 procesos terminados tras la convocatoria en todas las modalidades; la Tabla 5 lista 12 procesos de mínima cuantía y §4.2 trata capacidad financiera. El acotamiento «total nacional en el sector G» no aparece con esa cifra.» (corregida (texto original: «677 procesos terminados anormalmente en mínima cuantía, 35,62 % del total nacional en el sector G (2010-2015)»)). Ríos Parra et al. 2017, §4.2, Tabla 5, p. 40 · F-342.
- **Vigencia a revisar:** Estudio de 2010-2015, anterior a la Ley 2069 de 2020 y al Decreto 1860 de 2021; la regla sigue en el manual de CCE de 2024.
- **Fuentes (2):** F-089, F-342

#### PLA-19 · El manual de mínima cuantía de CCE cita la C-004 de 2017 como si fuera una decisión de fondo, y la Corte se inhibió

- **Gravedad:** baja. Solo afecta la calidad de un argumento.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El Manual de mínima cuantía (num. 12.1) presenta la C-004 de 2017 como ratificación de que la contratación directa prevalece sobre la mínima cuantía, pero la parte resolutiva dice «INHIBIRSE de emitir pronunciamiento de fondo».
- **Causa:** Una cita de motivación usada como regla.
- **Consecuencia en plata:** Ninguna directa: es una corrección de fuente para no apoyarse en ella en una observación o reclamación.
- **Solución documentada:** Citar el criterio de CCE (efecto útil y principio de economía) como doctrina no vinculante, no como cosa juzgada constitucional.
- **Fuentes (2):** F-089, F-239

#### PLA-20 · Procesos limitados a Mipymes y división en lotes: mercado protegido para unos, cerrado para otros

- **Gravedad:** baja. Afecta a qué procesos puede presentarse; no causa pérdidas directas.
- **Tipos de contrato:** interventoría, bienes, servicios, obra
- **Descripción:** Las entidades limitan pocos procesos a Mipymes, pero en concurso de méritos los limitados son sobre todo interventorías de obra. La división en lotes favorece a las Mipymes (Decreto 142 de 2023), pero SECOP II no permite limitar un lote y otro no, y la entidad puede poner un tope de lotes por proponente.
- **Causa:** La limitación depende de solicitudes y umbral; restricción técnica de la plataforma; topes por proponente permitidos.
- **Consecuencia en plata:** Para la Mipyme de interventoría, mercado protegido; para quien no es Mipyme (incluidas ESAL), procesos donde no puede ofertar. Inferencia: el proponente que planea varios lotes puede chocar con el tope. Sin valores.
- **Solución documentada:** Que la entidad sustente mejor la limitación; dividir según entregable, valor y lugar (Decreto 142 de 2023).
- **Cifras:**
  - «Limitados a Mipymes: 8,65 % en mínima cuantía, 17,65 % en selección abreviada de menor cuantía, 14,29 % en subasta inversa; 7 de 24 concursos de méritos (29,17 %)» (sin verificar (no entró en la verificación de normas)). González Palacio, Conclusiones y cap. I (págs. 26-28 del PDF) · F-397.
- **Vigencia a revisar:** La limitación del SECOP II se describió en 2024; pudo haberse corregido.
- **Fuentes (3):** F-011, F-298, F-397

#### PLA-21 · Prestación de servicios que encubre una relación laboral (contrato realidad)

- **Gravedad:** media. Prestaciones no pagadas al contratista persona natural; acotado a su contrato.
- **Tipos de contrato:** servicios
- **Descripción:** La entidad contrata como prestación de servicios lo que es una relación laboral permanente: contratos sucesivos, horario, uniforme, órdenes del supervisor. La Ley 80 (art. 32-3) dice que estos contratos no generan relación laboral, pero la mala estructuración o supervisión hace nacer un contrato realidad. Aplica solo a servicios personales, no a obra.
- **Causa:** Estudios previos que imponen horario o uniforme y supervisores que dan órdenes; uso como nómina paralela.
- **Consecuencia en plata:** Para la entidad: condena a prestaciones indexadas y aportes. Para el contratista: sin prestaciones mientras dura el vínculo; si demanda, no le devuelven los aportes pagados de más (regla 3 de la unificación de 2021, según el video).
- **Solución documentada:** Según la unificación de 2021 citada: 30 días hábiles entre contratos rompen la continuidad y la necesidad debe justificarse como temporal. Para probar: indicios de la Recomendación OIT 198 (horario, órdenes, carné, organigrama, extractos, contratos sucesivos).
- **Vigencia a revisar:** La sentencia de unificación de 2021 no se abrió; la reforma laboral pudo cambiar el panorama.
- **Fuentes (4):** F-114, F-500, F-508, F-546

#### PLA-22 · Retención del 5 % al 10 % del pago hasta una liquidación que tarda o no llega

- **Gravedad:** alta. Puede inmovilizar hasta el 10 % del contrato indefinidamente, más que la utilidad típica.
- **Tipos de contrato:** todos los tipos, obra
- **Descripción:** El pliego o el contrato deja un porcentaje del valor retenido hasta la liquidación. Según el ponente de la Escuela Judicial, es una «inadecuada práctica» que choca con el derecho a recibir oportunamente el pago (art. 5 Ley 80) y con la prohibición de condicionar el pago a renunciar a reclamaciones. Frecuente en obra.
- **Causa:** Práctica de las entidades fijada desde el pliego.
- **Consecuencia en plata:** Entre el 5 % y el 10 % del valor del contrato inmovilizado indefinidamente (cifra de la fuente).
- **Solución documentada:** Observar la cláusula en el pliego e incluir la retención en el capital de trabajo de la oferta.
- **Cifras:**
  - «Retención del 5 %, 7 % o 10 % del valor del contrato hasta la liquidación» (sin verificar). Escuela Judicial, «Nociones de contratación estatal: terminación del contrato», min 36-37 · F-552. Nota del verificador: YouTube bloqueado (redirección a google.com/sorry). Además no es una regla legal: ninguna norma del Estatuto (Ley 80, 1150, 1474, Decreto 1082) fija esos porcentajes; la retención en garantía es una cláusula contractual que cada entidad pacta. Debe mostrarse como práctica, nunca como norma.
- **Fuentes (2):** F-114, F-552

#### PLA-23 · Fin de año: recursos tardíos, adjudicaciones del 28 al 30 de diciembre y semanas de espera para firmar

- **Gravedad:** baja. Congestión y espera; no hay pérdida directa documentada.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Por la anualidad presupuestal, varias entidades reciben recursos en julio o agosto y corren a adjudicar a fines de diciembre, con licitaciones de 3 a 5 meses; la firma tarda quince días o tres semanas tras adjudicar (director de CCE, 2021).
- **Causa:** Principio de anualidad presupuestal y licitaciones largas.
- **Consecuencia en plata:** Picos de procesos simultáneos en el último trimestre, cronogramas comprimidos y espera hasta firmar. Sin cifra en pesos.
- **Solución documentada:** Propuesta de reforma (no vigente): minuta publicada desde la licitación y plazos más cortos.
- **Cifras:**
  - «Licitaciones de 3 a 5 meses; adjudicación el 28, 29 y 30 de diciembre; firma quince días o tres semanas después» (sin verificar (no entró en la verificación de normas)). Ponencia del director de CCE, min 8, 9 y 14 · F-568.
- **Vigencia a revisar:** Ponencia de 2021; no se verificó su relación con la reforma al Estatuto en trámite.
- **Fuentes (1):** F-568

#### PLA-24 · IA usada por la entidad para pliegos y estudios: datos, normas o precios inexistentes y requisitos restrictivos copiados

- **Gravedad:** media. Lleva a presupuestos mal estimados o pliegos restrictivos; el daño es el de esos dos problemas.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El concepto C-1015 de 2026 advierte que incorporar al estudio previo datos, precios, normas o providencias inexistentes generados por IA incumple el deber de planeación, y que un sistema entrenado sobre procesos históricos puede reproducir y amplificar restricciones injustificadas a la libre concurrencia.
- **Causa:** IA generativa sin verificación contra fuente oficial y sesgo de automatización del servidor.
- **Consecuencia en plata:** Pliegos con requisitos restrictivos o presupuestos mal estimados. Sin cifra.
- **Solución documentada:** Verificar contra fuente oficial, dejar trazabilidad del uso de IA y revisión humana sustantiva; la competencia no se delega.
- **Vigencia a revisar:** Concepto no vinculante de la ANCP-CCE (10-ago-2026).
- **Fuentes (2):** F-014, F-470

### 3.2 Detectar el proceso y decidir (24)

#### DET-01 · Ofertar en una obra mal planeada (sin predios, diseños o presupuesto sanos) puede dejarlo sin cobrar, devolviendo el anticipo y sin derecho a reclamar

- **Gravedad:** alta. Puede costar todo el contrato: nulidad, devolución del anticipo actualizado y pérdida de la reclamación.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** Una línea de la Sección Tercera del Consejo de Estado (Subsección C, 2013, rad. 27315 y otros dos casos de obra sin terrenos adquiridos) trata la falta de planeación como objeto ilícito y anula el contrato con el contratista dentro. Además, el juez le exige al proponente, como experto y «colaborador», revisar estudios previos, diseños, predios y presupuesto antes de ofertar y abstenerse si el objeto no puede ejecutarse: si se presenta, pierde después la reclamación por defectos que pudo ver (CE 59309 de 2019). CONTRADICCIÓN: el salvamento de voto de Gil Botero sostiene que no entregar los predios es incumplimiento de la entidad, no causa de nulidad, y la Sección Cuarta (tutela de Conconcreto) exige que la nulidad tenga causal expresa en la ley; la línea está en disputa y ninguna fuente fichada encontró sentencia de unificación posterior.
- **Causa:** La falta de planeación se lee como violación de normas imperativas (objeto ilícito), y el art. 3 de la Ley 80 se interpreta como un deber del particular de colaborar en la planeación, detectar los yerros y no participar en contratos inejecutables.
- **Consecuencia en plata:** En el rad. 27315 el Tribunal le había reconocido al contratista $11.188.212 por obra, gastos y utilidad; el Consejo de Estado anuló el contrato, lo condenó a devolver el anticipo de $11.367.829,75 (actualizado a $25.612.786,87) y compulsó copias a Fiscalía y Procuraduría: demandó por incumplimiento y terminó debiendo. En el rad. 59309 perdió la reclamación por precios y estudios insuficientes y pagó costas. Si el proceso se cae antes, se pierde el costo de la oferta.
- **Solución documentada:** Antes de ofertar, revisar predios, licencias, diseños definitivos, viabilidad y presupuesto; dejar constancia de las fallas en observaciones al pliego (lo deduce el fichaje de la carga que fija la sentencia; la fuente no lo propone así) y abstenerse si la ejecución es imposible; planes de contingencia para entrega tardía de predios. La academia propone que la nulidad sea taxativa o reformar la ley.
- **Cifras:**
  - «Anticipo que el contratista debió restituir: $11.367.829,75» (sin verificar (no entró en la verificación de normas)). Sentencia CE 27315 (24-abr-2013), parte resolutiva · F-215.
  - «Anticipo actualizado a la fecha del fallo: $25.612.786,87» (sin verificar (no entró en la verificación de normas)). Rúa, Arbeláez y Castro (2019), p. 111 · F-343.
  - «Dos de cinco procesos revisados con falencias en especificaciones» (sin verificar (no entró en la verificación de normas)). Serrano Guzmán et al. (2019), Via Iuris, p. 92 · F-350.
- **Vigencia a revisar:** Fallo de 2013 sobre un contrato de 1994; línea jurisprudencial dividida (salvamentos de voto y tutelas en contra). Ninguna fuente verificó la postura vigente a 2026: tratarlo como riesgo, no como regla.
- **Fuentes (10):** F-197, F-215, F-253, F-316, F-317, F-343, F-344, F-350, F-375, F-428

#### DET-02 · Con empresas de servicios públicos y demás entidades de régimen privado no hay equilibrio económico de Ley 80 ni subsanación del Estatuto

- **Gravedad:** alta. Sobrecostos de suspensiones, prórrogas y terreno quedan sin restablecimiento y la oferta incompleta se rechaza sin subsanar.
- **Tipos de contrato:** obra, interventoría, consultoría, servicios
- **Descripción:** En los contratos de ESP (acueducto, energía), EICE y otras entidades de régimen privado, el Consejo de Estado ha dicho que el contratista «no es titular del derecho a preservación del equilibrio económico en términos de la Ley 80» (CE 73499, 13-feb-2026, caso EMCALI) y que solo cabe la imprevisión del art. 868 del Código de Comercio (CE 69484, 2024). Tampoco aplican los precedentes de subsanabilidad del RUP: manda la invitación (CE 69446, 2025). CONTRADICCIÓN: Canal-Silva (2016) y las sentencias de los exps. 22.756 (2012) y 31.431 (2013) aplican la ecuación financiera a todo contrato estatal; las sentencias recientes fichadas (2024, 2025 y 2026) van en la línea restrictiva.
- **Causa:** Esas entidades se rigen por la Ley 142 y el derecho privado; aunque el contrato sea «estatal», las garantías del Estatuto General no se trasladan.
- **Consecuencia en plata:** Los sobrecostos por suspensiones, prórrogas y condiciones del terreno quedan a cargo del contratista: en EMCALI (73499) y en el 69484 se negaron todas las pretensiones. Una oferta incompleta se rechaza sin derecho a subsanar y sin indemnización.
- **Solución documentada:** Marcar el régimen del contrato al decidir si se presenta; leer el manual de contratación de la entidad y las cláusulas sobre suspensiones y prórrogas; meter en el precio la contingencia que no se podrá reclamar o pactar fórmula de reajuste; leer las reglas de subsanación de la invitación y presentar completo desde el inicio.
- **Vigencia a revisar:** Canal-Silva es de 2016 y no se verificó jurisprudencia posterior a su favor. Las sentencias de 2024-2026 son recientes; no se buscó unificación.
- **Fuentes (6):** F-047, F-142, F-200, F-211, F-231, F-268

#### DET-03 · La obra que se entrega por convenio interadministrativo la contrata la entidad ejecutora con su propio manual y no aparece donde el contratista la busca

- **Gravedad:** media. Oportunidades que no se ven; no hay pérdida directa documentada, sino mercado perdido.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** Mucha plata de obra pasa por contratos o convenios interadministrativos (universidades públicas, Findeter, Enterritorio, fondos mixtos, empresas de régimen especial) que luego subcontratan casi toda la ejecución con privados, sin licitación de Ley 80. SECOP no enlaza el convenio con los contratos derivados, así que no se puede rastrear quién ejecuta finalmente. La prensa reporta además urgencias manifiestas usadas para saltarse la ley. MATIZ: el texto vigente del literal c (Senado) y el concepto 2092 de 2012 dicen que universidades, sociedades de economía mixta, ESAL de entidades públicas y federaciones deben participar en licitación o selección abreviada cuando ejecutan obra, lo que choca con la práctica de subcontratación descrita por Beltrán (2014) y Quiceno (2020).
- **Causa:** El literal c del num. 4 del art. 2 de la Ley 1150 es una excepción de «textura abierta»: la ejecución puede salirse del Estatuto si la ejecutora compite con privados o el objeto se relaciona con su actividad; muchas ejecutoras tienen régimen exceptuado (Ley 142, Ley 100) o autonomía universitaria. SECOP no tiene campo de trazabilidad entre la entidad que transfiere y la que contrata.
- **Consecuencia en plata:** El contratista no ve la oportunidad en las búsquedas de la entidad dueña del recurso, y la competencia real ocurre en la subcontratación de la ejecutora, con reglas propias. Ninguna fuente cuantifica el costo para el contratista.
- **Solución documentada:** Monitorear también a las ejecutoras (universidades, Findeter, Enterritorio, fondos mixtos, ESP) y reconstruir la cadena convenio-contrato derivado comparando el texto del objeto (TF-IDF con similitud de coseno, según Montes 2019). Quiceno propone prohibir al ejecutor acudir a regímenes distintos del Estatuto y fijar topes a la subcontratación.
- **Cifras:**
  - «16.400 contratos y convenios interadministrativos con contratación derivada entre 2012 y 2015» (sin verificar (no entró en la verificación de normas)). Quiceno (2020), p. 117, nota 30 · F-330.
  - «Casi medio billón de pesos entregado en ejecución al Fondo Mixto del Valle, que no se rige por la Ley 80» (sin verificar). La Silla Vacía, video, min ~6:38-7:09 · F-570. Nota del verificador: YouTube bloqueado desde este entorno (captcha de Google); no hay transcripción ni documento oficial citado.
- **Vigencia a revisar:** Quiceno (2020) es anterior a la Ley 2160 de 2021 que, según la búsqueda, modificó el literal c; Beltrán (2014) se basa en prensa; el estudio de trazabilidad es de 2019 y no se verificó si SECOP II agregó un vínculo con el convenio de origen. La reforma al Estatuto en trámite podría tocar el literal.
- **Fuentes (7):** F-117, F-142, F-258, F-329, F-330, F-412, F-570

#### DET-04 · En patrimonios autónomos (Findeter y similares) y régimen especial no se sabe de antemano qué reglas aplican, y el pliego puede traer precios fijos sin reajuste

- **Gravedad:** alta. Precios fijos sin reajuste y tiempo muerto entre diseño y obra sin pago pueden significar una pérdida grande.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** Las obras que pasan por Findeter, Enterritorio, otros patrimonios autónomos o universidades salen con manual propio y pliego privado. En un estudio previo de Findeter (2022) los precios unitarios son fijos «sin fórmula de ajuste… incluido el cambio de vigencia», no se reconoce valor ni plazo entre la etapa de diseño y la de obra, y el proyecto puede no pasar a obra si el presupuesto ajustado supera el asignado. El art. 56 de la Ley 2195 obliga a aplicar documentos tipo en la selección derivada con recursos de entidades del Estatuto (concepto CCE C-752/2026), pero universidades, ESE, SEM y EICE quedan exentas en su «giro ordinario», que la propia guía de CCE llama «concepto jurídico indeterminado».
- **Causa:** La entidad que pone los recursos contrata en forma interadministrativa a una entidad de derecho privado; las excepciones de giro ordinario y la práctica de cada patrimonio autónomo dejan dudas sobre qué reglas rigen.
- **Consecuencia en plata:** Precios que no se reajustan aunque cambie la vigencia, tiempo muerto entre diseño y obra sin pago, riesgo de que la obra no llegue a contratarse; y ofertas armadas con supuestos equivocados de experiencia, puntaje o rechazo. Sin cifra en las fuentes.
- **Solución documentada:** Verificar con el art. 56 de la Ley 2195 y el concepto C-752/2026 si la selección derivada debe usar documento tipo; leer la cláusula de reajuste y la transición diseño-obra antes de ofertar. CCE define el giro ordinario como lo relacionado con el objeto social y excluye las actividades «esporádicas o extraordinarias».
- **Vigencia a revisar:** El estudio previo de Findeter es de 2022; no se verificó si sus convocatorias posteriores ya aplican documentos tipo (la tensión con el art. 56 es inferencia del fichaje). La guía de régimen especial de CCE es un borrador para comentarios.
- **Fuentes (6):** F-009, F-010, F-053, F-113, F-136, F-273

#### DET-05 · Casi un tercio de la plata contratada va por régimen especial y el 95 % de ese valor no pasa por convocatoria: el contratista no la ve

- **Gravedad:** media. Mercado grande invisible; la pérdida es de oportunidad, no de un contrato ya firmado.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Según Maldonado (2022), en 2021 el régimen especial sumó $38,1 billones en 366.424 contratos y convenios (31 % del total registrado en SECOP I y II), y el 95 % de ese valor fue contratación sin convocatoria pública: se entra por invitación, no por concurso. Lo que sí sale a competencia en SECOP II va en un módulo aparte («Contratación régimen especial (con ofertas)»), los documentos pueden subirse hasta 3 días después de expedidos y algunas entidades solo publican sin usar el módulo transaccional. El propio autor advierte que la cifra incluye convenios especiales de entidades sujetas al Estatuto. Los dos fichajes de Maldonado ubican la cifra en páginas distintas (pp. 103-104 y p. 105 del texto).
- **Causa:** Multiplicación de regímenes exceptuados (ESP, EICE, entidades financieras, universidades) bajo el art. 13 de la Ley 1150; sus manuales privilegian la contratación directa y la solicitud privada de ofertas; el art. 53 de la Ley 2195 obliga a publicar, pero el uso transaccional es discrecional.
- **Consecuencia en plata:** Un mercado de unos $38 billones al año al que el contratista casi no accede; procesos de obra de alto valor con ofertas pasan sin verse si solo se busca en las modalidades del Estatuto.
- **Solución documentada:** Filtrar SECOP II por la modalidad «Contratación régimen especial (con ofertas)» y vigilar los planes anuales de adquisiciones de estas entidades. El art. 53 de la Ley 2195 de 2022 obliga a publicar en SECOP II toda su actividad contractual; Maldonado propone redefinir los regímenes.
- **Cifras:**
  - «Régimen especial 2021: $38.099.743.432.921,50 en 366.424 contratos y convenios, 31 % del total» (verificada: confirmada). Maldonado (2022), p. 105 del texto (p. 117 del PDF); otro fichaje lo ubica en §2.3.12, pp. 103-104 · F-405.
  - «$36.249.332.879.379,50 (95 %) del régimen especial 2021 sin convocatoria pública» (verificada: confirmada). Maldonado (2022), §2.3.12, pp. 103-104 · F-406.
  - «Los documentos del régimen especial pueden publicarse hasta 3 días después de expedidos» (verificada: confirmada). Guía CCE régimen especial (2025), p. 29 · F-053.
  - «1.147 procesos de obra en régimen especial con ofertas en 2025, mediana $1.062 millones (medición propia del agente)» (sin verificar (no entró en la verificación de normas)). Consulta del agente al recurso p6dx-8zbt de datos.gov.co; no reproducida en la consolidación · F-592.
- **Vigencia a revisar:** Las cifras de Maldonado son de 2021, antes de la obligación de publicar del art. 53 de la Ley 2195; la proporción pudo cambiar. La guía de CCE es borrador para comentarios.
- **Fuentes (7):** F-053, F-118, F-142, F-405, F-406, F-467, F-592

#### DET-06 · SECOP II no muestra todo el mercado ni es del todo fiable: contratos en SECOP I, NIT faltantes, prórrogas en imagen y causales mal digitadas

- **Gravedad:** media. Decisiones y búsquedas sobre datos incompletos: reproceso y oportunidades perdidas acotadas.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El 15 % de los contratos sigue registrándose en SECOP I; SECOP registra 14.710 entidades frente a 6.317 del registro oficial (SIE); hay procesos sin NIT y prórrogas publicadas como imagen; la contratación de régimen especial y la de fondos (paz) se publica de forma incompleta. La MOE tuvo que eliminar 384 contratos de su muestra por errores de valor o de causal de contratación directa. En Perú se documentaron expedientes subidos borrosos o dañados; que pase igual en SECOP II es inferencia sin verificar.
- **Causa:** Migración incompleta a SECOP II, entidades con identidad duplicada, regímenes especiales (fiducias, ESAL, fondos), digitación manual de causal y valor, y falta de estándares de calidad de publicación.
- **Consecuencia en plata:** Una herramienta que solo lee SECOP II pierde oportunidades (falso negativo), ve un historial de prórrogas y adiciones incompleto y puede clasificar mal la modalidad o la causal; la decisión de ofertar se toma sobre información parcial. Sin cifra en pesos.
- **Solución documentada:** Cruzar SECOP I y II y revisar documento por documento lo que decide (como hizo la MOE con NIT, valor, adiciones y causal). Transparencia por Colombia pide registro completo, oportuno y estandarizado e interoperabilidad; Sierra y Granados piden a CCE NIT siempre publicado y prórrogas en formato analizable.
- **Cifras:**
  - «15 % de los contratos sigue registrándose en SECOP I» (verificada: confirmada). Transparencia por Colombia (jul-2026), p. 10 · F-481.
  - «SIE: 6.317 entidades; SECOP: 14.710 entidades» (sin verificar (no entró en la verificación de normas)). Transparencia por Colombia (jul-2026), p. 10 del documento / p. 11 del PDF · F-481.
  - «384 contratos eliminados de la muestra por errores de digitación, valor o causal» (sin verificar (no entró en la verificación de normas)). MOE (2021), p. 9 · F-471.
  - «2019: 583.215 contratos directos por $22 billones de un total de 1.137.622 contratos» (sin verificar (no entró en la verificación de normas)). MOE (2021), p. 8 · F-471.
- **Vigencia a revisar:** Datos de la MOE: SECOP I, 2019 a abr-2021; proporción actual en SECOP II sin verificar. El hallazgo de expedientes dañados es peruano (Ley 30225, ya derogada).
- **Fuentes (5):** F-276, F-356, F-471, F-481, F-482

#### DET-07 · Obra hasta la menor cuantía se entrega directo a juntas de acción comunal (convenios solidarios), y recursos a ESAL, sin competencia

- **Gravedad:** media. Reduce el mercado de obra menor disponible; pérdida de oportunidad, sin pérdida directa.
- **Tipos de contrato:** obra, servicios
- **Descripción:** Las entidades pueden contratar obras hasta su menor cuantía directamente con organismos de acción comunal mediante convenio solidario (documento tipo de CCE, Res. 358/2023), sin exigir experiencia ni interventor; la subcontratación está prohibida (cláusula 21 de la minuta) y solo se permite comprar suministros y contratar mano de obra de la comunidad. CONTRADICCIÓN: CCE dice que subcontratar está «totalmente prohibido», pero en otra capacitación de CCE se reporta que las juntas «prácticamente traían a los subcontratistas». Aparte, los convenios con ESAL (Decreto 092 de 2017) se seleccionan con discrecionalidad y el convenio de asociación directo exige aporte de al menos 30 % en dinero; una empresa con ánimo de lucro queda por fuera.
- **Causa:** Ley 136 de 1994 art. 3, Ley 2166 de 2021 y la «democratización» del Plan Nacional de Desarrollo (Ley 2294); el Decreto 092 no creó un procedimiento reglado y los criterios están en una guía sin fuerza obligatoria.
- **Consecuencia en plata:** Se achica el mercado de obra menor municipal: el contratista solo puede entrar como proveedor de materiales o equipos, y quien ejecute como subcontratista encubierto opera fuera de la regla. Ninguna fuente da cifra.
- **Solución documentada:** Medir cuánta obra de cada entidad va por convenio solidario antes de apostar a ese mercado; ofrecerse como proveedor de suministros (permitido). CCE publicó una guía de convenios solidarios en 2025; Acosta y Guarnizo proponen una modalidad de selección reglada para ESAL.
- **Cifras:**
  - «Convenio de asociación con ESAL por vía directa exige aporte de al menos 30 % en dinero» (verificada: confirmada). Gómez y Díaz (2019), tabla comparativa · F-299.
- **Vigencia a revisar:** El art. 15 del Decreto 142 de 2023 está suspendido provisionalmente por el Consejo de Estado (según capacitaciones de CCE sin fecha visible) y se menciona una medida cautelar sobre el Decreto 092/2017. CCE cita el «art. 95» de la Ley 2166, pero en el texto del Senado los parágrafos sobre menor cuantía aparecen junto al art. 63. El Decreto 092 pudo modificarse después de 2020.
- **Fuentes (7):** F-157, F-251, F-299, F-513, F-517, F-527, F-581

#### DET-08 · La obra se concentra en pocos contratistas que repiten con la misma entidad, sobre todo en procesos poco vistos: el 44 % gana una sola vez

- **Gravedad:** media. Baja la probabilidad real de ganar y se gastan ofertas; pérdida acotada al costo de preparar.
- **Tipos de contrato:** obra, servicios
- **Descripción:** Las entidades vuelven a contratar con los mismos proveedores («apego preferencial»): el 44 % de los contratistas logra una sola adjudicación mientras unos pocos «hubs» se llevan muchas, y los procesos con menos visualizaciones en SECOP terminan en los contratistas más conectados. Hay grupos económicos que presentan varias ofertas al mismo proceso con distintas personas jurídicas, y en contratación directa la «idoneidad» se acredita con contratos anteriores con la misma entidad. Es asociación estadística, no causalidad.
- **Causa:** Experiencia y relaciones acumuladas por el incumbente, publicidad activa débil, discrecionalidad de la contratación directa, y acuerdos marco y agregación de demanda que favorecen a los grandes.
- **Consecuencia en plata:** El recién llegado compite en desventaja y su probabilidad real es menor que la que sugiere el número de oferentes. La cifra de 25 % de sobrecosto sin competencia es de la CNMC española, no colombiana.
- **Solución documentada:** Medir la red de adjudicaciones por entidad (grado, centralidad, entropía de adjudicatarios) y la visibilidad de cada proceso; segmentar proponentes por experiencia, empleados y CIIU (Random Forest, según Díaz 2020). Los autores piden a SECOP alertas tempranas y sanción por publicación incompleta.
- **Cifras:**
  - «44 % de los contratistas logra una sola adjudicación» (verificada: confirmada). Sierra-Hernández y Granados (2025), p. 258 de la revista (p. 26 del PDF) · F-356.
  - «Por cada visualización adicional, el número de contratos asignados disminuye en unos 7» (sin verificar (no entró en la verificación de normas)). Sierra-Hernández y Granados (2025), p. 261 · F-356.
  - «25 megacontratos de infraestructura vial entre los 100 contratos más grandes» (sin verificar (no entró en la verificación de normas)). Sierra-Hernández y Granados (2025), p. 255 · F-356.
  - «Un municipio con 20 contrataciones directas por más de $80.000 millones en tres años» (sin verificar (no entró en la verificación de normas)). MOE (2021), secc. 5.12, p. 23 · F-471.
- **Vigencia a revisar:** Asociación, no causalidad; la muestra de obra se filtró por texto del nombre del procedimiento. Tres de las seis URL son el mismo artículo de Sierra-Hernández y Granados, y dos son la misma tesis de Díaz.
- **Fuentes (6):** F-355, F-356, F-357, F-390, F-391, F-471

#### DET-09 · Muchos procesos terminan con un solo oferente o con competencia simulada: preparar esa oferta suele ser plata perdida

- **Gravedad:** media. Se pierde el costo de preparar ofertas en procesos con dueño; acotado a ese costo.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Antes de los documentos tipo, alrededor del 80 % de las licitaciones no tuvo pluralidad de oferentes, y en SECOP II cerca del 30 % de los procesos tiene un solo competidor, sobre todo en mínima y menor cuantía. Los medios documentan malla vial adjudicada a únicos oferentes, ofertas de empresas con el mismo representante legal y empresas que se turnan; el contratista honesto no tiene una señal temprana para no gastar en un proceso amañado. MATIZ: un proceso con proponente único casi seguro puede ser una trampa (direccionado) o una oportunidad (nadie más lo vio); ninguna fuente dice cuál es más frecuente.
- **Causa:** Pliegos complejos o dirigidos, requisitos financieros restrictivos, poca publicidad, mercados locales capturados y acuerdos entre oferentes.
- **Consecuencia en plata:** Se pierde el costo de preparar la oferta frente a un precio o un resultado ya pactado. Para el Estado, cada competidor de más baja el coeficiente de adjudicación entre 0,58 % y 1,33 %.
- **Solución documentada:** Predecir la pluralidad con los indicadores del prepliego (modelo logit de Valencia 2019); puntuar riesgo de colusión con precio frente al presupuesto, número de participantes y modalidad, como el sistema BRIAS de Corea; en España, ante indicios, la autoridad de competencia informa en 20 días hábiles y se suspende la licitación. En Colombia: investigación de la SIC y la Procuraduría.
- **Cifras:**
  - «Cerca del 80 % de las licitaciones sin pluralidad de oferentes; probabilidad media de pluralidad 20,6 %» (verificada: confirmada). Valencia (2019), pp. 5 y 73 · F-433.
  - «84,61 % de los procesos sin pluralidad tuvo un único proponente interesado» (verificada: confirmada). Valencia (2019), p. 87 · F-433.
  - «20.208 procesos (30,25 % de la muestra) con un solo competidor» (verificada: confirmada). Beltrán y Arenas (2020), p. 18 · F-380.
  - «Licitaciones de vías con un solo oferente: del 17 % al 12 % en 2019» (verificada: confirmada). Open Contracting Partnership (16-jul-2020), sección Case study: Public transport works · F-479.
  - «18 contratos de malla vial de Bogotá entregados a únicos oferentes» (sin verificar (no entró en la verificación de normas)). Noticias Uno, video, 0:00-0:30 · F-574.
  - «Corea 2012: unas 20.000 corridas de BRIAS generaron 200 alertas» (sin verificar (no entró en la verificación de normas)). OCDE (2016), recuadro 1.12, p. 34 del PDF · F-474.
- **Vigencia a revisar:** Las cifras de pluralidad son de 2016-2019, antes o al inicio de los documentos tipo; las de televisión tienen más de diez años; BRIAS es de 2012. El índice actual debe salir de SECOP.
- **Fuentes (13):** F-135, F-380, F-415, F-433, F-440, F-474, F-478, F-479, F-485, F-489, F-570, F-574, F-587

#### DET-10 · Un proceso que debía usar el pliego tipo y no lo usa, o lo modifica, anuncia pocos competidores y posible pliego a la medida

- **Gravedad:** media. Se pierde el costo de la oferta en procesos con probable dirección; acotado.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** En infraestructura de transporte 2019-2022, los procesos sin documento tipo atrajeron en promedio 2,7 oferentes contra 16,5 los que sí lo usaron; la mitad lo usó solo en parte, con modificaciones no permitidas. De 714 procesos que no lo implementaron (primer semestre de 2022), el 78 % tuvo entre 1 y 3 proponentes. El Observatorio de CCE alerta a la entidad, pero no puede sancionar: el 81 % de las entidades acepta el oficio y solo el 32 % corrige. El contratista se entera tarde.
- **Causa:** Entidades, sobre todo alcaldías de sexta categoría, redactan su propio pliego o alteran numerales del pliego tipo; la ANCP no tiene facultad sancionatoria.
- **Consecuencia en plata:** Se prepara la oferta en un proceso con alta probabilidad de dirección y pocas opciones para quien no fue pensado como ganador. Sin cifra en pesos.
- **Solución documentada:** Comparar el pliego con el documento tipo vigente y clasificarlo (sí, parcial, no) como hace el Observatorio de CCE; observar la desviación en el proceso y reportarla a los entes de control.
- **Cifras:**
  - «Pliego tipo sí 35,36 %, parcial 50,29 %, no 14,34 %» (verificada: confirmada). Moreno Mier (2022), Tabla 3, p. 15 del PDF · F-416.
  - «Oferentes al cierre: 16,5 (pliego tipo sí o parcial) contra 2,7 (no)» (sin verificar (no entró en la verificación de normas)). Moreno Mier (2022), Tabla 10, p. 20 del PDF · F-416.
  - «De 714 procesos sin documento tipo, 78 % con 1 a 3 proponentes y 4 % con más de 10» (sin verificar). Observatorio Oficial de Contratación Estatal, informe 1-2022, p. 16 · F-042. Nota del verificador: El PDF se descargó (17 páginas) pero es de imágenes sin capa de texto: pdftotext solo recupera el índice (§4.1 Documentos tipo p. 5; §4.2 Alertas tempranas p. 14) y no hay OCR en este entorno.
  - «81 % de las entidades asume el oficio de alerta, solo 32 % corrige» (sin verificar). Observatorio Oficial de Contratación Estatal, informe 1-2022, p. 16 · F-042. Nota del verificador: Mismo PDF de imágenes sin texto; sin OCR disponible.
- **Vigencia a revisar:** Periodo 2019-2022 con los documentos tipo de entonces; con la versión vigente (2026) la magnitud debe medirse de nuevo. Las cifras de la página web del Observatorio no tienen fecha de corte.
- **Fuentes (4):** F-038, F-042, F-409, F-416

#### DET-11 · Con documento tipo, la competencia en obra se volvió masiva: la probabilidad de ganar cada proceso es baja

- **Gravedad:** media. Baja la probabilidad de ganar y el margen; no cuesta un contrato por sí solo.
- **Tipos de contrato:** obra
- **Descripción:** Los documentos tipo uniformaron los requisitos y cualquiera que cumpla la matriz puede presentarse: CCE reporta 17 oferentes en promedio (12 habilitados) y procesos de municipios pequeños con 100 a 200 proponentes. Antes, en 2016, el 74 % de los procesos municipales tenía un solo proponente. CONTRADICCIÓN DE MAGNITUD: las fuentes no coinciden en cuánto subió la competencia (Open Contracting: de 6,7 a 8,1 oferentes en licitación de obra entre 2018 y 2019; Moreno: de unos 3 a unos 14 en vías, y 16,5 en procesos con pliego tipo; CCE: 17), porque miden universos y años distintos; y la SCI (2019) dijo que en municipios no era posible concluir sobre su efectividad.
- **Causa:** Requisitos estandarizados y públicos desde la Ley 1882 de 2018 (en vigor desde abril de 2019).
- **Consecuencia en plata:** Menor probabilidad de ganar por proceso; CCE presenta como logro «ahorros cercanos al billón» para el Estado, es decir, menos margen para el contratista.
- **Solución documentada:** Ninguna para el contratista en las fuentes: CCE lo presenta como un logro. Contrastar con la medición propia de oferentes por proceso antes de decidir.
- **Cifras:**
  - «Promedio de 17 oferentes y 12 habilitados con documento tipo» (sin verificar (no entró en la verificación de normas)). CCE, «Capacitación Documentos Tipo», video, min 100 · F-518.
  - «Procesos con más de 100 o 200 proponentes» (sin verificar (no entró en la verificación de normas)). CCE, «Capacitación Documentos Tipo», video, min 105 · F-518.
  - «Licitaciones de vías con más de 4 ofertas: 68 % en 2019» (verificada: confirmada). Open Contracting Partnership (16-jul-2020), sección Case study: Public transport works · F-479.
  - «74 % de los procesos municipales con un solo proponente (2016)» (verificada: confirmada). Sociedad Colombiana de Ingenieros (17-nov-2017), análisis de la contratación regional 2016 · F-488.
  - «Con documentos tipo, los proponentes al cierre pasan de 3 a 14» (sin verificar (no entró en la verificación de normas)). Moreno Mier (2022), p. 27 del PDF · F-415.
- **Vigencia a revisar:** Mediciones de 2016-2019 y una cifra de CCE de hace unos 4 años; no hay estudio con grupo de comparación ni datos posteriores. La «triplicación de oferentes» de la prensa no se fichó.
- **Fuentes (6):** F-415, F-440, F-478, F-479, F-488, F-518

#### DET-12 · No saber qué documento tipo (sector, modalidad y versión) rige un proceso según la fecha del aviso de convocatoria

- **Gravedad:** media. Oferta armada con reglas equivocadas: reproceso o rechazo de una oferta concreta.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** El documento tipo aplicable depende de la fecha de publicación del aviso de convocatoria y, en 2021-2022, del grupo de la entidad (entrada escalonada). Desde 2025 cubre también mínima cuantía y consultoría (interventoría y estudios y diseños), y en 2026 aparecieron sectores y modalidades nuevas (infraestructura social: menor y mínima cuantía, sectores institucional y vivienda). CONTRADICCIÓN: un video de practicantes llama «versión 3» a la licitación de infraestructura social vigente desde el 16-feb-2026, mientras el Complemento de Detekta habla de «documentos tipo v2 (feb-2026)»; las resoluciones de CCE no se abrieron.
- **Causa:** Versiones sucesivas con entrada en vigor escalonada por grupos de entidades y por fecha de aviso.
- **Consecuencia en plata:** Preparar la oferta con reglas de experiencia o puntaje equivocadas; no detectar que la entidad debía usar el pliego tipo y no lo hizo (materia de observación). El Observatorio detectó entidades que usaron una versión no vigente.
- **Solución documentada:** Leer la versión vigente a la fecha del aviso. Según practicantes: transporte, licitación v4, menor cuantía v3, mínima cuantía, interventoría y consultoría desde el 3-feb-2025; agua potable, licitación v5; interventoría de infraestructura social desde el 15-abr-2024.
- **Cifras:**
  - «Licitación de obra de infraestructura social versión 3 vigente desde el 16-feb-2026» (sin verificar (no entró en la verificación de normas)). Protección Jurídica, video, min 49 · F-581.
  - «Licitación de transporte versión 4 vigente desde el 3-feb-2025» (sin verificar (no entró en la verificación de normas)). Protección Jurídica, video, min 36 · F-581.
  - «Grupos de entidades con vigencia escalonada entre el 2-nov-2021 y el 1-abr-2022» (sin verificar (no entró en la verificación de normas)). CCE, capacitación infraestructura social, video, min 32 · F-516.
- **Vigencia a revisar:** Números de versión y fechas dichos en videos; no se verificaron contra las resoluciones de CCE. Los grupos de la Res. 336/2021 son de la versión 2021.
- **Fuentes (4):** F-516, F-518, F-527, F-581

#### DET-13 · Interventoría y consultoría se juegan con otras reglas (concurso sin precio, o menor precio si es mínima cuantía) y con muy pocos compradores

- **Gravedad:** media. Clasificar mal la modalidad lleva a estimar mal precio y competencia; reproceso.
- **Tipos de contrato:** interventoría, consultoría
- **Descripción:** La interventoría y la consultoría de obra van por concurso de méritos, donde la ley prohíbe puntuar el precio; la obra no puede ir por concurso y, según CCE, la contratación directa de obra solo procede por urgencia manifiesta. Pero si el valor cae en mínima cuantía, la regla del menor precio desplaza al concurso y la experiencia queda solo como habilitante. Además, en transporte el mercado está muy concentrado: diez entidades (INVÍAS a la cabeza) suman el 99,02 % del valor de consultoría.
- **Causa:** Ley 1150 art. 5.4, lectura de CCE sobre modalidades de obra y concurrencia de la regla de mínima cuantía con el concurso.
- **Consecuencia en plata:** Clasificar mal la modalidad lleva a estimar mal la competencia y el precio; en mínima cuantía el consultor compite por precio puro; depender de pocos compradores concentra el riesgo de pago y de calendario.
- **Solución documentada:** Clasificar cada proceso por modalidad y objeto (obra, interventoría, consultoría) antes de calcular competencia o precio. Jaimes propone un procedimiento especial para consultores de mínima cuantía.
- **Cifras:**
  - «Diez entidades concentraron $852 mil millones, 99,02 % del valor de consultoría de transporte» (verificada: confirmada). CCE, anexo memoria justificativa interventoría y consultoría, pp. 16-18 · F-012.
  - «71 % de los contratos (1.236) es interventoría y 29 % (493) consultoría» (verificada: confirmada). CCE, anexo memoria justificativa interventoría y consultoría, pp. 16-18 · F-012.
- **Vigencia a revisar:** La frase «únicamente urgencia manifiesta» es de CCE; otras vías directas para obra (interadministrativos, cabildos por la Ley 2160 de 2021) no se analizaron. De Jaimes solo está el resumen.
- **Fuentes (4):** F-006, F-012, F-142, F-402

#### DET-14 · Los indicadores financieros y de experiencia del pliego son arbitrarios y desproporcionados: la empresa sana queda fuera por un número

- **Gravedad:** media. Excluye de procesos o fuerza a ceder utilidad en consorcio; pérdida de oportunidad acotada.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** Cada entidad fija liquidez, endeudamiento, rentabilidad y experiencia a su criterio, sin compararlos con el sector ni con el valor del contrato: ningún proceso de una muestra pidió los mismos indicadores, hubo exigencias como endeudamiento de 1 % o experiencia de 300-400 % del presupuesto, y en interventoría un proceso pequeño pedía una combinación que casi ninguna empresa cumplía. Los autores advierten que la literatura no prueba que una liquidez alta asegure el cumplimiento y que exigir mucho puede incentivar maquillar cifras al cierre.
- **Causa:** Autonomía de cada entidad para fijar indicadores, sin referencia sectorial (estudio de la CCI) ni proporción con el monto.
- **Consecuencia en plata:** Se pierde la oportunidad o hay que armar consorcio y ceder parte de la utilidad. A cambio, quien sí cumple enfrenta poca competencia. Ninguna fuente da el costo en pesos.
- **Solución documentada:** Fijar indicadores según el promedio del sector y la cuantía (Tabla 7 de Serrano et al.); para el proponente, pedir en observaciones al pliego que la exigencia sea proporcional (inferencia del fichaje).
- **Cifras:**
  - «Solo 9,51 % de las licitaciones de 2017 pidió una liquidez acorde con el promedio de la CCI» (verificada: confirmada). Rojas López et al. (2021), p. 10 · F-337.
  - «Más del 90 % de los procesos pidió endeudamiento menor al 70 %» (verificada: confirmada). Rojas López et al. (2021), p. 13 · F-337.
  - «Interventoría de unos 62 SMMLV: la combinación exigida la cumple el 6 % de las empresas; una de unos 120 SMMLV, el 51 %» (verificada: confirmada). Chamorro et al. (2022), sección 3, Cuadro 5 · F-274.
- **Vigencia a revisar:** Muestras de 2010-2019, antes o al inicio de los documentos tipo, que traen matrices de indicadores; la magnitud actual probablemente es menor donde se aplican, no necesariamente en edificaciones u otras obras sin documento tipo. La CCI de referencia es de 2016.
- **Fuentes (5):** F-274, F-337, F-348, F-354, F-433

#### DET-15 · RUP inscrito, renovado o corregido tarde: no queda en firme a tiempo y la oferta se rechaza

- **Gravedad:** alta. Rechazo de la oferta por RUP no inscrito o no en firme: se pierde el proceso completo.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El registro no es automático: la cámara de comercio tiene hasta 15 días para entregarlo y la renovación solo se hace en una ventana anual (enero a mediados de abril). Corregir un indicador financiero exige modificar estados financieros, registro mercantil y RUP, que luego tarda en quedar en firme (una practicante habla de 10 días hábiles): los indicadores son «subsanables» en teoría, pero no a tiempo en la práctica. Una oferta presentada sin inscripción vigente no se puede subsanar.
- **Causa:** Plazos legales de la cámara de comercio, ventana fija de renovación y término de firmeza del RUP.
- **Consecuencia en plata:** Rechazo de la oferta o quedar fuera de procesos que cierran antes de que el registro esté en firme. Sin cifra.
- **Solución documentada:** Planear inscripción o actualización con margen (al menos 15 días antes del cierre), renovar dentro de la ventana anual y, si no se cumplen los indicadores, decidir antes: consorcio, unión temporal o no presentarse.
- **Cifras:**
  - «Las cámaras de comercio tienen hasta 15 días para entregar el registro» (verificada: confirmada). OCDE (2022), pp. 17-18 · F-475.
  - «Renovación del RUP solo entre enero y mediados de abril de cada año» (sin verificar (no entró en la verificación de normas)). OCDE (2022), pp. 17-18 · F-475.
  - «10 días hábiles para que el RUP quede en firme (dicho por una practicante, sin cotejar con la norma)» (verificada: confirmada). Asesoría en Licitaciones, video, min 11:52-12:23 · F-503.
- **Vigencia a revisar:** Plazos de 2022 (OCDE) y de 2020 (video); una reforma posterior al RUP pudo cambiarlos. El término de 10 días hábiles no se cotejó con el Decreto 1082 de 2015.
- **Fuentes (3):** F-314, F-475, F-503

#### DET-16 · La Mipyme no usa la limitación de la convocatoria porque no la pide a tiempo o con documentos vigentes, y termina compitiendo contra grandes

- **Gravedad:** media. Se pierde una ventaja competitiva (competir solo entre Mipymes); acotado.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La limitación a Mipymes no se activa sola: hacen falta al menos dos solicitudes de Mipymes colombianas con un año o más de existencia, en procesos de menos de US$125.000, recibidas al menos un día hábil antes del acto de apertura y con soporte de no más de 60 días. Casi no se usa: en Medellín se limitó el 8,65 % de las mínimas cuantías y en Zipaquirá el 16,66 % de las convocatorias; las solicitudes son pocas y justo las mínimas. MATIZ DE PLAZO: el Decreto 1860 y la guía de CCE fijan «un día hábil antes del acto de apertura», mientras un fichaje de mínima cuantía habla de pedirla «dentro del término de observaciones»; y el caso de Zipaquirá aplicaba la regla anterior (3 Mipymes).
- **Causa:** Desconocimiento y trámites: la limitación depende de la solicitud de las propias Mipymes; la entidad no puede limitar por territorio si no recibe solicitudes.
- **Consecuencia en plata:** La Mipyme compite contra empresas grandes en procesos que la ley le permitía reservar. Ninguna fuente cuantifica el costo.
- **Solución documentada:** Vigilar los procesos por debajo del umbral desde el proyecto de pliego, coordinarse con otra Mipyme y radicar la solicitud a tiempo con certificado o RUP vigente. Divulgación (Ley 2069 art. 33) y ferias de negocios (Decreto 142 de 2023).
- **Cifras:**
  - «9 de 104 mínimas cuantías limitadas a Mipymes en Medellín (8,65 %)» (verificada: confirmada). González Palacio (2026), p. 26 del PDF · F-397.
  - «7 de 24 procesos limitados (29,17 %), sobre todo interventoría» (verificada: confirmada). González Palacio (2026), p. 28 · F-397.
  - «2 de 12 convocatorias limitadas en Zipaquirá en 2020 (16,66 %)» (verificada: confirmada). Cantillo García (2022), p. 31 · F-442.
  - «65 % de las empresas pide información más clara; 78 % percibe que no es fácil participar» (verificada: confirmada). CCE, estudio de criterios diferenciales mínima cuantía, nota 16 · F-057.
  - «Certificado de tamaño con fecha de máximo 60 días calendario» (verificada: confirmada). Guía CCE para Mipymes (2024), p. 18 · F-011.
- **Vigencia a revisar:** El umbral en pesos cambia cada dos años; no se verificó que el art. 2.2.1.2.4.2.2 (Decreto 1860 de 2021) siga sin modificar. La encuesta del DNP se cita de segunda mano (Gaceta 959 de 2020).
- **Fuentes (10):** F-011, F-057, F-089, F-102, F-116, F-124, F-397, F-442, F-529, F-564

#### DET-17 · El contratista grande, o un consorcio con un socio grande, se entera tarde de que el proceso quedó limitado a Mipymes, al territorio o por lotes

- **Gravedad:** media. Se pierden la preparación de la oferta y la póliza en un proceso donde no se podía participar.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Si dos Mipymes la piden a tiempo, la convocatoria queda limitada de pleno derecho y solo se aceptan proponentes plurales integrados únicamente por Mipymes. La limitación territorial es facultativa de la entidad, no se puede pedir, y una sucursal en el sitio no acredita domicilio (C-539/2022). El Decreto 142 de 2023 permite además reservar lotes a Mipymes o Mipymes locales y limitar cuántos lotes gana un mismo proponente. La decisión SÍ queda en los documentos: va en el acto de apertura y, en mínima cuantía, en un aviso obligatorio con al menos un día hábil más para ofertar; lo que puede faltar es el campo en el dataset abierto (esto desmiente el supuesto de Detekta de que «no publican si la limitaron»). Aun así, solo el 60 % de los procesos estudiados publicaba el acta de cierre de solicitudes.
- **Causa:** Arts. 2.2.1.2.4.2.2 y 2.2.1.2.4.2.3 del Decreto 1082 (Decreto 1860 de 2021) y Decreto 142 de 2023.
- **Consecuencia en plata:** Perder la preparación de la oferta y la póliza si el proponente o su consorcio no es 100 % Mipyme o no tiene domicilio donde se limitó. Sin cifra en las fuentes.
- **Solución documentada:** Leer el acto de apertura, el aviso de limitación, el acta de cierre de solicitudes Mipyme y el estudio del sector; armar consorcios solo con Mipymes si el proceso está bajo el umbral; acreditar domicilio con el registro mercantil, no con la sucursal.
- **Cifras:**
  - «Solo el 60 % de los procesos publicaba el acta de cierre de solicitudes Mipyme» (verificada: confirmada). Cantillo García (2022), p. 31 · F-442.
- **Vigencia a revisar:** El Decreto 142 de 2023 tiene al menos el art. 15 suspendido y pudo modificarse; no se verificó el texto vigente.
- **Fuentes (7):** F-011, F-094, F-101, F-102, F-124, F-442, F-548

#### DET-18 · El umbral Mipyme en pesos cambia, se publica tarde y en 2026 bajó: un valor viejo clasifica mal los procesos

- **Gravedad:** media. Un umbral viejo clasifica mal procesos en una franja estrecha; decisión de socio o participación equivocada.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Los US$125.000 se liquidan con la tasa que fija el Ministerio de Comercio cada dos años, no con la TRM, y el decreto dice «menor a». El umbral de 2025 era $533.287.768 y el de 2026, $511.708.497, publicado el 24-mar-2026: un proceso entre esos dos valores (por ejemplo, de $520 millones) se marca mal si se usa la cifra vieja. CONTRADICCIÓN ENTRE FICHAJES: uno cita el aviso de CCE del 24-mar-2026 como fuente primaria; otro dice que para 2026 solo encontró la cifra en un blog de abogados, sin fuente primaria abierta. Tampoco está claro qué valor aplicaba entre el 1-ene y el 24-mar-2026.
- **Causa:** Actualización bienal del MinCIT con publicación tardía.
- **Consecuencia en plata:** El contratista decide mal si presentarse o con qué socio.
- **Solución documentada:** Tomar el valor del aviso de CCE y MinCIT del año, guardado con la fecha de su fuente, y comparar con «<» estricto.
- **Cifras:**
  - «Umbral Mipyme 2025: COL$533.287.768» (sin verificar (no entró en la verificación de normas)). CCE y MinCIT, umbral de Mipymes 2025, p. 2 · F-153.
  - «Umbral Mipyme 2026: $511.708.497, publicado el 24-mar-2026» (sin verificar (no entró en la verificación de normas)). Aviso de CCE del 24-03-2026 · F-054.
- **Vigencia a revisar:** Según el fichaje, Detekta ya tiene UMBRAL_MIPYME_COP = 511708497 en lib/perfiles.js (no verificado en esta consolidación); su comentario dice revisarla en enero, pero la publicación salió en marzo. Valor aplicable entre el 1-ene y el 24-mar-2026 sin verificar.
- **Fuentes (3):** F-054, F-102, F-153

#### DET-19 · Mínima cuantía: se publica hoy y se entrega mañana, gana el menor precio, se paga contra entrega y los tributos locales se comen el margen

- **Gravedad:** media. Margen bajo o negativo y costo financiero de la obra; pérdidas acotadas por el tamaño de la mínima cuantía.
- **Tipos de contrato:** obra, bienes, servicios, interventoría, consultoría
- **Descripción:** La invitación se publica por no menos de un día hábil y gana la oferta de menor precio que cumpla, compitiendo con personas naturales sin IVA y empresas sin RUP; el oferente que no vigila a diario se queda fuera. En obra, la entidad que no exige capacidad financiera puede pagar solo contra entrega a satisfacción, sin anticipo ni actas parciales, y el contratista financia toda la obra. Los costos fijos de estampillas y garantías hacen poco atractivos los procesos pequeños, que por eso quedan desiertos.
- **Causa:** Ley 1150 art. 2 num. 5 (modificado por la Ley 2069) y art. 2.2.1.2.1.5.2 del Decreto 1082 (Decreto 1860 de 2021): plazos de un día hábil, menor precio como único factor y sin RUP.
- **Consecuencia en plata:** Horas de preparación perdidas cuando el precio no da; costo financiero de toda la obra hasta el final y riesgo de iliquidez; margen bajo o negativo si no se descuentan tributos locales y garantías.
- **Solución documentada:** Mantener al día la carpeta de documentos base (cámara de comercio, aportes, antecedentes, SG-SST), verificar primero si el precio es competitivo, y calcular el costo financiero y los tributos locales antes de ofertar (inferencia de los fichajes). Los autores recomiendan que la entidad siempre entregue anticipo.
- **Cifras:**
  - «La invitación de mínima cuantía se publica por un término no inferior a un día hábil» (sin verificar (no entró en la verificación de normas)). Manual CCE de mínima cuantía (2024), §11, p. 15 · F-089.
  - «Mínima cuantía de obra en Sogamoso: 11,0 días hábiles en promedio de publicación a adjudicación» (verificada: confirmada). Dávila Ibarra (2025), p. 63 del PDF · F-389.
- **Vigencia a revisar:** El estudio de pago contra entrega cita el manual de CCE y el Decreto 1510 de 2013 de esa época; no se cotejó con el manual de 2024. El enfoque de los tributos locales es sobre bienes; la aplicación a obra es inferencia.
- **Fuentes (7):** F-089, F-142, F-296, F-341, F-389, F-503, F-580

#### DET-20 · La pyme de obra regional no sabe usar SECOP II, no tiene área de licitaciones ni herramientas de búsqueda, y casi no oferta

- **Gravedad:** media. Oportunidades no ofertadas; pérdida de oportunidad, no de plata comprometida.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Muchas pymes constructoras siguen buscando en SECOP I, desconocen la técnica de participación en SECOP II, no tienen área de licitaciones y les resultan caros el software y los asesores. En el Chocó no hubo una sola propuesta de pyme regional en SECOP II entre 2019 y 2021 en los procesos estudiados; en una encuesta solo dos empresas usan software especializado y adjudican poco de lo que presentan.
- **Causa:** Falta de capacitación, infraestructura y habilidad digital, y dependencia de una plataforma que ya conocen.
- **Consecuencia en plata:** Contratos que pudieron ganar y no se ofertan. Las cifras de utilidad del autor (contratos de unos $30 millones con 10-18 %) no tienen fuente verificable.
- **Solución documentada:** Capacitación y acompañamiento en la participación en SECOP II, inversión en infraestructura digital básica y alianzas con firmas consolidadas para sumar experiencia y capacidad financiera.
- **Cifras:**
  - «Solo dos empresas encuestadas usan software especializado de búsqueda» (sin verificar (no entró en la verificación de normas)). Mora Cifuentes (2023), sección de análisis de la encuesta · F-414.
- **Vigencia a revisar:** El estudio del Chocó cita la Ley 80 modificada por la Ley 1150; el régimen de mínima cuantía vigente debe verificarse. El estudio de Israel y Mchopa (2026) no es colombiano. Dos de las cuatro URL son el mismo artículo del Chocó.
- **Fuentes (4):** F-261, F-262, F-304, F-414

#### DET-21 · Se decide ofertar por experiencia, sin mirar el historial de la entidad: las que adicionan y prorrogan casi todo son la mejor señal de riesgo

- **Gravedad:** media. Hereda prórrogas y costos indirectos que solo se cobran con salvedad; pérdida acotada y no cuantificada.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** El mejor predictor de sobrecostos y retrasos en obra es el historial de la entidad contratante, no el contratista; hay entidades que adicionan y prorrogan la mayoría de sus contratos, señal observable de mala planeación antes de ofertar. Los contratistas casi no usan modelos para decidir si ofertar o fijar el margen, aunque modelos simples superan al puntaje ponderado tradicional. Un experimento en Uganda mostró que las alertas de oportunidades por sí solas no aumentan las ofertas ni los contratos ganados; sí lo hace la información sobre la integridad de cada entidad.
- **Causa:** Planeación, gestión y supervisión deficientes que se repiten en la misma entidad; decisión de ofertar basada en juicio profesional; desconfianza en la integridad de las entidades.
- **Consecuencia en plata:** El contratista hereda prórrogas, mayor permanencia y costos indirectos que solo se cobran con salvedad, y compromete capacidad residual y capital de trabajo. Ninguna fuente lo cuantifica en pesos.
- **Solución documentada:** Construir indicadores históricos por entidad (adiciones, prórrogas, desviación de costo y plazo) combinados con variables del proceso en modelos interpretables, como alerta y no como veredicto; modelos de decisión ofertar/no ofertar alimentados con el historial propio; información de integridad de la entidad dada por pares.
- **Cifras:**
  - «64 % de los contratos adjudicados en 2017 y 61 % en 2018 fueron adicionados» (verificada: confirmada). Angarita Ospina et al. (2019), Tablas 5 y 6, pp. 63-64 · F-254.
  - «60 % de los contratos se prorrogó más del 50 % del plazo inicial en 2017, y 75 % en 2018» (verificada: confirmada). Angarita Ospina et al. (2019), Tablas 5 y 6, pp. 63-64 · F-254.
  - «Decisión de ofertar: 90,0 % de acierto con máquina de vectores de soporte contra 47,5 % con puntaje ponderado (40 proyectos)» (verificada: confirmada). Sonmez y Sözgen (2017), p. 647 · F-360.
- **Vigencia a revisar:** El estudio de Uganda se hizo sin sistema electrónico centralizado; trasladarlo a Colombia con SECOP II es inferencia. Las cifras de adiciones son de una muestra de 2017-2018.
- **Fuentes (7):** F-106, F-254, F-264, F-267, F-305, F-360, F-392

#### DET-22 · Procesos que se caen después de convocados o quedan desiertos: se pierde la oferta, y la reapertura llega por un camino más corto que hay que vigilar

- **Gravedad:** media. Se pierde el costo de preparar la oferta; acotado.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Una parte importante de los procesos convocados termina de forma anormal o se declara desierta, y la oferta preparada se pierde aunque el proponente haya hecho todo bien. Tras una licitación desierta, la entidad puede recontratar en 4 meses por selección abreviada sin sorteo ni manifestación de interés: un proceso más corto, con el mismo objeto y a menudo con menos competidores. Si la entidad declaró desierta para enmendar su propio error, es impugnable.
- **Causa:** Fallas de planeación de la entidad y habilitantes incumplidos; art. 2.2.1.2.1.2.22 del Decreto 1082 de 2015 para la reapertura.
- **Consecuencia en plata:** Se pierde el costo de preparar la oferta; ninguna fuente abierta cuantifica cuánto cuesta prepararla.
- **Solución documentada:** Seguir las desiertas en las que participó o que le interesaban y esperar la reapertura por selección abreviada dentro de los 4 meses.
- **Cifras:**
  - «16 % de 59.813 procesos iniciados entre 2010 y 2016 terminó de forma abrupta después de convocado» (verificada: confirmada). Serrano Guzmán et al. (2019), Via Iuris, p. 89 · F-350.
  - «Terminación abrupta en construcción: 8,9 % selección abreviada, 8,7 % concurso, 7,5 % mínima cuantía, 7,2 % licitación» (verificada: confirmada). Serrano Guzmán et al. (2019), Via Iuris, p. 95 · F-350.
  - «Acto de apertura dentro de los 4 meses siguientes a la declaratoria de desierta» (sin verificar (no entró en la verificación de normas)). Osorio Ruiz (2021), p. 8 del PDF · F-447.
- **Vigencia a revisar:** Datos de SECOP I 2010-2016; no medidos en SECOP II. El texto vigente del Decreto 1082 no se verificó.
- **Fuentes (3):** F-328, F-350, F-447

#### DET-23 · Antes y después de la ley de garantías la contratación se dispara en pocas semanas y luego se frena

- **Gravedad:** media. Saturación de capacidad y flujo de caja irregular; pérdida acotada.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Las entidades, sobre todo territoriales, anticipan sus procesos a la restricción electoral (noviembre, diciembre y enero) y después reactivan en masa: tras la ley de garantías de 2026 quedaron decenas de miles de procesos sin firmar concentrados en pocas semanas, con INVÍAS a la cabeza en monto.
- **Causa:** Cinco meses de restricción a la contratación directa, seguidos de la reactivación.
- **Consecuencia en plata:** Saturación de la capacidad de preparar ofertas y de la capacidad residual en esas semanas, y luego una sequía que afecta el flujo de caja (inferencia de las fuentes).
- **Solución documentada:** Ninguna para el contratista en las fuentes: son diagnósticos.
- **Cifras:**
  - «43.092 contratos suscritos y 50.645 procesos sin firmar tras la ley de garantías» (verificada: confirmada). Transparencia por Colombia (jul-2026), pp. 9-10 · F-481.
  - «Unos 37 billones de pesos en unos 504.000 contratos antes de la ley de garantías, 61 % de entes territoriales» (sin verificar). CCE, video, min 0-1 · F-522. Nota del verificador: YouTube bloqueado desde este entorno (redirección a google.com/sorry).
- **Fuentes (3):** F-481, F-522, F-524

#### DET-24 · Inhabilidades que no se ven a tiempo: diseñador de la obra, financiador de campañas y contratista de obra de la misma entidad

- **Gravedad:** alta. Oferta inhábil o contrato viciado de nulidad por una inhabilidad legal.
- **Tipos de contrato:** obra, interventoría, consultoría, todos los tipos
- **Descripción:** Tres inhabilidades que tumban la oferta o el contrato: (1) quien hizo los estudios y diseños no puede ser vinculado por la ejecutora ni su subcontratista en un contrato interadministrativo (Ley 1150 art. 2 num. 4 lit. c); (2) quien aportó más del 2 % del tope de una campaña queda inhabilitado con todas las entidades de ese nivel de gobierno, y alcanza a parientes y empresas controladas (Ley 1778 art. 33); (3) quien tiene contrato de obra con una entidad no puede ser su interventor hasta liquidarlo, y la inhabilidad se extiende a parientes y socios (Ley 1474 art. 5).
- **Causa:** Normas expresas de la Ley 1150, la Ley 1474 y la Ley 1778.
- **Consecuencia en plata:** Oferta inhábil, costo de la oferta perdido o contrato viciado de nulidad. Ninguna fuente cuantifica.
- **Solución documentada:** Antes de ofertar, verificar si la empresa o sus vinculados participaron en los estudios y diseños, cruzar los aportes a campañas (Cuentas Claras) y los contratos de obra vigentes o sin liquidar con la entidad.
- **Cifras:**
  - «Aportes mayores al 2 % del tope de la campaña inhabilitan para contratar con el mismo nivel de gobierno» (verificada: confirmada). Transparencia por Colombia (2024), p. 25 · F-484.
  - «86,8 % de los contratos de financiadores de campañas se hacen por modalidades directas» (verificada: confirmada). Transparencia por Colombia (2024), p. 23 · F-484.
- **Vigencia a revisar:** El texto vigente del art. 2 de la Ley 1474 (modificado por la Ley 1778) no se verificó en el Senado.
- **Fuentes (3):** F-142, F-144, F-484

### 3.3 Preparar la oferta (25)

#### PRE-01 · Garantía de seriedad: si no va con la oferta, se pierde el proceso sin remedio

- **Gravedad:** alta. No entregarla cuesta la oferta sin posibilidad de subsanar, y no prorrogarla puede hacer que la entidad cobre la garantía.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La garantía de seriedad que no se entrega junto con la oferta es causal de rechazo no subsanable (Ley 1150 art. 5 par. 3, texto de la Ley 1882). En SECOP II la plataforma exige número, valor y vigencia de la póliza para dejar «Finalizar», y hay quien digita datos inventados o carga otro documento mientras llega la póliza: al cierre no hay garantía real y la oferta cae. Antes, en subasta, se acostumbraba comprarla solo al quedar habilitado; ya no sirve. Distinto es la póliza entregada con defectos (tomador, número de proceso, beneficiario, valor, firma) o que vence porque la evaluación se alargó: según la doctrina y el Consejo de Estado (Sentencia 39066 de 2018) eso sí se subsana o se prorroga. CONTRADICCIÓN entre fuentes: una ficha (Guía de Garantías 2026) dice que una póliza con datos o vigencia mal puestos «también se rechaza», mientras Derectum 2024 y Parrado 2021 sostienen que la póliza presentada con errores sí se puede subsanar.
- **Causa:** Se trata la póliza como trámite final; la aseguradora no la entrega a tiempo; se confunde la ausencia (no subsanable) con el defecto (subsanable); no se amplía la vigencia ante prórrogas del cronograma.
- **Consecuencia en plata:** Rechazo de plano y pérdida de todo lo invertido en la oferta. Si la entidad prorroga plazos y no se amplía la vigencia, la entidad puede hacer efectiva la garantía (pérdida del valor asegurado).
- **Solución documentada:** Pedir la póliza con días de antelación y adjuntarla siempre con la oferta. Revisarla con lista de chequeo (beneficiario, número de proceso, tomador con NIT, porcentaje y monto, vigencia desde el cierre, coberturas, firma) y verificar su autenticidad (QR, hash o CUFE). Ampliar la vigencia ante cada prórroga y corregir los errores cuando la entidad lo pida.
- **Vigencia a revisar:** La causal de efectividad por no ampliar la vigencia viene del Decreto 1082 citado por una tesis de 2021, sin texto vigente verificado.
- **Fuentes (8):** F-034, F-036, F-110, F-142, F-266, F-448, F-502, F-510

#### PRE-02 · RUP no inscrito, no actualizado o no en firme al cierre: no se arregla después

- **Gravedad:** alta. Sin RUP en firme la oferta se rechaza o no habilita; se pierde el contrato.
- **Tipos de contrato:** obra, interventoría, consultoría, bienes, servicios
- **Descripción:** La inscripción en el RUP debe existir antes de presentar la oferta y, según la doctrina, la falta de actualización tampoco se subsana; solo se subsana no haber aportado el certificado. La inscripción, renovación o actualización tarda unos 10 días hábiles en quedar en firme. Mientras una renovación está en trámite rige el RUP anterior: CCE (C-353 de 2024) dice que se evalúa con la información en firme antes del cierre «independientemente de que la nueva información favorezca o perjudique al proponente». Entre enero y el quinto día hábil de abril quizá no estén en firme los estados financieros del año anterior; la entidad debe evaluar con el año anterior o el antepasado según lo que esté en firme (C-1874). Además, el trámite del RUP es más lento y caro que en países comparables (OCDE 2022). La jurisprudencia sobre subsanación es contradictoria y parte de estas reglas viene de fallos anteriores a la Ley 1882 de 2018, que amplió la subsanación de lo que no da puntaje.
- **Causa:** Se confunde la inscripción (hecho que debe existir al cierre) con su prueba; se renueva o actualiza tarde; la firmeza toma días hábiles adicionales; el calendario de estados financieros choca con los cierres de enero a abril.
- **Consecuencia en plata:** Rechazo de la oferta y pérdida de su costo; o quedar sin habilitar en capital de trabajo, K o experiencia aunque el RUP nuevo sí cumpliera.
- **Solución documentada:** Inscribir, renovar y actualizar el RUP con más de 10 días hábiles de anticipación al cierre; renovar antes del quinto día hábil de abril; planear las ofertas de abril y mayo con los números del RUP en firme, no con los nuevos.
- **Cifras:**
  - «La renovación o actualización del RUP toma diez días hábiles en adquirir firmeza» (verificada: confirmada). Video Capacítate con funcionaria de CCE, min 85-86 · F-529.
  - «Tiempo para completar el registro: Colombia 15 días; Corea 8 horas laborales; México 2 días; Chile inmediato» (sin verificar). OCDE 2022, tabla 2.3, pág. 18 del PDF · F-476. Nota del verificador: No abrí el texto: doi.org devolvió una página de reto Cloudflare («Just a moment...»), oecd.org devolvió «HTTP 403 Forbidden» (dos rutas) y search.oecd.org «getaddrinfo ENOTFOUND». Es una observación con fecha (19-oct-2026), no una propiedad de la fuente.
  - «La tarifa de registro en Colombia es 2,7 veces la de Chile, y 6,75 veces para microempresa» (sin verificar (no entró en la verificación de normas)). OCDE 2022, pág. 34 del PDF · F-476.
- **Vigencia a revisar:** Varias subreglas (no subsanable la falta de actualización) vienen de fallos de 2006-2016 y de la Circular 13 de 2014, anteriores a la Ley 1882 de 2018. La regla transitoria del «mejor año fiscal» (Decretos 399/579 de 2021, 1041 de 2022) puede no regir en 2026. Los 10 días hábiles los dice una funcionaria en 2021, sin la norma abierta. Tarifas OCDE de 2021-2022.
- **Fuentes (8):** F-034, F-072, F-078, F-129, F-132, F-314, F-476, F-529

#### PRE-03 · Lo que se subsana es la prueba, no el requisito: si el hecho no existía al cierre, la oferta cae

- **Gravedad:** alta. Lleva al rechazo o a la no habilitación: se pierde el contrato.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Se cree que «todo lo que no da puntaje se subsana» y se presenta la oferta sin tener cumplido el requisito. El Consejo de Estado distingue el hecho habilitante, que debe existir al cierre (RUP inscrito, aportes pagados, autorización de la junta, capacidad jurídica de cada integrante), de su prueba, que sí se completa hasta el traslado del informe; y la ley prohíbe acreditar circunstancias posteriores al cierre. Caen por aquí: documentos de vigencia corta vencidos o expedidos después del cierre (cámara de comercio, certificado bancario, antecedentes), el objeto social que no corresponde al del contrato, varias ofertas del mismo proveedor o representante legal, la oferta parcial, la entrega en lugar distinto, y en bienes el detalle de la ficha técnica no cumplido (presentación, unidad, calidad mínima). En un caso estudiado, cinco proyectos no se adjudicaron por RUP, tres por falta de garantía de seriedad y uno porque un integrante del consorcio no tenía capacidad para asociarse. Una encuesta a mipymes ubica la causa en la mala lectura del pliego y en no revisar antes de enviar.
- **Causa:** Lectura literal de la regla de subsanación; revisión documental incompleta antes del cierre; ningún control previo de los documentos de cada integrante del plural; plazos de vigencia que fija cada pliego.
- **Consecuencia en plata:** Rechazo o no habilitación y pérdida del costo de preparar la oferta. Las fuentes no lo cuantifican en pesos.
- **Solución documentada:** Verificar antes del cierre que cada hecho exista; mantener al día los documentos básicos con su fecha; lista de chequeo y revisión cruzada antes de radicar; en bienes, cotejar la oferta con los elementos mínimos de la ficha técnica. Hubo un caso en que se aceptó un certificado de contador fechado después del cierre porque certificaba una condición que ya existía antes.
- **Cifras:**
  - «Microempresas encuestadas: 15 % de éxito frente a 55 % de descalificación (autodeclarado)» (verificada: confirmada). Guzmán y Henao 2026, pág. PDF 85 · F-399.
  - «Deficiente lectura e interpretación de pliegos presente en el 48 % de los casos analizados» (verificada: confirmada). Guzmán y Henao 2026, pág. PDF 57 · F-399.
  - «Cinco proyectos sin adjudicar por RUP y tres por falta de garantía de seriedad; un integrante con el 45 % sin capacidad jurídica para el consorcio» (verificada: confirmada). Via Iuris, Serrano Guzmán et al., pp. 91-92 · F-350.
  - «Certificado bancario con antigüedad máxima de 30 días (en el pliego mostrado, no norma general)» (sin verificar). Video «Secop 2 desde cero», min 17:54-18:00 · F-502. Nota del verificador: Video: no hay texto oficial que abrir. YouTube redirige a https://www.google.com/sorry/index (302, verificación antibots) y no entrega transcripción. Dejado sin verificar.
- **Vigencia a revisar:** La subregla que permite inscribirse en el RUP el mismo día de la oferta es de fallos anteriores a 2018. Los casos de Via Iuris son de 2013-2016, antes de la Ley 1882; hoy la falta del RUP, la carta de consorcio o el certificado de Cámara se subsana si la situación existía al cierre. Los plazos de un mes y 30 días son de los pliegos mostrados. Las cifras de la encuesta son autodeclaradas por una muestra regional.
- **Fuentes (11):** F-067, F-110, F-142, F-180, F-266, F-314, F-350, F-399, F-498, F-502, F-503

#### PRE-04 · Formulario 1 (oferta económica): cambiar un ítem, una cantidad o dejar un unitario en cero es rechazo sin arreglo

- **Gravedad:** alta. Rechazo no subsanable de la oferta económica: se pierde el contrato.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Los documentos tipo traen causales de rechazo cerradas y varias son de la oferta económica: modificar, suprimir o agregar ítems, unidades o cantidades; precio unitario en cero o vacío; superar el tope unitario de ítems marcados o el AIU de la entidad; oferta condicionada o parcial; más de una oferta económica. El costeador que corrige cantidades «mal medidas» creyendo que la entidad lo arreglará como error aritmético se equivoca: la corrección aritmética solo arregla operaciones (C-301 de 2026). Al pasar el formato a Excel se pierden filas o se cambia la estructura. En mínima cuantía el precio es el único factor y no se subsana, solo se aclara, y una aclaración que mejore la oferta lleva al rechazo. El formulario es el único documento que la entidad puede ajustar, así que cambia de un pliego a otro; en infraestructura social (desde el 16-feb-2026) cambia según la forma de pago, y en administración delegada el AIU no opera como en precios unitarios. En suministros por monto agotable (cantidades en 1) va el presupuesto total en el cuestionario y se compite con la lista de unitarios. Matiz: según la guía de CCE, omitir las notas del Formulario 1 o usar la hoja equivocada no basta por sí solo para rechazar.
- **Causa:** Errores de diligenciamiento; costear con el molde de precios unitarios un proceso con otra forma de pago; copiar el formato a mano; no leer el formulario propio de cada proceso.
- **Consecuencia en plata:** La oferta queda fuera aunque sea la de menor precio; se pierde el contrato y el costo de prepararla.
- **Solución documentada:** Respetar ítems, unidades y cantidades del presupuesto oficial y observar las diferencias antes del cierre. Comparar el formato propio contra el cuadro de la entidad; ningún unitario en cero; leer en el numeral 4.1 la forma de pago; si la entidad pide aclaración, contestar sin tocar el valor. La entidad no puede agregar causales a las del documento tipo: si lo hace, cabe observación.
- **Vigencia a revisar:** Las letras de las causales cambian entre versiones de los documentos tipo; la Res. 464 de 2024 (mínima cuantía transporte) pudo ser sustituida; las respuestas de CCE sobre el formulario «indicativo» son de 2021. Verificar contra la versión vigente del pliego.
- **Fuentes (12):** F-016, F-018, F-029, F-034, F-050, F-069, F-086, F-089, F-096, F-454, F-503, F-516

#### PRE-05 · Techos y pisos de precio: pasarse por 2 pesos, superar el tope de un solo ítem o bajar más del piso descalifica

- **Gravedad:** alta. Descalifica la oferta, incluso siendo la única: se pierde el contrato.
- **Tipos de contrato:** obra, interventoría, consultoría, bienes, servicios
- **Descripción:** Superar el presupuesto oficial aunque sea por pesos —a menudo por heredar el error aritmético o de redondeo del formato que publicó la entidad— es causal de rechazo inmediata. Las entidades fijan además precios techo por ítem, a veces en los estudios previos o el anexo técnico y no en el formato de oferta, y pasarse en uno solo descalifica aunque el total esté por debajo. Algunos pliegos ponen un piso de descuento (no bajar de cierto porcentaje del presupuesto), distinto del trámite de precio artificialmente bajo, que pide justificar y no rechaza de entrada. En el concurso de méritos ya no hay negociación con el primer elegible (Decreto 399 de 2021): el pliego debe prohibir superar el presupuesto como requisito habilitante, y el consultor no puede corregir el precio después.
- **Causa:** Se parte del formato de la entidad sin rehacer cantidad por precio; los límites están en documentos distintos del formato de oferta; se compensan ítems como con un cliente privado; no se lee la cláusula de piso.
- **Consecuencia en plata:** Rechazo siendo el único oferente habilitado; en el caso narrado hubo que pagar otra póliza y volver a presentar en el proceso siguiente.
- **Solución documentada:** Rehacer la aritmética con fórmulas propias; buscar los precios de referencia en estudios previos y anexo técnico y pedir que se publiquen si faltan; leer el piso y las causales antes de fijar el descuento; en concurso de méritos, observar el presupuesto en el proyecto de pliego (C-207 de 2024).
- **Cifras:**
  - «Único oferente habilitado rechazado por superar el presupuesto en 2 pesos» (sin verificar (no entró en la verificación de normas)). Video Asesoría en Licitaciones (yQ-HxG7snPE), min 31:13-31:38 · F-503.
  - «Oferta perdida por ofrecer el 97,7 % cuando el piso era el 98 % del presupuesto» (sin verificar). Video Asesoría en Licitaciones (yQ-HxG7snPE), min 42:06-43:20 · F-503. Nota del verificador: Video: YouTube respondió con redirección 302 a google.com/sorry (verificación antibots); sin transcripción accesible. Dejado sin verificar.
- **Vigencia a revisar:** El «95 %» como piso típico es afirmación de una practicante, no una norma. No se verificó si los documentos tipo de interventoría vigentes en 2026 repiten la prohibición de superar el presupuesto con esa redacción.
- **Fuentes (4):** F-048, F-125, F-502, F-503

#### PRE-06 · El precio digitado en SECOP II no coincide con el anexo económico

- **Gravedad:** alta. Puede costar la oferta entera o fijar un precio no querido.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El valor se digita dos veces: en el formulario «Lista de precios» de SECOP II y en el anexo o Excel de la entidad; con muchos ítems se usa importación masiva que no admite cambiar columnas ni fórmulas. CONTRADICCIÓN entre fuentes: la guía de CCE «Presentar ofertas – SECOP II» dice que, ante diferencia, la entidad debe evaluar el valor indicado en la plataforma; practicantes en video cuentan que algunas entidades lo tratan como causal de rechazo y una relata que le rechazaron una oferta por esa diferencia. Conclusión prudente: manda lo que diga el pliego; si calla, el riesgo es el rechazo o ser evaluado por un valor que no se quiso ofrecer.
- **Causa:** Doble digitación del precio y plantillas de importación que no se pueden modificar.
- **Consecuencia en plata:** Rechazo, o adjudicación/evaluación (media, desempate) por un valor que el proponente no quiso ofrecer.
- **Solución documentada:** Cuadrar ambos valores antes de guardar y antes de «Confirmar»; no modificar la plantilla de Excel (campo «Nivel» en cero); leer en el pliego cuál prevalece.
- **Vigencia a revisar:** El manual de Detekta (cap. 4, error 7) dice tajante «El formulario prevalece»; las fuentes de practicantes muestran que depende de cada pliego.
- **Fuentes (3):** F-043, F-497, F-503

#### PRE-07 · Errores operativos al cargar la oferta: archivo de otro proceso, «Finalizar» sin «Presentar», precios en el sobre equivocado

- **Gravedad:** alta. Cada uno de estos errores ha hecho perder el contrato a un oferente que tenía el mejor precio.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Errores mecánicos que tumban ofertas bien costeadas: adjuntar la oferta económica de otro proceso porque todos los archivos se llaman igual; confundir «Finalizar» con «Presentar» o presentar el borrador equivocado entre varias versiones; preguntas obligatorias del cuestionario (en obra, el detalle del AIU) que bloquean «Finalizar», y datos que se borran al cambiar de paso sin guardar; presentar sobre la hora y que se caiga el internet; no totalizar la oferta ni discriminar el IVA (o dejarlo en cero sin citar la norma que exime); y colar un dato económico en el sobre habilitante: en licitación de obra el segundo sobre debe llevar únicamente la oferta económica y se abre en la audiencia de adjudicación (Ley 80 art. 30, par. 2 y 3), y en subasta presencial la oferta económica dentro del sobre de habilitantes descalifica.
- **Causa:** Plantillas reutilizadas, prisa al cierre, varias ofertas simultáneas, desconocimiento del flujo de estados de SECOP II (en edición, finalizada, presentada).
- **Consecuencia en plata:** Descalificación con la oferta más barata o siendo único oferente; se pierden la cotización, los formatos y la lectura del pliego.
- **Solución documentada:** Nombrar cada archivo con el número del proceso; preparar antes el cuestionario y el desglose del AIU; guardar en cada paso; tener la carpeta lista y presentar con tiempo; verificar en «Mis ofertas» el estado «presentada» y guardar pantallazo; retirar borradores sobrantes; separar los sobres; totalizar siempre y anotar la norma si el IVA va en cero.
- **Vigencia a revisar:** La mayoría de los casos vienen de videos de practicantes, no de norma; la exigencia de discriminar el IVA depende del pliego.
- **Fuentes (9):** F-043, F-110, F-497, F-502, F-503, F-510, F-537, F-560, F-572

#### PRE-08 · Adendas, respuestas y plazos: ofertar sobre una versión vieja del pliego o llegar tarde

- **Gravedad:** alta. Una oferta no reenviada tras una adenda no puede adjudicarse.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Una adenda publicada después de enviar la oferta la deja inválida en SECOP II si el proponente no la retira y la vuelve a presentar (guía CCE). Ofertar sobre el borrador del pliego o sobre un formato superado por una adenda lleva a rechazo con probabilidad «muy alta» según CCE. Las respuestas a observaciones pueden modificar el pliego sin llamarse «adenda» (C-1541 de 2025), y las observaciones enviadas tarde no se pueden acoger aunque tengan razón: los plazos son preclusivos. No puede haber adendas en los 3 días anteriores al cierre. Además, los días hábiles los define cada entidad: hay municipios que trabajan el fin de semana y descansan el miércoles (C-1850 de 2025), así que el calendario nacional puede hacer llegar tarde a una observación, manifestación o subsanación.
- **Causa:** Se descargan los documentos una sola vez; se vigilan solo los documentos titulados «Adenda»; se lee el pliego definitivo cerca del cierre; se calculan plazos con el calendario nacional.
- **Consecuencia en plata:** Pérdida total de la inversión en la oferta (no puede ser adjudicada), u oferta sobre reglas desfavorables que pudieron corregirse.
- **Solución documentada:** Revisar «Notificaciones» después de enviar; ante una adenda, copiar la oferta, aplicar el cambio, retirar la anterior y enviar la nueva antes del cierre. Descargar el paquete completo y leer las respuestas a observaciones como posibles modificaciones. Observar dentro de plazo. Verificar el acto de la entidad que define sus días laborables.
- **Cifras:**
  - «No pueden expedirse adendas dentro de los tres (3) días anteriores al cierre» (verificada: confirmada). Ley 80 de 1993, art. 30 num. 5 (mod. art. 89 Ley 1474) · F-114.
- **Fuentes (5):** F-027, F-028, F-043, F-114, F-529

#### PRE-09 · Fallas de SECOP II y conectividad el día del cierre: sin aviso por correo antes de la hora, se pierde el derecho a ofertar

- **Gravedad:** alta. Un problema técnico mal gestionado deja la oferta fuera del proceso.
- **Tipos de contrato:** todos los tipos
- **Descripción:** SECOP II ha tenido periodos de indisponibilidad y funcionalidades faltantes, y en municipios alejados hay problemas de conectividad y velocidad de carga. El protocolo de indisponibilidad de CCE distingue falla general (certificada por la ANCP) y falla particular del usuario: para la particular hay que abrir caso de soporte y enviar un correo a la entidad antes del plazo de presentación; si no, la oferta no se tiene en cuenta. En menor cuantía, la manifestación de interés enviada por correo no vale, salvo falla de la plataforma (C-1377 de 2025), y el pliego puede exigir dos manifestaciones.
- **Causa:** Fallas técnicas de la plataforma, infraestructura de conectividad deficiente, falta de capacitación de mipymes locales, desconocimiento del protocolo.
- **Consecuencia en plata:** Oferta que no se carga antes del cierre se pierde entera; quedar fuera del sorteo o la lista de oferentes.
- **Solución documentada:** Ante falla particular: abrir de inmediato el caso en el formulario de soporte de la ANCP y escribir a la entidad, al correo de notificaciones del pliego y antes del cierre, manifestando la intención de participar. Ante falla general, confirmar por canales oficiales. Manifestar interés por la plataforma y documentar cualquier falla.
- **Vigencia a revisar:** El protocolo CCE-SEC-GI-14 se cita en su versión 01 de 2022 (fechas inconsistentes en el archivo); confirmar que no haya versión posterior. Las circulares 398/2020 y 2/2021 fueron temporales. Datos de conectividad de 2014-2018.
- **Fuentes (6):** F-023, F-037, F-281, F-291, F-292, F-295

#### PRE-10 · Consorcio o unión temporal mal armado: integrantes sin aceptar en SECOP II y responsabilidad que no se decidió

- **Gravedad:** alta. La oferta del plural no existe si falla la cuenta, y la solidaridad expone a pérdidas grandes en ejecución.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Un proponente plural no puede manifestar interés ni ofertar en SECOP II si algún integrante no ha aceptado su vinculación con el usuario de su representante legal; si uno rechaza, hay que editar y todos aceptan de nuevo, y suele dejarse para el último día. Lo que envíe un integrante desde su propia cuenta «no constituye oferta». Además se elige la figura con una plantilla sin decidir el reparto de responsabilidad: en el consorcio todos responden solidariamente por el incumplimiento; en la unión temporal las sanciones se individualizan por participación; los porcentajes también dividen la experiencia acreditada.
- **Causa:** La cuenta plural se crea tarde; plantillas de constitución usadas sin análisis de riesgo.
- **Consecuencia en plata:** Oferta no evaluable (se pierde la preparación y, en menor cuantía, la manifestación de interés previa); en ejecución, responder por todo el incumplimiento del socio en un consorcio.
- **Solución documentada:** Crear la cuenta plural con antelación, cargar el documento de constitución firmado por todos y verificar que todos figuren «Aceptado» antes de suscribirse, manifestar interés y ofertar. Decidir consorcio o unión temporal según el riesgo y fijar los porcentajes en el documento.
- **Fuentes (5):** F-017, F-021, F-033, F-035, F-043

#### PRE-11 · Experiencia que el oferente cree válida y la entidad rechaza por reglas finas del documento tipo

- **Gravedad:** alta. No habilita al proponente: se pierde el contrato.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** Las matrices de experiencia tienen varias capas que tumban ofertas: en licitación de obra de transporte (v4), un integrante del plural debe aportar al menos el 50 %, los demás al menos el 5 %, y quien no aporta experiencia no puede pasar del 10 % de participación; la experiencia de un plural anterior vale por el porcentaje de participación. En infraestructura social hay tope de contratos, fechas mínimas de ejecución ligadas a la norma sismorresistente, actividades que no cuentan como edificación (parqueaderos de un piso, vías, urbanismo) y reglas de porcentaje por actividad. En interventoría de agua potable la entidad fracciona el contrato aportado para contar solo lo que sirve, y la suma debe llegar al 100 % del presupuesto en SMMLV sin escalas. La entidad puede descartar autocertificaciones de la experiencia de la empresa (expedidas por ella o su grupo), aunque no puede rechazar la certificación del oferente sobre su propio personal clave (C-1275 de 2026).
- **Causa:** Mala distribución de experiencia entre integrantes; sobreestimar la experiencia traída de plurales anteriores; aportar contratos mixtos sin certificación separada; acreditar obras ejecutadas para sí mismo.
- **Consecuencia en plata:** Inhabilitación del proponente (o del plural entero) y pérdida del costo de la oferta.
- **Solución documentada:** Armar la estructura del plural cumpliendo el literal D del numeral 3.5.3 y aportar el documento de conformación de la unión temporal con la distribución de actividades; presentar certificaciones que separen el valor de las actividades útiles; acreditar la experiencia de la empresa con certificados de terceros contratantes; revisar el numeral 3.5 y el formato 3 del documento base.
- **Cifras:**
  - «Un integrante aporta mínimo el 50 % de la experiencia; los demás al menos el 5 %; quien no aporta no puede superar el 10 % de participación» (verificada: confirmada). Concepto C-034 de 2026 (17-feb-2026), texto citado · F-064.
  - «Contratos de edificación ejecutados después de enero de 1998 para que cuenten» (sin verificar (no entró en la verificación de normas)). Video CCE «Capacitación Documentos Tipo», min 63 · F-516.
- **Vigencia a revisar:** Las reglas de infraestructura social vienen de las resoluciones 219, 220 y 392 de 2021 y hubo actualizaciones en 2025 y una v2 de feb-2026; los porcentajes 50/5/10 son de transporte v4. Verificar contra la versión vigente a la fecha del aviso.
- **Fuentes (5):** F-017, F-047, F-064, F-073, F-516

#### PRE-12 · Capacidad residual (K) rechazada por declarar mal los contratos en ejecución

- **Gravedad:** alta. Inhabilita o hace rechazar la oferta aunque sea la de menor precio.
- **Tipos de contrato:** obra
- **Descripción:** Los contratos suspendidos y los que no tienen acta de inicio SÍ cuentan como «en ejecución»; los que están en liquidación NO (C-392 de 2022). Omitir alguno lleva al rechazo aun si la omisión no cambia el resultado del cálculo (C-1008 de 2026), y no informar todos los contratos en ejecución es causal de rechazo en el documento tipo. El certificado suele armarlo el contador sin conocer la guía y omite privados, del exterior o de consorcios, o no dice expresamente que no hay contratos. En mínima cuantía de obra no hay RUP, pero la K SÍ se exige: la entidad la verifica directamente y el proponente debe llevar el cálculo y sus soportes en la oferta; si antes de la aceptación se detecta que omitió contratos, la oferta se rechaza.
- **Causa:** La definición de «en ejecución» de la guía no es intuitiva; en mínima cuantía no hay certificado del RUP que respalde la K.
- **Consecuencia en plata:** Rechazo de la oferta o reproche por información inexacta; declarar de más hace perder capacidad para presentarse.
- **Solución documentada:** Usar el formato de CCE firmado por representante legal y revisor fiscal o contador con la lista completa (valor, plazo en meses, fecha de inicio, participación, suspensión con fecha); declarar expresamente si no hay contratos; en plural, sumar las K de los integrantes (una K negativa resta).
- **Vigencia a revisar:** Se basa en el art. 72 de la Ley 1682 de 2013 y en una guía de capacidad residual de 2022; un video indica que el manual cambió y no se pudo abrir. Detekta pone la K en «no consta» cuando la modalidad no lleva registro; en mínima cuantía de obra CCE dice que sí se exige (no verificado en el código).
- **Fuentes (6):** F-013, F-070, F-080, F-089, F-096, F-576

#### PRE-13 · Matriz de riesgos y minuta aceptadas sin observar: lo asignado al contratista no se reclama después

- **Gravedad:** alta. Traslada pérdidas grandes que luego no se pueden recuperar en juicio.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** Lo que la matriz del pliego asigna al contratista no da derecho a desequilibrio, aunque el pliego haya informado mal el dato: en un caso contra Invías el acarreo resultó mucho mayor que el del pliego y se negó todo porque el riesgo «cambios en las fuentes de materiales» era del contratista (CE 68810). Las matrices suelen ser genéricas, sin cuantificar, y cargan al contratista riesgos que nacen de la planeación (diseños, predios, traslado de redes) o que no controla (seguridad en zona roja, fuerza mayor asegurable); según ponentes, el Consejo de Estado las valida porque el oferente las conocía. Un tribunal llegó a sostener que quien no pidió precisión sobre una matriz imprecisa asumió esos riesgos (el Consejo de Estado revocó ese fallo, pero el riesgo procesal existe). Los proponentes tampoco leen la minuta del contrato: después del cierre ya no se puede cambiar.
- **Causa:** La entidad redacta la matriz sin cuantificar; la audiencia de riesgos rara vez cambia la asignación; el oferente no observa ni pone precio a los riesgos; se supone que todo está en el pliego y no en la minuta.
- **Consecuencia en plata:** Sobrecostos no reclamables y seguros adicionales a cargo del contratista; demandas de desequilibrio negadas con condena en costas.
- **Solución documentada:** Leer la matriz, el apéndice de riesgos y la minuta antes de fijar el precio; observarlos en la audiencia de riesgos o en las observaciones al pliego y pedir que se cuantifiquen o compartan; costear el riesgo asignado, asegurar lo asegurable o no presentarse. Diferenciar el imprevisto del AIU del riesgo asignado.
- **Vigencia a revisar:** El razonamiento del caso Mataven es de un tribunal revocado: presentarlo como riesgo de litigio, no como regla. No se identifica la sentencia del Consejo de Estado sobre zona roja. La tesis de matrices es de 2012-2018.
- **Fuentes (9):** F-006, F-195, F-197, F-209, F-408, F-428, F-533, F-550, F-556

#### PRE-14 · Diseños inmaduros, predios no disponibles o cláusulas que trasladan los diseños: el contratista termina corresponsable

- **Gravedad:** alta. Puede costar el anticipo, la nulidad del contrato o pérdidas grandes no reconocidas.
- **Tipos de contrato:** obra
- **Descripción:** Firmar una obra mal planeada (sin predios, con un plazo imposible o dependiente de terceros) puede llevar a la nulidad absoluta por objeto ilícito, declarable de oficio, y a restituir el anticipo actualizado aunque se haya invertido (CE 27315). El Consejo de Estado ha extendido el deber de planeación al proponente: quien no advirtió en la etapa del pliego que faltaban predios o diseños puede ser corresponsable y perder la mayor permanencia. Hay pliegos con una «fase de apropiación de estudios y diseños» que traslada al constructor todo el riesgo y el costo de los diseños (guía de obra de CCE 2025), y a precio global las mayores cantidades corren por cuenta del contratista: en el caso Vicon/IDU se negaron todas las reclamaciones por falta de prueba. Una cláusula abusiva sobre diseños puede tenerse por no escrita, pero el desequilibrio igual se pierde sin prueba. CONTRADICCIÓN: hay jurisprudencia posterior que niega que la falta de planeación sea causal de nulidad; no hay unificación.
- **Causa:** Planeación deficiente de la entidad; el contratista acepta las cláusulas al ofertar y confía en que el juez las anule; modalidad de pago a precio global con diseños deficientes.
- **Consecuencia en plata:** Restitución del anticipo actualizado; pérdida de la mayor permanencia; costos de revisar y rehacer diseños; reclamaciones negadas con costas.
- **Solución documentada:** Antes de ofertar, verificar predios, licencias, diseños y que el plazo sea realizable; observar por escrito y que quede la respuesta; tratar la fase de apropiación de diseños como señal roja: costear la ingeniería y la contingencia o no ofertar; documentar desde el inicio las fallas de diseño con informes de interventoría.
- **Cifras:**
  - «Contrato celebrado sin haber adquirido los predios y con plazo de 60 días; se ordena restituir el anticipo actualizado» (verificada: confirmada). CE Rad. 27315, pág. 14 · F-215.
  - «Programa vial sin estudios y diseños maduros pasó de 2,5 a cerca de 8 billones de pesos» (sin verificar (no entró en la verificación de normas)). Foro INGECO Uniandes, min 63 · F-563.
- **Vigencia a revisar:** El panel sobre corresponsabilidad es de hacia 2014 y la sentencia comentada fue objeto de tutela; hay un fallo de 2021 (rad. 2015-02527-01) visto solo en vLex que negaría la nulidad por falta de planeación.
- **Fuentes (8):** F-006, F-210, F-215, F-224, F-225, F-229, F-536, F-563

#### PRE-15 · Errores del presupuesto oficial y del terreno que «pudieron advertirse»: los asume el contratista

- **Gravedad:** alta. El error o el imprevisto que se debió ver se paga de la utilidad y la reclamación se pierde.
- **Tipos de contrato:** obra
- **Descripción:** El presupuesto y los APU que publica la entidad traen errores aritméticos y precios que varían para la misma actividad en la misma región y año; cuando la entidad corrige, compensa bajando otro ítem. Hay presupuestos armados con resoluciones de precios del año anterior y pliegos que prohíben el reajuste. El Consejo de Estado carga al contratista el error del presupuesto que pudo advertir en la visita o en el pliego (no lo puede cobrar después como obra no prevista), y lee la cláusula de conocimiento del sitio como estándar de diligencia: la visita hecha como trámite le quita la posibilidad de alegar imprevisibilidad sobre fuentes de materiales, distancias a plantas, botaderos, accesos o subsuelo. Quien acepta precios que sabe inferiores al mercado carga con ese riesgo; no evaluar la viabilidad antes de ofertar se ha calificado de culpa grave. Además la visita se volvió requisito en el pliego tipo v2 de obra (según la CCI), con su costo de viaje.
- **Causa:** Presupuestos hechos a mano en cada proceso; visita enviada con «un inexperto» a cumplir el requisito; no se contrasta el alcance con el Formulario 1; no se observa a tiempo.
- **Consecuencia en plata:** Obra ejecutada sin pago adicional, desequilibrio negado y condena en costas; riesgo de caducidad.
- **Solución documentada:** Enviar a la visita a alguien versado que verifique fuentes de materiales, pida cotizaciones y lleve las distancias al APU; comparar el alcance con el Formulario 1; contrastar el presupuesto con precios de mercado; observar el pliego dentro del cronograma (en los casos estudiados las entidades corrigieron por observaciones de los proponentes); dejar salvedades o pedir revisión de precios en cada adición o prórroga; abstenerse si las condiciones no alcanzan.
- **Cifras:**
  - «INVIAS tuvo que corregir el 16,20 % de los APU contratados, en 7 de 16 procesos adjudicados» (verificada: confirmada). Nieto Taborda 2021, p. 9 · F-446.
  - «Presupuesto oficial de un contrato de 2007 elaborado con la resolución de precios de la Gobernación de Boyacá de 2006» (verificada: confirmada). CE 55855, p. 10 (hechos) · F-221.
- **Vigencia a revisar:** No se verificó si la visita obligatoria sigue en la versión vigente del pliego tipo. La tesis sobre subestimación de costos es de 2012.
- **Fuentes (8):** F-114, F-163, F-192, F-221, F-428, F-441, F-446, F-538

#### PRE-16 · Precio o AIU por debajo del costo para ganar: puede tratarse como artificialmente bajo y luego no hay reajuste

- **Gravedad:** alta. Se gana un contrato que deja pérdida y no se puede reajustar.
- **Tipos de contrato:** obra, bienes, servicios
- **Descripción:** En los documentos tipo el desglose del AIU solo se le pide al adjudicatario, así que el AIU real no se revisa al evaluar; quien ofrece una administración irrisoria se expone a que la oferta se trate como precio artificialmente bajo y, si gana, a que no prospere el reclamo de equilibrio porque la oferta es parte del contrato. Desde los pliegos tipo los descuentos crecieron y se concentran en los ítems de menor peso (oferta desbalanceada): el ítem castigado se vuelve pérdida si sus cantidades crecen en obra. Cuando solo decide el precio (subasta), el proveedor arriesga ofertar por debajo de su costo y no poder cumplir. En vigilancia hay una tarifa mínima regulada; ofertar debajo se financia con aportes incompletos y expone a rechazo y sanción.
- **Causa:** Competencia por precio sin conocer el costo real; el AIU no se verifica en la evaluación; los proponentes bajan los ítems menos representativos para mover el total.
- **Consecuencia en plata:** Sobrecosto de administración asumido por el contratista sin derecho a reajuste; incumplimiento; sanciones en vigilancia.
- **Solución documentada:** Calcular la administración real y el límite propio de precio antes de ofertar; la entidad puede fijar en el formulario un AIU mínimo; validar contra la tarifa mínima del año en vigilancia; aplicar la verificación de precio artificialmente bajo con el estudio del sector.
- **Cifras:**
  - «Una administración del 5 % se calificó de irrisoria y podría tratarse como precio artificialmente bajo» (sin verificar). Video CCE «Capacitación Documentos Tipo», min 137 · F-516. Nota del verificador: Video: YouTube responde con redirección 302 a google.com/sorry (verificación antibots); sin transcripción accesible. Dejado sin verificar.
  - «En 2021 los descuentos por ítem variaron sobre todo entre 0 % y 20 %, con ítems de hasta 60 % en los menos representativos; el número promedio de proponentes bajó de 86 a 50» (verificada: confirmada). Nieto Taborda 2021, pp. 15-16 · F-446.
  - «Tarifa mínima de vigilancia: 8,8 SMMLV más un 10 % (según modalidad)» (verificada: confirmada). Calceto 2021, p. 4 · F-382.
- **Vigencia a revisar:** La respuesta de CCE sobre el AIU es de 2021 (Res. 219 de 2021); verificar en la v2 de 2026. Muestra de 11 procesos de 2021. Porcentajes de la tarifa de vigilancia de 2021.
- **Fuentes (5):** F-312, F-382, F-446, F-473, F-516

#### PRE-17 · Costos que se comen el margen y nadie presupuesta: fiducia, estampillas, IVA mal liquidado y prórrogas sin valor

- **Gravedad:** alta. Puede convertir en pérdida un contrato ganado.
- **Tipos de contrato:** obra, bienes, servicios
- **Descripción:** La Administración del AIU debe absorber impuestos, estampillas, pólizas, gastos financieros y la comisión de la fiducia del anticipo, que paga el contratista (Ley 1474 art. 91); los rendimientos del anticipo no son suyos. Si el tope de AIU de la entidad no cubre todo eso, el margen real se evapora. Las estampillas son municipales o departamentales y cambian por entidad. El IVA sobre la utilidad solo vale para construcción en sentido estricto con la utilidad separada; en mantenimiento, reparación o suministro con instalación va sobre el valor total, y un presupuesto u oferta que lo calcule sobre la U queda corto. En obra pública las prórrogas se conceden sin aumentar el valor y el tiempo extra lo paga la administración.
- **Causa:** La entidad fija el porcentaje de Administración sin costear las deducciones de su jurisdicción; confusión entre obra civil y mantenimiento; retrasos por cambios de diseño y falta de materiales.
- **Consecuencia en plata:** Utilidad real menor que la ofertada; IVA adicional y posibles sanciones; cada mes adicional cuesta administración sin pago.
- **Solución documentada:** Incluir en la Administración impuestos, estampillas, fiducia, pólizas y gastos financieros (CCE lo admite); no contar con los rendimientos del anticipo; clasificar el objeto según la Resolución DIAN 000114 de 2020 y separar la utilidad en contrato y factura; leer el cuadro de gravámenes o mirar procesos anteriores de la misma entidad; prever un colchón para prórrogas probables.
- **Cifras:**
  - «Descuentos de ley (estampillas y otros) que suman hasta el 30 % en Cali» (sin verificar). Video Asesoría en Licitaciones (yQ-HxG7snPE), min 61-62 · F-503. Nota del verificador: Video: redirección 302 a google.com/sorry; sin transcripción. Dejado sin verificar.
  - «En el ejemplo de acuerdo marco el techo se fijó suponiendo un máximo de 20 % en estampillas» (sin verificar). Video Capacítate/CCE sobre acuerdos marco, min 69-71 · F-529. Nota del verificador: Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar.
- **Vigencia a revisar:** La fiducia se documenta en un artículo de 2014; la guía de obra de 2025 es borrador para comentarios; la tesis del IVA atribuye un mínimo de AIU del 10 % que corresponde a servicios integrales, no a obra; una reforma tributaria posterior pudo cambiar tarifa o base. Que la entidad asuma la estampilla que omitió es opinión, no norma.
- **Fuentes (10):** F-006, F-097, F-311, F-320, F-353, F-401, F-449, F-503, F-529, F-578

#### PRE-18 · Interventoría y consultoría: alcance indefinido, presupuesto por porcentaje y reglas propias de puntaje y capital de trabajo

- **Gravedad:** alta. Ofertar con el presupuesto de la entidad puede dejar pérdida; un mal capital de trabajo o una mala elección de contratos cuesta el proceso.
- **Tipos de contrato:** interventoría, consultoría
- **Descripción:** El alcance del interventor varía mucho entre contratos de objeto parecido (técnico, financiero, jurídico, ambiental, social) y la ley no fija un mínimo, así que el oferente no sabe qué está costeando. No hay referencia normativa general del precio: las cifras que circulan son tarifas gremiales. La entidad presupuesta la interventoría como porcentaje de la obra con un factor multiplicador arbitrario y bajo, y la firma subestima gastos generales y carga prestacional. En el concurso de méritos el precio no da puntos (Ley 1150 art. 5 num. 4); en interventoría de transporte la experiencia pesa 67,5 de 100 y se gana con un método elegido por los centavos de la TRM, y si se subsanan todos los contratos aportados el puntaje es cero. El capital de trabajo usa una fórmula propia por meses de apalancamiento. Antes de los documentos tipo la ponderación cambiaba de entidad a entidad. CONTRADICCIÓN de cifras: una tesis afirma que una interventoría integral cuesta el 10 % del contrato principal; otro artículo cita un tope del 5 % (Decreto 777 de 1992, solo para convenios); un video atribuye a la Sociedad Colombiana de Arquitectos un rango de 2,5 % a 15 %.
- **Causa:** Ninguna norma fija alcance ni precio; estudios previos sin costeo real; el documento tipo usa fórmulas aleatorias para la experiencia.
- **Consecuencia en plata:** Pérdida de plata o baja calidad al ofertar con un presupuesto insuficiente; perder la mayor parte del puntaje por escoger mal los contratos; inhabilitación por capital de trabajo.
- **Solución documentada:** Costear por equipo y dedicación con el factor multiplicador calculado desde sus componentes legales (prestaciones, seguridad social, parafiscales) y los costos indirectos, y compararlo con las referencias gremiales; aportar completos desde la oferta los contratos que dan puntaje; aplicar la tabla de capital de trabajo de la guía; observar el presupuesto en el proyecto de pliego.
- **Cifras:**
  - «Experiencia del proponente: 67,50 puntos de 100 en interventoría de transporte» (sin verificar (no entró en la verificación de normas)). Documento tipo interventoría transporte v3, Documento Base cap. IV y num. 4.1 · F-039.
  - «La guía trae TRES fórmulas para plazo < 12 meses, por modalidad: Licitación pública y Selección Abreviada de Menor Cuantía (obra): «CTd = (POE − Anticipo o Pago anticipado) x 33%» (p. 51); Concurso de méritos (consultoría/interventoría): «x 25%» (p. 52); Mínima cuantía: «x 15%» (p. 52). Para obra civil el porcentaje es 33 %, no 25 %; el 25 % solo aplica a concurso de méritos.» (corregida (texto original: «Capital de trabajo para plazos menores de 12 meses: 25 % de (presupuesto − anticipo)»)). Guía de implementación DT transporte 2025, pp. 51-52 · F-086.
  - «Factor multiplicador de la entidad 2,2 frente a 2,01 que suman solo salarios, prestaciones, perfeccionamiento, honorarios y arriendo; cinco de seis procesos con único oferente» (sin verificar (no entró en la verificación de normas)). Flórez y García 2021 (UPB), conclusiones p. 52 · F-394.
  - «Una interventoría integral cuesta el 10 % del contrato principal (tarifa gremial)» (verificada: confirmada). Romero 2019, p. 14 · F-425.
  - «Rango de 2,5 % a 15 % atribuido a la Sociedad Colombiana de Arquitectos; un profesional de 3 millones cuesta unos 7,3 millones al mes con cargas y utilidad» (sin verificar). Video Udearroba «Contratación de la interventoría», min 10 y min 13 · F-588. Nota del verificador: Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar.
- **Vigencia a revisar:** El 10 % es tarifa gremial, no norma; el Decreto 777 de 1992 habría sido sustituido por el 092 de 2017 (sin verificar); cifras del video en pesos de 2020; muestra de Saravena de 6 procesos; datos de ponderación anteriores a los documentos tipo de interventoría; la v3 del documento tipo de transporte puede tener versión posterior en 2026.
- **Fuentes (10):** F-039, F-086, F-142, F-144, F-259, F-274, F-303, F-394, F-425, F-588

#### PRE-19 · Inhabilidades e incompatibilidades dispersas: una sin detectar en un socio o integrante tumba la oferta o el contrato

- **Gravedad:** alta. Una inhabilidad cuesta el contrato.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El régimen está repartido en la Ley 80, la Ley 1474, el Código Disciplinario y otras leyes; verificar que ni la empresa, ni sus socios, ni los integrantes del consorcio estén incursos exige revisar varias fuentes. El proyecto de CCE de 2016 que las unificaba como «prohibiciones» no se aprobó.
- **Causa:** Dispersión normativa del régimen de inhabilidades.
- **Consecuencia en plata:** Una inhabilidad no detectada en un integrante puede tumbar la oferta del consorcio o el contrato (inferencia de la ficha; sin cifra).
- **Solución documentada:** Revisar el régimen completo para la empresa, cada socio y cada integrante antes de ofertar. La fuente solo propone la unificación normativa.
- **Vigencia a revisar:** Artículo de 2017 sobre un proyecto, no una ley; Detekta registra una reforma al Estatuto en trámite (2026) que puede ser otra. No se fijan causales concretas.
- **Fuentes (1):** F-257

#### PRE-20 · Régimen especial (empresas de servicios públicos, EICE, universidades): cada entidad contrata con su propio manual

- **Gravedad:** media. Produce reprocesos y riesgo de rechazo, sin una pérdida cuantificada.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Las entidades de régimen especial solo deben respetar los principios y el régimen de inhabilidades (Ley 1150 art. 13); el procedimiento, los plazos y las causales los define cada manual, con figuras parecidas a las de la Ley 80 pero regidas por otra norma. No pueden exigir el RUP salvo que el manual lo pida: experiencia y capacidad financiera se acreditan con los documentos que el manual defina. Lo aprendido con la Ley 80 no se aplica tal cual.
- **Causa:** Sometimiento al derecho privado y a manuales propios de cada entidad.
- **Consecuencia en plata:** Quedar por fuera por un requisito propio del manual y tiempo de preparar soportes a la medida. Sin cifra.
- **Solución documentada:** Leer el manual de contratación de la entidad antes de ofertar. CCE recomienda a las entidades incorporar el RUP en sus manuales.
- **Vigencia a revisar:** La tesis es de 2014, anterior al art. 53 de la Ley 2195 de 2022; los manuales citados pudieron cambiar. La guía de régimen especial de CCE es borrador para comentarios.
- **Fuentes (3):** F-053, F-142, F-452

#### PRE-21 · Requisitos de entrada desproporcionados y costos que no se recuperan: barreras para la pyme

- **Gravedad:** media. Excluye de procesos y encarece cada oferta, pero no hace perder un contrato ya ganado.
- **Tipos de contrato:** obra, bienes, servicios
- **Descripción:** Fuera de los documentos tipo, cada entidad fija indicadores y experiencia: hubo pliegos viales municipales con capital del 200 %, experiencia de 400 % del presupuesto en 2 años o endeudamiento del 1 %, y la mayoría exigía maquinaria propia o promesa de alquiler perfeccionada antes del cierre. En acuerdos marco, la experiencia y los indicadores se fijan a la escala de la demanda nacional agregada. Inscribir el RUP, comprar la garantía de seriedad y preparar la oferta son costos que se pagan aunque no se gane y pesan más para una pyme. Colombia fija un mínimo para la garantía de seriedad pero no un techo, y exige reunir y certificar todos los soportes antes de ofertar, mientras en la UE, España y Brasil basta una declaración y los soportes se piden solo al que va a ganar.
- **Causa:** Libertad de cada entidad para fijar requisitos; requisitos iguales para todos los tamaños de empresa; diseño del sistema de habilitación previo.
- **Consecuencia en plata:** Exclusión de procesos y gasto en certificados, pólizas y cupo bancario por cada oferta, incluidas las perdidas.
- **Solución documentada:** Observar los requisitos desproporcionados; buscar consorcio; usar la rebaja de la garantía de seriedad para Mipymes que permite el Decreto 1860 si el análisis del sector lo justifica.
- **Cifras:**
  - «Pliegos con 1 contrato en los últimos 2 años de valor mayor o igual al 400 % del presupuesto» (verificada: confirmada). Serrano Guzmán et al. 2017, p. 16 · F-351.
  - «El 68 % de los pliegos revisados exigía maquinaria propia o promesa de alquiler perfeccionada» (verificada: confirmada). Serrano et al. 2017 (Revista UCN), p. 18 · F-354.
  - «AMP de SOAT: mínimo cinco contratos en el RUP por 779 SMLV y endeudamiento máximo del 86 %» (verificada: confirmada). Fernández y Tobón 2019, p. 12 · F-284.
  - «Inscribir el RUP costaba $522.000 (66,85 % de un SMMLV) en 2018» (verificada: confirmada). Bedoya y Unigarro, págs. 39-41 · F-379.
  - «Colombia está entre 13 economías que fijan un mínimo de garantía de seriedad sin techo» (sin verificar (no entró en la verificación de normas)). Banco Mundial 2017, pág. 38 del PDF · F-459.
  - «Chile: garantía de seriedad solo en compras de más de 5.000 UTM y sin exceder el 3 %» (verificada: confirmada). ChileCompra, nota del 9-dic-2024 · F-131.
  - «UE: la facturación mínima exigible no excederá el doble del valor estimado del contrato» (sin verificar (no entró en la verificación de normas)). Directiva 2014/24/UE, art. 58.3 · F-133.
- **Vigencia a revisar:** Muestra vial de 2010-2015, anterior a los documentos tipo; requisitos del AMP de SOAT de 2015; tarifas del RUP de 2018; dato del Banco Mundial de 2017.
- **Fuentes (13):** F-011, F-044, F-131, F-133, F-135, F-284, F-298, F-351, F-354, F-379, F-384, F-459, F-462

#### PRE-22 · Mipyme y empresa de mujeres: el beneficio pesa poco y se pierde por un papel vencido o un porcentaje mal armado

- **Gravedad:** media. Rara vez decide sola una adjudicación, pero puede romper un empate.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El puntaje adicional por Mipyme o empresa de mujeres es como máximo 0,25 del total y en consorcio solo cuenta si la integrante tiene al menos el 10 %; el de mujeres y el de jóvenes egresados del ICBF no se suman (Ley 2479 de 2025). El desempate por Mipyme en plurales exige a la vez al menos 25 % de participación, 25 % de la experiencia aportada y ningún vínculo con los otros integrantes. Las certificaciones de empresa de mujeres son juradas y de máximo 30 días. Pocas empresas cumplen la propiedad mayoritaria femenina. La convocatoria limitada y los beneficios de mujeres exigen un año de existencia. Los criterios diferenciales de los pliegos tipo de obra son pocos: un contrato más de experiencia e indicadores algo más flexibles; CCE descartó la garantía diferencial y no flexibiliza el capital de trabajo. CONTRADICCIÓN: la guía de CCE habla de «0.25 puntos» y la Ley 2069 (texto de 2025) de «0.25 %» del puntaje máximo, que no es lo mismo según la escala del pliego.
- **Causa:** Topes del reglamento; requisitos simultáneos y documentos de vigencia corta; estructura de propiedad de las empresas.
- **Consecuencia en plata:** Perder un contrato empatado en puntaje; una sociedad vehículo nueva no entra a la convocatoria limitada. Sin cifra en pesos.
- **Solución documentada:** Armar desde el inicio el documento de conformación y los certificados del art. 2.2.1.2.4.2.17; calendario de vencimiento de las certificaciones; consorcio con integrante Mipyme o de mujeres con 10 % o más (25 % para el desempate); presentarse con una sociedad de más de un año.
- **Cifras:**
  - «Desempate Mipyme en plural: participación de al menos 25 % y aporte mínimo del 25 % de la experiencia» (verificada: confirmada). Decreto 1860 de 2021, p. 14, num. 10.1-10.2 · F-124.
  - «Puntaje adicional máximo de 0,25 puntos del total; integrante con 10 % o más en el consorcio» (verificada: confirmada). Guía CCE para promover Mipymes, pág. 16 · F-011.
  - «Puntaje hasta el 0,25 % del puntaje máximo» (verificada: confirmada). Ley 2069 de 2020, art. 32 par. 3 (texto de la Ley 2479 de 2025) · F-116.
  - «Certificaciones juradas con fecha de máximo 30 días calendario; participación igual o superior al 10 %» (verificada: confirmada). Decreto 1860, arts. 2.2.1.2.4.2.14 par. y 2.2.1.2.4.2.15 par. 1 · F-124.
  - «Las mujeres poseen el 16 % del capital de las empresas; en más del 75 % su participación es inferior al 10 %» (verificada: confirmada). Guía CCE y ONU Mujeres 2024, pág. 8 · F-060.
  - «Las Mipymes deben acreditar como mínimo un año de existencia para la convocatoria limitada» (sin verificar (no entró en la verificación de normas)). Ley 2069, art. 34 par. 2 · F-116.
  - «Indicadores Mipyme: liquidez ≥ 1,11, endeudamiento ≤ 75 %, cobertura ≥ 0» (verificada: confirmada). Estudio CCE criterios diferenciales mínima cuantía, p. 33 · F-057.
  - «Para mujeres, un contrato adicional: máximo de seis contratos» (sin verificar (no entró en la verificación de normas)). Anexo memoria justificativa CCE 2025, p. 125 · F-051.
- **Vigencia a revisar:** El Decreto 1860 pudo no ajustarse aún a la Ley 2479 de 2025; las edades de pensión citadas pueden cambiar con la reforma pensional; los estudios de criterios diferenciales son de c. 2022 y los pliegos tipo v2 de feb-2026 pueden traer otros valores.
- **Fuentes (9):** F-011, F-051, F-055, F-056, F-057, F-060, F-065, F-116, F-124

#### PRE-23 · Los puntos de calidad pesan más y se ganan prometiendo costos que no están en el presupuesto

- **Gravedad:** media. Cambia el costo y la estrategia de puntaje, con pérdida acotada.
- **Tipos de contrato:** obra
- **Descripción:** En el nuevo documento tipo de infraestructura social la oferta económica baja de 59,5 a 48,5 puntos y la calidad sube de 19 a 30, con criterios ambientales y sociales cuyos soportes no son subsanables. Según la CCI, la versión 2 del pliego tipo de obra introdujo factores de calidad que se ganan prometiendo garantías, mantenimientos o cuadrillas adicionales por cuenta y riesgo del contratista. Lo social viene casi siempre por ley, pero lo ambiental es heterogéneo y depende de la región, lo que cambia los costos a prever (planes de manejo, residuos).
- **Causa:** Actualización de los documentos tipo; criterios ambientales a criterio de cada entidad.
- **Consecuencia en plata:** Quien solo compite por precio pierde peso; quien promete para no perder puntos asume un costo de ejecución no presupuestado.
- **Solución documentada:** Preparar desde antes los soportes de los factores de calidad; costear lo que se promete; revisar las obligaciones ambientales del pliego según la región.
- **Cifras:**
  - «Oferta económica 48,5 puntos (antes 59,5); factor de calidad 30 (antes 19)» (sin verificar (no entró en la verificación de normas)). Memoria justificativa CCE 2025, Gráfica 32, pág. 113 · F-063.
  - «Criterio Mipyme en 93 licitaciones (97,9 %); normativa ambiental en 42 pliegos (44,2 %); criterio CA.1 en el 61,3 % de los pliegos amazónicos y el 42,8 % de los andinos» (verificada: confirmada). Cruz Castellanos, págs. 66-67 impresas y Tabla 9 · F-386.
- **Vigencia a revisar:** Es una memoria justificativa: falta confirmar los pesos de la resolución definitiva. No se verificó si los tres factores de la CCI siguen en la versión vigente.
- **Fuentes (4):** F-063, F-277, F-386, F-538

#### PRE-24 · Pliegos con sanciones o requisitos que la ley no permite: se pueden observar y anular

- **Gravedad:** alta. La cláusula ilegal puede costar la adjudicación.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Hay entidades que inventan en el pliego descuentos de puntaje, por ejemplo contra proponentes o socios sancionados por la SIC, y los extienden automáticamente a todos los integrantes del consorcio. El Consejo de Estado (Sección Tercera, Subsección B, 15-jul-2026) anuló esa cláusula de la licitación USPEC-LP-002-2025 por violar la legalidad y la presunción de inocencia. Igual de ilegal es exigir una certificación de calidad (ISO) como habilitante o darle puntaje, o agregar criterios ambientales fuera de los del pliego tipo.
- **Causa:** Entidades que, para combatir la colusión o promover la sostenibilidad, crean reglas sin base legal.
- **Consecuencia en plata:** Un descuento del 10 % del puntaje puede costar la adjudicación a todo el consorcio por un solo socio.
- **Solución documentada:** Observar el pliego citando la ley; si no se corrige, demanda de nulidad simple contra el pliego (plazo de 4 meses para actos previos, CPACA art. 164.2.c).
- **Cifras:**
  - «Reducción del 10 % del puntaje obtenido, extendida automáticamente a los demás integrantes del plural» (verificada: confirmada). CE 72.599, 15-jul-2026, p. 20 · F-205.
- **Vigencia a revisar:** Fallo de subsección, no de unificación, con aclaración de voto; el caso era de suministro de alimentación (aplicarlo a obra es inferencia).
- **Fuentes (2):** F-059, F-205

#### PRE-25 · Las herramientas automáticas para leer pliegos o predecir precios omiten datos y tienen techo bajo

- **Gravedad:** media. Produce errores u omisiones que una revisión humana atrapa; la pérdida depende de que nadie revise.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La IA generalista aplicada a pliegos dice que un requisito «no está» cuando sí está, y mezcla información de pliegos anteriores del mismo chat. Los lectores automáticos de pliegos pierden buena parte de cantidades e ítems: el error típico es la omisión, no el dato inventado. La predicción del precio o del descuento con aprendizaje automático explica a lo sumo la mitad de la variación, y la variable más fuerte (número de oferentes) no se conoce antes del cierre. El software de preparación de ofertas por sí solo no se asocia con ganar más; sí la estrategia de precio y la inteligencia de mercado. Armar la oferta sigue siendo manual (cantidades digitadas, subcontratistas en Excel) y el conocimiento no se acumula. La revisión de contratos con IA está probada sobre todo en contratos estándar en inglés, sin medición de tiempo ahorrado en empresas. El porcentaje de imprevistos se fija por intuición y los modelos no se trasladan entre países.
- **Causa:** Pliegos sin formato estándar; límites de los modelos con datos numéricos y tabulares; datos públicos que capturan poco de lo que decide el precio.
- **Consecuencia en plata:** Si una cantidad se pierde y nadie revisa, el ítem queda fuera del presupuesto; si la IA niega un requisito, la oferta cae por un papel; una predicción puntual de precio expone al error.
- **Solución documentada:** Un chat nuevo por pliego, prompts por bloques y validación humana de cada requisito; combinar varias vías de extracción y deduplicar; enriquecer los datos y no fijar el precio con una predicción puntual; priorizar la inteligencia de mercado.
- **Cifras:**
  - «Extracción de cantidades: precisión 63,01, recall 41,57, F1 50,09; 202 pliegos y 2.792 productos anotados» (sin verificar (no entró en la verificación de normas)). Silva et al. 2025, Tabla 1 secc. 4.4.1 y secc. 4.1.2 · F-358.
  - «R2 de 0,403 con datos básicos y 0,510 con todos los datos; el número de oferentes pesa más del 30 %» (verificada: confirmada). Delina y Macik 2023, Tabla 5 p. 112 y p. 113 · F-278.
  - «Software de preparación: coeficiente 0,160, no significativo (0,068); el modelo explica el 47,4 % de la tasa de éxito» (verificada: confirmada). Temu et al. 2025, p. 334, Tabla 7 · F-369.
  - «Imprevistos de entre el 8 y el 14 % en obras de transporte de Florida» (verificada: confirmada). Nindartin et al. 2025, p. 875 · F-322.
  - «De 81 artículos de Scopus se filtraron 19 sobre IA en contratos de construcción» (verificada: confirmada). Soy et al. 2025, Resumen · F-362.
- **Vigencia a revisar:** El estudio de extracción es sobre pliegos brasileños de tecnología (inferir que se repite en Colombia es suposición); el de predicción es europeo; el de software, de Tanzania; el de imprevistos, de EE. UU.
- **Fuentes (9):** F-278, F-322, F-358, F-362, F-363, F-369, F-407, F-450, F-590

### 3.4 Evaluación y adjudicación (24)

#### EVA-01 · El plazo para subsanar vence con el traslado del informe, no con la adjudicación, y en mínima cuantía y subasta es aún más corto

- **Gravedad:** alta. Un día de retraso cuesta la oferta, y la garantía de seriedad no entregada no se puede subsanar.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Desde la Ley 1882 de 2018, lo que no da puntaje se entrega «hasta el término de traslado del informe de evaluación». En mínima cuantía la entidad puede fijar un término preclusivo (el documento tipo da mínimo 1 día hábil; si la invitación no lo fija, se subsana hasta que termine el traslado). En subasta el plazo es «hasta el momento previo a su realización». Sigue circulando material anterior a 2018 (videos de 2014 y de los Decretos 2474/2008, 734/2012 y 1510/2013) que dice que se subsana «en cualquier momento hasta la adjudicación»: esa regla está SUPERADA y contradice la ley vigente. La garantía de seriedad no entregada con la oferta no es subsanable. De la jurisprudencia de 2014 sigue valiendo que, si el requisito es subsanable y la entidad no lo pide, hay nulidad. En SECOP II la respuesta va por «Mensajes» del proceso, no por correo.
- **Causa:** Plazos cortos que fija cada entidad (sobre todo en mínima cuantía), excepciones de ley para mínima cuantía y subasta, y doctrina vieja que sigue en línea sin aviso de que la norma cambió.
- **Consecuencia en plata:** Oferta rechazada y costo de prepararla perdido. Si falta la garantía de seriedad, no hay subsanación posible. En mínima cuantía la entidad pasa a la siguiente oferta de menor precio. Las fuentes no dan cifra en pesos.
- **Solución documentada:** Leer en la invitación o el pliego el término de subsanación. En subasta, entregar los habilitantes completos antes del evento. En mínima cuantía, vigilar el SECOP a diario. Responder por «Mensajes» en SECOP II y confirmar el recibo. No guiarse por material anterior a 2018.
- **Cifras:**
  - «Plazo general: hasta el término de traslado del informe de evaluación (salvo mínima cuantía y subasta)» (sin verificar (no entró en la verificación de normas)). Ley 1882 de 2018, art. 5, par. 1 · F-110.
  - «En subasta, los documentos deben pedirse «hasta el momento previo a su realización»» (sin verificar (no entró en la verificación de normas)). Ley 1150 de 2007, art. 5, par. 4 · F-142.
  - «Mínima cuantía: término para subsanar de mínimo 1 día hábil, so pena de rechazo» (sin verificar (no entró en la verificación de normas)). Resolución 464 de 2024 (documento tipo de mínima cuantía) · F-096.
  - «En mínima cuantía «muchas veces tenemos el mismo día [...] o al día siguiente» para subsanar» (sin verificar (no entró en la verificación de normas)). video Asesoría en Licitaciones, min 3:37-4:09 · F-503.
- **Vigencia a revisar:** Los videos de 2014 se apoyan en la Ley 1150 antes de la Ley 1882 y en el Decreto 1510 de 2013: su regla «hasta la adjudicación» está superada. La reforma al Estatuto en trámite podría volver a mover el plazo.
- **Fuentes (10):** F-070, F-074, F-089, F-096, F-110, F-142, F-503, F-534, F-535, F-561

#### EVA-02 · En el traslado del informe hay que observar a los demás y subsanar lo propio en el mismo plazo, y las observaciones ajenas llegan el último día

- **Gravedad:** media. Comprime el trabajo y puede costar la oferta si se descuida, pero el plazo se conoce de antemano.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El mismo plazo corto del traslado sirve para dos cosas: subsanar la propia oferta y observar las ofertas ajenas. Las observaciones de los competidores suelen llegar el último día hábil, cuando ya no queda tiempo para responderlas. La tesis cita 5 días en licitación, 3 en selección abreviada y 1 en mínima cuantía.
- **Causa:** La Ley 1882 de 2018 llevó la subsanación dentro del traslado del informe, que es corto.
- **Consecuencia en plata:** Si no se subsana a tiempo, se pierde el proceso. Sin cifra en la fuente.
- **Solución documentada:** La tesis propone separar por ley la etapa de observaciones de la de subsanación. Mientras tanto, preparar la subsanación desde el día en que sale el informe, sin esperar las observaciones ajenas.
- **Cifras:**
  - «Plazo para subsanar: 5 días en licitación, 3 en selección abreviada y 1 en mínima cuantía» (verificada: confirmada). Mesa (2023), pp. 43-49 · F-410.
- **Vigencia a revisar:** Los plazos salen de la tesis. Deben verificarse contra el Decreto 1082 y los documentos tipo vigentes en 2026.
- **Fuentes (1):** F-410

#### EVA-03 · Se pierde la oferta por confundir el requisito (debe existir al cierre) con su prueba (se puede subsanar), en las dos direcciones

- **Gravedad:** alta. Cuesta la adjudicación o un litigio de años.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Hay dos errores gemelos. En el primero, el proponente intenta subsanar con hechos ocurridos DESPUÉS del cierre: un RUP en firme después, un contrato terminado después o un certificado sobre hechos posteriores. La Ley 1882 lo prohíbe. En el segundo, la entidad rechaza documentos que sí eran subsanables. Por ejemplo, trata la falta de autorización de la junta al representante legal como si fuera falta de capacidad: la capacidad no se subsana, las facultades del representante sí. También pasa con causales de rechazo «de plano» que eliminan la subsanación de habilitantes; el Consejo de Estado las declaró ineficaces (CE 67378, 2026). CONTRADICCIÓN ENTRE FUENTES: el Consejo de Estado en 2014 (rad. 25804) admitía subsanar requisitos cumplidos «antes o después» de la oferta, y esa regla la desplazó la Ley 1882 de 2018. En 2026 (CE 72107) reitera: el requisito debe existir al cierre y su prueba puede llegar después. Según un video de CCE, los documentos que más se mandan a subsanar son las certificaciones de experiencia, la constitución del consorcio o UT, firmas de alguien distinto al representante que figura en la Cámara de Comercio y antecedentes de la persona equivocada. En derecho comparado (UE, Brasil, Chile) la regla general es pedir que se complete o aclare, con el límite de que sean hechos ya existentes.
- **Causa:** Manuales y contratistas que siguen la regla vieja, errores de armado de la oferta y pliegos con causales de rechazo que impiden subsanar.
- **Consecuencia en plata:** Se pierde un contrato que se podía ganar, o empieza un litigio largo. En CE 60644 la entidad terminó pagando la utilidad esperada. En CE 67378 (Barranquilla) se declaró ineficaz la causal, pero se negó la utilidad por falta de prueba.
- **Solución documentada:** Cumplir materialmente al cierre y subsanar solo la PRUEBA de un hecho anterior al cierre, hasta el traslado del informe. Contra una causal que impide subsanar un habilitante, invocar el art. 24.5 de la Ley 80 (ineficacia de pleno derecho) y el par. 1 del art. 5 de la Ley 1150. Pedir la subsanación del documento de autorización del representante.
- **Cifras:**
  - ««los proponentes no podrán acreditar circunstancias ocurridas con posterioridad al cierre del proceso»» (sin verificar (no entró en la verificación de normas)). Ley 1882 de 2018, art. 5 · F-110.
  - «La capacidad del proponente es insubsanable; las restricciones al representante legal son subsanables» (sin verificar (no entró en la verificación de normas)). CE 60644, p. 25 · F-189.
  - «Chile: inhabilidad si el proveedor entrega antecedentes falsos y no los corrige en 10 días» (verificada: confirmada). página «Registro de Proveedores» de ChileCompra · F-132.
- **Vigencia a revisar:** CE 25804 (2014) aplica la Ley 1150 antes de la Ley 1882: su regla «hasta la adjudicación» y «antes o después» está desplazada. En CE 67378 el proceso era anterior a la Ley 1882; la ineficacia de la causal se mantiene, pero hoy el plazo es el traslado.
- **Fuentes (14):** F-044, F-047, F-050, F-078, F-110, F-114, F-132, F-133, F-142, F-179, F-189, F-216, F-217, F-523

#### EVA-04 · Lo que no se subsana: el habilitante que también da puntaje y la oferta económica

- **Gravedad:** alta. Un error en el precio o en un documento puntuable es definitivo y cuesta la oferta o la adjudicación.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Si un mismo documento acredita un habilitante y además alimenta un factor de puntaje (por ejemplo, las tarjetas de operación de vehículos), no se puede subsanar aunque parezca solo habilitante. Sobre la oferta económica solo se aclaran dudas formales: una «aclaración» que mejora el puntaje lleva a la nulidad de la adjudicación (Sentencia 00677 de 2019, citada por Derectum). En mínima cuantía, como el precio es el único factor, la oferta económica no se subsana, y una aclaración que mejore la oferta lleva al rechazo.
- **Causa:** Documentos con doble función en el pliego, y la regla de que el precio no se modifica después del cierre.
- **Consecuencia en plata:** El oferente que cuenta con subsanar queda rechazado. Quien gana con una aclaración indebida arriesga perder el contrato en litigio: en la Sentencia 00677 de 2019 se anuló la adjudicación, y en la 65134 de 2022 (Pereira) se anuló un acto por dejar subsanar un habilitante puntuable. Sin cifra en pesos.
- **Solución documentada:** Cruzar cada habilitante con los factores de puntaje; si coinciden, el documento va completo desde el inicio. Revisar dos veces el valor y el formulario de precios, porque no hay segunda oportunidad.
- **Vigencia a revisar:** El manual de mínima cuantía cita el Decreto 1082 modificado por el 1860 de 2021; si el procedimiento cambió después, hay que verificarlo.
- **Fuentes (2):** F-089, F-266

#### EVA-05 · RUP al cierre: las fuentes no coinciden sobre si la inscripción debe estar en firme, y algunas entidades leen mal la fecha de renovación

- **Gravedad:** alta. Puede costar la oferta en el filtro habilitante, con un criterio distinto según la entidad.
- **Tipos de contrato:** todos los tipos
- **Descripción:** CONTRADICCIÓN ABIERTA. El Consejo de Estado (sentencia 60796 de 2021) dijo que la ley exige la inscripción en el RUP y no su firmeza, y anuló un pliego que la pedía. Colombia Compra Eficiente (C-328/2022, C-353/2024, C-1874/2025) sigue exigiendo que la inscripción nueva esté en firme antes del cierre. El acto queda en firme 10 días hábiles después de publicado. Según el criterio que siga la entidad, una oferta válida queda rechazada o una inválida queda habilitada, y no se encontró sentencia de unificación. Problema hermano: el certificado muestra la fecha en que la Cámara de Comercio aprobó la renovación, no la de la solicitud, y algunas entidades concluyen que no se renovó antes del quinto día hábil de abril. Según CCE, lo que cuenta es haber PEDIDO la renovación a tiempo; mientras tanto vale la información anterior en firme.
- **Causa:** El plazo legal de firmeza es de 10 días hábiles, la jurisdicción y la Agencia tienen criterios opuestos, y los certificados muestran la fecha de aprobación y no la de solicitud.
- **Consecuencia en plata:** Se pierde la oferta (preparación y garantía), o se gana una nulidad sin plata: en la sentencia 60796 se anuló la adjudicación sin indemnización porque no se probó que la oferta habría ganado.
- **Solución documentada:** Inscribirse o renovar con más de 10 días hábiles de margen antes del cierre y guardar la constancia de radicación ante la Cámara. Si el pliego exige firmeza, observarlo citando la sentencia 60796 de 2021. Si la entidad rechaza por la fecha de renovación, citar C-1874 y C-353.
- **Cifras:**
  - «El acto de inscripción queda en firme 10 días hábiles después de publicado» (verificada: confirmada). Ley 1150 de 2007, art. 6.3 · F-142.
  - ««la inscripción debe estar en firme antes del cierre»» (sin verificar (no entró en la verificación de normas)). Concepto C-353 de 2024 · F-079.
- **Vigencia a revisar:** La sentencia 60796 aplicó el Decreto 1510 de 2013 a un proceso de 2015. Los conceptos de CCE de 2022 a 2026 mantienen la tesis contraria. No se encontró sentencia de unificación: la cuestión sigue abierta (inferencia).
- **Fuentes (5):** F-072, F-077, F-079, F-142, F-199

#### EVA-06 · Rechazo por no tener en el RUP el código UNSPSC del objeto, aunque la experiencia inscrita sí cumpla

- **Gravedad:** media. Cuesta una oferta, pero se puede reclamar con conceptos de CCE.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La entidad confunde la clasificación del proponente (lo que ofrece) con la experiencia inscrita. Según CCE (C-881/2022), la clasificación no es habilitante y no se puede excluir a nadie por ella; solo se verifica que la experiencia corresponda a la exigida. En la práctica hay entidades que rechazan igual: una practicante cuenta que la descalificaron por no tener uno de tres códigos, y la observación al informe no prosperó. La postura de CCE en ese relato no se verificó en fuente primaria dentro de esa ficha.
- **Causa:** Criterio dispar entre entidades sobre clasificación y experiencia en el RUP.
- **Consecuencia en plata:** Oferta rechazada sin fundamento; en el caso narrado, la proponente quedó fuera de la subasta. Sin cifra.
- **Solución documentada:** Observar el informe citando C-881/2022 y la Circular Externa Única. La practicante recomienda no presentarse si no se cumplen experiencia o indicadores, porque en la práctica no se subsana.
- **Cifras:**
  - «El pliego pedía tres códigos, la proponente tenía dos y fue descalificada» (sin verificar (no entró en la verificación de normas)). video Asesoría en Licitaciones, min 14:51-15:26 · F-503.
- **Vigencia a revisar:** La postura de CCE en el relato del video es afirmación de la practicante; hay que verificarla en la fuente primaria antes de usarla.
- **Fuentes (4):** F-047, F-084, F-092, F-503

#### EVA-07 · El comité evaluador exige cargas que el pliego no pedía o resuelve a su criterio lo que el pliego no reguló

- **Gravedad:** media. Se puede reclamar dentro del proceso; cuesta reproceso y, si no prospera, la oferta.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Son interpretaciones extensivas del comité: pedir documentos que el RUP ya prueba, exigir la clasificación a cada integrante de la unión temporal sin que el pliego lo diga, o desconfiar de la experiencia porque no cuadra con los estados financieros. El Consejo de Estado (CE 55342, 27-abr-2026) dijo que no se puede exigir por vía interpretativa lo que el pliego no estableció. Caso hermano: indicadores financieros con denominador cero (por ejemplo, la cobertura de intereses de una empresa sin deuda). Si el pliego no trae regla, la habilitación queda a criterio del evaluador, y puede caer justo la empresa sana.
- **Causa:** Pliegos sin regla para casos borde y comités que llenan los vacíos por interpretación.
- **Consecuencia en plata:** Inhabilitación indebida que se pelea en el traslado o en la vía judicial. Sin cifra.
- **Solución documentada:** Observar el informe citando que el RUP es plena prueba (art. 6 de la Ley 1150) y que el pliego no admite cargas adicionales por interpretación. Explicar que el valor del contrato y los estados financieros obedecen a la causación contable. Pedir en la etapa de observaciones que el pliego fije la regla del denominador cero; el manual de CCE sugiere habilitar a quien no tiene obligaciones financieras.
- **Fuentes (2):** F-047, F-218

#### EVA-08 · Oferta artificialmente baja: a partir de cierto descuento la entidad pide explicación y, si el precio no se sostiene, rechaza

- **Gravedad:** alta. Puede costar una adjudicación ganada por precio o dejar un contrato a pérdida, y toca directamente el porcentaje de baja que fija el usuario.
- **Tipos de contrato:** obra, interventoría, consultoría, bienes, servicios
- **Descripción:** La guía de CCE (CCE-EICP-GI-27, v01 del 16-dic-2024) manda pedir aclaración a las ofertas que estén un 20 % o más por debajo del costo total estimado cuando hay menos de 5 ofertas (comparación absoluta). Con 5 o más sugiere la comparación relativa con un valor mínimo aceptable. El rechazo es obligatorio si la baja se explica por un ítem omitido, un error aritmético, otra unidad de medida o una especificación que no cumple. En el documento tipo de obra v4, el requerimiento se hace después de abrir el sobre 2 y antes de fijar el método, y quien no responde por escrito queda rechazado. En subasta se analiza el último lance, al final del evento. En mínima cuantía la entidad explica su método antes de aceptar la oferta. La entidad no puede rechazar sin requerir antes (C-429/2020, citado en la guía GI-12), y la aclaración no permite modificar la oferta. El Consejo de Estado (CE 73.079, 16-jun-2026) dijo: «no resulta equiparable un precio bajo a un precio artificialmente bajo». DUDAS Y CONTRADICCIONES: (1) El 20 % está en una guía, no en ley ni decreto; la entidad «puede fijar un valor mínimo aceptable distinto», y el pliego del proceso prevalece. (2) La fórmula exacta del valor mínimo aceptable está en una imagen del PDF que nadie pudo extraer. La versión «mediana (o promedio) menos una desviación estándar» viene de un buscador y del concepto C-299, no del cuerpo de la guía: SIN VERIFICAR. (3) Un practicante creía que había un hueco con exactamente 5 ofertas; la guía lo cierra (5 o más = relativa). (4) C-299 se basa en la versión anterior de la guía, y las ofertas por encima del presupuesto pueden excluirse del cálculo según ese concepto.
- **Causa:** El proponente baja el precio para ganar en la fórmula sin un APU que lo sostenga, o comete errores de formulario. La entidad tiene autonomía para elegir método y umbral.
- **Consecuencia en plata:** Si la explicación no convence, se rechaza la oferta ganadora. Si se acepta y el precio no alcanza, se ejecuta a pérdida. Una practicante dice haber visto subastas de 300 millones cerrar en 170 (dato de video, sin ubicación).
- **Solución documentada:** Tener listo antes de la audiencia el sustento de costos: APU, cotizaciones, estructura del AIU, costo marginal, cercanía a fuentes de materiales y economías de escala. El proponente puede pedir que se requiera a un competidor sospechoso. La entidad debe dar «tiempo suficiente» y explicar en la resolución de adjudicación el método que usó. Si el lance de subasta parece estratégico, CCE recomienda informar a la SIC.
- **Cifras:**
  - «Aclaración obligatoria si la oferta es 20 % o más inferior al costo total estimado» (verificada: confirmada). Guía CCE-EICP-GI-27, p. 10 · F-454.
  - «Comparación absoluta con menos de 5 ofertas; relativa sugerida con 5 o más» (sin verificar (no entró en la verificación de normas)). Guía CCE-EICP-GI-27, pp. 9-10 · F-454.
  - «En subasta, la solicitud de explicación se hace al finalizar el evento» (sin verificar (no entró en la verificación de normas)). Guía CCE-EICP-GI-27, p. 16 · F-454.
  - «El requerimiento se hace después de abrir el sobre 2 y antes de determinar el método» (sin verificar (no entró en la verificación de normas)). Resolución 465 de 2024, documento base v4, num. 4.1.3 · F-034.
- **Vigencia a revisar:** La guía no es norma y cada entidad puede fijar otro umbral. La fórmula del valor mínimo aceptable está en una imagen y no se extrajo. C-299 de 2022 se basa en la versión anterior de la guía; manda la v01 del 16-dic-2024. No se verificó si los documentos tipo de obra traen una regla propia que sustituya la guía.
- **Fuentes (10):** F-034, F-050, F-076, F-083, F-085, F-091, F-096, F-182, F-454, F-503

#### EVA-09 · En mínima cuantía gana el menor precio sin más, y la oferta seria compite contra precios con los que no se puede ejecutar

- **Gravedad:** media. Pérdida acotada de ofertas en procesos pequeños.
- **Tipos de contrato:** bienes, servicios, obra, consultoría
- **Descripción:** El precio es el único factor, y la entidad revisa los habilitantes en orden de precio: si el más barato no cumple, pasa al segundo. Por eso aparecen propuestas artificialmente bajas y de baja calidad. A esto se suman un estudio de mercado débil, pólizas bajas o inexistentes y pocos proveedores en los municipios pequeños. Cinco de los ocho entrevistados piden ajustar la modalidad, no eliminarla. La muestra es sobre todo de bienes; la autora la extiende a obra, servicios y consultoría.
- **Causa:** La regla de adjudicar al menor precio que cumpla, estudios de mercado débiles y garantías bajas.
- **Consecuencia en plata:** Una oferta sostenible pierde contra precios no sostenibles; quien gana con un precio bajo arriesga su margen, y la entidad termina volviendo a contratar. Sin cifra.
- **Solución documentada:** Los entrevistados piden permitir otros criterios de evaluación y especificaciones técnicas más precisas. El proponente puede apoyarse en la solicitud de explicación por oferta artificialmente baja (ver EVA-08).
- **Vigencia a revisar:** Hay 3 URLs pero solo 2 documentos: el artículo de Guzmán-Hernández aparece en PDF y en HTML.
- **Fuentes (3):** F-295, F-296, F-341

#### EVA-10 · El método de ponderación del precio cambió con la versión 4 del documento tipo de transporte, y la guía vieja sigue publicada

- **Gravedad:** alta. Un método mal simulado mueve el porcentaje de baja y puede costar la adjudicación.
- **Tipos de contrato:** obra
- **Descripción:** En la versión 2, la TRM se tomaba del día en que se abría el sobre 2. En la versión 4 (Resolución 465 de 2024) se toma la del día hábil siguiente, o la del segundo día si el pronunciamiento es después de las 3:00 p. m., y solo cuentan las ofertas habilitadas. La guía GI-12 de CCE todavía describe la regla anterior. Rangos de centavos de la TRM: 0.00-0.24, mediana con valor absoluto; 0.25-0.49, media geométrica; 0.50-0.74, media aritmética baja; 0.75-0.99, menor valor. Se usan 7 decimales, el puntaje negativo vale 0, hay que verificar que el día no sea festivo en EE. UU., en lotes los métodos rotan en orden ascendente, y con una sola oferta habilitada se puede prescindir de la TRM.
- **Causa:** Cambio de versión del pliego tipo y guías antiguas aún publicadas.
- **Consecuencia en plata:** Simular el precio con el método o el universo de ofertas equivocado lleva a elegir mal el porcentaje de baja. La fuente no da cifra.
- **Solución documentada:** Simular con la regla v4: TRM del día hábil siguiente al pronunciamiento (verificando festivos en EE. UU.) y solo con las ofertas habilitadas.
- **Cifras:**
  - «Si el pronunciamiento es hasta las 3:00 p. m., se toma la TRM del día hábil siguiente» (sin verificar (no entró en la verificación de normas)). Documento base v4, num. 4.1.3-4.1.4 (pág. 46 del PDF) · F-034.
  - «Versión anterior: la TRM «que rija para el día en el que abre el segundo sobre»» (sin verificar (no entró en la verificación de normas)). Guía GI-12, pág. 32 · F-050.
- **Vigencia a revisar:** La regla de la guía GI-12 corresponde a la versión 2 (Resolución 240 de 2020, derogada por la Resolución 465 de 2024). No se verificó si los pliegos tipo de otros sectores (agua, social) tienen reglas distintas.
- **Fuentes (4):** F-034, F-050, F-083, F-110

#### EVA-11 · Ofertar un AIU mayor que el del presupuesto oficial, o unitarios por encima de los del formulario, es causal de rechazo

- **Gravedad:** alta. Un error de formulario provoca el rechazo de la oferta completa.
- **Tipos de contrato:** obra
- **Descripción:** En los documentos tipo, el AIU de la entidad es el techo. Hay confusión sobre si el precio unitario del presupuesto viene con o sin AIU: la entidad publica unitarios sin AIU y suma el AIU al final, y el proponente que le suma el AIU a cada unitario queda por encima del techo unitario. El APU no se entrega con la oferta.
- **Causa:** Formularios de presupuesto que separan los unitarios del AIU, y una lectura equivocada del proponente.
- **Consecuencia en plata:** Rechazo de la oferta entera. La fuente no da cifra.
- **Solución documentada:** Según CCE, la entidad debe decir qué porcentaje usó en cada componente del AIU, y el interesado debe ensayar el Formulario 1 en la etapa de proyecto de pliego y presentar observaciones.
- **Cifras:**
  - «El AIU de la entidad es el «valor tope o techo de referencia»» (sin verificar (no entró en la verificación de normas)). Guía GI-12, p. 15 · F-050.
  - «Sumarle el AIU al precio unitario puede caer en causales de rechazo» (sin verificar (no entró en la verificación de normas)). Guía GI-12, pregunta 8, pp. 24-25 · F-050.
- **Vigencia a revisar:** La guía es de 2024 y se refiere a las versiones de documentos tipo de entonces. Hay documentos tipo v2 de feb-2026: hay que confirmar que la regla del techo de AIU sigue igual.
- **Fuentes (1):** F-050

#### EVA-12 · Si la entidad adjudica mal, revoca la adjudicación o declara desierto sin causal, solo queda el juez: tarda años y se recupera poco

- **Gravedad:** alta. Se pierde un contrato ya ganado, y la reparación es lenta y se limita a la utilidad.
- **Tipos de contrato:** todos los tipos
- **Descripción:** No hay recurso administrativo ágil ni un órgano externo que suspenda el proceso. Contra la adjudicación solo cabe nulidad y restablecimiento ante el juez; contra la declaratoria de desierta, reposición. La adjudicación es irrevocable (solo cede por inhabilidad sobreviniente o medios ilegales) y la desierta es reglada (CE 60644). Aun así, hay entidades que revocan o declaran desierto para corregir sus propios errores. Las causales de desierta del pliego tipo son 4. Si se gana el pleito, la jurisprudencia de 2011 (CE 20811) reconoce solo la utilidad (U) de la propia oferta, indexada con el IPC, y no la A ni la I. Las fuentes no coinciden en la duración: la tesis de Maldonado dice «un mínimo de 2 años» y la OCDE (2016) habla de hasta 15 años. No se verificó si una sentencia de unificación posterior cambió la forma de cuantificar.
- **Causa:** El sistema no prevé apelación ni suspensión administrativa, y hay entidades que desconocen la irrevocabilidad de la adjudicación.
- **Consecuencia en plata:** Se pierde el contrato y hay que litigar años. Lo recuperable tiene como techo el porcentaje de U declarado en la oferta. En CE 60644 la entidad terminó pagando la utilidad esperada.
- **Solución documentada:** Contra la desierta, reposición; contra la adjudicación, nulidad y restablecimiento. Declarar la U de forma explícita y realista en la oferta, porque es la base de la indemnización. Maldonado propone un ente externo que pueda suspender el proceso y revisar la evaluación.
- **Cifras:**
  - «El proceso judicial tarda «un mínimo de 2 años en adelante»» (sin verificar (no entró en la verificación de normas)). Maldonado (2022), §1.2.1.1.4, pp. 27-28 · F-406.
  - «La decisión de adjudicación no se puede impugnar por queja administrativa» (sin verificar (no entró en la verificación de normas)). OCDE 2016, PDF pág. 93 · F-473.
  - «A título de restablecimiento solo se reconoce la utilidad, indexada» (sin verificar (no entró en la verificación de normas)). CE 20811 (2011), consideraciones sobre AIU · F-202.
- **Vigencia a revisar:** La descripción de recursos de la OCDE es de 2016. CE 20811 es de 2011, y no se verificó si una sentencia de unificación posterior cambió la forma de cuantificar al proponente no adjudicado.
- **Fuentes (7):** F-034, F-142, F-165, F-189, F-202, F-406, F-473

#### EVA-13 · Oferentes coordinados (colusión): rotación, ofertas de resguardo, reparto de zonas y subastas sin pujas

- **Gravedad:** alta. Hace perder procesos de forma sistemática y distorsiona el precio de referencia del que depende la oferta.
- **Tipos de contrato:** obra, servicios, bienes
- **Descripción:** El oferente honesto compite contra un bloque coordinado. Señales documentadas: mismo contador o revisor fiscal; pólizas del mismo intermediario y de la misma fecha; redacción o tipografía parecida, con los mismos errores; ofertas apenas por encima de la ganadora; mismo ganador recurrente; ausencia de un postor habitual; empresas de un mismo grupo económico que se presentan por separado; subcontratación del perdedor. También el reparto de zonas o lotes (en el PAE de Bogotá solo el 38,52 % de las zonas tuvo más de una propuesta) y las subastas donde los habilitados no pujan (de 14 habilitados, solo uno hizo un lance válido). La vía administrativa de la SIC y el control fiscal resultan más eficaces que la penal, que solo llega al 3 % de decisiones de fondo según Monroy y Mendoza. Las fuentes no coinciden en el sobrecosto: 10-20 % (OCDE, citada por Díaz) frente a 20-25 %, y hasta 40-50 %, según la cifra general que cita San Miguel-Giralt.
- **Causa:** Pocos oferentes, barreras de entrada, consorcios fáciles de armar, licitaciones frecuentes y predecibles, y poca detección.
- **Consecuencia en plata:** Al contratista honesto le inflan el precio de referencia, lo excluyen del reparto o pierde lo que gastó en preparar la oferta. Multas de la SIC en infraestructura: Grupo Nule $15.687 M y $13.072 M (2013), Pavigas y otros $5.927 M (2014); cartel del PAE: $28.434 M.
- **Solución documentada:** Denunciar ante la SIC con evidencia (programa de delación y guía de la SIC de 2013 con señales de alerta) y usar los indicios en las observaciones al informe. Para el coludido: multa de hasta 100.000 SMMLV o 150 % de la utilidad y, por vía penal (art. 410A del Código Penal), prisión de 6 a 12 años e inhabilidad de 8 años.
- **Cifras:**
  - «Grupo Nule, colusión para acordar términos en licitación y definir un ganador: $15.687 millones» (sin verificar (no entró en la verificación de normas)). Flórez y Gómez (2017), Tabla 1, p. 225 · F-287.
  - «Solo en el 38,52 % de las zonas se presentó más de una propuesta (PAE Bogotá, 2007-2017)» (verificada: confirmada). comunicado de la SIC · F-161.
  - «De catorce proponentes habilitados, solo uno realizó un lance válido en el primer lance» (sin verificar (no entró en la verificación de normas)). Ramírez Rusinque (2014), p. 233 · F-331.
- **Vigencia a revisar:** Las multas son de 2008-2016 y el artículo de Ramírez es de 2014. El art. 410A y el régimen de delación pudieron cambiar con la Ley 2195 de 2022 y la C-080 de 2025; Detekta documenta una inhabilidad de 20 años por colusión que no se verificó aquí.
- **Fuentes (9):** F-108, F-109, F-161, F-287, F-289, F-318, F-331, F-346, F-391

#### EVA-14 · Pocos llegan a la evaluación de precio: los requisitos habilitantes dejan procesos con un solo habilitado

- **Gravedad:** media. Cuesta lo invertido en cada oferta perdida; es un patrón del mercado, no un error puntual del proponente.
- **Tipos de contrato:** obra
- **Descripción:** La competencia real es mucho menor de lo que sugiere la modalidad. Según Fedesarrollo (datos de 2010-2015), solo el 20,4 % de los procesos de obra empezaba con más de un oferente, y de esos el 32 % terminaba con un solo habilitado. En las licitaciones de gobernaciones se perdió entre la presentación y la habilitación el 27 % de los proponentes en 2018 y el 38 % en 2019. En obra vial municipal, los requisitos financieros no guardaban relación con el monto: capital de trabajo hasta del 200 %, endeudamiento de 1 % o menos, maquinaria propia. Hay casos denunciados de descalificación masiva con un evaluador coordinado con un oferente. Además, los indicadores habilitantes no predicen si el contratista termina a tiempo y sin sobrecostos (muestra de 56 contratos). Los documentos tipo, declarados exequibles en la C-119/2020, buscan corregirlo. Los datos son anteriores a ellos y no sirven como cifra actual.
- **Causa:** Requisitos habilitantes hechos a la medida o discrecionales, y evaluaciones sesgadas.
- **Consecuencia en plata:** Se pierde entero el costo de preparar la oferta (y la garantía de seriedad) sin llegar a la evaluación de precio. Con un solo habilitado, la entidad paga sin presión de precio.
- **Solución documentada:** Usar los documentos tipo obligatorios y presentar observaciones al pliego comparando sus indicadores con los del pliego tipo. Observar el informe de evaluación y denunciar cuando haya indicios de direccionamiento.
- **Cifras:**
  - «20,4 % de los procesos con más de un oferente al inicio; 32 % de ellos termina con un solo habilitado» (verificada: confirmada). Fedesarrollo TE 166, pág. 11 · F-468.
  - «2018: 2.871 proponentes en 124 procesos y 2.084 habilitados (27 % deshabilitados); 2019: 443 presentados y 272 habilitados (38 %)» (verificada: confirmada). SCI, Informe de contratación 2019, vol. I, p. 48 · F-490.
  - «Contrato de 14 mil millones: un solo consorcio habilitado y 61 competidores descalificados» (sin verificar (no entró en la verificación de normas)). video NoticiasUno, ~0:30-1:01 · F-574.
- **Vigencia a revisar:** Los datos de Fedesarrollo son de 2010-2015 y los de la SCI de 2018-2019 (solo gobernaciones; no es claro si los 124 procesos son todas las licitaciones o solo vías). La muestra de indicadores es pequeña (56 contratos). Todo es anterior a los documentos tipo.
- **Fuentes (11):** F-059, F-244, F-336, F-352, F-445, F-461, F-468, F-485, F-490, F-573, F-574

#### EVA-15 · Un competidor con documentos falsos o inhabilitado gana porque la entidad no verifica contra la fuente

- **Gravedad:** media. Cuesta la adjudicación, pero se puede detectar y observar si se revisa.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El RUP certifica lo que reporta el proponente y lo que verifica la Cámara de Comercio, pero no detecta información falsa sobre finanzas o experiencia. En el caso de Centros Poblados (servicios TIC), los funcionarios revisaron los documentos en diez minutos, y la aseguradora nunca había expedido la póliza. En mínima cuantía, donde no se exige RUP, hay entidades que no consultan los antecedentes en la Procuraduría y la Contraloría o delegan esa verificación en terceros. CCE no conserva datos como la IP desde donde se envía la oferta, que servirían para detectar colusión. Contradicción: Ríos et al. proponen exigir el RUP en mínima cuantía, lo que choca con el art. 6 de la Ley 1150.
- **Causa:** La revisión se hace de buena fe y en minutos, sin interoperabilidad con las aseguradoras ni auditoría de fondo del RUP.
- **Consecuencia en plata:** El oferente honesto pierde la adjudicación. En el caso documentado, el Estado perdió un anticipo de 70.243 millones (cifra del video, sin minuto exacto).
- **Solución documentada:** Revisar en SECOP los documentos del competidor y verificar su legitimidad ante quien los emite (banco o aseguradora); observar el informe con soportes. El manual de CCE de 2024 indica pedir una declaración de no estar incurso en inhabilidades y consultar los sistemas de la Procuraduría y la Contraloría.
- **Cifras:**
  - «Los funcionarios revisaron los documentos «En diez minutos»» (sin verificar (no entró en la verificación de normas)). pódcast CCE «Eficientes contra la corrupción», episodio 1, min 15 · F-514.
- **Vigencia a revisar:** El procedimiento de verificación en mínima cuantía cambió con el manual de CCE de 2024.
- **Fuentes (6):** F-089, F-301, F-342, F-514, F-521, F-524

#### EVA-16 · Una obra inconclusa o una multa del último año restan puntaje en futuras licitaciones, y al consorcio también por uno de sus integrantes

- **Gravedad:** alta. Unos puntos menos por un antecedente pueden costar adjudicaciones futuras una y otra vez.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** La Ley 2020 de 2020 creó el Registro Nacional de Obras Civiles Inconclusas. Una obra queda anotada un año después de vencido el término para liquidar, y esa anotación pesa en el puntaje de calidad de futuras licitaciones de obra e interventoría. En el documento tipo de interventoría de transporte se restan 2 puntos por cualquier multa o cláusula penal del último año, sin importar la cuantía (art. 58 de la Ley 2195 de 2022), y 1 punto por anotación en el registro. Ambos descuentos alcanzan al consorcio por uno de sus integrantes. Que aplique a otras modalidades es una inferencia de la ficha.
- **Causa:** Art. 6 de la Ley 2020 de 2020 y art. 58 de la Ley 2195 de 2022, incorporados a los documentos tipo.
- **Consecuencia en plata:** Hasta 3 puntos menos en concursos que se deciden por décimas (en experiencia se cuentan hasta 7 decimales). No cuantificado en pesos.
- **Solución documentada:** El descuento por multas no aplica si el acto que la impuso está demandado. Escoger socios sin multas en los últimos 12 meses. Si la causa de la obra inconclusa no es imputable al contratista, un comité técnico de la entidad lo define (art. 2), y las controversias sobre el reporte las resuelve la entidad contratante (art. 6).
- **Cifras:**
  - «Una obra es inconclusa «un (1) año después de vencido el término de liquidación contractual»» (sin verificar (no entró en la verificación de normas)). Ley 2020 de 2020, art. 2 · F-111.
  - «Menos 2 puntos por multas o cláusulas penales del último año y menos 1 punto por obra inconclusa» (sin verificar (no entró en la verificación de normas)). Documento tipo de interventoría de transporte v3, Documento Base, cap. IV · F-039.
- **Vigencia a revisar:** El art. 6 de la Ley 2020 remite al lit. a del art. 5 de la Ley 1150; no se verificó si los documentos tipo de obra (no solo los de interventoría) incorporan este registro.
- **Fuentes (2):** F-039, F-111

#### EVA-17 · Desde 2026 la entidad verifica también las listas de inhabilitados de la banca multilateral y las sentencias de responsabilidad civil reportadas al RUP

- **Gravedad:** alta. La inhabilidad de un socio tumba la oferta completa.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El Decreto 0997 de 2026 (arts. 3 y 11, que modifican el Decreto 1082) añade dos verificaciones: la responsabilidad civil contractual declarada en sentencia y reportada al RUP, y las listas de inhabilitación del Banco Mundial, el BID, el BAsD, el BAfD y el BERD. Según el concepto C-1292 de 2026, la consulta unificada que debe habilitar la Secretaría de Transparencia aún no existe.
- **Causa:** Decreto 0997 de 2026.
- **Consecuencia en plata:** Si un socio figura en una de esas listas o tiene una sentencia reportada, la oferta queda inhabilitada. Sin cifra.
- **Solución documentada:** Consultar las listas del BM, el BID, el BAsD, el BAfD y el BERD para cada integrante del consorcio antes de ofertar.
- **Vigencia a revisar:** El decreto es de 2026 y el texto del decreto no se abrió (solo el concepto); la consulta unificada aún no existe.
- **Fuentes (1):** F-020

#### EVA-18 · El cronograma de SECOP II no reemplaza al pliego, y las adendas de cronograma pueden llegar después del cierre

- **Gravedad:** media. Un plazo perdido puede costar la subsanación, pero se previene vigilando el proceso.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Hay entidades que configuran el cronograma solo en la plataforma, sin incluirlo en el pliego, y otras que mueven etapas después del cierre. Según CCE (C-1195 de 2026), las adendas de cronograma pueden expedirse después del cierre y antes de la adjudicación, pero solo para etapas no vencidas y con justificación. Se publican con 3 días hábiles de anticipación en licitación y 1 en las demás modalidades, los documentos externos se cargan en 3 días, y las observaciones al informe se responden antes de adjudicar.
- **Causa:** Entidades que confunden publicar en la plataforma con incluir el contenido en el documento.
- **Consecuencia en plata:** El proponente que solo mira el formulario puede perder plazos (traslado del informe, subsanación). Sin cifra.
- **Solución documentada:** Revisar a diario las adendas y el cronograma del proceso, no solo el formulario de SECOP II, y reclamar si una adenda mueve una etapa ya vencida.
- **Cifras:**
  - «Después del cierre, las adendas de cronograma solo pueden mover etapas aún no vencidas» (sin verificar (no entró en la verificación de normas)). Concepto C-1195 de 2026 · F-015.
- **Fuentes (1):** F-015

#### EVA-19 · Desempate: las reglas de la Ley 2069 tienen condiciones finas, cambiaron en 2025 y sigue circulando la regla vieja de «el primero en el tiempo»

- **Gravedad:** media. Solo decide en empates, pero en esos casos define quién gana.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El art. 35 de la Ley 2069 de 2020 fija factores de desempate que se aplican en orden, uno tras otro. Algunos exigen al consorcio que la Mipyme tenga al menos el 25 % de participación, aporte al menos el 25 % de la experiencia y no tenga vínculos societarios con los demás integrantes; otro exige probar que el 25 % de los pagos a proveedores del año anterior fueron a Mipymes. La Ley 2479 de 2025 añadió un numeral 12 (jóvenes egresados del sistema de protección del ICBF) y pasó el sorteo al numeral 13. El Decreto 1860 y los pliegos tipo anteriores no lo reflejan, y no se sabe si CCE ya los actualizó. En video sigue circulando que «en mínima cuantía gana quien presentó primero». CONTRADICCIÓN: el art. 35 manda factores sucesivos para todo proceso con recursos públicos; que desplace la regla del primero en el tiempo en mínima cuantía es una inferencia de la ficha, porque el reglamento no se abrió.
- **Causa:** Una lista cerrada de factores en orden, cada uno con su propia forma de acreditarse, y reformas recientes.
- **Consecuencia en plata:** En un empate, el consorcio que no armó bien los porcentajes, o que se guía por la lista vieja, pierde. Sin cifra.
- **Solución documentada:** Diseñar el consorcio con los porcentajes de participación y experiencia que pide el factor buscado, preparar las certificaciones de pagos a Mipymes y verificar si el pliego ya incorporó el numeral 12.
- **Cifras:**
  - «Al menos el 25 % de los pagos a Mipymes, o una Mipyme con al menos el 25 % de participación que aporte al menos el 25 % de la experiencia acreditada» (verificada: confirmada). Ley 2069 de 2020, art. 35, num. 10 · F-116.
- **Vigencia a revisar:** No se abrió la Ley 2479 de 2025 ni su reglamentación; los textos vienen de las notas de vigencia del Senado. El video de mínima cuantía es de 2020.
- **Fuentes (4):** F-011, F-060, F-116, F-580

#### EVA-20 · El puntaje Mipyme y de mujeres vale hasta el 0,25 % del total y cambia de lugar si la convocatoria quedó limitada

- **Gravedad:** baja. Son fracciones de punto que solo pesan en procesos muy reñidos.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Con el Decreto 1860 de 2021, el puntaje adicional es de hasta el 0,25 % del total y no aplica en mínima cuantía ni en subasta. En el proponente plural basta con un integrante Mipyme que tenga el 10 % o más. En el pliego tipo de infraestructura social (2025), si la convocatoria quedó limitada a Mipymes, ese puntaje se traslada al factor de experiencia. Contradicción de forma: la guía de CCE (p. 15) dice «0.25 puntos» y el decreto dice «0.25 % del total de los puntos»; solo coinciden si el pliego vale 100 puntos.
- **Causa:** El Decreto 1860 de 2021 y las notas de los pliegos tipo sobre convocatorias limitadas.
- **Consecuencia en plata:** 0,25 puntos sobre 100 definen procesos reñidos; si se calcula mal quién los obtiene, cambia el orden de elegibilidad. Sin cifra en pesos.
- **Solución documentada:** Leer en el pliego la tabla de ponderación y la nota sobre convocatorias limitadas, y asegurar que un integrante Mipyme tenga al menos el 10 %.
- **Cifras:**
  - «El puntaje no puede superar el 0,25 % del total» (sin verificar (no entró en la verificación de normas)). Decreto 1860 de 2021, art. 2.2.1.2.4.2.18 · F-124.
  - «En convocatorias limitadas a Mipyme ese puntaje se traslada al factor de experiencia» (sin verificar (no entró en la verificación de normas)). Anexo CCE 2025, p. 126 · F-051.
- **Vigencia a revisar:** La Ley 2479 de 2025 modificó el art. 32 de la Ley 2069 (puntaje para mujeres o jóvenes del ICBF, hasta el 0,25 % del puntaje máximo); no se sabe si los pliegos tipo ya lo reflejan.
- **Fuentes (3):** F-011, F-051, F-124

#### EVA-21 · Subasta inversa: la oferta inicial puede quedar como final, el único proponente debe dar un descuento y una caída de conexión saca de la puja

- **Gravedad:** media. Puede costar la adjudicación en bienes y servicios; no aplica a obra.
- **Tipos de contrato:** bienes, servicios
- **Descripción:** Si nadie hace lances, se adjudica al precio inicial más bajo, y no pujar no es causal de rechazo salvo que el pliego lo diga literalmente (C-733 de 2022). Por eso, quien guarda su mejor precio para la puja puede perder. Con un solo proponente, este queda obligado a dar un descuento mínimo que la entidad calcula para cada proceso (columna de la RICG, sin fecha y sin el artículo exacto del decreto). Si la conexión se cae por culpa del oferente, se le tiene por retirado; si la falla es de la entidad, la subasta se suspende. Un lance que toma el primer lugar en el último minuto abre 2 minutos extra y obliga a decidir el piso en segundos.
- **Causa:** Las reglas del Decreto 1082 (num. 7 del art. 2.2.1.2.1.2.2 y fallas técnicas, según las fuentes) y la mecánica de SECOP II.
- **Consecuencia en plata:** Se puede perder la subasta por guardar precio o por fallas de internet, ceder un descuento no previsto o bajar por debajo del costo bajo presión. Según la RICG, en una entidad el descuento del único proponente sumó cerca de USD 370.000 de ahorro (sin ubicación precisa).
- **Solución documentada:** Fijar el precio piso antes de la audiencia y tratar la oferta inicial como posible oferta final. Leer en el pliego el rango de descuento obligatorio. Tener una conexión de respaldo.
- **Cifras:**
  - «Sin lances, se adjudica al oferente con el precio inicial más bajo; no pujar no implica rechazo» (sin verificar (no entró en la verificación de normas)). Concepto C-733 de 2022, p. 7 · F-082.
  - «Un lance en el último minuto extiende la subasta dos minutos» (sin verificar (no entró en la verificación de normas)). video Gobernación de Antioquia, min 8-10 · F-559.
- **Vigencia a revisar:** El concepto C-733 se abrió en el sitio de un despacho de abogados; conviene cotejarlo con la relatoría oficial. La columna de la RICG no tiene fecha ni cita el artículo exacto. Los artículos del Decreto 1082 sobre fallas los cita el pódcast; el decreto no se abrió.
- **Fuentes (5):** F-082, F-180, F-462, F-510, F-559

#### EVA-22 · Bolsa de productos: si un solo precio unitario supera el máximo de la ficha, la operación ganada se anula

- **Gravedad:** media. Se pierde una operación concreta; está fuera del ámbito de obra.
- **Tipos de contrato:** bienes
- **Descripción:** El proveedor solo entra por medio de un comisionista vendedor y debe constituir garantías a favor de la cámara de compensación. Si alguno de los precios unitarios supera el máximo de la ficha técnica de negociación, la operación se anula y pasa al segundo.
- **Causa:** El reglamento de la Bolsa Mercantil y los arts. 2.2.1.2.1.2.11 a 19 del Decreto 1082 de 2015.
- **Consecuencia en plata:** Se pierde la operación ganada; además hay costos de comisión y de garantías que las fuentes no cuantifican.
- **Solución documentada:** Verificar cada precio unitario contra el máximo de la ficha. La entidad debe hacer un estudio comparativo de costos frente a la subasta o al acuerdo marco (C-278).
- **Cifras:**
  - «Si algún precio unitario supera el máximo, la operación será anulada» (sin verificar (no entró en la verificación de normas)). ICBF P24.ABS (2024), p. 9 · F-137.
- **Fuentes (2):** F-075, F-137

#### EVA-23 · Concurso de méritos: se gana en calidad y se pierde al final por el precio, o se queda fuera por sorteo en la precalificación

- **Gravedad:** alta. Un error en el formulario de precio hace perder una adjudicación ya ganada en calidad.
- **Tipos de contrato:** consultoría, interventoría
- **Descripción:** La oferta económica se revisa al final. Si excede el presupuesto o no es coherente con el alcance, la entidad pasa al segundo lugar o declara desierto el proceso. El documento tipo de interventoría además rechaza la oferta que omite la operación con el factor multiplicador o que tiene un precio artificialmente bajo. En la precalificación, si hay más habilitados que el máximo fijado, la lista se arma por sorteo, y solo hay 2 días hábiles para comentar el informe. DUDA: un buscador afirmó que el Decreto 399 de 2021 eliminó la revisión de la oferta con el primer lugar, pero el texto compilado de la relatoría de CCE todavía la contiene; no se pudo confirmar.
- **Causa:** El art. 2.2.1.2.1.3.2 del Decreto 1082 y las reglas de precalificación con número máximo de precalificados.
- **Consecuencia en plata:** Se pierde la adjudicación después de ganar en calidad, o se queda fuera sin competir. No cuantificado.
- **Solución documentada:** Ofertar dentro del rango del valor estimado, aplicar bien el factor multiplicador en el Formulario 1 y firmarlo (SECOP I). Observar el informe de precalificación dentro de los 2 días hábiles.
- **Cifras:**
  - «Comentarios al informe de precalificación durante los dos días hábiles siguientes; sorteo para conformar la lista» (sin verificar). video Fondo Rotatorio de la Policía, min 2-3 · F-557. Nota del verificador: Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar; la regla legal (Decreto 1082, precalificación en concurso de méritos) no se abrió en esta pasada.
- **Vigencia a revisar:** Falta verificar en el Decreto 399 de 2021 si se eliminó la revisión con el primer lugar. El video sobre el sorteo no cita el número del decreto: hay que verificarlo contra el Decreto 1082 vigente y los documentos tipo de consultoría.
- **Fuentes (3):** F-039, F-123, F-557

#### EVA-24 · El descuento ganador depende del número de competidores: cada oferente adicional baja el valor adjudicado entre 0,58 % y 1,33 %

- **Gravedad:** media. Afecta el porcentaje de baja, y con él la posibilidad de ganar o la utilidad, pero es una tendencia estadística y no una regla.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Con más oferentes, el precio adjudicado se aleja más del presupuesto oficial. Los adjudicatarios de otra ciudad enfrentan más presión competitiva, y en licitación y selección abreviada las entidades nacionales resultaron más competitivas que las territoriales. Los propios autores dicen que los resultados en licitación y selección abreviada son «menos robustos».
- **Causa:** La competencia de precios.
- **Consecuencia en plata:** Ofertar con el porcentaje de un proceso de 3 oferentes en uno de 20 hace perder el proceso; en el caso inverso se pierde utilidad.
- **Solución documentada:** Estimar el coeficiente de adjudicación según el número de competidores, la modalidad y el orden de la entidad.
- **Cifras:**
  - «Un competidor adicional reduce en 0,58 % el coeficiente de adjudicación; el rango va de 0,58 % a 1,33 %» (verificada: confirmada). Beltrán y Arenas (2020), PDF p. 23 y reseña p. 1 · F-381.
- **Vigencia a revisar:** La muestra excluye algunas modalidades y cita el art. 81 del Decreto 1510 de 2013, hoy compilado en el Decreto 1082 de 2015.
- **Fuentes (1):** F-381

### 3.5 Firma y garantías (18)

#### FIR-01 · Firmar el acta de «apropiación de diseños» sin objetar: el contratista se vuelve dueño de los errores del diseño de la entidad

- **Gravedad:** alta. Hace perder toda reclamación por sobrecostos de diseño en contratos a precio global; en el caso, más de mil millones.
- **Tipos de contrato:** obra
- **Descripción:** Algunos pliegos (caso IDU) obligan al contratista a revisar, ajustar y hacer suyos los estudios y diseños de la entidad mediante un acta de apropiación que firma con la interventoría en la etapa de preconstrucción. Si esa acta se firma sin reparos de fondo, el Consejo de Estado entiende que el contratista aceptó la responsabilidad total de la obra y le niega compensaciones por inviabilidad de los diseños. En el caso, el contrato combinaba precio global (espacio público) y precios unitarios (redes), y el contratista solo anotó detalles menores (diámetro de pozos, cajas de inspección).
- **Causa:** El pliego traslada al contratista la responsabilidad por los diseños de la entidad a través del acta de apropiación («se apropiará de los estudios y diseños y los tomará como suyos», párr. 149).
- **Consecuencia en plata:** Se niega toda compensación adicional al precio global por inviabilidad de los diseños. La demanda reclamaba $1.033.426.627 por sobrecostos y en ese punto no prosperó.
- **Solución documentada:** Antes de firmar el acta de apropiación, revisar los diseños y dejar por escrito en la propia acta las objeciones de viabilidad de fondo, no solo detalles menores. Si el pliego trae la cláusula, valorar ese riesgo en el precio o no presentarse.
- **Cifras:**
  - «Sobrecostos reclamados y negados por inviabilidad de diseños: $1.033.426.627» (sin verificar (no entró en la verificación de normas)). párr. 6 de la extracción de la sentencia (exp. 69.090, 30-ene-2026) · F-228.
- **Fuentes (1):** F-228

#### FIR-02 · Firmar un contrato que desde el inicio no se puede ejecutar (sin predios, sin diseños o con plazo imposible): el juez lo anula y hay que devolver el anticipo

- **Gravedad:** alta. Puede costar el contrato entero (nulidad absoluta), la restitución del anticipo y quedarse sin pago por lo ejecutado.
- **Tipos de contrato:** obra
- **Descripción:** Cuando la entidad contrata sin predios adquiridos, sin estudios suficientes, dependiendo de decisiones de terceros o con plazos irreales, el Consejo de Estado ha declarado de oficio la nulidad absoluta por objeto ilícito (art. 44 num. 2 Ley 80) por violación del deber de planeación. El criterio: situaciones que desde la celebración muestran que el objeto no podrá ejecutarse, que depende de circunstancias inciertas o que los tiempos no podrán cumplirse (exp. 51.489 de 2015; exp. 27315 de 2013). CONTRADICCIÓN: Rúa et al. reportan una tesis contraria (Gil Botero; tutelas de las Secciones Cuarta y Quinta de 2014), así que la consecuencia no es uniforme. Que el contratista solo recupere restituciones y no la utilidad es inferencia de quien fichó el problema, no dato de la fuente.
- **Causa:** La entidad contrata sin tener los terrenos ni haber iniciado su adquisición, sin estudios previos suficientes o con un plazo que hace evidente que la obra no podrá ejecutarse.
- **Consecuencia en plata:** En el caso 27315, el contratista tenía un reconocimiento a su favor en primera instancia y terminó condenado a devolver el anticipo de $11.367.829,75, actualizado a $25.612.786,87. Las fuentes no cuantifican en general lo que pierde el contratista.
- **Solución documentada:** Exigir antes de firmar la disponibilidad predial, las licencias y los diseños documentados, y no firmar el acta de inicio sin predios (conducta prudente inferida). Los autores proponen divulgar la planeación antes de contratar y una modificación normativa.
- **Cifras:**
  - «Anticipo a restituir de $11.367.829,75, actualizado a la fecha del fallo a $25.612.786,87 (caso CE 27315)» (sin verificar (no entró en la verificación de normas)). Rúa Flechas et al. (2019), p. 111 · F-343.
- **Vigencia a revisar:** Hay tesis jurisprudencial contraria (tutelas de 2014); la nulidad de oficio no es criterio unánime.
- **Fuentes (4):** F-226, F-319, F-343, F-344

#### FIR-03 · Ganar y no firmar (o no entregar la póliza de cumplimiento): se pierde la garantía de seriedad y llega una inhabilidad de 5 años

- **Gravedad:** alta. Cuesta la garantía de seriedad y una inhabilidad de 5 años.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Si el adjudicatario no firma el contrato o no constituye la garantía de cumplimiento sin justa causa, la entidad hace efectiva la garantía de seriedad a título de sanción (Ley 80 art. 30.12), puede cobrar los perjuicios no cubiertos y opera la inhabilidad del art. 8.1.e de la Ley 80. El Consejo de Estado (exp. 70.067, 2025, subasta inversa de bienes) dejó claro que un lance mal calculado, o no haber leído los precios unitarios de referencia del pliego, NO es justa causa: los defectos del pliego se atacan con observaciones o demandando a tiempo, no al momento de firmar. El exp. 69.292 (2026) precisa que hacer efectiva la seriedad es una sanción y no puede imponerse de plano: exige debido proceso. Las dos fichas del mismo fallo difieren en un detalle: una habla de un lance mínimo del 3 % y otra de un descuento del 6 % que lanzó el adjudicatario. La CCE añade que si el ganador de una subasta alega error humano, la entidad puede repetir la subasta sin él.
- **Causa:** El adjudicatario descubre tarde un error de precio, no leyó las bases del pliego, se queda sin cupo de afianzamiento o el consorcio se rompe tras adjudicar. La adjudicación es irrevocable y el pliego que nadie demandó queda en firme.
- **Consecuencia en plata:** Pérdida del valor de la garantía de seriedad, cobro de perjuicios no cubiertos, inhabilidad de 5 años para contratar con el Estado y, en el caso 70.067, condena en costas.
- **Solución documentada:** Verificar con la aseguradora el cupo para la póliza de cumplimiento ANTES de ofertar. Leer los precios de referencia y presentar observaciones al pliego, como experto, en la etapa precontractual. Si de verdad no puede firmar, acreditar la justa causa dentro del procedimiento y exigir el debido proceso.
- **Cifras:**
  - «Inhabilidad de 5 años impuesta al adjudicatario que no firmó» (sin verificar (no entró en la verificación de normas)). CE 5-may-2025, rad. 70.067, párr. 56 · F-180.
- **Fuentes (5):** F-036, F-114, F-180, F-214, F-454

#### FIR-04 · Descubrir al firmar que el precio no da (presupuesto oficial mal calculado u oferta sin costear): firmar a pérdida o arriesgar la seriedad

- **Gravedad:** alta. Lleva a ejecutar el contrato completo a pérdida o a perder la garantía de seriedad.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El proponente llega a la firma y advierte que los precios unitarios del presupuesto oficial están por debajo del mercado, o que la oferta la armó otra persona sin costear estampillas, retenciones, anticipo y obligaciones adicionales. Según la jurisprudencia citada por IUSTA (sentencia del 11-feb-2009, rad. 16653), el contratista puede firmar pidiendo la revisión del precio unitario a valores de mercado, o desistir. CONTRADICCIÓN: la jurisprudencia más reciente (CE 70.067 de 2025, ver FIR-03) dice que un error de precio que debió advertirse en el pliego no es justa causa para no firmar, y negarse expone a sanción y a que se haga efectiva la póliza de seriedad.
- **Causa:** Análisis de mercado deficiente de la entidad, con errores de precio en el pliego, o costeo propio hecho después de presentar la oferta, o nunca.
- **Consecuencia en plata:** Si firma con precios por debajo del mercado, la pérdida corre por cuenta del contratista; si no firma, arriesga la póliza de seriedad. Las fuentes no dan cifra.
- **Solución documentada:** Costear antes de presentar, con estampillas, retenciones y el anticipo con su póliza. Si el error es del presupuesto oficial, advertirlo en las observaciones al pliego y, al firmar, pedir por escrito la revisión del precio unitario a valores de mercado.
- **Vigencia a revisar:** La salida de «firmar pidiendo revisión del precio» se apoya en un fallo de 2009; el CE 70.067 de 2025 es más estricto con el error propio.
- **Fuentes (2):** F-317, F-503

#### FIR-05 · No ampliar las pólizas en cada prórroga, adición o suspensión ni prever los 5 años de estabilidad de obra

- **Gravedad:** alta. Puede terminar en incumplimiento, multa y retención de pagos o de la liquidación.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Las garantías deben estar vigentes durante toda la ejecución e incluso en la liquidación. Cada modificación, prórroga o adición obliga a ajustar la garantía y a pasar otra vez por la aprobación en SECOP II. La estabilidad de obra rige mínimo 5 años desde el recibo a satisfacción (menos, solo con justificación técnica de un experto, nunca por cuantía). El amparo de salarios se cuenta desde que termina el plazo del contrato, no desde la liquidación (C-1493/2025, según la guía preliminar de CCE). Los defectos conocidos al entregar se reclaman como incumplimiento, no por estabilidad.
- **Causa:** No se amplían los amparos al modificar el plazo o el valor, y no se revisa el estado real de las garantías al llegar a la liquidación.
- **Consecuencia en plata:** Prima adicional no presupuestada; pagos o liquidación bloqueados hasta que se apruebe la póliza; posible incumplimiento y multa; responsabilidad por defectos que aparezcan durante los 5 años siguientes al recibo. Las fuentes no dan cifra.
- **Solución documentada:** Llevar un calendario de garantías ligado a cada modificatorio, presupuestar la prima de estabilidad a 5 años y entregar la obra sin defectos conocidos.
- **Cifras:**
  - «Estabilidad de obra: vigencia mínima de 5 años desde el recibo a satisfacción» (sin verificar (no entró en la verificación de normas)). Guía CCE de garantías, versión preliminar 2026, p. 46 · F-087.
- **Vigencia a revisar:** La guía CCE 2026 citada es versión preliminar.
- **Fuentes (4):** F-087, F-114, F-531, F-558

#### FIR-06 · El interventor carga su póliza años después de terminar: cumplimiento y calidad hasta el fin de la estabilidad de la obra que vigiló

- **Gravedad:** media. Costo de prima y cupo inmovilizado durante años; la multa diaria solo aparece si no se restablece la garantía.
- **Tipos de contrato:** interventoría
- **Descripción:** Por el parágrafo del art. 85 de la Ley 1474, la garantía de cumplimiento de la interventoría debe durar lo mismo que la garantía de estabilidad del contrato vigilado (regla general: no menos de 5 años, salvo justificación técnica, Decreto 399 de 2021). El documento tipo de interventoría de transporte (v3) exige además que el amparo de calidad del servicio dure lo mismo que la estabilidad, y que el interventor amplíe sus garantías en cada adición, suspensión o prórroga; no restablecerlas es causal de incumplimiento y de multa diaria. La interventoría se prorroga cada vez que se prorroga la obra y puede adicionarse por encima del 50 % (no aplica el parágrafo del art. 40 de la Ley 80).
- **Causa:** El art. 85 de la Ley 1474, recogido en el documento tipo: la interventoría va atada al plazo y a la estabilidad del contrato que vigila.
- **Consecuencia en plata:** Prima y cupo de afianzamiento comprometidos durante años después de cobrar; costos de personal que crecen con cada prórroga de la obra; multa diaria si no se restablece la garantía. Las fuentes no dan cifra.
- **Solución documentada:** Presupuestar la póliza de cumplimiento y la de calidad por todo el plazo de estabilidad de la obra vigilada, más el costo de ampliar las pólizas en cada modificación. La ley permite dividir la garantía por etapas o riesgos (Ley 1150, art. 7) y ajustar el valor de la interventoría sin el tope del 50 %.
- **Cifras:**
  - «Garantía de estabilidad vigente por un término no inferior a 5 años» (sin verificar (no entró en la verificación de normas)). Decreto 399 de 2021, art. 3, p. 4 · F-125.
  - «Adiciones de interventoría que muchas veces superan el 50 % del contrato» (sin verificar). Charlas de Contratación Estatal, módulo 7, min 8 · F-512. Nota del verificador: Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar.
- **Fuentes (5):** F-039, F-114, F-125, F-144, F-512

#### FIR-07 · Interventoría: el puntaje del personal clave se gana con un compromiso, pero los soportes se piden después de firmar y su falta trae multa

- **Gravedad:** media. Multa acotada y posible demora del inicio; solo pasa a incumplimiento si no se atiende el requerimiento.
- **Tipos de contrato:** interventoría
- **Descripción:** En el documento tipo de interventoría de transporte v3, el puntaje por experiencia adicional del personal clave se otorga con solo diligenciar el Formato 9. Los soportes no se revisan en la evaluación sino en la etapa de control de la ejecución (num. 9.1), y la minuta trae multa por no entregarlos a tiempo. El pliego permite que la entidad exija esa verificación como requisito para iniciar.
- **Causa:** El documento tipo pasa la verificación de los soportes del equipo a la ejecución, y la minuta (Anexo 5) fija una multa diaria.
- **Consecuencia en plata:** Multa diaria por no entregar a tiempo los soportes académicos y de experiencia del equipo (el porcentaje lo fija la entidad); posible incumplimiento si no se atiende el requerimiento del supervisor.
- **Solución documentada:** Tener los profesionales comprometidos y sus certificados listos antes de ofertar.
- **Fuentes (1):** F-039

#### FIR-08 · Póliza falsa o no verificable en línea: la entidad la rechaza y se cae la adjudicación o el inicio

- **Gravedad:** alta. Puede costar la adjudicación o la garantía.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Tras el antecedente de Centros Poblados, las Circulares Conjuntas 001 y 002 de 2021 (CCE y Superfinanciera) obligan a las entidades a verificar las garantías en línea antes de aprobarlas o rechazarlas, y a las aseguradoras a emitirlas como documento electrónico con firma digital y QR, hash o CUFE, y un punto de contacto. El Consejo de Estado negó la demanda contra esas circulares (exp. 72.223, 15-may-2026).
- **Causa:** Fraude documental en garantías y documentos sin mecanismo de verificación.
- **Consecuencia en plata:** Rechazo de la garantía de seriedad o de cumplimiento, pérdida de la adjudicación o demora en el acta de inicio. Sin cifra.
- **Solución documentada:** Comprar la póliza a una aseguradora vigilada que la emita con código verificable (QR, hash o CUFE), comprobarla en línea antes de cargarla y guardar la constancia de la verificación.
- **Fuentes (1):** F-187

#### FIR-09 · SECOP II: la garantía queda como «garantía bancaria» por defecto o en «borrador», y la entidad nunca la ve

- **Gravedad:** baja. Se corrige en minutos si se detecta; solo retrasa el inicio.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Al cargar la póliza del contrato en SECOP II, la plataforma trae por defecto el tipo «garantía bancaria», y si no se pulsa «publicar» el documento queda en estado borrador y la entidad no lo ve.
- **Causa:** Valores por defecto de la plataforma y un último paso («publicar») que no es evidente.
- **Consecuencia en plata:** La entidad no puede aprobar la garantía, lo que retrasa el inicio y con él los pagos (inferencia de quien fichó el problema). Sin cifra.
- **Solución documentada:** Cambiar el tipo a «contrato de seguro», verificar que valor y vigencia coincidan con el pliego y con la póliza física, y pulsar «publicar» hasta ver el estado «pendiente».
- **Fuentes (1):** F-542

#### FIR-10 · Arrancar obra sin registro presupuestal, garantía aprobada y acta de inicio: lo hecho queda como «hecho cumplido» que no se paga

- **Gravedad:** alta. Puede perderse todo lo ejecutado antes del inicio formal, y sin seguro.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Para ejecutar se requieren la garantía aprobada y la disponibilidad presupuestal (Ley 80, art. 41 inc. 2, modificado por la Ley 1150, art. 23). Si el contratista arranca antes, por presión de la entidad o porque confunde perfeccionamiento con legalización, lo ejecutado queda como hecho cumplido que la entidad no puede pagar directamente, y la póliza no responde por los siniestros. Según el panel de Contratación En Línea, la protección judicial de las obras hechas por fuera del contrato es casi nula, salvo tres excepciones (urgencia, seguridad pública y similares).
- **Causa:** Presión de la entidad para arrancar antes de cumplir los requisitos de ejecución; confusión entre perfeccionamiento y legalización; obras ejecutadas por fuera del contrato.
- **Consecuencia en plata:** Trabajo ejecutado sin pago directo (queda para conciliación o un pleito de resultado incierto) y siniestros sin cobertura. Sin cifra.
- **Solución documentada:** No iniciar sin verificar registro presupuestal, garantía aprobada, acta de inicio y supervisor designado.
- **Fuentes (3):** F-114, F-536, F-550

#### FIR-11 · El «anticipo» de los estudios previos llega a la minuta como «pago anticipado» y con otro porcentaje: sin soportes, toca devolverlo con rendimientos

- **Gravedad:** alta. Terminó en incumplimiento total, cláusula penal y reclamación a las garantías por miles de millones.
- **Tipos de contrato:** obra
- **Descripción:** Entre los estudios previos y el contrato firmado, la forma de pago puede cambiar sin justificación. En el caso narrado del MADR (contrato 685 de 2023), el anticipo del 15 % subió al 35 % y en la minuta apareció como pago anticipado. El pago anticipado no exige patrimonio autónomo ni amortización, pero la entidad igual puede exigir que se justifique en qué se invirtió. Como el contratista no entregó soportes contables, financieros ni bancarios, se declaró el incumplimiento total. Las cifras vienen de la auditoría narrada en un video, no del acto administrativo.
- **Causa:** Cambios en la minuta frente a los estudios previos, sin justificación, y falta de soportes del uso del dinero.
- **Consecuencia en plata:** Cláusula penal, devolución del dinero, traslado de rendimientos y reclamación a las garantías (cifras del caso en el campo cifras).
- **Solución documentada:** Antes de firmar, comparar la forma de pago de los estudios previos con la de la minuta. Llevar soportes contables y bancarios del uso del anticipo o del pago anticipado.
- **Cifras:**
  - «Anticipo del 15 % en estudios previos que subió al 35 % y se firmó como pago anticipado» (sin verificar). video pI4wKtJYJy0, min 2 · F-575. Nota del verificador: Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar.
  - «Cláusula penal de 7.143 millones, devolución de 12.493 millones, 1.911 millones en rendimientos y 19.637 millones reclamados a las garantías» (sin verificar (no entró en la verificación de normas)). video pI4wKtJYJy0, min 6 · F-575.
  - «35,86 % desembolsado y el plazo venció con 7,5 % de obra» (sin verificar). título del video pI4wKtJYJy0 · F-575. Nota del verificador: Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry); ni el título se pudo leer. Dejado sin verificar.
- **Fuentes (2):** F-114, F-575

#### FIR-12 · Mínima cuantía: la aceptación de la oferta ES el contrato; lo que la oferta no fijó (pago, anticipo, legalización) después no se puede reclamar

- **Gravedad:** alta. Puede dejar sin pago lo ejecutado porque ningún documento fija las condiciones.
- **Tipos de contrato:** todos los tipos
- **Descripción:** En mínima cuantía no hay minuta: la oferta y la comunicación de aceptación constituyen el contrato (Manual de mínima cuantía de CCE, sección 5). Si la invitación y la oferta no fijan la forma de pago, el anticipo y sus condiciones, o los requisitos de «legalización», después no hay documento que los respalde. En el caso de Ciénaga (CE 64399, 2021), el juez solo declaró que el contrato existía y negó todo lo demás porque no se probaron las condiciones del anticipo. Ojo: ese contrato era de calamidad pública, bajo derecho privado, así que trasladarlo a la mínima cuantía es una analogía de quien fichó el problema.
- **Causa:** La oferta más la comunicación de aceptación forman el contrato sin minuta, y la invitación queda incompleta.
- **Consecuencia en plata:** En el caso de Ciénaga se negaron todas las pretensiones económicas del contratista (más de 4.800 millones según la ficha, sin ubicación), salvo la declaración de que el contrato existía.
- **Solución documentada:** Antes de ofertar, pedir en una observación que la invitación fije la forma de pago, el anticipo y las garantías; guardar la aceptación con sus condiciones.
- **Fuentes (3):** F-089, F-142, F-203

#### FIR-13 · Póliza de responsabilidad civil extracontractual con el mínimo del Decreto 1082: los daños por encima del límite salen del bolsillo del contratista

- **Gravedad:** alta. Un siniestro grande con cobertura insuficiente puede costar patrimonio sin techo.
- **Tipos de contrato:** obra
- **Descripción:** Los funcionarios suelen exigir solo los amparos y límites mínimos del Decreto 1082, que según los aseguradores (webinar de Fasecolda) se quedan muy cortos. Además, el contratista principal responde solidariamente por sus subcontratistas.
- **Causa:** Las entidades se ciñen al mínimo reglamentario y el contratista no asegura más.
- **Consecuencia en plata:** Los daños a terceros por encima del límite asegurado se pagan con el patrimonio del contratista. Sin cifra general.
- **Solución documentada:** No quedarse con el mínimo exigido: contratar amparos complementarios de responsabilidad civil extracontractual con límites acordes al riesgo real, incluidos los de los subcontratistas.
- **Fuentes (1):** F-556

#### FIR-14 · Mercado de seguros de cumplimiento estrecho: primas más caras y menos cupo, y podría empeorar si suben los porcentajes asegurados

- **Gravedad:** media. Encarece la prima y limita a cuántos procesos puede presentarse; no hace perder un contrato ya firmado.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El ramo de cumplimiento perdió dinero entre 2017 y 2020, y la Contraloría ha planteado subir el amparo de cumplimiento a entre 70 % y 90 %. En el panel de Fasecolda, reaseguradores y aseguradores advierten que los estados financieros de los afianzados no aguantan esa presión. Es una advertencia del gremio asegurador, no una norma vigente.
- **Causa:** Las pérdidas del ramo y la propuesta de la Contraloría de subir el porcentaje del amparo de cumplimiento.
- **Consecuencia en plata:** Primas más altas y menos cupo de afianzamiento para el contratista (la ficha menciona casi +50 % en primas entre 2020 y 2021 en el agregado del ramo, sin ubicación precisa).
- **Solución documentada:** Las fuentes no documentan ninguna para el contratista; en la práctica, verificar el cupo con la aseguradora antes de ofertar.
- **Cifras:**
  - «El ramo de cumplimiento ha perdido 33 pesos por cada 100 de prima» (sin verificar (no entró en la verificación de normas)). panel Fasecolda (KapFjMPR8yE), min 2 · F-555.
  - «Expectativa del contralor: amparo de cumplimiento entre 70 % y 90 %» (sin verificar). panel Fasecolda (KapFjMPR8yE), min 13 · F-555. Nota del verificador: Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar.
- **Vigencia a revisar:** La subida del amparo es una propuesta, no una norma; no se sabe si se adoptó.
- **Fuentes (1):** F-555

#### FIR-15 · Bolsa de productos: garantías líquidas en efectivo y comisionista obligatorio dejan por fuera a las pymes

- **Gravedad:** media. Es un costo financiero y una barrera de entrada, no la pérdida de un contrato.
- **Tipos de contrato:** bienes, servicios
- **Descripción:** Toda negociación en la Bolsa Mercantil exige una garantía líquida (efectivo o activos corrientes) además de la póliza, y actuar por medio de una sociedad comisionista. Fedesarrollo (2021) concluye que eso requiere músculo financiero y puede concentrar el mercado en las empresas grandes.
- **Causa:** El diseño de garantías de la Bolsa (depósito líquido más póliza) y la obligación de operar por medio de un comisionista.
- **Consecuencia en plata:** Capital inmovilizado en garantías y pago de comisiones. Según la ficha, solo una fracción pequeña de las empresas participantes en 2019 eran pequeñas (cifra sin ubicación).
- **Solución documentada:** Usar las órdenes irrevocables de giro de la Bolsa, respaldadas por el CDP de la entidad, para financiarse con la propia operación, o participar en consorcio o unión temporal.
- **Fuentes (1):** F-472

#### FIR-16 · IVA sobre la utilidad mal planteado en el contrato de obra: la oferta se pasa del techo o el contratista termina debiendo el IVA

- **Gravedad:** media. La pérdida se limita al IVA y sus sanciones, o al rechazo por precio.
- **Tipos de contrato:** obra
- **Descripción:** En obra, el IVA se causa sobre la utilidad del constructor (base especial del art. 1.3.1.7.9 del DUR 1625 de 2016), que no puede ser inferior a la comercial. La tarifa es la vigente a la adjudicación o firma, y en cada adición la vigente al adicionar. Según la DIAN (Oficio 13086 de 2018), los contratos de obra pública con entidades territoriales están excluidos de IVA (art. 100 de la Ley 21 de 1992). Una tesis de la U. Mariana documenta sanciones por corrección de declaraciones.
- **Causa:** Un pliego o una minuta que incluye o excluye por error el IVA sobre la utilidad, o desconocer la exclusión de las entidades territoriales y la tarifa aplicable.
- **Consecuencia en plata:** La oferta puede quedar por encima del presupuesto oficial, o el contratista puede terminar debiendo el IVA más sanciones. Sin cifra general.
- **Solución documentada:** Pactar en el contrato la utilidad sobre la que se liquida el IVA (no inferior a la comercial), verificar si la entidad es territorial y qué tarifa rige a la fecha de adjudicación.
- **Vigencia a revisar:** La exclusión territorial se apoya en un oficio DIAN de 2018 que cita la Ley 21 de 1992; conviene confirmar que siga vigente.
- **Fuentes (3):** F-026, F-126, F-401

#### FIR-17 · Entidades de régimen especial (Ecopetrol, ESE): cláusulas de terminación y sanción unilateral sin las garantías del procedimiento sancionatorio

- **Gravedad:** media. Expone a terminación o multas sin defensa previa, pero ninguna fuente lo cuantifica.
- **Tipos de contrato:** obra, bienes, servicios
- **Descripción:** Los contratos de derecho privado de entidades exceptuadas como Ecopetrol pactan cláusulas parecidas a las exorbitantes (terminación anticipada, sanciones unilaterales) sin el debido proceso del art. 86 de la Ley 1474. Las ESE, además, pueden usar a discreción las cláusulas exorbitantes del Estatuto General (Ley 100, art. 195 num. 6; Res. 5185 de 2013). El artículo de la U. Libre las defiende como válidas.
- **Causa:** La autonomía de la voluntad propia del derecho privado y, para las ESE, el numeral 6 del art. 195 de la Ley 100.
- **Consecuencia en plata:** Terminación o multas impuestas sin el debido proceso del art. 86 de la Ley 1474. Las fuentes no dan cifra.
- **Solución documentada:** Las fuentes no documentan solución; en la práctica, leer la minuta del régimen especial antes de ofertar y valorar esas cláusulas como riesgo.
- **Fuentes (3):** F-155, F-256, F-308

#### FIR-18 · Consorcio o unión temporal mal identificado en el contrato (firma la UT en vez de sus integrantes)

- **Gravedad:** baja. Se corrige con una aclaración; solo causa demora.
- **Tipos de contrato:** todos los tipos
- **Descripción:** En un contrato del PAE de 2023, el contrato se firmó a nombre de la unión temporal cuando debían firmarlo las empresas que la conforman. Hubo que expedir una resolución de aclaración que modificó el nombre del contratista.
- **Causa:** Confusión sobre quién firma por un consorcio o una unión temporal.
- **Consecuencia en plata:** Obliga a una resolución de aclaración y retrasa el inicio. Sin cifra.
- **Solución documentada:** Antes de firmar, revisar la identificación de los integrantes y sus porcentajes de participación.
- **Fuentes (1):** F-427

### 3.6 Ejecución del contrato (25)

#### EJE-01 · Firmar la prórroga o la suspensión con «sin costo», «se mantiene el valor» o una renuncia a reclamar: se pierde la mayor permanencia

- **Gravedad:** alta. Hace perder de un solo golpe todo el sobrecosto de meses o años de mayor permanencia, que en obra suele ser la reclamación más grande.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** La entidad redacta el acta de suspensión, la prórroga o el otrosí con fórmulas como «no genera mayores costos ni gastos de administración», «no contempla adición de recursos» o «el contratista renuncia expresamente a reclamar», y el contratista firma para no frenar la obra. Pasa lo mismo cuando el propio contratista, al pedir la prórroga, escribe que no necesita más recursos o pide «ampliación de plazo O reconocimiento de costos» (se entiende que eligió el plazo). Aunque desde la unificación del 27-jul-2023 (rad. 39121) ya no hace falta una salvedad formal, el juez interpreta lo pactado y esas frases se leen como aceptación de absorber el costo. La renuncia expresa es válida (CE 68709 de 2025, de subsección) salvo que el contratista PRUEBE que la entidad la impuso como condición, lo que prohíbe el art. 5 num. 3 de la Ley 80. Casos fallados: Convel vs. SENA (39121), Proviales vs. IDU (71426), 68140, 68709 (Riohacha), 70505 y 71337. Las fuentes no se contradicen; el matiz del ponente del conversatorio es que la renuncia EXPRESA no quedó cubierta por la unificación.
- **Causa:** La entidad condiciona la prórroga o manda el acta a firmar sin dejar poner salvedades, y el contratista firma el texto tal como viene, o redacta él mismo la solicitud diciendo que no requiere recursos; a veces negocia solo el plazo y no la plata.
- **Consecuencia en plata:** Se niega toda la mayor permanencia (administración, personal y equipo del tiempo extra) y a veces el reajuste y los intereses, aunque la demora sea culpa de la entidad; puede haber condena en costas. Montos citados en las fichas sin ubicación exacta: Riohacha (68709), $590,1 millones reclamados perdidos; Convel (39121), $27.728.823 de mayor permanencia y una condena de primera instancia de $58.532.364 revocada; 68140, 9 meses de prórroga sin reconocimiento.
- **Solución documentada:** No firmar renuncias genéricas ni frases de «sin costo». Dejar en la misma acta la reserva expresa y cuantificada de la mayor permanencia y de los mayores costos. Pedir la prórroga Y el reconocimiento de costos, no uno u otro. Si la entidad exige la renuncia, guardar prueba escrita de esa exigencia (correos, oficios), porque probarla le toca al contratista.
- **Vigencia a revisar:** La línea que exigía salvedad en cada modificatorio (sentencia 24809 de 2014 y similares) quedó superada por la unificación del 27-jul-2023. La regla de la renuncia expresa viene de sentencias de subsección (68709, 70505, 71337), no de una unificación.
- **Fuentes (17):** F-114, F-175, F-177, F-178, F-186, F-201, F-204, F-213, F-224, F-228, F-229, F-233, F-236, F-249, F-250, F-532, F-577

#### EJE-02 · Callar durante la ejecución: la regla de la salvedad cambió en 2023, pero en la liquidación sigue mandando

- **Gravedad:** alta. Una liquidación firmada sin salvedad o una negativa no demandada a tiempo cierran para siempre la reclamación de mayores costos.
- **Tipos de contrato:** obra, interventoría, todos los tipos
- **Descripción:** Hasta 2023 convivían dos líneas. El Consejo de Estado (hito 18080 de 2011) entendía que firmar suspensiones, prórrogas u otrosíes sin salvedad era un «finiquito» de lo anterior; los tribunales arbitrales no lo exigían. La Sala Plena de la Sección Tercera unificó el 27-jul-2023 (rad. 39121, Convel vs. SENA): el juez debe estudiar las pretensiones aunque no haya salvedad en los documentos de la ejecución. La unificación NO cubre el acta de liquidación bilateral, donde siguen haciendo falta salvedades expresas, completas y concretas. Contradicción entre fuentes: dos fichas (una tesis sobre la sentencia 18080 de 2011 y ponencias en video) siguen presentando la regla vieja («sin salvedad se pierde el reclamo»), mientras las fuentes que leen la sentencia de 2023 dicen lo contrario para la ejecución. Además, cada solicitud del contratista durante la ejecución tiene efectos procesales: si la entidad no responde en 3 meses opera el silencio administrativo positivo (Ley 80, art. 25 num. 16) y, según un panel, la respuesta se ha tratado como acto administrativo que hay que demandar a tiempo.
- **Causa:** Por miedo a chocar con la entidad, el contratista no deja constancia en cada modificatorio y después cree que la regla nueva también le cubre la liquidación. Tampoco lleva el control de los plazos de sus propias peticiones.
- **Consecuencia en plata:** Antes de 2023 se perdían reclamaciones enteras de mayor permanencia. Hoy el riesgo grande está en firmar la liquidación sin una salvedad concreta o en dejar caducar la demanda contra una negativa. En un laudo citado, el contratista además fue condenado en costas.
- **Solución documentada:** Seguir dejando salvedades concretas y cuantificadas en cada modificatorio, porque el juez interpreta lo pactado, y reclamar por escrito de forma continua durante la obra. En la liquidación, salvedad clara, expresa y concreta, con cantidad y valor. Llevar un registro de cada solicitud con su fecha de radicado, la respuesta o el silencio a los 3 meses y el plazo para demandar.
- **Cifras:**
  - «El juez debe estudiar las pretensiones aunque no se haya formulado salvedad al firmar suspensiones, adiciones o prórrogas (regla de unificación del 27-jul-2023)» (sin verificar (no entró en la verificación de normas)). pág. 36, párr. 44 · F-175.
  - «Silencio administrativo positivo si la entidad no se pronuncia en 3 meses sobre la solicitud del contratista» (sin verificar (no entró en la verificación de normas)). Ley 80 de 1993, art. 25 num. 16 · F-114.
- **Vigencia a revisar:** Las reglas de las sentencias 18080 de 2011 y 24809 de 2014 están superadas para la ejecución. El Complemento de Detekta (V-05) no tenía el radicado correcto: es el 39121, no el 25000233600020160173703. La tesis de que toda respuesta a una solicitud es un acto demandable es de hacia 2014 y no se verificó con el CPACA.
- **Fuentes (14):** F-114, F-142, F-175, F-195, F-201, F-238, F-249, F-338, F-398, F-499, F-533, F-536, F-554, F-577

#### EJE-03 · En obra pública el plazo casi siempre se alarga y el valor mucho menos: hay que ofertar contando con esa mayor permanencia

- **Gravedad:** media. Es un patrón de frecuencia que erosiona el margen si no se presupuesta; la pérdida concreta depende de cada prórroga (ver EJE-01 y EJE-04).
- **Tipos de contrato:** obra
- **Descripción:** Varias mediciones con datos de SECOP y de contratos regionales muestran que la prórroga es la regla y que el plazo crece más que el valor: en los proyectos públicos «nunca hubo una ampliación en el presupuesto inicial» después de adjudicar, y las prórrogas se concilian. Las cifras no coinciden entre fuentes porque miden muestras y definiciones distintas. En vías rurales solo 1 de cada 5 contratos se desvía, pero la mitad de los de más de 2.000 SMMLV se retrasa. En vías de licitación pública se desvía entre el 56 % y el 60 %, y en más del 75 % hubo un solo proponente. Otra tesis cuenta un 80 % de contratos de obra con «adición» en SECOP II, cifra que probablemente sobreestima porque cuenta cualquier modificación (inferencia de la propia ficha). Los documentos tipo se asocian a 1,35 meses más de prórroga en promedio.
- **Causa:** Planeación deficiente del cronograma y del presupuesto, selección de oferentes poco capaces, factores externos (clima, suministros, sitio) y que la ley topa las adiciones en valor pero no las prórrogas.
- **Consecuencia en plata:** La administración, el personal y el equipo se pagan por más tiempo sin que suba el valor, y el K y el capital de trabajo quedan comprometidos más meses. Ninguna fuente da la cifra en pesos para el contratista; que la diferencia la absorba él es inferencia de las fichas.
- **Solución documentada:** Antes de ofertar, medir la desviación típica por tipo de obra, entidad y rango de valor (datos abiertos de SECOP) y presupuestar esa mayor permanencia. Documentar desde el primer día las causas no imputables de cada prórroga.
- **Cifras:**
  - «41 % de la muestra con prórroga, 24 % con adición presupuestal y 17 % con ambas» (verificada: confirmada). p. 13 · F-435.
  - «Los documentos tipo aumentan los tiempos prorrogados en 1,35 meses en promedio» (sin verificar (no entró en la verificación de normas)). Resumen · F-435.
  - «177 proyectos (19,7 %) con desviación de costo y 175 (19,5 %) con desviación de tiempo en vías rurales» (verificada: confirmada). PDF p. 88, Tabla 4.5 · F-392.
  - «1 de cada 2 proyectos de más de 2.000 SMMLV se retrasa» (verificada: confirmada). PDF p. 89, §4.4.3 · F-392.
  - «1.478 de 1.842 contratos de licitación pública de obra con adiciones (80 %)» (verificada: confirmada). PDF p. 13-14, §7.2 · F-393.
  - «Índice de crecimiento del plazo de 1,49 en promedio frente a 1,07 del valor; 71,2 % de contratos modificados, 55,4 % en valor y 85,1 % en plazo» (verificada: confirmada). p. 18-19, Tablas 5-7 · F-434.
  - «Desviación en costo en el 60 % y en tiempo en el 56 % de los contratos viales analizados» (verificada: confirmada). p. 6 · F-297.
  - «Más del 75 % de los procesos con un único proponente» (verificada: confirmada). p. 7 · F-297.
- **Vigencia a revisar:** La muestra de vías de licitación es de 2014-2018, anterior a los documentos tipo obligatorios. El 80 % de adiciones cuenta modificaciones que no son en dinero. Una ficha advierte un error de unidades en Villarreal («$82.040.737 millones en promedio por contrato»): no usar esa cifra.
- **Fuentes (10):** F-297, F-309, F-310, F-367, F-392, F-393, F-424, F-434, F-435, F-445

#### EJE-04 · Cobrar la mayor permanencia exige probar la causa de la entidad y el costo mes a mes; mal imputada, la paga el contratista, incluida la interventoría

- **Gravedad:** alta. Puede convertir una reclamación a favor en una deuda del contratista con la entidad por la mayor interventoría.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** El AIU ofertado es fijo: la mayor Administración solo se reconoce si la prórroga es imputable a la entidad y el contratista prueba el perjuicio (CCE C-624 de 2025, en línea con CE 55855). Imputar mal los atrasos, sumando días de actividades simultáneas, infla o reparte mal el tiempo: en un acueducto de Medellín, sumar días daba 314 de atraso en una prórroga de 150, mientras el análisis de ruta crítica repartía 60 % a la entidad y 40 % al contratista. Si la prórroga es por causa del contratista, la entidad paga más interventoría (art. 85 de la Ley 1474) y la Contraloría lo trata como daño fiscal. Además, en un otrosí el contratista puede aceptar asumir esos honorarios: en Fondo Adaptación vs. Douquem (CE 71063) se reconocieron $474 millones a favor de la entidad por ese concepto (cifra de la ficha, sin página).
- **Causa:** No hay un método pactado para imputar atrasos, el cronograma del contratista tiene los costos mal cargados y el contratista acepta en otrosíes costos de interventoría sin analizar la causa del retraso.
- **Consecuencia en plata:** Meses de director, residentes y campamento sin pago, más la mayor interventoría trasladada al contratista. En el caso del acueducto, con unos $110 millones al mes de interventoría, el reparto movía cientos de millones.
- **Solución documentada:** Usar el análisis de impacto en el cronograma sobre la ruta crítica (TIA de AACE), contando un solo atraso por día, con registro diario. Documentar en cada otrosí la causa no imputable y el costo mensual de permanencia. No aceptar costos de interventoría en un otrosí sin establecer antes quién causó el retraso.
- **Cifras:**
  - «Prórroga de 86 días que llevó a adicionar la interventoría en $39,8 millones, calificados como sobrecosto» (verificada: confirmada). Informe CGR-051-2011, hallazgo 1, p. 9 · F-466.
  - «Plazo adicional de 450 días con unos $110.000.000 por mes de interventoría» (sin verificar). p. 17 · F-426. Nota del verificador: La ficha del handle responde (título, autoras, año 2025), pero la descarga del PDF (bitstreams/db5ea9a2-.../download) devuelve una página «Bot Detection» con curl y con WebFetch. No se pudo abrir el texto.
  - «Se sumaban 314 días de atraso en una ampliación de 150 días» (sin verificar). p. 19 · F-426. Nota del verificador: Misma barrera: el bitstream del repositorio UdeA devuelve «Bot Detection» (HTML, 200) en lugar del PDF.
  - «123 días de ampliación: 74 imputables a la entidad (60 %) y 49 al contratista (40 %)» (sin verificar). p. 23 · F-426. Nota del verificador: Misma barrera: el bitstream del repositorio UdeA devuelve «Bot Detection» en lugar del PDF.
- **Vigencia a revisar:** El informe de la Contraloría es de 2011. Que la entidad le cobre al contratista la mayor interventoría en ese caso es inferencia de la ficha.
- **Fuentes (6):** F-030, F-144, F-191, F-221, F-426, F-466

#### EJE-05 · Obra ejecutada sin papel que la respalde (modificatorio firmado, aviso escrito, medición en acta) se cobra con pleito o no se cobra

- **Gravedad:** alta. Puede significar no cobrar nunca una obra ya construida y pagada de su bolsillo.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** Son varias formas del mismo error: ejecutar ítems no previstos u obra extra con solo el visto bueno o el acta de precios del interventor; ejecutar mayores cantidades sin avisar por escrito; seguir trabajando con el plazo vencido; confiar en un acta con el supervisor que «amplía» un plazo; dejar cantidades ejecutadas sin medir en las actas parciales. El interventor y el supervisor no pueden modificar el contrato ni convenir precios (CE 64165 de 2022). Un ítem nuevo exige contrato adicional (SU-214, párr. 324, y CE 35554). El enriquecimiento sin causa no sirve para cobrar obra hecha sin contrato o al margen de él (unificación 2025CE-SUJ-3-001). En cambio, las mayores cantidades de ítems pactados en contratos a precios unitarios sí se reconocen sin adicional si hubo aviso escrito (CE 58634 de 2023), o si se prueban antes de liquidar con actas provisionales (CE 67508 de 2024, donde se recuperaron $2.941.528.748, cifra sin página en la ficha). Contradicción: en el caso 58634, el tribunal de primera instancia dijo que solo el ordenador del gasto autoriza mayores cantidades y el Consejo de Estado lo revocó; no debe presentarse como regla general.
- **Causa:** Órdenes verbales de la entidad o del interventor, urgencia de la obra, la creencia de que el acta con el interventor obliga a la entidad, prórrogas pedidas tarde y mediciones que el contratista no objeta a tiempo.
- **Consecuencia en plata:** Se pierde el valor íntegro de la obra no respaldada, o se cobra tras un juicio de años; en el exp. 64165 solo se reconoció la retención en garantía ($438.888.926, cifra sin página) y no las obras. Con el plazo vencido, o con un acta de supervisión que no vale, además queda expuesto a multa o cláusula penal.
- **Solución documentada:** No arrancar un ítem nuevo sin un modificatorio o contrato adicional firmado por el ordenador del gasto, con precio unitario y respaldo presupuestal. Para las mayores cantidades: aviso escrito previo y medición en cada acta. Llevar mes a mes el acumulado medido frente al pagado y objetar en el acta siguiente. Pedir la prórroga antes del vencimiento. Si la entidad impuso la obra, la vía es la falla del servicio y hay que probar que se la impusieron.
- **Cifras:**
  - «Las actas firmadas con la interventoría no vinculan jurídicamente a la entidad y el interventor no puede convenir el precio de actividades no previstas» (sin verificar (no entró en la verificación de normas)). pp. 81-82 · F-220.
  - «Las actas de obra mensuales tenían carácter provisional; se pueden reconocer cantidades ejecutadas y no pagadas» (sin verificar (no entró en la verificación de normas)). p. 19-20 · F-208.
- **Vigencia a revisar:** Una tesis de 2017 dice que la obra no formalizada se cobra por reparación directa, con jurisprudencia de 2002: ese criterio quedó desplazado por las unificaciones de 2012 y 2025. También cita la Ley 734 de 2002, reemplazada por la Ley 1952 de 2019.
- **Fuentes (13):** F-068, F-178, F-195, F-208, F-220, F-238, F-403, F-437, F-438, F-530, F-533, F-549, F-558

#### EJE-06 · El precio de los ítems no previstos lo fija la entidad con su listado de referencia, no con el costo real del contratista

- **Gravedad:** media. Pérdida acotada al margen de los ítems no previstos.
- **Tipos de contrato:** obra
- **Descripción:** Cuando los diseños incompletos generan actividades fuera del presupuesto, algunas entidades imponen su precio. El manual del IDU exige tres cotizaciones recientes, hace primar el precio IDU si existe y le da al IDU la última palabra; el desacuerdo no justifica suspender ni pedir más plazo. Según la guía de obra de CCE, aprobar ítems no previstos exige una modificación contractual dentro del tope del art. 40 de la Ley 80.
- **Causa:** Diseños incompletos y reglas internas de la entidad que le dan la decisión final sobre el precio.
- **Consecuencia en plata:** El ítem se ejecuta a un precio que puede quedar por debajo del costo; la fuente no da cifra.
- **Solución documentada:** En la oferta, estimar qué actividades quedaron por fuera del presupuesto por diseños incompletos. Antes de ejecutar el no previsto, preparar su APU con las cotizaciones exigidas.
- **Cifras:**
  - «Primará el precio IDU y el contratista deberá acoger el precio de referencia IDU; el IDU tiene la última palabra» (sin verificar (no entró en la verificación de normas)). Manual MG-FP-02, pp. 454-455 · F-140.
  - «Para aprobar ítems no previstos se debe tramitar la modificación contractual dentro del límite del parágrafo del art. 40 de la Ley 80» (verificada: confirmada). Guía de obra pública CCE, p. 93 · F-006.
- **Vigencia a revisar:** El manual del IDU rige solo para el IDU (Bogotá); otras entidades tienen reglas propias. La guía de CCE citada es una versión con comentarios (2025).
- **Fuentes (2):** F-006, F-140

#### EJE-07 · El tope del 50 % para adicionar: qué cuenta, cómo se mide y por qué no es pacífico para las mayores cantidades

- **Gravedad:** alta. Puede dejar sin pagar o paralizar una porción grande de obra y generar hallazgos fiscales.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** El parágrafo del art. 40 de la Ley 80 prohíbe adicionar más del 50 % del valor inicial «expresado en SMMLV»: el valor inicial se divide por el salario mínimo del año de firma y la adición por el del año en que se firma. Las fuentes se contradicen sobre las mayores cantidades. La Corte Constitucional (SU-214 de 2022, párr. 180) dijo que el tope aplica «con independencia del sistema de precios». El Consejo de Estado (67508 de 2024) se apartó y lo llamó obiter dictum, y CCE (C-465 de 2024) acepta que las mayores cantidades autorizadas superen el 50 %, aunque sin sentencia de unificación. Las obras extra o ítems nuevos sí cuentan para el tope, y algunos entes de control no aceptan ningún exceso. Aparte, si la entidad modifica unilateralmente el contrato en un 20 % o más del valor inicial, el contratista puede renunciar a seguir (art. 16).
- **Causa:** Se confunden las mayores cantidades de ítems pactados con la adición, se calcula el tope en pesos y no en salarios mínimos, y la doctrina cambió (hasta 2024 CCE contaba todo aumento).
- **Consecuencia en plata:** Obra parada o cantidades sin pagar al llegar al 50 %, hallazgos fiscales o disciplinarios, o una adición pactada por encima del tope. La fuente no da cifra.
- **Solución documentada:** Separar en cada acta las mayores cantidades de ítems pactados de las obras nuevas. Calcular el tope en SMMLV de cada año. Tratar la tesis de que las mayores cantidades no topan como disputada, no como derecho seguro. Ante una modificación unilateral del 20 % o más, evaluar la renuncia.
- **Cifras:**
  - «Las adiciones no pueden superar el 50 % del valor inicial expresado en salarios mínimos legales mensuales» (verificada: confirmada). Ley 80, art. 40, parágrafo · F-114.
  - «La restricción aplica con independencia de la modalidad contractual y del sistema de precios» (sin verificar (no entró en la verificación de normas)). SU-214 de 2022, párr. 180 · F-246.
  - «La Sala se aparta de lo expresado por la Corte Constitucional en la SU-214 de 2022» (sin verificar (no entró en la verificación de normas)). Sentencia 67508, p. 14 · F-207.
  - «Se pueden ejecutar mayores cantidades por valores incluso mayores al 50 % siempre que la entidad las autorice» (verificada: confirmada). Concepto C-465 de 2024 · F-081.
  - «Si la modificación unilateral altera el valor en un 20 % o más del inicial, el contratista puede renunciar a continuar» (verificada: confirmada). Ley 80, art. 16 · F-114.
- **Vigencia a revisar:** El Complemento de Detekta (V-03) afirma sin matiz que el tope no aplica a las mayores cantidades: debe marcarse como tesis del Consejo de Estado en tensión con la Corte Constitucional. Los conceptos 3886/1987 y 22178/2002 se citan sin haberlos abierto.
- **Fuentes (11):** F-081, F-114, F-195, F-207, F-208, F-246, F-509, F-513, F-515, F-545, F-558

#### EJE-08 · Diseños deficientes, redes sin catastro y cambios de diseño: quién paga depende de si el diseño era de la entidad o del contratista

- **Gravedad:** alta. Puede llevar a multas, cláusula penal y pretensiones negadas con costas.
- **Tipos de contrato:** obra, consultoría
- **Descripción:** Los diseños de la entidad mal revisados obligan a ajustar la mayoría de los contratos construidos con ellos: una adición promedio del 52,99 % en un caso de Medellín y del 23 % al 26 % en tres de cuatro casos ESAP. Las redes de servicios públicos sin catastro y las empresas de servicios que piden cambios de trazado generan excavaciones, bombeo, equipo parado y adiciones que la entidad puede negarse a pagar; en el caso IDU (CE 69090) el diseño ya mostraba la condición y el contratista debía preverla al ofertar. Si el contrato incluye diseños o preconstrucción, los cambios de diseño y las fallas del diseño propio son riesgo del contratista (CE 68756 y 68810: pretensiones negadas y costas).
- **Causa:** Interventoría de diseños que no detecta las deficiencias; condiciones no estudiadas (suelos, arqueología, redes); diseños contratados aparte que se desactualizan antes de la obra; empresas de servicios que no son parte del contrato.
- **Consecuencia en plata:** Mayor permanencia, obra ejecutada antes de formalizar la adición y riesgo de no pago. En el caso IDU quedó sin construir el 46 % de los andenes y hubo multas y cláusula penal (cifra sin página en la ficha).
- **Solución documentada:** Revisar los diseños antes de ofertar y dejar constancia. En contratos de diseño y construcción, ponerle precio a la incertidumbre de diseño, porque la planeación obliga también al proponente. En transporte, exigir que la factibilidad identifique las redes (Ley 1682, art. 12).
- **Cifras:**
  - «Adición promedio del 52,99 % de la inversión total; el 58,33 % de los contratos de obra necesitó algún ajuste» (verificada: confirmada). pp. 99-102 · F-395.
  - «Aumento del presupuesto de 24 %, 26 %, 23 % y 8 % en los cuatro casos» (verificada: confirmada). Tabla 2 · F-267.
  - «No había catastro de redes; al excavar aparecían bancos de ductos de más de 25 años» (sin verificar (no entró en la verificación de normas)). párr. 140 · F-228.
- **Fuentes (7):** F-146, F-209, F-222, F-228, F-267, F-378, F-395

#### EJE-09 · Reclamar un imprevisto por la vía equivocada: imprevisión, sujeción material, hecho del príncipe y fuerza mayor no pagan lo mismo

- **Gravedad:** alta. Un encuadre equivocado hace perder todo el sobrecosto reclamado.
- **Tipos de contrato:** obra, bienes
- **Descripción:** La imprevisión y las sujeciones materiales imprevistas (roca, agua, suelo) solo devuelven al punto de no pérdida, sin utilidad (Ley 80, art. 5 num. 1); el incumplimiento de la entidad (por ejemplo, un estudio de suelos deficiente) da reparación integral. El hecho imprevisto no puede estar en el pliego ni asignado en la matriz de riesgos. La imprevisión exige seguir ejecutando. El hecho del príncipe solo existe si el acto es de la misma entidad contratante. La prueba (por ejemplo, registros meteorológicos) le toca al contratista. La fuerza mayor (pandemia, actos de autoridad) no exonera si el contratista ya estaba atrasado o no había invertido el anticipo, y las pólizas la excluyen. Las fuentes no coinciden en la clasificación: un artículo trata la sujeción material como una figura propia que exige imprevisibilidad para ambas partes, y una ponencia dice que la jurisprudencia la metió dentro de la imprevisión. Además, un ponente atribuye el punto de no pérdida a la Ley 1150, lo que el texto del Senado desmiente: está en la Ley 80 sin nota de modificación.
- **Causa:** Se confunden las figuras, se suspende la obra, se pide utilidad o se alega un riesgo que estaba en la matriz, y no se documentan los costos ni el hecho durante la obra.
- **Consecuencia en plata:** El reclamo se niega por completo o, si prospera por imprevisión, no repone la utilidad. Con fuerza mayor mal alegada, la aseguradora paga y le recobra al contratista. Las fuentes no dan cifras.
- **Solución documentada:** Encuadrar bien la causa: si el origen es un diseño o un estudio de la entidad, reclamar por incumplimiento o por planeación. Revisar la matriz de riesgos antes de ofertar. Seguir ejecutando y documentar los costos reales y los registros de clima. Estar al día antes del evento y revisar las exclusiones de la póliza.
- **Vigencia a revisar:** Los decretos de emergencia de 2020 (482, 537 y 564) perdieron vigencia.
- **Fuentes (8):** F-114, F-366, F-420, F-499, F-532, F-550, F-553, F-554

#### EJE-10 · Multas, cláusula penal y caducidad con un procedimiento viciado: hay defensa, pero la nulidad no borra el incumplimiento

- **Gravedad:** alta. Afecta la garantía, puede terminar en caducidad e inhabilidad de 5 años y en descuentos directos de los pagos.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El procedimiento del art. 86 de la Ley 1474 se aplica mal con frecuencia: citación vaga o con un plazo mínimo (menos de 24 horas en un caso del IDU), sin perjuicios cuantificados, sin averiguación preliminar comunicada, sin dejar aportar documentos, con el supervisor que acusa decidiendo, sin delegación o con el informe de un interventor saliente. El informe de supervisión es la pieza que abre el proceso, y su cálculo preliminar de perjuicios ancla la multa. La caducidad se ha declarado bajo presión mediática y sin soportes (163 contratos de obra caducados entre 2009 y 2021, cifra de segunda mano). Pero anular el acto no borra el incumplimiento ni la cláusula penal (CE 69090), y cumplir tarde no anula la multa, aunque puede reducirla (CE 64154). Las fuentes se contradicen sobre el momento: varias dicen que la multa y la caducidad solo caben dentro del plazo de ejecución (CE 28875) y que la cláusula penal puede imponerse hasta la liquidación; la sentencia 64154 cita una línea según la cual vale el trámite iniciado antes del vencimiento, y una ponencia sostiene que se pueden imponer sanciones durante la liquidación.
- **Causa:** Entidades que aplican el art. 86 de forma incompleta, formatos internos defectuosos, solicitudes de sanción que llegan tarde a la oficina jurídica, y contratistas que no conocen el procedimiento ni alegan sus vicios.
- **Consecuencia en plata:** Multa descontada del acta, cláusula penal, siniestro de la póliza de cumplimiento, condena en costas a la aseguradora e inhabilidad por incumplimiento reiterado. Con caducidad: 5 años de inhabilidad y pérdida del anticipo no amortizado y de las garantías. En un caso, vencido el plazo ya no se pudo multar, pero se impuso la cláusula penal y se reclamaron 19.637 millones a las garantías (cifra sin minuto exacto).
- **Solución documentada:** Exigir lo que pide el art. 86: citación con el informe de interventoría, los hechos, las cláusulas y las consecuencias; perjuicios cuantificados; garante citado; descargos con pruebas; reposición en la audiencia. Verificar que el plazo no haya vencido y quién preside, con qué delegación. Cumplir lo pendiente durante la actuación para pedir la reducción. Si la falta cesa, pedir que se termine el procedimiento (lit. d). Llevar una contra-bitácora para responder cada punto del informe.
- **Cifras:**
  - «Al menos 163 contratos de obra pública caducados entre 2009 y 2021, por cerca de COP 60 billones (citando a la CCI)» (sin verificar (no entró en la verificación de normas)). p. 8 · F-388.
  - «El 36 % de las declaratorias de caducidad fueron demandadas y en el 20 % de esos casos la entidad fue condenada» (verificada: confirmada). p. 55 · F-388.
  - «El informe de supervisión da inicio al procedimiento sancionatorio e incluye un cálculo preliminar de perjuicios» (sin verificar (no entró en la verificación de normas)). Manual de supervisión CCE (2024), p. 51 · F-005.
- **Vigencia a revisar:** Las cifras de caducidad son de segunda mano (CCI 2021), en una tesis con citas dudosas: verificar antes de mostrarlas. El art. 86 tiene notas del Decreto Legislativo 537 de 2020, que habría perdido vigencia. La C-499 de 2015 y la sentencia 56002 de 2023 se citan sin haberlas abierto, y el Decreto 1447 de 2009 sobre delegación debe verificarse.
- **Fuentes (16):** F-005, F-142, F-144, F-166, F-196, F-223, F-228, F-265, F-368, F-388, F-430, F-543, F-544, F-549, F-558, F-575

#### EJE-11 · La entidad paga tarde y el contratista financia la obra: plazo legal sujeto al PAC, mora que no se paga sola y cambio de año o de gobierno

- **Gravedad:** alta. La mora prolongada agota la caja de una pyme; la literatura la asocia a quiebras de firmas de ingeniería.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El pago real tarda mucho más que el pactado. En 2017 el Banco Mundial registraba un plazo legal de 30 días y un pago efectivo de 31 a 90 días, sin intereses automáticos. Las mipymes reportan pagos a 60-180 días. En los acuerdos marco la entidad puede rechazar la factura y el reloj de 30 días vuelve a empezar. Los contratos que cruzan de año se pagan hasta marzo. En 2026 varias entidades nacionales dejaron sin pago a unos 2.400 contratistas por falta de caja. El sector Transporte ejecutó el 46,3 % de lo comprometido en 2025, y el cambio de gobernante agrava el riesgo. La Ley 2024 de 2020 fija 60 días calendario desde la aceptación de la factura para las mipymes (art. 12), pero sujetos al PAC; una solicitud de corrección de la factura interrumpe el plazo (art. 11), y CCE no puede sancionar a la entidad morosa. Si no se pactaron intereses, la tasa supletoria es el doble del interés legal civil sobre el valor histórico actualizado (Ley 80, art. 4 num. 8). Además, el contratista ya causó el ingreso para impuestos (y el IVA) aunque la entidad no le reciba la factura. Discrepancias entre fuentes: un video habla de «unos 30 días hábiles» tras la factura y la ley, de 60 calendario; y en la documentación de Detekta la fase de 45 días figura «a confirmar», cuando el art. 12 solo dice 60 (el escalonamiento 60/45 está en el art. 3, régimen comercial). También se excusa el no pago diciendo que venció el convenio que financiaba la obra; según una conferencista, si el contrato tenía vida propia, hay obligación de pagar.
- **Causa:** Pagos sujetos al PAC, glosas que interrumpen el plazo, actas que la entidad no expide, vigencias futuras no giradas, presupuesto que pasa a la vigencia siguiente, crisis de caja y baja ejecución presupuestal.
- **Consecuencia en plata:** Capital de trabajo inmovilizado y crédito caro (a veces extrabancario) que rara vez se recupera, mientras el contratista sí debe pagar a sus proveedores; impuestos sobre ingresos que no ha cobrado. En el laudo Convias vs. Barranquilla, los faltantes de vigencias futuras terminaron en una condena de $15.119.714.251 (cifra sin página en la ficha).
- **Solución documentada:** Pactar intereses moratorios y, si no se pactaron, cobrar la tasa supletoria de la Ley 80. Para mipymes, exigir el plazo de 60 días y la indemnización por costos de cobro (Ley 2024, arts. 5, 11 y 12). En la TVEC, la entidad con mora de 30 días o más puede ser suspendida, y el proveedor del AMP puede abstenerse de cotizar mientras le deban. Presupuestar el costo financiero según la entidad y la época del año.
- **Cifras:**
  - «Colombia 2017: plazo legal de 30 días; tiempo real para recibir el pago entre 31 y 90 días; los intereses no se pagan automáticamente» (verificada: confirmada). Ficha de Colombia, pág. 87 del PDF · F-459.
  - «Pagos a mipymes en máximo 60 días calendario desde la aceptación de la factura, sujeto al Plan Anualizado de Caja» (verificada: confirmada). Ley 2024 de 2020, art. 12 y parágrafo 1 · F-112.
  - «Sin intereses pactados se aplica el doble del interés legal civil sobre el valor histórico actualizado» (sin verificar (no entró en la verificación de normas)). Ley 80, art. 4 num. 8 · F-114.
  - «Si la entidad rechaza la factura, el término de 30 días calendario empieza a contar desde la aprobación de la nueva factura» (verificada: confirmada). Guía AMP, pp. 38-39, §2.5 · F-049.
  - «Causal de suspensión de la entidad en la TVEC: mora de 30 días calendario o más en el pago de facturas» (verificada: confirmada). Términos y condiciones TVEC, p. 11, §IX(e) · F-104.
  - «Pueden pasar 90 días sin recibir el pago» (sin verificar). p. 78 · F-472. Nota del verificador: El repositorio de Fedesarrollo responde con una página anti-bot («Making sure you're not a bot!», HTML 7 KB) con curl y 403 con WebFetch. No se abrió el PDF.
  - «Plazos de pago con un promedio de 90 días (Toro, 2018)» (verificada: confirmada). pág. 44 · F-379.
  - «Facturas pagadas entre 60 y 180 días (ACOPI, 2017)» (verificada: confirmada). pág. 45 · F-379.
  - «Los contratos ejecutados a final de año pueden pagarse hasta marzo del año siguiente» (sin verificar (no entró en la verificación de normas)). Video, min 65 · F-503.
  - «2.395 contratistas sin pago desde diciembre por problemas de caja; 1.410 en el Ministerio del Interior» (sin verificar (no entró en la verificación de normas)). min 0-1 · F-504.
  - «790 personas sin pago en el Departamento Nacional de Planeación» (sin verificar (no entró en la verificación de normas)). min 4 · F-504.
  - «COP 13 billones de regalías no ejecutados a marzo de 2022» (sin verificar (no entró en la verificación de normas)). pág. 18 · F-461.
- **Vigencia a revisar:** Los datos del Banco Mundial son de 2017 y los de mipymes de 2017-2019. Las cifras de impagos de febrero de 2026 son declaraciones de una senadora, sin dato oficial. El art. 3 de la Ley 2024 figura como condicionalmente exequible y no se leyó el condicionamiento. Los términos de la TVEC son la versión 2 de 2022.
- **Fuentes (21):** F-044, F-049, F-100, F-104, F-112, F-114, F-130, F-131, F-135, F-248, F-285, F-379, F-425, F-459, F-461, F-472, F-486, F-493, F-503, F-504, F-529

#### EJE-12 · El anticipo llega meses después del acta de inicio y luego el interventor objeta su legalización

- **Gravedad:** media. Costo financiero acotado a los meses de espera, aunque pesa en la caja de una pyme.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Por trámites de la entidad (fiducia o patrimonio autónomo, aprobaciones), el anticipo puede girarse cuatro o cinco meses después de iniciada la obra, así que el contratista arranca con capital propio; después el interventor le objeta la legalización si mezcló recursos. Según un docente de la Escuela Judicial, hay jurisprudencia que reconoce la responsabilidad de la entidad por la mora en el anticipo. El anticipo y el pago anticipado no pueden superar el 50 % del valor (Ley 80, art. 40, parágrafo).
- **Causa:** Trámites internos de la entidad para constituir la fiducia y aprobar el giro.
- **Consecuencia en plata:** Capital de trabajo no previsto durante 4 o 5 meses (dato anecdótico del docente, sin muestra) y su costo financiero.
- **Solución documentada:** Tratar la mora del anticipo como causa de desequilibrio y documentarla. No mezclar recursos propios con los del anticipo sin dejar constancia. Presupuestar el arranque sin anticipo.
- **Cifras:**
  - «El anticipo se paga cuatro o cinco meses después de iniciada la ejecución» (sin verificar (no entró en la verificación de normas)). min 42 · F-550.
  - «El anticipo y el pago anticipado no pueden exceder el 50 % del valor del contrato» (verificada: confirmada). Ley 80, art. 40, parágrafo · F-114.
- **Fuentes (2):** F-114, F-550

#### EJE-13 · El supervisor o el interventor retiene actas ya aprobadas sin abrir el proceso de incumplimiento

- **Gravedad:** media. Inmoviliza la caja de actas ya ganadas; la pérdida es financiera y se puede recuperar.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Según una conferencista de la ESAP, el supervisor y el interventor no pueden retener pagos por fuera del procedimiento del art. 86 de la Ley 1474: hacerlo «es absolutamente ilegal». La entidad debe radicar las actas y cuentas el día en que se presentan y devolverlas por escrito con sus motivos (Ley 80, art. 25 num. 17). Una vez abierto el procedimiento, la misma ponente sostiene que el pago queda suspendido hasta que se decida, aunque reconoce que el art. 86 no lo dice. Una variante: la entidad deja de pagar una obra prorrogada por causas ajenas al contratista alegando que venció el convenio que la financiaba.
- **Causa:** El supervisor confunde su facultad de vigilar con la de sancionar, y se confunde el plazo del convenio interadministrativo con el del contrato derivado.
- **Consecuencia en plata:** Flujo de caja congelado en actas ya aprobadas y saldos sin pagar al final de la obra; sin cifra.
- **Solución documentada:** Exigir por escrito el fundamento de la retención y que se abra el proceso del art. 86 o se pague. Cuando se alegue el vencimiento del convenio, revisar las disponibilidades presupuestales propias del contrato.
- **Cifras:**
  - «Obligación de radicar las actas o cuentas de cobro en la fecha en que las presenta el contratista» (sin verificar (no entró en la verificación de normas)). Ley 80, art. 25 num. 17 · F-114.
- **Vigencia a revisar:** Que el pago se suspenda al abrir el procedimiento es interpretación de la ponente; todo el problema descansa en una sola conferencia en video.
- **Fuentes (2):** F-114, F-549

#### EJE-14 · El cobro se devuelve por un soporte: planilla de seguridad social, radicado que no coincide en SECOP II, acta sin fecha o calendario propio de la entidad

- **Gravedad:** media. Retrasa los pagos y puede costar los intereses de mora, pero se corrige con disciplina documental.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Cada pago depende de que el supervisor apruebe la factura y verifique los aportes a seguridad social, los parafiscales y la ARL (Ley 80, art. 41, modificado por la Ley 1150, art. 23; Manual de supervisión de CCE). La cuenta que se sube a SECOP II se devuelve si no coincide exactamente con la radicada en la entidad (número y fecha), y el paso hay que repetirlo en cada pago. Algunas entidades imponen su propio calendario de radicación: el SENA asigna el día por el último dígito de la cédula. Sin constancia de la fecha de radicación no hay desde cuándo contar la mora: en el caso Convel se negaron los intereses porque las actas no tenían fecha y la factura no tenía sello de recibido. En las personas naturales, el IBC se calcula mal (por días en vez de por mes, o sobre un solo contrato cuando hay varios) o con una norma caída: el art. 244 de la Ley 1955 es inexequible desde el 21-jul-2022 y hoy rige el art. 89 de la Ley 2277. En los servicios por unidad entregada (PAE), el pago depende de planillas y soportes por entrega, y el sistema acumula procesos de responsabilidad fiscal.
- **Causa:** Dos circuitos paralelos (la ventanilla de la entidad y SECOP II) con datos que se llenan a mano, reglas del IBC que cambiaron varias veces y procedimientos internos distintos en cada entidad.
- **Consecuencia en plata:** Cada devolución reinicia el trámite y aplaza el cobro. Se pierden intereses de mora (en Convel se negaron $18.238.682, cifra sin página). Hay riesgo de sanción de la UGPP por cotizar de menos y, en el PAE, de glosas y responsabilidad fiscal.
- **Solución documentada:** Radicar primero en la entidad con constancia de fecha, obtener el visto bueno del supervisor y crear el registro en SECOP II con el mismo número y la misma fecha. Ponerle fecha y periodo a cada acta. Consultar el calendario de la entidad. Para personas naturales: IBC = 40 % del ingreso mensual (en contratos distintos a la prestación de servicios, después de restar costos), sumando todos los contratos hasta 25 SMMLV, pagado por PILA.
- **Cifras:**
  - «IBC del independiente: 40 % de los ingresos mensuales, sin superar 25 SMMLV» (verificada: confirmada). ABC UGPP, p. 2 · F-162.
  - «El supervisor debe verificar los aportes a seguridad social, parafiscales y ARL antes de aprobar el pago» (sin verificar (no entró en la verificación de normas)). Manual de supervisión CCE, p. 33 · F-005.
  - «Actas sin fecha de elaboración ni de obra y factura sin fecha de recibido: se niegan los intereses de mora» (sin verificar (no entró en la verificación de normas)). párr. 38 · F-178.
  - «154 procesos de responsabilidad fiscal con pérdidas de 84.000 millones en el PAE» (sin verificar (no entró en la verificación de normas)). p. 7 · F-306.
- **Vigencia a revisar:** El art. 244 de la Ley 1955 es inexequible desde el 21-jul-2022: cualquier pliego o tesis que lo cite está desactualizado. El Decreto 1703 de 2002, el Decreto 780 de 2016 y la Resolución UGPP 209 de 2020 no se abrieron en su texto vigente. Que el calendario del SENA se aplique en obra es inferencia.
- **Fuentes (15):** F-005, F-099, F-142, F-147, F-150, F-162, F-178, F-306, F-427, F-453, F-491, F-492, F-495, F-541, F-585

#### EJE-15 · El interventor trabaja más tiempo o más tareas de las pactadas y no las cobra; si le pagan contra avance de obra, carga los retrasos del constructor

- **Gravedad:** alta. Para una firma de interventoría, meses de personal sin pago son una pérdida grande frente a su margen.
- **Tipos de contrato:** interventoría, consultoría
- **Descripción:** La prórroga de la obra no prorroga sola la interventoría (CE 24266 de 2013), y el art. 85 de la Ley 1474 dice que el valor «podrá» ajustarse, no que deba: en el Valle del Cauca solo 10 de 64 interventorías terminaron en el plazo y el valor pactados. El interventor no está obligado a hacer presupuestos, cantidades, diseños ni otrosíes salvo pacto expreso, y sin una orden o un contrato escrito no los cobra. Cuando el pago se pacta contra el avance de la obra vigilada, el interventor asume el riesgo de flujo de caja y puede perder el saldo si la obra no llega al 100 % (CE 69340: obra al 95,67 %). CCE (C-753 de 2026) dice que supeditar todo el pago a la ejecución de la obra es ineficaz y que, con precio fijo, el interventor que cumple tiene derecho al total.
- **Causa:** Los contratos estatales son solemnes (sin escrito no hay obligación de pago), las entidades piden tareas fuera del objeto y se pactan formas de pago ligadas al avance del constructor.
- **Consecuencia en plata:** Se pierde el pago de meses de trabajo (en CE 24266, unos 8 meses entre jul-1997 y mar-1998, sin total en la fuente) y el saldo final del contrato.
- **Solución documentada:** Exigir la prórroga escrita y el ajuste de valor de la interventoría al mismo tiempo que la prórroga de la obra. No ejecutar labores fuera del objeto sin una orden o un contrato. En la oferta, revisar la forma de pago (el pliego tipo recomienda pagar por obligaciones propias y un último pago de al menos el 5 %), y entregar a tiempo el informe final y el proyecto de acta de liquidación.
- **Cifras:**
  - «Solo el 15,63 % de 64 contratos de interventoría se ejecutó en los tiempos y el presupuesto pactados» (verificada: confirmada). Conclusiones · F-274.
  - «Los contratos de interventoría podrán prorrogarse por el mismo plazo de la obra y el valor podrá ajustarse» (sin verificar (no entró en la verificación de normas)). Ley 1474, art. 85 · F-144.
  - «Ejecución de los negocios supervisados del 95,67 %: solo se pagó lo ejecutado y no la totalidad de la propuesta» (verificada: confirmada). Ficha de la sentencia 69340 · F-185.
- **Fuentes (8):** F-039, F-041, F-046, F-144, F-185, F-198, F-274, F-364

#### EJE-16 · El interventor que no informa a tiempo queda inhabilitado 5 años y responde solidariamente con el constructor

- **Gravedad:** alta. Inhabilidad de 5 años y responsabilidad patrimonial solidaria.
- **Tipos de contrato:** interventoría, consultoría
- **Descripción:** El art. 84 de la Ley 1474 castiga al interventor que no informa oportunamente un posible incumplimiento con una falta gravísima, una inhabilidad de 5 años y la responsabilidad solidaria por los perjuicios; el art. 118 le presume culpa grave fiscal si omite sus obligaciones. El Consejo de Estado condenó solidariamente a un interventor con el constructor por la caída de un puente (el 70 % de los perjuicios de INVÍAS, según la ficha): al recibir la obra y certificarla, asumió la garantía del resultado. Un autor gremial denuncia el desequilibrio: el interventor no puede modificar el contrato ni cambiar el plazo o el valor, la entidad lo trata como subordinado, y aun así responde sin límite por los errores de planeación de ella (es una opinión, no un hallazgo empírico).
- **Causa:** Arts. 82, 84 y 118 de la Ley 1474, contratos de obra e interventoría coligados y entidades que le trasladan sus decisiones al interventor.
- **Consecuencia en plata:** Cinco años sin contratar con el Estado, responsabilidad fiscal con su patrimonio y condena solidaria; para una firma de consultoría equivale a perder el negocio.
- **Solución documentada:** Informar por escrito y a tiempo todo posible incumplimiento, riesgo o hecho de corrupción, publicar los requerimientos en SECOP y dar las órdenes por escrito. Si la obra no sirve para el uso previsto y la entidad no actúa, abstenerse de recibirla en vez de certificarla. Si concurren inhabilidades por el mismo hecho, solo aplica la más alta (C-434 de 2013).
- **Cifras:**
  - «La inhabilidad del interventor que no informa dura 5 años y responde solidariamente de los perjuicios» (sin verificar (no entró en la verificación de normas)). Ley 1474, art. 84, parágrafos 2 y 3 · F-144.
- **Vigencia a revisar:** El parágrafo 1 del art. 84 modifica la Ley 734 de 2002, sustituida por la Ley 1952 de 2019; no se verificó el numeral equivalente. La sentencia del puente aplicó el art. 53 original de la Ley 80; hoy rige su versión modificada por el art. 82 de la Ley 1474.
- **Fuentes (6):** F-061, F-144, F-181, F-242, F-364, F-487

#### EJE-17 · Informes de interventoría y supervisión de mala calidad: no avisan a tiempo, omiten hechos y no registran los incumplimientos de la entidad

- **Gravedad:** media. Debilita la defensa y la reclamación, pero no cuesta por sí solo el contrato.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** En los proyectos de regalías visitados por el DNP, más de la mitad tenía deficiencias de interventoría, y en los proyectos críticos la mayoría de los informes era de mala calidad u omitía situaciones. Al contratista de obra le importa por dos lados. El informe del interventor es la base de la audiencia de incumplimiento y de las multas (art. 86 de la Ley 1474). Y la supervisión casi solo vigila al contratista, de modo que los incumplimientos de la entidad (pagos tardíos, insumos entregados tarde) no quedan por escrito y luego cuesta probarlos. Las dos fichas que citan la misma tesis ubican el dato del 86 % en páginas distintas (p. 24 y p. 29, Tabla 7).
- **Causa:** Atomización de contratos que desborda la supervisión, poca exigencia sobre el contenido de los informes, controles dispares entre entidades (municipios de categoría 4 a 6) y la creencia de que la supervisión vigila solo al contratista.
- **Consecuencia en plata:** Hallazgos fiscales tardíos, multas apoyadas en informes débiles y reclamos del contratista sin prueba del incumplimiento de la entidad. La fuente no cuantifica el costo para el contratista.
- **Solución documentada:** Llevar una bitácora propia que registre por escrito también las obligaciones que incumple la entidad. Exigir que la citación del art. 86 venga con el informe de interventoría. Usar guías de seguimiento con controles por fase.
- **Cifras:**
  - «El 86 % de los informes de 200 proyectos críticos tiene deficiencias de calidad y el 61 % omite situaciones» (verificada: confirmada). p. 29, Tabla 7 · F-425.
  - «El 52,17 % de los proyectos visitados presentó deficiencias en la interventoría» (verificada: confirmada). p. 23 · F-425.
  - «Hallazgos por $27.899.000.000 asociados a deficiencias en la interventoría» (sin verificar (no entró en la verificación de normas)). p. 6 · F-425.
- **Vigencia a revisar:** Los datos del DNP son de regalías 2013-2018; el sistema de monitoreo pudo cambiar con la Ley 2056 de 2020 (no verificado).
- **Fuentes (5):** F-144, F-303, F-319, F-425, F-549

#### EJE-18 · Obra que queda inconclusa (elefante blanco): póliza afectada, liquidación trabada y el NIT en el registro de la Contraloría

- **Gravedad:** alta. Compromete la garantía y la reputación del contratista y lo expone a responsabilidad fiscal.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** Las obras inconclusas se concentran en acueducto y alcantarillado, vías y educación. En Antioquia, 71 obras tenían retrasos o problemas y 43 fueron declaradas inconclusas; en Magdalena, la Contraloría señaló 33 proyectos críticos con suspensiones y prórrogas repetidas. No hay una base de datos confiable a nivel nacional. La Ley 2020 de 2020 creó el Registro Nacional de Obras Civiles Inconclusas, que identifica a contratistas e interventores, y define como inconclusa la obra que no ha concluido un año después de vencido el término de liquidación.
- **Causa:** Estudios previos deficientes, presupuesto insuficiente, permisos (ambientales, de vertimiento) no gestionados antes de contratar, interventoría que firma sin revisar, lluvias usadas como excusa, corrupción y gobernantes nuevos que abandonan la obra del anterior.
- **Consecuencia en plata:** Póliza de cumplimiento afectada, liquidación que no llega, riesgo fiscal y el NIT del contratista en el registro.
- **Solución documentada:** Para la entidad: registro obligatorio (Ley 2020), cláusulas de garantía claras y un ítem climático en la matriz de riesgos. Para el contratista no hay una solución documentada; se infiere que conviene revisar el estado de los permisos y de la financiación antes de ofertar.
- **Cifras:**
  - «43 obras declaradas inconclusas por $176.060.301.385 en Antioquia» (sin verificar (no entró en la verificación de normas)). p. 11 · F-319.
  - «71 obras de todos los sectores con retrasos o algún tipo de problema en Antioquia» (sin verificar (no entró en la verificación de normas)). p. 10 · F-319.
  - «Obra inconclusa: la que no ha concluido un año después de vencido el término de liquidación» (sin verificar (no entró en la verificación de normas)). Ley 2020 de 2020, art. 2 lit. a · F-111.
  - «Proyectos con 22 suspensiones y 12 prórrogas» (sin verificar (no entró en la verificación de normas)). Comunicado de prensa CGR n.º 027 (7-feb-2024) · F-463.
- **Vigencia a revisar:** La cifra nacional («más de 1.400 obras, $25 billones») es de segunda mano; el registro de la Contraloría no abrió (403).
- **Fuentes (6):** F-111, F-315, F-319, F-425, F-463, F-466

#### EJE-19 · En acuerdos marco y Tienda Virtual, la minuta obliga a cotizar a precios casi congelados, con plazos cortos y reposición a costo propio

- **Gravedad:** media. Pérdida acotada al margen de las órdenes y a multas de monto limitado.
- **Tipos de contrato:** bienes
- **Descripción:** En el AMP de materiales de construcción y ferretería (CCE-255-AMP-2021), el proveedor está obligado a cotizar en todos los eventos de sus regiones, aunque no le sean rentables, so pena de cláusula penal y multas; solo puede abstenerse si la entidad le debe facturas. Los precios del catálogo solo se actualizan por materias primas en febrero y diciembre, cuando la variación supera el 10 %, y por IPC una vez al año; las órdenes en ejecución no se ajustan. En la Tienda Virtual, los grandes almacenes tienen entregas de 5 días hábiles y se inactivan si no responden solicitudes. En los AMP de bienes (uniformes), la orden se verifica línea por línea y un error de tallas o cantidades se repone a costo del proveedor, sin devolución de dinero.
- **Causa:** Cláusulas de la minuta del AMP y de los términos de uso de la TVEC.
- **Consecuencia en plata:** Las alzas de acero, PVC, cemento y demás insumos entre una ventana y otra las absorbe el margen. Hay multas de hasta el 10 % de la garantía de cumplimiento o de la orden, y retenciones territoriales no previstas si la entidad no las informa.
- **Solución documentada:** Cotizar, o probar la mora de la entidad. Pedir la actualización en la ventana, con el formato de CCE y facturas de hasta 6 meses. Responder las solicitudes de inclusión en 5 días hábiles y exigir que la solicitud de compra detalle los gravámenes territoriales. Leer la ficha técnica y controlar el despacho línea por línea.
- **Cifras:**
  - «Cláusula penal de hasta 20 SMMLV si el proveedor no cotiza en al menos 5 eventos en un año» (verificada: confirmada). Hoja 38, cl. 20.1 · F-062.
  - «Actualización de precios solo en febrero y diciembre si la variación de insumos supera el 10 %; las órdenes en ejecución no se modifican» (verificada: confirmada). Hoja 17 · F-062.
  - «Los grandes almacenes que no respondan 3 solicitudes de inclusión serán inactivados» (sin verificar (no entró en la verificación de normas)). p. 12, §X.B(c) · F-104.
- **Vigencia a revisar:** Son reglas de un AMP de 2021 y de los términos de la TVEC versión 2022; las generaciones posteriores pueden tener otras cifras.
- **Fuentes (4):** F-062, F-100, F-104, F-564

#### EJE-20 · Suspensiones mal usadas: unilaterales, sin plazo ni condición, para tapar la mala planeación, o dictadas por un juez como medida cautelar

- **Gravedad:** media. El costo es la mayor permanencia, reclamable si se documenta; el cobro de la póliza del caso vino con el abandono de la obra.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Según la jurisprudencia citada por un conferencista, la suspensión debe ser bilateral, motivada, por interés público o por un hecho no imputable, y sujeta a un plazo o a una condición; no es un remedio para la mala planeación de la entidad. En un caso (Acuavalle), cinco suspensiones terminaron en abandono de la obra y en el cobro de la póliza. Además, jueces de lo contencioso (sobre todo en Boyacá) han suspendido o terminado contratos como medida cautelar dentro de acciones populares.
- **Causa:** La entidad usa la suspensión para cubrir sus fallas de planeación, y el juez de la acción popular tiene una potestad cautelar amplia (Leyes 472 y 1437).
- **Consecuencia en plata:** Mayor permanencia con personal y equipo parados; la fuente no da cifra.
- **Solución documentada:** No aceptar suspensiones sin plazo o condición ni sin motivación, y dejar en el acta la salvedad de los costos. Frente a una medida cautelar solo quedan los recursos y pedirle al juez reglas para la liquidación.
- **Vigencia a revisar:** Todas las fuentes son videos; no se abrieron las sentencias.
- **Fuentes (3):** F-565, F-571, F-583

#### EJE-21 · Obligaciones sociales de ejecución que no están en el presupuesto: 5-10 % de población vulnerable y vinculación de personas con discapacidad

- **Gravedad:** media. Pérdida acotada al costo de cumplimiento y a las multas.
- **Tipos de contrato:** obra, bienes, servicios
- **Descripción:** El pliego puede exigir que entre el 5 % y el 10 % de los bienes o servicios del contrato los provea población vulnerable (pobreza extrema, desplazados, reincorporados, sujetos de especial protección), con causales de multa por incumplimiento injustificado que verifica el interventor (Ley 2069, art. 34, y Decreto 1860 de 2021). Una pieza de CCE de 2026 anuncia además el Decreto 0287 de 2026, que exigiría subcontratación inclusiva o vinculación de personas con discapacidad, verificada en cada pago.
- **Causa:** Normas de compras con enfoque social que se trasladan a la minuta.
- **Consecuencia en plata:** El costo de buscar y acreditar ese personal o proveedor, multas y pagos retenidos si el supervisor no da por cumplida la obligación; sin cifra.
- **Solución documentada:** Leer la minuta al costear la oferta, presupuestar el reclutamiento y la acreditación, conseguir los proveedores antes de firmar y guardar los soportes para el interventor.
- **Cifras:**
  - «Porcentaje de provisión no superior al 10 % ni inferior al 5 %, con sanciones por incumplimiento injustificado mediante causales de multa» (verificada: confirmada). Decreto 1860 de 2021, art. 2.2.1.2.4.2.16 · F-124.
- **Vigencia a revisar:** El Decreto 0287 de 2026 solo se vio en una pieza de 74 segundos: hay que verificar el número, la fecha, la vigencia y las cuantías. No se abrió el anexo del pliego tipo de obra que fija el porcentaje exacto.
- **Fuentes (4):** F-060, F-116, F-124, F-525

#### EJE-22 · Contratos de prestación de servicios encadenados con la misma entidad: riesgo de contrato realidad y de prescripción

- **Gravedad:** media. Pérdida acotada para personas naturales; no afecta el contrato de obra.
- **Tipos de contrato:** servicios
- **Descripción:** Las entidades cubren funciones permanentes con contratos de prestación de servicios sucesivos. Según la unificación SUJ-025-CE-S2-2021, si entre contratos de objeto igual o similar pasan 30 días hábiles o menos, no hay solución de continuidad; el reclamo de prestaciones debe hacerse dentro de los 3 años siguientes a la terminación del vínculo, y no se devuelven los aportes a salud. La C-614 de 2009 da criterios para saber si una función es permanente. Aplica a personas naturales; según la ficha, no aplica a los empleados privados del proponente de obra (inferencia).
- **Causa:** Contratos encadenados con subordinación (turnos, horario, órdenes) más allá del «término estrictamente indispensable» (Ley 80, art. 32-3).
- **Consecuencia en plata:** La persona natural pierde los salarios y prestaciones de toda la relación, o ve prescribir los de contratos anteriores si pasan más de 30 días hábiles entre uno y otro.
- **Solución documentada:** Diseñar los contratos por objeto y entregables, no por horario. Controlar el tiempo entre contratos y reclamar dentro de los 3 años.
- **Cifras:**
  - «No hay interrupción si no han pasado más de 30 días hábiles entre contratos de objeto igual o similar» (verificada: confirmada). p. 11 · F-171.
  - «Reclamar dentro de los 3 años siguientes a la terminación del vínculo; no procede la devolución de los aportes a salud» (sin verificar (no entró en la verificación de normas)). p. 12 · F-171.
- **Vigencia a revisar:** Una reforma laboral posterior a 2022 pudo cambiar el régimen; no se verificó.
- **Fuentes (6):** F-099, F-170, F-171, F-243, F-387, F-453

#### EJE-23 · Con entidades de régimen especial cambian las reglas de ejecución: sin tope de adición, sanciones del manual y sin imprevisión si no se protestó

- **Gravedad:** media. Puede costar el sobrecosto de una prestación o una sanción inesperada, pero depende del manual de cada entidad.
- **Tipos de contrato:** obra, bienes, servicios
- **Descripción:** En empresas de servicios públicos, ESE, Ecopetrol o canales de televisión rigen el derecho privado y el manual de cada entidad. En principio no hay tope del 50 % para las adiciones (CCE C-080 de 2022), el manual puede pactar multas y cláusula penal, y algunas entidades (las ESE, Res. 5185 de 2013) pueden usar a discreción cláusulas excepcionales como la caducidad; hay casos de empresas de servicios que la declararon sin tenerla pactada (Canta Rana, CE 2021). Según una tesis de la Corte Suprema (2012, art. 868 del Código de Comercio), no hay revisión por imprevisión si la prestación se cumplió sin protesta ni reserva; el ponente la critica y dice que el Consejo de Estado aún no ha fijado cómo se aplica en el régimen especial.
- **Causa:** Rigen el derecho privado y el manual de cada entidad; los arts. 40 y 27 de la Ley 80 no se aplican, y las potestades excepcionales se copian de un manual a otro.
- **Consecuencia en plata:** Sanciones unilaterales distintas a las del Estatuto y pérdida de todo el sobrecosto si se ejecuta sin reserva. En los casos de Telecafé y Ecopetrol, la demanda se perdió por elegir mal la vía y por falta de prueba.
- **Solución documentada:** Leer en los términos de condiciones si la entidad aplicará cláusulas excepcionales y qué topes de adición fija su manual. Protestar o reservar por escrito ANTES de ejecutar la prestación que se volvió más cara, y demandar con base en el art. 868 del Código de Comercio.
- **Cifras:**
  - «Las entidades de régimen especial en principio no tienen tope respecto al monto de sus adiciones» (sin verificar (no entró en la verificación de normas)). Guía de régimen especial CCE, pág. 28 · F-053.
- **Vigencia a revisar:** La guía de régimen especial es un borrador con comentarios (versión 02, «xx/08/2025»). La sentencia de la Corte Suprema se citó de oídas, sin abrirla.
- **Fuentes (4):** F-053, F-155, F-273, F-554

#### EJE-24 · Un integrante del consorcio o la unión temporal queda inhabilitado durante la ejecución y el contrato de todos queda en riesgo

- **Gravedad:** alta. Puede costarles el contrato a todos los integrantes.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Ante una inhabilidad sobreviniente de un integrante, la única salida es ceder su participación a un TERCERO externo que cumpla los requisitos, con autorización escrita de la entidad; no se puede ceder a los otros socios ni renunciar. Si la cesión no es posible, la entidad puede terminar el contrato unilateralmente, con compensaciones y previa actuación con debido proceso; ese solo hecho no basta para declarar la caducidad (CCE C-1032 de 2026). Si la inhabilidad es por corrupción (literal j, Ley 2014 de 2019), las consecuencias son más severas.
- **Causa:** Inhabilidad sobreviniente de un integrante, por ejemplo por sanciones o por hechos de corrupción.
- **Consecuencia en plata:** Terminación unilateral del contrato para todos los integrantes si no se encuentra un cesionario; la fuente no da cifra.
- **Solución documentada:** Tener identificado un posible cesionario que cumpla los requisitos y tramitar la autorización escrita de la entidad.
- **Fuentes (2):** F-066, F-173

#### EJE-25 · El subcontratista no puede cobrarle a la entidad: todo el riesgo de pago y de calidad queda en el contratista principal

- **Gravedad:** media. Pérdida acotada al valor de lo subcontratado.
- **Tipos de contrato:** obra
- **Descripción:** La relación entre contratista y subcontratista es privada: el subcontratista no tiene acción directa contra la entidad para cobrar, y la entidad no puede exigirle nada a él; si el subcontratista falla, responde el principal. Una firma de abogados lo señala como un vacío normativo.
- **Causa:** El subcontrato es independiente del contrato estatal.
- **Consecuencia en plata:** Si la entidad no paga, el principal le debe igual al subcontratista; si el subcontratista falla, el principal asume la multa o el reproceso. Sin cifra.
- **Solución documentada:** No hay una solución documentada; se infiere pactar en el subcontrato pagos espejo y garantías propias.
- **Vigencia a revisar:** Fuente única: un video de 2 minutos.
- **Fuentes (1):** F-496

### 3.7 Liquidación y reclamaciones (22)

#### LIQ-01 · Firmar el acta de liquidación bilateral sin salvedades, o con una salvedad genérica, mata todo reclamo pendiente

- **Gravedad:** alta. Hace perder de una vez todas las reclamaciones económicas del contrato.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El acta de liquidación de mutuo acuerdo se trata como transacción y paz y salvo: solo se puede discutir después lo que quedó salvado de forma expresa, clara y concreta, o lo que se ataque por error, fuerza o dolo. Una frase como «me reservo el derecho a reclamar por desequilibrio económico» fue rechazada (CE 71.036, 2025); en cambio una salvedad con concepto y cifra exacta permitió cobrar (CE 68.140, 2025). La unificación de 2023 que relajó las salvedades durante la ejecución NO alcanza la liquidación bilateral. Lo posterior y desconocido al firmar (p. ej. un daño de estabilidad que aparece después) sí puede reclamarse. Un laudo citado en video aceptó como suficiente dejar constancia en el acta de un pleito pendiente.
- **Causa:** Se firma rápido para cobrar el saldo, se trata el acta como un formato, o se cree que la unificación de 2023 eliminó la carga de salvar también en la liquidación.
- **Consecuencia en plata:** Se pierde todo saldo, mayor cantidad, mayor permanencia, reajuste o sobrecosto no salvado en el acta.
- **Solución documentada:** Escribir en el acta cada reclamación pendiente con concepto, causa y, de ser posible, valor, remitiendo a los oficios de reclamación con su fecha; dejar constancia de los pleitos en curso; si no hay acuerdo en algo, no firmar paz y salvo total y dejar que la entidad liquide unilateralmente ese punto.
- **Cifras:**
  - «Salvedad aceptada por $67.042.762,49 de obras adicionales, que permitió cobrar (CE 68.140)» (sin verificar (no entró en la verificación de normas)). CE 68140 (19-may-2025), p. 46 · F-224.
- **Vigencia a revisar:** Algunas fuentes académicas citan el art. 136 del CCA, hoy art. 164 del CPACA.
- **Fuentes (12):** F-119, F-142, F-178, F-195, F-224, F-230, F-326, F-506, F-531, F-577, F-582, F-584

#### LIQ-02 · Creer que firmar otrosíes, prórrogas o suspensiones sin salvedad hizo perder el reclamo: desde el 27-jul-2023 el silencio no es renuncia

- **Gravedad:** media. Es una oportunidad de recuperar dinero que se da por perdido; el riesgo es no reclamar, no una sanción.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La sentencia de unificación de la Sala Plena de la Sección Tercera (exp. 39.121, 27-jul-2023) ordenó al juez estudiar las pretensiones aunque el contratista no haya hecho salvedad al firmar suspensiones, adiciones o prórrogas, e interpretar lo que realmente acordaron las partes. La regla se aplica también a procesos que ya estaban en curso (CE 68.709, 2025). Doctrina y manuales anteriores (p. ej. Rojas Poveda 2022) siguen describiendo la vieja «regla de oportunidad», y hay entidades que la alegan. Tensión entre fuentes: en el caso Vicon (CE 68.440, abril 2024, posterior a la unificación) el fallo todavía menciona que el contratista no dejó salvedades en las prórrogas, junto a la falta de prueba del sobrecosto; por eso dejar salvedad sigue siendo prudente. La salvedad sigue siendo obligatoria en la liquidación bilateral.
- **Causa:** Literatura y asesoría anteriores a 2023, y entidades que siguen alegando que el silencio al firmar equivale a renuncia.
- **Consecuencia en plata:** Un contratista mal asesorado deja de demandar un sobrecosto que sí era cobrable. En el caso Convel se cobraron costos de administración por mayor permanencia aunque se firmaron prórrogas en silencio.
- **Solución documentada:** Revisar con la regla vigente (SU 39.121) los reclamos que se creían perdidos por firmar modificaciones sin salvedad; aun así, dejar salvedad concreta en cada prórroga o suspensión y, siempre, en la liquidación bilateral.
- **Vigencia a revisar:** Si el Complemento de Detekta («firmar sin salvedades») aplica la regla vieja a las actas intermedias, debe corregirse (señalado por dos fichas).
- **Fuentes (6):** F-178, F-201, F-204, F-210, F-250, F-338

#### LIQ-03 · Reclamar mayor permanencia con la fórmula de la oferta o un porcentaje del AIU, sin costos reales probados: se pierde aunque la demora sea culpa de la entidad

- **Gravedad:** alta. Es la causa más repetida de demandas perdidas; se pierden reclamaciones de miles de millones y se pagan costas.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** El Consejo de Estado niega de forma reiterada la mayor permanencia (de obra o de interventoría) y el desequilibrio cuando el contratista los calcula multiplicando la administración ofertada por los días de prórroga, con porcentajes del AIU, con nóminas sueltas o con un peritaje sin metodología o basado en un software contable. Exige probar: (i) el tiempo extra, (ii) una causa imputable a la entidad, (iii) los sobrecostos reales efectivamente pagados y (iv) que eran inevitables, descontando lo que ya pagaban las obras adicionales y los precios unitarios. Casos: Vicon/IDU (68.440: se declaró el incumplimiento del IDU y no se pagó nada), interventoría que pasó de 10 a 61 meses (71.510: todo negado con costas), Ministerio de Cultura (74.181), Soacha (73.418), Arquitectura y Concreto (72.944, tras 15 años), 61.023, 64.011, 70.505, 64.416.
- **Causa:** El consorcio no lleva contabilidad separada por contrato ni registro contemporáneo de recursos parados; cuantifica tarde, con fórmulas, y el perito trabaja solo con información del contratista.
- **Consecuencia en plata:** Reclamaciones negadas enteras, más condena en costas. Ejemplos fichados: Vicon reclamaba cerca de 6.000 millones y recibió cero; en 71.510 se negaron pretensiones por $4.253.604.614.
- **Solución documentada:** Desde el día uno, contabilidad por contrato (ingresos, costos y gastos, art. 18 del Estatuto Tributario) con comprobantes de pago, planillas de seguridad social y alquileres; registro diario de equipos y personal en espera con fechas y causa; imputar atrasos con ruta crítica; dictamen pericial que abarque toda la ecuación financiera, neutralice ingresos ya recibidos y explique su método.
- **Cifras:**
  - «Interventoría pactada a 10 meses que se prolongó hasta 61 meses; mayor permanencia negada» (sin verificar (no entró en la verificación de normas)). CE 71510 (27-feb-2026), síntesis · F-236.
  - ««resulta insuficiente probar este daño a partir de simples operaciones aritméticas que simplemente multipliquen los valores propuestos en la oferta por el tiempo extra»» (sin verificar (no entró en la verificación de normas)). CE 68440 (12-abr-2024), num. 19 · F-210.
- **Fuentes (14):** F-175, F-177, F-186, F-204, F-210, F-213, F-225, F-227, F-232, F-235, F-236, F-237, F-420, F-426

#### LIQ-04 · Perder el juicio por no llevar al expediente el pliego, sus anexos y la matriz de riesgos

- **Gravedad:** alta. Hace perder una reclamación ganable por un defecto documental.
- **Tipos de contrato:** obra, interventoría, todos los tipos
- **Descripción:** En Proviales vs. IDU (CE 71.426, 2025) la falta de salvedad ya no era obstáculo, pero se negaron la mayor permanencia por suspensiones y el bodegaje porque el contratista no aportó el pliego con sus anexos técnicos ni la matriz de riesgos ni el acta de asignación: en un ítem a precio global el juez no pudo saber quién asumía el riesgo ni qué incluía el precio. Pedir «todo el expediente» de forma genérica no sirve; el juez lo niega. En Ingeconas (CE 69.090, 2026) se negó el desequilibrio por no probar que los sobrecostos se causaron.
- **Causa:** La demanda anexa solo el contrato, las cartas y las actas; el pliego se da por sabido.
- **Consecuencia en plata:** Se niega la reclamación de fondo; en Proviales solo se cobró el saldo del 5 % retenido.
- **Solución documentada:** Guardar desde la oferta copia íntegra del pliego, adendas, anexos técnicos, matriz de riesgos, acta de asignación, oferta con APU y respuestas de la interventoría, y aportarlos con la demanda o pedirlos de forma puntual.
- **Fuentes (3):** F-178, F-204, F-228

#### LIQ-05 · Mayores cantidades, obras adicionales o avance de obra sin actas de medición ni informes de interventoría: no se cobran ni en la liquidación ni en el juicio

- **Gravedad:** alta. Se pierde el pago de obra ya ejecutada, en el caso fallado cientos de millones.
- **Tipos de contrato:** obra
- **Descripción:** Lo ejecutado por orden verbal o por necesidad de la obra, sin acta de recibo parcial, medición firmada o modificación del contrato, se pierde: el Consejo de Estado revocó $781,9 millones de mayores cantidades y obras adicionales (UT Mepy vs. FORPO, 72.378) y negó obra «ejecutada y no pagada» que solo figuraba en un consolidado de la interventoría (71.337). Un dictamen hecho con los estados financieros del contratista, y no con las cantidades de las actas, no prueba nada (68.440). Lo mismo pasa al liquidar: si el avance no quedó documentado por ítem, interventoría, entidad y contratista discuten porcentajes distintos. Ganó quien tenía el informe detallado de la interventoría y actas parciales marcadas como provisionales (67.508). En un caso narrado en video se perdió el pleito sobre la inversión del anticipo por no aportar informes técnicos ni perito (cifras del video de baja confiabilidad). Mayores cantidades: requieren autorización y recibo; ítems no previstos: APU, modificatorio y registro presupuestal previo (CCE, C-915 de 2026).
- **Causa:** Se ejecuta sin acta de medición o recibo dentro de la vigencia del contrato, y se intenta probar al final con testigos, consolidados o contabilidad propia.
- **Consecuencia en plata:** Obra ejecutada que no se paga; saldo final en disputa y litigio.
- **Solución documentada:** Medir y firmar actas parciales por ítem durante la obra; no ejecutar ítems no previstos sin APU aprobado y modificatorio con registro presupuestal; pedir el equilibrio durante la vigencia del contrato y no al final (CE 52.360); si no hay acuerdo de avance al liquidar, acuerdo parcial con los puntos en disputa anotados.
- **Cifras:**
  - «Avance discutido al liquidar: interventoría 85 %, entidad 87,5 %, contratista 99 %» (sin verificar). video de Gilberto Pedraza, min 53 · F-558. Nota del verificador: Fuente audiovisual: no se puede abrir ni transcribir desde esta sesión. Es un caso narrado, no un dato normativo.
  - ««no acreditan que quedaron cantidades de obra sin remunerar que hubieran sido ejecutadas con respaldo en el contrato»» (sin verificar (no entró en la verificación de normas)). CE 72378, considerando 11 · F-212.
- **Vigencia a revisar:** Lo del anticipo viene de un resumen en audio de una sentencia del 13-mar-2026 que no se abrió.
- **Fuentes (10):** F-003, F-178, F-194, F-207, F-210, F-212, F-233, F-531, F-558, F-583

#### LIQ-06 · Hacer obra extra de palabra y luego cobrarla por enriquecimiento sin causa: la vía no procede

- **Gravedad:** alta. Se pierde todo lo ejecutado sin respaldo escrito; en el caso, tres cuartas partes del valor del contrato.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Si hay contrato, el conflicto va por controversias contractuales; el enriquecimiento sin causa es excepcional y subsidiario (unificación del 31-jul-2025 transcrita por la relatoría; antes, SU del 19-nov-2012, exp. 24.897, que solo lo admite si hubo constreñimiento de la entidad, necesidad imperiosa o urgencia manifiesta no declarada). En Arquitectura y Concreto (72.944) la pretensión subsidiaria de enriquecimiento se declaró improcedente. Caso típico: el subcontratista de una fundación, ESAL o empresa pública que ejecuta un convenio interadministrativo cree que su contrato es privado, acuerda mayores obras y plazo de palabra y no puede cobrarlos, porque las modificaciones de un contrato estatal deben constar por escrito (CE 60.908). Referencia comparada: en Perú los reclamos por adicionales no aprobados tampoco van a arbitraje (la analogía con Colombia es inferencia de un fichador).
- **Causa:** Cambios de cantidades, plazo o precio acordados verbalmente, y desconocimiento de la naturaleza jurídica de la contratante.
- **Consecuencia en plata:** En el caso 60.908 el contratista perdió una reclamación de $623.889.385 sobre un contrato de $821.750.000.
- **Solución documentada:** No ejecutar ningún cambio sin modificatorio escrito; verificar la naturaleza jurídica de quien contrata; demandar por la vía contractual, no por enriquecimiento sin causa.
- **Vigencia a revisar:** La unificación del 31-jul-2025 se conoce por la ficha de relatoría; falta su radicado.
- **Fuentes (4):** F-219, F-235, F-247, F-339

#### LIQ-07 · Dejar vencer los plazos de liquidación y caducidad (4 meses + 2 meses + 2 años): el saldo, las retenciones y los reclamos se pierden

- **Gravedad:** alta. Hace perder el saldo final, las retenciones y cualquier reclamación del contrato.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La Ley 1150 (art. 11) da 4 meses para liquidar de mutuo acuerdo (o el plazo del pliego), 2 meses más para la liquidación unilateral y 2 años adicionales en los que aún se puede liquidar o demandar; el art. 164 del CPACA cuenta los 2 años de caducidad desde hitos distintos según cómo se liquidó (firma del acta, ejecutoria del acto unilateral, o vencimiento de los 4+2 meses si nunca se liquidó). La cadena llega a cerca de 30 meses con la plata retenida. Vencida la caducidad, la entidad pierde la competencia para liquidar y el contratista la acción. Las sumas del acta de recibo final no son exigibles mientras no se liquide (guía CCE 2016). Si se liquida tarde dentro de los 2 años, la caducidad corre desde esa liquidación (auto de unificación 62.009 de 2019), pero según decisiones posteriores citadas por un magistrado auxiliar, una liquidación tardía no revive pretensiones que ya habían caducado (atrasos, desequilibrio). Contradicción: la guía CCE de 2016 dice que liquidar fuera de término es ilegal, criterio que el auto de 2019 modificó para el cómputo de la caducidad.
- **Causa:** El contratista espera que la entidad convoque sin llevar la cuenta de los plazos, o calcula mal desde qué hito corren los 2 años.
- **Consecuencia en plata:** Se pierden el saldo final, la retención (5-10 %) y todas las reclamaciones; en dos casos fallados el saldo retenido fue de $438 y $580 millones. Una demanda fuera de término se pierde sin estudio de fondo.
- **Solución documentada:** Llevar el calendario desde la terminación; pedir la liquidación por escrito; si no hay acuerdo, dejar constancia escrita para que corra la unilateral; pasados 6 meses sin liquidación, demandar la liquidación judicial dentro de los 2 años; radicar conciliación ante la Procuraduría, que suspende la caducidad hasta 3 meses (la prórroga de mutuo acuerdo no la suspende, Ley 2220 art. 96); acumular en una demanda la reclamación vieja y la del acto posterior; si hay acta bilateral con saldo claro, cobro ejecutivo.
- **Cifras:**
  - «Plazos: 4 meses (mutuo acuerdo), 2 meses (unilateral) y 2 años siguientes» (sin verificar (no entró en la verificación de normas)). Ley 1150 de 2007, art. 11 · F-142.
  - ««las entidades estatales tienen un plazo máximo de 30 meses» para liquidar» (sin verificar (no entró en la verificación de normas)). conferencia de Alexandra Quintero Fajardo, min 74 · F-531.
  - «Caducidad contractual: «el término para demandar será de dos (2) años»» (sin verificar (no entró en la verificación de normas)). CPACA art. 164 num. 2 lit. j · F-143.
  - «La conciliación prejudicial suspende la caducidad hasta 3 meses; la prórroga de mutuo acuerdo no la suspende» (sin verificar (no entró en la verificación de normas)). Ley 2220 de 2022, art. 96 parágrafo · F-149.
- **Vigencia a revisar:** El art. 11 de la Ley 1150 remite al art. 136 del CCA, hoy art. 164 del CPACA; la página del Senado marca notas de jurisprudencia de unificación sobre los numerales iii) y iv) del lit. j que no se abrieron.
- **Fuentes (18):** F-088, F-119, F-142, F-143, F-149, F-176, F-204, F-220, F-325, F-326, F-400, F-531, F-551, F-552, F-558, F-568, F-582, F-584

#### LIQ-08 · La garantía de estabilidad se hace efectiva años después del recibo, y el plazo para demandar ese siniestro es de 2 años desde el acto

- **Gravedad:** alta. Puede costar el valor de la garantía y su recobro años después de cerrado el contrato.
- **Tipos de contrato:** obra, bienes
- **Descripción:** El amparo de estabilidad y calidad cubre cualquier daño o deterioro imputable al contratista durante al menos 5 años desde el recibo; la entidad puede declarar el siniestro por acto administrativo dentro de los 2 años de prescripción ordinaria (art. 1081 C. de Co.) desde que conoce el daño, aun con la póliza vencida, y la aseguradora repite contra el contratista. El contratista suele creer que con el acta de recibo y la liquidación quedó libre, o que debe atacar el acto con la nulidad de 4 meses. Según jurisprudencia citada en una conferencia (auto 2-mar-2020; exp. 53.804 de 2022), se demanda como controversia contractual dentro de 2 años desde el acto de siniestro, discutiendo solo ese acto, sin revivir reclamaciones caducadas.
- **Causa:** Se da por cerrada la responsabilidad con el recibo y la liquidación; se desconoce el plazo para atacar la declaratoria de siniestro.
- **Consecuencia en plata:** Queda firme la efectividad de la póliza y el recobro de la aseguradora contra el contratista; la cuantía la fija la entidad.
- **Solución documentada:** Guardar el dossier de calidad (ensayos, bitácora, planos récord) y dejar constancia en el recibo de las deficiencias de diseño ajenas; demandar el acto de siniestro como controversia contractual dentro de los 2 años.
- **Cifras:**
  - «Declaración del siniestro «dentro del término de dos (2) años de prescripción ordinaria»» (sin verificar (no entró en la verificación de normas)). Narváez Bonnet (2014), p. 114 · F-321.
- **Vigencia a revisar:** Narváez analiza el Decreto 1510 de 2013 (hoy en el Decreto 1082 de 2015) y cita el art. 66 del CCA, sustituido por el art. 91 del CPACA.
- **Fuentes (3):** F-321, F-326, F-551

#### LIQ-09 · Reclamar desequilibrio sin pedir la nulidad del acta de liquidación unilateral: el juez no estudia el fondo

- **Gravedad:** alta. Hace perder la reclamación entera por un defecto de la demanda.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Según una panelista en un evento de la Cámara de Comercio de Bogotá, la sentencia CE 52.510 (30-ago-2017, Subsección A) se negó a estudiar el desequilibrio porque hacerlo implicaba tocar la legalidad del acto de liquidación unilateral que declaró que no se debía nada y que no fue demandado.
- **Causa:** La demanda pide las sumas pero no la nulidad del acto unilateral que liquidó el contrato.
- **Consecuencia en plata:** Se pierde toda la pretensión aunque el desequilibrio esté probado.
- **Solución documentada:** Si hay liquidación unilateral, pedir siempre su nulidad junto con las pretensiones económicas.
- **Vigencia a revisar:** La sentencia se cita de oídas en un panel y no se abrió; puede haber jurisprudencia posterior en otro sentido.
- **Fuentes (1):** F-540

#### LIQ-10 · Esperar a agotar el arreglo directo o la cláusula escalonada mientras corre la caducidad

- **Gravedad:** alta. Puede hacer caducar la reclamación entera.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Cláusulas que obligan a negociar, luego amigable composición y solo después juez o árbitro han sido usadas por una de las partes para dejar correr el plazo. El art. 13 del Código General del Proceso dice que esas estipulaciones «no son de obligatoria observancia»: se puede demandar sin agotarlas y hacerlo no es incumplimiento.
- **Causa:** El contratista cree que debe agotar los pasos previos antes de demandar.
- **Consecuencia en plata:** Se pierde la acción por caducidad mientras se negocia.
- **Solución documentada:** Llevar el reloj de caducidad en paralelo a la negociación y demandar a tiempo sin esperar a agotar la cláusula (CGP art. 13).
- **Fuentes (2):** F-156, F-530

#### LIQ-11 · Reclamar el desequilibrio por la vía equivocada: por imprevisión solo se recupera hasta el punto de no pérdida, sin utilidad

- **Gravedad:** alta. Define si se recupera la utilidad o si se pierde la demanda entera.
- **Tipos de contrato:** obra, todos los tipos
- **Descripción:** Cada vía (incumplimiento de la entidad, ejercicio de poderes unilaterales, hecho del príncipe, imprevisión) exige pruebas distintas y paga distinto. Por imprevisión (Ley 80 art. 5.1) solo se reconocen los mayores costos hasta el punto de no pérdida, sin utilidad; si la causa es un incumplimiento de la entidad, se restablece la ecuación original (inferencia de un fichador: con la utilidad pactada). El Consejo de Estado trata las sujeciones materiales imprevistas (geología, aguas subterráneas) como imprevisión (exp. 32.437 de 2016), sin fórmula para saber cuándo la alteración es grave, y exige seguir ejecutando para reclamar (exp. 37.910 de 2019). Un docente que revisó sentencias señala la mala escogencia de régimen y la falta de prueba como causa principal de las demandas perdidas. Probar exige abrir toda la estructura de costos.
- **Causa:** Se reclama sin identificar la causa jurídica del desequilibrio ni preparar la prueba que esa vía exige.
- **Consecuencia en plata:** Demanda perdida o, aun ganando por imprevisión, se recupera la pérdida pero no la utilidad.
- **Solución documentada:** Identificar causa y vía antes de reclamar; encuadrar en incumplimiento de la entidad cuando los hechos lo permitan (diseños o planos incompletos, permisos a cargo de la entidad); probar con la estructura de costos completa, comparando lo ofertado con lo que de verdad costó; seguir ejecutando.
- **Cifras:**
  - «Imprevisión: restablecimiento solo «a un punto de no pérdida»» (sin verificar (no entró en la verificación de normas)). Ley 80 de 1993, art. 5 num. 1 · F-114.
- **Fuentes (5):** F-114, F-365, F-411, F-550, F-554

#### LIQ-12 · Reclamar por un riesgo que la matriz asignó al contratista o que se podía advertir en el pliego: no se restablece

- **Gravedad:** alta. Deja todo el sobrecosto en el contratista, sin vía de recuperación.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La entidad defiende que lo que la matriz de riesgos asignó al contratista (art. 4 Ley 1150) no se restablece. En FONDECUN (CE 69.580, 2025), con precios unitarios fijos sin reajuste y riesgo cambiario asignado al contratista, se negó toda la reclamación por devaluación y se razonó que el mayor costo no se probó por fuera de los imprevistos del AIU. La mala planeación de la entidad (estudios de costos desfasados) solo sirve si el contratista demuestra que, con su experiencia, no podía advertir el error antes de firmar (CE 67.446, 2024). Los reclamos por impuestos o contribuciones nuevos casi nunca prosperan: en los exps. 16.017, 19.304 y 21.990 no se reconoció ruptura del equilibrio.
- **Causa:** Se oferta sin leer la matriz de riesgos, la cláusula de reajuste ni los estudios de costos, confiando en reclamar después.
- **Consecuencia en plata:** El sobrecosto (devaluación, impuesto nuevo, error del presupuesto oficial) lo asume el contratista.
- **Solución documentada:** Revisar matriz de riesgos, cláusula de reajuste y presupuesto antes de ofertar; observar el pliego; fijar la I del AIU según los riesgos que se asumen; si el error del estudio no era detectable, documentarlo.
- **Vigencia a revisar:** El artículo sobre tributos es de 2018 y no se verificó jurisprudencia posterior; el ensayo sobre la matriz es opinión sin datos.
- **Fuentes (5):** F-025, F-190, F-234, F-340, F-419

#### LIQ-13 · Al liquidar, la entidad descuenta los imprevistos del AIU que el contratista no demostró haber gastado

- **Gravedad:** media. Pérdida acotada al porcentaje de imprevistos, recuperable con salvedad y reclamo.
- **Tipos de contrato:** obra, interventoría, consultoría
- **Descripción:** No hay regla única sobre los imprevistos: la Contraloría General (concepto 075 de 2019) dijo que sin evento no se pagan; el IDU los paga por acta al porcentaje fijo; la Contraloría de Medellín (2021) dice que si el contrato calla se pagan sin prueba; la guía de obra de CCE (2025) remite a lo pactado y al concepto CGR-OJ 093 de 2022, que habría replanteado el de 2019 (sin verificar en fuente primaria). El Consejo de Estado, en Proviales (71.426, 2025), ordenó no descontar los imprevistos porque, salvo pacto en contrario, forman parte del precio convenido. Las fuentes se contradicen entre órganos de control y juez.
- **Causa:** La entidad trata la I del AIU como bolsa reembolsable y no como parte del precio.
- **Consecuencia en plata:** El porcentaje de imprevistos ofertado se descuenta en la liquidación o genera hallazgo fiscal.
- **Solución documentada:** Leer en el pliego y la minuta cómo se paga la I; si se exige prueba, documentar cada evento ante la interventoría; si se descuenta sin pacto, objetar y dejar salvedad en la liquidación.
- **Cifras:**
  - «Imprevistos descontados en la liquidación que el Consejo de Estado ordenó no descontar: $49.157.899» (sin verificar (no entró en la verificación de normas)). CE 71426, págs. 33-34 · F-204.
- **Vigencia a revisar:** Un contrato que pacte la devolución de imprevistos no usados podría resolverse distinto; la posición vigente de la CGR (concepto 093 de 2022) no se verificó.
- **Fuentes (6):** F-006, F-120, F-121, F-139, F-165, F-204

#### LIQ-14 · Demandar una adjudicación ilegal: aun ganando, sin probar que su oferta era la mejor y su utilidad no se cobra nada

- **Gravedad:** media. No se pierde plata del contrato, pero el pleito puede costar años y costas sin recuperar nada.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La utilidad dejada de percibir no se presume por la sola ilegalidad: hay que probar desde la demanda que la propia oferta habría ganado (recalculando la fórmula y el orden de elegibilidad) y cuánto se iba a ganar, con la propuesta misma, pruebas técnicas o dictamen; una reconstrucción posterior de costos no sirve (CE 55.342, 2026). En CE 60.796 y 25.646 hubo nulidad y cero indemnización. Sin utilidad discriminada en la oferta, el juez aplica un 5 % del valor de la propuesta como referencia o condena en abstracto. El proceso tarda unos 12 años en promedio (muestra de un autor) y la adjudicación no admite recursos ni suspende la firma automáticamente. Contradicción: un artículo de 2007 describe indemnizaciones entre el 50 % y el 100 % de la utilidad esperada según la postura jurisprudencial, criterio anterior al CPACA y no verificado como vigente.
- **Causa:** Carga de la prueba en el oferente; ofertas sin el AIU y la utilidad desglosados ni el APU conservado.
- **Consecuencia en plata:** Demanda ganada sin indemnización, o limitada al 5 % del valor de la propuesta, sin administración ni imprevistos, una década después. En CE 60.644 se pidió el 16 % y se reconoció el 4,7 % ($246.761.177 actualizados).
- **Solución documentada:** Pelear antes de adjudicar (observaciones al informe y en la audiencia); conservar la oferta completa con APU, AIU y utilidad discriminada; guardar el puntaje y el orden de elegibilidad recalculado; pedir medida cautelar si se demanda.
- **Cifras:**
  - «Demandas contra la adjudicación tardan 12 años en promedio» (sin verificar (no entró en la verificación de normas)). Trujillo (2020), p. 26 (pág. PDF 30) · F-429.
  - «Indemnización de referencia: 5 % del valor total de la propuesta» (verificada: confirmada). CE 60644, pág. 39 · F-189.
  - «Puntaje de la demandante 625, inferior al del adjudicatario: sin indemnización pese a la nulidad» (sin verificar (no entró en la verificación de normas)). CE 60796 (2-jun-2021) · F-199.
  - «Segunda postura: se deduce el 50 % de la utilidad bruta estimada si no se prueban gastos» (verificada: confirmada). Rico Puerta (2007), p. 121 · F-335.
- **Vigencia a revisar:** El promedio de 12 años sale de una muestra del autor; el criterio del 50-100 % es de 2007. El plazo de caducidad citado es de 4 meses (art. 164 CPACA); 30 días era el régimen anterior.
- **Fuentes (9):** F-173, F-188, F-189, F-199, F-217, F-218, F-335, F-429, F-473

#### LIQ-15 · Reclamar en juicio a la entidad tarda años, se pierde con frecuencia y cuesta costas

- **Gravedad:** media. No hace perder el derecho, pero inmoviliza la plata años y puede sumar costas.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La ANDJE estima en 5,94 años la duración media de un proceso no laboral; fuentes de 2013-2015 hablaban de 9 a 15 años para lo contractual. Casos fichados duraron de 1999 a 2023, de 2010 a 2025 o de 2018 a 2026. Perder trae costas (art. 188 CPACA, art. 365 CGP). En arbitraje contra entidades nacionales (2015-2026), la entidad pierde en 4 de cada 10 laudos y lo condenado ronda el 44,5 % de lo pedido; Transporte concentra un tercio. El arbitraje dura 6 meses prorrogables 6 (Ley 1563 art. 10) y cuesta entre el 4,5 % y el 13 % de la pretensión más IVA (tabla CCB 2026), y solo existe si hay pacto arbitral. Ya con sentencia, las entidades nacionales pagaron lo contractual en 8,08 meses de media (muestra 2011-2012).
- **Causa:** Congestión de la jurisdicción contenciosa, dos instancias y conciliación prejudicial poco eficaz.
- **Consecuencia en plata:** El reclamo pierde valor presente, la liquidez queda atrapada y, si se pierde, se pagan agencias en derecho (1 SMLMV por demandante en 74.181; 3 SMLMV en 73.418). Una pretensión inflada se recorta a menos de la mitad (inferencia de un fichador).
- **Solución documentada:** Evitar el pleito con prueba y salvedades durante la obra; valorar pacto arbitral, amigable composición o paneles de resolución de disputas; conciliación prejudicial; cuantificar pretensiones realistas.
- **Cifras:**
  - «Duración promedio de un proceso no laboral: 5,94 años» (sin verificar (no entró en la verificación de normas)). ANDJE, Informe de litigiosidad 2T-2026, p. 13 · F-455.
  - «200 laudos con la Nación convocada: 79 desfavorables a la entidad (40 %); condenas $3.497.635 millones frente a pretensiones $7.855.674 millones (44,5 %)» (verificada: confirmada). ANDJE, Informe de litigiosidad 2T-2026, pág. 44 · F-456.
  - «64 arbitrajes activos contra la Nación con pretensiones por $6,75 billones» (sin verificar (no entró en la verificación de normas)). ANDJE, Informe 2T-2026, pág. 41 · F-456.
  - «Proceso contractual: «puede demorar entre 9 y 15 años»; 10,3 % de los expedientes de la Sección Tercera son contractuales» (verificada: confirmada). Unigarro (2015), p. 14 y p. 12 · F-432.
  - «Pago de condenas contractuales por entidades nacionales: 8,08 meses de media» (sin verificar (no entró en la verificación de normas)). ANDJE (2014), tabla 5, p. 29 · F-458.
- **Vigencia a revisar:** Los datos de 9-15 años son de 2013-2015, antes de la Ley 2080 de 2021; el estudio de pagos usa datos 2011-2012; la tabla CCB se expresa en UVB que cambia cada año.
- **Fuentes (11):** F-045, F-143, F-145, F-232, F-237, F-334, F-371, F-432, F-455, F-456, F-458

#### LIQ-16 · Contratos con empresas de servicios públicos (ESP): régimen privado, sin desequilibrio de Ley 80 y con la vía judicial incierta

- **Gravedad:** alta. Puede dejar sin vía de reclamo un desequilibrio o una adjudicación indebida.
- **Tipos de contrato:** obra, interventoría, consultoría, bienes, servicios
- **Descripción:** Los contratos de las ESP se rigen por el derecho privado (Ley 142, arts. 31-32) aunque el pliego remita genéricamente a la Ley 80 (CE 69.340, 2023): no cabe el desequilibrio económico del Estatuto, solo la imprevisión del art. 868 del Código de Comercio. Para atacar una evaluación o adjudicación de un prestador de servicios públicos domiciliarios no hay recurso ni nulidad: según la SU 42.003 de 2020 sus actos precontractuales son privados y la vía es la reparación directa por perjuicios probados (en el caso EAAB, la unión temporal perdió). Contradicción histórica: en 2016 la Sección Tercera calificó esos actos como administrativos y en 2017 como no administrativos (tesis de 2019), lo que dejó dudas sobre la acción y el plazo; la SU de 2020 las zanja para los domiciliarios, y extenderla a ESE, universidades o Ecopetrol es inferencia.
- **Causa:** No se identifica antes de ofertar que la contratante es una ESP o entidad exceptuada.
- **Consecuencia en plata:** La reclamación por desequilibrio se cae; elegir mal la acción cuesta el proceso; solo se indemniza el daño probado, no se recupera la adjudicación.
- **Solución documentada:** Identificar la naturaleza de la contratante antes de ofertar; pactar expresamente las figuras del Estatuto que se quieran aplicar; contra actos precontractuales, reparación directa fundada en que la entidad violó sus propias reglas (culpa in contrahendo, CE rad. 31.628 de 2020).
- **Vigencia a revisar:** No se verificó el plazo de caducidad en la fuente abierta; la tesis de 2019 cita el CPACA antes de la Ley 2080 de 2021.
- **Fuentes (5):** F-053, F-118, F-172, F-185, F-423

#### LIQ-17 · Consorcio o unión temporal en el pleito: si no comparecen todos los integrantes, el proceso podía anularse

- **Gravedad:** media. Cuesta reprocesar la demanda; la regla probablemente cambió en 2013.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Un artículo de 2012 reporta nulidades de procesos contenciosos (reclamaciones, liquidación) porque no comparecieron todos los miembros del consorcio o la unión temporal, que no tiene personalidad jurídica. El propio fichador anota, sin verificar, que la Sala Plena de la Sección Tercera habría unificado en 2013 a favor de la capacidad procesal del consorcio.
- **Causa:** El consorcio o la unión temporal no tiene personalidad jurídica.
- **Consecuencia en plata:** Proceso perdido o anulado por defecto de forma; la fuente no da monto.
- **Solución documentada:** Demandar con todos los integrantes o verificar la regla vigente sobre capacidad procesal del consorcio antes de presentar la demanda.
- **Vigencia a revisar:** Artículo de 2012; posible unificación posterior (2013) no verificada.
- **Fuentes (1):** F-377

#### LIQ-18 · La entidad deudora está en acuerdo de reestructuración de pasivos (Ley 550) y no se le puede cobrar ejecutivamente

- **Gravedad:** media. La plata no se pierde, pero queda inmovilizada por tiempo indefinido.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Mientras dure el acuerdo de reestructuración del Título V de la Ley 550, las obligaciones de la entidad territorial son inejecutables, anteriores o posteriores a él (CE 72.645, 2025, caso de servicios con una ESE). El contratista no pierde la acreencia porque se suspenden prescripción y caducidad, y los intereses moratorios de una liquidación judicial no dependen del acuerdo.
- **Causa:** Entidades territoriales en dificultad financiera acogidas a la Ley 550.
- **Consecuencia en plata:** El acta o liquidación a favor no se puede cobrar por vía ejecutiva mientras dure el acuerdo.
- **Solución documentada:** Hacerse parte del acuerdo como acreedor y revisar antes de ofertar si la entidad está en reestructuración.
- **Vigencia a revisar:** La aplicación a contratos de obra es inferencia a partir de la regla general del art. 58 num. 13 de la Ley 550.
- **Fuentes (1):** F-206

#### LIQ-19 · La entidad paga tarde: se sigue entregando y los intereses de mora son bajos si no se pactaron

- **Gravedad:** media. Pérdida financiera acotada al costo de la plata retenida.
- **Tipos de contrato:** bienes, servicios, todos los tipos
- **Descripción:** Si el contrato no pactó intereses moratorios, la Ley 80 (art. 4 num. 8) fija el doble del interés legal civil sobre el valor histórico actualizado. En los acuerdos marco de CCE el proveedor debe seguir cumpliendo «mientras el pago es formalizado»: en ferretería, 10 días para aprobar la factura más 30 para pagarla, y la mora solo corre después; en alimentos, solo puede suspender con 60 días de mora en tres o más facturas. Para cobrar procede la demanda ejecutiva sin conciliación previa obligatoria.
- **Causa:** Falta de PAC o de aprobación del supervisor, y minutas que obligan a seguir entregando.
- **Consecuencia en plata:** El contratista financia a la entidad con su capital de trabajo.
- **Solución documentada:** Pactar intereses moratorios en la minuta; cobrarlos; en acuerdos marco, abstenerse de cotizar a la entidad morosa y pedir a CCE su suspensión (30 o más días de mora, o 5 moras en el año, cl. 13.13); demanda ejecutiva si persiste.
- **Cifras:**
  - «Pago de facturas «dentro de los TREINTA (30) DÍAS CALENDARIO»» (verificada: confirmada). Minuta AMP CCE-255-AMP-2021 ferretería, Hoja 20 · F-062.
  - «Suspensión del suministro solo con mora de 60 días calendario en tres o más facturas» (verificada: confirmada). Minuta AMP alimentos, p. 49, cl. 6.36 · F-090.
- **Vigencia a revisar:** La competencia por cuantía (1.500 SMMLV) depende del CPACA reformado por la Ley 2080 de 2021; la aplicación de la Ley 2024 de 2020 a entidades estatales no se verificó.
- **Fuentes (4):** F-062, F-090, F-114, F-154

#### LIQ-20 · El pago final se condiciona a paz y salvos de trabajadores, proveedores y la comunidad

- **Gravedad:** baja. Demora el cobro del saldo, sin pérdida del derecho.
- **Tipos de contrato:** obra
- **Descripción:** En obras con mano de obra local, la entidad territorial exige para la liquidación final paz y salvos de trabajadores y proveedores, y se involucra a la comunidad; mientras falten, el saldo queda retenido.
- **Causa:** Obras con mano de obra local y reclamos de terceros.
- **Consecuencia en plata:** Retención del saldo final; la fuente no da cifra.
- **Solución documentada:** Recoger los paz y salvos durante la obra y no al final.
- **Fuentes (1):** F-558

#### LIQ-21 · Demandar la liquidación judicial le quita a la entidad la competencia para declarar el incumplimiento

- **Gravedad:** baja. Afecta la estrategia procesal, sin pérdida directa documentada.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Según una ex magistrada auxiliar, la jurisprudencia de la Sección Tercera sostiene que, notificada la demanda de liquidación judicial, la entidad pierde la atribución de declarar el incumplimiento (y con ello el siniestro de la póliza); la ponente discrepa de la tesis.
- **Causa:** Tesis jurisprudencial sobre pérdida de competencia de la entidad.
- **Consecuencia en plata:** Cambia quién decide el incumplimiento y la póliza; la fuente no da cifra.
- **Solución documentada:** Ninguna unificada; tenerla en cuenta al decidir cuándo demandar la liquidación.
- **Vigencia a revisar:** Tesis en discusión; sin radicado.
- **Fuentes (1):** F-531

#### LIQ-22 · Interventor: firmar el recibo final con la obra incompleta o no guardar copia de sus informes lo vuelve responsable fiscal

- **Gravedad:** alta. Responsabilidad fiscal solidaria por el detrimento y la inhabilidad que acarrea.
- **Tipos de contrato:** interventoría, consultoría
- **Descripción:** El recibo a satisfacción es el acto que materializa el detrimento: el interventor que firma el acta de recibo final con obra faltante o fuera de especificación responde fiscalmente de forma solidaria con el contratista y los funcionarios, y no se libra alegando fallas de planeación (CE, Sección Primera, 30-may-2024, caso IDRD: acta de 1995 y sentencia de 2024). La presunción de culpa grave del art. 118 de la Ley 1474 invierte la carga de la prueba: el interventor que no conserva copia de sus informes, requerimientos y avisos queda sin defensa. En una muestra de la Contraloría (Gerencia Bolívar, 2012-2018), los absueltos ganaron con esa prueba escrita.
- **Causa:** Se firma el recibo con faltantes; los documentos de la gestión se dejan solo en la entidad.
- **Consecuencia en plata:** Responsabilidad fiscal solidaria por el valor del detrimento (de 6 a 360 millones en la muestra), con una contingencia que puede durar décadas.
- **Solución documentada:** No firmar recibos con faltantes; dejar constancia escrita de los defectos y del aviso a la entidad; conservar copia propia de todos los informes, requerimientos y avisos.
- **Cifras:**
  - «De 7 casos con interventores vinculados, 4 terminaron con fallo de responsabilidad fiscal» (sin verificar (no entró en la verificación de normas)). Gil y Pérez (2021), Tabla 4, pp. 110-111 · F-293.
- **Vigencia a revisar:** La muestra es pequeña y de una sola gerencia; el caso IDRD se rigió por la Ley 42 de 1993, hoy Ley 610 de 2000 (la regla de fondo se mantiene en el art. 84 de la Ley 1474).
- **Fuentes (3):** F-168, F-293, F-294

### 3.8 Transversal (25)

#### TRA-01 · Cada entidad de régimen especial (ESP, ESE, universidad, Ecopetrol, fondos) contrata con su propio manual, y la entidad puede cambiar de régimen de un año a otro

- **Gravedad:** media. Puede costar la oferta (rechazo por reglas mal aplicadas), no el contrato ni una inhabilidad; el costo principal es reproceso y estudio.
- **Tipos de contrato:** todos los tipos
- **Descripción:** No hay un estatuto único para las entidades exceptuadas de la Ley 80: cada una fija en su manual sus modalidades, cuantías, plazos y publicidad. El contratista tiene que estudiar un reglamento distinto por entidad y corre el riesgo de aplicar reglas del Estatuto General donde no aplican. Además, el régimen puede cambiar: el Fondo Adaptación pasó a sujetarse totalmente al Estatuto General desde el 1-ene-2020 (CCE C-1241 de 2025), y el propio Fondo reportó inseguridad jurídica por el cambio permanente de normativa. Ejemplos de umbrales fichados: EAAB, invitación pública por encima de 2.500 SMLMV; Las Ceibas (Neiva), directa por debajo de 200 SMLMV, solicitud privada de 200 a 3.000 y pública por encima de 3.000. El Consejo de Estado (conceptos de 2018 y 2021) exhortó al Gobierno a presentar una ley organizada sobre regímenes especiales.
- **Causa:** Excepciones por ley o decreto ley (arts. 13 a 16 de la Ley 1150; art. 93 de la Ley 30 de 1992; art. 6 de la Ley 1118 de 2006; Res. 5185 de 2013 para ESE; Leyes 142 y 100) sin pautas comunes; regímenes temporales creados en leyes del plan o decretos. La Ley 2195 solo obligó a publicar en SECOP II.
- **Consecuencia en plata:** Más horas de estudio por proceso y riesgo de rechazo de la oferta por usar el manual equivocado. Las fuentes no dan cifra en pesos.
- **Solución documentada:** Leer el manual vigente de la entidad y su régimen a la fecha del proceso (CCE publica cronologías, como la del Fondo Adaptación en C-1241 de 2025). Propuestas de política: unificar y limitar los regímenes especiales (Transparencia por Colombia 2022), criterios mínimos para los manuales (tesis UC3M), devolver las universidades al Estatuto General (Cano y Ruiz); CCE solo emite lineamientos no vinculantes.
- **Cifras:**
  - «En 2014 el régimen especial representaba el 22,0 % de los contratos subnacionales» (sin verificar). Cuadro 2 · F-468. Nota del verificador: El repositorio de Fedesarrollo devuelve una página anti-bot («Making sure you're not a bot!») en lugar del PDF.
  - ««Colombia es el país con mayor de número y dispersión de regímenes especiales»» (sin verificar (no entró en la verificación de normas)). p. 287 del texto (p. 299 del PDF) · F-405.
- **Vigencia a revisar:** Detekta documenta una reforma al Estatuto en trámite; no se verificó si toca los regímenes especiales. Las dos URL de SciELO son el mismo artículo (cuentan 13 obras distintas).
- **Fuentes (14):** F-008, F-118, F-142, F-152, F-155, F-164, F-269, F-272, F-273, F-396, F-405, F-423, F-467, F-468

#### TRA-02 · Entidades exceptuadas (Ecopetrol, filiales como Ocensa, algunas ESE) no publican completa su contratación en SECOP II

- **Gravedad:** media. Se pierde información y oportunidad de competir u observar, pero no el contrato ni una garantía.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El contratista no puede ver el estado del proceso, el informe de evaluación ni el adjudicatario, con lo que pierde inteligencia de precios y la posibilidad de controvertir. El Consejo de Estado (Sección Quinta, 20-feb-2025) ordenó a Ecopetrol cumplir el deber de publicidad y dijo que la reserva comercial no puede alegarse de forma general; según el comunicado de FEDe, el Tribunal de Cundinamarca dio una orden similar a Ocensa en 2025. En algunas ESE se han hecho convocatorias solo en cartelera física.
- **Causa:** Lectura del art. 53 de la Ley 2195 de 2022 como deber de solo publicar y no de tramitar en la plataforma; reserva comercial alegada de forma genérica; violación de la publicidad en ESE.
- **Consecuencia en plata:** Asimetría de información frente a competidores invitados. Las fuentes no dan cifra.
- **Solución documentada:** Acción de cumplimiento, como la que llevó a la sentencia del Consejo de Estado de 20-feb-2025 (orden de cumplir en 3 meses; reserva solo caso por caso).
- **Fuentes (4):** F-169, F-280, F-396, F-591

#### TRA-03 · Diseños que cambian y cronogramas y presupuestos mal planeados son la primera causa de retrasos en obra

- **Gravedad:** media. Produce sobrecosto por mayor permanencia, que puede ser grande, pero las fuentes no lo cuantifican y es reclamable.
- **Tipos de contrato:** obra, consultoría, interventoría
- **Descripción:** En el estudio colombiano de Lozano et al. (2018), el grupo de factores de planeación explica la mayor parte de la varianza en tiempo; los factores significativos son cambios en los diseños, falta de materiales y maquinaria y planeación deficiente del cronograma y del presupuesto. Las dos fichas ubican esa frase en p. 127 y p. 128 respectivamente.
- **Causa:** Planeación deficiente en la fase de diseño y estructuración; diseños que cambian durante la ejecución.
- **Consecuencia en plata:** Más plazo y mayor permanencia en obra, que luego es difícil cobrar. La fuente no da cifra en pesos (el sobrecosto en más del 50 % de proyectos que cita el artículo es de Malasia, no de Colombia).
- **Solución documentada:** Los autores recomiendan atender la concepción, planeación y diseño, definir antes riesgos e imprevistos, integrar a los profesionales y usar BIM. No dan un método para el contratista que oferta.
- **Cifras:**
  - «El grupo de factores de planeación explica el 58 % de la varianza en tiempo (p < 0,01)» (verificada: confirmada). Tabla 4, p. 124 · F-310.
  - «Cambios en los diseños: 9 % de la varianza (p < 0,01)» (verificada: confirmada). Tabla 5 · F-310.
- **Fuentes (2):** F-310, F-378

#### TRA-04 · El Consejo de Estado no tiene criterio unificado: el mismo hecho anula un contrato o se subsana según la sala o la entidad

- **Gravedad:** alta. Puede costar el contrato (nulidad absoluta por falta de planeación) o la adjudicación (rechazo por un defecto que otra sala tendría por subsanable).
- **Tipos de contrato:** todos los tipos
- **Descripción:** Dos frentes del mismo problema. (1) Nulidad por falta de planeación: la Subsección C de la Sección Tercera aplica la tesis del objeto ilícito y anula el contrato, mientras la Sección Cuarta, vía tutela (Conconcreto, exp. 24809), sostuvo que las causales de nulidad absoluta son taxativas y de interpretación restrictiva; Zambrano (2018) habla de «posturas judiciales diametralmente opuestas». (2) Subsanabilidad de ofertas: «no existe aún una sentencia de unificación que delimite lo que es y no es subsanable» (Derectum 2024, p. 17); los fallos son casuísticos y algunos se contradicen (firma del contador en 2014 y 2016; intereses moratorios de seguridad social, exp. 49221 de 2020, con salvamento de voto), y la mayoría de reglas son obiter dictum (López Rodríguez 2019, p. 306). La misma oferta puede habilitarse en una entidad y rechazarse en otra, y el desenlace de un litigio depende de qué sala lo resuelva.
- **Causa:** Precedente no unificado; la Ley 1882 de 2018 dejó solo un criterio general sobre subsanabilidad.
- **Consecuencia en plata:** No se puede calcular de antemano cuánto vale una reclamación, y una oferta puede caer por un defecto que en otra entidad se habría subsanado. Las fuentes no lo cuantifican.
- **Solución documentada:** Ninguna normativa. En la práctica, citar en la observación el fallo favorable al caso concreto. Los autores piden unificar, seguir el precedente constitucional y hacer listados de lo subsanable y lo no subsanable.
- **Vigencia a revisar:** Zambrano es de 2018 y la revisión de subsanabilidad llega a 2024; no se verificó si después hubo unificación.
- **Fuentes (4):** F-215, F-266, F-314, F-375

#### TRA-05 · Colusión entre aparentes competidores en licitaciones y subastas inversas

- **Gravedad:** alta. Para quien participa, multas de la SIC de cientos o miles de millones; para el honesto, perder sistemáticamente los procesos.
- **Tipos de contrato:** obra, bienes, todos los tipos
- **Descripción:** La SIC ha sancionado casos en contratación estatal detectados por identidades en los documentos de ofertas aparentemente rivales o por un departamento de licitaciones compartido para inflar el número de posibles proponentes. En la subasta inversa de bienes uniformes, el precio como único factor y los pocos oferentes facilitan los acuerdos (Safar 2016). Señales: ausencia de reducciones de precio, pocos proponentes y desiertos frecuentes. La ficha menciona multas de más de $680 millones y más de $2.042 millones en dos casos de ingeniería civil (ANI, 2019), sin ubicación precisa en la fuente.
- **Causa:** Empresas vinculadas que se presentan como competidoras; mecanismos de precio único con pocos oferentes.
- **Consecuencia en plata:** Quien compite contra un cartel pierde probabilidad de ganar; quien participa se expone a multas de la SIC.
- **Solución documentada:** Denunciar ante la SIC; la entidad puede rehacer la subasta o informar a la SIC (guía CCE de ofertas artificialmente bajas). El módulo de subasta de SECOP II oculta la identidad de los participantes durante la subasta, da reporte de lances y extiende el tiempo por lances válidos (Guía de competencia CCE, p. 13).
- **Fuentes (4):** F-085, F-103, F-160, F-345

#### TRA-06 · Errores en el RUP: un formulario devuelto sin corregir o una experiencia mal registrada dejan al proponente sin poder ofertar

- **Gravedad:** alta. Puede causar una inhabilidad de 5 años o dejar al proponente sin poder ofertar durante meses.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Dos riesgos sobre el mismo registro. (1) Si la cámara de comercio devuelve el formulario de renovación o actualización y el proponente no lo corrige en 30 días desde la primera carta de devolución, cesan los efectos del RUP; también cesan si no renueva a más tardar el quinto día hábil de abril. (2) Si la cámara establece graves inconsistencias (por ejemplo, experiencia inflada o mal registrada), cancela la inscripción y el proponente queda inhabilitado 5 años; la entidad puede suspender el proceso e impugnar el RUP sin caución, y cualquier persona puede recurrir la inscripción dentro de 10 días hábiles.
- **Causa:** Formularios mal diligenciados (información financiera, experiencia, códigos) y experiencia registrada sin soporte o con valor en SMMLV o porcentaje de participación incorrectos.
- **Consecuencia en plata:** Sin RUP vigente no se puede ofertar en ningún proceso que lo exija hasta inscribirse de nuevo y quedar en firme; con graves inconsistencias, 5 años sin contratar con el Estado (para siempre si reincide), más acciones penales.
- **Solución documentada:** Corregir y reingresar dentro de los 30 días; renovar antes del quinto día hábil de abril; registrar solo experiencia con soporte, con valor en SMMLV y porcentaje de participación correctos.
- **Cifras:**
  - «El artículo dice: 30 días desde la primera carta de devolución para corregir y reingresar; si no lo hace, «si es inscripción por primera vez ... se le devolverá el dinero al proponente, si es renovación o actualización, habrá entonces que cesar los efectos de su Registro Único de Proponentes». La cesación de efectos aplica solo a renovación/actualización; en inscripción nueva se devuelve el dinero. Es doctrina, no la norma.» (corregida (texto original: «30 días para corregir y reingresar desde la primera carta de devolución; si no, cesan los efectos del RUP»)). p. 5 · F-324.
  - «Inhabilidad de 5 años para contratar por graves inconsistencias en el RUP» (sin verificar (no entró en la verificación de normas)). art. 6.3 · F-142.
- **Vigencia a revisar:** El plazo de 30 días viene de un artículo de 2018 escrito desde la Cámara de Comercio de Barranquilla; puede ser procedimiento interno o de una circular SIC de entonces. El aparte del art. 6.3 figura como condicionalmente exequible y no se abrió la sentencia.
- **Fuentes (2):** F-142, F-324

#### TRA-07 · SECOP II es lento, inestable y exige personal especializado, y su reemplazo se prueba sin plan B

- **Gravedad:** media. Produce reproceso y ofertas caídas por forma; no se documenta pérdida de contratos en ejecución.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La pyme pequeña no siempre cae por falta de experiencia sino por no saber participar ni manejar SECOP II (caso Policía en Chocó, mínima y menor cuantía de bienes y servicios; extenderlo a obra es inferencia). El director de CCE lo describió como «un sistema lento, inestable y además costoso», y sobre el nuevo SECOP dijo que «no hay plan B». La migración será módulo por módulo, con 6 meses de apropiación por módulo.
- **Causa:** Plataformas aisladas (SECOP I, SECOP II, TVEC) administradas por un tercero extranjero; desconocimiento técnico de la plataforma por parte de pymes.
- **Consecuencia en plata:** El contratista paga profesionales para manejar la plataforma; la pyme no se presenta o cae por forma. Durante la convivencia de plataformas habrá procesos en dos sistemas (inferencia). Sin cifra.
- **Solución documentada:** Formación y acompañamiento en SECOP II. CCE promete un sistema único interoperable con DIAN y Confecámaras/RUP, y que la ley de garantías transcurra sobre el sistema actual.
- **Vigencia a revisar:** El cronograma del nuevo SECOP (dic-2025 más pilotos) pudo cambiar. El caso pyme es de bienes y servicios en Chocó.
- **Fuentes (4):** F-263, F-521, F-524, F-526

#### TRA-08 · Una multa o cláusula penal, aunque sea pequeña, resta el 2 % de los puntos en todos los procesos del año siguiente, también en consorcios

- **Gravedad:** alta. Un 2 % de puntaje durante un año puede costar varias adjudicaciones, incluidas las de los consorcios donde participa el sancionado.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El art. 58 de la Ley 2195 de 2022 reduce el 2 % del total de puntos a los proponentes con una o más multas o cláusulas penales en el último año, sin importar la cuantía, y el descuento se extiende a los consorcios de los que hace parte. CONTRADICCIÓN: un ponente en video dice que la reducción aplica con «dos o más» multas; la ficha que leyó la ley transcribe «una o más». La afirmación oral no se verificó contra el artículo y puede confundirse con el factor de incumplimientos de los documentos tipo o con el art. 90 de la Ley 1474.
- **Causa:** El contratista ve la multa como un costo menor del contrato y no la impugna; las multas se registran en el RUP.
- **Consecuencia en plata:** Se descuenta el 2 % del total de puntos en cada proceso con puntaje durante un año, lo que basta para perder licitaciones reñidas. La fuente no cuantifica las ofertas perdidas.
- **Solución documentada:** Defenderse en la audiencia del art. 86 de la Ley 1474 (citación precisa, pruebas, reposición); si la multa queda en firme, demandarla: el parágrafo 1 del art. 58 suspende la reducción mientras el acto esté demandado. Revisar RUP y SECOP de los socios antes de armar un consorcio.
- **Cifras:**
  - «Reducción del 2 % del total de puntos por una o más multas o cláusulas penales en el último año, sin importar la cuantía» (verificada: confirmada). art. 58 · F-113.
- **Vigencia a revisar:** El parágrafo 1 trae una nota de jurisprudencia que no se pudo desplegar; puede haber un fallo de la Corte sobre él.
- **Fuentes (3):** F-113, F-430, F-558

#### TRA-09 · Ley de garantías: avalancha de contratación antes y después de la restricción, y saturación de entidades y SECOP

- **Gravedad:** media. Afecta el flujo de procesos y su calidad, no cuesta por sí sola un contrato ni una garantía.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La prohibición de contratación directa de 4 meses (art. 33 de la Ley 996 de 2005) lleva a firmar en masa antes del cierre y a reanudar en masa después; los convenios interadministrativos de gobernadores y alcaldes también se restringen (art. 38, par.). La licitación pública no se suspende. CONTRADICCIÓN entre fuentes: Cañón et al. (2022) no encuentran «relación alguna entre el año electoral y cada una de las modalidades de contratación», mientras Orjuela (2023) mide un aumento del 143,43 % de la contratación directa en enero de 2018 (las fichas la ubican en p. 50 y p. 51). La ficha reporta además que tras la restricción de 2026 se firmaron 43.092 contratos por $7,67 billones en 3 semanas, y más de 18.000 contratos en un día en enero de 2022, ambas sin ubicación en la fuente.
- **Causa:** Las entidades planean el gasto alrededor de la restricción y la cumplen solo en apariencia.
- **Consecuencia en plata:** Para el licitador de obra: concentración de procesos y adjudicaciones antes del corte y carga de las entidades y del SECOP; riesgo de nulidad por mala planeación de lo contratado a la carrera.
- **Solución documentada:** Revisar o eliminar el art. 33 (Orjuela); planeación, uso pleno del SECOP II y vigilancia de la contratación de cierre de gobierno (Transparencia por Colombia).
- **Cifras:**
  - «Aumento del 143,43 % de la contratación directa en enero de 2018 frente al año anterior» (verificada: confirmada). p. 50-51 (las fichas difieren en la página) · F-323.
  - «Ley de garantías de las presidenciales 2026: del 31 de enero al 21 de junio de 2026» (verificada: confirmada). p. 2 · F-481.
  - «15 contratos del Gobierno Nacional (8 de INVÍAS, Vías para la Paz) concentraron el 71 % del valor contratado tras la restricción» (verificada: confirmada). p. 9 · F-481.
- **Vigencia a revisar:** El art. 33 figura como condicionalmente exequible con notas de vigencia no abiertas. Los datos empíricos son de contratación directa.
- **Fuentes (4):** F-115, F-271, F-323, F-481

#### TRA-10 · La corrupción se concentra en la contratación y en las alcaldías, y hay presiones electorales sobre contratistas

- **Gravedad:** media. Es contexto para elegir entidad; el daño directo al oferente honesto es perder el proceso, no una sanción.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Según la Radiografía de Transparencia por Colombia (hechos documentados en prensa 2016-2022, no un censo), la contratación es el ámbito más afectado y las alcaldías la entidad más frecuente. CCE además denunció presiones a contratistas y funcionarios para constreñir el voto, especialmente en ciudades del Caribe según la fuente.
- **Causa:** Corrupción administrativa (49,4 % de los hechos documentados) y uso político de la contratación pública.
- **Consecuencia en plata:** Procesos con ganador predeterminado y riesgo de presión política sobre el contratista. Las cifras de pérdida son del Estado, no del oferente.
- **Solución documentada:** Seguimiento y trazabilidad de recursos e infraestructura territorial (Transparencia por Colombia); denunciar ante CCE, que remite a los organismos competentes.
- **Cifras:**
  - «$21,28 billones perdidos por corrupción entre 2016 y 2022 (hechos documentados en prensa)» (sin verificar (no entró en la verificación de normas)). página de resultados · F-483.
  - «Contratación: 31,94 % de los hechos (ámbito más afectado); alcaldías: 24,48 %» (verificada: confirmada). página de resultados · F-483.
- **Vigencia a revisar:** La base son hechos reportados en prensa: mide lo documentado, no la corrupción total.
- **Fuentes (2):** F-483, F-519

#### TRA-11 · En SECOP falta o está mal el NIT del proveedor: cerca de 4 de cada 10 ganadores de obra aparecen como «No Definido», sobre todo consorcios

- **Gravedad:** media. Distorsiona la lectura de competidores (pérdida acotada por mala decisión), no cuesta el contrato.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El consorcio o la unión temporal no tiene NIT al momento de la adjudicación y el conjunto de procesos publica el literal «No Definido»; además hay un mismo contratista registrado con NIT distintos, caracteres especiales o NIT combinado con el nombre, y procesos sin NIT incluso finalizados. Así se parte o se pierde el historial de cada competidor.
- **Causa:** Registro inconsistente por parte de las entidades y consorcios sin NIT propio al adjudicar.
- **Consecuencia en plata:** Subestima cuánto gana cada competidor, su capacidad residual ocupada y el índice de competencia.
- **Solución documentada:** Limpiar el NIT (quitar caracteres especiales), unir por NIT y nombre, resolución de entidades; reconstruir los integrantes del consorcio desde el conjunto de contratos o sus documentos. La revista RET 2025 pide a la ANCP criterios de calidad de publicación.
- **Cifras:**
  - «4.067 de 9.178 procesos de obra adjudicados en 2025 tienen el NIT del adjudicatario en «No Definido»; los tres primeros nombres son consorcios» (sin verificar (no entró en la verificación de normas)). medición propia del agente sobre la API de datos.gov.co, 2-oct-2026 · F-122.
- **Vigencia a revisar:** Dos de las cuatro URL son el mismo artículo de RET (3 obras distintas).
- **Fuentes (4):** F-122, F-355, F-357, F-392

#### TRA-12 · Campos de SECOP mal diligenciados: valores de $1, multilote sumado, 0 competidores, tipo de adición genérico, modalidad equivocada y documentos tipo ambiguo

- **Gravedad:** media. Una cifra contaminada puede llevar a mal precio o mala elección de entidad, pero el daño es acotado y depende de quién la use.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Varias fuentes documentan el mismo patrón: (a) en el conjunto de adiciones, la mayoría de modificaciones se etiquetan como «Modificación general», así que la etiqueta no dice si hubo adición en valor o prórroga; (b) hay precios base y adjudicados de $0 o $1, procesos multilote cuyo valor adjudicado es la suma de lotes y adjudicados con 0 competidores; (c) contratos directos marcados como prestación de servicios o «no pluralidad» que en realidad son convenios interadministrativos; (d) el campo documentos_tipo de las licitaciones de obra dice «No» o «No definido» en un tercio de los casos, sin distinguir «no aplica» de «no lo usó»; (e) para una muestra limpia de obra vial hubo que descartar casi todo y validar a mano plazos y montos. La ficha (e) añade, como inferencia propia, que 65.536 es 2^16, posible tope de exportación que truncaría la descarga.
- **Causa:** Errores de registro de las entidades, estructura del dataset en procesos por lotes y soportes no cargados.
- **Consecuencia en plata:** Un índice de baja, de competencia o de adiciones calculado sin limpiar estos casos da cifras creíbles pero falsas, y el contratista fija su porcentaje de oferta o elige entidad sobre una base contaminada.
- **Solución documentada:** Excluir valores de $50.000 o menos, procesos multilote, adjudicados con 0 competidores y faltantes; clasificar las adiciones por la descripción con reglas y un modelo de lenguaje; cruzar documentos_tipo con el sector del objeto; depurar a mano contra el documento del contrato (la MOE eliminó 384 contratos).
- **Cifras:**
  - ««Modificación general» 57,26 %, «Adición en el valor» 4,47 %, «Extensión» 0,01 % de las modificaciones» (sin verificar). PDF p. 17, §3.3, Tabla 2 · F-418. Nota del verificador: La página del handle devuelve «Bot Detection» (curl y WebFetch), por lo que no se obtuvo el enlace al bitstream ni el PDF.
  - «Con reglas sobre la descripción, 792.510 registros se redujeron a 352.373 sin identificar» (sin verificar (no entró en la verificación de normas)). PDF p. 17, §3.3 · F-418.
  - «Registros de precio iguales a $1 por debajo del mínimo de $50.000; valor adjudicado multilote = suma de lotes; observaciones con 0 competidores» (sin verificar (no entró en la verificación de normas)). PDF p. 8-9 · F-381.
  - «De unos 65.536 procesos liquidados de obra vial quedaron 170 útiles tras la depuración manual» (sin verificar (no entró en la verificación de normas)). PDF p. 6, §2.4 · F-424.
  - «Licitaciones públicas de obra firmadas en 2025: documentos_tipo «Si» = 923, «No» = 451; «No definido» = 451» (sin verificar (no entró en la verificación de normas)). medición propia del agente sobre la API de datos.gov.co, 2-oct-2026 · F-122.
  - «384 contratos eliminados por errores de causal o valor» (sin verificar (no entró en la verificación de normas)). p. 10 · F-471.
- **Vigencia a revisar:** Datos de adiciones de 2023 y de la MOE de 2021: la calidad del registro pudo cambiar; hay que medir de nuevo sobre el dataset vivo.
- **Fuentes (8):** F-122, F-283, F-381, F-392, F-393, F-418, F-424, F-471

#### TRA-13 · La información para aprender del mercado está incompleta: ofertas ganadoras sin publicar, datos partidos entre SECOP I, II y TVEC, proponentes y precios unitarios no descargables

- **Gravedad:** media. Lleva a presupuestar y leer la competencia a ciegas; pérdida acotada, no del contrato.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Una medición sobre 2014-2018 encontró que ningún proceso competitivo publicaba la oferta ganadora y que casi todos carecían de documentos del proceso (cifra de segunda mano, de Zuleta et al. 2019, en época dominada por SECOP I; en SECOP II transaccional las ofertas quedan en la plataforma). En 2022 casi la mitad de los contratos seguía en SECOP I y los campos no coinciden entre plataformas. La lista de proponentes no era descargable de forma automática (2019) y SECOP II no trae desglose estructurado de ítems y precios unitarios.
- **Causa:** Las entidades no cargan o nombran mal los documentos (falta de capacitación y conectividad en municipios de categoría 4 a 6); plataformas no interoperables.
- **Consecuencia en plata:** El contratista no puede aprender los precios unitarios ni la estructura de la oferta ganadora, y un índice de competencia que solo lee SECOP II subestima a los competidores. Sin cifra en pesos.
- **Solución documentada:** Estandarizar e interoperar plataformas (Transparencia por Colombia); medir con SECOP I y II juntos (CCE); revisar contrato por contrato y tratar las alertas como señales, no prueba.
- **Cifras:**
  - «100 % de procesos competitivos sin la oferta ganadora publicada en los cinco años medidos» (sin verificar). Tabla 7, p. 115-116 de la revista · F-292. Nota del verificador: El servidor de la revista respondió 503 (tres rutas probadas: /es/, /en/, /ojs/) y error SSL con curl. Solo se confirmó por metadatos externos que el artículo existe: García Jiménez et al., «Efectividad del SECOP I y II en municipios de sexta categoría de Antioquia», Unaciencia 13(25), 2021, pp. 107-119.
  - «Entre 84,35 % y 91,75 % de procesos competitivos sin documentos del proceso publicados» (sin verificar). Tabla 7, p. 115-116 de la revista · F-292. Nota del verificador: Misma barrera: servidor 503 / error SSL.
  - «2022: 47,88 % de los contratos en SECOP I, 50,94 % en SECOP II, 1,17 % en TVEC» (verificada: confirmada). p. 12 · F-467.
- **Vigencia a revisar:** El 100 % es de 2014-2018 y de segunda mano; proporciones de plataformas de 2022; lo de proponentes no descargables es de 2019 y no se verificó en los conjuntos actuales de ofertas.
- **Fuentes (5):** F-051, F-292, F-297, F-361, F-467

#### TRA-14 · Extracción automática y modelos de riesgo hechos con datos abiertos fallan con frecuencia y dan falsas alarmas

- **Gravedad:** media. Una decisión mal informada cuesta una oportunidad o una mala oferta; daño acotado.
- **Tipos de contrato:** todos los tipos
- **Descripción:** La extracción automática de partes, objeto, plazo y valor de contratos SECOP falla una de cada cuatro veces (mejor modelo F1 0,75). Los modelos de riesgo de corrupción construidos solo con datos abiertos tienen poder predictivo modesto, y hay un compromiso inherente entre sensibilidad y precisión que produce falsas alarmas.
- **Causa:** Textos jurídicos heterogéneos y escaneados; ruido, errores y vacíos de los datos abiertos; variable de riesgo aproximada de forma indirecta.
- **Consecuencia en plata:** Una cifra extraída por máquina que entra sin verificar en el cálculo de capacidad residual, experiencia o precio, o una «probabilidad de riesgo» presentada como hecho, lleva a descartar procesos buenos o entrar en malos.
- **Solución documentada:** Usar los modelos como alerta para revisión experta, no como veredicto; verificar las cifras extraídas; enriquecer con historial de entidad y contratista.
- **Cifras:**
  - «Mejor modelo de extracción F1 = 0,75 frente a 0,69 de Google Document AI, ambos por debajo del promedio de la literatura» (sin verificar (no entró en la verificación de normas)). p. 1, Abstract · F-407.
  - «Exactitud entre 46 % y 59 % y AUC entre 0,56 y 0,72 en modelos de riesgo de corrupción» (verificada: confirmada). Abstract · F-283.
- **Fuentes (5):** F-283, F-392, F-407, F-418, F-443

#### TRA-15 · La interventoría no siempre es neutral: puede alinearse con el contratista o irse sin entregar los informes para liquidar

- **Gravedad:** media. Retrasa el cobro del saldo y puede sesgar la ejecución, sin costar por sí solo el contrato.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** Un ponente afirma que «no pocas veces el interventor se pone de acuerdo con el contratista» y que el interventor se va cuando vence su contrato, antes de completar los informes. Gorbaneff et al. (2011) describen un conflicto estructural: las mismas empresas compiten en obra y en interventoría, y «a los interventores no les conviene presionar a los constructores porque en licitaciones futuras pueden invertirse los papeles». La fuente de 2011 es anterior a la Ley 1474, cuya solidaridad e inhabilidad (art. 84) cambiaron los incentivos.
- **Causa:** Mismas firmas en ambos roles; contratos de interventoría que vencen antes de la liquidación de la obra.
- **Consecuencia en plata:** Retrasa la liquidación y el pago del saldo; para un nuevo entrante, una interventoría no neutral frente a competidores con los que coopera.
- **Solución documentada:** Mantener vinculado al interventor hasta entregar los informes para liquidar; supervisor que vigile al interventor; dar peso a la reputación en la selección y llevar memoria histórica de contratistas e interventores; independencia y canales de denuncia (Forero et al. 2025).
- **Vigencia a revisar:** Gorbaneff et al. es de 2011, anterior a la Ley 1474.
- **Fuentes (4):** F-288, F-294, F-509, F-558

#### TRA-16 · Riesgo profesional del interventor y del consultor de diseño: no hay acuerdo sobre la vara de responsabilidad y el COPNIA puede cancelar la matrícula

- **Gravedad:** alta. Puede costar la matrícula profesional y responsabilidad patrimonial personal.
- **Tipos de contrato:** interventoría, consultoría
- **Descripción:** CONTRADICCIÓN sobre la responsabilidad civil del interventor: la tesis de la UPB (2020) sostiene que es contractual y alcanza la culpa leve; la guía de CCE (2016) dice que exige dolo o culpa grave, vía repetición. La UPB argumenta que la Ley 1882 de 2018 aclaró que el interventor responde por lo que le es imputable, sin responsabilidad objetiva; no se verificó esa modificación al art. 82 de la Ley 1474. Aparte, el diseñador y el revisor estructural responden ante el COPNIA: el 18-abr-2017 canceló la matrícula de los ingenieros del caso Space (obra privada).
- **Causa:** Doctrina no unificada; régimen ético de la ingeniería superpuesto a la responsabilidad contractual y fiscal.
- **Consecuencia en plata:** Incertidumbre al tasar el riesgo y el seguro de responsabilidad profesional; la cancelación de una matrícula saca al profesional y con él la experiencia de equipo que la firma acredita en concursos (inferencia). Sin cifra.
- **Solución documentada:** Ninguna fuente resuelve la vara de culpa. Revisión independiente de diseños (Ley 1796 de 2016).
- **Vigencia a revisar:** La guía de CCE es de 2016, anterior a la Ley 1882 de 2018; la modificación al art. 82 no se verificó.
- **Fuentes (4):** F-046, F-144, F-404, F-421

#### TRA-17 · Más competencia en obra desde los pliegos tipo, pero el dinero sigue concentrado: las Mipymes ganan la mitad de los contratos y una cuarta parte del valor

- **Gravedad:** media. Calibra la competencia esperada; no cuesta el contrato pero sí probabilidad de ganar y margen.
- **Tipos de contrato:** obra, interventoría, todos los tipos
- **Descripción:** Antes de los documentos tipo, las licitaciones de obra territorial terminaban con frecuencia con un único oferente; CCE afirmó en 2021 un aumento de 333 % en oferentes. Pero la concentración se ve en el valor: las Mipymes ganan contratos pequeños y muy disputados, y los grandes, sobre todo en transporte, van a no Mipymes; además queda obra sin competencia por contratación directa, regímenes especiales y patrimonios autónomos. Las cifras de participación de mujeres que circulan (43,5 %) son de prestación de servicios de personas naturales, no de obra, y CCE no consideró viable criterios financieros diferenciales por falta de datos. Las cifras de CCE de 2021 son orales y sin metodología visible; las del Observatorio (70 % en departamentos y 81 % en municipios con único oferente) son de segunda mano y sin ubicación.
- **Causa:** Pliegos a la medida antes de los documentos tipo, contratistas que se repiten y modalidades sin competencia.
- **Consecuencia en plata:** Menor probabilidad de ganar por proceso y presión a la baja en el precio; el mercado al que llega la pyme compitiendo es más chico de lo que dicen los totales, y los contratos grandes exigen plural o socio grande.
- **Solución documentada:** Pliegos tipo obligatorios (Ley 1882 de 2018); lotes (Decreto 142 de 2023) con tope por proponente y criterios diferenciales; índice de riesgo con contratación directa, contratistas persistentes, adiciones y concentración (Zuleta et al.). Las fuentes no miden el efecto de los lotes en obra.
- **Cifras:**
  - «Aumento de 333 % en el número de oferentes en licitaciones de obra pública en un año; Mipymes de 16 % a 49 % de procesos adjudicados» (sin verificar). min 2-3 · F-568. Nota del verificador: Fuente audiovisual: no se puede abrir ni transcribir desde esta sesión.
  - «La contratación directa representó el 63 % de los registros entre 2014 y 2019» (sin verificar). pág. 135 · F-307. Nota del verificador: El repositorio de Fedesarrollo devuelve una página anti-bot en lugar del PDF.
  - «Mipymes: 27 % del valor ($516.285,3 millones) y 48 % de los contratos (1.154)» (verificada: confirmada). p. 113 · F-051.
  - «Transporte: el 80 % corresponde a empresas no Mipymes» (verificada: confirmada). p. 115 · F-051.
  - «Coeficiente de Gini de la concentración por valor del contrato: 0,638 (datos 2014)» (sin verificar (no entró en la verificación de normas)). p. 8 · F-468.
  - «Mujeres: 43,5 % de la contratación por prestación de servicios; 274.481 contratos (19,9 %) con género no definido» (verificada: confirmada). p. 10 · F-060.
- **Vigencia a revisar:** Cifras de 2018-2021 anteriores a los documentos tipo v2 (feb-2026); el Gini de Fedesarrollo es de 2014.
- **Fuentes (9):** F-011, F-051, F-056, F-060, F-307, F-439, F-468, F-480, F-568

#### TRA-18 · Acuerdos Marco de Precios: reglas que CCE cambia por guía y requisitos de entrada que favorecen a empresas grandes

- **Gravedad:** media. Limita el acceso a un canal de venta; pérdida acotada.
- **Tipos de contrato:** bienes, servicios
- **Descripción:** CCE fija las condiciones logísticas, operacionales y jurídicas de los AMP en manuales y guías que cambian, sin ser ejercicio de potestad reglamentaria (Santos-Rodríguez 2018). El proveedor debe sostener su precio ante todas las entidades y tener presencia regional; la SIC (concepto 22-378202) reconoce la potencialidad de restricciones a la competencia, aunque las considera justificadas por interés social. El ensayo de la UMNG (2014) usa el régimen del Decreto 1510 de 2013 y afirma erróneamente que el AMP elige un solo proveedor.
- **Causa:** Agregación de demanda que exige capacidad para atender muchas entidades y regiones; regulación administrativa cambiante.
- **Consecuencia en plata:** Exclusión de proveedores medianos o pequeños del canal AMP; una regla de operación puede cambiar en plena ejecución. Sin cifra.
- **Solución documentada:** Catálogos con Mipymes hasta la mínima cuantía (Términos y condiciones TVEC, con base en el Decreto 1860 de 2021).
- **Cifras:**
  - «El aliado regional debe atender como mínimo el 10 % de las órdenes de compra» (verificada: confirmada). hoja 14, cl. 7.13 · F-100.
- **Fuentes (5):** F-100, F-104, F-159, F-347, F-385

#### TRA-19 · Nóminas paralelas: el Estado contrata por prestación de servicios mucho más personal que el de planta

- **Gravedad:** baja. Efecto indirecto y no cuantificado sobre el contratista.
- **Tipos de contrato:** servicios, obra
- **Descripción:** Las fuentes, antiguas (2007-2011), muestran que la mayoría del personal estatal es contratista. Para el contratista de obra el efecto es indirecto: supervisores por prestación de servicios con alta rotación que retrasan aprobaciones y pagos (inferencia de la ficha, sin cifra en la fuente).
- **Causa:** Evasión de prestaciones sociales y rigidez de la planta.
- **Consecuencia en plata:** Indirecta: retrasos en aprobaciones y pagos por rotación de supervisores (inferencia).
- **Solución documentada:** Formalizar plantas (propuesta de las tesis).
- **Cifras:**
  - «80 % del personal por contrato frente a 20 % de planta (Buitrago 2011, citado)» (sin verificar (no entró en la verificación de normas)). p. 19 del PDF · F-453.
  - «Exceso de contratistas sobre planta de 75 %, 72 % y 74 % en promedio, 2007-2009 (Senado, FNA, Defensoría)» (sin verificar (no entró en la verificación de normas)). p. 3 · F-387.
- **Vigencia a revisar:** Cifras de 2007-2011, no actuales.
- **Fuentes (2):** F-387, F-453

#### TRA-20 · Las Asociaciones Público Populares (obra por contratación directa con la economía popular) siguen apareciendo como vigentes, pero la Corte las anuló

- **Gravedad:** media. Un contrato celebrado sin base legal arriesga su validez, pero para el oferente típico el efecto es leer mal el mercado.
- **Tipos de contrato:** obra
- **Descripción:** El borrador de guía de CCE de sep-2025 las describe como modalidad para ejecutar obras; la Sentencia C-033/26 (25-feb-2026) declaró inexequibles los arts. 100 y 101 de la Ley 2294 de 2023. Sigue vigente el art. 102 (sistemas dinámicos de adquisición con oferentes de la economía popular sin RUP).
- **Causa:** Guías y tesis anteriores a la sentencia.
- **Consecuencia en plata:** Si se toma como modalidad válida, se lee mal el mercado; si una entidad todavía contrata obras así, es un proceso sin base legal que se puede observar o denunciar.
- **Solución documentada:** Aplicar la C-033/26: los arts. 100 y 101 de la Ley 2294 ya no rigen.
- **Vigencia a revisar:** No se verificó si el Decreto 874 de 2024 fue derogado expresamente ni si la sentencia tuvo efectos diferidos.
- **Fuentes (3):** F-098, F-151, F-240

#### TRA-21 · Manuales y literatura sobre concurso de méritos describen un procedimiento que ya no existe (apertura del sobre económico y revisión con el primer elegible)

- **Gravedad:** media. Puede llevar a una oferta mal planteada; reproceso o pérdida acotada.
- **Tipos de contrato:** consultoría, interventoría
- **Descripción:** Los numerales 3 a 6 del art. 2.2.1.2.1.3.2 del Decreto 1082 fueron suspendidos por el Consejo de Estado (autos de 25-jul-2018, exp. 56.165, y de 20-feb-2019, exp. 61.463) y sustituidos por el Decreto 399 de 2021. Cualquier fuente anterior a 2021 sobre el sobre económico del concurso está desactualizada.
- **Causa:** Normas suspendidas y reemplazadas; manuales no actualizados.
- **Consecuencia en plata:** Un analista que siga un manual viejo puede preparar una oferta con margen «para negociar» que ya no existe. Sin cifra.
- **Solución documentada:** Aplicar el Decreto 399 de 2021 y los documentos tipo vigentes (ver también CCE C-207 de 2024 sobre presupuesto oficial en concurso de méritos).
- **Fuentes (2):** F-048, F-125

#### TRA-22 · El AIU no está regulado y los imprevistos no son un ingreso seguro: según la entidad, se pagan siempre o solo si se prueban

- **Gravedad:** media. Pérdida acotada al porcentaje de imprevistos del contrato.
- **Tipos de contrato:** obra, interventoría
- **Descripción:** Ni el sistema de precios unitarios ni el AIU ni su porcentaje están regulados (CCE C-784 de 2024 y C-148 de 2026; Consejo de Estado 2011, exp. 20811: no hay porcentajes mínimos ni máximos), así que cada entidad fija su techo. CONTRADICCIÓN: CCE (C-401 de 2023) dice que lo usual es pagar la I como porcentaje fijo sin justificar su causación, salvo pacto especial; el Consejo de Estado (2018) avaló que Antioquia pague la I solo contra prueba, con cargo al saldo del CDP, y la Contraloría sostuvo en 2009-2012 que la I no causada no se vuelve utilidad (Cundinamarca y Antioquia lo llevaron a circulares). Según una tesis, la Contraloría rectificó su postura en 2013. La ficha menciona una I promedio de 1,53 % en una muestra de Manizales, sin ubicación.
- **Causa:** El AIU viene de la costumbre y de la formación de ingenieros, no de la ley.
- **Consecuencia en plata:** En entidades con regla de «I contra prueba», la I no demostrada no se paga: si el contratista contaba con ella como margen, su utilidad real cae en ese porcentaje (inferencia). El proponente queda atado al techo que la entidad escogió.
- **Solución documentada:** Leer en el pliego y la minuta cómo se paga la I; si no se pagará sin prueba, llevar al costo directo o a la A lo que de verdad es costo y documentar cada imprevisto hasta la liquidación. CCE: los porcentajes deben salir del análisis del sector.
- **Vigencia a revisar:** Las circulares de Antioquia son de 2013; no se verificó si siguen vigentes ni si otras entidades tienen hoy reglas análogas.
- **Fuentes (8):** F-004, F-026, F-030, F-031, F-193, F-202, F-383, F-417

#### TRA-23 · Reclamar contra el Estado tarda años y el arbitraje es caro e incierto

- **Gravedad:** alta. Inmoviliza por años sumas grandes y puede terminar en pérdida total del reclamo.
- **Tipos de contrato:** todos los tipos
- **Descripción:** Un proceso no laboral dura en promedio casi 6 años y, entre tribunal y Consejo de Estado, puede ir de 9 a 15 años. El arbitraje tiene honorarios por tramos de cuantía y riesgos propios: las directivas presidenciales exigen visto bueno previo y filtran árbitros; los árbitros no pueden decidir sobre la legalidad de actos de poderes excepcionales (en infraestructura de transporte, art. 14 de la Ley 1682); y los laudos se anulan. Ejemplo extremo: un proceso iniciado en 1998 anulado 14 años después por un cambio de jurisprudencia sobre la renuncia a la cláusula arbitral.
- **Causa:** Congestión de la jurisdicción contencioso-administrativa; directivas presidenciales y límites legales al arbitraje.
- **Consecuencia en plata:** El dinero reclamado se recupera tarde o nunca; costo de honorarios arbitrales y de procesos rehechos.
- **Solución documentada:** Paneles de resolución de conflictos (dispute boards) durante la ejecución; revisar en el pliego si hay cláusula compromisoria y si conviene; demandar los actos excepcionales ante el juez administrativo. Según Unigarro, el arbitraje sale proporcionalmente más barato que litigar 15 años en cuantías cercanas a $10.000 millones.
- **Cifras:**
  - «Duración promedio de un proceso no laboral: 5,94 años» (sin verificar (no entró en la verificación de normas)). pág. 14, nota 1 · F-456.
  - «Tribunal más Consejo de Estado: entre 9 y 15 años (Banco Mundial 2013, citado)» (sin verificar (no entró en la verificación de normas)). p. 14 (pág. 16 del PDF) · F-431.
  - «Honorarios por árbitro (2015): entre $6.443.500 y $644.350.000» (sin verificar (no entró en la verificación de normas)). p. 44 (pág. 46 del PDF), tabla del Decreto 1829 de 2013, art. 32 · F-431.
  - «Caso Convel: radicado en 1999, sentencia de unificación del 27-jul-2023» (verificada: confirmada). pág. 1 · F-175.
- **Vigencia a revisar:** No se verificó la vigencia de las tarifas del Decreto 1829 de 2013 ni de las directivas presidenciales; las cifras del Banco Mundial son de 2013.
- **Fuentes (6):** F-175, F-431, F-456, F-505, F-530, F-540

#### TRA-24 · No hay calificación pública del desempeño del contratista: el cumplido y el incumplido enfrentan las mismas garantías y requisitos

- **Gravedad:** baja. Es una ventaja que no existe, no una pérdida directa.
- **Tipos de contrato:** todos los tipos
- **Descripción:** El RUP solo registra multas, sanciones e inhabilidades; la integración del desempeño de SECOP al RUP no se ha implementado (OCDE 2022, p. 35). Comparado: Chile publica el promedio de notas de 24 meses en la ficha del proveedor; Brasil (Lei 14.133, art. 88) evalúa con indicadores objetivos anotados en el registro; México publica el nivel de cumplimiento; la UE permite excluir por deficiencias significativas. Ecopetrol ya califica a sus contratistas.
- **Causa:** Ausencia de un indicador objetivo de desempeño en el registro de proponentes.
- **Consecuencia en plata:** El contratista cumplido no puede convertir su historial en puntos ni en garantías más baratas. Sin cifra.
- **Solución documentada:** Calificación al cierre de cada contrato visible en el registro (modelos Chile, Brasil, México, UE).
- **Vigencia a revisar:** Charris y Llamas (2016) son anteriores a la Ley 2195 de 2022 y a la inhabilidad por incumplimiento reiterado. En Brasil, la anotación depende del «cadastro de atesto», no verificado en operación.
- **Fuentes (6):** F-044, F-128, F-133, F-275, F-372, F-476

#### TRA-25 · Proceso de responsabilidad fiscal contra el contratista por hallazgos de auditoría, con embargos desde el auto de apertura

- **Gravedad:** alta. Embargos e inhabilidad para contratar.
- **Tipos de contrato:** obra, interventoría, todos los tipos
- **Descripción:** Según ponentes de un curso en video (una sola fuente, canal que vende cursos), la Contraloría abre procesos al contratista como gestor fiscal por personal pagado por debajo de lo ofertado, precios no previstos que ya estaban en el presupuesto, AIU e imprevistos sin soporte, anticipo no amortizado, diseños desactualizados, hechos cumplidos y falta de mantenimiento tras la entrega.
- **Causa:** El contratista es gestor fiscal por los recursos que recibe; falta trazabilidad documental; se oferta «por ganar» sin estudiar el proyecto.
- **Consecuencia en plata:** Medidas cautelares (embargos) desde el auto de apertura que pueden paralizar al consorcio; un fallo lleva al boletín de responsables fiscales, inhabilidad, cobro coactivo y remate de bienes.
- **Solución documentada:** Llevar una tabla de trazabilidad (oficio, fecha, contenido, respuesta); seguir las respuestas de la entidad a la Contraloría durante la auditoría; dejar salvedades; pedir que se vincule a la aseguradora como tercero civilmente responsable.
- **Cifras:**
  - «La ley sí lo sustenta, con condiciones: el responsable fiscal es inhábil para contratar con el Estado 5 años desde la ejecutoria del fallo; si pasados esos 5 años no ha pagado ni ha sido excluido del boletín, «continuará siendo inhábil por cinco años si la cuantía ... fuere superior a 100 salarios mínimos legales mensuales vigentes» (2 años si >50 y ≤100; 1 año si >10 y ≤50; 3 meses si ≤10). Total hasta 10 años, pero cesa cuando la Contraloría certifica el pago. No está en Ley 2195/2022.» (corregida (texto original: «Inhabilidad de hasta 10 años cuando el daño supera 100 SMMLV, según los ponentes (no verificado en la ley)»)). min 34 · F-533.
- **Vigencia a revisar:** Plazos e inhabilidad los dan los ponentes; Ley 610 de 2000, AL 04 de 2019 y Decreto 403 de 2020 no verificados; según los ponentes, la Corte declaró inexequible buena parte del Decreto 403.
- **Fuentes (1):** F-533

## 4. Normas y cifras verificadas

Cada fila es una verificación de un agente contra el texto oficial. «Corrección o nota» viene del verificador. Las filas de DET-25 se mantienen para que la retirada sea trazable.

| Problema | Dato verificado | Resultado | Fuente oficial abierta | Ubicación | Corrección o nota |
|---|---|---|---|---|---|
| DET-25 (retirado) | TVEC obligatoria para compras que no excedan el 10 % de la menor cuantía | derogado o modificado | http://www.secretariasenado.gov.co/senado/basedoc/ley_1955_2019_pr000.html (art. 42); http://www.secretariasenado.gov.co/senado/basedoc/ley_1474_2011_pr002.html (art. 94); http://www.secretariasenado.gov.co/senado/basedoc/ley_1150_2007.html (art. 2 num. 5) | Ley 1955/2019 art. 42 adicionó el parágrafo 3 al art. 94 de la Ley 1474/2011 (TVEC obligatoria para bienes de características técnicas uniformes en acuerdo marco cuyo valor no exceda el 10 % de la menor cuantía). El Senado anota en ambos artículos «Consultar vigencia… directamente en la Ley 1150 de 2007; Art. 2 Num. 5», y ese numeral, reescrito íntegro por la Ley 2069/2020 art. 30, ya no contiene la regla de la TVEC (solo parágrafos 1 y 2) | La regla legal de la TVEC quedó fuera del texto vigente del numeral 5 del art. 2 de la Ley 1150 tras la Ley 2069 de 2020; hoy sobrevive, si acaso, en el reglamento (Decreto 1082/2015 art. 2.2.1.2.1.5.1, mod. Decreto 1860/2021), que no se pudo abrir hoy. Citar la Ley 1955 art. 42 como fuente vigente es incorrecto; mostrar como «reglamentaria, sin verificar» o no mostrar. |
| PRE-18 | Decreto 777 de 1992: monto máximo del 5 % para honorarios (solo convenios) | derogado o modificado | http://www.secretariasenado.gov.co/senado/basedoc/decreto_0777_1992.html | Decreto 777 de 1992, art. 6 (interventorías): «Estos gastos, que no podrán exceder del cinco por ciento (5%) del valor del contrato, se imputarán al mismo»; nota de vigencia del Senado: «Decreto derogado por el artículo 11 del Decreto 92 de 2017» | El 5 % era el tope de gastos de interventoría contratada en los contratos del art. 355 CP con entidades sin ánimo de lucro (art. 6), y el decreto entero está derogado por el Decreto 92 de 2017. El artículo de Scielo (sección 3.2) lo cita como si estuviera vigente; citar el Decreto 92 de 2017 si hace falta la regla actual. |
| DET-03 | Casi medio billón de pesos entregado en ejecución al Fondo Mixto del Valle, que no se rige por la Ley 80 | sin verificar | https://www.youtube.com/watch?v=M6aisVwwkEg | La Silla Vacía, min ~6:38-7:09 (no abierto) | YouTube bloqueado desde este entorno (captcha de Google); no hay transcripción ni documento oficial citado. |
| DET-05 | Régimen especial 2021: $38.099.743.432.921,50 en 366.424 contratos y convenios, 31 % del total | confirmado | https://e-archivo.uc3m.es/rest/api/core/bitstreams/8611881d-3aa0-4fc0-bdcd-890895b823c8/content | p. 117 del PDF (paginación impresa 104-105): «la contratación de régimen especial o exceptuado para el año 2021 ascendió a la suma de $38,099,743,432,921.50, con un total de 366.424 contratos y convenios suscritos, lo que representa el 31% del total… registrado en SECOP I y SECOP II» | Las dos ubicaciones del fichaje son compatibles: PDF p. 117 = impresas 104-105. |
| DET-05 | $36.249.332.879.379,50 (95 %) del régimen especial 2021 sin convocatoria pública | confirmado | https://e-archivo.uc3m.es/rest/api/core/bitstreams/8611881d-3aa0-4fc0-bdcd-890895b823c8/content | p. 117 del PDF (impresa 104-105): «$36,249,332,879,379.50 (95%) corresponden a contratación sin convocatoria pública… y $1,850,410,553,542 (5%)… precedida de convocatoria u ofertas» |  |
| DET-05 | Los documentos del régimen especial pueden publicarse hasta 3 días después de expedidos | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2025/08/Guia-para-las-Entidades-Estatales-con-regimen-especial-de-contratacion-Comentarios.pdf; http://www.secretariasenado.gov.co/senado/basedoc/ley_2195_2022_pr001.html (art. 53); https://relatoria.colombiacompra.gov.co/wp-content/uploads/2025/12/C-1643.docx | Guía CCE v02 (ago-2025) p. 29 (y p. 22): «tres (3) días posterior a la expedición de los Documentos del Proceso… artículo 53 de la Ley 2195 de 2022 y artículo 2.2.1.1.1.7.1 del Decreto 1082 de 2015… (ver Concepto C-633 de 2024)». Ley 2195/2022 art. 53 (Senado, vigente): obliga a publicar en SECOP II; Concepto CCE C-1643 (dic-2025): «tres (3) días calendario siguientes a su expedición» | Precisar: son 3 días CALENDARIO (concepto CCE C-1643), y lo generado dentro de SECOP II se publica en tiempo real; el plazo aplica a documentos producidos fuera de la plataforma. El texto del Decreto 1082 no se pudo abrir hoy (Función Pública y SUIN 503/TLS). |
| DET-06 | 15 % de los contratos sigue registrándose en SECOP I | confirmado | https://transparenciacolombia.org.co/wp-content/uploads/2026/07/ANALISIS-CONTRATACION-POST-LEY-DE-GARANTIAS_TPC.pdf | p. 11 del PDF (conclusiones): «una parte importante de los contratos (15%) continúa registrándose en SECOP I» | Ubicación: p. 11 del PDF, no p. 10. Se refiere a los contratos del periodo 22-jun a 10-jul-2026 analizados, no a toda la contratación nacional. |
| DET-07 | Convenio de asociación con ESAL por vía directa exige aporte de al menos 30 % en dinero | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/decreto_0092_2017.html (art. 5, vigente, sin nota de suspensión); https://www.redalyc.org/journal/3376/337662820011/html/ | Decreto 092/2017 art. 5: «no estarán sujetos a competencia cuando la entidad sin ánimo de lucro comprometa recursos en dinero… en una proporción no inferior al 30% del valor total del convenio». En Gómez Velásquez y Díaz Díez (Rev. Derecho del Estado 44, 2019) está en §4.2.5; la Tabla 3 es imagen | Ubicación en el artículo: sección 4.2.5, no la tabla comparativa (es imagen no legible). Los recursos pueden ser propios o de cooperación internacional; los aportes en especie no cuentan. |
| DET-08 | 44 % de los contratistas logra una sola adjudicación | confirmado | https://www.revistatransparencia.com/ret/article/download/386/428 | p. 258 de la revista (p. 26 del PDF): «probabilidad de 0.44 de obtener sólo un contrato… el 44% de los contratistas logran sólo una adjudicación» |  |
| DET-09 | Cerca del 80 % de las licitaciones sin pluralidad de oferentes; probabilidad media de pluralidad 20,6 % | confirmado | https://bffrepositorio.unal.edu.co/server/api/core/bitstreams/78e582a7-d51d-40a2-a691-7fae3a3bfd75/content | p. 5 del PDF (resumen): «el 80% de los procesos de licitación no presentan pluralidad de oferentes»; p. 73: «tenga pluralidad de oferentes es el 20,6%» |  |
| DET-09 | 84,61 % de los procesos sin pluralidad tuvo un único proponente interesado | confirmado | https://bffrepositorio.unal.edu.co/server/api/core/bitstreams/78e582a7-d51d-40a2-a691-7fae3a3bfd75/content | p. 87 del PDF: «364 procesos licitatorios que contaron con 0 o 1 proponentes… el 80,5%… el 84,61% de los procesos sin pluralidad de oferentes se licitaron con únicamente un proponente interesado» |  |
| DET-09 | 20.208 procesos (30,25 % de la muestra) con un solo competidor | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/a7f19803-9d49-42d7-b816-a09b6fed806d/content | p. 18 del PDF: «el número de procesos de selección con un solo competidor es de 20.208, es decir, el 30,25% de la muestra» |  |
| DET-09 | Licitaciones de vías con un solo oferente: del 17 % al 12 % en 2019 | confirmado | https://www.open-contracting.org/2020/07/16/open-for-business-colombias-data-driven-procurement-reforms-increase-competition/ | Case study «Public transport works»: «single-bid tenders for road works using open tendering decreased from 17% to 12% in 2019» |  |
| DET-10 | Pliego tipo sí 35,36 %, parcial 50,29 %, no 14,34 % | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/d99425d6-4b23-425a-9c13-bd1bc4902ea2/content (handle real: 1992/60362, DCEDE 2022-32) | Tabla 3 «Estadísticas de tratamiento»: Pliego tipo si 1.509 = 35.36 %; parcial 2.146 = 50.29 %; no 612 = 14.34 % | El handle citado (1992/59510) no resuelve en la API del repositorio; el documento de Moreno Mier, Natalia Estefanía (2022) «Documentos tipo: ¿Herramienta para mejorar la competencia…?» vive en hdl 1992/60362. La página web del repositorio tiene muro anti-bots; el bitstream sí abre. |
| DET-10 | De 714 procesos sin documento tipo, 78 % con 1 a 3 proponentes y 4 % con más de 10 | sin verificar | https://www.colombiacompra.gov.co/wp-content/uploads/2024/10/informe_1_semestre_-_2022_v2.pdf | Informe 1-2022 Observatorio, p. 16 (no legible) | El PDF se descargó (17 páginas) pero es de imágenes sin capa de texto: pdftotext solo recupera el índice (§4.1 Documentos tipo p. 5; §4.2 Alertas tempranas p. 14) y no hay OCR en este entorno. |
| DET-10 | 81 % de las entidades asume el oficio de alerta, solo 32 % corrige | sin verificar | https://www.colombiacompra.gov.co/wp-content/uploads/2024/10/informe_1_semestre_-_2022_v2.pdf | Informe 1-2022 Observatorio, p. 16 (no legible) | Mismo PDF de imágenes sin texto; sin OCR disponible. |
| DET-11 | Licitaciones de vías con más de 4 ofertas: 68 % en 2019 | confirmado | https://www.open-contracting.org/2020/07/16/open-for-business-colombias-data-driven-procurement-reforms-increase-competition/ | Case study «Public transport works»: «the share of tenders with more than 4 bids rose to 68%, up from 57% the previous year» |  |
| DET-11 | 74 % de los procesos municipales con un solo proponente (2016) | confirmado | https://sci.org.co/necesidad-de-pliegos-tipo-analisis-de-la-contratacion-regional-2016-2/ | SCI, 17-nov-2017: «el 74% de los procesos de contratación en los municipios de Colombia… 9.185 procesos contaran con solo un proponente»; solo 7 % (915) con más de 3 oferentes |  |
| DET-13 | Diez entidades concentraron $852 mil millones, 99,02 % del valor de consultoría de transporte | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2025/04/informe_sectorial_memorias_justificativas_interventoria_y_consultoria.pdf | p. 18 del PDF: «Con relación al servicio de consultoría, las 10 Entidades concentraron $852 mil millones de pesos equivalentes al 99,02% del total contratado» |  |
| DET-13 | 71 % de los contratos (1.236) es interventoría y 29 % (493) consultoría | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2025/04/informe_sectorial_memorias_justificativas_interventoria_y_consultoria.pdf | p. 17 del PDF: «el 71% de los contratos (1.236) corresponde al servicio de interventoría y el 29% restante (493) corresponde al servicio de consultoría» |  |
| DET-14 | Solo 9,51 % de las licitaciones de 2017 pidió una liquidez acorde con el promedio de la CCI | confirmado | https://revistas.udem.edu.co/index.php/ingenierias/article/download/2966/3362/ | p. 10 del PDF (p. 222 impresa) y Tabla 4 en p. 9 (p. 221) |  |
| DET-14 | Más del 90 % de los procesos pidió endeudamiento menor al 70 % | confirmado | https://revistas.udem.edu.co/index.php/ingenierias/article/download/2966/3362/ | p. 13 del PDF (p. 225 impresa): «el hecho de que más del 90 % de los procesos soliciten un índice de endeudamiento menor al 70 %» |  |
| DET-14 | Interventoría de unos 62 SMMLV: la combinación exigida la cumple el 6 % de las empresas; una de unos 120 SMMLV, el 51 % | confirmado | https://www.scielo.org.mx/scielo.php?script=sci_arttext&pid=S2395-87822022000100145 | Sección 3, texto del Cuadro 5: 62 SMMLV (IL ≥ 30 %, NE ≤ 5, ROE ≥ 22,5 %, ROA ≥ 19 %) «cumplidos de forma simultánea por el 6%»; 120 SMMLV «cumplidos solamente por el 51%» |  |
| DET-15 | Las cámaras de comercio tienen hasta 15 días para entregar el registro | confirmado | https://www.oecd.org/content/dam/oecd/en/publications/reports/2022/10/enhancing-the-public-procurement-suppliers-registry-in-colombia_d67741e5/36348f43-en.pdf | p. 18 del PDF: «In Colombia, however, Chambers of Commerce legally have up to 15 days to deliver the registry»; tabla comparativa «Time to complete: 15 days» | Ubicación: p. 18 (no 17-18). La OCDE añade que el plazo se amplió a 20 días por el art. 5 del Decreto 491 de 2020 hasta el 22-may-2022. La norma reglamentaria (Decreto 1082) no se pudo abrir hoy. |
| DET-15 | 10 días hábiles para que el RUP quede en firme (dicho por una practicante, sin cotejar con la norma) | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_1150_2007.html (art. 6, modificado por Decreto 19/2012 art. 221) | Ley 1150/2007 art. 6 num. 6.3: la Cámara publica el acto de inscripción, «contra el cual cualquier persona podrá interponer recurso de reposición… durante los diez (10) días hábiles siguientes a la publicación»; vencidos sin impugnación, la inscripción queda en firme | El video no se pudo abrir (YouTube bloqueado), pero la cifra sí está en la ley: 10 días hábiles contados desde la publicación del acto de inscripción, renovación o actualización. |
| DET-16 | 9 de 104 mínimas cuantías limitadas a Mipymes en Medellín (8,65 %) | confirmado | https://repository.upb.edu.co/server/api/core/bitstreams/031e3b31-7cb6-4419-8d86-22f86fd3cf25/content | p. 26 del PDF: «en los procesos de mínima cuantía, 104 en total, se limitaron a Mipymes 9 procesos de selección, para un porcentaje de limitación de 8,65%» |  |
| DET-16 | 7 de 24 procesos limitados (29,17 %), sobre todo interventoría | confirmado | https://repository.upb.edu.co/server/api/core/bitstreams/031e3b31-7cb6-4419-8d86-22f86fd3cf25/content | p. 28 del PDF: «En la modalidad de concursos de méritos cuyo valor no supera los $457.297.264, se tramitaron 24 procesos… 7 fueron limitados a Mipymes… 29,17%»; los objetos listados son interventorías | Precisar: son concursos de méritos (no mínima cuantía). |
| DET-16 | 2 de 12 convocatorias limitadas en Zipaquirá en 2020 (16,66 %) | confirmado | https://repository.umng.edu.co/server/api/core/bitstreams/33f9ba44-7fc4-43ff-bf18-b126e0b9ee5e/content | p. 31 del PDF: «Entre los 12 procesos… solamente en 2 procesos se recepcionaron manifestaciones de interés… 16,66% de las convocatorias tuvo esta limitación» |  |
| DET-16 | 65 % de las empresas pide información más clara; 78 % percibe que no es fácil participar | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2024/09/04._estudio_de_criterios_diferenciales_mipyme_y_emprendimiento_y_empresas_de_mujeres_-_minima_cuantia_version_2.pdf | p. 10 del PDF, nota al pie 16: encuesta del DNP citada en Gaceta del Congreso 959 del 21-sep-2020, p. 25: «65%… la información… debe ser más clara… el 78 % de las empresas percibe que no es tan fácil participar» | Dato de tercera mano: CCE cita la Gaceta del Congreso, que cita la encuesta del DNP. |
| DET-16 | Certificado de tamaño con fecha de máximo 60 días calendario | confirmado | https://operaciones.colombiacompra.gov.co/sites/cce_public/files/cce_documents/guia_para_promover_la_participacion_de_las_mipymes_en_los_procesos_de_compra_publica_cce-gad-gi-26_1.pdf | Guía CCE-GAD-GI-26 v01 (16-sep-2024), p. 18: «copia del registro mercantil, del certificado de existencia y representación legal o del RUP… con una fecha de máximo sesenta (60) días calendario, anteriores a la prevista en el cronograma… para el inicio del plazo para solicitar la convocatoria limitada» | La guía reproduce el art. 2.2.1.2.4.2.4 del Decreto 1082/2015 (mod. Decreto 1860/2021 art. 5); el decreto mismo no se pudo abrir hoy (Función Pública/SUIN sin respuesta). Los 60 días se cuentan hacia atrás desde la fecha de inicio del plazo para pedir la limitación. |
| DET-17 | Solo el 60 % de los procesos publicaba el acta de cierre de solicitudes Mipyme | confirmado | https://repository.umng.edu.co/server/api/core/bitstreams/33f9ba44-7fc4-43ff-bf18-b126e0b9ee5e/content | p. 31 del PDF: «De los 20 contratos, 12 incluían… acta de cierre de convocatoria a las Mipymes, lo que indica que el 60% de los procesos incluyeron información» | Muestra de 20 contratos de Zipaquirá, 2020. |
| DET-19 | Mínima cuantía de obra en Sogamoso: 11,0 días hábiles en promedio de publicación a adjudicación | confirmado | https://repository.uniminuto.edu/server/api/core/bitstreams/315b2916-6467-493a-9dda-3cdd26ad0b2c/content | p. 63 del PDF, Figura 18 (procesos en SECOP II): «se procede a calcular el valor promedio, obteniéndose un total de 11,0 días hábiles» | Es el promedio de los procesos tramitados por SECOP II; el trabajo compara con SECOP I. |
| DET-21 | 64 % de los contratos adjudicados en 2017 y 61 % en 2018 fueron adicionados | confirmado | https://dialnet.unirioja.es/descarga/articulo/8121595.pdf | Tabla 6, p. 63 impresa (PDF p. 11): adicionados 7 de 11 (64 %) en 2017 y 11 de 18 (61 %) en 2018, licitaciones del Departamento del Tolima | Muestra pequeña: 11 y 18 contratos de licitación pública del Tolima. |
| DET-21 | 60 % de los contratos se prorrogó más del 50 % del plazo inicial en 2017, y 75 % en 2018 | confirmado | https://dialnet.unirioja.es/descarga/articulo/8121595.pdf | p. 63 impresa (PDF p. 11), tras Tabla 5: «el 60 % de los contratos se prorrogó por encima del 50 % del plazo inicial en el año 2017, mientras que en el año 2018 lo fueron el 75 %» |  |
| DET-21 | Decisión de ofertar: 90,0 % de acierto con máquina de vectores de soporte contra 47,5 % con puntaje ponderado (40 proyectos) | confirmado | https://journals.vilniustech.lt/index.php/JCEM/article/download/1097/849 | JCEM 23(5): 641-649, p. 647: Accuracy (%) 47.5 (WEC) vs 90.0 (SVM6); «40 projects» |  |
| DET-22 | 16 % de 59.813 procesos iniciados entre 2010 y 2016 terminó de forma abrupta después de convocado | confirmado | https://dialnet.unirioja.es/descarga/articulo/7384264.pdf | Via Iuris 26 (2019), p. 89 (PDF p. 5): «el 16 % de 59.813 procesos contractuales iniciados en Colombia entre enero de 2010 y diciembre de 2016 terminaron de forma abrupta después de convocados» |  |
| DET-22 | Terminación abrupta en construcción: 8,9 % selección abreviada, 8,7 % concurso, 7,5 % mínima cuantía, 7,2 % licitación | confirmado | https://dialnet.unirioja.es/descarga/articulo/7384264.pdf | p. 95 (PDF p. 11), Tabla 6 sector F: «Selección abreviada, Concurso de Méritos, Contratación por mínima cuantía y Licitación Pública, los porcentajes de terminación abrupta son del 8.9 %, 8.7 %, 7.5 % y 7.2 % (Secop I, 2017)» |  |
| DET-23 | 43.092 contratos suscritos y 50.645 procesos sin firmar tras la ley de garantías | confirmado | https://transparenciacolombia.org.co/wp-content/uploads/2026/07/ANALISIS-CONTRATACION-POST-LEY-DE-GARANTIAS_TPC.pdf | pp. 4, 10 y 11 del PDF: «Entre el 22 de junio y el 10 de julio de 2026… 43.092 contratos firmados»; «se identificaron 50.645 procesos sin firmar aún» |  |
| DET-23 | Unos 37 billones de pesos en unos 504.000 contratos antes de la ley de garantías, 61 % de entes territoriales | sin verificar | https://www.youtube.com/watch?v=2_j5MLCkJQs | CCE, video, min 0-1 (no abierto) | YouTube bloqueado desde este entorno (redirección a google.com/sorry). |
| DET-24 | Aportes mayores al 2 % del tope de la campaña inhabilitan para contratar con el mismo nivel de gobierno | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_0080_1993.html (art. 8 num. 1 literal k, texto por Ley 1778/2016 art. 33); https://transparenciacolombia.org.co/wp-content/uploads/2024/01/II-Informe-elecciones-y-contratos-3.pdf p. 25 | Ley 80/1993 art. 8-1-k vigente: «aportes superiores al dos por ciento (2.0%) de las sumas máximas a invertir por los candidatos… no podrán celebrar contratos con las entidades públicas, incluso descentralizadas, del respectivo nivel administrativo para el cual fue elegido el candidato»; dura todo el período; cubre 2.º grado de consanguinidad, 2.º de afinidad, 1.º civil y personas jurídicas de sus controlantes; no aplica a contratos de prestación de servicios profesionales | Cubre Presidencia, gobernaciones, alcaldías y Congreso. La nota de vigencia del Senado da como última reforma la Ley 1778/2016 art. 33 (que bajó el 2,5 % original de la Ley 1474/2011 al 2 %). |
| DET-24 | 86,8 % de los contratos de financiadores de campañas se hacen por modalidades directas | confirmado | https://transparenciacolombia.org.co/wp-content/uploads/2024/01/II-Informe-elecciones-y-contratos-3.pdf | p. 23 del PDF: «el 86,8% de los contratos que celebran los financiadores se hacen [por] Directa… casi el 40% y Régimen Especial 32%»; p. 31: 89,2 % en elecciones nacionales 2018 y 86,8 % en territoriales 2019 | El 86,8 % corresponde a las elecciones territoriales de 2019 (nacionales 2018: 89,2 %). |
| DET-25 (retirado) | 78 % de las órdenes de compra 2019-2021 concentradas en los 10 instrumentos de mayores ventas | confirmado | https://repository.umng.edu.co/bitstreams/f5969379-3400-43fe-92fa-46e7f533b3f0/download | p. 17 del PDF: «del total de las órdenes de compras adjudicadas, el 78% están concentradas en los 10 instrumentos con mayores ventas» (2019: 63 %, 2020: 85 %, 2021: 78 %) | Ubicación: p. 17 del PDF, no p. 18. |
| DET-25 (retirado) | Liquidez mayor o igual a 1 y endeudamiento menor o igual a 85 % | sin verificar | https://www.youtube.com/watch?v=rZ84bBUkti8 | Video Colombia Productiva/iNNpulsa con CCE, min 91 (no abierto) | YouTube bloqueado. No es una regla legal: los indicadores financieros los fija cada pliego (en documentos tipo, la matriz de indicadores por rango de valor); mostrar como ejemplo, nunca como umbral normativo. |
| EJE-03 | 41 % de la muestra con prórroga, 24 % con adición presupuestal y 17 % con ambas | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/06ba0096-11cf-4d20-8335-9a9bbdde9a5a/content | p. 13 («el 41 % de la muestra incurrió en prórroga, un 24 % en una adición presupuestal y un 17 % comparte ambas condiciones») |  |
| EJE-03 | 177 proyectos (19,7 %) con desviación de costo y 175 (19,5 %) con desviación de tiempo en vías rurales | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/1008e950-78fd-45cb-a688-f11426e775ed/content (resuelto desde https://hdl.handle.net/1992/77732 vía la API DSpace) | Tabla 4.5, p. 87 del PDF («Of these, 177 projects (19.7%) exhibited cost deviations, and 175 (19.5%) exhibited time deviations», 897 proyectos) | Página 87 del PDF, no 88. |
| EJE-03 | 1 de cada 2 proyectos de más de 2.000 SMMLV se retrasa | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/1008e950-78fd-45cb-a688-f11426e775ed/content (resuelto desde https://hdl.handle.net/1992/77732) | §4.4.3, p. 88 del PDF («a maximum of 51.6% for contracts exceeding 2000 minimum wages … 1 in 2 projects with a value greater than 2000 minimum wages experience delays in completion») |  |
| EJE-03 | 1.478 de 1.842 contratos de licitación pública de obra con adiciones (80 %) | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/2cdc974f-1fd0-483b-9088-f251039dac67/content (resuelto desde https://hdl.handle.net/1992/63462) | §7.2 Análisis descriptivo, p. 14 del PDF («1.842 contratos de los cuales 1.478 han sufrido adiciones, reflejando una tasa de adición del 80%») |  |
| EJE-03 | Índice de crecimiento del plazo de 1,49 en promedio frente a 1,07 del valor; 71,2 % de contratos modificados, 55,4 % en valor y 85,1 % en plazo | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/bb4b8752-6c38-4905-96ba-0ab4b07f438d/content | p. 19 del PDF, tablas: ICV promedio PRECOVID 1.07; ICPL promedio 1.49; %PM 71.2 %, %PMV 55.4 %, %PMPL 85.1 % | Son los valores de la muestra PRECOVID; la columna COVID da 1.09, 2.71, 97.0 %, 53.1 % y 100 %. |
| EJE-03 | Desviación en costo en el 60 % y en tiempo en el 56 % de los contratos viales analizados | confirmado | https://eventos.antac.org.br/index.php/sibragec/article/download/80/76 | p. 6 (Figura 4: «desviación en costos … 60% de los casos y con desviación en tiempo … 56%») |  |
| EJE-03 | Más del 75 % de los procesos con un único proponente | confirmado | https://eventos.antac.org.br/index.php/sibragec/article/download/80/76 | p. 7 («en más del 75% de los procesos se haya presentado un único proponente», Figura 6) |  |
| EJE-04 | Prórroga de 86 días que llevó a adicionar la interventoría en $39,8 millones, calificados como sobrecosto | confirmado | https://www.contraloria.gov.co/documents/20125/344141/OBRAS+INCONCLUSAS.pdf/653bb48c-3d1e-dda5-bd9a-8746296e5201?t=1626413021918&download=true (Informe de Auditoría Obras Inconclusas 2007-jun 2011, CGR-CDDJS No. 051, dic-2011) | PDF p. 8 (hallazgo No. 1, FORPO, contratos 104-3-2010 y 137-5-2010) | Texto literal: «la prórroga concedida permitió que el contrato de interventoría fuese adicionado en $39.8 millones, convirtiéndose esta cifra en un sobre-costo». La prórroga de 86 días llevó el contrato de 3 a 6 meses. Está en la p. 8 del PDF, no en la 9. |
| EJE-04 | Plazo adicional de 450 días con unos $110.000.000 por mes de interventoría | sin verificar | https://bibliotecadigital.udea.edu.co/handle/10495/49735 (Ríos & Díaz Osorio, 2025, UdeA) | p. 17 | La ficha del handle responde (título, autoras, año 2025), pero la descarga del PDF (bitstreams/db5ea9a2-.../download) devuelve una página «Bot Detection» con curl y con WebFetch. No se pudo abrir el texto. |
| EJE-04 | Se sumaban 314 días de atraso en una ampliación de 150 días | sin verificar | https://bibliotecadigital.udea.edu.co/handle/10495/49735 | p. 19 | Misma barrera: el bitstream del repositorio UdeA devuelve «Bot Detection» (HTML, 200) en lugar del PDF. |
| EJE-04 | 123 días de ampliación: 74 imputables a la entidad (60 %) y 49 al contratista (40 %) | sin verificar | https://bibliotecadigital.udea.edu.co/handle/10495/49735 | p. 23 | Misma barrera: el bitstream del repositorio UdeA devuelve «Bot Detection» en lugar del PDF. |
| EJE-06 | Para aprobar ítems no previstos se debe tramitar la modificación contractual dentro del límite del parágrafo del art. 40 de la Ley 80 | confirmado | https://colombiacompra.gov.co/wp-content/uploads/2025/11/GUIA-PARA-LA-CONTRATACION-DE-OBRA-PUBLICA-comentarios.pdf | PDF p. 93, § 5.7.5 Ítems no previstos | Literal: «Para aprobar los ítems no previstos se deberá tramitar la modificación contractual correspondiente, para la cual deberá atenderse el límite previsto en el parágrafo del artículo 40 de la Ley 80 de 1993». Ojo: es la versión «comentarios» (borrador para observaciones, V1), no una guía definitiva. |
| EJE-07 | Las adiciones no pueden superar el 50 % del valor inicial expresado en salarios mínimos legales mensuales | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_0080_1993.html (compilación actualizada al 15-oct-2026) | Ley 80 de 1993, art. 40, parágrafo, inciso 2 | Literal: «Los contratos no podrán adicionarse en más del cincuenta por ciento (50%) de su valor inicial, expresado éste en salarios mínimos legales mensuales». Vigente; el único texto añadido (Decreto Legislativo 537 de 2020) perdió fuerza ejecutoria al terminar la emergencia sanitaria. |
| EJE-07 | Se pueden ejecutar mayores cantidades por valores incluso mayores al 50 % siempre que la entidad las autorice | confirmado | https://relatoria.colombiacompra.gov.co/conceptos/c-465-de-2024/ | Concepto C-465 de 2024 (23-sep-2024, rad. RS20240923013367), apartado «Modificación de los contratos estatales – Procedencia – Límites» | Precisión: CCE atribuye la tesis a la jurisprudencia reciente de la Sección Tercera del Consejo de Estado («existe cierto consenso», sin sentencia de unificación) para contratos a precios unitarios, y advierte que una ejecución desproporcionada del valor inicial «puede ser sintomática de falencias en la planeación». No es una autorización incondicional. |
| EJE-07 | Si la modificación unilateral altera el valor en un 20 % o más del inicial, el contratista puede renunciar a continuar | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_0080_1993.html | Ley 80 de 1993, art. 16, inciso 2 | Literal: «Si las modificaciones alteran el valor del contrato en un veinte por ciento (20%) o más del valor inicial, el contratista podrá renunciar a la continuación de la ejecución». Sin notas de modificación. |
| EJE-08 | Adición promedio del 52,99 % de la inversión total; el 58,33 % de los contratos de obra necesitó algún ajuste | confirmado | https://bffrepositorio.unal.edu.co/server/api/core/bitstreams/0c075db0-6253-4528-acc7-e980fe4b992d/content | PDF pp. 106-109 (52,99 % en PDF p. 109; 58,33 % en PDF pp. 106 y 108) | Cifras confirmadas: «en las 12 obras asociadas a estos estudios fue necesario adicionar, en promedio, un 52,99% de la inversión total» y «el 58,33% de los contratos de obra necesitaron algún tipo de ajuste» (contratos de estudios y diseños de la EDU, 2013). La ubicación pp. 99-102 no coincide con la paginación del PDF (106-109). |
| EJE-08 | Aumento del presupuesto de 24 %, 26 %, 23 % y 8 % en los cuatro casos | confirmado | https://revistas.esap.edu.co/index.php/polemica/article/download/948/719/3814 | PDF p. 25, Tabla 2 (fila «Aumento del presupuesto») | Tabla literal: Aumento del presupuesto 24 % / 26 % / 23 % / 8 %; Aumento del plazo 58 % / 86 % / 33 % / 7 %. |
| EJE-10 | El 36 % de las declaratorias de caducidad fueron demandadas y en el 20 % de esos casos la entidad fue condenada | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/eb12ab32-d3fe-408b-ad32-c8ae76252f21/content | PDF p. 56 (también p. 86) | Literal: «Según la CCI (2021), en los últimos 5 años el 36% de las declaratorias de caducidad fueron demandadas y en el 20% de esos casos las entidades fueron condenadas». Es cita de segunda mano (estudio CCI 2021 no abierto). Está en PDF p. 56, no 55. |
| EJE-11 | Colombia 2017: plazo legal de 30 días; tiempo real para recibir el pago entre 31 y 90 días; los intereses no se pagan automáticamente | confirmado | https://openknowledge.worldbank.org/server/api/core/bitstreams/26bf3f46-3123-5072-8222-eccdd05a9b55/content (Benchmarking Public Procurement 2017, Banco Mundial) | PDF p. 87, ficha Colombia, «Payment of suppliers score» | Ficha literal: Legal timeframe to process payment: 30; Time for supplier to actually receive payment: Between 31 and 90; Interests payable: Yes; automatically paid without request: No. |
| EJE-11 | Pagos a mipymes en máximo 60 días calendario desde la aceptación de la factura, sujeto al Plan Anualizado de Caja | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_2024_2020.html | Ley 2024 de 2020, art. 12 y parágrafo 1 | Literal: «los pagos deberán realizarse en un plazo máximo de sesenta (60) días calendario siguientes, a la aceptación de la factura. PARÁGRAFO 1o. El cómputo del plazo ... estará sujeto a la disponibilidad del Plan Anualizado de Caja (PAC)». Vigente desde 1-ene-2021, sin modificaciones. |
| EJE-11 | Si la entidad rechaza la factura, el término de 30 días calendario empieza a contar desde la aprobación de la nueva factura | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2024/08/cce-gam-gi-63-_guia_general_de_los_acurdo_marco_de_precioc_v2_23-05-2024_1.pdf | Guía CCE-GAD-GI-63 v2 (23-may-2024), PDF p. 39 | Literal: entidades aprueban o rechazan la factura en 3 días hábiles; pagan dentro de los 30 días calendario siguientes; si no cumple requisitos, «el término de treinta (30) días calendario empezará a contar a partir de la aprobación de la nueva factura». |
| EJE-11 | Causal de suspensión de la entidad en la TVEC: mora de 30 días calendario o más en el pago de facturas | confirmado | https://sig.sdis.gov.co/images/documentos_sig/procesos/gestion_contractual/documentos_asociados/20230414_cce-gad-idi-01_terminos_y_codiciones_de_uso_de_la_tienda_virtual_del_estado_colombiano_v2_08-08-2022docx.pdf | Términos y condiciones TVEC v2 (08-08-2022), PDF p. 11, § IX, literal (e)(iii) | Literal: «(iii) mora en el pago de sus facturas por treinta (30) días calendario o más; o (iv) que hayan presentado mora en el pago de sus facturas en cuatro (4) oportunidades en un mismo año». Copia alojada en SDIS, no en CCE. |
| EJE-11 | Pueden pasar 90 días sin recibir el pago | sin verificar | https://www.repository.fedesarrollo.org.co/bitstream/handle/11445/4131/Repor_Abril_2021_N%C3%BA%C3%B1ez_Reina_y_Ruiz_final.pdf?sequence=5&isAllowed=y | p. 78 | El repositorio de Fedesarrollo responde con una página anti-bot («Making sure you're not a bot!», HTML 7 KB) con curl y 403 con WebFetch. No se abrió el PDF. |
| EJE-11 | Plazos de pago con un promedio de 90 días (Toro, 2018) | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/fa0f149e-4b48-4ed4-b05a-a9d9afe04cf6/content | PDF p. 45 (pág. impresa 44) | Literal: «los periodos de pago son fijados por las partes fuerte de la relación contractual con un promedio de 90 días (Toro. 2018)». Cita de segunda mano. |
| EJE-11 | Facturas pagadas entre 60 y 180 días (ACOPI, 2017) | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/fa0f149e-4b48-4ed4-b05a-a9d9afe04cf6/content | PDF p. 46 (pág. impresa 45) | Literal (cita de ACOPI 2017, p. 63): «facturas ... pagadas entre los 60 y 180 días y les genera una iliquidez en su flujo de caja». |
| EJE-12 | El anticipo y el pago anticipado no pueden exceder el 50 % del valor del contrato | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_0080_1993.html | Ley 80 de 1993, art. 40, parágrafo, inciso 1 | Literal: «se podrá pactar el pago anticipado y la entrega de anticipos, pero su monto no podrá exceder del cincuenta por ciento (50%) del valor del respectivo contrato». Vigente. |
| EJE-14 | IBC del independiente: 40 % de los ingresos mensuales, sin superar 25 SMMLV | confirmado | https://www.ugpp.gov.co/wp-content/uploads/2026/01/ABC-Trabajador-Independiente-Contrato-Prestacion-Servicios.pdf | ABC UGPP, PDF p. 2 (y p. 6) | Literal: «el IBC es el 40% de sus ingresos mensuales - honorarios ... nunca puede ser inferior a un (1) SMMLV ... tampoco puede ser superior a veinticinco (25) SMMLV». Para prestación de servicios no procede deducción de costos ni presunción de costos. |
| EJE-15 | Solo el 15,63 % de 64 contratos de interventoría se ejecutó en los tiempos y el presupuesto pactados | confirmado | https://www.scielo.org.mx/scielo.php?script=sci_arttext&pid=S2395-87822022000100145 | Conclusiones (Chamorro, Pérez y Serrano, Ciencia ergo-sum 29(1), 2022) | Literal: «nada más el 15.63% de los 64 contratos de interventoría fue ejecutado en los tiempos y al presupuesto pactado» (10 de 64). |
| EJE-15 | Ejecución de los negocios supervisados del 95,67 %: solo se pagó lo ejecutado y no la totalidad de la propuesta | confirmado | https://relatoria.colombiacompra.gov.co/wp-content/uploads/2024/04/1705955653925-25000233600020170197902_69340.pdf | Ficha (PDF p. 2) y cuerpo de la sentencia (PDF pp. 13 y 15) | Literal: «la ejecución de los negocios supervisados fue del 95,67/100%, circunstancia que refleja una realización parcial»; el pago se calculó proporcional al avance ($2.243.546.272). |
| EJE-17 | El 86 % de los informes de 200 proyectos críticos tiene deficiencias de calidad y el 61 % omite situaciones | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/460b8db6-07a1-4b94-82ce-dfa2f91d06cd/content | PDF p. 29, Tabla 7 | Tabla 7: calidad de informes 172 de 200 (86 %); omisión 122 de 200 (61 %); oportunidad 31 %. Texto: «el 86% de estos presentan deficiencias en su calidad, entre ellos un 61% por omitir situaciones». |
| EJE-17 | El 52,17 % de los proyectos visitados presentó deficiencias en la interventoría | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/460b8db6-07a1-4b94-82ce-dfa2f91d06cd/content | PDF pp. 22 y 24 (y p. 7) | Literal: «El 52,17% de los proyectos visitados por el SMSE DNP SGR, del periodo 2013-2018, presentó deficiencias en la actividad de la interventoría» (3.836 visitas a proyectos de regalías). |
| EJE-19 | Cláusula penal de hasta 20 SMMLV si el proveedor no cotiza en al menos 5 eventos en un año | confirmado | https://certicontratos.alcaldiabogota.gov.co/VIGENCIA_2024/CTO%201332-2024%20OC%20136538/01.%20Suscripci%C3%B3n%20e%20Inicio/CCE-255-AMP-2021%20FERRETER%C3%8DA.pdf (misma minuta en https://operaciones.colombiacompra.gov.co/sites/cce_public/files/cce_tienda_virtual/01._cce-255-amp-2021_contrato.pdf) | Minuta CCE-255-AMP-2021, PDF p. 38, cláusula 20 | Literal: «Colombia Compra Eficiente podrá imponer clausula penal pecuniario al proveedor de hasta 20 SMMLV cuando no haya cotizado en al menos, cinco (5) eventos de cotización en el término de un año, contado a partir de la primera NO cotización». |
| EJE-19 | Actualización de precios solo en febrero y diciembre si la variación de insumos supera el 10 %; las órdenes en ejecución no se modifican | confirmado | https://certicontratos.alcaldiabogota.gov.co/VIGENCIA_2024/CTO%201332-2024%20OC%20136538/01.%20Suscripci%C3%B3n%20e%20Inicio/CCE-255-AMP-2021%20FERRETER%C3%8DA.pdf | Minuta CCE-255-AMP-2021, PDF p. 17, literales (b) y (d) | Precisión: la solicitud del proveedor por alza de materias primas (>10 % en PVC, caliza, arcilla, hierro, yeso, acero, polímeros) es en febrero y diciembre; además hay ajuste anual automático por IPC el quinto día hábil de febrero. «Órdenes de Compra en ejecución no serán sujetas a modificación como resultado de la actualización de precios». |
| EJE-21 | Porcentaje de provisión no superior al 10 % ni inferior al 5 %, con sanciones por incumplimiento injustificado mediante causales de multa | confirmado | https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/pdf/decreto_1860_2021.pdf | Decreto 1860 de 2021, art. 3, que adiciona el art. 2.2.1.2.4.2.16 al Decreto 1082 de 2015 | Literal: «en un porcentaje que no será superior al diez por ciento (10%) ni inferior al cinco por ciento (5%) de los bienes o servicios requeridos ... precisando las sanciones pecuniarias producto del incumplimiento injustificado de esta a través de las causales de multa». Cita correcta: art. 2.2.1.2.4.2.16 del Decreto 1082/2015 (adicionado por D. 1860/2021, art. 3). Es un deber de fomento en pliegos, no un mínimo legal fijo. |
| EJE-22 | No hay interrupción si no han pasado más de 30 días hábiles entre contratos de objeto igual o similar | confirmado | https://www.consejodeestado.gov.co/documentos/boletines/263/App_Data11_230012333000201300390011SENTENCIA20221119004429_TCListadoTitulados133209714950386134.pdf | CE, Sección Segunda, Subsec. A, 27-oct-2022, rad. 23001-23-33-000-2013-00390-01 (3612-2015), PDF p. 11 | Literal: «no hay solución de continuidad entre el contrato anterior y el sucedáneo, si entre la terminación de aquél y la fecha en que inicie la ejecución del otro, no han transcurrido más de treinta (30) días hábiles, siempre y cuando ... los objetos contractuales ... son iguales o similares». Aplica a contratos de prestación de servicios con relación laboral encubierta (regla de unificación citada). |
| EVA-02 | Plazo para subsanar: 5 días en licitación, 3 en selección abreviada y 1 en mínima cuantía | confirmado | https://apidspace.javeriana.edu.co/server/api/core/bitstreams/45da1ffd-5bc5-4547-9402-8bf2aba27a99/content (norma: http://www.secretariasenado.gov.co/senado/basedoc/ley_1150_2007.html) | Mesa (2023), p. 43 del PDF («para el caso de la licitación pública, es de cinco (5) días; para el de selección abreviada con subasta inversa y de menor cuantía, tres (3) días; o, para el proceso de mínima de cuantía, un (1) día») | Fuente académica. La regla legal vigente (Ley 1150 art. 5 par. 1, mod. art. 5 Ley 1882 de 2018, verificada en el Senado) dice «hasta el término de traslado del informe de evaluación que corresponda a cada modalidad, salvo lo dispuesto para mínima cuantía y subasta»; los días concretos salen del traslado de cada modalidad, no de una cifra única en la ley. |
| EVA-03 | Chile: inhabilidad si el proveedor entrega antecedentes falsos y no los corrige en 10 días | confirmado | https://www.chilecompra.cl/registro-de-proveedores/ | Página «Registro de Proveedores» de ChileCompra, causal 6: «antecedentes maliciosamente falsos … sin que el proveedor hubiere enmendado la información dentro del plazo de diez días desde notificado el hecho» |  |
| EVA-05 | El acto de inscripción queda en firme 10 días hábiles después de publicado | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_1150_2007.html | Ley 1150 de 2007, art. 6 num. 6.3 (artículo modificado por el art. 221 del Decreto 19 de 2012): «la Cámara publicará el acto de inscripción, contra el cual cualquier persona podrá interponer recurso de reposición … durante los diez (10) días hábiles siguientes a la publicación» | La ley fija los 10 días hábiles como plazo del recurso de reposición; la frase «queda en firme» es la consecuencia (reglamentada en el Decreto 1082, no verificado aquí). El artículo vigente es el del Decreto 19 de 2012, no el de la Ley 1474. |
| EVA-08 | Aclaración obligatoria si la oferta es 20 % o más inferior al costo total estimado | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2025/04/guia_para_el_manejo_de_ofertas_artifialmente_bajas.pdf | Guía CCE-EICP-GI-27 V01 (16-12-2024), p. 10 (y p. 15): «La Entidad Estatal debe solicitar aclaración a los proponentes cuyas ofertas sean menores en un 20%, o un mayor porcentaje, al costo total estimado por la Entidad Estatal» |  |
| EVA-13 | Solo en el 38,52 % de las zonas se presentó más de una propuesta (PAE Bogotá, 2007-2017) | confirmado | https://sedeelectronica.sic.gov.co/noticias/superindustria-sanciona-cartel-en-procesos-de-seleccion-en-el-programa-de-refrigerios-escolares-del-pae-en-bogota-con-multas-por-28-mil | Comunicado de la SIC: «solamente en el 38,52% de las ZONAS se presentó más de una propuesta … decreció al 25% al tenerse en cuenta exclusivamente … propuestas habilitadas» |  |
| EVA-14 | 20,4 % de los procesos con más de un oferente al inicio; 32 % de ellos termina con un solo habilitado | confirmado | https://www.repository.fedesarrollo.org.co/bitstream/handle/11445/3171/TE_No_166_2016.pdf?sequence=2&isAllowed=y | Fedesarrollo TE 166, p. 11 del PDF («únicamente el 20,4% de los procesos de contratación en este sector cuenta con más de un oferente al inicio, de los cuales un 32% finaliza con un solo habilitado (Meléndez, 2016)») |  |
| EVA-14 | 2018: 2.871 proponentes en 124 procesos y 2.084 habilitados (27 % deshabilitados); 2019: 443 presentados y 272 habilitados (38 %) | confirmado | https://sci.org.co/wp-content/uploads/file/volumen1_informe_contratacion_2019.pdf | SCI, Informe de contratación 2019, vol. I, p. 48 («2871 proponentes a los 124 procesos … se habilitaron 2084 … 27% … 443 proponentes y se habilitaron 272, es decir el 38%») |  |
| EVA-19 | Al menos el 25 % de los pagos a Mipymes, o una Mipyme con al menos el 25 % de participación que aporte al menos el 25 % de la experiencia acreditada | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_2069_2020.html | Ley 2069 de 2020, art. 35 num. 10: «por lo menos el veinticinco por ciento (25%) del total de pagos realizados a MIPYMES … o … proponente plural siempre que: (a) … participación de por lo menos el veinticinco por ciento (25%); (b) … aporte mínimo el veinticinco por ciento (25%) de la experiencia acreditada; y (c) …» | Sin nota de modificación sobre el numeral 10 en la página del Senado (las notas de vigencia del art. 35 afectan otros numerales). |
| EVA-23 | Comentarios al informe de precalificación durante los dos días hábiles siguientes; sorteo para conformar la lista | sin verificar | https://www.youtube.com/watch?v=Wl5Zrqp5M1o | Video Fondo Rotatorio de la Policía, min 2-3 | Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar; la regla legal (Decreto 1082, precalificación en concurso de méritos) no se abrió en esta pasada. |
| EVA-24 | Un competidor adicional reduce en 0,58 % el coeficiente de adjudicación; el rango va de 0,58 % a 1,33 % | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/a7f19803-9d49-42d7-b816-a09b6fed806d/content (resuelto desde https://hdl.handle.net/1992/50900 vía la API DSpace; la página del handle exige reto antibots) | Beltrán y Arenas (2020): resumen p. 1 («oscila entre 0.58% y el 1.33%»), p. 23 («el aumento de 1 competidor reduce en 0.58% el Coeficiente de Adjudicación»), p. 25 (1.33 %) |  |
| FIR-06 | Adiciones de interventoría que muchas veces superan el 50 % del contrato | sin verificar | https://www.youtube.com/watch?v=73fRgANsODc | Charlas de Contratación Estatal, módulo 7, min 8 | Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar. |
| FIR-11 | Anticipo del 15 % en estudios previos que subió al 35 % y se firmó como pago anticipado | sin verificar | https://www.youtube.com/watch?v=pI4wKtJYJy0 | Video pI4wKtJYJy0, min 2 | Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar. |
| FIR-11 | 35,86 % desembolsado y el plazo venció con 7,5 % de obra | sin verificar | https://www.youtube.com/watch?v=pI4wKtJYJy0 | Título del video pI4wKtJYJy0 | Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry); ni el título se pudo leer. Dejado sin verificar. |
| FIR-14 | Expectativa del contralor: amparo de cumplimiento entre 70 % y 90 % | sin verificar | https://www.youtube.com/watch?v=KapFjMPR8yE | Panel Fasecolda (KapFjMPR8yE), min 13 | Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar. |
| LIQ-05 | Avance discutido al liquidar: interventoría 85 %, entidad 87,5 %, contratista 99 % | sin verificar | https://www.youtube.com/watch?v=lfBN4r9TP78 | video de Gilberto Pedraza, min 53 | Fuente audiovisual: no se puede abrir ni transcribir desde esta sesión. Es un caso narrado, no un dato normativo. |
| LIQ-14 | Indemnización de referencia: 5 % del valor total de la propuesta | confirmado | https://www.redjurista.com/appfolders/images/news/25000-23-36-000-2014-00859-02%20(60644)_20241206.pdf | CE 60644, PDF p. 39 (y nota 22, p. 39; nota 24, p. 40) | Literal: «quienes pretenden celebrar contratos con el Estado esperan obtener un 5% del valor de la propuesta como utilidad»; se ajusta por regla de tres si la oferta es menor al presupuesto oficial (4,7 % en el caso). Copia alojada en redjurista, no en la relatoría oficial. |
| LIQ-14 | Segunda postura: se deduce el 50 % de la utilidad bruta estimada si no se prueban gastos | confirmado | https://revistas.udem.edu.co/index.php/opinion/article/download/143/127 | Rico Puerta, Opinión Jurídica 6(11), 2007, PDF p. 5 (pág. impresa 121) | Literal: «el principio de equidad estima procedente que se deduzca de la utilidad bruta estimada por el actor, el 50%»; el artículo la presenta como segunda etapa (2000), superada por la tercera (2002, 100 %). |
| LIQ-15 | 200 laudos con la Nación convocada: 79 desfavorables a la entidad (40 %); condenas $3.497.635 millones frente a pretensiones $7.855.674 millones (44,5 %) | confirmado | https://www.defensajuridica.gov.co/wp-content/uploads/2026/07/Informe-de-litigiosidad-segundo-trimestre-2026.pdf | ANDJE, Informe de litigiosidad 2T-2026, PDF p. 44 (y p. 43) | Confirmado: 200 laudos en calidad de convocada (2015-2026, corte 30-jun-2026); gráfica 79 (40 %) / 121 (60 %); relación condena/pretensión 44,5 % ($3.497.635 vs $7.855.674). Excluye el laudo 4519 ($4,8 billones). La unidad (millones) y el rótulo «desfavorable» del 40 % se infieren de la gráfica, no de un texto. |
| LIQ-15 | Proceso contractual: «puede demorar entre 9 y 15 años»; 10,3 % de los expedientes de la Sección Tercera son contractuales | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/73b7d87c-5dea-46f0-a1e1-2d2caf688e55/content | PDF p. 16 («entre 9 y 15 años») y PDF p. 14 (10,3 %) | Literal: «el proceso puede demorar entre 9 y 15 años (Banco Mundial, Inventario Jurisdicción Administrativa, 2013)»; «579 ... asuntos contractuales. Es decir, el 10,3 % del total de expedientes de la sección tercera». Datos de 2013 citados de segunda mano. |
| LIQ-19 | Pago de facturas «dentro de los TREINTA (30) DÍAS CALENDARIO» | confirmado | https://certicontratos.alcaldiabogota.gov.co/VIGENCIA_2024/CTO%201332-2024%20OC%20136538/01.%20Suscripci%C3%B3n%20e%20Inicio/CCE-255-AMP-2021%20FERRETER%C3%8DA.pdf | Minuta CCE-255-AMP-2021, PDF pp. 18-20 | Literal: aprobar o rechazar la factura en 10 días calendario; «pagar las facturas dentro de los TREINTA (30) DÍAS CALENDARIO, siguientes a la fecha de aprobación de la factura»; mora superior a 30 días da derecho a intereses del art. 4 num. 8 Ley 80. |
| LIQ-19 | Suspensión del suministro solo con mora de 60 días calendario en tres o más facturas | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2025/05/39_MINUTA-AMP-ALIMENTOS-ADENDA-No.-4.pdf | Minuta AMP alimentos (adenda 4), p. 49 de 179, cláusula 6.36 | Literal: «Si se encuentra en mora en el pago por 60 días calendario de tres o más facturas el proveedor está en la facultad de suspender el suministro ... hasta tanto la Entidad Compradora no se ponga al día». |
| PLA-02 | Solo 10 de 64 procesos de interventoría cumplieron tiempos y precio pactado (15,63 %); en 18 hubo adiciones presupuestales y prórrogas | confirmado | https://www.redalyc.org/journal/104/10469617002/html/ (Chamorro Solórzano, Pérez Ruiz y Serrano Guzmán, Ciencia ergo-sum 29(1), 2022) | Resultados («En un total de 10 procesos de los 64 analizados se cumplieron los tiempos») y Conclusiones («nada más el 15.63% de los 64 contratos… en 18 se encontraron adiciones presupuestales y prórrogas») | Autoría exacta: Chamorro Solórzano, Pérez Ruiz y Serrano Guzmán (2022); el Cuadro 1 no se pudo ver (imagen), la cifra está en el texto. |
| PLA-02 | La Nación como demandante: 1.433 controversias contractuales por $10,2 billones (28,7 % del valor que reclama) | confirmado | https://www.defensajuridica.gov.co/wp-content/uploads/2026/07/Informe-de-litigiosidad-segundo-trimestre-2026.pdf | p. 32 del PDF, tabla «Nación demandante» por tipo de proceso: Controversias contractuales 1.433 (3,2 %) · $10,2 billones (28,7 %); fuente eKOGUI corte 30-jun-2026 |  |
| PLA-05 | Requisitos financieros de una interventoría de unos 62 SMMLV cumplidos simultáneamente solo por el 6 % de las empresas colombianas (51 % para una de 120 SMMLV) | confirmado | https://www.redalyc.org/journal/104/10469617002/html/ y https://www.scielo.org.mx/scielo.php?script=sci_arttext&pid=S2395-87822022000100145 | Sección 3, texto junto al Cuadro 5: «tan sólo son cumplidos de forma simultánea por el 6% de las empresas colombianas» / «cumplidos solamente por el 51%» | Primer autor es Chamorro Solórzano (Serrano Guzmán es tercera autora). El 6 % y 51 % están en el texto; el Cuadro 5 trae la distribución (ROE, ROA, IL, NE) de la que se derivan, no las dos cifras. |
| PLA-05 | Solo el 9,51 % de las licitaciones de 2017 exigió una liquidez acorde con el promedio del sector según la CCI (1,31) | confirmado | https://revistas.udem.edu.co/index.php/ingenierias/article/download/2966/3362 (Rev. Ingenierías U. de Medellín 20(39), pp. 213-229) | Tabla 4 (p. 221, PDF p. 9): intervalo 1.10-1.30 = 43 procesos = 9,51 %; frase en p. 222 (PDF p. 10): «únicamente el 9.51 % de los procesos… cumplen con exigir un índice de liquidez que cumpla con el promedio establecido por la CCI» (1.31, 80 % de constructoras) |  |
| PLA-06 | La ausencia de competidores está asociada a los requisitos habilitantes en el 32 % de los procesos; 53 % en gobiernos municipales | confirmado | https://dev.focoeconomico.org/2016/02/02/algunos-datos-sobre-la-contratacion-publica-en-colombia/ | Entrada de Marcela Meléndez, 02-feb-2016: «En esta categoría caen 32% de los procesos que al inicio tienen más de un competidor… 53% en el caso de los gobiernos municipales» | Matiz: el 32 % se mide sobre los procesos que AL INICIO tenían más de un competidor, no sobre todos los procesos. |
| PLA-07 | 20 % de las entidades no implementó el pliego tipo y 30 % introdujo ajustes (OCCI 2025, de segunda mano) | sin verificar | https://repository.unilibre.edu.co/bitstream/handle/10901/31501/1.1%20ARTICULO%20DOCUMENTOS%20TIPO%20INFRAESTRUCTURA%20TRANSPORTE.pdf?sequence=1 | Toloza y Amaya 2025, pág. 26 (no abierta) | El repositorio responde con el muro anti-bots Anubis («Making sure you're not a bot!», reto JS; en WebFetch: «acceso denegado… Anubis código 9e4edb5b6b850c41»). Nota: las cifras de primera mano de Moreno Mier (Uniandes, Tabla 3) son 35,36 / 50,29 / 14,34 %, que no coinciden con 20 %/30 %. |
| PLA-07 | Un solo oferente en obras viales bajó de 17 % a 12 % | confirmado | https://www.open-contracting.org/2020/07/16/open-for-business-colombias-data-driven-procurement-reforms-increase-competition/ | Case study «Public transport works», 16-jul-2020: «the proportion of single-bid tenders for road works using open tendering decreased from 17% to 12% in 2019» | Precisar: licitaciones abiertas de obras viales, 2019. |
| PLA-07 | Implementación completa del 35 %, con alguna modificación del 50 % y 15 % se apartó; con documento tipo 17 oferentes en promedio y 12 habilitados | sin verificar | https://www.youtube.com/watch?v=fpCpwpsLTCI | Capacitación Documentos Tipo CCE, min 99-106 (no abierto) | YouTube redirige a google.com/sorry (captcha); sin transcripción accesible desde este entorno. Las tres proporciones coinciden con la Tabla 3 de Moreno Mier (Uniandes DCEDE 2022-32): 35,36 / 50,29 / 14,34 %, verificada en DET-10. |
| PLA-11 | La entidad corrigió el 16,20 % de los APU contratados (2016-2017) y el 5,32 % en 2021, compensando con otras actividades | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/224930fa-a55b-4e1b-be7d-4ac662d50ddc/content | pp. 9-10 del PDF: «correcciones en 16.20% del total de APUs contratados… 7 de los 16 procesos» / «en 2021 se presentó solo en 5.32%… 5 de los 11 procesos»; «se compensaba la diferencia cambiando el precio de otra actividad» |  |
| PLA-13 | 60 % de la muestra no usa método para el AIU y solo el 24 % presenta AIU detallado | confirmado | https://repository.unad.edu.co/bitstream/handle/10596/23072/ofrodriguezs.pdf?sequence=1 | pp. 44-45 impresas (PDF p. 56): «El 60% de la muestra no utiliza un método para el cálculo del AIU… solo el 24% de los proyectos presentan un análisis de el AIU detallado» |  |
| PLA-13 | Manizales: A promedio 21,24 %, U 5,96 %, AIU 28,73 % | confirmado | https://repository.unad.edu.co/bitstream/handle/10596/23072/ofrodriguezs.pdf?sequence=1 | A: p. 49 impresa (PDF p. 60) «media de 21.24%»; AIU: p. 52 (PDF p. 62) «media promedio… 28.73%»; U: gráfica 5.960 % (PDF p. 61) y texto «gráfica de medias del 5,96%» (PDF p. 169) | Ubicación: pp. 49-52 impresas, no 51-52; la utilidad del 5,96 % se lee en la gráfica de medias y en el anexo final. |
| PLA-13 | Factor multiplicador de 2,55 a 2,35 según valor del contrato en SMMLV, fijado en 2004 | confirmado | https://www.idu.gov.co/Archivos_Portal/Micrositios/Normograma/1/Dise%C3%B1o_de_Proyectos/04_Instructivos_Guias_cartillas/GUDP017_ELABORACION_PRESUPUESTO_CONTRATOS_OBRA_CONSULTORIA_INTERVENTORIA_V1.0.pdf | p. 7 del PDF: 2.55 (0-1500 SMLV), 2.50 (1501-3000), 2.45 (3001-6000), 2.40 (6001-10000), 2.35 (>10000); «establecido en una mesa de trabajo realizada en el año 2004» (IDU, CCI, empresas, aseguradoras, Escuela Colombiana de Ingeniería) | Es una guía interna del IDU (2013), no una norma; aplica a sus contratos de consultoría/interventoría. |
| PLA-15 | En regalías, cerca de $4,2 billones (12 % de $33,9 billones) por contratación directa hasta jun-2019 | confirmado | https://www.contraloria.gov.co/documents/20125/986347/La+contrataci%C3%B3n+directa+como+mecanismo+excepcional+de+contrataci%C3%B3n,+un+an%C3%A1lisis+antes+y+despu%C3%A9s+del+Decreto+092+de+2017.pdf/083a2cbe-3268-b0a3-3c38-3c49e6102e66?t=1665417140297&download=true | p. 8 del PDF: «de $33.9 billones del total contratado a 15 de junio de 2019… contratación directa por cerca de $4.2 billones, es decir cerca del 12%» |  |
| PLA-18 | 677 procesos terminados anormalmente en mínima cuantía, 35,62 % del total nacional en el sector G (2010-2015) | corregido | https://www.redalyc.org/journal/6139/613964505005/html/ (Ríos Parra, Pérez Ruiz, Diosa y Serrano Guzmán, Lámpsakos 18, 2017) | Sección 2 «Características de la contratación por mínima cuantía», no §4.2 ni Tabla 5 | El texto dice: «el 35.62% (677 procesos) del total de procesos terminados después de convocados (1901 procesos)». El denominador son los 1.901 procesos terminados tras la convocatoria en todas las modalidades; la Tabla 5 lista 12 procesos de mínima cuantía y §4.2 trata capacidad financiera. El acotamiento «total nacional en el sector G» no aparece con esa cifra. |
| PLA-22 | Retención del 5 %, 7 % o 10 % del valor del contrato hasta la liquidación | sin verificar | https://www.youtube.com/watch?v=GhVGg0-nmzs | Escuela Judicial, min 36-37 (no abierto) | YouTube bloqueado (redirección a google.com/sorry). Además no es una regla legal: ninguna norma del Estatuto (Ley 80, 1150, 1474, Decreto 1082) fija esos porcentajes; la retención en garantía es una cláusula contractual que cada entidad pacta. Debe mostrarse como práctica, nunca como norma. |
| PRE-02 | La renovación o actualización del RUP toma diez días hábiles en adquirir firmeza | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_1150_2007.html (art. 6 num. 6.3, modificado por Decreto 19/2012 art. 221) | Ley 1150/2007 art. 6.3: «la Cámara publicará el acto de inscripción, contra el cual cualquier persona podrá interponer recurso de reposición… durante los diez (10) días hábiles siguientes a la publicación» | El video no se pudo abrir (YouTube bloqueado); la cifra se confirma con la ley: la firmeza llega al vencer los 10 días hábiles desde la publicación del acto (inscripción, renovación o actualización) sin impugnación. |
| PRE-02 | Tiempo para completar el registro: Colombia 15 días; Corea 8 horas laborales; México 2 días; Chile inmediato | sin verificar | https://doi.org/10.1787/36348f43-en (y https://www.oecd.org/en/publications/enhancing-the-public-procurement-suppliers-registry-in-colombia_36348f43-en.html) | OCDE 2022, tabla 2.3, pág. 18 del PDF | No abrí el texto: doi.org devolvió una página de reto Cloudflare («Just a moment...»), oecd.org devolvió «HTTP 403 Forbidden» (dos rutas) y search.oecd.org «getaddrinfo ENOTFOUND». Es una observación con fecha (19-oct-2026), no una propiedad de la fuente. |
| PRE-03 | Microempresas encuestadas: 15 % de éxito frente a 55 % de descalificación (autodeclarado) | confirmado | https://alejandria.poligran.edu.co/server/api/core/bitstreams/1be8581c-8a67-4f16-b472-358298e625f6/content | Guzmán y Henao 2026, pág. PDF 85 (texto literal: «Las microempresas alcanzaron un 15 % de éxito frente a un 55 % de descalificación») | Fuente académica (encuesta), no norma; el dato es tal cual lo dice la tesis. |
| PRE-03 | Deficiente lectura e interpretación de pliegos presente en el 48 % de los casos analizados | confirmado | https://alejandria.poligran.edu.co/server/api/core/bitstreams/1be8581c-8a67-4f16-b472-358298e625f6/content | Guzmán y Henao 2026, pág. PDF 57 («1) deficiente lectura e interpretación de pliegos (presente en el 48% de los casos analizados); 2) desactualización normativa (42%)») |  |
| PRE-03 | Cinco proyectos sin adjudicar por RUP y tres por falta de garantía de seriedad; un integrante con el 45 % sin capacidad jurídica para el consorcio | confirmado | https://dialnet.unirioja.es/descarga/articulo/7384264.pdf | Via Iuris, Serrano Guzmán et al., sección de resultados (texto: «Cinco proyectos no podían ser adjudicados…», «falta de garantía de seriedad en la oferta», «una de ellas, con el 45 % de la representación, no contaba con la capacidad jurídica») | Vi literalmente los «cinco proyectos», la causal de garantía de seriedad y el 45 %; el conteo «tres» por garantía no lo localicé como cifra literal en el texto extraído (a dos columnas). Páginas 91-92 no recomprobadas por la numeración de la revista. |
| PRE-03 | Certificado bancario con antigüedad máxima de 30 días (en el pliego mostrado, no norma general) | sin verificar | https://www.youtube.com/watch?v=mf8_0r1Z9As | Video «Secop 2 desde cero», min 17:54-18:00 | Video: no hay texto oficial que abrir. YouTube redirige a https://www.google.com/sorry/index (302, verificación antibots) y no entrega transcripción. Dejado sin verificar. |
| PRE-05 | Oferta perdida por ofrecer el 97,7 % cuando el piso era el 98 % del presupuesto | sin verificar | https://www.youtube.com/watch?v=yQ-HxG7snPE | Video Asesoría en Licitaciones (yQ-HxG7snPE), min 42:06-43:20 | Video: YouTube respondió con redirección 302 a google.com/sorry (verificación antibots); sin transcripción accesible. Dejado sin verificar. |
| PRE-08 | No pueden expedirse adendas dentro de los tres (3) días anteriores al cierre | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_0080_1993.html | Ley 80 de 1993, art. 30 num. 5, inciso 2 (modificado por el art. 89 de la Ley 1474 de 2011): «En todo caso no podrán expedirse adendas dentro de los tres (3) días anteriores en que se tiene previsto el cierre del proceso de selección, ni siquiera para extender el término del mismo. La publicación de estas adendas sólo se podrá realizar en días hábiles y horarios laborales.» | Vigente hoy según la nota de vigencia del Senado (sin modificación posterior al art. 89 Ley 1474). Nota: es «3 días anteriores al cierre», en días hábiles y horario laboral. |
| PRE-11 | Un integrante aporta mínimo el 50 % de la experiencia; los demás al menos el 5 %; quien no aporta no puede superar el 10 % de participación | confirmado | https://relatoria.colombiacompra.gov.co/wp-content/uploads/2026/02/C-034.docx | Concepto C-034 de 2026, Bogotá D.C., 17 de febrero de 2026; transcribe el literal D del numeral 3.5.3 del documento base de los Documentos Tipo de licitación de obra de infraestructura de transporte v4: «i) uno de los integrantes debe aportar como mínimo el cincuenta por ciento (50%) de la experiencia solicitada; ii) los demás integrantes deben acreditar al menos el cinco por ciento (5%)…; y iii) … solo uno de los integrantes … podrá no acreditar experiencia. En este último caso, el porcentaje de participación del integrante que no aporta experiencia … no podrá superar el diez por ciento (10%)» | Regla de los Documentos Tipo de infraestructura de transporte (licitación), no de la ley general; aplica a procesos regidos por esos pliegos tipo. |
| PRE-14 | Contrato celebrado sin haber adquirido los predios y con plazo de 60 días; se ordena restituir el anticipo actualizado | confirmado | https://relatoria.colombiacompra.gov.co/wp-content/uploads/2024/04/1656635909339-1625608872344-68001-23-15-000-1998-01743-01_27315.pdf | CE Rad. 27315: síntesis p. 1 («se celebró sin haber adquirido los predios… plazo… de 60 días»); orden de restitución p. 14 («se ordenará que este la restituya debidamente actualizada»); hechos pp. 3 y 10 |  |
| PRE-15 | INVIAS tuvo que corregir el 16,20 % de los APU contratados, en 7 de 16 procesos adjudicados | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/224930fa-a55b-4e1b-be7d-4ac662d50ddc/content | Nieto Taborda 2021, p. 9 («correcciones en 16.20% del total de APUs contratados, y que estos corresponden a 7 de los 16 procesos adjudicados», procesos 2016-2017) |  |
| PRE-15 | Presupuesto oficial de un contrato de 2007 elaborado con la resolución de precios de la Gobernación de Boyacá de 2006 | confirmado | https://www.consejodeestado.gov.co/documentos/boletines/PDF/15001-23-33-000-2013-00526-01(55855).pdf | CE 55855, p. 10 (contrato 312 de 2007; «presupuesto oficial había sido elaborado con precios de la Resolución de precios de la Gobernación de Boyacá del año 2006») |  |
| PRE-16 | Una administración del 5 % se calificó de irrisoria y podría tratarse como precio artificialmente bajo | sin verificar | https://www.youtube.com/watch?v=6gzx6KHL4zg | Video CCE «Capacitación Documentos Tipo», min 137 | Video: YouTube responde con redirección 302 a google.com/sorry (verificación antibots); sin transcripción accesible. Dejado sin verificar. |
| PRE-16 | En 2021 los descuentos por ítem variaron sobre todo entre 0 % y 20 %, con ítems de hasta 60 % en los menos representativos; el número promedio de proponentes bajó de 86 a 50 | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/224930fa-a55b-4e1b-be7d-4ac662d50ddc/content | Nieto Taborda 2021: descuentos p. 15 («variando entre el 0% y el 20% principalmente, y precios con descuento hasta del 60%»); proponentes p. 13 («disminuyo de 86 en los año 2016 y 2017 a 50 en el año 2021») | La cifra 86→50 está en la p. 13 del PDF, no en pp. 15-16. |
| PRE-16 | Tarifa mínima de vigilancia: 8,8 SMMLV más un 10 % (según modalidad) | confirmado | https://repository.umng.edu.co/server/api/core/bitstreams/d1334f65-5c02-4220-a1b5-feeb49ed5c78/content | Calceto 2021, p. 4 («Empresas armadas con medio humano: … 8,8 salarios mínimos … más un 10%»; sin armas +8 %; con canino +11 %) | Fuente académica que transcribe la tarifa; la norma vigente que la fija no se verificó en esta pasada. |
| PRE-17 | Descuentos de ley (estampillas y otros) que suman hasta el 30 % en Cali | sin verificar | https://www.youtube.com/watch?v=yQ-HxG7snPE | Video Asesoría en Licitaciones (yQ-HxG7snPE), min 61-62 | Video: redirección 302 a google.com/sorry; sin transcripción. Dejado sin verificar. |
| PRE-17 | En el ejemplo de acuerdo marco el techo se fijó suponiendo un máximo de 20 % en estampillas | sin verificar | https://www.youtube.com/watch?v=rZ84bBUkti8 | Video Capacítate/CCE sobre acuerdos marco, min 69-71 | Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar. |
| PRE-18 | Capital de trabajo para plazos menores de 12 meses: 25 % de (presupuesto − anticipo) | corregido | https://colombiacompra.gov.co/wp-content/uploads/2025/11/Guia-para-la-correcta-implementacion-de-los-DT-de-Transporte-Comentarios.pdf | Guía CCE-EICP-MA-04 V2 (07/11/2024, portada 2025), §6.2, pp. 51-52 | La guía trae TRES fórmulas para plazo < 12 meses, por modalidad: Licitación pública y Selección Abreviada de Menor Cuantía (obra): «CTd = (POE − Anticipo o Pago anticipado) x 33%» (p. 51); Concurso de méritos (consultoría/interventoría): «x 25%» (p. 52); Mínima cuantía: «x 15%» (p. 52). Para obra civil el porcentaje es 33 %, no 25 %; el 25 % solo aplica a concurso de méritos. |
| PRE-18 | Una interventoría integral cuesta el 10 % del contrato principal (tarifa gremial) | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/460b8db6-07a1-4b94-82ce-dfa2f91d06cd/content | Romero 2019, p. 14 («Una interventoría integral cuesta el 10% del contrato principal», citando manuales de tarifas del CPNIEMPA 2015 y del CPNAA 2017) | Es la afirmación de una tesis sobre manuales de honorarios profesionales; no es norma. |
| PRE-18 | Rango de 2,5 % a 15 % atribuido a la Sociedad Colombiana de Arquitectos; un profesional de 3 millones cuesta unos 7,3 millones al mes con cargas y utilidad | sin verificar | https://www.youtube.com/watch?v=_UpPtJWhiJs | Video Udearroba «Contratación de la interventoría», min 10 y min 13 | Video: YouTube bloquea la lectura automatizada (302 a google.com/sorry). Dejado sin verificar. |
| PRE-21 | Pliegos con 1 contrato en los últimos 2 años de valor mayor o igual al 400 % del presupuesto | confirmado | https://dialnet.unirioja.es/descarga/articulo/7795808.pdf | Serrano Guzmán et al. 2017, p. 16 del PDF («1 contrato en los últimos 2 años con valor mayor o igual a 400 % presupuesto») |  |
| PRE-21 | El 68 % de los pliegos revisados exigía maquinaria propia o promesa de alquiler perfeccionada | confirmado | https://dialnet.unirioja.es/descarga/articulo/7795808.pdf | Serrano et al. 2017 (Revista UCN), p. 17 del PDF (impresa 18): «el 68% de los pliegos de condiciones revisados la entidad contratante requería … la propiedad o … perfeccionada una promesa de contratación de alquiler de un stock de maquinaria mínima» |  |
| PRE-21 | AMP de SOAT: mínimo cinco contratos en el RUP por 779 SMLV y endeudamiento máximo del 86 % | confirmado | https://dialnet.unirioja.es/descarga/articulo/9675387.pdf | Fernández y Tobón 2019, p. 12 («mínimo cinco contratos inscritos en el RUP del código 84131600 por un valor de 779 SMLV … índice de endeudamiento de máximo 86%», AMP LP-AMP-058-2015) |  |
| PRE-21 | Inscribir el RUP costaba $522.000 (66,85 % de un SMMLV) en 2018 | confirmado | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/fa0f149e-4b48-4ed4-b05a-a9d9afe04cf6/content | Bedoya y Unigarro, p. 40 del PDF («monto del 66, 85 % de un SMMLV … $ 522.000») |  |
| PRE-21 | Chile: garantía de seriedad solo en compras de más de 5.000 UTM y sin exceder el 3 % | confirmado | https://www.chilecompra.cl/2024/12/conoce-los-10-cambios-clave-a-la-ley-de-compras-publicas-que-impactan-a-los-proveedores-del-estado/ | ChileCompra, nota del 9-dic-2024: «garantías de seriedad de la oferta sólo en el caso de compras por sobre las 5.000 UTM, la cual no excederá de un 3% del monto de la licitación» |  |
| PRE-22 | Desempate Mipyme en plural: participación de al menos 25 % y aporte mínimo del 25 % de la experiencia | confirmado | https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/pdf/decreto_1860_2021.pdf | Decreto 1860 de 2021, art. 2.2.1.2.4.2.17 num. 10 (10.1 y 10.2), p. 10 del PDF de Cancillería («participación de por lo menos el veinticinco por ciento (25%) en la estructura plural y aportar como mínimo el veinticinco por ciento (25%) de la experiencia») | Coincide con el art. 35 num. 10 de la Ley 2069 de 2020 (verificado en el Senado). La página en ese PDF es la 10, no la 14. |
| PRE-22 | Puntaje adicional máximo de 0,25 puntos del total; integrante con 10 % o más en el consorcio | confirmado | https://operaciones.colombiacompra.gov.co/sites/cce_public/files/cce_documents/guia_para_promover_la_participacion_de_las_mipymes_en_los_procesos_de_compra_publica_cce-gad-gi-26_1.pdf | Guía CCE-GAD-GI-26, p. 16 («no podrá superar los 0.25 puntos del valor total de los puntos establecidos en el Pliego»; plural: «participación igual o superior al 10% dentro del Consorcio o Unión Temporal») | La guía dice «0.25 puntos del valor total de los puntos»; el Decreto 1860 (p. 7) y la Ley 2069 art. 32 par. 3 lo expresan como «0.25% del valor total de los puntos / del puntaje máximo». Al mostrar la cifra, conviene usar la forma del decreto y la ley (porcentaje), no «puntos». |
| PRE-22 | Puntaje hasta el 0,25 % del puntaje máximo | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_2069_2020.html | Ley 2069 de 2020, art. 32 par. 3 (artículo modificado por el art. 21 de la Ley 2479 de 2025): «El puntaje adicional … será hasta el 0.25% del puntaje máximo a asignar» |  |
| PRE-22 | Certificaciones juradas con fecha de máximo 30 días calendario; participación igual o superior al 10 % | confirmado | https://www.cancilleria.gov.co/sites/default/files/Normograma/docs/pdf/decreto_1860_2021.pdf | Decreto 1860 de 2021: art. 2.2.1.2.4.2.14 par. («bajo la gravedad de juramento con una fecha de máximo treinta (30) días calendario anteriores a la prevista para el cierre», p. 7) y art. 2.2.1.2.4.2.15 par. 1 («participación igual o superior al diez por ciento (10%) en el consorcio o la unión temporal», p. 8) |  |
| PRE-22 | Las mujeres poseen el 16 % del capital de las empresas; en más del 75 % su participación es inferior al 10 % | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2025/05/2024-Guia-para-incentivar-la-contratacion-de-mujeres.pdf | Guía CCE y ONU Mujeres 2024, p. 8 («las mujeres poseen solo el 16% del capital total de las empresas … en más del 75% de las empresas, la participación de las mujeres en el capital social es inferior al 10%») |  |
| PRE-22 | Indicadores Mipyme: liquidez ≥ 1,11, endeudamiento ≤ 75 %, cobertura ≥ 0 | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2024/09/04._estudio_de_criterios_diferenciales_mipyme_y_emprendimiento_y_empresas_de_mujeres_-_minima_cuantia_version_2.pdf | Estudio CCE criterios diferenciales mínima cuantía v2, §3.4.1.2 (sector obra pública de infraestructura de transporte, Mipyme), p. 29 del PDF (impresa 28): liquidez «mayor o igual a uno coma once (1,11)», endeudamiento «setenta y cinco por ciento (75%)», cobertura de intereses «mayor o igual a cero» | Página 29 del PDF, no 33. Son los valores que el estudio propone para Mipyme en infraestructura de transporte; para grandes empresas fija endeudamiento 70 % y cobertura ≥ 1. |
| PRE-23 | Criterio Mipyme en 93 licitaciones (97,9 %); normativa ambiental en 42 pliegos (44,2 %); criterio CA.1 en el 61,3 % de los pliegos amazónicos y el 42,8 % de los andinos | confirmado | https://riunet.upv.es/server/api/core/bitstreams/2adba89e-c9a3-4fe2-b7d2-d057ace0d517/content | Cruz Castellanos: Tabla 9 «Presencia de criterios ambientales por región», p. 56 del PDF (Amazónica CA.1 61,3 %; Andina 42,8 %); S2.4 Mipymes 93 (97,9 %); 42 (44,2 %) en el ítem A1.1 | El 44,2 % (42 pliegos) aparece rotulado A1.1 «Protección de fuentes hídricas» en la tabla y como «normativa ambiental» en el texto comparativo; el conteo coincide. |
| PRE-24 | Reducción del 10 % del puntaje obtenido, extendida automáticamente a los demás integrantes del plural | confirmado | https://relatoria.colombiacompra.gov.co/wp-content/uploads/2026/09/11001032600020250004200.pdf | CE, Exp. 11001-03-26-000-2025-00042-00 (72.599), Bogotá 15 de julio de 2026, p. 20 («reducción del 10% del puntaje obtenido- se hace extensiva de manera automática a los demás integrantes») |  |
| PRE-25 | R2 de 0,403 con datos básicos y 0,510 con todos los datos; el número de oferentes pesa más del 30 % | confirmado | https://www.qip-journal.eu/index.php/QIP/article/download/1819/1364 | Delina y Macik 2023: Tabla 5, p. 10 del PDF (C: 0.403; C+CPV+CA+CO+COCA+NCOMB: 0.510); texto «this variable [applicants] has more than 30% importance» |  |
| PRE-25 | Software de preparación: coeficiente 0,160, no significativo (0,068); el modelo explica el 47,4 % de la tasa de éxito | confirmado | https://ijssrr.com/journal/article/download/2706/1969 | Temu et al. 2025, Table 7 (p. 12 del PDF): Bid Preparation Software, Pearson 0.160, Sig. 0.068; p. 13: «47.4% of the variance in the tender success rate» | El 0,160 es un coeficiente de correlación de Pearson (Tabla 7), no un coeficiente de regresión. |
| PRE-25 | Imprevistos de entre el 8 y el 14 % en obras de transporte de Florida | confirmado | https://journals.vilniustech.lt/index.php/JCEM/article/download/24913/13146 | Nindartin et al. 2025, p. 16 del PDF (conclusiones): «contingency range from 8‒14%»; datos FDOT 2013-2017 |  |
| PRE-25 | De 81 artículos de Scopus se filtraron 19 sobre IA en contratos de construcción | confirmado | http://www.iaarc.org/publications/fulltext/CSCE_CRC_2025_FinalPaper-PDF_162.pdf | Soy et al. 2025, Resumen («Filtering through 81 papers from the Scopus to 19») |  |
| TRA-01 | En 2014 el régimen especial representaba el 22,0 % de los contratos subnacionales | sin verificar | https://www.repository.fedesarrollo.org.co/bitstream/handle/11445/3171/TE_No_166_2016.pdf?sequence=2&isAllowed=y | Cuadro 2 | El repositorio de Fedesarrollo devuelve una página anti-bot («Making sure you're not a bot!») en lugar del PDF. |
| TRA-03 | El grupo de factores de planeación explica el 58 % de la varianza en tiempo (p < 0,01) | confirmado | https://dialnet.unirioja.es/descarga/articulo/6554528.pdf | Lozano et al., Ingeniería y Ciencia 14(27), 2018, Tabla 4, pág. impresa 126 (PDF p. 10) | Tabla 4: Planeación p<0.01, 58 %; Partes involucradas 0.02, 9 %; Agentes externos 0.18, 4 %. La tabla está en la p. 126, no en la 124. |
| TRA-03 | Cambios en los diseños: 9 % de la varianza (p < 0,01) | confirmado | https://dialnet.unirioja.es/descarga/articulo/6554528.pdf | Tabla 5, pág. impresa 129 (PDF p. 13) | Tabla 5: Cambios en diseños <0.01, 9 %; Planeación de cronograma inadecuada <0.01, 21 %; Falta de maquinaria <0.01, 14 %. |
| TRA-06 | 30 días para corregir y reingresar desde la primera carta de devolución; si no, cesan los efectos del RUP | corregido | https://dialnet.unirioja.es/descarga/articulo/7021703.pdf | Advocatus 15(30), 2018, PDF p. 5 (pág. impresa 31) | El artículo dice: 30 días desde la primera carta de devolución para corregir y reingresar; si no lo hace, «si es inscripción por primera vez ... se le devolverá el dinero al proponente, si es renovación o actualización, habrá entonces que cesar los efectos de su Registro Único de Proponentes». La cesación de efectos aplica solo a renovación/actualización; en inscripción nueva se devuelve el dinero. Es doctrina, no la norma. |
| TRA-08 | Reducción del 2 % del total de puntos por una o más multas o cláusulas penales en el último año, sin importar la cuantía | confirmado | http://www.secretariasenado.gov.co/senado/basedoc/ley_2195_2022_pr001.html | Ley 2195 de 2022, art. 58 | Literal: «reducir ... el dos por ciento (2%) del total de los puntos ... a los proponentes que se les haya impuesto una o más multas o cláusulas penales durante el último año, contado a partir de la fecha prevista para la presentación de las ofertas, sin importar la cuantía». No aplica en contratación directa, mínima cuantía ni procesos solo por precio; par. 1: no aplica si los actos están demandados ante lo contencioso; afecta a consorcios/UT por cualquier integrante. |
| TRA-09 | Aumento del 143,43 % de la contratación directa en enero de 2018 frente al año anterior | confirmado | https://revistas.registraduria.gov.co/index.php/democracia/article/download/106/59 | Orjuela Ortiz, Democracia Actual 8(2), 2023, págs. impresas 50-51 (PDF pp. 21-22) | Literal: «el número de contratos suscritos en el mes de enero frente al mismo periodo del año anterior, demostrando un aumento del 143.43 %» (dato de la Auditoría General de la República, 2018). Es número de contratos de contratación directa, no valor. |
| TRA-09 | Ley de garantías de las presidenciales 2026: del 31 de enero al 21 de junio de 2026 | confirmado | https://transparenciacolombia.org.co/wp-content/uploads/2026/07/ANALISIS-CONTRATACION-POST-LEY-DE-GARANTIAS_TPC.pdf | pág. 2 (PDF p. 3), Introducción | Literal: «inició el 31 de enero y se extendió hasta el 21 de junio de 2026 ... primera vuelta (31 de mayo) y la segunda vuelta (21 de junio)». |
| TRA-09 | 15 contratos del Gobierno Nacional (8 de INVÍAS, Vías para la Paz) concentraron el 71 % del valor contratado tras la restricción | confirmado | https://transparenciacolombia.org.co/wp-content/uploads/2026/07/ANALISIS-CONTRATACION-POST-LEY-DE-GARANTIAS_TPC.pdf | PDF p. 9 | Precisión: «Estos 15 contratos concentran el 71 % del valor contratado por el Gobierno Nacional» (≈2,5 billones), no del total nacional; «Los 8 contratos de mayor valor corresponden al programa Vías para la Paz, suscritos por ... INVÍAS»; INVÍAS concentra 11 de los 15. |
| TRA-10 | Contratación: 31,94 % de los hechos (ámbito más afectado); alcaldías: 24,48 % | confirmado | https://transparenciacolombia.org.co/radiografia-corrupcion-2016-2022/ | Página de resultados, secciones «Ámbito más afectado» y «Entidades más perjudicadas» | Confirmado: Contratación 31,94 % (ámbito más afectado); Alcaldías 24,48 % (2.º lugar en entidades más perjudicadas). La página no explicita la base de los porcentajes. |
| TRA-12 | «Modificación general» 57,26 %, «Adición en el valor» 4,47 %, «Extensión» 0,01 % de las modificaciones | sin verificar | https://repositorio.uniandes.edu.co/handle/1992/73160 | PDF p. 17, §3.3, Tabla 2 | La página del handle devuelve «Bot Detection» (curl y WebFetch), por lo que no se obtuvo el enlace al bitstream ni el PDF. |
| TRA-13 | 100 % de procesos competitivos sin la oferta ganadora publicada en los cinco años medidos | sin verificar | https://revistas.unac.edu.co/index.php/unaciencia/es/article/view/564 (DOI 10.35997/unaciencia.v13i25.564) | Tabla 7, p. 115-116 | El servidor de la revista respondió 503 (tres rutas probadas: /es/, /en/, /ojs/) y error SSL con curl. Solo se confirmó por metadatos externos que el artículo existe: García Jiménez et al., «Efectividad del SECOP I y II en municipios de sexta categoría de Antioquia», Unaciencia 13(25), 2021, pp. 107-119. |
| TRA-13 | Entre 84,35 % y 91,75 % de procesos competitivos sin documentos del proceso publicados | sin verificar | https://revistas.unac.edu.co/index.php/unaciencia/es/article/view/564 | Tabla 7, p. 115-116 | Misma barrera: servidor 503 / error SSL. |
| TRA-13 | 2022: 47,88 % de los contratos en SECOP I, 50,94 % en SECOP II, 1,17 % en TVEC | confirmado | https://transparenciacolombia.org.co/wp-content/uploads/2023/07/Recomendaciones-compromiso-post-acceso-contratacion-OCDE-2022.pdf | PDF p. 12, tabla «% del Número de contratos» (fuente: Colombia Compra Eficiente, 2022) | Fila 2022: 47.88 % / 50.94 % / 1.17 % en número de contratos; en valor: 43.62 % / 53.68 % / 2.70 %. Datos con corte agosto 2022. |
| TRA-14 | Exactitud entre 46 % y 59 % y AUC entre 0,56 y 0,72 en modelos de riesgo de corrupción | confirmado | https://dialnet.unirioja.es/servlet/articulo?codigo=10442801 | Resumen | Literal: «niveles de exactitud entre el 46% y el 59%» y área bajo la curva ROC de 0.56 a 0.72 (árboles de decisión, random forest y gradient boosting; hospitales 2014-2019). |
| TRA-17 | Aumento de 333 % en el número de oferentes en licitaciones de obra pública en un año; Mipymes de 16 % a 49 % de procesos adjudicados | sin verificar | https://www.youtube.com/watch?v=e9niU2esqrY | min 2-3 | Fuente audiovisual: no se puede abrir ni transcribir desde esta sesión. |
| TRA-17 | La contratación directa representó el 63 % de los registros entre 2014 y 2019 | sin verificar | https://repository.fedesarrollo.org.co/bitstream/handle/11445/4213/Co_Eco_Diciembre_2021_Kahn_y_Saavedra.pdf?sequence=1&isAllowed=y | pág. 135 | El repositorio de Fedesarrollo devuelve una página anti-bot en lugar del PDF. |
| TRA-17 | Mipymes: 27 % del valor ($516.285,3 millones) y 48 % de los contratos (1.154) | confirmado | https://www.colombiacompra.gov.co/documentos-tipo/descarga/29620 | Anexo memoria justificativa (15-12-2025), PDF p. 113, Gráfica 39 | Literal: «solo el 27% del total, equivalente a $516.285,3 millones, corresponde a contratos suscritos con MiPymes ... las MiPymes representan el 48% del total, con 1.154 contratos». |
| TRA-17 | Transporte: el 80 % corresponde a empresas no Mipymes | confirmado | https://www.colombiacompra.gov.co/documentos-tipo/descarga/29620 | PDF p. 115 | Literal: «El sector de Transporte es el que tiene el mayor valor contratado, con un total de $1.188.409,2 millones, de los cuales el 80% corresponde a empresas no MiPymes». |
| TRA-17 | Mujeres: 43,5 % de la contratación por prestación de servicios; 274.481 contratos (19,9 %) con género no definido | confirmado | https://www.colombiacompra.gov.co/wp-content/uploads/2025/05/2024-Guia-para-incentivar-la-contratacion-de-mujeres.pdf | PDF p. 10 | Literal: «las mujeres representaron el 43.5% de la contratación por prestación de servicios al suscribir un total de 598,671 contratos» (1-ene-2023 a 3-oct-2024); «274,481 contratos que equivalen al 19.9% corresponden a ... género no definido». |
| TRA-18 | El aliado regional debe atender como mínimo el 10 % de las órdenes de compra | confirmado | https://operaciones.colombiacompra.gov.co/sites/cce_public/files/cce_tienda_virtual/01._cce-255-amp-2021_contrato.pdf | Minuta CCE-255-AMP-2021, PDF p. 14, cláusula 7.13 | Literal: «siendo su participación de mínimo el diez por ciento (10%) de las órdenes de compra colocadas al proveedor al año en la ejecución del acuerdo marco». |
| TRA-23 | Caso Convel: radicado en 1999, sentencia de unificación del 27-jul-2023 | confirmado | https://franciscofajardoabogados.com/wp-content/uploads/2023/08/4.-Sentencia-39121.pdf | PDF p. 1 (encabezado) y p. 2 (antecedentes) | Rad. 05001-23-31-000-1999-02151-01 (39121), CE Sección Tercera Sala Plena, C.P. Guillermo Sánchez Luque, 27-jul-2023; demanda de Convel SA formulada el 23-jun-1999. Copia alojada en sitio privado, no en la relatoría del CE. |
| TRA-25 | Inhabilidad de hasta 10 años cuando el daño supera 100 SMMLV, según los ponentes (no verificado en la ley) | corregido | http://www.secretariasenado.gov.co/senado/basedoc/ley_1952_2019_pr001.html | Ley 1952 de 2019 (Código General Disciplinario), art. 42, numeral 4 y parágrafo 1 | La ley sí lo sustenta, con condiciones: el responsable fiscal es inhábil para contratar con el Estado 5 años desde la ejecutoria del fallo; si pasados esos 5 años no ha pagado ni ha sido excluido del boletín, «continuará siendo inhábil por cinco años si la cuantía ... fuere superior a 100 salarios mínimos legales mensuales vigentes» (2 años si >50 y ≤100; 1 año si >10 y ≤50; 3 meses si ≤10). Total hasta 10 años, pero cesa cuando la Contraloría certifica el pago. No está en Ley 2195/2022. |

## 5. Propuestas para Detekta

Las 43 propuestas salieron de 281 ideas en bruto. Cada una se contrastó con el código del 2-oct-2026. Las 22 vivas se volvieron a contrastar el 19-oct-2026 con el código de ese día, porque `main` cambió desde entonces. Solo se consideran las que no están hechas ni pendientes; las demás se marcan.

| ID | Propuesta | Veredicto 2-oct | Veredicto 19-oct | ¿Decide plata? | Esfuerzo (estimado) |
|---|---|---|---|---|---|
| P-01 | Semáforo de madurez del proyecto en el dictamen | mejorar_existente | mejorar_existente | sí | 1 a 1,5 sesiones, con un corpus de pliegos reales para medir falsos positivos (por ejemplo, la frase «predio» en una obra de mantenimiento) y prueba por mutación, porque mueve el veredicto del dictamen. |
| P-02 | Rótulo de régimen jurídico y ficha del manual de la entidad | ya_existe | — | no | El rótulo va dentro de N03, que ya está planeada como «Inmediato (horas)»: menos de media sesión adicional. La ficha de manuales: no se recomienda. |
| P-03 | Radar de contratación derivada y régimen especial con ofertas | descartar | — | no | 1 a 2 sesiones para el radar. Saldría en muy pocas entidades: unas 40 en 21 meses en todo el país, antes de filtrar por zona. |
| P-04 | Medidor de obra que no sale a concurso | construir | construir | no | 1 sesión, con la suite y la vista en navegador real del modal. |
| P-05 | Revisor de actas de prórroga, suspensión y otrosí antes de firmar | descartar | — | no | 2 a 3 (detector + registro + pantalla + prueba por mutación); más 1 de investigación normativa para citar la regla vigente. |
| P-06 | Mayor permanencia: costo antes de firmar y bitácora de costos reales | descartar | — | sí | Costo por día antes de firmar: 1 a 2. Bitácora + reparto por ruta crítica (lectura de MS Project): 5 o más. |
| P-07 | Libro de reclamos y salvedades para la liquidación | descartar | — | sí | 6 o más (registro, adjuntos, comparación de balance, salvedades por concepto, pantalla, pruebas). |
| P-08 | Reloj de liquidación y caducidad por contrato | descartar | — | sí | 2 a 3, más 1 para leer y citar el texto vigente de las dos normas. |
| P-09 | Control de cantidades, actas e ítems no previstos | descartar | — | sí | 8 a 12 sesiones (esquema, pantalla, carga de fotos o actas con almacenamiento de archivos, las dos lecturas del tope y la suite). Es una estimación, no una medida. |
| P-10 | Cobro completo: cuenta sin devoluciones, reloj de pago e intereses de mora | descartar | — | sí | 6 a 10 sesiones (calculadora con norma citada, lista de soportes, plantillas y pruebas por mutación de la tasa). Es una estimación. |
| P-11 | Ficha de pago de la entidad y caja necesaria | descartar | — | sí | 3 sesiones según R-06 (docs/INVESTIGACION_MERCADO_LICITADOR.md § 5.2), más una nueva medición previa de uymx-8p3j y u99c-7mfm. Lo mejorable sin reabrir el tema (la forma de pago y el anticipo leídos del pliego hacia los escenarios de caja) cuesta 1 a 2 sesiones. |
| P-12 | Kit de defensa ante multa o incumplimiento (art. 86) | descartar | — | sí | 4 a 6 sesiones (detectores con cita literal, extracción de la fecha de audiencia, plantilla, pruebas). Es una estimación. |
| P-13 | Garantías y arranque de obra sin hechos cumplidos | descartar | — | no | 3-4 (registro manual de pólizas, cruce con las modificaciones, pantalla y suite), más la prueba por mutación de las fechas |
| P-14 | Así ejecuta esta entidad: adiciones, prórrogas y plazo realista | mejorar_existente | mejorar_existente | sí | 1-2 (adición en valor + mediana de plazo real en contratos parecidos, con prueba por mutación); inconclusas: 0, porque no hay datos |
| P-15 | Concentración y ganador habitual por entidad | ya_existe | — | no | 0,5 para la parte de los 3 primeros; la reconstrucción por modalidad (N02+N01) son varias sesiones y ya está planeada con [VB] |
| P-16 | Alerta de posible colusión en los procesos donde compite | descartar | — | no | 2-3 para lo que tiene datos (ofertas casi idénticas, rotación), con revisión adversaria; RUES: imposible con datos abiertos |
| P-17 | Datos honestos: NIT, consorcios, cobertura y lectura verificada | mejorar_existente | mejorar_existente | no | 1 sesión para el hermano de socio.js; 1 más para la línea SECOP I. El resto ya está construido. |
| P-18 | Pliego tipo: versión aplicable y desviaciones marcadas | descartar | — | sí | 6 a 10 sesiones: plantillas por sector, modalidad y versión, detector de versión, diff con página y textos de frecuencia. A eso se suma mantenerlo con cada resolución de CCE. |
| P-19 | Requisitos financieros y de experiencia frente a su empresa y al sector | mejorar_existente | mejorar_existente | sí | R-02 indicadores: 1 sesión. Aviso del año en firme: media sesión. La referencia por tamaño de pliego y el conteo del universo no se construyen, por falta de datos. |
| P-20 | Historial de habilitación y procesos que se caen | mejorar_existente | mejorar_existente | no | 1 a 2 sesiones para el aviso de desierto y el proceso nuevo. El historial de habilitación no se construye. |
| P-21 | Auditor del presupuesto oficial | mejorar_existente | mejorar_existente | sí | 2 a 3 sesiones para la parte de hechos (aritmética de la entidad + diff de ítems entre borrador y definitivo); la parte de 'precio viejo/acarreo/commodity' no se estima porque se descarta. |
| P-22 | Ficha del AIU, imprevistos e IVA del proceso | mejorar_existente | mejorar_existente | sí | 2 sesiones (con N05) más el plan previo con el visto bueno del dueño, porque mueve el margen que se ve en Precios. |
| P-23 | Aviso de precio artificialmente bajo con su expediente | ya_existe | — | sí | 0 (ya existe). Una fracción de sesión si se quiere citar el método del pliego junto a la alerta. |
| P-24 | Cotejo del Formulario 1 y cuadre con SECOP II | mejorar_existente | mejorar_existente | sí | N11-A 1 a 2 sesiones (con plan, prueba por mutación y revisión adversaria, porque es [VB]); N11-B y la lista para el cuestionario, 2 a 3 más. |
| P-25 | Simulador del puntaje económico y patrón de descuentos | descartar | — | sí | Retrospectiva: 2 a 3 sesiones más un lector de la versión del documento tipo (otras 2, con mutación y revisión adversaria porque mueve el precio). Lo propuesto entero: no estimable, porque faltan datos. |
| P-26 | Vigía del RUP y su firmeza frente al cierre | mejorar_existente | mejorar_existente | no | 1,5 a 2 sesiones, más la verificación de la norma de firmeza con fuente. |
| P-27 | Expediente documental con vencimientos y modo mínima cuantía exprés | mejorar_existente | mejorar_existente | no | 1,5 a 2 sesiones la carpeta de empresa reutilizable. Leer la vigencia exigida del pliego: 3 a 4 sesiones más (es R-08) y con alto riesgo de error. |
| P-28 | Semáforo del día del cierre y plan de contingencia | mejorar_existente | mejorar_existente | no | 1 sesión el cotejo de la póliza y las preguntas del día del cierre. La contingencia por caída de SECOP II no se estima porque no tiene datos. |
| P-29 | Subsanación: qué se arregla, hasta cuándo y qué contestar | mejorar_existente | mejorar_existente | no | 1 sesion para el paso fechado + aviso; R-08 completo (subsanable por requisito) 3 a 4 sesiones segun docs/INVESTIGACION_MERCADO_LICITADOR.md 5.2, y exigiria levantar la decision de guia_proceso.js:1075 |
| P-30 | ¿Vale la pena pelear la adjudicación? | descartar | — | sí | 4 a 6 sesiones (metodo de puntaje por documento tipo, fuentes juridicas con fecha, revision de abogado) |
| P-31 | Chequeo de inhabilidades, multas y antecedentes de socios | mejorar_existente | mejorar_existente | no | 1 a 2 sesiones (consorcios por ceth-n4bn + llamada por integrante); Banco Mundial/BID +1 si su API responde |
| P-32 | Asistente de contratos en ejecución para la capacidad residual | ya_existe | — | sí | 0 para lo pedido; 1 sesion para llevar lo aparte a tarjeta/dictamen (pendiente, con plan y mutacion porque mueve la K) |
| P-33 | Validador de experiencia y reglas del consorcio | mejorar_existente | mejorar_existente | sí | 1 sesión para la lista contrato por contrato con lo que ya se lee; la matriz por versión del documento tipo, 2-3 sesiones más y no recomendada |
| P-34 | Mipyme: limitación a tiempo, documentos y desempate | mejorar_existente | mejorar_existente | sí | 2 sesiones la etapa 1 (lectura de la cláusula en Mis procesos y aviso por socio); 2-3 sesiones la etapa 2 (índice de dmgg-8hin para la tarjeta); el aviso de fecha límite desde el PAA y el borrador de solicitud, no recomendados todavía |
| P-35 | Revisión de minuta, matriz de riesgos y cláusulas observables | mejorar_existente | mejorar_existente | no | 1-2 sesiones (texto de dos tipos de documento más en la entrada, categorías nuevas en las instrucciones y el esquema, versión del dictamen y prueba de la verificación de citas) |
| P-36 | Costos ocultos del pliego: obligaciones sociales y puntos de calidad | descartar | — | sí | 0,5 sesiones para que el dictamen nombre las obligaciones con cita (dentro de P-35); la estimación de costos de calidad, no recomendada |
| P-37 | Interventoría y consultoría: costeo y reglas del concurso | mejorar_existente | mejorar_existente | sí | 1 sesión para la contribución del pisoTecho (con plan, visto bueno y prueba por mutación porque mueve p_ganar). 2-3 sesiones para el comparador del equipo, que depende de que el dictamen extraiga el equipo con citas. |
| P-38 | Vigía del interventor durante la obra | mejorar_existente | mejorar_existente | no | 1-2 sesiones para el aviso 'la obra se prorrogó hasta Y y su contrato vence el X', con enlace manual. El registro documental no se recomienda. |
| P-39 | Piso de lance para subasta inversa | mejorar_existente | mejorar_existente | sí | 1 sesión. Es una cifra que decide precio, así que lleva plan, visto bueno, prueba por mutación y revisión adversaria. |
| P-40 | Radar de acuerdos marco y Tienda Virtual | descartar | — | no | 3-5 sesiones, más el mantenimiento continuo de reglas de CCE. |
| P-41 | Temporada de contratación y ley de garantías | mejorar_existente | mejorar_existente | no | 1 a 2 sesiones (solo el histograma por mes del año en el detalle de la entidad); la parte de capacidad y caja libre no se recomienda. |
| P-42 | Fuentes de precios para el APU: visita, proveedores y catálogo | descartar | — | sí | Emparejamiento y cuadre: 0 (ya existen). Libreta de proveedores con fecha guardada como precio propio: 2 a 3 sesiones, y se solapa con R-15 (edad de los precios propios). Solicitud por correo: bloqueada hasta que el dueño configure el correo. |
| P-43 | Hoja de vida propia y registro de decisiones de ofertar | mejorar_existente | mejorar_existente | no | 2 sesiones para R-07 (estimado de docs/INVESTIGACION_MERCADO_LICITADOR.md §5.2) más la tanda de D-47/D-48; antes conviene N23-D (contratos en consorcio) para que el historial no salga corto. |

### 5.1 Propuestas vivas: qué cambió desde el 2-oct y primer paso

#### P-01 · Semáforo de madurez del proyecto en el dictamen

- **Qué hace:** Al leer el pliego, la app busca en estudios previos y anexos si hay predios adquiridos, licencias y permisos, diseños definitivos (fase 3) y plazo coherente, y si el pliego le traslada los diseños («apropiación de diseños», «tomará como suyos»). El empresario ve el hecho con página («predios sin adquirir según estudios previos, p. 14») en ámbar y un borrador de observación para radicar dentro del plazo, que deja constancia.
- **Problemas que resuelve:** PLA-01, PLA-02, PLA-03, PLA-04, DET-01, PRE-14, FIR-01, FIR-02, EJE-08, TRA-03
- **Cambio desde el 2-oct:** Nada funcional en los detectores: los 6 commits de lib/dictamen_reglas.js desde el 2-oct (f7687da, 86907ff, 14efa2f, 9e9c799, 2018cd2, a807e8f) son todos del anticipo; en lib/dictamen.js entraron el techo de Precios (b65568f, 4179798), el tope de 3 lecturas (15943ca) y la alerta por modalidad (de9eec5), ninguno toca riesgos ni preguntas. Contexto que sí cambia el valor: el 18-oct el dictamen pasó a leer «el documento que ES el pliego» (versión que rige), así que un detector nuevo correría sobre el documento correcto; y la «Fase C» se cerró sin construir la descarga de pliegos de más de 20 MB porque los medidos son escaneos: los estudios previos escaneados siguen ilegibles (OCR sin clave). El veredicto se mantiene.
- **Motivo del veredicto (19-oct):** Se mantiene: el esqueleto (detector de licencias con página, riesgo citado, pregunta formal, veredicto por pendientes) existe hoy tal cual estaba el 2-oct, solo cambiaron números de línea. Faltan exactamente los tres detectores. Mueve el veredicto del dictamen (:371), así que lleva plan, visto bueno y mutación. Vale menos mientras el OCR siga apagado y los escaneos de más de 20 MB no se bajen (Fase C cerrada el 18-oct): el silencio del pliego no puede leerse como «hay predios».
- **Cómo se construye:** Sin op nueva. Se añaden dos o tres entradas a DETECTORES en lib/dictamen_reglas.js: predios (adquisición predial, «predios por adquirir», servidumbres), diseños no definitivos (estudios y diseños a cargo del contratista, «fase 2»/«fase 3») y traslado de diseños («tomará como suyos», «asume los diseños»). A cada una le toca su riesgo() y su pregunta en la sección 4, más su etiqueta en lib/dictamen.js:141/:149 para que el modelo use la misma categoría. Lo que hay que reutilizar es el borrador formal que ya existe (`preguntas_para_la_entidad`), no un generador nuevo. Sin «semáforo de madurez» agregado: solo el hecho con su página.
- **Riesgo de cifra falsa:** No pone cifra, pero sí mueve el veredicto: cada detector que se dispara añade un pendiente y lleva el dictamen a «con reservas» (dictamen_reglas.js:296). Una regla amplia con «diseño» o «predio» saltaría en casi toda obra y se volvería ruido. Ya pasó con el borrador de observación descartado (N18, ~85 % de las obras). Sin OCR, la ausencia de la frase NO significa que haya predios: el silencio no debe leerse como verde.
- **Primer paso:** Primera sesión: leer sed -n '6841,6893p' y '6996,7052p' docs/MEMORIA.md (dictamen por reglas; «la cláusula gana al índice»); en lib/dictamen_reglas.js añadir el detector `predios_sin_adquirir` en DETECTORES (:43) con su `riesgo()` (:334) y su pregunta (:366); correr `detectar` sobre los textos de los índices ya guardados de los procesos del dueño para contar en cuántos salta y leer cada acierto; prueba por mutación: con el detector quitado, un pliego sintético con «predios por adquirir» debe pasar de «presentarse_con_reservas» a «presentarse» y la prueba debe caer. Antes, plan de pocas líneas al dueño.

#### P-04 · Medidor de obra que no sale a concurso

- **Qué hace:** Por entidad y municipio, muestra como hecho cuánta obra se va por contratación directa, urgencia, convenio solidario con juntas de acción comunal, ESAL o consultoría disfrazada de servicios («de $10.000 M de obra, $3.200 M no salieron a concurso»), y marca las figuras que la ley ya no permite (Asociación Público Popular después del 25-feb-2026) como observables.
- **Problemas que resuelve:** PLA-15, PLA-16, DET-05, DET-07, TRA-20
- **Cambio desde el 2-oct:** Nada funcional: los únicos commits desde el 2-oct en lib/ejecucion.js, lib/competencia_detalle.js, lib/handlers/inteligencia/detalle.js y api/inteligencia.js son d92e03c (ninguna respuesta de error lleva una llave: api/inteligencia.js:41 envuelve `res` con conLlavesTachadas) y b73c38e (ingreso con correo y contraseña). Contexto nuevo que importa: el 16-oct Vercel pausó Detekta por CPU y el dueño pasó a cuenta nueva con «menos llamadas automáticas»; ampliar un $select que ya se hace NO añade ninguna llamada, así que la propuesta encaja con la dieta. Veredicto se mantiene; se añade un hermano: lib/socio.js:54 también usa `agregarEjecucion` sobre su propia consulta jbjy (socio.js:280-282, también sin modalidad), así que el agregado nuevo debe decir «sin dato» cuando el campo no viene.
- **Motivo del veredicto (19-oct):** Se mantiene: el dato sigue sin existir en Detekta y el camino sigue siendo el mismo (ampliar el $select que ya se ejecuta y agregar). Con la dieta de CPU del 16-oct gana peso que no añada ni una llamada. No toca precio, puertas ni filtros; es un hecho con su conteo. Lo que se recorta (acusaciones y norma sin leer) sigue recortado. Sin verificar hoy: que jbjy siga devolviendo `justificacion_modalidad_de` (se comprueba en la primera sesión con una consulta de 3 filas).
- **Cómo se construye:** Sin op nueva y sin consulta nueva. Se añaden `modalidad_de_contratacion,justificacion_modalidad_de` al $select que ya hace lib/ejecucion.js:ejecucionDeEntidad, y se agrega por modalidad y causal en agregarEjecucion. El modal de la entidad (op=detalle en api/inteligencia.js) mostraría «de N contratos de obra firmados en la ventana, M fueron directos (urgencia X, convenio solidario Y)» con su conteo, y «sin dato» cuando la causal venga vacía. Hay que subir la versión de la clave de caché (competencia_detalle.js:145, hoy v8).
- **Riesgo de cifra falsa:** Medio, y controlable si se muestran conteos y montos tal como vienen. Lo que no debe hacerse: (1) decir «consultoría disfrazada» o «la ley ya no permite X», porque es acusar o citar una norma (la «Asociación Público Popular después del 25-feb-2026») que no verifiqué y que el proyecto prohíbe sin fuente leída; (2) dejar que el tope de 1.000 filas pase por total en entidades grandes sin decir que es parcial; (3) presentar el filtro tipo Obra como si cubriera también los interadministrativos rotulados «Otro».
- **Primer paso:** Primera sesión: `node tests/mapa.js ejecucion` y leer la sección de la memoria «Cómo ejecuta sus contratos» (sed del mapa) y la del 27-sep sobre «Suspendidos»; pedir a jbjy-vk9h 3 filas con `$select=modalidad_de_contratacion,justificacion_modalidad_de` para confirmar que las columnas existen (un 400 lo dice); luego en lib/ejecucion.js ampliar el $select (:149) y añadir `directa` en agregarEjecucion (:61) con prueba unitaria pura: filas sintéticas con causal vacía deben dar `sin_dato` > 0 y nunca contar como directa; subir v8→v9 en competencia_detalle.js:145; abrir el modal de una entidad en navegador real.

#### P-14 · Así ejecuta esta entidad: adiciones, prórrogas y plazo realista

- **Qué hace:** Antes de ofertar, el hecho medido de la entidad: «de sus últimos 20 contratos de obra, 14 se prorrogaron (mediana 4 meses) y 6 se adicionaron en valor; 2 quedaron inconclusos», clasificando cada modificación por su descripción. Al lado del plazo del pliego, el plazo realista de contratos parecidos, para costear la administración y la capacidad residual comprometida con ese plazo.
- **Problemas que resuelve:** DET-21, EJE-03, PLA-02, TRA-03, EJE-18
- **Cambio desde el 2-oct:** Nada en el código: `git log --oneline --since=2026-10-02 -- lib/contratos_en_ejecucion.js lib/ejecucion.js` → vacío; `git log -S bloqueEjecucion -- public/app.js` desde el 2-oct → vacío. Dos cambios de contexto: (1) la pausa de Vercel por CPU (16-oct) hace caro leer u8cx-r425 para hasta 1.000 contratos de una entidad en tandas de 50 (hasta 20 llamadas por modal no cacheado, TTL 1 h): hay que acotar la lectura; (2) el 18-oct quedó abierto «decidir con el dueño cómo usar el plazo del pliego: (a) solo como aviso…», que refuerza que ningún «plazo realista» entre a cálculo. Veredicto se mantiene.
- **Motivo del veredicto (19-oct):** Se mantiene: las prórrogas por entidad ya existen y se muestran; lo que falta es la adición en valor, y la regla para despejarla (`ultimaModificacion`, tandas de 50, «la última publicada decide») ya está escrita en lib/contratos_en_ejecucion.js y solo hay que llamarla. Lo nuevo desde el 2-oct es que la lectura adicional de u8cx cuesta CPU en la cuenta nueva: se acota a una tanda y se declara. El plazo realista nunca entra a la administración ni a la K (en precios cuesta el falso positivo), y el pendiente del 18-oct sobre el plazo del pliego confirma que eso lo decide el dueño.
- **Cómo se construye:** Se amplía lib/ejecucion.agregarEjecucion con la adición en valor leída de u8cx-r425, reutilizando la lectura en tandas de 50 de lib/contratos_en_ejecucion (allí se fijó que pasar de 8 KB en la URL da 414) y su regla de «la última modificación publicada decide». Sale por el mismo op de detalle de api/inteligencia.js. El plazo realista va como frase de contexto en el modal, nunca dentro de la K ni de la administración de Precios.
- **Riesgo de cifra falsa:** Alto si el «plazo realista» alimenta el costo de administración o la K: es un supuesto creíble en el módulo de precios, donde lo caro es el falso positivo. Clasificar por la descripción da falsos «adicionó» (la memoria ya encontró el mismo día un reinicio con la fecha vieja y una adición con la nueva, CO1.PCCNTR.9714208). Hay que mostrar el número de contratos, «sin dato» y «a confirmar».
- **Primer paso:** Primera sesión: leer con el sed del mapa las secciones «Las prórrogas que jbjy-vk9h no trae…» (27-sep) y «Vercel pausó Detekta por CPU» (sed -n '18638,18700p' docs/MEMORIA.md); exportar de lib/contratos_en_ejecucion.js la lectura en tandas de u8cx como función reutilizable (hoy está dentro de la consulta de :360) y llamarla desde lib/ejecucion.ejecucionDeEntidad para los 50 contratos más recientes; en agregarEjecucion (:61) añadir `adiciones_valor: { contratos, sin_dato, de_cuantos: 50 }` usando `ultimaModificacion`; prueba unitaria pura con filas sintéticas (una sola versión → sin_dato; dos versiones → diferencia) y mutación: quitar la condición `valores.length === 1` debe hacer caer la prueba; plan al dueño antes.

#### P-17 · Datos honestos: NIT, consorcios, cobertura y lectura verificada

- **Qué hace:** Une los registros del mismo proponente con NIT escrito de formas distintas, reconstruye consorcios con NIT «No Definido», excluye y cuenta aparte precios de $0 o $1, multilotes y adjudicados con 0 oferentes, muestra «sin dato» cuando el número de oferentes no existe, avisa qué parte de la contratación sigue en SECOP I y si la entidad no publica evaluación ni adjudicación. En el dictamen, cada «no se encontró» lleva dónde se buscó y lo extraído sin cita queda «a verificar»; las normas citadas se revisan contra un censo de normas caídas.
- **Problemas que resuelve:** DET-06, TRA-11, TRA-12, TRA-13, TRA-14, PRE-25, PLA-24
- **Cambio desde el 2-oct:** Nada: `git log --oneline --since=2026-10-02 -- lib/socio.js lib/equivalencias.js lib/indice_competencia.js lib/indice_baja.js lib/seguimiento.js lib/proponentes.js lib/filtros_lista.js` → vacío. El pendiente de los hermanos de consorcio sigue abierto literal en estado.js de hoy (no está entre los RESUELTO del 17/18-oct, que fueron: cadena con waitUntil, tablero de pendientes, lecturas del pliego, muro de Vercel, entrada del dueño, carga en Precios, rescate bajo el 50 %, Fase C, anticipo en prosa, clasificador DocBase). Veredicto se mantiene.
- **Motivo del veredicto (19-oct):** Se mantiene: casi todo lo que pide ya está en el código con su prueba y nada de eso cambió desde el 2-oct; lo único abierto es el hermano de consorcio de socio.js (pendiente literal que sigue en estado.js) y la cobertura SECOP I, que no existe. Corrijo un dato del veredicto anterior: el detalle de entidad sale por api/inteligencia.js:41 (op=detalle), no por api/procesos.js. La cobertura SECOP I sigue condicionada a que la consulta agrupada responda; hoy no la volví a llamar.
- **Cómo se construye:** Solo cabe la pieza que falta. Una línea de cobertura SECOP I por entidad, plegada en el detalle de entidad que ya existe (lib/competencia_detalle.js, servido por api/procesos.js) y leída con lib/socrata.js. Antes, el pendiente abierto de los hermanos de consorcio: lib/socio.js y el seguimiento de la competencia consultan solo por documento_proveedor; deben llamar a la regla de grupo de lib/contratos_en_ejecucion.js, no copiarla. No hace falta ninguna op nueva.
- **Riesgo de cifra falsa:** Alto en la unión por nombre que propone (juntar empresas distintas mueve el índice de competencia que ordena la lista). Que el SECOP I «cubra» una entidad sería una cifra con base heterogénea (otro dataset, otros campos) y nada la contrasta. La lista cerrada de normas ya es más segura que un censo de normas caídas: lo que no está en la lista no se cita.
- **Primer paso:** Primera sesión: leer sed de la memoria «Las cinco cosas falsas…» (el mapa lo da con `node tests/mapa.js consorcio`) y la cabecera de lib/contratos_en_ejecucion.js (:1-60); en lib/socio.js consultarContratos (:275-282) añadir la lectura de ceth-n4bn por nitSinDv(id) y la segunda consulta jbjy por los codigo_grupo encontrados, reutilizando `participacionDe` y `nitSinDv` importados de contratos_en_ejecucion.js (require diferido dentro de la función si cierra ciclo); prueba con fetch simulado: un NIT sin contratos propios y con un grupo debe dejar de decir «Sin contratos registrados en SECOP II» y la prueba debe caer con el árbol anterior; cerrar el marcador del pendiente con «> RESUELTO el …» en el mismo commit.

#### P-19 · Requisitos financieros y de experiencia frente a su empresa y al sector

- **Qué hace:** Compara cada indicador del pliego con el del usuario (de su RUP) y con la referencia del sector o del documento tipo: «su liquidez 1,4; el pliego pide 2,0; los pliegos de este tamaño piden 1,2». Cuenta cuántas empresas del universo cumplirían, muestra capital de trabajo y experiencia como múltiplos del presupuesto, avisa con qué año en firme se evaluará si cierra entre enero y abril y redacta la observación por desproporción.
- **Problemas que resuelve:** PLA-05, DET-14, PRE-21, PLA-06
- **Cambio desde el 2-oct:** lib/guia_proceso.js recibió 4 commits (b65568f techo = cifra más baja entre SECOP II y pliego definitivo, 4179798 solo=tope, de9eec5 alerta de precio artificialmente bajo por modalidad, 0dd5ad1 merge): ninguno toca el bloque de indicadores ni la firmeza del RUP. lib/diff.js, lib/rup_pdf.js, lib/config_rup.js, lib/capital_trabajo.js, lib/capacidad.js: 0 commits desde el 2-oct. LA PREMISA DEL 2-OCT ESTABA VENCIDA YA ENTONCES: el defecto «indicadores No cumple contra referencia fija sin pliego leído» se arregló el 27-sep-2026 (commit b52ec42, R-02); el estado.js de hoy lo sigue nombrando dentro del bloque grande del 26-sep, pero otro pendiente de la misma salida dice «Los demás del lote están resueltos (R-02, R-02b, R-04 en #189 y esta sección)». Lo único sin construir es el aviso del año en firme.
- **Motivo del veredicto (19-oct):** La comparación pliego-empresa con tabla Mipyme, la fórmula del capital de trabajo y las carencias por socio ya existen, y el defecto que decidía dinero (rojo sin pliego leído) quedó resuelto el 27-sep con prueba que ejecuta guiaDe. Lo que la propuesta añade de verdad —referencia del sector y universo de proponentes— sigue sin datos y sería una cifra creíble sin fuente. Vale solo el aviso del año en firme, que es texto de orientación y no mueve ninguna puerta ni cifra.
- **Cómo se construye:** Solo vale la parte que ya tiene datos. (1) Arreglar el pendiente que decide dinero: los indicadores que dicen «No cumple» contra la referencia fija sin pliego leído (lib/guia_proceso.js:97) deben decir «compárelo con el pliego». Es R-02 y va con plan, visto bueno y mutación. (2) Una línea en la guía (api/procesos.js → lib/guia_proceso.js) que diga con qué corte de balance en firme se evaluará si el proceso cierra antes de la renovación de abril. No hace falta ninguna op nueva.
- **Riesgo de cifra falsa:** «Los pliegos de este tamaño piden 1,2» sin un corpus medido y vigente es un supuesto creíble. «Cuántas empresas cumplirían» no tiene fuente. La observación por desproporción redactada en automático repite la caída de N18. La pieza que ya existe tiene un defecto que decide hoy (rojo sin pliego leído), y en oportunidades lo caro es el falso negativo.
- **Primer paso:** Sesión 1: en lib/guia_proceso.js, bloque del requisito `registro` (:514-520), añadir la frase condicionada al cierre (cierreDe(l)) entre 1-ene y el quinto día hábil de abril del mismo año, con `perfilObj.corte`/`perfilObj.firmeza`; null → sin frase. Prueba en tests/e2e.js que ejecute `G.guiaDe({ fila: {...FILA, fecha_de_recepcion_de: "2027-02-15…"}, perfil: "helder", ctx: { ahoraMs: Date.parse("2027-01-20…") } })` y afirme la frase con «corte 31-12-2025», y otra con cierre en junio que afirme su ausencia; correr `node tests/e2e.js > salida.txt 2>&1; echo CODIGO=$?` hasta 4/4. Sin mutación obligatoria (no decide), pero la prueba debe fallar sin la frase.

#### P-20 · Historial de habilitación y procesos que se caen

- **Qué hace:** Por entidad, cuántos se presentaron y cuántos quedaron habilitados («de 10, 6 habilitados»; «en 3 de sus 5 últimas licitaciones habilitó a uno solo»), y cuántos procesos terminaron desiertos o anormalmente. Si un proceso que el usuario siguió se declara desierto, avisa que puede reabrirse por selección abreviada dentro de 4 meses y busca el nuevo proceso de la misma entidad.
- **Problemas que resuelve:** EVA-14, DET-22, DET-09
- **Cambio desde el 2-oct:** lib/indice_competencia.js: 0 commits desde el 2-oct (desenlaceDe sigue en :256). lib/seguimiento.js y lib/handlers/perfil/seguimiento.js solo recibieron b73c38e (sesión del dueño con correo y contraseña), 4179798 (techo de la tarjeta) y un merge: nada sobre desiertos o reapertura. Lo que el 2-oct no pesó: una prueba del 27-sep (anterior al veredicto) deja medido que SECOP II (p6dx-8zbt) NO publica el estado «desierto» en 9,2 millones de filas, así que el disparador «la foto cambia a desierto» no tiene dato en el corpus vivo, y el modal de la entidad pinta hoy los desiertos como «sin dato», no como frecuencia.
- **Motivo del veredicto (19-oct):** Nada cambió en el código desde el 2-oct, pero el veredicto queda condicionado: el aviso «quedó desierto» depende de un estado que una medición del 27-sep sobre 9,2 millones de filas dice que SECOP II no publica, y el modal de la entidad ya enseña «sin dato» por eso. Sin esa medición repetida sobre el corpus de hoy, construir el aviso sería un disparador que nunca suena. La tasa de habilitación por entidad sigue descartada: no hay dato abierto y un «habilitó a uno solo» falso esconde entidades.
- **Cómo se construye:** Solo la pieza con datos. Cuando la foto de un proceso guardado cambie a desierto, Mis procesos lo explica y lista los procesos nuevos de la MISMA entidad (por los ids del corpus, no por NIT, como en lib/proponentes.js) con objeto parecido. Se pliega en el op de seguimiento de api/perfil.js (lib/handlers/perfil/seguimiento.js) y llama a desenlaceDe de lib/indice_competencia.js en vez de reescribirla. El plazo «4 meses por selección abreviada» solo entra con la norma leída y citada; sin eso, «puede reabrirse: vigile la entidad», sin plazo.
- **Riesgo de cifra falsa:** Alto en la tasa de habilitación: leída de PDF falla, y un «habilitó a uno solo» falso hace descartar una entidad (falso negativo caro en oportunidades). En el aviso de reapertura el riesgo es bajo si no se inventa el plazo. El casamiento por objeto parecido puede traer un proceso que no es: hay que decir «posible».
- **Primer paso:** Sesión 1 (solo lectura): un script en el scratchpad que lea el corpus comprimido con el mismo lector que usa lib/indice_competencia.js (sin op nueva) y cuente por año cuántas filas devuelven desenlaceDe(lic) === "desierto" o "desierto_con_adjudicacion"; anotar la cifra. Si es 0 para 2025-2026: cerrar P-20 en la memoria con esa cifra. Si no: prueba en tests/e2e.js que ejecute la función de cambios de lib/seguimiento.js (la que recorre CAMPOS_VIGILADOS en :493) con `vista.estado_secop = "Presentación de oferta"` y `viva.estado_secop = "Desierto"` y afirme el mensaje nuevo, y con «Cancelado» afirme que NO sale (cancelado no es desierto, lib/indice_competencia.js:220-222).

#### P-21 · Auditor del presupuesto oficial

- **Qué hace:** Recalcula cantidad por precio, subtotales, AIU e IVA del formulario de la entidad; compara cada ítem con la lista de referencia (INVIAS, IDU, gobernación) y su fecha; detecta precios viejos indexados con IPC, acarreos de 1 km copiados del APU del INVIAS, commodities desactualizados (acero, asfalto, concreto), cotizaciones atípicas y los ítems que subieron o bajaron entre el borrador y el definitivo sin mover el total. Deja la observación por insuficiencia lista para radicar.
- **Problemas que resuelve:** PLA-09, PLA-10, PLA-11, PLA-12, PRE-15, FIR-04
- **Cambio desde el 2-oct:** lib/apu_pliego.js y lib/diff.js: 0 commits desde el 2-oct. lib/formulario1.js recibió 4 (9c24a68 límite medido de la entidad 91,6-92,8 %, f82f784 aviso del rango en ámbar, de9eec5 alerta de precio artificialmente bajo por modalidad 88 %/70 %, 0dd5ad1 merge): todos juzgan el precio del USUARIO frente al oficial, no auditan el presupuesto de la entidad. lib/handlers/pliego/ recibió el versionado del texto del pliego (10c98b5, 1faf73c, f1676da), «solo se guarda como versión lo que se llama pliego» (8a164bc, f6c0887, b5e39f3), el clasificador «DocBase_…» (dd9efaf) y dfb3601 (dictamen, cronograma y descuentos leen el documento que ES el pliego): hay más versiones guardadas y mejor identificadas, que es justo la materia prima del diff ítem por ítem. LA PREMISA DEL 2-OCT ESTABA VENCIDA: el «no_cuadra» de la entidad YA salía en pantalla desde el 26-sep.
- **Motivo del veredicto (19-oct):** La aritmética del presupuesto de la entidad ya se calcula y ya se enseña fila a fila y por documento desde el 26-sep; los bancos oficiales por ítem ya cargan la cascada de precios. Lo único que sigue faltando y es un hecho verificable es el diff ítem por ítem entre versiones del formulario, hoy más viable porque el vigía guarda e identifica mejor las versiones desde el 18-oct. La mitad que dictamina «precio viejo», «acarreo copiado» o «commodity desactualizado» sigue descartada: es inferencia con rango de 3 a 6 veces entre listas y en precios el falso positivo es el caro. El diff es un aviso con la fila delante y no mueve ninguna cifra de Precios; si alguna vez alimenta el techo o la validación del Formulario 1, pasa a plan con visto bueno y mutación.
- **Cómo se construye:** Parte con hechos: en /api/pliego (router existente) sacar a la pantalla el «no_cuadra» que ya calcula lib/apu_pliego.js sobre el formulario de la ENTIDAD (fila y total) y añadir a lib/diff.js un diff ítem por ítem entre versiones del formulario (unitario y cantidad que se movieron sin mover el total), reutilizando normalizarItems/compararItems de lib/formulario1.js. Sin op nueva si cabe en la respuesta de la op de lectura del pliego o en op=formulario1. Lo de IPC, acarreo y commodities no se construye.
- **Riesgo de cifra falsa:** Alto en la mitad que juzga precios: un emparejamiento flojo entre el ítem de la entidad y la lista oficial acusa a un ítem sano, y 'indexado con IPC' o 'acarreo copiado' son inferencias, no hechos. Bajo en la mitad aritmética y en el diff entre versiones: son hechos verificables con evidencia de fila.
- **Primer paso:** Sesión 1: leer `sed -n` de la sección del vigía de adendas que dé `node tests/mapa.js diff`, y escribir en lib/diff.js `compararFormulario(itemsAntes, itemsDespues)` sobre `normalizarItems`/`compararItems` de lib/formulario1.js; prueba en tests/e2e.js que ejecute la función real con dos listas sintéticas donde un ítem sube el unitario 10 % y otro baja la cantidad dejando la suma igual, y afirme los dos cambios y la marca «total sin mover»; un ítem con cantidad ilegible debe salir null, jamás 0. Luego plegar en lib/handlers/pliego/diff.js (sin op nueva) y correr `node tests/e2e.js > salida.txt 2>&1; echo CODIGO=$?` hasta 4/4; navegador real por tocar public/pliego.js.

#### P-22 · Ficha del AIU, imprevistos e IVA del proceso

- **Qué hace:** Muestra el A, I y U del presupuesto oficial cuando están desglosados frente a la administración que el usuario calcula (personal exigido por dedicación y meses, más estampillas, pólizas, GMF y fiducia que Detekta ya calcula), dice cómo se paga la I según pliego y minuta (fija, contra soporte o silencio) y avisa la base del IVA (sobre la utilidad o sobre el total, entidad territorial).
- **Problemas que resuelve:** TRA-22, LIQ-13, PLA-13, PRE-17, FIR-16
- **Cambio desde el 2-oct:** lib/apu_pliego.js: 0 commits (leerAiu sigue sin ningún llamador fuera del módulo). lib/deducciones.js: 0 commits. lib/apu/normativa.js, lib/ganancia.js y lib/handlers/apu/editor.js solo recibieron merges y cambios ajenos (39ae1c6 tope de despertares, de9eec5 alerta de precio bajo, b73c38e sesión del dueño). Cambio que SÍ toca la propuesta: dfb3601 (18-oct) «El dictamen, el cronograma y los descuentos leen el documento que es el pliego» hizo que op=deducciones lea la versión que es el pliego (lib/handlers/pliego/cronograma.js textoGuardado), y el 18-oct quedó resuelto el pendiente «la segunda estampilla de una misma línea se pierde» (lib/deducciones.js:145-150, «MULTIPLE vale también dentro de la línea, 27-sep»). N05 sigue en la misma situación que el 2-oct: el lector existe y ninguna pantalla lo llama.
- **Motivo del veredicto (19-oct):** Nada de lo que falta se construyó desde el 2-oct y nada lo invalidó; al contrario, dfb3601 unificó qué documento se lee, que era una de las dudas de N05. La lectura del AIU, las deducciones y la variante con IVA existen y siguen sin ponerse una al lado de la otra ni en Precios ni en el expediente. Sigue siendo mejor absorber P-22 en N05 que abrir otro frente; se excluyen la administración con personal supuesto y el modo de pago de la I sin frase literal.
- **Cómo se construye:** Plegar en la respuesta de la lectura del pliego (/api/pliego) y en el bloque de rentabilidad de /api/apu op del editor (lib/handlers/apu/editor.js): mostrar A/I/U leídos frente a los del usuario, reutilizando leerAiu, normativa.deducciones y la variante con_iva/sin_iva ya detectada. La base del IVA solo se AVISA ('verifíquelo con su contador'), nunca se fija. La forma de pago de la I, solo si aparece una frase literal con su página; si no, se calla. Debe ir junto a N05 «Lo que la entidad le descuenta», que ya está en la hoja de ruta.
- **Riesgo de cifra falsa:** Medio-alto: la base del IVA depende del objeto y de la entidad, y un regex que da por hecho que la I se paga 'contra soporte' sin tener la cláusula le cambia el margen. Calcular la administración con el personal exigido supone salarios y dedicaciones: un supuesto que parece un dato.
- **Primer paso:** Sesión 1: plan de cinco líneas para el dueño (qué se muestra, que ninguna cifra del pliego entra al piso ni al techo, cómo se prueba). Con el visto bueno: en lib/handlers/apu/editor.js, junto al bloque `aiu:` de :933, calcular `aiu_pliego` con `require("../../apu_pliego.js").leerAiu(lineas)` sobre `textoGuardado` del pliego del proceso (misma fuente que lib/handlers/pliego/deducciones.js); prueba en tests/e2e.js que ejecute el handler con un texto sintético «ADMINISTRACIÓN 20 % · IMPREVISTOS 3 % · UTILIDAD 5 %» y afirme `aiu_pliego = {administracion 20, imprevistos 3, utilidad 5}` y, sin pliego, `aiu_pliego === null`; mutación: quitar la llamada a leerAiu debe tumbar la prueba, y `piso_techo.precio_piso_decision` debe quedar idéntico con y sin pliego (el dato del pliego no decide). Luego 4/4 y navegador real por tocar public/app.js.

#### P-24 · Cotejo del Formulario 1 y cuadre con SECOP II

- **Qué hace:** El usuario sube su formato diligenciado: la app rehace la aritmética, verifica que no falte ni cambie un ítem o cantidad, que ningún unitario esté en cero ni supere el tope de los marcados, que el AIU no supere el oficial y el total no pase el presupuesto (redondeo al peso). Genera la lista exacta de valores para copiar al cuestionario de SECOP II y el total que debe mostrar la confirmación.
- **Problemas que resuelve:** PRE-04, PRE-05, PRE-06, EVA-11, EVA-04
- **Cambio desde el 2-oct:** Cuatro commits en lib/formulario1.js desde el 2-oct (9c24a68 límite medido de la entidad 91,6-92,8 %; f82f784 aviso del rango medido en ámbar; de9eec5 corte de precio bajo por modalidad 88/70 %; 0dd5ad1 fusión), todos sobre la validación 5 «temeraria»; ninguno toca el cotejo de ítems, SECOP II ni unitarios. El 18-oct se marcó RESUELTO el pendiente «(7) el revisor de la oferta (formulario1) da «lista» con errores reproducidos» (docs/MEMORIA.md § «La investigación del licitante: la modalidad va primero, y la lista dice hoy cinco cosas falsas (27-sep-2026)», commit 1830e61 del 28-sep, N11-A). Los dos defectos de formulario1 citados en el pendiente que SIGUE abierto («unitario hasta 20 % por encima», «filas que suman más que el presupuesto») están arreglados en el código desde 0ceed67 (27-sep): reproducido HOY. N11-B (cuadre de tres sobre el Formulario 1 radicado) y la lista de valores para el cuestionario siguen sin existir.
- **Motivo del veredicto (19-oct):** Se mantiene el veredicto, con la premisa corregida: el «verde falso» que el 2-oct había que arreglar primero ya está arreglado y cerrado (N11-A en 1830e61, marcador RESUELTO el 18-oct, reproducido hoy: +10 % por ítem → alerta; filas por encima → rechazo). El cotejo sigue existiendo con sus ocho validaciones; lo único que falta y vale es N11-B: la lista exacta de valores para el cuestionario de SECOP II y el total que debe mostrar la confirmación, que es lo que evita el rechazo insubsanable por diferencia entre el anexo y la plataforma. Construir otro cotejo repetiría lo que hay.
- **Cómo se construye:** Dentro de op=formulario1 (router api/pliego.js) y de lib/formulario1.js; sin archivo nuevo. Primero arreglar los tres defectos reproducidos (N11-A: lee 'numeral' pero las filas guardan 'codigo'; da «lista» con el total sin el IVA de la utilidad; la cantidad ilegible entra como 0). Después, N11-B: cuadre de tres copias sobre el Formulario 1 que se radica y una lista de valores para copiar al cuestionario.
- **Riesgo de cifra falsa:** Hoy ya está presente: el revisor dice «Su oferta está lista para presentar» con errores reproducidos (pendiente abierto). Construir encima sin arreglar eso daría más confianza a un verde falso. Con el arreglo, el riesgo es un Excel de la entidad mal leído; por eso el ítem que no se pudo leer debe quedar 'sin leer', nunca 'cumple'.
- **Primer paso:** Primera sesión: leer MEMORIA § «A2 · Validación 8» (sed -n '1936,1979p') y § «Fases 4 y 5 del plan v3» (sed -n '4270,4311p'); escribir el plan de N11-B en pocas líneas (qué campo nuevo devuelve validarFormulario1, qué cifra se copia, cómo se prueba) y pedir el visto bueno del dueño. Con el visto bueno: en lib/formulario1.js añadir `para_secop` a la salida de validarFormulario1 (:300-330) derivado de `totalAnexo`/`comparacion.precios`, y en tests/e2e.js, bloque «unidad revisor de la oferta» (:53582), una prueba por mutación que FALLE si la lista omite un ítem o si el total copiado no es el del anexo con la variante de IVA elegida; pintarlo en public/app.js reutilizando copiarTexto (:4453) y comprobar en navegador real.

#### P-26 · Vigía del RUP y su firmeza frente al cierre

- **Qué hace:** Lleva la ventana de renovación (quinto día hábil de abril), cuenta la firmeza tras cada inscripción, actualización o renovación (radicación más días hábiles) del usuario y de cada socio, y avisa si un proceso que sigue cierra antes de la firmeza, con qué números del RUP anterior lo evaluarán (K, capacidad financiera, experiencia). Si es justo, ámbar.
- **Problemas que resuelve:** DET-15, PRE-02, EVA-05, TRA-06
- **Cambio desde el 2-oct:** Nada en los módulos que toca: git log --since=2026-10-02 vacío para lib/rup_pdf.js, lib/perfiles.js, lib/habiles.js y lib/config_rup.js; en public/app.js los commits son de Precios, login y el techo, y alertaVigenciaRup solo se desplazó de la línea 11849 a la 12038 sin cambiar (sigue contando lunes a viernes sin festivos, :12041-12046). Los dos pendientes que la sostenían siguen abiertos en estado.js. La revisión del 18-oct no los tocó.
- **Motivo del veredicto (19-oct):** Se mantiene: nada cambió en el árbol desde el 2-oct en lo que toca al RUP (cero commits en rup_pdf, perfiles, habiles, config_rup; la alarma del navegador sigue sin festivos y sin correo) y los dos pendientes siguen abiertos. La firmeza sigue siendo texto sin fecha calculable y no hay cruce con el cierre. Como decide si se presenta (oportunidades), ante la duda va ámbar y nunca bloquea; sin norma citada, null.
- **Cómo se construye:** Función pura nueva en lib/seguimiento.js o en un módulo existente del RUP (lib/config_rup.js) que reciba las fechas de radicación y devuelva la fecha de firmeza estimada con lib/habiles.sumarHabiles. alertasDe la recorre como hace con las vigencias de documentos (R-12), así que aparece en op=seguimiento y en op=avisos de api/perfil.js y en el correo diario sin op nueva. La alarma de app.js pasa a usar los festivos de lib/habiles y deja de calcular por su cuenta. Los socios del consorcio salen de op=consorcio.
- **Riesgo de cifra falsa:** Medio. Un plazo de firmeza inventado o mal contado daría una fecha creíble. Por eso, sin norma citada, null con su motivo; y como el resultado decide si se presenta (oportunidades), ante la duda va ámbar y nunca bloquea. Las fuentes discrepan sobre si basta estar inscrito o debe estar en firme al cierre: se dice el criterio prudente sin esconder el proceso. Con qué números del RUP anterior lo evaluarán (K, indicadores) sí cambia la cifra que decide la puerta, y eso lleva plan y visto bueno.
- **Primer paso:** Primera sesión: leer MEMORIA sed -n '16193,16305p' (firmeza de los RUP reales) y lib/habiles.js:83-101; buscar y citar la norma vigente del plazo de firmeza del RUP (sin fuente leída, el plazo queda null y la alerta dice «confirme la firmeza en el RUES»); escribir en lib/config_rup.js una función pura `fechaFirmezaEstimada(fechaRadicacion, { habiles })` que use sumarHabiles y devuelva null con motivo cuando falte la fecha o la norma; probarla en tests/e2e.js con fechas que crucen un festivo (la alarma de app.js:12043 no los cuenta: esa es la mutación que debe fallar contra el árbol anterior).

#### P-27 · Expediente documental con vencimientos y modo mínima cuantía exprés

- **Qué hace:** El proponente guarda una vez sus documentos (cámara de comercio, RUT, aportes, antecedentes, certificados Mipyme o de mujeres, SG-SST, certificado bancario) con su fecha de expedición; para cada proceso la app cruza la antigüedad máxima que pide el pliego con el cierre y dice qué falta o qué vence. En mínima cuantía, alerta de procesos que cierran en 24-48 horas con la carpeta lista, la K a declarar sin RUP y un «¿su precio compite?».
- **Problemas que resuelve:** PRE-03, PRE-22, DET-16, DET-19, DET-20, PRE-21
- **Cambio desde el 2-oct:** Nada en el modelo de documentos: lib/seguimiento.js sin commits desde el 2-oct (normalizarDocumentos :235, resumenDocumentos :271 iguales); lib/handlers/perfil/seguimiento.js solo recibió el login (b73c38e) y el techo de Precios (4179798); public/expediente.js (creado el 26-sep) recibió «Copiar número» (4f517b6) y el aviso del presupuesto del pliego frente a SECOP II (4534fe3), nada de documentos de empresa. op=empresa-datos (lib/handlers/perfil/empresa_datos.js, 27-sep) guarda razón social, NIT y representante para los formatos, no documentos ni vencimientos. Los pendientes de R2 y del correo siguen abiertos; el de clasificarArchivo también. R-08 sigue en «5.2 Después» de docs/INVESTIGACION_MERCADO_LICITADOR.md § «5.2 Después (1 a 3 meses · unas 15 a 17 sesiones, más el arranque del cobro)».
- **Motivo del veredicto (19-oct):** Se mantiene: las vigencias por proceso contra el cierre y sus alertas siguen hechas (R-12) y nada cambió en ese modelo desde el 2-oct; la carpeta de empresa reutilizable sigue sin existir (op=empresa-datos guarda datos de contacto, no documentos). El «modo exprés» de mínima cuantía duplica avisoCierre y la curva medida, y su «K sin RUP» se apoya en un requisito que la ley no pide. R2 y el correo siguen pendientes del dueño, así que solo se guardan fechas y rastro, nunca bytes.
- **Cómo se construye:** Carpeta de documentos a nivel de perfil (clave …:{perfil}) con fecha de expedición o de vencimiento, servida como subop de op=seguimiento en api/perfil.js. Al guardar un proceso, sus documentos se precargan desde esa carpeta y reutilizan normalizarDocumentos/resumenDocumentos, así que las alertas ya existentes funcionan sin cambios. Sin op nueva como archivo. La «K a declarar sin RUP» no se construye: en mínima cuantía no se pide RUP ni capacidad residual (N06, lib/requisitos_ley.js).
- **Riesgo de cifra falsa:** Bajo en la carpeta, porque las fechas las pone el usuario y una fecha ausente es silencio (R1). Alto si se lee del pliego la antigüedad máxima: un «30 días» mal leído daría por vigente un certificado vencido o viceversa. La «K a declarar» en mínima cuantía sería una cifra que la ley no pide, y el «¿su precio compite?» ya lo da la tabla medida de mínima cuantía. Guardar documentos sensibles exige credencial: hoy solo se guarda el rastro, no los bytes.
- **Primer paso:** Primera sesión: leer MEMORIA § «Las vigencias del expediente contra el cierre llegan a las alertas y al correo» (sed -n '17814,17832p') y lib/handlers/perfil/empresa_datos.js entero (modelo de clave config:* con credencial y TTL de perfil dinámico); definir en lib/seguimiento.js una función pura `precargarDocumentosDeEmpresa(carpeta, documentosDelProceso)` que una la carpeta del perfil con los documentos del proceso sin duplicar `clave` y pase por normalizarDocumentos; prueba en tests/e2e.js (bloque de Mis procesos) que falle si un documento de la carpeta con `vence` anterior al cierre no aparece en documentos_vencen_antes_del_cierre de op=seguimiento.

#### P-28 · Semáforo del día del cierre y plan de contingencia

- **Qué hace:** El día del cierre revisa por proceso: garantía de seriedad con número, valor y vigencia frente a lo exigido, cuenta plural con todos los integrantes «Aceptado», adendas publicadas después de «oferta enviada», archivo correcto, firmante igual al representante del certificado, cronograma recalculado con los días hábiles propios de la entidad y adendas de cronograma sospechosas. Si SECOP II falla, muestra las indisponibilidades publicadas y el correo de la entidad con el texto de «manifiesto mi intención de participar».
- **Problemas que resuelve:** PRE-01, PRE-07, PRE-08, PRE-09, PRE-10, EVA-18, TRA-07
- **Cambio desde el 2-oct:** Nada que afecte la propuesta: lib/guia_proceso.js recibió solo cambios de Precios (b65568f y 4179798 techo de la oferta, de9eec5 corte por modalidad, 0dd5ad1 fusión); el paso a paso del cierre se desplazó de :780-822 a :805-823 sin cambiar; lib/garantia_seriedad.js, lib/adendas.js y lib/seguimiento.js sin commits; lib/cronograma.js recibió 5d83c40 (ejemplo entre corchetes no es hito, tres versiones del pliego), que no toca el día del cierre. El pendiente de «Me presenté» sigue abierto; N16 y N15 siguen caídos en docs/INVESTIGACION_LICITANTE.md § «8. Lo que cayó en la verificación y por qué (para no volver a proponerlo)»-252.
- **Motivo del veredicto (19-oct):** Se mantiene: el paso a paso del cierre, el valor de la garantía leído del pliego y el vigía de adendas siguen existiendo sin cambios desde el 2-oct, y el cotejo de la póliza y las preguntas del día del cierre siguen sin existir (grep en 0). Lo que suma sin inventar es comparar lo que el usuario escribe de su póliza con lo leído del pliego y listar como tareas lo que la app no puede comprobar; lo demás (indisponibilidades, días hábiles de la entidad, plantilla de contingencia) sigue sin dato ni norma, y la regla dura prohíbe inventarlos.
- **Cómo se construye:** Ampliar el paso a paso de guiaDe (lib/guia_proceso.js) y las tareas de lib/seguimiento.js con preguntas el día del cierre: póliza con número, valor no menor que plata.garantia_seriedad y vigencia; socios en «Aceptado»; firmante. Todo dentro de op=seguimiento de api/perfil.js, sin op nueva. La frase de la cuenta plural reutiliza la de «Frases del consorcio por modalidad» de la hoja de ruta. No se construyen el aviso de adenda tras «oferta enviada» (descartado), la página de indisponibilidades ni la plantilla de correo «manifiesto mi intención de participar».
- **Riesgo de cifra falsa:** Bajo en el cotejo de la póliza, porque compara lo que el usuario escribe con lo leído del pliego y, si el pliego no se leyó, dice «compare con el pliego». Alto en el resto: un cronograma recalculado con «días hábiles de la entidad» inventados, o una plantilla de contingencia sin norma citada, serían procedimientos falsos creíbles, y la regla dura prohíbe inventar una norma. Un aviso de adenda llegaría tarde: en mínima cuantía 4 de cada 5 después del cierre, según lo medido.
- **Primer paso:** Primera sesión: leer MEMORIA § «La garantía de seriedad es la que fija cada pliego…» (sed -n '17406,17449p') y § «El paso a paso salía desordenado…» (sed -n '13635,13669p'); en lib/seguimiento.js añadir al documento del expediente (normalizarDocumentos :235) los campos opcionales `numero`, `valor_cop` y `vigencia_hasta` para la clave `garantia_seriedad`, y en lib/guia_proceso.js, junto a la casilla :751, una comparación pura que devuelva «menor que lo exigido» solo cuando plata.garantia_seriedad != null y valor_cop < esa cifra, y «compare con el pliego» cuando la cifra sea null; prueba en tests/e2e.js que falle si una póliza por debajo de lo exigido sale «cumple» o si la ausencia de cifra leída sale como cumplimiento.

#### P-29 · Subsanación: qué se arregla, hasta cuándo y qué contestar

- **Qué hace:** Para cada requisito del pliego dice si es un hecho que debía existir al cierre o una prueba que se puede completar, y qué no se subsana (garantía de seriedad, lo que da puntaje, oferta económica). Al publicarse el informe, calcula el último día del traslado en días hábiles, avisa ese día para revisar las observaciones de otros, y ante un «no habilitado» redacta la observación con la regla aplicable (UNSPSC, firmeza del RUP, autorización de junta), además de una lista para revisar pólizas y firmantes de los competidores.
- **Problemas que resuelve:** EVA-01, EVA-02, EVA-03, EVA-04, EVA-06, EVA-07, EVA-15, PRE-03
- **Cambio desde el 2-oct:** Nada que cierre la propuesta. En lib/guia_proceso.js, lib/cronograma.js y lib/handlers/pliego/cronograma.js entraron dfb3601 («El dictamen, el cronograma y los descuentos leen el documento que es el pliego»), 5d83c40 («un ejemplo entre corchetes no es un hito del cronograma»), f1676da/10c98b5/1faf73c (texto del pliego: versiones) y dd9efaf (clasificador «DocBase_…»): mejoran DE QUÉ texto salen los hitos y cuál versión manda, pero el paso del traslado sigue sin fecha (ahora en guia_proceso.js:824, antes :811) y la decisión «ninguna casilla promete se puede subsanar» sigue en :1090 (antes :1075). Ninguna sección de MEMORIA escrita desde el 2-oct (líneas 19284-19773) menciona traslado ni subsanación (grep de hoy: 0 líneas). Nuevo pendiente abierto que toca el aviso al publicarse el informe: la hora T19:00 de fecha_carga de dmgg-8hin.
- **Motivo del veredicto (19-oct):** Se mantiene. El reloj del traslado existe sin fecha; el hito `traslado` ya se lee del pliego y ya tiene avisos en op=cronograma, pero no cruza a la guía ni a las alertas: cerrar ese cruce es barato y es un dato PUBLICADO (del cronograma del pliego), no un calculado. La subsanabilidad por requisito sigue prohibida por decisión escrita y sin fuente por página; el borrador de observación ya cayó (N18); el aviso al publicarse el informe sigue sin viabilidad medida.
- **Cómo se construye:** Solo lo viable: en lib/guia_proceso.js darle FECHA al paso del traslado (linea 811) cuando lib/cronograma.js trae el hito 'traslado', con lib/habiles.js, y que lib/handlers/perfil/avisos.js lo recuerde ese dia. Sin op nueva (sale por la guia que ya sirven los routers perfil/pliego). La marca subsanable/no subsanable por requisito es R-08, pendiente; el borrador de observacion contra competidores es N18, caido.
- **Riesgo de cifra falsa:** Alto en la parte de subsanabilidad: decir 'esto se subsana' sin pagina es lo que la decision de guia_proceso.js:1075 prohibe; la propia propuesta simplifica mal ('garantia de seriedad no se subsana': la ley hace insubsanable NO ENTREGARLA con la oferta, no sus errores). Un 'se puede corregir' falso hace perder la oferta. El borrador de observacion saldria en ~85 % de las obras (medido en N18). El paso fechado no tiene riesgo si dice que es la fecha del cronograma del pliego y que la adenda manda.
- **Primer paso:** Sesión 1: en lib/handlers/pliego/cronograma.js (línea ~168, donde ya persiste la manifestación) guardar también la fecha del hito id="traslado" si extraerHitos la trae; en lib/handlers/perfil/seguimiento.js:310/313 pasarla como fechaTrasladoCronograma; en lib/guia_proceso.js:824 usar esa fecha como `cuando` del paso y decir «fecha del cronograma del pliego». Prueba en tests/e2e.js: con un texto de pliego que diga «Traslado del informe de evaluación: 3 de noviembre de 2026», la guía del proceso debe devolver el paso con cuando="2026-11-03" y las alertas un aviso T-1 el 2026-11-02; sin ese texto, cuando=null (no se inventa). No decide plata: no necesita mutación, pero la prueba debe ejecutar guiaDe real.

#### P-31 · Chequeo de inhabilidades, multas y antecedentes de socios

- **Qué hace:** Antes de armar un consorcio u ofertar, cruza el NIT del usuario y de cada integrante con multas y cláusulas penales del último año (descuento de puntaje del art. 58), caducidades, obras inconclusas, boletín de responsables fiscales, listas de inhabilitados del Banco Mundial y el BID, financiadores de campañas en la jurisdicción y, para el interventor, contratos de obra vigentes con la misma entidad. Cada hallazgo con su norma y fuente.
- **Problemas que resuelve:** PRE-19, DET-24, EVA-16, EVA-17, TRA-08, EJE-24, TRA-25, EJE-16, EJE-18
- **Cambio desde el 2-oct:** Nada. git log --since=2026-10-02 -- lib/socio.js lib/handlers/perfil/consorcio.js lib/handlers/inteligencia/detalle.js lib/contratos_en_ejecucion.js: solo b73c38e (entrada con correo y contraseña; no toca la consulta). El pendiente «hermanos vivos de los contratos en consorcio» sigue ABIERTO en node tests/estado.js de hoy. Ninguna sección de MEMORIA desde el 2-oct menciona verificarSocio ni lib/socio.
- **Motivo del veredicto (19-oct):** Se mantiene sin cambios: el chequeo existe con el principio correcto, el hueco de consorcios sigue abierto como pendiente y ahora hay una función hermana (consultarContratosEnEjecucion) que ya resolvió la misma consulta por ceth-n4bn, así que es «llamarla, no reescribirla». La parte sin dataset sigue sin dataset. Mostrar sanciones de terceros a clientes de pago sigue frenado por F1-4.
- **Cómo se construye:** Mejora dentro de lo que existe: (1) cerrar el pendiente hermano: que lib/socio.js entre por ceth-n4bn como ya hace lib/contratos_en_ejecucion.js (llamar su consulta, no reescribirla); (2) correr verificarSocio por cada integrante desde el simulador de consorcio (op consorcio-simular, lib/handlers/perfil/consorcio.js) y mostrar el resultado con sus fuentes. Sin op nueva. Las fuentes sin dataset quedan en el checklist manual con su enlace.
- **Riesgo de cifra falsa:** Medio: homonimos y bases incompletas; el modulo ya dice 'no es limpio'. El 'descuento de puntaje del art. 58' de la propuesta no se verifico y no debe citarse sin la norma vigente. Mostrar historial sancionatorio de terceros a clientes de pago esta bloqueado por PLAN_DE_ACCION F1-4 hasta concepto de abogado.
- **Primer paso:** Sesión 1: en lib/socio.js:275 consultarContratos, antes de la consulta por documento_proveedor, llamar a la consulta de grupos exportada de lib/contratos_en_ejecucion.js (consultarContratosEnEjecucion o su paso de ceth-n4bn, nitSinDv :89) y fusionar los contratos de los grupos con origen "consorcio"; añadir en tests/e2e.js un caso con fetch simulado donde el NIT solo aparece en ceth-n4bn y jbjy por codigo_grupo: verificarSocio debe devolver esos contratos y no «sin contratos en SECOP II»; cerrar el marcador del pendiente en MEMORIA con «> RESUELTO» y regenerar con node tests/mapa.js --escribir. No decide plata: sin mutación, pero la prueba ejecuta verificarSocio real.

#### P-33 · Validador de experiencia y reglas del consorcio

- **Qué hace:** El usuario carga sus contratos del RUP y la app marca, según la matriz del documento tipo vigente a la fecha del aviso, cuáles no valen (actividad excluida, anteriores a la norma, tope de contratos), si alcanza el porcentaje y cómo se hereda en consorcio o unión temporal (valor por participación, reglas 50 %/5 %/10 %).
- **Problemas que resuelve:** PRE-11, PRE-10, FIR-18
- **Cambio desde el 2-oct:** Un solo cambio en los módulos que toca: 1d8468b «Códigos de la experiencia: la fila partida de la tabla Segmento/Familia/Clase» (lib/codigos_experiencia.js: lee mejor la tabla de códigos del pliego; no añade salida por contrato). lib/reparto.js, lib/tabla_experiencia.js y lib/config_rup.js sin cambios de fondo (solo b73c38e, auth). El pendiente «las cláusulas que dependen de quién aporta la experiencia no descartan repartos en la ficha» sigue ABIERTO hoy. Ninguna sección de MEMORIA desde el 2-oct menciona reglaExperiencia, mayoresConExacta ni «por contrato».
- **Motivo del veredicto (19-oct):** Se mantiene. Lo grueso ya existe y no cambió; la fila partida de 1d8468b hace más fiable la entrada de códigos, lo que refuerza mostrar lo que la app ya calcula en vez de construir otra regla. Un «no cuenta» por contrato puede hacer descartar un proceso (falso negativo caro en oportunidades): va en ámbar, con cita, con plan y mutación.
- **Cómo se construye:** Sin op nueva: añadir al resultado de reparto.reglaExperiencia/experienciaSola una lista por contrato (cuenta / no cuenta por código / queda fuera del tope de siete), y pintarla en la casilla de experiencia de Mis procesos (guía del proceso, lib/guia_proceso.js) y en /api/perfil?op=consorcio-simular. Reutiliza mayoresConExacta, huellaCodigos y tabla_experiencia; no reescribir la regla.
- **Riesgo de cifra falsa:** Medio-alto en la parte de la matriz por versión: una regla transcrita mal declara «no vale» un contrato que sí valía y hace descartar un proceso (en oportunidades el falso negativo es el caro). El propio módulo de códigos solo puede NEGAR (cota superior); un «sí vale» por contrato sería un calculado presentado como hecho. Cualquier «no vale» tendría que ir en ámbar con la cita del pliego.
- **Primer paso:** Sesión 1: plan en pocas líneas al dueño (qué cambia: salida `por_contrato` de reglaExperiencia; qué cifra se mueve: ninguna agregada, solo se destapa el detalle; cómo se prueba). Con su visto bueno: lib/reparto.js:197 mayoresConExacta devuelve [{i, valor, cuenta, motivo}] y :230 reglaExperiencia lo expone; prueba por mutación en tests/e2e.js: con un índice de dos perfiles y códigos del pliego, el contrato sin ningún código debe salir cuenta=false con motivo «ningún código del pliego»; mutar `casa` para que siempre devuelva true debe tumbar la prueba; y el agregado (`caso`, `estado`) debe quedar byte a byte igual que antes del cambio.

#### P-34 · Mipyme: limitación a tiempo, documentos y desempate

- **Qué hace:** Lee si el proceso quedó limitado (acta de cierre de solicitudes, aviso, resolución) y avisa al contratista grande. Al usuario Mipyme le avisa, desde el PAA o el proyecto de pliego, la fecha límite para pedir la limitación (un día hábil antes de la apertura) con borrador de solicitud; compara con una tabla fechada del umbral; revisa vigencia de certificados (30 y 60 días), porcentajes del consorcio, limitación territorial frente al domicilio de cada socio, y las reglas de desempate vigentes (Ley 2069 con cambios de 2025).
- **Problemas que resuelve:** DET-16, DET-17, DET-18, PLA-20, PRE-22, EVA-19, EVA-20
- **Cambio desde el 2-oct:** Nada en lo que toca: git log --since=2026-10-02 -- lib/socio_por_proceso.js lib/perfiles.js lib/paa.js lib/portada.js lib/garantia_seriedad.js → 0 commits. lib/documentos_proceso.js sí cambió (dd9efaf «DocBase_…», 5d83c40, dfb3601) pero RE_TIPO sigue sin tipo «limitacion» y no hay detector de la cláusula. Ninguna sección de MEMORIA desde el 2-oct menciona mipyme, «limitada a» ni desempate. Nuevo pendiente abierto afín: «los otros nombres nuevos de Colombia Compra siguen sin reconocerse» (clasificador de documentos).
- **Motivo del veredicto (19-oct):** Se mantiene íntegro: nada cambió en los módulos y el núcleo (¿quedó limitada? y con qué socia) sigue siendo N25 con sus reglas de seguridad («Probablemente limitada» deducido nunca en pantalla; sin documento la tarjeta calla). Un «limitada» falso esconde un proceso abierto (falso negativo caro en oportunidades), así que solo con cláusula leída y página. Desempate y umbral por año siguen sin fuente en el árbol.
- **Cómo se construye:** Etapa 1 (Mis procesos): el lector de documentos (lib/documentos_proceso.js) busca la cláusula de decisión de limitación con su página y alimenta avisoMipyme; se sirve en la guía del proceso, sin op nueva. Etapa 2 (tarjeta): índice incremental de nombres de archivo de dmgg-8hin dentro de las tandas del sync (/api/procesos?op=sync), plegado ahí. Desempate y borrador de solicitud: texto en la guía del proceso, no op nueva. Vigencias de certificados: ya existen en el expediente.
- **Riesgo de cifra falsa:** Alto si se deduce: un «limitada» por nombre de archivo o por modalidad hace descartar o desalentar procesos abiertos (falso negativo caro en oportunidades). Medido aquí: el filtro por nombre trae formatos de acreditación junto a constancias. La investigación ya fijó que «Probablemente limitada» deducido de la modalidad no sale nunca, y que sin documento la tarjeta calla. La fecha límite «un día hábil antes de la apertura» calculada desde el PAA es un calculado sobre un plan que no es compromiso: ruido o falsa urgencia.
- **Primer paso:** Sesión 1: plan al dueño (qué cambia: avisoMipyme con cláusula citada; qué cifra se mueve: ninguna, cambia un aviso de ámbar a hecho con página). Con su visto bueno: añadir en lib/dictamen_reglas.js un detector «limitacion_mipyme» (afirma/niega/mención, como el anticipo en :33 y niegaAnticipo), guardarlo en lib/documentos_proceso.js junto a `detecciones` (~:366) y leerlo en lib/socio_por_proceso.js avisoMipyme; prueba por mutación en tests/e2e.js con tres textos (limita con página, «no se limitará», solo el formato de acreditación): solo el primero produce «limitada, pág. N», y un detector mutado que afirme con el tercero debe tumbar la prueba; node tests/apu_bench.js no aplica, pero sí medir el detector contra los 232 índices guardados antes de fusionar.

#### P-35 · Revisión de minuta, matriz de riesgos y cláusulas observables

- **Qué hace:** El dictamen lee también la minuta y la matriz: riesgos asignados 100 % al contratista sin cuantificar (fuentes de materiales, geológicos, diseños), matrices copiadas o mal sumadas, retención hasta la liquidación, plazo de liquidación propio, cláusula compromisoria, falta de reajuste, «anticipo» que llega como «pago anticipado» con otro porcentaje, forma de pago global, y sanciones o descuentos de puntaje sin ley (con el plazo para observar o demandar). Todo para observarlo en la audiencia de riesgos.
- **Problemas que resuelve:** PRE-13, PLA-14, LIQ-12, FIR-11, PRE-24, DET-04, PLA-22
- **Cambio desde el 2-oct:** Mucho en la ENTRADA del dictamen, nada en lo que la propuesta pide. 18-oct (dfb3601, f1676da, 10c98b5, 5d83c40, dd9efaf): `textoGuardado` (lib/handlers/pliego/cronograma.js:52) ya devuelve el documento que ES el pliego —documento base incluido— en vez de la última versión del vigía: 85 de 228 licitaciones de obra ganan texto para el dictamen (medido en la memoria, sed -n '19324,19389p'); el clasificador lee los nombres nuevos «DocBase_…». Anticipo/pago anticipado recibió 6 commits más (f7687da, 86907ff, 14efa2f, 9e9c799, 2018cd2, a807e8f): N30 sigue cubriendo esa parte, no duplicar. Lo que NO cambió: el dictamen sigue leyendo SOLO `textoGuardado` (lib/handlers/pliego/dictamen.js:162 → D.armarEntrada con un único `texto`, lib/dictamen.js:479); `matriz_riesgos` sigue en orden 9 (lib/documentos_proceso.js:171) y la minuta sigue cayendo en «formato» (:217); y la regla nueva RE_NO_ES_VERSION (:480) excluye EXPRESAMENTE minuta y matriz del texto del pliego, así que hoy jamás llegan al dictamen por esa vía. Se abrió un pendiente nuevo el 18-oct: los nombres «M3_Riesgos_…» de Colombia Compra no se reconocen. El veredicto se mantiene.
- **Motivo del veredicto (19-oct):** El dictamen sigue siendo el sitio (verificación de citas, lista de no encontrado) y desde el 18-oct recibe el texto correcto del pliego, lo que hace más fiable añadirle la matriz. Pero la matriz y la minuta siguen fuera de su entrada, y la regla nueva del 18-oct las aparta a propósito del texto del pliego: hay que meterlas como texto aparte, no como versión. Anticipo y forma de pago ya están en N30 (6 commits más desde el 2-oct). Lo jurídico (sin ley, plazo para demandar) sigue fuera por la regla de no inventar norma.
- **Cómo se construye:** Sin op nueva: ampliar /api/pliego?op=dictamen para que su entrada incluya el texto de matriz_riesgos y de la minuta (vía documentos_proceso) y añadir categorías de riesgo a las instrucciones de lib/dictamen.js (riesgo 100 % al contratista sin cuantificar, retención hasta la liquidación, falta de reajuste, cláusula compromisoria, anticipo frente a pago anticipado). La verificación cita por cita ya existe y se reutiliza; «no se encontró» ya tiene su lista.
- **Riesgo de cifra falsa:** Bajo en las alertas citadas (cada una va con cita verificada en la página). Alto en lo que propone añadir: «sanciones o descuentos de puntaje sin ley» y «el plazo para observar o demandar» exigen un juicio jurídico y una fecha legal que el modelo podría inventar (regla dura: nunca inventar una norma ni confundir un techo legal con un plazo). Esa parte va fuera o como pregunta sin fecha.
- **Primer paso:** Sesión 1: en lib/documentos_proceso.js añadir el patrón «M3_Riesgos» a la fila `matriz_riesgos` (:206) y correr el plan de lectura sobre los 232 índices reales de dmgg-8hin guardados (la misma muestra del 18-oct) para contar cuántos procesos tienen `matriz_riesgos` con texto legible; prueba en tests/e2e.js, bloque «unidad DICTAMEN DEL PLIEGO» (L45543) ampliado: `clasificarArchivo("M3_Riesgos_….pdf")` → `matriz_riesgos`, y una aserción que ejecuta `armarEntrada` con un segundo texto y comprueba que una cita de la matriz se verifica en su página con la función real (no por regex). Sin mutación obligatoria: no decide plata.

#### P-37 · Interventoría y consultoría: costeo y reglas del concurso

- **Qué hace:** Cotizador por factor multiplicador desde sus componentes legales (prestaciones, seguridad social, parafiscales, pólizas hasta el fin de la estabilidad, impuestos locales) comparado con el presupuesto y el equipo mínimo exigido; marca alcances que se salen de la interventoría y pagos atados al avance de obra con el capital que inmovilizan. Muestra la modalidad real según cuantía (mínima cuantía al menor precio o concurso sin precio), simula el puntaje de experiencia y dice qué entidades compran estos servicios.
- **Problemas que resuelve:** PRE-18, PLA-13, FIR-06, DET-13, EVA-23, EJE-15
- **Cambio desde el 2-oct:** Premisa del 2-oct FALSA: el «primer paso» (corregir la contribución del 5 % que el pisoTecho de `b_max` cobraba a interventorías) ya estaba resuelto el 26-sep-2026 (PR #181, e4b4d38: `contribucionPctDe` en lib/baja_maxima.js:86 llama a `aplicaContribucion(tipoTrabajoDe(l))`). Reproducido HOY con la función real: interventoría → 0, obra → 5. El comentario de lib/ganancia.js:80-87 («ahí la contribución sigue cobrándose SIEMPRE … el piso sale ~5 puntos alto») está DESACTUALIZADO y fue lo que engañó al veredicto del 2-oct. Desde el 2-oct los módulos solo recibieron merges, la alerta de precio bajo por modalidad (de9eec5, 18-oct) y el techo de Precios (b65568f): nada de factor multiplicador ni comparador de equipo. El veredicto se mantiene en mejorar_existente pero con el alcance recortado: ya no hay cifra de p_ganar que arreglar; queda el comparador de equipo con cifras del propio usuario.
- **Motivo del veredicto (19-oct):** Las reglas del concurso existen y la corrección de la contribución que el 2-oct dio por pendiente ya estaba hecha (reproducido hoy): el valor medible de «~5 puntos en el piso» que sostenía la propuesta se desvanece. Queda el comparador equipo-contra-presupuesto, que sí es nuevo y útil para el interventor, pero solo con cifras del propio usuario: el cotizador automático por factor multiplicador se descarta porque daría un «cubre/no cubre» con componentes inventados, y en precios el falso positivo es el caro.
- **Cómo se construye:** No hace falta una op nueva. Primero, corregir la contribución del pisoTecho (lib/baja_maxima.js con contribucionPctDe, llamado desde lib/handlers/procesos/listar.js) para interventoría y consultoría, que es un pendiente ya anotado. Después, si el dueño lo aprueba, un comparador 'equipo exigido × costo que USTED pone vs. presupuesto' en el dictamen (api/pliego.js op=dictamen) con los componentes legales que ya existen en el editor de APU (api/apu.js), sin tarifas de pólizas ni ICA inventadas. La modalidad según la cuantía ya la da lib/guia_proceso.
- **Riesgo de cifra falsa:** Alto. Un factor multiplicador armado con pólizas, ICA y salarios supuestos daría una cifra creíble de 'cubre/no cubre el equipo', y en precios el error caro es el falso positivo. Cada componente sin fuente tiene que ir como null o pedírsele al usuario, con su fecha.
- **Primer paso:** Sesión 1 (mecánica): en lib/ganancia.js:80-87 sustituir el párrafo obsoleto por una línea que diga que `lib/baja_maxima.contribucionPctDe` ya mira el tipo de trabajo desde el 26-sep-2026; en tests/e2e.js (bloque que ya ejercita `pisoTechoDeBorrador`, grep -l contribucionPctDe → tests/e2e.js) añadir la aserción que ejecuta `pisoTechoDeBorrador(filaInterventoria, costos)` y exige `contribucion_pct === 0` y, para obra, `=== 5`; mutación: cambiar `aplicaContribucion(...) ? CONTRIBUCION_PCT : 0` por `CONTRIBUCION_PCT` debe hacer caer la prueba. Después, el plan en pocas líneas del comparador para visto bueno del dueño.

#### P-38 · Vigía del interventor durante la obra

- **Qué hace:** Cruza cada prórroga o suspensión de la obra vigilada (SECOP II) con el plazo de la interventoría y avisa «su contrato vence el X; la obra se prorrogó hasta Y; pida la prórroga y el ajuste de valor por escrito». Lleva un registro fechado de requerimientos, avisos de incumplimiento e informes con constancia de recibo, exportable para la Contraloría o un juez, y recuerda guardar copia antes del recibo final.
- **Problemas que resuelve:** EJE-15, EJE-16, LIQ-22, FIR-06, EJE-17, TRA-16
- **Cambio desde el 2-oct:** Nada que afecte la propuesta. lib/contratos_en_ejecucion.js no cambió desde el 2-oct (git log --since: solo d92e03c tachado de llaves en los routers y b73c38e inicio de sesión); api/perfil.js sigue con las ops resumen · diagnostico · entrada · pulso · consorcio · consorcio-simular · seguimiento · cuenta · avisos · empresa-datos (node tests/estado.js). Sigue sin existir enlace entre una interventoría y la obra que vigila ni registro de requerimientos. Los dos pendientes relacionados siguen abiertos. El veredicto se mantiene.
- **Motivo del veredicto (19-oct):** La lectura de prórrogas y suspensiones de SECOP II está hecha y probada para los contratos propios y no se tocó desde el 2-oct; extenderla a la obra vigilada cuesta poco si el usuario dice cuál es (SECOP no publica ese enlace). El falso caro aquí es el negativo: una prórroga no publicada; el aviso lleva la fecha de lo publicado. El registro de requerimientos sigue fuera del foco de Detekta.
- **Cómo se construye:** Reutilizar lib/contratos_en_ejecucion (la lectura de u8cx-r425 y la regla de la última modificación) con un enlace MANUAL: el usuario pega el id del contrato de obra que vigila al lado de su contrato de interventoría. Se plegaría en api/perfil.js (op=seguimiento, lib/handlers/perfil/seguimiento.js, o op=avisos) y el aviso saldría por las alertas y el correo existentes. El registro fechado de requerimientos exportable para la Contraloría queda fuera: es gestión documental y defensa jurídica, no decisión de licitación.
- **Riesgo de cifra falsa:** Bajo en dinero, porque no calcula un precio. El riesgo es el falso negativo: una prórroga que no se publicó o se publicó tarde, ya observado con la Universidad Pedagógica. El aviso tiene que decir 'según lo publicado al dd-mmm' y nunca 'sin prórrogas'.
- **Primer paso:** Sesión 1: en lib/handlers/perfil/seguimiento.js, junto a la consulta de :520, aceptar `contrato_vigilado` (id CO1.PCCNTR) guardado en el perfil, llamar a la lectura de modificaciones de lib/contratos_en_ejecucion.js con ese id (hoy `consultarContratosEnEjecucion` :297 filtra por NIT: extraer la consulta de u8cx-r425 por id de contrato como función exportada, sin duplicar `ultimaModificacion` :194) y devolver `{ fin_obra_publicado, fecha_aprobacion, fin_interventoria, aviso }`; prueba en tests/e2e.js, bloque «unidad contratos en consorcio» o uno nuevo junto a él: con filas simuladas de u8cx-r425 (prórroga al 25-oct) y contrato de interventoría que vence el 25-sep, el aviso dice ambas fechas y «según lo publicado al …»; sin filas, dice «no consta», nunca «sin prórrogas».

#### P-39 · Piso de lance para subasta inversa

- **Qué hace:** Con el costo por ítem del APU y las deducciones de la entidad, calcula el lance que deja utilidad cero, el que deja la utilidad mínima del usuario y el que cruza el 20 % bajo el presupuesto; revisa que la oferta inicial pueda quedar como final si nadie puja y la lista de subsanar antes del evento.
- **Problemas que resuelve:** EVA-21, EVA-08, EVA-09
- **Cambio desde el 2-oct:** Un cambio que toca la propuesta sin resolverla: el 18-oct (de9eec5, decisión del dueño) lib/apu/piso_techo.js ganó `umbralTemerario` por modalidad (88 % en licitación y menor cuantía, 70 % en mínima, 80 % de referencia general donde no hay medición). Es el gemelo MEDIDO del «20 % bajo el presupuesto» de la propuesta, pero para subasta no hay medición: cae en «Sin medición para esta modalidad: se usa la referencia general» (:90). El resto sigue igual: lib/guia_proceso.js:296-298 pide «Prepare su precio piso ANTES de entrar» sin enseñarlo; `pisoTechoDeBorrador` se usa en la lista solo para `ordenar_por=margen` (listar.js:832-834) y la ganancia con credencial (:893-895), sin nada específico de subasta; la exclusión de «Subasta de prueba» sigue esperando visto bueno (docs/INVESTIGACION_LICITANTE.md § «Dónde discrepan las tres miradas») y lib/filtros_lista.js:143 clasifica cualquier «subasta» como subasta. El pendiente de la TRM que citó el 2-oct ya no existe con ese texto (superado el 30-sep). El veredicto se mantiene.
- **Motivo del veredicto (19-oct):** El piso desde el APU existe (baja_maxima/piso_techo), la guía ya pide prepararlo y desde el 18-oct hay un corte por modalidad medido que sustituye al «20 %» sin fuente, aunque para subasta siga sin medición. Falta solo enseñar el piso en ese momento, sin calcular uno nuevo. Valor bajo: la subasta inversa es de bienes y servicios uniformes y el corpus de Detekta es de obra; y 75 «Subasta de prueba» con precio_base 0 siguen dentro a la espera del visto bueno.
- **Cómo se construye:** No hace falta una op nueva. En la guía de subasta (lib/guia_proceso), enseñar el piso que ya calcula lib/baja_maxima.pisoTechoDeBorrador cuando hay un borrador de APU, con sus componentes (costo directo, AIU, deducciones), y el piso con la utilidad mínima del propio usuario. Sale por api/procesos.js (op de listar o portada) o por la ficha en api/apu.js. El umbral del 20 % bajo el presupuesto NO se pone sin fuente normativa citada.
- **Riesgo de cifra falsa:** Alto si el APU está mal cargado: el piso sería falso y, en precios, el error caro es el falso positivo. Mitigación: sin borrador de APU completo no se muestra piso. El '20 %' no tiene norma citada en la propuesta: sin fuente va null.
- **Primer paso:** Sesión 1: plan de pocas líneas para el dueño (qué cifra se enseña, de dónde sale, qué no se muestra). Con visto bueno: en lib/guia_proceso.js, en la rama `subasta` (:296-298), añadir al objeto el piso que ya calcula `pisoTechoDeBorrador` (pasado por quien llama, listar.js:685) con `cifras.piso_rentable`, sus componentes y `umbralTemerario("subasta").fuente`; prueba en tests/e2e.js junto al bloque «unidad alerta de precio bajo por modalidad» (L4436) que EJECUTA `pisoTechoDeBorrador` con una fila de subasta: con borrador y costo → piso igual al del panel; sin borrador → null (nunca 0); mutación: sustituir `piso_rentable` por `techo_competitivo` o poner `|| 0` debe hacer caer la prueba.

#### P-41 · Temporada de contratación y ley de garantías

- **Qué hace:** Por entidad, muestra en qué meses publica y adjudica obra según el histórico y avisa la avalancha antes y después de la ley de garantías y de fin de año, con cuánta capacidad residual y caja le quedan libres al usuario para esas semanas.
- **Problemas que resuelve:** DET-23, TRA-09, PLA-23
- **Cambio desde el 2-oct:** Nada en los módulos que toca: git log --oneline --since=2026-10-02 -- lib/indice_competencia.js, lib/columnas_historicas.js, lib/paa.js y lib/competencia_detalle.js devuelve 0 commits; lib/handlers/inteligencia/detalle.js solo recibió b73c38e (entrada con correo y contraseña) y d92e03c (tachado de llaves en errores), que no cambian la vista de entidad. lib/dictamen.js recibió 15943ca (tope de lecturas), sin tocar NOTA_GARANTIAS ni CONTEXTO_PUBLICO. Lo único nuevo HOY frente a la verificación anterior es un hallazgo de lectura, no un commit: el índice publicado YA guarda por entidad el mapa `dias` (día de cierre → [procesos, suma de oferentes], lib/indice_competencia.js:619-622 y :1391), así que el histograma por mes del año sale de lo publicado sin recorrer el corpus ni reconstruir el índice; el veredicto anterior proponía calcularlo al construir el índice, que es más caro y toca una pieza que publica cifras de competencia.
- **Motivo del veredicto (19-oct):** Se mantiene el veredicto del 2-oct, con un camino más barato: nada cambió en los módulos desde entonces, pero el índice publicado ya trae por entidad los días de cierre con su conteo (lib/indice_competencia.js:1391), así que el histograma por mes del año es una derivación de lo publicado en la vista de entidad, no una pieza nueva del índice. Lo que decide el usuario (a qué se presenta) no se mueve con esta cifra: es un hecho contado con su n. El aviso de avalancha por ley de garantías sigue siendo falso para licitación de obra (lib/dictamen.js:262) y la caja libre sigue sin fuente: ambas partes se quitan.
- **Cómo se construye:** Conteo de procesos publicados y adjudicados por mes del año para la entidad, calculado al construir el índice (lib/indice_competencia.js o lib/columnas_historicas.js, que ya arma columnas por año) y servido en el detalle de la entidad (api/inteligencia.js, op de detalle -> lib/handlers/inteligencia/detalle.js), pintado como columnas plegadas junto a las anuales. Reutiliza claveCanonica y el corpus por mes. Sin op nueva ni archivo nuevo. Se dejan fuera la 'caja libre' (supuesto) y el aviso de 'avalancha por ley de garantías' para obra competitiva (la norma no la restringe y el efecto ya está MEDIDO en medirPeriodos).
- **Riesgo de cifra falsa:** Medio en dos partes: (1) 'avalancha antes de la ley de garantías' es falso para licitación de obra (lib/dictamen.js:262) y pintarla induce a reservar capacidad para un pico que la norma no crea; (2) 'caja libre para esas semanas' sería un supuesto sin fuente presentado como cifra. El histograma de meses, mostrado como conteo con su n y sin predicción, es bajo riesgo.
- **Primer paso:** Primera sesión: leer con sed la sección «Lote «B9a-entidad-graficos»…» (sed -n '9489,9624p' docs/MEMORIA.md) y la de «Competencia histórica por entidad» (sed -n '340,417p'); en lib/competencia_detalle.js añadir `cierresPorMes(dias)` (puro: mapa de días → {meses: [12 cubetas con n], anios_cubiertos, n_total} o null si `dias` es null/vacío) y publicarlo en el cuerpo de detalleEntidad (:303 en adelante, junto a reparto_por_anio :608); en public/app.js pintarlo plegado bajo las columnas por año con el rótulo «Meses en que esta entidad cierra procesos (n = …)». Prueba en tests/e2e.js (bloque de la vista de entidad): un `publicado` con `dias` conocidos (p. ej. 3 cierres en marzo de 2025 y 2026, 1 en noviembre) da cubetas [0,0,3,…,1,0] con n_total 4 y anios_cubiertos [2025,2026]; `dias: null` → `cierres_por_mes: null` (nunca doce ceros); la prueba debe fallar contra el árbol anterior (el campo no existe). Navegador real para public/ (regla de CLAUDE.md). Suite 4/4 antes de commitear.

#### P-43 · Hoja de vida propia y registro de decisiones de ofertar

- **Qué hace:** La app arma el historial de contratos del usuario desde SECOP (valor, plazo, prórrogas, multas, liquidación) y le muestra cómo lo ve un evaluador; además registra cada decisión de ofertar o no y su resultado (ganó, perdió, posición, margen) para mostrarle con el tiempo su propia tasa de éxito por modalidad, entidad y tamaño.
- **Problemas que resuelve:** TRA-24, EVA-16, DET-09, DET-11
- **Cambio desde el 2-oct:** Nada en los módulos que toca: git log --oneline --since=2026-10-02 -- lib/socio.js y lib/seguimiento.js devuelve 0 commits; api/perfil.js y lib/handlers/perfil/ solo recibieron b73c38e (entrada con correo), d92e03c (tachado de llaves), 4179798 (Precios solo=tope) y un merge; ninguno añade op ni historial. El commit 930ebb8 del 18-oct («el pendiente del sorteo en mínima cuantía y del consorcio ya estaba resuelto») cerró el pendiente de los INDICADORES del consorcio (N21), no el N23-D de los contratos en consorcio: ese sigue abierto en node tests/estado.js. D-47 (tanda 10) y D-48 (tanda 11) siguen con «Cierre: —» en docs/PLAN_REFORMA_DATOS.md § «Tanda 9 · El calendario de la oferta»-1266, y R-07 sigue en docs/INVESTIGACION_MERCADO_LICITADOR.md § «5.2 Después (1 a 3 meses · unas 15 a 17 sesiones, más el arranque del cobro)» sin ejecutar. Hallazgo de lectura que el veredicto del 2-oct no tenía en cuenta: lib/contratos_en_ejecucion.js (del 27-sep, anterior al 2-oct) YA resuelve los contratos en consorcio del perfil por ceth-n4bn `nit_participante` (:306) y luego jbjy-vk9h por `codigo_proveedor`/`documento_proveedor` (:316-317) con participación (participacionDe), pero solo para estados vigentes y sin iniciar (:317, :245-246). Es la base correcta del historial propio, no lib/socio.js (que sigue solo por documento_proveedor, :282).
- **Motivo del veredicto (19-oct):** Se mantiene el veredicto del 2-oct: el registro de decisiones con desenlace, valor ofertado y puesto ya existe y ya enseña «Ganó g de N»; lo que falta (historial propio en SECOP, tasa por entidad y con quién) sigue planeado como R-07, D-47 y D-48 y ninguno entró en main desde el 2-oct. Cambia el camino: el historial propio no se construye sobre lib/socio.js (solo por documento_proveedor, defecto N23-D abierto) sino sobre lib/contratos_en_ejecucion.js, que ya resuelve los contratos en consorcio del perfil por ceth-n4bn y solo necesita ampliar los estados. Así el historial no sale corto para quien gana en consorcio, que era el riesgo principal señalado el 2-oct. No decide dinero: es un conteo con su n; una tasa sobre 2 o 3 casos sigue prohibida.
- **Cómo se construye:** Ejecutar lo ya planeado en vez de una propuesta nueva: R-07 como op nueva en api/perfil.js (nombre sugerido op=trayectoria, que no se parezca a op=historico) que llama lo que ya hay en lib/socio.js para el NIT del perfil, más hgi6-6wh3 y ceth-n4bn; D-47 (su historial con esta entidad, agrupado por claveCanonica, tanda 10) y D-48 (con quién ha ganado, tanda 11) sobre lib/seguimiento.js y el resumen de Mis procesos. Corte por modalidad o tamaño solo con el n a la vista y el mínimo de tres que ya usa public/app.js:5208.
- **Riesgo de cifra falsa:** Medio: (1) sin N23-D, a quien gana en consorcio le diría «sin contratos» o menos de los que tiene; (2) «cómo lo ve un evaluador» es engañoso: el evaluador mira la experiencia inscrita en el RUP, no la lista de SECOP; (3) una tasa por modalidad sobre 2 o 3 casos parece medida. Un desenlace sin marcar no puede contar como derrota (regla de D-47).
- **Primer paso:** Primera sesión: leer sed -n '17885,17963p' docs/MEMORIA.md («Las cinco cosas falsas…», que explica por qué contratos_en_ejecucion resuelve consorcios como lo hace) y sed -n '662,687p' («Verifique a su socio»); extraer de lib/contratos_en_ejecucion.js (consultarContratosEnEjecucion, ~:300-330) la consulta de grupos + contratos en una función con parámetro de estados (vigentes por defecto, para que capacidad.js no cambie ni una cifra: su prueba existente debe seguir verde) y llamarla con todos los estados desde un handler nuevo lib/handlers/perfil/trayectoria.js plegado en OPS de api/perfil.js como `trayectoria`; respuesta: contratos del NIT propio y de sus consorcios (con participación y «en consorcio con …»), n por estado, y `null` donde la fuente no respondió (no 0). Prueba en tests/e2e.js: con un mock de Socrata donde un contrato existe solo por codigo_grupo de ceth-n4bn (no por documento_proveedor), op=trayectoria lo enseña con su participación; la consulta falla → `contratos: null` y la pantalla dice «sin verificar», no «sin contratos»; mutación recomendada aunque no decide plata: quitar la rama de ceth-n4bn debe tumbar la prueba. Recordar que el conteo de archivos de api/ está fijado en 6 por la suite (tests/e2e.js:44448): nada nuevo en api/.

### 5.2 Propuestas descartadas o que ya existen

- **P-02 · Rótulo de régimen jurídico y ficha del manual de la entidad** (ya_existe). El rótulo y su explicación ya existen en modalidadEnLlano, y sacarlo a la tarjeta es la pieza N03 de la hoja de ruta, con el texto exacto «Régimen especial · reglas propias: lea el manual de la entidad». La ficha jurídica por entidad, con URL de manual mantenida a mano, repite un tipo de tabla que el dueño ya retiró del dictamen por depender de mantenimiento manual, y obligaría a afirmar normas por entidad sin fuente leída.
- **P-03 · Radar de contratación derivada y régimen especial con ofertas** (descartar). La parte con más valor, mostrar el régimen especial con ofertas como oportunidad con su advertencia, ya existe (lib/filtros.js:351, lib/guia_proceso.js:312). El radar de convenios tiene una señal muy fina: unos 42 contratos en 21 meses en todo el país, ninguno de tipo Obra. Y las convocatorias derivadas viven fuera de los datos abiertos, así que la app avisaría sin poder mostrar nada.
- **P-05 · Revisor de actas de prórroga, suspensión y otrosí antes de firmar** (descartar). Fuera del alcance decidido: Detekta es para decidir a qué licitación presentarse y la investigación de mercado descartó expresamente actas y liquidación post-firma. Reabrirlo es decisión del dueño, no de una sesión.
- **P-06 · Mayor permanencia: costo antes de firmar y bitácora de costos reales** (descartar). La bitácora y el costo al firmar la prórroga son seguimiento de obra, que está fuera de alcance, y el costo diario con AIU por defecto sería un supuesto que puede hacer perder plata. Lo que sí cabe es otra cosa: antes de ofertar, mostrar cuánto le costaría a su administración la prórroga típica de ESA entidad, con el AIU propio del usuario y solo si lo declaró. Eso mejora un dolor que hoy está «Parcial» y debería proponerse aparte.
- **P-07 · Libro de reclamos y salvedades para la liquidación** (descartar). Fuera del alcance decidido, no tiene datos abiertos (todo depende de lo que cargue el usuario), cuesta mucho y la salida sería criterio jurídico que la app no puede respaldar sin inventar normas.
- **P-08 · Reloj de liquidación y caducidad por contrato** (descartar). Es de las cuatro la más barata y la que tiene datos (fecha de fin y campo de liquidación en jbjy-vk9h, sobre un módulo que ya existe). Aun así cae fuera del alcance que el dueño fijó (post-firma). Si el dueño lo reabre, es la primera candidata, pero exige leer y citar las normas vigentes y dar siempre la fecha más temprana.
- **P-09 · Control de cantidades, actas e ítems no previstos** (descartar). Fuera del alcance que el dueño fijó: Detekta sirve para decidir a qué licitación presentarse, y el seguimiento de la obra después de firmar está excluido de forma explícita. No tiene datos públicos: todo es digitación del usuario. Y su cifra central (el tope del 50 %) no es pacífica.
- **P-10 · Cobro completo: cuenta sin devoluciones, reloj de pago e intereses de mora** (descartar). Es la fase de ejecución y cobro del contrato, que el dueño excluyó. Además reabre el plazo legal de pago (Ley 2024), que el dueño retiró el 2-sep-2026 junto con sus «prótesis». No hay datos públicos detrás, y la cifra de mora sería un cálculo legal sin respaldo de un abogado.
- **P-11 · Ficha de pago de la entidad y caja necesaria** (descartar). El núcleo (días de pago por entidad) ya fue tumbado en la verificación adversaria con estos mismos datasets, porque miden el registro y no la demora. Además el dueño retiró el tema el 2-sep-2026. Lo que la propuesta da por existente («pago medido») no existe. Lo aprovechable (porcentaje pagado, forma de pago del pliego, calendario de gobierno) ya está en lib/ejecucion.js, lib/dictamen_reglas.js y lib/dictamen.js. Solo se reabre con una nueva medición y el visto bueno del dueño.
- **P-12 · Kit de defensa ante multa o incumplimiento (art. 86)** (descartar). Es un trámite sancionatorio durante la ejecución, que el dueño excluyó del producto («seguir la obra después de firmar»). Tampoco tiene fuente de datos pública, y su salida es asesoría legal que Detekta no debe sustituir. Lo cercano y útil ya existe: las multas del socio (lib/socio.js) y la cláusula de multas leída del pliego (lib/dictamen_reglas.js).
- **P-13 · Garantías y arranque de obra sin hechos cumplidos** (descartar). Queda fuera del alcance que fijó el proyecto: docs/INVESTIGACION_MERCADO_LICITADOR.md § «7. Lo que no hay que hacer» dice literalmente «Operar SECOP II por el usuario … o seguir la obra después de firmar». No hay datos abiertos de pólizas, así que todo dependería de lo que teclee el usuario. Lo que sí está en la hoja de ruta es la póliza de SERIEDAD frente a una adenda que mueve el cierre (§2: «La póliza de seriedad no llegó, o la adenda movió el cierre y quedó corta» = «Falta»; N17 queda sin verificación adversaria en INVESTIGACION_LICITANTE §1). Eso es lo único rescatable de P-13 y ya está en la hoja de ruta.
- **P-15 · Concentración y ganador habitual por entidad** (ya_existe). Los adjudicatarios distintos, el ganador que repite y la concentración con base mínima ya se muestran en el detalle de la entidad. Lo que falta (un solo oferente por modalidad, sin acusar) ya está en la hoja de ruta como N02+N01 con visto bueno pendiente. No hay que reproponerlo: hay que ejecutar esa ficha y arreglar el redondeo de lecturaDe.
- **P-16 · Alerta de posible colusión en los procesos donde compite** (descartar). La señal más fuerte (representante, socios o contador en común) no tiene datos: el RUES abierto no trae esos campos. La de ofertas parecidas sale en la mayoría de las licitaciones por cómo se fija el precio, así que sería ruido. Y el proyecto ya decidió no «leer las ofertas de los competidores para tumbarlos» (INVESTIGACION_MERCADO_LICITADOR § 7). La concentración sin acusar ya cubre lo útil (P-15 / N01).
- **P-18 · Pliego tipo: versión aplicable y desviaciones marcadas** (descartar). No hay datos para construirlo honradamente: no existen plantillas versionadas en el repositorio y el código ya declara que no reconoce la versión. Las dos piezas que más se le parecen ya cayeron o quedaron fuera del horizonte: el pliego a la medida de otro (R-17) y el borrador de observación (N18). La norma de inalterabilidad ya llega al dictamen como alerta citada, y eso basta mientras no haya corpus. Se reabre solo si el dueño decide reunir las plantillas oficiales por versión.
- **P-23 · Aviso de precio artificialmente bajo con su expediente** (ya_existe). La alerta, el umbral de referencia declarado y el documento de justificación exportable desde el APU ya están construidos y probados. La parte nueva de la propuesta (umbral según cuántos oferentes se esperan, o mediana menos desviación) usa datos que no existen antes del cierre, y el propio código dice que la norma no fija porcentaje. Sería un supuesto que puede hacerle subir o bajar el precio sin fundamento.
- **P-25 · Simulador del puntaje económico y patrón de descuentos** (descartar). Tal como viene se descarta. El patrón de descuentos por ítem es la N08 ya descartada, y el simulador prospectivo produce un puntaje de 7 decimales sobre ofertas inventadas por el usuario, con una versión del pliego tipo que la app no sabe reconocer: es el falso positivo caro en precios. Lo que sí tiene datos, simular los métodos sobre las ofertas reales de procesos cerrados de la entidad, ya está en la ruta como continuación de R-11/D-65. Va por ese camino, con plan y visto bueno del dueño, y solo después de leer la versión del documento tipo del pliego.
- **P-30 · ¿Vale la pena pelear la adjudicación?** (descartar). Lo util (guardar su oferta y ver las de todos) ya existe (R-03, R-11). Lo nuevo es un calculo juridico sin datos verificables (estadisticas ANDJE/CCB no probadas) y un recalculo del ganador con metodo supuesto: cifra creible que puede hacer perder plata en pleitos.
- **P-32 · Asistente de contratos en ejecución para la capacidad residual** (ya_existe). El cruce con SECOP II de los contratos del NIT y de sus consorcios, con suspension, acta pendiente, participacion y frase por contrato, ya esta en lib/contratos_en_ejecucion.js. Lo restante son pendientes registrados; la regla de minima cuantia propuesta contradice una decision con fuente.
- **P-36 · Costos ocultos del pliego: obligaciones sociales y puntos de calidad** (descartar). La parte que suma (avisar con cita de obligaciones fuera del presupuesto) cabe en P-35 sin pieza propia. La parte que la distingue (costo en pesos de cada punto de calidad y de las obligaciones sociales, llevado al APU) es un supuesto sin fuente en el módulo donde el falso positivo cuesta plata, y confunde un factor de puntaje con una obligación.
- **P-40 · Radar de acuerdos marco y Tienda Virtual** (descartar). Está fuera del foco de obra de Detekta (los acuerdos marco son de bienes y servicios uniformes, y el corpus ya los filtra por semántica de obra), depende de reglas de CCE que cambian por guía y sin dataset para la mayoría de sus piezas, y el dataset que sí existe trae unas seis semanas de rezago.
- **P-42 · Fuentes de precios para el APU: visita, proveedores y catálogo** (descartar). Tres de las cuatro piezas ya existen (emparejamiento con umbral, cuadre de cantidades, tienda como techo). La lista de visita quedó descartada por la verificación previa (N18). La libreta de proveedores es lo único nuevo, depende de un correo que no está configurado y se solapa con R-15, que ya está en la ruta: se ejecuta allí, no como propuesta nueva.

## 6. Vacíos que el crítico señaló

El crítico buscó temas que la investigación no cubrió. Cada uno trae sus fuentes. Los dos que ya están en el código se marcan en §2.4.

### 6.1 Contribución especial de obra pública del 5 % (y los tributos que la entidad descuenta de cada acta): el mayor costo fiscal del contrato de obra no aparece en el índice

PRE-17 nombra estampillas, fiducia e IVA, y FIR-16 el IVA sobre la utilidad, pero ninguna ficha menciona la contribución del art. 120 de la Ley 418/1997 (art. 6 Ley 1106/2006, permanente por Ley 1738/2014): 5 % del valor total del contrato de obra pública y de cada adición, que la entidad descuenta del anticipo y de cada cuenta. En un contrato con 5 % de utilidad en el AIU, la contribución se come toda la utilidad si no se presupuestó. La DIAN la extiende a ESE y ESP aunque contraten por derecho privado, justo las entidades que DET-02 y PRE-20 tratan como «otro régimen». Además en 2025 el impuesto de timbre al 1 % (Decreto 175/2025) gravó adiciones y pagos hasta el 31-dic-2025 y volvió a 0 % en 2026: un APU o un dictamen que arrastre la tarifa de 2025 pone una cifra equivocada.

- DIAN, Oficio 32764 de 2018 (contribución especial Ley 418/1997, contratos de obra pública) · https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_32764_2018.htm · cita: «la base gravable de la contribución especial es el valor total del contrato o adición al mismo»
- DIAN, Oficio 000482 del 16 de abril de 2018 (aplicación a ESE y entidades con régimen contractual privado) · https://cijuf.org.co/node/14037 · cita: «las personas naturales o jurídicas que contraten con Empresas Sociales del Estado deben pagar la contribución especial […] debe descontar el 5% del valor del anticipo, si lo hubiere, y de cada cuenta que cancele al contratista»
- DIAN, Concepto 012498 int. 1467 del 15 de septiembre de 2025 (impuesto de timbre por periodos) · https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_12498_2025.htm · cita: «Del 1% sobre cada pago o abono en cuenta derivado del acto o contrato hasta el 31 de diciembre de 2025 […] Del 0% sobre cada pago o abono en cuenta derivado del contrato a partir del 1 de enero de 2026 (inclusive)»

Propuesta del crítico: P-44 «Calculadora de carga fiscal del proceso» (o ampliar P-22/P-21): 5 % obra pública (sí/no según objeto y entidad, incluidas ESE/ESP), estampillas del territorio, retención en la fuente e ICA del municipio de ejecución, timbre con fecha de vigencia; mostrar el neto que recibirá el contratista por cada $100 de acta. Y en P-21 (auditor del presupuesto oficial) marcar si el presupuesto o el AIU ya la incluyen.

### 6.2 Crisis fiscal 2025-2026: la Nación paga actas con un año de atraso (Invías) y la Ley 2024/2020 fija 60 días para Mipymes, pero «sujeto al PAC»

EJE-11 y LIQ-19 tratan el pago tardío como un riesgo genérico. El hecho medible es otro: Invías acumuló 5.700 actas sin pagar por cerca de $1 billón (feb-2025), Hacienda pactó un plan de pagos por fases y en feb-2026 la deuda volvió a $438.000 millones con contratistas financiando la obra con préstamos. Esto decide a qué entidad nacional presentarse y con qué caja. Además la Ley 2024 de 2020 (art. 12) da a la Mipyme un plazo legal de 60 días desde la aceptación de la factura, que ninguna ficha del índice nombra, con la trampa de que el cómputo queda sujeto al PAC.

- Valora Analitik, «CCI confirmó que Invías pagará deuda de más de $1 billón a contratistas», 13-feb-2025 · https://www.valoraanalitik.com/cci-confirmo-invias-pagara-deuda-1-billon/ · cita: «ascendía a $1 billón […] 5.700 actas sin pagar […] Febrero: $200.000 millones. Marzo: $600.000 millones. Abril de 2025: $800.000 millones»
- Semana, «A contratistas de Invías no les pagan desde hace meses…», 28-feb-2026 · https://www.semana.com/nacion/articulo/a-contratistas-de-invias-no-les-pagan-desde-hace-meses-son-mas-de-430-mil-millones-de-pesos-en-facturas-atrasadas-que-ponen-obras-en-riesgo/202608/ · cita: «deuda de unos 438.000 millones de pesos […] 298 facturas pendientes […] «El dinero no sale del contrato, hay que pedir préstamos»»
- Ley 2024 de 2020, artículo 12 (plazos máximos de pago en contratación estatal) · https://leyonline.co/laws/ley-2024-de-2020/articulo-12-plazos-maximos-de · cita: «que celebren las entidades estatales con una micro, pequeña o mediana empresa […] los pagos deberán realizarse en un plazo máximo de sesenta (60) días calendario siguientes, a la aceptación de la factura. PARÁGRAFO 1o. El cómputo del plazo establecido en este artículo estará sujeto a la disponibilidad del Plan Anualizado de Caja (PAC)»

Propuesta del crítico: Ampliar P-11 (ficha de pago de la entidad) con un «semáforo de caja por entidad nacional» alimentado por noticias/actas vencidas (Invías, ANI, UNGRD, Fondo Adaptación) y con la fecha del último plan de pagos; y en P-10 (cobro completo) incluir el reloj de la Ley 2024 art. 12 para Mipymes con el texto a radicar cuando venza, dejando claro que el PAC lo condiciona.

### 6.3 Cierre de vigencia, reservas que fenecen y «vigencias expiradas»: el acta que no se paga antes del 31 de diciembre entra a un trámite presupuestal de meses

FIR-10 cubre el registro presupuestal al arrancar y EJE-11 menciona «cambio de año», pero el índice no explica el mecanismo que deja un acta aprobada sin plata: la obligación no pagada en el año se vuelve reserva o cuenta por pagar; si tampoco se paga en la vigencia siguiente, fenece y solo puede pagarse como «pasivo exigible – vigencia expirada» con justificación, traslado presupuestal y aviso a la Contraloría. Para el contratista es la diferencia entre cobrar en enero o en el segundo semestre.

- Agencia Nacional de Tierras, Procedimiento GEFIN-P-012 «Trámite de vigencias expiradas», v2, 8-ago-2022 · https://www.ant.gov.co/sites/default/files/2024-06/documentos/archivos/GEFIN-P-012-PROCEDIMIENTO-TRAMITE-DE-VIGENCIAS-EXPIRADAS-ANT-V2.pdf · cita: «Pasivos Exigibles: Son compromisos que deben asumirse con cargo al presupuesto de la vigencia en que se pagan, por cuanto la reserva presupuestal o cuenta por pagar que los respaldó en su oportunidad feneció por términos, es decir, por no haberse pagado en el transcurso de la vigencia fiscal siguiente a la que se constituyó»

Propuesta del crítico: En P-08 (reloj de liquidación) y P-10 (cobro completo) añadir el «reloj de cierre de vigencia»: fecha límite de radicación que cada entidad publica en su circular de cierre, aviso cuando un acta aprobada no tiene orden de pago al 31-dic, y explicación en una línea de qué pasa si fenece la reserva.

### 6.4 Financiación del contrato: factoring y cesión de derechos económicos sobre actas del Estado

El índice habla de caja necesaria (P-11) y de pago tardío, pero no de cómo se convierte un acta del Estado en liquidez: la cesión del crédito (no del contrato) es válida sin modificar el contrato, pero solo produce efectos contra la entidad cuando se le notifica con el título o ella la acepta; sin notificación la entidad paga válidamente al cedente, y una orden de embargo la bloquea. Una pyme que no conoce esto financia la obra con préstamos de consumo o pierde la cesión por un trámite.

- Colombia Compra Eficiente, Concepto C-110 del 14 de junio de 2023 (cesión de crédito en contratos estatales) · https://relatoria.colombiacompra.gov.co/wp-content/uploads/2024/05/1710534346009-C-110.docx · cita: «la cesión produce efectos para el deudor y terceros luego de que el cesionario la notifica al deudor o es aceptada por éste […] la falta de notificación de la cesión hace que el deudor pueda pagar válidamente al cedente»
- Ley 2024 de 2020, artículo 12 · https://leyonline.co/laws/ley-2024-de-2020/articulo-12-plazos-maximos-de · cita: «los pagos deberán realizarse en un plazo máximo de sesenta (60) días calendario siguientes, a la aceptación de la factura»

Propuesta del crítico: P-45 «Financiar contra actas»: por contrato, qué actas aprobadas son cedibles, modelo de notificación a la entidad (art. 1960 C.C.) y comparación del costo del factoring frente a la mora legal que EJE-11/LIQ-19 ya describen; cruzar con P-10.

### 6.5 Régimen sancionatorio propio del contratista: inhabilidad por incumplimiento reiterado (art. 90 Ley 1474) y responsabilidad penal como particular que cumple funciones públicas (art. 56 Ley 80)

EJE-10, EVA-16 y TRA-08 tratan la multa como pérdida de puntaje o como algo que se defiende. Falta la consecuencia que saca a la empresa del mercado: 5 multas o 2 declaratorias de incumplimiento en los últimos 3 años (o 2 multas + 1 incumplimiento en una vigencia) inhabilitan 3 años desde la inscripción en el RUP, y la inhabilidad se extiende a los socios de sociedades de personas. Y para efectos penales el contratista, el interventor y el consultor son particulares que cumplen funciones públicas: un anticipo mal invertido se discute como peculado, no como incumplimiento civil. Nada de esto cabe en P-12 (kit de defensa) ni en P-31 tal como están formulados.

- Ley 1474 de 2011, artículo 90 (modificado por art. 43 Ley 1955/2019) · https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=43292 · cita: «Haber sido objeto de imposición de cinco (5) o más multas durante la ejecución de uno o varios contratos […] durante los últimos tres (3) años […] La inhabilidad se extenderá por un término de tres (3) años»
- Colombia Compra Eficiente, Concepto C-349 del 15 de julio de 2021 (alcance del parágrafo del art. 90) · https://relatoria.colombiacompra.gov.co/wp-content/uploads/2024/05/1627316427185-C-349-DE-2021.docx · cita: «la inhabilidad del artículo 90 de la Ley 1474 de 2011 afecta a las sociedades de personas y se extiende tanto a los socios de estas como a las sociedades de la misma naturaleza que ellos conformen con posterioridad»
- Corte Constitucional, Sentencia C-563 de 1998 (7-oct-1998), art. 56 Ley 80 · https://www.corteconstitucional.gov.co/relatoria/1998/C-563-98.htm · cita: «Para efectos penales, el contratista, el interventor, el consultor y el asesor se consideran particulares que cumplen funciones públicas en todo lo concerniente a la celebración, ejecución y liquidación de los contratos»

Propuesta del crítico: Ampliar P-31 y P-43: contador de multas e incumplimientos propios en ventana móvil de 3 años con aviso «una multa más lo inhabilita 3 años», extendido a socios si la sociedad es de personas; y en P-12 una nota fija: «el anticipo es plata pública: su manejo es responsabilidad penal».

### 6.6 Colusión como riesgo propio del oferente (no solo como víctima): delito del art. 410A, inhabilidad de 8 años e investigaciones de la SIC sobre «empresas que aparentan ser independientes»

EVA-13, TRA-05 y P-16 miran la colusión desde el que la sufre. El contratista regional recibe la otra invitación: «acompañe» una oferta, preste la experiencia a una sociedad hermana, repita con el mismo competidor. Eso es prisión de 6 a 12 años, multa e inhabilidad de 8 años, y la SIC abre investigaciones por coincidir en decenas de procesos con la misma contraparte (Mamut/Uniobras: 151 coincidencias, 13 con coordinación).

- Ley 1474 de 2011, artículo 27 (art. 410A Código Penal, acuerdos restrictivos de la competencia) · https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=43292 · cita: «El que en un proceso de licitación pública, subasta pública, selección abreviada o concurso se concertare con otro […] incurrirá en prisión de seis (6) a doce (12) años […] inhabilidad para contratar con entidades estatales por ocho (8) años»
- Portafolio, «Presunta coordinación entre Mamut y Uniobras en 13 licitaciones estatales bajo investigación de la SIC», 15-jul-2025 · https://www.portafolio.co/economia/infraestructura/presunta-coordinacion-entre-mamut-y-uniobras-en-13-licitaciones-estatales-bajo-investigacion-de-la-sic-635376 · cita: «habrían aparentado ser agentes del mercado independientes […] Entre 2021 y 2024 coincidieron en al menos 151 procesos de selección»

Propuesta del crítico: Ampliar P-16 con un espejo propio: medir con cuáles competidores coincide la empresa del usuario y en cuántos procesos, y avisar cuando el patrón se parece al que la SIC investiga; en P-33 (reglas del consorcio) una regla fija: no presentar dos ofertas con socios cruzados en el mismo proceso.

### 6.7 Cumplimiento obligatorio: Programa de Transparencia y Ética Empresarial (PTEE) para empresas de construcción e infraestructura que contratan con el Estado desde 500 SMMLV

La Circular Externa 100-000011 de 2021 de Supersociedades (cap. XIII de la Circular Básica Jurídica) obliga a las sociedades de infraestructura y construcción con contratos estatales desde 500 SMMLV e ingresos desde 3.000 o activos desde 5.000 SMMLV a adoptar un PTEE antes del 31 de mayo del año siguiente y a reportarlo. Es un requisito que una pyme cruza sin enterarse al ganar su segundo contrato, con sanción de Supersociedades y, cada vez más, pliegos y entidades que piden el programa. El índice no lo nombra en ninguna etapa.

- INCP, «Nuevas especificaciones sobre los Programas de Transparencia y Ética Empresarial» (Circular Externa 100-000011 del 9-ago-2021, Supersociedades), 21-oct-2021 · https://incp.org.co/publicaciones/infoincp-publicaciones/informacion-para-empresas/entorno/2021/10/nuevas-especificaciones-sobre-los-programas-de-transparencia-y-etica-empresarial/ · cita: «hayan celebrado contratos con entidades estatales por cuantías desde 500 Smmlv […] farmacéutico, infraestructura y construcción, manufacturero, minero-energético, TICs […] El PTEE deberá adoptarse a más tardar el 31 de mayo del año siguiente al que se cumplieron los requisitos»

Propuesta del crítico: En P-43 (hoja de vida propia) un contador de valor contratado con el Estado en el año frente a 500 SMMLV, con aviso del plazo del 31 de mayo y lista mínima del PTEE; en P-27 (expediente documental) la casilla «PTEE adoptado/reportado».

### 6.8 Reforma laboral (Ley 2466 de 2025) y salario mínimo 2026: el costo de la mano de obra sube por calendario y los APU y los contratos en ejecución sin fórmula de reajuste no lo recogen

PLA-09 y PRE-16 hablan de presupuestos viejos y de no reajuste, pero no del cambio concreto: jornada nocturna desde las 7 p. m. (vigente desde el 25-dic-2025), recargo dominical y festivo 80 % (jul-2025), 90 % (jul-2026) y 100 % (jul-2027), contrato por obra o labor por escrito y detallado, y el alza del mínimo que la CCI dice que «presiona los presupuestos contractuales» de obra pública. Un APU de mano de obra calculado con el factor prestacional de 2024, o un presupuesto oficial con precios de 2024 licitado en 2026, está mal por una cifra conocida.

- Ofima, «Reforma laboral 2025-2026 Colombia (Ley 2466): cambios, retos y cómo adaptarse» · https://www.ofima.com/blog/reforma-laboral-colombia/ · cita: «jornada nocturna desde las 7:00 PM (vigente desde el 25 de diciembre de 2025) […] recargo dominical y festivo escalonado del 80% (julio 2025) al 90% (julio 2026) y 100% (julio 2027)»
- INCP, «Se aprobó la reforma laboral: conozca la Ley 2466 de 2025», jun-2025 · https://incp.org.co/publicaciones/infoincp-publicaciones/2025/06/se-aprobo-la-reforma-laboral-conozca-la-ley-2466-de-2025-el-25-de-junio/ · cita: «el contrato por obra o labor deberá constar por escrito y definir con claridad la actividad contratada […] Esta medida se podrá adoptar de manera gradual hasta llegar a dicho porcentaje en 2027»
- Portafolio, «Alza del 23 % del salario mínimo pondría en riesgo la viabilidad de los proyectos de infraestructura: CCI», 30-dic-2025 · https://www.portafolio.co/economia/infraestructura/alza-el-23-del-salario-minimo-pondria-en-riesgo-la-viabilidad-de-los-proyectos-de-infraestructura-cci-485484 · cita: «tiene efectos inmediatos sobre los costos laborales asociados a proyectos de obra pública y concesiones […] impacta de manera negativa a las pymes de ingeniería que representan más del 90% del sector»

Propuesta del crítico: En P-42 (fuentes de precios para el APU) y P-21 (auditor del presupuesto oficial) un «factor de mano de obra con fecha» que aplique los recargos vigentes al día del cierre y a los meses de ejecución; en P-35 (minuta) marcar si hay fórmula de reajuste y, si no, cuantificar el sobrecosto laboral previsto por el calendario de la ley.

### 6.9 Contratación de emergencia: urgencia manifiesta (art. 42 Ley 80) y calamidad o desastre (art. 66 Ley 1523/2012) sacan obra y suministro del concurso, con régimen privado y control fiscal posterior

PLA-15 solo menciona «urgencias de ESP». Tras cualquier declaratoria de calamidad (6 meses, prorrogable una vez) la entidad contrata por derecho privado y sin convocatoria; con urgencia manifiesta contrata directo y el acto va a control inmediato de legalidad. Para el contratista es un mercado que no ve en SECOP como proceso y, a la vez, un contrato que la Contraloría y la Procuraduría revisan después (sobreprecios, uso indebido = falta gravísima del funcionario, contrato cuestionado). Es exactamente lo que ocurrió con la UNGRD en 2024.

- Procuraduría General de la Nación, Directiva 016 del 22 de abril de 2020 (urgencia manifiesta) · https://cancilleria.gov.co/sites/default/files/Normograma/docs/directiva_procuraduria_0016_2020.htm · cita: «uso indebido de la contratación de urgencia manifiesta, será causal de mala conducta o falta gravísima […] el control inmediato de legalidad de los actos administrativos expedidos con ocasión de los estados de excepción»
- Colombia Compra Eficiente, Concepto C-033 del 29 de abril de 2024 (art. 66 Ley 1523/2012) · https://relatoria.colombiacompra.gov.co/conceptos/c-033-de-2024/ · cita: «establece un régimen especial de derecho privado en razón de la especial consideración que merece el objeto a contratar […] el término de retorno a la normalidad no podrá exceder los seis (6) meses […] podrá ser prorrogado por una sola vez y hasta por el mismo término»

Propuesta del crítico: Ampliar P-03/P-04 con un «radar de emergencias»: declaratorias de calamidad y actos de urgencia manifiesta por entidad y municipio (publicados en SECOP «en tiempo real» por instrucción de la Procuraduría), tamaño de lo contratado así y aviso del riesgo: precio documentado con estudio de mercado propio y expediente para el control posterior.

### 6.10 Dos puertas más por las que la obra sale del Estatuto: convenios con organismos internacionales (art. 20 Ley 1150) y contratación directa de «ciencia, tecnología e innovación»

PLA-15 y DET-03 enumeran convenios interadministrativos y consultoría disfrazada, pero no estas dos: si un organismo de cooperación financia el 50 % o más (o el objeto cae en los seis supuestos del reglamento), el contrato se rige por el reglamento del organismo y no por la Ley 80, aunque sigue siendo contrato estatal con inhabilidades y control fiscal; y la causal de CTeI se ha usado para disfrazar obra pública (la Corte Suprema confirmó en 2024 una condena por un contrato de mantenimiento vial tramitado como «transferencia tecnológica»). CCE dijo en 2025 que la causal no sirve para «evadir un proceso competitivo». Para el contratista: un mercado que no verá como licitación y un contrato que, si lo firma, puede caer con el funcionario.

- Colombia Compra Eficiente, Concepto C-376 del 8 de mayo de 2025 (art. 20 Ley 1150) · https://relatoria.colombiacompra.gov.co/conceptos/c-376-de-2025/ · cita: «sumas iguales o superiores al cincuenta por ciento (50%) […] podrá someterse a los reglamentos de tales entidades. En caso contrario, se someterán a los procedimientos establecidos en la Ley 80 de 1993»
- Asuntos Legales, «Contratación con organismos internacionales», 8-abr-2025 · https://www.asuntoslegales.com.co/consultorio/contratacion-con-organismos-internacionales-4105070 · cita: «siguen siendo contratos estatales […] serán aplicables las inhabilidades e incompatibilidades del régimen general de la contratación estatal»
- Corte Suprema de Justicia, Sala de Casación Penal, SP185-2024 (19-feb-2024), contrato 638 de 2013 UMV Bogotá · https://cortesuprema.gov.co/ratificada-condena-a-exdirectora-de-la-unidad-de-mantenimiento-vial-de-bogota-por-irregularidades-en-contrato-de-maquina-tapahuecos/ · cita: «camuflando la verdadera naturaleza de este que, como ya se dijo, era de obra pública»

Propuesta del crítico: Añadir ambas causales al medidor de P-04 (obra que no sale a concurso) por entidad, y en P-02 (rótulo de régimen) la ficha «reglamento del organismo»: qué reglas de subsanación, garantías y pago aplican y que las inhabilidades de la Ley 80 sí rigen.

### 6.11 Obras financiadas con regalías (SGR): ejecutor designado, Estatuto obligatorio, y una cartera de proyectos críticos que la Contraloría mide en billones

El índice no distingue la fuente de financiación del proceso. Un proyecto SGR lo ejecuta la entidad designada en OCAD con sujeción al EGCAP aunque sea de régimen especial (ahí se rompe la regla de PRE-20), sus pagos dependen de giros del sistema y es el segmento con más suspensiones y prórrogas: 477 proyectos con alertas por $4,78 billones en 2021 y 1.970 proyectos críticos, inconclusos o elefantes blancos por $67,07 billones en el balance 2022-2026 de «Salvando Obras». DET-21 (historial de la entidad) y P-14 ganan mucho si separan «esta entidad como ejecutora de regalías».

- Colombia Compra Eficiente, Concepto C-1156 del 3 de agosto de 2026 (art. 37 Ley 2056/2020) · https://relatoria.colombiacompra.gov.co/conceptos/c-1156-de-2026/ · cita: «con estricta sujeción al régimen presupuestal definido en esta ley, al de contratación pública […] el ejecutor debe someterse a las reglas generales de la contratación pública»
- El Tiempo, «Contraloría alerta por riesgos en proyectos de regalías por casi 5 billones», 22-ago-2021 · https://www.eltiempo.com/justicia/investigacion/contraloria-alerta-por-riesgos-en-proyectos-de-regalias-por-casi-5-billones-612368 · cita: «211 alertas de contratación en 477 proyectos con recursos del Sistema General de Regalías […] 4,78 billones de pesos […] 30 proyectos suspendidos y 13 vencidos»
- El Colombiano, balance Contraloría «Salvando Obras», 12-jul-2026 · https://www.elcolombiano.com/colombia/gustavo-petro-estos-son-los-elefantes-blancos-que-deja-su-gobierno-AK38767326 · cita: «1.970 proyectos, con un valor conjunto de 67,07 billones de pesos […] entre el 1 de septiembre de 2022 y el 6 de julio de 2026»

Propuesta del crítico: En P-14 y P-20 marcar el código BPIN/SGR del proceso, el historial de la entidad como ejecutora de regalías (suspensiones, prórrogas) y si el proyecto aparece en «Salvando Obras» o en el Registro de Obras Inconclusas; en P-02 el rótulo «SGR: aplica Ley 80 aunque la entidad sea de régimen especial».

### 6.12 Obras por impuestos: un mercado de obra de $1,14 billones al año donde el contratista lo elige una empresa privada y el contrato no es estatal

612 proyectos y $4,9 billones desde 2018, cupo 2026 de $1,14 billones, en transporte y educación de municipios ZOMAC/PDET: justo el mercado de la pyme regional. Las reglas son otras: el contribuyente contrata la obra bajo su «plena, total y exclusiva responsabilidad», los subcontratos «no vinculan» a la Nación, la interventoría sí la selecciona la entidad por Ley 80, el contratista constituye póliza a favor de la Nación, y el mayor valor por ajustes lo asume el contribuyente. Nada de esto está en el índice ni en SECOP como proceso.

- Decreto 1147 de 2020 (reglamenta art. 800-1 E.T., obras por impuestos), arts. 1.6.6.4.1 a 1.6.6.4.5 · https://normograma.dian.gov.co/dian/compilacion/docs/decreto_1147_2020.htm · cita: «El contribuyente asume plena, total y exclusiva responsabilidad por la negociación, celebración […] no vinculan a las entidades nacionales competentes que suscriban el convenio principal […] procederá a seleccionar el interventor dando aplicación a lo dispuesto en la Ley 80 de 1993»
- Portafolio, «El cupo anual de obras por impuestos pasó de 250.000 millones a 1,1 billones entre 2018 y 2026», 2-ago-2026 · https://www.portafolio.co/economia/el-cupo-anual-de-obras-por-impuestos-paso-de-250-000-millones-a-1-1-billones-entre-2018-y-2026-con-619-proyectos-499435 · cita: «ha movido $4,9 billones […] 2026: $1,14 billones […] Transporte: 151 proyectos históricos, por $2,03 billones»

Propuesta del crítico: P-46 «Radar de obras por impuestos»: banco de proyectos de la ART por departamento, contribuyentes que ejecutan (fiducia o convenio) y ficha de reglas: contrato privado con el contribuyente (sin Ley 80, sin subsanación, sin equilibrio), interventor de la entidad, póliza a la Nación.

### 6.13 Asociaciones público privadas y concesiones (Ley 1508/2012): régimen propio, pago solo por disponibilidad, riesgos trasladados sin reequilibrio, y la obra real se subcontrata bajo el concesionario en derecho privado

La investigación dice cubrir todos los tipos de contrato, pero la modalidad que concentra la mayor inversión en vías (4G/5G) no aparece. Para el contratista de obra el camino habitual a esa plata es ser subcontratista del concesionario (EPC): contrato privado, sin Ley 80, sin subsanación ni equilibrio, con el pago atado a que el concesionario cobre por disponibilidad. Y la APP de iniciativa privada se adjudica al originador tras publicación en SECOP de 1 a 6 meses: una ventana que la pyme no vigila.

- Ley 1508 de 2012, arts. 1, 3, 4, 5 y 19 · https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=45329 · cita: «que involucra la retención y transferencia de riesgos entre las partes y mecanismos de pago […] estará condicionado a la disponibilidad de la infraestructura, al cumplimiento de niveles de servicio […] se podrá contratar con el originador, de manera directa en las condiciones pactadas»
- Colombia Compra Eficiente, Concepto C-215 de 2024 (régimen de las APP) · https://relatoria.colombiacompra.gov.co/conceptos/c-215-de-2024/ · cita: «salvo en las materias particularmente reguladas en la presente ley»

Propuesta del crítico: En P-02 el rótulo «APP/concesión» con la ficha: el pagador es el concesionario, no la entidad; sin Ley 80 en la cadena; riesgos asignados sin reequilibrio. En P-03 (radar de contratación derivada) incluir las convocatorias de subcontratos de concesionarios y las publicaciones de iniciativas privadas en SECOP.

### 6.14 Orden público y extorsión a contratistas de obra: un costo y una causa de parálisis que ninguna matriz de riesgos reconoce

Ninguna ficha del índice trata la seguridad del sitio de obra. En Caquetá el gobernador afirmó que no hay contratista de obra sin extorsión y que una pavimentación se paró por eso; en El Tambo (Cauca) la cuota exigida fue del 10 % de una vía de $18.000 millones y la obra no arrancó; la CCI contó más de 2.000 bloqueos y ataques entre 2023 y 2025 con pérdidas de $10 billones y maquinaria destruida. Es un riesgo que decide si ofertar, y en la liquidación se discute como fuerza mayor o como riesgo asignado (EJE-09, LIQ-12).

- El Tiempo, «No existe un contratista de obra en el departamento que no esté siendo extorsionado»: gobernador de Caquetá, 14-ago-2024 · https://www.eltiempo.com/colombia/otras-ciudades/no-existe-un-contratista-de-obra-en-el-departamento-que-no-este-siendo-extorsionado-luis-francisco-ruiz-aguilar-gobernador-de-caqueta-3371585 · cita: «la obra de pavimentación en Los Pozos, en San Vicente, tuvo que ser parada porque están extorsionando al contratista […] Esos 10 kilómetros no se van a poder pavimentar»
- Blu Radio, «CCI exige resultados a la Fiscalía por ataques de grupos ilegales contra la infraestructura vial», 15-dic-2025 · https://www.bluradio.com/economia/cci-exige-resultados-a-la-fiscalia-por-ataques-de-grupos-ilegales-contra-la-infraestructura-vial-rg10 · cita: «superan los 2.000 casos entre 2023 y 2025 […] alcanzan los 10 billones de pesos […] al menos 40 máquinas han sido destruidas en los últimos meses»

Propuesta del crítico: P-47 «Mapa de orden público del proceso»: por municipio de ejecución, bloqueos, ataques y alertas tempranas publicadas, con tres respuestas: no ofertar, ofertar con el riesgo costeado, u observar la matriz (P-35) para que el riesgo de orden público quede en la entidad.

### 6.15 Consulta previa con comunidades étnicas: una licencia social que no está en el semáforo de madurez y que puede suspender la obra por años

PLA-03 habla de predios y permisos, pero la consulta previa es un trámite distinto, con certificación del Mininterior y protocolización, que antes de la Ley 1682 tardaba más de un año por proyecto y que, suspendida, detiene el frente de obra: en Sincelejo–Tolú Viejo el proceso empezó en agosto de 2015, se suspendió en mayo de 2017 y solo al protocolizarse en diciembre de 2017 «el concesionario puede reiniciar las obras pendientes». El contratista que no pregunta por ella al ofertar asume después la mayor permanencia (EJE-04).

- ANI, comunicado «El 91 % de las vías del programa 4G se encuentra viable por consultas previas», 27-dic-2017 · https://www.ani.gov.co/sites/default/files/comunicado_consultas_previas_ani_dic_27_de_2017_def.pdf · cita: «se protocolizaron 40 consultas previas, muchas de ellas en tiempos superiores a un año. Actualmente, para los proyectos de Cuarta Generación las consultas se están realizando en promedio 5,6 meses […] el proceso fue suspendido en mayo de 2017»

Propuesta del crítico: En P-01 (semáforo de madurez) dos casillas: «certificación de presencia de comunidades étnicas del Mininterior» y «consulta previa protocolizada o no requerida», con el tiempo promedio como dato.

### 6.16 Fraude por suplantación de entidades públicas: contratos y «adjudicaciones» falsos que piden dinero o mercancía al proveedor

El índice asume que todo proceso es real. El SENA reportó al menos diez empresas engañadas desde agosto de 2023 con contratos falsificados con membrete oficial (una entregó mercancía por $180 millones) y el MinCIT alertó en agosto de 2025 sobre falsos funcionarios que ofrecen contratos a cambio de pagos. Para el proveedor pequeño que quiere entrar al mercado estatal es una pérdida total que una verificación de un minuto evita.

- El Tiempo, «SENA alerta casos de estafas por personas que suplantan a funcionarios de la entidad», 28-feb-2024 · https://www.eltiempo.com/economia/finanzas-personales/sena-alerta-casos-estafas-por-personas-que-suplantan-a-funcionarios-de-la-entidad-859760 · cita: «al menos 10 casos […] todas las contrataciones del Sena se hacen exclusivamente a través de la plataforma estatal SECOP II»
- MinCIT, «MinCIT advierte sobre fraudes y suplantación», 21-ago-2025 · https://www.mincit.gov.co/prensa/noticias/general/mincit-advierte-sobre-fraudes-y-suplantacion · cita: «personas ajenas a la entidad están cometiendo actos fraudulentos mediante la suplantación de funcionarios públicos […] nombres, logotipos, emblemas y documentos falsificados con apariencia oficial»

Propuesta del crítico: P-48 «¿Este proceso existe?»: verificar que el proceso, la orden o el contrato que el usuario pega figure en SECOP II/TVEC y que la cuenta y el correo sean del dominio oficial de la entidad, con una regla fija en pantalla: ninguna entidad cobra por adjudicar ni pide entregas sin orden en SECOP.

## 7. Contradicciones por resolver

Cada una es un choque entre fuentes o entre dos problemas de la base. No se resolvió ninguna: queda para una lectura de la norma vigente.

- RUP en firme al cierre: PRE-02 («RUP no en firme al cierre: no se arregla después»), DET-15 y TRA-06 lo afirman como regla cerrada, mientras EVA-05 dice que «las fuentes no coinciden sobre si la inscripción debe estar en firme». El índice no puede tener a la vez una regla fija y una regla discutida: hay que decidir qué dice el documento tipo vigente y qué dice CCE, y rotular las otras fichas con esa misma incertidumbre.
- Competencia en obra: DET-11 («la competencia en obra se volvió masiva: la probabilidad de ganar es baja») contra DET-09 («muchos procesos terminan con un solo oferente») y EVA-14 («requisitos habilitantes dejan procesos con un solo habilitado»). Las tres pueden ser ciertas, pero solo si se parten por modalidad, cuantía y uso de pliego tipo; tal como están, un dictamen puede citar la que convenga.
- Concurso de méritos: DET-13 dice que se juega «sin precio»; EVA-23 dice que «se gana en calidad y se pierde al final por el precio»; TRA-21 dice que los manuales describen un procedimiento «que ya no existe (apertura del sobre económico y revisión con el primer elegible)». Falta una sola ficha que diga cuál es el procedimiento vigente del sobre económico y desde cuándo, y las otras dos deben remitir a ella.
- Renuncia por silencio: EJE-01 (firmar prórroga «sin costo» = se pierde la mayor permanencia) y PRE-13 (matriz aceptada sin observar = no se reclama) parecen chocar con LIQ-02 y EJE-02 («desde el 27-jul-2023 el silencio no es renuncia»). Son compatibles solo si cada ficha distingue renuncia expresa (cláusula «sin costo», riesgo asignado) de silencio (otrosí sin salvedad); hoy ninguna lo hace.
- APPo y convenios solidarios: PLA-16 («la contratación directa con la economía popular ya no existe desde febrero de 2026») y TRA-20 («siguen apareciendo como vigentes, pero la Corte las anuló») son el mismo hecho en dos problemas, y DET-07 («obra hasta la menor cuantía se entrega directo a juntas de acción comunal») no dice si esa vía sobrevivió a la decisión de la Corte o cayó con ella. Debe quedar una sola ficha con la norma exacta que cayó y la que sigue viva.
- Umbral Mipyme: DET-18 afirma que «en 2026 bajó». El tamaño empresarial se mide en UVT (Decreto 957/2019) y la UVT sube cada año; lo único que puede bajar en pesos es el tope en dólares de las convocatorias limitadas (USD 125.000 convertidos por CCE). La ficha debe decir cuál de los dos umbrales bajó o la app clasifica mal en el sentido contrario al que advierte.
- Nombres parecidos que decidirán cifras distintas: PLA-22 («retención del 5 % al 10 % del pago hasta la liquidación», retención contractual en garantía) y la contribución especial del 5 % de obra pública (tributo que la entidad descuenta de cada acta, ausente del índice) se llamarán «el 5 %» en pantalla y en el APU; conviene bautizarlas distinto desde el índice (regla dura de nombres parecidos).
- Nulidad por falta de planeación: PLA-04 y FIR-02 presentan como regla cierta que «el juez lo anula y hay que devolver el anticipo» «sin indemnización», mientras TRA-04 reconoce que «el Consejo de Estado no tiene criterio unificado: el mismo hecho anula un contrato o se subsana según la sala». Las dos primeras deben llevar la misma incertidumbre que la tercera.
- Multas y puntaje: EVA-16 («una multa del último año resta puntaje») y TRA-08 («resta el 2 % de los puntos en todos los procesos del año siguiente») son la misma regla con dos cuantificaciones; y ninguna enlaza con la inhabilidad del art. 90 de la Ley 1474 (vacío reportado), que es la consecuencia mayor de la misma multa.
- Duplicados que invitan a redactar dos reglas divergentes para un mismo hecho (regla dura «no reescribir una regla que ya existe»): FIR-11 y EJE-12 (anticipo tardío y legalización), EVA-11 y PRE-05 (AIU o unitarios por encima del oficial), DET-14, PLA-05 y PRE-21 (indicadores desproporcionados), DET-23 y TRA-09 (ley de garantías), PLA-15, DET-03 y DET-07 (obra que no sale a concurso), EVA-13 y TRA-05 (colusión). Conviene fusionarlos o declarar cuál es la ficha madre.
- Pago tardío sin su norma: EJE-11 («plazo legal sujeto al PAC») y LIQ-19 («intereses de mora bajos si no se pactaron») describen el efecto sin citar la Ley 2024 de 2020 art. 12 (60 días para Mipymes, sujeto a PAC); la ficha de «plazo legal» debe decir cuál es ese plazo y a quién aplica, o la app no podrá mostrar el hecho.

## 8. Dónde están las fuentes

Cada `F-` de esta base apunta a una fila de `docs/CONTRATACION_ESTATAL_FUENTES.md`, con su tipo, su referencia, su año, su enlace y los problemas que la citan.

