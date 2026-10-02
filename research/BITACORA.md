# Bitácora · Base de conocimiento de contratación estatal de obra pública

> Para: sesión · Estado: informe fechado · Sustituido por: —

Encargo del dueño del 2-oct-2026 (sesión `claude/stoic-lamport-slvr9d`). Se retoma desde aquí si la
sesión se corta: cada entrada dice qué se hizo, qué se decidió entre puntos de control y por qué.
Hora en UTC: medida con `date -u` desde 02:45; las anteriores son aproximadas (arranque medido: 02:38).

## Fase 0 · Inventario (sin agentes)

- **02:38** · Arranque. `node tests/estado.js` (código 0): 6 routers, 38 `op` en los mapas, 31
  pendientes abiertos en la memoria. Rama `claude/stoic-lamport-slvr9d` sobre `7c4af6f` (main tras #237).
- **02:40** · Búsqueda del PROMPT-MAESTRO v3 (el nombre del archivo que cita el encargo lleva la grafía vieja de la marca, con «c»; aquí se escribe sin ella porque la suite la prohíbe en todo el árbol) y su Anexo A: no está en el árbol (grep de
  «PROMPT-MAESTRO», «AIU desglosado»; `git log --all -S`), ni en Drive (búsqueda por título
  «PROMPT», «Maestro», la marca con la grafía vieja y con la nueva, «Anexo»; por texto «AIU desglosado»). El único «Anexo A» del árbol
  es `docs/LEGAL_COLOMBIA.md` («Anexo A · Frente jurídico y regulatorio»), y NO contiene «AIU» ni
  «parágrafo»: no es el Anexo A que cita el encargo. → Faltante para el PC0.
- **02:45** · Drive (cuenta del dueño): la carpeta «P1_Analisis_Precontractual» tiene exactamente 6
  documentos de Google (01_NORMATIVA_Y_DOCTIPO: índice normativo, subsanabilidad, capacidad
  residual, desempate; 03_PLANTILLAS: checklist y plantilla de informe). **Inferencia**: son «los 6
  del proyecto». Leídos completos con `read_file_content`. Lo confirma o lo desmiente el dueño.
  Afirmaciones de esos 6 que se marcan para la Fase 3 (sin verificar en texto oficial): «hasta 19
  puntos» del factor de calidad; «umbral orientador 20 % por debajo del presupuesto» para la oferta
  artificialmente baja; «parágrafo 3 del art. 5 de la Ley 1150» para la garantía de seriedad; traslado
  de 3 días en concurso y «mínimo 1 día» en mínima cuantía; Resolución 465 de 2024 como la que adopta
  la v4 de transporte; Decreto 287 de 2026 con `norma.php?i=273496`; CT con rangos 20/30/40.
- **02:45** · Prueba de red (solo código de respuesta, sin leer contenido), con fecha 2-oct-2026:
  colombiacompra.gov.co (relatoría, normativa, providencias, documentos tipo, guías, boletines,
  release del SECOP) 200; formacionvirtual 200; el ABC del Decreto 0997 de 2026 200 (PDF, 8,2 MB) y
  la Guía UNSPSC V3 2026 200 (PDF, 0,57 MB) — existen en esas URL, **no leídos aún**; datos.gov.co
  200; youtube.com 200; repositorio.uniandes 200. **Gestor Normativo de Función Pública y
  SUIN-Juriscol**: error TLS «unable to get local issuer certificate» porque el servidor manda un
  intermedio equivocado (Función Pública envía el «Domain Validation» y su hoja la firma el
  «Organization Validation»). **Resuelto sin desactivar la verificación**: se baja el intermedio de
  la URL oficial de su propio certificado (AIA `crt.sectigo.com`) y se usa `--cacert` con el
  paquete del proxy más ese intermedio → Función Pública 200 (Decreto 1082 de 2015, `i=77653`,
  1,7 MB; `i=273496` 200), SUIN 301 (TLS ya pasa). scielo.org.co: conexión reiniciada (sin
  resolver). community.secop.gov.co: 403 en la raíz y en OpportunityDetail (cortafuegos de Azure del
  propio SECOP, ya documentado el 25-sep), pero `Public/Archive/RetrieveFile` con GET responde 200
  con el PDF (probado con un pliego definitivo de CO1.BDOS.10507235, descartado a /dev/null).
  → La muestra de informes de evaluación es viable por `dmgg-8hin` + `RetrieveFile`.
- **02:45** · Censo por regex de citas normativas en `docs/` (sin archivo), `lib/`, `public/`, `api/`,
  README y CLAUDE.md: 253 archivos, 1.068 menciones, 283 claves distintas (norma o artículo; cota
  inferior: el regex no ve «art. 30 de la Ley 80» como clave propia). Los que más: APU_INFORME_COMPLETO
  340, DON_HECTOR 116, MEMORIA 87, GUIA_ANALISTA 71, PROPONENTE_PLURAL 46. Dimensiona la Fase 3.
- **02:45** · Los dos errores del Anexo A que cita el encargo («AIU desglosado obligatorio» atribuido
  a la Ley 80; subsanación en un «parágrafo 1 del art. 30») **no aparecen** en ningún `.md` del
  árbol (grep). Están en el Anexo A que no está en el árbol. Lo que sí hay cerca: `lib/apu/rentabilidad.js`
  dice «pliego tipo obligatorio por la Ley 1882 de 2018, art. 4, modificado por la Ley 2022 de 2020»
  y `APU_INFORME_COMPLETO` § 2.C dice «La Ley 1882 de 2018 adicionó al art. 30 de la Ley 80…»:
  ambas van a la Fase 3.
- **02:45** · Decreto 0997 de 2026: **cero menciones** en el árbol. Decreto 287 de 2026: 2 menciones
  (`ATRACTIVIDAD.md`, `PROPONENTE_PLURAL.md`). Versión del clasificador UNSPSC: cero menciones.
- **02:48** · Comprobación de premisa del encargo (no es ficha todavía; el formato se fija en el PC1):
  Ley 80 de 1993 en el Gestor Normativo (`norma.php?i=304`, 200, consultado el 2-oct-2026): el
  art. 30 trae un «PARÁGRAFO.-» sin número (definición de licitación pública) y la línea «PARÁGRAFO
  2 Y 3 (Adicionados por el art. 1 de la Ley 1882 de 2018)», sin el texto en línea. Ley 1882 de 2018
  (`norma.php?i=84899`, 200), art. 1: «Adiciónense los parágrafos 2 y 3 del artículo 30 de la Ley 80
  de 1993»; el parágrafo 3 dice, para «licitación pública para seleccionar contratistas de obra
  pública», que el informe «permanecerá publicado en el Secop durante cinco (5) días hábiles» y que
  en la audiencia «se evaluara la oferta económica a través del mecanismo escogido mediante el método
  aleatorio que se establezca en los pliegos de condiciones». → La premisa del encargo se sostiene.
  Matiz para la base: el parágrafo 3 habla solo de licitación pública de OBRA; el método aleatorio
  en menor cuantía sale del documento tipo, no de este parágrafo (a verificar en el eje 3/9).
- **02:52** · `research/INVENTARIO_F0.md` escrito (documentos, código, restricciones, taxonomía,
  borrador de ficha, matriz de 58 temas). **Error propio hallado al verificar**: el párrafo de lectura
  de la matriz se escribió con conteos a mano («57 temas… cubierto 6… vacíos dobles ocho»); contados
  con código salen 58 temas, conocimiento 5/40/13, producto 8/27/18/5 n. a., y seis vacíos dobles.
  Corregido. Lección para las fases siguientes: ningún conteo de la base se escribe sin el guion que
  lo cuenta (va al validador de la Fase 3).
- **02:54** · Releída la matriz como adversario: tres frases decían más de lo medido («las descargas de
  SECOP II dan 200» → una descarga probada; «sin texto leído en el árbol» → no comprobado;
  `docs/datos.md` «mediciones con fecha» → no abierto aquí). Corregidas. La línea del costo fijo de
  $5.000.000 se movió: hoy es `C_PREPARACION_DEFECTO` en `lib/apu/rentabilidad.js:89` (el pendiente
  del 26-sep dice `:84`).
- **02:54** · Colisión de identificadores: el árbol ya usa «R-02…R-15» (6 documentos, p. ej.
  `docs/INVESTIGACION_MERCADO_LICITADOR.md`) y «P-02…P-12» (3 documentos). Los P-### / R-### del
  encargo se confundirían con ellos (regla «Dos cosas distintas no pueden tener nombres parecidos»).
  → Decisión del dueño en el PC0 (D6).
- **02:54** · Decisiones de la sesión en la Fase 0 (detalle en `research/INVENTARIO_F0.md` § 9):
  «¿con quién?» dentro de D1; campo `naturaleza` (normativa / empírica / práctica); la base cita y
  reverifica los documentos de dominio del árbol en vez de reescribirlos; los problemas llevan su N-xx
  cuando existe; los archivos por eje irán en `docs/contratacion/`.
- **02:54** · **PC0**: se detiene el trabajo hasta la respuesta del dueño. Siguiente paso si aprueba: el
  piloto (ejes 4 y 9 + 5 procesos con sorteo reproducible).
- **02:57** · Suite `node tests/e2e.js 1` (02:54-02:56) en **rojo, código 1**: «✘ FALLO: la marca vieja
  volvió a aparecer en: research/BITACORA.md, research/INVENTARIO_F0.md». Causa: el nombre del archivo
  del encargo lleva la grafía vieja de la marca y la suite la prohíbe en todo el árbol, sin
  excepciones. Arreglo: se nombra «PROMPT-MAESTRO v3» y se dice una vez por qué. Regla para los
  agentes de las fases siguientes: nunca escribir esa grafía, ni en fichas ni en citas.
- **03:05** · Segunda vuelta `node tests/e2e.js 1` (02:57-03:00): **rojo, código 1**, otra causa:
  `tests/e2e.js:34640` espera «hoy, 9:35 a. m.» con espacio normal y `public/portada.js`
  (`textoActualizado`, que usa `toLocaleTimeString("es-CO")`) devuelve «a.\u00A0m.» con este Node
  (v22.22.0, ICU 77.1, CLDR 47.0). Reproducido con `node -e` sin pasar por `research/`. La suite
  de GitHub sobre el mismo `7c4af6f` salió «success» (run 36893559325, 1-oct-2026): es de este
  contenedor. Diagnóstico: con un parche **fuera del repo** que normaliza U+00A0/U+202F en las
  fechas (`node -r …/icu_parche.js tests/e2e.js 1`, 03:01-03:04) cierra «TODAS LAS ITERACIONES
  PASARON (1/1)». Hermanas frágiles: `:34640` y `:34641` (la de `:3646` pasó). Riesgo para
  `main`: se pone rojo el día que GitHub suba a un Node con este ICU (versión de GitHub sin
  verificar). No se toca la prueba sin visto bueno (el encargo solo deja implementar el validador):
  va al PC0 como D9.
- **03:05** · Commit a la rama (no a `main`, sin PR) solo con `research/*.md`, declarando en el mensaje
  el rojo ambiental y la vuelta verde con el parche de diagnóstico.

## PC0 · respuesta del dueño

- **03:10** · El dueño acepta las recomendaciones D1 a D9 y ordena el piloto. Queda fijado:
  D1 fusión del PR de la base tras su visto bueno en el PC4, con empuje a la rama en cada PC ·
  D2 presentación para el dueño, HTML autocontenido en `docs/` y además página privada de
  claude.ai · D3 solo obra, más una tabla corta «qué cambia si es interventoría o consultoría» ·
  D4 pesos en el PC3 (borrador 35/25/20/20 menos costo y riesgo) · D5 lo normativo termina con su
  lista cerrada; lo de problemas, tope provisional de 40 fuentes por eje y saturación con las 10
  últimas de ≥ 2 tipos; el tope definitivo, en el PC1 · D6 identificadores CE-F-####, CE-P-###,
  CE-R-### · D7 el dueño sube a Drive o pega el PROMPT-MAESTRO v3 y su Anexo A (no lo ha hecho
  aún: se vuelve a buscar) · D8 los 6 de Drive son «los 6 del proyecto» (aceptado con la
  recomendación) · D9 PR aparte, ya, con el arreglo de las dos aserciones de hora.

