# PLAN X20 · Adjudicar más contratos con Detekta (11-nov-2026)

> Para: dueño · Estado: pendiente del dueño · Sustituido por: —

Este documento es la planeación que pidió el dueño el 11-nov-2026: qué tiene Detekta, qué funciona, qué no, qué defectos hay y qué falta para «adjudicar la mayor cantidad de contratos posible». Nada de código se tocó para escribirlo. Cada cifra lleva su fuente y su fecha; lo medido en esta sesión se puede repetir con `tools/analisis/plan_x20/` (Anexo C). Lo que no se pudo comprobar está dicho en la sección 1.3.

## 0. En una página

**Lo que pidió.** Un plan para multiplicar por 20 lo que Detekta le ayuda a adjudicar, partiendo de que con sus registros cumple en casi todos los procesos de manifestación de interés y de que quedó dos veces por fuera «por la oferta económica».

**Tres premisas que los documentos corrigen.**

1. En la convocatoria de la Universidad Pedagógica (UPN-VAD-CP-011-2026) la oferta no quedó por fuera por el precio: quedó NO HABILITADA por experiencia. El integrante que acreditaba la experiencia tenía el 35 % del consorcio y los términos pedían el 40 %. El precio nunca se calificó.
2. En Cali (Santa Elena) la oferta no fue rechazada: quedó habilitada y de última entre cinco, porque su precio (96,75 % del presupuesto) estaba por encima de todas las demás ofertas hábiles (93,30 % a 95,56 %). Con ninguno de los cuatro métodos habría ganado.
3. El precio sí importa, pero cuánto importa depende de cuántos compiten, y los dos procesos estaban en la esquina más peleada del mercado: Bogotá y contratos de más de $1.000 millones.

**Lo que se midió hoy en los datos abiertos de SECOP II** (menor cuantía de obra, adjudicada, con recepción de ofertas desde el 1-nov-2025):

| Hecho | Cifra |
|---|---|
| Procesos adjudicados | 2.622 |
| Con UNA sola oferta | 50,9 % |
| Con una o dos ofertas | 67,8 % |
| A cuánto se adjudicó con una oferta (mediana) | 100,00 % del presupuesto |
| A cuánto con 5 a 9 ofertas (mediana) | 95,09 % |
| A cuánto con 10 o más (mediana) | 92,44 % |
| Procesos de 2026 que el historial de su entidad anunciaba con poca competencia | 760 en todo el país (unos 74 al mes) |
| De esos, en el Tolima, el Huila y Cundinamarca | 174 (unos 17 al mes) |
| De los 760, los que en efecto tuvieron una o dos ofertas | 90,7 % |
| De los 760, los que tuvieron una sola | 74,1 % |

**La tesis.** El x20 no sale de afinar el precio en los procesos donde llegan diez. Sale, en este orden, de: (1) ir a los procesos donde llegan una o dos ofertas, que Detekta puede anunciar (acierta en nueve de cada diez que serán una o dos, y en tres de cada cuatro que será una sola); (2) presentar muchas más ofertas (hoy constan dos en 2026); (3) no perder ninguna por estructura, papeles o puntos; y (4) poner el precio según cuántos van a competir.

**Lo primero que se construiría** (sección 7): el aviso diario de procesos nuevos ordenado por competencia esperada, el simulacro de evaluación antes de manifestar interés, y la referencia de precio según el número de oferentes.

**Lo que decide usted** (sección 9): en qué departamentos y hasta qué tamaño trabaja, cuántos contratos puede ejecutar a la vez, si prefiere más contratos o más utilidad por contrato, y por dónde quiere recibir el aviso diario.

## 1. Cómo se hizo y qué vale cada cifra

### 1.1 Fuentes y fecha

- **El árbol**, medido el 11-nov-2026 sobre el commit `90b98ab` con `node tests/estado.js`, `node tests/mapa.js` y la suite completa.
- **Datos abiertos** (datos.gov.co, consulta del 11-nov-2026): procesos de SECOP II (`p6dx-8zbt`) y ofertas por proceso (`wi7w-2nvm`). Los scripts y el resultado están en `tools/analisis/plan_x20/`.
- **Los dos procesos del diagnóstico**: el repositorio hermano `detekta-lector` (caso Santa Elena) y, para la Universidad Pedagógica, el informe de evaluación del 10-sep-2026 y los términos de referencia que están en su Drive, leídos por un subagente de esta sesión.
- **Normas**: los documentos tipo, el Decreto 1082 de 2015 y la guía de Mipyme, bajados el 11-nov-2026 de Colombia Compra Eficiente y de Función Pública (Anexo B).
- **La crónica del proyecto** (`docs/MEMORIA.md`), citada por título de sección y con su fecha.
- **Una revisión adversaria** del plan y de su medición, hecha por un subagente que no los escribió y con una reproducción por hallazgo. Corrigió seis puntos (están en la memoria de este plan) y volvió a medir por su cuenta las cifras centrales, que resistieron.

### 1.2 Cómo leer la evidencia

Cada afirmación lleva una de tres marcas. **M**: medido o ejecutado en esta sesión. **L**: leído en un archivo o en una sección de la memoria, con su fecha. **I**: inferencia; se dice qué la confirmaría.

### 1.3 Lo que no se pudo verificar

- **Producción.** `https://detekta-app.vercel.app` responde 302 sin sesión: no se leyó la salud, ni sus procesos guardados, ni cuántas evaluaciones hay capturadas. El estado del correo y de la copia de seguridad viene de la memoria, con su fecha.
- **Cuántas ofertas presentó usted y con qué resultado.** Constan dos en 2026 (Cali y la Universidad Pedagógica). Si hubo más, solo lo sabe usted (decisión 5 de la sección 9).
- **Quién quedó hábil** en los procesos de los datos abiertos: no se publica. Por eso las cuentas de precio de la sección 2.5 son una referencia «con todas hábiles» y no una probabilidad.
- **Si una convocatoria quedó limitada a Mipyme del territorio**: no está en los datos abiertos; está en los documentos de cada proceso.
- **Tres revisiones de apoyo** (norma, camino del precio y preparación de la oferta) se cortaron por el límite de uso de la cuenta. Lo que dejaron ejecutado y escrito se leyó y se volvió a correr donde decide algo; lo demás no se usó.
- **Adendas 1 a 4, informe definitivo y resolución** de la convocatoria UPN-VAD-CP-011-2026: no están en la carpeta del Drive. La adjudicación consta en los datos abiertos.

## 2. Dónde se pierden y dónde se ganan los contratos

### 2.1 Los dos procesos

**Cali · 4151.010.32.1.1255-2026 (Santa Elena).** Selección abreviada de menor cuantía con documento tipo. Presupuesto del pliego definitivo: $1.581.425.810. La fila de observaciones de SECOP II traía $1.744.426.146, el del proyecto de pliego; desde la manifestación de interés trae el definitivo (medido por la revisión adversaria).

| Proponente | Oferta | % del presupuesto | Resultado |
|---|---|---|---|
| Consorcio C18 | $1.475.444.680 | 93,30 | Hábil |
| Consulcon Proyectos de Ingeniería SAS | $1.485.289.767 | 93,92 | Hábil |
| Concretar 2026 | $1.488.423.398 | 94,12 | Hábil · ganó |
| UT Emimajo Ingeniería | $1.506.519.257 | 95,26 | Rechazada |
| Worldtek SAS | $1.511.179.252 | 95,56 | Hábil |
| Consorcio Infraestructura 1A | $1.530.029.471 | 96,75 | Hábil · 5.º de 5 |

- **M** · Con el motor de los cuatro métodos del repositorio, la oferta propia queda quinta con los cuatro: mediana, media geométrica, media aritmética baja y menor valor. Con media geométrica, que fue el método sorteado, su puntaje sale en 48,4397 de 49,5, el mismo del informe.
- **M** · Con las otras cuatro fijas, habría quedado primera solo dentro de estas ventanas: 93,93 a 94,11 % (mediana), 94,12 a 94,38 % (media geométrica), 93,45 a 93,92 % (media aritmética baja) y hasta 93,29 % (menor valor). Por encima de 94,38 % no ganaba con ningún método.
- **L** · Todas las hábiles tenían 50,5 puntos fuera del precio, salvo una con 50,25. Solo el precio ordenó.
- **M, por un subagente** · Con insumos como los de ese proceso, la pantalla de Precios habría dicho que el precio estaba «en rango» y que se presentara entre su mínimo y el presupuesto, con una referencia cercana al 95 %. No habría avisado de que 96,75 % quedaba por encima de todo el grupo.
- **M, por un subagente** · El pasado de esa misma entidad sí lo decía: en 21 procesos anteriores con tres o más ofertas (la muestra de `detekta-lector`), un precio de 96,75 % habría quedado por encima de la mitad de las ofertas en 14 y por encima de todas en 8.

