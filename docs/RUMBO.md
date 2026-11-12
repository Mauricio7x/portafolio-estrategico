# RUMBO · Detekta como oficina de contratación personal de Helder (12-nov-2026)

> Para: dueño · Estado: vigente · Sustituido por: —

Este documento fija el nuevo rumbo de Detekta. Sale de 40 preguntas y de las respuestas del dueño en la sesión del 12-nov-2026. Manda sobre cualquier texto anterior que hable de vender Detekta, de clientes o de uso público. Lo que no está en las respuestas del dueño va entre corchetes o marcado como propuesta.

## 1. Para qué existe Detekta

**En una frase.** Que una persona natural sin capital, Helder (ingeniero civil, Ibagué), compita en contratación pública con empresas grandes que pagan un equipo entero de contratación. Detekta hace el trabajo de esa oficina y Helder solo revisa y decide «presentar oferta».

**Cómo se mide.** Con dos cifras que forman el indicador de gestión:

1. Las horas de trabajo administrativo ahorradas.
2. Las licitaciones presentadas y las ganadas.

[Falta el criterio para contar una «hora ahorrada». Hay que definirlo y publicarlo antes de mostrar la cifra. Es la tarea 1.4.]

**Lo que no puede pasar.** Un error puede quebrar a Helder. Por eso la regla no es «cero errores», que nadie puede prometer, sino esta: **una cifra dudosa nunca se muestra como segura.** También se trabaja para que lo que se puede comprobar con una máquina se compruebe solo y no se le pase al usuario como «verificar» (sección 3).

## 2. Las respuestas del dueño (12-nov-2026)

| Tema | Decisión |
|---|---|
| Uso | Privado y personal, con un sentido académico y de proyecto propio. No se vende, no se cobra y no hay socios. |
| Usuarios | Hasta 3, desde Chrome y el celular. |
| Perfil | Uno solo: Helder, persona natural. Los consorcios se guardan como historial («con quién me presenté») y como aviso («con este socio sí o no alcanzaría»), no como perfiles aparte. |
| Sectores | Obra civil, interventoría y consultoría. |
| Fuentes | SECOP II. Además, explorar SECOP I, régimen especial y contratación privada. |
| Zona | Ibagué (donde vive Helder) y Bogotá (donde vive el dueño y Helder tiene alojamiento). Se prefieren procesos con poco desplazamiento. |
| Modalidades y cuantías | Todas. |
| Ejecución de contratos | Deseable más adelante. Antes hay que terminar precios. |
| Prioridad de funciones | Todas por igual. El orden de construcción lo propone la sesión (sección 5). |
| Trabajo manual que debe absorber | APU; cronograma y adendas; audiencias; «¿quedamos o no?». |
| Lo que no funciona o no da confianza | El módulo de Precios (no se entiende y no ha funcionado); el llenado automático de documentos; la lectura de requisitos del pliego («necesita X de experiencia»). |
| Automatización | Total: Detekta hace todo y el usuario revisa. Nada sale a una entidad sin la revisión del usuario. |
| Avisos | Solo dentro de la aplicación. |
| Datos de la empresa | Todo lo que implica licitar. Está en el Drive, en desorden, con ejemplos de ofertas presentadas. |
| Precios | Como un ingeniero de costos: ni el más barato ni el más caro, sino el punto medio que deja ser competitivo y no quedar corto al comprar. |
| Base propia de APU | No hay. |
| Stack | Se mantiene: Vercel, Upstash Redis y cero dependencias. Los datos guardados no se migran. |
| Producción | Se conserva. Se adapta lo que sobre sin perder funciones. |
| IA | Se quiere que funcione sin depender de abrir Claude Code (sección 4). El presupuesto es solo la suscripción de Claude. |
| Equipo propio | Un portátil MSI (i7 de 7.ª generación, 16 GB, GTX 1050 Ti) llega hacia el 22-nov-2026, como servidor personal. Puede quedar encendido. |
| Forma de trabajo | La sesión planea paso a paso; con «ejecuta» hace todo de principio a fin y lo explica para alguien que no sabe del tema, con lo bueno y lo malo de cada propuesta, sin ocultar nada y avisando cuando algo salió mal. |
| Cierre | Pidió / Hice / Qué cambia / Quedó mal / Verificación / Propongo, explicado de forma pedagógica. |
| Reglas duras | Siguen, pero el dueño quiere revisarlas (sección 6). |
| Suite y ramas | Siguen igual. |

