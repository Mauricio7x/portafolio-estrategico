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
- **Tras desplegar**: (1) relanzar `/api/sync?modo=full` UNA vez — la ingesta se ensanchó y hay
  procesos que las reglas viejas nunca dejaron entrar a Redis (es la última full que exige un
  cambio de matching: ver «ingesta/juicio»); (2) definir `HISTORICO_TOKEN` y lanzar UNA vez
  `/api/sync/historico?desde=2024-01&hasta=2025-12` (header `x-historico-token`), o
  `?reconstruir_todo=true` si el histórico ya estaba bajado. Sin ese paso la app funciona igual,
  con todo en ⚪ «sin datos históricos» y sin equivalencias.
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
- **Prefiltro al sincronizar** (cascada modalidad → estado → `admisibleParaIngesta`): sin él, el
  año son ~500 k filas y revienta el tier gratuito de Upstash y la memoria de la función de
  consulta. Desde jul 2026 ese prefiltro NO evalúa los RUP (ver «ingesta/juicio»): solo hay que
  relanzar la full si se toca `admisibleParaIngesta` o la blacklist, nunca por el matching.
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
- **UNSPSC se compara por JERARQUÍA, leyendo el NIVEL del código** (`lib/unspsc.js`): el nivel se
  deduce de los pares «00» finales — `72000000` es un SEGMENTO, no «el producto cero». El match es
  BIDIRECCIONAL: la clase del RUP contiene al producto publicado (tier `clase`) Y el proceso
  publicado a nivel de familia contiene clases del RUP (tier `familia`, amplio: verificar pliego).
  El upward matching llega hasta FAMILIA, jamás hasta segmento — subir al segmento haría casar
  «servicios de construcción» con cualquier cosa del 72; un segmento suelto solo se rescata si el
  objeto lo confirma. Los 393 códigos de los RUP terminan TODOS en «00» (inscripción por clase),
  que es la premisa de todo esto y hay una prueba que la vigila.
- **Tokenizar los códigos por RUNS de dígitos, nunca con `\d{8}`**: el `\d{8}` fabricaba códigos
  falsos a partir de cualquier número largo del campo («1234567890» → 12345678). Solo longitudes
  2/4/6/8; lo demás se descarta Y SE CUENTA (`distribuciones.codigos_unspsc_ilegibles`).
- **`/api/diagnostico`** (mismo token, solo lectura) da el EMBUDO paso a paso sobre el corpus real
  más contrafactuales (`ganancia_por_jerarquia`, `ganancia_por_equivalencias`,
  `ganancia_por_texto`, `visibles_sin_capa_pertinencia`). Antes de tocar un filtro «porque salen
  pocos», MIRARLO: dice exactamente en qué paso mueren los procesos y cuántos se recuperarían al
  relajar cada regla. Cuatro invariantes probadas: los pasos suman el total, `visibles` == el
  `total` de /api/oportunidades, el reparto por tier suma exactamente los visibles, y
  `visibles_por_pertinencia.rojo` es SIEMPRE 0.
- **Capa anti-suministro**: ningún código que ancle obra + verbo de compra sin verbo de obra =
  compra disfrazada → fuera. El corte de «bienes» es TODO segmento UNSPSC < 70 (no la lista
  30/39/43/48/56: eso dejaba servida la «compraventa de tubería PVC», segmento 40, el bloque más
  grande del RUP de Génesis). ANCLA un código ≥ 70 **salvo** los servicios no constructivos
  (80, 84, 85, 86, 90-94): antes bastaba cualquier ≥70 y una «ADQUISICIÓN DE MOBILIARIO» con un
  80101600 de gerencia quedaba anclada. OJO: su `VERBO_OBRA_RE` es una lista de ACCIONES, más
  corta que `VERBOS_DE_OBRA_FUERTES` (que trae sustantivos como «acueducto») — «SUMINISTRO DE
  TUBERÍA PARA LA RED DE ACUEDUCTO» es una compra y debe seguir cayendo aquí. Y «Enajenación de
  bienes con Subasta» se excluye ANTES de que la lista blanca vea «subasta».
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

### Ingesta ancha / juicio fino y pertinencia (jul 2026)

- **El bug ESTRUCTURAL era el acoplamiento**: el matching UNSPSC corría en el prefiltro de ingesta,
  así que cada mejora de la regla exigía una full y lo que la regla vieja descartó nunca había
  entrado a Redis. Ahora `admisibleParaIngesta` (ancho, sin perfiles, <1 ms/proceso) decide qué se
  GUARDA y `evaluarObjeto(l, perfil, conocimiento)` decide qué se SIRVE. Afinar el matching o
  cargar un RUP nuevo tiene efecto INMEDIATO. Hay prueba de que el prefiltro no recibe perfil.
