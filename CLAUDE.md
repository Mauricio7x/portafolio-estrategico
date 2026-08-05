# CLAUDE.md

**Al iniciar cada sesión, lee `docs/GUIA_ANALISTA_LICITACIONES.md` para comprender el dominio del
proyecto.** Y `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`, que audita el manual, **corrige dos cosas
que dice mal** y trae lo verificado en 2025-2026 (documentos tipo v.2, ley de garantías, dataset).

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
  procesos que las reglas viejas nunca dejaron entrar a Redis (ver «ingesta/juicio»), y desde ago 2026
  también los que se perdían por el estado `Activo` que faltaba en `ESTADOS_ABIERTOS`; el filtro de
  estado corre en la INGESTA, así que sin la full esos procesos no aparecen; (2) definir
  `HISTORICO_TOKEN` y lanzar UNA vez
  `/api/sync/historico?desde=2024-01&hasta=2025-12` (header `x-historico-token`), o
  `?reconstruir_todo=true` si el histórico ya estaba bajado. Sin ese paso la app funciona igual,
  con todo en ⚪ «sin datos históricos» y sin equivalencias.
- Sintaxis de los JS del frontend: `new Function(código)` con Node (los cubre el paso *e* del test).
- El dashboard (`/api/resumen`) y la carga de RUP (`/api/admin/rup`) NO exigen full ni backfill:
  viven en la capa de consulta. Cargar un RUP tampoco — el juicio corre al servir.

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
- **`columnas_historicas`** (bloque del mismo `/api/diagnostico`, `lib/columnas_historicas.js`)
  censa el corpus HISTÓRICO y responde con qué nombre EXACTO llegó cada columna de adjudicación y si
  la baja de mercado (`1 − adjudicado/precio_base`) se puede calcular con lo ya bajado. Sustituye al
  síntoma indirecto de siempre (`indice:competencia:meta` con `clasificadas: 0`). Tres reglas:
  (1) las listas de candidatas se IMPORTAN de `lib/indice_competencia` —igual que `numero` y
  `primero`—, nunca se copian: si divergieran, el diagnóstico informaría de una columna que el
  índice no mira; (2) `con_dato` y `con_dato_util` se cuentan aparte porque un campo en cero es SIN
  DATO, no cero pesos; (3) un 0 tiene DOS causas que el censo no distingue —la fuente no la publica,
  o la proyección no la guarda—, y por eso se publica `claves_observadas` con la verdad literal del
  JSON almacenado. La baja exige las dos mitades en la MISMA fila: sumar coberturas por separado da
  un número más bonito y falso.
- **Índice de BAJA de mercado** (`lib/indice_baja.js`, `indice:baja:*`): cuánto descuenta el ganador
  frente al presupuesto (`1 − adjudicado/precio_base`). Es la otra mitad de la decisión de precio —el
  de competencia dice CUÁNTOS se presentan, este A CUÁNTO se adjudica— y sale entero del histórico ya
  bajado. Se reconstruye con `?reconstruir_baja=true` (incluido en `?reconstruir_todo=true`), sin
  re-extraer nada. Decisiones que no hay que re-aprender:
  · **TRES HASHES, no una clave por entidad**: `entidad_familia` → `entidad` → `departamento_familia`.
    Con claves sueltas no habría swap atómico (RENAME solo mueve una clave) y la lectura serían N
    comandos por petición en vez de tres. Mismo motivo que `indice:competencia`.
  · **La cascada solo BAJA en especificidad.** Pedir `entidad` no puede acabar respondiendo con
    `entidad_familia`: sería devolver algo más específico de lo que se preguntó. Y
    `granularidad_utilizada` viaja SIEMPRE — una cifra sin su origen no se puede discutir.
  · **Cortes FIJOS (5 % / 2 %), no tertiles.** «Muchos oferentes» solo significa algo comparado con el
    mercado, pero 8 puntos de baja son 8 puntos de margen compita quien compita. Con tertiles siempre
    habría un tercio «alto» aunque nadie descontara.
  · **Aquí el CERO SÍ es un dato**, al revés que `anticipo_pct = 0` y que el contador de oferentes:
    adjudicar por el presupuesto oficial es un hecho normal y en producción es la MEDIANA. Tratarlo
    como ausencia vaciaría el índice. Lo que sí es «sin dato» es no tener las dos mitades en la MISMA
    fila. `baja_exactamente_cero` viaja en la meta: si se dispara al 100 %, la causa no es el mercado
    sino que `valor_total_adjudicacion` está copiando a `precio_base`.
  · **Dos filtros de higiene salidos del censo real, no de la teoría**: adjudicado < 30 % del oficial
    (295 casos: lotes parciales) y > 110 % (221 casos: dato malo). Una baja negativa LEVE sí se
    conserva — no es un error.
  · **La «baja del mercado» del panel sale de un histograma GLOBAL** escrito en la misma pasada, no de
    promediar las medianas por entidad: eso pesaría igual a una alcaldía con 5 procesos que a una
    gobernación con 500, y las dos cifras acabarían discrepando sin saber cuál mirar.
  · **`ordenar_por=baja` puntúa `100 − baja` y da −1 al `sin_dato`.** Con 0 se colaría en el primer
    puesto haciéndose pasar por «no descuenta nada»: es la confusión entre «no sé» y «cero» otra vez.
  · La familia sale de `normalizarCodigo(...).familia`, NO de un `slice(0,4)` a mano: recortar aquí
    sería una segunda definición de «familia».
  · **El SEGMENTO (2 díg.) se usa para AGRUPAR, nunca para emparejar.** Subir el matching UNSPSC al
    segmento sigue prohibido (`lib/unspsc`): casaría «servicios de construcción» con cualquier cosa
    del 72. Pero para una estadística de precio, más muestra por celda es mejor, así que los
    segmentos van ANIDADOS dentro de cada entidad con mínimo propio de 3 — y cada uno publica sus
    `procesos` y su `min_procesos` para que se lea sabiendo que 3 procesos son orientativos.
  · **La baja NO sale sin token** (`lib/publico`): `baja_mercado`, `baja_entidad` y `baja_segmento`
    viajan en `null` sin credencial. No son finanzas del dueño —son mercado derivado de datos
    públicos— sino la ventaja competitiva que construye la app. Se anulan los TRES, incluido el
    objeto entero: `baja_mercado.mensaje` dice «Descuento típico del 8 %…» y dejarlo sería la misma
    redacción de mentira que dejaba el patrimonio dentro del texto de P3. Queda el mismo canal de
    inferencia ya documentado: `ordenar_por=baja` ordena en el servidor, así que un cliente sin token
    puede deducir el RANGO relativo aunque no vea las cifras.
  · **La reconstrucción manual vive en `/api/indice-baja?reconstruir=true`, NO en `/api/diagnostico`**:
    el diagnóstico está documentado como SOLO LEE —no escribe, no toma candados, no dispara
    sincronizaciones— y esa garantía es justo lo que permite llamarlo cuando algo va mal.
  · **Al cerrar una full el índice se reconstruye con `await` y presupuesto corto**, no con un
    fire-and-forget: en serverless la función se congela al responder y una promesa suelta no tiene
    ninguna garantía de terminar. Con presupuesto corto o acaba, o deja el progreso escrito.
- **El veredicto de un bloque no puede leer un campo que ese bloque no publica.** El censo contaba en
  `utiles` y publicaba `con_dato_util`; la conclusión leía `grupos.*.utiles`, o sea `undefined`, y
  `undefined > 0` es `false` en silencio: anunciaba «ninguna candidata trae datos» encima de un
  `campo_efectivo` ya resuelto y una baja ya calculada. Es `i.total_procesos` otra vez, y la
  cerradura es la misma: derivar el veredicto de `campo_efectivo` (fuente única de esa verdad) y una
  prueba que prohíbe que el texto contradiga a las cifras que lo acompañan.
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
- **La autorización vive en `lib/auth.js`, una sola vez**: nueve endpoints la usan
  (`/api/sync/historico`, `/api/diagnostico`, `/api/competencia-detalle`, `/api/indice-baja`,
  `/api/resumen`, `/api/admin/rup`, `/api/admin/experiencia`, `/api/admin/cobertura-rup`,
  `/api/apu/inferir`). Una copia que se desincronice es un agujero.
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

### Dashboard y RUP por archivo (ago 2026)

- **`/api/resumen` NO reimplementa la cascada, la LLAMA** (`evaluarRup` + `leerChunksDedup` + el
  mismo `anticipo_min=20` y «solo abiertas»). Hay prueba de que `totales.visibles` es EXACTAMENTE el
  `total` de `/api/oportunidades` y el `embudo.visibles` de `/api/diagnostico`. Un panel que calcula
  por su cuenta acaba contradiciendo a la app y entonces no se puede creer a ninguno de los dos.
- **Cada reparto suma los visibles**, y por eso hay cubetas feas a propósito (`OTROS`,
  `SIN_DEPARTAMENTO`, `ya_cerro`, `mas_adelante`): la alternativa es que un proceso desaparezca del
  reparto sin que nadie lo note. `SIN_DEPARTAMENTO` no compite por un puesto del top y jamás se
  reparte a ojo. `superan_k`/`no_superan_k` se cuentan sobre los que pasaron el juicio del OBJETO,
  no sobre los visibles (ahí todos superan la K por construcción: el contador no diría nada).
- **`lib/perfiles.js` sigue exportando `PERFILES` SÍNCRONO y con la misma identidad de objeto**
  (media app lo captura al requerir): una carga de RUP REEMPLAZA sus tres propiedades, nunca el
  objeto. Los datos del repositorio quedan congelados como `PERFILES_FALLBACK`. Si Redis no
  responde, si la clave no existe o si el valor está corrupto, se conserva lo vigente o el respaldo
  y NUNCA se lanza: quedarse sin perfiles deja la app muda.
- **`lib/unspsc.js` conserva sus tres listas y sigue siendo hoja del grafo de requires.** Hacer que
  importara los perfiles cerraría el ciclo `perfiles → unspsc → perfiles`. El RUP cargado entra por
  `PERFILES[x].unspsc`, que es el ÚNICO punto donde el matching lee el RUP: por eso la carga tiene
  efecto inmediato sin tocar el motor. La admisibilidad de INGESTA (`FAMILIAS_UNION`) sigue saliendo
  de las listas del repositorio a propósito: es deliberadamente ancha y cambiarla exigiría una full.
