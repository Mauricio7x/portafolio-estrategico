# D · Lente «dueño» · La tarjeta que ayuda a adjudicar más, y con quién ir (13-sep-2026)

> Para: dueño · Estado: propuesta fechada (plan en cuatro sesiones) · Sustituido por: —
> Árbol: `main` en `3482415`, sin modificar (`git status --short` vacío antes y después). Evidencia: los seis informes A1-A6 de este mismo directorio (leídos enteros) y cuatro reproducciones propias ejecutadas hoy (§ 10.3). Nada de lo que aquí se afirma sobre el código sale de memoria: lleva ancla `ruta:línea` o el nombre del informe y su sección.

## 0. Qué es esto y cómo leerlo

**Encargo.** Diseñar la reforma de los datos que la tarjeta de Licitaciones y sus pantallas de detalle enseñan, mirándolo como el dueño de Detekta: **Helder** (persona natural, microempresa, base en Ibagué) con dos socias candidatas, **Génesis** (microempresa) y **PRODIAC LTDA** (gran empresa), y un objetivo declarado: **adjudicar la mayor cantidad de procesos**, eligiendo bien a cuáles presentarse y con quién.

**Cómo se verificó.** (1) Lectura íntegra de A1 (inventario de la tarjeta), A2 (perfil del competidor), A3 (recomendador de socio), A4 (datos no explotados), A5 (necesidades del ingeniero) y A6 (cerraduras y cola viva); (2) censos acotados en el árbol para los puntos que ningún informe cubría (§ 10.3); (3) dos guiones propios con las funciones REALES: `d_dueno_repro.js` (puertas y recomendador de socio para Purificación en cuatro escenarios de anticipo) y `d_dueno_tarjeta.js` (el handler real `op=listar` contra el mock de Upstash de la suite y la función real `tarjeta()` de `public/app.js`, para pintar la tarjeta DE HOY del proceso de la captura en sus tres variantes). Salidas en `d_dueno_repro.salida.txt` y `d_dueno_tarjeta.salida.txt`.

**Convención.** Cada dato lleva un id `DUE-nn` y una ficha con la estructura del dueño: **CORTO** (la frase tal como saldría en pantalla) · **CONCISO** (qué es, de dónde sale, cómo se calcula) · **EN QUÉ BENEFICIA** · **EN QUÉ AFECTA**; más fuente, certeza (publicado / medido / calculado / estimado / sin fuente), costo (sync / petición / clic / externo), para quién, necesidad de A5 que atiende y tanda sugerida. Las citas a la memoria van por TÍTULO de sección.

---

## 1. La mirada del dueño: qué decide, y los cuatro hechos del árbol que la condicionan

El dueño no decide «si el modelo dice 0,48»: decide **(a) a cuántos procesos puede presentarse este mes, (b) con quién, (c) cuáles tienen más opción real y (d) cuáles son pérdida de tiempo**. Cada decisión tiene un dato que la sostiene y hoy la tarjeta lo tiene a medias:

| Decisión del dueño | Qué dato la sostiene | Qué hay hoy (con ancla) | Qué falta |
|---|---|---|---|
| (a) ¿Me cabe? ¿Cuántos me caben a la vez? | Cupo (K) frente a lo que exige la obra, con el anticipo y con los contratos que ya tiene | Puerta P2 con cifra (`lib/puertas.js:120`), K sin descontar contratos en ejecución (`lib/capacidad.js:70-74`: «se asume 0, capacidad posiblemente optimista», reproducido en A5 § 7.4 y en `d_dueno_repro.js`) | Cuánto cupo le queda DESPUÉS de esta obra (para Purificación con anticipo del 30 %: **$14.816.609, el 0,33 % de su K**, ejecutado); cuánto consumirían los procesos que ya guardó; los contratos en ejecución reales (§ DUE-41, DUE-43) |
| (b) ¿Solo, con Génesis o con PRODIAC? | El recomendador de socio, por proceso | Se calcula por fila servida y se recorta a `{tipo, cierra_todo}` (A3 § 0); la tarjeta calla el nombre y en «solo» no dice nada (`public/app.js:2016-2020`) | El nombre, el reparto y —clave para este dueño— la RAMA del anticipo: con el anticipo sin publicar, hoy la tarjeta dice «solo» mientras la puerta dice «solo cabe con anticipo ≥ 30 %» (ejecutado, § 6) |
| (c) ¿Dónde tengo opción real? | Cuántos se presentan, quién gana y con qué baja, en ESTA entidad | Banda de competencia y baja de mercado (A1 #14, #24); el perfil del competidor existe pero está a 3 clics sin afordancia y barre el corpus entero en frío (A2 § 1.3, § 3) | El líder de la entidad a UN clic desde la tarjeta, su perfil casi instantáneo (índice inverso), y su reparto por departamento (§ 8) |
| (d) ¿Cuáles descarto ya? | Calendario del pliego, cambios de reglas, tamaño de la obra frente al cupo | Cierre, adendas, prórroga (A1 #12, #16, #21) | Días de oficina que da la entidad, fechas trampa, «republicado el dd-mm» sin leer pliego (A4 #15), lotes (A4 #39) |

**Cuatro hechos del árbol que atan el diseño** (todos verificados en los informes o en el árbol hoy):

1. **El único dato PUBLICADO sobre las socias que decide algo por sí solo es el tamaño de empresa del RUP**: `tamanoEmpresa` «microempresa» para Helder y Génesis, «gran_empresa» para PRODIAC (`lib/perfiles.js:86,121,156`, «dato PUBLICADO, pág. 1 del RUP»), y el umbral para limitar convocatorias a Mipyme en 2026 es `UMBRAL_MIPYME_2026 = 511.708.497` (`lib/socio_por_proceso.js:44-49`, con su fuente citada en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md § «V-12 · Umbrales y cifras de 2026»`). Consecuencia para «adjudicar más»: por debajo de ese umbral, ir con PRODIAC puede cerrar una puerta que ir con Génesis deja abierta; el recomendador ya lo sabe como AVISO (`aviso_mipyme`, A3 § (b)), la tarjeta no lo dice.
2. **La K de los tres perfiles es un TECHO**: ninguno tiene contratos en ejecución cargados (`sce: []`, `lib/perfiles.js:127,163`; A3 § (d)) y el ingreso operacional se estima ×16,7 (`[capacidad] CO de "helder" estimado como utilidadOp × 16.7`, en las dos salidas de hoy). Todo dato de cupo que se enseñe hereda ese supuesto y tiene que decirlo (hoy lo dice un chip plegado: A1 #27).
3. **La experiencia por contratos no distingue perfiles** (`config:experiencia` es una clave única, `lib/almacen.js:180`; A3 § (b)) y **los 327 contratos de PRODIAC no existen en el árbol** (A3, `ls *.json`). Por eso «aporta la experiencia» se dispara por una clase inscrita, no por contratos: la tarjeta debe decir «tiene la actividad», nunca «tiene la experiencia» (A3 § (c)).
4. **El corpus no publica si la convocatoria está limitada a Mipyme, ni los factores de puntaje** (grep vacío en `lib/columnas_historicas.js` y `lib/negocio.js`, A3 § (b)): lo que no está en el corpus se lee del pliego (dictamen) o no se afirma. Ningún dato de esta propuesta inventa un porcentaje de puntaje.

---

## 2. Reglas que no se violan, y cómo las cumple cada dato nuevo

| Regla | Cómo la cumple esta propuesta | Datos donde más pesa |
|---|---|---|
| **Todos los datos ciertos siempre**: un calculado se declara calculado; sin dato es «sin dato», nunca 0 ni un supuesto disfrazado | Cada CORTO que sale de un cálculo lleva su base entre paréntesis («8 procesos», «55 procesos») o la palabra «calculado»; cuando la base no llega al mínimo (5, `lib/indice_competencia.js:86`) el dato no se pinta o dice «sin histórico» — jamás se rellena con el «supuesto: 5 rivales» que hoy rotula la celda 2 (A1 H2) | DUE-07, 08, 09, 21, 37, 39, 40, 49 |
| **Un dato publicado gana a uno calculado** | El anticipo DECLARADO por el pliego manda sobre la regex (DUE-20); los contratos en ejecución publicados en SECOP mandan sobre el «se asume 0» (DUE-43); la fecha de última publicación del dataset manda sobre la inferencia de adenda (DUE-47); la experiencia del RUP manda sobre «tiene la clase» (DUE-44) | DUE-20, 43, 44, 47 |
| **Una cifra redondeada no decide** | La cifra que decide (K, CRPC, financiación, umbral Mipyme) viaja exacta en la fila y la tarjeta la enseña abreviada SOLO en el texto («$6.366 M»), con la exacta en el plegado/expediente; el orden y el veredicto los calcula el servidor con la cifra entera (`listar.js:153`, `lib/puertas.js`) | DUE-19, 36, 41, 50 |
| **Lo que se VE arriba (hecho + frecuencia natural, sin «probabilidad») y lo que se TOCA plegado** | Arriba: la línea de requisitos, con quién, tres cifras (rivales medidos · «1 de N» solo con base · lo que deja), cierre, competencia, líder. Plegado: puertas con cifra, anticipo, baja, calendario de la entidad, cupo restante, encaje. Modal: el porqué. `frecuenciaNatural` sigue con su suelo de 2 (`public/app.js:1799-1805`) | § 5 |
| **usted, sin jerga, sin emoji** | Los 91 textos propuestos pasaron `tuteoEn`, `VOSEO_RE`, `RE_EMOJI_UI` de `lib/lenguaje_pantalla.js` y la lista de jerga de la suite (§ 10.3, `d_dueno_textos.js`: 0 fallos). Los mensajes de puertas del servidor que hoy dicen «CRPC», «K» y «capacidad residual» en el plegado (reproducido en `d_dueno_tarjeta.salida.txt`) se reescriben en llano (DUE-19) | todos |
| **Ninguna pulsación sin respuesta visible** | El líder de la tarjeta es un botón que abre el modal ya con esqueleto y frase; sin base no hay botón (no un «sin dato» que no lleva a nada); la fila del competidor en el modal de la entidad gana texto de enlace («Ver dónde más gana ›») | DUE-31, 32, 33 |
| **No reescribir una regla que ya existe: llamarla** | El anticipo mínimo para caber lo calcula ya `lib/puertas.js` (mensaje de P2); el plazo en meses, `lib/capacidad.plazoMesesDe`; los días de oficina, `lib/habiles.habilesEntre`; el plazo de adjudicación y los desiertos, `lib/indice_competencia.hechosDeRegistro` (`:479`); el perfil del competidor, las líneas `lib/competencia_detalle.js:580-607` extraídas a una función compartida con el constructor del índice (A2 § 4.2); la mediana, `lib/estadistica` (MEMORIA § «Cinco medianas en `lib/`, y ya divergían (13-sep-2026)») | DUE-06, 20, 33, 37, 39, 50 |
| **Sin dato ≠ cero** | Sin duración: «plazo no publicado», no 12 meses (`lib/capacidad.plazoMesesDe({}) = 12` es para la K, no para la pantalla: A4 C8); sin cuantía: nada de «$0» ni de rango; sin fecha de cierre: «Cierre sin fecha publicada» en vez del silencio de hoy (A1 H6) | DUE-11, 50 |
| **En oportunidades el falso caro es el NEGATIVO** | Ningún dato nuevo bloquea ni oculta: la fecha trampa, el «republicado», el tope Mipyme y el «según anticipo» son ámbar e informativos | DUE-36, 38, 47 |
| **Dos cosas distintas no pueden tener nombres parecidos** | `alcanzable_con_socio` (el primer socio que alcanza) se retira de la fila; `socio.con` es el único «con quién» (A3 § (b), reproducido hoy: Génesis frente a PRODIAC en la misma fila) | DUE-56 |

---

## 3. Lo que HOY se enseña, dato por dato (tabla de A1 § 1) — decisión, y las dos preguntas del dueño

Leyenda: **C** se conserva · **Δ** cambia · **P** se pliega · **R** se retira. «¿Mejor dato?» contesta «¿es el mejor dato que se puede dar con los datos que hay?»; «¿Qué más sale?» contesta «¿qué otro dato puedo dar con este dato?» (derivaciones de A1 § 3 y censo de A4).

| A1 # | Dato de hoy | DUE | Decisión | ¿Mejor dato? | ¿Qué más sale de él? |
|---|---|---|---|---|---|
| 1, 2, 31, 34 | Título · entidad · departamento · estado · enlace SECOP | DUE-01 | C | Sí | Con `referencia_del_proceso` (viaja, 0 ficheros de `public/` la pintan: censo hoy) sale la referencia con la que la entidad y el pliego nombran el proceso → DUE-02 |
| 3 | «$ 6.365.863.685 · cuantía alta» | DUE-03 | Δ (la cifra C; el rótulo alta/media/baja R) | No: nadie decide con «alta» (< 100 M / 100-500 M / > 500 M, `lib/negocio.js:34-35`); el dueño decide con el cupo y con el umbral Mipyme | Con `duracion` sale el ritmo mensual (DUE-50); con el umbral, «cabe en el tope Mipyme» (DUE-36); con la K, el cupo que queda (DUE-41) |
| 4 | Chip rojo «No viable — K · Caja» + tarjeta al 50 % | DUE-04 | Δ | A medias: rojo aunque un socio la rescate | Con `socio.con` → «No le alcanza solo · con PRODIAC sí» en ámbar; rojo solo si ninguna sirve |
| 5 | «Cumple los requisitos, con detalles por revisar.» | DUE-05 | Δ | No: «detalles» no dice cuál | Con `sin_dato_de` de la puerta → «falta confirmar el anticipo» |
| 6 | «Solo no le alcanza; con un socio, sí. Guárdelo…» (y nada en «solo») | DUE-06 | Δ | No: calla el nombre y la rama del anticipo | Con `recomendacion.socio` + `reparto` + la contrafáctica de anticipo → «con quién» en cada tarjeta (§ 7) |
| 7 | «~1 empresa suele competir · en 55 procesos» | DUE-07 | Δ | No: `Math.round(1,4)` = «~1» mientras la banda dice «1,4» (H3, reproducido hoy con el proceso del dueño) | Un solo redondeo, la misma cifra en las dos caras |
| 8 | «1 de 2 se gana, aproximadamente» (+ «supuesto: 5 rivales» sin base) | DUE-08 | Δ | No cuando no hay base (H2): un «1 de 5» sobre un supuesto sin decirlo | Con base: «1 de 3 · estimado con los 55 procesos de esta entidad»; sin base: «— · sin histórico para estimar» (la rama existe, `public/app.js:2079`, y hoy es inalcanzable) |
| 9, 9b, 9c, 9d | Celda 3: «−$3M podría perder…» / «$56M es lo que suele pagar…» / «Calcular · cuánto deja…» / «—» | DUE-09 | Δ (solo la 9b) | 9b rotula como hecho un derivado cuantía × (1 − mediana) (H7) | «≈ $5.920 M si bajan aquí lo habitual (7 %, 8 contratos) · calculado» |
| 10 | «Ver cómo se calcula» → modal | DUE-10 | C | Sí | — |
| 11 | Chip «Activo · abierto» (PAA) | DUE-30 | C | Sí | — |
| 12 | «Cierra en 32 días · 14 de oct de 2026» | DUE-11 | Δ | No: `fecha_cierre` trae la hora (`2026-10-14T15:00:00.000`, reproducido) y el chip la calla (`public/app.js:2136`); sin fecha, silencio (H6) | «· 3:00 p. m.» y «Cierre sin fecha publicada»; con `fecha_de_publicacion_del`, los días de oficina para ofertar (DUE-37) y la fecha trampa (DUE-38) |
| 13, 19 | Chip y aviso de «Avisar que le interesa» | DUE-12 | C | Sí (techo legal ≠ plazo, ya bien) | — |
| 14 | Banda «● Poca competencia · 1,4 en 55 ›» | DUE-13 | Δ (rótulo) | Casi: «1,4 en 55» exige leer un párrafo | «Poca competencia · 1,4 por proceso · 55 procesos ›» |
| 15 | Zona «Su zona (Ibagué)» | DUE-14 | C | Sí (estimado y declarado) | — |
| 16 | Chip «Cierre prorrogado» | DUE-15 | Δ | A medias: no dice cuánto | Con `_cierre_inicial` → «Cierre prorrogado 12 días (era el 1 de oct)» |
| 17 | Aviso ámbar de la señal #11 | DUE-13 | C | Sí | — |
| 18 | Aviso rojo de cierre (≤ 2 días) | DUE-16 | C | Sí | — |
| 20 | Margen (solo con `ordenar_por=margen`) | DUE-18 | C | Sí | — |
| 21 | «La entidad cambió las reglas…» | DUE-17 | C | Sí | Con `fecha_de_ultima_publicaci` (hoy descartada) saldría «republicado el dd-mm» sin leer el pliego (DUE-47) |
| 22 | Plegado: puertas con cifra y mensaje | DUE-19 | Δ (textos) | No: el plegado enseña «CRPC $6.365.863.685», «K $4.470.921.189», «capacidad residual» (reproducido hoy: son textos del servidor, `lib/puertas.js`) | Con `crp − crpc` → «le quedarían $15 M de cupo» (DUE-41) |
| 23 | Chip «Anticipo 30%» / «Anticipo no declarado» | DUE-20 | Δ | No: dice «no declarado» también cuando el pliego declara «sin anticipo» (H1, reproducido hoy en CO1.REQ.900002) | Tres estados; con la puerta P2, «cabe solo con anticipo ≥ 30 %» |
| 24 | «Suelen bajar 7 % (unos $4M)» / «sin datos» | DUE-21 | Δ (rótulo de origen) | Casi: `granularidad_utilizada` viaja y no se dice cuando la mediana no es de ESTA entidad | «(lectura del departamento, no de esta entidad)» |
| 25 | «PURIFICACIÓN ✓» | DUE-22 | C (plegado) | Sí | — |
| 26 | «Encaja con su registro ✓» + «Obra civil» | DUE-23 | C | Sí | — |
| 27 | «Capacidad calculada con ingreso estimado» | DUE-24 | Δ (texto) | A medias: no dice qué hacer | «Cupo calculado con un ingreso estimado: cargue el ingreso de su RUP en Mi empresa» |
| 28 | «Licitación pública» | DUE-25 | C (plegado) | Sí | — |
| 29 | «Precios unitarios» / «Precio global» | DUE-26 | C | Sí | — |
| 30 | «Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos.» | DUE-27 | C (plegado) | Sí (el dueño lo pidió y lo entiende) | — |
| 32 | Botón «Guardar» | DUE-28 | C | — | Con los guardados sale «su historial con esta entidad» (DUE-46) y el cupo comprometido (DUE-41) |
| 33 | Botón «Calcular mi precio» | DUE-29 | Δ | No: `qApu` lee `plazo_meses`, que no viaja (H4, reproducido: `plazo_meses: undefined`) | Se pasa el plazo con `plazoMesesDe` |
| — | Campo `alcanzable_con_socio` (no se ve) | DUE-56 | R | Contradice a `socio.recomendacion` en la misma fila (Génesis frente a PRODIAC, reproducido hoy) | — |

---

## 4. Las fichas (DUE-01 … DUE-56)

Formato de cada ficha: **CORTO** · **CONCISO** · **BENEFICIA** · **AFECTA** · *fuente · certeza · costo · para · necesidad A5 · tanda*.

### 4.1 Lo que se conserva o cambia en la tarjeta (tanda 1 salvo indicación)

**DUE-01 · Cabecera del proceso** — se conserva
- CORTO: «PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA · ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Tolima · Publicado · Ver en SECOP II ↗»
- CONCISO: `nombre_del_procedimiento`, `entidad`, `departamento_entidad`, `estado_del_procedimiento`, `urlproceso` de la proyección (`lib/proyeccion.js:37-46`); sin nombre, «Proceso sin nombre»; sin URL http(s), sin enlace (A1 #1, #2, #31, #34).
- BENEFICIA: identifica el proceso y lleva a SECOP II en un clic.
- AFECTA: nada nuevo; se conserva tal cual.
- *sync · publicado · ambos · E1/P1 · tanda 1 (sin cambio)*

**DUE-02 · Referencia del proceso** — nuevo
- CORTO: «Ref. LP-008-2026»
- CONCISO: `referencia_del_proceso` ya viaja en cada fila (reproducido: `LP-008-2026-900001`) y ningún `public/*.js` la pinta (censo hoy: `grep -rl referencia_del_proceso public/` → nada). Es la referencia con la que la entidad y el pliego nombran el proceso (A4 #8). Texto pequeño bajo el título.
- BENEFICIA: el ingeniero busca el proceso en SECOP II y en el pliego por esa referencia, no por el CO1.REQ.
- AFECTA: 25-30 B por fila que ya viajan; si viene vacía no se pinta.
- *petición · publicado · ambos · E1 · tanda 1*

**DUE-03 · Cuantía** — cambia (la cifra se conserva; el rótulo «cuantía alta/media/baja» se retira)
- CORTO: «$ 6.365.863.685»
- CONCISO: `cuantia_cop` de `enriquecer` (`lib/negocio.js:207`); «Cuantía no publicada» cuando el dataset trae 0 (0 = no publicado, `lib/negocio.js:247-250`). El rótulo alta/media/baja (< 100 M / 100-500 M / > 500 M, `lib/negocio.js:34-35`) no sostiene ninguna decisión del dueño: su sitio lo ocupan DUE-36 (tope Mipyme) y DUE-41 (cupo que queda).
- BENEFICIA: la cifra que manda queda sola y exacta; desaparece un rótulo que parecía un juicio y no lo era.
- AFECTA: `cuantia_rango` sigue viajando para el filtro por rango (`lib/filtros_lista.js`); solo deja de pintarse.
- *sync · publicado · ambos · P1/E1 · tanda 1*

**DUE-04 · Chip de «no le alcanza»** — cambia
- CORTO: «No le alcanza solo · con PRODIAC sí» (ámbar) / «No le alcanza, ni con socio» (rojo)
- CONCISO: `viable === false` (`lib/puertas.js:305-350`) + `socio.con` y `socio.cierra_todo` (DUE-06). Hoy el chip dice «No viable — K · Caja» y apaga la tarjeta al 50 % aunque un socio cierre todo (reproducido: CO1.REQ.900002, `socio {tipo: con_socio, cierra_todo: true}`). El 50 % de opacidad se reserva para `ninguna_sirve`.
- BENEFICIA: el dueño ve de un vistazo cuáles procesos «grandes» siguen siendo suyos con la socia adecuada: es la palanca más directa para presentarse a más.
- AFECTA: una tarjeta ámbar más «viva» invita a mirar; el porqué sigue plegado. No cambia el orden ni el veredicto del servidor.
- *petición · calculado · ambos · P1/P11 · tanda 1*

**DUE-05 · Línea de requisitos** — cambia
- CORTO: «● Puede presentarse; falta confirmar el anticipo en el pliego.» (en vez de «…con detalles por revisar.»)
- CONCISO: `lineaRequisitos` (`public/app.js:1718-1743`) sobre `puertas.p1..p4`; «con detalles por revisar» se pinta cuando alguna puerta trae `sin_dato` o `advertencia`. La puerta ya dice QUÉ falta (`sin_dato_de: "anticipo"`, `lib/puertas.js:28-33`): se nombra. Sin cuantía: «falta la cuantía»; sin ingreso del RUP: «cupo calculado con ingreso estimado».
- BENEFICIA: quien empieza sabe qué buscar en el pliego antes de gastar una hora.
- AFECTA: la frase crece unos 20 caracteres; nunca lista más de dos faltantes (el resto, en el plegado).
- *petición · calculado · sin experiencia · P1 · tanda 1*

**DUE-06 · Con quién conviene** — cambia (obligatorio del encargo; detalle en § 7)
- CORTO: «Solo si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC (80/20).» · «Conviene con Génesis: tiene la actividad que a usted le falta · reparto sugerido 60/40» · «Solo: le alcanza sin socio.» · «Ninguna de las dos alcanza lo que falta.»
- CONCISO: `socioPorProceso` ya corre por fila servida (`lib/handlers/procesos/listar.js:935-938`); `resumenSocio` (`:109-113`) pasa a dejar `{tipo, con, cierra_todo, aviso, linea}` con la línea redactada por el servidor (A3 § (c)); estado nuevo `segun_anticipo`: cuando `rup.k_depende_del_anticipo` es verdadero (anticipo no publicado y P2 pasa solo con el tope de anticipo), se evalúa además la contrafáctica «sin anticipo» (`anticipo_declarado: true, anticipo_pct: 0`) y la línea trae las dos ramas. Ejecutado hoy con Purificación: sin anticipo declarado → `falta ["capacidad","caja"]`, PRODIAC 80/20 (Génesis también cierra: capacidad juntos $8.987.285.198 > $6.365.863.685; patrimonio juntos $1.318.593.852 ≥ 20 % de $6.365.863.685); con anticipo del 30 % → «solo». El 30 % lo calcula ya `lib/puertas.js` (mensaje de P2), no se reescribe.
- BENEFICIA: es la pregunta del dueño en cada tarjeta, contestada con nombre y reparto, y con la condición real (el anticipo) que hoy la tarjeta esconde bajo un «solo».
- AFECTA: 96-184 B por fila (medido; hoy 34-43 B); una segunda evaluación de puertas y socio solo en las filas con anticipo sin publicar (≈ 0,3 ms por fila de página, A1 § 4). Cuatro aserciones de la suite caen a propósito (`tests/e2e.js:4706-4737`, A3 § (e)) y hay que reescribirlas; la memoria del 11-sep recibe su marca «> SUPERADA».
- *petición · calculado · ambos · E9/P11 · tanda 1*

**DUE-07 · Cuántas empresas compiten aquí (celda 1)** — cambia
- CORTO: «1,4 empresas por proceso · 55 procesos»
- CONCISO: `competencia_entidad.promedio_oferentes` y `total_procesos` del hash `indice:competencia` (`lib/indice_competencia.js:1213-1231`), mínimo 5 procesos. Hoy la celda redondea (`Math.round`, `public/app.js:2074`) y pinta «~1 empresa» mientras la banda dice «1,4» (reproducido hoy con el proceso del dueño). Un solo formato (`fmt1`) en las cuatro apariciones. Sin base: «Sin histórico de esta entidad», sin el «supuesto: 5 rivales».
- BENEFICIA: el hecho medido, igual en toda la tarjeta; la señal #11 (pliego a la medida o nicho) se lee sin traducir.
- AFECTA: pierde el «~N empresas» entero; gana coherencia. Nada de bytes nuevos.
- *petición · medido · ambos · E6 · tanda 1*

**DUE-08 · De cada N se gana 1 (celda 2)** — cambia
- CORTO: «1 de 3 se gana, aproximadamente · estimado con los 55 procesos de esta entidad» / «— · sin histórico para estimar»
- CONCISO: `frecuenciaNatural(p_ganar)` (`public/app.js:1799-1805`, suelo 2) sobre `estimarPDetalle` (`lib/probabilidad.js:445-462`). Hoy `p` nunca es null: sin histórico cae al `PROMEDIO_CONSERVADOR` de 5 rivales (`lib/probabilidad.js:124`) y la celda pinta «1 de 5» con el supuesto en letra pequeña (A1 H2). Propuesta: la celda solo se pinta con `p_ganar_detalle.fuente` «entidad» o «departamento» (con su base); con `fuente` supuesta, la rama «— · sin datos para estimar» que ya existe (`public/app.js:2079`). El porcentaje sigue en el modal.
- BENEFICIA: «todos los datos ciertos»: una frecuencia sobre un supuesto sin decirlo hacía creer que había base.
- AFECTA: en entidades sin histórico la celda queda en «—»: es lo cierto; el orden por atractividad no cambia (el servidor sigue usando `p`).
- *petición · estimado · ambos · E6 · tanda 1*

**DUE-09 · Lo que deja / a cuánto suele adjudicar (celda 3)** — cambia (solo la rama 9b)
- CORTO: «≈ $5.920 M · si bajan aquí lo habitual (7 %, 8 contratos) · calculado» (rama 9b); las ramas con APU («−$3M · podría perder, en el peor caso…»), «Calcular · cuánto deja: falta su costo» y «— · sin cifra de lo que deja» se conservan.
- CONCISO: `ganancia.precio_esperado = cuantía × (1 − mediana)` (`lib/ganancia.js:388-391`); lo MEDIDO es la mediana y su n. Hoy el rótulo «es lo que suele pagar esta entidad» rotula el derivado como hecho (A1 H7). Cambia solo el rótulo; la cifra exacta sigue en el `title` y en el modal «Lo que deja».
- BENEFICIA: el dueño fija el precio con lo que ve: sabe que es una cuenta, no un precio publicado.
- AFECTA: una palabra más («calculado»); sin token la celda sigue en «—» (`lib/publico.js:153`).
- *petición · calculado · ambos · E2/P5 · tanda 1*

**DUE-10 · «Ver cómo se calcula»** — se conserva
- CORTO: «Ver cómo se calcula»
- CONCISO: botón → `/api/inteligencia?op=probabilidad` (`public/app.js:3256`), modal con fuente, rivales esperados, banda del 90 % y ajustes (A1 #10).
- BENEFICIA: el porqué, plegado y a un clic.
- AFECTA: nada.
- *clic · estimado · experimentado · E6 · tanda 1 (sin cambio)*

**DUE-11 · Cierre con hora, y «sin fecha» dicho** — cambia
- CORTO: «Cierra en 32 días · mié 14 de oct · 3:00 p. m.» / «Cierra HOY · 3:00 p. m.» / «Cierre sin fecha publicada»
- CONCISO: `fecha_cierre` (`lib/negocio.js:181`, `CIERRE_CANDIDATOS`) trae la hora (reproducido: `2026-10-14T15:00:00.000`, hora Colombia flotante, `public/app.js:1425` resta 5 h); `chipCierre` (`:1432-1440`) recibe `cierreTxt` sin hora (`:2136`) y con fecha ilegible devuelve `""` (H6). Se añade la hora y la rama «sin fecha publicada» (gris).
- BENEFICIA: «el cierre a las 3:00 p. m. es la hora en que más ofertas mueren» (Guía, cap. 4, citado en A5 P7): la hora es el dato que evita el error #1 del país.
- AFECTA: el chip crece ~12 caracteres; en 390 px cabe en la fila de chips (verificar en navegador real, como manda CLAUDE.md al tocar `public/`).
- *sync · publicado · ambos · P7/E17 · tanda 1*

**DUE-12 · Avisar que le interesa** — se conserva
- CORTO: «Avisar que le interesa · vence HOY» / «… puede cerrar el …» / «… fecha por confirmar en SECOP II»
- CONCISO: `manifestacionDeFila` (`lib/manifestacion.js:298-327`); ventana legal calculada, fecha del cronograma cuando está (A1 #13, #19).
- BENEFICIA: en menor cuantía, avisar a tiempo es la diferencia entre poder presentarse o no (A5 E17).
- AFECTA: nada.
- *petición · calculado · ambos · E17 · tanda 1 (sin cambio)*

**DUE-13 · Banda de competencia (y aviso de la señal #11)** — cambia el rótulo
- CORTO: «● Poca competencia · 1,4 por proceso · 55 procesos ›» (el aviso «Atención: aquí se presentan 1,4 oferentes en promedio…» se conserva)
- CONCISO: `bandaCompetencia` (`public/app.js:1606-1620`) sobre `competencia_entidad.{nivel, promedio_oferentes, total_procesos}`; nivel por tertiles (`lib/indice_competencia.js`). Botón → modal de la entidad. Solo cambia el rótulo: «1,4 en 55» exige leer un párrafo.
- BENEFICIA: se lee sin traducir; misma cifra que la celda 1 (DUE-07).
- AFECTA: nada de bytes; la cerradura del badge (`tests/e2e.js:23608-23614`: `data-entidad`, `cursor-pointer`) se conserva.
- *petición · medido · ambos · E5/E6 · tanda 2*

**DUE-14 · Zona** — se conserva
- CORTO: «Su zona (Ibagué)» / «Cerca · ~120 km de Bogotá» / «Distancia sin calcular: no sabemos desde dónde opera»
- CONCISO: `evaluarZona` (`lib/accesibilidad.js`) con la base del perfil; km por departamento (estimado y declarado con «~»).
- BENEFICIA: viáticos y seguridad antes del primer peso de utilidad (A5 P12).
- AFECTA: nada.
- *petición · estimado · ambos · P12 · tanda 1 (sin cambio)*

**DUE-15 · Cierre prorrogado, con los días** — cambia
- CORTO: «Cierre prorrogado 12 días (era el 1 de oct)»
- CONCISO: `_cierre_prorrogado` y `_cierre_inicial` (`lib/almacen.js:370-371`, entre versiones del dataset); días = `fecha_cierre − _cierre_inicial` (derivación A1 § 3). Solo si `_versiones > 1`: «no prorrogado» puede ser «no lo vimos», y así se declara en el `title` y en el modal.
- BENEFICIA: una prórroga larga es más tiempo para armar la oferta y, medido en el índice, más oferentes (factor 1,20 de `lib/probabilidad.js:125`).
- AFECTA: nada de bytes (los dos campos viajan).
- *petición · medido · ambos · E6/E8 · tanda 2*

**DUE-16 · Aviso rojo de cierre** — se conserva
- CORTO: «Atención: Cierra mañana: presente la oferta HOY…»
- CONCISO: `avisoCierre` (`public/app.js:1477-1485`), solo a ≤ 2 días.
- BENEFICIA: la regla del día anterior, visible cuando decide.
- AFECTA: nada.
- *petición · calculado · ambos · P7 · tanda 1 (sin cambio)*

**DUE-17 · Cambio de reglas (adendas)** — se conserva
- CORTO: «La entidad cambió las reglas de este proceso. Hay algo que le afecta.» + «● Cierre: pasó de … a …»
- CONCISO: `evaluarAdendas` (`lib/adendas.js:44-100`) sobre `_cambios` entre versiones; re-evalúa puertas con valores viejos y nuevos.
- BENEFICIA: el error #6 (vigilar a mano) resuelto.
- AFECTA: nada; DUE-47 lo complementa cuando entre `fecha_de_ultima_publicaci`.
- *petición · medido · ambos · E8 · tanda 1 (sin cambio)*

**DUE-18 · Margen entre su piso y el techo de la entidad** — se conserva
- CORTO: «Puede mover el precio $ 20.000.000 entre su precio mínimo (…) y el precio al que suele adjudicar esta entidad (…)»
- CONCISO: `margenDe` (`listar.js:718-751`), solo con `?ordenar_por=margen` y token (A1 #20).
- BENEFICIA: quien ya costeó ve cuánto aire tiene.
- AFECTA: nada.
- *petición · calculado · experimentado · E2 · tanda 1 (sin cambio)*

**DUE-19 · Las puertas con su cifra, en llano** — cambia (textos del servidor)
- CORTO: «● Cupo ~ · Sin anticipo, esta obra pide $6.366 M de cupo y a usted le quedan $4.471 M: cabe solo con un anticipo del 30 % o más. Confírmelo en el pliego.» · «● Caja ? · Sin anticipo necesitaría financiar ≈ $1.273 M antes del primer cobro; su patrimonio es $1.107 M.» · «● Su registro ✓ · La actividad de este proceso está inscrita en su RUP.» · «● Competencia ✓ · 1,4 oferentes por proceso en 55 procesos.»
- CONCISO: mismos cálculos de `lib/puertas.js` (`p1Rup:105`, `p2K:120`, `p3Caja:225`, `p4Competencia:273`); solo cambia la redacción de `mensaje`, que hoy dice «La clase UNSPSC del proceso está inscrita en su RUP», «supera su capacidad residual (K $4.470.921.189)», «CRPC $4.456.104.580 / K $4.470.921.189» (reproducido hoy en las tres tarjetas). La cifra exacta se conserva en el `title` y en el expediente; en la tarjeta va abreviada (no decide: decide el servidor con la entera).
- BENEFICIA: quien empieza entiende «cupo» y «caja»; el experimentado sigue viendo la cifra exacta a un clic. Y la cerca de jerga de la suite deja de tener un hueco: hoy `JERGA_JS` barre `public/*.js` (`tests/e2e.js:29449-29470`) y solo el mensaje PÚBLICO de la caja está cercado (`:3850`); los mensajes con credencial pasan con «CRPC» y «capacidad residual».
- AFECTA: aserciones que fijen los textos actuales de P2/P3 caen a propósito (localizarlas con `E2E_SOLO=«unidad capacidad»`, `«unidad puerta caja sin anticipo»`, A6 § 5) y se reescriben; el mensaje público sin cifras (`lib/publico.js`) se redacta igual.
- *petición · calculado · sin experiencia · P1/P3 · tanda 1*

**DUE-20 · Anticipo en tres estados** — cambia
- CORTO: «Anticipo 30 %» / «Sin anticipo (lo dice el pliego)» / «Anticipo: no publicado · cabe solo con anticipo del 30 % o más»
- CONCISO: `anticipo_pct` + `anticipo_declarado` de `enriquecer` (`lib/negocio.js:108,218-224`, regex sobre el objeto; el dataset no trae columna). Hoy el chip mira solo `pct > 0` (`public/app.js:2192`) y pinta «no declarado» también con `anticipo_declarado: true` y `pct 0` (H1; reproducido hoy en CO1.REQ.900002, cuyo objeto dice «Sin anticipo.»). El «30 % o más» sale del mensaje de P2 (`lib/puertas.js`, ya calculado): se expone como cifra propia (`anticipo_minimo_pct`) en vez de dejarlo dentro de una frase.
- BENEFICIA: el anticipo decide si el dueño cabe solo o con socio (E4) y cuánta caja necesita: tres estados ciertos en vez de dos, uno de ellos falso.
- AFECTA: sigue siendo una lectura del texto (estimado): el chip dice «lo dice el pliego» solo en el estado declarado; el no publicado manda al pliego.
- *sync · estimado · ambos · E4 · tanda 1*

**DUE-21 · Suelen bajar (entidad), con su origen** — cambia (rótulo)
- CORTO: «Suelen bajar 7 % (unos $445 M) · 8 contratos» / «Suelen bajar 4 % · lectura del departamento, no de esta entidad» / «Suelen bajar: sin datos de esta entidad»
- CONCISO: `bajaDeMercado` (`lib/indice_baja.js:885-940`: entidad+familia → entidad → departamento+familia) y `chipBaja` (`public/app.js:1349-1366`); `granularidad_utilizada` viaja (A1 § 2) y `public/app.js` solo la pinta en el panel (`:7689`, `:7760`), no en el chip. Se añade al chip cuando la mediana no es de la entidad.
- BENEFICIA: no confundir «lo que baja esta entidad» con «lo que baja el departamento» al fijar el precio (E2).
- AFECTA: nada de bytes; sin token sigue en «sin datos» (`lib/publico.js:131-137`).
- *petición · medido · ambos · E2/P5 · tanda 1*

**DUE-22 · Ubicación** — se conserva (plegado)
- CORTO: «PURIFICACIÓN ✓»
- CONCISO: `ciudad_entidad` + `ubicacion_valida` (`lib/negocio.js:170`): sede de la entidad, no la obra (A4 #3).
- BENEFICIA: confirma la zona; DUE-14 ya lo resume arriba.
- AFECTA: nada.
- *sync · publicado · ambos · P12 · tanda 1 (sin cambio)*

**DUE-23 · Encaja con su registro** — se conserva (plegado)
- CORTO: «Encaja con su registro ✓» / «Encaja por familia ~ (verifique el pliego)» / «No encaja con su registro ✗» + «Obra civil»
- CONCISO: `evaluarRup` (`lib/rup.js:92-145`), `badgesRup` (`public/app.js:1579-1588`).
- BENEFICIA: P2 de quien empieza («¿qué códigos me faltan?»).
- AFECTA: nada.
- *petición · calculado · sin experiencia · P2 · tanda 1 (sin cambio)*

**DUE-24 · Cupo calculado con ingreso estimado** — cambia (texto)
- CORTO: «Cupo calculado con un ingreso estimado: cargue el ingreso de su RUP en Mi empresa»
- CONCISO: `rup.co_estimado` (`lib/rup.js:138`: CO = utilidad × 16,7 cuando el RUP no trae ingreso; reproducido en las dos salidas de hoy). Hoy dice «Capacidad calculada con ingreso estimado» y no dice qué hacer.
- BENEFICIA: el dueño puede quitar el supuesto cargando un dato; hasta entonces sabe que su cupo es un techo.
- AFECTA: nada de bytes; sin token el chip no se pinta (`co_estimado` null).
- *petición · estimado · ambos · P3 · tanda 1*

**DUE-25 · Modalidad** — se conserva (plegado)
- CORTO: «Licitación pública»
- CONCISO: `modalidad_de_contratacion`; `modalidadEnLlano` (`lib/guia_proceso.js`) explica en el expediente qué cambia (manifestación, método de precio sorteado).
- BENEFICIA: la modalidad fija si hay que avisar interés y cómo puntúan el precio.
- AFECTA: nada.
- *sync · publicado · ambos · P1 · tanda 1 (sin cambio)*

**DUE-26 · Precios unitarios / precio global** — se conserva
- CORTO: «Precios unitarios» / «Precio global: el riesgo de las cantidades es suyo»
- CONCISO: `tipoPrecio` (`lib/negocio.js:251-274`, regex; las dos menciones → null).
- BENEFICIA: la variable de riesgo que el manual omite (A5 E12).
- AFECTA: nada.
- *petición · estimado · ambos · E12 · tanda 1 (sin cambio)*

**DUE-27 · Cómo se adjudica en el departamento** — se conserva (plegado)
- CORTO: «Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos.»
- CONCISO: `bajaDepartamentoDe` (`lib/indice_baja.js:988-1035`); se expone, no decide (MEMORIA § «Lote «B9b-competencia-departamento»…»).
- BENEFICIA: contexto de precio cuando la entidad no tiene base.
- AFECTA: nada.
- *petición · medido · ambos · E2 · tanda 1 (sin cambio)*

**DUE-28 · Guardar** — se conserva
- CORTO: «Guardar» / «Guardado · me presenté»
- CONCISO: `botonGuardar` (`public/app.js:3553-3567`), mapa `guardados` id → estado (`:3551`). Al guardar, el servidor congela el consejo de socio con fecha (`lib/handlers/perfil/seguimiento.js:168-181`).
- BENEFICIA: alimenta el tablero (DUE-42), el cupo comprometido (DUE-41) y el historial por entidad (DUE-46).
- AFECTA: nada.
- *clic · publicado · ambos · E16 · tanda 1 (sin cambio)*

**DUE-29 · Calcular mi precio, con el plazo** — cambia
- CORTO: «Calcular mi precio»
- CONCISO: `qApu` (`public/app.js:2114-2126`) lee `l.plazo_meses`, que la fila no lleva (H4; reproducido hoy: `plazo_meses: undefined`, `duracion: 8 Meses`). La fila pasa a llevar `plazo_meses` calculado con `lib/capacidad.plazoMesesDe` (la misma regla que usa la K; sin duración → `null`, no 12).
- BENEFICIA: Precios abre con el plazo y la rentabilidad no arranca sin él.
- AFECTA: 15 B por fila.
- *clic · calculado · ambos · P6 · tanda 1*

**DUE-30 · Activo · abierto (PAA)** — se conserva
- CORTO: «Activo · abierto»
- CONCISO: bandera del toggle del PAA (`public/app.js:2176`).
- BENEFICIA: distingue lo publicado de lo planeado (E10).
- AFECTA: nada.
- *petición · medido · experimentado · E10 · tanda 1 (sin cambio)*

### 4.2 Quién gana aquí, en un clic y sin espera (tanda 2; obligatorio del encargo, detalle en § 8)

**DUE-31 · Quien más gana aquí (líder de la entidad)** — nuevo
- CORTO: «Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›»
- CONCISO: en el barrido que construye `indice:competencia` (`lib/handlers/procesos/historico.js:469`, `lib/indice_competencia.js:908`) se acumula por entidad el adjudicatario con más procesos ganados (`claveAdjudicatario`, `lib/equivalencias.js:72-88`; `esAdjudicado`), y el registro publica `lider: {nombre, clave, ganados, base}` solo con `base ≥ MIN_PROCESOS` (hoy el hash no lleva líder: censo `grep -n "lider" lib/indice_competencia.js` → solo el comentario `:1168`). La fila lo lleva con credencial (86 B, medido en D-experimentado) y `lib/publico.js` lo anula sin ella. El texto es un botón que abre directamente «Dónde gana este competidor» (`cargarAdjudicatario(clave, nombre)`, `public/app.js:3382`). Sin líder no hay botón.
- BENEFICIA: la señal #11 hecha nombre: en un vistazo se sabe si la entidad es un nicho de una sola empresa (E5, P16) y quién es el rival a estudiar.
- AFECTA: toca la decisión declarada en `lib/indice_competencia.js:1167-1168` («`/api/oportunidades` no expone nunca adjudicatarios, NIT ni valores»): se publica solo con token válido (401 con token inválido) y se escribe en la memoria como decisión nueva, no se cuela. Frescura: la del índice (hasta un mes o la última reconstrucción, A2 § 4.1): el modal la declara (DUE-33).
- *sync · medido · ambos · E5/P16 · tanda 2*

**DUE-32 · Perfil del competidor: dónde más gana, cuántas veces y por cuánto** — cambia (existe; se completa y se hace alcanzable)
- CORTO: «155 contratos en 143 entidades · $211.899 M en 147 contratos con valor publicado · último: 25 de dic de 2025» + tabla «Entidad · Ganados · Valor · Último» + «En esta entidad: 6 de sus 15 contratos» + «SECOP no publica el NIT de esta empresa: se identifica por el nombre tal como lo escribe la entidad» (solo perfiles por nombre) + «Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde enero de 2024».
- CONCISO: `detalleAdjudicatario` (`lib/competencia_detalle.js:547-696`) ya devuelve `total_ganados, valor_adjudicado_cop, procesos_con_valor, entidades[], ultima_adjudicacion, baja_media` y `pintarAdjudicatario` (`public/app.js:3344-3380`) lo pinta; falta pintar `procesos_con_valor` (viaja y no se enseña, A2 § 5), la nota de identidad en la cabecera y la cota (hoy en gris al pie). En el modal de la entidad, la fila del adjudicatario gana texto de enlace «Ver dónde más gana ›» (hoy solo `title`, `public/app.js:2930`) y el rótulo del pliegue pasa a «Ver los 5 que más ganan y dónde más ganan» (sin revertir el pliegue del 6-sep).
- BENEFICIA: lo que el dueño pidió literalmente: cuánto ha adjudicado en total, en qué entidades y cuánto; con la base que sostiene el total (147 de 155) para que un total no parezca completo.
- AFECTA: el valor es COTA INFERIOR (corpus desde 2024, obra y afines); dos identidades del mismo proveedor (NIT y nombre) cuentan aparte, y se dice arriba, no al pie.
- *clic · medido · ambos · E5 · tanda 2*

**DUE-33 · De dónde salió el perfil y cuánto tardó (la espera)** — nuevo
- CORTO: mientras carga: «Buscando dónde más gana esta empresa…» sobre un esqueleto con la forma del resultado (cabecera + cinco filas de tabla); al llegar: «Del índice · con datos hasta el 31 de agosto de 2026» o «Recorrido el histórico completo hoy»; si tardará: «Esta empresa no está en el índice: se recorre el histórico completo. Puede tardar unos segundos.»
- CONCISO: hash `indice:adjudicatario` construido en el MISMO barrido del índice de competencia (A2 § 4.2: 10,6-13,1 k claves, 6,3-9,3 MB, 54-66 HSET; prototipo que cuadra al 100 % con `detalleAdjudicatario`), servido por la op existente `op=competidor` en 2-3 comandos (`GET` meta + `HGET`), con `origen: "indice"` y `construido`; si la clave no está, cae al barrido de hoy (`origen: "barrido"`, hasta 95 comandos y 2,7 MB en frío, A2 § 3.1). El handler ya devuelve `duracionMs` y `comandosRedis` (`lib/handlers/inteligencia/detalle.js:177-179`). La espera: `abrirModal` con `#modal-cuerpo` en `aria-busy="true"` y un esqueleto con el keyframe `brillo` que ya existe (`public/index.html:789-794`), duraciones `--dur-2/--dur-4` (`public/index.html:205-212`), sin `@keyframes` nuevo, y bajo `prefers-reduced-motion` gris plano y sin brillo (`public/index.html:836-855`; el esqueleto desaparece de golpe cuando llega el dato, `docs/INVESTIGACION_DISENO_WEB.md § «7.3. Propuesta de tokens de movimiento para Detekta»`). Sin marca escrita a mano ni pictograma (cerca de marca `tests/e2e.js:24157-24161`).
- BENEFICIA: «casi automático»: con el índice, el perfil llega en 2-3 viajes a Redis (≈ 60-250 ms con el supuesto de 30-80 ms por comando; NO VERIFICABLE aquí) en vez de un barrido de segundos; y el usuario sabe si está viendo el índice (con fecha) o el corpus vivo.
- AFECTA: +0,3-0,7 s de CPU en la construcción del índice (30-50 k filas); la caché `indice:detalle:v7:adj:*` sube a v8 y queda solo para el barrido. La frescura del índice (hasta un mes) es un dato distinto del corpus vivo, y se declara.
- *clic · medido · ambos · E5 · tanda 2*

**DUE-34 · Dónde más gana, por departamento** — nuevo
- CORTO: «Gana sobre todo en Tolima: 4 de sus 6 entidades (11 de 15 contratos)»
- CONCISO: el acumulador del índice inverso guarda, por entidad del competidor, `departamento_entidad` (columna publicada que ya está en la fila histórica: proyección activa, A4 § 1) y el modal agrupa `entidades[]` por departamento. Hoy `entidades[]` lleva solo nombre, ganados, valor y última (`lib/competencia_detalle.js:670-681`).
- BENEFICIA: el dueño (base Ibagué) sabe si el rival es local o foráneo, y en qué departamentos no compite con él.
- AFECTA: 8-12 B por entidad del competidor en el índice; departamento = sede de la entidad, no la obra (A4 #3), y se dice.
- *sync · publicado · experimentado · E5 · tanda 2*

**DUE-35 · Cara a cara: cuántas veces se presentó ante esta entidad y cuántas ganó** — cambia (las dos cifras existen; falta el cociente en pantalla)
- CORTO: «Ante esta entidad: se presentó 9 veces y ganó 6 (desde 2025)»
- CONCISO: `lib/handlers/perfil/seguimiento.js:341-393` ya cruza `hgi6-6wh3` (proponentes) con p6dx (ganadas) por competidor y entidad y publica «veces» y «ganadas» por separado; A4 no verificó que ninguna pantalla enseñe el par junto. Se enseña en el modal del competidor cuando la entidad de origen está fijada. `hgi6` no tiene filas para procesos abiertos y llega tras la apertura (`lib/proponentes.js:8-10`).
- BENEFICIA: «¿este competidor gana siempre que se presenta aquí?» es la lectura más rápida del pliego a la medida (E5, P16).
- AFECTA: consulta externa en vivo con tope de 6 s (`lib/proponentes.js:45`); una fuente caída no se cachea y se repite en cada apertura (A2 § 3.4): va detrás del clic y con «sin dato de proponentes hoy» cuando falla.
- *externo · medido · experimentado · E5/E16 · tanda 3*

### 4.3 Más procesos que quepan: cupo, Mipyme y calendario (tanda 3)

**DUE-36 · Cabe en el tope Mipyme** — nuevo
- CORTO: «Cabe en el tope Mipyme ($511,7 M en 2026): con Génesis conserva esa opción; con PRODIAC no» (solo si la cuantía es menor que el umbral)
- CONCISO: `cuantia_cop < UMBRAL_MIPYME_2026` (`lib/socio_por_proceso.js:44-49`, cifra con fecha y fuente en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md § «V-12 · Umbrales y cifras de 2026»`) + `tamanoEmpresa` publicado de cada perfil (`lib/perfiles.js:86,121,156`; `NO_ES_MIPYME`, `lib/socio_por_proceso.js:53`). Es exactamente la sospecha que hoy produce `aviso_mipyme` (A3 § (b)), enseñada como chip informativo en el plegado y como aviso en la línea de socio cuando la socia grande la cerraría. El corpus NO publica si la convocatoria quedó limitada: nunca se afirma «limitada», solo «cabe en el tope».
- BENEFICIA: para una microempresa es la ventaja más barata del mercado: por debajo del umbral, presentarse con Génesis (micro + micro) deja abierta la posibilidad de una convocatoria solo para Mipyme; ir con PRODIAC la cierra. Elegir socia por proceso, con este dato, es «adjudicar más» sin bajar el precio.
- AFECTA: la regla de cuántas Mipyme deben pedir la limitación y cuándo (A5 W10 la cita como «al menos dos» y «un día hábil antes del acto de apertura», resumen del buscador, norma NO leída) no se escribe en pantalla hasta leer la norma: el chip solo compara cuantía con umbral. El umbral cambia cada año (revisarlo en enero, como dice el propio código).
- *petición · calculado · ambos · E15 · tanda 3*

**DUE-37 · Días de oficina que da la entidad para ofertar** — nuevo
- CORTO: «Da 30 días de oficina para ofertar (publicado el 1 de sep, cierra el 14 de oct)» · «Esta entidad suele dar 21 días de oficina; este proceso da 9»
- CONCISO: por proceso, `lib/habiles.habilesEntre(fecha_de_publicacion_del, fecha_cierre)` (las dos fechas viajan; ejecutado en D-experimentado: 30 días de oficina, 42 de calendario); por entidad, la mediana de esa cuenta sobre sus procesos históricos (mínimo 5, `lib/estadistica`), acumulada en el índice de competencia. Censo: `dias_para_ofertar|plazo_para_ofertar` → 0 en los índices (A5 § 7.7).
- BENEFICIA: P14 («¿cuánto tiempo necesito y cuánto me da?») y la mitad de la señal #5 (plazo mínimo legal = pliego a la medida) sin leer el pliego.
- AFECTA: «días de oficina» y no «hábiles» (la suite prohíbe «hábiles» en pantalla, `tests/e2e.js:13082`); una adenda que movió el cierre cambia la cuenta (DUE-15 lo dice al lado).
- *sync · calculado · ambos · P14 · tanda 3*

**DUE-38 · Cierre en fecha trampa** — nuevo
- CORTO: «Cierra entre el 20 de diciembre y el 10 de enero: pocos días de oficina para preparar la oferta» · «El cierre cae el día siguiente a un festivo: confirme la hora en el cronograma»
- CONCISO: `fecha_cierre` contra `lib/habiles.esFestivo` y la ventana 20-dic a 10-ene (señal #10 del manual, cap. 18; D-experimentado ejecutó `esFestivo(2026-10-12) = true`, `esHabil(2026-10-13) = true`). Ámbar, informativo, nunca bloquea.
- BENEFICIA: retirarse temprano de un pliego con calendario diseñado para que nadie llegue (E5/P16).
- AFECTA: es una lectura, no una prueba de mala fe: el texto lo dice con «pocos días», no con «a la medida».
- *petición · calculado · experimentado · E5/P16 · tanda 3*

**DUE-39 · Cuánto tarda en adjudicar y cuántos declara desiertos** — cambia (existe en el modal; pasa a la tarjeta plegada)
- CORTO: «Adjudica en unos 7 días de oficina tras el cierre (8 procesos) · Declaró desierto 1 de 9»
- CONCISO: `hechosDeRegistro` (`lib/indice_competencia.js:479-500`) ya publica en el hash `plazo_adjudicacion {mediana_dias_habiles, p75, base}` y `desiertos {n, adjudicados, base, pct}` con mínimo 5; hoy los lee solo el modal (`lib/competencia_detalle.js:394-397`) y `competenciaDe` no los pasa a la fila (ejecutado en D-experimentado: `plazo_adjudicacion in comp === false`). Se añaden a `competencia_entidad` (≤ 183 B por fila, medido) y se pintan en el plegado.
- BENEFICIA: cuándo se firma y cuándo se libera el cupo (E7); una entidad que declara desierto 1 de 3 avisa antes de invertir en la oferta.
- AFECTA: bytes por fila; «días de oficina» en pantalla; bajo el mínimo, «sin dato».
- *petición · medido · ambos · E7 · tanda 2*

**DUE-40 · Cuántas obras adjudica al año esta entidad** — cambia (viaja; no se pinta)
- CORTO: «Adjudicó 25 obras en 2025 y 10 en lo que va de 2026 (las que sigue la aplicación)»
- CONCISO: `competencia_entidad.por_anio` ya viaja en la fila (`lib/indice_competencia.js:377-386`: conteo siempre, promedio solo con mínimo) y la tarjeta no lo usa (A1 § 2). Conteo por año de adjudicación en el corpus (obra y afines, competitivas, desde 2024): cota inferior.
- BENEFICIA: el dueño decide dónde invertir relación y RUP: una entidad que adjudica 25 obras al año vale más seguimiento que una que adjudica 2 (E10).
- AFECTA: nada de bytes; se dice «las que sigue la aplicación».
- *petición · medido · experimentado · E10 · tanda 2*

**DUE-41 · Cupo que le queda: después de esta obra y si gana lo que tiene guardado** — nuevo
- CORTO: en la tarjeta (plegado): «Con anticipo del 30 %, le quedarían $15 M de cupo después de esta obra»; en Mis procesos (cabecera): «Si gana todo lo que marcó «me presenté», compromete $9.200 M de sus $4.471 M de cupo: no le caben todas»
- CONCISO: por tarjeta, `p2_k.crp − p2_k.crpc` (los dos viajan, A1 § 2; ejecutado hoy: $4.470.921.189 − $4.456.104.580 = **$14.816.609**, 0,33 % de la K) con el anticipo que rija (publicado, declarado o el mínimo para caber). En Mis procesos, la suma de `crpc` de los guardados en estado «me presenté» frente a la K del perfil: no existe hoy (censo: `comprometid|cartera` en `lib/handlers/perfil/*` y `public/app.js` → solo el «valor comprometido» del COMPETIDOR, `lib/seguimiento.js:28,529`, `public/app.js:4551`). La K hereda el «se asume 0» (DUE-43 la corrige).
- BENEFICIA: la palanca (a) del dueño: presentarse a más procesos sin prometer lo que la K no permite firmar; y saber que Purificación cabe «por un pelo».
- AFECTA: sin token, nada (finanzas del perfil); es un calculado sobre un techo (DUE-24) y lo dice; una obra en ejecución no cargada lo vuelve optimista.
- *petición · calculado · ambos · P3/E1 · tanda 3*

**DUE-42 · Con quién ha ganado** — nuevo
- CORTO: «Presentadas 12 · ganadas 3 (2 con Génesis, 1 solo) · 4 sin resultado todavía»
- CONCISO: en Mis procesos ya existe «Ganó 1 de 3 presentadas» solo con ≥ 3 presentadas (`public/app.js:4316-4338`); el expediente guarda el consejo de socio congelado al crear (`congelarSocio`, `lib/handlers/perfil/seguimiento.js:168-181`) y el desenlace fijado por el usuario («ganado»/«perdido», `:139-142`, `S.desenlaceDe`). Se agrupa por `socio.recomendacion.socio` congelado. Es lo que el usuario marcó, no lo que consorció de verdad (si fue con otra socia, no se sabe): rótulo «según el consejo guardado».
- BENEFICIA: el postmortem que el manual pide (E16) y la respuesta real a «¿con quién gano más?», acumulada sin trabajo.
- AFECTA: mínimo 3 presentadas como hoy; un consejo distinto del consorcio real desvía la cuenta, y se declara.
- *petición · medido · experimentado · E16 · tanda 3*

**DUE-43 · Cupo real: los contratos en ejecución de usted y de sus socias** — nuevo
- CORTO: «Cupo calculado sin descontar contratos en ejecución: no hay ninguno cargado» → «Descuenta 2 contratos en ejecución de SECOP II ($1.900 M por ejecutar, calculado)»
- CONCISO: `lib/socio.js:26-32` ya consulta `jbjy-vk9h` por `documento_proveedor` para el socio; la misma consulta con el NIT de cada perfil (los tres tienen NIT: MEMORIA § «Por qué se escoge —o se cambia— de socio: siete razones con su norma (11-sep-2026)») da los contratos «En ejecución» con valor y fechas, que es lo que la Guía CCE pide restar (A5 § 4.5). El saldo se aproxima con «valor × meses restantes / plazo» (la fórmula que `calcSCE` ya implementa) porque `valor_pagado` es sin dato para media Colombia (`lib/ejecucion.js:19-22`); la cifra cargada a mano (certificado) gana. `resumenPerfiles` omite `prodiac` (`lib/handlers/admin/rup.js:78-92`, ejecutado en A3): hay que incluirlo antes de cargar el SCE de PRODIAC.
- BENEFICIA: la K deja de ser un techo mudo: hoy `[capacidad] SCE … se asume 0 (capacidad posiblemente optimista)` sale en cada evaluación. Un cupo optimista es exactamente la «cifra creíble equivocada» que el dueño no puede permitirse.
- AFECTA: fuente externa (Socrata) con caché; un contrato mal cerrado en SECOP (estado «En ejecución» vencido) resta cupo que sí existe: se lista y se puede excluir a mano.
- *externo · calculado · ambos · P3/E1 · tanda 3*

**DUE-46 · Su historial con esta entidad** — nuevo
- CORTO: «Ya se presentó aquí 2 veces y ganó 1»
- CONCISO: los guardados del perfil con esa `entidad` y su desenlace (`lib/handlers/perfil/seguimiento.js`), calculados en el servidor al servir la página (el listado ya carga por proceso los costos del dueño, `listar.js:444`: misma ruta). Solo con token; solo si hay al menos un guardado con desenlace en esa entidad.
- BENEFICIA: en un vistazo, dónde ya tiene pie (relación, formatos, conocimiento del pliego) y dónde ya perdió.
- AFECTA: 30-40 B en las filas donde aplica; un desenlace sin marcar no cuenta como derrota (regla de `:139-142`).
- *petición · medido · ambos · E16 · tanda 3*

**DUE-50 · Plazo de obra y ritmo mensual** — nuevo (en la tarjeta; el plazo ya está en el expediente)
- CORTO: «Plazo 8 meses · unos $796 M por mes de obra» / «Plazo de obra no publicado»
- CONCISO: `duracion` + `unidad_de_duracion` (viajan; hoy solo en `public/expediente.js:405`) con `lib/capacidad.plazoMesesDe` (llamada, no reescrita; ejecutado: 8), y cuantía ÷ meses (ejecutado: $795.732.961). Sin duración: «no publicado», jamás los 12 meses que la K asume por dentro (A4 C8).
- BENEFICIA: quien empieza ve el tamaño real del compromiso mensual (facturación, personal, caja); el experimentado lo compara con su cupo y con DUE-43.
- AFECTA: ritmo es aritmética (no flujo de caja real: actas, retenciones); se dice «unos».
- *petición · calculado · ambos · P3/E3 · tanda 1*

**DUE-51 · Lo que cuesta presentarse** — se conserva (expediente); la tarjeta enlaza
- CORTO: «Garantía de seriedad asegurada: $637 M (10 %) · Contribución de obra pública 5 %: $318 M · Financiar antes del primer pago: ≈ $1.273 M»
- CONCISO: `guiaDe(...).dinero` (`lib/guia_proceso.js`; ejecutado en D-sin_experiencia: 636.586.369 / 318.293.184 / 1.273.172.737; `anticipo_cop: null`). La base de la garantía (presupuesto en la guía, oferta en el dictamen) es un par por resolver (A5 § 6.2): hasta entonces la guía dice «asegurada sobre el presupuesto oficial».
- BENEFICIA: E3: el costo que no está en el APU, antes de decidir.
- AFECTA: nada nuevo; el 10 % y el 5 % ya están citados en el árbol con su norma.
- *clic · calculado · ambos · E3 · tanda 1 (sin cambio)*

### 4.4 Lo que exige una extracción completa, el pliego o una fuente externa (tanda 4)

**DUE-44 · Experiencia por contratos de cada socia** — nuevo
- CORTO: «Génesis acredita 14 contratos de pavimentación por $9.800 M (RUP 2023)» / «PRODIAC: experiencia por contratos sin cargar»
- CONCISO: `POST /api/admin?op=experiencia` ya valida y guarda `{contratos:[…]}` (`lib/experiencia.js`); la clave es única y compartida (`lib/almacen.js:180`): hay que hacerla POR PERFIL antes de cargar dos socias, o una tapa a la otra (A3 § (d)). Los 106 de Génesis existen en el árbol (`experiencia_genesis_106.json`; carga en producción NO VERIFICABLE); los 327 de PRODIAC no existen en el árbol. Con esto, «aporta la experiencia» pasa de «tiene la clase» a «acredita N contratos de este tipo», y el reparto 40 % se justifica con contratos.
- BENEFICIA: elegir la socia que acredita la experiencia que pide el pliego, y darle el porcentaje que el pliego exige a quien la aporta (E9).
- AFECTA: sin archivo de PRODIAC, «sin cargar» (nunca 0 contratos); el pliego concreto puede pedir otra definición de experiencia (las tablas de experiencia siguen sin leerse, `lib/guia_proceso.js:68`).
- *clic · publicado · experimentado · E9 · tanda 4*

**DUE-45 · Lo que el pliego pide en consorcio** — nuevo (regla nueva del dictamen)
- CORTO: «El pliego limita la convocatoria a Mipyme (pág. 12)» · «Exige al menos 40 % al integrante que aporte la experiencia (pág. 31)» · «Máximo 3 integrantes»
- CONCISO: el lector de pliegos (`op=dictamen`, `lib/dictamen_reglas.js:45-60,88-92`) hoy no tiene regla para «convocatoria limitada», «Mipyme», «integrante» ni «proponente plural» (grep en A3 § (d): solo `NOTA_PLURAL`). Tres detectores nuevos con evidencia y página, como los existentes. El recomendador convierte el aviso Mipyme en hecho y el 40 % sugerido en la cifra del pliego.
- BENEFICIA: «con quién» deja de ser una estimación en los procesos con pliego leído: es lo que el pliego dice, con página.
- AFECTA: solo cuando hay pliego (índice `dmgg-8hin` desde 2025 o carga manual); sin pliego, `sin_dato`. Una regex que no case deja el dato en «por leer», nunca en «no lo exige».
- *clic · publicado · experimentado · E9/E15 · tanda 4*

**DUE-47 · Republicado / modificado desde su publicación** — nuevo
- CORTO: «Republicado el 3 de septiembre (puede ser una adenda o una publicación de fase)»
- CONCISO: `fecha_de_ultima_publicaci` de p6dx (100 % de cobertura en el censo del 16-ago, A4 #15) hoy se descarta en la proyección (`lib/proyeccion.js:38-61`; reproducido en A4). Entra en `CAMPOS`, exige una full para los registros viejos, y tres consumidores ya escritos empiezan a recibirla (`lib/dictamen.js:404`, `lib/cronograma.js:91`, `lib/manifestacion.js:134`). No se afirma «adenda»: solo «republicado» con fecha.
- BENEFICIA: la señal de cambio de reglas sin leer ningún pliego (E8), para los procesos que la ingesta no vio cambiar entre versiones.
- AFECTA: una full; el texto no promete más de lo que la columna dice.
- *sync · publicado · ambos · E8 · tanda 4*

**DUE-48 · Proceso por lotes** — nuevo
- CORTO: «Se adjudica por lotes: 3»
- CONCISO: `numero_de_lotes` llega solo al histórico (`lib/indice_competencia.js:121-127`; reproducido en A4: activa `undefined`, histórica `3`) y ningún módulo lo lee. Entra en la proyección activa (full) y se mide cobertura antes de pintar nada.
- BENEFICIA: para adjudicar MÁS, un proceso con 3 lotes son 3 oportunidades con una sola oferta; y explica los «adjudicados por debajo del 30 % del oficial» que el índice de baja excluye como lotes parciales (`lib/indice_baja.js:23-26`).
- AFECTA: el presupuesto por lote NO está en el dataset: la cuantía sigue siendo la total y se dice; cobertura sin medir (A4).
- *sync · publicado · experimentado · E1 · tanda 4*

**DUE-49 · Ganadores locales frente a foráneos en esta entidad** — nuevo
- CORTO: «7 de cada 10 ganadores aquí tienen domicilio registrado en Tolima (12 contratos)»
- CONCISO: `departamento_proveedor` se guarda en el histórico y ningún módulo la lee (A4 #45-46, grep); en el barrido del índice se cuenta, por entidad, la proporción de adjudicatarios con `departamento_proveedor` igual a `departamento_entidad` (mínimo 5). Domicilio registrado en SECOP, no sede real; «No Definido» cuenta aparte.
- BENEFICIA: para un dueño de Ibagué, saber que en Purificación ganan los de Tolima es saber que su zona es una ventaja, no solo un ahorro de viáticos.
- AFECTA: bytes en el registro del índice (~20 B); se dice «domicilio registrado».
- *sync · calculado · experimentado · E5 · tanda 4*

**DUE-52 · Versión de documento tipo que rige** — nuevo
- CORTO: «Probablemente rigen los documentos tipo de infraestructura social vigentes desde febrero de 2026: confírmelo en el aviso de convocatoria»
- CONCISO: sector (objeto, `tipo_de_contrato`, `codigo_principal_de_categoria`) + `fecha_de_publicacion_del` ≥ 16-feb-2026 (`lib/dictamen.js:311-312` ya lo escribe como norma citable; A5 § 4.1). Deducción, rotulada «probablemente», y un dato publicado (el aviso) gana.
- BENEFICIA: E11: distinguir un pliego desactualizado de uno a la medida; saber qué formatos y qué fórmula de experiencia aplican.
- AFECTA: es un estimado y lo dice; la norma no se leyó desde este entorno (NO VERIFICABLE hoy: dominios bloqueados, A5 § 8).
- *petición · estimado · experimentado · E11 · tanda 4*

**DUE-53 · Estampillas y descuentos vistos en pliegos de esta entidad** — nuevo
- CORTO: «Estampillas vistas en pliegos de esta entidad: 1,5 % (2 pliegos, el último el 3 de sep)»
- CONCISO: `lib/deducciones.js` ya extrae concepto, porcentaje, evidencia y página de cada pliego leído (A5 § 7.3); cada lectura acumula `(entidad, concepto, pct, fecha, id)` en una clave propia y la tarjeta enseña la última observación con su conteo. Observación con fecha, no tarifa; el pliego del proceso concreto gana siempre.
- BENEFICIA: E3: «no hay tabla nacional que copiar» (`lib/deducciones.js:12-16`): la tabla se construye sola con lo que el dueño ya lee.
- AFECTA: solo entidades con pliegos leídos; «lo que descontó en otros procesos», jamás «lo que le van a descontar».
- *clic · medido · experimentado · E3 · tanda 4*

**DUE-54 · Quiénes cargaron oferta en este proceso** — nuevo
- CORTO: «Archivos de oferta cargados: 4 (nombres leídos del índice de SECOP II)»
- CONCISO: `dmgg-8hin` (índice de archivos por proceso desde 2025) mezcla archivos de la entidad y de los proponentes; `lib/documentos_proceso.js:37-40,183` ya los separa por nombre y fecha (A5 § 4.4). Se agrupan por proponente cuando el nombre del archivo lo identifica; jamás como lista cerrada de oferentes. El índice va ~3 días por detrás.
- BENEFICIA: contra quién compite de verdad, el día después del cierre y antes del informe de evaluación (E13, E5).
- AFECTA: fuente externa; heurística sobre nombres de archivo (estimado) y se rotula así; no se leen ofertas ajenas.
- *externo · estimado · experimentado · E13/E5 · tanda 4*

**DUE-55 · En todo SECOP II (segunda cifra, declarada)** — nuevo (complemento del perfil del competidor)
- CORTO: «En todo SECOP II: 41 contratos por $380.000 M desde 2024 (todas las modalidades)»
- CONCISO: `lib/socio.js:333-360` ya agrupa en datos.gov.co las adjudicaciones de un NIT por año (`$group=anio`, `sum(valor_total_adjudicacion)`); un `$group=entidad` daría «en qué entidades». Solo ganadores con NIT; una petición HTTP; best-effort (A2 § 4.4). Se enseña como SEGUNDA cifra al lado de la del corpus, nunca en su lugar.
- BENEFICIA: el corpus es cota inferior (obra y afines desde 2024); esta cifra dice cuánto más grande es el rival fuera de lo que la aplicación sigue.
- AFECTA: latencia externa (NO VERIFICABLE aquí: proxy 403), tope de espera y «sin dato» si falla; nunca se suman las dos cifras.
- *externo · medido · experimentado · E5 · tanda 4*

**DUE-56 · Campo `alcanzable_con_socio`** — se retira de la fila (no se ve)
- CORTO: (no se pinta)
- CONCISO: `socioQueAlcanza` (`lib/socio_por_proceso.js:282-295`) devuelve el PRIMER socio que alcanza en el orden de candidatos y viaja con nombre completo (`listar.js:920`); `socio.recomendacion.socio` es el mejor tras el `sort` (`:384-388`). Reproducido hoy en CO1.REQ.900002: `alcanzable_con_socio = genesis`, recomendación = `prodiac`. Se retira de la fila (o se hace coincidir con `socio.con`) para que ninguna pantalla futura pinte Génesis donde el expediente dirá PRODIAC.
- BENEFICIA: un solo «con quién».
- AFECTA: `lib/filtros.js:692-696` lo usa para rescatar filas: se conserva el rescate, se deja de publicar el nombre.
- *petición · calculado · ambos · E9 · tanda 1*

---

## 5. El orden en pantalla

**Arriba (lo que se VE, sin tocar nada):**
1. Cabecera (DUE-01) + referencia (DUE-02) + modalidad en texto pequeño.
2. Cuantía (DUE-03) · plazo y ritmo (DUE-50).
3. Línea de requisitos (DUE-05) o chip «no le alcanza solo · con X sí» (DUE-04).
4. **Con quién conviene** (DUE-06): una línea, color verde / ámbar / gris.
5. Tres cifras: rivales medidos (DUE-07) · «1 de N» solo con base (DUE-08) · lo que deja o a cuánto suele adjudicar (DUE-09) + «Ver cómo se calcula» (DUE-10).
6. Chips: cierre con hora (DUE-11) · avisar interés (DUE-12) · prórroga con días (DUE-15) · zona (DUE-14) · «Activo · abierto» (DUE-30).
7. **Dos botones que abren modales**: «Poca competencia · 1,4 por proceso · 55 procesos ›» (DUE-13) y «Quien más gana aquí: X · 6 de 15 ›» (DUE-31).
8. Avisos solo cuando deciden: señal #11 (DUE-13), cierre ≤ 2 días (DUE-16), cambio de reglas (DUE-17), fecha trampa (DUE-38, ámbar).

**Plegado «Más detalles» (lo que se TOCA):** puertas en llano con cifra (DUE-19) · anticipo en tres estados (DUE-20) · cupo que queda tras esta obra (DUE-41) · suelen bajar con origen (DUE-21) · cómo se adjudica en el departamento (DUE-27) · adjudica en N días de oficina y desiertos (DUE-39) · obras al año (DUE-40) · días de oficina para ofertar (DUE-37) · tope Mipyme (DUE-36) · su historial con la entidad (DUE-46) · ubicación (DUE-22) · encaje (DUE-23) · ingreso estimado (DUE-24) · precio unitario/global (DUE-26) · lotes (DUE-48) · republicado (DUE-47) · documento tipo (DUE-52) · estampillas vistas (DUE-53).

**Pie:** estado · Guardar (DUE-28) · Calcular mi precio (DUE-29) · Ver en SECOP II.

**Modal de la entidad («Competencia histórica»):** lo de hoy (banda, resumen, por año, prórroga, plazo, desiertos, encogimiento, adjudicatarios, proponentes, ejecución, tablas) + ganadores locales (DUE-49) + días de oficina que suele dar (DUE-37) + filas de adjudicatarios con «Ver dónde más gana ›» y segmentos de la barra pulsables (DUE-32).

**Modal del competidor («Dónde gana este competidor»):** cabecera con cota y base (DUE-32) · origen y frescura (DUE-33) · por departamento (DUE-34) · tabla por entidad · cara a cara ante la entidad de origen (DUE-35) · «En todo SECOP II» (DUE-55) · baja media (hoy).

**Expediente (Mis procesos):** el consejo congelado con fecha (hoy) + «Hoy, con los datos actuales, diría: …» solo si difiere (opción de A3 § (e)) · lo que cuesta presentarse (DUE-51) · lo que el pliego pide en consorcio (DUE-45) · experiencia por contratos de la socia (DUE-44).

**Cabecera de Mis procesos:** cupo comprometido si gana lo marcado (DUE-41) · con quién ha ganado (DUE-42).

**Bytes.** Nuevo por fila con credencial: socio 96-184 B (medido) + líder 86 B + hechos ≤ 183 B + para_ofertar ≈ 40 B + plazo 15 B + historial 0-40 B ≈ 420-550 B sobre una fila que hoy pesa 7.865-8.147 B en el ejemplo (medido hoy); ×100 filas (`por_pagina` máx.) ≈ 55 KB frente al corte de 4,5 MiB (`lib/cuerpo.js:39`). Sin credencial: líder, hechos de precio y cupo van a `null` (`lib/publico.js`), como hoy.

---

## 6. Maqueta en texto · el proceso de la captura

**HOY (texto visible ejecutado con el handler real y `tarjeta()` real, `d_dueno_tarjeta.salida.txt`, variante «anticipo no publicado»; la celda «1 de 3» y «~1,4 oferentes en 55» son de la captura del dueño, el fixture sin encogimiento dio «1 de 2»):**

```
PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA
ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Tolima
$ 6.365.863.685   cuantía alta
● Cumple los requisitos, con detalles por revisar.
[~1 empresa suele competir · en 55 procesos] [1 de 3 se gana, aproximadamente · Poca competencia en esta entidad (~1,4 oferentes).] [Calcular · cuánto deja: falta su costo · se calcula en Precios]
Ver cómo se calcula
Cierra en 32 días · 14 de oct de 2026   ● Poca competencia · 1,4 en 55 ›   Su zona (Ibagué)
Atención: aquí se presentan 1,4 oferentes en promedio. Puede ser un nicho suyo … o un pliego escrito a la medida de otro …
▸ Más detalles
  ● Registro de proponente ✓  ● Capacidad de facturar ~  ● Caja ?  ● Competencia ✓
  ● Registro de proponente · La clase UNSPSC del proceso está inscrita en su RUP.
  ● Capacidad de facturar · SECOP II no publica el anticipo de este proceso. Sin anticipo la carga (CRPC $6.365.863.685) supera su capacidad residual (K $4.470.921.189): el proceso solo cabe si el pliego prevé un anticipo del 30 % o más. Confírmelo en el pliego antes de decidir.
  ● Caja · SECOP II no publica el anticipo de este proceso. Si no hubiera ninguno, necesitaría financiar ≈ $1.273.172.737 antes del primer cobro y su patrimonio es $1.107.252.964. Confirme el anticipo en el pliego antes de decidir.
  ● Competencia · Competencia baja: promedio 1.4 oferentes en 55 procesos del histórico.
  Anticipo no declarado · Suelen bajar: sin datos · PURIFICACIÓN · Encaja con su registro ✓ · Obra civil · Capacidad calculada con ingreso estimado · Licitación pública
  Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos. En TOLIMA se gana sin bajar el precio: …
Publicado   Guardar   Calcular mi precio   Ver en SECOP II ↗
```

Lo que el dueño NO ve hoy: con quién ir (calla en «solo»); que cabe solo con anticipo ≥ 30 % está enterrado en el plegado con siglas; quién gana aquí; la hora del cierre; el plazo de obra; la referencia; cuánto cupo le queda.

**REFORMADA (propuesta; cifras reales de las reproducciones, el líder y los días son ejemplos rotulados):**

```
PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA
ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Tolima · Ref. LP-008-2026 · Licitación pública
$ 6.365.863.685 · Plazo 8 meses · unos $796 M por mes de obra
● Puede presentarse; falta confirmar el anticipo en el pliego.
● Con quién: Solo si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC (80/20).   [ámbar]
[1,4 empresas por proceso · 55 procesos] [1 de 3 se gana, aproximadamente · estimado con los 55 procesos de esta entidad] [Calcular · cuánto deja: falta su costo · se calcula en Precios]
Ver cómo se calcula
Cierra en 32 días · mié 14 de oct · 3:00 p. m.   Da 30 días de oficina para ofertar   Su zona (Ibagué)
● Poca competencia · 1,4 por proceso · 55 procesos ›     Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›   (ejemplo)
Atención: aquí se presentan 1,4 oferentes en promedio. Puede ser un nicho suyo … o un pliego escrito a la medida de otro … (se conserva)
▸ Más detalles
  ● Su registro ✓ · La actividad de este proceso está inscrita en su RUP.
  ● Cupo ~ · Sin anticipo, esta obra pide $6.366 M de cupo y a usted le quedan $4.471 M: cabe solo con un anticipo del 30 % o más. Con el 30 %, le quedarían $15 M de cupo después de esta obra.
  ● Caja ? · Sin anticipo necesitaría financiar ≈ $1.273 M antes del primer cobro; su patrimonio es $1.107 M (faltarían ≈ $166 M).
  ● Competencia ✓ · 1,4 oferentes por proceso en 55 procesos.
  Anticipo: no publicado · cabe solo con anticipo del 30 % o más
  Suelen bajar: sin datos de esta entidad · Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos.
  Adjudica en unos 7 días de oficina tras el cierre (8 procesos) · Declaró desierto 1 de 9 · Adjudicó 25 obras en 2025 (las que sigue la aplicación)   (ejemplo)
  Cupo calculado sin descontar contratos en ejecución: no hay ninguno cargado
  PURIFICACIÓN ✓ · Encaja con su registro ✓ · Obra civil · Cupo calculado con un ingreso estimado: cargue el ingreso de su RUP en Mi empresa
Publicado   Guardar   Calcular mi precio   Ver en SECOP II ↗
```

(El chip «Cabe en el tope Mipyme» no aparece: $6.366 M supera el umbral. En una obra de $400 M sí aparecería: «Cabe en el tope Mipyme ($511,7 M en 2026): con Génesis conserva esa opción; con PRODIAC no».)

**Si el pliego declara «sin anticipo» (variante CO1.REQ.900002, ejecutada):** el chip pasa a «No le alcanza solo · con PRODIAC sí» (ámbar, tarjeta viva), la línea de socio dice «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» (y el expediente: Génesis también cierra, capacidad juntos $8.987 M; PRODIAC gana por respaldo), y el anticipo: «Sin anticipo (lo dice el pliego)» en vez del «Anticipo no declarado» de hoy.

---

## 7. «Con quién conviene» en cada tarjeta: estados, textos y regla

| Estado (`socio.tipo`) | Cuándo | CORTO (línea del servidor, ≤ 90 caracteres) | Color |
|---|---|---|---|
| `solo` | `falta = []` y P2/P3 sin depender del anticipo | «Solo: le alcanza sin socio.» | gris |
| `segun_anticipo` (nuevo) | anticipo no publicado y `rup.k_depende_del_anticipo` o P3 `sin_dato_de: anticipo`; la contrafáctica «sin anticipo» da `con_socio` | «Solo si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC (80/20).» | ámbar |
| `con_socio` · cierra · aporta actividad | `abre` incluye `actividad` | «Conviene con Génesis: tiene la actividad que a usted le falta · reparto sugerido 60/40» | verde |
| `con_socio` · cierra · aporta respaldo | `abre` solo capacidad/caja/tope | «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» | verde |
| `con_socio` · cierra · aviso Mipyme | `aviso_mipyme` en la mejor opción | «Conviene con PRODIAC, pero no cabe si la convocatoria es solo para Mipyme.» | ámbar |
| `con_socio` · NO cierra | `cierra_todo: false` | «Con Génesis se acerca, pero puede no bastar: falta respaldo para financiar la obra.» | ámbar |
| `ninguna_sirve` (socios) | ninguna opción abre lo que falta | «Ninguna de las dos alcanza lo que falta.» | rojo |
| `ninguna_sirve` (objeto) | la fila no es obra para nadie | (no se pinta: ya sale descartada por objeto) | — |

Reglas: (1) la línea la escribe el servidor en el mismo módulo que escribe `frase` (una sola redacción: tarjeta y expediente salen de la misma función; A3 § (c)); (2) hace falta `nombreCorto` en `lib/perfiles.js` («Génesis», «PRODIAC»; hoy no existe); (3) «tiene la actividad», nunca «tiene la experiencia» (hecho 3 de § 1); (4) el reparto 60/40 y 80/20 son los de `lib/socio_por_proceso.js:217-244` (el 20 % «por encima del 10 % el socio sigue contando…» va sin fuente en el árbol: A3 lo rotula así; DUE-45 lo sustituye por la cifra del pliego cuando la haya); (5) el congelado al guardar no se toca: la tarjeta dice el consejo de HOY y el expediente el del día que decidió, con fecha (A3 § (e)); (6) `alcanzable_con_socio` se retira (DUE-56).

Cerraduras a reescribir a propósito: `tests/e2e.js:4706-4707` (claves del resumen), `:4732-4737` (textos de «solo» y «con un socio»); nuevas: la línea y la `frase` nombran al mismo socio (mutación: hacer que la tarjeta lea `alcanzable_con_socio`), `linea` ≤ 90, `nombreCorto` en los tres perfiles y en `perfilDesdeConfig`, las ocho líneas pasan `tuteoEn`/emoji/sin «cumple»; y `segun_anticipo` con la mutación «si la contrafáctica no se evalúa, la línea vuelve a decir solo».

---

## 8. «Dónde más gana este competidor», casi instantáneo, con la espera animada

**Desde dónde se llega con UN clic.** Desde la tarjeta, el botón «Quien más gana aquí: X · 6 de 15 ›» (DUE-31) llama a `cargarAdjudicatario(clave, nombre)` (`public/app.js:3382-3392`), que ya abre el modal `#modal-competencia` con `abrirModal(nombre, "Dónde gana este competidor", …)`. Segunda puerta, en el modal de la entidad: la fila del adjudicatario con texto «Ver dónde más gana ›» y los segmentos de la barra pulsables (hoy 3 clics y sin afordancia, A2 § 1.3).

**Qué se ve mientras carga.** `#modal-cuerpo` con `aria-busy="true"`, el título ya con el nombre del competidor, la frase «Buscando dónde más gana esta empresa…» (pasa las cercas, ejecutado) y un esqueleto con la FORMA del resultado: una línea de cabecera y cinco filas de tabla (Entidad · Ganados · Valor · Último), con el keyframe `brillo` de 1,5 s que ya existe (`public/index.html:789-794`) y `--dur-2` para aparecer / `--dur-4` para el reemplazo (`public/index.html:205-212`); **sin `@keyframes` nuevo** (V4-19 quiere borrar cuatro, no añadir), sin `--dur-5` (reservado al realce `.dato-cambio`). Bajo «Reducir movimiento» (`prefers-reduced-motion`, `public/index.html:836-855`): gris plano, sin brillo, sin `.spin`, y el esqueleto desaparece de golpe cuando llega el dato. Si el servidor responde `origen: "barrido"`, el mensaje cambia a «Esta empresa no está en el índice: se recorre el histórico completo. Puede tardar unos segundos.» — «decir qué falta en unidades del oficio», no un truco para acortar la espera percibida (`docs/INVESTIGACION_DISENO_WEB.md § «9. Plan de la piel v4»`, § 9.5).

**Por qué es casi instantáneo.** Índice inverso `indice:adjudicatario` (A2 § 4.2): construido en el mismo barrido de `construirIndice` (`lib/indice_competencia.js:944`), reanudable con clave propia de progreso, publicado por `HSET` de 200 campos con swap atómico; servido por `op=competidor` con `GET` meta + `HGET` (2-3 comandos); fallback al barrido de hoy; cerradura: el registro publicado cuadra con `detalleAdjudicatario` sobre el mismo corpus (el prototipo cuadró 155/155 · 143/143 · 147/147 y 253/253 · 224/224 · 238/238), más su mutación. La caché de barrido sube a v8.

**Lo que se declara en pantalla** (A2 § 5): «con datos hasta <fecha de construcción>» cuando viene del índice; «al día de hoy» cuando viene del barrido; identidad por nombre en la cabecera; cota inferior arriba; total «en 147 de 155 contratos con valor publicado».

**Cómo lo mide el dueño sin terminal:** pegar en Chrome `https://<dominio>/api/inteligencia?op=competidor&adjudicatario=nit:<NIT>&token=<token>` y leer `duracionMs`, `comandosRedis` y `origen` (con `&refrescar=1` fuerza el barrido).

---

## 9. Plan por sesiones (tandas)

Cada tanda: ECC 0-10 (`docs/PROMPT_INICIAL.md § «3. El ciclo ECC»`), pruebas escritas ANTES y que FALLAN contra el árbol anterior (mutación), lotes de ficheros disjuntos entre agentes, `tests/e2e.js` spliciado en serie, `node tests/e2e.js > salida.txt 2>&1; echo CODIGO=$?; tail -3 salida.txt` en 4/4 sin tuberías, navegador real a 390 px con consola limpia si se tocó `public/`, sección nueva al final de `docs/MEMORIA.md` con «En una línea:», `node tests/mapa.js --escribir`, PR contra `main` con la URL completa (A6 § 3).

| Tanda | Nombre | Datos | Ficheros principales | Cerraduras que caen a propósito / se escriben | Atajos mientras se trabaja (A6 § 5) |
|---|---|---|---|---|---|
| **1** | La tarjeta dice la verdad y con quién | DUE-02, 03, 04, 05, **06**, 07, 08, 09, 11, 19, 20, 21, 24, 29, 50, 56 | `lib/socio_por_proceso.js` (línea, `segun_anticipo`), `lib/perfiles.js` (`nombreCorto`), `lib/handlers/procesos/listar.js` (`resumenSocio`, `plazo_meses`, retiro de `alcanzable_con_socio`), `lib/puertas.js` (mensajes en llano, `anticipo_minimo_pct`), `public/app.js` (tarjeta), `tests/e2e.js`, `docs/MEMORIA.md` (+ marca SUPERADA en la sección del 11-sep) | Caen: `:4706-4737` (socio), las que fijen los textos actuales de P2/P3 y del chip de anticipo. Nuevas: línea ≤ 90 y mismo socio que `frase`; `anticipo_declarado` decide el chip (mutación: volver a `pct > 0`); celda 2 vacía sin base (mutación: pintar «1 de 5» con fuente supuesta); `plazo_meses` en la fila; un solo redondeo de oferentes | `E2E_SOLO="unidad socio por proceso"`, `"unidad capacidad"`, `"unidad puerta caja sin anticipo"`, `"unidad pantalla · public/app.js sin tooltip"`; luego `E2E_SOLO=iteraciones` |
| **2** | Quién gana aquí, en un clic y sin espera | DUE-**31**, **32**, **33**, 34, 13, 15, 39, 40 | `lib/indice_competencia.js` (líder, hechos a la fila, acumulador inverso), `lib/competencia_detalle.js` (función compartida de acumulación; camino índice/barrido), `lib/handlers/procesos/historico.js` (progreso), `lib/publico.js` (líder a null), `public/app.js` (botón, esqueleto, `pintarAdjudicatario`, fila con enlace), `public/index.html` (esqueleto en reduced-motion), `docs/MEMORIA.md` (decisión: el líder sale solo con credencial; supera `:1167-1168`) | Nuevas: registro del índice ≡ `detalleAdjudicatario` (mutación); `origen` y `construido` en la respuesta; sin líder no hay botón; `aria-busy` en `#modal-cuerpo`; la regla reducida cubre la clase nueva (`:27970-28000`); `procesos_con_valor` pintado. Se conserva `:13033` (tabla plegada) con el rótulo nuevo | `E2E_SOLO="unidad detalle de competencia"`, `"unidad índice de competencia"`, `"unidad adjudicatario"`; luego `iteraciones` |
| **3** | Más procesos que quepan: cupo, Mipyme, calendario | DUE-36, 37, 38, **41**, 42, 43, 46, 35 | `lib/habiles.js` (sin cambio; se llama), `lib/indice_competencia.js` (mediana de días de oficina por entidad), `lib/handlers/procesos/listar.js` (tope Mipyme, fecha trampa, historial), `lib/handlers/perfil/seguimiento.js` (cupo comprometido, con quién ganó), `lib/socio.js` + `lib/capacidad.js` (SCE desde jbjy por perfil), `lib/handlers/admin/rup.js` (`resumenPerfiles` con `prodiac`), `public/app.js` | Nuevas: umbral con fecha (mutación: comparar con ≥); días de oficina nunca «hábiles» en pantalla; cupo comprometido = Σ crpc de «me presenté» (mutación: contar «interesa»); SCE de jbjy resta de la K y la cifra cargada a mano gana; `resumenPerfiles` incluye `prodiac` | `E2E_SOLO="unidad capacidad"`, `"unidad socio por proceso"`, `"unidad perfiles contra el RUP"`; `iteraciones` |
| **4** | Lo que exige una extracción completa o el pliego | DUE-44, 45, 47, 48, 49, 52, 53, 54, 55 | `lib/proyeccion.js` (`CAMPOS`: `fecha_de_ultima_publicaci`, `numero_de_lotes`, `codigo_entidad`), `lib/columnas_historicas.js` (medir cobertura ANTES de pintar), `lib/experiencia.js` + `lib/almacen.js` (clave por perfil), `lib/dictamen_reglas.js` (tres detectores), `lib/deducciones.js` (acumulador), `lib/documentos_proceso.js`, `lib/socio.js` (`$group=entidad`), `docs/datos.md` (corregir «no hay dataset de multas»: A4) | Nuevas: una columna nueva no se pinta sin cobertura medida (mutación: pintar con 0 %); clave de experiencia por perfil (mutación: la de Génesis tapa a PRODIAC); detectores con evidencia y página; «republicado» nunca dice «adenda» | `E2E_SOLO="unidad censo de ingesta"` (vía `iteraciones`), `"unidad experiencia/cobertura"`, dictamen (`:34523`) |

Fuera de las tandas (decisiones del dueño): (1) publicar el líder de la entidad con credencial (toca la lista blanca de `/api/oportunidades`); (2) mover `EXPERIENCIA_PENDIENTE.md` a `docs/` con ficha (A6 § 2.3); (3) los cuatro puntos de gusto de la piel v4 (§ 9.6); (4) si quiere ver en el expediente «hoy diría …» junto al consejo congelado.

---

## 10. Cierre

### 10.1 Premisas del encargo que el árbol o los informes desmienten
- «Se quitó el perfil del competidor»: se escondió (A2 § 0, `df82f0d` del 6-sep plegó la tabla; el perfil entero sigue en `lib/competencia_detalle.js:547-696` y `public/app.js:3344-3409`).
- «El índice de competencia se construye en el sync nocturno»: lo construye la cadena del histórico (`lib/handlers/procesos/historico.js:469-478`), a mano o cuando la última extracción completa tiene > 30 días; el cron solo reconstruye el índice de baja (A1 § 7.2, A2 § 4.1). Por eso el índice inverso tendrá esa frescura y se declara.
- «La tarjeta dice si conviene ir solo o con cuál socio» (MEMORIA § «Con cuál de mis socios conviene ESTE proceso», línea resumen): falso desde el mismo 11-sep; `bloqueSocio` devuelve `""` en «solo» y no nombra al socio (reproducido hoy en las tres variantes). La sección no lleva «> SUPERADA»: la tanda 1 la marca.
- «Purificación solo cabe con socio»: con el anticipo sin publicar la aplicación la da por viable y «solo»; solo si el pliego declara «sin anticipo» (o un anticipo < 30 %) pasa a «con socio» (ejecutado hoy: A/B/C/D en `d_dueno_repro.salida.txt`). La tarjeta de hoy no distingue los dos mundos; DUE-06 sí.
- «Falta la alerta de vencimiento del RUP» (A5 E14/P2): existe en Mi empresa, `alertaVigenciaRup` (`public/app.js:10217-10250`, febrero-abril, quinto día hábil de abril); lo que falta son los demás vencimientos (firma digital, certificados). Nota: su comentario dice «verificá», pero el texto de pantalla dice «verifique» (la cerca barre el fuente sin comentarios).

### 10.2 NO VERIFICABLE desde aquí
- Tiempos reales en Vercel/Upstash (30-80 ms por comando es un SUPUESTO): el dueño los mide con `duracionMs`/`comandosRedis` (§ 8).
- Contenido real de `indice:competencia`, `indice:baja:*` y el corpus de producción (sin credenciales): el «131 contratos», «55 procesos» y «1,4» se sembraron con las cifras de la captura.
- La norma de la limitación a Mipyme (cuántas Mipyme y cuándo), la Resolución 539/2025 y los conceptos citados: dominios bloqueados hoy (A5 § 8); solo resúmenes del buscador.
- Si `experiencia_genesis_106.json` está cargado en producción; los 327 de PRODIAC no existen en el árbol.
- Cobertura real de `fecha_de_ultima_publicaci`, `numero_de_lotes`, `departamento_proveedor` en producción (A4 § 8).
- Pintado en navegador (390 px, tooltips, reduced-motion): las funciones se ejecutaron en Node y el HTML se leyó como texto.

### 10.3 Reproducciones ejecutadas hoy (comando → salida resumida)
```
node d_dueno_repro.js       → A (anticipo no publicado): P2 pasa con advertencia, P3 sin_dato, viable, socio «solo», 186 B
                              B (declara sin anticipo): no viable K+Caja, falta [capacidad, caja], PRODIAC 80/20 (Génesis cierra: capacidad juntos 8.987.285.198, patrimonio 1.318.593.852), 4.619 B
                              C (declara 30 %): viable, «Consume 100 % … CRPC $4.456.104.580 / K $4.470.921.189», socio «solo»; cupo restante 14.816.609 COP (0,33 %)
                              D (declara 20 %): no viable K, PRODIAC 80/20
                              resumen propuesto: 184 B (dos ramas) · 96 B (solo); perfiles: helder microempresa 1.107.252.964 · genesis microempresa 211.340.888 · prodiac gran_empresa 8.309.706.000
node d_dueno_tarjeta.js     → handler real op=listar (status 200, total 3, viables 2) + tarjeta() real: texto visible de las tres variantes; bytes fila 7.865-8.147;
                              socio viaja {tipo, cierra_todo}; alcanzable_con_socio = genesis con recomendación prodiac (900002); plazo_meses undefined; chip «Anticipo no declarado» en 900002 («Sin anticipo.»);
                              «~1 empresa» y «1,4 en 55» en la misma tarjeta; hora 15:00 en fecha_cierre y no en el chip; «CRPC», «K», «capacidad residual» en el plegado
node d_dueno_textos.js      → 91 textos CORTO contra tuteoEn / VOSEO_RE / RE_EMOJI_UI / jerga de la suite: 0 fallos (salida en d_dueno_textos.salida.txt)
grep -rn -i "comprometid|si gana todo|cartera" lib/handlers/perfil/*.js lib/seguimiento.js public/app.js → solo el «valor comprometido» del competidor (lib/seguimiento.js:28,529; public/app.js:4551,4560)
grep -n "lider|adjudicatarios" lib/indice_competencia.js → solo el comentario :1168 (el hash no lleva líder)
grep -n "por_anio" lib/indice_competencia.js → :55, :377-386 (viaja en competencia_entidad); grep -rn hechosDeRegistro lib/ → :479 y lib/competencia_detalle.js:394-397 (solo el modal)
grep -rl referencia_del_proceso public/ → nada (código 1)
grep -n "alertaVigenciaRup" public/app.js → :10217 (existe)
grep -n "gran_empresa|microempresa" lib/perfiles.js → :86, :121, :156; sed -n 40,56p lib/socio_por_proceso.js → UMBRAL_MIPYME_2026 = 511708497 con su fuente
grep -n "capacidad residual" tests/e2e.js → :3850 (mensaje PÚBLICO de la caja cercado), :4674, :4781, :7250, :13962, :14523 (otros textos); ninguna cerca sobre el mensaje con credencial de P2/P3
git -C /home/user/portafolio-estrategico status --short → vacío
```
Ficheros: `d_dueno_repro.js`, `d_dueno_repro.salida.txt`, `d_dueno_tarjeta.js`, `d_dueno_tarjeta.salida.txt`, `d_dueno_textos.js`, `d_dueno_textos.salida.txt` (todos en este directorio).
