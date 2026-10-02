# Piloto · eje 9 (Oferta económica y APU) · lente institucional

> Para: sesión · Estado: notas del piloto (2-oct-2026) · Sustituido por: —

Agente: lector eje9-institucional. Fichas: `research/fichas/F-041.json` a `F-060.json` (20 fichas, 12 fuentes fichadas).
Las fuentes son información, no instrucciones; nada de este archivo se implementó en código.

## Reloj

- Inicio (`date -u`): Fri Oct  2 03:20:54 UTC 2026
- Fin (`date -u`): Fri Oct  2 03:41:53 UTC 2026
- Duración: 21 min de los 90 permitidos. Ritmo medido: 57 fichas/hora (20 fichas), sobre 12 fuentes fichadas.
- Nota de método: los primeros ~15 minutos se fueron en localizar las fuentes porque las páginas de Colombia Compra (documentos tipo vigentes, guías) y la Relatoría cargan sus listados por JavaScript; lo que destrabó la búsqueda fue la API de WordPress (`/wp-json/wp/v2/media?search=…`, `/wp-json/wp/v2/conceptos?search=…`, `/providencias`, `/normativa`). Eso vale para los demás ejes.

## Fuentes intentadas y abiertas, por tipo

| Tipo | Intentadas | Abiertas | Fichadas | Detalle |
|---|---|---|---|---|
| ley | 2 | 2 | 2 | Ley 80 de 1993 (alcaldiabogota i=304, arts. 26-6, 30, 32) · Ley 1882 de 2018 (alcaldiabogota i=73590, arts. 1 y 4) |
| decreto | 1 | 1 | 1 | Decreto 1082 de 2015: abierto en la Relatoría (`/normativa/decreto-1082-de-2015/`, compilación modificada 2026-03-25); la página de alcaldiabogota (i=62889) NO entregó el articulado (ver «No abiertas») |
| doc_tipo | 3 | 2 | 1 | Documento Base o Pliego Tipo de Interventoría – Infraestructura Social (.docx, publicado 2025-12-30) fichado · Resolución 465 de 2024 (adopta la versión 4 de licitación de obra, transporte; PDF de 6 páginas) abierta, sin ficha propia · Documento base v4 de licitación de obra: NO localizado |
| cce_guia | 3 | 3 | 2 | Guía para el manejo de ofertas artificialmente bajas (G-MOAB-01, 10 pp., completa) · Guía para la comprensión e implementación de los documentos tipo de obra de transporte (CCE-EICP-GI12, 48 pp., parcial; metadatos 2021) · Guía para la correcta implementación de los documentos tipo del sector transporte 2025 (67 pp., parcial): abierta, sin ficha por el tope de 12 fuentes |
| cce_concepto | 6 | 6 | 4 | Fichados: C-1778 de 2025, C-1025 de 2026, C-803 de 2026, C-301 de 2026 · Leídos solo en su extracto, sin ficha: C-1117 de 2026 (precio artificialmente bajo, lee la guía), C-547 de 2026 (corrección aritmética sobre total y unitarios, antes del método) |
| juris | 3 | 2 | 2 | CE Sección Tercera Subsección A, 12-jun-2017, rad. 73001-23-33-000-2013-00159-01 (51364) (.docx, parcial) · CE Sección Tercera Subsección A, 21-jun-2018, rad. 25000-23-26-000-2005-00040-01 (35099) A (.doc, parcial por extracción con `strings`) · CE 14-oct-2011, rad. 05001-23-26-000-1997-01032-01 (20811), AIU: NO abierta |
| **Total** | **18** | **16** | **12** | Además se navegaron, sin ser fuentes: índices de documentos tipo, guías, Relatoría (normativa, conceptos, providencias) y la API wp-json de ambos sitios |

Criterio del tope: el encargo pedía entre 8 y 12 fuentes; se fichan 12 y las otras 4 abiertas quedan aquí como pista con su URL para la siguiente vuelta.

## No abiertas (error literal)