- **Sin TTL en la recarga**: un `GET` del sello `config:perfiles:version` en cada petición (barato)
  y la configuración entera solo si cambió. Un TTL convertiría el «efecto inmediato» prometido en
  «efecto dentro de N minutos», que es justo lo que el dueño no puede verificar desde el navegador.
- **El sello se escribe AL FINAL** de la carga (whitelists → configuración → versión) y lleva
  sufijo aleatorio además del ISO: dos cargas en el mismo milisegundo producirían el mismo sello y
  la segunda pasaría desapercibida.
- **`tope_smmlv` < `experiencia_smmlv` es ADVERTENCIA, no error**: el tope es apetito estratégico y
  en el RUP REAL va por debajo (Helder 6 768 acreditados, tope 4 000). Convertirlo en error dejaría
  el RUP del dueño imposible de cargar. Ídem el tope del plural frente al de sus integrantes.
- **El consorcio se RE-DERIVA siempre** de sus integrantes (unión de UNSPSC, experiencia sumada, K =
  suma de las CRP) aunque venga explícito en el archivo; una lista propia del plural se SUMA a la
  unión, nunca la sustituye. La unión es un hecho derivado: dejar que un archivo la reduzca
  desincronizaría al consorcio de sus miembros.
- **Carga parcial**: subir solo Génesis conserva a Helder. Un POST rechazado no toca nada.
- **En `public/admin.js` el arranque automático va AL FINAL del IIFE** (misma lección que costó cara
  en `app.js`): `abrirApp()` levanta el panel y la carga de RUP, cuyas funciones leen constantes
  declaradas más abajo. Hay prueba del orden. El refresco automático del panel **no corre con la
  pestaña oculta** (gastar invocaciones para que nadie lo mire) y se pone al día al volver a ella.
- La caché `resumen:{perfil}` (TTL 300 s) la **borra cualquier carga de RUP**: sus números salen del
  RUP y quedarían mintiendo cinco minutos.

### Experiencia ejecutada y cobertura del RUP (ago 2026)

- **El RUP dice a qué PUEDE presentarse el dueño; sus contratos ejecutados dicen en qué SABE
  trabajar.** Son dos fuentes distintas y la app solo conocía la primera. `/api/admin/experiencia`
  guarda la lista real de contratos (`config:experiencia`) y destila de sus objetos un vocabulario
  del oficio (`config:experiencia:terminos`); `/api/admin/cobertura-rup` lo cruza con el histórico
  adjudicado para responder lo único que importa antes de la renovación anual: **qué códigos usa el
  mercado para lo que este señor ya hace, y cuáles no tiene inscritos**.
- **La auditoría NO reinventa ninguna regla: reutiliza las que ya decidían otra cosa.** La
  pertinencia es `evaluarPertinencia` tal cual; los segmentos que pueden ser un hueco son 70–95
  MENOS `SEGMENTOS_SERVICIOS_NO_CONSTRUCTIVOS` (si un segmento no ancla obra para la capa
  anti-suministro, tampoco puede ser un hueco de obra); «claramente obra civil» es
  `SEGMENTOS_OBRA_PURA`. Inventar tres listas paralelas habría creado tres definiciones de «obra»
  que divergen a la primera corrección.
- **Los tokens con dígitos se descartan del vocabulario** (`2024`, `cm001`): es la misma lección de
  `esObjetoGenerico`. Si entraran, cualquier proceso que mencione un año ganaría similitud gratis.
  Y las stopwords incluyen el TRÁMITE contractual (`prestacion`, `servicios`, `contrato`,
  `objeto`): un término que está en todos los objetos no distingue ninguno.
- **Sin experiencia cargada el score viaja en `null`, jamás en 0.** El método base (vocabulario de
  obra) responde «esto es obra», que es mucho menos que «esto es TU obra», y publicar un 0 como si
  fuera una similitud medida sería la misma clase de mentira que el `|| 0` sobre un conteo.
- **La criticidad del encargo tenía umbrales que se solapan** («2-4 procesos **o** score ≥ 0.1» y
  «1 proceso **o** score < 0.1» clasifican de dos formas el mismo código de 3 procesos flojos). Se
  resolvió como CASCADA y con la lectura que el propio encargo fija en sus casos de prueba: 3
  procesos con similitud floja son BAJO. Y **un solo proceso nunca pasa de BAJO**, por perfecta que
  sea la similitud: un contrato no es una tendencia y lo que está en juego es un código que hay que
  sostener un año entero en el RUP.
- **La caché de la auditoría lleva el sello del RUP Y el de la experiencia** (`cobertura:{perfil}:
  {exp|base}`, TTL 1 h). Cargar cualquiera de los dos la invalida sola — además de borrarla a mano
  en los dos POST, que es lo que hace visible el efecto al instante. Una caché que solo se borra a
  mano es una caché que algún día no se borra.
- **La auditoría es el único panel que NO se dispara solo**: recorre el histórico entero. Corre
  cuando alguien pulsa el botón, y cargar un RUP o una experiencia oculta lo pintado con un aviso
  (la whitelist o el vocabulario contra los que se midió acaban de cambiar).
- **`perfil` es obligatorio, sin default.** La respuesta se lee como «lo que te falta a TI»; servir
  la de otro perfil por omisión sería la peor forma posible de equivocarse. Hay prueba de que
  `85121700` es hueco para Helder y no lo es para Génesis, que es lo que demuestra que la auditoría
  depende del perfil y no solo del corpus.
- **Los fixtures del histórico van SIN conteo de oferentes** (como los de equivalencias): así el
  índice de competencia los cuenta como «sin dato» y los tertiles de las cuatro entidades no se
  mueven. Y con entidad propia, para no engordar los «excluidos» de ninguna entidad que
  `/api/competencia-detalle` ya audita con conteos exactos.
- **Los objetos de esos fixtures no llevan descripción a propósito**: el score está calibrado al
  tercer decimal (0,167 = un término en común de seis, entre el 0,15 que deja entrar y el 0,20 de
  ALTO) y cualquier palabra de más los movería de casilla — la prueba pasaría o fallaría por azar.

### Dos defectos de producción y sus cerraduras (ago 2026)

- **El «en 0 procesos» era un CAMPO INEXISTENTE, no un dato malo**: el detalle en línea del panel
  (`public/admin.js`) leía `i.total_procesos` de la respuesta de `/api/competencia-detalle`, que
  jamás ha tenido ese campo — se llama `procesos_contados`; `total_procesos` pertenece al OTRO
  payload, el `competencia_entidad` que embebe `/api/oportunidades`. El `|| 0` disfrazaba el
  `undefined` de cero, así que el conteo era 0 **siempre**, con cualquier entidad y cualquier dato.
  Dos lecciones: (1) **dos payloads distintos no pueden usar nombres parecidos para cosas
  distintas**, y (2) **un `|| 0` sobre un conteo convierte «no sé» en «cero»** y lo hace creíble —
  hay prueba que prohíbe `i.<conteo> || 0` en los dos frontends. La cifra del promedio era real: lo
  falso era el conteo que la acompañaba.
- **«⚪ Sin datos históricos» con un promedio debajo**: `detalleEntidad` exigía índice clasificado
  para el `nivel` pero solo `contados ≥ 5` para el `promedio`, así que con el índice **sin
  reconstruir** (que es el estado normal: se construye a mano mientras el delta engorda el
  histórico en cada visita) salían los dos juntos y sin explicación. El promedio se conserva —12
  procesos con oferentes son base de sobra— y ahora el `mensaje` dice por qué la banda sigue en ⚪ y
  con qué parámetro exacto se arregla. Hay prueba que borra el índice, comprueba el mensaje y lo
  reconstruye.
- **«18.2 oferentes» sin base**: el índice publicaba el `promedio` de entidades que NO se
  pueden clasificar (<5 procesos → `nivel: "sin_dato"` pero `promedio: 18.2` en el hash), y bastaba
  con que un consumidor lo pintara sin mirar el nivel. Tres cerraduras, y las tres hacen falta:
  (1) `registroPublicado` NO publica ninguna cifra derivada por debajo del mínimo — ni promedio, ni
  mediana, ni `oferentes_total` (con la suma se recalcula el promedio que se acaba de anular);
  (2) **`competenciaDe` es el punto único de paso** de los tres consumidores y ahí se impone la
  invariante: promedio solo con `procesos ≥ 5` Y nivel clasificado Y promedio presente;
  (3) el badge (`app.js` y `/api/resumen`) exige `conBase` antes de interpolar una cifra.
  La (2) es la importante: **`indice:competencia` no se purga NUNCA**, así que en producción sigue
  vivo el hash escrito por la versión anterior hasta que alguien reconstruya el índice — arreglar
  solo el escritor habría dejado el defecto en pantalla indefinidamente. El conteo sí viaja: es un
  hecho y es lo que explica el ⚪. `procesos_contados` se publica como alias de `procesos` y el
  lector acepta los dos nombres.
- **La cascada vive UNA sola vez** (`lib/filtros.filtrarProcesosVisibles`) y la llaman
  `/api/oportunidades` y `/api/resumen`. Eran dos copias idénticas —con pruebas de que los totales
  coincidían— pero «idénticas hoy» no es garantía: divergen a la primera corrección que se aplique
  a una sola. El `require("./rup.js")` va **diferido dentro de la función**: en tiempo de carga
  cerraría el ciclo `filtros → rup → filtros`. Los filtros que ELIGE quien consulta (cuantía,
  competencia, ubicación, tier) se quedan fuera de la cascada a propósito: si entraran,
  `totales.visibles` del panel dependería de lo que el dueño tuviera marcado en la pantalla.
- **Los destacados del panel aplican CUATRO filtros más que el listado** (cerrado explícito,
  «Verificar objeto», objetos de estructuración y cuantía 0) y los cuentan en
  `destacados_descartados`. Es deliberado: la lista corta es una RECOMENDACIÓN y un falso positivo
  en el puesto 1 cuesta más que uno en la página 4. **No tocan `totales.visibles`** — el proceso
  sigue en `/api/oportunidades`, con su tarjeta y su veredicto delante.
