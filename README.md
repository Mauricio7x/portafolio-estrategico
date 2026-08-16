# Detekta · Oportunidades de licitación SECOP II

> **Marca (ago 2026):** el producto se llama **Detekta**, con k. El nombre tiene UNA fuente de
> verdad, `public/glosario.js` (`MARCA.nombre`; `lib/glosario.js` lo re-exporta), y ninguna
> cadena visible lo escribe a mano. Repositorio, URL de producción, claves de Redis, variables de
> entorno, endpoints y claves del navegador (`detecta-acceso`, `detecta_perfil_rup`) **no cambian**:
> inventario, verificación y cómo conectar un dominio propio en [`docs/marca.md`](docs/marca.md).

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

- **Vercel serverless** (Node 18+, CommonJS). Sin framework, sin `package.json`, sin build:
  `public/` se sirve estático en la raíz y `/api/*.js` son funciones.
- **Seis routers por dominio** (ago 2026, Fase 0): `api/` contiene exactamente
  `procesos.js` · `inteligencia.js` · `perfil.js` · `admin.js` · `apu.js` · `pliego.js`, que
  despachan por `?op=` (o `accion`/`vista`) a los handlers de `lib/handlers/{dominio}/` — los
  mismos archivos que antes eran funciones sueltas, movidos sin reescribirlos. **Todas las URL
  clásicas siguen respondiendo igual** (`/api/sync`, `/api/oportunidades`, `/api/resumen`,
  `/api/diagnostico`, `/api/indice-baja`, `/api/competencia-detalle`, `/api/admin/*`,
  `/api/apu/*`) vía `rewrites` de `vercel.json`; el cron diario sigue llamando `/api/sync`.
  **El frontend (`public/*.js`) y las auto-invocaciones del servidor ya llaman a las rutas
  canónicas** (`/api/procesos?op=listar`, `/api/inteligencia?op=entidad`, `/api/apu?op=calcular`…):
  los rewrites son solo compatibilidad para URL guardadas y documentación, y hay prueba de que
  nada interno depende de ellos. El plan Hobby admite 12 funciones: con 6 quedan 6 huecos de reserva, y **lo nuevo se pliega
  como `op` en su router, jamás como archivo propio** (la suite fija el conteo en `=== 6`).
- **Puerta de entrada de 60 segundos (Fase 2, ago 2026)**: `POST /api/perfil?op=diagnostico` (público,
  sin cuenta ni token; `op=entrada` es sinónimo y su GET sirve las 12 actividades). Cascada sin salida
  muerta: RUP en PDF con texto (pdf.js en el navegador → `{texto}`) → escaneo, foto o ZIP de fotos
  (`{imagenes_base64}` → OCR.space → confirmar lo leído) → tres datos (`{manual}`: patrimonio, contrato
  más grande, actividad → perfil APROXIMADO, `lib/perfil_manual.js`). Crea el perfil `rup_…` por la
  misma vía que la carga por PDF (`lib/perfil_dinamico.crearPerfilDinamico`) y cuenta con la MISMA
  cascada y puertas del listado (`total` ≡ `/api/oportunidades`), con 5 licitaciones reales y «Ver las
  N». El documento no se persiste; el resultado se cachea 24 h en `diagnostico:{hash}`. La K sin utilidad
  operacional queda «sin dato» y la puerta P2 deja pasar declarándolo (`lib/capacidad`, `lib/puertas`).
- **Motor de costo real (Fase 1, ago 2026)**: `lib/parametros.js` (jornada, salario mínimo, prestaciones,
  ARL, TPNL/MVP, herramienta menor, EPP, IVA sobre utilidad; versionados en `apu:parametros` y
  `apu:parametros:v:{vigencia}`; editables en *Mi empresa → Sistema*) + `lib/costos.js` (única
  implementación de las fórmulas, re-export de `public/costos.js` que también carga el navegador).
  El catálogo cotiza la mano de obra POR DÍA y no tiene divisor de horas; la Ley 2101/2021 (42 h desde
  el 15-jul-2026) entra como **factor de jornada** (44/42) sobre los días de mano de obra por unidad, y
  el EPP como % de la mano de obra. `GET /api/apu?op=parametros` (público) · `POST` (token). Impacto
  medido: MO +4,76 %, costo directo medio +2,37 %. Metodología pública: `docs/metodologia.md`.
- **Panel Piso / Techo (Fase 3, ago 2026)** — «¿me presento, y a cuánto?»: `lib/apu/piso_techo.js`,
  bloque `piso_techo` de `POST /api/apu?op=rentabilidad`, pintado PRIMERO entre los resultados de
  *Precios*. Piso = costo directo × (1 + A + I + U mínima) ÷ (1 − contribución 5 % − deducciones
  cargadas); techo = presupuesto oficial × (1 − baja mediana) **solo con n ≥ 5** en la cascada
  entidad+familia → entidad → departamento+familia (sin base: «Sin referencia» y NO hay techo);
  umbral de precio artificialmente bajo = 80 % del presupuesto (referencia declarada). Veredicto en
  frase completa («Preséntese entre X y Y», «No se presente…», «Su precio mínimo es X. No tenemos
  historial suficiente…»), nº de oferentes jamás 0 cuando no se conoce, y botón «Descargar mi
  justificación de precio» (`public/justificacion.js`: documento con el APU detrás, D. 1082 art.
  2.2.1.1.2.2.4). Fuentes verificadas para la fase en `docs/datos.md` §5: `hgi6-6wh3` (0 filas para
  procesos abiertos; en adjudicados == p6dx) y `jbjy-vk9h` (valor del contrato == adjudicado en p6dx;
  aporta ejecución, no baja).
- **Upstash Redis** vía API REST con `fetch` nativo (`lib/redis.js`) — sin SDK.
- **Cero dependencias**: `fetch`, `zlib` (deflate nivel 6) y la API REST de Upstash.

