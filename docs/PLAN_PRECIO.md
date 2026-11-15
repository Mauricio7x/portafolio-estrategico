# PLAN PRECIO · A qué precio ofertar, por modalidad (14-nov-2026)

> Para: dueño · Estado: pendiente del dueño · Sustituido por: —

Este documento es la planeación que pidió el dueño el 14-nov-2026: cómo llegar a decir, con la mayor exactitud posible y en cualquier modalidad, a qué precio ofertar un proceso. Nada del código de la aplicación se tocó para escribirlo. Cada cifra lleva su fuente y su fecha; lo medido en esta sesión se puede repetir con `tools/analisis/plan_precio/` (Anexo C). Lo que no se pudo comprobar está dicho en la sección 1.3. Continúa el plan del 11-nov-2026 (`docs/PLAN_X20.md`) y no lo reemplaza.

## 0. En una página

**Lo que pidió.** Un plan para decir «casi con precisión exacta» a qué precio ofertar, sin importar la modalidad, sabiendo que cada una tiene sus reglas.

**La premisa que los datos corrigen.** Un precio exacto no existe donde el método de puntaje se sortea después del cierre, que es el caso de la licitación y la menor cuantía con documento tipo. Medido hoy, con todas las ofertas tomadas como hábiles: aun viendo todas las ofertas rivales antes de escribir la propia, el mejor precio quedaría primero en el 48,0 % de las menores cuantías y el 34,9 % de las licitaciones con tres o más ofertas. Para acercarse al 100 % harían falta las dos cosas que nadie tiene al ofertar: el método y las ofertas de los demás. Con las dos, 97,0 % y 99,4 %; con solo el método, 41,3 % y 31,9 %.

**Dónde sí se puede ser casi exacto y dónde no** (todo medido el 14-nov-2026 en los datos abiertos de SECOP II):

| Caso | Qué parte del mercado es | Qué tan exacto se puede ser | Hoy en Detekta | Con este plan |
|---|---|---|---|---|
| Llegan una o dos ofertas | 67,89 % de las menores cuantías, 59,04 % de las mínimas, 67,02 % del régimen especial y 28,89 % de las licitaciones | Casi exacto: se adjudica al tope del presupuesto (mediana de 99,97 % a 99,99 %) | Se anuncia con el historial de la entidad en el 38,80 % de las menores cuantías, con 90,23 % de acierto | Con el número de invitados, 47,86 % de las menores cuantías con 89,20 % de acierto, y 95,20 % donde las dos señales coinciden. El número sale con la invitación, pocos días antes del cierre: sirve para el precio, no para escoger dónde manifestar interés |
| Mínima cuantía con tres o más ofertas | 40,96 % de las mínimas | Se puede decir a qué precio se queda por debajo del ganador 7 o 9 de cada 10 veces, si la oferta queda hábil | Tabla de todo el país por número de oferentes | Medir si el historial de la entidad mejora esa tabla. Frente a un precio único para todo el país ahorra 5,1 puntos; frente a la tabla de hoy no se ha medido |
| Menor cuantía y licitación con tres o más ofertas | 32,11 % de las menores cuantías y 71,11 % de las licitaciones | No hay precio exacto. Ninguna regla conocida antes del cierre queda primera más veces que un precio fijo | La referencia general de la entidad queda 2,43 y 2,85 puntos alta. La referencia «con tres o más», que Precios enseña desde el 12-nov-2026, queda menos alta | Una referencia con los últimos 12 meses y, en licitación, con el centro de las ofertas (error mediano de 0,61 puntos). Ningún precio sugerido hasta que pasen las varas |
| Concurso de méritos | Interventoría y consultoría | Exacto: el precio no da puntos | Lo dice | Revisa la oferta contra el presupuesto |
| Pliego que deja conocer el método antes del cierre | Sin medir cuántos hay | Mayor solo si sale un método que premia al más bajo | No lo detecta | Lee la fecha de la TRM y avisa |

**La tesis.** El precio se decide en dos pasos, y el primero vale más que el segundo.

1. **Saber en cuál mercado está el proceso.** Donde llegan una o dos ofertas se adjudica al tope; donde llegan tres o más, entre 4 y 16 puntos por debajo (en régimen especial casi no baja). En menor cuantía eso se puede saber antes del cierre en casi la mitad de los procesos, y hay una señal que no se usaba: el número de invitados que SECOP II publica con la invitación.
2. **En el mercado peleado, estar en la zona correcta y no perder por otra cosa.** El precio solo explica al ganador un poco mejor que el azar. Lo que más pesa es quedar hábil y no regalar puntos: en mínima cuantía la oferta más barata se cae dos de cada tres veces, y en el piloto de evaluaciones leídas quedó hábil el 73,1 % de las ofertas.

**Cuatro hallazgos de hoy que cambian lo que la aplicación enseña.**

- El número de invitados anuncia la competencia: con 5 invitados o menos, el 96,14 % de los procesos de 2026 tuvo una o dos ofertas.
- La referencia general de precio de la entidad queda 2,43 a 2,85 puntos por encima del grupo real donde hay pelea, y el centro del grupo baja cada año: una referencia sin límite de fecha envejece. En Cali ninguna referencia pública habría avisado (sección 4.3).
- El índice de baja descarta cerca de la mitad de las adjudicaciones porque SECOP II publica el NIT del ganador como «No Definido».
- Saber quién llega y a cuánto suele ofertar mejora poco: no afina el centro del grupo, y con los oferentes reales da de 1 a 3 puntos más de primeros puestos en menor cuantía. Las empresas siguen al grupo.

**Lo primero que se construiría** (sección 7): el número de invitados en Mis procesos y en Precios, y la referencia de precio con los últimos 12 meses. Son dos tandas, cinco sesiones.

**Lo que este plan no logra.** No encontró una regla que diga a qué precio ofertar una licitación o una menor cuantía peleada mejor que un porcentaje fijo. Lo que sí deja medido es dónde está el límite, qué se puede saber antes y qué dato falta para pasar de ahí: quién queda hábil.

**Lo que decide usted** (sección 9): por dónde empezar, qué hacer con el régimen especial y con las adjudicaciones descartadas, y tres datos que solo usted puede ver.

## 1. Cómo se hizo y qué vale cada cifra

### 1.1 Fuentes y fecha

- **El árbol**, medido el 14-nov-2026 sobre el commit `8a112b0` con `node tests/estado.js`, `node tests/mapa.js` y la suite.
- **Datos abiertos** (datos.gov.co, consulta del 14-nov-2026): procesos de SECOP II (`p6dx-8zbt`), ofertas por proceso (`wi7w-2nvm` para lo recibido desde 2025, `b28v-edj8` y `bpan-xvj3` para lo anterior) y la serie de la TRM (`32sa-8pi3`). Scripts y resultados en `tools/analisis/plan_precio/`.
- **Normas**: documentos tipo, leyes, decretos y la guía de precio artificialmente bajo, bajados el 14-nov-2026 de Colombia Compra Eficiente, la Secretaría del Senado y el Banco de la República (Anexo B).
- **La crónica del proyecto** (`docs/MEMORIA.md`), citada por título de sección.
- **Cinco piezas de apoyo**, hechas por asistentes de esta sesión con un encargo cada una: la medición de los cuatro métodos, la de mínima cuantía y la TRM, la verificación de normas, el inventario del código y la búsqueda de literatura y repositorios. La sesión volvió a correr las comprobaciones de las mediciones, leyó en los textos descargados cada cita literal del Anexo B y midió por su cuenta las secciones 4.1 y 4.2.
- **Una revisión adversaria** del plan y de sus cifras, hecha por un asistente que no lo escribió y con una reproducción por hallazgo. Comparó 405 cifras con los archivos de resultados y 25 citas de normas con sus textos, y no encontró diferencias. Recalculó cuatro cifras con código propio: tres coincidieron y la cuarta quedó a tres décimas (66,6 % contra 66,3 %). Tumbó seis afirmaciones que el plan hacía de más, entre ellas que la referencia nueva habría avisado en Cali y que la mínima cuantía ya pasaba la vara. Están corregidas en este texto y contadas en la memoria del proyecto.

### 1.2 Cómo leer la evidencia

Cada afirmación lleva una de tres marcas. **M**: medido o ejecutado en esta sesión. **L**: leído en un archivo o en una sección de la memoria, con su fecha. **I**: inferencia; se dice qué la confirmaría.

Tres controles dicen que las mediciones de hoy son comparables con las del 11-nov-2026: el reparto de ofertas en menor cuantía (50,9 % con una oferta entonces y 50,91 % hoy), el acierto del anuncio por historial (90,7 % y 90,23 %) y el puesto de un precio fijo del 95 % contra grupos de 5 a 9 (15,9 % y 15,9 %).

### 1.3 Lo que no se pudo verificar

- **Producción.** `https://detekta-app.vercel.app` responde 302 hacia la pantalla de ingreso: no se leyó cuántas evaluaciones hay capturadas ni cómo guarda el histórico el campo del NIT.
- **Quién quedó hábil** en los procesos de los datos abiertos: no se publica. Todas las cuentas de precio de la sección 4.3 suponen «todas hábiles» y lo dicen.
- **El método que salió en cada proceso** y los puntos fuera del precio: no están en los datos abiertos.
- **La pantalla de proveedor de SECOP II**: la guía oficial leída describe la vista de la entidad.
- **Las fórmulas de los pliegos de régimen especial**: cada entidad tiene la suya.
- **Función Pública y SUIN-Juriscol** no abrieron desde esta sesión; el Anexo B dice con qué fuente se suplió cada norma.
- **Si el número de invitados cambia después del cierre**: se midió el valor que hoy publica cada proceso.
- **Los procesos desiertos**: todas las mediciones usan procesos adjudicados.

## 2. Qué quiere decir «precio exacto»: las cinco piezas

El precio de una oferta no es un número que se adivina: es el resultado de cinco piezas. Tres se pueden saber exactas antes de ofertar. Dos no, y lo único honesto es acotarlas y decir con qué acierto.

| Pieza | ¿Se sabe exacta antes del cierre? | De dónde sale | Cómo está hoy en Detekta |
|---|---|---|---|
| 1. Su piso: lo mínimo que puede cobrar sin perder plata | Sí, con el error que tenga su costo | Su APU, su AIU real y lo que le descuentan en cada acta | Existe en Precios («Su precio mínimo para no perder plata»). No está medido cuánto se aleja su costo calculado del costo real de una obra terminada |
| 2. El techo: lo máximo que el pliego admite | Sí | Pliego definitivo: presupuesto oficial, unitarios tope, AIU máximo | El presupuesto y las causales de rechazo se leen. El AIU máximo lo escribe usted y los unitarios tope no se leen como dato |
| 3. La regla con que ese pliego puntúa el precio | Sí | Pliego definitivo: fórmulas, tabla de centavos, fecha de la TRM, puntos | El motor de los cuatro métodos existe y la tabla de centavos se lee. No se lee la fecha de la TRM ni el puntaje económico, y el motor todavía no calcula dónde quedaría su oferta |
| 4. Los rivales: cuántos llegan, quiénes, cuáles quedan hábiles y a cuánto ofertan | No. Se acota | Historial de la entidad, lista de quienes manifestaron interés, evaluaciones de procesos cerrados | Se anuncia cuántos llegan (menor cuantía). La captura de quién quedó hábil está construida y sin cifra de avance conocida |
| 5. El sorteo del método | No, salvo que el pliego fije una TRM que ya se conozca al ofertar | Centavos de la TRM de la fecha que diga el pliego | Se dice que se sortea. No se avisa cuando la fecha del pliego permite conocer el método antes del cierre |

Dos consecuencias que ordenan todo el plan:

- **En las piezas 1, 2 y 3 la meta es exactitud completa**: cero ofertas rechazadas por precio, cero puntos regalados y un piso que no esconda pérdidas. Eso no depende de nadie más que de leer bien el pliego y de costear bien.
- **En las piezas 4 y 5 la meta es el mejor precio posible con lo que se puede saber, y decir cuántas veces acierta.** Un precio «exacto» ahí sería una cifra creíble y falsa.

Hechos que sostienen la tabla:

