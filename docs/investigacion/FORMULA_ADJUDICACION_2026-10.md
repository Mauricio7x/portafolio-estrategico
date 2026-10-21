# Investigación · ¿Existe una fórmula para elegir el precio que más adjudicaciones gana en SECOP II?

> Para: dueño · Estado: pendiente del dueño · Sustituido por: —

> Encargo del dueño (prompt del 20-oct-2026). Este documento se detiene en el **checkpoint C1**
> (viabilidad de datos): nada de lo que sigue a la Fase 1 se ha corrido. Las cifras salen de consultas
> ejecutadas el 21-oct-2026 contra datos.gov.co y del árbol del repositorio; lo que no se verificó va
> marcado [sin verificar]. Los números sobre la suite salen de `node tests/estado.js`.

## Resumen para el dueño (sin jerga)

[se escribe al cerrar C1 con las decisiones del dueño]

## 1. Premisas del prompt que resultaron falsas o incompletas (van primero)

1. **La línea base B2 no es solo «índice de baja + panel Piso/Techo». El repositorio ya tiene una investigación
   casi idéntica a las fases 1, 2 y parte de la 5 de este prompt**, hecha entre el 17 y el 18-oct-2026:
   `scripts/base_obra/` (inventario, limpieza, una fila por proceso, cifras, métodos del pliego, muestra,
   vigía del corte) y sus secciones en `docs/MEMORIA.md` («Base nacional de licitaciones de obra…», «Fase 1…»,
   «Fase 2: el piso se reproduce, el ganador no…», «Fase 3: la validación posible…», «La alerta de precio bajo
   se corta por modalidad…»). Lo que esa base ya mide, con 11.626 procesos usables de 2024 a 2026 según la
   memoria: la cascada de exclusiones, el piso «mediana − σ» por proceso, las 4 fórmulas de ponderación
   (`metodos.js`, copiadas del pliego SAMC-SI-020-2026, pp. 53–56, y del Documento Tipo V4 numeral 4.1.4), un
   simulador «¿habría ganado con este precio?» por método, el acierto de cada método frente al ganador real,
   la competencia por entidad y el umbral de la alerta de precio bajo. Su conclusión registrada, que este
   prompt tiene que asumir como punto de partida y no re-descubrir: **con los datos abiertos no se sabe qué
   ofertas quedaron habilitadas ni qué método usó cada proceso; el ganador real queda primero con ALGÚN
   método en ~57 % de las menores cuantías y ~39 % de las licitaciones con competencia real, y el método
   de la TRM estimada no se distingue de una TRM al azar.** Regla dura del proyecto: «no reescribir una regla
   que ya existe: llamarla». El plan de las fases 2 a 7 debe construir SOBRE `scripts/base_obra` (misma limpieza,
   mismas fórmulas, misma identidad de oferente), no en una carpeta nueva con reglas propias.
2. **La guía del repositorio contradice al pliego, y el repositorio ya lo sabe.** El «HALLAZGO» del prompt
   (curso y Excel con media aritmética, media aritmética alta, media geométrica con presupuesto oficial y
   «primer decimal») está en `docs/GUIA_ANALISTA_LICITACIONES.md` (§ «Los 4 métodos de ponderación económica»)
   y lo corrige `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` V-18 (medido en 5 pliegos: mediana con valor
   absoluto · media geométrica · media aritmética baja · menor valor; centavos de la TRM; TRM del segundo día
   hábil tras el traslado del informe en menor cuantía). No hay que corregir «el modelo»: hay que no usar la guía.