- **`TERMINOS_ESTRUCTURACION`** (`lib/semantica.js`): «seleccionar accionista para constituir una
  sociedad de economía mixta que construya…» pasa la cascada entera **con toda razón** (es
  competitivo, tiene UNSPSC del RUP y su objeto habla de construir), pero lo que se busca es un
  socio que ponga capital, no un constructor. Dos precisiones que no se pueden quitar: «app» va con
  frontera de palabra (es la sigla de Asociación Público-Privada) y «concesión **de aguas**» está
  exceptuada — es el permiso ambiental que menciona cualquier obra de acueducto.
- **`estado_cerrado` NO es la negación de `estado_abierto`**: hay TRES estados, no dos. Un estado
  desconocido no está abierto (no se sirve) pero tampoco consta como cerrado; confundirlos sería
  afirmar «adjudicado» sobre un proceso del que no se sabe nada.
- **EL RELOJ CIERRA PROCESOS** (`cierre_vencido`, ago 2026). Defecto de producción: «INVITACION
  PRIVADA EDUH-Turbo», con fecha límite 20/02/2026, seguía servido como abierto SEIS MESES después —
  ninguna columna de estado lo desmentía. Si `fecha_cierre` ya pasó, el proceso está cerrado **diga
  lo que diga el estado declarado**, y eso vale tanto para `estado_abierto` como para
  `estado_cerrado` (la fecha vencida es un HECHO, no una inferencia). Esto acota mucho —no elimina—
  el hueco de «ningún filtro puede arreglarlo»: lo que SECOP II adjudicó sin mover el estado ni
  publicar fecha de cierre sigue dependiendo del delta.
- **La hora Colombia NO es un detalle en esa regla.** El dataset publica timestamps FLOTANTES sin
  zona y `Date.parse` los lee como UTC, adelantándolos 5 h. Comparar contra `Date.now()` a secas
  cerraría los procesos **cinco horas antes de tiempo** y borraría del listado justo los que cierran
  HOY. Por eso se compara contra `ahora − 5 h`. Si algún día llegara una columna CON zona, la resta
  la haría 5 h indulgente — el error cae del lado de mostrar de más, que es el correcto aquí. Hay
  prueba con el «ahora» INYECTADO: una prueba de husos que se calibra contra el reloj real no prueba
  nada y falla sola en la frontera.
- **La regla corre TAMBIÉN en la ingesta**, donde la fila aún no pasó por `enriquecer` y no tiene
  `fecha_cierre` resuelto: `cierre_vencido` deriva la fecha de las columnas crudas con la misma
  `fechaCierre` de `lib/negocio` (require DIFERIDO dentro de la función — en tiempo de carga
  cerraría el ciclo `filtros → negocio → filtros`).
- **«Invitación Privada» NO es modalidad competitiva**: la entidad elige a quién invita, así que no
  hay convocatoria abierta. Se colaba porque ninguna de sus palabras casaba con las exclusiones y su
  objeto era obra impecable. Va como subcadena, así que cubre las variantes con sufijo.
- **Los fixtures del e2e cierran en el FUTURO** (`CIERRE_FUTURO`), no dentro del mes de publicación:
  con el reloj cerrando procesos, unas fechas pasadas habrían vaciado el corpus de prueba. Y hay dos
  fixtures del defecto, separados a propósito — uno cae por modalidad y otro **solo** por el reloj—,
  porque con el caso combinado bastaría con que una de las dos reglas funcionara.

### Identidad de la entidad: dos formas de confundir a dos entidades (ago 2026)

- **Un NIT NO identifica a una entidad.** Las regionales y unidades de un mismo organismo publican
  con el NIT de la matriz, así que `nit:{NIT}` puede corresponder a varias. El alias iba **primero**
  en el orden de búsqueda de `competenciaDe`, de modo que una entidad con su nombre bien escrito y
  su propio registro en el índice acababa enseñando el nivel de competencia de su hermana, en
  silencio. Ahora el orden es **clave canónica → clave legado → alias**, y el escritor **no publica
  alias para un NIT compartido** (un alias ambiguo no es un alias: es una respuesta equivocada);
  los cuenta en `indice:competencia:meta.nits_ambiguos`. El alias sigue existiendo para lo que se
  creó: que un cambio de razón social no parta el historial.
- **La puntuación partía una entidad en dos.** `lib/competencia_detalle` tenía DOS claves —
  `claveBusqueda` (sin puntuación) para agrupar el corpus y `claveIndice` (`norm` a secas) para leer
  el hash—, así que «… RIOS NEGRO **-** NARE» y «… RIOS NEGRO NARE» se sumaban al contar y no al
  leer: el detalle enseñaba el promedio de 4 procesos bajo una banda calculada sobre 3. No era un
  error de cálculo: eran **dos definiciones de «entidad» conviviendo**. Ahora hay una sola,
  `claveCanonica` (en `lib/indice_competencia`, importada por el detalle), y el índice agrupa con
  ella. Las dos direcciones no pueden volver a separarse porque no hay dos funciones que mantener.
- **`claveLegado` no se escribe jamás, solo se lee**: el hash de producción está escrito con la
  clave anterior y `indice:competencia` no se purga nunca. Sin ese segundo intento en
  `competenciaDe` y en el detalle, desplegar dejaría **todo** en ⚪ hasta que alguien reconstruyera
  el índice a mano. Mismo criterio que `procesos`/`procesos_contados`.
- **Los fixtures de identidad van por debajo del mínimo de 5 procesos a propósito**: solo entran en
  los tertiles las entidades clasificables, así que así ejercitan la identidad sin recalcular los
  cortes (con 5, IDU dejaría de ser «alta» y media suite se caería). Y el de la puntuación es
  **3 + 1, no 2 + 2**: con el empate, `nombreOriginal` lo decide el orden del corpus y la prueba
  pasaría o fallaría por azar.

### Módulo APU: catálogo e inferencia de ítems (ago 2026)

El «para qué» es la tercera pregunta que la app no sabía responder. Las cuatro puertas dicen
«¿puedo?», `p_ganar` dice «¿me lo llevo?», y faltaba **«¿me deja dinero?»** — hoy la cuantía se
muestra como si fuera ingreso. Diseño completo y plan de la Fase 3 en `docs/APU_Y_RENTABILIDAD.md`.

- **La Fase 1 no estaba en `main`.** El encargo daba por hechos `lib/apu/catalogo.js` y
  `docs/APU_Y_RENTABILIDAD.md`; **no existen en ningún ref** (verificado con `git log --all`). Lo
  que sí había era un `modulo_apu.html` borrado en may 2026, de la app monolítica anterior a la
  reescritura, con la estructura INVIAS/IDU, índices de costo de 32 capitales, tipologías del
  ICOCIV y tres plantillas completas. **De ahí sale el catálogo**, no de cero.
- **Catálogo (98 ítems, 11 capítulos) = DATOS; inferencia = MOTOR.** Misma separación que
  `lib/semantica` (vocabulario) frente a `lib/filtros` (juicio). `catalogo.js` es HOJA del grafo de
  requires: no importa nada del proyecto, así que ningún ciclo puede nacer ahí.
- **`item_id` es la llave estable**: viaja a Redis, al mapeo, al diccionario y a lo que el dueño
  guarde. Se AÑADEN ítems; no se rebautizan. Hay prueba de integridad referencial (todo `item_id`
  citado existe) y de que **ningún ítem es inalcanzable** — uno al que ninguna ruta llega solo
  existe para teclearlo a mano, y entonces no pinta nada en un motor de inferencia.
- **El catálogo es CURADO y hay que decirlo**, como `data/vocabulario_unspsc.json`. No es una
  estadística del histórico. Lo que sí se deriva son TÉRMINOS, y llegan con peso menor.
- **`confianza = 0.7 × especificidad + 0.3 × fuerza_texto`, umbral 0.3 comparado con «≥».** El
  «≥» no es cosmético: con «>», un objeto reconocido SOLO por el término más inequívoco del
  diccionario («placa huella», peso 1) daría exactamente 0.30 y **la ruta de texto entera moriría
  en silencio**, justo en los objetos que el motor mejor entiende. Hay prueba del empate.
- **La especificidad GRADÚA el 0.7** (clase/producto 1, familia 0.9, segmento 0.7). En `lib/unspsc`
  está PROHIBIDO subir al segmento para EMPAREJAR con el RUP porque ahí se decide una
  HABILITACIÓN; aquí solo se SUGIERE, con casillas para desmarcar, así que el segmento se usa
  —igual que `lib/indice_baja` lo usa para AGRUPAR— pero valiendo menos. La diferencia entre las
  dos situaciones es **lo que está en juego**, no el código.
- **La fuerza del texto es un OR RUIDOSO** (`1 − Π(1 − peso)`), no una suma: sumando, seis términos
  de peso 0.2 valdrían más que «alcantarillado».
- **Los términos se escriben como se dicen y se comparan como se tokenizan.** «pozo de inspección»
  se canoniza a `pozo inspeccion`: el tokenizador quita las stopwords y un n-grama del objeto
  JAMÁS contendría el «de». Sin canonicalizar la clave, **toda entrada con preposición sería letra
  muerta** — casaría cero veces y nadie lo notaría. Hay prueba de que ninguna clave compilada
  supera el `maxTokens` con el que se generan n-gramas.
- **CONSECUENCIA DELIBERADA del umbral, escrita para que nadie la «arregle»**: como el techo del
  texto es 0.3 y el umbral es 0.3, **por texto SOLO pasan los términos decisivos (peso 1)** — ni
  dos de peso 0.9 juntos llegan (0.297). Es la misma regla que ya gobierna la ruta de texto del
  juicio del RUP: sin código, el objeto es la única evidencia. Los términos flojos no son
  inútiles: con un código delante aportan sobre esos 0.63-0.7 y mueven el orden. Si algún día se
  quiere que un 0.9 sugiera solo, lo que se mueve es **su peso** (dato, discutible, auditable), no
  el umbral.