Fuentes: `detekta-lector/caso_santa_elena/LECCIONES.md`; ofertas en `wi7w-2nvm`; reproducción de un subagente con las funciones reales del árbol (`scripts/base_obra/metodos.js`, `cifras.js` y las de Precios). El orden, el puntaje y las ofertas publicadas se volvieron a correr en la sesión principal; las ventanas y las dos últimas viñetas se leyeron de la salida del subagente.

**Universidad Pedagógica Nacional · UPN-VAD-CP-011-2026.** Régimen especial, con ofertas. Presupuesto de los términos de referencia (numeral 1.13, pág. 7): $1.348.958.930,99. Llegaron 17 ofertas, entre 92,02 % y 98,22 % del presupuesto.

- **L** · La oferta es del «Consorcio Infraestructura Atenea HGR»: Helder Gustavo Rodríguez Santana con el 65 % y Génesis con el 35 %. Valor: $1.308.060.988 (96,97 %).
- **L** · Resultado: NO HABILITADA. El informe (pág. 4) dice: «para la experiencia habilitante únicamente se acredita experiencia de GÉNESIS INGENIERÍA Y CONSTRUCCIÓN GIC S.A.S., integrante que cuenta con una participación del 35% en el Consorcio». La regla (numeral 4.2.2.2, pág. 27): «el (los) integrante(s) que acredite(n) la experiencia debe(n) contar con una participación mínima del cuarenta (40)%».
- **L** · Sobre el precio el informe dice: «Toda vez que no se encuentra habilitado el oferente, no se asigna puntaje». No hubo causal de rechazo económica.
- **L** · El evaluador anotó además que no habría puntuado la experiencia específica, la visita ni el factor de discapacidad.
- **I** · El método aplicado fue menor valor: la fórmula 750 × menor oferta ÷ oferta reproduce los diez puntajes publicados. Ganó la más baja (92,02 %). Habilitada y con todos los puntos, la oferta habría sacado 711,69 de 750 y quedado sexta de once.
- **I** · Subir a Génesis al 40 % no bastaba: el capital de trabajo ponderado habría bajado de su mínimo. El reparto tenía que resolver varias reglas a la vez.

Lo que enseña cada uno: en Cali faltó saber dónde se iba a agrupar el resto; en la Universidad Pedagógica faltó comprobar la estructura del consorcio contra todas las reglas antes de armar la oferta.

### 2.2 El mercado, medido hoy

**M** · Menor cuantía de obra con recepción de ofertas desde el 1-nov-2025: 3.328 procesos llegaron a la fase de ofertas y 2.622 se adjudicaron. Presupuesto mediano: $288 millones.

| Ofertas recibidas | Procesos | Parte | Adjudicado sobre presupuesto (mediana) |
|---|---|---|---|
| 1 | 1.335 | 50,9 % | 100,00 % |
| 2 | 442 | 16,9 % | 99,86 % |
| 3 a 4 | 342 | 13,0 % | 98,53 % |
| 5 a 9 | 337 | 12,9 % | 95,09 % |
| 10 o más | 166 | 6,3 % | 92,44 % |

**M** · La competencia sube con el tamaño:

| Presupuesto | Procesos | Con 1 oferta | Con 1 o 2 | Con 10 o más |
|---|---|---|---|---|
| Menos de $150 millones | 649 | 65,9 % | 82,6 % | 0,8 % |
| $150 a $300 millones | 720 | 60,1 % | 75,7 % | 3,1 % |
| $300 a $500 millones | 768 | 52,6 % | 73,3 % | 3,9 % |
| $500 a $1.000 millones | 268 | 20,9 % | 33,2 % | 19,0 % |
| Más de $1.000 millones | 217 | 6,5 % | 20,3 % | 26,7 % |

**M** · Y cambia mucho por departamento: en Bogotá solo el 3,8 % de los procesos tuvo una oferta; en el Tolima, el 55,0 %; en Cundinamarca, el 45,8 %; en el Huila, el 47,8 %; en Boyacá, el 78,2 % (Anexo A).

**M** · En las otras modalidades de obra: mínima cuantía, 44,2 % con una oferta; régimen especial con ofertas, 48,0 %; licitación pública, 18,5 % con una y 49,7 % con diez o más.

**M** · «Una oferta» es una oferta: en una muestra fija de 200 procesos que el conjunto de procesos da con una respuesta, 199 traen un único proponente con nombre en el conjunto de ofertas.

Ya constaba en el proyecto desde el 27-sep-2026 que el 40,4 % de los procesos de obra adjudicados tuvo un solo oferente y que quien oferta 24 veces o más al año gana el 4,0 % de sus ofertas, frente al 20,0 % de quien oferta de 3 a 5. Ofertar mucho donde llegan muchos rinde poco. Lo nuevo de hoy es que se puede anunciar dónde llegan pocos (sección 2.3).

Fuente: `docs/INVESTIGACION_MERCADO_LICITADOR.md § «3. El mercado, medido»`.

### 2.3 La competencia se puede anunciar antes

**M** · Se probó si el pasado de cada entidad anuncia cuántas ofertas llegan. La regla aprende con 4.547 procesos de 2024 y 2025 y se prueba con los 1.977 de 2026, que no vio. Usa la proporción de procesos de esa entidad con una o dos ofertas, en su mismo tamaño de presupuesto, encogida hacia su departamento cuando hay pocos datos.

| Lo que anunciaba | Procesos de 2026 | Tuvieron 1 o 2 ofertas | Tuvieron 1 sola |
|---|---|---|---|
| 90 a 100 % de poca competencia | 689 | 92,2 % | 78,8 % |
| 80 a 90 % | 276 | 80,8 % | 56,5 % |
| 40 a 60 % | 206 | 47,6 % | 29,6 % |
| 0 a 20 % | 367 | 8,7 % | 3,3 % |

- En las entidades con cuatro o más adjudicados previos, la regla anunció poca competencia (80 % o más) en 760 procesos de 2026 y acertó en el 90,7 %. Anunció mucha (30 % o menos) en 344, y el 91,6 % tuvo tres ofertas o más.
- Esos 760 procesos son de todo el país: unos 74 al mes, de 220 entidades, con presupuesto mediano de $250 millones, y se adjudicaron al 100,00 % del presupuesto (mediana). En el Tolima, el Huila y Cundinamarca fueron 174, unos 17 al mes; en Cundinamarca solo la mitad tuvo una sola oferta (Anexo A).
- 732 de los 760 valen menos que el umbral de Mipyme de 2026: casi todos pueden quedar limitados (sección 2.4).
- La regla resiste: con solo el historial conocido 30 días antes acierta el 90,5 %; con otros valores del umbral y del encogimiento, entre 89 % y 93 %; y aprendiendo con 2024 y probando con 2025, el 95,6 % (medido por la revisión adversaria). Sin la regla, «menos de $500 millones y fuera de Bogotá» da 77,5 %.
- Los 344 de mucha competencia tuvieron 7 ofertas de mediana, se adjudicaron al 94,50 % y están sobre todo en Bogotá (166) y Caldas (61).
- **Foto de hoy**: 212 procesos de menor cuantía de obra aún no cierran su manifestación de interés; 107 vienen anunciados con poca competencia y suman $27.931 millones. De esos 107, 90 siguen en observaciones, así que su presupuesto es el del proyecto de pliego y puede cambiar.

Detekta ya ordena la lista por «Las menos peleadas» con `lib/indice_competencia.js`, que usa el promedio de oferentes por entidad. Lo que falta es condicionarlo al tamaño y a la modalidad, decirlo como hecho («una sola oferta en 9 de sus 11 procesos de este tamaño») y que llegue a tiempo (sección 6.1).

### 2.4 Quién gana cuando llega uno nuevo, y las dos barreras

