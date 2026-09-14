# Verificación adversaria · D-65 a D-72 (13/14-sep-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Postura por defecto: refutar. Cada veredicto lleva su reproducción ejecutada; los scripts y sus salidas
están en esta misma carpeta (`v_d65_d72.js` → `v_d65_d72.salida.txt`, `v_d71_celda.js` →
`v_d71_celda.salida.txt`, `v_lenguaje_d65_d72.js` → `v_lenguaje_d65_d72.salida.txt`). El árbol no se
tocó (`git status --short` vacío al terminar).

## Resumen

| id | veredicto | en una línea |
|---|---|---|
| D-65 | con_condiciones | wi7w-2nvm existe en el diccionario co-acc pero NO en el árbol; sin llave confirmada, sin columna «ganó» (exige cruce) y con un segundo conteo de ofertas que puede divergir del de la tarjeta. |
| D-66 | con_condiciones | uymx-8p3j trae `fecha_real_de_pago`/`fecha_de_emision` (diccionario), pero no está en el árbol; el DSO de rentabilidad es un supuesto de 60 días que el usuario puede cambiar; «facturas de obra» exige cruzar con el contrato; cobertura sin medir. |
| D-67 | con_condiciones | `visualizaciones_del` no está en `lib/proyeccion.CAMPOS` (se descarta al ingerir): costo real = añadir a CAMPOS + full + censo de cobertura; la memoria ya registró una columna «poblada según cuaderno» que llegó a 0 en toda la muestra. |
| D-68 | confirmado | Botón → `op=probabilidad` → `desgloseDeProceso`; el supuesto de 5 rivales viaja en el paso 1 del desglose. |
| D-69 | confirmado (matiz) | `manifestacionDeFila` publica cuatro estados + `confirmada`; el chip tiene SIETE textos, no cinco; la fecha del pliego gana y el techo no se pinta como plazo (reproducido). |
| D-70 | confirmado | `evaluarZona`: Tolima desde Ibagué → «Su zona (Ibagué)»; sin base → «Distancia sin calcular»; los ~120 km de Bogotá son Meta. |
| D-71 | con_condiciones | El aviso enseña «1,4 oferentes» y la celda de al lado «~1 empresa suele competir» (`Math.round`, app.js:2073): NO es «la misma cifra y redondeo» que afirma la ficha. |
| D-72 | confirmado | `avisoCierre` con `diasParaCierre` único; `null` no urge; solo ≤ 2 días y solo en viables. |

## Método común

- Coordenadas: `node tests/mapa.js manifestacion|accesibilidad|probabilidad|avisoCompetencia|avisoCierre|visualizaciones`.
- Funciones del navegador (`avisoCompetencia`, `avisoCierre`, `chipManifestacion`, `avisoManifestacion`,
  `cuantosCompiten`) extraídas del texto de `public/app.js` y ejecutadas con `new Function` y stubs de
  `esc`/`fmtNum`/`chip` (el IIFE no exporta). Funciones del servidor (`manifestacionDeFila`, `evaluarZona`,
  `competenciaDe`) llamadas directamente con `require`.
- Lenguaje: `lib/lenguaje_pantalla.js` (`RE_EMOJI_UI`, `VOSEO_RE`, `tuteoEn`) + regex de jerga sobre el
  texto corto de cada dato. Los ocho pasan: sin emoji, sin voseo, sin tuteo, sin jerga
  (`v_lenguaje_d65_d72.salida.txt`).

## D-65 · «Con cuánto ofertaron todos» — con_condiciones

**Fuente.** `grep -rn "wi7w\|valor_de_la_oferta" lib/ api/ tests/` → 0 resultados: nada en el árbol lee ese
dataset. El diccionario co-acc (`plan/coacc/wi7w-2nvm.yml`) sí lo describe: `valor_de_la_oferta`,
`id_del_proceso_de_compra` como llave de proceso, `nit_del_proveedor`, `c_digo_entidad`; 41,9 M filas,
`fecha_de_registro` máx. 2026-04-21, semanal. No hay columna de estado/rechazo ni de «ganó».

**Verdad.**
1. La llave: el corpus usa `id_del_proceso` (CO1.REQ.…, `lib/proponentes.js:59`, `lib/handlers/perfil/seguimiento.js:481`)
   y `id_del_portafolio` (CO1.BDOS.…, `lib/proyeccion.js:47-61`). Cuál de las dos es `id_del_proceso_de_compra`
   no está verificado por nadie (A4 § «Tabla B» lo deja abierto; la sonda M-DGF-17 no se ha corrido).
   NO VERIFICABLE desde esta máquina (sin red a datos.gov.co).