- **La blacklist semántica SE QUEDA en la ingesta** aunque el juicio la repita: no es juicio por
  perfil («ningún RUP de obra querrá un contrato de caninos») y es lo que evita pagar Redis por
  medio SECOP. Quitarla no cambiaría ni un resultado, solo la factura.
- **Capa de PERTINENCIA** (`evaluarPertinencia`, corre DESPUÉS del matching): los segmentos 80
  (gerencia), 85 (salud) y 93 (sociales) están inscritos en los RUP porque ahí viven la gerencia
  de proyectos y la interventoría — y por eso se colaban impresión/fotocopia, alimentos, internet,
  cumpleaños y apoyo logístico con código válido. Regla: verbo de obra → pasa; término no
  pertinente CON CERO verbos de obra → fuera; sin verbo pero con tier `clase` en segmento de obra
  pura (72/77/81/95) → pasa; resto → pasa en AMARILLO. **Nunca bloquea por falta de información**:
  en una app de oportunidades el falso negativo cuesta más que un amarillo que se revisa en 5 s.
- **Tres reglas que salieron del diagnóstico REAL (ago 2026), no de la teoría**:
  (1) `TERMINOS_BLOQUEANTES` (internet y familia) descartan AUNQUE haya verbo de obra — la regla
  normal exige cero verbos y «SERVICIO DE INTERNET DEDICADO CON INSTALACIÓN Y CANALIZACIÓN DE
  REDES» los traía. La lista es CORTA a propósito: un bloqueante se lleva por delante hasta la
  obra bien escrita, por eso «fibra óptica» exige contexto de servicio.
  (2) `esObjetoGenerico`: «CONVOCATORIA PUBLICA», «CONCURSO DE MERITOS INV-CM-001-2026» son el
  número del proceso, no una descripción → fuera (<15 caracteres, o sin contenido tras quitar
  palabras de trámite y códigos, y sin verbo de obra). OJO: es la única regla que descarta un
  proceso con UNSPSC sólido, así que el diagnóstico muestra ejemplos para poder vigilarla.
  (3) **La ruta de TEXTO exige pertinencia VERDE**: 1 077 procesos entraban por texto y el
  vocabulario genérico de familia (institucion/educativa/sede) metía equipos y servicios. Sin
  código del RUP, el objeto es la única evidencia; un 🟡 ahí no es evidencia de nada. Se reabre con
  `?incluir_sin_unspsc=1` (toggle apagado por defecto), que SOLO añade esa ruta.
- **Los verbos ambiguos van CONDICIONADOS a un ancla de infraestructura cercana**: «mantenimiento
  de la red de alcantarillado» sí, «mantenimiento de vehículos» no. Ídem instalación/montaje y
  consultoría/supervisión/diseño/estudios. Y los términos malos tienen excepciones por lookahead:
  «logística DE OBRA», «transporte DE MATERIALES», «seguridad VIAL».
- **Los vocabularios nuevos se comparan sobre texto NORMALIZADO** (`norm`: sin tildes y ñ→n), así
  que se escriben `diseno`, `senalizacion`, `cumpleanos`. Los dos heredados (BLACKLIST_OBJETO,
  WHITELIST_OBRA) siguen comparándose sobre el texto CRUDO con `[oó]` y flag `i`: no tocarlos,
  cambiarles la base de comparación sería una regresión silenciosa.
- **`norm` vive en `lib/semantica.js`** (filtros la re-exporta) y **`lib/indice_competencia.js` la
  importa de semantica, NO de filtros**: filtros → equivalencias → indice_competencia → filtros
  sería un ciclo de requires y dejaría `norm` sin definir en tiempo de carga.
- **Un índice de equivalencias en CERO tiene cuatro causas distintas** y un `0` no las distingue:
  nunca se construyó, el dataset no trae adjudicatario (la típica), nadie ganó en dos clases a la
  vez, o ningún par alcanza los umbrales. `explicarEquivalencias()` las traduce y `/api/diagnostico`
  las sirve en `conocimiento.equivalencias_por_que` con su siguiente paso. Antes de bajar un
  umbral, MIRAR eso: si el problema son las columnas de adjudicatario, bajar el lift no arregla nada.