- La TRM de un día se calcula con las operaciones del día hábil anterior y queda certificada desde esa tarde: «con las operaciones del día y será vigente para el día siguiente» (Banco de la República, Circular Reglamentaria Externa DOAM-146 del 4-nov-2020, Asunto 8, leída el 14-nov-2026; no se verificó si una circular posterior la reemplazó). Por eso, si un pliego fija la TRM del día del cierre o de un día anterior, el método se conoce antes de ofertar; si fija un día posterior, no.
- En menor cuantía la entidad publica en SECOP II la lista de quienes manifestaron interés y la invitación lleva esa lista (Colombia Compra Eficiente, «SECOP II – Modalidades de contratación: selección abreviada de menor cuantía», 2026, capítulo 9, páginas 70 a 76, leída el 14-nov-2026). La guía describe la pantalla de la entidad: no se verificó qué ve un proveedor (decisión 4 de la sección 9).
- Con los hábiles reales y el método real, el motor de Detekta puso primero al ganador en 8 de 10 procesos; los dos fallos los decidieron puntos distintos del precio. Fuente: `docs/MEMORIA.md § «La prueba de los 30 del Nivel 3: con los hábiles reales el motor acierta en 6 de 9, y lo que falla son los puntos distintos del precio (26-oct-2026)»`.

## 3. Cómo decide el precio cada modalidad

Verificado el 14-nov-2026 en los textos oficiales (Anexo B). La última columna es la consecuencia para el precio.

| Modalidad | Cómo se califica el precio | ¿Se conoce la regla exacta al ofertar? | Qué precio conviene |
|---|---|---|---|
| Licitación de obra (transporte V4, social V2) | 48,5 puntos de 100. Uno de cuatro métodos: mediana, media geométrica, media aritmética baja o menor valor | No. El método sale de los centavos de la TRM del día hábil siguiente al pronunciamiento de la entidad en la audiencia (o del segundo, si es después de las 3:00 p. m.) | No hay un precio que se pueda recomendar con medición detrás (sección 4.3). Lo que se sabe: dentro del grupo y nunca por debajo del mínimo propio |
| Menor cuantía (transporte V3, social V1) | 49,5 puntos de 100. Los mismos cuatro métodos | No. TRM del segundo día hábil después del traslado del informe de evaluación | Con pocos invitados, el tope. Con muchos, igual que licitación |
| Licitación de agua (V1, hasta el 28-feb-2027) | 59,5 puntos de 100. Los mismos cuatro métodos | No. TRM del día hábil siguiente a la apertura de los sobres económicos | Igual que licitación; el precio pesa más |
| Mínima cuantía | Gana el menor precio entre quienes cumplen. Se revisa primero a la más barata; si no cumple, a la segunda | Sí. No hay sorteo | El más alto que todavía quede por debajo de los rivales que cumplen, sin bajar del mínimo propio |
| Concurso de méritos (interventoría y consultoría) | El precio no da puntos. La oferta económica del primero solo se revisa contra el presupuesto | Sí | El que cubre su costo y su utilidad dentro del presupuesto. Bajar no sirve de nada |
| Subasta inversa | Gana el menor precio al cierre de la puja | Sí | No es modalidad de obra: es para bienes y servicios de características técnicas uniformes. Si aparece, se puja hasta el mínimo propio y ni un peso menos |
| Régimen especial | Lo que diga el manual de la entidad y el pliego de ese proceso | Depende del pliego | Hay que leer la fórmula. Sin fórmula leída no hay precio que sugerir |

Cuatro reglas que valen en todas las de documento tipo:

- **Lo que rechaza la oferta por precio** (menor cuantía V3, numeral 1.15): pasar del presupuesto oficial, cambiar ítems o cantidades, dejar un unitario en cero, superar el unitario oficial donde la entidad lo señale, un AIU mayor que el de la entidad y una diferencia entre el Formulario 1 y lo escrito en SECOP II. En licitación V4 esa última no rechaza: manda lo escrito en SECOP II.
- **Precio artificialmente bajo.** La entidad pide explicación y decide; no hay un porcentaje legal automático. La guía de Colombia Compra Eficiente orienta así: con menos de 5 ofertas, pedir aclaración a las que estén 20 % o más por debajo del costo estimado; con 5 o más, a las que queden por debajo de la mediana de las ofertas menos su desviación estándar. En tres procesos leídos ese mínimo cayó cerca del 92 % del presupuesto (`docs/MEMORIA.md § «Lo que mostraron 5 procesos de menor cuantía ya adjudicados (17-oct-2026)»`). Consecuencia: ser el más barato por mucho no es gratis.
- **Puntos que no son del precio.** Calidad 30, industria nacional 20, discapacidad 1, empresa de mujeres 0,25 y Mipyme 0,25 (licitación de transporte V4). Con precios amontonados, un cuarto de punto decide.
- **Una sola oferta por proponente.** Hacer parte de más de una propuesta rechaza las dos, y concertarse con otro oferente es delito (Anexo B).

Tres diferencias con lo que hoy tiene el repositorio, para corregir en la tanda 5:

- `lib/metodos_ponderacion.js` solo conoce los puntajes 48,5 y 49,5. No cubre agua (59,5 hoy y 47,5 desde el 1-mar-2027) ni las convocatorias limitadas a Mipyme (48,75 y 49,75). Leído, sin reproducir.
- `tools/analisis/normas_metodos.json` cita una transcripción del Decreto 1082 de 2015 que en mínima cuantía sigue con el texto anterior al Decreto 1860 de 2021.
- La aplicación usa 88 %, 70 % y 80 % como referencia de precio bajo (`lib/apu/piso_techo.js`); la guía oficial no fija esos números.

## 4. Lo medido el 14-nov-2026

### 4.1 Lo primero que manda es cuántos compiten

Obra adjudicada con recepción de ofertas desde el 1-nov-2025, por modalidad (M; consulta del 14-nov-2026):

| Modalidad | Procesos | Con una oferta | Con una o dos | Con 3 a 9 | Con 10 o más | A cuánto se adjudicó con una o dos (mediana) | Con tres o más (mediana) |
|---|---|---|---|---|---|---|---|
| Menor cuantía | 2.703 | 50,91 % | 67,89 % | 25,86 % | 6,25 % | 99,99 % | 95,80 % |
| Mínima cuantía | 1.770 | 44,35 % | 59,04 % | 30,23 % | 10,73 % | 99,99 % | 83,85 % |
| Licitación | 1.125 | 18,58 % | 28,89 % | 21,60 % | 49,51 % | 99,97 % | 94,41 % |
| Régimen especial | 652 | 48,01 % | 67,02 % | 27,76 % | 5,21 % | 99,99 % | 99,43 % |

Las medianas cuentan las adjudicaciones entre 70 % y 100 % del presupuesto; en mínima cuantía, entre 30 % y 100 %, porque ahí el piso de 70 % deja fuera adjudicaciones reales (sección 4.4).

Control: en menor cuantía el plan del 11-nov-2026 midió 50,9 % con una oferta y 67,8 % con una o dos sobre 2.622 procesos; hoy son 2.703 y da lo mismo.

Lo que dice la tabla:

- **Hay dos mercados dentro de la menor cuantía, la licitación y la mínima cuantía.** Donde llegan una o dos ofertas se adjudica al tope del presupuesto, en todas las modalidades. Donde llegan tres o más, el precio baja: unos 4 puntos en menor cuantía, 6 en licitación y 16 en mínima cuantía. En régimen especial casi no baja (99,43 %).
- **La pregunta «a qué precio» se parte en dos.** Primero: ¿en cuál de los dos mercados está este proceso? Segundo, y solo si es el peleado: ¿dónde poner el precio?
- **La primera pregunta sí se puede contestar con mucho acierto antes de ofertar** en menor cuantía (sección 4.2). La segunda tiene un techo (sección 4.3).

Reproducción: `node tools/analisis/plan_precio/regimenes_medir.js <carpeta>` (Anexo C).

### 4.2 Una señal que no se usaba: cuántos fueron invitados (menor cuantía)

En menor cuantía solo puede ofertar quien manifestó interés y, si hubo sorteo, quien salió sorteado. SECOP II publica ese número en los datos abiertos (campo `proveedores_invitados` de `p6dx-8zbt`).

**Se publica antes del cierre, pero tarde (M).** El 14-nov-2026 había 274 procesos de menor cuantía de obra abiertos con cierre en los 30 días siguientes. Solo 15 traían el número de invitados: los que ya tenían publicada la invitación a ofertar, todos con cierre entre el 16 y el 19 de noviembre y con cero respuestas. En los demás el campo viene en 0, que ahí es «todavía sin dato», no «cero invitados».

El número aparece entonces después de manifestar interés y pocos días antes del cierre. Sirve para dos decisiones: si vale la pena terminar la oferta, y a qué precio. No sirve para escoger en qué procesos manifestar interés; para eso sigue el anuncio por historial.

**Anuncia cuántas ofertas llegan (M).** En 6.574 procesos de menor cuantía de obra adjudicados con recepción desde 2024 (el campo viene lleno en todos; se descartaron 4 con más ofertas que invitados):

| Invitados | Procesos | Con una sola oferta | Con una o dos | Con tres o más | A cuánto se adjudicó (mediana) |
|---|---|---|---|---|---|
| 1 | 218 | 100,00 % | 100,00 % | 0,00 % | 100,00 % del presupuesto |
| 2 | 202 | 88,12 % | 100,00 % | 0,00 % | 100,00 % |
| 3 | 182 | 76,92 % | 92,31 % | 7,69 % | 99,99 % |
| 4 a 5 | 335 | 83,88 % | 92,24 % | 7,76 % | 100,00 % |
| 6 a 9 | 622 | 73,47 % | 86,17 % | 13,83 % | 99,99 % |
| 10 | 2.414 | 28,62 % | 47,02 % | 52,98 % | 99,51 % |
| 11 o más | 2.601 | 37,68 % | 52,52 % | 47,48 % | 99,59 % |

**Resiste fuera de muestra (M).** La regla se aprendió con lo recibido antes de 2026 y se probó con los 2.031 procesos de 2026:

| Regla | Procesos de 2026 a los que aplica | Tuvieron una o dos ofertas | Tuvieron una sola |
|---|---|---|---|
| 2 invitados o menos | 116 (5,71 %) | 100,00 % | 92,24 % |
| 5 invitados o menos | 311 (15,31 %) | 96,14 % | 85,85 % |
| 9 invitados o menos | 517 (25,46 %) | 91,49 % | 81,24 % |

**Junto al anuncio que Detekta ya hace (M).** Se llamó la regla real del anuncio por historial (`lib/competencia_por_tamano.js:anunciarPoca`, con 4 procesos previos o más y anuncio de 0,8 o más) sobre los mismos 2.031 procesos de 2026:

| Señal | Procesos de 2026 | Parte del total | Tuvieron una o dos ofertas | Tuvieron una sola |
|---|---|---|---|---|
| El historial de la entidad anuncia poca competencia (lo de hoy) | 788 | 38,80 % | 90,23 % | 73,86 % |
| 9 invitados o menos | 517 | 25,46 % | 91,49 % | 81,24 % |
| Las dos a la vez | 333 | 16,40 % | 95,20 % | 87,99 % |
| Solo el historial, con 10 invitados o más | 455 | 22,40 % | 86,59 % | 63,52 % |
| Solo los invitados, sin anuncio del historial | 184 | 9,06 % | 84,78 % | 69,02 % |
| Cualquiera de las dos | 972 | 47,86 % | 89,20 % | 72,94 % |
| Ninguna | 1.059 | 52,14 % | 39,19 % | 23,04 % |
| Todos los procesos | 2.031 | 100,00 % | 63,12 % | 46,92 % |

Control: el plan del 11-nov-2026 midió 90,7 % sobre 760 procesos con el historial; hoy da 90,23 % sobre 788.

Sumar los invitados sube de 38,80 % a 47,86 % la parte de los procesos en que se puede anunciar poca competencia, con un acierto de 89,20 %. Los 184 procesos que se añaden aciertan menos (84,78 %) que los que ya anunciaba el historial. Lo que más cambia es la confianza: donde las dos señales coinciden el acierto sube a 95,20 %, y donde el historial anuncia poca competencia pero hay 10 invitados o más, baja a 86,59 %.

