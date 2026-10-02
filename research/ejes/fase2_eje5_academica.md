# Fase 2 · Eje 5 (Ejecución) · lente académica · notas del lector

> Para: sesión · Estado: referencia · Sustituido por: —

Lector: «lector fase2 eje5-academica». Alcance: obra pública, interventoría y consultoría. Ids usados: F-0641 a F-0691 (51 fichas de 60 posibles). Todas las fichas son de tipo `academia` (autoridad A6): lo que un trabajo académico afirma sobre una norma o una sentencia es lo que ÉL dice; ninguna norma ni sentencia se abrió en esta lectura, así que todas llevan `vigencia_verificada` = «[sin verificar]» con su motivo. Solo se hicieron consultas GET.

## 1. Tiempos
- Inicio: 2026-10-02 04:29:08 UTC (`date -u` al empezar).
- Fin: 2026-10-02 04:54:26 UTC (`date -u` al terminar).

## 2. Cómo terminó la lectura
Paró el **tope de 40 fuentes abiertas** (documentos distintos), no la saturación ni los 90 minutos. En las últimas 10 fuentes abiertas, 6 trajeron un problema nuevo (reajuste con índice y previsión del INVÍAS; causas endógenas de demora en obra vial; «valor inicial» del tope del 50 % en salarios mínimos; contratos de interventoría con adiciones; inhabilidad del art. 90 y descuento de puntos; justificación de adiciones sin publicar en SECOP), así que no había saturación. Además, todas las fuentes fueron de un solo tipo (`academia`): la regla de saturación pide al menos 2 tipos y no podía cumplirse con esta lente.

## 3. Fuentes intentadas y abiertas por tipo
- `academia`: 45 direcciones intentadas (46 intentos contando el reintento de la dirección de Dialnet 8121595); 41 direcciones abiertas, que son **40 documentos distintos** (la fuente 17 es el mismo artículo que la 14; las fuentes 9 y 21 se abrieron en HTML y en PDF del mismo artículo, contadas una vez); 4 direcciones no abiertas.
- Los demás tipos de la taxonomía (`ley`, `decreto`, `doc_tipo`, `cce_guia`, `cce_concepto`, `juris`, `control`, `internacional`, `gremio`, `practica`, `dato`): 0 intentadas, por la lente asignada. La jurisprudencia y las normas se leen aquí solo a través de lo que cada trabajo académico transcribe.
- Abiertas sin ficha (11 documentos): fuentes 7, 12, 14 (y 17), 30, 32, 34, 35, 39, 40, 41, 42. Motivos: fuera de alcance (derecho español o chileno, concesión portuaria, contratos interadministrativos), anteriores a las Leyes 1150 y 1474 sin aporte frente a otra ficha, opinión sin datos, o resumen general sin dato propio. Se anotan en la tabla.

## 4. Fuentes no abiertas (error literal)
- Fuente 5, `https://revistas.uexternado.edu.co/index.php/Deradm/article/download/2591/2230/8595`: HTTP 200, `text/html`, redirigió a `https://revistas.uexternado.edu.co/challenge?next=…`; el cuerpo es la página «Bot Detection» (15021 bytes), no el PDF.
- Fuente 8, `https://repository.ucatolica.edu.co/server/api/core/bitstreams/f221eac7-a37e-4868-9f7a-bd28a112b9be/content`: HTTP 200, `text/html`, redirigió a `https://repository.ucatolica.edu.co/challenge?next=…`; página «Bot Detection» (12582 bytes).
- Fuente 13, `https://repository.upb.edu.co/bitstream/handle/20.500.11912/103/EL%20ANTICIPO%20EN%20EL%20CONTRATO%20ESTATAL%20SANTIAGO%20SIERRA%20CORREGIDA%20FINAL%20.pdf?sequence=1`: HTTP 200, `text/html`, redirigió a `https://repository.upb.edu.co/bitstreams/f6daffe1-b074-45ca-a041-864ced7b23c3/download`; página «Verificación de Seguridad» (3707 bytes).
- Fuente 20, `https://dialnet.unirioja.es/descarga/articulo/8121595.pdf`: HTTP 503, `text/html`, 3086 bytes (script ofuscado de verificación); reintento una vez: el mismo HTTP 503. La ficha de Dialnet del mismo artículo (`https://dialnet.unirioja.es/servlet/articulo?codigo=8121595`) sí abrió (HTTP 200) y de ella solo se leyó el resumen (fuente 45, F-0690 y F-0691, estado `parcial`).
- Dato aparte: la ficha del repositorio de Uniandes (`https://repositorio.uniandes.edu.co/entities/publication/1f62f63e-0a44-4383-ae41-a942c6615073`) devolvió «Bot Detection» (HTTP 200), pero la API DSpace del mismo repositorio (`/server/api/core/items/…`, `/bundles`, `/bitstreams/…/content`) respondió y de ahí salió el PDF (fuente 27, F-0670). Mismo patrón para la tesis de la Universidad Nacional (`repositorio.unal.edu.co` redirigió a `bffrepositorio.unal.edu.co`, que abrió el bitstream).
- No se intentaron los sitios que las instrucciones daban por caídos el 2-oct (USTA, Unilibre, scielo.org.co, entre otros) ni los repositorios con muro conocido.

