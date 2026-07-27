# Capa de datos SECOP — extracción exhaustiva, caché y delta

Módulo que garantiza la captura **completa y verificable** de los procesos de
SECOP II (dataset Socrata `p6dx-8zbt`) del año vigente, y los sirve a la app
desde una caché en Vercel KV. Socrata queda solo para sincronizaciones; el
radar consume la caché.

## Piezas

| Archivo | Qué hace |
|---|---|
| `lib/extractor.js` | Núcleo: carga completa reanudable, delta, auditoría count(1), empaquetado gzip. |
| `lib/almacen.js` | Adaptadores de persistencia: Vercel KV (REST), archivo local, memoria. |
| `api/sync.js` | Endpoint de sincronización (`?modo=full\|delta\|auto`), con candado anti-concurrencia. |
| `api/procesos.js` | Sirve el radar desde la caché con la **misma forma de campos** que Socrata. |
| `scripts/respaldo-csv.js` | Emergencias: extracción a archivo local, export CSV masivo, subida a KV. |
| `.github/workflows/sincronizacion.yml` | Cron horario opcional (Vercel Hobby solo permite crons diarios). |
| `tests/validar-extractor.js` | Suite con mock de Socrata + mock de KV (este entorno no tiene red a datos.gov.co). |

## Decisiones de diseño (léelas antes de tocar nada)

1. **Rango = publicación con solape, no "publicado O cierra".** La fecha de
   cierre vive en columnas distintas según la modalidad (ver
   `CIERRE_CANDIDATOS`); un `$where` con OR sobre columnas que pueden no
   existir revienta la consulta. En su lugar se baja TODO lo publicado desde
   `1-ene − 120 días`: cualquier proceso que cierre este año fue publicado en
   esa ventana. **Aquí no se filtra nada más** (ni modalidad, ni cuantía, ni
   estado): los filtros de negocio son del cliente, sobre la caché.
2. **Paginación keyset por `:id`** (`$order=:id` + `:id > 'último'`): estable
   aunque el dataset cambie durante la corrida. El `$order` por fecha DESC con
   `$offset` del código viejo podía saltarse filas cuando entraban registros
   nuevos entre páginas. Si el backend rechaza `:id`, la sonda degrada a
   `$offset` con orden `fecha ASC, id ASC` y lo deja anotado en el progreso.
3. **Reanudable por diseño**: el cursor (mes, último `:id`, chunk) se persiste
   tras **cada página**. Una función serverless (60 s máx) avanza lo que puede
   y responde `done:false`; la siguiente invocación (cron, Action, o el botón
   de la app) continúa. Nada se pierde ni se duplica: la lectura deduplica por
   `_k` quedándose con el `:updated_at` más reciente.
4. **Delta con solape de 48 h** sobre `:updated_at` (campo de sistema). Los
   cambios de estado (Convocado→Adjudicado) llegan por aquí y REEMPLAZAN el
   registro en su mes. Si `:updated_at` no estuviera disponible, degrada a
   `fecha_de_ultima_publicaci` y, en el peor caso, a re-bajar la ventana
   reciente.
5. **Verificación de completitud**: `count(1)` por mes ANTES de paginar
   (esperados) y auditoría final `esperados vs almacenados` (reporte en
   consola/meta; diferencias → `detecta:x:incidencias`).
6. **KV con chunks gzip+base64** particionados por mes
   (`detecta:x:mes:{YYYY-MM}:chunk:{i}`, ≤ ~950 KB por valor). Se almacena la
   **proyección** `CAMPOS_PROYECCION` (todo lo que usan la app, el
   requerimiento y la auditoría): la fila completa (~2 KB × cientos de miles)
   rebasaría el tier gratuito.
7. **Zona horaria**: Colombia es UTC-5 fija (sin DST). El "año vigente"
   comienza el 1-ene 00:00:00-05:00; las fechas del dataset son *floating
   timestamps* en hora local y así se comparan. El delta usa UTC porque
   `:updated_at` es un *fixed timestamp*.

