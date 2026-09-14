# A2 · Perfil del competidor («dónde más gana, cuántas veces, por cuánto»)

> Para: sesión · Estado: informe fechado · Sustituido por: —

> Para: diseñador del plan · Estado: informe de verificación (13-sep-2026) · Árbol: `3482415` (main), `git status` vacío antes y después.
> Método: coordenadas del encargo + `node tests/mapa.js`, lectura por rangos, historia con `git log -S`/`-L`/`show`, y una reproducción ejecutada con las funciones reales sobre un Redis en memoria (`a2_repro.js`, en este mismo directorio; salidas en `salida_*.txt`). Nada del repositorio se modificó.

## 0. Veredicto sobre la premisa del dueño

**La premisa («ya no se puede saber cuánto han adjudicado en total… y en qué otras entidades ha ganado y cuánto») es FALSA como «se quitó» y VERDADERA como «se escondió».** La función existe entera en servidor y pantalla, no se degradó (el valor total y la lista de entidades salen también para los ganadores identificados solo por nombre), pero desde el **6-sep-2026 (commit `df82f0d`)** la única puerta de entrada —la tabla «Quién gana aquí»— quedó plegada bajo un `<details>` cuyo rótulo dice «Ver los 5 adjudicatarios que más ganan», y la fila que abre el perfil no tiene ningún texto visible que diga que se puede pulsar: la única pista es un `title` (tooltip), que en el teléfono no existe. Resultado: **tres pulsaciones desde la tarjeta**, la segunda sobre un rótulo que no menciona el perfil y la tercera sobre una fila que no parece un enlace. Además, solo son alcanzables los 5 ganadores del top de cada entidad: el resto («Otros») no tiene camino en la pantalla aunque el servidor sí los sirve.

## 1. Qué hay hoy en el árbol (con anclas)

### 1.1 Servidor
- Router: `api/inteligencia.js:17-24` — `op=competidor` es alias de la vista `adjudicatario` (`VISTA_POR_OP`); `api/inteligencia.js:41` delega en `lib/handlers/inteligencia/detalle.js`.
- Handler: `lib/handlers/inteligencia/detalle.js:97` admite la vista `adjudicatario`; `:107` exige token (`autorizarToken`; sin token 401, `tests/e2e.js:12963` lo fija); `:174-176` llama a `detalleAdjudicatario(redis, q.adjudicatario, {usarCache, log})`; `:177-179` añade `duracionMs` y `comandosRedis` a toda respuesta 200 — **el dueño puede medir la latencia real en producción sin terminal pegando en Chrome** `https://<dominio>/api/inteligencia?op=competidor&adjudicatario=nit:<NIT>&token=<token>` (y `&refrescar=1` para forzar el barrido en frío).
- Cálculo: `lib/competencia_detalle.js:547-696` (`detalleAdjudicatario`). Detalle en § 2.
- Suite: `tests/e2e.js:3166-3243` ejecuta `detalleAdjudicatario` real con `redisFalso` (`:2842`); `:12966` exige que `public/app.js` contenga `data-adjudicatario`, `cargarAdjudicatario`, `op=competidor&adjudicatario=` y «Dónde gana este competidor»; `:13033` exige literalmente la tabla plegada (`<details><summary>Ver los 5 adjudicatarios que más ganan</summary>…<table`); `:20961-20963` prueba el alias `op=competidor`.