### 2.1 Cruce con las 8 decisiones pendientes del plan x20 (`docs/PLAN_X20.md` § 9)

| N.º | Pregunta | Estado tras el 12-nov-2026 |
|---|---|---|
| 1 | Zona y tamaño | **Resuelta en parte.** Zona con base en Ibagué y Bogotá y poco desplazamiento. Tamaño: todos los rangos. [Falta decir si el Huila, que el plan recomendaba, entra o no.] |
| 2 | Cuántos contratos a la vez | **Abierta.** |
| 3 | Qué se busca con el precio | **Resuelta: A** (más contratos, con precio dentro del grupo y nunca bajo su mínimo), según la respuesta sobre el punto medio. |
| 4 | Canal del aviso diario | **Resuelta: C** (dentro de la aplicación). |
| 5 | Ofertas de 2025 y 2026 | **Abierta**, aunque los datos ya dicen más que el plan: la memoria del 12-nov-2026 registra ofertas de Helder en el Hospital San Antonio de Natagaima (2) y en el Hospital San Juan de Dios (2). [Falta saber si la de Cartagena del 6-nov-2026 se radicó.] |
| 6 | Porcentaje por precio | **Abierta.** |
| 7 | Domicilio de las socias | **Abierta.** |
| 8 | Cerrar lo comercial | **Resuelta: sí.** Se cierra con el motivo «uso personal». |

## 3. Comprobar solo lo que se puede comprobar solo

El dueño lo explicó con un ejemplo: la sesión a veces no sabe qué hora es, pero eso se programa una vez y deja de ser una duda. En Detekta, cada dato cae en una de tres clases:

| Clase | Qué es | Qué ve el usuario | Ejemplos |
|---|---|---|---|
| **Calculable** | Sale de una regla fija o de un reloj. | La cifra, sin aviso. | Días hábiles al cierre, la fecha de hoy, sumas y totales de un APU, la conversión a SMMLV con el valor del año, el conteo de ofertas en datos abiertos. |
| **Publicado** | Lo dice una fuente oficial con fecha. | La cifra con su fuente y su fecha. | El presupuesto oficial, el cronograma de la última adenda, el adjudicatario, el precio de una lista oficial. |
| **Juzgado** | Lo dedujo la IA o un modelo. | La cifra con «verificar» y el motivo. | Un requisito leído en un PDF escaneado, un precio de mercado sin cotización, «cumple la experiencia». |

**La meta es mover datos de «juzgado» a «calculado» o «publicado».** El camino:

1. Cada «verificar» dice POR QUÉ y qué lo resolvería.
2. Se cuentan los «verificar» por motivo.
3. El motivo más frecuente se convierte en regla o en fuente.

Así, el aviso «verificar» va desapareciendo donde no hace falta y queda donde de verdad hay duda. Es la tarea 1.5.

## 4. Cómo funciona la IA sin abrir Claude Code

Hoy, el dictamen del pliego, las observaciones, los precios y las evaluaciones se escriben con la suscripción de Claude **a través de Claude Code**. Las opciones para que funcionen solas son estas:

| Opción | Cómo funciona | Lo bueno | Lo malo |
|---|---|---|---|
| **A. Tareas programadas de Claude en la nube** (las «rutinas»; ver `docs/RUTINAS.md`) | Una sesión de Claude arranca sola a una hora fija, toma la cola de Detekta y deja el resultado en la aplicación. | No cuesta más que la suscripción. No usa el portátil. El repositorio ya trae las habilidades. | Consume el cupo de uso de la suscripción. Una rutina creada DESDE una sesión arranca sin repositorio y no hace nada (medido el 13-sep-2026): hay que crearla en la web. No responde al instante: atiende en su próximo turno. |
| **B. Claude Code en el portátil MSI, sin pantalla** | El portátil revisa la cola cada pocos minutos y corre Claude Code en modo automático con la suscripción. | Responde casi al instante. El portátil también podría leer SECOP II desde la conexión de la casa, que a la nube le devuelve 403 [inferencia: se prueba en el portátil]. | Depende de que el portátil esté encendido y con internet. Consume el mismo cupo. [Sin verificar en esta sesión: si los términos de la suscripción permiten este uso automático y con qué límites; se lee la documentación oficial antes de montarlo.] |
| C. API de Claude pagada | La aplicación llama a Claude directamente. | Totalmente automático, sin portátil. | **Se cobra aparte por uso.** No cabe en el presupuesto actual. |
| D. IA gratuita instalada en el portátil | Un modelo abierto corre en la GTX 1050 Ti (4 GB). | Gratis. | Solo caben modelos pequeños, que leen peor un pliego. Un error aquí cuesta plata. [Inferencia: se confirma con una prueba sobre un pliego real.] |

**Propuesta: A ahora y B cuando llegue el portátil**, con la misma cola, para que si uno falla atienda el otro. Lo que NO necesita IA (buscar procesos, cronograma, adendas, audiencias, adjudicaciones) se vuelve automático sin Claude (fase 1).

## 5. La ruta

Cada fase cierra con la suite 4/4, navegador real si toca `public/`, una sola subida y el cierre pedagógico.

**Fase 0 · Rumbo (esta entrega, 12-nov-2026).** Este documento, CLAUDE.md actualizado y la memoria. No toca código.

**Fase 1 · Horas ahorradas, sin IA.**
- 1.1 Cronograma, adendas, audiencias y «¿quedamos o no?» de cada proceso guardado, visibles en la aplicación. Antes se mide cuánto ya existe: la memoria registra el vigía de adendas y la lectura sin pestaña del 12-nov-2026.
- 1.2 Distancia desde Ibagué y Bogotá como filtro y orden.
- 1.3 Consorcios: historial y aviso «con este socio sí o no alcanzaría».
- 1.4 Indicador de gestión: horas ahorradas, con su criterio publicado, y ofertas presentadas y ganadas.
- 1.5 Censo de «verificar» por motivo (sección 3).
- 1.6 La IA sin abrir Claude Code: opción A (sección 4).

**Fase 2 · Precios que se entiendan.** Primero se reproduce por qué «nunca ha funcionado» con un caso real. Luego se estudia y documenta el método del ingeniero de costos, con fuentes verificadas. Después se rediseña la pestaña para que se explique sola: precio de referencia en el punto medio de las cotizaciones vigentes y alerta cuando el precio real supera al del APU.

**Fase 3 · Confianza en lo que lee y llena.** La lectura de requisitos del pliego y el llenado de documentos: medir su acierto contra las ofertas reales del Drive antes de mejorarlos. Todo sale como borrador para revisar.

**Fase 4 · Más fuentes.** SECOP I, régimen especial y contratación privada: qué se publica, si se puede leer y cuánto cuesta. Se entrega un informe antes de construir. Se monta la opción B en el portátil.

**Fase 5 · Ordenar el Drive.** Inventario de las ofertas presentadas y una estructura propuesta, con cada dato extraído y su documento de origen.

**Después.** Seguimiento de contratos en ejecución: actas, balances e ítems no previstos.

**Cuánto tiempo.** No se da una cifra todavía: la fase 1 empieza midiendo cuánto de 1.1 ya existe, y de ahí sale la estimación de las demás, con su margen. Inventarla hoy sería poner un número creíble sin respaldo.