- **La CANTIDAD viaja en `null` SIEMPRE**, con `cantidad_sugerida_motivo` al lado. Sin el pliego
  (planos, cantidades de obra, formulario 1) no se puede estimar y `p6dx-8zbt` no lo publica. Es
  `anticipo_pct = 0` y el contador de oferentes otra vez: **un número inventado no se distingue de
  uno medido**. El campo existe para que la ausencia sea una afirmación y no un olvido, y el
  frontend lo pinta «—», nunca 0.
- **El departamento se acepta, se normaliza y se DEVUELVE, pero no cambia los ítems.** La geografía
  cambia lo que las cosas CUESTAN, no lo que hay que ejecutar. Es el gancho de la Fase 3 (índice
  por ciudad del módulo viejo + ICOCIV). Hay prueba de que Amazonas y Bogotá dan lo mismo — dejar
  el parámetro sin usar Y sin decirlo sería decorativo; decirlo es la diferencia.
- **TRES DEFECTOS REALES encontrados sobre el corpus, y las reglas que los cierran son las que YA
  existían.** (1) «PRESTACIÓN DEL SERVICIO DE INTERNET DEDICADO», publicada en el segmento **80**,
  sugería «interventoría» — el 80 está en los RUP porque ahí viven la gerencia y la interventoría,
  el mismo agujero por el que se colaron impresión y alimentos. (2) «ADQUISICIÓN DE CANINOS
  ANTINARCÓTICOS», publicada con un **72141000**, se habría llevado un APU de carretera entero.
  (3) Una **compra pura** con código de bienes («COMPRAVENTA DE TUBERÍA PVC», segmento 40) se
  habría llevado un APU de red de acueducto: el mapeo cubre los segmentos de bienes A PROPÓSITO
  —una obra publicada con un 4017 sí lleva tubería— y ese es el precio.
  Se cierran llamando a `evaluarPertinencia`, `BLACKLIST_OBJETO` y `esSuministroPuro`, **no**
  inventando una segunda definición de «esto no es obra» que divergiría a la primera corrección.
  `BLACKLIST_OBJETO` se aplica sobre texto **CRUDO**, como manda su documentación, y
  `esSuministroPuro` sigue distinguiendo «SUMINISTRO DE TUBERÍA» de «SUMINISTRO **E INSTALACIÓN**
  DE TUBERÍA» sin que haya que tocarlo.
- **Las tres puertas solo corren SI HAY TEXTO.** Con un código a secas no hay objeto que evaluar, y
  tratar esa ausencia como «no pertinente» sería cerrar por ignorancia — justo lo contrario de la
  regla de faltantes de las cuatro puertas.
- **`publicarConocimiento` NO puede reescribir la semilla sobre la tabla que no le pasaron.**
  `?derivar=true` publica solo el diccionario, y con el respaldo en código como valor por defecto
  eso revertía `apu:mapeo_unspsc` a la semilla, borrando en silencio lo que el dueño hubiera
  editado. Contradecía «Redis manda, el código respalda», «lo derivado se MEZCLA, jamás sustituye»
  y la carga parcial del RUP («subir solo Génesis conserva a Helder») — las tres a la vez— y dejaba
  sin sentido el propio mensaje del GET, que invita a editar la tabla en Redis. Ahora lo que falta
  se toma de **lo publicado**, y la semilla solo entra cuando no hay nada. Ídem `derivarDiccionario`:
  deriva sobre lo VIGENTE, no sobre la semilla, o aprendería para un mundo y contestaría en otro.
- **La derivación va en DOS PASADAS, y la primera existe por MEMORIA.** `ítem → (término → n)`
  duplica el vocabulario una vez por ítem mapeado, y un proceso de vía mapea 22: sobre un histórico
  real son millones de entradas y la función se queda sin memoria. **En el corpus de prueba no se
  nota**, que es exactamente por lo que hay que dejarlo escrito. La primera pasada cuenta y poda
  (un término que no llega al soporte mínimo global no puede llegar dentro de ningún ítem), y lo
  que el tope recorta se INFORMA. Lo que la derivación sigue sin tener —presupuesto, reanudación,
  candado— está documentado: es la forma de `/api/admin/cobertura-rup`, y si un día agota los 60 s
  la salida es presupuesto + progreso, no subir el `maxDuration`.
- **Un peso disparatado en el diccionario (0, negativo, `"mucho"`) se DESCARTA y se cuenta**, nunca
  se convierte en 1: 1 es el MÁXIMO, así que un término mal escrito acabaría pesando más que uno
  curado a conciencia. El peso ausente sí vale 1 — es el contrato de la forma abreviada
  `termino: [items]`. Y un término más largo que el mayor n-grama que se genera también se
  descarta: entraría, ocuparía sitio y no casaría JAMÁS, que es la trampa de las preposiciones otra
  vez. Por eso el tope de n-grama es **un solo número** (`MAX_NGRAMA`) y no dos que puedan divergir.
- **Una lista vacía tiene DOS causas y `[]` no las distingue**: el objeto no es de obra (y entonces
  viaja `no_pertinente` con su motivo), o es obra y nada llegó al umbral (viaja `sin_sugerencias`
  diciendo qué hacer). «ADECUACIÓN DE LA SEDE EDUCATIVA» sin código es el caso real: sus términos
  dicen DÓNDE se trabaja, no QUÉ se ejecuta.
- **Redis manda, el código respalda** (`apu:mapeo_unspsc`, `apu:diccionario_terminos`,
  `apu:conocimiento:version`). El motor funciona sin sembrar —el estado de un despliegue nuevo— y
  DECLARA el origen de cada tabla en `conocimiento.origen`. Nunca lanza. Es `PERFILES_FALLBACK`
  otra vez. El sello va AL FINAL y con sufijo aleatorio: dos siembras en el mismo milisegundo
  darían el mismo sello y la segunda pasaría desapercibida (hay prueba).
- **El GET de `/api/apu/inferir` SOLO LEE y hay prueba de que no escribe ni una clave `apu:*`.**
  No se siembra sola al inferir: sería un camino de lectura que escribe. Las tres acciones
  (`?sembrar=true`, `?derivar=true`) viven en el MISMO endpoint porque el que escribe una tabla
  tiene que ser el que la posee — misma decisión que puso la reconstrucción en
  `/api/indice-baja?reconstruir=true` y no en `/api/diagnostico`.
- **Un término derivado del histórico no sabe a qué ítem pertenece: el PUENTE es el código UNSPSC**
  con el que la entidad publicó el proceso. `lift = P(t|ítem)/P(t)` ≥ 2, soporte ≥ 8. Lo derivado
  se MEZCLA con la semilla (nunca la sustituye), pesa menos (0.4 frente a 1) y sube a 0.5 si el
  término también está en `config:experiencia:terminos` — dos fuentes independientes que coinciden
  valen más que una. Un 0 publica su causa (`sin_historico`, `sin_codigos_mapeados`,
  `redis_inaccesible`) con el siguiente paso, como `equivalencias_por_que`.
- **`apu:*` va en la limpieza de `tests/e2e.js`.** Nada lo purga: si una iteración siembra, la
  siguiente arrancaría con el conocimiento ya publicado y las pruebas de «origen: semilla»
  pasarían o fallarían **según el orden de las iteraciones** — la peor forma posible de que una
  suite sea verde.
- **En `public/admin.js` la selección de ítems vive en un `Set` FUERA DEL DOM.** La tabla se
  repinta con `innerHTML` (igual que la de cobertura) y eso borra el estado de las casillas; si
  fueran la única memoria de lo marcado, «Marcar todos» + repintado perdería la selección sin que
  nadie lo notase. Y **no hay handler de clic sobre la fila**: las dos tablas que ya existen usan
  `closest()` sobre la fila entera, lo que aquí chocaría con el clic propio de la casilla.
- **La precisión medida (100 % sobre 5 objetos) es PARCIALMENTE CIRCULAR y así está escrito**: las
  listas de «plausibles» las escribió quien escribió el diccionario. La medida que no es circular
  es la del corpus completo en `g-quinquies`, donde los objetos no los elige la prueba: **384/384**
  objetos de obra con ítems y **0/56** falsos positivos.

## CONOCIMIENTO DE DOMINIO: CONTRATACIÓN PÚBLICA COLOMBIANA

Destilado accionable del **Manual del Analista de Licitaciones** (edición 2026). El manual completo
—21 capítulos, glosario y mandamientos— vive en `docs/GUIA_ANALISTA_LICITACIONES.md`; aquí queda
solo lo que cambia decisiones. **Toda decisión técnica de este repositorio debe estar informada por
este cuerpo de conocimiento**: la app no es un buscador de filas, es una herramienta para decidir a
qué presentarse, y el criterio de «qué es una buena oportunidad» sale de aquí.

### Los 9 errores que descalifican en SECOP II

1. **Guardar la oferta y no darle «Presentar»** — «En creación» al cierre = no existe. *El error #1
   del país.*
2. Cargar el archivo en la **sección equivocada** (precio en carpeta técnica = revelación anticipada).
3. Superar el **límite de peso** por archivo sin verificar.
4. PDF **corrupto o con contraseña**.
5. **Certificado digital vencido**.
6. No responder un **«mensaje» dentro de la plataforma** (los correos externos no cuentan).
7. Dejar **campos del formulario en blanco** porque «ya está en el PDF» — *el formulario prevalece*.
8. Oferta económica en **formato distinto al exigido**.
9. **Empezar a cargar el día del cierre.**

### Habilitante vs. puntaje — la distinción más importante del oficio

| | Habilitantes | Factores de puntaje |
|---|---|---|
| Qué son | Capacidad jurídica, financiera, organizacional, experiencia | Calidad, precio, industria nacional, sociales |
| Efecto | Habilita o rechaza. **No dan puntos** (Ley 1150 art. 5 num. 1) | Ordenan a los habilitados |
| ¿Subsanables? | **SÍ**, hasta el término de traslado | **NO. JAMÁS.** |

**Regla mnemotécnica: NO subsanable = puntaje.** Tener el habilitante «de más» (30 años cuando piden
5) da exactamente **cero** puntos. Tampoco son subsanables: la oferta económica, la **no presentación**
de la garantía de seriedad (sí sus defectos formales), la falta de capacidad, y cualquier
circunstancia **ocurrida después del cierre** (se reexpide un certificado; no se crea un hecho nuevo).

