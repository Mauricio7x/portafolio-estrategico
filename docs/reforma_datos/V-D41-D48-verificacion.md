# Verificación adversaria · D-41 … D-48 (13-sep-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Postura: refutar. Un dato sobrevive solo si el árbol demuestra que es cierto, calculable y coherente con lo decidido.
Todo lo afirmado lleva ancla `ruta:línea` y reproducción ejecutada con las funciones reales
(`plan/v_d41_d48.js` → `plan/v_d41_d48.salida.txt`, más los `node -e` citados). Árbol sin tocar
(`git status --short` vacío al terminar). Sin corrida de la suite completa.

Fila sintética de todas las reproducciones (obra por código `V1.72141000`, perfil `helder`,
presupuesto 6.365.863.680, cierre 15-oct-2026, 6 meses, licitación pública, hoy = 13-sep-2026).

| id | veredicto | en una línea |
|---|---|---|
| D-41 | con_condiciones | la suma de CRPC existe por fila, pero «la K del perfil» no es una cifra: depende del presupuesto de cada proceso (reproducido 5.799 / 4.471 / 3.807 MM); sin cuantía el CRPC es 0 y sumaría un cero |
| D-42 | refutado | `por_anio.n` NO cuenta «obras adjudicadas»: cuenta procesos del histórico ancho (servicios+obra) CON dato de oferentes; la memoria ya prohibió ese sustantivo (B9a-H1) |
| D-43 | con_condiciones | «el primer paso con fecha ≥ hoy» es SIEMPRE «Lea primero las causales…» fechado hoy, cualquier día (reproducido 5 fechas): la regla tal cual pinta una constante |
| D-44 | con_condiciones | la cifra es real (318.293.184, reproducida), pero «solo obra» y «con tipo desconocido no se pinta» contradicen la regla única del árbol (suministro y tipo null → SÍ se cobra) |
| D-45 | confirmado | `cruza_diciembre` true/false/null reproducidos; sin plazo no se pinta; el cálculo es inline en `guiaDe` y hay que extraerlo, no copiarlo |
| D-46 | con_condiciones | `modalidadEnLlano` existe y la explicación viaja ya en el expediente; el diccionario pesa 2.101 B (no ≈1 KB) y la clave «otra» funde literales distintos: la fila debe seguir llevando el literal |
| D-47 | con_condiciones | calculable desde la foto (entidad, nit_entidad) y `desenlaceDe`; listar NO lee hoy los guardados (hace falta un GET nuevo) y la identidad de entidad va por `claveCanonica`, jamás por NIT |
| D-48 | con_condiciones | solo el perfil del dueño tiene `socio` congelado; `recomendacion.socio` no existe en «solo»/«ninguna_sirve»; guardados anteriores al 11-sep van sin consejo; la regla de ≥3 y `por_estado` ya existen y hay que llamarlas |

---

## D-41 · Capacidad comprometida si gana lo que marcó «me presenté»

**Fuente.** `p2_k.crpc` existe: `lib/puertas.js:192` (`crpc: Math.round(crpcVal)`), calculado por
`lib/rup.cargaK` (`lib/puertas.js:129`). Estados del seguimiento `lib/seguimiento.js:45-46`
(`presentado` = «Me presenté»). Censo confirmado: el único «comprometido» del árbol es el del
COMPETIDOR (`lib/seguimiento.js:26-29,529`) y `capacidad.js:82` (SCE del perfil).

**Reproducido.**
```
D-41 p2_k helder (6.366 M): crp 4470921189 · crpc 6365863680 · pasa false
D-41 p2_k sin cuantía → crpc 0, sin_dato true            (lib/puertas.js:170)
D-41 p2_k con K sin dato → crp null, crpc 6365863680      (lib/puertas.js:157)
D-41 p2_k perfil desconocido → crp 0, crpc 0              (lib/puertas.js:307)
K(MM) por presupuesto(MM): [500→5799, 2000→5799, 4000→5135, 6000→4471, 8000→4471, 20000→3807]
evaluarPuertas µs/fila: 137
```
**Verdad.**
1. «Los $4.471 M que puede facturar» es la K de helder EVALUADA con el presupuesto de UN proceso
   (`lib/capacidad.js:131-136`: `factorE(expSMMLV, presupuestoSMMLV)` entra en la K). Con varios
   procesos no hay «la K»: hay una por proceso. La ficha compara una suma con una cifra que no está
   definida para el conjunto. Definición coherente y conservadora, si se quiere conservar el dato:
   la K más baja del conjunto, que por monotonía de `factorE` es la del guardado de mayor cuantía
   (reproducido: K no crece con el presupuesto). Debe DECIRSE.