### 1.2 Pantalla (`public/app.js`)
- Tarjeta → `bandaCompetencia` (`:1606-1621`): botón con texto «<Poca/Media/Mucha competencia> · <promedio> en <n> ›» (o «Sin datos históricos»), `title` «Ver los procesos que sostienen este promedio».
- Delegación de la lista (`:3421-3458`): el clic en `.banda-competencia` abre el modal «Competencia histórica» y llama `cargarDetalle(entidad)` (`:3284-3305`, fetch `op=entidad`).
- `pintarDetalle` (`:3078-3118`): orden de bloques: banda → resumen → por año → prórroga → plazo → desiertos → encogimiento → mensaje → **`bloqueAdjudicatarios`** (`:3109`) → proponentes → ejecución → tablas de procesos.
- `bloqueAdjudicatarios` (`:2918-2975`): título «Quién gana aquí (N procesos con ganador identificado)»; la frase de concentración; la barra apilada `Pulso.apilada` **solo si el servidor mandó `concentracion`** (`:2957`, que el servidor anula bajo `MIN_PROCESOS = 5` con ganador: `lib/competencia_detalle.js:440-447`); y la regla clave en `:2972`: **`${reparto ? plegada : tabla}`** — con barra, la tabla va dentro de `<details>` con rótulo «Ver los N adjudicatarios que más ganan» (`:2967`); sin barra (menos de 5 con ganador) queda a la vista.
- Fila de la tabla (`:2929-2941`): `<tr … cursor-pointer … data-adjudicatario="<clave>" data-nombre="<nombre>" title="Ver en qué otras entidades gana">` — la afordancia es SOLO `cursor-pointer` + `hover:bg-gray-50` + `title`. Ningún texto, ningún «›», ningún botón.
- Delegación del modal (`:3413-3417`): clic en `[data-adjudicatario]` → `cargarAdjudicatario(clave, nombre)` (`:3382-3409`): abre el modal con título «Dónde gana este competidor», subtítulo «Buscando sus adjudicaciones…», fetch `/api/inteligencia?op=competidor&adjudicatario=…` con `x-historico-token`.
- `pintarAdjudicatario` (`:3344-3380`): cabecera con nombre, identificación (`NIT …` / `Cód. SECOP …` / `Doc. …`; **nada** si va por nombre), «N contratos en M entidades · <valor total o «valor sin dato»> · último: <fecha o «sin fecha»>», la línea de baja media (`htmlBajaAdjudicatario`, `:3328-3342`), la **tabla Entidad · Ganados · Valor adjudicado · Último contrato** y el párrafo `que_es` en gris al pie.

### 1.3 Ruta de clics medida (lectura del código, sin navegador)
| # | Dónde | Qué se pulsa (texto visible) | Qué pasa |
|---|---|---|---|
| 1 | Tarjeta | Botón «Poca competencia · 3 en 12 ›» (`app.js:1612-1619`) | Modal «Competencia histórica»; fetch `op=entidad` (barrido completo + 2 fuentes vivas, § 3.4) |
| 2 | Modal | Rótulo «Ver los 5 adjudicatarios que más ganan» (`app.js:2967`) — **solo cuando hay barra**, es decir, en toda entidad con ≥ 5 procesos con ganador (`competencia_detalle.js:440`) | Se despliega la tabla |
| 3 | Modal | Una fila de la tabla (sin texto que diga que se puede pulsar; `title` «Ver en qué otras entidades gana», `app.js:2930`) | Modal «Dónde gana este competidor»; fetch `op=competidor` |

Con menos de 5 procesos con ganador la tabla está a la vista y son **2** clics (pero la fila sigue sin afordancia visible). Ningún otro punto de la aplicación abre el perfil: ni «Quiénes se presentan aquí» (`app.js:2869-2876`, filas sin `data-*`), ni «Verifique a su socio» (`app.js:10651-10735`, que consulta Socrata en vivo por NIT y agrupa por AÑO, no por entidad: `lib/socio.js:333-360`), ni la búsqueda. Y solo llegan al perfil los `top.slice(0, 5)` (`competencia_detalle.js:449`): el segmento «Otros» de la barra no es pulsable.

## 2. (a) Qué calcula `detalleAdjudicatario`, sobre qué datos, con qué identidad y qué devuelve

