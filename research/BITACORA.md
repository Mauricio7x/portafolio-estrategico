# Bitácora · Base de conocimiento de contratación estatal de obra pública (encargo del 2-oct-2026)

> Para: sesión · Estado: informe fechado · Sustituido por: —

Qué es: el diario de la sesión que construye la base. Se escribe EN EL MOMENTO (no al final): si la
sesión se corta, la siguiente retoma desde la última entrada. Lo que no está aquí no pasó.
Reglas del encargo que gobiernan este diario: ningún punto de control (PC) se pasa sin respuesta del
dueño; entre PC decide la sesión y lo anota aquí; lo que no se abrió no existe; sin datos personales.

## Estado al último asiento

- Fase: 0 (inventario, sin agentes). PC pendiente: PC0.
- Rama de trabajo: `claude/great-cannon-ouop68` (impuesta por el arnés; destino final `main` por PR).

## Asientos

### 2026-10-02 · arranque

- 1. Leído `CLAUDE.md` (auto-cargado). Ejecutados `node tests/mapa.js` (mapa completo), `node tests/estado.js`
  (38 op en 6 routers; 31 pendientes abiertos en la memoria) y `node tests/e2e.js --indice` (105 bloques).
- 2. Decisión propia: la Fase 0 se hace sin agentes, como manda el encargo, aunque la sesión tenga
  orquestación disponible. Los agentes entran en la Fase 1 (piloto).
- 3. Buscados en el repositorio «PROMPT-MAESTRO v3» (el nombre del archivo lleva la grafía antigua de la marca) y su «Anexo A»: NO están en el árbol
  (grep sobre .md/.js/.json). El único «Anexo A» del árbol es `docs/LEGAL_COLOMBIA.md` (frente jurídico
  de la consultoría SaaS del 24-ago-2026) y NO contiene las frases «AIU desglosado» ni «parágrafo 1 del
  art. 30»: no es el Anexo A del encargo. Buscados en Google Drive por título: sin resultado.
- 4. Leídos (parcial, por índices y secciones nombradas): `docs/INVESTIGACION_LICITANTE.md` § 4, 6 y 8
  (completos), `docs/INVESTIGACION_MERCADO_LICITADOR.md` § 5 y 8, `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`
  («Lo que NO se encontró», «Temas pendientes», «Los 5 hallazgos»), `docs/APU_INFORME_COMPLETO.md` § 1.C,
  `docs/PROMPT_INICIAL.md` § 9 y 10, `README.md` § «Qué hace…», «Cómo se ejecuta…» y «Arquitectura»,
  cabeceras de 30 módulos de `lib/` y `lib/requisitos_ley.js` completo. El detalle: `research/INVENTARIO_FASE0.md`.
- 5. Medido: red a 50 portales (tabla en el inventario § 4). SUIN-Juriscol, Función Pública y la SIC fallan
  por certificado (`curl: (60) SSL certificate problem`; WebFetch: `HTTP 503`); Secretaría del Senado,
  SciELO Colombia y tres repositorios universitarios caen con `tunnel closed (code 1006)`. Diario Oficial,
  relatoría y portal de Colombia Compra, Consejo de Estado, Corte Constitucional, datos.gov.co y 9
  repositorios universitarios responden 200. SECOP II público responde 200 solo con agente de navegador.
- 6. Medido: censo de citas normativas del árbol → `research/censo_citas_normativas.tsv` (638 menciones,
  121 normas distintas). Decretos 0997 y 0287 de 2026: 0 menciones en todo el árbol.
- 7. Medido: universo de la muestra en p6dx-8zbt (obra publicada en 2026, por estado y modalidad) e
  índice de documentos dmgg-8hin con los informes de evaluación por nombre de archivo (inventario § 6).
- 8. Decisión propia: los productos intermedios (bitácora, fichas, taxonomía, matriz, censo) viven en
  `research/`, fuera de `docs/`, porque `docs/` exige ficha de cabecera e índice regenerado por cada
  archivo y lo intermedio no es un documento del proyecto. Los entregables finales (índice, un archivo
  por eje, presentación) sí irán a `docs/`. La suite censa igualmente la marca vieja en `research/`
  (lo comprobó la primera vuelta: código 1 por el nombre del prompt maestro escrito con la grafía
  antigua; corregido).
- 9. Decisión propia: identificadores con prefijo propio (`F-###`, `CP-###`, `CR-###`) porque `P-##` y
  `R-##` ya existen en el árbol con otro significado (`research/TAXONOMIA.md § 7`). El dueño puede
  cambiarlo en el PC0.
- 10. Decisión propia: la fecha de corte de la base se fija el día en que termine la verificación
  (Fase 3), no hoy; hasta entonces cada ficha lleva su propia `fecha_consulta`.