2. «La que ganó fue la 4.ª más baja» exige saber QUIÉN ganó: wi7w no lo trae; hay que cruzar con
   `nit_del_proveedor_adjudicado`/`nombre_del_proveedor` del corpus (`lib/indice_competencia.js:110-113`),
   que llega como «No Definido» en parte de las filas (`:94,162`). Sin cruce no hay «ganó».
3. «De 12 ofertas»: el conteo de la tarjeta (D-13) sale de `OFERENTES_CAMPOS` de p6dx
   (`lib/indice_competencia.js:100-104`); el de wi7w sería un segundo conteo con otro origen. Regla dura
   «dos cosas distintas no pueden tener nombres parecidos»: si divergen, la tarjeta diría «12 ofertas» y
   «~8 empresas» sobre el mismo proceso. Hay que declarar cuál manda o mostrar solo una.
4. Publicado gana a calculado: el orden de la ganadora entre posturas es un HECHO publicado (bueno), pero
   `valor_de_la_oferta` en 0/nulo (sobre cerrado, A4) NO puede contar como «la más baja»: se descarta
   antes de ordenar (`null`, jamás 0).

**Memoria.** Ninguna sección decide sobre wi7w (el mapa no devuelve secciones para el término). Aplica
§ «Puertas, probabilidad y valor esperado (ago 2026)» solo en cuanto a que la tarjeta ya enseña un
conteo de oferentes que no puede duplicarse con otro nombre.

**Costo.** «externo» es correcto como categoría: hoy solo hay lecturas en vivo a Socrata por CLIC en
`lib/handlers/perfil/seguimiento.js` (detalle de competidores, hgi6) y en `lib/proponentes.js`; `listar.js`
no llama a ninguna fuente externa por fila (`grep datos.gov.co lib/handlers/procesos/listar.js` → solo
el disparo del sync, `:343`). Por tanto: modal/detalle por clic, NUNCA por fila de `op=listar`.

**Lenguaje.** El corto pasa el censo. «modal de la entidad» está entre paréntesis como nota de ubicación,
no como texto de pantalla; que no se cuele.

**¿Ya existe?** No. Lo más cercano es `lib/proponentes.js` (quién se presentó, sin valores) y el
índice de baja (`lib/probabilidad_desglose.js:376`, ganador vs. presupuesto, no vs. otras posturas).

**Condiciones.** (a) Sonda M-DGF-17 desde máquina con red: confirmar la llave y medir cobertura de
`valor_de_la_oferta > 0` por proceso cerrado; (b) cruce con adjudicatario del corpus, descartando
«No Definido»; (c) declarar que el conteo de posturas de wi7w no sustituye a `OFERENTES_CAMPOS` o
unificar; (d) solo por clic (detalle), nunca en `op=listar`; (e) sin dato → no se pinta nada, jamás «0 ofertas».

## D-66 · «Cuánto tarda en pagar esta entidad» — con_condiciones

**Fuente.** `grep -rn "uymx\|fecha_real_de_pago" lib/ api/ tests/` → 0. El diccionario co-acc
(`plan/coacc/uymx-8p3j.yml`) sí trae `fecha_real_de_pago`, `fecha_de_emision`, `fecha_de_recepcion`,
`fecha_estimada_de_pago`, `codigo_entidad`, `nit_entidad`, `id_del_contrato`; cobertura exigida por co-acc
de `fecha_real_de_pago` = 0,7 (es decir, hasta un 30 % puede venir vacío).

**Verdad.**
- La cifra que hoy usa la aplicación es un SUPUESTO: `DSO_DIAS_DEFECTO = 60` (`lib/apu/rentabilidad.js:86`),
  redondeado a meses (`:347`, `Math.round(60/30)` = 2) y que el usuario puede cambiar en el editor
  (`lib/handlers/apu/editor.js:802,869`, `lib/apu/optimizador.js:278`). La ficha dice «la mora real que
  rentabilidad asume» — correcto — pero un dato medido por entidad NO debe sobrescribir mudo un
  `dso_dias` que el ingeniero fijó a mano: se propone, no se impone.
- «facturas de obra»: uymx no tiene tipo de contrato; hay que cruzar `id_del_contrato` con el contrato
  (jbjy-vk9h) para filtrar obra. Sin cruce el texto sería «facturas de la entidad», no «de obra».
