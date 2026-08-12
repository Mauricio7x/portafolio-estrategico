# CLAUDE.md

**Al iniciar cada sesión, lee `docs/GUIA_ANALISTA_LICITACIONES.md`** (dominio) y
`docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` (audita el manual, **corrige dos cosas que dice mal** y trae lo
verificado 2025-2026). Para precios y costeo, `docs/APU_Y_RENTABILIDAD.md`. Si retomas el trabajo, lee
primero `README.md` (arquitectura, endpoints, claves Redis, reglas de negocio) y vuelve aquí.

## Qué es

**Detecta**: app privada para decidir a qué licitaciones de obra civil presentarse en Colombia. Reescritura
completa (jul 2026) sobre Vercel serverless + Upstash Redis: `api/sync.js` extrae el año vigente de SECOP II
(`p6dx-8zbt`), enriquece y guarda lo compatible con los RUP; `api/oportunidades.js` filtra por perfil
(helder/genesis/juntos) y la web estática en `public/` lo muestra tras un gate con clave. La versión anterior
(`index.html` monolítico de 580 KB con 9 capas de monkey-patching) vive en la historia de git.

Orden por defecto: **por probabilidad de ganar**. `api/sync/historico.js` baja 2 años de procesos ya
adjudicados a un keyspace que ninguna purga toca, `lib/indice_competencia.js` calcula cuántos oferentes
compiten en promedio por entidad, y `?ordenar_por=atractividad` (default) pone primero las entidades donde
compite menos gente: abrir la app en la mañana y ver arriba lo ganable.

## Flujo de trabajo

- **Sin build, sin package.json, sin dependencias.** CommonJS puro; `fetch`/`zlib` nativos. Sintaxis de los
  JS del frontend: `new Function(código)` con Node (paso *e* del test).
- **Probar:** `node tests/e2e.js` (4 iteraciones; mocks HTTP de Socrata y Upstash + handlers reales) →
  «¿sigue funcionando?». Y `node tests/apu_bench.js`, que **mide** el acierto del parseo de tablas de pliego
  y publica los casos donde falla → «¿cuánto acierta?».
- Este entorno **no** alcanza `datos.gov.co` (allowlist del proxy, `CONNECT 403`) ni tiene CLI de Vercel: la
  validación contra datos reales se hace desplegando. También dan 403 `colombiacompra.gov.co`,
  `relatoria.colombiacompra.gov.co`, `dev.socrata.com`, `funcionpublica.gov.co`.
- **Tras desplegar**: (1) relanzar `/api/sync?modo=full` UNA vez — la ingesta se ensanchó y hay procesos que
  las reglas viejas nunca dejaron entrar a Redis, incluidos los perdidos por el estado `Activo` que faltaba
  en `ESTADOS_ABIERTOS`; el filtro de estado corre en la INGESTA. (2) Definir `HISTORICO_TOKEN` y lanzar UNA
  vez `/api/sync/historico?desde=2024-01&hasta=2025-12` (header `x-historico-token`), o
  `?reconstruir_todo=true` si el histórico ya estaba bajado. Sin ese paso la app funciona igual, con todo en
  ⚪ «sin datos históricos» y sin equivalencias.
- El dashboard (`/api/resumen`) y la carga de RUP (`/api/admin/rup`) NO exigen full ni backfill: viven en la
  capa de consulta y el juicio corre al servir.

## Variables de entorno y límites de plataforma

- **`HISTORICO_TOKEN`: sin default.** Si falta, el endpoint responde **503**; nunca inventar una llave por
  defecto. Viaja por header en la auto-reinvocación para no quedar en los logs de acceso.
- **`OCRSPACE_API_KEY`**: OCR de respaldo para pliegos escaneados. Se **tacha** del cuerpo de error antes de
  reenviarlo (hay servicios que la repiten: «Bad request for apikey=…»).
- Credenciales de Upstash Redis (REST). `/api/apu/extraer-texto` NO las necesita: no toca Redis.
- **`FULL_HIGIENE_MS`**: periodicidad de la full de higiene mensual en modo auto.
- **Límites**: respuesta ≤ 4,5 MB; valor Redis ≤ 1 MB (chunks deflate ≤ 500 KB antes del base64); crons Hobby
  solo diarios (por eso la full se auto-encadena y cada visita refresca vía delta); `maxDuration` 60 s;
  despliegue ≤ 250 MB (**distinto** del límite de invocación: se confunden siempre).
- **TOPE DURO: 12 funciones serverless** (plan Hobby) y el repositorio está EXACTAMENTE en 12, con prueba que
  las cuenta. Un archivo más bajo `api/` **no falla el endpoint nuevo: falla el sitio entero**. De ahí que no
  exista `/api/baja-mercado`, que `/api/apu/catalogo` se plegara en `api/apu/[accion].js`, y que el desglose
  de probabilidad y la carga de experiencia vivan como `?vista=` / `?origen=`. Las URLs literales de los
  encargos son **`rewrite` de `vercel.json`**, que no cuenta como función — y **el frontend llama siempre a
  la CANÓNICA**: si el rewrite fallara, el botón debe seguir funcionando.
- `vercel.json` sirve todo con **`X-Frame-Options: DENY`** (nada se embebe por iframe) y `includeFiles`
  apunta a `data/**`.

## Endpoints

| URL | Token | Qué hace |
|---|---|---|
| `/api/sync` | no (idempotente) | Ingesta full/delta/auto (`?modo=full\|auto`); `?estado=true` y `?reset=true` sí exigen token |
| `/api/sync/historico` | **sí** | Backfill: `?desde=&hasta=`, `?reconstruir_indice=`, `?reconstruir_baja=`, `?reconstruir_todo=` |
| `/api/oportunidades` | **opcional** | Listado por perfil; único con token opcional (ver «Redacción pública») |
| `/api/diagnostico` | **sí** | SOLO LEE: embudo, contrafactuales, puertas, `columnas_historicas`, equivalencias |
| `/api/resumen` | **sí** | Dashboard; caché `resumen:{perfil}` TTL 300 s |
| `/api/competencia-detalle` | **sí** | Vista entidad y `?vista=probabilidad` (alias `/api/probabilidad-desglose`) |
| `/api/indice-baja` | **sí** | Consulta, `?modalidad=` y `?reconstruir=true` |
| `/api/admin/rup` | **sí**, salvo `?origen=pdf` | POST carga RUP (`?origen=pdf` es la ÚNICA escritura sin token); DELETE `?perfil=` |
| `/api/admin/experiencia` | **sí** | POST contratos; `?origen=repositorio` carga los del repositorio |
| `/api/admin/cobertura-rup` | **sí** | Huecos del RUP; `perfil` obligatorio sin default |
| `/api/admin/apu/cargar-catalogo` | **sí** | Carga del catálogo de precios (`?forzar=true`) |
| `/api/apu/[accion]` | `catalogo` no; resto **sí** | `catalogo`, `inferir`, `calcular`, `rentabilidad`, `importar`, `guardar`, `cargar`, `listar`; `accion` se lee de `req.query` **y del path como respaldo** |
| `/api/apu/extraer-texto`, `/api/apu/descargar` | — | Lector de pliegos; no tocan Redis |

**La autorización vive en `lib/auth.js`, UNA sola vez**; una copia desincronizada es un agujero. **Token por
header O por `?token=`, y el header gana**: el dueño trabaja en un portátil institucional SIN terminal, así
que la vía real de disparo es pegar la URL en Chrome — no quitar la vía por query «por seguridad», dejaría
la extracción imposible de lanzar. El precio (token en logs e historial) está asumido; rotarlo al terminar el
backfill. Un 401 **jamás** deja el candado puesto (autorizar corre antes de tomarlo).

## Reglas transversales (el resto del documento las invoca por nombre)

- **R1 · «0 no es sin dato».** Nunca codificar una ausencia como cero: `anticipo_pct=0` («la fuente no
  publica anticipo»), 0 oferentes, `score` de experiencia, cantidad ilegible del pliego, probabilidad `null`,
  precio de insumo. Un `|| 0` sobre un conteo convierte «no sé» en «cero» y lo hace creíble; hay pruebas que
  prohíben `i.<conteo> || 0` y `f.cantidad || 0` en los frontends. **Excepciones declaradas**: en
  `lib/indice_baja` el cero SÍ es dato (adjudicar por el presupuesto oficial es la mediana), y en el editor
  de APU `anticipo_pct` distingue `null` de `0` porque lo teclea alguien que lo sabe.
- **R2 · Una sola fuente de verdad: LLAMAR, no reimplementar.** Dos cálculos «equivalentes hoy» divergen a la
  primera corrección aplicada a uno solo. Por eso `/api/resumen` llama a `filtrarProcesosVisibles`,
  `apu/calculo` a `costoDirecto()`, `rentabilidad` toma el `resumen` de `calculo` tal cual, el `optimizador`
  llama a `rentabilidad()` por punto, `competencia_detalle` usa el índice y `trazaP` es la única
  implementación de la cadena de probabilidad. Corolario: **tres listas paralelas de «esto no es obra»
  divergen igual** — las puertas del APU reutilizan `BLACKLIST_OBJETO`, `evaluarPertinencia` y
  `esSuministroPuro`.
- **R3 · Dos cosas distintas no pueden llevar nombres parecidos.** Costó caro tres veces: `total_procesos`
  vs. `procesos_contados` (el frontend leía el payload ajeno y contaba 0 siempre); `cargado` (booleano) vs.
  `cargado_el` (fecha), donde la cadena pisaba al booleano y el panel decía «cargado» sobre un Redis vacío
  —cerradura: prueba de TIPO—; y `cantidad_por_unidad` del catálogo (1,30) vs. el campo homónimo publicado
  (1,365, con el desperdicio dentro) → renombrado a `cantidad_base`.
- **R4 · El arranque automático va AL FINAL del IIFE.** Junto al gate, `buscar()` revienta en la zona muerta
  temporal de constantes declaradas más abajo y, como es `async`, el error sale por una promesa rechazada: la
  app se queda sin resultados **EN SILENCIO**. Bug del día uno, repetido en `admin.js` y `apu.js`; el ancla
  de la prueba es `const guardadoRup = perfilRupGuardado();` DESPUÉS de `let CATALOGO = null;` y
  `let dashboardCargando = false;`.
- **R5 · `require` DIFERIDO dentro de la función para romper ciclos**: `filtros → rup → filtros`,
  `filtros → negocio → filtros`, `apu/inferencia → filtros`, cubetas de `indice_baja` ←
  `MODALIDADES_COMPETITIVAS`, `apu/normativa` ← `apu/calculo`. `lib/unspsc.js` es HOJA del grafo (importar
  perfiles cerraría `perfiles → unspsc → perfiles`) y `norm` vive en `lib/semantica.js` —
  `indice_competencia` la importa de ahí, nunca de `filtros`.
- **R6 · No bloquear por falta de información.** El falso negativo cuesta más que un 🟡 que se descarta en
  5 s: la pertinencia deja pasar en amarillo, las puertas marcan `sin_dato` y DEJAN PASAR, la región sin
  factor sale `sin_base` y el presupuesto se calcula igual. **INVERTIDA en el módulo APU**: ahí un ítem
  inventado o una cantidad mal leída es plata, y el semáforo puede descartar el parseo entero.
- **R7 · Ninguna pulsación sin respuesta visible** (un botón que no hace nada visible es peor que un error), y
  **R8 · el parseo del JSON va APARTE del `fetch`**, porque el muro del edge (Password Protection) responde
  HTML y `r.json()` LANZA: con las dos cosas en el mismo `try`, ese muro se diagnostica como «sin conexión»,
  lo contrario de la verdad. Aplicado tres veces.
- **R9 · El sello se escribe AL FINAL** (whitelists → configuración → versión; hashes → snapshot → meta), con
  sufijo aleatorio además del ISO, y la carga es TODO O NADA, validada entera antes del primer `HSET`.
- **R10 · Una cifra viaja SIEMPRE con su fuente** (`granularidad_utilizada`, `modalidad_utilizada`,
  `catalogo.fuente`, `precio_origen_{region}`, `via`, la fuente de `p_ganar`), y **el veredicto de un bloque
  no puede leer un campo que ese bloque no publica**: el censo contaba en `utiles` y publicaba
  `con_dato_util`, así que la conclusión leía `undefined > 0` = `false` y anunciaba «ninguna candidata trae
  datos» encima de una baja ya calculada. Hay pruebas que prohíben que el texto contradiga a sus cifras.
- **R11 · Las claves que no se purgan obligan al LECTOR a aceptar el formato viejo.** `indice:competencia`,
  `indice:baja` y `licitaciones:historico:mes:*` nunca se purgan, así que arreglar solo el escritor deja el
  defecto en pantalla indefinidamente: de ahí `claveLegado` (se lee, jamás se escribe), el alias
  `procesos`/`procesos_contados` y que `bajaDeMercado` responda exacto sin `por_modalidad`. **Desplegar nunca
  debe exigir reconstruir.**
- **R12 · Comprobar por regex que una función se LLAMA no prueba que su resultado se MIRE**:
  `ejecutarAuditoria` no devolvía nada y el `return true` del paso 2 era incondicional, así que la cadena
  escribía «✔ 2/3» sobre una auditoría que no había corrido.

## Ingesta y sincronización

- **Keyset por `:id`**, nunca `$offset` con orden por fecha (pierde/duplica filas en vivo).
  `$select=":id,:updated_at,*"` y proyección en cliente: un `$select` explícito con columna inexistente da
  400, y la fecha de cierre vive en columnas distintas según la modalidad.
- **Un 400 de Socrata jamás se reintenta ni degrada el modo por fallo de red**; solo un 400 real degrada
  keyset→offset. 429/5xx → backoff exponencial + jitter honrando `Retry-After`.
- **Candado con TTL siempre** (`lock:sync`, SET NX EX 300; 600 s en la cadena de la full), liberación por
  token: garantía contra el «enCurso eterno» de la versión vieja.
- **`_k` = `id_del_proceso` primero, `:id` de respaldo** (las re-publicaciones regeneran los `:id`); dedup en
  lectura: gana el `:updated_at` más reciente.
- **`last_sync` se ancla al INICIO de la corrida**: un delta cortado por presupuesto aplica lo bajado pero NO
  avanza el sello, o se perderían páginas en silencio. **Timestamps**: hora Colombia FLOTANTE (UTC-5 fija);
  `:updated_at` es UTC. **`plazoMeses`**: normalizar acentos antes de comparar unidades («Días».includes("dia")
  era `false` por la í — bug histórico del K).
- **Prefiltro al sincronizar** (modalidad → estado → `admisibleParaIngesta`): sin él el año son ~500 k filas y
  revienta Upstash y la memoria de la función. **NO evalúa los RUP**: solo exige full si se toca
  `admisibleParaIngesta` o la blacklist, nunca el matching.
- **El delta conserva los cerrados a propósito** (`conservarCerradas:true`): sin ellos el dedup no reemplaza
  la versión abierta, que quedaría congelada para siempre. La full sí los excluye de origen. La **full de
  higiene mensual** (`FULL_HIGIENE_MS`) acota la deriva de los procesos cuya modalidad u objeto mutó; tumbas
  por descartado costarían demasiado Redis (decisión consciente).
