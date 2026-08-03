# Detecta · Oportunidades de licitación SECOP II

Aplicación privada para decidir **a qué licitaciones de obra civil presentarse** en Colombia.
Extrae en vivo el dataset abierto de SECOP II (`p6dx-8zbt`, Colombia Compra Eficiente), enriquece
cada proceso con reglas de negocio, lo filtra contra los **RUP y la capacidad financiera reales**
de los dos perfiles (Helder y Génesis GIC SAS) y muestra las oportunidades viables **ordenadas por
dónde es más probable ganar**: primero las entidades a las que históricamente se presenta menos
gente (índice de competencia sobre 2 años de adjudicaciones).

El encaje con el RUP se decide con un **matching UNSPSC jerárquico** (clase ⊃ producto, familia ⊃
clase, más equivalencias aprendidas del histórico y el objeto como co-señal) y una **capa de
pertinencia** que saca los servicios administrativos que se colaban por tener un código inscrito.
El veredicto que ve el dueño es siempre **graduado**, nunca un sí/no.

> El puntaje prioriza dónde mirar primero; el orden por atractividad prioriza dónde se compite con
> menos gente. Ninguno de los dos es una probabilidad calculada ni reemplaza leer el pliego.

## Arquitectura

```
┌────────────┐   full/delta    ┌─────────────────┐  chunks zlib   ┌───────────────┐
│  Socrata   │ ───────────────▶│   /api/sync     │ ──────────────▶│ Upstash Redis │
│ p6dx-8zbt  │  keyset por :id │ (enriquece +    │ activo ≤500KB  │  (REST)       │
│            │                 │  INGESTA ANCHA) │                │               │
│            │   backfill      ├─────────────────┤  histórico     │  activo:  se  │
│            │   2 años (1 vez)│ /api/sync/      │ ──────────────▶│   purga       │
│            │ ───────────────▶│   historico     │  + adjudicación│  histórico:no │
└────────────┘                 └───────┬─────────┘                └──────┬────────┘
                                       │ destila 3 derivados            │ SCAN+MGET
                                       ▼                                │
                     ┌────────────────────────────────┐                 │
                     │ indice:competencia (oferentes) │◀──────┐         │
                     │ equivalencias:unspsc (afinidad)│       │         ▼
                     │ vocabulario:unspsc  (por familia)│     │  ┌────────────────────┐
                     └────────────────────────────────┘     └──│ /api/oportunidades │
                     ┌──────────────┐                           │ JUICIO FINO por    │
                     │ public/ (SPA │ ◀─────────────────────────│ perfil + orden     │
                     │ Tailwind CDN)│  JSON paginado            │ por atractividad   │
                     └──────────────┘                           └────────────────────┘
```

**Ingesta ancha, juicio fino** (jul 2026). El prefiltro de `/api/sync` ya **no** evalúa los RUP:
guarda todo lo que *pueda* llegar a interesar (modalidad competitiva, no convenio, sin blacklist,
con un UNSPSC de servicios/obra o de una familia inscrita, o con objeto de obra). Todo el juicio
—matching UNSPSC por perfil, equivalencias, pertinencia del objeto, anti-suministro, capacidad K—
corre **al servir la consulta**. Antes el matching vivía en la ingesta, así que cada mejora de la
regla o cada RUP nuevo exigía volver a bajar el año entero, y lo que la regla vieja descartó nunca
había entrado a Redis. Ahora **afinar el matching o cargar un RUP nuevo tiene efecto inmediato**.

- **Vercel serverless** (Node 18+, CommonJS, funciones planas en `/api`). Sin framework, sin
  `package.json`, sin build: `public/` se sirve estático en la raíz y `/api/*.js` son funciones.
- **Upstash Redis** vía API REST con `fetch` nativo (`lib/redis.js`) — sin SDK.
- **Cero dependencias**: `fetch`, `zlib` (deflate nivel 6) y la API REST de Upstash.

| Archivo | Qué hace |
| --- | --- |
| `api/sync.js` | Sincronización full/delta/auto, reanudable, con candado TTL y auto-reinvocación |
| `api/sync/historico.js` | **Backfill histórico** (protegido por token): 2 años a `licitaciones:historico:*` + construcción de los tres derivados (índice, equivalencias, vocabulario) |
| `api/oportunidades.js` | Consulta: **todo el juicio fino** por perfil, competencia por entidad, orden, paginación, memoria caliente |
| `api/resumen.js` | **Dashboard**: los mismos visibles de la app, agregados (tipo, urgencia, entidades, departamentos, capacidad K) con caché de 5 min |
| `api/admin/rup.js` + `lib/config_rup.js` | **Carga del RUP por archivo JSON**: validación campo por campo y publicación atómica, con efecto inmediato |
| `lib/indice_competencia.js` | Índice **entidad → oferentes promedio** sobre el histórico; tertiles baja/media/alta |
| `api/competencia-detalle.js` + `lib/competencia_detalle.js` | **Los procesos que sostienen el badge**: incluidos, excluidos y por qué (con caché de 1 h) |
| `lib/auth.js` | Guardián único del `HISTORICO_TOKEN` para **todos** los endpoints protegidos, `/api/oportunidades` incluido |
| `lib/puertas.js` | **Las cuatro puertas** de viabilidad (RUP · K · Caja · Competencia): sustituyen al puntaje 0-100 como criterio de decisión |
| `lib/probabilidad.js` | **P(ganar)** y valor esperado, con la fuente de cada estimación y las señales ex-ante (prórroga del cierre, colisión de cierres) |
| `lib/equivalencias.js` | **Clases UNSPSC afines** aprendidas del histórico (lift sobre adjudicatarios) |
| `lib/texto_unspsc.js` | El **objeto como co-señal**: vocabulario distintivo por familia (TF-IDF) + derivación |
| `lib/proyeccion.js` | Proyección de columnas y cascada de filtros; dos variantes: activa (sin adjudicación) e histórica |
| `lib/perfiles.js` | Los tres perfiles: naturaleza, financieros, CT, SCE, ponderación 50/50 del consorcio. Respaldo del repositorio + aplicación del RUP cargado (`PERFILES` sigue siendo síncrono) |
| `lib/capacidad.js` | **Fórmula única** del K de contratación (CRP/CRPC, Guía CCE-EICP-GI-22) |
| `lib/filtros.js` | Las **reglas**: estados canónicos (desconocido = cerrado), modalidades, convenios, prefiltro de ingesta, cascada de juicio, **pertinencia**, anti-suministro y `filtrarProcesosVisibles` — la **única** implementación de la cascada que sirve la app y el panel |
| `lib/rup.js` | Orquestador: `rup_valido()`, `evaluarRup()` (veredicto graduado + capacidad) |
| `lib/unspsc.js` | Whitelists de los RUP (193 · 343 · 393 unión calculada) + **motor de matching jerárquico por niveles** |
| `lib/redis.js` | Cliente REST mínimo de Upstash (GET/SET NX EX/DEL/MGET/SCAN) |
| `lib/socrata.js` | SoQL, paginación keyset por `:id`, reintentos con backoff, calendario Colombia |
| `lib/negocio.js` | `enriquecer()`: anticipo, cuantía, competencia, ubicación (y el `puntaje_ponderado` de legado, que ya no se sirve) |
| `lib/semantica.js` | Los **vocabularios**: `norm`, blacklist de objetos ajenos, whitelist de obra (heredadas), verbos de obra y términos no pertinentes |
| `data/vocabulario_unspsc.json` | Semilla curada de términos distintivos por familia UNSPSC (respaldo del derivado) |
| `lib/almacen.js` | Esquema de claves Redis + compresión/particionado de chunks |
| `docs/PERFILES.md` | Resumen técnico de los tres perfiles (datos, estimaciones, limitaciones) |
| `public/` | Frontend estático (Tailwind CDN, estilo Apple, gate de clave) |
| `public/admin.html` + `admin.js` | Panel de administración: encadena la sincronización full, **dashboard de procesos** y **carga de RUP**, todo desde el navegador y sin terminal |
| `tests/e2e.js` | Ciclo completo con mocks de Socrata y Upstash (sin red externa) |

## Endpoints

### `GET /api/sync?modo=full|delta|auto`

| Parámetro | Descripción |
| --- | --- |
| `modo` | `full` = año vigente completo (reanudable) · `delta` = cambios por `:updated_at` con solape de 48 h · `auto` = lo que toque (default) |
| `presupuesto` | Milisegundos de trabajo por invocación (default 45 000, máx 240 000 — siempre menor que el TTL del candado) |
| `chain=0` | Desactiva la auto-reinvocación al agotar presupuesto |

- **Candado**: `lock:sync` con `SET NX EX 300`. El TTL garantiza que un candado jamás quede
  atascado (la vieja causa del «enCurso eterno»); se libera al terminar solo si el token coincide.
- **Reanudable**: el cursor (mes, último `:id`, chunk) persiste en `licitaciones:progreso` tras cada
  página; al agotar el presupuesto la función **se re-invoca sola** (fire-and-forget) hasta terminar.
- Cada licitación se **enriquece antes de guardarse** (nunca entra sin campos de negocio) y pasa la
  **cascada de filtros** (ver abajo): modalidad competitiva → estado abierto → objeto válido.
- Cambios de estado (Publicado → Adjudicado) entran por el delta y **reemplazan** el registro:
  la lectura deduplica por `_k` quedándose con el `:updated_at` más reciente. Por eso el **delta
  conserva los cerrados** (si los descartara, la versión abierta quedaría congelada en el listado);
  la full sí los excluye de origen y la consulta nunca los sirve por defecto.
- **El delta alimenta el histórico**: cada proceso que pasa a estado cerrado se copia a
  `licitaciones:historico:*` con sus datos de adjudicación (adjudicatario, NIT, valor, fecha, nº de
  oferentes). Es el único momento en que se ve la transición abierto → cerrado; lo anterior a la
  puesta en marcha lo cubre el backfill de `/api/sync/historico`.

### `GET /api/sync/historico` (protegido)

Backfill de una vez de los años que la app nunca guardó, y construcción del índice de competencia.
**No hay cron ni auto-disparo**: se lanza a mano. Exige el token de `HISTORICO_TOKEN`, por header
`x-historico-token` (preferido: no queda en los logs) **o** por `?token=` (para dispararlo desde el
navegador, sin terminal); si llegan los dos, manda el header. La comparación es de digests SHA-256
en tiempo constante. Sin la variable definida responde `503` — nunca hay un default que valga como
llave.

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `desde` / `hasta` | `2024-01` / `2025-12` | Rango de meses `YYYY-MM`, ambos inclusive |
| `presupuesto` | 45 000 | Milisegundos por invocación (máx 240 000, menor que el TTL del candado) |
| `chain=0` | — | Desactiva la auto-reinvocación |
| `reiniciar=1` | — | Ignora el progreso guardado y vuelve a extraer el rango |
| `reconstruir_indice=true` | — | **Solo** el índice de competencia, desde el histórico ya guardado (no baja nada) |
| `reconstruir_equivalencias=true` | — | **Solo** las equivalencias UNSPSC (lift sobre adjudicatarios) |
| `reconstruir_vocabulario=true` | — | **Solo** el vocabulario distintivo por familia (TF-IDF) |
| `reconstruir_todo=true` | — | Los tres derivados de una vez — lo que hay que llamar tras cambiar reglas |
| `estado=true` | — | **Solo lee**: candado (y TTL restante), avance, corpus histórico y los tres derivados |
| `reset=true` | — | Destraba: borra candado, progreso y metas. **No** toca los chunks ya bajados ni lo ya publicado |

