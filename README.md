# Detecta · Oportunidades de licitación SECOP II

Aplicación privada para decidir **a qué licitaciones de obra civil presentarse** en Colombia.
Extrae en vivo el dataset abierto de SECOP II (`p6dx-8zbt`, Colombia Compra Eficiente), enriquece
cada proceso con reglas de negocio, lo filtra contra los **RUP y la capacidad financiera reales**
de los dos perfiles (Helder y Génesis GIC SAS) y muestra solo las oportunidades viables.

> El puntaje prioriza dónde mirar primero. **No** es la probabilidad de ganar ni reemplaza leer el pliego.

## Arquitectura

```
┌────────────┐   full/delta    ┌───────────────┐   chunks zlib   ┌──────────────┐
│  Socrata   │ ───────────────▶│   /api/sync    │ ───────────────▶│ Upstash Redis │
│ p6dx-8zbt  │  keyset por :id │ (enriquece +   │  por mes ≤500KB │  (REST, free) │
└────────────┘                 │ prefiltro RUP) │                 └──────┬───────┘
                               └───────────────┘                        │ SCAN+MGET
                                                                        ▼
                     ┌──────────────┐   filtros + RUP + orden   ┌────────────────────┐
                     │ public/ (SPA │ ◀─────────────────────────│ /api/oportunidades │
                     │ Tailwind CDN)│        JSON paginado      └────────────────────┘
                     └──────────────┘
```

- **Vercel serverless** (Node 18+, CommonJS, funciones planas en `/api`). Sin framework, sin
  `package.json`, sin build: `public/` se sirve estático en la raíz y `/api/*.js` son funciones.
- **Upstash Redis** vía API REST con `fetch` nativo (`lib/redis.js`) — sin SDK.
- **Cero dependencias**: `fetch`, `zlib` (deflate nivel 6) y la API REST de Upstash.

| Archivo | Qué hace |
| --- | --- |
| `api/sync.js` | Sincronización full/delta/auto, reanudable, con candado TTL y auto-reinvocación |
| `api/oportunidades.js` | Consulta: filtros de negocio + RUP, orden, paginación, memoria caliente |
| `lib/redis.js` | Cliente REST mínimo de Upstash (GET/SET NX EX/DEL/MGET/SCAN) |
| `lib/socrata.js` | SoQL, paginación keyset por `:id`, reintentos con backoff, calendario Colombia |
| `lib/negocio.js` | `enriquecer()`: anticipo, cuantía, competencia, ubicación, puntaje |
| `lib/rup.js` | Perfiles reales, K de contratación (Guía CCE), `rup_valido()`, prefiltro |
| `lib/unspsc.js` | Whitelists UNSPSC reales de los RUP (193 Helder · 343 Génesis), generadas |
| `lib/semantica.js` | Blacklist de objetos ajenos + whitelist de vocabulario de obra (heredadas) |
| `lib/almacen.js` | Esquema de claves Redis + compresión/particionado de chunks |
| `public/` | Frontend estático (Tailwind CDN, estilo Apple, gate de clave) |
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
- Cada licitación se **enriquece antes de guardarse** (nunca entra sin campos de negocio) y pasa el
  **prefiltro de compatibilidad RUP** (ver abajo).
- Cambios de estado (Publicado → Adjudicado) entran por el delta y **reemplazan** el registro:
  la lectura deduplica por `_k` quedándose con el `:updated_at` más reciente.

### `GET /api/oportunidades`

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `perfil` | requerido | `helder` · `genesis` · `juntos` (consorcio) |
| `anticipo_min` | 20 | Excluye anticipos **declarados** menores; `0` = sin dato **pasa** (ver nota) |
| `cuantia_rango` | — | `bajo` · `medio` · `alto` |
| `nivel_competencia` | — | `baja` · `media` · `alta` |
| `ubicacion_valida` | — | `true` · `false` |
| `incluir_cerradas` | — | `1` para incluir procesos en estado terminal |
| `ordenar_por` | `puntaje` | `anticipo` · `cuantia` · `competencia` · `puntaje` |
| `orden` | `desc` | `asc` · `desc` |
| `pagina` / `por_pagina` | 1 / 20 | `por_pagina` máx 100 |

Respuesta: `{ ok, total, resultados, pagina, por_pagina, perfil, sincronizado }`. Cada resultado
trae los campos de negocio y `rup` (detalle UNSPSC/K del perfil consultado).

**Arranque en frío**: si Redis no tiene chunks, responde `503` con
`"Datos no disponibles. Sincronización iniciada. Intente en unos minutos."` y dispara
`/api/sync?modo=auto` en segundo plano; el frontend reintenta solo cada 20 s. Así se eliminó de
raíz el viejo «Sin conexión a SECOP II»: antes la carga inicial exigía un secreto que nadie podía
aportar desde el navegador y la web caía a una cascada de proxies CORS muertos.

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

