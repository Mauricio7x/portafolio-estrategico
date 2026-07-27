# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

# Detecta · Inteligencia de licitaciones SECOP II

Memoria del proyecto. Si retomas el trabajo, lee esto primero.

## Qué es y para qué sirve
**Detecta** es una herramienta privada para **decidir a qué licitaciones de obra civil presentarse** en
Colombia. Conecta en vivo con los **datos abiertos de SECOP II** (Colombia Compra Eficiente, dataset
`p6dx-8zbt`), filtra los procesos compatibles con dos perfiles reales y calcula, para cada uno, un
**puntaje de encaje 0–100**. El fin es **priorizar dónde mirar primero**, no reemplazar la lectura del pliego.

> El encaje mide qué tan bien encaja un proceso con el perfil (habilitantes, cuantía, ubicación, capacidad,
> fase). **No es la probabilidad de ganar.**

## Flujo de trabajo (no hay build, lint ni tests)
Es un único `index.html` que corre 100 % en el navegador, sin paso de compilación.
- **Probar a ojo:** abrir `index.html` en el navegador, o desplegar en Vercel (para que vivan `/api/*`).
- **Validar el JS sin navegador** (este entorno no tiene Chromium): extraer cada bloque `<script>` inline y
  pasarlo por `new Function(code)` con Node — valida sintaxis sin ejecutar. Hay 6 bloques inline.
- **Smoke test de la capa de mejoras:** ejecutar los bloques `<script>` de mejoras en un contexto `vm` de Node
  con un *shim* mínimo de DOM (getElementById/querySelectorAll/createElement/classList/localStorage/
  requestAnimationFrame/Blob/URL) + mocks de `currentProfile`, `SMMLV`, `renderProcesses`, Leaflet (`L`) y
  fetch. Confirma que init + render del dashboard + mapa + CSV + tema no lanzan en runtime.
- **Red:** este entorno de desarrollo **no** tiene salida a `datos.gov.co` ni GDELT (allowlist). El código se
  prueba en el navegador real del usuario. Por eso el campo de fecha de cierre se detecta de forma defensiva
  (varios nombres candidatos) y el mapa/riesgo degradan con gracia si la red o el CDN fallan.

## Los perfiles (datos reales de los RUP, corte 07/05/2026)
- **Helder Gustavo Rodríguez Santana** — persona natural, Ing. Civil, Purificación (Tolima).
  Liquidez 129,12 · endeudamiento 0,04 · patrimonio $1.107 M · 33 contratos · RUP desde 2013 · 193 clases UNSPSC.
- **Génesis Ingeniería y Construcción GIC SAS** — persona jurídica, Ibagué.
  Liquidez 6,98 · endeudamiento 0,13 · patrimonio $211 M · 105 contratos · 343 clases UNSPSC.
- **Helder + Génesis** — consorcio/unión temporal. Patrimonio combinado $1.318 M · 138 contratos · 393 clases.

## Arquitectura
- **`index.html`** — TODA la app (HTML+CSS+JS, sin dependencias de pago).
  - **Sin gate JS** (jul 2026): el acceso restringido lo da **Vercel Password Protection** (servidor).
    Se conserva solo el anti-iframe. Aviso «Sitio privado» en el footer.
  - Pestañas: **Resumen** (dashboard, por defecto), Helder, Génesis, Juntos, **Mapa**, Pliego,
    Rentabilidad, APU, Manual.
  - Whitelists UNSPSC (`UNSPSC_HELDER/GENESIS/JUNTOS`) **embebidas** en un `<script>` del `<head>`.
  - `COORDS_MUNICIPIOS` (≈57 municipios lat/lng), `BASES`, `HUBS_AIRE`, `resolverCoords()` → geografía/radio.
  - Motor de riesgo GDELT: `classifyArticle` → `riskScore` → `classifyRisk` (caché en `newsCache`).