## 5. Tabla de fuentes (todas `academia`)
| n | URL | resultado | fichas |
|---|---|---|---|
| 1 | https://repository.ugc.edu.co/bitstream/handle/11396/3948/Mayores_cantidades_obra_estatal.pdf | abierta (PDF 56 p.) | F-0641, F-0642, F-0643, F-0644 |
| 2 | https://www.redalyc.org/pdf/5038/503856222009.pdf | abierta (PDF 16 p.) | F-0645, F-0646 |
| 3 | https://www.redalyc.org/pdf/1514/151445901004.pdf | abierta (PDF 35 p.) | F-0647, F-0648, F-0649 |
| 4 | https://revistas.javeriana.edu.co/index.php/vnijuri/article/download/14849/11989/52548 | abierta (PDF 16 p.) | F-0650 |
| 5 | https://revistas.uexternado.edu.co/index.php/Deradm/article/download/2591/2230/8595 | NO abierta: HTTP 200 con página «Bot Detection» (redirige a /challenge) | - |
| 6 | https://dialnet.unirioja.es/descarga/articulo/8352859.pdf | abierta (PDF 32 p.) | F-0651, F-0652 |
| 7 | https://repository.upb.edu.co/server/api/core/bitstreams/5fb9486a-b6d0-4493-9b70-bf534f30521e/content | abierta (PDF 25 p.), sin ficha (interadministrativos) | - |
| 8 | https://repository.ucatolica.edu.co/server/api/core/bitstreams/f221eac7-a37e-4868-9f7a-bd28a112b9be/content | NO abierta: HTTP 200 con página «Bot Detection» (redirige a /challenge) | - |
| 9 | https://www.redalyc.org/journal/4175/417571103006/ (y su PDF 417571103006.pdf) | abierta (HTML y PDF 35 p.) | F-0653, F-0654, F-0655 |
| 10 | https://dialnet.unirioja.es/descarga/articulo/7513032.pdf | abierta (PDF 23 p.) | F-0656 |
| 11 | https://dialnet.unirioja.es/descarga/articulo/10195502.pdf | abierta (PDF 28 p.) | F-0657, F-0658 |
| 12 | https://dialnet.unirioja.es/descarga/articulo/3625157.pdf | abierta (PDF 30 p.) | - |
| 13 | https://repository.upb.edu.co/bitstream/handle/20.500.11912/103/EL%20ANTICIPO%20EN%20EL%20CONTRATO%20ESTATAL%20SANTIAGO%20SIERRA%20CORREGIDA%20FINAL%20.pdf?sequence=1 | NO abierta: HTTP 200 con página «Verificación de Seguridad» (redirige a /bitstreams/f6daffe1-.../download) | - |
| 14 | https://www.redalyc.org/pdf/851/85102104.pdf | abierta (PDF 11 p.), sin ficha (artículo de 2004, anterior a Ley 1150 y Ley 1474; solo señal) | - |
| 15 | https://www.redalyc.org/pdf/851/85120754003.pdf | abierta (PDF 24 p.) -> F-0661 | F-0661 |
| 16 | https://www.redalyc.org/pdf/3600/360033223012.pdf | abierta (PDF 29 p., dos columnas) -> F-0659, F-0660 | F-0659, F-0660 |
| 17 | https://dialnet.unirioja.es/descarga/articulo/2347488.pdf | abierta (PDF 10 p.); es el mismo artículo que la fuente 14 (cuenta como un solo documento), sin ficha | - |
| 18 | https://www.redalyc.org/journal/5038/503857545013/html/ | abierta (HTML) | F-0662 |
| 19 | https://dialnet.unirioja.es/descarga/articulo/5978963.pdf | abierta (PDF 20 p.) | F-0663 |
| 20 | https://dialnet.unirioja.es/descarga/articulo/8121595.pdf | NO abierta: HTTP 503, text/html (script de verificación de Dialnet), 3086 bytes | - |
| 21 | https://www.redalyc.org/journal/5603/560360439009/html/ (y PDF 560360439009.pdf) | abierta (HTML y PDF 35 p.) -> F-0664, F-0665 | F-0664, F-0665 |
| 22 | https://repositorio.unal.edu.co/bitstream/handle/unal/47092/7176361.2014.pdf?sequence=1&isAllowed=y | abierta (PDF 108 p.; final https://bffrepositorio.unal.edu.co/...) -> F-0667 | F-0667 |
| 23 | https://www.redalyc.org/pdf/2739/273944646001.pdf | abierta (PDF 17 p., dos columnas) -> F-0668 | F-0668 |
| 24 | https://revistas.javeriana.edu.co/index.php/iberoseguros/article/download/41602/32406/166801 | abierta (PDF 41 p.) -> F-0666 | F-0666 |
| 25 | https://www.redalyc.org/journal/5038/503865772008/503865772008.pdf | abierta (PDF 30 p.) -> F-0669 | F-0669 |
| 26 | https://www.redalyc.org/journal/5038/503857546011/503857546011.pdf | abierta (PDF 32 p.) -> F-0671, F-0672 | F-0671, F-0672 |
| 27 | https://repositorio.uniandes.edu.co/entities/publication/1f62f63e-0a44-4383-ae41-a942c6615073 (ficha del repositorio, HTTP 200 con «Bot Detection»; el texto se abrió por la API DSpace: https://repositorio.uniandes.edu.co/server/api/core/bitstreams/224930fa-a55b-4e1b-be7d-4ac662d50ddc/content) | abierta por la API (PDF 22 p.) -> F-0670 | F-0670 |
| 28 | https://www.redalyc.org/journal/5038/503859180009/503859180009.pdf | abierta (PDF 42 p.) -> F-0673 | F-0673 |
| 29 | https://dialnet.unirioja.es/descarga/articulo/3696749.pdf | abierta (PDF 41 p.) -> F-0674 | F-0674 |
| 30 | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/e67c326b-aa9a-455e-8de1-ed10611195e1/content | abierta (PDF 84 p., monografía de 2007), sin ficha (anterior a las Leyes 1150 y 1474; sin aporte nuevo frente a F-0675) | - |
| 31 | https://repository.upb.edu.co/server/api/core/bitstreams/20d6c144-896c-44ea-9e43-cb2d3e35e874/content | abierta (PDF 30 p.) -> F-0675 | F-0675 |
| 32 | https://bffrepositorio.unal.edu.co/server/api/core/bitstreams/91e33be8-e824-48cc-aaa7-630f7064c83f/content | abierta (PDF 156 p., tesis de 2025 sobre concesión portuaria), sin ficha (concesión portuaria fuera del alcance obra, interventoría y consultoría) | - |
| 33 | https://dialnet.unirioja.es/descarga/articulo/6713674.pdf | abierta (PDF 25 p.) -> F-0676 | F-0676 |
| 34 | https://repository.upb.edu.co/server/api/core/bitstreams/f9100d86-be9d-4cdb-938b-28562c3d3724/content | abierta (PDF 42 p., trabajo de 2009), sin ficha (resumen general de la Ley 80 anterior a las reformas; sin dato propio) | - |
| 35 | https://dialnet.unirioja.es/descarga/articulo/17341.pdf | abierta (PDF 44 p.), sin ficha (derecho español: Universidad de Sevilla) | - |
| 36 | https://repositorio.uniandes.edu.co/server/api/core/bitstreams/7eb99360-820a-4f79-932d-64601590e7d3/content | abierta (PDF 70 p., tesis de maestría 2010) -> F-0680, F-0681 | F-0680, F-0681 |
| 37 | https://www.redalyc.org/pdf/496/49642141020.pdf | abierta (PDF 11 p.) -> F-0677, F-0678, F-0679 | F-0677, F-0678, F-0679 |
| 38 | https://repositorio.usc.edu.co/server/api/core/bitstreams/aa059552-772b-4c07-9c02-7540a78587d6/content | abierta (PDF 25 p.) -> F-0682, F-0683 | F-0682, F-0683 |
| 39 | https://repository.ugc.edu.co/server/api/core/bitstreams/10960eab-ab13-4d5c-bed0-c993d0b1203c/content | abierta (PDF 42 p.), sin ficha (conclusión general sobre garantías; sin dato nuevo) | - |
| 40 | https://repository.ugc.edu.co/bitstream/handle/11396/4592/EQUILIBRIO%20ECON%C3%93MICO%20DEL%20CONTRATO%20ESTATAL.pdf?sequence=1 | abierta (PDF 30 p.), sin ficha (opinión sin datos sobre el uso del equilibrio como «oportunidad de negocio») | - |
| 41 | https://repository.ugc.edu.co/server/api/core/bitstreams/286854a7-59f6-4c61-8ef4-b3b6a9eeb57a/content | abierta (PDF 38 p., trabajo de grado 2022), sin ficha (descripción general de funciones de supervisión) | - |
| 42 | https://dialnet.unirioja.es/descarga/articulo/8990641.pdf | abierta (PDF 28 p.), sin ficha (derecho administrativo chileno) | - |
| 43 | https://www.redalyc.org/journal/104/10469617002/10469617002.pdf | abierta (PDF 17 p.) -> F-0684, F-0685, F-0686 | F-0684, F-0685, F-0686 |
| 44 | https://www.redalyc.org/journal/3376/337650446003/337650446003.pdf | abierta (PDF 28 p.) -> F-0687, F-0688, F-0689 | F-0687, F-0688, F-0689 |
| 20b | https://dialnet.unirioja.es/descarga/articulo/8121595.pdf | reintento: NO abierta, HTTP 503 text/html (script de verificación de Dialnet) | - |
| 45 | https://dialnet.unirioja.es/servlet/articulo?codigo=8121595 | abierta (HTML de la ficha de Dialnet; solo el resumen; texto completo no abierto) -> F-0690, F-0691 | F-0690, F-0691 |