**Qué cambia en el precio.** Con pocos invitados el precio casi no compite: se adjudicó al 100 % del presupuesto (mediana). Ahí lo que decide es quedar hábil. Con 10 o más invitados más de la mitad de los procesos recibe tres o más ofertas, y aplica lo de la sección 4.3.

**El caso sin señal (M).** Una menor cuantía con 10 invitados o más y sin anuncio del historial es el 52,14 % de los procesos de 2026. Ahí llegaron una o dos ofertas en el 39,19 % y tres o más en el 60,81 %. Con lo medido no hay un precio que recomendar para ese caso: lo que hay son los hechos de la sección 4.3 y su mínimo propio. No se midió qué precio rinde más cuando no se sabe si llegará uno o llegarán seis (tanda 1).

**Lo que esta medición no dice.**

- Los datos abiertos traen el número, no los nombres de los invitados.
- Usted cuenta como un invitado más: «2 invitados» es usted y un rival posible.
- El «10» mezcla diez exactos con más de diez interesados sorteados a diez (`scripts/base_obra/fila.js`).
- Se midió el valor que hoy publica cada proceso ya adjudicado. Que ese valor no cambie después del cierre es una inferencia; la confirma guardar el número el día de la invitación y compararlo al adjudicar (tanda 1).
- Solo entran procesos adjudicados: los declarados desiertos no se contaron.

Reproducción: `node tools/analisis/plan_precio/invitados_medir.js <carpeta>` (Anexo C). Resultado en `tools/analisis/plan_precio/resultados_invitados_2026-11-14.json`.

### 4.3 Con tres o más ofertas y método sorteado: el techo y lo que sí mejora

Población (M): procesos de obra con tres o más ofertas válidas, cada una entre 70 % y 100 % del presupuesto. Se aprendió con lo recibido antes de 2026 y se probó con 2026: 649 menores cuantías (6.525 ofertas) y 470 licitaciones (11.299 ofertas). Las ofertas de 2020 a 2024 ya no están en el conjunto `wi7w-2nvm`: se bajaron de `b28v-edj8` y `bpan-xvj3`. Dos supuestos en toda la sección: todas las ofertas publicadas se toman como hábiles y cada método vale un cuarto.

Control: la tubería repitió las cifras del plan del 11-nov-2026. Con 5 a 9 ofertas, un precio propio del 95 % quedaba primero en 15,9 % y hoy da 15,9 %; del 94 %, 20,6 % y hoy 20,9 %.

**El techo que pone el sorteo (M).** Si usted pudiera ver todas las ofertas rivales antes de escribir la suya, y solo le faltara saber el método, el mejor precio único entre 85 % y 100 % del presupuesto quedaría primero en:

| Oferentes | Menor cuantía | Licitación | Si además cada rival tiene 3 opciones entre 10 de no quedar hábil |
|---|---|---|---|
| Todos los procesos | 48,0 % | 34,9 % | 38,5 % y 20,3 % |
| 3 a 4 | 60,7 % | 57,9 % | 54,2 % y 52,5 % |
| 5 a 9 | 43,8 % | 42,8 % | 34,3 % y 32,6 % |
| 10 o más | 28,2 % | 29,0 % | 11,8 % y 11,5 % |

Con la mejor información imaginable se queda primero cerca de la mitad de las veces, porque un solo precio no puede servir a los cuatro métodos. Si se permitiera bajar hasta el 70 % del presupuesto, la cifra sube poco: a 49,8 % y 36,9 % (medido por la revisión).

Hacen falta las dos cosas, el método y las ofertas rivales:

| Lo que se sabe al ofertar | Menor cuantía | Licitación |
|---|---|---|
| El método y todas las ofertas rivales | 97,0 % | 99,4 % |
| Todas las ofertas rivales, sin el método | 48,0 % | 34,9 % |
| Solo el método, con un precio fijo para cada uno (medido por la revisión) | 41,3 % | 31,9 % |
| Nada: uno entre todos, al azar | 16,1 % | 8,2 % |

Conocer solo el método ayuda en dos de los cuatro: si sale menor valor o media aritmética baja, gana quien más baja, y eso depende de su mínimo. Si sale mediana o media geométrica, un precio fijo queda primero entre 9,1 % y 18,0 % de las veces, cerca del azar.

**La referencia general de la entidad queda alta donde hay pelea (M).** Error al anticipar el centro del grupo de ofertas en 2026, en puntos del presupuesto, sobre todos los procesos de prueba:

| Referencia | Menor cuantía: error mediano | A ±2 puntos | Licitación: error mediano | A ±2 puntos |
|---|---|---|---|---|
| Lo adjudicado en la entidad, con cualquier número de ofertas | 2,12 | 49,3 % | 3,34 | 31,3 % |
| El centro de las ofertas de la entidad en los últimos 12 meses | 1,21 | 66,3 % | 0,61 | 86,0 % |
| Sabiendo quiénes llegaron y a cuánto suelen ofertar | 1,12 | 68,3 % | 0,61 | 86,2 % |

- La referencia general queda en promedio 2,43 puntos por encima del centro en menor cuantía y 2,85 en licitación. Es la mediana de lo adjudicado en todos los procesos de la entidad, y la mayoría tiene una o dos ofertas y se adjudica al tope. Es la que alimenta «el precio al que se suele adjudicar aquí» del panel de piso y techo.
- El centro de las ofertas de la entidad en los últimos 12 meses baja el error a casi la mitad en menor cuantía y a la quinta parte en licitación. En licitaciones de 10 o más oferentes acierta a ±1 punto en el 81,3 % de los procesos.

**Lo que Precios ya enseña desde el 12-nov-2026, medido por la revisión.** Precios dice a cuánto se adjudicó en la entidad «con tres o más ofertas» (`lib/grupo_ofertas.js:referenciaPorCompetencia`), calculado con hasta los últimos 200 adjudicados, sin límite de fecha. Comparadas en las entidades con 5 adjudicados peleados o más:

| Referencia | Menor cuantía: error mediano · queda alta en | Licitación: error mediano · queda alta en |
|---|---|---|
| Adjudicado con tres o más, todo el historial (como está hoy) | 1,58 · 1,22 | 1,34 · 1,41 |
| Adjudicado con tres o más, últimos 12 meses | 0,70 · 0,60 | 1,16 · 1,90 |
| Centro de las ofertas, últimos 12 meses | 0,91 · 0,35 | 0,69 · 0,35 |

Las filas no son del todo comparables entre sí: con 12 meses califican menos entidades (265 y 164 procesos de prueba) que con todo el historial (434 y 289). Aun así dicen dos cosas. En menor cuantía, la referencia que ya existe es tan buena como el centro de las ofertas si se limita a 12 meses. En licitación, el centro de las ofertas es mejor. La tanda 2 empieza por medir las tres sobre la misma población.

**En Cali ninguna referencia habría avisado (M, reproducido).** Proceso CO1.BDOS.10584652, recepción del 14-sep-2026: seis ofertas entre 93,30 % y 96,75 %, centro en 94,69 %, adjudicado al 94,12 %. Con lo adjudicado en los 12 meses anteriores a esa fecha, la referencia general de la entidad daba 98,58 %; la de «tres o más», 98,12 %; y el centro de las ofertas de 12 meses, 96,87 %. Su oferta de 96,75 % habría parecido dentro del grupo con cualquiera de las tres. Los centros de los 14 procesos anteriores de esa entidad van de 87,6 % a 99,2 %: en una entidad así el grupo no se anticipa.
- Esa referencia usa el historial de la entidad cuando tiene tres procesos peleados o más en el año (46,7 % de la prueba en menor cuantía y 43,0 % en licitación). En el resto cae al centro de las ofertas de su modalidad y tamaño en todo el país, que en licitación ya acierta por sí solo (error mediano de 0,69 puntos) y en menor cuantía no (2,01).
- La ventana de 12 meses importa: el centro baja cada año (en menor cuantía, de 97,7 % en 2020 a 95,0 % en 2026). Con todo el historial el error sube.

**Saber quién llega mejora poco (M).** Con los oferentes reales y la costumbre de cada uno, el error del centro es casi el mismo (1,12 contra 1,21 y 0,61 contra 0,61). Solo aplica al 39,9 % de los procesos de menor cuantía y al 0,9 % de las licitaciones, porque el 69 % de las ofertas de licitación no trae NIT y los consorcios cambian de nombre. Y las empresas no repiten su porcentaje: siguen al grupo (su oferta queda a 0,78 puntos del centro de las demás y a 1,25 de su propia costumbre). En primeros puestos sí da algo en menor cuantía: 1,3 puntos más que un precio fijo (de 0,2 a 2,3), y 2,6 (de 1,1 a 4,0) donde se conoce cuánto se aparta cada rival del nivel de su mercado. En licitación no da nada medible. La ficha de precio por rival queda al final de la fila: vale poco y exige saber antes quiénes son los invitados (decisión 4).

**Acertar el centro es un filo, y por eso ninguna regla le gana a un precio fijo (M).** En menor cuantía, una oferta 0,1 puntos por debajo del centro real queda primera el 33,2 % de las veces; 0,1 por encima, el 15,2 %. Con un error de más de un punto no se puede apuntar a ese filo. Resultado, con la regla escogida en 2025 y probada en 2026:

| Regla | Menor cuantía: queda primera · precio medio · ventaja sobre el precio fijo del mismo nivel | Licitación |
|---|---|---|
| Al azar, uno entre todos | 16,1 % | 8,2 % |
| Lo adjudicado en la entidad (lo de hoy) | 17,7 % · 95,84 % · −1,0 (de −2,4 a 0,4) | 6,4 % · 96,02 % · −0,4 (de −1,4 a 0,7) |
| El centro de las ofertas de la entidad | 20,6 % · 95,03 % · −0,6 (de −1,7 a 0,5) | 11,1 % · 93,62 % · +0,8 (de −0,2 a 1,8) |
| Sabiendo el centro real (solo se sabe después) | 30,5 % · 95,16 % · +9,7 (de 8,2 a 11,3) | 22,8 % · 94,67 % · +14,3 (de 13,0 a 15,6) |

Ninguna regla que se conozca antes del cierre queda primera más veces que ofertar siempre al mismo porcentaje: los intervalos incluyen el cero.

En plata la respuesta cambia un poco. Valor esperado por proceso ofertado, en puntos del presupuesto: la mejor regla conocida antes menos el mejor precio fijo, las dos escogidas con 2025 y medidas en 2026.

| Su costo (% del presupuesto) | Menor cuantía | Licitación |
|---|---|---|
| 85 | +0,19 (de 0,07 a 0,32) | −0,16 (de −0,29 a −0,03) |
| 88 | +0,07 (de −0,04 a 0,17) | +0,09 (de −0,02 a 0,20) |
| 90 | +0,02 (de −0,06 a 0,09) | −0,03 (de −0,09 a 0,03) |
| 92 | 0,00 (de −0,05 a 0,05) | −0,03 (de −0,07 a 0,01) |

Hay una ventaja pequeña y solo en un caso: menor cuantía con un costo propio del 85 %, donde ofertar un punto por debajo del centro de las ofertas de la entidad deja 2,28 puntos por proceso contra 2,09 del precio fijo. En licitación, con ese mismo costo, la regla pierde. Con costos más altos no hay diferencia. No alcanza para que la aplicación sugiera un precio en estos procesos.

**Lo que da cada nivel de precio, como referencia (M).** Procesos de 2026 en que un precio fijo quedaría primero, con todas hábiles:

| Precio propio (% del presupuesto) | 90 | 92 | 94 | 95 | 96 | 97 | 98 |
|---|---|---|---|---|---|---|---|
| Menor cuantía | 29,2 % | 26,9 % | 23,2 % | 21,3 % | 18,1 % | 15,1 % | 12,0 % |
| Licitación | 20,1 % | 15,7 % | 9,1 % | 8,4 % | 6,8 % | 4,8 % | 3,5 % |