- Mismo prefiltro de ingesta que el sync normal (modalidad competitiva → `admisibleParaIngesta`)
  **antes** de guardar; la única diferencia es que aquí no se descartan los cerrados: son
  justamente el objeto de estudio.
- Candado propio `lock:sync:historico` (TTL 600 s): jamás estorba ni es estorbado por `/api/sync`.
- Reanudable como la full (cursor keyset en `sync:historico:progreso`) y auto-encadenada.
- Por mes se escribe **append-and-flip**: los chunks nuevos van a índices libres y el manifest solo
  apunta al rango nuevo al cerrar el mes. Re-ejecutarlo **reemplaza** el mes en lugar de duplicarlo,
  y una invocación muerta a mitad nunca deja el mes vacío.
- Al terminar la extracción construye los **tres derivados** automáticamente y en orden (índice →
  equivalencias → vocabulario), compartiendo el presupuesto de la invocación. Los tres son
  reanudables, así que un corte lo continúa la siguiente llamada de la cadena.
- Los tres son **opcionales**: sin backfill histórico la app funciona igual, con todo en ⚪ «sin
  datos históricos», sin equivalencias y con la semilla de vocabulario del repositorio.

### `GET /api/oportunidades` (protegido)

**Exige `HISTORICO_TOKEN`** (header `x-historico-token` o `?token=`), como el resto de endpoints con
datos sensibles. Cada resultado lleva `k_cop`, `crpc_cop`, `tope_cop` y el patrimonio de las
puertas: cifras derivadas del patrimonio, la utilidad operacional y la liquidez de una **persona
natural identificada por nombre completo** (`lib/perfiles.js`). El gate de la clave `231105` vive en
`public/app.js` —en el **cliente**— y nunca protegió la API: quien conociera la ruta veía esas cifras
sin credencial alguna. El token se comprueba **antes que nada**: sin él no se confirma ni se niega
nada, ni siquiera qué perfiles existen.

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `perfil` | requerido | `helder` · `genesis` · `juntos` (alias aceptado: `consorcio`) |
| `anticipo_min` | 20 | Excluye anticipos **declarados** menores; `0` = sin dato **pasa** (ver nota) |
| `cuantia_rango` | — | `bajo` · `medio` · `alto` |
| `nivel_competencia` | — | Ofertas **del proceso**: `baja` · `media` · `alta` |
| `competencia_entidad` | — | Histórico **de la entidad**: `baja` · `media` · `alta` · `sin_dato` |
| `ubicacion_valida` | — | `true` · `false` |
| `match` | — | Solidez del match UNSPSC: `clase` · `familia` · `equivalente` · `texto` |
| `incluir_sin_unspsc` | — | `1` para reabrir la ruta de texto sin pertinencia verde (toggle de la UI) |
| `incluir_cerradas` | — | `1` para incluir procesos en estado terminal |
| `solo_viables` | **`true`** | Oculta lo que no pasa las puertas P1-P3. Con `false` aparecen al final, marcados |
| `ordenar_por` | **`atractividad`** | `atractividad` · `ve` · `p_ganar` · `anticipo` · `cuantia` · `competencia` · `puntaje` (legado) |
| `orden` | `desc` | `asc` · `desc` |
| `pagina` / `por_pagina` | 1 / 20 | `por_pagina` máx 100 |

Respuesta: `{ ok, total, viables, no_viables, solo_viables, resultados, pagina, por_pagina, perfil,
sincronizado, ordenado_por, por_match, indice_competencia, conocimiento }`. `por_match` reparte el
total por solidez del match (cuántas son «RUP ✓» y cuántas hay que verificar). Cada resultado trae
los campos de negocio, `rup` con el **veredicto graduado** —`tier`, `unspsc {codigo_proceso,
codigo_rup, mensaje}`, `pertinencia {nivel, etiqueta, motivo}`, `capacidad_ok`, `k_cop`, `crpc_cop`—
y:

```json
"competencia_entidad": { "nivel": "baja", "promedio_oferentes": 3, "mediana_oferentes": 3, "total_procesos": 12 }
```

Del corpus histórico solo sale ese **resumen agregado**. Los datos de adjudicación (adjudicatario,
NIT, valor adjudicado) no se exponen aquí; de hecho ni siquiera se guardan en el corpus activo.

#### Las cuatro puertas, `p_ganar` y `ve` (ago 2026)

`puntaje_ponderado` **ya no viaja en la respuesta**. Lo sustituyen tres campos con significado
propio que **no se promedian entre sí**, porque compensar aquí es un error de categoría: no poder
financiar la obra no se compensa con cuantía alta. El razonamiento completo está en
[`docs/ATRACTIVIDAD.md`](docs/ATRACTIVIDAD.md).

```json
"puertas": {
  "p1_rup":  { "pasa": true,  "tier": "clase", "mensaje": "La clase UNSPSC del proceso está inscrita en su RUP." },
  "p2_k":    { "pasa": true,  "crp": 4516364009, "crpc": 340000000, "mensaje": "Consume 8 % de su capacidad residual…" },
  "p3_caja": { "pasa": false, "patrimonio": 211340888, "financiacion_requerida": 620000000, "mensaje": "…" },
  "p4_competencia": { "pasa": true, "nivel": "baja", "promedio_oferentes": 3, "mensaje": "…" },
  "pasa_todas": false, "no_viable_por": ["Caja"]
},
"p_ganar": 0.325, "ve": 110500000, "viable": false,
"p_ganar_detalle": { "base": 0.25, "rivales_esperados": 3, "fuente": "entidad", "ajustes": [ … ] }
```

- **P1 · RUP** (`lib/filtros.evaluarObjeto`): `clase`/`familia` pasan; `equivalente`/`texto` pasan
  **con advertencia**; `ninguno` —o morir en cualquier capa de la cascada del objeto— no pasa.
- **P2 · K** (`lib/capacidad.js`): pasa si `CRPC ≤ CRP`. Sin `precio_base` marca `sin_dato` y **no**
  se presenta como capacidad verificada: `factorE` devuelve 120 «sin presupuesto no hay ratio» y
  `CRPC = 0 ≤ K`, así que la puerta se abriría sobre la nada.
- **P3 · Caja** (`lib/puertas.js`, **nueva**): pasa si `patrimonio ≥ (cuantía − anticipo) × 0,20`.
  Es la puerta que de verdad ata y no necesitó un dato nuevo. Caso real: Génesis (patrimonio
  $211 M) ante un proceso de $3.100 M tendría que financiar ~$620 M — y hasta ahora lo veía con
  «Capacidad K ✓» en verde, porque el K del RUP mide **habilitación**, no si se puede financiar la
  obra. En proponente plural el patrimonio se **suma** (no se pondera 50/50: eso es para
  indicadores habilitantes) y cada integrante responde por el 100 % (Ley 80/1993 art. 7).
- **P4 · Competencia**: **nunca bloquea**. Informa y advierte si es alta; de la penalización ya se
  encarga `p_ganar`.
- **Regla de faltantes**: un dato ausente no vale 0 ni 1. La puerta marca `sin_dato` y **deja
  pasar** — cerrar por ignorancia esconde oportunidades reales y el usuario no puede ni enterarse.

`p_ganar ≈ 1 / (1 + rivales esperados)`, con los rivales tomados en cascada del **histórico de la
entidad** → **promedio de su departamento** → **supuesto conservador de 5** (`P = 1/6`), y cuatro
ajustes declarados: competencia baja ×1,30 · alta ×0,70 · **cierre prorrogado ×1,20** · **colisión
de cierres ×1,15**. La fuente viaja siempre en `p_ganar_detalle.fuente`: «histórico de la entidad»
no es lo mismo que «supuesto», y enseñar el 17 % sin decir de dónde sale convierte una estimación en
una promesa. Los factores son **supuestos con nombre**, no coeficientes ajustados: no hay etiqueta
contra la que calibrarlos. `ve = p_ganar × cuantía`.

**La prórroga del cierre** es la única señal de competencia observable **antes** del cierre que hay
en el corpus (el contador de oferentes es ex-post: en un proceso abierto vale 0 por construcción).
Sale gratis del dedup de lectura, que ya recorre todas las versiones de cada `_k`
(`lib/almacen.leerChunksDedup`, bandera `senales`): si una versión anterior cerraba antes que la
vigente, la entidad movió el cierre — y eso pasa casi siempre porque no llegaron ofertas suficientes.

**Orden por atractividad** (el default): primero lo que pasa las cuatro puertas y, dentro de cada
grupo, por **valor esperado** descendente. La viabilidad manda sobre `orden=asc|desc`: lo que no se
puede tomar va al final, siempre.

**Arranque en frío**: si Redis no tiene chunks, responde `503` con
`"Datos no disponibles. Sincronización iniciada. Intente en unos minutos."` y dispara
`/api/sync?modo=auto` en segundo plano; el frontend reintenta solo cada 20 s. Así se eliminó de
raíz el viejo «Sin conexión a SECOP II»: antes la carga inicial exigía un secreto que nadie podía
aportar desde el navegador y la web caía a una cascada de proxies CORS muertos.

### `GET /api/competencia-detalle` (protegido)

El badge de la tarjeta afirma «🟢 Poca competencia — promedio 3 oferentes en 12 procesos». Este
endpoint entrega **esos 12**: sin él, el promedio es una caja negra y no hay forma de saber si los
procesos que lo sostienen son de obra civil o de cualquier otra cosa.

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `entidad` | requerido | Nombre de la entidad. Se normaliza (tildes, mayúsculas, espacios de más, puntuación); se devuelve el nombre **tal como aparece en los datos** |
| `refrescar` | — | `1` para saltarse la caché de lectura (igual la deja al día) |

Mismo `HISTORICO_TOKEN` que el resto (header `x-historico-token` o `?token=`). Devuelve tres
bloques: `indice` (nivel, promedio, mediana, mín/máx, contados vs adjudicados), `procesos` (los que
forman el promedio, **de menos a más oferentes**: lo relevante para decidir) y `excluidos` (los que
NO cuentan, cada uno con su `motivo_exclusion`).

**Nada se descarta en silencio** — esa era justamente la queja del ⚪ sin explicación:

| `motivo_exclusion` | Qué significa |
| --- | --- |
| `sin_dato_oferentes` | Adjudicado, pero el dataset no dice cuántos se presentaron (0 = sin dato, nunca «nadie vino») |
| `sin_adjudicacion` | Cerrado sin ganador: desierto, cancelado o revocado |
| `insuficientes_datos` | La entidad no llega al mínimo de 5 procesos útiles, así que **ningún** promedio suyo es fiable. Es el ⚪ de la tarjeta, con nombre y apellido |

**Es el MISMO cálculo del índice, no un segundo cálculo.** Usa los predicados de
`lib/indice_competencia` (`esAdjudicado`, `oferentesDe`) y hay una prueba que compara, entidad por
entidad, el promedio y el conteo reconstruidos aquí contra los publicados en `indice:competencia`.
Si pudieran divergir, el detalle no serviría para verificar nada.

Detalles de operación:

- **Caché** `indice:detalle:{entidad}` con TTL de 1 h. El valor guarda el sello de construcción del
  índice, así que **reconstruir el índice invalida todos los detalles al instante**, sin borrar
  clave por clave ni esperar al TTL. Un acierto son 2-3 comandos Redis; un fallo barre el histórico.
- Una respuesta calculada sobre un **chunk ilegible** no se cachea (sería congelar el error una
  hora) y el conteo viaja en `chunks_ilegibles`.