### Los 4 métodos de ponderación económica y cómo se sortea

1. **Media aritmética** — gana el más cercano al promedio de las hábiles.
2. **Media aritmética alta** — promedio solo de las que están por encima de la media.
3. **Media geométrica con presupuesto oficial** — el presupuesto entra como dato más (a veces varias
   veces).
4. **Menor valor** — el más barato se lleva todos los puntos.

**El método NO se conoce antes: se sortea el día de la audiencia con el primer decimal de la TRM.**
Se conocen las reglas del precio *después* de haber presentado el precio. Consecuencia: **tirar el
precio al piso es matemáticamente malo** — gana en 1 de 4 métodos y en los otros 3 te aleja de la
media. El enfoque correcto es **valor esperado**: banda de descuento histórica del ganador frente al
presupuesto oficial en esa entidad (típicamente **5–12 % en obra**), ubicarse donde se gana bajo más
métodos, y verificar que el margen sobreviva. Y ojo con el **precio artificialmente bajo**: la entidad
debe requerir justificación (D. 1082 art. 2.2.1.1.2.2.4) y sin estructura de costos, rechaza.

### Las 12 señales de pliego sastre

1. **Experiencia hiperespecífica** sin razón técnica (cada adjetivo recorta el universo).
2. **Códigos UNSPSC inusuales o excesivamente restrictivos** para el objeto.
3. **Indicadores financieros con precisión rara** (liquidez ≥ 3.7) — los razonables son redondos.
4. **Personal clave con certificación de una sola institución**.
5. **Plazos mínimos legales para todo.**
6. **Adendas técnicas a 24 horas del cierre.**
7. **Marca o especificación de un solo fabricante** sin «o equivalente».
8. **Ficha técnica que solo un distribuidor autorizado entrega.**
9. **Respuestas a observaciones evasivas o copiadas** («se mantiene lo establecido»).
10. **Apertura en fechas estratégicas** (23 dic., Semana Santa, puentes).
11. **Uno o dos oferentes** (uno sin capacidad) en el histórico de esa entidad para ese objeto.
12. **Desviación injustificada de los documentos tipo** (Ley 2022/2020).

**Se detecta por el conjunto, no por la pieza.** Al detectarlo: (A) observar con redacción alternativa,
(B) retirarse temprano —frecuentemente lo correcto—, (C) denunciar. Lo que **no** se hace es
presentarse «a ver qué pasa»: un pliego sastre bien hecho no se gana por insistencia.

### La estructura de una subsanación que funciona

El evaluador tiene 40 ofertas y poco tiempo: **hazle el trabajo**.

1. Referencia del proceso y del oferente.
2. **Cita textual** del requerimiento, entre comillas.
3. Respuesta directa **en una sola frase**.
4. **Tabla de trazabilidad:** `Lo que pidió | Documento aportado | Folio | Dónde queda acreditado`.
5. Documentos **en el mismo orden de la tabla, foliados**.

☠️ Nunca «mejorar» la oferta al subsanar: eso es modificarla → rechazo + constancia en el expediente.
**Responde exactamente lo que te preguntaron, ni una línea más.** Y **subsana proactivamente**: en
cuanto el informe te marque «no cumple», radica sin esperar el requerimiento.

### La estructura de una observación quirúrgica

`Requisito del pliego (numeral + cita textual)` → `Lo aportado por el oferente (folio n.º)` →
`Incumplimiento (el pliego exige A; el documento acredita B)` → `Consecuencia solicitada (declarar NO
HÁBIL / descontar puntaje)` → `Soporte (copia del folio)`.

Con cita textual y folio, **el comité debe motivar por escrito por qué la rechaza**. Sin ellos se
archiva en dos líneas.

**Al proyecto de pliego** (la ventana más poderosa y desaprovechada) la observación se acepta cuando
**le resuelve un problema a la entidad, no a ti**: cita el numeral, explica el **riesgo de declaratoria
de desierta y la restricción de pluralidad**, cita la norma (Ley 1150 art. 5, Ley 80 art. 24, Ley
2022/2020) y **entrega la redacción alternativa lista para pegar** — el comité saturado la copia
literal en la adenda. *No digas «déjenme entrar»; di «así se les puede caer el proceso, y aquí está
el arreglo».*

### Los costos que casi nadie suma

| Concepto | Típico | Nota |
|---|---|---|
| **Contribución especial de obra pública** | **5 %** del contrato | Ley 418/1997. *El olvido más caro del país* |
| **Estampillas** dptales./municipales | 0.5–5 % acumulado | Varían por entidad. **Verificar siempre** |
| Retención en la fuente / ReteICA | 1–11 % / 0.4–1.4 % | Según concepto y municipio |
| Pólizas y garantías | 1–3 % | Según riesgo e historial con la aseguradora |
| **Costo financiero del capital de trabajo** | Variable **y grande** | El Estado paga tarde: 2 % mensual financiando 40 % durante 6 meses ≈ **5 puntos de margen** |
| **Fiducia del anticipo** | — | Anticipo va a patrimonio autónomo (Ley 1474/2011 art. 91): no es plata tuya |
| Ensayos, laboratorios, certificaciones | 0.5–2 % | **No están en el APU** |
| PMA, señalización, SST | 1–3 % | Obligatorios y se olvidan |
| Liquidación, actas, cierre | 0.5 % | El contrato no termina cuando termina |

Sobre el **AIU**: A 12–20 %, I 3–5 % (**es seguro, no utilidad**), U 5–10 %. **Regla no negociable:
flujo de caja mes a mes ANTES de fijar el precio.** Si el acumulado se hunde: anticipo, subir precio,
o no presentarse.

### La regla de las 24 horas

**Cargar y presentar el día anterior al cierre.** SECOP II permite retirar y modificar cuantas veces
se quiera hasta la hora exacta; presentar temprano no revela nada. **El cierre de las 3:00 p.m. es la
hora en que más ofertas mueren en Colombia** (internet, luz, servidor congestionado). Y **pantallazo
con reloj** mostrando el estado «Presentada»: sin evidencia, la palabra no vale nada ante el expediente.

### Fuentes de inteligencia anticipada

| Fuente | Qué da | Cuándo |
|---|---|---|
| **PAA en SECOP II** | Objeto, valor, mes previsto y modalidad de todo el año | **31 de enero** |
| **Plan de Desarrollo** | Metas que la entidad debe cumplir → **predice el PAA del año entrante** | Cada 4 años |
| **Presupuesto aprobado** | Plata por rubro; confirma o desmiente el PAA | Diciembre |
| **Histórico SECOP** | Quién ganó, a qué precio, con qué descuento, con qué consorcio | Permanente |
| **Estudios del sector** | El análisis de mercado de la propia entidad | Con el proyecto de pliego |
| **Informes de la Contraloría** | Qué le criticaron → **predice qué requisitos endurecerá** | Anual |

**El PAA da seis meses de ventaja** sobre una competencia que se entera el día del aviso y tiene 20
días. Es un documento público que casi nadie lee.

### Consorcio vs. Unión Temporal

Ambos (Ley 80 art. 7): **responsabilidad solidaria total**, sin personería jurídica, con NIT fiscal, y
**suman experiencia y capacidad**. Diferencia única: las **sanciones** — en UT según el porcentaje
declarado; en consorcio, **a todos por igual**.

☠️ **Errores mortales:** (1) documento sin firmas de todos los R.L.; (2) sin autorización de junta
cuando el monto supera las facultades del R.L.; (3) **porcentajes que no suman 100 %**; (4) **el que
aporta la experiencia con participación por debajo del mínimo del pliego** (a menudo 30–40 %) — el
pliego la desconoce entera; (5) **un integrante inhabilitado contamina al consorcio completo**.

**Due diligence de 20 minutos** antes de firmar: SIRI (Procuraduría), boletín de responsables fiscales
(Contraloría), antecedentes judiciales (Policía), **RNMC**, e histórico en SECOP (incumplimientos,
multas, caducidades). Todo público y gratis. Se reparte por **quién aporta lo que el pliego necesita**,
no por quién pone más plata.

### Factores de desempate (Ley 2069/2020, art. 35) — 13 criterios sucesivos

Nacionales → MIPYME → cooperativas → **discapacidad (≥10 % de la nómina)** → mujeres cabeza de familia
y población vulnerable → emprendimientos de mujeres → población indígena/negra/afro/raizal/palenquera/
Rrom → jóvenes 18–28 → … → **sorteo por balotas**.

Con documentos tipo los puntajes están comprimidos y **los empates son frecuentes**: acreditar todos
los criterios que legítimamente se cumplan es *la póliza más barata del oficio*.

### El traslado como inteligencia competitiva gratuita

Términos: **licitación 5 días hábiles · selección abreviada y concurso de méritos 3 · mínima cuantía
1**. Durante el traslado se hacen **tres cosas a la vez**: subsanar lo propio, revisar lo ajeno,
observar el informe.

**Todas las ofertas de todos los competidores son públicas y descargables.** Aunque se pierda el
proceso, quedan: precio exacto y % de descuento de cada uno, su estructura de costos si hubo APU
desagregado, **sus certificaciones de experiencia** (el mapa de qué contratos tienen y con quién), su
composición de consorcio, sus indicadores y **qué les faltó**. En dos años eso es una base de datos de
la competencia que ninguna consultora vende — y **el 95 % de los oferentes nunca la descarga**.

### Verdades procesales que ahorran dinero

- **Contra la adjudicación NO procede recurso** (Ley 1150 art. 9): es irrevocable. La vía es judicial
  (CPACA arts. 138/141), previa conciliación, caducidad **4 meses**, y **no devuelve el contrato**:
  indemniza, años después. *El 90 % de las veces lo racional es documentar, aprender y ganar el
  siguiente.* **La denuncia administrativa (Procuraduría/Contraloría/SIC) mueve más que la demanda.**
- **Sí procede reposición** contra: declaratoria de desierta (Ley 80 art. 30-11), actos sancionatorios
  (Ley 1474 art. 86) y actos definitivos sin norma especial. **10 días hábiles** (CPACA art. 76).