- 11. Escritos: `research/TAXONOMIA.md`, `research/fichas/ESQUEMA_FICHA.json` (JSON válido),
  `research/MATRIZ_FASE0.md` (70 temas: 11 cubiertos, 40 a medias, 19 vacíos), `research/INVENTARIO_FASE0.md`.
- 12. Cifras de la Fase 0: fuentes externas abiertas 0 (solo sondeos HTTP y 3 consultas agregadas a
  datos.gov.co); documentos del árbol abiertos 14 (parcial) + 1 módulo completo + 30 cabeceras; fichas 0;
  errores hallados al verificar 3 (el Anexo A no está en el árbol y sus dos errores tampoco; dos grafías
  del Decreto 159 de 2026; el 403 a datos.gov.co de `docs/LEGAL_COLOMBIA.md` ya no se reproduce);
  tiempo ≈ 50 min (02:20 a 03:10 UTC, aproximado); tokens de la sesión ≈ 285 mil según el contador
  (costo en dinero no medible desde aquí: suscripción).
- 13. Pendiente de respuesta del dueño: PC0 (D1 a D5, los documentos que faltan, la rama).
- 14. Suite, segunda vuelta (`node tests/e2e.js 1`, 03:01-03:03 UTC): **código 1**, en una sola
  aserción ajena a este encargo: `tests/e2e.js` espera «hoy, 9:35 a. m.» con espacio normal y
  `public/portada.js` → `toLocaleTimeString("es-CO")` devuelve en este contenedor «a. m.»
  (espacio duro U+00A0). Reproducido fuera de la suite con `node -e` (Node v22.22.0, ICU 77.1,
  CLDR 47). El mismo árbol (`7c4af6f`) está en verde en GitHub (corrida 239 del 1-oct-2026,
  16:48 UTC). Es un fallo de entorno, no de los archivos de esta fase, y es una bomba de tiempo
  para `main` el día que el corredor de GitHub actualice su Node 22. Se anota como decisión D9
  del PC0; no se toca código.
- 15. Commit local de la Fase 0 con la suite en ese estado, dicho tal cual en el mensaje del commit;
  el PR correrá la suite en GitHub, donde el árbol está en verde. Empujado a la rama del arnés
  para que la fase sobreviva al contenedor (D8 lo confirma o lo revoca).

### 2026-10-02 · PC0 respondido por el dueño

- 16. Respuestas: D1 (b) fusión tras su visto bueno en el PC4 · D2 usted primero, HTML autocontenido
  en `docs/` · **D3 (b) obra + consultoría e interventoría** (amplía los ejes 3, 4 y 9 con el concurso
  de méritos y la muestra con esos tipos de contrato) · D4 pesos de partida aceptados · D5 topes
  aceptados (30 fuentes o 4 h-agente por eje de problemas; lista cerrada en los normativos; N
  provisional 40) · D6 (a) sube los documentos que faltan a Drive · D7 (a) `CP-###`/`CR-###` ·
  D8 sí, se empuja la rama tras cada PC · D9 (a) corregir el espacio de «a. m.» en `public/portada.js`.
- 17. Fase 1 (piloto) arranca: ejes 4 y 9 con un agente académico y otro institucional cada uno,
  verificación adversaria por agentes distintos, y 5 procesos de la muestra. Se mide fichas por hora,
  tasa de error al verificar y tokens.
- 18. D9 aplicada (03:10-03:20 UTC): `public/glosario.js` gana `horaCorta(instante)` (Intl es-CO con el
  espacio U+00A0/U+202F normalizado a espacio normal; `null` si no es fecha); `public/portada.js` y
  `public/pulso.js` la llaman en vez de formatear por su cuenta; la suite gana la cerradura que la
  EJECUTA (dos sufijos, fecha ilegible, portada y pulso sin espacio duro) y un censo de
  `toLocaleTimeString` en `public/` con dos excepciones declaradas (`app.js` h24, `pliego.js` h23).
  Mutación: las dos aserciones nuevas caen contra el árbol anterior (2 de 2). Navegador real:
  Chromium 141 headless carga los tres archivos con consola limpia y escribe «9:35 a. m.» con espacio
  normal. Suite completa 4/4 lanzada a las 03:18 UTC (resultado pendiente).
- 19. Piloto lanzado a las 03:12 UTC como un solo flujo y detenido a las 03:27: el contenedor tiene 4 CPU y
  el flujo corre 2 agentes a la vez (10 agentes en fila habrían tardado más de 4 horas). Relanzado a las
  03:28 UTC como tres flujos paralelos: `eje4` (2 lectores con el modelo sonnet → 2 verificadores con el
  modelo de la sesión), `eje9` (2 lectores con el modelo de la sesión → 2 verificadores) y `muestra`
  (5 procesos → recuento adversario de 2). Los 10 minutos del primer lector y de la muestra se pierden;
  los dos lotes de lectores llevan modelos distintos a propósito, para medir la tasa de error por modelo
  (confundida con el eje: se declara).