- Listas topadas a **200** por bloque, cortando por los más recientes; `truncado` dice cuántos hay
  en realidad. Las **cifras del índice nunca se recortan**: el tope es de presentación.
- **No expone adjudicatarios ni NITs**: la proyección es una lista blanca, igual que en
  `/api/oportunidades`.
- Redis caído o corpus ilegible → `503` con mensaje accionable, nunca un `500` mudo.

### `GET /api/resumen` (protegido)

El panel de `/admin.html`. Responde, sobre los **mismos procesos que sirve la app**, las preguntas
que de otro modo habría que contestar revisando 2 000 tarjetas a mano: cuántos son obra y cuántos
consultoría, cuáles cierran esta semana, qué entidades acumulan procesos y con cuánta competencia
histórica, en qué departamentos están, cuántos se caen por capacidad K.

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `perfil` | requerido | `helder` \| `genesis` \| `consorcio` \| `juntos`. Otro valor → `400` con `valores_validos` |
| `token` | requerido | El mismo `HISTORICO_TOKEN` (header `x-historico-token` o `?token=`) |

**No reimplementa la cascada: llama a la MISMA función.**
`lib/filtros.filtrarProcesosVisibles` es la única implementación de
modalidad → estado → objeto → capacidad K → tope → anticipo, y la usan este endpoint y
`/api/oportunidades`. Hasta ago 2026 eran dos copias idénticas —con pruebas de que los totales
coincidían—, pero «idénticas hoy» no es una garantía: dos copias divergen a la primera corrección
que se aplique a una sola. Hay una prueba que compara `totales.visibles` contra el `total` de
`/api/oportunidades` **y** contra el `embudo.visibles` de `/api/diagnostico`: si divergieran, el
panel sería un segundo cálculo, y un segundo cálculo acaba contradiciendo al primero.

Qué trae: `totales` (repartos por pertinencia, tier UNSPSC, modalidad, rango de cuantía, nivel de
competencia de la entidad, departamento, urgencia de cierre y anticipo), `descartes` (en qué paso
murió cada proceso del corpus activo), `top_entidades` (15, con su badge idéntico al de la tarjeta),
`top_municipios` (10, solo si el dataset trae la columna) y `procesos_destacados` (10).

Decisiones que conviene no re-aprender:

- **Cada reparto SUMA los visibles.** Hay cubetas «feas» a propósito (`OTROS` y `SIN_DEPARTAMENTO`
  en departamentos; `ya_cerro` y `mas_adelante` en urgencia) porque la alternativa es que un
  proceso desaparezca del reparto sin que nadie lo note.
- **`superan_k` / `no_superan_k` se cuentan sobre `base_capacidad`** (los que pasaron el juicio del
  objeto), no sobre los visibles: entre los visibles todos superan la K por construcción, y un
  contador que siempre vale «todos» no informa de nada.
- **`SIN_DEPARTAMENTO` no compite por un puesto del top 15** y jamás se reparte a ojo: primero
  manda la columna `departamento_entidad` y solo si viene vacía se busca el departamento en el
  nombre de la entidad.
- **`procesos_destacados` cae a orden por atractividad** cuando todavía no hay histórico (sin
  backfill nadie tiene nivel `baja` y la tabla quedaría vacía para siempre). El campo
  `destacados_desde` dice cuál de los dos criterios se aplicó — no se disimula.
- **Los destacados aplican CUATRO filtros MÁS que el listado** (ago 2026): estado explícitamente
  cerrado, pertinencia «Verificar objeto», objetos de **estructuración** (accionista, socio
  estratégico, APP, concesión…) y cuantía 0. Es deliberado: la lista corta es una *recomendación*
  —«empiece por aquí»— y un falso positivo en el puesto 1 cuesta más que uno en la página 4 de la
  app. **Ninguno toca `totales.visibles`**: el proceso sigue en `/api/oportunidades`, con su tarjeta
  y su veredicto delante, que es donde el dueño puede juzgarlo. Lo apartado se cuenta en
  `destacados_descartados` — nada se va en silencio.
- **`integridad`**: el endpoint verifica sus propios números antes de publicarlos (el conteo contra
  la cascada compartida, cada reparto contra los visibles, y `descartes + visibles` contra el
  corpus). Si algo no cuadra, `integridad.ok` es `false` y los avisos viajan en la respuesta además
  de en un `console.error`: un log de Vercel lo lee quien mira los logs, y el dueño no mira logs.
- **Caché `resumen:{perfil}` con TTL 300 s**, anunciada en la cabecera `X-Cache: HIT|MISS` y en
  `cache`. La invalida cualquier carga de RUP: sus números dependen del RUP y quedarían mintiendo
  cinco minutos.
- Corpus vacío → `200` con `visibles: 0` y el mensaje de qué ejecutar, nunca un `500` mudo.

### `GET|POST /api/admin/rup` (protegido)

Carga del RUP **por archivo JSON**, desde `/admin.html`. Antes los perfiles eran datos hardcodeados
en `lib/perfiles.js`: un código UNSPSC nuevo o un indicador del balance del año exigían tocar código
y desplegar, y el dueño no tiene terminal.

- `GET` → el RUP vigente en el **mismo esquema que se sube** (`{perfiles: {helder, genesis,
  consorcio}}`). Sin carga previa devuelve los valores del repositorio con `fuente: "hardcoded"` y
  una advertencia. Descargar → editar → volver a subir es un ciclo cerrado, y hay una prueba que
  pasa la salida del `GET` por el validador del `POST`.
- `POST` → valida campo por campo, **acumulando todos los errores** (`400` con
  `[{campo, error, valor_recibido}]`), y guarda de forma atómica.

**El cambio surte efecto en la siguiente consulta**: el juicio corre al servir desde jul 2026, así
que no hace falta re-sincronizar nada. `/api/oportunidades`, `/api/diagnostico` y `/api/resumen`
llaman a `recargarPerfiles(redis)` antes de evaluar — un `GET` del sello `config:perfiles:version`
y, solo si cambió, la configuración entera.

Errores vs **advertencias** (la distinción importa): un `tope_smmlv` por debajo de la experiencia
acreditada es una advertencia, no un error, porque el tope es **apetito estratégico** y en el RUP
real de los dos perfiles va justo por debajo (Helder: 6 768 acreditados, tope 4 000). Convertirlo
en error dejaría el RUP real imposible de cargar. Lo mismo con el tope del plural frente al de sus
integrantes y con un segmento UNSPSC fuera del rango 10–95.

Detalles de operación:

- **El sello se escribe AL FINAL** (whitelists → configuración → `config:perfiles:version`): es lo
  que hace recargar a las instancias calientes, así que nadie ve un estado a medias si la función
  muere en mitad de la carga. Un `POST` rechazado no toca nada de lo guardado.
- **Carga parcial**: subir solo Génesis conserva a Helder. El **consorcio se re-deriva siempre** de
  sus integrantes (unión de UNSPSC, experiencia sumada, K = suma de las CRP) aunque venga en el
  archivo; una lista propia del plural se **suma** a la unión, nunca la sustituye.
- Si la configuración se borra o Redis no responde, la app vuelve al respaldo del repositorio
  (`PERFILES_FALLBACK`) sin lanzar: quedarse sin perfiles dejaría la app muda.
- Cuerpo máximo 5 MB (`413`); se guarda comprimido para respetar el tope real de 1 MB por valor de
  Upstash.

## Índice de competencia por entidad (¿dónde es más probable ganar?)

El puntaje ponderado dice *dónde mirar primero*. El índice dice *dónde compite menos gente*, que
es lo más cerca de «probabilidad de ganar» que permiten los datos públicos.

**Cómo se calcula** (`lib/indice_competencia.js`, sobre el corpus histórico):

1. Recorre `licitaciones:historico:mes:*:chunk:*` **mes a mes** (reanudable) y deduplica por `_k`.
2. Por entidad acumula: procesos adjudicados, suma de oferentes, promedio y mediana.
3. Descarta de la clasificación las entidades con **menos de 5 procesos** útiles → `sin_dato`.
4. Ordena las clasificables por promedio y las parte en **tertiles**:
   `baja` (menos oferentes → **más atractiva**) · `media` · `alta` (más oferentes → menos atractiva).
   Los cortes se comparan con `<=`, así que dos entidades con el mismo promedio caen siempre en el
   mismo nivel; si todas tuvieran el mismo promedio, ninguna destaca y todas quedan en `media`.
5. Publica el hash `indice:competencia` (`entidad → JSON`) con **swap atómico** (se construye en
   `indice:competencia:nuevo` y se renombra encima), más un resumen en `indice:competencia:meta`.

**Qué cuenta y qué no** (mismo criterio honesto que `anticipo_pct = 0`): solo cuentan los procesos
con evidencia de adjudicación **y** con un conteo de oferentes ≥ 1. Un «0 oferentes» en un proceso
adjudicado es un hueco del dataset, no una subasta desierta: contarlo arrastraría el promedio a
cero y **todas** las entidades acabarían clasificadas como «baja». Los descartes quedan contados
en `indice:competencia:meta` (`descartados.sin_oferentes` / `sin_adjudicacion`) para auditarlo.

### Ninguna cifra sin base detrás (defecto de producción, ago 2026)

El panel llegó a decir **«promedio 18,2 oferentes en 0 procesos»**. Eran **dos** cosas distintas:

**(i) El «en 0 procesos» era un campo inexistente.** El detalle en línea de `/admin.html` leía
`i.total_procesos` de la respuesta de `/api/competencia-detalle`, que nunca ha tenido ese campo: se
llama `procesos_contados`. `total_procesos` existe, pero en el **otro** payload —el
`competencia_entidad` que embebe `/api/oportunidades`—, y `public/app.js` sí usa el nombre correcto
en cada uno. El `|| 0` convertía el `undefined` en un cero perfectamente creíble, así que el conteo
era 0 **siempre**, con cualquier entidad y con índice o sin él. La cifra del promedio era real; lo
falso era el conteo que la acompañaba. Hay una prueba que prohíbe `i.<conteo> || 0` en los dos
frontends: un conteo ausente se dice, no se pinta como cero.

**(ii) El promedio sí podía carecer de base.** Nacía en el paso 5: se publicaba el
`promedio` de entidades que el paso 3 acababa de declarar `sin_dato`, y bastaba con que un
consumidor lo pintara sin mirar el nivel. El promedio de 3 procesos no es un promedio: es ruido con
un decimal. Tres cerraduras, y las tres hacen falta:

1. **El escritor** (`registroPublicado`): por debajo de `MIN_PROCESOS` no se publica **ninguna
   cifra derivada** — ni promedio, ni mediana, ni `oferentes_total` (con la suma y el conteo se
   recalcula el promedio que se acaba de anular). El **conteo sí** se publica: es un hecho y es lo
   que explica el ⚪.
2. **El lector** (`competenciaDe`), que es el **punto único de paso** de los tres consumidores
   (tarjeta, panel y detalle). Ahí se impone la invariante: un promedio solo sale si hay
   `procesos ≥ 5` **y** nivel clasificado **y** promedio presente. Esta es la cerradura que
   importa: `indice:competencia` **no se purga nunca** —es su razón de ser—, así que en producción
   sigue vivo el hash que escribió la versión anterior hasta que alguien reconstruya el índice.
   Arreglar solo el escritor habría dejado el defecto en pantalla indefinidamente.
3. **Los badges** (`public/app.js` y `/api/resumen`), que exigen `conBase` antes de interpolar una
   cifra y, si no la hay, dicen «Sin datos históricos» **sin ningún número**. El desglose (cuántos
   procesos hay y por qué no cuentan) está a un clic, en el modal, que es donde se puede explicar.