- **`api/` + `vercel.json`** (opcional, requiere Vercel + variables de entorno):
  - `api/proxy.js` — proxy de Socrata con App Token (CORS + más cuota).
  - `api/cron.js` — monitor autónomo: consulta SECOP, puntúa, verifica anticipo y avisa por **Telegram**.
  - `api/resumen.js` — resumen IA por proceso (Anthropic; **de pago**, opcional; la web usa un resumen local gratis).
  - `lib/engine.js` — motor de encaje portado a Node para que el cron calcule lo mismo que la web.
- **Capa de datos SECOP (jul 2026)** — extracción exhaustiva del año vigente a Vercel KV, ver `lib/README.md`:
  - `lib/extractor.js` + `lib/almacen.js` — carga completa **reanudable** (keyset por `:id`, count(1) por mes,
    reintentos con backoff, chunks gzip por mes) + **delta** por `:updated_at` con solape 48 h (los cambios de
    estado REEMPLAZAN por `_k`). Sonda de capacidades: solo un 400 real degrada a `$offset` (nunca un fallo de red).
  - `api/sync.js` (modos full/delta/auto, candado SET NX, presupuesto 45 s/invocación) y `api/procesos.js`
    (sirve la caché con la MISMA forma de campos que Socrata, `limit≤4000`, memoria caliente por instancia).
  - `index.html`: `loadProcesses` intenta **caché-primero** (`cacheMeta`/`cachePaginas`); si la caché tiene >1 h
    dispara `/api/sync?modo=auto` en segundo plano con chip «actualizando…» (`chipSync`). La cascada Socrata
    queda intacta como respaldo. Filtros de valor se aplican en local sobre la caché (extracción SIN filtros).
  - Cron Vercel diario 08:30 UTC + workflow GitHub horario opcional (`.github/workflows/sincronizacion.yml`).
  - Respaldo de emergencia: `scripts/respaldo-csv.js` (extraer a archivo / export CSV masivo / subir a KV).
  - **Pruebas sin red** (este entorno no alcanza datos.gov.co): `node tests/validar-extractor.js` — mock de
    Socrata (keyset, count, 429/500 inyectados) + mock de KV REST; incluye e2e por los handlers reales.
- **PWA** (`manifest.webmanifest`, `sw.js`, `icon.svg`) — instalar "Detecta" como app y servir el
  app-shell offline. El SW cachea solo el shell (network-first en navegación, respaldo al `index.html`);
  los datos de SECOP/GDELT siempre van a la red. El último radar se guarda en `localStorage`
  (`detecta-last-radar-v1`) y se re-renderiza si arrancas sin conexión.

## Reglas de negocio clave (motor de encaje, 0–100)
1. **K residual suficiente · 35 pts** — `CRPC = (Presupuesto − Anticipo) × 12 / Plazo` debe ser ≤ a la
   capacidad residual `CRP = CO × (E+CT+CF)/100 − SCE` (Guía CCE-EICP-GI-22).
2. **UNSPSC en el RUP · 20 pts** — match por **clase exacta de 8 dígitos** (no por segmento).
3. **Cuantía dentro del tope · 15 pts** — topes estratégicos: Helder ~4.000 SMMLV, Génesis ~2.000, juntos ~11.000.
4. **Fase · 10 pts** — selección activa = 10; borrador = 7; adjudicado/cerrado = 0.
5. **Indicadores financieros · 10 pts** — liquidez/endeudamiento holgados.
6. **Radio operativo · 10 pts** — ≤200 km por tierra desde Bogotá/Ibagué, o vuelo ≤2h45m + ≤2h terrestres.

Filtrado anti-falso-positivo en capas: geográfico → blacklist semántica (caninos, PAE, dotación…) →
UNSPSC duro → whitelist obra (cuando SECOP no declara UNSPSC) → sin OPS.

- **CO** (ingreso operacional) se **estima** desde la utilidad operacional × `MARGIN_MULTIPLIER` (16.7 ≈ margen 6%),
  porque el RUP no reporta el ingreso. Es editable por el usuario (tiene prioridad si conoce el real).