- **Dos keyspaces con ciclos opuestos**: `licitaciones:activo:mes:*` (lo que sirve la app; la full de higiene
  y la compactación lo purgan) y `licitaciones:historico:mes:*` (cerrados con adjudicación; **NADA lo purga**
  — era esa purga la que impedía cualquier análisis). `licitaciones:mes:*` es legado y la full lo borra.
- **Quién alimenta el histórico: el DELTA**, único que ve la transición abierto → cerrado, y **escribe primero
  el histórico y después el reemplazo en activo** (al revés se perdería el dato histórico si falla a mitad).
  El cerrado SIGUE entrando al activo —es lo que lo hace desaparecer por dedup— y quien lo saca físicamente es
  la compactación o la siguiente full. `api/sync/historico.js` solo hace el backfill previo.
- **Dos proyecciones a propósito** (`lib/proyeccion.js`): la activa NO lleva datos de adjudicación (ni se
  exponen ni se guardan); la histórica sí. `repartirDelta` hace las dos en una pasada.
- **`?estado=true` y `?reset=true`**: única forma de diagnosticar y destrabar sin terminal. `estado` solo
  lee; `reset` borra candado/progreso/meta **sin tocar los chunks bajados**. Antes de resetear, MIRAR el
  estado: candado libre + extracción sin terminar = la cadena murió (Password Protection interceptando la
  auto-llamada es lo típico) y basta volver a llamar la URL.
- **El panel encadena la full desde el navegador**: 1.ª tanda `modo=full` (REINICIA) y las siguientes
  `modo=auto` (CONTINÚA), porque repetir `full` volvería a enero para siempre — hay prueba de la invariante y
  de que **`let modo = "full"` aparece UNA sola vez**. Existe porque el fire-and-forget muere con Password
  Protection.

## Filtros: estado, modalidad y objeto (`lib/filtros.js`)

- **Estado desconocido = CERRADO**, con listas canónicas normalizadas y sin fallbacks optimistas;
  «seleccionado» NO puede ir entre los cerrados porque haría prefijo con la fase «Selección», donde se reciben
  ofertas. **`estado_cerrado` NO es la negación de `estado_abierto`**: hay TRES estados, y un desconocido no
  está abierto pero tampoco consta como cerrado.
- **`Activo` faltaba en `ESTADOS_ABIERTOS` — CORREGIDO (ago 2026).** `estado` documentado: **Activo ·
  Adjudicado · Desierto · Celebrado**; `fase`: **Planeación · Selección · Evaluación · Adjudicación ·
  Contratación · Ejecución**. «activo» no estaba en ninguna lista y se descartaba EN SILENCIO. Seguro porque
  **los cerrados ganan siempre** (`Activo` + fase `Adjudicación`, o `adjudicado="Si"`, sigue cerrado).
  ⚠️ Exige relanzar la full una vez: el filtro corre en la INGESTA. **Hueco menor deliberado**: `estado` vacío
  con solo `fase="Selección"` cuenta como cerrado, porque meter «seleccion» haría que «Seleccionado» pasara a
  abierto por prefijo.
- **EL RELOJ CIERRA PROCESOS** (`cierre_vencido`): «INVITACION PRIVADA EDUH-Turbo», límite 20/02/2026, seguía
  servido como abierto seis meses después. `fecha_cierre` pasada = cerrado **diga lo que diga el estado
  declarado**. **La hora Colombia no es un detalle**: los timestamps son FLOTANTES sin zona y `Date.parse` los
  lee como UTC (+5 h), así que comparar contra `Date.now()` cerraría los procesos **cinco horas antes** y
  borraría los que cierran HOY; se compara contra `ahora − 5 h` (con una columna CON zona la resta sería 5 h
  indulgente: el error cae del lado de mostrar de más). Prueba con el «ahora» INYECTADO. **Corre TAMBIÉN en la
  ingesta**, derivando la fecha de las columnas crudas con la misma `fechaCierre` de `lib/negocio` (R5).
- **Modalidad por lista blanca**: Contratación Directa (incluida «(con ofertas)») y Licitación Privada fuera;
  Régimen Especial fuera SALVO «(con ofertas)»; desconocida fuera. **«Invitación Privada» NO es competitiva**
  (la entidad elige a quién invita): se colaba porque su objeto era obra impecable; va como subcadena para
  cubrir sufijos. **«Enajenación de bienes con Subasta» se excluye ANTES** de que la lista blanca vea
  «subasta».
- **Convenios NO son licitaciones** (`es_convenio`, ANTES que todo lo demás del objeto): «AUNAR ESFUERZOS
  TÉCNICOS, ADMINISTRATIVOS Y FINANCIEROS…» (Ley 489/1998 arts. 95-96) se colaba bajo «Régimen Especial (con
  ofertas)». «Aunar esfuerzos/recursos» descarta esté donde esté; «convenio interadministrativo» SOLO si
  encabeza el objeto, o se lleva por delante la obra que lo menciona de paso.
- **`TERMINOS_ESTRUCTURACION`**: «seleccionar accionista para constituir una sociedad de economía mixta que
  construya…» pasa la cascada con toda razón, pero se busca capital, no un constructor. Intocables: «app» con
  frontera de palabra (sigla de Asociación Público-Privada) y «concesión **de aguas**» exceptuada.
- **La cascada vive UNA sola vez** (`filtrarProcesosVisibles`), llamada por `/api/oportunidades` y
  `/api/resumen` (R2). Los filtros que ELIGE quien consulta (cuantía, competencia, ubicación, tier) quedan
  fuera: si entraran, `totales.visibles` dependería de lo marcado en pantalla.

## UNSPSC, juicio fino y pertinencia

- **El bug ESTRUCTURAL era el acoplamiento**: el matching corría en el prefiltro, así que cada mejora exigía
  una full y lo descartado nunca había entrado a Redis. Hoy `admisibleParaIngesta` (ancho, sin perfiles,
  <1 ms/proceso) decide qué se GUARDA y `evaluarObjeto(l, perfil, conocimiento)` qué se SIRVE: afinar el
  matching o cargar un RUP tiene efecto INMEDIATO. **La blacklist semántica se queda en la ingesta** aunque el
  juicio la repita: no es juicio por perfil y evita pagar Redis por medio SECOP.
- **UNSPSC se compara por JERARQUÍA leyendo el NIVEL del código**: el nivel sale de los pares «00» finales —
  `72000000` es un SEGMENTO, no «el producto cero». Match BIDIRECCIONAL: la clase del RUP contiene al producto
  publicado (tier `clase`) y el proceso a nivel de familia contiene clases del RUP (tier `familia`, amplio:
  verificar pliego). **El upward matching llega hasta FAMILIA, jamás a segmento** (casaría «servicios de
  construcción» con cualquier cosa del 72); un segmento suelto solo se rescata si el objeto lo confirma. Los
  393 códigos de los RUP terminan TODOS en «00» (inscripción por clase): premisa de todo esto.
- **Tokenizar por RUNS de dígitos, nunca con `\d{8}`** (fabricaba códigos falsos: «1234567890» → 12345678).
  Solo longitudes 2/4/6/8; lo demás se descarta Y SE CUENTA.
- **Capa anti-suministro**: obra anclada + verbo de compra sin verbo de obra = compra disfrazada → fuera. El
  corte de «bienes» es TODO segmento < 70 (no la lista 30/39/43/48/56, que dejaba servida la «compraventa de
  tubería PVC», segmento 40, el bloque más grande del RUP de Génesis). ANCLA un código ≥ 70 **salvo**
  servicios no constructivos (80, 84, 85, 86, 90-94): antes una «ADQUISICIÓN DE MOBILIARIO» con un 80101600
  de gerencia quedaba anclada. Su `VERBO_OBRA_RE` es lista de ACCIONES, más corta que `VERBOS_DE_OBRA_FUERTES`
  (con sustantivos como «acueducto»): «SUMINISTRO DE TUBERÍA PARA LA RED DE ACUEDUCTO» es compra y cae aquí.
- **Capa de PERTINENCIA** (`evaluarPertinencia`, DESPUÉS del matching): los segmentos 80 (gerencia), 85
  (salud) y 93 (sociales) están en los RUP por la gerencia de proyectos y la interventoría, y por eso se
  colaban impresión, alimentos, internet, cumpleaños y apoyo logístico con código válido. Regla: verbo de obra
  → pasa; término no pertinente con CERO verbos → fuera; sin verbo pero con tier `clase` en segmento de obra
  pura (72/77/81/95) → pasa; resto → AMARILLO (R6).
- **Tres reglas salidas del diagnóstico REAL**: (1) `TERMINOS_BLOQUEANTES` (internet y familia) descartan
  AUNQUE haya verbo de obra —«SERVICIO DE INTERNET DEDICADO CON INSTALACIÓN Y CANALIZACIÓN DE REDES» los
  traía—, con lista CORTA a propósito y «fibra óptica» exigiendo contexto de servicio; (2) `esObjetoGenerico`
  descarta el número del proceso disfrazado de descripción («CONCURSO DE MERITOS INV-CM-001-2026»: <15
  caracteres, o sin contenido tras quitar trámite y códigos, y sin verbo de obra), única regla que descarta un
  proceso con UNSPSC sólido y por eso el diagnóstico muestra ejemplos; (3) **la ruta de TEXTO exige
  pertinencia VERDE** (1 077 procesos entraban por texto y el vocabulario genérico de familia metía equipos y
  servicios; sin código del RUP el objeto es la única evidencia y un 🟡 no es evidencia de nada), y se reabre
  con `?incluir_sin_unspsc=1`, apagado por defecto.
- **Verbos ambiguos CONDICIONADOS a un ancla de infraestructura cercana** («mantenimiento de la red de
  alcantarillado» sí, «mantenimiento de vehículos» no; ídem instalación/montaje y consultoría/diseño), y
  términos malos con excepciones por lookahead: «logística DE OBRA», «transporte DE MATERIALES», «seguridad
  VIAL».
- **Los vocabularios nuevos se comparan sobre texto NORMALIZADO** (`norm`: sin tildes, ñ→n): se escriben
  `diseno`, `senalizacion`, `cumpleanos`. Los heredados (`BLACKLIST_OBJETO`, `WHITELIST_OBRA`) van sobre texto
  CRUDO con `[oó]` y flag `i`: **no tocarlos**, cambiar su base sería regresión silenciosa.
- **Códigos que no casan + objeto inequívoco de obra → se RESCATA** con el tier `texto`; un objeto sin
  vocabulario de obra muere en `fuera_unspsc`, que el diagnóstico separa de `fuera_sin_unspsc_ni_obra`.
- **Equivalencias funcionales** (`lib/equivalencias.js`): lift ≥ 3 sobre ADJUDICATARIOS (no sobre procesos:
  una entidad con 40 procesos gemelos no puede fabricar una equivalencia), soporte ≥ 20 procesos en la clase
  inscrita, ≥ 5 adjudicatarios en la intersección y solo pares con A en la unión de los RUP. Es AYUDA A LA
  DECISIÓN, no habilitación jurídica: el tier `equivalente` es más débil que `clase`. **Un índice en CERO
  tiene cuatro causas** que el `0` no distingue (nunca se construyó, el dataset no trae adjudicatario —la
  típica—, nadie ganó en dos clases, ningún par alcanza los umbrales): `explicarEquivalencias()` las traduce,
  y si el problema son las columnas de adjudicatario, bajar el lift no arregla nada.
- **Vocabulario por familia**: `data/vocabulario_unspsc.json` es SEMILLA CURADA A MANO, no estadística; el
  derivado del histórico se MEZCLA con ella familia a familia, y solo se acumulan familias inscritas.

## `/api/diagnostico` (solo lectura)

EMBUDO paso a paso sobre el corpus real más contrafactuales (`ganancia_por_jerarquia`,
`ganancia_por_equivalencias`, `ganancia_por_texto`, `visibles_sin_capa_pertinencia`). **Antes de tocar un
filtro «porque salen pocos», MIRARLO.** Invariantes probadas: los pasos suman el total; el reparto por tier
suma exactamente los visibles; `visibles_por_pertinencia.rojo` es SIEMPRE 0; y **`embudo.visibles = viables +
distribucion_puertas.fallan_p3`**, con `pasan_todas` == el `viables` de la app (la igualdad simple con el
`total` de `/api/oportunidades` dejó de valer al encender `solo_viables`). **Las puertas van ANIDADAS en
`embudo.puertas.*`**: corren DESPUÉS, sobre los visibles, donde un proceso puede fallar dos a la vez. **No
escribe, no toma candados, no sincroniza** — esa garantía es lo que permite llamarlo cuando algo va mal.

**`columnas_historicas`** censa el corpus HISTÓRICO: con qué nombre EXACTO llegó cada columna de adjudicación
y si la baja se puede calcular con lo bajado; sustituye al síntoma indirecto de siempre (`clasificadas: 0`).
Las candidatas se IMPORTAN de `lib/indice_competencia` (R2); `con_dato` y `con_dato_util` se cuentan aparte
(R1); y un 0 tiene DOS causas que el censo no distingue —la fuente no la publica o la proyección no la
guarda—, por eso se publica `claves_observadas` con la verdad literal del JSON. **La baja exige las dos
mitades en la MISMA fila**: sumar coberturas por separado da un número más bonito y falso.

## Índice de COMPETENCIA por entidad (`lib/indice_competencia.js`, `indice:competencia`)

Tertiles sobre el promedio de oferentes de 2 años; alimenta `ordenar_por=atractividad`.

- **0 oferentes = SIN DATO** (R1): contarlo hundiría el promedio y todas las entidades acabarían en «baja».
- **Tertiles con `<=` y mínimo de 5 procesos**; con menos, `sin_dato`, que en el orden va ANTES que `alta`.
- **Swap atómico** (`indice:competencia:nuevo` → RENAME): nunca hay ventana sin índice. Construcción mes a
  mes y reanudable; el acumulador persistido es por ENTIDAD (histograma), no por proceso. **Al cerrar una full
  se reconstruye con `await` y presupuesto corto**, no fire-and-forget: en serverless la función se congela al
  responder y una promesa suelta no acaba.
- **Columnas de adjudicación/oferentes: PENDIENTE VERIFICACIÓN** (no se alcanza datos.gov.co); se leen por
  lista de candidatas, y el síntoma de que falta la correcta es `meta` con `clasificadas: 0` y
  `descartados.sin_oferentes` alto → añadir el nombre real y llamar `?reconstruir_indice=true`.
- **El badge es AUDITABLE** (`/api/competencia-detalle` + `lib/competencia_detalle.js`): enseña los procesos
  que forman el promedio y los que NO, con motivo (`sin_dato_oferentes`, `sin_adjudicacion`,
  `insuficientes_datos`), y **no es un segundo cálculo** (R2). Caché `indice:detalle:*` (TTL 1 h) con el sello
  del índice; una respuesta con chunks ilegibles NO se cachea.