**M** · En 563 procesos de 2026 anunciados con poca competencia y con una sola oferta, el ganador ya había ganado antes en esa entidad en 293 (52,0 %) y era nuevo allí en 270 (48,0 %). No es un mercado de un solo dueño.

**M** · Cuando en un proceso compiten uno «de casa» (ya había ganado en esa entidad desde 2024) y al menos uno nuevo:

| Ofertas | Procesos | Ganó uno de casa | Lo que daría el azar |
|---|---|---|---|
| 2 | 138 | 70,3 % | 50,0 % |
| 3 a 4 | 107 | 69,2 % | 42,4 % |
| 5 a 9 | 130 | 37,7 % | 26,6 % |

El de casa tiene ventaja, pero el nuevo gana 3 de cada 10 procesos de dos ofertas. Es cota inferior de la ventaja: un consorcio con nombre nuevo no se reconoce como de casa.

**Primera barrera: la convocatoria limitada a Mipyme (L, Anexo B).** Por debajo de $511.708.497 (umbral de 2026) la entidad debe limitar la convocatoria a Mipyme si dos de ellas lo piden, y puede además limitarla a las domiciliadas en el departamento o el municipio de la obra. Una sucursal no cuenta como domicilio. Helder tiene domicilio en el Tolima: allí la limitación territorial por departamento lo incluye; fuera de allí puede excluirlo. Casi toda la poca competencia está por debajo de ese umbral: 732 de los 760 procesos de 2026, y 101 de los 107 de la foto de hoy valen menos de $500 millones.

**Segunda barrera: la estructura se fija al manifestar interés (L, Anexo B).** El documento tipo rechaza la oferta de un proponente plural con integrantes distintos de los que manifestaron interés. Hay que saber con quién se va ANTES de manifestar, no al armar la oferta.

### 2.5 El precio: qué decide y cuánto

La decisión vigente del proyecto es no dar un porcentaje de ganar según el precio, porque medido en la base nacional el precio solo predice al ganador apenas mejor que el azar. Este plan no la cambia. Añade tres hechos medidos hoy.

Fuentes de esa decisión:

- `docs/MEMORIA.md § «El % de adjudicación según el precio no se enseña porque se midió que no predice: en licitación y menor cuantía se dice cuántas ofertas ganaron a ese precio (28-oct-2026)»`
- `docs/MEMORIA.md § «La verificación del precio normaliza en cada proceso: el precio predice quién gana apenas mejor que el azar, no peor (28-oct-2026)»`

**Hecho 1 (M): el nivel del grupo depende de cuántos compiten.** Con una oferta se adjudica al 100 %; con 5 a 9, al 95 %; con 10 o más, al 92 %. La referencia que hoy enseña Detekta («los que ganaron en esta entidad descontaron cerca de X %», `lib/indice_baja.js`) mezcla los procesos de una oferta con los peleados. En una entidad donde casi siempre llega uno, esa mediana es 0 %; el día que llegan seis, orienta mal.

**Hecho 2 (M): con dos hábiles, el puntaje del precio siempre favorece al más bajo; y aun así suele ganar el más alto.** Con exactamente dos ofertas hábiles, los cuatro métodos del documento tipo le dan el mayor puntaje ECONÓMICO a la menor (leído en el numeral 4.1.4 y probado con 200.000 pares al azar). Sin embargo, en 416 procesos reales de dos ofertas ganó la estrictamente más alta en el 57,2 %, la más baja en el 38,2 %, y en el 4,6 % las dos valían lo mismo. Caben tres explicaciones, y los datos abiertos no dicen cuál pesa más: que la otra no quedó hábil, que el pliego no era de documento tipo, o que los puntos fuera del precio decidieron. Esa ventaja de precio es pequeña: en esos procesos la mediana fue de menos de un punto, y un 0,25 de Mipyme o de empresa de mujeres basta para voltearla (medido por la revisión adversaria). Donde llegan pocos, deciden quedar hábil y no regalar puntos.

**Hecho 3 (M): ofertar alto contra un grupo de 5 a 9 deja por debajo del azar.** Si se hubiera entrado como un oferente más en 276 procesos reales de 5 a 9 ofertas, tomando a todas como hábiles y los cuatro métodos al 25 %:

| Precio propio (% del presupuesto) | Procesos en que quedaría primero |
|---|---|
| 96,75 | 9,1 % |
| 96 | 11,6 % |
| 95 | 15,9 % |
| 94 | 20,6 % |
| 92 | 25,3 % |
| Azar: uno entre todos | 14,0 % |

Es una referencia «con todas hábiles», no una probabilidad ni un tope: si un rival no queda hábil la cifra sube (a 94 %, de 20,6 % a 23,0 % quitando un rival al azar), y si la oferta propia pierde puntos fuera del precio, baja. La dirección es la del caso de Cali: a 96,75 % contra un grupo centrado en 94,75 % se queda fuera.

**Lo que NO dio la medición.** Anunciar el centro exacto del grupo con el pasado de la entidad mejora poco: el error medio baja de 2,15 a 1,71 puntos donde hay historial. En los 513 procesos de prueba de 3 a 9 ofertas, la regla «centro según el historial, menos 0,25» quedó primera en el 23,8 % con un precio medio de 95,68 %; ofertar fijo al 95 % dio 25,2 % y fijo al 96 %, 21,0 %. La regla apenas mejora a un precio fijo de su mismo nivel. Saber el centro real daría 35,9 %, pero eso solo se sabe después. Conclusión: vale anunciar el NIVEL según la competencia y avisar cuando el precio propio queda fuera del grupo; no vale prometer un precio exacto.

### 2.6 La cuenta del x20

**Punto de partida (L).** En 2026 constan dos ofertas con Helder de integrante y ninguna adjudicación: una quedó última por precio y la otra no quedó habilitada.

**Meta de trabajo (I).** Pasar de 2 ofertas al año a unas 40 bien puestas: 28 en procesos anunciados con poca competencia y 12 en procesos peleados con el precio dentro del grupo.

**Adjudicaciones esperadas en las de poca competencia.** Fórmula: probabilidad = (parte con 1 oferta × p₂) + (parte con 2 × p₃) + (parte con 3 o más × p₄), donde p₂ es ganar entrando como segundo, p₃ como tercero y p₄ en un grupo mayor.

| Escenario | p₂ | p₃ | p₄ | Probabilidad por oferta | 28 ofertas |
|---|---|---|---|---|---|
| Prudente | 0,297 (medido: el nuevo frente a uno de casa) | 0,20 (supuesto) | 0,10 (supuesto) | 0,741 × 0,297 + 0,166 × 0,20 + 0,093 × 0,10 = 0,263 | 7,4 |
| Central | 0,50 (supuesto: sin ventaja del de casa) | 0,25 (supuesto) | 0,14 (supuesto) | 0,425 | 11,9 |

Las 12 ofertas en procesos peleados aportarían entre 1,7 y 2,5 adjudicaciones más (12 × uno entre siete, o 12 × el 20,6 % de la referencia con todas hábiles).

**Lo que esta cuenta supone y qué lo confirmaría.**

- Que usted puede entrar a esos procesos: que no estén limitados a Mipyme de otro territorio y que la experiencia pedida la tenga. Lo confirma leer el pliego de cada uno (tanda 2 de la entrega 1).
- Que el de casa no cambia su conducta cuando llega un rival. No se puede saber antes.
- Que a usted le irá como a los nuevos que ya entraron: el 0,297 sale de quienes ELIGIERON entrar a esos procesos, no de un recién llegado cualquiera. Los datos no miden si un proceso de una sola oferta era disputable.
- Que puede preparar 3 o 4 ofertas al mes. Lo confirma medir sus horas por oferta.
- **El piloto lo mide**: con la tasa prudente, en 15 ofertas se esperan 3,9 adjudicaciones, y ver cero o una tendría una probabilidad del 6,6 %. Si a las 15 ofertas hay cero o una, la hipótesis central está mal y el plan se revisa.

**El límite real pasa a ser su capacidad.** Con 8 a 12 contratos de unos $250 millones, lo que manda es la capacidad residual, la caja y el equipo. Por eso la decisión 2 de la sección 9 va antes que cualquier meta.

## 3. Qué tenemos

El ciclo de una oferta de menor cuantía, paso por paso. **L** con comprobaciones **M** donde se indica.