`procesos_contados` se publica como alias de `procesos`, y el lector acepta los dos nombres: así un
consumidor que pida el campo por su nombre largo no lee `undefined` y lo interpreta como cero.

**Y una tercera contradicción, del mismo aire**: el detalle exigía índice clasificado para el
`nivel` pero solo `contados ≥ 5` para el `promedio`, así que con el índice **sin reconstruir** —que
es el estado normal, porque se construye a mano mientras el delta engorda el histórico en cada
visita— salían juntos la banda ⚪ y un promedio, sin nada que lo conciliara. El promedio se
conserva (12 procesos con oferentes son base de sobra) y ahora el `mensaje` dice por qué la banda
sigue en ⚪ y con qué parámetro exacto se arregla.

### Quién es «la misma entidad» (defecto de producción, ago 2026)

Dos formas de confundir a dos entidades entre sí, las dos corregidas con prueba que falla sin la
corrección:

**Un NIT no identifica a una entidad.** Las regionales y unidades de un mismo organismo publican
con el NIT de la matriz. El alias `nit:{NIT}` → `{ref: entidad}` iba **primero** en el orden de
búsqueda, así que una entidad con su nombre bien escrito y su propio registro en el índice acababa
enseñando el nivel de competencia de su hermana. Ahora:

| Orden de búsqueda en `competenciaDe` | Por qué |
| --- | --- |
| 1.º clave canónica | El nombre es exacto: solo puede ser esta entidad |
| 2.º clave legado (`norm` a secas) | Es como está escrito el hash que hay hoy en producción |
| 3.º alias por NIT | El más **débil**: un NIT lo comparten las regionales de un organismo |

Y el escritor **no publica alias para un NIT compartido por dos entidades** —un alias ambiguo no es
un alias, es una respuesta equivocada— y los cuenta en `indice:competencia:meta.nits_ambiguos`. El
alias sigue existiendo para lo que se creó: que un cambio de razón social no parta el historial.

**La puntuación partía una entidad en dos.** `lib/competencia_detalle` tenía dos claves —una sin
puntuación para agrupar el corpus y `norm` a secas para leer el hash—, así que
«… RIOS NEGRO **-** NARE» y «… RIOS NEGRO NARE» se sumaban al contar (4 procesos) y no al leer (un
registro de 3): el detalle enseñaba el promedio de un conjunto bajo una banda calculada sobre otro.
No era un error de cálculo: eran **dos definiciones de «entidad» conviviendo**. Ahora hay una sola,
`claveCanonica`, definida en `lib/indice_competencia` e importada por el detalle, y el índice
agrupa con ella. Las dos direcciones no pueden volver a separarse porque no hay dos funciones que
mantener.

La clave anterior se conserva **solo para leer** (`claveLegado`): sin ese segundo intento,
desplegar dejaría todo en ⚪ hasta que alguien reconstruyera el índice a mano.

**Reconstruir el índice** para limpiar el hash viejo (no re-extrae nada, no requiere full):

```
GET /api/sync/historico?reconstruir_indice=true      (header x-historico-token, o &token=…)
```

**Cómo se usa** — `ordenar_por=atractividad` (el **default**, lo que se ve al abrir la app):

| Orden | Grupo | Por qué |
| --- | --- | --- |
| 1.º | 🟢 `baja` | Poca competencia histórica: donde más probable es ganar |
| 2.º | 🟡 `media` | Competencia intermedia |
| 3.º | ⚪ `sin_dato` | No sabemos — puede ser oportunidad; no se castiga la ignorancia |
| 4.º | 🔴 `alta` | Mucha competencia: al final |

Dentro de cada grupo se ordena por `puntaje_ponderado` descendente (y luego por fecha, como antes).

**Nombres de columna pendientes de verificación**: este repositorio de desarrollo no alcanza
`datos.gov.co` (allowlist del proxy — verificado: `CONNECT 403`), así que las columnas de
adjudicación y de nº de oferentes se leen por **lista de candidatas** en orden de preferencia
(`numero_de_ofertas`, `numero_proponentes`, `proveedores_unicos_con`,
`conteo_de_respuestas_a_ofertas`, `respuestas_al_procedimiento`…; y
`nombre_del_proveedor`/`nit_del_proveedor_adjudicado`/`valor_total_adjudicacion`/
`fecha_adjudicacion` para la adjudicación) y no por un nombre único. Si el dataset real usa otro
nombre, basta añadirlo a `lib/indice_competencia.js` y **reconstruir el índice** —
`/api/sync/historico?reconstruir_indice=true`— sin volver a extraer nada. Si al terminar el
backfill `indice:competencia:meta` reporta `clasificadas: 0` y `descartados.sin_oferentes` alto,
ese es exactamente el síntoma de que la candidata correcta falta en la lista.

## Cómo ejecutar la extracción histórica inicial

Una sola vez, después de desplegar:

1. Definir `HISTORICO_TOKEN` (una cadena larga y aleatoria) en las variables de entorno del
   proyecto en Vercel y volver a desplegar.
2. Lanzarla. **Con terminal** (preferido: el token va por header y no queda en los logs de acceso):

   ```bash
   curl -H "x-historico-token: $HISTORICO_TOKEN" \
        "https://<tu-app>.vercel.app/api/sync/historico?desde=2024-01&hasta=2025-12"
   ```

   Con Password Protection activa hay que añadir
   `-H "x-vercel-protection-bypass: $VERCEL_AUTOMATION_BYPASS_SECRET"`.

   **Sin terminal** (equipo bloqueado): pegar la URL con el token en el navegador, ya autenticado
   en Vercel si Password Protection está activa —el muro del edge usa la cookie de sesión, así que
   desde Chrome no hace falta el bypass—:

   ```
   https://<tu-app>.vercel.app/api/sync/historico?desde=2024-01&hasta=2025-12&token=<EL_TOKEN>
   ```

   Se valida exactamente igual que el header (y si llegaran los dos, manda el header). El precio
   de esta vía es que **el token queda escrito** en los logs de acceso de Vercel, en el historial
   del navegador y en cualquier proxy intermedio: conviene **rotarlo** (nuevo valor + redeploy)
   cuando el backfill termine. Solo la primera petición lo expone — la auto-reinvocación de la
   cadena viaja siempre por header.
3. La función avanza en tandas de 45 s **auto-encadenadas**; la respuesta trae `done:false` mientras
   quede trabajo. Se puede consultar el avance repitiendo la llamada (responde `enCurso:true` si
   otra tanda está corriendo) o mirando `sync:historico:progreso`.
4. Al terminar (`done:true`) el índice ya está construido: la respuesta trae `indice.clasificadas`
   y `indice.por_nivel`. Desde la siguiente visita la app ordena por atractividad.

### Si parece que no avanza

Todo se diagnostica y se rescata desde el navegador, con el mismo token:

```
…/api/sync/historico?token=<TOKEN>&estado=true    ← mirar primero (no toca nada)
…/api/sync/historico?token=<TOKEN>&reset=true     ← solo si de verdad hace falta
```

`?estado=true` responde si el candado está tomado y **en cuántos segundos se libera solo**, por
qué mes va la extracción, cuántos procesos hay ya guardados y cómo está el índice, más un
`siguiente_paso` explícito. Antes de resetear, léelo: casi siempre la respuesta correcta es
**volver a llamar la misma URL**, porque la extracción es reanudable y continúa donde quedó.

| Síntoma en `?estado=true` | Qué pasa de verdad | Qué hacer |
| --- | --- | --- |
| `candado.tomado: true` | Hay una tanda corriendo (o murió hace poco) | Esperar; el TTL de 600 s lo libera solo |
| `candado.tomado: false` y `extraccion.terminada: false` | La cadena de auto-reinvocación murió (típico: Password Protection interceptando la llamada que la función se hace a sí misma) | Volver a llamar la URL: **continúa**, no reinicia |
| `extraccion.terminada: true` pero falta rango | Ese rango ya se dio por completo | Relanzar con `&reiniciar=1` |
| Todo vacío tras un error raro | Estado inconsistente | `?reset=true` y volver a lanzar |

**El candado nunca queda atascado para siempre**: se toma con `SET NX EX 600`, así que una función
muerta lo libera sola en 10 minutos. Y un token equivocado **no** lo deja puesto: la autorización
corre antes de tomarlo, así que un `401` no llega a tocar Redis.

`?reset=true` borra el candado, `sync:historico:progreso` y `sync:historico:meta` (y el acumulador
a medias del índice, que es scratch). **No borra** los chunks ya bajados ni el índice publicado —
por eso relanzar después es seguro: la extracción reemplaza los meses en vez de duplicarlos. El
precio es tiempo: se descarta el avance y el rango se recorre entero otra vez.

Notas:

- Se puede pedir cualquier rango, incluido el año en curso
  (`?desde=2026-01&hasta=2026-12`), útil para recuperar los procesos que ya estaban cerrados la
  primera vez que la app los vio. Re-ejecutar un rango **reemplaza** esos meses, no los duplica.
- **Una vez al año conviene repetir el año que termina.** El delta consulta solo publicaciones del
  año vigente (`fecha_de_publicacion_del >= 1 de enero`), así que un proceso publicado en diciembre
  y adjudicado en febrero del año siguiente no le llega: su copia histórica queda con el estado que
  tenía al cerrar el año. Un `?desde=2026-01&hasta=2026-12&reiniciar=1` en enero lo deja al día.
- Para volver a extraer un rango ya terminado hay que pasar `&reiniciar=1` (sin él, una segunda
  llamada al mismo rango solo reconstruye el índice).
- El histórico **no** se purga nunca: ni la full de higiene mensual ni la compactación lo tocan.

## Cascada de filtros (`lib/filtros.js`)

Dos cascadas distintas, con propósitos opuestos. Confundirlas fue el bug estructural que esta
reforma corrige.

### A · Prefiltro de INGESTA (`admisibleParaIngesta`) — corre en `/api/sync`

Responde una sola pregunta: **¿puede este proceso llegar a interesarle a alguien alguna vez?**
No sabe de perfiles, de capacidad ni de matching fino. Es barato (< 1 ms por proceso), estable y
deliberadamente ancho:

1. **Modalidad competitiva** (la aplica `api/sync` justo antes).
2. **No es convenio** («aunar esfuerzos», «convenio interadministrativo» al inicio del objeto).
3. **No está en la blacklist semántica** (caninos, PAE, software, vigilancia…). Se conserva aquí a
   propósito: no es juicio por perfil —ningún RUP de obra civil querrá jamás un contrato de
   caninos— y es lo que evita que el corpus del año pase de unos miles de procesos a las ~500 000
   filas que revientan el tier gratuito de Upstash. Como el paso 4 de la consulta la vuelve a
   aplicar, quitarla de aquí no cambiaría ni un resultado: solo la factura.
4. **Tiene un UNSPSC de los segmentos 70–95** (obra, construcción, ingeniería, consultoría,
   servicios) **o de una familia (4 dígitos) que algún RUP inscribe** — así entran también los
   segmentos de bienes que los RUP sí tienen (tubería 40, materiales 30, mobiliario 56…).
5. **O, sin códigos utilizables, el objeto es textualmente de obra.**

Cambiar una regla de matching o cargar un RUP nuevo **ya no exige una `full`**.

### B · Juicio fino por perfil (`evaluarObjeto`) — corre en `/api/oportunidades`

Cada paso deja su nombre en `paso`, que es lo que `/api/diagnostico` agrega para ver el embudo.