- **Equivalencias funcionales** (`lib/equivalencias.js`): lift ≥ 3 sobre ADJUDICATARIOS (no sobre
  procesos: una entidad con 40 procesos gemelos no puede fabricar una equivalencia), soporte ≥ 20
  procesos en la clase inscrita y ≥ 5 adjudicatarios en la intersección. Solo se guardan pares con
  A en la unión de los RUP. Es AYUDA A LA DECISIÓN, no habilitación jurídica — por eso el tier
  `equivalente` es más débil que `clase` y la tarjeta lo dice.
- **Vocabulario por familia**: `data/vocabulario_unspsc.json` es una SEMILLA CURADA A MANO, no una
  estadística — está escrito en el propio archivo y no debe presentarse de otro modo. El derivado
  del histórico se MEZCLA con la semilla familia a familia (una derivación flaca no puede dejar
  sin señal a las demás). Al derivar solo se acumulan familias que algún RUP inscribe: el resto no
  se usaría nunca.
- **Un proceso con códigos que no casan pero con objeto inequívoco de obra se RESCATA** con el
  tier más débil (`texto`). Es intencional: SECOP II se codifica mal a menudo. Lo que NO se
  rescata es un objeto sin vocabulario de obra — ese muere en `fuera_unspsc`, y el diagnóstico lo
  separa de `fuera_sin_unspsc_ni_obra`.

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
- **En `public/app.js` el arranque automático (`abrirApp()` si ya hay `detecta-acceso`) va AL FINAL
  del IIFE**. Estaba junto al gate y, en cada visita repetida de la MISMA pestaña, `buscar()`
  reventaba en la zona muerta temporal de `timerReintento` (declarado más abajo). Como `buscar` es
  async, el error salía por una promesa rechazada: la app se quedaba sin resultados EN SILENCIO y
  parecía que el frontend «no hacía nada». Bug del día uno de la reescritura; hay prueba de que el
  orden se mantiene.
- **Ninguna pulsación del modal puede quedarse sin respuesta visible**: el campo de token vacío
  AVISA (antes hacía `return` a secas y el botón parecía muerto), el envío va cableado al `submit`
  y al `click`, y `sessionStorage` se lee/escribe dentro de `try` (en modo restringido lanza).
  La clave de sesión es `historico_token`.
- **El badge de competencia es AUDITABLE** (`/api/competencia-detalle` + `lib/competencia_detalle.js`):
  el modal enseña los procesos que forman el promedio y los que NO, con el motivo
  (`sin_dato_oferentes`, `sin_adjudicacion`, `insuficientes_datos`). Regla de oro: NO es un segundo
  cálculo — usa `esAdjudicado`/`oferentesDe` del índice, y hay una prueba que compara conteo,
  promedio y nivel contra el hash publicado. Si divergieran, el detalle no serviría para verificar
  nada. La caché (`indice:detalle:*`, TTL 1 h) guarda el sello del índice: reconstruirlo la
  invalida entera. Una respuesta con chunks ilegibles NO se cachea.
- **Índice publicado con swap atómico** (`indice:competencia:nuevo` → RENAME): nunca hay una
  ventana sin índice. Construcción mes a mes y reanudable; el acumulador que se persiste es por
  ENTIDAD (histograma), no por proceso — por eso cabe en un valor de Redis.
- **La autorización vive en `lib/auth.js`, una sola vez**: tres endpoints la usan
  (`/api/sync/historico`, `/api/diagnostico`, `/api/competencia-detalle`). Una copia que se
  desincronice es un agujero.
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
  es persona jurídica SAS; fórmula K única en `lib/capacidad.js`; REGLAS (estado, modalidad,
  convenios, prefiltro de ingesta, cascada de juicio, pertinencia, anti-suministro) en
  `lib/filtros.js`; whitelists UNSPSC + motor de matching jerárquico en `lib/unspsc.js`
  (193/343/393, la unión se calcula); VOCABULARIOS en `lib/semantica.js`; equivalencias aprendidas
  en `lib/equivalencias.js`; co-señal de texto en `lib/texto_unspsc.js` +
  `data/vocabulario_unspsc.json`.
  Resumen técnico en `docs/PERFILES.md`. SMMLV 2026 = $1.750.905.
- `autorizacion_helder.md`: constancia de autorización de datos personales (plantilla).
- Clave del sitio: `231105` (gate del cliente, en `public/app.js`). La protección seria es
  Vercel Password Protection (servidor); no debilitarla sin permiso del dueño.

## Convenciones

- Español en UI, comentarios y commits. Estética tipo Apple (Tailwind CDN, sobrio, claro).
- Sin dependencias de pago; sin npm salvo necesidad justificada.
- Preferir cambios pequeños y directos sobre el código actual — la era de las «capas aditivas»
  con monkey-patch terminó con la reescritura.