No es una probabilidad de ganar: el supuesto «todas hábiles» favorece de más a los precios bajos, y no se midió el trámite de precio artificialmente bajo que abre una oferta muy baja.

**El precio explica poco quién ganó (M).** Con todas hábiles, el ganador real habría quedado primero en alguno de los cuatro métodos en el 58,3 % de las menores cuantías (al azar, 51,5 %) y en el 37,6 % de las licitaciones (al azar, 29,6 %). El ganador real ofertó por encima del centro de los demás en el 43,0 % y el 41,0 % de los casos. Lo que falta para explicar el resto es quién quedó hábil y los puntos fuera del precio (sección 4.6).

**Régimen especial (M, 128 procesos de prueba).** El precio manda más: el ganador real fue la oferta más baja en el 34,7 % de los procesos (al azar, 24,9 %), y un precio fijo del 95 % quedaría primero en el 32,2 % (al azar, 19,5 %). Las fórmulas reales de esos pliegos no se conocen: se aplicaron las cuatro del documento tipo como referencia.

Reproducción: los cinco pasos de `tools/analisis/plan_precio/cuatro_metodos_*` (Anexo C). Las comprobaciones propias de la medición se volvieron a correr en esta sesión y pasan: ningún dato del futuro entra en una predicción, y el techo calculado coincide con una rejilla más fina.

### 4.4 Mínima cuantía: gana el menor precio, pero la más barata se cae dos de cada tres veces

Población (M): 6.423 mínimas cuantías de obra adjudicadas con recepción desde 2022; 5.229 para aprender y 1.194 de 2026 para probar. Los datos abiertos de ofertas solo traen lo recibido desde 2025, así que los hechos que usan ofertas salen de 2025 y 2026. Control: la medición del 11-nov-2026 se repitió sobre los datos de hoy y dio lo mismo (error de la referencia de la entidad 5,21 puntos; era 5,25).

**A cuánto se adjudica según cuántos llegan (M).**

| Ofertas | Parte de los procesos | Precio de adjudicación: uno de cada cuatro quedó por debajo de | La mitad quedó por debajo de (mediana) | Uno de cada cuatro quedó por encima de |
|---|---|---|---|---|
| 1 | 32,8 % | 98,8 % | 100,0 % | 100,0 % |
| 2 | 15,8 % | 89,6 % | 98,0 % | 100,0 % |
| 3 a 4 | 18,3 % | 81,4 % | 90,0 % | 98,7 % |
| 5 a 9 | 19,2 % | 77,0 % | 83,0 % | 93,0 % |
| 10 o más | 13,9 % | 68,1 % | 77,6 % | 87,6 % |

La tabla cuenta desde 2022. En 2026 la parte con una sola oferta fue mayor: 43,0 %.

**La oferta más barata no es la que gana (M).** En 1.674 procesos con dos o más ofertas publicadas, el adjudicado no fue la oferta más baja en 1.110 (66,3 %). Sigue en 51,5 % si se exige que la más baja estuviera al menos 5 puntos por debajo. Y la más baja gana menos cuanto más baja es: gana el 44,5 % de las veces cuando está entre 90 % y 100 % del presupuesto y el 28,6 % cuando está por debajo de 70 %. Los datos abiertos no dicen por qué se cae (requisitos, precio artificialmente bajo o una cifra mal digitada). La conclusión sí es firme: en mínima cuantía también decide quedar hábil.

**Cuánto hay que bajar para quedar por debajo del ganador (M).** Si su oferta queda hábil, gana cuando su precio queda por debajo del precio al que se adjudicó. Se probó en 2026 a qué precio habría que ofertar para lograrlo 7 de cada 10 y 9 de cada 10 veces, con cada referencia. La columna «lo habría logrado» es una cuenta sobre procesos ya cerrados y supone que la oferta queda hábil; no es una adjudicación.

| Referencia | Para 7 de cada 10: precio medio | Lo habría logrado | Para 9 de cada 10: precio medio | Lo habría logrado |
|---|---|---|---|---|
| Un solo precio para todo el país | 83,9 % | 73,9 % | 72,0 % | 91,0 % |
| El historial de la entidad, apoyado en el país donde hay poco | 88,0 % | 75,1 % | 78,7 % | 90,0 % |
| Sabiendo cuántos llegaron (no se conoce antes) | 88,4 % | 77,1 % | 80,0 % | 91,8 % |

- Usar el historial de la entidad ahorra 5,1 puntos del presupuesto frente a un precio único para todo el país (de 3,5 a 6,7) en la meta de 7 de cada 10, y 6,0 puntos (de 3,9 a 7,1) en la de 9 de cada 10.
- **Esa comparación no es contra lo que la aplicación usa hoy.** La tabla de hoy va por número de oferentes y la rebaja la entidad; esa no se midió. El modelo más parecido que sí se midió (por competencia anunciada) ya ahorra 4,12 puntos en la meta de 7 de cada 10 y 2,52 en la de 9 de cada 10. La ganancia de pasar a la entidad sería entonces de cerca de 1 punto en la primera y de 3,4 en la segunda, y está por medir contra la tabla real.
- La cuenta queda en el borde: donde se buscaba 7 de cada 10 salió 75,1 %, cinco puntos por encima.
- El ahorro existe donde la entidad tiene 5 adjudicados o más (66,9 % de los procesos de prueba). Con menos historial no se distingue de cero.
- El tamaño del presupuesto no separa: el 99,2 % de las mínimas cuantías cae en el tramo más pequeño de la aplicación.

**Con plata, el mejor precio queda arriba (M).** Para un costo propio entre 75 % y 90 % del presupuesto, el precio fijo que más deja en promedio está entre 97,0 % y 98,7 %. El modelo por entidad lo supera apenas (entre 0,05 y 0,37 puntos por proceso) cuando oferta el mejor precio de cada grupo, y pierde contra el precio fijo (entre 0,96 y 1,63 puntos) cuando su regla se escoge solo con 2025. La razón: en 2026 el 43,0 % de los procesos tuvo una sola oferta y ahí se gana arriba; donde llegan cinco o más, el precio ganador (mediana 83,0 %) queda por debajo del costo de casi cualquiera. En mínima cuantía rinde más escoger dónde presentarse que pelear el precio.

**Lo que esta medición supone.** Que su oferta queda hábil, que nadie cambia su precio porque usted se presente, y que solo cuentan los adjudicados. No mide el trámite de precio artificialmente bajo. Cuenta las adjudicaciones al presupuesto exacto (27,3 % de la población), que la tabla de la aplicación deja fuera desde el 30-sep-2026. El mejor modelo se escogió mirando 2026 y los intervalos se calcularon por proceso, no por entidad: pueden ser algo estrechos.

**Dos defectos de la aplicación que esta medición destapó.**

- El piso de 70 % del presupuesto que usan los análisis deja fuera adjudicaciones reales de mínima cuantía: 529 de 6.427 (8,2 %) se adjudicaron por debajo. Para esta medición se usó de 30 % a 100 %.
- **El índice de baja descarta cerca de la mitad de las adjudicaciones** (M, ejecutando `lib/indice_baja.js:adjudicatarioReal` sobre las filas de hoy). SECOP II publica el NIT del ganador como «No Definido» en muchas filas que sí traen el nombre y el código del proveedor, y la regla las saca. Desde 2024 son el 43,3 % de las filas de mínima cuantía, el 39,4 % de menor cuantía, el 48,6 % de licitación y el 55,8 % de régimen especial. La mediana de lo adjudicado es casi igual en las conservadas y en las descartadas en menor cuantía (99,82 % y 99,80 %), mínima cuantía (97,39 % y 97,38 %) y régimen especial (99,97 % y 99,95 %); en licitación las descartadas quedan 0,84 puntos más abajo (95,15 % y 94,31 %). Lo seguro es que deja a más entidades sin referencia; si además tuerce alguna, hay que medirlo entidad por entidad. De las descartadas, 2.879 de 2.880 en menor cuantía traen nombre y código. Todo esto se midió sobre filas adjudicadas: no dice nada de filas sin adjudicar. El proyecto lo conocía y decidió no tocarlo el 6-sep-2026, sin haber medido el tamaño. No se verificó que el histórico de producción guarde el campo igual que la fila cruda (tanda 3).

Reproducción: `node tools/analisis/plan_precio/minima_medir.js <carpeta>` (Anexo C).

### 4.5 El sorteo del método no se puede anticipar

Serie oficial de la TRM (Superintendencia Financiera, conjunto `32sa-8pi3` de datos.gov.co, actualizada el 13-nov-2026): 1.628 certificaciones entre el 1-ene-2020 y el 14-nov-2026, sin huecos (M).

- **Los cuatro rangos salen por igual**: 25,0 %, 25,6 %, 24,3 % y 25,1 %. La diferencia es la que daría el azar.
- **El rango de un día no anuncia el del siguiente**: repite el anterior el 25,3 % de las veces, lo mismo que el azar. Probado fuera de muestra, anunciarlo acierta 23,4 %.
- **Casi nunca se conoce antes.** Con la regla «día hábil siguiente», la TRM ya estaba certificada en 55 de 1.681 fechas (3,3 %), por festivos de Estados Unidos. Con la regla «segundo día hábil», en 1 de 1.680.

Consecuencia: en los pliegos de documento tipo cada método vale un cuarto y no hay ventaja que buscar ahí. Donde un pliego no sigue el documento tipo y fija la TRM del día del cierre o de antes, el método se conoce al ofertar; eso ayuda si sale uno de los dos métodos que premian al más bajo (sección 4.3). No se midió cuántos pliegos hay así (tanda 5).

Reproducción: `node tools/analisis/plan_precio/trm_medir.js <carpeta>` (Anexo C).

### 4.6 Quién queda hábil y los puntos fuera del precio

Esto no se midió hoy: es lo que el proyecto ya había leído y sigue siendo lo que más pesa.

- Con los hábiles reales y el método real, el motor puso primero al ganador en 8 de 10 procesos; los dos fallos fueron por puntos distintos del precio.
- En 20 procesos del piloto con la lista de hábiles leída, quedaron hábiles 226 de 309 ofertas (73,1 %; calculado hoy sobre `tools/analisis/nivel3_piloto_lectura_2026-10-26.json`). Son 20 procesos escogidos, no una muestra del país.
- En cinco menores cuantías leídas completas, ninguna oferta cayó por precio: cayeron por papeles.
- La aplicación ya captura de los informes de evaluación quién quedó hábil, con qué puntaje de precio y con cuántos puntos en total. No se sabe cuántas capturas hay: producción no se pudo leer desde esta sesión (decisión 5 de la sección 9).

Fuentes:

- `docs/MEMORIA.md § «La prueba de los 30 del Nivel 3: con los hábiles reales el motor acierta en 6 de 9, y lo que falla son los puntos distintos del precio (26-oct-2026)»`
- `docs/MEMORIA.md § «Lo que mostraron 5 procesos de menor cuantía ya adjudicados (17-oct-2026)»`
- `docs/MEMORIA.md § «Las evaluaciones de cada entidad entran a la aplicación: el navegador lee el documento, una sesión de madrugada lo interpreta y la aplicación verifica cada cita (26-oct-2026)»`

### 4.7 Lo que estos hechos dicen de un proceso concreto

Una tabla de bolsillo con lo medido. No es un precio sugerido: donde la columna del medio no alcanza para decidir, lo dice. Las cuentas de «quedaría primero» suponen todas las ofertas hábiles.

