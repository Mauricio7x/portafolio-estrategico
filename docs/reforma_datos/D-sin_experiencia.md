# D · Reforma de los datos de la tarjeta · lente «sin experiencia» (13-sep-2026)

> Para: dueño · Estado: propuesta de diseño (informe fechado) · Sustituido por: —
> Árbol: `main` en `3482415`, `git status --short` vacío antes y después. Nada del repositorio se modificó.
> Guiones de este informe (fuera del árbol): `d_sin_repro.js` (ejemplo de la captura con las funciones reales; salida en `d_sin_repro.salida.txt`) y `d_sin_textos.js` (los 70 textos propuestos contra las cercas reales de lenguaje y la lista de jerga de la suite: 0 fallos).

## 0. Qué es esto y en qué se apoya

El dueño pidió (13-sep-2026) reformar TODO lo que la tarjeta y sus pantallas de detalle enseñan, con la pregunta «¿el dato que doy es el mejor que puedo dar con los datos que tengo, y qué otro dato puedo dar con este dato?», la estructura CORTO · CONCISO · EN QUÉ BENEFICIA · EN QUÉ AFECTA, «con quién conviene» en cada tarjeta, el perfil del competidor casi instantáneo con espera animada, y todo cierto siempre.

Este informe lo mira con el lente de **quien empieza**: un ingeniero civil recién egresado o una empresa pequeña que licita por primera vez. No sabe qué mirar, confunde «poder presentarse» con «ganar puntos», no sabe si le cabe ni cuánto bajar, y necesita que cada cifra le diga qué HACER a continuación.

**Evidencia.** Los seis informes de la fase anterior, leídos enteros: A1 (censo de los 34 datos de la tarjeta y de lo que viaja sin verse), A2 (el perfil del competidor existe entero y está escondido a 3 clics; cómo hacerlo instantáneo), A3 (el recomendador de socio: qué decide, qué no considera, cómo llevarlo a cada tarjeta), A4 (columnas y datasets no explotados), A5 (33 necesidades del ingeniero, 16 de quien empieza), A6 (cerraduras, tokens de movimiento, cola viva). Lo que este informe añade lo verificó en el árbol con `node tests/mapa.js`, lecturas por rango y dos reproducciones ejecutadas (§ 9, anexo).

**Reproducción central (ejecutada, `d_sin_repro.js`)**: el proceso de la captura del dueño —PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA, $6.365.863.685— pasado por `lib/proyeccion.transformar` → `lib/rup.evaluarRup` → `lib/puertas.evaluarPuertas` → `lib/socio_por_proceso.socioPorProceso` → `lib/guia_proceso.guiaDe` → `lib/habiles`, con perfil `helder`. Supuestos declarados porque la captura no los enseña: clase 72141000, plazo 8 meses, publicado el 1-sep-2026, cierre el 14-oct-2026. Resultado literal:

- `evaluarRup`: `k_cop 4.470.921.189 · crpc_cop 6.365.863.685 · k_depende_del_anticipo true · tope_cop 7.003.620.000`.
- P2 (`lib/puertas.js:202-205`): «SECOP II no publica el anticipo de este proceso. Sin anticipo la carga (CRPC $6.365.863.685) supera su capacidad residual (K $4.470.921.189): el proceso solo cabe si el pliego prevé un anticipo del 30 % o más. Confírmelo en el pliego antes de decidir.» — **es exactamente la línea de la captura**, y hoy vive PLEGADA bajo «Más detalles» mientras arriba la tarjeta dice «Cumple los requisitos, con detalles por revisar» (`public/app.js:1741`).
- P3 (`lib/puertas.js:263-266`): financiación 1.273.172.737 · patrimonio 1.107.252.964 · `sin_dato` (anticipo no publicado) → **faltarían $165.919.773** si no hay anticipo.
- `socioPorProceso(helder; genesis, prodiac)` → **`{tipo: "solo"}`, «Solo. Esta le alcanza sin socio: se queda con todo.»** en el MISMO proceso en que P2 dice «solo cabe con anticipo del 30 % o más». Causa: `carenciasDe` solo cuenta puertas con `pasa === false` (A3 § (b)); la K que «pasa con advertencia» no es carencia. Es la observación 6.1 de A5, ahora reproducida con el ejemplo del dueño (§ 8).
- `guiaDe`: 8 pasos fechados (hoy: «Lea primero las causales de rechazo y el cronograma»; 6-oct: garantía; 7-oct: observaciones; 13-oct: presentar y pantallazo; 14-oct: cierre), `dinero.contribucion_obra_5pct_cop 318.293.184`, `garantia_seriedad_asegurada_cop 636.586.369`, `obra.plazo.cruza_diciembre true`; **473 µs por fila** (200 llamadas: 94,6 ms); la guía entera pesa 19.258 B, los pasos 2.451 B, el «siguiente paso» 97 B.
- `habilesEntre`: publicación→cierre **30 días de oficina**; hoy→cierre **22**; `plazoMesesDe` = 8; $6.365.863.685 / 8 = **$795.732.961 al mes**; `aplicaContribucion("Obra") === true`.
- `modalidadEnLlano("Licitación pública")` → «El proceso grande: requisitos para participar y puntaje por calidad, precio y apoyo a la industria nacional. El MÉTODO con el que puntúan el precio se sortea…».

## 1. El lente: las cuatro preguntas de quien empieza y cinco reglas de redacción

Las necesidades P1-P16 de A5 § 3 se reducen, en la tarjeta, a cuatro preguntas en este orden: **(1) ¿Puedo presentarme?** (P1, P3) → **(2) ¿Con quién, si solo no?** (P11) → **(3) ¿Cuánto tiempo tengo y qué hago hoy?** (P7, P14, P9) → **(4) ¿Contra quién, cuánto bajo y me queda algo?** (P5, P6, P16). Todo lo demás es evidencia y va plegado. Reglas que salen del lente y de la memoria (`docs/MEMORIA.md § «FILOSOFÍA DEL PRODUCTO (ago 2026) · la regla que manda sobre las demás»`):

1. **Cada dato dice qué hacer**: una fecha lleva su acción («presente el 13 de oct»), una carencia lleva su salida («anticipo, crédito o consorcio»), un «sin dato» lleva dónde buscarlo («mírela en el pliego»).
2. **«Poder presentarse» y «ganar» se rotulan aparte** («Para poder presentarse» / «Para ganar»): la confusión habilitación-puntaje es «el error más grave» (A5 W1) y hoy la tarjeta no la nombra.
3. **Una cifra por hecho** (H3 de A1: el mismo promedio salía como «~2» y «1,6»).
4. **Un supuesto no se pinta como número** (H2: «1 de 5» sobre 5 rivales supuestos).
5. **El hecho arriba, el modelo detrás del clic**: frecuencia natural, nunca «probabilidad» ni porcentaje en la tarjeta; el desglose en «Ver cómo se calcula».

Vocabulario: solo el del glosario (`public/glosario.js:56-84`) y el de A5 § 5. Los 70 textos propuestos pasan `tuteoEn`, `VOSEO_RE` y `RE_EMOJI_UI` de `lib/lenguaje_pantalla.js`, la lista `JERGA_JS` de `tests/e2e.js:29449-29470` y, además, la prohibición de «hábiles/mediana/percentil» (`tests/e2e.js:13082`; el glosario fija «días de oficina») y de «probabilidad» (ejecutado: `d_sin_textos.js` → `textos: 70 · fallos: 0`).

## 2. Dato por dato: los 34 de la tarjeta de hoy (tabla de A1 § 1) y qué se hace con cada uno

Decisión: **se_conserva / cambia / se_pliega / se_retira**. Las dos preguntas obligatorias («¿es el mejor dato con los datos que hay?» · «¿qué otro dato da?») van en la cuarta columna; la ficha con el detalle, en la quinta.

