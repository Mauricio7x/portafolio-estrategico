
# CLAUDE.md

**Al iniciar cada sesión, lee `docs/GUIA_ANALISTA_LICITACIONES.md` para comprender el dominio del
proyecto.** Y `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`, que audita el manual, **corrige dos cosas
que dice mal** y trae lo verificado en 2025-2026 (documentos tipo v.2, ley de garantías, dataset).
Para todo lo de precios y costeo, `docs/APU_Y_RENTABILIDAD.md` (fuentes recuperadas, qué es dato y
qué es estimación, y qué NO cubre todavía el catálogo).

Memoria del proyecto para Claude Code. Si retomas el trabajo, lee primero `README.md`
(arquitectura, endpoints, claves Redis, reglas de negocio) y vuelve aquí para el contexto.

## Qué es

**Detekta**: app privada para decidir a qué licitaciones de obra civil presentarse en Colombia.
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
  reales). No hay CLI de Vercel: el despliegue se valida desplegando.
  ⚠️ **«Este entorno no alcanza `datos.gov.co`» ERA FALSO y costó dos fuentes.** Se repetía en tres sitios
  del manual y por eso nadie volvía a intentarlo; en ago 2026 se comprobó que `datos.gov.co` responde **200
  con datos reales** y que `invias.gov.co` también (la URL que se usaba daba 404 porque el sitio se
  reorganizó, no porque bloqueara). Sigue bloqueado `contratos.gov.co` (**403**). Evidencia y URLs buenas en
  `docs/APU_FUENTES.md`. **Un 403 anotado en la documentación es una observación CON FECHA, no una propiedad
  del entorno: antes de dar una fuente por perdida, volver a llamarla.**
  Y `node tests/apu_bench.js`, que **mide** la tasa de acierto del parseo de tablas de pliego sobre
  un corpus sintético y publica los casos donde falla. Responde «¿cuánto acierta?», que es una cifra;
  la suite responde «¿sigue funcionando?», que es un sí/no.
- **Tras desplegar**: (1) relanzar `/api/sync?modo=full` UNA vez — la ingesta se ensanchó y hay
  procesos que las reglas viejas nunca dejaron entrar a Redis (ver «ingesta/juicio»), y desde ago 2026
  también los que se perdían por el estado `Activo` que faltaba en `ESTADOS_ABIERTOS`, **y desde el
  20-ago-2026 los que mataba una `fase` REZAGADA vetando a `estado_del_procedimiento`** (ver «Una
  `fase` rezagada mataba convocatorias publicadas»); el filtro de
  estado corre en la INGESTA, así que sin la full esos procesos no aparecen. Esa full es además la
  que ESCRIBE por primera vez `licitaciones:censo_ingesta`: hasta entonces `/api/perfil?op=
  diagnostico` publica `censo_ingesta: null` (que NO es un cero) y la caja «¿Por qué no está este
  proceso?» solo puede responder sobre el corpus; (2) definir
  `HISTORICO_TOKEN` y lanzar UNA vez
  `/api/sync/historico?desde=2024-01&hasta=2025-12` (header `x-historico-token`), o
  `?reconstruir_todo=true` si el histórico ya estaba bajado. Sin ese paso la app funciona igual,
  con todo en ⚪ «sin datos históricos» y sin equivalencias.
- Sintaxis de los JS del frontend: `new Function(código)` con Node (los cubre el paso *e* del test).
- El dashboard (`/api/resumen`) y la carga de RUP (`/api/admin/rup`) NO exigen full ni backfill:
  viven en la capa de consulta. Cargar un RUP tampoco — el juicio corre al servir.

## Decisiones que no hay que re-aprender (costaron caro)

- **Keyset por `:id`**, nunca `$offset` con orden por fecha (pierde/duplica filas en vivo).
  `$select="*,:id,:updated_at"` y proyección en cliente: un `$select` explícito con una columna
  inexistente da 400, y la fecha de cierre vive en columnas distintas según la modalidad.
  **EL `*` VA PRIMERO (16-ago-2026):** Socrata empezó a rechazar `:id,:updated_at,*` con 400
  «Star selections must come at the start of the select-list» — el orden que valió meses—; el
  cliente degradó a `$offset` como está diseñado y en producción esa vía acabó en 403 «agotados 5
  intentos», con el delta parado ~14 h. Se cazó porque el sync respondía `ok:false` y se leyó el
  cuerpo del 400 desde aquí. Hay prueba que fija el orden con la URL real que arma el cliente.
- **Un 400 de Socrata jamás se reintenta ni degrada el modo por fallo de red** — solo un 400 real
  degrada keyset→offset. 429/5xx → backoff exponencial + jitter, honrando `Retry-After`.
- **UN `SOCRATA_APP_TOKEN` INVÁLIDO NO PUEDE PARAR LA SINCRONIZACIÓN (16-ago-2026).** Socrata responde
  **403 «Invalid app_token specified»** a cualquier token que no reconozca, y producción estuvo 14 h
  sin sincronizar (delta tras delta «agotados 5 intentos (HTTP 403)») porque el valor pegado en
  Vercel no era el correcto. `lib/socrata.crearCliente`: ante 403 CON token reintenta UNA vez sin él;
  si responde, descarta el token para el resto de la instancia y el sync publica `app_token_rechazado`
  con la instrucción. Un 403 SIN token sigue siendo un bloqueo real. Lección: una variable de
  entorno opcional que puede estar MAL no puede ser un punto único de fallo; el diagnóstico es leer la
  respuesta del sync, no adivinar.
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
  · **POR MODALIDAD (ago 2026), y la premisa hay que matizarla.** La mediana global es 0 % y eso
    sugiere que nunca hay que descontar; la causa es que la mínima cuantía se adjudica una y otra vez
    por el presupuesto oficial y arrastra la cifra. Pero **el corpus histórico YA está filtrado a
    modalidades competitivas** (`transformar` aplica `modalidad_competitiva` ANTES de guardar): no
    entraba Contratación Directa, se mezclaban las SEIS competitivas entre sí. La lista blanca sigue
    haciendo un trabajo real al reagrupar porque `licitaciones:historico:mes:*` NO SE PURGA NUNCA y
    quedan vivos registros ingeridos antes de que «Invitación Privada» y «Enajenación» pasaran a
    excluidas — esos van a `sin_modalidad`, que se cuenta.
    · **La modalidad REFINA DENTRO de cada nivel, no es un nivel más.** `GRANULARIDADES` es una
      cascada ordenada con la invariante de que solo baja en especificidad; como escalón obligaría a
      decidir si «entidad+modalidad» es más o menos específica que «entidad+familia», que no tiene
      respuesta buena. `granularidad_utilizada` conserva su significado EXACTO y `modalidad_utilizada`
      dice si hubo refinamiento: dos preguntas, dos campos.
    · **Las cubetas se DERIVAN de `MODALIDADES_COMPETITIVAS`** con `require` DIFERIDO (misma técnica y
      mismo motivo que `lib/apu/inferencia`), más UNA que no sale de ahí: «régimen especial (con
      ofertas)», que `modalidad_competitiva` acepta por su propia rama antes de mirar la lista blanca.
      Sin esa cubeta esos procesos perderían su baja. Hay prueba que ATA las dos funciones: todo lo que
      la ingesta acepta tiene cubeta y nada que rechace la tiene.
    · **Mínimo 5, el de la entidad, no el laxo del segmento (3)**: partir en cubetas hace más fácil
      quedarse sin muestra, y aquí SÍ hay a dónde caer —la cifra mezclada—, mientras que el segmento
      es el último recurso antes de no decir nada.
    · **Compatibilidad, que es lo que de verdad podía romperse**: `indice:baja` no se purga nunca, así
      que en producción sigue vivo el hash sin `por_modalidad`. Sin esa clave `bajaDeMercado` responde
      EXACTAMENTE como antes; desplegar no exige reconstruir. Misma lección que `claveLegado`.
    · **`sin_modalidad` + Σ procesos de las cubetas = `procesos_analizados`**, con prueba. Sin esa
      igualdad una modalidad se perdería en silencio y las cifras seguirían pareciendo razonables,
      solo que sobre menos procesos.
    · **La modalidad viaja hasta `/api/apu/rentabilidad`** (resumen → URL del botón APU → editor).
      Su `lic` es SINTÉTICO: sin ese hilo respondería con la baja MEZCLADA mientras la tarjeta de
      `/api/oportunidades` enseña la de licitación pública — dos cifras del mismo proceso, y la mala
      sería la del editor, que es con la que se fija el precio.
    · **No existe `/api/baja-mercado`**: cuando se decidió, el plan Hobby admitía 12 funciones y el
      repositorio estaba exactamente en 12, así que crear una habría roto el despliegue entero.
      ⚠️ Esa restricción YA NO ATA (ver «Consolidación a 6 routers»): hoy `api/` está en 6 de 12. El
      endpoint sigue sin existir por COHESIÓN, no por presupuesto — plegar sigue siendo el default. `?modalidad=` vive en
      `/api/indice-baja`; `baja_mercado` es el CAMPO que sirve `/api/oportunidades`.
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
- **Columnas de adjudicación/oferentes: VERIFICADAS CONTRA DATOS REALES (ago 2026).** Estuvieron como
  «PENDIENTE VERIFICACIÓN» porque se daba por hecho que el entorno no alcanzaba `datos.gov.co`. **Sí lo
  alcanza**: se consultó `p6dx-8zbt` con `$where=adjudicado='Si'` (55 columnas) y las candidatas que ya
  usaba el módulo son las correctas — `valor_total_adjudicacion`, `nombre_del_proveedor`,
  `nit_del_proveedor_adjudicado`, `fecha_adjudicacion`, `respuestas_al_procedimiento`,
  `proveedores_unicos_con`, `id_adjudicacion`. **Dos trampas medidas**: en la misma fila
  `conteo_de_respuestas_a_ofertas` vale 0 mientras `respuestas_al_procedimiento` vale 3 (el ORDEN de las
  candidatas decide), y `nit_del_proveedor_adjudicado` puede llegar como la cadena `"No Definido"`, que **no
  es un NIT ni un `null`**. Evidencia en `docs/APU_FUENTES.md`. Se siguen leyendo por lista de candidatas en
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
- **La autorización vive en `lib/auth.js`, una sola vez**: siete endpoints la usan
  (`/api/sync/historico`, `/api/diagnostico`, `/api/competencia-detalle` —sus DOS vistas, la de
  entidad y la del desglose de probabilidad—, `/api/resumen`, `/api/admin/rup`,
  `/api/admin/experiencia`, `/api/admin/cobertura-rup`). Una copia que se desincronice es un
  agujero.
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
- **(Hoy `admin.js` vive dentro de `public/app.js` — ver «Página única», ago 2026.) En su época, el arranque automático iba AL FINAL del IIFE** (misma lección que costó cara
  en `app.js`): `abrirApp()` levanta el panel y la carga de RUP, cuyas funciones leen constantes
  declaradas más abajo. Hay prueba del orden. El refresco automático del panel **no corre con la
  pestaña oculta** (gastar invocaciones para que nadie lo mire) y se pone al día al volver a ella.
- La caché `resumen:{perfil}` (TTL 300 s) la **borra cualquier carga de RUP**: sus números salen del
  RUP y quedarían mintiendo cinco minutos.

### Onboarding: RUP en PDF → perfil dinámico (ago 2026)

- **El PDF se lee en el NAVEGADOR, otra vez** (`public/onboarding.js`, pdf.js clavado en la MISMA
  versión que `pliego.js` — hay prueba que compara las dos constantes). Al servidor viaja solo el
  texto con columnas por TAB; `lib/rup_pdf.js` extrae códigos, indicadores, experiencia y vigencia,
  y el resultado se valida con `lib/config_rup.validarPerfilDinamico` — la MISMA `validarPerfil` de
  la carga manual, no una copia. No existe un «RUP de PDF» distinto de un «RUP de archivo».
- **Va plegado en `POST /api/admin/rup?origen=pdf`** (entonces el repositorio estaba en 12 de 12
  funciones; hoy en 6, pero plegar sigue siendo el default); el alias literal `/api/admin/rup-desde-pdf` es un `rewrite` de vercel.json y la landing
  llama a la CANÓNICA. Un GET responde 405 con `como_hacerlo` — jamás un «GET que escribe».
- **ES LA ÚNICA ESCRITURA SIN TOKEN del repositorio, a propósito.** El onboarding es el producto:
  pedir credencial a quien llega a subir su RUP mata la landing (la misma lógica del token opcional
  de `/api/oportunidades`). Cerraduras, todas con prueba: ids `rup_…` generados en el SERVIDOR
  (jamás del cliente), solo puede escribir `config:perfiles:rup_*` y `config:unspsc:rup_*` (no
  alcanza ni los tres perfiles del dueño ni el sello `config:perfiles:version` — escribir el sello
  haría recargar los perfiles fijos), TTL de 45 días, tope absoluto de perfiles vivos y cuerpo ≤5 MB.
  Sin token las cifras del perfil dinámico viajan REDACTADAS por `lib/publico`, igual que las del dueño.
- **El perfil dinámico se INYECTA en `PERFILES`** (`lib/perfil_dinamico.js`): todo el juicio resuelve
  `PERFILES[perfilId]` sobre el objeto vivo, así que inyectar es lo que evita cambiar firmas en media
  app. Se relee de Redis en CADA petición (un GET pequeño; mismo criterio que el sello sin TTL) y un
  perfil caducado responde **404 con `perfil_caducado:true`** — la web lo usa para olvidar el perfil
  guardado; sin ese campo, todas las visitas siguientes fallarían igual y sin explicación.
- **Códigos: runs de dígitos de EXACTAMENTE 8** (nunca `\d{8}` suelto, ni los runs de 2/4/6 que
  acepta `lib/unspsc.extraerCodigos` para el campo de categoría — aquí serían ruido puro), más las
  filas Segmento|Familia|Clase|Producto SOLO dentro de la sección del clasificador. Fuera de la
  sección un run de 8 exige terminar en «00» (la premisa de inscripción por clase) Y que la línea no
  sea de dinero/contacto — «UTILIDAD OPERACIONAL 12000000» tiene un run de 8 con segmento válido que
  terminaría en el RUP como código. Lo descartado SE CUENTA (`codigos_ilegibles`).
- **Lo único que se DERIVA es la utilidad operacional** (rentabilidad del patrimonio × patrimonio:
  identidad del D. 1082, declarada en advertencias). Los dos SUPUESTOS van declarados:
  profesionales = 1 (suelo del factor CT) y tope estratégico = 2 × mayor contrato acreditado. El NIT
  exige el guion del dígito de verificación: partir «NIT 900123456» inventaría un DV.
- **La landing es la primera pantalla** (`#onboarding` nace visible; el gate nace oculto pero SIGUE
  existiendo para los perfiles del dueño). El copy en voseo es literal del encargo. `app.js` decide
  la vista al arrancar (perfil `rup_…` en URL o localStorage → dashboard sin gate; sesión con clave →
  dashboard clásico; nada → landing) y el arranque sigue AL FINAL del IIFE.
- **Experiencia en CSV** (`public/formato_experiencia.csv`, con comentarios `#` que declaran que es
  OPCIONAL): la conversión CSV→JSON corre en el navegador y el endpoint es el de siempre
  (`POST /api/admin/experiencia`, CON token: escribe configuración compartida — y la UI LO DICE,
  porque prometerle al visitante que «afina sus recomendaciones» cuando escribe la configuración del
  dueño sería mentirle). El campo `unspsc` del formato es opcional y **solo se escribe cuando
  viene** — los contratos guardados con el esquema anterior conservan su forma exacta, con prueba.
- **SIETE DEFECTOS QUE LA REVISIÓN ADVERSARIA ENCONTRÓ ANTES DE PRODUCCIÓN**, todos con prueba:
  · **La fecha de corte contaminaba el indicador**: «PATRIMONIO A 31/12/2025 $850.000.000» leía 31.
    Las fechas se TACHAN del tramo antes de buscar el número (`sinFechas`).
  · **Un año se volvía la experiencia**: el máximo de una línea con «SMMLV» incluía «2023». La cifra
    es la ADYACENTE a la unidad — la misma regla que la cantidad junto a la unidad en `apu_pliego`.
    Las tablas con la unidad solo en la cabecera caen al error accionable, no a un dato inventado.
  · **ReDoS en la detección de sección**: `(clasificaci)[^]*?(bienes)` sobre una línea hostil de MB
    (endpoint público, cuerpo de 5 MB) era cuadrática. Ahora son `includes` lineales.
  · **Sin tope de códigos por perfil**: un cuerpo hostil con miles de runs de 8 fabricaba perfiles
    enormes en Redis. `MAX_CODIGOS = 2000` → error, no truncado silencioso.
  · **Redis caído ≠ perfil caducado**: en instancia fría el fallo de lectura devolvía `null`, el
    endpoint respondía 404 `perfil_caducado` y la web BORRABA el perfil guardado del cliente. Ahora
    el error se propaga (502) y solo el 404 real borra — y solo si el guardado ES el que caducó.
  · **`?perfil=rup_…` pegado en la URL saltaba el gate** dejando los perfiles del dueño en el
    selector. `abrirApp` ya no marca `detecta-acceso` (eso lo hace el gate al validar la clave) y
    quien entra sin gate ve el selector PODADO a su propio perfil.
  · **La comilla de pulgadas rompía el CSV**: «Tubería de 4" en PVC» abría modo comillas a mitad de
    celda y fusionaba filas en un contrato falso que PASABA el validador. Una comilla solo abre
    campo al PRINCIPIO de la celda (RFC 4180). Y el CSV ANSI de Excel-Windows se re-decodifica como
    windows-1252 si el UTF-8 produce reemplazos.
  Además, **las dos copias de `lineasDePagina` (onboarding.js/pliego.js) quedaron ATADAS por una
  prueba que las EJECUTA** sobre los mismos fragmentos (el patrón de `numeroLocal`), no solo por la
  constante de versión de pdf.js.

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
- **PUESTA EN PRODUCCIÓN SIN TERMINAL (ago 2026), y la restricción que la definió.** El dueño no
  tiene terminal, así que `cargar_experiencia.sh` no le sirve y los tres pasos tenían que darse con
  clics desde `/admin.html`. Lo natural era crear `api/admin/cargar-experiencia-genesis.js` y
  **habría roto el despliegue ENTERO**: el plan Hobby admite 12 funciones y el repositorio estaba
  entonces exactamente en 12 (misma restricción que impidió `/api/baja-mercado` y que plegó
  `/api/apu/catalogo`). No falla el endpoint nuevo: falla el sitio. Hoy `api/` está en 6 de 12 y esa
  restricción no ata, pero la lección de que un archivo de más tumba el SITIO sigue valiendo.
  · **Va plegado en `/api/admin/experiencia` como `?origen=repositorio`**, y eso REGALA lo que el
    encargo pedía aparte («sin duplicar código»): lo único que cambia es DE DÓNDE salen los
    contratos; desde `validarContratos` en adelante es el mismo camino, el mismo guardado y la misma
    invalidación de caché. `origen` viaja en la respuesta para poder distinguir las dos formas.
  · **La URL literal del encargo existe como `rewrite` de vercel.json**, que no cuenta como función.
    Hay prueba de que apunta al endpoint real CON `origen=repositorio` — un alias que apuntara a otra
    cosa sería una URL que promete algo que no hace. **El panel llama a la canónica**: si el rewrite
    fallara, el botón tiene que seguir funcionando.
  · **El archivo se lee con `require` ESTÁTICO, jamás con `fs` sobre una ruta construida.** Es como
    el repositorio carga todos sus JSON y es lo que hace que el tracer de Vercel lo meta en el
    bundle; con ruta dinámica el archivo no viaja al despliegue y el endpoint respondería 500 SOLO EN
    PRODUCCIÓN, porque en local funciona. `includeFiles` apunta a `data/**` y este archivo está en la
    raíz, así que por ahí tampoco entraría.
  · **El origen se lee de la QUERY, no del cuerpo**: así la carga es un POST SIN CUERPO, que es lo
    que permite dispararla con un botón —y con el alias— sin fabricar un JSON que el servidor ya
    tiene.
  · **Los tres pasos del panel no reimplementan ninguno.** El 2 llama a la misma `ejecutarAuditoria()`
    del botón de cobertura con el perfil fijado en `genesis`; el 3 a `iniciarFull()`, extraído del
    listener de «Iniciar sincronización». Hay prueba de que `let modo = "full"` aparece **una sola
    vez**: una segunda copia es donde se rompería «1.ª tanda full, siguientes auto» —repetir `full`
    vuelve a enero para siempre— sin que nadie lo notara.
  · **EL ALIAS PEGADO EN CHROME ES UN GET, y por poco miente.** La rama GET retornaba ANTES de
    mirar `origen`, así que `GET /api/admin/cargar-experiencia-genesis` respondía
    `200 {ok:true, cargada:false, contratos_cargados:0}` — un «no hice nada» con cara de éxito, y con
    un cero que se lee como «cargué cero contratos». Misma familia que «en 0 procesos» y que `|| 0`
    sobre un conteo, y le tocaba justo al único usuario que existe: el dueño sin terminal, cuya vía
    documentada es pegar la URL en el navegador. Ahora el origen se resuelve ANTES de despachar por
    método y un GET da **405 con `Allow: POST` y con `como_hacerlo`**. NO se convirtió en un
    «GET que escribe» —lo dispararía cualquier prefetch del navegador—, aunque `/api/sync` sí lo
    haga: allí es una sincronización idempotente y aquí es una escritura de configuración.
  · **(Superado por el token integrado, ago 2026: el bloque nace VISIBLE — ver «Página única».) Entonces iba OCULTO sin token** (sus tres pasos escriben en Redis) y su visibilidad colgaba de
    `pintarEstadoToken`, que ya corre al arrancar y en cada cambio de token: un solo sitio. Y **la
    cadena se detiene en el primer paso que falle**: auditar sobre una carga que no ocurrió daría un
    resultado creíble y equivocado.
  · **EL PASO 2 NO PODÍA FALLAR, y la prueba que lo vigilaba era una regex sobre el fuente.**
    `ejecutarAuditoria` no devolvía nada —cuatro salidas de error con `return avisoCobertura(…)`, que
    es `undefined`—, así que el `return true` del paso 2 era incondicional: la cadena escribía
    «✔ 2/3» y lanzaba la full sobre una auditoría que no había corrido. Lo encontró una revisión
    adversaria y **las cinco lentes coincidieron**. Ahora `ejecutarAuditoria` devuelve booleano y el
    paso 2 lo PROPAGA. Lección de método: comprobar por regex que una función se LLAMA no prueba que
    su resultado se MIRE.
  · **La guarda de «auditoría EN VUELO» va ANTES de tocar el selector.** Comprobarla después —dentro
    de `ejecutarAuditoria`, que sale por ahí— deja el selector en «genesis» y, cuando responde la
    auditoría que estaba corriendo (OTRO perfil), `pintarCobertura` estampa SUS cifras bajo ese
    rótulo. La cadena se detiene igual, pero la pantalla miente: es «la peor forma de equivocarse»
    que el propio paso documenta, entrando por la puerta de atrás. Hay prueba del ORDEN.
  · **Fijar `c-perfil.value` desde código NO dispara `change`**, que es justo quien esconde lo
    pintado: sin invalidar a mano, la auditoría de OTRO perfil se quedaba en pantalla bajo un
    selector que decía «Génesis». La invalidación se extrajo a `invalidarCoberturaPintada` para que
    el listener y el paso 2 no tengan dos copias. Y el paso 2 **no persiste el perfil**: esa clave la
    comparte el DASHBOARD, que es otra pantalla.
  · **El parseo del JSON va APARTE del `fetch`**: el muro del edge (Vercel Password Protection)
    responde HTML, así que `r.json()` LANZA y, con las dos cosas en el mismo `try`, ese muro se
    diagnosticaba como «sin conexión» — lo contrario de la verdad, porque hay conexión y lo que hace
    falta es iniciar sesión. El encadenado de la sincronización ya lo trataba bien; ahora los dos.
  · **El flag va en la QUERY y no en el cuerpo, y hay una razón medida**: `validarContratos` lee solo
    `datos.contratos` e IGNORA las claves extra de la raíz, así que un flag mal escrito DENTRO del
    JSON cargaría los contratos pegados con un 200 idéntico —fuente equivocada y sin síntoma—.
    En la query, un `?origen=repo` cae al 400 de «body vacío», que es ruidoso. Hay prueba.
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

### Contra quién se ha competido: proponentes en vivo (hgi6-6wh3, ago 2026)

`lib/proponentes.js` + bloque `proponentes` en la vista de entidad de `/api/inteligencia?op=entidad` +
«Quiénes se presentan aquí» en el modal. Cierra el pendiente de la Fase 3 «hgi6 en vivo».
- **El corpus dice quién GANÓ; hgi6 dice quiénes SE PRESENTARON.** Son dos preguntas y dos bloques
  (`adjudicatarios` / `proponentes`), y la lectura lo dice: es contra quién se HA competido — un
  proceso ABIERTO no tiene proponentes en ninguna fuente pública hasta la apertura (medido en
  docs/datos.md §5.1: 0 filas para abiertos).
- **Se consulta por `id_procedimiento in (…)` con los ids de la entidad que YA están en el corpus**
  (los más recientes, tope 300), NUNCA por `nit_entidad` (los NIT se comparten entre regionales — la
  lección de identidad) ni por nombre (varía en puntuación). Consulta AGRUPADA en el servidor de
  Socrata (`$group`, `count(*)`, `max`, `count(distinct)`): una entidad grande son miles de filas.
- **«No Definido» NO es un NIT ni un null a secas**: viaja `nit:null` + `identificacion.tipo:
  "sin_nit"` con su nota; dos grafías del mismo proveedor se suman por NIT.
- **Best-effort con TIEMPO ACOTADO (6 s)**: la vista de entidad no puede colgarse de un tercero;
  fallo o tiempo agotado → `ok:false` con motivo, `top: []`, y el detalle sale igual (hay prueba
  con el dataset caído). La caché del detalle subió a `v4` porque el cuerpo cambió de forma. El
  transporte es `lib/socrata.crearCliente({baseUrl})`, como el PAA — nada de un segundo cliente HTTP.
- **El mock de la suite sirve un TERCER dataset por path** (`hgi6-6wh3`) con `in (…)`, `$group` y
  `count(distinct …)`; sin eso la consulta real no se podría ejercitar sin red.
- Medido en producción con el IDU antes de desplegar: 249 procesos, 123 con proponentes, 497
  empresas; los que más se presentan son consultoras (interventoría) — hgi6 no distingue tipo de
  contrato y el universo lo acotan los ids del corpus (obra compatible con los RUP).

### Verifique a su socio antes de firmar (ago 2026)

`lib/socio.js` + vista `socio` de `/api/inteligencia` (token; sale ANTES del chequeo de Upstash como el PAA:
no lee el corpus ni escribe) + sección «Verifique a su socio antes de firmar» en Mi empresa. Cierra el ⬜
«antecedentes del socio» del manual. Decisiones que no hay que re-aprender:
- **«No es automatizable con datos abiertos» era una observación vieja, no una propiedad**: `iaeu-rcn6`
  (SIRI, Procuraduría, actualizado a diario) y `4n4q-k399` (Multas y Sanciones SECOP I) responden 200 en
  datos.gov.co. Antes de dar por manual una fuente, buscarla en el catálogo (`/api/catalog/v1?q=`).
- **SIRI rellena `numero_identificacion` con ESPACIOS a la derecha** («7534386        ») y las multas pegan
  a veces el DV al documento («8340014074» = 834001407-4): se consulta con `starts_with` y se confirma en el
  cliente (igualdad recortada; igual o igual+1 dígito). Hay prueba con la trampa del prefijo (790000012 no
  es 79000001). El dataset trae filas de «Z ENTIDAD DE PRUEBA»: se descartan y se cuentan.
- **Una persona jurídica NO está en SIRI**: se consulta al representante legal que publica `jbjy`
  (`identificaci_n_representante_legal`, solo si es una cédula distinta del NIT — el dataset repite a veces
  el NIT en ese campo) y a la cédula que declare quien consulta. Una persona natural se consulta a sí misma.
- **El semáforo NUNCA dice «limpio»**: «sin hallazgos en las fuentes abiertas» + tres del checklist a mano;
  los certificados (Procuraduría/Contraloría/Policía) se piden igual. Rojo = SIRI con sanción o posible
  inhabilidad del art. 90 **vigente** (≥ 5 multas en una vigencia a ≤ 3 años); una concentración vieja es
  ámbar «histórica». La regla se declara sobre lo VISIBLE (solo multas SECOP I; no distingue declaratorias).
- **Reutiliza `agregarEjecucion` de `lib/ejecucion`** para los contratos del proveedor: una segunda cuenta
  de prórrogas/pagos divergiría. Las URL de las tres fuentes manuales se verificaron con 200 el 17-ago-2026
  (`contraloria.gov.co/es/web/guest/control-fiscal/…/certificado-de-antecedentes-fiscales`; la ruta
  `/web/guest/persona-natural` da 403).
- El mock de la suite sirve `iaeu-rcn6` y `4n4q-k399` por path, entiende `starts_with(...)` y agrega
  `$group` (count/count distinct/sum/max/min/date_trunc_y) en la rama genérica.

### Cómo ejecuta sus contratos: jbjy-vk9h en vivo (ago 2026)

`lib/ejecucion.js` + bloque `ejecucion` en la vista de entidad + «Cómo ejecuta sus contratos» en el modal.
Cierra el último pendiente de la Fase 3. Mismo patrón que proponentes (best-effort, 6 s, nunca lanza,
caché del detalle `v5`); las dos consultas externas corren en PARALELO.
- **`valor_pagado = 0` es SIN DATO** — medido: 845 de 1 752 entidades registran algún pago; en
  «terminado» solo el 64 %. Los pagos se afirman SOLO cuando la entidad registra alguno, y entonces
  sobre los terminados/cerrados CON pago (`pct_pagado_de_terminados` con su base). El IDU no registra
  ninguno en 64 contratos: «no registra pagos», jamás «no ha pagado».
- **Se filtra por NIT + NOMBRE canónico**: el NIT lo comparten regionales; lo firmado bajo otro
  nombre se declara (`otros_nombres_con_este_nit`) y NO se suma — hay prueba con una regional
  homónima que, si se colara, cambiaría de signo la mediana y los pagos.
- **No hay adición de VALOR en el dataset** (`valor_del_contrato` es el vigente, sin el original):
  se publican prórrogas en DÍAS (`dias_adicionados`, poblado), suspendidos y el reparto de estados;
  la adición de valor no se inventa.
- La baja «verdadera» NO sale de aquí: es la de `lib/indice_baja` (p6dx), verificada 8/8 igual.

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

### Módulo APU · lectura del formulario de cantidades de un pliego (ago 2026)

- **La premisa del encargo era falsa y hay que dejarlo escrito**: se pidió una «Fase 4» dando por
  hecho que las «Fases 1-3 del módulo APU» estaban en `main`. **No existía nada de APU en `main`**:
  ni catálogo, ni página `/apu`, ni `lib/apu*.js`. Lo único que había era el documento de diseño
  `docs/APU_Y_RENTABILIDAD.md`, y **tampoco está en `main`** — vive en la rama sin fusionar
  `claude/apu-rentabilidad-licitaciones-vxom4c`. Se construyó además el sustrato mínimo (catálogo de
  ítems + página) para que la extracción tuviera destino. **Y la numeración del encargo no es la del
  documento**: el doc planifica TRES fases (1 = MVP con datos propios, 2 = fuentes externas
  gratuitas, 3 = inversión/LLM) y el catálogo de ítems es entregable de su **Fase 2**.
- **El PDF se lee en el NAVEGADOR, y la decisión está medida, no intuida.** `tesseract.js@7` +
  `spa.traineddata` son **51 MB de `node_modules`** y 9 dependencias npm; cabe en el límite de 250 MB
  de Vercel, pero rompe la regla central del proyecto y **además necesita un rasterizador nativo**
  (`pdfjs-dist` en Node exige `canvas`, módulo compilado). El texto de un pliego de 120 páginas son
  ~0,34 MB contra el tope de **4,5 MB** del cuerpo de una función: mandando texto sobra un factor de
  13. Los 50 MB son del DESPLIEGUE, no de la invocación — son dos límites distintos que se confunden
  siempre.
- **Las columnas se conservan por COORDENADAS, no por `str` concatenado**: agrupar por Y forma la
  fila, el hueco en X decide TAB o espacio. Si el navegador mandara el texto aplanado, el parseo
  entero dependería de la vía de último recurso. Es la pieza de la que cuelga todo lo demás.
- **pdf.js va CLAVADO en 3.11.174**: desde la v4 `pdfjs-dist` ya NO publica build UMD (es ESM puro,
  incluido `legacy/build/`), así que un `@latest` dejaría de definir `window.pdfjsLib` y rompería la
  carga **de golpe y en silencio**.
- **`workerSrc` NO puede apuntar al CDN**: `new Worker(url)` clásico no admite otro origen, y ese es
  el fallo intermitente típico de pdf.js. Se trae por `fetch` y se envuelve en un **blob del mismo
  origen**. Tres niveles: blob → URL directa → sin worker (hilo principal: funciona, congela la
  pestaña, **y se avisa**).
- **AQUÍ EL FALSO POSITIVO CUESTA MÁS QUE EL FALSO NEGATIVO** — al revés que en el filtrado de
  oportunidades, y es la inversión más importante de este módulo. Un 🟡 en la lista se descarta en
  5 s; un ítem inventado o una cantidad mal leída en un presupuesto es plata. Por eso el semáforo
  puede DESCARTAR el parseo entero y por eso nunca se usa automáticamente una lista a medias.
- **Tolerancia de FILA en pesos, jamás en porcentaje del total**: `max(cantidad/2 + 1, $1)`, porque el
  error por redondear el unitario al peso es `cantidad × 0,5`. Un 0,5 % en una fila de $500 M admite
  $2,5 M y **esconde justo el dígito mal leído que la regla debía cazar**; y en una fila barata con
  cantidad enorme se queda corto y produce falsos rojos.
- **El AIU se LEE, no se adivina, y el barrido NUNCA produce verde.** Con un parámetro libre continuo
  de 25 puntos (10-35 %) casi cualquier suma de costos directos encuentra un AIU que «cuadra»,
  incluidas las tablas incompletas. Y **el IVA sobre la utilidad no es un detalle**: con `U = 10 %`
  añade ≈1,9 pp, casi **cuatro veces** la tolerancia del 0,5 %, así que se prueban las dos variantes
  y se registra CUÁL cuadró (es información sobre cómo presupuesta esa entidad).
- **Cantidades sin precios unitarios = AMARILLO**, ni rojo ni verde. Es el caso «frecuente y
  benigno»: sin aritmética no hay nada que respalde un ≥98 % de filas correctas (así que no es verde,
  que significa «se usa automáticamente»), pero ítem + unidad + cantidad «sigue siendo la mayor parte
  del valor» (así que no es rojo).
- **Una cantidad ilegible es `null`, JAMÁS 0** — la misma regla que `anticipo_pct = 0` y que el
  contador de oferentes, aquí con consecuencia económica directa. Hay prueba que prohíbe
  `f.cantidad || 0` en el frontend, hermana de la que ya prohibía `i.<conteo> || 0`.
- **LOS CÓDIGOS `INV-` YA SE CONTRASTAN CONTRA LA NORMA (ago 2026).** La regla dura no cambió
  —«nunca inventar un código INV que no exista; si no hay artículo, el ítem nace `LOC-`»— pero la
  premisa que la volvía bloqueante era FALSA: el índice de las Especificaciones (Res. 4561/2022) **sí
  se abre**, la URL había cambiado. Sus **105 artículos** están en `data/invias_articulos.json` y
  `codigoInviasPropuesto()` ya no devuelve una hipótesis: contrasta el candidato y emite el código con
  el artículo **tal como lo cita la norma** (`INV-630-22-…`), o `codigo: null` **con su motivo** si el
  artículo no existe en la edición vigente. Los 13 candidatos del catálogo del lector verifican.
- **OJO CON LO QUE `verificado: true` NO DICE:** se verificó la **NUMERACIÓN**, no la **UNIDAD DE
  PAGO** — el índice trae capítulo, número y título y **nada más**. Por eso viaja
  `unidad_verificada: false`, y prometer más sería repetir el mismo error con una etiqueta nueva. El
  **título oficial viaja PEGADO** al código (R10) para que el encaje se pueda auditar sin abrir la
  resolución: «¿mi *Excavación manual en material común* es el 600 *Excavaciones varias* o el 210
  *Excavación de la explanación*?». **Un puntaje de confianza inventado ahí sería peor que el título
  literal**: se leería como una medición. Los `codigo_item` del catálogo del lector siguen siendo
  `LOC-` a propósito — son su clave interna y renombrarla rompería mapeos y borradores.
- **El catálogo NO tiene precios**, y eso es la mitad de lo que lo hace publicable: sin base de
  precios verificada, un rendimiento o un jornal inventados serían plata, no un dato incómodo.
- **La TIPOLOGÍA es un peso (0,10), no un filtro del catálogo.** Empezó siendo filtro y estaba mal,
  medido con un caso: en un proceso de placa huella la fila del cruce de drenaje («TUBERÍA PVC»)
  caía a «personalizado» porque `LOC-RED-TUBPVC` no figura en `VIA-PH`. **Un presupuesto de obra
  mezcla tipologías por construcción.**
- **El tokenizador del mapeo CONSERVA los dígitos**, al revés que `experiencia.tokenizar`, que los
  descarta a propósito. Allí «2024» es el número del proceso; aquí «21» (MPa), «420» (fy) y «21»
  (RDE) son lo que distingue un ítem de su hermano y lo que **mueve el precio** (RDE 41→21 puede
  duplicar el ml). Dos preguntas distintas, dos reglas distintas, y una prueba que impide
  «unificarlas» — la misma clase de decisión que separar `TERMINOS_BLOQUEANTES` de
  `TERMINOS_NO_PERTINENTES`.
- **La unidad NO se convierte nunca**: pasar m² a m³ exige un espesor que el catálogo no conoce. Se
  marca `unidad_discrepante` y se conserva **la del pliego**, que es la que se va a pagar.
- **Sin match nace un ítem PERSONALIZADO, la fila jamás se descarta.** Si la entidad va a pagar por
  ese ítem, tiene que estar en la lista aunque el catálogo no lo conozca. No es un fallo del mapeo.
- **`isTable=true` de OCR.space promete texto LÍNEA A LÍNEA, no columnas.** Consecuencia: el texto de
  OCR casi nunca activa la vía posicional —cae en la de firma de unidad o en la aplanada— y por eso
  el OCR es un respaldo del que hay que decir que lee peor, no disimularlo con una opción de nombre
  tranquilizador.
- **Escaneado se detecta POR PÁGINA (<100 caracteres de media), no con un umbral global**: un escaneo
  con cabecera vectorial devuelve unos pocos caracteres por página y pasaría el suelo absoluto. Y el
  mensaje dice «parece escaneado», nunca «el pliego está vacío»: **ausencia de capa de texto es SIN
  DATO**.
- **Un 200 de OCR.space no es éxito**: el fallo viaja DENTRO del 200 (`IsErroredOnProcessing`,
  `OCRExitCode` 1/2/3/4). Sin comprobarlo se devolvería texto vacío como si la página no tuviera nada.
  Un 4xx NO se reintenta (gasta cuota del plan gratuito); 429/5xx sí, con backoff y `Retry-After`.
- **`/api/apu/descargar` existe porque el navegador NO puede** bajar el PDF (mismo origen; los
  portales no mandan CORS), y es un SSRF de manual: token · solo `https:` · sin IP literal,
  `localhost`, rango privado ni dominio interno · **redirecciones a mano revalidando cada salto**
  (`169.254.169.254` es el salto clásico) · tamaño controlado **mientras se lee**. Y se verifica la
  firma **`%PDF-`**: los portales sirven HTML de sesión con `Content-Type: application/pdf`.
- **`/api/apu/extraer-texto` NO toca Redis**: ni lee el corpus, ni escribe, ni toma candados. No
  necesita credenciales de Upstash y no puede dejar nada a medias. Nada del módulo APU toca la
  ingesta, la purga ni `limpiarRedis` del arnés.
- **«Sin tablas» es un RESULTADO, no un error**: 200 con la lista vacía y el diagnóstico. Un 4xx haría
  creer que el envío estaba mal cuando lo que pasa es que el documento no era el Formulario 1.
- **Una línea de metadato no es prosa suelta.** La regla de «continuación de una descripción partida
  en dos líneas» pegaba «ANTICIPO: 30%» al final del último ítem, **inventándole una descripción que
  no está en el pliego**. Las líneas que tienen su propio lector (`leerAiu`, `leerAnticipo`) tienen su
  propia cubeta en el diagnóstico: contarlas como «no reconocidas» también sería falso.
- **DIEZ DEFECTOS QUE EL BANCO NO VIO Y LA REVISIÓN ADVERSARIA SÍ.** El banco daba 100 % y estaba
  midiendo lo que su autor previó; una revisión con lentes independientes (corrección, doctrina,
  seguridad, honestidad) encontró diez cifras equivocadas y creíbles, que es lo peor que este módulo
  puede producir. Los diez reproducidos ejecutando código antes de tocar nada:
  · **Una celda VACÍA descolocaba todo el mapa de columnas**: `dividirCeldas` filtraba los huecos, así
    que con `2.1|SUBBASE|M3||95.000|35.625.000` la cantidad leía el PRECIO UNITARIO. Ahora los huecos se
    conservan cuando el separador es TAB y hay DOS vistas de la línea: posicional (con huecos) y
    compacta (sin ellos, para lo que razona por adyacencia).
  · **La cantidad es la cifra ADYACENTE a la unidad**, a un lado o al otro. Dar prioridad a la derecha
    «porque es el orden normal» leía el unitario como cantidad con el orden `CANTIDAD | UNIDAD`, que es
    tan corriente que el propio banco lo tiene como caso.
  · **El AIU y el IVA desglosados como partidas** entraban en la suma del documento e inflaban el costo
    directo justo en los pliegos que mejor desglosan su AIU (`NO_ES_COSTO_DIRECTO_RE`, anclada al
    PRINCIPIO: «ADMINISTRACION DELEGADA DE OBRA» puede ser una partida real).
  · **La vía aplanada convertía PROSA en ítems**: «SE PAGARA POR ML 1.000 METROS…» producía el ítem «SE
    PAGARA POR», ml, 1.000. Ahora la descripción no puede terminar en palabra de enlace y hace falta
    numeral o dos cifras. Es la vía normal del OCR, así que es donde más apretar.
  · **Cabecera partida en dos líneas** («VALOR|VALOR» + «UNITARIO|TOTAL»): las dos celdas mapeaban a
    `total` y ganaba la primera, anclando `total` a la columna del unitario. Se resuelve por el orden,
    que en un formulario es invariable.
  · **`leerAnticipo` tomaba el primer `%` de la línea**: «EL AIU SERA DEL 25% Y EL ANTICIPO DEL 30%» →
    anticipo 25 %. Y con los dos conceptos en una línea perdía uno. Ahora el `%` se busca junto a SU
    palabra, sin cruzar el punto («NO SE PACTARA ANTICIPO. LA RETENCION… 5%» ya no declara un anticipo).
  · **`\d{1,2}` convertía «100%» en 0 %** — un 0 que aquí significa «sin dato». Ahora `\d{1,3}`.
  · **La «a» de preposición fijaba la Administración**: «IMPREVISTOS EQUIVALENTES A 3%» → A = 3 %. La
    inicial suelta ahora exige separador o paréntesis; la palabra completa vale sola.
  · **`375.0000` daba 3 750 000** (mil veces): un punto con 4+ dígitos detrás es un DECIMAL, no miles.
    Con varios puntos y 4+ detrás, `null` — «no sé», no un número inventado.
  · **Dos capítulos con el mismo numeral** (dos grupos que reinician la numeración) sumaban sus hijas
    juntas: el acumulador se indexa por ÍNDICE, no por numeral. Y el subtotal se asigna al capítulo que
    el TEXTO nombra, no al último empujado (con subcapítulos, el último es 1.2 cuando llega el total de 1).
- **El VERDE exige tres cosas más que el ratio de filas.** Las filas sin cantidad legible salían del
  denominador en vez de contar contra él, así que se llegaba a verde con la mayoría de las cantidades
  sin leer — y el aviso «N ítem(s) SIN CANTIDAD legible» salía en la MISMA respuesta, contradiciendo a
  la insignia. Verde exige ahora: ninguna cantidad ilegible, ≥5 filas validadas (con «1 de 1 cuadra»
  daba 100 %) y ≥50 % de los ítems validados.
- **«Firme» en el mapeo exige MARGEN 0,12, no 0,08, y ≥2 términos coincidentes.** El solapamiento se
  divide por los términos del PLIEGO, así que una descripción corta y genérica alcanza 1,0 sin ser
  específica: «CONCRETO 3000 PSI» casaba en firme con el concreto de placa huella pudiendo ser el
  estructural o el de pavimento rígido, y lo que separaba a los tres era 0,083.
- **Validar la CADENA del hostname no protege de nada.** El SSRF de `/api/apu/descargar` seguía abierto:
  cualquier dominio público puede apuntar a `127.0.0.1` o a `169.254.169.254`. Ahora **se resuelve el
  nombre y se valida la IP**, en el primer salto y en cada redirección. Y tres precisiones: `::ffff:`
  mapeada es IPv4 disfrazada y no la veía ninguna de las dos familias de reglas; `^fc`/`^fd` sin
  delimitador rechazaban dominios REALES (`fdn.gov.co`) como internos, así que las reglas IPv6 solo se
  aplican a literales IPv6; y **`primeros_bytes` en el 415 era un oráculo de lectura** de servicios
  internos. Queda la ventana TOCTOU del *rebinding*, dicha y no disimulada.
- **La clave del OCR viajaba en los mensajes de error.** El cuerpo de error de OCR.space se le muestra
  al usuario (es el único diagnóstico útil), pero lo escribe un tercero a partir de una petición que
  LLEVA la `OCRSPACE_API_KEY` y hay servicios que la repiten («Bad request for apikey=…»). Se tacha
  antes de reenviarlo. Y **la rama `{url}` de `ocrPagina` desapareció**: aceptar una URL y pasarla a
  OCR.space era un SSRF POR DELEGACIÓN que además se saltaba el control de tamaño.
- **Las dos implementaciones del número colombiano están ATADAS POR UNA PRUEBA.** `numeroLocal` en
  public/apu.js duplica a `numeroColombiano` porque un `<input>` no puede requerir un módulo de Node —
  duplicación justificada, no libre. La prueba extrae la función del fuente y compara las dos sobre la
  misma batería; **cazó una divergencia real en cuanto se escribió** (`375.0000` corregido solo en el
  servidor). Sin ella, el número que el dueño escribe a mano y el que el servidor leyó del PDF
  significan cosas distintas y nadie se enteraría.
- **La página no puede prometer que el documento NO SALE y ofrecer un botón que lo manda a un
  tercero.** Decía «no se sube a ningún servidor» con el botón de OCR al lado, que envía las páginas
  rasterizadas a OCR.space. La excepción se declara ahora en la propia sección, antes de pulsar.
- **`tests/apu_bench.js` publica el LÍMITE, no solo el acierto.** 100 % de recall sobre 10 formularios
  sintéticos no significa gran cosa cuando el corpus lo escribió quien escribió el parser: mide la
  habilidad del autor para prever variantes. Por eso hay una tanda **adversaria sin suelos de
  regresión**, y encontró tres defectos reales —celdas combinadas, unidad mencionada dentro de la
  descripción, ambigüedad decimal—; **dos se corrigieron y el tercero queda publicado**. La
  distribución real de formatos de SECOP II sigue **sin medir** (§1.G.7 la deja como vacío explícito)
  y ninguna cifra del banco la sustituye.
- **DOS PÁGINAS Y DOS CATÁLOGOS, y la separación es deliberada.** El lector de pliegos vive en
  `/pliego.html` y el editor de APU en `/apu.html`; el lector usa `data/catalogo_apu.json` (93 ítems
  **sin precios**, con sinónimos: es un DICCIONARIO DE RECONOCIMIENTO para casar el texto de un pliego)
  y el editor usa `data/apu_catalogo.json` (17 ítems **con precios**, composición y rendimiento: es la
  BIBLIOTECA DE COSTEO). Responden a preguntas distintas —«¿qué ítem es esta fila?» frente a «¿cuánto
  cuesta este ítem?»— y por eso no se fusionan; lo que sí se hace es EMITIR el código del catálogo de
  precios cuando el ítem reconocido existe allí, para que no haya dos identidades del mismo ítem.
- **El informe de investigación y el doc de precios son DOS documentos distintos** que llegaron a
  compartir nombre: `docs/APU_INFORME_COMPLETO.md` es el informe de 10 433 líneas (§1.A-§1.I, el que
  citan los comentarios como «el informe») y `docs/APU_Y_RENTABILIDAD.md` es la investigación de
  fuentes de PRECIOS que sostiene el catálogo del editor. Ninguno sustituye al otro.

### Editor de APU: del objeto del proceso a un presupuesto (ago 2026)

Se apoya en el **catálogo de precios en Redis** (`lib/apu/catalogo.js` + `/api/admin/apu/cargar-catalogo`)
y añade lo que aquel no cubre: qué obra es, cuántas unidades, el AIU, la baja y el margen. Base
documental: `docs/APU_Y_RENTABILIDAD.md`.

- **`lib/apu/calculo.js` NO reimplementa el costo directo: LLAMA a `costoDirecto()` del catálogo.** Ahí
  viven ya las cuatro fórmulas del APU (mano de obra ÷ rendimiento con prestacional, materiales con
  desperdicio, equipo ÷ rendimiento, transporte por distancia, herramienta menor como % de la MO). Un
  segundo cálculo «equivalente hoy» diverge a la primera corrección que se aplique a uno solo — es la
  lección de `total_procesos`/`procesos_contados`, y aquí serían pesos.
- **`lib/apu/tipologias.js` está separado del catálogo de precios a propósito.** Aquel es PRECIO: vive
  en Redis, lo carga un administrador y cambia con el mercado. Esto es VOCABULARIO y TRADUCCIÓN: cambia
  con el criterio de negocio, tiene que verse en un diff y **no puede depender de que alguien haya
  corrido la carga**. Mezclarlos habría atado el clasificador —que funciona sin Redis— al estado de una
  clave que puede no existir.
- **DOS CORRECCIONES A LA FÓRMULA DEL ENCARGO, las dos con prueba.** (1) `(cantidad / rendimiento) ×
  costo_hora` ya es el TOTAL del ítem, no el unitario: sumarlo a unos materiales que sí son por unidad y
  volver a multiplicar por `cantidad` cobra la cuadrilla `cantidad` veces (en un ítem de 500 m², 500
  cuadrillas). El APU clásico calcula el UNITARIO y multiplica una vez; se obtiene el número que el
  encargo pretendía y además se cumple `cantidad × unitario = total`. (2) **AIU es Administración +
  Imprevistos + Utilidad: se SUMA, no se compone.** El `aiu_pct` del encargo es la «A». `15/5/5`
  compuesto da 26,8 % contra 25 % aditivo, y el aditivo es el de los pliegos tipo. `modo_aiu:
  "compuesto"` sigue disponible; el defecto no puede ser el que descuadra contra el formulario.
- **El rendimiento DIVIDE.** Error canónico del APU, con prueba de monotonía: bajarlo encarece la mano
  de obra sin tocar los materiales. Y el `rendimiento_override` **trabaja sobre una copia**: el catálogo
  es compartido entre peticiones de la misma instancia caliente y mutarlo filtraría el override del
  presupuesto de uno al de otro. Hay prueba de eso también.
- **`regionDeDepartamento` es el punto único de paso y PROHIBIDO `|| 1`.** El catálogo cotiza por REGIÓN
  (cinco, con ciudad cabecera) y SECOP publica DEPARTAMENTO: `data/apu_regional.json` traduce. Las cinco
  regiones cubren **14 de los 33** departamentos; los otros 19 salen `sin_base` con su motivo escrito.
  Asignar Vaupés a «Costa Atlántica» porque no hay nada mejor sería inventarse un dato, y un factor 1,00
  de relleno afirma «aquí construir cuesta lo mismo que en Bogotá». El presupuesto **sale igual**, con la
  región base y diciéndolo: no bloquear por falta de información. El desplegable marca cuáles no tienen
  precio de referencia — sin la marca, elegir Chocó parecería tan fiable como elegir Antioquia.
- **Sin catálogo en Redis se usa la semilla del repositorio, y se DICE** (`catalogo.fuente`). Hay prueba
  de que las dos vías dan el MISMO costo directo: son la misma tabla por dos caminos, y si divergieran el
  presupuesto cambiaría según quién hubiera corrido la carga.
- **TRES PUERTAS ANTI-FALSO-POSITIVO antes de emitir un ítem (ago 2026), y las tres LLAMAN a la regla
  que ya existía.** Faltaban, y el corpus real dio los tres casos: «SERVICIO DE INTERNET DEDICADO E
  INTERVENTORÍA…» sugería CON-EST (el segmento 80 está en los RUP porque ahí viven la gerencia y la
  interventoría); «ADIESTRAMIENTO DE CANINOS Y MANTENIMIENTO DE LA PLACA HUELLA…» con un 72141000 salía
  **VERDE con 6 ítems** —un APU de placa huella entero para un contrato de caninos, y el verde es el
  único estado que presupuesta sin pedir el pliego—; y «COMPRAVENTA DE TUBERÍA PVC» con un 4017 daba
  AGU-RED con ítems. El orden importa y cada puerta caza un caso distinto:
  · **`BLACKLIST_OBJETO` primero y sobre el texto CRUDO** (lleva `[oó]` y flag `i`: cambiarle la base de
    comparación sería una regresión silenciosa). Hace falta porque la PERTINENCIA **no cubre «caninos»**.
  · **`evaluarPertinencia(textoNorm, {codigos})`**, y **solo el ROJO rechaza**: su amarillo significa «el
    objeto no lo dice explícitamente», y cerrar por eso sería bloquear por falta de información. Se le
    pasa el texto NORMALIZADO — su contrato es `(textoNorm, …)`, y con texto crudo sus vocabularios no
    casarían y la puerta quedaría abierta en silencio.
  · **`esSuministroPuro(textoNorm, codigos)`**, que necesita los códigos por SEGMENTO: `nivelB` los
    devuelve ya normalizados en vez de recalcularlos. Sin códigos devuelve `false` por diseño.
  Las tres reutilizan la regla del repositorio a propósito: **tres listas paralelas de «esto no es obra»
  divergen a la primera corrección que se aplique a una sola**, y hay prueba que prohíbe fabricarlas.
  Los rechazos son `no_determinada`, no un cuarto estado: la invariante de que los estados suman los
  evaluados sigue valiendo. Hay prueba por MUTACIÓN de que las tres son necesarias —desactivar
  cualquiera resucita su caso— y otra de que no se sobrebloquea obra legítima («SUMINISTRO E
  INSTALACIÓN DE TUBERÍA» sí es obra y sigue pasando).
- **`lib/apu/inferencia.js` YA NO ES HOJA, y el comentario que decía lo contrario se corrigió.** Depende
  de `filtros`, con el `require` **DIFERIDO dentro de la función**: `filtros` participa en dos ciclos que
  resuelve con esa misma técnica (`filtros → rup → filtros`, `filtros → negocio → filtros`), así que
  pedirlo en tiempo de carga ataría este módulo a ese nudo. Hoy la cadena de `filtros` no alcanza `apu/`
  —hay prueba que recorre el grafo y lo comprueba—, pero el diferido lo hace cierto por construcción.
- **El clasificador es una cascada de tres niveles y solo están los dos primeros.** Nivel A léxico
  (ancla 3 · apoyo 1 · excluye −4, exigiendo verbo de obra de `lib/semantica`), Nivel B UNSPSC como
  evidencia INDEPENDIENTE cuyo valor real es **vetar** (placa huella con código 4017 es una red, no una
  vía → 🟡). El **Nivel C (LLM de desempate) NO se implementó**: el proyecto no tiene dependencias ni
  llamadas externas, y meter una en la ruta de una petición añadiría latencia y un fallo a un cálculo hoy
  determinista. La máquina de estados funciona sin él y cae a 🟡 o ⚪ donde el informe invocaría a C.
- **`anclas` son los términos que el informe publica en su tabla, uno a uno.** Demoterlos a `apoyo`
  (peso 1) fue el primer intento y dejó a TODAS las tipologías por debajo del umbral de 🟢: una placa
  huella perfectamente escrita sacaba 5 puntos de los 8 necesarios.
- **Los términos se comparan con frontera de palabra Y plural tolerado.** Sin el plural, media tabla no
  dispararía nunca (SECOP dice «vías terciarias»); sin la frontera, «parque» clasificaría un
  mantenimiento de **parque**adero como espacio público. `includes` a secas falla en el segundo caso y
  una frontera estricta en el primero.
- **El margen `P1−P2` es condición DURA**: dos tipologías empatadas nunca dan 🟢 aunque el puntaje
  absoluto sea alto. El falso positivo caro es el verde, el único estado que presupuesta sin pedir el
  pliego. Y los tres estados **suman exactamente los objetos evaluados**, con prueba.
- **Una tipología sin ítems en el catálogo lo DICE.** 19 de las 22 tienen cobertura; VIA-SEN, ELE-RED y
  CON-EST no. Una lista vacía es un dato, no un olvido, y el mensaje lo explica en vez de proponer ítems
  de otra cosa. El mapa tipología→ítems es EXPLÍCITO en el JSON: derivarlo del capítulo (texto libre) o
  del UNSPSC (7215 casa con casi todo) acabaría proponiendo pañete para una alcantarilla.
- **Decimal COLOMBIANO en la extracción de cantidades**: el punto separa miles. Invertirlo divide la obra
  por mil. Más el lookbehind (sin él «1500 km» captura 500) y la **regla de atribución a ≤ 6 palabras**:
  sin ella «…PLACA HUELLA VEREDA X, CONTRATO 2024-350» produce 2024 km.
- **UNA sola función serverless para las seis acciones** (`api/apu/[accion].js`). El plan Hobby de Vercel
  admite **12 funciones por despliegue** y el repositorio ya estaba en 12: un archivo más y **falla el
  despliegue entero**, no el endpoint nuevo. Por eso `/api/apu/catalogo` dejó de tener archivo propio y
  se plegó aquí — **misma URL, mismo contrato y sigue siendo PÚBLICO**. Hay prueba que cuenta los
  archivos bajo `api/` y otra que prohíbe que el archivo suelto reaparezca. `accion` se lee de
  `req.query` **y del path como respaldo**: la suite invoca los handlers sin enrutador, y un handler que
  solo funciona detrás del enrutador es un handler que no se puede probar.
- **`catalogo` es público; las otras cinco exigen token.** No es una excepción a la regla del proyecto,
  es la regla: lo que no sale sin llave son las CIFRAS DEL PERFIL. El catálogo son precios de referencia
  de mercado; escribirlos sí exige llave. `inferir`, `calcular`, `guardar`, `cargar` y `listar` sí la
  piden: son la máquina de armar una oferta y los borradores de un perfil concreto.
- **El listado NO tiene índice aparte**: SCAN + MGET sobre las propias claves. Un índice con TTL se
  desincroniza en cuanto caduca un borrador y listaría presupuestos que ya no existen. La clave ES la
  fuente de verdad. Un valor corrupto se CUENTA (`ilegibles`) en vez de tumbar la respuesta.
- **`anticipo_pct` aquí distingue `null` de `0`**, al revés que el campo homónimo del corpus de SECOP. Es
  legítimo y se declara: allí el 0 lo pone un dataset que no publica el dato; aquí lo teclea una persona
  que sabe que el proceso no tiene anticipo. Sin dato se calcula el escenario conservador.
- **`margen_final` es literalmente lo que pidió el encargo** (`precio_final − costo_directo_total`) y por
  eso NO descuenta impuestos: la contribución del 5 % (Ley 418/1997), las estampillas y el ReteICA se
  cargan en `deducciones_pct` y producen `margen_despues_deducciones`. Mientras no se carguen, una alerta
  recuerda la contribución con su cifra en pesos — es «el olvido más caro del país».
- **El .xlsx se escribe a mano (`public/xlsx.js`), sin SheetJS y sin `package.json`.** No es purismo, son
  dos hechos verificados: (1) SheetJS dejó de publicar en npm tras la **0.18.5**, que es lo que
  `npm install xlsx` instala, con dos advisories «high» y `npm audit` respondiendo literalmente **«No fix
  available»**; (2) la edición libre **IGNORA los estilos de celda al escribir** — se comprobó fijando
  `ws.A1.s = {font:{bold:true}, fill:{…}}` y el `styles.xml` sale con `<fonts count="1">`. Un «formato
  profesional de APU» no es alcanzable con esa librería. El escritor propio da control total y la prueba
  audita el ZIP entrada por entrada. Método **STORE** (sin comprimir): es ZIP válido, lo abren
  Excel/LibreOffice/Numbers y evita depender de que el navegador traiga `CompressionStream`.
- **(Hoy `apu.js` vive dentro de `public/app.js` — ver «Página única», ago 2026.) En su época, el arranque automático iba AL FINAL del IIFE**, tercera vez que se aplicó la misma
  lección (`app.js`, `admin.js`): junto al gate moriría en la zona muerta temporal en la segunda visita
  de la misma pestaña, y por una promesa rechazada, o sea EN SILENCIO. Hay prueba del orden.
- **El editor no se embebe por iframe** (hoy es una pestaña de la misma página; entonces se enlazaba desde `/admin.html`). `vercel.json` sirve todo el sitio con
  `X-Frame-Options: DENY`, así que el iframe que el encargo daba como alternativa quedaría en blanco en
  producción aunque funcione en local.
- **El bloque `j` del e2e corre ANTES de `h-bis` y limpia `apu:*` al terminar.** Necesita el estado «sin
  catálogo cargado» para probar la degradación a la semilla, y `h-bis` necesita Redis limpio para probar
  la carga. El orden no es casual y la limpieza tampoco.

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
| **PAA → alertar antes de que salga el proceso** (truco #9) | `lib/paa.js` + `/api/competencia-detalle?vista=paa` (alias `/api/paa`) consultan **en vivo** el dataset `9sue-ezhx` (columnas verificadas 2026-08-12) y devuelven lo previsto para los próximos 12 meses, filtrable por entidad y por UNSPSC (jerárquico). El toggle «Ver PAA» lo pinta en **sección aparte** con badge `PAA · planeado`. La **tasa de acierto se mide** con `lib/paa_acierto` (`?medir=1`, vigencia cerrada contra el corpus, cota inferior declarada) y viaja con su método. Lo que NO hay: ingesta a un keyspace propio (se consulta en vivo, no se guarda) | ✅ |
| **Pliego sastre → detección** (12 señales) | La única señal computable hoy es la **#11** (histórico de 1-2 oferentes), vía `indice_competencia`. **Ya no se interpreta a medias** (ago 2026): bajo 2 oferentes de media la tarjeta dice las DOS lecturas —nicho ganable **o** pliego a la medida— porque el dato no distingue cuál es; se avisa solo bajo ese umbral para no volverse papel tapiz (1 de 12 tarjetas lo dispara). El color NO se toca: pasarlo a ámbar afirmaría la lectura mala con la misma falta de evidencia. Las señales 1/3/4/5/6/7 exigen el texto del pliego, que el dataset no trae. **El tier `familia` NO es la señal #2**: indica codificación amplia, lo contrario de restrictiva | 🟡 |
| **Precio bajo incertidumbre → banda de descuento** (truco #11) | `lib/indice_baja.js` (`indice:baja:*`, tres granularidades en cascada + segmento + modalidad): `descuento = 1 − valor_adjudicado / precio_base` por entidad, sin re-extraer nada. Ya viaja en la tarjeta (`baja_mercado`, solo con token) y ordena con `?ordenar_por=baja` | ✅ |
| **Traslado → descargar ofertas de competidores** | El dataset no trae documentos de oferta: solo `urlproceso`. Automatizarlo exigiría raspar SECOP II (fuera de la arquitectura actual: sin dependencias, serverless, respuesta ≤4.5 MB). Alcanzable: enlazar la ficha del proceso y **listar adjudicatarios recurrentes por entidad** desde el histórico | ⬜ |
| **Subsanación → tabla de trazabilidad automática** | No existe. La app decide **a qué presentarse**, no arma la carpeta. Sería un generador de plantilla a partir de la ficha del proceso | ⬜ |
| **Consorcios → antecedentes del socio (SIRI/Contraloría/RNMC)** | `lib/socio.js` + `/api/inteligencia?op=socio&id=…` + «Verifique a su socio antes de firmar» en Mi empresa. **La premisa «no automatizable con datos abiertos» era falsa a medias (medido 17-ago-2026)**: SIRI está en datos.gov.co (`iaeu-rcn6`, diario) y las multas de SECOP I también (`4n4q-k399`); con `jbjy-vk9h` (contratos + representante legal) y `p6dx` (adjudicaciones) se automatizan 2 de las 5 fuentes; las otras 3 (Contraloría, Policía, RNMC: portales con captcha) van como checklist con enlace verificado. Semáforo que **nunca dice «limpio»** y regla del art. 90 Ley 1474 (inhabilidad reiterada) sobre lo visible | ✅ |
| **Formulario de cantidades del pliego → ítem + unidad + cantidad** (Cap. 11, §1.G del informe) | `/pliego.html` + `/api/apu/extraer-texto`: pdf.js en el navegador extrae el texto conservando columnas por coordenadas, `lib/apu_pliego.js` reconoce las filas por 3 vías, valida en 3 niveles y las gradúa con un semáforo de 2 ejes, `lib/apu_mapeo.js` las mapea al diccionario de reconocimiento de `data/catalogo_apu.json` y emite el código del catálogo de precios cuando el ítem existe allí. OCR.space como respaldo para escaneados. **Entrega cantidades, NO precios** | ✅ |
| **APU · base de precios regionalizada** (Cap. 11) | `lib/apu/catalogo.js` + `data/apu_catalogo.json`: estructura oficial INVIAS/IDU (CD = MO + materiales + equipo + transporte), 48 insumos × 5 regiones, 17 ítems con composición y rendimiento, factores de ajuste regional. Se carga con `POST /api/admin/apu/cargar-catalogo` y se consulta sin token en `GET /api/apu/catalogo`. Los precios son de **referencia**, no cotizaciones, y cada uno declara su `fuente` | ✅ |
| **Costos ocultos → calculadora de rentabilidad** | `lib/apu/rentabilidad.js` + el bloque `piso_techo`: el motor descuenta contribución del 5 %, estampillas y retenciones (`deducciones_pct`), garantías, costo financiero del capital de trabajo, anticipo, prima de riesgo y maldición del ganador, y publica `costos` desglosado. **Lo que falta NO es la calculadora: es el DATO.** `deducciones_pct` lo teclea el usuario y por defecto va `null`, así que el margen viaja declarado como COTA SUPERIOR (`margen_es_cota_superior`) en todo presupuesto que no lo cargue — y ese bloque puede ser ~10 % del valor, mayor que el margen típico de obra. Falta una tabla de estampillas y ReteICA por entidad/municipio, que no se puede inventar: sale del pliego o del dueño | 🟡 |
| **Precio bajo incertidumbre → a qué precio ofertar** (truco #11) | `lib/apu/optimizador.js` + el bloque `optimizador` de `/api/apu/rentabilidad` + el recuadro «Precio sugerido» del editor: barre las bajas plausibles alrededor de la mediana de la entidad y devuelve el precio que MAXIMIZA el valor esperado, con la curva y tres opciones (conservador / óptimo / agresivo). Es el consejo del manual —«valor esperado, no mínimo precio», porque el método de ponderación se sortea— convertido en una cifra que se puede aplicar con un botón | ✅ |

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
- **El ciclo electoral: MEDIDO el 16-ago-2026 (B2), y es al revés de lo que se suponía aquí.** Dentro
  de la ventana se presentaron MENOS oferentes por proceso (cociente 0,95, mediana 0,88 por entidad,
  2 170 entidades): más procesos diluyen a los oferentes. Sesgo agregado ~1 %: no se segmenta. La
  meta del índice (`periodos`) lo publica y se re-mide en cada reconstrucción. Lo que sigue: · Ley de garantías 2026:
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
- **«NO DEFINIDO» NO ES UN ADJUDICATARIO — TAMBIÉN EN LA PUERTA DEL ÍNDICE (16-ago-2026).** La
  trampa del literal estaba resuelta en `claveAdjudicatario` (equivalencias) pero `esAdjudicado`
  seguía tomando `nombre_del_proveedor: "No Definido"` por un ganador: **79 k procesos desde 2024**
  con `adjudicado=No` y respuestas entraban al índice de competencia como adjudicados (40 k en
  Evaluación, 13,6 k Seleccionados, 16,8 k Cancelados, 8,3 k Abiertos/Publicados — entre ellos una
  «lista multiusos» de la ERU abierta hasta 2027 con 34 respuestas, la «anomalía 2027»). Cerraduras:
  `RELLENOS_SIN_VALOR` se descartan ANTES de mirar si hay valor, y el índice cuenta por una regla
  EXPLÍCITA de **conteo final** (`cuentaParaCompetencia`: adjudicado, o estado Evaluación /
  Seleccionado, o fase posterior al cierre) — Evaluación y Seleccionado ya cerraron ofertas y su
  conteo vale (antes entraban por la trampa, no por regla); Cancelado y Abierto/Publicado no. El
  detalle de competencia usa el MISMO predicado (regla de oro: no es un segundo cálculo); la vista del
  adjudicatario sigue con `esAdjudicado` (quién GANÓ). `descartados.sin_adjudicacion` conserva el
  nombre: significa «sin conteo final». **Medido al reconstruir (16-ago-2026):** procesos contados
  104 702 → 92 919 (−11 %; 20 246 «sin conteo final» que antes entraban), entidades 3 490 → 3 405,
  μ 4,18 → 4,32, m 6,57 → 6,76, colisión 1,06 → 1,07; el «2027» desapareció de `por_anio`. Las
  cifras de μ/m citadas más arriba en esta memoria son las de antes de esta corrección.
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

### Rentabilidad del proceso: VEG, caja y payback (ago 2026)

El editor responde *cuánto cuesta*. `lib/apu/rentabilidad.js` + `POST /api/apu/rentabilidad`
responden *cuánto vale la oportunidad* y *si la empresa puede ejecutarla*.

- **EL COSTO DIRECTO NO SE RECALCULA AQUÍ.** `desdePresupuesto()` toma el `resumen` de
  `lib/apu/calculo.js` tal cual y le añade la capa que aquel no cubre. Un segundo cálculo del costo
  directo divergiría del primero a la primera corrección que se aplicara a uno solo, y una diferencia
  del 3 % entre dos motores de APU no se ve en pantalla: se ve cuando se pierde el proceso.
- **La acción va APARTE de `calcular`, y no dentro.** Es la única del módulo que toca la RED (índice
  de baja, índice de competencia, `lib/probabilidad`); fundirlas obligaría a pagar dos lecturas de
  Redis en cada tecla del editor.
- **`P(ganar | precio)` NO es una sigmoide monótona: es una MEZCLA** de «menor valor» (25 %) y
  métodos centrales (75 %). El método de ponderación **se sortea** en la audiencia (Ley 1882/2018),
  así que ofertar más barato no maximiza la probabilidad de ganar: la compra en un escenario de
  cuatro y la destruye en los otros tres. La sigmoide sigue publicándose aparte (`p_menor_valor`).
- **El multiplicador de precio vale EXACTAMENTE 1 en la mediana del mercado.** Sin esa normalización,
  `/api/apu/rentabilidad` y `/api/oportunidades` publicarían dos probabilidades distintas del mismo
  proceso. Hay prueba de la igualdad.
- **La FORMA de esa curva usa un `n` de REFERENCIA FIJO (6), no los oferentes de la entidad.** El
  efecto de nivel ya lo lleva `p_base` (`1/(1+rivales)`). Meterlo también en la forma lo contaba dos
  veces y rompía A.10 en el extremo: con una baja muy por encima de la mediana, el término central
  (1/n) del DENOMINADOR se encoge con `n`, infla el multiplicador y catorce oferentes acababan dando
  MÁS probabilidad que tres. Además no hay con qué calibrar esa dependencia —la curva se infiere, el
  corpus no trae las ofertas perdedoras—, así que fijar la forma hace la monotonía **demostrable** en
  vez de afortunada.
- **El AIU y la estructura de costos son DOS descomposiciones del mismo `V`.** El AIU es la
  estructura de PRECIO que se declara en la oferta: su «A» cubre nominalmente dirección de obra,
  pólizas, ensayos e impuestos. La rentabilidad usa la de COSTO, donde esas tres son líneas
  separadas. Usar la «A» declarada como si fuera el indirecto Y sumar aparte garantías e impuestos
  cobraba la administración dos veces y dejaba en rojo presupuestos sanos. Corolario: la **«I» del
  AIU tampoco es un costo** — es el ingreso que financia la prima de riesgo; restar las dos contaba
  el imprevisto dos veces.
- **`C_indirecto` es función del PLAZO** y por eso lleva el factor `T/T_ref` con una referencia
  declarada: sin él, alargar el plazo sin obra adicional no movería la utilidad, y la invariante A.11
  dice que no puede SUBIRLA.
- **El payback exige haber estado EXPUESTO.** Sin esa condición, un contrato con anticipo daría
  payback = mes 1 por el propio anticipo, que es dinero de la entidad y no capital devuelto.
- **El precio piso decide con σ = 15 %, no con 8 %.** La prima de la maldición del ganador CRECE con
  σ, así que usar el valor bajo sin calibrar produce un piso más bajo — exactamente el error caro.
- **Sin `deducciones_pct` del pliego el margen es una COTA SUPERIOR**, y viaja declarado. Un bloque
  de deducciones de hasta ~10 % del valor es mayor que el margen típico: omitirlo invierte el signo.
- **El borrador guarda su `id_proceso`, que NO puede ser su `id`.** El `id` del borrador lo propone
  el cliente y `ID_RE` no admite puntos, mientras que `id_del_proceso` de SECOP los trae
  (`CO1.REQ.123`). Son dos claves distintas a propósito, y la del proceso es la única con la que el
  panel puede encender «APU listo».
- **El listado de borradores se pide APARTE de `/api/resumen`**, cuya respuesta se cachea 300 s: un
  presupuesto recién guardado no puede tardar cinco minutos en encender el badge — es la misma razón
  por la que una carga de RUP borra esa caché. Aquí no hace falta borrar nada porque no se cachea, y
  `procesos_con_presupuesto` viaja como lista de PERTENENCIA, no como conteo, para que el frontend no
  pueda convertir un «no sé» en un cero con un `|| 0`.
- **El botón «APU» vive DENTRO de una fila cuyo clic abre SECOP II**, así que su clic burbujea: sin
  la guarda `closest(".btn-apu")` al principio del manejador, pulsarlo abriría además la ficha en
  otra pestaña. Hay prueba de que la guarda va ANTES de resolver la fila.
- **En `public/apu.js` la precarga del departamento corre DESPUÉS de cargar el catálogo.** Antes no
  existe la opción del desplegable que hay que seleccionar y la precarga se perdería en silencio; hay
  prueba del orden.

### Optimizador de precio de oferta (ago 2026)

`lib/apu/optimizador.js` + el bloque `optimizador` de `POST /api/apu/rentabilidad` + el recuadro
«Precio sugerido» de `/apu.html`. Cierra el circuito: el editor decía cuánto CUESTA y la
rentabilidad cuánto DEJA ese precio; esto responde **a qué precio ofertar**, que es la decisión.
Hasta aquí el dueño miraba la baja mediana y descontaba a ojo.

- **NO REIMPLEMENTA NADA: llama a `rentabilidad()` una vez por punto de la rejilla.** Un segundo
  cálculo del margen o de la probabilidad divergiría del primero, y la divergencia sería entre el
  precio que la app RECOMIENDA y el margen que enseña para ese mismo precio. Dos invariantes
  probadas lo atan: el punto evaluado en el precio VIGENTE reproduce EXACTAMENTE el bloque de
  rentabilidad (VEG, P, margen, K_max) y el punto en la mediana del mercado devuelve EXACTAMENTE la
  `p` de `/api/oportunidades` —el multiplicador de precio está normalizado a 1 ahí—.
- **TRES CORRECCIONES AL ENCARGO, las tres con prueba:**
  · **El descuento se mide contra el PRESUPUESTO OFICIAL, no contra el precio de venta.** El encargo
    pedía barrer «mediana − 10pp … + 5pp» y, en la misma frase, `precio = precio_venta × (1 −
    d/100)`. Las dos mitades no hablan de lo mismo: la baja de `lib/indice_baja` está DEFINIDA como
    `1 − adjudicado/precio_base`. En el corpus el precio de venta es el **69 %** de la cuantía, así
    que barrer la perilla sobre ese rango habría puesto toda la curva en una zona de baja real del
    30 %, donde la probabilidad es residual. La perilla viaja aparte y **por punto**, como
    `descuento_apu_pct`, con `precio_apu_resultante` (lo que SALDRÁ del editor, calculado con el
    `red` importado de `lib/apu/calculo` — reescribirlo incumpliría la promesa por céntimos).
  · **El VEG que decide no es `P × margen bruto`.** Ese margen no ha pagado la contribución del 5 %,
    ni estampillas, ni pólizas, ni el costo financiero, ni la maldición del ganador. `veg` es el
    MISMO del bloque de rentabilidad (`P × utilidad neta − costo de preparar`) y es el que elige; la
    fórmula literal del encargo se publica al lado como `veg_margen_bruto` para que la diferencia se
    vea. Dos cifras con el mismo nombre y distinto significado es `cargado`/`cargado_el` otra vez.
  · **Un precio por encima del presupuesto oficial no es una opción**: con mediana 7 % el rango del
    encargo arranca en −3 %, o sea un 3 % SOBRE el techo. La rejilla se recorta en 0 y lo declara
    (`rango.recortado_en_cero`). Dejar esos puntos los ofrecería como alternativas.
- **LAS TRES OPCIONES SON LOS EXTREMOS DE LA MESETA DEL VEG (±5 % del máximo), no un ±N pp
  inventado.** Y se camina CONTIGUAMENTE desde el óptimo: la curva es el producto de una mezcla de
  dos regímenes por un margen lineal y no hay garantía de que sea unimodal, así que tomar el mínimo
  y el máximo de la banda saltaría un valle y ofrecería como «casi igual de bueno» un precio
  separado por una zona que no lo es. Si la meseta colapsa **se dice** (el óptimo es agudo) en vez
  de fabricar tres puntos distintos.
- **EL DEFECTO CONOCIDO NO MUEVE EL PRECIO RECOMENDADO, y hay que contarlo exacto.** El precio se
  cobra DOS VECES (`docs/PROBABILIDAD_MEJORADA.md` §2.5c: `lib/probabilidad` ya multiplica por un
  factor de baja y aquí se vuelve a modular por precio sobre esa `p`). Ese factor es CONSTANTE a lo
  largo del barrido y `argmax_d [k·f(d) − c]` no depende de `k > 0`: afecta al NIVEL del VEG, no al
  argmax. Hay prueba que escala `p_base` y comprueba que el descuento óptimo no se mueve **y que el
  VEG sí**. Decir «queda arreglado» sería falso; decir «invalida la recomendación», también.
- **Sin centro de mercado NO hay recomendación.** Con la probabilidad plana el óptimo saldría
  siempre en «no descuente nada», que no es una recomendación sino la ausencia de una disfrazada de
  consejo. `aplicable:false` con su `motivo` (`sin_centro_de_mercado`, `sin_presupuesto_oficial`,
  `sin_costo_directo`, `rango_sobre_el_presupuesto`) y `sin_punto_rentable` en **`null`, no
  `false`**: no es que no haya precio rentable, es que no se miró ninguno.
- **Las deducciones ESCALAN con el precio.** `fiscal.tau_costo_valor` llega en pesos calculado sobre
  el precio vigente, pero debajo son PORCENTAJES del valor del contrato (contribución del 5 % +
  estampillas). Dejarlo fijo mientras se barre haría que bajar la oferta no ahorrara ni un peso de
  contribución y el barrido se inclinaría a precios bajos por una razón falsa. En el precio de
  referencia el objeto viaja TAL CUAL —sin reescalar ni redondear—, que es lo que hace exacta la
  igualdad con el bloque de rentabilidad.
- **La rejilla manda el DESCUENTO y el punto vigente manda el PRECIO.** Los puntos de la curva
  redondean al peso (un precio recomendado con céntimos no se puede ofertar); el punto vigente entra
  verbatim, porque `precio_final` sale de `calcularPresupuesto` con dos decimales y redondearlo
  bastaría para romper la igualdad. Hay prueba con un precio final CON decimales.
- **`contextoDePresupuesto` se EXTRAJO de `desdePresupuesto`, no se copió.** El endpoint necesita la
  misma traducción del presupuesto (AIU, fiscal, anticipo) para el optimizador; dos traducciones del
  mismo presupuesto habrían calculado la recomendación con una estructura fiscal y el margen que se
  enseña al lado con otra.
- **Va DENTRO de la acción `rentabilidad`, no en una nueva**: entonces el repositorio estaba en 12
  de 12 funciones (hoy en 6; plegar sigue siendo el default). Además allí ya están leídos el índice de
  baja, el de competencia y la `p` del proceso. `id_proceso` viaja y vuelve pero **no condiciona el
  cálculo**: es una etiqueta, y esconder la respuesta a quien escribió la cuantía pero no el id
  sería negarle el dato por no haber rellenado un rótulo. El `costo_directo_total` del cuerpo **no
  se acepta**: sería una segunda fuente de verdad del costo y podría recomendar un precio que no
  corresponde a los ítems en pantalla.
- **Frontend**: el recuadro sale SOLO tras «Calcular APU» cuando hay `id_proceso`, y solo si el
  cálculo salió bien —recomendar sobre un presupuesto que falló sería creíble y equivocado—. El
  botón «Aplicar este descuento al APU» escribe `descuento_apu_pct` (jamás `descuento`), enciende el
  ajuste competitivo y **recalcula por el mismo camino** que el botón «Calcular APU»: rellenar el
  campo sin recalcular dejaría el resumen enseñando el precio anterior. Hay prueba de las dos cosas.
  Cuando el precio óptimo está por encima del precio de venta el botón se deshabilita **y se
  explica** («le sobra margen: suba la utilidad o la administración»), que es el caso normal cuando
  la cuantía publicada está muy por encima del APU. La curva se pinta con un SVG en línea: el
  proyecto no tiene dependencias y una polilínea no justifica la primera.

### Catálogo de precios APU (ago 2026)

- **La investigación que el encargo daba por escrita NO existía.** `docs/APU_Y_RENTABILIDAD.md` no
  estaba en `main`, ni en la historia de `docs/`, ni en ninguna rama. Lo que sí existía es
  `modulo_apu.html`, **borrado en el commit `d69cfe8`**, y dentro llevaba toda la investigación de
  precios del proyecto: estructura INVIAS/IDU, precios base de Bogotá, índice de costo de las 32
  capitales y el ajuste ICOCIV del DANE. Se recuperó (`git show d69cfe8^:modulo_apu.html`), se
  consolidó en el documento que faltaba y **cada precio declara si es recuperado, derivado o
  estimado**. Antes de dar por perdida una fuente que el encargo cita, mirar la historia de git.
- **Los precios regionales se DERIVAN de un precio base y cuatro factores, nunca se transcriben.**
  Transcribir 5 × 48 números habría creado 240 sitios donde el catálogo puede desincronizarse de sus
  propios factores. Y el factor que se aplica depende del **tipo** del insumo: en la Costa el material
  sube (1,10) mientras el jornal baja (0,97) — con un índice único los dos irían al mismo sitio. Una
  cotización real gana sobre la derivación (`precios_cotizados`) y el hash publica
  `precio_origen_{region}`: una cifra sin su origen no se puede discutir, igual que
  `granularidad_utilizada` en el índice de baja.
- **La desagregación de los cuatro factores es RAZONADA, no medida, y por eso lleva cerradura.** La
  fuente recuperada solo trae **un** índice por ciudad. Recomponer los cuatro factores con la
  estructura de costos de obra civil (45/30/18/7) tiene que caer a menos de **0,015** del índice de la
  ciudad cabecera; hay prueba región por región. Sin ella, cualquiera podría retocar un factor «a ojo»
  y el catálogo dejaría de tener detrás el único dato duro que lo respalda.
- **`indice_ciudad_recuperado` contiene lo que su nombre dice**: el índice de la CIUDAD cabecera, no
  el promedio de la región. Meter ahí el promedio ponderado de las siete capitales de la Costa
  (1,057) habría puesto un dato derivado en un campo que anuncia un dato recuperado, y el contraste
  habría dejado de ser contra la fuente.
- **🚩 Un error de la fuente recuperada que NO se replicó**: su plantilla de acero cobraba el acarreo
  como `1.200 × 1,05 × 15` = **$18.900 por kilo**, más del doble que el acero — la tarifa está en
  $/m³-km y le pasaban kilogramos. Aquí `cantidad_por_unidad` de una línea de transporte va SIEMPRE en
  **m³ de material movido** (acero: `1,05 kg ÷ 7.850 kg/m³ ≈ 0,00013 m³`). Un APU con el 78 % en
  acarreo haría fijar precio muy por encima del mercado y perder todo proceso donde el acero pese.
  Hay prueba de que el acarreo no puede volver a pasar del 1 % del APU del acero.
- **Un cero no puede ser un precio** — la regla de `anticipo_pct = 0`, entera. Un insumo a 0 no es
  «gratis», es «no lo sé», y con él se costearía a la baja sin que nadie lo notara. Por eso la
  **herramienta menor no es un insumo**: no tiene precio propio (es un % de la mano de obra) y vive
  como `herramienta_menor_pct` del ítem. La validación rechaza precios ≤ 0 y rendimientos ≤ 0 (esto
  último sería una división por cero: precio infinito, no «gratis»).
- **Las cuadrillas son la SUMA de sus jornales** y lo declaran en `componentes`. Estaba así en la
  fuente (`299.000 = 95.000 + 3 × 68.000`) y se valida: si alguien sube el jornal del ayudante y no la
  cuadrilla, el catálogo diría dos cosas distintas sobre el mismo día de trabajo.
- **El AIU NO se regionaliza.** El campo existe porque el encargo lo pide, pero lleva el mismo valor
  en las cinco regiones (A 15 / I 5 / U 5, el default recuperado, dentro de las bandas del manual). El
  AIU lo fija el pliego y el riesgo del contrato, no la geografía: un gradiente regional sería
  fabricar una precisión que nadie midió. Ídem el factor prestacional (1,55): lo fija la ley.
- **El SNAPSHOT es caché; los HASHES son la verdad.** Servir el catálogo desde los hashes son ~70
  comandos por petición y desde el snapshot comprimido son dos, pero dos fuentes de verdad es el
  defecto que este proyecto ya pagó caro. El snapshot lleva **la misma `version`** que la meta y quien
  lo lee la compara: si no casa, o si un chunk está corrupto, cae a los hashes **y lo dice** en `via`.
  Hay prueba de que las dos vías devuelven exactamente lo mismo.
- **`cargado` es un BOOLEANO y la fecha es `cargado_el`.** Se llamaban igual, la meta se esparce sobre
  la respuesta y la cadena pisaba al booleano en silencio: el panel habría dicho «cargado» sobre un
  Redis vacío, porque una cadena no vacía siempre es veraz. Es exactamente
  `total_procesos`/`procesos_contados` otra vez —dos cosas distintas con nombres que colisionan— y la
  cerradura es una prueba de TIPO, no de valor.
- **La consulta es PÚBLICA y no es una excepción a la regla del token.** La regla es que no salen sin
  llave las CIFRAS DEL PERFIL (patrimonio, K, CRPC, tope), que son datos financieros de personas
  identificadas. El catálogo son precios de mercado de referencia: no hay nada que redactar. Lo que sí
  exige llave es ESCRIBIRLOS, y por eso la carga vive en `/api/admin/`.
- **La carga es TODO O NADA y el sello va al final**, igual que el POST de RUP: se valida el catálogo
  entero antes del primer `HSET`, y `apu:catalogo:meta` se escribe después de los hashes y del
  snapshot. Un catálogo a medias daría precios que parecen buenos.
- **El botón del panel fuerza la reescritura (`?forzar=true`) aunque la librería sea idempotente por
  defecto.** `cargarCatalogo()` no reescribe si el sello ya está —que es lo que pide el encargo—, pero
  una pulsación que no hace nada visible es peor que un error (la lección del modal). Consultar el
  estado sí corre al arrancar el panel: es público y son dos comandos; CARGAR escribe ~70 claves y
  solo corre cuando alguien pulsa.
- **Lo que el catálogo NO incluye, dicho en la propia respuesta**: ni AIU aplicado ni **ninguno** de
  los costos ocultos del Cap. 11 (contribución del 5 %, estampillas, retenciones, pólizas, costo
  financiero del capital de trabajo, ensayos, PMA/SST, liquidación). El APU es costo directo; eso va
  encima y es «el olvido más caro del país». La calculadora de rentabilidad es la Fase 2.

### Calibración Nogal, importación de Excel y libro APU (ago 2026)

- **El catálogo se calibró con un contrato ADJUDICADO del propio dueño**: «Presupuesto Nogal 4»
  (UPN-VAD-CP-009-2025, Consorcio Infraestructura 1A, Bogotá 2025). 157 ítems `NOG-*` y 389 insumos
  con `fuente: "adjudicado"` — el cuarto origen, más fuerte que recuperado/derivado/estimado. El
  motor REPRODUCE el `VR COSTO DIRECTO` del pliego: 149 exactos al peso, 7 a ±$1, y **NOG-B57 +$55
  clavado en prueba** (su APU traía una línea de equipo con cantidad NEGATIVA que el esquema no
  admite; se descartó declarándolo). Método y anomalías respetadas en `docs/CALIBRACION_APU.md`.
- **La verdad de cada APU del pliego es el RANGO de su fórmula** `ROUND(SUM(Ea:Eb)/2)`, no la
  proximidad de las filas: con texto, «EQUIPO CASSETTE 360…» parecía cabecera de sección y el aire
  acondicionado perdía $14,9 M. Y en C78/C79/C80 el subtotal del pliego OMITE una línea (queda a
  medio peso en su CD): se reproduce SU aritmética con peso 0,5, listado en
  `_meta.calibracion.lineas_a_peso_medio`. El precio adjudicado manda sobre la corrección «obvia».
- **Las cuadrillas del Nogal cotizan el día CON prestaciones**: el catálogo guarda `precio ÷ 1,55`
  (el motor re-aplica el prestacional regional) y conserva el literal en
  `precio_dia_con_prestaciones`. SIN `componentes`: el pliego no publica los jornales y inventarlos
  rompería la validación que exige que una cuadrilla sume sus partes. Los FLETES del Nogal son
  valores cerrados por ítem → `distancia_km = 1` con la cantidad del pliego.
- **`cargarCatalogo` escribe por LOTES de 16 con `Promise.all`**: ~620 claves en serie contra la API
  REST de Upstash rozaban el `maxDuration` de 60 s. Claves distintas, orden irrelevante, sello al
  final: la garantía «todo o nada visible» no cambia.
- **«Cargar ítems desde Excel»**: el archivo se lee EN EL NAVEGADOR (`public/xlsx_lectura.js`, UMD
  navegador+Node como xlsx.js) y al servidor viajan solo las filas; la acción `importar` de
  `api/apu/[accion].js` (POST, token) las mapea contra el catálogo con `lib/apu/importar.js`, que
  REUTILIZA las primitivas de `lib/apu_mapeo` (tokenización que conserva dígitos, umbrales, margen
  0,12) — no una segunda definición de similitud. Capa propia: **plural tolerado a ambos lados**
  (sin ella «Desmonte de Cielo Raso» no casaba con «DESMONTES DE CIELO RASOS»; el catálogo de
  precios no tiene sinónimos curados que lo compensen) y unidad CANÓNICA por grafía (m≈ml,
  UND≈un) sin convertir jamás.
- **POLÍTICA DE PRECIOS DE LA IMPORTACIÓN, medida con el caso real**: el precio del ARCHIVO manda
  siempre (`precio_manual`, `origen_precio:"archivo"`, ítem del catálogo como referencia declarada
  en `cd_catalogo`); un mapeo «revisar» SIN precio del archivo NO cobra el catálogo por su cuenta —
  la fila «PENDIENTE-POSIBLE USO DE RIEL…» (24 und, $0) salía presupuestada en $2,9 M inventados.
  La sugerencia se acepta por casilla en la vista previa. Un precio 0 (del archivo o tecleado) es
  «sin dato», jamás gratis. Los ítems con precio manual suman al total pero caen en
  `por_componente.sin_desglose`, y **material+mano_obra+equipo+transporte+sin_desglose = costo
  directo total** tiene prueba. Y un precio/cantidad que llegue como TEXTO a la API se lee con
  `numeroColombiano` (punto = MILES): el parser ingenuo leía «74.596» como 74,596 pesos — mil veces
  menos, la familia de «375.0000» — y hay prueba que lo clava.
- **El LECTOR parsea el ZIP por el DIRECTORIO CENTRAL** (un xlsx en streaming deja los tamaños del
  local header en 0) y la descompresión se INYECTA (`DecompressionStream` en navegador,
  `zlib.inflateRawSync` en Node y pruebas); sin inflador y con partes DEFLATE el error sugiere CSV,
  nunca una lista vacía. `numeroLocal` es la TERCERA copia de `numeroColombiano` y `parsearCsv` la
  SEGUNDA de onboarding: las pruebas las EJECUTAN sobre la misma batería, no comparan strings.
- **La exportación es el formato Nogal** (`public/apu_libro.js`, UMD: el navegador y el generador de
  Node usan EL MISMO constructor): capítulos a dos niveles, fórmulas `=D×E` y cierre A/I/U +
  **IVA 19 % sobre la utilidad** + TOTAL (como cierra la referencia), firmas, y hoja «APU» por ítem
  desde `detalle.insumos` — que ahora sale de las `lineas` de `costoDirecto` (el MISMO cálculo que
  produjo el total; el desglose anterior reconstruía a ciegas y no podía respaldar la cifra).
  Marcadores con contrato: ÁMBAR = precio sin APU de respaldo (suma y se declara), ROJO = sin
  precio (no suma, celdas de dinero VACÍAS).
- **En OOXML `<f>` lleva el `=` implícito**: escribirlo produce `==D7*E7` y rompe la celda en todos
  los lectores — pasó, y hay prueba de que ningún `<f>` empieza por `=` y de que toda fórmula viaja
  con su valor cacheado (igual al del motor). Los estilos nuevos van AL FINAL de `ESTILOS` (el
  orden es el contrato) y **ningún numFmt nuevo**: la prueba exige exactamente 4.
- **`tests/generar_electrico_nogal.js` es DETERMINISTA** (misma entrada → mismos bytes: fecha ZIP
  fija, sin relojes): regenerar `tests/electrico_nogal_apu.xlsx` solo cambia bytes si cambió el
  catálogo, el mapeo o el formato. El snapshot `tests/electrico_nogal_filas.json` deja el flujo
  reproducible sin el archivo original del dueño. Diferencias contra los dos Excel de referencia,
  ítem a ítem, en `docs/DIFERENCIAS_APU.md`.

### Techo retail por insumo (ago 2026)

Encargo del dueño (2026-08-13): precios de TIENDA (Homecenter, Easy, listas de fabricante) como
referencia — «le sirven como techo negociable; él sabe cuánto negociar» —, 100 % trazables (fuente +
ciudad + fecha de captura) y con cobertura de capitales. `data/apu_retail.json` (capturado con
`tests/capturar_retail.js`) + `lib/apu/retail.js` + campo `techo_retail` en `detalle.insumos` de
`calcular` + nivel `retail` declarado en la cascada de `lib/apu/precios.js`. Verificación en vivo
con evidencia HTTP en `docs/INVESTIGACION_COMPETENCIA_APU.md` §8–§10.

- **El techo es POR INSUMO y JAMÁS entra en `costoDirecto`.** Una tienda cotiza el saco de cemento y
  el metro de cable, no el m³ de excavación: como precio de ítem sería el error de categoría del
  nivel `mercado` («el segmento agrupa, nunca empareja») traducido a vitrina. En la cascada el nivel
  `retail` se declara SIEMPRE con `techo_de_insumo` — la frase es la cerradura contra «completar la
  cascada» con un precio de otra categoría. Hay prueba de que el costo directo no se mueve un peso.
- **Homecenter regionaliza EN EL SERVIDOR y Easy NO.** La PDP con cookies `usrLocation=<dpto>;
  comuna=<ciudad>` responde el precio de esa ciudad (cemento: $29.200 Cúcuta ↔ $37.900 Ibagué,
  ±13 %); la API JSON `s/search/v1/soco` solo obedece `priceGroup=` e ignora las cookies — dos
  canales, dos palancas. `ZONE_ID` NO es la palanca (la conclusión vieja era correcta en el hecho e
  incompleta en la inferencia). Easy responde el MISMO `regionId` con `sellers:[]` para 9 códigos
  postales de punta a punta: precio único nacional, y así se declara (`alcance: "nacional"`).
- **LA BÚSQUEDA DE UBICACIÓN DEVUELVE BARRIOS HOMÓNIMOS PRIMERO, y costó dos precios falsos**:
  «ARAUCA» casa con el barrio ARAUCARIA-ITAGÜÍ (Envigado) y «FLORENCIA» con un barrio de Medellín —
  la primera captura escribió el precio de Antioquia etiquetado como Arauca. El capturador exige que
  el `state.name` de la ubicación case con el departamento esperado; sin coincidencia → sin
  cobertura DECLARADA, jamás el homónimo.
- **8 departamentos sin cobertura retail, escritos en el JSON con su motivo** (Amazonas, Arauca,
  Caquetá, Guainía, Guaviare, San Andrés, Vaupés, Vichada): ahí la referencia cae al precio de
  Bogotá con `ambito: "Bogotá — sin captura retail en tu departamento"` — declarado, nunca
  disfrazado de precio local. Y las categorías que el retail NO cubre quedan dichas en `_meta`:
  áridos a granel por m³ (solo saco de 40 kg — el equivalente es un MÚLTIPLO del precio de cantera),
  concreto premezclado en mixer y acero figurado.
- **La unidad de la fuente NO se convierte, salvo división exacta de la MISMA dimensión** (tubo de
  6 m → $/ml), declarada en `normalizacion.nota`. La densidad de la arena no es un dato del catálogo
  y no se inventa; el peso nominal de la varilla (NTC 2289) sí viaja como nota declarada. Cada
  correspondencia imperfecta va como `aproximada` con su nota (THHN ≠ TC LS-ZH, gravilla común ≠
  triturado 3/4") — pintarlas como equivalencias exactas sería el falso positivo caro del módulo.
- **La captura es una herramienta MANUAL con red (`tests/capturar_retail.js`), no parte de la suite
  ni de la app**: la app jamás llama a una tienda en la ruta de una petición. Un 4xx no se
  reintenta; un 5xx sí (Armenia y Pasto dieron 500 transitorios). El precio de la PDP se ancla al
  nombre del producto pedido (la página trae SOLO los precios del producto principal, verificado) y
  un precio 0 o sin confirmar NO se escribe.
- **Listas de fabricante curadas A MANO con su vigencia IMPRESA** (Gerfor feb-2025, Eternit feb-2026
  — la fila es la P7 N.º 8 EXACTA, no la N.º 5 «parecida»—, Procables sin fecha impresa → vigencia =
  fecha de descarga, dicho). Hallazgo clave para el futuro: **Coval Comercial publica la lista
  vigente de cada fabricante en URL estable** (`coval.com.co/pdfs/listasprecios/ult_<marca>.pdf`) —
  Sika, Eternit, Durman (sustituto de Pavco, que sigue 403), Grival, PCP. Pintuco es imagen (solo
  OCR); Acesco no publica precios.
- **La columna «Precio de tienda» del editor** (encargo del dueño, ago 2026): cada fila de la tabla
  del paso 3 —y de la vista previa de importación— enseña el precio retail de su material con la
  fuente, el ámbito y la fecha pegados; el producto LITERAL de tienda viaja en el `title` para
  auditarlo sin abrir nada. Sigue siendo REFERENCIA: hay prueba de que no mueve un peso del costo
  directo. Tres decisiones: (1) para un ítem del catálogo la referencia sale de su **insumo de MAYOR
  PESO en pesos** con captura (`via: "insumo"`) — «el primero» enseñaría el agua en un ítem de
  concreto; (2) para una fila importada o manual se casa la DESCRIPCIÓN contra los insumos con
  captura (`via: "descripcion"`, `referenciaTiendaDe` en `lib/apu/importar.js`) usando **las mismas
  primitivas del mapeo** (una segunda definición de «se parecen» divergiría), y el vocabulario del
  candidato incluye el **nombre COMERCIAL del producto de tienda** — «VARILLA CORRUGADA» casa con el
  acero de refuerzo porque así se llama en Homecenter, y sin esto la columna quedaba vacía justo en
  las filas escritas como las escribe la gente; (3) sin captura la celda dice «—»: la ausencia no se
  rellena (`null`, jamás un precio de otra cosa). El `departamento` viaja de la importación
  (`opciones.departamento` en `mapearFilasImportadas`) para que la referencia sea la de SU capital, y
  la resuelta en la importación se GUARDA en la fila: sobrevive repintados y se ve nada más pegar el
  Excel, sin esperar al cálculo. De paso, el paso 3 quedó con DOS botones a la vista («Calcular APU»
  y «Exportar Excel»); guardar/abrir borrador es administración y vive plegado en un `<details>` —
  los ids no cambiaron (renombrarlos mataría app.js en silencio).

### Referencia oficial INVIAS por insumo (ago 2026)

Capa 3 del plan de cobertura nacional (`docs/INVESTIGACION_COMPETENCIA_APU.md` §7): el banco de
insumos de los APU Regionalizados del INVIAS (API ArcGIS `hermes2.invias.gov.co`, tabla «Insumo» =
unión de Material+Equipo+Transporte, 183.010 registros, 140 provincias × 32 departamentos, JSON sin
token) capturado a `data/apu_invias.json` con `tests/capturar_invias.js` (herramienta MANUAL con
red, como la retail) y servido por `lib/apu/invias.js` (hoja) → campo `referencia_invias` en
`detalle.insumos` de `calcular`, bloque `invias` junto al `retail`, y nivel `invias` declarado en la
cascada de `lib/apu/precios.js`. Evidencia HTTP en el §11 del mismo doc.

- **RE-CAPTURADO A 2026-1 EL 16-AGO-2026, DESDE EL EXCEL OFICIAL, no desde la API.** El INVIAS
  publica cada vigencia PRIMERO en un libro de todo el país
  (`hermes2.invias.gov.co/APUs/Provincias/Territorio_APU_{año}_{sem}.xlsx`, 16 MB, hojas «INSUMO
  MATERIALES» / «INSUMO_EQUIPO» / «INSUMO_TRANSPORTE» con una columna por provincia) y la API va por
  detrás (ese día: API hasta 2025-2, Excel ya en 2026-1). `tests/capturar_invias.js --xlsx <libro>
  --vigencia 2026-1` lo lee con `public/xlsx_lectura.js` (el lector del proyecto, 1,2 s) y produce el
  MISMO JSON: mismas correspondencias, misma cerradura de unidad, nombres de departamento/provincia
  CANONIZADOS a los de la API (el Excel escribe «ARCHIPIÉLAGO DE SAN ANDRÉS…» y «Vertiente
  Occidental»; `lib/apu/invias` agrupa por «San Andrés» y «Vertiente Occidente»). Un código que la
  vigencia nueva ya no trae NO se adapta por similitud: en 2026-1 el INVIAS renumeró los transportes
  y T0010025 desapareció; su SUCESOR T0100034 («transporte de materiales excavación / préstamo») se
  declaró A MANO leyendo los 45 transportes del libro (`sucesores` en la correspondencia). **La
  comparación de medianas contra la vigencia anterior se imprime Y SE GUARDA**
  (`_meta.contraste_vigencia_anterior`, cocientes 0,74–1,40 en los 23 códigos, 140/140 provincias) y
  la suite prohíbe commitear un cociente fuera de [0,5; 2]: es la mirada que cazó lo de 2025-2,
  convertida en cerradura. Sanidad contra el catálogo: acero $4.585/kg (catálogo Bogotá $4.397),
  arena $81.325/m³ ($81.666), triturado $100.356 ($96.324). Nada de la app cambió: `lib/apu/invias`
  lee el JSON tal cual y la vigencia viaja declarada en cada referencia.
- **LA VIGENCIA 2025-2 DE LA API ESTÁ CORRUPTA EN ORIGEN, y por eso se capturó 2025-1 (ago 2026).** Medido
  contrastando las DOS vigencias del mismo código en las 140 provincias: acero de refuerzo a
  $122.000/kg (37× el mercado; 2025-1 da $3.280), agua a $15.900/L (145×; 2025-1 da $110), emulsión
  CRL-0 IDÉNTICA en las 140 provincias (p10 = p90 — huella de un cruce de columnas). Se cazó
  MIRANDO las medianas contra el mercado, no confiando en que «lo oficial es bueno»; antes de
  re-capturar una vigencia nueva hay que repetir esa comparación (cabecera del capturador) y hay
  prueba de que la meta explica por qué no se usó la última. El rezago viaja DECLARADO en cada
  referencia.
- **23 códigos curados A MANO leyendo el censo completo de una provincia** (Ibagué 7301, 647
  filas), jamás por similitud de texto: 7 correspondencias exactas y 16 aproximadas CON NOTA. La
  unidad de la fuente NO se convierte salvo multiplicación exacta de la MISMA dimensión (kg → saco
  de 50 kg, L → m³), declarada en `normalizado.nota`. Hora vs día NO se convierte (no existe una
  jornada en el repositorio — la lección del «costo horario») y m³ vs tonelada tampoco (la densidad
  de la MDC-19 no es un dato del catálogo). En una re-captura, un código cuya unidad cambió ABORTA
  en vez de adaptarse.
- **Los huecos quedan declarados con motivo** (`categorias_sin_invias`): el banco no cotiza
  concreto premezclado (sus APU lo producen desde agregados — el mismo hueco que declara el
  retail), ni mano de obra (los jornales viven en los Excel semestrales, no en la API), ni
  mampostería/acabados (es un banco VIAL); la subbase solo existe «con agregado siderúrgico», que
  es otro producto — mapearla a la SBG convencional sería el falso positivo caro.
- **Referencia, jamás precio**: no entra en `costoDirecto` (hay prueba de que no mueve un peso) y
  el nivel `invias` de la cascada se declara SIEMPRE con `referencia_oficial_insumo` — la tercera
  cerradura de la familia `no_aplica_a_item`/`techo_de_insumo`.
- **El municipio del proceso no se conoce, así que la provincia exacta tampoco**: con varias
  provincias en el departamento se publica la MEDIANA departamental (reproducible a mano, con
  prueba) MÁS la lista provincia a provincia (viaja en el `title` del desglose, el patrón de la
  columna de tienda). Bogotá D.C. no está en el banco: se responde la mediana nacional DECLARADA,
  nunca disfrazada de precio local. Cobertura: los 32 departamentos — incluidos los 8 sin retail y
  los 19 sin factor regional del catálogo.
- **`returnDistinctValues` da 400 en este servidor ArcGIS**: para censar se pide UNA provincia
  (cada código aparece exactamente una vez por provincia y vigencia). El fallo de ArcGIS viaja
  DENTRO del 200 (`j.error`), como en OCR.space. Un 400 no se reintenta; 429/5xx sí, con backoff.
- **Contraste que valida ambas fuentes**: el acarreo oficial ($1.263,6/m³-km, mediana nacional
  2025-1) casi calca el del catálogo Nogal ($1.256/m³-km). Y la licencia va dicha: los documentos
  INVIAS prohíben el uso comercial sin autorización — si Detekta se comercializa con estos datos,
  pedirla (`preciosunitarios@invias.gov.co`).

### F0-7 · La predicción que se le enseñó se CONGELA al guardar (24-ago-2026)

`lib/handlers/perfil/seguimiento.congelarPrediccion` + `prediccion` en el registro guardado y en
`lib/seguimiento.enriquecer` + `desenlaceDe` en el módulo puro. Era **la única tarea del repositorio
con fecha límite absoluta** (`docs/PLAN_DE_ACCION.md:235`) y no dependía de nada: cada día sin
guardarla es un día de datos que no vuelve.

- **El problema no era de código, era de tiempo.** `P(ganar)` **no es falsable**: el corpus dice quién
  GANÓ, no a qué se presentó nadie. `lib/seguimiento` ya recogía `presentado · ganado · perdido` —la
  etiqueta que falta— pero **sin la predicción de aquel momento no hay nada contra qué compararla**.
  Verificado antes de tocar nada: `fotoDe` guardaba once campos y **ninguno era la probabilidad**.
- **NO ES UN SEGUNDO CÁLCULO, y ahí estaba la única decisión de arquitectura.** El contexto de
  `estimarPDetalle` (índices de competencia y de baja, promedios por departamento, colisiones, b_max
  de los borradores) se arma en ~170 líneas de `handlers/procesos/listar.js`, entrelazadas con el
  handler. Reconstruirlo aquí habría sido **una segunda derivación de la probabilidad** —
  `total_procesos`/`procesos_contados` otra vez, y en pesos. Se llama a **`desgloseDeProceso`**
  (`lib/probabilidad_desglose`), que ya arma ese contexto y que **ya tenía prueba de reproducir
  exactamente el `p_ganar` del listado**. Medido en la suite: `p = 0.0608 ≡ listado`.
  · Se descartó extraer `evalDe` de `listar.js`: es cirugía en el endpoint más caliente de la app por
    una razón lateral. El precedente del repositorio (`contextoDePresupuesto` «se EXTRAJO, no se
    copió») aplica cuando no hay ya una función que responda; aquí la había.
- **LA CALCULA EL SERVIDOR, JAMÁS EL CLIENTE.** La `foto` sí puede venir del cuerpo (es lo que el
  usuario tenía en pantalla), pero una `p` propuesta por el cliente envenenaría el único registro con
  el que se podrá validar el modelo, y un frontend viejo o cacheado mandaría la cifra de otro momento
  sin que nadie lo notara. Mismo criterio que `visto`, que se toma del corpus. Hay prueba de que una
  `prediccion` en el cuerpo **se ignora** y el servidor la recalcula.
- **SOLO AL CREAR.** Es la cifra del día en que DECIDIÓ, no la última: recalcularla al cambiar de
  estado reescribiría la predicción con el modelo de hoy y se perdería justo lo que esto conserva.
  Lo único que se actualiza después es el **desenlace**.
- **`desenlaceDe` vive en el módulo PURO, junto a `normalizarEstado`**, y solo `ganado`/`perdido` lo
  fijan. «descartado» es una decisión del usuario, no un resultado del proceso, y «presentado» aún no
  tiene desenlace: contar cualquiera de los dos como derrota metería una **etiqueta falsa** en el
  registro de calibración. Es «sin dato ≠ cero» aplicado a la etiqueta, y aquí el cero sería un
  fracaso inventado. Viaja `null`, jamás `false`.
- **Viajan las ENTRADAS, no solo el número** (`rivales_esperados`, `fuente_del_promedio`,
  `peso_datos_entidad`, `banda_90`, `p_sin_precio`, `baja_maxima`): sin ellas se sabría QUE falló una
  predicción, no POR QUÉ. Es la trampa que el propio plan declaraba.
- **Best-effort: si el desglose falla, se guarda `null` CON su motivo y el guardado sigue.** Perder el
  proceso guardado por no poder calcular una cifra de instrumentación sería cambiar el producto por su
  medición.
- **Los guardados anteriores a esta versión se quedan sin predicción, y es lo correcto**: recalcularla
  hoy y etiquetarla con la fecha de entonces sería inventar el dato que esto existe para conservar.
- **`enriquecer` construye un objeto NUEVO, así que publicar el campo no era opcional.** La primera
  implementación guardaba `prediccion` en Redis y la lista no la enseñaba: es «el veredicto de un
  bloque no puede leer un campo que ese bloque no publica», y lo cazó la prueba, no la lectura.


### Mis procesos · guardar, seguir y estudiar a la competencia (18-ago-2026)

`lib/seguimiento.js` (capa pura) + `lib/handlers/perfil/seguimiento.js` (`/api/perfil?op=seguimiento`, token) +
botón «Guardar» en la tarjeta + sección `#seccion-seguimiento` en Mi empresa. Encargo del dueño: guardar procesos
(interesa / me presenté / descartado), seguir el cronograma de SECOP con avisos, y cuando cierra, de cada proponente:
cuántas veces se ha presentado a la entidad y cuántas ha ganado (último adjudicado), cuántos contratos vigentes tiene
(cuándo firmó y por qué valor), y si está inhabilitado. Decisiones que no hay que re-aprender:
- **Se guarda una FOTO MÍNIMA y se enriquece VIVO en cada consulta** (`seguimiento:{perfil}` = un JSON, ≤ 200; la fila
  se busca en `cargarCorpus` del listado): estado SECOP, adjudicado, días al cierre (hora Colombia), hitos y avisos.
  Un proceso que ya no está en el activo conserva la foto y lo dice (`en_corpus:false`). La fila CRUDA no trae
  `fecha_cierre` resuelto: se deriva con la MISMA `fechaCierre` de lib/negocio (require diferido).
- **Los hitos y avisos SON los de lib/cronograma** (`hitosDeFila`, `avisosDe`, `ics`), más la APERTURA de ofertas cuando
  el dataset la trae; el .ics se baja con cabecera y Blob (el token no viaja en la URL).
- **La ficha del competidor publica lo que las fuentes dicen, con su fuente, y lo que no está viaja null**: veces ante
  la entidad por hgi6 **por `codigo_entidad`** (a diferencia del NIT no se comparte entre regionales); ganadas y último
  adjudicado por p6dx por `nit_entidad` (se advierte que puede sumar hermanas); contratos VIGENTES por jbjy
  (`estado_contrato in ('En ejecución','Modificado','Suspendido','Prorrogado')` — los valores reales del dataset) con
  cuántos, valor y las 5 firmas más recientes. **Eso NO es la K residual del competidor**: la K exige sus indicadores
  del RUP, que no son públicos; se rotula «valor comprometido», jamás capacidad. La inhabilidad la resuelve el flujo
  «Verifique a su socio» que ya existía (botón «Verificar» con el NIT). «No Definido» no es un NIT. Todo con tiempo
  acotado (6 s), best-effort, caché 1 h (`seguimiento:detalle:v1:{id}`, `refrescar=1` la salta).
- **El mock Socrata de la suite aprendió `campo in ('a','b')` genérico** y sirve hgi6 por la rama genérica cuando el
  `where` no es un `in` simple; el fixture hgi6 lleva `codigo_entidad` y hay contratos vigentes del recurrente en jbjy.
  `limpiarRedis` purga `seguimiento:*` y `pulso:*`. La prueba de jerga prohíbe «capacidad residual» en app.js.

### Mis procesos como pestaña, centro de alertas y manifestación de interés (18-ago-2026)

Encargo del dueño: (a) aviso de la **manifestación de interés** en la selección abreviada de menor cuantía — «super
importante, el ing tiene el interés en este espacio en específico» — tanto en la lista como en el seguimiento; (b)
«Mis procesos» como **pestaña aparte** (el volumen puede ser grande); (c) avisar **cambios de cronograma** y cuando
cualquier evento del cronograma de un guardado se acerca; (d) inspirarse en rastreadores bien hechos. Decisiones:
- **La regla de la manifestación es UNA y vive en una HOJA: `lib/manifestacion.js`** (`exigeManifestacion`, `aperturaDe`,
  `filaManifestacion`, `manifestacionDeFila`, `PLAZO_MANIFESTACION_HABILES`, `NORMA`). Estaba en `lib/portada` (Fase 9)
  y ahora la importan también `lib/filtros_lista` (clasifica cada fila del listado) y `lib/seguimiento`; `portada`
  **requiere** a `filtros_lista`, así que un require de vuelta habría cerrado un ciclo — de ahí la extracción, sin
  cambiar la regla ni la norma. `portada` la re-exporta (prueba de identidad de función).
  ⚠️ **SUPERADO (20-ago-2026)**: esta Fase 9 publicaba UNA fecha calculada (apertura + 3 hábiles) y el booleano
  `vencida`. Los dos desaparecieron: el 3 del D. 1082/2015 art. 2.2.1.2.1.2.20 es un **TECHO**, no el plazo, y
  tomarlo por el plazo produjo un defecto de producción. Hoy se publica una VENTANA de dos extremos
  (`puede_cerrar_desde` / `vence_a_mas_tardar`) y un estado de cuatro valores — ver «La manifestación de interés:
  una VENTANA, no una fecha» más abajo. Se deja escrito lo que había porque la corrección no se entiende sin ello.
- **En la lista**: `manifestacion` por fila (`clasificar(l).manifestacion`), chip en la tarjeta («Manifestar interés ·
  vence HOY/mañana hábil/N días hábiles · hasta jueves 20 de agosto»; vencido en gris), línea roja «Atención» a ≤2 días
  hábiles (la hermana de la regla de las 24 horas), aviso ámbar bajo la barra con la cifra de `facetas.manifestacion`
  (`total · abiertas · urgentes · vencidas · sin_fecha`) y botón «Ver solo estos», casilla en la hoja de filtros
  (`#fl-manif`) y parámetro `manif=abierta|todas` (`public/filtros.js` PARAMS/leerEstado/escribirEstado/fichas;
  `lib/filtros_lista.cumple`). Un valor desconocido es INERTE (la regla de `?zona=`). `abierta` exige `vencida === false`:
  la sin fecha entra en «todas» y no en «abierta».
- **La pestaña `#tab-seguimiento`** (nav de escritorio y barra móvil, que pasa a 4 columnas; `PESTANAS` = licitaciones ·
  seguimiento · apu · admin; alias `#/mis-procesos`): `#seccion-seguimiento` y todos los `seg-*` se MOVIERON dentro con
  sus ids (la suite los mira). Se pide FRESCO cada vez que se abre (un GET). Arriba el **centro de alertas**
  (`#seg-alertas`, `alertasDe` en lib/seguimiento: cambio · manifestación ≤2 hábiles · cierre hoy/mañana · avisos T-7/3/1
  de cualquier hito, ordenado por urgencia y fecha, solo 7 días, y sin los procesos ganados/perdidos/descartados), la
  **insignia** de la pestaña con `resumen.atencion` (cambios sin ver + alertas de urgencia alta; oculta en 0), filtros
  por **etapa** (chips) y la lista. Los estados pasaron a ser un RECORRIDO: interesa · preparando · presentado · ganado ·
  perdido · descartado (`orden_estados`); un valor desconocido sigue cayendo a «interesa». «Verificar» un NIT desde aquí
  cambia a Mi empresa antes de hacer scroll (la sección del socio vive allí).
- **Cambios de cronograma = foto VIVA del corpus vs lo último que el usuario dio por visto.** `CAMPOS_VIGILADOS`
  (cierre, apertura, presupuesto, modalidad, estado SECOP); `cambiosDe(vista, viva)` — un null en cualquiera de los dos
  lados NO es cambio (R1); `visto` se escribe con **`POST {id, enterado:true}`** y lo toma el SERVIDOR del corpus
  (`fotoViva`), no del cliente; al guardar por primera vez la referencia toma el `estado_secop` vivo para que un cambio
  de estado desde ese día se detecte. Los guardados de producción anteriores no traen `estado_secop` en la foto: ese
  campo solo empieza a vigilarse tras el primer «Enterado». La foto ORIGINAL no se toca (es «cómo era el día que lo
  guardé»); «Enterado» no cambia el estado.
- **El hito «manifestacion» entra al cronograma** (`hitosDe(l, hoy)`, origen `calculado`, evidencia = la nota) y por tanto al
  .ics y a los avisos T-7/3/1; `enriquecer` publica `manifestacion` compacta por guardado, y el resumen
  `manifestaciones_abiertas/urgentes`, `cambios_pendientes`, `por_estado`, `atencion`.
- **La prueba no toca los fixtures del corpus** (una fila viable más por mes movería totales de media suite): clasifica
  filas sintéticas con `crearClasificador`, cruza el listado real con `manif=todas` (el corpus ya trae «Selección
  abreviada menor cuantía» del día 10 de cada mes, todas vencidas) y, en Mis procesos, calcula una apertura cuya
  fecha límite es HOY (retrocediendo hasta que `sumarHabiles(apertura, 3) === hoy`) — un fixture con fecha fija
  caducaría.

### ⚠️ EL PLAZO DE MANIFESTACIÓN NO ES DE TRES DÍAS: TRES ES EL TECHO (20-ago-2026)

**Defecto de producción reportado por el ingeniero.** La app enseñó, en rojo y en imperativo, «El
plazo para manifestar interés vence mañana (jueves 20 de agosto): hágalo hoy en SECOP II» sobre
**MM-SA-MC-008-2026** (MUNICIPIO DE MOTAVITA, Boyacá). En SECOP II ese plazo **ya había cerrado**:
estado `ClosedForReplies`, lista de interesados publicada con «¿Sorteo realizado? **Sí**» y la última
manifestación del **martes 18 a las 11:24 AM**.

- **CAUSA RAÍZ: se aplicaba un TECHO LEGAL como si fuera un plazo.** `PLAZO_MANIFESTACION_HABILES =
  3` se sumaba a la apertura y el resultado se presentaba como la fecha de vencimiento. El D.
  1082/2015 art. 2.2.1.2.1.2.20 num. 1 dice «en un término **NO MAYOR a** tres (3) días hábiles» —lo
  transcribe el propio `docs/datos.md` §7— y quien fija el plazo concreto es **la entidad, en el
  pliego**. Motavita fijó **UNO**: apertura viernes 14 → cierre el martes 18 (primer hábil; el 15 fue
  sábado y el 17 el festivo de la Asunción trasladado). La app tomó el extremo superior del rango y
  lo publicó como el único valor, **dos días hábiles tarde**.
- **Es «una inferencia presentada como una medición» otra vez, en el sitio más caro que existe**: un
  aviso rojo, en imperativo, sobre el único trámite sin el cual no se puede ofertar. Un contratista
  que se fía pierde el proceso creyendo que llegaba a tiempo. No hay ningún otro sitio de la app
  donde equivocarse cueste más.
- **LA CONTRADICCIÓN ESTABA EN LA MISMA TARJETA Y NADIE LA MIRABA**: «Cierra en 2 días · 21 de
  agosto» (dato PUBLICADO) a dos centímetros de «Manifestar interés · vence mañana · 20 de agosto»
  (dato CALCULADO). Por el num. 3 del mismo artículo, si hay sorteo el plazo de ofertas **empieza** el
  día hábil siguiente al informe del sorteo: entre el 20 y el 21 no cabe ni el sorteo, ni el informe,
  ni el plazo de ofertas. **Un calculado que contradice a un publicado pierde siempre.**

**La regla, después: una VENTANA con dos extremos, no una fecha.** `lib/manifestacion.js` publica
`puede_cerrar_desde` (apertura + **1** hábil) y `vence_a_mas_tardar` (apertura + 3 hábiles), y el
`estado` tiene **tres** valores: `abierta` (hoy < el primer hábil: con certeza sigue abierta) ·
`por_confirmar` (la ventana está corriendo: puede seguir abierta o haber cerrado) · `vencida` ·
`sin_fecha`. **`por_confirmar` es el estado de MÁXIMA urgencia, no el de menor**: manda a SECOP II
HOY. Decisiones que no hay que re-aprender:

- **`vencida` COMO BOOLEANO NO EXISTE, y hay prueba de que no puede volver** (ni en el servidor ni en
  los módulos del navegador). Su `false` se leía como «sigue abierta», que es exactamente la
  afirmación que la app no puede hacer. Es el `sin_dato` contra el `0` del proyecto, en booleano: la
  ausencia de vencimiento **conocido** se estaba sirviendo como vencimiento **futuro**.
- **NO HAY CUENTA ATRÁS SIN FECHA CONFIRMADA.** `quedan_habiles` y `dias_calendario` viajan en `null`
  salvo que la fecha venga del **cronograma del pliego** (`origen: "cronograma"`, `confirmada: true`).
  Un contador es una afirmación. `habiles_hasta_el_techo` existe **solo para ORDENAR** por urgencia y
  se llama así para que nadie lo pinte como una cuenta atrás.
- **COHERENCIA CON EL CIERRE DE OFERTAS PUBLICADO** (num. 3): el techo se recorta a
  `cierre_ofertas − 1 hábil`; si con eso la ventana queda al revés, la apertura que se está usando no
  puede ser la buena → `sin_fecha` con `motivo_sin_fecha: "cierre_de_ofertas_no_deja_sitio"`, y se
  dice. No se afirma nada sobre una ventana imposible.
- **EL PELDAÑO 1 DE LA CASCADA YA ESTABA CONSTRUIDO Y DESCONECTADO.** `lib/cronograma.js` reconoce
  desde la Fase 5 el hito `manifestacion` («Fecha límite para manifestar interés») leyendo el pliego
  — la fecha REAL, la que fija la entidad — y nunca se cableó a la regla. Ahora
  `manifestacionDeFila(l, hoy, { fechaCronograma })` la acepta, manda sobre la ventana y es **la
  única con la que se cuenta hacia atrás**. Con ella, la respuesta correcta para Motavita el 19 es
  «venció el 18», y hay prueba.
- **EL RECORDATORIO DEL CALENDARIO SE ANCLA AL PRIMER DÍA EN QUE EL PLAZO PUEDE CERRAR**, no al techo
  legal: en un `.ics` el error tiene que caer del lado de avisar **antes**. Es la misma doctrina que
  la regla de las 24 horas.
- **`estadoDeVentana` es la ÚNICA derivación del estado** y la comparten `filaManifestacion` y el
  handler que refresca la ventana precalculada con la fecha del día. Dos derivaciones del mismo
  estado divergirían — la lección de `total_procesos`/`procesos_contados`.
- **`?manif=abierta` incluye `por_confirmar` a propósito**: excluirlo escondería justo las urgentes,
  que es lo contrario de lo que pide quien marca la casilla. En las facetas, `urgentes ⊂ abiertas`.
- **LA PRUEBA QUE DE VERDAD CIERRA ESTO EJECUTA LO QUE SE PINTA.** Las guardas por regex demuestran
  que una función se LLAMA, no lo que ESCRIBE — y el daño lo hizo una cadena. `chipManifestacion` y
  `avisoManifestacion` se EXTRAEN del fuente de `app.js` y se ejecutan con el objeto real del proceso
  de Motavita en cuatro fechas; la aserción central prohíbe literalmente que aparezca «vence mañana»
  sin `confirmada`. Es el patrón de `fraseProbabilidad`, aplicado donde más falta hacía. Lección de
  método, hermana de la del paso 2 de Génesis: **comprobar por regex que una función se llama no
  prueba que lo que dice sea verdad.**
- **De paso, un flake latente en la suite**: la prueba de `textoActualizado` daba por hecho que «hace
  26 horas» siempre cae en «ayer», y entre medianoche y las 02:00 de Colombia son **dos** días atrás.
  Fallaba sola en esa franja y pasaba el resto del día. El «ahora» se inyecta, como en las pruebas de
  husos y de días hábiles.
- **Lo que este entorno NO pudo verificar, dicho en vez de disimulado**: el proxy de la sesión bloquea
  `datos.gov.co` («Host not in allowlist»), así que la fila real de Motavita no se pudo consultar. El
  diagnóstico se apoya en las capturas de SECOP II del ingeniero, en el censo de columnas ya medido
  en `docs/datos.md` §7 y en la reproducción del defecto ejecutando los módulos. La aritmética de la
  ventana (14 ago + 1/3 hábiles = 18/20 ago, con el festivo del 17) sí está verificada contra
  `lib/habiles`.

**EL PELDAÑO 1 YA ESTÁ CABLEADO (misma sesión).** El dataset no publica la fecha límite (medido,
`docs/datos.md` §7), así que la única vía para AFIRMARLA es el pliego. `lib/cronograma` ya extraía el
hito; ahora `/api/pliego?op=cronograma` lo **persiste** al leerlo y el listado y Mis procesos lo
consumen. Con el pliego leído, la tarjeta pasa de «verifique HOY si sigue abierto» a «vence mañana,
martes 18». Decisiones:
- **Se PRECALCULA al leer el pliego y la petición del usuario solo LEE** (el criterio de la portada):
  releer hasta 400 KB de texto por proceso en cada listado es inviable. Un campo por proceso en
  `manifestacion:cronograma`, **un `HGETALL`** para todo el listado, y solo si el corpus trae alguna
  de menor cuantía. Sin pliego leído no cambia absolutamente nada.
- **`lib/manifestacion` sigue siendo HOJA**: el cliente de Redis se INYECTA, no se importa (el patrón
  de `lib/almacen`). Nada purga esa clave, así que la poda va dentro, con cota dura (2 000 campos,
  120 días) — se mira el tamaño con un comando barato y solo se reescribe cuando de verdad crece.
- **EL CAMINO «CONFIRMADO» NECESITA SU PROPIA CERRADURA o repite el defecto con otra etiqueta.** Los
  hitos se extraen por REGEX de línea y un pliego puede rotular «manifestación de interés» la línea
  de PUBLICACIÓN (SECOP II escribe «publicación del pliego definitivo **y demostración de interés**»).
  La fecha del pliego solo se acepta si cae **entre el día siguiente a la apertura y el techo legal**;
  fuera de ahí se descarta, viaja en `fecha_cronograma_descartada` y el motivo se escribe en la nota
  —**auditable, nunca usada**—. Hay prueba de que una descartada jamás se pinta como fecha límite.
- Best-effort: `guardarFechaCronograma` no lanza. Mejora otra pantalla; no puede tumbar la lectura
  del cronograma que se pidió.

**CINCO DEFECTOS MÍOS QUE ENCONTRÓ LA AUDITORÍA DE LA PROPIA CORRECCIÓN.** Se dejan escritos porque
cuatro son de familias que este repositorio ya conoce:
- **Escribí la prueba vacua que este mismo defecto enseña a no escribir.** La guarda del frontend
  recorría las apariciones de «vence HOY/mañana» y comprobaba que la cadena `m.confirmada` estuviera
  **en algún sitio del bloque** — se cumple sola. Sustituida por una **prueba de propiedad EJECUTADA**:
  168 casos (14 días × 4 hipótesis de cronograma × 3 filas) que exigen «`vence hoy/mañana` ⟹
  `confirmada === true`», que `vencida` no empuje a un trámite imposible y que `sin_fecha` avise en
  ámbar. La prueba **declara los cuatro estados que tiene que ejercitar** y falla si alguno no sale.
- **Una segunda prueba vacua, esta preexistente**: el bucle que validaba `op=manifestacion` recorría
  un array VACÍO con el corpus de prueba, así que no ejecutaba ni una línea. **Escondía un 500**: el
  handler importaba `sigueValiendoLaPena` de `lib/portada`, que no lo re-exportaba → `is not a
  function` en la primera petición con la ventana llena. La ventana se siembra ahora a propósito y
  hay prueba POR MUTACIÓN de que quitar el export tumba la suite. Lección: **un bucle de aserciones
  sobre una lista que puede estar vacía es una prueba que puede no existir**; si el caso importa, hay
  que sembrarlo.
- **Un `${3}` cableado a mano** en el mensaje de las alertas y otro en el frontend, duplicando
  `PLAZO_MANIFESTACION_HABILES`. El techo viaja ahora en `plazo_maximo_habiles` y ninguna pantalla lo
  escribe.
- **`hoy` sin guarda**: con `undefined`, `hoy > hasta` y `hoy < desde` son las dos falsas y la máquina
  respondía `por_confirmar` **en silencio**. Se cae al día de Colombia.
- **`sin_fecha` no producía ningún aviso**: un proceso que exige el trámite y cuyo plazo no se pudo
  situar pasaba callado. Ahora avisa **en ÁMBAR** — el rojo significa «actúe hoy» y aquí lo honesto
  es «verifíquelo», sin fingir una urgencia medida.

**DOS DEFECTOS AJENOS QUE SALIERON POR EL CAMINO, los dos visibles en la captura del ingeniero:**
- **EL VEREDICTO SE CONTRADECÍA CON EL PLAZO.** «Cumple los requisitos para presentarse» encima de un
  chip gris que dice «plazo vencido» son dos afirmaciones incompatibles: sin la manifestación **no se
  puede presentar**. Medido: en el corpus de prueba, **64 de 64** procesos de menor cuantía servidos
  tienen la ventana cerrada, y en producción pasa lo mismo por construcción (el trámite dura 3 días
  hábiles y el proceso sigue listado semanas). El proceso **NO se oculta** —pudo haber avisado a
  tiempo y la app no lo sabe: el falso negativo cuesta más— pero `lineaRequisitos` recibe ahora la
  manifestación, baja a ámbar y dice «solo puede presentarse si avisó a tiempo». `?manif=abierta` ya
  era el filtro para verlos separados.
- **EL BARRIDO A REGISTRO FORMAL DE AGO-2026 SE SALTÓ LA LÍNEA MÁS VISIBLE DE LA APP.** Cada tarjeta
  decía «Cumpl**ís** los requisitos para presentar**te**» y «Pod**és** presentarte… pens**á** en
  anticipo» — voseo, justo lo que el dueño había mandado quitar, y sale en la captura que envió. La
  prueba de registro solo miraba **las frases de la portada**; ahora ejecuta las siete ramas de
  `lineaRequisitos` y barre el fuente de los seis módulos del navegador. **«su RUP» se conserva**: es
  el nombre propio del documento, el uso que la regla de la Fase 6 mantiene a propósito — se cambió
  por error y una prueba ya fijada lo devolvió.

**El aviso rojo vive exactamente 4 días de oficina** (del día de la apertura al techo legal) y luego
se apaga en gris: la ventana de ruido está acotada y medida. Y la faceta
`facetas.manifestacion {total, abiertas, urgentes, vencidas, sin_fecha}` se imprime en cada corrida de
la suite, así que el alcance deja de ser una impresión.

### Segunda ronda de correcciones del dueño (18-ago-2026): tipos de trabajo, lenguaje, frases, conceptos de orden

- **«Suministro de porciones de comida» bajo el filtro de obra: la causa era sistemática.** Se bajaron 726 procesos
  servidos (helder + genesis): bajo «obra» caían (a) COMPRAS con el verbo de obra DETRÁS de «para» («SUMINISTRO DE
  MATERIAL GRANULAR PARA EL MANTENIMIENTO DE VÍAS»: el verbo dice qué hará la entidad con lo comprado), (b)
  MANTENIMIENTO DE EQUIPOS (ascensores, aires, extintores, vehículos, UPS, licenciamiento) donde «mantenimiento» era
  el único verbo de obra, y (c) ALQUILER de maquinaria — 104 de 726. `lib/filtros_lista.tipoTrabajoDe` los reclasifica
  (`esCompraPorLaCabeza` sobre la cabeza antes de «para/con destino/destinado/en apoyo», mirando la DESCRIPCIÓN y el
  NOMBRE por separado porque el nombre suele ser la modalidad; `esServicioDeEquipos` = EQUIPOS_RE sin
  OBRA_CIVIL_FUERTE_RE — que **no lleva sustantivos de LUGAR** («escuela», «sede», «hospital»): «ascensores de la
  ESCUELA» no es obra por la escuela; `ALQUILER_RE`; y `SERVICIO_NO_OBRA_RE` corta y literal — comida, logística,
  fiducia, licencias, análisis de laboratorio). **`servicios` pasa a venir APAGADO por defecto** como `suministro`
  (`TIPOS_POR_DEFECTO` = obra · consultoría · interventoría). Nada de esto toca la cascada de juicio: reclasifica lo que
  quien consulta VE bajo cada tipo. Contrato «Obra» declarado por la entidad sigue mandando.
- **El «error de animación al elegir departamento» era el selector de la hoja de filtros volviendo a vacío** nada
  más elegir (es un control que AÑADE) con la ficha apareciendo detrás del velo: se elegía y «no pasaba nada». Ahora
  los departamentos elegidos se ven como chips con × DENTRO de la hoja (`#fl-dep-elegidos`) y el selector dice «Añadir
  departamento…». Y desde el pulso, si hubo cambio de pestaña, ya no se hace `scrollIntoView` suave encima de la
  animación de entrada del panel (se pisaban): basta el `scrollTo(0)` de `activarPestana`.
- **Consorcios: «Consorcio N» por defecto** (siguiente al mayor guardado; borrar no renumera) en vez del nombre
  derivado ilegible; `etiquetaConsorcio` en app.js evita «Consorcio · Consorcio 1». La composición sigue en `rol`.
- **REGISTRO FORMAL (usted), Bogotá.** El dueño: «el lenguaje debe ser profesional, como es eso de "para vos"». Barrido
  de ~95 cadenas visibles (index.html, app.js, onboarding.js, pliego.js, filtros.js, apu_libro.js, lib/apu/precios,
  lib/rup_pdf, lib/handlers/admin/rup, lib/perfil_manual, lib/probabilidad_desglose, lib/accesibilidad, listar, pulso):
  voseo y tuteo → usted («Su registro de proponente», «Suba el certificado», «Verifique a su socio», «Las mejores para
  usted», «Su precio»). La suite prohíbe voseo/tuteo en las frases de la portada y varias aserciones cambiaron de
  literal. Cuidado con `/verific/`: «verifique» NO lo contiene («conviene verificar…»).
- **`public/frases.js`: 255 frases curadas** (registro formal, ≤ 110 caracteres, sin emojis ni jerga, sin
  voseo/tuteo, ninguna repetida) sobre lo público como bien común, el derecho a competir, el oficio, el territorio, la
  información y el papel de la herramienta; **rotación cada 15 s** (antes 7: «no duren tan poquito») empezando en una
  al azar. `onboarding.js` conserva las 6 originales como RESPALDO (la primera va en el HTML). El dueño pidió «unas
  1000»: son 255 escritas una a una — se prefirió calidad; ampliar es añadir al arreglo.
- **Cada ORDEN dice su concepto** (`ORDENES[].concepto` en `public/filtros.js`, `Filtros.conceptoDe`, `#orden-concepto`
  bajo la barra y `title` en las opciones): qué hace ese orden y qué NO promete. Y **`ve` se llama por lo que es**:
  «Mayor contrato esperado» / «de contrato esperado por intento» = presupuesto oficial × opción de ganar
  (`lib/probabilidad.valorEsperado`), promedio por intento que cuenta las veces que no se gana, **NO utilidad**. La
  nota anterior decía que «descontaba el costo de ofertar», y el cálculo NO lo hace: era una promesa sin respaldo.
- **«Las interventorías son las que más dejan» — investigado con los datos reales (18-ago-2026):** NO es lo que
  muestra el orden por contrato esperado hoy (mediana obra $82 M vs interventoría $41 M; el top-10 por VE es obra;
  p mediana obra 0,20 vs interventoría 0,18; rivales medianos 4,2 vs 4,7). Lo que sí ocurre: en «Las más ganables»
  aparecen interventorías/consultorías de municipios pequeños con ~1,2 rivales (Tauramena), y en el consorcio dos
  interventorías de $6 137 M entran al top-10 por VE por TAMAÑO. La lectura «deja» venía del rótulo, no del dato: por
  eso el rótulo cambió. Los datos por tipo se pueden reproducir bajando el listado y agrupando por `filtro.tipo`.

### Segundo banco oficial de ítems: los precios de referencia del IDU (Bogotá, ago 2026)

Investigación previa (17-ago-2026), para no repetirla: buscando una base de precios de EDIFICACIÓN vigente y
alcanzable desde aquí, lo que hay es (a) **IDU · Visor de Precios Unitarios de Referencia 2026-I Fase I
(29-jul-2026)**, xlsx público en `idu.gov.co/page/siipviales/economico/portafolio`, 3 172 APU valorados de
infraestructura vial y espacio público de Bogotá + 2 740 insumos — se integró; (b) en `datos.gov.co` (Socrata,
mismo cliente): Boyacá `ae7u-y7m2` (1 255 ítems con capítulo EDIFICACIONES, **2022**, Res. 092/2022) y Valle
`e839-6uct` (3 579, **2019**) — VIEJOS: usarlos tal cual entendería el costo un 30-40 % por debajo (el falso
positivo caro del módulo) y traerlos a 2026 exige un índice oficial (IPC/ICOCIV DANE) que no se fijó de
memoria; quedan como candidatos con esa condición; (c) BLOQUEADOS desde aquí (403): ICCU/Cundinamarca 2025
(`iccu.gov.co/wcm/connect/ICCU/…/LISTA+DE+PRECIOS+ICCU+2025.pdf`), Cali (`cali.gov.co/documentos/1045/
precios-unitarios/`), Antioquia (sin buscador), FFIE (no publica precios). **La edificación pura (mampostería,
pañetes, cubiertas, acabados) sigue con los 157 del Nogal**: el camino más corto es que el dueño baje la lista
ICCU 2025 o la de Antioquia desde su navegador y la entregue. Decisiones que no hay que re-aprender:
- **`IDU:` es SOLO PRECIO y SOLO BOGOTÁ.** El visor publica el valor del APU sin composición ni componentes,
  así que el ítem sale como precio SIN desglose (`sin_apu: true`, va a `sin_desglose`, cuatro componentes en
  `null`) con `origen_precio: "idu"` y `referencia_idu_apu` (vigencia, publicado, APU, capítulo,
  `ajuste_regional: bogota|ninguno`). Fuera de Bogotá el precio es el mismo y se DECLARA (aviso en el ítem y en
  las alertas): sin componentes no hay a qué aplicar los factores del catálogo y un factor único sería inventado.
  Los insumos del visor «como regla general tienen en cuenta el IVA» (texto del visor); los APU son costo directo.
  Se EXCLUYEN las hojas de proyecto específico (el visor dice que solo valen para su proyecto) y los valores
  estimativos de conservación. `tests/capturar_idu_apu.js` (manual, con red) → `data/apu_idu_items.json`.
- **El badge «IDU 2026-I · Bogotá» no es verde ni ámbar** (estado `idu`, misma clase que `invias`): oficial y con
  vigencia, sin composición y sin ajuste. Va ANTES de la rama `sin_apu` genérica en `clasificarOrigen` (comparte
  la forma —sin desglose— y no el significado); la fila no se pinta ámbar; el Excel marca `  🔵 IDU 2026-I ·
  Bogotá (precio de referencia oficial, sin composición)` y la hoja APU escribe «PRECIO DE REFERENCIA IDU… — SIN
  COMPOSICIÓN PUBLICADA». Nivel `idu_apu` en la cascada, después de `invias_apu`.
- **En el importador, el mismo ítem en dos bancos NO es una duda entre dos ítems**: INVIAS e IDU comparten la
  clave de familia por cabecera (`oficial:<cabecera>`), así «SUBBASE GRANULAR CLASE C» de los dos no cae a
  «revisar» por margen; **cuál gana lo decide el departamento** (`rango`: en Bogotá IDU > INVIAS; fuera, INVIAS
  regionalizado > IDU sin ajuste; siempre catálogo > oficiales > estimado). Las variantes IDU de la misma
  cabecera se publican como las del INVIAS.
- **`tokenizarItem` funde «clase X»/«tipo X» (UN carácter) en un token** (`clasec`): «clase» y «tipo» son
  stopwords y la letra sola no llegaba al mínimo, así que SUBBASE CLASE A/B/C eran el MISMO conjunto de tokens
  (tres candidatos a 0,90 con margen 0). «TIPO A10» no se funde: ya sobrevive solo. `apu_bench` sigue en verde.
- **«Firme» por COBERTURA TOTAL además de por margen**: si TODOS los términos de la fila (≥ 3) están en el
  candidato, la unidad coincide y el puntaje es ≥ 0,85, es firme aunque el margen sea < 0,12 — el segundo de
  otra familia solo puede ser un pariente que PIERDE justo el término que la fila trae («clase C» 0,90 contra
  «clase B» 0,795 = margen 0,105). Sigue exigiendo ≥ 3 términos: «Subbase granular» a secas queda en revisar,
  y «PENDIENTE… LUMINARIA» también.
- **PODA de candidatos: solo se puntúa (Levenshtein) a los que comparten ≥ 1 término con la fila.** Sin ella,
  300 filas × 3 900 candidatos tardaban 29 s (el tope de la función son 60). No cambia ninguna decisión: un
  candidato sin términos en común no puede aceptarse (0,22 × edición + 0,13 × unidad ≤ 0,35 solo con edición 1,
  que implica los mismos términos) ni mover el margen de un firme (mejor ≥ 0,60 contra un tope de 0,35).
- **Costo visible**: la respuesta de `/api/apu?op=catalogo` crece ~1 MB (`items_idu`, se comprime en tránsito);
  se carga UNA vez al abrir Precios. Si pesa, lo que se recorta son campos (`subcapitulo`), no ítems.

### Mi empresa es la pestaña PRINCIPAL y Precios sin prosa (encargo del dueño, ago 2026)

«Vamos a reformar la pestaña de Mi empresa: ahora esa va a ser la principal; en esa van a aparecer los datos
más impactantes, que mayor ganas le den de licitar; aplicá el mismo criterio a Precios». Medido antes de tocar
(Chromium, producción): Mi empresa 2 356 px / 460 palabras (sin pulso); Precios 545 palabras a primera vista.
Decisiones que no hay que re-aprender:
- **Orden de pestañas: Mi empresa · Licitaciones · Precios**, en escritorio y en la barra móvil, y `#tab-admin` es
  el PRIMER `<main>` (nace visible; Licitaciones y Precios, `hidden`). Sin hash se abre Mi empresa; **una URL
  con filtros de la Fase 8 (`?cierre=7d`, `?dep=73`) es un enlace A LA LISTA y abre Licitaciones aunque no
  traiga hash** (la puerta de entrada y la portada los generan así). `#/empresa` y `#/mi-empresa` son alias
  de `#/admin` (`ALIAS_PESTANA`): los ids no cambian —renombrarlos mataría app.js—, la URL sí puede leerse.
- **El PULSO se movió a Mi empresa** (nodos movidos, ids intactos: `#pulso`, `#mercado-completo` con la portada
  plegada) y **cada cifra LLEVA a la lista**: `aplicarFiltroDelPulso` aplica el filtro y cambia a Licitaciones,
  que ahora empieza por la barra de herramientas. Lo que hay que VER va arriba y a la vista; lo que hay que
  TOCAR va plegado: `#rup-gestion` (subir/descargar/eliminar el registro) y `#exp-gestion` (cargar la
  experiencia) nacen cerrados; `#exp-actual` (lo cargado) sube ENCIMA del pliegue; Consorcio y Socio comparten
  fila. Las cifras de Mi empresa bajaron de 460 a ~220 palabras (fuera del pulso) sin perder ningún control.
- **«Tu registro de proponente» EN CIFRAS**: `/api/perfil?op=pulso` publica ahora `empresa` (tipos de trabajo,
  familias, experiencia acreditada en salarios mínimos, contratos acreditados, tope; **patrimonio y capacidad
  de contratación SOLO con token válido o para un perfil `rup_…`** —la regla del token: son cifras del
  perfil; un `cons_…` mezcla perfiles del dueño y exige token—). **Se calcula FUERA de la caché
  `pulso:{perfil}`**: la caché es por perfil, no por credencial, y un cuerpo cacheado con las finanzas se
  serviría al siguiente sin token (hay prueba de las tres lecturas: sin token → null; con token → cifra;
  otra vez sin token, servida de la caché que escribió la petición con token → null). Token presente e
  inválido → 401 (no degradación silenciosa); `pulso.js` manda el token integrado y, si recibe 401,
  REINTENTA sin él: el pulso no puede quedarse mudo por una credencial mal puesta. `Pulso.htmlEmpresa` pinta
  «—» sin dato, jamás 0, en `#rup-cifras`.
- **Precios**: mismo criterio, sin cambiar la estructura de tres pasos ni un solo id: los párrafos de los
  pasos 1 y 3 y de «Revisar antes de subir» quedaron en una línea (la explicación del «precio de tienda» pasó
  al `title` de la columna), la búsqueda dice que también ofrece los 526 APU INVIAS. 545 → ~430 palabras
  medidas; las 170 del paso 2 son las OPCIONES del `<select>` de departamento (innerText las cuenta), no prosa.
- **`arrancarPaneles` NO se difirió** aunque Mi empresa sea ahora la primera pantalla: la suite exige que
  consulte el estado del catálogo APU y la experiencia al arrancar, y el tablero es una lectura cacheada
  (300 s). Si algún día pesa, lo que se difiere es lo de dentro de «Sistema», al `toggle` del `<details>`.

### Tres bancos oficiales más: EPC, FFIE e ICCU (18-ago-2026)

Integrados tras el censo de `docs/INSUMOS_2026.md` (§7 tiene la tabla y el detalle). Con ellos la
cascada de precios pasa a **cinco bancos**: `usuario → pliego → mercado → retail → invias → catálogo
→ invias_apu → epc_apu → idu_apu → ffie_apu → iccu_apu → sin_precio`. Cada uno con su capturador
manual (`tests/capturar_{epc,ffie,iccu}_apu.js`), su JSON en `data/` y su módulo HOJA en `lib/apu/`.

- **EPC (440 ítems, Cundinamarca) es el único de los tres CON COMPOSICIÓN**, como el INVIAS: reparte
  por componente en vez de caer a `sin_desglose`. **Su aritmética se MIDIÓ, no se supuso**: cada línea
  declara si su factor multiplica o divide comparando las dos hipótesis contra el VALOR TOTAL que
  imprime el archivo — 1 200 multiplican, 1 118 dividen, 144 son indiferentes (factor 1) y **ninguna
  quedó sin explicar**. Una línea sin `operacion` no se costea. Un factor que DIVIDE se publica como
  `cantidad = 1/factor` para conservar la invariante `cantidad × precio = valor`.
- **LA IDENTIDAD DE UNA HOJA DE EXCEL ES SU NOMBRE, no el numeral que trae dentro.** La hoja
  «7.15.13» de EPC declara «7.15.3» —copiaron la hoja sin actualizar la celda— y son dos ítems
  distintos con la misma descripción: indexando por el numeral interno, la composición de uno pisaba
  la del otro y un ítem salía con **$5,5 M en vez de $3,9 M**. Lo caza un control cruzado (el total
  del APU contra el precio que el catálogo publica para ESE numeral), no una lectura del código.
- **FFIE (1 042 ítems × los 33 departamentos) es el único banco con COBERTURA NACIONAL** —incluidos
  los 8 sin retail y los 19 sin factor regional— y es de EDIFICACIÓN. **Es un precio TOPE, no de
  mercado**: el contrato adjudicado del propio dueño está POR ENCIMA (pañete Nogal $40 150 contra
  $30 607 en Bogotá). Por eso va DETRÁS de los demás bancos en la cascada y dice «tope» en el badge,
  en el Excel y en el aviso del ítem. Leerlo como cotización es el error de categoría del retail.
- **UNA CLAVE VACÍA NUNCA ES UNA CLAVE.** El FFIE escribe varios departamentos pegados
  («VALLEDELCAUCA») y `Filtros.departamento` devuelve null para ellos; la primera versión los indexaba
  con esa clave vacía, que se sobrescribía entre sí, y **pedir el código 76 (Valle del Cauca) devolvía
  el precio de NORTE DE SANTANDER**. Es la familia del `|| 0`. Se resuelve con el código DANE de los
  33 DECLARADO A MANO en el capturador, que **aborta** si una vigencia futura renombra una columna.
- **ICCU (1 234 ítems, 58 municipios) es la fuente más granular del proyecto** y **su numeración
  REINICIA en cada capítulo**: «1,9» es DEMOLICIÓN ESCALERAS en preliminares y COLLAR DE DERIVACIÓN en
  acueducto. La clave es CAPÍTULO + NUMERAL (con el numeral solo, las discrepancias entre provincias
  eran 230; con la clave correcta, 59) y **esas 59 se DESCARTAN**: ahí no se sabe cuál de los dos
  ítems es. Es el defecto de «dos capítulos con el mismo numeral» del lector de pliegos, otra vez.
- **Las 11 cartillas provinciales de EPC quedan fuera y las dos alternativas se descartaron
  MIDIENDO**: descifrar la sustitución de letras pierde información (no es biyectiva — `Y` viene de
  `C` y de `Y`; aplicada a Alto Magdalena casa el 33 %) y alinear por orden es peor, porque las
  cartillas omiten ítems distintos del libro. Solo entró Ubaté, la única con numeral en sus filas.
- **LOS CINCO BANCOS CABEN EN UNA RESPUESTA: 2,23 MB de los 4,5 MB de Vercel**, y hay prueba que lo
  mide y que además prohíbe que un banco cuele precios en `comoItemsDeCatalogo`. Un sexto banco
  acercaría la respuesta al límite y ese fallo **solo se ve en producción**; lo que se recorta
  entonces son CAMPOS, no ítems.
- **Los tres son REFERENCIA, no cotización**: el precio propio, el del archivo o el tecleado mandan
  sobre ellos y quedan en `cd_catalogo` para que la diferencia se vea. Y los tres declaran su ámbito
  —fuera de su departamento el precio viaja igual y se DICE—, con el nivel usado (municipio,
  provincia, departamento o mediana nacional) en cada respuesta.
- **`tests/pdf_texto.js` es la herramienta que hizo posibles ICCU y las cartillas**: extractor de
  texto POSICIONAL en Node puro, con ToUnicode resuelto por página y por recurso.
- **VERIFICADO EN NAVEGADOR REAL antes de dar por bueno** (Chromium por CDP contra un arnés que sirve
  `public/` y responde `/api/*` con los módulos reales): los cinco bancos llegan al catálogo
  (174 · 526 · 440 · 3 172 · 1 042 · 1 234), el presupuesto con los tres nuevos da
  epc 11 931 / ffie 16 859 / iccu 3 234 038, EPC trae sus 5 insumos y el FFIE ninguno, el aviso de
  TOPE sale, los badges se resuelven («EPC 2026-02 · ALMEIDAS», «FFIE 2026 · tope · CUNDINAMARCA»,
  «ICCU 2026 · Cundinamarca»), el buscador ofrece los ítems nuevos y **la consola queda limpia**.
  El importador tarda **1,6 s** con 300 filas contra los cinco bancos (tope de la prueba: 15 s).
  Dos falsos positivos del arnés que conviene no volver a perseguir: `clasificarOrigen` necesita el
  presupuesto REAL como segundo argumento (con `{}` responde `sin_referencia`), y `CATALOGO` vive
  dentro del IIFE de app.js, así que no es `window.CATALOGO` — el buscador se comprueba por el DOM.

### Los insumos de precios 2026 que aportó el dueño · el censo (18-ago-2026)

Censo, contrastes y orden de integración en **`docs/INSUMOS_2026.md`**. Los 22 archivos de
`docs/insumos_2026_pendiente/` se habían acopiado «para análisis posterior» en cinco commits y
**nadie los había abierto**. Tres ya se integraron (sección de arriba); lo que sigue es el censo y
lo que no hay que re-aprender de los que NO se integraron.

- **TRES PREMISAS DE ESTA MEMORIA ERAN FALSAS y las desmiente un archivo que ya estaba en el
  repositorio.** «FFIE (no publica precios)» → publica **1 051 ítems de edificación × 33
  departamentos**, vigencia 2026. «ICCU/Cundinamarca 2025 bloqueado (403)» → está la lista **2026**
  entera, 15 provincias y **58 municipios**. «La edificación pura sigue con los 157 del Nogal» → hay
  tres bancos de edificación 2026. Es la lección de `datos.gov.co` otra vez, agravada: aquí ni
  siquiera había que volver a llamar a la fuente, solo abrir el archivo.
- **El de mayor valor es el de EPC** (`APUsEPC2026_Feb.xlsx`, 454 hojas): 440 APU **con composición
  completa** de agua y saneamiento, y **su aritmética YA es la del motor** — verificado ítem a ítem
  (MO y equipo ÷ rendimiento, material × cantidad, herramienta menor como % de la MO, total al peso).
  No hay que inventar ninguna fórmula para consumirlo.
- **Las doce cartillas provinciales se unen al Excel de EPC POR NUMERAL, y casan 346/346 (100 %).**
  Hace falta porque su texto viene con letras sustituidas (`LOCALIZACIÓN` → `LOYALIZAYIÓN`): el
  **ToUnicode de esos PDF está mal EN ORIGEN**, no es defecto del extractor — se implementó la
  resolución correcta por página y por recurso (`/F1` NO es una identidad global: apunta a objetos
  distintos según la página) y el texto no cambió. Las **cifras y los municipios salen correctos**,
  así que la descripción se toma del Excel y el precio del PDF.
- **ICCU y FFIE SE VALIDAN MUTUAMENTE** (misma vigencia, mismo departamento, entidades
  independientes): pañete ×1,00, mampostería ×1,01, concreto ×0,92. Dos fuentes que no se copian y
  dan el mismo número es la mejor evidencia disponible de que ambas están vivas.
- **El CSV de Boyacá SIGUE SIENDO EL DE 2022**: la fecha del nombre es la de DESCARGA, las 1 255
  filas son exactamente las del dataset ya fichado, y contra el FFIE 2026 del mismo departamento sale
  ×0,88 · ×0,78 · ×0,60 · ×0,42. Subestimaría el costo, que es el error caro de este módulo. No se
  integra sin vigencia nueva; el APU 2023, igual.
- **El FFIE es un precio TOPE, no de mercado**, y el contrato adjudicado del Nogal está POR ENCIMA
  (pañete $40 150 contra $30 607 en Bogotá). Si se integra va con nivel propio y declarado, como
  `techo_de_insumo` en el retail: leerlo como cotización sería el mismo error de categoría.
- **Hay por fin fuente 2026 con desglose para el factor prestacional… y NO es «el 1,55 corregido».**
  El archivo de cuadrillas da **2,19** (rango 2,09-2,31), pero incluye dotación, bioseguridad y FIC
  —que `lib/apu/normativa` deja fuera a propósito— y está calculado sobre **días reales trabajados
  (295 de 365)**, que por sí solos son ×1,24. Comparar las dos cifras de frente sería confundir dos
  magnitudes; la conversión NO se hizo aquí porque sería la derivación a ojo que este módulo prohíbe.
  Coinciden en cambio SMMLV 2026 ($1 750 905 ✓) y auxilio de transporte ($8 303,17/día).
- **El contraste de precios se hizo por PALABRAS CLAVE y eso está declarado**: los ratios extremos
  (excavación ×0,36) son ruido de emparejamiento —mezcla «demolición de pañete» con «pañete»—, no
  evidencia de precio. Una integración de verdad casa con `lib/apu_mapeo`; una segunda definición de
  «se parecen» divergiría.
- **`tests/pdf_texto.js`** es el extractor de texto POSICIONAL de PDF en Node puro (sin
  dependencias, herramienta MANUAL como los `capturar_*.js`; la app sigue leyendo pliegos con pdf.js
  en el navegador). Conserva columnas por coordenada X y resuelve ToUnicode por página. Dos defectos
  que costaron encontrar y que la cabecera documenta: los corchetes de `[…] TJ` son **delimitadores**
  —tratarlos como operador vaciaba el búfer y el texto salía vacío— y las regex del tokenizador van
  **sticky**, porque `s.slice(i)` por token sobre un content stream de 65 KB es cuadrático.
- **`Visor_BPR_2026I_FaseI_29072026.xlsx` ya está integrado** (es la fuente de
  `data/apu_idu_items.json`): está en la carpeta por duplicado y no hay nada que hacer con él.

### Los 526 APU de referencia del INVIAS como base de precios de ÍTEMS (ago 2026)

Encargo del dueño (17-ago-2026): «no sabemos los precios de los ítems… el APU básicamente no sirve».
Importar otro Excel SÍ funcionaba; lo que fallaba es que casi ningún ítem real tenía precio (el catálogo
son 174 ítems, 157 de un contrato de edificación). `tests/capturar_invias_apu.js` (herramienta MANUAL con
red, como las otras dos capturas) bajó los libros por provincia del INVIAS 2026-1
(`hermes2.invias.gov.co/APUs/Provincias/2026_1/APU_{cod}_{DPTO}__{PROV}_2026_1.xlsx`; 135/141 provincias,
Bogotá y 5 más sin libro publicado, DECLARADAS) a `data/apu_invias_items.json` (2,9 MB: 526 ítems de pago
× costo directo y 4 componentes por provincia + la composición de Ibagué); `lib/apu/invias_items.js` los
sirve y `calcular`, `cotizar`, el importador de Excel, el buscador del editor y el libro exportado los usan.
Decisiones que no hay que re-aprender:
- **Es una REFERENCIA OFICIAL, no una cotización, y viaja con vigencia, provincia y número de provincias**
  (`origen_precio: "invias"`, `referencia_invias_apu`, nivel `invias_apu` de la cascada de `lib/apu/precios`,
  estado `invias` del badge/Excel: ni verde —no es contrato adjudicado— ni ámbar —tiene respaldo—). El
  precio propio, el del archivo o el tecleado MANDAN sobre ella (la política de precios de siempre) y la
  referencia queda en `cd_catalogo` para que la diferencia se vea.
- **El precio del departamento es el de UNA provincia real, la de precio mediano** (con número par, la
  inferior de las dos centrales), NO la mediana de cada componente por separado: la suma de medianas no
  es la mediana de las sumas (hasta 5,7 % medido) y un unitario que no es la suma de sus componentes es «la
  fila que no cuadra». Sin libro para el departamento (Bogotá) → la mediana NACIONAL, dicha en cada ítem.
- **Las líneas de la composición (Ibagué) se LLEVAN al nivel de la provincia representativa con un factor
  por componente**, publicado en cada línea («precio de IBAGUE × 1,02 al nivel de NORTE»): es lo que hace el
  INVIAS (mismas cantidades y rendimientos, precios por provincia) y lo que hace que la hoja de APU cuadre al
  peso. Un componente que la composición de referencia no desglosa (41 celdas de 71 010) va como línea de
  AJUSTE con nombre, jamás repartido en silencio. **Prueba: 526 ítems × 33 departamentos = 17 884 APU
  cuadran** (componentes → unitario ±$2; líneas → componentes ±$1,5).
- **El APU oficial se toma TAL CUAL**: sin factor de jornada ni EPP del motor (la vigencia 2026-1 ya está en la
  jornada vigente; el 2,04 del INVIAS no desglosa dotación) y sin `rendimiento_override` (si viene, se AVISA
  en el ítem y en las alertas; quien difiera escribe el precio). Los ítems INVIAS reparten por componente
  (no van a `sin_desglose`) y `material + MO + equipo + transporte + sin_desglose = total` sigue con prueba.
- **UN solo unitario para calcular y cotizar**: `unitarioMotor` (suma de componentes redondeados) vive en
  `invias_items` y lo leen los dos; dos redondeos «equivalentes» dieron 16 537 frente a 16 536 en la primera
  pasada. Va DESPUÉS de `catalogo` en la cascada porque son espacios de códigos distintos (`INVIAS:200,1,1`
  frente a `NOG-`/`INV-`/`LOC-`): para un ítem dado solo responde uno.
- **El importador compara contra catálogo + INVIAS con las MISMAS primitivas**, y tres precisiones medidas:
  (1) la similitud de EDICIÓN de un ítem INVIAS se mide contra su CABECERA (antes del paréntesis) y las
  coincidencias contra el texto entero — con el paréntesis largo, «SUB-BASE GRANULAR PARA BACHEO CLASE A»
  ganaba a «SUB-BASE GRANULAR CLASE A»; (2) el **margen sobre el segundo se mide contra el mejor de OTRA
  FAMILIA** (cabecera INVIAS; artículo para los `INV-*` estimados del catálogo): el banco trae 194 ítems que
  solo difieren en el paréntesis (SBG-50/SBG-38) y todo lo vial caía a «revisar»; las variantes se
  PUBLICAN (`variantes`) y se toma la primera por código, dicho en la vista previa; (3) a puntaje igual gana
  catálogo (contrato/derivación) > INVIAS > estimación del catálogo. `sinInvias` deja medir el mapeo de antes.
  Unidades compuestas del INVIAS (`m3-km`, `kg-km`) tienen entrada propia en `UNIDAD_EQUIV`: caían en «ml».
- **El libro exportado marca la fila con `  🔵 INVIAS 2026-1 · PROVINCIA`** —el MISMO anclaje (dos espacios +
  emoji) que el importador limpia (`MARCADOR_EXPORTADO_RE`)— y la hoja APU dice de qué provincia es el costo
  directo. Hay prueba de ida y vuelta: exportar → reimportar → la fila vuelve a mapear firme al mismo ítem.
- **De paso, un defecto de producción en `lineaLegible`**: `Number(null)` es 0 y finito, así que toda línea de
  mano de obra SIN factor de jornada (`factor_jornada: null`, que es lo que publica el motor con factor 1 —el
  dueño guardó 42 h—) escribía «días × 0,000 por jornada de 42 h» en pantalla y en el Excel. Guarda de
  ausencia y prueba.
- **La API sirve los ítems INVIAS APARTE** (`items_invias` + `invias_apu` en `/api/apu?op=catalogo`, +245 KB) y
  `app.js` los junta a `CATALOGO.items` para buscar/añadir/resolver borradores; `cotizar` recibe
  `departamento` (el INVIAS se resuelve por departamento, no por región del catálogo). Licencia: los
  documentos del INVIAS prohíben el uso comercial sin autorización — está en `_meta` y en `meta()`.

### Página única y token integrado (ago 2026)

Encargo del dueño: «una sola página, cero fricción». Se retiraron `admin.html`, `apu.html`,
`pliego.html`, `admin.js` y `apu.js`; queda `index.html` (tres pestañas: 🏠 `#/licitaciones` ·
📊 `#/apu` · ⚙️ `#/admin`, tema oscuro `#0f172a`, barra inferior en móvil) y `public/app.js` como
único módulo principal, ENSAMBLADO de los tres anteriores. Decisiones que no hay que re-aprender:

- **El TOKEN va INTEGRADO en el frontend** (`const TOKEN = "MiExtraccion2025"`, en app.js, pliego.js
  y onboarding.js) y el usuario NO ve ningún formulario, prompt ni error de token. Es decisión
  explícita del dueño y hay que contarla exacta: **ese literal no es un secreto** — cualquiera que
  lea el fuente lo ve — y la capa de seguridad REAL es Vercel Password Protection (más el gate de
  clave del cliente). **Los endpoints NO se relajaron**: siguen exigiendo `HISTORICO_TOKEN` en el
  servidor; lo que cambió es quién lo teclea. Un 401 se explica como lo que es («HISTORICO_TOKEN no
  coincide con el de la aplicación»), jamás como «token inválido, escriba otro». En la lista pública
  `tokenRechazado` degrada a la vista sin cifras en vez de entrar en bucle de 401 — el mismo
  contrato que tenía un token caducado de sesión. La suite PROHÍBE que vuelvan `pedirToken`,
  `exigirToken`, `pintarEstadoToken`, `CLAVE_TOKEN` y los formularios (`modal-token`,
  `seccion-token`) — y que el token viaje en una URL.
- **Un solo gate y un solo arranque, AL FINAL del IIFE** (la lección de siempre, ahora una sola
  vez): el ancla de la prueba es `const guardadoRup = perfilRupGuardado();` DESPUÉS de
  `let CATALOGO = null;` (estado del editor) y de `let dashboardCargando = false;` (estado del
  panel). Cada pestaña arranca lo suyo la PRIMERA vez que se abre (`arrancadas.{apu,admin,pliego}`):
  abrir la app no dispara el panel ni la carga del catálogo si nadie los mira.
- **`pliego.js` y `onboarding.js` SIGUEN siendo archivos propios**: sus funciones (`numeroLocal`,
  `lineasDePagina`, `parsearCsv`) están atadas por pruebas que las EXTRAEN por archivo. `pliego.js`
  ya no arranca solo: expone `window.__pliegoArrancar` y la pestaña APU lo llama una vez. Su marcado
  vive en `index.html` (sección plegada de la pestaña APU) con ids `pl-*` donde colisionaban.
- **Ids renombrados porque dos elementos no pueden compartir id**: el RUP en JSON del panel es
  `rup-json-archivo`/`rup-json-mensaje` (`rup-archivo` es el PDF del onboarding); el validador del
  JSON de experiencia es `btn-exp-validar`/`exp-json-mensaje` (`btn-exp-cargar`/`exp-mensaje` son la
  carga por CSV, cableada por onboarding.js y movida de la landing a la pestaña admin); el progreso
  del lector es `pl-prog-barra` (`prog-barra` es el de la sincronización).
- **El botón «APU» de una tarjeta o fila ya no abre otra página**: es `<button class="btn-apu"
  data-apu-q="…">` y `abrirEditorConProceso` fija `paramsProceso` y cambia de pestaña. **La MISMA
  cadena de parámetros** que viajaba a `/apu.html` viaja ahora en memoria: `precargarDesdeURL` no
  cambió de contrato (y conserva `location.search` de respaldo para enlaces guardados). En las
  delegaciones el `.btn-apu` se resuelve ANTES que la fila/banda, como siempre.
- **`exp-produccion` nace VISIBLE**: colgaba de `pintarEstadoToken` («enséñalo si hay token»), y con
  el token integrado esa condición es verdadera por construcción. Un bloque oculto sin nadie que lo
  desoculte es un botón que no existe. Ídem «Nuevo RUP (PDF)» del panel: al elegir archivo se
  ENSEÑA la landing, porque el progreso y los errores se pintan allí y dejarlos en una sección
  oculta sería un botón mudo.
- **Las URLs viejas redirigen** (`vercel.json` → `redirects`): `/admin.html` → `/#/admin`,
  `/apu.html` y `/pliego.html` → `/#/apu`. Y hay prueba de que los cinco archivos retirados no
  pueden volver: uno resucitado no lo cargaría nadie y quedaría desincronizado de app.js en
  silencio, que es peor que un 404.
- **El ensamblado NO tocó los invariantes que la suite ya vigilaba**: `let modo = "full"` sigue
  apareciendo UNA vez, `modo = "auto"` ≥ 2, la cadena Génesis para en el primer paso que falla, el
  desglose de probabilidad reproduce `p_ganar`, y las constantes del encadenado
  (`ESPERA_ENTRE_TANDAS_MS`/`ESPERA_CANDADO_MS`/`BACKOFF_MS`) viven en la cabecera compartida — se
  perdieron en el primer corte del ensamblado y la suite no lo habría visto: fue una auditoría de
  «declarado en el original, referenciado en el ensamblado, sin declarar» la que las cazó. Esa
  auditoría es la herramienta para cualquier consolidación futura.
- **La guarda muerta se quitó, no se conservó por nostalgia**: `celdaApuProceso` abría con
  `if (!leerToken()) return "—"`, que con el token integrado es inalcanzable. Un código que insinúa
  que el botón puede no pintarse es documentación falsa.

### APU profesional: desglose visible, origen del precio y normativa (ago 2026)

Encargo: mostrar el desglose real por insumo, exportar dos hojas, marcar la confianza
del precio y publicar la normativa. **Tres de las cinco premisas estaban
desactualizadas** y hay que dejarlo escrito: `lib/apu/xlsx.js` NO existe (el
exportador son `public/xlsx.js` + `public/apu_libro.js`), ese exportador YA generaba
las dos hojas «Presupuesto» y «APU» con desglose por rubro, y `/api/apu/calcular` YA
devolvía `detalle.insumos` con nombre, unidad, cantidad, precio, rendimiento,
desperdicio y distancia. El hueco real era otro y estaba más abajo.

#### Segunda pasada (ago 2026) · trazabilidad, subtotales y las cinco validaciones

Diagnóstico completo en **`docs/APU_DIAGNOSTICO.md`**, que se conserva porque distingue lo que YA estaba de
lo que NO SE PUEDE hacer con los datos disponibles: un encargo posterior volverá a pedir ambas cosas. Esta
vez fueron **cinco** las premisas desactualizadas — se sumaron «no hay regionalización» y «no hay flujo de
tres pasos», que también estaban hechas.

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
  de celdas de subtotal**, con prueba de que cada referencia apunta a una fila de subtotal y no a una de ítem,
  verificado sobre once casos borde (capítulos repetidos no contiguos, ítems sueltos mezclados con capítulos,
  bloques enteros sin precio, lista vacía). **Los capítulos repetidos NO CONTIGUOS producen dos bloques con
  el mismo nombre y numeración distinta**: el dinero cuadra y se deja así a propósito — fusionarlos exigiría
  REORDENAR los ítems del usuario, y reordenar un presupuesto en silencio es peor que un rótulo raro.
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
  **Cantidad ILEGIBLE y cantidad CERO se cuentan aparte**: el 0 es una decisión y lo ilegible una AUSENCIA
  (R1).
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

- **DEFECTO REAL ENCONTRADO POR VERIFICACIÓN, no por el encargo: las filas de
  TRANSPORTE de la hoja APU no cuadraban.** La tarifa de acarreo va en **$/m³-km** y
  `costoDirecto` calcula `precio × cantidad × distancia_km`, pero la hoja pintaba
  cantidad y precio **sin los kilómetros**: un acarreo de 1,25 m³ a 8 km imprimía
  «1,25 × $1.256» al lado de un parcial de **$12.560** — un factor 8 invisible.
  Quien auditara el APU con una calculadora encontraba una fila que no cuadra, y
  este es el módulo donde «el falso positivo cuesta más que el falso negativo».
  Ahora se publica la cantidad EFECTIVA (m³·km) y la composición («1,25 m3 × 8 km»)
  va escrita. **Invariante nueva con prueba: `cantidad × precio = valor` en las
  1 761 líneas del catálogo.** Los fletes cerrados del Nogal llevan `distancia_km =
  1` y NO publican distancia: ese 1 no es un dato que el pliego haya dado.
- **`cantidad_por_unidad` de `detalle.insumos` publicaba OTRA COSA que el campo del
  catálogo con ese nombre**: para un material con 5 % de desperdicio el catálogo dice
  1,30 y esto publicaba 1,365 —la cantidad CON el desperdicio ya dentro—. Dos cosas
  distintas con el mismo nombre es `total_procesos`/`procesos_contados` en cantidades
  de obra: quien se fiara del nombre volvería a multiplicar por el desperdicio y lo
  cobraría dos veces. Nadie lo consumía todavía; se sustituyó por **`cantidad_base`**
  (la del catálogo, `null` donde la cantidad sale del rendimiento), que además hace el
  desperdicio COMPROBABLE en pantalla: «1,3 + 5 % de desperdicio» se verifica
  (1,3 × 1,05 = 1,365) en vez de tener que creerse la cifra.
- **El desperdicio solo se escribe cuando es > 0** (28 de 1 761 líneas): en los 157
  ítems calibrados del contrato adjudicado vale 0 porque **el pliego ya lo incorpora
  en su cantidad**, así que pintar «0,00 %» ahí afirmaría que ese presupuesto no
  prevé desperdicio — falso. Hay prueba de que un ítem NOG-\* no puede anunciarlo.
- **`lineaLegible` y `clasificarOrigen` viven en `public/apu_libro.js` (UMD) y las
  usan LAS DOS presentaciones**: el desglose en pantalla y la hoja del Excel. La
  regla del origen vivía dentro del IIFE de `app.js`, así que el Excel no podía
  consultarla y **exportaba idénticos un precio de contrato adjudicado y uno
  derivado por factor regional** — el hueco real detrás de la tarea 3. `index.html`
  carga `apu_libro.js` ANTES que `app.js`, así que `APULibro` está disponible.
- **CINCO estados de origen, no cuatro.** El encargo pide 🟢/🟡/🔴/⚪, pero «precio
  del ARCHIVO importado» y «precio TECLEADO a mano» no se pueden colapsar: la
  política de precios de la importación hace que el del archivo MANDE y quede
  declarado, y fundirlos perdería esa trazabilidad. Y el verde exige DOS
  condiciones: `fuente="adjudicado"` **y** región `bogota_sabana` — fuera de Bogotá
  el mismo precio se multiplica por el factor regional y deja de ser el precio real.
- **NO se implementaron comentarios de celda de Excel, y la razón no es pereza.**
  Exigen `comments1.xml` + `vmlDrawing1.vml` + un nivel de OPC que el paquete no
  tiene (`xl/worksheets/_rels/`) + `xmlns:r` y `<legacyDrawing>` en la hoja: ~85
  líneas y **dos modos de fallo que hacen que Excel se niegue a abrir el libro
  ENTERO**. Además un comentario **no se imprime** (y el presupuesto se entrega
  impreso o en PDF), no se filtra, no se copia y `public/xlsx_lectura.js` no lo lee
  al reimportar. La advertencia va como TEXTO en la descripción + relleno amarillo
  (`FFFFEB9C`, distinto del ámbar `FFFEF3C7` para que dos significados no compartan
  color) + leyenda al pie. **Un archivo roto cuesta más que un globo que falta.**
- **Cabecera POR SECCIÓN en la hoja APU**, conservando las CINCO columnas A-E de la
  referencia (su cierre `ROUND(SUM(Ea:Eb)/2)` solo tiene sentido si parciales y
  subtotales comparten la E). El rótulo `CANT/ REND` significaba tres cosas distintas
  según la fila y por tanto no describía ninguna.
- **«Costo horario» NO se puede publicar y no se publica.** El catálogo cotiza por
  DÍA, la calibración Nogal (149/157 exactos) está construida sobre el día, y **cinco
  insumos de equipo YA se tarifan por hora** mientras otros 46 van por día: una
  columna «costo horario» mezclaría una tarifa horaria real con 46 tarifas diarias
  divididas por una jornada inventada. No existe ninguna jornada en el repositorio y
  elegir 7,33 h u 8 h mueve la mano de obra un ~9 %. Se muestra el precio por la
  UNIDAD DEL INSUMO, que es el dato real, con la unidad al lado.
- **El desglose se pinta AL EXPANDIR, no al construir la tabla** (`pintarInsumos`):
  con 200-300 ítems importados, ~10 filas de insumo por ítem son miles de nodos que
  nadie está mirando. Y `pintarCalculoEnTabla` **invalida** lo pintado en cada
  cálculo: un desglose abierto no puede seguir enseñando los insumos del cálculo
  anterior — cifras viejas con aspecto de nuevas.
- **`lib/apu/normativa.js` explica, el catálogo decide.** El factor que se APLICA
  sigue saliendo de `regiones[…].prestacional_tipico` (Redis); el módulo lo RECIBE y
  nunca lo importa — ponerle un default lo convertiría en una segunda fuente de
  verdad de una cifra que multiplica jornales. Va en código y no en el catálogo por
  el mismo criterio que `lib/apu/tipologias.js`: es ley y criterio, tiene que verse
  en un diff y no puede depender de que alguien haya corrido la carga.
- **EL 1,55 ES UN SUPUESTO, no un dato, y el rótulo «recuperado» engaña**: se
  recuperó de un comentario del `modulo_apu.html` borrado que decía «factor
  prestacional típico obra pública Colombia ≈ 1.55». Recuperar un supuesto no lo
  convierte en dato. Y **no es una perilla libre**: las nueve cuadrillas del Nogal se
  guardaron como `día con prestaciones ÷ 1,55` (calibración CIRCULAR: reproduciría
  igual con 1,40), así que moverlo no rompe la reproducción pero **sí desvía los 157
  ítems NOG-\*** (≈1 % de media, 2,89 % en el peor caso) en silencio. Hay prueba que
  lo mide.
- **LA SUMA NO CUADRA Y SE PUBLICA LA BRECHA.** Nominal de ley 58,29 % · aplicado
  55,00 % · exonerado 44,79 %. Una primera redacción de este módulo decía que la
  brecha «se explica» por la exoneración y la banda de ARL; **la aritmética lo
  desmintió**: con la ARL de clase V en su mínimo legal (4,350 %) el nominal baja a
  55,68 %, todavía POR ENCIMA del 55 % aplicado. El texto dice ahora que el 55 % **no
  se descompone en ninguna combinación legal exacta** y que cae entre las dos cotas,
  que es donde debe caer un factor de referencia. Hay prueba de que el texto no puede
  volver a afirmar lo contrario de las cifras que lo acompañan.
- **La prueba es de ENCIERRO, no de igualdad** (no puede exigir que cuadre porque no
  cuadra): el factor de las CINCO regiones tiene que caer en [suma_exonerada,
  suma_nominal]. Eso convierte el desglose en un CONTRASTE del catálogo en vez de un
  adorno — si alguien carga 1,70, la prueba cae.
- **LA EXONERACIÓN NO ES AUTOMÁTICA y su condición decide un precio.** El ET art.
  114-1 exonera a personas jurídicas contribuyentes y a personas naturales **solo si
  ocupan dos o más trabajadores**. El perfil «Helder» es persona natural con UN
  profesional: un panel que ofreciera «−13,5 pp» sin la condición le induciría a
  restarse algo a lo que probablemente no tiene derecho, y eso viaja al precio.
- **UNA NORMA MAL ATRIBUIDA ES PEOR QUE UNA AUSENTE: se lee como verificada.** Una
  refutación cazó TRES en la primera versión de este módulo, y las tres tenían la
  misma forma —citar la norma ORIGINAL para una tarifa que fijó una reforma
  posterior—: la Ley 100/1993 art. 204 fijó el 12 % (8 % del empleador), y el 12,5 %
  con reparto 8,5/4 lo introdujo la **Ley 1122/2007 art. 10**; el art. 20 fijó
  13,5 %, y el 16 % con 12/4 viene de la **Ley 797/2003 art. 7**; y la Ley 21/1982
  regula el SENA y el subsidio familiar pero **no el ICBF**, que nace de la Ley
  27/1974 con la tarifa del 3 % de la **Ley 89/1988**. Hay prueba que fija las tres.
- **El «no cuadra» hay que ACOTARLO a los componentes publicados.** Decir «no es la
  suma de ninguna combinación exacta» a secas afirma de más: **dotación (Ley
  11/1984) y auxilio de transporte quedan FUERA** de la tabla y son costo real de
  nómina, así que un empleador exonerado que los pague puede superar el 44,79 % sin
  ninguna incoherencia. El texto dice ahora «de estos 10 componentes» y declara lo
  que queda fuera; hay prueba de las dos cosas.
- **EL MARCADOR DEL EXCEL ENVENENABA LA REIMPORTACIÓN, y nada lo vigilaba.** El libro
  exportado se puede volver a importar con el lector del propio proyecto, y
  `lib/apu/importar` tokeniza `descripcion` para puntuar similitud contra el
  catálogo: con el aviso dentro («⚠️ Precio no verificado…»), medido sobre 60 ítems
  reales, **59 perdían confianza, 21 caían de «firme» a «revisar» y 2 se mapeaban a
  OTRO ítem del catálogo** — o sea, a otro precio. El marcador rojo preexistente ya
  lo hacía (3/60 de nivel); el amarillo, que fuera de Bogotá cubre la hoja entera,
  lo multiplicaba. Se limpia en el IMPORTADOR, que es el único sitio donde se
  tokeniza, y **no en el exportador**: el aviso tiene que seguir viéndose en la hoja,
  que es para lo que existe. La limpieza se ancla a DOS espacios + emoji (como los
  escribe el exportador) para no llevarse por delante un emoji que forme parte del
  nombre de un ítem. Hay prueba de ida y vuelta, y cae si se revierte el arreglo.
- **NINGUNA «Resolución XXX de 2025».** El encargo la sugería como ejemplo de fuente;
  no existe una resolución que fije el factor prestacional, este entorno no alcanza
  las fuentes oficiales (403) y una referencia normativa inventada en la herramienta
  con la que se fija un precio de oferta es el peor error que este módulo podría
  cometer. Todos los componentes viajan con `verificado: false` y hay prueba que
  prohíbe que aparezca una resolución citada como fuente.
- **Las tarifas del 19 % y el 5 % se IMPORTAN de `lib/apu/calculo.js`** (que es quien
  las aplica a los pesos) con `require` diferido: estaban escritas dos veces. Y la
  mejor cita normativa del módulo —la del IVA sobre la utilidad (art. 3 D. 1372/1992,
  hoy art. 1.3.1.7.9 D. 1625/2016)— vivía en `como_leerlo.iva`, un campo que la
  pestaña APU no pinta: se movió aquí. El panel dice **las dos mitades** de esa
  verdad, porque cada media es falsa del otro artefacto: el motor NO suma el IVA al
  precio final y la hoja de Excel SÍ lo suma a su TOTAL.
- **La normativa viaja también en la respuesta de `calcular`, para la región QUE SE
  USÓ.** Cableada solo al catálogo publicaba siempre la región base: hoy las cinco
  comparten factor y no se nota, pero el día que se regionalicen el panel diría
  «55 %» mientras el motor aplicó otro. Y `normativaAplicada` **ya no cae a la
  primera región de la lista** cuando no encuentra la pedida: por la vía de los
  hashes ese orden es el del SCAN, o sea una región arbitraria publicada como si
  fuera la aplicada.

### Plan Anual de Adquisiciones · qué va a salir antes de que salga (ago 2026)

`lib/paa.js` + `/api/competencia-detalle?vista=paa` (alias `/api/paa`, rewrite) + el toggle «Ver PAA»
de la pestaña Licitaciones. Cierra el hueco que la tabla de arriba llevaba marcado en ⬜ desde el
principio: la app avisaba cuando el proceso YA había salido, y el PAA da hasta seis meses de ventaja.

- **TRES TENSIONES ENTRE EL ENCARGO Y LO YA ESCRITO, resueltas y dichas.** El encargo pedía consulta
  en vivo; `docs/INVESTIGACION_PLATAFORMAS_LICITACIONES.md` §9.1-E propone INGERIR a un keyspace
  `paa:mes:*`. Se hizo la consulta en vivo porque es lo pedido y porque es lo MENOS comprometedor con
  un dataset que no se ha podido abrir: no escribe nada, no hay que migrar nada y el día que alguien
  verifique las columnas se cambia un solo módulo. La ingesta sigue siendo el destino natural y no se
  descartó. El encargo pedía además mostrarlo «junto con las licitaciones activas»; §9.1-E dice
  «**separado y rotulado**… mezclar una previsión con un proceso abierto sería la peor forma posible
  de equivocarse». Se cumplen las dos: misma pestaña y misma pantalla, **sección propia**. Y el
  encargo pedía «crear un endpoint `GET /api/paa`» Y «no crear archivo nuevo bajo api/»: se reconcilia
  con el `rewrite`, como ya se hizo con `/api/probabilidad-desglose` y con
  `/api/admin/cargar-experiencia-genesis`.
- **COLUMNAS VERIFICADAS CONTRA LA FUENTE REAL (2026-08-12) — y el 403 era otra observación vieja.**
  Al implementar la tasa de acierto se volvió a llamar a `9sue-ezhx` (la regla del proyecto) y
  respondió 200: las columnas de verdad eran OTRAS que todas las candidatas imaginadas
  (`nombre_entidad`, `categorias_unspsc` con «;», `valor_total_esperado`, `fecha_esperada_de_inicio`
  con el MES EN TEXTO —«Marzo»— y el año aparte en `annio`, `procesos_relacionados`), así que **la
  vista desplegada servía vacío/502**: toda fecha caía en `fecha_ilegible` y el barrido arrancaba por
  los `:id` de 2017. Arreglado: nombres reales al frente de CANDIDATAS (el mecanismo censo+candidatas
  se conserva por si la fuente vuelve a cambiar), `fechaPaa(mes, annio)` para el par mes+año (mes sin
  año = ilegible contado, jamás adivinado), la vigencia acota el barrido en el servidor
  (`annio >= Y AND annio <= Y+1`), y `verificado: true` con `verificado_el`.
- **La SONDA de 5 filas existe para no comerse un 400.** Un `$where` sobre una columna inventada da
  400, y un 400 **no se reintenta jamás** (regla del proyecto): el endpoint quedaría muerto sin
  síntoma. Se resuelven primero las columnas contra las claves reales y solo después se construye la
  consulta. Con la sonda, una columna ausente simplemente no filtra.
- **El rango de 12 meses se delega al servidor SOLO si la fecha es comparable como texto.** Sobre un
  valor tipo «Marzo», un `>=` compararía cadenas y devolvería basura EN SILENCIO, que es peor que no
  filtrar. La sonda decide y `censo.fecha_comparable_en_servidor` lo declara. **Precio asumido y
  escrito en `censo.supuestos`**: con el rango delegado, una fila suelta con la fecha en otro formato
  queda fuera sin aparecer en `descartados` — la sonda solo ve 5 filas. La alternativa es barrer el
  PAA nacional entero en cada consulta.
- **El `like` del servidor acota por FAMILIA (4 dígitos), no por los 5-6 primeros del código pedido.**
  Con el recorte fino, una publicación a nivel de familia —que es un match VÁLIDO por el upward
  matching— no llegaba siquiera al barrido: el filtro grueso del servidor estaría negando lo que
  acepta el fino del cliente. Y la familia sale de `normalizarCodigo(...).familia`, jamás de un
  `slice(0,4)`. Quien decide de verdad es `lib/unspsc.emparejar` con un índice de UN código: escribir
  aquí un `startsWith` sería una SEGUNDA definición de «este código y este otro son el mismo».
- **El punto es DECIMAL aquí, al revés que en `numeroColombiano`.** Aquel lee texto de pliegos
  colombianos (punto = miles); esto lee el JSON de una API, donde `"1500000.00"` son $1.500.000.
  Aplicar la regla del pliego multiplicaría la cuantía por cien. Lo que no encaje en formato máquina
  **no se adivina**: `null` y se cuenta. Y una cuantía en **0 es SIN DATO**, la regla de
  `anticipo_pct = 0` otra vez — el frontend pinta «Valor estimado no publicado», nunca «$0», y hay
  prueba que prohíbe el `|| 0`.
- **Una fila con fecha ilegible NO entra en «los próximos 12 meses»**: el endpoint promete una
  ventana y meter dentro algo que no se pudo situar sería afirmar lo que no se sabe. Se descarta Y SE
  CUENTA, con la invariante probada **`total + Σ descartados = barrido.filas_leidas`**.
- **LA TASA DE ACIERTO YA SE MIDE (ago 2026): `lib/paa_acierto.js` + `/api/paa?medir=1` (token).**
  Cruza el PAA de una vigencia CERRADA (por defecto el último año completo; medir el año en curso es
  400: un plan a 12 meses contra 8 de realidad) contra el corpus histórico∪activo y guarda
  `paa:acierto`; la vista lo lee BEST-EFFORT (un Redis caído deja la tasa en null dentro de
  `leerAciertoPaa`, la vista sirve igual — la garantía «una avería de Redis no tumba el PAA» se
  conserva, con ese matiz declarado). Método, con sus límites EN la respuesta: línea de obra
  (familias de segmentos 72/77/81/95 derivadas de `FAMILIAS_UNION`, no una segunda lista) de entidad
  presente en el corpus → cumple si la entidad publicó esa familia en la vigencia +1 trimestre. Es
  **COTA INFERIOR** (el corpus solo guarda lo compatible con RUP/modalidades competitivas); una
  entidad fuera del corpus NO entra al denominador (su «no salió» no distingue el PAA del alcance del
  corpus); la tasa no se publica bajo 30 evaluadas (`motivo_sin_tasa`); el falso positivo del `like`
  (87214100 contiene «7214») lo caza la extracción real de familias; y
  `evaluadas + Σ descartadas = filas leídas` tiene prueba. Señal secundaria aparte:
  `procesos_relacionados` (el enlace lo escribe SECOP, mide otra cosa). Sin medición guardada la
  cifra sigue en `null` — jamás inventada — y la nota dice cómo medirla.
- **Una fila del PAA no lleva `p_ganar`, ni `puertas`, ni `rup`, ni `ve`, y hay prueba de que no
  puede llevarlos.** No hay pliego que juzgar. Esas cifras la harían comparable con un proceso
  abierto, y compartir el orden de `/api/oportunidades` haría exactamente lo mismo — por eso la
  sección es propia y no un badge dentro de `#lista`.
- **El badge «Activo · abierto» se pinta SOLO con el PAA encendido.** Un chip idéntico en las cien
  tarjetas no distingue nada (es el defecto del chip constante de `nivel_competencia`); solo significa
  algo cuando hay previsiones en la misma pantalla de las que separarlo. Encender el toggle **repinta
  desde `ultimaBusqueda`** y no vuelve a pedir la lista: gastar una invocación por un badge sería
  absurdo, y una lista que llegara distinta haría parecer que el toggle filtra algo.
- **La vista `paa` sale ANTES de mirar Upstash.** Vive en otro dataset, no lee el corpus, no escribe y
  no toma candados; exigirle credenciales de Redis la dejaría caída por una avería que no le incumbe
  —y es justo la vista que sirve cuando todavía no hay nada publicado—.
- **El transporte se REUTILIZA**: `lib/socrata.crearCliente` aceptó un `baseUrl` opcional en vez de
  nacer un segundo cliente HTTP. Keyset, backoff con jitter, `Retry-After` y «un 400 no se reintenta»
  ya estaban resueltos ahí, y dos clientes «equivalentes hoy» divergen a la primera corrección.
- **«No se reconocieron las columnas» es un RESULTADO, no un error**: 200 con la lista vacía, el censo
  y `motivo_lista_vacia`. Un 4xx haría creer que la petición estaba mal. Misma regla que «el pliego no
  traía tablas» en el módulo APU.
- **El mock de Socrata de la suite sirve DOS datasets por path** y entiende `like`. Sin lo primero, la
  prueba del PAA habría recibido el corpus de SECOP II y habría pasado midiendo otra cosa; sin lo
  segundo, `cumple` lanzaba dentro del callback del servidor —excepción no capturada que tumba el
  proceso de pruebas entero—.

### Rediseño Apple Glass, eliminación de RUP y probabilidad en frases (ago 2026)

Encargo: paleta Apple (claro #f5f5f7 / oscuro #000, acento #007AFF, vidrio con `backdrop-filter`),
botón para eliminar un RUP cargado, y probabilidad legible para no-técnicos. Decisiones:

- **La piel cambió de dirección, no de técnica.** El tema oscuro (#0f172a) vivía en una capa CSS
  que re-mapeaba las utilidades CLARAS de las plantillas JS; el rediseño REEMPLAZA esa capa por la
  paleta Apple sobre custom properties (`:root` claro + `prefers-color-scheme: dark`) y conserva la
  técnica: las plantillas del JS siguen diciendo `bg-white`/`bg-gray-900`/`text-gray-500` y el
  `<style>` las traduce (`bg-gray-900` ES el botón de acento). Reescribir cientos de cadenas del JS
  habría chocado con media suite (regexes sobre clases) y divergido a la primera corrección. El
  blur va SOLO en tarjetas de nivel superior (`.bg-white.rounded-2xl`): anidar `backdrop-filter`
  en cada chip multiplica capas de composición sin aportar nada.
- **La suite prohíbe que vuelva el tema viejo** (paso 1.2): #0f172a/#1e293b/#334155/#34d399/#052e22
  y cualquier utilidad `*-slate-*` en index.html, y los hex fuera de paleta del SVG del optimizador
  (#2563eb/#111827/#9ca3af/#d1d5db) en app.js — el SVG no hereda custom properties, así que pinta
  #007AFF/#86868b literales.
- **El «bug de pestañas vacías» del encargo NO existía**: los 245 ids que referencian los tres JS
  existen todos en index.html y `activarPestana` + arranque perezoso estaban correctos. Lo que se
  hizo fue BLINDARLO (paso 0.1): la prueba cruza TODOS los `$("id")`/`getElementById` de
  app.js/onboarding.js/pliego.js contra los ids del HTML — la causa típica de una pestaña muerta es
  una referencia a un nodo retirado, cuya excepción detiene el script en silencio.
- **`DELETE /api/admin/rup?perfil=…` tiene DOS semánticas y la respuesta declara cuál aplicó**
  (`tipo` + `redirigir`): un `rup_…` (PDF) DEJA DE EXISTIR (clave + 4 whitelists + borradores de
  APU + cachés en UN solo DEL; la web olvida el guardado y vuelve a la landing); un perfil del
  dueño pierde su entrada del archivo cargado y VUELVE al respaldo del repositorio — los perfiles
  del repositorio no se pueden borrar (quedarse sin perfiles deja la app muda, regla de
  lib/perfiles). `perfil` es obligatorio sin default (la regla de cobertura: servir/borrar el de
  otro es la peor forma de equivocarse).
- **Eliminar la ÚLTIMA entrada borra archivo y sello juntos**: el sello ausente hace que
  `recargarPerfiles` restablezca el respaldo en TODAS las instancias. Con entradas restantes se
  reescribe el archivo y el sello va AL FINAL (como en la carga) — y en la instancia que atiende el
  DELETE hay que `restablecerPerfiles()` ANTES de re-aplicar: `aplicarConfig` es parcial a
  propósito («quien no venga conserva lo que tenía») y sin el restablecimiento el perfil recién
  borrado seguiría sirviéndose desde la memoria caliente. Las demás instancias calientes conservan
  el perfil borrado hasta su próximo arranque en frío — mismo alcance que ya tiene la carga parcial,
  dicho y asumido.
- **Lo que el DELETE NO borra, a propósito**: `config:experiencia` es configuración COMPARTIDA del
  negocio (una clave, no por perfil) y los borradores de APU de un perfil del dueño sobreviven
  porque el perfil sigue existiendo. El modal de confirmación tiene DOS textos según el tipo de
  perfil: prometer borrar lo que no se borra (o callar lo que sí) sería mentir en el peor momento.
- **La probabilidad de la tarjeta es una FRASE, no un porcentaje** (`fraseProbabilidad`): 🟢 muy
  alta (>40 %) · 🟡 buena (20–40 %) · 🟠 media (10–20 %) · 🔴 poco probable (<10 %) · ⚪ «Sin
  información suficiente» (`null` — la ausencia JAMÁS es un 0 %, la regla de `anticipo_pct`). Debajo
  va UNA frase con el factor principal (`motivoProbabilidad`, prioridad del encargo: poca
  competencia → prórroga → colisión → baja alta → baja ≈0 → «Basado en N procesos» → supuesto
  conservador declarado), y NINGUNA interpola una cifra sin base — es la invariante de
  `bandaCompetencia` aplicada al texto. La cifra vive en el modal de desglose, que la frase sigue
  abriendo (`detalle-probabilidad` no cambió de contrato). Las dos funciones se prueban
  EJECUTÁNDOLAS extraídas del fuente (paso 0.3), incluidos los bordes: 0,40 es «buena» (el encargo
  dice `>`), 0 medido es 🔴 (un dato), `null` es ⚪.
- **El editor de APU y el optimizador CONSERVAN el porcentaje**: allí la cifra alimenta una decisión
  de precio (comparar opciones a VEG) y una frase no se puede restar. El desglose del modal enseña
  frase Y cifra: son la respuesta de 1 segundo y la de 30 en el mismo sitio.

#### Verificación en NAVEGADOR REAL y el defecto que solo se ve ahí (ago 2026)

El encargo se repitió dando por hechos cinco problemas; cuatro ya estaban resueltos y **la
comprobación no fue leer el código, fue ABRIR LA PÁGINA**: Chromium conducido por CDP contra un
servidor de pruebas que sirve `public/` y responde `/api/*` con la forma real de cada handler
(41 comprobaciones: paleta por `getComputedStyle`, las cinco bandas del semáforo, el modal de
desglose, el ciclo completo del DELETE, la pestaña de administración y el móvil). El arnés vive
fuera del repositorio —`playwright-core` es una dependencia de npm y aquí no entra ninguna—, y
por eso lo que descubrió se fijó como prueba en `tests/e2e.js`, que sí es del proyecto.

- **LA VISTA VISIBLE COLGABA DEL CDN DE TAILWIND, y ese es el defecto que ninguna prueba de Node
  podía ver.** `abrirApp()` esconde la landing añadiendo la clase `hidden`, que la sirve
  `cdn.tailwindcss.com`. Con el CDN bloqueado —red institucional con la salida filtrada, que es
  EXACTAMENTE donde trabaja el dueño (el mismo hecho que obliga a disparar la extracción pegando
  URLs en Chrome)— la clase no existe, `#onboarding` no se esconde y **la landing queda encima del
  tablero**. Se ve la app «rota» y **la consola no dice nada**, porque no hay ningún error: es la
  familia del arranque en la zona muerta temporal, el fallo MUDO. La regla propia
  (`#onboarding.hidden, #app.hidden, #gate.hidden`) va **por ID y solo sobre los tres contenedores
  de vista**: con especificidad de id no puede perder contra ninguna utilidad, y al no ser global
  no toca los modales (que además fijan `style.display`) ni pelea con el `hidden md:flex` de la
  barra de pestañas de escritorio —una `.hidden{…}` global la habría escondido, y hay prueba que
  lo prohíbe—. **No arregla el aspecto sin CDN, y no se pretende**: arregla QUÉ VISTA SE VE, que es
  lo que decide si la app sirve para algo.
- **El peso 250 del título no lo puede dar Tailwind**: su parada más fina es `font-extralight`, que
  es **200**. Iba con esa utilidad, así que el encargo no se cumplía por 50 unidades que nadie iba a
  mirar. Va literal en el atributo `style` y hay prueba de que la utilidad no puede volver a
  pisarlo (SF Pro Display es variable e interpola el 250; las de respaldo lo redondean).
- **🔴 se dice «Poco probable», NO «Baja», y es a propósito.** El encargo pide «Baja», pero en este
  dominio *baja* ya significa otras dos cosas y las dos son BUENAS: `baja_mercado` (el descuento del
  ganador) y `nivel_competencia: "baja"` (pocos rivales). Un chip rojo «Baja» quedaría a dos
  centímetros del chip verde «Competencia baja» de la misma tarjeta, con la misma palabra
  significando lo contrario. Es `total_procesos`/`procesos_contados` otra vez —dos cosas distintas
  con nombres que colisionan—, y aquí la que se equivoca es la persona que decide a qué presentarse.
  Por lo mismo las otras tres frases conservan el sustantivo («Probabilidad muy alta», no «Muy
  alta»): sueltas junto a un badge de competencia, «Muy alta» se lee como «competencia muy alta»,
  que es justo al revés.
- **Lo que este entorno NO puede verificar, dicho en vez de disimulado**: el proxy responde **403 a
  `cdn.tailwindcss.com`**, así que no hay ninguna captura fiel del diseño —la del arnés enseña la
  degradación sin CDN, que es otra cosa—. Lo que sí queda medido es cada cifra del encargo leída con
  `getComputedStyle` en un navegador de verdad (fondo, acento, radio, transición, tipografía, vidrio
  y blur, pestañas de 32 px, oscuro `rgba(30,30,32,0.72)`, barra móvil de 64 px), que para un
  sistema de diseño es mejor evidencia que una imagen.

## Datos del negocio (fuente de verdad)

- Perfiles: `lib/perfiles.js` es el RESPALDO (`PERFILES_FALLBACK`, RUP corte 31/12/2025) y el punto
  de aplicación de lo que el dueño cargue por `/api/admin/rup` (validación en `lib/config_rup.js`).
- Experiencia REALMENTE ejecutada en `lib/experiencia.js` (`config:experiencia` + su vocabulario);
  la auditoría de huecos del RUP, en `lib/cobertura_rup.js`. Ninguna de las dos toca la ingesta.
  ✅ **`experiencia_genesis_106.json` YA ESTÁ en la raíz** (ago 2026). No salió de git —se buscó
  antes de forma exhaustiva y no estaba: 25 ramas remotas, los 7 `.json` que han existido jamás y
  los 1 041 blobs del object store incluidos los colgantes— sino del **PDF del RUP 2023 que aportó
  el dueño**. Cómo se extrajo, qué columna alimenta cada campo y qué quedó en `null`, en
  **`EXPERIENCIA_PENDIENTE.md`**; los tres pasos de puesta en producción, en
  **`cargar_experiencia.sh`**. Cinco decisiones que no hay que re-litigar:
  · **Las filas se delimitan con las REGLAS HORIZONTALES que dibuja el PDF**, no por proximidad
    vertical entre líneas. Con el punto medio entre filas, el objeto de una fila alta se colaba en
    la siguiente —pasó, y se vio— y un texto REAL en la fila EQUIVOCADA es peor que un hueco:
    parece dato bueno. El texto se lee por COORDENADAS, como en `lib/apu_pliego`.
  · **`valor_smmlv` es la columna TOTAL, no la ponderada por participación.** El PDF trae las dos.
    Con la total, `valor_cop` y `valor_smmlv` describen LO MISMO (el contrato) y `participacion`
    deriva la parte; con la ponderada, un campo sería el total y el otro la parte. Además la
    ponderada falta en 10 filas y en una de ellas tampoco hay `valor_cop`: ese contrato no habría
    pasado la validación.
  · **54 `participacion` y 11 `modalidad` en `null` son CELDAS VACÍAS del PDF, no fallos.** En 44 de
    esas 54 la ponderada iguala al total (o sea, 100 %), y aun así **no se dedujo**: rellenarlo
    sería inferir, no leer. Misma regla que `anticipo_pct = 0` y que el `score` en `null`.
  · **Las anomalías de la fuente se conservan**: la fila 97 dice `30/12/2202` (año imposible), la 19
    termina antes de empezar, y las erratas del objeto («MOVIMEINTOS», «AGUIAS LLUVIAS») quedan
    literales — el objeto es la evidencia. Lo único que se normalizó es el FORMATO de `25--04-2015`,
    que es legible sin ambigüedad: cambiar el formato no es cambiar el contenido.
  · **El control cruzado que prueba que las columnas se leyeron bien**: en toda fila con las tres
    cifras impresas se cumple `SMMLV ponderado = SMMLV total × participación`. Si las columnas se
    hubieran leído corridas, esa identidad no cuadraría en ninguna.
  ⚠️ **Sigue prohibido inventar un contrato**: este vocabulario decide con qué códigos se renueva el
  RUP. Sin el archivo la auditoría **funcionaba igual**, con el método base y `score` en `null`.
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
  `docs/PROBABILIDAD_MEJORADA.md` audita los factores ejecutando el código y documenta cuatro
  defectos reproducidos. **DOS YA ESTÁN CORREGIDOS y dos NO** — y la distinción es justo lo que esta
  memoria existe para no perder:
  · ✅ **El tertil de competencia ya no multiplica** (ago 2026). Era el MISMO promedio dos veces:
    `nivel` es el tertil de `promedio_oferentes`, que ya está dentro de `rivales`. Saltaba −32 % por
    MEDIO rival en el corte, daba ×1,30 de diferencia según el dato viniera de la entidad o del
    departamento, y como los tertiles son RELATIVOS la probabilidad de un proceso cambiaba porque
    cambiaban OTRAS entidades. `competencia.nivel` **sigue viajando, filtrando y ordenando**: lo
    único que ya no hace es multiplicar. Hay prueba de que no puede reaparecer.
  · ✅ **La baja de mercado es una RAMPA continua**, no dos escalones: ×1,10 hasta 2 % de baja, lineal
    hasta ×0,85 en 5 %, plana después. **Suavizar no es calibrar**: 1,10 y 0,85 siguen siendo
    supuestos puestos a mano. Y hay que contar bien lo que mejora, porque es fácil prometer de más:
    · **La rampa suaviza la FUNCIÓN; el DATO sigue cuantizado.** `indice:baja` publica la mediana como
      una cubeta ENTERA (`Math.round`), así que en producción solo existen …2, 3, 4, 5… y lo que se ve
      es una ESCALERA DE CUATRO PELDAÑOS, no una curva. Lo que baja es la ALTURA del peldaño más alto:
      **del 15,0 % al 8,9 %**. «Ya no hay saltos» sería falso, y hay prueba que fija ese 8,9 %.
    · **Las comparaciones pasaron de ESTRICTAS a INCLUSIVAS y eso mueve dos valores frecuentes.** Antes
      `>5` y `<2` dejaban las medianas de exactamente 2 y 5 en la zona neutra (×1,00); ahora 2 → ×1,10
      y 5 → ×0,85. Lo que de verdad no se mueve un dígito es el INTERIOR de las mesetas (0, 1, 6, 7…),
      no sus bordes. La ALCALDÍA DE PURIFICACIÓN del corpus tiene mediana exactamente 5 y su `p` cae de
      0,325 a 0,2125 por las DOS causas a la vez.
    · **Los codos de la rampa NO coinciden con las fronteras de `nivelPorBaja`** (`>5` → «alto»,
      `>=2` → «medio»): una mediana de 5 se rotula «medio» y recibe el ×0,85. Deliberado: rotular y
      multiplicar son dos preguntas distintas. No «arreglar» una para que case con la otra.
    · **`numero()` NO sirve de guarda para «sin dato»**: `Number(null)` y `Number("")` son 0, los dos
      finitos, así que la ausencia entraba como «baja del 0 %» y salía premiada con ×1,10. La
      ausencia se descarta ANTES de tocar `Number`, y hay prueba con los cinco valores vacíos.
    · **El factor se publica REDONDEADO y se aplica REDONDEADO**, para que `base × Π factores`
      reproduzca `p` a mano desde la tarjeta; hay prueba. Y el ajuste se emite SIEMPRE que haya dato
      —también cuando el factor sale exactamente 1— porque si no, «no aparece» significaría a la vez
      «no hay dato» y «no mueve nada»: el «no sé» contra el «cero» otra vez.
  · ⚠️ **CONSECUENCIA AGUAS ABAJO que nadie pidió y que se va a ver**: `lib/apu/rentabilidad` toma
    esta `p` como su `p_base` (`api/apu/[accion].js`), y `veg = p × utilidad − c_preparación` es **el
    único umbral DURO sobre `p` de todo el repositorio** —lo demás ordena o pinta—. Retirar el tertil
    baja `p` un 23 % en las entidades de POCA competencia, que son justo las que el editor de APU va a
    ver: un VEG apenas positivo pasa a negativo y `filtros_duros.veg_no_positivo` empieza a decir «el
    valor esperado no cubre el costo de preparar la oferta» en presupuestos que ayer salían verdes.
    **No es un defecto: es que antes el número estaba inflado por contar la competencia dos veces.**
    Medido en la suite: la `p_ganar` del bloque de rentabilidad pasó de 0,2091 a 0,1777. Y la prueba
    solo exige `veg != null`, así que el SIGNO no lo vigila nadie.
  · ✅ **Corregidos el 16-ago-2026 (A2-A6)**: el corte duro en 5 procesos (encogimiento) y el
    defecto SEMÁNTICO de la baja (factor de precio + `p_sin_precio` para el editor). Ver la sección
    «Probabilidad: encogimiento, factor de precio y banda» más abajo. La rampa YA NO EXISTE.
  · ✅ A7 también (16-ago-2026): la colisión se mide y el factor sale de la medición (1,06 en
    producción). ✅ B2 medido y cerrado sin segmentar: la ventana de garantías DILUYE oferentes
    (0,95), sesgo agregado ~1 % — no justifica segmentar (ver la sección de probabilidad).
  El documento trae además los tres protocolos de calibración que el histórico ya permite correr hoy.
- Las CUATRO PUERTAS en `lib/puertas.js` y `P(ganar)`/VE en `lib/probabilidad.js` (`trazaP` es la
  única implementación de la cadena; `estimarPDetalle` es su vista redondeada); el desglose
  justificado paso a paso, en `lib/probabilidad_desglose.js` + `/api/competencia-detalle?vista=
  probabilidad`. El diseño y por qué, en `docs/ATRACTIVIDAD.md`.
- Lector de pliegos (cantidades del pliego, **sin precios**): diccionario de reconocimiento de 93
  ítems y 22 tipologías en `data/catalogo_apu.json` + `lib/apu_catalogo.js`; parseo y validación en
  `lib/apu_pliego.js`; mapeo por similitud en `lib/apu_mapeo.js`; OCR de respaldo en
  `lib/apu_ocr.js`; endpoints `api/apu/extraer-texto.js` y `api/apu/descargar.js`; frontend en
  `public/pliego.html` + `public/pliego.js`. El informe completo —incluido todo lo que NO se
  implementó y por qué— en `docs/APU_INFORME_COMPLETO.md`.
- Catálogo de precios APU en `lib/apu/catalogo.js` + semilla `data/apu_catalogo.json` (48 insumos,
  17 ítems, 5 regiones); la investigación de fuentes, en `docs/APU_Y_RENTABILIDAD.md`. No toca la
  ingesta ni el corpus: vive en `apu:*`.
- Del costo al precio: `lib/apu/calculo.js` (presupuesto y AIU) → `lib/apu/rentabilidad.js` (margen,
  caja, VEG y payback de UN precio) → `lib/apu/optimizador.js` (**qué precio**: barre las bajas
  plausibles llamando al anterior y devuelve el máximo VEG con su curva). Los tres se sirven desde
  la acción `rentabilidad` de `api/apu/[accion].js` y se pintan en `/apu.html`.
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
- **TERCER canal de inferencia aceptado: la BAJA DE MERCADO se despeja del propio `p_ganar` por
  aritmética inversa.** `lib/publico` anula `baja_mercado`, `baja_entidad` y `baja_segmento`, y
  —desde ago 2026— también el `factor` y el `motivo` del ajuste `baja_mercado` dentro de
  `p_ganar_detalle.ajustes`, porque el número iba escrito en la frase (el defecto de `p2_k.mensaje`
  y `p3_caja.mensaje`, repetido en un tercer sitio). Lo que NO se puede anular sin romper el
  producto es la explicación de la cifra: `p_ganar`, `base` y `rivales_esperados` siguen viajando
  —«la probabilidad viaja SIEMPRE con su fuente»— y los otros dos ajustes son constantes conocidas
  que además declaran si aplicaron. Con eso,
  `p / base ÷ 1,20^prórroga ÷ 1,15^colisión` devuelve el factor de baja.
  · **Lo que se filtra es un RANGO, no un valor**, y hay que contarlo exacto: `lib/indice_baja`
    publica la mediana como una cubeta ENTERA del histograma (`Math.round`) y la rampa satura fuera
    de [2 %, 5 %], así que el canal distingue CUATRO clases —{≤2 → ×1,10 · 3 → ×1,0167 ·
    4 → ×0,9333 · ≥5 → ×0,85}— donde antes de la rampa distinguía tres. Es el mismo canal de rango
    ya aceptado para `ordenar_por=baja` (que ordena en el servidor), una clase más ancho: no es una
    fuga nueva.
  · **Por qué se acepta.** Explotarlo exige un competidor capaz de despejar la cadena de factores
    de `lib/probabilidad` — y ese mismo competidor puede calcular la baja por su cuenta bajando
    `p6dx-8zbt`, que es público y trae `precio_base` y `valor_total_adjudicacion`. Lo que la app
    aporta es la agregación, la cascada de granularidad y el corte por modalidad, no el dato bruto.
    Es la misma lógica por la que se conserva `financiacion_requerida` (cuantía × 0,20,
    recalculable con la ficha del proceso): ocultar lo que el otro puede recomputar no protege
    nada y sí quita producto.
  · **Qué costaría cerrarlo**: anular también `base` y `rivales_esperados`, es decir, dejar al
    cliente público con una probabilidad sin decirle de dónde sale. Eso es un cambio de producto,
    no una corrección. Si algún día pesa más que la utilidad, la salida es la misma que para P2 y
    P3: volver a exigir token, no redactar mejor.
  · La medición —con las cifras y el porqué de cada clase— vive en `lib/publico.js`, junto al
    código que redacta. Aquí queda registrada la decisión.
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
- **…Y ESA MISMA CONSTANTE SE SEGUÍA PINTANDO (corregido ago 2026).** Retirar `nivel_competencia` del
  puntaje no bastó: la tarjeta le ponía un chip VERDE («Ofertas del proceso: baja») en cada proceso y
  `index.html` ofrecía un desplegable de tres opciones —una no filtraba nada y las otras dos vaciaban
  la lista—. Es el defecto de «0 oferentes = SIN DATO» y el de «18,2 oferentes sin base» por tercera
  vez, ahora en el único sitio que el dueño mira siempre. Cuatro decisiones:
  · **Se retira la PRESENTACIÓN, no el campo.** `nivel_competencia` sigue en la proyección y en la
    respuesta: sacarlo del registro exigiría una full y no arregla nada. Lo que no puede seguir es
    presentarse como una medición. Quien responde esa pregunta CON BASE es `competencia_entidad`, y
    su badge ya está en la misma tarjeta a dos centímetros.
  · **`?nivel_competencia=` queda INERTE, no da 400.** Un enlace guardado no puede vaciarle la lista a
    nadie; hay prueba de que el total no se mueve con ninguno de los tres valores.
  · **`?ordenar_por=competencia` leía el campo de la FILA, no el de la entidad** — o sea, no ordenaba
    nada—, mientras README y CLAUDE.md llevaban desde jul 2026 afirmando que ordenaba por la entidad.
    Ahora lee `competencia_nivel` del contexto ya calculado: el código alcanzó a su documentación.
  · **EL FIXTURE TAPABA EL DEFECTO Y POR ESO SOBREVIVIÓ.** La suite daba
    `respuestas_al_procedimiento` a TODAS las filas, incluidas las abiertas, así que la señal parecía
    viva en las pruebas. Ahora solo la llevan las adjudicadas —que es lo que hace SECOP II— y el
    histórico conserva sus conteos intactos (184 procesos, 3 entidades clasificadas, sin cambios). La
    suite además MIDE y publica cuántos valores distintos toma el campo en el corpus servido: **1 en
    384 procesos**. Una cifra medida vale más que una regex sobre el fuente.
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

### Probabilidad: encogimiento, factor de precio y banda (16-ago-2026 · A2-A6 del plan)

`docs/PROBABILIDAD_MEJORADA.md` §8 Fase A, menos A7. Toca `lib/indice_competencia.js` (escritor y
lector), `lib/probabilidad.js`, `lib/apu/rentabilidad.js` (curva extraída), `lib/handlers/apu/editor.js`,
`lib/probabilidad_desglose.js`, `lib/publico.js`, `lib/competencia_detalle.js` y el listado.
Decisiones que no hay que re-aprender:

- **SE ACABÓ EL ACANTILADO DE LOS 5 PROCESOS.** El índice publica por entidad `rivales_estimados`
  (`r̂ = w·r̄_e + (1−w)·μ`, media posterior gamma-Poisson), `peso_datos` (`w = n/(n+m)`) y
  `rivales_desv` (√Var de la posterior), y en la meta el bloque `encogimiento` (`mu_global`, `tau2`,
  `m`, `sigma2_dentro`, `entidad_no_distingue`). `trazaP` usa `rivales_estimados` cuando el registro
  lo trae (`fuente:"entidad"`, `encogido:true`); si no, la cascada de siempre. **`promedio`,
  `mediana` y `oferentes_total` SIGUEN en null bajo el mínimo y el badge sigue en ⚪**: «¿cuál es el
  promedio medido?» y «¿cuántos rivales espero?» son dos preguntas y dos objetos — mezclarlos
  resucitaría «18,2 oferentes sin base». En la suite, 4 procesos con promedio 2 pasan de p = 0,167
  (respaldo) a 0,304 frente a 0,309 con 5 procesos: el ×2,60 quedó en 1,5 %.
- **`m = max(μ, σ̂²_dentro)/τ̂²`, estimado SOLO sobre las entidades con base (n ≥ 5).** Dos
  desviaciones del doc, las dos medidas: (1) el doc pone `μ/τ̂²` (Poisson); los conteos reales están
  sobredispersos y asumir menos ruido del observado sobrepesaría el dato propio de una entidad de
  dos procesos; (2) estimar τ̂² con las entidades de 1-4 procesos fue el primer intento y **la suite
  lo cazó**: el ruido muestral de muchas pequeñas (s²/n con n = 2) superaba la varianza entre
  entidades y τ̂² salía ≤ 0 aunque las grandes difirieran de sobra (3, 8 y 18). Con `τ̂² ≤ 0` de
  verdad, todo se encoge a μ y `entidad_no_distingue:true` lo declara — «la dimensión entidad no
  existe» es un resultado, no un fallo.
- **El prior es el del DEPARTAMENTO, encogido a su vez hacia el nacional (B7, 16-ago-2026).** Se
  midió antes: los departamentos difieren de verdad (Bogotá 8,9 oferentes por proceso, Boyacá 2,3,
  Arauca 1,5, Caldas 11,4; desviación 2,3 sobre media 4) y el prior importa en el 13 % de las filas
  (peso < 0,8). El acumulador guarda el departamento de la entidad; `estimarPriorDepartamental` aplica
  «el mismo estimador un nivel arriba» (μ̂_d = w_d·μ_d + (1−w_d)·μ, m_d por momentos ENTRE
  departamentos con ≥ 30 procesos; con < 3 departamentos con base o τ_d² ≤ 0, todo es nacional y se
  declara) y cada entidad publica `prior` y `prior_origen` (`departamento:X` | `global`). La
  respuesta, el desglose («el resto lo pone el promedio de su departamento») y el modal lo dicen.
  El respaldo departamental calculado al SERVIR sigue existiendo para entidades ausentes del índice.
- **DOS LECTORES DE NÚMEROS, Y NO SON INTERCAMBIABLES.** El `numero()` del índice es el lector
  TOLERANTE del dataset (punto = miles): leía `peso_datos: 0.963` como **963** y el peso salía null.
  Los campos que escribe el propio módulo como JSON se leen con `Number` ESTRICTO (`maquina`), y la
  ausencia se descarta ANTES (`Number(null)` es 0 y colaba un peso «0» donde había ausencia — la
  misma trampa de la rampa, en otro sitio). Hay prueba con el registro tal como lo escribe el índice.
- **LA RAMPA DE BAJA NO EXISTE: hay un FACTOR DE PRECIO** `f = mult(min(b_max, b_mkt))`, con `mult`
  la MISMA curva del editor (`lib/apu/rentabilidad.multiplicadorPrecio`, extraída de
  `pGanarPorPrecio` para que haya UNA sola teoría de cómo el precio mueve la probabilidad — está
  PROHIBIDO reimplementarla en `lib/probabilidad`, y hay prueba de igualdad numérica). `b_mkt` es la
  mediana de `bajaDeMercado` (mín. 5, refinada por modalidad; su IQR es la dispersión) y `b_max` la
  baja máxima que el dueño soporta. **Sin `b_max` declarada el factor es EXACTAMENTE 1** y viaja
  (`origen_b_max:"neutra"`): el centro del mercado ya no penaliza ni premia — penalizar por no saber
  hasta dónde puede bajar sería inventar. El ×1,10 se fue SIN sustituto (adjudicar cerca del oficial
  es margen, no probabilidad). Impacto medido en producción sin reconstruir nada: `p` media 0,254 →
  0,240 (el ×1,10 alcanzaba al 69 % de las filas), Spearman del orden por VE 0,998, ningún proceso se
  mueve más de 0,066. El chip «Suelen bajar N %» SIGUE en la tarjeta como instrucción de precio.
- **`?baja_max=` SOLO CON TOKEN.** Sin credencial el parámetro es INERTE y `baja_max_ignorada` lo
  dice: si moviera `p`, un cliente público bisecaría en veinte peticiones la mediana que
  `lib/publico` acaba de tapar mirando dónde empieza a caer la probabilidad. Ilegible/negativo ⇒
  inerte, nunca 400. Y `lib/publico` redacta el ajuste `precio` igual que redactaba `baja_mercado`
  (su motivo lleva la mediana Y la `b_max`); `baja_mercado` se conserva en la lista de nombres por
  si un consumidor guardó una respuesta vieja.
- **`p` Y `p_sin_precio` SON DOS CIFRAS, y el editor de APU consume la SEGUNDA (A5).** `p_sin_precio`
  = base × prórroga × colisión (con los mismos límites). `lib/handlers/apu/editor.js` la pasa como
  `p_base` a `desdePresupuesto` y al optimizador, donde `pGanarPorPrecio` aplica el precio UNA vez con
  la baja que el dueño de verdad va a ofertar. Hay prueba de que `p_sin_precio` no depende de
  `baja_max` y de que con `baja_max=0` alguna entidad que descuenta pierde probabilidad.
- **LA BANDA (A6) es la misma cadena evaluada en r̂ ± 1,645·σ**, no un multiplicador: `p_lo`/`p_hi`
  en `estimarPDetalle`, `banda_90` en el desglose y en el tooltip de la tarjeta; sin `rivales_desv`
  vale `null` (jamás ±0). Se estrecha con n (prueba: n = 4 vs n = 40). `ordenar_por=ve_conservador`
  ordena por `cuantía × p_lo` — **opción, no default** — y cae al VE de siempre sin banda. Con
  `τ̂² ≤ 0` NO hay banda (`rivales_desv: null`, no 0: una banda de ancho cero sería certeza absoluta
  donde menos información hay — lo cazó la revisión adversaria). Y **el tope `min(b_max, mediana)`
  es DELIBERADO y asimétrico respecto del editor**: `b_max` es hasta dónde PUEDE bajar, no lo que va
  a ofertar; la tarjeta asume que ofertará en el centro si puede y no premia una baja especulativa;
  el editor conoce la baja REAL y `pGanarPorPrecio` la evalúa sin tope con la misma curva.
- **El desglose narrado cambió el paso 4** («Ajuste por precio: hasta dónde puede bajar frente al
  centro del mercado»; fórmula con `min(baja_maxima_del_dueño, baja_mediana_entidad)` y la curva de
  rentabilidad citada) y el paso 1 explica el encogimiento (peso de los datos propios, μ, banda).
  `ORDEN_CADENA`/`GRUPO_DE` usan `precio`. La frase de la tarjeta (`motivoProbabilidad`) ya no dice
  «suele adjudicar con descuento» como factor de la probabilidad —no la mueve—; nombra el precio solo
  cuando restó y el «promedio general» cuando `peso_datos < 0,5`.
- **B2 a medias, a propósito:** el acumulador guarda `por_anio` {año: {n, suma}} (año de adjudicación
  → publicación → «sin_fecha», `anioDe`, misma regla en el detalle), el registro lo publica y
  `/api/inteligencia?op=entidad` responde `reparto_por_anio` (n siempre; promedio del año solo con ≥ 5
  procesos EN ESE AÑO) y `encogimiento`; el modal lo pinta. Es lo que permite VER si el promedio de dos
  años mezcla la ventana de la ley de garantías 2026 — segmentar el estimador sigue pendiente.
- **A7 (16-ago-2026): LA COLISIÓN DE CIERRES SE MIDE, y el factor SALE de la medición.** El
  acumulador guarda por entidad `dias[día] = [n, suma]` con la MISMA `fechaCierre` de `lib/negocio`
  (require diferido: negocio → filtros → equivalencias → indice_competencia cerraría un ciclo);
  `medirColision` publica en `indice:competencia:meta.colision` el estadístico del §9.3 —
  estratificado por entidad, colisión = procesos cuyo día de cierre tiene ≥2 de la misma entidad,
  control = el resto, pooled— con `cociente_pooled` (promedios) y `multiplicador_implicito` (sobre
  1/(1+r), que es lo que multiplica `p`). **El índice MIDE y no opina**: la comparación con el factor
  vigente vive en `lib/probabilidad.leerColision`/`factorColisionDe` (dueño de la constante); un
  `require("./probabilidad.js")` en el índice —aunque diferido— hace que la cadena
  `filtros → equivalencias → indice_competencia` alcance `apu/`, y hay prueba que lo prohíbe.
  `factorColisionDe` aplica el multiplicador medido con ≥ 30 entidades, acotado a [0,8; 1,5]; sin
  medición cae al 1,15 declarado y el desglose dice `origen`. **Medido en producción: 1 465
  entidades, 28 747 procesos en colisión vs 65 501 de control, cociente de promedios 0,99,
  multiplicador implícito 1,06, mediana por entidad 1,07** — el ×1,15 era un supuesto y no estaba
  respaldado; hoy se aplica 1,06. La prueba a mano del fixture agrupa por `claveCanonica` (la
  entidad «con guion» y «sin guion» son UNA para el índice y sus procesos i=0 cierran el mismo día).
  Y `leerColision` cazó otra vez `Number(null) = 0`: la ausencia se descarta antes de convertir.
- **B2 MEDIDO Y CERRADO SIN SEGMENTAR (16-ago-2026), y la premisa era la mitad de la verdad.** El
  índice publica en su meta `periodos` (oferentes por año y dentro/fuera de la ventana de la ley de
  garantías 2026, 8-nov-2025 → 31-may-2026, estratificado por entidad con los dos lados). En
  producción: por año 4,35 (2024) · 4,08 (2025) · 4,11 (2026), estable; en la ventana **MENOS**
  oferentes por proceso, no más — cociente pooled 0,95, mediana por entidad 0,88, sobre 2 170
  entidades (3,74 vs 3,93 esperados). Hubo más procesos, y eso DILUYÓ a los oferentes; el promedio
  de dos años mezcla un −5 % sobre ~23 % de los procesos: ~1 % de sesgo agregado. **Segmentar el
  estimador no está justificado con esa magnitud** y no se hace; la medición queda publicada y se
  vuelve a mirar en cada reconstrucción (`lectura` dinámica según el signo). Anomalía del dato vista
  de paso: un proceso adjudicado con cierre en 2027 (34 oferentes) — `por_anio` lo enseña, no lo
  esconde. La sección «Investigación de contraste» de arriba decía «probablemente más oferentes»:
  ya está medido y es al revés.
- **B3 SEMBRADO (16-ago-2026): la prórroga del cierre ya se PERSISTE y se medirá sola.** La señal
  nacía en la lectura del corpus ACTIVO (todas las versiones del proceso viven bajo su mes de
  publicación) y moría con la full; el histórico guarda una sola versión, así que el ×1,20 no se
  podía calibrar. Ahora el delta, al cerrar un proceso, lee SOLO los chunks del mes de publicación
  de los que cierran (`senalesDeCierre` en `handlers/procesos/sync.js`, con `leerChunksDedup
  {senales:true}` que además publica `_cierre_inicial`) y estampa en el registro histórico
  `cierre_prorrogado` (true/false), `versiones_vistas` y `fecha_cierre_inicial`; sin versiones
  guardadas no hay señal (no se inventa) y `senales_cierre_estampadas` viaja en la respuesta del
  delta. El índice acumula prorrogados/no prorrogados por entidad y publica `meta.prorroga` (misma
  forma que la colisión); `lib/probabilidad.factorProrrogaDe` aplica el multiplicador medido con
  ≥ 30 entidades y hasta entonces el 1,20 declarado, con `origen` en el ajuste y en el paso 3 del
  desglose. **Los procesos del backfill no traen la señal** (una sola versión): la base se acumula
  desde el 16-ago-2026 y `sin_senal` lo cuenta. Nada que hacer: el día que haya base, el factor
  cambia solo y lo dice.
- **`b_max` SALE DEL APU DEL PROCESO (16-ago-2026 · `lib/baja_maxima.js`)**: con token, el listado lee
  los borradores del perfil (SCAN + MGET, la misma lectura que ya hacía `ordenar_por=margen`, ahora
  UNA vez y memoizada por fila) y para cada proceso con borrador CON costo calcula
  `b_max = 1 − piso_rentable/presupuesto_oficial` con la MISMA `pisoTecho` del panel (el piso ya
  lleva la contribución del 5 % y las deducciones). El APU MANDA sobre `?baja_max=`; el origen viaja
  (`baja_maxima {valor, origen: apu|declarada|null, borrador}` por fila y en el ajuste). **La vista
  `probabilidad` del desglose recibe `perfil` (el frontend lo manda) y `baja_max`, y los mete en el
  sello de su caché**: sin el perfil no vería los borradores y explicaría una `p` que la lista no
  calculó — hay prueba de igualdad. Sin token la baja máxima es costo del dueño y viaja null
  (defensa en profundidad en `lib/publico`). Una sola definición de «b_max = 1 − piso/PO»
  (`bajaMaximaDesdePisoTecho`), compartida por listado y desglose.
- **La mediana de la celda se ENCOGE hacia su modalidad SOLO para el factor de precio (§3.3)**:
  `lib/indice_baja.encogerBaja(baja, meta)` con `w = n/(n+m_b)` y `m_b = σ̂²_dentro/τ̂²` estimado al
  construir el índice sobre los grupos por ENTIDAD con base, con la media y la varianza EXACTAS del
  histograma (`meta.encogimiento`); la referencia es la cubeta de la modalidad utilizada o la
  global. **La tarjeta («Suelen bajar N %») y el piso/techo siguen con la mediana MEDIDA**: dos
  preguntas, dos cifras, y el ajuste publica `baja_mediana_celda`, `peso_datos_baja` y
  `referencia_baja` (el motivo dice «su celda: 12 %, ajustada hacia el mercado de la modalidad»
  cuando difieren). Sin `encogimiento` en la meta (hash viejo) la baja pasa tal cual con peso 1.
- **Tras desplegar:** nada se rompe sin reconstruir (compatibilidad probada con el hash viejo), pero
  el encogimiento y la banda solo se encienden con
  `/api/procesos?op=historico&reconstruir_indice=true` (token). La retirada de la rampa es inmediata.
- **MEDIDO EN PRODUCCIÓN el 16-ago-2026, índice reconstruido:** `encogimiento = {mu_global 4,18,
  tau2 9,51, sigma2_dentro 62,5, m 6,57, 2 062 entidades con base}`. La sobredispersión dentro de
  entidad es ENORME (varianza 62 sobre media 4): con la fórmula literal del doc (`μ/τ̂²`) el prior
  valdría 0,44 procesos y una entidad de 1 proceso pesaría 70 %; con lo medido vale 6,6 (n = 5 pesa
  43 %, n = 40 pesa 86 %). Impacto sobre el listado: `p` media **0,254 → 0,227 (−10,6 %) en Helder
  y 0,266 → 0,237 (−10,9 %) en Génesis** — supera el 10 % del protocolo y por eso queda dicho aquí:
  los mayores movimientos son entidades de 1-5 procesos con promedios de 1 oferente que antes se
  tomaban al pie de la letra (p = 0,50) y ahora se encogen hacia el mercado (0,26); el orden por VE se
  conserva (Spearman 0,995/0,994; top-20 19/20 y 18/20); la banda tiene mediana 3 pp y p90 9 pp.
  Consecuencia aguas abajo, ya prevista arriba: `veg` del editor de APU baja con `p_base` — es el
  número honesto, no una regresión. La explicación simple del desglose dice, con peso < 0,8, que la
  cifra mezcla el historial de la entidad con el promedio general (no «se han presentado en promedio
  X»): un estimador no se presenta como una medición.

### Desglose justificado de P(ganar) (ago 2026)

`lib/probabilidad_desglose.js` + `/api/competencia-detalle?vista=probabilidad` (alias
`/api/probabilidad-desglose`) abren el «Prob. estimada: 23 %» en SEIS pasos con fórmula, datos con
la fuente citada, aritmética escrita y aporte en puntos porcentuales. La cifra sin justificar era
una caja negra: el contratista no sabía si era buena, ni qué la causaba, ni cómo discutirla.

- **NO ES UN SEGUNDO CÁLCULO, y esa es toda la arquitectura del módulo.** `lib/probabilidad.trazaP`
  pasó a ser la ÚNICA implementación y publica la cadena multiplicativa SIN REDONDEAR (`p_antes`/
  `p_despues` de cada ajuste); `estimarPDetalle` es su vista redondeada —contrato intacto, mismos
  campos y mismos valores— y el desglose es su vista NARRADA. Reimplementar la cadena para poder
  explicarla era la salida obvia y es exactamente la que este proyecto ya pagó cara
  (`total_procesos`/`procesos_contados`, `cargado`/`cargado_el`): dos cuentas «equivalentes hoy»
  divergen a la primera corrección aplicada a una sola, y aquí la divergencia sería entre el número
  que enseña la tarjeta y el número que lo justifica. Hay prueba de que `probabilidad_final` es
  EXACTAMENTE el `p_ganar` de `/api/oportunidades` para el mismo proceso, sobre varios procesos: con
  uno solo coincidiría por casualidad, porque media lista comparte entidad y factores.
- **La suma de los `aporte_pp` ES la cifra final, con prueba.** Cada aporte es la diferencia REAL
  que ese paso introdujo (`p_despues − p_antes`), así que telescopan; el paso 6 —límites y
  redondeo— absorbe además el residuo de redondear a dos decimales los cinco anteriores, que es
  literalmente lo que ese paso hace. Una tabla de aportes que no cuadra con su total es peor que no
  tener tabla.
- **Los SEIS pasos viajan SIEMPRE, también los que no aplican.** Publicar solo los que mordieron
  dejaría al lector sin distinguir «no hubo prórroga» de «no se miró la prórroga», que es justo la
  distinción que el módulo existe para hacer.
- **«Sin dato» ⇒ 0 pp… salvo en el paso 1, y la excepción hay que dejarla escrita** porque parece
  una contradicción y una prueba la cazó. Un AJUSTE (pasos 2-5) sin sus datos aporta exactamente 0.
  Pero el paso 1 es la BASE: sin histórico de la entidad ni del departamento su confianza también es
  «Sin dato» y aun así aporta los puntos del supuesto conservador de 5 rivales. Bajarlo a «Baja»
  sería peor —«Baja» se lee como «poca muestra» y aquí no hay NINGUNA— y ponerlo a 0 pp dejaría la
  probabilidad en cero, que no es más honesto: es otro número inventado, y encima el que peor
  decisión provoca (descartar la oportunidad). El supuesto viaja escrito en `datos_entrada.fuente` y
  en el `fundamento`, y hay prueba de que los dos lo declaran.
- **DOS DISCREPANCIAS ENTRE EL ENCARGO Y EL CÓDIGO, resueltas a favor del CÓDIGO.** (1) El encargo
  describe la colisión de cierres como «≥2 procesos que cierran en ≤7 días»; `claveColision` agrupa
  por `entidad|YYYY-MM-DD`, o sea el MISMO DÍA. Ensancharlo a una ventana no es documentar, es
  cambiar la probabilidad de todo el corpus. (2) El encargo lista CUATRO factores y el código aplica
  SEIS: faltaban los dos de baja de mercado (×0,85 / ×1,10), que son los que convierten la respuesta
  en «P(ganar A UN PRECIO QUE VALGA LA PENA»). Omitirlos habría dejado fuera del desglose un ajuste
  que sí mueve la cifra que se enseña.
- **NO SE CREÓ UN ARCHIVO NUEVO BAJO `api/`, y entonces no podía haberlo**: el plan Hobby admite 12
  funciones y el repositorio estaba exactamente en 12 (hoy en 6). Va plegado en
  `api/competencia-detalle.js` como `?vista=probabilidad` —encaja: las dos vistas responden «de dónde
  sale ese número de la tarjeta», sobre el mismo corpus y con el mismo token— y la URL literal del
  encargo vive como `rewrite` de `vercel.json`, que no cuenta como función. Misma restricción que
  plegó `/api/apu/catalogo` y que impidió `/api/baja-mercado`. **El frontend llama a la CANÓNICA**:
  si el rewrite fallara, el modal tiene que seguir funcionando. La vista se resuelve de `req.query`
  **y del path como respaldo** (igual que `accion` en `api/apu/[accion].js`): un handler que solo
  funciona detrás del enrutador es un handler que no se puede probar.
- **La vista desconocida muere ANTES de autorizar y de tocar Redis**: así no gasta ni el token ni
  una lectura del corpus.
- **`costo_preparacion` no tiene default y entra en el sello de la caché.** No existe en ninguna
  fuente del proyecto, así que ponerle uno sería inventarse la cifra con la que se decide si vale la
  pena presentarse; sin él el resumen enuncia el umbral en MÚLTIPLOS del costo, que es igual de
  accionable y no afirma nada que no se sepa. Y va en el sello porque servir desde caché el resumen
  calculado con OTRO costo sería recomendar sobre una cifra que nadie pidió. No mueve la
  probabilidad —es un umbral de decisión, no una entrada del cálculo— y hay prueba.
- **El modal es el MISMO de competencia, no uno nuevo.** El esqueleto (fondo, las tres formas de
  cerrar, scroll, foco) es idéntico y duplicarlo habría duplicado también sus arreglos; lo que
  cambia —rótulo, título y botón de copiar— lo fija `app.js` al abrirlo. En la delegación del clic
  **la probabilidad se resuelve PRIMERO**: su botón vive dentro de la tarjeta y son dos vistas del
  mismo modal, así que solo puede ganar una.
- **El botón «Copiar justificación» nace oculto y `textoParaCopiar` se borra al ABRIR**: si no, el
  botón de un desglose seguiría copiando el del proceso anterior. Y si el portapapeles falla por las
  dos vías (`navigator.clipboard` no existe en contexto no seguro) **se dice**, en vez de fingir que
  copió — la regla del modal: ninguna pulsación sin respuesta visible.
- **El parseo del JSON va APARTE del `fetch`**, tercera vez que se aplica la misma lección: el muro
  del edge (Password Protection) responde HTML, `r.json()` lanza, y con las dos cosas en el mismo
  `try` ese muro se diagnostica como «sin conexión» — lo contrario de la verdad.
- **DOS PREMISAS DEL ENCARGO NO DESCRIBÍAN ESTE REPOSITORIO** y se resolvieron por la regla de «usar
  los patrones del proyecto», que el propio encargo fija: pedía **Bootstrap 5** y un **tema oscuro**
  (la app no tiene dependencias, usa Tailwind por CDN y es clara), y situaba el «Prob. estimada» en
  `/admin.html` + `admin.js`, donde **no se muestra**: vive en `public/app.js` + `index.html`.

## FILOSOFÍA DEL PRODUCTO (ago 2026) · la regla que manda sobre las demás

El dueño la dictó así: **«problemas e incógnitas difíciles, simplificadas para personas normales, que no
necesiten un curso académico ni experiencia para poder licitar»**. Traducida a criterio verificable:

> **Si para entender un número hace falta leer un párrafo, el número está mal elegido.** Se muestra el HECHO
> que hay detrás, no el modelo que lo produjo.

El producto se llama **Detekta** (con k desde ago 2026 —Fase 7 del plan v4—; ver esa sección). «Portafolio
Estratégico» era el nombre del REPOSITORIO filtrándose a la cara del usuario. Y **los emojis salen de la interfaz**: un pictograma que dibuja el sistema operativo hace
que una herramienta de trabajo parezca un juguete, y cambia de aspecto en cada aparato. Las pestañas se
rotulan con palabras (**Licitaciones · Precios · Mi empresa**) y en móvil llevan SVG en línea con
`currentColor`, que heredan el acento del tema sin una regla nueva.

- **LA TARJETA NO DICE «PROBABILIDAD», Y ES UN PROBLEMA DE SEGURIDAD DEL PRODUCTO, no de redacción.** El caso
  exacto que reportó el dueño: «por el nombre un contratista piensa que si tiene un 60 % de probabilidad de
  ganar y se presenta con 5 empresas distintas, va a ganar». Un PORCENTAJE invita a sumar; una **frecuencia
  natural** no: «de cada 6 procesos como este, gana 1» deja ver que se pueden perder los seis. Y la palabra
  «probabilidad» suena a medición cuando lo único medido de la cadena es **cuánta gente compite** —el resto
  son los SUPUESTOS CON NOMBRE que el propio código documenta, sin etiqueta contra la cual calibrarlos—.
  La tarjeta enseña el hecho medido primero (`cuantosCompiten`, `null` sin base: nunca se interpola una cifra,
  que es la cerradura del defecto «18.2 oferentes») y la frecuencia después (`frecuenciaNatural`, con
  `N = 1/p` exacto, suelo de 2 para no prometer certeza, y `null` —jamás «0 de cada N»— sin dato, R1).
  **El porcentaje SIGUE VIVO donde es una cuenta y no un mensaje**: el desglose auditable de seis pasos y el
  editor de APU, donde multiplica al margen. `fraseProbabilidad` se conserva para el modal.
- **EL VALOR ESPERADO ES UN PROMEDIO SOBRE INTENTOS, y hay que decirlo en la frase**: `ve` ya lleva dentro las
  veces que NO se gana, así que «si te lo ganás, te quedan X» cometería, una línea más abajo, el mismo error
  que las dos de arriba existen para corregir. Hay prueba que prohíbe esa redacción.
- **LA BAJA DE MERCADO SE DICE COMO INSTRUCCIÓN DE PRECIO, no como propiedad de la entidad.** «Descuento
  típico del 5 %» sonaba a trivia —el dueño: «¿de qué me sirve que me diga que la entidad adjudica el 95 % de
  su presupuesto?»— y tenía razón sobre el síntoma aunque la cifra no mida eso: **no** mide si la entidad
  ejecuta su presupuesto (eso lo obliga la norma), mide **cuánto descontó el que ganó**. La redacción vieja
  confundía las dos. Hoy: «Para tener opción hay que ofertar cerca de 5 % por debajo del presupuesto oficial:
  es lo que descontaron los que ganaron aquí (23 contratos ya adjudicados)». La cifra no cambia; cambia de
  quién habla la frase, de la entidad a QUIEN VA A OFERTAR. Con mediana 0 se dice «aquí se gana sin bajar el
  precio» en vez de «ofertá 0 % por debajo», que sería una instrucción absurda.
- **LA PESTAÑA «ADMINISTRACIÓN» SE LLAMA «MI EMPRESA» Y SE PARTIÓ EN DOS.** Ponía al mismo nivel seis cosas
  sin relación —RUP, tablero, experiencia, auditoría, catálogo de precios y sincronización—, y **cuatro de las
  seis no son de quien va a licitar sino de quien mantiene el sistema**: mezclarlas obligaba a entender el
  programa para poder usarlo. Arriba queda lo que describe a TU empresa (**Tu RUP · Obra que ya ejecutaste ·
  Códigos que te faltan en el RUP**) y lo técnico vive dentro de `<details id="seccion-sistema">`, que **nace
  cerrado**. **NINGÚN id cambió**: renombrarlos mataría `app.js` en silencio, que es el modo de fallo que la
  prueba de ids vigila. Los rótulos en jerga se tradujeron («Auditoría de cobertura RUP» → «Códigos que te
  faltan en el RUP»; «Dashboard» → «Tablero»).
- **NI UN EMOJI EN LA INTERFAZ, y hay prueba que lo impide** sobre `index.html`, `app.js` y `onboarding.js`.
  No es solo estética: **un emoji lo DIBUJA el sistema operativo** — cambia de aspecto en cada aparato, mete
  su propia paleta y **no hereda el color del tema**. El semáforo lo llevan hoy la clase de color que el badge
  YA tenía más un punto tipográfico **`●` (U+25CF)**, que sí la hereda. Los iconos de las pestañas móviles son
  **SVG en línea con `currentColor`**. `⚠️` se sustituye por el rótulo «Atención:», que además se lee en voz
  alta. **`public/apu_libro.js` queda FUERA de la prohibición**: sus marcadores viajan al Excel exportado, que
  es otro medio y otra decisión. Y las pruebas dejaron de usar los glifos como proxy de «esto está cableado»
  (se atan a los cuatro NIVELES de criticidad, no a los cuatro dibujos).
- **EL CATÁLOGO DE REDIS PUEDE SER ANTERIOR A LA RENUMERACIÓN, y eso lo encontró DESPLEGAR, no la suite.**
  Las pruebas corren contra la semilla del repositorio —que ya trae los códigos corregidos— y ese estado **no
  existe en producción** hasta que alguien recarga el catálogo. En vivo, pedir `INV-200.1` devolvía SIN
  PRECIO. `itemPorCodigo` mira ahora **de qué época es el catálogo** (`catalogoRenumerado`: ¿trae algún código
  que solo existe DESPUÉS?) y usa el mapa directo o el inverso. **No basta con probar el código tal cual
  primero**: contra un catálogo viejo `INV-661.1` EXISTE —era la CUNETA— pero hoy significa ALCANTARILLA, así
  que el acierto directo devolvería otro ítem. **R11: desplegar nunca debe exigir reconstruir.** Y la lección
  general: una suite que solo conoce el estado del repositorio no ve los estados que el DESPLIEGUE atraviesa.
- **LA CASCADA DE PRECIOS SE VE, Y ESE ERA EL PUNTO.** Existía en la respuesta de `/api/apu/cotizar` y
  **ninguna pantalla la consumía**: el usuario veía DE DÓNDE venía el precio (el badge) pero no POR QUÉ no
  venía de una fuente mejor. «Derivado regional» a secas se lee como un defecto del programa; «todavía no
  corregiste el precio de este ítem» es una INSTRUCCIÓN — y es justo la que hace que el usuario corrija
  precios, que es **lo único que mejora la aplicación con el uso**. Hoy `calcular` publica `cascada` por ítem
  y el desglose la pinta. **`explicarCascada` es PURA** y no vuelve a calcular: `calculo.js` ya sabe de dónde
  salió cada precio, y pagar un segundo `costoDirecto` por ítem solo para redactar el texto sería el doble de
  trabajo con 200 ítems. Los niveles y los motivos salen de `NIVELES`/`MOTIVOS` (R2). Se pinta en **las DOS
  ramas** de `pintarInsumos`, y en la del ítem SIN composición es donde más falta hace: ahí no hay ninguna
  otra respuesta en pantalla.
- **LA PESTAÑA DE PRECIOS SON TRES PASOS Y NADA MÁS A LA VISTA.** Entre el paso 1 y el 2 se colaban la
  RENTABILIDAD y el PRECIO SUGERIDO — dos bloques que no se pueden ni mirar hasta haber calculado, así que la
  pantalla pedía entender el programa antes de poder usarlo. Hoy: **1 ¿Qué vas a construir? → 2 ¿Dónde? →
  3 Calcular y exportar**, seguidos, y los resultados DESPUÉS. El paso 2 pide **una sola cosa**, el
  departamento. **AIU, anticipo, deducciones y ajuste competitivo se fueron a «Ajustes»** (plegado, en gris):
  sus valores por defecto sirven para la mayoría de los procesos y tenerlos delante obliga a decidir cuatro
  cosas antes de ver un precio. Hay prueba del ORDEN y de que esos cinco controles no vuelvan a la vista
  principal — sin ella, el próximo añadido los devuelve.
- **UN ACENTO GRAVE DENTRO DE UN TEMPLATE LITERAL LO CIERRA.** Un comentario HTML con `` `ve` `` dentro de la
  plantilla de `bloqueProbabilidad` dejó de compilar `app.js` ENTERO — la pestaña se muere en silencio, que es
  justo el modo de fallo que la suite vigila. Los comentarios van FUERA de la plantilla.

### La tercera cifra de la tarjeta es LA PLATA QUE QUEDA (`lib/ganancia`, ago 2026)

Encargo del dueño, con sus palabras: «el valor que me das al lado del valor total, que el cliente
asume que es lo que le queda de ganancia… no se entiende nada». La celda decía **«$1.183M · de
contrato esperado por intento · presupuesto × opción de ganar, contando las veces que no se gana ·
no es utilidad»**: correcto, con su aclaración al lado, y aun así leído al revés — y leído al revés
justo al lado de la cuantía, que es con lo que se confundía. Un número que se lee al contrario de lo
que dice hace más daño que uno que falta. Ahora la celda ES lo que el usuario creía estar leyendo.

- **NO ES UN SEGUNDO CÁLCULO: sale de `lib/apu/piso_techo`**, que es quien define en este
  repositorio qué es «no perder plata». `ganancia = V × (1 − τ) − CD × (1 + (A+I)/100)`, que es
  idénticamente `(V − piso_sin_utilidad) × (1 − τ)`. Reimplementarla habría creado una segunda
  definición de punto de equilibrio y la divergencia se vería en el peor sitio: la tarjeta diciendo
  que deja y el panel de Precios que no. Hay prueba de la identidad, de que en `V = piso_rentable` la
  ganancia vale exactamente `CD × U_min/100`, y de que el signo coincide con el veredicto del panel.
- **`costo_sin_ganancia`, JAMÁS `costo_total`.** El `costo_total` de `pisoTecho` lleva la utilidad
  mínima dentro. Dos cifras parecidas con nombres parecidos es `total_procesos`/`procesos_contados`,
  y aquí serían pesos. Por lo mismo `piso_techo` publica ahora `costo_sin_utilidad` **redondeado una
  sola vez**: deducirlo de `piso_sin_utilidad` (ya redondeado y ya dividido por 1 − τ) encadena dos
  redondeos y puede mover el resultado un peso justo en el borde del SIGNO, que es lo que decide.
  Invariante probada: `V = valor + descuentos + costo_sin_ganancia` — la resta que se enseña cuadra.
- **DOS NIVELES Y NINGÚN INVENTO.** `base: "apu"` = el costo directo del borrador de ESE proceso
  (medido, y viaja el `borrador` para poder auditarlo). `base: "estructura_de_precio"` = el costo se
  cierra por la IDENTIDAD con la que se arma cualquier oferta de obra —precio = CD × (1 + A + I + U)—,
  que es un supuesto sobre CÓMO construye el precio, no una estimación de sus costos, y viaja escrito
  en `supuestos`. El AIU sale del borrador del proceso; si no, del último que guardó
  (`config_reciente`, que `cargarCostosPorProceso` devuelve gratis: los borradores ya están leídos);
  si no, el de referencia 15/5/5 **y se declara**. Sin presupuesto oficial, `null` con motivo.
- **LA CONTRIBUCIÓN DEL 5 % NO SE LE COBRA A TODO, Y ESO MUEVE EL SIGNO.** El art. 120 de la Ley
  418/1997 grava los contratos de **OBRA PÚBLICA**; una interventoría o una consultoría son contratos
  de consultoría (Ley 80/1993 art. 32 num. 2) y no la causan. Cobrárselas restaba ~5 puntos de un
  margen típico de 4 y pintaba en rojo contratos que dejan plata. La regla vive UNA vez
  (`aplicaContribucion`) y el editor la **importa** — hay prueba de que no reaparece una segunda
  lista de «esto no es obra». Un tipo desconocido SÍ la causa: ante la duda, no prometer.
- **CON LA ESTRUCTURA DE REFERENCIA (A 15 · I 5 · U 5) LA CIFRA SALE NEGATIVA EN OBRA, Y ES LA
  LECCIÓN, NO UN DEFECTO.** −1 % del contrato: la ganancia declarada del 5 % no cubre la contribución
  del 5 %. Es literalmente «el olvido más caro del país» del manual, hecho visible en cada tarjeta. Y
  no se deja como un susto: la respuesta despeja `utilidad_minima_para_no_perder_pct` (6,32 % con
  A 15 · I 5) y la frase lo dice. **El despeje NO es el mismo en los dos modos de AIU**: en compuesto,
  A e I se cancelan. Solo tiene sentido en el nivel `estructura_de_precio` — con el costo MEDIDO, el
  precio al que la entidad adjudica no se mueve porque el usuario declare otra ganancia, y ahí lo
  accionable es el piso del panel.
- **…Y SI SU ADMINISTRACIÓN YA LLEVA LOS IMPUESTOS DENTRO, se cobrarían dos veces.** El desglose de
  AIU que se radica suele traer una línea de «impuestos, tasas y contribuciones» dentro de la «A». El
  error vale **5 puntos del contrato: más que la ganancia entera**, así que no se adivina ni se
  promedia — lo declara el usuario con la casilla «Mi administración ya incluye los impuestos del
  contrato» (Ajustes de *Precios*, `config.contribucion_en_administracion`, que viaja en el borrador
  y de ahí lo lee la tarjeta). El defecto es `false`: la doctrina que Piso/Techo ya aplica en
  producción. De paso se corrigió el pie de «Deducciones de acta %», que decía «Contribución 5 % +
  estampillas + ReteICA» e invitaba a escribir el 5 % que `pisoTecho` ya suma aparte.
- **SIEMPRE AL PRECIO DE MERCADO, TAMBIÉN CUANDO SALE EN ROJO.** Si el costo del usuario deja su
  precio mínimo por encima del techo, la cifra es negativa — que es el veredicto «no se presente» del
  panel adelantado a la tarjeta. Enseñar la utilidad que dejaría a SU precio sería una cifra en verde
  sobre un proceso que casi con seguridad no gana: aquí el falso positivo es el caro.
- **SIN CREDENCIAL VIAJA `null`, y por DOS motivos independientes**: sale del costo y de la
  estructura de precio del dueño, y lleva dentro el precio de mercado —la misma mediana de baja que
  `lib/publico` acaba de tapar—. Se anula el objeto ENTERO: `frase` dice «Si gana este contrato a
  $950.000.000…» y dejarla sería la redacción de mentira de `p2_k.mensaje` por cuarta vez.
- **ES SIEMPRE UNA COTA SUPERIOR Y SE ENUMERA POR QUÉ** (`cota_superior_por`): no descuenta el costo
  de financiar la obra mientras la entidad paga (~5 puntos según el manual), ni los ensayos, ni el
  PMA, ni la liquidación, y sin `deducciones_pct` tampoco las estampillas. «Cota superior» a secas es
  una etiqueta; con los motivos es la lista de lo que el usuario puede cargar para cerrarla. El
  número con caja, payback y maldición del ganador sigue siendo `lib/apu/rentabilidad`, que exige un
  presupuesto de verdad y por eso vive en Precios.
- **`copFirmado` es la tercera lección de `Number(null) === 0`**, y la cazó su propia prueba:
  `fmtCorto` responde «No definida» al 0 y `$-9500000` a un negativo porque nació para CUANTÍAS,
  donde no hay signo y el 0 es una ausencia. La ganancia tiene las dos cosas: signo, y un 0 que es el
  punto de equilibrio MEDIDO. La ausencia se descarta ANTES de tocar `Number`.
- **`ordenar_por=ganancia` («Lo que más deja») ordena por la ganancia PONDERADA** por la opción de
  ganar: un contrato enorme que se gana una vez de cada veinte deja menos, por intento, que uno
  mediano que se gana una de cada tres. Sin cifra va al final, jamás con un cero. Y `margen` se
  renombró a **«Más recorrido de precio»**: `techo − piso` es distancia entre dos PRECIOS, no plata
  que queda, y llamarlos igual («Dónde me queda más») era la misma confusión en el selector.
- **LA ASIMETRÍA DE `b_max` YA ESTÁ CERRADA (ago 2026), y era un defecto, no doctrina.**
  `lib/baja_maxima` cobraba la contribución del 5 % SIEMPRE, sin mirar el tipo de trabajo ni la
  casilla, mientras el editor de APU ya decidía con `lib/ganancia.aplicaContribucion`
  (`handlers/apu/editor.js`): **dos cifras del mismo proceso, y la mala era la que ORDENA la lista**.
  Medido con una interventoría de $1.000 M y costo directo $700 M (A 15 · I 5 · U 5): piso
  **$921.052.632 en vez de $875.000.000** —$46 M inflados— y **b_max 7,89 % en vez de 12,5 %**. Con
  una entidad que descuenta el 12 %, el factor de precio se hundía a **0,6144**: la app enseñaba esa
  interventoría **un 62,8 % menos probable de lo que es**. Decisiones:
  · **La contribución se resuelve DENTRO de `baja_maxima` (`contribucionPctDe`), no por parámetro del
    llamador.** El desglose (`lib/probabilidad_desglose`) no tiene el tipo de trabajo a mano, así que
    un parámetro se le habría olvidado y habría divergido del listado — y hay prueba de que los dos
    reproducen la misma `p`. Resolverlo dentro lo hace consistente POR CONSTRUCCIÓN.
  · **Llama a la regla que ya existía**, y hay prueba que PROHÍBE que este módulo fabrique su propia
    lista de «esto no es obra»: tres listas paralelas divergen a la primera corrección.
  · **La casilla del usuario manda también aquí.** `leerConfig()` de `public/app.js` ya documentaba
    que `contribucion_en_administracion` «viaja en el borrador y de ahí lo lee la tarjeta»: el
    contrato estaba prometido en el frontend y era `baja_maxima` quien no lo honraba.
  · **Un tipo de trabajo desconocido SIGUE causándola** (ante la duda, no prometer), y las filas
    hostiles no pueden tumbar el listado: `tipoTrabajoDe` no lanza con descripción nula, numérica,
    de 200 KB ni con cuantía ilegible — verificado, porque es el defecto de `lib/habiles.festivos`.
  · El temor que lo dejó aparcado era que «moviera la probabilidad de todo el corpus». **No la
    mueve**: solo cambia procesos de consultoría CON borrador guardado y costo directo. Las 4
    iteraciones de la suite pasan sin tocar ninguna otra cifra.

### Accesibilidad de la zona · el costo de LLEGAR ordena (ago 2026)

`lib/accesibilidad.js` + `data/accesibilidad_departamentos.json` + campo `zona` en
`/api/oportunidades`. Encargo del dueño: primero lo de mayor probabilidad que ADEMÁS esté a
≤250 km de Bogotá/Ibagué o cerca de un aeropuerto, sin difícil acceso ni conflicto. Metodología
completa y límites en `docs/ACCESIBILIDAD.md`. Decisiones que no hay que re-aprender:

- **Ordena y etiqueta; solo excluye con `?zona=facil` (opt-in).** El falso negativo cuesta más
  que el amarillo: una obra lejana puede valer la pena y la tarjeta lo dice con su chip.
- **Granularidad DEPARTAMENTO en bandas ANCHAS** (≤250/≤550/>550 km a la capital, estimaciones
  declaradas «estimado» en pantalla): más precisión sería fabricar exactitud. El orden de refinado
  (medir reparto → municipalizar Tolima/Cund. → ZOMAC/PDET de la fuente oficial) está en el doc.
- **La cubeta de zona va DENTRO de los viables y SOLO en `atractividad`**: viables → puntos de
  zona (3 cerca · 2 media/sin_dato · 1 lejos · −1 por alerta) → VE. Quien pide otro orden pidió
  ESE orden.
- **`sin_dato` = banda media y el filtro NO lo excluye** (R1: no saber no es estar lejos, pero
  tampoco se cuela de primero). Valor desconocido de `?zona=` es INERTE, jamás 400.
- **El aeropuerto sube «lejos»→«media» salvo `dificil_acceso`**: volar personas no mueve equipo
  de obra (Leticia tiene aeropuerto). El «≤2h30 del aeropuerto» municipal NO es computable sin
  datos externos y no se inventa: se aproxima por la capital y se declara.
- **Orden público: «verificá la zona», JAMÁS un veredicto.** Bandera departamental orientativa;
  afirmar conflicto sobre UN proceso con una tabla de 33 filas sería el falso positivo más caro.
- **Corre al SERVIR** (afinar la tabla = efecto inmediato, sin full) y es HOJA del grafo de
  requires, con su normalizador local (no importa `norm` de semantica — la lección del ciclo).
- **Los modales viven FUERA de `#app`** y la capa de tema tiene que traducirles fondo Y letra
  JUNTOS: el «Resumen ejecutivo» (text-gray-800) quedó invisible en modo oscuro porque el fondo
  se oscurecía por una regla que sí alcanzaba al modal y la letra no. Corregido ampliando los
  selectores de texto a los tres modales.

### Las dos alarmas del calendario (ago 2026)

- **La regla de las 24 horas es VISIBLE, no un tooltip** (`avisoCierre` en `public/app.js`): el
  error #1 del país (presentar el día del cierre) vivía solo en el `title` del chip de cierre,
  que en móvil no existe y en escritorio exige pasar el mouse. A ≤2 días del cierre la tarjeta
  pinta una línea con la instrucción («presentá el día ANTERIOR»; el día 0, que solo cuenta el
  estado «Presentada»). Solo a ≤2 días — un aviso encendido en cada tarjeta se deja de leer — y
  nunca en una tarjeta no viable (urgir a presentar lo que no pasa las puertas sería un
  contrasentido). `null` jamás produce urgencia (R1). Los días se calculan UNA vez
  (`diasParaCierre`, con la resta de 5 h de la hora Colombia) y alimentan chip y aviso: dos
  cuentas divergirían.
- **La alarma de renovación del RUP** (`alertaVigenciaRup` + nodo `rup-alerta-vigencia` en «Tu
  RUP»): el RUP se renueva antes del QUINTO DÍA HÁBIL de abril o pierde efectos un año entero —
  la alarma individual más cara que faltaba. Tres decisiones: (1) la fecha se calcula contando
  lunes-viernes SIN festivos, y es correcto porque los festivos (Semana Santa cae en abril a
  menudo) solo pueden CORRER el plazo hacia ADELANTE — el error cae del lado de avisar antes;
  por lo mismo, pasada la fecha calculada la frase manda a VERIFICAR al RUES y jamás afirma «ya
  no hay nada que hacer». (2) Solo vive de febrero al 30 de abril: encendida todo el año se
  deja de mirar (la lección del recuadro «0 problemas»). (3) El «ahora» se INYECTA y la prueba
  usa fechas fijas de 2026 (quinto hábil sin festivos = 7 de abril): una prueba de calendario
  calibrada contra el reloj real no prueba nada.

### Consolidación a 6 routers por dominio (ago 2026 · Fase 0 del plan Detekta v3)

- **`api/` contiene EXACTAMENTE 6 archivos** — `procesos.js` (sync · historico · listar · baja),
  `inteligencia.js` (las vistas del antiguo competencia-detalle: entidad · adjudicatario/competidor ·
  probabilidad · paa), `perfil.js` (resumen · diagnostico), `admin.js` (rup · experiencia ·
  cobertura · cargar-catalogo), `apu.js` (el editor entero) y `pliego.js` (extraer-texto ·
  descargar) — y la suite fija el conteo en `=== 6`. La regla operativa nueva: **un endpoint nuevo
  se pliega como `op` en el router de su dominio, jamás como archivo propio.** Quedan 6 huecos de
  reserva bajo el límite de 12 del plan Hobby; la época de «no se puede crear /api/X porque estamos
  en 12» terminó, pero el patrón de plegar sigue siendo el default.
- **Los routers NO llevan lógica ni autorización.** Leen `op` de la query (y del path como
  respaldo: un handler que solo funciona detrás del enrutador no se puede probar) y delegan con
  `require` DIFERIDO en `lib/handlers/{dominio}/` — los MISMOS archivos que eran funciones,
  movidos con `git mv` sin reescribirlos (solo cambió la profundidad de sus requires:
  `../lib/x` → `../../x`). Un router que autorizara por su cuenta sería una segunda copia de
  `lib/auth` que se desincroniza; la única escritura sin token (RUP por PDF) conserva sus
  cerraduras porque están en el handler, no en la ruta. Hay prueba (j.12-bis) de que el 401 de
  resumen, cargar-catalogo y extraer-texto ATRAVIESA el router.
- **Todas las URL viejas siguen respondiendo igual** vía `rewrites` de `vercel.json`
  (`/api/sync`, `/api/sync/historico`, `/api/oportunidades`, `/api/indice-baja`,
  `/api/competencia-detalle`, `/api/diagnostico`, `/api/resumen`, `/api/admin/*`,
  `/api/apu/:accion`). Dos detalles que no hay que re-aprender: (1) **los rewrites de Vercel NO
  se encadenan**, por eso los alias históricos (`/api/paa`, `/api/probabilidad-desglose`,
  `/api/admin/rup-desde-pdf`, `/api/admin/cargar-experiencia-genesis`) se re-apuntaron DIRECTO a
  los routers nuevos; (2) la query del visitante se FUSIONA con la del destino (comportamiento ya
  verificado en producción por `/api/paa?medir=1`), que es lo que hace que `?op=` conviva con los
  parámetros de siempre. **El cron sigue en `/api/sync`** (pasa por el rewrite): apuntarlo a una
  URL con query habría arriesgado la validación del deploy sin ganancia.
- **El frontend y las auto-invocaciones del servidor YA llaman a las rutas canónicas**
  (`/api/{router}?op=…`, PR posterior al #76, ago 2026): `public/*.js` no llama a ninguna URL
  legada (prueba j.12-ter, que mira código sin comentarios: `fetch`/`api`/`pedir`), y la sync
  auto-encadenada y el historico se re-invocan por `/api/procesos?op=…`. **Los rewrites de
  compatibilidad SE CONSERVAN, y no es una deuda**: son la capa que sostiene las URL que el dueño
  tiene pegadas en Chrome (`/api/sync?modo=full`, `/api/sync/historico?…`, `/api/paa?medir=1`…),
  la documentación entera y el cron de `/api/sync`; cuestan 18 entradas de un límite de 1 024 y
  retirarlas rompería enlaces sin ganar nada. Lo que la prueba garantiza es que nada INTERNO
  depende de ellos: si un rewrite fallara, la app y la cadena de sincronización siguen. Las guardas
  de «el token no viaja en la URL» se re-apuntaron a los patrones canónicos (`/api/apu?op=…`,
  `/api/admin?op=…`): dejarlas sobre las URL viejas las habría vuelto vacuas en silencio.
- **Dos premisas del encargo eran FALSAS y quedaron medidas en `docs/datos.md`**: el filtrado ya
  leía `estado_del_procedimiento` primero (con `fase` de respaldo y listas canónicas — no hubo
  ningún cambio de filtro, así que el conteo antes/después es idéntico por construcción), y los
  perfiles/UNSPSC ya tenían una sola fuente cada uno (`lib/perfiles.js` IMPORTA las whitelists de
  `lib/unspsc.js`; fusionarlas crearía el ciclo `perfiles → unspsc → perfiles` que este proyecto
  evita a propósito). La lección de método sigue siendo la de siempre: **auditar antes de tocar —
  las premisas de un encargo se verifican contra el código real, no se ejecutan por obediencia.**
- **`lib/handlers/admin/experiencia.js` requiere el JSON de la raíz con TRES niveles**
  (`../../../experiencia_genesis_106.json`): al moverse el handler un nivel más adentro, el
  require estático —el que hace que el tracer de Vercel lo empaquete— cambió de profundidad. Si
  alguien mueve un handler, los requires de la RAÍZ (no solo los de `lib/`) cambian con él.

### Fase 1 · Motor de costo real (ago 2026)

Plan maestro Detekta v3, Fase 1. `lib/parametros.js` (DEFAULTS del encargo, VERIFICACIÓN por
parámetro, `apu:parametros` + `apu:parametros:v:{vigencia}`), `lib/costos.js` (re-export de
`public/costos.js`, UMD: **una sola implementación** para servidor y navegador), acción
`parametros` en `/api/apu` (GET pública · POST con token), formulario en *Mi empresa → Sistema* y
vista pública «Cómo calculamos» en *Precios*. Metodología y estado de verificación:
`docs/metodologia.md`. Decisiones que no hay que re-aprender:

- **EL «DIVISOR DE HORAS DEL CATÁLOGO» NO EXISTE — tercera premisa falsa del plan maestro.** Se
  despejó en tres APU (`docs/metodologia.md` §1): `subtotal_MO ÷ días = jornal × 1,55` exacto. La MO
  se cotiza POR DÍA y el motor calcula días por unidad; ni `calculo.js` ni `catalogo.js` dividen por
  8, 7,33 ni 210. La Ley 2101 entra como **`factor_jornada` = horas de calibración ÷ horas
  vigentes (44/42)** sobre la CANTIDAD (días) de las líneas de MO —no sobre el jornal, que es el
  dato calibrado—; cada línea publica el factor y `cantidad × precio = valor` sigue cuadrando. NO se
  aplica al equipo (alquiler por día calendario; extenderlo sería asumir). **YA NO ES UN PENDIENTE:**
  se midió y se cerró el 16-ago-2026 —ver «El factor de jornada NO se aplica al equipo» más abajo—,
  con prueba que fija la medición. Esta línea decía «pendiente medible» y contradecía a aquella; una
  memoria que se contradice a sí misma es fuente de error, igual que una que da por hecho lo que no está.
- **Sin `parametros` el motor calcula EXACTAMENTE como antes** (`costoDirecto(item, cat, region,
  opciones)`, opciones neutras por defecto): así se prueba la calibración Nogal. El HANDLER de
  `calcular` y `cotizar` los carga SIEMPRE (`parametrosParaMotor`: Redis → DEFAULTS declarados en
  `parametros_costo.fuente`). `calcularPresupuesto` sin parámetros publica `parametros_costo: null`
  —no «factor 1»—: la distinción «no sé» / «cero» otra vez. Y **cotizar y calcular reciben las
  mismas opciones**: dos unitarios distintos del mismo ítem es el defecto que este proyecto pagó.
- **44 h de calibración es un SUPUESTO declarado**: el contrato Nogal es de 2025 y el catálogo no
  guarda su fecha (46 h si es anterior al 15-jul-2025). Se cambia en el formulario, sin código.
- **Impacto medido y publicado por la suite** (j.13): MO +4,76 % en los 174 ítems, costo directo
  medio +2,37 % (+1,03 % ponderado; la MO pesa 13 % del CD en Bogotá), EPP 3 % de la MO. Al alza,
  como preveía el encargo, y menor que «4,8 % del costo» porque el 4,8 % es sobre la MO.
- **Los recargos del modelo (58,29 % nominal / 44,79 % exonerado) son los de
  `lib/apu/normativa.js`** y hay prueba que los ata: dos tablas de nómina no pueden discrepar. La
  exoneración (E.T. 114-1) descuenta salud + SENA + ICBF JUNTOS y solo bajo 10 SMMLV; una persona
  natural con un solo empleado NO está cobijada, y la casilla lo dice.
- **Administración: dos metodologías, UNA función** (`costos.administracion`). Por tiempo (IDU) la
  A % se DERIVA (admin ÷ CD) y resumen/Excel/PDF leen `aiu_pct` como siempre; hay prueba de que
  ambas dan el mismo precio de venta. **El predeterminado sigue siendo el porcentaje**, no «tiempo»
  como sugiere el encargo: exige gastos fijos que el usuario puede no tener, y un default que
  produce nada es peor que un 15 % declarado. Sin datos cae al % Y AVISA.
- **Un parámetro ausente LANZA, no se rellena** (`costos.js`), y `validar` exige el objeto
  completo: inventar un porcentaje de nómina es inventar un precio. Ninguna tasa vive en el
  frontend (prueba: `0.08333|0.0696|0.225` prohibidos en app.js); las tarifas ARL viajan del
  servidor. La versión se escribe ANTES que la vigente: nunca una vigente sin su versión.
- **La hoja APU del Excel imprime el EPP** junto a la herramienta menor (sección EQUIPO, donde el
  motor lo suma) y la línea de MO escribe «días × 1,048 por jornada de 42 h»: sin eso VR COSTO
  DIRECTO incluiría un valor que ninguna fila explica — la fila «que no cuadra».
- **AIU de subcontratista (16-ago-2026): HECHO, con el dato por ítem.** `subcontratado` +
  `aiu_subcontratista_pct` por ítem (casilla por fila en el paso 3; columnas opcionales
  «SUBCONTRATADO»/«AIU SUB» del Excel — «AIU SUB» se detecta ANTES que precio para no tomarse por la
  columna de precio; el importador lo pasa en `entrada_calculo`; el borrador lo guarda y lo carga).
  `config.aiu_sobre_subcontratado` (default true) decide si el AIU propio se aplica también sobre lo
  subcontratado o si va al precio A COSTO (`precio_venta = base_aiu × factor + (CD − base_aiu)`); el
  resumen publica `costo_directo_subcontratado/propio`, `base_aiu`, `aiu_subcontratista_incluido`
  (null sin %, jamás 0) y `subcontratados_sin_aiu_declarado`; la alerta lo cuenta. Sin subcontratos
  los números son EXACTAMENTE los de antes (prueba).
- **El factor de jornada NO se aplica al equipo — decidido con evidencia (16-ago-2026):** en la
  semilla la maquinaria va por HORA con rendimiento propio, y en Nogal solo 2 de 452 líneas de equipo
  por día siguen al rendimiento de la cuadrilla (son costos por unidad, no días de presencia). Hay
  prueba que fija esa medición (< 5 % siguen a la cuadrilla): si el catálogo cambiara, se retoma.
- **Estado de verificación honesto — CONTRASTADO CON LAS FUENTES PRIMARIAS el 16-ago-2026** (el 403
  a IDU/INVIAS era otra observación con fecha; `docs/metodologia.md` §7 tiene lo leído, cita por cita):
  verificados prestaciones (además contrastadas con la tabla 3 de la guía IDU GU-DP-017: 45,10 % /
  58,90 %, a 0,3–0,6 pp de las nuestras — la dotación), exoneración, ARL, jornada, IVA-U, SMMLV (ojo:
  el D. 1469/2025 está SUSPENDIDO por el Consejo de Estado y rige el D. 159/2026 transitorio con el
  mismo valor), **auxilio de transporte** (D. 1470/2025 art. 1), **divisor 210** (IDU: hora = mes ÷ 30
  días ÷ h/día, con h/día = h semana ÷ 6 → 210 con 42 h; INVIAS 2026-1 igual) y **herramienta menor
  5 %** (INVIAS APU 2026-1, línea HERMENINV = 0,05 en todos los APU). **TPNL, MVP y EPP NO ESTÁN en
  ninguna de las dos fuentes** — el IDU calcula la hora sin ese recargo y el INVIAS aplica un factor
  global de 2,04 al obrero sin desglosar — y quedan como «referencia, SIN fuente oficial»: solo mueven
  el ejemplo público de costo-hora, nunca el jornal calibrado del catálogo. El «Manual IDU 2.2.2
  metodología B» que citaba el encargo no existe con ese nombre en el portal del IDU. **El método del
  factor de jornada es literalmente el del IDU** («incremento del 2,174 % en los rendimientos» de los
  APU con jornales al pasar de 47 a 46 h). Hallazgo lateral: INVIAS ya publica los APU 2026-1 en xlsx
  (`Territorio_APU_2026_1.xlsx`) y la API ArcGIS sigue en 2025-2 — `data/apu_invias.json` se re-capturó
  a 2026-1 desde ese Excel el mismo día (ver «Referencia oficial INVIAS por insumo»).

### Fase 2 · Puerta de entrada de 60 segundos (ago 2026)

`lib/handlers/perfil/entrada.js` (POST `/api/perfil?op=diagnostico`; `op=entrada` sinónimo, GET =
actividades), `lib/perfil_manual.js` (12 actividades → familias de las TIPOLOGÍAS del APU → clases de
la unión de los RUP), `lib/perfil_dinamico.crearPerfilDinamico` (extraída de `admin/rup.js`: una sola
vía para crear perfiles `rup_…`), K «sin dato» en `lib/capacidad`/`lib/rup`/`lib/puertas`, y la
landing nueva en `index.html` + `onboarding.js`. Decisiones que no hay que re-aprender:

- **La op se llama `diagnostico` porque el plan maestro lo fija así, y colisiona con el embudo de
  siempre**: se separan por MÉTODO en `api/perfil.js` (GET con token = embudo; POST público = entrada)
  y `entrada` existe como sinónimo sin ambigüedad. El GET de `entrada` responde 200 con las
  actividades (lectura sin efectos), no 405: es lo que pinta el selector de tres datos — una sola
  lista, la del servidor.
- **El servidor NO recibe el PDF binario** (no hay con qué leerlo sin dependencias): el `documento
  base64` del contrato del plan se resuelve como `{texto}` (pdf.js en el navegador, privado y rápido)
  o `{imagenes_base64}` (páginas rasterizadas / fotos → OCR.space). Es más privado que mandar el PDF.
- **NINGÚN camino termina en error sin salida**: `leido:false`, OCR sin clave, validación fallida,
  ZIP sin fotos, PDF con contraseña… todo desemboca en `siguiente:"manual"` (200, no 4xx) y el
  navegador pinta los tres datos con el motivo en una línea. Hay prueba de que el catch del flujo del
  RUP ya no puede terminar en un mensaje de error.
- **Se pide SOLO lo que falta**: sin patrimonio → `necesita:[patrimonio]`; sin experiencia →
  `necesita:[experiencia_smmlv]`; el resto de indicadores queda `null` («sin dato») y el perfil se
  valida en modo `aproximado` (`validarPerfilDinamico(id, perfil, {aproximado:true})`: patrimonio
  obligatorio SIEMPRE, lo demás nullable). Fuera de ese modo la validación sigue estricta: un archivo
  del dueño con un hueco no puede pasar en silencio.
- **K SIN DATO = null, jamás 0**: `coDe` devuelve `null` sin utilidad/ingreso operacional, `crp`
  propaga `null` (también en plural: si a un integrante le falta, la suma no se conoce), `evaluarRup`
  publica `k_sin_dato:true` y deja pasar, `p2K` responde `sin_dato` y dice qué falta. Antes `null ×
  16,7 = 0` daba K = 0 y cerraba la puerta por ignorancia. `topeSMMLV null` tampoco corta.
- **`total` ≡ `/api/oportunidades` del mismo perfil, con prueba** (misma cascada, mismas puertas,
  mismo `cargarConocimiento`, que se EXPORTA desde `handlers/procesos/listar`). «Hoy hay 47» y «Ver las
  47» no pueden decir dos cifras. La muestra son 5 procesos reales, abiertos, los que cierran antes.
- **El documento no se persiste**: la prueba busca LÍNEAS LITERALES del certificado en toda clave
  nueva de Redis (no la razón social, que sí es un campo del perfil derivado, como en la carga por PDF
  de siempre). El perfil `rup_…` dura 45 días (es «el resultado del análisis», y es lo que hace que
  «Ver las N» funcione en visitas posteriores); el conteo se cachea 24 h en `diagnostico:{hash}` con
  hash del PERFIL DERIVADO, y la caché solo se sirve si el perfil al que apunta sigue existiendo
  (EXISTS): borrarlo desde Mi empresa no puede dejar un «Ver las 47» que responda «perfil caducado».
- **`limpiarRedis` de la suite purga `diagnostico:*`**: la caché referencia perfiles que la limpieza
  borra; sin purgarla, la iteración 2 servía un resultado con un perfil inexistente y el listado daba
  404 — costó una corrida.
- **El perfil manual mapea la actividad a CLASES de la unión de los RUP** (vía las familias curadas de
  `lib/apu/tipologias`), nunca a códigos inventados: es el único universo que el matching (exige clases)
  y la ingesta (`FAMILIAS_UNION`) comparten. `tipo: persona_natural` es un supuesto declarado. Las
  etiquetas van en lenguaje llano y hay prueba de que no llevan códigos.
- **`onboarding.js` llama a `/api/perfil?op=diagnostico`**, no a `/api/admin?op=rup&origen=pdf`; ese
  endpoint SIGUE existiendo (alias `/api/admin/rup-desde-pdf`, pruebas propias) y crea el perfil por la
  misma función. El `submit` del formulario y el `click` del botón comparten una guarda de reentrada.
- **`value="salarios"` en el selector de unidad, no `SMMLV`**: la prueba de jerga barre el HTML entero
  (también los atributos); el JS traduce a la unidad que espera el servidor.

### Fase 3 · Panel Piso / Techo (ago 2026)

`lib/apu/piso_techo.js` (capa PURA), bloque `piso_techo` en `POST /api/apu?op=rentabilidad`,
sección `#seccion-piso-techo` (primera entre los resultados de *Precios*), campo «Utilidad mínima
aceptable» en Ajustes y `public/justificacion.js` (UMD). Decisiones que no hay que re-aprender:

- **LAS DOS FUENTES DEL ENCARGO SE VERIFICARON Y NINGUNA SE INTEGRÓ, con medición** (`docs/datos.md`
  §5). `hgi6-6wh3` responde **0 filas para procesos ABIERTOS** (los proponentes aparecen tras la
  apertura) y en adjudicados su conteo == `respuestas_al_procedimiento` de p6dx (8/8): aporta
  NOMBRES, no un conteo. `jbjy-vk9h` publica `valor_del_contrato` == `valor_total_adjudicacion` de
  p6dx (8/8, al centavo): la «baja verdadera» que pedía el plan **es la que ya calcula
  `lib/indice_baja`**; jbjy añade EJECUCIÓN (pagos, adiciones), otra pregunta. Se une por
  `proceso_de_compra` = `id_del_portafolio` de p6dx, columna que el corpus NO proyecta hoy. **El 403
  a datos.gov.co era una observación vieja**: las dos respondieron 200.
- **El techo es UNA fórmula, no dos**: `piso_techo.cifras.techo_competitivo` ≡
  `ajuste_competitivo.precio_sugerido` (misma mediana, mismo redondeo), con prueba. La cascada de
  baja se LLAMA (`bajaDeMercado`, mínimo 5) y el panel vuelve a exigir n ≥ 5 por su cuenta
  (`bajaUtilizable`) por si alguien lo alimenta a mano; **el índice por SEGMENTO (mínimo 3) no se usa
  aquí jamás**. Sin base → «Sin referencia» y `techo_competitivo: null`: un techo sobre 3 procesos
  es peor que ninguno porque el usuario lo va a creer.
- **El piso lleva la contribución del 5 % (y las deducciones cargadas) como DIVISOR**, no solo el AIU:
  «no perder plata» perdiéndola en cada acta sería la mentira más cara del panel. Sin deducciones
  cargadas el piso es COTA INFERIOR y viaja `piso_es_cota_inferior`. Consecuencia medida en el caso
  real: el precio del APU con U = 5 % queda por debajo del piso SOLO por la contribución — y el
  estado `bajo_el_piso_por_deducciones` lo dice con la cifra que falta, en vez de un genérico
  «perdería plata».
- **La utilidad mínima la declara el usuario** (`config.utilidad_minima_pct`, campo en Ajustes que
  viaja `null` cuando está vacío); sin declararla se usa la U del AIU y se publica en `supuestos`.
  El frontend NO la rellena con la U: el panel tiene que distinguir «declarada» de «supuesta».
- **El umbral de precio artificialmente bajo (80 %) es de REFERENCIA y se declara**: la «media de las
  ofertas − σ» del encargo no se conoce antes del cierre (hgi6 no trae precios). Los porcentajes de
  descalificación por MODALIDAD que el dueño advierte NO se encontraron en fuente verificable y no
  se inventaron: pendiente en `docs/metodologia.md` §6.
- **Con mediana 0 el panel no dice «0 %»** (se lee como sin dato): dice «No baja el precio · se
  adjudica por el presupuesto oficial», y el techo se rotula «aquí se gana sin bajar el precio».
- **`hgi6-6wh3` trae `nit_proveedor = "No Definido"`**, el mismo literal-trampa que
  `nit_del_proveedor_adjudicado` en p6dx: si algún día se integra, no es un NIT ni un `null`.
- **La justificación se genera desde la respuesta ENTERA de rentabilidad guardada en memoria**
  (`ultimaRentabilidad`: presupuesto + `piso_techo`), no desde `ultimoCalculo`: así el documento dice
  las mismas cifras que el panel que se está viendo. Es un `.html` imprimible (Blob + `<a download>`),
  y `Justificacion.generar` publica `resumen` para que la prueba compare sus cifras con el resumen
  del presupuesto. `nombreArchivo` es determinista (la fecha entra como dato).
- **El panel se pinta ANTES que la rentabilidad** en `calcularRentabilidad` y `reiniciarEditorParaProceso`
  lo esconde: un veredicto del proceso anterior bajo la cabecera del nuevo es «cifras viejas con
  aspecto de nuevas», el modo de fallo más caro del módulo. Se dispara con la misma condición de
  siempre (`id-proceso` presente), fijada por la prueba del optimizador.
- **La verificación fue en NAVEGADOR REAL antes de desplegar**: servidor local que sirve `public/` y
  reenvía `/api/*` a producción, inyectando `piso_techo` calculado con el módulo local sobre la
  respuesta real de rentabilidad; Chromium recorrió tarjeta → «Calcular mi precio» → ítems → «Calcular
  APU» → panel → descarga. Así se cazaron los dos refinamientos de arriba (mediana 0 y contribución).

### Fase 7 · Marca: Detekta, con k (ago 2026 · plan maestro v4)

`public/glosario.js` (UMD) + `lib/glosario.js` (re-export, el patrón de `costos.js`) + `docs/marca.md`.
Decisiones que no hay que re-aprender:

- **UNA fuente de verdad del nombre: `MARCA.nombre`.** Ninguna cadena visible lo escribe a mano: los
  encabezados de landing, gate y barra son nodos `[data-marca="nombre"]` que nacen VACÍOS y
  `Glosario.estampar(document)` rellena al cargar; el Excel (`docProps`) y la justificación de precio
  reciben `MARCA` del glosario (Node por `require`, navegador por `window.Glosario` — por eso
  `glosario.js` se carga PRIMERO en `index.html`, y `xlsx.js`/`justificacion.js` LANZAN si falta en vez
  de firmar con un nombre vacío); el `User-Agent` de `lib/apu_descargar.js` también.
- **La ÚNICA excepción declarada son `<title>` y las `<meta>`** de `index.html`: el navegador y los
  rastreadores las leen antes de que corra ningún script. La suite exige que sean EXACTAMENTE
  `Glosario.titulo()` y `Glosario.descripcion()` — un literal atado por prueba no es «escrito a mano».
- **Lo que NO cambia y no puede cambiar**: repositorio, URL de producción (`MARCA.dominio` se cambia
  solo el día que se compre un dominio: pasos sin terminal en `docs/marca.md` §4), claves de Redis,
  variables de entorno, archivos/funciones/endpoints y las **claves de almacenamiento del navegador**
  (`sessionStorage["detecta-acceso"]`, `localStorage["detecta_perfil_rup"]`): renombrarlas cerraría la
  sesión de todos y les borraría el perfil guardado. Van en minúscula y hay prueba de que siguen ahí.
- **El criterio de aceptación es una búsqueda de texto y la suite lo ejecuta tal cual**: recorre el
  repositorio entero (`.js/.json/.md/.html/.css/.csv/…`) y falla si la grafía vieja aparece en un solo
  archivo; la palabra se construye por concatenación para que la prueba no se cace a sí misma. Una
  aparición como VERBO («detecta un signo invertido» en `docs/APU_INFORME_COMPLETO.md`) se reescribió
  para que el criterio fuera literalmente cierto, no «cierto salvo una».
- **El glosario (§8 del plan) vive en el mismo archivo** (`TERMINOS`, `VERBOS`, `sinReferencia()`):
  las pantallas nuevas (fases 8-10) leen de ahí; traducir las existentes es la Fase 6 (transversal) y
  NO se hizo aquí — «Detectar ítems»/«Detectados» que quedan en `app.js` son verbos, no marca.
- **Dos premisas del plan v4 auditadas como FALSAS antes de tocar nada**: la utilidad operacional de
  Helder YA era $198.810.000 en `lib/perfiles.js` (desde el commit `cbfbeb6`; el $188.232.004 solo
  existía en el prompt), y el consorcio NO «hereda de Génesis sin ponderar»: `derivarJuntos` pondera
  50/50 (`ponderar`), suma experiencia y une UNSPSC. Lo que sí falta —participación editable, TRUNCAR
  indicadores a dos decimales como hacen las cámaras, «cuántas puertas más se abren»— es la Fase 10.

### Fase 8 · Los siete filtros (ago 2026 · plan maestro v4)

`public/filtros.js` (UMD: vocabulario, rangos, ventanas, departamentos con código DANE, estado de
URL) + `lib/filtros_lista.js` (clasificación de la fila y aplicación en el servidor) + parámetros
nuevos de `/api/procesos?op=listar` + `op=entidades` + la barra `#filtros-barra` de la pestaña
Licitaciones. Censo de columnas y línea base en `docs/datos.md` §6. Decisiones que no hay que
re-aprender:

- **`lib/filtros.js` es la CASCADA de juicio y no se tocó; lo nuevo se llama `filtros_lista`.** Los
  filtros del usuario corren DESPUÉS de la cascada, las puertas y los filtros de siempre: `totalSinFiltros`
  es esa base y `total` lo que queda. Meterlos en la cascada haría que `totales.visibles` del panel
  dependiera de lo que el dueño tuviera marcado (la regla ya escrita arriba).
- **Antes de encender nada se MIDIÓ en producción** (protocolo §9.6 del plan): apagar «suministro» por
  defecto esconde 6,7 % (Helder) / 5,7 % (Génesis) y son compras de verdad → se aplica; preajustar la
  zona a Bogotá/Ibagué habría escondido el **41 %** → NO se preajusta, queda como clic opt-in («Solo cerca
  de mi zona» = el `?zona=facil` de siempre). Un plan que dice «preajustado» no manda sobre una medición.
- **Un valor desconocido es INERTE** (`tipo=zzz`, `cierre=ayer`, `dep=Marte`): se ignora, jamás vacía la
  lista ni da 400 — un enlace guardado tiene que seguir valiendo (la regla de `?zona=`). Con solo valores
  desconocidos en `tipo` el filtro vale `null`, no `[]` (que excluiría todo): costó una prueba.
- **La cobertura se verificó contra la fuente real, no contra el plan**: 6 de las 11 «candidatas» del
  plan v4 NO EXISTEN en `p6dx-8zbt` (`cuant_a_del_proceso`, `nombre_de_la_entidad`, `departamento`,
  `ciudad`, `fecha_de_recepcion_de_respuestas`, `fecha_de_presentacion_de_ofertas`…); las reales son
  `entidad`, `nit_entidad`, `departamento_entidad` (NOMBRE, no código; 7,6 % «No Definido»),
  `ciudad_entidad`, `modalidad_de_contratacion`, `tipo_de_contrato` (100 %) y la fecha de cierre viene
  TRUNCADA (`fecha_de_recepcion_de`) — 8 % en el dataset entero pero **100 % en las modalidades
  competitivas** que la app ingiere. Un filtro sobre una columna vacía esconde licitaciones buenas.
- **`departamento_entidad` es texto** → `?dep=` acepta código DANE o nombre y traduce con la tabla de
  `public/filtros.js`, cuya `claveDepartamento` es la MISMA regla que `lib/accesibilidad.clave` (prueba
  sobre la misma batería; el navegador no puede requerir aquel módulo). «No Definido» es `sin_dato`: no
  entra en ningún departamento y se cuenta aparte en las facetas.
- **El tipo de trabajo NO inventa una tercera lista de «esto es obra»**: `tipo_de_contrato` es la señal
  primaria, corregida por `hayVerboDeObra` (semantica) y la pertinencia ya calculada por la cascada
  (`rup.pertinencia.tipo`). «Suministro» CON verbo de obra es obra; «Prestación de servicios» con
  «construcción de placa huella» es obra; interventoría se separa de consultoría porque el plan las
  separa. La modalidad se casa por RAÍZ normalizada (los literales de SECOP II varían) y lo que no casa
  va a «otra» y se cuenta.
- **Cero resultados nunca es un callejón sin salida**: el servidor prueba QUITAR cada filtro activo por
  separado y publica `sugerencia {filtro, siLoQuita}` con la cifra CONTADA (hay prueba de que coincide
  con la petición sin ese filtro); el navegador pinta la frase con el botón. Si ninguno recupera nada,
  `null` — no se inventa una salida.
- **`ordenar_por=margen` no inventa margen** (regla dura §8.3): solo los procesos con un borrador de APU
  guardado CON `costo_directo_guardado` (el frontend lo manda desde ago 2026; un borrador viejo cuenta en
  `borradores_sin_costo` y hay que recalcular y guardar) entran al orden, con `techo − piso` calculado
  por la MISMA `pisoTecho` del panel (prueba de igualdad al peso); los demás «Sin referencia», al final;
  el campo `margen_estimado` solo viaja con ese orden (no se pagan los borradores en el listado normal).
  `orden=` del plan choca con el `orden=asc|desc` existente: el criterio sigue en `ordenar_por`.
- **`op=entidades` es PÚBLICO** (nombres de entidades y conteos de procesos abiertos son datos públicos;
  la regla del token es «las cifras del perfil») y reutiliza `cargarCorpus` del listado (misma
  memoización): no es una segunda lectura del corpus.
- **El estado vive en `location.search`** (`?tipo=…&modalidad=…&dep=…&cierre=…&ordenar_por=…`), se
  escribe con `history.replaceState` conservando el hash y los parámetros ajenos (`perfil=rup_…`), y se
  lee al arrancar ANTES de la primera búsqueda; las fichas removibles y «Quitar todos» salen de
  `Filtros.fichas`, y el tipo por defecto NO es una ficha (no lo eligió el usuario). Verificado en
  Chromium con API simulada además de la suite.
- **Ningún nombre técnico en pantalla**: las etiquetas son «Qué tipo de trabajo es · Cómo lo adjudican ·
  Dónde queda · Cuánto vale · Cuándo hay que entregar la oferta · Buscar entidad», y hay prueba que
  prohíbe modalidad/cuantía/UNSPSC/DANE/NIT en ellas. «Mínima cuantía» y «Licitación pública» son los
  NOMBRES PROPIOS de las modalidades (opciones), no jerga de campo. El «buscador de texto libre
  existente» que el plan daba por hecho no existía: se añadió `q` (Buscar por palabra).

### Fase 9 · La portada, la manifestación de interés y los días hábiles (ago 2026 · plan v4)

`lib/habiles.js` · `lib/portada.js` · `lib/handlers/procesos/{portada,manifestacion}.js` (`op=portada`,
`op=manifestacion`, públicos) · gancho al cierre de la sync · `public/portada.js` + sección `#portada` en
la landing. Norma y censo en `docs/datos.md` §7. Decisiones que no hay que re-aprender:

- **La portada se PRECALCULA al terminar la sync (después del índice de baja, con `await` y su propio
  try) y la petición del usuario SOLO LEE.** Sin clave: `disponible:false` y el motivo — la sección del
  frontend nace OCULTA y solo se enseña con datos («portada vacía y honesta antes que bonita y falsa»).
  `?reconstruir=1` con token para el dueño (tras desplegar, la primera portada la escribe la primera
  sync con datos; `alDia` no la toca).
- **EL DATASET NO DICE CUÁNDO VENCE LA MANIFESTACIÓN, y se midió antes de escribir la copia**: `fase =
  «Manifestación de interés (Menor Cuantía)»` es el rótulo del TIPO de proceso (1 929/2 000 en
  «Evaluación»), `proveedores_que_manifestaron` = 0 en toda la muestra y `fecha_de_recepcion_de` es el
  cierre de OFERTAS (6–14 días tras la publicación). Por eso la fecha límite es SIEMPRE calculada
  (apertura + 3 días hábiles) y viaja como `origenFecha:"calculada"` con «confirme en el cronograma»:
  ninguna cuenta regresiva sobre una fecha deducida sin decirlo. La apertura = `fecha_de_publicacion_del`
  es un supuesto DECLARADO. La variante «Sin Manifestacion Interes» existe y se excluye.
- **El plazo (3 hábiles) y el sorteo (> 10) se contrastaron contra la transcripción literal del art.
  2.2.1.2.1.2.20 en el concepto CCE C-537/2025** (los portales oficiales no respondían); la cita viaja en
  la API (`norma`) y en pantalla. No se publicó un plazo de memoria.
- **`lib/habiles.js` es aritmética pura sobre YYYY-MM-DD** (un plazo en días hábiles no tiene hora):
  Pascua por Meeus/Jones/Butcher, 6 festivos fijos, 7 trasladables al lunes (Ley 51/1983), 5 de Pascua
  (Jueves/Viernes Santo fijos; Ascensión, Corpus, Sagrado Corazón al lunes). La prueba fija el calendario
  2026 ENTERO (18 festivos), el 6 de enero trasladado al 12 y la Semana Santa; el «hoy» se inyecta
  (`hoyColombia(ms)`, UTC−5). Los días que quedan cuentan HOY si es hábil y no venció, y se RECALCULAN al
  servir (`op=manifestacion`), no al construir: «le quedan 2 días» tiene que ser verdad al leerlo.
- **`agregar` recibe `ahora` y lo pasa a `estado_abierto(l, ahora)`**: la primera versión llamaba
  `estado_abierto(l)` (reloj real) más `cierre_vencido(l, ahora)`, y la prueba con fecha fija se cayó
  porque el reloj real ya había pasado las fechas sintéticas. Toda función que aplique una fecha tiene
  que aceptar el «ahora» inyectado hasta el fondo.
- **«Suele bajar» SOLO a nivel ENTIDAD con n ≥ 5** (`granularidad_utilizada === "entidad"`): la caída a
  departamento_familia se descarta a propósito — el rótulo de la columna es de la entidad. Sin base
  `baja:null` y el frontend dice «Sin referencia», jamás 0 %. `proximos` (PAA) es `null` si el PAA no
  respondió al construir, no 0.
- **Cada visual de la portada ENLAZA a la lista filtrada de la Fase 8** (`/?cierre=7d`, `/?entidad=NIT`,
  `/?dep=73`) y `sin_dato` no compite por una barra. Un visitante sin perfil aterriza otra vez en la
  landing con el filtro en la URL: `onboarding.js` lo conserva al abrir el tablero tras el diagnóstico
  («Ver las N» viaja con `?cierre=7d`), así la lista se abre ya filtrada.
- **La subida del RUP no desaparece**: la portada va ENCIMA en la misma landing y su botón principal
  («Ver a cuáles puedo presentarme») lleva a la puerta de entrada de la Fase 2. `pesosCortos` habla
  colombiano: `$4,7 billones` (10¹²), `$312.000 millones`.
- **Lo que este entorno NO pudo verificar**: `proximos` en producción depende de que el PAA responda al
  construir la portada dentro de 6 s; el número real de manifestaciones abiertas depende del supuesto
  publicación = apertura. Ambas cosas están dichas en la respuesta y en pantalla.

### Fase 10 · Consorcio a la medida (ago 2026 · plan v4)

`lib/consorcio.js` · `lib/handlers/perfil/consorcio.js` (`op=consorcio` GET/POST/DELETE ·
`op=consorcio-simular` POST, ambos con token) · `perfil=cons_…` en el listado · bloque «Crear
consorcio» en Mi empresa · `truncar2` y `coberturaIntereses`/`contratosRup` en `lib/perfiles.js`.
Decisiones que no hay que re-aprender:

- **La premisa del plan («hoy el consorcio hereda de Génesis sin ponderar») era FALSA**: `derivarJuntos`
  pondera 50/50 desde siempre. Lo que faltaba era la participación EDITABLE, el truncado, la cobertura
  de intereses y los contratos acreditados como datos del perfil, y «cuántas puertas más se abren».
- **TRUNCAR, no redondear, y UNA sola definición**: `truncar2` vive en `lib/perfiles.js` (la usan
  `derivarJuntos` y `lib/consorcio`); las cámaras truncan (0,0498 → 0,04) y el evaluador lee el
  certificado. Consecuencia visible: el consorcio fijo pasó de endeudamiento 0,085 a **0,08**. Con
  colchón de coma flotante (0,29 × 100 = 28,999… sigue siendo 0,29). Un `Math.round` aquí puede
  enseñar como cumplido lo que el evaluador ve incumplido.
- **La K del plural sigue siendo la SUMA de las CRP** (Guía CCE de capacidad residual; regla de
  `lib/capacidad` que costó caro), NO «se recalcula con los indicadores ponderados» como decía el plan
  v4 §10.2. Se declara en `advertencias` (ADVERTENCIA_K) para que nadie «complete» el plan por
  obediencia. La caja (P3) también suma patrimonios: el objeto conserva `integrantes`, que es lo que
  leen capacidad.js y puertas.js. `indicadores.patrimonio` (ponderado, lo que lee el evaluador) y
  `patrimonio_sumado` (lo que financia) son DOS cifras con dos nombres.
- **La suma de participaciones es EXACTAMENTE 100 o no hay consorcio**, y la frase dice cuánto falta o
  sobra. Un integrante repetido, inexistente, caducado o que ya sea consorcio (`juntos`, `cons_…`) es
  400. Un dato ausente en un integrante deja el agregado en `null` (contratos, cobertura), jamás 0.
- **UNIÓN, no suma**: |Helder ∪ Génesis| = 393 (los RUP del repositorio; el plan decía 394) y hay prueba
  de que ≠ 194 + 343. `clasesSumadas` viaja al lado para que la diferencia se vea.
- **«Cuántas licitaciones más se abren» usa `contarOportunidades` de la puerta de entrada** con un perfil
  TEMPORAL inyectado en `PERFILES` bajo un id único por llamada (`sim_…`, retirado en `finally`): dos
  cuentas divergirían, y el listado del consorcio guardado sirve EXACTAMENTE lo que el simulador contó
  (prueba). Caché 1 h en `consorcio:sim:{hash}` (hash de integrantes + proceso + hora).
- **`cumple` es `null` siempre**: `p6dx-8zbt` no publica los requisitos del pliego. Lo que la app sí
  verifica (RUP, K, caja) viaja como `puertas_app` con la nota «NO son los requisitos del pliego», y la
  advertencia literal del plan («verifique si exigen un porcentaje mínimo al integrante que aporta la
  experiencia») viaja SIEMPRE: ese umbral no está contrastado con los Documentos Tipo.
- **Art. 410A como arquitectura**: el simulador no recibe, calcula ni compara precios de oferta; hay prueba
  de que ninguna clave de la respuesta se llama precio/oferta/descuento. Compara CAPACIDAD.
- **Los consorcios se guardan en `config:consorcios` (un JSON) y se DERIVAN en cada petición** de los
  integrantes vivos (`cargarConsorcio` inyecta en PERFILES): un RUP nuevo de Génesis cambia el consorcio
  al instante; un integrante `rup_…` caducado hace desaparecer el consorcio (404 `perfil_caducado`).
- **Frontend**: el bloque nace oculto y solo aparece con ≥ 2 perfiles individuales en el selector (menos
  `juntos` y `cons_`); con dos integrantes mover un deslizador completa al otro; la simulación se pide
  con 500 ms de espera; «Ver las N» guarda, añade el `cons_…` al selector, cambia a Licitaciones y busca;
  `?perfil=cons_…` por URL sigue la regla del RUP subido (sin gate, selector podado). Los indicadores se
  pintan con DOS decimales fijos porque el servidor ya truncó — un `toLocaleString` que redondee de más
  desharía el truncado.
- **`coberturaIntereses` (662,70 / 168,81) y `contratosRup` (33 / 108)** entraron a `lib/perfiles.js` desde
  el RUP corte 31/12/2025 (plan v4 Anexo B, cifras que cuadran: 198,81 M ÷ 300 k = 662,70). El plural fijo
  los deriva (cobertura ponderada truncada, contratos sumados = 141).

### Fases 4 y 5 del plan v3 · Guardián del Formulario 1 y vigía de adendas (ago 2026)

`lib/formulario1.js` + `lib/handlers/pliego/formulario1.js` (`op=formulario1`) · `lib/diff.js` +
`lib/handlers/pliego/diff.js` (`op=diff`) · `lib/cronograma.js` + `lib/handlers/pliego/cronograma.js`
(`op=cronograma`, `.ics`) · `lib/adendas.js` + `_cambios` en `leerChunksDedup` + `adendas` por fila del
listado · «Revisar antes de subir» en Precios · `#pl-vigia` en el lector · bloque en la tarjeta.
Decisiones que no hay que re-aprender:

- **El plan v3 se recuperó de una transcripción anterior** (el v4 solo nombraba las fases): siete
  validaciones con fundamento, comparación de ítems (adición/supresión/modificación), semáforo con
  frases, «causal O» = «motivo de rechazo automático»; vigía con hash+diff por párrafo, reevaluación de
  habilitantes, «le afecta / no le afecta», cronograma con avisos T-7/T-3/T-1 exportable.
- **Lo que no se cargó queda `sin_referencia`, jamás «cumple»**: SECOP II (lo que el usuario escribió en
  la plataforma no lo ve nadie más que él), el tope de AIU (numeral 4.1 del pliego) y el Formulario 1
  (hay que leer el pliego con el lector). El semáforo no cambia de color por un pendiente; se lista.
- **La comparación de ítems canoniza la unidad con `lib/apu_pliego.unidadCanonica`** («M3», «m3», «m³»
  son la misma) y compara descripción normalizada y cantidad a 1e-6: mayúsculas y tildes no son una
  modificación. Casa por numeral y, si el numeral no está, por descripción.
- **Aritmético vs redondeo se separan con `toleranciaFila` de apu_pliego** (la del redondeo al peso):
  dentro, redondeo; fuera, error aritmético. Ninguno rechaza (Ley 1882/2018).
- **`TEMERARIO_PCT` de piso_techo es la BAJA (20 = por debajo del 80 %)**: la primera versión lo leyó
  como fracción del presupuesto y avisaba «no cae bajo el 20 %» a una oferta al 98 % — se cazó en la
  primera prueba. Es la misma unidad en los dos módulos a propósito.
- **El texto del pliego lo extrae el navegador (pdf.js)**: el vigía del TEXTO solo se dispara cuando
  alguien abre el pliego con un proceso en el editor (`id-proceso`); sin id, lo dice. El vigía del
  DATASET (`lib/adendas`) corre solo: `leerChunksDedup` con `senales` conserva la foto más vieja y la más
  nueva (5 campos) y deriva `_cambios`; el listado publica `adendas` reevaluando P1/P2/P3 con la fila
  «como era antes» (`filaAntes`) frente a la vigente — la MISMA `evaluarRup`/`evaluarPuertas`, y por eso
  la misma adenda afecta a Génesis y no a Helder (prueba).
- **Extraer un habilitante de un pliego es heurístico** (regex por línea; dinero por `numeroColombiano`,
  ratios «mayor o igual», endeudamiento en % → fracción, SMMLV, «(10) meses»): cada valor viaja con la
  línea de la que salió (`evidencia`) y lo que no casa queda fuera — no se inventa un requisito. La
  reevaluación distingue «ya no cumple» (cumplía antes) de «no cumple» (nunca cumplió) y «no le afecta».
  `capitalTrabajo` entró a los perfiles desde el balance del RUP (activo − pasivo corriente).
- **El hash se calcula sobre el texto NORMALIZADO** (espacios, saltos): dos aperturas del mismo PDF no
  son una adenda. Máximo 5 versiones por proceso; el texto guardado se recorta a 400 KB y se dice.
- **Cronograma**: hitos por regex con ORDEN («observaciones al proyecto» antes que «proyecto de pliego»,
  «traslado del informe» antes que «informe de evaluación»); una línea de hito sin fecha legible se
  cuenta, no se inventa; el pliego manda sobre el dataset para el mismo hito; avisos solo futuros; el
  .ics lleva VALARM −P7D/−P3D/−P1D y eventos de todo el día (un plazo no tiene hora en el dataset).
- **`limpiarRedis` de la suite purga `pliego:*` y `formulario1:*`** (misma lección que consorcio:*).

### La página viaja con el texto del pliego · y las tres preferencias del sistema (ago 2026)

Salió de contrastar un informe externo con el repositorio: de sus propuestas, estas dos eran las
únicas baratas y NO hechas. `lib/paginas.js` (hoja) + `pagina` en filas, capítulos, habilitantes del
vigía, hitos del cronograma e ítems del Formulario 1; y `prefers-reduced-transparency` /
`prefers-reduced-motion` / `prefers-contrast: more` en `index.html`.
- **El marcador es `\f<n>` en línea propia (form feed + número), NUNCA «PÁGINA n»**: los pliegos traen
  pies «PÁGINA 3 DE 20» que `RUIDO_RE` ya descarta y cuyo número impreso NO es el índice del PDF. Lo
  emite `textoDelPdf` en `public/pliego.js` para CADA página (también sin texto, para que la
  numeración no corra) y `lib/apu_ocr.ocrPaginas` con el índice DENTRO del lote, que el navegador
  re-basa (`rebasarMarcadores`) al número real. Las dos definiciones (navegador/servidor) están atadas
  por una prueba que las EJECUTA (el patrón de `numeroLocal`).
- **`\s` incluye al propio `\f`**: el marcador hay que leerlo ANTES de recortar espacios, y
  `String.prototype.trim` se lo lleva por delante — por eso `normalizarConPaginas` recorta a mano y el
  bucle de `parsearPliego` mira `lineaCruda`. Costó ver el marcador contado como «línea vacía».
- **El hash del vigía de adendas NO ve los marcadores** (`normalizarTexto` = `quitarMarcadores` +
  la normalización de siempre): la misma descarga abierta antes y después de desplegar da el MISMO
  hash, así que ninguna versión ya guardada en producción sale como «adenda». Lo que se GUARDA
  (`texto_normalizado`) sí los conserva, para citar «pág. N» al reevaluar; las versiones viejas
  responden `pagina: null` — la ausencia no se rellena (R1), jamás 0 ni 1.
- **Sin marcadores todo sigue igual**: hay prueba de que el parseo con y sin marcadores da las mismas
  cifras y de que el reparto del diagnóstico sigue sumando `lineas_leidas` (cubeta
  `marcadores_pagina`). El contrato de `texto_ocr` cambió: cada página reconocida va precedida de
  su marcador, y la prueba lo fija.
- **Las preferencias van por CLASE/ID como el resto de la piel, no globales**, y ninguna toca
  `.hidden` (la vista visible no puede depender de una preferencia). Reducir transparencia y aumentar
  contraste tienen variante OSCURA propia: sin ella, «reducir transparencia» en modo oscuro daría
  tarjeta blanca sobre fondo negro. Verificado en Chromium real emulando cada media feature por CDP y
  leyendo `getComputedStyle` (blur `none`, fondo sólido, `animation: none`, bordes marcados).

### Segunda pasada: acabado Apple, gráficos y titular que motiva (17-ago-2026)

El dueño calificó la primera pasada de «falta de respeto»: demasiado texto después de entrar, los filtros
«un desastre» con una segunda barra «peor aún», y la exigencia de una web que «se vea cara, de estatus,
con horas de producción real detrás». Medido antes de tocar: el tablero medía 10 851 px y 3 085 palabras;
la zona de controles tenía DOS filas de filtros (167 + 227 palabras). Decisiones:
- **UNA barra de herramientas** (`.barra-herramientas`: buscar · ordenar · «Filtros» con badge · Buscar) y
  **una HOJA modal** (`#panel-filtros`, `role="dialog"`: lateral en escritorio, desde abajo en móvil, vidrio;
  se cierra con «Listo», el velo o Esc; «Quitar todos» dentro) con los siete filtros de la Fase 8 y, plegados,
  los avanzados. **Ningún id cambió**: los nodos se MOVIERON (un nodo movido conserva sus listeners y la
  suite mira `filtros-barra`/`filtros-avanzados` por id). Los controles van al estilo del sistema
  (`.control-select`/`.control-campo`: fondo hundido, sin borde, 36 px, foco con halo del acento). Sin
  filtros no se dice nada («Sin filtros: se muestran todas…» se fue).
- **Los datos se GRAFICAN**: el pulso publica `porCierre` y `porCuantia` con las MISMAS cubetas de los
  filtros (`Filtros.VENTANAS_CIERRE` / `RANGOS_CUANTIA`) y `pulso.js` las dibuja como barras SVG en línea
  (`svgBarras`, color por custom properties → respeta oscuro/contraste) donde **cada barra ES un filtro**
  (`data-filtro="cierre=7d"`, `min=…&max=…`) que la MISMA `leerEstado` de la URL aplica en la página. Lo que
  no cae en cubeta se dice («18 sin fecha de cierre publicada»), no se reparte; una gráfica de ceros no
  se dibuja. Otra partición «más bonita» daría barras que no llevan a ninguna lista.
- **El titular de la landing MOTIVA, no explica** (`#frase-portada`, `FRASES_PORTADA` en onboarding.js):
  frases sobre lo público como bien común y el derecho de la empresa pequeña a competir, rotando cada 7 s
  con fundido; la primera va en el HTML (se ve sin JS); la rotación se detiene si la landing no se ve. Sin
  emojis ni jerga (prueba). Peso 250 conservado.
- **Recortes de texto en la tarjeta** conservando lo que la suite y la filosofía exigen: el VE sigue
  diciendo «contando las veces que no se gana» (prueba) pero en media línea; el aviso de cierre a 2 días
  ya no repite «si vas a presentarte».
- **La TARJETA pasó de párrafos a una FRANJA DE TRES CIFRAS** (`bloqueProbabilidad`: «~2 empresas suelen
  competir · en 65 procesos» / «1 de 3 se gana, aproximadamente» / «$1.344M deja por intento, en promedio ·
  contando las veces que no se gana y el costo de ofertar»), con la frase completa de siempre en el `title`
  de cada celda y «—» con motivo cuando no hay dato (jamás 0). La banda de competencia bajó a la fila de
  chips junto al cierre y la zona; el título se recorta a dos líneas (`.titulo-tarjeta`, objeto completo en
  `title`); entidad y departamento en una línea. Lo que la suite exige sigue: `lineaRequisitos`,
  `cuantosCompiten`, `frecuenciaNatural`, «contando las veces que no se gana», sin la palabra
  «probabilidad», «Más detalles» con las puertas plegadas. Medido: la primera tarjeta bajó de ~200 a 135
  palabras y la página de 10 851 a 9 268 px con las mismas 20 tarjetas.
- **Chromium cazó dos desbordes móviles** que ninguna prueba de Node ve: el SVG dentro de un grid item sin
  `min-w-0` ensanchaba la página 26 px, y el selector de perfil del encabezado 4 px. Regla: los ítems de
  grid que contienen SVG llevan `min-w-0 overflow-hidden`; medir `scrollWidth > clientWidth` a 390 px.

### Cuadre de control en la importación de Excel (ago 2026)

Tercer punto del mismo contraste. `detectarFilasApu` (`public/xlsx_lectura.js`) captura el total que el
archivo DECLARA y lo compara con la suma de los ítems leídos; publica `cuadre` (`cuadra` ·
`no_cuadra` · `no_comparable` · `sin_referencia`) y un aviso ámbar con las dos cifras cuando no cuadra.
- **Qué total vale**: «COSTO(S) DIRECTO(S)» manda (es la suma de ítems por definición); un «TOTAL» a
  secas SOLO si no ha aparecido antes una fila de AIU/IVA (después, es el precio con AIU); «SUBTOTAL»
  es de capítulo. Sin total declarado no se dice nada; con ítems sin valor no se compara (comparar
  sería mentir). Tolerancia 0,5 %, la de documento de `lib/apu_pliego`. **NUNCA bloquea.**
- **Defecto latente que salió al probarlo**: una fila de total («COSTO DIRECTO 300.000», «SUBTOTAL
  CAPÍTULO 1 … 100.000») va sin unidad, igual que un título de capítulo, y caía ANTES en la rama del
  título — «COSTO DIRECTO» nacía como capítulo. Se distinguen por lo único que las separa: la fila de
  total trae un NÚMERO fuera de código/descripción; el título, solo texto («TOTALIZADORES Y MEDIDA»
  sin cifra sigue siendo capítulo, y «Administración delegada de obra · mes · 3» sigue siendo ítem).
- **`elegirHoja` prefiere la hoja que CUADRA con su total** antes que la de más filas: el libro que
  exporta la propia app trae «Presupuesto» (N ítems + COSTOS DIRECTOS) y «APU» (los insumos, muchas
  más filas y ninguna es un ítem); con «más filas gana» la app se reimportaba a sí misma por la hoja
  equivocada. Hay prueba de ida y vuelta real: exportar → leer → cuadra AL PESO contra su propio
  «COSTOS DIRECTOS» y los subtotales por capítulo no nacen como capítulos.

### La puerta primero, las cifras después y personalizadas (ago 2026)

Encargo del dueño (17-ago-2026): «la interfaz que está por fuera debe salir DESPUÉS de que la persona
elija cómo quiere ingresar, para que los datos estén personalizados al RUP; y tienen demasiado texto —
somos una página con millones de datos, este es el momento para sacarlos a flote». Medido antes de tocar:
la landing de producción medía 4 205 px y 871 palabras, con la portada del mercado ENTERO encima de la
subida del RUP. Ahora mide un viewport (900 px) y 81 palabras. Decisiones:
- **La landing es una PUERTA DE ENTRADA**: titular, tres puertas (`Subir mi RUP` · `Escribir tres datos` ·
  `Entrar con clave`, mismos ids de siempre — `btn-subir-rup`/`btn-manual`/`btn-ir-gate`—) y UNA línea de
  privacidad (con la promesa literal «No guardamos su documento», que la suite guarda). Lo único «de fuera»
  es `#pulso-global`: **tres cifras del mercado sin prosa** (`Portada.teaser`), como gancho de que hay datos
  detrás. Nace oculto y solo aparece si el agregado existe.
- **`/api/perfil?op=pulso&perfil=…`** (`lib/handlers/perfil/pulso.js`, público como la entrada) es el
  pulso PERSONALIZADO: cuántas puede presentarse, cuánto dinero, cuántas cierran esta semana, dónde
  (departamentos) y quién (entidades). **NO reimplementa el conteo**: llama a `contarOportunidades` de la
  puerta de entrada (misma cascada, mismas puertas) y hay prueba de que `total` == el `total` del listado
  sin filtros, para el dueño y para un perfil manual recién creado. `agregarPulso` vive en `entrada.js` y
  sus agregados viajan TAMBIÉN en la respuesta de la entrada (la pantalla de resultado los pinta en cifras).
  Caché `pulso:{perfil}` 10 min, borrada con la carga/borrado de RUP junto a `resumen:*`. Sin cifras del
  perfil (patrimonio, K…): solo conteos y sumas de procesos públicos.
- **El tablero abre con `#pulso` ARRIBA** (`public/pulso.js`, UMD probable en Node) y **el mercado entero
  PLEGADO** debajo (`<details id="mercado-completo">`, con la `#portada` de la Fase 9 dentro, que se pide
  la primera vez que alguien lo abre — `Portada.arrancar` en el `toggle`). Las cifras del pulso **filtran
  la lista EN LA MISMA PÁGINA** (`data-filtro` → `cambiarFiltros`), no recargan. `refrescarPulso` corre en
  `abrirApp` y al cambiar `f-perfil`. Sin datos, `#pulso` sigue oculto; `null` jamás se pinta como 0.
- **PRODUCCIÓN DESTAPÓ UNA BRECHA QUE LA SUITE NO PODÍA VER: pulso 827 vs lista 771.** El listado
  aplica desde la Fase 8 el filtro por defecto (`suministro` apagado) y `contarOportunidades` —la puerta
  de entrada, el simulador de consorcio y ahora el pulso— no lo sabía: «Hoy hay N» / «Ver las N» decían
  una N que la lista no enseñaba (defecto latente desde la Fase 8, que llegó después de la Fase 2). Ahora
  `filtrarPorDefecto` aplica el MISMO `FiltrosLista.cumple` con el estado vacío y los mismos veredictos, y
  publica `ocultosPorFiltroDefecto`. El corpus de la suite no trae suministros viables, así que la
  igualdad total == listado pasaba por casualidad; la prueba nueva usa filas sintéticas (suministro puro
  fuera; «suministro e instalación» dentro). Lección: **una igualdad probada sobre un corpus que no
  ejercita la diferencia no prueba nada** — la verificación en producción con el `total` real es
  obligatoria tras cada merge.
- **`Portada.htmlHero(p, {conBoton})`**: dentro del tablero el botón «Ver a cuáles puedo presentarme»
  sobra (ya entró); el contrato por defecto se conserva.
- **La pantalla de resultado de la entrada va en CIFRAS** (`#res-cifras`: cuántas · cuánto · cierran esta
  semana), no en tres frases; los ids viejos siguen (la suite los cablea).
- **Verificado en Chromium** (escritorio y móvil, con `/api/*` reenviado a producción y `op=pulso`
  simulado con la forma real): landing en un viewport sin desbordar en 390 px, clave → tablero con el
  pulso, clic en un departamento → `?dep=11` y ficha «Dónde queda: Bogotá D.C.» sin recargar, mercado
  plegado que se abre y pinta la portada sin el botón de entrada. Cero errores de consola.

### Fase 6 · Traducción de lenguaje (ago 2026 · plan v3, transversal — cierre)

- **Se midió sobre la página RENDERIZADA en producción** (Chromium: landing, Licitaciones con tarjetas y
  «Más detalles» abiertos, Precios, Mi empresa) antes de tocar nada: la jerga que quedaba estaba en la
  tarjeta («● RUP ✓ ● K ✓», «K sobre CO estimado», «pasan las cuatro puertas», «Baja típica»), en Mi
  empresa («N códigos UNSPSC · tope 4.000 SMMLV», «perfiles RUP», «Baja de mercado», «Reconstruir índice
  de…», «Pertinencia») y en Precios («Calcular APU», «Exportar Excel», «Códigos UNSPSC», «Modo AIU»). Un
  extractor de literales sobre app.js NO sirve para medir esto (las plantillas anidadas lo confunden).
- **Regla que se fijó y se vigila con prueba (j-undecies)**: los términos INTERNOS del glosario (UNSPSC,
  CRP/CRPC, capacidad residual, tertil, baja de mercado, índice de …, habilitante, subsanable, causal O,
  SMMLV, estado del procedimiento, pertinencia, tier, «puertas», «K ✓», «RUP ✓», «Baja típica») no
  aparecen en el texto visible de index.html ni en los módulos del navegador. **RUP, AIU y APU se
  conservan SOLO como nombre propio del documento/concepto que el pliego mismo usa** («Suba su RUP», «el
  AIU del pliego», «Cómo calculamos… AIU»); como etiqueta de un dato o botón se traducen (glosario:
  «registro de proponente», «administración, imprevistos y ganancia», «Calcular cuánto me cuesta»).
- **Los rótulos salen del glosario**: en HTML por `data-glosario="clave"` (+ `data-glosario-corto`) que
  `Glosario.estampar` rellena; en JS por `Glosario.corto()` (forma corta para chips: «Registro de
  proponente», «Capacidad de facturar», «Suelen bajar») y `Glosario.VERBOS` (el botón principal de Precios
  dice `VERBOS.generar_apu`). Se añadió `corto` a los términos que lo necesitan.
- **Traducciones concretas**: chips de la tarjeta «Registro de proponente ✓ · Capacidad de facturar ✓ · Caja
  ✓ · Competencia ✓»; «Encaja con su registro ✓ / por familia ~ / por afinidad ≈ / No encaja ✗»;
  «Suelen bajar 5 %»; resumen «775 cumplen sus requisitos · 562 encajan con su registro de proponente,
  213 por verificar en el pliego»; Mi empresa «Tu registro de proponente», «193 tipos de trabajo
  inscritos · tope 4.000 salarios mínimos», «Recalcular cuánto suelen bajar el precio», columna «Tipo de
  obra» / «Mi precio»; Precios «Calcular cuánto me cuesta», «Descargar mi presupuesto (Excel)», «Códigos
  de lo que sabe hacer», «Cómo se suman administración, imprevistos y ganancia».
- **`SMMLV` entre comillas es un VALOR de la API** (unidad que manda el onboarding), no texto; y
  `.habilitantes` es una propiedad: el detector los excluye a propósito. «salarios mínimos» es la forma
  visible (el glosario dice «convertir a pesos»; donde el payload no trae pesos se dice la unidad en
  palabras, nunca la sigla).

### Auditoría integral (19-ago-2026): 30 defectos reproducidos y corregidos

Barrido completo del sistema por subsistemas, cada hallazgo **reproducido ejecutando código** antes
de tocar nada y **fijado con una prueba** después (bloque «unidad AUDITORÍA INTEGRAL» de
`tests/e2e.js`, 26 cerraduras). Lo que sigue son las lecciones, no la lista: la lista está en el
commit y en las pruebas.

- **LA MISMA CUENTA, DOS ENTRADAS DISTINTAS: el defecto más caro de la auditoría.** La acción
  `rentabilidad` recalculaba el presupuesto **sin `preciosUsuario`, sin `parametros` y con filas
  recortadas** (`{item_id, cantidad}`), así que el panel Piso/Techo y el optimizador decidían sobre
  un costo directo que NO era el de la pantalla. Medido con un presupuesto mixto (3 ítems del
  catálogo + 3 filas importadas con precio del archivo): **$201.092.650 en «Calcular APU» contra
  $32.712.650 en el panel**, y el veredicto pasaba de «No se presente» a «Preséntese entre $43M y
  $260M». Hoy `presupuestoDe()` es el ÚNICO constructor y `itemsParaElMotor()` la única proyección
  de fila. Es `total_procesos`/`procesos_contados` otra vez, en pesos y en la única pantalla donde
  se fija un precio de oferta. De paso: la marca de **subcontratado** del Excel importado tampoco
  llegaba al motor.
- **UNA FUGA SIN TOKEN QUE NINGÚN CAMPO REDACTADO TAPABA.** `?ordenar_por=margen` cargaba los
  borradores de APU del dueño SIN credencial y servía `margen_estimado {piso, techo}`: del techo se
  despeja EXACTA la mediana de baja que `lib/publico` acaba de anular (`techo = cuantía × (1 −
  mediana)`, y la cuantía es pública), y el piso sale de su costo directo. Ahora sin token los
  borradores no se leen siquiera —el CONJUNTO ya revela en qué procesos trabaja—, el orden es
  INERTE con `margen_ignorado` (el patrón de `?baja_max=`) y `sinFinanzas` anula el campo como
  cinturón. Lección: **redactar campos no basta si otro campo permite despejarlos**.
- **`Number(null) === 0` apareció TRES veces más**, y las tres convertían un «no sé» en una
  afirmación: el techo de mercado sin base entraba como **$0** y la tarjeta decía «el techo está por
  debajo de su piso: aquí no da»; un campo de nómina en blanco se guardaba como **0 %** (con las
  cesantías vacías el recargo cae de 44,79 % a 36,46 % y la hora de mano de obra un 5,76 %); y
  `?max=abc` producía `max = 0` y **vaciaba la lista** con la ficha «hasta $0». La regla ya estaba
  escrita en el repositorio: **la ausencia se descarta ANTES de convertir**.
- **UN AÑO IMPOSIBLE TUMBABA LA PANTALLA PRINCIPAL.** `lib/habiles.festivos` LANZA fuera de
  [1984, 2200] y esa fecha llegaba hasta ahí desde `filaManifestacion`, que el clasificador corre
  por CADA fila del listado: una sola fila de menor cuantía con `1970-01-01` (timestamp nulo) o
  `2202` —anomalía que esta misma memoria ya documentaba en otra fuente— devolvía **500 a todos los
  perfiles**. `aperturaDe` valida ahora el AÑO además del formato y responde «sin fecha legible»,
  que es lo que el módulo ya sabía decir.
- **EL BADGE DE CONFIANZA DEL PRECIO ESTABA INVERTIDO EN PRODUCCIÓN.** `normalizarCatalogo` metía
  TODOS los precios del hash en `precios_cotizados`, así que con el catálogo cargado —el estado
  normal— cada precio derivado por factor regional se rotulaba «🟡 Cotización de proveedor» y
  `lineas_derivadas` valía 0 siempre. Verificado sobre no verificado: el falso positivo caro de este
  módulo, y **al revés** del defecto que ya se había corregido («decía SIN VERIFICAR sobre un precio
  verificado»). El hash SÍ guardaba `precio_origen_{region}`; lo que faltaba era conservarlo.
- **DOS PALABRAS DECIDÍAN MAL SOBRE MILES DE PROCESOS.** «conectividad» iba SUELTA en la blacklist
  de INGESTA, y «mejoramiento de vías terciarias para la CONECTIVIDAD RURAL» es fraseo de plantilla
  del corazón del negocio: esos procesos no entraban a Redis y **el embudo del diagnóstico no podía
  verlos** (el falso negativo en su forma más cara: silenciosa e inauditable). Ahora exige contexto
  de telecomunicación, como ya hacía «fibra óptica». Y «obras?» suelto en los verbos fuertes hacía
  que «SUMINISTRO DE MANO DE OBRA NO CALIFICADA PARA ASEO Y ORNATO» saliera **VERDE «Obra civil»**
  —el estado más confiado— porque el término «aseo» solo descarta con CERO verbos de obra.
- **UN CERO NO ES UN PRECIO, tampoco en un banco oficial.** Los ítems INVIAS `650,5`/`650,9`
  (transporte marítimo o fluvial) traen 0 en las 117 provincias sin acceso fluvial —ahí el 0 de la
  fuente significa «no aplica»— y se servían con `precio: 0`, `incompleto: false` y sin una sola
  alerta: una partida real presupuestada en cero. Además `cotizar` ya lo rechazaba, así que las dos
  vías del mismo ítem discrepaban. Dos auditores independientes lo encontraron por caminos
  distintos.
- **EL LECTOR DE CUERPOS: cuatro defectos en 40 líneas que atraviesan todos los POST.** `buf += c`
  decodificaba cada trozo por separado, así que un carácter partido en la frontera salía como dos
  U+FFFD —corrupción SILENCIOSA, y en el lector de pliegos **«M³» pasaba a «m»**, metro lineal donde
  el pliego paga metro cúbico—; el tope `maxBytes` NO se aplicaba en la rama pre-parseada, que es la
  normal en producción (3 MB pasaban por un endpoint con tope de 64 KB); un cliente que aborta
  rompía el contrato «nunca lanza» con un 500 opaco; y `apu_extraer.js` conservaba una COPIA privada
  del lector cuyo comentario afirmaba ser «el mismo» que el consolidado.
- **EL FLUJO DE CAJA PERDÍA DINERO CON PLAZOS DE PAGO LARGOS.** El horizonte iba hasta `T + L`, pero
  el acta del mes k se cobra en `k + dso`: con el DSO de 150 días que usa la propia suite se perdían
  **$95 M de $1 000 M**, y con el P85 del informe (195 días) **$475 M** — inflando `k_max` y dejando
  el payback en «no retorna» sobre contratos sanos. La invariante que faltaba y ahora se prueba:
  **Σ ingresos = valor del contrato, para cualquier DSO**.
- **REIMPORTAR EL PROPIO EXCEL LEÍA LA HOJA EQUIVOCADA.** El desempate de `elegirHoja` solo miraba
  «cuadra»; basta con que UN ítem no traiga valor legible —estado normal y declarado— para que la
  hoja «Presupuesto» salga `no_comparable` y gane «más filas», que es siempre la hoja «APU» (una
  fila por INSUMO). Se importaban insumos como si fueran ítems. La señal que de verdad separa las
  dos hojas es **declarar un total**, que una hoja de insumos no trae nunca.
- **`esc()` NO VALIDA EL ESQUEMA DE UNA URL.** `urlproceso` lo escribe quien publica en SECOP II, y
  un `javascript:…` ahí era un XSS de un clic en el origen de la app —donde viven la sesión y el
  perfil guardado— pintado en la portada pública. `urlSegura()` (solo http/https) en los cuatro
  puntos donde se enlaza a terceros; sin esquema válido no se pinta el enlace.
- **DOS IDENTIDADES DE «ENTIDAD» EN LA MISMA SEÑAL.** `claveColision` agrupaba por NIT mientras la
  medición del factor (`medirColision`) estratifica por `claveCanonica`: dos regionales que comparten
  NIT —el dataset lo hace y la CCE lo advierte— cerrando el mismo día recibían el multiplicador de
  colisión sin colisión real. Es la lección de identidad ya pagada, sin aplicar en un sitio.
- **EL ÍNDICE REPUBLICABA LO QUE SU PROPIA CERRADURA ANULA.** `por_anio` viajaba con `{n, suma}`
  crudas también bajo el mínimo: 55/3 = **18,3 oferentes «sin base»**, exactamente la cifra que
  `registroPublicado` acaba de poner en null. Es «18.2 oferentes» otra vez, por la puerta de al lado.
- **EL MURO DE LA CONTRASEÑA SE DIAGNOSTICABA COMO «SIN CONEXIÓN» EN 13 SITIOS.** La regla («el
  parseo del JSON va APARTE del fetch») estaba escrita y se cumplía en 5 de 18 sitios; en los otros,
  `r.json()` lanzaba sobre el HTML del muro, el catch se llevaba el control y la comprobación del 401
  **no se alcanzaba nunca**. `leerJson()` no lanza y devuelve el motivo real. Corolario de método:
  **una regla escrita en la memoria no es una cerradura; la cerradura es la prueba**.
- **TRES DEFECTOS DE INGESTA, todos sobre el corpus que se sirve.** (1) Al degradar a `$offset` el
  `$select` se quedaba en `"*"`, **sin `:updated_at`**: el dedup de lectura no deja que una fila sin
  sello reemplace a una guardada, así que un proceso que pasó a Adjudicado durante una ventana
  degradada se seguía sirviendo como ABIERTO hasta la full de higiene —y producción atravesó 14 h en
  ese modo en ago 2026—. Ahora el offset pide `*,:updated_at` y, si ESE select da 400, cae al mínimo
  UNA vez y lo declara (`offsetSinSello`), que es el patrón del app_token rechazado. (2) El **delta y
  el backfill del histórico escribían en el MISMO índice de chunk**: uno lee `man.sig` y el otro fija
  su base al abrir el mes sin actualizar el manifest hasta el flip, con candados distintos y
  concurrencia rutinaria por diseño. El delta pisaba lo que el backfill acababa de escribir y esos
  registros desaparecían del keyspace «que ninguna purga toca» hasta el siguiente refresco. Como el
  backfill está RE-BAJANDO ese mes de la fuente, sus datos mandan: el delta lo difiere y lo cuenta.
  (3) El cierre de mes podaba **por el rango que recuerda el manifest**, así que los chunks de una
  corrida MUERTA quedaban fuera de ese rango y sobrevivían — y la app lee el corpus por **SCAN**, o
  sea que los servía como procesos que ya no existen en la fuente. Ahora se poda por SCAN del mes.
- **Lo que la auditoría encontró SANO y conviene no volver a auditar a ciegas**: XSS en `app.js`
  (1 440 interpolaciones revisadas, `esc()` correcto en texto y en atributo), el cruce de los 350
  ids del frontend contra el HTML, el grafo de requires (130 nodos, 0 rotos, 0 huérfanos, 4 ciclos
  todos resueltos con require diferido), los 18 rewrites de `vercel.json` (todos resuelven), la
  inyección SoQL (`escSoQL` aplicada en los tres constructores), el peso de las respuestas (catálogo
  2,23 MB de 4,5), el determinismo del `.xlsx`, y los invariantes de los cinco bancos de precios.
- **MÉTODO, para la próxima.** Trece revisores en paralelo, uno por subsistema, con la instrucción
  de **verificar cada premisa contra el código antes de reportar** (este repositorio documenta tanto
  que el ruido es el riesgo real) y de **ejecutar una reproducción** por hallazgo. Los que llegaron
  con `node -e` reproducible acertaron; los que llegaron con lectura, no siempre. Dos defectos los
  encontraron dos agentes por caminos distintos, lo que subió su prioridad con razón.

#### La revisión adversaria DEL PROPIO ARREGLO, y lo que encontró

Una segunda pasada, con la única instrucción de **atacar el diff de la auditoría**, encontró ocho
defectos más. La lección de método es la que vale: **una corrección no está hecha hasta que alguien
intenta romperla**, y la mitad de lo que encontró son cerraduras que no cerraban.

- **`\\s` DENTRO DE UN LITERAL DE REGEX NO ES UN ESPACIO.** La guarda «mano de obra» se aplicó en
  dos sitios con el MISMO texto: en `lib/semantica.js` se concatena a un string que va a
  `new RegExp` (`\\s` → `\s`: funciona) y en `lib/filtros.js` se pegó dentro de un literal `/…/`,
  donde `\\s` significa «una barra invertida y una o más eses» — el lookbehind no puede casar jamás.
  La corrección quedó **INERTE** y `esSuministroPuro` seguía dejando pasar «suministro de mano de
  obra no calificada». La prueba no lo vio porque ejercitaba `admisibleParaIngesta` y
  `evaluarPertinencia` y **nunca llamaba a la tercera función que usa la regla**. Regla:
  copiar un fragmento de regex entre un string y un literal exige reescapar, y una guarda que se
  aplica en N sitios se prueba en los N.
- **UNA GUARDA DEMASIADO ANCHA CUESTA MÁS QUE EL DEFECTO QUE CIERRA.** «Si la fila trae menos celdas
  que las que declaró la cabecera, las cifras posicionales son ilegibles» cerraba el hueco en medio…
  y anulaba las cantidades del caso que este módulo documenta como **frecuente y benigno** (la
  entidad deja los precios en blanco para que los ponga el oferente), que produce el mismo síntoma.
  Contar celdas no distingue «huecos al final» de «hueco en medio»; la FORMA sí: **un precio
  unitario con su total en blanco es la huella de la celda que se comió el separador**. El
  entregable del lector volvió, y el defecto sigue cazado.
- **UN FILTRO INERTE ES ACEPTABLE; UNO CON OTRO VALOR, NO.** `numero()` de `public/filtros.js`
  aceptaba el decimal con punto y luego borraba todos los puntos como separadores de miles:
  `?max=1000000.00` filtraba hasta **$100 millones**, con la ficha mostrando la cifra equivocada.
  Se leen las tres formas por separado (agrupación colombiana, decimal con coma, decimal con punto)
  y `1.000` sigue siendo mil.
- **UN TOTAL QUE LAS PROPIAS FILAS DESMIENTEN ES EVIDENCIA EN CONTRA.** El desempate de `elegirHoja`
  premiaba *declarar* un total, así que una hoja lateral de dos filas con un «COSTO DIRECTO» que no
  cuadra le ganaba a la hoja de presupuesto de doscientos ítems.
- **UNA VALIDACIÓN DE ENTRADA TIENE QUE CUBRIR SU PROPIA ARITMÉTICA.** El año de la apertura se
  acotó a [1984, 2200] —el rango de `lib/habiles`— pero después se le suman tres días hábiles, así
  que el 30 de diciembre de 2200 seguía lanzando y tumbando el listado entero. El rango se IMPORTA
  ahora de `lib/habiles`, que es quien lanza (había dos copias), y el techo de la apertura reserva
  el último año.
- **DOS DEFINICIONES DE LA MISMA REGLA, otra vez.** «Conectividad» vivía como constante y como copia
  inline dentro de `BLACKLIST_OBJETO`, y ya habían divergido (a la copia le faltaba `red lan`). El
  literal se convirtió a `String.raw` + la constante, verificando que el `source` resultante es
  idéntico salvo el fragmento unificado. A las dos les faltaba además `digital`: «CONECTIVIDAD
  DIGITAL DE LAS INSTITUCIONES EDUCATIVAS» salía **verde**.
- **UNA CERRADURA QUE PASA CONTRA EL CÓDIGO QUE DICE BLOQUEAR.** La aserción de «los días al cierre
  se cuentan en un solo sitio» miraba el fuente con dos regex: la negativa no cruzaba los paréntesis
  interiores de `Math.floor((t - (ahora - OFFSET)) / 86400000)` y la positiva ya casaba antes. Se
  sustituyó por la igualdad que importa —la cifra que titula el pulso tiene que ser la que abre el
  filtro `?cierre=7d`—, y con `floor` da 5 contra 4. **La prueba por MUTACIÓN es lo único que
  distingue una cerradura de un adorno**: de las 26, 25 fallaban contra el árbol anterior y esa
  pasaba.
- **CAMBIAR UN MENSAJE FALSO POR OTRO NO ES ARREGLARLO.** El 401 tiene DOS causas —la API dice que
  `HISTORICO_TOKEN` no coincide; el EDGE (Password Protection) dice que hay que iniciar sesión— y
  se distinguen por el CUERPO (el edge responde HTML). Cinco de diez sitios miraban `r.status === 401`
  antes de mirar el cuerpo y enseñaban el mensaje del token sobre el muro del edge. Lo decide ahora
  una sola función (`msg401`), con el `sinJson` que marca `leerJson`.
  · **Y CONVERTIR CINCO SITIOS TAMPOCO BASTABA**: los otros seis leían el cuerpo con un `try/catch`
    mudo (`catch { cuerpo = null; }`), que TIRA el marcador `sinJson` y hace que `msg401` caiga otra
    vez al mensaje del token. Hoy **`MSG_401` tiene un solo consumidor** —`msg401`— y hay prueba que
    prohíbe nombrarlo desde cualquier otro sitio; contra el árbol anterior nombra las siete líneas.
  · **Una guarda contra una función que nunca devuelve falsy es una rama muerta.** Al convertir la
    cadena de la experiencia a `leerJson`, su `if (!cuerpo && (401|403))` —el que daba el mensaje del
    edge— dejó de poder dispararse, porque `leerJson` SIEMPRE devuelve un objeto: el muro volvía a
    diagnosticarse como token equivocado. La señal correcta es `cuerpo.sinJson`. Convertir un lector
    obliga a revisar las guardas que dependían de su valor de fallo.
- **Dos comentarios que afirmaban de más, corregidos con la medición**: la poda del importador SÍ
  puede cambiar una decisión (una fila de tres términos con dos marcas —«CANALETA SYLVANIA
  LEGRAND»— pierde su sugerencia; sin error de dinero, porque nunca fue `mapeo_automatico`), y el
  comentario de `urlSegura` prometía «hay prueba que ejecuta las dos copias» cuando la prueba solo
  miraba el fuente — ahora existe, con 16 casos. Cifra corregida de paso: **533** descripciones del
  IDU pasan de 200 caracteres, no 673.
- **Una guarda de tamaño que falla ABIERTA no es una guarda**: `lib/cuerpo.js` dejaba `bytes = 0`
  cuando `JSON.stringify` lanzaba (referencia circular), así que ese cuerpo se aceptaba. Y su 413
  anunciaba «máximo 0 MB» en los dos endpoints con tope de 64 KB — un límite de tamaño **sin el
  tamaño**, porque `0` es falsy y los llamadores ni lo reenviaban.

- **LA CONSOLIDACIÓN SE DEJÓ UNA CUARTA COPIA DEL LECTOR DE CUERPOS.** `lib/cuerpo.js` nació de
  fundir TRES copias que habían divergido en silencio, y `lib/apu_descargar.js` conservaba la suya
  con los tres defectos ENTEROS, los tres reproducidos: `buf += c` partía los caracteres multibyte
  (una URL con `ñ` —las hay en los portales colombianos— llegaba con dos U+FFFD y la descarga iba
  contra una dirección que nadie envió), `buf.slice(0, 8192)` TRUNCABA en silencio (9 KB → JSON roto
  → `{}` → «URL inválida», que es el diagnóstico contrario al real: el cuerpo era demasiado grande,
  no la URL inválida) y un JSON malformado devolvía `{}`, indistinguible de un cuerpo vacío. La
  cerradura no enumera archivos: **busca el síntoma** —acumular trozos de `req.on("data")` fuera de
  `lib/cuerpo.js`— para cazar también la copia que alguien escriba mañana en otro módulo. Probada
  por mutación: contra el árbol anterior señala `lib/apu_descargar.js` por su nombre.

#### El navegador vio lo que ninguna prueba de Node podía ver (otra vez)

La regla del proyecto es que tras tocar el frontend hay que **ABRIR LA PÁGINA**. Se hizo con
Chromium real contra un arnés que sirve `public/` y responde `/api/*` con la forma real de cada
handler (sin red, sin Redis) — `playwright-core` es una dependencia de npm y aquí no entra ninguna,
así que el arnés inyecta un recolector de errores y un marcador de estado en el DOM y se lee con
`--dump-dom`.

- **LA RED DE SEGURIDAD DEL CDN CUBRÍA TRES CONTENEDORES Y HACÍAN FALTA NUEVE.** `.hidden` la sirve
  el CDN de Tailwind, que la red institucional del dueño bloquea. La regla propia salvaba la
  landing, pero medido en el navegador: **los CUATRO paneles de pestaña salían apilados a la vez**
  (Mi empresa + Mis procesos + Licitaciones + Precios, los cuatro `display:block`) y
  `modal-competencia` encima de todo — con **CERO errores en consola**, el fallo mudo de siempre.
  Cambiar de pestaña no hacía nada visible. El comentario original daba por hecho que los modales
  «ya fijan `style.display`»: lo fijan al ABRIRLOS o cerrarlos, **no al cargar**. La regla cubre
  ahora `.panel-pestana`, `[role="dialog"]`, `.modal-velo` y los dos paneles sueltos, y sigue sin
  ser global (`.hidden{}` escondería la barra de pestañas de escritorio, que es `hidden md:flex` —
  verificado en el navegador que sigue visible). La cerradura no enumera ids: **censa el HTML** y
  exige que todo contenedor que nazca oculto SOLO por la clase esté cubierto, así que el próximo
  modal que alguien añada la dispara solo.
- **Coste medido de la memoización de `claveCanonica`**: pasar la colisión de cierres del NIT a la
  clave canónica costaba 15 ms → 269 ms sobre 20 000 filas (se llama dos veces por fila). Con el
  Map: 73 ms en frío y 6 ms en caliente, resultado idéntico. El tope de 20 000 entradas existe
  porque la instancia serverless vive entre peticiones.

### «−$32 M de pérdida»: la tercera cifra de la tarjeta, auditada y corregida (20-ago-2026)

El dueño reportó desde producción una tarjeta de **$3.216.328.994** (PTAR Alpujarra, CORTOLIMA) que decía
**«−$32M · de pérdida si gana el contrato»**, en rojo, y preguntó si el dato era real. Se reprodujo al peso
ejecutando `lib/ganancia`: `−32.163.290`. **No era un error de aritmética: era un error de MODELO**, y de
los tres encontrados cualquiera bastaba para voltear el signo.

- **LA CIFRA ERA UNA CONSTANTE CON ASPECTO DE MEDICIÓN.** Sin APU, la fórmula
  `V(1−τ) − CD(1+(A+I)/100)` con `CD = V/(1+(A+I+U)/100)` se reduce ALGEBRAICAMENTE a
  **`utilidad declarada − contribución`**, o sea `−1 % × cuantía` para TODO proceso de obra: medido,
  50 M → −0,5 M · 500 M → −5 M · 3.216 M → −32 M · 20.000 M → −200 M, margen −1 % en los cuatro. Un
  número que no depende del proceso, pintado en rojo a dos centímetros de la cuantía de la que sale.
  Es «18,2 oferentes sin base» y el chip constante de `nivel_competencia` por tercera vez, ahora
  AFIRMANDO una pérdida.
- **EL SIGNO LO DECIDÍA UN SUPUESTO QUE NADIE HABÍA DECLARADO.** El umbral está en **U = 6,32 %** y el
  defecto era **U = 5 %**, el SUELO de la banda del manual (U 5-10). Medido sobre el proceso real:
  U=4 → −57 M · U=5 → −32 M · U=6,32 → 0 · U=8 → +40 M · U=10 → +87 M. Un punto de una perilla que el
  usuario nunca tocó decide si el ingeniero se presenta o no.
- **LA ADMINISTRACIÓN SE COBRABA DOS VECES, y este repositorio ya lo tenía escrito.** `CLAUDE.md` dice
  del otro motor: «su "A" cubre nominalmente dirección de obra, pólizas, ensayos e impuestos» y «usar la
  "A" declarada como si fuera el indirecto Y sumar aparte garantías e impuestos cobraba la
  administración dos veces y **dejaba en rojo presupuestos sanos**». Es exactamente lo que hacía, con el
  interruptor `contribucion_en_administracion` en `false` por defecto.
- **EL IMPREVISTO SE RESTABA COMO COSTO CIERTO, contra la doctrina explícita del repositorio.**
  `lib/apu/rentabilidad` dice con todas las letras: «La "I" del AIU **no es un costo**: es el INGRESO que
  financia la prima de riesgo. Restar las dos sería contar el imprevisto dos veces». Son **$128,6 M** en
  ese proceso —**cuatro veces** la cifra que titulaba la tarjeta— y con el costo MEDIDO de un APU el signo
  cambia solo con esa línea (I=0 → +96 M · I=5 → −32 M · I=10 → −161 M). Dos motores del mismo
  repositorio respondiendo la misma pregunta con doctrinas opuestas.

**LA CORRECCIÓN NO INVENTA NADA: PUBLICA LOS DOS EXTREMOS Y SOLO AFIRMA LO QUE SE SOSTIENE EN LOS DOS.**
- **`public/ganancia.js` (UMD) es la ÚNICA aritmética**, y `lib/ganancia` la usa (el patrón de
  `costos.js`/`glosario.js`). Hacía falta porque el detalle interactivo RECALCULA en el navegador: una
  segunda fórmula allí enseñaría un número distinto del que ORDENA la lista — el defecto del presupuesto
  calculado dos veces, otra vez. La prueba compara la identidad de función, no el texto.
- **`veredicto` tiene TRES estados, no dos**: `deja` (ya deja plata en el PEOR caso), `pierde` (no deja ni
  en el MEJOR) y `depende` (el rango cruza el cero). El proceso del dueño es **`depende`: de −$32 M a
  +$257 M**. Afirmar el extremo malo de un rango que cruza el cero, en rojo, en la única pantalla que
  decide si se presenta, es la peor forma posible de equivocarse en este módulo.
- **`mejor − peor` es EXACTAMENTE lo que todavía no se sabe** (la reserva de imprevistos + la contribución
  cuya lectura no consta), con prueba. Cuánto se consume de un imprevisto no lo sabe nadie por adelantado:
  inventar un porcentaje de consumo habría sido la tercera cifra falsa.
- **«Dijo que no» ≠ «nunca se lo preguntamos»** (`contribucion_declarada`): son 5 puntos del contrato,
  más que la ganancia entera. Responder que no NO cambia la cifra —cambia lo que se puede AFIRMAR de
  ella—, y hay prueba de esa distinción. Es «sin dato vs cero» aplicado a un booleano.
- **La INSTRUCCIÓN no se pierde al suavizar el veredicto**: en `depende` sigue viajando «necesitaría
  declarar al menos 6,3 %» (la lección del manual, «el olvido más caro del país») y, con APU, la
  advertencia del panel Piso/Techo («lo que usted costeó no cabe en ese precio si gasta la reserva»). Una
  prueba que exigía la palabra «pérdida» se corrigió: obligaba a afirmar lo que no se sostiene.
- **La CIFRA ES EL BOTÓN** que abre su propia cuenta (`.detalle-ganancia`), y no un enlace aparte: en
  móvil no hay puntero, y ahí `.metrica-nota` está OCULTA por CSS — por eso la salvedad vive en el RÓTULO
  y nunca en la nota. El detalle enseña la cascada línea por línea con barras a escala, en castellano
  llano («le pagan», «hacer la obra le cuesta», «le descuentan de cada acta»), los dos escenarios con su
  nombre, la fuente de cada número y lo que la cuenta NO alcanza a descontar. **La cascada cierra AL
  PESO** porque administración e imprevistos se DERIVAN restando totales ya redondeados una sola vez.
- **Lo que el usuario ajusta en el detalle viaja al SERVIDOR** (`?administracion_pct=`, `?imprevistos_pct=`,
  `?utilidad_pct=`, `?contribucion_en_administracion=`), con la doctrina de `?baja_max=`: solo con
  credencial y **inerte** si es ilegible, jamás un 400. Aplicarlo solo en el navegador habría dejado la
  lista ORDENADA por unos números y PINTADA con otros.
- **Procedencia**: el defecto llegó de la rama `claude/ecc-mental-framework-jhupip` (commit `f7ca950`,
  una sesión paralela del mismo día). Se fusionó a esta rama antes de corregir para que exista **una sola
  versión** de la cifra; sin eso habría dos `lib/ganancia.js` divergiendo desde el primer día.

### Lo que se pierde y lo que vuelve: retenciones mal clasificadas (20-ago-2026)

Salió de contrastar una investigación externa sobre utilidad real en obra pública contra el código. De
sus tesis, **una era un defecto real y verificable** y el resto o ya estaba implementado, o no es
implementable con lo que hay, o está mal en el propio informe (ver abajo).

- **LA RETENCIÓN EN LA FUENTE NO ES UNA PÉRDIDA, Y SE ESTABA RESTANDO DEL MARGEN.** `lib/deducciones`
  clasificaba con un solo booleano, `ya_en_el_motor`, que MEZCLA dos razones distintas para no sumar un
  concepto —«el motor ya lo aplica» (contribución) y «vuelve, no es pérdida» (retegarantía)— y dejaba en
  la cubeta de pérdida real la **retefuente** y la **ReteIVA**. La retefuente es un ANTICIPO del impuesto
  de RENTA, que grava la utilidad y no lo facturado: se cruza en la declaración del año, y restarla del
  margen de la obra cobra la renta dos veces. Medido sobre una cláusula realista de un contrato de
  $3.216 M: `total_aplicable_pct` pasaba de **18,97 % a 1,97 %**, o sea **$547 M** que se restaban del
  margen y no se pierden. Ahora `naturaleza` («costo» | «caja») es el eje y `ya_en_el_motor` queda como
  nota ortogonal; `total_caja_pct` viaja aparte para poder enseñarlo sin restarlo.
  · **El ReteICA SÍ es pérdida y por otra razón**: el ICA se debe igual sobre lo facturado en ese
    municipio, así que la retención es el cobro anticipado de un impuesto que no vuelve. Se declara la
    aproximación (tarifa de retención ≈ tarifa de ICA).
- **NO SE SUMAN PORCENTAJES DE BASES DISTINTAS.** La ReteIVA es un % **del impuesto**, y en construcción
  el IVA se causa solo sobre la utilidad (art. 3 D. 1372/1992): sumar su 15 % junto a un 2 % del
  contrato daba un «17 %» que no significa nada. Cada concepto declara `base` («valor» | «impuesto»),
  los totales suman solo `valor`, y los de otra base se CUENTAN (`conceptos_en_otra_base`) para que su
  ausencia del total no parezca un olvido. Es la lección de `total_procesos`/`procesos_contados` aplicada
  a las unidades.
- **La invariante cazó un error propio al escribirla**: `pérdida + caja + (costo ya en el motor) = total
  leído`. El primer intento sumaba TODO lo `ya_en_el_motor` y contaba la retegarantía dos veces (es caja
  Y la modela el motor). Una cubeta que se traga un concepto no se ve en ninguna cifra: por eso la
  invariante existe.

**TRES TESIS DEL INFORME QUE NO SE IMPLEMENTARON, con el motivo exacto:**
- **Estampilla Pro-Universidad Nacional (Ley 1697/2013, 0,5/1/2 % por cuantía).** Sería un dato DURO —la
  app ya conoce la cuantía y el SMMLV— pero aplica solo a entidades del **orden nacional**, y el corpus
  no proyecta ninguna columna de orden/nivel. Se intentó llamar a la fuente (la regla de la casa: un 403
  con fecha no es una propiedad del entorno) y **hoy `www.datos.gov.co` responde 403 desde aquí**. Poner
  un 2 % sobre una columna supuesta es exactamente el error que este trabajo corrige. Para cerrarlo:
  verificar que `p6dx-8zbt` publique el orden de la entidad, proyectarlo, y solo entonces aplicar la
  tarifa por tramo de cuantía.
- **Concesiones no causan la contribución del 5 %.** Cierto, pero `lib/filtros_lista` no clasifica
  concesiones y fabricar esa clasificación para esto sería inventar un tipo de trabajo.
- **Márgenes sectoriales (8,24 % macrosector, obras civiles entre −19,4 % y 9,7 %).** No alimentan
  ningún cálculo y el propio informe declara que la cifra de obras civiles es académica, no oficial. Una
  cifra sin fuente verificable no entra a una herramienta con la que se fija un precio.

**DOS ERRORES DEL INFORME, medidos:**
- **Su aritmética del umbral mezcla las dos bases en el párrafo donde advierte de no mezclarlas.** Dice
  «U = 5 % **del valor**» y lo compara con un 7 % del valor para concluir que el umbral ronda el 6-7 %,
  y afirma que coincide «exactamente» con el 6,32 % que calcula el motor. No coinciden: **6,32 %
  corresponde a τ = 5 %** (solo contribución); con el τ = 7 % que el informe usa, el umbral es **9,03 %
  del costo directo** (comprobado ejecutando `utilidadMinimaParaNoPerder`). Llegó a un número parecido
  por una compensación de errores, no por el razonamiento.
- **La doctrina de las salvedades que cita está superada.** Afirma que firmar un otrosí sin salvedades
  convalida las reclamaciones previas; el Consejo de Estado **unificó en 2023** (Sección Tercera, 27 jul)
  que su ausencia al pactar suspensiones, prórrogas o modificaciones **NO impide** reclamar, y que la
  exigencia opera en la liquidación bilateral. Ya estaba corregido en esta memoria desde ago 2026.

### Los pendientes declarados, cerrados (ago 2026)

La auditoría integral dejó cinco hallazgos **sin corregir y dichos**. Se cerraron después, y lo que
sigue son las decisiones, no la lista.

- **UN TOPE QUE CIERRA LA PUERTA DE ENTRADA NO ES UN FRENO, ES UNA CAÍDA.** Con los 300 perfiles
  dinámicos vivos, `crearPerfilDinamico` respondía 503 y la landing —que ES el producto— dejaba de
  aceptar RUP nuevos hasta 45 días; y como la escritura es PÚBLICA, cualquiera podía dejarla así a
  propósito. Ahora **DESALOJA el más viejo** (el de menor TTL restante: todos nacen con el mismo, así
  que el que menos le queda es el que antes se creó) en vez de rechazar. Es la opción menos
  destructiva y la única cuyo efecto YA estaba contemplado: un perfil que desaparece responde 404
  `perfil_caducado` y la web sabe olvidarlo y volver a la landing. Un visitante nuevo que no puede
  entrar no tiene ninguna salida; uno viejo vuelve a subir su PDF. Si Redis no deja leer los TTL no
  se adivina a quién desalojar: se conserva el 503, que es la respuesta honesta.
  · **La lista de claves de un perfil dinámico vive UNA vez** (`clavesDePerfilDinamico`): estaba
    escrita a mano dentro del DELETE y el desalojo necesita exactamente la misma — dos listas
    divergen a la primera clave que alguien añada, y la que se quedara corta dejaría basura huérfana
    con el perfil ya borrado. De paso quitó un doble conteo latente en `claves_eliminadas`.
- **`plazo_meses` NO ERA «SIN COTA»: ERA UN 500 DE 15 SEGUNDOS.** Lo teclea una persona y entraba sin
  límite en un bucle mes a mes: con 10 000 000 la función gastaba **15 s** —un cuarto del
  `maxDuration`— y reventaba la pila. Se acota a **600 meses (50 años)** y se DECLARA
  (`plazo_recortado` + advertencia): por encima de eso no hay contrato de obra, solo un dato mal
  escrito, y recortar en silencio sería cambiarle la cifra al usuario sin decírselo. 15 s → 1 ms.
- **EL DESFASE DE PÁGINAS DEL OCR ERA UNA CITA FALSA.** El navegador DESCARTA las páginas que no
  puede rasterizar, así que un lote 21-30 con la 21 descartada manda 9 imágenes; el servidor las
  marca `\f1..\f9` y el re-basado aritmético («primera + índice − 1») citaba **todo el lote una
  página por debajo**. Una cita de página equivocada es peor que no citarla: manda a buscar la
  cantidad donde no está. `rebasarMarcadores(texto, primera)` pasó a ser
  **`renumerarMarcadores(texto, numerosReales)`** en las dos copias (navegador y servidor, atadas por
  la prueba que las EJECUTA): la lista la escribe el mismo bucle que decide qué imagen se envía, así
  que no se puede desincronizar. Un índice fuera de la lista se deja TAL CUAL — inventarle un número
  sería el defecto que esto corrige. El índice de los FALLOS se traduce por la misma lista.
- **EL SIGNO DEL VEG YA ESTÁ VIGILADO.** `veg = p × utilidad − costo_de_preparar` es el ÚNICO umbral
  DURO sobre `p` del repositorio y su signo decide si el editor dice «preséntese» o «no cubre el
  costo de preparar la oferta»; ninguna prueba lo miraba (solo `veg != null`), así que un cambio de
  modelo podía voltearlo en silencio sobre presupuestos sanos — que es lo que estuvo a punto de pasar
  al retirar el tertil. **No se congela la cifra** (ataría el modelo): se fijan las relaciones que
  siempre valen — un presupuesto sano da VEG positivo, `veg_positivo` y `filtros_duros` no pueden
  discrepar del número, la identidad `round(p × utilidad − cPrep)`, monotonía en `p_base` y en el
  costo de preparar, y **sin `p` el VEG es `null`, jamás 0** (un 0 se leería como «no vale la pena»,
  que es una afirmación, no una ausencia).
- **«ADMINISTRACIÓN DELEGADA DE OBRA» SE DESCARTABA, y su comentario prometía lo contrario.**
  `NO_ES_COSTO_DIRECTO_RE` anclaba al PRINCIPIO «a propósito, para que una partida real sobreviva»,
  pero esa descripción EMPIEZA por la palabra: el `^` no la protegía. La administración delegada es
  una modalidad real y, si el pliego la paga como partida, perderla ABARATA el presupuesto — el error
  caro de este módulo. El discriminante no es la POSICIÓN sino lo que SIGUE a la palabra: la «A» del
  AIU va sola o con su porcentaje, la partida real la califica («delegada», «de obra»); y con un `%`
  en la línea manda el AIU aunque venga calificada. Se prueba por el PARSER, no por la regex: lo que
  importa es qué filas acaban sumando.
- **Lo que NO se cierra, y por qué**: una fila con la cantidad comida y SIN unitario ni total tiene
  exactamente la misma forma que una benigna con su cantidad y los precios en blanco —cuatro celdas
  las dos—, y lo único que las separa es la MAGNITUD del número, que sería una heurística inventada.
  Se elige la lectura benigna a propósito: la entidad publica las cantidades y deja los precios al
  oferente, nunca al revés. Si algún día hay que cerrarlo, la señal está en el DOCUMENTO (cuántas
  celdas traen las demás filas), no en la fila. Queda declarado en el código.

### Puntos 7 y 10 de la hoja de ruta (ago 2026)

- **LA SEÑAL #11 ES AMBIGUA Y CALLARLO ERA AFIRMAR.** La tarjeta pintaba «Poca competencia» en VERDE
  y nada más. El verde es correcto —el orden por defecto ES la Palanca 4— pero el MISMO hecho
  sostiene la lectura contraria del manual: la señal #11 de pliego sastre es «uno o dos oferentes en
  el histórico de esa entidad», y un pliego escrito para alguien produce exactamente la cifra que la
  app premia. `avisoCompetencia` dice las DOS. Tres decisiones:
  · **No se toca el color.** Pasarlo a ámbar afirmaría la lectura mala con la misma falta de
    evidencia con la que hoy se afirma la buena, y además contradiría el orden por defecto.
  · **Se avisa SOLO bajo 2 oferentes de media** (`UMBRAL_SENAL_11`), el umbral LITERAL de la señal,
    no en toda la banda «baja»: en un listado ordenado por atractividad la mayoría de las tarjetas de
    arriba son de competencia baja, y un aviso en casi todas se deja de leer — es la lección del chip
    constante que hubo que retirar. Medido en navegador: **1 de 12 tarjetas** lo dispara.
  · **Sin base no se afirma nada** (`conBase`), y no aparece en tarjetas no viables: urgir a revisar
    un pliego al que no se puede presentar es un contrasentido.
- **`inferir` y `calcular` SON PÚBLICAS, y lo que NO se abrió importa más que lo que sí.** Decisión
  del dueño, con su condición: «no hay problema siempre y cuando se especifique que son precios de
  referencia y su fuente, que son páginas web».
  · **El riesgo real no era el catálogo: eran los precios que el dueño YA CORRIGIÓ.** `calcular` leía
    `leerPreciosUsuario(redis, perfil)` y el `perfil` VIAJA EN LA PETICIÓN, así que con la acción
    abierta cualquiera pediría `perfil=helder` y se llevaría sus correcciones dentro del costo. Eso no
    es «información del APU»: es su trabajo acumulado, lo único que mejora la aplicación con el uso.
    `presupuestoDe(..., {conCredencial})` no los lee sin token y la respuesta lo DECLARA
    (`precios_propios_aplicados`): quien vea otro número tiene que poder saber por qué.
  · **Token OPCIONAL con la regla de `/api/oportunidades`**: ausente → modo público; presente y
    válido → además los precios propios; presente e INVÁLIDO → **401, jamás degradación silenciosa**.
  · **`lib/apu/fuentes.js` arma la procedencia desde el `meta()` de cada banco**, nunca transcribiendo
    las URL: una segunda lista se desincroniza al re-capturar una vigencia y acabaría citando un
    documento que no es el que se usó para calcular. Un banco sin URL publicada viaja con `null` — no
    se inventa un enlace, que sería peor que no darlo. La licencia del INVIAS (prohíbe uso comercial
    sin autorización) viaja con su fuente.
  · De paso, `invias_items.meta()` expone ya su `url_patron`: la tenía en el JSON y no la publicaba.

### Las deducciones se LEEN del pliego (ago 2026 · punto 6 de la hoja de ruta)

`lib/deducciones.js` (hoja) + `/api/pliego?op=deducciones`. El margen de todo presupuesto viaja
declarado como COTA SUPERIOR mientras `deducciones_pct` esté vacío, y ese bloque puede rondar el 10 %
del valor —más que el margen típico de obra—, así que su ausencia puede INVERTIR el signo de la
decisión. **No hay tabla nacional que copiar** (las estampillas las fija cada ordenanza departamental
o acuerdo municipal), este entorno no alcanza los portales (403 de política de red) y el dueño
confirmó que no tiene el dato. Queda la fuente que la doctrina ya exigía: **la cláusula del pliego
del proceso**, que además es vinculante.

- **Mismo patrón que `lib/cronograma`**: regex por LÍNEA sobre el texto ya extraído, y cada concepto
  viaja con su EVIDENCIA (la línea literal) y su PÁGINA, para auditarlo sin reabrir el PDF.
- **UNA LÍNEA PUEDE TRAER DOS CONCEPTOS.** «la retención en la fuente del 2,5 % y la estampilla
  Pro-Cultura del 1 %» es una línea y son dos datos: la primera versión cortaba en el primero
  (`break`) y perdía el segundo en silencio. Cada concepto busca su porcentaje desde SU posición, así
  que no se roban la cifra — la lección de `leerAnticipo`, que declaraba un anticipo del 25 %
  leyendo el AIU.
- **…Y UN MISMO PORCENTAJE NO PUEDE CONTARSE DOS VECES.** «estampilla Pro-Cultura del 1 %» casa con
  `estampilla` Y con `tasa_prodeporte` —son la misma cosa dicha de dos maneras— y el 1 % se sumaba
  dos veces: un descuento inflado da un margen falso, que es justo lo que este módulo existe para
  evitar. Se marca la POSICIÓN reclamada dentro de la línea, así que la guarda vale para cualquier
  solape futuro entre conceptos y no solo para ese par; gana el primero de `CONCEPTOS`, que es el más
  específico (el orden importa).
- **LO QUE EL MOTOR YA APLICA NO SE SUMA**: la contribución del 5 % y la retención de garantía viajan
  con `ya_en_el_motor: true` y quedan fuera de `total_aplicable_pct`. Sumarlas las cobraría dos
  veces, y la retegarantía además **se devuelve al liquidar**: tratarla como deducción perdida sería
  una segunda mentira. Por eso hay DOS cifras con dos nombres —`total_pct` (lo que dice el pliego) y
  `total_aplicable_pct` (lo que hay que teclear)— y la respuesta explica cuál va en el campo.
- **Nada se inventa**: sin cláusula reconocible, `null` y jamás 0 —un 0 diría «no le descuentan
  nada», que es una afirmación, no una ausencia— y un concepto SIN porcentaje se CUENTA
  (`lineas_sin_porcentaje`) en vez de rellenarse. Un porcentaje > 30 se descarta: no es un descuento
  de ley, es otra cifra de la línea (un plazo, un anticipo).
- **La cifra es SIEMPRE una COTA INFERIOR** (`incompleto: true`): se lee lo que ESE documento
  declara, y un pliego puede callar una estampilla que igual van a descontar. Decir lo contrario
  sería vender como completo un dato que no lo es.
- **El texto del pliego se consigue en UN solo sitio** (`textoGuardado`, extraído de
  `handlers/pliego/cronograma` y compartido): dos formas de «conseguir el texto» divergen a la
  primera corrección — la lección que ya costó el lector de cuerpos cuadruplicado.
- **Se pliega como `op` del router de pliego**, no como función nueva: `api/` sigue en 6 de 12.

### ⚠️ UNA `fase` REZAGADA MATABA CONVOCATORIAS PUBLICADAS, Y NO DEJABA RASTRO (20-ago-2026)

**Defecto de producción reportado por el ingeniero.** La **UNIVERSIDAD PEDAGÓGICA NACIONAL** tenía
cuatro convocatorias en SECOP II (UPN-VAD-CP-**008/009/011/012**-2026, tres abiertas y una adjudicada,
entre $1.219 M y $1.467 M cada una) y la app enseñaba **una**. Lo grave no fue el proceso perdido: fue
que **no había forma de averiguar dónde había muerto**.

- **CAUSA RAÍZ: `fase` VETABA a la columna autoritativa.** `estado_abierto` recorría
  `estado_del_procedimiento` y `fase` **en pie de igualdad** con la regla «cerrado gana siempre», así
  que un valor rezagado en `fase` (Evaluación · Adjudicación · Ejecución) descartaba un proceso cuyo
  `estado_del_procedimiento` decía **«Publicado»**. Y `estado_del_procedimiento` está poblada al
  **100 %** frente al **98,7 %** de `fase` (`docs/datos.md` §6): la autoritativa perdía contra la
  supletoria.
- **QUE `fase` VA REZAGADA LO PRUEBA LA PROPIA CAPTURA DEL INGENIERO**: UPN-VAD-CP-008-2026 figura
  como **«Proceso adjudicado y celebrado»** con **Fase actual «Presentación de oferta»**. Si retrasa
  en un sentido retrasa en el otro — una convocatoria republicada conserva la fase del intento
  anterior mientras su estado dice «Publicado».
- **EL DAÑO ERA DEL PEOR TIPO POSIBLE: SILENCIOSO E INAUDITABLE.** El filtro de estado corre en la
  **INGESTA** (`lib/proyeccion.transformar`), así que esos procesos **nunca entraban a Redis**; y el
  embudo de `/api/diagnostico` censa **el corpus ya guardado**, así que tampoco aparecían en
  `fuera_unspsc`, ni en `fuera_sin_unspsc_ni_obra`, ni en ninguna otra cubeta. **Desaparecían sin
  dejar rastro en ningún sitio del sistema.**
- **CLAUDE.md YA DECLARABA LA REGLA CORRECTA Y EL CÓDIGO NO LA CUMPLÍA.** La sección «Consolidación a
  6 routers» dice que «el filtrado ya leía `estado_del_procedimiento` primero (con `fase` de
  respaldo)». Nunca fue verdad. Es la lección de método más cara de esta sesión: **una premisa escrita
  en la memoria no es una cerradura; la cerradura es la prueba** — y la prueba que existía fijaba
  justamente el comportamiento defectuoso (`{Activo, fase: Adjudicación} → false`).

**La regla, después.** Precedencia explícita en `estado_abierto` y en `estado_cerrado` (las dos, o
podrían afirmar cosas incompatibles sobre la misma fila):

1. `adjudicado = "Si"` — señal dura, gana siempre.
2. El **reloj** (`cierre_vencido`) — un hecho, no una inferencia.
3. `estado_del_procedimiento` — **AUTORITATIVA**. Si dice abierto, se acabó: `fase` ya no veta.
4. `fase` — **solo** si la anterior no dice nada reconocible.

- **El error cae del lado correcto, y hay que contarlo exacto**: un proceso ya adjudicado con un
  «Publicado» rezagado lo cierran igual las **dos señales duras** (`adjudicado="Si"` y el reloj), que
  son precisamente las que cazan el UPN-008 de la captura. En cambio una convocatoria de $1.348 M que
  la app nunca enseñó no se recupera. Es la doctrina del proyecto: **el falso negativo cuesta más que
  el amarillo**.
- **`{Activo, fase: Adjudicación} → true` ahora, y era `false` a propósito.** El cambio de doctrina va
  con su caso de prueba reescrito y con los contra-casos que demuestran que las dos señales duras
  siguen cerrando. No se «arregló un cero que era correcto»: se cambió una decisión, con motivo.
- **«Proceso adjudicado y celebrado» no casaba con nada.** `coincide` compara por PREFIJO en los dos
  sentidos y SECOP II antepone «Proceso » a sus literales: ese estado caía en «desconocido», que para
  `estado_abierto` daba el resultado correcto **por accidente** y para `estado_cerrado` —quien AFIRMA
  el cierre— daba `false` sobre un proceso adjudicado. Se recorta el prefijo (`nucleoEstado`) antes de
  comparar. **No se pasó a coincidencia por SUBCADENA**: se tragaría «no adjudicado».

**EL PUNTO CIEGO, CERRADO: `lib/censo_ingesta.js`.** La pregunta del dueño —«¿está pasando con más
procesos?»— no tenía respuesta posible porque los `continue` de la cascada de ingesta no dejaban
huella. Ahora cada fila descartada se registra con su MOTIVO y unos pocos ejemplos legibles, se
persiste en `licitaciones:censo_ingesta` y viaja en la respuesta del sync y en `/api/perfil?op=
diagnostico`. Decisiones que no hay que re-aprender:

- **NO reimplementa ninguna regla.** El motivo lo NOMBRA quien ya decidió (`lib/proyeccion`) y las
  sub-causas se resuelven llamando a las MISMAS funciones (`es_convenio` de filtros con require
  diferido; `BLACKLIST_OBJETO` de semantica y `codigosDeLicitacion` de unspsc, que son HOJAS). Un
  censo que explica una decisión distinta de la tomada es peor que ninguno.
- **La invariante es `leidas = aceptadas + descartadas`, con prueba.** Es lo único que detecta un
  `continue` nuevo sin registrar — o sea, la reaparición del punto ciego. `reclasificar()` existe para
  el descarte POSTERIOR a la cascada (`mes_fuera_de_ventana`) sin romperla.
- **Un motivo en CERO se publica igual.** Que un motivo «no aparezca» y que «no descarte nada» son
  cosas distintas y la primera se lee como la segunda: es el «sin dato vs cero» del proyecto aplicado
  a un contador.
- **`guardadas` del delta MENTÍA.** El bucle de `porMes` descarta con un `continue` toda fila cuya
  fecha de publicación no caiga en el año vigente, y la respuesta publicaba `guardadas: activo.length`
  — contando como guardado lo que nunca se escribió. Hoy `guardadas` es lo que de verdad se escribió y
  `aceptadas_por_la_cascada` viaja aparte.
- **Es diagnóstico, no dato del negocio**: `guardarCenso` es best-effort y jamás frena una
  sincronización.

**`lib/rastreo.js` + `?buscar=` + la caja de *Sistema*: la pregunta que el dueño no podía hacer.**
`GET /api/perfil?op=diagnostico&buscar=<referencia|entidad|NIT>` (token, como el resto del
diagnóstico) responde con UNO de cuatro sitios: `servido` · `en_corpus` (guardado pero apartado, con
el motivo del juicio) · `descartado_en_ingesta` (con el motivo del censo) · `no_consta`.

- **No reimplementa el juicio**: el handler le INYECTA la MISMA `filtrarProcesosVisibles` que sirve
  `/api/oportunidades` y `/api/resumen`, y el motivo sale del `motivo` que publica `evaluarRup` o del
  `mensaje` de la puerta que falla — jamás de una redacción propia.
  · **Y el primer intento cometió el defecto del repositorio en el propio arreglo**: comprobaba
    `rup.objeto_ok`, un campo que `evaluarRup` **no publica** (se llama `ok`, y el veredicto del
    objeto no viaja con ese nombre), así que `!undefined` era `true` y **todo** proceso salía
    «apartado por el juicio» — incluidos los que la app estaba enseñando. Es `i.total_procesos` otra
    vez, en la herramienta que existe para diagnosticar. **Lo cazó la prueba de INTEGRACIÓN, no la
    unitaria**: la unitaria inyectaba un `evaluar` de mentira y por eso pasaba en verde. Lección:
    cuando una función recibe una dependencia inyectada, la prueba unitaria comprueba el
    CABLEADO — quien comprueba el CONTRATO es la que usa la dependencia real.
- **`no_consta` NUNCA afirma que el proceso no exista en SECOP II** — nadie ha mirado SECOP II desde
  aquí: afirma que la app no lo tiene, y da el siguiente paso. Distinguir «lo sé» de «no lo sé» otra
  vez, en el sitio donde la tentación de afirmar es máxima.
- **El censo guarda EJEMPLOS con tope, no el universo**, y la respuesta lo dice: lo que no está entre
  ellos no se puede afirmar.
- **Se miran LOS DOS censos, el de la full y el del delta.** Un proceso que tiró la carga completa no
  tiene por qué estar en el censo del último delta, y quedarse con uno solo respondería «no consta»
  sobre un descarte que sí consta — el peor error posible en la herramienta que existe para
  diagnosticar ausencias. El `origen` viaja en cada resultado.
- **La caja vive en *Mi empresa → Sistema* («¿Por qué no está este proceso?»)** porque **el dueño no
  tiene terminal**: la misma razón por la que `/admin.html` encadenaba la full desde el navegador. Un
  diagnóstico que solo se puede leer con `curl` no existe para el único usuario que hay.

**UN QUINTO MECANISMO QUE LA LISTA DE ARRIBA NO CONTEMPLABA: EL RÉGIMEN ESPECIAL (24-ago-2026).**
La UPN es una **universidad estatal**, y esas contratan por **régimen especial** (Ley 30/1992 art. 93);
su «CP» es *Convocatoria Pública*, no una modalidad de la Ley 80. Y `modalidad_competitiva` deja fuera
«Régimen Especial» **salvo** que el literal diga «(con ofertas)». Reproducido ejecutando la cascada real
con una fila UPN de $1.348 M, publicada, abierta y de obra: con «Régimen Especial» a secas
`transformar` guarda **0 filas** — no entra a Redis, y **la full tampoco la recupera**; con «Régimen
Especial (con ofertas)» o con cualquier modalidad de la lista blanca, entra. Es decir: **relanzar la
full puede no bastar**, y eso hay que saberlo antes de concluir que el arreglo de la `fase` cerró el
caso.
- **EL CENSO YA REPARTE POR LITERAL DE MODALIDAD (`por_modalidad`), que es lo que convierte esa
  hipótesis en una cifra.** `modalidad_no_competitiva` es la cubeta que más volumen tira y MEZCLA dos
  cosas que no son la misma: la contratación directa (descarte correcto, la inmensa mayoría) y el
  régimen especial sin ofertas, que es donde publican universidades estatales, ESE y empresas de
  servicios públicos. Con el agregado y cinco ejemplos, **un falso negativo de mil procesos es
  indistinguible de cero**. El censo no decide nada nuevo: cuenta por el literal que ya venía
  descartando. Cota dura de 40 literales —esto viaja a Redis y se publica— y lo que no cabe se CUENTA
  en `(otras)`; una modalidad ausente va a `(sin modalidad)`, jamás a la clave vacía (la lección del
  FFIE). Invariante hermana con prueba: **Σ `por_modalidad` = `por_motivo.modalidad_no_competitiva`**,
  también después de fusionar las invocaciones de una misma full. Un censo ya guardado en producción
  no trae el campo: los atajos de `fusionar` lo NORMALIZAN a `{}` — un consumidor no puede recibir
  `undefined` según la rama por la que salga la fusión, y ese borde lo cazó la propia prueba.
- **ES UNA HIPÓTESIS REPRODUCIDA, NO UNA MEDICIÓN**: no consta con qué literal publica la UPN, porque
  esta sesión tampoco alcanza la fuente. Lo que sí está medido es que ese literal DECIDE.
- **NO SE TOCA LA LISTA BLANCA A CIEGAS.** Ensancharla para admitir «Régimen Especial» a secas metería
  todo lo que no tiene concurso abierto, que es justo lo que esa regla existe para dejar fuera. La
  decisión depende del literal exacto, y el literal lo da el censo.
- **LA CAJA YA SABE RESPONDERLO**, verificado de punta a punta: con esa fila, `?buscar=UPN-VAD-CP-011-2026`
  devuelve `donde: "descartado_en_ingesta"`, `motivo: "modalidad_no_competitiva"` y la modalidad literal
  en el ejemplo. Así que el paso pendiente no solo confirma: **discrimina entre los dos mecanismos**.
- Y el arreglo de la `fase` **sí funciona**: la misma fila con `estado_del_procedimiento: "Publicado"` y
  `fase: "Adjudicación"` (o `Activo`/`Adjudicación`, la combinación de la captura) da hoy `abierto: true`,
  donde antes moría.
- Lección de método que costó un falso positivo aquí mismo: `rastrear` recibe `censos` como **array**
  `[{origen, censo}]`; pasándole un objeto responde `no_consta` sobre un descarte que sí consta. La
  primera reproducción de esta sesión lo hizo mal y estuvo a punto de reportarse como defecto del
  módulo. **Una dependencia inyectada con la forma equivocada no prueba nada** — se comprueba contra
  el llamador real (`handlers/perfil/diagnostico.js`), que la construye bien.

**MEDIDO EN PRODUCCIÓN (24-ago-2026), y cierra el caso.** Tras relanzar la carga completa, el dueño
consultó las cuatro convocatorias: **tres aparecen y la que falta es `UPN-VAD-CP-008-2026`, que es
justamente la ADJUDICADA** de las cuatro (la propia captura del ingeniero la muestra como «Proceso
adjudicado y celebrado»). Es decir: el arreglo de la `fase` rezagada recuperó las tres abiertas, y la
cuarta no sale porque está cerrada — el comportamiento correcto. **El régimen especial NO era el
mecanismo aquí**, y lo demuestra el propio dato: la UPN publica con un literal que pasa la lista
blanca.

**El primer `por_modalidad` real, y desmiente la hipótesis por volumen:**
`Contratación directa` 501 811 · **`Contratación régimen especial` 510 585** · `Contratación Directa
(con ofertas)` 4 354 · `Solicitud de información a los Proveedores` 21 856 · `Enajenación…` 182 ·
`No Definido` 88. El literal real es **«Contratación régimen especial»**, no «Régimen Especial», y es
la cubeta MÁS grande — más que la contratación directa. Pero el corpus servido trae 79 procesos de
**«Contratación régimen especial (con ofertas)»**: cuando hay convocatoria, SECOP II lo etiqueta, y la
regla los deja entrar. Los 510 585 son mayoritariamente prestación de servicios profesionales de
universidades, ESE y empresas de servicios públicos —el ejemplo del censo es un «PRESTAR SERVICIOS
PROFESIONALES EN GEOLOGIA» de la UNAL—, o sea contratación directa de esas entidades. **La lista
blanca se queda como está**: la sospecha estaba bien planteada y el dato la resuelve en contra. Sin
`por_modalidad` no se habría podido decidir en ningún sentido.

**Lo que este entorno NO pudo verificar, dicho en vez de disimulado.** La política de red de esta
sesión bloquea `datos.gov.co` (403 del proxy, `Host not in allowlist`) y también el despliegue, así
que **no se pudo consultar la fila real de las cuatro convocatorias de la UPN**: no consta cuál de los
cuatro mecanismos posibles mató a cada una. Lo que sí está **reproducido ejecutando los módulos
reales** es que una `fase` rezagada tira de la ingesta una fila publicada, abierta, de obra y de
$1.348 M sin dejar rastro; y que el rezago de `fase` en esa entidad está probado por la captura. La
confirmación definitiva es de una línea y ahora se puede pedir desde el navegador: relanzar
`/api/procesos?op=sync&modo=full` una vez y escribir `UPN-VAD-CP-011-2026` en la caja de *Sistema*.

### Lo APARCADO por decisión del dueño (20-ago-2026)

No son deuda ni olvido: son decisiones tomadas. Anotarlas evita que la próxima sesión las retome
como pendientes y gaste trabajo en algo que ya se decidió no hacer ahora.

- **Medir el lector de pliegos contra formatos REALES de SECOP II** (§5 fila 11). El banco da 100 %
  sobre un corpus SINTÉTICO escrito por el autor del parser: mide previsión, no cobertura, y la tasa
  real sigue **sin medir**. Hace falta un corpus de 15-20 pliegos reales que el dueño tendría que
  aportar. **APARCADO: «cuando necesite arreglarlo te diré».** Lo que NO cambia: la cifra del banco
  no se puede presentar como cobertura del universo real, y `docs/APU_INFORME_COMPLETO.md` §1.G.7
  sigue declarando ese vacío.
- **Enlazar las deducciones leídas del pliego a la pantalla de Precios** (aplicar el porcentaje con
  un clic). El lector ya existe y responde con la cifra, la evidencia y la página
  (`/api/pliego?op=deducciones`); lo que falta es el recuadro y el botón. **APARCADO igual.**
  Mientras tanto el margen sigue viajando como COTA SUPERIOR en los presupuestos que no carguen
  `deducciones_pct` a mano, y eso ya está declarado en la respuesta — no es un fallo silencioso.

**El barrido de cierre (20-ago-2026) no encontró nada más pendiente en el código**, y conviene decir
qué se miró para no repetirlo a ciegas: cero marcadores `TODO`/`FIXME` reales (todos los aciertos son
la palabra española «todo»), 130 módulos con **0 requires rotos y 0 huérfanos**, las 24 `op` de los
seis routers cargan, los 18 rewrites y 3 redirects de `vercel.json` resuelven, y los ids que el
frontend busca existen —los seis que parecían faltar los CREA el propio JS con sus plantillas, que es
un falso positivo conocido de ese censo y conviene recordarlo—.

### Una sola rama: `main` (21-ago-2026)

Encargo del dueño: **«Unifica todas las ramas y solo maneja en `main`»**. Se retiraron las 95 ramas
remotas y todo el trabajo va desde ahora directo a `main`. Decisiones que no hay que re-aprender:

- **LA TOPOLOGÍA DE GIT ENGAÑABA, Y POR ESO LA AUDITORÍA NO FUE CONTAR COMMITS.** `main` se
  construyó con fusiones APLASTADAS (squash), así que casi todas las ramas figuraban como «96 ahead
  / 116 behind» aunque su contenido estuviera dentro hacía semanas. Fiarse del contador habría
  significado o bien re-fusionar 95 ramas ya absorbidas, o bien borrarlas sin mirar. Lo que decide es
  **comparar ARCHIVOS** (`git diff --name-status origin/main..<rama>`, mirando lo que la rama AÑADE).
- **Solo UNA rama aportaba algo**: `claude/tokens-vercel-github-setup-k40570` →
  `docs/CONFIGURACION_TOKENS.md`, la guía de variables de entorno para el dueño sin terminal. Se
  rescató, y con ella la corrección del paso 1 del `README.md` que la propia guía dejaba pendiente
  («una cadena larga y aleatoria» era la trampa número uno: con el token integrado en el frontend, el
  valor de `HISTORICO_TOKEN` tiene que ser EXACTAMENTE `MiExtraccion2025` o la app se sirve a medias
  **sin error visible**). Las dos fuentes dicen ya lo mismo y la guía lo declara.
- **LO QUE LAS DEMÁS RAMAS «AÑADÍAN» ERAN ARCHIVOS RETIRADOS A PROPÓSITO**, y devolverlos habría sido
  una regresión disfrazada de rescate: los `api/*.js` sueltos (plegados en los 6 routers), los cinco
  archivos de «Página única» (que la suite PROHÍBE que vuelvan) y la arquitectura anterior a la
  reescritura de jul 2026 (`lib/engine.js`, `sw.js`, y un `package.json` que contradice la regla
  central del proyecto). Un archivo que reaparece por una fusión no lo carga nadie y queda
  desincronizado en silencio — que es peor que un 404, la misma lección de las URLs retiradas.
- **EL BORRADO DE LAS RAMAS NO SE PUDO EJECUTAR DESDE AQUÍ, y se reporta en vez de darse por hecho.**
  El relé de git de este entorno permite empujar commits pero **deniega el borrado de referencias**:
  `git push origin --delete <rama>` responde **403** mientras `git push origin main` funciona, y el
  proxy no lo registra como fallo suyo (`recentRelayFailures: []`); el servidor MCP de GitHub tampoco
  expone borrado de ramas. La regla del entorno es que un 403 de política **no se reintenta ni se
  rodea**. Las 95 ramas siguen en GitHub: son ruido, no trabajo pendiente, y se borran con clics desde
  la página *branches* del repositorio. `docs/RAMAS_RETIRADAS.md` guarda el censo con el SHA de cada
  una y el comando para resucitarla (`git push origin <sha>:refs/heads/<rama>`), así que el día que se
  borren no se pierde nada.
- **Las dos PR abiertas se cerraron sin fusionar** (#21 «Motor de inferencia de ítems APU» de ago 5 y
  #3 «legal compliance audit» de jul 29): su contenido ya está en `main` por otra vía —se comprobó
  archivo a archivo— y fusionarlas habría devuelto los archivos retirados. Una PR abierta sobre
  trabajo ya integrado no es un pendiente: es ruido que la próxima sesión audita otra vez.

## Convenciones

- Español en UI, comentarios y commits. Estética tipo Apple (Tailwind CDN, sobrio, claro).
- Sin dependencias de pago; sin npm salvo necesidad justificada.
- Preferir cambios pequeños y directos sobre el código actual — la era de las «capas aditivas»
  con monkey-patch terminó con la reescritura.

### UN BORRADOR NO ADMITE OFERTAS, Y LA TARJETA DECÍA QUE SÍ (24-ago-2026)

Salió del primer `censo_ingesta` de producción, mirando lo que NO se estaba buscando: de los **1 138
procesos servidos**, `estado_del_procedimiento` vale «Publicado» en 1 133 y **«Borrador» en 5**.

- **CAUSA: un acierto por accidente, no por decisión.** `filtros.coincide` compara por prefijo **en
  los dos sentidos** (`v.startsWith(e) || e.startsWith(v)`) y `ESTADOS_ABIERTOS` trae «borrador de
  pliegos», así que `"borrador de pliegos".startsWith("borrador")` deja pasar el literal suelto.
  Nadie decidió admitir «Borrador»: se coló por la forma del comparador.
- **A un borrador NO SE LE PUEDE PRESENTAR OFERTA** —sea el proyecto de pliego, que sigue en
  observaciones, o un proceso que aún no se publicó— y la tarjeta le pintaba cierre, probabilidad y
  «Cumple los requisitos para presentarse». Es el falso positivo caro: el recurso escaso es **el
  tiempo del equipo** (Palanca 3), no la lista de resultados.
- **NO SE EXCLUYE, y es deliberado.** Si es el proyecto de pliego, es la ventana que el manual llama
  la más poderosa y desaprovechada (mandamiento 7: observar con la redacción alternativa lista para
  pegar); esconderla sería el falso negativo que cuesta más. Se DICE lo que es: «Todavía no admite
  ofertas: está en borrador. Es el momento de observar el pliego, no de preparar la oferta», en
  ÁMBAR — el proceso no se descarta, se sitúa.
- **La distinción NO exige resolver la ambigüedad de qué significa «Borrador» en el dataset** (esta
  sesión no alcanza la fuente): en las dos lecturas posibles, «todavía no admite ofertas» es cierto.
  Actuar bien sin saberlo todo es distinto de adivinar.
- **Solo el literal EXACTO responde `false`.** Un estado ausente, vacío o desconocido devuelve `true`:
  no saber no autoriza a afirmar que no admite ofertas — «sin dato ≠ cero» en booleano. Y «Borrador
  de pliegos» es un estado publicado de la lista canónica: otra cosa, con prueba de que no se contagia.
- **`admite_ofertas` va PRIMERO en `lineaRequisitos`**, antes que las puertas: da igual que cumpla los
  requisitos si hoy no se le puede presentar nada.
- **La cerradura EJECUTA `lineaRequisitos`**, no comprueba por regex que se llame. De paso se reforzó
  la guarda preexistente de la tarjeta —que exigía la llamada literal `(puertas, l.manifestacion)` y
  se rompía con cualquier argumento nuevo— en vez de debilitarla para que pasara el cambio.

### La dispersión de la baja se MIDE, no se supone (24-ago-2026)

Salió de mirar el `indice:baja` de producción: entre los ejemplos de baja alta, la **ASOCIACIÓN DE
MUNICIPIOS … BOSQUES** publica `p25 = mediana = p75 = 35` sobre **57 procesos** — IQR cero, la huella
que esta memoria ya reconoce como sospechosa (caso de la emulsión CRL-0 idéntica en las 140
provincias del INVIAS).

- **`multiplicadorPrecio` deriva su σ del IQR de la celda** (`(p75 − p25) / 1.349`) y, cuando el IQR
  no es utilizable, cae a `DISPERSION_DEFECTO = 4 pp`. **La hipótesis de una división por cero era
  FALSA**: la guarda `p75 > p25` ya existe y el motor nunca usa σ = 0 — que sería certeza absoluta
  justo donde menos se sabe, la lección que `rivales_desv` ya aprendió en el índice de competencia.
- **Lo que sí es cierto: ese 4,0 es un SUPUESTO SIN FUENTE**, y era la única de las tres constantes
  de ese módulo sin comentario que la justificara. Y **decide probabilidades**: con mediana 35 % y
  baja máxima 20 %, σ = 4 lleva el factor de precio al suelo de **0,01** —el proceso se va al fondo
  del orden— mientras que con σ ≈ 14,8 el mismo caso da **0,56**.
- **Medido sobre las 13 entidades de ejemplo de producción**: σ de 2,2 a 43,7 pp, **mediana 24,5 —seis
  veces el defecto—**, y 3 de 13 con IQR cero. **NO SE CAMBIÓ LA CONSTANTE**: esos 13 son los
  EXTREMOS que publica la meta, no una muestra, y calibrar con ellos sería la «suavización» que este
  proyecto prohíbe («los factores son supuestos con nombre, no coeficientes ajustados»).
- **Lo que se hizo es que el índice lo MIDA solo** (`medirDispersion` → `indice:baja:meta.dispersion`):
  celdas, cuántas sin dispersión medible, percentiles del IQR, σ mediana y cuántas celdas medibles
  caen por debajo del defecto del motor. Es el mismo movimiento que `baja_exactamente_cero` con el
  cruce de columnas, y el mismo que `por_modalidad` con el régimen especial: **convertir una sospecha
  en una cifra que la próxima reconstrucción responde sola.** Con esa medición delante se decide.
- **`iqr_cero` NO es «dispersión cero»: es «no se pudo medir»** —el histograma es de puntos
  porcentuales enteros y una celda concentrada lo colapsa— y por eso se cuenta aparte y jamás entra
  en los percentiles. Sin celdas medibles, los percentiles viajan en `null`, nunca en 0. Invariante
  con prueba: `iqr_cero + medibles = celdas`.
- **El defecto se IMPORTA de su dueño** (`lib/apu/rentabilidad.DISPERSION_DEFECTO`, `require`
  diferido: este módulo no puede depender de `apu/` en tiempo de carga). Copiar el 4,0 en el índice
  sería una segunda fuente de verdad de una cifra que multiplica probabilidades, y hay prueba que
  prohíbe escribirlo a mano.
- **MEDIDO EN PRODUCCIÓN EL MISMO DÍA, y EXONERA al 4,0.** Índice reconstruido sobre 46 015 procesos:
  `celdas 1 555 · iqr_cero 404 (26 %) · medibles 1 151 · IQR p25 5 / mediana 12 / p75 21 ·
  sigma_mediana 8,9 pp · por_debajo_del_defecto 336 (29,2 % de las medibles)`. La invariante cuadra
  (404 + 1 151 = 1 555). **Mi estimación con los 13 ejemplos —24,5 pp— estaba inflada 2,8×**, porque
  eran los EXTREMOS que publica la meta y no una muestra: la mediana real es 8,9. Y sobre todo, el
  razonamiento estaba AL REVÉS: el defecto solo se aplica donde el IQR es 0, o sea donde el 50 %
  central cabe en UNA cubeta de 1 pp (σ real ≲ 0,74), así que **4 pp es unas cinco veces MÁS ANCHO
  que la realidad de las celdas donde se usa** — conservador, que es la dirección correcta. Además
  el 29,2 % del mercado medible es más predecible que el defecto, así que no es un valor absurdo.
  **La constante se queda, ahora con fundamento medido en vez de sin fuente.** La sospecha estaba
  bien planteada y el dato la resuelve en contra, como pasó con el régimen especial.
- **LA CIFRA VIAJA CON SU ORIGEN** (`origen_sigma` en `multiplicadorPrecio`, `dispersion_origen` en el
  ajuste de precio): `medida` cuando sale del IQR de la celda, `supuesta` cuando cae al defecto. Sin
  eso, un σ supuesto de 4 pp y uno medido de 4 pp son el mismo número en pantalla — y son dos cosas
  distintas, en el 26 % de las celdas. Es la doctrina de `granularidad_utilizada` y `origen_b_max`.
  Los dos campos viajan también en la rama temprana (sin curva) como `null`: un consumidor no puede
  recibir `undefined` según por dónde salga la función.

### DOS DE LAS CUATRO GRANULARIDADES DE LA BAJA ESTÁN VACÍAS EN PRODUCCIÓN (24-ago-2026)

`por_granularidad` del índice reconstruido: **`entidad_familia` 0 grupos** y **`departamento_familia`
0 grupos**, frente a `entidad` 2 766 y `departamento` 34. El nivel MÁS específico de la cascada
—«INVIAS baja 8 % en obra vial y 2 % en consultoría», que es su razón de ser— no existe.

- **NO es un defecto de código, y se separó ejecutando.** La suite puebla las CUATRO granularidades
  con el mismo fixture, `normalizarCodigo` resuelve la familia de los códigos reales del corpus, y
  `transformar` conserva `codigo_principal_de_categoria` en el registro histórico. El pipeline de hoy
  es correcto.
- **Es un defecto de DATOS ya guardados.** Los niveles por familia solo nacen `if (fam)`, así que 0
  grupos sobre 46 015 procesos significa que **ninguno trae código UNSPSC legible**. Y
  `licitaciones:historico:mes:*` **no se purga NUNCA**: sigue vivo lo que escribieron versiones
  anteriores de la proyección. Corolario incómodo: **reconstruir el índice NO lo arregla** —hay que
  re-extraer el rango con `/api/procesos?op=historico&desde=…&hasta=…`—, y hasta entonces la baja de
  cada entidad mezcla todo lo que esa entidad contrata.
- **Un 0 con dos causas posibles no es un diagnóstico**: se añadió `sin_familia_legible` (y
  `sin_segmento_legible`) a la meta. Si iguala a `procesos_analizados`, la causa es el corpus y no el
  mercado. Es el mismo movimiento que `por_modalidad` con el régimen especial y que
  `baja_exactamente_cero` con el cruce de columnas: **convertir un cero mudo en una cifra que se
  explica sola.** Hay prueba de que con código legible el nivel se puebla y el contador vale 0.
- **CONFIRMADO EN PRODUCCIÓN EL MISMO DÍA: `sin_familia_legible = 46 013` de `procesos_analizados =
  46 013`, el 100 %.** No es que pocos procesos no traigan código: **no lo trae NINGUNO**. El contador
  convirtió el cero mudo en un diagnóstico en una sola reconstrucción.
- **La causa queda acotada, reproduciendo la llamada EXACTA del backfill**
  (`transformar(filas, { conservarCerradas: true, conAdjudicacion: true })`): el pipeline de hoy
  guarda `codigo_principal_de_categoria` y la familia sale (7214). Luego lo que hay en Redis lo
  escribió una versión anterior de `CAMPOS`, y `licitaciones:historico:mes:*` no se purga jamás.
  **Re-extraer el rango SÍ lo arregla; reconstruir los derivados no.**
- **⚠️ Y EL BACKFILL NO RE-EXTRAE SOLO PORQUE SE LE PIDA.** Lanzado con `?desde=2024-01&hasta=2025-12`
  respondió `extraccion: {done: true, yaEstaba: true}` — vio el rango terminado y no bajó una sola
  fila. El intento se perdió entero y la respuesta parecía un éxito. El parámetro que fuerza es
  **`&reiniciar=1`**. Ahora la rama `yaEstaba` publica `nota` y `como_reextraer` con el parámetro
  real: una respuesta que no hizo nada tiene que decir qué hacer, que es la regla de «ninguna
  pulsación sin respuesta visible» aplicada a un endpoint.
- **Lección de método**: `transformar` devuelve un **ARRAY**, no `{activo, historico}` (eso lo hace
  `repartirDelta`). La primera reproducción de esta sesión leyó `r.historico` y acertó por un
  *fallback*; la segunda leyó lo mismo y concluyó «0 registros», que era falso. Antes de declarar un
  defecto a partir de una lectura, comprobar la FORMA que devuelve la función.

### Auditoría del módulo APU: las dos mitades no están conectadas (24-ago-2026)

Consultoría completa en **`docs/AUDITORIA_MODULO_APU.txt`** (encargo del dueño: que el módulo sirva
para crear el APU de un contrato de SECOP cargándolo, y para comparar el precio del pliego con el
que sugiere la app). Se deja el resumen aquí para que nadie la repita desde cero. Todo MEDIDO
ejecutando código; la suite quedó en verde 4/4 y el banco con sus suelos superados.

- **EL MÓDULO APU SON DOS MÓDULOS Y NO HAY CABLE ENTRE ELLOS.** El lector de pliegos
  (`lib/apu_mapeo` → `data/catalogo_apu.json`) mapea contra **93 ítems SIN precio**; el importador
  (`lib/apu/importar` → catálogo + 5 bancos) contra **6 588 CON precio**: **70,8×**. La misma fila
  «SUB-BASE GRANULAR CLASE C» da `LOC-AFI-BASE` («Base granular», 0,524, revisar) por el lector y
  `INVIAS:320,6,1` (0,85, firme, con precio) por el importador — o sea que el camino que el encargo
  pide recibe la peor herramienta **y se equivoca de ítem** (base ≠ subbase).
- **`window.__pliegoUltimo` ya publica los ítems con `unitario_oficial`** (public/pliego.js:583) y su
  ÚNICO consumidor es el guardián del Formulario 1. El lector exporta **`.json`** y el importador
  acepta **`.xlsx/.xls/.csv`**: el archivo que produce el lector **no lo relee ningún módulo**. Cero
  ocurrencias de un puente lector→editor en todo el frontend. **El puente cuesta poco**: la acción
  `importar` ya acepta `filas:[{descripcion,unidad,cantidad,precio_archivo}]`, que es EXACTAMENTE la
  forma de `__pliegoUltimo.items` — verificado ejecutando la cadena completa.
- **LA CASCADA YA RESERVA EL SITIO Y ESTÁ VACÍO**: `lib/apu/precios` publica por ítem el nivel
  `{nivel:"pliego", etiqueta:"Pliego adjudicado", respondio:false, motivo:"Fuente no disponible…"}`,
  el segundo escalón, solo por debajo del precio propio. Llenarlo con el `unitario_oficial` que el
  lector ya extrae es la comparación que pide el encargo, sin inventar estructura nueva.
- **UN ÍTEM A 2,7× EL UNITARIO OFICIAL PASA EN VERDE.** `lib/formulario1` compara descripción, unidad
  y cantidad, y el TOTAL contra el presupuesto oficial; **el precio unitario no se compara con nada**.
  Reproducido: unitario oficial $95.000 ofertado a $260.000 → semáforo **«listo»** y ninguna de las
  dos cifras aparece en la respuesta. Importa por las DOS direcciones: por encima puede ser causal de
  exclusión si el pliego fija unitarios máximos; por debajo es donde se pierde plata con las mayores
  cantidades (contrato a precios unitarios).
- **SOLO EL 17,2 % DE LOS ÍTEMS CON PRECIO PUEDE PRODUCIR UNA HOJA DE APU** (1 134 de 6 588):
  catálogo 174/174, INVIAS 520/526, EPC 440/440, y **IDU 0/3 172, FFIE 0/1 042, ICCU 0/1 234** (solo
  precio total). Un pliego exige el APU DESGLOSADO: con el 82,8 % restante se presupuesta pero **no se
  radica el anexo**. No inventar composiciones para taparlo — es el falso positivo caro del módulo.
- **UN MAPEO «FIRME» PUEDE DUPLICAR EL PRECIO Y NADA LO VIGILA**: «CONCRETO CLASE D 3000 PSI» casa
  **firme** (0,856) con «630.4 CONCRETOS CLASE D … **(vigas en puentes)**» del ICCU a **$1.183.877/m³**
  (9 variantes, se toma la primera). El tratamiento de «cabecera antes del paréntesis» que ya existe
  para INVIAS no se aplica al ICCU, donde el paréntesis cambia el **destino de la obra**, no la
  gradación.
- **LA VÍA AUTOMÁTICA NO CLASIFICA 4 DE 6 OBJETOS DE OBRA BIEN ESCRITOS.** «CONSTRUCCIÓN DE PAVIMENTO
  RÍGIDO» saca **3 puntos con umbral amarillo 6**, siendo VIA-RIG candidata ÚNICA (margen máximo): el
  diseño exige ACUMULAR anclas y los objetos de SECOP son cortos; el UNSPSC no desempata (7214 declara
  13 tipologías compatibles). **No bajar los umbrales a ciegas** — el verde es el único estado que
  presupuesta sin pedir el pliego. La corrección real es de PANTALLA: hoy el paso 1 de Precios es
  «¿Qué va a construir?» (adivinar) y el lector vive **plegado dentro de ese paso**
  (`index.html:1826`), o sea que la fuente más fiable está escondida y la menos fiable en primer plano.
- **CALIDAD DE DATOS · ICCU: 149 de 1 234 (12,1 %) con la unidad ROTA** por corrimiento de columnas
  (unidades que contienen precios «1.222.065 1.225.019…», descripciones enteras, o «CONSTRUCCIÓNML»).
  Los demás bancos están sanos: IDU 163/3 172 y FFIE/INVIAS/EPC <1,5 %, y ahí son unidades legítimas
  raras («jornal», «tf-m», «ML/MES»), no defectos.
- **COBERTURA REAL DEL MAPEO GRANDE: 50 % firme · 50 % revisar · 0 % sin candidato** sobre 28
  descripciones típicas de un formulario de cantidades. La segunda mitad es buena noticia: **los 6 588
  cubren el vocabulario del oficio**; lo que falta no es catálogo, es afinar el corte firme/revisar.
- **COMPETENCIA**: **PresuCosto** (Colombia) declara hacer justo el encargo —lee el pliego con IA
  (Gemini), extrae ítems y cantidades, los mapea a los APU del usuario y **compara el presupuesto
  oficial contra el APU ítem a ítem**—; **LicitIA** compite en gestión (kanban, calculadora AIU, API);
  **OneEstimate** en medición sobre planos. La ventaja de Detekta no puede ser la idea: es la
  **TRAZABILIDAD** (5 bancos oficiales con fuente, vigencia y ámbito + calibración contra un contrato
  adjudicado real, 149/157 al peso) y la cadena de decisión (probabilidad, baja, piso/techo, VEG), que
  ningún competidor de costeo tiene. ⚠️ El proxy de la sesión **bloquea presucosto.com y hubservice.io**
  (EGRESS_BLOCKED): sus funcionalidades salen de resultados de búsqueda, **no verificadas de primera
  mano** — abrirlas desde un navegador normal antes de decidir nada comercial.
- **EL LLM SON DOS DECISIONES, NO UNA.** *Calcular* con LLM sigue siendo NO (el costo debe ser
  determinista y auditable; la decisión del «Nivel C» no se toca). *Leer el pliego* con LLM es una
  decisión ABIERTA —es donde el competidor lo usa y donde Detekta es más débil—, y si algún día se
  toma: fuera de la ruta de la petición, como SUGERENCIA que el usuario confirma, y con el sistema
  funcionando entero sin él. **Recomendación: decidirlo DESPUÉS de cerrar el cable y la comparación**,
  con la cifra de cuánto queda en «revisar» encima de la mesa.
- **Lección de método, cometida en esta misma auditoría**: reporté «0 firmes de 5» por el camino del
  lector leyendo mal el nombre del campo (`codigo_item` en vez de `item_id`); el número real es **2**.
  Es la lección de `transformar` otra vez, en el informe que la cita. Queda corregida en el documento
  y anotada allí a propósito: **comprobar la FORMA que devuelve la función antes de declarar nada**.
