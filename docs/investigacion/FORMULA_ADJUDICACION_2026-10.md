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

## 3. Calidad de las ofertas y cascada de exclusiones (Fase 1 paso 4 y Fase 2; corrida del inventario desde 2019, 21-oct-2026 04:17–05:14 UTC)

Corrida de `scripts/base_obra/inventario.js` con `desde=2019-01-01` sobre `tipo_de_contrato='Obra'`: **93.424 filas** de
p6dx (corte 04:19 UTC) que son **36.741 portafolios** distintos (24.470 con más de una fila: fases; 1.026 con precios base
distintos: lotes). Ofertas cruzadas: 585.235 grupos proveedor × valor en `wi7w` (2024 →) y 489.216 en `b28v` (≤ 2023);
0 lotes de consulta fallidos (cada id quedó medido). Lugar de ejecución de jbjy para 24.784 de los 25.086 usables.

### 3.1 Cascada de exclusiones (portafolios, 2019 → 20-oct-2026)

| Modalidad | Total | No adjudicado | Sin precio base | Lotes (p6dx) | Adjudicado sin ofertas en datos abiertos | Lote por ofertas | Cero ofertas válidas | **Usables** |
|---|---|---|---|---|---|---|---|---|
| Licitación pública | 9.158 | 2.138 (cancelados 1.218, en evaluación 296, publicados/abiertos 365, seleccionados sin adjudicar 239) | 5 | 561 | 150 | 547 | 226 | **5.531** (3.762 con 3+ ofertas · 1.769 con 1–2) |
| Menor cuantía | 16.660 | 3.811 (cancelados 2.107, en evaluación 383, publicados/abiertos 851, seleccionados sin adjudicar 432) | 1 | 311 | 429 | 47 | 669 | **11.392** (5.380 con 3+ ofertas · 6.012 con 1–2) |
| Mínima cuantía | 10.923 | 1.979 (cancelados 1.322, en evaluación 99, publicados/abiertos 331, seleccionados sin adjudicar 225) | 5 | 3 | 310 | 46 | 417 | **8.163** (4.473 con 3+ ofertas · 3.690 con 1–2) |

### 3.2 Calidad de las filas de ofertas (sobre los adjudicados candidatos a usables)

| Comprobación del prompt | Resultado medido |
|---|---|
| Filas repetidas (misma oferta publicada muchas veces) | 15.765.447 filas crudas de más, reducidas en el servidor con `$group` a 1.074.451 grupos proveedor × valor |
| Duplicados (mismo proveedor, mismo valor, otra fila) | 836.635 grupos en 11.418 procesos; entre `wi7w` y `b28v`: 0 (los dos conjuntos no se solapan: 0 procesos en ambos) |
| Valores cero | 0 entre los no confidenciales; las filas «Confidencial» (3.259, valor 0 por construcción) se cuentan aparte y nunca como oferta |
| Valores negativos o no numéricos | 12 no numéricos; negativos: 0 en el censo de todo `wi7w` (tramo «negativo» ausente en la agregación por valor) |
| Moneda distinta de COP | 0 (100 % COP en `wi7w` y en `b28v`) |
| Marcadores (1, 999999999…) y otra medida | **11.765 ofertas bajo el 50 % del precio base** (precios unitarios, miles, errores) y **6.665 por encima del precio base**, en 4.165 procesos: quedan fuera del cálculo de posición; ninguna rescatada en el inventario (`rescatada_bajo_50` = 0 porque el inventario no trae los contratos; el rescate lo aplica `base.js`) |
| Un proveedor con 2+ valores en rango (lote por ofertas) | 640 procesos apartados |
| Ofertas sin proceso en p6dx | no medido: la consulta va de p6dx hacia las ofertas por lista de ids, así que las ofertas huérfanas no se ven [sin medir] |
| Procesos adjudicados sin ofertas publicadas | 889 (ver cascada) |

Lo que falló en esta corrida: los conteos anuales de `b28v` para 2017 a 2023 y el conteo de `9sue` agotaron los 5
intentos («The operation was aborted due to timeout»); son conteos informativos y las cifras de la sección 2.1 salieron
de consultas directas que sí respondieron. La cascada por AÑO y la calidad por año salen de
`tools/analisis/analisis.py` sobre `base.jsonl.gz` (sección 4).

### 3.3 Usables por año de adjudicación (una fila por proceso; «con ganador» = la oferta del adjudicatario se emparejó con una publicada y lo adjudicado no la contradice)

