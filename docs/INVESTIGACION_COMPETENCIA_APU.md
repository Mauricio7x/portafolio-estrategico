# Investigación de competencia del módulo APU · cómo operan, de dónde sacan los datos y cómo superarlas

**Fecha:** 2026-08-13 hora de Colombia (2026-08-14 UTC — el entorno marca hora universal; misma resta de 5 h que ya aplica la app a las fechas de SECOP). **Método:** cuatro investigaciones paralelas con lectura directa de los sitios
(cada afirmación distingue hecho verificado con URL de inferencia). **Encargo del dueño:** los
ingenieros no confían en los precios del APU frente al interventor; el módulo debe ser confiable,
con datos reales y fuente citable, cubriendo todas las regiones del país, y superar a Construdata y
a las plataformas del sector.

**Conclusión en una frase:** ninguna plataforma del mercado —ni Construdata, ni los ERP, ni las
internacionales— conecta licitaciones públicas con precios de APU, y la mejor base de precios de
Colombia no la vende nadie: **la publica INVIAS gratis, por provincia, con una API JSON sin token
que ya se verificó en vivo.** El camino para superar a todos no es copiar sus datos: es ingerir las
fuentes oficiales que ellos ignoran.

---

## 1 · Construdata (Legis) — el referente a batir

Ecosistema de Legis S.A. (48 años): portal + módulo Presupuestar + planes «Inteligencia de Costos»
+ software ConstruPlan/ConstruControl + revista (descontinuada en papel desde la ed. 210, 2024).

- **De dónde salen sus precios (verificado en su propia nota legal):** «la información de precios y
  distribuidores fue **suministrada directamente por los proveedores**». Son **precios de lista**,
  no pactados ni adjudicados; su descargo admite que varían «por volumen de compra y negociación».
- **Cobertura: 4 ciudades** (Bogotá, Cali, Medellín, Barranquilla — sitio oficial). Actualización
  mensual. 5.500 insumos y 1.000 APU por ciudad.
- **Rendimientos:** por cuadrilla (m²/h-cuadrilla), en parte de estudios académicos (Botero &
  Álvarez, EAFIT). Un estudio de la UPB midió en obra real rendimientos de **solo el 30 %** de lo
  publicado para la misma actividad (scielo.org.co, S1692-82612014000200011): son un punto de
  partida teórico, no un dato de obra.
- **Precios:** Inteligencia de Costos desde $69.000; portal Premium anual $817.000; ConstruPlan
  nube $1.857.000/año. Ingresos adicionales por pauta, consultoría y academia.
- **Sin API pública** (hecho negativo: cero menciones en todo el material comercial). Integración
  solo por exportes Excel/PDF.
- **Licitaciones:** `construdata.com/licitaciones` existe detrás de login; en el snapshot 2016 era
  un agregador de avisos por categoría/municipio/valor. Nada de competencia, histórico de
  adjudicaciones, probabilidad ni precios adjudicados.
- **Licencia:** base de pago y con licencia. **Incorporar su tarifario a Detekta queda fuera de
  alcance por decisión** (problema legal, no técnico) — ya estaba dicho en `docs/APU_FUENTES.md`.

**Dónde se le gana:** cobertura (4 ciudades contra 140 provincias de INVIAS), naturaleza del dato
(lista de proveedor contra adjudicado real + oficial de referencia), y la cadena completa
(ellos no conectan el precio con la licitación; Detekta arranca en la licitación).

## 2 · ERP regionales — SINCO, DataObra, AddControl, ComparaSoftware

- **SINCO ERP (Colombia):** ERP completo con módulo ADPRO (presupuesto por capítulos, APU, valor
  ganado). **Sin base de precios propia** (el usuario carga todo). Desde **COP 2,7 M/mes por
  módulo** (Capterra). Su «licitaciones» (SRM) es de proveedores privados, no SECOP. Quejas:
  curva de aprendizaje alta, poco intuitivo (n=3 reseñas).
- **DataObra (Argentina):** presupuestos/certificaciones; la versión Construnexo anuncia «precios
  de mercado por región» — regiones argentinas, origen sin verificar. Nada de Colombia.
- **AddControl (México):** precios unitarios importando catálogos externos (Excel/Neodata/Opus —
  ecosistema mexicano). US$66–99/mes. Sin Colombia, sin SECOP.
- **ComparaSoftware:** no es software — es un directorio chileno que cobra a los proveedores por
  aparecer. Sus reseñas (1–3 por producto) no son base estadística de nada.

**Hallazgo transversal:** **ninguno trae base de precios colombiana verificable ni toca SECOP.**
Todos asumen que el usuario ya decidió a qué presentarse y ya tiene sus precios.

## 3 · Internacionales — Presto, Procore, BrickControl

