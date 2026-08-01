# CLAUDE.md

Memoria del proyecto para Claude Code. Si retomas el trabajo, lee primero `README.md`
(arquitectura, endpoints, claves Redis, reglas de negocio) y vuelve aquí para el contexto.

## Qué es

**Detecta**: app privada para decidir a qué licitaciones de obra civil presentarse en Colombia.
Reescritura completa (jul 2026) sobre Vercel serverless + Upstash Redis: `api/sync.js` extrae el
año vigente de SECOP II (`p6dx-8zbt`), enriquece y guarda solo lo compatible con los RUP;
`api/oportunidades.js` filtra por perfil (helder/genesis/juntos) y la web estática en `public/`
lo muestra tras un gate con clave. La versión anterior (un `index.html` monolítico de 580 KB con
9 capas de monkey-patching) vive en la historia de git de `main` si algo hiciera falta rescatar.

Desde jul 2026 el orden por defecto es **por probabilidad de ganar**: `api/sync/historico.js`
baja de una vez 2 años de procesos ya adjudicados a un keyspace que ninguna purga toca,
`lib/indice_competencia.js` calcula cuántos oferentes se presentan en promedio a cada entidad y
`/api/oportunidades?ordenar_por=atractividad` (default) pone primero las entidades donde compite
menos gente. El «para qué» es literal: abrir la app en la mañana y ver arriba lo ganable.

## Flujo de trabajo

- **Sin build, sin package.json, sin dependencias.** CommonJS puro; `fetch`/`zlib` nativos.
- **Probar:** `node tests/e2e.js` (4 iteraciones; mocks HTTP de Socrata y Upstash + handlers
  reales). Este entorno **no** tiene salida a `datos.gov.co` (allowlist del proxy) ni CLI de
  Vercel: la validación contra datos reales se hace desplegando.
- **Tras desplegar**: (1) abrir la web — el activo cambió de nombre de clave, así que la primera
  visita responde 503 y dispara la full sola; (2) definir `HISTORICO_TOKEN` y lanzar UNA vez
  `/api/sync/historico?desde=2024-01&hasta=2025-12` (header `x-historico-token`). Sin ese paso la
  app funciona igual, con todo en ⚪ «sin datos históricos».
- Sintaxis de los JS del frontend: `new Function(código)` con Node (los cubre el paso *e* del test).

## Decisiones que no hay que re-aprender (costaron caro)

- **Keyset por `:id`**, nunca `$offset` con orden por fecha (pierde/duplica filas en vivo).
  `$select=":id,:updated_at,*"` y proyección en cliente: un `$select` explícito con una columna
  inexistente da 400, y la fecha de cierre vive en columnas distintas según la modalidad.
- **Un 400 de Socrata jamás se reintenta ni degrada el modo por fallo de red** — solo un 400 real
  degrada keyset→offset. 429/5xx → backoff exponencial + jitter, honrando `Retry-After`.
- **Candado con TTL siempre** (`lock:sync`, SET NX EX 300, liberación por token). El «enCurso
  eterno» de la versión vieja venía de otro lado (full exigía secreto y nadie podía dispararla),
  pero el TTL es la garantía de que nunca reaparezca.
- **`_k` = `id_del_proceso` primero, `:id` de respaldo**: las re-publicaciones regeneran todos los
  `:id` de Socrata. Dedup en lectura: gana el `:updated_at` más reciente (así el delta reemplaza
  los cambios de estado sin reescribir meses).
- **`last_sync` se ancla al INICIO de la corrida** (full o delta); un delta cortado por presupuesto
  aplica lo bajado pero NO avanza el sello (si no, se perderían páginas en silencio).
- **Timestamps**: el dataset usa hora Colombia flotante (UTC-5 fija); `:updated_at` es UTC.
- **Anticipo**: `p6dx-8zbt` NO trae columna de anticipo. Por eso `anticipo_pct=0` significa «sin
  dato» y el filtro `anticipo_min` no lo excluye (excluirlo = app vacía para siempre). El % solo
  aparece si el objeto lo menciona en texto o si algún día la fuente añade el campo.
- **`plazoMeses`**: normalizar acentos antes de comparar unidades («Días».includes("dia") era
  false por la í — bug histórico del K).
- **Prefiltro al sincronizar** (cascada modalidad → estado → objeto): sin él, el año son ~500 k
  filas y revienta el tier gratuito de Upstash y la memoria de la función de consulta. Si cambian
  las whitelists (`lib/unspsc.js`) o los filtros (`lib/filtros.js`), relanzar `/api/sync?modo=full`.
- **El delta CONSERVA los cerrados a propósito** (`transformar(..., {conservarCerradas:true})`):
  un proceso guardado como abierto que pasa a Adjudicado debe entrar al chunk para que el dedup
  por `:updated_at` lo reemplace y salga del listado. Si el delta lo filtrara, la versión abierta
  quedaría congelada para siempre. La full sí excluye cerrados de origen.