| Año | Licitación: usables / con ganador | Menor cuantía: usables / con ganador | Mínima: usables / con ganador | Fuente de las ofertas |
|---|---|---|---|---|
| 2019 | 280 / 238 | 646 / 508 | 677 / 583 | b28v (histórico) |
| 2020 | 209 / 176 | 579 / 497 | 569 / 501 | b28v (histórico) |
| 2021 | 659 / 562 | 1.152 / 1.055 | 860 / 784 | b28v (histórico) |
| 2022 | 927 / 816 | 1.122 / 1.032 | 735 / 658 | b28v (histórico) |
| 2023 | 1.071 / 934 | 1.925 / 1.767 | 1.300 / 1.176 | b28v (histórico) |
| 2024 | 557 / 496 | 1.658 / 1.532 | 1.309 / 1.238 | wi7w |
| 2025 | 849 / 732 | 2.478 / 2.345 | 1.678 / 1.585 | wi7w |
| 2026 | 606 / 565 | 1.610 / 1.543 | 965 / 904 | wi7w |
| sin fecha de adjudicación | 13 | 39 | 39 | — |

Inconsistencias apartadas entre los usables (no entran en ninguna cifra de posición): adjudicado distinto en más del 1 % de la oferta publicada del ganador: licitación 311, menor cuantía 528, mínima 378; adjudicado por encima del precio base: 12, 15 y 17. SHA-256 de `base.jsonl.gz`: `351e745e030af53e2278b91dd6cb4a6414d4c8e73b533f280137f6fdba97865b`.

## 4. Checkpoint C1 y la decisión del dueño

El material de C1 (secciones 1 a 3) se entregó el 21-oct-2026. El dueño respondió el mismo día: seguir con las
fases 2 a 7 usando 2024–2026 como ventana principal, usar 2022–2023 (y lo que haya desde 2019) solo para medir si
las cifras cambian y si hay tendencia por año, no pasar ningún límite gratuito, y guardar fuera del repositorio solo
lo imprescindible. No fijó umbrales de éxito distintos de los sugeridos en el prompt: rigen los de
`tools/analisis/PREREGISTRO.md` (mejora ≥ 3 puntos de cada 100 frente a la línea base con IC 95 % por entidad que
excluya 0; calibración con pendiente entre 0,8 y 1,2; sin cambio de signo entre años). D2 (sectores): se mantuvo
`tipo_de_contrato='Obra'` sin filtrar por UNSPSC (sección 2.2). D5 (margen mínimo y tope de riesgo): el backtest
no usa el costo del dueño, así que el margen se reporta como nivel de precio (porcentaje del presupuesto), y el
riesgo como «de cada 100 ofertas, cuántas quedan bajo mediana − σ».

## 5. Hipótesis pre-registradas: qué sobrevivió (Fase 3; `tools/analisis/resultados/fase3_hipotesis.json`)

Universo: licitación pública y menor cuantía, usables, sin inconsistencia, por año de adjudicación. Ventana
principal 2024–2026 (7.470 procesos: 1.897 licitaciones, 5.573 menores cuantías; 3.834 mínimas aparte). Intervalos:
remuestreo por bloques de entidad, 2.000 réplicas, semilla 20261021. Corrección por pruebas múltiples
(Benjamini–Hochberg al 5 % sobre las 13 pruebas con p): todas las p ajustadas quedan por debajo de 0,03 salvo H6
(0,32, donde NO rechazar es lo esperado) y la Ley de Garantías (0,23). Como los p salen de 2.000 réplicas, su suelo
es 1/2.001: «< 0,001» significa eso, no cero. **Que una prueba sea significativa no la vuelve útil: lo que
decide es el tamaño del efecto frente al umbral declarado.**