**Fuente de datos:** exclusivamente el **corpus histórico en Redis** (`licitaciones:historico:mes:*:chunk:*`): `competencia_detalle.js:567-571` hace `redis.scan(CLAVES.patronChunksHist)` + `leerChunksDedup` (`lib/almacen.js:317-392`: `MGET` por lotes de 8 claves, inflado zlib, deduplicación por `_k`). **No consulta Socrata** (a diferencia de `detalleEntidad`, que además llama a `proponentesDeProcesos` y `ejecucionDeEntidad` en vivo, `:482-485`). El corpus entra desde `2024-01` (`lib/handlers/procesos/sync.js:105`, decisión del dueño del 15-ago-2026) y solo con los procesos que la app ingiere (obra y afines, modalidades competitivas: lo declara `que_es`, `:682-688`).

**Identidad:** `claveAdjudicatario(lic)` de `lib/equivalencias.js:72-88` — la misma función que usa el agregado «quién gana aquí» y las equivalencias: primero un campo de `CAMPOS_ADJUDICATARIO_NIT` (`nit_del_proveedor_adjudicado`, `adjudicatario_nit`, `documento_proveedor`, `codigoproveedor`; `indice_competencia.js:112-114`) con ≥ 5 dígitos → clave `nit:<dígitos>`; si no, el primer nombre de `CAMPOS_ADJUDICATARIO` (`:109-111`) normalizado y no relleno → clave `n:<nombre normalizado>`. «No Definido» no es NIT ni nombre (`:161-173`). El tipo del identificador se rotula al publicar (`competencia_detalle.js:611-615`): `nit` solo si salió de un campo de NIT real; `codigo_secop` para `codigoproveedor`; `documento` para `documento_proveedor`. **Consecuencia declarada** (`:544-546`): un mismo proveedor identificado a veces por NIT y a veces solo por nombre son DOS perfiles.

**Predicado de «ganó»:** `esAdjudicado(lic)` (`:581`) y no `desenlaceDe`; MEMORIA.md § «Remates «R4-remates-inteligencia» de la ola 2 · B9a-H1/H2/H3, B9b-H1/H2/H3/H4/H5 (6-sep-2026)» lo declara a propósito («sacarlo del perfil INFRAVALORARÍA lo que esa empresa ganó»). No es un defecto.

**Acumulación por fila que casa (`:585-606`):** `ganados++`; baja por fila con `bajaDeFila` del índice de baja (descartes contados con las mismas claves); nombre más frecuente; por entidad (`lic.entidad` crudo, sin normalizar: dos grafías de la misma entidad salen como dos filas) ganados/valor/última; valor = primer campo de `CAMPOS_VALOR_ADJUDICADO` con número > 0 (**un 0 es «sin dato», no se suma**, `:599-600`); última = mayor `fecha_adjudicacion`.

**Forma JSON real (ejecutada con el módulo real sobre el corpus sintético, `salida_30k_731_lat0.txt`):**
```json
{ "ok": true, "encontrado": true, "clave": "nit:900000000", "nombre": "CONSTRUCTORA 00000 SAS",
  "identificacion": { "tipo": "nit", "valor": "900000000" },
  "total_ganados": 155, "valor_adjudicado_cop": 211899299426, "procesos_con_valor": 147,
  "ultima_adjudicacion": "2025-12-25",
  "baja_media": { "mediana_pct": 6, "promedio_pct": 5.9, "p25_pct": 2, "p75_pct": 9, "nivel": "alto", "n": 147,
                  "min_procesos": 5, "origen": "medida", "motivo": null,
                  "encogida": { "mediana_pct": 6, "peso_datos": 0, "referencia": "global", "referencia_mediana": 6 },
                  "descartados": { "sin_adjudicado": 8 } },
  "entidades": [ { "entidad": "ALCALDIA MUNICIPAL DE VENADILLO 0054", "ganados": 3, "valor_adjudicado_cop": 5967428359,
                   "procesos_con_valor": 3, "ultima_adjudicacion": "2025-08-13" }, "… (143 entidades)" ],
  "que_es": "Adjudicaciones de este proveedor en el corpus de la aplicación: procesos competitivos de obra y …",
  "chunks_ilegibles": 0, "cache": false, "generado": "2026-09-13T05:58:58.295Z" }
```
El handler añade `duracionMs` y `comandosRedis` (`detalle.js:178`). Otros casos ejecutados:
- Ganador **solo por nombre** (`n:constructora 00219 sas`): `total_ganados 4 · identificacion null · valor 6560151052 · baja_media.mediana null · motivo «SECOP no publica el NIT del ganador en 4 de los procesos que ganó, y esta medida solo cuenta los que sí lo traen»`. **El valor total y las entidades SÍ salen**: la premisa «valor sin dato para los identificados por nombre» no se cumple; lo único que se anula por identidad es la baja media (regla del índice de baja, declarada).
- Clave inexistente: `encontrado false · total_ganados 0 · valor null` con 7 comandos (barrido completo igual; también se cachea).
- Estado 400 si la clave no empieza por `nit:`/`n:` (`:549`).