| # A1 | Lo que se enseña hoy | Decisión | ¿Es el mejor dato? ¿Qué otro dato da? | Ficha |
|---|---|---|---|---|
| 1 | Título | se_conserva (+ referencia) | Falta la **referencia del proceso** (`referencia_del_proceso` viaja y no se pinta, A4 Tabla A #8): es como lo llama la entidad y el pliego. | SIN-01 |
| 2 | Entidad · Departamento | se_conserva | Es publicado y es la llave del modal. | — |
| 3 | Cuantía / «Cuantía no publicada» | cambia (sin dato) | El sin dato no dice qué hacer ni que las otras celdas dependen de él; y H5: sin cuantía `ve = 0` ordena como cero. | SIN-02 |
| 4 | Chip «No viable — K · Caja» | cambia | «K» es sigla interna; el glosario ya tiene «Capacidad de facturar». | SIN-03 |
| 5 | Línea de requisitos | cambia | «Cumple, con detalles por revisar» esconde el detalle que decide (reproducido con la captura: el 30 % de anticipo). Da además: rótulo «Para poder presentarse» y el porcentaje de anticipo que haría caber. | SIN-04 |
| 6 | Bloque socio (solo «con socio») | cambia → nuevo | Calla el nombre y el caso «solo»; A3 (c) da los seis textos. Y el caso «K depende del anticipo» dice «Solo» donde P2 dice «solo con anticipo o socio». | SIN-05, SIN-06 |
| 7 | Celda «~9 empresas compiten» | cambia | Dos redondeos del mismo hecho (H3); sin base pinta «supuesto: 5 rivales» como rótulo. | SIN-07 |
| 8 | Celda «1 de N se gana» | cambia (se retira la cifra sin base) | Con fuente «conservador» es un supuesto vestido de número (H2). | SIN-08 |
| 9 | Celda 3 con APU («−$3M · podría perder…») | se_conserva | Es el costo del usuario contra el precio; ya dice el peor caso. | — |
| 9b | Celda 3 «$56M es lo que suele pagar esta entidad» | cambia | Rotula como hecho un derivado (H7): cuantía × (1 − mediana). El hecho es la baja y su n. | SIN-09 |
| 9c | Celda 3 «Calcular · falta su costo» | se_conserva | Dice qué hacer. | — |
| 9d | Celda 3 «— · sin cifra» | cambia | El motivo ya viaja (sin cuantía / sin clave) y no se dice. | SIN-10 |
| 10 | «Ver cómo se calcula» | se_conserva (+ una línea en el modal) | El modal debe decir también lo que NO se mide (los puntos del pliego). | SIN-45 |
| 11 | Chip «Activo · abierto» (PAA) | se_conserva | — | SIN-40 |
| 12 | Chip de cierre | cambia | Da además el día en que hay que presentar (regla de la guía) y, sin fecha, un chip explícito (H6). | SIN-11, SIN-12 |
| 13 | Chip «Avisar que le interesa» | se_conserva | Ya dice acción y plazo; la ventana legal no se pinta como plazo. | SIN-16 |
| 14 | Banda «Poca competencia · 1,6 en 12 ›» | cambia (texto) | No dice qué abre; el nivel + el promedio se conservan. | SIN-17, SIN-18 |
| 15 | Chip de zona | se_conserva | Ya en llano y con acción («verifique la seguridad»). | SIN-24 |
| 16 | Chip «Cierre prorrogado» | cambia | `_cierre_inicial` viaja y no se pinta: da «desde cuándo». | SIN-25 |
| 17 | Aviso ámbar señal #11 | se_conserva | Da las dos lecturas y qué hacer. | SIN-26 |
| 18-19 | Avisos de cierre y de manifestación | se_conserva | — | SIN-27 |
| 20 | Línea de margen (solo `ordenar_por=margen`) | se_conserva | Ya dice «no es lo que deja». | SIN-40 |
| 21 | Cuadro de adendas | se_conserva | «La entidad cambió las reglas» es llano. | SIN-28 |
| 22 | Plegado: chips de puertas + renglones | cambia (renglones) | Los renglones dicen «CRPC», «K», «capacidad residual», «clase UNSPSC»: textos del servidor, no censados por la suite. Mismas cifras, palabras del glosario. Dan además la caja que falta. | SIN-29, SIN-30 |
| 23 | Chip «Anticipo 30%» / «no declarado» | cambia | H1: «no declarado» también cuando el pliego dijo «sin anticipo». | SIN-31 |
| 24 | Chip «Suelen bajar 7 % (unos $4M)» | se_conserva (plegado) | Es el hecho con su n; la instrucción de precio va en la celda 3. | SIN-39 |
| 25 | Chip ubicación | se_conserva (plegado) | — | SIN-39 |
| 26 | Chips de encaje del RUP | se_conserva (plegado) | — | SIN-39 |
| 27 | Chip «Capacidad calculada con ingreso estimado» | se_conserva | Honesto: declara el supuesto. | SIN-39 |
| 28 | Chip de modalidad | cambia (+ explicación) | El nombre solo no le dice nada a quien empieza; `modalidadEnLlano` ya existe. | SIN-38 |
| 29 | Chip «Precios unitarios» / «Precio global» | cambia | La explicación vive en el `title`, que en teléfono no existe. | SIN-37 |
| 30 | Pie «Cómo se adjudica en TOLIMA» | se_conserva (plegado) | Contexto, no instrucción (B9b). | SIN-39 |
| 31 | Estado «Publicado» | se_conserva | Nombre propio de SECOP II. | SIN-40 |
| 32 | Botón «Guardar» | cambia (rótulo) | No dice que detrás está la ficha de 8 casillas, los 10 requisitos y el paso a paso. | SIN-41 |
| 33 | Botón «Calcular mi precio» | cambia | H4: `plazo_meses` no viaja; Precios abre sin plazo. | SIN-42 |
| 34 | Enlace SECOP II | se_conserva | — | SIN-43 |

Además, **lo que viaja y no se ve** (A1 § 2) y sí sirve a quien empieza: `referencia_del_proceso` (SIN-01), `duracion`/`unidad_de_duracion` (SIN-32, SIN-33), `_cierre_inicial` (SIN-25), `anticipo_declarado` (SIN-31), `fecha_de_publicacion_del` (SIN-13), `p3_caja.financiacion_requerida − patrimonio` (SIN-30), `p_ganar_detalle.fuente` (SIN-08). Y **lo que viaja, no se ve y no se propone** porque no es un dato para la tarjeta: `ganancia` entera (3.083 B, el 40 % de la fila) la reutiliza el modal «Lo que deja» sin pedir nada (A1 § 0); si el peso aprieta, se pide al pulsar (`op` existente) y la fila lleva solo `valor`, `motivo`, `precio_esperado`, `baja_procesos` — es una decisión de bytes, no de datos, y se anota en SIN-09.

## 3. Las fichas (CORTO · CONCISO · EN QUÉ BENEFICIA · EN QUÉ AFECTA)

Cada ficha lleva además: **fuente** (campo o módulo), **certeza** (publicado / medido / calculado / estimado / sin fuente), **costo** (sync · petición · clic · externo), **para quién** (experimentado / sin experiencia / ambos), **necesidad de A5** y **tanda** (sesión sugerida; § 6). «Pantalla» es el nombre del dato como lo vería usted. Las cifras de ejemplo son las del proceso de la captura, reproducidas (§ 0), salvo donde se dice «ejemplo inventado».

### 3.A · Arriba: ¿puedo presentarme y con quién?

**SIN-01 · Referencia del proceso** · nuevo (dentro del título) · tanda 1 · ambos
- CORTO: «PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA · Ref. LP-008-2026».
- CONCISO: `referencia_del_proceso` de la proyección (`lib/proyeccion.js:37-46`); viaja en cada fila y ningún fichero de `public/` lo pinta (A4 Tabla A #8). Se pinta en gris junto al nombre de la entidad; sin referencia no se pinta nada.
- BENEFICIA: es el número con el que la entidad, el pliego y el correo llaman al proceso; quien empieza lo busca así en SECOP II y así rotula su carpeta (P4, P8).
- AFECTA: nada; +20 B de texto que ya viajan.
- Fuente `referencia_del_proceso` · publicado · sync · necesidad P4/P8.

**SIN-02 · Cuantía no publicada** · cambia · tanda 1 · sin experiencia
- CORTO: «Cuantía no publicada: mírela en el pliego; sin ella no sabemos si le cabe.»
- CONCISO: `cuantia_cop` viaja como `0` desde `enriquecer` (`lib/negocio.js:207`) y la tarjeta lo trata como ausencia (`app.js:2153-2158`); P2 y P3 salen `sin_dato` y la celda 3 «—». Dos cambios: el texto dice la consecuencia y qué hacer; y en `listar` el orden por atractividad deja de tratar `ve = 0` como cero (`listar.js:153`, H5): las filas sin cuantía van en su propia cubeta al final, rotuladas, no mezcladas con las que valen poco.
- BENEFICIA: quien empieza entiende por qué media tarjeta está en «—» y qué hacer; y una obra grande sin presupuesto publicado no se esconde al final «como si valiera cero».
- AFECTA: cambia el orden de esas filas (hoy caen al final; seguirán al final pero como grupo declarado); H5 hermano: `puntaje_ponderado` null sin cuantía (`negocio.js:216`), solo afecta `?ordenar_por=puntaje`.
- Fuente `cuantia_cop`, `ve` · publicado (la ausencia) · sync + petición · necesidad P1.

**SIN-03 · No puede presentarse, en palabras** · cambia · tanda 1 · sin experiencia
- CORTO: «No puede presentarse: supera lo que puede facturar · le falta caja para financiarla».
- CONCISO: `puertas.no_viable_por` (`RUP` / `K` / `Caja`, `lib/puertas.js:329-331`) traducido en el cliente con el glosario que ya existe (`Glosario.corto("rup")` = «Registro de proponente», `Glosario.corto("capacidad_contratacion")` = «Capacidad de facturar», `public/glosario.js:57-59`). Sigue atenuado (opacidad 50 %), no escondido.
- BENEFICIA: «K» no significa nada para quien empieza; «No viable» sin verbo no dice qué falta.
- AFECTA: nada en el servidor; la suite fija el chip «No viable» en alguna aserción de `iteracion()` (A6 § 1.11: revisar antes de tocar).
- Fuente `puertas.no_viable_por` · calculado · petición · necesidad P1.

**SIN-04 · Para poder presentarse (la línea, con el hecho que decide)** · cambia · tanda 1 · sin experiencia
- CORTO: «● Para poder presentarse: puede, solo si el pliego trae anticipo del 30 % o más. Confírmelo en el pliego.» · «● Para poder presentarse: cumple los requisitos.» · «● Para poder presentarse: cumple, pero financiarla está justo: considere anticipo, crédito o consorcio.»
- CONCISO: `lineaRequisitos` (`app.js:1718-1743`) sobre `puertas`. Hoy, cuando P2 «pasa con advertencia» porque la capacidad DEPENDE del anticipo (`rup.k_depende_del_anticipo`, `lib/rup.js:110`) o P3 es `sin_dato`, la línea dice «Cumple los requisitos, con detalles por revisar» y el detalle —que decide— queda plegado. Propuesta: (a) rótulo fijo «Para poder presentarse:»; (b) el servidor publica en `p2_k` el campo `anticipo_que_cabe_pct` (hoy es una variable local de `p2K`, `lib/puertas.js:203`: la MISMA cuenta, `ceil(100·(1 − K/CRPC))`, reproducida: 30) y la línea lo nombra; (c) con P3 `sin_dato` y financiación > patrimonio, la línea dice la caja (SIN-30). La decisión la sigue tomando `rup.js` con la cifra exacta (`crpc_minimo <= k_cop`); el 30 % es el techo redondeado HACIA ARRIBA de 29,77 %, es decir, más exigente, nunca más laxo.
- BENEFICIA: es la pregunta número uno de quien empieza (P1) y hoy la respuesta que decide está a un clic y bajo jerga. Separar «poder presentarse» de «ganar» (SIN-45) corrige el error más frecuente (A5 W1).
- AFECTA: la línea crece a dos renglones en ese caso (uno de cada N procesos: A3 anota que P2 falla en el 4,3 % y 32 filas cabrían con anticipo); una cifra redondeada para mostrar no decide (declarado arriba).
- Fuente `puertas.p2_k`, `p3_caja`, `rup.k_depende_del_anticipo` · calculado · petición · necesidad P1/P3.

**SIN-05 · Con quién conviene (Génesis · PRODIAC · solo · ninguna)** · nuevo · tanda 1 · ambos
- CORTO, uno por estado (A3 § (c), medidos contra la cerca): «Solo: le alcanza sin socio.» (gris) · «Conviene con Génesis: tiene la actividad que a usted le falta · reparto sugerido 60/40» (verde) · «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» (verde) · «Conviene con PRODIAC, pero no cabe si la convocatoria es solo para Mipyme.» (ámbar) · «Con Génesis se acerca, pero puede no bastar: falta respaldo para financiar la obra.» (ámbar) · «Ninguna de las dos alcanza lo que falta.» (rojo; y si la fila no es obra para nadie no se pinta: ya sale descartada por objeto).
- CONCISO: `socioPorProceso` YA corre por fila servida (`listar.js:935-938`) y `resumenSocio` (`listar.js:109-113`) recorta a `{tipo, cierra_todo}`. Pasa a `{tipo, con, cierra_todo, aviso, linea}` con `linea` ≤ 90 caracteres REDACTADA POR EL SERVIDOR en el mismo módulo que redacta `frase` (una sola redacción con el expediente); `con` sale de `recomendacion.socio`, nunca de `alcanzable_con_socio` (que discrepa: Génesis vs PRODIAC en la misma fila, A3 reproducido; se retira de la fila o se iguala). Hace falta `nombreCorto` en `lib/perfiles.js` (no existe). Helder es la base; candidatas Génesis y PRODIAC (`lib/perfiles.js:356-357`). El congelado al guardar (`congelarSocio`, `seguimiento.js:168-181`) y `htmlConQuien` no se tocan: la tarjeta dice el consejo de HOY y el expediente el del día que guardó, con su fecha.
- BENEFICIA: P11/E9 sin guardar: «¿me junto con alguien y con quién?» en cada tarjeta, como pidió el dueño.
- AFECTA: 96-167 B por fila (media 143 B; ≈ 30 KB por 210 filas, ≈ 1,7 % del cuerpo) frente a los 34-43 B de hoy; cuatro aserciones de `tests/e2e.js:4706-4737` caen A PROPÓSITO y se reescriben; la sección de memoria del 11-sep («El veredicto de socio se lee AL GUARDAR…») queda superada en parte y se marca. Lo que el recomendador NO considera se declara en el expediente, no en la línea: puntaje, limitación Mipyme real, experiencia por contratos (A3 § (b)).
- Fuente `socio` (resumen de `socioPorProceso`) · calculado · petición · necesidad P11/E9.

**SIN-06 · Con quién, cuando la capacidad depende del anticipo** · nuevo · tanda 2 · ambos
- CORTO: «Solo, si el pliego trae anticipo del 30 % o más; si no lo hay, con PRODIAC: le suma capacidad.» (ámbar).
- CONCISO: reproducido con la captura: `socioPorProceso` → «Solo» mientras P2 → «solo cabe con anticipo del 30 % o más». `carenciasDe` (`socio_por_proceso.js:79-86`) solo cuenta `pasa === false`. Propuesta: una carencia CONDICIONAL `capacidad_si_no_hay_anticipo` cuando `p2_k.depende_del_anticipo`, evaluada con el plural contra `crpc` (sin anticipo, no `crpc_minimo`), y un estado `solo_si_anticipo` con su línea. Misma regla de `cargaK` (`lib/rup.js:77-88`), llamada, no reescrita.
- BENEFICIA: la tarjeta deja de tener dos respuestas contrarias a la misma pregunta (P1 y P11 son la misma decisión para quien empieza).
- AFECTA: más filas con nombre de socio (167 B); el socio se propone «por si acaso» y la línea lo dice; toca `lib/socio_por_proceso.js` (memoria obligatoria: § «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)»).
- Fuente `p2_k.depende_del_anticipo` + `socioPorProceso` · calculado · petición · necesidad P1/P11.

### 3.B · Tiempo: ¿cuánto tengo y qué hago hoy?

**SIN-11 · Cierre con el día en que hay que presentar; sin fecha, se dice** · cambia · tanda 1 · sin experiencia
- CORTO: «Cierra en 31 días · 14 de oct de 2026 · presente el 13 de oct» · «Sin fecha de cierre publicada: mírela en el pliego».
- CONCISO: `fecha_cierre` (`enriquecer`, `lib/negocio.js:181`) y `diasParaCierre` en cliente (`app.js:1425-1428`). «Presente el» es el día hábil anterior al cierre con suelo hoy: la regla del paso «Cargue y PRESENTE la oferta completa» de la guía (`lib/guia_proceso.js:449-452`), extraída a una función que la guía y `listar` LLAMAN, y publicada como `presentar_el` (10 B). Sin fecha legible, `chipCierre` devuelve `""` (H6, `app.js:1433`): pasa a un chip gris explícito.
- BENEFICIA: «el cierre a las 3:00 p.m. es la hora en que más ofertas mueren» (A5 P7): cada fecha lleva su acción; la ausencia deja de ser muda.
- AFECTA: una fecha más en un chip ya largo (en 390 px se parte en dos líneas: probar en navegador); los avisos rojos a ≤ 2 días siguen iguales.
- Fuente `fecha_cierre`, `presentar_el` · publicado + calculado · petición · necesidad P7.

**SIN-12 · Días de oficina que le quedan para armar la oferta** · nuevo · tanda 1 · sin experiencia
- CORTO: «Le quedan 22 días de oficina para armar la oferta».
- CONCISO: `habilesEntre(hoyColombia(ahora), fecha_cierre)` (`lib/habiles.js:93-99`, festivos de Colombia incluidos; reproducido: 22). Se publica como `dias_oficina_hasta_cierre` (4 B). «Días de oficina» es el término del glosario (`dias_habiles.visible`); la suite ya prohíbe «hábiles» en un texto de pantalla (`tests/e2e.js:13082`).
- BENEFICIA: P14: quien empieza no sabe si le alcanza el tiempo; el manual estima 5 a 8 días de oficina para armar una oferta (A5 W19: ESTIMADO, sin página leída, no se pinta como cifra).
- AFECTA: sin fecha de cierre no se pinta; un cierre a las 15:00 cuenta el día del cierre como día completo (la función cuenta días, no horas: se dice «hasta el cierre»).
- Fuente `dias_oficina_hasta_cierre` · calculado sobre publicado · petición · necesidad P14.

**SIN-13 · Días de oficina que dio el proceso** · nuevo (plegado) · tanda 1 · ambos
- CORTO: «El proceso dio 30 días de oficina desde su publicación».
- CONCISO: `habilesEntre(fecha_de_publicacion_del, fecha_cierre)` (C1 de A4, reproducido: 30). Va plegado hasta que exista SIN-14 (sin comparación, el número solo no dice si es poco).
- BENEFICIA: mitad de la señal #5 del manual («plazos mínimos para todo») que A5 § 4.2 demuestra que sale del dataset, no del pliego.
- AFECTA: si una adenda movió el cierre, el dato mide la ventana final, no la inicial (falta `fecha_de_ultima_publicaci`, SIN-48; con `_cierre_inicial` se puede decir «antes cerraba el…», SIN-25).
- Fuente `fecha_de_publicacion_del`, `fecha_cierre` · calculado sobre publicado · petición · necesidad E5/P16.

**SIN-14 · Lo que suele dar esta entidad para ofertar** · nuevo · tanda 4 · ambos
- CORTO: «Esta entidad suele dar 21 días de oficina para ofertar (en 12 procesos)» (ejemplo inventado).
- CONCISO: en `construirIndice` (`lib/indice_competencia.js`, cadena del histórico), por entidad, la mediana ÚNICA de `lib/estadistica` (memoria § «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)») de `habilesEntre(publicación, cierre)` con n ≥ `MIN_PROCESOS = 5` (`indice_competencia.js:86`); publicada en `indice:competencia` y leída por `competenciaDe`. En la tarjeta, junto a SIN-13: «este le da 9; la entidad suele dar 21».
- BENEFICIA: convierte la señal #5 en un hecho comparable: un plazo mucho más corto que el habitual de la entidad es una de las 12 señales de pliego hecho a la medida (A5 E5/P16), sin leer el pliego.
- AFECTA: frescura del índice de competencia (hasta un mes o reconstrucción manual: A2 § 4.1); solo procesos que la aplicación sigue (cota); nunca bloquea, ámbar (falso caro = negativo).
- Fuente índice de competencia (nuevo campo) · medido · sync (histórico) · necesidad P14/E5.

