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
| `api/oportunidades.js` | Consulta: cascada de filtros + RUP, orden, paginación, memoria caliente |
| `lib/perfiles.js` | **Fuente única** de los tres perfiles: naturaleza, financieros, CT, SCE, ponderación 50/50 del consorcio |
| `lib/capacidad.js` | **Fórmula única** del K de contratación (CRP/CRPC, Guía CCE-EICP-GI-22) |
| `lib/filtros.js` | Estados canónicos (desconocido = cerrado), modalidades competitivas, objeto válido + capa anti-suministro |
| `lib/rup.js` | Orquestador: `rup_valido()`, `evaluarRup()`, prefiltro de compatibilidad |
| `lib/unspsc.js` | Whitelists UNSPSC reales de los RUP (193 Helder · 343 Génesis · 393 unión calculada) |
| `lib/redis.js` | Cliente REST mínimo de Upstash (GET/SET NX EX/DEL/MGET/SCAN) |
| `lib/socrata.js` | SoQL, paginación keyset por `:id`, reintentos con backoff, calendario Colombia |
| `lib/negocio.js` | `enriquecer()`: anticipo, cuantía, competencia, ubicación, puntaje |
| `lib/semantica.js` | Blacklist de objetos ajenos + whitelist de vocabulario de obra (heredadas) |
| `lib/almacen.js` | Esquema de claves Redis + compresión/particionado de chunks |
| `docs/PERFILES.md` | Resumen técnico de los tres perfiles (datos, estimaciones, limitaciones) |
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
- Cada licitación se **enriquece antes de guardarse** (nunca entra sin campos de negocio) y pasa la
  **cascada de filtros** (ver abajo): modalidad competitiva → estado abierto → objeto válido.
- Cambios de estado (Publicado → Adjudicado) entran por el delta y **reemplazan** el registro:
  la lectura deduplica por `_k` quedándose con el `:updated_at` más reciente. Por eso el **delta
  conserva los cerrados** (si los descartara, la versión abierta quedaría congelada en el listado);
  la full sí los excluye de origen y la consulta nunca los sirve por defecto.

### `GET /api/oportunidades`

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `perfil` | requerido | `helder` · `genesis` · `juntos` (alias aceptado: `consorcio`) |
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

## Cascada de filtros (`lib/filtros.js`)

La app muestra **exclusivamente** procesos a los que alguno de los perfiles pueda presentarse:
abiertos a ofertas, en modalidad competitiva y con objeto de su especialidad. La cascada corre en
la **sincronización** (antes de guardar: lo descartado ni siquiera ocupa Redis) y **de nuevo en la
consulta** (defensa en profundidad: corpus previo al despliegue + cerrados que el delta conserva).

1. **Modalidad competitiva** — lista blanca: Licitación Pública, Selección Abreviada (incl.
   subasta), Concurso de Méritos, Mínima Cuantía, Acuerdo Marco. Excluidas: **Contratación
   Directa** (incluida su variante «(con ofertas)»: sigue siendo directa — ahí viven las OPS),
   **Licitación Privada** y las solicitudes de información (RFI). **Régimen Especial** se excluye
   salvo la variante «(con ofertas)», donde sí hay convocatoria. Modalidad vacía o desconocida →
   fuera.
2. **Estado abierto** — listas canónicas normalizadas (acentos/mayúsculas) sobre
   `estado_del_procedimiento` y `fase`, más la señal dura `adjudicado="Si"`. Abiertos:
   Presentación de oferta, Convocado, Publicado, Abierto, Recepción de manifestaciones,
   Presentación de observaciones, Borrador de pliegos, Adenda, Modificado. Cerrados: En
   evaluación, Adjudicado, Celebrado, En ejecución, Terminado, Cancelado, Suspendido, Desierto,
   Descartado, Liquidado… **Cualquier valor no clasificable se considera CERRADO** — el «+5 para
   fases desconocidas» de la era anterior no existe en esta base de código.
3. **Objeto válido** — blacklist semántica (caninos, PAE, dotación, seguros, software…), clase
   UNSPSC en el RUP del perfil (o mapeo textual de obra si no declara UNSPSC) y la **capa
   anti-suministro**: si TODAS las clases declaradas son de segmentos de bienes (30 materiales,
   39 eléctricos, 43 TI, 48 equipos, 56 mobiliario) y el objeto se redacta como compra
   («suministro/adquisición/compra/dotación/entrega de…») sin ningún verbo de obra
   (construcción, instalación, montaje, mantenimiento, adecuación…), es una compra de bienes
   disfrazada y se descarta. Un solo código de segmento de obra (72, 77, 81, 95…) ancla el
   proceso y desactiva la capa.

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

**Prefiltro al sincronizar**: la cascada (modalidad + estado + `compatibleConAlgunPerfil()`,
que evalúa el objeto contra la unión de ambos RUP con anti-suministro incluido) descarta en
origen lo que nadie podría contratar. El dataset trae ~40–60 k procesos/mes; guardar solo lo
viable reduce el corpus >95 %, que es lo que hace viables el tier gratuito de Upstash y las
consultas en frío. La cuantía **no** entra al prefiltro (es dinámica por perfil). Si un RUP
cambia (`lib/unspsc.js`) o cambian los filtros, relanzar `/api/sync?modo=full` — también **tras
desplegar esta versión**, para purgar del corpus lo guardado con las reglas anteriores.

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
