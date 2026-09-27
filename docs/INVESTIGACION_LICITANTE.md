# Investigación · Qué mira primero quien licita obra, y las cinco cosas falsas que la lista dice hoy

> Para: dueño · Estado: informe fechado · Sustituido por: —

> Fecha: 26 y 27-sep-2026. Encargo del dueño: «pregúntate qué le importa a un ingeniero civil o a una persona que quiere
> licitar, qué es lo que realmente busca, cuáles son las prioridades, qué herramienta genera reprocesos, qué hace que se vuelva
> tedioso… primero define un plan, qué vas a investigar, qué prioridades, y luego cómo se puede aplicar». No cambia nada de la
> aplicación: lo que mueve una cifra lleva plan y visto bueno del dueño. Corrige en parte a
> `docs/reforma_datos/A5-necesidades-ingeniero.md` (13-sep, armada sin poder leer ninguna página).

## Cruce con `docs/INVESTIGACION_MERCADO_LICITADOR.md` (la otra investigación del mismo encargo, 26-27-sep)

Dos investigaciones independientes, con fuentes y agentes distintos, sobre la misma pregunta. **Coinciden** en lo que más
pesa: el tiempo que se va en ofertas que se pierden, el rechazo por un papel o un requisito descubierto tarde, los plazos
cortos de las modalidades pequeñas, el precio que se fija por porcentaje y no con cien APU, el revisor de la oferta que dice
«lista» sin estarlo, y la misma obra repetida en la lista (arreglada y en producción el 27-sep, #189). **Esta añade**: la
modalidad de selección como primera necesidad (decide cómo se gana, si hay aviso de interés y sorteo, si se pide registro),
la capacidad residual exigida donde la ley no la pide (interventoría y consultoría), el capital de trabajo que exigen los
pliegos, los contratos ganados en consorcio que no se ven y la competencia de la entidad que mezcla modalidades. **Discrepan
en una cosa, y es de dinero**: la otra propone «cuánto tarda en pagar esta entidad» (R-06) con `uymx-8p3j` y
`u99c-7mfm`; aquí la verificación adversaria lo tumbó con esos datos, porque `uymx-8p3j` mide cuándo se REGISTRA el pago,
no cuánto tarda (el Meta registra 415 de 417 facturas pagadas el mismo día), y el dueño retiró ese tema el 2-sep-2026. No se
construye sin volver a medirlo y sin su visto bueno.

## 0. En una línea

Quien licita obra decide primero por la **modalidad de selección** (cómo se gana, qué exige, qué plazos corren), después por **si cumple los requisitos que filtran** y por **cuánta competencia hay en esa modalidad**. Lo más valioso que puede hacer Detekta ahora no es añadir funciones: es **dejar de decir cinco cosas falsas y creíbles que hoy dice** (registro exigido en mínima cuantía, «sin aviso no puede presentarse» donde no hay aviso, sorteo donde no hay sorteo, capacidad residual en interventoría, competencia de la entidad que mezcla modalidades) y **subir la modalidad a la vista en la tarjeta**, como usted pidió.

---

## 1. Qué se investigó y cómo

**Pregunta madre** (del plan): qué decide, qué teme, qué le hace perder, qué le hace repetir trabajo y qué desearía tener quien licita obra civil —con oficio o empezando, persona natural o pyme— y cómo lo lleva Detekta a otro nivel sin decir nada falso.

**Método**, en seis pasos:
1. Barrido en 18 unidades de investigación: 8 de video (Y1 a Y8), 9 de web (W1 a W9: Colombia Compra Eficiente, gremios y estadísticas, academia, herramientas comerciales de Colombia y de fuera, foros, software de presupuesto, plata y descuentos, reglas de evaluación) y 1 de contraste documental (D1).
2. Agrupación en una lista única: **32 filas de necesidad**, de las cuales **31 son reales** (la N10 es una fila vacía por error de numeración, duplicado de N08).
3. Contraste con el árbol de Detekta para las **22 necesidades de mayor puntaje**: qué hay hoy, con qué dato abierto se atendería y qué propuesta sale.
4. Verificación adversaria de esas 22: **dos escépticos por propuesta** (uno contra la evidencia, otro contra la factibilidad y la verdad), **44 veredictos**.
5. Tres hojas de ruta desde tres miradas: quien empieza, el ingeniero con oficio y el dueño.
6. Esta síntesis.

**Cuántas fuentes.** Las unidades reportan **593 consultas** en total (suma de lo que cada una declara consultado; hay solapes entre unidades, así que no son 593 fuentes distintas). Las unidades de video declaran transcripciones leídas completas: Y1 21 (más 2 de otro agente), Y2 12, Y3 18, Y4 15, Y5 20, Y8 22; Y6 e Y7 no dan su cifra de transcritos. No se puede dar un total único de videos transcritos sin contar dos veces los que compartieron varias unidades: **sin cifra consolidada**.

**Qué falló** (lo más relevante; el detalle está en cada unidad):
- **YouTube bloqueó la IP compartida** (HTTP 429, «Sign in to confirm you're not a bot») el 26-sep: Y2, Y4 y Y5 perdieron transcripciones y comentarios; Y5 perdió 18 videos, entre ellos el de tarifas de pólizas de cumplimiento. Y6 encontró un cliente que funcionaba (`web_embedded` + node) y lo dejó en un guion de la sesión (no versionado).
- **Reddit, Trustpilot, G2, Capterra (por curl), Quora**: 403. Reddit se leyó por el archivo público arctic-shift. Las voces directas de usuarios de herramientas de fuera quedaron casi sin cobertura.
- **Normas**: funcionpublica.gov.co dio 503 o error de certificado varias veces; W8 y W9 lo resolvieron completando la cadena TLS con el intermedio oficial de Sectigo (sin desactivar la verificación). secretariasenado dio 503 en algunos momentos.
- **Tres enlaces de A5 están cortados** (Infobae, El Heraldo, Vanguardia) y no se pudieron comprobar (D1).
- **El cupo de búsqueda web se agotó** durante la verificación: varios escépticos no pudieron buscar contraevidencia adicional y lo declaran.

**Sesgo que hay que tener presente.** Un solo canal de YouTube, «Asesoría en Licitaciones» (una asesora que vende cursos y promociona buscadores de pago), aporta la mayoría de los videos útiles: 8 de 18 en Y3, 16 de 22 en Y8, 8 de 20 en Y5. Sus ejemplos son sobre todo de **bienes y servicios**, no de obra. Donde una necesidad descansa solo en ese canal cuenta como **una** fuente. Las voces independientes más sólidas son: los **Documentos Tipo** y sus matrices de observaciones, los **conceptos de Colombia Compra Eficiente** (cada uno responde a un peticionario distinto), la **CCI**, las **mediciones propias** sobre SECOP II y los **comentarios** de licitantes.

---

## 2. Lo que de verdad le importa a quien licita, en orden de prioridad

El orden sale de la evidencia **después de la verificación adversaria**, no del puntaje inicial: varias necesidades bajaron porque sus voces resultaron ser de un solo canal o de otro sector. Gravedad: *pierde plata* · *pierde proceso* · *pierde tiempo*. «Voces reales» es lo que quedó tras la verificación, no lo que declaraba la ficha.

| # | Necesidad | Quién | Gravedad | Fuentes que la sostienen | Voces reales | Cita literal (fuente) |
|---|---|---|---|---|---|---|
| 1 | **N03 · Ver la modalidad de selección y lo que implica** (cómo se gana, qué exige, qué plazos) | ambos | pierde tiempo; pierde proceso en el defecto de «sin manifestación» | Instrucción del dueño; Documento Tipo de menor cuantía de obra v3; invitación tipo de mínima cuantía; volúmenes medidos en p6dx-8zbt | 2 tras verificar (de 5 declaradas) | «hay posibilidad q una persona natural con ruta y cámara y comercio pueda entrar a licitar y en q modalidad podria buscar» (yt:MVxGGl9hJsI#comentario) |
| 2 | **N19 · Que la capacidad residual y el registro se exijan donde la ley o el pliego los piden** (obra sí; interventoría y consultoría no) | ambos | hoy le aconseja un socio innecesario (Helder) o le esconde el proceso (otros perfiles) | Ley 1150 art. 6 par. 1; Decreto 1082 art. 2.2.1.1.1.6.4; Guía CCE-EICP-GI-22; concepto C-1427 de 2025; pliego real de Medellín | 0 (defecto del producto con respaldo legal) | «La Capacidad Residual de contratación únicamente es exigido para los contratos de obra pública» (Guía CCE-EICP-GI-22, 2023) |
| 3 | **N31 · Saber si cumple el capital de trabajo que exige el pliego, y cuánto le baja el anticipo** | ambos | pierde proceso (rechazo por habilitante después de costear) | 10 de 10 pliegos de obra leídos lo exigen; Documentos Tipo LP v4, menor cuantía, social, agua potable, mínima cuantía | 0 sobre el capital exigido (la evidencia es documental) | «CTd = (POE - Anticipo o Pago anticipado) x 33%» (Documento Tipo LP de transporte v4) |
| 4 | **N11 · Revisar la oferta económica contra los errores de forma que la tumban** | ambos | pierde proceso | Causales de los Documentos Tipo de transporte; conceptos C-352, C-582, C-600, C-974, C-1255, C-1731 de 2025 y C-828 de 2026; Sociedad Caldense de Ingenieros | HMR Ingeniería (C-1255) y la Caldense, con nombre | «me rechazaron por una diferencia de precio Comparado con el valor del cuestionario» (yt:yQ-HxG7snPE, canal de asesoría) |
| 5 | **N25 · Saber si ESTE proceso quedó limitado a Mipyme y con qué socia puede entrar** | ambos | pierde el trabajo de la oferta; pierde el proceso si elige mal el consorcio | Decreto 1082 art. 2.2.1.2.4.2.2 a .4; conceptos C-482, C-1434, C-1182, C-1190 de 2025; 48 conceptos de 2025 sobre convocatorias limitadas | ~12 personas distintas en yt:neaGz7t9eUk, más yt:vWp7sYjuBKo | «Si registro una sucursal en boyaca ya puedo aplicar como MiPYMES departamental para boyacá?» (yt:neaGz7t9eUk#comentario) |
| 6 | **N05 · Saber cuánto le descuenta ESA entidad antes de fijar el precio** | ambos | pierde plata | ~10 normas leídas (Ley 1738/2014, DIAN 7086/2016, Ley 1697/2013 y Decreto 2642/2022, Ley 687/2001 mod. Ley 1276/2009); observaciones 63 y 65 de la matriz de los Documentos Tipo; un abogado | 2 de obra (observaciones escritas); 1 licitante sin sector | «Especialmente, no están siendo reconocidos los impuestos territoriales (estampillas)» (CCI, observación 65) |
| 7 | **N30 · Saber si hay anticipo y cómo paga la entidad, leído del pliego** | ambos | pierde plata (caja y capacidad) | Acta de Ibagué (40 %, campo abierto dice «No»); pliego de La Paz (100 % al liquidar); Res. MinSalud 1440 de 2024; medición en jbjy-vk9h + dmgg-8hin | 6 voces de un canal + gremio (2017) | «es muy importante tener en cuenta si el proceso de contratación tiene o no anticipo» (yt:yQ-HxG7snPE) |
| 8 | **N21 · Indicadores del consorcio con la fórmula de ESTE pliego** | ambos | pierde proceso | Medición propia: 46 de 241 pliegos de obra ponderan; Documento Tipo LP v4 num. 3.6; Manual CCE-EICP-MA-04 v3 págs. 35-36 | 3, todas de un solo canal | «En los pliegos tipo también se multiplica por el porcentaje de participación?» (yt:9ALEL2x9RiA#comentario) |
| 9 | **N23 · Manejar la cuenta del consorcio en SECOP II sin trabas** | ambos | pierde tiempo; pierde proceso si envía desde la cuenta equivocada (causal escrita, sin caso observado) | Guía CCE de proponente plural (25-ago-2026); causal en los tres Documentos Tipo de obra; concepto C-226 de 2026; medición propia (Helder en 48 cuentas) | ~8 sobre aceptación del socio, 4 sobre reutilizar cuentas, en 3 canales | «sigo con mas de 30 pestañas de proponentes plurales que he creado» (yt:WGt5-_9QDVw#comentario) |
| 10 | **N01 · Señales objetivas de si un proceso o una entidad «ya tiene dueño»**, como hechos y no como acusación | ambos | pierde plata (días de oferta en un proceso sin opción) | Encuesta CCI 2015 (248 constructores); La Silla Vacía con datos de CCE (11 de 37 procesos alteraban los códigos RUP); medición propia en p6dx | 3 comentaristas + 5 videos de asesores | «me dicen que todos los contratos ya estan amarrados con alguien antes de salir» (yt:pVjq88nooAM#comentario, rumor de segunda mano) |
| 11 | **N02 · Cuántos se presentan en procesos como este, por modalidad** | ambos | es sobre todo un **defecto de una cifra que ya decide** | Medición propia; CCE (archivos/27105) como contexto | 0 tras verificar (las 2 declaradas no eran de esto) | «El 2024 fue el año donde se han presentado más oferentes a los procesos con 16 […] habilitados con 12» (colombiacompra.gov.co/archivos/27105) |
| 12 | **N06 · Quien empieza: ruta sin mitos** (persona natural, sin registro en mínima cuantía) | novato | pierde plata; para Helder, bajo | Ley 1150 art. 6 (texto del D-L 19/2012); concepto C-175 de 2024 | ~10 comentarios, ninguno de obra | «¿para licitar se debe tener un gran capital?» (yt:7w9tBSj7-vk#comentario) |
| 13 | **N13 · Hasta dónde bajar el precio en ESTE proceso** | ambos | pierde proceso (sobre todo por el defecto de la curva) | Guía CCE-EICP-GI-27; Documentos Tipo LP v4 y menor cuantía v3; concepto C-982 de 2025; medición propia de bajas en mínima cuantía | 4 comentaristas (uno escéptico), peticionario del C-982, Constructora Calculada | «porfavor sería buenísimo que un próximo video hables más a profundidad del tema de cada metodo de ponderación mostrando ejemplos con la TRM» (yt:QJytDpcuAYw#comentario) |
| 14 | **N15 · Las fechas que valen** (tentativo frente a definitivo; la adenda que mueve el cronograma) | ambos | pierde proceso | Respuesta de la entidad a M&C Construcciones (SECOP DocumentId 826727136); concepto C-533 de 2026 | 1 de obra con nombre | «el plazo para la manifestación de interés se encontraba establecido hasta el 9 de julio de 2026» (SECOP DocumentId 826727136) |

**Lo que baja por debajo de la línea** (evidencia real pero delgada o ya cubierta): N22 reparto en consorcio (un solo canal; lo que hace perder ya está cubierto), N16 adendas (SECOP II ya avisa por correo y bloquea el envío; la única voz habla del botón de retirar), N18 visita de obra (6 de 39 pliegos con visita, 0 obligatorias), N04 días de pago (dos preguntas de novatos; ver §5 y §8), N07 descartar sin leer el pliego (la única voz colombiana dice lo contrario), N08 precios por región (una sola voz colombiana), N09 avisos (una voz de vendedor).

**Sin verificación adversaria** (se agruparon pero no pasaron por los escépticos; no las cite como hechos en pantalla): N26 pedir la limitación a Mipyme, N17 prórroga de la póliza de seriedad, N12 precio techo por ítem y AIU, N14 qué se subsana según la modalidad, N24 composición del plural fija desde la manifestación, N20 convenios solidarios con juntas de acción comunal, N32 pliegos escaneados, N28 trámite tributario del consorcio, N27 localía por departamento, N29 multas del socio.

---

## 3. Lo que más reproceso y tedio genera hoy, y qué usan para resolverlo

| Reproceso | Qué usan hoy | Fuente |
|---|---|---|
| **Buscar procesos cada día** y filtrar el ruido | Áreas de interés de SECOP II (gratis; traen ruido y avisan tarde), licitaciones.info (de $240.000 por 30 días a $2.000.000 por 28 meses, leído), Alicia, Licitarus, ContRadar, Power Query conectado a datos.gov.co | W4, Y8, yt:nyjc_eIMGcU |
| **Leer el pliego para contestar tres preguntas** (qué exige, cuánto, cuándo) | Leerlo entero; matrices propias en Excel; herramientas de IA de pago que «leen el pliego» | yt:K6m0iMMacWk, W4 |
| **Cuadrar la oferta en tres copias** (cuestionario de SECOP II, Excel, PDF) y transcribir el formulario de la entidad | A mano; se descarga la oferta ya radicada y se revisa documento por documento | N11, yt:uV2vXJaPKVA |
| **Calcular la capacidad residual y los indicadores del consorcio** proceso por proceso | El aplicativo de CCE (se vacía y se vuelve a llenar); un Excel gratuito de un asesor que ya no descarga y que, según un comentarista, «está mal calculado el indicador plural» | Y1, N21 |
| **Averiguar cuánto descuenta la entidad** | Observación a la entidad, revisar procesos anteriores de la misma entidad, el estatuto tributario de cada municipio, o un porcentaje a ojo | N05, yt:KMWd3IkbKro |
| **Armar el consorcio en SECOP II** | Reciclar cuentas viejas cambiando nombre e integrantes; videos solo para aprender a aceptar la invitación; mirar el selector de cuenta antes de enviar | N23 |
| **Vigilar adendas y fechas** | Revisar Notificaciones de SECOP II a mano; calendario o Excel propio | N16, N15 |
| **Cotizar insumos en otras regiones** | Proveedores y maestro de obra; la última cotización grande; Construdata (4 ciudades, segunda mano); APU de INVIAS por provincia | N08, W7 |
| **Liberar el cupo de la aseguradora** ocupado por seriedades de procesos perdidos | El corredor revisa SECOP a mano, uno por uno | Y5 (dos fuentes independientes; no pasó a necesidad) |

**Lo que venden las herramientas comerciales** (W4, W5): todas venden alertas por perfil, histórico, exportar a Excel y subcuentas; la nueva ola vende «leer el pliego con IA», cruce con el RUP y «cuánto ofertar». Varias exhiben una **«probabilidad de ganar» sin base declarada** (Licitarus «78 %», LicitIA «Score de Oportunidad»), lo contrario de la regla de Detekta. Ninguna calcula la oferta de obra con APU salvo PresuCosto, y ninguna cruza el pliego leído con el registro de proponente **y** con los socios concretos del usuario (esto último: sin verificar que ninguna lo haga).

---

## 4. Qué cubre ya Detekta, qué cubre a medias y qué no

Coordenadas medidas por los contrastes el 27-sep-2026 (árbol 6a90f6d). Algunas líneas de `public/app.js` se corrieron durante el día: ubíquelas con `node tests/mapa.js`.

### Cubre bien
- **Manifestación de interés con horas y plazos**: `lib/manifestacion.js` (aplicarSenalSecop :253, pliegoDesmentido :272), `lib/cronograma.js` horaEnLinea :124, alertas en `lib/seguimiento.js` :618-:690, correo diario op=avisos.
- **Regla 50/5/10 del consorcio y tope del 10 %** para quien no aporta experiencia: `lib/reparto.js` reglaExperiencia :199 y frases :305, :693, :711.
- **Factor de experiencia de la capacidad según la participación**: `lib/capacidad.js` detalleCrp :180-:218.
- **Frontera del reparto** (dónde se rompe): `lib/reparto.js` fronteraReparto :437; recomendación con pliego leído, `lib/consorcio.js` recomendarReparto :386.
- **Cálculo del plural con tres fórmulas** en el reparto recomendado: `lib/perfiles.js` :392-:431, `lib/reparto.js` :398-:480.
- **Filtro por modalidad** con 7 opciones y conteo: `public/filtros.js` :48, `lib/filtros_lista.js` :139.
- **Explicación en llano de la modalidad**: `lib/guia_proceso.js` modalidadEnLlano :127 (solo en Mis procesos).

### Cubre a medias (y en varios casos dice algo falso)
- **N03 Modalidad en la tarjeta**: es un chip gris con el literal crudo, **plegado en «Más detalles»** (`public/app.js` ~:2556, hoy ~:2657). **Defecto reproducido**: para «Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes», `exigeManifestacion` da false pero la guía dice «Sin ese aviso no puede presentarse» (25 procesos de obra desde el 1-jun). **Hermano**: «Subasta de prueba» entra al corpus como subasta real (75 procesos, todos con precio_base 0).
- **N06 Registro de proponente en mínima cuantía**: `lib/guia_proceso.js` :330-:346 exige el requisito «registro» en todas las modalidades. **Reproducido**: CO1.REQ.11013791 dice «Sin el código en el registro, la oferta se rechaza»; la ley no exige registro en mínima cuantía. Cinco menciones del registro en la guía de mínima cuantía, no tres.
- **N19 Capacidad residual**: `lib/puertas.js` p2K :148 y `lib/rup.js` evaluarRup :96-:110 la aplican a todo tipo de contrato. **Reproducido con filas reales**: con el perfil de Helder, 5 interventorías y consultorías salen «alcanza con Génesis/PRODIAC» (un socio que la ley no pide para eso); con los perfiles pics y juntos, 7 y 1 desaparecen. Caso de prueba: Medellín CO1.REQ.11076480 (interventoría de 9.089 M, pliego sin mención de capacidad residual).
- **N02 Competencia**: `lib/indice_competencia.js` acumular :558 guarda un histograma por entidad **sin modalidad**; ese promedio mezclado alimenta el filtro competencia_entidad, el orden y p_ganar (`lib/handlers/procesos/listar.js` :162 y :696). **Medido**: 1.085 de 2.559 menores cuantías de obra territorial (2024-2025) caen bajo un promedio de entidad que es al menos el doble del de su propia modalidad.
- **N01 Concentración del ganador**: existe (`lib/indice_competencia.js` ganadoresDe :756, `lib/competencia_detalle.js` lecturaDe :209) pero **a un clic**, en el modal; `lecturaDe` decide con el porcentaje **redondeado**. La tarjeta solo avisa si el promedio de oferentes es menor que 2.
- **N11 Revisión de la oferta**: `lib/formulario1.js` validarFormulario1 :250 con 8 validaciones. **Tres defectos reproducidos**: (a) con cualquier pliego numerado dice «faltan todos los ítems… motivo de rechazo automático» (las filas guardan `codigo` y la revisión busca `numeral`); (b) da «lista» con $125.000.000 mientras el TOTAL del Excel dice $125.950.000 (IVA sobre la utilidad); (c) cantidad ilegible entra como 0 (`app.js` :8220 y hermanos :7326, :7802, :6655). Además, `FUNDAMENTO.secop` afirma un rechazo universal que los conceptos de CCE no sostienen.
- **N13 Precio**: `lib/apu/rentabilidad.js` pGanarPorPrecio :164 **dice «se sortea en la audiencia» en una mínima cuantía** (reproducido). `docs/MEMORIA.md § «Los 4 métodos de ponderación económica y cómo se sortea»` y `lib/guia_proceso.js` :152 describen la regla vieja de la TRM («primer decimal», «TRM del día»); los Documentos Tipo vigentes usan los centavos y otra lista de métodos.
- **N05 Deducciones**: el lector existe (`lib/deducciones.js`, op=deducciones) pero **ninguna pantalla lo llama**. El expediente (`lib/documentos_proceso.js` :300, :471) rotula todo como «Estampillas departamentales y municipales», repite «(5 %) (5 %)», mezcla la retención (que vuelve) con lo que se pierde y pierde la página (reproducido). La guía sigue diciendo «0,5 % a 5 % acumulado» sin fuente aunque el pliego declare 7,5 %. Enlazarlo a Precios está **APARCADO por usted** (`docs/MEMORIA.md § «Lo APARCADO por decisión del dueño (20-ago-2026)»`).
- **N30 Anticipo**: Mis procesos lo clasifica sí/no/mención sin porcentaje (`lib/documentos_proceso.js` :315-:321); la forma de pago es un texto genérico (`lib/dictamen_reglas.js` :54).
- **N21 Indicadores del consorcio**: la casilla juzga con la fórmula de suma aunque el pliego leído pondere. **Reproducido**: Helder + Génesis 50/50, capital de trabajo «cumple» con 936.199.572; con la fórmula del pliego son 468.099.786. La frase «la parte que pone cada una no los cambia» (`app.js` :5453, :10324) se dice sin condición.
- **N15 Fechas**: `loQueDicen` muestra la fecha del pliego aunque una adenda leída la haya movido; un hito del proyecto de pliego sale como «cronograma del pliego» (los dos reproducidos).
- **N25 Limitación**: `lib/socio_por_proceso.js` avisoMipyme :125 solo avisa por monto; el lector del pliego devuelve un Map vacío con tres cláusulas de limitación (reproducido).

### No cubre
- **N31 Capital de trabajo exigido frente al del registro**: no existe. **Reproducido**: Génesis en una licitación de 1.000 M a 6 meses sin anticipo sale en verde; le exigirían 330 M y tiene 193 M.
- **N23 Cuentas de consorcio en SECOP II**: nada. Y un **defecto hermano confirmado**: los contratos ganados en consorcio no se ven (`lib/socio.js` :282, `lib/handlers/perfil/seguimiento.js` :404 consultan por documento_proveedor, que en consorcio viene «No Definido»). Ejemplo: el contrato de la UPN por $738.569.213 (Helder 60 %, Génesis 40 %). Eso **infla la capacidad residual** de Helder.
- **N25 Domicilio de cada socia**: no existe como campo.

---

## 5. Qué contradice o corrige de A5 (13-sep)

A5 se armó sin leer ninguna página (la red estaba cerrada ese día). Lo que cambia:

1. **Faltaba la modalidad como necesidad propia.** A5 solo la tenía dentro de «¿cuánto bajo?». La evidencia la pone primera: decide cómo se gana, si se pide registro, si hay aviso de interés y sorteo, los plazos de observaciones, traslado y adendas, y cuánta competencia llega.
2. **E1 / P3 (capacidad residual como puerta general)**: corregido. Es de obra; en interventoría y consultoría produce el falso negativo que en oportunidades es el error caro.
3. **E8 (adendas «Existe»)**: corregido. Hoy no hay en los datos abiertos una señal oportuna de adenda: `dmgg-8hin` llegaba hasta el 22-sep medido el 27-sep (5 días de atraso) y `fecha_carga` no trae hora. Además el clasificador no reconoce «ADENDA2_1» (reproducido). Queda verificado que `lib/adendas.js` usa p6dx-8zbt.
4. **E4 (anticipo «parcial, honesto»)**: la premisa era que el dato abierto no trae el anticipo; en realidad **trae un «No» que puede ser falso** (Ibagué, 40 %). Además hay 53 contratos «No» con valor de anticipo mayor que 0.
5. **Días de pago**: A5 decía que no se pueden medir con datos abiertos. El conjunto `uymx-8p3j` sí trae fecha de recepción y fecha real de pago. **Pero la verificación tumbó usarlo** (ver §8): mide cuándo se registra el pago, no cuánto tarda.
6. **E5 (quién gana en la entidad)**: la base con solo p6dx casi no cuenta a los consorcios (en las adjudicaciones a consorcios falta el departamento del ganador en el 98,9 %); resolviéndolos por integrantes (`ceth-n4bn`) la falta baja al 21,9 %.
7. **E9 / §6.2 (reparto)**: el consejo de «un mínimo del 30 % al 40 %» sigue sin fuente. Lo escrito en el pliego tipo LP v4 es el tope del 10 % para quien no aporta experiencia.
8. **E15 (Mipyme)**: Detekta no sabe si ESTE proceso quedó limitado; la señal existe en los nombres de archivo de `dmgg-8hin` (27.703 archivos con «MIPYME» desde el 1-ene-2026).
9. **E2 / P5 (índice de baja)**: A5 no recogía que en mínima cuantía no hay sorteo, ni el umbral del 20 % de la guía de CCE.
10. **Enlaces de A5 cortados** (D1): Infobae, El Heraldo y Vanguardia devuelven 404 o portada; la cifra de «$500.000 M» de la CCI no se pudo comprobar por esa vía.

---

## 6. Hoja de ruta unificada

Criterio común a las tres miradas: **primero se corrige lo que hoy dice algo falso, después va lo nuevo**. La marca **[VB]** señala lo que mueve un precio, un veredicto o un filtro que esconde procesos: lleva plan, su visto bueno, prueba por mutación y revisión adversaria antes de tocar código.

### Inmediato (horas)

| Pieza | Qué gana usted | Cómo, en una línea | Dónde |
|---|---|---|---|
| **N03 · Modalidad a la vista con «cómo se gana»** | Sabe qué tipo de proceso es y con qué estrategia entrar sin abrir nada | Primero, `modalidadEnLlano` llama a `exigeManifestacion` y conserva su clave (arregla el «sin ese aviso no puede presentarse» falso). Luego una frase de 70 caracteres o menos que solo dice lo que la modalidad asegura; sin TRM, sin documento tipo, sin «audiencia». Viaja en op=listar; si no hay modalidad publicada, no hay línea | Tarjeta (sitio exacto: decisiones 3 y 6 de la maqueta) |
| **N06 · Registro de proponente en mínima cuantía** | No descarta una obra pequeña por un requisito que la ley no pide | Cada modalidad declara `pide_registro` con su fuente (Ley 1150 art. 6, texto del D-L 19/2012); null en régimen especial; si el pliego leído lo pide, gana el pliego. Censo de todas las cadenas de la guía | Mis procesos; en la tarjeta, el rojo pasa a ámbar |
| **N13' · «Se sortea» donde no hay sorteo** [VB] | Precios y Mis procesos dicen lo mismo del mismo proceso | Se corrige el **texto** por modalidad y se deja de modular la probabilidad por precio en mínima cuantía, diciendo por qué. **No** se pone pi=1: multiplicaría la cifra por 4 o por 0,1 con dos puntos de baja | Precios |
| **N21 · Cobertura de intereses «indeterminada»** | No le dan por cumplido algo que no cumple | Una sola función `veredictoIndeterminado`: habilitado solo con utilidad operacional sumada ≥ 0 (Documento Tipo LP v4, num. 3.6) | Mis procesos (latente: los cuatro perfiles tienen gastos de intereses) |

### Mediano (días)

| Pieza | Qué gana usted | Nota |
|---|---|---|
| **N23-D · Contratos ganados en consorcio que Detekta no ve** | Una capacidad residual que no se infla en silencio | Va **primero** en las tres miradas. Entrar por `ceth-n4bn` (codigo_grupo = codigo_proveedor) y ponderar por participación |
| **N11-A · El revisor de la oferta deja de mentir** [VB] | No sale «lista» con un total que supera el presupuesto, ni «faltan todos los ítems» con una oferta idéntica | Leer `codigo`; cantidad ilegible = null en todos los hermanos; IVA sobre la utilidad según la variante leída; limpiar al cambiar de proceso; la consecuencia de la diferencia con SECOP II se dice según la modalidad |
| **N19 · Capacidad residual solo donde la ley la pide** [VB] | Deja de aconsejarle un socio en interventorías | Una función `kAplica` con orden explícito (régimen especial → null primero; obra → true; interventoría/consultoría → false) y un **censo** de todos los módulos que juzgan la K |
| **N31 · Capital de trabajo exigido** [VB] | No costea una oferta que rechazarán por un habilitante | Cifra exacta solo en Mis procesos con la fórmula leída del pliego (hay al menos tres familias). En la tarjeta, ámbar solo en licitación y menor cuantía con plazo publicado menor de 12 meses. Nunca bloquea |
| **N21 · Indicadores del consorcio con la fórmula del pliego** [VB] | No sale «cumple» sumando cuando el pliego pondera | Verde solo si cumple con las tres fórmulas (la regla que usted ya fijó para el reparto); capital de trabajo juzgado aparte |
| **N05 · Lo que la entidad le descuenta** [VB; reabre algo que usted aparcó] | Precio y margen con los descuentos reales, sin copiarlos a mano | Una sola función de totales; manda la adenda; lo que se pierde separado de lo que vuelve; botón solo con lectura limpia; sin pliego, «el pliego no las declara», nunca el rango del manual. **Antes**: medir cuántos pliegos guardados los traen legibles |
| **N30 · Anticipo y forma de pago, leídos del pliego** | Sabe si tiene que financiar el arranque o la obra entera | Porcentaje con regla estrecha (excluye garantía, amortización, desembolso); «paga al final» solo con «100 %» junto a recibo final o liquidación. No toca la caja |
| **N15' · Las fechas que valen** | No confunde el cronograma del proyecto con el definitivo | La adenda gana solo si trae un marcador de valor nuevo («debe decir») y una sola fecha; si no, se calla y se remite a la adenda. Lo del proyecto de pliego dice «puede cambiar» |
| **N25 · ¿Quedó limitada, y con qué socia puede entrar?** | Deja de armar un consorcio que no cabe | «Limitada» solo con cláusula de decisión leída y su página; PRODIAC (gran empresa) «no puede» solo con eso; domicilio y persona natural en ámbar |
| **Frases del consorcio por modalidad** (N23 + N22) | No pierde una oferta por la cuenta equivocada | Menor cuantía: «manifieste una sola vez, desde la cuenta del consorcio»; toda oferta: desde la cuenta del consorcio; el reparto no cambia después del cierre |

### Apuestas grandes (semanas)

1. **N02 + N01 · La competencia por modalidad** [VB]. Reconstruir el índice por proceso y por modalidad: cuántos se presentan, cuántos con un solo oferente frente a la tasa de su modalidad, y concentración del ganador sin acusar. Es lo que más cambia la cifra que hoy decide el filtro, el orden y p_ganar.
2. **N25 etapa 2 · Índice de documentos de limitación** en `dmgg-8hin`, incremental dentro de las tandas de 45 s del sync. La tarjeta dice «hay un documento sobre limitación: ábralo» o «no limitación (acta, fecha)»; sin documento, nada.
3. **N11-B · Cuadre de tres sobre el Formulario 1 que se radica**, no sobre el Excel de ayuda de Detekta.
4. **N23 · «Sus consorcios en SECOP II»** en Mi empresa: qué cuenta tiene exactamente estos socios. Sin «candidatas a reutilizar».
5. **Historia de la entidad** (anticipo por modalidad, siempre «al menos»; estampillas por NIT): como contexto, nunca como promesa ni en la tarjeta.
6. **N13 · Curva de precio propia de mínima cuantía** desde las bajas ganadoras, con n ≥ 5.

### Dónde discrepan las tres miradas

| Tema | Quien empieza | Con oficio | Dueño | Cómo se resuelve aquí |
|---|---|---|---|---|
| N11-A (revisor de la oferta) | Inmediato | Mediano | Inmediato | **Mediano**: es [VB] y toca varios hermanos |
| Frases del consorcio (N23 + N22) | Mediano | **Inmediato** | Apuesta grande | Mediano: son textos, pero dependen de la modalidad bien clasificada (N03 primero) |
| N25 limitación | Mediano | Mediano | **Apuesta grande** | Mediano la lectura en Mis procesos; apuesta grande el índice para la tarjeta |
| N22 «experiencia que le queda» | Una línea | Una línea | No aparece | Solo si usted confirma que decide su parte por eso |
| Excluir «Subasta de prueba» | [VB] | No aparece | [VB] aparte | Espera su visto bueno: es un filtro que esconde |
| Lo que Detekta puede reunir de la entidad | Poco | Apuesta grande | «Lo propio de Detekta es cruzar pliego + registro + socias» | Coinciden en que va después de corregir lo falso |

**Una medición previa que las tres miradas piden y nadie hizo**: 5 de 28 obras abiertas de mínima cuantía se perderían en la ingesta por `sin_unspsc_ni_obra` (`lib/filtros.js` :618 no mira `tipo_de_contrato`). Si se confirma, es un falso negativo en oportunidades y pesa más que cualquier texto. **Sin verificar por los escépticos.**

---

## 7. Qué cambia en el rediseño de Licitaciones

### La tarjeta: qué mira primero quien licita (seis piezas, en este orden)

Las tres miradas coinciden en las seis piezas; el orden sale de lo que la evidencia dice que se mira primero.

1. **Qué, de quién y dónde**: objeto, entidad, municipio. Si la entidad es nacional con sede en Bogotá, la zona no dice «Su zona (Bogotá)» (ver §8, regla acotada).
2. **La modalidad de selección y cómo se gana** — **se queda, a la vista, fuera de «Más detalles»**, por instrucción suya y porque la evidencia lo sostiene. Nombre de la modalidad más una frase corta. Ejemplos que resistieron la verificación:
   - «Mínima cuantía · gana el menor precio que cumpla»
   - «Licitación pública · gana por puntaje: bajar el precio no basta»
   - «Menor cuantía · primero avise que le interesa; puede haber sorteo»
   - «Menor cuantía sin aviso previo · se oferta directamente»
   - «Concurso de méritos · compite la experiencia, no el precio»
   - «Régimen especial · reglas propias: lea el manual de la entidad»
   El chip y la frase salen del **mismo clasificador** (`modalidadEnLlano`), para que el chip no diga una cosa y la frase otra.
3. **Cuánto y cuándo**: presupuesto publicado y la fecha que vence primero (en menor cuantía, el aviso de interés; si no, el cierre).
4. **¿Puede presentarse?**: una sola línea con el peor veredicto y su causa (capacidad donde la ley la pide, capital de trabajo, registro donde aplica) y la socia si hace falta. **Ante la duda, ámbar; nunca esconder** (el falso negativo es el caro en oportunidades).
5. **Competencia en esa modalidad**, solo cuando exista el índice segmentado y solo si la entidad se sale de lo normal para su modalidad. Mientras tanto, la cifra actual rotulada «promedio de la entidad en todas sus modalidades». Siempre «se presentaron», nunca «compiten» ni «habilitados».
6. **Limitación a Mipyme**, solo si hay un documento publicado («Hay un documento sobre limitación: ábralo» o «No limitación, acta del dd-mm»). Sin documento, la tarjeta calla: la falta de documento no significa que esté abierta.

### El detalle (Mis procesos y modal de la entidad)

- La explicación completa de la modalidad y el consejo de precio; el método del precio **según el documento tipo leído** (centavos de la TRM en LP v4; TRM del segundo día hábil tras el traslado en menor cuantía v3; sin tabla si no se reconoce el documento tipo).
- Descuentos de la entidad con su página (N05), anticipo y forma de pago (N30), capital de trabajo exacto (N31), indicadores del consorcio con la fórmula leída (N21), con quién puede entrar (N25), fechas vigentes (N15'), cuadre de la oferta (N11).
- «Quién gana aquí», con el nombre **solo con credencial** (N01), y el lado que desmiente el rumor: «aquí ganaron 9 contratistas distintos en 12 obras».

### Nunca en pantalla
- «Probablemente limitada» deducido de la modalidad (sería un calculado presentado como hecho).
- La historia de anticipo de la entidad junto al porcentaje de anticipo que usted necesita.
- Una «probabilidad» sin base; «amañado», «a la medida de» o cualquier palabra de acusación.
- Las cifras de esta investigación sin volver a medirlas con el corpus y el filtro de Detekta.

---

## 8. Lo que cayó en la verificación y por qué (para no volver a proponerlo)

| Propuesta o afirmación | Por qué cayó |
|---|---|
| **Días de pago por entidad (N04) con `uymx-8p3j`** | Mide cuándo se **registra** el pago, no cuánto tarda: el Meta registra 415 de 417 facturas pagadas el mismo día; en Invías 110 de 177 traen la fecha real igual a la estimada; la mediana deja fuera las facturas recientes sin pago (Invías: 69 de 104 sin fecha de pago mientras la prensa reportaba mora). Además, **usted retiró este tema el 2-sep-2026** (`docs/MEMORIA.md § «Don Héctor · las decisiones del dueño y las tomadas con autonomía (2-sep-2026, misma tarde)»`). No se reabre sin preguntarle |
| **Proponer en Precios un plazo de cobro medido menor que 60 días** | Bajaría el capital de trabajo: falso positivo caro en APU. Y `editor.js` :815 convierte un 0 en 60 en silencio |
| **«Lo que cobró el ganador por este ítem» (N08)** | En la muestra, 111 de 123 unitarios del ganador son idénticos al oficial y los 12 restantes bajan exactamente 15,5 %: es la lista oficial con un descuento parejo, no un costo. En Tolima solo 0,8 % de las filas llega a 5 o más entidades y el rango va de 3 a 6 veces. Anclaría un precio ajeno |
| **Botón «¿Qué pide el pliego?» en cada tarjeta y lectura en lote (N07)** | El extractor da cifras falsas creíbles («patrimonio autónomo» leído como patrimonio; «sumatoria» comparada contra un solo contrato; el presupuesto leído como capital de trabajo). La única voz colombiana defiende leer el pliego entero. Y la modalidad **no** debe esconderse detrás de un botón |
| **Aviso diario de «nuevos que usted puede tomar» (N09)** | El correo **no está configurado en producción** (faltan CORREO_API_KEY, CORREO_REMITENTE, CORREO_DESTINO). La queja del ruido regional es de un vendedor |
| **Regla «entidad de orden Nacional → sitio de obra desconocido» para todas** | `ordenentidad` marca como «Nacional» a 160 alcaldías y a CORTOLIMA. Solo vale si además la sede es Bogotá D.C. |
| **Aviso urgente de adenda «usted ya presentó» (N16)** | Con 5 días de atraso de `dmgg-8hin`, en mínima cuantía 4 de cada 5 avisos llegarían después del cierre. SECOP II ya avisa por correo y bloquea el envío hasta aplicar la modificación |
| **Visita de obra «el mismo día», detector de puntaje y borrador de observación (N18)** | 6 de 39 pliegos con visita, 0 obligatorias; «puntaje» es un solo caso de régimen especial; el borrador saldría en ~85 % de las obras. Pascual Bravo era de aires acondicionados, y CREMIL sí repitió la visita |
| **Piso de descuento leído del pliego como cifra (N13)** | Ningún Documento Tipo de obra trae ese piso y prohíben añadir causales; el «100 al 97 %» era de una menor cuantía y de un video de bienes. Leerlo daría falsos límites (anticipo, AIU) |
| **pi = 1 en mínima cuantía** | La curva sin calibrar multiplica la probabilidad por 4,4 o por 0,007 con dos puntos de baja |
| **Aviso de «ventanas cortas» de horas y publicación nocturna (N15)** | Ningún dato abierto trae la bandeja de mensajes ni la hora. El caso de 2-3 horas es un ejemplo hipotético de un curso |
| **«Fijar este reparto» con NIT y almacenamiento (N22)** | Sin voces de licitante que lo pidan; no hay causal por diferencia de porcentajes entre SECOP II y el acta. Lo que hace perder ya está cubierto |
| **«Candidatas a reutilizar» entre las cuentas de consorcio** | El acta de conformación va anexa a la cuenta; una cuenta vieja lleva el objeto de otro proceso |
| **Paso «los socios aceptan con días de margen»** | La guía oficial de CCE no lo describe; el plazo no tiene fuente |
| **Tipo de documento «limitación» en `RE_TIPO`** | Tomaría 739 **solicitudes** de proponentes como decisiones y quitaría el tipo «pliego» a 36 pliegos |
| **Cifras citadas que no se reprodujeron** | «23 de 237» entidades concentradas (salió 20 o 31 de 258); licitación con 7,7 % de un solo oferente y «1 de cada 13» (se contaron filas, no procesos: por proceso es 17,1 %); «722 salen hoy Su zona (Bogotá)» (son 736 publicaciones, 491 obras, de cualquier estado); «el 33 % es cota superior» del capital de trabajo (Sucre exige 50 %) |
| **Citas mal leídas** | La CCI «32 %» es una inferencia de la autora, no una causa medida; la reseña «S1 o S2» habla de SECOP I y II, no de modalidad; yt:kAn1o0LmHJM habla de productos; la cita de M&C se recortó (no hubo falla de la plataforma: el proceso seguía en proyecto) |
| **N10** | Fila vacía, duplicado de N08: sin esfuerzo ni peso |

---

## 9. Lo que no se pudo verificar

- **Frecuencias**: cuántos rechazos reales hay por ofertar desde la cuenta equivocada (no se encontró ninguno); cuántos pliegos de obra traen deducciones legibles; con qué frecuencia la cláusula de deducciones aparece repetida en la minuta (causaría suma doble); cuántas adendas usan la redacción «dice / debe decir».
- **Las 5 de 28 obras de mínima cuantía perdidas en la ingesta** (`sin_unspsc_ni_obra`).
- **Norma**: si una empresa de Bogotá cuenta como local en una limitación a Cundinamarca; cómo cuenta el año de existencia de una persona natural para la limitación; la base legal exacta de la «menor cuantía sin manifestación» (probablemente Decreto 1082 art. 2.2.1.2.1.2.22, no leído); el concepto C-533 de 2026 en su texto completo; qué versión del documento tipo rige para infraestructura social y agua en cada método del precio.
- **Datos**: si `ceth-n4bn` lista a un integrante antes de que acepte la invitación; si una cuenta de consorcio con ofertas se puede editar; si Helder es responsable de IVA como persona natural (pregunta para usted: cambia el IVA sobre la utilidad en su Excel).
- **Cifras de fuentes de segunda mano, que no van a pantalla**: el «8 al 17 %» y el «30 % en Cali» de estampillas; CCE sobre transporte (4.004 licitaciones por $25 billones); Banco Mundial «31 a 90 días»; CCI «ocho meses» y «$500.000 M»; Construdata «4 ciudades»; los pisos nacionales de anticipo (10,9 %, 5,3 %, 1,4 %) y el «16 de 26».
- **Diez necesidades sin verificación adversaria**: N12, N14, N17, N20, N24, N26, N27, N28, N29, N32.
- **Si alguna herramienta comercial ya cruza pliego + registro + socios concretos**: no se revisaron todas.
- **Preguntas que solo usted puede contestar**: si Helder ya abre Licitaciones a diario y si recibe los correos de áreas de interés y de adendas de SECOP II; si decide su parte en el consorcio pensando en la experiencia que le queda; si alguna vez tuvo que volver a costear por un presupuesto ajustado.
