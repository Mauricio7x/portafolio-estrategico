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
