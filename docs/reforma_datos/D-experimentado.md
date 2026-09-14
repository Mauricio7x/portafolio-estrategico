# D · La tarjeta reformada, vista por un ingeniero civil con quince años licitando obra pública (13-sep-2026)

> Para: dueño · Estado: propuesta de diseño (informe fechado) · Sustituido por: —
> Árbol: `main` en `3482415`, `git status --short` vacío antes y después (nada del repositorio se modificó).
> Evidencia: los seis informes de la fase anterior (A1-A6, leídos enteros) más las reproducciones de este informe
> (`d_exp_repro.js` → `d_exp_repro.salida.txt`, y dos `node -e` transcritos en § 7). Cada «hoy pasa X» lleva su ancla
> `ruta:línea`; lo que no se pudo ejecutar va rotulado NO VERIFICABLE (§ 9). La memoria se cita por TÍTULO de sección.

## 0. Qué es esto y cómo leerlo

El dueño pidió reformar TODO lo que la tarjeta y sus pantallas de detalle enseñan, preguntando por cada dato «¿es el
mejor dato que puedo dar con los datos que tengo?» y «¿qué otro dato puedo dar con este dato?», con la estructura
CORTO · CONCISO · EN QUÉ BENEFICIA · EN QUÉ AFECTA. Este informe lo hace con un lente concreto: el ingeniero
**experimentado** —sabe leer un pliego, le sobran explicaciones y le faltan HECHOS COMPARABLES— y quiere ganar más y
perder menos tiempo. Hay un informe hermano con el lente del que empieza; los dos se funden en el plan.

- § 1: lo que ese ingeniero pregunta antes de abrir el pliego, y las tres reglas de redacción que se le deben.
- § 2: **dato por dato de lo que HOY se enseña** (los 34 de A1): se conserva / cambia / se pliega / se retira, y por qué.
- § 3: **las fichas** (EXP-01…EXP-57) en la estructura del dueño, con fuente, certeza, costo, para quién y tanda.
- § 4: las reglas duras y cómo las cumple cada dato.
- § 5: el orden en pantalla y **la maqueta** (tarjeta, modal de la entidad, modal del competidor y la espera animada)
  con el proceso de Purificación.
- § 6: las tandas (sesiones) y las cerraduras que caen a propósito.
- § 7-9: reproducciones, premisas desmentidas y lo no verificable.

Convenciones de las fichas: **certeza** = publicado (SECOP lo dice) · medido (contado en el histórico) · calculado
(aritmética sobre publicados o medidos, se declara) · estimado (supuesto con nombre) · sin_fuente. **Costo** = sync
(se calcula al ingerir o al reconstruir un índice) · petición (al servir la lista) · clic (al pulsar) · externo (exige
una fuente viva fuera de Redis). **Tanda** = sesión sugerida.

## 1. El lente: cinco preguntas y tres reglas

Un ingeniero con quince años no pregunta «¿qué es el RUP?». Pregunta, en este orden y en menos de un minuto por
proceso (A5 § 2, E1-E9, E14):