**Tres defectos de producción del badge.** (1) **«en 0 procesos» era un CAMPO INEXISTENTE**: se leía
`i.total_procesos` de un payload que lo llama `procesos_contados` (R3) y el `|| 0` disfrazaba el `undefined`.
(2) **«⚪ Sin datos históricos» con un promedio debajo**: se exigía índice clasificado para el `nivel` pero
solo `contados ≥ 5` para el `promedio`; hoy el `mensaje` dice por qué la banda sigue en ⚪ y con qué parámetro
se arregla. (3) **«18.2 oferentes» sin base**: el índice publicaba el `promedio` de entidades no clasificables,
y las cerraduras son tres —`registroPublicado` no publica cifras derivadas bajo el mínimo (ni
`oferentes_total`, con el que se recalcularía); **`competenciaDe` es el punto único de paso** e impone la
invariante; y el badge exige `conBase` antes de interpolar—, siendo la segunda la importante por R11.

**Identidad de la entidad.** **Un NIT NO identifica a una entidad** (las regionales publican con el NIT de la
matriz): el alias `nit:{NIT}` iba **primero** en `competenciaDe`, así que una entidad con nombre bien escrito
y registro propio enseñaba el nivel de su hermana, en silencio. Orden actual: **clave canónica → clave legado
→ alias**, y el escritor **no publica alias para un NIT compartido** (los cuenta en `meta.nits_ambiguos`); el
alias sigue existiendo para que un cambio de razón social no parta el historial. **La puntuación partía una
entidad en dos**: `claveBusqueda` (sin puntuación) agrupaba el corpus y `claveIndice` (`norm` a secas) leía el
hash, así que dos grafías de la misma entidad se sumaban al contar y no al leer — eran **dos definiciones de
«entidad» conviviendo**, y hoy hay una sola, `claveCanonica`, importada por el detalle. **`claveLegado` no se
escribe jamás, solo se lee** (R11). 
**«Ofertas del proceso»: una constante que se seguía pintando.** El contador de oferentes es **ex-post**: en
un proceso abierto vale 0 y `nivelCompetencia(0) = "baja" = 100`, así que era constante en todo lo servido, y
retirarlo del puntaje no bastó (la tarjeta ponía un chip VERDE en cada proceso y el desplegable tenía una
opción que no filtraba nada y dos que vaciaban la lista). Se retira la **PRESENTACIÓN, no el campo** (quien
responde CON BASE es `competencia_entidad`); **`?nivel_competencia=` queda INERTE, no da 400**;
**`?ordenar_por=competencia` leía el campo de la FILA, no el de la entidad** —o sea, no ordenaba— y hoy lee
`competencia_nivel`; y **el fixture tapaba el defecto**, porque daba `respuestas_al_procedimiento` también a
las filas abiertas. Hoy solo la llevan las adjudicadas, y la suite MIDE cuántos valores distintos toma el
campo en el corpus servido: **1 en 384 procesos**.

## Índice de BAJA de mercado (`lib/indice_baja.js`, `indice:baja:*`)

Cuánto descuenta el ganador frente al presupuesto (`1 − adjudicado/precio_base`): la otra mitad de la decisión
de precio. Sale entero del histórico ya bajado; se reconstruye con `?reconstruir_baja=true`.

- **TRES HASHES, no una clave por entidad**: `entidad_familia` → `entidad` → `departamento_familia`. Con
  claves sueltas no habría swap atómico (RENAME mueve una sola) y la lectura serían N comandos por petición.
- **La cascada solo BAJA en especificidad** (pedir `entidad` no puede responderse con `entidad_familia`) y
  `granularidad_utilizada` viaja SIEMPRE (R10).
- **Cortes FIJOS (5 % / 2 %), no tertiles**: 8 puntos de baja son 8 puntos de margen compita quien compita;
  con tertiles siempre habría un tercio «alto» aunque nadie descontara.
- **Aquí el CERO SÍ es un dato** (excepción declarada de R1): adjudicar por el presupuesto oficial es la
  MEDIANA en producción, y «sin dato» es no tener las dos mitades en la MISMA fila. `baja_exactamente_cero`
  viaja en la meta: si se dispara al 100 %, la causa no es el mercado sino que `valor_total_adjudicacion` está
  copiando a `precio_base`.
- **Dos filtros de higiene salidos del censo real**: adjudicado < 30 % del oficial (295 casos: lotes
  parciales) y > 110 % (221 casos: dato malo); una baja negativa LEVE se conserva.
- **`ordenar_por=baja` puntúa `100 − baja` y da −1 al `sin_dato`** (con 0 se colaría al primer puesto, R1), y
  la familia sale de `normalizarCodigo(...).familia`, no de un `slice(0,4)`.
- **El SEGMENTO (2 díg.) agrupa, nunca empareja**: subir el matching al segmento sigue prohibido, pero para
  una estadística de precio más muestra por celda es mejor, así que van ANIDADOS dentro de cada entidad con
  mínimo propio de 3, publicando `procesos` y `min_procesos`.
- **La baja NO sale sin token** (`lib/publico`): los TRES campos en `null` **incluido el objeto entero**,
  porque `baja_mercado.mensaje` dice «Descuento típico del 8 %…» y dejarlo sería la redacción de mentira que
  dejaba el patrimonio en P3. No son finanzas del dueño —son mercado derivado de datos públicos— sino la
  ventaja competitiva que construye la app.

**Por modalidad.** La mediana global es 0 % y sugiere que nunca hay que descontar; la causa es que la mínima
cuantía se adjudica una y otra vez por el presupuesto oficial. Matiz: **el corpus histórico YA está filtrado a
modalidades competitivas**, así que lo que pasaba es que se mezclaban las SEIS entre sí, y la lista blanca
sigue haciendo trabajo real porque el histórico NO SE PURGA NUNCA y quedan registros de cuando «Invitación
Privada» y «Enajenación» aún entraban (van a `sin_modalidad`, que se cuenta). Decisiones: **la modalidad
REFINA DENTRO de cada nivel, no es un nivel más** —como escalón obligaría a decidir si «entidad+modalidad» es
más o menos específica que «entidad+familia»—, así que `granularidad_utilizada` conserva su significado y
`modalidad_utilizada` dice si hubo refinamiento; **las cubetas se DERIVAN de `MODALIDADES_COMPETITIVAS`** (R5)
más «régimen especial (con ofertas)», que `modalidad_competitiva` acepta por su propia rama y sin la cual esos
procesos perderían su baja; **mínimo 5, el de la entidad, no el laxo del segmento (3)**; **compatibilidad**
(R11): sin `por_modalidad`, `bajaDeMercado` responde como antes; **`sin_modalidad` + Σ cubetas =
`procesos_analizados`**, con prueba; y **la modalidad viaja hasta `/api/apu/rentabilidad`** (su `lic` es
SINTÉTICO), sin lo cual el editor fijaría el precio con la baja MEZCLADA mientras la tarjeta enseña la de
licitación pública.

## Dashboard (`/api/resumen`) y RUP por archivo

- **NO reimplementa la cascada, la LLAMA** (R2): `evaluarRup` + `leerChunksDedup` + el mismo `anticipo_min=20`
  y «solo abiertas», con prueba de que `totales.visibles` == el `total` de `/api/oportunidades` == el
  `embudo.visibles` del diagnóstico. ⚠️ Con `solo_viables=true` por defecto el LISTADO sirve menos que
  `totales.visibles` (la puerta de caja es posterior a la cascada); está en el `como_leerlo`, y quien vuelva a
  igualarlos mentirá.
- **Cada reparto suma los visibles**, con cubetas feas a propósito (`OTROS`, `SIN_DEPARTAMENTO`, `ya_cerro`,
  `mas_adelante`): la alternativa es que un proceso desaparezca sin que nadie lo note.
  `superan_k`/`no_superan_k` se cuentan sobre los que pasaron el juicio del OBJETO, no sobre los visibles.
- **Los destacados aplican CUATRO filtros más que el listado** (cerrado explícito, «Verificar objeto», objetos
  de estructuración, cuantía 0) y los cuentan en `destacados_descartados`: un falso positivo en el puesto 1
  cuesta más que en la página 4. **No tocan `totales.visibles`.**
- **La caché `resumen:{perfil}` (TTL 300 s) la borra cualquier carga de RUP**: sus números salen del RUP.

### Perfiles cargables (`lib/perfiles.js`, `lib/config_rup.js`)

- **`PERFILES` se exporta SÍNCRONO y con la misma identidad de objeto** (media app lo captura al requerir):
  una carga REEMPLAZA sus tres propiedades, nunca el objeto. El repositorio queda congelado como
  `PERFILES_FALLBACK`, y ante Redis caído, clave ausente o valor corrupto se conserva lo vigente o el respaldo
  y **NUNCA se lanza**: quedarse sin perfiles deja la app muda.
- **El RUP cargado entra por `PERFILES[x].unspsc`**, ÚNICO punto donde el matching lee el RUP: por eso la
  carga tiene efecto inmediato sin tocar el motor. La admisibilidad de INGESTA (`FAMILIAS_UNION`) sigue
  saliendo del repositorio: es deliberadamente ancha y cambiarla exigiría una full.
- **Sin TTL en la recarga**: un `GET` del sello `config:perfiles:version` por petición y la configuración
  entera solo si cambió, porque un TTL convertiría el «efecto inmediato» prometido en «efecto dentro de N
  minutos», que es justo lo que el dueño no puede verificar desde el navegador. El sello se escribe AL FINAL
  (R9).
- **`tope_smmlv` < `experiencia_smmlv` es ADVERTENCIA, no error**: el tope es apetito estratégico y en el RUP
  real va por debajo (Helder 6 768 acreditados, tope 4 000). **El consorcio se RE-DERIVA siempre** de sus
  integrantes (unión de UNSPSC, experiencia sumada, K = suma de las CRP) aunque venga explícito; una lista
  propia del plural se SUMA, nunca sustituye. **Carga parcial**: subir solo Génesis conserva a Helder, y un
  POST rechazado no toca nada.
- **`DELETE /api/admin/rup?perfil=…` tiene DOS semánticas y la respuesta declara cuál aplicó** (`tipo` +
  `redirigir`): un `rup_…` DEJA DE EXISTIR (clave + 4 whitelists + borradores de APU + cachés en UN solo DEL;
  la web olvida el guardado y vuelve a la landing); un perfil del dueño pierde su entrada del archivo y VUELVE
  al respaldo — **los perfiles del repositorio no se pueden borrar**. `perfil` obligatorio sin default.
  **Eliminar la ÚLTIMA entrada borra archivo y sello juntos** (el sello ausente restablece el respaldo en
  todas las instancias); con entradas restantes hay que `restablecerPerfiles()` ANTES de re-aplicar, porque
  `aplicarConfig` es parcial y el perfil borrado seguiría sirviéndose desde la memoria caliente (las demás
  instancias lo conservan hasta su arranque en frío). **NO borra** `config:experiencia` (configuración
  COMPARTIDA, una clave, no por perfil) ni los borradores de APU de un perfil del dueño; el modal tiene DOS
  textos según el tipo.

## Onboarding: RUP en PDF → perfil dinámico

- **El PDF se lee en el NAVEGADOR** (`public/onboarding.js`, pdf.js clavado en la MISMA versión que
  `pliego.js`): al servidor viaja solo el texto con columnas por TAB, `lib/rup_pdf.js` extrae códigos,
  indicadores, experiencia y vigencia, y valida con `lib/config_rup.validarPerfilDinamico` — la MISMA
  `validarPerfil` de la carga manual (R2). No existe un «RUP de PDF» distinto de un «RUP de archivo».
- **Plegado en `POST /api/admin/rup?origen=pdf`** (alias por rewrite); un GET responde 405 con
  `como_hacerlo`, jamás un «GET que escribe».
- **ES LA ÚNICA ESCRITURA SIN TOKEN, a propósito**: pedir credencial a quien llega a subir su RUP mata la
  landing, que es el producto. Cerraduras con prueba: ids `rup_…` generados en el SERVIDOR; solo puede
  escribir `config:perfiles:rup_*` y `config:unspsc:rup_*` (no alcanza los perfiles del dueño ni el sello);
  TTL 45 días; tope de perfiles vivos; cuerpo ≤ 5 MB. Sin token sus cifras viajan REDACTADAS.
- **El perfil dinámico se INYECTA en `PERFILES`** (`lib/perfil_dinamico.js`): todo el juicio resuelve
  `PERFILES[perfilId]` sobre el objeto vivo, así que inyectar evita cambiar firmas en media app. Se relee en
  CADA petición y un perfil caducado responde **404 con `perfil_caducado:true`**, que la web usa para olvidar
  el guardado.
- **Códigos: runs de EXACTAMENTE 8 dígitos** (nunca `\d{8}`, ni los runs de 2/4/6 que acepta
  `extraerCodigos`), más las filas Segmento|Familia|Clase|Producto SOLO dentro de la sección del clasificador;
  fuera de ella un run de 8 exige terminar en «00» Y que la línea no sea de dinero/contacto («UTILIDAD
  OPERACIONAL 12000000» tiene un run de 8 con segmento válido). Lo descartado SE CUENTA.
- **Lo único DERIVADO es la utilidad operacional** (rentabilidad del patrimonio × patrimonio, identidad del
  D. 1082, declarada en advertencias); los dos SUPUESTOS van declarados (profesionales = 1, suelo del factor
  CT; tope estratégico = 2 × mayor contrato acreditado). El NIT exige el guion del dígito de verificación:
  partir «NIT 900123456» inventaría un DV.
- **La landing es la primera pantalla** (`#onboarding` nace visible; el gate nace oculto pero sigue existiendo
  para los perfiles del dueño); `app.js` decide la vista al arrancar (perfil `rup_…` en URL o localStorage →
  dashboard sin gate; sesión con clave → dashboard clásico; nada → landing), al final del IIFE (R4).
- **Siete defectos que la revisión adversaria encontró antes de producción, todos con prueba**: la fecha de
  corte contaminaba el indicador (se TACHAN antes de buscar el número); un año se volvía la experiencia (la
  cifra es la ADYACENTE a la unidad); **ReDoS** en la detección de sección (→ `includes` lineales); sin tope
  de códigos un cuerpo hostil fabricaba perfiles enormes (`MAX_CODIGOS = 2000`); **Redis caído ≠ perfil
  caducado** (hoy 502, y solo el 404 real borra el perfil guardado); `?perfil=rup_…` en la URL saltaba el gate;
  y la comilla de pulgadas fusionaba filas del CSV en un contrato falso que PASABA el validador (una comilla
  solo abre campo al PRINCIPIO de la celda, RFC 4180).

## Experiencia ejecutada y cobertura del RUP

**El RUP dice a qué PUEDE presentarse; los contratos ejecutados, en qué SABE trabajar.**
`/api/admin/experiencia` guarda la lista real (`config:experiencia`) y destila un vocabulario del oficio
(`config:experiencia:terminos`); `/api/admin/cobertura-rup` lo cruza con el histórico adjudicado y responde
**qué códigos usa el mercado para lo que este señor ya hace y cuáles no tiene inscritos**.

- **No reinventa ninguna regla** (R2): pertinencia = `evaluarPertinencia`; los segmentos que pueden ser un
  hueco son 70–95 MENOS `SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS`; «claramente obra civil» es
  `SEGMENTOS_OBRA_PURA`.