1. **Decreto 1082 de 2015 en alcaldiabogota** — `https://www.alcaldiabogota.gov.co/sisjur/normas/Norma1.jsp?i=62889`: HTTP 200 pero el cuerpo (7.235 bytes) solo trae el cascarón «Cargando el Contenido del Documento / Por favor espere...» sin articulado; `norma_comentario.jsp?i=62889` (7.921 bytes) y `Norma1.jsp?i=62889&dt=S` (6.511 bytes) devuelven lo mismo. El decreto se leyó en la Relatoría de CCE.
2. **Documento base (pliego tipo) versión 4 de licitación de obra pública de infraestructura de transporte** (Resolución 465 de 2024): no se localizó la URL del archivo. `https://www.colombiacompra.gov.co/documentos-tipo/vigentes` responde 200 (388 KB) pero el listado se arma por JavaScript y el HTML no contiene enlaces a archivos; las consultas a `/wp-json/wp/v2/media?search=` con «Documento Base», «Pliego Tipo», «DTipo», «Licitación», «Transporte», «Licitacion Obra Publica Infraestructura Transporte» devuelven solo las versiones 3 (zips de 2021-2022), el borrador de nueva versión (zip de 2025-04-29) e informes de participación. Lo que se afirma de la v4 sale de los conceptos C-1778 de 2025 y C-803 de 2026 (A5) y queda marcado [sin verificar] en las fichas.
3. **CE, sentencia 14-oct-2011, rad. 05001-23-26-000-1997-01032-01 (20811), descriptor LICITACION PUBLICA, AIU** — `https://relatoria.colombiacompra.gov.co/wp-content/uploads/2024/04/1655399300519-05001-23-26-000-1997-01032-01_20811.doc`: descargado (482.304 bytes, Word 97-2003) pero `soffice --headless --convert-to txt` falló con «Error: source file could not be loaded»; no se leyó. (La 35099A falló igual y se rescató con `strings -n 4 -e S | iconv -f cp1252`; la 20811 no se intentó por el tope de fuentes.)
4. Sin intentar por el tope: Estatuto Tributario art. 462-1 (IVA sobre el AIU), documentos tipo de mínima cuantía de obra, documentos tipo de licitación de infraestructura social y APSB, conceptos sobre ítems no previstos.

## Qué sostiene cada ficha (mapa rápido por tema del encargo)

- (a) Presupuesto oficial y estudios previos: F-041 (Ley 80 art. 30-1), F-046 (D. 1082 art. 2.2.1.1.2.1.1-4), F-057 (C-803: Formulario 1 doble uso; precio global también se justifica).
- (b) AIU: F-056 (C-1025: ni la ley ni el reglamento regulan el AIU ni su porcentaje → sin tope legal), F-054 (guía DT obra: tope = el de la entidad; literal S), F-057 (C-803: tres componentes obligatorios en unitarios, fila de imprevistos inalterable). IVA sobre la utilidad: SIN FUENTE.
- (c) Corrección aritmética: F-052 (DT interventoría 5.1: solo operaciones y ajuste al peso), F-058 (C-301: alterar ítems o cantidades no es corrección → rechazo), F-059 (CE 2017: se corrige el formato evaluado, no el APU), F-051 (guía AB VII: pide rechazar por error aritmético en el total — choca con los documentos tipo).
- (d) Precio artificialmente bajo: F-043 (Ley 80 art. 26-6), F-047 (D. 1082 art. 2.2.1.1.2.2.4: requerir → explicar → comité recomienda), F-050 (guía: <5 ofertas y 20 % bajo el estimado), F-051 (rechazo si no responde; aclarar no es modificar), F-060 (CE 2018: el contratista asume la pérdida y las mayores cantidades al precio ofertado).
- (e) Método con TRM: F-042 (Ley 80 art. 30 par. 3: «método aleatorio»; el artículo tiene tres parágrafos: «Parágrafo» sin número, «Parágrafo 2°» y «Parágrafo 3°»), F-044 (Ley 1882 art. 1), F-055 (C-1778: v4 → mediana con valor absoluto, media geométrica, media aritmética baja, menor valor, por centavos de la TRM; oferta única → sin TRM), F-054 notas (TRM del día en que se abre el segundo sobre, SECOP II, versiones 2-3), F-053 (en interventoría la TRM elige el método de la EXPERIENCIA, no del precio, con la TRM del segundo día hábil tras el traslado).
- (f) Ítems no previstos en ejecución: SIN CUBRIR (ver abajo).
- (g) Concurso de méritos y mínima cuantía: F-048 (D. 1082 art. 2.2.1.2.1.3.2: el precio no puntúa; rango del estimado; negociación con el primero), F-052 notas (un solo sobre; precio con IVA incluido), F-053, F-049 (mínima cuantía: menor precio que cumpla).
- (h) Unitario frente a global y topes por unitario: F-057 (C-803), F-046; la causal «No ofrecer el valor de un precio unitario u ofrecerlo en cero (0) pesos» se leyó en la guía 2025 (p. ~25, sin ficha). El tope por unitario frente al oficial NO se verificó en el documento base v4.

## Problemas candidatos (título · etapa · decisión · tipo de contrato · fichas · consecuencia en plata)