**SIN-15 · Siguiente paso** · nuevo · tanda 3 · sin experiencia
- CORTO: «Siguiente paso · hoy: lea primero las causales de rechazo y el cronograma del pliego · Guárdelo para el paso a paso completo ›».
- CONCISO: el primer paso con fecha ≥ hoy del paso a paso de la guía (`lib/guia_proceso.js:434-481`: causales hoy, garantía −5 días de oficina, observaciones −7 días, presentar el día anterior, pantallazo, cierre, traslado, adjudicación). El bloque se extrae a `pasosDe({cierre, manif, modalidad, hoy})` que `guiaDe` y `listar` LLAMAN; por fila viajan `{cuando, titulo}` (97 B). `guiaDe` entera cuesta 473 µs por fila (reproducido); la función extraída, una fracción. «Guárdelo…» es el botón de guardar con otro rótulo (SIN-41), no un botón nuevo.
- BENEFICIA: P7 («¿cuándo hago cada cosa?») sin tener que guardar; el resto del paso a paso sigue detrás de Guardar, donde ya está.
- AFECTA: ≈ 2 KB por página; el primer día el paso es genérico («lea las causales»), por eso se pinta el primero FUTURO cuando hoy ya pasó; con manifestación de interés viva, el paso es «Avise que le interesa (hoy mismo)», que ya dice el chip: no se duplica (se omite el paso si el chip lo está diciendo).
- Fuente `pasosDe` (guía) · calculado sobre publicado · petición · necesidad P7.

**SIN-16 · Avisar que le interesa** · se_conserva · tanda 1 · ambos
- CORTO: los cinco estados de hoy («Avisar que le interesa · vence HOY (…) · puede haber cerrado ya», «… · fecha por confirmar en SECOP II», «… · plazo vencido», etc.).
- CONCISO: `manifestacionDeFila` (`lib/manifestacion.js:298-327`) vía el clasificador; la fecha del pliego, si está, gana a la ventana calculada; el techo legal viaja y NO se pinta como plazo.
- BENEFICIA: E17 («a veces solo abren 4 horas»): ya dice la acción y la urgencia.
- AFECTA: nada.
- Fuente `manifestacion` · calculado / publicado si confirmada · petición · necesidad E17/P7.

### 3.C · Para ganar: contra quién, cuánto bajar, qué queda

**SIN-07 · Cuántas empresas suelen competir** · cambia · tanda 1 · ambos
- CORTO: «1,4 empresas suelen competir · en 55 procesos» · «— · sin histórico: no sabemos cuántas compiten».
- CONCISO: `competencia_entidad.promedio_oferentes` y `total_procesos` (`competenciaDe`, `lib/indice_competencia.js:1213-1231`). La celda redondea a entero (`Math.round`, `app.js:2074`) y la banda pinta un decimal: el mismo hecho con dos caras (H3). Se pinta con UN decimal en los dos sitios. Sin base, el rótulo «supuesto: 5 rivales» se retira de la celda: el supuesto sigue en «Ver cómo se calcula».
- BENEFICIA: una cifra por hecho; quien empieza no tiene que reconciliar «~2» con «1,6».
- AFECTA: nada; el título de la celda ya lleva la frase completa.
- Fuente `competencia_entidad` · medido · petición · necesidad E6/P16.

**SIN-08 · De cada cuántos se gana uno** · cambia (se retira la cifra sin base) · tanda 1 · sin experiencia
- CORTO: «1 de 3 · se gana, aproximadamente» · «— · sin histórico para estimarlo» · «1 de 4 · con el promedio de su departamento».
- CONCISO: `frecuenciaNatural(p_ganar)` (`app.js:1799-1805`; suelo 2). `estimarPDetalle` siempre devuelve una `p` (con 5 rivales supuestos cuando no hay histórico: `PROMEDIO_CONSERVADOR`, `lib/probabilidad.js:124`) y la celda siempre pinta «1 de N» (H2). Propuesta: con `p_ganar_detalle.fuente === "conservador"` (`FUENTE_P`, `app.js:1750-1754`) la celda pinta «—» y su motivo; con `"departamento"` lo dice en el rótulo. El orden de la lista sigue usando `p` (no cambia).
- BENEFICIA: quien empieza no toma un supuesto por una medida; es la regla «sin dato ≠ supuesto disfrazado».
- AFECTA: menos tarjetas con número en la segunda celda (todas las entidades sin 5 procesos en el índice); nada de servidor.
- Fuente `p_ganar`, `p_ganar_detalle.fuente` · estimado · petición · necesidad E6.

**SIN-09 · Lo que deja, con el precio de mercado, rotulado como lo que es** · cambia · tanda 3 · ambos
- CORTO: «≈ $56M · si baja lo que bajaron los que ganaron aquí (7 %, 8 contratos)» (cifras del fixture de A1).
- CONCISO: `ganancia.precio_esperado = cuantía × (1 − mediana)` (`lib/ganancia.js:388-391`), hoy rotulado «es lo que suele pagar esta entidad · medido en 8 contratos» (H7). Lo medido es la baja (`baja_mercado.baja_mediana`, cubeta del histograma) y su n; la cifra en pesos es derivada y redondeada por `fmtCorto`: se rotula con «≈» y «si baja…». Es la instrucción de precio de la FILOSOFÍA («para tener opción hay que ofertar cerca de X % por debajo»), una sola por tarjeta (el chip «Suelen bajar» queda plegado, B9b). Bytes: `ganancia` pesa 3.083 B por fila y la usa el modal local: si el peso aprieta, el modal la pide al pulsar y la fila lleva solo `{valor, motivo, precio_esperado, baja_procesos, base}`.
- BENEFICIA: P5 («¿cuánto bajo?») con la cifra declarada como referencia, no como hecho; nunca decide el precio (Precios decide, con el costo del usuario).
- AFECTA: nada en el cálculo; hay que revisar las aserciones de la tercera celda en `iteracion()` (memoria § «La tercera cifra de la tarjeta es LA PLATA QUE QUEDA (`lib/ganancia`, ago 2026)» y § ««−$32 M de pérdida»: la tercera cifra de la tarjeta, auditada y corregida (20-ago-2026)»).
- Fuente `ganancia.precio_esperado`, `baja_mercado` · calculado (sobre medido) · petición · necesidad P5.

**SIN-10 · La celda «—» dice por qué** · cambia · tanda 1 · sin experiencia
- CORTO: «— · sin cuantía publicada» · «— · entre con su clave para ver cifras».
- CONCISO: `ganancia` viaja `null` sin credencial (`lib/publico.js:158`) o con `motivo: "sin_presupuesto_oficial"` sin cuantía (A1 § 5 H8 y 9d); `finanzas_visibles` viaja en la cabecera. La celda pinta el motivo que ya llega.
- BENEFICIA: un «—» que dice por qué es una instrucción («mírela en el pliego» / «entre con su clave»); uno mudo es un misterio.
- AFECTA: nada.
- Fuente `ganancia.motivo`, `finanzas_visibles` · — (ausencia declarada) · petición · necesidad P6.

**SIN-17 · La banda de competencia dice qué abre** · cambia · tanda 1 · sin experiencia
- CORTO: «● Poca competencia · 1,4 en 55 · quién gana aquí ›».
- CONCISO: `bandaCompetencia` (`app.js:1606-1620`); el texto añade el destino (el modal «Competencia histórica» con «Quién gana aquí»). Sin base sigue «Sin datos históricos de esta entidad ›».
- BENEFICIA: quien empieza no sabe que ahí vive «quién gana aquí» (A2: el camino está escondido).
- AFECTA: nada.
- Fuente `competencia_entidad` · medido · petición · necesidad E5.