- **Presto (RIB Spain, ~420 €/año):** el estándar hispano de presupuestación. Su clave no es el
  software sino el **formato BC3/FIEBDC-3**: un estándar de intercambio que desacopló el software
  de los datos y permitió un mercado de bancos de precios competidores (BEDEC/ITeC ~100 €/año,
  Generador CYPE —que **tiene edición colombiana**: colombia.generadordeprecios.info—, Precio
  Centro, y bases oficiales gratuitas de cada comunidad autónoma). Flujo: el proyectista entrega
  el presupuesto en BC3 con las descomposiciones dentro; el contratista lo importa y sustituye
  precios partida a partida. Cero retranscripción. Debilidad: curva de aprendizaje de profesional,
  cero adaptación a Colombia (AIU, estampillas).
- **Procore (EE.UU., ~US$375+/mes por volumen de obra):** **no hace APU** (trabaja por «cost
  codes»). Su joya es **Benchmarking**: compara los proyectos del cliente contra cohortes similares
  construidas con ML sobre ~20 años de datos de todos sus clientes. Es el único cuyo modelo
  convierte datos agregados en producto.
- **BrickControl (España, $64–194/mes):** SaaS que importa cualquier banco BC3 o Excel. Sin banco
  propio, sin normativa colombiana.

**Lección estructural:** España tiene ecosistema porque tiene formato estándar; **Colombia tiene
los DATOS públicos (INVIAS, IDU, gobernaciones) pero cada uno vive en su Excel/PDF con su propia
estructura.** Ese hueco de normalización es exactamente lo que Detekta puede cerrar — y al cerrarlo
queda con algo que ni Presto tiene aquí: los bancos oficiales colombianos, leídos y unificados.

## 4 · Fuentes de datos reales verificadas EN VIVO (2026-08-13 hora Colombia)

Todas probadas hoy con código HTTP anotado. Es la mitad que sustenta el plan.

| Fuente | Qué da | Vía verificada | Cobertura | Estado |
|---|---|---|---|---|
| **INVIAS · API ArcGIS REST** | **~183.000 precios de insumos**: material (130.620), equipo (39.620), transporte (12.770), con nombre, unidad, precio, departamento, provincia, vigencia | `hermes2.invias.gov.co/server/rest/services/apu/APU/MapServer` (capas 1–4), JSON **sin token** | **32 departamentos, 140 provincias** | 200, con datos reales devueltos. Vigencias 2025-1/2025-2 (rezago frente a los Excel) |
| **INVIAS · Excel APU 2026-1** | APU completos (composición + rendimiento) por provincia | `hermes2.invias.gov.co/APUs/Provincias/2026_1/APU_{cod}_{DEPTO}__{PROV}_2026_1.xlsx`; consolidado `Territorio_APU_2026_1.xlsx` (16,5 MB); ZIP nacional 1,52 GB | Nacional salvo Bogotá, semestral | 200, firmas verificadas |
| **IDU · SIIPVIALES 2026-I** | Insumos y actividades de Bogotá + **directorio de proveedores de cotizaciones** | `idu.gov.co/page/siipviales/economico/portafolio` → Visor BPR xlsx 3,3 MB | **Bogotá** (justo lo que INVIAS excluye), semestral, histórico 2013 | 200 |
| **Boyacá · Socrata `ae7u-y7m2`** | 1.255 ítems oficiales con MO y total | `datos.gov.co/resource/ae7u-y7m2.json` — la MISMA API que la app ya usa | Boyacá. **Licencia CC BY-SA 4.0** | 200 · ⚠️ filas sin actualizar desde ~2022 |
| **Valle · Socrata `e839-6uct`** | 3.579 actividades con valor unitario | Socrata | Valle, **vigencia 2019** (solo estructura o reajuste declarado) | 200 |
| **EPC Cundinamarca** | APU completos de acueducto/alcantarillado 2026 | `epc.com.co/apu/` → `APUs-EPC-2026_Feb.xlsx` (7,2 MB) | Cundinamarca; relevante para AGU-RED | 200 |
| **DANE · ICOCIV / ICOCED** | Índices mensuales para REAJUSTAR (no precios) — ICOCED con desagregación por ciudades: el sustituto oficial del factor regional «recuperado» | `dane.gov.co/files/operaciones/ICOCIV/anex-ICOCIV-jun2026.xlsb` (32,5 MB) y `…/ICOCED/anex-ICOCED-jun2026.xlsx` (3,7 MB); URL predecible por mes | Nacional + ciudades | 200 (la URL vieja con `/construccion/` da 404: cambió de sección) |
| **TVEC · Socrata `3hdv-smhz` / `usqp-5nsn`** | Precios **realmente pagados** por ítem en acuerdos marco | Socrata | Nacional; bienes/servicios, no APU de obra | 200 |
| ICCU Cundinamarca (PDF) | Lista de precios anual | `iccu.gov.co` | Cundinamarca | **403 desde este entorno** (WAF); probable que abra en el navegador del dueño |
| SECOP · anexos de pliego | Formularios de cantidades con precios | `community.secop.gov.co/...RetrieveFile` | Por proceso, PDF/Excel uno a uno | **403 desde este entorno** (exige sesión de navegador) |
| Antioquia SIF | APU Base por subregión | Sitio reorganizado (301→404) | Antioquia | Referenciado, sin URL estable; vía práctica: anexos de procesos en SECOP II |