| Paso | Lo que Detekta hace hoy | Lo que sigue a mano | Hueco frente al objetivo |
|---|---|---|---|
| 1. Enterarse | Trae SECOP II dos veces al día; lista con filtros y ocho órdenes; lo que viene en el plan anual; SECOP I con un botón | Abrir la aplicación y mirar | No hay aviso de procesos NUEVOS: el de la mañana solo cubre los guardados, y el correo está sin configurar |
| 2. Decidir | Registro, capacidad, caja y competencia en la tarjeta; «Puede ir solo», «Necesita socio» o «No alcanza», con quién y con qué parte | Confirmar experiencia e indicadores contra el pliego | La competencia no mira tamaño ni modalidad; la tarjeta juzga el registro por inscripción |
| 3. Manifestar interés | Filtros «Todavía se puede avisar» y «Hay que avisar hoy»; aviso de sorteo con enlace a SECOP II | Manifestar en SECOP II y mirar el sorteo | El dato llega con uno a tres días y la ventana dura tres días hábiles como mucho; no se sabe cuántos manifestaron |
| 4. Pliego y adendas | Lectura de documentos con página, reconocimiento de texto, dictamen, borrador de observaciones, vigía de adendas, calendario | Tener la pestaña abierta mientras lee | No lee sin pestaña, ni archivos comprimidos, ni PDF de más de 20 MB; clasifica por el nombre del archivo |
| 5. Documentos | Lista «Lo que tiene que entregar» marcable; paquete con los formatos de Word llenos; datos traídos con el NIT; vigencias | Formatos de experiencia, capacidad financiera y capacidad residual; firmas; adjuntar registro, certificados y póliza | Los formatos en Excel van sin llenar; la estructura del consorcio no se comprueba contra todas las reglas a la vez |
| 6. Oferta económica | Formulario 1 del PDF o del Excel si cuadra; precios unitarios por catálogo, por su propio archivo o con «Buscar»; mínimo para no perder; «Revisar antes de subir» | Pasar los precios al Excel de la entidad; teclear el tope de AIU y el total de SECOP II | La referencia no mira cuántos compiten; el revisor queda ciego con el Formulario de Excel |
| 7. Radicar | Fechas de la guía | Todo en SECOP II | Sin lista final de causales de rechazo de ESE pliego |
| 8. Después del cierre | «Con cuánto ofertaron todos», «Por qué quedó así», lectura nocturna de evaluaciones, «Cómo le va» | Subsanar, observar el informe, marcar ganado o perdido | No recalcula el puntaje de la entidad; el resultado propio no alimenta nada |
| 9. Cartera | Resta de la capacidad los contratos en ejecución de los cuatro NIT y sus consorcios | Contratos fuera de SECOP II | Con lista cargada a mano, un contrato nuevo de SECOP II no se resta |

Tamaño del árbol (**M**, `node tests/estado.js` del 11-nov-2026): 6 routers, 177 archivos de código en `lib/`, 19 en `public/` y una suite de 15.630 aserciones.

## 4. Qué funciona y qué no

### 4.1 Lo que funciona, medido el 11-nov-2026

- **La suite completa**, corrida sobre el árbol `90b98ab` antes de escribir este plan: «TODAS LAS ITERACIONES PASARON (4/4) · peticiones Socrata simuladas: 5959», código de salida 0, en 14 minutos y 23 segundos.
- **Las tareas programadas** de la cuenta de Claude: la lectura de evaluaciones corrió hoy de 4:09 a 4:17 a. m. de Colombia y terminó bien; el vigilante de la mañana y la suite de madrugada, también.
- **El lector de la cláusula de participación**: con el texto real de los términos de la Universidad Pedagógica devuelve la forma «quien acredita la experiencia», el 40 % y la cita literal.
- **El motor de los cuatro métodos** reproduce el orden y el puntaje propio del caso de Cali.
- **Los datos abiertos** responden desde las sesiones: la medición de este plan se bajó y se calculó aquí.

### 4.2 Lo construido que está apagado o sin usar

| Pieza | Estado y fecha | Fuente |
|---|---|---|
| Correo de la mañana | Sin configurar el 4-nov-2026: faltan tres variables | **L** |
| Aviso por Telegram | Construido; usted decidió no usarlo el 5-nov-2026 | **L** |
| Modelo abierto para precios unitarios | Apagado, sin medir con un modelo real (10-nov-2026) | **L** |
| Modo de cuentas de usuario | Apagado desde el 11-sep-2026 | **L** |
| Borrador de observaciones al pliego | Ninguna sesión real lo ha redactado (5-nov-2026) | **L** |
| Rutina del dictamen | Última corrida registrada: 27-sep-2026 | **M** |
| Rutina de «Buscar» de Precios | Sin corridas registradas en la lista de tareas; no se sabe si un disparo desde el botón queda allí | **M** |
| Rutina del calendario del mes | Desactivada; última corrida 26-sep-2026 | **M** |
| Desglose de la probabilidad | Servido y sin entrada en pantalla | **L** |
| Motor de los cuatro métodos | Vive en `scripts/`, fuera de la aplicación | **M** |

La copia nocturna de la base fuera de Upstash funcionaba el 28-oct y el 1-nov-2026 según la memoria; su pendiente del 27-sep sigue abierto por viejo. Sin verificar hoy.

### 4.3 Lo que no funciona para el objetivo

1. **Nadie le avisa de un proceso nuevo.** Con una ventana de tres días hábiles para manifestar interés, depender de abrir la aplicación cuesta procesos.
2. **La competencia esperada no llega como hecho ni a tiempo.**
3. **La estructura del consorcio no se valida de punta a punta antes de manifestar.** El lector ya lee la cláusula y la recomendación de socio la aplica; pero la ficha del consorcio fijo no descarta repartos cuando la cláusula depende de quién aporta la experiencia (pendiente abierto de la memoria), y no hay una sola comprobación que junte participación, indicadores, capital de trabajo y puntos. No se reprodujo de punta a punta qué habría dicho la aplicación del 65/35.
4. **La referencia de precio no mira cuántos compiten** y no avisa cuando el precio propio queda fuera del grupo.
5. **Los puntos distintos del precio no se revisan uno por uno** contra lo que cada integrante puede acreditar.
6. **La oferta económica se pasa a mano al Excel de la entidad**, y el revisor no la ve.
7. **El resultado propio no enseña nada a la aplicación.**
8. **La capacidad no se mueve sola cuando se gana un contrato** si hay lista cargada.

Fuente del punto 3: `docs/MEMORIA.md § «Los indicadores del consorcio se juzgan con la fórmula del pliego, y el 50/50 supuesto no niega (27/28-sep-2026, N21)»`.

## 5. Defectos y deudas abiertas

### 5.1 Reproducidos el 11-nov-2026

| N.º | Defecto | Entrada → salida real | Qué cuesta | Lo cierra |
|---|---|---|---|---|
| D1 | El motor de los cuatro métodos no da el puntaje máximo a la oferta más cercana a la media geométrica | Las cinco hábiles de Cali → 49,1854 para la más cercana; el documento tipo manda 49,5 | El orden no cambió en ese caso; el total sí, en 0,31 puntos, más que el 0,25 que separó a un oferente | Entrega 3 |
| D2 | «Revisar antes de subir» con el Formulario venido de Excel | 4 de 8 comprobaciones «sin referencia» y semáforo «listo»; la frase sí avisa | Una cantidad cambiada o un unitario sobre el oficial pasan sin verse | Entrega 4 |
| D3 | La capacidad no resta un contrato nuevo de SECOP II cuando el perfil tiene lista cargada | Helder con un contrato nuevo de prueba → la lista que resta no lo incluye; en Génesis sí | Presentarse sin capacidad cuando haya más contratos | Entrega 6 |
| D4 | La referencia de precio no avisa de un precio por encima del grupo | Caso de Cali → «en rango» | El caso de Cali | Entrega 3 |
| D5 | El rótulo de la fuente del presupuesto | Cifra del pliego → rótulo «SECOP II» | Confusión sobre qué presupuesto manda | Entrega 3 |
| D6 | El «Factor de baja» se aplica sobre el precio propio y su nota dice «Banda típica en obra: 5–12 %» | 5 % de baja → 8,09 % bajo el presupuesto en el caso; lo medido es que la mitad de los ganadores bajó entre 1,8 y 6,0 % | Bajar más de lo que se cree | Entrega 3 |
| D7 | El consejo de precio de la guía cambia según de dónde sale la base | Con base de entidad dice cuánto bajaron los ganadores; con base de entidad y tipo de obra, no | Dos respuestas para la misma pregunta | Entrega 3 |
| D8 | El optimizador se contradice | Su cabecera dice «doble cuenta cerrada»; su texto de lectura dice que no la corrige | Texto falso en un sentido u otro | Entrega 3 |
| D9 | El pliego con nombre poco usual cae como «Otro documento» | «3 PPC CDV ADULTO MAYOR DT CARTAGENA.pdf» → «otro» | Un pliego que no entra a la lectura automática | Entrega 4 |