## 6. Problemas candidatos que vio la lectura
Cada fila es un candidato para el catálogo (la Fase 3 los numera `CP-###`); ninguno se numera aquí. La columna «señal en SECOP II» es una hipótesis: esta lectura no abrió el diccionario de columnas de datos.gov.co (lo cubre el eje 7); donde dice «no detectable» es porque el hecho no es un campo de procesos ni de contratos.

| # | Problema | Etapa | Decisión | Contrato | Fichas | Consecuencia en plata (si la fuente la da) | Señal en datos abiertos de SECOP II |
|---|---|---|---|---|---|---|---|
| 1 | Mayor cantidad o ítem no previsto ejecutado sin autorización escrita: no se paga, o se paga solo en la liquidación | E4 | D4 | obra | F-0641, F-0642, F-0650, F-0682 | El costo de la obra ejecutada sin autorización queda a cargo del contratista (F-0642); la mayor cantidad a precio unitario ya autorizada se reconoce en la liquidación sin adición (F-0641, F-0682). Sin cifra | no detectable |
| 2 | El tope del 50 % para adicionar se mide en salarios mínimos y no cuenta las mayores cantidades a precio unitario; las obras nuevas sí son adición | E4 | D4 | obra | F-0682, F-0683, F-0641 | El cupo en pesos sube con el salario mínimo (inferencia del lector sobre F-0683); cada adición paga además la contribución del 5 % (F-0671). Sin cifra propia | sin verificar: comparar valor inicial y valor adicionado por contrato, si el dataset de contratos los trae |
| 3 | Reclamo por desequilibrio perdido por firmar prórrogas, suspensiones, otrosíes o el acta de liquidación sin salvedad | E4 y E5 | D4 | obra (la liquidación, todos) | F-0653, F-0654, F-0655, F-0645, F-0646, F-0647, F-0648 | Lo no salvado se da por finiquitado y no se cobra después; la jurisprudencia fluctúa entre tres líneas (F-0653 a F-0655). Sin cifra | no detectable |
| 4 | Liquidación: plazo supletorio de cuatro meses, liquidación unilateral y caducidad; procesos que terminan sin decidir el fondo por errores de liquidación | E5 | D4 | todos | F-0649, F-0646 | Un reclamo mal planteado queda sin resolver; sin cifra | sin verificar: contratos terminados sin fecha de liquidación |
| 5 | Imprevistos del AIU y compensación solo hasta el punto de no pérdida: el contratista debe probar que la partida resultó insuficiente | E4 | D2 | obra | F-0643, F-0657, F-0672 | Recupera sobrecostos hasta no perder, no la utilidad esperada (F-0657); en las sentencias sobre tributos que el autor lista nunca se reconoció ruptura (F-0672). Sin cifra | no detectable |
| 6 | Mayor permanencia y suspensiones: los costos solo se reconocen si se acreditan | E4 | D4 | obra | F-0644 | Equipos y personal parados deben acreditarse; sin cifra | no detectable |
| 7 | Sujeciones materiales imprevistas (suelo, agua, clima) sin tratamiento propio: indemnización incierta | E4 | D4 | obra | F-0658 | Sin cifra | no detectable |
| 8 | Tributos nuevos y descuentos durante la ejecución: contribución del 5 % sobre contrato y adición; el hecho del príncipe exige probar y casi nunca prospera | E4 | D2 | obra | F-0671, F-0672, F-0663 | 5 % del valor del contrato o de la adición (transcripción de 2018, sin verificar contra la ley); ningún reconocimiento en las sentencias listadas | no detectable (los descuentos de cada pago no son datos de procesos; las estampillas no se leyeron) |
| 9 | Anticipo: fondo público con fiducia, comisión a cargo del contratista y responsabilidad fiscal y penal por su uso indebido | E3 y E4 | D2 y D4 | obra | F-0659, F-0660, F-0661, F-0662, F-0685 | La comisión fiduciaria la paga el contratista y no sale del anticipo (F-0659, sin cifra); pérdida o desvío del anticipo genera responsabilidad fiscal (F-0662); un gremio dice que la fiducia sube costos y tiempos (F-0660, sin cifra) | sin verificar: forma de pago y anticipo por contrato |
| 10 | Multas, incumplimiento y caducidad: procedimiento sancionatorio con vicios; en entidades de régimen privado la facultad unilateral depende de lo pactado; la prueba central es el informe del interventor | E4 | D4 | todos | F-0664, F-0665, F-0666, F-0667, F-0669, F-0675, F-0676 | Multa y cobro de garantía; la caducidad termina el contrato sin indemnización (F-0675). Sin cifra | no detectable en procesos (las multas se registran en el RUP) |
| 11 | Inhabilidad y secuelas de las sanciones: tres años desde la inscripción en el RUP (art. 90 de la Ley 1474 según un artículo de 2016), cinco años por caducidad, socios alcanzados y puntos descontados por multas reportadas | E5 | D1 y D3 | todos | F-0687, F-0688, F-0689, F-0675 | Inhabilidad de 3 años (F-0688) y de 5 por caducidad (F-0675); puntos perdidos en evaluaciones sin norma que fije el descuento (F-0689). Fuentes anteriores al Decreto 0997 de 2026: reverificar | no detectable en datos de procesos |
| 12 | Interventor como contraparte: responsabilidad fiscal solidaria, prueba documental, y contratos de interventoría con adiciones y plazos prorrogados | E4 | D4 | interventoría | F-0651, F-0652, F-0676, F-0684, F-0685, F-0686 | 15,63 % de 64 contratos de interventoría de un departamento se ejecutó en plazo y valor (10/64, cuadra); 18 de 64 tuvieron adición de valor y de plazo (28,1 %, cálculo del lector) | sin verificar: adición de valor y de plazo en contratos de interventoría liquidados (el estudio se hizo sobre SECOP I) |
| 13 | Demoras y sobrecostos en obra vial con causas mayormente endógenas: sin causa exógena no hay reclamo | E4 | D4 | obra | F-0677, F-0678, F-0679 | Caso único: 194 días reales frente a 150 programados (+29,3 %, cuadra); sin tasa nacional | sin verificar: plazo inicial frente a plazo final por contrato de obra |
| 14 | Reajuste de precios: con fórmula (índice ICCP en la fuente de 2010) la inflación se ajusta por acta; sin fórmula hay que meterla en el precio; el INVÍAS ponía una previsión de 1 % a 5 %; la variación de mercado queda al contratista (evidencia débil) | E1 y E4 | D2 | obra | F-0680, F-0681, F-0670 | Previsión del 1 % al 5 % del valor básico según la duración (2010); ejemplo de 4,6 % (cuadra). Fuente anterior a la reforma del índice: reverificar | no detectable |
| 15 | Nulidad por falta de planeación declarada con el contrato ya en ejecución | E4 y E5 | D4 | obra | F-0656 | Devolución del dinero entregado y rubros no reconocidos en la liquidación; sin cifra | no detectable |
| 16 | Pagos tardíos y reclamo judicial lento: mora a la tasa pactada o supletiva (doble del interés legal, según la exposición de motivos de 1992); decisión judicial de más de diez años | E4 | D4 | todos | F-0668, F-0673 | Tasa supletiva del 12 % anual (cuadra 2 x 6 %; sin verificar contra la ley); espera judicial de más de 10 años (el 13,5 de un estudio de 2004 no se abrió) | no detectable (el plazo real de pago de la entidad no es dato abierto de procesos) |
| 17 | Adiciones y prórrogas usadas de forma constante y sin publicar su justificación en SECOP | E4 | D4 | todos | F-0690, F-0691 | Sin cifra (solo se leyó el resumen) | parcial: las modificaciones por contrato pueden verse; la justificación no es legible en los datos abiertos (sin verificar) |
| 18 | Cobro de la garantía única: vía procesal y jurisdicción inciertas (2010); relevancia baja para el contratista | E5 | D4 | todos | F-0674 | Sin cifra | no detectable |