**Confirmado en negativo (importa igual):** no existe ningún dataset con presupuestos oficiales
desglosados por ítem en SECOP (`jbjy-vk9h` verificado campo a campo: todo es nivel contrato); no
hay fuente académica gratuita utilizable; CAMACOL publica análisis, no listas.

**⚠️ Licencia INVIAS:** su página declara que los documentos son propiedad de INVÍAS y que el uso
comercial sin autorización está prohibido. Para el uso actual (app privada del dueño, precios de
referencia citando la fuente) el riesgo es bajo; **si Detekta se comercializa con esos datos, hay
que pedir autorización** (`preciosunitarios@invias.gov.co`). Es la única fuente de la lista con esa
cláusula; Boyacá/Valle son CC BY-SA (reutilizables citando) y DANE es información oficial de uso
público.

## 5 · Qué implementar para superarlas (priorizado)

La ventaja estructural ya existe y nadie más la tiene: **SECOP → decidir a qué presentarse → APU →
precio óptimo** en una sola herramienta. Lo que falta es la mitad de datos, y ya está localizada.

1. **Ingerir la API de insumos de INVIAS** (materiales/equipo/transporte por provincia) a un
   keyspace `apu:invias:*`, como nueva rama de la cascada de `lib/apu/precios.js` entre «tu
   precio» y «catálogo». El mapa provincia→departamento **ya está hecho**
   (`data/apu_invias_provincias.json`) y era el puente que faltaba. Cada precio viaja con
   provincia, vigencia y `fuente:"invias"` — el badge INVIAS por fin se enciende con la verdad.
   Restricciones conocidas: la carga no puede correr dentro de una petición (183 k registros) —
   procesar fuera y cargar por lotes como ya hace `cargarCatalogo`; el tope de 12 funciones obliga
   a plegar la carga en un endpoint admin existente; la API va con rezago (2025-2) frente a los
   Excel (2026-1): la vigencia se publica por registro, jamás se disimula.
2. **Extraer rendimientos y composición de los Excel de APU 2026-1 de INVIAS** (consolidado de
   16,5 MB): es la respuesta al problema exacto del encargo — la pelea con el interventor por
   temas eléctricos se zanja citando el APU oficial de referencia de la provincia, no un número
   nuestro. Contra esto, los rendimientos «teóricos» de Construdata (30 % de la obra real según
   UPB) pierden: los de Detekta salen de un contrato adjudicado (Nogal) + el oficial regionalizado.
3. **IDU SIIPVIALES para Bogotá** (Excel semestral): cierra el único hueco de INVIAS. Bonus: su
   directorio de proveedores de cotizaciones da una trazabilidad («cotizado a X el fecha Y») que
   ni Construdata publica.
4. **Boyacá por Socrata** (misma API que la app domina, licencia CC) y EPC Cundinamarca para
   AGU-RED. Valle solo como estructura o reajustado por ICOCIV **declarándolo derivación**.
5. **Sustituir el ajuste regional «recuperado» por ICOCED/ICOCIV del DANE** (URL mensual
   predecible): el factor regional pasa de supuesto recuperado a índice oficial vivo, con fecha.
6. **Encender el nivel «pliego» de la cascada** con el lector que ya existe: los formularios de
   SECOP son PDFs uno a uno (403 desde este entorno, pero el navegador del dueño los abre — misma
   familia del muro ya documentado). Cada pliego que el dueño lea alimenta precios unitarios
   reales adjudicados. Es la versión artesanal y honesta del benchmarking de Procore: aprender de
   datos propios y del mercado real, no de listas de proveedor.
7. **Contar la ventaja en la interfaz**: donde Construdata dice «precio de lista de proveedor,
   4 ciudades», Detekta puede decir «precio oficial de referencia de TU provincia (INVIAS 2026-1)
   + lo que de verdad descontó el que ganó aquí (histórico SECOP)». La cascada visible ya existe
   (`explicarCascada`); las fuentes nuevas entran por ahí sin inventar UI.

**Ideas de los competidores que NO se copian, con razón:** el banco de Construdata (licencia); un
«formato BC3 colombiano» (no hay ecosistema que lo lea — el estándar útil aquí es el Excel que ya
se exporta e importa); un puntaje de confianza numérico por precio (sería una medición inventada —
regla R10 del proyecto); precios paramétricos tipo CYPE (fabricar precisión que nadie midió).