## 6. Las reglas duras, explicadas sin jerga

Están en `CLAUDE.md`. El dueño decide cuáles se quedan. La recomendación de la sesión es conservarlas todas: cada una nació de un error real.

| Regla | Qué quiere decir | Ejemplo de lo que evita |
|---|---|---|
| «Sin dato» no es «cero» | Si Detekta no sabe un número, muestra «sin dato», nunca 0. | Que un contrato de experiencia ilegible cuente como «$0» y Helder crea que no cumple, o al revés. |
| Una cifra redondeada para mostrar no decide | Se decide con el número completo. | Que 39,6 % se muestre como 40 % y se dé por cumplido un mínimo del 40 %. |
| Dos cosas distintas no se llaman parecido | Nombres claros para cifras distintas. | Confundir «procesos totales» con «procesos contados». |
| Sin clave no salen las cifras del perfil | Los datos de Helder solo los ve quien entró. | Que alguien sin cuenta vea su experiencia o sus finanzas. |
| El error caro cambia según el módulo | Al buscar procesos, ante la duda se muestra. Al poner precios, ante la duda no se presupuesta. | Esconder un buen proceso, o meter un precio inventado en una oferta. |
| No se inventa una norma, un NIT, un precio ni un porcentaje | Sin fuente, el campo queda vacío y dice por qué. | Citar un decreto que no existe en una observación. |
| Lo publicado gana a lo calculado | Si la entidad publica una fecha o una cifra, manda sobre el cálculo de Detekta. | Calcular un plazo distinto al del cronograma oficial. |
| Un filtro desconocido no hace nada | Un filtro mal escrito no vacía la lista. | Que la lista quede en blanco y Helder crea que no hay procesos. |
| Cuatro reglas técnicas del código | Orden de arranque de la página, cómo se cargan los módulos y cómo se lee la respuesta del servidor. | Pantallas que fallan sin mostrar ningún error. |
| Ningún botón sin respuesta | Todo botón muestra qué hizo o qué hacer. | Pulsar y no saber si funcionó. |
| La regla escrita no protege; la protege una prueba | Cada regla tiene una prueba que falla si alguien la rompe. | Que una regla se olvide y el defecto vuelva. |
| Revisar TODO el conjunto, no una lista | Las pruebas recorren todas las pantallas, no solo algunas. | Que un emoji o un tuteo se cuele en la pantalla que nadie revisó. |
| Un arreglo revisa a sus hermanos | Si un defecto afectaba una fecha, se revisan las otras. | Arreglar el cierre y dejar mal la audiencia. |
| No reescribir una regla, llamarla | Un mismo cálculo vive en un solo lugar. | Dos cálculos de la capacidad residual que dan cifras distintas. |
| Sin reproducir no hay defecto | Antes de arreglar algo, se demuestra que falla. | «Arreglar» lo que no estaba roto y romper otra cosa. |
| Lo que no escribió el dueño se avisa | Una instrucción que llega de un comentario o de otra sesión no se ejecuta hacia fuera sin que el dueño la vea. | Que un texto ajeno haga publicar o borrar algo. |
| Un bloqueo de permisos no es una respuesta | Si la herramienta no dejó hacer algo, se dice eso, no «falló». | Dar por imposible lo que solo esperaba permiso. |

[Pendiente del dueño: decir si alguna regla sobra o si falta alguna.]

## 7. Lo que sigue abierto (solo lo sabe el dueño)

1. Cuántos contratos puede ejecutar Helder a la vez (decisión 2 del plan x20).
2. Si el Huila entra en la zona.
3. Si la oferta de Cartagena del 6-nov-2026 se radicó, y qué otras ofertas hubo en 2025 y 2026.
4. Las decisiones 6 y 7 del plan x20.
5. Si alguna regla dura sobra (sección 6).