## 3. (b) Latencia: por qué tarda

### 3.1 Comandos y bytes por clic (medido con el mock instrumentado; comandos = un POST REST cada uno, `lib/redis.js:50-57`, sin pipeline)
Corpus sintético de 30 000 filas (33,5 MB JSON crudo; 1 200 entidades; 10 636 claves de adjudicatario distintas), dos disposiciones del MISMO corpus:

| Disposición | Chunks | Base64 en Redis | Clic en FRÍO | Clic con CACHÉ |
|---|---|---|---|---|
| A · compactada (`empaquetar` real, ≤ 500 KB comprimidos por chunk, `almacen.js:271,286-301`) | 24 | 2,00 MB | **8 comandos** (3 GET, 1 SCAN, 3 MGET, 1 SET) · **lee 2,00 MB** · 386 ms CPU | 2 GET · 4,4 KB · 0 ms |
| B · fragmentada (731 chunks pequeños, la forma que deja el delta append-only; el comentario de `competencia_detalle.js:297` habla de «731 chunks») | 720 | 2,68 MB | **95 comandos** (3 GET, 1 SCAN, **90 MGET**, 1 SET) · **lee 2,68 MB** · 349 ms CPU | 2 GET · 4,4 KB · 0 ms |

Con 50000 filas (`salida_50k_731_lat0.txt`): A = 8 comandos, 3,31 MB, 702 ms; B = 98 comandos, 4,06 MB, 696 ms. **Escala lineal con el corpus**: a 100000 filas (orden de magnitud plausible en producción: MEMORIA.md § «Investigación de contraste (ago 2026)» mide «79 k procesos desde 2024 con adjudicado=No» que entraban por error; no medido aquí) serían ≈ 1,4 s de CPU y ≈ 6-8 MB leídos por clic en frío.

**Respuesta a «¿recorre TODOS los chunks por cada clic?»: sí.** `competencia_detalle.js:567-571`: SCAN de todo el patrón y `leerChunksDedup` de todas las claves, en cada clic que no pegue en caché. La caché es por clave de competidor (`indice:detalle:v7:adj:<clave>`, `:134,:558`), TTL 3600 s (`:60`), invalidada por el sello del índice (`:140`): **cada competidor distinto = un barrido completo por hora**; y el «no existe» también barre. El SCAN además recorre TODO el keyspace (`redis.js:120-128`, `COUNT 1000`), no solo el histórico.

### 3.2 Lo que suma el despliegue real (SUPUESTO declarado: 30-80 ms por comando REST de Upstash desde Vercel; no medido aquí — sin credenciales ni red)
Medido con latencia simulada de 40 ms/comando (`salida_30k_731_lat40.txt`):
- A · compactada: frío **760 ms**; caché 80 ms.
- B · fragmentada: frío **4 160 ms**; caché 82 ms.
Extrapolación con el rango supuesto: B en frío entre ≈ 3,2 s (30 ms) y ≈ 8 s (80 ms) + transferencia de 2,7-8 MB + arranque en frío de la función. Con caché: 60-160 ms. **El coste dominante es el número de MGET (uno por cada 8 chunks), es decir, la fragmentación del corpus, no el tamaño del perfil.**