3. **Las vistas anuales de Ofertas no sirven para 2020–2023.** «SECOP II - Ofertas - 2020/2021/2022/2023»
   (atkq-fc9r, pp6p-gvye, yk6j-79e6, vz4x-85r3) son filtros (`assetType: filter`, `modifyingViewUid:
   wi7w-2nvm`) sobre un conjunto que solo contiene ofertas registradas **desde el 1-ene-2024** (descripción
   oficial del conjunto). Por eso 2023 responde 4 filas y 2020 responde 0: la «anomalía» es estructural, no de
   metadatos. Las ofertas de 2015 a 2023 están en **`b28v-edj8`** («SECOPII - Ofertas Por Proceso Historico»,
   44.262.193 filas, hasta el 31-dic-2023 según su descripción). Columnas: 16, no 14 (se suman `c_digo_entidad`
   y `c_digo_proveedor`). Ya lo usa `scripts/base_obra/inventario.js` (`ofertas_hist`).
4. **El valor de la oferta solo se publica DESPUÉS de la adjudicación.** Medido hoy: de 42 procesos de obra
   (licitación y menor cuantía) cerrados hace entre 12 y 120 días y todavía «en Evaluación», **0** tienen filas
   en `wi7w-2nvm`; de 77 adjudicados en septiembre y octubre de 2026, **71** las tienen, y en 68 de ellos el
   número de ofertas distintas (`identificador_de_la_oferta`) es igual a `respuestas_al_procedimiento` de p6dx en 68 de las 74 filas comparadas (las 6 restantes traían más ofertas que respuestas).
   Consecuencias: (a) no hay fuga de precios de rivales antes de la audiencia; (b) el «sobre cerrado» del prompt
   no existe en estos datos: lo que hay es ausencia hasta adjudicar; (c) `fecha_de_registro` es la misma para
   todas las ofertas de un proceso (fecha de publicación del lote, no de presentación de cada oferta).
5. **No existe indicador de oferta habilitada o rechazada en ningún conjunto abierto** (16 columnas de
   `wi7w`/`b28v`, 9 de `hgi6`, 59 de `p6dx`: ninguna lo trae). La memoria del 17-oct lo registra como el
   límite principal del simulador y del acierto; aquí se confirma por censo de columnas.
6. **`respuestas_al_procedimiento` no es, por definición, «número de oferentes».** El diccionario oficial de
   p6dx lo define como «Respuestas hechas al procedimiento, tanto de proveedores como de la misma entidad».
   Empíricamente coincide con las ofertas distintas en 68 de 74 filas de procesos adjudicados recientes (y en el 86–93 %
   de los usables de la base del 17-oct), pero las 3 discrepancias son «ofertas > respuestas», no al revés.
7. **datos.gov.co SÍ es alcanzable desde la sesión** (HTTP 200 en 0,3–0,5 s por consulta; el prompt lo daba por
   posible 403). La decisión D3 (descarga manual del dueño) queda sin efecto.
8. **Restricciones del repositorio, verificadas** (CLAUDE.md, `lib/apu/piso_techo.js`): Node 22 en este
   entorno (CLAUDE.md pide CommonJS sin dependencias ni `package.json`: confirmado, no existe); sin LLM en
   `lib/indice_baja.js`, `lib/apu/piso_techo.js`, `lib/apu/rentabilidad.js`, `lib/probabilidad.js` ni
   `scripts/base_obra/` (ningún `anthropic`/`openai`/`claude`); 6 routers en `api/` fijados por la suite (un
   endpoint nuevo entra como `op`); `MIN_PROCESOS_TECHO = 5` y «Sin referencia» sin techo; umbral de la alerta
   de precio bajo por modalidad (12 % en licitación y menor cuantía, 30 % en mínima, 20 % sin medición;
   decisión del dueño del 18-oct-2026, **no el 80 % único que supone el prompt**). La «carpeta aparte»
   del análisis ya existe y se llama `scripts/base_obra/` (el prompt propone `tools/analisis/` como ejemplo).