- **Estado desconocido = CERRADO** (`lib/filtros.js`): listas canónicas normalizadas, sin
  fallbacks optimistas. Y OJO: «seleccionado» NO puede ir en la lista de cerrados — haría
  prefijo con la fase «Selección», que es justo donde se reciben ofertas.
- **Modalidad por lista blanca**: Contratación Directa (incluida «(con ofertas)») y Licitación
  Privada fuera; Régimen Especial fuera SALVO «(con ofertas)»; desconocida → fuera.
- **Convenios NO son licitaciones** (`es_convenio` en `lib/filtros.js`, corre ANTES que todo lo
  demás del objeto): «AUNAR ESFUERZOS TÉCNICOS, ADMINISTRATIVOS Y FINANCIEROS…» es la fórmula del
  convenio interadministrativo/de asociación y se colaba porque las entidades lo publican bajo
  «Régimen Especial (con ofertas)». OJO con la precisión: «aunar esfuerzos/recursos» descarta esté
  donde esté, pero «convenio interadministrativo» SOLO si encabeza el objeto — si no, se lleva por
  delante la obra real que lo menciona de pasada («…en el marco del convenio 123»).
- **UNSPSC se compara por CLASE (6 dígitos), no por producto (8)**: los 393 códigos de los RUP
  terminan TODOS en «00» (inscripción a nivel de clase) y SECOP II publica muchas veces el
  producto — la igualdad exacta de 8 dígitos exigía que la entidad hubiera publicado justo el
  «…00», así que descartaba en silencio todo lo demás. El cambio es estrictamente más permisivo;
  una clase ajena al RUP sigue fuera. **Requiere relanzar la full**: el prefiltro corre al
  sincronizar, así que lo que la regla vieja descartó nunca entró a Redis.
- **`/api/diagnostico`** (mismo token, solo lectura) da el EMBUDO paso a paso sobre el corpus real
  más contrafactuales. Antes de tocar un filtro «porque salen pocos», MIRARLO: dice exactamente en
  qué paso mueren los procesos y cuántos se recuperarían al relajar cada regla. Dos invariantes
  probadas: los pasos suman el total, y `visibles` == el `total` de /api/oportunidades.
- **Capa anti-suministro**: clases SOLO de segmentos de bienes + verbo de compra sin verbo de
  obra = compra disfrazada → fuera. El corte de «bienes» es TODO segmento UNSPSC < 70 (no la
  lista 30/39/43/48/56: eso dejaba servida la «compraventa de tubería PVC», segmento 40, el
  bloque más grande del RUP de Génesis). Un código ≥ 70 (obra/servicios) ancla el proceso.
  Y «Enajenación de bienes con Subasta» se excluye ANTES de que la lista blanca vea «subasta».
- **Full de higiene mensual** (modo auto, `FULL_HIGIENE_MS`): el delta no puede reflejar
  mutaciones de modalidad/objeto de procesos ya guardados (los descarta y la versión vieja
  quedaría congelada); la full mensual acota esa deriva. Tumbas por descartado costarían
  demasiado Redis — decisión consciente.
- **Consorcio: dos reglas distintas a propósito** — indicadores habilitantes ponderados 50/50
  (D. 1082), pero K del plural = SUMA de las CRP de los integrantes (Guía CCE). No «promediar» K.
- **NIT en null**: no consta en el repositorio; jamás inventarlo. CT de Génesis = 3 (estimado
  conservador): confirmar con el dueño antes de subirlo.
- **Límites Vercel/Upstash**: respuesta ≤4.5 MB; valor Redis ≤1 MB (chunks deflate ≤500 KB antes
  del base64); crons Hobby solo diarios — por eso la full se auto-encadena y cada visita
  refresca vía delta.

### Competencia histórica por entidad (jul 2026)

- **Dos keyspaces con ciclos de vida opuestos**: `licitaciones:activo:mes:*` (lo que sirve la app;
  la full de higiene y la compactación lo purgan) y `licitaciones:historico:mes:*` (cerrados con
  adjudicación; **NADA lo purga** — era justo esa purga la que impedía cualquier análisis). El
  patrón viejo `licitaciones:mes:*` es legado y la full lo borra al terminar.
- **Quién alimenta el histórico**: el DELTA, porque es el único que ve la transición abierto →
  cerrado. `api/sync/historico.js` solo hace el backfill de lo anterior a la puesta en marcha
  (manual, con token; admite cualquier rango, también el año en curso).
- **El delta escribe primero el histórico y después el reemplazo en activo**: al revés se perdería
  el dato histórico para siempre si falla a mitad. El registro cerrado SIGUE entrando al activo
  (es lo que hace que el proceso desaparezca del listado por dedup de `:updated_at`); quien lo
  saca físicamente es la compactación (ahora descarta cerrados) o la siguiente full.
