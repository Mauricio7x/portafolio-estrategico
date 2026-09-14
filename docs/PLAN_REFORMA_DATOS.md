# PLAN · Reforma de los datos que Detekta enseña (13-sep-2026)

> Para: dueño · Estado: pendiente del dueño · Sustituido por: —

Este documento es el plan completo, por sesiones, para reformar lo que la tarjeta de Licitaciones, el perfil del competidor, el modal de la entidad y Mis procesos enseñan. Nace de seis informes de verificación (A1-A6), tres diseños (experimentado, sin experiencia, dueño), una síntesis y un veredicto de verificación por dato, todos ejecutados contra el árbol `main` en `3482415` el 13 y el 14 de septiembre de 2026 (Anexo C). Nada de lo que afirma sobre el código sale de memoria: cada afirmación lleva su ancla `ruta:línea` en un `.js` o el título de sección del documento que la sostiene. Lo que no se pudo ejecutar va rotulado NO VERIFICABLE con su motivo.

## 0. Cómo se usa este documento

**Una sesión = una tanda.** Cada tanda de la sección 5 cabe en una sesión de trabajo y entrega datos completos, con sus pruebas y su memoria. Si al abrirla se ve que no cabe, se parte en dos y se anota aquí; no se alarga la sesión.

**Qué se pega al abrir una sesión.** El prompt corto de `docs/PROMPT_INICIAL.md § «Apéndice A · El prompt corto para pegar»`, tal cual, sustituyendo su última línea por:

```
Encargo: ejecutar la tanda N de docs/PLAN_REFORMA_DATOS.md
```

(con el número de la tanda). Ese prompt ya trae `ultracode` (orquestación con subagentes por defecto, `docs/PROMPT_INICIAL.md § «9. Orquestación ultracode · SIEMPRE, no solo en los encargos grandes»`), el arranque con `node tests/mapa.js`, la prohibición de leer documentos enteros y la entrega por pull request. Para que el prompt resuelva, este documento se guarda en el árbol como `docs/PLAN_REFORMA_DATOS.md` (con esta ficha en la línea 3) y entra en `docs/INDICE.md` con `node tests/mapa.js --escribir`.

**Qué se mide al cerrar cada tanda (criterio único, comprobable por un tercero):**

1. `node tests/e2e.js > salida.txt 2>&1; echo CODIGO=$?; tail -3 salida.txt` termina en **4/4** y `CODIGO=0`, sin tuberías. Los atajos `E2E_SOLO=…` que cada tanda nombra sirven mientras se trabaja y cierran con «CORRIDA PARCIAL»: no cuentan como verificación.
2. Si la tanda tocó `public/`: navegador real a **390 px** de ancho, consola limpia, `scrollWidth` no mayor que `clientWidth`, y lo que la tanda dice medir (un chip que no desborda, un esqueleto que aparece antes del `fetch`, la variante con «Reducir movimiento»).
3. Memoria escrita: una sección nueva **al final** de `docs/MEMORIA.md`, con fecha, que empieza por «En una línea: …», más la marca `> SUPERADA el dd-mmm-2026 por «título» — nota` bajo cada sección que la tanda desmiente; después `node tests/mapa.js --escribir`, y los tres generados (`docs/MAPA.md`, `docs/MEMORIA_INDICE.md`, `docs/INDICE.md`) van en el mismo commit.
4. Pull request contra `main` abierto por la sesión, con la URL completa en su cierre. El dueño lo fusiona en `https://github.com/Mauricio7x/portafolio-estrategico/pulls` pulsando **«Merge pull request»** y después **«Confirm merge»**. Un encargo no está entregado hasta que `main` lo contiene (`docs/PROMPT_INICIAL.md § «10. Reglas de respuesta (obligatorias)»`, apartado Rama).

**Qué hace este documento cuando una tanda se cierra.** Al pie de la tanda, en su línea «Cierre», se anota la fecha, el hash del commit en `main` y el número del pull request. La ficha del dato no se reescribe: si la ejecución desmintió algo de la ficha, se dice en la memoria (sección nueva, con motivo) y en la línea «Cierre» de la tanda se remite a esa sección. Cuando todas las tandas estén cerradas, el documento pasa a `docs/archivo/` con la primera línea `> Archivado el …` (regla de retiro de `docs/PROMPT_INICIAL.md § «11. Mantenimiento de este documento»`).

**Convenciones de las fichas (sección 4).** Certeza: `publicado` (SECOP II lo dice) · `medido` (contado en el histórico o en el uso) · `calculado` (aritmética declarada sobre publicados o medidos) · `estimado` (extracción de texto, supuesto con nombre o deducción) · `sin fuente` (la fuente no está confirmada). Cuándo se calcula: `sync` (al ingerir o al reconstruir un índice) · `petición` (al servir la lista) · `clic` (al pulsar) · `externo` (fuente viva fuera de Redis) · `ninguno` (ya viaja; solo se pinta). Cada ficha lleva el veredicto de verificación: `confirmado`, `con condiciones` (las condiciones son obligatorias en la tanda que lo ejecuta) o `refutado` (no entra en las fichas: sección 6). Las cifras de ejemplo son las del proceso de la captura del dueño (PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA, presupuesto $6.365.863.685, perfil `helder`), reproducidas con las funciones reales; lo que depende del contenido de los índices de producción (líder, días de adjudicación, desiertos, referencia) va rotulado EJEMPLO. «Hoy» en las cifras de días es el 13-sep-2026.

**Lo que este plan no vuelve permanente.** Ningún conteo del sistema (cuántas `op`, cuántas líneas tiene la suite, cuántas secciones tiene la memoria) se escribe aquí como hecho: se mide con `node tests/estado.js` al abrir cada sesión.

## 1. Lo que pidió el dueño y lo que el árbol desmintió

### 1.1 El encargo, literal (13-sep-2026)

«Debemos reformar la información que mostramos. Primero que todo, TODA licitación que se muestre debe decir en un apartado si conviene más con GÉNESIS o con la empresa que es LTDA (PRODIAC LTDA) en consorcio con HELDER. Helder es el central, somos nosotros. Tenemos que mirar todo lo que podamos hacer para poder adjudicar la mayor cantidad de procesos. Vamos a reformar todos los datos que mostramos: pregúntate qué dato puedo dar con este dato, ¿el dato que estoy dando con los datos que tengo es el mejor? Investiga qué necesita normalmente un ingeniero civil, tanto alguien experimentado como alguien sin experiencia. Todos los datos deben ser ciertos, siempre. Vi que quitaste el poder saber cuánto habían adjudicado en total de todos los contratos que se han ganado las personas, y en qué otras entidades ha ganado y cuánto; eso no me gustó: hay que agregarlo pero optimizado para que el tiempo de espera no sea tanto, casi automático o lo más corto posible, y ponerle una animación para que el usuario no se aburra. Piensa qué otros datos podemos dar, y todo dímelo con la estructura CORTO · CONCISO · EN QUÉ BENEFICIA · EN QUÉ AFECTA. Busca las necesidades más grandes que tengan las personas que licitan, lo que más se les dificulta; vamos a solucionar todo eso. La primera respuesta es un plan para ejecutarlo en varias sesiones.»

### 1.2 Las premisas, verificadas contra el árbol

Las cuatro primeras filas son palabras del dueño (extracto exacto de 1.1); las cuatro siguientes, premisas que traían los informes y que también se comprobaron.

| Premisa | Veredicto | Evidencia |
|---|---|---|
| «Vi que quitaste el poder saber cuánto habían adjudicado en total de todos los contratos que se han ganado las personas, y en qué otras entidades ha ganado y cuánto» | **No se quitó y no se degradó: se escondió.** La función entera sigue en servidor y pantalla; desde el 6-sep-2026 (commit `df82f0d`) la tabla «Quién gana aquí» va plegada bajo el rótulo «Ver los 5 adjudicatarios que más ganan», y la fila que abre el perfil no tiene ningún texto que diga que se puede pulsar (solo un `title`, que en teléfono no existe). Resultado: tres pulsaciones desde la tarjeta, la tercera a ciegas; y solo los 5 primeros de cada entidad tienen camino. | `api/inteligencia.js:17-24` (`op=competidor`), `lib/competencia_detalle.js:547-696` (`detalleAdjudicatario` devuelve `total_ganados`, `valor_adjudicado_cop`, `procesos_con_valor`, `entidades[]`), `public/app.js:3344-3380` (`pintarAdjudicatario`), `:2967` (rótulo del pliegue), `:2930` (fila solo con `title`), `tests/e2e.js:13033` (la suite fija el pliegue). Informe A2 § 0 y § 7 (cronología por `git log -S`). |
| «optimizado para que el tiempo de espera no sea tanto, casi automático o lo más corto posible, y ponerle una animación para que el usuario no se aburra» | **Hoy cada clic en frío recorre TODO el histórico.** Medido con las funciones reales sobre un corpus sintético: 8 comandos y 2,00 MB leídos con el corpus compactado; 95 comandos y 2,68 MB con el corpus fragmentado como lo deja el delta; con 40 ms por comando, 0,76 s frente a 4,16 s. La caché es por competidor y por hora, así que cada competidor distinto vuelve a barrer. | `lib/competencia_detalle.js:567-571` (SCAN + `leerChunksDedup` de todas las claves), `:134` y `:558` (caché `v7` por clave), `:60` (TTL 3600 s). Informe A2 § 3.1. Latencia real en producción: NO VERIFICABLE desde aquí; el dueño la lee en `duracionMs` y `comandosRedis` (`lib/handlers/inteligencia/detalle.js:177-179`) pegando en Chrome `https://portafolio-estrategico.vercel.app/api/inteligencia?op=competidor&adjudicatario=nit:<NIT>&token=<su token>`. |
| «TODA licitación que se muestre debe decir en un apartado si conviene más con GÉNESIS o con la empresa que es LTDA (PRODIAC LTDA) en consorcio con HELDER» | **Hoy la fila calla el nombre y la tarjeta calla en «solo».** El veredicto entero se calcula por fila servida y se recorta a `{tipo, cierra_todo}`; la tarjeta pinta una sola línea y solo cuando `tipo === "con_socio"`. Y la frase «Solo. Esta le alcanza sin socio» se afirma sobre puertas que no se pudieron verificar: con el anticipo sin publicar, el proceso de la captura sale «solo»; con el anticipo declarado en 0, sale «con PRODIAC 80/20». | `lib/handlers/procesos/listar.js:935-938` y `:109-113` (`resumenSocio`), `public/app.js:2009-2015` (`bloqueSocio`), `lib/socio_por_proceso.js:96-102` (`carenciasDe` solo cuenta `pasa === false`), `lib/puertas.js:238-254` (`p3SinDato` devuelve `pasa: true`). Ejecutado: `rep_d01.js` (Anexo C). |
| «Todos los datos deben ser ciertos, siempre» | **Ocho lecturas de hoy no lo son.** El chip de anticipo dice «no declarado» cuando el pliego dijo «sin anticipo» (H1); la segunda celda pinta «1 de 6» sobre un supuesto de 5 rivales sin decirlo (H2); el mismo promedio sale con dos redondeos (H3); «Calcular mi precio» nunca pasa el plazo (H4); sin cuantía la fila ordena como si valiera cero (H5); sin fecha de cierre la tarjeta calla (H6); «$56 M es lo que suele pagar esta entidad» rotula como hecho un derivado (H7); sin credencial se pierden cuatro cosas sin decir por qué (H8). | Informe A1 § 5, cada hallazgo con reproducción ejecutada; las anclas van en las fichas D-11, D-14, D-13, D-28, D-18, D-16, D-15 y D-29. |
| «El índice de competencia se construye en el sync nocturno» (premisa de los informes) | **Falso.** Lo construye la cadena del histórico, a mano (`?reconstruir_indice=true`) o cuando la última extracción completa tiene más de 30 días; el cron diario solo reconstruye el índice de baja. Por eso todo dato que salga de ese índice tiene frescura de hasta un mes y lo declara. | `lib/handlers/procesos/historico.js:469-478`, `lib/handlers/procesos/sync.js:95-105`, `vercel.json` (cron `30 8 * * *` → `/api/sync`). |
| «`enriquecer` corre al servir la lista» (premisa de los informes) | **Falso.** Corre en la ingesta; `op=listar` solo importa `tipoPrecio` y `presupuestoOficialDe`. Por eso los datos que dependen de una columna nueva exigen una extracción completa. | `lib/proyeccion.js:138-160`, `lib/handlers/procesos/listar.js:125`. Informe A1 § 7. |
| «Hay una cerradura de bytes por fila» | **No la hay.** Los «1.220 B por fila» son una medición de la memoria, no una aserción; lo que sí hay es el corte de la plataforma en 4,5 MiB y una dirección: lo que la lista no pinta no viaja, y toda ampliación se mide con `por_pagina=100`. | `lib/cuerpo.js:39`; `grep` en `tests/e2e.js` sin coincidencias de «1220» (informe A6 § 1.9). |
| «La sesión puede consultar datos.gov.co» | **Hoy no.** `CONNECT … 403` para p6dx, jbjy, hgi6 y 9sue desde las sesiones (observación con fecha del 13-sep-2026; el 12-ago-2026 respondía 200). Todo dato de fuente viva va tras una sonda que corra donde haya red. | Informe A4 § 0. |

### 1.3 Lo que se decide reabrir: la tarjeta vuelve a decir CON QUIÉN

El 11-sep-2026 el consejo de socio se sacó de la tarjeta por cuatro motivos, escritos en `docs/MEMORIA.md § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)»`: (1) la lista contesta «¿a qué me puedo presentar?» y el expediente «¿con cuál voy?»; (2) el veredicto entero pesaba mucho por fila; (3) un consejo recalculado en cada lectura cambia sin que el dueño sepa sobre qué decidió, y por eso se congela al guardar; (4) pintar el reparto dos veces dejó una línea repetida.

Cómo se vuelve sin repetir el daño (ficha D-01): una sola línea de no más de 90 caracteres, redactada por el servidor en el mismo módulo que redacta la frase del expediente (una redacción); un solo campo con el socio (`socio.con`, nunca `alcanzable_con_socio`, que hoy discrepa: D-08); el congelado al guardar no se toca (la tarjeta dice el consejo de hoy, el expediente el del día que decidió, con su fecha); el porqué, los avisos y los indicadores siguen en el expediente. Peso medido de la línea: 96 B en «solo» y hasta 184 B con las dos ramas del anticipo, frente a 34-43 B hoy. Esta reapertura desmiente en su parte de tarjeta la sección del 11-sep, y por eso exige la firma del dueño (sección 7, pregunta 1) antes de abrir la tanda 1.

## 2. Lo que hoy se enseña y de dónde sale

Resumen del censo de la tarjeta (informe A1 § 1; la tabla completa, con los 34 datos y sus anclas, en el Anexo A). «Cuándo» es cuándo se calcula; «certeza» sigue las convenciones de la sección 0.

| Dato de hoy | Fuente | Certeza | Cuándo |
|---|---|---|---|
| Título, entidad, departamento, estado, enlace a SECOP II | proyección de p6dx (`lib/proyeccion.js:38-61`) | publicado | sync |
| Cuantía y rótulo «cuantía alta/media/baja» | `enriquecer` (`lib/negocio.js:207-212`) | publicado (cifra) · calculado (rótulo) | sync |
| Chip «No viable — K · Caja» y línea de requisitos | `evaluarPuertas` (`lib/puertas.js`) | calculado sobre el perfil | petición |
| «Solo no le alcanza; con un socio, sí…» | `socioPorProceso` → `resumenSocio` (`listar.js:109-113`) | calculado | petición (solo la página) |
| Celda 1 «~N empresas suelen competir» | `competenciaDe` sobre `indice:competencia` | medido (mínimo 5 procesos) | petición (lectura); el índice, en la cadena del histórico |
| Celda 2 «1 de N se gana» | `estimarPDetalle` (`lib/probabilidad.js`) | estimado; supuesto de 5 rivales sin histórico | petición |
| Celda 3 (lo que deja · precio de mercado · calcular · —) | `gananciaDeProceso` (`lib/ganancia.js`) | calculado (con costo medido por el usuario cuando lo hay) | petición, con credencial |
| Chip de cierre y avisos de cierre | `fecha_cierre` (`lib/negocio.js:181-195`) | publicado (fecha) · calculado (días) | sync · al pintar |
| Chip y aviso «Avisar que le interesa» | `manifestacionDeFila` (`lib/manifestacion.js:298-327`) | calculado; publicado si el cronograma se leyó | petición |
| Banda de competencia y aviso de la señal #11 | `competenciaDe` | medido | petición |
| Chip de zona | `evaluarZona` (`lib/accesibilidad.js`) | estimado (km por departamento) | petición |
| Chips de prórroga y cuadro de adendas | versiones del corpus (`lib/almacen.js:365-386`, `lib/adendas.js`) | medido entre versiones | petición |
| Plegado: puertas con mensaje, anticipo, «Suelen bajar», ubicación, encaje del RUP, ingreso estimado, modalidad, tipo de precio, cómo se adjudica en el departamento | `lib/puertas.js`, `enriquecer`, `bajaDeMercado`, `evaluarRup`, `bajaDepartamentoDe` | calculado · estimado · medido · publicado | sync · petición |
| Pie: estado, «Guardar», «Calcular mi precio», «Ver en SECOP II ↗» | proyección; `botonGuardar`; `qApu` | publicado · — | sync · al pulsar |

Lo que viaja en la fila y no se ve (informe A1 § 2) es la materia prima de la mitad de los datos nuevos de este plan: `referencia_del_proceso`, `duracion` y `unidad_de_duracion`, `fecha_de_publicacion_del`, `anticipo_declarado`, `_cierre_inicial`, `baja_p25` y `baja_p75`, `granularidad_utilizada`, `p2_k.crp` y `crpc`, `p3_caja.financiacion_requerida` y `patrimonio`, `p_ganar_detalle.fuente`, `competencia_entidad.por_anio`, `ganancia.motivo`, `finanzas_visibles`.

## 3. Lo que necesita el que licita

Fuente de las necesidades: informe A5 (13-sep-2026), que las sacó de `docs/GUIA_ANALISTA_LICITACIONES.md`, de `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`, de lo que el ingeniero pidió en sus palabras (`docs/MEMORIA.md § «Encargo del ingeniero · 24-ago-2026»`) y de 19 consultas web del 13-sep-2026 cuyas páginas NO se pudieron leer (solo el resumen del buscador; Anexo C). El orden es por lo que más cuesta hoy a mano según el manual; no hay encuesta con fuente.

### 3.1 El ingeniero experimentado

| # | Necesidad (qué decide) | Fuente | Datos de este plan que la atienden |
|---|---|---|---|
| E1 | Descartar en minutos a qué no presentarse (ir / no ir) | Guía § «Capítulo 6. Leer un pliego como profesional»; § «Capítulo 18. Las siete palancas legales que sí inclinan la balanza» | D-09, D-10, D-12, D-18, D-33, D-55; las cuatro puertas ya existen (`lib/puertas.js`) |
| E2 | A qué precio ofertar sabiendo que el método se sortea (banda de baja de la entidad) | Guía § «Capítulo 9. Cómo se arma el puntaje (aquí se gana)» | D-15, D-17, D-52, D-73, D-75, D-78; el optimizador de Precios ya existe (`lib/apu/optimizador.js`) |
| E3 | Los costos que no están en el APU (5 %, estampillas, póliza, financiar al Estado) | Guía § «Capítulo 11. El precio: cómo costear de verdad» | D-44, D-49, D-59, D-64, D-35, D-45 |
| E4 | Si hay anticipo, si es anticipo o pago anticipado | Complemento § «V-08 · CORRECCIÓN: anticipo — el manual se queda corto y en un punto induce a error» | D-11, D-09, D-01 |
| E5 | Quién gana en esa entidad, con qué baja, y si el pliego está hecho para alguien (señal #11) | Guía § «Capítulo 18…» y § «Capítulo 19. El mapa del terreno turbio» | D-02, D-03, D-05, D-06, D-07, D-20, D-39, D-51, D-53, D-61, D-62, D-63, D-71 |
| E6 | Cuánta gente se presenta y si el cierre se prorrogó | `docs/MEMORIA.md § «Puertas, probabilidad y valor esperado (ago 2026)»` | D-13, D-14, D-21, D-68 |
| E7 | Cuándo y cómo paga la entidad; prórrogas y suspensiones | `docs/MEMORIA.md § «Cómo ejecuta sus contratos: jbjy-vk9h en vivo (ago 2026)»` | D-39 (cuánto tarda en adjudicar), D-32; los días de pago: ver 3.3 |
| E8 | Adendas y cambios de reglas a 24 h del cierre | Guía § «Los 9 errores que descalifican en SECOP II» | D-22, D-54, D-21 |
| E9 | Con quién consorciarse, en qué porcentaje, y verificar al socio | Guía § «Capítulo 10. Consorcios y uniones temporales» | D-01, D-08, D-57, D-58, D-40 |
| E10 | Qué va a salir antes de que salga (PAA) | Guía § «Capítulo 21. El área de licitaciones que funciona» | D-76 (existe); D-42 refutado (sección 6) |
| E11 | Qué versión de documento tipo rige | Complemento § «V-01 · Documentos tipo versión 2: obligatorios desde el 16 de febrero de 2026» | D-56 (estimado, «probablemente») |
| E12 | Precio global o precios unitarios | Complemento § «V-03 · Precios unitarios vs. precio global, y por qué «mayor cantidad» ≠ «adición»» | D-24 |
| E13 | Subsanar bien y revisar la forma de los demás en el traslado | Guía § «Capítulo 13. Subsanación: el capítulo que salva contratos» | D-63 (parcial); el generador de la tabla de trazabilidad: ver 3.3 |
| E14 | Biblioteca documental con vencimientos | Guía, truco de los documentos vencidos (cap. 4) | Ninguno nuevo: son datos del usuario, no del corpus (3.3); la alerta del RUP ya existe (`public/app.js:10217`) |
| E15 | Desempate, industria nacional y limitación a empresas pequeñas | Complemento § «V-12 · Umbrales y cifras de 2026» | D-40, D-58, D-23, D-30 (declara lo que no se mide) |
| E16 | Postmortem del área: presentadas, ganadas, con quién | Guía § «Capítulo 21…» | D-47, D-48, D-61; el precio de cada competidor: ver 3.3 |
| E17 | Manifestación de interés que dura horas | `docs/MEMORIA.md § «Encargo del ingeniero · 24-ago-2026»` | D-69 (existe), D-23 |

### 3.2 Quien empieza

| # | Pregunta que se hace | Fuente | Datos de este plan que la atienden |
|---|---|---|---|
| P1 | ¿Puedo presentarme a esto? | Guía § «Capítulo 8. Requisitos habilitantes vs. factores de puntaje»; resumen del buscador W1 (Anexo C) | D-09, D-10, D-12, D-18, D-29, D-30, D-40, D-55 |
| P2 | ¿Qué códigos me faltan en el RUP y cuándo vence? | Guía § «Capítulo 5. El RUP» (por título de capítulo; el truco de los códigos adyacentes) | D-74 (con la condición de nombrar el código que falta) |
| P3 | ¿Cuánto puedo facturar de verdad? | `docs/PERFILES.md § «Fórmula K (única para toda la app — `lib/capacidad.js`)»` | D-12, D-34, D-35, D-41, D-60 |
| P4 | ¿Qué me piden exactamente? | Guía § «Capítulo 6…» | D-31, D-33, D-49, D-58, D-64 |
| P5 | ¿Cuánto bajo el precio? | `docs/MEMORIA.md § «FILOSOFÍA DEL PRODUCTO (ago 2026) · la regla que manda sobre las demás»` | D-15, D-17, D-52, D-75 |
| P6 | ¿Cuánto me cuesta y me queda algo? | Guía § «Capítulo 11…» | D-15, D-28, D-29, D-44, D-45 |
| P7 | ¿Cuándo hago cada cosa? | Guía § «Capítulo 4. SECOP II — la plataforma, sin romanticismo» («el cierre a las 3:00 p. m.») | D-16, D-36, D-43, D-64, D-69, D-72 |
| P8 | ¿Qué documentos armo y en qué carpeta? | Guía § «Los 9 errores que descalifican en SECOP II» | D-31, D-33 |
| P9 | ¿Qué pasa si SECOP II se cae cuando voy a presentar? | resumen del buscador W9 (Anexo C) | Ninguno: es un protocolo (texto de la guía), no un dato (3.3) |
| P10 | ¿Qué puedo corregir después y qué no? | Guía § «Capítulo 13…» | D-64 (la póliza no se corrige después); el vocabulario ya existe (`public/glosario.js`) |
| P11 | ¿Con quién me junto si no me alcanza? | Guía § «Capítulo 10…» | D-01, D-10, D-40 |
| P12 | ¿La obra queda lejos o es zona peligrosa? | `docs/MEMORIA.md § «Accesibilidad de la zona · el costo de LLEGAR ordena (ago 2026)»` | D-25, D-70 |
| P13 | ¿Qué significan estas palabras? | Guía, «diccionario del pliego» (cap. 6) | D-46, D-23, y el glosario vigente |
| P14 | ¿Cuánto tiempo necesito y cuánto me da esta entidad? | resumen del buscador W3 y W19 (estimados, sin página; no se pintan como cifra) | D-36, D-37, D-50 |
| P15 | ¿Qué personal y equipos me van a pedir? | `lib/dictamen_reglas.js:42-45` («la aplicación no registra su equipo de trabajo») | Ninguno: la aplicación no registra el equipo del usuario (3.3) |
| P16 | ¿Está hecho para otro? | Guía § «Palanca 3 — Detección de pliegos direccionados (impacto: alto)» | D-02, D-13, D-37, D-38, D-50, D-51, D-61, D-71 |

### 3.3 Lo que NO se puede atender con datos abiertos, y por qué

- **Los días reales de pago por entidad** (E7): `jbjy-vk9h` no publica fechas de pago y `valor_pagado` es sin dato para media Colombia (`lib/ejecucion.js:18-22`). El dato vive en `uymx-8p3j`, que solo consta en un diccionario y no está confirmado contra la fuente: D-66 queda `sin fuente` hasta la sonda (tanda 18).
- **El precio de cada competidor que perdió** (E16): p6dx trae solo el valor del ganador y `hgi6-6wh3` los proponentes sin precio (`lib/proponentes.js:4-12`). `wi7w-2nvm` lo tendría, pero su llave no está confirmada: D-65 `sin fuente` (tanda 18).
- **La causal de rechazo de cada oferta** («cuántas cayeron por el documento X»): no hay columna de estado ni de causal en ningún dataset hallado (informe A4 § 5). No se propone nada.
- **Las observaciones al pliego, los informes de evaluación y el RUP como dato abierto**: no aparecen en datos.gov.co (el RUP vive en el RUES, informe A4 § 5). Solo se leen del expediente del proceso (documentos), que la aplicación ya baja.
- **Si la convocatoria quedó limitada a empresas pequeñas y los factores de puntaje**: el corpus no lo publica (`grep` sin coincidencias en `lib/columnas_historicas.js` y `lib/negocio.js`, informe A3 § b). Solo el pliego lo dice: D-58 cuando hay pliego; D-40 nunca afirma «limitada».
- **El sitio de la obra de un proceso abierto**: p6dx trae la sede de la entidad; `gra4-pcp2` (dónde se ejecuta) solo existe para contratos firmados (informe A4 § 5). D-25 declara «sede».
- **El generador de la tabla de trazabilidad para subsanar** (E13) y **los vencimientos de los documentos del usuario** (E14): no son datos del corpus; son trabajo del usuario o una función nueva fuera de este plan.
- **El equipo del usuario** (P15) y **el protocolo de indisponibilidad de SECOP II** (P9): texto de la guía, no un dato de la fila.
- **Los tiempos de armar una oferta** («5 a 8 días de oficina», «semanas»): resúmenes del buscador sin página leída; se usan como orden de magnitud y no se pintan como cifra.

## 4. Los datos, uno por uno

Setenta y siete fichas: los 79 datos de la síntesis menos los dos refutados (D-27 y D-42, en la sección 6). Cada ficha lleva el veredicto del verificador y, cuando es «con condiciones», las condiciones son obligatorias en la tanda que la ejecuta. «Tanda» es la sesión de la sección 5; el verificador agrupó los datos en seis bloques (1 = lo literal del dueño, 2 = lo que cambia, 3 = nuevo con lo que ya viaja, 4 = índices y extracción, 5 = fuentes externas, 6 = sin fuente) y este plan reparte esos bloques en tandas que caben en una sesión.

### 4.1 «Con quién conviene» en cada tarjeta

#### D-01 · Con quién conviene

- **Corto**: una línea del servidor, gris/verde/ámbar/rojo: «Solo: le alcanza sin socio.» · «Solo si el pliego trae anticipo; sin anticipo, con PRODIAC (80/20).» · «Conviene con Génesis: tiene la actividad que a usted le falta · reparto sugerido 60/40» · «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» · «Conviene con PRODIAC, pero no cabe si la convocatoria es solo para empresas pequeñas.» · «Con Génesis se acerca, pero puede no bastar: falta respaldo para financiar la obra.» · «Ninguna de las dos alcanza lo que falta.» · descartada por objeto: no se pinta. La cifra «anticipo del X % o más» entra en la línea solo cuando `lib/puertas` publique el umbral combinado (tanda 4); hasta entonces la línea va sin cifra.
- **Conciso**: `socioPorProceso` ya corre por fila servida (`lib/handlers/procesos/listar.js:935-938`); `resumenSocio` (`:109-113`) pasa de `{tipo, cierra_todo}` a `{tipo, con, cierra_todo, aviso, linea}`; `linea` (no más de 90 caracteres) la redacta el servidor en el mismo módulo que redacta `frase`, para que tarjeta y expediente salgan de una sola redacción; `con` sale SOLO de `recomendacion.socio`; `nombreCorto` («Génesis», «PRODIAC») se crea en `lib/perfiles.js` (hoy 0 apariciones). Estado nuevo `segun_anticipo`: cuando `p2_k.depende_del_anticipo` (`lib/puertas.js:183-205`) o `p3_caja.sin_dato_de === "anticipo"` (`:222`, `:238-254`), se evalúa además la contrafáctica `anticipo_pct: 0, anticipo_declarado: true` por la cadena que ya existe (`evaluarPuertas` → `socioPorProceso`) y la línea trae las dos ramas; la rama se decide por esa comparación ejecutada, nunca por la cifra redondeada. Reproducido con Purificación (`rep_d01.js`, Anexo C): con el anticipo sin publicar, `p2 depende_del_anticipo=true`, `p3 sin_dato_de=anticipo` y socio «solo»; con anticipo 0 declarado, P2 y P3 fallan y el socio es PRODIAC 80/20 con `cierra_todo=true`; con 30 % declarado, vuelve a «solo». Descartadas: una carencia condicional dentro de `carenciasDe` (`lib/socio_por_proceso.js:96-102`) y los textos de más de 90 caracteres. El congelado al guardar (`lib/handlers/perfil/seguimiento.js:168-181`) no se toca.
- **En qué beneficia**: la pregunta que el dueño puso primera, en cada tarjeta, con nombre, reparto y la condición real (el anticipo) que hoy se esconde bajo «Solo. Le alcanza».
- **En qué afecta**: 96-184 B por fila frente a 34-43 B hoy (medido). Segunda evaluación solo en las filas con anticipo sin publicar: medido 0,299 ms por fila hoy y 0,559 ms por fila afectada en un sintético de 2000 filas; la fracción real de filas con anticipo sin publicar NO está medida (en el sintético fue el 100 %) y puede ser casi todas: costo acotado en unos 110 ms por página de 200. Caen y se reescriben `tests/e2e.js:4705-4708` y `:4724-4726`. La sección del 11-sep recibe «> SUPERADA» en su parte de tarjeta. Lo que el recomendador no considera (puntaje, limitación real a empresas pequeñas, experiencia por contratos) sigue declarado en el expediente, no en la línea.
- **Fuente y certeza**: `lib/socio_por_proceso.js` → campo `socio` de la fila; el umbral de anticipo, de `lib/puertas.js` (P2 existente + P3 nuevo, tanda 4) · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) El porcentaje solo puede salir de `lib/puertas` con el umbral combinado (el de P2 que ya calcula `anticipoQueCabe`, `lib/puertas.js:188`, más un umbral nuevo de P3; se publica el mayor de los dos), o la línea omite la cifra; nunca imprimir el umbral de P2 cuando la puerta que falla con anticipo 0 es P3 (medido con un presupuesto de seis mil millones: P3 falla desde 0 % y pasaría desde cerca del 8 %, mientras P2 dice 26 %). (2) La rama se decide por la contrafáctica ejecutada, no por la cifra. (3) La superación de `docs/MEMORIA.md § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)»` la firma el dueño con petición literal (sección 7); sin ella el dato no entra. (4) Texto literal «empresas pequeñas», nunca «Mipyme» (el servidor ya lo usa: `lib/socio_por_proceso.js:118`). (5) `nombreCorto` con cerradura; sin él los nombres son los completos. (6) Medir en el corpus real qué fracción de filas tiene anticipo sin publicar (NO VERIFICABLE aquí). (7) Reescribir las dos aserciones con mutación ejecutada; conservar «cumple» nunca y `cierra_todo` en la fila.
- **Tanda**: 1 (la línea sin cifra) y 4 (la cifra, con el umbral combinado).

#### D-08 · Campo `alcanzable_con_socio` de la fila

- **Corto**: (no se pinta).
- **Conciso**: `lib/handlers/procesos/listar.js:920` publica el PRIMER socio que alcanza en el orden de `CANDIDATOS_CONSORCIO` (`socioQueAlcanza`, `lib/socio_por_proceso.js:282-296`; `lib/perfiles.js:357`), con nombre completo, mientras `socio.recomendacion.socio` es el mejor tras el orden (`:379-383`). Reproducido (`rep_d08.js`): en la misma fila de $8.000 M, `alcanzable_con_socio` publica Génesis (74 B) y la recomendación es PRODIAC. Se deja de publicar la clave (o se publica `null` con motivo); el rescate de filas (`listar.js:663`; `lib/filtros.js:693-696`, `alcanzaConSocio`) se conserva porque solo mira si HAY socio.
- **En qué beneficia**: un solo «con quién» en la fila (regla dura: dos cosas distintas no pueden tener nombres parecidos).
- **En qué afecta**: −68 a −97 B por fila con credencial (23 B de clave + 45-74 B de valor, medidos); ningún consumidor: `grep -rn alcanzable_con_socio public/ tests/ api/` → 0.
- **Fuente y certeza**: `lib/socio_por_proceso.socioQueAlcanza` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado. Requisitos: conservar `alcanzaConSocio` en `listar.js:663` y `lib/filtros.js:693-696` (solo el predicado); retirar la clave de la fila y añadir la cerradura de que no vuelve; anotar en la memoria bajo la sección del 11-sep que el campo se retira (el `grep` en `tests/` no encontró aserción que caiga: confirmarlo en la sesión antes de asumirla).
- **Tanda**: 1.

### 4.2 «Dónde más gana este competidor», instantáneo y con espera animada

#### D-02 · Quién más gana aquí

- **Corto**: «Quién más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›» (botón; sin base no hay botón). EJEMPLO.
- **Conciso**: en el barrido de `construirIndice` se acumula por entidad el adjudicatario con más procesos ganados (`esAdjudicado`, `lib/indice_competencia.js:186` → `claveAdjudicatario`, `lib/equivalencias.js:72-88`) y el registro publica `lider: {nombre, clave, ganados, base}` solo con la MISMA regla de base que ya usa el detalle para la concentración (`lib/competencia_detalle.js:440-447`: `conGanador >= MIN_PROCESOS`), extraída a una función compartida, no copiada. Hoy el hash no lleva líder (`grep -n "ganadores\|lider" lib/indice_competencia.js` → solo el comentario `:1168`). `competenciaDe` (`:1213-1231`) lo pasa a la fila SOLO con credencial válida; `lib/publico.sinFinanzas` hoy no toca `competencia` y debe anular `lider` sin credencial (cerradura de mutación); credencial presente e inválida = 401, como manda la regla. En la tarjeta, el botón `.lider-competencia[data-adjudicatario][data-nombre][data-entidad]` llama a `cargarAdjudicatario(clave, nombre)` (`public/app.js:3382`), que ya existe, y se resuelve en el delegado de `#lista` ANTES de `closest('.banda-competencia')` (orden fijado por `tests/e2e.js:20786-20793`).
- **En qué beneficia**: la señal #11 del manual con nombre y frecuencia natural en la tarjeta; el perfil a UN clic en vez de tres (informe A2 § 1.3).
- **En qué afecta**: +86 B por fila con credencial (medido). Supera en su letra el comentario-contrato de `lib/indice_competencia.js:1167-1168` («nunca adjudicatarios, NIT ni valores» en `/api/oportunidades`): se conserva su espíritu (sin credencial nada; con credencial el nombre y la cuota, sin NIT ni valores en la fila), se escribe en la memoria como decisión nueva y se actualiza ese comentario en el mismo commit. Frescura: la del índice de competencia (hasta un mes o la última reconstrucción). Cerradura de mutación en `lib/publico` para `lider` sin credencial.
- **Fuente y certeza**: `indice:competencia` (`registroPublicado`) con `lider` derivado de `claveAdjudicatario`/`esAdjudicado` · medido.
- **Cuándo se calcula**: sync (lectura por petición; el perfil, al clic).
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) `lider` viaja SOLO con credencial: anular en `lib/publico.sinFinanzas` con mutación ejecutada. (2) Usar la regla del detalle (`competencia_detalle.js:440-447`) extraída a función compartida. (3) Escribir en la memoria la decisión nueva y actualizar el comentario `:1167-1168` en el mismo commit. (4) El botón se resuelve antes de `closest('.banda-competencia')`. (5) «Quién más gana aquí» con tilde (interrogativo indirecto).
- **Tanda**: 2 (servidor: líder en el hash y en la fila) y 3 (pantalla: el botón).

#### D-03 · Dónde gana este competidor, casi al instante

- **Corto**: «15 contratos en 6 entidades · $28.400 M en 14 de 15 contratos con valor publicado · último: 12 de ago de 2026» y la tabla Entidad · Ganados · Valor adjudicado · Último contrato. EJEMPLO.
- **Conciso**: la misma `op=competidor` (`api/inteligencia.js:17-24` → `lib/handlers/inteligencia/detalle.js` → `detalleAdjudicatario`, `lib/competencia_detalle.js:547`) sirve primero el hash inverso `indice:adjudicatario` (campo `nit:…`/`n:…`), construido en el MISMO barrido de `construirIndice` con el bucle `competencia_detalle.js:577-607` (`esAdjudicado` → `claveAdjudicatario` → valor `n > 0` → fecha) extraído a una función que barrido e índice comparten; `GET meta` + `HGET` → `origen: "indice"` y `construido`; sin registro cae al barrido de hoy con `origen: "barrido"`. Construcción dentro del presupuesto reanudable (`presupuestoMs`, `lib/indice_competencia.js:908`) con clave de progreso propia y el swap atómico de `lib/almacen.js:133` (`indiceNuevo`), respetando `CAMPOS_POR_HSET = 200` (`:87`). La caché `adj:` sube de `v7` (`competencia_detalle.js:134`) a `v8` y queda solo para el barrido; el sello por `meta.construido` (`:558`) sigue valiendo. Identidad y `esAdjudicado` no cambian. El total sigue siendo cota inferior y `null` sin valores (`:664-669`).
- **En qué beneficia**: lo que el dueño pidió con sus palabras: cuánto han adjudicado en total, en qué entidades y cuánto, «casi automático».
- **En qué afecta**: frescura hasta un mes salvo reconstrucción, declarada en pantalla (D-04); más bytes en Redis; la latencia real en producción es NO VERIFICABLE aquí. Las cifras del prototipo del informe A2 (cuadre 155/155 · 143/143 · 147/147; hoy 8-95 comandos y 2-2,7 MB por clic en frío; con el hash 2-3 comandos; construcción 54-66 HSET, 6-9 MB, +0,3-0,7 s de CPU) son medidas de un corpus sintético y NO se verificaron en este entorno (no hay Redis ni corpus): se repiten con `duracionMs`/`comandosRedis` en producción antes de darlas por hechas.
- **Fuente y certeza**: `indice:adjudicatario` (nuevo) construido en `construirIndice` sobre el corpus histórico; sin registro, el barrido de `competencia_detalle.js:547` · calculado (las cifras de costo son del prototipo).
- **Cuándo se calcula**: clic (lectura) + sync (construcción mensual del hash).
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Construir el hash dentro del presupuesto reanudable y del swap atómico, con `CAMPOS_POR_HSET = 200`. (2) La respuesta declara `origen` (`indice`|`barrido`) y la fecha de construcción; la caché `adj:` con sello sigue valiendo. (3) Rotular las cifras del prototipo como no verificadas aquí y repetirlas en producción. (4) Extraer `:577-607` a una función compartida y probar por mutación que barrido e índice cuadran sobre el fixture de la suite.
- **Tanda**: 2.

#### D-04 · La espera del perfil, con forma, y de dónde salió el dato

- **Corto**: mientras carga: «Buscando dónde más gana esta empresa…» sobre un esqueleto con la forma del resultado (dos líneas de cabecera y cinco filas de tabla); si cae al barrido: «Esta empresa no está en el resumen guardado: se revisan todos los contratos. Puede tardar unos segundos.»; al pie: «Resumen armado el 31 de agosto de 2026 · Actualizar ahora» (índice) o «Al día de hoy (revisión completa)» (barrido).
- **Conciso**: `abrirModal` (`public/app.js:2529-2538`) ya pinta `cargando(msg)` antes del `fetch` (la respuesta visible existe; cambia su forma): el esqueleto usa la clase `.exp-esqueleto` que ya existe (`public/index.html:1288-1290`; su regla bajo «Reducir movimiento» en `:1380`), con `aria-busy="true"` en `#modal-cuerpo`; sin `@keyframes` nuevo, sin tocar `--dur-5`. El modal está FUERA de `#app` (`#app` cierra en `index.html:4506` y `#modal-cuerpo` está en `:4521`), así que el brillo de `#app .animate-pulse` (`:791`) no lo alcanza: por eso `.exp-esqueleto`. Bajo «Reducir movimiento» gris plano: se añade `background: var(--bg-inset-2)` junto al `animation: none` de `:1380`; el esqueleto desaparece de golpe al llegar el dato. «Actualizar ahora» manda `refrescar=1`, que ya salta la caché también en la vista `adjudicatario` (`lib/handlers/inteligencia/detalle.js:166,175`). La fecha del pie es `meta.construido` (`lib/indice_competencia.js:1080`): es la fecha en que se ARMÓ el resumen, no la cobertura de los datos, y así se redacta. Descartadas: «Leyendo el índice…», «…ha ganado…», «Con datos hasta …» (afirmaría cobertura).
- **En qué beneficia**: ninguna pulsación sin respuesta visible, diciendo qué se arma; el usuario sabe si ve el resumen guardado (con fecha) o el corpus vivo.
- **En qué afecta**: un `<style>` mínimo; V4-19 cambiará el mecanismo de los modales (`docs/INVESTIGACION_DISENO_WEB.md § «9. Plan de la piel v4 · qué se implementa, en qué orden (12-sep-2026)»`); la cerradura `tests/e2e.js:27977-27990` comprueba efectos bajo «Reducir movimiento», no nombres; lo visual es NO VERIFICABLE sin navegador (obligatorio por tocar `public/`).
- **Fuente y certeza**: interfaz; la fecha, `meta.construido` del índice (fecha de construcción, no de cobertura) · medido.
- **Cuándo se calcula**: clic.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Redactar la fecha como lo que es («Resumen armado el …») o derivar la cobertura real de `meta.meses`; nunca «Con datos hasta» a partir de `construido`. (2) Textos sin jerga: «resumen guardado», «se revisan todos los contratos», «revisión completa» (nunca «índice» ni «histórico» en pantalla). (3) Añadir el fondo plano en el bloque de «Reducir movimiento» y verificar en navegador real.
- **Tanda**: 3.

#### D-05 · La cabecera del perfil dice qué sostiene cada cifra

- **Corto**: «CONSTRUCTORA DEL TOLIMA SAS · NIT 900123456» · «$28.400 M en 14 de 15 contratos con valor publicado» · cuando no hay NIT: «En estos contratos SECOP no trae el NIT: se identifica por el nombre tal como lo escribe la entidad; si en otros sí lo trae, esos cuentan aparte» · línea fija: «Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde enero de 2024. Fuera de eso, no aparece aquí.» EJEMPLO.
- **Conciso**: `procesos_con_valor` viaja y no se pinta (`lib/competencia_detalle.js:664-674`; `public/app.js:3366-3368`); `identificacion null` no produce línea (`:3349-3353`); los límites solo van en `que_es` al pie (`:3379`). Suben a la cabecera. «Desde enero de 2024» sale de `DESDE_HISTORICO = '2024-01'` (`lib/handlers/procesos/sync.js:105`). Cuando `identificacion.tipo` es `codigo_secop` o `documento`, se conserva el rótulo que ya existe (`app.js:3350`), no «NIT».
- **En qué beneficia**: un total no parece completo (es cota inferior) y un perfil por nombre no se toma por el de un NIT.
- **En qué afecta**: tres líneas más; ninguna cifra nueva.
- **Fuente y certeza**: respuesta de `detalleAdjudicatario` · medido.
- **Cuándo se calcula**: clic.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) La línea del NIT, solo con `identificacion` nula, con el texto literal de arriba: `claveAdjudicatario` decide por contrato (`lib/equivalencias.js:72-88`) y la misma empresa puede tener otro perfil `nit:`. (2) Con `codigo_secop` o `documento`, el rótulo existente.
- **Tanda**: 3.

#### D-06 · En esta entidad: N de sus M contratos

- **Corto**: «En esta entidad: 6 de sus 15 contratos», con la fila de la entidad de origen primero y resaltada. EJEMPLO.
- **Conciso**: el servidor agrupa `entidades[]` por `claveCanonica` (la misma que agrupa `detalleEntidad`, `lib/competencia_detalle.js:79-80`, `:172`, `:290`, `:490`) y publica por fila `{clave, entidad: nombre más frecuente, …}` (hoy agrupa con `lic.entidad` crudo, `:583`, y parte una entidad en dos grafías: reproducido `claveCanonica('ALCALDIA MUNICIPAL DE PURIFICACION') === claveCanonica('Alcaldía Municipal de Purificación')`, mientras «MUNICIPIO DE PURIFICACION» da otra clave, correcto). El cliente compara CLAVES, no nombres: el navegador no tiene `claveCanonica` (`grep claveCanonica public/*.js` → 0). La entidad de origen sale de `cuerpo.entidad_normalizada` del modal de entidad (`:490`) cuando el perfil se abre desde allí, y de `?entidad=` canonizada en el servidor (`op=competidor&entidad=`) cuando se abre desde la tarjeta (D-02). «Otras grafías se agrupan» se declara en `que_es`.
- **En qué beneficia**: «¿es de aquí o de todas partes?» sin buscar en la tabla.
- **En qué afecta**: dos grafías se agrupan al mostrar; se publica el nombre más frecuente.
- **Fuente y certeza**: `detalleAdjudicatario.entidades[]` agrupado por `claveCanonica` en el servidor · medido.
- **Cuándo se calcula**: clic.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) La comparación con `claveCanonica` se hace en el servidor; el cliente compara claves. (2) El origen viene de `entidad_normalizada` del modal o de `?entidad=` canonizada. (3) Declarar el agrupado en `que_es`.
- **Tanda**: 2 (servidor: clave por fila y `?entidad=`) y 3 (pantalla).

#### D-07 · Las filas de «Quién gana aquí» dicen que se pueden pulsar

- **Corto**: rótulo del pliegue «Ver los 5 que más ganan y dónde más ganan» · en cada fila «Ver dónde más gana ›» · los segmentos de la barra apilada también abren el perfil · «Otros» explica que es la cola.
- **Conciso**: `public/app.js:2930` (fila con `cursor-pointer` y `title="Ver en qué otras entidades gana"`, sin texto: en teléfono no existe) y `:2967` (rótulo «Ver los N adjudicatarios que más ganan»); la delegación en `:3411-3417`. No se revierte el pliegue del 6-sep.
- **En qué beneficia**: la segunda puerta al perfil deja de ser a ciegas (informe A2 § 1.3).
- **En qué afecta**: la aserción literal `tests/e2e.js:13033` y el conteo de `data-adjudicatario` (`:13035`) se reescriben a propósito.
- **Fuente y certeza**: `detalleEntidad.adjudicatarios` · medido.
- **Cuándo se calcula**: clic.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: confirmado. Requisitos: al reescribir `:13033` añadir la aserción «sin tooltip» (la de `tests/e2e.js:8663-8680`, que hoy no cubre `bloqueAdjudicatarios`); navegador real (los segmentos pulsables no deben romper `Pulso.apilada`).
- **Tanda**: 3.

#### D-78 · Baja con la que suele ganar (perfil del competidor)

- **Corto**: «Baja con la que suele ganar: 3 % por debajo del presupuesto oficial (14 procesos ganados con presupuesto y valor adjudicado)» · «sin dato (motivo)». EJEMPLO.
- **Conciso**: `bajaMedia` (`lib/competencia_detalle.js:636-661`) publica `mediana_pct` y `promedio_pct` aparte, con motivo real sin NIT (`:648-653`) y mínimo 5 (`lib/indice_baja.js:116`); la op es `lib/handlers/inteligencia/detalle.js:175`. Hoy se acumula `{n, suma, hist}` por clic escaneando los chunks (`:567-588`) con caché `v7`; con D-03 el registro del hash guarda esos crudos y aplica `encogerBaja` al servir (`subRegistro`), no una mediana ya calculada. Reproducido: `subRegistro({n:0,…}, 5)` → `baja_mediana null`, nivel `sin_dato`; NIT «No Definido» → descarte `adjudicatario_no_definido`.
- **En qué beneficia**: con qué descuento gana el rival (E2/E5).
- **En qué afecta**: solo el rótulo cambia: la cifra es una MEDIANA y hoy se rotula «Baja media» (`public/app.js:3328-3341`).
- **Fuente y certeza**: `detalleAdjudicatario.baja_media` · medido.
- **Cuándo se calcula**: clic.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Corregir la ficha: ruta `lib/competencia_detalle.js:636-661`, no hay «índice inverso» hoy (escaneo por clic con caché). (2) Rótulo «Baja con la que suele ganar: …», porque la cifra es la mediana y `promedio_pct` viaja aparte (dos cosas distintas con nombre parecido).
- **Tanda**: 2 (crudos en el hash) y 3 (rótulo).

### 4.3 Los que cambian

#### D-09 · «Para poder presentarse»: la línea con la cifra que decide

- **Corto**: «● Para poder presentarse: cabe solo si el pliego trae anticipo del 30 % o más. Confírmelo en el pliego.» (ámbar); los siete textos de hoy llevan el mismo rótulo delante («● Para poder presentarse: cumple los requisitos.»). Sin credencial: «cabe solo con anticipo: confírmelo en el pliego», sin porcentaje.
- **Conciso**: `lineaRequisitos` (`public/app.js:1718-1749`; rama `:1746-1747`). Hoy, cuando P2 pasa con advertencia porque la capacidad depende del anticipo (`lib/rup.js:78-90`; `lib/puertas.js:183`) o P3 es `sin_dato`, dice «Cumple los requisitos, con detalles por revisar» y la cifra vive en el `title` (reproducido). La premisa «el servidor publica `p2_k.anticipo_que_cabe_pct`» es FALSA: `anticipoQueCabe` es una variable local (`lib/puertas.js:188`) que solo vive dentro de `mensaje` (`:201-205`); hay que añadir el campo al retorno de `p2K` (claves de hoy: `pasa, crp, crpc, dentro_de_tope, tope, depende_del_anticipo, advertencia, mensaje`). La cifra es `ceil(100·(1 − K/CRPC))` = 30 sobre 29,77 % exacto; decide `crpc_minimo <= crp` (`lib/puertas.js:176`), no la cifra: con anticipo declarado del 29 % P2 no pasa y con el 30 % pasa (ejecutado). Sin credencial esa cifra despeja la K (la CRPC es pública), así que el campo entra en `CAMPOS_P2_FINANCIEROS` de `lib/publico.js:47` y la línea pública va sin porcentaje. Texto propio para `p3_caja.sin_dato_de === "anticipo"` y `"cuantia"` y para `p2_k.sin_dato` (hoy los tres caen en el mismo ámbar genérico). «4,3 %» de filas con P2 fallando sale del comentario medido en `lib/rup.js:50-51`.
- **En qué beneficia**: la decisión ir/no ir en una frase; separar «poder presentarse» de «ganar» corrige el error más frecuente de quien empieza (informe A5, W1).
- **En qué afecta**: dos renglones en ese caso; ámbar: la puerta sigue pasando (el falso caro es el negativo).
- **Fuente y certeza**: `puertas.p2_k`, `p3_caja` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Publicar `anticipo_que_cabe_pct` en el retorno de `p2K` y añadirlo a `CAMPOS_P2_FINANCIEROS`; sin credencial, línea sin porcentaje. (2) Texto propio por motivo de `sin_dato`. (3) Cerradura que EJECUTE `lineaRequisitos` con un `p2_k` salido de `evaluarPuertas` real, no un objeto escrito a mano. (4) No copiar «30 %» a ninguna prueba: fijar la relación ceil/pasa (29 % no pasa, 30 % pasa).
- **Tanda**: 4 (el campo y su redacción pública) y 5 (la línea).

#### D-10 · No le alcanza solo (chip sin siglas, vivo si una socia lo rescata)

- **Corto**: «No le alcanza solo: supera lo que puede facturar · le falta caja» (ámbar, tarjeta viva) solo con `socio.tipo === "con_socio"` y `cierra_todo === true`; «No le alcanza, ni con socio: supera lo que puede facturar · le falta caja» (rojo, atenuada) con `ninguna_sirve`; con `cierra_todo === false` se conserva la redacción «puede no bastar», sin prometer.
- **Conciso**: `viable === false` (`listar.js:870`: `pasa_todas`, no mira al socio) + `puertas.no_viable_por` (`lib/puertas.js:328-331`, literales `RUP`/`K`/`Caja`) traducidos EN EL CLIENTE con `Glosario.corto("rup")` = «Registro de proponente» y `Glosario.corto("capacidad_contratacion")` = «Capacidad de facturar» (`public/glosario.js:54,56`) + `socio.cierra_todo` (D-01). Hoy la tarjeta real con `viable=false` y `cierra_todo=true` pinta `opacity-50`, el chip «No viable — K ·» y, dos renglones abajo, «Solo no le alcanza; con un socio, sí.» (reproducido). Los literales del servidor NO se cambian: la suite los fija por `deepStrictEqual` (`tests/e2e.js:11496`, `:11959`: `no_viable_por` = `['Caja']`), y fija `l.viable` con `no_viable_por.length > 0` (`:11940`) y los textos de `bloqueSocio` (`:4725-4735`). La ficha corregida: la suite no fija «No viable» (0 aciertos en `tests/`; solo `public/app.js:2139,2161`).
- **En qué beneficia**: los procesos grandes que siguen siendo suyos con la socia adecuada se ven vivos; «K» no significa nada para quien empieza.
- **En qué afecta**: no cambia orden ni veredicto; el nombre de la socia no viaja en la fila hasta D-01 (la app dice «socio»).
- **Fuente y certeza**: `puertas.no_viable_por`, `socio` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Traducir en el cliente; no tocar los literales del servidor. (2) Ámbar solo con `con_socio` y `cierra_todo === true`. (3) Revisar las aserciones reales (`:11940`, `:11496`, `:11959`, `:4725-4735`), no una que fije «No viable». (4) El nombre de la socia lo da D-01; hasta entonces «socio».
- **Tanda**: 5.

#### D-11 · Anticipo en tres estados

- **Corto**: «Anticipo 30 % (≈ $1.910 M)» · «Sin anticipo: el proceso lo declara» (con la redacción que ya existe en `lib/puertas.js:266` y `lib/publico.js:110`, no una tercera) · «Anticipo: no publicado · búsquelo en el pliego».
- **Conciso**: `anticipo_pct` + `anticipo_declarado` de `enriquecer` (`lib/negocio.js:108-121`, `:138-144`, `:223-228`; `anticipoDe` sobre nombre + descripción, `:81`). Hoy el chip (`public/app.js:2192`) mira solo `pct > 0` y pinta «Anticipo no declarado» con `declarado = true` y `pct 0` (reproducido: «Sin anticipo.» → `{0, true}` y el chip dice «no declarado»). El chip decide con el booleano: si el campo no viene (fila vieja en caché, `anticipoDeclarado` → `false`) se trata como «no publicado». Pesos = `cuantia_cop × pct / 100` solo con `cuantia_cop > 0` (6.366 M × 30 % = $1.909.800.000). La fuente es el OBJETO publicado (700 caracteres, `lib/proyeccion.js:88-90`), no el pliego: el texto no dice «lo dice el pliego». `SIN_ANTICIPO_RE` (`lib/negocio.js:89`) incluye «pago anticipado»: «No se pagará pago anticipado» cae hoy en «sin anticipo» (reproducido); o se separa la figura o el texto no afirma «sin anticipo» sobre esa negación.
- **En qué beneficia**: «sin anticipo» y «no se sabe» son decisiones distintas de caja y de socio.
- **En qué afecta**: lectura de texto: un anticipo escrito solo en el pliego → «no publicado», jamás «no hay»; anticipo ≠ pago anticipado no se afirma (detector único).
- **Fuente y certeza**: `anticipo_pct`, `anticipo_declarado` · estimado.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Decidir con `anticipo_declarado` + `pct`; sin el campo, «no publicado». (2) No escribir «lo dice el pliego»; resolver la negación de «pago anticipado». (3) Pesos solo con cuantía. (4) Reutilizar la redacción existente de «Sin anticipo».
- **Tanda**: 6.

#### D-12 · Las puertas con su cifra, en palabras del glosario

- **Corto**: «● Registro de proponente ✓ · La actividad de este proceso está inscrita en su registro.» (y un texto por cada uno de los cinco tiers de `MENSAJE_TIER` y del caso `rup.paso`) · «● Capacidad de facturar ~ · Sin anticipo, esta obra ($6.366 M) supera lo que puede facturar hoy ($4.471 M): cabe con un anticipo del 30 % o más. Con el 30 %, le quedarían unos $15 M después de esta obra.» · cuando el servidor lo publique: «Calculada sin descontar contratos en ejecución: no hay ninguno cargado.» · cuando `rup.co_estimado`: «Capacidad calculada con un ingreso estimado: el RUP no trae el ingreso operacional, así que se estima con la utilidad. Sirve para orientar, no para acreditar.» (texto que sobrevive de D-27) · «● Caja ? · Sin anticipo tendría que financiar ≈ $1.273 M antes del primer cobro y su patrimonio es $1.107 M: faltarían ≈ $166 M.» · «● Competencia · Poca: 1,4 empresas por proceso en 55 procesos.»
- **Conciso**: mismos cálculos de `lib/puertas.js` (`p1Rup:105-118`, `p2K:120-208`, `p3Caja:225-268`, `p4Competencia:273-295`); cambia la redacción de `mensaje`, que hoy dice «clase UNSPSC», «CRPC», «K», «capacidad residual» (comprobado pasando las regex de `JERGA_JS` al mensaje de P2: casan `/capacidad residual/i`, `/\bCRPC?\b/`, `/\bK\b/`; `JERGA_JS` solo barre `public/*.js`, `tests/e2e.js:29449-29466`). «Le quedarían» = `crp − crpc·(1 − 0,30)` y «faltarían» = `financiacion_requerida − patrimonio` (ejecutado con el fixture: $14.721.189 y $165.947.036; las cifras 14.816.609 y 165.919.773 de los diseños vienen de otra cuantía: no copiarlas a mano). «Sin descontar contratos en ejecución» exige un campo del servidor (p. ej. `sce_asumido_cero`): hoy ese hecho es solo un `console.warn` en `calcSCE` (`lib/capacidad.js:70-74`) y, además, `helder` SÍ tiene dos contratos en `perfil.sce` (`lib/perfiles.js:104-107`): la frase «no hay ninguno cargado» es falsa para él y solo vale para `genesis`/`prodiac` (`sce: []`). P4 imprime `1.4` con punto: la coma decimal se pone donde se redacta, con la función de formato que ya exista (buscarla con `node tests/mapa.js` antes de escribir otra). Sin credencial `lib/publico.js:73-82`, `:92-111`, `:199-213` reescribe `p2/p3.mensaje` sin cifras: `mensajeP2Publico`/`mensajeP3Publico` reciben la misma redacción nueva. Alternativa declarada: que `badgesPuertas` redacte en el cliente desde los campos numéricos.
- **En qué beneficia**: quien empieza entiende «capacidad» y «caja»; el experimentado sabe que la K es un TECHO y cuánto le queda después de esta obra.
- **En qué afecta**: caen las aserciones que fijen los textos de P2/P3 (`E2E_SOLO="unidad capacidad"`, `"unidad puerta caja sin anticipo"`); cerradura nueva que EJECUTE `evaluarPuertas` y pase `JERGA_JS` a los mensajes (falla contra el árbol de hoy); el censo de jerga se amplía a `lib/puertas.js` y `lib/publico.js`; «faltarían» hereda el 20 % (`FRACCION_FINANCIACION`) y el anticipo desconocido, declarados.
- **Fuente y certeza**: `puertas.p1_rup..p4_competencia`, `rup.co_estimado` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Publicar un campo del servidor antes de escribir «sin descontar contratos en ejecución». (2) Traducir los cinco tiers de `MENSAJE_TIER` (`lib/puertas.js:69-75`) y el caso `rup.paso`, no solo «clase». (3) Ampliar el censo de jerga a `lib/puertas.js` y `lib/publico.js` y reescribir los mensajes públicos; o redactar en el cliente. (4) Coma decimal; no copiar cifras a las pruebas. Además, por D-27 (refutado): la frase del ingreso estimado no manda hacer nada, porque no hay campo donde cargar el ingreso.
- **Tanda**: 4.

#### D-13 · Cuántas empresas compiten (una cifra, un redondeo)

- **Corto**: «1,4 · empresas por proceso · 55 procesos» · sin base: «— · sin histórico de esta entidad».
- **Conciso**: `competencia_entidad.promedio_oferentes`, `total_procesos` (`competenciaDe`, `lib/indice_competencia.js:1213-1232`; `MIN_PROCESOS = 5`; con 4 procesos o sin índice el promedio es `null`: sin dato, no cero; reproducido). Hoy la celda pinta «~1 empresa suele competir · en 55 procesos» (`Math.round`, `public/app.js:2073-2075`) y la banda «(~1,4 oferentes)»: reproducido con `bloqueProbabilidad` real. Un decimal con coma (`fmtNum`) en todas las apariciones, con concordancia en plural («1,4 empresas por proceso»); el rótulo «supuesto: 5 rivales» sale de la celda.
- **En qué beneficia**: un solo número por hecho.
- **En qué afecta**: la suite FIJA el redondeo de `cuantosCompiten.frase` (`tests/e2e.js:30531-30536`: «Aquí suelen competir 5 empresas.» para 4,6 y «1 empresa.» para 1,2): esas aserciones cambian en el mismo commit.
- **Fuente y certeza**: `indice:competencia` · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Cambiar `tests/e2e.js:30531-30536` en el mismo commit. (2) Plural y coma decimal como ya hace la banda. (3) No reescribir la base mínima: `competenciaDe` ya anula el promedio bajo 5.
- **Tanda**: 5.

#### D-14 · De cada cuántos se gana uno («—» sin histórico)

- **Corto**: «1 de 3 · se gana, aproximadamente · con los 55 procesos de esta entidad» · «1 de 4 · … · con el promedio del departamento» · «— · sin histórico para estimar».
- **Conciso**: `frecuenciaNatural` (`public/app.js:1799-1805`, suelo 2) sobre `p_ganar` (`:2048`). `estimarPDetalle` siempre devuelve `p` (`PROMEDIO_CONSERVADOR = 5`, `lib/probabilidad.js:124`; `fuente` en `:311-324` y `:445-451`), así que con el supuesto la celda real pinta «— sin histórico de competencia supuesto: 5 rivales 1 de 6 se gana, aproximadamente» (reproducido: es «1 de 6», no «1 de 5»); la rama «—» (`:2077-2079`) es inalcanzable. La celda decide por `p_ganar_detalle.fuente === "conservador"` (no por `p`), manda el supuesto a «Ver cómo se calcula» y con `"departamento"` lo dice; `p` sigue ordenando y no se pone a cero (`docs/MEMORIA.md § «Desglose justificado de P(ganar) (ago 2026)»`).
- **En qué beneficia**: un supuesto no se pinta como número; la celda buena recupera su crédito.
- **En qué afecta**: más tarjetas con «—»; el orden no cambia; el modal (`pintarDesglose`, `:3198`) seguirá diciendo «De cada 6 procesos… gana 1» y debe declarar la fuente al lado.
- **Fuente y certeza**: `p_ganar`, `p_ganar_detalle.fuente` · estimado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Decidir «—» por `fuente === "conservador"`. (2) El modal muestra la fuente junto a la frase. (3) Cerradura que ejecute `bloqueProbabilidad` con `fuente: "conservador"` y exija «—» (hoy no hay ninguna aserción sobre esa celda: `grep 'se gana, aprox' tests/e2e.js` → 0). (4) No copiar «1 de 5» a ninguna prueba.
- **Tanda**: 5.

#### D-15 · Lo que deja, y el precio de mercado como lo que es

- **Corto**: (b) «≈ $5.920 M · si bajan lo habitual aquí (7 %, 8 contratos)» solo con `origen_precio === "mercado"`; (a) «−$3 M · podría perder, en el peor caso · con el costo que usted calculó», (c) «Calcular · cuánto deja: falta su costo» y (d) «—» se conservan.
- **Conciso**: `precio_esperado = round(V)`, `V = techo_competitivo || presupuesto oficial`, techo = `po × (1 − mediana/100)` solo con base ≥ 5 (`lib/ganancia.js:250-252`, `:388-391`; `lib/apu/piso_techo.js:70-74`, `:186`). Reproducido: baja 7 %/8 → 5.920.380.000 (`mercado`); sin base → 6.366.000.000 (`presupuesto_oficial`, `baja_*` null). Hoy la celda dice «$5.920M · es lo que suele pagar esta entidad · medido en 8 contratos» (`bloqueGanancia`, `public/app.js:1867-1965`). Solo cambia el rótulo.
- **En qué beneficia**: referencia, no hecho; nunca decide el precio (decide Precios con el costo).
- **En qué afecta**: `ganancia` pesa 2.960 B por fila (medido; 31 claves) y `bloqueGanancia` lee `valor, base, origen_precio, precio_esperado, baja_aplicada_pct, baja_procesos, veredicto, peor, mejor` (y el modal, `desglose`): el recorte a `{valor, motivo, precio_esperado, baja_procesos}` que proponían los diseños ROMPE la celda; o no se recorta, o se conserva esa lista mínima. Sin credencial `ganancia` es `null` → «—» (`lib/publico.js:157`).
- **Fuente y certeza**: `ganancia.precio_esperado`, `baja_mercado` · calculado.
- **Cuándo se calcula**: petición (con credencial).
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Rótulo solo con `origen_precio === "mercado"`; con `presupuesto_oficial` conservar «Calcular · cuánto deja: falta su costo». (2) Si se recorta la fila, conservar como mínimo la lista de arriba más `frase`; o no recortar. (3) Revisar las aserciones de la tercera celda y no reintroducir «descuento típico»/«Baja típica» (cercados en `JERGA_JS`).
- **Tanda**: 5.

#### D-16 · Cierre con hora, y «sin fecha» dicho

- **Corto**: «Cierra en 31 días · mié 14 de oct · 3:00 p. m.» · «Cierra HOY · 3:00 p. m.» · «Sin fecha de cierre publicada: mírela en el pliego» (gris).
- **Conciso**: `fecha_cierre` sale de `fechaCierre` en `enriquecer` (`lib/negocio.js:51-54`, `:181-195`, `:237`; columna real `fecha_de_recepcion_de`) y conserva la hora literal («2026-10-14T15:00:00.000»); ilegible o ausente → `null`. Hoy `chipCierre` (`public/app.js:1432-1441`) recibe `cierreTxt` sin hora (`:2136`) y con `null` devuelve `""`: la ausencia es muda (reproducido). La regla YA EXISTE: `horaCierreDe` (`lib/handlers/perfil/entrada.js:305-311`) extrae `hh:mm` con regex sobre la cadena y devuelve `null` para «00:00» (medianoche = hora no publicada); no está exportada: se mueve a `lib/negocio` junto a `fechaCierre` o se publica `cierre_hora` en la fila. La hora se construye desde `hh:mm` SIN pasar por `Date`: medido con `TZ=America/Bogota`, `new Date('2026-10-14T15:00:00.000').getHours()` = 15 (parsea como local), mientras un motor en UTC lo lee como las 15:00Z: la hora cambiaría de sitio según el motor. Días desde el 13-sep: 31.
- **En qué beneficia**: «el cierre a las 3:00 p. m. es la hora en que más ofertas mueren»; la ausencia deja de ser muda.
- **En qué afecta**: +12 caracteres (probar a 390 px); si la hora del dataset no fuera la de Colombia se enseñaría mal (NO VERIFICABLE contra la fuente hoy); donde el cronograma del pliego se leyó, ese publicado gana.
- **Fuente y certeza**: `fecha_de_recepcion_de` → `fecha_cierre` · publicado.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Llamar o compartir `horaCierreDe`, no reescribir la regex; «00:00» → sin hora. (2) Construir «3:00 p. m.» desde `hh:mm` sin `Date`. (3) La cerradura siembra una fila con `T00:00` (`docs/MEMORIA.md § «El calendario de cierres, y tres bloques menos en Mi empresa (31-ago-2026)»` avisa que el corpus de la suite no trae ninguna). (4) Probar a 390 px; el cronograma del pliego gana.
- **Tanda**: 6.

#### D-17 · Cuánto bajan aquí, con la banda y con su origen

- **Corto**: «Suelen bajar 7 % (unos $445 M) · la mitad de los que ganaron bajó entre 3 % y 9 % · 8 contratos de esta entidad» · con `baja_mediana ≤ 0`: las palabras de `mensajeDe` («Aquí se gana sin bajar el precio») · sin base propia y con departamento: «En Tolima los que ganaron descontaron cerca de 4 % (8 contratos; esta entidad no tiene historial propio)», sin el rótulo «Suelen bajar» · bajo el mínimo: «Suelen bajar: sin datos (hacen falta 5 contratos adjudicados y hay 3)».
- **Conciso**: `baja_mercado.{baja_mediana, baja_p25, baja_p75, procesos_contados, granularidad_utilizada, mensaje}` ya viajan (`bajaDeMercado`, `lib/indice_baja.js:885-934`; respuesta `:905-920`; `listar.js:466-471`, `:858`); `chipBaja` (`public/app.js:1349-1366`) pinta solo la mediana. Banda en palabras solo si `baja_p25 != null`, `baja_p75 != null` y `baja_p75 > baja_p25` (la misma guarda que `multiplicadorPrecio`): reproducido que `utilizable` (`:802-811`) no exige `p75 > p25` y una celda real con IQR cero daría «entre 35 % y 35 %»; un hash viejo trae `baja_p25 null`. La variante de departamento sale de `baja_departamento.mensaje` tal cual (`bajaDepartamentoDe`): la cascada que decide (`:893-897`) casi nunca llega a departamento en producción y no puede haber dos instrucciones de precio en la misma tarjeta. Redacción con precedente: `htmlBajaAdjudicatario` («entre 6 % y 10 %», `tests/e2e.js:13086-13089`). Sin credencial `lib/publico.js:133` anula `baja_mercado`: el chip dice «sin datos» aunque el dato exista (comportamiento heredado, no de este dato).
- **En qué beneficia**: la cifra con la que se fija el precio; la banda dice cuánto moverse; el origen, si es de ESTA entidad.
- **En qué afecta**: con IQR cero o hash viejo no hay banda; nunca dos instrucciones de precio; la mediana no decide (decide el optimizador de Precios); sin credencial «sin datos».
- **Fuente y certeza**: `indice:baja` (`bajaDeMercado`) + `baja_departamento` (`bajaDepartamentoDe`) · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Banda solo con `p25`, `p75` presentes y `p75 > p25`. (2) `baja_mediana ≤ 0` → palabras de `mensajeDe`, nunca «Suelen bajar 0 %». (3) La variante de departamento sin el rótulo «Suelen bajar». (4) Bajo el mínimo, el mensaje que ya viaja. (5) Texto «En Tolima los que ganaron descontaron cerca de 4 % (8 contratos; esta entidad no tiene historial propio)». (6) Declarar que sin credencial el chip dice «sin datos».
- **Tanda**: 7.

#### D-18 · Cuantía, y su ausencia dicha

- **Corto**: «$ 6.365.863.685» · «Cuantía no publicada: la capacidad de contratación no se puede verificar. Confírmela en el pliego.»
- **Conciso**: `cuantia_cop = primerNumero(...) || 0` (`lib/negocio.js:207`) viaja 0 sin dato y NO se cambia (decisión de `docs/MEMORIA.md § «Auditoría integral del 1-sep-2026 · trece frentes, dos auditores que llegaron y el resto a mano»`: el cambio a `null` cruza a docenas de consumidores); la tarjeta ya rotula la ausencia sin `|| 0` (`public/app.js:2152-2157`) y la puerta P2 ya redacta la consecuencia (`lib/puertas.js:222`; `lib/publico.js:77`): se LLAMA ese mensaje, no se escribe otro. Hermano A1 H5: sin cuantía `valorEsperado` da 0 (`lib/probabilidad.js:470-475`) y `atractividad: ctx.ve || 0` (`listar.js:153`) ordena como cero (reproducido); las filas sin cuantía pasan a un grupo propio al final, decidido con `presupuestoOficialDe(l) === null` (`lib/negocio.js:201-204`), nunca con `ve === 0` (que también es 0 con cuantía y probabilidad 0) ni con `cuantia_cop` falsy. `puntaje_ponderado` sale `NaN` → `null` sin cuantía y solo afecta a `?ordenar_por=puntaje`.
- **En qué beneficia**: quien empieza entiende por qué media tarjeta está en «—»; una obra grande sin presupuesto no se esconde «como si valiera cero».
- **En qué afecta**: cambia el orden de las filas sin cuantía (grupo declarado al final) en `atractividad`/`ve`; el reagrupado corre en `listar.js` (`ORDEN_CAMPOS`) por petición.
- **Fuente y certeza**: `precio_base` → `cuantia_cop`; `presupuestoOficialDe` · publicado.
- **Cuándo se calcula**: sync (campo) + petición (orden).
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) La segunda frase se toma de `lib/publico.js:77`/`lib/puertas.js:222`. (2) Grupo final por `presupuestoOficialDe(l) === null`. (3) No cambiar el 0 de `cuantia_cop` en la API. (4) Declarar el costo como sync + petición.
- **Tanda**: 6.

#### D-20 · Banda de competencia: nivel, base y qué abre

- **Corto**: «● Poca competencia · 55 procesos · quién gana aquí ›» · «● Sin datos históricos de esta entidad ›».
- **Conciso**: `bandaCompetencia` (`public/app.js:1606-1621`; títulos en `:551-556`, con «●» y «Sin datos históricos de esta entidad») conserva nivel y botón; la cifra vive solo en D-13 (una cifra por hecho) y el texto dice el destino. «55 procesos» = `total_procesos`, solo con `conBase` (procesos > 0, nivel clasificado, promedio presente). El mismo hecho vive por segunda vez en el servidor: `badgeCompetencia` del resumen («Poca competencia — promedio 1,4 oferentes en 55 procesos», `lib/handlers/perfil/resumen.js:125-133`, cerradura `tests/e2e.js:16344`) y `avisoCompetencia` repite el promedio (`app.js:1465-1475`): se alinea o se declara con motivo (sección 7, pregunta 5). Descartada: «1,4 por proceso · 55 procesos ›» (repite la cifra).
- **En qué beneficia**: se lee sin traducir y se sabe qué abre.
- **En qué afecta**: cerraduras del badge (`tests/e2e.js:23608-23614`, `:23348-23358`) se conservan; la del panel (`:16344`) solo valida el prefijo del título; `:23566` exige «Quién gana aquí» como título del modal.
- **Fuente y certeza**: `indice:competencia` (`competenciaDe`, memoizada por fila en `listar.js:461-463`) · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Decidir en el mismo cambio el badge del panel. (2) «55 procesos» solo con `conBase`. (3) Conservar literalmente `data-entidad`, `cursor-pointer`, `hover:underline` y «Quién gana aquí».
- **Tanda**: 7.

#### D-21 · Cierre prorrogado, con los días

- **Corto**: «Cierre prorrogado 12 días: antes cerraba el 1 oct 2026 (desde que la aplicación sigue el proceso)».
- **Conciso**: `_cierre_prorrogado` (cierre anterior más temprano que el vigente, fechas operables) y `_cierre_inicial` (el más temprano visto) se derivan entre versiones en `lib/almacen.js:365-378` (traza solo con `senales`, `:329`; `listar.js:255` pide `senales: true`) y ya pintan el chip (`public/app.js:2177`). Días = `trunc((instanteOperable(fecha_cierre) − instanteOperable(_cierre_inicial)) / 864e5)` sobre fechas operables; si no es entero o alguna no es legible, solo el chip sin días (reproducido: formatos mezclados dan 12,708). La condición es `_cierre_prorrogado === true` (`_versiones > 1` es redundante). Alinear `evaluarAdendas` (`lib/adendas.js:63-65`): con la primera versión sin fecha de cierre hoy dice «Fecha de cierre: pasó de — a 13/10/2026. Se prorrogó…» mientras `_cierre_prorrogado` es `false` (reproducido): con `antes == null` no se dice «Se prorrogó». Fecha con el formato de la tarjeta («1 oct 2026», `app.js:2136`). El factor 1,20 de `lib/probabilidad.js:126` se aplica en `:349`.
- **En qué beneficia**: una prórroga larga suele significar que no llegaron ofertas y es más tiempo para armar la oferta.
- **En qué afecta**: «no prorrogado» puede ser «no lo vimos»; con primera versión sin fecha no hay prórroga ni días.
- **Fuente y certeza**: versiones del corpus (`leerChunksDedup` con `senales`) · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Días enteros sobre fechas operables; sin días si no son legibles. (2) Unificar con `evaluarAdendas`. (3) Condición `_cierre_prorrogado === true`. (4) Formato de fecha de la tarjeta y «desde que la aplicación sigue el proceso».
- **Tanda**: 6.

#### D-22 · Cambio de reglas, con conteo y fecha

- **Corto**: «La entidad cambió las reglas de este proceso · cambió 2 reglas (cierre y presupuesto) · visto por última vez el 10 sep 2026» + los renglones de hoy («● Cierre: pasó de … a …»).
- **Conciso**: `adendas.n` cuenta CAMPOS distintos entre la primera y la última versión (`lib/almacen.js:340-352` guarda solo esas dos; `:379-386` deriva `_cambios`; `lib/adendas.js:44-102`, fuente `:100`), no veces: reproducido `n = 2` («Fecha de cierre…», «Presupuesto oficial…») con tres versiones, y `n = 1` con un solo campo cambiado en la segunda versión. La fecha del último cambio no se guarda: la única fecha de versión en la fila es `:updated_at` (`lib/proyeccion.js:39`) = última VERSIÓN sincronizada, que puede no ser la del último cambio. Se amplía `bloqueAdendas` (`public/app.js:1045-1052`) y `adendas.resumen`; se declara que solo se ven los cinco campos del dataset.
- **En qué beneficia**: cuántas reglas cambiaron y cuándo se vio por última vez decide si releer el pliego hoy.
- **En qué afecta**: solo ve cambios entre la primera y la última versión de cinco campos; no hay fecha del último cambio; D-54 lo complementa.
- **Fuente y certeza**: versiones del corpus (`_cambios`) + `:updated_at` de la fila · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) No decir «N cambios»: decir «cambió N reglas» (o usar `_versiones` para «se reescribió N veces»). (2) Fecha solo como «visto por última vez el …» con `:updated_at`. (3) Reutilizar `bloqueAdendas` y `adendas.resumen`; declarar el límite de los cinco campos.
- **Tanda**: 6.

#### D-23 · Cómo lo adjudican (la modalidad), arriba

- **Corto**: «Licitación pública» · «Selección abreviada de menor cuantía» · «Mínima cuantía» (chip junto a la cuantía; el literal de SECOP en el `title`). Sin modalidad no se pinta nada.
- **Conciso**: `modalidad_de_contratacion` viaja y ya se pinta plegada (`public/app.js:2201`); `chipManifestacion` ya va arriba (`:2174`). Se MUEVE el chip, no se duplica. Los literales de p6dx varían («Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes», «Licitación pública Obra Publica»; `docs/datos.md §6`): el nombre propio se pinta por raíz con `modalidadCanonica` (`lib/indice_baja.js:179-186`; raíces en `lib/filtros.js:223-226`) y la etiqueta del glosario (`public/glosario.js:77-81`, «Cómo lo adjudican»; `lib/adendas.js:88` ya usa esa etiqueta); si la raíz no casa, el literal tal cual. La explicación en llano es otro dato (D-46).
- **En qué beneficia**: decide si hay manifestación de interés, si el método de precio se sortea y si la entidad puede limitar la convocatoria a empresas pequeñas.
- **En qué afecta**: ninguna (texto que ya viaja); el chip plegado desaparece de «Más detalles».
- **Fuente y certeza**: p6dx `modalidad_de_contratacion` · publicado.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Mover, no duplicar. (2) Nombre propio por raíz con `modalidadCanonica`; literal en `title`. (3) Sin modalidad nada (no «—»).
- **Tanda**: 6.

#### D-24 · Precio global arriba; precios unitarios explicado, plegado

- **Corto**: arriba, ámbar, solo con `tipo_precio === "global"`: «Precio global: el riesgo de las cantidades es suyo (el objeto dice «precio global»)» · plegado: «Precios unitarios: si hay más cantidad, se paga».
- **Conciso**: `tipoPrecio` (`lib/negocio.js:264-272`, regex `:262-263`; `listar.js:881` al servir) es conservador: reproducido `null` con las dos fórmulas, con ninguna y con «cobertura global de la vía»; «PRECIOS GLOBALES» → `global`. La redacción ya existe con su origen en `lib/guia_proceso.js:528-529` («Es a precio global: el riesgo de las cantidades es suyo», motivo «el objeto dice «precio global»»), también en `lib/formulario1.js:84-86` y `lib/dictamen.js:479`: se llama, no se escribe una cuarta copia. Hoy la explicación vive en el `title` de los chips (`public/app.js:2202-2205`).
- **En qué beneficia**: la variable de riesgo del APU a la vista cuando cambia una decisión.
- **En qué afecta**: estimado del texto; con `null` no se pinta nada; el caso «unitarios» sigue plegado.
- **Fuente y certeza**: objeto y descripción del proceso (`tipoPrecio`) · estimado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Arriba solo con `global`, ámbar y con el origen dicho. (2) Reutilizar la redacción de `guia_proceso.js:528-529`. (3) Conservar los literales «Precios unitarios», «Precio global» y `tipo_precio` en `app.js` (`tests/e2e.js:23566`); el catálogo `{null, unitarios, global}` está cerrado (`:10988-10990`).
- **Tanda**: 6.

#### D-25 · Entidad · municipio · departamento

- **Corto**: «ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Purificación · Tolima», con la frase en texto (no solo en `title`) de que es la sede de quien contrata.
- **Conciso**: los tres campos ya viajan (`lib/proyeccion.js:42`; la fila es `{...sinAdjudicacion(l)}`, `listar.js:841,851`) y la cabecera ya pinta «entidad · departamento» (`public/app.js:2149`); se añade el municipio. `ciudad_entidad` trae el literal «No Definido» (`docs/datos.md §6`) y la guarda de `:2149` solo cubre el departamento: reproducido «chip plegado hoy: No Definido» y `lib/guia_proceso.js:263` tampoco lo filtra (hermano). El formato «ciudad · departamento» ya existe en `public/calendario.js` (`lugarDeEjecucion`, fila «Lugar de ejecución» en `:282`): se mueve a un módulo compartido y tarjeta y calendario lo llaman.
- **En qué beneficia**: el «dónde» en una línea.
- **En qué afecta**: es la SEDE de la entidad, no el sitio de la obra: se declara en texto (`docs/MEMORIA.md § «El lugar de ejecución ES la entidad, «Para Helder» abre la pestaña, y Tailwind medido de verdad (31-ago-2026, segunda pasada)»` tiene cerradura: el rótulo sin la frase afirma lo que no se sabe). «No Definido» se filtra como el departamento.
- **Fuente y certeza**: p6dx · publicado.
- **Cuándo se calcula**: ninguno (ya viaja en la fila).
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Filtrar «No Definido» en `ciudad_entidad` (y en `lib/guia_proceso.js:263`). (2) Declarar la sede en texto. (3) Una sola regla de formato compartida con el calendario. (4) Costo: ninguno.
- **Tanda**: 7.

#### D-28 · «Calcular mi precio» lleva el plazo

- **Corto**: (sin texto nuevo: el editor de Precios abre con el plazo del proceso; y dice en pantalla cuando el plazo no venía publicado).
- **Conciso**: `qApu` (`public/app.js:2114-2126`, `:2122`) lee `l.plazo_meses`, que la fila de `op=listar` no lleva (`grep plazo_meses listar.js` → nada; la fila sí lleva `duracion` y `unidad_de_duracion`, `lib/proyeccion.js:44`). `plazoMesesDe` (`lib/capacidad.js:146-157`) devuelve 12 sin duración legible (reproducido: `{}` → 12, `"abc"` → 12, 90 días → 3), no `null`: la guarda «null sin duración» ya existe en `lib/guia_proceso.js:219` (`l.duracion && num(l.duracion) > 0 ? plazoMesesDe(l) : null`) y se extrae con nombre a `lib/capacidad` para que la fila, la guía y `lib/handlers/perfil/resumen.js:528` (que hoy publica 12 por defecto) la llamen. El editor deja hoy el campo en su valor por defecto 8 (`index.html:4022`) y manda `|| 12` (`app.js:7410`; `lib/handlers/apu/editor.js:801,868`): con `null` debe decir en pantalla que el plazo no venía.
- **En qué beneficia**: el APU nace con el plazo, que mueve administración y financiación.
- **En qué afecta**: por fila en `op=listar`; el «+15 B» de los diseños no está medido.
- **Fuente y certeza**: `duracion`, `unidad_de_duracion` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Llamar la guarda de `guia_proceso.js:219`, extraída con nombre. (2) Alinear `resumen.js:528`. (3) El editor declara el plazo no publicado. (4) Costo petición; bytes sin medir.
- **Tanda**: 8.

#### D-29 · Los «—» dicen por qué (sin cuantía · sin clave)

- **Corto**: celda 3: «— · sin cuantía publicada» · «— · entre con su clave del sitio para ver cifras»; cabecera de la lista, una sola vez: «Sin su clave del sitio, la lista no enseña cifras de dinero ni cuánto bajan.»
- **Conciso**: reproducido con `bloqueGanancia` real (`public/app.js:1867`): SIN credencial y con cuantía de $500 M la celda dice en el `title` «Sin presupuesto oficial publicado…» (motivo falso) y no muestra nada visible (`nota` vacía); CON credencial y sin cuantía la frase correcta va solo en el `title`, que en teléfono no existe. `ganancia.motivo` («sin_presupuesto_oficial», `lib/ganancia.js:205-222`) y `finanzas_visibles` (`listar.js:1025`; `:370-376` credencial inválida = 401) ya viajan; `app.js:1244` conserva `ultimaBusqueda.finanzas_visibles`. La palabra ya existe: «clave del sitio» (`public/lista_libro.js:112`, `app.js:1283`); «sin cuantía publicada» repite la cabecera (`app.js:2156`).
- **En qué beneficia**: un «—» que dice por qué es una instrucción; el de acceso no se confunde con «no hay datos».
- **En qué afecta**: nada; credencial presente e inválida sigue siendo 401.
- **Fuente y certeza**: `ganancia.motivo`, `finanzas_visibles` · calculado.
- **Cuándo se calcula**: ninguno (ya viajan).
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: confirmado. Requisitos: «clave del sitio»; el motivo en la nota visible de la celda, no solo en `title`.
- **Tanda**: 5.

#### D-30 · Rótulo «Para ganar», y lo que la aplicación no mide

- **Corto**: «Para ganar» sobre las DOS primeras celdas (no sobre «lo que deja») · en «Ver cómo se calcula»: «Lo que la aplicación no mide: los puntos que da el pliego por calidad, por apoyo a la industria nacional y por criterios sociales. El precio solo entra como cuánto suele bajar esta entidad. Lea el capítulo de evaluación del pliego.»
- **Conciso**: `bloqueProbabilidad` (`public/app.js:2022-2107`: tres celdas) y `pintarDesglose` (`:3192-3216`). Ningún módulo modela el puntaje (`grep puntaje|calidad` en `lib/probabilidad.js` y `lib/probabilidad_desglose.js` → nada), pero la probabilidad SÍ ajusta por precio (paso 4 del desglose, `lib/probabilidad_desglose.js:348-352`): el texto lo dice. El sitio natural del aviso es el texto del servidor del modal (`de_donde_salen_los_datos`, `:559-561`), que la suite censa. Factores del puntaje según `docs/MEMORIA.md § «Habilitante vs. puntaje — la distinción más importante del oficio»`: calidad, precio, industria nacional, sociales.
- **En qué beneficia**: quien empieza confunde «cumplo» con «gano»; dos rótulos lo separan.
- **En qué afecta**: nada.
- **Fuente y certeza**: rótulo · calculado.
- **Cuándo se calcula**: ninguno (rótulo) · clic (si va en el modal).
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: con condiciones. (1) Texto corregido (arriba). (2) «Para ganar» solo sobre las dos primeras celdas. (3) Costo declarado.
- **Tanda**: 5.

#### D-31 · Guardar dice qué da

- **Corto**: «Guardar · para ver qué le piden y el paso a paso» (línea a la vista, no solo `title`).
- **Conciso**: `botonGuardar` (`public/app.js:3553-3567`); `alternarGuardado` (`:3572-3596`) guarda la foto, abre sola la guía en Mis procesos (`activarPestana("seguimiento")`) y encola la lectura de documentos; la guía trae ocho casillas (`lib/guia_proceso.js:416,588`), requisitos con estado —«pendiente», jamás «cumple», cuando no puede verificar (`tests/e2e.js:13940-13948`)— y pasos fechados. Respuesta visible ya existe («Guardado · me interesa» / «No se pudo», `:3565,3607`).
- **En qué beneficia**: P4/P8 sin descubrirlo por accidente.
- **En qué afecta**: nada; el pie de la tarjeta tiene tres botones (`app.js:2205-2211`): el rótulo largo se prueba a 400 px.
- **Fuente y certeza**: rótulo · calculado.
- **Cuándo se calcula**: clic.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: confirmado. Requisito: navegador real (ancho del pie).
- **Tanda**: 7.

#### D-32 · Antesala ligera: el modal de la entidad no espera a datos.gov.co

- **Corto**: (sin texto nuevo arriba) un pliegue al pie del modal: «Ver quiénes se han presentado aquí y cómo ejecuta sus contratos ›».
- **Conciso**: `detalleEntidad` hace el barrido MÁS dos consultas vivas en paralelo (`lib/competencia_detalle.js:482-486`) con tope de 6.000 ms cada una (`lib/proponentes.js:45`, `lib/ejecucion.js:37`) que no se cachean si fallan (`:523-527`): medido con `fetchImpl` colgado, 6.012 y 6.007 ms. `op=entidad&ligero=1` desde la tarjeta (solo histórico) y las fuentes vivas al pulsar el pliegue (`public/app.js:3110-3111`: `bloqueProponentes`/`bloqueEjecucion` reciben hoy siempre un objeto; el contrato del bloque caído es `ok:false, motivo, top:[]`, `tests/e2e.js:13215-13230`). Precedente del parámetro: `ligero` en `lib/handlers/perfil/seguimiento.js:258` y la carga por toggle en `app.js:4739`. La caché de la entidad es UNA clave con el cuerpo entero (`v7`, `:132`; TTL 3600, `:60`; `:143-144`, `:178-184`): la respuesta ligera NO puede escribirla (serviría una hora un cuerpo sin proponentes a la petición completa); puede leer la completa si existe.
- **En qué beneficia**: «Quién gana aquí» abre sin esperar hasta 6 s a una fuente externa.
- **En qué afecta**: dos peticiones cuando el usuario sí quiere lo vivo; la respuesta ligera no escribe la caché de 1 h (o usa otra clave); parámetro, no `op` nueva (`api/*.js` sigue en 6: `tests/e2e.js:4285`, `:33412`, `:34533`).
- **Fuente y certeza**: `op=entidad` · medido.
- **Cuándo se calcula**: clic.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) La respuesta ligera no escribe la caché `v7`. (2) Los bloques ausentes van declarados (motivo «se consulta al pulsar»), no omitidos. (3) Texto «quiénes se han presentado aquí» (los proponentes son de procesos cerrados). (4) Lo vivo sigue sin cachearse cuando falla y se declara como fuente externa.
- **Tanda**: 3.

#### Los que se conservan (solo verificar que siguen, o corregir su ficha)

#### D-68 · «Ver cómo se calcula»

- **Corto**: «Ver cómo se calcula».
- **Conciso**: botón (`public/app.js:2104-2105`) → `cargarDesglose` (`:3250-3279`, `fetch /api/inteligencia?op=probabilidad`, `leerJson` aparte) → `pintarDesglose` (`:3192-3245`); la op es de lectura (`api/inteligencia.js:21` → `lib/handlers/inteligencia/detalle.js:67`, `desgloseDeProceso`). El desglose lleva el supuesto de 5 rivales en el paso 1 cuando no hay histórico (`lib/probabilidad_desglose.js:221`, `:237`). Recibe además la línea de D-30 y la fuente cuando D-14 pinta «—».
- **En qué beneficia**: el porqué, plegado y a un clic.
- **En qué afecta**: nada.
- **Fuente y certeza**: `op=probabilidad` → `desgloseDeProceso` (`p_ganar_detalle` solo alimenta el `title` de la celda) · estimado.
- **Cuándo se calcula**: clic.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado (la fuente de la ficha era imprecisa: corregida arriba).
- **Tanda**: 5 (verificación).

#### D-69 · Avisar que le interesa (chip y aviso)

- **Corto**: «Avisar que le interesa · vence HOY» · «verifique HOY si sigue abierto» · «vence mañana» · «N días de oficina» · «el plazo puede cerrar el …» · «fecha por confirmar en SECOP II» · «plazo vencido» (cuatro estados, siete textos).
- **Conciso**: `manifestacionDeFila` (`lib/manifestacion.js:298-327`); la fecha del pliego gana; sin ella no hay cuenta atrás; el techo legal viaja como `plazo_maximo_habiles` y no se pinta como vencimiento. Reproducidos los siete textos del chip (`public/app.js:1498-1524`) y el aviso (`:1526-1556`).
- **En qué beneficia**: a veces solo abren horas; ya dice la acción y la urgencia.
- **En qué afecta**: nada.
- **Fuente y certeza**: `manifestacion` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado (`docs/MEMORIA.md § «EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS: TRES ES EL TECHO (20-ago-2026)»`).
- **Tanda**: 7 (verificación).

#### D-70 · Zona

- **Corto**: «Su zona (Ibagué)» · «Cerca · ~200 km de Bogotá» (Tolima) · «… · verifique la seguridad de la zona» · «Distancia sin calcular: no sabemos desde dónde opera». Los «~120 km de Bogotá» de los diseños son Meta, no Tolima (`data/accesibilidad_departamentos.json`).
- **Conciso**: `evaluarZona` (`lib/accesibilidad.js:103-214`; `BASE_DUENO = ['Bogotá','Ibagué']`) por fila (`listar.js:625`); estimado por departamento y declarado con «~»; sin base o sin departamento `km` es `null` (nunca 0); orden público solo como «verifique» (`public/app.js:1419`).
- **En qué beneficia**: viáticos y seguridad antes del primer peso de utilidad.
- **En qué afecta**: nada.
- **Fuente y certeza**: `zona` (`evaluarZona`) · estimado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado.
- **Tanda**: 7 (verificación).

#### D-71 · Aviso de competencia baja (señal #11)

- **Corto**: «Atención: aquí se presentan 1,4 oferentes en promedio. Puede ser un nicho suyo … o un pliego escrito a la medida de otro. El dato no distingue las dos: revise requisitos y plazos…» (con la MISMA cifra y el mismo sustantivo que D-13).
- **Conciso**: `avisoCompetencia` (`public/app.js:1464-1475`, `UMBRAL_SENAL_11 = 2`, decide con el valor crudo; calla sin base; solo en viables, `:2180`). La afirmación «misma cifra y redondeo que la celda» era falsa: la celda redondea a entero (`Math.round`, `:2073`; `cuantosCompiten` `:1811-1821`) y el aviso a un decimal; reproducido 1,44 → «~1 empresa» frente a «1,4 oferentes», 1,96 → «~2» frente a «2 oferentes» bajo un aviso de «menos de 2». Se unifica cifra y sustantivo con D-13.
- **En qué beneficia**: P16 con las dos lecturas y qué hacer.
- **En qué afecta**: nada de servidor.
- **Fuente y certeza**: `competencia_entidad` · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Corregir la ficha. (2) Una presentación y un sustantivo (la celda pasa a un decimal, D-13), sin tocar el umbral. (3) Si se mantiene el decimal, 1,95-1,99 se dice «casi 2».
- **Tanda**: 5.

#### D-72 · Aviso rojo de cierre (2 días o menos)

- **Corto**: «Atención: Cierra HOY: solo cuenta la oferta en estado «Presentada»…» · «Cierra mañana: presente la oferta HOY…» · «Presente la oferta a más tardar mañana…».
- **Conciso**: `avisoCierre` (`public/app.js:1477-1485`) pinta solo a 0, 1 y 2 días, calla con `null` y negativos, solo en tarjetas viables (`:2181`); único insumo `diasParaCierre` (`:1427-1431`, `Number.isFinite` → `null`), el mismo que el chip (`:2137`, `:2173`).
- **En qué beneficia**: la regla del día anterior, visible cuando decide.
- **En qué afecta**: nada.
- **Fuente y certeza**: `fecha_cierre` · calculado.
- **Cuándo se calcula**: petición (al pintar).
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado.
- **Tanda**: 7 (verificación).

#### D-73 · Margen entre su piso y el techo de la entidad

- **Corto**: «Puede mover el precio $ X entre su precio mínimo (…) y el precio al que suele adjudicar esta entidad (…)» solo cuando el techo salió de la entidad; con `departamento_familia`: «… y el precio al que se suele adjudicar en su departamento en obras como esta (…)». La cifra del texto es ilustrativa.
- **Conciso**: `margenDe` (`listar.js:718-751`; `:708` ignorado sin credencial; `:895` solo con `?ordenar_por=margen`; `:1029` `margen_ignorado`); `lineaMargen` (`public/app.js:1051-1062`). Reproducido con `pisoTechoDeBorrador` real: sin borrador → motivo; base 3, 4 o `null` → `techo null`; base 8 con mediana 5 → piso 132.631.579, techo 142.500.000, margen 9.868.421; con `granularidad_utilizada = departamento_familia` el techo NO es `null` y la tarjeta diría «esta entidad» (cifra creíble atribuida a la entidad equivocada). `margenDe` descarta `baja_granularidad`, que `pisoTecho` sí publica (`lib/apu/piso_techo.js:221`); la cascada está en `lib/indice_baja.js:893-897`.
- **En qué beneficia**: quien ya costeó ve cuánto aire tiene.
- **En qué afecta**: nada nuevo de bytes.
- **Fuente y certeza**: `margen_estimado` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) `margen_estimado` lleva la granularidad del techo y `lineaMargen` dice «esta entidad» solo con `entidad`/`entidad_familia`. (2) «$ 20.000.000» del diseño es ejemplo, no medida.
- **Tanda**: 7.

#### D-74 · Encaja con su registro

- **Corto**: «Encaja con su registro ✓» · «Encaja por familia ~ (verifique el pliego)» · «No encaja con su registro ✗: el proceso pide el código 72101500 y su registro no lo tiene» (texto nuevo, sin la sigla) · chip de pertinencia aparte («Obra civil» · «Verificar objeto» · «No pertinente»).
- **Conciso**: `evaluarRup` (`lib/rup.js:92-145`; `:104-105` K sin dato deja pasar), `badgesRup` (`public/app.js:1579-1588`; textos `MATCH_UNSPSC` `:1563-1569`; plegado `:2190-2197`); por fila (`listar.js:852`). Con tier `ninguno`, `lib/unspsc.js:166-167` devuelve `codigo_proceso: null`, `codigo_rup: null` y el mensaje «Ninguna clase UNSPSC del proceso está inscrita en el RUP» (la sigla que la cerca prohíbe, `tests/e2e.js:13962`): la promesa «qué códigos le faltan» no la sostiene el dato hasta que `unspsc.js` devuelva el código del proceso también en tier `ninguno`. `ETIQUETA_TIPO.obra_civil` en `lib/filtros.js:317-321`. Los dingbats ✓ ✗ no cuentan como emoji (`tests/e2e.js:29739`).
- **En qué beneficia**: P2: qué código le falta.
- **En qué afecta**: nada de bytes.
- **Fuente y certeza**: `rup.tier`, `rup.unspsc`, `rup.pertinencia` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: con condiciones. (1) `unspsc.js` devuelve el código del proceso en tier `ninguno` y un texto sin la sigla. (2) Separar en la ficha el chip de encaje del chip de pertinencia.
- **Tanda**: 7.

#### D-75 · Cómo se adjudica en el departamento

- **Corto**: «Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos. En TOLIMA se gana sin bajar el precio: …» (plegado; «131» es ejemplo, no medido en este árbol).
- **Conciso**: `bajaDepartamentoDe` (`lib/indice_baja.js:988-1035`; `mensajeDepartamento` `:976-986`) fuera de la cascada que decide (`:893-897`); mínimo 5; `null` sin departamento; «sin dato» con el conteo; anulado sin credencial (`lib/publico.js:136`); `lineaBajaDepartamento` (`public/app.js:1377-1386`). Reproducido: sin índice → `null`; índice vacío → `{nivel: 'sin_dato', baja_mediana: null, procesos_contados: 0, …}`.
- **En qué beneficia**: contexto de precio cuando la entidad no tiene base.
- **En qué afecta**: nada; D-52 se le añade.
- **Fuente y certeza**: `baja_departamento` · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado (`docs/MEMORIA.md § «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)»`: se expone, no decide).
- **Tanda**: 7 (verificación).

#### D-76 · Activo · abierto

- **Corto**: «Activo · abierto».
- **Conciso**: bandera de interfaz `paaEncendido` (`public/app.js:690-695`): el chip (`:2171-2172`) se pinta en TODA tarjeta del listado activo mientras el toggle «Ver PAA» está encendido, repintando la última respuesta sin pedir nada (`:3502-3505`). La regla está decidida en `docs/MEMORIA.md § «Plan Anual de Adquisiciones · qué va a salir antes de que salga (ago 2026)»`.
- **En qué beneficia**: distingue lo publicado de lo planeado.
- **En qué afecta**: nada.
- **Fuente y certeza**: corpus activo de `/api/oportunidades` (bandera de interfaz) · publicado (hecho estructural).
- **Cuándo se calcula**: ninguno (repinta sin petición).
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones: corregir la ficha (no es un dato del PAA, ni medido, ni cuesta una petición); mantener la regla decidida.
- **Tanda**: 7 (corrección de ficha).

#### D-77 · Estado del proceso y «Ver en SECOP II ↗»

- **Corto**: «Publicado» · «Convocado» · «Ver en SECOP II ↗».
- **Conciso**: `estado_del_procedimiento` en la proyección (`lib/proyeccion.js:43`), pintado tal cual (`public/app.js:2209`); `urlproceso` aplanado en un solo sitio (`urlDeFila`, `lib/proyeccion.js:77-81`; `:92`); el enlace solo con `http(s)` (`urlSegura`, `app.js:47`, `:2214`). Reproducido: `{url:'https://…'}` → la URL; `'  '`, `{}`, sin campo → `null`.
- **En qué beneficia**: identifica el proceso y lleva a SECOP II en un clic.
- **En qué afecta**: nada.
- **Fuente y certeza**: `estado_del_procedimiento`, `urlproceso` · publicado.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado (la ficha decía `proyeccion.js:71-75`; es `:77-81`).
- **Tanda**: 7 (verificación).

#### D-79 · El modal de la entidad, lo de hoy

- **Corto**: banda → resumen → por año → «Movió la fecha de cierre en p de n» → «Suele tardar 7 días de oficina en adjudicar…» → desiertos → encogimiento → «Quién gana aquí» → proponentes → ejecución.
- **Conciso**: `pintarDetalle` (`public/app.js:3078-3118`); `:3042` (prórroga), `:3056-3061` (`htmlPlazoAdjudicacion`, sin dato bajo el mínimo), `:3070-3076` (`htmlDesiertos`), `:2969` («Quién gana aquí»), `:2858` y `:2893` (proponentes, ejecución); `lib/handlers/inteligencia/detalle.js:66` (`detalleEntidad`). D-07, D-32, D-51, D-52 y D-59 se añaden ahí.
- **En qué beneficia**: E5, E6, E7 en un solo sitio.
- **En qué afecta**: nada.
- **Fuente y certeza**: `detalleEntidad` · medido.
- **Cuándo se calcula**: clic.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado.
- **Tanda**: 3 (verificación).

### 4.4 Los nuevos

#### D-33 · Referencia del proceso

- **Corto**: «Referencia LP-008-2026» junto al título (sin referencia, nada). EJEMPLO.
- **Conciso**: `referencia_del_proceso` está en la proyección activa (`lib/proyeccion.js:40`), sobrevive a `sinAdjudicacion` y a `sinFinanzas` (`lib/publico.js:131-209`) y viaja en cada fila (`listar.js:851`). La TARJETA no la pinta (cabecera = `nombre_del_procedimiento || id_del_proceso`, `public/app.js:2148`); la pantalla «¿Dónde está mi proceso?» sí (`app.js:8465` ← `lib/rastreo.js:135`): la afirmación de los diseños «ningún `public/*.js` la pinta» solo vale para la tarjeta. Sin decisión de memoria (`node tests/mapa.js referencia_del_proceso` → sin aciertos).
- **En qué beneficia**: es el identificador con el que la entidad, el pliego y el correo nombran el proceso; así se busca en SECOP II y así se rotula la carpeta.
- **En qué afecta**: 25-30 B que ya viajan; ningún costo de servidor.
- **Fuente y certeza**: `referencia_del_proceso` · publicado.
- **Cuándo se calcula**: ninguno (solo se pinta).
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado. Requisitos: con `null` no se pinta nada (no caer al `id_del_proceso`, que ya está en la cabecera y es la clave de dedup, `lib/proyeccion.js:99`); texto «Referencia …», sin abreviatura.
- **Tanda**: 9.

#### D-34 · Plazo de obra

- **Corto**: «Plazo de obra: 8 meses» (arriba) · con unidad en días: «240 días de obra» (la conversión solo como «unos 8 meses») · «Plazo no publicado (la capacidad se calculó suponiendo un año)», esta coletilla solo cuando hay K en pantalla (con credencial).
- **Conciso**: `duracion` y `unidad_de_duracion` viajan (`lib/proyeccion.js:44`); hoy solo los enseña el expediente vía `guia.obra.plazo.legible` (`public/expediente.js:405` ← `lib/guia_proceso.js:219`, `:266`). La K de la tarjeta se calcula con 12 meses cuando falta la duración (`cargaK`, `lib/rup.js:79` → `plazoMesesDe`, `lib/capacidad.js:148-158`; reproducido `{}` → 12, `duracion: "0"` → 12, 240 días → 8). La guía ya publica `null` para esa ausencia y ya legibiliza la unidad («240 días»): se LLAMA esa regla (`unidadLegible` y el predicado de `:219`), no se escribe una tercera; el 12 nunca se enseña como plazo.
- **En qué beneficia**: la primera pregunta del flujo de caja y de la capacidad; hoy no se ve hasta guardar.
- **En qué afecta**: +30 B de texto; la nota sobre `duraci_n_del_contrato` de jbjy es NO VERIFICABLE aquí (la fila no ingiere jbjy).
- **Fuente y certeza**: `duracion`, `unidad_de_duracion` · publicado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Reutilizar el predicado de `guia_proceso.js:219` y `unidadLegible`; «0» y ausencia son la misma ausencia. (2) Con unidad en días decir días (publicado gana a convertido). (3) La coletilla solo con K en pantalla. (4) jbjy: no verificable.
- **Tanda**: 8.

#### D-35 · Ritmo mensual de la obra

- **Corto**: «Unos $796 M por mes de obra durante 8 meses» (plegado); con unidad en días, «durante 240 días».
- **Conciso**: `presupuestoOficialDe(l)` ÷ plazo publicado (el predicado de D-34). `cuantia_cop` lleva `|| 0` (`lib/negocio.js:207`, `:242-249`): sin precio el ritmo ingenuo da 0 (reproducido: `cuantia_cop = 0`, `presupuestoOficialDe = null`, ritmo ingenuo 0); `presupuestoOficialDe` ya está importada en `listar`. Reproducido con 8 meses: 795.732.961. Sin plazo publicado no se pinta (nunca sobre el 12 por defecto).
- **En qué beneficia**: el tamaño del compromiso mensual en unidades que quien empieza entiende y el experimentado compara con su capacidad.
- **En qué afecta**: es ritmo, no flujo de caja real: se dice «unos» y «de obra»; «$796 M» es redondeo de pantalla y no alimenta orden ni filtro.
- **Fuente y certeza**: `cuantia_cop` (vía `presupuestoOficialDe`), `duracion` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Numerador `presupuestoOficialDe(l)`. (2) Denominador = plazo publicado con el predicado de D-34. (3) Con días, «durante 240 días». (4) La cifra redondeada no decide nada.
- **Tanda**: 8.

#### D-36 · Días de oficina que le quedan, y cuándo presentar

- **Corto**: «Le quedan 21 días de oficina para armar la oferta · presente a más tardar el 13 de octubre».
- **Conciso**: `dias_oficina_restantes` con la MISMA cuenta que ya existe en `lib/manifestacion.js:246` y `lib/handlers/procesos/manifestacion.js:55` (`habilesEntre(hoy, f) + (esHabil(hoy) ? 1 : 0)`, la que pinta «Le quedan N días de oficina» en `public/calendario.js:220`), extraída a una función que ambos llamen; reproducido `habilesEntre('2026-09-14','2026-10-14') = 21`. Solo con `fecha_cierre` operable: `habilesEntre(hoy, null)` LANZA («festivos: año fuera de rango (2201)») y con 1970 devuelve 0 (`lib/habiles.js:61`, `:97`, `:133-139`; `fechaOperable('1970-…')` → `null`): en `op=listar` sería un 500 por fila o un «le quedan 0 días» falso. `presentar_el` = el día hábil anterior al cierre con suelo `hoy`, extraído de `lib/guia_proceso.js:449-452` para que guía y `listar` lo llamen (reproducido: 13-oct-2026; el 12-oct es festivo). «Días de oficina» es el término del glosario (`public/glosario.js:86`); «hábiles» no sale en pantalla (`tests/e2e.js:13082`).
- **En qué beneficia**: «¿me alcanza el tiempo?» y «cada fecha lleva su acción».
- **En qué afecta**: `habilesEntre` cuenta el día del cierre entero aunque cierre a las 15:00 («hasta el cierre»); sin fecha no se pinta nada (ni «0»).
- **Fuente y certeza**: `fecha_cierre`, `lib/habiles`, regla de la guía · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) `fechaOperable` antes; nunca llamar `habilesEntre` sin fecha; 1970/2202 → sin dato. (2) Una sola convención de conteo con `lib/manifestacion.js:246`. (3) `presentar_el` extraída con su suelo `hoy`. (4) Sin cierre, nada.
- **Tanda**: 9.

#### D-37 · Días de oficina que dio este proceso para ofertar

- **Corto**: «Da 30 días de oficina para ofertar (publicado el 1 de sep, cierra el 14 de oct)» (plegado; junto a D-50 cuando exista); si `l._cambios` trae un cambio de `fecha_cierre`: «(el cierre se movió; contado desde la publicación original)» o se calla.
- **Conciso**: `dias_oficina_dados = habilesEntre(fecha_de_publicacion_del, fecha_cierre)` (los dos viajan, `lib/proyeccion.js:43`, `:93-95`; reproducido 30, 29 con el 13-oct y 18 con otro par). Sin publicación `habilesEntre` devuelve 0 («Da 0 días», cero creíble) y con 1970 lanza: `fechaOperable` sobre las dos y sin alguna no se pinta. El cierre movido ya se sabe por fila (`lib/adendas.js:32`, `:61`; `listar.js:911`): no hay que esperar a D-54.
- **En qué beneficia**: la mitad de la señal #5 del pliego a la medida sin leer el pliego.
- **En qué afecta**: informativo y plegado; no entra en puertas ni en orden.
- **Fuente y certeza**: `fecha_de_publicacion_del`, `fecha_cierre` · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) `fechaOperable` sobre ambas; sin alguna, nada (jamás 0). (2) Rotular el cierre movido con `_cambios`. (3) Informativo.
- **Tanda**: 9.

#### D-38 · Cierre en fecha difícil

- **Corto**: «Cierra el día siguiente a un festivo: confirme la hora en el cronograma» · «Cierra en fechas de fin de año o Semana Santa: pocos días de oficina para preparar la oferta» (ámbar, informativo).
- **Conciso**: `fecha_cierre` operable contra `esFestivo(día anterior)` y contra Jueves/Viernes Santo y el 23 de diciembre, que es la señal #10 literal del manual (`docs/GUIA_ANALISTA_LICITACIONES.md § «Palanca 3 — Detección de pliegos direccionados (impacto: alto)»`: «apertura en fechas estratégicas: 23 de diciembre, Semana Santa, cierres puente»); la ventana «20 de diciembre – 10 de enero» de los diseños no aparece en ningún documento del árbol: si se quiere, se declara como heurística propia, no como el manual. Reproducido: `esFestivo('2026-10-12') = true`, `esHabil('2026-10-13') = true`; festivos dic-2026/ene-2027: 8-dic, 25-dic, 1-ene, 11-ene; `esFestivo('')` y `esFestivo(null)` LANZAN. Hoy no existe ninguna comprobación así sobre el cierre (`esFestivo`/`esHabil` solo en manifestación y guía).
- **En qué beneficia**: retirarse temprano de un calendario diseñado para que nadie llegue, o confirmar la hora.
- **En qué afecta**: puede coincidir con procesos legítimos: ámbar y «puede ser»; nunca bloquea.
- **Fuente y certeza**: `fecha_cierre`, `lib/habiles` (festivos y Semana Santa); señal #10 del manual · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Citar la señal #10 tal como está; una ventana de fin de año solo como heurística declarada. (2) `fechaOperable` antes de `esFestivo`/`esHabil`. (3) Ámbar; nunca entra en puertas.
- **Tanda**: 9.

#### D-39 · Cuánto tarda en adjudicar y cuántos declara desiertos

- **Corto**: «Adjudica en unos 7 días de oficina tras el cierre (la mitad de sus 8 procesos con las dos fechas) · Declaró desierto 1 de sus 9» (plegado) · «sin dato (hacen falta 5; hay 3)». EJEMPLO.
- **Conciso**: el hash ya publica los hechos (`hechosDeRegistro`, `lib/indice_competencia.js:479`) y el modal ya los pinta (`htmlPlazoAdjudicacion`, `htmlDesiertos`, `public/app.js:3050-3076`). La fila llama `hechosDeEntidad(indice, l)` (`:1210`), que YA se usa por fila desde el calendario (`lib/handlers/perfil/entrada.js:130-139`); reproducido: `competenciaDe` → 140 B sin plazo ni desiertos; `hechosDeEntidad` → `{plazo_adjudicacion: {base 8, mediana 7, p75 12}, desiertos: {n 1, base 9, pct 11}}` = 184 B; hash viejo → `{null, null}`; base 3 → mediana `null`, conteos viajan. NO se añade a `competenciaDe`: bajo 5 procesos con oferentes devuelve `SIN_DATO` congelado (`:1132`) y la memoria fija con cerradura que las entidades con desenlaces y 0 conteos siguen «sin dato».
- **En qué beneficia**: cuánto tarda la entidad en decidir es cuánto tarda su caja en saber si empieza; una entidad que declara desierto uno de cada tres avisa antes de gastar equipo.
- **En qué afecta**: +≈ 184 B por fila; «días de oficina» y frecuencias naturales (`tests/e2e.js:13082`); un hash anterior a M-DGF-08 da `{null, null}` y la tarjeta calla (se acepta, sin exigir reconstrucción). Estado del hash de producción: NO VERIFICABLE aquí.
- **Fuente y certeza**: `indice:competencia` vía `hechosDeEntidad` · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Llamar `hechosDeEntidad` por fila; no tocar `competenciaDe` ni su cerradura de «sin dato». (2) Reutilizar las dos funciones del modal. (3) Aceptar `{null, null}` con hash viejo.
- **Tanda**: 10.

#### D-40 · Cabe en el tope para empresas pequeñas, y con qué socia

- **Corto**: «Por su cuantía, la entidad puede reservar este proceso para empresas pequeñas ($511,7 M en 2026): con Génesis usted sigue cabiendo; con PRODIAC no. Confírmelo en el pliego.» (plegado; solo con cuantía menor que el umbral; no aparece en Purificación).
- **Conciso**: es `avisoMipyme` (`lib/socio_por_proceso.js:104-115`; `UMBRAL_MIPYME_2026 = 511708497`, `:48`, con fuente en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md § «V-12 · Umbrales y cifras de 2026»`; `NO_ES_MIPYME`, `:53`; tamaños publicados `lib/perfiles.js:86,121,156`: `helder` y `genesis` microempresa, `prodiac` gran empresa), que el expediente ya pinta (`public/expediente.js:455-459`). Reproducido: `avisoMipyme(PRODIAC, 400e6)` → aviso; con 0, con el umbral exacto, con Génesis o sin tamaño → `null`. La tarjeta la llama por fila solo con `socioAplica` (perfil del dueño con credencial, `listar.js:554`, `:935`), sin duplicar la comparación. Nunca «limitada»: el corpus no publica si la reservaron.
- **En qué beneficia**: por debajo del umbral, ir con Génesis deja abierta una convocatoria solo para empresas pequeñas; con PRODIAC la cierra: adjudicar más sin bajar el precio.
- **En qué afecta**: la regla de cuántas empresas pequeñas y cuándo (norma no leída) no se escribe; el umbral cambia cada año (revisar en enero); «$511,7 M» es redondeo de pantalla y la comparación usa la cifra exacta.
- **Fuente y certeza**: `cuantia_cop`, `UMBRAL_MIPYME_2026`, `tamanoEmpresa` (`avisoMipyme`) · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Llamar `avisoMipyme`/`socioPorProceso`. (2) Solo con `socioAplica`. (3) Texto sin «tope Mipyme» ni la condición del cálculo: el de arriba. (4) Redondeo solo en pantalla, cifra exacta con fecha.
- **Tanda**: 10.

#### D-41 · Capacidad comprometida si gana lo que marcó «me presenté»

- **Corto**: «Si gana todo lo que marcó «me presenté», compromete $9.200 M; en un contrato de ese tamaño hoy puede facturar $4.471 M: no le caben todas (2 sin cuantía publicada no se suman)» (cabecera de Mis procesos). EJEMPLO.
- **Conciso**: suma de `p2_k.crpc` de los guardados en «me presenté», calculada en `alertasDelPerfil` con `evaluarPuertas` por guardado y el perfil cargado (`contextoGuia`; medido 137 µs por fila; hoy la lista no calcula puertas: `lib/handlers/perfil/seguimiento.js:268-279`, `conGuia false`). «La K del perfil» no es una cifra: `lib/capacidad.js:106-136` mete `factorE` en la K y cada proceso tiene la suya (reproducido: 5.799 · 5.799 · 5.135 · 4.471 · 4.471 · 3.807 millones según el presupuesto), así que se compara con la K calculada con el presupuesto del guardado MÁS GRANDE (la más baja del conjunto) y se dice. Un guardado sin cuantía lleva `crpc 0` con `sin_dato` (`lib/puertas.js:170`) y se excluye declarándolo; los que ya no están en el corpus no tienen puertas. El «se asume 0» de los contratos en ejecución solo vale para `genesis`/`prodiac` (`helder` trae dos en `perfil.sce`). Censo: hoy solo existe el «valor comprometido» del COMPETIDOR (`lib/seguimiento.js:26-29`, `:529`).
- **En qué beneficia**: presentarse a más procesos sin prometer lo que la capacidad no permite firmar.
- **En qué afecta**: solo con credencial; solo guardados vivos y con cuantía; calculado sobre un techo; cerradura con mutación «contar “me interesa”».
- **Fuente y certeza**: guardados del perfil + `lib/puertas.p2K` (`crpc`) + `lib/capacidad.crp` con el presupuesto mayor · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Definir y decir qué K se compara. (2) Excluir `crpc 0` por cuantía no publicada y los guardados fuera del corpus, declarando cuántos. (3) Con K sin dato (`crp null`) no se pinta nada. (4) La frase del «se asume 0» no se afirma para `helder`. (5) Costo: `evaluarPuertas` por guardado presentado.
- **Tanda**: 11.

#### D-43 · Siguiente paso

- **Corto**: «Siguiente paso · 7 de octubre: pida la garantía de seriedad a su aseguradora · Guárdelo para el paso a paso completo ›».
- **Conciso**: el primer paso FECHADO DESPUÉS de hoy del paso a paso de la guía (`lib/guia_proceso.js:434-481`), extraído a `pasosDe({cierre, manif, modalidad, hoy})` que `guiaDe`, `listar` y el `proximoPaso` del expediente (`public/app.js:4267-4268`, que hoy tiene el mismo sesgo) LLAMAN; por fila `{cuando, titulo}` (97 B). La regla «primer paso con fecha ≥ hoy» de los diseños devuelve SIEMPRE «Lea primero las causales de rechazo…» porque ese paso se emite sin condición fechado hoy (`:434`) y el orden por fecha lo deja primero (reproducido el 13-sep, 1-oct, 9-oct, 14-oct y 15-oct): se salta. Con manifestación viva el chip ya lo dice (D-69): se omite y se declara. `guiaDe` entera cuesta 667 µs por fila (300 corridas; 261 µs sin perfil): la función extraída, una fracción. «Guárdelo…» es el botón Guardar (D-31).
- **En qué beneficia**: «¿cuándo hago cada cosa?» sin tener que guardar.
- **En qué afecta**: ≈ 2 KB por página; el paso genérico de lectura no se enseña; cerrado → «El proceso ya cerró».
- **Fuente y certeza**: `pasosDe` (guía), primer paso fechado después de hoy · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: con condiciones. (1) Saltar el paso de lectura: garantía → observaciones → presentar → cierre. (2) `pasosDe` conserva el orden estable por fecha (`:475-481`) y la llaman `guiaDe` y `listar`. (3) `proximoPaso` del expediente llama la misma función. (4) Con manifestación viva se omite y se declara.
- **Tanda**: 9.

#### D-44 · Le descontarán el 5 % de obra pública

- **Corto**: obra: «Le descontarán el 5 % de obra pública: ≈ $318 M sobre el presupuesto» (plegado) · suministro, servicios, «otra» o tipo desconocido: «Cuente con el 5 % de obra pública (≈ $318 M) salvo que el pliego lo excluya» · consultoría e interventoría: nada.
- **Conciso**: `CONTRIBUCION_PCT` (`lib/ganancia.js:111-118`, desde `lib/apu/calculo`) y `aplicaContribucion` (`:120-123`, `:136-138`: `TIPOS_SIN_CONTRIBUCION` = interventoría, consultoría; «un tipo que no esté en la lista SÍ la causa»); la guía ya la calcula (`lib/guia_proceso.js:80-94` cita Ley 418 de 1997 art. 120 y Ley 1738 de 2014 art. 8; `:501-502`, `:546`; reproducido 318.293.184). La ficha de los diseños («solo obra», «con tipo desconocido no se pinta») contradice la regla: reproducido `aplicaContribucion` → `true` para `null`, suministro, servicios y «otra», `false` solo para consultoría e interventoría. Añadir una condición propia recrearía la divergencia que la memoria del 13-sep acaba de retirar (sección citada en el veredicto). La norma no se releyó desde aquí.
- **En qué beneficia**: «el olvido más caro del país», antes de la primera acta.
- **En qué afecta**: solo consultoría e interventoría quedan fuera; sin cuantía no se pinta; la base real es su oferta («sobre el presupuesto»).
- **Fuente y certeza**: `lib/ganancia` (`CONTRIBUCION_PCT` + `aplicaContribucion`), ya usado por la guía · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: con condiciones. (1) Llamar la regla tal cual, sin condición «solo obra» (`docs/MEMORIA.md § «La contribución del 5 % se cobraba siempre, y la alerta invitaba a cobrarla dos veces (13-sep-2026)»`). (2) Redacción por tipo (arriba). (3) Sin cuantía, `null`. (4) Declarar la base y que la norma no fue releída.
- **Tanda**: 8.

#### D-45 · La obra cruza diciembre

- **Corto**: «La obra cruza diciembre: en enero suben el salario mínimo y los materiales (contado desde el cierre; con acta de inicio posterior cruza igual o más)» (plegado).
- **Conciso**: `obra.plazo.cruza_diciembre` (`lib/guia_proceso.js:266`, `:284-287`: cierre + `plazoMesesDe` × 30 días) y su consejo de reajuste (`:532-533`). Reproducido: `true` (6 meses desde el 15-oct), `false` (2 meses desde el 30-sep), `true` (90 días desde el 15-nov), `true` (14 meses), `null` sin plazo. El cálculo es inline en `guiaDe`: se extrae a una función que `guiaDe` y `listar` llamen.
- **En qué beneficia**: un costo que quien empieza no ve hasta que le sube la nómina.
- **En qué afecta**: sin plazo publicado no se pinta; optimista (el cierre no es el acta) y se dice.
- **Fuente y certeza**: guía (`cruza_diciembre`) · calculado.
- **Cuándo se calcula**: petición.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: confirmado. Requisitos: extraer, no copiar; decir «contado desde el cierre»; reutilizar la redacción del consejo (`:533`).
- **Tanda**: 8.

#### D-46 · Qué significa esa modalidad, en llano

- **Corto**: «Licitación pública: el proceso grande; el método de puntuar el precio se sortea» (plegado; explicación completa en el expediente).
- **Conciso**: `modalidadEnLlano` (`lib/guia_proceso.js:121-160`, exportada en `:694`) ya redacta las siete modalidades y el expediente ya la enseña (`public/app.js:4238`, `public/expediente.js:398-407`). `listar` publica UNA VEZ por respuesta un diccionario por clave con solo la explicación; la fila lleva clave + literal publicado (D-23), porque la clave `otra` funde literales distintos («Contratación directa», etc.) cuyo nombre es el de la fila. Medido: el diccionario con nombre pesa 2.101 B (no «≈ 1 KB»); sin nombre, menos. La explicación de menor cuantía nombra el techo legal como máximo, no como plazo: se conserva tal cual.
- **En qué beneficia**: «Selección abreviada de menor cuantía» no le dice a quien empieza que hay que avisar antes; la explicación sí.
- **En qué afecta**: ≈ 2 KB por respuesta; una sola redacción.
- **Fuente y certeza**: `modalidad_de_contratacion` (publicado) + `modalidadEnLlano` (redacción de la aplicación, rotulada así).
- **Cuándo se calcula**: petición.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: con condiciones. (1) Diccionario por clave con solo la explicación; la fila lleva clave + literal. (2) Llamar `modalidadEnLlano`. (3) Rotular la explicación como de la aplicación. (4) Conservar «máximo, no plazo».
- **Tanda**: 8.

#### D-47 · Su historial con esta entidad

- **Corto**: «Ya se presentó aquí 2 veces y ganó 1 (según lo que marcó en Mis procesos)» (plegado; con 0 guardados de esa entidad no se pinta nada).
- **Conciso**: guardados del perfil agrupados por `claveCanonica` del nombre (`lib/indice_competencia`), nunca por NIT (los NIT se comparten entre regionales: `docs/MEMORIA.md § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)»`); `desenlaceDe` (`lib/seguimiento.js:301-306`: presentado y descartado → `null`, ganado → `true`, perdido → `false`); la foto guarda `entidad` y `nit_entidad` («No Definido» → `null`, `:310-335`). «Se presentó N veces» = presentado + ganado + perdido; «ganó» = ganado. La ruta de los diseños era errónea: `cargarCostosPorProceso` (`lib/baja_maxima.js:38-46`) lee borradores de APU, no guardados; `listar` no lee hoy `seguimiento:{perfil}` (`lib/handlers/perfil/seguimiento.js:47`) y `leerGuardados` no está exportado (`:690-697`): hace falta UN `GET` nuevo de Redis, solo con credencial y best-effort (si falla, sin dato; la lista sirve igual). No se mezcla con la ficha del competidor (`:516-523`).
- **En qué beneficia**: dónde ya tiene pie y dónde ya perdió: el postmortem por entidad sin hoja de cálculo.
- **En qué afecta**: 30-40 B donde aplica; un desenlace sin marcar no cuenta como derrota; un `GET` más por petición con credencial.
- **Fuente y certeza**: guardados del perfil · medido.
- **Cuándo se calcula**: petición (un `GET` adicional, solo con credencial).
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Agrupar por `claveCanonica`. (2) Un `GET` de `seguimiento:{perfil}` en `listar`, fallo → sin dato. (3) Definiciones de «se presentó» y «ganó»; con 0 no se pinta. (4) «Según lo que marcó en Mis procesos».
- **Tanda**: 10.

#### D-48 · Con quién ha ganado

- **Corto**: «Presentadas 12 · ganadas 3 (en 2 el consejo guardado decía Génesis; en 1, ir solo) · 4 sin resultado todavía» (Mis procesos). EJEMPLO.
- **Conciso**: el socio congelado existe y viaja (`enriquecer` del seguimiento, `lib/seguimiento.js:461-467`) pero solo para el dueño: `congelarSocio` devuelve `null` para cualquier otro perfil (`lib/handlers/perfil/seguimiento.js:168-181`, `:173-174`; se llama solo al crear, `:491`, `:531`). `recomendacion.socio` solo aparece con `con_socio` (`lib/socio_por_proceso.js:320`, `:331`, `:400-406`); «solo» y «ninguna_sirve» no lo traen; los guardados anteriores al 11-sep viajan con `socio null` → cubeta «sin consejo guardado», nunca «solo». La regla de 3 presentadas y `por_estado` ya existen (`public/app.js:4316-4338`; handler `:290-294`): se llaman; el agrupado se calcula en el servidor antes de `aLigero`, que quita `socio` (`lib/seguimiento.js:497-504`). Nombre corto desde una tabla declarada (`nombreCorto`, D-01), no del campo `nombre` («Génesis Ingeniería y Construcción GIC SAS»).
- **En qué beneficia**: la respuesta real a «¿con quién gano más?», acumulada sin trabajo.
- **En qué afecta**: solo el perfil del dueño; mínimo 3 presentadas; los guardados sin consejo se declaran aparte; el consejo puede diferir del consorcio real y se dice.
- **Fuente y certeza**: expedientes guardados (`socio.recomendacion` congelado + estado) · medido.
- **Cuándo se calcula**: petición.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Solo el perfil del dueño; sin datos no se pinta. (2) Agrupar por `recomendacion.tipo` y, dentro de `con_socio`, por socio; `socio null` → «sin consejo guardado». (3) «Presentadas» = ganado + perdido + presentado, mínimo 3, antes de `aLigero`. (4) Decir que se cuenta el consejo del día en que guardó.
- **Tanda**: 11.

#### D-49 · Lo que cuesta presentarse (expediente)

- **Corto**: «Garantía de seriedad: hasta $637 M asegurados (10 % del presupuesto; el pliego fija la base) · Contribución de obra pública 5 %: $318 M (solo obra) · Plata suya antes del primer pago: cerca de $1.273 M (estimado)».
- **Conciso**: `guiaDe(...).dinero` (`lib/guia_proceso.js:544-551`; constantes `:95-96`; reproducido 636.586.369 / 318.293.184 / 1.273.172.737) ya pintado en `public/app.js:4228-4230`; la tarjeta solo ENLAZA (Guardar). DEFECTO reproducido, arreglar antes de enlazar: `tipoTrabajo` solo se resuelve `if (completa && perfilObj)` (`:225-238`) y `aplicaContribucion(null)` es `true`, así que sin perfil o solo con la foto (sin fila viva) la guía cobra el 5 % a una interventoría (reproducido: interventoría sin perfil → 318.293.184; con perfil y fila viva → `null`; con perfil y SOLO FOTO → 318.293.184). Desmiente lo que la memoria del 3-sep afirma («interventoría y consultoría no la llevan») y es hermano no barrido del defecto del 13-sep. `tipoTrabajoDe(l, null)` ya decide por `tipo_de_contrato`/objeto (`lib/filtros_lista.js:119-131`). La base de la garantía (presupuesto en la guía `:95`, oferta en `lib/dictamen.js:338-339`) queda como par abierto de D-64.
- **En qué beneficia**: el costo que no está en el APU, antes de decidir.
- **En qué afecta**: arreglo previo en `guiaDe`; la financiación se rotula «estimado» (supuesto del 20 %).
- **Fuente y certeza**: guía · calculado.
- **Cuándo se calcula**: clic.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Resolver `tipoTrabajo` también sin perfil y sin fila viva (o dejar la contribución `null` con motivo), con una cerradura con foto de interventoría que hoy FALLA. (2) El corto de arriba. (3) La base de la garantía queda para D-64: no afirmar «10 %» a secas. (4) Solo enlazar desde la tarjeta.
- **Tanda**: 8.

#### D-50 · Lo que esta entidad suele dar para ofertar

- **Corto**: «Esta entidad suele dar 21 días de oficina para ofertar (la mitad de sus 12 procesos, ese plazo o más); este proceso da 9» (plegado, junto a D-37); en el plegado se dice que una adenda que movió el cierre no se ve. EJEMPLO.
- **Conciso**: en `acumularHechos` (`lib/indice_competencia.js:435-448`), por entidad, histograma de `habilesEntre(publicación, cierre)` leído con `diaCierreDe` (`:580-586`) y con la forma `{dias, motivo}` de `plazoAdjudicacionDe` (`:422-433`: `sin_fecha_publicacion`, `sin_fecha_cierre`, `no_posterior`), descartando la ausencia ANTES: `habilesEntre(null, x)` devuelve 0 y con «basura» u orden invertido también 0 (reproducido), y sin guarda un proceso sin publicación entraría como «0 días» y hundiría la mediana. Se publica con el mismo `percentilHistograma` (`lib/indice_baja.js:1058-1067`; reproducido `{21:3, 9:2, 30:1}, 6, 0.5` → 21) y el mismo `MIN_PROCESOS` que el plazo de adjudicación (`:455-467`); campo `dias_oficina_suele_dar`; `hechosDeRegistro` devuelve `null` en hashes anteriores al campo. «Este proceso da 9» es cálculo nuevo por fila (D-37): sin publicación, sin dato, no 0. Censo hoy: 0 (`node tests/mapa.js dias_oficina` → sin aciertos).
- **En qué beneficia**: la señal de plazo mínimo con base propia de la entidad.
- **En qué afecta**: exige reconstruir el índice; frescura mensual declarada; +≈ 60 B por fila; ámbar.
- **Fuente y certeza**: histórico p6dx (índice de competencia) · medido.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Descartar la ausencia antes de `habilesEntre`, con la forma `{dias, motivo}` y descartes contados en la meta; cerradura que falle con una fila sin publicación. (2) `diaCierreDe` + el mismo `percentilHistograma`/`MIN_PROCESOS`; `null` en hashes viejos. (3) «Este proceso da N» por fila, sin dato sin publicación. (4) El corto con su base.
- **Tanda**: 12.

#### D-51 · Ganadores locales frente a foráneos

- **Corto**: «7 de cada 10 ganadores aquí tienen domicilio registrado en Tolima (de 12 adjudicaciones con domicilio publicado)» (modal de la entidad; plegado en la tarjeta cuando ese departamento es el de la base del dueño). EJEMPLO.
- **Conciso**: `departamento_proveedor` se guarda en el histórico (`lib/indice_competencia.js:125`, `CAMPOS_ADJUDICACION`; proyección histórica reproducida: conserva `departamento_proveedor` y `departamento_entidad`) y nadie la lee (`grep -rn departamento_proveedor lib public api` → solo esa lista). En el barrido, por entidad, proporción de adjudicados con `Filtros.departamento(departamento_proveedor) === Filtros.departamento(departamento_entidad)` (`public/filtros.js:121-128`, acepta nombre o código; `lib/filtros_lista.js:155-156` ya lo usa para `departamento_entidad`), mínimo 5 sobre adjudicados con ambos departamentos legibles; «No Definido» y vacío quedan fuera de la base y se cuentan aparte (`docs/MEMORIA.md § «Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)»`: «No Definido» es sin dato). Cobertura de `departamento_proveedor`: medir con `censarColumnasHistoricas` (`lib/columnas_historicas.js:324`) antes de enseñar; formato y cobertura reales NO VERIFICABLES aquí.
- **En qué beneficia**: si una alcaldía contrata con los de su zona; para Helder (Ibagué), dónde juega de local.
- **En qué afecta**: domicilio REGISTRADO, no sede real; reconstruir el índice; ~20 B en el registro.
- **Fuente y certeza**: histórico p6dx · medido.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Normalizar los dos lados con `Filtros.departamento` y comparar códigos. (2) «No Definido»/vacío fuera de la base; mínimo 5. (3) Cobertura medida antes de enseñar. (4) El corto de arriba.
- **Tanda**: 12.

#### D-52 · Se adjudicó por el presupuesto oficial en X de N

- **Corto**: «Aquí 9 de sus 12 procesos con cifras se adjudicaron por el presupuesto oficial» (entidad; modal y plegado) · sin base de la entidad: «En Tolima, 131 de 131 con cifras (dato por confirmar: todos iguales)» (junto a D-75). EJEMPLO.
- **Conciso**: el acumulador SÍ tiene la cubeta 0 por entidad y por departamento (`g.hist[0]`, `lib/indice_baja.js:244-246`, `:350`), pero `registroPublicado` (`:391-445`) no conserva `hist` ni ningún conteo de cero: exige publicar `{al_oficial_n, base}` por grupo y reconstruir el índice de baja (lo «no verificado» de los diseños queda verificado en negativo). La cubeta 0 es `Math.round(baja) === 0` (±0,5 %), no «el presupuesto completo»: se cuenta la igualdad exacta (`baja === 0` en `bajaDeFila`) o se dice «prácticamente por el presupuesto». N son procesos con ambas cifras dentro de la banda de higiene (`:20-27`), no «contratos». Un 100 % con base grande es la alarma que la propia cabecera documenta (`:39-41`: `valor_total_adjudicacion` copiando a `precio_base`): se enseña como dato por confirmar (mirar `baja_exactamente_cero` en la meta), no como hecho. `bajaDepartamentoDe` solo enseña, no decide (`:17-19`, `:990-1030`). El índice se reconstruye en `sync.js:72` e `historico.js:70`.
- **En qué beneficia**: «¿tengo que bajar?» con la respuesta más simple; «sin bajar el precio» con su cuenta.
- **En qué afecta**: exige reconstruir el índice de baja (verificado); base y redondeo declarados.
- **Fuente y certeza**: `indice:baja` · medido.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Publicar `{al_oficial_n, base}` por grupo; `null` en hashes viejos (nunca 0); reconstruir. (2) Igualdad exacta o «prácticamente». (3) Base real («de sus N procesos con presupuesto y valor adjudicado»); entidad con base ≥ 5 gana, departamento solo lectura. (4) 100 % con base grande = dato por confirmar.
- **Tanda**: 12.

#### D-53 · Gana sobre todo en <departamento> (perfil del competidor)

- **Corto**: «Gana sobre todo en Tolima: 4 de sus 6 entidades (11 de sus 15 adjudicaciones)». EJEMPLO.
- **Conciso**: el acumulador por entidad del detalle (`lib/competencia_detalle.js:573-600`, hoy `{entidad, ganados, valor, con_valor, ultima}` sin departamento: `grep departamento lib/competencia_detalle.js` → 0) —o el del índice inverso de D-03— guarda `Filtros.departamento(departamento_entidad)` (ya en la fila histórica, reproducido) y el modal agrupa `entidades[]` (`:672-681`; columnas del modal en `public/app.js:3362-3376`) por departamento; «No Definido» aparte; «adjudicaciones», no «contratos». Se reserva el campo desde la construcción del hash en la tanda 2 para no barrer dos veces. Sujeto a las condiciones de D-03 (barrido reanudable; `refrescar=1` fuerza el barrido). Peso por entidad: NO VERIFICABLE sin corpus.
- **En qué beneficia**: si el rival es local o foráneo y en qué departamentos no compite con el dueño.
- **En qué afecta**: depende de D-03; departamento = sede de la entidad, no la obra.
- **Fuente y certeza**: `indice:adjudicatario` + `departamento_entidad` · publicado.
- **Cuándo se calcula**: sync.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Reservar `departamento` en el acumulador de D-03 desde la tanda 2, normalizado y `null` si «No Definido». (2) Declarar la base. (3) El corto de arriba. (4) Sujeto a D-03.
- **Tanda**: 2 (reserva del campo) y 12 (agrupado en el modal).

#### D-54 · Republicado desde su publicación

- **Corto**: «Republicado el 3 de septiembre (puede ser una adenda o una publicación de fase: mire el proceso en SECOP II)» (plegado). EJEMPLO.
- **Conciso**: `fecha_de_ultima_publicaci` (cobertura 100 % en el censo del 16-ago, `docs/datos.md §6`) se descarta en las dos proyecciones (`lib/proyeccion.js:38-61`; reproducido `undefined` en activa e histórica). Los «tres consumidores ya escritos» (`lib/dictamen.js:404`, `lib/cronograma.js:91`, `lib/manifestacion.js:134`) solo la usan como RESPALDO de `fecha_de_publicacion_del` (`publicación || última`): el lector «republicado» es NUEVO: republicado solo si día(última) > día(publicación); igual → nada; ausente → sin dato (no «no republicado»). Entra en `CAMPOS` + extracción completa (`transformar` → `proyectar` en full y delta, `lib/handlers/procesos/sync.js:326`; no exige reconstruir el corpus, precedente de `docs/MEMORIA.md § «El corpus conserva la llave de cruce `id_del_portafolio` · M-DGF-05 (6-sep-2026)»`, pero los registros anteriores a la full no la traen); cobertura medida con `censarColumnasHistoricas` antes de enseñar.
- **En qué beneficia**: la señal de «algo cambió» sin leer el pliego (complementa D-22).
- **En qué afecta**: NO se afirma «adenda»; lector nuevo; `e2u2-swiw` sería mejor fuente tras la sonda. Se documenta que los tres respaldos usarían la republicación como publicación si `fecha_de_publicacion_del` faltara (hoy 100 %: inerte).
- **Fuente y certeza**: p6dx `fecha_de_ultima_publicaci` · publicado.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Escribir el lector con esa regla. (2) `CAMPOS` + full + cobertura medida. (3) El corto de arriba. (4) Documentar el respaldo.
- **Tanda**: 13.

#### D-55 · Proceso por lotes

- **Corto**: «Proceso por lotes (3): el pliego dice si puede ofertar a un solo lote y cuánto vale cada uno; las cifras de esta tarjeta son del total» (plegado). EJEMPLO.
- **Conciso**: `numero_de_lotes` llega solo al histórico (`lib/indice_competencia.js:126`; reproducido: activa `undefined`, histórica `3`) y nadie lo lee (`grep -rn numero_de_lotes lib public api` → solo la lista; sin decisión de memoria). Entra en `CAMPOS` + full; cobertura y el valor «sin lotes» (¿0, 1, vacío?) se miden con `censarColumnasHistoricas` antes de pintar; ausente = sin dato, nunca 0. «Puede presentarse a uno solo» no tiene fuente en el árbol ni en el manual (`grep -i lote` en la Guía y el Complemento → 0): lo fija cada pliego y se quita del texto. El vínculo con `desierto_con_adjudicacion` (`:225-229`) y «lotes parciales» (`lib/indice_baja.js:23-26`) son comentarios, no medidas: no se presentan como hecho.
- **En qué beneficia**: tres lotes son tres oportunidades con una oferta; para una empresa pequeña, un lote dentro de un total grande es poder o no poder.
- **En qué afecta**: cobertura y valor «sin lotes» sin medir; sin dato por lote las puertas miden la suma (cota superior) y lo dicen.
- **Fuente y certeza**: p6dx `numero_de_lotes` · publicado.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Medir cobertura y valor «sin lotes» antes de pintar. (2) Quitar «puede presentarse a uno solo». (3) Las puertas evalúan la suma y lo dicen. (4) No afirmar la explicación de los desenlaces hasta medirla.
- **Tanda**: 13.

#### D-56 · Qué documentos tipo probablemente rigen

- **Corto**: «Probablemente rigen los documentos tipo de infraestructura social vigentes desde febrero de 2026 (la fecha que manda es la del aviso de convocatoria: confírmelo ahí)» (plegado; solo con sector inequívoco).
- **Conciso**: la cita es `NORMAS_CITABLES.dt_social_2026` (`lib/dictamen.js:289`, `:311-313`: Resoluciones 539, 540, 541, 952 y 953 de 2025, «aviso desde el 16 de febrero de 2026», `literal_leido: false`; transporte en `lib/formulario1.js:87`). NO existe clasificador de sector (`grep -rni "infraestructura social" lib public` → solo la cita; `tipoTrabajoDe` distingue obra/interventoría/consultoría, `lib/filtros_lista.js:119-131`; `familiaDe`, `lib/indice_baja.js:204-210`, depende de un UNSPSC que en producción no traía ninguna fila histórica): regla declarada (familias UNSPSC + palabras del objeto) con cobertura medida, y ante la duda nada. `fecha_de_publicacion_del` no es la fecha del aviso de convocatoria: en la frontera de febrero de 2026 no se dice. «Distingue un pliego desactualizado» es del dictamen (lee el pliego), no de la fila. Censo hoy: 0.
- **En qué beneficia**: dice qué fórmula de experiencia aplica.
- **En qué afecta**: riesgo de sector mal deducido; la resolución no se leyó desde aquí (NO VERIFICABLE).
- **Fuente y certeza**: campos publicados + norma citada en el árbol · estimado.
- **Cuándo se calcula**: petición.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Solo con sector deducido por regla declarada y cobertura medida. (2) Margen en la frontera de febrero. (3) El corto de arriba. (4) Llamar `NORMAS_CITABLES`; no prometer lo del dictamen.
- **Tanda**: 14.

#### D-57 · Contratos registrados de cada socia

- **Corto**: «Génesis tiene registrados 14 contratos de pavimentación por $9.800 millones · PRODIAC: contratos sin cargar» (expediente). EJEMPLO.
- **Conciso**: `POST /api/admin?op=experiencia` valida y guarda contratos (`lib/experiencia.js:251`, `guardarExperiencia(redis, contratos)` sin perfil) en UNA clave sin perfil (`config:experiencia`, `lib/almacen.js:180`): hacerla por perfil (`config:experiencia:{perfil}`, firma con perfil) ANTES de cargar dos socias, o la de una tapa a la otra. Los 106 de Génesis existen en el árbol (`experiencia_genesis_106.json`: `contratos.length === 106`, claves `no_contrato, entidad, objeto, modalidad, participacion, valor_cop, valor_smmlv, fecha_inicio, fecha_fin`, sin año de RUP); los «327» de PRODIAC son el CONTEO de registros del certificado (`contratosRup: 327`, `lib/perfiles.js:160`), no un archivo: `ls *.json` → solo el de Génesis. El conteo por socia ya se enseña («contratos acreditados», `lib/handlers/perfil/pulso.js:57`, `public/pulso.js:636`, `public/empresa_libro.js:78`): lo nuevo es objeto y valor por contrato y por perfil, clasificados con `tokenizar`/`similitud` de `lib/experiencia.js` (hoy solo los usa `lib/cobertura_rup.js`), no con una regex nueva. No se dice «acredita»: la aplicación no comprueba que el contrato cumpla lo que el pliego exige. Carga en producción NO VERIFICABLE desde aquí: comprobar con `https://portafolio-estrategico.vercel.app/api/admin?op=experiencia&token=<su token>` antes de prometer la cifra.
- **En qué beneficia**: elegir la socia que tiene los contratos del tipo que pide el pliego y darle el porcentaje que el pliego exige.
- **En qué afecta**: sin archivo de PRODIAC, «sin cargar» (nunca 0); hermano: `resumenPerfiles` omite `prodiac` (`lib/handlers/admin/rup.js:78-92`).
- **Fuente y certeza**: `config:experiencia:{perfil}` (por crear) + `contratosRup` de `lib/perfiles.js` · publicado.
- **Cuándo se calcula**: clic.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Clave y firma por perfil antes de cargar dos socias. (2) Archivo de PRODIAC: no existe; hasta entonces «sin cargar». (3) Clasificar con `tokenizar`/`similitud`. (4) Quitar «acredita» y «(RUP 2023)». (5) Comprobar la carga en producción.
- **Tanda**: 15.

#### D-58 · Lo que el pliego pide en consorcio

- **Corto**: «El pliego limita la convocatoria a empresas pequeñas (pág. 12)» · «Exige al menos el 40 % a quien aporte la experiencia (pág. 31)» · «Máximo 3 integrantes» (expediente, con página). EJEMPLO.
- **Conciso**: `detectar()` (`lib/dictamen_reglas.js`) no reconoce «convocatoria limitada», «integrante» ni «proponente plural» (reproducido: un texto con las tres cláusulas → `{}`; en `lib/` solo `lib/socio_por_proceso.js:45-118` y `NOTA_PLURAL`, `lib/dictamen.js:257`). Tres detectores nuevos con evidencia y página; los Documentos Tipo traen siempre la sección «Convocatoria limitada a Mipyme» que a menudo dice «no aplica»: los detectores excluyen la negación y el «no aplica» de plantilla (lección de `SIN_ANTICIPO_RE`, `lib/dictamen_reglas.js:85`; `excluye` de plantilla `:53-56`), con mutación que falle contra el árbol anterior; el 40 % se lee junto a su concepto (patrón `porcentajeJuntoA` de `lib/deducciones.js`), no como el primer % de la línea; sube `REGLAS_VERSION` (`:33`) para recalcular los hechos guardados. `avisoMipyme` (`lib/socio_por_proceso.js:104-118`) pasa de riesgo a hecho llamándola; `repartoSugerido` (`PARTE_SI_APORTA_EXPERIENCIA` = 40; `lib/consorcio.js:56`, `ADVERTENCIA_PARTICIPACION_MINIMA`) toma la cifra del pliego. Vocabulario: «empresas pequeñas» (`grep -i mipyme public/` → 0).
- **En qué beneficia**: «con quién» deja de ser una estimación en los procesos con pliego leído.
- **En qué afecta**: solo con pliego; sin pliego `sin_dato`; una regex que no casa deja «por leer», nunca «no lo exige»; «no aplica» es «no la limita».
- **Fuente y certeza**: texto del pliego (`op=dictamen`) · publicado.
- **Cuándo se calcula**: clic.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Excluir negación y «no aplica», con mutación. (2) Porcentaje junto a su concepto. (3) Subir `REGLAS_VERSION`. (4) Llamar `avisoMipyme`; sin pliego `sin_dato`; regex que no casa → «por leer». (5) «Empresas pequeñas».
- **Tanda**: 14.

#### D-59 · Estampillas y descuentos vistos en pliegos de esta entidad

- **Corto**: «Estampillas vistas en pliegos de esta entidad: 1,5 % (2 procesos, el último el 3 de sep)» (modal de la entidad y plegado); con cifras distintas entre pliegos, rango o por concepto, nunca una sola cifra; «puede sumar regionales hermanas». EJEMPLO.
- **Conciso**: `leerDeducciones` (`lib/deducciones.js`) ya extrae concepto, porcentaje, evidencia y página (reproducido: 1,5 % y 1 %; sin texto → `null`) y los hechos del proceso ya guardan `deducciones` (`lib/documentos_proceso.js:289`, `:393-394`) POR PROCESO y sin fecha (`leido_el` solo en `claveDoc`, `lib/handlers/pliego/documentos.js:188`; clave por proceso `:55-57`): no existe ningún acumulador por entidad (`grep -n estampilla lib/handlers public/` → solo el editor de Precios). Se construye: entidad por `nit_entidad` + nombre (`lib/proyeccion.js:41`), entradas `{concepto, pct, fecha, id_proceso}`, deduplicadas por `id_proceso` (varias versiones del mismo pliego no son varios pliegos: `MAX_PLIEGOS_PLAN`), escrito al leer los documentos y leído en el modal («Historial de la entidad», `public/app.js:927`, `:3456`). Observación con fecha, no tarifa («No hay tabla nacional que copiar», `lib/deducciones.js:12-16`).
- **En qué beneficia**: el costo oculto que más margen se come, con base y fecha; la tabla se construye sola.
- **En qué afecta**: solo entidades con pliegos leídos; «lo que descontó en otros procesos», jamás «lo que le van a descontar»; el NIT de entidad puede sumar regionales (`lib/handlers/perfil/seguimiento.js:393`); enlazar a Precios sigue APARCADO (`docs/MEMORIA.md § «Lo APARCADO por decisión del dueño (20-ago-2026)»`).
- **Fuente y certeza**: pliegos leídos (`lib/deducciones`) + acumulador por entidad (por crear) · medido.
- **Cuándo se calcula**: clic (la escritura ocurre al leer los documentos).
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Construir el acumulador. (2) Deduplicar por `id_proceso`. (3) Guardar la fecha real de lectura. (4) Rango o por concepto si difieren; declarar las regionales. (5) Llamar `leerDeducciones`; Precios sigue aparcado.
- **Tanda**: 14.

#### D-60 · Capacidad de verdad: los contratos en ejecución desde SECOP II

- **Corto**: «Cuánto puede facturar hoy: $2.571 millones, descontando sus 2 contratos en ejecución ($1.900 millones por ejecutar, calculado desde SECOP II el 13 de sep)» · «…, sin descontar contratos en ejecución: no hay ninguno registrado» (Mi empresa y el renglón de P2). EJEMPLO coherente: descontar baja la cifra; $4.471 M es la K sin descontar.
- **Conciso**: `calcSCE` sin lista devuelve 0 con advertencia SOLO en los registros del servidor (reproducido con `[]`, `null` y `undefined`; `grep "en ejecución" public/app.js` → 0: la advertencia no llega a pantalla) y tiene un hermano: `(c.v || 0)` (`lib/capacidad.js:73-83`, `:81`) convierte un valor ilegible en CERO y un contrato sin `plazoMeses` cuenta el saldo entero (reproducido). Las reglas que hay que llamar existen: la consulta a jbjy con los estados vigentes («En ejecución», «Modificado», «Suspendido», «Prorrogado») por `documento_proveedor` y `resumirVigentes` (`lib/handlers/perfil/seguimiento.js:62-66`, `:370-380`), `consultarContratos` (`lib/socio.js:275-331`), `validarSce` para el certificado a mano (`lib/config_rup.js:150-160`). jbjy da el valor del CONTRATO sin la participación del perfil: sobrestima el SCE y subestima la K (falso negativo, el caro): se declara desconocida y se permite excluir el contrato. El SCE consultado se guarda por perfil con fecha (config) y `op=listar` solo LEE: la consulta externa no puede ir en la ruta de una petición. Saldo ≈ valor × meses restantes / plazo porque `valor_pagado` es sin dato para media Colombia (`lib/ejecucion.js:18`). NIT de los tres perfiles (`lib/perfiles.js:83,120,155`, con dígito de verificación); el cruce con «901096271-1» no está verificado (`nitONull`/`digitos`). Fuente externa 403 desde aquí: NO VERIFICABLE.
- **En qué beneficia**: la cifra que decide el tamaño de contrato deja de ser una «creíble optimista».
- **En qué afecta**: fuente externa con caché y fecha; un contrato mal cerrado en SECOP o plural sin participación resta capacidad que sí existe: se lista y se puede excluir a mano; sin consulta, «sin descontar contratos en ejecución» en pantalla, nunca 0 mudo.
- **Fuente y certeza**: `jbjy-vk9h` por NIT (guardado por perfil) + `sce` a mano (`config_rup.validarSce`) · calculado.
- **Cuándo se calcula**: externo (consulta) · petición (lectura del guardado).
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Arreglar `c.v || 0`: valor ilegible → contrato «sin valor», excluido con aviso; sin plazo no contar el saldo entero en silencio. (2) Participación en plurales desconocida y excluible. (3) SCE guardado por perfil con fecha; `op=listar` lo lee. (4) Reutilizar `resumirVigentes`/`consultarContratos` y el formato de NIT. (5) El certificado a mano gana; la advertencia llega a pantalla. (6) Ejemplo coherente.
- **Tanda**: 16.

#### D-61 · Cara a cara: cuántas veces se presentó ante esta entidad y cuántas ganó (competidor)

- **Corto**: «Ante esta entidad: se presentó 9 veces y ganó 6» (modal del competidor, segundo paso; dos hechos, sin cociente ni porcentaje). EJEMPLO.
- **Conciso**: el dato YA EXISTE en pantalla: `veces_presentado` y `veces_ganado` de `fichaCompetidor` (`lib/seguimiento.js`) se enseñan en la tabla de competidores de Mis procesos (`public/app.js:4549-4550`, columnas separadas, sin división), servidos por `op=seguimiento&detalle` (`lib/handlers/perfil/seguimiento.js:640-651`, caché `TTL_DETALLE_SEG` 3600 solo `if (det.ok)`; `:44` tope 6000 ms; `:352` la consulta «veces» sin filtro de fecha). «Desde 2025» no lo sostiene la consulta: `hgi6` cubre 2015-02-14 → 2026-08-14 (`docs/datos.md §5.1`) y no tiene filas de procesos abiertos. El modal del competidor nace del índice del corpus, que no ingiere `codigo_entidad`: allí solo cabe cruzar por NIT de entidad, que suma regionales hermanas, y se declara.
- **En qué beneficia**: «¿gana siempre que se presenta aquí?» es la lectura más rápida del pliego a la medida.
- **En qué afecta**: consulta externa con tope de 6 s, cacheada 1 h solo si respondió; con fallo «sin dato de proponentes hoy», no cero; el ganador solo por nombre no cruza.
- **Fuente y certeza**: `hgi6-6wh3` + p6dx (`fichaCompetidor`, ya existente) · medido.
- **Cuándo se calcula**: externo.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Llamar `fichaCompetidor`/`detalleCompetencia`, no duplicar la consulta. (2) Quitar «desde 2025» o poner un suelo de fecha explícito en el `$where`. (3) Declarar el cruce por NIT de entidad. (4) Dos hechos, sin tasa. (5) Con la consulta caída, «sin dato de proponentes hoy».
- **Tanda**: 17.

#### D-62 · En todo SECOP II (segunda cifra, declarada)

- **Corto**: «En todo SECOP II: 41 contratos por $380.000 millones (todos los años y modalidades publicados)» (solo con NIT). EJEMPLO.
- **Conciso**: el dato YA EXISTE y se enseña: `consultarAdjudicaciones` (`lib/socio.js:333-360`; `$where`: `nit_del_proveedor_adjudicado` y `adjudicado='Si'`, sin fecha; `$group: anio`) sale por `verificarSocio` (`lib/handlers/inteligencia/detalle.js:130-134`) y la pantalla muestra «Procesos que ha ganado (SECOP II)» (`public/app.js:10710`). No está exportada suelta (`:473`) y `$group=entidad` no existe: «en qué entidades» es otra petición y se declara aparte. «Desde 2024» es falso para esta consulta. Best-effort con tope; nunca se suman las dos cifras.
- **En qué beneficia**: el corpus es cota inferior; esta cifra dice cuánto más grande es el rival fuera de lo que la aplicación sigue.
- **En qué afecta**: latencia externa (NO VERIFICABLE: 403); sin NIT no existe; «sin dato» si falla.
- **Fuente y certeza**: p6dx en vivo (`consultarAdjudicaciones`, ya existente) · medido.
- **Cuándo se calcula**: externo.
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Quitar «desde 2024» o poner suelo explícito. (2) Exportar `consultarAdjudicaciones` o llamar `verificarSocio`. (3) «Por entidad» es otra petición. (4) Solo con NIT; fallo → «sin dato»; nunca sumar.
- **Tanda**: 17.

#### D-63 · Archivos de oferta cargados a este proceso

- **Corto**: «Archivos de oferta cargados: 4 (no dice cuántas empresas: un proponente sube varios)» (Mis procesos, tras el cierre). EJEMPLO.
- **Conciso**: el conteo YA EXISTE y se enseña: `planDeLectura().resumen.de_proponentes` («N archivos más son ofertas de otros proponentes», `public/app.js:4122`); `RE_PROPONENTE` (`lib/documentos_proceso.js:183`) clasifica tipos de documento, no nombres de empresa (`:209-219` por nombre y por fecha; `:266`); la cuenta se hace tras el tope de 150 archivos (`:120`, `:244`) y depende del cierre (reproducido: 5 archivos con cierre → 4; sin cierre → 3); el índice va ~3 días por detrás (`:20`). No hay lector de nombres de empresa: «se leyeron 3 nombres» no tiene regla, y 4 archivos pueden ser de UN proponente.
- **En qué beneficia**: contra quién compite de verdad, el día después del cierre y antes del informe de evaluación.
- **En qué afecta**: fuente externa pedida al guardar; identidad por nombre de archivo (estimado) y por fecha de cierre; no se leen ofertas ajenas; sin cierre la cuenta cambia.
- **Fuente y certeza**: `dmgg-8hin` (`resumen.de_proponentes`, ya existente) · estimado.
- **Cuándo se calcula**: clic (índice ya pedido al guardar).
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Llamar `resumen.de_proponentes`. (2) Quitar «se leyeron N nombres de empresa». (3) Declarar la dependencia del cierre y del tope de 150. (4) Mantener «~3 días por detrás» y «no se leen ofertas ajenas».
- **Tanda**: 17.

#### D-64 · La póliza de seriedad y cuándo pedirla

- **Corto**: «Necesitará una póliza de seriedad: suele ser el 10 % (como máximo cerca de $637 millones asegurados; el pliego fija la cifra); pídala a su aseguradora al menos 5 días de oficina antes del cierre».
- **Conciso**: existe casi entero: `guiaDe` devuelve `dinero.garantia_seriedad_asegurada_cop` (reproducido 636.586.369; `lib/guia_proceso.js:95` `GARANTIA_SERIEDAD_PCT` = 10 «del presupuesto oficial», `:394-396`, `:547`), el requisito «cerca de $637 millones asegurados … cinco días hábiles de anticipación» y el paso «Pida la garantía de seriedad» fechado a cierre − 5 hábiles (`:446-448`, `sumarHabiles(cierre, -5)`); la tabla de dinero lo enseña (`public/app.js:4230`). El par de bases está en el árbol (guía: 10 % del presupuesto; norma citada en `lib/dictamen.js:338-340`: 10 % de la OFERTA, con `literal_leido: false`): como la oferta no supera el presupuesto, el 10 % del presupuesto es cota superior y se dice «como máximo», sin esperar a leer la norma; el pliego manda. Los «5 días» son consejo propio de la aplicación (`public/glosario.js:86`: «Días de oficina»). No presentarla es rechazo no subsanable (Guía § «Índice de errores que descalifican»).
- **En qué beneficia**: sin la póliza no hay oferta y no se corrige después; la primera vez la aseguradora tarda.
- **En qué afecta**: cifra sobre una regla con dos bases: se enseña como máximo hasta leer la norma; los 5 días son consejo, no plazo.
- **Fuente y certeza**: guía (`guiaDe.dinero` y paso fechado, ya existentes) · estimado.
- **Cuándo se calcula**: petición.
- **Para quién**: sin experiencia.
- **Veredicto de verificación**: con condiciones. (1) Llamar `dinero.garantia_seriedad_asegurada_cop` y el paso fechado, no recalcular. (2) «Como máximo cerca de $637 millones». (3) Los 5 días son recomendación. (4) «$637 millones» (formato de la guía), no «≈ $637 M».
- **Tanda**: 8.

#### D-65 · Con cuánto ofertaron todos

- **Corto**: «De 12 ofertas, la que ganó fue la 4.ª más baja» (por proceso cerrado, detrás del clic). EJEMPLO.
- **Conciso**: `wi7w-2nvm` (`valor_de_la_oferta`; 41,9 M filas según co-acc) existe solo en el diccionario: `grep -rn "wi7w\|valor_de_la_oferta" lib/ api/ tests/` → 0. Llave de proceso (`id_del_proceso_de_compra`: ¿CO1.REQ como `lib/proponentes.js:59` o CO1.BDOS como `id_del_portafolio`, `lib/proyeccion.js:47-61`?) sin confirmar; sin columna de estado ni de ganador (exige cruzar con el adjudicatario del corpus, `lib/indice_competencia.js:94`, `:110-113`, `:162`, que llega «No Definido» en parte de las filas); aportaría un segundo conteo de ofertas con otro origen que `OFERENTES_CAMPOS` (`:100-104`, el de D-13). Solo por clic, jamás por fila (`listar.js` no tiene ninguna fuente externa por fila: `:343` es solo el disparo del sync).
- **En qué beneficia**: la única forma de ver el rango de posturas, no solo la ganadora.
- **En qué afecta**: sin llave confirmada no hay dato; exige la sonda desde donde haya red.
- **Fuente y certeza**: `wi7w-2nvm` (diccionario co-acc; no ingerido; llave sin confirmar) + cruce con el adjudicatario del corpus · sin fuente.
- **Cuándo se calcula**: externo (solo por clic).
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) Sonda: confirmar la llave y medir cobertura de `valor_de_la_oferta > 0` por proceso cerrado. (2) Cruzar con el adjudicatario, descartando «No Definido». (3) Declarar que no sustituye a `OFERENTES_CAMPOS` (o unificar). (4) Solo por clic. (5) 0/nulo se descarta; sin dato no se pinta nada. (6) Sin «modal de la entidad» en el texto de pantalla.
- **Tanda**: 18.

#### D-66 · Cuánto tarda en pagar esta entidad

- **Corto**: «En esta entidad, la mitad de las facturas se pagó en menos de 47 días (23 facturas; el resto tardó más)». EJEMPLO.
- **Conciso**: `uymx-8p3j` (`fecha_real_de_pago`, `fecha_de_emision`, `codigo_entidad`, `nit_entidad`, `id_del_contrato`; co-acc exige solo 70 % de cobertura de `fecha_real_de_pago`) no está en el árbol (`grep -rn "uymx\|fecha_real_de_pago" lib/ api/ tests/` → 0). La cifra que hoy usa la aplicación es un supuesto de 60 días (`DSO_DIAS_DEFECTO`, `lib/apu/rentabilidad.js:86`; `:338`, `:347`, `:429`) que el usuario puede cambiar (`lib/handlers/apu/editor.js:802,869`; `lib/apu/optimizador.js:278`): el dato medido se PROPONE, no pisa lo que el usuario fijó; `rentabilidad.js` no llama a la red. «Facturas de obra» exige cruzar `id_del_contrato` con el contrato; si no, «facturas de la entidad». Llave `codigo_entidad` (exacta) o declarar «puede sumar hermanas» (`lib/seguimiento.js:23-24`). Mediana, no promedio; mínimo declarado.
- **En qué beneficia**: «el Estado paga tarde», medido por entidad (imposible con jbjy).
- **En qué afecta**: sin cobertura medida no se enseña; el DSO medido se propone, no sustituye.
- **Fuente y certeza**: `uymx-8p3j` (diccionario; no ingerido) → alimenta `dso_dias` existente · sin fuente.
- **Cuándo se calcula**: externo.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) Sonda de cobertura por entidad. (2) Cruce con el contrato o «facturas de la entidad». (3) Llave exacta o declarar hermanas. (4) Mínimo y «sin dato»; mediana. (5) Alimentar `dso_dias` como sugerido. (6) El texto de arriba.
- **Tanda**: 18.

#### D-67 · Visto N veces en SECOP II

- **Corto**: «Vistas en la plataforma: 68» (plegado; nunca «interesados» ni cerca de «empresas suelen competir» sin distinguirlo). EJEMPLO.
- **Conciso**: `visualizaciones_del` no está en `lib/proyeccion.CAMPOS` (`:38-61`) y muere en la ingesta (`sync.js:68`, `:560`; `grep -rn visualizaciones lib/` → 0); precedente exacto en `docs/MEMORIA.md § «Fase 9 · La portada, la manifestación de interés y los días hábiles (ago 2026 · plan v4)»`: `proveedores_que_manifestaron` llegó a 0 en toda la muestra aunque un cuaderno externo la mostraba poblada. Costo real: `CAMPOS` + una full + censo de cobertura (`censarColumnasHistoricas`, `lib/columnas_historicas.js:324`) antes de enseñar; vacío → `null`, jamás «Visto 0 veces». Mide miradas (incluida la entidad), no oferentes.
- **En qué beneficia**: interés temprano antes de que exista dato de oferentes.
- **En qué afecta**: cobertura sin medir; no se enseña hasta el censo tras la full.
- **Fuente y certeza**: p6dx `visualizaciones_del` (diccionario; no confirmada) · sin fuente.
- **Cuándo se calcula**: sync (CAMPOS + full + censo).
- **Para quién**: experimentado.
- **Veredicto de verificación**: con condiciones. (1) `CAMPOS` + full. (2) Censo de cobertura antes de enseñar. (3) «Vistas en la plataforma». (4) Vacío → `null`.
- **Tanda**: 18.

### 4.5 Los que se pliegan o se retiran

Se retira también `alcanzable_con_socio` (D-08, en 4.1) y no entra el chip «cargue el ingreso de su RUP» (D-27, refutado: sección 6).

#### D-19 · Rótulo «cuantía alta / media / baja»

- **Corto**: (deja de pintarse).
- **Conciso**: tramos internos (`lib/negocio.js:34-35`, `cuantia_rango`, `null` sin cuantía: reproducido; con 250 M → «medio»); se pinta en un único renglón de la tarjeta (`public/app.js:2131`, `:2156`, dentro del ternario de `cuantia_cop`); el campo sigue viajando para `?cuantia_rango=` (`listar.js:513`, `:638`) y para `por_rango_cuantia` del resumen; nadie decide con «alta»: se decide con la capacidad (D-12) y el umbral (D-40). Cerraduras: `tests/e2e.js:10039` (valores servidos), `:25020` (`rangoCuantiaDe(0)` → `null`), `:16391` (fixture del panel): ninguna sobre el rótulo.
- **En qué beneficia**: quita un adjetivo que parecía un juicio y deja sitio a la modalidad y al plazo.
- **En qué afecta**: ninguna medida.
- **Fuente y certeza**: `cuantia_rango` · calculado.
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: confirmado.
- **Tanda**: 6.

#### D-26 · Chip plegado de ubicación («PURIFICACIÓN ✓»)

- **Corto**: (absorbido por D-25; el ✓ deja de pintarse).
- **Conciso**: el ✓ es `ubicacion_valida` (`lib/negocio.js:166-175`: comparación de ciudad/departamento contra la lista `UBICACION_VALIDA` del entorno, por defecto «BOGOTÁ D.C.»; `:232`; calculada en ingesta, `lib/proyeccion.js:30`; reproducido: Purificación/Tolima → `false`; sin ciudad ni departamento → `false`, no `null`). No es el chip de zona (distancia por departamento, que ORDENA: `lib/accesibilidad.js:98-104`, `listar.js:816-818`): es lo que FILTRA el select «Solo mi zona / Fuera de mi zona» (`public/index.html:3552-3556`; `app.js:1085`; `listar.js:518`, `:639`). No participa en puertas ni probabilidad. La suite exige que siga viajando como booleano (`tests/e2e.js:10049`).
- **En qué beneficia**: un dato menos repetido.
- **En qué afecta**: el ✓ era la única huella en la tarjeta de lo que usa el filtro «Solo mi zona»; el rótulo del filtro debe seguir siendo cierto sin él.
- **Fuente y certeza**: `ubicacion_valida` · calculado (contra una lista de configuración).
- **Cuándo se calcula**: sync.
- **Para quién**: ambos.
- **Veredicto de verificación**: con condiciones. (1) `ubicacion_valida` sigue en la respuesta. (2) Corregir «afecta»: filtro y chip de zona son nociones distintas. (3) Certeza: calculado; «sin ciudad ni departamento» sale `false`, no «sin dato».
- **Tanda**: 7.

## 5. Las tandas (una por sesión)

**Lo que toda tanda repite** (método de `docs/PROMPT_INICIAL.md § «3. El ciclo ECC (di en qué paso estás)»` y de `docs/MEMORIA.md § «Lo que esta auditoría enseñó sobre las propias cerraduras (13-sep-2026)»` y `docs/MEMORIA.md § «Commitear con agentes sueltos en el árbol: el diff que se empujó no era el que se verificó (13-sep-2026)»`): cada premisa de la ficha se verifica contra el código antes de tocar nada; cada hallazgo se reproduce; las pruebas se escriben ANTES y se demuestra que FALLAN contra el árbol anterior (mutación); lotes de ficheros DISJUNTOS entre agentes; `tests/e2e.js` fuera de la fase paralela (las cerraduras se escriben como guiones autónomos y se splician en serie); ninguna aserción existente se toca sin decir cuál y por qué; no se commitea con agentes vivos escribiendo en el árbol; `git diff` completo comparado con lo verificado; una regla que ya existe se llama, no se reescribe; un endpoint nuevo es una `op` del router (`api/*.js` no crece: `tests/e2e.js:4285`, `:33412`, `:34533`) y su forma literal es la que lee `tests/mapa.js` (`:34534-34535`). Al cerrar: los cuatro puntos de la sección 0.

**Orden.** Las tandas 1 a 3 son lo que el dueño pidió con sus palabras (con quién, y el competidor casi al instante con espera animada): no caben en una sesión porque tocan el recomendador, el índice, el detalle y la pantalla con cerraduras propias cada uno (juicio de este plan, no medida). Después, por valor sobre costo: primero lo que cambia datos que hoy no son ciertos (tandas 4-7), luego lo nuevo con lo que ya viaja (8-11), luego lo que exige reconstruir índices o una extracción (12-13), el pliego y las socias (14-15) y las fuentes externas (16-18).

| Tanda | Nombre | Datos |
|---|---|---|
| 1 | «Con quién conviene» en cada tarjeta | D-01 (sin cifra), D-08 |
| 2 | El perfil del competidor casi al instante (servidor) | D-03, D-02 y D-06 (servidor), D-78, D-53 (reserva) |
| 3 | El perfil a un clic, con su espera (pantalla) | D-04, D-05, D-06 y D-02 (pantalla), D-07, D-32, D-78 (rótulo); verifica D-79 |
| 4 | El servidor habla en llano | D-12, D-09 (campo), D-01 (la cifra) |
| 5 | Las tres celdas y la línea de requisitos | D-09 (línea), D-10, D-13, D-14, D-15, D-29, D-30, D-71; verifica D-68 |
| 6 | Los chips de tiempo, cuantía y modalidad | D-11, D-16, D-18, D-19, D-21, D-22, D-23, D-24 |
| 7 | Los chips de entidad, baja y pie | D-17, D-20, D-25, D-26, D-31, D-73, D-74; verifica D-69, D-70, D-72, D-75, D-76, D-77 |
| 8 | Plazo, ritmo y lo que cuesta presentarse | D-28, D-34, D-35, D-44, D-45, D-46, D-49, D-64 |
| 9 | El calendario de la oferta | D-33, D-36, D-37, D-38, D-43 |
| 10 | Lo que la entidad y usted ya saben | D-39, D-40, D-47 |
| 11 | Mis procesos: capacidad comprometida y con quién ha ganado | D-41, D-48 |
| 12 | Índices reconstruidos | D-50, D-51, D-52, D-53 |
| 13 | Proyección ampliada, una extracción completa | D-54, D-55 |
| 14 | El pliego: consorcio, estampillas y documentos tipo | D-56, D-58, D-59 |
| 15 | Las socias: contratos por perfil | D-57 |
| 16 | La sonda y la capacidad de verdad | sonda M-DGF-17, D-60 |
| 17 | El competidor fuera del corpus | D-61, D-62, D-63 |
| 18 | Tras confirmar la llave (condicional) | D-65, D-66, D-67 |

### Tanda 1 · «Con quién conviene» en cada tarjeta

- **Objetivo**: cada tarjeta dice con quién conviene, en una línea del servidor, en todos los estados, sin contradecir a las puertas.
- **Datos**: D-01 (la línea sin cifra), D-08.
- **Módulos y qué cambia**: `lib/socio_por_proceso.js` (devuelve `linea` de no más de 90 caracteres junto a `frase`; estado `segun_anticipo` con la contrafáctica `anticipo_pct: 0, anticipo_declarado: true` cuando `p2_k.depende_del_anticipo` o `p3_caja.sin_dato_de === "anticipo"`; la línea de ese estado va sin cifra); `lib/perfiles.js` (`nombreCorto` en los tres perfiles fijos y en `perfilDesdeConfig`); `lib/handlers/procesos/listar.js` (`resumenSocio` deja pasar `{tipo, con, cierra_todo, aviso, linea}`; la fila deja de llevar `alcanzable_con_socio`; el rescate de `:663` se conserva); `public/app.js` (`bloqueSocio` pinta la línea en todos los estados con su color); `tests/e2e.js` (`:4705-4708` y `:4724-4726` se reescriben; cerraduras nuevas); `docs/MEMORIA.md`.
- **Memoria obligatoria antes de tocar**: `docs/MEMORIA.md § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)»`, `docs/MEMORIA.md § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)»`, `docs/MEMORIA.md § «Un proceso que se alcanza con socio ya no se esconde (11-sep-2026)»`, `docs/MEMORIA.md § ««Sin dato» volvió a ser «cero» en la puerta de la caja, y escondía negocios enteros (13-sep-2026)»`, `docs/MEMORIA.md § «Por qué se escoge —o se cambia— de socio: siete razones con su norma (11-sep-2026)»`, `docs/MEMORIA.md § «F0-7 · La predicción que se le enseñó se CONGELA al guardar (24-ago-2026)»`. **Quedará SUPERADA**, en su parte de tarjeta, «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)» (marca bajo su título con nota: la línea vuelve a la tarjeta por petición literal del dueño; el congelado, `aLigero` y la frase del servidor siguen). La sección «Con cuál de mis socios conviene ESTE proceso…» vuelve a ser cierta en su línea resumen: se anota en la sección nueva, no se reescribe.
- **Pruebas que se escriben ANTES (y la mutación que debe tumbar cada una)**: (a) `resumenSocio` publica las cinco claves y `linea` mide 90 o menos — mutación: quitar `linea`; (b) para el fixture de $8.000 M la línea y `frase` nombran al mismo socio — mutación: componer la línea desde `socioQueAlcanza`; (c) fila con anticipo sin publicar y presupuesto que depende del anticipo → línea con las dos ramas — mutación: no evaluar la contrafáctica (la línea vuelve a decir «solo»); (d) `nombreCorto` en `helder`, `genesis`, `prodiac` y `perfilDesdeConfig` — mutación: borrar uno; (e) `alcanzable_con_socio` no está en la fila — mutación: volver a publicarlo; (f) las ocho líneas pasan `tuteoEn`, `VOSEO_RE`, `RE_EMOJI_UI` y `JERGA_JS`, y no contienen «Mipyme» ni «cumple» — mutación: escribir «Mipyme»; (g) el objeto sigue primero: refrigerios → `ninguna_sirve` con motivo `objeto` y la tarjeta no pinta línea.
- **Bloques `E2E_SOLO` mientras se trabaja**: `unidad socio por proceso`, `unidad puerta caja sin anticipo`; después `iteraciones`; al final el 4/4.
- **Navegador (390 px)**: la línea en sus cuatro colores no desborda; en «solo» se ve la línea gris; «Más detalles» sigue plegado; consola limpia.
- **Criterio de cierre**: (1) en `https://portafolio-estrategico.vercel.app`, con la clave del sitio, la tarjeta del proceso de Purificación dice «Solo si el pliego trae anticipo; sin anticipo, con PRODIAC (80/20).» y una fila cuyo objeto diga «Sin anticipo.» dice «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20»; (2) `https://portafolio-estrategico.vercel.app/api/oportunidades?token=<su token>` trae en cada fila `socio` con cinco claves y ninguna `alcanzable_con_socio`; (3) 4/4; (4) memoria con la marca y los generados; (5) pull request fusionado.
- **Trampa conocida**: el tercer criterio del orden de socias es inerte y, cuando las dos cierran, decide la cuantía (Génesis por debajo del umbral, PRODIAC por encima): no se «arregla» aquí; «tiene la actividad» no es «tiene la experiencia»; medir en producción la fracción de filas con contrafáctica (registro en el log) y `por_pagina=100` contra el corte de 4,5 MiB; no tocar `congelarSocio` ni `aLigero`.
- **Decide el dueño antes**: preguntas 1 y 3 de la sección 7.
- **Cierre**: —

### Tanda 2 · El perfil del competidor casi al instante (servidor)

- **Objetivo**: `op=competidor` responde desde un hash construido en el barrido del histórico, declara de dónde salió y cae al barrido de hoy si no tiene registro; el hash de la entidad lleva el líder.
- **Datos**: D-03, D-02 (servidor), D-06 (servidor), D-78 (crudos en el hash), D-53 (campo reservado).
- **Módulos y qué cambia**: `lib/competencia_detalle.js` (el bucle `:577-607` extraído a una función de acumulación compartida; camino índice `GET meta` + `HGET` con `origen` y `construido`; fallback al barrido; `entidades[]` agrupadas por `claveCanonica` con `clave` y nombre más frecuente; la regla `conGanador >= MIN_PROCESOS` de `:440-447` extraída para el líder; caché `adj:` a `v8`, solo para el barrido); `lib/indice_competencia.js` (líder por entidad en el registro; acumulador inverso con clave de progreso propia; publicación del hash `indice:adjudicatario` por lotes de 200 con swap atómico; departamento por entidad del competidor reservado; comentario `:1167-1168` actualizado); `lib/handlers/procesos/historico.js` (progreso propio en la cadena, sello DESPUÉS del dato); `lib/handlers/inteligencia/detalle.js` (`origen`, `construido`; `?entidad=` canonizada); `lib/handlers/procesos/listar.js` (`lider` en `competencia_entidad` solo con credencial); `lib/publico.js` (anula `lider` sin credencial); `lib/almacen.js` (la clave nueva en `CLAVES`); `tests/e2e.js`; `docs/MEMORIA.md`.
- **Memoria obligatoria antes de tocar**: `docs/MEMORIA.md § «Competencia histórica por entidad (jul 2026)»`, `docs/MEMORIA.md § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)»`, `docs/MEMORIA.md § «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)»`, `docs/MEMORIA.md § «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)»`, `docs/MEMORIA.md § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)»`, `docs/MEMORIA.md § «Lo que la cadena ya construyó no se vuelve a construir · la causa raíz de «no converge» (7-sep-2026)»`, `docs/MEMORIA.md § «El marcador de «hecho» se escribía antes que el hecho (13-sep-2026)»`, `docs/MEMORIA.md § «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)»`, `docs/MEMORIA.md § «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)»`. **SUPERADA**: ninguna sección; se escribe la decisión nueva «el líder de la entidad sale en `op=listar` solo con credencial», que desmiente en su letra el comentario de `lib/indice_competencia.js:1167-1168` (se actualiza en el mismo commit).
- **Pruebas ANTES (y su mutación)**: (a) el registro del hash cuadra con `detalleAdjudicatario` sobre el fixture de la suite en `total_ganados`, `valor_adjudicado_cop`, `entidades` y `baja.n` — mutación: publicar la mediana ya calculada en vez de `{n, suma, hist}` (falla al cambiar el umbral); (b) con hash, `op=competidor` responde `origen: "indice"` y `construido` con 2-3 comandos en el mock — mutación: saltar el `HGET`; sin registro → `origen: "barrido"` con los mismos números; (c) `lider` solo con `base >= MIN_PROCESOS` y desde la función compartida — mutación: copiar la regla con otro umbral; (d) `lider` nulo sin credencial, 401 con credencial inválida, presente con credencial válida — mutación: quitar la anulación en `sinFinanzas`; (e) `entidades[]` agrupa dos grafías en una fila con `clave` — mutación: agrupar por `lic.entidad` crudo; (f) el sello `terminado` se escribe después del dato; (g) el camino de barrido bajo `E2E_REDIS_LENTO_MS=40`.
- **`E2E_SOLO`**: `unidad detalle de competencia`, `unidad índice de competencia`, `unidad adjudicatario`, `unidad identidad de entidad`; después `iteraciones`; 4/4.
- **Navegador**: no toca `public/`; el JSON se comprueba en Chrome (criterio de cierre).
- **Criterio de cierre**: (1) el dueño reconstruye el índice pegando `https://portafolio-estrategico.vercel.app/api/sync/historico?reconstruir_indice=true&token=<su token>` (se vuelve a pegar la misma URL hasta que responda `done:true`; el estado, con `https://portafolio-estrategico.vercel.app/api/sync/historico?estado=true&token=<su token>`); (2) pega `https://portafolio-estrategico.vercel.app/api/inteligencia?op=competidor&adjudicatario=nit:<NIT>&token=<su token>` y lee `origen: "indice"`, `construido`, `duracionMs` y `comandosRedis`; con `&refrescar=1` lee `origen: "barrido"` y los mismos totales; (3) 4/4; (4) memoria y generados; (5) pull request fusionado.
- **Trampa conocida**: el corte de respuesta de 4,5 MiB (`lib/cuerpo.js:39`) y el chunk de 500 KB (`lib/almacen.js:271`); NIT y nombre cuentan aparte (declarado, no se «arregla»); la mediana no se reescribe; las cifras del prototipo (A2) son de un corpus sintético.
- **Decide el dueño antes**: pregunta 2 de la sección 7.
- **Cierre**: —

### Tanda 3 · El perfil a un clic, con su espera (pantalla)

- **Objetivo**: desde la tarjeta y desde el modal de la entidad se llega al perfil en un clic, con esqueleto, cabecera honesta y pie con fecha; el modal de la entidad abre sin esperar a datos.gov.co.
- **Datos**: D-04, D-05, D-06 (pantalla), D-02 (botón), D-07, D-32, D-78 (rótulo); verifica D-79.
- **Módulos y qué cambia**: `public/app.js` (botón del líder en la tarjeta, resuelto antes de `.banda-competencia`; `abrirModal` con esqueleto `.exp-esqueleto` y `aria-busy`; `pintarAdjudicatario` con cabecera honesta, «En esta entidad», rótulo «Baja con la que suele ganar», pie con «Resumen armado el …» y «Actualizar ahora»; `bloqueAdjudicatarios` con rótulo nuevo, botón por fila y segmentos pulsables; pliegue «Ver quiénes se han presentado aquí y cómo ejecuta sus contratos ›» con segunda petición); `public/index.html` (fondo plano en `:1380` bajo «Reducir movimiento»); `lib/competencia_detalle.js` y `lib/handlers/inteligencia/detalle.js` (parámetro `ligero=1` que no escribe la caché `v7`); `tests/e2e.js` (`:13033` se reescribe; nuevas).
- **Memoria obligatoria**: `docs/MEMORIA.md § «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)»`, `docs/MEMORIA.md § «Contra quién se ha competido: proponentes en vivo (hgi6-6wh3, ago 2026)»`, `docs/MEMORIA.md § «Cómo ejecuta sus contratos: jbjy-vk9h en vivo (ago 2026)»`, `docs/MEMORIA.md § «Tanda 1 de la piel v4: la cifra que cambiaba a espaldas del usuario, y tres tokens que no llegaban (13-sep-2026)»`, `docs/MEMORIA.md § «La pulsación que llegó antes que el archivo (13-sep-2026)»`, `docs/MEMORIA.md § «Mis procesos deja de ser una lista y pasa a ser un EXPEDIENTE en el que se entra (7-sep-2026)»`, y `docs/INVESTIGACION_DISENO_WEB.md § «7.3. Propuesta de tokens de movimiento para Detekta»` y `docs/INVESTIGACION_DISENO_WEB.md § «9. Plan de la piel v4 · qué se implementa, en qué orden (12-sep-2026)»`. **SUPERADA**: ninguna; la aserción `:13033` se reescribe con el rótulo nuevo.
- **Pruebas ANTES (y su mutación)**: (a) el esqueleto se pinta ANTES del `fetch` y `#modal-cuerpo` lleva `aria-busy="true"` hasta que llega el dato — mutación: pintar después del `fetch`; (b) la regla de «Reducir movimiento» cubre `.exp-esqueleto` con `animation: none` y fondo plano (efectos, `tests/e2e.js:27977-27990`) — mutación: quitar el fondo; (c) ningún `@keyframes` nuevo y `--dur-5` solo en `.dato-cambio`; (d) sin `lider` no hay botón; con `lider` el botón lleva `data-adjudicatario`, `data-nombre` y `data-entidad` y su `closest` va antes de `.banda-competencia` — mutación: invertir el orden; (e) cabecera: `procesos_con_valor` pintado; `identificacion` nula → la frase; `codigo_secop` → el rótulo existente; (f) rótulo «Ver los 5 que más ganan y dónde más ganan», botón por fila, y nada solo en `title` (la aserción sin tooltip de `:8663-8680` aplicada a `bloqueAdjudicatarios`) — mutación: quitar el botón; (g) `ligero=1` no escribe la caché `v7` y los bloques ausentes van declarados — mutación: escribir la caché; (h) los textos nuevos pasan las cercas y no dicen «índice» ni «histórico».
- **`E2E_SOLO`**: `unidad pantalla · public/app.js sin tooltip`, `unidad detalle de competencia`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: al pulsar el líder el esqueleto aparece de inmediato y desaparece de golpe; con «Reducir movimiento» emulado en Chrome (Más herramientas → Herramientas para desarrolladores → Rendering → «Emulate CSS media feature prefers-reduced-motion: reduce») el esqueleto es gris plano; la tabla del perfil no desborda; el modal de la entidad abre sin esperar a la segunda petición; consola limpia.
- **Criterio de cierre**: (1) en `https://portafolio-estrategico.vercel.app` con la clave del sitio, en una tarjeta con líder, un clic abre «Dónde gana este competidor» con esqueleto y luego la cabecera con «en N de M contratos con valor publicado», «En esta entidad: …», «Resumen armado el …» y «Actualizar ahora»; (2) en el modal de la entidad cada fila dice «Ver dónde más gana ›»; (3) 4/4; navegador; (4) memoria y generados; (5) pull request fusionado.
- **Trampa conocida**: V4-19 cambiará el mecanismo de los modales (nada de keyframes nuevos); el orden de `closest` en la delegación; un `title` no es respuesta visible; una utilidad Tailwind nueva obliga a regenerar `public/tailwind.css` con el CLI v3 (`tests/e2e.js:23078-23093`): usar clases que ya existen.
- **Decide el dueño antes**: nada nuevo (pregunta 2 ya firmada).
- **Cierre**: —

### Tanda 4 · El servidor habla en llano

- **Objetivo**: los mensajes de las cuatro puertas salen del servidor en palabras del glosario, con los campos que faltaban (`anticipo_que_cabe_pct` combinado, el hecho de los contratos en ejecución asumidos), y la línea de socio recibe su cifra.
- **Datos**: D-12, D-09 (el campo y su redacción pública), D-01 (la cifra).
- **Módulos y qué cambia**: `lib/puertas.js` (mensajes de `p1Rup`, `p2K`, `p3Caja` y `p4Competencia` sin jerga; los cinco tiers de `MENSAJE_TIER` y `rup.paso`; `anticipo_que_cabe_pct` publicado como el mayor entre el umbral de P2 y un umbral nuevo de P3; campo del hecho «contratos en ejecución asumidos en 0»); `lib/capacidad.js` (`calcSCE` devuelve ese hecho en vez de solo advertir); `lib/publico.js` (`CAMPOS_P2_FINANCIEROS` incluye el campo nuevo; `mensajeP2Publico`/`mensajeP3Publico` con la misma redacción sin cifras); `lib/socio_por_proceso.js` (la línea `segun_anticipo` toma la cifra del servidor); `public/app.js` (solo si la coma decimal se formatea en cliente); `tests/e2e.js` (censo de jerga EJECUTADO sobre `evaluarPuertas` y ampliado a `lib/puertas.js` y `lib/publico.js`; aserciones de textos reescritas).
- **Memoria obligatoria**: `docs/MEMORIA.md § ««Sin dato» volvió a ser «cero» en la puerta de la caja, y escondía negocios enteros (13-sep-2026)»`, `docs/MEMORIA.md § «La cifra que decía «Puede facturar hasta» era el TECHO, no la K (13-sep-2026)»`, `docs/MEMORIA.md § «Fase 6 · Traducción de lenguaje (ago 2026 · plan v3, transversal — cierre)»`, `docs/MEMORIA.md § «Puertas, probabilidad y valor esperado (ago 2026)»`, `docs/MEMORIA.md § «Fase 2 · Puerta de entrada de 60 segundos (ago 2026)»`, `docs/MEMORIA.md § «Lo que esta auditoría enseñó sobre las propias cerraduras (13-sep-2026)»`. **SUPERADA**: ninguna decisión; los textos viejos se citan en la sección nueva.
- **Pruebas ANTES (y su mutación)**: (a) `evaluarPuertas` real: ningún mensaje casa `JERGA_JS` ni `K`, `CRPC`, «capacidad residual», «UNSPSC» — FALLA contra el árbol de hoy; mutación: reintroducir «K»; (b) `p2K` publica `anticipo_que_cabe_pct` y con anticipo declarado un punto por debajo no pasa, con el valor pasa — mutación: publicar el redondeo hacia abajo; (c) el umbral de P3 existe y el publicado es el mayor — mutación: publicar solo el de P2 (un fixture donde manda P3 lo delata); (d) sin credencial el campo se anula y la línea pública no lleva porcentaje — mutación: quitarlo de `CAMPOS_P2_FINANCIEROS`; (e) el hecho «asumido 0» viaja como campo solo para perfiles sin `sce` — mutación: afirmarlo para `helder`; (f) los cinco tiers con texto sin la sigla; (g) la línea de socio lleva cifra solo cuando el umbral viene del servidor — mutación: imprimir el de P2 cuando falla P3; (h) coma decimal («1,4») en el mensaje de P4.
- **`E2E_SOLO`**: `unidad capacidad`, `unidad puerta caja sin anticipo`, `unidad anticipo en la cascada`, `unidad capacidad sin presupuesto`, `unidad socio por proceso`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: solo si se tocó `public/app.js`; el plegado de las puertas con los textos nuevos.
- **Criterio de cierre**: (1) la tarjeta de Purificación, plegada, dice «Capacidad de facturar ~ · Sin anticipo, esta obra ($6.366 M) supera lo que puede facturar hoy ($4.471 M): cabe con un anticipo del 30 % o más…» sin «CRPC» ni «K»; (2) `https://portafolio-estrategico.vercel.app/api/oportunidades?token=<su token>` trae `p2_k.anticipo_que_cabe_pct` = 30 en esa fila y sin credencial el campo es nulo; (3) la línea de socio dice «Solo si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC (80/20).»; (4) 4/4; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: no copiar cifras a las pruebas (las de los diseños venían de otra cuantía); el censo de jerga ampliado a `lib/` cazará textos de otros módulos: se declaran excepciones con motivo, no se recorta el censo; sin credencial nunca cifras del perfil; el redondeo hacia arriba es más exigente, nunca más laxo.
- **Decide el dueño antes**: pregunta 3 (si eligió la opción B, la línea entera espera a esta tanda).
- **Cierre**: —

### Tanda 5 · Las tres celdas y la línea de requisitos

- **Objetivo**: la parte alta de la tarjeta dice el hecho que decide (la línea con su cifra), separa «poder presentarse» de «ganar», y pinta una cifra por hecho sin supuestos disfrazados.
- **Datos**: D-09 (línea), D-10, D-13, D-14, D-15, D-29, D-30, D-71; verifica D-68.
- **Módulos y qué cambia**: `public/app.js` (`lineaRequisitos` con rótulo y textos por motivo de `sin_dato`; chip de no viable traducido con `Glosario.corto` y ámbar/rojo; `cuantosCompiten` y la celda con un decimal y plural; celda 2 por `p_ganar_detalle.fuente`; `avisoCompetencia` con la misma cifra y sustantivo; `bloqueGanancia` con el rótulo condicional; nota visible del «—»; rótulo «Para ganar»); `lib/probabilidad_desglose.js` (`de_donde_salen_los_datos` con «Lo que la aplicación no mide…» y la fuente junto a la frase); `tests/e2e.js` (`:30531-30536` reescritas; nuevas).
- **Memoria obligatoria**: `docs/MEMORIA.md § «FILOSOFÍA DEL PRODUCTO (ago 2026) · la regla que manda sobre las demás»`, `docs/MEMORIA.md § «Desglose justificado de P(ganar) (ago 2026)»`, `docs/MEMORIA.md § «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)»`, `docs/MEMORIA.md § «La tercera cifra de la tarjeta es LA PLATA QUE QUEDA (`lib/ganancia`, ago 2026)»`, `docs/MEMORIA.md § ««−$32 M de pérdida»: la tercera cifra de la tarjeta, auditada y corregida (20-ago-2026)»`, `docs/MEMORIA.md § «Dos defectos de producción y sus cerraduras (ago 2026)»`, `docs/MEMORIA.md § «Rediseño Apple Glass, eliminación de RUP y probabilidad en frases (ago 2026)»`, `docs/MEMORIA.md § «Habilitante vs. puntaje — la distinción más importante del oficio»`, `docs/MEMORIA.md § «Un proceso que se alcanza con socio ya no se esconde (11-sep-2026)»`, `docs/MEMORIA.md § «Puntos 7 y 10 de la hoja de ruta (ago 2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) `lineaRequisitos` EJECUTADA con un `p2_k` salido de `evaluarPuertas` real (anticipo sin publicar) → «● Para poder presentarse: cabe solo si el pliego trae anticipo del 30 % o más…»; sin credencial, sin porcentaje — mutación: pasar un objeto escrito a mano (la prueba exige que la entrada venga de `evaluarPuertas`); (b) `viable=false` con `cierra_todo=true` → ámbar, sin `opacity-50`, texto con `Glosario.corto`; `cierra_todo=false` → «puede no bastar»; `ninguna_sirve` → rojo atenuado — mutación: ámbar con `cierra_todo=false`; (c) celda 1 «1,4 empresas por proceso» y el aviso con la misma cifra — mutación: `Math.round`; (d) `bloqueProbabilidad` con `fuente: "conservador"` → «—» — mutación: pintar «1 de 6»; (e) rótulo «si bajan lo habitual aquí (7 %, 8 contratos)» solo con `origen_precio === "mercado"` — mutación: rotular también con `presupuesto_oficial`; (f) nota visible del «—»: sin credencial «entre con su clave del sitio…», con credencial y sin cuantía «sin cuantía publicada» — mutación: dejarlo solo en `title`; (g) «Para ganar» sobre dos celdas; el texto del modal sin «probabilidad».
- **`E2E_SOLO`**: `unidad pantalla · public/app.js sin tooltip`, `unidad competencia de la fila`, `unidad badge sin base`; después `iteraciones` (la banda de probabilidad vive ahí); 4/4.
- **Navegador (390 px)**: la línea a dos renglones no rompe la tarjeta; la franja de tres celdas cabe; el «—» con su nota visible; consola limpia.
- **Criterio de cierre**: (1) la tarjeta de Purificación dice arriba «● Para poder presentarse: cabe solo si el pliego trae anticipo del 30 % o más. Confírmelo en el pliego.» y «1,4 · empresas por proceso · 55 procesos»; (2) una entidad sin histórico muestra «—» en la segunda celda y «Ver cómo se calcula» declara el supuesto; (3) sin clave del sitio la tercera celda dice por qué; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: las aserciones de la tercera celda y de la banda de probabilidad viven dentro de `iteracion()` (localizar con `grep` antes de tocar); `p` sigue ordenando; nunca «probabilidad» ni porcentaje en la tarjeta.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 6 · Los chips de tiempo, cuantía y modalidad

- **Objetivo**: los chips de anticipo, cierre, cuantía, prórroga, adendas, modalidad y tipo de precio dicen la verdad y dicen la ausencia.
- **Datos**: D-11, D-16, D-18, D-19, D-21, D-22, D-23, D-24.
- **Módulos y qué cambia**: `public/app.js` (chip de anticipo por `anticipo_declarado`; `chipCierre` con hora y «Sin fecha de cierre publicada»; retiro del rótulo de tramo; prórroga con días; `bloqueAdendas` con «cambió N reglas» y «visto por última vez»; modalidad arriba por raíz con el literal en `title`; precio global arriba con su origen); `lib/negocio.js` (`horaCierreDe` movida junto a `fechaCierre` y exportada; `lib/handlers/perfil/entrada.js` la llama); `lib/handlers/procesos/listar.js` (grupo «sin cuantía» al final decidido con `presupuestoOficialDe`); `lib/adendas.js` (`:63-65`: con `antes` nulo no se dice «Se prorrogó»); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «El calendario de cierres, y tres bloques menos en Mi empresa (31-ago-2026)»`, `docs/MEMORIA.md § «La regla de las 24 horas»`, `docs/MEMORIA.md § «Dos defectos de producción y sus cerraduras (ago 2026)»`, `docs/MEMORIA.md § «Fases 4 y 5 del plan v3 · Guardián del Formulario 1 y vigía de adendas (ago 2026)»`, `docs/MEMORIA.md § «Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)»`, `docs/MEMORIA.md § «Auditoría integral del 1-sep-2026 · trece frentes, dos auditores que llegaron y el resto a mano»`, `docs/MEMORIA.md § «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos (3-sep-2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) chip de anticipo: `{0, true}` → «Sin anticipo…»; `{0, false}` → «no publicado»; fila sin el campo → «no publicado» — mutación: volver a `pct > 0`; (b) hora: fila con `T15:00` → «3:00 p. m.»; fila sembrada con `T00:00` → sin hora; sin fecha → «Sin fecha de cierre publicada»; la prueba corre con `TZ=UTC` y con `TZ=America/Bogota` — mutación: construir la hora con `Date`; (c) el grupo «sin cuantía» al final decidido con `presupuestoOficialDe` — mutación: decidir con `ve === 0` (una fila con cuantía y probabilidad 0 cae al grupo); (d) prórroga: 12 días enteros; formatos mezclados → chip sin días; primera versión sin cierre → ni chip ni «Se prorrogó» en adendas — mutación: condicionar por `_versiones > 1`; (e) adendas: «cambió 2 reglas» con tres versiones y «visto por última vez» con `:updated_at` — mutación: «2 cambios»; (f) modalidad: el literal largo de p6dx → «Selección abreviada de menor cuantía» por raíz con el literal en `title`; raíz desconocida → literal — mutación: pintar el literal arriba; (g) precio global arriba solo con `global` y con el origen; literales conservados (`:23566`).
- **`E2E_SOLO`**: `unidad anticipo`, `unidad anticipo en la cascada`, `unidad modalidades`, `unidad tipo de precio`, `unidad pantalla · public/app.js sin tooltip`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: el chip de cierre con hora no rompe la fila de chips; modalidad y plazo caben junto a la cuantía; consola limpia.
- **Criterio de cierre**: (1) Purificación: «Cierra en N días · mié 14 de oct · 3:00 p. m.», «Licitación pública» arriba y sin «cuantía alta»; (2) una fila con «Sin anticipo.» en el objeto muestra la redacción de «Sin anticipo»; (3) una fila sin cuantía aparece al final en su grupo rotulado con «Cuantía no publicada: la capacidad de contratación no se puede verificar. Confírmela en el pliego.»; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: la hora nunca pasa por `Date` (cambia de sitio según la zona del motor); `cuantia_cop` sigue 0 en la API; el corpus de la suite no trae ninguna fila con `T00:00` (sembrarla); D-24 conserva sus literales.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 7 · Los chips de entidad, baja y pie

- **Objetivo**: la baja con su banda y su origen, la banda de competencia que dice qué abre, la entidad con su municipio, el encaje que nombra el código que falta, el margen atribuido a quien corresponde y el pie que dice qué da; y la verificación de lo que se conserva.
- **Datos**: D-17, D-20, D-25, D-26, D-31, D-73, D-74; verifica D-69, D-70, D-72, D-75, D-77, D-79; corrige la ficha de D-76.
- **Módulos y qué cambia**: `public/app.js` (`chipBaja` con banda en palabras y las tres variantes; `bandaCompetencia` con el destino; cabecera «entidad · municipio · departamento» con la frase de sede y sin «No Definido»; el ✓ deja de pintarse; rótulo «Guardar · para ver qué le piden y el paso a paso»; `lineaMargen` por granularidad; `badgesRup` con el código que falta); `lib/handlers/procesos/listar.js` (`margen_estimado` lleva la granularidad del techo); `lib/unspsc.js` (el código del proceso también en tier `ninguno`, texto sin la sigla); `lib/guia_proceso.js:263` («No Definido» filtrado, hermano); el formato «ciudad · departamento» de `public/calendario.js` (`lugarDeEjecucion`) movido a un módulo compartido que tarjeta y calendario llaman; `lib/handlers/perfil/resumen.js:125-133` (badge alineado o declarado, según la pregunta 5); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)»`, `docs/MEMORIA.md § «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)»`, `docs/MEMORIA.md § «La dispersión de la baja se MIDE, no se supone (24-ago-2026)»`, `docs/MEMORIA.md § «Dónde cae su precio: UNA escala en Piso/Techo · M-DGF-01 (con M-IE-15) (6-sep-2026)»`, `docs/MEMORIA.md § «Fase 3 · Panel Piso / Techo (ago 2026)»`, `docs/MEMORIA.md § «El lugar de ejecución ES la entidad, «Para Helder» abre la pestaña, y Tailwind medido de verdad (31-ago-2026, segunda pasada)»`, `docs/MEMORIA.md § «Lote «zona y RUP en PDF» de la consultoría del 4-sep · M-SEG-10, M-INF-01 (6-sep-2026)»`, `docs/MEMORIA.md § «Rediseño Apple Glass, eliminación de RUP y probabilidad en frases (ago 2026)»`, `docs/MEMORIA.md § «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)»`, `docs/MEMORIA.md § «Fase 6 · Traducción de lenguaje (ago 2026 · plan v3, transversal — cierre)»`, `docs/MEMORIA.md § «Plan Anual de Adquisiciones · qué va a salir antes de que salga (ago 2026)»`, `docs/MEMORIA.md § «Accesibilidad de la zona · el costo de LLEGAR ordena (ago 2026)»`, `docs/MEMORIA.md § «Las dos alarmas del calendario (ago 2026)»`, `docs/MEMORIA.md § «El enlace al proceso en SECOP II vuelve, y trae un dato basura debajo (8-sep-2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) `chipBaja`: base 8 → banda «entre 3 % y 9 %»; IQR cero → solo la mediana; `baja_p25` nulo → solo la mediana; mediana 0 → «se gana sin bajar el precio»; solo departamento → el mensaje de `baja_departamento` sin «Suelen bajar» — mutación: banda con `p75 == p25`; (b) banda: «Poca competencia · 55 procesos · quién gana aquí ›» con `conBase`, solo el título sin base; `data-entidad`, `cursor-pointer`, `hover:underline` conservados; (c) cabecera: «No Definido» en ciudad → sin municipio; una sola función de formato usada por tarjeta y calendario — mutación: copiar la función (el censo de definiciones la caza); (d) el ✓ no se pinta y `ubicacion_valida` sigue siendo booleano (`:10049`); (e) el rótulo de Guardar visible, no solo en `title`; (f) margen con `departamento_familia` → «en su departamento» — mutación: «esta entidad»; (g) tier `ninguno` → «pide el código …» sin «UNSPSC» — mutación: el mensaje viejo (la cerca lo caza).
- **`E2E_SOLO`**: `unidad índice de baja`, `unidad competencia de la fila`, `unidad badge sin base`, `unidad UNSPSC (jerarquía)`, `unidad pantalla · public/app.js sin tooltip`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: el pie con tres botones y el rótulo largo de Guardar no desborda; la cabecera de tres partes se parte bien; el chip de baja con banda cabe plegado; consola limpia.
- **Criterio de cierre**: (1) una fila con base propia muestra «Suelen bajar 7 % (unos $445 M) · la mitad de los que ganaron bajó entre 3 % y 9 % · 8 contratos de esta entidad»; (2) Purificación muestra «ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Purificación · Tolima» con la frase de sede; (3) el botón dice «Guardar · para ver qué le piden y el paso a paso»; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: nunca dos instrucciones de precio en la misma tarjeta; el departamento se expone y no decide; la regla de formato de lugar no se duplica; «p25», «p75», «mediana» y «hábiles» no salen en pantalla.
- **Decide el dueño antes**: pregunta 5 de la sección 7.
- **Cierre**: —

### Tanda 8 · Plazo, ritmo y lo que cuesta presentarse

- **Objetivo**: el plazo publicado (y solo el publicado) llega a la tarjeta, al editor de Precios y al resumen; con él, el ritmo mensual, el cruce de diciembre, el 5 % y la póliza; y la guía deja de cobrar el 5 % a una interventoría cuando corre sin fila viva.
- **Datos**: D-28, D-34, D-35, D-44, D-45, D-46, D-49, D-64.
- **Módulos y qué cambia**: `lib/capacidad.js` (la guarda «plazo publicado, si no `null`» de `lib/guia_proceso.js:219` extraída con nombre; `plazoMesesDe` intacta para la K); `lib/guia_proceso.js` (llama la extraída; el cálculo de `cruza_diciembre` de `:284-287` extraído; `tipoTrabajo` resuelto también sin fila viva con `tipoTrabajoDe`; la garantía redactada «como máximo»; `modalidadEnLlano` compartida); `lib/handlers/perfil/resumen.js:528` (la misma función); `lib/handlers/procesos/listar.js` (`plazo_meses` nulo sin duración; ritmo con `presupuestoOficialDe`; cruce; contribución con la redacción por tipo; diccionario de explicaciones de modalidad una vez por respuesta); `lib/handlers/apu/editor.js` y `public/app.js` (el editor declara el plazo no publicado; sin `|| 12` mudo); `public/app.js` (chips: plazo arriba; plegados ritmo, cruce, 5 %, modalidad en llano, póliza); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos (3-sep-2026)»`, `docs/MEMORIA.md § «La contribución del 5 % se cobraba siempre, y la alerta invitaba a cobrarla dos veces (13-sep-2026)»`, `docs/MEMORIA.md § «Don Héctor · la hipótesis verificada contra fuentes vigentes y el diseño del dictamen del pliego, sin código todavía (2-sep-2026)»`, `docs/MEMORIA.md § «Investigación de contraste (ago 2026) — correcciones al manual y hallazgos verificados»`, `docs/MEMORIA.md § «Los pendientes declarados, cerrados (ago 2026)»`, `docs/MEMORIA.md § «Segunda pasada del 4-sep-2026: la guía sin cuadros vacíos y Precios en tres pasos»`, `docs/MEMORIA.md § «La guía le daba al contratista una lista de tareas con las fechas hacia atrás (12-sep-2026)»`, `docs/MEMORIA.md § «El paso a paso se leía hacia atrás cuando había un festivo en la última semana (13-sep-2026)»`, `docs/MEMORIA.md § «Mis procesos como pestaña, centro de alertas y manifestación de interés (18-ago-2026)»`. **SUPERADA**: ninguna decisión; la sección nueva anota el defecto de `guiaDe` sin fila viva (la regla del 3-sep sigue vigente: era su aplicación la que fallaba).
- **Pruebas ANTES (y su mutación)**: (a) plazo publicado: `{8, Meses}` → 8; `{}` → `null`; `{240, Días}` → «240 días» con «unos 8 meses»; `resumen.js` publica `null` sin duración — mutación: 12; (b) ritmo con `presupuestoOficialDe`: sin precio → `null` — mutación: `cuantia_cop / plazo` (da 0); (c) `cruza_diciembre` extraída reproduce los cinco casos y `guiaDe` la llama — mutación: dejar la copia inline (el censo de definiciones la caza); (d) contribución: obra, suministro, servicios, «otra» y tipo nulo → cifra con la redacción por tipo; consultoría e interventoría → nada; sin cuantía → `null` — mutación: «solo obra»; (e) `guiaDe` con foto de interventoría y sin fila viva → contribución `null` — FALLA contra el árbol de hoy; (f) diccionario de modalidades una vez por respuesta, sin nombre, y cada fila con clave y literal; (g) garantía «como máximo cerca de $637 millones» y el paso a cierre menos 5 hábiles; (h) el editor con `plazo_meses` nulo muestra «plazo no publicado» y no manda 12 en silencio — mutación: `|| 12`.
- **`E2E_SOLO`**: `unidad capacidad`, `unidad guía · orden del paso a paso`, `unidad EXPEDIENTE DE UN PROCESO`, `unidad CASILLERO DE MIS PROCESOS`, `unidad APU · dinero de la oferta`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: «Calcular mi precio» abre Precios con el plazo puesto y dice cuando no venía; los chips plegados caben; consola limpia.
- **Criterio de cierre**: (1) Purificación: «Plazo de obra: 8 meses» arriba; plegado «Unos $796 M por mes de obra durante 8 meses», «La obra cruza diciembre…», «Le descontarán el 5 % de obra pública: ≈ $318 M sobre el presupuesto», «Licitación pública: el proceso grande; el método de puntuar el precio se sortea» y «Necesitará una póliza de seriedad…»; (2) «Calcular mi precio» abre Precios con 8 meses; (3) una interventoría guardada solo con foto no muestra el 5 %; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: `plazoMesesDe({})` sigue dando 12 para la K y ese 12 nunca se enseña; la base de la garantía (oferta o presupuesto) no se resuelve aquí («como máximo»); la norma no se relee; `modalidadEnLlano` no se reescribe.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 9 · El calendario de la oferta

- **Objetivo**: cada fecha lleva su acción: días de oficina que quedan y cuándo presentar, días que dio el proceso, fechas difíciles, el siguiente paso fechado y la referencia del proceso.
- **Datos**: D-33, D-36, D-37, D-38, D-43.
- **Módulos y qué cambia**: `lib/manifestacion.js` (la cuenta «le quedan N días de oficina» de `:246` extraída a una función que `lib/handlers/procesos/manifestacion.js:55` y `listar` llaman; `lib/habiles.js` no cambia); `lib/guia_proceso.js` (`pasosDe` y la regla del día anterior extraídas; `guiaDe` las llama); `lib/handlers/procesos/listar.js` (`dias_oficina_restantes`, `presentar_el`, `dias_oficina_dados`, fecha difícil, `siguiente_paso`, todo tras `fechaOperable`); `public/app.js` (referencia junto al título; línea de días y presentar; siguiente paso; chips plegados; `proximoPaso` del expediente en `:4267-4268` llama `pasosDe`); `tests/e2e.js` (filas sin publicación, con 1970 y sin cierre).
- **Memoria obligatoria**: `docs/MEMORIA.md § «EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS: TRES ES EL TECHO (20-ago-2026)»`, `docs/MEMORIA.md § «Fase 9 · La portada, la manifestación de interés y los días hábiles (ago 2026 · plan v4)»`, `docs/MEMORIA.md § «El paso a paso se leía hacia atrás cuando había un festivo en la última semana (13-sep-2026)»`, `docs/MEMORIA.md § «La guía le daba al contratista una lista de tareas con las fechas hacia atrás (12-sep-2026)»`, `docs/MEMORIA.md § «El paso a paso salía desordenado, y `main` llevaba horas en rojo sin que nadie lo viera (13-sep-2026)»`, `docs/MEMORIA.md § «La regla de las 24 horas»`, `docs/MEMORIA.md § «Investigación de contraste (ago 2026) — correcciones al manual y hallazgos verificados»`, `docs/MEMORIA.md § «Las 12 señales de pliego sastre»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) la cuenta compartida: manifestación y `listar` dan el mismo número; sin fecha operable → `null` y no lanza (hoy lanza) — mutación: llamar `habilesEntre` sin guarda; (b) `presentar_el` es la misma función que usa la guía (13-oct con el 12-oct festivo) — mutación: copiarla (censo); (c) `dias_oficina_dados`: sin publicación → `null` (hoy 0) — mutación: 0; con `_cambios` de cierre, el rótulo; (d) fecha difícil: cierre 13-oct-2026 → «día siguiente a un festivo»; 23-dic → fin de año; Jueves Santo → Semana Santa; `esFestivo` nunca con nulo; (e) siguiente paso: primer paso fechado DESPUÉS de hoy; el 13-sep con cierre 14-oct → «7 de octubre: pida la garantía…» — mutación: «primer paso con fecha ≥ hoy» (devuelve «Lea primero…»); con manifestación viva se omite; cerrado → «El proceso ya cerró»; el expediente usa la misma función; (f) referencia: nula → no se pinta; nunca cae al id.
- **`E2E_SOLO`**: `unidad guía · orden del paso a paso`, `unidad EXPEDIENTE DE UN PROCESO`, `unidad reloj`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: «Le quedan N días de oficina… · presente a más tardar…» se parte bien; el siguiente paso cabe; consola limpia.
- **Criterio de cierre**: (1) Purificación el 13-sep: «Referencia …» junto al título; «Le quedan 21 días de oficina para armar la oferta · presente a más tardar el 13 de octubre»; «Siguiente paso · 7 de octubre: pida la garantía de seriedad a su aseguradora»; plegado «Da 30 días de oficina para ofertar (publicado el 1 de sep, cierra el 14 de oct)» y «Cierra el día siguiente a un festivo…»; (2) una fila sin fecha de publicación no dice «Da 0»; (3) 4/4; navegador; (4) memoria y generados; (5) pull request fusionado.
- **Trampa conocida**: `habilesEntre` lanza con nulo y devuelve 0 con 1970 y con el orden invertido; «hábiles» está prohibido en pantalla; la ventana 20-dic/10-ene no es del manual; dos convenciones de «le quedan» no pueden coexistir.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 10 · Lo que la entidad y usted ya saben

- **Objetivo**: la fila lleva cuánto tarda la entidad en adjudicar y cuántos declara desiertos, si por cuantía puede reservar el proceso para empresas pequeñas y con qué socia sigue cabiendo, y su propio historial con la entidad.
- **Datos**: D-39, D-40, D-47.
- **Módulos y qué cambia**: `lib/handlers/procesos/listar.js` (`hechosDeEntidad(indice, l)` por fila, compuesto en la fila sin tocar `competenciaDe`; la frase de `avisoMipyme` por fila solo con `socioAplica`; un `GET` de `seguimiento:{perfil}` solo con credencial, agrupado por `claveCanonica`); `lib/handlers/perfil/seguimiento.js` (`leerGuardados` exportado); `public/app.js` (reutiliza `htmlPlazoAdjudicacion` y `htmlDesiertos`; chip de empresas pequeñas; historial); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)»`, `docs/MEMORIA.md § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)»`, `docs/MEMORIA.md § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)»`, `docs/MEMORIA.md § «El tamaño de empresa se lee del certificado, y hay UNA sola lista de tamaños (11-sep-2026)»`, `docs/MEMORIA.md § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)»`, `docs/MEMORIA.md § «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)»`, `docs/MEMORIA.md § «F0-7 · La predicción que se le enseñó se CONGELA al guardar (24-ago-2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) con el índice sembrado la fila trae `plazo_adjudicacion` y `desiertos`; hash viejo → nulos; base 3 → mediana nula y conteos; la cerradura de «sin dato» de `competenciaDe` sigue verde — mutación: meter los hechos dentro de `competenciaDe`; (b) la frase de empresas pequeñas solo con `socioAplica`; cuantía por debajo del umbral con PRODIAC → frase; en el umbral exacto o por encima → nada; sin credencial → nada — mutación: comparar con «mayor o igual»; (c) historial: dos grafías de la misma entidad → una cuenta; presentado + ganado + perdido = «se presentó»; descartado no cuenta; `GET` fallido → sin dato y la lista responde 200 — mutación: agrupar por NIT (dos regionales se funden); (d) textos con «días de oficina» y sin «mediana» ni «p75» (`:13082`).
- **`E2E_SOLO`**: `unidad índice de competencia`, `unidad socio por proceso`, `unidad CASILLERO DE MIS PROCESOS`; después `iteraciones` (el `listar` real vive ahí); 4/4.
- **Navegador (390 px)**: los renglones plegados; consola limpia.
- **Criterio de cierre**: (1) una fila con base muestra plegado «Adjudica en unos N días de oficina tras el cierre (la mitad de sus M procesos con las dos fechas) · Declaró desierto X de sus Y»; (2) una fila de $400 M muestra «Por su cuantía, la entidad puede reservar este proceso para empresas pequeñas ($511,7 M en 2026): con Génesis usted sigue cabiendo; con PRODIAC no. Confírmelo en el pliego.»; (3) una entidad con guardados marcados muestra «Ya se presentó aquí N veces y ganó M (según lo que marcó en Mis procesos)»; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: un hash anterior a M-DGF-08 da nulos y la tarjeta calla (no se exige reconstrucción); el NIT no identifica a la entidad; un `GET` más por petición con credencial: medir el tiempo del `listar` real antes y después.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 11 · Mis procesos: capacidad comprometida y con quién ha ganado

- **Objetivo**: la cabecera de Mis procesos dice cuánta capacidad compromete lo que marcó «me presenté» y con quién ha ganado según el consejo guardado.
- **Datos**: D-41, D-48.
- **Módulos y qué cambia**: `lib/handlers/perfil/seguimiento.js` (`alertasDelPerfil`: `evaluarPuertas` por guardado en «presentado» con el perfil cargado; la K comparada es la del guardado de mayor presupuesto; el agrupado por consejo congelado se calcula antes de `aLigero`); `lib/seguimiento.js` (ayudas de agrupado); `public/app.js` (dos líneas nuevas en la cabecera de Mis procesos); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)»`, `docs/MEMORIA.md § «Puertas, probabilidad y valor esperado (ago 2026)»`, `docs/MEMORIA.md § «La cifra que decía «Puede facturar hasta» era el TECHO, no la K (13-sep-2026)»`, `docs/MEMORIA.md § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)»`, `docs/MEMORIA.md § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)»`, `docs/MEMORIA.md § «Lote «B7a-tablero-mis-procesos» de la consultoría del 4-sep · M-DGF-09, M-DGF-11, M-DGF-15 (6-sep-2026)»`, `docs/MEMORIA.md § «F0-7 · La predicción que se le enseñó se CONGELA al guardar (24-ago-2026)»`, `docs/MEMORIA.md § «Mis procesos deja de ser una lista y pasa a ser un EXPEDIENTE en el que se entra (7-sep-2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) la suma toma solo `crpc` de «presentado» — mutación: contar «interesa»; (b) un guardado sin cuantía queda fuera y se cuenta en «N sin cuantía publicada»; `crp` nulo → nada; (c) la K comparada es la del guardado de mayor presupuesto — mutación: K con presupuesto 0; (d) la frase «sin descontar contratos en ejecución» solo para perfiles sin `sce`; (e) agrupado: `con_socio` por socio; «solo»; `socio` nulo → «sin consejo guardado»; mínimo 3 presentadas; para un perfil que no es el dueño no se pinta; calculado antes de `aLigero` (que sigue quitando `socio`, `tests/e2e.js:4785-4792`) — mutación: leer `socio` después de `aLigero`.
- **`E2E_SOLO`**: `unidad CASILLERO DE MIS PROCESOS`, `unidad EXPEDIENTE DE UN PROCESO`, `unidad capacidad`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: la cabecera de Mis procesos con las dos líneas; consola limpia.
- **Criterio de cierre**: (1) con tres guardados en «me presenté», la cabecera dice «Si gana todo lo que marcó «me presenté», compromete $X; en un contrato de ese tamaño hoy puede facturar $Y: …»; (2) con tres o más presentadas y desenlaces marcados, «Presentadas N · ganadas M (en k el consejo guardado decía …)»; (3) 4/4; navegador; (4) memoria y generados; (5) pull request fusionado.
- **Trampa conocida**: la K depende del presupuesto (`factorE`); los guardados fuera del corpus no tienen puertas; la lista de guardados tiene tope (menos de un cuarto del corte: `tests/e2e.js:35435-35470`): medir.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 12 · Índices reconstruidos

- **Objetivo**: los dos índices publican por entidad lo que suele dar para ofertar, quiénes ganan de la zona y cuántos se adjudicaron por el presupuesto oficial; el perfil del competidor se agrupa por departamento.
- **Datos**: D-50, D-51, D-52, D-53.
- **Módulos y qué cambia**: `lib/indice_competencia.js` (`acumularHechos`: histograma de días de oficina dados con la forma `{dias, motivo}` y descartes en la meta; locales por entidad con `Filtros.departamento`; publicación con `percentilHistograma` y `MIN_PROCESOS`); `lib/indice_baja.js` (`registroPublicado` con `{al_oficial_n, base}` por grupo; igualdad exacta); `lib/competencia_detalle.js` (el perfil agrupa `entidades[]` por el departamento reservado en la tanda 2); `lib/columnas_historicas.js` (censo de `departamento_proveedor`); `lib/handlers/procesos/listar.js` (`dias_oficina_suele_dar` y «al oficial» en la fila); `public/app.js` (modal de la entidad: suele dar, locales, al oficial; modal del competidor: por departamento; tarjeta plegada); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep-2026)»`, `docs/MEMORIA.md § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)»`, `docs/MEMORIA.md § «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)»`, `docs/MEMORIA.md § «La dispersión de la baja se MIDE, no se supone (24-ago-2026)»`, `docs/MEMORIA.md § «DOS DE LAS CUATRO GRANULARIDADES DE LA BAJA ESTÁN VACÍAS EN PRODUCCIÓN (24-ago-2026)»`, `docs/MEMORIA.md § «Decisiones que no hay que re-aprender (costaron caro)»`, `docs/MEMORIA.md § «Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)»`, `docs/MEMORIA.md § «Competencia histórica por entidad (jul 2026)»`, `docs/MEMORIA.md § «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)»`, `docs/MEMORIA.md § «El marcador de «hecho» se escribía antes que el hecho (13-sep-2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) una fila sin publicación se descarta con motivo y se cuenta; nunca entra como 0 — mutación: llamar `habilesEntre` sin guarda; (b) la mediana sale de `percentilHistograma` con `MIN_PROCESOS` — mutación: una mediana local (el censo de medianas la caza); (c) locales: «No Definido» fuera de la base; se comparan códigos — mutación: comparar cadenas («Tolima» y «TOLIMA»); (d) `al_oficial_n` publicado; hash viejo → nulo; igualdad exacta — mutación: la cubeta 0 (una baja de 0,4 % cuenta); (e) 100 % con base grande → «dato por confirmar»; (f) el perfil agrupa por departamento con «No Definido» aparte.
- **`E2E_SOLO`**: `unidad índice de competencia · mediana única`, `unidad índice de baja`, `unidad detalle de competencia`, `unidad índice de competencia`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: los dos modales; consola limpia.
- **Criterio de cierre**: (1) el dueño reconstruye los dos índices pegando `https://portafolio-estrategico.vercel.app/api/sync/historico?reconstruir_todo=true&token=<su token>` (o `reconstruir_indice=true` y `reconstruir_baja=true` por separado; se vuelve a pegar hasta `done:true`); (2) el modal de una entidad con base muestra «Esta entidad suele dar N días de oficina para ofertar (la mitad de sus M procesos, ese plazo o más)», «X de cada 10 ganadores aquí tienen domicilio registrado en …» y «Aquí N de sus M procesos con cifras se adjudicaron por el presupuesto oficial»; el perfil del competidor muestra «Gana sobre todo en …»; (3) 4/4; navegador; (4) memoria y generados; (5) pull request fusionado.
- **Trampa conocida**: `habilesEntre(null, x)` devuelve 0; `percentilHistograma` y `MIN_PROCESOS` son únicos; la mediana no se reescribe; la cobertura de `departamento_proveedor` no se ha visto; un 100 % suele ser columna copiada.
- **Decide el dueño antes**: nada (reconstruir los índices es un paso, no una decisión).
- **Cierre**: —

### Tanda 13 · Proyección ampliada, una extracción completa

- **Objetivo**: cuatro columnas que hoy se descartan entran en la proyección activa con una sola extracción completa; dos se enseñan (republicado, lotes) solo tras medir su cobertura; dos (`codigo_entidad`, `ordenentidad`) entran sin pintarse, para no pagar dos extracciones.
- **Datos**: D-54, D-55.
- **Módulos y qué cambia**: `lib/proyeccion.js` (`CAMPOS`: `fecha_de_ultima_publicaci`, `numero_de_lotes` en la activa, `codigo_entidad`, `ordenentidad`); `lib/columnas_historicas.js` (el censo tras la extracción: cobertura y el valor «sin lotes»); `lib/handlers/procesos/listar.js` (lector «republicado»: día(última) > día(publicación); lotes); `public/app.js` (dos chips plegados); `tests/e2e.js` (una columna nueva no se pinta sin cobertura medida; «republicado» nunca dice «adenda»; `por_pagina=100` medido).
- **Memoria obligatoria**: `docs/MEMORIA.md § «El corpus conserva la llave de cruce `id_del_portafolio` · M-DGF-05 (6-sep-2026)»`, `docs/MEMORIA.md § «Fases 4 y 5 del plan v3 · Guardián del Formulario 1 y vigía de adendas (ago 2026)»`, `docs/MEMORIA.md § «Los documentos del proceso se leen solos al guardar en Mis procesos (3-sep-2026)»`, `docs/MEMORIA.md § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)»`, `docs/MEMORIA.md § «Decisiones que no hay que re-aprender (costaron caro)»`, `docs/MEMORIA.md § «Fase 9 · La portada, la manifestación de interés y los días hábiles (ago 2026 · plan v4)»` (el precedente de `proveedores_que_manifestaron` en 0), `docs/MEMORIA.md § «Ingesta ancha / juicio fino y pertinencia (jul 2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) `proyectar` conserva las cuatro columnas en la activa (FALLA contra el árbol de hoy); los registros viejos sin ellas dan sin dato; (b) republicado: última posterior a la publicación por día → fecha; igual → nada; ausente → nulo — mutación: ausente → «no republicado»; (c) lotes: 3 → texto; ausente → nada; 0 y 1 según lo que diga el censo; (d) la tarjeta no pinta la columna si la meta del censo no tiene cobertura medida — mutación: pintar con cobertura 0 %; (e) `por_pagina=100` medido contra el corte de 4,5 MiB después de añadir columnas.
- **`E2E_SOLO`**: `unidad socrata`, `unidad empaquetar`; `unidad censo de ingesta` y `unidad rastreo` viven en `iteraciones`; 4/4.
- **Navegador (390 px)**: los dos chips plegados; consola limpia.
- **Criterio de cierre**: (1) el dueño lanza la extracción completa pegando `https://portafolio-estrategico.vercel.app/api/sync?modo=full&token=<su token>` (o en Mi empresa → Sistema → **«Iniciar sincronización»**; se auto-encadena) y, para el histórico, `https://portafolio-estrategico.vercel.app/api/sync/historico?desde=2024-01&hasta=2025-12&token=<su token>` (se vuelve a pegar hasta `done:true`), como describe `docs/CONFIGURACION_TOKENS.md § «8. Parte G · Después de configurar: los dos disparos de puesta en marcha»`; (2) la sesión lee el censo de cobertura en `https://portafolio-estrategico.vercel.app/api/diagnostico?token=<su token>` (`columnas_historicas`) y lo escribe en la memoria con cifras; (3) una fila republicada muestra «Republicado el … (puede ser una adenda o una publicación de fase: mire el proceso en SECOP II)» y una por lotes «Proceso por lotes (N): …»; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: los registros anteriores a la extracción no traen la columna (sin dato, no «no»); no afirmar «adenda»; «puede presentarse a uno solo» no tiene fuente; medir los bytes por fila.
- **Decide el dueño antes**: nada (la extracción completa es un paso, no una decisión).
- **Cierre**: —

### Tanda 14 · El pliego: consorcio, estampillas y documentos tipo

- **Objetivo**: cuando hay pliego, el expediente dice con página qué exige en consorcio, el modal de la entidad acumula las estampillas vistas, y la tarjeta deduce con cautela qué documentos tipo probablemente rigen.
- **Datos**: D-56, D-58, D-59. Remate: la frase de `lib/guia_proceso.js:535` («suele tener que participar con un mínimo (30 % a 40 %)») pasa a «lo fija el pliego», porque no tiene fuente en el árbol y contradice `docs/MEMORIA.md § «Por qué se escoge —o se cambia— de socio: siete razones con su norma (11-sep-2026)»` (informe A5 § 6.2).
- **Módulos y qué cambia**: `lib/dictamen_reglas.js` (tres detectores con evidencia y página; exclusión de la negación y del «no aplica» de plantilla; sube `REGLAS_VERSION`); `lib/deducciones.js` (`porcentajeJuntoA` reutilizado; acumulador por entidad); `lib/documentos_proceso.js` y `lib/handlers/pliego/documentos.js` (escritura del acumulador con fecha, deduplicado por `id_proceso`); `lib/socio_por_proceso.js` (`avisoMipyme` pasa a hecho cuando el pliego lo dice; `repartoSugerido` toma la cifra del pliego); `lib/consorcio.js` (la advertencia se conserva cuando no hay pliego); `lib/dictamen.js` (documento tipo probable con regla de sector declarada y `NORMAS_CITABLES`); `lib/guia_proceso.js:535`; `public/expediente.js` y `public/app.js` (expediente y modal de la entidad); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «La cláusula gana al índice: el detector del pliego ya no cita la tabla de contenido (3-sep-2026)»`, `docs/MEMORIA.md § «Los documentos del proceso se leen solos al guardar en Mis procesos (3-sep-2026)»`, `docs/MEMORIA.md § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)»`, `docs/MEMORIA.md § «Las deducciones se LEEN del pliego (ago 2026 · punto 6 de la hoja de ruta)»`, `docs/MEMORIA.md § «Lo APARCADO por decisión del dueño (20-ago-2026)»`, `docs/MEMORIA.md § «Por qué se escoge —o se cambia— de socio: siete razones con su norma (11-sep-2026)»`, `docs/MEMORIA.md § «Investigación de contraste (ago 2026) — correcciones al manual y hallazgos verificados»`, `docs/MEMORIA.md § «Las 12 señales de pliego sastre»`, `docs/MEMORIA.md § «Don Héctor · la hipótesis verificada contra fuentes vigentes y el diseño del dictamen del pliego, sin código todavía (2-sep-2026)»`, `docs/MEMORIA.md § «Leer el cronograma es público; guardar sus fechas, no (13-sep-2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) `detectar()` con las tres cláusulas → tres hechos con página (FALLA contra el árbol de hoy: devuelve un objeto vacío); con «Convocatoria limitada a Mipyme: no aplica» → no limita — mutación: una regex por título; (b) el porcentaje se lee junto a su concepto: una línea con dos porcentajes no toma el primero; (c) subir `REGLAS_VERSION` recalcula los hechos guardados; (d) acumulador: dos versiones del mismo pliego → un proceso; dos pliegos con cifras distintas → rango; fecha real de lectura; (e) documento tipo: sector inequívoco y fecha con margen → «probablemente»; frontera de febrero → nada; sin sector → nada; (f) la frase de la guía ya no afirma «30 % a 40 %».
- **`E2E_SOLO`**: `unidad DICTAMEN DEL PLIEGO`, `unidad socio por proceso`, `unidad texto`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: el expediente y el modal de la entidad; consola limpia.
- **Criterio de cierre**: (1) al guardar un proceso con pliego leído (la lectura ya es automática al guardar; el dictamen se pide con `/dictamen <id_proceso>` en una sesión de Claude Code, como describe la habilidad `dictamen` del repositorio), el expediente muestra las cláusulas de consorcio con página; (2) el modal de la entidad muestra «Estampillas vistas en pliegos de esta entidad: …»; (3) una fila con sector inequívoco muestra plegado «Probablemente rigen los documentos tipo…»; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: la plantilla de Documentos Tipo dice «no aplica» donde no limita (la lección de `SIN_ANTICIPO_RE`); el NIT de entidad suma regionales; enlazar deducciones a Precios sigue aparcado por el dueño; la resolución de documentos tipo no se leyó desde aquí.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 15 · Las socias: contratos por perfil

- **Objetivo**: la experiencia por contratos se guarda por perfil (hoy una clave única en la que la de una socia taparía a la otra), el panel enseña a PRODIAC, y el expediente dice qué contratos del tipo del pliego tiene registrados cada socia.
- **Datos**: D-57 (y el hermano `resumenPerfiles` con `prodiac`).
- **Módulos y qué cambia**: `lib/almacen.js` (`config:experiencia:{perfil}`); `lib/experiencia.js` (`guardarExperiencia(redis, perfil, contratos)` y lectura por perfil; migración de la clave vieja como `genesis` una sola vez); `lib/handlers/admin/experiencia.js` (`?perfil=`; `origen=repositorio` sigue siendo Génesis); `lib/cobertura_rup.js` (lee por perfil); `lib/handlers/admin/rup.js` (`resumenPerfiles` incluye `prodiac`; los mensajes del `DELETE` listan los perfiles reales); `public/expediente.js` (una línea por socia con objeto y valor, clasificada con `tokenizar`/`similitud`); `tests/e2e.js`. Si el dueño lo aprueba (pregunta 10), `EXPERIENCIA_PENDIENTE.md` pasa de la raíz a `docs/` con ficha y sus citas actualizadas en el mismo commit.
- **Memoria obligatoria**: `docs/MEMORIA.md § «Experiencia ejecutada y cobertura del RUP (ago 2026)»`, `docs/MEMORIA.md § «Los tres RUP, leídos enteros, y PRODIAC entra como segunda socia (11-sep-2026)»`, `docs/MEMORIA.md § «Datos del negocio (fuente de verdad)»`, `docs/MEMORIA.md § «El tamaño de empresa se lee del certificado, y hay UNA sola lista de tamaños (11-sep-2026)»`. **SUPERADA**: si la sección de ago-2026 afirma la clave única como decisión, recibe la marca; si solo la describe, se anota en la sección nueva.
- **Pruebas ANTES (y su mutación)**: (a) guardar contratos de `genesis` y después de `prodiac` conserva los de `genesis` (FALLA contra el árbol de hoy: se tapan); (b) `resumenPerfiles` incluye `prodiac` (FALLA hoy); (c) sin archivo de PRODIAC → «sin cargar», nunca 0; (d) la clasificación por objeto usa `tokenizar`/`similitud` — mutación: una regex nueva (el censo la caza); (e) la clave vieja se lee como `genesis` una vez y no se pierde.
- **`E2E_SOLO`**: `unidad experiencia/cobertura`, `unidad perfiles contra el RUP`, `unidad modo cuenta`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: el panel y el expediente; consola limpia.
- **Criterio de cierre**: (1) el dueño carga los contratos de Génesis desde el panel `https://portafolio-estrategico.vercel.app/#/admin` con el botón **«1 · Cargar Experiencia Génesis»** y comprueba en `https://portafolio-estrategico.vercel.app/api/admin/experiencia?perfil=genesis&token=<su token>` cuántos hay; (2) `…?perfil=prodiac&token=<su token>` responde «sin cargar» hasta que el dueño aporte el archivo; (3) el expediente muestra «Génesis tiene registrados N contratos de … por $X» y «PRODIAC: contratos sin cargar»; (4) 4/4; navegador; (5) memoria y generados; (6) pull request fusionado.
- **Trampa conocida**: la clave única tapa; `EXPERIENCIA_PENDIENTE.md` (en la raíz) es el contrato del archivo; no se dice «acredita»; los 327 de PRODIAC son un conteo del certificado, no un archivo.
- **Decide el dueño antes**: preguntas 8 y 10 de la sección 7.
- **Cierre**: —

### Tanda 16 · La sonda y la capacidad de verdad

- **Objetivo**: existe una sonda fechada a datos.gov.co que dice qué datasets responden, con qué claves y con qué cobertura; y la capacidad del dueño descuenta sus contratos en ejecución consultados a SECOP II, guardados por perfil con fecha, con el certificado a mano ganando.
- **Datos**: la sonda M-DGF-17 (pendiente desde `docs/MEMORIA.md § «Qué quedaba de la consultoría del 4-sep, medido contra el árbol (12-sep-2026)»`; `tests/sondear_fuentes.js` no existe) y D-60.
- **Módulos y qué cambia**: la sonda, según la pregunta 9: como `op` protegida en `api/procesos.js` que corre en Vercel (que sí tiene red) y devuelve el JSON, o como guion en `tests/`; `lib/capacidad.js` (`c.v || 0` → contrato «sin valor» excluido con aviso; sin plazo no se cuenta el saldo entero en silencio; devuelve el hecho «asumido 0»); `lib/socio.js` (`consultarContratos` reutilizada por perfil; `nitONull`/`digitos`); `lib/handlers/perfil/seguimiento.js` (`resumirVigentes` compartida); `lib/config_rup.js` (SCE guardado por perfil con fecha; contratos excluibles); `lib/handlers/admin/rup.js` (op para consultar y guardar el SCE por perfil); `public/index.html` y `public/app.js` (Mi empresa: botón para consultar los contratos en ejecución en SECOP II, lista con exclusión, fecha; el renglón de P2 lee el guardado); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «La pantalla prometía una revisión horaria que nadie hacía (12-sep-2026)»`, `docs/MEMORIA.md § «Puertas, probabilidad y valor esperado (ago 2026)»`, `docs/MEMORIA.md § «Los tres RUP, leídos enteros, y PRODIAC entra como segunda socia (11-sep-2026)»`, `docs/MEMORIA.md § «Cómo ejecuta sus contratos: jbjy-vk9h en vivo (ago 2026)»`, `docs/MEMORIA.md § «Verifique a su socio antes de firmar (ago 2026)»`, `docs/MEMORIA.md § «Qué quedaba de la consultoría del 4-sep, medido contra el árbol (12-sep-2026)»`, `docs/MEMORIA.md § «La cifra que decía «Puede facturar hasta» era el TECHO, no la K (13-sep-2026)»`, y `docs/datos.md §3` (reglas de acceso) y `docs/datos.md §5.2` (jbjy). **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) `calcSCE` con un valor nulo excluye el contrato con aviso, no lo cuenta como 0 (FALLA contra el árbol de hoy); sin plazo no cuenta el saldo entero en silencio; (b) el SCE guardado por perfil con fecha lo lee `evaluarPuertas`; sin guardado el mensaje dice «sin descontar contratos en ejecución» (campo de la tanda 4); (c) el certificado cargado a mano gana — mutación: preferir jbjy; (d) un contrato plural queda con participación desconocida y excluible; (e) la consulta a jbjy no corre en `op=listar` — mutación: llamarla desde `listar` (la unidad sin `fetch` la delata); (f) la sonda: cada fuente con fecha, HTTP, conteo y claves observadas; un 403 se registra como «no verificable hoy» con fecha, no como error.
- **`E2E_SOLO`**: `unidad capacidad`, `unidad socrata`, `unidad tiempo de espera`, `unidad simulador con conocimiento`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: Mi empresa con la lista de contratos vigentes; consola limpia.
- **Criterio de cierre**: (1) si la sonda es una `op`: el dueño pega `https://portafolio-estrategico.vercel.app/api/procesos?op=sondear&token=<su token>` y lee, por dataset, HTTP, filas, claves, cobertura y fecha; (2) en Mi empresa pulsa el botón nuevo y ve sus contratos vigentes con valor, plazo, saldo estimado y fecha de consulta, y la capacidad baja en consecuencia; (3) 4/4; navegador; (4) memoria y generados; (5) pull request fusionado.
- **Trampa conocida**: datos.gov.co responde 403 a las sesiones (observación con fecha, no propiedad del entorno: se vuelve a llamar antes de darlo por perdido); jbjy sobrestima el SCE en contratos plurales; el certificado gana; nada externo en la ruta de una petición.
- **Decide el dueño antes**: pregunta 9 de la sección 7.
- **Cierre**: —

### Tanda 17 · El competidor fuera del corpus

- **Objetivo**: el perfil del competidor gana, en un segundo paso, el cara a cara ante la entidad y la cifra de todo SECOP II; Mis procesos dice cuántos archivos de oferta se cargaron sin afirmar cuántas empresas.
- **Datos**: D-61, D-62, D-63.
- **Módulos y qué cambia**: `lib/competencia_detalle.js` y `lib/handlers/inteligencia/detalle.js` (segundo paso del perfil: `fichaCompetidor` con el NIT de la entidad; `consultarAdjudicaciones` llamada); `lib/socio.js` (`consultarAdjudicaciones` exportada; `:473`); `lib/handlers/perfil/seguimiento.js` (`:352`: suelo de fecha explícito o ninguno declarado); `public/app.js` (pliegue «Ver cuántas veces se ha presentado a esta entidad (consulta en vivo)»; «En todo SECOP II: …»; en Mis procesos el texto de archivos); `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «Lote «B4b-pulso-cobertura» de la consultoría del 4-sep · M-DGF-03, M-DGF-04, M-DGF-12 (6-sep-2026)»`, `docs/MEMORIA.md § «Verifique a su socio antes de firmar (ago 2026)»`, `docs/MEMORIA.md § «Los documentos del proceso se leen solos al guardar en Mis procesos (3-sep-2026)»`, `docs/MEMORIA.md § «Contra quién se ha competido: proponentes en vivo (hgi6-6wh3, ago 2026)»`. **SUPERADA**: ninguna.
- **Pruebas ANTES (y su mutación)**: (a) `fichaCompetidor` se llama, no se duplica — mutación: una segunda consulta (el censo la caza); «desde 2025» no aparece o hay suelo explícito; (b) fallo de la fuente → «sin dato de proponentes hoy» y no se cachea; (c) `consultarAdjudicaciones` exportada; sin NIT → nada; nunca se suma a la cifra del corpus; (d) `resumen.de_proponentes` reutilizado; el texto no dice «nombres de empresa».
- **`E2E_SOLO`**: `unidad socrata`, `unidad tiempo de espera`, `unidad adjudicatario`; después `iteraciones`; 4/4.
- **Navegador (390 px)**: el pliegue del perfil; Mis procesos; consola limpia.
- **Criterio de cierre**: (1) en el perfil de un competidor con NIT, el pliegue muestra «Ante esta entidad: se presentó N veces y ganó M» y «En todo SECOP II: N contratos por $X (todos los años y modalidades publicados)», o «sin dato» si la fuente no responde; (2) en Mis procesos, tras el cierre, «Archivos de oferta cargados: N (no dice cuántas empresas: un proponente sube varios)»; (3) 4/4; navegador; (4) memoria y generados; (5) pull request fusionado.
- **Trampa conocida**: `hgi6` no tiene filas mientras el proceso está abierto; el NIT de entidad suma regionales; tope de 6 s; nunca en la carga instantánea del perfil.
- **Decide el dueño antes**: nada.
- **Cierre**: —

### Tanda 18 · Tras confirmar la llave (condicional)

- **Objetivo**: solo si la sonda de la tanda 16 confirmó la llave y la cobertura: las posturas de todos, cuánto tarda en pagar la entidad y las vistas del proceso.
- **Datos**: D-65, D-66, D-67. Si la sonda no confirma, la tanda no se abre y se anota aquí el motivo con fecha.
- **Módulos y qué cambia**: `lib/proyeccion.js` (`visualizaciones_del` en `CAMPOS`) y `lib/columnas_historicas.js` (censo); `lib/apu/rentabilidad.js` y `lib/handlers/apu/editor.js` (el DSO medido se propone, sin pisar el que el usuario fijó); una vista nueva en `api/inteligencia.js` (plegada como `op`, con la forma literal que lee `tests/mapa.js`) para leer `wi7w-2nvm` y `uymx-8p3j` por clic; `public/app.js`; `tests/e2e.js`.
- **Memoria obligatoria**: `docs/MEMORIA.md § «Puertas, probabilidad y valor esperado (ago 2026)»`, `docs/MEMORIA.md § «Auditoría integral (19-ago-2026): 30 defectos reproducidos y corregidos»`, `docs/MEMORIA.md § «Fase 9 · La portada, la manifestación de interés y los días hábiles (ago 2026 · plan v4)»`, `docs/MEMORIA.md § «Qué quedaba de la consultoría del 4-sep, medido contra el árbol (12-sep-2026)»`. **SUPERADA**: `docs/datos.md §3` y `lib/socio.js:21` afirman que SECOP II no publica multas: si la sonda confirma `it5q-hg94`, se corrige en el mismo commit (informe A4 § 7).
- **Pruebas ANTES (y su mutación)**: las condiciones de cada ficha: llave confirmada y `valor_de_la_oferta` mayor que 0 antes de ordenar; cruce con el adjudicatario descartando «No Definido»; mediana de días de pago con mínimo declarado y «sin dato»; el DSO medido no sustituye al fijado por el usuario — mutación: pisarlo; «Vistas en la plataforma» nunca 0 con vacío.
- **`E2E_SOLO`**: `unidad socrata`, `unidad APU`, `unidad censo de ingesta` (vía `iteraciones`); 4/4.
- **Navegador (390 px)**: los pliegues nuevos; consola limpia.
- **Criterio de cierre**: cada uno de los tres datos aparece con su fecha y su conteo o dice «sin dato»; nunca 0; 4/4; navegador; memoria y generados; pull request fusionado.
- **Trampa conocida**: dos conteos de ofertas con nombres parecidos (D-13 y D-65); el supervisor puede no registrar pagos; las vistas miden miradas.
- **Decide el dueño antes**: nada; la abre solo el resultado de la sonda.
- **Cierre**: —

## 6. Lo que NO se hace, con el motivo

**Los dos datos refutados por el verificador.**

- **D-27 · «Capacidad calculada con un ingreso estimado: cargue el ingreso de su RUP en Mi empresa»**: refutado. El RUP NO reporta el ingreso operacional (`lib/rup_pdf.js:719`: «ingreso_operacional: null, // el RUP no lo reporta»; `lib/perfiles.js:44,99,163`; `lib/perfil_manual.js:97`) y Mi empresa no tiene ningún campo para cargarlo (`grep ingreso public/index.html` → nada; la única entrada es el archivo del RUP, `index.html:1875`; «Actualizar datos» es la sincronización con SECOP, `:2416-2418`); el único camino que acepta `ingreso_operacional` es un JSON por `/api/admin/rup` (`lib/handlers/admin/rup.js:2`), que el usuario sin terminal no puede fabricar. Un texto que manda hacer algo imposible es peor que el chip actual. Lo que sobrevive: la frase sin instrucción dentro de D-12 («… el RUP no trae el ingreso operacional, así que se estima con la utilidad. Sirve para orientar, no para acreditar.»). Hermano anotado: `public/app.js:9046` copia `coDe` con `|| 0`; se sustituye por la regla de `lib/capacidad` (sin dato no es cero) en la tanda 4.
- **D-42 · «Adjudicó 25 obras en 2025 y 10 en lo que va de 2026»**: refutado. `por_anio.n` se acumula DESPUÉS de descartar los procesos sin dato de oferentes (`lib/indice_competencia.js:535-549`), así que no cuenta «adjudicadas» sino «procesos con oferentes publicados»; el histórico es ANCHO (servicios y obra, `lib/handlers/procesos/sync.js:37-40`), no «obras»; y el año cae a la fecha de publicación si falta la de adjudicación (`:740-744`). La memoria ya cerró exactamente este error (`docs/MEMORIA.md § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)»`: «Adjudicados» no es «con dato de oferentes»). Solo sobreviviría reescrito («En 2025 esta entidad tuvo 25 procesos con oferentes publicados …, según lo que sigue la aplicación»), que no sostiene el beneficio prometido: pregunta 6 de la sección 7.

**Lo que no se puede dar con datos abiertos (sección 3.3), en una línea cada uno.**

- El precio de cada competidor que perdió: p6dx trae solo el valor del ganador; `hgi6-6wh3` no trae precio (`lib/proponentes.js:4-12`); `wi7w-2nvm` sin llave confirmada (D-65, tanda 18).
- Los días reales de pago con jbjy: no publica fechas de pago (`lib/ejecucion.js:18-22`); `uymx-8p3j` sin confirmar (D-66, tanda 18).
- La causal de rechazo de cada oferta: ningún dataset hallado tiene columna de estado ni de causal (informe A4 § 5).
- Observaciones al pliego, informes de evaluación, RUP como dato abierto: no están en datos.gov.co (informe A4 § 5).
- Si la convocatoria quedó limitada a empresas pequeñas y los factores de puntaje: el corpus no lo publica; solo el pliego (D-58). Ningún peso de puntaje se inventa (D-30 lo declara).
- El sitio de la obra de un proceso abierto: `gra4-pcp2` solo para contratos firmados (informe A4 § 5); D-25 dice «sede».
- El generador de la tabla de trazabilidad, los vencimientos de los documentos del usuario, el equipo del usuario, el protocolo de indisponibilidad de SECOP II: no son datos de la fila.
- Las cifras de tiempo para armar una oferta que da la web: sin página leída; no se pintan.

**Textos y mecanismos que los diseños proponían y el árbol desmintió (no se escriben).**

- «Con datos hasta el 31 de agosto» en el perfil (D-04): `meta.construido` es la fecha en que se armó el resumen, no la cobertura; se escribe «Resumen armado el …».
- «SECOP no publica el NIT de esta empresa» (D-05): `claveAdjudicatario` decide por contrato; la misma empresa puede tener otro perfil por NIT; se escribe «En estos contratos SECOP no trae el NIT…».
- «Sin anticipo (lo dice el pliego)» (D-11): la fuente es el objeto publicado, no el pliego.
- «Cargue el ingreso de su RUP» (D-27) y «Adjudicó N obras» (D-42): refutados, arriba.
- «Proceso por lotes: puede presentarse a uno solo» (D-55): lo fija cada pliego; sin fuente en el árbol ni en el manual.
- «Desde 2025» en el cara a cara (D-61) y «desde 2024» en «todo SECOP II» (D-62): las consultas no filtran por fecha.
- «Se leyeron 3 nombres de empresa» (D-63): no existe lector de nombres; archivos no son oferentes.
- «Cierra entre el 20 de diciembre y el 10 de enero» atribuido al manual (D-38): la señal #10 dice «23 de diciembre, Semana Santa, cierres puente»; una ventana propia solo como heurística declarada.
- «Índice» e «histórico» en pantalla (D-04), «Mipyme» (D-01, D-40, D-58), «acredita» y «(RUP 2023)» (D-57), «Baja media» para una mediana (D-78): vocabulario que las cercas o la regla de nombres no admiten.
- Una carencia condicional dentro de `carenciasDe` (D-01): la contrafáctica llama la cadena que ya existe y cubre también la caja.
- Ampliar `competenciaDe` con los hechos de adjudicación (D-39): perdería las entidades con desenlaces y sin conteos («sin dato» con cerradura); se llama `hechosDeEntidad`.
- Derivar el plazo en el cliente (D-28): `plazoMesesDe` vive en `lib/`; y la guarda «nulo sin duración» ya existe en la guía.
- Recortar `ganancia` a cuatro claves (D-15): rompe `bloqueGanancia`; pregunta 7.
- Cambiar el 0 de `cuantia_cop` a `null` en la API (D-18): cruza a docenas de consumidores (decisión del 1-sep).
- Decidir el grupo «sin cuantía» con `ve === 0` (D-18): también es 0 con cuantía y probabilidad 0.
- Un chip «Adjudica en ~7 días de oficina ›» arriba (diseño experimentado, D-39): dos de tres lentes lo dejan plegado; arriba ya hay demasiado.
- «Ver el 20 % del reparto de respaldo como norma» (D-01): el 20 % «porque por encima del 10 % el socio sigue contando para los criterios diferenciales» no tiene fuente en el árbol (informe A3 § b); se conserva como «sugerido» y D-58 lo sustituye por la cifra del pliego cuando la hay.
- «El que aporta la experiencia suele tener que participar con un mínimo (30 % a 40 %)» (`lib/guia_proceso.js:535`): sin fuente; pasa a «lo fija el pliego» en la tanda 14.

**Lo que ninguna de las tres lentes tomó del censo de datos y se anota para no perderse** (informe A4; todo en grado «diccionario», entraría tras la sonda como `sin fuente`): `ceth-n4bn` (con quién se ha consorciado un NIT y con qué porcentaje), `e2u2-swiw` (modificaciones a procesos), `u8cx-r425` (adición en valor y en días), `it5q-hg94` (multas de SECOP II, que desmiente `docs/datos.md §3` y `lib/socio.js:21`), `mfmm-jqmq` (atraso real frente al plan), `estado_de_apertura_del_proceso` y `estado_resumen` (contraste del «abierto» calculado).

## 7. Lo que decide el dueño antes de empezar

Preguntas cerradas. Cada una dice qué tanda espera su respuesta.

1. **¿Firma que la tarjeta vuelva a decir CON QUIÉN, en una línea del servidor, y que eso supere en su parte de tarjeta la decisión del 11-sep?** Sí / No. Espera: tanda 1. **Recomendación: Sí.** Los cuatro motivos del 11-sep se respetan (una redacción, peso de 96-184 B por fila, el congelado intacto con su fecha, el porqué en el expediente); lo que cambia es que el consejo de hoy se ve sin guardar, que es lo que usted pidió primero. Sin la firma, D-01 no entra (condición del verificador).
2. **¿Publica la tarjeta quién más gana en la entidad, solo con credencial (nombre y cuota; nunca NIT ni valores en la fila)?** Sí / No. Espera: tanda 2. **Recomendación: Sí.** Supera en su letra el comentario de `lib/indice_competencia.js:1167-1168`, conserva a quién protege (sin credencial nada; credencial inválida 401) y es lo que pone el perfil a un clic. Si No, el perfil queda a dos clics desde el modal de la entidad (D-07) y D-02 se retira.
3. **La cifra del anticipo en la línea de socio.** A) La tanda 1 escribe la línea sin cifra («Solo si el pliego trae anticipo; sin anticipo, con PRODIAC (80/20).») y la cifra entra en la tanda 4 con el umbral combinado de las dos puertas. B) Toda la línea condicional espera a la tanda 4. Espera: tandas 1 y 4. **Recomendación: A.** La línea sin cifra es cierta desde el primer día; la cifra de una sola puerta sería una cifra creíble y falsa cuando manda la otra (medido por el verificador).
4. **¿Quiere ver en el expediente «Hoy, con los datos actuales, diría: …» junto al consejo congelado, cuando difieran?** Sí / No. Espera: ninguna tanda (se añadiría a la 11). **Recomendación: No por ahora.** Son dos juicios en la misma pantalla y el expediente ya dice la fecha del consejo; la tarjeta ya dará el de hoy.
5. **El badge del panel de resumen («Poca competencia — promedio 1,4 oferentes en 55 procesos»)**: A) se alinea con la tarjeta (una sola redacción del mismo hecho); B) se conserva y se declara en la memoria con motivo. Espera: tanda 7. **Recomendación: A.**
6. **El dato refutado D-42, reescrito como «En 2025 esta entidad tuvo 25 procesos con oferentes publicados (10 en lo que va de 2026), según lo que sigue la aplicación»: ¿entra?** Sí / No. Espera: tanda 10. **Recomendación: No.** Mezcla obra con servicios, cuenta solo procesos con oferentes publicados y el año puede ser el de publicación: no sostiene «dónde invertir relación», que era su único beneficio.
7. **El peso de `ganancia` en la fila (2,9 KB medidos, el 40 % de la fila)**: A) no se recorta hasta que `por_pagina=100` se acerque al corte de 4,5 MiB; B) se recorta a la lista mínima que `bloqueGanancia` y el modal leen. Espera: tanda 5. **Recomendación: A.** La lista pide 20 filas por defecto; se mide en cada tanda.
8. **¿Aporta el archivo de contratos ejecutados de PRODIAC (con el contrato de campos de `EXPERIENCIA_PENDIENTE.md`)?** Sí / No. Espera: tanda 15. Sin él, D-57 dice «PRODIAC: contratos sin cargar» (nunca 0) y el reparto sugerido sigue basándose en la actividad inscrita, no en contratos.
9. **La sonda a datos.gov.co (M-DGF-17)**: A) una `op` protegida del router de procesos que corre en Vercel, donde sí hay red, y devuelve el JSON para leerlo en Chrome; B) un guion `tests/sondear_fuentes.js` que corre alguien con red. Espera: tanda 16. **Recomendación: A.** Usted no tiene terminal y las sesiones de trabajo hoy reciben 403 de datos.gov.co; una `op` se pliega en el router sin archivo nuevo y se dispara pegando una URL.
10. **¿Mueve `EXPERIENCIA_PENDIENTE.md` de la raíz a `docs/` con ficha (regla de documentos)?** Sí / No. Espera: tanda 15. **Recomendación: Sí**, en el mismo commit de la clave por perfil, con `git mv` y las citas actualizadas (informe A6 § 2.3).
11. **La piel v4 pendiente (V4-13 animación de entrada de la tarjeta, V4-19 mecanismo de los modales, V4-20 rejillas) choca con las tandas 3, 5, 6 y 7**: A) esas tandas se diseñan sabiendo que llega (sin keyframes nuevos, sin tocar `--dur-5`) y la piel v4 sigue después; B) se hace primero la piel v4. Espera: tanda 3. **Recomendación: A.**

## Anexo A · Inventario completo de lo que hoy se enseña (tabla de A1)

Censo de la tarjeta de Licitaciones (`public/app.js`, `tarjeta(l)`, `:2133-2230`) hecho el 13-sep-2026 con el handler real de `op=listar` contra el mock de Upstash de la suite y las funciones reales de `app.js` (informe A1 § 1; reproducciones en su § 6). Certeza: publicado · medido · calculado · estimado · supuesto. Cuándo: sync · petición · al pintar · al pulsar. Dónde: arriba · plegado («Más detalles») · pie · modal.

| # | Texto en pantalla | Campo | Módulo (ancla) | Certeza | Cuándo | Sin dato | Dónde |
|---|---|---|---|---|---|---|---|
| 1 | Título (o el id, o «Proceso sin nombre») | `nombre_del_procedimiento`, `id_del_proceso` | proyección (`lib/proyeccion.js:37-46`) | publicado | sync | «Proceso sin nombre» (`app.js:2149`) | arriba |
| 2 | «ENTIDAD · Departamento» | `entidad`, `departamento_entidad` | proyección | publicado | sync | «Entidad no informada»; departamento «no definido» se omite (`:2150`) | arriba |
| 3 | «$ 800.100.050» + «cuantía alta/media/baja» | `cuantia_cop`, `cuantia_rango` | `enriquecer` (`lib/negocio.js:207-211`; tramos `:34-35`) | publicado (cifra) · calculado (tramo) | sync | «Cuantía no publicada» (`:2153-2158`); `cuantia_cop` viaja 0 y la tarjeta lo trata como ausencia | arriba |
| 4 | Chip rojo «No viable — K · Caja» y tarjeta al 50 % | `viable`, `puertas.no_viable_por` | `evaluarPuertas` (`lib/puertas.js:305-350`) | calculado | petición | solo con `viable === false` | arriba |
| 5 | Línea de requisitos («● Cumple los requisitos…», «…con detalles por revisar», «Supera su capacidad…», «Esta obra no encaja con su RUP», «Todavía no admite ofertas…», «…el plazo para avisar… ya venció…») | `puertas.p1_rup/p2_k/p3_caja`, `manifestacion.estado`, `filtro.admite_ofertas` | `lineaRequisitos` (`app.js:1718-1743`) | calculado | petición | cuantía ausente → P2 y P3 `sin_dato` y pasan → «con detalles por revisar» | arriba |
| 6 | «Solo no le alcanza; con un socio, sí. Guárdelo…» / «…se acerca, pero puede no bastar…» | `socio` = `{tipo, cierra_todo}` | `socioPorProceso` → `resumenSocio` (`listar.js:109-113`) | calculado | petición (solo la página) | `tipo` ≠ `con_socio` → nada (`app.js:2016-2020`) | arriba |
| 7 | Celda 1 «~9 empresas suelen competir · en 40 procesos» / «— · sin histórico de competencia · supuesto: 5 rivales» | `competencia_entidad.promedio_oferentes`, `.total_procesos` | `competenciaDe` (`lib/indice_competencia.js:1213-1231`) | medido (mínimo 5) | petición (lectura); el hash, en la cadena del histórico | «—» + «supuesto: 5 rivales» (`app.js:2075`) | arriba |
| 8 | Celda 2 «1 de 9 · se gana, aproximadamente» + nota | `p_ganar`, `p_ganar_detalle` | `estimarPDetalle` (`lib/probabilidad.js:445-462`); `frecuenciaNatural` (`app.js:1797-1802`) | estimado, con supuesto de 5 rivales sin histórico | petición | nunca vacía: sin histórico pinta una cifra sobre el supuesto (H2) | arriba |
| 9 | Celda 3 (a) con costo medido: «−$3M · podría perder, en el peor caso…» | `ganancia` con `base: "apu"` | `gananciaDeProceso` (`lib/ganancia.js`) sobre `lib/apu/piso_techo` | calculado sobre costo medido | petición (con credencial y borrador) | sin borrador → (b), (c) o (d) | arriba |
| 9b | Celda 3 (b): «$56M · es lo que suele pagar esta entidad · medido en 8 contratos» | `ganancia.precio_esperado`, `origen_precio`, `baja_procesos` | `lib/ganancia.js:388-391` | calculado (cuantía × (1 − mediana)) | petición | — | arriba |
| 9c | Celda 3 (c): «Calcular · cuánto deja: falta su costo · se calcula en Precios» | `ganancia.base === "estructura_de_precio"` | `app.js:1892-1930` | — (no enseña cifra a propósito) | petición | — | arriba |
| 9d | Celda 3 (d): «— · sin cifra de lo que deja» | `ganancia` nula o `valor` nulo | `app.js:1876-1882` | — | petición | sin credencial `ganancia` viaja nula (`lib/publico.js:158`); sin cuantía `motivo: "sin_presupuesto_oficial"` | arriba |
| 10 | «Ver cómo se calcula» | `p_ganar_detalle` (en `title`) | `app.js:2017-2032`; al pulsar `op=probabilidad` (`:3256`) | estimado | petición · al pulsar | sin `id_del_proceso` no hay botón | arriba → modal |
| 11 | Chip «Activo · abierto» | bandera `paaEncendido` | `app.js:2176` | — | solo con el PAA encendido | — | arriba |
| 12 | Chip «Cierra en 31 días · 13 de oct de 2026» / «Cierra HOY» (rojo ≤ 3 días, ámbar ≤ 7) | `fecha_cierre` | `fechaCierre` (`lib/negocio.js:181`); días en cliente (`app.js:1425-1428`) | publicado (fecha) · calculado (días) | sync · al pintar | sin fecha legible no se pinta nada (H6) | arriba |
| 13 | Chip «Avisar que le interesa · …» (cuatro estados, siete textos) | `manifestacion.*` | `manifestacionDeFila` (`lib/manifestacion.js:298-327`) | calculado; publicado si confirmada | petición | modalidad que no la exige → nada; `sin_fecha` → «fecha por confirmar en SECOP II» | arriba |
| 14 | Banda «● Poca competencia · 1,6 en 12 ›» / «Sin datos históricos de esta entidad» | `competencia_entidad.{nivel, promedio_oferentes, total_procesos}` | `bandaCompetencia` (`app.js:1606-1620`) | medido (nivel por tertiles) | petición | «Sin datos históricos…» sin cifra | arriba → modal `op=entidad` |
| 15 | Chip de zona («Su zona (Ibagué)», «Cerca · ~120 km de Bogotá», «Lejos…», «Acceso difícil», «… verifique la seguridad de la zona», «Distancia sin calcular…») | `zona.*` | `evaluarZona` (`lib/accesibilidad.js`) | estimado (km por departamento) | petición | sin base «Distancia sin calcular…»; sin departamento «Zona sin clasificar» | arriba |
| 16 | Chip «Cierre prorrogado» | `_cierre_prorrogado` | `leerChunksDedup` (`lib/almacen.js:370-371`) | medido entre versiones | petición | falso o ausente → nada | arriba |
| 17 | Aviso ámbar «Atención: aquí se presentan 1,6 oferentes en promedio…» | `competencia_entidad.promedio_oferentes` < 2 | `avisoCompetencia` (`app.js:1465-1474`) | medido | petición | sin base → nada; no en no viables | arriba |
| 18 | Aviso rojo «Cierra HOY…» / «Cierra mañana…» / «…a más tardar mañana…» | `fecha_cierre` (≤ 2 días) | `avisoCierre` (`app.js:1477-1485`) | calculado | al pintar | nada | arriba |
| 19 | Aviso de manifestación («La ley da un MÁXIMO de 3 días de oficina…») | `manifestacion.*`, `plazo_maximo_habiles` | `avisoManifestacion` (`app.js:1526-1556`) | calculado; publicado si confirmada | petición | nada si no aplica | arriba |
| 20 | «Puede mover el precio $ X entre su precio mínimo (…) y el precio al que suele adjudicar esta entidad (…)» / «Sin referencia — …» | `margen_estimado.*` | `margenDe` (`listar.js:718-751`) | calculado | petición, solo con `?ordenar_por=margen` y credencial | `valor` nulo → la frase del motivo | arriba |
| 21 | Cuadro «La entidad cambió las reglas de este proceso…» + «● Cierre: pasó de … a …» / «○ Plazo: … No le afecta.» | `adendas.*` | `evaluarAdendas` (`lib/adendas.js:44-100`) sobre `_cambios` (`lib/almacen.js:378-384`) | medido entre versiones · calculado (si le afecta) | petición (solo filas con `_cambios`) | sin cambios no viaja | arriba |
| 22 | Plegado: chips «● Registro de proponente ✓/✗/~/?» «● Capacidad de facturar» «● Caja» «● Competencia» y un renglón por puerta con su `mensaje` («Consume 14 % de su capacidad residual (CRPC … / K …)», «Necesitaría financiar ≈ $… y su patrimonio es $…», «Competencia alta: promedio 9.4 oferentes en 40 procesos del histórico») | `puertas.p1_rup..p4_competencia.*` | `lib/puertas.js` (`p1Rup:105`, `p2K:120`, `p3Caja:225`, `p4Competencia:273`); `badgesPuertas` (`app.js:1675-1690`) | calculado sobre el perfil | petición | `sin_dato` → «?» y el mensaje dice qué falta; sin credencial los mensajes van sin cifras (`lib/publico.js`) | plegado |
| 23 | Chip «Anticipo 30%» / «Anticipo no declarado» | `anticipo_pct` | `anticipoDe` (`lib/negocio.js:108`) | estimado (regex sobre el objeto) | sync | «no declarado» también cuando el pliego dijo «sin anticipo» (H1) | plegado |
| 24 | Chip «Suelen bajar 7 % (unos $4M)» / «Suelen bajar: sin datos» | `baja_mercado.*`, `cuantia_cop` | `bajaDeMercado` (`lib/indice_baja.js:885-940`); `chipBaja` (`app.js:1349-1366`) | medido (mediana) · calculado (pesos) | petición | «sin datos»; sin credencial viaja nulo | plegado |
| 25 | Chip «BOGOTÁ D.C. ✓» / «MEDELLÍN» / «Ubicación n/d» | `ciudad_entidad`, `ubicacion_valida` | `ubicacionValida` (`lib/negocio.js:170`) | publicado (ciudad) · calculado (✓) | sync | «Ubicación n/d» | plegado |
| 26 | Chips «Encaja con su registro ✓» / «Encaja por familia ~» / «Encaja por afinidad ≈» / «Objeto sugiere obra» / «No encaja con su registro ✗» + «Obra civil» / «Consultoría» | `rup.tier`, `rup.unspsc.*`, `rup.pertinencia.*` | `evaluarRup` (`lib/rup.js:92-145`); `badgesRup` (`app.js:1579-1588`) | calculado | petición | tier ausente → «No encaja… ✗» | plegado |
| 27 | Chip «Capacidad calculada con ingreso estimado» | `rup.co_estimado` | `lib/rup.js:138` | supuesto (CO = utilidad × 16,7) | petición | sin credencial nulo → no se pinta | plegado |
| 28 | Chip «Licitación pública» / «Selección abreviada menor cuantía» | `modalidad_de_contratacion` | proyección | publicado | sync | nada | plegado |
| 29 | Chip «Precios unitarios» / «Precio global» | `tipo_precio` | `tipoPrecio` (`lib/negocio.js:267-274`) | estimado (regex) | petición | nulo (ninguno o los dos) → nada | plegado |
| 30 | Pie «Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos.» + frase del servidor | `baja_departamento.*` | `bajaDepartamentoDe` (`lib/indice_baja.js:988-1035`); `lineaBajaDepartamento` (`app.js:1378-1390`) | medido | petición | nulo (sin departamento o sin credencial) → nada; bajo el mínimo «sin dato» con el conteo | plegado |
| 31 | Estado «Publicado» / «Convocado» | `estado_del_procedimiento` | proyección | publicado | sync | cadena vacía | pie |
| 32 | Botón «Guardar» / «Guardado · me interesa / me presenté / descartado» | `id_del_proceso` + mapa `guardados` | `botonGuardar` (`app.js:3553-3567`) | — | al cargar Mis procesos | sin id no hay botón | pie |
| 33 | Botón «Calcular mi precio» (abre Precios con objeto, entidad, NIT, departamento, código, cuantía, id, modalidad, tipo, perfil; `plazo_meses` se lee y no viaja: H4) | varios | `qApu` (`app.js:2114-2126`) | — | al pulsar | — | pie |
| 34 | Enlace «Ver en SECOP II ↗» | `urlproceso` | `urlDeFila` (`lib/proyeccion.js:77-81`), `urlSegura` | publicado | sync | sin URL http(s) no hay enlace | pie |

Notas del censo: los `title` llevan además la frase completa de cada celda, los tres mensajes de puertas, el detalle del encaje, el mensaje largo de la zona, la fuente y la banda de la probabilidad y la cuenta de la ganancia; en teléfono no existen. El porcentaje de probabilidad no se pinta en la tarjeta (decisión de `docs/MEMORIA.md § «FILOSOFÍA DEL PRODUCTO (ago 2026) · la regla que manda sobre las demás»`). Peso medido de una fila con credencial en el fixture: mediana de unos 7,8 kB, de los que `ganancia` son unos 3,1 kB; en producción las filas pesan más por la descripción (hasta 700 caracteres).

## Anexo B · Veredicto de verificación de cada dato

Veredictos del 13 y 14 de septiembre de 2026, emitidos por verificadores que ejecutaron las funciones reales del árbol (guiones y salidas en el directorio de trabajo, Anexo C). Un dato «con condiciones» entra con ellas escritas en su ficha (sección 4); un «refutado» no entra (sección 6). Las cifras van sin separador de millares para que ninguna cita resuelva a una sección equivocada.

- **D-01** · con condiciones · Motivo: el hecho se reproduce (con anticipo sin publicar la fila dice «solo» porque `carenciasDe` solo mira `pasa === false`; la contrafáctica da PRODIAC 80/20 y con 30 % vuelve a «solo»), pero la cifra «X % o más» solo existe para P2 y desmiente una decisión escrita con petición literal del dueño; «Mipyme» es jerga. · Evidencia: `lib/socio_por_proceso.js:96-102`, `:282-296`, `:379-383`; `lib/puertas.js:183-205`, `:222`, `:238-254`; `listar.js:109-113`, `:935-938`; `rep_d01.js`, `rep_costo_d01.js` (0,299 y 0,559 ms por fila), `rep_lenguaje.js`. · Memoria: § «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea (11-sep-2026)», § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)», § «Un proceso que se alcanza con socio ya no se esconde (11-sep-2026)».
- **D-02** · con condiciones · Motivo: todo lo nombrado existe; contradice el comentario-contrato de `lib/indice_competencia.js:1167-1168` y `sinFinanzas` no toca `competencia`. · Evidencia: `lib/equivalencias.js:72-88`; `lib/indice_competencia.js:186`, `:1213-1231`; `lib/competencia_detalle.js:440-447`; `lib/publico.js`; `public/app.js:1606-1622`, `:3382`; `tests/e2e.js:20786-20793`. · Memoria: § «Competencia histórica por entidad (jul 2026)», § «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)», § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)».
- **D-03** · con condiciones · Motivo: la op, la función y el bucle existen; la clave nueva no existe; lo medido del prototipo no es verificable aquí. · Evidencia: `api/inteligencia.js:17-24`; `lib/competencia_detalle.js:547-607`, `:558`, `:134`, `:664-669`; `lib/indice_competencia.js:87`, `:908`; `lib/almacen.js:133`. · Memoria: § «Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)», § «Competencia histórica por entidad (jul 2026)».
- **D-04** · con condiciones · Motivo: las piezas existen; «Con datos hasta» afirmaría cobertura desde una fecha de construcción; «índice» e «histórico» son jerga. · Evidencia: `public/app.js:2529-2538`; `public/index.html:1288-1290`, `:1380`, `:791`; `lib/handlers/inteligencia/detalle.js:166,175`; `lib/indice_competencia.js:1080`; `tests/e2e.js:27977-27990`. · Memoria: § «Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)».
- **D-05** · con condiciones · Motivo: confirmado lo que viaja y no se pinta; «SECOP no publica el NIT de esta empresa» afirma más de lo que el dato sostiene. · Evidencia: `lib/competencia_detalle.js:664-674`; `public/app.js:3349-3353`, `:3366-3368`; `lib/equivalencias.js:72-88`; `sync.js:105`. · Memoria: § «Identidad de la entidad…», § «Competencia histórica por entidad (jul 2026)».
- **D-06** · con condiciones · Motivo: diagnóstico correcto; el mecanismo propuesto no es ejecutable en el navegador (no tiene `claveCanonica`). · Evidencia: `lib/competencia_detalle.js:79-80`, `:172`, `:290`, `:490`, `:583`; `grep claveCanonica public/*.js` → 0; ejecutado `claveCanonica` con dos grafías. · Memoria: § «Identidad de la entidad…», § «Competencia histórica por entidad (jul 2026)».
- **D-07** · confirmado · Motivo: la fila solo tiene `title` y `cursor-pointer`; la aserción `:13033` es la que cae. · Evidencia: `public/app.js:2930`, `:2967`, `:3411-3417`; `tests/e2e.js:13033-13035`, `:8663-8680`. · Memoria: § «Lote «B9a-entidad-graficos»…».
- **D-08** · confirmado · Motivo: reproducido Génesis frente a PRODIAC en la misma fila; ningún consumidor. · Evidencia: `rep_d08.js`; `lib/socio_por_proceso.js:282-296`, `:379-383`; `lib/perfiles.js:357`; `listar.js:557`, `:663`, `:920`; `lib/filtros.js:693-696`. · Memoria: § «Un proceso que se alcanza con socio ya no se esconde (11-sep-2026)», § «El veredicto de socio se lee AL GUARDAR…».
- **D-09** · con condiciones · Motivo: cifra y decisión correctas; la premisa «el servidor publica `anticipo_que_cabe_pct`» es falsa; sin credencial la cifra despeja la K. · Evidencia: `lib/puertas.js:176`, `:183`, `:188`, `:201-205`; `lib/rup.js:78-90`, `:50-51`; `lib/publico.js:47`, `:73-82`; `public/app.js:1718-1749`; `v_d09_d16.js`, `v_d09_d16_tarjeta.js`. · Memoria: § ««Sin dato» volvió a ser «cero» en la puerta de la caja, y escondía negocios enteros (13-sep-2026)», § «Lo que esta auditoría enseñó sobre las propias cerraduras (13-sep-2026)», § «La cifra que decía «Puede facturar hasta» era el TECHO, no la K (13-sep-2026)».
- **D-10** · con condiciones · Motivo: estado actual reproducido; la suite no fija «No viable» (fija la forma de `no_viable_por` y los textos de `bloqueSocio`); vivo solo con `cierra_todo` verdadero; el nombre de la socia no viaja. · Evidencia: `lib/puertas.js:328-331`; `listar.js:110-112`, `:554`, `:870`, `:935-938`; `public/app.js:2009-2015`, `:2141-2145`, `:2161`; `public/glosario.js:54,56`; `tests/e2e.js:11940`, `:11496`, `:11959`, `:4725-4735`. · Memoria: § «Un proceso que se alcanza con socio…», § «El veredicto de socio se lee AL GUARDAR…», § «Fase 6 · Traducción de lenguaje (ago 2026 · plan v3, transversal — cierre)».
- **D-11** · con condiciones · Motivo: los tres estados existen; el chip mira solo `pct > 0`; la negación de «pago anticipado» cae en «sin anticipo»; la fuente es el objeto, no el pliego. · Evidencia: `lib/negocio.js:81`, `:89`, `:94-95`, `:108-121`, `:138-144`, `:223-228`; `lib/puertas.js:247`, `:266`; `public/app.js:2192`; ejecutado con `enriquecer`. · Memoria: § ««Sin dato» volvió a ser «cero» en la puerta de la caja…».
- **D-12** · con condiciones · Motivo: cálculos y fórmulas correctos; «no hay ninguno cargado» es falso para `helder`; «SCE asumido 0» no viaja; solo un tier tenía texto; P4 imprime con punto; sin credencial hay que tocar los mensajes públicos. · Evidencia: `lib/puertas.js:69-75`, `:105-118`, `:120-208`, `:225-268`, `:273-295`; `lib/capacidad.js:70-74`; `lib/rup.js:138`; `lib/publico.js:73-82`, `:92-111`, `:199-213`; `tests/e2e.js:29449-29466`; `v_d09_d16.js`. · Memoria: § «Fase 6 · Traducción de lenguaje…», § «La cifra que decía «Puede facturar hasta»…», § ««Sin dato» volvió a ser «cero»…».
- **D-13** · con condiciones · Motivo: fuente y verdad confirmadas; la suite fija el redondeo de `cuantosCompiten.frase`. · Evidencia: `lib/indice_competencia.js:1213-1232`; `listar.js:461`; `public/app.js:1811-1822`, `:2073-2075`; `tests/e2e.js:30528-30538`. · Memoria: § «Dos defectos de producción y sus cerraduras (ago 2026)», § «FILOSOFÍA DEL PRODUCTO (ago 2026) · la regla que manda sobre las demás».
- **D-14** · con condiciones · Motivo: con el supuesto la celda pinta «1 de 6» (no «1 de 5»); la rama «—» es inalcanzable; el modal debe declarar la fuente. · Evidencia: `lib/probabilidad.js:124`, `:311-324`, `:445-451`; `public/app.js:1799-1805`, `:2048`, `:2077-2079`, `:3198`; `listar.js:592`. · Memoria: § «Desglose justificado de P(ganar) (ago 2026)», § «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)», § «FILOSOFÍA DEL PRODUCTO…».
- **D-15** · con condiciones · Motivo: derivación confirmada; el rótulo solo con `origen_precio === "mercado"`; el recorte propuesto rompe `bloqueGanancia`. · Evidencia: `lib/ganancia.js:250-252`, `:388-391`; `lib/apu/piso_techo.js:70-74`, `:186`; `lib/publico.js:157`; `public/app.js:1867-1965`; `listar.js:772-808`; bytes medidos 2960 por fila. · Memoria: § «La tercera cifra de la tarjeta es LA PLATA QUE QUEDA (`lib/ganancia`, ago 2026)», § «Fase 6 · Traducción de lenguaje…».
- **D-16** · con condiciones · Motivo: fuente confirmada; la regla ya existe (`horaCierreDe`, no exportada); «resta 5 h» es frágil: `Date` parsea como local en Bogotá y como UTC en un motor UTC. · Evidencia: `lib/negocio.js:51-54`, `:181-195`, `:237`; `lib/handlers/perfil/entrada.js:305-311`, `:397`; `public/app.js:1425-1441`, `:2136`; ejecutado con `TZ=America/Bogota`. · Memoria: § «El calendario de cierres, y tres bloques menos en Mi empresa (31-ago-2026)», § «La regla de las 24 horas», § «Dos defectos de producción y sus cerraduras (ago 2026)».
- **D-17** · con condiciones · Motivo: los campos viajan; la derivación tal como estaba producía «entre 35 % y 35 %», «Suelen bajar 0 %» y una segunda instrucción de precio. · Evidencia: `lib/indice_baja.js:802-811`, `:825-856`, `:885-934`, `:893-897`, `:905-920`, `:926-932`; `listar.js:466-471`, `:606`, `:858`; `public/app.js:1349-1366`; `public/glosario.js:58`; `tests/e2e.js:13086-13089`; `lib/publico.js:133`; `v_d17_baja.js`. · Memoria: § «Probabilidad: encogimiento…», § «Lote «B9b-competencia-departamento»…», § «La dispersión de la baja se MIDE, no se supone (24-ago-2026)», § «Dónde cae su precio: UNA escala en Piso/Techo · M-DGF-01 (con M-IE-15) (6-sep-2026)».
- **D-18** · con condiciones · Motivo: el hecho es cierto; la segunda frase ya existe en P2; el grupo se decide con `presupuestoOficialDe`, no con `ve === 0`; la memoria prohíbe cambiar el 0 del cable. · Evidencia: `lib/negocio.js:201-204`, `:207`; `public/app.js:2152-2157`; `lib/puertas.js:121`, `:222`; `lib/publico.js:77`; `lib/probabilidad.js:470-475`; `listar.js:153`; `v_d17_d24.js`. · Memoria: § «Auditoría integral del 1-sep-2026 · trece frentes, dos auditores que llegaron y el resto a mano».
- **D-19** · confirmado · Motivo: se pinta en un único renglón; el campo sigue viajando; ninguna cerradura exige el rótulo. · Evidencia: `public/app.js:2131`, `:2156`; `lib/negocio.js:34-35`, `:208-212`; `listar.js:513`, `:638`; `tests/e2e.js:10039`, `:25020`, `:16391`. · Memoria: § «Auditoría integral del 1-sep-2026…».
- **D-20** · con condiciones · Motivo: existe con títulos y botón; el mismo texto vive en el badge del panel y el aviso repite el promedio. · Evidencia: `public/app.js:1606-1621`, `:551-556`, `:1465-1475`; `tests/e2e.js:23608-23614`, `:23348-23358`, `:23566`, `:16344`; `lib/handlers/perfil/resumen.js:125-133`; `listar.js:461-463`. · Memoria: § «Rediseño Apple Glass, eliminación de RUP y probabilidad en frases (ago 2026)».
- **D-21** · con condiciones · Motivo: los campos existen y ya pintan el chip; dos casos dan cifra o lectura falsa (primera versión sin cierre; formatos mezclados). · Evidencia: `lib/almacen.js:329`, `:365-378`; `listar.js:255`; `public/app.js:2177`, `:1835`, `:2136`; `lib/probabilidad.js:126`, `:349`; `lib/adendas.js:63-65`; `sync.js:576-578`; `v_d17_d24.js`. · Memoria: § «Fases 4 y 5 del plan v3 · Guardián del Formulario 1 y vigía de adendas (ago 2026)».
- **D-22** · con condiciones · Motivo: `adendas.n` cuenta campos, no veces; la fecha del último cambio no se guarda. · Evidencia: `lib/almacen.js:340-352`, `:379-386`; `lib/adendas.js:44-102`; `lib/proyeccion.js:39`; `public/app.js:1045-1052`; `listar.js:911`; `v_d17_d24.js`. · Memoria: § «Fases 4 y 5 del plan v3…».
- **D-23** · con condiciones · Motivo: el campo viaja y se pinta plegado; los literales de p6dx varían; hay función de raíz. · Evidencia: `public/app.js:2201`, `:2174`; `public/glosario.js:77-81`; `lib/indice_baja.js:179-186`; `lib/filtros.js:223-226`; `lib/adendas.js:88`. · Memoria: § «Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)».
- **D-24** · con condiciones · Motivo: `tipoPrecio` es conservador; la redacción ya existe en la guía; una cerradura exige conservar los literales. · Evidencia: `lib/negocio.js:262-272`; `listar.js:881`; `public/app.js:2202-2205`; `lib/guia_proceso.js:528-529`; `lib/formulario1.js:84-86`; `lib/dictamen.js:479`; `tests/e2e.js:10988-10990`, `:23566`. · Memoria: § «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos (3-sep-2026)».
- **D-25** · con condiciones · Motivo: los campos viajan; `ciudad_entidad` trae «No Definido» y la guarda solo cubre el departamento; el formato ya existe en el calendario; el costo es ninguno. · Evidencia: `lib/proyeccion.js:42`; `listar.js:841`, `:851`; `public/app.js:2149`, `:2196`; `lib/guia_proceso.js:263`; `public/calendario.js` (`lugarDeEjecucion`, `:282`). · Memoria: § «El lugar de ejecución ES la entidad, «Para Helder» abre la pestaña, y Tailwind medido de verdad (31-ago-2026, segunda pasada)».
- **D-26** · con condiciones · Motivo: el ✓ es `ubicacion_valida`, que filtra, no la zona, que ordena; la suite exige que siga viajando como booleano. · Evidencia: `lib/negocio.js:166-175`, `:232`; `lib/proyeccion.js:30`; `public/index.html:3552-3556`; `public/app.js:1085`; `listar.js:518`, `:639`, `:816-818`; `lib/accesibilidad.js:98-104`; `tests/e2e.js:10049`, `:13962`. · Memoria: § «Auditoría integral del 1-sep-2026…», § «Lote «zona y RUP en PDF» de la consultoría del 4-sep · M-SEG-10, M-INF-01 (6-sep-2026)».
- **D-27** · refutado · Motivo: la instrucción «cargue el ingreso de su RUP» es imposible: el RUP no lo reporta y Mi empresa no tiene campo. · Evidencia: `lib/rup.js:138`; `lib/capacidad.js:90-103`; `lib/rup_pdf.js:719`; `lib/perfiles.js:44,99,163`; `lib/perfil_manual.js:97`; `public/index.html:1875`, `:2416-2418`; `lib/handlers/admin/rup.js:2`; `public/app.js:2198`, `:9046`. · Memoria: § «Puertas, probabilidad y valor esperado (ago 2026)», § «Fase 2 · Puerta de entrada de 60 segundos (ago 2026)», § «La cifra que decía «Puede facturar hasta»…».
- **D-28** · con condiciones · Motivo: `plazoMesesDe` da 12 sin duración; la guarda ya existe en la guía; el resumen publica 12; el editor deja 8 y manda 12 mudo; el costo es petición. · Evidencia: `lib/proyeccion.js:44`; `public/app.js:2122`, `:7345-7347`, `:7410`; `lib/capacidad.js:146-157`; `lib/guia_proceso.js:219`, `:266`; `lib/handlers/perfil/resumen.js:528`; `public/index.html:4022`; `lib/handlers/apu/editor.js:801,868`. · Memoria: § «Investigación de contraste (ago 2026) — correcciones al manual y hallazgos verificados», § «Los pendientes declarados, cerrados (ago 2026)», § «La guía «Don Héctor»…».
- **D-29** · confirmado · Motivo: defecto real reproducido (motivo falso en `title` sin credencial; frase correcta solo en `title` con credencial). · Evidencia: `v_d29_ganancia.js`; `lib/ganancia.js:205-222`; `listar.js:1025`, `:370-376`; `public/app.js:1244`, `:2156`; `public/lista_libro.js:112`; `app.js:1283`. · Memoria: § «Puertas, probabilidad y valor esperado (ago 2026)», § «Rediseño Apple Glass…».
- **D-30** · con condiciones · Motivo: nada modela el puntaje, pero la probabilidad sí ajusta por precio; «Para ganar» sobre tres celdas rotula también «lo que deja». · Evidencia: `lib/probabilidad_desglose.js:348-352`, `:559-561`; `public/app.js:2022-2107`, `:3192-3216`. · Memoria: § «Habilitante vs. puntaje — la distinción más importante del oficio», § «Rediseño Apple Glass…», § «Probabilidad: encogimiento…».
- **D-31** · confirmado · Motivo: la promesa del rótulo es cierta; hoy vive solo en `title`. · Evidencia: `public/app.js:3553-3567`, `:3572-3596`, `:3565`, `:3607`, `:2205-2211`; `lib/guia_proceso.js:416`, `:588`, `:569`; `tests/e2e.js:13940-13948`. · Memoria: § «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)», § «La ficha «Lo que exige este pliego» en Mis procesos y los precios buscados por una sesión de Claude Code en Precios (4-sep-2026)», § «Los documentos del proceso se leen solos al guardar en Mis procesos (3-sep-2026)», § «Segunda pasada del 4-sep-2026: la guía sin cuadros vacíos y Precios en tres pasos».
- **D-32** · con condiciones · Motivo: medido el tope de 6 s por fuente; la caché es una clave con el cuerpo entero; «se presentan» debe ser «se han presentado». · Evidencia: `lib/proponentes.js:45`; `lib/ejecucion.js:37`; `lib/competencia_detalle.js:482-486`, `:523-527`, `:60`, `:132`, `:143-144`, `:178-184`; `lib/handlers/inteligencia/detalle.js:176`; `public/app.js:3289`, `:3110-3111`; `tests/e2e.js:13215-13230`; `lib/handlers/perfil/seguimiento.js:258`; `app.js:4739`. · Memoria: § «Contra quién se ha competido: proponentes en vivo (hgi6-6wh3, ago 2026)», § «Cómo ejecuta sus contratos: jbjy-vk9h en vivo (ago 2026)», § «Mis procesos deja de ser una lista y pasa a ser un EXPEDIENTE en el que se entra (7-sep-2026)».
- **D-33** · confirmado · Motivo: viaja en cada fila; la tarjeta no la pinta, la pantalla de rastreo sí. · Evidencia: `lib/proyeccion.js:40`, `:99`; `listar.js:851`; `lib/publico.js:131-209`; `public/app.js:2148`, `:8465`; `lib/rastreo.js:135`. · Memoria: ninguna.
- **D-34** · con condiciones · Motivo: los campos viajan; la guía ya publica nulo sin duración y legibiliza la unidad; la K usa 12. · Evidencia: `lib/proyeccion.js:44`; `public/expediente.js:405`; `lib/guia_proceso.js:219`, `:266`; `lib/capacidad.js:148-158`; `lib/rup.js:79`. · Memoria: § «La guía «Don Héctor»…».
- **D-35** · con condiciones · Motivo: reproducido 795732961; `cuantia_cop` lleva `|| 0`; el plazo debe ser el publicado. · Evidencia: `lib/negocio.js:207`, `:242-249`; `listar.js` importa `presupuestoOficialDe`. · Memoria: § «La guía «Don Héctor»…».
- **D-36** · con condiciones · Motivo: `habilesEntre` lanza con nulo y da 0 con 1970; ya hay otra cuenta de «le quedan» con otra convención. · Evidencia: `lib/habiles.js:61`, `:97`, `:133-139`; `lib/guia_proceso.js:449-452`; `lib/manifestacion.js:246`; `lib/handlers/procesos/manifestacion.js:55`; `public/calendario.js:220`; `public/glosario.js:86`; `tests/e2e.js:13082`. · Memoria: § «EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS: TRES ES EL TECHO (20-ago-2026)», § «Fase 9 · La portada, la manifestación de interés y los días hábiles (ago 2026 · plan v4)», § «El paso a paso se leía hacia atrás cuando había un festivo en la última semana (13-sep-2026)».
- **D-37** · con condiciones · Motivo: sin publicación `habilesEntre` devuelve 0; con 1970 lanza; el cierre movido ya se sabe por fila. · Evidencia: `lib/proyeccion.js:43`, `:93-95`; `lib/adendas.js:32`, `:61`; `listar.js:911`. · Memoria: § «Fase 9 · La portada…».
- **D-38** · con condiciones · Motivo: la mitad «festivo» es calculable; la ventana 20-dic/10-ene no está en ningún documento; `esFestivo` lanza con nulo. · Evidencia: `docs/GUIA_ANALISTA_LICITACIONES.md` (Palanca 3, señal #10); `lib/habiles.js` (ejecutado). · Memoria: § «El paso a paso se leía hacia atrás…», § «Investigación de contraste…».
- **D-39** · con condiciones · Motivo: el hash publica los hechos y el modal los pinta; `competenciaDe` no los incluye; `hechosDeEntidad` ya se llama por fila desde el calendario. · Evidencia: `lib/indice_competencia.js:479`, `:1132`, `:1210`; `public/app.js:3050-3076`; `lib/handlers/perfil/entrada.js:130-139`. · Memoria: § «Lote «B9b-competencia-departamento»…», § «Remates «R4-remates-inteligencia»…».
- **D-40** · con condiciones · Motivo: umbral, tamaños y regla existen (`avisoMipyme`, que el expediente ya pinta); «tope Mipyme» es vocabulario que la app sustituyó. · Evidencia: `lib/socio_por_proceso.js:48`, `:53`, `:104-115`, `:410`; `lib/perfiles.js:86,121,156`; `public/expediente.js:455-459`; `listar.js:109-113`; ejecutado `avisoMipyme`. · Memoria: § «Con cuál de mis socios conviene ESTE proceso…», § «El tamaño de empresa se lee del certificado, y hay UNA sola lista de tamaños (11-sep-2026)».
- **D-41** · con condiciones · Motivo: «la K del perfil» no es una cifra (`factorE`); `crpc 0` sin cuantía; guardados fuera del corpus sin puertas; el «se asume 0» no aplica a `helder`. · Evidencia: `lib/puertas.js:120-215`, `:307`; `lib/capacidad.js:71-76`, `:106-136`; `lib/seguimiento.js:26-29`, `:529`; `lib/handlers/perfil/seguimiento.js:268-279`; `v_d41_d48.js`. · Memoria: § «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)», § «Puertas, probabilidad y valor esperado (ago 2026)».
- **D-42** · refutado · Motivo: `por_anio.n` cuenta procesos con oferentes publicados, no adjudicadas; el histórico es ancho; el año puede ser el de publicación; la memoria ya cerró este error. · Evidencia: `lib/indice_competencia.js:373-386`, `:535-549`, `:740-744`; `listar.js:853`; `public/app.js:2133-2296`; `sync.js:37-40`. · Memoria: § «Remates «R4-remates-inteligencia»…», § «Lote «B9a-entidad-graficos»…», § «Ingesta ancha / juicio fino y pertinencia (jul 2026)», § «Competencia histórica por entidad (jul 2026)».
- **D-43** · con condiciones · Motivo: «primer paso con fecha ≥ hoy» devuelve siempre el paso de lectura; con manifestación viva el chip ya lo dice. · Evidencia: `lib/guia_proceso.js:434-481`; `public/app.js:4267-4268`, `:1498`, `:2174`; `v_d41_d48.js` (667 µs por fila). · Memoria: § «La guía le daba al contratista una lista de tareas con las fechas hacia atrás (12-sep-2026)», § «El paso a paso se leía hacia atrás…», § «La guía «Don Héctor»…».
- **D-44** · con condiciones · Motivo: la cifra sale de la regla única; «solo obra» y «con tipo desconocido no se pinta» la contradicen. · Evidencia: `lib/ganancia.js:111-118`, `:120-123`, `:136-138`; `lib/guia_proceso.js:80-94`, `:501-502`, `:546`; `listar.js:780`; ejecutado `aplicaContribucion`. · Memoria: § «La contribución del 5 % se cobraba siempre, y la alerta invitaba a cobrarla dos veces (13-sep-2026)», § «La guía «Don Héctor»…».
- **D-45** · confirmado · Motivo: existe y se calcula desde cierre + plazo; reproducidos cinco casos; el cálculo es inline. · Evidencia: `lib/guia_proceso.js:266`, `:284-287`, `:532-533`; `lib/capacidad.js:141-151`; `lib/proyeccion.js:44`. · Memoria: § «La guía «Don Héctor»…».
- **D-46** · con condiciones · Motivo: `modalidadEnLlano` existe y el expediente ya la enseña; el diccionario pesa más de lo dicho y la clave «otra» funde literales. · Evidencia: `lib/guia_proceso.js:121-160`, `:694`; `public/app.js:2199`, `:4238`; `public/expediente.js:398-407`; `v_d41_d48.js`. · Memoria: § «La guía «Don Héctor»…», § «Mis procesos como pestaña, centro de alertas y manifestación de interés (18-ago-2026)».
- **D-47** · con condiciones · Motivo: calculable; la ruta de los diseños era errónea; la identidad de la entidad no puede ir por NIT. · Evidencia: `lib/seguimiento.js:301-306`, `:310-335`, `:516-523`; `lib/handlers/perfil/seguimiento.js:47`, `:690-697`; `lib/baja_maxima.js:38-46`; `listar.js:444`. · Memoria: § «Identidad de la entidad…», § «Mis procesos · guardar, seguir…», § «F0-7 · La predicción que se le enseñó se CONGELA al guardar (24-ago-2026)».
- **D-48** · con condiciones · Motivo: el socio congelado existe solo para el dueño; `recomendacion.socio` solo con `con_socio`; guardados viejos con socio nulo; «Génesis» no es un campo. · Evidencia: `lib/handlers/perfil/seguimiento.js:168-181`, `:173-174`, `:491`, `:531`, `:290-294`; `lib/seguimiento.js:461-467`, `:497-504`; `lib/socio_por_proceso.js:320`, `:331`, `:400-406`; `public/app.js:4316-4338`; `lib/perfiles.js:118`, `:357`. · Memoria: § «El veredicto de socio se lee AL GUARDAR…», § «Con cuál de mis socios…», § «Lote «B7a-tablero-mis-procesos» de la consultoría del 4-sep · M-DGF-09, M-DGF-11, M-DGF-15 (6-sep-2026)», § «F0-7 …».
- **D-49** · con condiciones · Motivo: las tres cifras se reproducen; el 5 % se cobra a una interventoría cuando la guía corre sin fila viva (defecto); la base de la garantía sigue abierta. · Evidencia: `lib/guia_proceso.js:544-551`, `:95-96`, `:225-238`, `:394-395`; `lib/ganancia.js:136-138`; `lib/handlers/perfil/seguimiento.js:213`; `public/app.js:4228-4230`; `lib/dictamen.js:338-339`; `lib/filtros_lista.js:119-131`. · Memoria: § «La guía «Don Héctor»…», § «La contribución del 5 % se cobraba siempre…», § «Don Héctor · la hipótesis verificada contra fuentes vigentes y el diseño del dictamen del pliego, sin código todavía (2-sep-2026)».
- **D-50** · con condiciones · Motivo: no existe pero las piezas sí; `habilesEntre(null, x)` devuelve 0 (defecto latente); «este proceso da 9» nadie lo calcula hoy. · Evidencia: `lib/indice_competencia.js:422-433`, `:435-448`, `:455-467`, `:580-586`; `lib/habiles.js:144`; `lib/indice_baja.js:1058-1067`; `lib/proyeccion.js:42`; `listar.js:886`; `historico.js:67`. · Memoria: § «Lote «B9b-competencia-departamento»…», § «Remates «R4-remates-inteligencia»…».
- **D-51** · con condiciones · Motivo: la columna se guarda y nadie la lee; formato y cobertura sin ver; la comparación debe pasar por el normalizador existente. · Evidencia: `lib/indice_competencia.js:125`; `public/filtros.js:121-128`; `lib/filtros_lista.js:155-156`; `lib/columnas_historicas.js:324`. · Memoria: § «Fase 8 · Los siete filtros…», § «Competencia histórica por entidad (jul 2026)», § «Lote «B9b-competencia-departamento»…».
- **D-52** · con condiciones · Motivo: el acumulador tiene la cubeta 0 pero `registroPublicado` no la conserva; la cubeta es un redondeo; el 100 % es la alarma de columna copiada. · Evidencia: `lib/indice_baja.js:17-27`, `:39-41`, `:244-246`, `:290`, `:350`, `:391-445`, `:990-1030`; `sync.js:72`; `historico.js:70`. · Memoria: § «Decisiones que no hay que re-aprender (costaron caro)», § «La dispersión de la baja se MIDE…», § «DOS DE LAS CUATRO GRANULARIDADES DE LA BAJA ESTÁN VACÍAS EN PRODUCCIÓN (24-ago-2026)», § «Lote «B9b-competencia-departamento»…».
- **D-53** · con condiciones · Motivo: `departamento_entidad` viaja en la fila histórica; el acumulador no agrupa por departamento; depende de D-03. · Evidencia: `lib/competencia_detalle.js:573-600`, `:672-681`; `lib/proyeccion.js:42`; `public/app.js:3362-3376`. · Memoria: § «Lote «B9b-competencia-departamento»…», § «Lote «B9a-entidad-graficos»…», § «Fase 8 · Los siete filtros…».
- **D-54** · con condiciones · Motivo: la proyección la descarta; los tres consumidores solo la usan de respaldo; hay que escribir el lector; cobertura por medir. · Evidencia: `lib/proyeccion.js:38-61`; `lib/dictamen.js:404`; `lib/cronograma.js:91`; `lib/manifestacion.js:134`; `sync.js:326`. · Memoria: § «Fases 4 y 5 del plan v3…», § «Los documentos del proceso se leen solos…», § «El corpus conserva la llave de cruce `id_del_portafolio` · M-DGF-05 (6-sep-2026)».
- **D-55** · con condiciones · Motivo: llega solo al histórico y nadie lo lee; «puede presentarse a uno solo» no tiene fuente; valor «sin lotes» y cobertura sin ver. · Evidencia: `lib/indice_competencia.js:126`, `:225-229`; `lib/indice_baja.js:23-26`; `grep` en Guía y Complemento → 0. · Memoria: § «Remates «R4-remates-inteligencia»…», § «Decisiones que no hay que re-aprender…», § «El corpus conserva la llave de cruce…».
- **D-56** · con condiciones · Motivo: la norma está citada, pero no existe clasificador de sector y la fecha que manda es la del aviso de convocatoria. · Evidencia: `lib/dictamen.js:289`, `:311-314`, `:344-345`; `lib/formulario1.js:87`; `lib/filtros_lista.js:119-131`; `lib/indice_baja.js:204-210`. · Memoria: § «Investigación de contraste…», § «Las 12 señales de pliego sastre», § «Don Héctor · la hipótesis verificada…».
- **D-57** · con condiciones · Motivo: la clave es única y sin perfil; los 327 de PRODIAC son un conteo, no un archivo; el conteo por socia ya se enseña; «acredita» promete lo que no se mide. · Evidencia: `lib/almacen.js:180`; `lib/experiencia.js:251`; `experiencia_genesis_106.json` (106); `lib/perfiles.js:160`; `lib/handlers/perfil/pulso.js:57`; `public/pulso.js:636`; `public/empresa_libro.js:78`; `lib/cobertura_rup.js`. · Memoria: § «Experiencia ejecutada y cobertura del RUP (ago 2026)», § «Los tres RUP, leídos enteros, y PRODIAC entra como segunda socia (11-sep-2026)».
- **D-58** · con condiciones · Motivo: `detectar()` devuelve un objeto vacío con las tres cláusulas; la plantilla dice «no aplica»; «Mipyme» no es vocabulario de pantalla. · Evidencia: `lib/dictamen_reglas.js:33`, `:53-56`, `:85`; `lib/socio_por_proceso.js:104-118`; `lib/consorcio.js:56`; `lib/guia_proceso.js:535`; `lib/dictamen.js:257`; `grep -i mipyme public/` → 0. · Memoria: § «La cláusula gana al índice: el detector del pliego ya no cita la tabla de contenido (3-sep-2026)», § «Los documentos del proceso se leen solos…», § «Con cuál de mis socios…».
- **D-59** · con condiciones · Motivo: `leerDeducciones` existe; los hechos guardan `deducciones` por proceso y sin fecha; no hay acumulador por entidad; el NIT suma regionales. · Evidencia: `lib/documentos_proceso.js:289`, `:393-394`; `lib/handlers/pliego/documentos.js:55-57`, `:188`; `lib/proyeccion.js:41`; `public/app.js:927`, `:3456`, `:5114-5159`; `lib/handlers/perfil/seguimiento.js:393`. · Memoria: § «Las deducciones se LEEN del pliego (ago 2026 · punto 6 de la hoja de ruta)», § «Lo APARCADO por decisión del dueño (20-ago-2026)», § «Los documentos del proceso se leen solos…».
- **D-60** · con condiciones · Motivo: `calcSCE` asume 0 solo en los registros y convierte un valor ilegible en cero; jbjy no trae la participación; la consulta no cabe en una petición; el ejemplo era incoherente. · Evidencia: `lib/capacidad.js:73-83`; `lib/perfiles.js:83`, `:104-107`, `:120`, `:133`, `:155`, `:177`; `lib/config_rup.js:150-160`; `lib/handlers/perfil/seguimiento.js:62-66`, `:370-380`; `lib/socio.js:275-331`; `lib/ejecucion.js:18`. · Memoria: § «La pantalla prometía una revisión horaria que nadie hacía (12-sep-2026)», § «Puertas, probabilidad y valor esperado (ago 2026)», § «Los tres RUP, leídos enteros…».
- **D-61** · con condiciones · Motivo: el dato ya existe en pantalla; «desde 2025» no lo sostiene la consulta; el modal del competidor no dispone de `codigo_entidad`. · Evidencia: `lib/seguimiento.js` (`fichaCompetidor`); `public/app.js:4549-4550`, `:3383`; `lib/handlers/perfil/seguimiento.js:44`, `:352`, `:640-651`; `lib/proyeccion.js:41`. · Memoria: § «Lote «B4b-pulso-cobertura» de la consultoría del 4-sep · M-DGF-03, M-DGF-04, M-DGF-12 (6-sep-2026)».
- **D-62** · con condiciones · Motivo: el dato ya existe y se enseña; «desde 2024» es falso; la función no está exportada; `$group=entidad` no existe. · Evidencia: `lib/socio.js:333-360`, `:473`; `lib/handlers/inteligencia/detalle.js:130-134`; `public/app.js:10710`. · Memoria: § «Verifique a su socio antes de firmar (ago 2026)».
- **D-63** · con condiciones · Motivo: el conteo ya existe y se enseña; depende del cierre y del tope de 150; no hay lector de nombres. · Evidencia: `lib/documentos_proceso.js:20`, `:120`, `:183`, `:209-219`, `:244`, `:266`; `public/app.js:4122`. · Memoria: § «Los documentos del proceso se leen solos…».
- **D-64** · con condiciones · Motivo: existe casi entero en la guía; el par de bases se resuelve como cota superior; los 5 días son consejo. · Evidencia: `lib/guia_proceso.js:95`, `:394-396`, `:446-448`, `:547`; `public/app.js:4230`; `lib/dictamen.js:338-340`, `:345`; `public/glosario.js:86`. · Memoria: § «La guía le daba al contratista…», § «El paso a paso se leía hacia atrás…», § «Don Héctor · la hipótesis verificada…».
- **D-65** · con condiciones · Motivo: `wi7w-2nvm` solo en el diccionario; llave sin confirmar; sin ganador; segundo conteo de ofertas. · Evidencia: `grep` en `lib/ api/ tests/` → 0; `lib/proyeccion.js:47-61`; `lib/proponentes.js:59`; `lib/indice_competencia.js:94`, `:100-104`, `:110-113`, `:162`; `listar.js:343`. · Memoria: § «Puertas, probabilidad y valor esperado (ago 2026)».
- **D-66** · con condiciones · Motivo: `uymx-8p3j` no está en el árbol; la cifra actual es un supuesto editable de 60 días; «facturas de obra» exige cruce; cobertura sin medir. · Evidencia: `lib/apu/rentabilidad.js:86`, `:338`, `:347`, `:429`; `lib/handlers/apu/editor.js:802,869`; `lib/apu/optimizador.js:278`; `lib/seguimiento.js:23-24`. · Memoria: § «Auditoría integral (19-ago-2026): 30 defectos reproducidos y corregidos».
- **D-67** · con condiciones · Motivo: `visualizaciones_del` no está en `CAMPOS`; precedente de `proveedores_que_manifestaron` en 0; mide miradas. · Evidencia: `lib/proyeccion.js:38-61`; `sync.js:68`, `:560`; `lib/columnas_historicas.js:324`. · Memoria: § «Fase 9 · La portada…».
- **D-68** · confirmado · Motivo: el botón llama a `op=probabilidad` y el desglose lleva el supuesto; la fuente de la ficha era imprecisa. · Evidencia: `public/app.js:2104-2105`, `:3250-3279`, `:3192-3245`, `:2074`, `:2017-2029`; `api/inteligencia.js:21`; `lib/handlers/inteligencia/detalle.js:67`; `lib/probabilidad_desglose.js:221`, `:237`. · Memoria: § «Probabilidad: encogimiento…», § «Puertas, probabilidad y valor esperado (ago 2026)».
- **D-69** · confirmado · Motivo: cuatro estados y siete textos reproducidos; el techo legal no se pinta como plazo. · Evidencia: `lib/manifestacion.js:298-327`; `public/app.js:1498-1524`, `:1526-1556`; `lib/filtros_lista.js:229`; `lib/seguimiento.js:367`, `:427`; `v_d65_d72.js`. · Memoria: § «EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS…», § «Mis procesos como pestaña…».
- **D-70** · confirmado · Motivo: reproduce los textos; sin base `km` nulo; «120 km» es Meta, no Tolima. · Evidencia: `lib/accesibilidad.js:103-214`; `data/accesibilidad_departamentos.json`; `public/app.js:1419`; `listar.js:625`. · Memoria: § «Accesibilidad de la zona · el costo de LLEGAR ordena (ago 2026)», § «Lote «zona y RUP en PDF»…».
- **D-71** · con condiciones · Motivo: existe y decide con el valor crudo, pero la celda redondea a entero y el aviso a un decimal. · Evidencia: `public/app.js:1464-1475`, `:1811-1821`, `:2073`, `:2180`; `lib/indice_competencia.js:1213-1232`; `listar.js:853`; `v_d71_celda.js`. · Memoria: § «Puntos 7 y 10 de la hoja de ruta (ago 2026)».
- **D-72** · confirmado · Motivo: pinta a 0, 1 y 2 días; calla con nulo; único insumo `diasParaCierre`. · Evidencia: `public/app.js:1427-1431`, `:1477-1485`, `:2137`, `:2141`, `:2173`, `:2181`. · Memoria: § «Las dos alarmas del calendario (ago 2026)».
- **D-73** · con condiciones · Motivo: viaja solo con `ordenar_por=margen`; el techo puede salir del departamento y la frase dice «esta entidad». · Evidencia: `listar.js:708`, `:718-751`, `:895`, `:1029`; `public/app.js:1051-1062`; `lib/indice_baja.js:893-897`; `lib/apu/piso_techo.js:221`; `repro_d73.js`. · Memoria: § «Fase 3 · Panel Piso / Techo (ago 2026)», § «Fase 8 · Los siete filtros…», § «Auditoría integral del 1-sep-2026…».
- **D-74** · con condiciones · Motivo: el encaje existe; «qué códigos le faltan» no lo sostiene el dato; el mensaje de tier `ninguno` usa la sigla. · Evidencia: `lib/rup.js:92-145`, `:104-105`; `public/app.js:1563-1569`, `:1579-1588`, `:2190-2197`; `listar.js:852`; `lib/publico.js:194-196`; `lib/unspsc.js:166-167`; `lib/filtros.js:317-321`; `tests/e2e.js:13962`, `:29739`. · Memoria: § «Fase 6 · Traducción de lenguaje…», § «Fase 2 · Puerta de entrada de 60 segundos (ago 2026)».
- **D-75** · confirmado · Motivo: se expone plegada, fuera de la cascada, mínimo 5, nulo sin departamento, anulada sin credencial. · Evidencia: `lib/indice_baja.js:893-897`, `:976-986`, `:988-1035`; `listar.js:865`; `lib/publico.js:136`; `public/app.js:1377-1386`. · Memoria: § «Lote «B9b-competencia-departamento»…», § «Remates «R4-remates-inteligencia»…».
- **D-76** · con condiciones · Motivo: es una bandera de interfaz, no un dato del PAA ni medido ni cuesta petición. · Evidencia: `public/app.js:690-695`, `:2171-2172`, `:3502-3505`; `api/inteligencia.js:22`. · Memoria: § «Plan Anual de Adquisiciones · qué va a salir antes de que salga (ago 2026)».
- **D-77** · confirmado · Motivo: estado en la proyección y pintado tal cual; URL aplanada en un solo sitio; solo http(s); `urlDeFila` está en `:77-81`. · Evidencia: `lib/proyeccion.js:43`, `:77-81`, `:92`, `:138-141`; `sync.js:68`; `public/app.js:47`, `:2209`, `:2214`; `tests/e2e.js:249`, `:2027`. · Memoria: § «El enlace al proceso en SECOP II vuelve, y trae un dato basura debajo (8-sep-2026)», § «UNA `fase` REZAGADA MATABA CONVOCATORIAS PUBLICADAS, Y NO DEJABA RASTRO (20-ago-2026)».
- **D-78** · con condiciones · Motivo: existe con la regla del índice de baja; la ruta de la ficha era errónea; no hay índice inverso hoy; el rótulo dice «media» y la cifra es la mediana. · Evidencia: `lib/competencia_detalle.js:51`, `:567-588`, `:636-661`, `:134`; `lib/handlers/inteligencia/detalle.js:175`; `lib/indice_baja.js:116`; `public/app.js:3328-3341`. · Memoria: § «Lote «B9b-competencia-departamento»…», § «Probabilidad: encogimiento…», § «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)».
- **D-79** · confirmado · Motivo: `pintarDetalle` existe y el orden de bloques coincide con el árbol. · Evidencia: `public/app.js:3078-3118`, `:551-556`, `:3042`, `:3056-3061`, `:3070-3076`, `:2969`, `:2858`, `:2893`; `lib/handlers/inteligencia/detalle.js:66`. · Memoria: § «Lote «B9a-entidad-graficos»…», § «Lote «B9b-competencia-departamento»…», § «Lote «B7a-tablero-mis-procesos»…».

## Anexo C · Fuentes consultadas

### C.1 Documentos del árbol (por título de sección)

- `CLAUDE.md` (entero: es el único que se auto-carga) y `docs/PROMPT_INICIAL.md § «3. El ciclo ECC (di en qué paso estás)»`, `§ «8. Verificación · qué cuenta como «hecho» (los matices que CLAUDE.md no lleva)»`, `§ «9. Orquestación ultracode · SIEMPRE, no solo en los encargos grandes»`, `§ «10. Reglas de respuesta (obligatorias)»`, `§ «11. Mantenimiento de este documento»`, `§ «Apéndice A · El prompt corto para pegar»`.
- `docs/MEMORIA.md`: las secciones nombradas en cada ficha y cada tanda (todas comprobadas con `grep -n "^#" docs/MEMORIA.md` el 14-sep-2026: existen, exactas o como prefijo admitido).
- `docs/GUIA_ANALISTA_LICITACIONES.md § «Capítulo 4. SECOP II — la plataforma, sin romanticismo»`, `§ «Los 9 errores que descalifican en SECOP II»`, `§ «Capítulo 5. El RUP — tu pasaporte»`, `§ «Capítulo 6. Leer un pliego como profesional»`, `§ «Capítulo 8. Requisitos habilitantes vs. factores de puntaje»`, `§ «Capítulo 9. Cómo se arma el puntaje (aquí se gana)»`, `§ «Capítulo 10. Consorcios y uniones temporales»`, `§ «Capítulo 11. El precio: cómo costear de verdad»`, `§ «Capítulo 13. Subsanación: el capítulo que salva contratos»`, `§ «Capítulo 18. Las siete palancas legales que sí inclinan la balanza»`, `§ «Palanca 3 — Detección de pliegos direccionados (impacto: alto)»`, `§ «Capítulo 19. El mapa del terreno turbio»`, `§ «Capítulo 21. El área de licitaciones que funciona»`, `§ «Índice de errores que descalifican»`.
- `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md § «V-01 · Documentos tipo versión 2: obligatorios desde el 16 de febrero de 2026»`, `§ «V-03 · Precios unitarios vs. precio global, y por qué «mayor cantidad» ≠ «adición»»`, `§ «V-08 · CORRECCIÓN: anticipo — el manual se queda corto y en un punto induce a error»`, `§ «V-10 · Los indicadores habilitantes tienen valores de referencia (y eso hace usable la señal #3)»`, `§ «V-12 · Umbrales y cifras de 2026»`, `§ «Los 5 hallazgos que cambian lo que sabíamos»`.
- `docs/INVESTIGACION_DISENO_WEB.md § «7.3. Propuesta de tokens de movimiento para Detekta»` (con 7.3.3 y 7.3.5) y `§ «9. Plan de la piel v4 · qué se implementa, en qué orden (12-sep-2026)»`.
- `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md § «8.3 ¿Tienen análisis de competencia? ¿Cómo lo muestran?»`, `§ «8.6 ¿Qué hace que un usuario vuelva todos los días?»`, `§ «9.1 Top 5 funcionalidades que deberíamos implementar YA»`, `§ «9.3 Top 3 errores que cometen estas plataformas y que debemos evitar»`.
- `docs/datos.md §3` (reglas de acceso), `§5.1` (`hgi6-6wh3`), `§5.2` (`jbjy-vk9h`), `§6` (censo de columnas de p6dx) y `§7` (manifestación de interés).
- `docs/PERFILES.md § «Fórmula K (única para toda la app — `lib/capacidad.js`)»`; `docs/CONFIGURACION_TOKENS.md § «8. Parte G · Después de configurar: los dos disparos de puesta en marcha»` y `§ «10. Rotar `HISTORICO_TOKEN` (los seis sitios, en orden)»`; `docs/APU_FUENTES.md` y `docs/APU_INFORME_COMPLETO.md` (citados por A4 para las claves de p6dx y jbjy vistas en agosto); `EXPERIENCIA_PENDIENTE.md` (raíz; contrato del archivo de contratos); `vercel.json` (cron y rewrites).
- Código: las anclas `ruta:línea` de cada ficha, leídas o ejecutadas por los informes y los verificadores entre el 13 y el 14 de septiembre de 2026 sobre `main` en `3482415`. Las líneas se pudren con cada commit: antes de tocar un módulo se relocalizan con `node tests/mapa.js <término>`.

### C.2 Los informes de esta reforma (materia prima del plan)

Los informes, los diseños, la síntesis y las verificaciones por dato están versionados en `docs/reforma_datos/` con ficha «Para: sesión · Estado: informe fechado» (audiencia: la sesión que ejecute una tanda; se leen por secciones con `sed`, nunca enteros). Son la foto del 13 y 14 de septiembre de 2026 sobre `main` en `3482415`: las anclas `ruta:línea` a ficheros `.js` que contienen se pudren con cada commit y se relocalizan con `node tests/mapa.js <término>`. Los guiones de reproducción (`*.js`) y sus salidas (`*.salida.txt`, `*.salida.json`) que esos informes nombran quedaron en el directorio de trabajo de la sesión y no se versionan: lo que demostraron está transcrito en cada informe (comando y salida resumida).

- `A1-inventario-tarjeta.md` (censo de los 34 datos de la tarjeta; hallazgos H1-H8; `repro_tarjeta.js`, `repro_frontend.js`).
- `A2-perfil-competidor.md` (el perfil existe y está escondido; medición de comandos y bytes por clic; la propuesta del hash inverso; `a2_repro.js`).
- `A3-recomendador-socio.md` (forma real del veredicto de socio; qué decide y qué no; los textos de la línea; `a3_forma.js`, `a3_scan.js`, `a3_textos.js`).
- `A4-datos-no-explotados.md` (columnas descartadas por la proyección; datasets no integrados; la sonda que falta; `repro_proyeccion.js`, `repro_tabla_c.js`).
- `A5-necesidades-ingeniero.md` (E1-E17 y P1-P16 con fuente; las cinco necesidades que nadie cubre).
- `A6-restricciones-y-plan-v4.md` (cerraduras que atan el cambio; tokens de movimiento; cola viva de la piel v4; rótulos `E2E_SOLO`).
- `D-experimentado.md`, `D-sin_experiencia.md`, `D-dueno.md` (los tres diseños con sus reproducciones `d_exp_repro.js`, `d_sin_repro.js`, `d_dueno_repro.js`, `d_dueno_tarjeta.js` y sus censos de lenguaje `d_sin_textos.js`, `d_dueno_textos.js`) y `D-sintesis.md` (los 79 datos fundidos).
- Verificaciones por dato: `V-D01-D04-verificacion.md`, `V-D01-D08-verificacion.md`, `V-D05-D08.md`, `V-D09-D16.md`, `V-D17-D24-verificacion.md`, `V-D25-D32-verificacion.md`, `V-D33-D40-verificacion.md`, `V-D41-D48-verificacion.md`, `V-D49-D56-verificacion.md`, `V-D57-D64-verificacion.md`, `V-D65-D72-verificacion.md`, `D-73-a-79-verificacion.md`, con sus guiones y salidas (`rep_d01.js`, `rep_costo_d01.js`, `rep_d08.js`, `rep_lenguaje.js`, `v_d09_d16.js`, `v_d09_d16_tarjeta.js`, `v_d17_baja.js`, `v_d17_d24.js`, `v_d29_ganancia.js`, `v_d33_d40.js`, `v_d41_d48.js`, `v_d65_d72.js`, `v_d71_celda.js`, `repro_d73.js`, `v_lenguaje_*.js` y sus `*.salida.txt`).
- `memoria_encabezados.txt` y `titulos_a_citar.txt` (el volcado de encabezados de la memoria y la lista de títulos citados en este plan, comprobados uno a uno el 14-sep-2026).

### C.3 Fuentes abiertas (consulta del 13-sep-2026; el proxy de las sesiones no permitió leer las páginas: lo citado es el resumen del buscador, salvo los repositorios de GitHub, que respondieron 200)

- W1 https://consultoresjuridicosyaseguradores.com/errores-rechazo-ofertas-secop-ii/ — «no distinguir entre requisitos habilitantes y criterios de ponderación» es el error más grave; la póliza mal constituida descalifica.
- W2 https://gestionconsultoria.com/errores-comunes-en-secop-ii-por-que-las-empresas-pierden-oportunidades-antes-de-competir — documentos incompletos o mal firmados; dejar la carga para el último momento.
- W3 https://presucosto.com/blog/licitaciones-secop-colombia-2026 — «el tiempo de preparación se come el margen»; con fichas listas, «horas, no días».
- W4 https://www.colombiacompra.gov.co/archivos/pregunta-frecuente/la-plataforma-secop-ii-tiene-causales-de-rechazo-predisenadas — las causales las adjunta cada entidad.
- W5 https://relatoria.colombiacompra.gov.co/conceptos/c-438-de-2025/ — capacidad residual: capacidad de contratación menos el saldo de los contratos en ejecución; solo obras civiles.
- W6 https://www.colombiacompra.gov.co/archivos/manual/aplicacion-para-establecer-la-capacidad-residual — guía y aplicación de la capacidad residual.
- W7 https://www.ambitojuridico.com/noticias/comercial/nuevos-documentos-tipo-para-licitaciones-de-infraestructura-social — versión 2: avisos de convocatoria desde el 16 de febrero de 2026.
- W8 https://franciscofajardoabogados.com/obligatoriedad-de-la-exigencia-y-presentacion-de-la-garantia-de-seriedad-de-la-oferta/ — no entregar la garantía de seriedad con la propuesta no es subsanable.
- W9 https://www.colombiacompra.gov.co/soporte-y-solucion-en-linea/indisponibilidad-en-las-plataformas — protocolo de indisponibilidad de SECOP II.
- W10 https://relatoria.colombiacompra.gov.co/conceptos/c-600-de-2026/ — umbral 2026 para limitar a Mipyme y la regla de las dos solicitudes (norma no leída desde aquí).
- W11 https://co.licitaciones.info/publicaciones/como-acreditar-experiencia-ante-el-rup — de uno a seis contratos terminados; valor en SMMLV a la fecha de terminación.
- W12 https://www.vanguardia.com/area-metropolitana/bucaramanga/2026/04/07/camara-de-comercio-alerta-que-se-vence-el-rup- — el RUP se renueva hasta el quinto día hábil de abril.
- W13 https://www.elheraldo.co/colombia/2026/06/11/cci-alerta-por-falta-de-pagos-de-invias- — deudas del Estado con contratistas (jun-2026).
- W14 https://www.ambitojuridico.com/noticias/administrativo/firma-electronica-del-oferente-cubre-la-manuscrita- — firma digital exigida por el pliego.
- W15 https://licitabot.com/blog/licitar-sin-experiencia-guia-completa — licitar sin experiencia: consorcio y menor cuantía.
- W16 https://relatoria.colombiacompra.gov.co/conceptos/c-850-de-2025/ — las cuatro fórmulas del método económico y el sorteo con la TRM.
- W17 https://www.ambitojuridico.com/noticias/tributario-y-contable/valor-de-estampillas-en-contratacion-publica-no-superaria-el-10-del — las estampillas las fija cada departamento y municipio.
- W18 https://dianaordonezabogada.com/etapas-de-la-licitacion-publica/ — etapas de la licitación pública; observaciones al proyecto de pliego.
- W19 «5 a 8 días hábiles para preparar una propuesta»: resumen del buscador sin página que lo respalde; solo orden de magnitud, nunca cifra de pantalla.
- Diccionario de columnas de `p6dx-8zbt`: https://raw.githubusercontent.com/alfa7g7/SARA/main/docs/data_dictionary.md (octubre de 2025; HTTP 200 el 13-sep-2026). Mapeos de 24 datasets del proyecto `nicoceron/co-acc` (`etl/datasets/*.yml`, catálogo del 24-abr-2026; HTTP 200 el 13-sep-2026). Cuadernos públicos citados por A4 (`CharlesVY24/automation_inforequest`, `Izainea/lab4_mlspark`, `cjkootch/procur_dashboard`, `Juanpgm/cashing_backend`, `manuelcastiblan/colombia-datos-mcp`) por la API de búsqueda de código de GitHub el 13-sep-2026. Ninguna de esas fuentes fue comprobada contra datos.gov.co, que respondió 403 a las sesiones ese día.
- Datos abiertos nombrados y NO consultados hoy: https://www.datos.gov.co/resource/p6dx-8zbt.json (procesos), `jbjy-vk9h` (contratos), `hgi6-6wh3` (proponentes), `9sue-ezhx` (PAA), `dmgg-8hin` (archivos), `wi7w-2nvm` (ofertas), `uymx-8p3j` (plan de pagos), `e2u2-swiw`, `u8cx-r425`, `it5q-hg94`, `ceth-n4bn`, `gra4-pcp2`, `mfmm-jqmq`.