| # | Hipótesis | Resultado 2024–2026 | ¿Supera su umbral? | Con 2022–2026 · 2019–2026 |
|---|---|---|---|---|
| H1 | r_adj estable por entidad | Con solo comparables ANTERIORES (≥ 5), la mediana de la entidad explica fuera de muestra el 45 % de la varianza de r_adj en licitación (IC 23–59 %) y el 55 % en menor cuantía (IC 29–67 %); error absoluto medio 1,76 puntos (entidad) frente a 2,95 (país) y 2,47 (departamento). Rango intercuartil dentro de la entidad 1,1 puntos frente a 5,5 global. | Sí (R² ≥ 0,10; IQR ≤ 70 %). **Pero** la variación de r_adj está dominada por cuántos ofertan (H2): parte del «efecto entidad» es que la misma entidad recibe siempre pocas ofertas. [Sujeto a la auditoría: F1] | R² cae a 0,26 / 0,40 (2022–2026) y 0,21 / 0,21 (2019–2026): la historia vieja estorba más de lo que ayuda |
| H2 | Más oferentes, más baja | Mediana de la baja del ganador por número de ofertas 1 · 2 · 3–4 · 5–9 · 10+: licitación 0 · 0,1 · 1,0 · 3,2 · 5,5 puntos; menor cuantía 0 · 0,2 · 2,0 · 4,7 · 6,8; mínima 0 · 1,2 · 10,2 · 18,0 · 23,4. Pendiente sobre log(n): 1,44 (IC 1,25–1,63) y 2,08 (IC 1,67–2,27). | Sí, con holgura | Igual forma; con 10+ la baja es 4,6–4,9 puntos en las ventanas largas |
| H3 | Acumulación de ofertas | Las ofertas se apiñan alrededor de la mediana del proceso: en licitación (procesos con 4+ ofertas) **el 46 % de las ofertas queda a menos de medio punto de la mediana de las OTRAS ofertas** (12.049 de 26.373; 4,6 veces lo que hay en las celdas vecinas); en menor cuantía, el 35 % (3,4 veces). **El 14 % de las ofertas es un porcentaje entero exacto del presupuesto** (95,0 %, 97,0 %…) y el 13,6 % de las de licitación es exactamente el 100 %. Hay un VACÍO justo un punto por debajo de la mediana (−35 % frente a los vecinos): pocas ofertas se sitúan apenas debajo del grupo. Alrededor del 80 % y del 88 % del presupuesto no hay acumulación (las celdas están por debajo de sus vecinas). | Sí (exceso ≥ 25 %) | Igual en todas las ventanas (456–477 % en licitación) |
| H4 | Posición del ganador | **La oferta más baja no gana más que una al azar**: en licitación gana el 33,6 % de las veces (IC 30–37 %) cuando por azar sería el 35,7 %; en menor cuantía 60,8 % frente a 61,2 %. Con 3–4 ofertas en licitación, la más baja gana el 16 % frente al 30 % que le tocaría al azar; con 10+, el 10 % frente al 5 %. La posición típica del ganador es el centro: mediana de su z = 0,08 (licitación) y 0,06 (menor cuantía); solo el 14 % de los ganadores queda a más de una desviación por debajo de la media. En mínima cuantía la más baja gana el 59 % (azar: 53 %), no el 100 % que manda la norma: la más baja publicada no es siempre la que cumple. | La hipótesis era «el ganador no suele ser el más bajo»: confirmada. | Igual: 37,8 % vs 38,0 % (2022–2026), 38,7 % vs 37,4 % (2019–2026) |
| H5 | Dígitos (control) | Benford se rechaza (chi² 363, 8 g. l.) como es normal en precios anclados a un presupuesto; el 25 % de las ofertas trae centavos y el 5,8 % es múltiplo exacto de un millón. No hay marcadores masivos. | Solo control | Igual |
| H6 | Centavos de la TRM parejos | 663 días hábiles 2024–2026: 174 · 153 · 181 · 155 en los cuatro rangos; chi² 3,49 (3 g. l.), p 0,32: no se rechaza el reparto parejo. | Sí (el método es un sorteo justo; P(m) = ¼) | 1.135 días: p 0,42; 1.850 días: p 0,72 |
| H7 | La ubicación mejora la predicción | Añadir departamento y municipio a entidad + modalidad + tamaño mejora el error absoluto medio de r_adj fuera de muestra en 0,10 puntos (licitación, IC 0,06–0,13) y 0,14 (menor cuantía, IC 0,12–0,17) en validación cruzada; 0,10 y 0,23 en validación temporal (2026). Dejando un departamento fuera, el error no cambia (2,80 frente a 2,80). | **No** (umbral 0,5 puntos): significativo pero irrelevante | 0,07 / 0,11 y 0,07 / 0,10 |
| H8 | Ventaja local | En 1.779 procesos (2019–2026) con oferentes del departamento de la obra y de fuera a la vez, **ganó un local en 55 de cada 100 cuando por azar serían 44**; razón de momios 1,70 (IC 1,54–1,89), igual en 2019–2023 (1,65) y 2024–2026 (1,78). Cobertura: el domicilio se conoce para el 37 % de las ofertas (solo las que traen NIT válido y figuran en Proveedores Registrados). | Sí (≥ 1,3 y cobertura ≥ 30 %) [sujeto a la auditoría: F7] | Estable |
| H9 | Tamaño y versión del documento tipo | Los procesos grandes (tercil superior del precio base) se adjudican con 3,0 puntos más de baja que los pequeños en licitación (IC 1,2–4,2) y 1,0 en menor cuantía (IC 0,2–3,1); el tamaño mediano trae más ofertas (6 y 8 frente a 4). Versión 4 de transporte (avisos desde el 3-feb-2025): sin cambio medible en licitación (+0,8 puntos, IC −0,5 a 2,1). Versión 2 de infraestructura social (desde el 16-feb-2026): −3,2 puntos en licitación (IC −4,2 a −0,7), **pero coincide con que 2026 es el año de más competencia y no se puede separar de la tendencia del año** (sección 7). | Parcial (tamaño sí en licitación; versión no atribuible) | Tamaño: 1,3–1,8 puntos |
| H10 | Calendario | Diciembre: +0,3 puntos de r_adj (IC 0,1–1,0), menos baja y 1 oferta mediana; abajo del umbral de 2 puntos. Ley de Garantías 2026 (cierres entre el 31-ene y el 21-jun-2026: 998 procesos) frente a la misma época de 2025 (716): diferencia de r_adj 0,27 puntos (IC −0,2 a 1,1) y 0 ofertas de diferencia. | **No** | Diciembre 0,8–1,0 puntos |
| H11 | Reincidencia (control) | El ganador ya había ganado 2 o más veces antes en la misma entidad en el 1,4 % de las licitaciones y el 9,1 % de las menores cuantías. | Control: no entra al optimizador | 1,3–1,4 % y 10 % |