## Fase 1 · Piloto

- **03:19** · D9: rama aparte `claude/suite-hora-icu` desde `origin/main` (worktree `../wt-hora`). Las dos
  aserciones comparan tras normalizar U+00A0/U+202F (`sinEspacioDuro`). Mutación fuera del repo:
  con `textoActualizado` devolviendo «ayer» para hoy, o con la hora en UTC, las aserciones FALLAN;
  con el original, PASAN. Suite 4/4 en curso.
- **03:19** · Sorteo de la muestra (`research/muestra/sorteo.js`, semilla «detekta-ce-2026-10-02»):
  universo 4.115 expedientes (9.637 filas de p6dx-8zbt: obra, Estatuto General con competencia,
  aviso 1-ene a 30-sep-2026, estado Seleccionado o Evaluación). Revisados 16 en orden: 11 sin un
  archivo cuyo nombre diga «informe» y «evaluación» (sesgo a declarar: puede haber informe con otro
  nombre). Escogidos 5: 4 de menor cuantía y 1 de mínima; ninguno de licitación.
- **03:19** · Decisión de la sesión: una ficha por par (documento, localizador), no una por documento:
  así cada cita se reabre sola. Los «documentos abiertos» se cuentan aparte de las fichas.
- **03:19** · Listas cerradas de los ejes 4 (L4-01 a L4-16) y 9 (L9-01 a L9-15) en
  `research/LISTAS_CERRADAS.md`, armadas desde el índice del Decreto 1082 consolidado (219
  artículos 2.2.1.*) y el control de versiones de los documentos tipo de CCE. Hallazgo: el
  consolidado de Función Pública trae el Decreto 0287 de 2026 y no el 0997 de 2026.