### 3.3 Verificación en producción sin terminal
Pegar en Chrome `…/api/inteligencia?op=competidor&adjudicatario=nit:<NIT>&token=<token>&refrescar=1` y leer `duracionMs` y `comandosRedis` en el JSON (`detalle.js:178`); repetir sin `refrescar` para la versión con caché. `comandosRedis − 5 ≈ número de MGET ≈ chunks/8`.

### 3.4 La antesala también tarda (y no es el perfil)
El perfil solo se abre desde el modal de la entidad, y `detalleEntidad` hace el mismo barrido (7 comandos en A) **más dos consultas a Socrata en paralelo con tope de 6 000 ms cada una** (`lib/proponentes.js:45`, `lib/ejecucion.js:37`, `competencia_detalle.js:482-485`). Aquí midió 4,4-5,5 s por entidad porque el proxy corta datos.gov.co (NO VERIFICABLE como tiempo de producción; sí verificable que el tope es 6 s y que una fuente caída no se cachea, `:523-526`, así que se repite en cada apertura).

## 4. (c) Cómo hacerlo casi instantáneo sin mentir

### 4.1 Premisa del encargo corregida
El índice de competencia **no se construye en el sync nocturno**. El cron `30 8 * * *` → `/api/sync` (`vercel.json:3,16`) corre el delta y reconstruye solo el índice de baja al terminar una full (`sync.js:875`). `construirIndice` (`indice_competencia.js:908`) se invoca en la **cadena del histórico** (`lib/handlers/procesos/historico.js:469-478`: índice → baja → equivalencias, reanudable, presupuesto de 40 s por invocación), que se dispara (a) a mano con `?reconstruir_indice=true` y (b) automáticamente cuando la última extracción histórica completa tiene más de 30 días (`sync.js:104-106,830-836`: `REFRESCO_HISTORICO_MS`, kick fire-and-forget a `op=historico`). **Un índice inverso construido ahí tendrá la frescura del índice de competencia: hasta un mes, o la última reconstrucción manual**, mientras el barrido de hoy lee el corpus vivo (el delta lo alimenta a diario). Eso hay que declararlo en pantalla (§ 5).