2. «Sin dato» → 0: un guardado sin cuantía publicada lleva `crpc: 0` con `sin_dato: true`
   (`lib/puertas.js:170`) y una suma ingenua lo cuenta como cero. Hay que excluirlo y declarar
   «N sin cuantía publicada, no sumados». Regla dura «Sin dato ≠ cero».
3. Un guardado que ya no está en el corpus (`en_corpus:false`, `lib/seguimiento.js:462`) no tiene
   puertas (`guiaDe` solo las calcula con fila viva, `lib/guia_proceso.js:233-236`): tampoco suma y
   se declara.
4. La K de helder NO «hereda el se asume 0»: el perfil trae `sce` con dos contratos
   (`lib/perfiles.js`, reproducido) — el «se asume 0» sale para genesis/prodiac (log reproducido
   `lib/capacidad.js:75`). La frase de la ficha vale por perfil, no en general.
5. Con K sin dato (perfil aproximado) `crp` es null: no hay comparación, no se pinta.
**Memoria.** «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)» (el
«valor comprometido» del competidor jamás se rotula capacidad; la prueba de jerga prohíbe
«capacidad residual» en app.js — `tests/e2e.js:3850,4674`), «Puertas, probabilidad y valor esperado
(ago 2026)».
**Costo.** «petición» es real pero hoy la lista de Mis procesos NO calcula puertas por guardado
(`alertasDelPerfil` con `conGuia:false`, `lib/handlers/perfil/seguimiento.js:268-279`): hay que
llamar `evaluarPuertas` por guardado en «presentado» (137 µs/fila medidos; con 200 guardados
≈ 27 ms) con el perfil cargado (`contextoGuia`, `:184-199`).
**Lenguaje.** El corto es de usted y sin jerga. Propuesta que declara la K elegida: «Si gana todo lo
que marcó «me presenté», compromete $9.200 M; hoy puede facturar $4.471 M en un contrato de ese
tamaño: no le caben todas (2 sin cuantía publicada no se suman)».
**¿Ya existe?** No. La cuenta por fila sí: `lib/puertas.js:120` (P2), llamarla.

## D-42 · Cuántas obras adjudica al año esta entidad

**Fuente.** `competencia_entidad.por_anio` viaja: `lib/indice_competencia.js:382-386`
(`registroPublicado`), `extraDe` en `competenciaDe` (`:1220,1231`), `listar.js:853`
(`competencia_entidad: compDe(l)`). La tarjeta no lo pinta: `public/app.js:2133-2296` solo usa
`bandaCompetencia`/`avisoCompetencia`; `por_anio` se lee en el detalle de entidad y en el tablero
(`public/app.js:3093,8792`).
**Reproducido.** `registroPublicado({procesos:5, por_anio:{2025:{n:25,suma:100},2026:{n:2,suma:30}}})`
→ `{2025:{n:25,promedio:4}, 2026:{n:2,promedio:null}}`, `min_procesos 5`. El conteo se publica
siempre; el promedio solo con base.
**Verdad — refutado en el sustantivo.**
1. `n` se alimenta DESPUÉS de descartar los procesos sin dato de oferentes
   (`lib/indice_competencia.js:535-549`: `if (oferentes == null) return;` antes de `a.n++`). No es
   «adjudicó 25 obras»: es «25 procesos con oferentes publicados».
2. El histórico es ANCHO: `admisibleParaIngesta` admite servicios y obra (segmentos 70-95,
   `lib/handlers/procesos/sync.js:37-40`; MEMORIA «Ingesta ancha / juicio fino y pertinencia (jul
   2026)»). «Obras» es falso: cuenta también consultorías, interventorías y servicios.