1. **Modalidad competitiva** — lista blanca: Licitación Pública, Selección Abreviada (incl.
   subasta), Concurso de Méritos, Mínima Cuantía, Acuerdo Marco. Excluidas: **Contratación
   Directa** (incluida su variante «(con ofertas)»: sigue siendo directa — ahí viven las OPS),
   **Licitación Privada**, las solicitudes de información (RFI) y la **Enajenación de bienes**
   (venta de activos del Estado: trae «subasta» en el nombre pero no es obra). **Régimen
   Especial** se excluye salvo la variante «(con ofertas)», donde sí hay convocatoria. Modalidad
   vacía o desconocida → fuera.
2. **Estado abierto** — listas canónicas normalizadas (acentos/mayúsculas) sobre
   `estado_del_procedimiento` y `fase`, más la señal dura `adjudicado="Si"`. **Cualquier valor no
   clasificable se considera CERRADO** — el «+5 para fases desconocidas» de la era anterior no
   existe en esta base de código.
3. **Convenios fuera** — «AUNAR ESFUERZOS TÉCNICOS, ADMINISTRATIVOS Y FINANCIEROS…» es la fórmula
   de los **convenios interadministrativos y de asociación** (Ley 489/1998 art. 95-96): no hay
   pliego, no hay oferta, no se compite. La regla es deliberadamente precisa para no llevarse obra
   real por delante: «aunar esfuerzos/recursos» descarta esté donde esté, mientras que «convenio
   interadministrativo» y compañía solo descartan si **encabezan** el objeto — una obra legítima
   suele mencionarlos de pasada («construcción de placa huella **en el marco del** convenio 123»).
4. **Blacklist semántica** — objetos que ningún RUP cubre.
5. **Matching UNSPSC jerárquico** (ver más abajo). Sin match → `fuera_unspsc`.
6. **Equivalencias funcionales** aprendidas del histórico → tier `equivalente`.
7. **El objeto como co-señal** (vocabulario por familia o verbo de obra) → tier `texto`. Si nada
   de esto confirma nada → `fuera_sin_unspsc_ni_obra`.
8. **Pertinencia del objeto** — la capa nueva (ver abajo). Objeto genérico → `fuera_objeto_generico`;
   servicio ajeno o término bloqueante → `fuera_no_pertinente`.
8-bis. **Ruta de texto débil** — un tier `texto` que no llegó a pertinencia verde se descarta
   (`fuera_texto_debil`) salvo con `?incluir_sin_unspsc=1`.
9. **Anti-suministro** — si **ningún** código ANCLA el proceso como obra y el objeto se redacta
   como compra («suministro/adquisición/compra/compraventa/dotación/entrega/arrendamiento de…»)
   sin ningún verbo de obra, es una compra disfrazada. Ancla un código de segmento ≥ 70 **salvo**
   los servicios no constructivos (80 gerencia, 84 finanzas, 85 salud, 86 educación, 90 viajes,
   91 personales, 92 defensa, 93 sociales, 94 asociaciones): antes bastaba cualquier ≥ 70, así que
   una «ADQUISICIÓN DE MOBILIARIO» con un 80101600 de gerencia quedaba anclada y pasaba. El corte
   de bienes sigue en 70 — enumerar solo 30/39/43/48/56 dejaba servida la «compraventa de tubería
   PVC» (segmento 40, el bloque de bienes más grande del RUP de Génesis).
10. **Capacidad K**, **tope estratégico** y **anticipo** (en `lib/rup.js` y en el endpoint).

### Matching UNSPSC jerárquico por niveles (`lib/unspsc.js`)

UNSPSC es jerárquico y de longitud fija: `SS FF CC PP` (segmento · familia · clase · producto).
El **nivel** de un código se lee por sus pares `00` finales — `72000000` es un *segmento*, no «el
producto cero de la clase cero». Ignorarlo rompía el matching en las dos direcciones.

| Situación | Ejemplo | Tier | Qué significa |
| --- | --- | --- | --- |
| El RUP **contiene** al código publicado | RUP `72141000` · proceso `72141015` | `clase` | Match sólido: el RUP se inscribe por clase y SECOP II publicó el producto |
| Mismo código | `72141000` · `72141000` | `clase` | Match sólido |
| El proceso se publicó a nivel de **familia** y el RUP tiene clases dentro | proceso `72140000` · RUP `72141000` | `familia` | Match **amplio**: verificar el pliego |
| Solo **segmento** | proceso `72000000` | — | **No basta**: se exige confirmación por el objeto (pasa a tier `texto`) |
| Familia distinta | RUP `72141000` · proceso `80111500` | `ninguno` | Fuera |

- El *upward matching* llega **hasta familia, nunca hasta segmento**: subir al segmento haría
  casar «servicios de construcción» con cualquier cosa del 72.
- **Consorcio = UNIÓN** de las dos whitelists (393 clases). La intersección sería absurdamente
  restrictiva y contraria a la lógica del proponente plural.
- **Normalización**: se retiran los prefijos de versión (`V1.`), se tokeniza por *runs* completos
  de dígitos y solo se aceptan longitudes 2/4/6/8. El `\d{8}` anterior **fabricaba** códigos
  falsos a partir de cualquier número largo del campo (`1234567890` → `12345678`). Lo que no es un
  UNSPSC posible se descarta **y se cuenta**: `/api/diagnostico` lo reporta en
  `distribuciones.codigos_unspsc_ilegibles`.
- El resultado **nunca es un booleano**: `{tier, codigo_proceso, codigo_rup, mensaje}`.

### Pertinencia del objeto (la capa que faltaba)

Las whitelists de los RUP incluyen clases de los segmentos 80 (gerencia y servicios de empresa),
85 (salud) y 93 (servicios sociales) porque ahí viven la gerencia de proyectos y la interventoría.
Esas mismas clases dejaban pasar falsos positivos confirmados en producción: «PRESTACIÓN DE
SERVICIOS DE IMPRESIÓN Y FOTOCOPIA» (80101600), «SUMINISTRO DE ALIMENTOS PARA PREPARAR RACIONES»
(80111600), «SERVICIO DE INTERNET DEDICADO», un «CUMPLEAÑOS» y un «APOYO LOGÍSTICO PARA GRUPO DE
PILONERAS» (93141700). La capa anti-suministro no los veía: solo mira segmentos de **bienes**.

La regla corre **después** del matching (si el código ya falló, no hay nada que verificar) y
**nunca bloquea por falta de información**:

| Situación | Veredicto |
| --- | --- |
| Hay **término bloqueante** (servicio de internet, ancho de banda, canal dedicado…) | 🔴 **fuera, aunque el objeto hable de obra** |
| El objeto es **genérico** (menos de 15 caracteres, o solo el nombre del trámite y su código) | 🔴 **fuera**: no describe nada |
| Hay verbo de obra (construcción, pavimentación, acueducto, interventoría…) | 🟢 pertinente |
| Hay término no pertinente (alimentos, evento, impresión, vigilancia, software, seguros, dotación…) **y cero** verbos de obra | 🔴 **no pertinente** → fuera |
| Sin verbo de obra pero con match `clase` en un segmento de obra/ingeniería pura (72, 77, 81, 95) | 🟢 pertinente: el código es sólido |
| Resto (objeto poco explícito) | 🟡 **pertinente con advertencia** — «verificar objeto» |

**Términos bloqueantes** (ago 2026, del diagnóstico real): la regla normal exige *cero* verbos de
obra, y «PRESTACIÓN DEL SERVICIO DE INTERNET DEDICADO **CON INSTALACIÓN Y CANALIZACIÓN DE REDES**»
traía verbos de sobra. Un bloqueante descarta sin más. La lista es **corta a propósito** y solo
debe crecer con falsos positivos confirmados: se lleva por delante hasta la obra bien escrita que
mencione la palabra. Por eso «fibra óptica» exige contexto de servicio (canal, enlace, ancho de
banda, proveedor) y no descarta el tendido de una red, que sí es obra.

**Objetos genéricos** (ago 2026): «CONVOCATORIA PUBLICA», «CONCURSO DE MERITOS INV-CM-001-2026»,
«INFI CM001-2026» son el número del proceso, no una descripción. Se descartan cuando el objeto
mide menos de 15 caracteres, o cuando —tras quitarle las palabras de trámite (convocatoria,
concurso, licitación, pliego, vigencia…) y los tokens que son códigos— quedan menos de dos
palabras con contenido **y** no hay ningún verbo de obra. «CM-001-2026 CONSTRUCCIÓN DE PLACA
HUELLA» sí dice qué es y pasa.

Los verbos ambiguos van **condicionados a un ancla de infraestructura cercana**, como pide el
propio dominio: «mantenimiento» cuenta como obra en «mantenimiento de la red de alcantarillado»
pero no en «mantenimiento de vehículos»; «instalación/montaje» solo con un sistema constructivo;
«supervisión/diseño/estudios» solo en contexto de ingeniería. Los términos no pertinentes también
tienen sus excepciones: «logística **de obra**», «transporte **de materiales**», «seguridad
**vial**» no descalifican.

El 🟡 es deliberado: en una app de oportunidades, el coste de un falso negativo (no ver un
contrato) es mayor que el de un amarillo que el dueño revisa en cinco segundos.

### Equivalencias funcionales aprendidas del histórico (`lib/equivalencias.js`)

El corpus histórico es un conjunto **etiquetado gratis**: dice qué empresas ganan qué. Si los
mismos contratistas ganan sistemáticamente en la clase A (inscrita en el RUP) y en la clase B (no
inscrita), el mercado las trata como el mismo tipo de trabajo.

```
             P(gana en B | gana en A)     |A ∩ B| / |A|
lift(A,B) = ─────────────────────────  = ───────────────
                    P(gana en B)            |B| / total
```

Se cuenta por **adjudicatario** (NIT), no por proceso: una entidad que saque 40 procesos gemelos
no puede fabricar una equivalencia. Umbrales conservadores, publicados junto al resultado:
`lift ≥ 3`, `soporte(A) ≥ 20` procesos históricos, `|A ∩ B| ≥ 5` adjudicatarios. Solo se guardan
pares con A dentro de la unión de los dos RUP. Un match por esta vía sale con tier `equivalente` y
el mensaje «Clase afín a *72141000* — evidencia histórica de mercado». **Es una ayuda a la
decisión, no una habilitación jurídica**: quien decide si el RUP alcanza es el pliego.

### El objeto como co-señal (`lib/texto_unspsc.js` + `data/vocabulario_unspsc.json`)

Para procesos sin código utilizable (o con el segmento suelto), el objeto confirma: si comparte
**≥ 3 términos distintivos** con una familia que el RUP del perfil sí tiene → tier `texto` con la
familia sugerida; si no, pero el objeto es inequívocamente de obra → tier `texto` genérico.

**La ruta de texto exige pertinencia VERDE** (ago 2026). En el diagnóstico real 1 077 procesos
entraron por aquí y buena parte era ruido: equipos tecnológicos, servicios de salud y objetos
vagos que compartían tres términos genéricos con el vocabulario de una familia (*institución*,
*educativa*, *sede*). Un proceso que **no** tiene código del RUP **y** tampoco dice claramente que
sea obra no es una oportunidad. Con código del RUP sí se conserva el 🟡 (ahí el código es la
evidencia); la ruta de texto no tiene esa red.

Se puede reabrir con `?incluir_sin_unspsc=1` — el toggle **«Incluir procesos sin código UNSPSC»**
de la interfaz, apagado por defecto. Los que vuelven llegan siempre marcados como «Objeto sugiere
obra» + «Verificar objeto», y el toggle **no** reabre nada más: objetos genéricos, bloqueantes y
falsos positivos siguen fuera con él encendido.