- **El rechazo de la oferta** es acto de trámite: se ataca con el definitivo. Por eso **las
  observaciones al informe son la única oportunidad real** de corregir el rumbo.
- **Post-adjudicación:** sin aprobación de garantías no hay acta de inicio; **el plazo corre desde el
  acta, no desde la firma** — no movilizar antes, y **no firmarla si la entidad no entregó predio,
  diseños, licencias o permisos** (dejar constancia escrita). Adición ≤ **50 %** del valor inicial en
  SMMLV; la prórroga no tiene ese límite. **Firmar el acta de liquidación sin salvedades cierra la vía
  judicial para siempre.** Documentar cada hecho **el día que ocurre**.
- **La ética aquí es aritmética, no moral:** el analista es quien firma y queda en el expediente; la
  sanción por colusión (C.P. art. 410A) es prisión, multa SIC de hasta 100.000 SMLMV a la empresa y
  2.000 al individuo, e **inhabilidad de hasta 20 años** = cierre. Regla de oro del contacto:
  **«¿me incomodaría que esto se publicara?»** Si sí, no se hace. Canal formal siempre.

### Los 20 mandamientos del analista

1. Cargar la oferta **el día anterior** al cierre. Siempre.
2. Verificar que el estado diga **«Presentada»**, no «En creación».
3. Leer **las causales de rechazo** antes que cualquier otra cosa.
4. Separar la carpeta en **pila de puntaje** (paranoia triple) y **pila habilitante**.
5. Descargar el **PAA en febrero** y armar el calendario del año.
6. Renovar el **RUP** antes del quinto día hábil de abril.
7. Observar el proyecto de pliego con **redacción alternativa lista para pegar**.
8. Nunca prometer un **personal clave** que no está vinculado.
9. Verificar los **antecedentes del socio** de consorcio antes de firmar.
10. Sumar **la contribución del 5 %** y las estampillas. Siempre.
11. Hacer el **flujo de caja mes a mes** antes de fijar el precio.
12. Responder la subsanación con **tabla de trazabilidad** y ni una línea de más.
13. **Descargar todas las ofertas** de los competidores en cada traslado.
14. Acreditar **todos los factores de desempate** que legítimamente se cumplan.
15. **No firmar el acta de inicio** si la entidad no entregó lo suyo.
16. **Documentar cada hecho el día que ocurre**, con foto y radicado.
17. **Nunca firmar el acta de liquidación sin salvedades.**
18. **Canal formal siempre.** Si incomodaría que se publicara, no se hace.
19. Hacer el **postmortem** de cada proceso, ganado o perdido.
20. Mantener la **tasa de rechazo por forma en cero**. Es lo único que depende enteramente de ti.

### APLICACIÓN EN EL PROYECTO

Mapeo explícito manual → código, **con estado real verificado contra el repositorio** (ago 2026). El
estado importa tanto como el mapeo: escribir aquí que algo «ya está» cuando no está convertiría esta
memoria en una fuente de error. `✅` implementado · `🟡` parcial · `⬜` no existe (propuesta).