## Carencias documentadas del dataset

- `municipio_ejecucion` / `departamento_ejecucion` **no existen** en
  `p6dx-8zbt`: solo hay ciudad/departamento de la **entidad**. La app lo
  mitiga con `inferUbicacion` sobre el texto del objeto (capa #7,
  `detecta-map-obra`). Si algún día se necesita el lugar real de obra,
  cruzar con el dataset de Contratos (`jbjy-vk9h`) por `referencia_del_proceso`.
- El % de **anticipo** tampoco viene: se lee del expediente (motor existente).
- `duracion` puede venir vacía o en unidades distintas (`unidad_de_duracion`).

## Puesta en marcha (producción)

1. **Vercel KV**: proyecto → Storage → Create Database → KV. Inyecta
   `KV_REST_API_URL` y `KV_REST_API_TOKEN` (ya usadas por `api/cron.js`).
2. **Token Socrata** (recomendado; sin él la cuota anónima se agota):
   crear app token en <https://dev.socrata.com/register> y guardarlo en la
   variable de entorno `SOCRATA_APP_TOKEN` (Vercel → Settings → Environment
   Variables). Las llamadas ya envían `X-App-Token` cuando existe.
3. **Carga inicial** (una vez, repetir hasta `done:true`):
   `curl -H "Authorization: Bearer $CRON_SECRET" "https://TU-APP.vercel.app/api/sync?modo=full"`
   (o desde el navegador `…/api/sync?modo=full&secret=TU_CRON_SECRET`).
   Cada llamada avanza ~45 s y guarda el cursor; con ~300-600k filas/año
   cuenta con varias decenas de invocaciones (el workflow de GitHub las
   encadena de a 8).
4. **Frescura**: la vista de oportunidades comprueba la caché al cargar; si
   tiene >1 h dispara `?modo=auto` en segundo plano (chip «actualizando…»).
   El cron diario de Vercel (08:30 UTC = 03:30 Colombia) y el workflow
   horario opcional completan el ciclo.
5. **Auditoría manual**: `GET /api/procesos?meta=1` → bloque `auditoria`
   (esperados, almacenados, diferencia, ts).

## Mantenimiento

- **Reiniciar una carga completa**: borra `detecta:x:progreso` en KV (o llama
  a `?modo=full` cuando la anterior terminó: arranca de cero por diseño).
- **Incidencias**: clave `detecta:x:incidencias` (últimas 200; lotes que
  agotaron reintentos, meses con diferencia, etc.).
- **Cambió el esquema del dataset**: ajustar `SECOP.f` en `index.html`,
  `SECOP_SOURCES` en `lib/engine.js` y `CAMPOS_PROYECCION`/`DEFAULTS` aquí.
  La sonda de capacidades absorbe la pérdida de `:id`/`:updated_at`, no la
  de las columnas de negocio.
- **Pruebas locales sin red**: `node tests/validar-extractor.js` (mock de
  Socrata con fallos 429/500 inyectados + mock de KV REST).
- **Prueba real contra Socrata** (desde una máquina con red):
  `node scripts/respaldo-csv.js extraer` — imprime la auditoría final.

## Límites conocidos (honestos)

- Vercel Hobby: crons **diarios** (por eso el workflow de GitHub) y respuesta
  ≤ 4.5 MB (por eso `/api/procesos` pagina a 2000 filas y la proyección trunca
  la descripción a 800 caracteres — medido: 2000 filas ≈ 3.7 MB en el peor caso).
- Upstash/Vercel KV gratuito: valores ≤ 1 MB (chunks), ~256 MB total. Un año
  de proyección comprimida cabe con margen; si el dataset creciera mucho,
  subir de tier o recortar `CAMPOS_PROYECCION`.
- `api/cron.js` (alertas Telegram) sigue leyendo Socrata directo (ventana de
  4 días, barato). Migrarlo a la caché es mejora futura, no urgente.