`data/vocabulario_unspsc.json` viaja en el repositorio como **semilla curada a mano** —no es el
resultado de un cálculo, y así está escrito en el propio archivo—. Con el histórico ya en Redis,
`GET /api/sync/historico?reconstruir_vocabulario=true` lo deriva de verdad (TF-IDF simplificado
sobre los objetos de los procesos adjudicados) y lo publica. El derivado y la semilla se
**mezclan familia a familia**: manda el derivado donde existe, sigue la semilla donde no —una
derivación flaca no puede dejar sin señal a las demás familias.

Nota de entorno: este repositorio de desarrollo no alcanza `datos.gov.co` (allowlist del proxy),
así que los valores de estado/modalidad no se muestrearon en vivo; de ahí la normalización
defensiva, la clasificación multi-columna y el default conservador. La primera corrida en
producción es la validación real.

## Reglas de negocio (`lib/negocio.js`)

- `anticipo_pct`: campos `porcentaje_de_anticipo`/`anticipo`/… y, en su defecto, detección en el
  texto del objeto («anticipo del 30 %»). **Nota honesta**: `p6dx-8zbt` no trae columna de anticipo,
  así que la mayoría queda en `0` = «sin dato». Por eso `anticipo_min` solo excluye anticipos
  *declarados* por debajo del mínimo — excluir los «sin dato» dejaría la app vacía para siempre.
- `cuantia_rango`: `bajo` < 100 M COP · `medio` 100–500 M · `alto` > 500 M (campo `precio_base`,
  con respaldos `valor_total`/`cuantia_definitiva`).
- `nivel_competencia`: `baja` ≤ 5 ofertas · `media` 6–15 · `alta` > 15
  (`respuestas_al_procedimiento` y equivalentes; sin dato = 0 = baja).
- `ubicacion_valida`: ciudad/departamento de la entidad vs `UBICACION_VALIDA`
  (default `BOGOTÁ D.C.`; admite lista separada por comas, p. ej. `BOGOTÁ D.C.,TOLIMA`).
- `puntaje_ponderado` = `0.4·anticipo + 0.3·cuantía + 0.3·competencia`, donde
  anticipo ≥ 20 % → 100 (proporcional debajo), cuantía bajo/medio/alto → 30/60/100,
  competencia baja/media/alta → 100/60/30. Umbrales como constantes del archivo.
- Extras documentados: `proceso_abierto` (estado no terminal) y `fecha_cierre` (detección
  defensiva: la columna varía por modalidad).

## Filtro RUP y capacidad financiera (`lib/perfiles.js` + `lib/capacidad.js` + `lib/rup.js`)

**Fuente única de verdad**: todos los datos de perfiles viven en `lib/perfiles.js` (RUP corte
31/12/2025, extraídos del `index.html` histórico — no hicieron falta placeholders) y la fórmula K
en `lib/capacidad.js`. La discrepancia histórica web-vs-cron desapareció por construcción: no hay
segunda fórmula ni datos duplicados. Detalle completo en `docs/PERFILES.md`.

| | Helder | Génesis | Consorcio |
| --- | --- | --- | --- |
| Naturaleza | Persona natural | **Persona jurídica (SAS)** | Proponente plural |
| Clases UNSPSC en RUP | 193 | 343 | 393 (unión calculada) |
| Liquidez | 129,12 | 6,98 | 68,05 (ponderada 50/50) |
| Patrimonio | $1.107 M | $211 M | $659,3 M (ponderado 50/50) |
| Utilidad operacional | $198,8 M | $150,2 M | $174,5 M (ponderada 50/50) |
| Mayor contrato (SMMLV) | 6.768,87 | 31.593,88 | 38.362,75 (suma) |
| Profesionales (CT) | 1 | 3 (estimado conservador) | 4 (suma) |
| Tope estratégico | 4.000 SMMLV | 2.000 SMMLV | 11.000 SMMLV |

`rup_valido(licitacion, perfil)` exige **las dos** condiciones:

1. **Objeto** (`lib/filtros.evaluarObjeto`): clase UNSPSC de 8 dígitos en el RUP del perfil (o
   mapeo textual tolerante si no declara UNSPSC), sin blacklist y sin caer en la capa
   anti-suministro.
2. **Capacidad** (`lib/capacidad.js`): `CRPC ≤ CRP` **y** presupuesto ≤ tope estratégico, con
   `CRP = CO × (E + CT + CF)/100 − SCE` (Guía CCE-EICP-GI-22) y
   `CRPC = Presupuesto − Anticipo` (× 12/plazo solo si el plazo supera 12 meses, D. 1082/2015).
   Escalas oficiales, todas con `>=`: E (experiencia/presupuesto) ≥3→120 · ≥2→100 · ≥1→80 ·
   resto 60; CT (profesionales) ≥11→40 · ≥6→30 · ≥1→20; CF (liquidez) ≥1.5→40 · ≥1.2→30 ·
   ≥1.0→20. `SMMLV 2026 = $1.750.905`.

Decisiones documentadas (también advertidas en logs y señaladas en la UI):

- **CO estimado**: el RUP no reporta ingreso operacional → `CO = utilidad × 16,7` (margen obra
  ≈ 6 %). La UI marca «Capacidad K ✓ (CO estimado)».
- **SCE**: saldos de contratos en ejecución (saldo × % participación × meses restantes/plazo,
  tope 12). Helder tiene 2 registrados; Génesis ninguno → 0 con advertencia en logs.
- **Consorcio**: indicadores habilitantes **ponderados por participación 50/50** (asumida: el
  repositorio no fija otra; práctica D. 1082/2015 para proponentes plurales), pero el **K del
  plural es la SUMA de las CRP de los integrantes** (Guía CCE-EICP-GI-22), cada una con sus
  propios indicadores y su propio SCE.
- **NIT**: no consta en el repositorio → `null` a propósito (completar del certificado; jamás
  inventarlo).
- **CT de Génesis**: 3 profesionales («estimado conservador» del histórico) → CT = 20. Si la
  planta real fuera ≥6, CT subiría a 30 — confirmar con el dueño antes de cambiarlo.

### Granularidad UNSPSC

Los **393 códigos de los dos RUP terminan todos en `00`**: están inscritos a nivel de **clase**,
que es como clasifica el RUP; SECOP II publica muchas veces el **producto** concreto de esa clase.
La comparación exacta de 8 dígitos descartaba todo proceso que declarara producto, y el prefijo de
6 dígitos que la sustituyó seguía perdiendo el caso inverso (procesos publicados a nivel de
familia) y leía mal los segmentos sueltos. El motor jerárquico actual cubre las dos direcciones
—ver «Matching UNSPSC jerárquico por niveles» más arriba— y `/api/diagnostico` mide las tres
reglas sobre el corpus real (`pasarian_unspsc_exacto` ⊂ `pasarian_unspsc_prefijo` ⊂
`pasarian_unspsc_jerarquico`).

## `GET /api/diagnostico` (protegido)

El instrumento para responder «¿por qué solo salen N procesos?» con datos. Mismo token que el
backfill, **solo lee** (no escribe, no toma candados, no dispara sincronizaciones):

```
https://<tu-app>.vercel.app/api/diagnostico?token=<TOKEN>&perfil=helder&muestra=20
```

Devuelve, sobre el corpus activo:

- **`embudo`** — bajas de cada paso **en el orden real de la consulta**: `fuera_modalidad`,
  `fuera_estado`, `fuera_convenio`, `fuera_blacklist`, `fuera_unspsc`,
  `fuera_sin_unspsc_ni_obra`, **`fuera_objeto_generico`**, **`fuera_no_pertinente`**,
  **`fuera_texto_debil`**, `fuera_anti_suministro`, `fuera_capacidad_k`,
  `fuera_tope_estrategico`, `fuera_anticipo` y `visibles`. Los pasos suman el
  total: nadie desaparece sin quedar contado (hay una prueba que lo verifica), y `visibles`
  coincide exactamente con el `total` que sirve `/api/oportunidades` (otra prueba).
- **`contrafactuales`** — cuánto aporta cada mecanismo y cuánto se recuperaría al relajar cada
  regla: `pasarian_unspsc_exacto` ⊂ `pasarian_unspsc_prefijo` ⊂ `pasarian_unspsc_jerarquico`,
  **`ganancia_por_jerarquia`**, **`ganancia_por_equivalencias`**, **`ganancia_por_texto`**,
  `visibles_sin_capa_pertinencia`, sin filtro de anticipo, ignorando capacidad, incluyendo
  cerradas.
- **`matching`** — reparto de los visibles por `tier` (clase/familia/equivalente/texto) y por
  nivel de pertinencia (verde/amarillo/rojo, el rojo siempre en 0), más ejemplos concretos de lo
  rescatado, de los falsos positivos bloqueados, de los **objetos genéricos** descartados y de lo
  que devolvería el toggle **«Incluir procesos sin código UNSPSC»** (`texto_debil_ejemplos`).
- **`conocimiento`** — estado de las equivalencias (con sus umbrales, adjudicatarios, pares
  evaluados y descartes) y del vocabulario (si manda la semilla del repositorio o el derivado).
  **`conocimiento.equivalencias_por_que`** traduce ese estado a causas en castellano: un índice en
  cero puede significar que nunca se construyó, que el dataset no trae adjudicatario, que nadie
  ganó en dos clases a la vez o que ningún par alcanza los umbrales — y cada causa lleva su
  siguiente paso. Un `0` solo no distingue ninguna de las cuatro.
- **`distribuciones`** — los valores **reales** de `modalidad_de_contratacion`,
  `estado_del_procedimiento` y `fase` con sus conteos (lo que este repositorio nunca pudo
  muestrear en vivo), qué términos de la blacklist y de la capa de pertinencia dispararon, los
  **códigos UNSPSC ilegibles**, y el reparto de anticipo y cuantía.
- **`unspsc_cobertura`** — clases distintas en el corpus, cuántas cubre el RUP con la regla
  jerárquica vs la exacta, códigos ilegibles y el top de clases **no** cubiertas (candidatas a
  revisar en el RUP).
- **`muestra`** — N procesos visibles con su veredicto graduado (match, pertinencia, cuantía,
  anticipo, K, CRPC).

**Cómo leerlo**: el `fuera_*` más alto es el filtro que hay que revisar primero.

**Prefiltro al sincronizar**: `admisibleParaIngesta()` descarta en origen lo que nadie podría
contratar nunca (convenios, blacklist, códigos de familias que ningún RUP inscribe y sin objeto de
obra). El dataset trae ~40–60 k procesos/mes; guardar solo lo admisible es lo que hace viables el
tier gratuito de Upstash y las consultas en frío. Lo que **ya no** entra al prefiltro: el matching
UNSPSC por perfil, la pertinencia, el anti-suministro y la cuantía — todo eso corre en la
consulta, así que **cambiar esas reglas o cargar un RUP nuevo NO exige una `full`**. Solo lo
exige tocar `admisibleParaIngesta` o la blacklist.

## Claves en Redis

Dos keyspaces con ciclos de vida **opuestos**: el activo se purga, el histórico no.