Lo que esto dice en lenguaje llano: **la baja que gana depende sobre todo de cuántos se presentan, no de dónde está la
obra**; las ofertas se juntan en un pelotón estrecho alrededor de la mediana del proceso y el ganador es casi
siempre uno del pelotón, no el más barato; y ser de la región ayuda más que cualquier variable de precio que
pudimos medir.

## 6. Modelo del ganador, líneas base y optimizador (Fases 4 a 7; `fase5_7_modelo*.json`)

### 6.1 Reconstrucción del ganador con las 4 fórmulas (ya medida por la base del 17-oct, replicada aquí sobre 2019–2026)

Con TODAS las ofertas publicadas como si fueran hábiles, algún método pone primero al ganador real en el 40,6 %
de las licitaciones con competencia real (608 de 1.498 con dato de TRM) y en el 57,7 % de las menores cuantías
(1.213 de 2.104); el método que señala la TRM estimada reproduce al ganador en el 11,7 % y el 19,6 %, igual que
cualquier método fijo (12–13 % y 16–24 %). El logit condicional del ganador (posición, distancia a la mediana, z,
rango, «es la más baja»; entrenado con 6.579 procesos ≤ 2024, probado en 1.740 de 2025 con 2+ ofertas) apenas
mejora la verosimilitud de elegir al azar (−1,664 frente a −1,667 por proceso) y acierta al ganador el 32 % de las
veces frente al 27 % del azar; «la más baja» acierta el 19,7 %. **Lo que decide quién gana (la habilitación y los
otros 51,5 puntos del puntaje) no está en los datos abiertos.**

### 6.2 El backtest honesto (validación 2025; prueba 2026 sin tocar)

Para cada proceso adjudicado en 2025, cada regla elige un precio con lo que había ANTES de su fecha de adjudicación;
ese precio se inserta entre las ofertas reales del proceso y «gana» si queda primero con cada una de las 4
fórmulas (empate: 1/k), promediando los cuatro métodos (sorteo parejo, H6). Dos escenarios, porque la habilitación
no se ve: (a) todas las publicadas eran hábiles; (b) una oferta que queda por debajo de «mediana − σ» de las ofertas
(incluida ella) se trata como rechazada. La verdad está entre los dos. Reglas:
B0 (el mínimo admisible: 88 % del presupuesto, el corte de la alerta) · B1 (mediana de r_adj de los comparables
anteriores de la entidad, ≥ 5; si no, departamento; si no, país) · **B2 (Detekta hoy: réplica de la cascada del
índice de baja —entidad+familia → entidad → departamento+familia, mediana de la baja en puntos enteros, mínimo
5—)** · B2_exacta (lo mismo sin redondear) · constantes 95 %, 96,5 % y 98 % · P25 de la entidad · Piso_comparables
(mediana del «mediana − σ» de los comparables anteriores + 0,5 puntos) · F_opt (el precio de una rejilla 80–100 %
que más veces habría ganado al insertarse en los comparables anteriores) · F_opt_piso (lo mismo contando como
rechazada la oferta bajo el piso).

**validacion_2025 · todos los procesos (3.077)**

| Regla | Precio medio (% del presupuesto) | Gana (de cada 100) · todas las ofertas publicadas como hábiles | IC 95 % | Gana si quedar bajo mediana − σ es rechazo | IC 95 % | Queda bajo ese piso (de cada 100) |
|---|---|---|---|---|---|---|
| B0 | 88,0 | 63,2 | 58,6–66,9 | 44,8 | 40,1–49,2 | 51,4 |
| B1 | 98,4 | 39,4 | 35,8–42,6 | 36,2 | 32,7–39,3 | 7,3 |
| B2 | 98,4 | 23,5 | 21,7–25,4 | 21,0 | 19,3–22,9 | 6,0 |
| B2_exacta | 98,3 | 38,5 | 35,4–41,5 | 35,3 | 32,3–38,3 | 7,4 |
| C95 | 95,0 | 57,9 | 52,6–62,4 | 49,8 | 45,0–54,1 | 19,8 |
| C96.5 | 96,5 | 55,6 | 50,3–60,1 | 49,0 | 44,0–53,5 | 14,9 |
| C98 | 98,0 | 51,7 | 46,6–56,2 | 46,6 | 41,8–50,9 | 10,7 |
| F_opt | 81,2 | 65,3 | 61,2–68,7 | 44,1 | 39,3–48,4 | 54,2 |
| F_opt_piso | 96,6 | 55,1 | 50,2–59,3 | 49,2 | 44,5–53,3 | 13,6 |
| F_opt_piso_alerta | 96,6 | 55,1 | 50,2–59,3 | 49,2 | 44,6–53,3 | 13,5 |
| P25_entidad | 97,0 | 50,8 | 46,7–54,3 | 45,2 | 41,3–48,8 | 13,8 |
| Piso_comparables | 95,4 | 57,8 | 53,0–61,9 | 50,5 | 45,9–54,6 | 17,4 |