- «Aquí» ≡ la entidad: por NIT suma hermanas (regionales) — `lib/seguimiento.js:23-24`; el diccionario trae
  `codigo_entidad`, que es la llave exacta; usarla o declarar «puede sumar hermanas».
- La mediana (47 días) es la forma correcta (no promedio); n = 23 facturas debe ir visible y con un mínimo
  declarado (la ficha lo dice: «solo con n suficiente y sin dato explícito»).
- NO VERIFICABLE aquí: cobertura real de `fecha_real_de_pago` en entidades de obra (sin red).

**Memoria.** § «Auditoría integral (19-ago-2026): 30 defectos reproducidos y corregidos» (línea de DSO de
150 días en la suite y la invariante Σ ingresos = valor del contrato para cualquier DSO): un DSO medido
tiene que seguir cumpliéndola. Ninguna sección decide sobre uymx.

**Costo.** «externo» correcto y con la misma restricción que D-65: nunca en la ruta de una petición de
precios (`rentabilidad.js` es puro y no debe llamar a la red); por clic o por índice nocturno.

**Lenguaje.** Pasa. Sugerencia: «En esta entidad, la mitad de las facturas se pagó en menos de 47 días
(23 facturas; el resto tardó más)» — «Aquí» solo es claro dentro de la tarjeta.

**¿Ya existe?** No como medición; existe como supuesto editable (`dso_dias`). El plan debe ALIMENTAR ese
parámetro existente, no crear un segundo «días de pago».

**Condiciones.** (a) sonda de cobertura por entidad antes de enseñar; (b) cruce con el contrato para
«de obra»; (c) llave `codigo_entidad` o declarar hermanas; (d) mínimo de facturas y «sin dato» explícito;
(e) se propone como valor sugerido de `dso_dias`, sin pisar el manual del usuario.

## D-67 · «Visto N veces en SECOP II» — con_condiciones

**Fuente.** `grep -rn visualizaciones lib/` → 0. `lib/proyeccion.js:38-61` (`CAMPOS`) no la incluye, y
`sync.js:68,560` pasa cada fila por `transformar`/`repartirDelta`, luego la columna muere en la ingesta.
Solo aparece en `docs/ATRACTIVIDAD.md § «5. Arquitectura de datos»,592,630` como pendiente («tres columnas a CAMPOS … + 1 full»).

**Verdad.** El corto («Visto 68 veces») dice el hecho, no el modelo: bien. Pero: mide miradas, no
oferentes ni interés de contratistas (la propia ficha lo admite). Si se pinta cerca de «~N empresas
suelen competir» hay que rotularlo para que no se lea como oferentes. Sin cobertura medida no puede salir.

**Memoria.** § «Fase 9 · La portada, la manifestación de interés y los días hábiles (ago 2026 · plan v4)»
(línea 4185): `proveedores_que_manifestaron = 0 en toda la muestra` — el precedente exacto de una columna
que un cuaderno externo mostraba poblada y en Detekta llegó vacía. La condición «medir tras la full» está
justificada por esa cicatriz.

**Costo.** «sync» es correcto pero incompleto: CAMPOS + una FULL (los registros anteriores no la traen,
`lib/proyeccion.js:57-60`) + censo con `lib/columnas_historicas.censarColumnasHistoricas`.

**Lenguaje.** Pasa.

**¿Ya existe?** No.

**Condiciones.** (a) añadir a `CAMPOS` y correr full; (b) censo de cobertura (% no vacío en abiertos);
(c) rotular «vistas en la plataforma», nunca «interesados»; (d) `null` si vacío, no «Visto 0 veces».

## D-68 · «Ver cómo se calcula» — confirmado

- Botón: `public/app.js:2104-2105` (texto literal «Ver cómo se calcula», `data-id`), delegado en `:3443`
  → `cargarDesglose` (`:3250`) → `GET /api/inteligencia?op=probabilidad&id_proceso=…&perfil=…`.
- Router: `api/inteligencia.js:21` (`probabilidad: "probabilidad"`) → `lib/handlers/inteligencia/detalle.js:67`
  (`desgloseDeProceso`). Op de lectura: costo «clic» correcto.
- El supuesto de rivales cuando la celda pinta «—» (app.js:2074, «supuesto: 5 rivales»): en el desglose
  viaja en `datos_entrada.fuente` («supuesto conservador de 5 rivales», `lib/probabilidad_desglose.js:221`)
  y en el `fundamento` del paso 1 (`:237`), que `pintarDesglose` (`app.js:3192-3245`) lista en la tabla
  de pasos (`:3214`). Confirmado por lectura del código de ambas puntas; el 401 y el HTML del muro del edge
  se leen por `leerJson` (`:3270-3276`).