```
licitaciones:meta                              JSON {last_full, last_sync, total, leidas, porMes, …}
licitaciones:progreso                          JSON cursor reanudable de la carga completa

ACTIVO — lo que sirve la app (año vigente, procesos abiertos). SE PURGA.
licitaciones:activo:mes:{YYYY-MM}:manifest     JSON {base, sig, count}  (sig = próximo índice libre)
licitaciones:activo:mes:{YYYY-MM}:chunk:{i}    base64(zlib.deflate(JSON[registros], nivel 6)) ≤ 500 KB

HISTÓRICO — memoria de largo plazo (cerrados + adjudicación). NUNCA se purga.
licitaciones:historico:mes:{YYYY-MM}:manifest  JSON {base, sig, count}
licitaciones:historico:mes:{YYYY-MM}:chunk:{i} mismo formato de chunk

CONOCIMIENTO DERIVADO DEL HISTÓRICO — se reconstruye sin re-extraer nada; ninguna purga lo toca
indice:competencia                             HASH entidad → {procesos, promedio, mediana, nivel}
                                               (+ alias «nit:{NIT}» → {ref: entidad})
indice:competencia:meta                        JSON {construido, cortes, por_nivel, descartados, …}
indice:competencia:progreso                    JSON comprimido, acumulador reanudable del índice
equivalencias:unspsc                           JSON comprimido {claseB: [{clase:A, lift, …}]}
equivalencias:unspsc:meta                      JSON {construido, pares, umbrales, descartados, …}
equivalencias:unspsc:progreso                  JSON comprimido, acumulador por adjudicatario
vocabulario:unspsc                             JSON comprimido {familias: {FFFF: [términos]}}
vocabulario:unspsc:meta                        JSON {construido, familias, procesos, …}
vocabulario:unspsc:progreso                    JSON comprimido, acumulador de conteos

CONFIGURACIÓN DEL DUEÑO — fuera de `licitaciones:*`: ninguna purga del corpus la toca
config:perfiles                                JSON comprimido {perfiles:{helder,genesis,consorcio}, _meta}
config:perfiles:version                        sello de la última carga (se escribe AL FINAL)
config:unspsc:{perfil}:clases|familias|segmentos|completo   JSON arrays derivados del RUP cargado

CACHÉ DEL PANEL
resumen:{perfil}                               JSON del dashboard, TTL 300 s (la carga de RUP la borra)

BACKFILL
sync:historico:progreso                        JSON cursor reanudable del backfill
sync:historico:meta                            JSON resumen de la última extracción histórica

CANDADOS
lock:sync                                      candado del sync normal,  TTL 300 s
lock:sync:historico                            candado del backfill,     TTL 600 s
```

`licitaciones:mes:*` es el patrón **legado** (anterior a la separación activo/histórico): la
primera full tras desplegar esta versión lo purga, para no pagar Redis por un corpus que ya nadie
lee. Como los chunks activos cambiaron de nombre, la primera visita tras el despliegue encuentra
Redis «vacío», responde `503` y dispara la full sola — el mismo camino de autorreparación del
arranque en frío.

La auditoría de completitud vive en `meta.porMes`: `esperados` (`count(*)` de Socrata por mes) vs
`leidas` (filas recorridas) vs `guardadas` (las que pasaron el prefiltro). La del backfill, en
`sync:historico:meta`.

**Qué borra qué** (la regla que hacía imposible el análisis histórico y ahora está acotada):

| Operación | Activo | Histórico |
| --- | --- | --- |
| Full de higiene mensual | reescribe el año y purga meses fuera de ventana | **no lo toca** |
| Compactación de un mes | reescribe deduplicado y **retira lo ya cerrado** | **no lo toca** |
| Delta | añade y reemplaza por `:updated_at` | **añade** los que cerraron |
| `/api/sync/historico` | no lo toca | reemplaza mes a mes el rango pedido |
| `reconstruir_*` | no lo toca | no lo toca (solo re-lee y republica los derivados) |

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Redis (respaldo: `KV_REST_API_*`) |
| `HISTORICO_TOKEN` | **Llave de `/api/sync/historico`**. Sin ella el endpoint responde 503 (no hay default) |
| `SOCRATA_APP_TOKEN` | Más cuota en datos.gov.co (header `X-App-Token`) |
| `UBICACION_VALIDA` | Ubicación objetivo (default `BOGOTÁ D.C.`; admite lista con comas) |
| `SECOP_BASE_URL`, `SECOP_PAGE`, `SECOP_BACKOFF_MS` | Solo pruebas/ajustes |

`DETECTA_URL` y `DETECTA_CRON_SECRET` ya no se usan (el sync no necesita secreto: es idempotente,
barato en reposo y auto-limitado por el candado).

## Sincronización en producción

1. **Primera visita** (o Redis vacío): `/api/oportunidades` responde 503, dispara la full y la web
   reintenta sola; la full avanza en tandas de 45 s **auto-encadenadas** hasta terminar.
2. **Cron de Vercel** (`vercel.json`): `/api/sync` diario a las 08:30 UTC en modo `auto`.
3. **Cada visita** con datos de más de 5 min dispara un `delta` (segundos, pocas filas).
4. **Full de higiene mensual**: en modo `auto`, una `last_full` con más de 30 días fuerza recarga
   completa. Acota la deriva que el delta no puede reflejar (procesos guardados cuya
   modalidad/objeto mutó a inválido — limitación documentada de `conservarCerradas` — y filas
   guardadas por reglas anteriores a un despliegue). **Solo purga el corpus activo.**
5. **Backfill histórico**: manual y una sola vez (ver arriba). A partir de ahí el delta mantiene el
   histórico al día solo. Si en algún momento se quiere refrescar el índice sin bajar nada:
   `/api/sync/historico?reconstruir_indice=true`.

El traslado activo → histórico de un proceso que cierra ocurre en dos tiempos, a propósito: el
delta escribe **primero** la copia histórica (con adjudicación) y luego la copia de reemplazo en el
activo, que es la que hace que el proceso desaparezca del listado por dedup de `:updated_at`. Si
fallara a mitad, se pierde un reemplazo (el próximo delta lo repite), nunca el dato histórico. La
salida física del activo la consuma la compactación del mes o la siguiente full.

## Panel de administración (`/admin.html`)

Página estática con el mismo gate de clave, para operar el mantenimiento **sin terminal**.

**Sincronización automática**: la carga completa avanza en tandas de ~45 s (cada invocación agota su
presupuesto, guarda el cursor y termina). El servidor intenta re-invocarse solo, pero ese
fire-and-forget muere cuando Password Protection intercepta la llamada que la función se hace a sí
misma. El botón «Iniciar sincronización full automática» encadena las tandas desde el navegador
—donde la cookie de sesión sí pasa el muro— mostrando mes en curso, filas leídas, porcentaje,
número de tandas y una barra de progreso.

| Respuesta de `/api/sync` | Qué hace el panel |
| --- | --- |
| `{done:false}` | espera 3 s y lanza la siguiente tanda |
| `{enCurso:true}` | otra tanda tiene el candado: espera 10 s y reintenta |
| `{done:true}` | se detiene y muestra «Sincronización completada» |
| red caída o 5xx | reintenta 3 veces (5 s, 10 s, 20 s) y solo entonces falla |

**Secuencia de modos** (la parte que puede colgar el encadenado): la primera tanda va con
`modo=full` —que **reinicia** la carga— y **todas las siguientes con `modo=auto`**, que continúa la
full inconclusa desde el cursor. Repetir `modo=full` en cada tanda volvería a empezar por enero
indefinidamente. Hay una prueba que lo verifica contra el handler real: `auto` conserva el sello
`iniciado` de la corrida y `full` lo cambia reiniciando en el primer mes.

«Detener» solo corta el encadenado en el navegador: la tanda que ya está corriendo en el servidor
termina sola y el avance queda guardado en `licitaciones:progreso`, así que reiniciar continúa
donde se quedó. No se pasa `chain=0` a propósito: si la cadena del servidor funciona en ese
despliegue, ayuda — el candado impide que las dos se estorben.

**Token de acceso**: el panel, la carga de RUP y el detalle de competencia usan el mismo
`HISTORICO_TOKEN`, guardado en `sessionStorage` bajo `historico_token` —**la misma clave que la
app**, así que quien ya pidió un detalle de competencia no vuelve a pegarlo— y enviado siempre por
cabecera, nunca en la URL.

**Dashboard de procesos** (`/api/resumen`): cuatro tarjetas (visibles, obra civil, consultoría,
cierran esta semana), barras de distribución por tipo de objeto hechas con `div`s (sin librerías),
top de entidades —cada fila despliega en línea el detalle de competencia de esa entidad, el mismo
`/api/competencia-detalle` que abre el modal de la app—, reparto por departamento y los 10 procesos
más atractivos (cada fila lleva a su ficha en SECOP II). Selector de perfil persistido en
`sessionStorage` (`dashboard_perfil`), botón «Actualizar ahora» que además esquiva la caché del
navegador con `cache_bust`, y refresco automático cada 5 minutos —el mismo TTL de la caché del
endpoint— **solo con la pestaña visible**: refrescar en segundo plano gasta invocaciones para que
nadie lo mire, así que si tocaba mientras estaba oculta, se refresca al volver a ella. La tabla de
departamentos se **oculta entera** si el dataset no trae la columna: una tabla vacía no informa,
confunde.

**Carga de RUP** (`/api/admin/rup`): seleccionar archivo → vista previa con el JSON formateado
(recortada a 200 000 caracteres: pintar 5 MB en un `<pre>` congela la pestaña; se sube el archivo
completo) y un resumen por perfil → «Confirmar carga». El botón se deshabilita durante el envío
(un doble clic cargaría dos veces), los errores de validación se listan con su campo exacto y las
advertencias se muestran **sin bloquear**. «Descargar RUP actual» genera un `rup_YYYY-MM-DD.json`
con el RUP vigente, listo para editar y volver a subir.

**Arranque**: igual que en `app.js`, el arranque automático de la sesión ya validada va **al final
del módulo**. `abrirApp()` levanta el panel y la carga de RUP, cuyas funciones leen constantes
declaradas más abajo; llamarlo desde donde está el gate reventaría en la zona muerta temporal y —al
ir por una promesa rechazada— lo haría en silencio. Hay una prueba que vigila el orden.

## Frontend

`public/index.html` + `public/app.js`: estático, Tailwind por CDN, estilo Apple. Gate con la clave
`231105` (tres intentos → «Acceso denegado»). El gate del cliente es una cortesía: la protección
seria sigue siendo **Vercel Password Protection** (servidor), activable encima sin tocar código.
Selector de perfil, filtros, tarjetas con cuantía COP, % de anticipo, barra de puntaje, ubicación,
estados de carga/vacío/error con reintento, y espera con cuenta regresiva durante la
sincronización inicial.

**Veredicto graduado** en cada tarjeta — nunca un sí/no. Un badge dice con qué **fuerza** el
proceso encaja en el RUP y otro **qué tipo de trabajo** es; el detalle completo (qué clase casó,
con cuál del RUP y por qué) va en el `title` de cada badge:

| Badge de match | Cuándo |
| --- | --- |
| `RUP ✓` | La clase del RUP contiene al código publicado (o son el mismo) |
| `RUP ~ (familia)` | El proceso se publicó a nivel de familia — verificar el pliego |
| `RUP ≈ (clase afín)` | Clase afín según el histórico de adjudicaciones |
| `Objeto sugiere obra` | Sin código utilizable; lo confirma el objeto |

| Badge de pertinencia | Cuándo |
| --- | --- |
| `Obra civil` / `Infraestructura` / `Consultoría` | El objeto es del dominio, con su tipo detectado |
| `Verificar objeto` | El objeto no lo dice explícitamente: mirar el pliego |

Bajo los filtros hay un toggle **«Incluir procesos sin código UNSPSC»**, apagado por defecto: los
procesos rescatados solo por el objeto y sin vocabulario claro de obra son ruido más que
oportunidad, pero quedan a un clic. Cuando está encendido el resumen lo dice.