**validacion_2025 · solo procesos con 3 o más ofertas publicadas**

| Regla | Precio medio (% del presupuesto) | Gana (de cada 100) · todas las ofertas publicadas como hábiles | IC 95 % | Gana si quedar bajo mediana − σ es rechazo | IC 95 % | Queda bajo ese piso (de cada 100) |
|---|---|---|---|---|---|---|
| B0 | 88,0 | 29,9 | 27,0–32,3 | 1,9 | 1,4–2,5 | 92,8 |
| B1 | 97,4 | 9,1 | 7,3–10,8 | 5,7 | 4,6–6,9 | 8,9 |
| B2 | 97,1 | 9,6 | 8,1–11,2 | 6,6 | 5,4–8,0 | 8,4 |
| B2_exacta | 97,1 | 9,9 | 8,4–11,6 | 6,6 | 5,5–7,9 | 9,0 |
| C95 | 95,0 | 19,2 | 15,5–22,5 | 10,5 | 8,4–12,6 | 26,2 |
| C96.5 | 96,5 | 15,5 | 12,3–18,6 | 9,1 | 7,1–11,2 | 17,5 |
| C98 | 98,0 | 10,7 | 8,2–13,2 | 6,3 | 4,7–8,1 | 10,5 |
| F_opt | 80,9 | 34,8 | 32,0–36,9 | 0,8 | 0,4–1,3 | 97,2 |
| F_opt_piso | 96,1 | 16,0 | 13,3–18,6 | 10,0 | 8,5–11,8 | 16,2 |
| F_opt_piso_alerta | 96,1 | 16,0 | 13,3–18,6 | 10,1 | 8,6–11,8 | 15,9 |
| P25_entidad | 95,6 | 16,3 | 14,3–18,4 | 10,2 | 8,9–11,5 | 18,8 |
| Piso_comparables | 95,1 | 19,8 | 17,1–22,5 | 12,1 | 10,7–13,8 | 22,1 |

**validacion_2025 · 3+ ofertas, con el piso como rechazo: cada regla frente a la constante 96,5 %** (diferencia por proceso, puntos de cada 100, IC 95 % por remuestreo de entidades)

| Comparación | Diferencia | IC 95 % | Procesos emparejados |
|---|---|---|---|
| B0 − C96.5 | -7.2 | -9.3 a -5.3 | 1.231 |
| B1 − C96.5 | -3.4 | -5.1 a -1.8 | 1.231 |
| B2 − C96.5 | -2.4 | -4.8 a -0.4 | 1.231 |
| B2_exacta − C96.5 | -2.5 | -4.7 a -0.7 | 1.231 |
| C95 − C96.5 | 1.4 | 0.1 a 2.8 | 1.231 |
| C98 − C96.5 | -2.7 | -4.1 a -1.6 | 1.231 |
| F_opt − C96.5 | -8.3 | -10.4 a -6.4 | 1.231 |
| F_opt_piso − C96.5 | 1.0 | -0.3 a 2.0 | 1.231 |
| F_opt_piso_alerta − C96.5 | 1.0 | -0.3 a 2.1 | 1.231 |
| P25_entidad − C96.5 | 1.1 | -0.6 a 2.5 | 1.231 |
| Piso_comparables − C96.5 | 3.1 | 1.5 a 4.3 | 1.231 |

**validacion_2025 · 3+ ofertas, con el piso como rechazo: cada regla frente a B2 (Detekta hoy)** (diferencia por proceso, puntos de cada 100, IC 95 % por remuestreo de entidades)

| Comparación | Diferencia | IC 95 % | Procesos emparejados |
|---|---|---|---|
| B0 − B2 | -4.7 | -6.3 a -3.3 | 1.231 |
| B1 − B2 | -1.0 | -2.1 a 0.3 | 1.231 |
| B2_exacta − B2 | -0.1 | -0.7 a 0.6 | 1.231 |
| C95 − B2 | 3.9 | 2.0 a 5.9 | 1.231 |
| C96.5 − B2 | 2.4 | 0.4 a 4.8 | 1.231 |
| C98 − B2 | -0.3 | -2.3 a 2.0 | 1.231 |
| F_opt − B2 | -5.9 | -7.2 a -4.5 | 1.231 |
| F_opt_piso − B2 | 3.4 | 1.9 a 5.2 | 1.231 |
| F_opt_piso_alerta − B2 | 3.4 | 1.9 a 5.2 | 1.231 |
| P25_entidad − B2 | 3.5 | 2.2 a 5.0 | 1.231 |
| Piso_comparables − B2 | 5.5 | 4.0 a 7.3 | 1.231 |