- Memoria: § «Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)» y
  § «Puertas, probabilidad y valor esperado (ago 2026)»: el desglose es la explicación auditable; el
  botón no la contradice. Ojo: la ficha cita `p_ganar_detalle` como fuente; el botón NO lee
  `p_ganar_detalle` (eso es el `title` de la celda, `:2017-2029`) sino la respuesta de `op=probabilidad`.
  Corrección de fuente: «op=probabilidad (desgloseDeProceso)».
- Lenguaje: pasa. «probabilidad» solo aparece en el nombre del op, no en pantalla.

## D-69 · «Avisar que le interesa» — confirmado (con matiz de conteo)

Reproducido con `manifestacionDeFila` real y el `chipManifestacion` extraído (`v_d65_d72.salida.txt`):

| caso | estado / confirmada | chip |
|---|---|---|
| apertura 11-sep, hoy 14-sep, sin pliego | por_confirmar / false | «verifique HOY si sigue abierto» (rojo) |
| hoy 20-sep | vencida / false | «plazo vencido» (gris) |
| pliego 15-sep, hoy 14-sep | abierta / true | «vence mañana · hasta martes 15 de septiembre» (rojo) |
| pliego 14-sep, hoy 14-sep | por_confirmar / true | «vence HOY (lunes 14 de septiembre) · puede haber cerrado ya» |
| pliego 16-sep | abierta / true | «3 días de oficina · hasta miércoles 16 de septiembre» (ámbar) |
| sin apertura | sin_fecha | «fecha por confirmar en SECOP II» (ámbar) |
| licitación pública | null | (nada) |

- La fecha del pliego gana (`origen: cronograma`, `confirmada: true`) y sin ella `quedan_habiles`/`dias_calendario`
  viajan en `null` (`lib/manifestacion.js:298-327`): no hay cuenta atrás sin fecha confirmada. El techo
  legal viaja como `plazo_maximo_habiles` y el chip nunca lo pinta como vencimiento; el aviso dice «MÁXIMO».
- Matiz: la ficha habla de «los cinco estados de hoy». El servidor publica CUATRO estados
  (`abierta | por_confirmar | vencida | sin_fecha`) y el chip tiene SIETE redacciones (las de la tabla, más
  «el plazo puede cerrar el …» para `abierta` sin confirmar). No es un defecto; la ficha debe decir
  «cuatro estados, siete textos» para que nadie busque un quinto estado.
- Memoria: § «⚠️ EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS: TRES ES EL TECHO (20-ago-2026)» (cumplida
  al pie de la letra), § «Mis procesos como pestaña, centro de alertas y manifestación de interés (18-ago-2026)».
- Costo: petición; `manifestacionDeFila` se llama por fila en `lib/filtros_lista.js:229` (listado) y en
  `lib/seguimiento.js:367,427`. Correcto.
- Lenguaje: pasa.

## D-70 · Zona — confirmado

`evaluarZona` real (`lib/accesibilidad.js:103-214`), `BASE_DUENO = ["Bogotá","Ibagué"]`:

| fila / base | resultado |
|---|---|
| Tolima / Ibagué | cerca, 0 km, «Su zona (Ibagué)», 3 puntos |
| Tolima / Bogotá | cerca, ~200 km, «Cerca · ~200 km de Bogotá» |
| Tolima / sin base | sin_dato, km null, «Distancia sin calcular: no sabemos desde dónde opera», 2 puntos |
| Cauca / sin base | sin_dato, `verificar_orden_publico: true`, 1 punto |
| Amazonas / Bogotá | «Acceso difícil», km null |
| Arauca / Bogotá | media (por aeropuerto), 710 km, «Lejos, pero se llega volando», orden público true |
| sin departamento o «Xyz» | «Zona sin clasificar», 2 puntos (no se descarta) |

- Los «~120 km de Bogotá» del ejemplo corresponden a Meta (`data/accesibilidad_departamentos.json:32`,
  `km_bogota: 120`), no a Tolima (200): el ejemplo es válido, pero la ficha lo mezcla con Purificación.
  Sugerencia: «Cerca · ~200 km de Bogotá» si el ejemplo es Tolima desde Bogotá, o «~120 km» con Meta.
- «verifique la seguridad de la zona» lo añade el navegador como sufijo por la bandera
  (`public/app.js:1419`), no la etiqueta del servidor: coherente con B2b-H6.