### 4.2 Propuesta concreta
1. **Acumular en el MISMO barrido** de `construirIndice`: junto a `acumular(p.acc, p.stats, r)` (`:944`), un `acumularAdjudicatario(p.adj, r)` que aplique, en este orden y sin reescribir nada, `esAdjudicado(r)` → `claveAdjudicatario(r)` → `bajaDeFila(r)` → campos de valor/fecha/entidad: exactamente las líneas `competencia_detalle.js:580-607` extraídas a una función que el barrido de hoy y el constructor COMPARTAN (regla «no reescribir una regla que ya existe: llamarla»). El prototipo en `a2_repro.js` (función `publicar`) ya hace esto y **cuadra al 100 % con `detalleAdjudicatario` real** (`total 155 = 155 · valor = · entidades 143 = 143 · baja.n 147 = 147`, y con 50k: `253/253, 224/224, 238/238`): esa comparación es la cerradura a escribir en la suite, más su mutación.
2. **Progreso reanudable**: el acumulador de adjudicatarios pesa **5,5 MB JSON / 0,65 MB comprimido** (30k filas) y **7,8 MB / 0,97 MB** (50k). Cabe de sobra en un valor de Upstash (la memoria del 4-sep cita 10 MB por petición y 100 MB por valor, no releídos desde aquí) y bajo los 4,5 MB de respuesta de Vercel (que no se atraviesan: es una escritura), pero **conviene una clave propia** (`indice:adjudicatario:progreso`) para no engordar `indice:competencia:progreso`, que se reescribe tras cada mes procesado (`:948`).
3. **Publicación**: hash `indice:adjudicatario` (campo = clave `nit:…`/`n:…`, valor = registro JSON) por lotes de `CAMPOS_POR_HSET = 200` (`:87`, `publicarEn` `:1019-1031`) con el mismo swap atómico `…:nuevo` → `RENAME` (`:1039-1049`). Tamaño medido: **10 636 adjudicatarios · 6,29 MB JSON · mediana 564 B, p90 887 B, máx 22 KB** (30k) y **13 099 · 9,30 MB · máx 35 KB** (50k) → **54-66 comandos HSET** al construir. Nota: el conteo dobla al de proveedores porque cada identidad (NIT / nombre) cuenta aparte, como está declarado. Si se prefiere chunks, todo el índice comprimido son **0,54-0,84 MB → 2 chunks** de ≤ 500 KB; pero un hash permite leer UN campo (1 `HGET`) y es lo que hace instantáneo el perfil; los chunks obligarían a leer e inflar todo.
4. **Servicio**: la op existente `/api/inteligencia?op=competidor` (no se crea archivo: la suite fija 6 en `api/`, `tests/e2e.js:33412`). `detalleAdjudicatario` pasa a: `GET meta` (sello) → `HGET indice:adjudicatario <clave>` → si hay registro con el sello vigente, responder **en 2-3 comandos (≈ 60-250 ms con el supuesto REST)** con `origen: "indice"` y `construido: <fecha de la meta>`; si no hay hash o la clave no está, **cae al barrido de hoy** (lo que hay, no un «no existe» inventado) con `origen: "barrido"`. El registro publicado guarda `baja: {n, suma, hist}` y `descartados` crudos y aplica `subRegistro` + `encogerBaja` al servir (como hoy `:626-629`), para no publicar una mediana ya calculada que un cambio de umbral dejaría vieja.
5. **Caché actual**: `indice:detalle:v7:adj:<clave>` (TTL 1 h, sello del índice). Con el hash deja de hacer falta para el camino rápido; se conserva solo para el camino de barrido. Subir el sufijo (`v8`) al desplegar, como manda el comentario de `:128-133`.
6. **Coste de construcción**: +312 ms (30k) / +658 ms (50k) de CPU sobre todo el barrido, frente a un presupuesto de 40 s por invocación (`:908`): despreciable.

### 4.3 Alternativa mínima (medida) y por qué no la recomiendo
Solo los adjudicatarios que aparecen en algún top-5 de entidad: **4 418 (3,15 MB)** con 30k y **4 395 (4,09 MB)** con 50k. Ahorra la mitad, pero deja sin perfil precisamente a la cola («Otros»), impide cualquier entrada futura por búsqueda o desde «Quiénes se presentan aquí», y el índice completo ya cabe con holgura. No vale la pena.

### 4.4 Alternativa complementaria: Socrata en vivo por NIT
`lib/socio.js:333-360` ya agrupa en el servidor de datos.gov.co las adjudicaciones de un NIT por año (`$group=anio`, `count(distinct entidad)`, `sum(valor_total_adjudicacion)`): UNA petición HTTP, cubre TODO SECOP II (todas las modalidades y rubros, no solo el corpus). Un `$group=entidad` daría «en qué entidades». Límites: solo ganadores con NIT (no los `n:` ni los `codigoproveedor`), latencia de una fuente externa (NO VERIFICABLE aquí: proxy 403), best-effort. Sirve como segunda cifra declarada («en todo SECOP II: …»), no como sustituto del índice.

## 5. (d) La verdad del dato y cómo se declara sin inventar