**Lo que dicen las tablas de 2025**

1. En los 3.077 procesos, el 43 % tuvo una sola oferta publicada: ahí gana cualquier precio por debajo de ella,
   y por eso TODAS las reglas «ganan» mucho en el total. La comparación que importa es la de **3 o más ofertas**
   (1.231 procesos).
2. Con 3+ ofertas y el piso como rechazo, **Detekta hoy (B2) habría quedado primera en 6,6 de cada 100**; una
   constante del 96,5 % en 9,1; una del 95 % en 10,5; y la mejor regla con comparables (Piso_comparables, que
   oferta en promedio al 95,1 %) en 12,1. Frente a la constante 96,5 %, Piso_comparables gana 3,1 puntos más (IC
   1,5–4,3) y F_opt_piso 1,0 (IC −0,3 a 2,0); frente a B2, 5,5 (IC 4,0–7,3) y 3,4 (IC 1,9–5,2).
3. **La diferencia grande no es por entidad ni por región: es el NIVEL de precio.** B2 y B1 ofertan al 97–98 %
   (y B2 exactamente al 100 % en el 49 % de los procesos, porque la mediana de baja de la entidad en puntos enteros
   es 0); las ofertas ganadoras de licitación con competencia están en el 95,4 % mediano (p25 93,7 %, p75 98,9 %)
   y el pelotón de ofertas, en el 95,0–95,4 %. Ofertar al 98–100 % es quedarse por encima del pelotón.
4. Ofertar muy bajo tampoco sirve: B0 (88 %) y F_opt sin piso (81 %) ganarían si todo valiera, pero el 93–97 %
   de sus ofertas queda bajo «mediana − σ», y con ese criterio como rechazo ganan 1–2 de cada 100.
5. Con 10 o más ofertas nadie pasa de 4 de cada 100 con ninguna regla: ahí el precio no decide.
6. **La probabilidad que calcula el optimizador con comparables NO está calibrada** (Brier 0,296 frente a 0,211
   de una constante; pendiente de calibración 1,39): no puede mostrarse como «probabilidad de ganar».

**Escenario histórico (el que pedía el prompt): validación 2024 con historia solo hasta 2023 (ofertas de `b28v`)**

**validacion_2024 · todos los procesos (2.028)**

| Regla | Precio medio (% del presupuesto) | Gana (de cada 100) · todas las ofertas publicadas como hábiles | IC 95 % | Gana si quedar bajo mediana − σ es rechazo | IC 95 % | Queda bajo ese piso (de cada 100) |
|---|---|---|---|---|---|---|
| B0 | 88,0 | 57,3 | 51,3–63,2 | 37,0 | 30,8–43,9 | 59,8 |
| B1 | 98,0 | 33,6 | 29,0–38,2 | 30,0 | 25,7–34,4 | 8,5 |
| B2 | 97,9 | 21,8 | 19,5–24,5 | 18,8 | 16,8–21,3 | 7,5 |
| B2_exacta | 97,9 | 33,2 | 29,0–37,7 | 29,6 | 25,8–33,8 | 8,7 |
| C95 | 95,0 | 49,4 | 42,2–56,7 | 40,9 | 34,9–47,4 | 23,4 |
| C96.5 | 96,5 | 46,7 | 38,9–54,3 | 40,6 | 33,7–47,6 | 14,8 |
| C98 | 98,0 | 41,5 | 34,4–48,8 | 36,7 | 30,3–43,7 | 10,6 |
| F_opt | 81,0 | 59,7 | 54,3–65,0 | 36,5 | 30,1–43,6 | 61,5 |
| F_opt_piso | 96,6 | 45,9 | 39,1–52,7 | 40,2 | 34,3–46,7 | 13,8 |
| F_opt_piso_alerta | 96,6 | 45,8 | 39,1–52,6 | 40,2 | 34,3–46,7 | 13,7 |
| P25_entidad | 96,5 | 44,6 | 39,7–49,9 | 38,2 | 33,0–43,9 | 19,8 |
| Piso_comparables | 95,5 | 49,2 | 42,9–55,8 | 42,0 | 36,3–48,2 | 19,3 |

**validacion_2024 · solo procesos con 3 o más ofertas publicadas**

