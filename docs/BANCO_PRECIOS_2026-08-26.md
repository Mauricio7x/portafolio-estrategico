# Banco de Precios Verificable · censo y contraste del informe del 26-ago-2026

Informe aportado por el dueño (investigación externa con navegador, fecha de consulta
26-ago-2026): precios retail de insumos de construcción y eléctricos para los APU **CPR Espinal**
y **UPN El Nogal**, con marcas de verificación propias — `[F]` = precio confirmado en la ficha del
producto; `[S]` = tomado solo del snippet de búsqueda, sin abrir la ficha.

Este documento hace lo que el precedente de `docs/INSUMOS_2026.md`: censa, contrasta contra el
repositorio EJECUTANDO código, dice qué se integra y qué no, y deja los pasos exactos. **Ningún
precio del informe se escribió en `data/`** — ver §4.

## 1 · Qué pudo verificar este entorno, y qué no

- **El proxy de esta sesión bloquea las cuatro fuentes del informe** (medido 26-ago-2026, HTTP 000):
  `homecenter.com.co`, `interelectricas.com.co`, `dane.gov.co` y `datos.gov.co`. Es una observación
  CON FECHA, no una propiedad del entorno — se reintentó antes de darlo por bloqueado.
- Por tanto **ningún precio del informe es re-verificable desde aquí**: el contraste de este
  documento es contra los datos que YA viven en el repositorio (capturas retail del 14-ago-2026,
  el snapshot del APU eléctrico del Nogal, los cinco bancos oficiales).

## 2 · Las dos alertas del informe, re-medidas contra el repositorio

El informe marca dos «alertas fuertes» sobre los precios del ingeniero y pregunta si incluyen
mano de obra. **El repositorio responde esa pregunta**: los precios del ingeniero están en
`tests/electrico_nogal_filas.json` (54 filas, el APU eléctrico UPN El Nogal) y sus descripciones
son literales.

- **Cable No. 12 AWG LS-ZH.** La fila del snapshot dice «Suministro e **instalación** de cable de
  cobre No 12 AWG LSZH» a **$17.552/ml** — es un ítem INSTALADO, no material suelto. Compararlo
  contra el rollo de vitrina ($2.489/ml `[S]`) compara dos cosas distintas; la alerta del informe
  está mal planteada en su causa aunque bien en su instinto. Referencias del repo para el
  MATERIAL: la captura retail del 14-ago da **$6.850/ml en Bogotá y $8.100/ml en Tolima** —
  cable **por metro cortado** (THHN, correspondencia declarada `aproximada`), que es 2,7× el
  precio de rollo del informe: por metro y por rollo son dos precios reales distintos.
  (El $10.900/ml que cita el informe no está en el snapshot del Nogal; correspondería al APU CPR
  Espinal, que no está en el repositorio.)
- **Tablero trifásico 18 circuitos — la alerta SÍ se sostiene, y con más fuerza.** La fila 1.10
  del snapshot dice «**Suministro** de tablero metálico trifásico de 18 circuitos con espacio
  para totalizador» a **$3.129.564** — SIN la palabra «instalación», al revés que casi todas las
  demás filas del mismo APU. Contra el único precio `[F]` del informe (Schneider NTQT-418,
  $206.900, ficha confirmada) es **15×**, y contra el Legrand 150A ($499.900 `[S]`) es 6×. La
  mano de obra no explica el delta en un ítem que se declara solo suministro. **Desglosar antes
  de reutilizar ese precio** (¿incluye totalizador + breakers de rama + certificación RETIE?).
- Los breakers del informe ($32.908 · $41.688 · $55.152 · $81.852) SÍ están en el snapshot y
  todos son «Suministro e instalación»: la comparación contra el mini-breaker de vitrina tiene el
  mismo defecto de base que la del cable.

## 3 · Qué aporta el informe frente a lo ya integrado