- 20. D6 cambia (dueño, 03:35 UTC): no sube ningún documento. Queda la opción (c): la base se construye
  sin el prompt maestro v3, su Anexo A ni «los 6 del proyecto»; los dos errores del Anexo A (AIU
  atribuido a la Ley 80; subsanación en un «parágrafo 1 del art. 30») se tratan como afirmaciones a
  verificar en los ejes 3 y 9 y, si el árbol no las contiene, no hay nada que corregir en él.

### 2026-10-02 · PC1 (piloto)

- 21. Los tres flujos terminaron (03:20-04:13 UTC): 85 fichas de 42 fuentes; verificación adversaria del
  100 %: 73 sostiene, 5 parcial, 2 no sostiene; muestra 5 procesos y recuento 18/21. Tokens de agentes
  2.857.823. Cifras, premisas corregidas y decisiones en `research/PC1.md`.
- 22. Decisiones propias aplicadas: esquema de ficha v2 (`url_final`, `pagina_pdf`, `anio_origen`,
  `cifra_comprobada`, `reformas_cotejadas`, vocabulario del resultado, excepción de autoría
  bibliográfica, prohibición de vigencia «verificada» con la página no consolidada de la relatoría);
  eje «muestra» en la taxonomía; § 4 bis de las instrucciones; URL de F-029 sustituida por la final.
  Las 7 fichas con reparo quedan con su resultado y se rehacen en la Fase 2.
- 23. Hallazgo que cambia el método: la página «Decreto 1082 de 2015» de la relatoría de Colombia Compra
  transcribe el texto original en artículos ya reformados; los consolidados oficiales no responden desde
  aquí (SUIN, Función Pública, síntesis de CCE y DNP: certificado o túnel cerrado, medido 04:15 UTC).
  Se cotejan las reformas una a una (la relatoría sí sirve cada decreto modificatorio).
- 24. Pendiente de respuesta del dueño: PC1 (D10 a D14).

### 2026-10-02 · PC1 respondido por el dueño

- 25. Respuestas (04:25 UTC): D10 N = 40 estratificada por modalidad · D11 (a) lectores con sonnet,
  verificadores con el modelo de la sesión · D12 (b) 40 fuentes por eje de problemas con regla de
  saturación · D13 (a) las 7 fichas con reparo se rehacen en la Fase 2 y se vuelven a verificar ·
  D14 (a) prohibidos los POST hacia fuera.
- 26. Fase 2 arranca: 18 lectores (9 ejes × 2 lentes), 60 ids por lector (`F-0101` en adelante; el id
  admite 3 o 4 dígitos), sin verificación (la Fase 3 va después del PC2); muestra de 40 con el
  muestreador por estratos de modalidad (10 licitaciones, 10 menores cuantías, 10 mínimas, 10 concursos
  de méritos; al menos 8 interventorías y 8 consultorías), semilla `fase2-2026-10-02`.
- 27. Muestra de 40 sacada (semilla `fase2-2026-10-02`, 04:26-04:30 UTC): 189 expedientes revisados, 149 sin
  informe en el índice, 40 tomados: 10 por grupo de modalidad (licitación, menor cuantía, mínima
  cuantía, concurso de méritos); 21 obra, 10 interventorías, 9 consultorías; 17 departamentos.
  `research/muestra_secop/muestra_fase2.json`.
- 28. Fase 2 lanzada (04:33 UTC): cinco flujos de lectura (ejes 1-2, 3-4, 5-6, 7-8 y 9; 2 lectores por eje
  con sonnet, 60 ids cada uno, listas en `research/FASE2_EJES.md`) y la muestra en lotes de 10 (lotes 1
  y 2 ahora; 3 y 4 cuando bajen los flujos de lectura: el contenedor tiene 4 CPU). Sin verificación:
  la Fase 3 va después del PC2.

### 2026-10-02 · corte por límite de la sesión y reanudación (13:25 UTC)

- 29. Los 12 agentes de la Fase 2 cayeron a los 27-30 minutos con «You've hit your session limit · resets
  7:10am (UTC)» (dos con «rate limit»); solo terminó el lector académico del eje 5 (51 fichas y notas).
  Quedaron en disco, válidas: eje 1 académico 55 fichas, eje 3 institucional 15, eje 3 académico 60,
  eje 5 institucional 60, eje 7 académico 60, muestra 10 procesos del lote 1 y 6 fichas. Tokens de
  agentes gastados en el intento: ≈ 5,7 millones.
- 30. Decisión propia: se reanuda por olas de 4 lectores (dos flujos a la vez) en vez de 12 a la vez, para
  no volver a tocar el límite; los lectores no sobrescriben lo que ya hay en su rango y continúan desde
  el primer id libre; los de rango lleno solo escriben notas y evalúan la cobertura.