## 7. Temas
**Cubiertos** (de la lista del eje 5): adiciones (tope del 50 %) y prórrogas; mayores cantidades frente a adición; ítems no previstos (solo cómo se reconocen, no a qué precio); reajuste de precios (solo una tesis de 2010); anticipo, fiducia y su responsabilidad; desequilibrio económico (imprevisión, sujeciones materiales, hecho del príncipe, tributos, salvedades); suspensiones y salvedades; multas, caducidad, cláusulas excepcionales, inhabilidad del art. 90 de la Ley 1474; garantías (poco); pagos tardíos y mora (poco); liquidación (plazos, salvedades); contribución del 5 % de obra pública; interventoría como contraparte.

**Sin cubrir**: precio de los ítems no previstos y listas oficiales (cartilla del INVÍAS, conceptos de Colombia Compra: lente institucional); fórmulas vigentes de reajuste (el ICOCIV y el procedimiento del INVÍAS; la fuente académica es de 2010 con el ICCP); estampillas y los demás descuentos de cada pago; texto vigente de las garantías (Decreto 1082, arts. 2.2.1.2.3.x) y de la seriedad; plazo real de pago de las entidades (dato empírico: no se halló fuente académica abierta); liquidación después de 2012 (Decreto-Ley 19 de 2012 y CPACA: las fuentes leídas son de 2009 y 2015); sentencias de unificación del Consejo de Estado sobre suspensiones y salvedades (solo a través de lo que un artículo resume; ninguna sentencia se abrió); texto vigente del art. 90 de la Ley 1474 y sus reformas, y del parágrafo del art. 40 de la Ley 80; tesis no abiertas por muro o error (fuentes 5, 8, 13, 20); consultoría como tipo de contrato (ninguna fuente leída trata la ejecución del contrato de consultoría; solo obra e interventoría); estudios sobre pagos con datos de SECOP II.

