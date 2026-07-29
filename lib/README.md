# Capa de datos SECOP — extracción exhaustiva, caché y delta

Módulo que garantiza la captura **completa y verificable** de los procesos de
SECOP II (dataset Socrata `p6dx-8zbt`) del año vigente, y los sirve a la app
desde una caché en Upstash Redis (capa gratuita). Socrata queda solo para sincronizaciones; el
radar consume la caché.

## Piezas

| Archivo | Qué hace |
|---|---|
| `lib/extractor.js` | Núcleo: carga completa reanudable, delta, auditoría count(1), empaquetado gzip. |
| `lib/redis.js` | Cliente compartido de Upstash Redis (REST, sin SDK): comandos, credenciales y contador. |
| `lib/almacen.js` | Adaptadores de persistencia: Upstash Redis, archivo local, memoria. |
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
   `1-ene − 60 días` (≈ 1-nov del año anterior): los procesos de SECOP II
   rara vez superan 6 meses entre publicación y cierre, y la prioridad son
   oportunidades de participación vigentes. Ajustable con `SECOP_SOLAPE_DIAS`.
   Si el solape cambia con una carga en curso, el progreso **migra sin
   reiniciar** (conserva los meses ya cerrados en rango) y las particiones
   fuera de rango se purgan en el siguiente delta o al cerrar la full.
   **Aquí no se filtra nada más** (ni modalidad, ni cuantía, ni estado): los
   filtros de negocio son del cliente, sobre la caché.
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
4. **Delta con solape de 48 h** sobre `:updated_at` (campo de sistema),
   **append-only**: lo bajado se escribe como chunks ADICIONALES del mes y la
   lectura deduplica por `_k` (gana el `:updated_at` más nuevo) — así un
   cambio de estado reemplaza de facto SIN leer+reescribir meses de 40-50k
   filas en cada corrida (eso reventaría los 10 GB/mes de ancho de banda del
   tier gratuito de Upstash). Cuando un mes acumula >30 chunks se **compacta**:
   se escribe deduplicado en un rango nuevo y el manifest (`{ini, chunks}`)
   conmuta de forma atómica antes de podar el rango viejo. Un delta cortado
   por presupuesto **no avanza `last_sync`** (nada se pierde en silencio) y el
   sello siempre se ancla al INICIO de la corrida. Si el backend rechaza
   `:updated_at` (400), degrada en caliente a `fecha_de_ultima_publicaci`.
5. **Verificación de completitud**: `count(1)` por mes ANTES de paginar
   (esperados) y auditoría final `esperados vs almacenados` (reporte en
   consola/meta; diferencias → `detecta:x:incidencias`).
5b. **Valores grandes → partes transparentes**: el cinturón final contra
   `ERR max request size exceeded`. Si un valor supera 500 KB (no debería:
   el empaquetador ya corta antes), `escribirValorGrande` lo trocea en
   `…:chunk:{i}:parte:{j}` — partes primero, puntero `{"__partes":n}` al
   final (un fallo a mitad no deja punteros colgando) — y la lectura
   (`leerValoresGrandes`, usada por `leerMes`) re-ensambla sola; si falta
   una parte, ese chunk se descarta con aviso en vez de romper el mes.
   El esquema, la compresión y la paginación no cambian; `?modo=purga`
   reconoce las claves `:parte:` y limpia las huérfanas.
6. **KV con chunks gzip+base64** particionados por mes
   (`detecta:x:mes:{YYYY-MM}:chunk:{i}`, ≤ ~500 KB por valor — margen amplio
   sobre el límite de 1 MB por request del tier gratuito, con tope duro de
   900 KB en el empaquetador). Se almacena la
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

1. **Upstash Redis (gratis)**: crear una base Regional en
   <https://console.upstash.com> → pestaña REST API → copiar
   `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` → añadirlas con esos
   nombres en Vercel → Settings → Environment Variables. (Las antiguas
   `KV_REST_API_*` de Vercel KV siguen aceptándose como respaldo; el cliente
   compartido `lib/redis.js` resuelve las credenciales en ese orden.)