**Ya estaba en el repositorio (el informe lo confirma, no lo descubre):**
- INVIAS APU Regionalizados **2026-1**: re-capturado aquí el 16-ago-2026 desde el Excel oficial
  (`data/apu_invias.json`, `data/apu_invias_items.json`), incluye las provincias del Tolima.
- IDU visor 2026-I Fase I (ajuste 29-jul-2026): es la fuente de `data/apu_idu_items.json`.
- SECOP (p6dx, jbjy) **no trae precios unitarios por ítem**: doctrina ya escrita en CLAUDE.md
  («p6dx-8zbt publica el valor ADJUDICADO del contrato entero, no precios unitarios»).
- Boyacá `ae7u-y7m2`: ya fichado como dataset de **2022** — no se integra sin vigencia nueva.
- Homecenter regionaliza y el precio por defecto es Bogotá: el capturador del repo
  (`tests/capturar_retail.js`) ya resuelve eso con cookies por capital — **las capturas del repo
  son MEJOR dato que el informe** para los insumos que ambos cubren (el informe no pudo fijar
  ubicación; el repo tiene Tolima = Ibagué capturado). Ej.: cemento 50 kg TOLIMA $37.900/saco
  ($758/kg) frente al $700/kg del ingeniero — razonable, no conservador como concluye el informe
  con el precio de Bogotá.

**Nuevo y aprovechable (candidatos para la PRÓXIMA captura con red):**
- **El producto LS-ZH exacto en Homecenter**: «Cable de Cobre Libre de Halógeno #12» rollo 100 m,
  SKU 293463 (amarillo) / 293459 (azul, $248.900/rollo `[S]`). La referencia vigente del repo
  para ese insumo es THHN por metro, declarada `aproximada` — este SKU cerraría esa
  aproximación. Verificar la ficha y el color antes de capturar.
- **Interelectricas** (interelectricas.com.co) como segunda fuente nacional con SKU e IVA
  declarado (serie HFFR completa; tableros Tercol TRP318T ~$397.100 `[S]`).
- **Tablero trifásico 18 circuitos**: NTQT-418 SKU 441719 ($206.900 `[F]` Bogotá) y Legrand
  SKU 595295. Hoy no existe un insumo de catálogo al que colgar esa referencia (§4).
- **EMT 1/2"** Colmena tubo 3 m SKU 459142 ($14.900 → $4.967/ml `[S]`); panel LED 60×60 40W
  Sylvania SKU 478099 ($79.900–$89.900 `[S]`, cambia por promoción).
- **DANE ICOCED/ICOCIV**: patrón de URL de boletines
  (`dane.gov.co/files/operaciones/ICOCED/bol-ICOCED-<mes><año>.pdf`, ídem ICOCIV), base
  dic-2021 = 100, y variaciones (ICOCED año corrido feb-2026: 5,67 %; ICOCIV mensual mar-2026:
  1,02 %). El **número índice** sigue sin leerse (el DANE bloquea acceso automatizado): sin él no
  hay traslado exacto de precios entre vigencias — el hueco que ya declara
  `docs/APU_Y_RENTABILIDAD.md` sigue abierto.
- **Proveedores locales del Tolima**: censo con teléfonos (Depósito San Carlos, Matecons,
  Hierros HD, El Martillo — Espinal; A&S — Flandes). Ninguno publica precios en línea: solo
  cotizan. Para arena por m³, ladrillo, perfiles y flanche, la vía es cotización escrita por
  WhatsApp archivada como soporte del APU.

## 4 · Por qué NO se escribió nada en `data/apu_retail.json`

- **Todos los precios del informe salvo uno son `[S]`** — snippet sin ficha abierta. La regla del
  capturador es dura: «un precio 0 o sin confirmar NO se escribe», y el precio se ancla al nombre
  del producto en la PDP. Escribir un `[S]` sería presentar un snippet como una captura.