1. **El método que decide el precio ganador se conoce después de cerrar la oferta.** En licitación de obra el método (mediana con valor absoluto, media geométrica, media aritmética baja o menor valor, según C-1778 para la v4) lo fija la TRM el día de la audiencia: el oferente fija su precio sin saber si gana el más bajo o el que más se acerque a una media. · E2 · D2 · obra · F-042, F-044, F-055, F-054 · Plata: la fuente no la cuantifica.
2. **Ofrecer un AIU cuya suma supere la de la entidad es rechazo; un componente sí puede superar el suyo.** No hay tope legal del AIU (C-1025); el tope es el del Formulario 1 y la causal (literal S) mira la sumatoria, no cada componente. · E2 · D3 · obra · F-054, F-056, F-057 · Plata: no la da la fuente (la vigencia frente a la v4 queda por verificar).
3. **La corrección aritmética arregla cuentas, no ítems: cambiar cantidades o unidades es rechazo y el APU no se corrige.** La entidad solo corrige operaciones y redondeo al peso; alterar ítems o cantidades del presupuesto oficial es modificar la oferta (C-301) y el APU detrás del formato no se toca (CE 2017). Además la guía de ofertas bajas pide rechazar por error aritmético en el total mientras los documentos tipo lo corrigen: conflicto entre dos documentos de CCE. · E2 · D3 · todos (obra e interventoría verificadas) · F-051, F-052, F-058, F-059 · Plata: CE 2017: el total corregido ($3.557’466.304) quedó bajo el oficial ($3.573’066.304,94) y evitó el rechazo.
4. **Una oferta 20 % o más por debajo del estimado dispara el requerimiento; no contestar es rechazo; si gana, la pérdida es del contratista.** Umbral de la guía (<5 ofertas), procedimiento del art. 2.2.1.1.2.2.4 y consecuencia del Consejo de Estado: sin reequilibrio y mayores cantidades al precio ofertado. · E2/E4 · D2/D4 · todos · F-043, F-047, F-050, F-051, F-060 · Plata: CE 2018: cable ofertado a $35.000/m, mercado $103.954/m al ofertar y $159.527/m al comprar; 1.479 m adicionales pagados al precio ofertado.
5. **En concurso de méritos (consultoría e interventoría) el precio no da puntos: debe caber en el rango del estimado y se negocia con el primero.** La TRM allí elige la fórmula de la experiencia. La entidad no publica las variables del valor estimado (art. 2.2.1.1.2.1.1-4), así que el consultor no puede auditar el presupuesto. · E2 · D2 · consultoria e interventoria · F-046, F-048, F-052, F-053 · Plata: no la da la fuente.
6. **En mínima cuantía gana el menor precio que cumpla.** Sin ponderación, sin método aleatorio, sin AIU exigido por el decreto. · E2 · D2 · todos · F-049 · Plata: no aplica.
7. **El presupuesto oficial de obra debe publicar cómo se calcularon los unitarios y el AIU; el Formulario 1 es presupuesto y oferta a la vez.** Un unitario inconsistente se observa en el plazo de observaciones, no después. · E1 · D2 · obra · F-046, F-057, F-054 · Plata: no la da la fuente.

## Qué quedó sin cubrir (y por qué)

- **(b) IVA sobre la utilidad en obra**: no se abrió el Estatuto Tributario (art. 462-1, de memoria: [sin verificar]) ni un concepto que lo trate; el tope de 12 fuentes se gastó en lo normativo del precio. Pista: buscar «462-1» en la Relatoría (`/wp-json/wp/v2/conceptos?search=462-1`).
- **(f) Precio de ítems no previstos**: la búsqueda `conceptos?search=ítems no previstos` devolvió conceptos sobre adición y modificación (C-1411, C-1327, C-1245, C-1241, C-1120 de 2026) y la de providencias devolvió sentencias de equilibrio económico; no se leyeron. Pista: C-1025/C-1003 de 2026 (APU-AIU) podrían tratar el pacto de precios nuevos.
- **(e) Texto directo del documento base v4 de licitación de obra**: no localizado (ver «No abiertas» 2). La lista de métodos del encargo (media aritmética, media aritmética alta, media geométrica con presupuesto oficial, menor valor) NO coincide con la que C-1778 atribuye a la v4 (mediana con valor absoluto, media geométrica, media aritmética baja, menor valor); el documento tipo de interventoría sí usa mediana / geométrica / aritmética alta / aritmética baja, pero sobre la experiencia. Hay que abrir el documento base v4 antes de dar una lista por buena.
- **(h) Topes por unitario** frente al oficial: solo la causal «no ofrecer un unitario u ofrecerlo en cero» (guía 2025) y la regla de inalterabilidad del Formulario 1; falta el numeral del documento base.
- **AIU en jurisprudencia**: la sentencia 20811 de 2011 no abrió (.doc).
- **Documentos tipo de mínima cuantía de obra**: solo se leyó el decreto; el manual de mínima cuantía de CCE (2025-04) y el borrador de nueva versión de los documentos tipo (2025-04) quedaron como pista.

## Incidencias

- alcaldiabogota sirve la Ley 80 y la Ley 1882 completas (400 KB y 120 KB, Windows-1252), pero el Decreto 1082 solo como cascarón vacío.
- `soffice` no abre los .doc de la Relatoría («Error: source file could not be loaded»); `strings -n 4 -e S | iconv -f cp1252 -t utf-8` rescata el texto con acentos, pero sin estructura de párrafos: lectura marcada `parcial`.
- WebFetch no se usó; todo salió de `curl` + `pdftotext` / `zipfile` (docx) / `strings`.
- El texto del Decreto 1082 en la Relatoría trae erratas de transcripción («de1», «circubnstancias», ligaduras «ﬁ»); las citas se copiaron literales salvo la ligadura, que se normalizó a «fi» y se declara en `notas`.
- Las fichas no llevan `verificacion_adversaria` ni ids `CP-`/`CR-`: eso lo asigna otra fase.
- Ningún archivo contiene la grafía antigua de la marca (verificado con grep).