| Su proceso | Lo que pasó en procesos así | Qué pesa más |
|---|---|---|
| Menor cuantía con 5 invitados o menos | Una o dos ofertas en 96,14 % de 311 procesos de 2026. Se adjudicó al tope del presupuesto (mediana de 99,99 % a 100,00 %) | Quedar hábil. El precio casi no compite |
| Menor cuantía con 6 a 9 invitados | Una o dos ofertas en 86,17 % de 622 procesos | Quedar hábil; con un rival, el puntaje del precio favorece al más bajo |
| Menor cuantía con 10 invitados o más, y el historial de la entidad anuncia poca competencia | Una o dos ofertas en 86,59 % de 455 procesos de 2026 | Lo mismo, con menos certeza |
| Menor cuantía con 10 invitados o más, sin anuncio | Tres o más ofertas en 60,81 % de 1.059 procesos de 2026. Un precio fijo del 95 % quedaría primero en 21,3 % de los peleados; uno entre todos, al azar, en 16,1 % | No hay precio medido que recomendar. El aviso de Precios sobre dónde quedaría frente a las ofertas de la entidad, y su mínimo |
| Licitación (la mitad tiene 10 oferentes o más) | Un precio fijo del 95 % quedaría primero en 8,4 %; al azar, en 8,2 %. Bajar al 92 % lo sube a 15,7 % | Quedar hábil y tener todos los puntos. El precio, dentro del grupo; ahí es casi una lotería |
| Mínima cuantía donde suele llegar uno | Se adjudica al 100 % (mediana); en 2026 el 43,0 % tuvo una sola oferta | Presentarse y quedar hábil |
| Mínima cuantía con 5 a 9 ofertas | Se adjudica al 83,0 % (mediana), y entre todas las mínimas con dos ofertas o más la más barata no es la adjudicada dos de cada tres veces | Si su costo no cabe ahí, no es su proceso |
| Concurso de méritos | El precio no da puntos | La experiencia y el equipo; la oferta económica, dentro del presupuesto |

## 5. Qué dice hoy Detekta del precio

Inventario leído en el código el 14-nov-2026 (commit `8a112b0`). La última columna se ejecutó: se llamó a `lib/apu/optimizador.js:optimizarPrecioOferta` con el mismo proceso y solo se cambió la modalidad.

| Modalidad | Qué dice hoy | ¿Sugiere un precio? (ejecutado) |
|---|---|---|
| Licitación de obra | El método se sortea por los centavos de la TRM. Junto a su precio va el hecho contado: cuántas de cada 100 ofertas a ese precio ganaron. El techo es «el precio al que se suele adjudicar aquí», una referencia | No (`el_precio_no_predice`) |
| Menor cuantía | Lo mismo, más la competencia anunciada y la referencia de la entidad con una o dos ofertas y con tres o más | No (`el_precio_no_predice`) |
| Mínima cuantía | Gana el menor precio. Tabla medida: en cuántos de cada 100 procesos el ganador bajó menos que usted, según cuántos suelen llegar | Sí, con la tabla medida. Sin la tabla, no (`gana_el_menor_precio`) |
| Subasta | Gana el menor al cierre de la puja | No (`gana_el_menor_precio`) |
| Concurso de méritos | El precio no da puntos | No (`el_precio_no_puntua`) |
| Régimen especial | «No consta» cómo puntúa el precio | **Sí**, con una curva supuesta (25 % menor valor y 75 % métodos centrales) que nunca se midió |
| Modalidad vacía o no reconocida | «No consta» | **Sí**, con la misma curva supuesta |

Tres huecos que salen del inventario:

1. **El motor de los cuatro métodos no se usa para su oferta.** `lib/metodos_ponderacion.js` solo recalcula informes de evaluación ya publicados. Lo que Precios sí hace desde el 11 y el 12-nov-2026 es contar en cuántos procesos anteriores de la entidad su precio habría quedado por encima de todas las ofertas o de la mitad, y decir a cuánto se adjudicó allí con una o dos ofertas y con tres o más (`lib/grupo_ofertas.js`).
2. **Faltan datos del pliego que deciden el precio**: la fecha de la TRM, el puntaje económico, el AIU máximo y los unitarios tope no se leen como datos (`lib/documentos_proceso.js`, versión 28 de los hechos).
3. **Donde menos se sabe es donde hoy se sugiere.** En régimen especial la aplicación da un precio con una curva supuesta. Es una decisión vigente y declarada, no un descuido: el 28-oct-2026 se dejó «con su supuesto dicho» porque no se había medido. Este plan lo mide o lo apaga (tanda 7).

Fuentes:

- `docs/MEMORIA.md § «El % de adjudicación según el precio no se enseña porque se midió que no predice: en licitación y menor cuantía se dice cuántas ofertas ganaron a ese precio (28-oct-2026)»`
- `docs/MEMORIA.md § «La mínima cuantía con su tabla medida: la probabilidad es en cuántas de cada 100 el ganador bajó menos que usted (30-sep-2026)»`
- `docs/MEMORIA.md § «Qué tan cerca se anticipa el precio ganador por modalidad, y la referencia de la entidad por competencia en Precios (12-nov-2026)»`

## 6. El motor de precio por proceso

Hoy Precios enseña varias referencias sueltas (la baja de la entidad, la frecuencia por precio, el grupo, el piso y el techo). El plan las reúne en una sola respuesta por proceso, construida en cuatro capas. Cada capa se enciende cuando pasa su propia vara (sección 8); mientras no pase, se muestra la capa anterior, que ya es cierta.

**Capa 1 · Los límites exactos.** Lo que no depende de nadie más.

- Su mínimo: el costo de su APU, su AIU real y lo que le descuentan en cada acta, con el margen de error que tenga su costo (tanda 9).
- El máximo: la cifra más baja entre el presupuesto de SECOP II y el del pliego definitivo, y los topes que ese pliego ponga a los unitarios y al AIU.
- La revisión del Excel de la oferta contra cada causal de rechazo por precio de ese pliego. Una por una: pasa o no pasa.
- Los puntos que no dependen del precio y que su oferta va a recibir.

**Capa 2 · El escenario de ese proceso.** Hechos contados, sin probabilidad.

- Cuántos pueden ofertar: en menor cuantía, el número de invitados que SECOP II publica antes del cierre (sección 4.2); en las demás, lo que anuncia el historial de la entidad.
- A cuánto se adjudicó en esa entidad con esa competencia.
- Con qué fórmula puntúa ese pliego, y si el método ya se conoce o se sortea después.
- Dónde habría quedado su precio en los procesos anteriores de esa entidad, método por método, calculado con el motor real (`lib/metodos_ponderacion.js`).

**Capa 3 · La simulación.** Solo donde las varas 2 y 3 estén cumplidas (sección 8). Hoy no lo están en ninguna modalidad.

- Se arman muchos procesos posibles con lo que se sabe de ese: cuántos rivales llegan, a qué precio suele ofertar ese tipo de rival en esa entidad, cuántos quedan hábiles y qué método sale. Cada uno se califica con la fórmula real del pliego.
- Para cada precio entre su mínimo y el máximo se cuenta en cuántos de esos procesos su oferta queda primera y cuánta plata deja.
- La salida es un precio, la zona alrededor donde el resultado es casi igual, y el hecho contado: «de cada 100 procesos como este, con este precio quedaría primero en N; por azar, en M». Al lado va cuántas veces acertó esa cuenta en procesos ya cerrados de esa modalidad. Una cuenta «de cada 100» nunca sale sin su azar al lado: es regla del proyecto desde el 28-oct-2026.

**Capa 4 · El registro.** Cada precio que la aplicación recomiende se guarda con los datos que usó. Cuando el proceso se adjudica, se compara con lo que pasó. De ahí sale el marcador de la sección 8, que se repite cada mes.

Reglas que el motor hereda del proyecto y que no se negocian:

- Sin dato no es cero. Si falta el número de invitados, la fórmula o el costo, la capa que lo necesita no sale y dice qué falta.
- En precios cuesta el falso positivo: ante la duda no se sugiere.
- Un dato publicado gana a uno calculado: el presupuesto del pliego definitivo manda sobre el de SECOP II, y la fórmula del pliego manda sobre la del documento tipo.
- Se muestra el hecho, no el modelo: «en cuántos de cada 100», nunca «probabilidad».
- Una sola casa para cada regla: los métodos en `lib/metodos_ponderacion.js`, la regla por modalidad en `lib/guia_proceso.js:comoSeGanaElPrecio`. El motor las llama.
- Todo cabe en el árbol actual: las operaciones nuevas se pliegan en `api/apu.js`, sin archivos nuevos en `api/` y sin dependencias.

## 7. La ruta por entregas

Doce tandas en el orden en que más rinden: primero lo que ya está medido y cuesta poco, al final lo que depende de datos que todavía no existen. Cada tanda dice qué decide, qué se construye, qué cifra mueve y cómo se cierra. Una sesión es una jornada de trabajo de Claude Code con la suite completa. Toda tanda que mueva un precio o un orden en pantalla lleva antes su plan corto y su visto bueno.

### 7.1 Entrega 1 · Saber antes en cuál de los dos mercados está el proceso

- **Tanda 1 · El número de invitados en menor cuantía.**
  - Decide: una vez publicada la invitación, si el proceso va a tener una o dos ofertas. Con eso se decide si vale la pena terminar la oferta y en qué mercado se está para el precio. No decide dónde manifestar interés: el número sale después.
  - Se construye: guardar el número de invitados de los procesos abiertos (hoy `lib/proyeccion.js` solo lo conserva en el histórico) y decirlo como hecho en Mis procesos y en Precios: «Invitados a ofertar: 4. Con 4 o 5 invitados llegaron una o dos ofertas en 92 de cada 100 procesos; en general, en 60 de cada 100». Un 0 en ese campo se trata como «sin dato». Se mide además el caso sin señal: qué precio rinde más cuando hay 10 invitados o más y el historial no anuncia nada.
  - Mueve: un hecho nuevo en pantalla. Ningún precio y ningún orden.
  - Cierre: la medición de la sección 4.2 corre dentro de la suite con la regla real y da lo publicado (96,14 % con 5 invitados o menos; 95,20 % donde coinciden las dos señales). Además se guarda el número el día de la invitación y se compara al adjudicar: si cambia, la señal se retira.
  - Tamaño: 2 sesiones.
  - *Hecha en parte el 15-nov-2026*: Precios ya dice cuántos proveedores fueron invitados a ofertar y, con ese número, en cuántos de cada 100 procesos llegaron una o dos ofertas, con la cifra general al lado. La tabla sale de `data/invitados_menor_cuantia.json`, que se genera con la medición, y la primera vez que se ve el número queda guardada con su fecha para comprobar después que no cambia. Una invitación cancelada no cuenta: la revisión del cambio encontró un proceso real que decía 269 invitados donde los vigentes eran 10. Falta: decirlo en Mis procesos (pide que la sincronización conserve el campo en los procesos abiertos), la comparación al adjudicar y la medición del caso sin señal. Memoria: «El número de invitados en Precios, el índice de archivos entero y tres arreglos de la auditoría (15-nov-2026)».

### 7.2 Entrega 2 · Una referencia que no envejezca donde hay pelea

- **Tanda 2 · La referencia de precio con los últimos 12 meses.**
  - Decide: en qué zona está el grupo cuando se esperan tres o más ofertas.
  - Se construye, en este orden: primero la medición de las tres referencias de la sección 4.3 sobre la misma población, llamando las funciones reales de la aplicación. Después, según lo que dé: limitar a 12 meses la referencia «con tres o más» que Precios ya enseña (`lib/grupo_ofertas.js:referenciaPorCompetencia`); en licitación, decir además el centro de las ofertas; y que el panel de piso y techo deje de llamar «el precio al que se suele adjudicar aquí» a una cifra que en procesos peleados queda 2,4 a 2,9 puntos alta.
  - Mueve: la referencia de precio en licitación y menor cuantía. Lleva plan y visto bueno.
  - Cierre: la medición fuera de muestra, con el error que resulte publicado junto a la frase. El caso de Cali entra a la suite como lo que es: un proceso en el que ninguna de las tres referencias avisa. Una referencia nueva no puede presentarse como la que lo habría evitado.
  - Tamaño: 3 sesiones.
- **Tanda 3 · Las adjudicaciones que el índice de baja deja fuera.**
  - Decide: que más entidades tengan referencia de precio.
  - Se construye: primero la medición en producción (cuántas filas descarta hoy el índice por NIT «No Definido» y cuánto cambia la mediana de cada entidad si se recuperan las que traen nombre y código). Después, si usted lo aprueba, el cambio en `lib/indice_baja.js:adjudicatarioReal`.
  - Mueve: todas las referencias de baja. Deshace una decisión del 6-sep-2026, tomada sin saber que eran cerca de la mitad de las filas: es decisión suya (decisión 3).
  - Cierre: tabla de antes y después por entidad, y ninguna mediana se mueve más de lo que el plan corto anticipe sin explicación.
  - Tamaño: 2 sesiones.