**SIN-18 · Quien más gana aquí (un clic al perfil)** · nuevo · tanda 2 · ambos
- CORTO: «Quien más gana aquí: CONSTRUCTORA X · 6 de 15 ›» (ejemplo inventado).
- CONCISO: `lider {nombre, clave, ganados, base}` por entidad, calculado en el MISMO barrido de `construirIndice` con `esAdjudicado` (`lib/indice_competencia.js:186`) y `claveAdjudicatario` (`lib/equivalencias.js:72`) —las funciones que ya usa el top de `detalleEntidad`—, solo con `base ≥ 5` procesos con ganador (el umbral de la concentración, `lib/competencia_detalle.js:440-447`). Viaja en la fila solo con token válido (token inválido = 401, como manda la regla). Pulsarlo abre `cargarAdjudicatario(clave, nombre)` directamente (SIN-19/20). Sin líder no hay botón: nada que pulsar en vano.
- BENEFICIA: E5/P16: la señal #11 («¿está hecho para alguien?») con nombre y frecuencia natural en la tarjeta, y el perfil a UN clic en vez de tres (A2 § 1.3).
- AFECTA: ≈ 120 B por fila con token; decisión nueva que hay que escribir en la memoria: `lib/indice_competencia.js:1167-1168` declara que `/api/oportunidades` «nunca» expone adjudicatarios —publicar el líder solo con credencial conserva el espíritu, pero es una decisión, no un descuido (A2 § 6 E1); frescura del índice (hasta un mes).
- Fuente índice de competencia (`lider`) · medido · sync (histórico) + clic · necesidad E5/P16.

**SIN-19 · Dónde más gana este competidor, casi al instante** · cambia · tanda 2 · ambos
- CORTO: cabecera «155 contratos en 143 entidades · $211.899 M en 147 con valor publicado · último: 25 de dic de 2025», tabla Entidad · Ganados · Valor · Último, y «Baja media con la que gana: 6 % (147 contratos)».
- CONCISO: la `op=competidor` existente (`api/inteligencia.js:17-24` → `lib/handlers/inteligencia/detalle.js:174` → `detalleAdjudicatario`, `lib/competencia_detalle.js:547-696`). Hoy cada clic en frío barre TODOS los chunks del histórico (8-98 comandos, 2-4 MB; 0,8-8 s con el supuesto REST de 30-80 ms; A2 § 3). Propuesta de A2 § 4.2, adoptada: hash `indice:adjudicatario` (campo = `nit:…`/`n:…`) acumulado en el mismo barrido de `construirIndice` con las líneas `competencia_detalle.js:580-607` extraídas a una función que el barrido de hoy y el constructor COMPARTAN (el prototipo cuadra al 100 % con `detalleAdjudicatario`: 155/155, 143/143, 147/147); servido en 2-3 comandos (`GET meta` + `HGET`) con `origen: "indice"` y «con datos hasta <fecha>»; sin registro cae al barrido de hoy con `origen: "barrido"` («al día de hoy»); caché `v8`. Tamaño medido: 10,6-13,1 k claves, 6,3-9,3 MB, 54-66 `HSET`; +0,3-0,7 s de CPU en la construcción.
- BENEFICIA: lo que el dueño pidió: «cuánto han adjudicado en total, en qué otras entidades y cuánto», de 0,8-8 s a ≈ 60-250 ms. Para quien empieza: E5/P16, saber contra quién compite y si el ganador habitual también gana en otras entidades.
- AFECTA: frescura hasta un mes salvo reconstrucción (`?reconstruir_indice=true`), declarada en pantalla; 6-9 MB más en Redis; el «no existe» también se sirve del hash (sin barrido).
- Fuente `indice:adjudicatario` (nuevo) sobre el corpus histórico · medido · sync (histórico) + clic · necesidad E5.

**SIN-20 · La espera del perfil, animada y honesta** · nuevo · tanda 2 · ambos
- CORTO: «Buscando dónde más ha ganado esta empresa…» sobre un esqueleto con la forma del perfil (una línea de cabecera y cinco filas Entidad · Ganados · Valor).
- CONCISO: `abrirModal` ya abre AL INSTANTE con `.spin` + frase (`app.js:2529-2545`): «ninguna pulsación sin respuesta visible» ya se cumple; lo que falta es que la espera tenga la FORMA del dato (memoria de diseño § 7.3.3 «Esqueleto»: mismas dimensiones que el dato final; A6 § 1.10). Se reutiliza lo que existe: el keyframe `brillo` (`public/index.html:789-794`) o la clase `.exp-esqueleto` (`:1288-1290`, con su regla reducida en `:1380`), duraciones `--dur-2`/`--dur-4`, `aria-busy="true"` en `#modal-cuerpo` mientras carga; NO se añade `@keyframes` (V4-19 quiere borrar cuatro) ni se toca `--dur-5`; bajo `prefers-reduced-motion: reduce` el esqueleto es gris plano (regla de `:836-855`, que hoy cubre `#app .animate-pulse .bg-gray-100`: hay que extenderla a la clase usada en el modal, y la cerradura `tests/e2e.js:27970-28000` comprueba efectos, no nombres). Al llegar el dato, el esqueleto desaparece de golpe (§ 7.3.5). El texto pasa `tuteoEn`/`VOSEO_RE`/emoji (ejecutado); no nombra la marca a mano.
- BENEFICIA: el usuario ve qué se está armando; con SIN-19 la espera dura ≈ 0,1-0,3 s y el esqueleto apenas parpadea; sin índice (barrido) sigue siendo honesta.
- AFECTA: un `<style>` mínimo; V4-19 cambiará el mecanismo de entrada/salida de los modales (diseñar la espera sabiendo que llegará `@starting-style`); nada de servidor.
- Fuente — · — · clic · necesidad (petición del dueño).

**SIN-21 · Lo que el perfil NO cuenta, en la cabecera** · cambia · tanda 2 · sin experiencia
- CORTO: «Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde enero de 2024. Fuera de eso, no aparece aquí.» · «SECOP no publica el NIT de esta empresa: se identifica por el nombre tal como lo escribe la entidad.» · «Con datos hasta el 31 de ago de 2026».
- CONCISO: textos con lo que la respuesta ya trae: `que_es` (hoy en gris al pie, `app.js:3379`), `identificacion === null` (hoy no pinta nada, `app.js:3349-3353`), `procesos_con_valor` (viaja y no se pinta), `construido`/`generado` (A2 § 5).
- BENEFICIA: quien empieza toma «$211 M en 143 entidades» por el total de la empresa; es una cota inferior y hay que decirlo arriba, no al pie.
- AFECTA: tres líneas más en la cabecera del modal.
- Fuente respuesta de `op=competidor` · medido · clic · necesidad E5.

**SIN-22 · Las filas de «Quién gana aquí» dicen que se pueden pulsar** · cambia · tanda 1 · sin experiencia
- CORTO: «Ver dónde más gana ›» en cada fila; el rótulo del pliegue pasa a «Ver los 5 que más ganan y dónde más ganan»; los segmentos de la barra apilada también abren el perfil.
- CONCISO: `app.js:2929-2941` (fila solo con `title` y `cursor-pointer`: en teléfono no existe); `app.js:2967` (rótulo). No se revierte el pliegue (decisión del 6-sep: memoria § «Lote «B9a-entidad-graficos»…»).
- BENEFICIA: el camino de A2 (3 clics, el último sin afordancia) deja de estar escondido.
- AFECTA: la suite exige literalmente `<details><summary>Ver los 5 adjudicatarios que más ganan</summary>` (`tests/e2e.js:13033`): la aserción se reescribe con el rótulo nuevo, a propósito.
- Fuente — · — · clic · necesidad E5.

**SIN-23 · Antesala ligera: el modal de la entidad no espera a Socrata** · cambia · tanda 2 · ambos
- CORTO: (sin texto nuevo arriba) un pliegue al pie: «Ver quiénes se presentan y cómo ejecuta sus contratos ›».
- CONCISO: `detalleEntidad` hace el barrido del histórico MÁS dos consultas vivas a datos.gov.co con tope de 6.000 ms cada una que no se cachean si fallan (`lib/competencia_detalle.js:482-485`, `lib/proponentes.js:45`, `lib/ejecucion.js:37`; A2 § 3.4). Propuesta: `op=entidad&ligero=1` desde la tarjeta (solo histórico), y las dos fuentes vivas en un segundo paso al pulsar el pliegue.
- BENEFICIA: el modal —y con él «Quién gana aquí» y el perfil— abre con el histórico sin esperar hasta 6 s a una fuente externa.
- AFECTA: dos peticiones en vez de una cuando el usuario sí quiere lo vivo; la caché de 1 h por entidad se mantiene.
- Fuente `op=entidad` · medido (histórico) / externo (vivo) · clic · necesidad E5/E7.

**SIN-45 · «Para ganar», y lo que no se mide** · cambia · tanda 1 (rótulo) y 3 (modal) · sin experiencia
- CORTO: rótulo «Para ganar» sobre la franja de tres celdas; en «Ver cómo se calcula»: «Lo que la aplicación no mide: los puntos que da el pliego (calidad, precio, apoyo a la industria nacional). Léalos en el capítulo de evaluación.»
- CONCISO: `bloqueProbabilidad` (`app.js:2022-2110`) y el modal de `op=probabilidad`. Ningún módulo modela el puntaje (A3 § (b), censo). Se declara, no se inventa un peso.
- BENEFICIA: quien empieza confunde «cumplo» con «gano» (A5 W1, E15): dos rótulos lo separan; y sabe qué le falta leer.
- AFECTA: nada.
- Fuente — · — · petición / clic · necesidad P1/E15.

### 3.D · Plegado («Más detalles»): la evidencia y el dinero que hay que TOCAR

**SIN-24 · Zona** · se_conserva · tanda 1 · ambos — CORTO: «Su zona (Ibagué)» / «Cerca · ~120 km de Bogotá» / «… · verifique la seguridad de la zona» / «Distancia sin calcular: no sabemos desde dónde opera». CONCISO: `evaluarZona` (`lib/accesibilidad.js`), estimado por departamento (bandas 250/550 km), redactado en el servidor. BENEFICIA: P12. AFECTA: nada. · estimado · petición · P12.

**SIN-25 · Cierre prorrogado: desde cuándo** · cambia · tanda 1 · ambos
- CORTO: «Cierre prorrogado: antes cerraba el 30 de sep».
- CONCISO: `_cierre_prorrogado` + `_cierre_inicial` (viajan; `lib/almacen.js:370-371`, medido entre versiones del dataset). Solo si hubo más de una versión vista (`_versiones > 1`): «no prorrogado» puede ser «no lo vimos».
- BENEFICIA: quien empieza entiende «hay más tiempo» y la señal (pocas ofertas: el factor de prórroga de la probabilidad).
- AFECTA: nada.
- Fuente `_cierre_inicial` · medido · petición · necesidad E6.