3. El año sale de `fecha_adjudicacion` o, a falta, de la fecha de PUBLICACIÓN
   (`lib/indice_competencia.js:740-744`): «adjudicó en 2025» puede ser «publicó en 2025».
4. La memoria ya cerró exactamente este error: «Remates «R4-remates-inteligencia» de la ola 2 ·
   B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)» — «“Adjudicados” no es “con dato de oferentes”…
   dos cosas distintas no pueden llevar nombres parecidos, y menos el nombre de la otra»; el pie
   del tablero pasó a decir «los procesos del histórico en que se publicó cuánta gente se presentó».
**Salvable solo reescrito:** «En 2025 esta entidad tuvo 25 procesos con oferentes publicados (10 en
lo que va de 2026), según lo que sigue la aplicación». Con esa redacción deja de decir «obras» y
«adjudicó», que es lo que el beneficio prometía («una entidad que adjudica 25 obras al año»): el
beneficio no lo sostiene el dato.
**Costo.** Nada de bytes: cierto. **Lenguaje.** Sin jerga; el fallo es de verdad, no de registro.

## D-43 · Siguiente paso

**Fuente.** Paso a paso en `lib/guia_proceso.js:434-481` (`paso(...)`), ordenado por fecha
(`:475-481`). Entradas reales del bloque: `hoy`, `manif`, `cierre`, `cerrado`,
`modalidad.traslado_habiles` — extraíble a `pasosDe`.
**Reproducido.**
```
pasos: 2026-09-13 Lea primero… · 10-07 Pida la garantía · 10-08 Envíe observaciones · 10-14 Cargue y PRESENTE · 10-14 Verifique «Presentada» · 10-15 Cierre · null Traslado · null Adjudicación
primer paso con fecha >= hoy, evaluado el 13-sep, 1-oct, 9-oct, 14-oct y 15-oct → SIEMPRE «Lea primero las causales…» fechado ese mismo día
JSON {cuando,titulo} del primer paso: 97 B     guiaDe entera: 667 µs/fila (300 corridas; sin perfil 261 µs)
```
**Verdad.** `paso("Lea primero…", hoy, …)` se emite SIN condición y fechado HOY
(`lib/guia_proceso.js:434`), y el orden lo deja primero. La regla de la ficha («primer paso con
fecha ≥ hoy») devuelve por tanto la MISMA frase genérica en toda tarjeta, todos los días, hasta el
cierre. La ficha dice «el primer día el paso es genérico»: es todos los días. El ejemplo del corto
es precisamente esa constante. Para que el dato diga algo hay que saltar ese paso (o tomar el primer
paso fechado DESPUÉS de hoy, que sí cambia: garantía → observaciones → presentar → cierre) y, cerrado,
«El proceso ya cerró» (`:471`). Con manifestación: el paso «Avise que le interesa» solo sale con
`manif.aplica` (`:435-438`) y el chip de la tarjeta ya lo dice (`public/app.js:1498,2174`) — omitirlo
es coherente. Los 473 µs de la ficha son del mismo orden que los 667 medidos aquí; 20 filas ≈ 13 ms.
**Ya existe (parcial).** El expediente calcula `proximoPaso` = primera fecha ≥ hoy
(`public/app.js:4267-4268`) — con el mismo sesgo: siempre hoy mientras el proceso esté abierto.
Si se extrae `pasosDe`, ambos deben llamarla y saltar el paso de lectura.
**Memoria.** «La guía le daba al contratista una lista de tareas con las fechas hacia atrás
(12-sep-2026)» (el orden por fecha es estable y no se permuta a mano; una extracción debe conservar
ese bloque de orden), «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos
(3-sep-2026)» (capa pura que no reimplementa juicios).
**Costo.** Petición: cierto si `pasosDe` recibe solo `{cierre, manif, modalidad, hoy}`;
`manifestacionDeFila` y `modalidadEnLlano` ya se calculan por fila en listar (`clasificar`).
**Lenguaje.** De usted, sin jerga. «Guárdelo para el paso a paso completo ›» como botón es
coherente con «Ninguna pulsación sin respuesta visible».