- **El único `[F]` (tablero NTQT-418, $206.900) es de Bogotá por defecto, sin regionalizar**, y
  además «tablero trifásico» no es un insumo del catálogo (`data/apu_catalogo.json` no tiene
  insumos eléctricos de aparato): no hay `insumo_id` al que colgarlo. Crear el insumo solo para
  la referencia invertiría la relación — el catálogo no se engorda desde la vitrina.
- La integración correcta es la de siempre: **correr `tests/capturar_retail.js` desde una máquina
  con red**, añadiendo los SKU del §3 como objetivos, con el anclaje al nombre del producto y la
  verificación de departamento que el capturador ya hace.

## 5 · Pendientes (para el dueño, con rutas exactas) — estado tras su verificación del mismo día

1. ✅ **Ficha del tablero confirmada por el dueño** (captura del 26-ago-2026): Schneider NTQT-418,
   **$206.900**, «Precio sujeto a cambios», **«Producto sin stock disponible»**, ubicación sin
   fijar (Bogotá por defecto). El sin-stock importa: es precio de catálogo, no de compra
   inmediata. **Lo que sigue abierto es suyo**: qué incluye el $3.129.564 de su APU (totalizador,
   breakers de rama, RETIE) — desglosarlo antes de reutilizar ese precio.
2. ✅ **Ficha del cable 293463 confirmada por el dueño** (captura): «Cable 12 AWG 100 METROS
   Libre de Halógeno» ExZhellent BW (Procables), **$264.900 el rollo = $2.649,00/metro impreso
   por la propia ficha**, RETIE/CIDET, Bogotá por defecto. Con esa evidencia la referencia entró
   a `data/apu_retail.json` (correspondencia `exacta`, `alcance: "bogota"`, divisor 100
   declarado) — ver §6. El nombre de catálogo dice «Cable 12 5M.» pero el empaque y el
   precio-por-metro confirman 100 m. La captura REGIONALIZADA por capital sigue pendiente de una
   corrida de `tests/capturar_retail.js` con red.
3. 🟡 **DANE, a medias**: el boletín ICOCED feb-2026 SÍ abre en el navegador del dueño (el
   bloqueo es solo a bots). Sus páginas 1–3 traen VARIACIONES — mensual feb-2026 **1,91 %**
   (residencial 1,94 / no residencial 1,86; VIS 2,02 / No VIS 1,92; Educación 2,37, el destino
   pertinente para la UPN) — pero **no el número índice base dic-2021 = 100**, que va en las
   tablas de resultados posteriores o en el anexo Excel de la misma página de la operación.
   Sin el índice no hay traslado exacto entre fechas: si hace falta, buscar en el mismo PDF la
   tabla «Índice» (páginas siguientes) o el «anexo» en
   https://www.dane.gov.co/index.php/estadisticas-por-tema/construccion
4. ⛔ **Cotizaciones locales del Tolima: APARCADO por decisión del dueño** («no voy a hacer
   eso», 26-ago-2026). Consecuencia declarada: arena por m³, ladrillo, perfiles y flanche siguen
   sin precio local verificado; sus referencias son las capturas retail por saco y los bancos
   oficiales, con la conversión saco→m³ prohibida (regla del capturador).

## 6 · Lo que entró a `data/` con la verificación del dueño

- **Una referencia nueva en `data/apu_retail.json`**: el rollo LS-ZH exacto
  (`nog_cable_cobre_no_12_awg_tc_ls_zh`, producto 293463, $264.900/rollo → $2.649/ml,
  `alcance: "bogota"`, evidencia = captura de ficha del dueño). Convive con la referencia THHN
  por-metro-cortado, que NO se retiró: son dos precios reales distintos (rollo vs metro cortado)
  y la THHN es la única regionalizada por capital. `referenciasRetail` sirve las dos con su
  ámbito, verificado ejecutando el módulo.
- **El tablero sigue sin entrar**: la ficha quedó confirmada pero «tablero trifásico» no es un
  insumo del catálogo — no hay `insumo_id` al que colgar la referencia, y crear el insumo desde
  la vitrina invertiría la relación (§4). El dato queda aquí, con su evidencia.
