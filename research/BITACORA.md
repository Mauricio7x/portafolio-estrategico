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