- **SMMLV 2026 = $1.750.905.** Datos externos: SECOP II (datos.gov.co) y **GDELT** (riesgo de seguridad, sin clave).

## Mejoras 2026 (capa aditiva, todo gratis, sin tocar la lógica existente)
Dos bloques `<style>` (antes de `</style>`) y **dos bloques `<script>`** (antes de `</body>`) que comparten el
ámbito global clásico (leen `currentProfile`, `profiles`, `SMMLV`, `renderProcesses`, `resolverCoords`,
`riskScore`…) y hacen **monkey-patch** no invasivo de `renderProcesses`/`loadProcesses`. La capa #2 envuelve
`renderProcesses` por encima de la #1.

- **Modo oscuro** con persistencia (`detecta-theme`) y respeto a `prefers-color-scheme`. Botón ☾/☀ en el header.
- **Anillos de puntaje** (SVG), **count-up**, **reveal on scroll** (IntersectionObserver) y **entrada escalonada**
  con easing suave tipo Apple `cubic-bezier(.16,1,.3,1)`. **Skeletons** mientras carga SECOP.
- **Watchlist ★** por proceso (`detecta-watchlist-v1`) + filtro "Solo guardados" + **exportar CSV**.
- **Dashboard "Resumen"** (pestaña por defecto): nº afines, encaje alto ≥75, valor total, mejor encaje,
  distribución por banda, Top 5 y **Próximos cierres**.
- **Cuenta regresiva de cierre** por proceso: `mapProcess` añade `cierre` (detección defensiva en `fechaCierre`,
  porque el dataset no garantiza una columna única); badge de urgencia por tarjeta + panel en el dashboard.
- **Mini-mapa** (pestaña Mapa): Leaflet lazy-load (unpkg) + tiles CARTO claro/oscuro; agrega oportunidades por
  municipio (`aggregateMunis`), colorea por **riesgo GDELT** (consulta throttled, reusa `newsCache`). Si Leaflet
  o la red fallan, degrada a un **ranking de municipios** con riesgo bajo demanda.
- Accesibilidad: `:focus-visible`, `prefers-reduced-motion` desactiva todo el movimiento.

### Capa #3 — 10 ideas nuevas (`detectaV3`, un `<style>` + un `<script>` antes de `</body>`)
Envuelve `renderProcesses` por encima de #1/#2 (aplica overrides de cierre **antes** de llamar al inner) y
`analizarPliego` (post-proceso). Todo gratis, sin red salvo GDELT bajo demanda. Claves `localStorage` propias:
1. **Calendario `.ics`** — exporta cierres (con `VALARM` −1 día / −3 h) por proceso o en lote desde "Próximos cierres".
2. **Comparador** lado a lado de 2–3 procesos (bandeja flotante + modal): encaje, K, valor, cierre, riesgo, anticipo.
3. **Vistas guardadas + deep-link `#`** — serializa filtros+perfil+pestaña al hash; "Copiar enlace" y vistas
   (`detecta-vistas-v1`). Barra inyectada bajo `.filters-simple`.
4. **Pipeline ponderado** (panel Resumen) — valor bruto → ×encaje → ×(1−descuento de riesgo GDELT). Botón para
   estimar riesgo de los municipios top (reusa `newsCache`/`riskScore`/`classifyRisk`).
5. **OCR → fecha de cierre** — `extraerFechaCierrePliego` parsea fechas ES en el texto del pliego y la **asocia**
   a un proceso del radar (`detecta-cierres-override-v1`); cierra el hueco cuando datos abiertos no la traen.