- **Dos proyecciones a propósito** (`lib/proyeccion.js`): la activa NO lleva datos de adjudicación
  (no se exponen en `/api/oportunidades`, ni siquiera se guardan); la histórica sí. `repartirDelta`
  hace las dos en una sola pasada.
- **0 oferentes = SIN DATO**, no «nadie se presentó» (misma lógica que `anticipo_pct = 0`). Si se
  contara como 0, el promedio de la entidad se iría al suelo y TODAS acabarían en «baja».
- **Tertiles con `<=` y mínimo de 5 procesos**: empates al mismo nivel; con menos de 5 procesos la
  entidad es `sin_dato`, y en el orden `sin_dato` va ANTES que `alta` (no saber no es lo mismo que
  saber que hay 20 competidores).
- **Columnas de adjudicación/oferentes: PENDIENTE VERIFICACIÓN** (este entorno no alcanza
  datos.gov.co; verificado `CONNECT 403`). Por eso se leen por lista de candidatas en
  `lib/indice_competencia.js`. Síntoma de que falta la correcta: `indice:competencia:meta` con
  `clasificadas: 0` y `descartados.sin_oferentes` alto → añadir el nombre real y llamar
  `/api/sync/historico?reconstruir_indice=true` (no hay que re-extraer nada).
- **Índice publicado con swap atómico** (`indice:competencia:nuevo` → RENAME): nunca hay una
  ventana sin índice. Construcción mes a mes y reanudable; el acumulador que se persiste es por
  ENTIDAD (histograma), no por proceso — por eso cabe en un valor de Redis.
- **`HISTORICO_TOKEN` sin default**: si la variable no está, el endpoint responde 503. Nunca
  inventar una llave por defecto. El token viaja por header en la auto-reinvocación para no
  quedar escrito en los logs de acceso de Vercel.
- **`/admin.html` encadena la full desde el navegador**: 1.ª tanda `modo=full` (REINICIA) y todas
  las siguientes `modo=auto` (CONTINÚA). Repetir `full` volvería a enero para siempre — hay prueba
  de la invariante contra el handler real. Existe porque el fire-and-forget del servidor muere con
  Password Protection y el dueño no tiene terminal.
- **`?estado=true` y `?reset=true`** (mismo token): la única forma que tiene el dueño de
  diagnosticar y destrabar sin terminal. `estado` solo lee (candado + TTL restante, avance,
  corpus, índice) y `reset` borra candado/progreso/meta **sin tocar los chunks ya bajados**.
  Antes de resetear, MIRAR el estado: si el candado está libre y la extracción sin terminar, la
  cadena murió (Password Protection interceptando la auto-llamada es lo típico) y basta volver a
  llamar la URL — resetear solo tira el avance a la basura. El candado NO puede atascarse para
  siempre (TTL 600 s) y un 401 jamás lo deja puesto (autorizar corre antes de tomarlo).
- **Token por header O por `?token=`, y el header gana si vienen los dos**: el dueño trabaja en un
  portátil institucional SIN terminal, así que la vía real de disparo es pegar la URL en Chrome.
  No quitar la vía por query «por seguridad»: dejaría la extracción imposible de lanzar. El precio
  (token en logs de acceso e historial del navegador) está asumido y documentado — rotarlo al
  terminar el backfill. El mensaje del 401 sugiere LAS DOS formas a propósito.

## Datos del negocio (fuente de verdad)

- Índice de competencia por entidad en `lib/indice_competencia.js` (hash `indice:competencia`,
  tertiles sobre el promedio de oferentes de 2 años); alimenta `ordenar_por=atractividad`.
- Perfiles y finanzas reales en `lib/perfiles.js` (FUENTE ÚNICA; RUP corte 31/12/2025) — Génesis
  es persona jurídica SAS; fórmula K única en `lib/capacidad.js`; filtros canónicos (estado,
  modalidad, anti-suministro) en `lib/filtros.js`; whitelists UNSPSC en `lib/unspsc.js`
  (193/343/393, la unión se calcula); blacklist/whitelist semánticas en `lib/semantica.js`.
  Resumen técnico en `docs/PERFILES.md`. SMMLV 2026 = $1.750.905.
- `autorizacion_helder.md`: constancia de autorización de datos personales (plantilla).
- Clave del sitio: `231105` (gate del cliente, en `public/app.js`). La protección seria es
  Vercel Password Protection (servidor); no debilitarla sin permiso del dueño.

## Convenciones

- Español en UI, comentarios y commits. Estética tipo Apple (Tailwind CDN, sobrio, claro).
- Sin dependencias de pago; sin npm salvo necesidad justificada.
- Preferir cambios pequeños y directos sobre el código actual — la era de las «capas aditivas»
  con monkey-patch terminó con la reescritura.