9. **El «Excel de agosto» y los conceptos C-982, C-1778, C-1400, C-853 y C-161**: no están en el repositorio
   (ningún archivo los cita). Los cuatro primeros existen y dicen lo atribuido; «C-161» no es un concepto sobre
   el documento base (sección 2.4). Y la **versión 4 de transporte la adopta la Resolución 465 de 2024**;
   «CCE-EICP-GI-01» es el código del documento base, no de la resolución.

## 2. Inventario de datos (Fase 1)

### 2.1 Conjuntos, filas, columnas y cobertura (consultas del 21-oct-2026; metadatos con SHA-256 en `tools/analisis/ficha_fuentes.json`)

| Conjunto | Id | Filas (count(*)) | Columnas | Cobertura medida | Llave de cruce | Última actualización de filas (UTC) |
|---|---|---|---|---|---|---|
| SECOP II - Procesos de Contratación | `p6dx-8zbt` | 9.349.940 | 59 | obra adjudicada (tipo «Obra», `adjudicado='Si'`): de 2016 a 2026; una fila por FASE (un portafolio trae varias) | `id_del_portafolio` (CO1.BDOS…) | 2026-10-20 21:44 |
| SECOPII - Ofertas Por Proceso | `wi7w-2nvm` | 50.135.556 | 16 | registradas desde 1-ene-2024 (2024: 19,48 M · 2025: 19,20 M · 2026: 11,46 M · 2023: 4) | `id_del_proceso_de_compra` = `id_del_portafolio` | 2026-10-20 19:33 |
| SECOPII - Ofertas Por Proceso Historico | `b28v-edj8` | 44.262.193 | 16 | 2015–2023 (2019: 4,46 M · 2020: 9,18 M · 2021: 8,04 M · 2022: 7,68 M · 2023: 10,87 M) | ídem | 2026-10-20 15:13 |
| Ofertas 2020/2021/2022/2023 (vistas) | `atkq-fc9r` · `pp6p-gvye` · `yk6j-79e6` · `vz4x-85r3` | 0 · [no medido] · [no medido] · 4 | filtros sobre `wi7w` por `fecha_de_registro`: vacíos por construcción | — | 2026-10-20 19:33 |
| SECOP II - Contratos Electrónicos | `jbjy-vk9h` | 5.644.941 | 95 | contratos firmados; trae `direcci_n_de_ejecuci_n_del_contrato`, `valor_del_contrato`, adiciones vía `cb9c-h8sn` | `proceso_de_compra` = `id_del_portafolio` | 2026-10-20 16:30 |
| Proponentes por Proceso SECOP II | `hgi6-6wh3` | 2.345.797 | 9 | 2015–2026 (2024: 98.906 procesos · 2025: 118.049 · 2026: 84.369); nombres, sin valores; 0 filas antes de la apertura (docs/datos.md §5.1) | `id_procedimiento` = `id_del_proceso` (CO1.REQ…) | 2026-10-20 07:27 |
| SECOP II - Proveedores Registrados | `qmzu-gj57` | 1.625.078 | 26 | domicilio (`departamento`, `municipio`, `ubicacion` DIVIPOLA), `es_grupo`, `tipo_empresa`; trae datos de contacto de personas (no se usan) | `nit` o `codigo` | 2026-10-20 14:40 |
| SECOP II - Adiciones | `cb9c-h8sn` | [no medido] | 5 | sin montos (memoria 17-oct) | `id_contrato` | 2026-10-20 06:46 |
| TRM | `32sa-8pi3` | 1.850 desde 2019 | 4 | 2019-01-03 → 2026-10-21, una vigencia por día hábil | fecha | 2026-10-20 23:05 |
| SECOP I - Procesos / Histórico | `f789-7hwg` · `qddk-cgux` | [no medido] | 79 | `cuantia_proceso`, `cuantia_contrato`, sin ofertas por oferente: solo sirven para r_adj | — | 2026-10-20 |

Moneda: `wi7w` y `b28v` traen **100 % COP** (agregación por `moneda`: una sola categoría en cada uno).