2. **Token Socrata** (recomendado; sin él la cuota anónima se agota):
   crear app token en <https://dev.socrata.com/register> y guardarlo en la
   variable de entorno `SOCRATA_APP_TOKEN` (Vercel → Settings → Environment
   Variables). Las llamadas ya envían `X-App-Token` cuando existe.
3. **Carga inicial** (una vez, repetir hasta `done:true`):
   `curl -H "Authorization: Bearer $CRON_SECRET" "https://TU-APP.vercel.app/api/sync?modo=full"`
   (o desde el navegador `…/api/sync?modo=full&secret=TU_CRON_SECRET`).
   Cada llamada avanza ~240 s (maxDuration 300) y guarda el cursor; con
   ~300-600k filas/año son unas pocas invocaciones (el workflow de GitHub
   encadena hasta 4). **Con Vercel Password Protection activa**, las llamadas
   externas (curl/GitHub) necesitan además el header
   `x-vercel-protection-bypass` con el secreto de *Protection Bypass for
   Automation* (Settings → Deployment Protection); el cron nativo de Vercel
   no lo necesita.
4. **Frescura**: la vista de oportunidades comprueba la caché al cargar; si
   tiene >1 h dispara `?modo=auto` en segundo plano (chip «actualizando…»).
   El cron diario de Vercel (08:30 UTC = 03:30 Colombia) y el workflow
   horario opcional completan el ciclo.
5. **Auditoría manual**: `GET /api/procesos?meta=1` → bloque `auditoria`
   (esperados, almacenados, diferencia, ts).

## Mantenimiento

- **Cuota de almacenamiento excedida (256 MB)**: la app escribe ~40-60 MB/año
  comprimidos, así que una base llena casi siempre significa claves BASURA de
  esquemas viejos u otras herramientas (p.ej. `oportunidad:*`) o particiones
  huérfanas. Procedimiento: (1) censo sin tocar nada:
  `GET /api/sync?modo=diagnostico&secret=…` → claves válidas/huérfanas/ajenas
  con ejemplos; (2) limpieza: `GET /api/sync?modo=purga&secret=…` — borra
  huérfanas+ajenas en lotes, jamás el esquema vigente, y se niega si hay una
  carga completa en curso (`force=1` para insistir). La base debe ser
  EXCLUSIVA de esta app: cualquier clave ajena se considera borrable.
  Nota medida (jul 2026): renombrar campos a códigos cortos solo ahorraría
  ~4 % POST-gzip (gzip ya deduplica los nombres repetidos) — no compensa
  romper el contrato «misma forma que Socrata» del radar.
- **«Ya hay una sincronización corriendo» persistente**: el candado
  `detecta:x:lock` tiene triple protección (TTL 900 s como red de Redis; auto-desbloqueo si el
  timestamp del candado supera 10 min; y un error de Redis responde **502 con
  la causa real**, nunca `enCurso`). Desbloqueo manual inmediato:
  `curl -H "Authorization: Bearer $CRON_SECRET" https://TU-APP.vercel.app/api/sync/unlock`
  (o `/api/sync?modo=unlock&secret=…`). Si `habiaCandado:false` y aun así
  veías `enCurso`, el problema eran las credenciales de Redis — el 502 del
  sync te dice exactamente qué responde Upstash.
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
- Upstash gratuito: requests ≤ 1 MB (chunks a 500 KB con tope duro de
  900 KB; un "Upstash 400: ERR max request size exceeded" ya no puede
  ocurrir por chunks), ~256 MB de almacenamiento (consumo real visible en
  `?meta=1` → `bytesAlmacenados`; proyección medida del año ≈ 60-150 MB;
  la auditoría avisa e inscribe incidencia si supera 200 MB) y ~10 000
  comandos/día — cada respuesta de `/api/sync` incluye `comandosRedis` para
  vigilarlo (presupuesto medido: full inicial ≈ cientos de comandos una sola
  vez; delta ≈ decenas; radar frío ≈ 15-25, con MGET contando como 1). Un año
  de proyección comprimida cabe con margen; si el dataset creciera mucho,
  subir de tier o recortar `CAMPOS_PROYECCION`.
- `api/cron.js` (alertas Telegram) sigue leyendo Socrata directo (ventana de
  4 días, barato). Migrarlo a la caché es mejora futura, no urgente.