| Límite | Dónde vive | Cómo se dice hoy en pantalla | Qué falta |
|---|---|---|---|
| Identidad por nombre sin NIT («No Definido») | `equivalencias.js:81-85`; `indice_competencia.js:161-173` | Perfil: `identificacion null` → **no se pinta ninguna línea** (`app.js:3349-3353`); tabla de la entidad: nada bajo el nombre (`:2931-2937`); en «Quiénes se presentan» sí dice «sin NIT» (`:2873`) | Una línea «SECOP no publica el NIT de esta empresa: se identifica por el nombre tal como lo escribe la entidad» en la cabecera del perfil; hoy el motivo solo aparece en la baja media |
| Dos identidades del mismo proveedor (NIT y nombre) cuentan aparte | `competencia_detalle.js:544-546`, `que_es` `:684-685` | Solo en el párrafo gris `que_es` al pie | Subirlo a la cabecera cuando el perfil sea `n:` |
| Corpus desde 2024-01, solo obra y afines, modalidades competitivas → **cota inferior** | `sync.js:105`; `que_es` `:682-684` | «(desde 2024)» solo en el «no hay adjudicaciones» (`:3346`); el resto, en `que_es` al pie | Una línea fija arriba: «Solo lo que la aplicación sigue: obra y afines, procesos competitivos, desde enero de 2024. Fuera de eso, no aparece aquí» |
| Valor adjudicado ausente o 0 → `null`, y el total suma solo las filas con valor | `:597-601`, `:668-669` | «valor sin dato» / «sin dato» por fila | La cabecera enseña el total pero **no cuántos contratos lo sostienen** (`procesos_con_valor` viaja y no se pinta, `:3366-3368`): decir «$211.899 M en 147 de 155 contratos con valor publicado» |
| Entidad tal como la escribe el dataset (sin normalizar) | `:593` | Dos grafías = dos filas | Aceptable si se dice; o agrupar con `claveCanonica` de la entidad y publicar el nombre más frecuente (como hace `detalleEntidad`, `:283-285`) |
| `esAdjudicado` y no `desenlaceDe` (un desierto que además nombra ganador cuenta) | `:581`; MEMORIA.md § «Remates «R4-remates-inteligencia»…» | No se dice | Decisión declarada; no tocar |
| Frescura (si se hace el índice) | `historico.js:469`; `sync.js:104-106` | — | «Con datos hasta <fecha de construcción del índice>»; el barrido de hoy es «al día de hoy» |
| Baja media sin base o sin NIT | `:649-653` | «Baja media con la que gana: sin dato (<motivo del servidor>)» | Ya bien (remate B9b-H2) |

Nada de lo anterior exige inventar una norma ni un porcentaje: son textos con los conteos que la respuesta ya trae.

## 6. (e) Dónde debe ser alcanzable con UN clic desde la tarjeta

Hoy la tarjeta tiene tres botones que abren modales (`app.js:3429-3457`: «Lo que deja», probabilidad, banda de competencia). Dos formas de llegar en un clic, y lo que cada una toca:

- **E1 (recomendada, requiere una decisión declarada)**: que el hash `indice:competencia` publique por entidad `lider: {nombre, clave, ganados, base}` (calculado en el mismo barrido con `claveAdjudicatario`, solo con `base ≥ MIN_PROCESOS`, como la concentración de hoy) y que la tarjeta lo VEA como hecho —«Quien más gana aquí: CONSTRUCTORA X · 6 de 15 ›»— con ese texto como botón que abre directamente «Dónde gana este competidor» (`cargarAdjudicatario(clave, nombre)`). Es la señal n.º 11 del manual hecha dato en la tarjeta, cumple «lo que se VE arriba, lo que se TOCA plegado» (el perfil queda detrás del clic) y respeta «ninguna pulsación sin respuesta». **Lo que toca**: `indice_competencia.js:1167-1168` declara que `/api/oportunidades` no expone «nunca adjudicatarios, NIT ni valores» y `listar.js:384` ya distingue con `autorizarToken` lo que sale con credencial; publicar el líder solo con token válido (y 401 con token inválido, como manda la regla dura) mantiene el espíritu de esa decisión, pero **hay que escribirlo en la memoria como decisión nueva**, no colarlo.
- **E2 (sin tocar la lista blanca)**: un botón en la tarjeta «Ver quién más gana aquí ›» que llame a `op=entidad` (ya con token y caché de 1 h) y, con `adjudicatarios.top[0].clave`, abra el perfil. Un clic, dos fetch, pero el nombre no se VE hasta abrir el modal; y hereda la antesala de § 3.4 (las dos fuentes vivas), salvo que `op=entidad` gane un `?ligero=1` que omita proponentes/ejecución.
- **En el modal, en cualquier caso**: hacer pulsables los segmentos de la barra (`Pulso.apilada`) y dar a las filas un «›» o un botón «Ver dónde más gana» (`app.js:2930` hoy solo `title`); no revertir el pliegue (decisión del 6-sep, MEMORIA.md § «Lote «B9a-entidad-graficos»…»), pero renombrar el rótulo: «Ver los 5 que más ganan y dónde más ganan». Y que el botón de la tarjeta no aparezca sin base: sin `lider` no hay botón, en vez de un «sin dato» que no lleva a nada.