- **03:19** · Instrucciones comunes en `research/PILOTO_INSTRUCCIONES.md`; chequeo de forma en
  `research/muestra/chequeo_fichas.js` (probado: ficha válida 0 hallazgos, ficha mala 19).
- **03:19** · Lanzado el flujo del piloto (`wf_5348f120-ee4`): 4 lectores (eje 4 y 9, institucional y
  académico, rangos CE-F-0001..0799), 1 agente de muestra (CE-F-0800..0899), y por cada uno un
  verificador adversario sobre una muestra reproducible (FNV-1a con semilla, 30 % con mínimo 4; en la
  muestra SECOP, 40 % con mínimo 2 procesos recontados a ciegas).
- **03:20** · D9 cerrado del lado de la sesión: suite 4/4 en la rama del arreglo («TODAS LAS
  ITERACIONES PASARON (4/4)»), commit `6474f0c`, PR
  https://github.com/Mauricio7x/portafolio-estrategico/pull/238 con fusión automática activada y
  suscripción a sus eventos. Cuando entre a `main`, se fusiona `main` en la rama de la base.
- **03:31** · Hallazgo de orquestación: el contenedor tiene 4 procesadores y cada flujo corre como mucho
  2 agentes a la vez (tope = procesadores − 2). Con 10 agentes en fila el piloto tardaba unas 4 h.
  Decisión: detener `wf_5348f120-ee4` a las 03:30 (había escrito 9 fichas, CE-F-0200..0208, del
  lector académico del eje 4; pasan el chequeo de forma) y relanzar el mismo guion en tres flujos
  paralelos por grupo (eje4 `wf_0adab179-1f3`, eje9 `wf_7b28569e-5ef`, muestra `wf_2304aa1d-8a6`),
  con la orden de conservar lo heredado y seguir desde el siguiente id libre. Para medir el ritmo del
  lector académico del eje 4 se suman sus ~14 min del primer intento (03:16-03:30). Pesa para la
  Fase 2: 18 lectores con 2 por flujo exigen varios flujos en paralelo.