### 2.2 El universo de obra civil competitiva en p6dx (portafolios distintos, `tipo_de_contrato='Obra'`, `adjudicado='Si'`, por año de `fecha_adjudicacion`)

| Año | Licitación pública (ambas etiquetas) | Selección abreviada de menor cuantía (ambas) | Mínima cuantía | Régimen especial (con ofertas) | Contratación directa (con ofertas) |
|---|---|---|---|---|---|
| 2019 | 479 | 755 | 910 | 3 | 2 |
| 2020 | 350 | 688 | 621 | 49 | 125 |
| 2021 | 876 | 1.256 | 889 | 35 | 339 |
| 2022 | 1.301 | 1.653 | 1.055 | 149 | 232 |
| 2023 | 1.308 | 2.143 | 1.412 | 333 | 187 |
| 2024 | 754 | 1.813 | 1.382 | 287 | 156 |
| 2025 | 1.171 | 2.744 | 1.765 | 617 | 315 |
| 2026 (al 20-oct) | 796 | 1.872 | 1.114 | 524 | 132 |
| sin fecha de adjudicación | 160 | 251 | 269 | 115 | 25 |

Lectura: el universo del prompt (licitación + menor cuantía) suma unos **2.000 a 4.000 procesos adjudicados por
año**; con la partición temporal pedida (entrenamiento ≤ 2023 · validación 2024 · prueba 2025–2026) el
entrenamiento tendría del orden de 10.000 portafolios ANTES de la cascada de exclusiones (la base del 17-oct
perdió cerca de la mitad entre 2024 y 2026: 11.626 usables, todas las modalidades). Dos cautelas: (a) en
2019–2023 las ofertas vienen de `b28v`, un conjunto distinto, y la memoria registra duplicados entre los dos;
(b) 6.456 de 15.214 portafolios de obra adjudicados desde 2024 traen `codigo_principal_de_categoria =
UNSPECIFIED`, así que delimitar por UNSPSC (sección 3 del prompt) dejaría fuera el 42 % del universo:
la base existente delimita por `tipo_de_contrato='Obra'`, y es lo que se propone mantener. Además 13.587
portafolios de licitación/menor cuantía adjudicados desde 2024 son «Prestación de servicios» y 9.005
«Obra»: la interventoría y la consultoría quedan fuera por tipo, como pide el prompt.

Cobertura de campos en obra adjudicada desde 2024 (20.264 filas, 15.214 portafolios): `precio_base`,
`valor_total_adjudicacion`, `departamento_entidad`, `respuestas_al_procedimiento`, `numero_de_lotes` y
`codigo_principal_de_categoria` en el 100 % de las filas; `fecha_adjudicacion` en el 97,3 %. Orden de la
entidad: Territorial 10.796 · Nacional 4.208 · Corporación Autónoma 210. Departamento de la entidad: 33
valores más «No Definido» (436); Bogotá 2.539, Antioquia 1.458, Boyacá 1.357, Cundinamarca 1.240, Valle 873,
Caldas 725, Santander 646, Tolima 511. Estados de los portafolios de obra competitiva publicados desde 2024:
Seleccionado y adjudicado 13.129 · en Evaluación 11.039 · Cancelado 1.946 · Publicado 607 · Abierto 545 ·
Seleccionado sin adjudicar 403 · Suspendido 12 (no hay un estado «desierto»: se infiere de «Cancelado» o
«Seleccionado sin adjudicar» [inferencia, por confirmar con la muestra]).

### 2.3 Lo que ya responde la pregunta del checkpoint: ¿hay valor por oferente y cobertura?

- **Sí hay valor por oferente** (`valor_de_la_oferta`, «Valor registrado en la oferta» según el diccionario
  oficial), con NIT (`nit_del_proveedor`) y código de proveedor por fila, pero con los defectos ya medidos
  por la base del 17-oct: NIT de relleno («0000000», «No Definido», el nombre del consorcio), filas
  «Confidencial» con valor 0 (367.599 filas, exactamente las de valor cero en todo `wi7w`), y cada oferta
  repetida cientos de veces (hay que agrupar por `identificador_de_la_oferta` o por proveedor × valor).