### 7.3 Entrega 3 · Mínima cuantía con la entidad

- **Tanda 4 · La tabla de mínima cuantía, medida contra sí misma.**
  - Decide: si el historial de la entidad mejora el precio sugerido de mínima cuantía, que es el único que la aplicación da hoy con una tabla medida.
  - Se construye, en este orden: primero la medición que falta, con la tabla real de la aplicación (`lib/indice_baja.js`, por número de oferentes y con la rebaja de la entidad) y sus mismas exclusiones, contra la versión apoyada en la entidad. Solo si la segunda gana con la regla escogida en el año anterior, se cambia. De paso se cierran dos pendientes: el tramo de oferentes contado solo con mínimas cuantías, y el piso de 70 % de los análisis.
  - Mueve: el precio sugerido de mínima cuantía, y revisa una decisión del 30-sep-2026 (la tabla por tramo y no por entidad, porque entonces solo 72 entidades tenían 10 procesos o más). Lleva plan y visto bueno.
  - Cierre: la versión nueva pasa la vara 2 completa contra la tabla de hoy; si no la pasa, la tabla se queda como está y se escribe por qué.
  - Tamaño: 3 sesiones.

### 7.4 Entrega 4 · Lo exacto del pliego

- **Tanda 5 · Los datos económicos del pliego que faltan.**
  - Decide: el techo exacto, y si el método ya se conoce.
  - Se construye: lectura con cita de la fecha de la TRM (con el aviso «el método se sortea después del cierre» o «el método ya se puede conocer»), el puntaje económico de ese pliego (48,5, 49,5, 59,5, 48,75, 49,75 o el propio), el AIU máximo y los unitarios tope. Se corrigen las tres diferencias de la sección 3.
  - Mueve: ningún precio; añade hechos.
  - Cierre: en los pliegos reales que el proyecto ya tiene leídos (los 5 de la muestra y los del piloto de 30) cada dato sale con su cita o dice «no consta». Se cuenta en cuántos el método se conoce antes del cierre.
  - Tamaño: 3 sesiones.
- **Tanda 6 · Dónde habría quedado su precio, método por método.**
  - Decide: si su precio está dentro del grupo con cada uno de los cuatro métodos.
  - Se construye: el motor real (`lib/metodos_ponderacion.js`), con el puntaje y la fórmula de ese pliego, contra los grupos de ofertas de los procesos anteriores de la entidad. Sale como hecho contado y con su azar al lado: «en los 21 procesos anteriores de esta entidad, con este precio habría quedado primero con la mediana en 3 y con la media geométrica en 4; una oferta cualquiera, en 3». Reúne las tandas 13 y 14 del plan del 11-nov-2026.
  - Mueve: ningún precio sugerido. Es la capa 2 completa.
  - Lo que no hace: no aconseja ponerse «donde se gana con más métodos». Ese consejo se retiró el 28-oct-2026 porque, medido con todas hábiles, acierta peor que el azar. Aquí solo se cuenta lo que habría pasado.
  - Cierre: el caso de Cali reproduce el informe de evaluación publicado, y la cuenta con todas hábiles lleva escrito ese supuesto.
  - Tamaño: 3 sesiones.
- **Tanda 7 · Régimen especial.**
  - Decide: si la aplicación puede decir algo del precio donde hoy «no consta».
  - Se construye: reconocer la fórmula del pliego contra las que ya tiene el motor (incluidas las dos del documento tipo V1). Si se reconoce, aplica la tanda 6 con esa fórmula; si no, se muestra el texto del pliego. La curva supuesta se apaga o se mide (decisión 2).
  - Mueve: el precio sugerido en régimen especial.
  - Tamaño: 2 sesiones.

### 7.5 Entrega 5 · Quién queda hábil y con cuántos puntos

- **Tanda 8 · La captura de evaluaciones, andando y medida.**
  - Decide: nada todavía. Es el dato que falta para todo lo demás: sin él, ni la vara del 28-oct-2026 ni la capa 3 se pueden probar.
  - Se construye: primero el diagnóstico (cuántas evaluaciones completas hay y cuántas entran por noche). Después, por entidad, dos hechos: de cada 10 ofertas cuántas quedaron hábiles, y cuántos puntos fuera del precio sacó cada una.
  - Cierre: el contador sube todas las noches. La regla vigente ya tiene escritas sus paradas: con menos de 60 procesos al 30-nov-2026 la tubería se da por fallando, y a los 60 procesos o el 15-dic-2026 se revisa si la predicción va peor que el azar.
  - Tamaño: 2 sesiones y la lectura diaria que ya existe.
- **Tanda 9 · Su costo real contra su APU.**
  - Decide: cuánto margen de error tiene su mínimo.
  - Se construye: con el costo final de obras suyas ya terminadas, la diferencia entre lo que el APU calculó y lo que la obra costó. El mínimo en pantalla pasa a llevar ese margen.
  - Necesita: los costos finales de tres obras terminadas o más (decisión 6). Sin ellos no se puede hacer.
  - Tamaño: 2 sesiones.

### 7.6 Entrega 6 · El marcador y el motor que sugiere

- **Tanda 10 · El marcador mensual.** Los scripts de hoy (`tools/analisis/plan_precio/`) pasan a correr una vez al mes y dejan su resultado fechado. Es lo que dice si una vara se cumple o se dejó de cumplir. Tamaño: 1 sesión.
- **Tanda 11 · Procesos con ofertas amontonadas de las mismas empresas.** Se mide primero si existen y cuánto mueven el centro. Solo si pesan, se marca el proceso y su grupo no se usa como referencia. Tamaño: 2 sesiones.
- **Tanda 12 · La simulación (capa 3).** Se construye cuando haya hábiles capturados suficientes para probarla, y se enciende por modalidad solo donde pasen las varas 2 y 3. Con lo medido hoy no las pasa ninguna regla: construirla antes sería maquetar una cifra que no acierta. Tamaño: 4 sesiones.

## 8. La vara: cuándo se enciende un precio sugerido

Tres varas distintas para tres cosas distintas. Se escriben hoy, antes de tener el dato, para que el número no se acomode después.

**Vara 1 · Los datos exactos (capas 1 y 2).** Un dato leído del pliego se enseña cuando, en los pliegos reales de prueba, sale con su cita en todos o dice «no consta», y su cerradura falla contra el código anterior. Un hecho contado (invitados, centro de las ofertas) se enseña cuando su medición fuera de muestra corre en la suite y da lo publicado en este plan. Si una medición mensual deja de darlo, el hecho se retira.

**Vara 2 · El precio sugerido (capa 3).** Es un requisito más, no un atajo: en licitación y menor cuantía se suma a la vara 3, que sigue mandando. Por modalidad y por clase de competencia, la aplicación sugiere un precio solo si se cumplen las cuatro:

1. La regla se escoge con datos anteriores y se prueba en el año siguiente, con 200 procesos de prueba o más. Nada se escoge mirando el año de prueba.
2. Deja más plata esperada que un precio fijo escogido de la misma manera, y el intervalo del 95 % de esa ventaja no toca el cero.
3. La ventaja se mantiene con quién quedó hábil de verdad, leído de las evaluaciones capturadas. Sin capturas no se enciende.
4. Lo que anuncia se cumple: donde dice «N de cada 100», lo observado queda a menos de 5 puntos.

Estado de hoy (M):

| Dónde | ¿Pasa la vara 2? | Por qué |
|---|---|---|
| Mínima cuantía con historial de la entidad | No todavía | El modelo se escogió mirando 2026. Con la regla escogida en 2025 pierde contra el precio fijo (entre 0,96 y 1,63 puntos). Buscaba 7 de cada 10 y dio 75,1 %. Y no se comparó con la tabla que la aplicación usa hoy |
| Menor cuantía con tres o más ofertas | No | En plata solo gana con un costo propio del 85 % (+0,19, de 0,07 a 0,32) y no hay hábiles capturados |
| Licitación con tres o más ofertas | No | En plata pierde con un costo propio del 85 % (−0,16) y no hay hábiles capturados |
| Régimen especial | Sin medir con sus fórmulas reales | — |

La sugerencia que la aplicación ya da en mínima cuantía con su tabla medida es una decisión suya del 30-sep-2026 y este plan no la toca. La tanda 4 mide si esa tabla pasa la vara 2 y si la versión por entidad la mejora.

**Vara 3 · El porcentaje de ganar según el precio.** Es la regla del 28-oct-2026 y no se toca: 200 procesos de 2026 por modalidad con los hábiles capturados, hábiles predichos antes del cierre, 3 % mejor que «uno entre todos», veredicto el 31-ene-2027. En licitación y menor cuantía, la capa 3 no se enciende sin ella.

Fuente: `docs/MEMORIA.md § «El % de adjudicación según el precio no se enseña porque se midió que no predice: en licitación y menor cuantía se dice cuántas ofertas ganaron a ese precio (28-oct-2026)»`.

## 9. Lo que decide usted

Responda con el número y la letra. Lo que solo usted sabe no se supuso.

1. **Por dónde empezar.** (A) Las tandas 1 y 2: el número de invitados y la referencia con los últimos 12 meses; son lo ya medido y lo más barato. (B) La tanda 5: los datos exactos del pliego. (C) La tanda 8: la captura de hábiles, que es el dato del que depende todo lo que puede mejorar el precio en procesos peleados. Recomendado: C primero si el contador de la decisión 5 está en cero o no aparece, porque la regla vigente da la tubería por fallando el 30-nov-2026; si el contador sube, A.
2. **Régimen especial.** Hoy la aplicación sugiere ahí un precio con una curva supuesta. (A) Apagar esa sugerencia hasta que se mida con las fórmulas reales. (B) Dejarla con el supuesto dicho, como está. Recomendado: A, porque en precios el error caro es sugerir de más.
3. **Las adjudicaciones con NIT «No Definido».** (A) Medir en producción y, si la mediana de las entidades no se tuerce, recuperarlas. (B) Dejar la regla del 6-sep-2026. Recomendado: A.
4. **La lista de invitados.** Solo usted puede ver la pantalla de proveedor de SECOP II. Abra un proceso de menor cuantía en el que ya haya manifestado interés y cuya invitación ya esté publicada, y diga si ve los nombres de los demás invitados o solo el número. No se pudo verificar cómo se llama esa sección en la vista de proveedor: en la vista de la entidad se llama «Proveedores interesados». Lo medido dice que saber quiénes son vale poco: de 1 a 3 puntos más de primeros puestos en menor cuantía, con todas hábiles. Si usted ve los nombres, la ficha por rival deja de ser imposible y se puede medir con lo que se lea de sus evaluaciones.
5. **El contador de evaluaciones.** Abra `https://detekta-app.vercel.app`, entre a la pestaña «Precios» con un proceso de licitación o de menor cuantía ya calculado y busque la línea que empieza «Evaluaciones leídas para saber quién cumplió los requisitos:». Diga qué número trae. Si dice 0, «sin dato» o no aparece, dígalo igual: la tanda 8 empieza por ahí. Desde esta sesión producción pide ingreso (responde 302) y no se pudo leer.
6. **Sus costos reales.** ¿De cuántas obras terminadas tiene el costo final (lo que de verdad gastó)? Con tres o más se puede medir el error de su mínimo.
7. **La vara 2.** (A) Aceptarla como requisito adicional a la regla del 28-oct-2026, que no se toca. (B) Cambiar alguno de sus cuatro puntos. Recomendado: A. No deshace lo que usted escogió el 11-nov-2026 (dejar la regla del 28-oct como está): la hace más exigente.

## 10. Lo que no se hace, con el motivo