- **Los tokens con dígitos se descartan del vocabulario** (`2024`, `cm001`): si entraran, cualquier proceso
  que mencione un año ganaría similitud gratis. Las stopwords incluyen el TRÁMITE contractual (`prestacion`,
  `servicios`, `contrato`, `objeto`). **Sin experiencia cargada el score viaja en `null`, jamás en 0** (R1).
- **Criticidad como CASCADA** (los umbrales del encargo se solapaban): 3 procesos con similitud floja son
  BAJO, y **un solo proceso nunca pasa de BAJO** — un contrato no es una tendencia y está en juego un código
  que hay que sostener un año en el RUP.
- **La caché lleva el sello del RUP Y el de la experiencia** (`cobertura:{perfil}:{exp|base}`, TTL 1 h).
- **Es el único panel que NO se dispara solo** (recorre el histórico entero), y **`perfil` es obligatorio sin
  default**: la respuesta se lee como «lo que te falta a TI»; hay prueba de que `85121700` es hueco para
  Helder y no para Génesis. Los fixtures del histórico van SIN conteo de oferentes y **sin descripción en los
  objetos**, porque el score está calibrado al tercer decimal (0,167, entre el 0,15 que deja entrar y el 0,20
  de ALTO).

**Puesta en producción sin terminal.** Crear `api/admin/cargar-experiencia-genesis.js` habría roto el
despliegue entero (tope de 12), así que va **plegado en `/api/admin/experiencia?origen=repositorio`**. **El
archivo se lee con `require` ESTÁTICO, jamás con `fs` sobre ruta construida**: con ruta dinámica el tracer de
Vercel no lo mete en el bundle y el endpoint respondería 500 **SOLO EN PRODUCCIÓN**. **El flag va en la QUERY,
no en el cuerpo**, porque `validarContratos` IGNORA las claves extra de la raíz y un flag mal escrito dentro
del JSON cargaría los contratos pegados con un 200 idéntico (fuente equivocada, sin síntoma). **EL ALIAS
PEGADO EN CHROME ES UN GET, y por poco miente**: la rama GET retornaba ANTES de mirar `origen` y respondía
`200 {ok:true, cargada:false, contratos_cargados:0}` —un «no hice nada» con cara de éxito (R1/R3)—, y hoy da
**405 con `Allow: POST` y `como_hacerlo`** sin convertirse en un «GET que escribe». **Los tres pasos del panel
no reimplementan ninguno** (R2), **la cadena se detiene en el primer fallo**, el paso 2 PROPAGA el booleano de
`ejecutarAuditoria` (R12) y **la guarda de «auditoría EN VUELO» va ANTES de tocar el selector** —comprobarla
después deja el selector en «genesis» y `pintarCobertura` estampa cifras de OTRO perfil bajo ese rótulo—.
Fijar `c-perfil.value` desde código NO dispara `change`, así que se invalida vía `invalidarCoberturaPintada`.

## Página única, token integrado y piel Apple (ago 2026)

Se retiraron `admin.html`, `apu.html`, `pliego.html`, `admin.js` y `apu.js`; queda `index.html` (tres
pestañas: 🏠 `#/licitaciones` · 📊 `#/apu` · ⚙️ `#/admin`) y `public/app.js` como único módulo, ENSAMBLADO de
los tres anteriores.

- **El TOKEN va INTEGRADO** (`const TOKEN = "MiExtraccion2025"`, en app.js, pliego.js y onboarding.js) y el
  usuario no ve formulario ni error de token. Hay que contarlo exacto: **ese literal no es un secreto** (está
  en el fuente) y la seguridad REAL es Vercel Password Protection más el gate de clave; **los endpoints NO se
  relajaron** —siguen exigiendo `HISTORICO_TOKEN`—, así que un 401 se explica como lo que es
  («HISTORICO_TOKEN no coincide con el de la aplicación») y en la lista pública `tokenRechazado` degrada a la
  vista sin cifras en vez de entrar en bucle. La suite PROHÍBE que vuelvan `pedirToken`, `exigirToken`,
  `pintarEstadoToken`, `CLAVE_TOKEN` y los formularios, y que el token viaje en una URL.
- **Un solo gate y un solo arranque, AL FINAL del IIFE** (R4); cada pestaña arranca lo suyo la PRIMERA vez que
  se abre (`arrancadas.{apu,admin,pliego}`), así que abrir la app no dispara el panel ni el catálogo.
- **`pliego.js` y `onboarding.js` siguen siendo archivos propios**: sus funciones (`numeroLocal`,
  `lineasDePagina`, `parsearCsv`) están atadas por pruebas que las EXTRAEN por archivo. `pliego.js` expone
  `window.__pliegoArrancar` y la pestaña APU lo llama una vez; su marcado vive en `index.html` con ids `pl-*`
  donde colisionaban. - **El botón «APU» ya no abre otra página**: `abrirEditorConProceso` fija `paramsProceso` y cambia de pestaña
  con **la MISMA cadena de parámetros** que viajaba por URL (`precargarDesdeURL` conserva `location.search`
  para enlaces guardados). Vive dentro de una fila cuyo clic abre SECOP II, así que la guarda
  `closest(".btn-apu")` va **ANTES** de resolver la fila.
- **Las URLs viejas redirigen** (`vercel.json`): `/admin.html` → `/#/admin`, `/apu.html` y `/pliego.html` →
  `/#/apu`, y hay prueba de que los cinco archivos retirados no pueden volver (uno resucitado no lo cargaría
  nadie y quedaría desincronizado en silencio).

### Piel Apple Glass