| Concepto del manual | Qué hay hoy en la app | Estado |
|---|---|---|
| **Modalidades de selección** (Cap. 3) | `MODALIDADES_COMPETITIVAS` / `MODALIDADES_EXCLUIDAS` en `lib/filtros.js` reproducen exactamente la tabla del manual: licitación, selección abreviada, subasta, concurso de méritos, mínima cuantía, acuerdo marco dentro; **contratación directa fuera** (no hay concurso) | ✅ |
| **Convenios no son licitaciones** | `es_convenio` (Ley 489/1998 arts. 95-96): «aunar esfuerzos» y convenio interadministrativo al encabezar el objeto | ✅ |
| **RUP = pasaporte; UNSPSC a nivel de clase** (Cap. 5) | `lib/unspsc.js` compara por **jerarquía leyendo el nivel** del código; los 393 códigos de los RUP terminan en «00» (inscripción por clase) y hay prueba que lo vigila. `/api/admin/rup` carga el RUP con efecto inmediato | ✅ |
| **Renovar el RUP antes del 5.º día hábil de abril** (mandamiento 6) — *con qué códigos* | `/api/admin/cobertura-rup` cruza el histórico adjudicado con la whitelist del perfil y devuelve los códigos faltantes priorizados por similitud con la experiencia REAL (`/api/admin/experiencia`). El manual dice *cuándo* renovar; esto responde *con qué* | ✅ |
| **Capacidad residual K** (Guía CCE-EICP-GI-22) | `lib/capacidad.js`: `CRP = CO × (E+CT+CF)/100 − SCE`, `CRPC` con anticipo y plazo (D. 1082 art. 2.2.1.1.1.6.4). **K del plural = suma de las CRP**, indicadores habilitantes 50/50 — las dos reglas distintas del Cap. 10/11 | ✅ |
| **Nicho incómodo / menos competencia > más puntaje** (truco #22, Palanca 4) | `ordenar_por=atractividad` (default) + `lib/indice_competencia.js`: tertiles sobre el promedio de oferentes por entidad. Es literalmente la tesis de la Palanca 4 en código. `topeSMMLV` es apetito estratégico, no límite del RUP | ✅ |
| **Anticipo y flujo de caja** (truco #16) | `lib/negocio.js` pondera anticipo al 0.4 del `puntaje_ponderado` — el manual explica **por qué** pesa tanto: sin anticipo se financia al Estado. **`anticipo_pct = 0` sigue significando «sin dato»**, no «sin anticipo» | ✅ |
| **Traslado / histórico como base de datos** (truco #17) | `licitaciones:historico:mes:*` — keyspace que **ninguna purga toca**, con adjudicatario, valor adjudicado y nº de oferentes. Es la versión estructural del consejo «guarda todo lo del traslado» | ✅ |
| **PAA → alertar antes de que salga el proceso** (truco #9) | La app ingiere **solo `p6dx-8zbt`** (procesos ya publicados). El PAA es otro dataset y **no se lee**. Hoy la app avisa cuando el proceso ya salió: la ventaja de seis meses del manual está sin explotar | ⬜ |
| **Pliego sastre → detección** (12 señales) | La única señal computable hoy es la **#11** (histórico de 1-2 oferentes), vía `indice_competencia`. **Y está interpretada al revés**: baja competencia se presenta como *atractiva*. Es ambigua — puede ser un nicho ganable **o** un pliego sastre. Las señales 1/3/4/5/6/7 exigen el texto del pliego, que el dataset no trae. **El tier `familia` NO es la señal #2**: indica codificación amplia, lo contrario de restrictiva | 🟡 |
| **Precio bajo incertidumbre → banda de descuento** (truco #11) | **No existe, pero el dato ya está guardado**: `lib/proyeccion.js` (proyección histórica) conserva `CAMPOS_VALOR_ADJUDICADO` junto a `precio_base`, así que `descuento = 1 − valor_adjudicado / precio_base` es calculable por entidad **sin re-extraer nada**. Es la funcionalidad nueva de mayor rendimiento por esfuerzo | ⬜ |
| **Traslado → descargar ofertas de competidores** | El dataset no trae documentos de oferta: solo `urlproceso`. Automatizarlo exigiría raspar SECOP II (fuera de la arquitectura actual: sin dependencias, serverless, respuesta ≤4.5 MB). Alcanzable: enlazar la ficha del proceso y **listar adjudicatarios recurrentes por entidad** desde el histórico | ⬜ |
| **Subsanación → tabla de trazabilidad automática** | No existe. La app decide **a qué presentarse**, no arma la carpeta. Sería un generador de plantilla a partir de la ficha del proceso | ⬜ |
| **Consorcios → antecedentes del socio (SIRI/Contraloría/RNMC)** | No existe y **no es automatizable con datos abiertos**: son portales con captcha, no APIs. Lo que sí está: el consorcio `juntos` se **re-deriva siempre** de sus integrantes. La parte accionable sería una **lista de verificación** de las 5 fuentes del truco #15 | ⬜ |
| **APU: qué ítems lleva la obra** (Cap. 11, estructura INVIAS/IDU) | `lib/apu/catalogo.js` (98 ítems, 11 capítulos) + `lib/apu/inferencia.js`: del objeto contractual a los ítems de su APU, con confianza y motivos. `POST /api/apu/inferir` y panel en `/admin.html`. **La cantidad va en `null` siempre**: sin el pliego no se puede estimar | ✅ |
| **Costos ocultos → calculadora de rentabilidad** | **Sigue sin existir.** Hoy la cuantía se muestra como si fuera ingreso, y faltan los 10 conceptos del Cap. 11 empezando por la **contribución del 5 %** y las estampillas. Lo que ya está es el paso previo: los ítems (Fase 2) y la banda de descuento (`lib/indice_baja`). Falta el precio unitario y la resta — plan en `docs/APU_Y_RENTABILIDAD.md` § 5 | 🟡 |

### Investigación de contraste (ago 2026) — correcciones al manual y hallazgos verificados

Detalle, fuentes y temas pendientes en `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`. Aquí solo lo que
cambia una decisión. **Advertencia de método:** este entorno recibe **403 en `datos.gov.co`,
`colombiacompra.gov.co`, `relatoria.colombiacompra.gov.co`, `dev.socrata.com` y `funcionpublica.gov.co`**
— varios hallazgos se apoyan en fuentes secundarias y están marcados en el complemento. No usar una
cifra de aquí en un pliego sin abrir la fuente.

- **DOS CORRECCIONES AL MANUAL.** (1) **Salvedades**: el manual afirma que firmar sin salvedades cierra
  la vía judicial *siempre*. El Consejo de Estado **unificó** (Sección Tercera, 27 jul 2023) que su
  ausencia al pactar **suspensiones, prórrogas o modificaciones NO impide** reclamar; la exigencia
  legal opera en la **liquidación bilateral**, y ahí la salvedad debe ser **concreta y específica**
  (una genérica no sirve). Se conserva la conducta, se corrige la razón. (2) **Anticipo**: hay **techo
  legal del 50 %**, la fiducia **no** aplica a menor ni mínima cuantía, y **anticipo ≠ pago
  anticipado** (el segundo entra al patrimonio del contratista desde el desembolso y no se amortiza).
- **Las cifras retóricas del manual no son datos.** «El 40 % de los procesos se define en el
  traslado», «el 95 % nunca descarga las ofertas», «el 90 % de las reclamaciones se pierden», «el
  80 % de los procesos amañados»: **no tienen fuente y no se encontró ninguna**. No calibrar nada con
  ellas.
- **🚩 El ciclo electoral contamina `indice_competencia` y no está modelado.** Ley de garantías 2026:
  convenios interadministrativos bloqueados desde el **8 nov 2025**, contratación directa desde el
  **31 ene 2026**, ambos hasta el **31 may 2026** (21 jun con segunda vuelta). Durante esa ventana las
  entidades **tuvieron que competir**, así que hay un pico de procesos y probablemente más oferentes.
  El promedio de 2 años sobre el que ordena `ordenar_por=atractividad` **mezcla ese período con
  períodos normales sin saberlo**, y el backfill (`?desde=2024-01`) no tiene ningún tramo «limpio».
  Mitigación barata: exponer el reparto temporal en `/api/competencia-detalle` (el modal ya enseña qué
  procesos cuentan). Cara y mejor: segmentar el índice por período.
- **El estado `Activo` faltaba en `ESTADOS_ABIERTOS` — CORREGIDO (ago 2026).** La enumeración
  documentada de `estado` de `p6dx-8zbt` es **Activo · Adjudicado · Desierto · Celebrado**, y `fase` es
  **Planeación · Selección · Evaluación · Adjudicación · Contratación · Ejecución**. «activo» no
  estaba en ninguna de las dos listas y, con la regla «desconocido = CERRADO», **todo proceso
  publicado con ese literal se descartaba EN SILENCIO** — y no lo salvaba la fase, porque «Selección»
  tampoco figura. Ya está añadido, con prueba. **Es seguro porque en `estado_abierto` los cerrados
  ganan siempre**: `Activo` + fase `Adjudicación`, o `adjudicado="Si"`, sigue cerrado (hay caso de
  prueba de las dos cosas), y un estado de verdad desconocido sigue contando como cerrado.
  ⚠️ **Exige relanzar `/api/sync?modo=full` UNA vez**: el filtro de estado corre en la INGESTA
  (`lib/proyeccion.transformar` excluye los no abiertos de origen), así que esos procesos **nunca
  entraron a Redis** y ninguna consulta los recupera sola. Es la excepción a «afinar el juicio tiene
  efecto inmediato»: esto no es juicio, es ingesta.
  **Queda un hueco menor, deliberadamente sin tocar**: un proceso con `estado` vacío y solo
  `fase="Selección"` sigue contando como cerrado. Meter «seleccion» en la lista haría que
  «Seleccionado» pasara a abierto por prefijo — que es justo el choque que el código ya advierte. Si
  el embudo de `/api/diagnostico` muestra volumen muriendo ahí, resolverlo exige mirar el dato real
  primero.
- **La CCE confirma que las entidades comparten NIT.** El equipo de analítica de la propia agencia
  advierte que «no hay bases maestras de entidades y proveedores; las entidades pueden compartir NIT
  entre departamentos». La corrección de identidad de ago 2026 (no publicar alias para NIT compartido;
  orden canónica → legado → alias) **era el problema conocido del dataset**, no una precaución
  excesiva. Misma fuente: los campos de fecha «tienen en general muchos valores nulos» — coherente con
  la detección defensiva de `fecha_cierre`.
- **La banda de descuento son DOS métricas, no una.** `p6dx-8zbt` da `precio_base` y
  `valor_total_adjudicacion` → **descuento en la adjudicación** (lo que sirve para fijar precio). El
  **valor realmente pagado**, después de adiciones, vive en **otro dataset**: `jbjy-vk9h` (Contratos
  Electrónicos). No mezclarlas: una predice cómo se gana, la otra cómo se ejecuta. Otros IDs útiles:
  `qmzu-gj57` (proveedores), `rpmr-utcd` (SECOP integrado). Límites de la API: **~1.000 pet./hora con
  App Token** (~100 sin él), **200 filas por petición**, y el dataset tiene **59 campos**.
- **Documentos tipo: tienen VERSIÓN, y cambió.** Resolución **539 de 2025** adopta la **v.2** de obra
  pública de **infraestructura social** para avisos publicados **desde el 16 feb 2026**: amplía a
  **Institucional y Vivienda**, rediseña las fórmulas de experiencia y actualiza los requisitos
  financieros. Transporte va por su propia línea (**v.4**, Res. 465 de 2024). Un pliego que sigue la
  versión vieja está **desactualizado**, que no es lo mismo que ser un pliego sastre (señal #12).
- **Valores de referencia que hacen operable la señal #3**: liquidez **≥ 1.2**, endeudamiento
  **≤ 65 %**, cobertura de intereses **≥ 2**; el RUP verifica sobre los **últimos 3 años fiscales**
  (por eso un mal cierre contamina tres, no uno). Con esto, «liquidez ≥ 3.7» es *más del triple* del
  estándar y el argumento de pluralidad se escribe con cifras.
- **Precios unitarios vs. precio global es la variable de riesgo que el manual omite.** En global el
  riesgo de cantidades es del contratista y **no se reconocen mayores cantidades**; en unitarios las
  cantidades del pliego son **un estimativo** y las mayores cantidades ordenadas **deben reconocerse**.
  Y una **mayor cantidad NO es una adición** (adición = ampliación del alcance físico), así que **el
  tope del 50 % del art. 40 de la Ley 80 no la limita**. Alcanzable en la app: detectar «a precio
  global» / «a precios unitarios» en el objeto y etiquetarlo en la tarjeta.
- **Reajuste de precios (ICOCIV del DANE, sucesor del ICCP)**: en un año con **SMMLV +23 %**, un
  contrato sin cláusula de reajuste que cruza diciembre pierde margen por construcción. La app ya
  normaliza el plazo (`plazoMesesDe`): es el disparador natural de una alerta.
- **Inhabilidad por incumplimiento reiterado** (no está en el manual): **5 multas**, o **2
  declaratorias de incumplimiento**, o **2 multas + 1 incumplimiento** en el **mismo año fiscal** →
  **3 años** de inhabilidad desde la inscripción en el RUP. Convierte «negociar una multa» en decisión
  estratégica y da criterio cuantitativo al due diligence del socio (truco #15).
- **Contribución del 5 %**: base = valor total **sin impuestos**; **aplica también a las adiciones**;
  es **permanente** (art. 8 Ley 1738/2014 sobre art. 120 Ley 418/1997 mod. Ley 1106/2006) — ignorar
  artículos que digan «vigente hasta este año».
- **Cifras 2026 verificadas contra fuente externa**: SMMLV **$1.750.905** (coincide con el valor del
  repositorio); umbral MiPyme **$511.708.497**. 🚩 El alza del 23 % se fijó por decreto sin acuerdo y
  **está en litigio ante el Consejo de Estado**: una anulación movería **todos** los umbrales en SMMLV
  de la app a la vez (`SMMLV`, `topeSMMLV`, factor E).
- **Lo que NO se encontró, dicho explícitamente**: tasa de procesos desiertos en obra, volumen anual de
  procesos de obra, promedio de oferentes por cuantía y tasa de adiciones **no están publicados en
  fuentes accesibles**. Pero **la app ya tiene la mejor fuente para casi todo eso**: su propio
  `licitaciones:historico:mes:*`, que ninguna purga toca. Calcularlas en casa, no buscarlas afuera.

**Cuatro consecuencias de diseño que se derivan del manual y que no hay que re-discutir:**

- **La app juega en las etapas 1-9 del ciclo, no en las 10-14.** Decide a qué presentarse. Todo lo de
  traslado, subsanación, audiencia y ejecución es contexto para *elegir mejor*, no funcionalidad
  pendiente — salvo lo que se declare explícitamente arriba.
- **Baja competencia es ambigua y hay que decirlo en pantalla.** El manual sostiene las dos lecturas:
  nicho rentable (Palanca 4) **y** señal #11 de pliego sastre. Un badge que solo diga «⭐ poca
  competencia» está afirmando una de las dos sin evidencia.
- **Un habilitante «de más» no da puntos.** No tiene sentido puntuar en la app «cuánto sobra» de
  experiencia o de K: para el pliego eso vale cero. Lo que importa es el **pasa/no pasa** (por eso el
  veredicto es graduado por tier + pertinencia, no una nota).
- **El falso negativo cuesta más que el amarillo.** Es la regla de pertinencia ya vigente, y el manual
  la respalda por el otro lado: el recurso escaso es **el tiempo del equipo** (Palanca 3, opción B), no
  la lista de resultados. Un 🟡 se descarta en 5 s; una oportunidad que la app nunca mostró no se
  recupera.

## Datos del negocio (fuente de verdad)

- Perfiles: `lib/perfiles.js` es el RESPALDO (`PERFILES_FALLBACK`, RUP corte 31/12/2025) y el punto
  de aplicación de lo que el dueño cargue por `/api/admin/rup` (validación en `lib/config_rup.js`).
- Experiencia REALMENTE ejecutada en `lib/experiencia.js` (`config:experiencia` + su vocabulario);
  la auditoría de huecos del RUP, en `lib/cobertura_rup.js`. Ninguna de las dos toca la ingesta.
- Índice de competencia por entidad en `lib/indice_competencia.js` (hash `indice:competencia`,
  tertiles sobre el promedio de oferentes de 2 años); alimenta `ordenar_por=atractividad`.
- Perfiles y finanzas reales en `lib/perfiles.js` (fuente única en código; RUP corte 31/12/2025;
  el archivo que cargue el dueño manda sobre estos valores) — Génesis
  es persona jurídica SAS; fórmula K única en `lib/capacidad.js`; REGLAS (estado, modalidad,
  convenios, prefiltro de ingesta, cascada de juicio, pertinencia, anti-suministro) en
  `lib/filtros.js`; whitelists UNSPSC + motor de matching jerárquico en `lib/unspsc.js`
  (193/343/393, la unión se calcula); VOCABULARIOS en `lib/semantica.js`; equivalencias aprendidas
  en `lib/equivalencias.js`; co-señal de texto en `lib/texto_unspsc.js` +
  `data/vocabulario_unspsc.json`.
  Resumen técnico en `docs/PERFILES.md`. SMMLV 2026 = $1.750.905.
- Las CUATRO PUERTAS en `lib/puertas.js` y `P(ganar)`/VE en `lib/probabilidad.js`; el diseño y por
  qué, en `docs/ATRACTIVIDAD.md`.
- Ítems de obra y motor de inferencia APU en `lib/apu/` (`catalogo.js` = datos curados,
  `inferencia.js` = motor y persistencia `apu:*`); diseño, precisión medida y plan de la Fase 3
  (precios, ICOCIV, rentabilidad) en `docs/APU_Y_RENTABILIDAD.md`. Ninguno toca la ingesta.
- `autorizacion_helder.md`: constancia de autorización de datos personales (plantilla).
- Clave del sitio: `231105` (gate del cliente, en `public/app.js`). **No protege la API**: es una
  cortesía del navegador. La protección de servidor es `HISTORICO_TOKEN` (`lib/auth.js`) —que desde
  ago 2026 exige TAMBIÉN `/api/oportunidades`— y, encima, Vercel Password Protection. No debilitar
  ninguna de las dos sin permiso del dueño.

### Puertas, probabilidad y valor esperado (ago 2026)

- **`/api/oportunidades` tiene el token OPCIONAL, y es el ÚNICO endpoint así** (ago 2026). Los
  clientes entran por la web pública a ver a qué presentarse: exigirles credencial dejaba la
  herramienta inservible para ellos. Lo que no puede salir sin llave son las CIFRAS del perfil
  —`k_cop`, `crpc_cop`, `tope_cop`, `co_estimado`, `p2_k.{crp,crpc,tope}` y `p3_caja.patrimonio`,
  todas derivadas del patrimonio, la utilidad operacional y la liquidez de una persona natural
  identificada por nombre completo—. Sin token viajan en `null` y la respuesta declara
  `finanzas_visibles:false`; con token vuelven. Un token PRESENTE pero inválido da **401**, nunca
  degradación silenciosa: quien se molestó en mandarlo tiene que enterarse de que está mal.
- **Redactar campos NO basta: los MENSAJES llevaban las cifras dentro.** `p2_k.mensaje` decía
  «…(CRPC $324M / K $5.799M)» y `p3_caja.mensaje` «…su patrimonio es $211.340.888». Anular los
  campos y dejar el texto habría sido una redacción de mentira. `lib/publico.js` sustituye los dos,
  y la prueba **serializa la respuesta pública entera y busca las cifras reales de los perfiles**
  (crudas, con separadores de miles y en millones): si alguna aparece, falla.
- **Queda un canal de INFERENCIA y es deliberado.** El booleano de cada puerta sigue viajando —sin
  él la app no sirve— y `p3_caja.pasa` es `patrimonio ≥ cuantía × 0,20`: con muchos procesos de
  cuantías distintas se puede acotar el patrimonio por bisección. Es el límite real de publicar el
  veredicto sin credencial, no un descuido. Si algún día pesa más que la utilidad, la salida no es
  redactar mejor: es volver a exigir token.
- **Lo derivable de datos PÚBLICOS se conserva**: `financiacion_requerida` sale de la cuantía
  publicada × 0,20. Ocultarlo no protegería nada y quitaría información que el cliente puede
  recalcular con la ficha del proceso.
- **Los DEMÁS endpoints no se relajaron**: `/api/diagnostico`, `/api/resumen`,
  `/api/competencia-detalle`, `/api/admin/rup` y `/api/sync/historico` siguen exigiendo el token, y
  hay prueba de los cuatro primeros. En el frontend el formulario del token **sobrevive solo** para
  el detalle de competencia (acción explícita del dueño); `buscar()` no puede volver a pedirlo, y
  hay prueba que lo prohíbe.
- **Una suma ponderada es COMPENSATORIA, y aquí compensar es un error de categoría.** Por eso
  `puntaje_ponderado` dejó de ser criterio de decisión: no poder financiar una obra no se compensa
  con cuantía alta. Lo sustituyen cuatro puertas + `p_ganar` + `ve`, que NO se promedian entre sí.
  **El campo SIGUE viajando en la respuesta** aunque la tarjeta no lo pinte: es lo que permite el
  A/B por URL (`ordenar_por=puntaje` contra el orden nuevo) para promover el orden nuevo con
  evidencia en vez de por decreto, y `/api/resumen` lo calcula — dos consumidores del mismo campo no
  pueden discrepar sobre si existe. Hay prueba de que sigue presente.
- **`pasa_rup_y_k` se publica aparte de `pasa_todas`**: es la categoría «técnicamente viable aunque
  financieramente ajustado» (el objeto es suyo y la K alcanza, pero la caja no llega). No es un
  proceso a descartar: es uno que habría que financiar con anticipo, crédito o consorcio. Esa
  distinción es una decisión de negocio, no un filtro, y por eso no se colapsa en un booleano.
- **P3 · CAJA es la puerta que de verdad ata, y no necesitó un dato nuevo**: `patrimonio ≥
  (cuantía − anticipo) × 0,20`, con `precio_base` y `duracion`, que ya se proyectan. Génesis
  (patrimonio $211 M) ante un proceso de $3.100 M tendría que financiar ~$620 M — y lo veía con
  «Capacidad K ✓» en verde, porque el K del RUP mide HABILITACIÓN, no capacidad de financiar.
  En plural el patrimonio se SUMA (el ponderado 50/50 es para indicadores habilitantes) y cada
  integrante responde por el 100 % (Ley 80/1993 art. 7).
- **P4 · COMPETENCIA nunca bloquea**: informa. De penalizar ya se encarga `p_ganar`.
- **Regla de faltantes**: un dato ausente no vale 0 ni 1 — la puerta marca `sin_dato` y DEJA PASAR.
  Cerrar por ignorancia esconde oportunidades y el usuario no puede ni enterarse. Corolario ya
  verificado: sin `precio_base`, `evaluarRup` devolvía `capacidad_ok:true` con `crpc_cop:0` (porque
  `factorE` da 120 «sin presupuesto no hay ratio» y `0 ≤ K`) — chip verde sobre la nada.
- **La probabilidad viaja SIEMPRE con su fuente** (`entidad` → `departamento` → `conservador` = 5
  rivales, `P = 1/6`). «Histórico de la entidad» no es lo mismo que «supuesto», y enseñar el 17 %
  sin decir de dónde sale convierte una estimación en una promesa. Los cuatro factores de ajuste son
  SUPUESTOS CON NOMBRE, no coeficientes ajustados: no hay etiqueta contra la que calibrarlos.
- **La PRÓRROGA DEL CIERRE es la única señal de competencia observable ANTES del cierre.** El
  contador de oferentes es ex-post: en un proceso abierto vale 0 por construcción, y como
  `nivelCompetencia(0) = "baja" = 100`, ese componente del viejo puntaje era constante en todo lo
  servido. La prórroga sale gratis del dedup de lectura, que ya recorre todas las versiones de cada
  `_k` (`lib/almacen.leerChunksDedup`, bandera `senales` — bajo bandera para no tocar a
  `/api/resumen` ni al histórico, que leen por la misma función).
- **`solo_viables=true` es el default y NO es lo mismo que `filtrarProcesosVisibles`**: la puerta de
  caja es posterior a la cascada, así que el listado sirve menos que `totales.visibles` del panel.
  Está dicho en el `como_leerlo` de `/api/resumen`; si alguien vuelve a igualarlos, mentirá.
- **«No viable» ≠ «no es de este negocio»**: `retenerNoViables` solo devuelve lo que falla por una
  razón que el dueño puede leer y discutir (clase fuera del RUP, capacidad insuficiente). Un
  proceso de software o un convenio no vuelven — devolverlos inundaría la lista con exactamente el
  ruido que quitó la cascada de pertinencia.
- **El diagnóstico también publica las puertas**, y la invariante que las ata a la app cambió de
  forma. Antes era «`embudo.visibles` == `total` de /api/oportunidades»; con `solo_viables`
  encendido por defecto eso solo se cumplía **por casualidad**, mientras ningún proceso fallara una
  puerta. La relación exacta es **`embudo.visibles = viables + distribucion_puertas.fallan_p3`**, y
  además `distribucion_puertas.pasan_todas` tiene que ser el `viables` de la app. Hay prueba de las
  dos: si divergen, hay dos cálculos de puertas y ninguno de los dos endpoints sirve para verificar
  al otro.
- **Las puertas van ANIDADAS en el embudo (`embudo.puertas.*`), no sueltas.** El embudo es una
  CASCADA con invariante probada de que los `fuera_*` más `visibles` suman el total; las puertas
  corren DESPUÉS, sobre los visibles, y un mismo proceso puede fallar dos a la vez. Sumarlas con el
  resto rompería la invariante y daría a entender que un proceso se pierde dos veces.
- **`fallan_p1` y `fallan_p2` son SIEMPRE 0 en el diagnóstico, y no es un fallo**: la cascada ya
  descartó antes lo que no es del RUP y lo que excede la capacidad, así que entre los visibles esas
  dos puertas no pueden cerrar. La que filtra de verdad en esa posición es **P3**. Hay prueba de las
  dos igualdades para que nadie «arregle» un cero que es correcto.
- **El corpus de prueba trae un fixture dedicado a P3** (puente de 2.500 M, sin anticipo, obra en
  ambos RUP): pasa objeto, K y tope, así que llega vivo hasta la caja, y ahí **cierra para Génesis
  (211 M) y abre para Helder (1.107 M)**. Sin él, P3 solo se probaba con objetos sintéticos y la
  suite pasaba verde sin que ningún proceso del corpus ejercitara la puerta nueva a través del
  endpoint. Es además la prueba de que la puerta depende del PERFIL, no del proceso.

## Convenciones

- Español en UI, comentarios y commits. Estética tipo Apple (Tailwind CDN, sobrio, claro).
- Sin dependencias de pago; sin npm salvo necesidad justificada.
- Preferir cambios pequeños y directos sobre el código actual — la era de las «capas aditivas»
  con monkey-patch terminó con la reescritura.