D1, D2, D3 y D9 se corrieron en esta sesión. D4 a D8 los ejecutó un subagente con las funciones reales y aquí se leyó su salida.

### 5.2 De los 102 pendientes abiertos, los que más frenan

`node tests/estado.js` listaba 102 pendientes abiertos antes de este plan (**M**). No se revisaron uno por uno, y al menos uno está viejo (la copia nocturna, sección 4.2). Los que tocan el objetivo, por orden:

1. El correo de la mañana sin configurar, y que ningún aviso habla de procesos nuevos.
2. Las fases 2 a 5 de la lectura de documentos: una sola descarga, leer por contenido, decir qué documento crítico no se leyó y leer sin pestaña abierta.
3. El Formulario venido de Excel no alimenta al revisor (D2).
4. Los formatos de experiencia, capacidad financiera y capacidad residual y el Formulario 1 no se llenan.
5. La base de contratos de experiencia por perfil (decisión suya del 3-nov-2026: proponer, o mover veredictos).
6. Las cláusulas que dependen de quién aporta la experiencia no descartan repartos.
7. La fecha de manifestación que trae el Anexo del cronograma no llega a la manifestación, y «Próximos a abrir» no tiene sección propia.
8. El dictamen no sabe que un escaneo quedó leído a medias.
9. SECOP I fuera de la carga diaria: el 45 % de la obra competitiva de 90 días pasó por allí.
10. La captura de quién quedó hábil: corre cada madrugada, pero no se sabe cuántas capturas completas deja.

Fuentes:

- `docs/MEMORIA.md § «La causa real de un fallo de lectura se registra, se sanea y se dice, y una herramienta mide lo que Detekta no lee (19-oct-2026)»`
- `docs/MEMORIA.md § «El Formulario 1 leído se lleva a Precios con «Cotizar en Precios» (19-oct-2026)»`
- `docs/MEMORIA.md § «La plantilla de Colombia Compra completa y el .zip con todo lo que se entrega (5-nov-2026)»`
- `docs/MEMORIA.md § «El calendario del proceso: las fechas de los documentos llegan a Mis procesos, SECOP II manda sobre el documento y el lector deja de inventar plazos (3-nov-2026)»`
- `docs/MEMORIA.md § «El aviso al teléfono por Telegram, sin leer el corpus, dónde gana el dueño y lo que midió la fase 0 (5-nov-2026)»`

### 5.3 Lo que la decisión de uso personal deja sin objeto

Usted decidió el 11-nov-2026 que Detekta es de uso personal y no se comercializa. Quedan fuera de la ruta, sin borrarse: `docs/PLAN_SAAS.md`, `docs/PLAN_DE_ACCION.md` y sus anexos de negocio; la autorización de uso comercial del INVIAS; el modo de cuentas; la clave de API para la inteligencia artificial de clientes; y las seis decisiones de la investigación de mercado que eran sobre vender. Sus pendientes en la memoria pueden cerrarse con esa razón cuando usted lo confirme (decisión 8).

## 6. Qué falta: las piezas nuevas

Cada pieza dice qué decisión sirve, con qué datos, cómo se prueba y qué riesgo tiene. Ninguna muestra un número que no sea un hecho contado.

### 6.1 Competencia esperada, dicha como hecho

- **Decide**: a qué procesos ir primero.
- **Datos**: el número de respuestas de cada proceso adjudicado, que ya está en el corpus histórico.
- **Método**: en `lib/indice_competencia.js`, que es su única casa, contar por entidad, modalidad y tamaño de presupuesto cuántos procesos tuvieron 1, 2, 3 a 4, 5 a 9 y 10 o más ofertas, con el encogimiento que ya usa hacia el departamento.
- **Lo que se ve**: «Una sola oferta en 9 de sus 11 procesos de este tamaño», y el orden «Las menos peleadas» con esa base.
- **Prueba**: la misma de este plan, dentro de la suite con datos fijos: aprende hasta un año y acierta en el siguiente; y cada mes la medición real (Anexo C).
- **Riesgo**: en oportunidades el error caro es esconder. Esta pieza ordena y dice; no oculta nada.

### 6.2 Aviso diario de procesos nuevos

- **Decide**: en cuáles manifestar interés hoy.
- **Método**: una tarea de cada mañana que lea los procesos que entraron a observaciones o abrieron manifestación en su zona y tamaño, ordenados por competencia esperada, con la estructura recomendada al lado.
- **Canal**: el que usted elija en la decisión 4.
- **Riesgo**: el dato abierto llega con uno a tres días. Por eso el aviso sale desde la fase de observaciones, que va antes de la manifestación.

### 6.3 Simulacro de evaluación antes de manifestar

- **Decide**: con qué estructura ir (solo, consorcio 1A, consorcio GR, con cuál socia y con qué reparto), o no ir.
- **Método**: probar cada estructura posible contra TODAS las reglas del pliego a la vez: quién acredita la experiencia y con qué participación mínima, indicadores financieros con la fórmula del pliego, capital de trabajo, capacidad residual, condición de Mipyme y domicilio, y cada factor de puntaje con lo que exige y de quién.
- **Lo que se ve**: «Con 65/35 queda inhabilitado: quien acredita la experiencia necesita el 40 %» y «El reparto que cumple todo es …», o «Ningún reparto cumple todo: falta …».
- **Prueba**: el caso real de la Universidad Pedagógica como cerradura: 65/35 con la experiencia en el integrante del 35 % tiene que salir «no», con la cita de la página 27; y el reparto que cumpla a la vez participación y capital de trabajo, o «ninguno». Como toda cerradura del proyecto, tiene que fallar contra el árbol anterior a la tanda.
- **Riesgo**: aquí el error caro es el falso positivo (decir «cumple» y quedar inhabilitado). Lo que no se pudo leer se dice «sin leer», nunca «cumple».

### 6.4 Lectura de las dos barreras

- **Decide**: si se puede entrar.
- **Método**: leer del aviso de convocatoria, del acto de apertura y del pliego si la convocatoria quedó limitada a Mipyme y a qué territorio, si hay sorteo y cómo, y, cuando se publique, cuántos manifestaron interés.
- **Riesgo**: lo que no conste se dice «no consta», y no bloquea.

### 6.5 Referencia de precio según la competencia

- **Decide**: en qué zona poner el precio.
- **Método**: junto a la referencia de hoy, el hecho por número de oferentes: «con una oferta aquí se adjudicó al 100 %; con 5 a 9, al 95 %». Y, del conjunto de ofertas, dónde se agruparon TODAS las ofertas en los procesos anteriores de esa entidad.
- **El aviso que faltó en Cali**: «En 8 de los 21 procesos anteriores de esta entidad, su precio habría quedado por encima de todas las ofertas».
- **Lo que no hace**: no da un porcentaje de ganar ni sugiere un precio. La regla escrita el 28-oct-2026 para dar un porcentaje sigue como está, con su veredicto del 31-ene-2027.
- **Prueba**: el caso de Cali como cerradura, y la medición mensual.

### 6.6 Los cuatro métodos dentro de la aplicación

- **Decide**: dónde quedaría su precio contra un grupo dado, y si la entidad calculó bien.
- **Método**: corregir D1 y llevar el motor a `lib/`, una sola casa. Leer del pliego la tabla de métodos cuando no es la del documento tipo: la Universidad Pedagógica usa media aritmética, media aritmética alta, media geométrica con presupuesto oficial y menor valor.
- **Uso**: recalcular el informe de evaluación de un proceso propio y avisar si el orden cambia.

### 6.7 El Excel de la oferta, lleno y cuadrado