1. **¿Quién gana aquí y con qué baja?** — para saber si es un nicho, un pliego sastre o un mercado abierto (E5).
2. **¿Cuánto tarda la entidad?** — en cerrar, en adjudicar, en dar tiempo para ofertar; y si declara desiertos (E7, P14).
3. **¿Qué me falta a mí?** — capacidad, caja, anticipo, la actividad inscrita; con la cifra, no con el semáforo (E1, E4).
4. **¿Con quién me conviene ir?** — Génesis, PRODIAC o solo, y en qué reparto (E9).
5. **¿Cuánto me dan para armar la oferta y cuándo cierra exactamente?** — días de oficina, hora, festivos (P14, señales #5/#10).

Lo que HOY responde la tarjeta a esas cinco (A1 § 1): la 1 a medias (promedio de oferentes y una banda; el líder
está a tres pulsaciones, A2 § 1.3), la 2 no (el plazo de adjudicación vive en el hash y en el modal, no en la fila:
reproducido § 7.a), la 3 sí pero plegada y con dos lecturas contrarias del anticipo (A1 H1), la 4 no (la fila lleva
`{tipo, cierra_todo}` y calla el nombre: A3 § 0), la 5 no (ni días para ofertar ni hora; sin fecha, silencio: A1 H6).

Tres reglas de redacción para este lector, que además son las reglas duras del proyecto:

- **El HECHO con su BASE y su FECHA**: «6 de 15 contratos», «7 días de oficina (la mitad de 8)», «con datos hasta el
  31 de agosto». Un hecho sin base es un adjetivo; un adjetivo («alta», «media») ya lo sabe poner él.
- **Un calculado se declara calculado y no se disfraza de hecho**: «si bajan lo habitual aquí (7 %), quedaría en $56 M»,
  nunca «$56 M es lo que suele pagar esta entidad» (A1 H7).
- **Sin dato es sin dato, y se dice qué falta**: «sin fecha de cierre publicada», «sin histórico para estimar», «no hay
  contratos en ejecución cargados». Un guion mudo o un supuesto disfrazado («1 de 5» sobre cinco rivales supuestos,
  A1 H2) le cuesta una decisión.

Y una regla de forma para él: **lo que se VE arriba cabe en una pantalla de teléfono sin abrir nada**: hecho principal,
con quién, tres cifras, cierre, competencia, líder. Lo que se TOCA (puertas con cifras, baja con su banda, plazo,
lotes, calendario) va plegado; lo que se COMPARA (entidad, competidor) va en el modal.

## 2. Dato por dato de lo que HOY se enseña (los 34 de A1 § 1)

| # A1 | Dato de hoy | Decisión | Qué cambia y por qué | ¿Es el mejor dato con lo que hay? · ¿qué otro dato da? | Ficha |
|---|---|---|---|---|---|
| 1 | Título (`nombre_del_procedimiento`) | cambia | Añade la **referencia de la entidad** (`referencia_del_proceso`, que viaja y no se pinta: A4 Tabla A #8) | Sí. Con la referencia el ingeniero encuentra el proceso en SECOP II y en el pliego, que es como lo cita la entidad | EXP-01 |
| 2 | «ENTIDAD · Departamento» | cambia | Añade el **municipio** (`ciudad_entidad`) en la misma línea y absorbe el chip plegado #25 | Sí; es publicado. Ojo: es la sede de la entidad, no la obra (A4 #3-4) | EXP-02 |
| 3 | «$ 6.365.863.685» + «cuantía alta» | cambia | Se conserva la cifra; **se retira el rótulo** «cuantía alta/media/baja» (tramo interno <100 M / 100-500 M / >500 M, `lib/negocio.js:34-35`): a él no le dice nada que no diga la cifra | La cifra sí. Otro dato con la cifra: cuantía ÷ meses de plazo (EXP-05), cuantía frente al umbral Mipyme (EXP-47), anticipo en pesos cuando está declarado (EXP-27) | EXP-03 |
| 4 | Chip «No viable — K · Caja» | se conserva | Igual (atenuar, no esconder) | Sí | EXP-06 |
| 5 | Línea de requisitos (● Cumple… / Supera…) | cambia | Cuando P2/P3 **dependen del anticipo**, la línea lo dice con la cifra: «Cabe solo si el pliego trae anticipo del 30 % o más, o con socio» (reproducido § 7.b: hoy dice «Cumple los requisitos, con detalles por revisar» y la cifra está solo en el `title`, que en teléfono no existe) | Con esta cifra, sí: `anticipoQueCabe` ya se calcula en `lib/puertas.js:196-211` | EXP-07 |
| 6 | «Solo no le alcanza; con un socio, sí. Guárdelo…» | cambia | **Con quién**, en una línea, en TODOS los estados (Génesis · PRODIAC · solo · ninguna), redactada por el servidor; y condicional al anticipo cuando la puerta depende de él | Es el dato que el dueño pidió primero. Con el mismo cálculo: el reparto sugerido y el aviso Mipyme (A3 § c) | EXP-08 |
| 7 | «~2 empresas suelen competir · en 40» | cambia | Un decimal y **una sola vez** («1,4 empresas por proceso · en 55»): hoy el mismo promedio sale cuatro veces con dos redondeos (A1 H3) | Sí (medido). Otro dato: nada nuevo; la mediana viaja y solo sirve al modal | EXP-09 |
| 8 | «1 de 9 · se gana, aproximadamente» | cambia | Sin histórico de la entidad ni del departamento: **«—» · sin histórico para estimar**, y el supuesto de 5 rivales solo en «Ver cómo se calcula» (A1 H2) | Con base, sí (frecuencia natural, § «FILOSOFÍA DEL PRODUCTO»). Otro dato: la banda «entre 1 de 5 y 1 de 12» (p_lo/p_hi) queda en el modal: doble supuesto | EXP-10 |
| 9-9d | Tercera celda (lo que deja / precio de mercado / Calcular / —) | cambia | (a) con costo medido se conserva; (b) **se rotula como calculado**: «Si bajan lo habitual aquí (7 %), quedaría en $56 M · 8 contratos» (A1 H7); (c) y (d) se conservan | (a) es el mejor; (b) es un derivado y hay que decirlo | EXP-11 |
| 10 | «Ver cómo se calcula» | se conserva | Igual; recibe además el supuesto de rivales cuando la celda 2 dice «—» | Sí | EXP-12 |
| 11 | Chip «Activo · abierto» (PAA) | se conserva | Igual | Sí | EXP-13 |
| 12 | Chip «Cierra en 31 días · 13 de oct» | cambia | Añade la **hora** publicada (el cierre «a las 3:00 p. m.» es donde mueren las ofertas, Guía cap. 4) y, sin fecha legible, **«Sin fecha de cierre publicada»** en vez de silencio (A1 H6) | Sí. Otro dato con la fecha: días de oficina para ofertar (EXP-15) y festivo pegado al cierre | EXP-14 |
| 13 | Chip «Avisar que le interesa…» | se conserva | Igual (techo legal ≠ plazo; ya está bien) | Sí | EXP-17 |
| 14 | Banda «● Poca competencia · 1,6 en 12 ›» | cambia | Deja de repetir la cifra: **«Poca competencia · 55 procesos ›»**; sigue siendo el botón del modal | Sí | EXP-18 |
| 15 | Chip de zona | se conserva | Igual (ya declara estimación y base) | Sí | EXP-19 |
| 16 | Chip «Cierre prorrogado» | cambia | Añade **cuántos días** se movió y desde cuándo (`_cierre_inicial` viaja: A1 § 2) | Sí (medido entre versiones) | EXP-20 |
| 17 | Aviso ámbar señal #11 | se conserva | Igual, con la MISMA cifra y el mismo redondeo que la celda 1 | Sí | EXP-21 |
| 18 | Aviso rojo de cierre | se conserva | Igual | Sí | EXP-22 |
| 19 | Aviso de manifestación | se conserva | Igual | Sí | EXP-23 |
| 20 | Línea de margen (solo `ordenar_por=margen`) | se conserva | Igual | Sí | EXP-24 |
| 21 | Cuadro de adendas | cambia | Añade **cuántos cambios y la fecha del último** (`_cambios`/`_versiones` viajan) | Sí (medido entre versiones); en tanda 3 gana `fecha_de_ultima_publicaci` (EXP-50) | EXP-25 |
| 22 | Plegado: chips de puertas + mensajes | cambia | P2 declara **«capacidad calculada sin descontar contratos en ejecución (no hay ninguno cargado)»** cuando `SCE = 0` (hoy es un aviso de consola, `lib/capacidad.js:70-74`) y añade **«le quedarían $X»** (`crp − crpc`) | Con la declaración, sí. La K es un TECHO si el CO es estimado (chip #27 se pliega aquí) | EXP-26 |
| 23 | Chip «Anticipo 30 %» / «Anticipo no declarado» | cambia | **Tres estados**: «Anticipo 30 %» · «Sin anticipo (lo dice el pliego)» · «El proceso no publica si hay anticipo» (A1 H1: `app.js:2192` ignora `anticipo_declarado`) | Sí | EXP-27 |
| 24 | Chip «Suelen bajar 7 % (unos $4M)» | cambia | Añade **la banda en palabras** («la mitad de los ganadores bajó entre 3 % y 9 %», `baja_p25/p75` viajan) y **de dónde sale** («lectura del departamento entero, no de esta entidad» cuando `granularidad_utilizada` no es la entidad) | Sí. Es la señal #2 del experimentado (E2): con la banda decide el precio, con la mediana sola no | EXP-28 |
| 25 | Chip «BOGOTÁ D.C. ✓ / Ubicación n/d» | se pliega | Absorbido por EXP-02 (municipio arriba); el ✓ («está en su lista de ubicaciones») se retira: el chip de zona ya dice lo que decide | — | EXP-29 |
| 26 | Chips de encaje del RUP | se conserva | Igual, plegado | Sí | EXP-30 |
| 27 | Chip «Capacidad calculada con ingreso estimado» | se pliega | Pasa a ser una frase dentro del mensaje de P2 (EXP-26) | — | EXP-31 |
| 28 | Chip de modalidad | cambia | **Sube arriba**, junto a la cuantía: la modalidad decide manifestación, sorteo del método y umbral Mipyme | Sí (publicado) | EXP-04 |
| 29 | Chip «Precios unitarios / Precio global» | cambia | **Sube arriba**: es la variable de riesgo del APU (A5 E12) | Sí (estimado del texto, se conserva el «null» si dice las dos) | EXP-32 |
| 30 | «Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos» | se conserva | Igual, plegado (§ «Lote «B9b-competencia-departamento»…»: se expone, no decide) | Sí | EXP-33 |
| 31 | Estado «Publicado / Convocado» | se conserva | Igual | Sí | EXP-34 |
| 32 | Botón Guardar | se conserva | Igual | Sí | EXP-35 |
| 33 | Botón «Calcular mi precio» | cambia | Pasa el **plazo en meses** derivado con `lib/capacidad.plazoMesesDe` (A1 H4: hoy lee `plazo_meses`, que no viaja) | Sí | EXP-36 |
| 34 | «Ver en SECOP II ↗» | se conserva | Igual | Sí | EXP-37 |

Nada de lo de hoy se retira del todo salvo dos rótulos (el tramo de cuantía y el ✓ de ubicación): la información no se
pierde, cambia de sitio o gana su base.

## 3. Las fichas (CORTO · CONCISO · EN QUÉ BENEFICIA · EN QUÉ AFECTA)

Formato de cada ficha: **id · nombre en pantalla** · tipo · para · necesidad (A5) · tanda
CORTO (la frase tal como sale) · CONCISO (qué es, de dónde sale, cómo se calcula) · BENEFICIA · AFECTA · fuente · certeza · costo.

### 3.1 Arriba: lo que se VE sin abrir nada

**EXP-01 · Título con la referencia de la entidad** · cambia · ambos · E1 · tanda 1
CORTO: «PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA · Ref. LP-008-2026».
CONCISO: `nombre_del_procedimiento` + `referencia_del_proceso` (p6dx, ya proyectada: `lib/proyeccion.js:38-61`; viaja en la fila y ningún `public/*.js` la pinta, A4 Tabla A #8). Sin referencia, solo el nombre.
BENEFICIA: es el identificador con el que la entidad, el pliego y el SECOP II nombran el proceso; el experimentado lo busca así y lo cita así en observaciones y subsanaciones.
AFECTA: +25 B por fila; ninguna decisión.
Fuente: `referencia_del_proceso` · certeza: publicado · costo: petición.

**EXP-02 · Entidad · municipio · departamento** · cambia · ambos · P12/E5 · tanda 1
CORTO: «ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Purificación · Tolima».
CONCISO: `entidad`, `ciudad_entidad`, `departamento_entidad` (publicados). Absorbe el chip plegado #25.
BENEFICIA: el «dónde» en una línea; con el municipio el experimentado sabe si conoce la zona y los proveedores.
AFECTA: es la SEDE de la entidad, no el sitio de la obra (A4 #3-4; `docs/ATRACTIVIDAD.md` R5); se dice en el `title` y, cuando exista, gana `gra4-pcp2` (dónde se ejecuta) — tanda 4.
Fuente: p6dx · certeza: publicado · costo: petición.

**EXP-03 · Cuantía sin el rótulo de tramo** · cambia · ambos · E1 · tanda 1
CORTO: «$ 6.365.863.685» (y «Cuantía no publicada» cuando `precio_base` es 0 o falta).
CONCISO: `cuantia_cop` (`lib/negocio.js:207`, `primerNumero` sobre `precio_base`). Se retira «cuantía alta/media/baja» (`cuantia_rango`, tramos internos `negocio.js:34-35`), que sigue viajando para el filtro por rango.
BENEFICIA: quita un adjetivo que él no necesita y deja sitio a la modalidad y al plazo en la misma línea.
AFECTA: `cuantia_cop` viaja 0 cuando no hay dato y la tarjeta lo trata como ausencia (A1 #3); toda derivada de la cuantía (EXP-05, EXP-27, EXP-47) descarta la ausencia ANTES de calcular.
Fuente: `precio_base` · certeza: publicado · costo: sync.

**EXP-04 · Modalidad arriba** · cambia · ambos · E15/E17 · tanda 1
CORTO: «Licitación pública» · «Selección abreviada de menor cuantía» · «Mínima cuantía».
CONCISO: `modalidad_de_contratacion` tal como la publica p6dx; hoy plegada (`app.js:2201`).
BENEFICIA: la modalidad decide si hay manifestación de interés, si el método económico se sortea y si la entidad puede limitar a Mipyme; el experimentado la lee antes que la cuantía.
AFECTA: ninguna; es un chip corto (texto ya en la fila).
Fuente: p6dx · certeza: publicado · costo: sync.

**EXP-05 · Plazo de obra (y el ritmo mensual, plegado)** · nuevo · ambos · P3/E3 · tanda 1
CORTO: arriba «8 meses de obra» (o «Plazo de obra no publicado»); plegado «Unos $796 M por mes de obra».
CONCISO: `duracion` + `unidad_de_duracion` (publicados, viajan; hoy solo en el expediente: A4 #24-25) convertidos con `lib/capacidad.plazoMesesDe` (llamar, no reescribir; reproducido § 7.c: 8 → 8). El ritmo = `cuantia_cop ÷ meses`, aritmética (A4 C2). **Sin duración, la tarjeta dice «no publicado»**: `plazoMesesDe({})` devuelve 12 para la K (A4 C8) y ese 12 NO se enseña como plazo.
BENEFICIA: el plazo es la primera pregunta del flujo de caja y de la K residual; el ritmo mensual le dice si la obra le cabe en su capacidad de ejecución, no solo en la de contratación.
AFECTA: el ritmo es un promedio, no el flujo real (actas, retenciones); se rotula «unos». `duraci_n_del_contrato` de jbjy puede diferir del proceso (A4).
Fuente: `duracion`, `unidad_de_duracion`, `cuantia_cop` · certeza: publicado (plazo) / calculado (ritmo) · costo: petición.

**EXP-06 · Chip «No viable — K · Caja»** · se conserva · ambos · E1 · —
CORTO: «No viable — K · Caja» (tarjeta atenuada al 50 %).
CONCISO: `viable === false` y `puertas.no_viable_por` (`lib/puertas.js:305-350`).
BENEFICIA/AFECTA: sin cambio; ver un proceso grande caído por caja enseña más que su ausencia (comentario `app.js:2140-2142`).
Fuente: puertas · certeza: calculado · costo: petición.

**EXP-07 · La línea de requisitos dice de qué depende** · cambia · ambos · E1/E4 · tanda 1
CORTO: «● Cabe solo si el pliego trae anticipo del 30 % o más, o con socio.» (ámbar) — además de los siete textos de hoy.
CONCISO: cuando `p2_k.depende_del_anticipo` (`lib/puertas.js:195`) o `p3_caja.sin_dato_de === "anticipo"`, la línea usa la cifra `anticipoQueCabe` que P2 ya calcula (`puertas.js:196-211`; reproducido § 7.b para Purificación: «solo cabe si el pliego prevé un anticipo del 30 % o más»). Hoy ese caso sale como «Cumple los requisitos, con detalles por revisar» y la cifra solo en el `title` (`app.js:1721`), que un teléfono no tiene (cerradura `tests/e2e.js:8663-8680`).
BENEFICIA: es la decisión de ir o no ir en una frase; el experimentado abre el pliego a buscar exactamente el anticipo.
AFECTA: ninguna cifra nueva; la regla «ante la duda, ámbar y se muestra» se conserva (la puerta sigue pasando).
Fuente: `puertas.p2_k`, `p3_caja` · certeza: calculado · costo: petición.

**EXP-08 · Con quién conviene (Génesis · PRODIAC · solo · ninguna)** · cambia · ambos · E9/P11 · tanda 1
CORTO (los estados, todos redactados por el servidor y verificados contra la cerca de lenguaje, § 7.d):
- solo: «Solo: le alcanza sin socio.» (gris)
- con socio que cierra y aporta actividad: «Conviene con Génesis: tiene la actividad que a usted le falta · reparto sugerido 60/40» (verde)
- con socio que cierra y aporta respaldo: «Conviene con PRODIAC: aporta el respaldo que le falta · reparto sugerido 80/20» (verde)
- con socio y aviso Mipyme: «Conviene con PRODIAC, pero no cabe si la convocatoria es solo para Mipyme.» (ámbar)
- con socio que no cierra: «Con Génesis se acerca, pero puede no bastar: falta respaldo para financiar la obra.» (ámbar)
- ninguna: «Ninguna de las dos alcanza lo que falta.» (rojo suave); por objeto no se pinta (ya sale descartada)
- **condicional al anticipo** (nuevo, reproducido § 7.b): «Solo, si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC (80 % usted, 20 % PRODIAC).» (ámbar)
CONCISO: `socioPorProceso` ya corre por fila servida (`listar.js:935-938`); `resumenSocio` (`listar.js:109-113`) pasa de `{tipo, cierra_todo}` a `{tipo, con, cierra_todo, aviso, linea}` (A3 § c: 96-167 B, media 143 B; medido aquí 158 B). `con` sale SOLO de `recomendacion.socio` (nunca de `alcanzable_con_socio`, que hoy discrepa: A3 § b). Hace falta `nombreCorto` en `lib/perfiles.js` (no existe). **La rama condicional**: cuando `p2_k.depende_del_anticipo` es true, el servidor evalúa el veredicto dos veces —con el anticipo publicado/desconocido y con `anticipo_pct = 0, anticipo_declarado = true`— y redacta las dos mitades; para Purificación el veredicto real es «solo» con anticipo desconocido o del 30 %, y «PRODIAC 80/20, cierra capacidad y caja» sin anticipo (§ 7.b). Hoy la frase dice «Solo. Esta le alcanza sin socio» sobre dos puertas que no se pudieron verificar (A5 § 6.1).
BENEFICIA: la pregunta 4 del experimentado y la que el dueño puso primera, en cada tarjeta, sin guardar nada. La condicional evita el falso «solo» y el falso «con socio» a la vez.
AFECTA: ≈ 30 KB por respuesta de 210 filas (≈ 1,7 % del cuerpo, A3); una segunda llamada a `socioPorProceso` (0,25-0,84 ms) solo en las filas que dependen del anticipo. El expediente sigue con el consejo CONGELADO al guardar con su fecha (`seguimiento.js:168-181`, no se toca): la tarjeta dice el de hoy, el expediente el del día que decidió. Cuatro aserciones caen a propósito (`tests/e2e.js:4706-4737`, § 6). La memoria del 11-sep («El veredicto de socio se lee AL GUARDAR…») se marca «> SUPERADA» en su parte de tarjeta; la de «Con cuál de mis socios…» vuelve a ser cierta.
Fuente: `lib/socio_por_proceso` · certeza: calculado · costo: petición.

**EXP-09 · Cuántas compiten (una cifra, un redondeo)** · cambia · ambos · E6 · tanda 1
CORTO: «1,4 · empresas por proceso · en 55 procesos».
CONCISO: `competencia_entidad.promedio_oferentes` y `total_procesos` (`competenciaDe`, `lib/indice_competencia.js:1213-1232`; mínimo 5). Un decimal (`fmtNum`), sin `Math.round` (`app.js:2074`); la banda (EXP-18) y el aviso (EXP-21) no repiten la cifra o la repiten idéntica.
BENEFICIA: un solo número por hecho; «~2» y «1,6» eran el mismo hecho con dos caras (A1 H3).
AFECTA: ninguna.
Fuente: `indice:competencia` · certeza: medido · costo: petición (lectura; el hash se construye en la cadena del histórico, A2 § 4.1).

**EXP-10 · De cada cuántos se gana uno («—» sin histórico)** · cambia · ambos · E6 · tanda 1
CORTO: «1 de 3 · se gana, aproximadamente» con base; **«— · sin histórico para estimar»** cuando `p_ganar_detalle.fuente` es el supuesto de 5 rivales.
CONCISO: `frecuenciaNatural(p_ganar)` (`app.js:1797-1802`). Hoy `estimarPDetalle` siempre devuelve una `p` (cae a `PROMEDIO_CONSERVADOR`, `lib/probabilidad.js:124,324`) y la rama «—» de `app.js:2079` es inalcanzable (A1 H2). Cambio: la celda mira `fuente`; con el supuesto pinta «—» y el supuesto queda en «Ver cómo se calcula». La `p` sigue viajando y ordenando.
BENEFICIA: «1 de 5» sobre cinco rivales inventados es un supuesto disfrazado de medición; el experimentado lo detecta y deja de confiar en la celda buena.
AFECTA: la lista sigue ordenando por `ve` con esa `p` (no cambia el orden); solo cambia lo que se afirma.
Fuente: `p_ganar_detalle` · certeza: estimado (declarado) · costo: petición.

**EXP-11 · Lo que deja (y el precio de mercado rotulado como calculado)** · cambia · ambos · E3/P6 · tanda 1
CORTO: (a) con costo: «−$3 M · podría perder, en el peor caso · con el costo que usted calculó» (igual); (b) sin costo y con baja: **«$56 M · si bajan lo habitual aquí (7 %) · 8 contratos»** (hoy: «es lo que suele pagar esta entidad», A1 H7); (c) «Calcular · cuánto deja: falta su costo»; (d) «— · sin cifra de lo que deja».
CONCISO: (b) es `ganancia.precio_esperado = cuantía × (1 − mediana)` (`lib/ganancia.js:388-391`), redondeado por `fmtCorto` solo para mostrar; lo MEDIDO es la mediana y su n. El rótulo nuevo dice el hecho (7 %, 8 contratos) y el derivado como condicional.
BENEFICIA: el experimentado sabe que el precio de adjudicación no lo «paga» la entidad, lo pone el ganador; la cifra le sirve de referencia sin sonar a hecho.
AFECTA: ninguna cifra nueva; § «La tercera cifra de la tarjeta es LA PLATA QUE QUEDA» se respeta entera (la celda (a) sigue saliendo de `lib/apu/piso_techo`).
Fuente: `ganancia` · certeza: calculado (declarado) / medido (mediana, n) · costo: petición (con token).

**EXP-12 · «Ver cómo se calcula»** · se conserva · ambos · E6 · —
CORTO: igual. CONCISO: botón → `op=probabilidad`; recibe además el supuesto de rivales cuando EXP-10 pinta «—». Fuente: `p_ganar_detalle` · certeza: estimado · costo: clic.

**EXP-13 · Chip «Activo · abierto»** · se conserva · ambos · E10 · — (solo con el PAA encendido; publicado; sync).

**EXP-14 · Cierre con hora, y «sin fecha» dicho** · cambia · ambos · E17/P7 · tanda 1
CORTO: «Cierra en 30 días · 13 de oct de 2026 · 5:00 p. m.» · «Cierra HOY · …» · **«Sin fecha de cierre publicada»** (gris).
CONCISO: `fecha_cierre` (`enriquecer` → `fechaCierre`, `lib/negocio.js:181`, candidatas `CIERRE_CANDIDATOS`); la hora se pinta solo si el valor trae una hora distinta de medianoche (el dataset la publica como hora local de Colombia flotante: `app.js:1425` resta 5 h para contar días). Sin fecha legible, hoy `chipCierre` devuelve «» (A1 H6).
BENEFICIA: la hora es donde mueren las ofertas (Guía cap. 4); «sin fecha» evita que un proceso sin cierre publicado se lea como «sin prisa».
AFECTA: si la hora del dataset no fuera la de Colombia, se enseñaría una hora equivocada: NO VERIFICABLE hoy contra la fuente (§ 9); hasta medirlo, la hora va con «según SECOP II» en el `title` y se confirma en el cronograma del pliego (que ya se lee: `lib/cronograma.js`).
Fuente: `fecha_de_recepcion_de` · certeza: publicado · costo: sync.

**EXP-15 · Días de oficina que da este proceso para ofertar (y el calendario que lo delata)** · nuevo · ambos · P14, señales #5/#10 · tanda 1
CORTO: «Da 29 días de oficina para ofertar (publicado el 1 de sep, cierra el 13 de oct)»; y cuando aplica: «El cierre cae el día siguiente a un festivo: confirme la hora en el cronograma» · «Cierra entre el 20 de diciembre y el 10 de enero: pocos días de oficina para preparar la oferta».
CONCISO: `habilesEntre(fecha_de_publicacion_del, fecha_cierre)` de `lib/habiles.js:93` (festivos de Colombia dentro; reproducido § 7.c: 1-sep → 13-oct-2026 = 29 días de oficina, 42 calendario; A4 C1 reprodujo otro par). Festivo pegado: `esFestivo(cierre − 1)` (`habiles.js:77`; 12-oct-2026 es festivo y 13-oct es hábil: § 7.c). La ventana de fin de año es una comparación de fechas. Los dos campos ya viajan (A1 § 2).
BENEFICIA: es la señal #5 y #10 del pliego sastre (Guía cap. 18) hecha dato sin leer el pliego, y la respuesta a «¿me da tiempo?».
AFECTA: si una adenda movió el cierre, el conteo es desde la publicación original (hasta que entre `fecha_de_ultima_publicaci`, EXP-50); se dice «publicado el …» para que se vea la base. Ámbar e informativo, nunca bloquea.
Fuente: `fecha_de_publicacion_del`, `fecha_cierre`, `lib/habiles` · certeza: calculado sobre publicados · costo: petición.

**EXP-16 · Lo que esta entidad suele dar para ofertar** · nuevo · experimentado · P14 · tanda 2
CORTO: «Esta entidad suele dar 21 días de oficina para ofertar; este proceso da 9» (plegado; sin base: nada).
CONCISO: en el índice de competencia, por entidad, histograma de `habilesEntre(publicación, cierre)` de los procesos cerrados, publicado como «la mitad» y «tres de cada cuatro» con el mismo `percentilHistograma` y el mismo mínimo de 5 que el plazo de adjudicación (`lib/indice_competencia.js:457-467`: llamar, no reescribir). Censo hoy: 0 (A5 § 4.2).
BENEFICIA: «este da 9 y la entidad suele dar 21» es la señal de plazo mínimo de la señal #5 con base propia de la entidad.
AFECTA: exige reconstruir el índice (`/api/sync/historico?reconstruir_indice=true`, cadena del histórico: A2 § 4.1); frescura de hasta un mes, declarada. +≈ 60 B por fila.
Fuente: histórico (p6dx) · certeza: medido · costo: sync (petición al leer).

**EXP-17 · Chip de manifestación** · se conserva · ambos · E17 · — (calculado/publicado si confirmada; petición).

**EXP-18 · Banda de competencia (sin repetir la cifra)** · cambia · ambos · E5/E6 · tanda 1
CORTO: «● Poca competencia · 55 procesos ›» · «● Sin datos históricos de esta entidad ›».
CONCISO: `bandaCompetencia` (`app.js:1606-1621`) conserva nivel y botón; la cifra vive en EXP-09.
BENEFICIA/AFECTA: una cifra por hecho; el botón sigue abriendo el modal (`op=entidad`). Cerradura `tests/e2e.js:23608-23614` (badge con `data-entidad`) se conserva.
Fuente: `indice:competencia` · certeza: medido · costo: petición / clic.

**EXP-19 · Chip de zona** · se conserva · ambos · P12 · — (estimado y declarado; petición). Para Purificación desde la base del dueño: «Su zona (Ibagué)» o «Cerca · ~200 km de Bogotá» (reproducido § 7.f).

**EXP-20 · Cierre prorrogado, con los días** · cambia · experimentado · E6/E8 · tanda 1
CORTO: «Cierre prorrogado 12 días (era el 1 de octubre)».
CONCISO: `_cierre_prorrogado` + `_cierre_inicial` (`lib/almacen.js:370-371`, derivados entre versiones del dataset; A1 Tabla 3). Solo si `_versiones > 1`.
BENEFICIA: una prórroga larga suele significar que no llegaron ofertas (factor ×1,20 de `lib/probabilidad`); el experimentado quiere el tamaño de la prórroga, no solo que hubo.
AFECTA: «no prorrogado» puede ser «no lo vimos» (solo se ven versiones que la ingesta vio); se dice «desde que la aplicación lo sigue» en el `title`.
Fuente: versiones del corpus · certeza: medido · costo: petición.

**EXP-21 · Aviso señal #11** · se conserva · ambos · E5 · — (misma cifra y redondeo que EXP-09; medido; petición).
**EXP-22 · Aviso rojo de cierre** · se conserva · ambos · P7 · — (calculado; al pintar).
**EXP-23 · Aviso de manifestación** · se conserva · ambos · E17 · — (calculado/publicado; petición).
**EXP-24 · Línea de margen** · se conserva · experimentado · E2 · — (calculado; petición con `ordenar_por=margen` y token).

**EXP-25 · Adendas con conteo y fecha** · cambia · ambos · E8 · tanda 1
CORTO: «La entidad cambió las reglas de este proceso · 2 cambios · el último el 3 de septiembre» + los renglones de hoy («● Cierre: pasó de … a …»).
CONCISO: `adendas.n` y la fecha de la última versión (`_cambios`, `lib/almacen.js:378-384`; `evaluarAdendas`, `lib/adendas.js:44-100`).
BENEFICIA: cuántas veces y cuándo cambió es lo que decide si releer el pliego hoy.
AFECTA: solo ve cambios del dataset (cierre, presupuesto, plazo, objeto, modalidad), no adendas de texto; se dice. En tanda 3 se cruza con EXP-50.
Fuente: versiones del corpus · certeza: medido · costo: petición.

### 3.2 Plegado: lo que se TOCA («Más detalles»)

**EXP-26 · Puertas con cifras, y la capacidad dice lo que no descuenta** · cambia · ambos · P3/E1 · tanda 1
CORTO: «Capacidad: con anticipo del 30 % consume el 100 % de su capacidad (le quedarían unos $15 M); calculada sin descontar contratos en ejecución: no hay ninguno cargado» · «Caja: si no hubiera anticipo necesitaría financiar ≈ $1.273 M y su patrimonio es $1.107 M» (cifras reales de Purificación, § 7.b).
CONCISO: `p2_k.{crp, crpc}` viajan (A1 § 2): «le quedarían» = `crp − crpc` (A1 Tabla 3), solo con token. La frase «sin descontar contratos en ejecución» sale cuando `calcSCE` asume 0 (`lib/capacidad.js:70-74`, hoy solo `advertir` en consola); «con ingreso estimado» (chip #27) se funde aquí cuando `rup.co_estimado`.
BENEFICIA: la K es la cifra que decide el tamaño de contrato; saber que es un TECHO (sin SCE, con CO estimado) evita comprometerse por encima (A5 § 4.5).
AFECTA: la K seguirá optimista hasta que se carguen los contratos en ejecución del dueño (perfil, no tarjeta: `sce` por perfil en `lib/config_rup.js:150-153`); mientras tanto se declara.
Fuente: `puertas.p2_k`, `p3_caja` · certeza: calculado · costo: petición.

**EXP-27 · Anticipo en tres estados** · cambia · ambos · E4 · tanda 1
CORTO: «Anticipo 30 % (≈ $1.910 M)» · «Sin anticipo (lo dice el pliego)» · «El proceso no publica si hay anticipo».
CONCISO: `anticipo_pct` + `anticipo_declarado` (`enriquecer`, `lib/negocio.js:218-224`, regex sobre el objeto; el dataset no trae columna). Hoy `app.js:2192` mira solo `pct > 0` y pinta «no declarado» también cuando el pliego dijo «sin anticipo» (A1 H1: dos lecturas contrarias en la misma tarjeta, porque P3 sí lo distingue, `puertas.js:247`). Los pesos = `cuantía × pct/100`, «≈», solo con cuantía.
BENEFICIA: anticipo o no es la primera pregunta del flujo de caja; «sin anticipo» y «no se sabe» son decisiones distintas.
AFECTA: el porcentaje sale de una regex sobre 700 caracteres de descripción (`lib/proyeccion.js:88-90`); un anticipo escrito solo en el pliego no se ve → «no publica», jamás «no hay». Anticipo ≠ pago anticipado (V-08): el detector es único; no se afirma la diferencia.
Fuente: `anticipo_pct`, `anticipo_declarado` · certeza: estimado (extraído del texto) · costo: sync.

**EXP-28 · Cuánto bajan aquí, con la banda y con su origen** · cambia · experimentado · E2/P5 · tanda 1
CORTO: «Suelen bajar 7 % (unos $445 M) · la mitad de los ganadores bajó entre 3 % y 9 % · 8 contratos de esta entidad» · o «Lectura del departamento entero, no de esta entidad» cuando la cascada respondió con el departamento.
CONCISO: `baja_mercado.{baja_mediana, baja_p25, baja_p75, procesos_contados, granularidad_utilizada, modalidad_utilizada}` (todo viaja, A1 § 2; `bajaDeMercado` `lib/indice_baja.js:885-940`). La banda en palabras («la mitad… entre») sin «p25/p75» ni «mediana» (cerca `tests/e2e.js:13082`). Solo con token (`lib/publico.js:131-135`).
BENEFICIA: es la cifra con la que el experimentado fija el precio (E2, «la razón número uno por la que las empresas grandes ganan más»); la banda le dice cuánto puede moverse y el origen le dice si es de ESTA entidad.
AFECTA: con n = 5 la banda es ruido (se enseña con su n y en cubetas); la mediana es una cubeta redondeada y NO decide (decide el optimizador de Precios); nunca dos instrucciones de precio en la misma tarjeta (§ «Lote «B9b-competencia-departamento»…»).
Fuente: `indice:baja` · certeza: medido · costo: petición (con token).

**EXP-29 · Chip de ubicación** · se pliega (absorbido por EXP-02; el ✓ se retira) · — · P12 · tanda 1.
**EXP-30 · Encaje con el RUP** · se conserva · ambos · P2 · — (calculado; petición).
**EXP-31 · «Capacidad calculada con ingreso estimado»** · se pliega en EXP-26 · — · P3 · tanda 1.

**EXP-32 · Precios unitarios / precio global, arriba** · cambia · experimentado · E12 · tanda 1
CORTO: «Precios unitarios» · «Precio global: el riesgo de cantidades es suyo».
CONCISO: `tipo_precio` (`lib/negocio.js:251-274`, al servir; `null` si el objeto dice las dos o ninguna → no se pinta).
BENEFICIA: decide el colchón del APU y si «mayor cantidad» se paga (COMPLEMENTO V-03).
AFECTA: estimado del texto; con `null` no se adivina.
Fuente: objeto del proceso · certeza: estimado · costo: petición.

**EXP-33 · Cómo se adjudica en el departamento** · se conserva · ambos · E2 · — (medido; petición con token; plegado; «se expone, no decide»).
**EXP-34 · Estado** · se conserva · ambos · — · —. **EXP-35 · Guardar** · se conserva · —. **EXP-37 · Ver en SECOP II** · se conserva · —.

**EXP-36 · «Calcular mi precio» lleva el plazo** · cambia · ambos · P6 · tanda 1
CORTO: sin texto nuevo (el editor de Precios abre con el plazo puesto).
CONCISO: `qApu` (`app.js:2114-2126`) lee `l.plazo_meses`, que la fila de `op=listar` no lleva (A1 H4); pasa a derivarlo con `plazoMesesDe(l)` (`lib/capacidad.js:148-158`) SOLO si `duracion` es legible; sin duración no manda plazo (el 12 por defecto es de la K, no del proceso).
BENEFICIA: el APU nace con el plazo, que mueve administración y financiación.
AFECTA: ninguna.
Fuente: `duracion`, `unidad_de_duracion` · certeza: publicado · costo: clic.

### 3.3 Nuevo en la tarjeta: quién gana aquí, cuánto tarda la entidad, calendario, Mipyme

**EXP-38 · Quien más gana aquí, a un clic del perfil** · nuevo · experimentado · E5 · tanda 2 (encargo obligatorio ii)
CORTO: «Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›» (botón; sin base no hay botón).
CONCISO: el hash `indice:competencia` publica por entidad `lider: {nombre, clave, ganados, base}` calculado en el MISMO barrido de `construirIndice` con `claveAdjudicatario` (`lib/equivalencias.js:72-88`) y solo con `base ≥ MIN_PROCESOS` (la misma regla que la concentración de hoy, `lib/competencia_detalle.js:436-447`); `competenciaDe` lo pasa a la fila **solo con token válido** (`autorizarToken`, `listar.js:384`; token inválido = 401). La tarjeta pinta el botón `.lider-competencia[data-adjudicatario][data-nombre][data-entidad]`, que llama a `cargarAdjudicatario(clave, nombre)` (`app.js:3382`), la función que ya existe. Hoy el líder está a tres pulsaciones y la fila del modal no tiene afordancia (A2 § 1.3).
BENEFICIA: la señal #11 del manual hecha dato en la tarjeta: nombre, cuota y base. Un clic → dónde más gana, cuántas veces y por cuánto.
AFECTA: toca la decisión escrita en `lib/indice_competencia.js:1167-1168` («/api/oportunidades expone… nunca adjudicatarios, NIT ni valores»): se mantiene su espíritu (sin token nada; con token, el nombre y la cuota, sin NIT ni valores en la fila) y **se escribe en la memoria como decisión nueva**, no se cuela. +86 B por fila (medido § 7.e). Frescura del índice (hasta un mes; «con datos hasta» en el modal). Orden de la delegación: botón propio, antes de `.banda-competencia` (cerradura de orden `tests/e2e.js:20786-20793`).
Fuente: `indice:competencia` (histórico p6dx) · certeza: medido · costo: sync (lectura por petición; perfil al clic).

**EXP-44 · Cuánto tarda la entidad en adjudicar** · nuevo en la tarjeta · experimentado · E7/P7 · tanda 2
CORTO: «Adjudica en unos 7 días de oficina tras el cierre (la mitad de sus 8 procesos con las dos fechas)» (chip arriba, corto: «Adjudica en ~7 días de oficina ›»); bajo el mínimo: nada arriba y «sin dato (hacen falta 5; hay 3)» plegado.
CONCISO: el hash YA lo publica por entidad (`plazo_adjudicacion {base, adjudicados, mediana_dias_habiles, p75_dias_habiles}`, `lib/indice_competencia.js:457-467`; M-DGF-08) y el modal ya lo enseña (`htmlPlazoAdjudicacion`, `app.js:3050-3062`), pero **la fila NO lo lleva** (reproducido § 7.a: `competencia_entidad` sale sin `plazo_adjudicacion`; `hechosDeRegistro` sobre el mismo registro sí lo da, 183 B con los desiertos). Cambio: `listar.js` añade `hechos_entidad = hechosDeEntidad(indice, l)` (`indice_competencia.js:1209`, el lector ÚNICO) junto a `competencia_entidad` (`listar.js:461`), y la tarjeta reutiliza `htmlPlazoAdjudicacion` (llamar, no reescribir).
BENEFICIA: la pregunta 2 del experimentado: cuánto tarda la entidad en decidir es cuánto tarda su caja en saber si empieza; y una entidad que tarda 60 días de oficina ya dice algo.
AFECTA: +≈ 120 B por fila; el índice se reconstruye para que el hash lo traiga (paso del dueño ya escrito en § «Lote «B9b»»). «Días de oficina» y frecuencias naturales; ni «mediana» ni «p75» ni «hábiles» (cerradura `tests/e2e.js:13082`).
Fuente: `indice:competencia` · certeza: medido · costo: sync (lectura por petición).

**EXP-45 · Cuántos declara desiertos** · nuevo en la tarjeta (plegado) · experimentado · E5/E7 · tanda 2
CORTO: «Declaró desierto 1 de sus 9 procesos cerrados con resultado» · «No declaró desierto ninguno de sus 9…».
CONCISO: `desiertos {n, adjudicados, base, pct}` del mismo hash y el mismo lector (§ 7.a); `htmlDesiertos` ya existe (`app.js:3066-3076`).
BENEFICIA: una entidad que declara desierto uno de cada tres procesos cuesta ofertas perdidas sin competidor; el experimentado lo pondera antes de gastar equipo.
AFECTA: bajo 5, «sin dato»; cancelados y revocados no entran en la base (declarado en la meta del índice).
Fuente: `indice:competencia` · certeza: medido · costo: sync (lectura por petición).

**EXP-46 · Ganadores locales frente a foráneos** · nuevo · experimentado · E5 · tanda 2
CORTO: «7 de cada 10 ganadores aquí tienen domicilio registrado en Tolima (12 contratos)» (plegado; y en el modal de la entidad).
CONCISO: en el barrido de `construirIndice`, por entidad, cuenta de `departamento_proveedor === departamento_entidad` sobre adjudicados con `departamento_proveedor` legible (columnas guardadas y no leídas: A4 Tabla A #45-46, C6); mínimo 5; «No Definido» aparte.
BENEFICIA: dice si una alcaldía contrata con los de su zona (y si un foráneo entra); para Helder (Ibagué) es la señal de en qué entidades del Tolima juega de local.
AFECTA: es el domicilio REGISTRADO en SECOP, no la sede real; se dice. Exige reconstruir el índice.
Fuente: histórico p6dx · certeza: medido · costo: sync.

**EXP-47 · Cuantía bajo el umbral para limitar a Mipyme** · nuevo · ambos · E15 · tanda 1
CORTO: «Cuantía por debajo del umbral para limitar a Mipyme ($511.708.497 en 2026)» (chip gris, solo cuando aplica).
CONCISO: `cuantia_cop < UMBRAL_MIPYME_2026` (`lib/socio_por_proceso.js:48`, cifra con fecha y fuente en COMPLEMENTO V-12; `avisoMipyme` `:104-118` ya la usa para PRODIAC, que es gran empresa: `lib/perfiles.js:156`). Helder y Génesis son microempresa (`perfiles.js:86,121`), así que para ellos es una oportunidad, no un riesgo.
BENEFICIA: el experimentado sabe que por debajo del umbral la entidad PUEDE limitar la convocatoria (y que con PRODIAC no cabría).
AFECTA: el corpus no publica si la limitó (A3 § b: grep vacío); es una posibilidad, jamás una exclusión. La cifra cambia cada año: revisar en enero (comentario del código).
Fuente: `cuantia_cop`, constante con fuente · certeza: calculado sobre publicado · costo: petición.

**EXP-48 · Qué versión de documento tipo probablemente rige** · nuevo · experimentado · E11 · tanda 3
CORTO: «Probablemente rigen los documentos tipo de infraestructura social vigentes desde febrero de 2026: confírmelo en el aviso de convocatoria» (plegado).
CONCISO: sector (`tipo_de_contrato`, objeto, `codigo_principal_de_categoria`) + `fecha_de_publicacion_del` ≥ 16-feb-2026 → v2 de infraestructura social (`lib/dictamen.js:311-312` ya escribe la norma citable; transporte → `lib/formulario1.js:87`). Censo hoy: 0 (A5 § 4.1).
BENEFICIA: distingue un pliego desactualizado de un pliego sastre, y dice qué fórmula de experiencia aplica.
AFECTA: es una DEDUCCIÓN (sector + fecha): «probablemente», y el aviso de convocatoria gana. El texto de la resolución no se leyó desde aquí (A5 § 8).
Fuente: campos publicados + norma citada en el árbol · certeza: calculado (declarado como probable) · costo: petición.

**EXP-49 · Proceso por lotes** · nuevo · ambos · E1 · tanda 3
CORTO: «Proceso por lotes (3)».
CONCISO: `numero_de_lotes` existe en p6dx y hoy solo llega al histórico (A4 C5: activa `undefined`); entra en `lib/proyeccion.CAMPOS` + una full.
BENEFICIA: explica cuantías que no cuadran con un solo contrato y los «desiertos con adjudicación» del índice.
AFECTA: exige una full (cero peticiones nuevas: se piden todas las columnas, `lib/socrata.js:12-17`); cobertura por medir antes de enseñar.
Fuente: p6dx · certeza: publicado · costo: sync.

**EXP-50 · Republicado desde su publicación** · nuevo · experimentado · E8 · tanda 3
CORTO: «Republicado el 3 de septiembre (puede ser una adenda o una publicación de fase)».
CONCISO: `fecha_de_ultima_publicaci` (diccionario SARA #15; descartada hoy por la proyección, A4 C4; tres módulos ya la leen como respaldo inerte: `lib/dictamen.js:404`, `lib/cronograma.js:91`, `lib/manifestacion.js:134`). Entra en `CAMPOS` + full; cobertura 100 % en el censo del 16-ago (`docs/datos.md`).
BENEFICIA: la señal de «algo cambió» sin leer el pliego, complementaria de EXP-25 (que solo ve campos del dataset).
AFECTA: NO se puede afirmar que sea adenda; el texto lo dice. Frente a `e2u2-swiw` (modificaciones a procesos): fuente mejor, tras la sonda (tanda 4).
Fuente: p6dx · certeza: publicado · costo: sync.

**EXP-51 · Cuántas veces se ha visto este proceso** · nuevo · experimentado · E5 · tanda 4 (solo tras medir cobertura)
CORTO: «Visto 68 veces en SECOP II» (plegado).
CONCISO: `visualizaciones_del` (diccionario; descartada hoy). Única señal ANTERIOR al cierre sobre interés (A4 #33).
BENEFICIA: interés temprano antes de que exista ningún dato de oferentes.
AFECTA: mide miradas (incluida la entidad), no oferentes; **cobertura no medida**: no se enseña hasta medirla con `lib/columnas_historicas`.
Fuente: p6dx · certeza: publicado · costo: sync.

### 3.4 El competidor: perfil casi instantáneo, con la espera animada (encargo obligatorio ii)

**EXP-39 · «Dónde gana este competidor» en 2-3 comandos, y qué se ve mientras carga** · nuevo · experimentado · E5/E16 · tanda 2
CORTO: título del modal «Dónde gana este competidor»; espera: «Leyendo el índice de adjudicaciones…»; si no está en el índice: «Esta empresa no está en el índice: se recorre el histórico completo. Puede tardar unos segundos.»
CONCISO: la misma `op=competidor` (`api/inteligencia.js:17-24` → `lib/handlers/inteligencia/detalle.js:174`) sirve primero el hash inverso `indice:adjudicatario` (campo = `nit:…`/`n:…`, valor = el registro que hoy calcula `detalleAdjudicatario`), construido en el MISMO barrido de `construirIndice` con las MISMAS funciones (`esAdjudicado` → `claveAdjudicatario` → `bajaDeFila`: A2 § 4.2, prototipo que cuadra al 100 % con el barrido de hoy, 155/155 · 143/143); si el campo no existe, cae al barrido de hoy con `origen: "barrido"`. Medido por A2: hoy cada clic en frío = 8-95 comandos y 2-2,7 MB (0,8-4,2 s con 40 ms/comando); con el hash 2-3 comandos (≈ 60-250 ms con el supuesto REST). Construir el hash: 54-66 HSET, 6-9 MB, +0,3-0,7 s de CPU en el barrido.
**La espera** (respeta A6 § 1.10): `abrirModal` pinta al instante un ESQUELETO con la FORMA del perfil —dos líneas de cabecera y cinco filas de tabla— con la clase `.exp-esqueleto` que ya existe (`public/index.html:1288-1290`, keyframe `brillo` de `:794`, 1,5 s; no se añade ningún `@keyframes`, V4-19 quiere borrar cuatro), `aria-busy="true"` en `#modal-cuerpo` (`index.html:4521`), y una frase que dice qué se arma. El modal vive FUERA de `#app` (`#app` abre en `:2006`, el modal en `:4509`; conteo de `<div>` reproducido § 7.g), así que el `brillo` de `#app .animate-pulse` NO lo alcanza: por eso se usa `.exp-esqueleto`, que es global. **Reducir movimiento**: `.exp-esqueleto { animation: none }` ya está en `:1380`; se añade `background: var(--bg-inset-2)` (gris plano, como `:850` para la lista) y el `.spin` ya queda quieto (`:849`). Ningún token nuevo: el esqueleto desaparece de golpe cuando llega el dato (§ 7.3.5 del informe de diseño); `--dur-5` no se toca (su único uso es `.dato-cambio`). Si la respuesta trae `origen: "barrido"`, el texto de la espera cambia (un cambio de texto no es movimiento).
BENEFICIA: «dónde más gana, cuántas veces y por cuánto» en menos de un segundo y con algo que ver mientras tanto; y el «no existe» también es instantáneo.
AFECTA: frescura del índice (hasta un mes, o la última reconstrucción manual): el pie dice «Con datos hasta el 31 de agosto de 2026» y un botón «Actualizar ahora» fuerza el barrido (`refrescar=1`) con la misma espera. Caché `v7` → `v8`. Lo que NO cambia: la identidad (NIT y nombre cuentan aparte, declarado) y `esAdjudicado` (decisión de § «Remates «R4-remates-inteligencia»…»).
Fuente: histórico p6dx en Redis · certeza: medido · costo: sync (construcción) / clic (2-3 comandos).

**EXP-40 · La cabecera del perfil dice lo que sostiene cada cifra** · cambia · ambos · E5 · tanda 2
CORTO: «CONSTRUCTORA DEL TOLIMA SAS · NIT 900123456» · «15 contratos en 6 entidades · $28.400 M en 14 de 15 contratos con valor publicado · último: 12 de ago de 2026» · sin NIT: «SECOP no publica el NIT de esta empresa: se identifica por el nombre tal como lo escribe la entidad» · pie fijo: «Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde enero de 2024. Fuera de eso, no aparece aquí» · «Con datos hasta el 31 de agosto de 2026».
CONCISO: `procesos_con_valor` ya viaja y no se pinta (`app.js:3366-3368`); `identificacion null` hoy no pinta línea (`:3349-3353`); los límites viven solo en `que_es` al pie (A2 § 5).
BENEFICIA: el experimentado sabe si «$28.400 M» está completo y si el nombre puede tener otro perfil bajo su NIT.
AFECTA: ninguna cifra nueva.
Fuente: `detalleAdjudicatario` · certeza: medido · costo: clic.

**EXP-41 · «En esta entidad» resaltada y el resto ordenado** · nuevo · experimentado · E5 · tanda 2
CORTO: «En esta entidad: 6 de sus 15 contratos» y la fila de la entidad de origen primero y resaltada; luego las demás por ganados.
CONCISO: la tarjeta pasa `data-entidad`; el modal compara con `claveCanonica` (`lib/indice_competencia.js`, la misma que agrupa el detalle de la entidad, `competencia_detalle.js:283-285`) para no partir una entidad en dos grafías (hoy `entidades[]` va con `lic.entidad` crudo: A2 § 2).
BENEFICIA: la comparación que él hace de cabeza («¿es de aquí o de todas partes?») queda hecha.
AFECTA: dos grafías de una entidad se agrupan al mostrar; el nombre más frecuente se publica (como `detalleEntidad`).
Fuente: `detalleAdjudicatario` · certeza: medido · costo: clic.

**EXP-42 · Baja media con la que gana** · se conserva · experimentado · E2/E5 · — («Baja media con la que gana: 3 % (14 procesos)» o «sin dato (motivo)»; misma regla del índice de baja; anulada sin NIT con motivo real: `competencia_detalle.js:649-653`; medido; clic).

**EXP-43 · «En todo SECOP II» por NIT** · nuevo · experimentado · E5 · tanda 3
CORTO: «En todo SECOP II: 41 contratos por $380.000 M desde 2024 (todas las modalidades)» (segunda línea, solo con NIT).
CONCISO: `lib/socio.js:333-360` ya agrupa en Socrata por NIT (`$group=anio`, `sum(valor_total_adjudicacion)`); un `$group=entidad` da las entidades. Cubre todo SECOP II, no solo el corpus (A2 § 4.4).
BENEFICIA: la cota inferior del corpus (obra, competitivos, 2024+) se completa con el total público.
AFECTA: externo, best-effort, con tope de tiempo; sin NIT no existe; NO VERIFICABLE hoy (datos.gov.co 403 desde aquí). Se enseña como segunda cifra declarada, nunca sustituye a la del índice.
Fuente: p6dx en vivo · certeza: medido (cuando responde) · costo: externo.

**EXP-52 · El modal de la entidad abre el perfil con texto, no con un tooltip** · cambia · ambos · E5 · tanda 2
CORTO: rótulo «Ver los 5 que más ganan y dónde más ganan»; en cada fila un botón «Ver dónde más gana ›»; los segmentos de la barra apilada pulsables; «Otros» explica que es la cola.
CONCISO: `bloqueAdjudicatarios` (`app.js:2918-2975`): la fila hoy solo tiene `title` (`:2930`), sin afordancia en teléfono (cerradura «sin tooltip», `tests/e2e.js:8663-8680`, aplica el mismo principio). No se revierte el pliegue (decisión del 6-sep, § «Lote «B9a-entidad-graficos»…»): el rótulo literal que la suite fija (`tests/e2e.js:13033`) cambia a propósito.
BENEFICIA: dos pulsaciones con texto claro en vez de tres a ciegas (A2 § 1.3).
AFECTA: una cerradura literal se reescribe.
Fuente: `detalleEntidad` · certeza: medido · costo: clic.

**EXP-56 · Usted aquí: cuántas veces se presentó y cuántas ganó** · nuevo · experimentado · E16 · tanda 4
CORTO: «Usted se presentó 3 veces aquí y ganó 1» (en el modal de la entidad; solo si hay guardados con desenlace).
CONCISO: `seguimiento.js:341-393` ya calcula «veces» y «ganadas» por entidad con `hgi6` + p6dx (A4 Tabla A″); el cociente no se publica (NO VERIFICADO en pantalla).
BENEFICIA: el postmortem por entidad del cap. 21, sin hoja de Excel.
AFECTA: externo (hgi6 en vivo, 0 filas mientras el proceso está abierto); solo desenlaces que la app vio.
Fuente: hgi6 + corpus · certeza: medido · costo: externo.

### 3.5 Lo que exige fuentes nuevas o acumular lo que ya se lee (tanda 4, tras la sonda M-DGF-17, que no existe: A4 § 5)

**EXP-53 · Archivos de oferta cargados a este proceso** · nuevo · experimentado · E13/E5 · tanda 4
CORTO: «Archivos de oferta cargados: 4 (nombres leídos del índice de SECOP II)» (en Mis procesos, no en la tarjeta).
CONCISO: `dmgg-8hin` mezcla los archivos de la entidad con los de los proponentes; `lib/documentos_proceso.js:37-40,183` ya los separa por nombre y fecha y hoy los descarta (A5 § 4.4).
BENEFICIA: contra quién compite de verdad, el día después del cierre y antes del informe de evaluación.
AFECTA: el índice va ~3 días por detrás; el nombre del archivo no siempre identifica al proponente; «archivos», nunca «oferentes».
Fuente: `dmgg-8hin` · certeza: publicado (conteo) · costo: externo.

**EXP-54 · Estampillas y descuentos vistos en pliegos de esta entidad** · nuevo · experimentado · E3 · tanda 4
CORTO: «Estampillas vistas en pliegos de esta entidad: 1,5 % (2 pliegos, el último el 3 de sep)».
CONCISO: acumular `(entidad, concepto, pct, fecha, id_proceso)` cada vez que `lib/deducciones` lee un pliego (A5 § 4.3; «No hay tabla nacional que copiar», `lib/deducciones.js:12-16`).
BENEFICIA: el costo oculto que más margen se come, con base y fecha.
AFECTA: observación, no tarifa: el pliego del proceso gana; «lo que descontó en otros procesos». Enlazar deducciones a Precios sigue APARCADO (§ «Lo APARCADO por decisión del dueño (20-ago-2026)»): esto es una tabla de consulta, no un cambio del motor.
Fuente: pliegos leídos · certeza: medido (observado) · costo: sync (al leer cada pliego).

**EXP-55 · Con cuánto ofertaron todos** · nuevo · experimentado · E2/E16 · tanda 5
CORTO: «De 12 ofertas, la que ganó fue la 4.ª más baja» (modal de la entidad, por proceso cerrado).
CONCISO: `wi7w-2nvm` (Ofertas por proceso, `valor_de_la_oferta`); la llave (`id_del_proceso_de_compra` CO1.REQ o CO1.BDOS) **sin confirmar** (A4 Tabla B).
BENEFICIA: la única forma de ver el rango de posturas, no solo la ganadora.
AFECTA: sin llave confirmada no hay dato; sin causal de rechazo (no está en ningún dataset hallado). Tras la sonda.
Fuente: `wi7w-2nvm` · certeza: sin_fuente (hoy) · costo: externo.

**EXP-57 · Se adjudicó por el presupuesto oficial en X de N** · nuevo · experimentado · E2 · tanda 3
CORTO: «Se adjudicó por el presupuesto oficial en 131 de 131 contratos de Tolima» (plegado, junto a EXP-33).
CONCISO: la cubeta 0 del histograma de baja por registro (entidad o departamento), como frecuencia natural; la meta ya publica `baja_exactamente_cero` global (`lib/indice_baja.js:37-41`).
BENEFICIA: «sin bajar el precio» con su cuenta: el experimentado decide si oferta al 100 % del oficial.
AFECTA: NO VERIFICADO si el registro publicado del índice de baja conserva la cubeta 0 por entidad; si no la conserva, el dato no se enseña.
Fuente: `indice:baja` · certeza: medido · costo: petición.

## 4. Las reglas que no se pueden violar, y cómo las cumple cada dato

| Regla | Datos que la tocan | Cómo se cumple |
|---|---|---|
| Todos los datos ciertos siempre; un calculado se declara; sin dato es sin dato | EXP-05 (ritmo «unos», plazo «no publicado» y no el 12 de la K), EXP-10 («—» sin histórico), EXP-11 («si bajan lo habitual… quedaría»), EXP-14 («sin fecha de cierre publicada»), EXP-26 («sin descontar contratos en ejecución»), EXP-27 (tres estados), EXP-39/40 («con datos hasta», cota inferior, identidad por nombre), EXP-48 («probablemente»), EXP-50 («puede ser adenda o fase») | Cada texto lleva la base y, donde es derivado, el condicional; ningún `\|\| 0` nuevo: `hechosDeRegistro` y `maquina` descartan la ausencia antes de convertir (`indice_competencia.js:479-500`) |
| Un dato publicado gana a uno calculado | EXP-14 (hora del cronograma del pliego gana), EXP-15 (fecha del pliego sobre el conteo), EXP-44 (la fecha de adjudicación del pliego gana a la estimada, ya en el calendario), EXP-48 (aviso de convocatoria gana), EXP-49/50 (columnas publicadas antes que derivadas) | Donde el pliego se leyó (`op=cronograma`), la tarjeta usa ese dato y lo dice «(fecha del cronograma del pliego)» |
| Una cifra redondeada no decide | EXP-09 (un decimal solo para mostrar; ordena `ve`), EXP-11 (`fmtCorto` solo pinta), EXP-28 (cubetas; decide el optimizador), EXP-44 (días de oficina enteros del histograma; nada decide con ellos) | Ningún dato nuevo entra en la cascada que ordena o filtra; todo es lectura |
| Lo que se VE arriba (hecho + frecuencia natural, sin «probabilidad»); lo que se TOCA plegado | § 5: arriba EXP-01…04, 07, 08, 09-11, 14, 18, 38, 44 (chip corto); plegado EXP-05 (ritmo), 15, 16, 20 (detalle), 26-28, 32-33, 45-49, 57; modal EXP-39-43, 52, 55-56 | «1 de 3», «6 de 15», «la mitad de sus 8», «7 de cada 10»; ni porcentaje ni «probabilidad» en la tarjeta (§ «FILOSOFÍA DEL PRODUCTO») |
| Usted, sin jerga, sin emoji | los 58 textos propuestos | Ejecutados contra `tuteoEn`, `VOSEO_RE`, `RE_EMOJI_UI` y las regex de `JERGA_JS` + «mediana/p75/percentil/hábiles/probabilidad»: 0 fallos (§ 7.d). «Días de oficina», «la mitad», «tres de cada cuatro» |
| Ninguna pulsación sin respuesta visible | EXP-38 (botón → modal con esqueleto al instante), EXP-39 («Actualizar ahora» → misma espera), EXP-52 (botón con texto), EXP-18 (banda) | `abrirModal` pinta el esqueleto ANTES del `fetch`; un error dice qué hacer (los tres mensajes de hoy se conservan) |
| No reescribir una regla que existe: llamarla | EXP-05/36 (`plazoMesesDe`), EXP-15/16 (`habilesEntre`, `esFestivo`, `percentilHistograma`), EXP-38/39 (`claveAdjudicatario`, `esAdjudicado`, `bajaDeFila`, `cargarAdjudicatario`), EXP-44/45 (`hechosDeEntidad`, `htmlPlazoAdjudicacion`, `htmlDesiertos`), EXP-47 (`UMBRAL_MIPYME_2026`, `avisoMipyme`), EXP-08 (`socioPorProceso`, `resumenSocio`, `congelarSocio` intacto), EXP-41 (`claveCanonica`) | Cada ficha nombra la función; la cerradura de cada tanda incluye la mutación «sustituir la llamada por una copia» donde ya hay precedente (§ «Cinco medianas en `lib/`, y ya divergían») |
| El falso caro en oportunidades es el negativo | EXP-07/08 (ámbar, nunca bloquea), EXP-47 (posibilidad, no exclusión), EXP-15 (aviso, no filtro) | Ningún dato nuevo cambia `viable` ni la cascada |
| Sin credencial no salen las cifras del perfil; token inválido = 401 | EXP-26 (crp/crpc), EXP-28 (baja), EXP-11, EXP-38 (líder) | `lib/publico.sinFinanzas` (`:118-160`) sigue anulando; el líder se añade a la lista de lo que se redacta sin token |
| Dos cosas distintas no pueden tener nombres parecidos | EXP-08 (`socio.con` vs `alcanzable_con_socio`: se retira el segundo o se iguala), EXP-44 (`hechos_entidad` aparte de `competencia_entidad`) | Un solo campo por pregunta |
| El arranque va al final del IIFE; el parseo aparte del fetch | EXP-39 (nueva rama en `cargarAdjudicatario`: `leerJson` aparte, ya así) | Se conserva el patrón de `:3382-3409` |
| Un endpoint nuevo es una `op` | EXP-39 usa `op=competidor` existente; EXP-38 viaja en `op=listar`; nada nuevo en `api/` | `api/*.js` sigue en 6 (`tests/e2e.js:4285, 33412, 34533`) |

## 5. El orden en pantalla y la maqueta

### 5.1 Qué va dónde

- **Arriba (se VE, cabe en 390 px sin abrir nada)**: título + referencia · entidad · municipio · departamento · cuantía · modalidad · plazo de obra · chip No viable (si aplica) · línea de requisitos (con la cifra de la que depende) · **con quién** · tres cifras (compiten · se gana · deja) · «Ver cómo se calcula» · chips: cierre con hora, manifestación, competencia (botón), **adjudica en ~N días de oficina** (botón al modal), zona, prorrogado con días · **quien más gana aquí ›** · avisos (señal #11, cierre, manifestación) · margen (si se ordenó por margen) · adendas con conteo.
- **Plegado («Más detalles», se TOCA)**: puertas con cifras (y lo que la K no descuenta, y lo que quedaría) · anticipo (tres estados) · suelen bajar con banda y origen · precios unitarios/global (también arriba como chip corto) · encaje del RUP · días de oficina para ofertar + festivo/fin de año · lo que suele dar la entidad · ritmo mensual · declaró desierto · umbral Mipyme · lotes · republicado · versión de documento tipo · cómo se adjudica en el departamento + «al oficial en X de N».
- **Modal de la entidad (se COMPARA)**: lo de hoy (banda, resumen, por año, prórroga, plazo de adjudicación, desiertos, encogimiento, quién gana aquí con barra y tabla) + filas y segmentos pulsables con texto + ganadores locales + «usted aquí» + (tanda 5) posturas.
- **Modal del competidor**: cabecera honesta · «en esta entidad» · baja media · tabla por entidad · «en todo SECOP II» (tanda 3) · pie con límites y frescura · «Actualizar ahora».

### 5.2 Maqueta de la tarjeta reformada · PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA

Cifras REALES (reproducidas § 7.b-c con las funciones del árbol y la fila de la captura del dueño): cuantía, K, CRPC, financiación, patrimonio, «30 % o más», el veredicto de socio en sus dos ramas, 29 días de oficina, festivo 12-oct, $796 M/mes, «le quedarían ≈ $15 M». Cifras de la CAPTURA del dueño: 1,4 en 55, «1 de 3», Tolima sin bajar en 131. Cifras de EJEMPLO (dependen del hash de producción, no verificable): la referencia, el líder «6 de 15», «7 días de oficina (la mitad de 8)», «desierto 1 de 9», el plazo «8 meses» y las fechas 1-sep/13-oct.

```
┌────────────────────────────────────────────────────────────────────────────────────┐
│ PAVIMENTACIÓN DE VÍAS URBANAS EN PURIFICACIÓN - TOLIMA            $ 6.365.863.685  │
│ Ref. LP-008-2026                                    Licitación pública · 8 meses de obra │
│ ALCALDÍA MUNICIPAL DE PURIFICACIÓN · Purificación · Tolima                          │
│                                                                                    │
│ ● Cabe solo si el pliego trae anticipo del 30 % o más, o con socio.        [ámbar] │
│ ● Solo, si el pliego trae anticipo del 30 % o más; sin anticipo, con PRODIAC       │
│   (80 % usted, 20 % PRODIAC).                                              [ámbar] │
│                                                                                    │
│ ┌─────────────────────┬───────────────────────┬──────────────────────────────────┐ │
│ │ 1,4                 │ 1 de 3                │ Calcular                         │ │
│ │ empresas por proceso│ se gana,              │ cuánto deja: falta su costo      │ │
│ │ en 55 procesos      │ aproximadamente       │ se calcula en Precios            │ │
│ └─────────────────────┴───────────────────────┴──────────────────────────────────┘ │
│                                                              Ver cómo se calcula   │
│ [Cierra en 30 días · 13 de oct de 2026 · 5:00 p. m.]  [● Poca competencia · 55 procesos ›] │
│ [Adjudica en ~7 días de oficina ›]  [Su zona (Ibagué)]                              │
│ Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›                        │
│ Atención: aquí se presentan 1,4 oferentes en promedio. Puede ser un nicho suyo,    │
│ o un pliego escrito a la medida de otro: revise un pliego reciente antes de …      │
│                                                                                    │
│ ▸ Más detalles                                                                     │
│   ● Registro de proponente ✓ · ● Capacidad de facturar ~ · ● Caja ? · ● Competencia ? │
│   Capacidad: con anticipo del 30 % consume el 100 % de su capacidad (le quedarían  │
│   unos $15 M); calculada sin descontar contratos en ejecución: no hay ninguno      │
│   cargado.                                                                         │
│   Caja: si no hubiera anticipo necesitaría financiar ≈ $1.273 M antes del primer   │
│   cobro y su patrimonio es $1.107 M. Confirme el anticipo en el pliego.            │
│   [El proceso no publica si hay anticipo]  [Suelen bajar: sin datos de esta entidad] │
│   [Precios unitarios]  [Da 29 días de oficina para ofertar (publicado el 1 de sep)] │
│   [El cierre cae el día siguiente a un festivo: confirme la hora en el cronograma] │
│   [Unos $796 M por mes de obra]  [Declaró desierto 1 de sus 9 procesos]            │
│   Cómo se adjudica en TOLIMA: sin bajar el precio · 131 contratos. En TOLIMA se    │
│   gana sin bajar el precio: los que ganaron ofertaron prácticamente por el         │
│   presupuesto oficial (131 contratos ya adjudicados en todos los tipos de obra).   │
│   Se adjudicó por el presupuesto oficial en 131 de 131 contratos de Tolima.        │
│                                                                                    │
│ Presentación de oferta        [Guardar]  [Calcular mi precio]  Ver en SECOP II ↗   │
└────────────────────────────────────────────────────────────────────────────────────┘
```

Lo que esta tarjeta le dice al experimentado en diez segundos, y hoy no: que cabe solo con anticipo del 30 % (hoy: «con detalles por revisar»), que sin anticipo va con PRODIAC al 80/20 (hoy: «Solo. Le alcanza»), quién gana en Purificación y cuánto (hoy: tres pulsaciones), que la alcaldía adjudica en una semana de oficina (hoy: en el modal), que le dieron 29 días de oficina y el cierre cae tras un festivo (hoy: nada), y que en Tolima nadie baja el precio (hoy: sí, plegado).

### 5.3 Maqueta del modal del competidor (EXP-39/40/41) y la espera

Al pulsar «Quien más gana aquí: CONSTRUCTORA DEL TOLIMA SAS · 6 de 15 ›» (o «Ver dónde más gana ›» en el modal de la entidad):

```
DÓNDE GANA ESTE COMPETIDOR
CONSTRUCTORA DEL TOLIMA SAS                                                   [×]
┌──────────────────────────────────────────────────────────────┐
│ ████████████████████████░░░░░░░░  (cabecera: 2 barras .exp-esqueleto)  │
│ ██████████░░░░░░░░░░░░░░░░░░░░░░                                  │
│ ─────────────────────────────────────────────────────────────  │
│ ████████████████████  ████  ████████  ████████   (5 filas)     │
│ …                                                              │
│           Leyendo el índice de adjudicaciones…                 │
└──────────────────────────────────────────────────────────────┘
```
`#modal-cuerpo[aria-busy=true]`; brillo de 1,5 s (`.exp-esqueleto`, keyframe `brillo` que ya existe); con «Reducir movimiento»: gris plano quieto y el mismo texto. Si la respuesta llega con `origen: "barrido"` el texto pasa a «Esta empresa no está en el índice: se recorre el histórico completo. Puede tardar unos segundos.» Cuando llega el dato, el esqueleto desaparece de golpe:

```
CONSTRUCTORA DEL TOLIMA SAS · NIT 900123456
15 contratos en 6 entidades · $28.400 M en 14 de 15 contratos con valor publicado · último: 12 de ago de 2026
En esta entidad: 6 de sus 15 contratos
Baja media con la que gana: 3 % (14 procesos)

Entidad                                  Ganados   Valor adjudicado   Último contrato
ALCALDÍA MUNICIPAL DE PURIFICACIÓN  ◀        6          $9.800 M        12 de ago de 2026
GOBERNACIÓN DEL TOLIMA                        4          $12.100 M       3 de may de 2026
…
En todo SECOP II: 41 contratos por $380.000 M desde 2024 (todas las modalidades)      [tanda 3]
Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde enero de 2024. Fuera de eso, no aparece aquí.
Con datos hasta el 31 de agosto de 2026 · [Actualizar ahora]
```

### 5.4 Modal de la entidad (EXP-52, 44-46, 56)

Lo de hoy en el mismo orden (`pintarDetalle`, `app.js:3078-3118`), con estos cambios: el rótulo del pliegue «Ver los 5 que más ganan y dónde más ganan»; cada fila con el botón «Ver dónde más gana ›»; los segmentos de la barra pulsables; debajo de «Quién gana aquí», «7 de cada 10 ganadores aquí tienen domicilio registrado en Tolima (12 contratos)»; y, si hay guardados con desenlace, «Usted se presentó 3 veces aquí y ganó 1». El plazo de adjudicación y los desiertos siguen donde están (son el espejo del hash).

## 6. Tandas (sesiones), en el orden que menos riesgo acumula

| Tanda | Qué entra | Qué toca | Cerraduras que caen A PROPÓSITO y se reescriben | Cómo se verifica |
|---|---|---|---|---|
| **1 · La tarjeta dice la verdad con lo que ya viaja** | EXP-01, 02/29, 03, 04, 05, 07, **08**, 09, 10, 11, 14, 15, 18, 20, 25, 26/31, 27, 28, 32, 36, 47 | `public/app.js` (tarjeta y funciones nombradas), `lib/handlers/procesos/listar.js` (`resumenSocio`, campo `para_ofertar`), `lib/socio_por_proceso.js` (`linea`, rama condicional), `lib/perfiles.js` (`nombreCorto`), `docs/MEMORIA.md` | `tests/e2e.js:4706-4707` (claves del resumen), `:4732-4737` (textos de socio en la tarjeta); nuevas: línea ≤ 90, mismo socio que el expediente (mutación: leer `alcanzable_con_socio`), tres estados del anticipo (mutación: volver a `pct > 0`), «—» con fuente supuesta, hora solo si no es medianoche | 4/4 sin tuberías; navegador real a 390 px (consola limpia); medir `por_pagina=100` contra 4,5 MB (A6 § 1.8; +≈ 457 B/fila medidos § 7.e) |
| **2 · El competidor a un clic y casi instantáneo** | EXP-38, **39**, 40, 41, 52, 44, 45, 16, 46, 57 | `lib/indice_competencia.js` (barrido: `lider`, `para_ofertar`, `locales`; hash `indice:adjudicatario`), `lib/competencia_detalle.js` (camino rápido + `origen`), `lib/handlers/inteligencia/detalle.js`, `listar.js` (`hechos_entidad`, `lider` con token), `lib/publico.js`, `public/app.js` (botón, esqueleto, modal), `public/index.html` (reduced-motion de `.exp-esqueleto`), memoria (decisión sobre el líder en `op=listar`) | `tests/e2e.js:13033` (rótulo literal del pliegue); nuevas: índice inverso ≡ barrido (155/155, 143/143: la comparación del prototipo A2), mutación «publicar la mediana ya calculada», `lider` null sin token y 401 con token inválido, esqueleto con `aria-busy` y sin `@keyframes` nuevo, reduced-motion apaga `.exp-esqueleto` | 4/4; `E2E_REDIS_LENTO_MS` para el camino de barrido; navegador con «Reducir movimiento» activado; paso del dueño: reconstruir el índice (`/api/sync/historico?reconstruir_indice=true`) y leer `duracionMs`/`comandosRedis` en Chrome (A2 § 3.3) |
| **3 · Ingesta ampliada (una full, cero peticiones nuevas)** | EXP-49, 50, 48, 43 | `lib/proyeccion.js` (`CAMPOS`: `numero_de_lotes`, `fecha_de_ultima_publicaci`, `codigo_entidad`, `ordenentidad`), `lib/columnas_historicas.js` (cobertura), `lib/socio.js` (`$group=entidad`), tarjeta y modal | Ninguna cae; nuevas: cobertura medida antes de pintar (la lección de `proveedores_que_manifestaron = 0`), «probablemente» en la versión, `null` con motivo sin sector | 4/4; full en producción; `/api/diagnostico` para la cobertura |
| **4 · Fuentes nuevas tras la sonda** | sonda M-DGF-17 (no existe), EXP-53, 54, 56, 51 | `tests/sondear_fuentes.js` (nuevo), `lib/documentos_proceso.js`, `lib/deducciones.js` (acumulador), `seguimiento.js` (cociente) | Nuevas: cada fuente con fecha y conteo; sin llave confirmada no hay dato | 4/4; la sonda corre desde una máquina con red (aquí 403) |
| **5 · Posturas** | EXP-55 | `wi7w-2nvm` tras confirmar la llave | — | — |

Convenciones que cada tanda repite (A6 § 3): lotes de ficheros DISJUNTOS entre agentes; `tests/e2e.js` fuera de la fase paralela (cerraduras como guiones autónomos, spliciadas en serie); ninguna aserción existente se toca sin decir cuál y por qué; no se commitea con agentes vivos; sección nueva al FINAL de `docs/MEMORIA.md` con «En una línea:», `> SUPERADA` donde toque, y `node tests/mapa.js --escribir` en el mismo commit; PR contra `main` desde la rama `claude/…` (§ «Por qué la entrega cambió de «Trabaja en main» a «abre tú el pull request» (13-sep-2026)»).

## 7. Reproducciones ejecutadas (comando → salida)

Guion: `node scratchpad/plan/d_exp_repro.js` → `d_exp_repro.salida.txt` (CODIGO=0). Los dos `node -e` de (b′) y (f) se transcriben.

- **(a) `competenciaDe` frente a `hechosDeRegistro`** sobre `registroPublicado({procesos: 55, promedio: 1.4, nivel: "baja", hechos: {adjudicados: 8, desiertos: 1, plazo: {n: 8, hist: {5: 2, 7: 3, 9: 2, 12: 1}}}})`: el registro publicado trae `plazo_adjudicacion` y `desiertos`; `competencia_entidad` (lo que viaja en la fila) = `{"nivel":"baja","promedio_oferentes":1.4,"mediana_oferentes":1,"total_procesos":55}` → **no lleva** `plazo_adjudicacion` ni `desiertos`; `hechosDeRegistro` sobre el mismo registro = `{"plazo_adjudicacion":{"base":8,"adjudicados":8,"min_procesos":5,"mediana_dias_habiles":7,"p75_dias_habiles":9},"desiertos":{"n":1,"adjudicados":8,"base":9,"min_procesos":5,"pct":11}}` (183 B).
- **(b) Purificación, $6.365.863.685, base `helder`** (`evaluarPuertas` + `socioPorProceso` reales): P1 pasa («clase inscrita»); **P2 pasa con advertencia**: «SECOP II no publica el anticipo de este proceso. Sin anticipo la carga (CRPC $6.365.863.685) supera su capacidad residual (K $4.470.921.189): el proceso solo cabe si el pliego prevé un anticipo del 30 % o más…»; **P3 `sin_dato`**: «Si no hubiera ninguno, necesitaría financiar ≈ $1.273.172.737 antes del primer cobro y su patrimonio es $1.107.252.964»; P4 «No hay histórico suficiente»; `pasa_todas: true`; socio: `{"tipo":"solo","participacion_suya":100}`, frase «Solo. Esta le alcanza sin socio: se queda con todo.» (186 B). Tamaños: helder microempresa · genesis microempresa · prodiac gran_empresa.
- **(b′) la misma fila con el anticipo declarado**: con `anticipo_pct: 0, anticipo_declarado: true` → P2 `false` («La carga… supera su capacidad residual»), P3 `false` («El pliego declara que no habrá anticipo…»), `no_viable_por: ["K","Caja"]`, socio **`{"tipo":"con_socio","socio":"prodiac","cierra_todo":true,"reparto":{"suya":80,"del_socio":20}}`**, frase «PRODIAC LTDA suma capacidad: usted solo no llega a esta cuantía. Reparto sugerido: 80 % usted, 20 % PRODIAC LTDA.»; opciones: prodiac abre capacidad+caja (patrimonio juntos $9.416 M) y genesis también cierra (patrimonio juntos $1.318 M) — gana PRODIAC por el criterio 4 (cuantía ≥ umbral, A3 § b). Con `anticipo_pct: 30` → P2 «Consume 100 % de su capacidad residual (CRPC $4.456.104.580 / K $4.470.921.189)», P3 pasa, socio «solo». **Conclusión**: el consejo depende del anticipo y hoy la tarjeta afirma «solo» sobre lo no verificado (EXP-08).
- **(c)** `plazoMesesDe({duracion:"8", unidad:"Meses"}) = 8`, `plazoMesesDe({}) = 12`; `6.365.863.685 / 8 = 795.732.961` COP/mes; `habilesEntre("2026-09-01","2026-10-13") = 29` (42 calendario); `esFestivo("2026-10-12") = true`, `esHabil("2026-10-13") = true`; festivos de fin de año: 8-dic, 25-dic, 1-ene, 11-ene.
- **(d)** 58 textos propuestos contra `tuteoEn`, `VOSEO_RE`, `RE_EMOJI_UI` y las regex de `JERGA_JS` (+ `mediana|p75|percentil|hábiles`, `probabilidad`): **0 con fallo**.
- **(e)** bytes por fila de los campos nuevos: `socio` con línea 158 B · `lider` 86 B · `para_ofertar` 30 B · `hechos_entidad` 183 B → ≈ 457 B/fila, ≈ 45 KB con `por_pagina=100`.
- **(f)** `evaluarZona({TOLIMA, Purificación}, base)`: sin base «Distancia sin calcular: no sabemos desde dónde opera»; base Bogotá «Cerca · ~200 km de Bogotá»; base Ibagué «Su zona (Ibagué)» (`BASE_DUENO = ['Bogotá','Ibagué']`).
- **(g)** `#modal-competencia` está FUERA de `#app` (302 `<div>` abiertos y 302 cerrados entre `id="app"` (línea 2006) e `id="modal-competencia"` (línea 4509); conteo aproximado por etiquetas).
- Árbol: `git status --short | wc -l` → 0 antes y después; `git log --oneline -1` → `3482415`.

## 8. Premisas y observaciones que el árbol desmiente o matiza

1. **«Cuánto tarda la entidad» ya está en la tarjeta** — no: vive en el hash y en el modal; la fila no lo lleva (§ 7.a). Es el dato más barato de subir (183 B, el lector ya existe).
2. **«Solo. Esta le alcanza sin socio» para Purificación** — la frase es cierta solo si el pliego trae anticipo del 30 % o más; sin anticipo el veredicto real es PRODIAC 80/20 (§ 7.b′). No es un defecto de las puertas (pasan por «sin dato deja pasar», § ««Sin dato» volvió a ser «cero» en la puerta de la caja…»); es que la frase afirma sobre lo no verificado (A5 § 6.1 ya lo observó; aquí se reproduce el giro completo).
3. **El esqueleto `brillo` de la lista no vale para el modal** — está anclado a `#app .animate-pulse` y el modal está fuera de `#app` (§ 7.g); `.exp-esqueleto` sí es global y ya tiene su regla de reduced-motion (`index.html:1380`), aunque solo apaga la animación y no aplana el gradiente como `:850`: se añade el tono plano.
4. **La cifra «1 de 5» sin histórico** (A1 H2) se produce con `fuente` supuesta y la rama «—» es inalcanzable: para el experimentado es un supuesto disfrazado; el cambio es de lectura de `fuente`, no del estimador.
5. **`alcanzable_con_socio` y `socio.recomendacion.socio` discrepan** (A3 § b, reproducido allí con $8.500 M): si la tarjeta empieza a nombrar al socio, ese campo se retira o se iguala.
6. **`lib/indice_competencia.js:1167-1168`** declara que `op=listar` «nunca» expone adjudicatarios: publicar el líder con token válido respeta a quién protege esa regla (sin credencial nada) pero la desmiente en su letra; se escribe como decisión nueva en la memoria, con la marca `> SUPERADA` si el comentario se cita allí.

## 9. No verificable desde aquí (con motivo)

- El contenido real de `indice:competencia`, `indice:baja` e histórico de producción (líder de Purificación, plazo de adjudicación, desiertos, base de la baja): sin credenciales de Upstash; las cifras marcadas EJEMPLO en § 5 lo son.
- Que la hora de `fecha_de_recepcion_de` sea la hora local de Colombia en todas las filas (EXP-14): datos.gov.co responde 403 desde este entorno (A4 § 0); se confirma con el cronograma del pliego mientras no se mida.
- Si el registro publicado del índice de baja conserva la cubeta 0 por entidad (EXP-57): no se leyó `registroPublicado` de `lib/indice_baja`.
- La latencia real del perfil en producción (30-80 ms/comando es supuesto de A2): el dueño la mide con `duracionMs`/`comandosRedis` pegando la URL en Chrome (A2 § 3.3).
- El peso real de la fila en producción (descripciones de hasta 700 caracteres): los 457 B nuevos se suman a una fila que aquí midió 7.770 B y allá pesará más (A1 § 8).
- El comportamiento visual (390 px, reduced-motion, consola) de cualquier cambio: no se abrió navegador; los tokens y reglas se citan LEÍDOS con ancla.
- La cobertura de `numero_de_lotes`, `fecha_de_ultima_publicaci`, `visualizaciones_del` y `departamento_proveedor` en producción: se mide con `lib/columnas_historicas` tras la full (A4 § 8).
- Datasets externos (EXP-43, 53, 55, 56): proxy 403/EGRESS_BLOCKED hoy; la sonda M-DGF-17 no existe.

## Anexo · ficheros de esta verificación
- `scratchpad/plan/d_exp_repro.js` · `d_exp_repro.salida.txt` (reproducciones a, b, c, d, e).
- Los `node -e` de § 7 (b′) y (f) se transcribieron íntegros en este informe.