- **Cambió la dirección, no la técnica**: el tema oscuro (#0f172a) vivía en una capa CSS que re-mapeaba las
  utilidades CLARAS de las plantillas JS, y el rediseño la REEMPLAZA por la paleta Apple sobre custom
  properties (claro #f5f5f7 / oscuro #000, acento #007AFF, `:root` + `prefers-color-scheme: dark`) conservando
  la técnica: el JS sigue diciendo `bg-white`/`bg-gray-900`/`text-gray-500` y el `<style>` las traduce, porque
  reescribir cientos de cadenas habría chocado con media suite (regexes sobre clases). El `backdrop-filter` va
  SOLO en tarjetas de nivel superior, la suite prohíbe que vuelva el tema viejo (#0f172a/#1e293b/#334155/
  #34d399/#052e22 y utilidades `*-slate-*`) y el SVG del optimizador pinta #007AFF/#86868b literales porque no
  hereda custom properties.
- **El «bug de pestañas vacías» del encargo NO existía**; lo que se hizo fue BLINDARLO: la prueba cruza TODOS
  los `$("id")`/`getElementById` de los tres JS contra los ids del HTML, porque la causa típica de una pestaña
  muerta es una referencia a un nodo retirado, cuya excepción detiene el script en silencio.
- **La probabilidad de la tarjeta es una FRASE, no un porcentaje** (`fraseProbabilidad`): 🟢 muy alta (>40 %)
  · 🟡 buena (20–40 %) · 🟠 media (10–20 %) · 🔴 poco probable (<10 %) · ⚪ «Sin información suficiente»
  (`null`; la ausencia jamás es 0 %, R1). Debajo, UNA frase con el factor principal (`motivoProbabilidad`:
  poca competencia → prórroga → colisión → baja alta → baja ≈0 → «Basado en N procesos» → supuesto
  conservador), y ninguna interpola una cifra sin base. Las dos funciones se prueban EJECUTÁNDOLAS extraídas
  del fuente, con los bordes: 0,40 es «buena», 0 medido es 🔴 (es un dato), `null` es ⚪. **El editor de APU y
  el optimizador CONSERVAN el porcentaje**: allí la cifra alimenta una decisión de precio.

## Módulo APU · lectura del formulario de cantidades de un pliego

`public/pliego.js` + `/api/apu/extraer-texto` + `lib/apu_pliego.js` + `lib/apu_mapeo.js` + `lib/apu_ocr.js` +
`/api/apu/descargar`. **Entrega cantidades, NO precios.** (El encargo pedía una «Fase 4» dando por hecho que
las Fases 1-3 estaban en `main`, y **no existía nada de APU en `main`**.)

- **DOS CATÁLOGOS, separación deliberada**: el lector usa `data/catalogo_apu.json` (93 ítems **sin precios**,
  con sinónimos: DICCIONARIO DE RECONOCIMIENTO) y el editor `data/apu_catalogo.json` (**con precios**,
  composición y rendimiento: BIBLIOTECA DE COSTEO). Responden a preguntas distintas y no se fusionan; sí se
  EMITE el código del catálogo de precios cuando el ítem existe allí, para no tener dos identidades.
- **AQUÍ EL FALSO POSITIVO CUESTA MÁS QUE EL FALSO NEGATIVO** (R6 invertida): el semáforo puede DESCARTAR el
  parseo entero y nunca se usa automáticamente una lista a medias.
- **El PDF se lee en el NAVEGADOR, y la decisión está medida**: `tesseract.js@7` + `spa.traineddata` son
  **51 MB de node_modules** y exigen rasterizador nativo (`pdfjs-dist` en Node necesita `canvas`), mientras
  que el texto de un pliego de 120 páginas son ~0,34 MB contra el tope de 4,5 MB: sobra un factor 13.
- **Las columnas se conservan por COORDENADAS**: agrupar por Y forma la fila, el hueco en X decide TAB o
  espacio; con texto aplanado todo el parseo dependería de la vía de último recurso.
- **pdf.js CLAVADO en 3.11.174**: desde la v4 `pdfjs-dist` no publica build UMD, así que un `@latest` dejaría
  de definir `window.pdfjsLib` y rompería la carga en silencio. **`workerSrc` NO puede apuntar al CDN**
  (`new Worker(url)` clásico no admite otro origen: el fallo intermitente típico de pdf.js): se trae por
  `fetch` y se envuelve en un **blob del mismo origen**. Tres niveles: blob → URL directa → sin worker
  (funciona, congela la pestaña, **y se avisa**).
- **Tolerancia de FILA en pesos, jamás en porcentaje**: `max(cantidad/2 + 1, $1)`, porque el error por
  redondear el unitario al peso es `cantidad × 0,5`; un 0,5 % en una fila de $500 M admite $2,5 M y esconde el
  dígito mal leído.
- **El AIU se LEE, no se adivina, y el barrido NUNCA produce verde**: con un parámetro libre continuo de 25
  puntos casi cualquier suma encuentra un AIU que «cuadra». **El IVA sobre la utilidad no es un detalle**:
  con U = 10 % añade ≈1,9 pp, casi cuatro veces la tolerancia del 0,5 %, así que se prueban las dos variantes
  y se registra CUÁL cuadró (dice cómo presupuesta esa entidad).
- **Cantidades sin precios unitarios = AMARILLO** y **una cantidad ilegible es `null`, JAMÁS 0** (R1). **El
  VERDE exige tres cosas más que el ratio de filas**: las filas sin cantidad legible salían del denominador
  en vez de contar contra él, así que se llegaba a verde con la mayoría sin leer —y el aviso «N ítem(s) SIN
  CANTIDAD legible» salía en la MISMA respuesta—; hoy exige ninguna cantidad ilegible, **≥5 filas validadas**
  y **≥50 % de ítems validados**.
- **NINGÚN CÓDIGO `INV-` SE PUBLICA**: el índice oficial de las Especificaciones INVÍAS 2022 (Res. 4561/2022)
  nunca se pudo abrir (403), así que numeración y unidades de pago están SIN VERIFICAR; el artículo probable
  viaja en `articulo_invias_candidato` y `codigoInviasPropuesto()` deja preparado el código que se emitiría
  al confirmarlo. Sin artículo, el ítem nace `LOC-`.
- **El tokenizador del mapeo CONSERVA los dígitos**, al revés que `experiencia.tokenizar`: allí «2024» es el
  número del proceso; aquí «21» (MPa), «420» (fy) y «21» (RDE) distinguen un ítem de su hermano y **mueven el
  precio** (RDE 41→21 puede duplicar el ml). Hay prueba que impide «unificarlas».
- **La unidad NO se convierte nunca** (pasar m² a m³ exige un espesor que el catálogo no conoce): se marca
  `unidad_discrepante` y se conserva **la del pliego**, que es la que se va a pagar. **Sin match nace un ítem
  PERSONALIZADO; la fila jamás se descarta.**
- **«Sin tablas» es un RESULTADO, no un error** (200 con lista vacía y diagnóstico), y **escaneado se detecta
  POR PÁGINA** (<100 caracteres de media; un escaneo con cabecera vectorial pasaría un umbral global), con el
  mensaje «parece escaneado» y nunca «el pliego está vacío» (R1).
- **`isTable=true` de OCR.space promete texto LÍNEA A LÍNEA, no columnas**: el OCR casi nunca activa la vía
  posicional, así que es un respaldo **del que hay que decir que lee peor**. **Un 200 de OCR.space no es
  éxito**: el fallo viaja DENTRO del 200 (`IsErroredOnProcessing`, `OCRExitCode` 1/2/3/4); un 4xx no se
  reintenta (gasta cuota) y 429/5xx sí. **La rama `{url}` de `ocrPagina` desapareció** (era un SSRF POR
  DELEGACIÓN que se saltaba el control de tamaño), y **la página no puede prometer que el documento NO SALE y
  ofrecer un botón que lo manda a un tercero**: la excepción se declara antes de pulsar.
- **`/api/apu/descargar` existe porque el navegador NO puede** bajar el PDF (mismo origen; los portales no
  mandan CORS), y es un SSRF de manual: token · solo `https:` · **se RESUELVE el nombre y se valida la IP**
  (validar la cadena del hostname no protege de nada) · **redirecciones a mano revalidando cada salto** ·
  tamaño controlado mientras se lee · firma **`%PDF-`** verificada (los portales sirven HTML de sesión con
  `Content-Type: application/pdf`). Tres precisiones: `::ffff:` mapeada es IPv4 disfrazada que no veía ninguna
  familia de reglas; `^fc`/`^fd` sin delimitador rechazaban dominios REALES (`fdn.gov.co`), así que las reglas
  IPv6 solo se aplican a literales IPv6; y **`primeros_bytes` en el 415 era un oráculo de lectura**. Queda la
  ventana TOCTOU del *rebinding*, dicha y no disimulada.

**Diez defectos que el banco no vio y la revisión adversaria sí**: celda VACÍA que descolocaba el mapa de
columnas (los huecos se conservan con TAB, con DOS vistas de la línea: posicional y compacta); **la cantidad
es la cifra ADYACENTE a la unidad**; AIU e IVA desglosados como partidas inflaban el costo directo
(`NO_ES_COSTO_DIRECTO_RE`, anclada al PRINCIPIO); la vía aplanada convertía PROSA en ítems; cabecera partida
en dos líneas anclaba `total` a la columna del unitario; `leerAnticipo` tomaba el primer `%` de la línea;
`\d{1,2}` convertía «100%» en 0 %; la «a» de preposición fijaba la Administración; `375.0000` daba 3 750 000
(un punto con 4+ dígitos detrás es DECIMAL; con varios, `null`); y dos capítulos con el mismo numeral sumaban
sus hijas juntas. Además, **una línea de metadato no es prosa suelta**: la regla de continuación pegaba
«ANTICIPO: 30%» al último ítem, inventándole una descripción.

**Las dos implementaciones del número colombiano están ATADAS POR UNA PRUEBA** que las EJECUTA, y cazó una
divergencia real. **`tests/apu_bench.js` publica el LÍMITE, no solo el acierto**: 100 % de recall sobre 10
formularios sintéticos mide la habilidad del autor para prever variantes, así que hay una tanda **adversaria
sin suelos de regresión** que encontró tres defectos reales (celdas combinadas, unidad dentro de la
descripción, ambigüedad decimal); **dos se corrigieron y el tercero queda publicado**, y la distribución real
de formatos de SECOP II sigue **sin medir**. Informe en `docs/APU_INFORME_COMPLETO.md` (**no confundir con**
`docs/APU_Y_RENTABILIDAD.md`, la investigación de PRECIOS).

## Editor de APU: del objeto del proceso a un presupuesto

`lib/apu/inferencia.js` (qué obra es) → `lib/apu/calculo.js` (presupuesto y AIU) sobre `lib/apu/catalogo.js`.

- **`calculo.js` NO reimplementa el costo directo: LLAMA a `costoDirecto()`** (R2), donde viven las cuatro
  fórmulas del APU (mano de obra ÷ rendimiento con prestacional, materiales con desperdicio, equipo ÷
  rendimiento, transporte por distancia, herramienta menor como % de la MO).
- **`lib/apu/tipologias.js` está separado del catálogo a propósito**: aquel es PRECIO (Redis, cambia con el
  mercado); esto es VOCABULARIO (cambia con el criterio de negocio, tiene que verse en un diff y **no puede
  depender de que alguien haya corrido la carga**).
- **DOS CORRECCIONES A LA FÓRMULA DEL ENCARGO**: (1) `(cantidad / rendimiento) × costo_hora` ya es el TOTAL
  del ítem, no el unitario — volver a multiplicar por `cantidad` cobra la cuadrilla `cantidad` veces (en un
  ítem de 500 m², 500 cuadrillas); el APU clásico calcula el UNITARIO y multiplica una vez, y así se cumple
  `cantidad × unitario = total`. (2) **AIU se SUMA, no se compone**: 15/5/5 compuesto da 26,8 % contra 25 %
  aditivo, y el aditivo es el de los pliegos tipo (`modo_aiu:"compuesto"` sigue disponible).
- **El rendimiento DIVIDE** (error canónico), con prueba de monotonía; el `rendimiento_override` **trabaja
  sobre una copia**, porque el catálogo es compartido entre peticiones de la misma instancia caliente.
- **`regionDeDepartamento` es el punto único de paso y PROHIBIDO `|| 1`**: el catálogo cotiza por REGIÓN
  (cinco) y SECOP publica DEPARTAMENTO; cubren **14 de los 33** departamentos y los otros 19 salen `sin_base`
  con su motivo, porque un factor 1,00 de relleno afirmaría «aquí construir cuesta lo mismo que en Bogotá».
  El presupuesto **sale igual**, con la región base y diciéndolo (R6/R10).
- **Sin catálogo en Redis se usa la semilla del repositorio, y se DICE** (`catalogo.fuente`), con prueba de
  que las dos vías dan el MISMO costo directo.
- **TRES PUERTAS ANTI-FALSO-POSITIVO antes de emitir un ítem, y las tres LLAMAN a la regla que ya existía**
  (R2), cada una por un caso real: «SERVICIO DE INTERNET DEDICADO E INTERVENTORÍA…» sugería CON-EST;
  «ADIESTRAMIENTO DE CANINOS Y MANTENIMIENTO DE LA PLACA HUELLA…» con un 72141000 salía **VERDE con 6
  ítems**; «COMPRAVENTA DE TUBERÍA PVC» con un 4017 daba AGU-RED. En orden: **`BLACKLIST_OBJETO` sobre texto
  CRUDO** (la pertinencia **no cubre «caninos»**); **`evaluarPertinencia(textoNorm, {codigos})` y solo el
  ROJO rechaza** (su amarillo significa «el objeto no lo dice explícitamente»), con el texto NORMALIZADO
  porque con texto crudo sus vocabularios no casarían y la puerta quedaría abierta en silencio; y
  **`esSuministroPuro(textoNorm, codigos)`**, que necesita los códigos por SEGMENTO. Los rechazos son
  `no_determinada`, no un cuarto estado, y hay prueba por MUTACIÓN de que las tres son necesarias.
- **El clasificador es una cascada de tres niveles y solo están los dos primeros**: Nivel A léxico (ancla 3 ·
  apoyo 1 · excluye −4, exigiendo verbo de obra) y Nivel B UNSPSC como evidencia INDEPENDIENTE cuyo valor real
  es **vetar** (placa huella con código 4017 es una red → 🟡). El **Nivel C (LLM de desempate) NO se
  implementó**: añadiría una dependencia, latencia y un fallo a un cálculo hoy determinista. **`anclas` son
  los términos que el informe publica en su tabla** (demoterlos a `apoyo` dejó a todas las tipologías bajo el
  umbral de 🟢), con **frontera de palabra y plural tolerado**: sin el plural media tabla no dispararía («vías
  terciarias»); sin la frontera, «parque» clasificaría un **parque**adero.
- **El margen `P1−P2` es condición DURA**: dos tipologías empatadas nunca dan 🟢 — el verde es el único
  estado que presupuesta sin pedir el pliego. Los tres estados **suman exactamente los objetos evaluados**.
- **Una tipología sin ítems lo DICE** (19 de 22 tienen cobertura; VIA-SEN, ELE-RED y CON-EST no): una lista
  vacía es un dato, no un olvido. El mapa tipología→ítems es EXPLÍCITO en el JSON: derivarlo del capítulo o
  del UNSPSC (7215 casa con casi todo) acabaría proponiendo pañete para una alcantarilla.
- **Decimal COLOMBIANO en la extracción de cantidades** (el punto separa miles; invertirlo divide la obra por
  mil), lookbehind (sin él «1500 km» captura 500) y **atribución a ≤ 6 palabras** (sin ella «…CONTRATO
  2024-350» produce 2024 km).
- **UNA sola función para las acciones** (`api/apu/[accion].js`), por el tope de 12: `catalogo` es PÚBLICO y
  el resto exige token (lo que no sale sin llave son las CIFRAS DEL PERFIL, y escribir precios sí exige
  llave). **El listado NO tiene índice aparte** —SCAN + MGET sobre las propias claves, porque un índice con
  TTL se desincroniza al caducar un borrador—, y un valor corrupto se CUENTA (`ilegibles`) en vez de tumbar la
  respuesta.
- **`margen_final` es literalmente lo que pidió el encargo** (`precio_final − costo_directo_total`) y por eso
  NO descuenta impuestos: contribución del 5 %, estampillas y ReteICA van en `deducciones_pct` y producen
  `margen_despues_deducciones`; mientras no se carguen, una alerta recuerda la contribución en pesos.
- **El .xlsx se escribe a mano (`public/xlsx.js`), sin SheetJS**: dejó de publicar en npm tras la **0.18.5**
  —lo que `npm install xlsx` instala— con dos advisories «high» y `npm audit` respondiendo **«No fix
  available»**, y la edición libre **IGNORA los estilos de celda al escribir**. Método **STORE**: ZIP válido
  que abren Excel/LibreOffice/Numbers sin depender de `CompressionStream`. 
## Catálogo de precios APU (`lib/apu/catalogo.js`, `apu:*`)

- **La investigación que el encargo daba por escrita NO existía**: estaba dentro de `modulo_apu.html`,
  **borrado en el commit `d69cfe8`** (estructura INVIAS/IDU, precios base de Bogotá, índice de costo de las
  32 capitales, ajuste ICOCIV del DANE), y se recuperó con `git show d69cfe8^:modulo_apu.html`. **Antes de
  dar por perdida una fuente que el encargo cita, mirar la historia de git.** Cada precio declara si es
  recuperado, derivado, estimado o **adjudicado**.
- **Los precios regionales se DERIVAN de un precio base y cuatro factores, nunca se transcriben** (5 × 48
  números serían 240 sitios donde desincronizarse), y el factor depende del **tipo** del insumo: en la Costa
  el material sube (1,10) y el jornal baja (0,97). Una cotización real gana sobre la derivación
  (`precios_cotizados`) y el hash publica `precio_origen_{region}`. **La desagregación de los cuatro factores
  es RAZONADA, no medida**: la fuente solo trae **un** índice por ciudad, así que recomponerlos con la
  estructura de costos de obra civil (45/30/18/7) debe caer a menos de **0,015** del índice de la ciudad
  cabecera, con prueba región por región — sin ella el catálogo perdería el único dato duro que lo respalda.
  `indice_ciudad_recuperado` contiene el índice de la CIUDAD cabecera, no el promedio de la región.
- **🚩 Un error de la fuente que NO se replicó**: su plantilla de acero cobraba el acarreo como
  `1.200 × 1,05 × 15` = **$18.900 por kilo** — la tarifa está en $/m³-km y le pasaban kilogramos. Aquí
  `cantidad_por_unidad` de una línea de transporte va SIEMPRE en **m³ de material movido** (acero:
  `1,05 kg ÷ 7.850 kg/m³ ≈ 0,00013 m³`), con prueba de que el acarreo no puede pasar del 1 % del APU del
  acero.
- **Un cero no puede ser un precio** (R1), así que la **herramienta menor no es un insumo** (es
  `herramienta_menor_pct` del ítem) y la validación rechaza precios ≤ 0 y rendimientos ≤ 0. **Las cuadrillas
  son la SUMA de sus jornales** y lo declaran en `componentes` (`299.000 = 95.000 + 3 × 68.000`), con
  validación. **El AIU NO se regionaliza** (A 15 / I 5 / U 5 en las cinco): lo fija el pliego y el riesgo, no
  la geografía; ídem el factor prestacional (1,55), que lo fija la ley.
- **El SNAPSHOT es caché; los HASHES son la verdad**: servir desde los hashes son ~70 comandos y desde el
  snapshot dos, pero dos fuentes de verdad es el defecto que este proyecto ya pagó caro, así que el snapshot
  lleva **la misma `version`** que la meta y quien lo lee la compara; si no casa, o si un chunk está corrupto,
  cae a los hashes **y lo dice** en `via`. **`cargado` es BOOLEANO y la fecha es `cargado_el`** (R3): se
  llamaban igual y la cadena pisaba al booleano, así que el panel habría dicho «cargado» sobre un Redis vacío.
- **Carga TODO O NADA con el sello al final** (R9), **por LOTES de 16 con `Promise.all`** (~620 claves en
  serie rozaban el `maxDuration` de 60 s); el botón del panel fuerza la reescritura (`?forzar=true`) aunque
  `cargarCatalogo()` sea idempotente (R7). **Lo que el catálogo NO incluye, dicho en la propia respuesta**:
  ni AIU aplicado ni ninguno de los costos ocultos del Cap. 11.

### Calibración Nogal, importación de Excel y libro APU

- **Calibrado con un contrato ADJUDICADO del dueño** («Presupuesto Nogal 4», UPN-VAD-CP-009-2025, Bogotá
  2025): 157 ítems `NOG-*` y 389 insumos con `fuente:"adjudicado"` —el cuarto origen, más fuerte que
  recuperado/derivado/estimado—, y el motor REPRODUCE el `VR COSTO DIRECTO` del pliego con **149 exactos al
  peso, 7 a ±$1** y **NOG-B57 +$55 clavado en prueba**. **La verdad de cada APU del pliego es el RANGO de su
  fórmula `ROUND(SUM(Ea:Eb)/2)`**, no la proximidad de las filas, y donde el subtotal OMITE una línea se
  reproduce SU aritmética con peso 0,5: **el precio adjudicado manda sobre la corrección «obvia»**. Las
  cuadrillas cotizan el día CON prestaciones, así que se guarda `precio ÷ 1,55` con el literal en
  `precio_dia_con_prestaciones` y SIN `componentes` (el pliego no publica los jornales); los fletes son
  valores cerrados por ítem → `distancia_km = 1`. Método en `docs/CALIBRACION_APU.md`.
- **«Cargar ítems desde Excel»**: se lee EN EL NAVEGADOR (`public/xlsx_lectura.js`, UMD) y al servidor viajan
  solo las filas; `lib/apu/importar.js` las mapea REUTILIZANDO las primitivas de `lib/apu_mapeo` (R2), más
  **plural tolerado a ambos lados** y unidad CANÓNICA por grafía (m≈ml, UND≈un) **sin convertir jamás**.
  **POLÍTICA DE PRECIOS**: el del ARCHIVO manda siempre (`precio_manual`, `origen_precio:"archivo"`, catálogo
  como referencia en `cd_catalogo`), y un mapeo «revisar» SIN precio del archivo **NO cobra el catálogo por su
  cuenta** —una fila de 24 und a $0 salía presupuestada en $2,9 M inventados—; un precio 0 es «sin dato» (R1).
  Los ítems con precio manual caen en `por_componente.sin_desglose`, y
  **material+mano_obra+equipo+transporte+sin_desglose = costo directo total** tiene prueba. Un precio que
  llegue como TEXTO se lee con `numeroColombiano` (punto = MILES): el parser ingenuo leía «74.596» como 74,596.
- **El LECTOR parsea el ZIP por el DIRECTORIO CENTRAL** (un xlsx en streaming deja los tamaños del local
  header en 0) y la descompresión se INYECTA (`DecompressionStream` / `zlib.inflateRawSync`); sin inflador y
  con partes DEFLATE el error sugiere CSV, nunca una lista vacía. `numeroLocal` es la TERCERA copia de
  `numeroColombiano` y `parsearCsv` la SEGUNDA: las pruebas las EJECUTAN sobre la misma batería.
- **La exportación es el formato Nogal** (`public/apu_libro.js`, UMD: navegador y Node usan EL MISMO
  constructor): capítulos a dos niveles, fórmulas `=D×E`, cierre A/I/U + **IVA 19 % sobre la utilidad** +
  TOTAL, firmas, y hoja «APU» por ítem desde las `lineas` de `costoDirecto` (el MISMO cálculo que produjo el
  total). Marcadores: ÁMBAR = precio sin APU de respaldo (suma y se declara), ROJO = sin precio (no suma,
  celdas VACÍAS). **En OOXML `<f>` lleva el `=` implícito** —escribirlo produce `==D7*E7` y rompe la celda—,
  toda fórmula viaja con su valor cacheado, los estilos nuevos van AL FINAL de `ESTILOS` y **ningún numFmt
  nuevo**. `tests/generar_electrico_nogal.js` es DETERMINISTA; diferencias en `docs/DIFERENCIAS_APU.md`.

## Rentabilidad del proceso: VEG, caja y payback (`lib/apu/rentabilidad.js`)

Se sirve desde la acción `rentabilidad` de `api/apu/[accion].js`.

- **EL COSTO DIRECTO NO SE RECALCULA AQUÍ** (R2): `desdePresupuesto()` toma el `resumen` de `calculo.js` tal
  cual. Una diferencia del 3 % entre dos motores no se ve en pantalla: se ve cuando se pierde el proceso.
- **La acción va APARTE de `calcular`**: es la única del módulo que toca la RED (índice de baja, de
  competencia, `lib/probabilidad`); fundirlas obligaría a pagar dos lecturas de Redis en cada tecla.
- **`P(ganar | precio)` NO es una sigmoide monótona: es una MEZCLA** de «menor valor» (25 %) y métodos
  centrales (75 %), porque el método se sortea; ofertar más barato la compra en un escenario de cuatro y la
  destruye en los otros tres. La sigmoide se publica aparte (`p_menor_valor`).
- **El multiplicador de precio vale EXACTAMENTE 1 en la mediana del mercado**: sin esa normalización,
  `/api/apu/rentabilidad` y `/api/oportunidades` publicarían dos probabilidades distintas del mismo proceso.
- **La FORMA de esa curva usa un `n` de REFERENCIA FIJO (6), no los oferentes de la entidad**: el efecto de
  nivel ya lo lleva `p_base` (`1/(1+rivales)`), y meterlo también en la forma lo contaba dos veces y rompía la
  monotonía en el extremo (catorce oferentes daban MÁS probabilidad que tres). Además no hay con qué calibrar
  esa dependencia —el corpus no trae las ofertas perdedoras—, así que fijar la forma hace la monotonía
  demostrable.
- **El AIU y la estructura de costos son DOS descomposiciones del mismo `V`**: el AIU es la estructura de
  PRECIO declarada en la oferta (su «A» cubre nominalmente dirección de obra, pólizas, ensayos e impuestos) y
  la rentabilidad usa la de COSTO, donde esas tres son líneas separadas; usar la «A» declarada como indirecto
  Y sumar aparte garantías e impuestos cobraba la administración dos veces y dejaba en rojo presupuestos
  sanos. Corolario: **la «I» tampoco es un costo** — es el ingreso que financia la prima de riesgo.
- **`C_indirecto` es función del PLAZO** (factor `T/T_ref` con referencia declarada): sin él, alargar el plazo
  sin obra adicional no movería la utilidad, y la invariante A.11 dice que no puede SUBIRLA.
- **El payback exige haber estado EXPUESTO**: si no, un contrato con anticipo daría payback = mes 1 por el
  propio anticipo, que es dinero de la entidad y no capital devuelto. **El precio piso decide con σ = 15 %, no
  con 8 %**: la prima de la maldición del ganador CRECE con σ, así que el valor bajo produce un piso más bajo
  — exactamente el error caro. **Sin `deducciones_pct` del pliego el margen es una COTA SUPERIOR**, y viaja
  declarado: un bloque de deducciones de hasta ~10 % es mayor que el margen típico y omitirlo invierte el
  signo.
- **El borrador guarda su `id_proceso`, que NO puede ser su `id`**: el `id` lo propone el cliente y `ID_RE` no
  admite puntos, mientras que `id_del_proceso` de SECOP los trae (`CO1.REQ.123`); es la única clave con la que
  el panel enciende «APU listo». **El listado de borradores se pide APARTE de `/api/resumen`** (cacheado
  300 s) y `procesos_con_presupuesto` viaja como lista de PERTENENCIA, no como conteo (R1). **La precarga del
  departamento corre DESPUÉS de cargar el catálogo**, o la opción del desplegable no existe y se pierde en
  silencio.

## Optimizador de precio de oferta (`lib/apu/optimizador.js`)

Va DENTRO de la acción `rentabilidad` (tope de 12 funciones; y allí ya están leídos los dos índices y la `p`);
se pinta en el recuadro «Precio sugerido».

- **NO REIMPLEMENTA NADA: llama a `rentabilidad()` una vez por punto de la rejilla** (R2); si no, la
  divergencia sería entre el precio que la app RECOMIENDA y el margen que enseña para ese mismo precio. Dos
  invariantes probadas: el punto en el precio VIGENTE reproduce EXACTAMENTE el bloque de rentabilidad y el
  punto en la mediana devuelve EXACTAMENTE la `p` de `/api/oportunidades`.
- **TRES CORRECCIONES AL ENCARGO**: (1) **el descuento se mide contra el PRESUPUESTO OFICIAL, no contra el
  precio de venta** —la baja está DEFINIDA como `1 − adjudicado/precio_base` y en el corpus el precio de venta
  es el **69 %** de la cuantía, así que barrer sobre ese rango pondría la curva en una zona de baja real del
  30 %, donde la probabilidad es residual—, y la perilla viaja aparte y por punto como `descuento_apu_pct`;
  (2) **el VEG que decide no es `P × margen bruto`** (ese margen no ha pagado la contribución del 5 %,
  estampillas, pólizas, costo financiero ni maldición del ganador): `veg` es el MISMO del bloque de
  rentabilidad y la fórmula del encargo se publica al lado como `veg_margen_bruto` (R3); (3) **un precio por
  encima del presupuesto oficial no es una opción**, así que la rejilla se recorta en 0 y lo declara.
- **LAS TRES OPCIONES SON LOS EXTREMOS DE LA MESETA DEL VEG (±5 % del máximo)**, caminando CONTIGUAMENTE desde
  el óptimo: la curva no tiene garantía de unimodalidad, así que tomar el mínimo y el máximo de la banda
  saltaría un valle. Si la meseta colapsa **se dice** (el óptimo es agudo) en vez de fabricar tres puntos.
- **EL DEFECTO CONOCIDO NO MUEVE EL PRECIO RECOMENDADO, y hay que contarlo exacto**: el precio se cobra DOS
  VECES (`docs/PROBABILIDAD_MEJORADA.md` §2.5c), pero ese factor es CONSTANTE a lo largo del barrido y
  `argmax_d [k·f(d) − c]` no depende de `k > 0`: afecta al NIVEL del VEG, no al argmax. Hay prueba que escala
  `p_base` y comprueba que el descuento óptimo no se mueve **y que el VEG sí**.
- **Sin centro de mercado NO hay recomendación**: con la probabilidad plana el óptimo saldría siempre en «no
  descuente nada», que es la ausencia de una recomendación disfrazada de consejo. `aplicable:false` con su
  `motivo` (`sin_centro_de_mercado`, `sin_presupuesto_oficial`, `sin_costo_directo`,
  `rango_sobre_el_presupuesto`) y `sin_punto_rentable` en **`null`, no `false`** (R1).
- **Las deducciones ESCALAN con el precio**: `fiscal.tau_costo_valor` llega en pesos calculado sobre el precio
  vigente pero debajo son PORCENTAJES del valor del contrato; dejarlo fijo haría que bajar la oferta no
  ahorrara ni un peso de contribución y el barrido se inclinaría a precios bajos por una razón falsa.
- **La rejilla manda el DESCUENTO y el punto vigente manda el PRECIO**: los puntos de la curva redondean al
  peso (un precio con céntimos no se puede ofertar) y el punto vigente entra verbatim, porque `precio_final`
  sale con dos decimales y redondearlo rompería la igualdad.
-  **`id_proceso` viaja y
  vuelve pero NO condiciona el cálculo**, y el `costo_directo_total` del cuerpo **no se acepta**: sería una
  segunda fuente de verdad del costo y podría recomendar un precio que no corresponde a los ítems en
  pantalla.
- **Frontend**: el recuadro sale SOLO tras «Calcular APU», con `id_proceso`, y solo si el cálculo salió bien.
  «Aplicar este descuento al APU» escribe `descuento_apu_pct` (jamás `descuento`), enciende el ajuste
  competitivo y **recalcula por el mismo camino** que «Calcular APU»; si el óptimo está por encima del precio
  de venta el botón se deshabilita **y se explica** («le sobra margen: suba la utilidad o la administración»).

## APU profesional: desglose visible, origen del precio y normativa

**Tres de las cinco premisas del encargo estaban desactualizadas**: `lib/apu/xlsx.js` NO existe (el exportador
son `public/xlsx.js` + `public/apu_libro.js`), ese exportador YA generaba las hojas «Presupuesto» y «APU», y
`/api/apu/calcular` YA devolvía `detalle.insumos`. El hueco real estaba más abajo.

### Segunda pasada (ago 2026) · trazabilidad, subtotales y las cinco validaciones

Diagnóstico completo en **`docs/APU_DIAGNOSTICO.md`**, que se conserva porque distingue lo que YA estaba de
lo que NO SE PUEDE hacer con los datos disponibles: un encargo posterior volverá a pedir ambas cosas.

- **EL BADGE DECÍA «SIN VERIFICAR» SOBRE UN PRECIO VERIFICADO.** `precioEnRegion` ya distinguía una
  COTIZACIÓN real (`precios_cotizados`) de una DERIVACIÓN por factor y lo publicaba en `linea.origen_precio`,
  pero el dato **moría en el desglose**: `clasificarOrigen` solo miraba `item.fuente`, así que un ítem
  íntegramente cotizado salía 🟡 «Derivado regional — precio no verificado». Hoy `calculo.js` publica
  `origen_insumos` y existe el estado 🟡 **«Cotización de proveedor»**. **El corte es por VALOR, no por número
  de líneas** (nueve insumos cotizados que pesan el 3 % no hacen «cotizado» un ítem derivado al 97 %). Son
  **SEIS** estados, no cinco.
- **UN 100 % REDONDEADO NO ES «TODO COTIZADO»** (defecto que cazó la revisión adversaria). La puerta se abría
  con `cotizado_pct === 100`, pero ese porcentaje viaja **redondeado a dos decimales**: una línea derivada de
  **$1** junto a una cotizada de **$3.350.400** da 99,99997 % y `red()` lo sube a un 100 EXACTO, así que el
  ítem se rotulaba «Cotización de proveedor» —o sea, VERIFICADO— con parte del precio sin verificar. Y la
  proporción no es de laboratorio: es la de un insumo incidental barato (agua, tornillería) al lado de una
  línea cara. Hoy abre **`lineas_derivadas === 0`**, que es la cuenta exacta, y `cotizado_pct` **solo informa**.
  Es la trampa de `numero()` como guarda de «sin dato» (`lib/probabilidad`) en otro disfraz: **una cifra
  redondeada para MOSTRAR no puede DECIDIR**. Hay prueba que reproduce el borde con un catálogo sintético y
  otra que prohíbe que la puerta vuelva a colgarse del porcentaje.
- **AÑADIR SUBTOTALES POR CAPÍTULO PODÍA DUPLICAR EL PRESUPUESTO.** COSTOS DIRECTOS sumaba el RANGO entero de
  filas de ítem; con subtotales intercalados eso cuenta cada peso DOS VECES y da un total exactamente al doble
  sin que nada se vea raro — el defecto clásico del presupuesto armado a mano. Hoy el cierre suma la **LISTA
  de celdas de subtotal**, con prueba de que cada referencia apunta a una fila de subtotal y no a una de ítem.
- **«ÍTEM» y «CÓDIGO» son columnas distintas** (R3): el ítem es la POSICIÓN (1.1, 1.2, 2.1 — con lo que la
  entidad compara oferentes) y el código la IDENTIDAD en el catálogo (`NOG-A2`). Compartiendo columna, dos
  presupuestos con los mismos ítems en distinto orden no se podían cotejar fila a fila. La hoja pasó de 6 a
  **7 columnas**, y con ella las fórmulas: `=E×F` para el total de fila, `SUM(G…)` para los subtotales.
- **LOS FACTORES SALIERON DEL TEXTO A COLUMNAS PROPIAS** (F y G de la hoja APU): cantidad base, desperdicio,
  rendimiento, distancia y recargo prestacional viajaban como nota entre paréntesis dentro de la descripción,
  donde **no se pueden ordenar ni filtrar**, que es lo primero que hace quien audita. El **recargo
  prestacional se DERIVA de `precio_aplicado ÷ precio_region`**, no de una constante: así no puede
  desincronizarse del valor de su propia fila. Más el espacio de **firma del ingeniero de costos** en la hoja
  APU (la entidad la pide firmada aparte y una hoja sin firma se devuelve).
- **`VR COSTO DIRECTO` de la hoja APU va con el valor del MOTOR y SIN fórmula, a propósito.** Un `=SUM()` de
  los subtotales sumaría líneas a 2 decimales, mientras que el unitario es la suma de los cuatro capítulos ya
  REDONDEADOS: la fórmula «más pura» pondría a las dos hojas a discrepar en céntimos justo en la cifra que la
  entidad coteja. **Hay prueba de que las dos hojas dan el mismo unitario ítem a ítem.**
- **El nombre del archivo es `APULibro.nombreArchivo`** (`APU_<proyecto>_<fecha>.xlsx`): escrito dentro del
  manejador del botón no se podía probar y el generador de Node producía otro nombre que la aplicación.
- **`lib/apu/validaciones.js` · las cinco puertas, y NINGUNA BLOQUEA** (R6): una herramienta que se niega a
  exportar acaba usándose por fuera. Se publican en `validaciones` (estructuradas, con severidad `aviso` |
  `atencion` — **`error` no existe**) y **además se vuelcan en `alertas`**, que es el canal que el exportador
  ya lee: publicarlas solo en el campo nuevo las habría escondido en el Excel, que es donde acaban leyéndose
  (R11). En pantalla, `pintarValidaciones` las pinta y **filtra de `alertas` las ya pintadas**, y el bloque
  **nace oculto y desaparece cuando no hay hallazgos**: un recuadro que dice «0 problemas» se deja de mirar.
- **DOS REGLAS DEL ENCARGO IMPLEMENTADAS DISTINTO, y hay que contarlo exacto.** (1) **Los umbrales del AIU no
  se escribieron**: A > 30 / I < 1 / U > 10 ya viven, mejor documentados, en `normativa.AIU` (12–20 / 3–5 /
  5–10, cap. 11 del manual), y las bandas del manual son **estrictamente más estrechas** que los cortes del
  encargo en los tres casos — todo lo que aquél marcaría queda marcado, por una cifra rastreable, y hay prueba
  de esa relación de laxitud para que nadie «complete» el encargo con una segunda tabla de umbrales (R2/R3).
  Corolario: el AIU real del Nogal (19,17 / 1,50 / 5,33) **dispara la validación**, y por eso la severidad
  máxima es «atención». (2) **El «5 % del valor total» NO ES COMPUTABLE**: un ítem sin precio no tiene valor
  POR DEFINICIÓN, así que su participación en el total es justamente la cifra que no existe, y calcularla
  exigiría inventarle un precio (R1). El umbral se aplica a la participación por **NÚMERO DE ÍTEMS**, el
  mensaje lo dice con todas las letras, `valor_faltante` viaja en **`null` y jamás en 0**, y el total se
  declara **cota inferior**.
- **TRES COSAS QUE EL ENCARGO PIDE Y NO SE PUEDEN ALIMENTAR**, documentadas con lo que haría falta para
  cerrarlas: el badge 🟢 **INVIAS** (los APU Regionalizados no están y las fuentes oficiales dan 403 — rotular
  «INVIAS» un precio que no lo es sería el peor error posible aquí); el badge 🟠 **Histórico SECOP**
  (`p6dx-8zbt` publica el valor ADJUDICADO del contrato entero, **no precios unitarios por ítem**: no hay de
  dónde sacarlo); y el **costo horario de equipo desglosado** en depreciación/combustible/mantenimiento
  (repartir la tarifa con porcentajes inventados serían tres cifras falsas donde hoy hay una verdadera).

- **DEFECTO REAL ENCONTRADO POR VERIFICACIÓN: las filas de TRANSPORTE de la hoja APU no cuadraban.** La
  tarifa va en **$/m³-km** y `costoDirecto` calcula `precio × cantidad × distancia_km`, pero la hoja pintaba
  cantidad y precio **sin los kilómetros**: «1,25 × $1.256» junto a un parcial de **$12.560**, un factor 8
  invisible. Ahora se publica la cantidad EFECTIVA (m³·km) y la composición («1,25 m3 × 8 km») va escrita.
  **Invariante nueva: `cantidad × precio = valor` en las 1 761 líneas del catálogo.** Los fletes cerrados del
  Nogal llevan `distancia_km = 1` y NO publican distancia: ese 1 no es un dato del pliego.
- **`cantidad_por_unidad` publicaba OTRA COSA que el campo homónimo del catálogo** (R3): con 5 % de
  desperdicio el catálogo dice 1,30 y esto publicaba 1,365, así que quien se fiara del nombre lo cobraría dos
  veces. Sustituido por **`cantidad_base`** (`null` donde la cantidad sale del rendimiento), que además hace
  el desperdicio COMPROBABLE. **El desperdicio solo se escribe cuando es > 0** (28 de 1 761 líneas): en los
  157 ítems calibrados vale 0 porque **el pliego ya lo incorpora en su cantidad**, y pintar «0,00 %»
  afirmaría que ese presupuesto no prevé desperdicio.
- **`lineaLegible` y `clasificarOrigen` viven en `public/apu_libro.js` (UMD) y las usan LAS DOS
  presentaciones** (pantalla y Excel): la regla del origen vivía dentro del IIFE de `app.js`, así que el Excel
  no podía consultarla y **exportaba idénticos un precio de contrato adjudicado y uno derivado por factor
  regional**. `index.html` carga `apu_libro.js` ANTES que `app.js`.
- **CINCO estados de origen, no cuatro**: «precio del ARCHIVO importado» y «precio TECLEADO a mano» no se
  colapsan, porque la política de importación hace que el del archivo MANDE y quede declarado. El verde exige
  DOS condiciones: `fuente="adjudicado"` **y** región `bogota_sabana` — fuera de Bogotá el mismo precio se
  multiplica por el factor regional y deja de ser el precio real.

### `lib/apu/normativa.js` — el factor prestacional explicado

- **La normativa EXPLICA, el catálogo DECIDE**: el factor aplicado sale de `regiones[…].prestacional_tipico`
  (Redis); el módulo lo RECIBE y nunca lo importa — un default lo convertiría en segunda fuente de verdad de
  una cifra que multiplica jornales. Va en código, no en el catálogo (criterio de `lib/apu/tipologias.js`).
- **EL 1,55 ES UN SUPUESTO, no un dato, y el rótulo «recuperado» engaña**: salió de un comentario del
  `modulo_apu.html` borrado. **No es una perilla libre**: las cuadrillas del Nogal se guardaron como `día con
  prestaciones ÷ 1,55` (calibración CIRCULAR: reproduciría igual con 1,40), así que moverlo no rompe la
  reproducción pero **sí desvía los 157 ítems `NOG-*`** (≈1 % de media, 2,89 % en el peor caso) en silencio.
- **LA SUMA NO CUADRA Y SE PUBLICA LA BRECHA**: nominal de ley 58,29 % · aplicado 55,00 % · exonerado
  44,79 %. Una primera redacción decía que la brecha «se explica» por la exoneración y la banda de ARL, y **la
  aritmética lo desmintió** (con ARL clase V en su mínimo legal, 4,350 %, el nominal baja a 55,68 %, aún POR
  ENCIMA del 55 %); hoy el texto dice que el 55 % **no se descompone en ninguna combinación legal exacta** de
  **estos 10 componentes** y cae entre las dos cotas (R10) — acotado, porque **dotación (Ley 11/1984) y
  auxilio de transporte quedan FUERA** y son costo real de nómina. **La prueba es de ENCIERRO, no de
  igualdad**: el factor de las cinco regiones debe caer en [suma_exonerada, suma_nominal], lo que convierte el
  desglose en un CONTRASTE del catálogo — si alguien carga 1,70, cae.
- **LA EXONERACIÓN NO ES AUTOMÁTICA y su condición decide un precio**: el ET art. 114-1 exonera a personas
  jurídicas contribuyentes y a personas naturales **solo si ocupan dos o más trabajadores**, y «Helder» es
  persona natural con UN profesional: ofrecerle «−13,5 pp» sin la condición le induciría a restarse algo a lo
  que probablemente no tiene derecho, y eso viaja al precio.
- **UNA NORMA MAL ATRIBUIDA ES PEOR QUE UNA AUSENTE: se lee como verificada.** Una refutación cazó TRES, todas
  citando la norma ORIGINAL para una tarifa que fijó una reforma posterior: el 12,5 % de salud con reparto
  8,5/4 es de la **Ley 1122/2007 art. 10** (la Ley 100/1993 art. 204 fijó el 12 %); el 16 % de pensión con
  12/4 es de la **Ley 797/2003 art. 7** (el art. 20 fijó 13,5 %); y la Ley 21/1982 regula SENA y subsidio
  familiar pero **no el ICBF**, que nace de la Ley 27/1974 con la tarifa del 3 % de la **Ley 89/1988**.
  **NINGUNA «Resolución XXX de 2025»**: no existe una que fije el factor prestacional, este entorno no
  alcanza las fuentes oficiales (403), y una referencia inventada en la herramienta con la que se fija un
  precio es el peor error posible. Todos los componentes viajan con `verificado: false`.
- **EL MARCADOR DEL EXCEL ENVENENABA LA REIMPORTACIÓN, y nada lo vigilaba**: `lib/apu/importar` tokeniza
  `descripcion`, así que con el aviso dentro («⚠️ Precio no verificado…»), medido sobre 60 ítems reales, **59
  perdían confianza, 21 caían de «firme» a «revisar» y 2 se mapeaban a OTRO ítem del catálogo** — o sea, a
  otro precio. Se limpia en el IMPORTADOR (único sitio donde se tokeniza) y **no en el exportador**, porque el
  aviso tiene que seguir viéndose; se ancla a DOS espacios + emoji para no llevarse un emoji del nombre.
- **Las tarifas del 19 % y el 5 % se IMPORTAN de `lib/apu/calculo.js`** con require diferido (estaban escritas
  dos veces), y la cita del IVA sobre la utilidad (art. 3 D. 1372/1992, hoy art. 1.3.1.7.9 D. 1625/2016) vive
  aquí: el panel dice **las dos mitades**, porque el motor NO suma el IVA al precio final y la hoja de Excel
  SÍ lo suma a su TOTAL. **La normativa viaja en la respuesta de `calcular` para la región QUE SE USÓ**, y
  `normativaAplicada` ya no cae a la primera región de la lista cuando no encuentra la pedida (por la vía de
  los hashes ese orden es el del SCAN).

## Puertas, probabilidad y valor esperado (`lib/puertas.js`, `lib/probabilidad.js`)

Diseño en `docs/ATRACTIVIDAD.md`; auditoría de factores en `docs/PROBABILIDAD_MEJORADA.md`.

- **Una suma ponderada es COMPENSATORIA, y aquí compensar es un error de categoría**: no poder financiar una
  obra no se compensa con cuantía alta. Por eso `puntaje_ponderado` dejó de ser criterio y lo sustituyen
  cuatro puertas + `p_ganar` + `ve`, que NO se promedian; **el campo SIGUE viajando** (permite el A/B por URL
  con `ordenar_por=puntaje`, y `/api/resumen` lo calcula).
- **P1 (objeto/RUP) · P2 (K) · P3 (CAJA) · P4 (competencia).** `pasa_rup_y_k` se publica aparte de
  `pasa_todas`: es «técnicamente viable aunque financieramente ajustado», un proceso que habría que financiar
  con anticipo, crédito o consorcio, no uno a descartar. **P4 nunca bloquea**: informa.
- **P3 · CAJA es la puerta que de verdad ata, y no necesitó un dato nuevo**: `patrimonio ≥ (cuantía −
  anticipo) × 0,20`. Génesis (patrimonio $211 M) ante un proceso de $3.100 M tendría que financiar ~$620 M —
  y lo veía con «Capacidad K ✓» en verde, porque el K del RUP mide HABILITACIÓN, no capacidad de financiar.
  En plural el patrimonio se SUMA (el ponderado 50/50 es para indicadores habilitantes) y cada integrante
  responde por el 100 % (Ley 80/1993 art. 7). El corpus trae un **fixture dedicado a P3** (puente de 2.500 M,
  sin anticipo) que **cierra para Génesis y abre para Helder (1.107 M)**: depende del PERFIL, no del proceso.
- **Regla de faltantes**: un dato ausente no vale 0 ni 1 — la puerta marca `sin_dato` y DEJA PASAR (R6). Sin
  `precio_base`, `evaluarRup` devolvía `capacidad_ok:true` con `crpc_cop:0`: chip verde sobre la nada.
- **`solo_viables=true` es el default y NO es lo mismo que `filtrarProcesosVisibles`** (la puerta de caja es
  posterior a la cascada), y **«no viable» ≠ «no es de este negocio»**: `retenerNoViables` solo devuelve lo
  que falla por una razón discutible (clase fuera del RUP, capacidad insuficiente). **`fallan_p1` y
  `fallan_p2` son SIEMPRE 0 en el diagnóstico** porque la cascada ya descartó eso antes; la que filtra ahí es
  **P3**, y hay prueba de las dos igualdades para que nadie «arregle» un cero correcto.
- **La probabilidad viaja SIEMPRE con su fuente** (`entidad` → `departamento` → `conservador` = 5 rivales,
  `P = 1/6`): enseñar el 17 % sin decir de dónde sale convierte una estimación en una promesa. Los factores
  de ajuste son **SUPUESTOS CON NOMBRE**: no hay etiqueta contra la que calibrarlos. **La PRÓRROGA DEL CIERRE
  es la única señal de competencia observable ANTES del cierre** y sale gratis del dedup de lectura
  (`leerChunksDedup`, bandera `senales`).

**Auditoría de los factores: dos corregidos y dos no.**

- ✅ **El tertil de competencia ya no multiplica**: era el MISMO promedio dos veces (`nivel` es el tertil de
  `promedio_oferentes`, ya dentro de `rivales`). Saltaba −32 % por MEDIO rival en el corte, daba ×1,30 según
  el dato viniera de la entidad o del departamento, y como los tertiles son RELATIVOS la probabilidad de un
  proceso cambiaba porque cambiaban OTRAS entidades. `competencia.nivel` **sigue viajando, filtrando y
  ordenando**: solo dejó de multiplicar.
- ✅ **La baja de mercado es una RAMPA continua**: ×1,10 hasta 2 % de baja, lineal hasta ×0,85 en 5 %, plana
  después. **Suavizar no es calibrar** (1,10 y 0,85 son supuestos a mano) y **la rampa suaviza la FUNCIÓN, el
  DATO sigue cuantizado** —la mediana se publica como cubeta ENTERA, así que se ve una ESCALERA DE CUATRO
  PELDAÑOS y lo que baja es la altura del más alto, **del 15,0 % al 8,9 %**—; además las comparaciones pasaron
  de ESTRICTAS a INCLUSIVAS (2 → ×1,10 y 5 → ×0,85). Tres precisiones: **los codos NO coinciden con las
  fronteras de `nivelPorBaja`** y no hay que «arreglar» una para que case con la otra (rotular y multiplicar
  son preguntas distintas); **`numero()` NO sirve de guarda para «sin dato»** (`Number(null)` y `Number("")`
  son 0 y finitos, así que la ausencia salía premiada con ×1,10, R1); y **el factor se publica y se aplica
  REDONDEADO**, para que `base × Π factores` reproduzca `p` desde la tarjeta, emitiéndose SIEMPRE que haya
  dato —también cuando vale 1—, porque si no «no aparece» significaría a la vez «no hay dato» y «no mueve
  nada».
- ⚠️ **CONSECUENCIA AGUAS ABAJO que nadie pidió y que se va a ver**: `lib/apu/rentabilidad` toma esta `p` como
  su `p_base`, y `veg = p × utilidad − c_preparación` es **el único umbral DURO sobre `p` de todo el
  repositorio**. Retirar el tertil baja `p` un 23 % en las entidades de POCA competencia, que son justo las
  que el editor de APU va a ver: un VEG apenas positivo pasa a negativo y `filtros_duros.veg_no_positivo`
  empieza a decir «el valor esperado no cubre el costo de preparar la oferta» en presupuestos que ayer salían
  verdes. **No es un defecto: antes el número estaba inflado por contar la competencia dos veces.** Medido:
  `p_ganar` pasó de 0,2091 a 0,1777. La prueba solo exige `veg != null`, así que el SIGNO no lo vigila nadie.
- ⬜ **Sin corregir**: el corte duro en 5 procesos (×2,60 de salto) y el defecto SEMÁNTICO de la baja
  —penaliza a una entidad por dónde está el centro de su mercado en vez de por la distancia a la que uno puede
  ofertar de ese centro, y como el APU consume esta `p` como `p_base`, **el precio se cobra DOS VECES**—.
  Cerrarlo exige separar `p` de `p_sin_precio` y coordinar con `lib/apu/rentabilidad` (pasos A4/A5).

### Token opcional de `/api/oportunidades` y redacción pública (`lib/publico.js`)

- **Es el ÚNICO endpoint con token opcional**: los clientes entran por la web pública y exigirles credencial
  dejaba la herramienta inservible. Lo que no puede salir sin llave son las CIFRAS del perfil (`k_cop`,
  `crpc_cop`, `tope_cop`, `co_estimado`, `p2_k.{crp,crpc,tope}`, `p3_caja.patrimonio`), derivadas del
  patrimonio, la utilidad operacional y la liquidez de una persona natural identificada por nombre completo:
  sin token viajan en `null` con `finanzas_visibles:false`, y **un token PRESENTE pero inválido da 401**,
  nunca degradación silenciosa. **Redactar campos NO basta: los MENSAJES llevaban las cifras dentro**
  («…(CRPC $324M / K $5.799M)», «…su patrimonio es $211.340.888»), así que se sustituyen los dos y la prueba
  **serializa la respuesta pública entera y busca las cifras reales** (crudas, con separadores y en millones).
  Lo derivable de datos públicos se conserva: `financiacion_requerida` sale de la cuantía × 0,20.
- **TRES canales de INFERENCIA aceptados y declarados**: (1) el booleano de cada puerta sigue viajando —sin él
  la app no sirve— y `p3_caja.pasa` permite acotar el patrimonio por bisección; (2) `ordenar_por=baja` ordena
  en el servidor, así que se deduce el RANGO relativo; (3) **la baja se despeja del propio `p_ganar` por
  aritmética inversa**, y por eso se anulan también el `factor` y el `motivo` del ajuste `baja_mercado` en
  `p_ganar_detalle.ajustes`, aunque `p_ganar`, `base` y `rivales_esperados` siguen viajando («la probabilidad
  viaja SIEMPRE con su fuente») y con eso `p / base ÷ 1,20^prórroga ÷ 1,15^colisión` devuelve el factor. **Lo
  que se filtra es un RANGO, no un valor** (cuatro clases: ≤2 → ×1,10 · 3 → ×1,0167 · 4 → ×0,9333 · ≥5 →
  ×0,85), y **se acepta** porque ese competidor puede calcular la baja bajando `p6dx-8zbt`, que es público: la
  app aporta la agregación y el corte por modalidad, no el dato bruto. **Cerrarlo costaría** anular `base` y
  `rivales_esperados`, o sea servir una probabilidad sin decir de dónde sale: un cambio de producto, y si
  algún día pesa más que la utilidad la salida es volver a exigir token.
- **Los DEMÁS endpoints no se relajaron** (`/api/diagnostico`, `/api/resumen`, `/api/competencia-detalle`,
  `/api/admin/rup`, `/api/sync/historico`). En el frontend el formulario del token **sobrevive solo** para el
  detalle de competencia; `buscar()` no puede volver a pedirlo.

### Desglose justificado de P(ganar) (`lib/probabilidad_desglose.js`)

`/api/competencia-detalle?vista=probabilidad` (alias `/api/probabilidad-desglose`) abre el «Prob. estimada:
23 %» en SEIS pasos con fórmula, datos con su fuente, aritmética escrita y aporte en puntos porcentuales.

- **NO ES UN SEGUNDO CÁLCULO, y esa es toda la arquitectura del módulo** (R2): `trazaP` es la ÚNICA
  implementación y publica la cadena SIN REDONDEAR (`p_antes`/`p_despues`); `estimarPDetalle` es su vista
  redondeada y el desglose su vista NARRADA. Hay prueba de que `probabilidad_final` es EXACTAMENTE el
  `p_ganar` de `/api/oportunidades` **sobre varios procesos**: con uno solo coincidiría por casualidad.
- **La suma de los `aporte_pp` ES la cifra final** (cada aporte es la diferencia REAL que ese paso introdujo,
  así que telescopan, y el paso 6 absorbe el residuo del redondeo), y **los SEIS pasos viajan SIEMPRE**,
  también los que no aplican: publicar solo los que mordieron impediría distinguir «no hubo prórroga» de «no
  se miró la prórroga».
- **«Sin dato» ⇒ 0 pp… salvo en el paso 1**: un AJUSTE sin datos aporta 0, pero el paso 1 es la BASE y sin
  histórico su confianza también es «Sin dato» y aun así aporta los puntos del supuesto conservador de 5
  rivales; bajarlo a «Baja» sería peor (se lee como «poca muestra» y aquí no hay NINGUNA) y ponerlo a 0 pp
  dejaría la probabilidad en cero, otro número inventado y el que peor decisión provoca.
- **DOS DISCREPANCIAS ENTRE EL ENCARGO Y EL CÓDIGO, resueltas a favor del CÓDIGO**: la colisión de cierres se
  agrupa por `entidad|YYYY-MM-DD`, o sea el MISMO DÍA (el encargo decía «≤7 días», y ensancharlo cambiaría la
  probabilidad de todo el corpus); y el código aplica SEIS factores, no cuatro (faltaban los dos de baja de
  mercado, que convierten la respuesta en «P(ganar A UN PRECIO QUE VALGA LA PENA)»).
- **La vista desconocida muere ANTES de autorizar y de tocar Redis.** **`costo_preparacion` no tiene default
  y entra en el sello de la caché**: no existe en ninguna fuente del proyecto, así que un default sería
  inventarse la cifra con la que se decide si vale la pena presentarse; sin él el resumen enuncia el umbral en
  MÚLTIPLOS del costo. 

## CONOCIMIENTO DE DOMINIO: CONTRATACIÓN PÚBLICA COLOMBIANA

Manual completo en `docs/GUIA_ANALISTA_LICITACIONES.md` (9 errores que descalifican, regla de las 24 horas,
subsanación y observación quirúrgica, consorcio vs. UT, factores de desempate, traslado, verdades procesales,
20 mandamientos). Aquí solo lo que **cambia decisiones de código**:

- **Habilitante vs. puntaje.** Los habilitantes habilitan o rechazan, **no dan puntos** (Ley 1150 art. 5 num.
  1) y **SÍ son subsanables** hasta el traslado; los factores de puntaje ordenan a los habilitados y **NO son
  subsanables jamás**, como tampoco la oferta económica ni la **no presentación** de la garantía de seriedad.
  Consecuencia: **un habilitante «de más» vale cero**, así que la app no puntúa «cuánto sobra» de experiencia
  o de K — el veredicto es pasa/no pasa, graduado por tier + pertinencia.
- **Los 4 métodos de ponderación económica se sortean el día de la audiencia con el primer decimal de la
  TRM** (Ley 1882/2018): se conocen las reglas del precio *después* de presentarlo, así que **tirar el precio
  al piso es matemáticamente malo** (gana en 1 de 4) y `P(ganar|precio)` es una MEZCLA, no una sigmoide. El
  enfoque correcto es **valor esperado** sobre la banda histórica del ganador en esa entidad (**5–12 % en
  obra**); el precio artificialmente bajo obliga a justificación (D. 1082 art. 2.2.1.1.2.2.4).
- **Los costos que casi nadie suma** (base de `lib/apu/rentabilidad` y de `deducciones_pct`): contribución
  especial de obra pública **5 %** (Ley 418/1997, *el olvido más caro del país*; base sin impuestos, **aplica
  a las adiciones**, permanente por art. 8 Ley 1738/2014) · estampillas 0,5–5 % · retención 1–11 % y ReteICA
  0,4–1,4 % · pólizas 1–3 % · **costo financiero del capital de trabajo** (≈**5 puntos de margen**) · fiducia
  del anticipo (Ley 1474/2011 art. 91: no es plata tuya) · ensayos 0,5–2 % (**no están en el APU**) · PMA y
  SST 1–3 % · liquidación 0,5 %. **AIU**: A 12–20 %, I 3–5 % (**es seguro, no utilidad**), U 5–10 %.
- **Las 12 señales de pliego sastre se detectan por el conjunto**, y solo la #11 (uno o dos oferentes en el
  histórico) es computable hoy — **interpretada al revés**: baja competencia se presenta como *atractiva*
  cuando es ambigua (nicho ganable **o** pliego sastre), y **eso hay que decirlo en pantalla**. Valores que
  hacen operable la señal #3: liquidez **≥ 1.2**, endeudamiento **≤ 65 %**, cobertura de intereses **≥ 2**,
  sobre los **últimos 3 años fiscales**. El tier `familia` NO es la señal #2: indica codificación amplia.
- El **PAA** se publica el **31 de enero** (seis meses de ventaja) y el RUP se renueva antes del **5.º día
  hábil de abril**. La app juega en las **etapas 1-9 del ciclo, no en las 10-14**, y **el falso negativo
  cuesta más que el amarillo** (R6).

### Aplicación en el proyecto (estado verificado, ago 2026)

`✅` implementado · `🟡` parcial · `⬜` no existe. **El estado importa tanto como el mapeo.**

| Concepto | Qué hay hoy | Estado |
|---|---|---|
| **PAA → alertar antes** | Solo se ingiere `p6dx-8zbt`; el PAA es otro dataset y **no se lee** | ⬜ |
| Costos ocultos → rentabilidad | `lib/apu/rentabilidad.js` cubre margen, caja, VEG y payback; falta cargar de serie los 10 conceptos del Cap. 11 | 🟡 |
| Ofertas de competidores | El dataset solo trae `urlproceso`; alcanzable: **adjudicatarios recurrentes por entidad** desde el histórico | ⬜ |
| Pliego sastre | Solo la señal #11, y presentada al revés | 🟡 |
| Subsanación / antecedentes del socio | No existen: la app decide a qué presentarse, y SIRI/Contraloría/RNMC son portales con captcha | ⬜ |

### Investigación de contraste (ago 2026)

Detalle en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` (correcciones sobre salvedades y anticipo, versiones de
los documentos tipo, precios unitarios vs. global, reajuste ICOCIV, inhabilidad por incumplimiento reiterado).
Este entorno recibe 403 en las fuentes oficiales, así que varios hallazgos se apoyan en fuentes secundarias:
**no usar una cifra de aquí en un pliego sin abrir la fuente**. Lo que cambia decisiones:

- **🚩 El ciclo electoral contamina `indice_competencia` y no está modelado.** Ley de garantías 2026:
  convenios interadministrativos bloqueados desde el **8 nov 2025** y contratación directa desde el **31 ene
  2026**, ambos hasta el **31 may 2026** (21 jun con segunda vuelta); en esa ventana las entidades **tuvieron
  que competir**, así que el promedio de 2 años mezcla ese período con los normales sin saberlo y el backfill
  no tiene tramo «limpio». Barato: exponer el reparto temporal en `/api/competencia-detalle`; mejor: segmentar
  el índice por período.
- **La banda de descuento son DOS métricas**: `p6dx-8zbt` da `precio_base` y `valor_total_adjudicacion` →
  descuento **en la adjudicación** (para fijar precio); el **valor realmente pagado** tras adiciones vive en
  **`jbjy-vk9h`**. No mezclarlas. Otros IDs: `qmzu-gj57` (proveedores), `rpmr-utcd` (SECOP integrado).
  Límites: **~1.000 pet./hora con App Token** (~100 sin él), **200 filas por petición**, **59 campos**.
- **Cifras 2026**: SMMLV **$1.750.905**; umbral MiPyme **$511.708.497**. 🚩 El alza del 23 % se fijó por
  decreto sin acuerdo y **está en litigio ante el Consejo de Estado**: una anulación movería **todos** los
  umbrales en SMMLV a la vez. **Lo que NO se encontró** (tasa de desiertos, volumen anual de procesos de obra,
  promedio de oferentes por cuantía, tasa de adiciones) **no está publicado**: calcularlo en casa con
  `licitaciones:historico:mes:*`.

## Datos del negocio (fuente de verdad) y mapa de archivos

- **Perfiles y finanzas reales**: `lib/perfiles.js` es el RESPALDO (`PERFILES_FALLBACK`, RUP corte
  31/12/2025) y el punto de aplicación de lo que se cargue por `/api/admin/rup` (validación en
  `lib/config_rup.js`). Génesis es persona jurídica SAS; Helder, persona natural. Resumen en
  `docs/PERFILES.md`. **SMMLV 2026 = $1.750.905.**
- **Consorcio: dos reglas distintas a propósito** — indicadores habilitantes ponderados 50/50 (D. 1082),
  pero **K del plural = SUMA de las CRP** (Guía CCE). No «promediar» K.
- **NIT en null**: no consta en el repositorio; **jamás inventarlo**. CT de Génesis = 3 (estimado
  conservador): confirmar con el dueño antes de subirlo.
- **Motor**: fórmula K en `lib/capacidad.js`; REGLAS (estado, modalidad, convenios, prefiltro, cascada de
  juicio, pertinencia, anti-suministro) en `lib/filtros.js`; whitelists UNSPSC + matching jerárquico en
  `lib/unspsc.js` (193/343/393, la unión se calcula); VOCABULARIOS en `lib/semantica.js`; equivalencias en
  `lib/equivalencias.js`; co-señal de texto en `lib/texto_unspsc.js` + `data/vocabulario_unspsc.json`.
- **Experiencia REALMENTE ejecutada** en `lib/experiencia.js` (`config:experiencia` + su vocabulario);
  auditoría de huecos en `lib/cobertura_rup.js`. Ninguna toca la ingesta.
  ✅ **`experiencia_genesis_106.json` YA ESTÁ en la raíz**, extraído del **PDF del RUP 2023 que aportó el
  dueño** (no salió de git: se buscó en 25 ramas, los 7 `.json` que han existido y los 1 041 blobs del object
  store). Detalle en **`EXPERIENCIA_PENDIENTE.md`**, puesta en producción en **`cargar_experiencia.sh`**.
  Decisiones que no hay que re-litigar: **las filas se delimitan con las REGLAS HORIZONTALES que dibuja el
  PDF**, no por proximidad vertical, porque **un texto REAL en la fila EQUIVOCADA es peor que un hueco**;
  **`valor_smmlv` es la columna TOTAL, no la ponderada**, para que `valor_cop` y `valor_smmlv` describan LO
  MISMO; **54 `participacion` y 11 `modalidad` en `null` son CELDAS VACÍAS** y no se dedujeron aunque en 44 la
  ponderada iguale al total (rellenarlo sería inferir, no leer, R1); **las anomalías de la fuente se
  conservan** (`30/12/2202`, erratas del objeto), porque el objeto es la evidencia; y el **control cruzado**
  `SMMLV ponderado = SMMLV total × participación` prueba que las columnas no se leyeron corridas. ⚠️ **Sigue
  prohibido inventar un contrato**: este vocabulario decide con qué códigos se renueva el RUP.
- **Índices**: `lib/indice_competencia.js` (`indice:competencia`), `lib/indice_baja.js` (`indice:baja:*`),
  detalle auditable en `lib/competencia_detalle.js`, censo de columnas en `lib/columnas_historicas.js`.
- **Decisión y probabilidad**: puertas en `lib/puertas.js`; `P(ganar)`/VE en `lib/probabilidad.js` (`trazaP`
  única implementación; `estimarPDetalle` su vista redondeada); desglose narrado en
  `lib/probabilidad_desglose.js`. Diseño en `docs/ATRACTIVIDAD.md`, auditoría de factores en
  `docs/PROBABILIDAD_MEJORADA.md`.
- **Lector de pliegos** (cantidades, sin precios): `data/catalogo_apu.json` + `lib/apu_catalogo.js`,
  `lib/apu_pliego.js`, `lib/apu_mapeo.js`, `lib/apu_ocr.js`, `api/apu/extraer-texto.js`,
  `api/apu/descargar.js`, `public/pliego.js`; informe en `docs/APU_INFORME_COMPLETO.md`.
- **Costeo y precio**: `lib/apu/catalogo.js` + `data/apu_catalogo.json`; `data/apu_regional.json`
  (departamento→región); `lib/apu/inferencia.js` + `lib/apu/tipologias.js`; `lib/apu/calculo.js`;
  `lib/apu/rentabilidad.js`; `lib/apu/optimizador.js`; `lib/apu/importar.js`; `lib/apu/normativa.js`.
  Frontend: `public/xlsx.js` (escritura), `public/xlsx_lectura.js` (lectura), `public/apu_libro.js` (libro
  Nogal, UMD). Investigación en `docs/APU_Y_RENTABILIDAD.md`, calibración en `docs/CALIBRACION_APU.md`,
  diferencias en `docs/DIFERENCIAS_APU.md`. Nada de esto toca la ingesta ni el corpus: vive en `apu:*`.
- **Clave del sitio: `231105`** (gate del cliente, en `public/app.js`). **No protege la API**: es una
  cortesía del navegador. La protección de servidor es `HISTORICO_TOKEN` (`lib/auth.js`) —que desde ago 2026
  exige TAMBIÉN `/api/oportunidades`, con token opcional— y, encima, Vercel Password Protection. **No
  debilitar ninguna de las dos sin permiso del dueño.**

## Convenciones

- Español en UI, comentarios y commits. Estética tipo Apple (Tailwind CDN, sobrio).
- Sin dependencias de pago; sin npm salvo necesidad justificada.
- Preferir cambios pequeños y directos sobre el código actual — la era de las «capas aditivas» con
  monkey-patch terminó con la reescritura.