- **Decide**: nada; quita horas y errores.
- **Método**: escribir los precios en el Excel que publicó la entidad, respetando sus reglas: ningún unitario sobre el oficial cuando el pliego lo prohíbe, AIU que no pase del oficial, ajuste al peso, y el total igual al que se escribe en SECOP II. El revisor lee ese mismo Excel.
- **Prueba**: los Formularios reales que ya pasan la puerta, y pruebas con formularios armados al azar.
- **Riesgo**: es la cifra que se radica. Lleva plan aparte, mutación y revisión adversaria.

### 6.8 Aprender de cada resultado

- **Método**: reconocer las ofertas propias por integrante (toda oferta de un consorcio donde figure Helder Gustavo Rodríguez Santana), guardar de cada una el puesto, la distancia al grupo y la causa, y sumar esas evaluaciones al historial de la entidad.
- **Datos**: el registro de proveedores de SECOP II abre los consorcios a sus integrantes (`ceth-n4bn`, usado ya en la investigación de mercado). Sin verificar hoy.

### 6.9 Cartera y capacidad

- **Decide**: cuándo parar de ofertar y con qué estructura conservar capacidad.
- **Método**: sumar los contratos nuevos de SECOP II a la lista cargada sin contar dos veces (D3), y proyectar la capacidad y la caja con las ofertas vivas.

## 7. La ruta por entregas

Una entrega es algo que usted ve funcionando. Cada una sube una sola vez y trae su memoria. El tamaño en sesiones es una estimación (**I**).

Cada tanda la ejecuta una sesión con el protocolo de `docs/PROMPT_INICIAL.md`: lee primero la memoria del módulo que toca, escribe la prueba antes que el código, corre la suite completa y deja su nota de cierre al pie de la ficha. Las tandas que dicen «plan previo» mueven una cifra que decide y no tocan código sin su visto bueno.

### 7.1 Semana cero · el piloto con lo que ya hay

No pide código. Sirve para medir la hipótesis central mientras se construye lo demás. Los nombres de pantalla se leyeron en `public/index.html` el 11-nov-2026; no se comprobaron en producción.

1. Abra Detekta y entre a la pestaña de licitaciones. Debe ver la lista de procesos abiertos.
2. En el selector de orden, que al abrir dice «Las mejores para usted», elija «Las menos peleadas» (está dentro de «Más órdenes»). Debe ver primero entidades donde se presentan pocos.
3. Marque «Todavía se puede avisar». Debe quedar solo lo que aún admite manifestación de interés.
4. De esa lista, tome los del Tolima y los departamentos vecinos con presupuesto menor de $500 millones y guárdelos en Mis procesos.
5. En cada uno, lea en el pliego si la convocatoria está limitada a Mipyme de un municipio o departamento. Si lo está y usted no tiene domicilio allí, descártelo.
6. Decida con quién va ANTES de manifestar interés, y manifieste con esa misma estructura.
7. Anote en cada proceso cuántas horas le tomó la oferta y qué pasó.

Si en el paso 2 no ve lo descrito, no siga: dígalo y se revisa, porque ese orden usa hoy el promedio por entidad y no el tamaño.

### 7.2 Entrega 1 · Dónde llega una sola oferta

- **Tanda 1 · La competencia como hecho.** Pieza 6.1. Cambia `lib/indice_competencia.js`, la fila de la lista y la tarjeta. Cierre: en producción, la tarjeta de una entidad con historial dice cuántos de sus procesos de ese tamaño tuvieron una oferta, y el orden «Las menos peleadas» lo usa. Decide el dueño antes: nada. Tamaño: 2 sesiones.
  - *Cerrada en código el 11-nov-2026* (rama `claude/zen-sagan-wgcf5z`): conteos por modalidad y tamaño en el índice, la frase en la tarjeta y el anuncio ordenando «Las menos peleadas» en menor cuantía, mínima y régimen especial (medido con la población de Detekta; en licitación no resistió). Falta para el cierre en producción: fusionar y que el índice se reconstruya. Memoria: «La competencia por tamaño ordena «Las menos peleadas» y el motor de los cuatro métodos vive en lib/ con el máximo de la media geométrica (11-nov-2026)».
- **Tanda 2 · Las dos barreras.** Pieza 6.4. Cambia `lib/documentos_proceso.js` y la guía del proceso. Cierre: un proceso guardado dice «limitada a Mipyme de …», «con sorteo» o «no consta», con su página. Tamaño: 2 sesiones.
  - *Cerrada en código el 11-nov-2026*: `lib/convocatoria_limitada.js` y los dos hechos en la guía. Falta leer cuántos manifestaron interés. Memoria: «Las dos barreras se leen del pliego: limitada a Mipyme y a qué territorio, y si hay sorteo (11-nov-2026)».
- **Tanda 3 · El aviso diario.** Pieza 6.2. Cierre: usted recibe cada mañana la lista del día por el canal elegido. Decide el dueño antes: decisiones 1 y 4. Tamaño: 1 a 2 sesiones.
  - *Hecha en el bloque del vigilante el 12-nov-2026* (paso 6 de `docs/RUTINAS.md` § 2), con la zona y el canal recomendados que el dueño aprobó. Memoria: «La lista del día va en el vigilante de la mañana (12-nov-2026)».

### 7.3 Entrega 2 · Que no nos tumben por estructura, papeles o puntos

- **Tanda 4 · Simulacro de estructura.** Pieza 6.3, primera mitad: participación, indicadores, capital de trabajo y capacidad a la vez. Cierre: el caso de la Universidad Pedagógica dice «no» al 65/35 con su cita. Lleva plan previo con su visto bueno, mutación y revisión adversaria. Tamaño: 3 sesiones.
  - *Hecha en parte el 11-nov-2026*: el simulacro de la participación mínima contra el reparto dado (simulador y ficha) con la cerradura de la Universidad Pedagógica. La frase única quedó el 12-nov-2026 (memoria: «El reparto del consorcio en una frase: queda por fuera, falta confirmar o cumple lo medible (12-nov-2026)»). Memoria: «El simulacro del consorcio: cada cláusula de participación contra el reparto que se va a firmar (11-nov-2026)».
- **Tanda 5 · Los puntos, uno por uno.** Pieza 6.3, segunda mitad: cada factor de puntaje con quién lo acredita y qué falta. Cierre: «Hoy obtendría N de M puntos fuera del precio; faltan …». Tamaño: 2 sesiones.
  - *Hecha el 12-nov-2026* con la tabla del documento tipo; los pliegos que no la siguen no dicen nada. Memoria: «Los puntos fuera del precio, uno por uno, desde la tabla del pliego (12-nov-2026)».
- **Tanda 6 · Las causales de ESE pliego.** Lista final antes de radicar, leída del pliego y cruzada con el paquete. Tamaño: 2 sesiones.
  - *Hecha el 12-nov-2026*: la lista del pliego con dónde la revisa la aplicación y lo que comprueba usted. Memoria: «Las causales de rechazo de ESE pliego, una por una, con dónde las revisa la aplicación (12-nov-2026)».

### 7.4 Entrega 3 · El precio según cuántos compiten

- **Tanda 7 · El motor en casa y D1.** Pieza 6.6. Cierre: el caso de Cali da 49,5 a la más cercana y la suite lo fija. Tamaño: 1 sesión.
  - *Cerrada el 11-nov-2026* (rama `claude/zen-sagan-wgcf5z`): `lib/metodos_ponderacion.js` es la casa única y el caso de Cali da 49,5 a la más cercana en la suite. Sin cambio visible en pantalla: el motor aún no se usa en la aplicación (eso es la pieza 6.5 y la tanda 14).
- **Tanda 8 · La referencia por competencia y el aviso de fuera del grupo.** Pieza 6.5, con D4 a D8. Cierre: con los insumos de Cali, Precios dice que 96,75 % queda por encima del grupo de esa entidad. Lleva plan previo con su visto bueno. Decide el dueño antes: decisiones 3 y 6. Tamaño: 3 sesiones.
  - *12-nov-2026*: la referencia por competencia de la entidad ya sale en Precios (medido: mejora en licitación y mínima cuantía; en menor cuantía la de la entidad ya está en el techo). Memoria: «Qué tan cerca se anticipa el precio ganador por modalidad, y la referencia de la entidad por competencia en Precios (12-nov-2026)».
  - *Hecha en parte el 11-nov-2026*: el aviso de fuera del grupo (con Cali: 9 de 24 por encima de todas, 13 de 24 por encima de la mitad) y D4 a D8, sin mover ninguna cifra; se tomaron las recomendaciones A de las decisiones 3 y 6. Falta la referencia «con una oferta aquí se adjudicó al 100 %; con 5 a 9, al 95 %» por entidad. Memoria: «Precios dice dónde habría quedado su precio frente a todas las ofertas de la entidad, y cuatro textos que afirmaban de más (11-nov-2026)».