- **Solo después de adjudicar** (sección 1, punto 4): la base es retrospectiva por construcción.
- **Cobertura para obra**: la corrida desde 2019 que está en curso dará la cascada exacta (sección 3). La
  del 17-oct (2024 →) terminó con 11.626 procesos usables entre las tres modalidades.
- **Ventaja local (H8)**: `qmzu-gj57` trae el domicilio del proveedor, pero en 6 procesos adjudicados
  recientes solo 35 de 336 grupos proveedor × proceso traían NIT válido en `wi7w`, y por `c_digo_proveedor`
  `qmzu` encontró 54 de 328; por NIT, 32 de 35. H8 solo es viable para la fracción con NIT válido, y hay que
  medir esa fracción en toda la base antes de prometerla.
- **TRM (H6)**: la serie `32sa-8pi3` cubre 2019–2026 por día hábil. El método real de cada proceso NO consta en
  los datos abiertos: H6 solo puede probar el reparto de centavos (ya medido el 17-oct: chi² = 3,89 con 3 g. l.
  sobre 680 días; no se rechaza el reparto parejo), no la asignación efectiva por proceso.

### 2.4 Verificación normativa (subagente verificador, 21-oct-2026; pasajes releídos en los archivos descargados a la carpeta de la sesión)

Fuentes primarias caídas desde la sesión: Función Pública (`funcionpublica.gov.co/eva/gestornormativo`, «HTTP 503
Service Unavailable» en 5 intentos; con `curl`, «SSL certificate problem: unable to get local issuer certificate») y
SUIN-Juriscol (mismos dos errores). El Decreto 1082 se leyó en la compilación de la Cancillería y la Ley 1581 en la
relatoría de Colombia Compra Eficiente.