## Filtro RUP y capacidad financiera (`lib/rup.js`)

Datos **reales** encontrados en el repositorio (embebidos en el `index.html` histórico, RUP con
corte 31/12/2025) — no hicieron falta placeholders:

| | Helder | Génesis | Consorcio |
| --- | --- | --- | --- |
| Clases UNSPSC en RUP | 193 | 343 | 393 (unión) |
| Liquidez | 129,12 | 6,98 | 6,98 |
| Patrimonio | $1.107 M | $211 M | $1.319 M |
| Utilidad operacional | $198,8 M | $150,2 M | $349,1 M |
| Mayor contrato (SMMLV) | 6.768,87 | 31.593,88 | 38.362,75 |
| Tope estratégico | 4.000 SMMLV | 2.000 SMMLV | 11.000 SMMLV |

`rup_valido(licitacion, perfil)` exige **las dos** condiciones:

1. **UNSPSC**: alguna clase de 8 dígitos del proceso está en el RUP del perfil. Si el proceso no
   declara UNSPSC, mapeo textual tolerante (`WHITELIST_OBRA` sobre nombre + descripción). La
   `BLACKLIST_OBJETO` (caninos, PAE, dotación, seguros, software…) excluye siempre.
2. **Capacidad**: `CRPC ≤ CRP` **y** presupuesto ≤ tope estratégico, con
   `CRP = CO × (E + CT + CF)/100 − SCE` (Guía CCE-EICP-GI-22) y
   `CRPC = (Presupuesto − Anticipo) × 12/plazo` si el plazo supera 12 meses (D. 1082/2015).
   `CO` se estima como utilidad operacional × 16,7 (margen obra ≈ 6 %) porque el RUP no reporta
   el ingreso. `SMMLV 2026 = $1.750.905`.

**Prefiltro al sincronizar**: `compatibleConAlgunPerfil()` descarta en origen lo que ningún perfil
podría contratar (blacklist, UNSPSC fuera de la unión de ambos RUP y sin vocabulario de obra).
El dataset trae ~40–60 k procesos/mes; guardar solo lo compatible reduce el corpus ~95 %, que es
lo que hace viables el tier gratuito de Upstash y las consultas en frío. La cuantía **no** entra al
prefiltro (es dinámica por perfil). Si un RUP cambia (`lib/unspsc.js`), relanzar `/api/sync?modo=full`.

## Claves en Redis

```
licitaciones:meta                    JSON {last_full, last_sync, total, leidas, porMes, …}
licitaciones:progreso                JSON cursor reanudable de la carga completa
licitaciones:mes:{YYYY-MM}:manifest  JSON {base, sig, count}  (sig = próximo índice libre)
licitaciones:mes:{YYYY-MM}:chunk:{i} base64(zlib.deflate(JSON[registros], nivel 6)) ≤ 500 KB
lock:sync                            candado, TTL 300 s
```

La auditoría de completitud vive en `meta.porMes`: `esperados` (`count(*)` de Socrata por mes) vs
`leidas` (filas recorridas) vs `guardadas` (las que pasaron el prefiltro).

## Variables de entorno

| Variable | Uso |
| --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | Redis (respaldo: `KV_REST_API_*`) |
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

## Frontend

`public/index.html` + `public/app.js`: estático, Tailwind por CDN, estilo Apple. Gate con la clave
`231105` (tres intentos → «Acceso denegado»). El gate del cliente es una cortesía: la protección
seria sigue siendo **Vercel Password Protection** (servidor), activable encima sin tocar código.
Selector de perfil, filtros, tarjetas con cuantía COP, % de anticipo, barra de puntaje, ubicación y
badges RUP ✓ / Capacidad K ✓, estados de carga/vacío/error con reintento, y espera con cuenta
regresiva durante la sincronización inicial.

## Pruebas

```
node tests/e2e.js        # 4 iteraciones completas (requisito del encargo)
```

Este entorno de desarrollo no tiene salida a `datos.gov.co` ni CLI de Vercel autenticada, así que
el ciclo corre contra **mocks HTTP locales** de Socrata (SoQL con keyset, fallos 429/500
inyectados, latencia simulada) y del REST de Upstash (SET NX EX, SCAN, TTL), ejercitando los
handlers reales de `/api`. Cada iteración: limpia Redis → 503 en frío → candado ocupado → full
reanudable en varias invocaciones → consulta Helder (campos + RUP verificado) → consulta Génesis
filtrada y ordenada → delta con reemplazo de estado → HTML/JS del frontend. En producción, la
validación equivale a desplegar y abrir la web (la primera carga se autoalimenta).

## Despliegue

Listo para Vercel sin configuración extra: repositorio → proyecto Vercel (framework «Other»),
variables de entorno de arriba, y desplegar. Sin build, sin dependencias. Opcional: activar
Password Protection en el dashboard **antes** de compartir la URL.