- **03:31** · Commit `d423b91` (piezas del piloto) con la suite 4/4 en verde, tras fusionar en la rama la
  del arreglo D9.
- **03:32** · #238 fusionado en `main` (check «Suite» success, 03:20-03:29; fusión 03:29:43). D9 terminado.
- **03:42** · Avance: 47 fichas, 0 hallazgos de forma. Lectura de control de la sesión (no es la
  verificación): CE-F-0001 trae el texto del Decreto 0997 de 2026 de Presidencia (4-ago-2026, PDF
  escaneado con OCR, cotejado), CE-F-0604 una monografía de la UNAD sobre AIU, CE-F-0800 el informe de
  un proceso con un piso de precio artificialmente bajo del 90 % del presupuesto. Nota para el PC1: el
  «problema_candidato» de CE-F-0800 dice «y rechaza», más que su cita → los problemas candidatos no
  entran al catálogo sin verificarse.
- **04:01** · Terminaron los tres flujos: muestra (2 agentes, 16 min, 319.028 tokens de subagentes),
  eje 9 (4 agentes, 24 min, 832.097) y eje 4 (4 agentes, 30 min, 868.965). Total de subagentes de
  los tres: 2.020.090 tokens; el flujo detenido no dejó salida con su consumo (no medido).
- **04:06** · Métricas contadas con `research/muestra/metricas_piloto.js` (salida en
  `research/muestra/metricas_piloto.json`): 155 fichas, 66 documentos distintos, 0 hallazgos de forma;
  verificación al azar: 8 de 46 fallan (17,4 %, IC 95 % 9,1-30,7), todas «no_sostiene»; por lote
  eje4-institucional 3/14, eje4-académico 4/9, eje9-institucional 0/14, eje9-académico 1/9. Las
  31 entradas de las listas cerradas tienen ficha. Ningún eje de problemas saturó. Recuento a ciegas
  de 2 procesos de la muestra: coincide en todo salvo una subsanación «sin dato» (lector) frente a 0
  (verificador); vale el «sin dato».