- **Prometer un precio exacto donde el método se sortea después del cierre.** Ni la aplicación ni nadie lo puede saber: el techo está medido en la sección 4.3. Se da la mejor zona y cuántas veces acierta.
- **Bajar la vara del 28-oct-2026.** El porcentaje de ganar según el precio y el precio sugerido siguen apagados en licitación y menor cuantía hasta que la regla escrita ese día se cumpla. Este plan le añade un requisito (la vara 2 de la sección 8), no un atajo.
- **Sugerir un precio por debajo de su mínimo.** El objetivo son contratos que dejen plata.
- **Coordinar precios con otro proponente o presentar más de una oferta al mismo proceso.** Es causal de rechazo y está sancionado (Anexo B). Todo el plan trata de una sola oferta independiente.
- **Copiar una fórmula sin fuente.** Una fórmula de puntaje entra al motor solo si se leyó en un documento tipo o en el pliego de ese proceso. La «media aritmética» simple sigue sin fórmula porque no está en ningún documento leído.
- **Adoptar código de terceros.** No se encontró ninguno que sirva (Anexo D) y el proyecto no tiene dependencias.
- **Tocar una cifra de precio sin su visto bueno.** Cada tanda que mueve un precio en pantalla lleva primero su plan corto: qué cambia, qué cifra se mueve y cómo se prueba.

## 11. Riesgos

| Riesgo | Señal | Qué se hace |
|---|---|---|
| Un precio sugerido creíble y equivocado | La cuenta de aciertos de la capa 4 cae por debajo del precio fijo | La capa 3 se apaga sola en esa modalidad y queda la capa 2. La vara se revisa cada mes |
| Su costo real es mayor que el de su APU | Obras que dejan menos de lo calculado | Tanda 9: medir el error con obras terminadas y enseñar el mínimo con ese margen |
| El número de invitados cambia después de publicado o deja de publicarse | La comparación de la tanda 1 da diferencias | Se guarda el número el día de la invitación; si no resiste, la señal se retira y queda el historial |
| La captura de quién quedó hábil no avanza | El contador de Precios sigue en cero o no llega a 60 procesos el 30-nov-2026 | Tanda 8 primero: diagnosticar la tubería antes de construir encima |
| Se confunde un grupo coordinado con competencia normal | Varias ofertas casi iguales de empresas que siempre llegan juntas | Tanda 11: marcar el proceso y no usar ese grupo como referencia |
| El pliego no sigue el documento tipo | La fórmula leída no coincide con ninguna conocida | No se simula: se muestra el texto del pliego con su cita |
| Cambia la norma | Versión nueva de un documento tipo o decreto | El Anexo B lleva fecha; se vuelve a verificar antes de cada tanda que dependa de él |
| Los datos abiertos cambian de un día a otro | Dos corridas con cifras distintas | Cada resultado lleva la fecha de consulta y la medición se repite cada mes |

## Anexo A · Cifras de la medición

Cifras que no caben en la sección 4 y que sirven para decidir dónde trabajar. Todas de los archivos `resultados_*_2026-11-14.json` de `tools/analisis/plan_precio/`.

**Mínima cuantía de obra por departamento** (adjudicadas con recepción desde 2022).

| Departamento | Procesos | Con una oferta | Con tres o más | Precio de adjudicación: uno de cada cuatro quedó por debajo de | La mitad quedó por debajo de (mediana) | Uno de cada cuatro quedó por encima de |
|---|---|---|---|---|---|---|
| Tolima | 194 | 13,9 % | 64,4 % | 78,72 % | 88,61 % | 99,52 % |
| Huila | 156 | 33,3 % | 53,2 % | 80,01 % | 89,79 % | 99,93 % |
| Cundinamarca | 336 | 37,8 % | 39,0 % | 90,81 % | 99,34 % | 100,00 % |
| Bogotá | 1.040 | 5,9 % | 86,3 % | 71,28 % | 80,97 % | 91,76 % |
| Todo el país | 6.423 | — | — | 81,00 % | 95,28 % | 100,00 % |

**Error al anticipar el centro del grupo, según cuántos llegaron** (2026, error mediano en puntos; referencia de hoy → centro de las ofertas de la entidad en 12 meses).

| Oferentes | Menor cuantía | Licitación |
|---|---|---|
| 3 a 4 | 1,86 → 1,85 | 2,44 → 1,45 |
| 5 a 9 | 3,06 → 1,07 | 3,19 → 0,74 |
| 10 o más | 0,99 → 0,96 | 3,56 → 0,53 |

**Lo que da un precio fijo según cuántos llegaron** (menor cuantía, 2026, con todas hábiles → quitando cada rival con 3 opciones entre 10).

| Oferentes | Procesos | Precio del 92 % | Precio del 94 % |
|---|---|---|---|
| 3 a 4 | 273 | 36,3 % → 49,8 % | 33,7 % → 45,9 % |
| 5 a 9 | 257 | 25,0 % → 30,7 % | 21,0 % → 26,1 % |
| 10 o más | 119 | 9,5 % → 11,3 % | 4,0 % → 6,4 % |

**El valor esperado de un precio en mínima cuantía** (puntos del presupuesto por proceso ofertado, 2026; el precio fijo se escogió con 2025).

| Su costo (% del presupuesto) | Precio fijo que más deja | Lo que deja | El modelo por entidad, con el mejor precio de cada grupo | El mismo modelo, con la regla escogida en 2025 | Sabiendo el precio ganador (solo después) |
|---|---|---|---|---|---|
| 75 | 97,0 % | 12,82 | 13,19 | 11,39 | 17,58 |
| 80 | 97,7 % | 10,12 | 10,33 | 8,49 | 13,30 |
| 85 | 98,0 % | 7,34 | 7,57 | 6,08 | 9,51 |
| 90 | 98,7 % | 4,83 | 4,88 | 3,88 | 6,02 |

**Tamaños de las poblaciones.**

| Medición | Para aprender | Para probar (2026) |
|---|---|---|
| Menor cuantía con tres o más ofertas | 3.910 procesos | 649 procesos, 6.525 ofertas |
| Licitación con tres o más ofertas | 3.039 procesos | 470 procesos, 11.299 ofertas |
| Régimen especial con tres o más ofertas | 289 procesos | 128 procesos, 654 ofertas |
| Mínima cuantía | 5.229 procesos | 1.194 procesos |
| Invitados en menor cuantía | 4.543 procesos | 2.031 procesos |
| TRM | 1.628 certificaciones desde 2020 | — |

## Anexo B · Normas verificadas el 14-nov-2026

Textos bajados ese día de la fuente y leídos en esta sesión. Tres direcciones base: los documentos tipo, en `https://www.colombiacompra.gov.co/documentos-tipo/descarga/` seguido del número; las leyes, en la base de la Secretaría del Senado (`http://www.secretariasenado.gov.co/senado/basedoc/`, con «Última actualización: 31 de octubre de 2026»); los decretos, en la relatoría de Colombia Compra Eficiente (`https://relatoria.colombiacompra.gov.co/normativa/`). La lista de versiones vigentes está en `https://www.colombiacompra.gov.co/normativa-y-relatoria/control-de-versiones-documentos-tipo`.

**Documentos tipo de obra vigentes.**

| Documento | Versión y resolución | Descarga | Precio | Fecha de la TRM que escoge el método (literal) |
|---|---|---|---|---|
| Transporte, licitación | V4, Resolución 465 de 2024, avisos desde el 3-feb-2025 | 29920 | 48,5 (48,75 si se limita a Mipyme) | «Si este pronunciamiento, se realiza hasta las 3:00 pm, la entidad tomará la TRM que rija para el día hábil siguiente»; después, la del segundo día hábil |
| Transporte, menor cuantía | V3, Resolución 463 de 2024 | 29950 | 49,5 (49,75) | «la que rija el segundo día hábil después de finalizado el periodo de traslado del informe de evaluación» |
| Infraestructura social, licitación | V2, Resolución 539 de 2025, desde el 16-feb-2026 | 29837 | Como transporte V4 | Como transporte V4 |
| Infraestructura social, menor cuantía | V1, Resolución 540 de 2025, desde el 16-feb-2026 | 29561 | Como transporte V3 | Como transporte V3 |
| Agua potable, licitación y llave en mano | V1, Resoluciones 248 y 249 de 2020, hasta el 28-feb-2027 | 30420 y 29523 | 59,5 | «de acuerdo con la TRM que rija al día hábil siguiente», abriendo los sobres económicos antes de las 3:00 p. m. |
| Agua, saneamiento y estructuras hidráulicas | V2, Resolución 546 de 2026, avisos desde el 1-mar-2027 | 30129 | 47,5 | Como transporte V4 |
| Mínima cuantía de transporte y social | V2 (Resolución 464 de 2024) y V1 (Resolución 541 de 2025) | 30021 y 29582 | Menor precio, sin métodos | No aplica |
| Interventoría y consultoría (transporte, social, agua) | Resoluciones 725 y 726 de 2024, 953 y 952 de 2025, 333 de 2022 | 29953, 29824, 29844, 29624, 29529 | Sin puntos por precio | Los cuatro métodos puntúan la experiencia, no el precio |

Todos los de obra con puntaje económico usan los mismos cuatro métodos (numeral 4.1.4): de 0,00 a 0,24, mediana con valor absoluto; de 0,25 a 0,49, media geométrica; de 0,50 a 0,74, media aritmética baja; de 0,75 a 0,99, menor valor. En ninguno se conoce el método al ofertar. Las resoluciones de 2022, 2024 y 2025 están escaneadas: su número se tomó de las páginas de documentos tipo vigentes de Colombia Compra Eficiente.

**Leyes y decretos.**

| Tema | Norma | Cita literal |
|---|---|---|
| Mínima cuantía: gana el menor precio | Ley 1150 de 2007, artículo 2, numeral 5 (texto del artículo 30 de la Ley 2069 de 2020) | «la propuesta con el menor precio» |
| Mínima cuantía: a quién se revisa | Decreto 1082 de 2015, artículo 2.2.1.2.1.5.2 (texto del Decreto 1860 de 2021) | «Si esta no cumple, la Entidad Estatal debe verificar el cumplimento de los requisitos de la invitación de la oferta con el segundo mejor precio» |
| Concurso de méritos: el precio no puntúa | Ley 1150 de 2007, artículo 5, numeral 4 | «En ningún caso se podrá incluir el precio, como factor de escogencia» |
| Concurso de méritos: revisión de la oferta económica | Decreto 1082 de 2015, artículo 2.2.1.2.1.3.2 | «verificar que está en el rango del valor estimado» |
| Subasta inversa: para qué es | Ley 1150 de 2007, artículo 2, numeral 2, literal a | «bienes y servicios de características técnicas uniformes» |
| Precio artificialmente bajo | Decreto 1082 de 2015, artículo 2.2.1.1.2.2.4 | «debe requerir al oferente para que explique las razones» |
| Guía de precio artificialmente bajo | Colombia Compra Eficiente, CCE-EICP-GI-27, versión 01, 16-dic-2024, numerales 2.1 y 2.2 | «ofertas sean menores en un 20%, o un mayor porcentaje, al costo total estimado»; «no se debe realizar una aplicación mecánica» |
| Desempate | Ley 2069 de 2020, artículo 35; Decreto 1082 de 2015, artículo 2.2.1.2.4.2.17 | «de forma sucesiva y excluyente» |
| Puntos de Mipyme y de empresas de mujeres | Decreto 1082 de 2015, artículos 2.2.1.2.4.2.15 y 2.2.1.2.4.2.18 (Decreto 1860 de 2021) | «cero punto veinticinco por ciento (0.25%)» |
| Industria nacional | Ley 816 de 2003, artículo 2 | «entre el diez (10) y el veinte por ciento (20%)» |
| Discapacidad | Decreto 1082 de 2015, artículo 2.2.1.2.4.2.7.4 (Decreto 287 de 2026) | «puntaje adicional máximo del dos por ciento (2%)». Los documentos tipo de transporte y social siguen con 1 punto |
| Régimen especial | Ley 1150 de 2007, artículo 13; Ley 2195 de 2022, artículo 56 | «los principios de la función administrativa y de la gestión fiscal» |
| Más de una propuesta | Documento tipo, numeral 1.15, literal B | «presente o haga parte en más de una propuesta» |
| Acuerdos entre oferentes | Código Penal, artículo 410A (artículo 27 de la Ley 1474 de 2011) | «se concertare con otro con el fin de alterar ilícitamente el procedimiento contractual» |