## 7. Cronología (git) de lo que cambió y cuándo

| Fecha | Commit | Qué | Evidencia |
|---|---|---|---|
| 26-ago-2026 (raíz más antigua de este clon) | `00cbfd2` | El perfil YA existe: `cargarAdjudicatario`, `data-adjudicatario`, «Dónde gana este competidor» (5 coincidencias en `public/app.js` de ese commit) y la tabla se pintaba **a la vista** (0 coincidencias de `reparto ? plegada : tabla`) | `git show 00cbfd2:public/app.js \| grep -c …` = 5; `git log -L` de las tres funciones → `00cbfd2` |
| 6-sep-2026 | `df82f0d` | **Se pliega la tabla** bajo `<details>` «Ver los N adjudicatarios que más ganan» cuando hay barra (`+${reparto ? plegada : tabla}`); lote B9a | `git log -S"reparto ? plegada : tabla"` → solo `df82f0d`; diff `@@ -2631,21 +2677,85 @@` |
| 6-sep-2026 | `db6f79b` | El perfil GANA la baja media (`baja_media`, caché v7); nada se quita | `--stat`: `lib/competencia_detalle.js +61` |
| 6-sep-2026 | `f4dfb9d` | El motivo real para el identificado solo por nombre («SECOP no publica el NIT…») en vez de «hay 0»; nada se quita | `--stat`: `+15`; suite `:3217-3242` |
| 6-sep-2026 | `d829d87` | Importación masiva (252 ficheros): por eso `git log -S` sobre las cadenas del perfil solo devuelve este commit — la historia anterior está aplanada | `--stat`: «252 files changed, 496038 insertions» |

**No hay ningún commit que quite `valor_adjudicado_cop`, `entidades` o el clic.** Lo que cambió el 6-sep fue la VISIBILIDAD, y la suite lo fija así (`tests/e2e.js:13033`).

## 8. No verificable desde aquí
- Tiempo real de un clic en producción (sin credenciales de Upstash ni red a Vercel): el rango 30-80 ms/comando es SUPUESTO; el dueño lo mide con `duracionMs`/`comandosRedis` (§ 3.3).
- Número real de chunks y filas del histórico en producción: «731 chunks» es un comentario del código (`competencia_detalle.js:297`), no una medida de hoy.
- Latencia de datos.gov.co (proponentes, ejecución, adjudicaciones por NIT): el proxy de esta sesión la corta.
- Cuántos ganadores del corpus real van solo por nombre: el reparto 60/40 del corpus sintético es un supuesto (la memoria lo declara «frecuente», sin cifra).

## 9. Ficheros de esta verificación
- `/tmp/claude-0/-home-user-portafolio-estrategico/e578af61-c5c4-5a08-a52d-f25a7fed63a4/scratchpad/plan/a2_repro.js` — reproducción (uso: `node a2_repro.js <filas> <chunks> <latencia_ms>`).
- `salida_30k_731_lat0.txt`, `salida_30k_731_lat40.txt`, `salida_50k_731_lat0.txt` — salidas íntegras.
