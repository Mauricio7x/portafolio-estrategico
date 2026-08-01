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
| `lib/indice_competencia.js` | Índice **entidad → oferentes promedio** sobre el histórico; tertiles baja/media/alta |
| `lib/equivalencias.js` | **Clases UNSPSC afines** aprendidas del histórico (lift sobre adjudicatarios) |
| `lib/texto_unspsc.js` | El **objeto como co-señal**: vocabulario distintivo por familia (TF-IDF) + derivación |
| `lib/proyeccion.js` | Proyección de columnas y cascada de filtros; dos variantes: activa (sin adjudicación) e histórica |
| `lib/perfiles.js` | **Fuente única** de los tres perfiles: naturaleza, financieros, CT, SCE, ponderación 50/50 del consorcio |
| `lib/capacidad.js` | **Fórmula única** del K de contratación (CRP/CRPC, Guía CCE-EICP-GI-22) |
| `lib/filtros.js` | Las **reglas**: estados canónicos (desconocido = cerrado), modalidades, convenios, prefiltro de ingesta, cascada de juicio, **pertinencia** y anti-suministro |
| `lib/rup.js` | Orquestador: `rup_valido()`, `evaluarRup()` (veredicto graduado + capacidad) |
| `lib/unspsc.js` | Whitelists de los RUP (193 · 343 · 393 unión calculada) + **motor de matching jerárquico por niveles** |
| `lib/redis.js` | Cliente REST mínimo de Upstash (GET/SET NX EX/DEL/MGET/SCAN) |
| `lib/socrata.js` | SoQL, paginación keyset por `:id`, reintentos con backoff, calendario Colombia |
| `lib/negocio.js` | `enriquecer()`: anticipo, cuantía, competencia, ubicación, puntaje |
| `lib/semantica.js` | Los **vocabularios**: `norm`, blacklist de objetos ajenos, whitelist de obra (heredadas), verbos de obra y términos no pertinentes |
| `data/vocabulario_unspsc.json` | Semilla curada de términos distintivos por familia UNSPSC (respaldo del derivado) |
| `lib/almacen.js` | Esquema de claves Redis + compresión/particionado de chunks |
| `docs/PERFILES.md` | Resumen técnico de los tres perfiles (datos, estimaciones, limitaciones) |
| `public/` | Frontend estático (Tailwind CDN, estilo Apple, gate de clave) |
| `public/admin.html` + `admin.js` | Panel de administración: encadena la sincronización full desde el navegador, sin terminal |
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

### `GET /api/oportunidades`

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `perfil` | requerido | `helder` · `genesis` · `juntos` (alias aceptado: `consorcio`) |
| `anticipo_min` | 20 | Excluye anticipos **declarados** menores; `0` = sin dato **pasa** (ver nota) |
| `cuantia_rango` | — | `bajo` · `medio` · `alto` |
| `nivel_competencia` | — | Ofertas **del proceso**: `baja` · `media` · `alta` |
| `competencia_entidad` | — | Histórico **de la entidad**: `baja` · `media` · `alta` · `sin_dato` |
| `ubicacion_valida` | — | `true` · `false` |
| `match` | — | Solidez del match UNSPSC: `clase` · `familia` · `equivalente` · `texto` |
| `incluir_cerradas` | — | `1` para incluir procesos en estado terminal |
| `ordenar_por` | **`atractividad`** | `atractividad` · `anticipo` · `cuantia` · `competencia` · `puntaje` |
| `orden` | `desc` | `asc` · `desc` |
| `pagina` / `por_pagina` | 1 / 20 | `por_pagina` máx 100 |

Respuesta: `{ ok, total, resultados, pagina, por_pagina, perfil, sincronizado, ordenado_por,
por_match, indice_competencia, conocimiento }`. `por_match` reparte el total por solidez del
match (cuántas son «RUP ✓» y cuántas hay que verificar). Cada resultado trae los campos de
negocio, `rup` con el **veredicto graduado** —`tier`, `unspsc {codigo_proceso, codigo_rup,
mensaje}`, `pertinencia {nivel, etiqueta, motivo}`, `capacidad_ok`, `k_cop`, `crpc_cop`— y:

```json
"competencia_entidad": { "nivel": "baja", "promedio_oferentes": 3, "mediana_oferentes": 3, "total_procesos": 12 }
```

Del corpus histórico solo sale ese **resumen agregado**. Los datos de adjudicación (adjudicatario,
NIT, valor adjudicado) no se exponen aquí; de hecho ni siquiera se guardan en el corpus activo.

**Arranque en frío**: si Redis no tiene chunks, responde `503` con
`"Datos no disponibles. Sincronización iniciada. Intente en unos minutos."` y dispara
`/api/sync?modo=auto` en segundo plano; el frontend reintenta solo cada 20 s. Así se eliminó de
raíz el viejo «Sin conexión a SECOP II»: antes la carga inicial exigía un secreto que nadie podía
aportar desde el navegador y la web caía a una cascada de proxies CORS muertos.

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
8. **Pertinencia del objeto** — la capa nueva (ver abajo). No pertinente → `fuera_no_pertinente`.
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
| Hay verbo de obra (construcción, pavimentación, acueducto, interventoría…) | 🟢 pertinente |
| Hay término no pertinente (alimentos, evento, impresión, internet, vigilancia, software, seguros, dotación…) **y cero** verbos de obra | 🔴 **no pertinente** → fuera |
| Sin verbo de obra pero con match `clase` en un segmento de obra/ingeniería pura (72, 77, 81, 95) | 🟢 pertinente: el código es sólido |
| Resto (objeto corto o genérico) | 🟡 **pertinente con advertencia** — «verificar objeto» |

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
  `fuera_sin_unspsc_ni_obra`, **`fuera_no_pertinente`**, `fuera_anti_suministro`,
  `fuera_capacidad_k`, `fuera_tope_estrategico`, `fuera_anticipo` y `visibles`. Los pasos suman el
  total: nadie desaparece sin quedar contado (hay una prueba que lo verifica), y `visibles`
  coincide exactamente con el `total` que sirve `/api/oportunidades` (otra prueba).
- **`contrafactuales`** — cuánto aporta cada mecanismo y cuánto se recuperaría al relajar cada
  regla: `pasarian_unspsc_exacto` ⊂ `pasarian_unspsc_prefijo` ⊂ `pasarian_unspsc_jerarquico`,
  **`ganancia_por_jerarquia`**, **`ganancia_por_equivalencias`**, **`ganancia_por_texto`**,
  `visibles_sin_capa_pertinencia`, sin filtro de anticipo, ignorando capacidad, incluyendo
  cerradas.
- **`matching`** — reparto de los visibles por `tier` (clase/familia/equivalente/texto) y por
  nivel de pertinencia (verde/amarillo/rojo, el rojo siempre en 0), más ejemplos concretos de lo
  rescatado y de los falsos positivos bloqueados.
- **`conocimiento`** — estado de las equivalencias (con sus umbrales) y del vocabulario (si manda
  la semilla del repositorio o el derivado del histórico).
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