| Archivo | Qué hace |
| --- | --- |
| `lib/handlers/procesos/sync.js` | Sincronización full/delta/auto, reanudable, con candado TTL y auto-reinvocación |
| `lib/handlers/procesos/historico.js` | **Backfill histórico** (protegido por token): 2 años a `licitaciones:historico:*` + construcción de los tres derivados (índice, equivalencias, vocabulario) |
| `lib/handlers/procesos/listar.js` | Consulta: **todo el juicio fino** por perfil, competencia por entidad, orden, paginación, memoria caliente |
| `lib/handlers/perfil/resumen.js` | **Dashboard**: los mismos visibles de la app, agregados (tipo, urgencia, entidades, departamentos, capacidad K) con caché de 5 min |
| `lib/handlers/admin/rup.js` + `lib/config_rup.js` | **Carga del RUP por archivo JSON**: validación campo por campo y publicación atómica, con efecto inmediato |
| `lib/handlers/admin/experiencia.js` + `lib/experiencia.js` | **Contratos ya ejecutados** → vocabulario del oficio: en qué *sabe* trabajar el dueño (el RUP solo dice a qué *puede* presentarse) |
| `lib/handlers/admin/cobertura.js` + `lib/cobertura_rup.js` | **Qué códigos UNSPSC le faltan al RUP**: los que el mercado adjudica para objetos como los suyos y no tiene inscritos, priorizados por similitud con su experiencia real |
| `lib/indice_competencia.js` | Índice **entidad → oferentes promedio** sobre el histórico; tertiles baja/media/alta |
| `lib/handlers/inteligencia/detalle.js` + `lib/competencia_detalle.js` | **Consultas de solo lectura**, tres vistas en una función: los procesos que sostienen el badge de competencia (incluidos, excluidos y por qué, caché de 1 h), el **desglose de la probabilidad** (`?vista=probabilidad`) y el **PAA** (`?vista=paa`) |
| `lib/paa.js` | **Plan Anual de Adquisiciones** (dataset `9sue-ezhx`): qué va a salir en los próximos 12 meses, filtrable por entidad y por UNSPSC jerárquico. Columnas por lista de candidatas + censo publicado — el dataset **no se pudo verificar** desde este entorno — y `tasa_de_acierto: null` mientras nadie la mida |
| `lib/probabilidad_desglose.js` | **Por qué ese 23 %**: los seis pasos del cálculo con fórmula, datos con la fuente citada, aritmética escrita y aporte en puntos porcentuales. No recalcula nada — narra la traza de `lib/probabilidad` |
| `lib/auth.js` | Guardián único del `HISTORICO_TOKEN` para **todos** los endpoints protegidos (doce puntos de llamada), `/api/oportunidades` incluido |
| `lib/cuerpo.js` | Lector único del cuerpo JSON (objeto · cadena · stream) con su tope y su política de cuerpo vacío. Vivía triplicado en los tres endpoints que reciben POST |
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
| `lib/handlers/apu/editor.js` | **Editor de APU y lector de pliegos** — una sola función para diez acciones (catálogo, inferir, calcular, **rentabilidad**, guardar, cargar, listar, **importar**, extraer-texto, descargar): el plan Hobby de Vercel admite 12 funciones por despliegue |
| `lib/apu/rentabilidad.js` | Lo que el presupuesto no responde: flujo de caja mes a mes, capital expuesto, **payback**, precio piso, maldición del ganador y **VEG** |
| `lib/apu/tipologias.js` | Las 22 tipologías cerradas y el mapa departamento→región. `regionDeDepartamento` es el punto único de paso y **jamás devuelve una región de relleno** |
| `lib/apu/inferencia.js` | Objeto del proceso → tipología de obra e ítems: léxico con puntaje (Nivel A) + UNSPSC como **veto** (Nivel B) |
| `lib/apu/calculo.js` | Del costo directo al precio: cantidades, AIU, ajuste competitivo, margen y alertas. **No reimplementa** el costo directo: llama a `costoDirecto()` del catálogo |
| `data/apu_tipologias.json` | Las 22 tipologías con sus términos ancla, de apoyo, de exclusión y los ítems que las componen |
| `data/apu_regional.json` | Departamento (como lo publica SECOP) → región de precios del catálogo. 14 con región, **19 declarados sin base** |
| `lib/apu_pliego.js` | **Lector de pliegos**: del texto de un PDF a la tabla de cantidades. 3 vías de reconocimiento de fila, 3 niveles de validación aritmética y semáforo de 2 ejes |
| `lib/apu_mapeo.js` | Descripción del pliego → ítem del catálogo, por 4 señales ponderadas (términos, Levenshtein, unidad, tipología) |
| `lib/apu_catalogo.js` + `data/catalogo_apu.json` | **Diccionario de reconocimiento**: 93 ítems SIN precios, con sinónimos. No confundir con `data/apu_catalogo.json`, que es la biblioteca de costeo |
| `lib/apu_ocr.js` | Respaldo por OCR (OCR.space) para pliegos escaneados. Una petición por página |
| `lib/apu_extraer.js` + `lib/apu_descargar.js` | La lógica de las acciones `extraer-texto` y `descargar` de `lib/handlers/apu/editor.js`. Están en `lib/` porque el plan Hobby de Vercel admite 12 funciones y con dos ficheros más eran 14 |
| `docs/APU_Y_RENTABILIDAD.md` | La investigación que sostiene el CATÁLOGO DE PRECIOS: fuentes, factor prestacional, AIU, ICOCIV y regionalización |
| `docs/APU_INFORME_COMPLETO.md` | El **informe** completo de investigación y diseño (§1.A-§1.I): el que citan los comentarios del código. Incluye lo que NO se implementó y por qué |
| `docs/PERFILES.md` | Resumen técnico de los tres perfiles (datos, estimaciones, limitaciones) |
| `docs/AUDITORIA_INTEGRAL.md` | **Censo del sistema** (ago 2026): qué módulo hace qué, qué está probado, qué endpoint pide llave y por qué, qué está duplicado, qué está muerto y qué falta — con las correcciones pendientes ordenadas por impacto en las adjudicaciones |
| `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md` | **Benchmark competitivo** (ago 2026): las cinco mejores plataformas de licitación del mundo (SAM.gov, TED, Mercado Público, GovWin IQ, SECOP II) analizadas en diez dimensiones, y qué copiar, adaptar o evitar. Incluye dónde está esta app frente a ellas y las cinco funcionalidades a implementar primero. **No implementa nada: recomienda** |
| `public/` | Frontend estático (Tailwind CDN, **diseño Apple Glass**: claro por defecto y oscuro por `prefers-color-scheme`, custom properties en `:root`, tarjetas translúcidas con `backdrop-filter`, paleta #f5f5f7/#1d1d1f/#86868b/#007AFF/#34C759/#FF9500/#FF3B30; gate de clave). **UNA sola página** desde ago 2026: `index.html` con tres pestañas (`#/licitaciones` · `#/apu` · `#/admin`) y `app.js` como único módulo principal. Las URLs viejas (`/admin.html`, `/apu.html`, `/pliego.html`) viven como `redirects` en `vercel.json` |
| `public/index.html` + `app.js` | La página única: landing de onboarding, gate, tablero de oportunidades, **editor de APU** (pestaña `#/apu`: inferencia, carga desde Excel/CSV, desglose por ítem plegable, badges de origen del precio, precio sugerido) y **administración** (pestaña `#/admin`: dashboard, carga de RUP —JSON o PDF—, experiencia, cobertura, catálogo APU y sincronización plegada). El token de escritura va INTEGRADO (`MiExtraccion2025`): el usuario nunca lo teclea — la seguridad real es Vercel Password Protection |
| `public/pliego.js` | **Lector de pliegos** (sección de la pestaña APU): pdf.js en el navegador, columnas por coordenadas, progreso por página y respaldo por OCR. Sigue siendo archivo propio: sus funciones están atadas por pruebas que las extraen por archivo |
| `public/onboarding.js` | La landing: RUP en PDF → perfil dinámico, y carga de experiencia por CSV (panel en la pestaña admin) |
| `public/xlsx_lectura.js` | Lector .xlsx/.csv propio (ZIP + XML, DEFLATE inyectable) — la otra mitad de `public/xlsx.js`. Corre en navegador y en Node |
| `public/apu_libro.js` | El presupuesto calculado → libro Excel con formato del **Presupuesto Nogal 4** (capítulos, fórmulas, AIU + IVA sobre utilidad, firmas, hoja APU por ítem con cabecera por sección). Además es el hogar de `lineaLegible` y `clasificarOrigen`: **una** definición de «cómo se lee una línea de insumo» y de «de dónde sale este precio», que usan la hoja del Excel **y** el desglose en pantalla |
| `lib/apu/normativa.js` | **Qué hay detrás de los factores**: desglose del prestacional componente a componente con su norma, bandas del AIU, IVA sobre la utilidad y deducciones. Explica; no decide — el factor que se aplica lo sigue poniendo el catálogo, y este módulo lo **recibe** para contrastarlo |
| `lib/apu/importar.js` | Filas importadas → ítems del catálogo de precios: mapeo con plural tolerado y política de precios declarada (el del archivo manda; una sugerencia sin precio no cobra sola) |
| `public/xlsx.js` | **Escritor `.xlsx` propio, sin dependencias** (ZIP + OOXML con estilos reales). Ver «Exportación a Excel» |
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
| `competencia_entidad` | — | Histórico **de la entidad**: `baja` · `media` · `alta` · `sin_dato`. **Es el único filtro de competencia**: el de «ofertas del proceso» se retiró en ago 2026 (ver abajo) |
| `ubicacion_valida` | — | `true` · `false` |
| `match` | — | Solidez del match UNSPSC: `clase` · `familia` · `equivalente` · `texto` |
| `incluir_sin_unspsc` | — | `1` para reabrir la ruta de texto sin pertinencia verde (toggle de la UI) |
| `incluir_cerradas` | — | `1` para incluir procesos en estado terminal |
| `solo_viables` | **`true`** | Oculta lo que no pasa las puertas P1-P3. Con `false` aparecen al final, marcados |
| `ordenar_por` | **`atractividad`** | `atractividad` · `ve` · `p_ganar` · `anticipo` · `cuantia` · `competencia` (nivel de la **entidad**) · `puntaje` (legado) |
| `orden` | `desc` | `asc` · `desc` |
| `pagina` / `por_pagina` | 1 / 20 | `por_pagina` máx 100 |

**Los siete filtros de la Fase 8 (ago 2026)** — se aplican en el servidor DESPUÉS de la cascada y de
las puertas (son lo que elige quien consulta, no parte del juicio); un valor desconocido es INERTE
(un enlace guardado nunca vacía la lista); el vocabulario vive en `public/filtros.js` y la aplicación
en `lib/filtros_lista.js`; cobertura de cada columna medida contra `p6dx-8zbt` en `docs/datos.md` §6:

| Parámetro | Lo que ve el usuario | Valores |
| --- | --- | --- |
| `tipo` | Qué tipo de trabajo es | `obra` · `consultoria` · `interventoria` · `suministro` · `servicios` (coma para varios; `todos`). **Ausente = los cuatro sin suministro** (§8.6 del plan; esconde ~6 % medido) |
| `modalidad` | Cómo lo adjudican | `licitacion` · `abreviada` · `subasta` · `meritos` · `minima` · `directa` · `especial` (coma) |
| `dep` | Dónde queda | código DANE **o** nombre (`73` ≡ `Tolima`; coma). «No Definido» es `sin_dato` y no entra en ninguno |
| `ciudad` | Dónde queda | subcadena normalizada de `ciudad_entidad` |
| `min` / `max` | Cuánto vale | pesos; cuantía 0 = sin dato y no entra en ningún rango |
| `cierre` | Cuándo hay que entregar la oferta | `3d` · `7d` · `15d` · `+15d` (acumulativas salvo la última), o `cierreDesde`/`cierreHasta` (`YYYY-MM-DD`). Siempre sobre procesos abiertos |
| `entidad` | Buscar entidad | NIT (con o sin DV) o subcadena del nombre |
| `q` | Buscar por palabra | subcadena normalizada sobre objeto y entidad |
| `ordenar_por=cierre` | Las que cierran antes | menos días primero; sin fecha al final |
| `ordenar_por=margen` | Dónde me queda más | `techo − piso` (Fase 3) SOLO para procesos con un borrador de APU guardado con `costo_directo`; los demás «Sin referencia», al final. **Nunca se asume margen cero** |

Salida añadida: `totalSinFiltros` (la base antes de los filtros del usuario), `filtrosAplicados`
(fichas legibles `[{filtro, etiqueta}]`), `sugerencia` (`{filtro, siLoQuita}` SOLO con cero
resultados: qué filtro quitar y cuántos aparecerían, contados), `facetas` (conteos por opción sobre
la base), cada fila trae `filtro {tipo, modalidad, departamento, rango, dias_cierre, ventana}` y,
con `ordenar_por=margen`, `margen_estimado {valor, piso, techo, motivo}` más `margen {procesos_con_costo,
borradores, borradores_sin_costo, con_margen}`. `GET /api/procesos?op=entidades&q=alcald` (público)
responde el catálogo real de entidades con procesos abiertos: `[{nit, nombre, procesosAbiertos,
valorAbierto}]`, máximo 10. Nota: el plan v4 llamaba `orden=` al criterio; aquí `orden` ya era la
dirección (`asc|desc`), así que el criterio sigue en `ordenar_por`.

**Fase 9 (ago 2026) — la portada y la manifestación de interés.** `GET /api/procesos?op=portada`
(público) LEE el agregado precalculado `portada:resumen` que la sincronización escribe al terminar
cada corrida con datos: `{generado, fuente, procesosAbiertos, valorTotal, entidadesActivas,
cierranEstaSemana{n, valor, muestra[3]}, topEntidades[{nit, nombre, abiertos, valor, baja|null,
nBaja}], porDepartamento[{cod, nombre, n, valor}], manifestacion{abiertos, proximos|null, norma},
edadHoras, desactualizada}`; si la clave no existe responde `disponible:false` con el motivo, jamás
calcula al vuelo; `?reconstruir=1` CON token la recalcula. `baja` solo con n ≥ 5 a nivel entidad;
`proximos` sale del PAA y es `null` si no respondió. `GET /api/procesos?op=manifestacion&estado=
abierto|proximo` (público): las abreviadas de menor cuantía cuyo plazo para avisar —apertura + 3 días
hábiles, D. 1082/2015 art. 2.2.1.2.1.2.20— no venció, con `vence`, `diasHabilesRestantes` recalculado
con la fecha de HOY en Colombia y `origenFecha:"calculada"` SIEMPRE (el dataset no trae esa fecha:
docs/datos.md §7). `lib/habiles.js` calcula los festivos (Ley 51/1983 + Pascua). La portada se
pinta en la landing (`public/portada.js`) y cada cifra enlaza a la lista filtrada de la Fase 8.

**Fase 10 (ago 2026) — consorcio a la medida.** `POST /api/perfil?op=consorcio {nombre, integrantes:
[{perfilId, participacion}]}` (token) valida que la suma sea EXACTAMENTE 100 %, guarda en
`config:consorcios` y devuelve un id `cons_…` que `/api/procesos?op=listar&perfil=cons_…` sirve
como cualquier perfil (derivado de sus integrantes vivos en cada petición; `GET` lista, `DELETE
&id=` borra). `POST ?op=consorcio-simular {integrantes, proceso?}` (token; caché 1 h en
`consorcio:sim:{hash}`) devuelve `indicadores {liquidez, endeudamiento, cobertura, patrimonio}`
ponderados por participación (Guía CCE-EICP-GI-22) y **truncados a dos decimales, no redondeados**
(las cámaras truncan), `capacidadContratacion` (= SUMA de las CRP de los integrantes, Guía CCE de
capacidad residual — declarado en `advertencias`, no el recálculo ponderado que sugería el plan),
`clasesUnspsc` (UNIÓN: Helder ∪ Génesis = 393, no 536), `contratos` (suma: 141),
`procesosAdicionales` (viables del consorcio − las del mejor integrante solo, con la MISMA cuenta
que la puerta de entrada), `cumple:null` (el dataset no publica los requisitos del pliego; lo que la
app sí verifica viaja como `puertas_app` cuando se pasa `proceso`) y las advertencias («verifique
si exigen un porcentaje mínimo al integrante que aporta la experiencia»). Ningún precio de oferta
entra ni sale (art. 410A). En «Mi empresa» el bloque «Crear consorcio» aparece solo con dos o más
perfiles individuales cargados.

**Fases 4 y 5 del plan v3 (ago 2026) — guardián del Formulario 1 y vigía de adendas.**
`POST /api/pliego?op=formulario1 {oferta:{items,aiu,total}, formulario:{items}, presupuesto_oficial,
tope_aiu_pct?, secop?:{total,items}, id_proceso?, perfil?}` (token) devuelve un semáforo con frases
(`listo` · `precaucion` · `revisar`) y las **siete validaciones** con su fundamento: total >
presupuesto (rechazo, insubsanable) · ítems añadidos/suprimidos/modificados frente al Formulario 1
(rechazo — «motivo de rechazo automático», Documento Base 1.15 y Concepto C-549/2022) · SECOP II ≠
anexo (rechazo) · AIU sin discriminar o sobre el tope (rechazo, Documento Base 4.1) · precio bajo el
umbral de baja temeraria (alerta + justificación desde el APU, D. 1082 art. 2.2.1.1.2.2.4) · error
aritmético e · ajuste de redondeo (informativos, Ley 1882/2018). Lo que no se cargó (SECOP II, tope,
Formulario 1) queda `sin_referencia`, jamás «cumple». Se guarda en `formulario1:{proceso}:{perfil}`.
En Precios → «Revisar antes de subir». `POST /api/pliego?op=diff {id_proceso, texto, perfil?}` (token)
guarda cada versión del texto del pliego (`pliego:{proceso}:v:{n}`, máx. 5), y si el hash cambió, el
diff por párrafos (`pliego:{proceso}:diff:{n}`) y los **habilitantes numéricos** (capital de trabajo,
patrimonio, liquidez, endeudamiento, cobertura, experiencia, plazo) reevaluados contra el perfil:
«Capital de trabajo exigido: subió de $650.000.000 a $800.000.000. Usted ya no cumple». Además el
listado publica `adendas` por fila cuando el DATASET reescribió el proceso (cierre, presupuesto, plazo,
objeto, modalidad; `_cambios` del dedup) con «le afecta / no le afecta» reevaluado por perfil.
`GET|POST /api/pliego?op=cronograma&id_proceso=…[&formato=ics]` (público): hitos del dataset y del
texto del pliego con avisos a T-7, T-3 y T-1 y exportación a calendario (.ics con alarmas).

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
"p_ganar": 0.2125, "ve": 72250000, "viable": false,
"p_ganar_detalle": {
  "base": 0.25, "rivales_esperados": 3, "fuente": "entidad",
  "ajustes": [ { "nombre": "baja_mercado", "factor": 0.85,
                 "motivo": "la entidad adjudica ~8 % por debajo del presupuesto: ganar exige descontar" } ]
}
```

El ejemplo **cuadra a mano y tiene que seguir cuadrando**: `base × Π factores = p_ganar`
(`0,25 × 0,85 = 0,2125`) y `ve = p_ganar × cuantía` (`0,2125 × $340 M`). El factor que se publica es
el mismo que se aplicó, y la base también se redondea **antes** de multiplicar, no al publicarla:
así la única diferencia posible es media unidad del último decimal (el redondeo final de `p`), y hay
prueba que barre el espacio de parámetros para fijarlo. Publicar una cifra y multiplicar por otra
haría del desglose una explicación que no da su propio resultado. Sin token, ese `factor` viaja en `null` y el `motivo` pierde la
cifra: es inteligencia de precio (ver «Lo que no sale sin token»).

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
entidad** → **promedio de su departamento** → **supuesto conservador de 5** (`P = 1/6`), y tres
ajustes declarados: **cierre prorrogado ×1,20** · **colisión de cierres ×1,15** · **baja de mercado**,
una rampa continua de ×1,10 (la entidad adjudica por el presupuesto oficial) a ×0,85 (descuenta
≥5 %). La fuente viaja siempre en `p_ganar_detalle.fuente`: «histórico de la entidad»
no es lo mismo que «supuesto», y enseñar el 17 % sin decir de dónde sale convierte una estimación en
una promesa. Los factores son **supuestos con nombre**, no coeficientes ajustados: no hay etiqueta
contra la que calibrarlos, y suavizar la baja **no la calibra**. `ve = p_ganar × cuantía`.

El **ajuste por tertil de competencia** (×1,30 «baja» / ×0,70 «alta») se retiró en ago 2026: `nivel`
es el tertil del **mismo promedio** que ya está dentro de `rivales`, así que multiplicaba por la
competencia dos veces. Saltaba −32 % de probabilidad por **medio rival** en el corte, daba ×1,30 de
diferencia según el dato viniera de la entidad o del departamento, y como los tertiles son
**relativos**, la probabilidad de un proceso cambiaba porque cambiaban **otras** entidades del
índice. El nivel **sigue viajando** en la tarjeta, sigue filtrando (`?competencia_entidad=`) y sigue
ordenando (`?ordenar_por=competencia`): lo único que ya no hace es multiplicar `p`. Detalle y cifras
en `docs/PROBABILIDAD_MEJORADA.md`.

> `?ordenar_por=competencia` ordenaba en realidad por el `nivel_competencia` **de la fila**, no por el
> de la entidad — y aquel es constante en el corpus activo, así que no ordenaba nada. Corregido en
> ago 2026: ahora lee el nivel de la entidad, que es lo que este párrafo llevaba afirmando.

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

Consultas de **solo lectura** que explican lo que el dueño ve en la pestaña de licitaciones. Son
**tres vistas de una sola función serverless** (`?vista=entidad`, por defecto, `?vista=probabilidad`
y `?vista=paa`), y eso no es estética: el plan Hobby de Vercel admite **12 funciones** por
despliegue y el repositorio está exactamente en 12. Un archivo más y no falla el endpoint nuevo:
falla el despliegue entero. Es la misma restricción que plegó `/api/apu/catalogo` en
`lib/handlers/apu/editor.js` y que impidió `/api/baja-mercado`.

Las dos primeras responden la misma pregunta —«de dónde sale ese número de la tarjeta»— sobre el
corpus ya ingerido. La tercera **no**: mira otro dataset, no toca Redis y habla de procesos que
todavía no existen. Conviene decirlo en vez de dejar que se deduzca que «detalle de competencia»
alguna vez significó eso: el nombre del archivo se quedó corto y el tope de funciones es lo que
impide arreglarlo.

#### Vista `entidad` (por defecto)

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

#### Vista `probabilidad` — el desglose justificado (ago 2026)

```
GET /api/competencia-detalle?vista=probabilidad&id_proceso=CO1.REQ.4821   ← canónica
GET /api/probabilidad-desglose?id_proceso=CO1.REQ.4821                    ← alias (rewrite)
```

La tarjeta dice «Prob. estimada: 23 %». Un contratista no puede decidir con eso: no sabe si es
buena, ni qué la causa, ni cómo discutirla. Esta vista devuelve la **misma cifra** abierta en seis
pasos, cada uno con `formula`, `datos_entrada` (con la **fuente citada**), `calculo`, `resultado`,
`confianza` y `aporte_pp`. Lo consume el modal que se abre al pulsar la cifra en la app.

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `id_proceso` | requerido | `id_del_proceso` de SECOP II. Se busca en el corpus **activo** y, si no está, en el **histórico** (el desglose de un proceso ya adjudicado es el que sirve para contrastar) |
| `costo_preparacion` | — | Costo estimado de preparar la oferta, en COP. **Sin default**: no existe en ninguna fuente del proyecto y ponerle uno sería inventarse la cifra con la que se decide si vale la pena presentarse |
| `refrescar` | — | `1` para saltarse la caché |

**La URL del encargo, `/api/probabilidad-desglose`, existe como `rewrite` de `vercel.json`** — que
no cuenta como función. Hay prueba de que apunta al endpoint real *con* `vista=probabilidad`. El
frontend llama a la **canónica**: si el rewrite fallara, el modal tiene que seguir funcionando
(misma lección que `/api/admin/cargar-experiencia-genesis`).

**Los seis pasos** — siempre los seis, también cuando no aplican:

| # | Paso | Fórmula |
| --- | --- | --- |
| 1 | Probabilidad base por competencia histórica | `P_base = 1 / (1 + promedio_oferentes_entidad)` |
| 2 | Nivel de competencia de la entidad — **informativo: NO multiplica** | `× 1` — su efecto ya está entero en el paso 1 |
| 3 | Prórroga del cierre | `× 1,20` si el cierre se movió por adenda |
| 4 | Baja de mercado de la entidad | rampa: `× 1,10` hasta 2 % · `× 0,85` desde 5 % · interpolación lineal entre ambos |
| 5 | Colisión de cierres | `× 1,15` si la entidad cierra ≥2 procesos **el mismo día** |
| 6 | Límite `[0,01 · 0,95]` y redondeo | `min(0,95, max(0,01, P))` |

Publicar solo los pasos que mordieron dejaría al lector sin poder distinguir «no hubo prórroga» de
«no se miró la prórroga», que es justo la distinción que esto existe para hacer.

**El paso 2 se conserva aunque ya no multiplique**, y por la misma razón: el nivel de competencia SÍ
se le enseña al dueño en la tarjeta, así que un desglose que lo omitiera lo dejaría sin explicación
de por qué un «competencia baja» bien visible no suma ni un punto. El paso narra el nivel, publica
`factor_aplicado: 1` y explica el doble conteo que motivó retirarlo. Hay prueba de que aporta 0 pp.

**Dos invariantes lo sostienen, y hay prueba de las dos:**

1. **`probabilidad_final` es EXACTAMENTE el `p_ganar` que sirve `/api/oportunidades`** para ese
   mismo proceso. `desglosarProbabilidad` **no recalcula nada**: narra la traza de
   `lib/probabilidad.trazaP`, que es la única implementación. Un segundo cálculo «equivalente hoy»
   divergiría a la primera corrección aplicada a uno solo, y aquí la divergencia sería entre el
   número que se enseña y el número que lo justifica.
2. **La suma de los seis `aporte_pp` es exactamente la cifra final.** El paso 6 absorbe además el
   residuo del redondeo a dos decimales de los cinco anteriores — que es literalmente lo que ese
   paso hace. Una tabla de aportes que no cuadra con su total es peor que no tener tabla.

**Confianza**, con vocabulario cerrado (`Alta` · `Media` · `Baja` · `Sin dato`): sale del número de
procesos que respaldan cada dato (`≥10` → Alta, `≥5` → Media, respaldo por departamento → Baja) y
de si el dato existe. **Un ajuste (pasos 2-5) con `Sin dato` aporta exactamente 0 pp**: el dato no
está y no se aproxima. El **paso 1 es la excepción declarada** — con `Sin dato` sigue aportando los
puntos del supuesto conservador de 5 rivales, porque un cero ahí dejaría la probabilidad en cero,
que no es más honesto sino otro número inventado (y el que peor decisión provoca). El supuesto
viaja escrito en `datos_entrada.fuente` y en el `fundamento`, y hay prueba de que lo declara.

Además de `desglose`, la respuesta trae `resumen_ejecutivo` (3-4 líneas en lenguaje de negocio, con
el umbral `costo ÷ probabilidad` cuando se envía un costo) y `justificacion_texto`, el texto plano
que copia el botón **«Copiar justificación»** del modal — el mismo contenido en otro formato, no un
segundo desglose.

- **Caché** `indice:desglose_p:{id}` con **TTL de 300 s**. El sello incluye el corpus, los dos
  índices **y el costo de preparación consultado**: servir desde caché un resumen calculado con
  otro costo sería recomendar sobre una cifra que nadie pidió.
- `id_proceso` ausente → `400` con el ejemplo de uso; inexistente → `404` con el motivo, nunca un
  `200` con el desglose de otra cosa. Vista desconocida → `400` **antes** de tocar Redis.

> **Dos discrepancias entre el encargo y el código, resueltas a favor del código.** El encargo
> describe la colisión de cierres como «≤7 días»: `lib/probabilidad.claveColision` agrupa por
> `entidad|YYYY-MM-DD`, es decir el **mismo día exacto**, y ensancharlo no sería documentar sino
> cambiar la probabilidad de todo el corpus. Y el encargo lista cuatro factores cuando el código
> aplica **seis**: faltaban los dos de baja de mercado, que son los que convierten la respuesta en
> «P(ganar *a un precio que valga la pena*)».

#### Vista `paa` — el Plan Anual de Adquisiciones (ago 2026)

```
GET /api/competencia-detalle?vista=paa[&entidad=Alcaldía de Ibagué][&unspsc=72141000]   ← canónica
GET /api/paa[?entidad=…][&unspsc=…]                                                     ← alias (rewrite)
```

La única fuente que dice **qué va a salir antes de que salga**: objeto, valor y mes previsto de todo
lo que una entidad piensa contratar en el año. Hasta ago 2026 la app solo ingería `p6dx-8zbt`
—procesos **ya publicados**— y por eso avisaba cuando el proceso ya había salido. Devuelve lo
previsto para los **próximos 12 meses** con los seis campos del encargo: `entidad`, `objeto`,
`unspsc`, `cuantia_estimada`, `fecha_estimada_publicacion` y `modalidad`.

| Parámetro | Default | Descripción |
| --- | --- | --- |
| `entidad` | — | Subcadena, sin distinguir mayúsculas. Acota el barrido en el servidor |
| `unspsc` | — | Código de 2/4/6/8 dígitos. La coincidencia la decide **`lib/unspsc.emparejar`** (jerarquía), no un prefijo: un producto dentro de la clase pedida casa, y una publicación a nivel de familia también. Un código ilegible es un `400`, no una lista vacía |

**Es una consulta EN VIVO: no escribe nada, no lee el corpus y no toca Redis.** Sale del despachador
antes de mirar Upstash — exigirle credenciales la dejaría caída por una avería que no le incumbe.

Tres cosas que la respuesta declara y que no son adorno:

- **`verificado: false`.** Este entorno recibe `403` de `datos.gov.co`, así que ni el id `9sue-ezhx`
  ni un solo nombre de columna se pudieron abrir contra la fuente. Se aplica el precedente del
  proyecto para columnas no verificables —lista de **candidatas** + **censo publicado**, como
  `lib/indice_competencia` y `lib/columnas_historicas`—. Si el censo dice `sin_resolver`, el arreglo
  es de una línea: añadir el nombre real (está en `censo.claves_observadas`) a `CANDIDATAS` de
  `lib/paa.js`. Ninguna consulta se rompe entre tanto, y que no se reconozcan las columnas es un
  **`200` con la lista vacía y el diagnóstico**, nunca un `4xx`.
- **`tasa_de_acierto: null`.** Un PAA es un **plan, no un compromiso**: se modifica, se aplaza y se
  cancela. Medir qué porcentaje acaba publicándose exige cruzar el PAA de un año contra
  `licitaciones:historico:mes:*` del siguiente, y hasta entonces no hay cifra que publicar. La
  advertencia viaja **en la respuesta**, no solo en la pantalla.
- **`descartados` y `barrido.truncado`.** Una fila con la fecha ilegible **no entra** en «los
  próximos 12 meses» —situarla a la fuerza sería afirmar lo que no se sabe— y se cuenta; el barrido
  tiene presupuesto y dice cuándo se cortó. Invariante probada: `total + Σ descartados =
  barrido.filas_leidas`.

En la web es el toggle **«Ver PAA»** de la pestaña Licitaciones, con su propio filtro de entidad. Lo
previsto se pinta en **sección aparte**, con badge `PAA · planeado` frente al `Activo · abierto` de
los procesos publicados, y **sin probabilidad, sin puertas y sin veredicto de RUP**: no hay pliego
que juzgar, y meterlo en la misma lista ordenada lo haría parecer comparable con un proceso vivo.

### `GET /api/resumen` (protegido)

El panel (pestaña `#/admin` de la página única). Responde, sobre los **mismos procesos que sirve la app**, las preguntas
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

### `GET|POST|DELETE /api/admin/rup` (protegido)

Carga del RUP **por archivo JSON**, desde la pestaña `#/admin`. Antes los perfiles eran datos hardcodeados
en `lib/perfiles.js`: un código UNSPSC nuevo o un indicador del balance del año exigían tocar código
y desplegar, y el dueño no tiene terminal.

- `GET` → el RUP vigente en el **mismo esquema que se sube** (`{perfiles: {helder, genesis,
  consorcio}}`). Sin carga previa devuelve los valores del repositorio con `fuente: "hardcoded"` y
  una advertencia. Descargar → editar → volver a subir es un ciclo cerrado, y hay una prueba que
  pasa la salida del `GET` por el validador del `POST`.
- `POST` → valida campo por campo, **acumulando todos los errores** (`400` con
  `[{campo, error, valor_recibido}]`), y guarda de forma atómica.
- `DELETE ?perfil=…` (ago 2026) → elimina un RUP cargado. **Dos semánticas** y la respuesta declara
  cuál aplicó (`tipo` + `redirigir`): un perfil **dinámico** (`rup_…`, subido en PDF) deja de
  existir — se borran su clave, sus cuatro whitelists derivadas, sus borradores de APU y sus
  cachés, y la web vuelve a la landing —; un perfil **del dueño** (helder/genesis/consorcio) pierde
  su entrada del archivo cargado y **vuelve al respaldo del repositorio** (los perfiles del
  repositorio no se pueden borrar: quedarse sin perfiles dejaría la app muda). Si era la última
  entrada, caen el archivo y el sello en **un solo DEL** — el sello ausente hace que todas las
  instancias vuelvan al respaldo. Lo que NO borra, a propósito: `config:experiencia` (configuración
  compartida del negocio, no por perfil) y los borradores de APU de un perfil del dueño (el perfil
  sigue existiendo). `perfil` es obligatorio y sin default — «eliminar sin decir cuál» borraría el
  de otro. En la UI: botón «Eliminar RUP» de la pestaña `#/admin`, con modal de confirmación cuyo
  texto depende del tipo de perfil.

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
- Una carga de RUP **invalida las dos cachés que dependen de él**: la del dashboard (`resumen:*`,
  TTL 5 min) y la de la auditoría de cobertura (`cobertura:*`, TTL 1 h). Sin eso, un código recién
  inscrito seguiría apareciendo como «hueco» durante una hora.

### `GET|POST /api/admin/experiencia` (protegido)

La lista de contratos **ya ejecutados** por el dueño. El RUP dice a qué *puede* presentarse; esto
dice en qué *sabe* trabajar, y son dos cosas distintas.

```jsonc
POST /api/admin/experiencia          // header x-historico-token
{
  "contratos": [{
    "no_contrato": "001-2024",
    "entidad": "ALCALDIA MUNICIPAL DE PURIFICACION",
    "objeto": "CONSTRUCCION DE PLACA HUELLA EN LA VEREDA EL PORVENIR…",
    "modalidad": "Licitacion publica",
    "participacion": 100,
    "valor_cop": 350000000,
    "fecha_inicio": "2024-03-15", "fecha_fin": "2024-09-15",
    "valor_smmlv": 450.5
  }]
}
→ { ok, origen: "cuerpo", contratos_cargados, terminos_extraidos, ejemplos_terminos: [...] }
```

**Y sin pegar nada** (ago 2026). Los 106 contratos de Génesis ya viajan en el repositorio
(`experiencia_genesis_106.json`), así que el servidor no necesita que nadie se los mande:

```
POST /api/admin/experiencia?origen=repositorio     // sin cuerpo
POST /api/admin/cargar-experiencia-genesis         // el mismo, por su alias
→ { ok, origen: "repositorio", archivo, contratos_cargados, terminos_extraidos, … }
```

Existe porque **el dueño no tiene terminal**: `cargar_experiencia.sh` no le sirve y necesitaba
hacerlo con un clic. Tres decisiones que sostienen esto:

- **No es un endpoint nuevo, y no podía serlo.** El plan Hobby de Vercel admite **12 funciones por
  despliegue** y el repositorio está exactamente en 12 (hay prueba que las cuenta): un archivo más
  bajo `api/` no rompe el endpoint nuevo, **rompe el sitio entero**. La URL que se pidió existe como
  `rewrite` en `vercel.json` — que no cuenta como función—, y hay prueba de que apunta al endpoint
  real con su `origen`. El panel llama a la canónica a propósito: si el rewrite fallara, el botón
  tiene que seguir funcionando.
- **Plegarlo aquí regala la no-duplicación.** Lo único que cambia entre las dos formas es de dónde
  salen los contratos; desde `validarContratos` en adelante es literalmente el mismo camino —el
  mismo guardado, la misma invalidación de la caché de cobertura, la misma forma de respuesta—, así
  que no hay dos rutas que puedan divergir. `origen` viaja en la respuesta para poder distinguirlas.
- **El archivo se lee con `require` estático**, no con `fs` sobre una ruta construida: es como el
  repositorio carga todos sus JSON, y es lo que hace que el tracer de Vercel **lo meta en el
  bundle**. Con una ruta dinámica el archivo no viaja al despliegue y el endpoint respondería 500
  **solo en producción** (`includeFiles` apunta a `data/**` y este archivo está en la raíz).

El origen se lee de la **query** y no del cuerpo por dos razones. La primera: así la carga es un POST
**sin cuerpo**, que es lo que permite dispararla con un botón —y con el alias— sin fabricar un JSON
que el servidor ya tiene. La segunda es de seguridad del dato: `validarContratos` lee solo
`datos.contratos` e **ignora las claves extra de la raíz**, así que un flag mal escrito *dentro* del
JSON cargaría los contratos pegados con un 200 idéntico —fuente equivocada y sin síntoma—; en la
query, un `?origen=repo` cae al 400 de «body vacío», que es ruidoso. Hay prueba de las dos cosas.

Y **un GET al alias da `405` con `Allow: POST`**, no un 200. Pegar la URL en Chrome es un GET, que es
justo la vía de disparo del dueño sin terminal: la rama GET retornaba antes de mirar el origen y
respondía `200 {ok:true, cargada:false, contratos_cargados:0}` — un «no hice nada» con cara de éxito
y un cero que se lee como «cargué cero contratos». El 405 explica en `como_hacerlo` cuál es el botón.
No se convirtió en un «GET que escribe» —lo dispararía cualquier prefetch del navegador—, aunque
`/api/sync` sí lo haga: allí es una sincronización idempotente y aquí una escritura de configuración.

Validación (`400` con `[{campo, error}]`, sin guardar nada): `objeto` obligatorio y ≤ 1 000
caracteres, **`valor_smmlv` o `valor_cop`** con un número positivo, `participacion` entre 0 y 100,
máximo **500 contratos** por carga y arreglo no vacío. Los números pueden llegar como cadena
(`"350.000.000"`, `"450,5"`): el dueño arma este JSON copiando de una hoja de cálculo.

De cada objeto se extrae un **vocabulario del oficio** (`lib/experiencia.js`), y ahí están las tres
decisiones que importan:

- se tokeniza sobre texto **normalizado** (`lib/semantica.norm`: sin tildes, ñ→n, minúsculas), la
  misma base de comparación que el resto de vocabularios nuevos del proyecto;
- **los tokens con dígitos se descartan** (`2024`, `cm001`): son el número del proceso, no el
  trabajo — la misma lección de `esObjetoGenerico`. Si entraran, cualquier proceso que mencione un
  año ganaría similitud gratis;
- las **stopwords** incluyen el trámite contractual (`prestacion`, `servicios`, `contrato`,
  `objeto`): un término que está en *todos* los objetos no distingue ninguno.

`GET` devuelve lo cargado (o `cargada: false` con el mensaje que el panel enseña tal cual). Guardar
**borra la caché de la auditoría de cobertura**: sus números salen de este vocabulario.

### `GET /api/admin/cobertura-rup` (protegido)

**Qué códigos UNSPSC le faltan al RUP.** Recorre `licitaciones:historico:mes:*` (procesos ya
adjudicados, el keyspace que ninguna purga toca) y responde con qué códigos adjudica el mercado los
objetos que el dueño ejecuta y que **no están inscritos**. Es la lista que hay que mirar antes de
cada renovación anual del RUP.

```
GET /api/admin/cobertura-rup?perfil=helder[&usar_experiencia=false][&refrescar=1]
```

`perfil` es **obligatorio** (helder | genesis | consorcio): no hay default, porque la respuesta se
lee como «lo que te falta a ti» y servir la de otro perfil por omisión sería la peor forma de
equivocarse. Cascada, en orden:

| Paso | Regla | De dónde sale |
| --- | --- | --- |
| a | proceso **adjudicado** | `esAdjudicado` de `lib/indice_competencia` |
| b | **relevancia**: similitud ≥ 0.15 con la experiencia cargada; sin ella, vocabulario de obra | `lib/experiencia` / `filtros.hayVerboDeObra` |
| c | **pertinencia** del objeto | `filtros.evaluarPertinencia`, tal cual |
| d | código **a nivel de clase o producto** y **no inscrito** en el RUP | `lib/unspsc` |
| e | **segmento** 70–95 menos los servicios no constructivos | `filtros.SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS` |

Los pasos (c) y (e) **reutilizan** las listas que ya decidían otra cosa en la app, no unas nuevas:
si un segmento no ancla obra para la capa anti-suministro, tampoco puede ser un hueco de obra aquí.

Cada código faltante viaja con: procesos adjudicados, cuántos son **altamente** (≥ 0.30) y
**moderadamente** (≥ 0.15) similares, score promedio, hasta 5 objetos de ejemplo (los más parecidos
primero, con los términos en común), top 3 de entidades, rango de cuantías, segmento/familia y una
recomendación en prosa. El orden es el **puntaje combinado** `procesos × 0.6 + score × 100 × 0.4`.

**Criticidad** (cascada; el primer nivel que se cumple manda):

| Nivel | Con experiencia cargada | Sin ella |
| --- | --- | --- |
| 🔴 CRÍTICO | ≥ 10 procesos **y** ≥ 1 altamente similar **y** segmento de obra pura (72/77/81/95) | ≥ 10 y obra pura |
| 🟠 ALTO | ≥ 5 procesos, o ≥ 2 con score promedio ≥ 0.20 | ≥ 5 |
| 🟡 MEDIO | ≥ 2 procesos y ≥ 1 altamente similar | ≥ 2 |
| ⚪ BAJO | el resto | 1 proceso |

El encargo describía estos umbrales con condiciones que se solapan («2-4 procesos **o** score ≥
0.1» y «1 proceso **o** score < 0.1» clasifican de dos formas el mismo código). Se resolvió como
cascada, con la lectura que el propio encargo fija en sus casos: **3 procesos con similitud floja
son BAJO**. Y **un solo proceso nunca pasa de BAJO**, por perfecta que sea la similitud: un contrato
no es una tendencia, y lo que está en juego es un código que hay que sostener un año en el RUP.

**Sin experiencia cargada el score viaja en `null`**, no en 0: no se inventa una cifra de similitud
contra una experiencia que nadie ha cargado, y la respuesta lo declara en `experiencia_utilizada` y
en `mensaje`.

Lo excluido **se enseña**, nunca desaparece: `excluidos_por_no_pertinentes` y
`excluidos_por_baja_relevancia` (con el score que los dejó fuera). Y el `embudo` tiene invariante
probada — `sin_adjudicacion + baja_relevancia + no_pertinentes + sin_codigo_utilizable +
sin_codigo_faltante + con_codigo_faltante = procesos_historico`: cada proceso muere en exactamente
un paso, o ninguna cifra de la auditoría sería demostrable.

Solo lee (un `POST` responde `405`). Cachea 1 h en `cobertura:{perfil}:{exp|base}`; el valor lleva
el sello del RUP **y** el de la experiencia, así que cargar cualquiera de los dos la invalida sola.
`?refrescar=1` la salta. No requiere full ni backfill para funcionar, pero **sí necesita corpus
histórico**: sin él lo dice explícitamente, en vez de devolver una lista vacía que se leería como
«no te falta nada».

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

**(i) El «en 0 procesos» era un campo inexistente.** El detalle en línea del panel leía
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

## Índice de baja de mercado (¿a qué precio se adjudica?)

El índice de competencia dice **cuántos** se presentan. Este dice **a cuánto se adjudica**, que es la
otra mitad de la decisión de precio. Sale entero del corpus histórico que ya está en Redis: **no
re-extrae nada de SECOP II**.

```
BAJA = (precio_base − valor_total_adjudicacion) / precio_base · 100
```

**Cómo se calcula** (`lib/indice_baja.js`, sobre `licitaciones:historico:mes:*:chunk:*`):

1. Recorre el histórico **mes a mes** (reanudable, con candado `lock:indice_baja` de 300 s) y
   deduplica por `_k`.
2. Se queda solo con los procesos que tienen `precio_base > 0`, valor adjudicado `> 0` y un
   **adjudicatario real** (`nit_del_proveedor_adjudicado` distinto de «No Definido»: si no hubo
   ganador, su valor adjudicado no es un precio de mercado).
3. Aplica **dos filtros de higiene** que salieron del censo del corpus real, no de la teoría:
   - adjudicado **< 30 %** del oficial → lote parcial o error (295 casos en producción);
   - adjudicado **> 110 %** del oficial → dato malo (221 casos).
   Una baja negativa **leve** sí se conserva: no es un error.
4. Acumula un **histograma** por grupo (no la lista de procesos): es lo que permite reanudar la
   construcción sin reventar el tope de 1 MB por valor de Upstash. El precio es resolución de
   1 punto porcentual, que sobra para decidir.
5. Publica cuatro hashes con **swap atómico** (`…:nuevo` + `RENAME`) más `indice:baja:meta`.

**Cuatro granularidades, en cascada de más específica a más general:**

| Granularidad | Responde | Mínimo |
|---|---|---|
| `entidad_familia` | «INVIAS baja 8 % en obra vial y 2 % en consultoría» | 5 procesos |
| `entidad` | «INVIAS baja 6 % en general» | 5 procesos |
| `departamento_familia` | respaldo cuando la entidad no tiene base propia | 5 procesos |
| `departamento` | último respaldo territorial | 5 procesos |
| `segmentos` (anidados en la entidad) | baja por segmento UNSPSC de 2 dígitos | **3 procesos** |
| `por_modalidad` (anidado en **todos** los grupos) | baja por modalidad de contratación | 5 procesos |

`bajaDeMercado(indice, lic)` las prueba en ese orden y **siempre** reporta cuál respondió en
`granularidad_utilizada`: una cifra sin su origen no se puede auditar ni discutir. La cascada **solo
baja en especificidad** — pedir `entidad` no puede acabar respondiendo con `entidad_familia`.

### Por modalidad de contratación (ago 2026)

La mediana global mezclaba **Licitación Pública con Mínima Cuantía**, y el daño va en una dirección
concreta: la mínima cuantía se adjudica una y otra vez por el presupuesto oficial, así que arrastra la
mediana al **0 %** y deja la impresión de que *nunca hay que descontar* — justo en los procesos
grandes, que son los que se ganan o se pierden por precio.

Una precisión que evita malinterpretar la cifra: el corpus histórico **ya está filtrado** a modalidades
competitivas (`transformar` aplica `modalidad_competitiva` **antes** de guardar), así que aquí nunca
entró Contratación Directa. Lo que se mezclaba eran las **seis competitivas entre sí**. Aun así la
lista blanca hace un trabajo real al reagrupar: `licitaciones:historico:mes:*` **no se purga nunca**,
de modo que siguen vivos registros ingeridos *antes* de que «Invitación Privada» y «Enajenación»
pasaran a excluidas — esos caen en `sin_modalidad` y **se cuentan**.

- Las cubetas se **derivan** de `MODALIDADES_COMPETITIVAS` (`lib/filtros`), nunca se copian; el
  `require` va **diferido**, igual que en `lib/apu/inferencia`, y hay prueba de que no hay ciclo. Una
  prueba ata `modalidadCanonica` a `modalidad_competitiva`: **todo lo que la ingesta acepta tiene
  cubeta y nada que rechace la tiene**.
- **La modalidad refina *dentro* de cada nivel, no es un nivel más.** `GRANULARIDADES` es una cascada
  ordenada con la invariante de que solo baja en especificidad; meter la modalidad como escalón
  obligaría a decidir si «entidad+modalidad» es más o menos específico que «entidad+familia», pregunta
  que no tiene respuesta buena. `granularidad_utilizada` conserva **exactamente** su significado y
  `modalidad_utilizada` dice si hubo refinamiento — dos preguntas, dos campos.
- Se **agrupa** por la clave canónica (`licitacion publica`) y se **muestra** la original del dataset
  (`Licitación pública`), igual que `claveCanonica`/`nombre` en las entidades.
- **Compatibilidad**: `indice:baja` no se purga nunca, así que en producción sigue vivo el hash de la
  versión anterior, **sin `por_modalidad`**. Sin esa clave `bajaDeMercado` se comporta *exactamente*
  como antes — no hace falta reconstruir el índice para que la app siga sirviendo. Hay prueba.
- `meta.por_modalidad` publica la misma apertura **global**, y `sin_modalidad` + Σ procesos de las
  cubetas = `procesos_analizados`, con prueba: sin esa igualdad una modalidad podría perderse en
  silencio y las cifras seguirían pareciendo razonables, solo que sobre menos procesos.

**Niveles con cortes FIJOS**, no tertiles: `alto` (> 5 % de baja) · `medio` (2–5 %) · `bajo` (< 2 %).
«Muchos oferentes» solo significa algo comparado con el mercado, pero 8 puntos de baja son 8 puntos
de margen compita quien compita. Con tertiles siempre habría un tercio «alto» aunque nadie descontara.

**Aquí el CERO sí es un dato**, al revés que `anticipo_pct = 0` o el contador de oferentes: adjudicar
por el presupuesto oficial es un hecho normal y en producción es **la mediana**. Tratarlo como
ausencia vaciaría el índice. Lo que sí es «sin dato» es no tener las dos mitades en la misma fila.
Por eso `indice:baja:meta.baja_exactamente_cero` viaja siempre: si un día se dispara hacia el total,
la causa no sería el mercado sino que `valor_total_adjudicacion` esté copiando a `precio_base`.

**Dónde se usa:**

- `/api/oportunidades` → `baja_mercado`, `baja_entidad` y `baja_segmento` en cada proceso
  (**solo con token**: es inteligencia de precio), y el orden `?ordenar_por=baja`, que pone primero
  las entidades que **menos** descuentan — se puede ofertar cerca del oficial y conservar margen.
  `sin_dato` puntúa −1 y jamás encabeza la lista haciéndose pasar por «no descuenta nada».
- `lib/probabilidad.js` → **un** ajuste sobre `P(ganar)`, continuo: una rampa que va de ×1,10 cuando
  la entidad adjudica por el presupuesto oficial (≤2 % de baja) a ×0,85 cuando descuenta ≥5 %
  (ganar exige bajar), interpolando linealmente entre los dos. Eran dos escalones hasta ago 2026, y
  cruzar el corte del 5 % costaba un **15 %** de probabilidad de golpe.
  **Y aquí hay que contar bien lo que mejora.** La rampa suaviza la *función*, pero el *dato* sigue
  cuantizado: este índice publica la mediana como una **cubeta entera** del histograma, así que en
  producción solo existen …2, 3, 4, 5… y lo que se ve no es una curva sino una **escalera de cuatro
  peldaños** (`≤2 → ×1,10 · 3 → ×1,0167 · 4 → ×0,9333 · ≥5 → ×0,85`). Lo que baja es la **altura del
  peldaño más alto: del 15,0 % al 8,9 %**. Decir «ya no hay saltos» sería falso.
  ⚠️ Dos avisos más. (1) Las comparaciones pasaron de estrictas (`>5`, `<2`) a **inclusivas**, así que
  las medianas de exactamente **2 y 5 cambiaron de factor** (antes caían en la zona neutra ×1,00;
  ahora reciben ×1,10 y ×0,85): son valores frecuentes, no una sutileza de frontera. (2) Los codos de
  la rampa **no** coinciden con las fronteras del badge de `nivelPorBaja` (`>5` → «alto», `>=2` →
  «medio»), así que una mediana de exactamente 5 se pinta «medio» y recibe el ×0,85. Es deliberado
  —«cómo se rotula» y «cuánto multiplica» son dos preguntas— pero conviene saberlo antes de
  «arreglar» una de las dos para que case con la otra.
- `/api/diagnostico` → bloque `baja_de_mercado`, con el reparto por granularidad **sobre los
  visibles**: dice si el índice alcanza a cubrir lo que la app sirve hoy.
- la pestaña `#/admin` → tarjeta con la baja del mercado y los dos top-3, más el botón de reconstrucción.

### `GET /api/indice-baja` (protegido)

```
GET /api/indice-baja                    → índice completo + meta   (caché 1 h, X-Cache: HIT|MISS)
GET /api/indice-baja?entidad=INVIAS     → una entidad, por nombre o por NIT
GET /api/indice-baja?entidad=899999055  → por NIT: devuelve TODAS las que lo comparten
GET /api/indice-baja?modalidad=licitacion+publica
                                        → la misma estructura, con la baja de ESA modalidad
                                          (+ `global_modalidad`, la cifra de mercado de esa modalidad)
GET /api/indice-baja?entidad=INVIAS&modalidad=minima+cuantia   → los dos COMPONEN
GET /api/indice-baja?reconstruir=true   → lo reconstruye (no re-extrae nada de SECOP II)
GET /api/indice-baja?refrescar=1        → salta la caché
```

`?modalidad=` se canoniza con **la misma función que agrupa al construir el índice**: si aceptara algo
que la construcción no agrupa, la consulta devolvería vacío sin explicar por qué. Una modalidad
desconocida —incluida `contratacion directa`, que la ingesta nunca guardó— es un **400 con la lista de
las válidas**, no un 200 vacío: escribir mal el parámetro y recibir «no hay datos» es indistinguible de
que no los haya. Con `?entidad=` además, un 404 distingue «esa entidad no existe» de «existe pero no
tiene adjudicaciones de esa modalidad», y en el segundo caso dice cuáles sí tiene.

**No hay endpoint `/api/baja-mercado`.** El plan Hobby de Vercel admite **12 funciones por despliegue**
y el repositorio ya está exactamente en 12 (hay prueba que las cuenta), así que un archivo más rompería
el despliegue entero, no solo el endpoint nuevo. `baja_mercado` es el **campo** que `/api/oportunidades`
sirve en cada proceso; el endpoint del índice es este.

Un NIT compartido devuelve **todas** las entidades que lo usan en vez de elegir una en silencio: las
regionales de un mismo organismo publican con el NIT de la matriz, y un alias ambiguo no es un alias
sino una respuesta equivocada.

La reconstrucción vive **aquí y no en `/api/diagnostico`**, que está documentado como *solo lee* —no
escribe, no toma candados, no dispara sincronizaciones—: esa garantía es lo que permite llamarlo sin
miedo cuando algo va mal en producción.

### Cómo construirlo

Se construye solo al terminar un `/api/sync?modo=full` y tras un backfill histórico. A mano:

```
GET /api/sync/historico?reconstruir_baja=true   (comparte presupuesto con los otros derivados)
GET /api/indice-baja?reconstruir=true           (endpoint dedicado)
```

También va incluido en `?reconstruir_todo=true`. Ninguna de las dos vías re-extrae nada.

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
  (`respuestas_al_procedimiento` y equivalentes). **Sigue en el registro pero ya no se sirve al ojo
  humano** (ago 2026): esas columnas son **ex-post** y el corpus activo solo tiene procesos abiertos,
  así que ahí el campo vale `baja` **siempre** —la suite lo mide y lo publica en cada corrida—. Se
  retiraron el chip de la tarjeta y el filtro `?nivel_competencia=`; quien responde esa pregunta con
  base es `competencia_entidad`, y su badge ya está a dos centímetros en la misma tarjeta. El campo
  no se retira del registro porque eso exigiría una full; lo que se retira es **presentarlo como una
  medición**. Historia completa en `docs/AUDITORIA_INTEGRAL.md` §4.1.
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

## Lector de pliegos · el formulario de cantidades de un PDF (ago 2026)

**Qué resuelve.** El formulario de cantidades (Formulario 1 · presupuesto oficial) «vale más que todo
lo demás junto»: con **ítem + unidad + cantidad** se puede valorar un proceso completo con precios
propios, y sin él hay que inferir las cantidades del objeto, que es adivinar. Este módulo convierte
ese documento en una lista estructurada y editable.

**Qué NO resuelve, y conviene tenerlo claro antes de leer el resto:** no hay precios. No es una
biblioteca de APU valorados, no calcula rentabilidad, no propone AIU. Entrega ítem, unidad y cantidad
—y el AIU **declarado** cuando el pliego lo declara, solo para validar la aritmética—. Eso lo hace el
**editor de APU** (pestaña `#/apu`, `lib/apu/*`), que es otra cosa y vive aparte.

**Dos secciones y dos catálogos, a propósito.** El lector (sección «Cargar pliego PDF» de la pestaña APU) usa
`data/catalogo_apu.json`: 93 ítems **sin precios** y con sinónimos, es decir un **diccionario de
reconocimiento** para casar el texto de un pliego. El editor (la misma pestaña `#/apu`) usa
`data/apu_catalogo.json`: 174 ítems **con precios** (17 de referencia + 157 del contrato adjudicado Nogal 2025, ver `docs/CALIBRACION_APU.md`), composición y rendimiento, es decir la
**biblioteca de costeo**. Son preguntas distintas —«¿qué ítem es esta fila?» frente a «¿cuánto cuesta
este ítem?»— y fusionarlas obligaría a elegir entre perder recall de reconocimiento o inventar
precios. Lo que sí se hace es **emitir el código del catálogo de precios cuando el ítem reconocido
existe allí**, para que no haya dos identidades del mismo ítem.

**Los dos endpoints son ACCIONES de `lib/handlers/apu/editor.js`, no ficheros propios**, y por una razón
dura: el plan Hobby de Vercel admite **12 funciones por despliegue** y con dos ficheros más eran 14 —
el despliegue entero se rechazaba. Su lógica vive en `lib/apu_extraer.js` y `lib/apu_descargar.js`;
el despachador solo las llama, y las despacha *antes* de tocar Redis porque ninguna lo necesita.

### Dónde corre cada cosa, y por qué

```
NAVEGADOR (lector de pliegos)                          SERVIDOR                     TERCERO
────────────────────                           ────────                     ───────
PDF (archivo)  ──┐
                 ├─▶ pdf.js (CDN, v3 UMD)
URL del PDF ─────┘   getTextContent()
      │              agrupa por Y  → fila
      │              hueco en X    → TAB
      │                    │
      │                    └─ texto ──▶ POST /api/apu/extraer-texto
      └─ CORS ──▶ POST /api/apu/descargar        │  parsearPliego  (3 vías)
                  (SSRF acotado, %PDF- verificado)│  validación     (3 niveles)
                                                  │  semáforo       (2 ejes)
sin capa de texto                                 │  mapearTabla    → catálogo
      │                                           ▼
      └─▶ rasteriza a JPEG <1MB ──▶ imagenes_base64 ──▶ OCR.space
          (una petición por página)                     (apikey del servidor)
```

**El PDF se lee en el navegador, no en la función.** `pdfjs-dist` en Node pesa decenas de MB y hay
que sacarlo del *request path*; el OCR «no cabe en el mismo proceso». Medido: `tesseract.js@7` +
`spa.traineddata` son **51 MB de `node_modules`** y 9 dependencias npm — cabe en el límite de 250 MB
de Vercel, pero rompe la regla central del proyecto (sin `package.json`, sin dependencias) y necesita
además un rasterizador nativo. El navegador ya tiene motor de PDF y tiempo de sobra: hace la parte
cara y manda **texto**. El texto de un pliego de 120 páginas son ~0,34 MB contra el tope de 4,5 MB del
cuerpo de una función: sobra un factor de 13.

**Las columnas se conservan por coordenadas.** `getTextContent()` devuelve cada fragmento con su
matriz de transformación. `public/apu.js` agrupa por **Y** (tolerancia ≈ ½ altura de línea) para
formar la fila y mide el **hueco en X** entre fragmentos para decidir el separador: hueco grande →
**TABULADOR**, hueco pequeño → espacio. Si en vez de esto se mandara `str` concatenado, las columnas
se perderían y todo el parseo dependería de heurísticas de último recurso.

**La versión de pdf.js está clavada en 3.11.174 por un motivo, no por inercia:** desde la v4,
`pdfjs-dist` ya **no publica build UMD** (es ESM puro, incluido `legacy/build/`), así que un `@latest`
dejaría de definir `window.pdfjsLib` y rompería la carga de golpe y en silencio.

**El worker se construye como blob del mismo origen.** `new Worker(url)` clásico **no admite una URL
de otro origen**, así que apuntar `workerSrc` al CDN es el fallo intermitente típico de pdf.js. Se
trae por `fetch` y se envuelve en un `Blob` local. Tres niveles: blob → URL directa → sin worker (en
el hilo principal: funciona y congela la pestaña, y **se avisa**).

### `GET|POST /api/apu/extraer-texto` (protegido · acción de `lib/handlers/apu/editor.js`)

`GET` devuelve el contrato, los umbrales, el catálogo vigente y si el OCR está configurado.
`POST` recibe `{ texto_extraido, objeto_proceso, unspsc, precio_base, imagenes_base64 }` y devuelve
`items[]` con `{ item_id, descripcion_original, unidad, cantidad, confianza, … }`.

**No toca Redis**: ni lee el corpus, ni escribe, ni toma candados. Es una función pura sobre el cuerpo
de la petición, así que no puede dejar nada a medias.

**Tres vías de reconocimiento de fila, y las tres hacen falta:**

| Vía | Cuándo | Cómo |
| --- | --- | --- |
| `posicional` | hay una fila con **≥3 cabeceras** conocidas (`ITEM`·`DESCRIPCION`·`UNIDAD`·`CANTIDAD`·`VR UNITARIO`·`VR TOTAL`) | esa fila define las columnas; las siguientes se leen por posición |
| `firma_unidad` | no hay cabecera, o está partida en dos líneas | «una celda que **es** exactamente una unidad es la señal más barata y fiable de que la fila es un ítem de obra» |
| `aplanada` | el texto llegó con un solo espacio entre celdas | último recurso: se elige la **última** palabra-unidad **seguida de un número** |

La vía `posicional` es la que da la aritmética. El texto de OCR casi nunca la activa —`isTable=true` de
OCR.space promete texto **línea a línea**, no columnas— y por eso el OCR es un respaldo, no la vía
principal.

**Números en formato colombiano.** Punto de miles, coma decimal. Si hay coma, la coma es el decimal;
si solo hay puntos y el último grupo tiene **exactamente 3 dígitos** → miles; si tiene 1-2 → decimal.
Invertirlo multiplica por 1000, que es el error silencioso más caro del módulo. Queda una ambigüedad
residual (`1.234` ¿mil doscientos treinta y cuatro o 1,234?) que **la resuelve la aritmética** cuando
hay precios; sin precios, no se resuelve, y está medida en `tests/apu_bench.js`.

**Tres niveles de validación, con tolerancias derivadas de la FUENTE del error:**

| Nivel | Invariante | Tolerancia | Por qué esa |
| --- | --- | --- | --- |
| Fila | `cantidad × unitario = total` | `max(cantidad/2 + 1, $1)` **pesos** | el error por redondear el unitario al peso es `cantidad × 0,5`. Un porcentaje del total sería incorrecto en las dos direcciones: en una fila de $500 M un 0,5 % admite $2,5 M y **esconde un dígito mal leído** |
| Capítulo | `Σ filas hijas = subtotal` | `max($10, 0,1 %)` | aquí sí se acumulan redondeos de muchas filas |
| Documento | `Σ capítulos = precio_base / (1 + A + I + U + t·U)` | `0,5 %` | `t = 0,19`: sobre la **utilidad** se causa IVA en construcción |

Se prueban **las dos variantes** (con y sin IVA) y se registra **cuál cuadró**: es información sobre
cómo presupuesta esa entidad. Ignorar `t·U` no es un detalle — con `U = 10 %` el IVA añade ≈1,9 pp,
casi **cuatro veces** la tolerancia del 0,5 %.

**El AIU se LEE, no se adivina.** Si el pliego lo declara, el nivel Documento se verifica con ese
valor y **puede** dar verde. Si no, se hace un barrido en 10-35 % que es **DIAGNÓSTICO y nunca produce
verde**: con 25 puntos de parámetro libre continuo casi cualquier suma encuentra un AIU que «cuadra»,
incluidas las tablas incompletas que este nivel debía cazar.

**Semáforo: matriz de dos ejes, sin huecos.**

| Filas que cuadran | Total cuadra con AIU **declarado** | Total no cuadra (o solo por barrido) |
| --- | --- | --- |
| **≥ 98 %** | 🟢 **verde** | 🟡 amarillo |
| **90-98 %** | 🟡 amarillo | 🟡 amarillo |
| **< 90 %** | 🔴 **rojo** — se descarta el parseo | 🔴 rojo |

**El verde exige tres cosas más, y las tres salen de un defecto medido.** El ratio se
calcula sobre las filas que traen las tres cifras, así que las filas sin cantidad
legible salían del denominador en vez de contar contra él: se llegaba a **verde con
la mayoría de las cantidades sin leer**, y el aviso «N ítem(s) quedaron SIN CANTIDAD
legible» aparecía en la *misma* respuesta, contradiciendo a la insignia. Ahora verde
exige además **ninguna cantidad ilegible**, **≥ 5 filas validadas** (con «1 de 1
cuadra» daba 100 % y verde) y que **al menos la mitad de los ítems** esté validada.

Caso aparte, **frecuente y benigno**: cantidades **sin** precios unitarios. El nivel Fila no existe y
el Documento tampoco, así que la única validación es estructural → **amarillo**, nunca rojo (sigue
siendo la mayor parte del valor) ni verde (verde significa «se usa automáticamente», y sin aritmética
no hay nada que respalde un ≥98 %).

**Aquí el falso positivo cuesta más que el falso negativo** — al revés que en el filtrado de
oportunidades. Un 🟡 en la lista de licitaciones se descarta en 5 s; un ítem inventado o una cantidad
mal leída en un presupuesto es un riesgo económico directo. De ahí que el semáforo pueda **descartar
el parseo entero** y que la regla sea: nunca se usa automáticamente una lista a medias.

### El catálogo de ítems (`data/catalogo_apu.json` + `lib/apu_catalogo.js`)

93 ítems de obra con su unidad de pago, las tipologías que los usan y los sinónimos con que las
entidades los escriben. Más el **catálogo cerrado de 22 tipologías** con sus términos ancla.

**Ningún código es `INV-`, y es una regla dura, no una omisión.** «Nunca inventar un código INV que no
exista; si no hay artículo, el ítem nace `LOC-`». El índice oficial de las Especificaciones INVÍAS
2022 (Res. 4561/2022) nunca se pudo abrir desde el entorno de desarrollo (HTTP 403), así que la
numeración de artículos y las unidades de pago están **sin verificar**. El artículo probable viaja
aparte, en `articulo_invias_candidato`, marcado como hipótesis; `codigoInviasPropuesto()` compone el
código que se **emitiría** al confirmarlo. Hay prueba que prohíbe publicar un `INV-`.

**No hay precios**: ni rendimientos, ni composición de insumos, ni jornales. Esa capa exige precios
verificados y ninguna de esas fuentes es accesible; un precio inventado en un APU es plata.

### Mapeo al catálogo (`lib/apu_mapeo.js`)

Cuatro señales ponderadas, y ninguna sola alcanza:

| Señal | Peso | Para qué |
| --- | --- | --- |
| Solapamiento de términos con los sinónimos | **0,55** | señal principal y la más auditable: se devuelven las palabras que sumaron |
| **Levenshtein** sobre la descripción canónica | **0,22** | existe **por el OCR**: un reconocimiento escribe `C0NCRET0` y el solapamiento de términos falla entero ante un carácter cambiado |
| Unidad de pago coincidente | **0,13** | coincidir no da vía libre y discrepar **no veta** |
| Tipología del proceso | **0,10** | **peso, no filtro** (ver abajo) |

`≥ 0,35` se ata a un ítem del catálogo; por debajo nace un ítem **personalizado** con su descripción y
unidad tal como venían — eso no es un fallo: **el pliego manda**.

**«Firme» exige `≥ 0,60`, margen `≥ 0,12` sobre el segundo candidato y al menos dos términos
coincidentes.** El margen era 0,08 y se quedaba corto por una razón medida: el solapamiento se divide
por los términos del *pliego*, así que una descripción corta y genérica alcanza 1,0 en la señal
principal sin ser específica de nada — «CONCRETO 3000 PSI» casaba **en firme** con el concreto de placa
huella cuando podía ser igual de bien el estructural o el de pavimento rígido, y lo que separaba a los
tres era exactamente 0,083. Un empate no da firme por alto que sea el puntaje absoluto.

**La tipología es un peso y no un filtro, y esto se corrigió con un caso medido.** Cuando acotaba el
catálogo, en un proceso de placa huella (`VIA-PH`) la fila del cruce de drenaje —«SUMINISTRO E
INSTALACIÓN DE TUBERÍA PVC», que casi siempre está— caía a «personalizado» porque `LOC-RED-TUBPVC` no
figura en `VIA-PH`. **Un presupuesto de obra mezcla tipologías por construcción.**

**Su tokenizador CONSERVA los dígitos**, al contrario que `experiencia.tokenizar`, que los descarta a
propósito («2024», «cm001»: el número del proceso, no el trabajo). Aquí `21` (MPa), `420` (fy) y `21`
(RDE) son justo lo que distingue un ítem de su hermano y lo que **mueve el precio** (RDE 41→21 puede
duplicar el ml). Son dos preguntas distintas, y hay una prueba que impide «unificarlas».

**La unidad no se convierte NUNCA.** Pasar m² a m³ exige un espesor que el catálogo no conoce. Cuando
difieren se marca `unidad_discrepante` y se conserva **la del pliego**, que es la que se va a pagar.

### `POST /api/apu/descargar` (protegido · acción de `lib/handlers/apu/editor.js`)

Baja el PDF de una URL porque **el navegador no puede** (política de mismo origen; los portales de
contratación no mandan `Access-Control-Allow-Origin`). Devuelve el PDF en base64 para que pdf.js lo
lea en el navegador — extraer el texto en el servidor exigiría `pdfjs-dist`.

Es un SSRF de manual, así que está acotado por **seis** cosas a la vez: token obligatorio · solo
`https:` y sin credenciales embebidas · el host no puede ser IP literal (v4, v6, ni `::ffff:` mapeada),
`localhost` ni un dominio interno · **se resuelve el nombre y se valida la IP** · las redirecciones se
siguen **a mano revalidando nombre Y IP en cada salto** (`169.254.169.254` es el salto clásico) · el
tamaño se controla **mientras se lee**, no por `Content-Length`. Y se verifica la firma **`%PDF-`**:
los portales sirven HTML de sesión con `Content-Type: application/pdf`.

**La comprobación de la IP resuelta era la que faltaba, y es la que de verdad protege**: validar la
*cadena* del hostname no sirve de nada por sí sola, porque cualquier dominio público puede apuntar a
`127.0.0.1` o a `169.254.169.254`. Queda una ventana TOCTOU conocida (*DNS rebinding*) que exigiría
fijar la IP en la conexión, cosa que el `fetch` nativo no permite: está dicha, no disimulada. Y cuando
lo descargado no es un PDF **no se devuelve ningún byte del cuerpo remoto** — eso convertía el endpoint
en un oráculo de lectura de servicios internos.

### OCR (`lib/apu_ocr.js`) — respaldo, no vía principal

Se activa cuando pdf.js no encuentra capa de texto. El criterio es **por página** (<100 caracteres de
media), no absoluto: un escaneo con cabecera vectorial devuelve unos pocos caracteres por página y
pasaría un umbral global. Y el mensaje dice «parece escaneado», nunca «el pliego está vacío»:
**ausencia de capa de texto es SIN DATO**, no un documento sin contenido — el mismo error de categoría
que `anticipo_pct = 0`.

El navegador rasteriza cada página a JPEG bajando escala y calidad hasta caber por debajo de ~1 MB, y
manda **una petición por página**. Así se esquivan los tres límites a la vez: el tope de tamaño de
fichero del plan gratuito, su tope de páginas por PDF, y el de 4,5 MB del cuerpo de la función. La
`apikey` **nunca sale al navegador**: vive en `OCRSPACE_API_KEY` y el endpoint la usa por header.

Sin la variable no se inventa nada: **503 con la instrucción exacta** de cómo configurarla. Y un 200
de OCR.space no es éxito — el fallo viaja **dentro** del 200 (`IsErroredOnProcessing`, `OCRExitCode`
1/2/3/4), así que se comprueba o se devolvería texto vacío como si la página no tuviera nada.

### Frontend del lector de pliegos (sección de la pestaña `#/apu`)

Botón **«Cargar pliego (PDF)»**, archivo o URL, progreso por página, y una tabla **editable** donde
todo se corrige a mano (los totales se recalculan) y se exporta a JSON. Las **limitaciones se
documentan en la propia página**, arriba y sin poder cerrarse: una advertencia que hay que ir a buscar
no es una advertencia.

Una cantidad ausente se pinta **«sin dato»**, nunca 0 — hay prueba que prohíbe un `|| 0` sobre las
cantidades, igual que la que ya existía para los conteos. Y el arranque va **al final del IIFE**,
misma lección que costó cara en `app.js` y se repitió en `admin.js`.

### Tasa de acierto (`node tests/apu_bench.js`)

| Corpus | Recall de filas | Unidad | Cantidad | Filas espurias |
| --- | --- | --- | --- | --- |
| 10 formularios sintéticos (38 filas) | **100 %** | 100 % | 100 % | 0 |
| 5 casos **adversarios** | 100 % | 100 % | **87,5 %** | 0 |

Mapeo al catálogo: **97,4 %** con código, **81,6 %** en firme.

**El corpus es sintético y lo escribió quien escribió el parser**, así que la tanda principal mide
sobre todo la robustez ante las variantes que su autor previó; los casos adversarios están para
acotar eso, y encontraron tres defectos reales (celdas combinadas, unidad mencionada dentro de la
descripción, ambigüedad decimal) de los que **dos se corrigieron y el tercero queda publicado**.
Ninguna de las dos cifras es la cobertura del universo real de pliegos de SECOP II, que sigue **sin
medir**.

Una revisión adversaria posterior encontró **diez defectos más que el banco no cubría**, todos
reproducidos ejecutando código y todos corregidos: una celda vacía descolocaba el mapa de columnas y
`cantidad` leía el precio unitario; con el orden `CANTIDAD | UNIDAD` y sin cabecera pasaba lo mismo;
el AIU y el IVA desglosados como partidas entraban en el costo directo; la vía aplanada convertía
prosa en ítems; una cabecera partida en dos líneas anclaba `total` a la columna del unitario; el
lector de anticipo tomaba el primer `%` de la línea (confundiendo el AIU con el anticipo) y no sabía
leer los dos conceptos juntos; `\d{1,2}` convertía «100 %» en 0 %; la «a» de preposición fijaba la
Administración del AIU; `375.0000` se leía como 3 750 000; y dos capítulos con el mismo numeral
sumaban sus hijas juntas. **La lección de método es que el banco medía lo que su autor previó y
la revisión adversaria medía lo que no** — y por eso la batería de regresión de esos diez casos vive
ahora en `tests/e2e.js`.

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

## Editor de APU (pestaña `#/apu` + `/api/apu/*`)

Del objeto del proceso a un presupuesto con desglose por insumo, exportable a Excel. Se apoya en el
**catálogo de precios en Redis** y añade lo que aquel no cubre: qué obra es, cuántas unidades, el AIU,
la baja de mercado y el margen. Base documental: `docs/APU_Y_RENTABILIDAD.md`.

> ⚠️ Precios de **referencia regionalizada, no cotizaciones**. Verifique contra cotización real antes de
> presentar oferta. El presupuesto sirve para decidir **a qué presentarse**, no para firmar.

### Las nueve acciones

| Acción | Verbo | Token | Qué hace |
| --- | --- | --- | --- |
| `/api/apu/catalogo` | GET | **no** | Ítems, insumos y regiones; `?insumo=`, `?region=`, `?bloque=` |
| `/api/apu/inferir` | POST | sí | `{objeto, codigos_unspsc}` → tipología, estado 🟢/🟡/⚪, ítems y magnitudes |
| `/api/apu/calcular` | POST | sí | `{items, departamento, config}` → desglose + resumen + alertas |
| `/api/apu/rentabilidad` | POST | sí | Margen, caja, VEG, payback, precio piso, **el optimizador de precio y el bloque `piso_techo`** (Fase 3) |
| `/api/apu/guardar` | POST | sí | Borrador a `apu:presupuesto:{perfil}:{id}`, **TTL 30 días** |
| `/api/apu/cargar` | GET | sí | `?id=…&perfil=…` |
| `/api/apu/listar` | GET | sí | Borradores del perfil (SCAN + MGET, sin índice aparte) |
| `/api/apu/extraer-texto` | POST | sí | **Lector de pliegos**: texto del PDF → tabla de cantidades (`lib/apu_extraer.js`) |
| `/api/apu/descargar` | POST | sí | Baja el PDF del pliego, que el navegador no puede (`lib/apu_descargar.js`) |

Las dos últimas son del **lector de pliegos**, no del editor, y se despachan antes de tocar el
catálogo: no leen Redis ni lo necesitan. Están aquí por la misma restricción de las 12 funciones —
con dos archivos propios eran 14.

**El catálogo es público y eso es la regla, no una excepción**: lo que no sale sin llave son las cifras
del *perfil*. Escribir el catálogo sí exige llave (`/api/admin/apu/cargar-catalogo`).

**Van en UNA sola función** (`lib/handlers/apu/editor.js`, ruta dinámica). El plan Hobby de Vercel admite **12
Serverless Functions por despliegue** y el repositorio ya estaba en 12: un archivo más y falla el
despliegue **entero**. Por eso `/api/apu/catalogo` dejó de tener archivo propio y se plegó ahí —misma
URL, mismo contrato, sigue siendo público—. Hay una prueba que cuenta los archivos bajo `api/` y otra
que impide que el archivo suelto reaparezca.

### Qué calcula, y qué NO recalcula

`lib/apu/calculo.js` **no reimplementa el costo directo**: llama a `costoDirecto()` del catálogo, donde
ya viven las cuatro fórmulas del APU. Un segundo cálculo «equivalente hoy» diverge a la primera
corrección que se aplique a uno solo, y aquí serían pesos.

```
costo_unitario   = costoDirecto(item, catálogo, región)      ← materiales, MO, equipo, transporte
costo_total_item = costo_unitario · cantidad

precio_venta     = costo_directo_total · (1 + A% + I% + U%)  ← AIU ADITIVO (defecto)
precio_final     = precio_venta · (1 − factor_baja/100)      ← si hay ajuste competitivo
margen_final     = precio_final − costo_directo_total
```

**Dos correcciones a la especificación original, las dos con prueba.**

1. `(cantidad / rendimiento) · costo_hora` ya es el **total** del ítem. Sumarlo a unos materiales que sí
   van por unidad y volver a multiplicar por `cantidad` cobra la cuadrilla `cantidad` veces (en un ítem
   de 500 m², 500 cuadrillas). Se calcula el unitario y se multiplica **una** vez, con lo que
   `cantidad × unitario = total` se cumple por construcción.
2. **AIU se suma, no se compone.** Componerlo (`15/5/5` → 26,8 % contra 25 %) da un AIU que no coincide
   con el del formulario de la entidad. `modo_aiu: "compuesto"` sigue disponible; el defecto es
   `aditivo`.

**El rendimiento DIVIDE** (error canónico del APU; hay prueba de monotonía), y el
`rendimiento_override` trabaja **sobre una copia**: el catálogo se comparte entre peticiones de la
misma instancia caliente y mutarlo filtraría el override de un presupuesto al siguiente.

### Región: traducción, no una segunda matriz

El catálogo cotiza por **región** (cinco, con ciudad cabecera) y SECOP publica **departamento**.
`data/apu_regional.json` traduce; los factores viven en el catálogo y solo ahí.

- Las cinco regiones cubren **14 de los 33** departamentos. Los otros **19 salen `sin_base`**, con el
  motivo escrito uno a uno. Asignar Vaupés a «Costa Atlántica» porque no hay nada mejor sería inventarse
  un dato.
- **Prohibido `|| 1`.** Un factor 1,00 de relleno afirma «aquí construir cuesta lo mismo que en Bogotá».
- **El presupuesto sale igual**, con la región base y diciéndolo: no bloquear por falta de información.
  El desplegable marca qué departamentos no tienen precio de referencia.
- Sin catálogo en Redis se usa la **semilla del repositorio** y se declara en `catalogo.fuente`. Hay
  prueba de que las dos vías dan el mismo costo directo.

### El clasificador

**Antes del Nivel A, tres puertas anti-falso-positivo** (ago 2026). El clasificador puntuaba el
léxico sin preguntarse primero si el objeto es siquiera de obra, y el corpus real dio los tres casos:
un **servicio de internet** (segmento 80) que salía como «interventoría», un contrato de **caninos**
con código de vías que salía **🟢 verde con seis ítems de placa huella**, y una **compraventa de
tubería** que se llevaba un APU de red de acueducto.

| Puerta | Regla reutilizada | `motivo` | Base de comparación |
| --- | --- | --- | --- |
| 1 · blacklist | `BLACKLIST_OBJETO` (`lib/semantica`) | `blacklist_objeto` | texto **crudo** — la expresión lleva `[oó]` y flag `i`, y normalizarla sería una regresión silenciosa |
| 2 · pertinencia | `evaluarPertinencia` (`lib/filtros`) | `no_pertinente` | texto **normalizado**, que es su contrato |
| 3 · anti-suministro | `esSuministroPuro` (`lib/filtros`) | `suministro_puro` | normalizado + los códigos que ya parseó el Nivel B |

Cuatro decisiones que sostienen esto:

- **Las tres LLAMAN a la regla que ya existe**, nunca a una lista nueva: tres definiciones paralelas
  de «esto no es obra» divergen a la primera corrección aplicada a una sola. Hay prueba que prohíbe
  que aparezcan listas propias en el módulo.
- **Solo el ROJO rechaza.** El 🟡 de `evaluarPertinencia` significa «el objeto no lo dice
  explícitamente», y cerrar por eso sería bloquear por falta de información — lo contrario de la
  doctrina. Hay prueba sobre el fuente de que la condición es `p.nivel === "rojo"`.
- **El módulo ya no es hoja** (depende de `filtros`) y el comentario lo dice en vez de afirmar lo
  contrario. El `require` va **diferido dentro de la función**: `filtros` resuelve con esa misma
  técnica sus dos ciclos (`→ rup →` y `→ negocio →`), y pedirlo en tiempo de carga ataría este módulo
  a ese nudo. Hoy no hay ciclo y hay prueba de ello; el diferido lo hace cierto por construcción.
- **No se inventa un cuarto estado**: los rechazos salen ⚪, que es el que no presupuesta, y la
  invariante de que los estados suman los evaluados sigue valiendo. El rechazo viaja con su motivo
  auditable en `no_pertinente: {nivel, tipo, termino}` — un ⚪ sin razón no se puede discutir.

El error simétrico —sobrebloquear— también está probado con obra legítima que **tiene** que seguir
pasando, incluida la frontera que de verdad importa: «SUMINISTRO **E INSTALACIÓN** DE TUBERÍA» es
obra; «COMPRAVENTA DE TUBERÍA» no.

- **Nivel A · léxico**: `P = 3·anclas + 1·apoyo − 4·excluye`, exigiendo un verbo de obra de
  `lib/semantica`.
- **Nivel B · UNSPSC** como evidencia *independiente*, cuyo valor real es **vetar**: una placa huella
  cuyo único código sea de acueducto es una red, no una vía → 🟡.
- **Nivel C · LLM de desempate: NO implementado**, a propósito. El proyecto no tiene dependencias ni
  llamadas externas, y meter una en la ruta de una petición añadiría latencia y un punto de fallo a un
  cálculo hoy determinista. La máquina de estados funciona sin él.

| Estado | Condición | Qué se hace |
| --- | --- | --- |
| 🟢 verde | `P1 ≥ 8` **y** `P1 − P2 ≥ 4` **y** B compatible | Presupuesto completo |
| 🟡 amarillo | `P1 ≥ 6` sin margen claro, o B ausente, o B incompatible | Se genera, marcado «verificar pliego» |
| ⚪ no determinada | `P1 < 6`, sin verbo de obra, **rechazado por una de las tres puertas**, o cualquier caso restante | **No se presupuesta** |

Los tres estados **suman exactamente los objetos evaluados**. El margen `P1 − P2` es condición *dura*:
el falso positivo caro es el 🟢, el único estado que presupuesta sin pedir el pliego. **19 de las 22
tipologías tienen ítems en el catálogo**; VIA-SEN, ELE-RED y CON-EST no, y el clasificador lo dice en
vez de proponer ítems de otra cosa.

**Cantidades desde el objeto**: decimal colombiano (el punto separa miles; invertirlo divide la obra por
mil), lookbehind (sin él «1500 km» captura 500) y **atribución a ≤ 6 palabras** de un término ancla (sin
ella «…VEREDA X, CONTRATO 2024-350» produce 2024 km).

### Exportación a Excel: por qué **no** SheetJS

El `.xlsx` lo escribe `public/xlsx.js`, a mano, sin `package.json`. No es purismo — son dos hechos
verificados:

1. **SheetJS dejó de publicar en npm tras la 0.18.5** (se mudó a su propio CDN). `npm install xlsx`
   instala esa versión, con dos advisories *high* (`GHSA-4r6h-8v6p-xvw6`, `GHSA-5pgg-2g8v-p4x9`) y
   `npm audit` respondiendo literalmente **«No fix available»**.
2. **La edición libre ignora los estilos de celda al escribir.** Fijando
   `ws.A1.s = {font:{bold:true}, fill:{…}}`, el `xl/styles.xml` sale con `<fonts count="1">`. Un
   «formato profesional de APU» no es alcanzable con esa librería.

Un `.xlsx` es un ZIP de XML, así que el escritor cabe en un archivo y da control total: franja de
título, encabezados, bordes, moneda, anchos, celdas combinadas y panel congelado. Método **STORE**: ZIP
válido que abren Excel, LibreOffice y Numbers, sin depender de `CompressionStream`. Corre en navegador
**y en Node** a propósito, para que la suite genere un libro real y **audite el ZIP entrada por
entrada**. Salen dos hojas: **Presupuesto** y **APU** (insumo a insumo).

El FORMATO lo arma `public/apu_libro.js`, aparte del escritor, y el archivo se llama
`APU_<proyecto>_<fecha>.xlsx` (`APULibro.nombreArchivo`, punto único: escrito dentro del botón, la
aplicación y el generador de Node producían nombres distintos).

**Hoja «Presupuesto» — 7 columnas:** ÍTEM · CÓDIGO · DESCRIPCIÓN · UND. · CANT. · VALOR UNITARIO ·
VALOR TOTAL. «Ítem» y «código» son cosas distintas y por eso no comparten columna: el ítem es la
POSICIÓN (`1.1`, `1.2`, `2.1` — con lo que la entidad compara oferentes) y el código la IDENTIDAD en el
catálogo (`NOG-A2`). Cada fila lleva su fórmula `=E×F` con valor cacheado; **cada capítulo cierra con su
propio `=SUM()`** y COSTOS DIRECTOS suma la **lista de celdas de subtotal**, no el rango de ítems —
sumar el rango con subtotales intercalados contaría cada peso dos veces y daría un presupuesto
exactamente al doble sin que nada se viera raro. Cierra con A/I/U, **IVA sobre la utilidad (19 %)**,
TOTAL y firmas, y al pie van la fecha, la región, el factor prestacional aplicado, la versión del
catálogo, la leyenda de colores y todas las alertas.

**Hoja «APU» — un bloque por ítem**, con cabecera propia por sección (MATERIALES · EQUIPO y
HERRAMIENTAS · TRANSPORTES · MANO de OBRA), subtotales con `=SUM()` y espacio de **firma del ingeniero
de costos**. Las columnas **F y G** llevan los factores que antes viajaban dentro del texto de la
descripción —cantidad base, desperdicio %, rendimiento, distancia (km) y recargo prestacional %—,
porque dentro de la descripción se leen pero **no se pueden ordenar ni filtrar**, que es lo primero que
hace quien audita. `VR COSTO DIRECTO` va con el valor del motor y **sin** fórmula, a propósito: un
`=SUM()` de los subtotales discreparía en céntimos del VALOR UNITARIO de la otra hoja, que es
justamente la cifra que la entidad coteja (hay prueba de que las dos hojas coinciden ítem a ítem).

### Trazabilidad del precio: seis estados, una sola definición

`APULibro.clasificarOrigen` es el punto único —lo usan el badge de la tabla **y** el color de la fila
del Excel—: 🟢 **Adjudicado · Nogal 4 (2025)** (contrato real *y* servido en su misma región) · 🟡
**Cotización de proveedor** (todos los insumos con cotización real cargada) · 🟡 **Derivado regional**
(ajustado por factor: no verificado, requiere cotización) · 📄 **Del archivo** · ⚪ **Manual** · 🔴 **Sin
referencia** (no suma al total y sus celdas van vacías: un $0 sería un precio inventado).

Dos estados que el encargo pide **no se emiten** porque no hay con qué alimentarlos, y decirlo importa
más que tenerlos: **INVIAS** (los APU Regionalizados de Referencia no están en el repositorio y las
fuentes oficiales dan 403) e **Histórico SECOP** (`p6dx-8zbt` publica el valor adjudicado del contrato
entero, **no precios unitarios por ítem**). Qué archivos harían falta y cómo cargarlos está en
`docs/APU_DIAGNOSTICO.md`.

### Validaciones automáticas: cinco puertas que **no** bloquean

`lib/apu/validaciones.js` corre al cerrar cada cálculo: **AIU fuera de banda** (las bandas se importan
de `lib/apu/normativa`, no se reescriben) · **factor prestacional** fuera de las cotas de ley
(comprobación de *encierro* entre la suma exonerada y la nominal) · **cantidades** en cero o negativas
(dos defectos distintos, contados aparte) · **ítems sin precio** · **oferta por encima de la cuantía**
del proceso. Ninguna impide exportar (`bloquea_exportacion: false`): una herramienta que se niega a
exportar acaba usándose por fuera. Viajan en `validaciones` con su severidad y **además** en `alertas`,
que es el canal que lee el exportador — así salen también en las notas al pie del Excel.

Dos precisiones que hay que contar exactas: los umbrales del AIU **no** son los del encargo (A > 30 /
I < 1 / U > 10) sino las bandas ya documentadas del manual (12–20 / 3–5 / 5–10), que son estrictamente
más estrechas y por tanto marcan todo lo que aquéllos marcarían; y el «5 % del valor total» de los
ítems sin precio **no es computable** —un ítem sin precio no tiene valor por definición— así que el
umbral se aplica al **número de ítems**, se declara como tal, y el total del presupuesto se publica
como **cota inferior**.

### Integración con el panel

El panel y el editor son pestañas de la misma página; nada se embebe por iframe. `vercel.json` sirve todo el sitio con
`X-Frame-Options: DENY`, así que un iframe quedaría en blanco en producción aunque funcione en local.

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
indice:baja:entidad                            HASH entidad → {baja_mediana, baja_promedio, p25, p75,
                                               nivel, oferentes_promedio, segmentos:{SS:{…}}}
indice:baja:entidad_familia                    HASH «entidad|FFFF» → mismas métricas
indice:baja:departamento_familia               HASH «DEPTO|FFFF»   → mismas métricas
indice:baja:departamento                       HASH «DEPTO»        → mismas métricas
indice:baja:meta                               JSON {generado, baja_mediana_global, descartados, …}
indice:baja:progreso                           JSON comprimido, acumulador reanudable (histogramas)
indice:baja:cache                              JSON comprimido, respuesta de /api/indice-baja (TTL 1 h)
lock:indice_baja                               candado de construcción (TTL 300 s)
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
config:experiencia                             JSON comprimido {contratos:[…], _meta}  (contratos ya ejecutados)
config:experiencia:terminos                    JSON comprimido {terminos:{palabra: nº de contratos}, …}
config:experiencia:version                     sello de la última carga (se escribe AL FINAL)

CACHÉ DEL PANEL
resumen:{perfil}                               JSON del dashboard, TTL 300 s (la carga de RUP la borra)
cobertura:{perfil}:{exp|base}                  JSON comprimido de la auditoría de cobertura, TTL 1 h
apu:presupuesto:{perfil}:{id}                  JSON comprimido del borrador de APU, TTL 30 días
                                               (el valor lleva el sello del RUP y el de la experiencia:
                                                cargar cualquiera de los dos la invalida sola)

CATÁLOGO DE PRECIOS APU — configuración de referencia. NINGUNA purga lo toca.
apu:insumos:{id}                               HASH {nombre, unidad, tipo, fuente, precio_base,
                                                     precio_{region} ×5, precio_origen_{region} ×5,
                                                     fecha_actualizacion}
apu:items:{codigo}                             HASH {descripcion, unidad, capitulo, unspsc_segmento,
                                                     unspsc_clases (JSON), herramienta_menor_pct,
                                                     insumos (JSON: [{insumo_id, cantidad_por_unidad,
                                                     rendimiento, desperdicio, distancia_km?}]),
                                                     fuente, fecha_actualizacion}
apu:factores_region:{region}                   HASH {nombre, ciudad_cabecera, factor_materiales,
                                                     factor_mano_obra, factor_equipo, factor_transporte,
                                                     aiu_tipico, aiu_detalle (JSON), prestacional_tipico,
                                                     indice_ciudad_recuperado, fecha_actualizacion}
apu:catalogo:manifest                          JSON {version, chunks, registros}   ← caché de lectura
apu:catalogo:chunk:{i}                         base64(zlib.deflate(JSON[], nivel 6)) ≤ 500 KB
apu:catalogo:meta                              JSON {version, version_catalogo, cargado_el, insumos,
                                                     items, regiones, icociv, …}   ← SELLO, se escribe
                                                     AL FINAL de la carga

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
| Carga del catálogo APU | **no lo toca** | **no lo toca** (escribe solo en `apu:*`) |

## Rentabilidad del proceso (`lib/apu/rentabilidad.js` + `POST /api/apu/rentabilidad`)

El editor responde **cuánto cuesta**. Esta capa responde las dos preguntas que faltan, y son
distintas entre sí:

| Pregunta | Indicador | Qué decide |
|---|---|---|
| ¿Vale la pena? | margen bruto y neto | Si el contrato deja dinero |
| ¿Se puede? | **`K_max`** (capital de trabajo máximo expuesto) y **payback** | Si la empresa puede EJECUTARLO |
| ¿Cuánto vale la oportunidad? | **`VEG` = P(ganar) × utilidad − costo de preparar** | El **orden primario**, no el margen |

Un contrato puede tener utilidad contable positiva todo el tiempo y caja negativa todo el tiempo:
se quiebra por caja. Por eso los tres se publican por separado y ninguno se promedia con otro.

**Es la única acción del módulo que toca la red**: lee `indice:baja:*`, `indice:competencia` y
`lib/probabilidad`. Va aparte de `calcular` —que es aritmética pura— para no pagar dos lecturas de
Redis en cada tecla del editor.

### `P(ganar | precio)` no es una sigmoide, es una mezcla

En obra pública colombiana **el método de ponderación económica se SORTEA en la audiencia** (Ley 1882
de 2018): el proponente elige su precio sin saber si le tocará media geométrica o menor valor. La
consecuencia va contra la intuición: **ofertar más barato no maximiza la probabilidad de ganar**.

```
P(b) = 0,25 · P_menor_valor(b)  +  0,75 · P_central(b)
       └ sigmoide: crece con la baja      └ campana: alejarse del centro RESTA
```

La sigmoide sigue publicándose aparte (`p_menor_valor`) para que se vea de dónde sale cada mitad. El
resultado se aplica como **multiplicador** sobre la `p` de `lib/probabilidad`, normalizado para valer
**exactamente 1 en la mediana del mercado**: así ofertar al centro devuelve la misma probabilidad que
ya publica `/api/oportunidades`. Dos cifras distintas del mismo número es el defecto que este
repositorio ya pagó dos veces.

La **forma** de esa curva usa un `n` de referencia fijo. El efecto de nivel de la competencia ya lo
lleva `p_base`; meterlo también en la forma lo contaba dos veces y hacía que catorce oferentes dieran
*más* probabilidad que tres.

### El botón «APU» y el badge «APU listo»

Cada fila de «Top 10 procesos más atractivos» del panel lleva un botón **APU** que abre el
editor con el proceso precargado por querystring (`objeto`, `unspsc`, `departamento`, `cuantia`,
`entidad`, `entidad_nit`, `id_proceso`, `perfil`, `plazo`). Al guardar, el borrador queda asociado a
ese `id_proceso` y al perfil, y la fila muestra **✅ APU listo**.

El listado se pide **aparte de `/api/resumen`**, cuya respuesta se cachea 300 s: un presupuesto
recién guardado no puede tardar cinco minutos en encender el badge.

### Honestidad del dato

- **Sin `deducciones_pct` del pliego el margen es una COTA SUPERIOR**, no una estimación, y la
  respuesta lo declara en `margen_es_cota_superior`. Un bloque de deducciones de hasta ~10 % del valor
  es mayor que el margen típico: omitirlo invierte el signo del negocio.
- **`anticipo_pct` vacío es AUSENCIA DE DATO**, no 0 %: el flujo resultante es una cota inferior y el
  payback se marca como tal.
- **El payback exige haber estado expuesto**: sin esa condición, un contrato con anticipo daría
  payback = mes 1 por el propio anticipo, que es dinero de la entidad y no capital devuelto.
- **El precio piso decide con σ = 15 %**, no con 8 %: la prima crece con σ, así que usar el valor bajo
  sin calibrar es anti-conservador.
- **Sin índice de baja no hay precio sugerido.** «Sin dato» no es «no descuenta nada».

## Catálogo de precios APU (`lib/apu/catalogo.js`)

La base de precios con la que se costea un ítem de obra. Estructura oficial **INVIAS/IDU**:

```
Costo Directo   = Mano de Obra + Materiales + Equipo/Herramienta + Transporte
Precio Unitario = Costo Directo × (1 + AIU)
```

| Capítulo | Fórmula |
| --- | --- |
| Mano de obra | `(precio_base × prestacional) ÷ rendimiento` |
| Materiales | `precio_base × cantidad_por_unidad × (1 + desperdicio)` |
| Equipo | `precio_base ÷ rendimiento` |
| Transporte | `precio_base × cantidad_por_unidad × distancia_km` |
| Herramienta menor | `herramienta_menor_pct × total de mano de obra` |

**48 insumos · 17 ítems · 5 regiones** (Bogotá/Sabana, Medellín/Antioquia, Costa Atlántica, Eje
Cafetero, Santanderes). La semilla curada vive en `data/apu_catalogo.json` y declara la `fuente` de
cada precio: `recuperado` (estaba en `modulo_apu.html`, borrado en el commit `d69cfe8`, y se trajo a
la base vigente con el **ICOCIV del DANE**, +4,70 % anual, boletín de marzo 2026), `derivado` (se
calcula de otros: las cuadrillas) o `estimado` (referencia razonada, **no** una cotización). Método
completo y separación línea por línea en **`docs/APU_Y_RENTABILIDAD.md`**.

### `POST /api/admin/apu/cargar-catalogo` (protegido) · `GET /api/apu/catalogo` (público)

| Endpoint | Token | Qué hace |
| --- | --- | --- |
| `POST /api/admin/apu/cargar-catalogo` | **sí** | valida y puebla Redis. `?forzar=true` reescribe |
| `GET /api/admin/apu/cargar-catalogo` | **sí** | qué hay cargado, sin escribir |
| `GET /api/apu/catalogo` | **no** | ítems + insumos + regiones + **`normativa`**. `?insumo=` · `?region=` · `?bloque=` |

La consulta es pública **a propósito y sin excepción a la regla del proyecto**: lo que no sale sin
llave son las *cifras del perfil* (patrimonio, K, CRPC, tope), que son datos financieros de personas
identificadas. Aquí solo hay precios de mercado de referencia. Lo que sí exige llave es
**escribirlos**.

El bloque **`normativa`** (ago 2026, también en la respuesta de `calcular`, ahí para la región que el
motor usó de verdad) publica lo que hay detrás de los factores que multiplican el APU: el desglose
del prestacional componente a componente con su norma, las bandas del AIU, el IVA sobre la utilidad
con su cita, y las deducciones. **Lo importante es lo que declara que NO cuadra**: la suma nominal de
las tasas de ley da 58,29 %, el catálogo aplica 55,00 % y con la exoneración de parafiscales bajaría
a 44,79 % — el 55 % cae entre las dos y **no se descompone en ninguna combinación legal exacta**. No
se ajustó ningún componente para cuadrarlo, y hay una prueba de **encierro** (no de igualdad) que
exige que el factor de las cinco regiones caiga dentro de esa banda: si alguien carga un catálogo con
1,70, la suite lo detiene. Ningún componente se declara verificado —este entorno no alcanza las
fuentes oficiales— y **no se cita ninguna resolución**: no existe una que fije el factor prestacional
y una norma inventada aquí acabaría en el precio de una oferta.

### Decisiones que no hay que re-aprender

- **Los precios regionales se DERIVAN, no se transcriben.** La semilla trae un precio base (Bogotá)
  por insumo y cuatro factores por región; los cinco `precio_{region}` salen de multiplicarlos según
  el **tipo** del insumo — en la Costa el material sube (1,10) mientras el jornal baja (0,97), y con
  un índice único los dos irían al mismo sitio. Transcribir 5 × 48 números a mano habría creado 240
  sitios donde el catálogo puede desincronizarse de sus propios factores. Una cotización real gana
  (`precios_cotizados`) y el hash publica `precio_origen_{region}` para saber cuál se está mirando.
- **Los cuatro factores no pueden separarse del único dato duro que los respalda.** La fuente
  recuperada trae **un** índice por ciudad; la desagregación es razonada, no medida. La cerradura:
  recomponerlos con la estructura de costos de obra civil (45 % materiales · 30 % mano de obra ·
  18 % equipo · 7 % transporte) tiene que caer a **menos de 0,015** del índice de la ciudad cabecera.
  Hay prueba región por región.
- **Las cuadrillas son la SUMA de sus jornales** (`299.000 = 95.000 + 3 × 68.000`, recuperado). Se
  declara en `componentes` y se valida: si alguien sube el jornal del ayudante y no la cuadrilla, el
  catálogo diría dos cosas distintas sobre el mismo día de trabajo.
- **Un cero no puede ser un precio.** Es la regla de `anticipo_pct = 0` aplicada entera: un insumo a
  0 no es «gratis», es «no lo sé». Por eso la **herramienta menor no es un insumo** (no tiene precio
  propio: es un % de la mano de obra) y vive como `herramienta_menor_pct` del ítem.
- **🚩 El transporte va en m³, no en kilogramos.** En `modulo_apu.html` el APU del acero llevaba
  `1.200 × 1,05 × 15` = **$18.900 de acarreo por kilo**, más del doble que el propio acero: la tarifa
  está en $/m³-km y le pasaban kg. Aquí `cantidad_por_unidad` de una línea de transporte va **siempre
  en m³ de material movido** (para el acero, `1,05 kg ÷ 7.850 kg/m³ ≈ 0,00013 m³`). Hay prueba de que
  el acarreo no puede volver a pasar del 1 % del APU del acero.
- **La carga es TODO O NADA y el sello va al final.** Se valida el catálogo entero antes del primer
  `HSET` (mismo criterio que un POST de RUP rechazado, que no toca nada) y `apu:catalogo:meta` se
  escribe después de los hashes y del snapshot: mientras no cambie, nadie ve un estado a medias.
- **El snapshot es CACHÉ, los hashes son la VERDAD.** Servir el catálogo desde los hashes son ~70
  comandos por petición; desde el snapshot comprimido, dos. Pero dos fuentes de verdad es el defecto
  que este proyecto ya pagó caro, así que el snapshot lleva **la misma `version`** que la meta y quien
  lo lee la compara: si no casa —o si un chunk está corrupto— cae a los hashes **y lo dice** en `via`.
  Hay prueba de que las dos vías devuelven exactamente lo mismo.
- **`cargado` es un booleano; la fecha es `cargado_el`.** Se llamaban igual y el spread de la meta
  pisaba al booleano con una cadena (siempre veraz): el panel habría dicho «cargado» sobre un Redis
  vacío. Es el choque `total_procesos`/`procesos_contados` otra vez, y tiene su prueba de tipo.
- **Lo que el catálogo NO incluye**: AIU aparte del `aiu_tipico` de referencia, y **ninguno** de los
  costos ocultos del Cap. 11 (contribución del 5 %, estampillas, retenciones, pólizas, costo
  financiero del capital de trabajo, ensayos, PMA/SST, liquidación). El APU es costo directo; eso va
  encima. La calculadora de rentabilidad es la Fase 2.

## Variables de entorno

| Variable | Obligatoria | Uso |
| --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` / `UPSTASH_REDIS_REST_TOKEN` | **Sí** | Redis (respaldo legado: `KV_REST_API_URL` / `KV_REST_API_TOKEN`). Sin ellas **todos** los endpoints que tocan Redis responden 503 (`lib/redis.hayCredenciales`) |
| `HISTORICO_TOKEN` | **Sí** | **La llave de todo lo protegido**, no solo de `/api/sync/historico`: la comparten los doce puntos de llamada de `lib/auth.js` (el panel, el diagnóstico, los dos índices, la carga de RUP y de experiencia, la auditoría de cobertura, la carga del catálogo APU y las cinco acciones no públicas del editor). Sin ella el 503 es global — no hay default que valga como llave. El nombre es histórico: nació para el backfill |
| `SOCRATA_APP_TOKEN` | No | Más cuota en datos.gov.co (header `X-App-Token`): ~1 000 peticiones/hora frente a ~100 sin él |
| `OCRSPACE_API_KEY` | No | Respaldo por OCR para pliegos escaneados (`/api/apu/extraer-texto`). Sin ella ese respaldo responde 503 explicando cómo configurarla; el resto del módulo APU funciona igual (los PDF con capa de texto no la necesitan) |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | No | Atraviesa **Vercel Deployment Protection** en las llamadas que la app se hace a sí misma: la auto-reinvocación de `/api/sync` y de `/api/sync/historico`, y el disparo en frío desde `/api/oportunidades`. Con Password Protection activo y sin ella, el muro del edge responde HTML a la propia función y **la cadena de sincronización muere en silencio** — es la causa típica de una full que no termina |
| `UBICACION_VALIDA` | No | Ubicación objetivo (default `BOGOTÁ D.C.`; admite lista separada por comas) |
| `SECOP_BASE_URL`, `SECOP_PAGE`, `SECOP_BACKOFF_MS` | No | Solo pruebas/ajustes: base del dataset, tamaño de página y backoff |
| `NODE_ENV`, `VERCEL` | — | Las pone la plataforma. Solo deciden si se emiten los `logDev` (`!VERCEL && NODE_ENV !== "production"`) |

`DETECTA_URL` y `DETECTA_CRON_SECRET` ya no se usan (el sync no necesita secreto: es idempotente,
barato en reposo y auto-limitado por el candado).

> Las variables de entorno de Vercel **solo entran en despliegues nuevos**: añadir una y no volver
> a desplegar deja el 503 en pie. El mensaje de `lib/auth.js` lo dice, porque es el error que más
> se repite.

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

## Panel de administración (pestaña `#/admin`)

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

**Experiencia ejecutada** (`/api/admin/experiencia`): un `textarea` donde se pega el JSON de
contratos ya ejecutados → vista previa de los **primeros 5** en tabla (n.º, entidad, objeto, valor,
SMMLV) → «Confirmar carga», que también se deshabilita durante el envío. Al terminar se enseñan
cuántos contratos entraron, cuántos términos se extrajeron y una muestra de ellos. «Descargar
experiencia actual» genera un `experiencia_YYYY-MM-DD.json` editable. Si no hay nada cargado, la
caja dice exactamente qué hacer («No hay experiencia cargada. Cargue sus contratos ejecutados para
auditar la cobertura de sus RUP») en vez de quedarse en blanco.

**Puesta en producción sin terminal** (ago 2026, en la misma sección): los tres pasos de
`cargar_experiencia.sh` con clics — «Cargar Experiencia Génesis» (`POST …?origen=repositorio`),
«Auditar Cobertura Génesis» y «Sincronización Full» — más un botón que los encadena. El avance se
narra en la **bitácora** del panel, que es donde el dueño ya mira la sincronización.

Ninguno de los tres reimplementa nada, y eso es lo que se vigila con pruebas: el paso 2 llama a la
misma `ejecutarAuditoria()` del botón de su sección con el perfil fijado en `genesis`, y el paso 3 a
`iniciarFull()`, el arranque encadenado extraído del listener de «Iniciar sincronización». Una
segunda copia de ese arranque es justo donde se rompería la invariante **«1.ª tanda `full`,
siguientes `auto`»** sin que nadie lo notara — repetir `full` volvería a enero para siempre—, así que
hay una prueba que cuenta que `let modo = "full"` aparece **exactamente una vez**.

El bloque va **oculto sin token** (sus tres pasos escriben en Redis, y un botón que no puede
funcionar es peor que un botón ausente) y su visibilidad cuelga de `pintarEstadoToken`, que ya corre
al arrancar el panel y en cada cambio de token: un solo sitio del que depender. La cadena **se
detiene en el primer paso que falle**: encadenar una auditoría sobre una carga que no ocurrió daría
un resultado creíble y equivocado, que es peor que no darlo.

**Auditoría de cobertura RUP** (`/api/admin/cobertura-rup`): selector de perfil, toggle «Usar mi
experiencia para priorizar» —encendido por defecto, y `admin.js` lo apaga solo si el `GET` de
experiencia dice que no hay nada cargado— y botón «Ejecutar auditoría» con su spinner y esqueleto.
El resultado son cuatro tarjetas por criticidad (🔴🟠🟡⚪), la frase «Analizados N procesos
relevantes de M adjudicados (X % coinciden con su experiencia)», la tabla de códigos faltantes
ordenada por puntaje combinado —**cada fila se despliega** con los objetos de ejemplo y las
entidades que más usan ese código—, los dos bloques de excluidos en `<details>` y «Exportar a
JSON». Si hay críticos, sale una alerta encima; si no hay, **no sale** (una alerta permanente deja
de leerse a la semana).

**La auditoría no se dispara sola** y es la única parte del panel que no lo hace: recorre el
histórico entero, así que corre solo cuando alguien la pide. Cargar un RUP o una experiencia
nuevos **oculta** lo pintado y avisa de que hay que volver a ejecutarla: la whitelist o el
vocabulario contra los que se midió acaban de cambiar.

**Arranque**: igual que en `app.js`, el arranque automático de la sesión ya validada va **al final
del módulo**. `abrirApp()` levanta el panel y la carga de RUP, cuyas funciones leen constantes
declaradas más abajo; llamarlo desde donde está el gate reventaría en la zona muerta temporal y —al
ir por una promesa rechazada— lo haría en silencio. Hay una prueba que vigila el orden.

## Frontend

`public/index.html` + `public/app.js`: estático, Tailwind por CDN, **diseño Apple Glass** (ago
2026): claro por defecto y oscuro por `prefers-color-scheme`, custom properties en `:root`
(`--bg-primary #f5f5f7`, `--accent #007AFF`, `--text-primary #1d1d1f`…), barra superior y tarjetas
translúcidas con `backdrop-filter: blur`, pestañas tipo *pill*, barra inferior móvil con
`safe-area-inset` y modales a hoja estilo iOS en móvil. Las plantillas que genera el JS siguen
usando utilidades de Tailwind: una **capa de piel** en el `<style>` las re-mapea a la paleta con
mayor especificidad, en vez de reescribir cientos de cadenas. Gate con la clave `231105` (tres
intentos → «Acceso denegado»). El gate del cliente es una cortesía: la protección seria sigue
siendo **Vercel Password Protection** (servidor), activable encima sin tocar código. Selector de
perfil, filtros, tarjetas con cuantía COP, % de anticipo, ubicación, estados de carga/vacío/error
con reintento, y espera con cuenta regresiva durante la sincronización inicial.

**La probabilidad se muestra en LENGUAJE CLARO** (ago 2026): la tarjeta ya no dice «23 %» sino la
frase del rango — 🟢 «Probabilidad muy alta» (>40 %) · 🟡 «Buena probabilidad» (20–40 %) ·
🟠 «Probabilidad media» (10–20 %) · 🔴 «Poco probable» (<10 %) · ⚪ «Sin información suficiente»
(`null`: la ausencia JAMÁS se pinta como 0 %) — más **una frase con el factor principal** (poca
competencia, prórroga, colisión de cierres, descuento típico de la entidad, o el supuesto
conservador declarado). La cifra exacta no se pierde: la frase es clicable y abre el **modal de
desglose** de seis pasos (`?vista=probabilidad`), donde el porcentaje viaja con su aritmética y sus
fuentes. `fraseProbabilidad` y `motivoProbabilidad` se prueban EJECUTÁNDOLAS desde el fuente
(paso 0.3 de la suite).

> **Por qué 🔴 dice «Poco probable» y no «Baja».** En este dominio *baja* ya significa otras dos
> cosas, y las dos son buenas: el descuento del ganador (`baja_mercado`) y pocos rivales
> (`nivel_competencia: "baja"`). Un chip rojo «Baja» quedaría junto al chip verde «Competencia
> baja» de la misma tarjeta con la misma palabra significando lo contrario. Por lo mismo las otras
> frases conservan el sustantivo: «Muy alta» a secas, junto a un badge de competencia, se lee como
> «competencia muy alta», que es justo al revés.

**La vista visible no depende del CDN.** `abrirApp()` cambia de pantalla con la clase `hidden`, que
sirve Tailwind. Si el CDN no carga —red institucional con la salida filtrada—, esa clase no existe y
la landing se queda **encima** del tablero: la app parece rota y la consola no dice nada, porque no
hay ningún error. Una regla propia por ID (`#onboarding.hidden, #app.hidden, #gate.hidden`) lo
cierra; va por id y solo sobre los tres contenedores de vista para no esconder la barra de pestañas
de escritorio, que es `hidden md:flex`. Lo cazó una verificación en navegador real (Chromium sobre
un servidor de pruebas que sirve `public/` y responde `/api/*` con la forma real de cada handler);
lo que encontró quedó fijado en los pasos 1.5 y 1.6 de la suite.

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

Lo que cubre específicamente la **experiencia ejecutada** y la **auditoría de cobertura**
(`/api/admin/experiencia` + `/api/admin/cobertura-rup`):

- El corpus histórico de prueba trae tres bloques diseñados para que **cada casilla de la
  clasificación tenga un caso y ninguno pase por casualidad**: `72131600` con 15 procesos de objeto
  idéntico a un contrato ejecutado (similitud 1,0 → 🔴 CRÍTICO y primer puesto por puntaje),
  `72132000` con 3 procesos y **un solo término en común de seis** (0,167: dentro del análisis,
  fuera de ALTO, sin ninguno altamente similar → ⚪ BAJO) y `85121700` de salud con 4 procesos
  (similitud 0 → ni entra, y aparece en `excluidos_por_baja_relevancia` con su motivo).
- Los objetos de esos bloques **no llevan descripción a propósito**: el score está calibrado al
  tercer decimal y cualquier palabra de más los movería de casilla.
- 8 casos de validación con el campo exacto señalado (arreglo vacío, no es arreglo, sin la clave,
  objeto vacío, objeto de más de 1 000 caracteres, sin `valor_cop` ni `valor_smmlv`, participación
  fuera de 0-100, más de 500 contratos), más un body que no es JSON — y ninguno guarda nada.
- El vocabulario extraído contiene `construccion`/`placa`/`huella`/`pavimentacion` y **no**
  contiene `prestacion`/`servicios`/`contrato`: si el trámite entrara, cualquier objeto del dataset
  ganaría similitud gratis.
- Auditoría **sin** experiencia: detecta los mismos huecos por el vocabulario de obra pero publica
  `score_similitud_promedio: null` en todos — no se inventa una similitud que nadie midió.
- La auditoría **depende del perfil**: `85121700` está en el RUP de Génesis y no en el de Helder,
  así que para Génesis no es ni hueco ni exclusión.
- Ningún código ya inscrito aparece como faltante, ningún segmento fuera de 70–95 ni de servicios
  no constructivos se cuela, y el **embudo suma** el histórico entero.
- Caché: segunda consulta idéntica `cache:true`, `?refrescar=1` recalcula, y **cargar experiencia
  nueva la invalida**. `401` sin token y con token inválido en los dos endpoints, `400` sin perfil
  y con perfil inventado, `405` a un `POST` sobre la auditoría, y el alias `consorcio` resuelve.
- Unidad, sin Redis: tokenización (fuera trámite y códigos, sin tildes), frecuencia por contrato y
  no por repetición, denominador de la similitud, umbrales que **entran** en 0,15 y 0,30, números
  escritos como cadena (`"350.000.000"`), la lista de segmentos admisibles y **la cascada de
  criticidad completa**, incluidos los casos que el encargo dejaba ambiguos.

## Despliegue

Listo para Vercel sin configuración extra: repositorio → proyecto Vercel (framework «Other»),
variables de entorno de arriba, y desplegar. Sin build, sin dependencias. Opcional: activar
Password Protection en el dashboard **antes** de compartir la URL.

Tras desplegar esta versión, en este orden:

0. **Relanzar `/api/sync?modo=full`** una vez. Esta versión **ensancha el prefiltro de ingesta**,
   así que hay procesos que las reglas anteriores nunca dejaron entrar a Redis y que solo aparecen
   tras una recarga completa. Es la **última vez** que hará falta por un cambio de matching:
   de aquí en adelante afinar el matching, la pertinencia o cargar un RUP nuevo tiene efecto
   inmediato (todo eso corre al servir la consulta). El panel (pestaña `#/admin`) la encadena desde el
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