## D-44 · Le descontarán el 5 % de obra pública

**Fuente.** `CONTRIBUCION_PCT` y `aplicaContribucion` en `lib/ganancia.js:111-118,136-138`
(`TIPOS_SIN_CONTRIBUCION = ["interventoria","consultoria"]`); la guía los importa
(`lib/guia_proceso.js:94`) y calcula `dinero.contribucion_obra_5pct_cop` (`:546`) y el consejo
`contribucion_5` (`:501-502`). Norma citada en el árbol: Ley 418/1997 art. 120, Ley 1738/2014 art.
8 (`lib/guia_proceso.js:80-93`). No releída desde aquí: sin fuente abierta con fecha de hoy.
**Reproducido.**
```
contribucion_obra_5pct_cop = 318293184 (obra, 6.365.863.680)   consejo: «cerca de $318 millones»
aplicaContribucion(null,'suministro','servicios','otra','consultoria','interventoria') → [true,true,true,true,false,false]
suministro (tipo_trabajo 'suministro') → 318293184 · consultoría → null · sin perfil (tipo null) → 318293184 · sin cuantía → null
```
**Verdad.** La cifra y la tarifa son las del árbol. Pero dos frases de la ficha contradicen la regla
única: (a) «Solo obra» — el árbol cobra también suministro, servicios, «otra» y tipo DESCONOCIDO
(«ante la duda, no prometer», `lib/ganancia.js:120-123`); (b) «Con tipo de trabajo desconocido no
se pinta» — el árbol con tipo null SÍ calcula la cifra. Si la tarjeta añade su propia condición
«solo obra», nace la tercera divergencia que MEMORIA «La contribución del 5 % se cobraba siempre, y
la alerta invitaba a cobrarla dos veces (13-sep-2026)» acaba de retirar: el mismo contrato saldría
con contribución en el expediente y sin ella en la tarjeta. Hay que LLAMAR `aplicaContribucion`
tal cual. Consecuencia de lenguaje: en un suministro «le descontarán el 5 % de obra pública» es una
afirmación que el árbol no sostiene como certeza; el consejo del expediente lo redacta como «Sume la
contribución…» (imperativo de prudencia). Propuesta: obra → «Le descontarán el 5 % de obra pública:
≈ $318 M sobre el presupuesto»; otros tipos no exentos → «Cuente con el 5 % de obra pública (≈ $318 M)
salvo que el pliego lo excluya». Base: «sobre el presupuesto» declara bien que la base real es su
oferta. Sin cuantía → null, no se pinta (correcto).
**Costo.** Petición trivial: `tipo_trabajo` ya viaja por fila (`listar.js:780`, `clasificar(l).tipo`).
**Ya existe.** En el expediente (`lib/guia_proceso.js:501,546`, pintado con la guía). La tarjeta
debe llamar las mismas dos constantes/funciones, nunca escribir un `5`.
**Memoria que toca.** La sección del 13-sep citada; «La guía «Don Héctor» de cada proceso guardado y
el dictamen en Mis procesos (3-sep-2026)».

## D-45 · La obra cruza diciembre

**Fuente.** `obra.plazo.cruza_diciembre` (`lib/guia_proceso.js:266,284-287`) desde `cierre` +
`plazoMesesDe(l)` × 30 días; consejo `reajuste` (`:532-533`). `duracion`/`unidad_de_duracion` están
en la proyección activa (`lib/proyeccion.js:44`), así que listar los tiene por fila.
**Reproducido.**
```
cierre 15-oct + 6 meses → true · sin plazo → {meses null, cruza null} y sin consejo · cierre 30-sep + 2 meses → false (fin ≈ 29-nov) · cierre 15-nov + 90 días → true · cierre 10-ene + 14 meses → true
```
**Verdad.** Sin plazo publicado → null → no se pinta: cumple «sin dato ≠ cero». Es optimista de
verdad: toma el cierre como inicio (el acta llega después) y meses de 30 días; el caso «30-sep + 2
meses → false» es un falso negativo probable en la realidad y la ficha lo declara. El consejo del
expediente además salta con plazo > 12 meses aunque no cruce (`:532`); la tarjeta solo usa el
booleano: coherente, no contradice.
**Condiciones.** (1) El cálculo vive inline dentro de `guiaDe` (`:284-287`): extraerlo a una función
que `guiaDe` LLAME y la tarjeta también, no copiarlo. (2) Decir en el plegado «contado desde el
cierre; con acta de inicio posterior cruza igual o más». (3) Texto «en enero suben el salario mínimo
y los materiales» es el del consejo existente (`:533`): reutilizar la redacción.
**Memoria.** «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos
(3-sep-2026)» (plazo = `plazoMesesDe`, una sola regla).
**Lenguaje.** De usted, sin jerga, hecho y no modelo. **Costo** petición: cierto.