## 8. Incidencias y cautelas
- Las citas de las fichas se verificaron con un script contra el texto descargado (espacios, comillas, ligaturas tipográficas y guiones de fin de línea normalizados); donde la cita cruza un salto de página o una nota se partió con «[…]» y se dice en el localizador. Las ligaturas del PDF (por ejemplo la «fi» fundida) se escribieron como letras.
- Dos PDF en dos columnas (F-0659, F-0660, F-0668) se leyeron con `pdftotext` sin `-layout`; la cita sale en orden de columna. Los PDF de Redalyc generados desde XML no traen numeración impresa: F-0684 a F-0689 se localizan por página del PDF. En los demás PDF, cuando la numeración impresa difiere, el localizador lo dice.
- F-0674: la misma frase aparece en la introducción (pdf 2) y en las conclusiones (pdf 38); `pagina_pdf` apunta a las conclusiones, que es el apartado citado.
- F-0675: el año (2017) sale de los metadatos del PDF, no del cuerpo; `anio_origen` = metadatos.
- F-0690 y F-0691: solo se leyó el resumen de la ficha de Dialnet, porque el PDF del artículo respondió HTTP 503 dos veces.
- Calidad desigual de las fuentes: varias son tesis de especialización o trabajos de grado con errores (por ejemplo, una cita «Ley 80 de 1983»); se usan como evidencia de un problema, no como autoridad. F-0667 es una posición minoritaria del autor que contradice el régimen que él mismo describe: no es regla.
- Tensiones entre fuentes que no se resolvieron: orden verbal con buena fe (F-0650, 2003) frente a autorización previa y formalización (F-0642); tres líneas del Consejo de Estado sobre dónde debe constar la salvedad (F-0653 a F-0655).
- Vigencia: toda afirmación normativa de una fuente anterior a 2026 está marcada «anterior a la reforma; reverificar» o «[sin verificar]»; en particular el art. 90 de la Ley 1474 y el RUP frente al Decreto 0997 de 2026 (F-0687 a F-0689, F-0675), el índice ICCP (F-0680, F-0681) y la liquidación (F-0645 a F-0649).
- Cifras: se recalcularon 15,63 % = 10/64 (F-0684), 4,6 % del INVÍAS (F-0681), 194/150 (F-0679) y 2 x 6 % = 12 % (F-0668); las del estudio de 2004 sobre 13,5 años (F-0673) y las de corrección de APU del INVÍAS (F-0670) quedaron «sin comprobar» y no se repiten como hecho.
- Los resultados de WebSearch solo sirvieron para hallar direcciones: ninguna ficha se apoya en un resumen de buscador; toda cita sale de un archivo descargado con `curl`. Las direcciones de cada ficha son las que respondieron.
- Ninguna ficha ni este archivo nombra a personas ligadas a procesos de SECOP: los autores de las publicaciones van con atribución bibliográfica, y los procesos de las muestras de los estudios no se transcriben. Ningún archivo contiene la grafía antigua de la marca (verificado con `grep`). No se escribió `verificacion_adversaria`. No se tocó ningún otro archivo del repositorio.

## 9. Fichas
F-0641 a F-0691 (51 archivos en `research/fichas/`).