| Regla | Precio medio (% del presupuesto) | Gana (de cada 100) · todas las ofertas publicadas como hábiles | IC 95 % | Gana si quedar bajo mediana − σ es rechazo | IC 95 % | Queda bajo ese piso (de cada 100) |
|---|---|---|---|---|---|---|
| B0 | 88,0 | 30,7 | 28,0–33,3 | 1,9 | 1,3–2,7 | 93,7 |
| B1 | 97,1 | 10,3 | 8,6–12,3 | 6,1 | 4,8–7,5 | 10,8 |
| B2 | 96,9 | 11,2 | 9,8–12,9 | 7,4 | 6,2–8,6 | 10,5 |
| B2_exacta | 96,9 | 11,7 | 10,0–13,7 | 7,3 | 6,0–8,6 | 11,8 |
| C95 | 95,0 | 18,7 | 15,1–22,4 | 8,9 | 7,4–10,7 | 31,5 |
| C96.5 | 96,5 | 15,3 | 11,6–19,8 | 8,8 | 6,7–11,4 | 18,3 |
| C98 | 98,0 | 10,6 | 7,8–14,3 | 5,7 | 4,1–7,9 | 11,8 |
| F_opt | 80,7 | 35,1 | 32,7–37,3 | 1,3 | 0,8–2,0 | 96,3 |
| F_opt_piso | 96,2 | 16,0 | 13,0–19,3 | 9,7 | 8,1–11,7 | 17,5 |
| F_opt_piso_alerta | 96,2 | 15,9 | 13,0–19,2 | 9,7 | 8,1–11,7 | 17,3 |
| P25_entidad | 95,4 | 18,2 | 16,5–20,1 | 10,2 | 9,0–11,7 | 28,9 |
| Piso_comparables | 95,3 | 19,0 | 16,9–21,6 | 10,9 | 9,7–12,2 | 25,3 |

**validacion_2024 · 3+ ofertas, con el piso como rechazo: cada regla frente a la constante 96,5 %** (diferencia por proceso, puntos de cada 100, IC 95 % por remuestreo de entidades)

| Comparación | Diferencia | IC 95 % | Procesos emparejados |
|---|---|---|---|
| B0 − C96.5 | -6.8 | -9.4 a -4.5 | 1.072 |
| B1 − C96.5 | -2.7 | -5.1 a -0.9 | 1.072 |
| B2 − C96.5 | -1.3 | -3.9 a 0.7 | 1.072 |
| B2_exacta − C96.5 | -1.5 | -4.0 a 0.4 | 1.072 |
| C95 − C96.5 | 0.1 | -2.2 a 1.9 | 1.072 |
| C98 − C96.5 | -3.1 | -4.4 a -1.9 | 1.072 |
| F_opt − C96.5 | -7.5 | -9.9 a -5.6 | 1.072 |
| F_opt_piso − C96.5 | 0.9 | -0.6 a 2.1 | 1.072 |
| F_opt_piso_alerta − C96.5 | 0.9 | -0.6 a 2.1 | 1.072 |
| P25_entidad − C96.5 | 1.4 | -0.6 a 3.0 | 1.072 |
| Piso_comparables − C96.5 | 2.1 | -0.1 a 3.9 | 1.072 |

**validacion_2024 · 3+ ofertas, con el piso como rechazo: cada regla frente a B2 (Detekta hoy)** (diferencia por proceso, puntos de cada 100, IC 95 % por remuestreo de entidades)

| Comparación | Diferencia | IC 95 % | Procesos emparejados |
|---|---|---|---|
| B0 − B2 | -5.5 | -7.0 a -4.1 | 1.072 |
| B1 − B2 | -1.4 | -2.2 a -0.4 | 1.072 |
| B2_exacta − B2 | -0.2 | -0.7 a 0.5 | 1.072 |
| C95 − B2 | 1.5 | -0.0 a 3.2 | 1.072 |
| C96.5 − B2 | 1.3 | -0.7 a 3.9 | 1.072 |
| C98 − B2 | -1.8 | -3.6 a 0.5 | 1.072 |
| F_opt − B2 | -6.2 | -7.4 a -4.7 | 1.072 |
| F_opt_piso − B2 | 2.2 | 0.8 a 4.2 | 1.072 |
| F_opt_piso_alerta − B2 | 2.2 | 0.8 a 4.2 | 1.072 |
| P25_entidad − B2 | 2.7 | 1.5 a 4.2 | 1.072 |
| Piso_comparables − B2 | 3.4 | 2.2 a 4.8 | 1.072 |


Mismo orden y mismas distancias: con 3+ ofertas y piso, B2 7,4 · C96,5 8,8 · C95 8,9 · F_opt_piso 9,7 · P25 10,2 ·
Piso_comparables 10,9. Aquí Piso_comparables supera a la constante por 2,1 puntos con un IC que roza el cero
(−0,1 a 3,9): **el criterio de «≥ 3 puntos sobre la mejor constante» se cumple en 2025 y no en 2024**. Y con
comparables solo desde 2024 (sin 2019–2023) los resultados de 2025 cambian menos de 1,5 puntos en todas las
reglas: la historia vieja no añade ni quita.