- **Tanda 9 · La tabla de métodos del pliego.** Para régimen especial. Tamaño: 2 sesiones.

### 7.5 Entrega 4 · La fábrica de ofertas

- **Tanda 10 · El Excel de la entidad, lleno, y el revisor leyéndolo.** Pieza 6.7 con D2. Plan previo con su visto bueno. Tamaño: 3 sesiones.
  - *Hecho D2 el 11-nov-2026*: el revisor compara contra el Formulario de Excel. Falta llenar el Excel de la entidad (pieza 6.7). Memoria: «"Revisar antes de subir" también compara contra el Formulario 1 de Excel (11-nov-2026)».
- **Tanda 11 · Los formatos que faltan.** Experiencia, capacidad financiera y capacidad residual desde la base de contratos por perfil. Decide el dueño antes: la decisión pendiente del 3-nov-2026. Tamaño: 3 sesiones.
- **Tanda 12 · Leer sin pestaña y por contenido.** Las fases 2 a 5 de la lectura, con D9. Tamaño: 3 a 4 sesiones.

### 7.6 Entrega 5 · Aprender de cada resultado

- **Tanda 13 · Las ofertas propias por integrante y el tablero.** Pieza 6.8 y sección 8. Tamaño: 2 sesiones.
- **Tanda 14 · Recalcular el informe y el borrador de observación.** Pieza 6.6, dentro del plazo de traslado. Tamaño: 2 sesiones.

### 7.7 Entrega 6 · Cartera

- **Tanda 15 · La capacidad con los contratos nuevos.** Pieza 6.9 con D3. Plan previo con su visto bueno: mueve la capacidad. Tamaño: 2 sesiones.
  - *Hecha la parte de D3 el 11-nov-2026*: los contratos nuevos de SECOP II restan con lista cargada, por número de contrato. Falta proyectar la capacidad y la caja con las ofertas vivas. Memoria: «Con lista cargada, la capacidad también resta los contratos nuevos de SECOP II, por número de contrato (11-nov-2026)».

### 7.8 Entrega 7 · Más mercado

- **Tanda 16 · Mínima cuantía y régimen especial como mercados propios.** Mínima cuantía no pide registro de proponentes y gana el menor precio: allí manda el costo real. Tamaño: por definir tras el piloto.
- **Tanda 17 · SECOP I en la carga.** Solo si el piloto muestra que su zona lo usa. Tamaño: por definir.

## 8. Cómo se sabrá si funciona

| Medida | Hoy | Meta a 12 meses |
|---|---|---|
| Procesos avisados en su zona por semana | Sin dato | Los que la zona dé; se mide desde la tanda 3 |
| Manifestaciones de interés al mes | Sin dato | Todas las que pasen las dos barreras |
| Ofertas radicadas al año | 2 que consten (2026) | 40 |
| Ofertas no habilitadas o rechazadas | 1 de 2 | 0 por causa evitable |
| Puntos fuera del precio obtenidos | Sin dato | Todos los posibles |
| Puesto por precio entre hábiles | 5.º de 5 en la única calificada | Dentro del grupo siempre |
| Adjudicaciones al año | 0 que consten (2026) | 6 a 12, según el piloto |
| Horas de preparación por oferta | Sin dato | Lo que usted mida, a la mitad |

Regla del piloto: revisión a las 15 ofertas en procesos de poca competencia (sección 2.6). Cada oferta perdida se abre con «Por qué quedó así» antes de la siguiente.

## 9. Lo que decide usted

Responda con el número y la letra. Lo que solo usted sabe no se supuso.

1. **Zona y tamaño.** ¿En qué departamentos ejecuta y hasta qué presupuesto? Recomendado para empezar: Tolima, Huila y Cundinamarca, de $100 a $500 millones, y Bogotá solo en casos escogidos.
2. **Capacidad.** ¿Cuántos contratos puede ejecutar a la vez con su equipo y su caja? De ahí sale la meta.
3. **Qué se busca con el precio.** (A) Más contratos: precio dentro del grupo, nunca bajo su mínimo. (B) Más utilidad por contrato. Recomendado: A, que es lo que pidió.
4. **Canal del aviso diario.** (A) Notificación de una tarea de Claude en el teléfono. (B) Correo: faltan tres variables en Vercel. (C) Ninguno: abrir la aplicación. Recomendado: A.
5. **Punto de partida.** ¿Hubo en 2025 y 2026 más ofertas que las de Cali y la Universidad Pedagógica? ¿La de Cartagena del 6-nov-2026 se radicó?
6. **El porcentaje por precio.** (A) Dejar la regla del 28-oct-2026 como está y añadir solo hechos contados. (B) Cambiar la vara. Recomendado: A.
7. **Domicilio de las socias.** ¿En qué municipio tiene domicilio cada una? Decide a qué convocatorias limitadas pueden entrar.
8. **Cerrar lo comercial.** ¿Se cierran con la razón «uso personal» los pendientes de vender Detekta?

## 10. Lo que no se hace, con el motivo

- **Un porcentaje de ganar por precio, o un precio sugerido.** La regla del 28-oct-2026 no se ha cumplido y la medición de hoy no la cumple.
- **Dos ofertas al mismo proceso con dos consorcios suyos.** Es causal de rechazo que un integrante haga parte de más de una propuesta (Anexo B).
- **Ofertar en masa en licitaciones de diez o más.** Quien oferta 24 veces o más al año gana el 4,0 % de sus ofertas.
- **Bajar de su mínimo para ganar.** El objetivo son contratos que dejen plata.
- **Radicar por usted en SECOP II.** Detekta prepara y revisa; usted radica.
- **Lo que ya decidió no hacer**: Telegram, socios en el mercado, la prima mínima, pasar a planes pagos, pagar la inteligencia artificial por uso y descargar pliegos de más de 20 MB. Si una entrega choca con uno de estos, se le dirá cuál y por qué antes de proponer cambiarlo.
- **Nada que sirva para vender Detekta.**

## 11. Riesgos

| Riesgo | Señal | Qué se hace |
|---|---|---|
| Los procesos de una oferta están cerrados a quien llega | El piloto no adjudica | Revisión a las 15 ofertas; leer las causas una por una |
| Convocatorias limitadas a Mipyme de otro territorio | Aparece en el pliego | Tanda 2; zona con domicilio propio o de una socia |
| El de casa baja el precio cuando ve un rival | Se pierde por precio contra uno solo | Con dos hábiles el puntaje del precio favorece al más bajo: no ir al 100 % y no regalar puntos |
| Se gana más de lo que se puede ejecutar | La capacidad o la caja no alcanzan | Decisión 2 y tanda 15 |
| El dato abierto llega tarde para manifestar | Ventanas que se cierran sin aviso | Avisar desde la fase de observaciones |
| Los planes gratuitos se quedan cortos | Pausas o base llena, como el 30-sep y el 28-oct-2026 | Se dirá el tope concreto antes de proponer nada |
| Una cifra equivocada y creíble | Un «cumple» que no cumple | Cerraduras con casos reales, mutación y revisión adversaria en todo lo que decide |

## Anexo A · Cifras de la medición

Todas de `tools/analisis/plan_x20/resultados_2026-11-11.json`. Población: menor cuantía de obra en fase de ofertas.

**Por departamento, adjudicados con recepción desde el 1-nov-2025.**

| Departamento | Procesos | Con 1 oferta | Con 1 o 2 | Presupuesto mediano |
|---|---|---|---|---|
| Cundinamarca | 413 | 45,8 % | 75,1 % | $266 millones |
| Boyacá | 298 | 78,2 % | 86,9 % | $227 millones |
| Bogotá | 262 | 3,8 % | 13,0 % | $507 millones |
| Caldas | 173 | 18,5 % | 44,5 % | $359 millones |
| Valle del Cauca | 162 | 65,4 % | 77,8 % | $286 millones |
| Huila | 90 | 47,8 % | 66,7 % | $205 millones |
| Tolima | 80 | 55,0 % | 76,3 % | $284 millones |
| Meta | 47 | 68,1 % | 78,7 % | $312 millones |