6. **Tendencia semanal** — snapshot diario por perfil (`detecta-tendencia-v1`) + sparkline SVG en Resumen.
7. **Calculadora de consorcio** (pestaña Juntos) — slider de % participación; pondera K (`calcK`) e índices en vivo.
8. **Alertas locales** (Notification API, `detecta-alertas-on/-sent`) — avisa de procesos guardados ★ con cierre ≤48 h.
9. **Tarjeta a imagen** — `<canvas>` 1080×1350 lista para WhatsApp (Web Share API o descarga PNG; sin CDN).
10. **PWA** — `manifest.webmanifest` + `sw.js` + `icon.svg` (ver Arquitectura).

### Capa #3b — correcciones de radar y mapa (`detectaV3b`, un `<style>` + un `<script>` antes de `</body>`)
Envuelve `renderProcesses` por **encima de todo** (filtra antes de pintar; el resto de capas ve la lista filtrada).
- **Oculta procesos CERRADOS** (`detecta-ocultar-cerrados`, default ON): `cierrePasado` (cierre vencido por día,
  "cierra hoy" NO cuenta) + estado/fase terminal (`adjudicad|celebrad|termin|liquidad|cerrad|desiert…`). Toggle
  "Ocultar cerrados" en los filtros + aviso con "Mostrar de todos modos".
- **Cobertura del mapa**: `MUNI_EXTRA` (32 capitales + ~90 municipios) se **fusiona** en `COORDS_MUNICIPIOS` al
  init (es `const` pero mutable). Como `resolverCoords` cae a la capital del depto, con las capitales **todo depto
  pinta**. Geocodificación **bajo demanda** vía Nominatim/OSM (`geocodeMuni`, cache `detecta-geocache-v1`, negativa
  incluida; botón "📍 Ubicar municipios faltantes", throttle 1.1 s, lote 25). Limitación honesta: `ciudad`/`depto`
  son `ciudad_entidad`/`departamento_entidad` → entidades nacionales (INVIAS) figuran en Bogotá.
- **Explorador por municipio** (pestaña Mapa): acordeón `<details>` que agrupa el radar por municipio y lista los
  procesos reales (encaje, valor, cierre, enlace) + buscador. Cierra el "¿cuáles son? ¿los adivino?".

