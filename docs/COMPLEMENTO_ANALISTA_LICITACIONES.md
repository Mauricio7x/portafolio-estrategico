# Complemento crítico al Manual del Analista de Licitaciones

**Auditoría de vacíos, investigación de cierre y correcciones · agosto 2026**

Documento acompañante de [`GUIA_ANALISTA_LICITACIONES.md`](./GUIA_ANALISTA_LICITACIONES.md). El manual
es sólido en oficio y en criterio; este documento lo audita, señala lo que le falta o lo que dice de
más, y cierra los vacíos con fuentes verificables.

> **Regla de este documento:** cada afirmación lleva su fuente. Donde la investigación **no** pudo
> confirmar algo, se dice explícitamente en lugar de rellenar con plausibilidad. Los vacíos que
> quedaron abiertos viven en la [tabla de temas pendientes](#temas-pendientes-de-investigación).

---

## Alcance real de esta investigación (léelo antes de confiar en el resto)

**Lo que sí se pudo hacer:** búsqueda web amplia y recuperación de fuentes en dominios accesibles
(GitHub, prensa jurídica, boletines).

**Lo que NO se pudo hacer, y condiciona varias secciones:** el proxy de este entorno devuelve
**HTTP 403** para `datos.gov.co`, `colombiacompra.gov.co`, `operaciones.colombiacompra.gov.co`,
`relatoria.colombiacompra.gov.co`, `dev.socrata.com`, `funcionpublica.gov.co`, `scielo.org.co` y
`minenergia.gov.co`. Es la misma restricción ya documentada en `CLAUDE.md` para la sincronización
(«este entorno no alcanza datos.gov.co — verificado `CONNECT 403`»), y ahora se confirma que abarca
también a las fuentes normativas primarias.

**Consecuencia honesta:** varios hallazgos se apoyan en **fuentes secundarias** (prensa jurídica,
resúmenes de firmas de abogados, documentación de terceros) y en **resúmenes de buscador de fuentes
primarias no descargadas**. Están marcados con 🔸 y **deben verificarse contra el texto oficial antes
de tomar una decisión jurídica**. Ninguna de las cifras de este documento debe usarse en un pliego o
en una reclamación sin abrir la fuente.

**Y una advertencia sobre el propio manual:** varias de sus cifras más citadas —«aquí se define el
40 % de los procesos», «el 95 % de los oferentes nunca descarga las ofertas», «el 90 % de las
reclamaciones se pierden por falta de prueba», «el 80 % de los procesos amañados»— **no tienen fuente
y no se encontró ninguna que las respalde**. Son retórica de oficio, probablemente buena intuición,
pero **no son datos**. No deben citarse como estadística ni usarse para calibrar nada en la app.

---

## Índice de vacíos, por impacto en el negocio

| # | Vacío | Impacto | Estado en el manual |
|---|---|---|---|
| [V-01](#v-01--documentos-tipo-versión-2-obligatorios-desde-el-16-de-febrero-de-2026) | Documentos tipo v.2 infraestructura social (obligatorios 16-feb-2026) | 🔴 Crítico | No existe |
| [V-02](#v-02--el-ciclo-electoral-y-la-ley-de-garantías-el-vacío-más-grande) | Ciclo electoral y ley de garantías | 🔴 Crítico | No existe |
| [V-03](#v-03--precios-unitarios-vs-precio-global-y-por-qué-mayor-cantidad--adición) | Precios unitarios vs. precio global | 🔴 Crítico | No existe |
| [V-04](#v-04--reajuste-de-precios-e-icociv-en-un-año-de-smmlv-23-) | Reajuste de precios / ICOCIV | 🔴 Crítico | No existe |
| [V-05](#v-05--corrección-el-manual-exagera-el-efecto-de-firmar-sin-salvedades) | **Corrección:** salvedades y liquidación | 🟠 Alto | **Impreciso** |
| [V-06](#v-06--desequilibrio-económico-cómo-se-prueba-de-verdad) | Desequilibrio económico del contrato | 🟠 Alto | No existe |
| [V-07](#v-07--inhabilidad-por-incumplimiento-reiterado-la-que-mata-la-empresa-en-silencio) | Inhabilidad por incumplimiento reiterado | 🟠 Alto | No existe |
| [V-08](#v-08--corrección-anticipo--el-manual-se-queda-corto-y-en-un-punto-induce-a-error) | **Corrección:** anticipo, límite y fiducia | 🟠 Alto | **Incompleto** |
| [V-09](#v-09--la-contribución-del-5--base-gravable-y-vigencia) | **Precisión:** base gravable del 5 % | 🟠 Alto | **Incompleto** |
| [V-10](#v-10--los-indicadores-habilitantes-tienen-valores-de-referencia-y-eso-hace-usable-la-señal-3) | Valores de referencia de indicadores | 🟠 Alto | No existe |
| [V-11](#v-11--matriz-de-riesgos-previsibles-conpes-3714) | Matriz de riesgos previsibles | 🟡 Medio | No existe |
| [V-12](#v-12--umbrales-y-cifras-de-2026) | Umbrales y cifras 2026 | 🟡 Medio | No existe |
| [V-13](#v-13--sagrilaft-la-obligación-que-aparece-al-crecer) | SAGRILAFT | 🟡 Medio | No existe |
| [V-14](#v-14--beneficiario-final-la-ley-2195-hace-más-de-lo-que-el-manual-dice) | Beneficiario final / RUB | 🟡 Medio | Mención suelta |
| [V-15](#v-15--el-dataset-p6dx-8zbt-lo-que-sí-se-pudo-confirmar) | Dataset `p6dx-8zbt` | 🔴 Crítico *(para la app)* | No existe |
| [V-16](#v-16--interventoría-el-otro-lado-del-mostrador) | Interventoría | 🟢 Bajo | Mención suelta |
| [V-17](#v-17--reforma-al-estatuto-en-trámite) | Reforma al Estatuto en trámite | 🟢 Bajo *(hoy)* | No existe |

---

## V-01 · Documentos tipo versión 2: obligatorios desde el 16 de febrero de 2026

**Qué dice el manual.** Que los documentos tipo son obligatorios (Ley 2022/2020) y que desviarse de
ellos es la señal #12 de pliego sastre. **No dice que tienen versiones, ni cuál rige.** Un pliego que
sigue la versión anterior no es un pliego sastre: es un pliego desactualizado, y son cosas distintas.

**Lo que encontró la investigación.** La **Resolución 539 de 2025** de la ANCP-CCE adoptó la
**versión 2** de los documentos tipo de licitación de obra pública del **sector de infraestructura
social**, derogando la Resolución 219 de 2021. Aplica a procesos **cuyo aviso de convocatoria se
publique a partir del 16 de febrero de 2026**. 🔸

Tres cambios relevantes para el contratista:

- **Amplía el alcance sectorial**: a Educación, Salud, Recreación y Deporte se suman **Institucional
  y Vivienda**. Obra que antes se regía por pliego libre ahora entra en documento tipo.
- **Rediseña las fórmulas de acreditación de experiencia** y **actualiza los requisitos financieros y
  organizacionales**.
- **Incorpora criterios de sostenibilidad** social y ambiental como eje transversal.

En **infraestructura de transporte** la línea de versiones es independiente: la **Resolución 465 de
2024** adoptó la **versión 4**. 🔸

**Implicación práctica.** El «diccionario del pliego» del truco #8 ahora tiene una capa más: hay que
saber **qué versión** de documento tipo rige el proceso, porque las definiciones de experiencia
cambiaron. Y para la biblioteca documental: los formatos de la casa que sigan la versión anterior
quedan obsoletos para convocatorias posteriores al 16 de febrero de 2026.

**Conexión con la app.** Sugiere un campo derivado por proceso: *¿está sujeto a documento tipo y a
qué versión?* Deducible de sector + fecha de publicación del aviso. Hoy la app no lo modela.

**Fuentes:** [Resolución 539 de 2025 – ANCP-CCE](https://www.colombiacompra.gov.co/archivos/documento/01-resolucion-539-de-2025-por-la-cual-se-adopta-la-version-2-de-los-documentos-tipo-para-los-procesos-de-seleccion-de-licitacion-de-obra-publica-del-sector-de-infraestructura-social) ·
[Comunicado ANCP-CCE](https://www.colombiacompra.gov.co/archivos/26775) ·
[Análisis Beltrán Pardo](https://www.beltranpardo.com/noticias-juridicas/adopcion-de-la-version-2-de-los-documentos-tipo-para-licitaciones-de-obra) ·
[Documentos tipo transporte v.04](https://www.colombiacompra.gov.co/archivos/document-category/01-documentos-tipo-infraestructura-de-transporte/01-documentos-tipo-de-licitacion-de-obra-publica-de-infraestructura-de-transporte/documentos-tipo-para-licitacion-de-obra-publica-de-infraestructura-de-transporte-version-04)

---

## V-02 · El ciclo electoral y la ley de garantías: el vacío más grande

**Qué dice el manual.** Nada. Es, con diferencia, **la omisión más grave** para planear un año de
trabajo en Colombia, y afecta directamente a la estadística sobre la que la app ordena resultados.

**Lo que encontró la investigación.** Para el ciclo electoral 2026 (legislativas en marzo,
presidenciales en mayo):

| Restricción | Desde | Hasta |
|---|---|---|
| Prohibición de **convenios interadministrativos** que ejecuten recursos públicos | **8 de noviembre de 2025** | 31 de mayo de 2026 (o **21 de junio** si hay segunda vuelta) |
| Restricción general de **contratación directa** para todas las entidades estatales | **31 de enero de 2026** | Ídem |

Y la definición operativa que importa: para efectos de la ley de garantías, «contratación directa»
es **todo sistema de selección o procedimiento que no incluya convocatoria pública en alguna de sus
etapas ni permita la participación de varios oferentes**. 🔸

**Implicación práctica — y es doble.**

1. **Durante la ventana** (feb–may 2026), las entidades que necesitaban ejecutar **tuvieron que usar
   modalidades competitivas**. Eso produce un **pico artificial de oferta de procesos** y, muy
   probablemente, **más oferentes por proceso** compitiendo por ellos.
2. **Al cerrarse la ventana** (junio 2026 en adelante) el efecto se invierte: vuelve la contratación
   directa y la presión competitiva cae.

**Conexión con la app — esto es lo importante.** `lib/indice_competencia.js` calcula tertiles sobre
el **promedio de oferentes por entidad en 2 años**. Ese promedio está **mezclando un período de
restricción electoral con períodos normales**, sin saberlo. Una entidad puede aparecer como «alta
competencia» simplemente porque su histórico está concentrado en la ventana de garantías. Dos
mitigaciones posibles, en orden de coste:

- **Barata:** exponer la distribución temporal de los procesos que forman el promedio en
  `/api/competencia-detalle` (el modal ya enseña qué procesos cuentan; añadir el mes permite ver el
  sesgo a ojo).
- **Cara y mejor:** ponderar o segmentar el índice por período, distinguiendo la ventana electoral.

Además, el corte de 2 años del backfill (`?desde=2024-01`) **cae justo encima** del ciclo electoral
territorial de 2023 y del nacional de 2026: no hay un período «limpio» reciente. Conviene decirlo en
pantalla antes que fingir que el promedio es estacionario.

**Fuentes:** [Presidencia — inicio de la Ley de Garantías](https://www.presidencia.gov.co/prensa/Paginas/El-8-de-noviembre-comienza-la-Ley-de-Garantias-esto-es-lo-que-debe-saber-251007.aspx) ·
[ConsultorSalud — restricciones 2026](https://consultorsalud.com/ley-de-garantias-electorales-2026-restricciones/) ·
[Alcaldía de Cali — intranet](https://intranet.cali.gov.co/2025/10/27/el-8-de-noviembre-inicia-la-ley-de-garantias-esto-es-lo-que-debe-saber/)

---

## V-03 · Precios unitarios vs. precio global, y por qué «mayor cantidad» ≠ «adición»

**Qué dice el manual.** El Capítulo 11 enseña a costear (APU, AIU, costos ocultos) pero **nunca
menciona la modalidad de pago del contrato**. Es una omisión seria: la misma obra, al mismo precio,
tiene un perfil de riesgo completamente distinto según cómo se pacte el pago.

**Lo que encontró la investigación.**

| | Precio global (fijo) | Precios unitarios |
|---|---|---|
| Remuneración | **Suma fija** que incorpora todos los costos directos e indirectos | Cantidades ejecutadas × precio unitario |
| Mayores cantidades | **En principio no se reconocen** | **Deben reconocerse** en la liquidación, si fueron ordenadas y autorizadas |
| Quién asume el riesgo de cantidades | **El contratista** | **La entidad** |
| Naturaleza de las cantidades del pliego | Definitivas | **Estimativo inicial** que puede sobrepasarse |

La distinción esencial entre las dos modalidades «estriba en el ámbito de los riesgos que en una y
otra modalidad se asumen». 🔸

**Y el matiz que vale dinero:** una **adición** solo ocurre cuando se agrega algo **nuevo al alcance
físico** del contrato —una ampliación real del objeto—, **no** cuando simplemente se ajusta el valor
por un cálculo inadecuado de las cantidades estimadas. 🔸 Consecuencia directa: **el tope del 50 % del
artículo 40 de la Ley 80 no se aplica a las mayores cantidades de obra** en un contrato a precios
unitarios, porque no son adición. Es un argumento que muchos contratistas no saben que tienen.

**Implicación práctica.** Añadir a la Lectura 1 del método de las 5 lecturas una **sexta pregunta de
descarte: ¿precio global o precios unitarios?** Si es global, el riesgo de cantidades es tuyo y el
APU debe llevar una reserva mucho mayor; el «I» del AIU de 3–5 % es insuficiente para un global con
diseños flojos.

**Conexión con la app.** `tipo_de_contrato` ya viaja en la proyección (`lib/proyeccion.js`), pero la
modalidad de pago normalmente **no está en el dataset**: vive en el pliego. Lo alcanzable es
**detectar la mención en el objeto** («a precio global», «a precios unitarios») y mostrarlo como
etiqueta de la tarjeta — barato y de alto valor para el Go/No-Go.

**Fuentes:** [Consejo de Estado — precio global vs. unitarios (relatoría ANCP-CCE)](https://relatoria.colombiacompra.gov.co/wp-content/uploads/2024/04/1707325378563-05001233100019970035501.pdf) ·
[Beltrán Pardo — diferencia según el Consejo de Estado](https://www.beltranpardo.com/noticias-juridicas/diferencia-entre-precio-global-y-precio-unitario-consejo-de-estado) ·
[CCE responde: ¿las cantidades son referenciales?](https://www.prensajuridica.com/details/item/37868-%C2%BFlas-cantidades-en-contratos-a-precios-unitarios-son-referenciales-o-convierten-el-contrato-en-precio-global-colombia-compra-responde.html) ·
[Tesis Javeriana — variaciones de precios en global y unitarios](https://repository.javeriana.edu.co/handle/10554/44286)

---

## V-04 · Reajuste de precios e ICOCIV: en un año de SMMLV +23 %

**Qué dice el manual.** Nada sobre reajuste. En el capítulo de costos habla de imprevistos (3–5 %)
pero no de la **cláusula de ajuste**, que es el mecanismo diseñado justo para esto.

**Por qué importa ahora.** El SMMLV 2026 subió **23 %** respecto de 2025. En obra, la mano de obra es
un componente grande del costo directo: un contrato cotizado con salarios de 2025 y ejecutado en 2026
sin cláusula de ajuste **pierde margen por construcción**, no por mala gestión.

**Lo que encontró la investigación.** El índice vigente es el **ICOCIV** (Índice de Costos de la
Construcción de Obras Civiles) del DANE, que **reemplazó al ICCP** (Índice de Costos de la
Construcción Pesada, metodología de 1982) ampliando y actualizando la canasta de materiales por
tipología de obra. El ICOCIV publica variación y contribución **mensual, año corrido y anual, por
grupos de costos e insumos**, y su finalidad declarada es **ajustar los precios unitarios de los
contratos pactados**. El INVÍAS publicó una cartilla de procedimiento de implementación del ICOCIV en
los contratos de obra. 🔸

**Implicación práctica.** Tres preguntas que deben entrar en la Lectura 1:
1. ¿El pliego trae **cláusula de reajuste**? Si no, y el plazo cruza un cambio de año, el riesgo de
   inflación de insumos es enteramente tuyo.
2. ¿Con **qué índice y qué fórmula**? ICOCIV general no es lo mismo que ICOCIV por tipología.
3. ¿Desde **qué fecha base** corre el ajuste?

**Conexión con la app.** No hay puente directo con el dataset — el reajuste vive en el pliego. Pero
sí hay uno indirecto y valioso: en la futura **calculadora de rentabilidad**, un contrato sin
reajuste que cruza diciembre debería llevar una **alerta de riesgo de inflación de insumos**, con el
plazo (`duracion` + `unidad_de_duracion`, que la app ya normaliza en `plazoMesesDe`) como disparador.

**Fuentes:** [DANE — boletín ICOCIV dic-2025](https://www.dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-dic2025.pdf) ·
[DANE — boletín ICOCIV mar-2026](https://www.dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-mar2026.pdf) ·
[INVÍAS — cartilla ICOCIV en los contratos de obra](https://www.invias.gov.co/index.php/archivo-y-documentos/documentos-tecnicos/13724-cartilla-reversion-precios-procedimiento-de-implementacion-del-indice-de-costos-de-la-construccion-de-obras-civiles-icociv/file) ·
[DANE — metodología ICOCIV](https://microdatos.dane.gov.co/index.php/catalog/711)

---

## V-05 · CORRECCIÓN: el manual exagera el efecto de firmar sin salvedades

**Qué dice el manual.** Mandamiento 17 y Capítulo 20.3: *«Nunca firmar el acta de liquidación sin
salvedades»*, y *«Sin salvedad, la vía judicial se te cierra»*. Presentado como absoluto.

**Por qué está mal como absoluto.** La **Sección Tercera del Consejo de Estado unificó
jurisprudencia el 27 de julio de 2023** estableciendo que **la ausencia de salvedades al pactar
suspensiones, prórrogas o modificaciones NO impide analizar de fondo las reclamaciones económicas de
las partes**, porque no existe fundamento legal que exija ese requisito como condición para reclamar:
**las salvedades solo están reguladas y exigidas legalmente para la liquidación bilateral del
contrato**. 🔸

**La regla correcta, matizada:**

- En la **liquidación bilateral** → la salvedad **sí** es determinante. Ahí el manual acierta.
- En **suspensiones, prórrogas, adiciones y otrosí** → **no** es un requisito de procedibilidad. El
  manual, tal como está redactado, llevaría a un contratista a creer que perdió un derecho que
  conserva.
- **Requisito de forma que sí se mantiene:** la salvedad debe ser **concreta y específica**, sobre
  puntos determinados no acordados. **Una salvedad genérica, vaga o indeterminada no sirve.**

**Cómo debe quedar el mandamiento.** «Nunca firmar el acta de **liquidación bilateral** sin salvedades
**concretas y específicas** — y consignarlas también en suspensiones y modificaciones, que aunque
jurisprudencialmente ya no sean requisito para reclamar, siguen siendo la mejor prueba de tu
posición.» Se conserva la conducta; se corrige la razón.

**Fuentes:** [Ámbito Jurídico — salvedades y derecho a reclamación judicial](https://www.ambitojuridico.com/noticias/administrativo/administrativo-y-contratacion/salvedades-en-acta-de-liquidacion-contractual) ·
[Sentencia de unificación (relatoría ANCP-CCE, rad. 25000233600020160173703)](https://relatoria.colombiacompra.gov.co/wp-content/uploads/2025/06/25000233600020160173703.pdf) ·
[Consejo de Estado — liquidación, contenido y salvedades (rad. 27777)](https://www.consejodeestado.gov.co/documentos/boletines/156/S3/05001-23-31-000-1998-00038-01(27777).pdf) ·
[Secretaría Jurídica Distrital — salvedades en los contratos estatales (2025)](https://secretariajuridica.gov.co/sites/default/files/2025-05/Salvedades%20en%20los%20contratos%20estatales.pdf.pdf)

> ⚠️ El radicado exacto de la unificación no pudo descargarse (403). Antes de usarlo en un escrito,
> confirmar número y fecha en la fuente oficial. Ver [temas pendientes](#temas-pendientes-de-investigación).

---

## V-06 · Desequilibrio económico: cómo se prueba de verdad

**Qué dice el manual.** No trata la figura. Habla de reclamar y de documentar, pero no del estándar
probatorio, que es donde se pierden las reclamaciones.

**Lo que encontró la investigación.** Dos exigencias que deciden el caso:

1. **No basta demostrar el incremento o la sobreejecución de una cuenta.** La carga de la prueba
   implica **cuantificar el impacto sobre la ecuación contractual** — es decir, demostrar la
   afectación **grave** de las condiciones del contrato, no solo que algo costó más. 🔸
2. **Oportunidad de la reclamación.** La postura tradicional exigía reclamar **en el momento en que
   se celebran las modificaciones, prórrogas o suspensiones**, no después. Esa postura ha sido
   **morigerada** en sentencias recientes: se analiza caso por caso el contenido del acuerdo y sus
   antecedentes. 🔸 (Es coherente con la unificación de [V-05](#v-05--corrección-el-manual-exagera-el-efecto-de-firmar-sin-salvedades).)

También quedó claro que el Consejo de Estado **distingue incumplimiento contractual de desequilibrio
económico**: no son la misma acción ni tienen los mismos presupuestos. 🔸

**Implicación práctica.** El truco #25 del manual («documenta el hecho el día que ocurre») es
necesario pero **no suficiente**. La foto y el radicado prueban **el hecho**; para ganar hay que
probar **el impacto sobre la ecuación económica**, lo que exige llevar, desde el día uno, un
**modelo económico del contrato** contra el cual medir la desviación. Ese modelo es el flujo de caja
mes a mes del truco #16 — que resulta ser, además de herramienta de precio, **la línea base
probatoria**. El manual nunca conecta las dos cosas.

**Fuentes:** [Consejo de Estado, Sección Tercera, exp. 70364 de 2025](https://normograma.crcom.gov.co/crc/compilacion/docs/05001-23-33-000-2023-00031-01(70364)_20250428.htm) ·
[Francisco Fajardo Abogados — incumplimiento vs. desequilibrio](https://franciscofajardoabogados.com/consejo-de-estado-define-diferencias-entre-incumplimiento-contractual-y-desequilibrio-economico-de-los-contratos-estatales/) ·
[Secretaría Jurídica Distrital — análisis de sentencias sobre desequilibrio económico](https://secretariajuridica.gov.co/sites/default/files/2023-09/Instrumento-de-Gerencia-N-16-final.pdf)

---

## V-07 · Inhabilidad por incumplimiento reiterado: la que mata la empresa en silencio

**Qué dice el manual.** Habla de inhabilidad por colusión (20 años) y de verificar antecedentes del
socio. **No menciona la inhabilidad por incumplimiento reiterado**, que es mucho más frecuente y
mucho menos dramática de provocar: no hace falta un cartel, basta un mal año.

**Lo que encontró la investigación.** Un contratista queda inhábil si en el **mismo año fiscal**
incurre en: 🔸

- **5 o más multas** durante la ejecución de contratos, **o**
- **2 o más declaratorias de incumplimiento** en dos contratos, **o**
- **2 multas y 1 declaratoria de incumplimiento**.

**Duración: 3 años**, contados **desde la inscripción de la última multa o incumplimiento en el
RUP**. Y las entidades estatales tienen el **deber legal de reportar** multas e incumplimientos,
aunque el contratista no esté inscrito en el RUP — con subregistro documentado en la práctica. 🔸

**Implicación práctica.** Dos, y las dos son de gestión:

1. **Hacia adentro:** las multas no son solo dinero, son **munición acumulativa contra tu propia
   habilitación**. Una empresa con 4 multas en un año fiscal está a una multa de desaparecer del
   mercado por tres años. Eso convierte «negociar una multa» en una decisión estratégica, no
   administrativa. El manual no lo advierte.
2. **Hacia el socio:** el «due diligence de 20 minutos» (truco #15) debe contar **multas e
   incumplimientos por año fiscal**, no solo mirar si existen. Un socio con 2 multas este año es un
   riesgo cuantificable, no una mancha genérica.

**Fuentes:** [Castro Nieto — el incumplimiento reiterado como causal de inhabilidad](https://castronieto.co/el-incumplimiento-reiterado-como-causal-de-inhabilidad-para-contratar-con-el-estado/) ·
[vLex — inhabilidad por incumplimiento reiterado](https://vlex.com.co/vid/inhabilidad-incumplimiento-reiterado-590689054) ·
[Portafolio — subregistro en el reporte de multas e incumplimientos](https://www.portafolio.co/economia/gobierno/entidades-publicas-deberan-reportar-multas-e-incumplimientos-de-contratistas-del-estado-494800)

---

## V-08 · CORRECCIÓN: anticipo — el manual se queda corto y en un punto induce a error

**Qué dice el manual.** «Si hay anticipo, va a patrimonio autónomo (fiducia) en contratos de
licitación pública (Ley 1474/2011, art. 91)». Correcto pero **incompleto en tres puntos**.

**Lo que encontró la investigación.** 🔸

1. **Hay un techo legal: el 50 %.** Las entidades pueden pactar anticipo o pago anticipado **siempre
   que no supere el 50 % del valor del contrato**. El manual nunca lo menciona, y es el dato que
   permite saber si un anticipo ofrecido es alto o bajo.
2. **Anticipo ≠ pago anticipado, y la diferencia es de propiedad del dinero.** El **anticipo** es un
   adelanto que **solo se integra al patrimonio del contratista a medida que se amortiza** con la
   ejecución. El **pago anticipado** es pago efectivo: **los recursos son del contratista desde el
   desembolso**. Para el flujo de caja son dos cosas radicalmente distintas, y el manual las trata
   como una sola.
3. **La fiducia tiene excepción.** La exigencia de patrimonio autónomo aplica a obra, concesión,
   salud y licitación pública **salvo que el contrato sea de menor o mínima cuantía**.

Añadido operativo: el anticipo exige un **plan de inversión** que permita a la entidad identificar
las actividades con que se amortiza. No es plata disponible: es plata con cronograma.

**Conexión con la app — y una precisión incómoda.** `lib/negocio.js` extrae `anticipo_pct` del texto
del objeto con expresiones regulares. Esas expresiones **no distinguen anticipo de pago anticipado**.
Como el `puntaje_ponderado` pondera el anticipo al **0.4** —el peso más alto de los tres—, un objeto
que mencione un «pago anticipado» del 30 % puntúa igual que un anticipo del 30 %, cuando para el
flujo de caja el pago anticipado es **mejor** (no se amortiza, no exige fiducia). No es un error de
cálculo, es una **conflación de dos conceptos**; y dado que `anticipo_pct = 0` ya significa «sin
dato», la app tiene dos ambigüedades apiladas en el componente que más pesa. Vale la pena al menos
**distinguir las dos frases en el regex y etiquetarlas distinto en la tarjeta**.

**Fuentes:** [CCE — ¿cuál es la diferencia entre anticipo y pago anticipado?](https://www.colombiacompra.gov.co/archivos/pregunta-frecuente/cual-es-la-diferencia-entre-el-anticipo-y-el-pago-anticipado) ·
[Prensa Jurídica — CCE aclara diferencias y límites](https://www.prensajuridica.com/details/item/38864-colombia-compra-aclara-diferencias-y-l%C3%ADmites-entre-pago-anticipado-y-anticipo-en-contrataci%C3%B3n-p%C3%BAblica.html) ·
[CCE — contratos en los que debe incluirse anticipo](https://sintesis.colombiacompra.gov.co/content/contratos-en-los-que-debe-incluirse-anticipos-0)

---

## V-09 · La contribución del 5 %: base gravable y vigencia

**Qué dice el manual.** «5 % del valor del contrato», Ley 418/1997. Le faltan **la base gravable, el
estado de vigencia y el tratamiento de las adiciones** — los tres detalles que deciden si el número
que sumas al APU es el correcto.

**Lo que encontró la investigación.** 🔸

- **Base gravable:** el 5 % se calcula sobre el **valor total del contrato SIN incluir impuestos**.
  Calcularlo sobre el valor con IVA sobreestima el costo.
- **Aplica también a las adiciones:** quien suscribe contratos de obra pública **o contratos
  adicionales a los existentes** debe pagar la contribución. Una adición del 40 % arrastra su propio
  5 %; si no estaba presupuestado, sale de la utilidad.
- **Vigencia: es permanente.** El artículo 120 de la Ley 418 de 1997, modificado por la **Ley 1106 de
  2006**, fue dotado de **carácter permanente por el artículo 8 de la Ley 1738 de 2014**. Antes de
  2014 la norma se prorrogaba periódicamente (Leyes 548/1999, 782/2002, 1106/2006, 1421/2010), y
  todavía circulan artículos que hablan de «vigente hasta este año»: **están desactualizados**.

**Fuentes:** [DIAN — Oficio 7086 de 2016, contribución del 5 % sin incluir impuestos](https://normograma.dian.gov.co/dian/compilacion/docs/oficio_dian_7086_2016.htm) ·
[Ley 1106 de 2006 — Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=22629) ·
[Secretaría de Hacienda de Bogotá — contribución especial y sus adiciones](https://www.haciendabogota.gov.co/es/sdh/contribucion-especial-por-contrato-de-obra-publica-concesion-de-obra-publica-y-sus-adiciones)

---

## V-10 · Los indicadores habilitantes tienen valores de referencia (y eso hace usable la señal #3)

**Qué dice el manual.** La señal #3 de pliego sastre es «indicadores financieros con precisión rara
(liquidez ≥ 3.7); los razonables son números redondos». Buena intuición — **pero sin valores de
referencia no es operable**. ¿Redondo respecto de qué?

**Lo que encontró la investigación.** Los valores habilitantes típicos en obra pública: 🔸

| Indicador | Exigencia típica |
|---|---|
| Índice de liquidez | **≥ 1.2** |
| Nivel de endeudamiento | **≤ 65 %** |
| Razón de cobertura de intereses | **≥ 2** |

Y un dato de procedimiento que el manual sí insinúa pero no precisa: la verificación de capacidad
financiera y organizacional se realiza sobre la información registrada de **los últimos 3 años
fiscales** anteriores a la inscripción o renovación del RUP.

**Implicación práctica — refuerza el truco #6 y le pone número.** Si la exigencia estándar de
liquidez es 1.2 y un pliego pide 3.7, la desviación es de **más del triple** y el argumento de
pluralidad del truco #19 se puede escribir con cifras en vez de con adjetivos. Y como el RUP mira
**tres años fiscales**, la planeación de octubre del truco #6 no es de un año: **un mal cierre
contamina tres**.

**Conexión con la app.** `lib/perfiles.js` guarda `liquidez` y `endeudamiento` por perfil, y
`lib/capacidad.js` usa la liquidez para el factor CF. Hoy la app **no compara los indicadores del
perfil contra las exigencias típicas del mercado**. Un semáforo estático —«tu liquidez 6.98 supera
holgadamente el estándar 1.2»— es barato y responde la pregunta *«¿me van a habilitar?»*, que es
justo la que el manual dice que hay que resolver en la Lectura 1. Con la advertencia del propio
manual: **superar el habilitante no da puntos**, así que debe presentarse como pasa/no pasa, no como
puntaje.

**Fuentes:** [Cancillería — anexo de requisitos financieros habilitantes](https://www.cancilleria.gov.co/sites/default/files/anexo_requisitos_habilitantes_financieros_1.pdf) ·
[Unidad de Víctimas — guía de indicadores financieros](https://www.unidadvictimas.gov.co/sites/default/files/documentosbiblioteca/guiaindicacoresfinancierosevaluacioncontractualvi.pdf) ·
[Caja de Vivienda Popular — procedimiento de construcción de indicadores habilitantes](https://cvp.gov.co/images/Mapa%20de%20Procesos/Proceso%20de%20Gestion%20Financiera/208-FIN-Pr-23_PROCEDIMIENTO_PARA_LA_CONSTRUCCI%C3%93N_DE_LOS_INDICADORES_FINANCIEROS_HABILITANTES_V1.pdf)

---

## V-11 · Matriz de riesgos previsibles (CONPES 3714)

**Qué dice el manual.** Menciona la audiencia de asignación de riesgos como oportunidad de
interlocución (Palanca 2b) — y ahí se acaba. **No explica qué es la matriz de riesgos ni que forma
parte del contrato.**

**Lo que encontró la investigación.** El **Documento CONPES 3714 de 2011** fija los lineamientos del
concepto de «riesgo previsible» y los criterios para su **tipificación, estimación y asignación**. La
Ley 1150 de 2007 exige tres cosas: que la entidad planee estableciendo los riesgos previsibles; que
la estimación sea **compartida, valorada y complementada por los particulares**; y que las
contingencias se asignen contractualmente. **La matriz de riesgos hace parte integral del pliego y,
por tanto, del contrato que se suscriba.** 🔸 La tipificación incluye expresamente **riesgos
económicos por comportamiento del mercado, como fluctuación de precios de insumos y
desabastecimiento**.

**Implicación práctica.** Es el punto donde [V-04](#v-04--reajuste-de-precios-e-icociv-en-un-año-de-smmlv-23-) se
vuelve jurídico: **si la matriz te asignó a ti el riesgo de fluctuación de precios y firmaste, la
reclamación posterior por mayores costos de insumos nace muerta.** Leer la matriz **antes de
ofertar** —y observarla en el proyecto de pliego si la asignación es abusiva— es tan importante como
leer las causales de rechazo. El manual pone las causales de rechazo en la Lectura 4 y deja la matriz
fuera del método: **debería ser Lectura 4-bis**.

**Fuentes:** [DNP — Documento CONPES 3714 de 2011](https://normograma.mintic.gov.co/mintic/compilacion/docs/conpes_dnp_3714_2011.htm) ·
[Alcaldía de Cali — CONPES 3714 riesgo previsible](https://www.cali.gov.co/juridica/publicaciones/43984/documento-conpes-3714-riesgo-previsible-en-contratacin-pblica/) ·
[Universidad Libre — evolución de la matriz de riesgo en la contratación](https://repository.unilibre.edu.co/bitstream/handle/10901/17435/EVOLUCION%20EN%20LA%20MATRIZ%20DE%20RIESGO%20EN%20LA%20CONTRATACION.pdf?sequence=1&isAllowed=y)

---

## V-12 · Umbrales y cifras de 2026

**Qué dice el manual.** Explica correctamente que la menor cuantía depende del presupuesto anual de
la entidad en SMMLV (truco #3) pero **no da ni un número**, lo que obliga a buscarlos justo cuando se
necesitan.

**Lo confirmado para 2026:**

| Concepto | Valor 2026 | Fuente |
|---|---|---|
| **SMMLV** | **$1.750.905** (+23 % vs. 2025) | Decreto 1469 de 2025 🔸 |
| Auxilio de transporte | $249.095 | Decreto 1470 de 2025 🔸 |
| **Umbral MiPyme** (limitar procesos a MiPymes) | **$511.708.497** | MinCIT / equivalente a US$125.000 🔸 |
| Mínima cuantía | **10 % de la menor cuantía** de la entidad | Ley 1150 art. 2 |

El SMMLV de $1.750.905 **coincide con el valor ya registrado en `CLAUDE.md`** — queda verificado
contra fuente externa.

🚩 **Advertencia de monitoreo:** el aumento del 23 % fue fijado por decreto **sin acuerdo en la mesa
de concertación**, y hay **litigio en curso ante el Consejo de Estado**; existe además un **decreto
transitorio (Decreto 159 de 2026, de 19 de febrero)** que mantiene el aumento mientras se resuelve. 🔸
**Si el decreto se anulara, cambiarían de golpe todos los umbrales denominados en SMMLV** — y con
ellos el `topeSMMLV` de los perfiles, el factor E de la capacidad y la constante `SMMLV` de
`lib/perfiles.js`. Es un riesgo de una sola constante, pero se propaga a toda la app.

**Fuentes:** [Holland & Knight — salario mínimo y auxilio de transporte 2026](https://www.hklaw.com/en/insights/publications/2025/12/colombia-decreta-aumento-del-salario-minimo-y-auxilio-de-transporte) ·
[ConsultorSalud — decreto transitorio y pulso jurídico](https://consultorsalud.com/decreto-transitorio-aumento-del-salario-minimo/) ·
[Decreto 159 de 2026](https://dapre.presidencia.gov.co/normativa/normativa/DECRETO%20No.%200159%20DEL%2019%20DE%20FEBRERO%20DE%202026.pdf) ·
[Beltrán Pardo — umbral MiPymes 2026](https://www.beltranpardo.com/noticias-juridicas/atencion-umbral-para-limitar-procesos-mipymes-en-2026) ·
[CCE — umbrales 2026 de acuerdos comerciales](https://www.colombiacompra.gov.co/archivos/27415)

---

## V-13 · SAGRILAFT: la obligación que aparece al crecer

**Qué dice el manual.** Nada. El Capítulo 17 habla de trazabilidad y de cruces UIAF, pero no dice que
el contratista puede tener **obligaciones propias** de autocontrol.

**Lo que encontró la investigación.** El **SAGRILAFT** (Sistema de Autocontrol y Gestión del Riesgo
Integral de LA/FT/FPADM) está regulado en el **Capítulo X de la Circular Básica Jurídica de la
Superintendencia de Sociedades** y aplica al sector real. Para el **sector construcción y obras de
ingeniería** el umbral de obligatoriedad reportado es haber obtenido, a 31 de diciembre del año
anterior, **ingresos totales iguales o superiores a 30.000 SMLMV**. 🔸

Con el SMMLV 2026, eso equivale a **≈ $52.527 millones** de ingresos anuales. Por debajo del umbral
puede aplicar el **Régimen de Medidas Mínimas**, que es menos exigente pero no es «nada».

**Implicación práctica.** Es una obligación **de escala**: no aplica a la mayoría de contratistas
pequeños, pero **se activa sola al crecer**, y el incumplimiento es sancionable por Supersociedades.
Para una empresa que suma contratos y consorcios, el umbral puede cruzarse sin que nadie lo note.
Conviene revisarlo cada cierre de año junto con el RUP (truco #6).

**Fuentes:** [Pirani — empresas obligadas a implementar SAGRILAFT](https://www.piranirisk.com/es/blog/empresas-obligadas-a-implementar-sagrilaft-colombia) ·
[TusDatos — Capítulo X, SAGRILAFT y medidas mínimas](https://www.tusdatos.co/blog/sagrilaft-supersociedades-modifico-los-plazos) ·
[vLex — guía SAGRILAFT](https://vlex.com/vid/guia-sagrilaft-colombia-implementacion-1067723292)

---

## V-14 · Beneficiario final: la Ley 2195 hace más de lo que el manual dice

**Qué dice el manual.** Menciona la Ley 2195 de 2022 solo como parte del argumento de que «la
trazabilidad cambió». **No dice que impone obligaciones concretas.**

**Lo que encontró la investigación.** 🔸

- El **artículo 12 de la Ley 2195 de 2022** obliga a las entidades estatales a adoptar **medidas de
  debida diligencia para identificar al o los beneficiarios finales** de la persona o estructura con
  la que se celebra el contrato estatal, **incluida la estructura de propiedad**. La obligación recae
  sobre el **ordenador del gasto**, que debe tomar medidas razonables para verificar la identidad.
- El **RUB** (Registro Único de Beneficiarios Finales), creado por la **Ley 2155 de 2021** y
  reglamentado por la **Resolución DIAN 000164 de 2021**, es el registro donde personas jurídicas y
  estructuras sin personería reportan a la DIAN quiénes son las personas naturales que en última
  instancia poseen, controlan o se benefician de la entidad.

**Implicación práctica.** Para el contratista significa que **su estructura societaria es materia de
verificación en cada proceso**, y que un RUB desactualizado es una fricción que aparece en el peor
momento: al firmar. Debe entrar en la **biblioteca documental** del Capítulo 21 con su propia fecha de
actualización, junto al RUP y al certificado de cupo de la aseguradora. El manual no lo lista.

**Fuentes:** [DIAN — presentación oficial del RUB](https://www.dian.gov.co/impuestos/RUB/Documents/Presentacion-oficial-RUB.pdf) ·
[DIAN — preguntas frecuentes RUB](https://www.dian.gov.co/impuestos/RUB/Documents/Preguntas-RUB.pdf) ·
[Supersociedades — Oficio 220-265592 de 2022 sobre beneficiarios finales](https://www.supersociedades.gov.co/documents/107391/2999435/OFICIO+220-265592+DE+2022.pdf/3087dacb-1b3a-7c42-4c1f-513aabb13296?version=1.0&t=1673449278783) ·
[Transparencia por Colombia — diagnóstico del registro de beneficiarios finales (2025)](https://transparenciacolombia.org.co/wp-content/uploads/2025/02/Diagnostico-BF_V05.02.2025.pdf)

---

## V-15 · El dataset `p6dx-8zbt`: lo que sí se pudo confirmar

Ni el manual ni el repositorio documentan el dataset. `lib/indice_competencia.js` dice literalmente
«columnas del dataset (candidatas, **pendiente verificación**)». Esto es lo que se logró confirmar
**sin** acceso directo a `datos.gov.co`.

### Confirmado

| Hallazgo | Detalle |
|---|---|
| **Tamaño del esquema** | El dataset tiene **59 campos** y existe un diccionario de datos oficial con nombre de columna, tipo, ejemplo y mapeo al campo de API |
| **Enumeración de `fase`** | Planeación · Selección · Evaluación · Adjudicación · Contratación · Ejecución |
| **Enumeración de `estado`** | **Activo** · Adjudicado · Desierto · Celebrado |
| **Límites de la API** | **1 000 peticiones por hora móvil con App Token** (dev.socrata.com, consultado el 5-sep-2026); sin token Socrata no publica el cupo. Detekta pagina a **5 000 filas** por petición (corregido el 6-sep-2026: las dos cifras anteriores no tenían fuente) |
| **NITs compartidos** | El equipo de analítica de la propia CCE advierte que **«no hay bases maestras de entidades y proveedores; las entidades pueden compartir NIT entre departamentos, lo que exige limpieza»** |
| **Fechas poco fiables** | «Los campos de fecha en las tablas de SECOP II tienen en general **muchos valores nulos**» |
| **Procesos ≠ contratos** | Identificadores distintos (`id_proceso` vs. `id_contrato`) y datasets distintos |
| **Otros datasets** | `jbjy-vk9h` Contratos Electrónicos · `qmzu-gj57` Proveedores Registrados · `rpmr-utcd` SECOP Integrado · `f789-7hwg` y `xvdy-vvsk` SECOP I. Existen además **cortes periódicos** publicados como datasets aparte (p. ej. `f4px-wghi`, `v2r9-hzfj`, `bt96-ncis`) |

### Tres consecuencias directas para la app

**1. El NIT compartido queda validado por la fuente.** La corrección de agosto de 2026 en
`lib/indice_competencia.js` —no publicar alias para un NIT compartido, y ordenar la búsqueda como
clave canónica → clave legado → alias— **coincide exactamente con la advertencia del equipo de
analítica de la CCE**. No era una precaución excesiva: era el problema conocido del dataset.

**2. 🚩 Hipótesis verificable de alto impacto: el estado `Activo`.** La enumeración documentada de
`estado` incluye **`Activo`**, y `ESTADOS_ABIERTOS` en `lib/filtros.js` **no lo contiene**. Tampoco
contiene `Selección` como valor de `fase`. Dado que la regla del proyecto es **«estado desconocido =
CERRADO, sin fallbacks optimistas»**, cualquier proceso cuyas dos columnas clasificables sean
`estado = "Activo"` y `fase = "Selección"` sería descartado **en silencio**: la full lo excluye de
origen y jamás llega al corpus.

> ✅ **CORREGIDO (ago 2026).** `«activo»` se añadió a `ESTADOS_ABIERTOS`, con prueba de que el cierre
> sigue ganando (`Activo` + fase `Adjudicación` y `adjudicado="Si"` siguen cerrados) y de que un
> estado realmente desconocido sigue contando como cerrado. **Exige relanzar `/api/sync?modo=full`
> una vez**: el filtro de estado corre en la ingesta, así que esos procesos nunca entraron a Redis.
> **Sigue abierto el caso de `fase="Selección"` sin `estado`**: añadir «seleccion» a la lista haría
> que «Seleccionado» pasara a abierto por prefijo —el choque que el propio código advierte—, así que
> eso sí exige mirar antes el embudo de `/api/diagnostico` sobre el corpus real.

**3. Las adiciones y el valor final no están en este dataset.** Están en **Contratos Electrónicos
(`jbjy-vk9h`)**. Esto matiza la propuesta de «banda de descuento» registrada en `CLAUDE.md`: con
`precio_base` y `valor_total_adjudicacion` de `p6dx-8zbt` se calcula el **descuento en la
adjudicación**, que es lo que se necesita para fijar precio. Pero **el valor realmente pagado**
—después de adiciones— vive en el otro dataset. Son dos métricas distintas y no deben mezclarse: la
primera predice cómo se gana; la segunda, cómo se ejecuta.

**Fuentes:** [ANCP-CCE-Analitica — notebook oficial de consulta Socrata](https://github.com/ANCP-CCE-Analitica/datos_abiertos/blob/main/SOCRATA_Consulta.ipynb) ·
[Manual para el uso de Datos Abiertos del SECOP (M-MUDA-02)](https://www.colombiacompra.gov.co/wp-content/uploads/2024/09/manual_de_datos_abiertos_actualizado.pdf) *(403 desde este entorno)* ·
[Dataset en datos.gov.co](https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Procesos-de-Contrataci-n/p6dx-8zbt) *(403)* ·
[Socrata API Foundry](https://dev.socrata.com/foundry/www.datos.gov.co/p6dx-8zbt) *(403)*

---

## V-16 · Interventoría: el otro lado del mostrador

**Qué dice el manual.** Menciona la interventoría como objeto de concurso de méritos y como actor en
la ejecución (firma la bitácora). No explica su relación con el contrato de obra.

**Lo confirmado.** 🔸 La interventoría se selecciona por **concurso de méritos**; es **mecanismo de
vigilancia obligatorio** para los contratos de obra **adjudicados por licitación pública**, y en los
demás casos se exige cuando el seguimiento requiera conocimiento especializado o lo justifique la
complejidad. Su valor suele calcularse como un **porcentaje de los costos directos de la obra, entre
5 % y 10 %**. Se recomienda que el concurso del interventor se inicie **de forma concomitante** con
el proceso de la obra que va a vigilar.

**Implicación práctica.** Dos oportunidades que el manual no señala: **(a)** la existencia de un
proceso de interventoría es un **indicador anticipado** de que viene (o ya salió) el proceso de obra
correspondiente, útil para el rastreador del Capítulo 21; **(b)** para un perfil con capacidad de
consultoría, la interventoría es un mercado adyacente donde **el precio no da puntos** — compite el
equipo, no la tarifa.

**Conexión con la app.** Los RUP del proyecto inscriben códigos de los segmentos 80/81 justamente
porque ahí viven la gerencia de proyectos y la interventoría, y la capa de pertinencia los admite con
`TIPO_CONSULTORIA`. Es decir: **la app ya sirve interventorías**, pero no las distingue de la obra en
la tarjeta. Etiquetarlas ayudaría, porque la estrategia de oferta es distinta.

**Fuentes:** [CCE — ¿en qué consiste el contrato de interventoría?](https://www.colombiacompra.gov.co/archivos/pregunta-frecuente/en-que-consiste-el-contrato-de-interventoria) ·
[DNP — Manual de supervisión e interventoría](https://colaboracion.dnp.gov.co/CDT/Normatividad/Notificaciones/M-CT-02-MANUAL-DE-SUPERVISION-E-INTERVENTORIA.pdf) ·
[Da Vinci Ingeniería — cálculo del valor de la interventoría](https://www.davinci.com.co/interventoria/como-se-calculan-los-costos-precios-y-valores-de-una-interventoria-de-obras-en-colombia/)

---

## V-17 · Reforma al Estatuto en trámite

**Estado: proyecto, no derecho vigente.** En marzo de 2025 se radicó en Cámara el **Proyecto de Ley
554 de 2025**, que propone una reforma integral a la Ley 80 de 1993; existe además el **Proyecto de
Ley 169 de 2024 Cámara**. 🔸 Entre lo propuesto: eliminar los convenios interadministrativos que
permiten subcontratación, un «principio preferencial» de ejecución directa por la entidad, incidente
de objeciones ciudadanas y audiencias públicas obligatorias, y ampliar la capacidad de contratar a
organizaciones comunales y asociaciones campesinas.

**Por qué importa aunque no sea ley.** Si prosperara la eliminación de la subcontratación en
convenios interadministrativos, cambiaría el volumen de obra que llega al mercado por la vía
competitiva — que es exactamente el universo que la app observa. **Hoy no cambia nada. Es un tema de
monitoreo, no de acción.**

**Fuentes:** [Cámara de Representantes — Reforma Ley 80](https://www.camara.gov.co/reforma-ley-80-453/) ·
[Texto del PL 554 de 2025](https://franciscofajardoabogados.com/wp-content/uploads/2025/04/PL.554-2025C-REFORMA-LEY-80.pdf) ·
[Transparencia por Colombia — seguimiento a la reforma](https://transparenciacolombia.org.co/agenda-legislativa/reforma-al-estatuto-de-la-contratacion-estatal/) ·
[Portafolio — alertas sobre la reforma](https://www.portafolio.co/economia/gobierno/reforma-a-la-contratacion-publica-en-colombia-encenderia-alertas-al-incluir-a-organizaciones-comunales-como-contratistas-del-estado-630783)

---

## Sobre la colusión y los hallazgos fiscales: lo que se confirmó

El manual acierta en el fenómeno; la investigación añade **escala**.

**Colusión.** La SIC ha investigado **más de 529 empresas** en **358 procesos de contratación
pública**, con presupuestos que superan los **$3,2 billones**. Hay precedentes específicos en obra e
ingeniería: sanción a firmas de ingeniería por cartelización en una licitación del **INVÍAS**, y
sanciones a integrantes del **Grupo Nule** por acuerdos anticompetitivos ante el ICBF, por unos
**$30.000 millones**. La SIC y la Fiscalía firmaron convenio para reforzar la persecución. 🔸

**Hallazgos fiscales.** En el **primer semestre de 2025**, la Contraloría identificó posibles daños
al patrimonio público por **$1,17 billones**, derivados de **4.196 auditorías**. Los sectores con más
hallazgos son **vivienda, saneamiento básico, educación, infraestructura vial y salud** — es decir,
**el mercado objetivo de este proyecto**. En regalías: **165 proyectos auditados** por más de $2,7
billones con **26 hallazgos fiscales** por más de $189.000 millones. 🔸

**Implicación para la app.** Refuerza el uso avanzado de la Palanca 1: las entidades auditadas
endurecen requisitos al año siguiente. Y matiza la lectura de la baja competencia — en sectores con
alta densidad de hallazgos, «pocos oferentes» merece **más** escrutinio, no menos.

**Fuentes:** [SIC — 358 licitaciones investigadas por colusión](https://www.sic.gov.co/noticias/superindustria-investiga-358-licitaciones-publicas-por-posibles-casos-de-colusion) ·
[SIC — cartelización en licitación del INVÍAS](https://sic.gov.co/noticias/por-cartelizacion-empresarial-al-interior-de-una-licitacion-publica-ante-el-INVIAS-superindustria-sanciona-a-firmas-de-ingenieria) ·
[SIC — sanción Grupo Nule](https://www.sic.gov.co/node/6531) ·
[Infobae — $1,17 billones en hallazgos fiscales, primer semestre 2025](https://www.infobae.com/colombia/2025/07/02/contraloria-destapo-grietas-por-117-billones-en-el-uso-de-recursos-publicos-estos-son-los-sectores-con-mas-hallazgos-fiscales/) ·
[Portafolio — irregularidades en contratos de obra](https://www.portafolio.co/economia/gobierno/contraloria-alerta-por-irregularidades-en-contratos-y-hallazgos-fiscales-en-obras-con-billones-en-recursos)

---

## Lo que NO se encontró

Dicho explícitamente, porque la ausencia de dato también es información:

- **No se encontró** ninguna estadística oficial publicada sobre el **porcentaje de procesos de obra
  declarados desiertos**. Las fuentes describen la figura, no su frecuencia.
- **No se encontró** el **número anual de procesos de obra pública** publicados en SECOP II, ni tasas
  de adjudicación por modalidad, en fuentes accesibles.
- **No se encontró** una estadística nacional del **promedio de oferentes por cuantía**. Existen
  estudios académicos acotados (p. ej. 250 licitaciones de obra 2012-2015; 452 procesos analizados
  por requisitos habilitantes) pero **sus textos completos no fueron accesibles** (403).
- **No se encontró** el **porcentaje de contratos de obra con adiciones**. Solo el marco normativo del
  límite del 50 %.
- **No se pudo confirmar** el **radicado exacto** de la sentencia de unificación sobre salvedades.
- **No se pudo descargar** el **diccionario de datos de las 59 columnas** de `p6dx-8zbt`.

> **Nota metodológica, y es la parte importante:** la app **ya tiene la mejor fuente disponible para
> casi todas estas preguntas** — su propio corpus histórico. `licitaciones:historico:mes:*` acumula
> procesos cerrados con adjudicatario, valor y número de oferentes, y **ninguna purga lo toca**. La
> tasa de desierta, el promedio de oferentes por cuantía y la banda de descuento **son calculables
> localmente** con los datos ya bajados. Buscarlas afuera fue lo correcto para contrastar; no
> encontrarlas no bloquea nada.

---

## Temas pendientes de investigación

Para futuras sesiones. Ordenado por lo que más cambiaría una decisión.

| # | Tema | Por qué quedó pendiente | Cómo cerrarlo |
|---|---|---|---|
| P-01 | **Diccionario de las 59 columnas de `p6dx-8zbt`** | 403 en `datos.gov.co`, `dev.socrata.com` y el manual M-MUDA-02 de CCE | Descargar el [manual de datos abiertos](https://www.colombiacompra.gov.co/wp-content/uploads/2024/09/manual_de_datos_abiertos_actualizado.pdf) desde una red sin restricción, o `GET https://www.datos.gov.co/api/views/p6dx-8zbt.json` |
| P-02 | ~~¿Aparece `Activo` en `estado_del_procedimiento`?~~ → **queda el caso `fase="Selección"` sin `estado`** | `Activo` ya se corrigió; «seleccion» no se añadió porque chocaría por prefijo con «Seleccionado» | **Mirar `/api/diagnostico`** en producción: reparto del embudo en el paso de estado. No requiere nueva extracción |
| P-03 | **Radicado y fecha exactos de la unificación sobre salvedades** | 403 en relatoría CCE y Función Pública | Abrir el [PDF de relatoría](https://relatoria.colombiacompra.gov.co/wp-content/uploads/2025/06/25000233600020160173703.pdf) desde otra red |
| P-04 | **Texto de los documentos tipo v.2 (Res. 539/2025)**: fórmulas de experiencia e indicadores exactos | 403 en colombiacompra.gov.co | Descargar los documentos tipo y **extraer los umbrales reales** para calibrar el semáforo de [V-10](#v-10--los-indicadores-habilitantes-tienen-valores-de-referencia-y-eso-hace-usable-la-señal-3) |
| P-05 | **Tabla oficial de cuantías 2026** por rango de presupuesto de entidad | 403 en el PDF de MinEnergía | Recuperar el PDF; permitiría a la app **predecir la modalidad** por cuantía y entidad (truco #3 automatizado) |
| P-06 | **Estadísticas base**: tasa de desierta, oferentes por cuantía, tasa de adiciones | No publicadas o no accesibles | **Calcularlas del histórico propio** (ver nota metodológica) |
| P-07 | **Efecto medido de la ventana de garantías** sobre nº de oferentes | Requiere análisis del corpus | Comparar oferentes promedio feb–may 2026 vs. resto, con los datos ya en Redis |
| P-08 | **Fórmula de reajuste tipo** con ICOCIV | La cartilla del INVÍAS no se descargó | Bajar la [cartilla INVÍAS](https://www.invias.gov.co/index.php/archivo-y-documentos/documentos-tecnicos/13724-cartilla-reversion-precios-procedimiento-de-implementacion-del-indice-de-costos-de-la-construccion-de-obras-civiles-icociv/file) |
| P-09 | **Trámite del PL 554 de 2025** | Es proyecto en curso | Revisar cada semestre |
| P-10 | **Litigio sobre el Decreto 1469 de 2025** (SMMLV +23 %) | Sin decisión conocida | Monitorear: una anulación **movería todos los umbrales en SMMLV de la app** |
| P-11 | **Umbral SAGRILAFT exacto para construcción** | Fuentes secundarias 🔸 | Verificar el Capítulo X de la Circular Básica Jurídica de Supersociedades |
| P-12 | **Dataset de PAA** en datos.gov.co | No se identificó su ID | Buscarlo; es el insumo de la funcionalidad de mayor ventaja competitiva (truco #9) |

---

## Los 5 hallazgos que cambian lo que sabíamos

1. **El ciclo electoral distorsiona el índice de competencia de la app, y nadie lo sabía.** La ley de
   garantías bloqueó contratación directa entre el 31 de enero y el 31 de mayo de 2026 y convenios
   interadministrativos desde el 8 de noviembre de 2025. El promedio de oferentes de 2 años sobre el
   que se ordenan los resultados mezcla ese período con períodos normales. → [V-02](#v-02--el-ciclo-electoral-y-la-ley-de-garantías-el-vacío-más-grande)
2. **El manual está equivocado sobre las salvedades.** El Consejo de Estado unificó que su ausencia en
   suspensiones y modificaciones **no** impide reclamar; el requisito legal existe para la liquidación
   bilateral. La conducta recomendada se mantiene, la afirmación absoluta no. → [V-05](#v-05--corrección-el-manual-exagera-el-efecto-de-firmar-sin-salvedades)
3. **Los documentos tipo cambiaron de versión con efecto 16 de febrero de 2026**, ampliando el alcance
   a Institucional y Vivienda y rediseñando las fórmulas de experiencia. El manual trata los
   documentos tipo como algo estático. → [V-01](#v-01--documentos-tipo-versión-2-obligatorios-desde-el-16-de-febrero-de-2026)
4. **Precios unitarios vs. precio global es la variable de riesgo que el manual omite** — y con ella,
   que una mayor cantidad de obra **no es una adición** y por tanto no la limita el 50 % del art. 40
   de la Ley 80. → [V-03](#v-03--precios-unitarios-vs-precio-global-y-por-qué-mayor-cantidad--adición)
5. **La propia CCE advierte que las entidades comparten NIT**, lo que valida desde la fuente la
   corrección de identidad de entidad de agosto de 2026 — y su enumeración de estados incluye
   `Activo`, que **no está** en `ESTADOS_ABIERTOS`: una hipótesis de falso negativo silencioso que
   `/api/diagnostico` puede resolver sin desplegar nada. → [V-15](#v-15--el-dataset-p6dx-8zbt-lo-que-sí-se-pudo-confirmar)