- Sin dato ≠ cero: `km: null`, nunca 0; la banda sin dato es la media (2 puntos), nunca la peor.
- Memoria: § «Accesibilidad de la zona · el costo de LLEGAR ordena (ago 2026)» (estimado, «~», solo
  ordena, orden público = «verifique», jamás veredicto) — cumplida. § «Lote «zona y RUP en PDF» de la
  consultoría del 4-sep · M-SEG-10, M-INF-01 (6-sep-2026)» (base del perfil).
- Costo: petición; `listar.js:625` (`zona: evaluarZona(l, baseZona)`) por fila. Correcto.
- Lenguaje: pasa.

## D-71 · Aviso de competencia baja — con_condiciones

- Función y umbral: `public/app.js:1464-1475` (`UMBRAL_SENAL_11 = 2`, `conBase` exige `total_procesos > 0`,
  `nivel !== "sin_dato"` y promedio numérico). Reproducido: `null`, `{}`, sin_dato, promedio `null` → "";
  1,44 → «1,4 oferentes»; 1,96 → «2 oferentes»; 2 → "" (el umbral decide con la cifra exacta, no con la
  redondeada: bien). Solo en viables (`:2180`, `noViable`).
- `competenciaDe` sin índice devuelve `{nivel:"sin_dato", promedio_oferentes:null, total_procesos:0}`
  (`lib/indice_competencia.js:1213-1232`, `MIN_PROCESOS = 5`) → el aviso calla. Sin dato no urge.
- **La ficha afirma «misma cifra y redondeo que D-13» y es FALSO.** La celda de la tarjeta redondea a
  entero: `celda(`~${fmtNum.format(Math.max(1, Math.round(compiten.promedio)))}`…)` (`app.js:2073`,
  blame d829d87 6-sep-2026) y `cuantosCompiten` (`:1811-1821`). Reproducido (`v_d71_celda.salida.txt`):
  promedio 1,44 → celda «~1 empresa suele competir» / aviso «1,4 oferentes en promedio»; 1,5 → «~2
  empresas» / «1,5 oferentes»; 1,96 → «~2» / «2». El informe D-experimentado (línea 174) dice «sin
  Math.round (app.js:2074)»: la línea 2073 tiene el `Math.round`. Dos cifras y dos sustantivos («empresas»
  vs «oferentes») para el mismo hecho, a dos centímetros. No decide nada (el umbral usa el valor crudo),
  pero contradice la ficha.
- Memoria: § «Puntos 7 y 10 de la hoja de ruta (ago 2026)» — cumplida en las tres decisiones (color
  intacto, umbral literal 2, `conBase`).
- Costo: petición (`competencia_entidad: compDe(l)` en `listar.js:853`). Correcto. Fuente
  `competencia_entidad` existe.
- Lenguaje: pasa.
- Condiciones: (a) corregir la ficha: la celda muestra el entero «~N» y el aviso un decimal; (b) decidir
  UNA presentación (sugerido: el aviso repite el entero de la celda «~1 empresa» o la celda pasa a un
  decimal), y un solo sustantivo; (c) con 1,96 el aviso dice «2 oferentes» bajo un umbral «< 2»: si se
  mantiene el decimal, `maximumFractionDigits: 1` ya lo cubre salvo en 1,95-1,99, donde conviene «casi 2».

## D-72 · Aviso rojo de cierre — confirmado

- `avisoCierre` (`app.js:1477-1485`): reproducido `null`/`undefined`/`-1`/`3` → ""; 0 → «Cierra HOY: solo
  cuenta la oferta en estado «Presentada»…»; 1 → «Cierra mañana: presente la oferta HOY…»; 2 → «Presente la
  oferta a más tardar mañana…». `NaN` sí pasaría la guarda (`NaN > 2` es false), pero `diasParaCierre`
  (`:1427-1431`) devuelve `null` para fecha inválida o resultado no finito, y es la ÚNICA fuente de `dias`
  (`:2137`, alimenta chip `:2173` y aviso `:2181`): el `NaN` no puede llegar. Solo en viables (`:2181`).
- Memoria: § «Las dos alarmas del calendario (ago 2026)» — cumplida (visible, ≤ 2 días, no en no viables,
  `null` no urge, un solo cálculo con la resta de 5 h de Colombia).
- Fuente `fecha_cierre` existe (`cierre` de la fila); costo petición correcto.
- Lenguaje: pasa. Nota menor: «Atención: Cierra mañana» lleva mayúscula tras dos puntos; es el estilo de
  todos los avisos (`:1485`), no un defecto.
