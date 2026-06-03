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
  - Gate de seguridad por contraseña (SHA-256 + salt; respaldo local + `/api/auth` en producción).
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

## Convenciones
- Español en UI, comentarios y mensajes de commit. Estética tipo Apple (system fonts + Inter, sutil, claro).
- **Sin dependencias de pago.** PDF.js, Tesseract.js (OCR del pliego) y Leaflet (mapa) se cargan por CDN/lazy-load.
- Cambios nuevos: preferir **capa aditiva** + monkey-patch antes que reescribir funciones existentes.
- No debilitar el gate de seguridad ni el anti-iframe sin pedir permiso.

## Pendiente por verificar (dato del negocio)
- **Nº de contratos de Génesis**: la ficha visible mostraba 105/138 y la config JS 108/141. Se alineó todo a
  **105 (Génesis) / 138 (juntos)** porque `numContratos` es informativo (no entra en ningún cálculo). Si el RUP
  real dice 108, corregir en `profiles.genesis.numContratos` y `profiles.juntos.numContratos`.
- **Campo de fecha de cierre**: confirmar en producción (con red a SECOP) cuál de los nombres en
  `CIERRE_CANDIDATOS` puebla `fechaCierre`; si ninguno aplica, la cuenta regresiva queda vacía (degradación limpia).