## D-46 · Qué significa esa modalidad, en llano

**Fuente.** `modalidadEnLlano` (`lib/guia_proceso.js:121-160`, exportada `:694`): 7 modalidades con
nombre + `otra` (nombre = literal del dataset) + `desconocida`. `modalidad_de_contratacion` viaja
por fila y la tarjeta ya pinta el literal como chip (`public/app.js:2199`, D-23).
**Reproducido.**
```
claves: minima, menor_cuantia, subasta, seleccion_abreviada, concurso, licitacion, regimen_especial, otra, desconocida
tamaño JSON del diccionario {clave:{nombre,explicacion}}: 2101 B
otra («Contratación directa») → nombre «Contratación directa», explicación genérica
```
**Verdad / condiciones.** (1) El diccionario pesa 2,1 KB, no «≈ 1 KB». (2) La clave `otra` funde
literales distintos y su `nombre` es el literal de la fila: un diccionario por clave pierde el
nombre; la fila debe seguir llevando el literal (ya lo hace) y la clave, y el diccionario lleva solo
la explicación. (3) La explicación de menor cuantía interpola `PLAZO_MANIFESTACION_HABILES` (techo
legal, no plazo): el texto ya lo dice («como máximo … y suele ser menos») — se conserva tal cual.
(4) Certeza «publicado»: la modalidad sí; la explicación es redacción propia — decirlo como
«explicación de la aplicación». (5) Licitación: «el método de puntuar el precio se sortea» es lo que
dice el árbol (`:150`); no se contrastó con norma vigente desde aquí.
**Ya existe.** En el expediente: `como_lo_adjudican.explicacion` (`lib/guia_proceso.js:275`,
pintado en `public/app.js:4238` y `public/expediente.js:407`). La tarjeta debe llamar la misma función.
**Memoria.** «La guía «Don Héctor» de cada proceso guardado y el dictamen en Mis procesos
(3-sep-2026)» («cómo lo adjudican explicado por modalidad»); «Mis procesos como pestaña, centro de
alertas y manifestación de interés (18-ago-2026)» (la regla de la manifestación es UNA).
**Costo** petición: cierto (una vez por respuesta). **Lenguaje.** De usted, sin jerga.

## D-47 · Su historial con esta entidad

**Fuente.** Foto guardada con `entidad` y `nit_entidad` (`lib/seguimiento.js:321-322`), estado y
`desenlaceDe` (`:301-306`). Reproducido: `fotoDe(base)` → `{entidad:"ALCALDÍA DE IBAGUÉ",
nit_entidad:"800113389"}`; «No Definido» → `nit_entidad null`; `desenlaceDe(presentado|descartado|
ganado|perdido|interesa)` → `[null, null, true, false, null]`.
**Verdad.** «Se presentó 2 veces» = guardados en presentado+ganado+perdido; «ganó 1» = ganado; un
desenlace sin marcar no es derrota (coherente con F0-7). Correcto si se cuenta así y se dice «según
lo que marcó en Mis procesos».
**Condiciones.** (1) Identidad de la entidad: NO por NIT (regionales comparten NIT; MEMORIA «Identidad
de la entidad: dos formas de confundir a dos entidades (ago 2026)»): usar `claveCanonica` de
`lib/indice_competencia`, la misma que `competenciaDe` aplica a la fila. (2) Costo: «misma ruta que
los costos por proceso» es inexacto — `cargarCostosPorProceso` lee borradores de APU
(`lib/baja_maxima.js:38-46`), no guardados; listar no lee hoy `seguimiento:{perfil}` y
`leerGuardados` no está exportado (`lib/handlers/perfil/seguimiento.js:47,690-697`): hace falta UN
GET nuevo de Redis por petición, solo con token, best-effort (fallo → sin dato, lista igual).
(3) Solo con ≥ 1 guardado con esa entidad en presentado/ganado/perdido; con 0 no se pinta nada
(no «0 veces»). (4) El competidor ya tiene su ficha ante la entidad por hgi6/p6dx
(`lib/seguimiento.js:516-523`): no mezclar las dos cuentas ni los nombres («ante_esta_entidad»).
**Memoria.** «Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)», «F0-7 · La
predicción que se le enseñó se CONGELA al guardar (24-ago-2026)» (qué es desenlace).
**Lenguaje.** De usted, sin jerga. **Costo** petición: real con la condición (2).