| Qué | Estado | Lo que dice la fuente (literal, recortado) | Fuente abierta |
|---|---|---|---|
| Decreto 1082 de 2015, art. 2.2.1.1.2.2.4 (oferta con valor artificialmente bajo) | VERIFICADO el texto; vigencia PARCIAL | «Si … el valor de una oferta parece artificialmente bajo, la Entidad Estatal debe requerir al oferente para que explique las razones que sustentan el valor ofrecido. Analizadas las explicaciones, el comité evaluador … debe recomendar rechazar la oferta o continuar con el análisis». **No fija porcentaje.** El artículo no lleva nota de modificación en la compilación (las modificadas la llevan); que el Decreto 0287 de 2026 no lo toque queda [sin verificar]. | cancilleria.gov.co, Normograma, `decreto_1082_2015.pdf` |
| Guía CCE de ofertas artificialmente bajas | VERIFICADO código, fecha y reglas; la fórmula final, PARCIAL | Pie de página: «Código: CCE-EICP-GI-27 Versión: 01 Fecha: 16-12-2024». Numeral 2.1.1 (págs. 9–10): «Se recomienda su utilización cuando … recibe menos de 5 ofertas» y «debe solicitar aclaración a los proponentes cuyas ofertas sean menores en un 20%, o un mayor porcentaje, al costo total estimado». Numeral 2.1.2 (pág. 10): «se sugiere utilizarla cuando la Entidad recibe cinco (5) o más ofertas» con mediana (o promedio «dependiendo de la dispersión»), desviación estándar y «valor mínimo aceptable»; la fórmula de la pág. 11 es una **imagen sin texto**; «mediana menos una (1) desviación estándar» solo consta literal en la guía de 2017. Son recomendaciones («se recomienda», «se sugiere»), y la pág. 11 añade que la entidad «puede fijar un valor mínimo aceptable distinto». | colombiacompra.gov.co, `guia_para_el_manejo_de_ofertas_artifialmente_bajas.pdf` (2025/04) y guía de 2017 (`20170522guiapreciosartificialmentebajos.pdf`) |
| Documento Tipo de licitación de obra de infraestructura de transporte, versión 4 | VERIFICADO | Resolución **465 de 2024** (10-sep-2024, Diario Oficial 52.876), aplica a avisos de convocatoria desde el **3-feb-2025**; documento base con código CCE-EICP-GI-01. Numeral 4.1.4: «1 Mediana con valor absoluto · 2 Media geométrica · 3 Media aritmética baja · 4 Menor valor», «la entidad tomará los centavos de la TRM»; tabla «De 0.00 a 0.24 → 1 · De 0.25 a 0.49 → 2 · De 0.50 a 0.74 → 3 · De 0.75 a 0.99 → 4» (rangos inclusive); «hasta el séptimo (7°) decimal del valor obtenido como puntaje»; puntajes negativos «obtienen cero (0) puntos»; «Si este pronunciamiento, se realiza hasta las 3:00 pm, la entidad tomará la TRM que rija para el día hábil siguiente. En caso contrario … la TRM que rija para el segundo día hábil siguiente»; con una sola oferta habilitada «podrá prescindir de la definición de la TRM y escogencia de método». | sidn.ramajudicial.gov.co (resolución); colombiacompra.gov.co/documentos-tipo/vigentes (ficha) y `/documentos-tipo/descarga/29920/` (`DocBase_LicObra_TLPV4.docx`) |
| Documento Tipo de menor cuantía de transporte, versión 3 | VERIFICADO (la fecha exacta de la resolución, PARCIAL: PDF escaneado) | Resolución **463 de 2024**, vigente para avisos desde el 3-feb-2025; código CCE-EICP-GI-02. Mismos 4 métodos y misma tabla. TRM: «la que rija el segundo día hábil después de finalizado el periodo de traslado del informe de evaluación». | colombiacompra.gov.co, ficha nodo 29393, `463_resoluion463_1_1.pdf`, paquete `Documentos-Tipo-1.zip` |
| Documentos Tipo de infraestructura **social** (edificaciones: educación, salud, cultura y deporte, institucional, vivienda) | VERIFICADO | Resoluciones **539** (licitación, versión 2), **540** (menor cuantía) y **541** (mínima cuantía) del 21-ago-2025 (fecha tomada del concepto C-595 de 2026; los PDF de las resoluciones están escaneados sin texto), para avisos desde el **16-feb-2026**. El documento base de licitación V2 trae en 4.1.4 **los mismos 4 métodos, la misma tabla de centavos y la misma regla de las 3:00 p.m.** que transporte V4. | colombiacompra.gov.co/documentos-tipo/modalidad/… (fichas), `/descarga/29837/` (`DocBase_LicitacionObra_ISocialLV2.docx`), relatoría C-595 de 2026 |
| Documentos Tipo de agua potable y saneamiento básico | VERIFICADO (fecha de la Res. 546 de 2026, [sin verificar]) | Solo hay licitación (no menor ni mínima cuantía). Vigente: Res. 248 de 2020 modificada por la 275 de 2022, versión 1, hasta el 28-feb-2027: mismos 4 métodos y tabla, pero **otra regla de TRM** («la que rija el día hábil siguiente del día en que efectivamente sea la apertura del segundo sobre», apertura antes de las 3:00 p.m.). La versión 2 (Res. 546 de 2026, desde el 1-mar-2027) adopta la regla de transporte V4. | colombiacompra.gov.co, sector 717, `/descarga/30420/` y `/descarga/30129/` |
| Conceptos de la relatoría | VERIFICADOS C-982 de 2025 (29-ago-2025), C-1778 de 2025 (30-dic-2025), C-1400 de 2026 (15-oct-2026), C-853 de 2024 (26-dic-2024); **C-161, PARCIAL** | Los cuatro dicen lo atribuido (regla de las 3:00 p.m.; oferta única sin TRM; suspensión de la audiencia sin cambiar el método ya definido; V3 de menor cuantía con la TRM del segundo día hábil tras el traslado). «C-161» existe para cada año 2020–2026; el de 2024 trata de un box culvert y de la Res. 240 de 2020 (derogada), no del «documento base». | relatoria.colombiacompra.gov.co/conceptos/… |
| Mínima cuantía: adjudicar a la de menor precio que cumpla | VERIFICADO | Decreto 1082, art. 2.2.1.2.1.5.2 «modificado por el artículo 2 del Decreto 1860 de 2021»; numeral 7: «La Entidad Estatal debe aceptar la oferta de menor precio, siempre que cumpla con las condiciones establecidas en la invitación». | cancilleria.gov.co, `decreto_1860_2021.htm` |
| Códigos UNSPSC de «obra civil» | VERIFICADO lo que existe: no hay lista oficial de «obra civil» | Circular Externa 12 de 2014 de CCE: los servicios de construcción van en el segmento **72**; el 95 «no es adecuado para la identificación del objeto en el Proceso de Contratación de obra pública». Los documentos base de transporte y social piden codificar «bajo el segmento 72»; los de agua potable, «72, 76, u 83». Ninguna fuente oficial usa el 81 para delimitar obra. | colombiacompra.gov.co, `20140505circular12.pdf`, documentos base, FAQ de APSB, guía de codificación G-CBS-02 (marzo 2026) |
| Ley 1581 de 2012, art. 2 | VERIFICADO (vía relatoría de CCE) | «serán aplicables a los datos personales registrados en cualquier base de datos que los haga susceptibles de tratamiento por entidades de naturaleza pública o privada». | relatoria.colombiacompra.gov.co/normativa/ley-1581-de-2012/ |
| Diccionario de datos de CCE | VERIFICADO lo publicado: **no hay diccionario que diga qué es `valor_de_la_oferta`** | La página de datos abiertos de CCE lista 4 conjuntos (Contratos, Procesos, SECOP I y su histórico) y **no lista «Ofertas Por Proceso»**; el manual de datos abiertos tampoco. Las fichas Socrata definen `valor_de_la_oferta` como «Valor registrado en la oferta» y `respuestas_al_procedimiento` como «Respuestas hechas al procedimiento, tanto de proveedores como de la misma entidad». | colombiacompra.gov.co/transparencia/datos-abiertos/…; datos.gov.co fichas p6dx-8zbt y wi7w-2nvm |

Lo que esto cambia para el plan: (a) la fórmula de ponderación es **una sola** para transporte V4, social V2 y
agua potable (misma tabla de centavos); lo que cambia por versión es **qué TRM** se toma (día hábil siguiente o
segundo, por hora del pronunciamiento; en menor cuantía, segundo día hábil tras el traslado del informe; en
agua potable V1, el día hábil siguiente a la apertura del sobre 2), y la fecha de la TRM NO consta en los datos
abiertos: el método efectivo de cada proceso sigue sin ser observable; (b) la regla de oferta artificialmente
baja es una recomendación con dos ramas (20 % bajo el costo estimado con menos de 5 ofertas; mediana o promedio
menos una desviación con 5 o más) y la entidad puede fijar otra: no es un umbral legal fijo; (c) delimitar obra
por UNSPSC solo tiene base para el segmento 72 (más 76 y 83 en agua potable), y el 42 % del universo de obra
adjudicada desde 2024 no trae código: se mantiene `tipo_de_contrato='Obra'` como delimitador y el segmento como
variable, no como filtro.

## 3. Calidad de las ofertas (Fase 1, paso 4)

[en construcción: corrida del inventario desde 2019 en curso]

## 4. Checkpoint C1 · decisiones que se piden

[en construcción]