## 7. ¿Cambian las cifras con 2022–2023, y hay tendencia por año? (`tendencia_por_anio` en `fase3_hipotesis.json`)

| Año | Licitación: procesos · mediana r_adj (IC) · P10 · ofertas medianas · piso mediano | Menor cuantía: procesos · mediana r_adj · ofertas · piso | Mínima: procesos · mediana r_adj · ofertas |
|---|---|---|---|
| 2019 | 250 · 98,5 % (98,2–99,2) · 95,2 · 11,5 · 97,1 % | 540 · 98,3 % · 4 · 96,7 % | 612 · 82,0 % · 4 |
| 2020 | 185 · 98,4 % (97,7–99,0) · 92,3 · 13 · 96,5 % | 514 · 98,0 % · 5 · 95,4 % | 523 · 80,4 % · 5 |
| 2021 | 599 · 99,3 % (98,7–99,6) · 94,2 · 4 · 94,9 % | 1.090 · 98,1 % · 3 · 95,7 % | 813 · 85,0 % · 4 |
| 2022 | 885 · 97,9 % (97,0–98,7) · 93,6 · 5 · 94,5 % | 1.074 · 98,5 % · 2 · 95,1 % | 684 · 87,0 % · 4 |
| 2023 | 1.019 · 97,0 % (96,0–98,0) · 93,9 · 6 · 94,6 % | 1.837 · 99,0 % · 2 · 94,7 % | 1.234 · 93,1 % · 2 |
| 2024 | 525 · 97,6 % (96,2–99,1) · 93,4 · 7 · 94,1 % | 1.591 · 99,2 % · 2 · 93,9 % | 1.267 · 91,5 % · 3 |
| 2025 | 781 · 98,9 % (98,1–99,5) · 93,4 · 4 · 93,6 % | 2.404 · 99,8 % · 2 · 93,4 % | 1.626 · 97,4 % · 2 |
| 2026 (a oct) | 591 · 96,1 % (94,8–98,1) · 92,3 · 8 · 92,6 % | 1.578 · 99,9 % · 2 · 93,0 % | 941 · 99,2 % · 2 |

Lectura, con la cautela de que 2019–2020 son años de pandemia con 11–13 ofertas medianas y de que 2026 está
incompleto:
- **La mediana de r_adj no tiene tendencia útil** (pendiente −0,24 puntos por año en licitación, +0,29 en menor
  cuantía): sube y baja con la mezcla de procesos de un solo oferente.
- **El piso (mediana − σ de las ofertas) de licitación sí baja de forma sostenida**: 97,1 % → 94,5 % (2022) → 93,6 %
  (2025) → 92,6 % (2026): medio punto por año en los últimos cuatro. La misma deriva se ve en el P10 de r_adj.
  Es la cifra con más pinta de «predecible», y es a la baja: el pelotón se aprieta y desciende.
- **Mínima cuantía cambió de régimen**: la mediana de r_adj pasó del 80–87 % (2019–2022) al 97–99 % (2025–2026),
  al tiempo que las ofertas medianas bajaron de 4–5 a 2. Mezclar 2019–2023 con 2024–2026 en mínima describe un
  mercado que ya no existe.
- **Sumar 2022–2023 a la ventana principal mueve las medianas de licitación y menor cuantía menos de 1 punto**
  (97,6–98,9 % frente a 97,0–99,0 %) y el piso 0,5–1 punto hacia arriba; H1 pierde la mitad de su poder
  explicativo con la ventana larga. Para una referencia de precio hoy, el año más reciente manda.

## 8. Límites que el informe declara (sección 7 del prompt)

1. **La habilitación y los rechazos no se ven**: «todas las publicadas eran hábiles» es un supuesto; por eso cada
   cifra del backtest va con y sin el piso como rechazo, y la verdad está entre las dos.
2. **El contrafactual supone que los demás no reaccionan** y que insertar una oferta no cambia las otras. Y la
   oferta ganadora real sigue dentro del conjunto cuando se inserta la hipotética.
3. **Solo se ven procesos adjudicados con ofertas publicadas**: los desiertos, cancelados (1.946 desde 2024) y los
   adjudicados sin ofertas publicadas (880 en 2019–2026) quedan fuera; si los cancelados son los de ofertas más
   agresivas, el piso real es más bajo que el medido.
4. **Los datos los digitan las entidades**: 1.261 inconsistencias apartadas, 18.430 ofertas bajo el 50 % o sobre
   el presupuesto fuera del cálculo, NIT de relleno, y `respuestas_al_procedimiento` incluye respuestas de la
   propia entidad.
5. **Un patrón que todos adopten desaparece**: si el mercado ofertara al 95 % en bloque, la mediana y el piso
   bajarían con él.
6. **El método de ponderación de cada proceso no consta**; H6 solo prueba que el sorteo es parejo.
7. **Ninguna cifra de aquí es una probabilidad individual**: la calibración lo descarta (6.2, punto 6).