## 6 · ¿Podemos hacer lo mismo que Construdata? — el método, no solo el dato

**Cómo lo hacen ellos:** un equipo editorial de Legis (48 años de operación) **encuesta proveedores
todos los meses** en 4 ciudades: llaman/escriben, reciben precios de lista, los consolidan y los
publican. La composición de cuadrillas «es un análisis hecho por Construdata» y los rendimientos
vienen en parte de estudios académicos (EAFIT). Es un método **intensivo en personas**: su costo es
la nómina editorial, y por eso cobran suscripción y por eso solo cubren 4 ciudades.

**¿Podemos replicar ese método tal cual? NO, y hay que decirlo sin rodeos:** encuestar proveedores
mes a mes exige un equipo humano dedicado que este proyecto no tiene. Fingir que una automatización
«equivale» a esa encuesta sería inventar datos con otro nombre.

**Lo que SÍ podemos hacer — y que a ellos les cuesta más que a nosotros:**

1. **Automatizar lo oficial** (ellos no lo hacen): INVIAS por provincia + IDU + gobernaciones +
   DANE se pueden ingerir por código, con actualización semestral/mensual sin nómina. Construdata
   no puede vender lo gratis como suyo; nosotros sí podemos integrarlo citando la fuente.
2. **Crowdsourcing con estructura** (nuestro «nivel 1» ya lo hace): cada usuario que corrige un
   precio alimenta SU perfil hoy. La evolución natural es el **agregado anónimo entre usuarios**
   («el precio mediano que los usuarios de Detekta pagaron por este insumo en Antioquia, n=7») —
   el modelo Waze aplicado a precios. Es EXACTAMENTE el foso de Procore (benchmarking entre
   clientes) y crece solo con el uso. Regla dura: publicar solo con n mínimo y con el n visible;
   con n=1 no hay mediana, hay una anécdota.
3. **Cotización dirigida**: la app puede GENERAR la solicitud de cotización (RFQ) — un correo o PDF
   estándar por insumo y región que el usuario envía a sus proveedores y cuya respuesta se carga
   con un clic. No es encuesta masiva: es la encuesta de Construdata hecha por el interesado, con
   el dato quedando en la plataforma. Semi-manual, pero cada dato es real y con fecha.
4. **Precios adjudicados** (el dato que Construdata NO tiene): los formularios de cantidades de
   procesos ya adjudicados traen los precios unitarios CON los que se ganó. El lector de pliegos ya
   existe; falta el hábito/flujo de alimentarlo. Un precio con el que alguien ganó un contrato vale
   más que cualquier precio de lista.

**La síntesis honesta:** no competimos con su método (encuesta editorial); lo rodeamos con tres
métodos que no requieren nómina — oficial automatizado, crowdsourcing con n visible y adjudicado
real — y uno semi-manual (RFQ) que convierte al usuario en el encuestador de su propio mercado.

## 7 · Cómo volverlo un producto de nivel nacional

La cobertura nacional NO se logra con una sola fuente: se logra con **capas que se declaran**, cada
una con su alcance y su vigencia a la vista:

| Capa | Fuente | Cobertura | Papel |
|---|---|---|---|
| 1 | Precios del usuario (y agregado anónimo cuando haya masa) | Donde haya usuarios | La verdad de SU mercado — manda sobre todo |
| 2 | Pliegos adjudicados leídos | Por proceso, todo el país | Precio real de mercado ganador |
| 3 | **INVIAS APU regionalizados** | **140 provincias, 32 departamentos** | La columna vertebral oficial nacional |
| 4 | IDU (Bogotá) + gobernaciones (Boyacá, EPC, ICCU…) | Bogotá + departamentos con lista propia | Refina donde hay mejor dato local |
| 5 | Retail/fabricantes (Homecenter y similares — ver §9) | Ciudades con tienda | Techo de referencia al detal, con IVA, declarado como tal |
| 6 | DANE ICOCIV/ICOCED | Nacional + ciudades | Reajusta en el tiempo lo que envejece |

Con las capas 3+4 ya hay dato oficial en TODOS los departamentos — eso es lo que ninguna plataforma
comercial tiene (Construdata: 4 ciudades). Las capas 1, 2 y 5 lo vuelven vivo. La regla de siempre
gobierna la mezcla: **cada precio viaja con su fuente, su vigencia y su alcance; nunca se promedia
una capa con otra en silencio; y donde no hay dato se dice «sin dato», no se rellena.**

Para el dolor específico de los APU eléctricos (la pelea con el interventor): la combinación
ganadora es INVIAS/IDU como referencia oficial citable + listas de fabricantes eléctricos (§9) +
el APU calibrado del Nogal (contrato eléctrico adjudicado real, ya en el catálogo). Tres fuentes
independientes que se pueden poner sobre la mesa — contra eso, «me parece caro» no es un argumento.