### Capa #4 — 20 ideas nuevas (`detectaV4`, un `<style>` + un `<script>` antes de `</body>`)
Envuelve `renderProcesses` por encima de todo: **transforma la lista** (dedup → buscador → modalidad →
ocultar nacionales → solo ≤7 días → orden) antes de pasarla al inner. Claves `localStorage` propias.
- **Orden + buscador** (`v4-toolbar`): orden encaje/cierre/valor/**prioridad**; búsqueda libre. Prefs en `detecta-v4-prefs`.
- **Filtro modalidad** (derivado del radar) + **"solo cierran ≤7 días"** + **"ocultar entidades nacionales"** (`NAT_RE`).
- **Dedup** por `keyOf`. **"✦ Nuevo"** = no estaba en `detecta-vistos-v1` del perfil (snapshot al cargar).
- **Prioridad** = encaje × log(valor) × urgencia (cierre). **Distancia/tiempo** por tarjeta (`haversineKm`+`SINUOSIDAD`, ~50 km/h).
- **Riesgo en tarjeta** (chip si `newsCache` lo tiene) + **auto-consulta GDELT** 1×/día de los top municipios (`detecta-riesgo-auto-fecha`).
- **Kanban** (pestaña **Tablero** inyectada): estado por proceso (interesado/estudio/presentado/descartado) + **notas**, en
  `detecta-kanban-v1` (guarda snapshot del proceso). Selector de estado y 📝 en cada tarjeta.
- **Inteligencia de entidad**: botón 🏛 → consulta `SECOP_CONTRATOS` (`$q`) y agrega nº contratos, valor total/promedio y
  top proveedores (modal). Degrada si no hay red.
- **Selector de perfil fijo en el header** (`v4-profile`): cambia `currentProfile` y refresca Resumen/Mapa sin salir.
- **Checklist de habilitantes** tras `analizarPliego` (`detecta-pliego-checklist-v1`); marca lo detectado en el texto.
- **Datos y export** (panel Resumen): **Excel `.xls`** (HTML-table), **Imprimir/PDF** (`@media print`), **compartir
  watchlist** por enlace (`#w=` base64 → merge + reload), **backup/restore** de todo `detecta-*`/`radar-licit` (JSON).
- **Barras por departamento** (Mapa). **Atajos** (`/` buscar, `j/k`, `d` tema, `1-9` pestañas, `?` ayuda).
  **Resumen diario** (banner 1×/día) + recordatorio de renovación RUP (`RUP_RENOV`). Pestañas con **scroll horizontal en móvil**.

### Capa #5 — 40 ideas (`detectaV5`, un `<style>` + un `<script>` antes de `</body>`)
Envuelve `renderProcesses`/`analizarPliego` por encima de todo. La mayoría de features por proceso se reúnen en un
botón **"📋 Ficha"** (modal) para no saturar la tarjeta. Claves `localStorage` propias por feature.
- **Ficha del proceso**: "cómo subir el encaje" (de `faltaPara100`), **consorcio what-if** (`calcScore(p, profiles.juntos)`),
  UNSPSC con motivo, señales (lugar real, lotes, reapertura, competencia, plazo irreal, margen, cambios), **similares**
  (`tokenSim`/UNSPSC/depto), **documentos** (`detecta-docs-v1`), **plantillas** (carta/consorcio), **adjuntos**
  (`detecta-adjuntos-v1`), **recordatorio** configurable (`detecta-recordatorios-v1` + `checkRecordatorios`), **bitácora**
  (`kanban.log`), **deep-link** `#p=<hash>` y **reportar dato** (mailto).
- **Badges en tarjeta**: 📍 obra real (`inferUbicacion` lee el texto), ♻ reapertura, ✏ modificado (`detecta-proc-snap-v1`), 📦 lotes.
- **Resumen**: **calendario mensual** de cierres, **entidades más afines**, **estacionalidad** (por mes de publicación).
- **Pliego** (post-`analizarPliego`): "te deja fuera" (lee ✗ de la tabla), **cronograma** (`fechasCronograma`), **garantía de
  seriedad**, **pliego amañado** (`amañadoScore`).
- **Metodología** (pestaña nueva): explica los 6 factores del encaje.
- **a11y**: alto contraste (`detecta-contraste`) + tamaño de fuente (`detecta-fontscale`). **i18n base** (es/en, solo chrome:
  pestañas) `detecta-lang`. **Tour** de bienvenida (`detecta-tour-v1`). **Paginación** del radar (40 + "cargar más").
  **Resaltado** de búsqueda (`<mark>`). **Recordar** última pestaña (`detecta-last-tab`).
- **Datos**: importar histórico propio (`detecta-historial-v1`), exportar **tablero a Excel**. **IPC** (`aPesosDeHoy`) para
  llevar valores históricos a pesos de hoy. **SECOP I** + tu historial dentro del modal de inteligencia de entidad.
- **Footer**: versión + **changelog** + reportar.

### Correcciones de datos (en el código base, no aditivas)
- **`plazoMeses`**: usaba `("Días").includes("dia")` → **false por el acento** (í≠i). Ahora normaliza con `normalizaTexto`
  (y soporta semanas/horas). Era la causa del "195 m" que distorsionaba el K.
- **Logo en modo oscuro**: `.anticipo-mark` usaba `background:var(--ink)` → en oscuro quedaba blanco-sobre-blanco. Override
  a chip claro con glifo oscuro.
- **Filtro de no-presentables — DOS muros**:
  1. **Origen (base `loadProcesses`, "CAPA 5")**: descarta estado/fase terminal (`adjudicad|celebrad|termin|liquidad|cerrad|
     desiert|revocad|descartad|suspendid|anulad|cancelad|evaluaci|en ejecuci|ejecutad`) **antes de puntuar/guardar** →
     nunca entran al pipeline, pase lo que pase con capas o toggles. Es el muro a prueba de todo.
  2. **Aditivo (#3b)**: `dateClosed` (`diasHasta<0` o día vencido) → oculto salvo toggle/reveal; "cierra hoy" con hora
     futura permanece. "Mostrar" es **solo de sesión** (`_reveal`). Migración `detecta-cerrados-migrado-v3` reactiva el
     default ON. Tarjeta revelada se atenúa con cinta "CERRADO".
  - Si "siguen apareciendo cerrados" tras desplegar: casi siempre es **deploy/caché viejos** — el footer muestra la versión
    (`v5.0…`); si no se ve, no está desplegada esta rama. Recarga fuerte (SW network-first).

### Capa #6 — densidad de tarjeta (`detectaV6`, un `<style>` + un `<script>` antes de `</body>`)
Corre **al final**: agrupa los botones secundarios de `.proc-actions` en un menú **"⋯ Más"** (mueve los nodos, conserva
listeners), dejando visibles solo **📋 Ficha · ★ · ↗ SECOP II · selector de estado**. Chip persistente "🟢 Solo procesos
abiertos" en los filtros.
- **Alineación de tarjetas #4**: `v4Augment/recordSeen/maybeDailyBanner/autoRiesgo` usan `curList()` (lista ya filtrada por
  #3b), no `t`; antes desalineaban botones/notas cuando había cerrados ocultos.

### Capa #7 — consolidación + features cliente (`detectaV7`, un `<style>` + un `<script>`)
- **`window.DTC`**: namespace compartido (utils + modal) para consolidar going-forward (las capas viejas conservan sus
  closures; no se tocan). **Focus-trap + Tab + Esc** global para CUALQUIER `.v3-modal.show`. **Telemetría de errores**
  (captura `console.error`/`onerror`, visor «diagnóstico» en el footer). Puente **★ watchlist ↔ "Interesado"** del kanban.
- **Mapa por lugar de obra** (opcional, `detecta-map-obra`): el wrapper más externo clona la lista y sustituye
  `ciudad/depto` por lo que infiere `inferUbic` del texto, así el mapa/distancia dejan de depender de la entidad.
- **Features**: **Copiloto** "¿a qué me presento esta semana?" (prioridad + **prob. de ganar** heurística), **Embudo + KPIs**
  (de kanban+historial), **Simulador de fórmula** de evaluación (menor precio / media aritmética / geométrica), **Sugeridor
  UNSPSC** (objeto→clase), **Vencimientos** de documentos (`detecta-vencimientos-v1` + aviso ≤30d), **búsqueda por voz**
  (Web Speech), **swipe** móvil (★/descartar), **competidores** (dataset Contratos), **frescura del dato**, **aviso
  legal/privacidad** y **borrar mis datos**.
- **Refactor**: `enhanceEntidadModal` ahora usa **MutationObserver** (no cada clic). Paneles del Resumen se recalculan
  **solo si esa pestaña está activa**. Auto-riesgo GDELT es **opt-in** (`detecta-riesgo-auto`). Paginación `_v5shown`
  **se reinicia al cambiar la búsqueda**.

### Capa #8 — lote diferenciador (`detectaV8`, un `<style>` + un `<script>`)
- **#21 Adjudicaciones recientes** (botón en Datos + en el menú ⋯ de cada tarjeta): consulta `SECOP_CONTRATOS` por entidad y lista objeto · **ganador** · valor · fecha.
- **#51 Criterios de evaluación**: tras `analizarPliego`, `extraerCriterios` detecta el método del precio (menor precio / media aritmética / geométrica / con presupuesto) y los factores con puntaje; enlaza al simulador (#20).
- **#111 Mapa de calor por departamento**: SVG propio (sin Leaflet/GeoJSON) con burbujas en las 33 capitales, tamaño/color por valor agregado del radar.

### Hero rotativo
Frases curadas (revisadas; se quitaron las forzadas) + **generador combinatorio** con coherencia garantizada (contracción
`a el→al`/`de el→del`, mayúscula y punto): ~4.300 frases válidas (criterio/precisión + misión/esperanza/progreso). Rotación
suave cada ~11 s (respeta `prefers-reduced-motion`).

## Convenciones
- Español en UI, comentarios y mensajes de commit. Estética tipo Apple (system fonts + Inter, sutil, claro).
- **Sin dependencias de pago.** PDF.js, Tesseract.js (OCR del pliego) y Leaflet (mapa) se cargan por CDN/lazy-load.
- Cambios nuevos: preferir **capa aditiva** + monkey-patch antes que reescribir funciones existentes.
- No debilitar el control de acceso (Vercel Password Protection) ni el anti-iframe sin pedir permiso.
- **Eliminado** (jun 2026): el detector de DevTools (recarga cada 1.5 s por divergencia `outerWidth/innerWidth`) y el
  bloqueo de F12/clic-derecho/Ctrl+U/Ctrl+S. Daban cero seguridad real y causaban **falsos positivos en móvil** (bucle de
  recarga). **Jul 2026: también se eliminó el gate JS por contraseña** (SHA-256+salt en el HTML: cosmético,
  fuerza bruta offline y bypass por sessionStorage). Se conserva el anti-iframe. Privacidad real → **Vercel
  Password Protection** (activarla en el dashboard ANTES de desplegar; cubre todo el despliegue, incluidos los
  datos de RUP embebidos en el HTML). SW en `detecta-v6-2026-07` para purgar el shell viejo.

## Pendiente por verificar (dato del negocio)
- **Nº de contratos de Génesis**: la ficha visible mostraba 105/138 y la config JS 108/141. Se alineó todo a
  **105 (Génesis) / 138 (juntos)** porque `numContratos` es informativo (no entra en ningún cálculo). Si el RUP
  real dice 108, corregir en `profiles.genesis.numContratos` y `profiles.juntos.numContratos`.
- **Campo de fecha de cierre**: confirmar en producción (con red a SECOP) cuál de los nombres en
  `CIERRE_CANDIDATOS` puebla `fechaCierre`; si ninguno aplica, la cuenta regresiva queda vacía (degradación limpia).

### Capa #9 — simplificar (menos ruido) (`detectaSimplify`, un `<style>` + un `<script>`)
- **Perfiles fuera de las pestañas**: `helder/genesis/juntos` se ocultan (clase `v9-simple`) y el radar vive en una sola
  pestaña **Oportunidades** que abre el perfil del **selector del header** (`abreRadar` clica la pestaña de perfil oculta →
  reusa toda la lógica base/capas). **Metodología** también se oculta (el Manual ya la cubre).
- **Header**: contraste/texto/idioma se agrupan en un botón **⚙** (popover `.v9-pop`).
- **Resumen**: lo esencial visible; paneles analíticos (`v3-pipeline/v5-cal/v7-funnel/v5-ent/v5-sea/v3-trend/v4-datos`) se
  etiquetan `v9-adv` y se ocultan por defecto (`html.v9-hide-adv`) tras un toggle «Ver análisis avanzado».
- Los dos checks base `(.tab.active).dataset.tab===currentProfile` → `radar-wrap visible` (porque el perfil ya no es pestaña).
- Degrada con gracia: si el init falla, quita `v9-simple` y reaparecen las pestañas.

### Capa Legal (`detectaLegal`, un `<style>` + un `<script>` al final del `<body>`) — jul 2026
Cumplimiento voluntario (nada era legalmente exigible para un sitio personal: excepción doméstica art. 2.a
Ley 1581/2012; RNBD solo obliga a sociedades con activos >100.000 UVT — Decreto 090/2018; GDPR no aplica por
ámbito territorial; la Res. 1519/2020 de accesibilidad solo rige a sujetos obligados de la Ley 1712/2014).
- **Páginas estáticas fuera del gate** (deben poder leerse sin clave): `privacidad.html` (política de
  tratamiento + aviso, Ley 1581 + D.1377), `terminos.html` (no-asesoría, atribuciones SECOP/OSM-ODbL/CARTO/
  GDELT, Ley 527/1999), `accesibilidad.html` (declaración WCAG 2.1 AA, modelo W3C). Precacheadas en `sw.js`.
- **Banner de consentimiento** (`detecta-consent-v1`): aceptar / solo esenciales / configurar. Visible sobre el
  gate (override de `html.sec-locked` por id `#dtc-consent`). "Solo esenciales" activa un **guard**: monkey-patch
  de `Storage.prototype.setItem` que convierte en no-op las escrituras `detecta-*`/`radar-licit*` no esenciales
  (la clave de consentimiento está en allowlist) y **purga** lo ya guardado (con `confirm` previo). Reapertura:
  botón «cookies y almacenamiento» del footer.
- **Acceso** (jul 2026): el gate JS fue eliminado; la clave la verifica el servidor (Vercel Password
  Protection) y el código no la ve ni la guarda. Responsable en páginas legales bajo alias **«Detecta, tu
  prioridad»** + correo `detectalicitaciones@gmail.com` (sin datos personales expuestos). Constancia de
  autorización de datos de Helder: `autorizacion_helder.md` (plantilla, pendiente de formalizar).
- **`vercel.json`**: cabeceras X-Frame-Options DENY (antes solo estaba prometida en un comentario),
  nosniff, Referrer-Policy, HSTS, Permissions-Policy (`microphone=(self)` para la búsqueda por voz), COOP.
- **Pruebas**: `node tests/validar-legal.js` — sintaxis de TODOS los bloques inline, `node --check` de
  api/lib/sw, contenido legal mínimo, HTTPS estricto, cabeceras, y smoke test del banner con jsdom (opcional,
  vía NODE_PATH): aceptar/rechazar/guard/purga/persistencia/reapertura.
- Si cambia la naturaleza del sitio (usuarios terceros, correos, venta del servicio): nacen de inmediato las
  obligaciones de la Ley 1581/D.1377 (política/aviso/canales de derechos) y del art. 50 del Estatuto del
  Consumidor. Revisar también RNBD si Génesis supera 100.000 UVT en activos.

### Capa A11Y (`detectaA11y`, un `<style>` + un `<script>` al final, tras la capa legal) — jul 2026
Cierra la auditoría WCAG 2.1 AA sin tocar capas: **labelize** (copia `title`/`placeholder` → `aria-label` donde
falte; se re-ejecuta tras `renderProcesses`), **región viva** `#dtc-live` que anuncia los toasts de las 5 capas
(un solo MutationObserver de clase para toasts + `aria-selected` de pestañas + `aria-expanded` del ⚙),
**tablist/tab** en `#tabs`, dropzone del pliego operable por teclado, y **atajos desactivables** (WCAG 2.1.4:
listener en captura sobre `window` + botón «⌨ Atajos» en el popover ⚙, clave `detecta-atajos-off`, en la
allowlist esencial del consentimiento junto a `detecta-contraste`/`detecta-fontscale`).
En el código base: `aria-label` en `#anticipo-trigger`, `role=status aria-live` en `#status`/
`#anti-status`, `for=` en los filtros, `aria-modal` en los modales de capas #4/#8, caret KPI con
`currentColor`, y en oscuro `.btn-primary` baja a `#0066cc`. Ronda 2 (jul 2026): `aria-pressed` en ★/🔔,
`aria-hidden` en emojis decorativos, sparkline con `role=img`+`aria-label`, **flechas** ←/→/Home/End en las
pestañas (sobre las visibles), y grises de 10.5-12px a `#5d5d63` en claro (`.v4-chk-miss` fallaba AA).
**APIs**: `/api/resumen` exige origen propio (gastaba la key de Anthropic con CORS `*` sin auth) y `/api/proxy`
rechaza orígenes ajenos; ninguno necesita CORS (la web llama same-origin).