**Novedades de 2026.** Decreto 287 del 19-mar-2026 (discapacidad), Decreto 997 del 4-ago-2026 (criterios ambientales y sociales en el factor de calidad; no rige todavía donde hay documento tipo) y Resolución 546 del 14-sep-2026 (agua, versión 2). No hay versión nueva de transporte ni de infraestructura social.

**La TRM.** Banco de la República, Circular Reglamentaria Externa DOAM-146 del 4-nov-2020, Asunto 8 (`https://www.banrep.gov.co/sites/default/files/reglamentacion/archivos/CRE_DOAM_146_4nov2020.pdf`): «con las operaciones del día y será vigente para el día siguiente»; para sábados, domingos y festivos «aplicará la TRM vigente en el día hábil inmediatamente siguiente».

**Sin verificar.**

- Función Pública y SUIN-Juriscol no abrieron desde esta sesión (`curl: (60) SSL certificate problem: unable to get local issuer certificate`; por la herramienta de lectura web, `HTTP 503 Service Unavailable`). Por eso los decretos se leyeron en la relatoría de Colombia Compra Eficiente y las leyes en la Secretaría del Senado.
- La transcripción del Decreto 1082 de 2015 en esa relatoría está desactualizada en mínima cuantía y en discapacidad: esos dos artículos se leyeron en el texto de los decretos que los modificaron (1860 de 2021 y 287 de 2026).
- La sanción administrativa por colusión (Decreto 2153 de 1992, artículo 47, numeral 9): el decreto no se abrió; lo cita una resolución de la Superintendencia de Industria y Comercio.
- La fórmula «mediana menos desviación estándar» de la guía está en una imagen: la leyó un asistente de esta sesión, no un extractor de texto.
- Si existe una circular posterior a la DOAM-146 sobre el cálculo de la TRM.
- Los manuales de contratación de las entidades de régimen especial.

## Anexo C · Cómo repetir la medición

Todo lee datos.gov.co y nada más: no escribe en ningún servicio ni toca la aplicación. Las carpetas de datos no se versionan; los resultados sí (`resultados_*_AAAA-MM-DD.json`). El conjunto de procesos se reemplaza entero en cada carga de SECOP II, así que dos corridas en días distintos dan cifras parecidas, no idénticas. Conviene repetir cada mes (tanda 10).

Desde la raíz del repositorio, con `D` como carpeta de datos vacía para cada medición:

Los cuatro métodos en licitación, menor cuantía y régimen especial (sección 4.3):

```
bash tools/analisis/plan_precio/cuatro_metodos_descargar.sh "$D"
node tools/analisis/plan_precio/cuatro_metodos_base.js "$D"
node tools/analisis/plan_precio/cuatro_metodos_control_x20.js "$D" AAAA-MM-DD
node tools/analisis/plan_precio/cuatro_metodos_medir.js "$D" AAAA-MM-DD
node tools/analisis/plan_precio/cuatro_metodos_verificar.js "$D"
```

Mínima cuantía y TRM (secciones 4.4 y 4.5):

```
node tools/analisis/plan_precio/minima_descargar.js "$D"
node tools/analisis/plan_precio/minima_medir.js "$D"
node tools/analisis/plan_precio/trm_medir.js "$D"
```

Reparto de la competencia e invitados (secciones 4.1 y 4.2); la consulta que llena la carpeta está en la cabecera de `invitados_medir.js`:

```
node tools/analisis/plan_precio/regimenes_medir.js "$D" AAAA-MM-DD
node tools/analisis/plan_precio/invitados_medir.js "$D" AAAA-MM-DD
```

Trampas de los datos que estas mediciones ya esquivan:

- `wi7w-2nvm` solo trae ofertas registradas desde el 31-dic-2024. Las anteriores están en `b28v-edj8` y `bpan-xvj3`.
- El mismo proponente aparece a veces con y sin código, y una fila «Confidencial» con valor cero acompaña a veces a la oferta real.
- `lib/filtros_lista.js:modalidadDe` devuelve «abreviada» para la menor cuantía, no «menor_cuantia».
- El piso de 70 % del presupuesto sirve en licitación y menor cuantía, pero en mínima cuantía deja fuera adjudicaciones reales.
- El código de proveedor no sirve como identidad: con NIT de relleno aparece bajo consorcios distintos.

## Anexo D · Literatura y herramientas externas

Usted ofreció buscar repositorios públicos. Se buscó el 14-nov-2026 en la búsqueda pública de GitHub y en la web. Los textos y los repositorios se leyeron sin ejecutar su código. Este plan no añade ninguna dependencia: lo que se toma son ideas y fuentes de datos.

**No existe un simulador público de los métodos colombianos.** Siete búsquedas en GitHub (media geométrica, métodos de promedio, probabilidad de ganar en licitaciones de construcción, ofertas de SECOP y otras) no devolvieron ninguno. El motor de Detekta (`lib/metodos_ponderacion.js`) es la herramienta que hay.

**Lo que dice la economía de las subastas de promedio**, que es la familia a la que pertenecen la mediana, la media geométrica y la media aritmética baja:

| Fuente (abierta el 14-nov-2026) | Lo que sirve para este plan |
|---|---|
| Albano, Bianchi y Spagnolo (2006), «Bid Average Methods in Procurement», Rivista di Politica Economica 96(1). `https://mpra.ub.uni-muenchen.de/8997/1/MPRA_paper_8997.pdf` | Cuando gana la oferta más cercana a la media, el equilibrio es que todos ofertan parecido y la adjudicación se parece a un sorteo. Es la explicación teórica de lo que el proyecto midió el 28-oct-2026 |
| Conley y Decarolis (2016), «Detecting Bidders Groups in Collusive Auctions», AEJ: Microeconomics 8(2). `https://didattica.unibocconi.it/mypage/upload/211300_20171218_035123_CONLEYDECAROLIS_AEJMICRO.PDF` | Un grupo coordinado puede mover el promedio. Proponen pruebas para detectar empresas que se presentan juntas una y otra vez con precios amontonados. Sirve para reconocer un proceso donde el centro lo fija un grupo, no para imitarlo |
| Decarolis (2018), «Comparing Public Procurement Auctions», International Economic Review 59(2). `https://didattica.unibocconi.it/mypage/upload/211300_20181217_040521_MACCI20ANNUAL20CONFERENCE20201820MANNH.PDF` | La subasta de promedio equivale a una lotería a precio alto |
| Ballesteros-Pérez, Skitmore, Pellicer y Zhang (2016), «Scoring rules and competitive behavior in best-value construction auctions», JCEM 142(9). `https://riunet.upv.es/bitstream/10251/79879/3/COENG-3854-open.pdf` | La fórmula de puntaje cambia de forma medible qué tan agresivas y qué tan dispersas son las ofertas. Apoya medir cada fórmula por separado |
| Zambrano, Jaramillo, Pérez y Serrano (2018), «Fórmulas de selección económica de contratistas en adjudicación de obras de infraestructura vial: estudio de caso Valle del Cauca», Entre Ciencia e Ingeniería 12(24), páginas 60 a 67. `https://revistas.ucp.edu.co/index.php/entrecienciaeingenieria/article/download/121/127` | Estudio colombiano anterior a los documentos tipo: la fórmula dependía de los dos últimos dígitos de la TRM «vigente durante el día de cierre», y solo en 4 de los procesos revisados (7,02 %) se presentó más de un proponente |

Solo se leyó el resumen, no el texto completo: Chang, Chen y Salmon (2015), Management Science 61(6); Skitmore, Pettitt y McVinish (2007), JCEM 133(11). No se abrieron y no se usan: Decarolis (2014), Ioannou y Leu (1993), Friedman (1956), Gates (1967).

**Repositorios leídos**, con su veredicto:

| Repositorio | Licencia | Qué es | Veredicto |
|---|---|---|---|
| `Cespial/propuestas-secop` | MIT | Complemento de Claude Code con instrucciones para propuestas de SECOP. Sin datos ni simulación | No aporta nada que el proyecto no tenga. Describe una fórmula de media aritmética alta que no se verificó contra ningún pliego |
| `kevacevedo123/radar-licitaciones` | MIT | Solo un README | Vacío |
| `TecintekSAS/secop-radar` | MIT | Consulta procesos abiertos de SECOP II por palabra y departamento | No usa ofertas. No aporta |
| `PiotrZapolski/tender-integrity-engine` | MIT | Grafo de empresas que se presentan juntas y señales de alerta de la OCDE (datos de Polonia) | Se toma la idea: contar coparticipaciones repetidas por proceso (tanda 11) |
| `kirastk/cartel-detection-ml` y `mamofah21-ops/procurement-collusion-detection` | Sin licencia | Detección de carteles con datos rusos y con datos inventados | Solo la lista de señales. Sin licencia no se copia nada |
| `Kirankolla23/Bid_genie_app` | Sin licencia | Tesis sobre el margen óptimo con simulación | No sirve: modelos cerrados |
| `ANCP-CCE-Analitica/datos_abiertos` | MIT | Cuadernos de la propia Agencia para consultar datos.gov.co (2022) | Patrón de consulta que el proyecto ya usa |

Nada de lo anterior se recomienda para coordinar ofertas ni para presentar más de una al mismo proceso: está prohibido (Anexo B) y este plan trata de una sola oferta independiente.

## Anexo E · Auditoría de Detekta del 15-nov-2026

Usted pidió auditar el plan y toda la aplicación. La suite completa pasa, pero «pasa la suite» no es «no falta nada»: el proyecto lleva su propia lista de pendientes abiertos, y esa lista es el mapa honesto de lo que falta. Se clasificaron los 109 que había ese día (un asistente los leyó uno por uno y verificó contra el código los que se podían arreglar).

| Clase | Cuántos | Qué significa |
|---|---|---|
| Esperan una decisión o un dato suyo | 36 | Nada de código los resuelve |
| Necesitan producción o un servicio externo | 25 | Hay que leer la aplicación publicada, Vercel, Upstash o el correo |
| Piden medir o leer documentos | 19 | No son cambios de código |
| Defectos arreglables sin mover cifras | 15 | Se pueden cerrar en sesiones de trabajo |
| Arreglables, pero mueven una cifra o un orden | 11 | Llevan plan corto y su visto bueno |
| Comerciales o sin objeto desde que Detekta es de uso propio | 3 | Se pueden cerrar con esa razón |

**Lo que se arregló el 15-nov-2026**, cada cosa con su prueba y su prueba por mutación:

- En un proceso con más de 400 archivos, las adendas más nuevas quedaban fuera del índice sin aviso. Ahora el índice trae siempre lo más viejo y lo más nuevo; en los pocos procesos con más de 2.400 archivos puede faltar el medio, y se dice.
- Cuando la base de datos llega al límite de su plan, la aplicación lo dice en español y con qué hacer, en vez de un error en inglés.
- Una llamada de la pantalla o del lector de documentos que no recibe respuesta ya no espera para siempre: se corta a los 5 minutos y 20 segundos y lo dice.
- El error de «lo que envió pesa demasiado» ya no manda a volver a intentar.
- Una prueba de la suite fallaba todas las noches entre las 7 p. m. y la medianoche de Colombia (corregida el 14-nov-2026).

**Las cinco decisiones suyas que más frenan el objetivo de adjudicar más contratos**, según la lista de pendientes del proyecto:

1. Las siete de la sección 9 de este plan.
2. Las ocho de `docs/PLAN_X20.md § «9. Lo que decide usted»`, entre ellas ir donde llega una sola oferta.
3. Qué hacer con los archivos de Excel de presupuesto que hoy no pasan la puerta de lectura: esos procesos no llegan a Precios.
4. Si la base de experiencia por perfil solo propone contratos o también mueve el veredicto de «cumple».
5. Los certificados RUP nuevos de los tres socios: sin ellos no se puede ofertar en consorcio.

**Lo que la auditoría no pudo ver.** Producción: la aplicación publicada pide ingreso desde esta sesión, así que no se comprobó que el sitio en vivo responda, ni cuántas evaluaciones hay capturadas, ni el estado del correo. Y los 25 pendientes que dependen de producción siguen como estaban.