## 8 · Empresas privadas como fuente de precios — verificado en vivo (2026-08-13 hora Colombia)

Pregunta del dueño: «¿podemos meter como fuentes de información empresas como Homecenter? ¿qué
otras?». Respuesta verificada URL por URL (códigos HTTP anotados). Regla transversal: **todo precio
retail o de lista de fabricante es un TECHO** (al detal y/o antes de descuentos por volumen), y así
debe declararse en la cascada — jamás como «precio de obra».

| Fuente | Estado hoy | Formato | Automatizable | Declaración |
|---|---|---|---|---|
| **Homecenter/Sodimac** | 200, precios sin login (cemento Argos 50 kg $32.500, varilla 3/8" $14.600 — Bogotá) | JSON embebido en el HTML de búsqueda | Sí (la API interna clásica dio 404; el HTML basta) | `retail_con_iva` — techo. Variación por ciudad NO verificada (el selector es del lado cliente) |
| **Easy Colombia** | 206, **API VTEX pública con JSON limpio sin login** (`/api/catalog_system/pub/products/search?ft=…`); sigue operando (lo que cerró Cencosud fue Spid) | JSON | **Sí — la mejor de todas** | `retail_con_iva` — techo |
| **Interelectricas → lista PROCABLES** | 200, PDF abierto de 47 KB, **leído hoy**: $/m antes de IVA con códigos de producto (alambre Cu 12 AWG $1.476/m, THHN 8 AWG $3.968/m) | PDF texto | Sí | `lista_fabricante` — vigencia = fecha de descarga (el PDF no trae fecha legible) |
| **Interelectricas → lista CENTELSA** | 200, PDF abierto de 67 KB (fuente CID: exige pdftotext/pdf.js, que el proyecto ya tiene) | PDF | Sí | ídem |
| **Pavco Wavin** (tubería) | La lista oficial 2025 EXISTE (`pavcowavin.com.co/lista-de-precios`) pero responde **403 Cloudflare desde este entorno** (bloqueo de datacenter) | PDF | Desde el navegador del dueño, sí | `lista_fabricante` |
| Construrama (Cemex) | 200 pero **precios vacíos sin dirección de entrega** (dependen del distribuidor de zona) | HTML | No | no usar |
| Argos directo / siderúrgicas (Ternium, Diaco) / Corona directo | **Sin precios públicos** (Argos remite a distribuidores; `tienda.corona.co` ya no existe; ninguna siderúrgica publica lista) | — | No | no usar; su precio público real es el retail |
| Mercado Libre | API `sites/MCO/search` → **403: ya exige token OAuth**; el HTML sirve muro anti-bot a IPs de datacenter; sus ToS prohíben scraping | JSON (con app registrada) | Con token | solo sanity-check, nunca dato primario |
| **Tul** (marketplace B2B ferretero) | 200, vivo, pero precios tras registro de ferretería | SPA | No | no apto |
| Combustibles `gjy9-tpph` (Socrata) | 200 pero **datos hasta 2022** | JSON | Sí | solo histórico |
| **SICOM / comunicados MinEnergía** | 200; consulta oficial de precios de combustible por municipio (herramienta web, no API) | web | Transcripción mensual (una cifra/mes) | referencia para el factor de transporte |

**Los tres pasos de mayor valor:** (1) Easy por su API VTEX para materiales generales; (2) los dos
PDF de Interelectricas para los APU eléctricos — el dolor #1, con precio por metro antes de IVA,
que es el formato exacto de la discusión con el interventor; (3) Homecenter como segunda cotización
retail. Procables y Centelsa como fabricantes directos están hoy inservibles (TLS vencido /
inalcanzable): la vía real es el distribuidor, y el patrón `/lista/*.pdf` se repite en el gremio.

**Legalidad, dicho claro:** los robots.txt de Homecenter/Easy no bloquean búsqueda ni API de
catálogo, y los PDF de Interelectricas están publicados justamente para que los clientes coticen —
riesgo bajo citando fuente. Mercado Libre sí prohíbe scraping en sus ToS: no entrar por ahí. En
los términos de Homecenter no se encontró cláusula anti-extracción, pero es una SPA y el texto
legal podría cargarse por JS: queda como «no encontrada», no como «no existe».

## 9 · Listas de fabricante en PDF abierto — verificado en vivo 2026-08-14 (hora Colombia)

Continuación de §8 (la verificación pendiente que quedó anotada allí). Todo verificado HOY con curl
desde este entorno; pdftotext disponible. Regla de siempre: un 403/404 es una observación CON FECHA
desde este entorno, no una propiedad de la fuente.

**Hallazgo principal — Coval Comercial S.A.S. (`coval.com.co/pdfs/listasprecios/ult_<marca>.pdf`)**:
distribuidor multimarcas (Bogotá–Cund.–Boyacá–Meta–Valle–Eje Cafetero) que publica la lista VIGENTE
de cada fabricante en **URL estable** (`ult_` = «última»; el archivo se reemplaza en el mismo path,
Last-Modified 2026 en todos). Es la propiedad ideal para automatizar: se descarga siempre la misma
URL y la vigencia se lee IMPRESA en el PDF. Es el «interelectricas» hidráulico/de construcción.

| Fuente | Estado 2026-08-14 | Vigencia impresa | Formato | Declaración |
|---|---|---|---|---|
| **Gerfor tubosistemas** (oficial, `gerfor.com/wp-content/uploads/...Lista de precios Gerfor 2025.pdf`, V1 y V2) | 200 | «FECHA: Febrero 2025» (V1); V2 bajo /2025/05/ | PDF texto · $ sin/con IVA · por tubo de 6 m («RDE 21 3/4" · $25.419 / $30.249») | `lista_fabricante` — rastrear el enlace en `/tubosistemas/`, no adivinar el path |
| **Sika** (vía Coval `ult_sika.pdf`) | 200 · 1,6 MB | «Sugerida al público – Vigencia desde Abril 9 de 2026» | PDF texto · $ empaque sin IVA + con IVA | `lista_fabricante` |
| **Eternit** (vía Coval `ult_eternit.pdf`) | 200 · 633 KB | «Febrero 2026» | PDF texto · $/teja sin/con IVA («TEJA FLEXIFORTE P7 N 5 · $40.300 / $47.957») | `lista_fabricante` |
| **Durman PVC** (Aliaxis, vía Coval `ult_durman_tubosistemas.pdf`) | 200 · 1,5 MB | «Marzo 2026 V1.1» | PDF texto · $/tubo sin/con IVA («1/2" · $30.177 / $35.911») | `lista_fabricante` — **sustituto directo de Pavco** (mismas categorías) |
| **Grival** (grifería Corona, vía Coval `ult_grival.pdf`) | 200 · 978 KB | «JUNIO DE 2025» | PDF texto · $/und sin/con IVA por referencia SAP | `lista_fabricante` |
| **Gerfor grifería** (vía Coval) | 200 · 3,4 MB | «JUNIO DE 2026» | PDF texto · $/und sin/con IVA | `lista_fabricante` |
| **PCP válvulas** (vía Coval `ult_pcp.pdf`) | 200 · 2,5 MB | «vigente a partir de 1 de febrero de 2026. Precios no incluyen IVA» | PDF texto | `lista_fabricante` |
| Pintuco (vía Coval `ult_pintuco.pdf`) | 200 · 24,6 MB | «MARZO DE 2026» impresa | **Tablas en imagen JPEG 150 ppi** — 79 págs producen 26 KB de texto, 0 líneas con precio | **no usar** (solo con OCR validado) |
| Pavco Wavin oficial | **403 hoy** (curl y fetcher) | — | — | reintentar (observación con fecha); réplicas: solo Scribd con muro o una de SEP-2021 obsoleta — **no usar** |
| Acesco | 200 su catálogo técnico | — | **0 líneas con precio** (verificado) | no publica lista — coherente con acero a precio de mercado diario |
| Corona porcelana sanitaria | lista PDF pública no encontrada | — | — | pendiente; la grifería queda cubierta por Grival |
| Procables (interelectricas, re-verificado hoy) | 200 · 47 KB | sin fecha impresa (vigencia = fecha de descarga) | PDF texto · $/m antes de IVA | `lista_fabricante` |
| ICCU 2025 (precios oficiales de referencia de Cundinamarca — no es fabricante) | **403 desde este entorno hoy** | — | PDF | reintentar |

En el mismo directorio de Coval (no listable, nombres adivinables por marca, sin inspeccionar):
`ult_ajover.pdf`, `ult_colempaques.pdf` (tanques), `ult_gricol.pdf`, `ult_helbert.pdf`,
`ult_hierro_fundido.pdf`, `ult_itwcolombia.pdf`, `ult_silplas.pdf`.

**Advertencia de uso:** son precios de lista/sugeridos al público — un TECHO negociable, jamás
«precio de obra». Cada PDF declara si viene antes o después de IVA (anotado arriba) y esa
declaración debe viajar con la cifra.

## 10 · Retail por capital — verificado en vivo 2026-08-14, 10:07–11:04 hora Colombia

La otra mitad de la verificación pendiente de §8. Todo con curl desde este entorno (más una
captura de red con Chromium/CDP para encontrar las llamadas reales de Homecenter). Ningún endpoint
exigió login ni sirvió muro anti-bot durante la sesión.

**Homecenter SÍ tiene precio por ciudad, resuelto EN EL SERVIDOR, con dos palancas:**
- **API JSON** `homecenter.com.co/s/search/v1/soco?q=…&priceGroup=N` (HTTP 200, sin cookies ni
  login). Barrido N=1..30 sobre el cemento Argos 50 kg (id 13846): el mismo saco va de **$29.200
  (pg 17, Cúcuta) a $37.900 (pg 22, Ibagué)** — ±13 % sobre Bogotá (pg 10, $32.500). Es la fuente
  ideal para automatizar: JSON, server-side, un parámetro.
- **SSR con cookies `usrLocation` + `comuna`** (obtenidas de `search-location-info` +
  `save-location-info`): mueve el precio de la página del producto. La conclusión de la sesión
  anterior («ZONE_ID no mueve el precio») era correcta en el hecho pero incompleta: la palanca son
  OTRAS cookies, y la API acepta `priceGroup` directo. La API ignora las cookies y el SSR ignora
  `priceGroup`: dos canales, dos palancas.

**Easy NO regionaliza: precio único nacional.** `sc=1` y `sc=5` dan precios idénticos peso a peso;
`/api/segments` responde `priceTables:null, regionId:null`; y `checkout/pub/regions` devuelve el
MISMO `regionId` con `sellers:[]` para 9 códigos postales de punta a punta del país.

**Cobertura de capitales** (tiendas Homecenter: JSON oficial
`sodimac-browse-store-info-prod/SOCO.json`, 42 tiendas; Easy: API de pickup-points):
- Homecenter con tienda física en **19 capitales** (Bogotá 12, Medellín 4+2, Cali 3, Barranquilla
  3, Cartagena 2, y una en Cúcuta, Bucaramanga, Pereira, Santa Marta, Ibagué, Manizales, Armenia,
  Neiva, Villavicencio, Valledupar, Montería, Sincelejo, Tunja, Yopal).
- Easy solo en Bogotá (11+Soacha), Medellín (2) y Barranquilla (1).
- **Sin tienda pero CON precio de entrega verificado por SSR**: Pasto $33.500, Popayán $29.000,
  Riohacha $31.000, Quibdó $31.000, Mocoa $32.500 (sus priceGroup son >30 y no se barrieron).
- **Sin cobertura**: Florencia y San José del Guaviare («no hay disponibilidad»); Arauca, Leticia,
  Inírida, Mitú, Puerto Carreño y San Andrés sin cobertura geográfica (el catálogo de entrega
  trae 26 departamentos: faltan exactamente Amazonas, Arauca, Guainía, San Andrés, Vaupés y
  Vichada). **Ahí la caída declarada es a INVIAS.**

**Qué categorías del APU existen en retail (Bogotá, precios de muestra):**
- Áridos: **solo por saco de 40 kg** (arena de río $13.900, gravilla $14.900). No existe venta por
  m³: el equivalente (~$470–520 mil/m³) es un MÚLTIPLO del precio de cantera — usable solo como
  cota superior extrema, y hay que decirlo.
- Concreto premezclado en mixer: **NO existe en retail** (canal directo Cemex/Argos/Holcim por
  cotización). Lo más cercano es mezcla seca en saco (Topex 3000 psi 40 kg, $26.900).
- Acero: varilla SÍ en Homecenter (G-60 1/2" × 6 m $24.200; malla electrosoldada $81.900); Easy
  cero. Acero **figurado NO** (es servicio de figuradora).
- Tubería PVC: SÍ en ambos (HC sanitaria 4"×6m $89.900; Easy presión 1"×3m Gerfor $18.900).
- Eléctrico: THHN SÍ en Homecenter ($6.850/m el No. 12); Easy cero.
- Mampostería: SÍ (ladrillo común $800/und; bloque liso No. 12 $4.700 — mismo proveedor y precio
  en HC y Easy).
- **Homecenter domina a Easy en profundidad de catálogo de obra en todas las categorías probadas.**

## 11 · Banco INVIAS por provincia — verificado e IMPLEMENTADO 2026-08-14 (hora Colombia)

La capa 3 del §7 pasó de plan a código: `tests/capturar_invias.js` (herramienta manual con red) →
`data/apu_invias.json` (23 códigos × 140 provincias, 329 KB) → `lib/apu/invias.js` →
`referencia_invias` en `detalle.insumos` de `calcular` + nivel `invias` declarado en la cascada.
Evidencia de la sesión de verificación:

- **Estructura real de la API** (`MapServer?f=json`, 200): capa 0 `Subregion` (polígonos) y tablas
  1 `Insumo` (183.010 = unión), 2 `Equipo` (39.620), 3 `Material` (130.620), 4 `Transporte`
  (12.770). Campos: `codigo`, `nombreinsumo`, `precio`, `unidad`, `nombredepartamento`,
  `nombreprovincia`, `codigodepartamento`, `codigoprovincia`, `anio`, `periodo`, `tipoinsumo`.
  `maxRecordCount` 2000; una provincia completa (Ibagué 7301: 647 filas en 2025-1) cabe en una
  petición. `returnDistinctValues=true` responde **400** en este servidor; el censo se hace por
  provincia (cada código aparece exactamente una vez por provincia y vigencia). El error de ArcGIS
  viaja DENTRO del 200 (`{"error":{...}}`), como en OCR.space.
- **🚩 LA VIGENCIA 2025-2 ESTÁ CORRUPTA EN ORIGEN.** Comparadas las dos vigencias del mismo código
  sobre sus 140 provincias (medianas): acero de refuerzo B0020003 $3.280/kg (2025-1, plausible)
  contra **$122.000/kg** (2025-2, 37× el mercado); agua B0063200 $110/L contra **$15.900/L**
  (145×); emulsión CRL-0 B020011 $1.802/L contra $52.048/L **idéntico en las 140 provincias**
  (p10 = p90 — huella de un cruce de columnas); MDC-19 B0014502 $738.232/m³ contra $214.200 (⅓ del
  mercado). Por eso la captura de ago 2026 usó **2025-1** y `_meta.por_que_no_2025_2` lo explica. Lección:
  «oficial» no exime del contraste contra mercado — la corrupción se cazó mirando, no confiando.
- **Re-captura a 2026-1 (16-ago-2026) desde el Excel oficial.** El INVIAS publica cada vigencia primero
  en `hermes2.invias.gov.co/APUs/Provincias/Territorio_APU_{año}_{sem}.xlsx` (todo el país; los
  archivos por provincia siguen `{año}_{sem}/APU_{cod}_{DPTO}__{PROV}_{año}_{sem}.xlsx`) y la API va por
  detrás. `tests/capturar_invias.js --xlsx … --vigencia 2026-1` lee el libro con el lector del proyecto y
  produce el mismo JSON. Medianas 2026-1 vs 2025-1 en los 23 códigos: cocientes **0,74–1,40**
  (acero $4.585/kg ×1,40; cemento $750/kg ×1,10; agua $122/L ×1,11; MDC-19 $899.547/m³ ×1,22;
  alambre $6.965/kg ×0,74; retroexcavadora $203.917/h ×0,81) — sin ninguna huella de la corrupción de
  2025-2 (37×, 145×). El INVIAS renumeró los transportes: T0010025 → **T0100034** «transporte de
  materiales excavación / préstamo» ($1.492/m³-km, mediana nacional 2026-1), declarado como sucesor
  curado. La comparación queda guardada en `_meta.contraste_vigencia_anterior` y la suite prohíbe un
  cociente fuera de [0,5; 2].
- **Contraste cruzado que valida las dos fuentes**: el transporte oficial T0010025 da mediana
  nacional $1.263,6/m³-km, casi idéntico al acarreo del catálogo calibrado con el Nogal
  ($1.256/m³-km). Y el cemento portland ($679/kg → $34.000/saco de 50 kg) queda a un 5 % del
  retail Homecenter ($32.500): tres fuentes independientes que se confirman.
- **Curaduría**: 23 correspondencias a mano (7 exactas, 16 aproximadas con nota) leyendo el censo
  de Ibagué; huecos declarados en `categorias_sin_invias` (premezclado, mano de obra, mampostería,
  subbase convencional, formaletas con unidad ambigua). Cobertura: los 32 departamentos del banco —
  incluidos los 8 sin retail (§10) y los 19 sin factor regional del catálogo. Bogotá D.C. NO está
  en el banco: se responde la mediana nacional declarada.

## 12 · Lo que este informe NO afirma (sinceridad)

- No se midió la calidad interna de las plataformas de pago (Construdata Presupuestar, SINCO):
  todo lo dicho sale de su material público, tiendas y reseñas escasas (n=1–3).
- La API ArcGIS de INVIAS es **no documentada**: puede cambiar o cerrarse sin aviso. Los Excel con
  URL predecible son el respaldo; el extractor de PDFs propio, el último recurso.
- Los 403 de hoy (ICCU, SECOP RetrieveFile) son observaciones con fecha desde ESTE entorno, no
  propiedades de las fuentes.
- De las capas del §7, hoy están implementadas la 5 (retail, §10) y la **referencia por insumo de
  la 3** (banco INVIAS, §11 — 23 insumos curados, no los 183 k). Siguen siendo investigación: los
  APU completos de los Excel INVIAS 2026-1 (composición y rendimientos), IDU/gobernaciones (capa 4)
  y el reajuste DANE (capa 6) — trabajo con sus propias decisiones que deben resolverse con las
  reglas ya escritas (un cero no es un precio; la fuente viaja con la cifra; sin dato se dice sin
  dato).