**SIN-26 · Aviso de competencia baja (señal #11)** · se_conserva · tanda 1 · ambos — CORTO: «Atención: aquí se presentan 1,4 oferentes en promedio. Puede ser un nicho suyo … o un pliego escrito a la medida de otro. El dato no distingue las dos: revise requisitos y plazos…». CONCISO: `avisoCompetencia` (`app.js:1465-1475`, umbral 2). BENEFICIA: P16 con las dos lecturas y qué hacer. AFECTA: nada. · medido · petición · P16.

**SIN-27 · Avisos de cierre (≤ 2 días) y de manifestación** · se_conserva · tanda 1 · ambos — CONCISO: `avisoCierre` (`app.js:1477-1485`), `avisoManifestacion` (`:1526-1556`); el pie «La ley fija un máximo, no un plazo» ya está. · calculado · petición · P7/E17.

**SIN-28 · La entidad cambió las reglas (adendas)** · se_conserva · tanda 1 · ambos — CONCISO: `evaluarAdendas` (`lib/adendas.js:44-100`) sobre `_cambios`; «● Cierre: pasó de … a …» / «○ Plazo: … No le afecta.». BENEFICIA: E8. · medido · petición · E8.

**SIN-29 · Los renglones de las puertas, en palabras del glosario** · cambia · tanda 3 · sin experiencia
- CORTO: «Registro de proponente ✓ · La actividad de este proceso está inscrita en su registro.» · «Capacidad de facturar ~ · Sin anticipo, esta obra ($6.366 M) supera lo que puede facturar hoy ($4.471 M): cabe con un anticipo del 30 % o más. Confírmelo en el pliego.» · «Caja ? · Sin anticipo tendría que financiar ≈ $1.273 M antes del primer cobro y su patrimonio es $1.107 M.» · «Competencia · Poca: 1,4 oferentes en promedio en 55 procesos.»
- CONCISO: los mensajes los redacta el servidor (`lib/puertas.js:115, 202-209, 263-266, 286-290`) y dicen «clase UNSPSC», «CRPC», «K», «capacidad residual»; `JERGA_JS` solo censa `public/*.js`, así que la jerga entra por el servidor. Mismas cifras, palabras del glosario; y se cierra la fuga con una cerradura que pase `JERGA_JS` sobre los mensajes de `evaluarPuertas` ejecutados (una prueba que FALLE contra el árbol de hoy).
- BENEFICIA: el plegado deja de exigir el curso (P1, P3).
- AFECTA: cerraduras de `iteracion()` sobre esos mensajes (buscar con `grep -n "capacidad residual" tests/e2e.js` antes de tocar); `lib/publico.js` redacta las cifras sin token: los textos nuevos deben seguir sin cifras en ese camino.
- Fuente `puertas.*.mensaje` · calculado · petición · necesidad P1/P3.

**SIN-30 · La caja que le faltaría** · nuevo · tanda 3 · sin experiencia
- CORTO: «Le faltarían ≈ $166 M de caja si no hay anticipo».
- CONCISO: `p3_caja.financiacion_requerida − p3_caja.patrimonio` cuando es > 0 (A1 § 3; reproducido: 1.273.172.737 − 1.107.252.964 = 165.919.773). La financiación es la regla interna del 20 % del valor a ejecutar (`FRACCION_FINANCIACION`, `lib/puertas.js:58`) con el anticipo extraído por regex (o 0 si no se sabe): por eso se dice «si no hay anticipo». Sin token `patrimonio` viaja `null` → no se pinta (`lib/publico.js`). Sube a la línea «Para poder presentarse» cuando P3 falla (SIN-04).
- BENEFICIA: convierte «necesitaría financiar X y su patrimonio es Y» en la cifra que decide (crédito, socio, anticipo): P1/P11.
- AFECTA: hereda dos supuestos (20 % y anticipo desconocido), declarados en el texto.
- Fuente `p3_caja` · calculado · petición · necesidad P1/P11.

**SIN-31 · Anticipo en tres estados** · cambia · tanda 1 · ambos
- CORTO: «Anticipo 30 %» · «Sin anticipo: lo dice el pliego» · «Anticipo: no publicado · búsquelo en el pliego».
- CONCISO: `anticipo_pct` + `anticipo_declarado` (`enriquecer`, `lib/negocio.js:218-224`, regex sobre el objeto; el dataset no trae columna). Hoy `app.js:2192` solo mira `pct > 0` y pinta «no declarado» también cuando el pliego dijo «sin anticipo» (H1, reproducido en A1 con dos lecturas contrarias en la misma tarjeta; P3 sí lo distingue, `lib/puertas.js:247`).
- BENEFICIA: E4/P4: quien empieza sabe si buscarlo y dónde; «pago anticipado» no es «anticipo» (V-08) y el detector es uno solo: el chip dice «anticipo o pago anticipado» cuando el texto no distingue.
- AFECTA: nada.
- Fuente `anticipo_pct`, `anticipo_declarado` · estimado (regex) / publicado cuando el pliego lo declara · sync · necesidad E4.

**SIN-32 · Plazo de ejecución** · nuevo (en la tarjeta) · tanda 1 · ambos
- CORTO: «Plazo: 8 meses» · «Sin plazo publicado (se asume un año para la capacidad)».
- CONCISO: `duracion` + `unidad_de_duracion` viajan (solo se pintan en el expediente, `public/expediente.js:405`); `plazoMesesDe` (`lib/capacidad.js:148-158`) es la regla única (llamarla) y asume 12 sin dato (A4 C8): la ausencia se DECLARA en el chip, porque la K que decide la usa.
- BENEFICIA: P3 («¿cuánto puedo facturar?») necesita el plazo; hoy quien empieza no lo ve hasta guardar.
- AFECTA: nada; +30 B de texto.
- Fuente `duracion`, `unidad_de_duracion` · publicado · sync · necesidad P3.

**SIN-33 · Lo que la obra exige facturar al mes** · nuevo · tanda 3 · sin experiencia
- CORTO: «≈ $796 M al mes de obra durante 8 meses».
- CONCISO: `cuantia_cop / plazoMesesDe(fila)` (C2 de A4; reproducido: 795.732.961). Es ritmo, no caja (actas, retenciones, anticipo): se dice «de obra».
- BENEFICIA: P3: el tamaño del contrato en unidades que quien empieza entiende («¿puedo mover eso cada mes?»).
- AFECTA: sin plazo publicado no se pinta (no se calcula sobre los 12 meses asumidos: un supuesto no se multiplica).
- Fuente `cuantia_cop`, `duracion` · calculado sobre publicado · petición · necesidad P3.

**SIN-34 · La obra cruza diciembre** · nuevo · tanda 3 · sin experiencia
- CORTO: «La obra cruza diciembre: en enero suben el salario mínimo y los materiales».
- CONCISO: `obra.plazo.cruza_diciembre` de la guía (`lib/guia_proceso.js:286`, reproducido `true`) y su consejo existente (`:532-533`, reajuste). Se calcula desde el cierre + plazo (estimación de inicio: se dice «cruza» con la fecha de cierre como arranque, que es optimista: el acta de inicio llega después).
- BENEFICIA: P6 (E3): un costo que quien empieza no ve hasta que le sube la nómina.
- AFECTA: sin plazo publicado no se pinta.
- Fuente guía (`cruza_diciembre`) · calculado sobre publicado · petición · necesidad P6.

**SIN-35 · Le descontarán el 5 % de obra pública** · nuevo · tanda 3 · sin experiencia
- CORTO: «Le descontarán el 5 % de obra pública: ≈ $318 M sobre el presupuesto».
- CONCISO: `CONTRIBUCION_PCT` y `aplicaContribucion(tipo)` de `lib/ganancia.js:111,136` (fuente única; Ley 418/1997 art. 120, permanente por Ley 1738/2014 art. 8, citada en `lib/guia_proceso.js:80-93`); la guía ya lo calcula (`dinero.contribucion_obra_5pct_cop`, reproducido 318.293.184). Solo obra (interventoría y consultoría no la causan); la base real es el valor del CONTRATO (su oferta), por eso «sobre el presupuesto».
- BENEFICIA: E3, «el olvido más caro del país»: quien empieza lo descubre en la primera acta.
- AFECTA: nada; con tipo de trabajo desconocido «ante la duda, no prometer» (no se pinta).
- Fuente `lib/ganancia` · calculado sobre publicado (tarifa publicada) · petición · necesidad E3/P6.

**SIN-36 · La póliza de seriedad y cuándo pedirla** · nuevo · tanda 4 · sin experiencia
- CORTO: «Necesitará una póliza de seriedad: suele ser el 10 % del presupuesto (≈ $637 M asegurados); pídala 5 días de oficina antes del cierre».
- CONCISO: `GARANTIA_SERIEDAD_PCT` y `dinero.garantia_seriedad_asegurada_cop` de la guía (`lib/guia_proceso.js:95,547`; reproducido 636.586.369); el paso «Pida la garantía» ya existe (SIN-15). PRECONDICIÓN: resolver el par de bases (guía: 10 % del presupuesto; `lib/dictamen.js:338-339`: 10 % de la OFERTA, Decreto 1082 art. 2.2.1.2.3.1.9; A5 § 6.2, NO VERIFICABLE hoy: norma no leída). Hasta entonces, «suele ser» y el pliego manda.
- BENEFICIA: P4/P7/P10: sin la póliza no hay oferta y no se corrige después (A5 W8); la primera vez la aseguradora tarda.
- AFECTA: es una cifra calculada sobre una regla con dos bases: por eso «suele» y tanda 4, no 1.
- Fuente guía · calculado · petición · necesidad P4/P7.

**SIN-37 · Precios unitarios / precio global, explicado a la vista** · cambia · tanda 1 · sin experiencia
- CORTO: «Precios unitarios: si hay más cantidad, se paga» · «Precio global: el riesgo de las cantidades es suyo».
- CONCISO: `tipo_precio` (`tipoPrecio`, `lib/negocio.js:267-274`, regex sobre objeto y descripción; `null` si ninguno o los dos); la explicación de hoy vive en el `title` (`app.js:2200-2203`), que en teléfono no existe (cerradura «unidad pantalla · sin tooltip», `tests/e2e.js:8663-8680`).
- BENEFICIA: E12: «la variable de riesgo que el manual omite», en llano.
- AFECTA: nada.
- Fuente `tipo_precio` · estimado (texto) · petición · necesidad E12.

**SIN-38 · Cómo lo adjudican, en llano** · nuevo · tanda 3 · sin experiencia
- CORTO: «Licitación pública: el proceso grande; el método de puntuar el precio se sortea» (la explicación completa de `modalidadEnLlano` en el título y en el expediente).
- CONCISO: `modalidadEnLlano` (`lib/guia_proceso.js:121-153`) ya redacta las siete modalidades; para no copiar textos al cliente, `listar` publica UNA VEZ por respuesta un diccionario `modalidades: {clave: {nombre, explicacion}}` (≈ 1 KB) y cada fila lleva su clave (`filtro.modalidad` ya existe). El chip es el nombre propio (glosario: `modalidad.visible` «Cómo lo adjudican»).
- BENEFICIA: P13/P1: «Selección abreviada de menor cuantía» no le dice a quien empieza que hay que avisar antes; la explicación sí.
- AFECTA: ≈ 1 KB por respuesta; una sola redacción (servidor).
- Fuente `modalidad_de_contratacion` + `modalidadEnLlano` · publicado + texto · petición · necesidad P13.

**SIN-39 · Ubicación · encaje del registro · capacidad estimada · «Suelen bajar» · «Cómo se adjudica en TOLIMA»** · se_conserva (plegado) · tanda 1 · ambos — CONCISO: chips 25-27, 24 y 30 de A1; el chip «Capacidad calculada con ingreso estimado» declara el supuesto del CO × 16,7 (`lib/rup.js:138`), y el pie del departamento «se expone, no decide» (B9b). BENEFICIA: evidencia para quien quiera verla. AFECTA: nada. · publicado / medido / supuesto declarado · sync y petición · P1/P5.

**SIN-13** (arriba, 3.B) también va plegado.

### 3.E · Pie

**SIN-40 · Estado · chip «Activo · abierto» · línea de margen** · se_conserva · tanda 1 · ambos — CONCISO: `estado_del_procedimiento` (nombre propio de SECOP II), el chip del PAA, `lineaMargen` (solo con `?ordenar_por=margen`, ya dice «no es lo que deja»). · publicado / calculado · petición.

**SIN-41 · Guardar dice qué da** · cambia · tanda 1 · sin experiencia
- CORTO: botón «Guardar» con `title`/línea «Guardar · para ver qué le piden y el paso a paso»; y el «›» de SIN-15 es este mismo botón.
- CONCISO: `botonGuardar` (`app.js:3553-3567`). Detrás de Guardar están la ficha de ocho casillas «Lo que exige este pliego», los 10 requisitos con «dónde se consigue» y el paso a paso fechado (A5 P4, P7, P8): quien empieza no lo sabe.
- BENEFICIA: P4/P8.
- AFECTA: el `title` no basta en teléfono: la línea de SIN-15 lo dice a la vista.
- Fuente — · — · clic · necesidad P4/P8.

**SIN-42 · «Calcular mi precio» lleva el plazo** · cambia · tanda 1 · ambos
- CORTO: (sin texto) el editor de Precios abre con el plazo del proceso.
- CONCISO: `qApu` lee `l.plazo_meses` (`app.js:2122`) y la fila de `op=listar` no lo lleva (H4, reproducido en A1); se publica `plazo_meses = plazoMesesDe(fila)` (o `null` sin dato: no el 12 asumido) en la fila.
- BENEFICIA: P6: Precios calcula el costo financiero con el plazo real.
- AFECTA: +14 B por fila.
- Fuente `duracion`, `unidad_de_duracion` · publicado · petición · necesidad P6.

**SIN-43 · Ver en SECOP II** · se_conserva · tanda 1 · ambos — CONCISO: `urlproceso` (`urlDeFila`, `lib/proyeccion.js:71-75`), solo con URL http(s). · publicado · sync.

**SIN-44 · Sin clave, una sola línea** · nuevo · tanda 1 · sin experiencia
- CORTO: «Sin su clave, la lista no enseña cifras de dinero ni cuánto bajan.» (una vez, en la cabecera de la lista).
- CONCISO: `finanzas_visibles: false` en la cabecera de `op=listar` (`lib/publico.js:118`): la tarjeta pierde exactamente cuatro cosas sin decir por qué (H8: celda 3, chip de baja, línea del departamento, cifras de P2/P3).
- BENEFICIA: quien entra sin credencial entiende que el «—» es de acceso, no de datos.
- AFECTA: nada; token presente e inválido sigue siendo 401.
- Fuente `finanzas_visibles` · — · petición · necesidad P1.

### 3.F · En los modales de la entidad y del competidor, y fuera de la tarjeta

**SIN-46 · Cierre en fechas difíciles (señal #10)** · nuevo · tanda 3 · ambos
- CORTO: «Cierra el día siguiente a un festivo» · «Cierra entre el 20 de diciembre y el 10 de enero».
- CONCISO: `fecha_cierre` + `esFestivo`/`esHabil` (`lib/habiles.js:77-78`; reproducido: 13-oct-2026 es hábil y el 12 es festivo). Ámbar, informativo; nunca bloquea (falso caro = negativo). Ventana 20-dic/10-ene: es la del manual (señal #10, Cap. 18), no una norma.
- BENEFICIA: E5/P16: una de las 12 señales de pliego hecho a la medida, sin leer el pliego.
- AFECTA: nada; puede coincidir con procesos legítimos (por eso ámbar y «puede ser»).
- Fuente `fecha_cierre` · calculado · petición · necesidad E5/P16.

**SIN-47 · Proceso por lotes** · nuevo · tanda 4 · sin experiencia
- CORTO: «Proceso por lotes (3): la cuantía es la suma; puede presentarse a uno solo. Vea el valor de cada lote en el pliego.»
- CONCISO: `numero_de_lotes` llega solo al histórico (`lib/indice_competencia.js:126`; reproducido en A4: activa `undefined`, histórica `3`) y ningún módulo lo lee. Entra en `lib/proyeccion.CAMPOS` + una full + medir cobertura con `lib/columnas_historicas` ANTES de enseñar nada (la lección de `proveedores_que_manifestaron = 0`). El valor por lote NO está en el dataset: la K se evalúa contra la suma (conservador) y se dice.
- BENEFICIA: P1: para una empresa pequeña, un lote de $800 M dentro de un proceso de $6.000 M es la diferencia entre poder y no poder.
- AFECTA: sin dato por lote las puertas siguen midiendo la suma (cota superior, declarada); explica además los desenlaces `desierto_con_adjudicacion` y los «lotes parciales» que el índice de baja excluye (A4 #39).
- Fuente `numero_de_lotes` · publicado · sync (proyección + full) · necesidad P1.

**SIN-48 · Republicado el…** · nuevo · tanda 4 · ambos
- CORTO: «Republicado el 20 de sep: revise si cambió algo».
- CONCISO: `fecha_de_ultima_publicaci` (descartada por la proyección hoy; tres consumidores ya escritos y nunca alimentados: `lib/dictamen.js:404`, `lib/cronograma.js:91`, `lib/manifestacion.js:134`; A4 #15). Entra en `CAMPOS` + full + cobertura. NO se puede afirmar que sea una adenda (también cambia con publicaciones de fase): se dice «republicado».
- BENEFICIA: E8 (adendas a 24 h del cierre) sin leer el pliego: hoy el vigía de adendas exige texto.
- AFECTA: una full; el texto no promete más que lo que mide.
- Fuente `fecha_de_ultima_publicaci` · publicado · sync · necesidad E8.

**SIN-49 · De dónde son los que ganan aquí (modal de la entidad)** · nuevo · tanda 4 · ambos
- CORTO: «7 de cada 10 ganadores aquí son de Tolima (15 procesos)» (ejemplo inventado).
- CONCISO: `departamento_proveedor` vs `departamento_entidad` (guardadas en el histórico y no leídas: `lib/indice_competencia.js:125`; A4 C6), por entidad en `construirIndice`, n ≥ 5, «No Definido» aparte. Es el domicilio REGISTRADO en SECOP, no la sede real: se dice «son de».
- BENEFICIA: P16/E5: «¿tengo opción siendo de afuera?» con un hecho.
- AFECTA: frescura del índice; en el modal, no en la tarjeta (contexto, no decisión).
- Fuente histórico (`departamento_proveedor`) · medido · sync (histórico) · necesidad P16.

**SIN-50 · Aquí se gana sin bajar el precio (modal de la entidad)** · nuevo · tanda 4 · sin experiencia
- CORTO: «Aquí 9 de 12 ganaron ofertando el presupuesto completo» (ejemplo inventado).
- CONCISO: `baja_exactamente_cero` existe en las estadísticas globales del índice de baja (`lib/indice_baja.js:39,290,713`), no por entidad: se acumula por entidad en el mismo barrido y se pinta como frecuencia natural. El pie del departamento ya dice «se gana sin bajar el precio» cuando la mediana es 0 (B9b-H4).
- BENEFICIA: P5: «¿tengo que bajar?» con la respuesta más simple posible.
- AFECTA: nada nuevo de red; n ≥ 5.
- Fuente índice de baja (nuevo campo por entidad) · medido · sync (histórico) · necesidad P5.

**SIN-51 · Cuánto puede facturar hoy, de verdad** · cambia (la base de P2) · tanda 5 · ambos
- CORTO: «Cuánto puede facturar hoy: $4.471 M, descontando sus 2 contratos en ejecución» · «…, sin descontar contratos en ejecución: no hay ninguno registrado».
- CONCISO: hoy `calcSCE` recibe una lista que nadie carga y asume 0 («capacidad posiblemente optimista», `lib/capacidad.js:70-74`; A5 § 4.5). `lib/socio.js:26-32` ya consulta `jbjy-vk9h` por `documento_proveedor` para el socio: la misma consulta con el NIT del dueño da sus contratos «En ejecución» con valor y plazo; el saldo se aproxima como `valor × meses restantes / plazo` (fórmula que `calcSCE` ya implementa) porque `valor_pagado` es sin dato para media Colombia; el certificado del RUP gana si el dueño lo carga.
- BENEFICIA: P1/P3: la cifra que decide el tamaño de contrato deja de ser una «creíble optimista».
- AFECTA: fuente externa (datos.gov.co, hoy bloqueada desde aquí: NO VERIFICABLE); se declara la base de la cifra en Mi empresa y en el renglón de P2.
- Fuente `jbjy-vk9h` por NIT · publicado (contratos) + calculado (saldo) · externo · necesidad P1/P3.

**SIN-52 · Quiénes se presentaron a ESTE proceso (expediente, tras el cierre)** · nuevo · tanda 5 · ambos
- CORTO: «Archivos de oferta cargados: 4 (se leyeron 3 nombres de empresa)».
- CONCISO: `dmgg-8hin` (índice de archivos desde 2025, `lib/documentos_proceso.js:16-21`) mezcla los archivos de la entidad con los que suben los proponentes; el módulo ya los separa (`RE_PROPONENTE`, `:183`). Se agrupan por nombre de archivo; el índice va ~3 días por detrás; el nombre no siempre identifica al proponente: se dice «se leyeron n nombres», nunca una lista cerrada de oferentes. Vive en Mis procesos, no en la tarjeta.
- BENEFICIA: E13/E5: contra quién compitió, el día después del cierre, antes del informe de evaluación.
- AFECTA: fuente externa; no se leen ofertas ajenas (decisión de producto pendiente).
- Fuente `dmgg-8hin` · estimado (identidad por nombre de archivo) · externo · necesidad E13.

**SIN-53 · Se ha presentado N veces a esta entidad (perfil del competidor)** · nuevo · tanda 5 · ambos
- CORTO: «Se ha presentado 6 veces a esta entidad y ganó 2» (ejemplo inventado).
- CONCISO: `hgi6-6wh3` (proponentes) por NIT/código (`lib/proponentes.js`); `seguimiento.js:369-393` ya calcula «veces» y «ganadas» para Mis procesos; el cociente no se publica en ninguna pantalla (A4: NO VERIFICADO). Solo procesos cerrados; el ganador identificado solo por nombre no cruza con hgi6.
- BENEFICIA: E5: «¿es el que siempre gana o el que siempre se presenta?».
- AFECTA: una consulta externa por perfil, con tope y sin cachear fallos (como `detalleEntidad`): va en un segundo paso del modal, no en la carga instantánea.
- Fuente `hgi6-6wh3` · publicado · externo · necesidad E5.

**SIN-54 · Lo que esta entidad descontó en otros pliegos (estampillas)** · nuevo · tanda 5 · ambos
- CORTO: «En otros pliegos, esta entidad descontó estampillas del 2,5 % (visto en 3 pliegos, el último el 12 de ago)» (ejemplo inventado).
- CONCISO: `lib/deducciones.js` ya extrae concepto, porcentaje, evidencia y página de cada pliego leído (A5 § 4.3, reproducido); acumular `(entidad, concepto, pct, fecha, id_proceso)` en cada lectura construye la tabla que «nadie publica» (`lib/deducciones.js:12-16`). Es una OBSERVACIÓN con fecha y conteo, no una tarifa; el pliego del proceso gana siempre. Se pinta en el modal de la entidad y en «Lo que deja».
- BENEFICIA: E3: las estampillas las fija cada departamento y municipio (A5 W17) y son el segundo olvido más caro.
- AFECTA: solo crece con el uso (pliegos leídos); enlazar deducciones a Precios está APARCADO por el dueño (memoria § «Lo APARCADO por decisión del dueño (20-ago-2026)»): esto no lo desaparca, solo muestra lo observado.
- Fuente lecturas de `lib/deducciones` · medido (observado) · clic (acumulado) · necesidad E3.

**SIN-55 · Qué documentos tipo probablemente rigen** · nuevo · tanda 5 · sin experiencia
- CORTO: «Probablemente rigen los documentos tipo de infraestructura de transporte: confírmelo en el aviso de convocatoria».
- CONCISO: sector (`tipo_de_contrato` + `codigo_principal_de_categoria` + objeto) y fecha del aviso (`fecha_de_publicacion_del`); las normas ya están citadas en el árbol (infraestructura social v2 desde el 16-feb-2026, `lib/dictamen.js:311-312`; transporte, `lib/formulario1.js:87`; A5 § 4.1). Solo con sector inequívoco; si no, «sin dato». Es una DEDUCCIÓN: «probablemente» y manda al aviso.
- BENEFICIA: E11 y quien empieza: qué formatos y qué fórmula de experiencia aplican; distinguir pliego desactualizado de pliego hecho a la medida.
- AFECTA: riesgo de sector mal deducido (por eso tanda 5, «probablemente» y solo con sector claro); un dato publicado (el aviso) gana.
- Fuente sector + fecha del aviso · estimado · petición · necesidad E11.

**SIN-56 · Cuánto tarda en pagar esta entidad (condicionado a la sonda)** · nuevo · tanda 5 · ambos
- CORTO: «Aquí la mitad de las facturas de obra se pagaron en menos de 47 días (23 facturas)» (ejemplo inventado).
- CONCISO: `uymx-8p3j` (plan de pagos: `fecha_real_de_pago`, `fecha_de_emision`; A4 Tabla B) por `codigo_entidad`/`nit_entidad`: la mora real que hoy `lib/apu/rentabilidad.js` asume (`dso_meses`). PRECONDICIÓN DURA: la sonda fechada M-DGF-17 (`tests/sondear_fuentes.js`) NO existe y datos.gov.co está bloqueado desde aquí; sin medir cobertura de `fecha_real_de_pago` no se enseña nada.
- BENEFICIA: E7/P6: «el Estado paga tarde», medido por entidad, lo que la memoria daba por imposible con jbjy (y sigue siéndolo con jbjy: el dato está en otro dataset).
- AFECTA: cobertura desconocida (el supervisor puede no registrar); solo con n suficiente y «sin dato» explícito.
- Fuente `uymx-8p3j` · publicado · externo (índice) · necesidad E7.

**SIN-57 · Lo que el modal de la entidad y el de la probabilidad ya enseñan** · se_conserva · tanda 1 · ambos — CONCISO: banda → resumen → por año → prórroga («Movió la fecha de cierre en p de n») → plazo de adjudicación («Suele tardar 7 días de oficina en adjudicar…») → desiertos → encogimiento → «Quién gana aquí» → proponentes → ejecución (`pintarDetalle`, `app.js:3078-3118`); el desglose de seis pasos de la probabilidad. BENEFICIA: E5, E6, E7. AFECTA: nada; SIN-22/23/49/50/54 se añaden ahí. · medido · clic.

## 4. Las reglas que no se pueden violar, y cómo las cumple cada dato

| Regla | Cómo la cumple esta propuesta (fichas) |
|---|---|
| **Todos los datos ciertos siempre; un calculado se declara calculado; «sin dato» no es 0 ni un supuesto disfrazado** | Cada CORTO derivado lleva «≈», «si…», «suele» o «probablemente» (SIN-09, 30, 33, 34, 35, 36, 55); cada ausencia dice que lo es y dónde buscar (SIN-02, 10, 11, 31, 32, 44); el supuesto de 5 rivales deja de pintarse como «1 de 5» (SIN-08) y el rótulo «supuesto: 5 rivales» sale de la celda (SIN-07); las cotas se declaran arriba del perfil (SIN-21); nada se multiplica sobre un plazo asumido (SIN-33) ni se enseña sin medir cobertura (SIN-47, 48, 56). La certeza va en cada ficha. |
| **Un dato publicado gana a uno calculado** | El anticipo del pliego gana a la regex (SIN-31, 04); la fecha del cronograma a la ventana calculada (SIN-16); el certificado del RUP a la aproximación con jbjy (SIN-51); el aviso de convocatoria a la deducción de documentos tipo (SIN-55); el pliego a las estampillas observadas (SIN-54) y a la póliza (SIN-36); el estado publicado de apertura, si se ingiere, contrasta al calculado antes de sustituirlo (§ 7). |
| **Una cifra redondeada para mostrar no decide** | El «30 %» es el techo redondeado hacia arriba de 29,77 % y la decisión la toma `rup.js` con la cifra exacta (SIN-04); «1,4» es para mostrar y `p` ordena (SIN-07/08); «≈ $56M» no decide el precio: Precios decide (SIN-09); «≈ $166 M» no cierra la puerta P3 (SIN-30). |
| **Lo que se VE arriba (hecho + frecuencia natural, sin «probabilidad»), lo que se TOCA plegado** | § 5: arriba las cuatro preguntas; plegado la evidencia y el dinero; el modelo detrás de «Ver cómo se calcula». Ningún texto propuesto contiene «probabilidad» (ejecutado: `d_sin_textos.js`). |
| **Usted, sin jerga, sin emoji** | 70 textos contra `tuteoEn`, `VOSEO_RE`, `RE_EMOJI_UI` y `JERGA_JS`: 0 fallos. La jerga del servidor (P1-P3) se traduce y se cerca (SIN-29). «Días de oficina», nunca «hábiles» (SIN-12/13/14/36). Semáforo con clase de color y «●», como hoy. |
| **Ninguna pulsación sin respuesta visible** | El líder abre el modal al instante con esqueleto y `aria-busy` (SIN-18/20); las filas dicen que se pueden pulsar (SIN-22); sin líder no hay botón; «Guardar» dice qué da (SIN-41); «Calcular mi precio» abre Precios con el plazo (SIN-42). |
| **No reescribir una regla que ya existe: llamarla** | `plazoMesesDe` (SIN-32/33/42), `habilesEntre`/`esFestivo` (SIN-12/13/14/46), la regla del día anterior y los pasos de la guía extraídos y compartidos (SIN-11/15), `modalidadEnLlano` (SIN-38), `CONTRIBUCION_PCT`/`aplicaContribucion` (SIN-35), `esAdjudicado`/`claveAdjudicatario` y el acumulador de `detalleAdjudicatario` compartido con el constructor (SIN-18/19), `cargaK` (SIN-06), la mediana única de `lib/estadistica` (SIN-14), `Glosario.corto` (SIN-03), `calcSCE` (SIN-51), `lib/deducciones` (SIN-54). Un endpoint nuevo es una `op` (`api/*.js` = 6): aquí no hace falta ninguna nueva —`op=competidor`, `op=entidad` y `op=listar` bastan— y `ligero=1` es un parámetro. |
| **El falso caro en oportunidades es el NEGATIVO** | Nada nuevo bloquea: SIN-14, 46, 47, 48, 49 son ámbar o contexto; SIN-06 propone socio «por si acaso» en vez de esconder la fila; el orden de SIN-02 no elimina, agrupa. |
| **Dos cosas distintas no pueden tener nombres parecidos** | «Presente el 13 de oct» (regla) frente a «Cierra el 14 de oct» (hecho) (SIN-11); «republicado» no es «adenda» (SIN-48); «tiene la actividad» no es «aporta la experiencia» (SIN-05, A3); «son de» (domicilio registrado) no es «tienen sede en» (SIN-49); «sobre el presupuesto» no es «sobre su oferta» (SIN-35). |
| **Un arreglo que cubre solo el caso reproducido deja hermanos vivos** | SIN-06 nace de una reproducción (la captura) y se generaliza como carencia condicional, no como parche del 30 %; SIN-29 cerca TODOS los mensajes de `evaluarPuertas`, no el de P2; SIN-08 cubre las tres fuentes de `FUENTE_P`, no solo «conservador». |

## 5. El orden en pantalla, y la tarjeta reformada con el proceso de la captura

**Arriba (lo que se VE, en el orden de las cuatro preguntas):** título + referencia + entidad · cuantía → «● Para poder presentarse: …» → «● Con quién: …» → cierre + días de oficina + manifestación + siguiente paso → «Para ganar» (tres celdas + «Ver cómo se calcula») → chips de zona, competencia («quién gana aquí ›») y «Quien más gana aquí» → avisos (competencia baja, cierre, manifestación, adendas).
**Plegado («Más detalles», lo que se TOCA):** los cuatro renglones de las puertas en llano; anticipo (tres estados); plazo, ritmo mensual, cruza diciembre; el 5 % de obra pública; la póliza (t4); tipo de precio y modalidad explicados; ubicación, encaje del registro, capacidad estimada, «Suelen bajar»; días de oficina que dio el proceso (y lo que suele dar la entidad, t4); lotes y republicado (t4); el pie del departamento.
**Modal de la entidad:** lo de hoy (SIN-57) + filas pulsables con texto (SIN-22) + antesala ligera (SIN-23) + ganadores locales, «sin bajar el precio» y estampillas observadas (t4-5).
**Modal del competidor:** esqueleto con forma (SIN-20) → cabecera con las tres líneas de honestidad (SIN-21) → conteos y valor → tabla por entidad → baja media → «se ha presentado N veces aquí» en un segundo paso (t5).
**Modal de la probabilidad:** el desglose de hoy + «Lo que la aplicación no mide» (SIN-45).

Maqueta en texto (tanda 1 + 2 + 3 aplicadas; las cifras son las reproducidas en § 0, el líder y el «1 de 3» son los de la captura; el líder es un ejemplo inventado porque la captura no lo enseña):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA        $ 6.365.863.685 │
│ Ref. LP-008-2026 · ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Tolima    cuantía alta │
│                                                                              │
│ ● Para poder presentarse: puede, solo si el pliego trae anticipo del 30 % o  │
│   más. Confírmelo en el pliego.                                     (ámbar)  │
│ ● Con quién: Solo, si el pliego trae anticipo del 30 % o más; si no lo hay,  │
│   con PRODIAC: le suma capacidad.                                   (ámbar)  │
│                                                                              │
│ [Cierra en 31 días · 14 de oct de 2026 · presente el 13 de oct]              │
│ Le quedan 22 días de oficina para armar la oferta                            │
│ Siguiente paso · hoy: lea primero las causales de rechazo y el cronograma    │
│ del pliego · Guárdelo para el paso a paso completo ›                         │
│                                                                              │
│ Para ganar                                                                   │
│ ┌──────────────────────┬──────────────────────┬────────────────────────────┐ │
│ │ 1,4                  │ 1 de 3               │ Calcular                   │ │
│ │ empresas suelen      │ se gana,             │ cuánto deja: falta su      │ │
│ │ competir             │ aproximadamente      │ costo · se calcula en      │ │
│ │ en 55 procesos       │ Poca competencia en  │ Precios                    │ │
│ │                      │ esta entidad         │                            │ │
│ └──────────────────────┴──────────────────────┴────────────────────────────┘ │
│                                                        Ver cómo se calcula   │
│ [Su zona (Ibagué)]  [● Poca competencia · 1,4 en 55 · quién gana aquí ›]      │
│ [Quien más gana aquí: CONSTRUCTORA X · 6 de 15 ›]                            │
│                                                                              │
│ Atención: aquí se presentan 1,4 oferentes en promedio. Puede ser un nicho    │
│ suyo —que es por lo que la aplicación se lo muestra primero— o un pliego     │
│ escrito a la medida de otro. El dato no distingue las dos: revise requisitos │
│ y plazos antes de invertir tiempo en la oferta.                              │
│                                                                              │
│ ▸ Más detalles                                                               │
│   ● Registro de proponente ✓ · La actividad de este proceso está inscrita    │
│     en su registro.                                                          │
│   ● Capacidad de facturar ~ · Sin anticipo, esta obra ($6.366 M) supera lo   │
│     que puede facturar hoy ($4.471 M): cabe con un anticipo del 30 % o más.  │
│     Confírmelo en el pliego.                                                 │
│   ● Caja ? · Sin anticipo tendría que financiar ≈ $1.273 M antes del primer  │
│     cobro y su patrimonio es $1.107 M. Le faltarían ≈ $166 M de caja si no   │
│     hay anticipo.                                                            │
│   ● Competencia · Poca: 1,4 oferentes en promedio en 55 procesos.            │
│   [Anticipo: no publicado · búsquelo en el pliego]  [Plazo: 8 meses]         │
│   [≈ $796 M al mes de obra durante 8 meses]                                  │
│   [La obra cruza diciembre: en enero suben el salario mínimo y los           │
│    materiales]                                                               │
│   [Le descontarán el 5 % de obra pública: ≈ $318 M sobre el presupuesto]     │
│   [Precios unitarios: si hay más cantidad, se paga]                          │
│   [Licitación pública: el proceso grande; el método de puntuar el precio se  │
│    sortea]  [Purificación]  [Encaja con su registro ✓]                       │
│   [Capacidad calculada con ingreso estimado]  [Suelen bajar: sin datos]      │
│   [El proceso dio 30 días de oficina desde su publicación]                   │
│   Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos. En TOLIMA │
│   se gana sin bajar el precio: los que ganaron ofertaron prácticamente por   │
│   el presupuesto oficial (131 contratos ya adjudicados en todos los tipos    │
│   de obra).                                                                  │
│                                                                              │
│ Publicado          [Guardar]   [Calcular mi precio]   Ver en SECOP II ↗      │
└──────────────────────────────────────────────────────────────────────────────┘
```

Lo que cambia respecto a la captura del dueño, en cinco líneas: (1) la línea de arriba ya no dice «Cumple los requisitos, con detalles por revisar»: dice el detalle que decide (el 30 % de anticipo); (2) hay una línea «Con quién» que no contradice a la de arriba (hoy diría «Solo: le alcanza»); (3) el cierre dice cuándo presentar y cuántos días de oficina quedan, y hay un siguiente paso; (4) la franja se llama «Para ganar» y no pinta ningún supuesto como número; (5) el ganador habitual de la entidad tiene nombre y está a un clic, con espera que enseña qué se arma.

Al pulsar «Quien más gana aquí» (SIN-18 → 20 → 19 → 21):

```
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dónde gana este competidor                                             [×]   │
│ CONSTRUCTORA X                                                               │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒  (esqueleto brillo) │
│ Buscando dónde más ha ganado esta empresa…                                   │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒   ▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒▒▒▒                    │
│ ▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒   ▒▒▒▒▒▒▒▒▒▒▒   ▒▒▒▒▒▒▒▒   (× 5 filas)       │
└──────────────────────────────────────────────────────────────────────────────┘
      ↓ ≈ 0,1-0,3 s con el índice (SIN-19); el esqueleto desaparece de golpe
┌──────────────────────────────────────────────────────────────────────────────┐
│ Dónde gana este competidor                                             [×]   │
│ CONSTRUCTORA X · NIT 900.000.000                                              │
│ Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde │
│ enero de 2024. Fuera de eso, no aparece aquí. · Con datos hasta el 31 de ago │
│ 155 contratos en 143 entidades · $211.899 M en 147 con valor publicado ·     │
│ último: 25 de dic de 2025                                                    │
│ Baja media con la que gana: 6 % (147 contratos)                              │
│ Entidad                              Ganados   Valor adjudicado   Último     │
│ ALCALDÍA MUNICIPAL DE VENADILLO         3      $5.967 M           13-ago-25  │
│ …                                                                            │
│ ▸ Ver cuántas veces se ha presentado a esta entidad (consulta en vivo)  (t5) │
└──────────────────────────────────────────────────────────────────────────────┘
```

## 6. Tandas (sesiones) sugeridas

Cada tanda: lotes de ficheros DISJUNTOS entre agentes, `tests/e2e.js` spliciado en serie, cerraduras que FALLEN contra el árbol anterior, `node tests/e2e.js` 4/4 sin tuberías, navegador real a 390 px (se toca `public/`), sección nueva al final de `docs/MEMORIA.md` con «En una línea:» y `node tests/mapa.js --escribir`, PR contra `main` (A6 § 3).

| Tanda | Qué entra | Toca | Fichas |
|---|---|---|---|
| **1 · La tarjeta honesta** (cliente + resumen del socio + cinco campos baratos en `listar`) | rótulos «Para poder presentarse» / «Para ganar»; la línea con el hecho que decide; con quién (seis estados); anticipo en tres estados; sin fecha de cierre y cuantía no publicada explícitos + orden; referencia; plazo; días de oficina restantes y «presente el»; tipo de precio a la vista; prorrogado desde; un solo redondeo; sin supuesto pintado; sin clave una línea; «No viable» sin siglas; filas del modal pulsables; Guardar dice qué da; Precios recibe el plazo | `public/app.js`, `lib/handlers/procesos/listar.js` (resumenSocio, 5 campos), `lib/perfiles.js` (nombreCorto), `lib/socio_por_proceso.js` (linea), `lib/puertas.js` (`anticipo_que_cabe_pct`), `tests/e2e.js` (4 aserciones reescritas + nuevas), memoria | SIN-01, 02, 03, 04, 05, 07, 08, 10, 11, 12, 13, 17, 22, 25, 31, 32, 37, 41, 42, 44, 45 (rótulo) |
| **2 · Lo que el dueño pidió con nombre** | índice de adjudicatarios y perfil en 2-3 comandos; líder por entidad y botón de un clic; esqueleto con forma y `aria-busy` bajo reduced-motion; honestidad del perfil; antesala ligera; con quién cuando depende del anticipo | `lib/indice_competencia.js`, `lib/competencia_detalle.js`, `lib/handlers/procesos/historico.js`, `lib/handlers/inteligencia/detalle.js`, `lib/socio_por_proceso.js`, `public/app.js`, `public/index.html` (`<style>` mínimo), memoria (decisión sobre el líder con credencial) | SIN-06, 18, 19, 20, 21, 23 |
| **3 · El servidor habla en llano y dice qué hacer** | siguiente paso (pasos extraídos de la guía); puertas en llano + cerca; caja faltante; ritmo mensual; cruza diciembre; el 5 %; modalidad en llano; celda 3 rotulada como derivado; fechas difíciles; «lo que no se mide» en el modal | `lib/guia_proceso.js` (extraer `pasosDe`), `lib/puertas.js`, `lib/handlers/procesos/listar.js`, `public/app.js`, `tests/e2e.js` (cerca de jerga sobre mensajes ejecutados) | SIN-09, 15, 29, 30, 33, 34, 35, 38, 45 (modal), 46 |
| **4 · Índices y proyección** (una full; medir cobertura antes de enseñar) | días que suele dar la entidad; ganadores locales; «sin bajar el precio» por entidad; lotes; republicado; `codigo_entidad` a la proyección (identidad limpia, A4 #58); póliza de seriedad tras resolver el par de bases | `lib/proyeccion.js` (CAMPOS), `lib/indice_competencia.js`, `lib/indice_baja.js`, `lib/columnas_historicas.js`, `public/app.js`, `lib/guia_proceso.js`/`lib/dictamen.js` (base de la garantía) | SIN-14, 36, 47, 48, 49, 50 |
| **5 · Fuentes externas, tras la sonda** (escribir y correr `tests/sondear_fuentes.js` desde una máquina con red) | capacidad de verdad (jbjy del dueño); quiénes se presentaron (dmgg); se presentó N veces (hgi6); estampillas observadas; documentos tipo probables; cuánto tarda en pagar (uymx, condicionado) | `lib/capacidad.js`, `lib/socio.js`, `lib/documentos_proceso.js`, `lib/proponentes.js`, `lib/deducciones.js`, `lib/dictamen.js`, `public/expediente.js`, `public/app.js` | SIN-51, 52, 53, 54, 55, 56 |

Sin trabajo, solo verificación de que siguen ahí: SIN-16, 24, 26, 27, 28, 39, 40, 43, 57.

## 7. Lo que NO se propone (y por qué), aunque el dato exista

- **«Vista N veces en SECOP» (`visualizaciones_del`)**: la única señal ex-ante, pero «mide miradas» (incluidas las de la entidad) y su cobertura no está medida (A4 #33): no se puede afirmar qué significa. Primero ingerir y medir; luego decidir.
- **«De 12 ofertas, la que ganó fue la 4.ª más baja» (`wi7w-2nvm`)**: llave sin confirmar (`id_del_proceso` o `id_del_portafolio`) y sin causal de rechazo (A4 Tabla B): nada que exija un dato que no se pueda confirmar.
- **«Estado publicado: Abierto» (`estado_de_apertura_del_proceso`, `estado_resumen`)**: un publicado gana a un calculado, pero primero se ingiere y se MIDEN las discrepancias con `estado_abierto` (A4 C10); enseñar dos «abierto» distintos sería peor que uno.
- **Un porcentaje mínimo del socio que aporta la experiencia (30-40 %)**: `lib/guia_proceso.js:535` lo afirma y la memoria dice que no hay cifra general (A5 § 6.2): se retira de la guía o se rotula «lo fija el pliego»; en la tarjeta el reparto sugerido sigue siendo «sugerido».
- **La versión de documentos tipo en la tarjeta (tanda 1-3)**: es deducción de sector; solo en tanda 5 y con «probablemente» (SIN-55).
- **Cualquier peso de puntaje** (calidad, precio, industria nacional): no hay módulo que lea la tabla de evaluación; se declara «lo que no se mide» (SIN-45).
- **Un «% de probabilidad» o una «banda 1 de 5 a 1 de 12» en la tarjeta**: doble supuesto (A1 § 3); la banda sigue en el título/modal.
- **Los precios de cada competidor perdedor y los días reales de pago con jbjy**: imposibles con datos abiertos (A5 § 2 E7/E16); el pago real vive en otro dataset y va condicionado a la sonda (SIN-56).

## 8. Premisas corregidas y observaciones nuevas (con reproducción)

1. **«Solo: le alcanza sin socio» en el proceso de la captura** (`d_sin_repro.js`): `socioPorProceso` → `{tipo: "solo"}` mientras P2 → «solo cabe con anticipo del 30 % o más». No es un defecto de la puerta (memoria § ««Sin dato» volvió a ser «cero» en la puerta de la caja…»): es que la FRASE del recomendador afirma sobre una puerta que no se pudo verificar. A5 § 6.1 lo vio con la caja; aquí sale con la capacidad, en el ejemplo del dueño. Lo cubre SIN-06.
2. **La línea de la captura ya la escribe el servidor** (`lib/puertas.js:202-205`, reproducida literal): la reforma no tiene que inventar el dato, tiene que SUBIRLO (SIN-04). El «30 %» que pinta es `Math.ceil` de 29,77 %: conservador, y la decisión no lo usa.
3. **La guía ya sabe casi todo lo que quien empieza necesita** (pasos fechados, dinero, cruza diciembre, modalidad en llano, tamaño de la obra) y cuesta 473 µs por fila: el problema no es calcularlo, es que vive detrás de «Guardar». SIN-15/34/35/38 lo traen a la tarjeta llamando a las mismas funciones.
4. **`obra.plazo.cruza_diciembre` no es siempre `null`** (A4 C8 decía que la guía publica `null` sin duración): con duración publicada se calcula (`lib/guia_proceso.js:286`, reproducido `true`). A4 no está desmentido (habla del caso sin dato), pero conviene precisarlo.
5. **`JERGA_JS` no ve la jerga del servidor**: los renglones de las puertas dicen «CRPC», «K», «capacidad residual», «clase UNSPSC» (`lib/puertas.js:115,202-209`) y llegan a pantalla sin pasar por la cerca (que censa solo `public/*.js`). La invariante se defiende con un CENSO: una cerradura que ejecute `evaluarPuertas` y pase `JERGA_JS` a los mensajes (SIN-29), no una lista de mensajes corregidos.
6. **La cuenta de `habilesEntre` es exclusiva del día de partida e inclusiva del de llegada** (`lib/habiles.js:93-99`; reproducido: lunes→viernes = 4, lunes→lunes = 5): «le quedan 22 días de oficina» cuenta el día del cierre entero aunque cierre a las 15:00. Se dice «hasta el cierre» y se recuerda que se presenta el día anterior (SIN-11/12).

## 9. No verificable desde aquí (y por qué)

- Tiempos reales en producción (Upstash REST, Vercel): los µs/ms son de Node local; el rango 30-80 ms por comando REST es un SUPUESTO heredado de A2, que el dueño puede medir con `duracionMs`/`comandosRedis` (A2 § 3.3).
- Cualquier fuente externa (datos.gov.co, jbjy, hgi6, dmgg, uymx): proxy con CONNECT 403 / EGRESS_BLOCKED hoy (A4 § 0, A5 § 0); las fichas de la tanda 5 dependen de la sonda M-DGF-17, que no existe.
- El texto íntegro de las normas citadas (Ley 418/1997 art. 120 y Ley 1738/2014 art. 8; Decreto 1082 art. 2.2.1.2.3.1.9; Resolución 539/2025): dominios bloqueados; se citan tal como ya constan en el árbol (`lib/guia_proceso.js:80-93`, `lib/dictamen.js:311-312,338-339`).
- El comportamiento visual (390 px, plegado, esqueleto bajo reduced-motion, consola limpia): no se abrió navegador; las estructuras se leyeron del HTML y del CSS con ancla.
- Qué aserciones exactas de `iteracion()` tumbarán SIN-03, 04, 07, 08, 09, 22, 29: A6 § 5 indica que viven dentro de `iteracion()` y solo se ejercen con `E2E_SOLO=iteraciones` o el 4/4 (no se corrió, por encargo); se localizan por `grep` en la tanda que las toque.
- La proporción real de estados de socio en el corpus de producción (cuántas filas llevarán 96 B y cuántas 167 B): extrapolación de A3.
- Cuántas entidades del corpus real tendrán líder con base ≥ 5 (SIN-18): sin acceso al hash de producción.

## Anexo · comandos ejecutados (13-sep-2026)

```
sed -n '2133,2230p' public/app.js                # tarjeta()
sed -n '1718,1745p;2016,2112p' public/app.js      # lineaRequisitos, bloqueSocio, bloqueProbabilidad
sed -n '1606,1622p;1675,1692p;1349,1392p' public/app.js   # bandaCompetencia, badgesPuertas, chipBaja, lineaBajaDepartamento
grep -n "function chipManifestacion\|function avisoCompetencia\|function chipCierre\|function frecuenciaNatural\|FUENTE_P" public/app.js
sed -n '50,92p' public/glosario.js                # TERMINOS
sed -n '60,100p;121,160p;201,215p;430,482p' lib/guia_proceso.js   # EXIGENCIAS, modalidadEnLlano, guiaDe, pasos
sed -n '76,112p' lib/rup.js ; sed -n '195,216p;255,300p;300,342p' lib/puertas.js
grep -n "^function \|module.exports" lib/habiles.js lib/capacidad.js ; sed -n '93,101p' lib/habiles.js ; sed -n '140,160p' lib/capacidad.js
node tests/mapa.js tarjeta ; node tests/mapa.js filosofia ; sed -n '3619,3700p' docs/MEMORIA.md
node d_sin_repro.js  → salida íntegra en d_sin_repro.salida.txt (resumen en § 0)
node d_sin_textos.js → «textos: 70 · fallos: 0»
git -C /home/user/portafolio-estrategico status --short | wc -l → 0 (antes y después)
```