**La banda de competencia es un botón.** Al pulsarla se abre un modal con los procesos que
sostienen ese promedio: objeto, nº de oferentes, cuantía, modalidad y fecha, ordenados de menos a
más competencia. Debajo, los **excluidos del promedio** con el motivo de cada uno — incluido el
caso que más confundía: por qué una entidad aparece en ⚪. Se cierra con el botón, con `ESC` o
haciendo clic fuera.

El detalle sale de un endpoint protegido, así que la primera vez el modal muestra un campo y el
botón **«Guardar y ver detalle»**: se pega el token, se guarda en `sessionStorage` bajo
`historico_token` (solo esa pestaña) y la consulta sale sola. Las siguientes veces va directo a los
datos. **Viaja por cabecera, nunca en la URL**: una URL con el token quedaría en el historial del
navegador y en los logs de acceso. Si el servidor responde `401`, el modal dice **«Token inválido»**,
borra el guardado y deja escribir otro.

Regla de la interfaz: **ninguna pulsación se queda sin respuesta visible**. Pulsar con el campo
vacío avisa en vez de no hacer nada, el envío está cableado al `submit` del formulario *y* al clic
del botón, y leer/escribir `sessionStorage` va protegido (en modo restringido lanzaría, y el clic
moriría en silencio). Hay una casilla «Mostrar el token» para verificar que el pegado entró.

El resumen de resultados añade el reparto («*N* con RUP ✓, *M* por verificar»), y sigue el badge
de **Capacidad K ✓**.

Cada tarjeta muestra, bajo el nombre de la entidad, su **banda de competencia histórica**:

- 🟢 `Poca competencia — promedio 3 oferentes en 12 procesos`
- 🟡 `Competencia media — promedio 8 oferentes en 25 procesos`
- 🔴 `Alta competencia — promedio 18 oferentes en 40 procesos`
- ⚪ `Sin datos históricos de esta entidad` (o «sin datos suficientes» si tiene menos de 5)

El selector de orden ofrece **Más atractivas** (default) · Mayor puntaje · Mayor cuantía · Mayor
anticipo, y hay un filtro por competencia de la entidad. Sin índice construido todo cae en
«sin datos» y la app se comporta exactamente como antes.

## Pruebas

```
node tests/e2e.js        # 4 iteraciones completas (requisito del encargo)
```

Este entorno de desarrollo no tiene salida a `datos.gov.co` ni CLI de Vercel autenticada, así que
el ciclo corre contra **mocks HTTP locales** de Socrata (SoQL con keyset, fallos 429/500
inyectados, latencia simulada) y del REST de Upstash (SET NX EX, SCAN, TTL), ejercitando los
handlers reales de `/api`. Cada iteración: limpia Redis → 503 en frío → candado ocupado → full
reanudable en varias invocaciones → consulta Helder (campos + RUP verificado) → consulta Génesis
filtrada y ordenada → consorcio → **backfill histórico protegido + índice de competencia** →
**orden por atractividad** → delta con reemplazo de estado **y traslado al histórico** → HTML/JS
del frontend. En producción, la validación equivale a desplegar y abrir la web (la primera carga se
autoalimenta).

Lo que cubre específicamente la parte de **matching UNSPSC y pertinencia**:

- **Normalización de códigos**: 11 formas reales del campo (`V1.72141000`, `v1_…`, varios códigos,
  familia y segmento sueltos) y los que **no** son UNSPSC (`1234567890`, `123`, `00000000`), que
  se descartan y se cuentan.
- **Jerarquía**: `72141015` → `clase`, `72140000` → `familia`, `72000000` → sin match (pero
  anotado como segmento afín), `80111500` → sin match. Y que el consorcio use la **unión**.
- **Pertinencia**: los cinco falsos positivos de producción (impresión/fotocopia, alimentos,
  internet, cumpleaños, apoyo logístico) caen con su término identificado, mientras
  «CONSTRUCCIÓN DE AULA ESCOLAR» y «INTERVENTORÍA TÉCNICA DE OBRA» —el mismo código UNSPSC—
  pasan. Más los condicionales: «mantenimiento de la red de alcantarillado» sí, «mantenimiento de
  vehículos» no.
- **Equivalencias**: el lift se calcula sobre adjudicatarios, los tres umbrales muerden por
  separado, y una afinidad hacia una clase que el perfil no tiene no sirve de nada.
- **Texto como co-señal**: umbral de 3 términos, familias ajenas al perfil descartadas, TF-IDF que
  tira los términos presentes en todas las familias, y la mezcla derivado + semilla.
- **Ingesta vs juicio**: un proceso dudoso **se guarda** en Redis y **no se sirve**; el prefiltro
  de ingesta no recibe perfil (si lo recibiera, cargar un RUP nuevo exigiría re-sincronizar).
- **Términos bloqueantes**: el internet cae aunque el objeto hable de instalar y canalizar redes,
  y el tendido de fibra en una vía sigue pasando (el bloqueante de fibra exige contexto de
  servicio).
- **Objetos genéricos**: «CONVOCATORIA PUBLICA», «CONCURSO DE MERITOS INV-CM-001-2026» e «INFI
  CM001-2026» caen; los mismos códigos internos **con** descripción del trabajo pasan.
- **Ruta de texto**: un tier `texto` en 🟡 está fuera por defecto y vuelve con
  `?incluir_sin_unspsc=1` (marcado como «verificar»), mientras la obra sin código —pertinencia
  verde— nunca se pierde. El toggle solo añade: no reabre genéricos ni bloqueantes.
- **Equivalencias en cero**: las cuatro causas posibles se distinguen entre sí y cada una trae su
  siguiente paso.
- **Extremo a extremo**: los falsos positivos no llegan a la pantalla aunque estén en Redis; la
  obra publicada por familia, por segmento y con código ilegible sí; y la clase afín pasa de
  invisible a visible en cuanto se aprenden las equivalencias, **sin volver a sincronizar**.
- **Presupuesto de tiempo**: ingesta < 1 ms por proceso y juicio fino < 500 ms sobre 2 600
  procesos, medidos en cada corrida.

Lo que cubre específicamente la parte de competencia histórica:

- `/api/sync/historico` sin token, con token equivocado y sin `HISTORICO_TOKEN` definida → 401/401/503,
  y una petición rechazada no escribe nada.
- Extracción de 24 meses con presupuesto de 200 ms: converge en varias invocaciones reanudables,
  libera su candado y no toca el del sync normal.
- Índice sobre 4 entidades mock (5, 8, 12 y 3 procesos con 3, 8, 18 y 1,3 oferentes de promedio):
  tertiles `baja`/`media`/`alta`, la de 3 procesos en `sin_dato`, alias por NIT y reconstrucción
  idempotente (`reconstruir_indice=true` no re-extrae ni duplica).
- Equivalencias y vocabulario construidos automáticamente al terminar el backfill, con
  reconstrucción selectiva (`reconstruir_equivalencias` / `reconstruir_vocabulario` no re-extraen
  ni se pisan entre sí) y umbrales publicados junto al resultado.
- Orden por atractividad: los cuatro grupos en orden, desempate por puntaje dentro del grupo, y que
  sea el **default** del endpoint.
- Aislamiento de los dos corpus: la full no escribe en el histórico, el activo nunca guarda datos de
  adjudicación, `/api/oportunidades` no sirve procesos históricos ni expone adjudicatarios, y una
  full de higiene deja el histórico intacto.

Lo que cubre específicamente el **dashboard** (`/api/resumen`):

- La invariante que lo sostiene todo: `totales.visibles` es **exactamente** el `total` de
  `/api/oportunidades` y el `embudo.visibles` de `/api/diagnostico`, para `helder` y para el
  consorcio vía alias.
- Los nueve repartos suman los visibles, y `descartes + visibles` suma el corpus activo entero:
  nadie desaparece sin quedar contado.
- `superan_k + no_superan_k + fuera_tope_estrategico = base_capacidad`, y el dataset de prueba
  (procesos de 9 000 M) garantiza que el contador de caídos por capacidad no sea siempre 0.
- Caché: primera llamada `X-Cache: MISS` y `cache:false`, segunda `HIT` y `cache:true` con los
  mismos números; `Cache-Control: no-store` en las dos.
- `401` sin token, `400` con perfil inventado (devolviendo `valores_validos`), y corpus vacío →
  `200` con `visibles:0` y el mensaje de qué ejecutar.
- Ningún destacado con cuantía 0 ni pertinencia «Verificar objeto», objetos recortados a 100
  caracteres y **cero campos de adjudicación** en la respuesta.

Lo que cubre específicamente la **carga de RUP** (`/api/admin/rup`):

- `GET` sin carga previa devuelve los valores del repositorio, y esa salida **pasa el validador del
  `POST`**: el ciclo descargar → editar → subir está cerrado por prueba, no por confianza.
- 11 casos de validación, cada uno comprobando que el error apunta al **campo exacto**: `unspsc`
  que no es arreglo, código de 7 dígitos, códigos duplicados, liquidez 0, endeudamiento escrito
  como porcentaje (13 en vez de 0,13), tipo desconocido, plural declarado como persona natural,
  NIT mal formado, sin perfiles, sin indicadores y sin profesionales. Más un body que no es JSON.
- Un `POST` rechazado **no pisa** la configuración anterior.
- Integración: tras cargar, `getPerfil`/`getUnspsc` devuelven lo cargado, el matching casa por
  `clase` con un código que antes no existía en el RUP, 11 profesionales suben el factor CT de 20 a
  40 y con él la K que **sirve la app**, el consorcio re-deriva la unión y sigue atado a sus
  integrantes, y la caché del panel queda invalidada.
- Borrar `config:*` devuelve la app al respaldo del repositorio con los números originales: nadie
  se queda sin perfiles porque una clave desaparezca.

## Despliegue

Listo para Vercel sin configuración extra: repositorio → proyecto Vercel (framework «Other»),
variables de entorno de arriba, y desplegar. Sin build, sin dependencias. Opcional: activar
Password Protection en el dashboard **antes** de compartir la URL.

Tras desplegar esta versión, en este orden:

0. **Relanzar `/api/sync?modo=full`** una vez. Esta versión **ensancha el prefiltro de ingesta**,
   así que hay procesos que las reglas anteriores nunca dejaron entrar a Redis y que solo aparecen
   tras una recarga completa. Es la **última vez** que hará falta por un cambio de matching:
   de aquí en adelante afinar el matching, la pertinencia o cargar un RUP nuevo tiene efecto
   inmediato (todo eso corre al servir la consulta). El panel `/admin.html` la encadena desde el
   navegador si no hay terminal.
1. Abrir la web. Los falsos positivos (impresión, alimentos, internet, eventos) desaparecen de
   inmediato, sin esperar a la full: la consulta re-filtra al servir.
2. Definir `HISTORICO_TOKEN` y lanzar el backfill histórico una vez (ver «Cómo ejecutar la
   extracción histórica inicial»). Al terminar construye los tres derivados. Hasta entonces la app
   funciona igual, con todas las entidades en ⚪ «sin datos históricos», sin equivalencias y con la
   semilla de vocabulario del repositorio.
3. Si el histórico **ya estaba** bajado de una versión anterior, basta
   `GET /api/sync/historico?reconstruir_todo=true&token=<TOKEN>`: destila los tres derivados sin
   volver a bajar un solo proceso.
4. Medir con `GET /api/diagnostico?token=<TOKEN>&perfil=helder`: `fuera_no_pertinente` debe ser
   mayor que 0 (son los falsos positivos que salieron de la pantalla) y
   `matching.visibles_por_pertinencia.rojo` siempre 0.