## D-48 · Con quién ha ganado

**Fuente.** `socio` congelado al guardar (`lib/handlers/perfil/seguimiento.js:168-181`,
`:491,531`), publicado por `enriquecer` (`lib/seguimiento.js:467`) y retirado de la lista por
`aLigero` (`:497-504`); `recomendacion` de `lib/socio_por_proceso.js:320,331,400-406`.
**Reproducido.** `socioPorProceso(dueño)` → `{tipo:"con_socio", socio:"prodiac", nombre:"PRODIAC LTDA",
cierra_todo:true, reparto…}`; `ID_DUENO = "helder"`, candidatos `["genesis","prodiac"]`;
`PERFILES.genesis.nombre = "Génesis Ingeniería y Construcción GIC SAS"` (`lib/perfiles.js:118`).
**Verdad / condiciones.** (1) `congelarSocio` devuelve null para todo perfil que no sea el dueño
(`:173-174`): el dato solo existe para helder — «para: experimentado» debe leerse «solo el dueño»;
para un RUP subido o un consorcio no hay nada que agrupar y no se pinta. (2) `recomendacion.socio`
solo existe en `tipo:"con_socio"`; «solo» es `{tipo:"solo", participacion_suya:100}` y
«ninguna_sirve» no trae socio: agrupar por `tipo` y, dentro de con_socio, por `socio`. (3) Guardados
anteriores al 11-sep-2026 viajan con `socio: null` (`lib/seguimiento.js:461-467`): cubeta «sin
consejo guardado», declarada, nunca contada como «solo». (4) «Presentadas 12» tiene que ser la
MISMA magnitud que «Ganó 1 de 3 presentadas» (ganado+perdido+presentado, `public/app.js:4326-4329`)
y respetar el mínimo de 3 (`:4330`); el conteo `por_estado` ya lo hace el servidor
(`lib/handlers/perfil/seguimiento.js:290-294`) y el agrupado por socio debe calcularse allí mismo
sobre `procesos` ANTES de `aLigero` (que quita `socio`). (5) Lo que se cuenta es el CONSEJO del día
en que guardó, no con quién consorció: la ficha lo declara; el corto debe decirlo sin ambigüedad.
Nombre corto «Génesis» no existe como campo: si se usa, sale de una tabla declarada, no del `nombre`.
**Memoria.** «El veredicto de socio se lee AL GUARDAR, y la tarjeta queda en una línea
(11-sep-2026)», «Con cuál de mis socios conviene ESTE proceso · `lib/socio_por_proceso` (11-sep-2026)»,
«Lote «B7a-tablero-mis-procesos» de la consultoría del 4-sep · M-DGF-09, M-DGF-11, M-DGF…» (la regla
de ≥ 3 y «una palabra por concepto en la misma caja»).
**Lenguaje.** Propuesta: «Presentadas 12 · ganadas 3 (en 2 el consejo guardado decía Génesis; en 1,
ir solo) · 4 sin resultado todavía».
**Costo** petición: cierto (lo calcula `alertasDelPerfil` en el GET de Mis procesos).

---
Ficheros: `plan/v_d41_d48.js`, `plan/v_d41_d48.salida.txt` (reproducciones), este informe.