**Anunciados con poca competencia en 2026, por departamento.**

| Departamento | Procesos | Al mes | Con 1 oferta | Ganador repetido entre los de 1 oferta |
|---|---|---|---|---|
| Boyacá | 142 | 13,8 | 80,3 % | 60,5 % |
| Cundinamarca | 121 | 11,7 | 50,4 % | 34,4 % |
| Valle del Cauca | 61 | 5,9 | 85,2 % | 76,9 % |
| Tolima | 27 | 2,6 | 63,0 % | 35,3 % |
| Huila | 26 | 2,5 | 73,1 % | 63,2 % |
| Meta | 16 | 1,6 | 87,5 % | 21,4 % |

**Las entidades del Tolima** con cinco o más adjudicados desde 2024, todas.

| Entidad | Con 1 oferta | Con 2 | Ganadores distintos | Presupuesto mediano |
|---|---|---|---|---|
| Municipio de El Guamo | 7 de 8 | 1 | 7 | $216 millones |
| Institución Universitaria de El Espinal | 9 de 12 | 1 | 12 | $328 millones |
| Cortolima | 11 de 15 | 3 | 14 | $288 millones |
| Alcaldía de Honda | 4 de 6 | 1 | 4 | $88 millones |
| Municipio de Rioblanco | 4 de 6 | 1 | 6 | $189 millones |
| Alcaldía de Armero Guayabal | 5 de 8 | 2 | 7 | $327 millones |
| Alcaldía de Chaparral | 9 de 15 | 5 | 11 | $246 millones |
| Municipio de Mariquita | 9 de 15 | 4 | 12 | $196 millones |
| Alcaldía de Líbano | 3 de 7 | 4 | 5 | $220 millones |
| Alcaldía de Ibagué | 3 de 8 | 2 | 8 | $567 millones |
| Alcaldía de El Espinal | 5 de 14 | 3 | 13 | $165 millones |
| Gobernación del Tolima | 5 de 22 | 1 | 20 | $429 millones |
| SENA Tolima | 3 de 18 | 2 | 16 | $363 millones |
| CACOM-4 | 0 de 5 | 0 | 4 | $1.170 millones |

«Ganadores distintos» cuenta nombres o identificaciones distintas: un mismo contratista con otro consorcio cuenta dos veces.

**El grupo de ofertas según cuántas llegaron** (1.009 procesos con una oferta por proponente y presupuesto creíble).

| Ofertas | Procesos | Centro del grupo (P25 · mediana · P75) | Ancho mediano | Ganó la estrictamente más baja | Ganó la estrictamente más alta | Todas iguales |
|---|---|---|---|---|---|---|
| 2 | 416 | 96,92 · 99,00 · 99,82 | 0,87 puntos | 38,2 % | 57,2 % | 4,6 % |
| 3 a 4 | 317 | 94,72 · 96,71 · 99,52 | 3,50 puntos | 21,5 % | 32,5 % | 5,7 % |
| 5 a 9 | 276 | 93,72 · 94,75 · 96,05 | 4,47 puntos | 10,5 % | 9,8 % | 8,0 % |

## Anexo B · Normas verificadas el 11-nov-2026

Textos bajados ese día de la fuente oficial y leídos en esta sesión. No se verificó si hay un proyecto de norma en trámite.

**Documento tipo de selección abreviada de menor cuantía de obra pública de infraestructura de transporte, versión 3.** Adoptado por la Resolución 463 de 2024 de Colombia Compra Eficiente, que deroga la Resolución 241 de 2020. Descarga oficial: `https://www.colombiacompra.gov.co/documentos-tipo/descarga/29950`.

- **Puntajes (capítulo IV)**: oferta económica 49,5; factor de calidad 30; apoyo a la industria nacional 20; emprendimientos y empresas de mujeres 0,25; Mipyme 0,25. En convocatorias limitadas a Mipyme, la oferta económica vale 49,75.
- **Método (numeral 4.1.4)**: se escoge por los centavos de la tasa representativa del mercado «que rija el segundo día hábil después de finalizado el periodo de traslado del informe de evaluación». De 0,00 a 0,24, mediana con valor absoluto; de 0,25 a 0,49, media geométrica; de 0,50 a 0,74, media aritmética baja; de 0,75 a 0,99, menor valor. Nadie lo conoce al ofertar.
- **Media geométrica**: «se otorgará el máximo puntaje al valor de la propuesta que se encuentre más cerca (por exceso o por defecto) al valor de la media geométrica».
- **Mediana con número par de ofertas**: el máximo va a la propuesta «inmediatamente por debajo de la mediana».
- **AIU (numeral 4.1.1)**: el porcentaje total ofrecido «no debe ser superior al porcentaje total del A.I.U establecido en el Formulario 1».
- **Causales de rechazo (numeral 1.15)** que tocan este plan: B, hacer parte de más de una propuesta en el mismo proceso; M, que el valor exceda el presupuesto oficial; N, cambiar ítems, unidades o cantidades del Formulario 1; O, no ofrecer un precio unitario u ofrecerlo en cero; P, superar el unitario oficial en los ítems que la entidad señale; R, AIU superior al de la entidad; V, discrepancia entre el Formulario 1 y lo escrito en SECOP II; W, ofertar sin haber manifestado interés; AA, AB y AC, cambiar los integrantes del proponente plural entre la manifestación y la oferta.

**Decreto 1082 de 2015** (gestor normativo de Función Pública).

- **Artículo 2.2.1.2.1.2.20**: hasta tres días hábiles desde la apertura para manifestar interés; con más de diez manifestaciones la entidad puede sortear máximo diez; el informe de evaluación se publica tres días hábiles.
- **Artículo 2.2.1.1.2.2.6**: se puede adjudicar con una sola oferta que cumpla.
- **Artículo 2.2.1.2.4.2.2** (modificado por el Decreto 1860 de 2021): la convocatoria se limita a Mipyme cuando el proceso vale menos de US$125.000 y lo piden al menos dos Mipyme un día hábil antes de la apertura.
- **Artículo 2.2.1.2.4.2.3**: la entidad puede limitarla a Mipyme con domicilio en el departamento o el municipio de ejecución.
- **Artículo 2.2.1.2.4.2.4, parágrafo 3**: solo se aceptan Mipyme o proponentes plurales integrados únicamente por Mipyme.

**Umbral de Mipyme de 2026**: US$125.000, que son $511.708.497 (documento de umbrales de Colombia Compra Eficiente).

**Guía para promover la participación de las Mipyme** (CCE-GAD-GI-26, versión 01, 16-sep-2024): la limitación territorial es facultativa de la entidad y una sucursal no acredita domicilio.

**Sin verificar hoy**: la versión vigente y las fórmulas de los documentos tipo de infraestructura social y de licitación (el proyecto las leyó el 1-nov y el 5-nov-2026), los criterios de desempate, y si en un proponente plural todos deben tener el domicilio cuando la limitación es territorial.

## Anexo C · Cómo repetir la medición

```
bash tools/analisis/plan_x20/descargar.sh <carpeta>
node tools/analisis/plan_x20/medir.js <carpeta> AAAA-MM-DD
```

Solo lee datos.gov.co. La carpeta de datos no se versiona; el resultado sí (`resultados_AAAA-MM-DD.json`). El conjunto de procesos se reemplaza entero en cada carga de SECOP II, así que dos corridas en días distintos dan cifras parecidas, no idénticas. Conviene repetirla cada mes.

Dos trampas del conjunto de ofertas que la medición ya esquiva: el mismo proponente aparece a veces con y sin código, y una fila «Confidencial» con valor cero acompaña a veces a la oferta real.

## Anexo D · Herramientas externas

Usted ofreció buscar repositorios públicos. La regla del proyecto es leer el código antes de adoptar nada, y este plan no necesita ninguna dependencia nueva: todo lo propuesto cabe en el árbol tal como es.

Fuente de esa regla: `docs/MEMORIA.md § «Herramientas de terceros para las sesiones de Claude: lo que entró, lo que no y por qué (17-oct-2026)»`.

Vistos por nombre el 11-nov-2026 en la búsqueda de GitHub, sin leer su código y sin recomendar ninguno: `Cespial/propuestas-secop` (un complemento de Claude Code para propuestas de SECOP) y `kevacevedo123/radar-licitaciones`. Si alguno interesa, una sesión lo lee entero antes de proponerlo.