- **04:06** · Decisión de la sesión: se corrigen ya las 8 fichas que fallaron, estrechando la afirmación
  a su cita (sin ampliar citas, que exigiría releer) y llevando a `advertencia` lo que la cita no
  cubre; las 46 verificadas guardan su veredicto en `revisiones`. Las dos fichas de la Circular
  Única de la SIC pasan de `circular_cce` a `circular_otra` (tipo nuevo). Ajustes de ficha,
  taxonomía y umbrales en `research/PILOTO_INSTRUCCIONES.md` § 5.
- **04:06** · Los tres lotes con error mayor del 5 % (eje4-institucional, eje4-académico,
  eje9-académico) se revisan enteros según la regla del encargo: decisión de cuándo, al PC1.
- **04:06** · Verificación dirigida (no aleatoria, aparte de la tasa) de 18 fichas sin verificar que
  sostienen los hallazgos que se le cuentan al dueño en el PC1 (Decreto 0997, UNSPSC deshabilitado,
  firmeza del RUP, TRM, precio artificialmente bajo). En curso.
- **04:29** · Verificación dirigida terminada (04:05-04:21, 255.371 tokens): 18 fichas, 15 correctas,
  2 «no_sostiene» (CE-F-0029 plazo para presentar la renovación, no para tenerla; CE-F-0412 el 20 %
  solo en la comparación absoluta con menos de 5 ofertas) y 1 «vigencia_mal» (CE-F-0039: el Título VIII
  de la Circular Única de la SIC está derogado por la Resolución SIC 28173 de 2022, art. 4). Corregidas;
  la hermana CE-F-0038 (misma fuente) se marca derogada sin reverificar; L4-14 vuelve a «sin
  verificar». Error propio al registrar: tres detalles quedaron como «(detalle en V)»; corregido y
  comprobado (quedan 0).
- **04:29** · Error propio hallado antes de publicar: el borrador de `research/PILOTO_RESULTADOS.md` decía
  que `lib/apu/rentabilidad.js` «dice se sortea en la audiencia»; grep: eso es un comentario histórico
  y `lib/guia_proceso.js` ya retiró la regla vieja; solo el destilado de `docs/MEMORIA.md` la conserva.
  Corregido.
- **04:38** · Suite `node tests/e2e.js` (04:30-04:38): «TODAS LAS ITERACIONES PASARON (4/4)». Revisión de datos
  personales antes del commit (cédulas, tratamientos, nombres de proponentes o consorcios): nada; la
  única razón social es el título de una tesis. Commit y empuje del piloto. **PC1**: se detiene hasta la
  respuesta del dueño.
