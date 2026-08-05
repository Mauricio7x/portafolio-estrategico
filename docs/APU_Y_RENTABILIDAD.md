# APU automatizado y rentabilidad real de contratos de obra pública en Colombia

> Documento de **investigación y diseño**. No contiene código de implementación.
> Es **ayuda a la decisión**: no es asesoría jurídica ni sustituye a un ingeniero de costos.
> Agosto de 2026.

## Cómo leer este documento

Cada fuente y cada cifra lleva una etiqueta de origen. La convención es literal:

| Etiqueta | Significado |
|---|---|
| `[VERIFICADO]` | Se comprobó en la sesión de investigación. Lleva URL. **Ver la advertencia de abajo sobre qué significa «comprobar» aquí.** |
| `[CONOCIDO]` | Conocimiento sólido pero **no** comprobado en esta sesión. Se indica cómo verificarlo. |
| `[INCIERTO]` | Se cree que existe; no se pudo corroborar. Se indica qué buscar. |
| `[NO HALLADO]` | Se buscó y no apareció. **No equivale a que no exista.** |
| `[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]` | Solo se resuelve consultando `datos.gov.co`, que el entorno de desarrollo no alcanza (allowlist del proxy, `CONNECT 403`). Se da la consulta SoQL exacta. |

**Advertencia sobre el grado de verificación.** Durante la investigación `WebFetch` devolvió **HTTP
403 contra todos los hosts**, no solo contra `datos.gov.co`. Solo funcionó la búsqueda web. Por tanto
`[VERIFICADO]` significa aquí **verificación de segundo grado**: la URL apareció indexada y su
extracto contiene explícitamente el dato afirmado. Confirma que la fuente existe y qué dice el
buscador de ella; **no** confirma la estructura interna de un archivo que nadie abrió. Varias
secciones lo declaran de nuevo en su encabezado, y así debe quedar.

**Advertencia sobre los coeficientes.** Todo número presentado como coeficiente, factor, ponderación
o probabilidad es un **supuesto inicial a calibrar**, salvo que lleve `[VERIFICADO]`. Están marcados
en el texto. La fórmula es el entregable; los números son semilla.

## Resumen ejecutivo

- **La mejor fuente de precios de Colombia es pública y gratuita: los APU Regionalizados de
  Referencia del INVIAS.** Cubren ~140 provincias con precios ya regionalizados —no factores de
  ajuste, sino precios distintos por región— con actualización semestral. Ninguna fuente privada
  ofrece eso gratis. (§1.A.1)
- **Pero solo cubren obra vial.** Para edificación la cobertura de INVIAS e IDU es prácticamente
  cero, y ahí no hay sustituto público: es donde Construdata deja de ser opcional. Confundir
  «cobertura geográfica» con «cobertura de canasta» es el error que haría creer que el problema de
  precios está resuelto. (§1.A.3, §1.B.1)
- **La app ya tiene una fuente de precios propia y no la está usando.** Del corpus histórico se
  deduce la **baja de mercado** (`1 − adjudicado/presupuesto`) por entidad, departamento, tipología y
  modalidad. Es un dato que ningún competidor tiene, cuesta cero y no depende de nadie. Es el
  entregable número uno. (§1.A.5, §2.E)
- **En obra pública colombiana el método de ponderación de la oferta económica se SORTEA en la
  audiencia**, entre los mecanismos que liste el pliego (Ley 1882 de 2018). El proponente elige su
  precio **sin saber** si le tocará media geométrica o menor valor. Consecuencia dura: **ofertar más
  barato no maximiza la probabilidad de ganar**, y cualquier estrategia que suponga conocido el
  método es inaplicable. La respuesta correcta es una ponderación sobre los métodos posibles.
  (§1.E, §2.C.4)
- **El indicador para ordenar oportunidades no es el margen: es el valor esperado de la ganancia.**
  `VEG = P(ganar) · U_esperada − C_preparación`. Un contrato de 200 M al 6 % con 12 oferentes deja
  **−3,0 M**; uno de 1.200 M al 3,0 % con 3 oferentes deja **+7,5 M**. El margen ordena al revés que
  el dinero porque ignora las cuatro cosas que deciden: probabilidad de ganar, tamaño, intensidad de
  capital y el costo de preparar la oferta, que se paga siempre. (§2.C.5)
- **La utilidad decide si vale la pena; la caja decide si se puede.** Son dos números independientes
  y ninguno sustituye al otro. Un contrato puede tener utilidad contable positiva todo el tiempo y
  caja negativa todo el tiempo: se quiebra por caja. Por eso el modelo publica `U_esperada` y
  `K_max` por separado. (§2.C.1)
- **El anticipo no elimina el pico de caja: lo desplaza al final.** Con anticipo del 30 %, desde el
  mes 3 cada acta llega recortada ~44 % por amortización, retenciones y estampillas, y el pico de
  exposición cae en el mes 8. El anticipo compra tres meses de arranque, no la obra. (§2.C.6)
- **La casilla que más mueve el resultado es jurídica, no técnica.** La contribución especial de obra
  pública del **5 %** (art. 6 de la Ley 1106 de 2006, permanente por el par. del art. 8 de la Ley
  1738 de 2014) vale 60,0 M sobre un contrato de 1.200 M — el doble de la utilidad antes de riesgo —
  y **le cambia el signo al veredicto**. Su excepción tradicional para **vías terciarias** puede
  aplicar a una placa huella. No se estima: se lee en el pliego. (§2.A.4, §2.C.3)
- **El IVA en obra se causa sobre el AIU, no sobre el valor del contrato** (D. 1372 de 1992, art. 3,
  compilado en el DUR 1625 de 2016). Modelarlo sobre el valor total infla el costo varias veces. Y la
  reteIVA del 15 % se aplica sobre ese IVA, no sobre el contrato. (§1.C.5, §2.A.4)
- **Los índices del DANE miden variación, no nivel.** El ICOCIV y el ICOCED (que reemplazaron al ICCP
  y al ICCV a partir de 2022 — el ICCP está descontinuado y una fórmula de reajuste que hoy lo
  invoque no tiene serie que aplicar) sirven para **actualizar** un precio en el tiempo, **no** para
  comparar el nivel de precios entre ciudades. Es la trampa metodológica más fácil de cometer al
  regionalizar. (§1.A.6, §1.B.1)
- **El factor regional debe ser multicomponente.** Materiales, mano de obra, equipo y transporte se
  mueven distinto: la mano de obra tiene piso nacional (SMMLV) y apenas varía; el transporte crece
  con la distancia y el tipo de vía. Un solo número por departamento mezcla cosas que no se mueven
  juntas. (§1.B.2)
- **El error del APU es la variable controlable más potente**: elasticidad 24 sobre la utilidad. Un
  error del 4,2 % en el costo directo se lleva toda la utilidad de un contrato típico. Calibrar
  desperdicio y rendimiento contra obras propias vale más que cualquier refinamiento del resto del
  modelo. (§2.C.8)
- **Hay un límite duro que conviene aceptar: con datos públicos no se puede estimar el margen real de
  un contratista**, porque los costos no se publican. Lo que sí se estima es la baja frente al
  presupuesto oficial y las adiciones, que **acotan el margen por arriba**. Confundir una cosa con la
  otra es la trampa conceptual más grande de la Parte 2. (§2.E)
- **La restricción que de verdad ata no es la K de contratación: es el cupo de afianzamiento.** La
  póliza de estabilidad inmoviliza cupo **cinco años**, no los meses del contrato. Es un dato privado
  que hay que preguntarle al dueño. (§2.A.3, §2.C.5)
- **El primer paso concreto cuesta media jornada**: añadir a `/api/diagnostico` un bloque
  `cobertura_historico` que cuente cuántos registros del histórico traen `precio_base`, valor
  adjudicado y n.º de oferentes, y devuelva el nombre exacto de la columna que respondió. Decide el
  resto del plan: si no hay valor adjudicado, tres entregables de la Fase 1 se caen. (§3.6)

## Las diez conclusiones, en una tabla

| # | Conclusión | Evidencia | Qué hacer con ella |
|---|---|---|---|
| 1 | INVIAS publica APU ya regionalizados, gratis, ~140 provincias, semestral | §1.A.1 | Base maestra de la biblioteca de APU (Fase 2) |
| 2 | INVIAS/IDU no cubren edificación | §1.A.3, §1.B.1 | No prometer APU de edificación; ahí Construdata es la única vía |
| 3 | La baja de mercado se deduce del corpus que ya está en Redis | §1.A.5, §2.E | `lib/indice_baja.js` — entregable 2 de la Fase 1 |
| 4 | El método de ponderación se sortea; el más barato no gana | §1.E, §2.C.4 | Ponderar `λ` sobre los mecanismos del pliego; no ofertar al piso |
| 5 | Ordenar por VEG, no por margen | §2.C.5 | `?ordenar_por=veg` en `/api/oportunidades` |
| 6 | La contribución del 5 % es un interruptor binario con excepción de vías terciarias | §2.A.4, §2.C.3 | Leer la clasificación de la vía **antes** de calcular nada |
| 7 | IVA sobre el AIU, no sobre el valor del contrato | §1.C.5 | Corregir cualquier plantilla que lo calcule sobre `V` |
| 8 | Los índices DANE son de variación, no de nivel | §1.A.6, §1.B.1 | Usarlos como cociente temporal; nunca para comparar ciudades |
| 9 | Con datos públicos no se estima el margen ajeno, solo la baja | §2.E | No prometer «margen del competidor»; sí «techo del margen» |
| 10 | El cupo de afianzamiento ata más que la K | §2.A.3, §2.C.5 | Preguntárselo al dueño; es filtro duro, no penalización suave |

## Índice

**Parte 1 — APU funcional, competitivo y automatizado**

| § | Sección | Contenido |
|---|---|---|
| 1.A.1 | INVIAS, IDU, ANI | La fuente maestra: APU regionalizados, catálogo de ítems viales, portafolio del IDU |
| 1.A.2 | Nacionales | FINDETER, Minvivienda, DNP y sus proyectos tipo, Colombia Compra Eficiente, ENTerritorio |
| 1.A.3 | Territoriales | Gobernaciones, alcaldías, EPM/EAAB, y por qué no se rastrean 1.100 municipios |
| 1.A.4 | Privadas | Construdata, CAMACOL/CCI, retail, software de presupuestos, formato BC3, commodities |
| 1.A.5 | SECOP | Qué columnas lee hoy la app, qué precio se puede deducir y qué se construye sin gastar nada |
| 1.A.6 | Índices | ICOCIV, ICOCED, IPC, IPP, SICE-TAC, Banco de la República, combustibles |
| 1.B.1 | Regionalización: evidencia | Variación real por componente, la trampa del índice base 100, DIVIPOLA y distancias |
| 1.B.2 | Regionalización: matriz | Factor multicomponente, forma funcional del transporte, calibración y degradación honesta |
| 1.C | Normativa del APU | Ley 80, Ley 1150, D. 1082, pliegos tipo, anatomía del APU, factor prestacional 2026, AIU y tributos |
| 1.D | Automatización | Tipologías de obra, clasificador en cascada, catálogos de ítems, biblioteca parametrizada, cantidades |
| 1.E | Competitividad | Factor de baja, modelos de adjudicación, precio piso, `P(ganar)`, maldición del ganador |
| 1.F | Actualización | Volatilidad por insumo, cadencia, legalidad del scraping en Colombia, normalización de insumos |
| 1.G | Pliegos | Qué vale de un pliego, acceso a los anexos, extracción de tablas, validación aritmética |
| 1.H | Implementación | Qué cabe en Vercel, almacenamiento, JS vs. Python, LLM en el circuito, costos |
| 1.I | Limitaciones | Precisión alcanzable, lo que ningún modelo ve, riesgo jurídico, checklist de validación humana |

**Parte 2 — Rentabilidad real del contrato**

| § | Sección | Contenido |
|---|---|---|
| 2.A | Anatomía de costos | Directos, indirectos, pólizas, descuentos de acta, financieros, ocultos |
| 2.B.1 | Riesgo territorial | Fuentes municipales de conflicto y acceso, clima, social, índice `R_geo`, regla de veto |
| 2.B.2 | Riesgo financiero y operativo | Score de entidad, ciclo de pago, plazo, mercado, tabla maestra de coeficientes |
| 2.C | **La fórmula** | Ingresos, costos, prima de riesgo, indicadores, ejemplo numérico completo, sensibilidad |
| 2.D | Ley 80 e imprevistos | Ecuación contractual, imprevisto vs. imprevisión, la «I» del AIU, matriz de riesgos, reclamación |
| 2.E | Evidencia empírica | Análisis sobre el corpus propio, el límite del margen ajeno, estudios y clase de referencia |
| 2.F | Casos de borde | Anticipo, precio global, subcontratación, modalidad, vigencias futuras, invariantes del modelo |

**Parte 3 y anexo**

| § | Sección | Contenido |
|---|---|---|
| 3 | Plan de implementación | Tres fases, lo que no se debe hacer, decisiones del dueño, primer paso concreto |
| Anexo | Hoja de fórmulas y fuentes | Bloque de fórmulas, variables de referencia rápida, mapa consolidado de fuentes, invariantes |

## Nota de coherencia

La auditoría automática de coherencia entre secciones **no llegó a ejecutarse** (se agotó el
presupuesto de la sesión de investigación). En su lugar se hizo una revisión manual de las cifras que
aparecen en más de una sección. Resultado:

- **Factor prestacional.** Aparece con valores entre 1,36 y 1,83 en distintas secciones. **No es una
  contradicción**: §1.C.4 lo deriva por escenarios (exoneración del art. 114-1 del E.T., clase de
  ARL) y distingue explícitamente el factor sobre **salario mensual** (1,42–1,58) del factor sobre
  **jornal por día efectivamente laborado** (≈1,78–2,15), advirtiendo que no se use un valor único.
  §2.A separa además el **factor de improductividad** (1,70–1,90), que multiplica y no sustituye. La
  derivación canónica es la de §1.C.4.
- **ICOCIV/ICOCED frente a ICCP/ICCV.** Corregido de forma consistente en las 16 secciones que lo
  mencionan: el ICCP quedó descontinuado y solo sirve para series anteriores a 2022.
- **Sorteo del método de ponderación.** Propagado a las 12 secciones donde afecta la conclusión.
- **Contribución del 5 %.** Consistente en las 7 secciones que la tratan, incluida la excepción de
  vías terciarias, marcada como pendiente de verificar en todas ellas.

Lo que **no** se pudo revisar exhaustivamente es la coherencia de los rangos menores entre §2.A,
§2.B.2 y §2.C. Ante una discrepancia, **manda §2.C**: es la sección que integra y la única cuyo
ejemplo numérico está cerrado aritméticamente.

Una sección, **§3 (plan de implementación), no recibió el pase de crítica adversarial** que sí
recibieron las otras 22; se revisó y se alineó a mano con §2.C, pero conviene leerla sabiéndolo.


---

## 1.A.1 — Fuentes oficiales de infraestructura de transporte (INVIAS, IDU, ANI)

### Nota metodológica sobre la verificación (leer antes que la tabla)

En este entorno **`WebFetch` devolvió HTTP 403 contra todos los hosts probados** (`invias.gov.co`,
`idu.gov.co`, `calidad.idu.gov.co`, `upit.gov.co`, `alcaldiabogota.gov.co`, `onl.dnp.gov.co` y
también dominios no gubernamentales). Es decir: **no se abrió ni una sola página byte a byte**. Lo
que sí funcionó fue `WebSearch`, que devuelve URL indexada + extracto del contenido.

Etiquetas, y se aplican **por dato, no por fila ni por párrafo**:

| Etiqueta | Significado exacto |
|---|---|
| **[VERIFICADO]** | La URL apareció en resultados de búsqueda de esta sesión **y** el extracto indexado contiene **literalmente** el dato que se afirma. Verificación de segundo grado: confirma existencia y contenido indexado, nunca estructura interna de un archivo. |
| **[CONOCIDO]** | Lo sé por entrenamiento, es sólido, no lo confirmé ahora. |
| **[INCIERTO]** | Creo que existe o que es así, no lo pude corroborar. |
| **[NO HALLADO]** | Se buscó y no apareció. **No equivale a que no exista.** Toda afirmación negativa de esta sección lleva esta etiqueta, porque la ausencia en un índice de búsqueda no es evidencia de ausencia en el mundo. |
| **[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]** | Solo se puede confirmar consultando `datos.gov.co`, inalcanzable desde aquí. |

En la tabla del §4 **una fila no lleva una etiqueta única**: se marca celda por celda. Un extracto de
búsqueda puede confirmar «140 provincias» y no puede confirmar «Excel filtrable», «semestral» y «no
hay API» al mismo tiempo.

`datos.gov.co` **no se tocó ni una vez** (allowlist del proxy, `CONNECT 403` ya verificado en el
proyecto).

---

### 1. INVIAS — la fuente maestra, y por bastante margen

#### 1.1 APU Regionalizados de Referencia

Es la única base de precios de obra **pública, gratuita, nacional y regionalizada** de Colombia.

- Cubre **140 provincias / subregiones del territorio nacional, con excepción de Bogotá D.C.**
  La cifra «~140» del encargo es correcta y el excluido es Bogotá (que cubre el IDU). [VERIFICADO]
- La última vigencia publicada es **2025-2**. El texto de la página de INVIAS dice
  «precios con corte a 30 de diciembre de 2025». [VERIFICADO en el texto de la página; **[INCIERTO]
  la fecha de corte real: debe leerse de la carátula del archivo Excel, no del texto de la noticia**]
  **Riesgo de dinero:** si el corte real fuera 30-jun-2025 y no 30-dic-2025, la indexación a agosto
  de 2026 quedaría corta en ~6 meses de ICOCIV. Confirmar la fecha en la hoja de portada del Excel
  **antes** de indexar cualquier precio.
- **Actualización semestral.** El procedimiento contempla explícitamente alternativas: cotizaciones
  de mercado, precios de contratación vigente, precios de provincias vecinas, precios históricos de
  INVIAS indexados a valor presente y precios de insumos similares. [VERIFICADO]
- El valor unitario resultante de cada APU representa **exclusivamente el Costo Directo** (mano de
  obra, materiales, equipo y herramienta), **sin factores indirectos, utilidad, impuestos ni otros
  componentes adicionales**. [VERIFICADO] Esta frase es la que gobierna todo el §5.
- La metodología de regionalización consiste en recolección, verificación, análisis y consolidación
  de **precios de insumos y costos de actividades de obra, factores prestacionales y rendimientos
  de mano de obra y equipo**. Eso implica que el archivo trae rendimientos y factor prestacional,
  no solo precios finales. [VERIFICADO]
- Publicación **por provincias** (no por territorial INVIAS), con **filtrado por provincia,
  categoría, insumo y tipo de obra** — descripción compatible con libro Excel con tablas
  filtrables. [VERIFICADO el descriptor de filtrado; [CONOCIDO] que el contenedor sea `.xlsx`]
- Carácter **estrictamente referencial**: no sustituye el trabajo técnico del consultor, que debe
  sustentar precios y rendimientos según las condiciones del proyecto. Jurídicamente relevante para
  Detecta: un APU generado desde esta base es una **estimación de tanteo**, no un presupuesto
  oficial. [VERIFICADO]
- El 22 de marzo de 2026 INVIAS abrió una **solicitud de información pública** para el «Estudio para
  la Actualización de la Base de Datos de Insumos para Análisis de Precios Unitarios y Actividades
  Representativas en Proyectos de Infraestructura de Transporte – Vigencia 2026». Señal de que
  2026-1/2026-2 está en curso y de que la estructura puede cambiar. [VERIFICADO]
- **No apareció publicación 2026-1** al 4 de agosto de 2026; el dato más reciente localizable sigue
  siendo 2025-2. [NO HALLADO]

#### 1.2 Base de Datos de Insumos

Es la canasta de la que se derivan los APU: precios de materiales, mano de obra, equipo y transporte
por provincia. En la comunicación institucional aparece integrada al mismo paquete de publicación
semestral. La distinción operativa para Detecta: **la canasta de insumos es la tabla normalizable;
el APU es la vista compuesta**. [VERIFICADO que existe y que INVIAS la actualiza; [NO HALLADO] un
archivo separado con URL propia estable]

#### 1.3 Especificaciones Generales de Construcción de Carreteras (EGCC)

Es el **catálogo canónico de ítems de obra vial de Colombia** y la razón por la que los APU de INVIAS
son normalizables: los APU se elaboran conforme a las EGCC vigentes, de modo que el código de ítem
del APU es el número de artículo de la especificación.

- Versión vigente **2022**, adoptada por **Resolución 1524 del 6 de mayo de 2022** y adoptada como
  norma técnica para la Red Vial Nacional por **Resolución 4561 del 29 de noviembre de 2022**.
  Actualización encargada a la Universidad Nacional y la Universidad del Quindío sobre la versión
  2013. [VERIFICADO]
- Estructura por **centenas de artículo**. Confirmado el Capítulo 2 – Explanaciones: artículos 200
  (Desmonte y limpieza), 201 (Demolición y remoción), 203 (Trasplante de árboles), 210 (Excavación
  de la explanación, canales y préstamos), 211 (Remoción de derrumbes), 220 (Terraplenes), 221, 223,
  230-236. [VERIFICADO]
- El resto del esquema — 100 disposiciones generales, 300 afirmados/subbases/bases, 400 pavimentos
  asfálticos, 500 pavimentos de concreto, 600 estructuras y drenajes, 700 señalización y seguridad —
  es **[CONOCIDO]**, no confirmado artículo por artículo. Se verifica abriendo el PDF de las EGCC
  2022 (archivo referenciado como `105_egcc_2022_res_4561_291122.pdf`, ~76 MB [INCIERTO en tamaño y
  nombre exacto]).

#### 1.4 Calculadora de Costos de la UPIT

**Calculadora de Costos de Proyectos Tipo de Infraestructura de Transporte**, de la **UPIT (Unidad
de Planeación de Infraestructura de Transporte, adscrita al Ministerio de Transporte)**, presentada
junto con INVIAS y **alimentada con precios de INVIAS**. La UPIT no es dependencia de INVIAS: son
dos entidades distintas que publicaron la herramienta conjuntamente.

- Estima **costos directos de 199 tipos de intervención** para vías **secundarias y terciarias**, en
  las mismas **140 provincias**, sobre los APU Regionalizados de INVIAS. [VERIFICADO]
- Documento de octubre de 2025 declara actualización **«a primer semestre de 2025»** — es decir, la
  calculadora va un semestre por detrás de la publicación de APU. [VERIFICADO]
- Dominio propio **`upit.gov.co`**, con la herramienta en `upit.gov.co/calculadora-de-costos/` y guía
  de uso en PDF bajo `upit.gov.co/wp-content/uploads/2025/07/…`. [VERIFICADO: el dominio y ambas
  rutas aparecieron literalmente en resultados de búsqueda de esta sesión]

Útil como *benchmark* de contraste (¿mi APU da el mismo orden de magnitud que el oficial?), no como
base de datos: entrega costo directo agregado por tipo de intervención, no el desglose por insumo.

---

### 2. IDU (Bogotá) — la fuente que cubre el hueco que INVIAS deja

INVIAS excluye Bogotá D.C. explícitamente; el IDU es quien la cubre.

- El sistema se llama **SIIPVIALES**; la base vive en su **Componente Económico**, subcomponente
  **«Canasta de Insumos y Análisis de Precios Unitarios (APUs)»**, base de precios unitarios de
  referencia para obras del Sistema de Movilidad y Espacio Público de la ciudad. [VERIFICADO]
- **Actualización semestral**, bajo protocolo metodológico con rigor y consistencia estadística.
  [VERIFICADO]
- Procedimiento formal documentado: **PRIC01 «Actualización de la base de datos de precios de
  referencia», versión 9 (2025)**, en el mapa de procesos del IDU. Es la mejor fuente para entender
  periodicidad y gobierno del dato. [VERIFICADO por indexación; PDF no abierto]
- El dato más reciente localizado es **«APU Base 2025-I Fase II + costos de mano de obra»**, con
  ajuste por la **Ley 2101 de 2021**. [VERIFICADO]

**Qué cambia exactamente la Ley 2101 de 2021 (y qué no).** La ley reduce la **jornada máxima legal
semanal de 48 a 42 horas de forma escalonada**, con el tramo gradual entre el 15 de julio de 2023 y
el 15 de julio de 2026 (último paso: 44 → 42 h). [VERIFICADO] La ley establece expresamente que la
reducción **no implica** reducción de salario ni de prestaciones ni del valor de la hora ordinaria.
[VERIFICADO]

Consecuencia para un APU: sube el **costo por hora efectiva** de cuadrilla y obliga a **recalcular
rendimientos** expresados en cuadrilla-día. El **factor prestacional en sentido estricto**
(prestaciones sociales + parafiscales + seguridad social como porcentaje del salario) **no lo cambia
esa ley** — aunque sí cambia su denominador de horas si el FP se expresa por hora trabajada.
Confundir las dos cosas lleva a aplicar el ajuste dos veces o al componente equivocado. Por eso los
precios de mano de obra de vigencias anteriores **no son comparables sin ajuste**: hay que verificar
en la memoria metodológica del archivo **qué jornada supone** cada vigencia. [CONOCIDO en cuanto a la
mecánica del ajuste; la jornada supuesta por cada archivo es [PENDIENTE — leer la memoria]]

- Canal de consulta: **precios.referencia@idu.gov.co** (Dirección Técnica de Inteligencia de Negocios
  e Innovación, DTINI). [VERIFICADO]
- El IDU publica su propio catálogo de **Especificaciones Técnicas Generales (ET-IC-01)** con
  codificación propia (ej. `800-18 Pavimentos de concreto hidráulico`). **No es el mismo catálogo de
  ítems que el de INVIAS**: mapear IDU↔INVIAS exige tabla de equivalencias manual. [VERIFICADO]

---

### 3. ANI — no se halló base pública de precios unitarios [NO HALLADO]

**No apareció ninguna base de APU ni de precios de referencia de obra publicada por la ANI**
[NO HALLADO]. Es coherente con su modelo: la ANI no contrata obra por precios unitarios, contrata
concesiones por disponibilidad y niveles de servicio, donde el precio lo forma el modelo financiero
del concesionario. [CONOCIDO] Lo que sí aporta, y que es insumo de la Parte 2 (riesgo y
estructuración):

- **Cifras agregadas CAPEX/OPEX por programa.** 4G: CAPEX del orden de **$58,14 billones** y OPEX
  **$57,99 billones**, a precios de **diciembre de 2022** [VERIFICADO]. 5G: CAPEX ~**$11,88
  billones** y OPEX ~**$10,09 billones**; **la base de precios del 5G NO está confirmada**
  [INCIERTO — verificar la fecha de referencia en el documento fuente de la ANI, porque el programa
  5G se estructuró a partir de 2020 y suele expresarse en pesos de una fecha distinta a la del 4G].
  **El OPEX de cada programa es acumulado a lo largo de la vida de las concesiones (~25-30 años)**,
  no un flujo anual ni un gasto puntual: compararlo de frente contra un CAPEX induce a error.
  **Estas cifras no son insumo de APU ni de esta sección; se dejan solo como orden de magnitud para
  la Parte 2.**
- **Matrices de riesgo** modelo publicadas en sus procesos de contratación, construidas sobre la
  **política de riesgo contractual del Estado en proyectos de participación privada — CONPES 3107 de
  2001 y su modificación CONPES 3133 de 2001** [VERIFICADO: el CONPES 3107 es «Política de manejo
  del riesgo contractual del Estado para procesos de participación privada en infraestructura» y el
  3133 lo modifica] — y, para las 4G/5G, sobre la **Ley 1508 de 2012 (APP)** y su reglamentación
  [CONOCIDO]. El **CONPES 3714 de 2011** y las guías de riesgo de CCE bajo el **Decreto 1082 de
  2015** aplican a la **tipificación de riesgo previsible en contratación pública general**, no a la
  asignación de riesgos de una concesión. [CONOCIDO — verificar la matriz concreta de cada proceso]
- **Guía de implementación del modelo financiero 4G** (`GADF-I-011`) publicada en su SIG.
  [VERIFICADO por indexación]

---

### 4. Tabla de fuentes

Etiqueta **por celda**. Donde una celda no lleva marca, hereda **[CONOCIDO]**.

| Fuente | URL | Acceso | Formato | Cobertura | Frecuencia | Último dato | Descarga programática |
|---|---|---|---|---|---|---|---|
| INVIAS — APU Regionalizados de Referencia | `invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/` [VERIFICADO como URL indexada, pero **el ID `4149` puede cambiar**. Ruta robusta: invias.gov.co → Información institucional → Hechos de Transparencia → Análisis de Precios Unitarios] | Gratuito, sin registro [VERIFICADO] | Filtrable por provincia/categoría/insumo/tipo de obra [VERIFICADO]; contenedor Excel [CONOCIDO] | 140 provincias, todo el país salvo Bogotá D.C. [VERIFICADO] | Semestral [VERIFICADO] | 2025-2; corte declarado 30-dic-2025 [INCIERTO — leer la carátula del archivo] | **No se halló API** [NO HALLADO]. Patrón de descarga `invias.gov.co/loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=NNNN`, `idFile` opaco y cambiante [CONOCIDO] |
| INVIAS — sección «Hechos de Transparencia › Análisis de Precios Unitarios» | `invias.gov.co/index.php/informacion-institucional/hechos-de-transparencia/analisis-de-precio-unitarios` [VERIFICADO — el slug con singular «precio» apareció literalmente indexado; no es errata] | Gratuito [VERIFICADO] | HTML + adjuntos | Nacional [VERIFICADO] | Semestral [VERIFICADO] | 2025-2 [VERIFICADO] | No se halló [NO HALLADO] |
| INVIAS — Base de Datos de Insumos (canasta) | Mismo portal; RFI de actualización vigencia 2026 publicada 22-mar-2026 [VERIFICADO] | Gratuito | Excel [CONOCIDO] | 140 provincias [VERIFICADO] | Semestral / estudio anual | 2025-2; estudio 2026 en curso [VERIFICADO] | No se halló [NO HALLADO] |
| INVIAS — EGCC 2022 (Res. 1524/2022 y 4561/2022) | `invias.gov.co/publicaciones/4154/documentos-tecnicos/` [INCIERTO — ID numérico no reconfirmado. Ruta robusta: invias.gov.co → Documentos técnicos / Normatividad técnica] | Gratuito | PDF (~76 MB) [INCIERTO] | Nacional [VERIFICADO] | Por resolución (2013 → 2022) [VERIFICADO] | 2022 [VERIFICADO] | No se halló [NO HALLADO] |
| **CCE — Documentos Tipo de obra pública de infraestructura de transporte (Ley 2022 de 2020)** | `colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo` y `…/documentos-tipo-v2` [VERIFICADO como URL indexada] | Gratuito [VERIFICADO] | PDF / Word | Nacional, obligatorios [VERIFICADO que existen bajo Ley 2022 de 2020] | Por versión (se localizó referencia a «Versión 04» de licitación de obra pública de transporte) [VERIFICADO] | **Verificar versión vigente antes de usar** [PENDIENTE DE VERIFICAR] | No |
| UPIT — Calculadora de Costos (vías secundarias y terciarias), con precios INVIAS | `upit.gov.co/calculadora-de-costos/` [VERIFICADO] | Gratuito [VERIFICADO] | Web | Nacional, 140 provincias, 199 intervenciones [VERIFICADO] | Con cada actualización INVIAS [CONOCIDO] | Precios 1.er semestre 2025 [VERIFICADO] | No se halló [NO HALLADO] |
| IDU — SIIPVIALES, Canasta de Insumos y APUs | `idu.gov.co/page/siipviales/economico/portafolio` [INCIERTO — ruta no reconfirmada byte a byte] | Gratuito | Excel/PDF + visor web [CONOCIDO] | Bogotá D.C. [VERIFICADO] | Semestral [VERIFICADO] | APU Base 2025-I Fase II [VERIFICADO] | No se halló [NO HALLADO] |
| IDU — PRIC01 v9, procedimiento de actualización | `idu.gov.co/Archivos_Portal/…/PRIC01_…_V9.pdf` [INCIERTO — la ruta larga no se reconfirmó; el documento y su versión sí] | Gratuito | PDF | Bogotá | v9 en 2025 [VERIFICADO] | 2025 [VERIFICADO] | Descarga directa por URL [CONOCIDO] |
| ANI — matrices de riesgo, guías de modelo financiero, CAPEX/OPEX | `ani.gov.co` [VERIFICADO que el portal aloja CONPES 3107 y 3133] | Gratuito | PDF | Nacional (concesiones) | Por proyecto | 2024-2025 [INCIERTO] | No se halló [NO HALLADO] |
| AEROCIVIL | `aerocivil.gov.co` | Gratuito | PDF dentro de procesos [CONOCIDO] | Aeropuertos | Sin periodicidad | — | **No se halló base de APU publicada** [NO HALLADO]; lo probable es que solo publique APU dentro de pliegos [CONOCIDO] |
| Gobernación del Valle del Cauca — precios de referencia de obra civil | `valledelcauca.gov.co/documentos/16745/listado-de-precios-de-referencia/` [VERIFICADO como URL indexada] | Gratuito | PDF (decreto + listado) | Valle del Cauca [VERIFICADO] | Anual [CONOCIDO] | Decreto 1.22-0475 de 19-ago-2025 (antes 1.22-1441 de 14-ago-2024) [VERIFICADO] | No se halló [NO HALLADO] |
| Gobernación de Boyacá — precios unitarios de obra pública | datos.gov.co, datasets `ae7u-y7m2`, `feht-feft`, `tuvr-amc2`, `cnhu-kqdz` | Gratuito | Socrata (JSON/CSV) | Boyacá | Irregular; base declarada Res. 019 de 6-feb-2017 | Antiguo (2017) | **Sí, API Socrata** | Toda la fila: [PENDIENTE DE VERIFICAR EN PRODUCCIÓN] |
| Findeter — listados de precios fijos por convocatoria | `findeter.gov.co/system/files/convocatorias/…` [INCIERTO — patrón de ruta] | Gratuito | PDF | Nacional (proyecto a proyecto) | Por convocatoria | 2021-2022 en los hallados [VERIFICADO] | No se halló [NO HALLADO] |
| EAAB — Listado de precios de referencia SAI | `acueducto.com.co` (repositorio de contratación) | Gratuito | PDF | Bogotá, redes de acueducto/alcantarillado [VERIFICADO] | Irregular | 2022 en el hallado [VERIFICADO] | No se halló [NO HALLADO] |
| EMCALI — Lista de precios oficial | `emcali.com.co/documents/d/guest/lista-de-precios-emcali-2025-oficial` [VERIFICADO como URL indexada] | Gratuito | XLSX [VERIFICADO por el nombre del recurso] | Cali | Anual [CONOCIDO] | 2025 [VERIFICADO] | Descarga directa [CONOCIDO] |
| Secretaría de Educación de Bogotá — precios de referencia de ítems de obra | `educacionbogota.edu.co` | Gratuito | PDF | Bogotá, edificación educativa [VERIFICADO] | Irregular | 2022 [VERIFICADO] | No se halló [NO HALLADO] |
| IDRD — precios unitarios, juegos y dotaciones de referencia | `idrd.gov.co/construcciones/precios-unitarios-juegos-y-dotaciones-de-referencia` [VERIFICADO como URL indexada] | Gratuito | Web/archivos | Bogotá, parques y escenarios [VERIFICADO] | Irregular | — | No se halló [NO HALLADO] |
| DANE — ICOCIV (ex ICCP), costos de construcción de obras civiles | `dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-<mes><año>.pdf` [VERIFICADO] | Gratuito | PDF + series | Nacional y regional | Mensual [VERIFICADO] | Boletín de **marzo 2026**, con fecha de publicación **30-abr-2026** en la portada del propio boletín [VERIFICADO — `bol-ICOCIV-mar2026.pdf` indexado; el de feb-2026 lleva fecha 31-mar-2026, mismo rezago de ~un mes]. Aun así, **confirmar la última publicación en el calendario de operaciones estadísticas del DANE antes de usarla** | Descarga directa de boletines y anexos [CONOCIDO] |
| DANE — ICOCED (ex ICCV), costos de edificaciones | `dane.gov.co` | Gratuito | PDF + series | Nacional, varios dominios | Mensual [CONOCIDO] | 2026 [INCIERTO] | Descarga directa [CONOCIDO] |
| CCE — Guía para la Elaboración de Estudios del Sector | `colombiacompra.gov.co/wp-content/uploads/2025/05/Guia-para-elaboracion-ESE-comentarios.pdf` [VERIFICADO como URL indexada] | Gratuito | PDF | Nacional | Por versión | Borrador en comentarios, may-2025 [VERIFICADO] | Descarga directa [CONOCIDO] |
| Construdata / Legis (precios de construcción y edificación) | `construdata.com` | **De pago, por suscripción** [CONOCIDO] | Web/Excel | Nacional | Trimestral [CONOCIDO] | — | No [CONOCIDO] |

---

### 5. ¿Qué tan directamente utilizable es el APU de INVIAS como base maestra?

**Veredicto: es la mejor base disponible y sirve, pero no es una base de datos — es una publicación
ofimática que hay que convertir en base de datos, y esa conversión es el trabajo real.**

#### 5.1 Estructura de registros (esquema objetivo) — [HIPÓTESIS hasta abrir el archivo]

Un APU de INVIAS es un documento jerárquico de dos niveles. El esquema normalizado al que hay que
llevarlo, **a confirmar contra el Excel real antes de escribir un parser**:

| Entidad | Campo | Tipo | Notas |
|---|---|---|---|
| `item` | `codigo_item` | texto | Número de artículo EGCC (ej. `220.1`) |
| `item` | `descripcion` | texto | Texto de la actividad |
| `item` | `unidad` | texto | m³, m², ml, kg, día, glb |
| `item` | `provincia` / `departamento` | texto | Clave de regionalización (140 valores) |
| `item` | `vigencia` | texto | `2025-2`; `fecha_corte` **a leer de la carátula**, no del texto de la noticia |
| `item` | `costo_directo` | número | Suma de componentes; **sin AIU ni IVA** |
| `componente` | `codigo_item` (FK), `tipo` | enum | `material` \| `mano_de_obra` \| `equipo` \| `transporte` |
| `componente` | `insumo_codigo`, `insumo_desc`, `insumo_unidad` | texto | Enlaza con la canasta de insumos |
| `componente` | `cantidad` | número | Por unidad de ítem |
| `componente` | `precio_unitario` | número | COP a la fecha de corte |
| `componente` | `valor_parcial` | número | cantidad × precio |
| `mano_de_obra` | `n_obreros`, `jornal_diario`, `factor_prestacional`, `rend_dia` | número | `rend_dia` = unidades de ítem por cuadrilla-día |
| `equipo` | `n_equipos`, `tarifa_hora`, `horas_por_dia`, `rend_dia` | número | |

**Fórmula del costo directo, con unidades explícitas** [HIPÓTESIS hasta abrir el archivo]:

```
CD_item = Σ(cant_material × precio_material)
        + Σ(n_obreros × jornal_diario × FP / rend_dia)
        + Σ(n_equipos × tarifa_hora × horas_por_dia / rend_dia)
        + Σ(transporte)
```

`rend_dia` = **unidades de ítem producidas por cuadrilla-día**. Si el archivo de INVIAS expresa el
rendimiento en horas, o en días-cuadrilla por unidad (el inverso), **convertir antes de operar**: es
el punto donde más se equivoca un ETL de APU, y mezclar «día» con «hora» sin factor de conversión
produce errores de hasta 8× en el componente de equipo.

**Del costo directo al precio de oferta.** El precio de oferta añade el **AIU** (administración,
imprevistos, utilidad). En materia de IVA hay que distinguir dos regímenes que se confunden a
menudo:

- **Contratos de construcción de bien inmueble** (el caso de la obra civil): el IVA se causa sobre
  los **honorarios pactados del constructor** y, a falta de honorarios, sobre la **utilidad**, base
  que **no puede ser inferior a la utilidad comercial** de contratos iguales o similares —
  **artículo 3 del Decreto 1372 de 1992, compilado en el artículo 1.3.1.7.9 del DUR 1625 de 2016**.
  [VERIFICADO]
- **NO aplica el artículo 462-1 del E.T.** (base gravable especial = AIU, mínimo 10 % del valor del
  contrato), que está **reservado a servicios integrales de aseo y cafetería, vigilancia autorizada
  por la SuperVigilancia, servicios temporales de empresas autorizadas por MinTrabajo y
  cooperativas y precooperativas de trabajo asociado**. [VERIFICADO]

Aplicar el régimen equivocado es facturar mal el IVA. **Verificar el tratamiento pactado en cada
minuta antes de cotizar.**

#### 5.2 Fricciones reales de ingesta

1. **No se halló API ni JSON** [NO HALLADO]. Descarga por navegador; los enlaces observados son
   `loader.php?...&idFile=NNNN`, con identificador opaco que cambia en cada publicación [CONOCIDO].
   No hay endpoint estable que se pueda «cronear».
2. **140 archivos (o 140 hojas)**, uno por provincia. La normalización es un ETL de una vez por
   semestre, no un fetch en caliente. Encaja con el patrón de Detecta: bajarlo una vez, normalizar,
   guardarlo en Redis o en `data/` como JSON.
3. **Sin identificador estable garantizado entre vigencias** [INCIERTO]. Si el catálogo de ítems
   cambia entre 2025-2 y 2026-1, la comparación semestre a semestre exige *fuzzy matching* por
   descripción.
4. **Precios congelados a la fecha de corte de la vigencia.** Para un APU en agosto de 2026 hay que
   indexar con el **ICOCIV del DANE** por grupo de costo (materiales / mano de obra / maquinaria y
   equipo / transporte), no con IPC. Ese es el uso correcto del índice — con tres advertencias:
   - El ICOCIV es un **índice de VARIACIÓN con año base**, no un nivel de precio. Se usa **solo como
     cociente**: `factor = ICOCIV(mes_destino) / ICOCIV(mes_corte)`. Nunca como precio.
   - **Verificar el año base** y, si el rango cruza el empalme, **usar la serie empalmada que publica
     el DANE**: el ICOCIV **reemplazó al ICCP** (construcción pesada) a partir de 2022, y encadenar
     dos series con bases distintas sin empalme da un error silencioso. [VERIFICADO el reemplazo
     ICCP→ICOCIV; [CONOCIDO] la existencia de serie empalmada — confirmarla en la sección de
     información histórica del ICOCIV]
   - **Para el ajuste CONTRACTUAL manda la fórmula pactada en el pliego**, que con frecuencia es IPC
     u otro índice. El ICOCIV es para la **estimación interna del contratista**, no para fundamentar
     una reclamación de reajuste.
   Órdenes de magnitud recientes, solo para dimensionar: variación mensual de **1,02 % en marzo de
   2026** (frente a 0,76 % en marzo de 2025) y **2,40 % en enero de 2026** (frente a 1,89 %); en la
   lectura anual reportada, **mano de obra +8,72 %**, transporte +2,12 %, equipo +1,32 %.
   [VERIFICADO en comunicaciones del DANE indexadas; **usar siempre las cifras del boletín, no
   estas**]
5. **El APU es costo directo: el AIU no viene y hay que estimarlo aparte.** El propio INVIAS lo dice
   («sin incluir factores indirectos, utilidad, impuestos ni otros componentes») [VERIFICADO]. Pero
   **el margen real no lo fija solo el AIU** — lo fijan:
   - **(a) los rendimientos reales frente a los del APU** (es donde se pierde plata en obra),
   - **(b) la BAJA frente al presupuesto oficial**, y
   - **(c) el método de ponderación**, que en obra pública de infraestructura de transporte **se
     SORTEA en la audiencia de adjudicación** entre varias fórmulas alternativas (media geométrica
     con presupuesto oficial, media geométrica sin presupuesto oficial, media aritmética, menor
     valor, entre otras), con el mecanismo aleatorio anclado a los últimos dígitos de la TRM vigente
     el día de apertura del sobre económico. [VERIFICADO que el método se escoge por mecanismo
     aleatorio en audiencia y que «media geométrica con presupuesto oficial» y «menor valor» son
     fórmulas del esquema; la lista exacta de alternativas de la versión vigente es
     [PENDIENTE DE VERIFICAR] contra el pliego tipo]

   **Bajo ese esquema el precio más bajo no gana necesariamente**: si sale sorteada una fórmula de
   media, ofertar muy por debajo del promedio **queda fuera del rango ganador**. Cualquier
   herramienta que sugiera «bajar para ganar» está modelando mal la adjudicación.

#### 5.3 Qué NO cubre el catálogo de INVIAS y de dónde sacarlo

El catálogo de INVIAS es **obra vial**: explanaciones, afirmados/subbases/bases, pavimentos
asfálticos y de concreto, estructuras y drenajes, señalización y seguridad vial. **No cubre**:

| Vacío de cobertura | Fuente sustituta | Calidad |
|---|---|---|
| Edificación (institucional, educativa, salud) | Findeter (listas de precios fijos por convocatoria), Secretaría de Educación de Bogotá, Construdata (pago) | Fragmentaria, por proyecto |
| Acueducto y alcantarillado (redes) | EAAB–SAI (Bogotá), EMCALI (Cali), gobernaciones | Regional, no nacional |
| Espacio público, urbanismo, andenes, ciclorrutas | IDU (Bogotá) | Buena, pero solo Bogotá |
| Parques, escenarios deportivos, dotaciones | IDRD (Bogotá) | Solo Bogotá |
| Redes eléctricas, alumbrado, telecomunicaciones | Operadores y pliegos; no se halló base pública nacional [NO HALLADO] | Mala |
| Precios departamentales fuera de Bogotá | Valle del Cauca (decreto anual), Boyacá (Socrata, desactualizado) | Muy desigual |

**La fuente adicional que Detecta ya tiene en casa.** Aquí hay que ser preciso con qué es cada
número:

`p6dx-8zbt` trae **`precio_base`, que es el PRESUPUESTO OFICIAL de la entidad, no el precio
adjudicado**. Filtrar por `estado_del_procedimiento='Adjudicado'` **no** lo convierte en precio
revelado: sigue siendo el techo del pliego. Para **precio revelado** hay que leer el **valor de
adjudicación del keyspace histórico** (`licitaciones:historico:mes:*`, que en Detecta ya guarda la
proyección histórica con datos de adjudicación) y calcular:

```
BAJA = 1 − valor_adjudicado / precio_base
```

El **$/km, $/m² o $/unidad útil se calibra sobre el valor adjudicado**; el `precio_base` solo sirve
como **denominador de la baja**. Calibrar $/km contra `precio_base` es calibrar contra el techo del
pliego — es decir, ignorar la baja, que es exactamente el error que convierte una utilidad estimada
en una pérdida real.

Ni siquiera con el valor adjudicado sale un APU por ítem: falta la **cantidad de obra** (km, m², m³),
que el dataset no trae. Se tendría que inferir del objeto o bajar el formulario de presupuesto del
proceso.

Consulta de comprobación (a lanzar en producción; este entorno no alcanza `datos.gov.co`):

```
https://www.datos.gov.co/resource/p6dx-8zbt.json
  ?$select=departamento_entidad,
           count(*) AS n,
           avg(precio_base) AS presupuesto_oficial_medio,
           avg(valor_adjudicado) AS adjudicado_medio
  &$where=estado_del_procedimiento='Adjudicado'
     AND modalidad_de_contratacion LIKE 'Licitación%'
     AND codigo_unspsc LIKE '72%'
     AND <columna_fecha> > '2025-01-01T00:00:00.000'
  &$group=departamento_entidad
  &$order=n DESC
```

Advertencias de uso de esa consulta, todas con precedente en el proyecto:

- **`<columna_fecha>`, `valor_adjudicado`, `codigo_unspsc` y `modalidad_de_contratacion` son nombres
  a confirmar** [PENDIENTE DE VERIFICAR EN PRODUCCIÓN]. Un `$select` o `$where` con una columna
  inexistente devuelve **400** en Socrata. Confirmar primero con
  `https://www.datos.gov.co/resource/p6dx-8zbt.json?$limit=1` y leer las claves reales del objeto.
  El proyecto ya documenta que la columna de fecha de cierre **cambia de nombre según la
  modalidad**, así que no hay una única respuesta.
- El filtro **UNSPSC + modalidad no es opcional**: sin él el promedio mezcla obra, consultoría y
  suministro y no significa nada. `72%` es el segmento de construcción; ajustar al filtro de obra que
  ya usa Detecta (`lib/unspsc.js`) si se quiere consistencia con el resto de la app.
- Un promedio por departamento **no es un $/km**: es un tamaño medio de contrato. El $/km exige la
  cantidad de obra, que no está en el dataset.

Y para el dataset de Boyacá: `https://www.datos.gov.co/resource/ae7u-y7m2.json?$limit=50000`
(confirmar antes los nombres de columna con `$limit=1`).

#### 5.4 El «I» del AIU: imprevistos NO es fuerza mayor

Es la confusión que más dinero cuesta y conviene dejarla escrita:

- El **«I» del AIU cubre los riesgos PREVISIBLES que la matriz de riesgos del proceso asignó al
  contratista** — tipificación, estimación y asignación conforme al **artículo 4 de la Ley 1150 de
  2007** y al **Decreto 1082 de 2015**. [CONOCIDO]
- **NO cubre fuerza mayor, caso fortuito ni hecho del príncipe.** Esos son causal de suspensión o de
  **restablecimiento del equilibrio económico del contrato** y se tramitan aparte, por vía de
  reclamación, no descontándolos del AIU. [CONOCIDO]
- Consecuencia práctica: **dimensionar el «I» contra la matriz de riesgos publicada del proceso**,
  no contra un porcentaje de costumbre. Un contratista que trate los imprevistos como cobertura de
  fuerza mayor ni provisiona los riesgos que el pliego le asignó, ni reclama restablecimiento cuando
  le corresponde.
- **De dónde sale el número del AIU:** del **formulario de presupuesto oficial de cada proceso**,
  donde el AIU aparece desagregado. Ver el punto 6 de los vacíos.

---

#### Vacíos y siguiente paso

1. **No se halló publicación INVIAS 2026-1** [NO HALLADO]; el último dato localizable es 2025-2.
   *Siguiente paso:* abrir en navegador la sección «Hechos de Transparencia › Análisis de Precios
   Unitarios» de invias.gov.co y anotar vigencia, fecha de corte y nombres de archivo.
2. **No se abrió ningún archivo Excel**, así que el esquema del §5.1 y la fórmula del costo directo
   son **hipótesis informadas, no lecturas**. *Siguiente paso:* descargar una sola provincia (la del
   domicilio de los perfiles), volcar encabezados reales y fijar el esquema definitivo antes de
   escribir cualquier parser. **Prioridad 1 de toda la Parte 1.**
3. **La fecha de corte de 2025-2 está tomada del texto de la página, no de la carátula del archivo.**
   *Siguiente paso:* leer la hoja de portada del Excel. Si el corte real fuera 30-jun-2025, la
   indexación a agosto de 2026 arrastra ~6 meses de ICOCIV no aplicados.
4. **No hay confirmación de si INVIAS publica un identificador de ítem estable entre vigencias.**
   *Siguiente paso:* comparar el catálogo 2025-1 contra 2025-2 y medir cuántos códigos sobreviven.
5. **AEROCIVIL, CORMAGDALENA y FONTUR quedan sin resolver** [NO HALLADO — se buscó y no apareció
   base de APU publicada; no se concluye que no exista]. *Siguiente paso:* buscar en SECOP II
   documentos tipo «formulario de presupuesto» de esas entidades — el corpus de Detecta ya identifica
   sus procesos por entidad.
6. **AIU de referencia.** Ninguna entidad publica un **CATÁLOGO general** de AIU de referencia
   [NO HALLADO], **pero el AIU sí consta desagregado en el presupuesto oficial de cada proceso
   publicado en SECOP II** (INVIAS incluido), algunas entidades territoriales lo **topan por acto
   administrativo**, y los **Documentos Tipo fijan la estructura del presupuesto oficial** en la que
   el AIU aparece desagregado. *Siguiente paso:* extraer el AIU del formulario de presupuesto oficial
   de N procesos de obra **adjudicados**, segmentado por **tipo de obra y cuantía** — el corpus de
   Detecta ya identifica los procesos, falta bajar el documento de cada uno — y reportar **mediana y
   rango, nunca un valor único**.
7. **Versión vigente de los Documentos Tipo de obra pública de infraestructura de transporte y lista
   exacta de fórmulas de ponderación sorteables** [PENDIENTE DE VERIFICAR]. *Siguiente paso:* abrir
   la sección «Documentos Tipo» de colombiacompra.gov.co, descargar el pliego tipo vigente y
   transcribir literalmente el numeral de evaluación de la oferta económica. Es la pieza que decide
   si una estrategia de precio tiene sentido o no.
8. **El acceso al IDU quedó a nivel de portal, no de archivo.** *Siguiente paso:* escribir a
   `precios.referencia@idu.gov.co` pidiendo la base 2026-I en Excel, la periodicidad oficial y **qué
   jornada semanal (48/47/46/44/42 h) supone cada vigencia de los costos de mano de obra** — sin ese
   dato las series del IDU no son comparables entre sí.
9. **Serie empalmada ICCP→ICOCIV y año base** [CONOCIDO, no confirmado]. *Siguiente paso:* abrir la
   página de «información histórica» del ICOCIV en dane.gov.co y anotar año base y disponibilidad de
   empalme antes de indexar nada que cruce 2022.


---

## 1.A.2 — Otras fuentes gubernamentales nacionales (FINDETER, Minvivienda, DNP, CCE)

### Nota metodológica y etiquetas de origen

En este entorno **WebFetch devolvió HTTP 403 en todos los dominios probados** (incluidos
`proyectostipo.dnp.gov.co`, `colombiacompra.gov.co`, `invias.gov.co` y
`bibliotecadigital.findeter.metabiblioteca.com`). La verificación se hizo por tanto **solo con
WebSearch**. `datos.gov.co` no se tocó ni una vez (allowlist del proxy).

Para que nadie lea de más en una etiqueta, se usan estas cuatro y solo estas:

| Etiqueta | Qué significa exactamente |
|---|---|
| `[FRAGMENTO]` | El buscador devolvió la URL y un extracto que dice lo que aquí se afirma. **La página no se abrió ni se descargó.** Es el estado de casi todo este documento |
| `[CONOCIDO]` | Sabido por experiencia del sector, no confirmado en esta sesión. Se indica cómo confirmarlo |
| `[INCIERTO]` | Se cree que existe pero no se sostiene. Se indica qué buscar |
| `[PENDIENTE PRODUCCIÓN]` | Solo verificable lanzando una consulta desde el despliegue de Vercel (que sí alcanza `datos.gov.co`) |

No hay ningún `[VERIFICADO]` en esta sección: nada se abrió de verdad.

### Advertencia previa: tres precios distintos que este barrido suele confundir

Antes de la tabla maestra hay que fijar un criterio, porque **todas las fuentes de esta sección
publican el mismo tipo de precio y no es el que decide la rentabilidad**:

| Concepto | Qué es | Dónde vive | Para qué sirve |
|---|---|---|---|
| **Presupuesto oficial** | Techo que fija la entidad antes de abrir el proceso | Anexos del proceso, APU de Proyectos Tipo, Formulario de Presupuesto Oficial de los Documentos Tipo, presupuestos de FINDETER, APU de INVÍAS | Estimar el techo y armar la propuesta |
| **Precio de adjudicación** | Lo que realmente se contrató, y por tanto **la baja** respecto del techo | Histórico de adjudicaciones de SECOP II (`licitaciones:historico:*` en Detecta) | Estimar el margen esperado y decidir a qué presentarse |
| **Costo real de ejecución** | Insumo × rendimiento propio + desperdicio + AIU | Contabilidad de obra propia | Saber si el contrato deja plata |

**Todos los precios de las fuentes de esta sección son presupuesto oficial, no precio de
adjudicación.** La rentabilidad se define por la baja frente a ese techo, dato que **no está en
ninguna de estas fuentes** y sí en el histórico de adjudicaciones que Detecta ya ingiere. Un APU de
proyecto tipo sirve para estimar el techo; nunca para estimar el margen. Confundir margen con baja
es el error que esta sección debe evitar producir.

### Reajuste por índice: cómo se hace bien

Todas las fuentes de precio de aquí traen **fecha de corte**. El reajuste correcto es:

> `precio_mes_destino = precio_mes_corte × I(mes_destino) / I(mes_corte)`

donde `I` es el índice de costos de construcción del DANE del subsector correspondiente. Tres
precisiones que se pasan por alto:

1. **No usar IPC.** El IPC mide precios al consumidor y no representa la canasta de insumos de obra
   (acero, cemento, asfalto, maquinaria, jornal de construcción). No es un deflactor válido aquí.
2. **Un índice mide variación respecto de una base, no nivel de precio.** Sin el cociente entre dos
   meses de la MISMA serie y la MISMA base, la instrucción no es ejecutable.
3. **Verificar qué serie está viva.** El **ICCP** (construcción pesada) y el **ICCV** (vivienda)
   fueron descontinuados: su última publicación fue diciembre de 2021 y los reemplazaron el
   **ICOCIV** (obras civiles) y el **ICOCED** (edificaciones) desde 2022 `[FRAGMENTO —
   dane.gov.co, fichas ICOCIV/ICOCED/ICCP/ICCV]`. Citar «ICCP» en 2026 manda a una serie muerta.

El índice repone **solo el efecto precio de insumos**. No corrige diferencias regionales de
transporte, ni rendimientos, ni el AIU, ni el cambio de especificación técnica entre la fecha de
corte y hoy.

### FINDETER

FINDETER es banca de segundo piso y gestor de patrimonios autónomos (P.A. FINDETER / PAF), no una
entidad normalizadora de costos: **no publica un tarifario ni una lista de precios unitarios de
referencia**. Lo aprovechable son sus **convocatorias con Términos de Referencia y anexos**. Los
TdR de obra e interventoría enumeran como documentos de referencia el *Presupuesto Detallado de
referencia*, las *Memorias de Cantidades de Obra*, la *Consolidación de Especificaciones Técnicas*,
el *Análisis de Precios Unitarios (APU)* y el cronograma `[FRAGMENTO]`. Es decir: FINDETER no
publica precios, publica **presupuestos y APU reales por proyecto**, dentro de PDFs por convocatoria.

- Listado con filtros (Drupal Views, parámetros en la URL: `field_convcatoria_estado_value`,
  `field_convcatoria_departamento_target_id`, `field_convcatoria_presupuesto_value`,
  `items_per_page`, `page`) → apto para scraping paginado `[FRAGMENTO]`.
- **Sobre las rutas de los anexos:** el prefijo `/system/files/convocatorias/{CODIGO_PROCESO}/` es
  estable en los ejemplos observados (`PAF-ADR-I-106-2022`, `PAF-ATMINDEPORTE-O-028-2022`,
  `PAF-EUC-O-047-2020`), pero **el nombre de cada anexo NO es derivable y no hay listado de
  directorio** (Drupal no lo expone): el scraper tiene que extraer los `href` del HTML de cada
  convocatoria. `[INCIERTO — 3 ejemplos vistos en fragmentos de buscador, ninguna página abierta]`.
  Quien programe un ingestor asumiendo un patrón `*.pdf` descubrirá que igual hay que rasgar HTML.
- La nomenclatura codifica el fideicomiso mandante (ADR, Mindeporte, etc.), que es a su vez el
  sector: agua y saneamiento, edificación educativa, escenarios deportivos.
- FINDETER usa **SECOP II de forma únicamente publicitaria** y recibe ofertas por correo
  `[FRAGMENTO; confirmar en el TdR concreto]`. Consecuencia para Detecta: sus procesos aparecen en
  el corpus como *Régimen Especial*, con reglas de participación que no son las de la Ley 80.
- Repositorio institucional (`bibliotecadigital.findeter.metabiblioteca.com`), DSpace 7 —URL de
  descarga observada `/server/api/core/bitstreams/{uuid}/content`, patrón de la REST API de DSpace
  `[FRAGMENTO la URL; INCIERTO que la API esté abierta]`. Contiene estudios sectoriales, no precios.
- La «Guía Metodológica FINDETER» alojada en UPME es de **evaluación financiera de proyectos** para
  acceder a línea de redescuento, no de costos `[FRAGMENTO]`.

### Ministerio de Vivienda, Ciudad y Territorio (MVCT)

**RAS.** Resolución 0330 de 2017 adopta el Reglamento Técnico del Sector de Agua Potable y
Saneamiento Básico y deroga las Res. 1096/2000, 424/2001, 668/2003, 1459/2005, 1447/2005 y
2320/2009; modificada por la **Resolución 799 de 2021** (vigente desde el 21/12/2021) y adicionada
por la Resolución 548 de 2022 `[FRAGMENTO]`. Para Detecta el RAS **no es fuente de precios**: es un
**diccionario normalizado de ítems y especificaciones** (diámetros mínimos, materiales admisibles,
pruebas, distancias) que sirve para enriquecer el vocabulario de obra de `lib/semantica.js` con
terminología que SECOP II usa literalmente en los objetos. Ese es su uso real aquí.

**Guías de Asistencia Técnica para VIS** (serie 1-4, 2011, PDF en
`minvivienda.gov.co/sites/default/files/2020-07/guia_asis_tec_vis_{1..4}.pdf`) `[FRAGMENTO]`:
calidad, materiales, normas y procedimientos. Valor didáctico; **cero valor de precios**.

**Tope VIS — pertinencia limitada.** El tope VIS es un límite al **precio de venta de la vivienda**:
no acota el presupuesto oficial de una obra civil ni entra en un APU. Es relevante **solo si el
contratista participa en obra VIS** (contratos de construcción con constructores privados o
esquemas de subsidio). Se deja porque fija el orden de magnitud del segmento, no porque alimente un
presupuesto. La regla general (máximo **135 SMMLV**, **150 SMMLV** en ciudades de más de un millón
de habitantes, **175 SMMLV** en renovación urbana con POT actualizado) se atribuye al **PND
2022-2026 (Ley 2294 de 2023)**; el número de artículo que circula es el 293, pero **no se abrió el
texto de la ley** `[INCIERTO el número de artículo; el tope en SMMLV, `[FRAGMENTO]`]`. El decreto
de enero de 2026 que derogaría el Decreto 1467 de 2019, el 1607 de 2022 y el art. 1 del Decreto 584
de 2025 **no se pudo identificar por número** `[INCIERTO]`. VIP = 90 SMMLV `[CONOCIDO]`.

**SMMLV 2026 — verificado contra su fuente propia, no contra el tope VIS.** Todas las cifras en
pesos del informe se escalan con este valor, así que se comprueba directamente: el SMMLV 2026 se
fijó en **$1.750.905** por el **Decreto 1469 del 29 de diciembre de 2025**; el Consejo de Estado
suspendió provisionalmente sus efectos por auto del 12 de febrero de 2026 y el Gobierno lo refijó
como **salario mínimo transitorio 2026, en el mismo valor de $1.750.905, mediante el Decreto 0159
del 19 de febrero de 2026** `[FRAGMENTO — resultados con la URL del decreto en
dapre.presidencia.gov.co y compilaciones normativas]`. Conclusión operativa: **el valor de
`lib/perfiles.js` es correcto**, pero su base jurídica está en litigio; si el Consejo de Estado
anula, habría que revisar el valor y todo lo que se escale con él. Multiplicar 135 × $1.750.905 y
comprobar que da $236.372.175 valida la multiplicación, no el SMMLV — por eso se verifica aparte.

### DNP

**Proyectos Tipo** (`proyectostipo.dnp.gov.co`). Cada proyecto tipo incluye guía de formulación,
anexos técnicos (planos y equipos), **presupuesto con APU y cadena de valor a precios indicativos
sujetos a actualización según la región**, MGA estandarizada y minutas contractuales `[FRAGMENTO]`.
Categorías vistas: transporte (vías terciarias / placa huella), educación y —según los índices del
sitio— parques, escenarios deportivos, alumbrado y acueducto `[INCIERTO el listado completo: el
portal responde 403 a clientes automatizados]`. La descarga exige diligenciar un formulario
`[CONOCIDO]`. Portal Joomla/K2 heredado, con contenido mayoritariamente de 2016-2019: **los precios
traen fecha de corte y hay que reajustarlos con el procedimiento de la sección anterior**.

**Sobre la supuesta obligatoriedad.** El DNP promueve su uso, y **en proyectos financiados con
recursos del Sistema General de Regalías la exigencia ha venido por vía de los acuerdos de la
Comisión Rectora del SGR**: el aval de uso de proyectos tipo se rige por el **art. 4.3.2 del
Acuerdo 04 de 2021** de la Comisión Rectora `[FRAGMENTO; POR VERIFICAR si ese acuerdo sigue vigente
tras el Acuerdo Único del SGR consolidado en 2025]`. **La obligatoriedad general por vía del
Decreto 1082 de 2015 modificado por el Decreto 173 de 2016 NO está confirmada y no debe citarse**
hasta abrir el texto en el Gestor Normativo de Función Pública.

**MGA y BPIN** no son fuentes de precios sino de fichas: MGA Web (`mgaweb.dnp.gov.co`, adoptada por
Resolución 1450 de 2013) se integra con SUIFP-BPIN `[FRAGMENTO]`. Lo automatizable son los
**datasets Socrata del DNP en datos.gov.co** — `mzgh-shtp` (DNP-ProyectosSGR) y `uwns-mbwd`
(DNP-ProyectosContratos) `[FRAGMENTO que existen esas URLs; contenido y columnas PENDIENTE
PRODUCCIÓN]`. Consultas exactas a lanzar desde producción:

```
https://www.datos.gov.co/resource/mzgh-shtp.json?$limit=1
https://www.datos.gov.co/resource/mzgh-shtp.json?$select=count(1)
https://www.datos.gov.co/resource/uwns-mbwd.json?$select=count(1)
https://www.datos.gov.co/resource/8yvj-6du4.json?$limit=1
```

Corren sobre la misma infraestructura Socrata que ya consume `lib/socrata.js`, así que **si sus
columnas sirven** el coste de integración es bajo. Mientras no se sepa qué traen, no se puede
afirmar que sirvan.

### INVÍAS (Instituto Nacional de Vías — orden nacional)

Es la fuente nacional de precios más importante de todo este barrido y la que estaba faltando.

**APU Regionalizados de Referencia.** INVÍAS publica análisis de precios unitarios **para las 140
provincias del territorio nacional** (excluida Bogotá D.C.), con **actualización semestral**; la
vigencia observada más reciente es **2025-2, con precios a corte del 30/12/2025** `[FRAGMENTO —
`invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/`
y la ruta institucional «Hechos de Transparencia → Análisis de Precios Unitarios»]`. Los precios se
ajustan por región, altitud, clima y condiciones locales; la metodología declarada combina
cotizaciones de mercado, precios de contratación vigente, precios de provincias vecinas, históricos
de INVÍAS traídos a valor presente y precios de insumos similares `[FRAGMENTO]`. Las distancias de
acarreo de los APU están construidas sobre **1 km** y el usuario debe ajustarlas al centro de
gravedad real de la obra `[FRAGMENTO]` — dato crítico: usar el APU sin corregir acarreo subestima
el ítem en obra dispersa.

**Especificaciones Generales de Construcción de Carreteras 2022**, adoptadas por **Resolución 4561
del 29 de noviembre de 2022** `[FRAGMENTO]`, más las Normas de Ensayo de Materiales. Aportan **la
nomenclatura de ítems de vías del país** (artículos 100 a 700: generalidades, explanaciones,
subbases y bases, pavimentos asfálticos, estructuras y drenajes, señalización y seguridad vial).
Para Detecta es el vocabulario canónico de obra vial: alimenta `lib/semantica.js` con los términos
exactos que las entidades copian en los objetos contractuales.

**Calculadora de Costos de Proyectos Tipo de Infraestructura de Transporte (UPIT + INVÍAS)**,
`upit.gov.co/calculadora-de-costos/`: estima costos **directos** de 199 intervenciones tipo para
vías secundarias y terciarias en las 140 provincias, construida sobre los APU Regionalizados de
INVÍAS `[FRAGMENTO]`. Es la vía más rápida para un orden de magnitud por ítem sin descargar el
tarifario entero. Costos directos: **no incluye AIU** `[CONOCIDO — confirmarlo en la ficha de la
herramienta]`.

### DANE

Única fuente oficial de índices de costos de construcción, y por tanto el denominador del reajuste:

- **ICOCIV** (obras civiles) — reemplaza al ICCP desde 2022. Cubre carreteras, puentes, túneles,
  riego, plantas, oleoductos, puertos, presas y obras hidráulicas. **Publicación mensual**;
  boletines en `dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-{mes}{año}.pdf` `[FRAGMENTO]`.
- **ICOCED** (edificaciones) — reemplaza al ICCV desde febrero de 2022; amplía el alcance a
  edificaciones no residenciales `[FRAGMENTO]`.

Señal relevante para presupuestar en 2026: la **mano de obra** es el grupo que más está empujando
el ICOCIV (variación anual reportada por prensa en torno al **14,5 %**, y el grupo de puertos,
canales, presas y obras hidráulicas con **5,76 %** anual, acueductos y conductos de agua **6,30 %**,
lecturas de comienzos de 2026) `[FRAGMENTO — nota de Portafolio y cuenta oficial del DANE; la cifra
exacta debe leerse del boletín mensual, no de la nota]`. Consecuencia directa: **un APU de
referencia con corte anterior a 2025 subestima sistemáticamente la mano de obra**, que es
justamente el componente que el reajuste por índice repone peor si la canasta del proyecto no se
parece a la canasta del índice.

### FONADE → ENTerritorio

FONADE fue creado como establecimiento público (**Fondo Nacional de Proyectos de Desarrollo**) por
el **Decreto 3068 de 1968** y **reestructurado** como empresa industrial y comercial del Estado de
carácter financiero —**Fondo Financiero de Proyectos de Desarrollo**— por el **Decreto 2168 de
1992** `[FRAGMENTO]`. Se transformó en la **Empresa Nacional Promotora del Desarrollo Territorial –
ENTerritorio S.A.** mediante el **Decreto 495 del 20 de marzo de 2019**, vinculada al DNP y vigilada
por la Superintendencia Financiera `[FRAGMENTO]`. **No publica precios de referencia.** Publica su
Manual de Contratación y el **Manual de Supervisión e Interventoría M-GG-02 v03**
(`enterritorio.gov.co/web/sites/default/files/2024-10/documentos/M-GG-02_V03.pdf`) `[FRAGMENTO]`, y
sus procesos —con presupuesto oficial y APU como anexos— van a **SECOP II**, o sea que ya entran
por el pipeline actual de Detecta.

### Colombia Compra Eficiente (ANCP-CCE)

**Para obra civil, CCE no publica precios unitarios de obra.** Las listas de precios y el **Registro
Único de Precios de Referencia (RUPR)** desaparecieron con la derogatoria de la Ley 598 de 2000 por
el **art. 222 del Decreto Ley 019 de 2012** `[FRAGMENTO — Gestor Normativo de Función Pública, ficha
de la Ley 598 de 2000]`; hoy las listas de precios las elabora cada entidad como referencia interna
no obligatoria `[FRAGMENTO — ficha «Lista de precios y registro único de precios» en
`sintesis.colombiacompra.gov.co`]`. Lo que sí aporta CCE:

1. **Clasificador UNSPSC oficial**: v14 en PDF, **traducción al español en XLS (codeset)**, guía de
   codificación, códigos frecuentes y códigos definidos por CCE `[FRAGMENTO]`. Insumo directo para
   `lib/unspsc.js` (nombres de segmento/familia/clase/producto en tarjetas y diagnóstico).
2. **Documentos Tipo por sector** — de uso obligatorio para las entidades sometidas al EGCAP, con
   regla de inalterabilidad (solo se modifica lo que va entre corchetes y sombreado). Todos incluyen
   **Formulario de Presupuesto Oficial**, que es un **esquema de datos** (capítulos, ítems, unidades,
   cantidades), no precios:

   | Sector | Norma que adopta la versión vigente | Estado |
   |---|---|---|
   | Infraestructura de **transporte** (vías) — licitación de obra pública, versión 04 | **Resolución 465 de 2024**, deroga la Res. 240 de 2020 | `[FRAGMENTO]` — es el bloque más grande de obra pública del país |
   | **Infraestructura social / edificaciones** (educación, salud, recreación, institucional, vivienda) — transversales | **Resolución 275 de 2022** (vigente desde 29/08/2022); actualizaciones por **Res. 539, 540, 952 y 953 de 2025** (licitación, selección abreviada menor cuantía, mínima cuantía, consultoría e interventoría) | `[FRAGMENTO]` — POR VERIFICAR cuál rige hoy cada modalidad |
   | **Agua potable y saneamiento básico** | **Res. 248 de 2020** (licitación de obra) y **249 de 2020** (llave en mano), más **Res. 173 de 2021** | `[FRAGMENTO]` |

   Existen además documentos tipo para otras modalidades y sectores no barridos aquí `[INCIERTO el
   inventario completo — consultar `colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo`]`.
3. **Guía para la Elaboración de Estudios del Sector (G-EES)**: define la jerarquía de fuentes de
   precio — primarias (cotizaciones vigentes), secundarias (precios históricos traídos a valor
   presente o precios de referencia de otras entidades) y terciarias (grandes superficies,
   e-commerce) `[FRAGMENTO]`. En actualización durante 2025 `[FRAGMENTO: borrador publicado]`.
   Útil como marco de defensa metodológica de un presupuesto, no como precio.
4. **AMP de materiales de construcción y ferretería** (compraventa y/o suministro), más el
   **Catálogo de Materiales de Construcción y Ferretería derivado del IAD MIPYMES**. Son precios
   reales de **insumos**, no APU. Tres cosas que hay que resolver antes de construir nada encima:
   - El catálogo se opera dentro de la **TVEC con usuario de entidad compradora**. Pero **CCE publica
     ficha pública de cada instrumento de agregación de demanda**, y hay indicios de un «Catálogo
     2025» documentado en esa ficha: **verificar si esa ficha ofrece el catálogo descargable en
     XLS sin login** `[INCIERTO]`. Si lo ofrece, es **la única lista pública de precios de insumos
     del Estado colombiano** y cambia el titular de esta subsección.
   - **AVISO DE VIGENCIA: el acuerdo está prorrogado hasta el 30/09/2026** `[FRAGMENTO]` — menos de
     dos meses desde la fecha de este informe. No construir un ingestor contra un instrumento que
     expira.
   - Ya está en trámite un **AMP de segunda generación** para materiales de construcción y
     ferretería (borrador de pliegos hacia abril de 2026, ofertas hacia junio de 2026)
     `[FRAGMENTO]`. Es sobre ese, y no sobre el actual, sobre el que hay que decidir.

### Tabla maestra

Leyenda: `[FRAGMENTO]` = la URL y un extracto aparecieron en el buscador; **la página no se abrió**.

| Fuente | URL | Acceso | Formato | Cobertura | Frecuencia | Vigencia | Programático | Etiqueta |
|---|---|---|---|---|---|---|---|---|
| **INVÍAS – APU Regionalizados** | `invias.gov.co/publicaciones/4149/...` | Libre | XLS/PDF (por provincia) | 140 provincias; ítems de vías con desagregación | **Semestral** | 2025-2, corte 30/12/2025 | Descarga masiva (formato por confirmar) | [FRAGMENTO] |
| INVÍAS – Especificaciones 2022 + Normas de Ensayo | `invias.gov.co/documentos/1531/...` | Libre | PDF | Nomenclatura de ítems art. 100-700 | Por resolución | Res. 4561 de 29/11/2022 | No (texto) | [FRAGMENTO] |
| UPIT/INVÍAS – Calculadora de costos | `upit.gov.co/calculadora-de-costos/` | Libre | Web | 199 intervenciones tipo, vías 2.ª/3.ª, 140 provincias | Con los APU | Precios INVÍAS 1.er sem. 2025 (al publicarse) | No (app web) | [FRAGMENTO] |
| **DANE – ICOCIV** | `dane.gov.co/.../indice-de-costos-de-la-construccion-de-obras-civiles-icociv` | Libre | XLSX/PDF (boletín) | Obras civiles; sustituye al ICCP | **Mensual** | Vigente (desde 2022) | Descarga de series | [FRAGMENTO] |
| DANE – ICOCED | `dane.gov.co/.../indice-de-costos-de-la-construccion-de-edificaciones-icoced` | Libre | XLSX/PDF | Edificación residencial y no residencial; sustituye al ICCV | Mensual | Vigente (desde feb-2022) | Descarga de series | [FRAGMENTO] |
| FINDETER – convocatorias | `findeter.gov.co/convocatorias` | Libre | HTML + PDF (TdR, presupuesto, APU) | APSB, edificación, deporte | Continua | Vigente | Scraping (Views + parseo de `href`) | [FRAGMENTO] |
| FINDETER – repositorio | `bibliotecadigital.findeter.metabiblioteca.com` | Libre | PDF (DSpace 7) | Estudios sectoriales | Esporádica | Vigente | REST/OAI probable | [FRAGMENTO URL / INCIERTO API] |
| MVCT – tope VIS 2026 | `minvivienda.gov.co` (decreto ene-2026) | Libre | DOC/PDF | 135/150/175 SMMLV — **solo obra VIS** | Anual | 2026 | No | [FRAGMENTO cifra / INCIERTO norma] |
| MVCT – RAS Res. 0330/2017 (+799/2021, 548/2022) | `minvivienda.gov.co/normativa/resolucion-0330-2017-0`; `normas.cra.gov.co` | Libre | PDF/HTML | Especificaciones acueducto, alcantarillado, aseo | Por reforma | Vigente | No (texto) | [FRAGMENTO] |
| MVCT – Guías VIS 1-4 | `minvivienda.gov.co/sites/default/files/2020-07/guia_asis_tec_vis_{1..4}.pdf` | Libre | PDF | Materiales y procedimientos VIS | Sin actualizar (2011) | Obsoleta en precios | No | [FRAGMENTO] |
| DNP – Proyectos Tipo | `proyectostipo.dnp.gov.co` | Formulario | PDF/XLS/ZIP (APU + cadena de valor) | Vías terciarias, educación, parques, deporte, acueducto | Discontinua | Precios con fecha de corte (2016-2019) | No (403 a bots) | [FRAGMENTO / INCIERTO catálogo] |
| DNP – MGA Web / SUIFP-BPIN | `mgaweb.dnp.gov.co` | Registro | Web | Fichas de proyecto | Continua | Vigente | No | [FRAGMENTO] |
| DNP – dataset SGR | `datos.gov.co/resource/mzgh-shtp.json` | Libre | JSON/CSV (Socrata) | Proyectos SGR | Periódica | Por verificar | Sí (SoQL) | [PENDIENTE PRODUCCIÓN] |
| DNP – dataset contratos | `datos.gov.co/resource/uwns-mbwd.json` | Libre | JSON/CSV (Socrata) | Contratos de proyectos | Periódica | Por verificar | Sí (SoQL) | [PENDIENTE PRODUCCIÓN] |
| Fondo Adaptación – proyectos | `datos.gov.co/resource/8yvj-6du4.json` | Libre | JSON/CSV (Socrata) | Fichas de proyecto, no precios | Periódica | Por verificar | Sí (SoQL) | [PENDIENTE PRODUCCIÓN] |
| CCE – UNSPSC v14 | `colombiacompra.gov.co/clasificador-de-bienes-y-servicios` | Libre | **XLS** + PDF | Clasificador completo | Por versión | v14 | **Sí (descarga única)** | [FRAGMENTO] |
| CCE – Documentos Tipo transporte v04 | `colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo` | Libre | DOCX/XLSX/PDF | Formulario de presupuesto oficial, vías | Por resolución | Res. 465 de 2024 | Parcial | [FRAGMENTO] |
| CCE – Documentos Tipo infraestructura social | Ídem | Libre | DOCX/XLSX/PDF | Educación, salud, recreación, institucional, vivienda | Por resolución | Res. 275/2022 + Res. 539/540/952/953 de 2025 | Parcial | [FRAGMENTO / POR VERIFICAR] |
| CCE – Documentos Tipo APSB | Ídem | Libre | DOCX/XLSX/PDF | Formulario de presupuesto oficial, agua | Por resolución | Res. 248 y 249 de 2020; 173 de 2021 | Parcial | [FRAGMENTO] |
| CCE – Guía Estudios del Sector | `colombiacompra.gov.co/archivos/manual/guia-para-la-elaboracion-de-estudios-del-sector` | Libre | PDF | Metodología de precios | En actualización (2025) | Vigente | No | [FRAGMENTO] |
| CCE – AMP ferretería y materiales | TVEC + ficha pública del instrumento | **Login de entidad** (ficha pública por verificar) | Catálogo web / ¿XLS? | Precios de **insumos**, no APU | Ventanas periódicas | **Expira 30/09/2026**; 2.ª generación en trámite | No confirmado | [FRAGMENTO / INCIERTO ficha] |
| CCE – RUPR/SICE (histórico) | `sintesis.colombiacompra.gov.co` | Libre | HTML | — | — | **Derogado (art. 222 D.L. 019/2012)** | No | [FRAGMENTO] |
| ENTerritorio – manuales | `enterritorio.gov.co/web/sites/default/files/2024-10/documentos/M-GG-02_V03.pdf` | Libre | PDF | Supervisión e interventoría | Por versión | v03 (2024) | No | [FRAGMENTO] |
| ENTerritorio – procesos | SECOP II | Libre | Anexos del proceso | Presupuesto oficial + APU | Continua | Vigente | Metadatos ya ingeridos; **documentos no** | [FRAGMENTO] |
| FFIE / MinEducación | `ffie.com.co/convocatorias/`; `mineducacion.gov.co` | Libre | HTML + PDF | Infraestructura educativa; banco de proveedores y convocatorias de obra e interventoría | Continua | Vigente | Scraping (no evaluado) | [FRAGMENTO] |
| Agencia Nacional Inmobiliaria Virgilio Barco | `agenciavirgiliobarco.gov.co/Contratacion/...` | Libre | HTML + SECOP | Edificación pública nacional (sedes administrativas, APP) | Continua | Vigente (creada por art. 245 Ley 1753 de 2015) | Vía SECOP II | [FRAGMENTO] |
| UNGRD | `portal.gestiondelriesgo.gov.co` | Libre | HTML/XLS presupuestal | Ejecución y contratación de emergencia | Continua | Vigente | No útil | [FRAGMENTO URL] |
| ART / Central PDET | `centralpdet.renovacionterritorio.gov.co`; `obrasporimpuestos.renovacionterritorio.gov.co` | Libre | HTML/PDF | Proyectos estructurados con presupuesto; **sin tarifario** | Continua | Vigente | No evaluado | [FRAGMENTO] |
| Ejército – Batallones de Ingenieros | — | — | — | Ejecutan por convenio interadministrativo | — | — | Nula como precio | [INCIERTO la norma del 5 %] |

Nota sobre los batallones de ingenieros: no son fuente de precio, pero sí **competidor** y sus
convenios deben caer en `es_convenio` de `lib/filtros.js`. Circula en prensa una autorización legal
para destinar hasta el 5 % del presupuesto de obras de vías secundarias/terciarias a estos
batallones `[INCIERTO: falta identificar la norma exacta]`.

### Juicio: qué es realmente incorporable

**Nivel A — confirmado y automatizable hoy.** Una sola cosa: el **XLS del clasificador UNSPSC de
CCE**. Descarga única, alimenta directamente `lib/unspsc.js`. Candidato inmediato, y el único.

**Nivel A-condicionado — pendiente de una consulta de 30 segundos desde producción.** Los datasets
Socrata `mzgh-shtp`, `uwns-mbwd` y `8yvj-6du4`. Corren sobre la misma infraestructura que ya usa
`lib/socrata.js`, así que si sus columnas sirven el coste de integración es bajo. **No se puede
llamar automatizable a algo de lo que se ignora si contiene datos útiles**: la promoción a nivel A
depende de lanzar las cuatro URLs listadas arriba desde el despliegue.

**Nivel B — semi-automatizable, con pipeline propio.**

1. **APU Regionalizados de INVÍAS.** El activo más valioso del barrido: precios por ítem de vías,
   regionalizados a 140 provincias y actualizados cada semestre. Requiere descargar y normalizar los
   archivos por provincia y mapear la nomenclatura de ítems a los códigos UNSPSC del RUP. Es el
   único cuerpo público de APU nacionales, regionalizados y vivos.
2. **Series del DANE (ICOCIV/ICOCED)** para el reajuste. Volumen mínimo, descarga periódica.
3. **Anexos de los procesos de SECOP II.** Corrección importante respecto de lo que suele asumirse:
   **el corpus Socrata `p6dx-8zbt` que consume `lib/socrata.js` da metadatos, NO documentos.** No
   trae los anexos ni sus URLs de descarga —a lo sumo el enlace al proceso en la aplicación de
   SECOP II/Vortal—, de modo que bajar presupuestos oficiales y APU exige **un segundo pipeline
   completo**: resolver la URL del proceso, autenticar/navegar la plataforma, descargar los anexos y
   parsear XLSX/PDF heterogéneos sin esquema común. **Esfuerzo comparable al scraping de FINDETER,
   no «casi nulo».** Sigue siendo la mina de precios más real que existe, pero es un proyecto, no un
   añadido.
4. **Convocatorias y repositorio DSpace de FINDETER.** Scraping propio y parsing de PDF
   heterogéneo; rinden APU reales, por proyecto y sin esquema común.

**Nivel C — consulta ocasional, no justifican ingestor.** RAS 0330/2017 y especificaciones de
INVÍAS (valor como vocabulario, no como precio), guías VIS del MVCT, guía de estudios del sector de
CCE, manuales de ENTerritorio, la calculadora UPIT y —pese a su promesa— los **Proyectos Tipo del
DNP**: sus APU sirven como orden de magnitud por unidad (m² de aula, ml de placa huella), pero
exigen formulario, están congelados en su fecha de corte y hay que reajustarlos.

**Lo que ninguna fuente nacional da.** Los **rendimientos y jornales de tu propia cuadrilla**. Con
un matiz que hay que decir con precisión: los presupuestos oficiales publicados (anexos de SECOP
II, formularios de los Documentos Tipo, presupuestos de FINDETER) traen **precio unitario total por
ítem, sin desagregar**; los APU de INVÍAS y los de Proyectos Tipo **sí publican la desagregación**
(equipo, transporte, materiales, mano de obra) con **rendimientos de referencia**, y son la
excepción. Pero esos rendimientos son normativos, no medidos: la productividad real de la cuadrilla,
el jornal efectivo de la región, los desperdicios y los tiempos muertos por clima o acceso solo
salen de la contabilidad de ejecuciones anteriores. **Un APU armado únicamente con fuentes públicas
hereda rendimientos ajenos: es defendible ante la entidad, pero no es auditable como costo propio y
no dice si el contrato deja plata.** Ese sigue siendo trabajo de obra, no de scraping.

**Lo que hay que dejar de buscar.** Un **tarifario nacional único de APU de obra civil no existe
hoy y nunca existió**. Lo más parecido fue el **RUPR del SICE (Ley 598 de 2000)**: un registro de
precios de **bienes y servicios reportados por proveedores** contra el CUBS —no APU, sin insumos ni
rendimientos—, eliminado junto con todo el SICE por el **art. 222 del Decreto Ley 019 de 2012**.
Lo que sí existe es **referencia sectorial y regional**: en el orden nacional está dispersa por
sector (**INVÍAS** en vías —con diferencia la mejor—, **MVCT/RAS** en agua y saneamiento, **DNP**
en proyectos tipo), y fuera de él está descentralizada (gobernaciones, IDU y demás entidades
territoriales). Para Detecta, la señal más barata y más real sigue siendo el corpus de SECOP II que
ya se ingiere; y la señal de **rentabilidad** —la baja de adjudicación— solo está en el keyspace
histórico, no en ninguna de estas fuentes.

#### Vacíos y siguiente paso

1. **Formato y descarga de los APU Regionalizados de INVÍAS** — es ahora la prioridad número uno de
   esta sección. Abrir desde un navegador real
   `invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/`
   y determinar: si los archivos son XLS o PDF, si hay uno por provincia o uno consolidado, si el
   APU trae la desagregación insumo × rendimiento y qué resolución los adopta.
2. **Ficha pública del AMP de materiales y ferretería** — comprobar si `colombiacompra.gov.co`
   ofrece el catálogo en XLS descargable sin login. Si lo ofrece, es la única lista pública de
   precios de insumos del Estado y esta sección cambia de conclusión. Comprobar a la vez la
   prórroga más allá del 30/09/2026 y el estado del AMP de segunda generación.
3. **Columnas reales de `mzgh-shtp`, `uwns-mbwd` y `8yvj-6du4`** — lanzar desde producción las
   cuatro URLs listadas (`?$limit=1` y `?$select=count(1)`). Decide la promoción a nivel A.
4. **Resoluciones vigentes de los Documentos Tipo por sector** — confirmar en
   `colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo` cuál rige hoy cada modalidad de
   infraestructura social (Res. 539/540/952/953 de 2025) y si la versión 04 de transporte
   (Res. 465 de 2024) sigue siendo la vigente.
5. **Serie exacta del DANE a usar como deflactor** — bajar el boletín ICOCIV del mes y decidir a qué
   grupo se ancla cada tipo de obra del portafolio; anotar mes base de la serie para que el cociente
   del reajuste sea reproducible.
6. **Norma del tope VIS** — abrir el texto de la Ley 2294 de 2023 en el Gestor Normativo y confirmar
   el número de artículo; e identificar por número el decreto MVCT de enero de 2026 (buscar por la
   derogatoria expresa del Decreto 1467 de 2019 en el Diario Oficial).
7. **Vigencia del Acuerdo 04 de 2021 de la Comisión Rectora del SGR** (aval de uso de proyectos
   tipo, art. 4.3.2) tras el Acuerdo Único consolidado en 2025. Y **no citar** el Decreto 173 de
   2016 como fuente de obligatoriedad general hasta abrir su texto.
8. **Formato de los anexos de presupuesto de FINDETER** — abrir 3-5 TdR de obra de APSB para saber
   si presupuesto y APU vienen en XLS separado o embebidos en PDF. Decide si el nivel B es viable o
   si es puro OCR.
9. **Ruta real de descarga de anexos en SECOP II** — determinar si desde el enlace del proceso que
   trae el corpus se puede resolver la lista de documentos sin sesión autenticada. De esto depende
   por completo la viabilidad del punto 3 del nivel B.
10. **API del repositorio DSpace de FINDETER** — probar `/server/api/discover/search/objects?query=`
    y `/oai/request?verb=Identify`.
11. **Norma del 5 % para batallones de ingenieros** — buscar en el articulado del PND vigente; el
    dato circula en prensa sin cita.
12. **Estado del litigio sobre el Decreto 1469 de 2025** (SMMLV 2026) — si el Consejo de Estado
    anula, hay que revisar el SMMLV de `lib/perfiles.js` y todas las cifras que se escalen con él.


---

## 1.A.3 — Fuentes territoriales (gobernaciones, alcaldías, empresas de servicios públicos)

### Nota metodológica sobre la verificación (leer antes que las tablas)

Misma condición que la sección 1.A.1: en este entorno **`WebFetch` devolvió HTTP 403 contra todos los
hosts probados** — `iccu.gov.co`, `valledelcauca.gov.co`, `cali.gov.co`, `boyaca.gov.co`,
`invias.gov.co`, `dane.gov.co`. **No se abrió ni un solo documento byte a byte.** `WebSearch` sí
funciona y devuelve URL indexada + extracto de contenido. Por tanto:

| Etiqueta | Qué significa aquí |
|---|---|
| **[VERIFICADO]** | La URL apareció en resultados de búsqueda de esta sesión **y** el extracto indexado contiene el dato afirmado. Verificación de segundo grado: confirma existencia y contenido indexado, no la estructura interna del archivo. |
| **[CONOCIDO]** | Sé que existe por entrenamiento, no lo confirmé ahora. |
| **[INCIERTO]** | Creo que existe, no lo pude corroborar. Digo qué buscar. |
| **[NO ENCONTRADO]** | Se buscó explícitamente y **no** apareció. No prueba que no exista; sí prueba que no es fácil de encontrar, que para el rastreo automático es lo mismo. |

Tres reglas transversales que gobiernan todas las tablas de abajo:

1. **La periodicidad nunca se infiere del nombre del archivo.** "…-2020-semestre-ii.pdf" prueba que
   ese archivo es del semestre II de 2020, no que se publique cada semestre. Lo que se reporta es la
   **cadencia observada** (qué versiones se localizaron y de qué fecha), y la periodicidad declarada
   solo si la fuente la declara.
2. **Ninguna norma con número en duda lleva [VERIFICADO].** Si el número no está confirmado, no se
   cita el número.
3. **Cobertura geográfica ≠ cobertura de ítems.** Que una fuente alcance todo el país no significa
   que sirva para todos los ítems. Ver la advertencia de la sección 0.

`datos.gov.co` **no se tocó ni una vez** (allowlist del proxy). Los datasets que aparecen abajo se
conocen por el extracto del buscador; su contenido va `[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]`.

El 403 generalizado es en sí un hallazgo operativo: **los portales `.gov.co` territoriales están
detrás de WAF que rechaza clientes automatizados**. Cualquier plan de rastreo periódico choca con eso
antes que con la heterogeneidad de formatos.

---

### 0. Advertencia de alcance: dos coberturas distintas que no se pueden confundir

Una fuente de precios tiene **dos** coberturas y fallar en la segunda es lo que arruina un
presupuesto:

| Cobertura | Qué es | Riesgo si se confunde |
|---|---|---|
| **Geográfica** | Para qué territorio están calibrados los precios (flete, altitud, mano de obra local). | Presupuestar el Chocó con precios de Bogotá. Error de magnitud, corregible con un factor. |
| **De canasta (ítems)** | Qué actividades constructivas trae el listado. | Presupuestar un colegio con una base de carreteras. Error **estructural**: el ítem sencillamente no existe en la fuente, y lo que se pone en su lugar es una invención. |

Consecuencia directa para Detecta, y es el punto que decide todo lo demás:

- **INVIAS** es la entidad de la red vial. Su canasta es explanaciones, subbases y bases, pavimentos,
  drenaje, estructuras y señalización [VERIFICADO — `invias.gov.co/index.php/informacion-institucional/hechos-de-transparencia/analisis-de-precio-unitarios`,
  el extracto describe la organización por esos capítulos según las Especificaciones Generales de
  Construcción de Carreteras].
- **IDU** es lo mismo en clave urbana: malla vial, espacio público, puentes.
- **Ninguna de las dos** tiene precios de edificación: cubiertas, mampostería, pañetes y acabados,
  carpintería metálica y de madera, aparatos sanitarios, instalación hidrosanitaria y eléctrica
  interna, redes internas de gas.

Y el grueso de lo que sirve esta app es **edificación**: institución educativa, sede administrativa,
centro de salud, mejoramiento de vivienda, acueducto en su tramo interno. Por tanto:

> **Cobertura geográfica ≈ 100 % del país con dos fuentes (INVIAS + IDU), pero SOLO para ítems de
> infraestructura vial y espacio público. Para ítems de edificación, la cobertura nacional de esas
> dos fuentes es ≈ 0.**

De ahí que la estrategia de la sección 5 tenga una **capa 1-bis** dedicada a edificación, y que el
enum de confianza incluya el valor `sin_fuente_aplicable`.

---

### 1. Gobernaciones

| Departamento | ¿Publica lista? | Dónde / evidencia | Canasta que cubre | Formato | Cadencia observada | ¿Costo directo o con AIU? ¿IVA sobre utilidad? | Etiqueta |
|---|---|---|---|---|---|---|---|
| **Antioquia** (Sec. Infraestructura Física, "SIF") | **Sí, y es de las mejores** | `antioquia.gov.co/images/PDF2/Infraestructura/…/apu-base-referencia-sif-2020-semestre-ii.pdf`; versiones indexadas "Base Referencia SIF 2021 Semestre I (27-01-2021)", "Formulario Base SIF 02-09-2022" y "APU Base SIF General **junio 2024** V1" | Vías **y edificación** (el extracto describe partidas de vías y de edificios) [INCIERTO en el detalle de capítulos] | PDF (base de referencia); circulan derivados en Excel | Versiones localizadas: **2020-II, 2021-I, 2022-09, 2024-06**. La nomenclatura y esa secuencia sugieren cadencia semestral, pero **no se localizó ningún acto que declare la periodicidad** | [PENDIENTE] | [VERIFICADO] (existencia de las versiones) / **[INCIERTO]** (periodicidad) |
| **Cundinamarca** (ICCU) | **Sí, es el caso mejor documentado y el más útil para edificación** | `iccu.gov.co/wcm/connect/ICCU/…/LISTA+DE+PRECIOS+ICCU+2025.pdf`; también `…/LISTA+DE+PRECIOS+ICCU+2024.pdf` y "Cartilla de precios ICCU 2023" | **Construcción y urbanismo**: el extracto indexado incluye demoliciones de cubierta (teja de barro, asbesto-cemento, termoacústica, zinc), muros y acabados de cubierta — es decir, **canasta de edificación**, no solo vial [VERIFICADO] | PDF (cartilla + lista), desagregada por municipio | Versiones localizadas: **2021, 2023, 2024, 2025** → cadencia observada **anual** | [PENDIENTE] | [VERIFICADO] |
| **Valle del Cauca** | **Sí, y adoptada por decreto** | `valledelcauca.gov.co/publicaciones/83513/…` ("Listo el decreto con el listado de precios de referencia para obras civiles en el Valle del Cauca"); **Decreto No. 1.22-1441 de 14 de agosto de 2024**; dataset `datos.gov.co/…/e839-6uct` "PRECIOS DE REFERENCIA PARA LA CONTRATACIÓN DE OBRAS CIVILES DEL VALLE DEL CAUCA" | Obras civiles; alcance de capítulos [PENDIENTE] | PDF + **dataset Socrata** | Decretos localizados: **1.22-1441 de 2024** y un antecedente citado como "1583 de 2020". **Cadencia observada: ~4 años**, no anual. (Los dos formatos de numeración no son un error de transcripción: el Valle usa numeración compuesta —hay decretos publicados como "010-24-0847"—, así que ambos formatos conviven) | [PENDIENTE] | [VERIFICADO] (número y fecha del decreto de 2024, corroborados en el portal oficial) / **[INCIERTO]** (periodicidad y número del antecedente de 2020) |
| **Boyacá** | **Sí, con APU detallado** | `boyaca.gov.co/wp-content/uploads/2025/05/Anexo-1-Listado-de-APUS-resumido.pdf` y `…/ANEXO-2.-ANALISIS-UNITARIO-DETALLADO-Lista-de-precios-unitarios-fijos….pdf`; datasets `ae7u-y7m2` ("Lista oficial de precios unitarios fijos de Obra Pública…") y `tuvr-amc2` | "Obra pública" — organizado **por capítulo**; alcance exacto [PENDIENTE] | PDF (resumido + detallado) + **dos datasets Socrata** | Anexo 1 con ruta de **mayo de 2025**; anexo detallado de **2021**. Cadencia no declarada | [PENDIENTE] | [VERIFICADO] |
| **Risaralda** | **Sí** (hallazgo lateral, no estaba en el encargo) | `risaralda.gov.co/documentos/1221/precios-unitarios/` | No determinada | No determinado | No determinada | [PENDIENTE] | [VERIFICADO] (existencia de la sección) |
| **Santander** | **[NO ENCONTRADO]** | Dos búsquedas específicas; solo devuelven Valle y Boyacá | — | — | — | — | [NO ENCONTRADO] |
| **Nariño** | **[NO ENCONTRADO]** | Existe la Secretaría de Infraestructura y Minas (`sitio.narino.gov.co`), no su lista de precios | — | — | — | — | [NO ENCONTRADO] |
| **Atlántico** | **[NO ENCONTRADO]** | Ninguna lista departamental; sí aparecen "precios unitarios fijos" **dentro de pliegos** (p. ej. Soledad, programa Casa Digna Vida Digna, vía Fiduciaria Bogotá) | — | — | — | — | [NO ENCONTRADO] |

**Ojo con el tamaño de la muestra:** se probaron **8 departamentos de 32** y aparecieron **5** con
lista. Esa proporción no es una estimación nacional; es lo único que se miró. La sección 5 trata las
dos lecturas posibles por separado en vez de asumir una.

**Patrón que se repite y que importa más que la lista concreta:** donde existe, la lista territorial
se publica como **acto administrativo (decreto/resolución) + anexo PDF**, y en dos de los cinco casos
**también como dataset Socrata en `datos.gov.co`**. Ese segundo canal es relevante para Detecta
porque el proyecto ya habla Socrata: leer `e839-6uct` o `ae7u-y7m2` no exige código nuevo, solo otro
dominio y otro `_k`.

---

### 2. Alcaldías

| Entidad | ¿Publica? | Dónde / evidencia | Canasta | Formato / cadencia observada | ¿Costo directo o con AIU? ¿IVA sobre utilidad? | Etiqueta |
|---|---|---|---|---|---|---|
| **Cali** — Sec. de Infraestructura | **Sí, y es el modelo más limpio** | `cali.gov.co/infraestructura/publicaciones/63/resoluciones-de-precios/`; el extracto indexado dice que lista **año por año las resoluciones de precios unitarios usadas en todos los procesos de contratación** | Infraestructura municipal; alcance [PENDIENTE] | Resolución + anexo, serie anual | [PENDIENTE] | [VERIFICADO] |
| **Bogotá — IDU** | Sí (cubierto en 1.A.1) | `idu.gov.co/page/siipviales/economico/portafolio` — visor de precios vigente + histórico | **Vial y espacio público. Sin edificación** | Visor web + archivos | [PENDIENTE] | [VERIFICADO] |
| **Bogotá — UAERMV/UMV** | **Lista propia: [NO ENCONTRADO]** | Tiene `umv.gov.co/portal/transparencia/` y **`umv.gov.co/portal/datos-abiertos-umv/`** con datasets de **segmentos intervenidos 2019-2026**. Es un corpus de *ejecución*, no de precios | — | — | — | [VERIFICADO] (los datos abiertos); [NO ENCONTRADO] (la lista de precios) |
| **Bogotá — Caja de la Vivienda Popular** | **[NO ENCONTRADO]** | Búsqueda específica: solo información misional | — | — | — | [NO ENCONTRADO] |
| **Bogotá — Secretaría de Educación** | **[NO ENCONTRADO]** | Ídem. La obra escolar de Bogotá se presupuesta con base IDU/Construdata según práctica de mercado | — | — | — | [INCIERTO] |
| **Medellín** — Sec. Infraestructura Física | **[NO ENCONTRADO]** como publicación municipal separada | La práctica conocida es que Medellín trabaja sobre la **base SIF de la Gobernación de Antioquia** | — | — | — | [CONOCIDO], no confirmado |
| **Barranquilla** — Sec. Obras Públicas | **[NO ENCONTRADO]** | Existe `barranquilla.gov.co/obraspublicas`, sin lista de precios indexada | — | — | — | [NO ENCONTRADO] |
| **Bucaramanga** | **[NO ENCONTRADO]** | — | — | — | — | [NO ENCONTRADO] |

Conclusión de esta tabla: **de las cinco alcaldías grandes probadas (Bogotá, Medellín, Cali,
Barranquilla, Bucaramanga), solo dos publican precios de forma utilizable: Bogotá-IDU y Cali** — y la
de Bogotá es vial. Las demás sí imponen precios, pero los imponen **dentro del pliego**, no en un
repositorio consultable.

---

### 3. Empresas de servicios públicos

#### Advertencia previa (antes de esperar procesos de ESP dentro de Detecta)

Por **Ley 142 de 1994, arts. 31 y 32**, las ESP contratan bajo **derecho privado con manual propio**:
el art. 31 excluye sus contratos del Estatuto General de Contratación de la Administración Pública
salvo lo que la propia ley disponga, y el art. 32 somete sus actos a las reglas del derecho privado
[VERIFICADO — `funcionpublica.gov.co/eva/gestornormativo/norma.php?i=2752` y
`secretariasenado.gov.co/senado/basedoc/ley_0142_1994.html`]. Su proceso competitivo real corre en
**su propio portal de proveedores**, no en SECOP II:

- **EPM / Grupo EPM**: registro e invitaciones vía **ARIBA**; el portal declara además que su plan
  anual de adquisiciones sí está en SECOP II [VERIFICADO — `epm.com.co/proveedoresycontratistas/contratacion/`].
- **EAAB, Emcali, Triple A**: ruta exacta del portal de proveedores **[POR VERIFICAR]**.

Matiz que hay que decir completo, porque cambia la conclusión práctica: desde el **18 de julio de
2022**, el **art. 53 de la Ley 2195 de 2022** obliga a las entidades de régimen exceptuado a publicar
**toda** su actividad contractual en SECOP II, y Colombia Compra Eficiente lo ha reiterado por
circular externa [VERIFICADO — `colombiacompra.gov.co/archivos/10072` y
`operaciones.colombiacompra.gov.co/sala-de-prensa/comunicados/…`]. Es decir: **no es cierto que las
ESP estén jurídicamente fuera de SECOP II**. Lo que ocurre en la práctica, y es lo que importa aquí,
es otra cosa:

1. Publican **como repositorio de publicidad**, no de forma transaccional: se cuelga el documento,
   pero la recepción de ofertas ocurre en su plataforma privada.
2. Por eso aparecen bajo la modalidad **"Régimen Especial"**, que la lista blanca de
   `lib/filtros.js` **descarta salvo "(con ofertas)"** — decisión correcta y documentada en
   `CLAUDE.md`.

**Conclusión operativa:** la obra de ESP llega al corpus de Detecta **de forma parcial y por la vía
equivocada** (publicidad sin flujo de ofertas), y en su mayoría no sobrevive al filtro de modalidad.
Quien quiera esa obra debe **registrarse en el portal de proveedores de cada empresa**; no se puede
esperar verla en la app. Cuánto se pierde exactamente es medible y no se ha medido — la consulta
está en "Vacíos y siguiente paso".

#### Qué publican (documentación técnica, no precios)

| Empresa | Qué publica | Dónde | Etiqueta |
|---|---|---|---|
| **EAAB (Bogotá)** | Catálogo de **Normas y Especificaciones Técnicas** (construcción de acueducto, alcantarillado, diseño, operación) consultable en **SISTEC**; además resoluciones de **costos de conexión y valor de medidores** (citadas Res. 371 de 31-may-2023 y Res. 438 de 15-jun-2023) — que son **tarifas al usuario, no APU de obra** | `acueducto.com.co/…/normalizacion-tecnica/gestion-de-normas-y-especificaciones-tecnicas` | [VERIFICADO] (normas y existencia de las resoluciones); [INCIERTO] (números exactos de resolución) |
| **EPM (Medellín)** | **Normas de Diseño** de acueducto y alcantarillado (ed. 2013) y **Normas de Construcción** codificadas `NC-AS-*` (p. ej. `NC_AS_IL02_03` instalación de redes con zanja, `NC_AS_IL01_51` redes aéreas), en el portal de proveedores y contratistas | `epm.com.co/content/dam/epm/…` | [VERIFICADO] |
| **Emcali** | Familia completa de normas `NCO-/NDI-/NDC-/ECO-SE-*` en PDF abierto (distribución de agua potable, alcantarillado, excavaciones, recolección de aguas lluvias), vía la herramienta **Sinet**, **uso gratuito y explícitamente abierto a contratistas** | `emcali.com.co/documents/107516/…` | [VERIFICADO] |
| **Aguas de Cartagena (Acuacar)** | Normas de acueducto y alcantarillado, edición **2005**, citadas como referencia por terceros | Citada en documentación de Emcali/Cali; portal propio no verificado | [INCIERTO] |
| **Triple A (Barranquilla)** | **[NO ENCONTRADO]** ni normas ni precios en esta sesión | — | [NO ENCONTRADO] |

**Valor real para Detecta:** las normas de EAAB/EPM/Emcali **no dan precio, dan alcance**. Sirven
para estimar *cantidad de obra por metro de red* (tipo de zanja, entibado, material de relleno,
rotura y reposición de pavimento), que es justo la parte del APU donde más se pierde plata. Es una
fuente de **rendimientos y especificación**, no de precios unitarios.

---

### 4. Universidades y gremios

| Fuente | ¿Publica precios? | Detalle | Etiqueta |
|---|---|---|---|
| **UPTC (Univ. Pedagógica y Tecnológica de Colombia)** | **Sí, indirectamente y es lo más importante de esta tabla** | La UPTC **ejecutó la actualización de los APU regionalizados del INVIAS**, socializada en el lanzamiento del proyecto **"Territorio APU"**. La regionalización nacional está hecha por una universidad pública y publicada por INVIAS | [VERIFICADO] |
| **Universidad Nacional** | **[NO ENCONTRADO]** una publicación periódica de precios | Su rol conocido es de interventoría/consultoría por convenio, no de publicación de tarifario | [NO ENCONTRADO] |
| **CCI (Cámara Colombiana de la Infraestructura)** | **No publica lista de precios**. Publica **análisis y presión gremial sobre costos** | Sigue y comenta los índices DANE **ICOCIV** (obras civiles) e **ICOCED** (edificaciones), ha denunciado alzas de acero, asfalto y cemento y **solicita a los entes contratantes actualizar los presupuestos antes de contratar**. **Cifras concretas no se transcriben aquí porque no se pudo fijar el año de referencia de cada una**; para uso operativo no hace falta una variación suelta sino la serie del índice (ver fila DANE) | [VERIFICADO] (existencia y sentido de los pronunciamientos); [INCIERTO] (cualquier cifra) |
| **ACIEM** | Sí, pero de **honorarios**, no de obra | "Manual de Referencia de Tarifas para la Contratación de Servicios Profesionales de Ingeniería en Colombia", `aciem.org/…/MANUAL_TARIFAS_2015.pdf` (ed. 2015 localizada) | [VERIFICADO] |
| **SCI (Sociedad Colombiana de Ingenieros)** | **[NO ENCONTRADO]** publicación vigente de precios de obra | Su producto histórico es de **tarifas de honorarios**, no de precios unitarios de construcción | [INCIERTO] |
| **DANE** | Sí: **índices**, no precios absolutos | **ICOCIV** (obras civiles) — su estructura incluye agrupaciones por tipo de obra: carreteras/calles/vías férreas, puentes y túneles, tuberías y cables locales, entre otras, con desagregaciones por capítulo constructivo [VERIFICADO — `dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-obras-civiles-icociv`]. **ICOCED** (edificaciones, residencial y no residencial). **ICCV: descontinuado** — última publicación diciembre de 2021; desde la publicación del 25 de febrero de 2022 (periodo enero 2022) el ICCV **se actualiza por el ICOCED**, que es su rediseño [VERIFICADO — `dane.gov.co/…/indice-de-costos-de-la-construccion-de-edificaciones-icoced`]. **No indexar contra el ICCV.** Microdatos en `microdatos.dane.gov.co/index.php/catalog/711` | [VERIFICADO] |
| **Construdata / CYPE Generador de Precios** | Sí, **privados y de pago** | Construdata: ~5.500 precios de insumos por ciudad y ~1.000 APU, con índice de costos por tipología para Bogotá, Cali, Medellín y Barranquilla, actualización mensual, **suscripción anual de pago** [VERIFICADO — `construdata.com`]. CYPE tiene generador en línea para Colombia | [VERIFICADO] (existencia y que son de pago) |

Lectura estratégica: **el gremio no da precios, da la derivada.** Los índices del DANE son lo que
hace falta para **envejecer una base de precios** entre dos vigencias — que es el problema real, no
conseguir una lista más. Pero hay que usar el índice correcto y la porción correcta: ver la regla de
indexación en la sección 5.

---

### 5. La pregunta estratégica: ¿rastrear 1.100 municipios?

**No para los 1.103 municipios — ahí la aritmética es concluyente. SÍ para las 32 gobernaciones: solo
se probaron 8 y 5 tenían lista; el barrido departamental cuesta ~66 h una sola vez y no está
descartado por los datos de esta sesión.**

#### Supuestos declarados (no son mediciones)

| Supuesto | Valor usado | Por qué se declara |
|---|---|---|
| Tiempo por entidad: localizar + descargar + parsear PDF heterogéneo + mapear ítems a un catálogo común | **2 h**, igual para gobernación y municipio | Rango plausible 1–3 h; se usa el punto medio **para todos los casos**, sin inventar una diferencia entre departamento y municipio que no se ha medido |
| Tarifa horaria del trabajo de curaduría | **[A CALIBRAR — el dueño la fija]** | 206 días-persona no es una cifra sobre la que se pueda decidir. Coste en pesos = horas × tarifa; sin tarifa, la comparación es incompleta |
| Tasa de acierto fuera de la muestra | **No se supone. Se dan dos escenarios** | Es exactamente el parámetro que invierte la conclusión |

#### Cuentas del esfuerzo

| Concepto | Número |
|---|---|
| Municipios en Colombia | ~1.103 |
| Departamentos | 32 + Bogotá D.C. (Bogotá no tiene gobernación: su equivalente es la Alcaldía Mayor) |
| Gobernaciones con lista pública confirmada en esta sesión | **5 de 32 ≈ 16 %** (Antioquia, Cundinamarca, Valle, Boyacá, Risaralda). **Ojo: solo se probaron 8 departamentos.** Cali no cuenta aquí: es distrito y ya está en la fila de alcaldías |
| Alcaldías grandes con lista pública confirmada | **2 de 5** (Bogotá-IDU, Cali), sobre Bogotá, Medellín, Cali, Barranquilla y Bucaramanga |
| ESP con **normas técnicas** públicas | **4 de 5** (EAAB, EPM, Emcali, Acuacar; Triple A [NO ENCONTRADO]) |
| ESP con **precios unitarios de obra** públicos | **0 de 5**. EAAB publica tarifas de conexión y valor de medidores por resolución: son precios al usuario, **no APU de obra**, y no sirven para presupuestar |
| Coste de barrer las 32 gobernaciones + Alcaldía Mayor de Bogotá — **peor caso** (los 24 no probados rinden 0) | 33 × 2 h = **66 h** → 5 listas → **13 h por lista** |
| Coste de barrer las 32 gobernaciones + Bogotá — **caso según la tasa observada (5/8 ≈ 63 %)** | 66 h → ~20 listas → **3,3 h por lista** |
| Coste de barrer 1.103 municipios | 1.103 × 2 h = **2.206 h ≈ 276 días-persona** |
| Tasa de acierto esperada en municipios | Si las alcaldías grandes van 2/5, los municipios de 5.000 habitantes estarán muy por debajo del 10 %: **2.206 h para conseguir <100 listas** |
| Coste recurrente | Las vigentes se renuevan **anual o semestralmente** → el barrido no es un proyecto, es una **suscripción de mantenimiento** |
| Fricción técnica añadida | **403 de WAF en el 100 % de los hosts `.gov.co` probados hoy**; formatos PDF no tabulares; nomenclatura de ítems distinta en cada emisor |

**Cómo se lee esto.** Los dos escenarios departamentales (13 h/lista vs 3,3 h/lista) difieren en un
factor 4 y el barrido completo cuesta lo mismo en ambos: 66 h una sola vez. Es **decidible sin más
información**, y la forma barata de decidirlo es un **piloto de 8 departamentos más** (16 h): si
rinde ≥4 listas, se completa el barrido; si rinde ≤1, se para. El municipal, en cambio, no cambia de
signo con ningún supuesto razonable: 2.206 h recurrentes por <100 listas de calidad desconocida.

#### La estrategia correcta, en cuatro capas

1. **Base nacional regionalizada VIAL = INVIAS + IDU.** INVIAS publica APU regionalizados de
   referencia para **140 provincias del territorio nacional salvo Bogotá D.C.**, con precios a corte
   **30-dic-2025 (vigencia 2025-2)**, ajustados por región, altitud, clima y condiciones logísticas
   [VERIFICADO — `invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/`].
   Bogotá la cubre el IDU. **Cobertura geográfica ~100 %, pero solo para la canasta vial y de espacio
   público.**
1-bis. **Base de EDIFICACIÓN.** Sin esta capa no hay base nacional para colegios, centros de salud,
   sedes ni vivienda — que es el grueso del corpus. Candidatas, en orden:
   **(a) ICCU (Cundinamarca)**, la única lista pública verificada en esta sesión con canasta de
   edificación explícita (cubiertas, muros, acabados) y desagregación municipal;
   **(b) SIF Antioquia**, que según su extracto mezcla vías y edificios [INCIERTO en el detalle];
   **(c) Construdata**, referencia de mercado **de pago**, la única con actualización mensual y
   cobertura de cuatro ciudades. Ninguna es "nacional": las (a) y (b) son departamentales y se usan
   como proxy declarado, con su factor regional a la vista.
2. **Sobrecapa territorial *curada a mano*, no rastreada**: las 5–7 listas que sí existen y sí valen
   (Antioquia SIF, ICCU, Valle, Boyacá, Cali, Risaralda). Se cargan una vez, se revisan una vez al
   año. Mismo criterio que `data/vocabulario_unspsc.json`: **semilla curada, y decirlo en el
   archivo**. Prioridad por dónde publica el corpus: se ordenan por conteo real de procesos
   `SELECT departamento_entidad, count(*) …` sobre el histórico ya bajado, y se curan las cabeceras
   hasta cubrir el 80 % de los procesos visibles. Esa consulta se hace **sobre Redis, no sobre
   Socrata**: el dato ya está en casa.
3. **Extracción por proceso concreto, y solo cuando el proceso interesa.** El pliego **manda sobre
   cualquier lista general**: el "Formulario de cantidades y precios" / "Lista de ítems" del proceso
   trae la lista que la entidad impone, con sus ítems y sus cantidades. El corpus ya guarda
   `urlproceso` (`{url, description}` en Socrata, aplanado a string en `lib/proyeccion.js`), que es
   la puerta a los documentos del proceso en SECOP II.

#### Para qué sirve realmente la capa (2): no es un fallback, es un predictor

Esta es la parte donde está el dinero y la que se pierde si se lee la capa (2) como "lo que uso
cuando no tengo el pliego".

Cuando una entidad publica su lista territorial y la **impone como precio unitario fijo**, el APU del
pliego **se conoce antes de que salga el pliego**. Eso cambia la pregunta del oferente:

> deja de ser **"¿cuánto ofrezco?"** y pasa a ser **"con mis rendimientos y mis costos reales, ¿este
> precio impuesto deja margen, o directamente no me presento?"**

Tres consecuencias operativas:

- **Filtro de ir/no ir anticipado.** Con la lista del departamento y los rendimientos propios se
  puede simular el margen de un proceso **antes** de que abra, y descartar entidades cuyo tarifario
  está sistemáticamente por debajo del costo real de la empresa.
- **Toda baja ofrecida sobre un precio unitario fijo sale del AIU**, no del costo directo: el costo
  directo ya está fijado por la entidad. Un descuento del 5 % sobre el valor de la oferta se come
  una porción desproporcionada de la utilidad, porque la utilidad es solo una fracción de ese AIU.
  Y cuando los precios son fijos, el AIU se pacta invariable [VERIFICADO en sentido general —
  conceptos de Colombia Compra sobre APU/AIU y pliegos con cláusula "precios fijos, sin fórmula de
  ajuste"; el porcentaje concreto depende de cada pliego].
- **Detecta la puede usar sin implementar APU todavía**: basta señalar en la tarjeta "esta entidad
  publica lista de precios fijos — el margen no se negocia, se calcula", con enlace a la lista.

#### Regla de decisión

```
si (el proceso tiene formulario de cantidades descargable)
        -> usar ESA lista (es la que obliga)                     tier = pliego
si no y (el ítem NO pertenece a la canasta de ninguna fuente disponible)
        -> NO se degrada de tier: se marca sin_dato              tier = sin_fuente_aplicable
si no y (departamento tiene lista territorial curada
         cuya canasta cubre el ítem)
        -> usar la territorial                                   tier = territorial
si no y (el ítem es vial / espacio público)
        -> INVIAS provincia(municipio) | IDU si Bogotá           tier = nacional
si no y (el ítem es de edificación)
        -> base de edificación de la capa 1-bis, con factor
           regional explícito                                    tier = nacional-edificacion
```

Y sobre cualquier valor traído de una base con fecha de corte anterior:

```
indexar con el SUBÍNDICE que corresponda al tipo de obra del ítem:
    ICOCIV - carreteras            (vías)
    ICOCIV - tuberías / cables     (acueducto, alcantarillado, redes)
    ICOCED                          (edificación)
si el APU está desagregado -> aplicar el índice por GRUPO DE COSTO
    (materiales / mano de obra / maquinaria) sobre su porción, no al total
el AIU NO se indexa con estos índices
el resultado se marca                                            tier = nacional-indexado
y se muestra como ESTIMACIÓN, nunca como precio de referencia
```

Aplicar la variación agregada nacional como factor único sobre el valor unitario total mezcla
canastas —un ítem 90 % acero no se comporta como el agregado— y arrastra el AIU, que no varía con
esos índices. Lo que hace falta descargar no es una variación anual suelta sino la **serie de números
índice** desde la fecha de corte de la base hasta hoy, del **anexo estadístico** de la operación
correspondiente en el portal del DANE.

Es el mismo patrón de tiers que ya usa el matching UNSPSC (`clase` > `familia` > `equivalente` >
`texto`): **una jerarquía de evidencia, con el tier visible en la tarjeta**, en vez de un número
único que finge una precisión que no tiene.

#### Esquema de datos mínimo (si se implementa)

| Campo | Tipo | Nota |
|---|---|---|
| `fuente` | enum | `invias` \| `idu` \| `territorial` \| `edificacion` \| `pliego` |
| `emisor` | string | "Gobernación de Boyacá", "ICCU", … |
| `ambito` | string | código DANE de depto./municipio o provincia INVIAS |
| `canasta` | enum | `vial` \| `edificacion` \| `redes` \| `mixta` — **sin esto no se puede aplicar `sin_fuente_aplicable`** |
| `vigencia_corte` | ISO date | fecha de corte de precios, **no** fecha de publicación |
| `item_codigo` / `item_desc` / `unidad` | string | el código es local a cada emisor: **no fusionar catálogos** |
| `valor_unitario` | number COP | |
| `base_costo` | enum | `costo_directo` \| `con_aiu` \| `desconocido` — mezclarlos es el error clásico (25–30 % de desviación) |
| `iva_utilidad` | enum | `incluido` \| `no_incluido` \| `desconocido` |
| `indexado_con` | string \| null | subíndice y periodo aplicados, si el valor viene envejecido |
| `tier_confianza` | enum | `pliego` > `territorial` > `nacional` > `nacional-indexado` > `sin_fuente_aplicable` |

Regla dura, calcada de `anticipo_pct = 0` y `0 oferentes = sin dato`: **valor ausente ≠ 0**. Un ítem
sin precio en la base se marca `sin_dato` y se muestra como tal; nunca se interpola en silencio. Y su
corolario, que es la novedad: **un ítem fuera de la canasta de la fuente tampoco se degrada de tier**
—no se le pone el precio de una fuente que no lo mide—, se marca `sin_fuente_aplicable`.

---

#### Vacíos y siguiente paso

1. **Nada se abrió byte a byte** (403 en 6/6 hosts). Al abrir cada archivo, anotar **en este orden**:
   **(1) base de costo — ¿costo directo o con AIU?, y si trae AIU, con qué porcentajes; (2) si el
   valor lleva IVA sobre la utilidad; (3) fecha de corte de los precios (no la de publicación);
   (4) canasta: qué capítulos trae y si hay edificación; (5) número de ítems y columnas reales.**
   Los dos primeros deciden si el número sirve o está desviado 25–30 %; el resto es catalogación.
   Archivos a abrir: `iccu.gov.co/…/LISTA+DE+PRECIOS+ICCU+2025.pdf`,
   `boyaca.gov.co/…/Anexo-1-Listado-de-APUS-resumido.pdf`, la sección de resoluciones de Cali y la
   base SIF de Antioquia junio-2024.
2. **Cuánta obra de ESP llega realmente al corpus: medible y no medido.** Consulta a lanzar en
   producción sobre el histórico ya bajado en Redis (no sobre Socrata): contar procesos cuyo
   `entidad` contenga `ACUEDUCTO|EMPRESAS PUBLICAS|EMCALI|TRIPLE A|E.S.P|ESP`, agrupados por
   modalidad, y ver cuántos son "Régimen Especial" sin "(con ofertas)". Ese número dice si conviene
   abrir una excepción de modalidad o si la vía correcta es registrarse en cada portal de
   proveedores.
3. **Santander, Nariño, Atlántico, Barranquilla, Bucaramanga, CVP y SED Bogotá: [NO ENCONTRADO]**, no
   "no existe". Siguiente paso: buscar dentro de cada **portal de transparencia** (Ley 1712 de 2014,
   desarrollada por la **Resolución MinTIC 1519 de 2020, anexo 2** —esquema de publicación de
   información—, donde el menú "Transparencia y acceso a la información pública" tiene un ítem
   **"Normatividad"** en el que deben ir decretos y resoluciones) en vez de por buscador general
   [VERIFICADO — `normograma.mintic.gov.co/mintic/compilacion/docs/resolucion_mintic_1519_2020.htm`].
4. **Piloto para decidir el barrido departamental (16 h).** Probar 8 departamentos más, elegidos por
   volumen de procesos en el corpus, y contar cuántos tienen lista. ≥4 → completar las 32; ≤1 →
   parar y quedarse con las curadas.
5. **Los datasets Socrata de precios (`e839-6uct` Valle, `ae7u-y7m2` y `tuvr-amc2` Boyacá, `a3pg-vbzf`
   sin emisor identificado) están [PENDIENTE DE VERIFICAR EN PRODUCCIÓN]** — `datos.gov.co` está
   fuera de la allowlist. Consultas exactas:
   `https://www.datos.gov.co/resource/e839-6uct.json?$select=count(*)` y luego
   `…/e839-6uct.json?$select=:id,:updated_at,*&$limit=1` para leer el esquema real. Mismo par para
   `ae7u-y7m2`. Barrido de catálogo:
   `https://api.us.socrata.com/api/catalog/v1?domains=datos.gov.co&q=precios%20unitarios&limit=100`.
6. **Serie del ICOCIV/ICOCED: no descargada.** Falta el anexo estadístico con los números índice
   (no las variaciones) desde la fecha de corte de cada base, y el detalle de qué subíndices publica
   el DANE por separado y con qué nombre exacto. Sin eso, la regla de indexación de la sección 5 no
   se puede implementar.
7. **Vigencia 2026 de las listas territoriales: sin determinar.** Las rutas más recientes localizadas
   son ICCU 2025, Boyacá mayo-2025, Antioquia junio-2024 y Valle decreto de agosto-2024. Verificar
   antes de presentar cualquier precio como "vigente".
8. **Sin resolver: cómo se descarga el formulario de cantidades desde `urlproceso`.** Es el eslabón
   que hace viable la capa (3) y no se probó. Siguiente paso: tomar un `urlproceso` real del corpus,
   abrirlo a mano y documentar si el anexo es accesible sin sesión.
9. **Números de las resoluciones de EAAB (371 y 438 de 2023) y del antecedente del Valle ("1583 de
   2020"): sin confirmar.** No citarlos con número hasta abrir la fuente.


---

## 1.A.4 — Fuentes privadas y comerciales (Construdata, CAMACOL, retail, software)

### Nota metodológica obligatoria (leer antes de creerle a este documento)

En este entorno **WebSearch funciona y WebFetch NO**. Se intentó abrir páginas en esta sesión
(`dane.gov.co`, `idu.gov.co`, `es.wikipedia.org`) y las tres devolvieron **HTTP 403**; el bloqueo
del proxy no se limita a `datos.gov.co`, que es el único documentado en `CLAUDE.md`. Consecuencia
directa: **en este informe no hay ni una sola página abierta**.

Etiquetas y lo que significan exactamente:

| Etiqueta | Significado |
|---|---|
| **[EXTRACTO DE BUSCADOR]** | La URL y el texto aparecieron en resultados de búsqueda de esta sesión y el extracto sostiene lo que afirmo. **La página no se abrió.** No es verificación. |
| **[CONOCIDO]** | Lo sé por entrenamiento, es sólido, no lo confirmé ahora. |
| **[INCIERTO]** | Plausible, sin confirmar. Digo qué buscar. |
| **[NO ENCONTRADO]** | No apareció en las búsquedas hechas. **No prueba que no exista.** |
| **[SUPUESTO / NO MEDIDO]** | Cifra o afirmación que nadie ha medido. No usar en una propuesta. |
| **[VERIFICADO]** | Página abierta y leída. **En este informe: ninguna.** |

**Ningún precio de este documento debe copiarse a una propuesta sin abrirlo en un navegador.**

---

### 1. CONSTRUDATA (Legis) — la referencia clásica, y la más cerrada

Construdata es una unidad de Legis S.A. Es el estándar de facto para APU en Colombia.

| Aspecto | Hallazgo | Etiqueta |
|---|---|---|
| Qué vende | Revista Construdata (ediciones numeradas, ~trimestral; se ven la 187, 196, 217), Portal Construdata (suscripción), Construplan / Construplan.net (software de presupuestos), Construcontrol, módulo «Presupuestar» | [EXTRACTO DE BUSCADOR] `legis.com.co/soluciones-corporativas/construccion/construdata` |
| Cobertura | **Bogotá, Cali, Medellín, Barranquilla** — cuatro ciudades | [EXTRACTO DE BUSCADOR] vía `comparasoftware.es/construdata` y `oneestimate.ai` |
| Volumen | ~5.500 precios de insumos por ciudad y ~1.000 APU, personalizables por ciudad | [EXTRACTO DE BUSCADOR] — cifra de comparadores de software, no de Legis |
| Actualización | Bases de precios **mensuales** | [EXTRACTO DE BUSCADOR] |
| ¿APU o solo insumos? | **Ambos.** Es su diferenciador frente al DANE, que da índices y no precios absolutos | [EXTRACTO DE BUSCADOR] |
| Precio suscripción | Portal Construdata: se anuncia **$817.020 = 36 × $22.695**. Un plan de 36 cuotas mensuales es **plurianual**, luego esa cifra **no puede ser a la vez el precio de un año**. Construplan.net nube ~$2.000.000; escritorio ~$3.500.000. Rango general de suscripciones digitales Legis $69.000–$2.143.000 | [INCIERTO] — extractos de `legis.com.co/suscripcion-portal-construdata/p` y `/suscripcion-construplan/p`. **No usar en ninguna comparación de costos** hasta aclarar si es tarifa anual o total del plan a 3 años, y si incluye IVA (19%) |
| **¿API?** | No aparece referencia a API, endpoint, feed ni exportación masiva | [NO ENCONTRADO] — no apareció documentación de API en las búsquedas hechas; no equivale a que no exista. Confirmar preguntando a Legis si Construplan.net expone API o exportación masiva |
| **¿TdU permiten automatización?** | No se pudieron leer (403). Por naturaleza del producto (contenido pagado, usuario nombrado, activación manual de 3-4 días hábiles) es casi seguro que el EULA prohíbe extracción masiva y redistribución | [CONOCIDO] |
| Vía de automatización | **Descarga manual.** Producto por usuario, tras login, sin API identificada | — |

**Juicio de consultor:** Construdata es la mejor base APU comercial del país y a la vez una mala
candidata técnica para Detecta: licencia por usuario nombrado, cobertura declarada de cuatro
ciudades y ninguna vía programática identificada. Sobre la cobertura, el argumento correcto **se
calcula con el propio corpus, no se supone**: el reparto por departamento de `/api/resumen` (que
por diseño suma exactamente los visibles) dice cuántos de los procesos visibles del perfil
corresponden a entidades fuera de Bogotá, Medellín, Cali y Barranquilla. **Correr esa consulta
antes de publicar cualquier cifra.** Mientras no se corra, la afirmación operativa es: *la mayor
parte de la obra municipal está fuera de esas cuatro ciudades* [SUPUESTO / NO MEDIDO].

Construdata sirve como **verificación puntual de un APU**, no como fuente de datos de un sistema.

---

### 2. Gremios: CAMACOL es edificación; para obra civil el gremio es la CCI

| Fuente | Qué es | Acceso | Etiqueta |
|---|---|---|---|
| **CCI — Cámara Colombiana de la Infraestructura** | Gremio del sector **infraestructura** (consultoría, construcción, proveeduría y operación de proyectos). Publica informes de gestión anuales y material técnico; se identificó un documento de **buenas prácticas de contratación de constructores con un capítulo «Adecuada aplicación del indicador DANE – ICOCIV»** — es decir, trata el índice correcto para obra civil | Portal público + **portal privado de afiliados** (documentos, circulares, recursos exclusivos). Seccionales: Antioquia, Occidente, Norte, Bogotá-Cundinamarca | [EXTRACTO DE BUSCADOR] `infraestructura.org.co`, `infraestructura.org.co/afiliacion`, `ccioccidente.com/portal-de-afiliados/`, `issuu.com/camaracci/docs/buenas-practicas-contratacion-de-constructores-cci` |
| CCI — costo de afiliación | **No publicado en los resultados.** Requisito: persona jurídica o natural con organización empresarial activa en el sector | [INCIERTO] — pedir tarifa por correo o al 601-6053030 (Av. Calle 26 59-41, of. 1002, Bogotá) |
| CAMACOL — Índice de costos | Página taxonómica con descargables: «Modelo de estimación de costos de la construcción-**ICCV**», «Análisis de la dinámica de los costos de la construcción» | Gratis, PDF | [EXTRACTO DE BUSCADOR] `camacol.co/taxonomy/term/124` — **el título alude al ICCV, descontinuado desde 2022**: verificar si CAMACOL actualizó el modelo a ICOCED/ICOCIV antes de usarlo; si no, el material está desactualizado en su índice de referencia |
| CAMACOL regionales | Antioquia, Valle, Bogotá y Cundinamarca, Caldas publican índices y notas propias | Valle, en «zona de afiliados» | [EXTRACTO DE BUSCADOR] |
| CAMACOL SAU (Sistema de Análisis Unitario) | >500 actividades y ~1.000 recursos, con capítulos, APU y sub-análisis; dos publicaciones (obra pública / edificación) | Suscripción anual o mensual, **entregado en CD** | [EXTRACTO DE BUSCADOR] vía documentos en scribd — el «CD» sugiere material antiguo; confirmar formato actual |
| Boletín mensual a afiliados | Evolución de costos | Solo afiliados | [EXTRACTO DE BUSCADOR] |

**CAMACOL es el gremio de edificación.** Su material sirve como lectura de contexto, pero el
gremio de referencia para Helder y Génesis es la **CCI**. El mismo criterio que descarta citar el
ICCV en una propuesta de obra civil descarta apoyarse solo en CAMACOL para elegir gremio.

#### Índices DANE: qué es cada uno y por qué no se encadenan

- El modelo de CAMACOL **se apoya en el índice del DANE** y lo desagrega por componente y ciudad;
  es análisis derivado, no medición primaria [EXTRACTO DE BUSCADOR].
- El **ICCV fue rediseñado y reemplazado por el ICOCED** a partir del **25 de febrero de 2022**:
  pasó de 15 a 57 municipios, 19 dominios geográficos, nuevos ponderadores, y amplió a
  edificaciones no residenciales [EXTRACTO DE BUSCADOR]
  `dane.gov.co/.../indice-de-costos-de-la-construccion-de-edificaciones-icoced`.
- **ICCV e ICOCED no son la misma serie**: distinta base, cobertura y ponderadores. Hay
  continuidad temática —los resultados del ICCV se reportan dentro de la clase CPC «Edificaciones
  residenciales» del ICOCED— pero **encadenar ambas series sin el empalme oficial que publique el
  DANE produce una variación falsa**. Para un reclamo de reajuste solo se usa el índice vigente en
  el periodo del contrato.

#### Ficha del ICOCIV (el índice que sí corresponde a Helder y Génesis)

| Campo | Dato | Etiqueta |
|---|---|---|
| Qué mide | Variación promedio **mensual** de los precios de la canasta de insumos de obras civiles | [EXTRACTO DE BUSCADOR] |
| Publicación | Boletín mensual con ~1 mes de rezago: `bol-ICOCIV-feb2026.pdf` fechado 31-mar-2026; `bol-ICOCIV-mar2026.pdf` fechado 30-abr-2026 | [EXTRACTO DE BUSCADOR] `dane.gov.co/files/operaciones/ICOCIV/` |
| Desagregación | 5 agrupaciones de cuentas nacionales, **17 subclases CPC**, **46 obras**, 316 desagregaciones a nivel de obra y capítulo constructivo | [EXTRACTO DE BUSCADOR] |
| Pesos relevantes | Carreteras, calles, vías férreas, puentes y túneles: **55,65%** del total. Tuberías de larga distancia 6,67%; acueductos y conductos de agua 6,30%; represas 5,72% | [EXTRACTO DE BUSCADOR] |
| Variación reciente | 2025: **4,31% anual** (2024: 3,78%). Prensa reporta mano de obra **+14,5%** en un año | [EXTRACTO DE BUSCADOR] `x.com/DANE_Colombia`, `portafolio.co/.../491427` |
| **Año base** | **No determinado** | [INCIERTO] — está en la ficha metodológica del boletín; leerlo antes de citar el índice |

**Cuál subíndice usar:** el ICOCIV se desagrega por tipo de obra, así que un capítulo de vía se
actualiza con el grupo de carreteras y uno de acueducto con el de tuberías/acueductos — **no con el
índice general**. Confirmar la nomenclatura exacta de los grupos publicados en el boletín.

**Sustento normativo del reajuste** (el informe anterior afirmaba que el ICOCIV es «el respaldo
defendible» sin citar norma). Lo que sustenta un reajuste no es el índice, es el contrato y la ley:

| Norma | Qué aporta | Etiqueta |
|---|---|---|
| Fórmula de ajuste pactada en el contrato / pliego | Es la fuente primaria: define qué índice, qué periodo base y qué ponderación se aplican | [CONOCIDO] |
| Ley 80 de 1993, art. 27 — ecuación contractual | Principio de mantenimiento del equilibrio económico y financiero | [CONOCIDO — verificar texto vigente] |
| Ley 1150 de 2007, art. 4 (deber de estimar y asignar riesgos) y art. 5 | Distribución del riesgo de variación de precios entre entidad y contratista | [INCIERTO en la numeración exacta de numerales — verificar en `secretariasenado.gov.co`] |

Todo lo anterior son **índices** (variación %), no precios absolutos: sirven para *actualizar* un
APU o justificar un reajuste, nunca para armarlo.

Vía de automatización CAMACOL/CCI/DANE: **descarga manual** (PDF). Sin API identificada.

---

### 3. Retail y distribuidores con precio público en línea

#### Advertencia de ingeniería de costos (leer antes que la tabla)

Tres correcciones obligatorias antes de meter un precio de retail en un APU:

1. **IVA.** El precio publicado al público en Colombia es **con IVA incluido** (19% en la mayoría
   de materiales de construcción). El insumo de un APU de obra pública va **sin IVA**. Comparar
   ambos directamente infla el APU un 19% de entrada. **Dividir por 1,19 antes de usarlo**, y
   verificar la tarifa por producto: hay bienes excluidos o exentos y no todos van al 19%
   [CONOCIDO]. En la API VTEX, **comprobar si el campo leído es `Price` o `PriceWithTax`** antes
   de construir cualquier serie: elegir mal el campo mete o quita un 19% en silencio.
2. **Diferencial retail vs. obra a volumen: NO SE CONOCE y no debe suponerse**
   [SUPUESTO / NO MEDIDO]. El precio retail es **techo**. Se mide así: cotizar **3 distribuidores
   mayoristas** para **5 insumos testigo** (cemento gris 50 kg, acero figurado 1/2", tubería PVC
   4", triturado m³, ACPM) **el mismo día** en que se lee el precio retail, y calcular el
   diferencial **por insumo**. El diferencial **no es único para toda la canasta**: acero y
   cemento no se descuentan igual.
3. **El IVA del contrato es otro asunto y no se mezcla con el precio del insumo.** En contratos de
   construcción de bien inmueble el IVA se causa sobre los **honorarios o la utilidad** del
   constructor (Decreto 1372 de 1992, art. 3), y la DIAN ha señalado que **la base especial de AIU
   del art. 462-1 del Estatuto Tributario no aplica** a contratos de construcción
   [EXTRACTO DE BUSCADOR] `normograma.dian.gov.co/dian/compilacion/docs/decreto_1372_1992.htm`.
   Eso afecta la facturación, no el costo del bulto de cemento.

Para acero se reportó dispersión de hasta 15% entre distribuidores [EXTRACTO DE BUSCADOR, fuente
secundaria `comandoconstrucciones.com` — tratar como orden de magnitud, no como coeficiente].

#### El hallazgo técnico útil: la API pública de catálogo de VTEX

Muchas tiendas latinoamericanas corren sobre VTEX, y toda tienda VTEX expone una API pública de
catálogo sin llave ni login:
`https://{dominio}/api/catalog_system/pub/products/search?ft={término}&_from=0&_to=49`
Devuelve JSON tipado y estable; es la misma API que consume el front. No requiere renderizar JS ni
parsear HTML. El precio depende de `seller` y del canal de venta (`sc=`), así que para comparar en
el tiempo hay que fijar el mismo vendedor y el mismo canal [EXTRACTO DE BUSCADOR]
`developers.vtex.com/docs/api-reference/catalog-api`.

**Lo que no se resolvió: qué cadena colombiana de construcción corre sobre VTEX.** Es una
comprobación de 30 segundos desde un navegador con salida a internet. Y que una API sea técnicamente
abierta no la hace jurídicamente libre: ver el marco legal más abajo.

| Actor | ¿Precio público? | ¿Lista descargable? | ¿API/feed? | Vía de automatización |
|---|---|---|---|---|
| Homecenter / Sodimac (`homecenter.com.co`) | Sí, SKU con precio y URL estable (`/product/13846/cemento-argos-gris-50kg/`) [EXTRACTO DE BUSCADOR] | Folleto mensual PDF de ofertas, no lista completa | No confirmado | Scraping o API VTEX si aplica — **leer TdU y `robots.txt` primero** |
| Constructor (formato profesional del mismo grupo) | Sí, mismo motor | No | No confirmado | Scraping |
| Corona (`corona.co`) | Sí, tienda propia con SKU (`CEMCUGB50`, Cemento Alión 50 kg) [EXTRACTO DE BUSCADOR] | No | No confirmado | Scraping |
| Easy Colombia (`easy.com.co`) | Sí, sitio activo. Cencosud cerró Spid en Colombia (ago 2025) pero mantiene Jumbo, Metro y Easy [EXTRACTO DE BUSCADOR] | No | No confirmado | Scraping |
| MercadoLibre Colombia | Sí, gran cobertura de insumos de nicho (emulsión CRL-1, etc.) [EXTRACTO DE BUSCADOR] | No | Sí, API oficial con OAuth | [INCIERTO] — la API exige OAuth y sus términos restringen usos de agregación y reventa de datos; **leerlos antes de asumir que es la vía limpia** |
| Acero: Diaco (Gerdau), Ternium, Paz del Río | No. Sitios institucionales | No | No | Imposible sin relación comercial; precio por cotización |
| Cemento: Argos, Cemex | No publican precio; sí catálogo y presentaciones (25/50 kg) | No | No | Precio observable vía retail |
| Cemento: Alión | Sí, publica página «Precio del cemento en Colombia 2026» [EXTRACTO DE BUSCADOR] `alion.com.co/precio-del-cemento-en-colombia-2026/` | No | No | Scraping de una página / lectura manual |
| Ultracem | Corporativo; precio vía marketplaces terceros | No | No | Vía retail |
| Emulsiones/asfalto (Asfacol, Prime, Hernanbar) | Fragmentado; precio en ML y Homecenter (galón), no en fabricante | No | No | Scraping retail / cotización |

*Sobre la propiedad de Sodimac Colombia S.A.: es una sociedad conjunta entre Falabella y
Organización Corona; el reparto se reporta como **51% Corona / 49% Falabella** en material de
inversionistas de Homecenter, y en enero de 2026 hubo prensa sobre la compra por Falabella de
participaciones de Corona en filiales colombianas, con declaraciones de que Corona **conserva** su
participación en Sodimac [INCIERTO — confirmar en el informe anual de Falabella o en el
certificado de existencia y representación de la Cámara de Comercio de Bogotá]. El dato no cambia
ninguna recomendación de esta sección; se deja solo para no dejar una afirmación errónea en pie.*

---

### 4. Mano de obra y equipo: los dos componentes que faltaban

Un APU tiene cuatro componentes —**materiales, mano de obra, equipo/herramienta y transporte**— y
en obra civil los dos últimos pesan tanto o más que los materiales. Las fuentes privadas cubren
materiales; para jornales y maquinaria las mejores referencias públicas identificadas son de
entidades, no de vendedores.

#### (a) Mano de obra

| Elemento | Dato / fuente | Etiqueta |
|---|---|---|
| SMMLV 2026 | **$1.750.905** (valor de referencia del propio repositorio, `lib/perfiles.js`) | Dato del proyecto |
| Decretos de salario mínimo y auxilio de transporte 2026 | **Decretos 1469 y 1470 del 29 de diciembre de 2025** | [EXTRACTO DE BUSCADOR] vía nota de actualización del IDU |
| Jornada semanal | 44 h hasta el **14-jul-2026**; **42 h desde el 15-jul-2026** (Ley 2466 de 2025), sin reducción de salario. Divisor de hora ordinaria: **220** con 44 h, **210** con 42 h | [EXTRACTO DE BUSCADOR] `actualicese.com`, `siemprealdia.co` — **fuentes secundarias**, contrastar con el texto de la ley |
| Recargo dominical/festivo | Sube de 80% a **90% desde el 1-jul-2026** (art. 14, Ley 2466 de 2025) | [EXTRACTO DE BUSCADOR] |
| **Factor prestacional** | Se reporta habitualmente en el rango **1,45–1,60** según qué prestaciones y seguridad social se incluyan | [CONOCIDO / rango indicativo]. **No se toma de un tercero: se liquida con la nómina real del contratista** (SS, parafiscales, prestaciones, dotación, ARL por clase de riesgo). Un factor prestado es una fuente de pérdida |
| Jornales por región | El **APU regionalizado de INVÍAS** incorpora explícitamente prestaciones sociales y rendimientos de mano de obra y equipo por provincia; el **IDU** publica tarifas de mano de obra y consultoría para Bogotá | Ver bloque (b) |
| Convenciones colectivas / tarifas gremiales por región | **No se identificó una publicación abierta** | [NO ENCONTRADO] — preguntar a la CCI seccional y a la caja de compensación; alternativa práctica: usar el APU de INVÍAS de la provincia como referencia |

Ojo con el efecto compuesto de 2026: la reducción de jornada **sube el valor de la hora** aunque el
salario mensual no cambie, y el recargo dominical sube 10 puntos. Un APU heredado de 2025 subestima
la mano de obra por dos vías a la vez. Es coherente con el +14,5% anual que reporta el ICOCIV en
mano de obra.

#### (b) Equipo y maquinaria — de dónde sale el costo horario

El costo horario de un equipo **no es la tarifa de alquiler a secas**. Se descompone en:

```
costo horario = posesión (depreciación + intereses + seguros + impuestos)
              + operación (combustible + lubricantes + filtros + llantas/tren de rodaje)
              + mantenimiento y reparación
              + operario (jornal + factor prestacional)
              [ + transporte/movilización, que se costea aparte por viaje ]
```

Si el equipo se **alquila**, la tarifa suele venir «con operario y sin combustible» o «con todo
incluido» — **hay que preguntar qué incluye antes de comparar dos cotizaciones**, porque el
combustible cambia la cifra por completo [CONOCIDO].

| Fuente | Qué da | Acceso | Etiqueta |
|---|---|---|---|
| **INVÍAS — APU Regionalizados de Referencia** | APU de referencia para **140 provincias** (excepto Bogotá D.C.), con precios de insumos, **prestaciones sociales**, y **rendimientos de mano de obra y equipo** por región; el componente «EQUIPO» lista la maquinaria sugerida por actividad (carácter indicativo, no obligatorio) | Público, descarga manual | [EXTRACTO DE BUSCADOR] `invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/` |
| **IDU — SIIP Viales, portafolio económico** | Sistema de precios unitarios de referencia con **visor de precios vigente**, costos estimativos por perfil vial POT e información histórica. Vigencia reportada: **29-may-2026**; incluye actualización de **tarifas de mano de obra y consultoría** por los Decretos 1469/1470 de 2025 y reconocimientos por la reducción de jornada de 46 a 44 h | Público | [EXTRACTO DE BUSCADOR] `idu.gov.co/page/siipviales/economico/portafolio` |
| IDRD (Bogotá) | Precios unitarios de referencia para juegos y dotaciones (nicho, útil en parques) | Público | [EXTRACTO DE BUSCADOR] `idrd.gov.co/construcciones/precios-unitarios-juegos-y-dotaciones-de-referencia` |
| **Datos Abiertos — «Lista oficial de precios unitarios fijos de Obra Pública y de consultoría – Departamento de Boyacá»** | Dataset Socrata `ae7u-y7m2` con precios unitarios fijos de una gobernación | `datos.gov.co` — **bloqueado en este entorno** | [PENDIENTE DE VERIFICAR EN PRODUCCIÓN]. Consulta: `https://www.datos.gov.co/resource/ae7u-y7m2.json?$limit=1000`. Y para descubrir gemelos de otros departamentos: `https://api.us.socrata.com/api/catalog/v1?domains=datos.gov.co&q=precios%20unitarios&limit=50`. **Es la única vía identificada para tener precios unitarios oficiales por API**, y Detecta ya habla Socrata |
| Alquiladores comerciales (Retri, TuMaquinaYa, Alquima, MAQBIM, Transmáquina) | Tarifas por hora/día/mes de retroexcavadora, volqueta, excavadora; cobertura de las principales ciudades y 14 departamentos | Web + cotizador; **precio no siempre público** | [EXTRACTO DE BUSCADOR] — el listado de Transmáquina que circula es de **2020**: no usar |
| Pliegos de licitaciones anteriores | Los anexos de APU de procesos publicados traen «Tarifa/Hora» y rendimiento por equipo, con nombre y capacidad | Público, por proceso | [EXTRACTO DE BUSCADOR] (ejemplo: anexo de análisis unitarios de Transcaribe). Se cruza con el corpus que Detecta ya descarga |

**Recomendación operativa:** para el costo horario, la base es el **APU regionalizado de INVÍAS de
la provincia del proceso**, y **tres cotizaciones vigentes de alquiladores** como contraste. Las
tarifas de terceros que circulan en PDF sin fecha son el peor insumo posible.

---

### 5. Software de presupuestos y el formato BC3/FIEBDC-3

**El BC3 resuelve el INTERCAMBIO, no la obtención.** No se identificó ninguna base de precios
**colombiana** publicada en BC3 de forma gratuita; hoy la única vía identificada para tener precios
colombianos en BC3 es **exportarlos desde Arquímedes / Generador CYPE, que es de pago**.

FIEBDC (Formato de Intercambio Estándar de Bases de Datos para la Construcción) es el estándar
español de intercambio entre programas de presupuestos. La asociación FIEBDC se reporta creada en
**julio de 1996** por 17 empresas del sector; existen versiones **FIEBDC-3/2004, /2007, /2012,
/2016** y la vigente **2024** (PDF público y gratuito en
`fiebdc.es/web2/datos/uploads/Formato-FIEBDC-3-2024.pdf`, con chequeador oficial)
[EXTRACTO DE BUSCADOR]. La referencia a una primera edición **FIEBDC-3/95** aparece en literatura
del sector y **no se pudo confirmar** [INCIERTO — está en la introducción del PDF de la
especificación 2024; leerla].

**Salvedad técnica que hay que decir antes de estimar el trabajo:** el BC3 es texto plano con
registros etiquetados (capítulos, partidas, precios descompuestos, mediciones, certificaciones,
pliegos), y su codificación por defecto es **CP850 (MS-DOS 850)**, con ANSI como alternativa
[EXTRACTO DE BUSCADOR]. **Node no decodifica CP850 de forma nativa** — `Buffer` solo maneja utf8,
latin1/binary, ascii, ucs2, base64 y hex —, así que un BC3 en CP850 con tildes y ñ se leerá con los
acentos rotos. Parsearlo en CommonJS puro **sigue siendo viable sin dependencias**, con la condición
de incluir una **tabla de conversión de 128 entradas** (unas 30 líneas). Ese es el único punto del
parser que puede costar tiempo; el resto es partir líneas por `|`.

| Software | ¿Base de precios colombiana? | ¿API / formato abierto? | Vía de automatización | Etiqueta |
|---|---|---|---|---|
| **CYPE — Generador de Precios Colombia** | Sí, banco multiparamétrico para Colombia: obra nueva, rehabilitación y **espacios urbanos**; APU con descomposición | Versión online gratuita, `colombia.generadordeprecios.info`, con URL por partida; exporta a BC3 vía Arquímedes | Scraping de páginas estables — **condicionado a su aviso legal** | [EXTRACTO DE BUSCADOR] `info.cype.com/es/tema/generador-de-precios-colombia-obra-nueva/`. El sitio tiene enlace «Aviso legal»; **no se pudo leer** |
| Arquímedes (CYPE) | Trae Extr05 y Ourense04 (españolas); Colombia vía Generador | Importa y exporta FIEBDC-3/BC3 | Descarga manual + BC3 (**uso previsto, no discutible**) | [EXTRACTO DE BUSCADOR] |
| Presto (RIB) | No colombiana; >10 cuadros de precios, conecta a Centro, BEDEC, IVE, Generador CYPE | Guarda en BC3, exporta a Excel con fórmulas | BC3 / Excel | [EXTRACTO DE BUSCADOR] |
| Construplan / Construplan.net (Legis) | Sí, la base Construdata | Sin API identificada; suscripción por usuario | Manual | [EXTRACTO DE BUSCADOR] |
| **Quercusoft** | Publica listados por entidad: **IDU Bogotá corte 2021-09**, **ICCU Cundinamarca corte 2021-01** | Versión gratuita disponible | Descarga | [EXTRACTO DE BUSCADOR] `quercusoft.com/colombia-idu-202109/`. **Precios con corte 2021: no son utilizables tal cual.** Sirven como **estructura de APU** (composición y rendimientos), no como precio, y exigen actualización por ICOCIV desde su fecha de corte. **Antes de usar este espejo, buscar la base vigente publicada por el propio IDU (SIIP Viales, corte 2026) y por el ICCU** |
| SINCO ERP | ERP de constructora (presupuesto, almacén, contratos). **No es una base de precios** | Sin API pública identificada | Manual | [EXTRACTO DE BUSCADOR] `sinco.co/soluciones` |
| OPUS, Neodata | Bases **mexicanas** | BC3 parcial | Manual | [CONOCIDO] |
| PU360, Prosicol | Sin resultados de búsqueda | — | — | [NO ENCONTRADO] |

---

### 6. Marco legal de la extracción automatizada (lo que no es `robots.txt`)

`robots.txt` **no es norma**: es una convención técnica. Que un sitio no lo prohíba no autoriza
nada, y que lo prohíba no crea por sí solo un delito. En Colombia lo que aplica es:

| Marco | Qué implica para un scraper | Etiqueta |
|---|---|---|
| **Ley 1273 de 2009**, art. 269A — acceso abusivo a sistema informático | Acceder «sin autorización o por fuera de lo acordado» a un sistema, protegido o no con medida de seguridad, o mantenerse en él contra la voluntad de quien puede excluir. Pena 48–96 meses y multa de 100 a 1.000 SMLMV. **Riesgo real si se saltan logins, límites de tasa o bloqueos** | [EXTRACTO DE BUSCADOR] `secretariasenado.gov.co/senado/basedoc/ley_1273_2009.html`. Encaje concreto con scraping de web pública: **no resuelto en jurisprudencia consultada** [INCIERTO] |
| **Ley 23 de 1982** y **Decisión Andina 351 de 1993** — derecho de autor | Las compilaciones y bases de datos con selección o disposición original están protegidas. Reproducir una base de precios ajena y redistribuirla es infracción, aunque los datos sueltos no sean protegibles | [CONOCIDO] |
| **Términos de uso** del sitio | Son un contrato de adhesión: se incumplen aunque no haya delito, con consecuencias civiles y bloqueo de cuenta | [CONOCIDO] |

Regla práctica para Detecta: **datos de entidades públicas y normas** (INVÍAS, IDU, DANE, CREG,
Datos Abiertos) son terreno limpio. **Bancos de precios comerciales** exigen leer el aviso legal
antes de escribir una línea de código.

---

### 7. Commodities: el bloque más automatizable

#### ACPM / diésel

La estructura de precios de gasolina corriente y ACPM se reorganizó en 2026. La norma identificada
es la **Resolución CREG 104 004 de 2026, fechada 19 de febrero de 2026**
[INCIERTO en emisor, número y fecha — el extracto la ubica en `gestornormativo.creg.gov.co`
(`.../Resolución_CREG_104_004_2026.pdf`) y la numeración de seis dígitos corresponde al esquema
CREG, no a la serie de resoluciones del Ministerio de Minas; **verificar en el gestor normativo de
la CREG y contrastar con las resoluciones del MME sobre estructura de precios de ACPM**]. En el
mismo paquete aparecen las resoluciones 104 003 y 104 005 de la misma fecha y la **Circular CREG
260 de 2026** [EXTRACTO DE BUSCADOR].

Dos afirmaciones que el análisis anterior fundía y que **no son la misma cosa**:

| Afirmación | Estado |
|---|---|
| El **cálculo** del ingreso al productor pasa a usar un **promedio semanal** de referencias internacionales | [INCIERTO] — es lo que sugieren los extractos, pero no se leyó el articulado |
| El **precio al consumidor** cambia semanalmente y existe **publicación semanal por ciudad** | **No sostenido por ninguna evidencia de esta sesión.** Que el insumo del cálculo sea semanal no implica ni frecuencia de ajuste al público ni publicación semanal. **Verificar la periodicidad real de la publicación de precios de referencia por ciudad antes de programar cualquier descarga** |

Cifra encontrada: desde el **1 de abril de 2026**, ingreso al productor de gasolina corriente
**$10.298,98/galón** y de ACPM **$5.932,57/galón** [EXTRACTO DE BUSCADOR].

**Qué precio usar para el costo horario de maquinaria — no es indiferente.** El **ingreso al
productor** es un componente de la estructura, **no** lo que paga la obra. Para el APU se usa el
**precio al público por ciudad/zona** de la estación donde efectivamente se tanquea, salvo que la
obra compre a granel con distribuidor mayorista, en cuyo caso se usa **el precio negociado con ese
distribuidor** (y se guarda la cotización como soporte). Usar el ingreso al productor subestima el
costo; usar el precio de una ciudad distinta a la de la obra lo distorsiona por fletes e impuestos
territoriales.

#### Asfalto y otros

- **Ecopetrol** publica precios vigentes de productos petroquímicos e industriales con actualización
  mensual, más un histórico [EXTRACTO DE BUSCADOR]
  `ecopetrol.com.co/.../precios/precios-vigentes/precios-vigentes`. Una referencia histórica de
  asfalto de 01/03/2021 en $1.473.013 aparece en fuentes secundarias [INCIERTO — unidad no
  confirmada; **no usar sin verificar**]. Formato de publicación no confirmado.
- **Acero y cemento**: no hay bolsa ni publicación oficial de precio. Se observan indirectamente vía
  retail, vía la página de Alión, o vía el ICOCIV como variación.

---

### 8. Ranking: mejor relación valor/esfuerzo para Detecta

1. **APU públicos de entidades: INVÍAS regionalizado + IDU SIIP Viales.** Son APU colombianos,
   vigentes, con mano de obra, equipo y rendimientos, y con desagregación regional que ninguna
   fuente comercial iguala. Coste: 0. Esfuerzo: descarga y parseo. **Empezar por aquí**, y probar
   en paralelo el dataset Socrata `ae7u-y7m2` (precios unitarios de Boyacá), que si tiene gemelos
   en otros departamentos convierte esto en una fuente por API.
2. **CYPE Generador de Precios Colombia** (`colombia.generadordeprecios.info`) — APU con
   descomposición, específicos de Colombia, gratis en web, URLs jerárquicas y estables, cubre
   «espacios urbanos» (obra civil municipal). **Solo después de leer el aviso legal de
   `generadordeprecios.info`**: si prohíbe la extracción automatizada, la vía limpia es licenciar
   **Arquímedes y exportar BC3**, que es uso previsto.
3. **DANE ICOCIV** — el actualizador correcto para obra civil, gratuito y mensual, con subíndices
   por tipo de obra. Es lo que permite envejecer un APU con evidencia. Su valor probatorio depende
   de la fórmula de ajuste del contrato, no del índice en sí.
4. **Precios de combustibles CREG** — dato público y normado; el ACPM pesa fuerte en el costo
   horario de maquinaria amarilla. Automatizable, con la periodicidad real por confirmar.
5. **Retail vía API VTEX / MercadoLibre** — no da precio de obra, pero da **serie temporal de
   variación por SKU**, útil como señal de mercado. Solo tras resolver IVA, TdU y campo de precio.

**Fuera del ranking a propósito: Construdata.** Sigue siendo referencia para *auditar* un APU, pero
por licencia por usuario, cobertura declarada de cuatro ciudades y ausencia de vía programática
identificada no puede ser fuente de datos de esta app. Comprarla es una decisión de negocio del
dueño, no de arquitectura.

**Fuera también: Quercusoft como fuente de precio.** Corte 2021. Vale como estructura de APU, no
como precio.

#### Vacíos y siguiente paso

| Vacío | Por qué quedó abierto | Cómo se cierra |
|---|---|---|
| **Ninguna página fue abierta en esta sesión** | WebFetch devuelve 403 para todo host probado | Reabrir cada URL citada desde un navegador antes de usar cualquier cifra en una propuesta |
| Qué proporción de los procesos visibles queda fuera de Bogotá/Medellín/Cali/Barranquilla | No se corrió la consulta | Leer el reparto por departamento de `/api/resumen` para el perfil correspondiente y publicar el conteo exacto, no un porcentaje estimado |
| Diferencial entre precio retail y precio de obra a volumen | Nadie lo midió | Cotizar 3 mayoristas × 5 insumos testigo el mismo día que se lee el retail; calcular el diferencial por insumo |
| Tarifa por producto del IVA en materiales; campo `Price` vs `PriceWithTax` en VTEX | No verificado | Revisar el Estatuto Tributario por partida y una respuesta real de la API antes de construir la serie |
| Periodicidad real de publicación de precios de combustible por ciudad, y emisor/número exacto de la resolución de 2026 | Solo extractos | Abrir `gestornormativo.creg.gov.co` y la página de publicaciones de combustibles líquidos de la CREG; contrastar con resoluciones del MME |
| Año base y nomenclatura exacta de los grupos del ICOCIV | No leído | Abrir `bol-ICOCIV-<mes><año>.pdf` y su ficha metodológica |
| Empalme oficial ICCV → ICOCED | No identificado | Buscar la nota metodológica de empalme del DANE; si no existe, **no encadenar las series** |
| Factor prestacional aplicable | Depende de la nómina del contratista | Liquidarlo con la nómina real; contrastar contra el que usa el APU de INVÍAS de la provincia |
| Costo de afiliación a la CCI y qué publica su portal privado | No publicado en los resultados | Llamar al 601-6053030 o escribir a la seccional correspondiente |
| Aviso legal de `generadordeprecios.info`; TdU de MercadoLibre, Homecenter, Constructor, Easy, Corona, Construdata; `robots.txt` de los cinco retails | Proxy bloquea esos hosts | Abrirlos en navegador. **Sin esto no se escribe un scraper** |
| Qué cadena colombiana corre sobre VTEX | La búsqueda no lo resolvió | Probar `https://{dominio}/api/catalog_system/pub/products/search?ft=cemento&_from=0&_to=9` |
| Si $817.020 de Portal Construdata es tarifa anual o total del plan a 36 cuotas, y si incluye IVA | Aritmética incoherente en la fuente | Abrir la ficha de Legis o pedir cotización formal |
| Formato actual del CAMACOL SAU (¿sigue en CD?) y si su «Modelo ICCV» fue migrado a ICOCED/ICOCIV | Extractos antiguos | Escribir a CAMACOL; preguntar por entrega digital, export Excel/BC3 e índice de referencia actual |
| Existencia real de PU360 y Prosicol | Cero resultados | Buscar por razón social en RUES; si no aparecen, descartarlos |
| Precio y unidad del asfalto Ecopetrol | Única cifra hallada es de 2021 y de fuente secundaria | Abrir la tabla de precios vigentes y anotar unidad (¿ton?, ¿kg?) y fecha |
| Encaje jurídico del scraping de web pública con la Ley 1273 en Colombia | Sin jurisprudencia consultada | Consulta a abogado antes de automatizar cualquier fuente comercial |


---

## 1.A.5 — SECOP como fuente implícita de precios (la mina de datos propia)

Detecta ya paga el costo de extraer SECOP II y de mantener dos corpus (activo e histórico). La
pregunta de esta sección no es "¿de dónde saco precios?" sino "¿cuánta señal de precio hay ya
dentro de lo que la app almacena, y qué falta para convertirla en un APU de referencia?". La
respuesta corta: mucha señal de **precio total** y de **descuento de mercado**, casi ninguna de
**precio unitario**, y un dataset hermano no explotado (`wi7w-2nvm`, ofertas por proceso) que es
el activo más valioso identificado en toda esta revisión.

Una advertencia que gobierna toda la sección y que conviene leer antes que nada: en licitación de
obra pública con Documentos Tipo **el método de ponderación del factor económico no se conoce de
antemano**, así que ningún indicador de esta sección debe leerse como "cuánto hay que bajar". Se
desarrolla en §3.3.

### 1. Qué columnas lee HOY la app (leído del código)

`lib/proyeccion.js` define `CAMPOS` (proyección activa) y toma `CAMPOS_ADJUDICACION` de
`lib/indice_competencia.js` (proyección histórica). `lib/socrata.js` pide siempre
`$select=":id,:updated_at,*"` y proyecta en cliente, así que **toda columna que exista llega**;
la proyección solo decide qué se guarda.

| Columna en `p6dx-8zbt` | Uso en la app | Señal de precio | Estado |
|---|---|---|---|
| `precio_base` | `lib/negocio.CUANTIA_CAMPOS[0]`, cuantía y K | **Presupuesto oficial** | [VERIFICADO] existe |
| `valor_total_adjudicacion` | `CAMPOS_VALOR_ADJUDICADO[0]`, solo histórico | **Valor adjudicado** | [VERIFICADO] existe |
| `duracion` + `unidad_de_duracion` | `lib/capacidad.plazoMesesDe` | plazo → COP/mes | [VERIFICADO] existe |
| `respuestas_al_procedimiento` | oferentes (`OFERENTES_CAMPOS`, 7ª) | presión competitiva | [VERIFICADO] existe |
| `proveedores_unicos_con` | oferentes (`OFERENTES_CAMPOS`, 5ª) | presión competitiva | [VERIFICADO] existe |
| `conteo_de_respuestas_a_ofertas` | oferentes (`OFERENTES_CAMPOS`, 6ª) | presión competitiva | [VERIFICADO] existe |
| `respuestas_externas` | oferentes (`OFERENTES_CAMPOS`, 8ª) → entra en `CAMPOS_ADJUDICACION` | presión competitiva | [VERIFICADO] existe y la app la guarda |
| `proveedores_invitados`, `proveedores_que_manifestaron` | `CAMPOS_ADJUDICACION` | embudo de interés | [VERIFICADO] existen |
| `adjudicado`, `id_adjudicacion`, `nombre_del_proveedor`, `nit_del_proveedor_adjudicado`, `nombre_del_adjudicador`, `codigoproveedor` | `esAdjudicado`, equivalencias | quién ganó | [VERIFICADO] existen |
| `codigo_principal_de_categoria`, `categorias_adicionales` | matching UNSPSC | segmentación de precio | [VERIFICADO] existen |
| `urlproceso` | enlace en la tarjeta | puerta a los documentos | [VERIFICADO] existe (objeto `{url, description}`, ya desempaquetado en `proyeccion.js:69`) |
| `numero_de_lotes` | `CAMPOS_ADJUDICACION` | divide el valor | [VERIFICADO] existe |

Una fila aparte, porque es una oportunidad de una línea de código:

- **`proveedores_con_invitacion`** — [VERIFICADO] existe en el dataset (está en el mapeo público de
  `p6dx-8zbt`), pero **la app NO la guarda hoy**: no está en `CAMPOS` de `lib/proyeccion.js` ni en
  `CAMPOS_ADJUDICACION` de `lib/indice_competencia.js:80-87`. Añadirla a `CAMPOS_ADJUDICACION`
  cuesta una línea y completa el embudo de interés (invitados → con invitación → manifestaron →
  respondieron → ofertaron), que es el mejor predictor barato de "cuánta gente se va a presentar"
  para procesos aún abiertos.

Fuente primaria de la verificación de columnas: el mapeo público de `p6dx-8zbt` (≈50 columnas) en
[`nicoceron/co-acc/etl/datasets/p6dx-8zbt.yml`](https://raw.githubusercontent.com/nicoceron/co-acc/main/etl/datasets/p6dx-8zbt.yml)
[VERIFICADO en esta sesión]. Contiene todas las columnas de la tabla anterior.

Fuente secundaria, más débil: un `$select` hallado en
[`SocialCatalystLab/ape-papers`](https://github.com/SocialCatalystLab/ape-papers) que pide
`fecha_de_publicacion_del, fecha_adjudicacion, precio_base, valor_total_adjudicacion,
respuestas_al_procedimiento, proveedores_unicos_con` — **[INDICIO, no verificación]**: es un
repositorio experimental de código generado por IA (su propio planteamiento es comprobar si la
evaluación automatizada produce resultados fiables o ruido), y su ventana temporal es 2015–2023.
Aunque el script corriera, probaría que la columna existía entonces, no hoy. Sirve como pista de que
`fecha_adjudicacion` puede existir; **no** basta para darla por buena.

**Candidatas que el código prueba a ciegas y NO están en el mapeo verificado** — es decir, las que
`CLAUDE.md` marca como pendientes y probablemente **no existen** en `p6dx-8zbt`:
`numero_de_ofertas`, `numero_proponentes`, `numero_de_proponentes`, `numero_ofertas`,
`proponentes`, `adjudicatario_nombre`, `proveedor_adjudicado`, `adjudicatario_nit`,
`valor_adjudicado`, `valor_adjudicacion`, `porcentaje_de_anticipo` y familia. `fecha_adjudicacion`
y `fecha_de_adjudicacion` **no aparecen en el mapeo verificado** [INCIERTO si alguna de las dos
existe]; un `$select` de una sola columna lo resuelve.

**Implicación operativa inmediata**: las tres candidatas de oferentes que sí existen ya están en
`OFERENTES_CAMPOS` (`proveedores_unicos_con`, `conteo_de_respuestas_a_ofertas`,
`respuestas_al_procedimiento`, más `respuestas_externas`), así que añadir **nombres** probablemente
no arregle `clasificadas: 0` en `indice:competencia:meta`. Pero antes de concluir "cobertura real
baja del dato" hay que descartar las otras tres causas que el propio código permite:

| Causa candidata | Dónde vive | Cómo se descarta |
|---|---|---|
| Valores `0` publicados como "desierto / sin ofertas" que `oferentesDe` tira por su cota `[1, 500]` | `lib/indice_competencia.js:111-118` | contar cuántos registros históricos traen exactamente `0` en las cuatro columnas; si es masivo, el problema es la cota, no el nombre |
| `esAdjudicado` devuelve `false` y el proceso nunca entra al índice | `lib/indice_competencia.js:121-131` | `descartados.sin_adjudicacion` en `indice:competencia:meta` |
| Entidades por debajo de `MIN_PROCESOS = 5` | `lib/indice_competencia.js:51`, `225`, `301-305` | ratio clasificables/entidades en el meta |
| Cobertura real baja de la columna en obra civil | dataset | la sonda SoQL de "Vacíos" |

Esto es la misma trampa que `CLAUDE.md` ya documenta para las equivalencias: *un `0` no distingue
sus causas*. `/api/diagnostico` y `descartados.*` las separan; mirarlos antes de tocar la lista.

### 2. Otros datasets abiertos con señal de precio

| Dataset | ID Socrata | Grano | Columnas de valor | ¿Precio unitario? | Etiqueta |
|---|---|---|---|---|---|
| SECOP II · Procesos | `p6dx-8zbt` | 1 proceso | `precio_base`, `valor_total_adjudicacion` | No | [VERIFICADO] |
| **SECOP II · Ofertas por proceso** | `wi7w-2nvm` | **1 oferta de 1 proveedor** | `valor_de_la_oferta`, `moneda` | No, pero da la **distribución completa de posturas** | [VERIFICADO] el dataset; columnas [NO VERIFICADO] |
| SECOP II · Contratos electrónicos | `jbjy-vk9h` | 1 contrato | `valor_del_contrato`, `valor_facturado`, `valor_pagado`, `valor_amortizado`, `valor_de_pago_adelantado`, `habilita_pago_adelantado`, `valor_pendiente_de_ejecucion`, `saldo_cdp` | No | [VERIFICADO] las columnas |
| SECOP II · Proponentes por proceso | `hgi6-6wh3` | 1 proponente | (sin valor) | No | [VERIFICADO] existe; columnas [INCIERTO] |
| SECOP I · Procesos | `f789-7hwg` | 1 proceso | `cuantia_proceso`, `cuantia_contrato`, `valor_contrato_con_adiciones` | No | dataset [VERIFICADO]; **columnas [NO VERIFICADO]** |
| SECOP Integrado (I+II) | `rpmr-utcd` | 1 contrato | valor de contrato, URL de contrato | No | [VERIFICADO] |
| PAA · encabezado / detalle | `b6m4-qgqv` / `9sue-ezhx` | 1 línea de plan | valor estimado + código UNSPSC + mes | No (valor planeado, no ejecutado) | [VERIFICADO] los IDs |
| **TVEC · Compras por ítem** | `3hdv-smhz` | **1 línea de orden** | `price` (unitario), `qty`, `unidad_de_medida`, `line_total` | **Sí, unitario real** | [VERIFICADO] |
| TVEC · Consolidado | `rgxm-mmea` | 1 orden de compra | valor de la orden | No | [VERIFICADO] |

**Anticipo vs. pago anticipado — no son lo mismo y aquí importa mucho.** `CLAUDE.md` ya documenta
que en Detecta `anticipo_pct = 0` significa "sin dato" porque `p6dx-8zbt` no trae la columna, y esta
sección se ofrece como la vía para llenar ese hueco. Hay que hacerlo bien:

- `valor_de_pago_adelantado` + `habilita_pago_adelantado` de `jbjy-vk9h` son **PAGO ANTICIPADO**
  [VERIFICADO que ambas columnas existen en el mapeo público de `jbjy-vk9h`]. El pago anticipado es
  pago por algo ya entregado: entra al patrimonio del contratista y **no se amortiza**.
- El **ANTICIPO** es otra figura: sigue siendo dinero público, se amortiza contra las actas de obra
  y, en contratos de obra derivados de licitación pública, obliga al contratista a constituir
  fiducia o patrimonio autónomo irrevocable para manejarlo (art. 91 de la Ley 1474 de 2011)
  [VERIFICADO vía la síntesis normativa de Colombia Compra Eficiente,
  `sintesis.colombiacompra.gov.co/norma/LEY 1474 DE 2011/258`].
- `jbjy-vk9h` **no trae ninguna columna de anticipo** [VERIFICADO sobre el mapeo]. El proxy
  utilizable es **`valor_amortizado > 0`**, porque lo único que se amortiza es el anticipo; el
  porcentaje se estima como `valor_amortizado / valor_del_contrato`
  **[SIN VERIFICAR la cobertura real de `valor_amortizado`; medirla antes de publicar nada]**.
- Consecuencia de producto: si algún día se llena `anticipo_pct` desde aquí, hay que etiquetar en la
  tarjeta **cuál de las dos figuras** se está mostrando. Un contratista que planifica caja con un
  "anticipo 30 %" que en realidad era pago anticipado se equivoca en la garantía, en la fiducia y en
  el flujo.

Notas de tamaño: `wi7w-2nvm` ≈ 41,9 M filas, `rpmr-utcd` ≈ 21,7 M (el mayor del catálogo, corte
2026-04-25), `p6dx-8zbt` ≈ 8,4 M, `jbjy-vk9h` ≈ 5,6 M, `3hdv-smhz` ≈ **1,4 M** — todas
[VERIFICADO en esta sesión contra el catálogo de `co-acc`]. El tamaño de `f789-7hwg`
**[NO VERIFICADO]**: su ficha en el catálogo no declara conteo.

Lo importante de la tabla: **ninguno de los datasets de obra pública trae desglose de ítems**. TVEC
sí, pero TVEC es catálogo de bienes y servicios estandarizados (acuerdos marco), no obra civil: sus
precios unitarios no son un APU de placa huella. La conclusión es dura y hay que decirla: *SECOP
abierto no publica el formulario de cantidades*. Los precios unitarios de obra no están en la API.

`wi7w-2nvm` es el hallazgo. Une por `id_del_proceso_de_compra` (presuntamente el mismo identificador
que `id_del_proceso` de `p6dx-8zbt` [PENDIENTE DE VERIFICAR EN PRODUCCIÓN — comprobar que el formato
`CO1.BDOS.*` / `CO1.NTC.*` coincide]) y da, por proceso, **cuántos ofertaron y con cuánto**. Eso
convierte el índice de competencia actual (un conteo) en una curva de posturas: mínimo, mediana,
dispersión, y —lo que de verdad importa, §3.3— **dónde cae la media del conjunto**.

### 3. Qué precio se puede DEDUCIR

#### 3.1 Factor de baja (descuento de mercado) — la señal más sólida

Definición por proceso adjudicado *i*:

    b_i = 1 − (valor_total_adjudicacion_i / precio_base_i)          con precio_base_i > 0

Agregado por celda *c* (entidad, departamento, familia UNSPSC, modalidad, rango de cuantía):

    B_c = mediana{ b_i : i ∈ c },   dispersión = IQR(b_i),   n_c = |c|

Mediana y no media: las bajas tienen cola larga por procesos con `precio_base` mal cargado.

Reglas de higiene, con su naturaleza declarada:

| Regla | Qué descarta | Naturaleza |
|---|---|---|
| `b_i < 0` | adjudicado > presupuesto: adición registrada en el mismo campo, o error de carga | Higiene dura: aritméticamente imposible en adjudicación |
| `numero_de_lotes > 1` | el valor adjudicado es la suma de lotes y el `precio_base` puede serlo o no | Higiene dura: los dos numeradores no son comparables |
| `b_i > 0,45` | bajas extremas | **[SUPUESTO DE HIGIENE, no norma]** |

Sobre el corte superior, con precisión, porque el contratista lo va a codificar: **no existe en el
ordenamiento colombiano ningún tope legal a la baja**. Lo que existe es la figura del **precio
artificialmente bajo** (art. 2.2.1.1.2.2.4 del Decreto 1082 de 2015 y la guía de CCE para el manejo
de ofertas artificialmente bajas), que **no fija porcentaje alguno**: obliga a la entidad a requerir
explicación al oferente, y el comité evaluador recomienda rechazar o continuar el análisis, caso por
caso [VERIFICADO vía la síntesis normativa de CCE, `sintesis.colombiacompra.gov.co`, y la guía
CCE de ofertas artificialmente bajas]. Por tanto `0,45` es **un parámetro configurable**, no una
frontera jurídica, y debe recalibrarse mirando el **percentil 99 de la distribución real de `b_i`**
en el histórico antes de fijarlo. Si el p99 real es 0,38, cortar en 0,45 no filtra nada; si es 0,62,
cortar en 0,45 está borrando bajas reales y sesgando `B_c` hacia arriba.

Uso: convierte el `precio_base` publicado —que Detecta ya muestra— en una **expectativa de precio
de cierre**: `precio_esperado ≈ precio_base × (1 − B_c)`. Y con la K de `lib/capacidad.js`, en un
chequeo más honesto: la capacidad se consume contra el valor que realmente se firma.

Matiz que cambia la lectura del indicador: esta expectativa es de **ADJUDICACIÓN, no de ejecución**.
Una entidad con baja alta y tasa de adición alta no es la misma oportunidad que una con baja alta y
cero adiciones — en la primera, la baja se recupera durante la obra; en la segunda, se pierde. Sin
el §3.5, el índice de baja se lee al revés.

Consulta SoQL de ejemplo (sonda, no cálculo definitivo):

```
https://www.datos.gov.co/resource/p6dx-8zbt.json
  ?$select=departamento_entidad, count(*) as n,
           avg(valor_total_adjudicacion/precio_base) as ratio_adjudicado_sobre_base
  &$where=precio_base > 0
      AND valor_total_adjudicacion > 0
      AND valor_total_adjudicacion <= precio_base
      AND numero_de_lotes = 1
      AND tipo_de_contrato = 'Obra'
      AND fecha_de_publicacion_del between '2024-01-01T00:00:00' and '2025-12-31T23:59:59'
  &$group=departamento_entidad
  &$having=count(*) > 30
  &$order=ratio_adjudicado_sobre_base ASC
```

Dos advertencias sobre esta consulta:

- **`ASC` = mayor baja primero**, porque el ratio es `(1 − b)`. El nombre del alias sugiere lo
  contrario si se lee rápido; por eso se renombró.
- Usa `avg` **solo como sonda de tamaño y orden de magnitud**. Socrata no tiene `median()`. La
  mediana y el IQR se calculan en Detecta sobre el corpus histórico ya almacenado, que es justamente
  la ventaja de tenerlo en Redis. No publicar el `avg` de esta consulta como si fuera `B_c`.

#### 3.2 Precio unitario implícito — posible, pero minoritario

Solo es deducible cuando el objeto **declara la cantidad**:

    p_unit = valor_total_adjudicacion / Q     con Q extraída de descripci_n_del_procedimiento

La extracción es un problema de NLP acotado, no un modelo: una batería de expresiones regulares
sobre el texto normalizado (`norm` de `lib/semantica.js`, que ya quita tildes) del tipo
`(\d+[.,]?\d*)\s*(km|kilometros|ml|metros lineales|m2|m3|und|unidades|viviendas|aulas)`, más
desambiguación de miles/decimales (en Colombia `3.500` es tres mil quinientos y `3,5` es tres y
medio: la regla correcta es punto = miles, coma = decimal).

Honestidad sobre el rendimiento esperado: **no está medido y no debe prometerse**. Mi estimación
[CONOCIDO, no verificado] es que entre el 10 % y el 25 % de los objetos de obra declara una
cantidad explícita, y que de esos solo una parte es una cantidad *única y total* (muchos dicen "3
sedes educativas" o "varios tramos"). La forma de saberlo sin adivinar es barata y hay que hacerla
antes de construir nada: correr los regex sobre el corpus histórico actualmente en
`licitaciones:historico:mes:*` (tamaño exacto: leerlo de `/api/sync/historico?estado=true`, campo de
corpus — no medido desde este entorno) y publicar en `/api/diagnostico` un contador
`objetos_con_cantidad_declarada` por unidad.

Regla de decisión, cerrada para que cubra el caso esperado:

| Cobertura medida | Decisión |
|---|---|
| < 10 % | El producto no existe. No se construye. |
| 10 – 20 % | Existe **solo** para las 2–3 tipologías con más volumen (placa huella, pavimento). Hay que comprobar **tipología por tipología** que quedan ≥ 30 observaciones por departamento tras filtrar. **No se publica un COP/km general.** |
| > 20 % | Hay muestra para el producto completo. |

Precisión esperada cuando funciona: baja-media. `p_unit` incluye AIU, obras accesorias y
transporte; sirve para **rangos de contraste** (¿este proceso paga por km la mitad de lo normal?),
no para cotizar.

#### 3.3 Presión competitiva y posición de la oferta ganadora

Ya calculada como conteo (`lib/indice_competencia.js`, tertiles sobre el promedio de oferentes,
mínimo 5 procesos). Con `wi7w-2nvm` pasa de conteo a **distribución de posturas**, y ahí hay que
elegir bien la métrica, porque la elección obvia es la equivocada.

**En obra pública con Documentos Tipo el método de ponderación económica no lo elige la entidad ni
lo conoce nadie de antemano.** Los Documentos Tipo son de uso obligatorio desde la Ley 2022 de 2020,
y el documento base ofrece varias alternativas de ponderación del factor económico —en la versión
consultada: mediana con valor absoluto, media geométrica, media aritmética baja y menor valor— entre
las cuales se determina la aplicable a partir de los **centavos de la TRM** certificada por la
Superintendencia Financiera para el día de apertura del segundo sobre, precisamente para que la
entidad no pueda conocerlo ni manipularlo con antelación [VERIFICADO vía Colombia Compra Eficiente y
la Guía de Documentos Tipo de Obra Pública de Infraestructura de Transporte publicada por el DNP;
**la lista exacta de alternativas cambia entre versiones del documento base — comprobar la versión
vigente para el proceso concreto**].

La consecuencia es directa: **en la mayoría de los métodos gana la oferta más próxima a una media,
no la más baja**. Por eso:

- Se **descarta** la "brecha ganador–segundo" `(oferta_2 − oferta_1)/oferta_1` como métrica de
  agresividad: presupone que las ofertas se ordenan de menor a mayor y que gana la más baja. Un
  contratista que la use concluye que debe bajar más, que es exactamente el error que arruina el
  margen y el que dispara el requerimiento por precio artificialmente bajo del §3.1.
- Las métricas correctas sobre la distribución de posturas de cada proceso, con `n` ofertas:

| Métrica | Definición | Para qué sirve |
|---|---|---|
| Percentil del ganador | `rank(oferta_ganadora) / n` dentro de la distribución ordenada | Dice si en esa entidad/tipología gana el fondo, el medio o el alto de la tabla |
| Distancia a la media aritmética | `(oferta_ganadora − x̄) / x̄` | Blanco bajo los métodos de media aritmética |
| Distancia a la media geométrica | `(oferta_ganadora − G) / G`, con `G = (Π oferta_j)^(1/n)` | Blanco bajo los métodos de media geométrica |
| Dispersión del conjunto | `IQR(ofertas) / mediana(ofertas)` | Cuánto margen de maniobra hay: un conjunto apretado castiga cualquier desviación |

- La lectura operativa: **`wi7w-2nvm` no sirve para calibrar cuánto bajar, sino para estimar dónde
  va a quedar la media** — que es el blanco real. Un histórico de posturas por entidad y tipología
  permite estimar `x̄` y `G` esperadas *antes* de presentar, y desde ahí decidir la postura.
- Corolario incómodo pero útil: si el método se sortea, la oferta óptima no es una sola cifra sino
  la que maximiza el puntaje esperado sobre la mezcla de métodos posibles. Ese cálculo excede esta
  sección, pero conviene que quede escrito para que nadie lo confunda con "bajar el 8 %".

#### 3.4 Velocidad de ejecución

    COP_mes = valor_total_adjudicacion / plazoMesesDe(licitacion)

`plazoMesesDe` ya existe (`lib/capacidad.js:123`) y ya normaliza acentos en `unidad_de_duracion`.
Su valor no es de precio sino de **flujo de caja y de K**: `calcCRPC` ya penaliza plazos > 12
meses. Un COP/mes por familia UNSPSC dice si el plazo publicado es realista, y un plazo irreal es
la causa más común de que una obra ganada se vuelva pérdida.

#### 3.5 Tasa de adición por entidad — el complemento obligatorio del §3.1

El §3.1 mide la baja sobre `valor_total_adjudicacion`, que es el valor **al adjudicar**. Para quien
decide dinero, el valor que importa es el **final tras adiciones**, que en contratación estatal
puede llegar hasta el 50 % del valor inicial (parágrafo del art. 40 de la Ley 80 de 1993
[CONOCIDO, no verificado en esta sesión — confirmar el texto vigente y sus excepciones]). Una baja
agresiva y una adición posterior son estrategias **acopladas**: el índice de baja por entidad, sin
la tasa de adición de esa misma entidad, induce a error.

Definición, uniendo el histórico propio con `jbjy-vk9h` por `proceso_de_compra`:

    a_i = (valor_del_contrato_i / valor_total_adjudicacion_i) − 1        con adjudicacion_i > 0
    A_e = mediana{ a_i : i ∈ entidad e },   n_e = |e|

Reglas de higiene análogas al §3.1: descartar `a_i < 0` (contrato menor que la adjudicación: es
liquidación parcial o error de carga, no una adición negativa), acotar por arriba con un percentil
del propio corpus antes de fijar cualquier número, y exigir `n_e ≥ 20` para publicar `A_e`.

| Combinación | Lectura para el contratista |
|---|---|
| Baja alta + adición alta | La entidad "recupera" en obra. La baja publicada exagera el descuento real. |
| Baja alta + adición ~0 | Entidad dura de verdad. El precio de cierre es el precio final. |
| Baja baja + adición alta | La más cómoda: se entra cerca del presupuesto y aún hay recorrido. |
| Baja baja + adición ~0 | Presupuestos ajustados y ejecución literal. Margen conocido desde el día uno. |

Nota de viabilidad: la unión depende de que `jbjy-vk9h` traiga el identificador del proceso en un
formato compatible con `id_del_proceso` de `p6dx-8zbt` **[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]**;
el mapeo público de `jbjy-vk9h` incluye una columna de URL de proceso y campos de proceso, pero la
llave exacta no se comprobó desde este entorno.

### 4. Los documentos del proceso (pliegos, formulario de cantidades, APU de referencia)

- La API de Socrata **no expone los adjuntos**. Lo único que hay es `urlproceso`, que apunta a la
  ficha pública del portal:
  `https://community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.<n>`
  [el patrón es el que usan los fixtures del repo, `tests/e2e.js:153` — eso no es verificación
  externa. Como verificación externa vale el README de
  [`smarroquinc10/14-SECOP-Dr-Camila-Mendoza`](https://github.com/smarroquinc10/14-SECOP-Dr-Camila-Mendoza),
  que extrae el identificador del proceso (`CO1.NTC.…`, `CO1.PPI.…`, `CO1.PCCNTR.…`) de esa misma
  URL del portal — VERIFICADO en esta sesión].
- La descarga programática **no es viable sin navegador**. Evidencia [VERIFICADO]: el repositorio
  público `smarroquinc10/14-SECOP-Dr-Camila-Mendoza` declara en su README que el scraping del portal
  no es viable por el reCAPTCHA de entrada ("no usa scraping del portal porque la web pública tiene
  reCAPTCHA de Google que bloquearía cualquier bot") y que por eso consulta **exclusivamente** la API
  abierta de `datos.gov.co` (Socrata). No se ha verificado en esta sesión el nombre de ningún
  endpoint de descarga del portal ni ninguna técnica de evasión del captcha; no se afirma nada al
  respecto.
- Consecuencia para Detecta: **descartado en la arquitectura actual**. Vercel serverless (10–60 s
  por invocación, sin binarios de navegador) no puede sostener un flujo con navegador, y un scraper
  con captcha es frágil y jurídicamente incómodo para una app privada del dueño. El APU de
  referencia de la entidad, cuando existe, se descarga **a mano** desde el enlace que la tarjeta ya
  muestra.
- Qué probar en producción antes de cerrar el tema (una petición, sin costo): `GET urlproceso` con
  `fetch` y mirar si el HTML devuelto contiene nombres de archivo o solo el shell + captcha.

### 5. Veredicto cuantificado: qué se puede construir HOY con el corpus propio

Punto de partida: el corpus histórico actualmente en `licitaciones:historico:mes:*` (tamaño exacto:
leerlo de `/api/sync/historico?estado=true`, campo de corpus — no medido desde este entorno, porque
`datos.gov.co` está bloqueado y el backfill se lanza a mano) y **cero fuentes externas nuevas**.

**Las muestras mínimas de esta tabla suponen un histórico de decenas de miles de procesos; si el
corpus real es menor, los productos 2 y 3 caen primero.** El producto 1 aguanta corpus pequeños
porque agrega por entidad y tolera pocas celdas pobladas; el 3 es el más frágil de todos.

| # | Producto | Método | Muestra mínima | Esfuerzo | Valor |
|---|---|---|---|---|---|
| 1 | **Índice de baja por entidad y por modalidad** | mediana de `1 − adjudicado/base` con higiene de §3.1; tertiles como en el índice de competencia; reutiliza `construirIndice` casi entero | 20 procesos/entidad; 50/celda departamento×familia | Bajo | Alto: reprecia todas las tarjetas |
| 1b | **Tasa de adición por entidad** (§3.5) | unión con `jbjy-vk9h` por proceso; mediana de `valor_del_contrato/adjudicado − 1` | 20 contratos/entidad | Medio (requiere ingerir un dataset nuevo) | Alto: sin él, el producto 1 se lee al revés |
| 2 | **Curva de dispersión de precio por familia UNSPSC** | percentiles p10/p50/p90 de `precio_base` **deflactado** (ver abajo) y normalizado por plazo, agrupado por los 4 primeros dígitos del código | 100 procesos/familia | Bajo-medio | Alto: detecta el proceso barato antes de leer el pliego |
| 3 | **COP/km de placa huella (y pares equivalentes) por departamento** | regex de cantidad §3.2 sobre el objeto + `valor_total_adjudicacion`; solo tipologías con vocabulario inequívoco | 30 observaciones/departamento tras filtrar | Alto (depende del hit-rate del NLP) | Medio-alto, pero **condicionado a medir primero la cobertura** |

**Sobre el deflactor del producto 2, porque es donde es fácil equivocarse**: los precios de obra de
2024 y de 2025 no son comparables entre sí sin deflactar. Dividir todo el corpus por una constante
única (el SMMLV de 2026) **no ajusta nada**: es un cambio de unidad, no un ajuste temporal, y
produce un p10 sesgado hacia los procesos más antiguos que el producto interpretaría como "el
proceso barato". Dos opciones correctas:

| Opción | Cómo | Cuándo usarla |
|---|---|---|
| Deflactar a pesos de la fecha de análisis con un índice DANE de costos de construcción, aplicando el índice del **mes de `fecha_de_publicacion_del` de cada proceso** | Obra civil: **ICOCIV** (Índice de Costos de la Construcción de Obras Civiles), que **reemplazó al ICCP a partir de 2022** [VERIFICADO: el DANE publica ICOCIV con boletines mensuales; el ICCP se descontinuó]. Edificación/vivienda: **ICCV** | Preferida. Es la corrección real. |
| Usar el **SMMLV del AÑO DE PUBLICACIÓN de cada proceso** como unidad | `precio_base_i / SMMLV(año de publicación_i)` | Aceptable si no se quiere ingerir una serie externa. Nunca el SMMLV de 2026 para todo el corpus. |

Nota: la inflación de costos de construcción no sigue al salario mínimo, así que la segunda opción
es una aproximación, no un equivalente de la primera.

Orden recomendado: 1 → 1b → 2 → medir cobertura de cantidades → 3. Y en paralelo, la ingesta de
`wi7w-2nvm` acotada a los `id_del_proceso` que ya están en el histórico (no las 41,9 M filas):
es el único ítem que multiplica el valor de los productos anteriores a la vez, y el único que
permite estimar el blanco del §3.3.

#### Vacíos y siguiente paso

- **Tamaño real del corpus histórico**: no medido desde este entorno. Leer
  `/api/sync/historico?estado=true` (header `x-historico-token`) y anotar el conteo antes de aceptar
  las muestras mínimas del §5. Es el primer dato que hay que traer.
- **Cobertura real de `valor_total_adjudicacion` y de las columnas de oferentes en obra civil**: no
  se puede medir desde este entorno (`datos.gov.co` bloqueado, `CONNECT 403`). Lanzar en producción:
  `?$select=count(*) as n, count(precio_base) as con_base, count(valor_total_adjudicacion) as con_adj, count(proveedores_unicos_con) as con_ofer&$where=tipo_de_contrato='Obra' AND fecha_de_publicacion_del > '2024-01-01T00:00:00'`.
  Si `con_adj/n < 0,3`, el producto 1 se construye sobre el histórico propio y no sobre el dataset.
- **Cuántos registros traen `0` en las columnas de oferentes**: es la hipótesis más barata para
  explicar `clasificadas: 0` y se mide en local sobre el histórico, sin red. Si es masivo, hay que
  decidir si `0` es "desierto" (dato real) o "sin dato" antes de tocar la cota `[1, 500]` de
  `oferentesDe`.
- **Existencia de una columna de fecha de adjudicación** (`fecha_adjudicacion` vs
  `fecha_de_adjudicacion`): ninguna de las dos está en el mapeo verificado. Un `$select` de una sola
  columna lo resuelve; el que dé 400 no existe.
- **Columnas de `f789-7hwg`** (`cuantia_proceso`, `cuantia_contrato`, `valor_contrato_con_adiciones`):
  **[NO VERIFICADO]** — el catálogo confirma el dataset pero no enumera esas columnas. Comprobar con
  un `$select` de una columna antes de contar con ellas para la serie histórica larga.
- **Compatibilidad de la llave de unión con `wi7w-2nvm`**: comparar un `id_del_proceso` cualquiera
  del corpus contra `?$where=id_del_proceso_de_compra='<ese id>'&$limit=1`.
- **Llave de unión con `jbjy-vk9h`** (producto 1b): idem, contra el campo de proceso de ese dataset.
  Sin ella, el §3.5 no se puede construir.
- **Serie del ICOCIV**: el DANE publica boletines mensuales, pero **no se ha verificado que exista
  una serie descargable en formato programático** ni bajo qué licencia. Si no la hay, cargar la
  serie a mano una vez al año en `data/` es aceptable: son doce números.
- **Cobertura de `valor_amortizado` en `jbjy-vk9h`**: es el único proxy de anticipo identificado.
  Medir qué fracción de los contratos de obra lo trae distinto de nulo antes de prometer llenar
  `anticipo_pct`.
- **Hit-rate del NLP de cantidades**: medible ya, en local, sobre el corpus histórico. Es el
  experimento más barato de esta sección y el que decide si el producto 3 existe.
- **Percentil 99 real de `b_i`**: calcularlo antes de fijar el corte superior del §3.1. Hoy `0,45`
  es un supuesto, no un dato.
- **Versión vigente del documento base de Documentos Tipo** aplicable a los procesos de interés: la
  lista de métodos de ponderación cambia entre versiones y el §3.3 depende de ella.
- **Columnas exactas de `hgi6-6wh3` (proponentes) y de `wi7w-2nvm`**: no verificadas. Las primeras
  solo importan si `wi7w-2nvm` resultara tener cobertura pobre en obra.
- **`3hdv-smhz` (TVEC por ítem)**: precios unitarios reales, pero de catálogo estandarizado. Su
  mapeo público **no lista ninguna columna UNSPSC** (solo `entidad`, `nit_entidad`, `cdp`, `item`,
  `line_total`, `fecha`, `orden_de_compra`, `qty`, `provedor`, `nit_proveedor`, `unidad_de_medida`,
  `price`), así que la segmentación por familia probablemente haya que hacerla **por texto del campo
  `item`**; confirmar antes de contar con este dataset. La consulta
  `?$select=count(*)&$where=starts_with(codigo_unspsc,'30')` **probablemente falle con 400** porque
  esa columna no existe.


---

## 1.A.6 — Indices economicos oficiales (DANE, Banco de la Republica, MinMinas)

### Nota de metodo y calibracion de las etiquetas

En este entorno **WebFetch devolvio HTTP 403 en todos los hosts probados** (dane.gov.co,
microdatos.dane.gov.co, portafolio.co, invias.gov.co). Solo funciono WebSearch, que devuelve titulo,
URL y extractos indexados. Por tanto:

- **[VERIFICADO]** = la URL y el contenido citado aparecieron en resultados de busqueda de esta
  sesion, con extracto consistente con lo que aqui se afirma. **No** hubo lectura del PDF o del
  Excel original. Toda cifra marcada asi hay que reconfirmarla contra el documento fuente antes de
  meterla en una formula contractual.
- **[CONOCIDO]** = viene de entrenamiento, es solido, no se confirmo ahora.
- **[INCIERTO]** = probablemente existe o probablemente es asi, pero no consta ni a favor ni en
  contra en esta sesion. Se indica que buscar.

No existe la etiqueta "verificado por ausencia": la ausencia de un resultado en una busqueda no
prueba nada. Lo que no aparecio va como [INCIERTO].

`datos.gov.co` esta bloqueado por la allowlist del proxy (CONNECT 403), asi que ninguna consulta
SoQL de esta seccion se ejecuto. Las que se dan son plantillas para lanzar en produccion.

Un hallazgo de arranque que cambia el nombre de todo: **el ICCP ya no existe**. El DANE lo
sustituyo por el ICOCIV en 2022, igual que sustituyo el ICCV por el ICOCED. Modelar con "ICCP"
en 2026 es modelar con una serie muerta.

---

### Valores vigentes a la fecha del informe (agosto de 2026)

**Advertencia central: en este entorno NO se pudo descargar ningun anexo ni boletin del DANE (403
en todos los hosts). Las cifras de esta tabla provienen de extractos de busqueda, no de la lectura
del documento oficial. El modelo de actualizacion de precios NO esta calibrado mientras no se
descarguen y verifiquen, como minimo, las cuatro primeras filas contra el archivo fuente.**

| Indice | Mes de referencia | Cifra | Que es exactamente | Etiqueta |
|---|---|---|---|---|
| ICOCIV — grupo mano de obra | mar-2026 | **13,86 %** | Variacion **año corrido** (dic-2025 → mar-2026) | [VERIFICADO] |
| ICOCIV — grupo transporte | mar-2026 | **4,60 %** | Variacion año corrido | [VERIFICADO] |
| ICOCIV — grupo materiales | mar-2026 | no obtenido | El boletin lo publica; el extracto no lo trajo | [INCIERTO] |
| ICOCIV — grupo maquinaria y equipo | mar-2026 | no obtenido | idem | [INCIERTO] |
| ICOCIV — agrup. puertos/canales/presas/riego y otras obras hidraulicas (acueductos) | mar-2026 | **6,39 %** | Variacion año corrido | [VERIFICADO] |
| ICOCIV — agrup. carreteras, calles, vias ferreas, pistas, puentes y tuneles | mar-2026 | **5,44 %** | Variacion año corrido | [VERIFICADO] |
| ICOCIV — agrup. tuberias de gas a larga distancia, lineas de comunicacion y cables de energia; tuberias y cables locales y obras conexas | mar-2026 | **4,98 %** | Variacion año corrido | [VERIFICADO] |
| ICOCIV — agrup. construcciones deportivas al aire libre y otras obras de ingenieria civil | mar-2026 | **4,70 %** | Variacion año corrido | [VERIFICADO] |
| ICOCIV — agrup. construcciones en minas y plantas industriales | mar-2026 | **4,56 %** | Variacion año corrido | [VERIFICADO] |
| ICOCIV — **variacion 12 meses del total** | — | **no obtenido** | Es la cifra nuclear del reajuste y es la que falta | [INCIERTO] |
| ICOCIV — **nivel del indice y año base** | — | **no obtenido** | Sin nivel no se puede hacer `I(t)/I(base)` | [INCIERTO] |
| ICOCED nacional — variacion 12 meses | dic-2025 | **3,61 %** | Anual dic-2025 vs dic-2024 | [VERIFICADO] |
| ICOCED — mano de obra / maquinaria / equipo | dic-2025 | **7,86 % / 5,05 % / 4,99 %** | Anual por grupo de costo | [VERIFICADO] |
| ICOCED — dominio geografico relevante (Bogota-Cundinamarca, etc.) | — | **no obtenido** | Es justo el dato que sirve para regionalizar | [INCIERTO] |
| IPC — variacion 12 meses | jun-2026 | **6,14 %** | Anual; mensual 0,39 % | [VERIFICADO] |
| IPP oferta interna — variacion 12 meses | jun-2026 | **~3,30 %** | El extracto mezcla anual y año corrido (reporta tambien 4,99 % para consumo interno y 4,72 % de promedio en año corrido). **No usar sin abrir el boletin** | [INCIERTO] |
| IBC consumo y ordinario | jul-2026 | **19,19 % EA** | Resolucion SFC **0965 de 2026**, vigencia 1–31 de julio de 2026; sin variacion frente a junio de 2026 (19,19 % EA) | [VERIFICADO] |
| Tasa de usura (1,5 × IBC) | jul-2026 | **28,79 % EA** | Derivada del IBC de julio | [VERIFICADO] |
| IBC credito de consumo de bajo monto | jul-2026 | **41,77 % EA** | Misma resolucion | [VERIFICADO] |
| IBC credito productivo de mayor monto | jul-2026 | **27,51 % EA** | Misma resolucion | [VERIFICADO] |
| SMMLV | 2026 | **$1.750.905** | Ver seccion de mano de obra | [VERIFICADO] |
| Auxilio de transporte | 2026 | **$249.095** | idem | [VERIFICADO] |

Cifra que aparece citada en prensa y **no** se pudo anclar a un mes: variacion anual de mano de
obra del ICOCIV de **14,52 %** con materiales en **1,46 %** y contribucion de 2,50 p.p. al total
(nota de Portafolio cuya fecha de referencia no se confirmo). Sirve como orden de magnitud del
diferencial mano de obra vs materiales, **no** como insumo de una formula [INCIERTO].

---

### Tabla maestra de fuentes

| Indice / dato | Sigla vigente | Entidad | Periodicidad | Desagregacion | Uso en el modelo | Etiqueta |
|---|---|---|---|---|---|---|
| Costos de construccion de obras civiles | **ICOCIV** (reemplazo al ICCP) | DANE | Mensual | **Nacional [INCIERTO]**; 5 agrupaciones, 17 subclases CPC, 46 tipologias de obra, 316 capitulos constructivos, 7 grupos de costo | Deflactor y reajuste contractual **cuando el pliego lo pacta** — el nucleo | [VERIFICADO] |
| Costos de construccion de edificaciones | **ICOCED** (reemplazo al ICCV) | DANE | Mensual | 19 dominios geograficos (57 municipios) [INCIERTO]; 8 grupos de costo | Regionalizador + deflactor de edificacion | [VERIFICADO] |
| Precios al consumidor | **IPC** | DANE | Mensual | 38 ciudades | Reajuste contractual solo si el pliego lo pacta en IPC; proyeccion de inflacion | [VERIFICADO] |
| Precios del productor | **IPP** (oferta interna) | DANE | Mensual | Por CPC / actividad | Insumo directo — cemento, acero, agregados | [VERIFICADO] |
| Costos transporte de carga por carretera | **ICTC** | DANE | Mensual | Nacional + 8 corredores logisticos | **Solo el item de acarreo/flete de materiales** | [VERIFICADO] |
| Costos transporte intermunicipal de pasajeros | **ICTIP** | DANE | Trimestral | 19 ciudades, 142 articulos | Marginal: solo movilizacion de personal | [VERIFICADO] |
| TRM (dolar) | TRM | Superfinanciera / BanRep | Diaria | Nacional | Costo de materiales importados; costo financiero | [VERIFICADO] |
| Interes Bancario Corriente / usura | IBC | Superfinanciera | Mensual (resolucion) | Por modalidad de credito | Costo financiero (capital de trabajo) — **como piso, no como tasa del contratista** | [VERIFICADO] |
| IBR / DTF / tasas de colocacion | — | Banco de la Republica | Diaria / semanal | Nacional | Costo financiero (referencia de credito) | [CONOCIDO] |
| Precio ACPM y gasolina en surtidor | — | MinMinas + MinHacienda | Semanal desde 2026 (antes mensual) | Por ciudad / zona de frontera | **Combustible de maquinaria en sitio** | [VERIFICADO] |
| SMMLV y auxilio de transporte | — | Gobierno (decreto anual) | Anual, **con fecha de vigencia** | Nacional | Insumo de mano de obra **y** conversion a SMMLV del RUP/K | [VERIFICADO] |
| Precios asfalto y productos industriales | — | Ecopetrol | Mensual | Por planta | Insumo directo (pavimentos) | [VERIFICADO] |
| Precio de bolsa de energia | — | XM (SIMEM / SiNERGox) | Horaria / diaria | Nacional | Marginal en obra civil; util en plantas | [VERIFICADO] |

---

### Los indices de construccion: que existe HOY

#### ICOCIV — el que importa para obra civil

**Indice de Costos de la Construccion de Obras Civiles.** Sustituyo al **ICCP** (Indice de Costos
de la Construccion Pesada): la ultima publicacion del ICCP fue en enero de 2022 con resultados de
diciembre de 2021, y desde enero de 2022 solo se publica ICOCIV [VERIFICADO].

**Las 5 agrupaciones de subclases** (tal como aparecen en el cuadro de variacion del boletin de
mar-2026, con su variacion año corrido) [VERIFICADO]:

| # | Agrupacion | Var. año corrido mar-2026 | Relevancia para Helder/Genesis |
|---|---|---|---|
| 1 | Construcciones en minas y plantas industriales | 4,56 % | Baja |
| 2 | Tuberias para conduccion a larga distancia de gas, lineas de comunicacion y cables de energia; tuberias y cables locales y obras conexas | 4,98 % | Media (redes) |
| 3 | Puertos, canales, presas, sistemas de riego y otras obras hidraulicas | **6,39 %** | **Alta — acueducto y alcantarillado** |
| 4 | Construcciones deportivas al aire libre y otras obras de ingenieria civil | 4,70 % | Media (escenarios, parques) |
| 5 | Carreteras, calles, vias ferreas y pistas de aterrizaje; puentes, carreteras elevadas y tuneles | **5,44 %** | **Alta — vias** |

El "6" de una enumeracion previa venia de contar por separado las dos subclases de tuberias, que el
boletin agrupa en una sola linea (la #2). Son **5**.

Grupos de costo: materiales, mano de obra, maquinaria y equipo, transporte, entre otros hasta 7
grupos [VERIFICADO].

**Desagregacion territorial: no consta.** Los boletines consultados presentan resultado nacional y
no se hallo evidencia de corte por ciudad o departamento, pero tampoco se busco ni se hallo
evidencia en contra, y no se abrio el anexo estadistico. Estado real: **[INCIERTO]**. Mientras no se
resuelva, la regionalizacion se apoya en ICOCED (dominios) o en ICTC (corredores), y se documenta
como aproximacion.

- Boletines: `https://www.dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-{mes}{aaaa}.pdf`
  (ej. `bol-ICOCIV-mar2026.pdf`, publicado el 30/04/2026) [VERIFICADO]
- Pagina: `https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-obras-civiles-icociv` [VERIFICADO]
- Historicos: `.../indice-de-costos-de-la-construccion-de-obras-civiles-icociv-informacion-historica` [VERIFICADO]
- Microdatos / ficha: `https://microdatos.dane.gov.co/index.php/catalog/711` [VERIFICADO]

#### ICOCED — el regionalizador

**Indice de Costos de la Construccion de Edificaciones.** Producto de la revision metodologica del
**ICCV** hecha en 2021. Innovacion clave: sigue precios de **servicios de construccion a costo
completo** (no solo insumos sueltos) y define articulos con precio nacional, regional y local, lo
que le permite publicar **19 dominios geograficos a partir de informacion estructural de 57
municipios** [VERIFICADO].

Sobre la composicion exacta de esos 19 dominios: el ICCV cubria 10 ciudades y el ICOCED añade
dominios como Tunja, Popayan, Valledupar, Monteria, Santa Marta, Villavicencio, Armenia, Ibague,
Centro Occidente (Pereira-Dosquebradas) y Bogota-Cundinamarca. **10 + 10 no da 19**, de modo que
hay al menos una sustitucion o fusion (lo mas probable: Bogota-Cundinamarca y Centro Occidente
reemplazan a Bogota y Pereira del ICCV, no se suman). **La lista literal de los 19 dominios no se
pudo obtener: [INCIERTO].** Hay que leerla en el anexo antes de escoger el dominio con el que se
regionaliza — escoger mal es cambiar el resultado.

**Ocho grupos de costo**: equipo, maquinaria, mano de obra, transporte, materiales, servicios de
construccion especializados, equipo especial para obra y herramienta menor [VERIFICADO]. Esa
apertura por grupo es la que permite ponderar (ver formula abajo).

- Boletines: `https://www.dane.gov.co/files/operaciones/ICOCED/bol-ICOCED-{mes}{aaaa}.pdf` [VERIFICADO]

#### Calendario real (dato operativo, no cosmetico)

El boletin del mes M sale a **fin del mes M+1**: ICOCIV de feb-2026 se publico el 31/03/2026 y el de
mar-2026 el 30/04/2026; ICOCED de dic-2025 salio el 30/01/2026 [VERIFICADO]. **Consecuencia para
Detecta: el indice mas fresco disponible siempre tiene entre 30 y 60 dias de rezago.** Un pipeline
que asuma "indice del mes en curso" fallara silenciosamente todos los meses.

---

### IPC e IPP

- **IPC**: 38 ciudades, ~55.000 fuentes. Ultimo dato disponible: **jun-2026, variacion anual
  6,14 %, mensual 0,39 %** [VERIFICADO]. Sirve para clausulas de reajuste redactadas en IPC y para
  proyectar inflacion, **no** para actualizar un APU: la canasta del hogar no se parece a la de una
  obra.
- **IPP** (oferta interna): mide precios de venta del productor en el primer canal de distribucion
  [VERIFICADO]. Es la fuente correcta para **choques de insumo puntual** — cemento, acero,
  derivados de petroleo — que el ICOCIV promedia y por tanto disimula. Las cifras recuperadas para
  jun-2026 mezclan variacion anual (~3,30 %) y año corrido (~4,72 % promedio, 4,99 % consumo
  interno) y no se pudieron separar: **[INCIERTO], abrir `bol-IPP-jun2026.pdf` antes de usarlas**.
- Anexos Excel del DANE: la ruta observada en resultados de busqueda es del tipo
  `https://www.dane.gov.co/files/operaciones/{OPERACION}/{mes}{aaaa}/anex-{OPERACION}-...xlsx`
  (y `cp-IPC-jun2026.pdf`, `bol-IPC-jun2026.pdf` bajo `files/operaciones/IPC/jun2026/`)
  **[INCIERTO]**: no se descargo ni un archivo en esta sesion, y el DANE ha usado historicamente
  rutas alternas (`files/investigaciones/boletines/...`, visible todavia en documentos de 2022) y
  convenciones distintas de separador y de mes segun operacion y año.

  **Regla de implementacion — no hardcodear la plantilla.** Resolver el enlace del anexo leyendo la
  pagina de la operacion (una peticion) y **cachear la URL resuelta**. Si un `HEAD` a la plantilla
  devuelve 200, usarla como atajo; si devuelve 404, caer a la pagina. Registrar el **hash del
  archivo descargado** para detectar cambios de formato sin que se note tarde.

---

### Acceso programatico: que hay y que no

| Via | Que es | Estado | Etiqueta |
|---|---|---|---|
| Anexos Excel / boletines DANE | `.../files/operaciones/{OP}/{mes}{aaaa}/...` y `bol-*.pdf` | URL aparentemente predecible, sin API; **plantilla no confirmada** | [INCIERTO] |
| **API DANE propiamente dicha** | No aparece un servicio REST general de series | No consta; solo hay servicio web para **SIPSA** (precios agropecuarios) | [INCIERTO] |
| Microdatos DANE | `microdatos.dane.gov.co` — catalogo NADA, metadatos y microdatos anonimizados | Existe, catalogo 711 = ICOCIV | [VERIFICADO] |
| **datos.gov.co (Socrata SODA)** | Mismo motor que ya usa `lib/socrata.js` para SECOP II (`p6dx-8zbt`) | Existe; bloqueado en este entorno | [VERIFICADO] |
| TRM en Socrata | dataset `32sa-8pi3`, fuente Superfinanciera, actualizacion diaria | Existe | [VERIFICADO] |
| BanRep | Portal Suameca: catalogo, graficador y descarga multiple de series | Existe; no consta API REST publica documentada | [VERIFICADO] |
| XM / SIMEM | API sin credenciales, librerias en Python y Excel-VBA (repo `EquipoAnaliticaXM/API_XM`) | Existe | [VERIFICADO] |

**Implicacion arquitectonica para Detecta:** la TRM se puede ingerir con el **mismo transporte que
ya existe** — paginacion keyset por `:id`, backoff, sin reintentar 400. No hay que escribir un
cliente nuevo. El procedimiento es de **dos pasos**, y el primero no es opcional:

*Paso 1 — descubrir el esquema real (una sola fila, sin `$where`):*

```
GET https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1
```

Leer las claves devueltas y anotarlas. Hasta aqui no se filtra por nada: un nombre de columna
inventado en un `$where` produce **400**, y la regla del repo es que un 400 **no se reintenta** y
degrada el modo de paginacion.

*Paso 2 — solo entonces, ingesta keyset real:*

```
GET https://www.datos.gov.co/resource/32sa-8pi3.json
    ?$select=:id,:updated_at,*
    &$where=:id > '<ultimo_id_de_la_pagina_anterior>'
    &$order=:id
    &$limit=50000
```

El predicado sobre `:id` es lo que hace que esto sea keyset y no una sola pagina grande. **El filtro
por fecha se aplica EN CLIENTE** mientras no este confirmado el nombre de la columna de vigencia.

[PENDIENTE DE VERIFICAR EN PRODUCCION] — los nombres de columna de valor y vigencia del dataset
`32sa-8pi3` no se pudieron confirmar.

---

### Costo financiero: Banco de la Republica y Superfinanciera

- **TRM**: la calcula, certifica y difunde la **Superfinanciera**, no el BanRep [VERIFICADO]. El
  BanRep la republica como serie historica en Suameca.
- **Interes Bancario Corriente**: certificado por resolucion mensual de la Superfinanciera.
  **Resolucion 0965 de 2026**, vigencia 1–31 de julio de 2026: **19,19 % EA** para consumo y
  ordinario, **sin variacion frente a junio de 2026 (19,19 % EA)**; usura = 1,5 × IBC =
  **28,79 % EA**; consumo de bajo monto **41,77 % EA**; productivo de mayor monto **27,51 % EA**
  [VERIFICADO].
- **IBR y DTF**: series del BanRep/Superfinanciera, referencia habitual del credito de tesoreria
  [CONOCIDO, no verificado en esta sesion]. Verificar en
  `https://suameca.banrep.gov.co/estadisticas-economicas/catalogo`.

#### Costo financiero del capital de trabajo — supuesto explicito, no regla de dedo

El IBC **no es la tasa del contratista**: es un promedio de colocacion del sistema certificado por
la Superfinanciera. Un contratista pequeño se fondea a **IBC + spread**, y ademas paga costos que
no estan en ninguna tasa. El modelo se escribe asi:

    Sobrecosto financiero = MF × [ (1 + i_EA)^(N/12) − 1 ]  +  GMF  +  comisiones

    MF   = monto financiado = CD × pct_financiado
    CD   = costo directo del contrato
    i_EA = tasa efectiva anual del credito de tesoreria = i_referencia + spread
    N    = meses de ciclo de caja (ejecucion hasta pago efectivo)
    GMF  = 4 × 1000 sobre cada desembolso gravado
    comisiones = comision de estudio / apertura de la linea, avales, estampillas

| Variable | Valor de arranque | Naturaleza | Como se calibra |
|---|---|---|---|
| `i_referencia` | 19,19 % EA (IBC jul-2026) | [VERIFICADO] pero es un **piso** | Pedir la tasa real de la linea de tesoreria al banco del contratista |
| `spread` | **supuesto a calibrar** | No hay cifra defendible sin la carta de aprobacion del credito | Diferencia entre la tasa cotizada y el IBC del mes |
| `pct_financiado` | **supuesto a calibrar** | Es el saldo de obra ejecutada y **no facturada**, no el 100 % del CD | Reconstruirlo con **dos contratos propios** ya ejecutados: cuanto se giro y cuando se cobro |
| `N` | plazo del contrato + dias de tramite de acta y giro | Observable | Actas y fechas de pago reales |
| GMF | 4 × 1000 | [CONOCIDO], Estatuto Tributario | Verificar exenciones aplicables |

Equivalencia mensual, para orden de magnitud: con `i_EA = 19,19 %`, un mes cuesta
`(1,1919)^(1/12) − 1 ≈ **1,46 % del monto financiado**` — no del costo directo, y **no son "puntos
de AIU"**: el AIU es un porcentaje sobre el costo directo y el sobrecosto financiero se calcula
sobre `MF`. Convertirlo a punto de AIU exige multiplicar por `pct_financiado`, que es justamente el
parametro que todavia no esta calibrado.

#### Anticipo: dos figuras distintas y un dato que significa "no se"

**`anticipo_pct = 0` significa SIN DATO, no "sin anticipo", y por tanto NO puede disparar el
calculo.** Es la misma regla que el repo ya aplica en el resto de la app (0 oferentes = sin dato).
Regla operativa:

- si `anticipo_pct > 0` → financiar solo la fraccion `(1 − anticipo_pct)`;
- si `anticipo_pct = 0` → marcar el proceso como **"anticipo por verificar en el pliego"** y
  presentar **dos escenarios**: 0 % y el 30 % tipico de obra publica. Nunca uno solo.

| Figura | Naturaleza del recurso | Se amortiza | Garantia / vehiculo | Rendimientos | Tope |
|---|---|---|---|---|---|
| **Anticipo** | Sigue siendo recurso **publico** | Si, contra actas | Poliza de **buen manejo y correcta inversion del anticipo**; ademas **patrimonio autonomo (fiducia)** en los contratos de obra celebrados por licitacion publica — art. 91 de la Ley 1474 de 2011 [CONOCIDO] | **No son del contratista** | 50 % del valor del contrato — paragrafo del art. 40 de la Ley 80 de 1993 [CONOCIDO] |
| **Pago anticipado** | Ingresa al **patrimonio del contratista** | No se amortiza | Poliza segun pliego | Del contratista | El pliego |

Costos que hoy no aparecen en ningun APU y deben aparecer cuando hay anticipo: **comision de la
fiducia** que administra el patrimonio autonomo y **prima de la poliza de buen manejo**. Ambos se
cotizan, no se descubren despues.

---

### Combustibles: MinMinas

El precio del ACPM y la gasolina se fija por **resolucion**, no por dataset. La **Resolucion
104 004 del 19/02/2026** reorganizo la estructura de precios de gasolina corriente, corriente
oxigenada, ACPM y ACPM mezclado, a nivel nacional en estaciones automotrices, exceptuando zonas de
frontera [VERIFICADO]. Cambio de fondo en 2026: el **Ingreso al Productor** pasa a calcularse por
**paridad internacional con promedio semanal**, es decir la actualizacion deja de ser mensual y pasa
a ser **semanal** [VERIFICADO].

**Dos usos distintos que no se pueden sustituir el uno por el otro:**

| Partida del APU | Fuente correcta | Por que |
|---|---|---|
| **Acarreo / flete de materiales** (viaje de volqueta o tractocamion) | **ICTC** (mensual, 8 corredores logisticos) | Ya incorpora combustible, **peajes**, llantas y mantenimiento de vehiculo de carga en carretera |
| **Combustible de maquinaria amarilla en sitio** (retroexcavadora, vibrocompactador, planta) | **Precio publicado del ACPM para la ciudad**, × rendimiento (gal/h) del equipo | No paga peajes, tiene otro consumo horario y otra estructura de llantas. Meterle el ICTC es cargar peajes de tractocamion a una partida donde no existen |

**El FEPC es la variable que explica la volatilidad del ACPM y no se puede omitir.** El Fondo de
Estabilizacion de Precios de los Combustibles absorbe la diferencia entre el precio interno y la
paridad internacional; cuando el diferencial se acumula, el Gobierno lo cierra a saltos, no de
forma suave. Estado a 2026 [VERIFICADO en prensa economica, no en acto administrativo]:

- Estimacion Anif a marzo de 2026: brecha por galon de aproximadamente **−$800 en gasolina** y
  **−$5.700 en ACPM** frente al mercado externo.
- Deficit del FEPC proyectado para 2026: cercano a **$14 billones** si no hay ajustes adicionales.
- Ajuste aplicado el **4 de mayo de 2026**: **+$400/galon** en gasolina corriente y **+$200/galon**
  en ACPM, atribuido al cierre de la brecha del FEPC.
- **Decreto 1428 de 2025**: establecio un **mecanismo diferencial** de precio del ACPM para
  proteger al transporte publico; MinMinas y MinHacienda publicaron proyecto de resolucion con la
  metodologia de ingreso al productor del diesel por paridad internacional acotada por el costo de
  paridad de importacion. Implementacion aun sin cerrar a mayo de 2026.

Consecuencia para el modelo: la partida de ACPM se cotiza con **escenario de alza escalonada**, no
con una escalacion suave tipo indice. Un contrato de 12 meses en 2026 puede atravesar dos o tres
saltos discretos.

Formato de la fuente: **PDF de resolucion**, no dato estructurado. Existe el **SICOM** (Sistema de
Informacion de Combustibles Liquidos) administrado por MinMinas [VERIFICADO].

Ecopetrol publica **precios vigentes de productos petroquimicos e industriales con actualizacion
mensual**, calculados por paridad con indicadores internacionales [VERIFICADO] — es la fuente para
asfalto, el insumo mas volatil de un pavimento y el que peor captura cualquier indice promedio.

---

### Mano de obra: SMMLV 2026, costo empresa y una alerta juridica

| Concepto | 2025 | 2026 | Variacion | Norma | Etiqueta |
|---|---|---|---|---|---|
| SMMLV | $1.423.500 | **$1.750.905** | **+23,0 %** (base 2025 = $1.423.500; 1.423.500 × 1,23 = 1.750.905, exacto al peso; aumento nominal $327.405) | Decreto **1469** de 29/12/2025, ratificado transitoriamente por el Decreto **0159** del 19/02/2026 | [VERIFICADO] |
| Auxilio de transporte | $200.000 [CONOCIDO] | **$249.095** (~$8.303/dia) | **+24,5 %** (249.095 / 200.000 = 1,2455) | Decreto **1470** de 29/12/2025 | [VERIFICADO] el valor 2026 |
| Suma informativa SMMLV + auxilio | $1.623.500 | $2.000.000 | — | **No es un concepto legal ni el costo del empleador** | [VERIFICADO] como suma |

**Los dos componentes NO suben igual** (+23,0 % vs +24,5 %). Por eso el ponderador de mano de obra
de una formula de reajuste **no puede ser el porcentaje del decreto**: hay que usar la variacion del
**grupo "mano de obra" del ICOCIV**, que ademas incorpora prestaciones, rotacion y disponibilidad
regional de cuadrillas.

#### Costo empresa: lo que convierte un indice salarial en un costo de APU

    Costo empresa mensual = SMMLV × factor_prestacional + auxilio de transporte

El **factor prestacional** para obra civil (prestaciones sociales, seguridad social, **ARL clase IV
o V** segun la actividad, dotacion) es un **SUPUESTO A CALIBRAR con la nomina real** de Helder y
Genesis. Los ordenes de magnitud que se manejan usualmente en el sector estan **entre 1,5 y 1,6**
[CONOCIDO] y **deben verificarse contra la nomina propia, no copiarse**: la clase de riesgo, la
exoneracion de aportes y la politica de dotacion mueven el resultado varios puntos.

Reglas del auxilio de transporte que cambian el calculo [CONOCIDO, verificar contra el CST]:
se paga solo a quien devenga **hasta 2 SMMLV**; se causa **por dia efectivamente laborado**; es
**base de prima y cesantias** pero **no** de aportes a seguridad social.

#### Alerta juridica y la pregunta que mueve dinero

El Decreto 1469 tuvo una vida judicial agitada: el Consejo de Estado (Seccion Segunda) decreto
**suspension provisional el 12/02/2026** por posible violacion del art. 8 de la Ley 278 de 1996 —
el decreto enunciaba los parametros legales pero no explicaba de forma concreta y verificable como
llevaban al 23 % — y **ordeno al Gobierno expedir un decreto transitorio en 8 dias**; el 14/04/2026
nego los recursos y mantuvo la suspension; y el **17/07/2026 revoco la suspension**. **La nulidad
simple sigue en tramite** [VERIFICADO]. Los radicados de los tres autos **no se confirmaron**:
solicitarlos a la Relatoria del Consejo de Estado [INCIERTO].

**Pregunta abierta y decisiva: durante la suspension (12/02–17/07/2026), ¿que SMMLV rigio?**
Respuesta segun la evidencia recogida: **rigio $1.750.905 durante todo el periodo**, por dos
razones encadenadas [VERIFICADO]:

1. El auto del 12/02/2026 dispuso que la suspension **solo surtiria efectos desde la publicacion
   del decreto transitorio**; entre tanto seguia rigiendo el Decreto 1469 de 2025 ($1.750.905).
2. El **Decreto 0159 del 19/02/2026** (Ministerio del Trabajo) fijo transitoriamente el SMMLV 2026
   en **$1.750.905** — el mismo valor, mismo 23 % —, con vigencia "hasta tanto se dicte sentencia".

Consecuencia practica: **no hay hoy un periodo de 2026 con un SMMLV distinto de $1.750.905**, y por
tanto no hay que recalcular nominas, actas ni conversiones de experiencia de ese periodo. **Pero el
riesgo sigue abierto**: la nulidad esta en tramite y una sentencia podria fijar otro porcentaje. Se
debe leer el texto de los autos del 12/02, 14/04 y 17/07 de 2026 antes de dar esto por cerrado.

**Modelar el SMMLV como serie con fecha de vigencia y fuente normativa, no como constante**, es
exactamente la mitigacion de ese riesgo. Esquema minimo:

| Campo | Tipo | Ejemplo |
|---|---|---|
| `vigencia_desde` | fecha | 2026-01-01 |
| `vigencia_hasta` | fecha o null | null |
| `valor_cop` | entero | 1750905 |
| `auxilio_transporte_cop` | entero | 249095 |
| `norma` | texto | "Decreto 1469 de 2025; ratificado por Decreto 0159 de 2026" |
| `estado_judicial` | enum | `vigente` / `suspendido` / `transitorio` / `anulado` |

#### Efecto real del SMMLV sobre la K de contratacion

Corrigiendo una lectura frecuente: en `lib/capacidad.js`, `presupuestoSMMLV = presupuestoCOP / SMMLV`
y `r = expSMMLV / presupuestoSMMLV`. Es decir, **el SMMLV MULTIPLICA la razon**: un SMMLV mayor
reduce el presupuesto expresado en SMMLV, **aumenta** `r` y por tanto **puede aumentar** el factor E.

Pero `factorE` es una funcion **escalonada**:

| Razon `r = expSMMLV / presupuestoSMMLV` | factor E |
|---|---|
| r ≥ 3 | 120 |
| r ≥ 2 | 100 |
| r ≥ 1 | 80 |
| resto | 60 |

De modo que **un cambio del SMMLV solo altera la capacidad de los procesos cuyo `r` cruce uno de
esos tres cortes**, no de todo el portafolio. La forma de cuantificar el efecto de una variacion del
SMMLV de factor `k` (k = 1,23 para el alza de 2026) es **listar los procesos cuyo `r` cae en la
banda `[x/k , x]` alrededor de cada corte x ∈ {1, 2, 3}**. Fuera de esas bandas el efecto es
exactamente cero.

**Advertencia adicional antes de publicar cifras de K:** `lib/capacidad.js` calcula E con el
**mayor contrato acreditado**, mientras la Guia CCE-EICP-GI-22 define el factor de experiencia sobre
el **valor total** de los contratos acreditados frente al presupuesto oficial. Verificar contra la
version vigente de la guia antes de usar la K como argumento frente a una entidad.

---

### Como se encadena: base INVIAS 2025 + ICOCIV = precio de hoy

#### Antes de cualquier formula: el reajuste no es un derecho automatico

**En contratacion estatal no hay reajuste si el pliego y la minuta no traen la clausula y su
formula.** El indice es del pliego, no del contratista. Antes de modelar, verificar en el pliego:

1. **si hay clausula de ajuste**;
2. **que indice usa** (ICOCIV, IPC, un indice sectorial, una canasta propia);
3. **cual es el mes base `Io`** — normalmente la fecha de cierre del proceso de seleccion;
4. **si el ajuste es mensual o por acta**, y si tiene tope.

Sin clausula, la variacion de precios **no se reajusta**: solo queda el **restablecimiento del
equilibrio economico y financiero del contrato** (arts. 4.3, 4.8, 5.1 y 27 de la Ley 80 de 1993
[CONOCIDO]), que es un camino distinto y con carga probatoria mucho mas alta: exige un hecho
**imprevisible y ajeno** a las partes y una **ruptura grave** de la ecuacion contractual. Una
inflacion ordinaria, previsible al momento de ofertar, **no** la configura.

**Consecuencia operativa: en contrato sin clausula de ajuste, la escalacion esperada se cotiza
dentro del precio de la oferta; no se reclama despues.**

**Advertencia de doble conteo:** si el contrato **si** ajusta por indice, el APU se presenta a la
fecha de cierre (`Io`) y **no se vuelve a actualizar** con el indice — de eso se encarga la formula
contractual. Actualizar el APU y ademas aplicar el ajuste es cobrar dos veces la misma escalacion,
y es una observacion tipica en evaluacion.

#### La base INVIAS

INVIAS adopto el **ICOCIV** como indice de ajuste de precios unitarios para sus contratos de obra a
precios unitarios con formula de ajuste por indices mensuales, y publico la **"Cartilla reversion
precios — procedimiento de implementacion del Indice de Costos de la Construccion de Obras Civiles
(ICOCIV)"**, disponible en
`https://www.invias.gov.co/index.php/archivo-y-documentos/documentos-tecnicos/13724-cartilla-reversion-precios-procedimiento-de-implementacion-del-indice-de-costos-de-la-construccion-de-obras-civiles-icociv/file`
[VERIFICADO la existencia del documento]. **El numero y la fecha del acto administrativo que lo
adopta formalmente no se pudieron establecer: [INCIERTO]** — pedirlos a la Subdireccion de Estudios
e Innovacion / Grupo de Precios de INVIAS antes de citarlo ante una entidad.

La cartilla define reversion como "llevar el precio de los insumos nuevos de un item no previsto a
la fecha de cierre del proceso de seleccion (`Io`)" y menciona **base diciembre de 2021**
[VERIFICADO como mencion, no como valor del indice].

#### Formulas

**Actualizacion simple hacia adelante:**

    P(t) = P(base) × I(t) / I(base)

donde `I` es el ICOCIV de la agrupacion pertinente, `base` es el mes de vigencia de la lista de
precios (p. ej. dic-2025 para una base INVIAS 2025) y `t` el ultimo mes publicado.

**Ponderada por grupo de costo (la que se debe usar):**

    P(t) = P(base) × Σ_g  w_g × [ I_g(t) / I_g(base) ]     con Σ_g w_g = 1

`w_g` = participacion del grupo en el APU (materiales, mano de obra, maquinaria y equipo,
transporte). Ventaja concreta y verificable con los datos de mar-2026: el grupo **mano de obra** del
ICOCIV subio **13,86 %** en año corrido mientras el conjunto de agrupaciones se movio entre 4,56 % y
6,39 %. La formula simple con el indice general **subestima** la partida intensiva en jornal y
**sobreestima** la intensiva en material. Con `w_g` de cada APU el error se acota.

Nota importante: el ponderador de mano de obra usa **13,86 % (grupo del ICOCIV)**, no **23,0 %
(decreto del SMMLV)**. El decreto fija el piso salarial; el indice mide lo que efectivamente costo
la mano de obra en obra civil, que no es lo mismo.

**Reversion (hacia atras, para comparar contra un presupuesto oficial antiguo):**

    P(Io) = P(t) × I(Io) / I(t)

**Regionalizacion (aproximada, porque ICOCIV es nacional):**

    P(t, ciudad) = P(t, nacional) × [ ICOCED_ciudad(t)/ICOCED_ciudad(base) ] ÷ [ ICOCED_nal(t)/ICOCED_nal(base) ]

Es un **factor de deriva relativa**, no un precio regional. Aplica bien a mano de obra y transporte;
mal a materiales importados, cuyo diferencial regional lo manda el flete (ICTC por corredor) y no la
ciudad.

#### Limites que hay que decir en voz alta

1. **El indice es un promedio de canasta fija (Laspeyres).** No captura el choque de un insumo
   puntual: si el asfalto sube 40 % y pesa 8 % de la canasta, el indice general se mueve ~3 %. Para
   eso estan el IPP desagregado y la lista de Ecopetrol.
2. **Rezago de 30-60 dias.** Nunca hay indice del mes en curso.
3. **Empalme de series.** ICCP→ICOCIV (ene-2022) e ICCV→ICOCED son **rupturas metodologicas**, no
   cambios de base. Encadenar por variacion, jamas dividir niveles de series distintas.
4. **El indice mide costo, no precio de mercado.** No incorpora la presion competitiva de la
   licitacion ni el AIU. Un precio actualizado por ICOCIV es un **piso de costo**, no la oferta.
5. **ICOCIV nacional [INCIERTO]**: cualquier regionalizacion es una aproximacion documentada.
6. **Sin clausula en el pliego, el indice no da derecho a nada.** Es el limite mas caro de todos.

#### Vacios y siguiente paso

| Vacio | Como se averigua |
|---|---|
| **Nivel y variacion 12 meses del ICOCIV total y de sus 4 grupos de costo** — sin esto el modelo no esta calibrado | Descargar `bol-ICOCIV-{mes}{aaaa}.pdf` y su anexo Excel desde una red sin bloqueo; los cuadros de variacion anual por grupo y por agrupacion estan en el boletin |
| Nivel del ICOCED nacional y del dominio relevante | `bol-ICOCED-{mes}{aaaa}.pdf` + anexo |
| Separacion correcta de las cifras del IPP jun-2026 (anual vs año corrido) | `dane.gov.co/files/operaciones/IPP/bol-IPP-jun2026.pdf` |
| Si el ICOCIV publica algun corte territorial | Anexo estadistico del ICOCIV, revisar hojas; ficha metodologica en `microdatos.dane.gov.co/index.php/catalog/711` |
| Año/mes base exacto del ICOCIV (¿dic-2021 = 100?) | El indicio de "base diciembre de 2021" viene de la cartilla INVIAS. Confirmar en el encabezado del anexo Excel del DANE |
| **Lista literal de los 19 dominios geograficos del ICOCED** | Anexo del ICOCED. Verificar la hipotesis de que Bogota-Cundinamarca y Centro Occidente sustituyen (no suman) a Bogota y Pereira del ICCV |
| Las 46 tipologias de obra y cual corresponde a acueducto / via terciaria | Anexo del ICOCIV, hoja de tipologias; es lo que permite elegir el indice correcto por proceso |
| **Convencion real de URL de los anexos DANE**: separador (guion vs guion bajo), formato de mes (`mar2026` vs `mar26`) y ruta (`files/operaciones` vs `files/investigaciones`), **por operacion y por año** | Abrir la pagina de cada operacion y leer el `href` real de un anexo; guardar la URL resuelta en cache y el hash del archivo |
| Nombres de columna del dataset TRM `32sa-8pi3` | `GET https://www.datos.gov.co/resource/32sa-8pi3.json?$limit=1` y leer las claves. Bloqueado aqui |
| Si existe dataset de precios de combustible en datos.gov.co | Catalogo Socrata: `https://www.datos.gov.co/api/catalog/v1?q=combustible`. No se pudo probar |
| Numero y fecha del acto de INVIAS que adopta el ICOCIV | Pedirlo a la Subdireccion de Estudios e Innovacion / Grupo de Precios de INVIAS |
| Resolucion MinMinas de precios de combustibles del mes en curso | **Normograma y sala de prensa de MinMinas, y SICOM** (la CREG regula energia y gas natural, no la estructura de precios de gasolina y ACPM). La 104 004 de 19/02/2026 esta [VERIFICADO]; las posteriores no |
| Estado final del mecanismo diferencial de ACPM del Decreto 1428 de 2025 | Resolucion definitiva MinMinas–MinHacienda; a mayo de 2026 solo constaba proyecto |
| Radicados de los tres autos del Consejo de Estado (12/02, 14/04 y 17/07 de 2026) | Radicado no confirmado; solicitarlo en la Relatoria del Consejo de Estado (Seccion Segunda) |
| Confirmacion del auxilio de transporte 2025 en $200.000 (base de la variacion +24,5 %) | Texto del decreto de auxilio de transporte para 2025 |
| Factor prestacional real de Helder y Genesis | Nomina propia de los ultimos 12 meses: costo total empleador / (SMMLV × n empleados) |
| `pct_financiado` y `spread` del credito de tesoreria | Dos contratos propios ya ejecutados (fechas de acta vs fechas de giro) + carta de aprobacion del banco |
| Si existe un servicio REST de series del DANE | No consta en esta sesion. Confirmar en `dane.gov.co/index.php/estadisticas-por-tema/servicios` |
| Tasas IBR/DTF vigentes | `suameca.banrep.gov.co/estadisticas-economicas/catalogo`, seccion tasas de interes |


---

## 1.B.1 — Evidencia sobre variacion regional de precios en Colombia

### Nota de método y de honestidad sobre las fuentes

En este entorno `WebSearch` funciona, pero **`WebFetch` devolvió HTTP 403 en todos los dominios `*.gov.co`** (invias.gov.co, dane.gov.co, plc.mintransporte.gov.co, funcionpublica.gov.co, secretariasenado.gov.co) y también en `repositorio.uniandes.edu.co`; `datos.gov.co` está bloqueado por allowlist y no se intentó. Por eso se usa esta convención:

| Etiqueta | Significado en esta sección |
|---|---|
| `[VERIFICADO-BÚSQUEDA]` | La URL existe y el buscador devolvió texto de la propia página oficial que dice lo afirmado. **No** se abrió el cuerpo del documento (403). |
| `[CONOCIDO]` | Sólido por entrenamiento, sin confirmar en esta sesión. |
| `[INCIERTO]` | Fuente comercial, divulgativa o periodística, o inferencia propia. No usar como número de decisión. |
| `[PENDIENTE PRODUCCIÓN]` | Solo comprobable ejecutando la consulta desde el despliegue, o abriendo un documento que aquí devuelve 403. |
| `[SUPUESTO A CALIBRAR]` | Cifra propia, elegida para poder operar, que debe ajustarse con datos reales antes de usarse. |

Regla que se aplica sin excepción: **ninguna cifra de este documento se inventó**. Donde no hay cifra dura, se dice y se deja el hueco marcado. Los ejemplos numéricos que sirven para explicar un método se escriben en modo hipotético y con letras, no con nombres de ciudad reales.

### 1. INVIAS: publica precios YA regionalizados, no factores de ajuste

Esta es la respuesta a la pregunta clave, y es inequívoca: **INVIAS no publica un factor multiplicador por región; publica el APU completo ya calculado para cada provincia.**

| Hecho | Detalle | Fuente |
|---|---|---|
| Producto | «Análisis de Precios Unitarios (APU) Regionalizados de Referencia» | `[VERIFICADO-BÚSQUEDA]` https://www.invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/ |
| Granularidad | **140 provincias / subregiones** del territorio nacional, excluyendo la provincia «Bogotá D.C.» | misma URL |
| División usada | División territorial adoptada por INVIAS **con base en la clasificación del DANE** | misma URL |
| Descarga | El módulo «Consulta de APU de referencia» permite bajar **una provincia**, **todas las provincias de un departamento** o **las 140 del país** | `[VERIFICADO-BÚSQUEDA]` misma URL. Implica que existe al menos la relación departamento→provincia; la relación **provincia→municipio** no está confirmada (ver vacío 6-bis) |
| Vigencia más reciente confirmada | **2025-2, precios a 30 de diciembre de 2025**. No se pudo confirmar si ya está publicada 2026-1 | misma URL |
| Frecuencia | Semestral | misma URL |
| Qué se regionaliza | Precios de insumos y costos de actividad **más ajuste de factores prestacionales y de rendimientos de mano de obra y equipo** según las particularidades de cada provincia | misma URL |
| Alcance temático | Infraestructura de transporte (obedece a las Especificaciones Generales de Construcción de Carreteras del INVIAS) | `[VERIFICADO-BÚSQUEDA]` https://www.invias.gov.co/index.php/informacion-institucional/hechos-de-transparencia/analisis-de-precio-unitarios |
| Actualización participativa | INVIAS convoca públicamente a proveedores y constructores a aportar precios para la actualización | `[VERIFICADO-BÚSQUEDA]` https://www.invias.gov.co/publicaciones/9569/invias-invita-a-participar-en-la-actualizacion-de-precios-de-referencia-para-infraestructura-de-transporte/ |

#### 1.1 Qué es y qué NO es ese precio (la confusión que cuesta dinero)

El APU regionalizado de INVIAS es el insumo con el que **la entidad** arma el presupuesto oficial. Por tanto:

- Para el contratista es el **INGRESO esperado por unidad**, es decir el techo de lo que le van a pagar, **no su costo**.
- Es **costo directo**: no incluye AIU (Administración, Imprevistos y Utilidad). El AIU lo define el pliego aparte, como porcentaje sobre el costo directo.
- El costo propio de compra, flete y rendimiento del contratista **no tiene por qué coincidir** con el de referencia: la referencia es un promedio de condiciones eficientes de la provincia, y el contratista concreto compra donde compra y rinde lo que rinde.

Por eso **no se puede «leer el precio y ofertar»**. La decisión de rentabilidad exige comparar el precio de referencia regional contra el costo real cotizado en esa provincia. La variación regional solo importa en la medida en que mueva el costo propio **por encima de lo que el presupuesto oficial ya reconoce en esa provincia** — porque INVIAS ya regionalizó el ingreso.

**Regla de decisión explícita** (aplicable ítem a ítem y luego al total ponderado por cantidades):

> Si `costo_directo_regional_propio > precio_referencia_regional × (1 − AIU_objetivo)`, el ítem se ejecuta a pérdida contra el presupuesto oficial. Si eso ocurre en los ítems que concentran la mayor parte del valor del contrato, **no presentarse** (o presentarse solo si hay un ítem compensador claro y verificable).
>
> `AIU_objetivo` es una decisión del contratista, no un dato público: hay que fijarlo con los estados financieros propios y declararlo `[SUPUESTO A CALIBRAR]`. El pliego suele fijar un AIU máximo o un rango; ese sí se lee del proceso concreto.

#### 1.2 Sí se puede DERIVAR un factor de nivel a partir de esos APU

Es exactamente lo que el DANE no da (§2): fijar una canasta de ítems representativos (excavación, base granular, concreto clase D, acero de refuerzo, transporte de material) y calcular, para cada provincia *p*:

```
F_p = Σ w_i · P_i,p  /  Σ w_i · P_i,ref
```

con la referencia en una provincia ancla o en la mediana nacional. Eso es un índice de **nivel**, comparable entre provincias, y su insumo es público y oficial. Es la vía más defendible que se encontró para regionalizar sin inventar nada — **siempre que los pesos no se inventen**:

- **`w_i` deben ser las cantidades de un presupuesto real ejecutado por el contratista**, o la mediana de cantidades de 5–10 presupuestos oficiales del mismo tipo de obra. Pesos elegidos «a criterio» convierten `F_p` en un factor arbitrario, que no es más defendible que el factor regional que esta sección se niega a inventar.
- **La canasta tiene que ser idéntica para `p` y para la referencia**, ítem por ítem y unidad por unidad. Si un ítem no existe en una provincia, se excluye de **ambos** lados del cociente, no solo del numerador.
- `F_p` es un índice de **costo directo vial**. No se le puede aplicar AIU ni extrapolar a capítulos que la canasta no contiene.

#### 1.3 Límite real del catálogo

El catálogo es vial. Para edificación (colegios, escenarios, redes) el APU regionalizado sirve como proxy de los *insumos comunes* (mano de obra, transporte, agregados, concreto), **no** de los capítulos de acabados, carpintería, instalaciones especiales o cubiertas. Esta limitación acota el uso de `F_p` en §7.

#### 1.4 Complemento normativo y otras referencias de precios

El **SICE** y su **Registro Único de Precios de Referencia (RUPR)**, creados por la **Ley 598 de 2000**, fueron suprimidos por el **Decreto-Ley 019 de 2012** (norma con fuerza de ley, no decreto reglamentario). El artículo comúnmente citado como derogatorio es el **222**, pero **hay que VERIFICARLO abriendo la norma en el gestor normativo de Función Pública o en el Diario Oficial antes de citarlo en un documento contractual** — aquí solo se confirmó por ficha de síntesis y por resultados de búsqueda, no por el texto de la norma. Consecuencia práctica y no discutida: **cada entidad elabora su propia lista de precios y no hay tarifario nacional obligatorio.** `[VERIFICADO-BÚSQUEDA]` https://sintesis.colombiacompra.gov.co/content/lista-de-precios-y-registro-%C3%BAnico-de-precios-0 ; ficha de la Ley 598 de 2000 en https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=6252

INVIAS es la única referencia regionalizada **nacional y gratuita**. No es la única referencia utilizable:

| Referencia | Cobertura | Acceso | Etiqueta |
|---|---|---|---|
| APU Regionalizados INVIAS | 140 provincias, temática vial | Gratuito | `[VERIFICADO-BÚSQUEDA]`, §1 |
| Base de precios unitarios del IDU | Bogotá D.C. (justo la provincia que INVIAS excluye) | Gratuito, portal IDU | `[CONOCIDO]` — confirmar la vigencia publicada y su periodicidad |
| Listas de precios de gobernaciones y de ENTerritorio | Departamental / por proyecto tipo | Gratuito cuando se publica; irregular | `[CONOCIDO]` |
| Construdata, Camacol y similares | Series comerciales por ciudad, con desagregación de insumos y de $/m² de edificación | **De pago** | `[CONOCIDO]` — es la vía más rápida para **edificación**, que es donde INVIAS no llega |

### 2. DANE: la trampa del índice base 100 (variación ≠ nivel)

| Índice | Desagregación geográfica | Base | Qué mide | ¿Sirve para comparar niveles entre ciudades? |
|---|---|---|---|---|
| **ICCP** (construcción pesada — el temáticamente correcto para obra civil) | **Nacional. No se desagrega por ciudad.** Canasta de 120 insumos básicos y ~170 artículos de nivel flexible; grupos de equipo, materiales, transporte, mano de obra e indirectos. Última revisión metodológica de la canasta: **2005** | **No confirmada en esta sesión.** El periodo base viene declarado en la portada del boletín técnico: leerlo ahí antes de citarlo `[PENDIENTE PRODUCCIÓN]` | Variación de costos | **No, y ni siquiera hay dominios ciudad** |
| **ICOCED** (edificaciones, rediseño del ICCV; oficial desde el 25 de febrero de 2022) | **19 dominios geográficos**, formados a partir de información de **57 municipios** que en general incluyen una ciudad principal o capital departamental. La lista exacta de los 19 debe leerse del boletín: **el reparto entre «originales del ICCV» y «nuevos» no se pudo verificar**, y la ausencia de Armenia en las listas que circulan es sospechosa dado que el ICCV se publicaba para 15 ciudades | **diciembre 2021 = 100** | Variación mensual de precios de una canasta (8 grupos de costo, 54 subgrupos, 93 insumos, 7 sistemas constructivos) | **No** |

Fuentes: `[VERIFICADO-BÚSQUEDA]` https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-edificaciones-icoced ; https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-pesada-iccp ; boletines mensuales en https://www.dane.gov.co/files/operaciones/ICOCED/ (existen al menos hasta `bol-ICOCED-feb2026.pdf`; todos devolvieron 403 en este entorno).

**La trampa, explícita:** cada dominio del ICOCED arranca en 100 en diciembre de 2021. Supóngase que la ciudad A cierra un mes en 138 y la ciudad B en 131: **eso NO significa que construir en A cueste un 5% más que en B**. Significa que A acumuló 7 puntos más de inflación de costos *desde su propio punto de partida*, y ese punto de partida es desconocido — pudo ser más caro o más barato que el de B en diciembre de 2021. Los números 138 y 131 de este párrafo son **ilustrativos e inventados a propósito para explicar el razonamiento**: no corresponden a ninguna ciudad ni a ningún mes. Los valores reales, si se necesitan, se leen del cuadro del boletín ICOCED del mes de referencia, citando número de tabla y mes.

Lo único legítimo que se puede extraer del ICOCED es la **deriva relativa** entre ciudades desde la base — útil para envejecer un precio ciudad a ciudad, inútil para comparar niveles. Y para obra civil pesada ni eso: el ICCP es nacional.

### 3. Magnitudes por componente — lo que hay y lo que no

| Componente | Dato disponible | Etiqueta |
|---|---|---|
| Materiales — zonas insulares | m² construido en San Andrés ≈ $2.500.000 (acabados 1A) y ≈ $3.500.000 en dos pisos, según un constructor local citado por prensa (Infobae, ago-2022). **Pesos corrientes de agosto de 2022**: para usarlos en 2026 hay que llevarlos a la fecha de oferta con el ICOCED o el ICCP. Ruta física: terrestre a Cartagena + ~800 km marítimos a un único muelle operativo | `[INCIERTO]` — declaración periodística de 2022, sin metodología ni muestra. **No es un % contra el continente** |
| Materiales — Providencia | Dato descartado. Las cifras de casas entregadas tras el huracán Iota corresponden a **reconstrucción de emergencia con subsidio**, no a precios de mercado, y se publican **sin área asociada**: inutilizables como $/m² y no comparables con nada | descartado |
| Materiales — Chocó, Amazonas, Guajira, Vichada | **No se encontró ninguna cifra pública comparable** de precio de cemento/acero/agregados por región | vacío real |
| Materiales — fletes de agregados | «30–50% del precio del material en ciudades lejanas de canteras»; «5–15% de sobrecosto por transporte urbano en Bogotá» | `[INCIERTO]` — blogs comerciales de presupuestación, sin metodología |
| Mano de obra | SMMLV 2026 = $1.750.905 (nacional, dato del proyecto). Los jornales reales sí difieren entre regiones; una fuente comercial afirma «Bogotá hasta 25% por encima de ciudades intermedias» | `[INCIERTO]`. **La fuente sólida alternativa es INVIAS**, que ya publica factor prestacional y rendimientos por provincia |
| Transporte de carga | **SICE-TAC**: ~7.000 rutas municipio–municipio, 12 configuraciones de vehículo; el simulador pide origen y destino y devuelve distancia, perfil de vía y peajes. Es un sistema de **costos eficientes de operación de referencia** | `[VERIFICADO-BÚSQUEDA]` https://plc.mintransporte.gov.co/SiceTAC/ABC-SICE-TAC ; https://mintransporte.gov.co/publicaciones/4462/sice-tac/ |
| Transporte de carga — ¿piso legal del flete? | **Ver el recuadro de abajo. No dar por hecho que existe una tarifa mínima obligatoria sin abrir el decreto.** | `[INCIERTO]` |
| Equipos — movilización low-boy | **No existe tarifario público.** Solo cotización privada caso a caso | verificado como ausencia |
| Equipos — tarifa horaria | Está dentro del APU regionalizado de INVIAS (con rendimiento ya ajustado por provincia) | ver §1 |

**Sobre el Decreto 1017 de 2025 y el piso del flete — `[INCIERTO]`, y la diferencia cambia el costo mínimo que hay que presupuestar:**

El SICE-TAC, históricamente, **calcula costos eficientes de referencia** bajo un régimen de libertad vigilada; no es una tarifa mínima. Varias notas de prensa de septiembre de 2025 afirman que el Decreto 1017 de 2025 establece que el valor a pagar por el servicio **no podrá ser inferior** a los costos eficientes calculados por el SICE-TAC, y que el RNDC solo expediría manifiesto de carga si la tarifa cumple ese mínimo. Eso **no está verificado contra la norma**: la única página institucional localizada es la ficha del gestor normativo, que devolvió 403.

- Fuentes periodísticas consultadas por búsqueda, no abiertas: https://cambiocolombia.com/economia/articulo/2025/9/decreto-reforma-estructural-enfrenta-gobierno-y-gremio-transportadores-carga/ ; https://www.larepublica.co/economia/mintransporte-socializo-el-decreto-1017-de-2025-que-regula-el-transporte-de-carga-4234978 ; https://www.infobae.com/colombia/2025/09/26/el-transporte-de-carga-esta-en-jaque-por-que-el-decreto-1017-desata-una-tormenta-entre-gobierno-y-gremios/ — todas `[INCIERTO]`. (La referencia anterior a «una nota de La Silla Vacía» se elimina por no tener URL.)
- Ficha institucional de la norma, `[PENDIENTE PRODUCCIÓN]` (403 aquí): https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=264276 y comunicado https://mintransporte.gov.co/publicaciones/12132/historico-avance-en-el-sector-ministra-de-transporte-socializa-el-decreto-1017-que-transforma-las-reglas-del-transporte-de-carga/
- **Qué hay que confirmar exactamente al abrir el decreto**: (1) el **número de artículo** que fija el mínimo; (2) **quién queda obligado** — generador de carga, empresa de transporte, o ambos; (3) la **sanción** y el mecanismo de control (multa en SMLMV, negativa de manifiesto en el RNDC, retención del vehículo); (4) si hay régimen de transición o excepciones por tipo de carga.
- **Mientras no se confirme**, el uso operativo correcto es tratar el valor SICE-TAC como **piso económico prudente del presupuesto de flete** (no cotizar por debajo, porque si es obligatorio no se puede y si no lo es, seguiría siendo el costo eficiente), y **no** afirmar en ningún documento de oferta que existe una tarifa mínima legal.

**Sobre SICE-TAC y su uso correcto:** sirve para estimar el flete Bogotá→municipio X de carga general (cemento en sacos, acero, tubería) porque es origen-destino municipal y trae distancia y peajes. **No sirve** para: (a) acarreo local de agregados en volqueta dentro del municipio, (b) cabotaje marítimo a San Andrés, (c) transporte fluvial (Amazonas, medio Atrato, Vichada), (d) carga extradimensionada con permiso especial, que es justo el caso del low-boy. Para (d) el piso razonable es el costo SICE-TAC de la configuración tractocamión en la misma ruta, más el recargo por permiso y escolta, y ese recargo hay que cotizarlo: no es público.

### 3-bis. Deducciones territoriales: el diferencial regional más grande y más verificable

Esta es la variación regional que un contratista de obra pública colombiano nota primero en el bolsillo, y la única de esta sección cuya **fuente primaria está disponible HOY, sin ningún dato bloqueado**: el pliego de condiciones y la minuta del contrato de cada proceso listan las deducciones una por una, con su porcentaje. No hace falta abrir `datos.gov.co` ni ningún PDF de gobierno: está en el propio expediente del proceso en SECOP II.

Estas deducciones **no son un costo de construir**: son un descuento sobre el valor del contrato, y por tanto pegan directo en el AIU (concretamente en la A y en la U). Un proceso idéntico en dos departamentos distintos puede dejar varios puntos porcentuales de diferencia en la utilidad neta sin que ningún índice de precios lo registre.

#### (a) Contribución especial sobre contratos de obra pública

| Elemento | Contenido | Etiqueta |
|---|---|---|
| Tarifa | **5% del valor total** del contrato de obra pública con entidad estatal, y de cada adición. Concesiones de construcción, mantenimiento y operación de vías: 2,5 por mil sobre el ingreso bruto | `[VERIFICADO-BÚSQUEDA]` https://www.haciendabogota.gov.co/es/sdh/contribucion-especial-por-contrato-de-obra-publica-concesion-de-obra-publica-y-sus-adiciones ; guía de aplicación https://www.dimar.mil.co/sites/default/files/informes/Gu%C3%ADa%20Financiera%20No.%2025%20-%20Contribuci%C3%B3n%205%25%20%20en%20Contratos%20de%20Obra%20P%C3%BAblica..pdf |
| Cadena normativa | Ley 418 de 1997 → Ley 1106 de 2006 → Ley 1421 de 2010 → **prorrogada de forma permanente por el art. 8 de la Ley 1738 de 2014**. Modificaciones posteriores para ciertos tipos de contrato por el **art. 297 de la Ley 2294 de 2023** (PND 2022-2026) | `[INCIERTO]` en cuanto a números de artículo. **Verificar la ley vigente y el artículo antes de citarlos** en documento contractual: https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=22629 (Ley 1106) y https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=209510 (Ley 2294) |
| Uso operativo | Es nacional y no varía por región. Se resta siempre. No es un diferencial regional, pero es la base sobre la que se suman los que sí lo son | — |

#### (b) Estampillas departamentales y municipales — aquí está la variación regional

Se crean por ley, que fija destinación y tarifa máxima, y **la tarifa concreta la fija cada departamento por ordenanza y cada municipio por acuerdo**. Por eso el mismo contrato deja distinto neto en dos departamentos.

| Aspecto | Contenido | Etiqueta |
|---|---|---|
| Naturaleza | Tributos departamentales y municipales que se causan por celebrar contratos con entidades públicas. Son **expensa necesaria deducible** de renta | `[VERIFICADO-BÚSQUEDA]` https://www.ambitojuridico.com/noticias/tributario/tributario-y-contable/el-pago-de-estampillas-por-los-contratos-celebrados-con |
| Ejemplo real de composición (Cundinamarca) | Pro Desarrollo 2% + Pro Cultura 1% + Pro Hospitales 2% + Pro Universidad de Cundinamarca 1,5% + Pro Adulto Mayor 2% = **8,5%** | `[VERIFICADO-BÚSQUEDA]` manual de liquidación de estampillas de la Gobernación de Cundinamarca: https://www.cundinamarca.gov.co/wcm/connect/9cbca62d-7a6d-4391-baaf-319437efde40/MANUAL+LIQUIDACI%C3%93N+DE+ESTAMPILLAS.pdf — **es un ejemplo de UN departamento, no una tarifa nacional; otro departamento tendrá otra composición y otro total** |
| ¿Hay tope? | Circula la regla de que, cuando concurren la contribución de obra pública y las estampillas territoriales, el total **no puede superar el 10%** del valor del contrato, repartiéndose proporcionalmente el excedente. **No se pudo confirmar si esa regla es ley vigente o quedó en proyecto de reforma tributaria** | `[INCIERTO]` https://www.ambitojuridico.com/noticias/tributario-y-contable/valor-de-estampillas-en-contratacion-publica-no-superaria-el-10-del — verificar contra el texto de la Ley 2277 de 2022 y de la Ley 2294 de 2023 en el gestor normativo |
| Dónde se lee sin ambigüedad | En la **ordenanza departamental** y el **acuerdo municipal** aplicables, y —más rápido— en la cláusula de deducciones del **pliego y la minuta** del proceso concreto en SECOP II, que las lista una por una | fuente primaria disponible hoy |

#### (c) Impuesto de Industria y Comercio (ICA)

| Aspecto | Contenido | Etiqueta |
|---|---|---|
| Quién fija la tarifa | El concejo municipal o distrital, por acuerdo, dentro de los límites legales. Estructura **muy heterogénea** entre municipios | `[VERIFICADO-BÚSQUEDA]` https://www.haciendabogota.gov.co/es/impuestos/impuesto-de-industria-y-comercio-ica |
| Órdenes de magnitud citados en prensa especializada | Bogotá entre 4,14 y 13,8 por mil; Medellín entre 2 y 10 por mil, según actividad. Bogotá tiene régimen propio, así que sus rangos no son extrapolables | `[INCIERTO]` — rangos por actividad, no específicos de construcción. La tarifa de la actividad de construcción hay que leerla del estatuto tributario municipal |
| Efecto práctico | Muchas entidades practican **retención de ICA** sobre cada pago, así que entra en el flujo de caja del contrato, no solo en la declaración anual | `[CONOCIDO]` |

#### Método propuesto para convertir esto en dato duro (es barato y no depende de nada bloqueado)

1. Tomar **10–15 procesos de obra por departamento** del corpus histórico que ya tiene Detecta.
2. Abrir el pliego o la minuta de cada uno en SECOP II y extraer la **cláusula de deducciones**: cada concepto y su porcentaje.
3. Tabular `departamento | municipio | concepto | % | fuente (número de proceso)` y calcular el **% total de deducciones** por departamento y por municipio.
4. Publicar dos cifras por territorio: **mediana** y **rango observado**. El rango importa tanto como la mediana: si dentro de un departamento hay municipios con 6% y con 11%, la mediana sola engaña.
5. Restar ese porcentaje en la regla de decisión de §1.1, es decir, comparar contra `precio_referencia_regional × (1 − AIU_objetivo − deducciones_territoriales)`.

Este es el único punto de toda la sección donde se puede producir **una cifra regional dura, propia y auditable proceso a proceso** con el trabajo de una tarde. Nada más de lo aquí documentado tiene esa propiedad.

### 4. Factores físicos

| Factor | Evidencia | Etiqueta |
|---|---|---|
| Altitud (derating diésel) | Las cifras circulantes van de «1% por cada 100 m» a «3–5% por cada 1.000 m»; el turbo compensa parcialmente. Fuentes divulgativas automotrices, no normativas | `[INCIERTO]` — **no construir un factor propio con esto** |
| Altitud (uso recomendado) | INVIAS ya ajusta rendimientos de equipo y mano de obra por provincia; usar ese ajuste en vez de un derating inventado | ver §1 |
| Clima / días no laborables | IDEAM publica la variable **número de días con lluvia** por estación vía **DHIME** (`http://dhime.ideam.gov.co/`) y el **Catálogo Nacional de Estaciones**. El catálogo y los datos crudos también viven en datos.gov.co (bloqueado aquí) | `[VERIFICADO-BÚSQUEDA]` https://www.ideam.gov.co/dhime |
| Salto metodológico del clima | Estación ≠ municipio. Hay que asignar estación→municipio (vecino más cercano sobre el centroide, o promedio de estaciones dentro del municipio) y aceptar cobertura irregular: Amazonía y Orinoquía tienen muy pocas estaciones | `[CONOCIDO]` |
| Régimen de lluvia | Bimodal andino (abr-may, oct-nov) vs unimodal en Orinoquía/Amazonía; afecta la **estacionalidad** de los días perdidos, no solo el total anual | `[CONOCIDO]` |
| Acceso (terciaria/fluvial/aéreo) | **No hay una capa oficial única de «tipo de acceso» municipal.** Proxy: red vial de INVIAS en su portal ArcGIS de datos abiertos; ausencia de vía ⇒ fluvial/aéreo | `[VERIFICADO-BÚSQUEDA]` https://inviasopendata-invias.opendata.arcgis.com/ |

**Quién asume el riesgo de lluvia — sin esto, el dato climático no es dinero:**

En contratación estatal colombiana los días de lluvia del **régimen normal** son **riesgo PREVISIBLE**, y la matriz de riesgos del pliego se lo asigna casi siempre al **contratista**. Eso significa que se cubren **bajando el rendimiento en el APU** (menos m³/día, menos m²/día en la temporada correspondiente) o dentro del componente de Imprevistos del AIU — **no reclamándolos después**. Solo el **evento atípico y extraordinario, documentado**, abre la vía del restablecimiento del equilibrio económico del contrato.

El marco doctrinal es el **Documento CONPES 3714 de 2011**, que precisa el concepto de riesgo previsible y sus criterios de tipificación, estimación y asignación; la matriz de riesgos es parte integral del pliego y, por tanto, del contrato firmado. Y la consecuencia dura: **no se puede alegar desequilibrio económico por factores que eran previsibles en la etapa precontractual** a partir de los documentos del proceso y del contexto, y que el contratista no advirtió entonces. `[VERIFICADO-BÚSQUEDA]` https://www.ani.gov.co/conpes-3714-de-2012 ; manual de cobertura del riesgo de Colombia Compra Eficiente: https://colombiacompra.gov.co/wp-content/uploads/2024/08/cce_manual_cobertura_riesgo.pdf

**Regla operativa:** antes de usar la serie del IDEAM hay que **leer la matriz de riesgos del proceso concreto y verificar la asignación**, porque de ella depende si el dato de lluvia entra al APU (rendimiento) o al análisis de reclamación (evento atípico). Son dos usos distintos del mismo número y no se pueden mezclar.

### 5. Distancias a centros de abastecimiento

No se encontró una **matriz de distancias oficial descargable**. Lo que sí existe:

| Recurso | Qué da | Fuente |
|---|---|---|
| Simulador SICE-TAC | Distancia y peajes por par origen-destino municipal (~7.000 rutas) | `[VERIFICADO-BÚSQUEDA]`, §3 |
| Mapa de Carreteras INVIAS / MapServer | Geometría de la red nacional; postes de referencia, puentes, peajes | `[VERIFICADO-BÚSQUEDA]` https://hermes.invias.gov.co/arcgis/rest/services/Mapa_Carreteras/Mapa_de_Carreteras/MapServer/ ; https://www.invias.gov.co/publicaciones/8734/mapa-de-carreteras/ |
| Sistema de Información Vial (Hermes 2) | Consulta de estado de rutas | `[VERIFICADO-BÚSQUEDA]` https://hermes2.invias.gov.co/ |
| OSM + centroides DIVIPOLA | Ruteo propio: **1.103 municipios más las áreas no municipalizadas de la DIVIPOLA** × 5 centros (Bogotá, Medellín, Cali, Barranquilla, Bucaramanga) | `[CONOCIDO]`, factible offline. **Verificar el conteo exacto contra el archivo del Geoportal DANE, no de memoria** |

Recomendación: **precalcular la matriz una vez** (municipio → distancia por carretera al centro de abastecimiento más cercano de los cinco) y guardarla como tabla estática en el repo. No es un dato que cambie y no justifica una dependencia en tiempo de consulta.

**Advertencia estructural:** las **áreas no municipalizadas** (territorios de Amazonas, Guainía, Vaupés y Vichada que no pertenecen a ningún municipio y se administran desde el departamento, con código DIVIPOLA propio) **no tienen acceso por carretera**. La matriz de distancias por vía queda **vacía** para ellas — y son justamente los territorios que §3 declara sin ninguna cifra de sobreprecio. Hay que tratarlas como **categoría propia (fluvial / aéreo)**, no como dato faltante que se imputa: imputarles la distancia terrestre del municipio vecino subestimaría el costo en el peor sitio posible.

### 6. DIVIPOLA y geometrías: la llave está disponible

| Recurso | Confirmación |
|---|---|
| DIVIPOLA en Geoportal DANE, descarga directa `.xlsx` de departamentos y municipios | `[VERIFICADO-BÚSQUEDA]` https://geoportal.dane.gov.co/servicios/descarga-y-metadatos/descarga-divipola/ ; https://geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_Municipios.xlsx |
| Geovisor de consulta DIVIPOLA (incluye áreas no municipalizadas) | `[VERIFICADO-BÚSQUEDA]` https://geoportal.dane.gov.co/geovisores/territorio/consulta-divipola-division-politico-administrativa-de-colombia/ |
| Marco Geoestadístico Nacional (MGN), shapefiles por departamento | `[VERIFICADO-BÚSQUEDA]` https://geoportal.dane.gov.co/descargas/descarga_mgn/GuiaDescargaVisualiz_CO.pdf |
| «DIVIPOLA – Códigos municipios **geolocalizados**» (trae coordenadas) — dataset Socrata `vafm-j2df` | `[VERIFICADO-BÚSQUEDA]` que existe; **`[PENDIENTE PRODUCCIÓN]`** leerlo: vive en datos.gov.co, bloqueado en este entorno. Se consume con el mismo cliente Socrata que ya usa `lib/socrata.js` |
| IGAC: SHP, KML, GeoJSON, WMS/WFS; portal «Colombia en Mapas» | `[VERIFICADO-BÚSQUEDA]` https://geoportal.igac.gov.co/contenido/datos-abiertos ; https://www.colombiaenmapas.gov.co/ |

Enganche con Detecta: la proyección ya guarda `departamento_entidad` y `ciudad_entidad` (`lib/proyeccion.js`). Ambos son texto libre de SECOP, así que el paso obligatorio es **normalizar a código DIVIPOLA de 5 dígitos** con la misma disciplina de `claveCanonica` que ya se aplicó a la identidad de entidad — y con el mismo riesgo conocido: **la entidad que publica no siempre está en el municipio donde se ejecuta la obra**.

Esquema mínimo de las dos tablas estáticas que hay que crear en el repo:

| Tabla | Campos | Filas esperadas |
|---|---|---|
| `divipola.json` | `cod_dane` (str, 5), `municipio` (str), `cod_depto` (str, 2), `departamento` (str), `tipo` (`municipio` \| `area_no_municipalizada`), `lat`, `lon` | ~1.121 (verificar) |
| `provincias_invias.json` | `provincia_invias` (str), `cod_depto` (str, 2), `cod_dane[]` (lista de municipios) | 140 |
| `distancias.json` | `cod_dane` (str, 5), `centro` (str), `km_carretera` (num, `null` si sin acceso vial), `modo` (`terrestre` \| `fluvial` \| `aereo`) | ~1.121 × 5 |

### 7. El experimento con datos propios (porque las cifras duras no existen)

Ante la ausencia de un factor regional publicado para lo que no es vial, la vía honesta es medirlo con el histórico de SECOP.

- **Obstáculo estructural:** SECOP II no trae cantidades de obra. Se tiene `precio_base` (presupuesto oficial) y, en el corpus histórico, el valor adjudicado y el número de oferentes — no COP/m² ni COP/km. **Sin cantidad no hay precio unitario.**
- **Mitigación:** restringir a objetos homogéneos y auto-descriptivos, donde la cantidad viene *en el texto del objeto*: «placa huella», «pavimento en concreto rígido», «pozos sépticos», extrayendo `X km` / `X m2` / `X unidades` por expresión regular sobre `descripci_n_del_procedimiento`. Muestra pequeña, sesgada a objetos bien redactados, pero verificable proceso a proceso.

#### 7.1 Dos modelos separados, con dependientes distintos — no se suman

Mezclarlos es el error grave: un factor regional estimado sobre el valor **adjudicado** atribuiría a «la región es cara» lo que en realidad es «en esa región hay menos oferentes y por tanto menos baja» — que es justo el efecto que este proyecto ya mide con el índice de competencia.

| | **Modelo A — nivel de precio** | **Modelo B — intensidad competitiva** |
|---|---|---|
| Dependiente | `log(precio_base / cantidad)` | `valor_adjudicado / precio_base` (la baja; 1,00 = sin baja) |
| Qué mide | El nivel de precio que **la entidad presupuesta** en esa región | Cuánto de ese presupuesto se cede en la puja |
| Covariables | `log(distancia_km_al_centro)` + altitud + días_lluvia + insular + indicadora_fluvial + año | las mismas **+ número de oferentes** |
| Estructura | Jerárquico por departamento, con encogimiento hacia la media nacional (con ~1.100 municipios y pocos procesos por municipio, un efecto fijo por municipio sería ruido puro) | igual |
| Interpretación del efecto regional | Diferencial de **costo/presupuesto** | Diferencial de **mercado**, no de costo |

El número de oferentes del Modelo B **no hay que producirlo**: ya lo calcula `lib/indice_competencia.js` (`oferentesDe`, sobre la lista de columnas candidatas `OFERENTES_CAMPOS`) y viaja en la proyección histórica como campo `oferentes`, junto con `fue_adjudicado` (`lib/proyeccion.js`). Recordatorio operativo del propio repo: **0 oferentes significa SIN DATO, no «nadie se presentó»** — esas filas se excluyen del Modelo B, no se cuentan como cero.

#### 7.2 Contraste de validación — y su límite

Comparar el factor regional del **Modelo A** contra `F_p` derivado de los APU de INVIAS (§1.2). Si coinciden en signo y orden de magnitud, el modelo es creíble; si no, gana INVIAS y el modelo se descarta.

**Acotación indispensable:** ese contraste **solo es válido para el subconjunto de objetos VIALES de la muestra** (placa huella, pavimento, obras de drenaje vial). `F_p` es una canasta vial, y §1.3 ya declaró que el catálogo de INVIAS no cubre acabados de edificación. Para los objetos de **edificación** de la muestra **no hay patrón de validación**: el modelo se queda sin contraste y hay que **declararlo así**, no validarlo contra una canasta que no le corresponde. Si se necesita contraste para edificación, la vía es una serie comercial por ciudad (§1.4), que es de pago.

#### 7.3 Consulta de exploración `[PENDIENTE PRODUCCIÓN]`

**Esta consulta NO da precio unitario.** Solo sirve para saber **cuántos procesos homogéneos hay por ciudad** y decidir si la muestra alcanza para modelar. Comparar `precio_base` sin normalizar mide tamaño de contrato, no nivel de precio. La normalización por cantidad se hace **después, en cliente**, con la regex sobre el objeto.

Dataset `p6dx-8zbt`, Socrata SODA 2.0:

```
?$select=departamento_entidad,ciudad_entidad,count(*) AS n,avg(precio_base) AS media,
         min(precio_base) AS minimo,max(precio_base) AS maximo
&$where=upper(descripci_n_del_procedimiento) like '%25PLACA HUELLA%25' AND precio_base > 0
&$group=departamento_entidad,ciudad_entidad
&$having=n > 4
&$order=media DESC
&$limit=5000
```

Notas sobre la sintaxis, porque dos de ellas devuelven 400 si se escriben mal:

| Detalle | Regla |
|---|---|
| `median()` | **SODA 2.0 no expone una función de agregación `median`.** Por eso se usa `avg` + `min` + `max`. La mediana, si se necesita, se calcula en cliente con las filas ya descargadas |
| `$having` | Referenciar el **alias** (`n > 4`), no repetir la agregación |
| `$order` | Solo puede ordenar por un alias que exista en el `$select` (`media`) |
| `like` | El `%` va URL-encoded como `%25` |
| Siguiente paso | Repetir con las demás plantillas de objeto («CONCRETO RIGIDO», «POZO SEPTICO») y quedarse con las que superen un mínimo de procesos por ciudad antes de invertir en el modelo |

#### Vacios y siguiente paso

1. **No hay ninguna cifra pública de sobreprecio de materiales para Chocó, Amazonas, La Guajira o Vichada.** Siguiente paso: descargar la **vigencia MÁS RECIENTE publicada** de los APU regionalizados de INVIAS (verificar si ya existe **2026-1**; si no, usar 2025-2) para una provincia amazónica y una provincia de la sabana de Bogotá, y leer directamente el precio del m³ de concreto, del bulto de cemento y del kg de acero. Eso *es* la cifra, y es oficial — solo hace falta un entorno que pueda abrir invias.gov.co.
   **Método de envejecimiento, obligatorio:** un APU de vigencia N se actualiza a la fecha de cierre del proceso con la **variación acumulada del ICCP nacional** entre la fecha de precios de esa vigencia y el mes de la oferta. Ese ajuste hay que dejarlo **escrito en el APU entregado**, con el índice, los dos meses y el factor aplicado. Llevar un precio de diciembre de 2025 a una oferta de 2026 sin declarar cómo se envejeció es un error que se ve en la evaluación.
2. **No se pudo abrir ningún documento fuente**: todos los `.gov.co` respondieron 403 vía proxy. Todo lo etiquetado `[VERIFICADO-BÚSQUEDA]` debe re-confirmarse abriendo el PDF/Excel antes de codificar cualquier coeficiente.
3. **Formato y esquema de los APU de INVIAS sin confirmar**: no se sabe si son Excel por provincia (140 archivos) o un consolidado, ni si traen código de ítem estable entre semestres. Es determinante para automatizar. Comprobarlo en la página 4149.
4. **Falta el paso `ciudad_entidad` → DIVIPOLA**: no existe hoy en el repo y sin él nada georreferenciado se puede unir.
5. **Tarifa de movilización de maquinaria: no es pública y probablemente nunca lo será.** Se resuelve con dos o tres cotizaciones reales del propietario y una regla de COP/km calibrada con ellas, declarada como `[SUPUESTO A CALIBRAR]`.
6. **ICCP sin desagregación por ciudad es un tope duro**: si se necesita variación temporal *por ciudad* para obra civil pesada, no existe. La única aproximación es usar la deriva del ICOCED de la ciudad como proxy y declararlo como tal. Pendiente además leer el **periodo base del ICCP** en la portada del boletín técnico.
7. **6-bis — BLOQUEANTE: no está confirmado que INVIAS publique la correspondencia provincia → municipios**, ni si la expresa en códigos DIVIPOLA. Sin esa tabla no se puede asignar un APU a un proceso concreto de SECOP, y toda la §1 queda inoperante por muy correcta que sea. Comprobarlo en la página 4149 (el filtro de descarga «todas las provincias de un departamento» sugiere que al menos existe la relación departamento→provincia). **Si no viene publicada, construirla a mano UNA vez** (140 filas, asignando municipios a cada provincia) y guardarla en el repo como tabla estática, igual que la matriz de distancias del §5.
8. **Áreas no municipalizadas sin matriz de distancias**: no tienen acceso por carretera, así que el ruteo terrestre del §5 no produce ningún valor para ellas. Tratarlas como categoría propia (fluvial/aéreo) con costo cotizado, **nunca** como dato faltante imputable desde el municipio vecino.
9. **Deducciones territoriales sin tabular**: la §3-bis define el método pero la tabla `departamento | municipio | % total de deducciones` **todavía no se ha construido**. Es el vacío más barato de cerrar de toda la sección (10–15 pliegos por departamento, leídos en SECOP II) y el que produce la única cifra regional dura y propia. Prioridad alta.
10. **Piso legal del flete sin confirmar**: verificar el articulado del Decreto 1017 de 2025 en el Diario Oficial o el gestor normativo y anotar artículo, sujeto obligado y sanción (§3). Hasta entonces, no afirmarlo en ningún documento de oferta.
11. **Tope del 10% para contribución + estampillas sin confirmar**: verificar si es norma vigente y en qué ley y artículo, o si quedó en proyecto. Cambia el peor caso del cálculo de deducciones.
12. **Lista exacta de los 19 dominios del ICOCED sin verificar**, y con ella la partición «originales del ICCV / nuevos». Leerla del boletín del mes de referencia y citar número de tabla.


---

## 1.B.2 — Diseno de la matriz de ajuste regional

Documento de **diseño**, no de hallazgos. Propone la estructura del factor regional que Detecta
usaría para pasar de un precio de referencia nacional a un precio esperable en el municipio donde
se ejecuta la obra. Todos los coeficientes numéricos son **PRELIMINARES A CALIBRAR**: valen como
punto de partida y como formato de la tabla, no como dato.

Convención de etiquetas usada en todo el documento:

| Etiqueta | Significado |
|---|---|
| [VERIFICADO] | Fuente abierta y leída en esta sesión |
| [VERIFICADO POR RESUMEN DE BÚSQUEDA — pendiente lectura de la fuente primaria] | El buscador devolvió el hecho y la URL, pero el documento primario no se pudo abrir (403 desde este entorno) |
| [CONOCIDO] | Sólido por conocimiento del sector, no confirmado ahora |
| [INCIERTO] / [POR VERIFICAR] | Se cree que existe; hace falta abrir la fuente |
| [SUPUESTO A CALIBRAR] | Número inventado como punto de partida; no es un dato |

En esta revisión **los cuatro dominios consultados (invias.gov.co, dane.gov.co, mintransporte.gov.co
y el PDF del boletín) devolvieron 403** a la lectura directa. Nada que dependa de leer el documento
primario aparece como [VERIFICADO] en el cuerpo del texto.

### 1. Arquitectura: un factor por componente, nunca un número por departamento

Un solo `F(depto)` es una media ponderada de cosas que se mueven por razones distintas y en
magnitudes distintas. Los cuatro componentes tienen dinámicas incompatibles entre sí:

| Componente | Qué lo mueve regionalmente | Dispersión esperada | Por qué no puede ir con los demás |
|---|---|---|---|
| Mano de obra | Piso del SMMLV nacional ($1.750.905 en 2026), disponibilidad de cuadrilla calificada, factor prestacional | Baja (≈ ±10 %, salvo zonas sin oferta laboral) | El salario mínimo es un **piso nacional**: no hay un Chocó "barato en mano de obra". Lo que varía es el rendimiento (clima, altura), no el precio hora |
| Material | Cercanía a planta/cantera, competencia entre proveedores | Media (≈ +5 % a +60 %) | El precio de planta ya está regionalizado en las fuentes; el sobrecosto real es el flete que se le suma |
| Equipo | Disponibilidad local de maquinaria, movilización, altura sobre el nivel del mar (rendimiento) | Media-alta | Un componente con costo fijo de movilización que **no escala con el volumen de obra**: castiga desproporcionadamente los contratos pequeños |
| Transporte | Distancia, tipo de vía, modo (terrestre / fluvial / aéreo) | Muy alta | Es el único que se cotiza en **$/ton-km** (o en tarifa de escalón por modo), no como porcentaje de un precio |

Dos hechos externos respaldan la separación. (a) El DANE construye el ICOCIV con **siete grupos de
costo** —equipos, maquinaria, mano de obra, **transporte**, materiales, equipos especiales y
herramienta menor—, es decir, ya trata el transporte como grupo propio [VERIFICADO POR RESUMEN DE
BÚSQUEDA — pendiente lectura del boletín]. (b) Los APU regionalizados del INVIAS cubren **140
provincias del territorio nacional, excluida Bogotá D.C., vigencia 2025-2 con precios al 30-dic-2025**
[VERIFICADO POR RESUMEN DE BÚSQUEDA], e incorporan altitud, clima y acceso a materiales como
variables de la estructura de costo [VERIFICADO POR RESUMEN DE BÚSQUEDA]. Que esos precios estén
**puestos en planta, sin transporte, con acarreo base de 1 km** es la premisa sobre la que se
construye la §2 y **está [POR VERIFICAR]**: hay que abrir el libro de APU y leer la hoja de
condiciones. Si resultara falsa —si el APU ya trae flete incorporado— el término de flete de la
fórmula estaría duplicando costo y habría que reescribir la §2 entera.

Corolario operativo: un `F` único por departamento aplicado a una obra intensiva en concreto y a
una intensiva en mano de obra daría el mismo ajuste a dos presupuestos con estructuras de costo
opuestas. Eso es un error de diseño, no de calibración.

### 2. Fórmula

#### 2.1 Alcance de validez (leerlo antes de usar la matriz)

La matriz calibrada con INVIAS **es válida para ítems de infraestructura vial y movimiento de
tierras**: explanaciones, subbases, bases, pavimento flexible y rígido, obras de drenaje, placa
huella, estructuras de contención y puentes. Los APU del INVIAS **no contienen** mampostería,
cubierta, carpintería metálica, acabados, redes hidrosanitarias internas ni equipos de bombeo, así
que para edificación (aula escolar, CDI, polideportivo cubierto) y para acueducto/alcantarillado
no viales **la "referencia nacional = 1,00" simplemente no existe en la fuente citada**. Para esa
mitad de la cartera de Detecta hace falta una segunda fuente; candidatas en la tabla de fuentes y
en el Vacío 7.

#### 2.2 Partición coherente entre pesos y precios base

**Los pesos del ICOCIV incluyen transporte como grupo propio; los precios del INVIAS van sin
transporte. Mezclarlos sin renormalizar cuenta el flete dos veces o cero veces.** Concretamente: si
se escribe `w_transporte · P_transporte^INVIAS · F_transporte` con `P_transporte^INVIAS ≈ 0`, el 9 %
de flete desaparece; y si `P_transporte` se toma del ICOCIV, se está ponderando la canasta de una
fuente con los precios de otra. La forma correcta es partir el precio en dos bloques:

```
Precio_directo(región, ítem) =
      Σ_{c ∈ {material, mano_de_obra, equipo}}  w'_c · P_c^INVIAS(referencia) · F_c(región)
    + Flete(región, ítem)

Σ_{c ∈ {mat, mo, eq}} w'_c = 1        (renormalizados sobre lo que la referencia SÍ contiene)
```

| Componente | Peso ICOCIV `w_c` (canasta con transporte) | Peso renormalizado `w'_c` (sin transporte) | Origen |
|---|---|---|---|
| Material | 0,51 | 0,51 / 0,91 = **0,560** | Materiales = **51,31 %** de la canasta ICOCIV [VERIFICADO POR RESUMEN DE BÚSQUEDA — pendiente lectura del boletín del DANE] |
| Mano de obra | 0,20 | 0,20 / 0,91 = **0,220** | [SUPUESTO A CALIBRAR] |
| Equipo + herramienta | 0,20 | 0,20 / 0,91 = **0,220** | [SUPUESTO A CALIBRAR] |
| Transporte | 0,09 | — (sale del esquema multiplicativo) | [SUPUESTO A CALIBRAR]; el ICOCIV lo trata como grupo propio, su ponderación exacta no está verificada |
| | Σ = 1,00 | Σ = 1,000 | |

**El 51,31 % es el único peso de la fórmula que no es un supuesto.** Si al abrir el boletín del DANE
esa cifra no está, o corresponde a otra base, la §2 entera queda sin ancla y hay que rehacerla.

Los pesos `w'_c` son del **ítem/capítulo**, no de la región: una placa huella y un tanque elevado
tienen canastas distintas. Los de la tabla son solo la semilla nacional para cuando no se conoce la
canasta del ítem.

#### 2.3 Referencia (numerario)

**Referencia = promedio de los APU regionalizados del INVIAS, no Bogotá.** Bogotá D.C. es tentador
por comodidad (es la ciudad más documentada) pero está **excluida** del universo de 140 provincias
del INVIAS [VERIFICADO POR RESUMEN DE BÚSQUEDA], y además es un caso atípico: costo de disposición
de escombros, restricciones de movilidad y precios de mano de obra por encima del resto. Anclar en
Bogotá haría que casi todo el país tuviera factores < 1 en mano de obra y > 1 en material, lo que
confunde "diferencia real" con "sesgo del ancla". Se usa el promedio nacional INVIAS = 1,00.

**Bogotá no puede salir con banda numérica.** No hay ni una observación del INVIAS que la respalde,
y el resto del documento se compromete a no publicar cifras creíbles sin base. Bogotá sale en estado
⚪ «sin base» hasta que se cargue su fuente propia: la base de precios unitarios de referencia del
IDU (actualización semestral) y el histórico propio de SECOP de entidades distritales. Ver la fila
correspondiente en «De dónde sale cada calibración».

#### 2.4 Flete: término ADITIVO, no multiplicador

El mercado no cotiza el flete como un porcentaje del precio del ítem: lo cotiza en $/ton-km por
modo terrestre y en tarifa de escalón ($/kg o $/ton) por modo aéreo o marítimo. Modelarlo como
multiplicador obliga a fijar un numerario de distancia y produce un sesgo sistemático al alza (un
factor anclado en distancia cero vale 1 justo donde el acarreo es nulo, no donde es promedio).

```
Flete(región, ítem) = Σ_j  t_j · toneladas · d_j          [tramos terrestres y fluviales]
                    + Σ_m  τ_m · toneladas                 [tramos aéreos / marítimos, tarifa de escalón]

  t_j = t_troncal($/ton-km) · k_modo_j        (t_troncal se lee del SICE-TAC para la ruta)
  d_j = km del tramo j entre centro de abastecimiento y sitio de obra
  τ_m = tarifa por tonelada del modo m (no depende linealmente de la distancia)
```

`k_modo` queda reservado a los **modos terrestres y fluviales**; el aéreo y el marítimo entran por
tarifa, que es como se cobran. **SUPUESTOS INICIALES, no hechos:**

| Parámetro | Rango preliminar | Central | Cómo se calibra |
|---|---|---|---|
| `t_troncal` ($/ton-km, vía primaria pavimentada) | — | — | SICE-TAC de la ruta origen-destino real. Es el numerario del bloque |
| `k_modo` primaria pavimentada | 1,0 (definición) | 1,0 | Es el numerario |
| `k_modo` secundaria pavimentada | 1,3 – 1,6 | 1,4 | Velocidad media y consumo por tipo de vía |
| `k_modo` terciaria / destapada | 2,0 – 3,0 | 2,4 | Ídem + capacidad de carga menor |
| `k_modo` fluvial | 3,0 – 6,0 | 4,0 | Tarifas de embarcación por tonelada + transbordos |
| `τ` aérea ($/kg) | [SUPUESTO A CALIBRAR] | — | Tarifa de carga aérea publicada por operador en las rutas Bogotá–Leticia / Bogotá–Inírida |
| `τ` marítima ($/ton) | [SUPUESTO A CALIBRAR] | — | Tarifa de cabotaje Cartagena/Barranquilla–San Andrés |

Referencia externa de orden de magnitud: en rutas troncales el valor por ton-km suele moverse
**entre $194 y $704** [INCIERTO — cifra vista en resumen de búsqueda, no leída en la fuente
primaria; verificar en el SICE-TAC del Portal Logístico de MinTransporte]. La convención del sector
para acarreo también sirve de anclaje: por encima de 1.000 m la unidad de medida es el **m³-km**
(Artículo 900 de las especificaciones INVIAS) [CONOCIDO].

**Alternativa multiplicativa, si por integración con un motor de APU hiciera falta un factor
adimensional.** Entonces hay que normalizar contra la distancia de referencia, no contra cero:

```
F_transporte = ( 1 + α · Σ_j (d_j/100) · k_modo_j )  /  ( 1 + α · (d̄/100) · k̄ )
```

y publicar `d̄` y `k̄` como **parámetros explícitos de la matriz**:

| Parámetro | Qué es | Valor | Estado |
|---|---|---|---|
| `d̄` | Distancia media de acarreo implícita en el APU de referencia | — | [POR VERIFICAR en el libro de APU; si la premisa del acarreo base de 1 km se confirma, `d̄` no es 1 km sino la distancia media real que el INVIAS asume por provincia] |
| `k̄` | Tipo de vía medio implícito en esa referencia | — | [POR VERIFICAR] |
| `α` | Incremento por 100 km sobre vía primaria | 0,12 – 0,30; central 0,20 | [SUPUESTO A CALIBRAR] con SICE-TAC |

Sin `d̄` y `k̄` publicados, la versión multiplicativa **no se usa**: un factor anclado en cero le
cobra un recargo a un proyecto exactamente promedio.

**Control de cordura, no techo económico.** Con el flete aditivo el disparate no es un factor
grande sino un flete desproporcionado respecto al costo directo. Regla: si
`Flete > 0,60 · Σ w'_c·P_c·F_c` se emite **alerta en el log** (`flete_desproporcionado`) con la ruta
y las distancias usadas, porque el origen más probable es un error de geocodificación. La alerta no
recorta el valor: recortarlo escondería el error. En zonas sin acceso terrestre el flete **puede**
superar legítimamente ese umbral, y por eso es alerta y no tope.

### 3. Granularidad recomendada: **33 unidades + escalamiento por municipio**

| Opción | A favor | En contra | Veredicto |
|---|---|---|---|
| 32 departamentos + Bogotá | Es exactamente lo que trae SECOP (`departamento_entidad`); muestra suficiente por celda | Oculta la heterogeneidad interna (Antioquia = Medellín y Urabá; Chocó = Quibdó y el Baudó) | **Recomendada como capa base** |
| ~140 provincias INVIAS | Máxima fidelidad; existe fuente pública | La app no tiene el mapeo municipio→provincia; muchas celdas del histórico quedarían con n < 10 | Descartada por ahora; deseable a futuro |
| Subregiones funcionales propias | Se ajustan al negocio | Hay que inventarlas y defenderlas; añaden un artefacto no auditable | Descartada |

La app conoce `departamento_entidad` y `ciudad_entidad` (ambos ya proyectados en
`lib/proyeccion.js`). La recomendación es una arquitectura de **dos niveles**: la matriz se estima
y se publica por departamento (33 filas, estadísticamente sostenible) y el municipio entra
únicamente por la vía del flete, como distancia al centro de abastecimiento — que es justamente el
componente donde la variación intradepartamental es grande. Así se evita estimar 1.100 factores con
el histórico que hay.

**Regla única de agregación provincia → departamento** (se enuncia aquí una sola vez y el resto del
documento la referencia): cada provincia pesa por el **volumen de obra contratada** — suma de
`valor_total_adjudicacion` del corpus histórico propio (`licitaciones:historico:mes:*`) en la
ventana de 2 años, agregada a provincia. Respaldo cuando una provincia no tenga volumen observado:
**población**. **No se pondera por número de municipios**: Boyacá (123 municipios) y Antioquia (125)
dominarían su propio promedio con celdas rurales diminutas y Atlántico (23) o Chocó (30) quedarían
sub-representados frente a su volumen real de obra. El número de municipios no tiene relación con
dónde se construye.

### 4. Tabla propuesta — 6 categorías de dificultad logística

Rangos `F_c` con referencia = promedio nacional INVIAS = 1,00. **TODOS PRELIMINARES A CALIBRAR.**
La última columna **no es un multiplicador del precio**: es el flete relativo, expresado como
múltiplo del `$/ton-km` troncal (el `k_modo` efectivo de la ruta típica del departamento). Para las
categorías con tramo aéreo o marítimo la celda dice «tarifa», porque ahí el costo no es lineal en
distancia.

| Cat. | Departamentos (33) | Material | Mano de obra | Equipo | Flete relativo (× $/ton-km troncal) |
|---|---|---|---|---|---|
| **A** Eje metropolitano | Cundinamarca, Antioquia, Valle del Cauca, Atlántico | 0,95 – 1,03 | 1,00 – 1,08 | 0,95 – 1,02 | 1,0 – 1,2 |
| **B** Andino cercano | Boyacá, Santander, Caldas, Risaralda, Quindío, Tolima | 1,00 – 1,08 | 0,96 – 1,03 | 1,00 – 1,06 | 1,1 – 1,5 |
| **C** Andino alejado / montañoso | Huila, Cauca, Nariño, Norte de Santander | 1,06 – 1,18 | 0,95 – 1,03 | 1,05 – 1,15 | 1,4 – 2,0 |
| **D** Costa y llanos con red primaria | Bolívar, Magdalena, Cesar, Córdoba, Sucre, Meta, Casanare | 1,04 – 1,16 | 0,98 – 1,06 | 1,02 – 1,12 | 1,2 – 1,8 |
| **E** Apartado con acceso terrestre difícil | La Guajira, Chocó, Arauca, Caquetá, Putumayo, Guaviare, Vichada | 1,18 – 1,45 | 1,00 – 1,12 | 1,15 – 1,35 | 2,0 – 4,0 (tramos fluviales) |
| **F** Sin acceso terrestre | Amazonas, Vaupés, Guainía, San Andrés y Providencia | 1,55 – 2,60 | 1,05 – 1,25 | 1,40 – 2,00 | **Tarifa** ($/kg aéreo o $/ton marítimo), no múltiplo |
| **⚪** Sin base | Bogotá D.C. | sin cifra | sin cifra | sin cifra | sin cifra |

Notas de la tabla:
- **Bogotá D.C. aparece sin cifra a propósito.** El INVIAS la excluye de su universo y este
  documento no tiene otra fuente cargada todavía. Publicar una banda "previsible" sería
  exactamente el tipo de número creíble sin respaldo que el resto del diseño prohíbe.
- **Vichada es un caso partido**: La Primavera/Santa Rosalía se comportan como E; Cumaribo y buena
  parte de Puerto Carreño, como F. La regla operativa es que un municipio sin conexión terrestre
  **escala de categoría** aunque su departamento esté en E. Lo mismo aplica al Pacífico chocoano y
  al Bajo Baudó.
- **Mano de obra apenas se mueve** en A–D: la banda 0,95–1,08 es deliberadamente estrecha porque el
  SMMLV es un piso nacional. Sube en E–F no por salario sino por **rendimiento** (jornada efectiva
  menor por clima y logística) y por importación de cuadrilla.
- **San Andrés no es "muy lejos"**: es una isla y todo insumo llega por barco o avión. Su banda de
  material puede superar la de Amazonas.

De dónde sale cada calibración:

| Componente / ámbito | Fuente primaria de calibración | Estado |
|---|---|---|
| Material, mano de obra, equipo — **obra vial y movimiento de tierras** | APU regionalizados INVIAS (140 provincias, corte 30-dic-2025), agregados a departamento con la regla única de la §3 (volumen de obra contratada; respaldo, población) | Fuente identificada, descarga pendiente (403) |
| Material, mano de obra, equipo — **edificación y acueducto** | Listas oficiales de precios unitarios de gobernaciones y entidades sectoriales; el corpus propio de `precio_base` de SECOP II como respaldo | **No cargada.** Ver Vacío 7 |
| **Bogotá D.C.** (todas las componentes) | Base de precios unitarios de referencia del IDU (visor de precios, actualización semestral, contacto `precios.referencia@idu.gov.co`) + histórico propio de SECOP de entidades distritales | **No cargada.** Bogotá permanece ⚪ hasta entonces |
| Flete | SICE-TAC ($/ton-km por ruta real) + distancias de la red vial; tarifas de carga aérea y de cabotaje para los modos de escalón | Pendiente |
| Deriva temporal (no regional) | ICOCIV mensual del DANE, para reexpresar todo al mes vigente | Publicado mensualmente |
| Validación cruzada / total | Histórico propio de SECOP II (`licitaciones:historico:mes:*`) | Disponible hoy |

### 5. Calibración con el histórico propio de SECOP

#### 5.1 Qué es realmente `valor_total_adjudicacion` (leerlo antes de interpretar `δ`)

**La adjudicación no es un precio de mercado libre.** Es el presupuesto oficial menos una baja, y
esa baja depende del número de oferentes y del método de ponderación económica del pliego —que en
muchos procesos **se sortea el día de la audiencia** entre menor valor, media aritmética, media
geométrica con o sin desviación y media aritmética alta [CONOCIDO; es práctica corriente en pliegos
tipo de obra, no verificada aquí contra un documento de CCE]. En consecuencia:

- Donde hay 20 oferentes la baja es grande; donde hay 1, casi nula.
- Sin control de competencia, `δ_depto` mediría **intensidad de baja y comportamiento presupuestal
  de la entidad** tanto como nivel de precios, y estimaría factores **bajos** justo donde hay mucha
  competencia (categoría A), **invirtiendo la señal** que se busca.
- Por eso el factor compuesto que sale de aquí **solo puede usarse como restricción de
  consistencia, nunca como estimador de costo**.

#### 5.2 Especificación

Sobre procesos **adjudicados** del corpus histórico:

```
ln(valor_adj_i) = μ + δ_depto(i) + τ_clase_unspsc(i) + γ_año(i)
                + β1·ln(duracion_meses_i)
                + β2·ln(1 + d_km_i)
                + β3·ln(1 + oferentes_i)
                + β4·ln(precio_base_i)
                + ε_i
```

Qué controla cada término:

| Término | Qué controla | De dónde sale el dato |
|---|---|---|
| `τ` | La **naturaleza de la obra**: clase UNSPSC de **6 dígitos** (p. ej. `721410`), obtenida con `lib/unspsc.claseDe`. Un alcantarillado no se compara con un puente | `codigo_principal_de_categoria` (ojo al prefijo de versión, §5.3) |
| `γ` | Inflación y ciclo. Con el SMMLV pasando de $1.423.500 (2025) a $1.750.905 (2026) —**+23,0 %**— omitirlo confundiría año con región | `fecha_de_publicacion_del` |
| `β1` | Tamaño / alcance; el único proxy de escala que ofrece el dataset | `duracion` + `unidad_de_duracion` |
| `β2` | Distancia; compite con `δ` y por eso entra **después** de mirar `δ` a solas | Geocodificación de `ciudad_entidad` |
| `β3` | **Intensidad de la baja vía competencia** | `oferentesDe` de `lib/indice_competencia.js` — la app ya lo tiene |
| `β4` | **Referencia presupuestal de la entidad**: separa "obra cara" de "entidad que presupuesta alto" | `precio_base`, ya proyectado en `lib/proyeccion.js` |

`δ_depto` es el estimador de interés: `F_total(depto) = exp(δ_depto)`.

**Nivel de agregación de `τ` y qué hacer si la celda queda vacía.** Se estima a nivel de **clase (6
dígitos)**. Si alguna celda `depto × clase` queda con `n` insuficiente, esa estimación **sube a
FAMILIA (4 dígitos)** de forma explícita, y el registro publicado dice a qué nivel quedó agregada
(`nivel_tau: "clase" | "familia"`). No se mezclan niveles en silencio: `lib/unspsc.js` deduce el
nivel de los pares "00" finales (`NIVELES = { 2: segmento, 4: familia, 6: clase, 8: producto }`) y
el resto del proyecto razona en clases del RUP; usar 4 dígitos sin decirlo agruparía cosas que el
propio matching de la app trata como distintas.

**Límite duro de identificación, y hay que decirlo alto:** `p6dx-8zbt` publica un valor total por
proceso, **no cantidades ni desglose de APU**. Con SECOP se puede estimar un factor **compuesto**
por departamento; es **imposible** separar material de flete de mano de obra desde ahí. Por tanto el
diseño correcto es mixto: los `F_c` por componente salen del corte transversal del INVIAS (y de las
fuentes de edificación cuando existan), y el histórico propio se usa para **imponer la restricción
de consistencia**

```
[ Σ_{c∈{mat,mo,eq}} w'_c · F̂_c(depto) ] + Flete_típico(depto)/Precio_directo_típico  ≈  exp(δ̂_depto)
```

reescalando proporcionalmente los `F_c` si el compuesto INVIAS se aleja del observado. El histórico
valida y ancla; no desagrega.

**Sesgos que hay que declarar, no esconder:**

| Sesgo | Mecanismo | Mitigación |
|---|---|---|
| Endogeneidad de alcance | En zonas caras se contratan obras distintas (más pequeñas, más simples) | Restringir a "canastas comparables": familias de objeto muy homogéneas (placa huella, aula escolar, tanque, pavimento rígido) detectadas con `lib/semantica`. Ojo: solo las viales tienen referencia INVIAS (§2.1) |
| **Censura por presupuesto oficial** | La oferta **no puede exceder el precio base**, y ese precio base se construye con referencias nacionales → en E y F el valor adjudicado está **truncado por arriba** y `exp(δ)` es una **COTA INFERIOR** del factor real | Reportar la tasa de desierto por departamento junto al factor, como **evidencia** de la censura (un desierto por presupuesto insuficiente es la censura haciéndose visible), y publicar `exp(δ)` etiquetado como cota inferior en E y F |
| Baja y método de ponderación | El valor adjudicado incorpora una baja que depende de los oferentes y del método sorteado (§5.1) | Controles `β3` (oferentes) y `β4` (precio base). Sin ellos, `δ` mide competencia |
| Precio base ≠ precio de mercado | El presupuesto oficial es una decisión de la entidad, no un precio | `precio_base` entra como **control**, nunca como variable dependiente alternativa en la misma regresión |
| MAUP / agregación | El departamento promedia realidades opuestas | Es el motivo de la capa municipal de flete |
| Entidad ≠ sitio de obra | `departamento_entidad` es de la **entidad compradora**; un contrato del INVIAS nivel central se publica en Bogotá | Excluir entidades del orden nacional del ajuste regional, o geolocalizar por texto del objeto |

**Tamaño mínimo por celda y encogimiento.** El encogimiento Bayes empírico hacia la media de la
categoría A–F se aplica **SIEMPRE, para todo `n`** — no solo en un tramo intermedio. Con `n` grande
`λ → 1` y el encogimiento desaparece solo; tratarlo como un régimen aparte produce el salto
artificial entre "calibrado" y "encogido" que no corresponde a ningún cambio real en el dato.

```
F̂_shrunk = λ·F̂_depto + (1 − λ)·F̄_categoría ,     λ = n / (n + n₀),   n₀ ≈ 25 [SUPUESTO A CALIBRAR]
```

Con `n₀ = 25`, `n = 30` da `λ = 0,55`: un factor con 30 observaciones sigue siendo 45 % prior de
categoría, y eso hay que decirlo en el registro publicado (`lambda` viaja con el factor). El único
umbral duro es `n < 5` → **no se publica ninguna cifra derivada**.

Se **sabe de antemano** que Vaupés, Guainía, Amazonas, San Andrés y Vichada no alcanzarán muestras
grandes para casi ninguna familia de obra: son exactamente los departamentos con menos procesos y
donde más importa el factor. Ahí manda el prior de la categoría F y la incertidumbre es enorme; la
app debe decirlo, no maquillarlo.

**Incertidumbre.** Nunca se publica un puntual desnudo: se publica `[IC 80 % inferior, central,
IC 80 % superior]` calculado por bootstrap por conglomerados a nivel de entidad (los procesos de una
misma entidad no son independientes). El ancho del intervalo **es** la información en las
categorías E y F.

#### 5.3 Consultas de comprobación

A lanzar en producción; este entorno no alcanza `datos.gov.co` (`CONNECT 403` verificado). Tres
cautelas incorporadas, todas derivadas del propio código de la app:

1. `codigo_principal_de_categoria` llega **con prefijo de versión** (`"V1.72141000"`,
   `"v1_72141000"`, `"V1 72141000"`; `lib/unspsc.js` los retira antes de tokenizar). Un
   `starts_with(...,'72')` a secas devuelve **cero filas**.
2. Un `$select` con función de agregación sobre una columna que Socrata tipa como **texto** puede
   dar **400**. Si eso pasa, no se reintenta la agregación: se traen las filas y se agrega en
   cliente, que es lo que ya hace la app.
3. Sin filtro de adjudicación, el promedio incluye nulos y procesos no adjudicados.

```
-- A) Conteo y valor medio adjudicado por departamento, obra (segmento 72)
?$select=departamento_entidad, count(*) AS n, avg(valor_total_adjudicacion::number) AS v
&$where=fecha_de_publicacion_del between '2024-01-01' and '2025-12-31'
        and (starts_with(codigo_principal_de_categoria,'V1.72')
             or starts_with(codigo_principal_de_categoria,'72'))
        and valor_total_adjudicacion IS NOT NULL
&$group=departamento_entidad &$order=n DESC &$limit=50

-- A') Variante tolerante al formato del prefijo, si A) devuelve cero filas
&$where=... and codigo_principal_de_categoria like '%72%' and valor_total_adjudicacion IS NOT NULL

-- B) Si A) responde 400 por tipado de columna: traer y agregar en cliente
?$select=departamento_entidad, valor_total_adjudicacion, precio_base, codigo_principal_de_categoria
&$where=fecha_de_publicacion_del between '2024-01-01' and '2025-12-31'
        and valor_total_adjudicacion IS NOT NULL
&$limit=50000

-- C) Tasa de desierto por departamento (evidencia de la censura del §5.2)
?$select=departamento_entidad, estado_del_procedimiento, count(*) AS n
&$where=fecha_de_publicacion_del between '2024-01-01' and '2025-12-31'
&$group=departamento_entidad, estado_del_procedimiento &$limit=5000
```

### 6. Degradación honesta

La doctrina ya está escrita en `/home/user/portafolio-estrategico/CLAUDE.md` y el factor regional se
somete a ella sin excepciones:

> «**0 oferentes = SIN DATO**, no "nadie se presentó" (misma lógica que `anticipo_pct = 0`).»
>
> «un `|| 0` sobre un conteo convierte "no sé" en "cero" y lo hace creíble.»
>
> «`registroPublicado` **NO publica ninguna cifra derivada por debajo del mínimo** — ni promedio, ni
> mediana, ni `oferentes_total` (con la suma se recalcula el promedio que se acaba de anular).»
>
> «`competenciaDe` es el **punto único de paso** de los tres consumidores y ahí se impone la
> invariante.»

Traducción al factor regional. Los tres estados se definen por **ancho del intervalo**, no por `n`
—`n` ya entra una vez, dentro del encogimiento—, y el ancho se mide **en unidades de factor**, que
es adimensional (no en puntos porcentuales):

| Estado | Condición | Qué publica el escritor | Qué pinta la UI |
|---|---|---|---|
| 🟢 Calibrado | IC 80 % más estrecho que **±0,10 en unidades de factor** (p. ej. `1,18 [1,10 – 1,26]`) | Central + IC + n + λ + `nivel_tau` + método | Factor con su rango |
| 🟡 Estimado | IC 80 % más ancho que ±0,10, con `n ≥ 5` | **Solo rango** + n + λ + `metodo: "encogido"` | Rango + "estimado por analogía con la categoría X" |
| ⚪ Sin base | `n < 5`, o departamento sin prior, o sin fuente de calibración cargada (hoy: Bogotá D.C.; toda la cartera de edificación y acueducto) | **Nada derivado**: ni central, ni rango, ni suma | "Sin base para estimar sobrecosto regional" + qué falta |

**Si al calibrar ningún departamento alcanza 🟢, se publica toda la matriz en 🟡 y se dice.** No se
ensancha el criterio para poder pintar verde. Con la dispersión típica de los valores de contrato de
obra (log-normal, σ alto) es un desenlace perfectamente posible, y hay que preverlo antes de mirar
los resultados, no después.

Tres cerraduras, calcadas de las que ya funcionaron con el índice de competencia:

1. **El escritor no publica cifras derivadas por debajo del mínimo.** Ni el central, ni el
   `F_total`, ni los sumandos con los que se pueda reconstruir el central anulado.
2. **`factorRegionalDe(indice, licitacion)` es el punto único de paso** para todos los consumidores
   (tarjeta, panel, ordenamiento). La invariante se impone ahí una sola vez: cifra solo con
   `n ≥ mínimo` **Y** método distinto de `"sin_base"` **Y** central presente. Esto importa porque el
   hash regional, igual que `indice:competencia`, sobreviviría a un despliegue: arreglar solo el
   escritor dejaría el defecto en pantalla hasta que alguien reconstruyera el índice.
3. **Prohibido `|| 0` y prohibido `|| 1`** sobre el factor. Un `F = 1` por defecto es peor que un
   `0`: afirma "aquí construir cuesta lo mismo que el promedio nacional", que es una afirmación
   falsa y creíble sobre Vaupés. La ausencia de factor se propaga como ausencia, y el precio
   estimado que dependa de él se muestra también como ausente o como rango.

Y una regla heredada de la capa de pertinencia: **nunca bloquear por falta de información**. Un
proceso en un departamento sin factor **no desaparece del listado**; aparece con la etiqueta ⚪ y sin
estimación de sobrecosto. Ocultarlo sería castigar al dueño por un hueco de datos que no es suyo.

#### Fuentes

| Fuente | Etiqueta | URL / cómo verificar |
|---|---|---|
| APU regionalizados INVIAS: 140 provincias del territorio nacional **excluida Bogotá D.C.**, vigencia 2025-2, precios al 30-dic-2025 | [VERIFICADO POR RESUMEN DE BÚSQUEDA — la página devolvió 403 a la lectura directa] | https://www.invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/ |
| APU INVIAS: precios **puestos en planta, sin transporte, acarreo base 1 km** | **[POR VERIFICAR]** — premisa central de la §2; no aparece en ningún resumen leído. Abrir la hoja de condiciones del libro de APU | Ídem |
| INVIAS: los APU 2025 integran **altitud, clima y acceso a materiales** | [VERIFICADO POR RESUMEN DE BÚSQUEDA] | https://www.invias.gov.co/index.php/sala/noticias/5881-invias-lanza-nueva-tabla-de-precios-para-presupuestar-obras-ajustada-a-la-geografia-y-el-clima-de-cada-region |
| **ICOCIV** (sigla vigente; reemplazó al **ICCP** desde 2022): 46 tipos de obra, 316 capítulos constructivos y **7 grupos de costo** con transporte entre ellos | [VERIFICADO POR RESUMEN DE BÚSQUEDA — pendiente lectura del boletín] | https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-obras-civiles-icociv |
| Boletín técnico mensual del ICOCIV (mes de corte a fijar al citar) | [POR VERIFICAR] — el PDF devolvió 403 desde este entorno | https://www.dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-mar2026.pdf |
| **Materiales = 51,31 % de la canasta ICOCIV** | [VERIFICADO POR RESUMEN DE BÚSQUEDA — pendiente lectura del boletín del DANE con su mes de corte] | Boletín ICOCIV del DANE (URL anterior). Es el **único peso no supuesto** de la §2 |
| Mano de obra +14,5 % anual; materiales +1,46 % anual (variación temporal, no regional) | [VERIFICADO POR RESUMEN DE BÚSQUEDA — prensa, no boletín] | https://www.portafolio.co/economia/infraestructura/construir-obras-civiles-en-colombia-cuesta-casi-5-mas-que-hace-un-ano-segun-el-mas-reciente-reporte-del-dane-491427 |
| **SICE-TAC**: sistema oficial de costos eficientes de operación del transporte automotor de carga, por ruta origen-destino. Los costos publicados se aplican como **piso mínimo de pago** al propietario del vehículo, con control cruzado contra el valor pagado que se registra en el **RNDC** | [VERIFICADO POR RESUMEN DE BÚSQUEDA] — la caracterización jurídica exacta y su vigencia **[POR VERIFICAR]** abriendo el texto de las resoluciones | https://mintransporte.gov.co/tramites/66/sistema-de-informacion-de-costos-eficientes-de-operacion-del-transporte-automotor-de-carga-sice-tac/ ; consulta en https://plc.mintransporte.gov.co/SiceTAC |
| Marco del SICE-TAC: Decreto 1017 de 2025, reglamentado por Resolución 20263040015655 de 27-abr-2026; actualización 2026 por Resolución 20263040018445; carga liviana por anexo técnico de la Resolución 20243040057465 de 2024 | **[POR VERIFICAR]** — números vistos en resúmenes de búsqueda y notas de prensa; **ninguna resolución se abrió**. Antes de citarlos en un documento contractual hay que leerlos en el Diario Oficial | https://mintransporte.gov.co/publicaciones/12356/ (403 desde este entorno) |
| Rango $194–$704 por ton-km en troncales | [INCIERTO] | Verificar corriendo el SICE-TAC para 3 rutas patrón |
| SMMLV 2026 = **$1.750.905**; SMMLV 2025 = **$1.423.500**; incremento **+23,0 %** (1.750.905 / 1.423.500 = 1,2300) | [VERIFICADO] contra el código: `lib/perfiles.js` congela `SMMLV = 1750905`. La atribución a decretos concretos, **[POR VERIFICAR]**: no se abrió ningún diario oficial en esta sesión | `lib/perfiles.js` |
| Artículo 900 INVIAS, transporte de materiales, unidad m³-km sobre 1.000 m | [CONOCIDO] | Contrastar contra el capítulo 9 de las especificaciones generales |
| Base de precios unitarios de referencia del **IDU** (visor vigente, actualización semestral) — única vía para sacar Bogotá de ⚪ | [VERIFICADO POR RESUMEN DE BÚSQUEDA] | https://www.idu.gov.co/page/siipviales/economico/portafolio ; contacto `precios.referencia@idu.gov.co` |
| «Lista oficial de precios unitarios fijos de Obra Pública y de consultoría — Departamento de Boyacá», dataset de Datos Abiertos (id `ae7u-y7m2`) — candidata para la carencia de edificación | [VERIFICADO POR RESUMEN DE BÚSQUEDA] — el dominio está fuera de la allowlist de este entorno; abrir en producción | `datos.gov.co`, dataset `ae7u-y7m2` |
| Ponderaciones de mano de obra / equipo / transporte en la canasta ICOCIV | [INCIERTO] | Solo el 51,31 % de materiales tiene respaldo; el resto son [SUPUESTO A CALIBRAR] |
| Sorteo del método de ponderación económica el día de la audiencia | [CONOCIDO] | Contrastar contra los pliegos tipo de obra pública de Colombia Compra Eficiente |

#### Vacios y siguiente paso

1. **Los APU del INVIAS no se pudieron descargar** (403 desde este entorno). Sin ellos no hay corte
   transversal por componente y toda la tabla de la §4 sigue siendo prior. *Siguiente paso:* bajar
   el libro de APU 2025-2, agregar las 140 provincias a los 33 departamentos **con la regla única de
   la §3** (volumen de obra contratada; respaldo, población) y calcular `F_c` reales por componente.
   De paso, leer la hoja de condiciones para confirmar o desmentir la premisa «en planta, sin
   transporte, acarreo 1 km», y extraer `d̄` y `k̄` si se optara por la forma multiplicativa.
2. **`p6dx-8zbt` no trae cantidades ni desglose de APU.** El histórico propio solo puede calibrar un
   factor **compuesto**. Si se quisiera desagregar habría que cruzar con el dataset de ítems del
   contrato o con formularios de propuesta económica, que no están en este dataset.
   [PENDIENTE DE VERIFICAR EN PRODUCCIÓN] si existe un dataset hermano con ítems.
3. **`departamento_entidad` es de la entidad, no del sitio de obra.** No se midió cuántos procesos
   del corpus son de entidades del orden nacional. *Siguiente paso:* contar por
   `departamento_entidad` y por prefijo del nombre de entidad, y decidir la regla de exclusión antes
   de estimar nada.
4. **Los `k_modo` y las tarifas aérea/marítima no tienen ni una sola observación detrás.** Son
   supuestos de ingeniería. *Siguiente paso:* correr SICE-TAC en 4 rutas terrestres/fluviales patrón
   (Bogotá–Villavicencio, Bogotá–Quibdó, Villavicencio–Puerto Carreño, Popayán–Guapi) y despejar
   `k_modo` con la primera como numerario; y pedir tarifa por kg/ton a operadores en Bogotá–Leticia
   (aéreo) y Cartagena/Barranquilla–San Andrés (cabotaje), que no salen del SICE-TAC.
5. **No existe fuente pública que dé un corte transversal regional por componente ya calculado.** El
   ICOCIV mide variación **temporal**, no diferencia entre departamentos: usarlo como factor
   regional sería un error conceptual y hay que dejarlo escrito para que nadie lo repita.
6. **Las tasas de desierto por departamento no se midieron**, y son la evidencia con la que se acota
   la censura por presupuesto oficial en E y F. Se calculan con el histórico que la app ya tiene, sin
   salir a la red (consulta C de la §5.3).
7. **No hay referencia de precios para edificación ni para acueducto/alcantarillado no vial.** Los
   APU del INVIAS son de obra vial: para aula escolar, CDI, polideportivo, redes hidrosanitarias o
   equipos de bombeo no existe la «referencia nacional = 1,00» que la §2 supone, y hoy eso es **media
   cartera de Detecta**. *Siguiente paso:* (a) evaluar el dataset `ae7u-y7m2` de Boyacá y buscar sus
   equivalentes en otras gobernaciones y en entidades sectoriales, midiendo cuántos departamentos
   quedan cubiertos; (b) si la cobertura es pobre, construir la referencia con el propio
   `precio_base` de SECOP II sobre canastas homogéneas de edificación, aceptando que entonces la
   referencia es «presupuesto oficial típico», no «costo»; (c) mientras tanto, **la matriz solo se
   aplica a ítems viales** y la cartera de edificación sale ⚪.
8. **Bogotá D.C. no tiene fuente cargada.** Está excluida del universo INVIAS y sale ⚪. *Siguiente
   paso:* descargar el visor de precios unitarios de referencia del IDU (2025-I o el vigente),
   mapearlo a los mismos componentes de la §2 y estimar `F_c` para Bogotá con esa base; contrastar
   contra el histórico propio de entidades distritales.
9. **La naturaleza jurídica del SICE-TAC no se pudo leer en la fuente primaria.** Importa poco para
   estimar (el número de $/ton-km sirve igual como referencia técnica) pero mucho para redactar una
   oferta. *Siguiente paso:* abrir el Decreto 1017 de 2025 y las resoluciones citadas en el Diario
   Oficial, confirmar números, fechas y vigencia, y solo entonces afirmar si el valor del SICE-TAC es
   piso obligatorio de pago al transportador o referencia dentro de la libertad vigilada.


---

## 1.C — Marco normativo del APU: Ley 80, Ley 1150, Decreto 1082, AIU y factor prestacional

**Cómo leer las etiquetas de fuente.** Se usan tres, y no son intercambiables:

| Etiqueta | Significado |
|---|---|
| **[FUENTE PRIMARIA LEÍDA]** | Se abrió el texto normativo oficial (o su normograma oficial) y se leyó la disposición citada. Va con URL completa. |
| **[SECUNDARIA]** | Aparece en resultados de búsqueda, compilaciones privadas, guías o fuentes de mercado. No se abrió el articulado oficial. Sirve para orientarse, no para defender un pliego. |
| **[PENDIENTE]** | No se pudo comprobar en este entorno. Va acompañada de la consulta o el documento exacto con el que se comprueba. |

Los números que son convención de industria y no fuente van marcados **[SUPUESTO]** (parámetro a
calibrar) o **[INCIERTO]** (rango que circula sin fuente primaria localizada). En esta iteración no fue
posible reabrir ninguna fuente: `colombiacompra.gov.co`, `funcionpublica.gov.co` y `datos.gov.co`
devolvieron 403 a través del proxy del entorno. Por eso todo lo que en la versión anterior figuraba como
"verificado por búsqueda" se degrada a **[SECUNDARIA]**.

### 1. Qué exige la ley (y el matiz donde casi todos se equivocan)

**Ninguna norma colombiana ordena, por su nombre, presentar un "Análisis de Precios Unitarios".** El APU
es un instrumento de la industria que el ordenamiento vuelve exigible por dos vías indirectas: (a) el
deber de planeación de la **entidad**, que la obliga a estimar y justificar el presupuesto oficial, y (b)
el **pliego de condiciones**, que al ser ley del proceso puede exigir el formato, y en obra pública lo
exige casi siempre. Quien afirme "el APU es obligatorio porque lo dice la Ley 80" está citando mal: la
Ley 80 no menciona el APU. La consecuencia práctica para Detecta es directa —el formato del APU no se
deduce de la ley, se lee del pliego de cada proceso.

| Norma | Contenido relevante | Relación con el APU | Origen |
|---|---|---|---|
| Ley 80 de 1993, art. 25 num. 12 | Antes de abrir el proceso deben existir estudios, diseños y pliegos; si hay obra, estudios que acrediten viabilidad | Fundamento del presupuesto oficial que el APU soporta | [SECUNDARIA] texto reproducido en búsqueda; comprobar en funcionpublica.gov.co/eva/gestornormativo/norma.php?i=304 |
| Ley 80 de 1993, art. 26 | Responsabilidad de la entidad por pliegos incompletos, ambiguos o confusos, o por abrir sin estudios | Sustento para observar un presupuesto oficial sin soporte | [SECUNDARIA] mismo resultado de búsqueda |
| **Ley 80 de 1993, art. 27** | **Ecuación contractual: la equivalencia entre derechos y obligaciones surgida al proponer o contratar debe mantenerse; si se rompe en contra del contratista, la entidad debe restablecerla** | **Base jurídica de la reclamación cuando el costo real supera el APU ofertado por causas no imputables al contratista** | [SECUNDARIA] no se abrió el articulado en esta sesión |
| **Ley 80 de 1993, art. 5 num. 1 (con art. 4 num. 8 y 9)** | **Derecho del contratista a recibir oportunamente la remuneración pactada y al restablecimiento de la ecuación; deber correlativo de la entidad de adoptar las medidas** | Convierte el equilibrio económico en derecho exigible, no en aspiración | [SECUNDARIA] |
| Ley 1150 de 2007, art. 2 | Modalidades: licitación pública (regla general), selección abreviada, concurso de méritos, contratación directa | Define la modalidad y por tanto el pliego aplicable | [SECUNDARIA] funcionpublica.gov.co/eva/gestornormativo/norma.php?i=184686 |
| Ley 1150 de 2007, art. 5 | Selección objetiva: ofrecimiento más favorable | Base para rechazar precios artificialmente bajos | [SECUNDARIA] |
| Decreto 1082 de 2015, art. 2.2.1.1.1.6.1 | Deber de análisis del sector (jurídico, comercial, financiero, organizacional, técnico y de riesgos) | **Es la norma que obliga a costear**: el APU es el vehículo natural | [SECUNDARIA] síntesis oficial de CCE: sintesis.colombiacompra.gov.co/norma/Decreto%201082%20de%202015/11470 |
| Decreto 1082 de 2015, art. 2.2.1.1.2.1.1 | Estudios y documentos previos; valor estimado y su justificación. Si el valor se determina **por precios unitarios**, la entidad debe incluir cómo los calculó y soportar el presupuesto en esa estimación | Vínculo normativo más cercano al APU | [SECUNDARIA] la frase aparece en búsqueda; el numeral exacto (4) no se verificó en el texto oficial |
| Decreto 1082 de 2015, art. 2.2.1.1.2.2.4 | Oferta con valor artificialmente bajo: la entidad debe pedir explicación | El APU es la prueba con la que el oferente se defiende | [SECUNDARIA] |
| Ley 2022 de 2020, art. 1 | Traslada a la ANCP-CCE la potestad de adoptar Documentos Tipo, **de obligatorio cumplimiento** para las entidades sometidas al EGCAP | Convierte el formato del pliego en norma | [SECUNDARIA] funcionpublica.gov.co/eva/gestornormativo/norma.php?i=136375 |

### 2. Pliegos tipo: el formato de salida real

Los Documentos Tipo son la fuente operativa del formato, no la ley. Para licitación de obra pública de
infraestructura de transporte la versión que circula como vigente es la **versión 4**, adoptada por una
resolución de la ANCP-CCE de 2024 que habría derogado la Resolución 240 de 2020.
**[PENDIENTE]** el número de resolución (se ha citado como Resolución 465 de 2024) proviene de fuentes
secundarias y la URL que se tenía estaba truncada, de modo que no es una cita comprobable. Confirmar en
el sitio de CCE o en el SECOP cuál es la resolución vigente y que la versión aplicable a obra de
transporte es efectivamente la 4, antes de citarla en un documento que vaya a un tercero. Cambios
declarados en fuentes secundarias: refuerzo del glosario, nuevas actividades en la **Matriz 1 –
Experiencia** y modificación de las reglas de capacidad financiera. Existen paquetes separados para
menor cuantía, mínima cuantía, infraestructura social e interventoría.

| Pieza | Qué impone | Origen |
|---|---|---|
| **Formulario 1** | Doble uso: **presupuesto oficial** (lo publica la entidad) y **propuesta económica** (lo diligencia el oferente). Ítem, unidad, cantidad, precio unitario, valor parcial | [SECUNDARIA] descrito así en guías de implementación; no se abrió el PDF oficial (403) |
| Formato de APU | Los documentos tipo **estructuran precios unitarios con AIU incluido/discriminado**; la exigencia de radicar los APU de cada ítem suele venir del anexo técnico de cada entidad | [PENDIENTE] confirmar en el anexo técnico del proceso concreto |
| Matriz 1 – Experiencia, Matriz de riesgos, Anexo técnico | Habilitación y asignación de riesgos; el riesgo asignado alimenta el % de imprevistos | [SECUNDARIA] |
| Tope de utilidad | **No hay tope legal general de AIU ni de utilidad.** Lo fija el pliego cuando quiere | [SECUNDARIA] |

Para Detecta esto significa: el entregable de la app debe poder exportar un **Formulario 1** (lista de
ítems con precio unitario) y un **APU por ítem** con los cuatro bloques (materiales, mano de obra, equipo
y herramienta, transporte) más el AIU al pie.

### 3. Anatomía del APU colombiano

**Materiales** — precio *puesto en obra* (incluye flete, descargue y, si aplica, IVA no descontable),
afectado por desperdicio: `Cantidad_comprada = Cantidad_neta × (1 + %desperdicio)`.

| Material | Desperdicio típico | Nota |
|---|---|---|
| Cemento | 3 % | [INCIERTO] tablas de industria, no norma |
| Acero de refuerzo | 3 % precortado en fábrica (<1 %); hasta **10 %** cortado y figurado en obra | [INCIERTO] |
| Concreto / mortero (mezcla) | 5 % premezclado; **10–15 %** hecho en obra | [INCIERTO] |
| Ladrillo / bloque | 5 % | [INCIERTO] |
| Arenas y gravilla | 5 % | [INCIERTO] |
| Tubería (PVC, novafort) | 3–5 % por cortes y despuntes | [INCIERTO] no se localizó tabla publicada |
| Madera para formaleta | 10–15 % (además del número de usos) | [INCIERTO] |

Advertencia: **no existe una tabla oficial de desperdicios**. Son valores de manuales y de práctica. Se
repite en la industria que en obra de difícil acceso deben incrementarse, pero **no se localizó fuente
para el tamaño de ese incremento [PENDIENTE]**: quien lo necesite debe derivarlo de sus propias actas de
consumo, no de un porcentaje citado de oídas. Si la app los usa, deben ser parámetros editables, no
constantes.

**Mano de obra** — se costea por *cuadrilla* y *rendimiento*:

`Costo_MO_unitario = (Σ jornales de la cuadrilla × factor prestacional) / rendimiento (unidad/día)`

Cuadrillas tipo [SUPUESTO — composición de uso corriente en manuales de presupuesto, sin fuente
normativa; calibrar contra la obra real]: 1 oficial + 1 ayudante (instalaciones, mampostería fina),
1 oficial + 2 ayudantes (mampostería, pañetes, concretos manuales), 1 oficial + 3–5 ayudantes
(excavación manual, rellenos).

**Sensibilidad: las dos variables pesan, y ninguna se puede fijar sin banda.** Un error del 10 % en el
precio de un material que pese el 50 % del costo directo mueve el APU 5 %. El rendimiento es *más*
sensible porque entra dividiendo (−20 % de rendimiento = +25 % del costo de mano de obra), pero la mano
de obra suele pesar 20–35 % del directo [SUPUESTO — proporción de uso corriente, varía por capítulo]:
un error del 30 % en rendimiento mueve el APU entre 9 y 15 %. En obra civil los materiales pesan
típicamente entre el 40 % y el 70 % del costo directo (concreto, acero, tubería, agregados)
[SUPUESTO], así que descuidar la cotización de materiales por concentrarse en el rendimiento es
exactamente al revés de donde está el dinero. Si Detecta va a estimar, **ambas** variables deben ir con
banda (p10–p90), no con valor puntual.

**Equipo y herramienta** — `tarifa horaria × horas/unidad`, o `tarifa día / rendimiento`. Partida
adicional de **herramienta menor**, calculada como porcentaje del costo de mano de obra: **3–5 %, con
5 % como valor de uso corriente** en APU publicados por entidades [INCIERTO — es convención, no
medición; hay trabajos académicos dedicados precisamente a determinar ese porcentaje para un oficio y
una ciudad concretos, lo que confirma que no hay tarifa].

**Transporte** — dos partidas distintas: (a) flete de materiales, normalmente ya incorporado en el
"precio puesto en obra"; (b) **acarreo/transporte de material de excavación, derrumbes y escombros**,
que en carreteras se paga por separado. INVÍAS lo normaliza en el **Artículo 900 – Transporte de
materiales provenientes de excavaciones y derrumbes**, de las Especificaciones Generales de Construcción
de Carreteras (versión 2022, adoptada por **Resolución INVÍAS 4561 del 29 de noviembre de 2022**)
[SECUNDARIA — no se abrió el articulado]. Unidad de pago: **m³-km** (volumen suelto × distancia de
acarreo), con frecuencia con primer kilómetro incluido en la excavación y sobreacarreo desde ahí.

### 4. Factor prestacional 2026

Datos de base 2026: **SMMLV $1.750.905** y **auxilio de transporte $249.095**, atribuidos a los
Decretos 1469 y 1470 del 29 de diciembre de 2025 [SECUNDARIA — no se abrió el Diario Oficial].
**[PENDIENTE] confirmar los Decretos 1469 y 1470 de 2025 en el Diario Oficial**: el salto implica un alza
del 23,0 % sobre los $1.423.500 de 2025 mientras el auxilio subiría 24,5 %, dos tasas distintas que
conviene comprobar antes de que ese valor arrastre el factor prestacional, la fórmula K de
`lib/capacidad.js` y los tramos de la Estampilla Pro-UNAL. El valor coincide con el que ya usa
`lib/perfiles.js`, así que un error aquí se propaga a toda la app.

| Concepto | Tarifa | ¿Exonerable? | Origen |
|---|---|---|---|
| Cesantías | 8,33 % | No | CST [SECUNDARIA] |
| Intereses a las cesantías | 1,00 % (12 % de cesantías) | No | CST [SECUNDARIA] |
| Prima de servicios | 8,33 % | No | CST [SECUNDARIA] |
| Vacaciones | 4,17 % | No | CST [SECUNDARIA] |
| **Subtotal prestaciones** | **21,83 %** | | |
| Pensión (empleador) | 12,00 % | No | Ley 100 [SECUNDARIA] |
| Salud (empleador) | 8,50 % | **Sí**, art. 114-1 ET | [SECUNDARIA] estatuto.co/114-1 (compilación privada) |
| ARL clase V (construcción pesada) | 6,960 % | No | Decreto 1772 de 1994 [SECUNDARIA] |
| SENA | 2,00 % | **Sí**, art. 114-1 ET | [SECUNDARIA] |
| ICBF | 3,00 % | **Sí**, art. 114-1 ET | [SECUNDARIA] |
| Caja de compensación | 4,00 % | **No** | [SECUNDARIA] |

**Base de cálculo (asimetría que se olvida siempre).** Cesantías, intereses de cesantías y prima se
liquidan sobre **salario + auxilio de transporte**; vacaciones, seguridad social, ARL y parafiscales,
**solo sobre salario**. Para un obrero de 1 SMMLV el auxilio equivale al **14,23 %** del salario
($249.095 / $1.750.905) y se descompone así:

- el auxilio **en sí mismo** es costo en efectivo: **+14,23 puntos** de factor;
- su efecto sobre la base prestacional: 17,66 % (cesantías 8,33 + intereses 1,00 + prima 8,33) × 14,23 %
  = **+2,51 puntos**;
- total: **+16,74 puntos de factor** que las tablas de abajo **NO** incluyen.

El auxilio se causa para quien devengue hasta 2 SMMLV. **Los factores de la tabla siguiente no lo
llevan: súmese aparte** o inclúyase el auxilio en el jornal base.

**Corrección importante al supuesto de partida:** la exoneración del art. 114-1 ET **no** depende de que
el empleador tenga "menos de 2 SMMLV". Aplica sobre los trabajadores que devenguen **menos de 10 SMMLV**,
para (a) sociedades y personas jurídicas contribuyentes declarantes de renta y (b) **personas naturales
empleadoras, siempre que empleen dos (2) o más trabajadores** [SECUNDARIA]. Esto es material para los
perfiles de Detecta: **Génesis SAS está exonerada**; **Helder, persona natural, solo si tiene 2 o más
empleados** — con un solo trabajador paga salud, SENA e ICBF completos y su costo de mano de obra es
~13,5 puntos más alto que el de la SAS con el mismo jornal.

**Tarifas ARL por clase de riesgo** (Decreto 1772 de 1994, iguales para todas las ARL) [SECUNDARIA — vía
arlsura.com y fuentes de mercado]: I 0,522 % · II 1,044 % · III 2,436 % · **IV 4,350 %** · **V 6,960 %**.
Obra civil se clasifica típicamente en IV o V según la actividad (V para construcción pesada, excavación,
altura). Límites legales de cotización: 0,348 % mínimo y 8,7 % máximo del IBC (art. 18 Decreto-ley 1295 de
1994 y art. 13 Decreto 1772 de 1994) [SECUNDARIA].

**Escenarios sobre SALARIO MENSUAL (30 días pagados), sin auxilio de transporte:**

| Escenario | Cálculo | Factor |
|---|---|---|
| Génesis SAS, obrero < 10 SMMLV, **exonerada**, ARL IV | 21,83 + 12 + 4,35 + 4 = 42,18 % | **1,42** |
| Génesis SAS, exonerada, ARL V | 21,83 + 12 + 6,96 + 4 = 44,79 % | **1,45** |
| Helder con 1 solo empleado (sin exoneración), ARL IV | 21,83 + 12 + 8,5 + 4,35 + 2 + 3 + 4 = 55,68 % | **1,56** |
| Sin exoneración, ARL V | 58,29 % | **1,58** |
| Sin exoneración + dotación + recargos y extras | ver nota | **≈1,67–1,70** [SUPUESTO] |

Nota de la última fila: se le añaden dotación **~3 %** [SUPUESTO] y recargos/horas extra **~6 %**
[SUPUESTO]; ninguno de los dos porcentajes tiene fuente localizada y ambos dependen del régimen de turnos
de la obra concreta. No usarlos como constante.

**El mismo escenario de Génesis, con y sin auxilio de transporte** (obrero de 1 SMMLV, exonerada, ARL IV):

| Concepto | Sin auxilio | Con auxilio |
|---|---|---|
| Efectivo pagado al trabajador | $1.750.905 | $2.000.000 ($1.750.905 + $249.095) |
| Cesantías + intereses + prima (17,66 % sobre salario+auxilio) | $309.210 | $353.200 |
| Vacaciones (4,17 % sobre salario) | $73.013 | $73.013 |
| Pensión + ARL IV + caja (20,35 % sobre salario) | $356.309 | $356.309 |
| **Costo mensual total** | **$2.489.437** | **$2.782.522** |
| **Factor sobre el salario ($1.750.905)** | **1,42** | **1,59** |

Diecisiete puntos de diferencia por una partida que la tabla de escenarios no contiene. Un APU que
aplique 1,42 al jornal derivado del SMMLV **subestima la cuadrilla** salvo que el auxilio ya esté dentro
del jornal base.

#### Rangos con base declarada

La pregunta que hay que contestar antes de citar cualquier factor es **sobre qué se multiplica**:

| Base | Rango | Cómo se obtiene |
|---|---|---|
| **Salario mensual (30 días pagados)** | **1,42 – 1,58** según exoneración y clase de ARL | Son los valores de la tabla de escenarios. Súmese aparte el auxilio de transporte (+0,17 aprox. para un obrero de 1 SMMLV) y, si aplica, dotación y recargos. |
| **Jornal por día efectivamente laborado (22–24 días/mes)** | **≈1,78 – 2,15** | Multiplicar el factor anterior por `30 / días_laborados` ≈ **1,25** (24 días) a **1,36** (22 días). El extremo bajo: 1,42 × 1,25 = 1,78; el alto: 1,58 × 1,36 = 2,15. La convención IDU/INVÍAS se cita en el rango **1,75–1,95** [PENDIENTE — no se localizó el manual del que sale]. |

**No usar un rango único.** Un factor de 1,45 sobre salario mensual y uno de 1,45 sobre jornal por día
laborado describen costos de mano de obra que difieren ~30 %: es la fuente número uno de APU
incomparables entre sí. En la literatura de metodología IDU/INVÍAS el paso de una base a otra se
descompone en **TPNL** (*Tiempo Pagado No Laborado*: dominicales, festivos, vacaciones y descansos que se
pagan pero no se trabajan, citado en ~22,5 %) y **MVP** (*Mayor Valor Prestacional*, citado en ~14,7 %);
**[PENDIENTE]** no se localizó el manual que publica esas dos cifras, así que no deben usarse como dato
sino reconstruirse con la aritmética de la tabla anterior, que sí es auditable.

Lo que mueve el factor, en orden de impacto: (1) **la base** —salario mensual vs. jornal laborado—, que
pesa más que todo lo demás junto; (2) exoneración del art. 114-1 —13,5 puntos—; (3) auxilio de transporte
—16,7 puntos para un obrero de 1 SMMLV—; (4) clase de riesgo ARL —2,6 puntos entre IV y V—; (5) dotación
—obligatoria para quien gana **hasta 2 SMMLV**, tres entregas al año, art. 230 CST [SECUNDARIA]—;
(6) recargos: la **Ley 2466 de 2025** subió el dominical y festivo a 80 % desde julio de 2025, **90 %
desde el 1 de julio de 2026** y 100 % en 2027, y adelantó el recargo nocturno a las 7:00 p.m.; la jornada
máxima baja a **42 horas desde el 15 de julio de 2026** (Ley 2101 de 2021), lo que **encarece la hora
ordinaria sin cambiar el salario** [SECUNDARIA]. Cualquier APU de obra con turnos o trabajo dominical
hecho con parámetros de 2024 está subestimado.

### 5. AIU y carga tributaria

- **Administración**: costos indirectos —dirección de obra, campamento, personal administrativo, pólizas,
  ensayos, servicios públicos de obra, papelería, **impuestos y estampillas si el pliego así lo prevé**—.
- **Imprevistos**: contingencia del riesgo *normal* del contrato, no de riesgos asignados a la entidad ni
  del alea extraordinaria. La jurisprudencia contencioso-administrativa ha exigido **probar** la ejecución
  de los imprevistos para reclamarlos [SECUNDARIA — no se verificó sentencia concreta].
- **Utilidad**: beneficio neto esperado; es la base gravable del IVA (ver abajo).

| Componente | Rango citado en fuentes de industria | Calidad de la fuente |
|---|---|---|
| Administración | 5 %–20 % (típico 8 %–12 %) | [INCIERTO] blogs comerciales |
| Imprevistos | 1 %–5 % (típico 3 %–5 %) | [INCIERTO] |
| Utilidad | 5 %–12 % | [INCIERTO] |
| **AIU total (suma de las filas anteriores)** | **típico 16 %–29 %; rango completo 11 %–37 %** | [INCIERTO] es aritmética de rangos sin fuente primaria, no una medición |

Se repite que un AIU por encima del 35 % genera observaciones de la entidad [INCIERTO — procede de las
mismas fuentes comerciales no primarias que los rangos de arriba; no hay norma que lo respalde].

**No hay tope legal de AIU ni de utilidad**; lo fija el pliego, y en documentos tipo el oferente estructura
sus precios unitarios "incluyendo el porcentaje de AIU" del proceso.

**IVA sobre la utilidad, no sobre el valor total.** En contratos de construcción de bien inmueble el IVA se
causa sobre los honorarios pactados y, si no se pactan, **sobre la utilidad del constructor** — art. 3 del
**Decreto 1372 de 1992**, hoy **compilado en el art. 1.3.1.7.9 del Decreto 1625 de 2016** (norma vigente)
[FUENTE PRIMARIA LEÍDA — normograma.dian.gov.co/dian/compilacion/docs/decreto_1372_1992.htm]. Dos
precisiones que cuestan dinero: (a) el beneficio aplica **solo a verdaderos contratos de construcción**;
si no lo es, la base es el valor total del contrato incluidos materiales; (b) **no confundir con el
art. 462-1 ET**, que fija una base especial de AIU con **mínimo del 10 %** y aplica exclusivamente a aseo
y cafetería, vigilancia, servicios temporales y cooperativas de trabajo asociado — **no a construcción**
[SECUNDARIA]. Tarifa general de IVA: 19 %.

**Descuentos de cada acta** (se pagan sobre el valor bruto y por eso deben estar dentro de "A"):

| Concepto | Tarifa típica | Origen |
|---|---|---|
| Retención en la fuente por renta, contratos de construcción y obra | **2 %** | art. 1.2.4.9.1 Decreto 1625 de 2016 [SECUNDARIA] |
| ICA (municipal, donde se ejecuta la obra) | Bogotá: **8,66 ‰** para contratistas, constructores y urbanizadores desde el año gravable 2022 (antes 6,9 ‰, Acuerdo 65 de 2002). Otros municipios: 4 ‰–10 ‰ | [SECUNDARIA — bogota.gov.co] |
| ReteICA | Normalmente la misma tarifa del ICA, retenida por la entidad | [SECUNDARIA] |
| Estampilla Pro Universidad Nacional (Ley 1697 de 2013) | 0,5 % (1–2.000 SMMLV), 1 % (2.001–6.000), 2 % (>6.001). **Solo en contratos de obra y conexos con entidades del ORDEN NACIONAL (art. 1); no se causa en contratos municipales ni departamentales** | [SECUNDARIA] — la restricción al orden nacional es decisiva: el grueso del corpus de la app es territorial |
| Estampilla Pro Cultura | ~0,5 % | [INCIERTO] varía por ordenanza/acuerdo |
| Estampilla Pro Adulto Mayor | ~1,5 % | [INCIERTO] varía por ordenanza/acuerdo |
| **Contribución especial de obra pública** | **5 % del valor del contrato** y de sus adiciones, en contratos de obra suscritos con entidades de derecho público (Ley 418 de 1997 y sus prórrogas) | [PENDIENTE] verificar la ley de prórroga vigente en 2026 antes de meterla en una plantilla |
| **Suma típica de descuentos** | **8 %–11 % del valor del acta cuando aplica la contribución del 5 %; 3 %–6 % si no aplica** | |

**Cuándo no aplica la contribución del 5 %**: en obra privada, en contratos que no son de obra pública
(suministro, consultoría y, con discusión, interventoría) y si la vigencia de la Ley 418 no estuviera
prorrogada. Fuera de esos casos, **hay que contarla**: estructurar el "A" con el 3–6 % en un contrato de
obra con entidad pública deja al contratista corto en unos cinco puntos del valor del contrato, que es el
error de este tipo que más rápido convierte un contrato en pérdida.

Regla operativa: si la obra es en varios municipios, el ICA se declara y paga **proporcionalmente a los
ingresos de cada jurisdicción** [SECUNDARIA].

#### Anticipo ≠ pago anticipado

Son dos figuras jurídicamente distintas y confundirlas altera el flujo de caja y la base gravable.

| | **Anticipo** | **Pago anticipado** |
|---|---|---|
| Titularidad del dinero | **De la entidad** hasta que se amortiza. El contratista lo administra, no lo gana | **Del contratista** desde el desembolso |
| Naturaleza | Financiación de la ejecución | Pago parcial del precio |
| Amortización | Se amortiza porcentualmente en **cada acta** (normalmente el mismo % del anticipo sobre el valor del acta) | No se amortiza |
| Efecto tributario | No es ingreso al recibirlo; IVA y retención se causan a medida que se amortiza contra actas | Causa IVA y retención **de inmediato** |
| Manejo | En contratos de **obra por licitación pública**, el manejo debe hacerse en **patrimonio autónomo (fiducia mercantil irrevocable)**, con costos a cargo del contratista — **art. 91 Ley 1474 de 2011** [SECUNDARIA — no se abrió el articulado en esta sesión] | Sin exigencia de fiducia |
| Rendimientos financieros | **Pertenecen a la entidad** | Del contratista |
| Garantía | **Buen manejo y correcta inversión del anticipo, por el 100 % del valor anticipado** [SECUNDARIA] | Garantía de devolución del pago anticipado, también por el 100 % |

Consecuencias para el "A": la comisión fiduciaria, la prima de la garantía de buen manejo y el costo
financiero de no disponer libremente del dinero son costos **reales** del contrato y van en
Administración. Y el anticipo **no mejora la utilidad**: mejora la caja, y solo si se amortiza al mismo
ritmo al que se gasta.

Nota para Detecta: el campo `anticipo_pct` del corpus vale `0` cuando **no hay dato**, no cuando el
proceso no tiene anticipo, y además el dataset no distingue anticipo de pago anticipado. Cualquier
cálculo de caja que se construya sobre ese campo debe declararlo.

### 6. Obra pública vs. obra privada

| Aspecto | Obra pública | Obra privada |
|---|---|---|
| Formato | Impuesto (documentos tipo, Formulario 1, anexo técnico) | Libre |
| AIU | Explícito y discriminado; a veces con tope de pliego | Puede ir embebido en el precio unitario |
| Pólizas | Garantía única obligatoria: **seriedad: 10 % del valor de la oferta como regla general, con porcentajes escalonados menores en procesos de cuantía muy alta (Decreto 1082, art. 2.2.1.2.3.1.9)**; salarios y prestaciones ≥5 % del valor del contrato, vigente por el plazo + 3 años; **estabilidad y calidad de la obra: vigencia mínima de cinco (5) años salvo justificación técnica de la entidad**; RCE cuando aplica [SECUNDARIA — Decreto 1082 de 2015, subsección de garantías] | Opcionales, negociadas |
| Tributario | Estampillas (la Pro-UNAL solo en orden nacional), ReteICA, retefuente, **contribución de obra pública 5 %** (Ley 418 de 1997 y prórrogas) [PENDIENTE — prórroga vigente] | Sin estampillas ni contribución |
| Reajustes | Fórmulas polinómicas con índices del DANE cuando el pliego las prevé. **OJO: son índices de VARIACIÓN, no niveles de precio** — sirven para escalar un precio pactado en una fecha base, nunca para fijarlo ni para validar el nivel absoluto de un APU. **[PENDIENTE DE VERIFICAR]** la denominación y la base vigentes en 2026: el DANE reemplazó las series ICCV/ICCP por índices de nueva base (ICOCED para edificaciones y el índice de costos de obras civiles); confirmar en dane.gov.co antes de escribir una fórmula polinómica, porque una fórmula redactada contra "ICCP/ICCV" puede apuntar a series descontinuadas | Pactadas libremente |
| Riesgo | Matriz de riesgos publicada; el riesgo asignado al contratista debe reflejarse en "I" | Contractual |

**La regla básica del contrato a precios unitarios, que decide si un sobrecosto se reclama o se absorbe:**
las **cantidades** del Formulario 1 son **estimadas** y su variación es riesgo de la entidad —las mayores
cantidades de obra se reconocen al precio unitario del contrato—; el **precio unitario**, en cambio, es
riesgo del contratista, salvo pacto expreso de reajuste. Dicho de otro modo: **un rendimiento mal estimado
no se reclama; una cantidad mal estimada sí.** Cuando el desequilibrio proviene de un hecho ajeno,
imprevisto e irresistible —no de un mal cálculo propio— el camino es el restablecimiento de la ecuación
contractual del art. 27 de la Ley 80, y ahí el APU ofertado es la prueba del punto de partida. Este
párrafo y la matriz de riesgos son complementarios: la matriz dice quién asume qué, y esta regla dice qué
se puede pedir cuando el costo real se desvía.

### 7. Cómo se puntúa el precio: el APU no gana por ser el más barato

Este es el mecanismo que decide si un APU agresivo gana o pierde, y el que más se malinterpreta.

**El puntaje económico de los Documentos Tipo no premia el mayor descuento.** El Formulario 1 diligenciado
por el oferente se evalúa con un **método de ponderación que se SORTEA el día de la audiencia** entre
varias alternativas previstas en el pliego tipo. Las que se citan habitualmente son
[SECUNDARIA / PENDIENTE — no se pudo abrir el pliego tipo v4 en esta sesión; confirmar la lista exacta y
el número de alternativas del documento vigente]:

| Método sorteado | Qué premia | Consecuencia para quien oferta bajo |
|---|---|---|
| **Media aritmética** | Cercanía a la media de las ofertas hábiles | Bajar de más **aleja** de la media y resta puntos |
| **Media aritmética alta** | Cercanía a la media entre la media aritmética y la oferta válida más alta | Castiga al barato con más fuerza aún |
| **Media geométrica con presupuesto oficial** | Cercanía a una media que incorpora el presupuesto oficial como si fuera una oferta más | Ancla el óptimo cerca del presupuesto, no del piso |
| **Menor valor** | El precio más bajo | **Único método en el que "bajar más" es dominante** |

Tres consecuencias operativas:

1. **La estrategia no es "bajar lo más posible", sino "quedar cerca de la media esperada".** Con
   n alternativas y una sola favorable al menor valor, apostar todo al descuento es apostar a una
   fracción de los escenarios del sorteo. La decisión racional es estimar dónde caerá la media —con el
   histórico de la entidad y del tipo de obra— y ubicarse cerca, con el margen que la utilidad tolere.
2. **El pliego fija una franja: hay un límite inferior por debajo del cual la oferta se descarta o se
   excluye del cálculo de la media, y un umbral de precio artificialmente bajo que dispara el
   requerimiento de explicación** (Decreto 1082, art. 2.2.1.1.2.2.4). **[PENDIENTE]** el porcentaje exacto
   del límite inferior y el criterio del umbral están en el pliego tipo vigente y no se pudieron leer;
   son el primer dato que hay que sacar del Documento Tipo cuando se tenga acceso.
3. **Para qué sirve entonces el APU: para DEFENDER el precio, no para ganar por menor valor.** Cuando la
   entidad califica una oferta de artificialmente baja, el APU con rendimientos, cuadrillas, factor
   prestacional y cotizaciones de material es la única prueba que evita el rechazo. Un APU sólido no
   suma puntos; evita perderlos todos.

Para Detecta: cualquier funcionalidad que sugiera "un % de descuento óptimo" está mal planteada mientras
no modele el sorteo. Lo que sí es útil y se puede construir con el corpus histórico es la **distribución
de descuento frente al presupuesto oficial por entidad y tipo de obra**, que es un insumo para estimar
dónde caerá la media — no una recomendación de cuánto bajar.

### 8. Qué es obligatorio y qué es práctica de industria

**Obligatorio (por norma o por pliego):** Formulario 1 con precios unitarios; discriminación del AIU cuando
el pliego la exige; cumplimiento de la Matriz de Experiencia y de capacidad financiera; garantías; manejo
del anticipo en patrimonio autónomo cuando aplica; declarar y pagar ICA, estampillas, retenciones y la
contribución de obra pública; explicar el precio cuando la entidad lo califique de artificialmente bajo
(Decreto 1082, art. 2.2.1.1.2.2.4). **Práctica de industria, no norma:** el formato concreto del APU, los
porcentajes de desperdicio, la composición de las cuadrillas, los rendimientos, el 5 % de herramienta
menor y los rangos de A, I y U. Nada de esto tiene tarifa legal; son defendibles solo si están soportados
en el análisis del sector y en precios de mercado documentados.

#### Vacíos y siguiente paso

1. **No se pudo abrir ningún documento tipo oficial**: colombiacompra.gov.co, funcionpublica.gov.co,
   dnp.gov.co y secretariajuridica.gov.co devolvieron HTTP 403 a través del proxy de este entorno. Quedan
   **[PENDIENTE]**: (a) el número y fecha de la resolución que adopta la versión 4 —se cita la 465 de
   2024 sin URL comprobable—; (b) el listado exacto de formularios y anexos; (c) **la lista cerrada de
   métodos de ponderación y el porcentaje del límite inferior**, que es lo más valioso de todo el
   paquete; (d) si el APU por ítem se radica con la oferta o solo lo entrega el adjudicatario. Siguiente
   paso: descargar el ZIP de la versión 4 desde el sitio de CCE en una red sin proxy y leer el Anexo
   Técnico, el Formulario 1 y el capítulo de evaluación económica.
2. **Rangos de A, I y U sin fuente primaria.** Todo lo localizado son fuentes comerciales. La forma
   correcta de acotarlo con los datos que la app ya tiene: extraer del corpus histórico de SECOP II los
   procesos de obra adjudicados y comparar valor adjudicado contra presupuesto oficial. Consulta de
   partida sobre `p6dx-8zbt` **[PENDIENTE, requiere producción]**, escrita con el mismo patrón que ya usa
   `lib/socrata.js` —paginación **keyset** por `:id`, todas las columnas y proyección en cliente, porque
   **un `$select` explícito con una columna inexistente devuelve HTTP 400**:

   ```
   ?$select=:id,:updated_at,*
   &$where=fecha_de_publicacion_del between '2024-01-01T00:00:00' and '2025-12-31T23:59:59'
           AND :id > '<último :id de la página anterior>'
   &$order=:id
   &$limit=1000
   ```

   El filtro de obra **no** va en el `$where`: se aplica **en cliente** contra `WHITELIST_OBRA` y
   `VERBOS_DE_OBRA_FUERTES` de `lib/semantica.js`, porque un `starts_with(...,'CONSTRUC')` descartaría el
   grueso del corpus real («MEJORAMIENTO», «PAVIMENTACIÓN», «ADECUACIÓN», «MANTENIMIENTO») y además el
   texto del objeto vive en `descripci_n_del_procedimiento`, distinto de `nombre_del_procedimiento`.
   **El nombre de la columna de valor adjudicado está [PENDIENTE DE VERIFICAR]**: `lib/indice_competencia.js`
   la busca por lista de candidatas (`valor_total_adjudicacion`, `valor_adjudicado`, `valor_adjudicacion`
   en `CAMPOS_VALOR_ADJUDICADO`), no como columna confirmada; el filtro por valor adjudicado > 0 se aplica
   en cliente después de resolver cuál existe. Esto no da el AIU (SECOP II no publica su desagregación),
   pero sí **la distribución del descuento frente al presupuesto oficial, que es un insumo para estimar
   dónde caerá la media del sorteo — NO la variable que gana el proceso** (ver §7).
3. **El AIU no consta en la proyección que usa la app** (`lib/proyeccion.CAMPOS`), pero eso **no prueba
   que la fuente no lo publique**: esa constante es una lista blanca de lo que la app decide conservar —de
   hecho incluye a propósito campos que p6dx-8zbt no trae hoy, por si la fuente los añade— y el entorno no
   alcanza datos.gov.co (CONNECT 403). **[PENDIENTE DE VERIFICAR]** contra el diccionario de datos de
   `p6dx-8zbt` desde una red sin proxy. La conclusión operativa no cambia: si la app quiere mostrar AIU
   tendrá que estimarlo, y debe decirlo así en la tarjeta, igual que ya hace con `anticipo_pct = 0` = "sin
   dato".
4. **Contribución especial de obra pública (5 %, Ley 418 de 1997)** [PENDIENTE]: verificar la ley de
   prórroga vigente en 2026 antes de incluirla en una plantilla de costos, y si la interventoría queda
   dentro o fuera del hecho generador.
5. **Tarifas de ICA y estampillas son municipales/departamentales**: no hay tabla nacional. Si Detecta
   quiere estimar la carga por proceso, necesita una tabla por municipio construida a mano a partir de los
   acuerdos municipales; hasta entonces debe usar un rango declarado como estimación, distinguiendo si
   aplica o no la contribución del 5 % (8 %–11 % vs. 3 %–6 %) y si la entidad es del orden nacional (única
   hipótesis en que se causa la estampilla Pro-UNAL).
6. **Sentencias del Consejo de Estado sobre imprevistos** citadas de memoria [PENDIENTE]: buscar en
   `consejodeestado.gov.co` "imprevistos AIU prueba del mayor costo" para citar radicado exacto.
7. **Decretos de salario mínimo y auxilio 2026** [PENDIENTE]: confirmar los Decretos 1469 y 1470 de 2025
   en el Diario Oficial. El SMMLV alimenta el factor prestacional, la fórmula K de `lib/capacidad.js` y los
   tramos de la estampilla Pro-UNAL: un error aquí se propaga a toda la app.
8. **Índices DANE para fórmulas polinómicas** [PENDIENTE]: confirmar en dane.gov.co la denominación, la
   base y la vigencia de los índices que reemplazaron a ICCV e ICCP antes de escribir o aceptar una fórmula
   de reajuste.


---

## 1.D — Automatizacion: del objeto del proceso a los items de obra

El repositorio ya resuelve la mitad del problema: `lib/semantica.js` (verbos de obra, verbos
condicionados a un ancla de infraestructura, términos no pertinentes con lookaheads de excepción,
`norm`), `lib/unspsc.js` (matching jerárquico por nivel real del código) y `lib/texto_unspsc.js`
(semilla de vocabulario por familia **curada a mano**, con derivación TF-IDF disponible —
`derivarVocabulario()` + `/api/sync/historico?reconstruir_vocabulario=true`— pero **aún no
ejecutada** sobre el histórico). Lo que falta es una **capa de tipología** que consuma esas tres
señales y una **biblioteca de APU parametrizados** colgada de ella.

### 1 · Catálogo cerrado de tipologías

Cerrado a propósito: un catálogo abierto no se puede probar ni auditar, y una tipología mal asignada
produce un presupuesto absurdo. Las familias UNSPSC citadas están **verificadas una a una contra
`lib/unspsc.js` salvo las señaladas al pie**; las glosas de qué significa cada familia son
[CONOCIDO] y deben confirmarse contra el Clasificador de Bienes y Servicios de la ANCP.

| Código | Tipología | Términos ancla del objeto (sobre `norm`) | Familias UNSPSC | Unidad dominante | Ítems característicos |
|---|---|---|---|---|---|
| VIA-PH | Placa huella | placa huella, placahuella, huella, riel, via terciaria | 7214, 7215, 9512 | ml de vía | localización y replanteo; excavación manual; subbase granular; concreto huellas 21 MPa; acero figurado; piedra pegada franja central; berma-cuneta; junta de dilatación; curado |
| VIA-FLEX | Pavimento flexible | pavimentacion, asfalto, asfaltic\*, mezcla densa, MDC, imprimacion | 7214, 7215, 9512 | m² / m³ | desmonte; excavación de la explanación; subbase (INV 320); base granular (INV 330); imprimación (INV 420); MDC en caliente (INV 450); sello; demarcación |
| VIA-RIG | Pavimento rígido | pavimento rigido, concreto hidraulico, losa, placa de concreto | 7214, 7215, 9512 | m² / m³ | subbase; concreto MR-40 (INV 500); acero de pasadores; sello de juntas; curado; sardinel |
| VIA-MANT | Mantenimiento y rehabilitación vial | mantenimiento + vía, parcheo, afirmado, rocería, conformación, repavimentación | 7215, 9512, 7212 | ml / m² | rocería; conformación de calzada; afirmado (INV 311); parcheo; limpieza de cunetas; bacheo; retiro de derrumbes |
| VIA-SEN | Señalización vial | senalizacion vial, demarcacion, senal vertical, tachas | 7215, 9512, 5510\* | ml / unidad | señal vertical SR/SP; demarcación línea continua; tacha reflectiva; defensa metálica; captafaros |
| DRE-OBR | Drenaje y alcantarillas | alcantarilla, box culvert, cuneta, filtro, descole, encole, sumidero | 7214, 7215, 4017 | ml / m³ | excavación; tubería de concreto Ø36"; solado; concreto cabezotes; cuneta en concreto; filtro francés; descole |
| EST-MUR | Muros de contención y gaviones | muro de contencion, gavion, pantalla anclada, tierra reforzada | 7214, 7215, 3010 | m³ / m² | excavación; concreto ciclópeo; concreto estructural (INV 630); acero (INV 640); gavión de malla; geotextil; drenaje del trasdós |
| EST-PTE | Puentes menores y pontones | puente vehicular, puente peatonal, ponton, estribo, viga | 7214, 7215, 9512 | m² de tablero / ml | pilotes/estribos; concreto estructural; acero de refuerzo; vigas prefabricadas; losa; juntas; barandas |
| MIT-GEO | Mitigación y estabilización | mitigacion, estabilizacion, talud, jarillon, socavacion, obras de proteccion | 7214, 7712, 8115 | m³ / m² | descapote; terraceo; gaviones; enrocado; geomalla; empradización; subdrenes |
| AGU-RED | Acueducto — redes | acueducto, red de acueducto, aducción, conducción, domiciliaria | 7215, 4017, 4018, 8110 | ml | rotura y reposición de pavimento; excavación en zanja; cama de arena; tubería PVC/PEAD; accesorios; válvulas; prueba hidrostática; relleno compactado |
| ALC-RED | Alcantarillado — redes | alcantarillado, red sanitaria, pluvial, pozo de inspeccion, colector | 7215, 4017, 4018, 8110 | ml | excavación en zanja; entibado; tubería NOVAFORT; pozo de inspección; sumidero; conexión domiciliaria; prueba de estanqueidad |
| AGU-PTAP | PTAP y almacenamiento | ptap, planta de tratamiento de agua potable, tanque, bocatoma, desarenador | 7215, 8110, 4015 | global / m³ | bocatoma; desarenador; floculador; filtros; tanque en concreto; dosificación; caseta de cloración |
| ALC-PTAR | PTAR | ptar, aguas residuales, laguna de oxidacion, lodos activados | 7215, 7712, 8110 | global | tratamiento preliminar; reactor UASB; lechos de secado; emisario final; obras eléctricas |
| SAN-BAS | Saneamiento básico rural | unidad sanitaria, bateria sanitaria, pozo septico, sistema individual | 7214, 7215, 4017 | unidad | excavación; cimentación; mampostería; cubierta; aparatos sanitarios; pozo séptico prefabricado; campo de infiltración |
| EDI-EDU | Aulas y colegios | aula, colegio, institucion educativa, sede educativa, restaurante escolar | 7212, 7214, 7215 | m² construido | cimentación; estructura en concreto; mampostería; cubierta; pisos; carpintería; instalaciones hidrosanitarias y eléctricas; pintura |
| EDI-INST | Edificaciones institucionales | alcaldia, cdi, casa de la cultura, puesto de salud, estacion de bomberos | 7212, 7214, 7215 | m² construido | (los de EDI-EDU) + acabados especializados; aire acondicionado; redes de datos |
| EDI-VIS | Vivienda VIS y mejoramiento | vivienda, vis, vip, mejoramiento de vivienda, unidad habitacional | 7214, 7215 (†) | vivienda / m² | placa de contrapiso; muros; cubierta; enchapes; unidad sanitaria; cocina; instalaciones |
| DEP-POL | Polideportivos y canchas | polideportivo, cancha, coliseo, cubierta metalica, placa polideportiva | 7212, 7214, 7215 | m² | placa de concreto; estructura metálica; cubierta en teja; graderías; demarcación deportiva; iluminación |
| URB-PAR | Parques y espacio público | parque, espacio publico, anden, plazoleta, biosaludable, ciclorruta | 7214, 7215, 9512 | m² | demolición; andenes en concreto; sardineles; adoquín; mobiliario urbano; zonas verdes; juegos infantiles |
| ELE-RED | Redes eléctricas y alumbrado | electrificacion, alumbrado publico, luminaria, subestacion, red de media tension | 7215, 3911, 3912, 8110 | ml / unidad | poste de concreto; conductor ACSR; transformador; luminaria LED; puesta a tierra; retie |
| DRA-CAU | Dragado y limpieza de cauces | dragado, limpieza de cauce, canal, box coulvert, rectificacion | 7215, 7712 | m³ | dragado mecánico; retiro de material; conformación de taludes; disposición final |
| CON-EST | Consultoría, estudios y diseños | interventoria, estudios y disenos, consultoria, supervision tecnica | 8110, 8114, 8115, 8010 | mes / global | personal profesional; ensayos de laboratorio; topografía; estudios de suelos; costos indirectos |

\* *Las familias **5510** y **7213** NO están inscritas en los RUP de Helder ni de Génesis; se citan
solo como contexto del clasificador, nunca como evidencia de habilitación.*

† *Hallazgo con consecuencia comercial: la familia de construcción de edificaciones **residenciales**
(7213 en el clasificador, glosa [CONOCIDO] por confirmar) no aparece en ningún RUP. EDI-VIS no se
habilita por la vía UNSPSC de vivienda: entra por 7214/7215 (construcción pesada y oficios
especializados) o por la ruta de texto. Antes de presupuestar vivienda hay que decidir si se inscribe
esa familia en el próximo RUP o si la tipología se marca 🟡 por defecto.*

**Verificación de familias contra `lib/unspsc.js`** (conteo de clases inscritas, ejecutado sobre el
repositorio; `UNIÓN` es `FAMILIAS_UNION`, la que gobierna la admisibilidad de ingesta):

| Familia | Helder | Génesis | ¿En `FAMILIAS_UNION`? |
|---|---|---|---|
| 7212 | 6 | 6 | sí |
| 7213 | **0** | **0** | **no** |
| 7214 | 6 | 8 | sí |
| 7215 | 31 | 33 | sí |
| 9512 | 9 | 12 | sí |
| 4015 / 4017 / 4018 | 1 / 0 / 0 | 1 / 39 / 17 | sí |
| 8010 / 8110 / 8114 / 8115 | 3 / 4 / 2 / 3 | 3 / 10 / 2 / 0 | sí |
| 3010 / 3911 / 3912 | 9 / 2 / 10 | 12 / 5 / 9 | sí |
| 7712 | 1 | 2 | sí |
| 5510 | **0** | **0** | **no** |

Las familias con 0 en un perfil y >0 en el otro (4017, 4018, 8115) son exactamente el sitio donde el
consorcio vale: la unión habilita lo que ninguno de los dos solo.

### 2 · Clasificador en cascada

Tres niveles, con el mismo criterio que ya rige la app: **reglas auditables primero, nunca bloquear
por falta de información, poder decir «no sé»**.

**Nivel A — léxico determinista con puntaje.** Sobre `norm(nombre + descripción)`. Cada tipología
tiene tres listas: `ANCLAS` (peso 3), `APOYO` (peso 1), `EXCLUYE` (peso −4, con lookahead de
excepción igual que `transporte(?!\s+de\s+materiales)`). Puntaje

    P(t) = 3·|anclas(t) ∩ obj| + 1·|apoyo(t) ∩ obj| − 4·|excluye(t) ∩ obj|

y se exige además que el objeto tenga al menos un verbo de obra (`VERBOS_DE_OBRA_FUERTES` o un
condicionado con su ancla). Salida: ranking `[(t, P)]`, con `P1` el mejor y `P2` el segundo.

**Nivel B — UNSPSC como evidencia independiente.** No se mezcla con A: se calcula aparte usando
`codigosDeLicitacion` + `emparejar`, mapeando familia/clase → conjunto de tipologías compatibles
(la tabla de arriba, leída al revés). Es evidencia débil por diseño: 7215 y 7214 son compatibles con
casi todo, así que B rara vez decide solo; su valor real es **vetar** (un objeto clasificado VIA-PH
cuyo único código sea 4017/4018 es probablemente una red, no una vía).

**Nivel C — LLM de desempate, solo en la zona de duda.** Se invoca cuando y solo cuando
`P1 < 6`, o `P1 − P2 < 3`, o A y B son incompatibles. Entrada: objeto + catálogo de 22 tipologías;
salida estructurada obligatoria `{tipologia, confianza, evidencia_textual, alternativa}` con
`tipologia ∈ catálogo ∪ {"NO_DETERMINADA"}` y `evidencia_textual` como subcadena literal del objeto
(si no lo es, se descarta la respuesta). Ese contrato es lo que lo hace auditable.

**Estados de salida**, alineados con `evaluarPertinencia`. La tabla es **exhaustiva a propósito**:
igual que en `/api/diagnostico`, el conteo por estado debe sumar exactamente los procesos evaluados,
y para eso hace falta que ningún caso se quede sin fila.

| Estado | Condición | Qué se hace con el presupuesto |
|---|---|---|
| 🟢 verde | `P1 ≥ 8` **y** `P1−P2 ≥ 4` **y** B compatible | Se genera presupuesto paramétrico completo |
| 🟡 amarillo | `P1 ≥ 6` sin margen claro; **o** C responde con confianza media; **o** B ausente; **o** B **incompatible** con A aunque A tenga puntaje y margen altos; **o** `P1 < 6` con respuesta de C distinta de `NO_DETERMINADA` | Se genera **rango** (percentil 25–75 del histórico de la tipología), marcado «verificar pliego» |
| ⚪ no determinada | `P1 < 6` y C dice `NO_DETERMINADA`, **y cualquier otro caso no cubierto arriba** | **No se presupuesta.** Se muestra el objeto y se pide el pliego |
| 🔴 rojo | Reservado: el objeto ya murió en la cascada de pertinencia | No llega aquí |

Invariante que hay que probar, no suponer: `verde + amarillo + no_determinada = procesos evaluados`.
El falso positivo caro es 🟢 equivocado. Por eso el margen `P1−P2` es una condición *dura* y no un
promedio ponderado: dos tipologías empatadas nunca dan verde, aunque su puntaje absoluto sea alto.
Y por eso «B incompatible» degrada a 🟡 en vez de subir a verde: un veto de UNSPSC contra un léxico
convencido es exactamente la señal de que alguien tiene que leer el pliego.

### 3 · Catálogos estándar de ítems en Colombia

Sí existen, y el vial es de hecho un catálogo nacional.

| Fuente | Qué aporta | Etiqueta |
|---|---|---|
| **Especificaciones Generales de Construcción de Carreteras del INVÍAS, 2022** (Resolución 4561 del 29/11/2022), organizadas por capítulos de centena (100 generalidades, 200 explanaciones, 300 afirmados/subbases/bases, 400 pavimentos asfálticos, 500 pavimentos de concreto, 600 estructuras y drenajes, 700 señalización y seguridad…). Cada artículo define **descripción, materiales, ejecución, medida y forma de pago** | Clave primaria de la biblioteca vial | [PARCIAL] existencia y resolución verificadas por búsqueda: https://www.invias.gov.co/documentos/1531/especificaciones-generales-de-construccion-de-carreteras-2022/ — **títulos de capítulo, numeración de artículos y unidades de pago POR VERIFICAR contra el índice oficial**; el texto devolvió HTTP 403 |
| Artículos que se usarán como semilla: 200 desmonte y limpieza, 311 afirmado, 450 mezcla densa en caliente, 500 pavimento de concreto hidráulico, 600 excavaciones varias, 630 concreto estructural, 640 acero de refuerzo | Numeración + unidad de pago normalizada | [PARCIAL] numeración por búsqueda; **ninguna unidad de pago verificada contra el texto**. No transcribir de memoria |
| **Cartilla de Obras Menores de Drenaje y Estructuras Viales**, programa Colombia Rural, adoptada por **Resolución INVÍAS 2483 del 19/10/2020**. Trae diseños típicos de cunetas, filtros, alcantarillas, box culvert, muros y placa huella | La fuente más directa de *cantidades por metro lineal* de placa huella | [VERIFICADO] existencia y resolución: https://www.invias.gov.co/index.php/archivo-y-documentos/documentos-tecnicos/14788-cartilla-de-obras-menores-de-drenaje-y-estructuras-viales — contenido no abierto |
| **Proyectos Tipo del DNP** (proyectostipo.dnp.gov.co): placa huella, mejoramiento de vías terciarias, placa polideportiva cubierta, parque recreodeportivo, plaza de mercado, infraestructura educativa, biblioteca. Cada uno con presupuesto y APU indicativos | Semilla para las tipologías no viales — **[SUPUESTO, sin medir]** que cubre 8–10 de ellas; se sabrá al descargar los PDF | [VERIFICADO] existencia; PDFs no descargables desde este entorno (403) |
| **Resolución 0330 de 2017 (RAS)** del MVCT, vigente, modificada por la **Resolución 0844 de 2018** y la **Resolución 799 de 2021** | Parámetros de diseño de acueducto/alcantarillado (diámetros mínimos, pendientes, recubrimientos) que fijan los *parámetros abiertos* de los APU de red | [VERIFICADO] la 0330: https://minvivienda.gov.co/normativa/resolucion-0330-2017-0 — **[CONOCIDO]** los números de las dos modificatorias: confirmar en el Gestor Normativo antes de citarlas en un documento contractual |
| **Normas técnicas EAAB** (series NS-/NP-/ET-, consultables en SISTEC) y normas de construcción de **EPM** | Especificación de ítems de red por empresa prestadora; útiles para el sufijo regional | [VERIFICADO] existencia del catálogo EAAB; contenido no abierto |
| **NSR-10**, Decreto 926 de 2010 y sus modificaciones (2525/2010, 092/2011, 340/2012, 945/2017) | Fija resistencias, recubrimientos y cuantías mínimas de los ítems de edificación | [VERIFICADO] existencia; articulado no abierto |
| **Listas oficiales de precios unitarios departamentales** publicadas como datos abiertos (p. ej. Boyacá: `ae7u-y7m2` lista de precios fijos, `feht-feft` análisis de precios unitarios) | Precios y APU reales, en la **misma plataforma Socrata** que ya usa la app | **[SIN VERIFICAR]** — IDs tomados de referencias secundarias; **NO se pudo abrir datos.gov.co desde este entorno**. Comprobar los IDs antes de escribir código (ver Vacío 2) |
| **Sistema de precios unitarios de referencia del IDU** (SIIP Viales), actualizado en 2026 con los decretos salariales vigentes y con la reducción gradual de jornada de la Ley 2101 de 2021 | Precios urbanos con trazabilidad de fecha | [PARCIAL] existencia por búsqueda; página no abierta; fecha exacta de la última actualización sin confirmar |
| **DANE — ICOCIV** (índice de costos de la construcción de obras civiles, sustituye al ICCP) e **ICOCED** (índice de costos de la construcción de edificaciones, sustituye al ICCV) | Deflactores para llevar cualquier precio histórico a pesos de hoy | [CONOCIDO] la sustitución de las series antiguas; **verificar periodicidad, año base y desagregación vigentes** en el portal del DANE antes de usarlos |

**Numeración INVÍAS como clave primaria.** `codigo_item = "INV-" + artículo + "-" + variante`
(`INV-630-21MPA`, `INV-640-420`, `INV-450-MDC19`). Es la clave con que las entidades escriben sus
propios formularios de cantidades —el emparejamiento contra el pliego real deja de ser difuso— y la
unidad de pago viene dada por el artículo. Lo no vial cuelga de espacios paralelos: `RAS-`, `NSR-`,
`PT-` (Proyecto Tipo) y `LOC-` para el ítem no normalizado. Regla dura: **nunca inventar un código
INV que no exista**; si no hay artículo, el ítem nace `LOC-`. Corolario que aplica a esta misma
sección: mientras el índice oficial no se haya abierto, cada número de artículo escrito arriba es una
hipótesis a confirmar, no una clave publicable.

### 4 · Biblioteca de APU parametrizados

La idea central: entre dos placas huella de municipios distintos **no cambia la composición del
APU** — cambian las cantidades de obra y unos pocos parámetros (espesor, resistencia, diámetro,
distancia de acarreo, altura de zanja). **[SUPUESTO, sin medir]** el tamaño de la biblioteca:
200–400 APU tipo. Es una estimación de esfuerzo, no una cobertura medida; la cobertura real se
conocerá al correr el Nivel A sobre el histórico (Vacío 3).

**Esquema de datos** (tres colecciones + una de precios):

| Colección | Campo | Tipo | Nota |
|---|---|---|---|
| `item` | `codigo_item` | string PK | `INV-630-21MPA` |
| | `articulo_invias` | string\|null | `630` |
| | `descripcion` | string | |
| | `unidad` | enum | m, m2, m3, kg, ton, un, gl, día |
| | `tipologias` | string[] | tipologías que lo usan |
| | `parametros` | objeto | ver abajo |
| | `fuente` | enum | invias / cartilla_2483 / proyecto_tipo / ras / local |
| `composicion` | `codigo_item` + `codigo_insumo` | PK compuesta | |
| | `tipo` | enum | material / mano_obra / equipo / transporte |
| | `cantidad_por_unidad` | number | materiales: por 1 unidad de obra. Mano de obra y equipo: **composición de cuadrilla por día**, se divide por el rendimiento |
| | `unidad_insumo` | string | kg, m3, hora, día |
| | `desperdicio_pct` | number | 0–15 |
| `rendimiento` | `codigo_item` | FK | |
| | `cuadrilla` | objeto | `{oficial:1, ayudante:4}` |
| | `rendimiento_dia` | number | unidades de obra / día |
| | `jornada_horas` | number | horas efectivas por **día** de trabajo (8 por defecto) |
| `insumo` | `codigo_insumo`, `descripcion`, `unidad`, `precio`, `fecha_precio`, `fuente_precio`, `departamento` | | el precio **siempre** con fecha y fuente |

**Sobre `jornada_horas` y la reducción de jornada.** Son dos cosas distintas y confundirlas es un
error de costo. `jornada_horas` es la jornada **diaria** efectiva (8 h por defecto) y es la que
convierte rendimientos horarios en rendimientos por día. La Ley 2101 de 2021 reduce la jornada
**semanal** de forma gradual —47 h, 46 h, 44 h y **42 h desde el 15 de julio de 2026**
([CONOCIDO]; confirmar la fecha exacta de entrada en vigor del último escalón en el Gestor Normativo
antes de fijar un jornal)—. El salario mensual no baja con esa reducción: lo que cambia es el número
de días u horas trabajadas por semana, y por tanto **sube el costo por hora efectiva y el costo
semanal de la cuadrilla**. `rendimiento_dia` no hay que recalcularlo; lo que hay que ajustar es el
costo semanal de la cuadrilla y el factor prestacional que lo acompaña.

`parametros` son las variables abiertas que el clasificador o el pliego rellenan:
`{espesor_m, resistencia_mpa, diametro_mm, distancia_acarreo_km, altura_zanja_m, tipo_terreno}`.
El APU se evalúa como

    APU(item, p) = Σ_insumos  [ cant(i,p) · (1 + desp_i) · precio_i ]
                 + ( Σ_cuadrilla [ n_j · jornal_j ] + Σ_equipo [ n_k · tarifa_dia_k ] ) / rendimiento(item, p)
                 + herramienta_menor( %  · MO )
                 + transporte(p)

Los tres términos de la derecha son los que se olvidan y los que descuadran un presupuesto: el
equipo se divide por el rendimiento igual que la mano de obra (una mezcladora no se alquila por m³,
se alquila por día), la herramienta menor es un porcentaje de la mano de obra, y el acarreo depende
de `distancia_acarreo_km`, que es un parámetro abierto y no una constante. El presupuesto es
`Σ_items cantidad_item · APU_item`, más **AIU declarado aparte** — nunca embebido en el APU.

**Ejemplo desarrollado — `INV-630-21MPA`, concreto de f'c = 21 MPa (≈3000 psi) para huella de placa
huella, unidad m³.** **La clase INVÍAS del Artículo 630 correspondiente está POR VERIFICAR contra la
Tabla 630.1** — no se escribe la letra hasta abrir la especificación, exactamente por la misma regla
que prohíbe inventar códigos INV. Todas las cifras son **ILUSTRATIVAS** [INCIERTO]: fijan órdenes de
magnitud y la forma del dato, no precios de mercado ni un diseño de mezcla.

| Insumo | Tipo | Cantidad | Unidad | Desperdicio | Nota |
|---|---|---|---|---|---|
| Cemento gris tipo UG | material | 7,0 / m³ | saco 50 kg | 3 % | cantidad ilustrativa; la dosificación real la fija el diseño de mezcla del laboratorio, no una regla de volumen |
| Arena de río lavada | material | 0,55 / m³ | m³ | 5 % | |
| Triturado 3/4" | material | 0,85 / m³ | m³ | 5 % | |
| Agua | material | 180 / m³ | L | 0 % | |
| Oficial de obra | mano de obra | 1 / día → 0,125 jornal/m³ | jornal | — | cuadrilla 1 oficial + 4 ayudantes |
| Ayudante | mano de obra | 4 / día → 0,500 jornal/m³ | jornal | — | |
| Mezcladora 1 saco | equipo | 1 / día → 0,125 día/m³ | día | — | |
| Vibrador de concreto | equipo | 1 / día → 0,125 día/m³ | día | — | |
| Herramienta menor | equipo | 5 % de la MO | — | — | porcentaje sobre el costo de mano de obra ya dividido por el rendimiento |

La columna «Cantidad» dice las dos cosas a la vez a propósito: **materiales por m³; mano de obra y
equipo como composición de cuadrilla por día**, y a su lado el valor ya dividido por el rendimiento
ILUSTRATIVO de 8 m³/día (⇒ 0,125 día/m³). Leer «1 día de mezcladora por m³» sería multiplicar por 8
el costo de equipo, que es el error clásico de quien copia una tabla de cuadrilla a una columna de
cantidades unitarias.

Ítems hermanos que completan la placa: `INV-640-420` acero figurado 420 MPa (kg, con alambre de
amarre ≈ 3,5 % del peso del acero, [CONOCIDO]), `LOC-FORM-PH` formaleta metálica (m² de contacto,
con número de usos), `INV-311-AFIRM` afirmado y `LOC-PIEDRA-PEG` piedra pegada de la franja central.
**Hay que leer en la Cartilla 2483 el módulo típico de losa y las cantidades por metro lineal de
placa huella — no están verificadas aquí y no deben usarse de memoria.** Esa es la tabla que hay que
transcribir, no estimarla.

### 5 · Cantidades: las tres vías

| Vía | Cómo | Cobertura | Precisión esperada | Etiqueta |
|---|---|---|---|---|
| (a) NLP sobre el objeto | Regex sobre `norm` | **[SUPUESTO, sin medir]** 25–40 % de los objetos traen alguna magnitud. Se mide corriendo el regex sobre los objetos ya en Redis y publicando el porcentaje en `/api/diagnostico` | **[SUPUESTO]** ±10 % si la magnitud es la principal; el riesgo real es que sea accesoria («3,5 km de vía» vs «tanque de 50 m³»). Sin base empírica: se fija tras el primer backtest | diseño propio |
| (b) Formulario de cantidades del pliego | Descargar el anexo desde `urlproceso` y parsear el Excel/PDF | Depende del acceso al SECOP II documental (ver sección de pliegos) | ±0 % **respecto de las cantidades que se cotizan**; NO respecto de las ejecutadas | ver sección pliegos |
| (c) Ingeniería inversa desde la cuantía | `cantidad ≈ cuantía / ratio de la tipología en ese departamento y año` | **= % de procesos con `cuantia_cop > 0`; sin medir todavía** (medible hoy sobre el corpus en Redis) | **[SUPUESTO]** ±30–50 %; sin base empírica hasta el backtest | ver abajo |

**Regla dura sobre la cuantía.** `cuantia_cop === 0` significa **SIN DATO**, no cero pesos:
`lib/negocio.js` la rellena con `primerNumero(lic, CUANTIA_CAMPOS) || 0`, y `api/resumen.js` ya
cuenta esos procesos aparte en `descartadosDestacados.sin_cuantia`. Esas filas se **excluyen** del
cálculo de ratios y devuelven `cantidad = null`. Dividir por un ratio una cuantía que en realidad es
«no sé» produce una cantidad 0 presentada como dato, que es justo el defecto que el proyecto ya
cerró dos veces (`|| 0` sobre un conteo).

**(a) — patrón sobre texto normalizado:**

    (?<![\d.,])(\d{1,3}(?:\.\d{3})+(?:,\d+)?|\d+(?:,\d+)?)\s*
    (km|kms|kilometros?|ml|metros?\s+lineales?|m2|mts2|metros?\s+cuadrados?|
     m3|metros?\s+cubicos?|ha|hectareas?|und?|unidades?|viviendas?|aulas?)\b

Tres detalles que no son cosméticos: el **lookbehind** `(?<![\d.,])` impide que el motor reenganche a
mitad de un número (sin él, «1500 km» captura 500 — error de factor 3, silencioso); la alternancia
separa el número con separador de miles del número plano, porque `\d{1,3}(?:[.\s]\d{3})*` no admite
enteros de 4+ dígitos sin separador; y el `\b` final evita que «und» case dentro de otra palabra.

**Pruebas de regresión obligatorias** (verificadas contra esta expresión):

| Entrada | Salida esperada |
|---|---|
| `1500 km` | 1500 |
| `1.500 ml` | 1500 |
| `3,5 km` | 3,5 |
| `12 kilometros` | 12 |
| `contrato 2024-350 placa huella` | sin captura |

Y dos reglas obligatorias más: **decimal colombiano** (punto = miles, coma = decimal — invertirlo
multiplica por 1000), y **atribución**, es decir aceptar la magnitud solo si aparece a ≤ 6 palabras
de un término ancla de la tipología asignada. Sin la regla de atribución, «CONSTRUCCIÓN DE PLACA
HUELLA EN LA VEREDA X, CONTRATO 2024-350» produce 2024 km.

**(c) — dos series de ratios, no una.** El corpus histórico de la app sirve para las dos:
`licitaciones:historico:mes:*` no lo purga nada, y `lib/proyeccion.js` conserva ahí los campos de
adjudicación. Pero **presupuesto oficial y valor adjudicado son magnitudes distintas** y mezclarlas
es confundir el techo con el precio de mercado:

    ratio_directo[t][dpto][año]    = mediana( cuantia_cop / (1 + AIU_supuesto) / cantidad )
    ratio_adjudicado[t][dpto][año] = mediana( valor_adjudicado / (1 + AIU_supuesto) / cantidad )

- `cuantia_cop` sale de `CUANTIA_CAMPOS` (`precio_base` y hermanas) y es el **presupuesto oficial**:
  incluye AIU y el IVA sobre la utilidad. Sirve para **dimensionar la oportunidad**.
- `valor_adjudicado` sale de `CAMPOS_VALOR_ADJUDICADO` (`valor_total_adjudicacion`,
  `valor_adjudicado`, `valor_adjudicacion`) del histórico, y refleja la baja de la adjudicación.
  Sirve para **estimar el precio al que se gana**, que es la pregunta comercial.
- `AIU_supuesto` es un **parámetro explícito, no una constante escondida**. Valor por defecto
  propuesto: **0,25 (25 %)** — **[SUPUESTO a calibrar]**, no un dato: el AIU real varía por tipología
  y por entidad y a veces viene declarado en el pliego. Cuando el pliego lo declare, ese valor manda
  sobre el supuesto y queda registrado en el dato.
- **Mínimo muestral, coherente con `MIN_PROCESOS = 5` del índice de competencia**: con menos de 5
  tuplas `(t, dpto, año)` el ratio es `null` y la cantidad **no se estima**. Un ratio con 2 procesos
  no es una mediana, es una anécdota.
- **Deflactar antes de mezclar años**: ICOCIV para las tipologías de obra civil, ICOCED para las de
  edificación (EDI-\*, DEP-POL). Cada valor deflactado guarda **qué índice y qué mes base** se usó;
  sin eso el número no se puede auditar ni rehacer.

**No se dispone de una referencia externa verificada de COP/km.** Las cifras de prensa técnica que
circulan sobre costo por kilómetro de vía terciaria difieren entre sí en un factor 2 y ninguna
declara año, tipología exacta (placa huella vs. afirmado vs. pavimento), ancho de calzada, terreno ni
si incluyen AIU — sin esos cuatro datos no son comparables ni deflactables. La referencia válida es
la que salga del propio histórico (`ratio_directo` / `ratio_adjudicado` por tipología, departamento y
año), y hasta tenerla **no debe usarse ninguna cifra de prensa** como contraste. Regla de higiene que
sí se mantiene: si (c) contradice a (a) en más de un factor 2, el resultado baja a 🟡 y se muestran
las dos cifras, nunca una sola.

**Contraste con el presupuesto oficial.** Generar un presupuesto no sirve de nada si no se compara
con lo que la entidad puso sobre la mesa. Regla de salida:

    holgura = presupuesto_generado / cuantia_cop     (solo si cuantia_cop > 0)

Si `holgura > 1`, el presupuesto propio ya supera el techo oficial: el proceso se **marca** y no se
recomienda, porque presentarse implicaría trabajar por debajo del costo estimado. Si
`cuantia_cop === 0` no hay contraste posible y la salida es «sin dato», nunca «holgura 0». La
holgura se muestra siempre junto a las dos cifras que la producen, no sola.

**Caso aparte: CON-EST no se costea por APU.** La interventoría, la consultoría y los estudios en
Colombia se cotizan por **factor multiplicador sobre el sueldo básico del personal** (más costos
directos: ensayos de laboratorio, topografía, transporte, equipos), no por análisis de precios
unitarios, y **el AIU no aplica**. Presupuestar esa fila con la maquinaria de APU produce un
documento con la estructura equivocada aunque el total se parezca. Su esquema es otro:
`{cargo, dedicacion_pct, meses, sueldo_basico, factor_multiplicador}` + costos directos.

### 6 · Técnicas de NLP: qué usar y para qué

| Enfoque | Uso recomendado | Coste | Verificabilidad | Veredicto |
|---|---|---|---|---|
| Reglas + diccionario (lo que ya hay) | Nivel A del clasificador y extracción de cantidades | ~0; <1 ms/proceso; sin dependencias | Total: se lee la regla que disparó | **Base obligatoria** |
| TF-IDF por familia (`lib/texto_unspsc`) | Hoy en el repo hay una **semilla curada a mano**; la derivación TF-IDF existe pero no se ha ejecutado. Se extiende a TF-IDF **por tipología**, mezclado con semilla, exactamente como el vocabulario de familia | ~0, se construye con el mismo endpoint reanudable | Alta: los términos que sumaron son inspeccionables | **Extensión natural, primera a construir** |
| k-NN sobre objetos (TF-IDF coseno, o embeddings) | Estimar cantidad/precio por analogía: los *k* vecinos históricos más parecidos y su ratio | TF-IDF: gratis. Embeddings: requiere API + almacenar vectores, rompe el «sin dependencias» | Media-alta: se muestran los 5 vecinos con su objeto y su valor — el dueño juzga el parecido | **Sí con TF-IDF**; embeddings solo si el coseno léxico se queda corto |
| LLM con salida estructurada | Desempate del Nivel C y lectura del formulario de cantidades del pliego | ~1 llamada por proceso dudoso; el coste real es la latencia en `/api/oportunidades` | Baja si no se exige evidencia; aceptable con `evidencia_textual` literal verificable | **Sí, acotado y fuera de la ruta caliente** (precalcular y cachear por `_k`) |

Doctrina heredada que esta capa no puede romper: **no bloquear por falta de información** (un objeto
sin tipología sigue apareciendo en `/api/oportunidades`, solo que sin presupuesto), **una sola
definición por concepto** (la tipología se calcula en un único módulo y los tres consumidores la
leen de ahí, como pasó con `claveCanonica`), y **ningún `|| 0` sobre una cantidad**: una cantidad
desconocida es `null` y se pinta como «sin dato», jamás como cero. Lo mismo vale para la cuantía, el
ratio y la holgura.

#### Vacíos y siguiente paso

1. **Texto de los artículos INVÍAS y de la Cartilla 2483 no verificado.** Todos los intentos de
   descarga (invias.gov.co, findeter, gerconcesion, DNP, EAAB, IDU, dev.socrata, mintrabajo,
   funcionpublica) devolvieron **HTTP 403** desde este entorno. Se confirmó la existencia de los
   documentos y de las resoluciones (4561/2022 y 2483/2020); **no** los títulos de capítulo, **no**
   la numeración de artículos, **no** las unidades de pago. Siguiente paso: descargar los PDF desde
   una red sin restricción y transcribir a mano la tabla artículo → unidad de pago (≈150 filas) y
   las cantidades por metro lineal de placa huella. Hasta entonces, ningún `codigo_item` INV se
   publica como definitivo.
2. **Precios: ninguno verificado, y los IDs de dataset tampoco.** Las cifras del APU de ejemplo son
   ilustrativas. Comprobación exacta antes de escribir una línea de código, desde una red sin
   restricción: abrir `https://www.datos.gov.co/resource/feht-feft.json?$limit=1` y
   `https://www.datos.gov.co/resource/ae7u-y7m2.json?$limit=1`. Si devuelven **404**, buscar el
   dataset por nombre en el catálogo de datos abiertos antes de integrar nada. Si responden, la app
   puede consumirlos con el cliente que ya tiene —
   `GET /resource/feht-feft.json?$select=:id,*&$order=:id&$limit=1000` y keyset por `:id`,
   exactamente el patrón de `lib/socrata.js`— tras confirmar el esquema de columnas.
3. **Cobertura real del catálogo.** No se pudo medir qué porcentaje del corpus cae en las 22
   tipologías, ni qué porcentaje de objetos trae una magnitud legible, ni qué porcentaje tiene
   `cuantia_cop > 0`. Siguiente paso: correr el Nivel A y el regex de (a) sobre el corpus ya en Redis
   y publicar los tres repartos en `/api/diagnostico`, con la invariante de siempre — los conteos por
   tipología más `NO_DETERMINADA` deben sumar exactamente los procesos evaluados.
4. **Cantidades desde el pliego.** Depende de si la URL de `urlproceso` permite descarga directa del
   anexo; no verificado aquí. De ello depende que la vía (b), la única exacta, sea viable.
5. **Parámetros laborales.** La reducción de jornada de la Ley 2101 de 2021 es [CONOCIDO] en su
   gradualidad (47/46/44/42 h) y el último escalón se sitúa en julio de 2026, pero **la fecha exacta
   de entrada en vigor y el efecto cuantificado sobre el costo semanal de la cuadrilla no se
   verificaron**. Siguiente paso: confirmar la ley en el Gestor Normativo y recalcular el factor
   prestacional y el costo/hora efectiva antes de fijar cualquier jornal.
6. **Validación del presupuesto generado — sin esto, nada de esta capa decide dinero.** Separar N
   procesos ya adjudicados con presupuesto oficial conocido (los hay en `licitaciones:historico:mes:*`),
   generar el presupuesto automático para cada uno y publicar el **error absoluto medio por
   tipología**, contra `cuantia_cop` y contra `valor_adjudicado` por separado. Mientras ese número no
   exista, el presupuesto automático es una ayuda de lectura y así hay que presentarlo en pantalla:
   ninguna cifra de esta capa puede usarse para decidir una oferta.


---

## 1.E — Ajuste por mercado y estrategia de precio competitivo

Un APU correcto dice **cuánto cuesta hoy y aquí**. Esta capa hace dos cosas distintas que suelen
confundirse: primero **actualizar ese costo al mercado y a la fecha de la oferta** (§0), y después
decidir **cuánto se oferta** (§2 en adelante), que es un problema de juego contra otros oferentes
bajo un criterio de adjudicación que **se sortea el día de la evaluación**.

### Fuentes de esta sección

Etiquetas usadas, sin excepción:

- **[VERIFICADO]** — se abrió la fuente primaria y se leyó lo que aquí se afirma.
- **[CITADO EN SECUNDARIAS — PDF NO ABIERTO]** — aparece en documentos y páginas que citan el
  pliego, pero **no** se leyó el pliego. No es verificación: es rumor bien documentado.
- **[CONOCIDO]** — conocimiento sólido del dominio, no confirmado en esta sesión.
- **[INCIERTO]** / **[SUPUESTO — no calibrado]** — lo que dice la etiqueta.

| Fuente / afirmación | Etiqueta | Nota |
|---|---|---|
| Set de métodos de ponderación económica y rangos de TRM (§2) | **[CITADO EN SECUNDARIAS — PDF NO ABIERTO]** | En este entorno todo `WebFetch` a `colombiacompra.gov.co` y a los PDF citados devolvió **403**. La tabla de §2 debe leerse del pliego del proceso concreto antes de usarla. |
| Regla de selección del método por los **dos primeros decimales de la TRM**, y el **día** al que se toma esa TRM | **[CITADO EN SECUNDARIAS — PDF NO ABIERTO]** | El mecanismo (TRM → método) es estándar; **el día NO es universal** (ver §2). |
| Uso relativo de fórmulas observado (42 % media aritmética, 30 % media geométrica con PO, 14 % media aritmética alta, 6 % menor valor, 4 % precio base, 4 % otros) | **[CITADO EN SECUNDARIAS — PDF NO ABIERTO]** | Muestra de un estudio de caso regional, **no** estadística nacional. No extrapolar. |
| *Fórmulas de selección económica de contratistas en adjudicación de obras de infraestructura vial: estudio de caso Valle del Cauca, Colombia*. **Entre Ciencia e Ingeniería**, vol. 12, n.º 24 (2018), pp. 60-67 (espejo en SciELO Colombia, pid `S1909-83672018000200060`) | **[CITADO EN SECUNDARIAS — PDF NO ABIERTO]** | El texto completo no se abrió (403). La cifra anterior sale de resúmenes que lo citan. |
| Documentos Tipo de obra pública de infraestructura de transporte (versión vigente), portal CCE — `https://www.colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo` | **[CITADO EN SECUNDARIAS — PDF NO ABIERTO]** | El número de resolución y la versión vigente **deben leerse en el portal**: cambian y aquí no se pudieron confirmar. |
| Art. 2.2.1.1.2.2.4 D. 1082/2015 — oferta con valor artificialmente bajo | **[CONOCIDO]** | Obliga a **requerir explicación**; **no fija umbral numérico** y permite que la oferta continúe en el proceso. |
| `precio_base` = presupuesto oficial en `p6dx-8zbt` | **[CONOCIDO]** | Ya está en `lib/proyeccion.CAMPOS`. Verificar contra filas reales (ver «Vacíos»). |
| `CAMPOS_VALOR_ADJUDICADO`, `numero_de_lotes`, `oferentesDe`, `esAdjudicado` | **[VERIFICADO en el repo]** | `lib/indice_competencia.js`; `numero_de_lotes` ya viaja en `CAMPOS_ADJUDICACION`. |
| Índices de costos de construcción del DANE (nombre exacto de la serie vigente) | **[INCIERTO]** | Ver §0 y «Vacíos». |
| Existencia de un dataset abierto con **ofertas perdedoras** | **[INCIERTO]** | Ver «Vacíos». |

---

### 0. Ajuste del APU al mercado, antes de decidir el precio

Esta subsección va **antes** de toda la teoría de subasta porque una parte de la baja observada en el
mercado no es agresividad comercial: es que el presupuesto oficial estaba desactualizado o
sobreestimado desde el día en que se publicó.

#### (a) Vigencia del presupuesto oficial y traslado por índice

Un PO se estructura con precios de una fecha `t0` y el proceso se publica en `t1`, típicamente
**6 a 12 meses después** [CONOCIDO]. Entre las dos fechas los insumos se movieron. Consecuencias:

- Si los precios **subieron** entre `t0` y `t1`, el PO está *corto* y la baja realizable es menor de
  lo que sugiere `B̂` histórico: parte del margen ya se lo comió la inflación de insumos.
- Si el PO se estructuró con precios de lista (no de negociación) o con un AIU generoso, hay holgura
  real y `B` bajos no significan pérdida.

Regla operativa:

```
C_actualizado(t1) = C_APU(t0) · [ I(t1) / I(t0) ]      (por capítulo, no global)
```

**Advertencia que no se puede omitir: un índice mide VARIACIÓN, no NIVEL.** `I` sirve para trasladar
un precio propio de una fecha a otra; **no** dice si el precio de partida era correcto ni cuál es el
precio de mercado hoy. El nivel solo sale de cotizaciones. Usar un índice para «calcular» un precio
de mercado desde cero es un error de método.

| Insumo del ajuste | Qué aporta | Estado |
|---|---|---|
| Índice de costos de construcción del DANE (serie de obras civiles / infraestructura vial) | Traslado temporal por capítulo (movimiento de tierras, concretos, asfaltos, acero) | **[INCIERTO]** — el DANE ha renombrado y reemplazado estas series (familia ICCV/ICCP y sus sucesoras). **No usar un nombre de serie de memoria**: entrar a `dane.gov.co`, sección de índices de costos de la construcción, y fijar en el repo el código exacto de la serie y su periodicidad |
| IPC total | Solo como respaldo grueso cuando no hay serie sectorial | [CONOCIDO] — subestima la variación del acero y del asfalto |
| SMMLV del año | Mano de obra y prestaciones; **SMMLV 2026 = $1 750 905** (ya en `lib/perfiles.js`) | [VERIFICADO en el repo] |
| Cotizaciones propias por capítulo | Único insumo que da **nivel** | Manual, por proceso |

Aplicación mínima viable en la app: mostrar junto al proceso la **antigüedad del PO**
(`fecha_de_publicacion_del` frente a la fecha del estudio previo cuando conste) y una advertencia
textual cuando supere los 6 meses. Sin serie de índice cargada, **no** se muestra ningún factor
numérico: se muestra la antigüedad y se dice que el ajuste es manual.

#### (b) Diferencial regional: transporte y disponibilidad de materiales

Dos obras idénticas en Bogotá y en un municipio a 4 horas de la planta más cercana no cuestan lo
mismo, y el PO de la entidad puede haberse copiado de una lista de precios de otra región
[CONOCIDO]. Componentes a revisar antes de aceptar el `B̂` de la celda:

| Componente | Efecto típico | Cómo se aterriza |
|---|---|---|
| Transporte de materiales pétreos y concreto | El más sensible a la distancia; a partir de cierto radio obliga a planta propia o a concreto en sitio | Distancia real a la fuente de materiales autorizada, no a la cabecera |
| Asfalto y cemento | Precio de planta + flete; el flete puede superar el 20 % del insumo puesto en obra en zonas alejadas [INCIERTO — verificar con cotización] | Cotización puesta en obra, nunca precio de planta |
| Mano de obra local | Puede ser más barata en salario y más cara en rendimiento | Rendimientos del APU, no solo jornales |
| Acceso, orden público, altura, régimen de lluvias | Afectan rendimiento y tiempos muertos | Factor de rendimiento por capítulo |

Por eso el `B̂` de §1 se estima **por celda con componente geográfico** (`departamento × tipología`)
y no solo por entidad: el diferencial regional ya está incorporado, de forma implícita, en la baja
histórica de esa geografía.

#### (c) Fórmula de reajuste del contrato: quién asume la variación durante la ejecución

Antes de decidir el precio hay que saber si el contrato **reajusta** o es a precio firme
[CONOCIDO]:

- **Con fórmula de reajuste** (habitual en obra vial de plazo largo): la variación de insumos durante
  la ejecución la absorbe, al menos en parte, la entidad. El riesgo de precio del contratista baja y
  se puede ofertar más ajustado.
- **A precio firme / sin reajuste**: toda la variación futura es del contratista. Hay que **cargarla
  al APU como contingencia**, no descubrirla en el mes 8.

Regla para la app: el reajuste **no está en datos abiertos**; vive en la minuta y en el pliego. La
app debe listarlo como pregunta obligatoria de la lista de chequeo del proceso, y `P_piso` debe
calcularse en el escenario **sin reajuste** mientras no conste lo contrario — que es el conservador
en la dirección correcta (§6 explica por qué la dirección importa).

---

### 1. Factor de baja de mercado (B)

Definición: **B = valor_adjudicado / presupuesto_oficial**, con `b = 1 − B` la *baja*. Es la única
métrica de precio que el corpus histórico ya permite calcular sin ingerir nada nuevo.

| Variable | Campo del corpus | Dónde vive | Riesgo |
|---|---|---|---|
| Presupuesto oficial | `precio_base` | activo + histórico | Puede ser «valor estimado» y no el PO del pliego |
| Valor adjudicado | `CAMPOS_VALOR_ADJUDICADO` (`valor_total_adjudicacion`, `valor_adjudicado`, …) | **solo histórico** | Puede agregar lotes |
| Nº de lotes | `numero_de_lotes` | solo histórico | Si > 1, **B no es comparable**: excluir |
| Nº de oferentes | `oferentesDe(lic)` | solo histórico | `null` = sin dato, nunca 0 |
| Entidad | `claveCanonica(entidad)` | ambos | Reusar la clave única, no inventar otra |

**Verificación de base antes de dividir.** `B` solo significa algo si numerador y denominador están
en la **misma base**: ambos con IVA o ambos sin IVA, ambos con AIU o ambos sin AIU, y ambos sobre el
**mismo alcance** (mismo número de lotes, sin adiciones posteriores). Un PO sin IVA dividido por un
valor adjudicado con IVA produce `B > 1` sin que nadie haya ofertado por encima del techo. Por eso
el saneamiento de abajo **no es cosmético**: es la prueba de que la base coincide.

**Celdas de estimación**, de la más específica a la más general — y en ese orden se encoge:
`entidad × tipología` → `entidad` → `departamento × tipología` → `modalidad × rango de cuantía` →
`global`. La tipología sale de la **familia UNSPSC** del código principal (`lib/unspsc` ya deduce el
nivel); el rango de cuantía, en **deciles logarítmicos del PO**, porque la baja se comporta distinto
en un proceso de 200 SMMLV que en uno de 20 000.

Reglas de honestidad, calcadas de las que ya rigen el índice de competencia:

- **Mediana y percentiles, nunca media.** La distribución de B es asimétrica y con cola izquierda
  larga. Se publican `p05, p25, p50, p75` y el **IQR** como medida de dispersión.
- **Mínimo de muestra n ≥ 5** por celda, igual que `MIN_PROCESOS`. Por debajo: **`sin_dato`**, y
  `sin_dato` no es «B = 1»; es ausencia de recomendación de precio.
- **Encogimiento hacia el padre** cuando la celda es chica:
  `B̂ = (n/(n+k))·p50_celda + (k/(n+k))·B̂_padre`, con **`k ≈ 10` pseudo-observaciones
  [SUPUESTO — no calibrado]**. Con n=5 el peso propio es 33 %; con n=30, 75 %. *Calibración:*
  validación cruzada del error de predicción de `B` por celda (dejar fuera un proceso, predecir su
  `B`, barrer `k` y quedarse con el que minimiza el error absoluto mediano). Si el padre entero está
  por debajo del mínimo, se sube otro nivel; si el global tampoco alcanza, `sin_dato` y punto.
- **Desiertos**: un proceso sin adjudicación **no aporta a B** (no hay numerador) pero sí es
  información: se cuenta aparte como `tasa_desierta` de la celda. Una entidad con desiertos altos
  suele tener presupuestos apretados o requisitos duros — señal de oportunidad y de riesgo a la vez.
- **Bajas agresivas: se reportan, NO se excluyen.** Se publica aparte la fracción de la celda con
  `B < p05` como **medida de agresividad del mercado**, pero esos procesos **sí entran** en la
  mediana y en los percentiles. La razón es estructural: el corpus histórico contiene únicamente
  ofertas **adjudicadas**, es decir ofertas que la entidad **no rechazó**. Si una baja del 45 % está
  en el histórico, es porque se aceptó; borrarla es borrar la evidencia de a qué precio se cierra
  realmente ese mercado, y sesga toda la recomendación hacia arriba.
  Precisión jurídica: **el art. 2.2.1.1.2.2.4 no define un umbral de precio artificialmente bajo**;
  obliga a **requerir explicación** al oferente y permite que, con explicación satisfactoria, la
  oferta **continúe** en el proceso [CONOCIDO]. Cualquier umbral tipo `B < 0.60` es **una convención
  propia, no una norma** — **[SUPUESTO — no calibrado]** — y por eso solo se usa para *etiquetar y
  mostrar*, jamás para filtrar el cálculo.
- **Saneamiento duro (problemas de base, no de precio)**: `B ≤ 0` y `B > 1.05`
  **[SUPUESTO — no calibrado]** se descartan como basura y se cuentan en la meta. El techo de 1.05
  se calibra **por inspección manual de 20 procesos con `B > 1`**: si son adiciones, lotes agregados
  o distinta base de IVA, el umbral está bien puesto y lo que hay que arreglar es la base; si son
  procesos limpios, el umbral está mal. Mientras no se inspeccione, la app muestra el conteo de
  descartados junto al `B̂`, no lo esconde.

---

### 2. Modelos de adjudicación: el punto que cambia toda la estrategia

En obra pública colombiana **el precio más bajo no gana casi nunca**. El factor económico se pondera
con un método que se escoge **al azar**, a partir de los dos primeros decimales de la TRM. Ni la
entidad ni los oferentes pueden conocerlo al presentar la oferta: ese es el diseño.

#### El set de métodos NO es único: hay que leerlo del pliego

**[NO VERIFICADO — pendiente de abrir el PDF del pliego tipo vigente]**

Set de **cuatro** métodos con rangos de **0.25**, que es el del pliego tipo de obra pública de CCE
tal como aparece citado en fuentes secundarias:

| Rango TRM | Método | Quién gana | Postura |
|---|---|---|---|
| 0.00–0.24 | Media aritmética | El más cercano al promedio de las ofertas válidas | **Centro** |
| 0.25–0.49 | Media aritmética **alta** | El más cercano al promedio de las ofertas **por encima** de la media | **Alto** |
| 0.50–0.74 | Media geométrica **con presupuesto oficial** (el PO entra un número de veces que depende del número de ofertas válidas) | El más cercano a una media *tirada hacia arriba* por el PO | **Centro-alto** |
| 0.75–0.99 | **Menor valor** | El más barato | **Agresivo** |

**Advertencia obligatoria — el set y la nomenclatura CAMBIAN entre documentos.** Los Documentos Tipo
de obra pública de **infraestructura de transporte** (v4) también traen **cuatro** alternativas, pero
con **otra nomenclatura**: *mediana con valor absoluto*, *media geométrica con presupuesto oficial*,
*media aritmética baja* y *menor valor*. No es el mismo catálogo, y una tabla que mezcle ambos es
sencillamente falsa. **La tabla aplicable es la del pliego de cada proceso** y la app debe pedir que
se lea, no ofrecer una tabla universal.

**Advertencia sobre el día de la TRM.** El día al que se toma la TRM **varía por pliego**: la
variante «día hábil anterior a la publicación del informe de evaluación» es la del pliego tipo de
obra pública de CCE, pero hay pliegos que usan el **día hábil siguiente a la apertura del sobre
económico** y otros el **segundo día hábil siguiente al vencimiento del término de observaciones al
informe de evaluación**. *Verificar en el capítulo de ponderación económica del proceso concreto.*
La consecuencia práctica es doble: no se puede «anticipar» la TRM con un calendario genérico, y
cualquier función de la app que lo intente estará adivinando.

#### Qué se sigue de ahí

Bajo el supuesto de que el pliego trae **los cuatro métodos y los sortea uniformemente**, ofertar el
precio más bajo gana solo con probabilidad **≈ 0.25**, y en los otros tres escenarios una baja
agresiva se aleja del estadístico de referencia y **pierde puntos**. La intuición de «bajo más y
gano» es exactamente al revés en **3 de 4** casos. **Si el pliego solo habilita un subconjunto de
métodos, hay que recalcular `π` con el set real** — y si el pliego adjudica al menor valor, toda esta
sección se reduce a §3 y §6.

**El precio óptimo no es un número: es la respuesta a una distribución sobre métodos.**

Sea `p` la oferta, `PO` el presupuesto oficial, `m` el método con probabilidad de sorteo `π_m`
(**uniforme 1/4** si el pliego trae los cuatro), `n` el número esperado de oferentes y `S_m` el
estadístico de referencia del método:

```
E[U(p)] = Σ_m  π_m · P(ganar | p, m, n) · ( p − E[C | ganar, p, m, n] )
p*      = argmax_p  E[U(p)]      sujeto a   P_piso ≤ p ≤ PO
```

El margen relevante es `p − E[C | ganar]`, **no** `p − C`. Bajo **menor valor**,
`E[C | ganar] > C`: condicionado a haber ganado por ser el más barato, lo más probable es que el
propio APU haya subestimado el costo común (§6). Bajo los **métodos centrales**, `E[C | ganar] ≈ C`,
porque se gana por estar cerca del centro y no por ser el más optimista. **La prima de §6 es
precisamente la aproximación de primer orden de esa diferencia**, y por eso **no puede sumarse
además** al resultado de esta optimización: sería contarla dos veces.

#### El presupuesto oficial es TECHO, no una referencia

**La oferta que supere el presupuesto oficial se rechaza** en obra pública: no es «una oferta cara»,
es una oferta inhabilitada [CONOCIDO]. Por eso el óptimo se busca en el intervalo cerrado
`[P_piso, PO]` y por eso, en el histórico, **`B > 1` solo puede venir de adiciones posteriores,
lotes agregados o distinta base (con/sin IVA o AIU) — nunca de una oferta ganadora por encima del
PO**. Si `P_piso > PO`, no hay intervalo factible: la respuesta es no presentarse, y la app debe
decirlo sin rodeos.

Con `π` uniforme sobre los cuatro métodos y `S_m` centrado cerca de `B̄·PO`, el óptimo es
**interior**: cerca de la media esperada de las ofertas, algo por encima de ella (porque dos de los
cuatro métodos —geométrica con PO y aritmética alta— premian estar arriba), y nunca en el mínimo ni
en el techo.

Regla operativa de arranque, mientras no haya curva estimada:

```
p*  ≈  min( PO ,  PO · B̂_celda · (1 + δ) ),   δ ∈ [0.005, 0.020]   [SUPUESTO — no calibrado]
```

*Calibración de δ:* retro-simulación sobre el histórico — ¿qué valor de `δ` habría ganado más
procesos **rentables** (ganados **y** por encima de `P_piso`)? Mientras no esté calibrado, la app
muestra **el rango**, no un número único.

#### Peso del factor económico y factores no económicos

El factor económico pesa una **fracción mayoritaria pero no total** del puntaje; **el número exacto
de puntos y el total lo fija el pliego de cada proceso** **[NO VERIFICADO]**. Junto a él conviven el
apoyo a la industria nacional, los ofrecimientos técnicos adicionales cuando el pliego los prevé y
las reglas de desempate. Esos factores **reducen el peso marginal del precio**; **el desplazamiento
del óptimo depende de la posición relativa del oferente en ellos y puede ir en cualquier dirección**:
con ventaja en factores no económicos se puede sostener un precio más alto, con desventaja hay que
compensar con precio. Afirmar que «siempre empujan hacia arriba» es incorrecto.

Advertencia estructural: **SECOP II no publica en datos abiertos el método sorteado**. Está en el
pliego (PDF adjunto al proceso). Mientras no se parsee, la app debe asumir la distribución uniforme
del set que declare el pliego y **decir que lo está asumiendo**.

#### Desbalanceo de precios unitarios: lo que la app NO debe recomendar

En un contrato **a precios unitarios** con cantidades estimadas por la entidad, el precio global se
descompone en ítems. **Desbalancear** es subir el precio de los ítems que se ejecutan al principio o
cuyas cantidades reales se esperan mayores que las del pliego, y bajar los demás, manteniendo el
total. Efectos buscados por quien lo hace: adelantar flujo de caja (*front loading*) y capturar el
mayor valor si esas cantidades crecen en obra.

Por qué la app **no** debe recomendarlo:

1. **Es observable y observado.** Un unitario muy alejado del mercado o del PO es causal de
   observación por parte de la entidad y de los demás oferentes, y puede derivar en requerimiento de
   explicación o en rechazo, según lo que el pliego disponga [CONOCIDO].
2. **Es una apuesta sobre las cantidades**, no una mejora de precio. Si las cantidades se mueven al
   revés de lo apostado, el desbalanceo destruye margen en vez de crearlo.
3. **Contamina el histórico**: un adjudicado desbalanceado tiene el mismo `B` que uno limpio y no se
   distingue en datos abiertos, así que ni siquiera se podría medir si funciona.

Lo que sí corresponde: **verificar** que las cantidades del pliego sean coherentes con los planos y
declarar el riesgo cuando no lo sean. Esa es una alerta de riesgo del proceso, no una táctica de
precio.

---

### 3. Umbral de rentabilidad: el precio piso

```
C_esp   = C_directo · (1 + f_A) + E[sobrecostos] + garantías + costo financiero del capital de trabajo
P_piso  = C_esp / (1 − u_min − t_ingreso)
```

**Definiciones, para que nada se cuente dos veces:**

| Símbolo | Qué es | Qué NO es |
|---|---|---|
| `f_A` | Factor de **ADMINISTRACIÓN únicamente** | **Sin utilidad y sin imprevistos** |
| `E[sobrecostos]` | Valor esperado de los imprevistos (la «I» del AIU) | No se suma otra vez dentro de `f_A` |
| `u_min` | Utilidad mínima aceptable **sobre el precio** (la «U» del AIU) | No aparece dentro de `C_esp` |
| `t_ingreso` | Estampillas, contribución de obra, retenciones no recuperables — todo lo que se paga **sobre el ingreso** | No es un margen: por eso se **divide**, no se multiplica |

**La utilidad entra UNA sola vez, por `u_min` en el denominador. Los imprevistos entran UNA sola
vez, por `E[sobrecostos]`.** Si el APU que se está usando ya trae **AIU completo**, entonces **no**
se aplica `f_A` ni `u_min` sobre él: el piso ya está incorporado y volver a aplicarlos infla
`P_piso` y hace que la app recomiende **no presentarse a procesos que sí eran rentables**.

**Por debajo de `P_piso` no se oferta aunque se gane.** Ganar por debajo del piso es comprar una
pérdida con dos años de plazo. Consecuencias de diseño:

- `P_piso` y `baja_maxima_admisible = 1 − P_piso/PO` son **salidas visibles** de la app, junto al PO.
- Si `B̂_celda · PO < P_piso`, la celda entera es inviable para el perfil: la app lo dice **antes**
  de que el dueño abra el pliego. Ese es el mayor ahorro de tiempo de toda esta capa.
- El piso se calcula por perfil (Helder / Génesis / Consorcio): la misma obra puede estar por encima
  del piso del consorcio y por debajo del de la persona natural.

#### Anticipo: `anticipo_pct = 0` es AUSENCIA de dato, no ausencia de anticipo

El costo financiero del capital de trabajo depende del anticipo, y **el anticipo no se conoce por
dato abierto**: el dataset `p6dx-8zbt` no trae la columna, y en este corpus `anticipo_pct = 0`
significa **«sin dato»** — es la misma doctrina que ya rige el índice de competencia con
`0 oferentes`. Calcular el capital de trabajo asumiendo anticipo = 0 % **infla el costo financiero,
infla `P_piso`** y hace que la app diga «no presentarse» a procesos que sí lo eran.

Regla: **`P_piso` se publica en dos escenarios** — *sin anticipo* y *con el anticipo que declare el
pliego* — y ambos se marcan como **estimados** mientras el pliego no se lea. **Nunca se asume 0 %
como hecho.**

#### Anticipo ≠ pago anticipado (efectos opuestos)

| | **Anticipo** | **Pago anticipado** |
|---|---|---|
| Naturaleza | Recurso **de la entidad** entregado para iniciar; **se amortiza** contra las actas de obra | **Ingreso del contratista** desde el desembolso; **no se amortiza** |
| Manejo | Sujeto a manejo separado (fiducia / patrimonio autónomo, según el proceso), con destinación controlada | Libre disposición |
| Garantía | Exige garantía de **buen manejo y correcta inversión del anticipo** | No exige esa garantía específica |
| Efecto sobre capital de trabajo | Reduce la necesidad **temporalmente**; se devuelve vía amortización y el costo financiero solo se difiere | **Reduce el costo financiero de forma definitiva** |

[CONOCIDO — verificar contra el pliego y la minuta del proceso concreto.] La consecuencia para el
modelo: solo el **pago anticipado** puede descontarse del costo financiero de manera permanente; el
anticipo cambia el **perfil temporal** del flujo, no el total financiado a lo largo del contrato.

---

### 4. Matriz de decisión por contexto

Ejes que la app **ya** conoce: nivel de competencia de la entidad (`competenciaDe().nivel`), holgura
de capacidad `H = K_disponible / CRPC` y calidad del ajuste al RUP (tier `clase` > `equivalente` >
`familia` > `texto`). Todo precio objetivo se entiende **acotado por el techo**: `min(PO, ·)`.

| Competencia | Holgura K | Tier RUP | Postura | Precio objetivo | Razón |
|---|---|---|---|---|---|
| baja | H ≥ 1.5 | clase | **Central-alta** | `PO·B̂·(1+0.02)` [supuesto] | Pocos rivales: el centro se mueve arriba y el margen vale más que el punto |
| baja | H ≥ 1.5 | familia / texto | Central, con revisión de pliego | `PO·B̂` | El ajuste débil es riesgo de rechazo, no de precio |
| baja | 1.0 ≤ H < 1.5 | clase | Central | `PO·B̂` | Sin holgura para financiar una baja |
| baja | 1.0 ≤ H < 1.5 | equivalente / familia / texto | Central, con revisión de pliego | `PO·B̂` | Doble debilidad: ni holgura ni código propio |
| media | H ≥ 1.5 | clase | **Central** | `PO·B̂` | El centro es la jugada dominante en 3 de 4 métodos |
| media | 1.0 ≤ H < 1.5 | clase | Central | `PO·B̂` | Igual postura; la K limita el tamaño, no el precio |
| media | 1.0 ≤ H < 1.5 | equivalente | Conservadora | `PO·B̂·(1+0.01)` [supuesto] | El tier equivalente es ayuda a la decisión, no habilitación |
| alta | H ≥ 1.5 | clase | Central, con prima de riesgo elevada en el **piso** | `PO·B̂` | **La prima entra en `P_piso`, no aquí (§6)**: con muchos oferentes sube el piso, y si `p*` no lo alcanza, no se presenta |
| alta | H < 1.5 | cualquiera | **No presentarse** | — | Baja P(ganar) × margen comprimido × K sin colchón |
| alta | — | familia / texto | **No presentarse** | — | Se compite con quien sí tiene el código |
| sin_dato | H ≥ 1.5 | clase | Central, con `n` = mediana global | `PO·B̂` | No saber ≠ competencia alta: se explora, no se descarta |
| sin_dato | 1.0 ≤ H < 1.5 | cualquiera | Central, con revisión de pliego y `n` = mediana global | `PO·B̂` | Se explora con prudencia; la prima del piso usa la mediana global |
| sin_dato | H < 1.0 | cualquiera | No presentarse | — | La restricción es K, no el precio |
| cualquiera | H < 1.0 | cualquiera | **No presentarse** | — | Sin capacidad residual no hay oferta habilitada |
| **cualquier combinación no listada** | — | — | **Central con revisión manual de pliego** | `PO·B̂` | Fila de cierre: la matriz nunca deja al usuario sin respuesta |

El trade-off es siempre el mismo: **bajo el supuesto de cuatro métodos equiprobables**, bajar el
precio compra probabilidad **solo** en el escenario «menor valor» (**≈ 25 %**) y la destruye en los
otros tres, mientras el margen cae linealmente. Si el pliego habilita un subconjunto distinto, hay
que recalcular `π` y esta conclusión puede cambiar. Por eso no hay ninguna celda con postura
«agresiva» pura: la agresividad solo se justifica si se **sabe** que el pliego adjudica al menor
valor.

---

### 5. Curva P(ganar | precio)

**Lo que el corpus tiene**: por proceso adjudicado, el `PO`, el **valor ganador** y el **número de
oferentes**. **Lo que no tiene**: las ofertas perdedoras. En `p6dx-8zbt` no hay columna de ofertas
individuales [CONOCIDO, ver Vacíos]. Sin ellas, la curva no se observa: se **infiere**.

Modelo mínimo defendible. Suponer que las ofertas de un proceso son extracciones de
`B_i ~ LogNormal(μ_celda, σ²_celda)` y que el ganador es un estadístico de orden que **depende del
método**:

- Bajo **menor valor**: `B_ganador = min(B_1..B_n)`. Entonces `E[B_ganador]` **decrece con n** de
  forma conocida, y `P(ganar | p) = (1 − F(p))^(n−1)`.
- Bajo **métodos centrales**: `B_ganador ≈ S_m`, cuya esperanza es prácticamente **independiente de
  n**, con varianza que se estrecha al crecer n. `P(ganar | p)` es una campana alrededor de `S_m`,
  aproximable por `P ≈ (1/n)·exp(−(p − Ŝ)²/2τ²)`.

**Identificación**: regresar `log B_ganador` contra `log n` con efectos por celda. La pendiente mide
qué fracción del corpus se comporta como «menor valor»; una pendiente ≈ 0 confirma que dominan los
métodos centrales — que es la hipótesis de trabajo de §2 y **se puede falsar con los datos que ya
hay**.

**Sobre los procesos con `n = 1`**: son la **submuestra más sesgada del corpus**, no una ventana
limpia. Doble selección: llegaron solos porque el proceso era poco atractivo (cuantía, ubicación,
requisitos), y el único oferente, **sabiéndose solo**, puede ofertar cerca del PO sin perder nada.
Usarlos como ancla de `μ` sesga `B̂` hacia 1. Sirven como **cota superior de B** —«hasta aquí se
puede llegar cuando no hay nadie»—, **nunca como ancla de la distribución**.

**Sesgos que hay que declarar en la UI**, no esconder:

| Sesgo | Efecto | Mitigación |
|---|---|---|
| Solo se observan ganadores | `μ` se subestima bajo menor valor | Corregir por el estadístico de orden condicionando en `n` |
| Entrada endógena (`n` depende del atractivo) | Confunde competencia con precio | Condicionar por entidad y cuantía |
| Submuestra `n = 1` | `B̂` se sesga hacia 1 si se usa como ancla | Tratarla como cota superior, reportada aparte |
| El corpus pasó por los filtros de ingesta de la app | No es SECOP entero | Decirlo; el embudo de `/api/diagnostico` ya lo cuantifica |
| Método desconocido por proceso | Mezcla dos regímenes | Reportar la curva como **mezcla**, no como una sola |
| PO desactualizado a la fecha de oferta (§0) | Parte de `B` es inflación, no agresividad | Reportar antigüedad del PO junto a `B̂` |

Conclusión honesta: lo entregable hoy es `B̂` con sus percentiles y una P(ganar) **cualitativa** en
tres bandas. Una curva continua creíble exige las ofertas perdedoras.

---

### 6. La regla de oro: maldición del ganador

En una subasta de obra, el costo real es en buena parte **común** a todos los oferentes (precios de
materiales, rendimientos, geología). Cada uno estima ese costo con error. Bajo «menor valor», el que
gana es el que **más lo subestimó**: ganar es, en sí mismo, mala noticia sobre el propio APU. El
sesgo crece con el número de oferentes, porque el mínimo de más extracciones está más abajo.

Corrección: sumar una **prima de riesgo creciente en n**, que es la aproximación de primer orden de
`E[C | ganar] − C` de §2.

```
prima(n) = λ · σ_est · E[Z_(n)] · C
```

**Convención fijada:** `E[Z_(n)]` = **esperanza del máximo de `n` normales estándar**. Es la correcta
para este problema: condicionado a ser el más bajo entre `n` oferentes, el error de estimación
propio se comporta como el **mínimo de `n` extracciones**, y por simetría de la normal su magnitud
esperada es `E[máx de n]`.

`σ_est` = error relativo del APU propio. **`σ_est = 8 % es un valor de arranque arbitrario
[SUPUESTO SIN CALIBRAR]**: no está calibrado contra ninguna obra de Helder ni de Génesis. Como la
prima **crece** con `σ_est`, este valor es **ANTI-conservador** si el error real del APU es mayor:
subestimar `σ` produce una prima menor y por tanto un **piso más bajo**, que es exactamente el error
caro. Hasta calibrarlo, **la tabla se publica con `σ = 8 %` y `σ = 15 %` en paralelo y se usa la más
alta para decidir no presentarse.**

`λ ∈ [0.3, 0.5]` **[SUPUESTO — no calibrado]** porque parte de la varianza es privada (productividad
propia, no común) y porque **los métodos centrales rompen la selección adversa**: si se gana por
estar en el centro, no se gana por ser el más optimista. *Calibración de λ:* retro-simulación sobre
el histórico — con qué `λ` la regla «no presentarse si `p* < P_piso'`» habría evitado más procesos
que resultaron malos sin descartar los buenos. Mientras no esté calibrado, se muestra el rango.

| Oferentes n | `E[Z_(n)]` | Prima teórica σ=8 % | **Recomendada λ=0.4, σ=8 %** | Prima teórica σ=15 % | **Recomendada λ=0.4, σ=15 %** |
|---|---|---|---|---|---|
| 1–2 | 0.00–0.56 | 0.0–4.5 % | **0.0–1.8 %** | 0.0–8.5 % | **0.0–3.4 %** |
| 3 | 0.85 | 6.8 % | **2.7 %** | 12.7 % | **5.1 %** |
| 5 | 1.16 | 9.3 % | **3.7 %** | 17.4 % | **7.0 %** |
| 8 | 1.42 | 11.4 % | **4.6 %** | 21.4 % | **8.5 %** |
| 12 | 1.63 | 13.0 % | **5.2 %** | 24.4 % | **9.8 %** |
| 20 | 1.87 | 14.9 % | **6.0 %** | 28.0 % | **11.2 %** |

`n` sale directo de `competenciaDe().promedio_oferentes`. Y aquí la doctrina de «sin dato» del índice
importa: **si `nivel = "sin_dato"`, no hay `n`** — se usa la mediana global de oferentes y se marca la
prima como estimada, jamás se asume `n` bajo. Asumir poca competencia porque no se sabe es
exactamente el error que la prima existe para evitar.

**Dónde se aplica la prima, sin ambigüedad: sube el precio PISO, no el precio objetivo.**

```
P_piso' = ( C_esp + prima(n) ) / (1 − u_min − t_ingreso)
```

Y **no se suma al `p*` de §2**: `p*` ya sale de una función objetivo escrita con `E[C | ganar]`, así
que sumarle la prima sería contar dos veces la misma corrección. Si `p*` cae por debajo de
`P_piso'`, la respuesta correcta es **no presentarse** — y ese es el resultado que más plata ahorra
de toda esta sección.

#### Vacíos y siguiente paso

| Vacío | Cómo se cierra |
|---|---|
| **Set exacto de métodos, rangos de TRM y día de la TRM** | Abrir el pliego tipo vigente en `https://www.colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo` **y** el pliego del proceso concreto, y transcribir la tabla del capítulo de ponderación económica. La tabla de §2 sale de fuentes secundarias: en este entorno todos los `WebFetch` a dominios `.gov.co` y a los PDF citados devolvieron **403**. Hasta entonces, la app declara el supuesto de cuatro métodos equiprobables. |
| **Nomenclatura del set en Documentos Tipo de transporte v4** | Mismo camino. El catálogo de transporte (mediana con valor absoluto / geométrica con PO / aritmética baja / menor valor) **no** coincide con el de obra pública general: hay que guardar los dos y elegir por tipo de proceso. |
| **Serie e índice del DANE para actualizar el APU (§0)** | Entrar a `dane.gov.co` → índices de costos de la construcción, fijar el **código exacto** de la serie de obras civiles/infraestructura vial vigente, su periodicidad y su año base. **No** cablear un nombre de serie de memoria: han cambiado. |
| **Fecha de estructuración del PO** | No consta en dato abierto de forma fiable; suele estar en los estudios previos (PDF). Proxy usable ya: antigüedad de `fecha_de_publicacion_del` y advertencia si el PO no trae fecha de precios. |
| **Fórmula de reajuste y anticipo del contrato** | Solo en pliego/minuta. Hasta leerlos, `P_piso` se publica sin reajuste y en dos escenarios de anticipo (§3). |
| **¿`precio_base` es el presupuesto oficial?** | `SELECT :id, precio_base, valor_total_adjudicacion WHERE adjudicado='Si' AND precio_base > 0 LIMIT 50` sobre `p6dx-8zbt` y comparar a mano con 5 pliegos, **verificando además que ambas cifras estén en la misma base (con/sin IVA)**. Si el ratio se agolpa en (0.85, 1.00), es el PO. [PENDIENTE DE VERIFICAR EN PRODUCCIÓN] |
| **¿Existe columna de valor adjudicado?** | Misma consulta; si devuelve 400, la columna se llama de otro modo. Las candidatas ya están en `CAMPOS_VALOR_ADJUDICADO`; ampliar ahí y reconstruir, sin re-extraer. |
| **¿Hay dataset con ofertas perdedoras?** | Buscar en el catálogo de datos abiertos un conjunto de «ofertas»/«propuestas» de SECOP II ligado por `id_del_proceso`. Si existe, la curva de §5 pasa de inferida a observada. Si no existe, §5 se queda en tres bandas y hay que decirlo en la UI. [INCIERTO] |
| **Método sorteado por proceso** | No está en datos abiertos. Requiere leer el PDF del pliego (`urlproceso`). Hasta entonces, `π` uniforme **declarada como supuesto**. |
| **`σ_est` real del APU propio** | Comparar presupuesto ofertado vs. costo ejecutado en obras pasadas de Helder/Génesis, por capítulo. Sin eso, el 8 % es una suposición **anti-conservadora**, no un dato: por eso se publica también el escenario 15 %. |
| **Calibración de `δ`, `λ`, `k` y el umbral 1.05** | `δ` y `λ`: retro-simulación sobre el histórico. `k`: validación cruzada del error de predicción de `B` por celda. `1.05`: inspección manual de 20 procesos con `B > 1` para clasificarlos en adición / lote agregado / distinta base. Mientras no se calibren, **la app muestra rangos, no números únicos**. |
| **Estadística nacional de baja** | El 42/30/14/6 % citado es un estudio de caso regional de 2018. La estadística que importa la produce el propio corpus: es la primera métrica a publicar en `/api/diagnostico`. |


---

## 1.F — Pipeline de actualizacion de precios (frecuencia, scraping y legalidad)

Regla de encuadre: el precio no es el entregable, la **fecha de vigencia del precio** lo es — y junto a
ella, la **condicion comercial** en que se observo. Un APU sin sello temporal no se puede defender en una
reclamacion ni comparar con el presupuesto oficial; un APU que mezcla precios con IVA y sin IVA, o puestos
en fabrica y puestos en obra, esta mal aunque todos sus precios sean de hoy. Todo lo que sigue esta
subordinado a esas dos cosas.

Etiquetas de origen usadas en la seccion:

| Etiqueta | Significado |
|---|---|
| [VERIFICADO] | Confirmado con herramienta de red en alguna sesion de trabajo de este documento, con URL |
| [CONOCIDO] | Conocimiento tecnico o normativo solido, **no** reconfirmado ahora; se indica como verificarlo |
| [APORTADO] | Dato entregado en la revision del documento, con procedencia declarada pero **no** verificado aqui |
| [SUPUESTO] | Juicio del autor, no medido. Debe calibrarse contra una serie antes de decidir gasto |
| [INCIERTO] | Se cree que existe, no se pudo confirmar; se indica que buscar |

### 1. Volatilidad por insumo

Dos advertencias antes de la tabla. Primera: la columna de volatilidad es **juicio del autor, no medicion**
— no hay serie por insumo en este documento que la sostenga, y por eso va marcada como supuesto. Segunda:
esa columna **no debe usarse todavia** para fijar cadencia; se usa la columna «frecuencia de cambio real de
la fuente», que es un hecho observable (cada cuanto publica quien publica), mientras la volatilidad se
calibra contra las series del DANE.

| Insumo | Driver de precio | Volatilidad esperada [SUPUESTO — no medido] | Frecuencia de cambio real de la fuente | Fuente de actualizacion | Cadencia recomendada |
|---|---|---|---|---|---|
| Acero de refuerzo (figurado / varilla) | Chatarra + palanquilla internacional, TRM, flete | Alta | Listas de siderurgica cambian por mes, a veces por quincena | Listas de productor (Paz del Rio, Gerdau Diaco), ICOCIV grupo materiales | **Mensual** |
| Cemento gris tipo I (bulto 50 kg) | Energia (carbon/gas), flete terrestre, oligopolio regional | Media | Ajustes de lista 2-4 veces al año | ICOCIV/ICOCED subgrupo cemento; ferreteria local | Mensual (indice) + trimestral (retail) |
| Concreto premezclado (m³ por resistencia) | Cemento + agregados + km de mixer | Media, muy regional | Tarifario por planta, revision trimestral | Cotizacion directa de planta; ICOCIV | Trimestral, con alerta si el cemento salta |
| Asfalto / MDC-19 | Crudo, Ecopetrol, planta y distancia de acarreo | Alta (sigue al crudo) | Mensual, arrastrado por el esquema de combustibles | Lista Ecopetrol/plantas; APU Regionalizados INVIAS | Mensual |
| Agregados (arena, triturado, base, sub-base) | Cantera local, regalias, distancia de acarreo | Baja | 1-2 veces al año | Canteras de la region; listas territoriales; APU Regionalizados INVIAS | Semestral |
| Tuberia PVC / novafort | Resina PVC (petroquimica), TRM, promociones de canal | Media-alta | Listas de fabricante 2-3 veces al año, con descuentos volatiles | Listas Pavco Wavin / Durman; ferreteria | Trimestral |
| Combustible ACPM | Ingreso al productor regulado + paridad internacional + TRM | Alta | Mensual hoy; el esquema 2026 apuntaria a semanal [INCIERTO, ver 1.1] | Resoluciones MinHacienda/MinMinas; estructura CREG | Semanal si se confirma; mensual mientras tanto |
| Mano de obra (cuadrillas, prestacional) | Decreto de salario minimo + convenciones + escasez regional | Salto anual concentrado | 1 vez al año (1 de enero), mas deriva regional | Decreto anual + ICOCIV grupo mano de obra | **Anual, con revision del ICOCIV mensual** |
| Alquiler de maquinaria (h-maq) | ACPM, repuestos importados, tasa de interes, ocupacion regional | Media | Tarifarios semestrales | Tarifarios de alquiler regional; APU Regionalizados INVIAS | Semestral. **Si la tarifa incluye combustible**, el ajuste por ACPM se aplica UNICAMENTE sobre la participacion del combustible en la tarifa (dato que debe venir del propio tarifario; si se estima, se marca como supuesto). **Si la tarifa es sin combustible**, el ACPM entra como insumo aparte del APU y la tarifa no se ajusta por el |

La celda de maquinaria es larga a proposito: el error clasico es aplicar la variacion del ACPM sobre el
total de la hora-maquina cuando el combustible ya venia dentro de la tarifa. Eso infla la h-maq en
proporcion al peso del combustible que ya estaba contado. Por lo mismo, la primera pregunta al cotizar
h-maq no es el precio sino la **modalidad**: con o sin operario, con o sin combustible (ver el atributo
`modalidad_tarifa` del catalogo maestro, apartado 5).

#### 1.1 Variacion medida disponible (lo unico que aqui es dato, no juicio)

| Serie | Periodo | Variacion | Etiqueta |
|---|---|---|---|
| ICOCIV total (obras civiles) | Año 2025 | 4,31 % | [APORTADO — procedencia declarada: DANE; confirmar contra el boletin ICOCIV de diciembre 2025] |
| ICOCIV grupo transporte | Año 2025 | 8,02 % | [APORTADO — mismo origen y misma pendiente de confirmacion] |
| ICOCIV grupo mano de obra | Año 2025 | 6,77 % | [APORTADO] |
| ICOCIV grupo maquinaria y equipo | Año 2025 | 6,11 % | [APORTADO] |
| ICOCIV grupo materiales | Año 2025 | **No consta** | Se infiere que esta claramente por debajo del total: si tres grupos crecen entre 6 % y 8 % y el total cierra en 4,31 %, materiales —que es el grupo de mayor ponderacion— tuvo que crecer muy poco. La cifra exacta hay que leerla del boletin. [INFERENCIA propia, no medicion] |
| ICOCIV grupo mano de obra | dic-2025 → feb-2026 | 12,80 % | [VERIFICADO vía busqueda, boletines ICOCIV feb/mar-2026] |
| ICOCIV total | Variacion mensual mar-2026 | 1,02 % | [VERIFICADO vía busqueda, boletin ICOCIV mar-2026] |

Consecuencia inmediata, y es la que importa para el diseño: **el grupo «materiales» del ICOCIV no sirve
para envejecer un precio de acero.** Si materiales se movio unos pocos puntos en 2025 y el acero se mueve
con la palanquilla internacional y la TRM, indexar acero con «materiales» produce un error sistematico y
siempre en la misma direccion. La regla que se deriva de esto esta en el apartado 6.

#### 1.2 Los tres patrones de fondo

- **Acero, asfalto y ACPM cotizan contra mercados internacionales**: su serie tiene ruido mensual real.
  Actualizarlos trimestralmente introduce un sesgo sistematico en la direccion de la tendencia.
- **Los agregados son un producto de peso muerto**: el flete domina y la cantera es local, asi que el
  precio se mueve poco y por razones locales. Actualizarlos con frecuencia es gastar sin comprar señal.
  (De ahi tambien la prohibicion de imputarlos desde otra region: apartado 6.)
- **La mano de obra es un escalon, no una pendiente**: sube el 1 de enero por decreto, y esa unica corrida
  mueve mas plata que un año entero de actualizaciones diarias de materiales.

#### 1.3 Base anual de mano de obra 2026 y su soporte juridico

Cifras 2026 [VERIFICADO vía busqueda; coinciden con el valor ya codificado en `lib/perfiles.js`]:

| Concepto | 2025 | 2026 | Variacion |
|---|---|---|---|
| Salario minimo mensual | $1.423.500 | **$1.750.905** | **23,00 % exacto** (1.750.905 / 1.423.500 = 1,2300) |
| Auxilio de transporte | $200.000 | **$249.095** | **24,55 %** (249.095 / 200.000 = 1,24548) |
| Suma (trabajador con derecho a auxilio) | $1.623.500 | **$2.000.000** | **23,19 %** |

Las tres variaciones son aritmetica sobre los valores decretados [CALCULO PROPIO]. Dos lecturas
operativas:

1. El auxilio subio **mas** que el salario, y la suma cierra en una cifra redonda ($2.000.000) que
   evidentemente se busco. Por lo tanto, **el costo mensual del personal con derecho a auxilio sube 23,19 %,
   por encima del 23,00 % del salario**. En cuadrillas de obra —donde ayudantes y oficiales suelen estar en
   el rango con derecho a auxilio— usar 23 % plano subestima el jornal. El auxilio no es base de aportes a
   salud y pension, pero si entra en la base de prima y cesantias [CONOCIDO — verificar contra el CST antes
   de usarlo en un factor prestacional que se vaya a defender ante una entidad].
2. La base 2026 es firme y **no requiere reproceso**, pero el pipeline debe guardar el numero **con la
   norma que lo soporta en cada momento**, porque durante cinco meses de 2026 el soporte juridico del
   mismo valor fue un decreto distinto:

| Fecha | Hecho | Efecto sobre la base de mano de obra |
|---|---|---|
| 29/12/2025 | Decretos 1469 y 1470 de 2025 fijan salario minimo ($1.750.905) y auxilio ($249.095) | Base 2026 vigente |
| 13/02/2026 | Consejo de Estado, Seccion Segunda: **suspension provisional** del Decreto 1469 de 2025, por posible violacion del art. 8 de la Ley 278 de 1996 (tramite de concertacion en la Comision Permanente) | El **valor** no cambia, pero su soporte queda en entredicho |
| 2026 (posterior a la suspension) | Gobierno expide el **Decreto 0159 de 2026**, transitorio, para sostener el aumento | Mismo valor, **otra norma** de respaldo |
| 14/04/2026 | Consejo de Estado niega los recursos contra la suspension | Situacion transitoria se mantiene |
| 17/07/2026 | Consejo de Estado **revoca la suspension**; el Decreto 1469 recupera vigencia | El 23,00 % vuelve a estar soportado en su decreto original |

Toda esta cronologia esta etiquetada **[APORTADO — procedencia declarada, no verificada en esta sesion]**.
Como verificarla: buscar los autos de la Seccion Segunda del Consejo de Estado de 13/02/2026, 14/04/2026 y
17/07/2026 en `consejodeestado.gov.co` (relatoria) y el Decreto 0159 de 2026 en el gestor normativo de
Funcion Publica. Es una verificacion de media hora y hay que hacerla antes de citar numeros de auto.

**Regla de negocio que sale de aqui**: el registro de mano de obra no guarda solo `valor` y
`vigente_desde`; guarda `norma_soporte` y su propio historial. Un presupuesto presentado en mayo de 2026 se
sostenia en el Decreto 0159; uno de agosto, en el 1469. El valor es el mismo y la defensa documental no.

### 2. Cadencia propuesta

| Nivel | Que se actualiza | Por que | Costo de invocaciones |
|---|---|---|---|
| Diario | TRM | Es un `GET` de un dato escalar y afecta a todo lo importado | Trivial |
| Lunes de cada semana, efectivo el martes | ACPM, **si se confirma el esquema 2026** | Es la cadencia declarada del mecanismo (ver 3.1); si no se confirma, este nivel desaparece y el ACPM baja a mensual | Bajo |
| **Mensual** | Indices DANE (ICOCIV/ICOCED), listas de acero, asfalto | **Captura la mayor parte de la varianza real** | Bajo |
| Trimestral | Construdata (si hay suscripcion), tuberia, concreto | Cadencia de la propia fuente | Bajo |
| Semestral | Agregados, tarifarios de maquinaria | Precio pegajoso y local | Trivial |
| Anual (enero) | Salario minimo, factor prestacional, edicion vigente de los APU Regionalizados de INVIAS | Cambio por decreto / por edicion | Una corrida |

**Un pipeline diario es sobreingenieria.** Solo TRM y —quiza— ACPM justifican menos de un mes; el resto no
cambia entre corridas y cada consulta extra es una invocacion serverless y una escritura en Redis a cambio
de cero informacion. El diseño correcto es **mensual como latido, con tres o cuatro excepciones
declaradas**, y un disparador manual para cuando el dueño necesite refrescar antes de cotizar.

#### 3.1 Nota sobre el ACPM (nivel de confianza: bajo)

Hay que separar dos cosas que se confunden:

- La **Resolucion CREG 104 004 de 2026** reorganiza la estructura de precios de gasolina y ACPM
  [VERIFICADO vía busqueda — existe la resolucion y ese es su objeto].
- El **cambio a calculo semanal del ingreso al productor** proviene de una resolucion conjunta de
  **MinHacienda y MinMinas**, no de la CREG. El mecanismo descrito: ingreso al productor calculado con el
  **promedio simple de los precios internacionales diarios de lunes a viernes de la semana anterior**,
  publicado **cada lunes** y aplicable **desde el martes siguiente**, con primera aplicacion prevista sobre
  la semana del 6 al 10 de abril de 2026. **[INCIERTO — reportado como proyecto MinHacienda/MinMinas; no se
  verifico si la resolucion se expidio en firme o quedo en proyecto.]**

Mientras eso no se confirme, **el cuerpo de este documento no afirma que el ACPM sea semanal**. El pipeline
se diseña con el nivel semanal previsto pero **apagado**, y se enciende cuando se lea el numero y la fecha
de la resolucion. Que buscar: resolucion conjunta MinHacienda–MinMinas de 2026 sobre ingreso al productor de
ACPM, en `minhacienda.gov.co` y `minenergia.gov.co`, y la circular de precios del mes correspondiente.

### 3. Scraping: legalidad en Colombia

No es asesoria juridica; es un mapa de riesgos con la linea que no conviene cruzar.

| Norma | Que protege | Aplica a precios? | Consecuencia practica |
|---|---|---|---|
| Ley 1581 de 2012 (habeas data) | Datos personales de personas naturales | **No** al precio de un producto; **si** al nombre, celular, correo y NIT de persona natural del proveedor | No almacenar contactos scrapeados; si se guardan, hay deber de autorizacion e informacion |
| Ley 23 de 1982 y Decision Andina 351 de 1993 | Obras; y las **compilaciones/bases de datos** en cuanto su *seleccion o disposicion* sea creativa | El precio es un **hecho**, no es obra | Copiar hechos no infringe; copiar la estructura, la seleccion, la clasificacion o el volcado integro de la base si puede infringir |
| Terminos y condiciones del sitio | Relacion contractual con el usuario | Si, aunque el dato sea libre | **En principio contractual** (bloqueo de IP, requerimiento, reclamacion). Pero como el art. 269A tipifica el acceso realizado *«por fuera de lo acordado»*, unos T&C que **prohiban expresamente el acceso automatizado** son precisamente el acuerdo que se estaria excediendo: ahi la frontera con lo penal deja de ser teorica. **Regla practica: leer los T&C de cada fuente ANTES de programarla, y no scrapear ningun sitio cuyos T&C prohiban el acceso automatizado** |
| `robots.txt` | Nada por si mismo | — | Es **señal de intencion** del titular; ignorarla debilita cualquier defensa de buena fe |
| Ley 1273 de 2009, art. 269A | Sistemas informaticos | Si hay elusion de autenticacion o de medidas tecnicas, **o acceso por fuera de lo acordado** | Riesgo **penal** (48-96 meses) |

Sobre el 269A hay que ser preciso, porque el texto colombiano es mas amplio que el estadounidense: tipifica
a quien *"sin autorizacion o por fuera de lo acordado, acceda en todo o en parte a un sistema informatico
**protegido o no con una medida de seguridad**"* [VERIFICADO vía busqueda del texto de la Ley 1273/2009 en
funcionpublica.gov.co y secretariasenado.gov.co; no se pudo abrir la pagina completa (403 del proxy), asi
que la cita literal exacta conviene reconfirmarla antes de publicarla]. La ausencia de contraseña **no
exonera por si sola**: el elemento discutido es la *autorizacion*, y la autorizacion se define, entre otras
cosas, por lo que digan los T&C. La linea practica:

- **Del lado seguro**: leer una URL publica que el titular ofrece a cualquier navegador, sin login, sin
  captcha eludido, sin token robado, a ritmo humano, y cuyos T&C no prohiban el acceso automatizado. Ahi la
  autorizacion se infiere de la propia publicacion abierta.
- **Del lado prohibido**: crear cuentas falsas, reutilizar credenciales, saltar un muro de pago, romper un
  captcha, insistir despues de un bloqueo explicito, **o automatizar un sitio cuyos T&C lo prohiben**. Eso
  es "por fuera de lo acordado". **No cruzarla.**

**Recomendacion operativa**: (1) priorizar fuentes oficiales y descargas publicas (DANE, INVIAS,
MinTransporte, gobernaciones, MinMinas) sobre retail — ademas de mas seguras juridicamente, son mas
estables de parsear; (2) para retail, ritmo bajo (1 req cada 2-5 s, ventana nocturna), `User-Agent` honesto
e identificable con correo de contacto, respeto de `robots.txt`, cache local y `If-Modified-Since`; (3) no
revender ni republicar el dato crudo — dentro de Detecta el precio se usa como **insumo de un calculo
propio**, que es una posicion muy distinta a redistribuir la base ajena; (4) para **Construdata, lo correcto
es suscribirse**: es una base construida con inversion editorial, su valor esta justamente en la seleccion y
disposicion, y usarla comercialmente sin licencia es indefendible tanto contractual como reputacionalmente
[CONOCIDO — verificar plan y condiciones de uso vigentes en el sitio de Construdata/Legis].

### 4. Arquitectura del pipeline

```
extraccion -> verificacion de la corrida -> normalizacion de unidades y de
condicion comercial -> conciliacion de nombres -> imputacion de faltantes ->
versionado por vigencia -> publicacion atomica
```

| Etapa | Entrada | Salida | Invariante que no se puede romper |
|---|---|---|---|
| Extraccion | URL/archivo + `fuente_id` | Registro crudo con `hash_origen`, `url`, `capturado_en` | Se guarda el crudo tal cual, siempre |
| **Verificacion de la corrida** | Respuesta HTTP + conteo de registros parseados | `estado_fuente ∈ {ok, sin_cambio, fallo}` + `motivo` | **Una fuente en estado `fallo` NO renueva la vigencia de sus precios**: su antiguedad sigue corriendo. Ver 4.1 |
| Normalizacion | Registro crudo | `{unidad_canonica, cantidad, precio_unitario_base}` | Toda conversion queda registrada con su factor — **tanto la de unidades como la de condicion comercial** |
| Conciliacion | Texto del insumo | `insumo_id` del catalogo maestro + `score` | Un match por debajo del umbral va a revision, no se adivina |
| Imputacion | Serie por insumo/region | Precio estimado + `metodo_imputacion` | Un precio imputado **nunca** se marca como observado; y hay insumos que **no se imputan** (apartado 6) |
| Versionado | Lote conciliado | `precios:v{sello}` con `vigente_desde`/`vigente_hasta` | Los lotes son **inmutables**; se agrega, no se sobrescribe |
| Publicacion | Lote completo | Puntero vigente | Swap atomico |
| **Comparacion / promedio** (transversal) | Dos o mas precios del mismo `insumo_id` | Estadistico | **Ningun precio se compara ni promedia con otro que no tenga la misma condicion comercial.** La conversion a la base canonica (sin IVA, puesto en obra) se registra con su factor, igual que la conversion de unidades |

#### 4.1 Verificacion de la corrida: «no cambio» no es «no se pudo leer»

Este es, en este dominio, el mismo error que el repo ya tiene prohibido en otros dos sitios: tratar «sin
dato» como si fuera un valor (`anticipo_pct = 0`, «0 oferentes»). Con `hash_origen` calculado sobre la
respuesta, **una pagina de error devuelve un hash estable**, asi que un scraper roto se ve exactamente igual
que un precio que no se movio. Hay que separarlo:

| Estado | Como se reconoce | Efecto |
|---|---|---|
| `ok` | 200 valido, registros parseados > 0, hash distinto | Precios nuevos, vigencia renovada |
| `sin_cambio` | 200 valido, registros parseados > 0, hash igual al de la corrida anterior | La fuente confirmo el precio: **se renueva la vigencia** y se anota `confirmado_en` |
| `fallo` | 403/429/5xx, timeout, layout cambiado, **cero registros parseados**, o caida del conteo por encima de un umbral frente a la corrida anterior | **No se renueva nada.** La antiguedad del precio sigue corriendo |

Invariantes: (1) a la **segunda corrida fallida consecutiva** de una fuente, el badge de todos sus precios
pasa a rojo con el motivo visible; (2) se alerta al dueño cuando una fuente falla dos corridas seguidas o
cuando el conteo de registros cae mas de un umbral declarado frente a la corrida anterior (una lista que
pasa de 400 a 12 items no es una lista mas corta: es un parser roto); (3) el estado por fuente se guarda y
se muestra — un panel que solo enseña precios y no enseña salud de las fuentes esconde justo lo que falla
en silencio.

#### 4.2 Versionado (lo importante)

Un APU debe poder **reconstruirse exactamente como se calculo el dia que se presento la oferta**: si la
entidad objeta el valor o el contratista reclama desequilibrio, la defensa es "estos fueron los precios,
estas sus fuentes y esta su condicion comercial al 14/03/2026", y eso exige que el lote de ese dia siga
existiendo intacto. Por lo tanto la oferta guarda el **sello del lote**, no una copia de las cifras, y la
tabla de precios es *append-only*. Esquema minimo:

`insumo_id, region_id, unidad, precio, moneda, iva_incluido, tarifa_iva, entrega, cantidad_minima,
condicion_pago, descuento_aplicado, fuente_id, url_fuente, observado|imputado, capturado_en, confirmado_en,
estado_fuente, vigente_desde, vigente_hasta, lote_id`

| Campo comercial | Tipo | Por que existe |
|---|---|---|
| `iva_incluido` | bool | Las listas de ferreteria y de canal se publican **con IVA**; las de productor, **sin IVA**. Fusionar ambas bajo un mismo `insumo_id` sin este campo mete un error sistematico del tamaño de la tarifa |
| `tarifa_iva` | numero | No se asume 19 %: hay bienes excluidos, exentos y tarifas especiales. Se guarda la que aplico |
| `entrega` | `fabrica` \| `planta` \| `obra` | El flete no incluido es el segundo error sistematico, y en agregados y concreto premezclado puede pesar mas que el IVA |
| `cantidad_minima` | numero + unidad | Un precio por 30 m³ y uno por 1 m³ no son el mismo precio |
| `condicion_pago` | texto corto | Contado / 30 dias / anticipo. Mueve el precio y explica diferencias que si no parecerian error de captura |
| `descuento_aplicado` | numero | Si se aplico descuento de canal o de volumen, se registra: sin el, el precio no es reproducible |

**Base canonica**: sin IVA, puesto en obra, sin descuento, cantidad de referencia declarada por insumo. Todo
precio se convierte a esa base **registrando el factor**, exactamente igual que la conversion de unidades, y
el precio original se conserva. Si un dato no permite la conversion (por ejemplo, lista de ferreteria que no
dice si el precio incluye IVA), **no se convierte a la brava**: se marca `condicion_comercial_desconocida` y
no entra en promedios.

#### 4.3 Publicacion atomica: usar el patron que el repo ya tiene

El indice de competencia se escribe en `indice:competencia:nuevo` y se publica con `RENAME` sobre
`indice:competencia` (`lib/indice_competencia.js`), con fallback documentado cuando el `RENAME` no esta
disponible. Los precios deben seguir el mismo camino: escribir `precios:lote:{sello}`, verificar completitud
y solo entonces mover el puntero. Y el **sello se escribe al final**, con sufijo aleatorio ademas del ISO,
igual que `config:perfiles:version` (CLAUDE.md): dos cargas en el mismo milisegundo produciran sellos
distintos. Nunca debe existir una ventana en la que un APU se calcule con medio lote.

#### 4.4 Para que palanca juridica sirve toda esta trazabilidad

Se construye el aparato de fechas y fuentes porque hay tres usos concretos, y conviene decirlos:

**(a) Restablecimiento de la ecuacion contractual.** La Ley 80 de 1993 consagra el deber de la entidad de
mantener la ecuacion contractual y de restablecerla, y el derecho correlativo del contratista: art. 4
nums. 3 y 8 (deberes de las entidades), art. 5 num. 1 (derechos del contratista) y art. 27 (de la ecuacion
contractual). Sobre esa base, un mayor costo sobreviniente e imprevisible se discute con pruebas de precios
fechadas y con fuente; sin ellas, la reclamacion es una afirmacion. [CONOCIDO — solido, pero antes de citar
articulos en un escrito hay que abrir el texto vigente en el gestor normativo de Funcion Publica o en
`secretariasenado.gov.co`, porque la Ley 80 esta modificada por la Ley 1150 de 2007 y normas posteriores.]

**(b) Formula de reajuste del pliego.** Al descargar un proceso hay que **verificar si el pliego trae
formula de reajuste de precios y con que indice** (tipicamente ICOCIV para obra civil, ICOCED para
edificacion, o IPC). De eso depende que el envejecimiento por indice del apartado 6 sea un **argumento
contractual** —el mismo indice que pacto el contrato— o solo una estimacion interna de Detecta. No es el
mismo valor probatorio. [CONOCIDO — practica corriente; la formula concreta se lee en cada pliego, no se
presume.]

**(c) Regla de negocio que hoy falta en la app.** Al ingerir un proceso, **registrar la fecha del
presupuesto oficial** —o, si no consta, la fecha de los estudios previos y del analisis del sector— y
calcular la **brecha** entre esa fecha y hoy usando el ICOCIV del grupo dominante del contrato:

```
desfase_estimado = presupuesto_oficial × (indice_grupo_hoy / indice_grupo_fecha_presupuesto − 1)
```

Un presupuesto oficial construido hace ocho meses ya viene desfasado, y saber **cuanto** es informacion que
decide si se presenta o no: un desfase del 6 % contra un margen esperado del 8 % convierte una oportunidad
en un problema. Esto es una estimacion propia, se muestra como tal, y no sustituye leer el APU oficial del
proceso.

### 5. Normalizacion de insumos

El problema real es este: `"cemento gris tipo I 50 kg"`, `"CEMENTO PORTLAND GRIS X50KG"` y
`"bulto de cemento"` son el mismo insumo, y ninguna fuente externa se puede fusionar con otra hasta que lo
sean tambien para el sistema. **Sin catalogo maestro no hay pipeline: hay tres listas paralelas.**

Catalogo maestro propuesto — `data/catalogo_insumos.json`:

`insumo_id, nombre_canonico, categoria, unidad_canonica, cantidad_referencia, sinonimos[], patrones[],
factores_conversion{}, base_canonica{iva_incluido:false, entrega:"obra"}, modalidad_tarifa,
unspsc_sugerido, imputable_entre_regiones (bool), radio_acarreo_km, activo`

`modalidad_tarifa` aplica a maquinaria y toma valores `con_operario | sin_operario | con_combustible |
sin_combustible` (combinables). Sin ese atributo, dos tarifas de la misma retroexcavadora pueden diferir un
40 % y el sistema lo leera como dispersion de mercado.

| Presentacion observada | Unidad canonica | Factor |
|---|---|---|
| Bulto de cemento | kg | 50 |
| Tonelada de acero | kg | 1000 |
| Varilla de 6 m (por diametro) | kg | masa lineal × 6 |
| Viaje de volqueta 5 m³ | m³ | 5 |
| Galon ACPM | L | 3,785 |
| Tubo PVC por unidad de 6 m | m | 6 |
| Precio con IVA a base canonica | — | `precio / (1 + tarifa_iva)`, registrando `tarifa_iva` |
| Precio en fabrica a puesto en obra | — | `precio + flete` (ver apartado 6 para el calculo del flete) |

**Conciliacion en cascada**, en este orden:

1. **Coincidencia exacta de la clave canonica.** No `norm` a secas. `norm` (`lib/semantica.js`, lineas
   37-41) hace: **sin tildes (ñ→n), minusculas, espacios colapsados** — y **no elimina puntuacion**. Este
   repositorio ya pago ese error exacto: «… RIOS NEGRO **-** NARE» y «… RIOS NEGRO NARE» se agrupaban al
   contar y no al leer, y partieron una entidad en dos; la solucion fue `claveCanonica`
   (`lib/indice_competencia.js`, linea 152), que es `norm` **mas** eliminacion de puntuacion y simbolos. Los
   nombres de insumo estan llenos de puntuacion variable (`PVC 6" x 6 m` frente a `tubo pvc 6 x 6m`), asi
   que **se reusa `claveCanonica`, no `norm`**, con una normalizacion previa propia del dominio: comillas de
   pulgada (`"`, `”`, `''`) → `pulg`, signo `×` → `x`, y separacion de numero y unidad pegados (`x50kg` →
   `x 50 kg`). Precedente que no hay que repetir: **dos definiciones de la misma clave conviviendo es lo que
   rompio la identidad de entidad.** Aqui debe haber una sola.
2. Sinonimo exacto del catalogo (comparado con la misma clave canonica).
3. Patron con atributos obligatorios (diametro, resistencia, tipo).
4. Similitud de cadenas (trigramas o Jaro-Winkler) **con umbral alto** y desempate por unidad compatible.
5. Por debajo del umbral → cola de revision manual.

Regla dura: **la similitud nunca decide sola cuando cambia un atributo tecnico** — "concreto 3000 psi" y
"concreto 4000 psi" tienen distancia de cadena minima y precios distintos. Los atributos se comparan como
campos, no como texto. Y segunda regla dura, del apartado 4: **dos precios conciliados al mismo `insumo_id`
pero con condicion comercial distinta no se promedian**; se convierten a la base canonica o se dejan
separados.

### 6. Degradacion

Un precio viejo presentado como fresco es peor que no tener precio, porque se cotiza con el sin dudarlo.

Las tres bandas se expresan **en la misma unidad —cadencias declaradas de la fuente—** mas un **tope
absoluto en meses**. Mezclarlas (dos bandas en cadencias y una en meses) hacia que un precio de agregados de
4 meses fuera simultaneamente `vigente` por una regla y `obsoleto` por otra, y el badge dependia de que fila
se evaluara primero.

| Antiguedad del dato | Estado | Comportamiento |
|---|---|---|
| ≤ 1 cadencia de la fuente | `vigente` | Se usa tal cual, badge neutro |
| > 1 y ≤ 3 cadencias | `envejecido` | Se **indexa** (con los limites de 6.1); badge ambar con la fecha de captura |
| **> 3 cadencias, o > 12 meses, lo que ocurra primero** | `obsoleto` | Badge rojo, el APU marca "precio no verificado desde {fecha}" y el insumo entra en la lista de recotizacion obligatoria |
| Fuente en estado `fallo` dos corridas seguidas | `obsoleto` | Igual, con motivo tecnico visible (ver 4.1) |
| Sin dato en la region | `imputado` o `null` | Ver 6.2 |

**Tope absoluto**: en ningun caso un precio se considera vigente mas de **12 meses**, cualquiera que sea la
cadencia declarada de su fuente. Una fuente anual con un año de antiguedad esta al limite por definicion.

#### 6.1 Envejecimiento por indice: es un parche, con fecha de caducidad

```
precio_hoy = precio_observado × (indice_hoy / indice_en_captura)
```

Tres reglas, y las tres hacen falta:

1. **Se indexa con el subindice mas desagregado que publique la fuente**, no con el grupo. Si el ICOCED
   publica subgrupo «cemento», se usa ese y no el grupo «materiales». Solo si no existe subindice
   desagregado se sube de nivel, y se anota que se subio.
2. **Si el insumo es mas volatil que el grupo con el que se lo indexaria, el envejecimiento por indice se
   prohibe mas alla de una cadencia: se vuelve a cotizar.** El caso claro es el acero contra el grupo
   «materiales» del ICOCIV (apartado 1.1): indexar el insumo mas volatil con el indice mas agregado
   subestima el costo de forma sistematica **y siempre en la misma direccion**, que es exactamente el sesgo
   que este documento denuncia al fijar cadencias.
3. **Un indice mide la variacion promedio de una canasta, no el precio de un insumo.** Indexar es un parche
   con fecha de caducidad, no un sustituto de la cotizacion. El badge ambar existe para decir eso en
   pantalla, no para tranquilizar.

#### 6.2 Imputacion regional: definida, acotada y con casos prohibidos

La formula «precio de region vecina × factor de transporte» no significa nada mientras el factor no este
definido. Definicion:

```
precio_imputado = precio_region_origen + flete
flete = tarifa ($/ton-km o $/m³-km) × distancia_real_por_carretera_km × (peso o volumen por unidad)
```

- La **tarifa** no se inventa: sale del **SICE-TAC** de MinTransporte (Sistema de Informacion de Costos
  Eficientes para el Transporte Automotor de Carga), que calcula costos de operacion por ruta, tipo de
  vehiculo y tipo de carga [CONOCIDO — herramienta publica de MinTransporte; **URL no verificada aqui**,
  buscar "SICE-TAC" en `mintransporte.gov.co`]. Alternativa de contraste: los propios factores de acarreo de
  los APU Regionalizados de INVIAS.
- La **distancia** es distancia real por carretera entre origen y sitio de obra, no distancia en linea
  recta.
- Todo precio asi obtenido se marca `imputado` con `metodo_imputacion` y con la tarifa y distancia usadas.
  **Un precio imputado nunca se presenta como observado.**

**Prohibicion explicita — insumos de peso muerto.** Para agregados (arena, triturado, base, sub-base) y
concreto premezclado **no se imputa desde otra region mas alla del radio economico de acarreo**
(`radio_acarreo_km` del catalogo). Es coherente con lo que este mismo documento sostiene: en agregados el
flete domina y la cantera es local, o sea que el precio de la region vecina **no informa nada** sobre el
precio local. Fuera de ese radio el valor se deja en `null` y la pantalla dice **"sin dato, cotizar cantera
local"**. Es la misma regla del repo: **cero no es «sin dato»**, y una formula que produce un numero creible
a partir de nada es peor que un hueco visible, porque el hueco se cotiza y el numero creible se firma.

Dos reglas heredadas del repo que aqui aplican igual: un precio ausente se representa como `null` y nunca
como 0 (como `anticipo_pct = 0` y "0 oferentes = sin dato"); y **la pantalla nunca oculta la incertidumbre**
— el badge de antiguedad es obligatorio y la interpolacion de una cifra exige base suficiente, exactamente
el criterio `conBase` del badge de competencia.

#### Fuentes citadas

| Fuente | Etiqueta | URL / referencia |
|---|---|---|
| DANE — ICOCIV (obras civiles), boletines mensuales | [VERIFICADO vía busqueda; pagina no abierta, 403 del proxy en dos sesiones] | https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-obras-civiles-icociv |
| DANE — boletin ICOCIV mar-2026 (variacion mensual 1,02 %) | [VERIFICADO vía busqueda] | https://www.dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-mar2026.pdf |
| DANE — ICOCIV, variaciones anuales 2025 por grupo (total 4,31 %; transporte 8,02 %; mano de obra 6,77 %; maquinaria 6,11 %) | [APORTADO — no verificado aqui; confirmar en el boletin ICOCIV de diciembre 2025] | Boletin ICOCIV dic-2025 en la ruta `dane.gov.co/files/operaciones/ICOCIV/` |
| DANE — ICOCED (edificaciones): 8 grupos de costo, 54 subgrupos, 93 insumos | [VERIFICADO vía busqueda] | https://www.dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-edificaciones-icoced |
| **INVIAS — Analisis de Precios Unitarios (APU) Regionalizados de Referencia.** Regionalizan precios de insumos, factores prestacionales y rendimientos de mano de obra y equipo para **140 provincias o subregiones** del pais (todas salvo Bogota D.C.), en descarga publica. **Advertencia del propio INVIAS: son estrictamente referenciales y no sustituyen el analisis del proponente** | [APORTADO — URL declarada; el intento de apertura en esta sesion devolvio 403 del proxy] | https://www.invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/ |
| UPIT / INVIAS — Calculadora de Costos para vias secundarias y terciarias | [APORTADO — existencia declarada, no verificada; buscar en `invias.gov.co` y en el sitio de la UPIT] | Pendiente de URL |
| MinTransporte — SICE-TAC (costos eficientes de transporte automotor de carga) | [CONOCIDO — URL no verificada] | Buscar "SICE-TAC" en `mintransporte.gov.co` |
| Salario minimo 2026 = $1.750.905; auxilio $249.095 (Decretos 1469 y 1470 de 2025) | [VERIFICADO vía busqueda] | https://www.hklaw.com/en/insights/publications/2025/12/colombia-decreta-aumento-del-salario-minimo-y-auxilio-de-transporte |
| Decreto 0159 de 2026 (transitorio, sostiene el aumento durante la suspension) | [APORTADO — no verificado] | Gestor normativo de Funcion Publica, buscar "Decreto 159 de 2026" |
| Consejo de Estado, Seccion Segunda — autos de 13/02/2026 (suspension provisional del Decreto 1469 de 2025), 14/04/2026 (niega recursos) y 17/07/2026 (revoca la suspension) | [APORTADO — no verificado; sin numero de radicado] | Relatoria del Consejo de Estado, `consejodeestado.gov.co` |
| Ley 278 de 1996, art. 8 (Comision Permanente de Concertacion; fundamento de la suspension) | [CONOCIDO] | Verificar en gestor normativo de Funcion Publica |
| CREG — Resolucion 104 004 de 2026, estructura de precios gasolina/ACPM | [VERIFICADO vía busqueda] | https://gestornormativo.creg.gov.co/gestor/entorno/docs/originales/Resoluci%C3%B3n_CREG_104_004_2026/Resoluci%C3%B3n_CREG_104_004_2026.pdf |
| Calculo **semanal** del ingreso al productor de ACPM (promedio simple lunes-viernes de la semana anterior, publicacion lunes, vigencia martes; primera aplicacion prevista 6-10 abr-2026). **Es resolucion de MinHacienda/MinMinas, no de la CREG** | [INCIERTO — reportado como proyecto; confirmar si se expidio en firme] | https://cambiocolombia.com/economia/articulo/2026/3/precio-acpm-formula-cuanto-cuesta-gobierno ; buscar la resolucion conjunta en `minhacienda.gov.co` y `minenergia.gov.co` |
| Ecopetrol — precios de referencia de asfalto | [CONOCIDO — no verificado] | Buscar "lista de precios asfalto" en `ecopetrol.com.co`; contrastar con planta local |
| Banco de la Republica / Superfinanciera — TRM diaria | [CONOCIDO — endpoint no verificado en esta sesion] | TRM oficial la certifica la Superintendencia Financiera y la publica el Banco de la Republica |
| Paz del Rio / Gerdau Diaco — listas de productor de acero de refuerzo | [CONOCIDO — no verificado; listas suelen entregarse a cliente, no publicarse abiertas] | Solicitar lista vigente al distribuidor autorizado |
| Pavco Wavin / Durman — listas de tuberia PVC | [CONOCIDO — no verificado; el precio efectivo depende del descuento de canal] | Solicitar lista y matriz de descuentos al distribuidor |
| Ley 80 de 1993, art. 4 nums. 3 y 8, art. 5 num. 1, art. 27 (ecuacion contractual y su restablecimiento) | [CONOCIDO] | Verificar texto vigente en gestor normativo de Funcion Publica (la Ley 80 esta modificada) |
| Ley 1273 de 2009, art. 269A | [VERIFICADO vía busqueda; cita literal por reconfirmar] | https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=34492 |
| Ley 1581 de 2012 (habeas data) | [CONOCIDO] | Verificar en gestor normativo de Funcion Publica |
| Decision Andina 351 de 1993, art. 4 lit. ll) (compilaciones de datos) y art. 28 | [CONOCIDO — intento de apertura fallido (403)] | Verificar texto en comunidadandina.org o sice.oas.org |
| Ley 23 de 1982 (derecho de autor) | [CONOCIDO] | Verificar en secretariasenado.gov.co |
| Construdata / Legis — condiciones de suscripcion y de uso | [CONOCIDO] | Verificar plan comercial vigente |

Nota de metodo: este entorno bloquea la salida a varios dominios oficiales. En las dos sesiones de trabajo
sobre esta seccion, **todos** los `WebFetch` a dane.gov.co, invias.gov.co, secretariasenado.gov.co,
funcionpublica.gov.co y sice.oas.org devolvieron **403 del proxy**, y el presupuesto de busqueda web quedo
agotado. Lo marcado "[VERIFICADO vía busqueda]" se confirmo por el resultado del buscador (existencia de la
URL y contenido resumido), no por lectura de la pagina. Lo marcado "[APORTADO]" entro por la revision del
documento con su procedencia declarada y **esta pendiente de comprobacion de primera mano**. Ninguna cifra
de este documento esta sin etiqueta, y **ninguna cifra se escribio de memoria haciendola pasar por medida**.

#### Vacios y siguiente paso

1. **Cifras del ICOCIV 2025 y subindices del ICOCED**: es el vacio mas caro, porque de el depende la regla
   6.1 y la calibracion de la columna de volatilidad. Descargar los boletines y anexos de ICOCIV (dic-2025 y
   los mensuales de 2026) y de ICOCED, y construir una tabla de variacion anual por grupo **y por
   subgrupo**. Con eso, la columna «volatilidad esperada [SUPUESTO]» del apartado 1 se sustituye por
   variacion medida y deja de ser juicio.
2. **Estructura de descarga del ICOCIV**: comprobar si el DANE publica anexos `.xlsx`/`.csv` con URL estable
   y predecible por mes. Si la tiene, la extraccion es un `GET` mensual sin scraping; si no, hay que parsear
   el PDF del boletin. Mirar la pagina de "informacion historica" del ICOCIV.
3. **Cita literal del art. 269A**: se confirmo la existencia y el sentido, no el texto palabra por palabra.
   Abrir `secretariasenado.gov.co/senado/basedoc/ley_1273_2009.html` desde una red sin proxy y pegar el
   texto exacto antes de usarlo en cualquier documento con valor externo.
4. **Alcance real de la Decision 351 sobre bases de datos**: leer el art. 4 lit. ll) y confirmar si Colombia
   tiene o no un derecho *sui generis* sobre bases de datos (a diferencia de la UE, la respuesta que se cree
   correcta es que **no**, solo proteccion por seleccion o disposicion creativa) — [INCIERTO, confirmar].
5. **ACPM semanal**: confirmar si la resolucion conjunta MinHacienda/MinMinas se expidio en firme o quedo en
   proyecto, y desde que fecha rige. Hasta entonces el nivel semanal del pipeline queda diseñado pero
   apagado y el ACPM se trata como mensual.
6. **Cronologia del salario minimo 2026**: la secuencia del apartado 1.3 es correcta en lo sustancial —la
   base 2026 es $1.750.905 y no hay reproceso— pero faltan los **numeros de radicado** de los tres autos del
   Consejo de Estado y la fecha exacta del Decreto 0159 de 2026. Buscarlos en la relatoria antes de citar
   la cronologia fuera de este documento.
7. **APU Regionalizados de INVIAS: descargarlos y perfilarlos.** Es la fuente mas prometedora de todo el
   documento y la unica candidata a resolver el precio por insumo **y por region** en una sola descarga
   publica. Lo que hay que comprobar: (a) formato real (PDF, Excel, o base consultable); (b) fecha de la
   edicion vigente y periodicidad de actualizacion; (c) si el desglose llega a precio de insumo o se queda
   en precio de item de obra; (d) que codificacion de insumo usa, para mapearla al `insumo_id` del catalogo
   maestro. Recordar la advertencia del propio INVIAS: **son precios estrictamente referenciales y no
   sustituyen el analisis del proponente**, asi que entran al sistema como fuente `observado` de referencia,
   nunca como precio de oferta.
8. **Cobertura fina por municipio**: los APU Regionalizados cubren 140 provincias o subregiones, lo cual
   resuelve la region pero **no el municipio**. Para el ultimo tramo siguen haciendo falta cotizaciones
   locales (cantera, planta de concreto, ferreteria) y los presupuestos oficiales de SECOP II. Ese es el
   argumento mas fuerte para construir el catalogo maestro primero: sin `insumo_id` no hay forma de fusionar
   INVIAS, DANE, listas de productor y cotizaciones locales en una sola serie.


---

## 1.G — Adaptacion al pliego: extraccion de PDFs, cantidades y especificaciones

> **Nota de verificacion.** En esta corrida el presupuesto de WebSearch de la sesión estaba agotado
> (200/200) y `WebFetch` devolvió **403 en los cuatro hosts externos probados** (colombiacompra.gov.co,
> funcionpublica.gov.co, standard.open-contracting.org, dane.gov.co). Por tanto **ninguna fuente
> externa pudo abrirse en esta corrida**. Etiquetas: `[VERIFICADO]` = código de este repositorio,
> leído ahora; `[CONOCIDO]` = conocimiento sólido de entrenamiento, **sin confirmar en esta corrida**,
> con la vía de confirmación indicada; `[INCIERTO]` = hay que comprobarlo antes de usarlo;
> `[SUPUESTO]` = número puesto por este informe para poder razonar, a calibrar.
> **Ninguna cifra normativa de este documento debe llevarse a una oferta sin que el abogado o el
> contador la confirme contra el texto vigente.**

### 1. Qué hay en un pliego y qué vale

Un proceso de obra en SECOP II publica un paquete de documentos. Ordenados por valor **para este
sistema** (no por importancia jurídica):

| # | Documento | Qué aporta al motor | Formato típico | Valor |
|---|---|---|---|---|
| 1 | **Formulario 1 / Lista de cantidades / Presupuesto oficial** | ítem, descripción, **unidad, cantidad** y a veces **valor unitario oficial** y total | .xlsx muy a menudo; PDF si no | **Máximo.** Es el APU adaptado al proceso, ya casi resuelto |
| 2 | **Especificaciones técnicas particulares** | resistencias, diámetros, clases, espesores, normas INVIAS/NSR aplicables | PDF nativo | Alto: convierte un ítem genérico en un ítem costeable |
| 3 | **Anexo técnico / estudios previos** | alcance, localización exacta, distancias de acarreo, plazo, AIU declarado | PDF | Alto |
| 4 | **APU de referencia de la entidad** (cuando existe) | rendimientos y precios que la entidad considera razonables | Excel/PDF | Alto pero **poco frecuente**; más común en entidades grandes |
| 5 | **Pliego de condiciones** | requisitos habilitantes (K, experiencia, indicadores), **alternativas de ponderación de la oferta económica y regla de sorteo por TRM**, anticipo y pago anticipado | PDF | **Alto: fija el precio de oferta** (ver §5.bis), además del juicio "puedo/no puedo" |
| 6 | **Adendas** | **modifican cualquiera de los anteriores**, incluidas cantidades y la fecha/hora de la TRM del sorteo | PDF | Crítico como *invalidador*: un parseo sin adendas puede estar obsoleto |
| 7 | Matriz de riesgos | riesgos **previsibles** asignados al contratista → **se costean explícitamente** (ítem propio o mayor U); la **"I"** del AIU cubre lo **NO previsible** y no es donde se mete la matriz. Fuerza mayor y hecho del príncipe quedan fuera de ambas: son restablecimiento del equilibrio económico, no AIU | Excel/PDF | Medio-alto |
| 8 | Minuta del contrato | **anticipo** (se amortiza, no ingresa al patrimonio) y **pago anticipado** (sí ingresa) como campos **distintos**; retenciones, pólizas, requisitos de fiducia | PDF | Bajo para el costo directo, **alto para el flujo de caja** |

La jerarquía es tajante: **el formulario de cantidades vale más que todo lo demás junto**. Con
ítem + unidad + cantidad se puede valorar el proceso completo con precios propios; sin él, hay que
inferir cantidades del objeto, que es adivinar.

**Subproducto estratégico, con una precisión que no es un matiz.** Si el formulario trae el precio
unitario oficial, se puede construir un **observatorio de precios unitarios oficiales por entidad,
región y año**. Ese precio es **lo que la entidad PRESUPUESTA (el techo del proceso)**, no lo que
paga. Lo realmente pagado exige cruzar con el **valor adjudicado**, que ya vive en el keyspace
`licitaciones:historico:mes:*` [VERIFICADO: `CAMPOS_VALOR_ADJUDICADO = ["valor_total_adjudicacion",
"valor_adjudicado", "valor_adjudicacion"]` en `lib/indice_competencia.js`, conservadas solo por la
proyección histórica en `lib/proyeccion.js`]. Por eso se guardan **tres campos distintos**, nunca uno:

| Campo | Qué es | Fuente |
|---|---|---|
| `unitario_oficial` | precio unitario del Formulario 1 = **techo presupuestado** | adjunto del proceso |
| `valor_adjudicado_proceso` | valor por el que se firmó | corpus histórico (`CAMPOS_VALOR_ADJUDICADO`) |
| `baja_pct` | `1 − valor_adjudicado_proceso / precio_base` | derivado |

Un presupuesto oficial **por debajo de mercado** es una trampa. Un presupuesto **por encima** es
**mayor holgura frente al techo, NO margen**: el margen lo fija la **baja** que imponga el método de
ponderación (§5.bis), y en tres de las cuatro alternativas típicas ofertar cerca del techo **pierde**.
Confundir holgura con margen es el mismo error que confundir margen con baja.

### 2. Acceso: ¿se pueden descargar los adjuntos programáticamente?

**Este punto decide si toda la sección es implementable. Hoy no está resuelto y no se puede
resolver desde este entorno.** Lo que sí está establecido:

- **El repo ya guarda el enlace al proceso.** `lib/proyeccion.js` conserva `urlproceso`,
  normalizando el tipo URL de Socrata (`{url, description}` → string) [VERIFICADO:
  `/home/user/portafolio-estrategico/lib/proyeccion.js` líneas 68-70]. Los fixtures del repo usan el
  patrón `community.secop.gov.co/Public/Tendering/OpportunityDetail/Index?noticeUID=CO1.NTC.<n>`
  [VERIFICADO: `/home/user/portafolio-estrategico/tests/e2e.js:153`]. Es decir: **la puerta de
  entrada ya está en Redis para cada proceso**, no hay que re-extraer nada para intentarlo.
- **SECOP II es una plataforma transaccional con frontend pesado** (ASP.NET, navegación por
  postback, cookies de sesión anónima) y los adjuntos suelen servirse por un *handler* con
  identificador interno del documento, no por URL estática predecible [CONOCIDO — no verificado].
  Si esto se confirma, un `fetch` simple no basta: hace falta (a) mantener cookies, (b) leer la
  página para descubrir los identificadores de documento, y en el peor caso (c) un navegador
  headless, **imposible dentro de una función serverless de este proyecto**.
- **La proyección de este repo no LEE ninguna columna de adjuntos** [VERIFICADO: `CAMPOS` en
  `lib/proyeccion.js` es una **lista blanca** y `proyectar()` descarta todo lo no listado]. Si el
  dataset trajera una columna de documentos, **se estaría perdiendo justo ahí** y el corpus no lo
  delataría. Que `p6dx-8zbt` **no publique** adjuntos es **[INCIERTO]**: la lista blanca de este repo
  no prueba nada sobre el dataset. Lo resuelve E2.
- **Vía OCDS.** [CONOCIDO, confirmado por búsqueda web en la revisión previa de este documento y **no
  re-verificable en esta corrida**]: la Agencia Nacional de Contratación Pública – Colombia Compra
  Eficiente figura como **publicador registrado en el OCP Data Registry** y declara publicar en
  **OCDS/EDCA**. Lo **[INCIERTO]** es solo (a) si `tender.documents[]` viene **poblado**, (b) si trae
  `documentType` útil (`biddingDocuments`, `technicalSpecifications`, **`billOfQuantity`** — el premio
  gordo) y (c) si esas `url` son **descargables sin sesión**. Lo resuelve E1'.

**Experimentos en producción (concretos, en este orden; los cuatro primeros cuestan minutos):**

| E | Petición exacta | Qué mirar en la respuesta | Decide |
|---|---|---|---|
| E1 | `GET <urlproceso>` con `fetch` desnudo, sin cookies, UA de navegador | código HTTP; `set-cookie`; si el HTML trae `<a href>` a ficheros o solo `__doPostBack`; nombres tipo "Formulario", "Anexo" | Si hay `href` directos → **todo lo demás es implementable**. Si solo hay postbacks → hace falta sesión |
| E1' | Bajar **un release OCDS de CCE** por `ocid` y volcar `tender.documents[]` | ¿array vacío o poblado? ¿qué `documentType`? ¿la `url` responde 200 sin cookies y con MIME de fichero? | Si viene poblado y descargable, **E1 sobra**: vía limpia, sin scraping |
| E2 | `GET https://www.datos.gov.co/api/views/p6dx-8zbt.json` | lista completa de columnas reales | Cierra si hay columna de documentos **y** el pendiente de oferentes/adjudicación de `lib/indice_competencia.js` [VERIFICADO: el módulo declara esas listas como "candidatas, pendiente verificación"] |
| E3 | `GET https://api.us.socrata.com/api/catalog/v1?domains=www.datos.gov.co&q=documentos+proceso` | si existe un dataset de *documentos del proceso* con URL por proceso | Vía limpia alternativa |
| E4 | Repetir E1/E1' sobre **10-30 procesos** de entidades distintas | tasa de acceso, MIME devueltos, **% bajo documento tipo** | Da `p_acceso` y las proporciones del §7, hoy sin medir |

Sin E1/E1' respondidos, **el resto de esta sección es diseño, no plan de obra**. Si ambos fallan, lo
viable es *asistir* la descarga manual (el dueño baja el .xlsx, lo sube por un endpoint tipo
`/api/admin/rup`, y el sistema lo parsea) — y el parseo se reutiliza íntegro.

### 3. Extracción de tablas: qué cabe en Vercel y qué no

Restricción dura del proyecto: **sin `package.json` y sin dependencias, CommonJS puro**
[VERIFICADO: `CLAUDE.md`]. Cualquier librería rompe esa invariante y debe justificarse.

| Técnica | Runtime | ¿Cabe aquí? | Comentario |
|---|---|---|---|
| **.xlsx propio, sin librería** | Node nativo (`zlib` ya se usa) | **Sí** | Un `.xlsx` es un ZIP de XML. Con el directorio central del ZIP + `inflateRaw` + un parseo tosco de `xl/worksheets/sheet1.xml` y `xl/sharedStrings.xml` se leen celdas con **cero dependencias** [CONOCIDO: OOXML es estándar abierto] |
| SheetJS (`xlsx`) | Node, JS puro | Sí, con coste | ~1 MB, robusto, lee `.xls` viejo también. Rompe la regla de "sin dependencias" |
| `pdfjs-dist` (build *legacy*) | Node, JS puro | Sí, a regañadientes | Única vía seria en Node para **texto con coordenadas** (`getTextContent` devuelve items con matriz de transformación) [CONOCIDO]. Pesa decenas de MB; hay que sacarlo del *request path* |
| `pdf-parse` | Node | Sí, pero inútil para tablas | Envuelve pdf.js y **aplana a texto**: pierde columnas. Sirve solo para prosa (§5) |
| Camelot / pdfplumber | Python | **No** | Segundo runtime en un proyecto que presume de no tener ninguno |
| Tabula | Java (JVM) | **No** | Imposible en el runtime Node de Vercel |
| OCR (Tesseract / `tesseract.js`) | WASM | **No en el mismo proceso** | Datos entrenados de decenas de MB y segundos por página; exige servicio externo o proceso local |

Consecuencia arquitectónica: la extracción **no puede ocurrir mientras el usuario espera**. El
patrón correcto es el que ya usa la app: endpoint con token, presupuesto de tiempo, reanudable, y
resultado guardado en Redis en chunks deflate ≤500 KB [VERIFICADO: límites en `CLAUDE.md`].

### 4. Heurísticas de parseo y la validación aritmética

**Reconocer la tabla** (sin modelo entrenado, sobre texto normalizado en mayúsculas y sin tildes —
la app ya tiene `norm` en `lib/semantica.js` [VERIFICADO]):

- **Cabeceras**: `ITEM|No|NUMERAL` · `DESCRIPCION|ACTIVIDAD|CONCEPTO|OBRA` ·
  `UNIDAD|UND|UN|U.M.` · `CANTIDAD|CANT` · `VALOR UNITARIO|VR UNITARIO|PRECIO UNITARIO|V/UNIT` ·
  `VALOR TOTAL|VR TOTAL|VALOR PARCIAL|SUBTOTAL`. Con ≥3 en una misma fila → fila de cabecera; sus
  posiciones X definen las columnas.
- **Firma de fila de ítem por la unidad**: `M3, M2, ML, M, KM, KG, TON, UN, UND, GL, GLB, HA, LB,
  VIAJE, DIA, MES, HR, PULG`. Una celda que es exactamente una de estas es la señal más barata y
  fiable de que la fila es un ítem de obra.
- **Numeración jerárquica**: `/^\d+(\.\d+)*$/`. Un ítem de un solo nivel *sin* unidad ni cantidad es
  un **título de capítulo**; la profundidad reconstruye el árbol.
- **PDF nativo**: agrupar items de `getTextContent` por coordenada Y (tolerancia ≈ ½ altura de
  línea) para formar filas; agrupar por X (histograma de bordes) para columnas. Los números van
  alineados a la derecha → usar el **borde derecho** como referencia.
- **Números en formato colombiano**: punto de miles, coma decimal (`1.234.567,89`), con `$` y
  espacios sueltos. Regla: si hay coma, la coma es decimal; si solo hay puntos y el último grupo
  tiene exactamente 3 dígitos → miles; si tiene 1-2 → decimal. La ambigüedad residual la resuelve la
  aritmética.

**Tres niveles de validación, con tolerancias derivadas de la fuente del error:**

| Nivel | Invariante | Tolerancia | Por qué esa y no otra | Qué detecta |
|---|---|---|---|---|
| Fila | `cantidad × unitario = total` | `max(cantidad/2 + 1, $1)` **pesos** | el error por redondear el **unitario** al peso es `cantidad × 0,5`; el `+1` cubre el redondeo del propio total. **No depende del total** | columnas mal asignadas, decimales mal leídos, celdas corridas |
| Capítulo | `Σ filas hijas = subtotal del capítulo` | `max($10, 0,1 % del subtotal)` | aquí **sí** se acumulan redondeos de muchas filas | filas perdidas o duplicadas, saltos de página mal cosidos |
| Documento | `Σ capítulos = presupuesto oficial` | `0,5 %` (ver abajo) | acumulación de todos los capítulos | tabla incompleta, segunda hoja no leída |

Un porcentaje del total en el nivel Fila es **incorrecto en las dos direcciones**: en una fila de
$500 M un 0,5 % admite $2,5 M y esconde un dígito mal leído — justo lo que la regla debía cazar —, y
en una fila barata con cantidad enorme (40.000 kg) se queda corta y produce falsos rojos.

**Nivel Documento: el AIU se LEE, no se adivina.** El ancla externa es `precio_base`, ya proyectado
desde Socrata [VERIFICADO: `CAMPOS` en `lib/proyeccion.js`]. El presupuesto oficial de obra suele
publicarse con **AIU**, y sobre la **utilidad** se causa IVA [CONOCIDO: art. 3 del Decreto 1372 de
1992, compilado en el DUR 1625 de 2016 — **norma a confirmar con el contador antes de usarla en un
número de oferta**]. Entonces:

```
costo_directo_esperado = precio_base / (1 + A + I + U + t·U)        con t = 0,19
variante sin IVA:        costo_directo_esperado = precio_base / (1 + A + I + U)
```

Se prueban **ambas variantes** y se registra **cuál cuadró** (es información sobre cómo presupuesta
esa entidad). Ignorar `t·U` no es un detalle: con `U = 10 %` el IVA añade ≈ **1,9 puntos
porcentuales** al presupuesto, casi **cuatro veces** la tolerancia del 0,5 %, así que el chequeo
fallaría de forma sistemática justo en los presupuestos que se acaban de describir como típicos.

Orden de precedencia, para no caer en validación circular:

1. **AIU declarado en el pliego.** En los documentos tipo va declarado [CONOCIDO, ver §6]. Si se
   consigue, el nivel Documento se verifica **con ese valor fijo** y puede producir **verde**.
2. **Barrido diagnóstico.** Si no hay AIU declarado, se barre `A + I + U` en **10-35 %**
   [SUPUESTO explícito, a calibrar con los 20-30 pliegos que el propio equipo va a leer; componentes
   de referencia A 5-15 %, I 1-5 %, U 5-10 % → 11-30 %, coherentes con el barrido]. El resultado es
   **diagnóstico y NUNCA produce verde**: con un parámetro libre continuo de 25 puntos, casi
   cualquier suma de costos directos encuentra un AIU que "cuadra", incluidas las tablas incompletas
   que este nivel debía cazar.
3. Si un factor cuadra a <0,5 %, **se ha obtenido un AIU compatible**; solo es evidencia si
   **coincide con el AIU declarado en el pliego dentro de ±0,5 pp**. No se ha "descubierto" nada: se
   ha ajustado un parámetro libre a un dato.

**Semáforo de confianza: matriz de dos ejes** (sin huecos, mismo espíritu que la pertinencia
verde/amarilla ya existente):

| Filas que cuadran | Total cuadra con AIU **declarado** | Total no cuadra (o solo cuadra por barrido) |
|---|---|---|
| **≥ 98 %** | 🟢 **Verde** — se usa automáticamente | 🟡 **Amarillo** |
| **90-98 %** | 🟡 **Amarillo** | 🟡 **Amarillo** |
| **< 90 %** | 🔴 **Rojo** — se descarta el parseo entero | 🔴 **Rojo** |

Regla de uso: **nunca se USA AUTOMÁTICAMENTE una lista a medias**. El amarillo se muestra con aviso
y conteo de ítems, y **exige confirmación humana antes de valorar**; el rojo no se muestra como lista
de cantidades. Aquí —al revés que en el filtrado de oportunidades— **el falso positivo cuesta más que
el falso negativo**: un ítem perdido en una licitación es un riesgo económico directo.

Caso frecuente y benigno: la entidad publica **cantidades sin precios unitarios**. Entonces el nivel
Fila no existe, el Documento tampoco, y la única validación es estructural (unidades válidas,
jerarquía consistente, sin filas huérfanas). Sigue siendo **la mayor parte del valor**: con ítem +
unidad + cantidad ya se puede valorar el proceso con precios propios [SUPUESTO, no medido; la
métrica que lo mediría es *% de procesos valorables sin intervención manual*].

### 5. Especificaciones que mueven el precio

Todas las magnitudes de la tabla son **estimaciones de orden [CONOCIDO], no cifras verificadas**;
se calibran con una base de precios real (IDU, gobernaciones, Construdata) — inaccesible desde este
entorno.

| Especificación detectada (patrón) | Parámetro del APU que cambia | Efecto aproximado |
|---|---|---|
| Concreto `2500/3000/4000 PSI`, `17/21/28 MPa` | dosificación de cemento (kg/m³) | 3000→4000 PSI ≈ **+8-15 %** en el m³ |
| Acero `fy 420`, `grado 60`, `malla electrosoldada` | insumo y % de desperdicio (figuración) | grado 60 es el caso base; malla cambia el insumo entero |
| Mezcla asfáltica `MDC-19`, `MDC-25` + espesor | ton/m² de carpeta; planta y acarreo | espesor domina: lineal en toneladas |
| Base/subbase `BG-38`, `BG-A`, `SBG`, CBR exigido | fuente de material (cantera calificada) + transporte | CBR alto restringe cantera → **+10-30 %** por acarreo |
| Tubería `PVC RDE 21/26/41`, `Novafort`, diámetro `Ø` | espesor de pared y precio del ml | RDE 41→21 (más pared) puede **duplicar** el ml |
| Excavación `manual` vs `mecánica`, `en roca`, `con nivel freático` | rendimiento de mano de obra/equipo, bombeo | manual/roca: **×2-4** en mano de obra |
| Distancia de acarreo (km), municipio rural | ítem de transporte y sobreacarreo | dominante en obra rural |
| Norma citada: `NSR-10`, `INVIAS art. 4xx/3xx` | ensayos y control de calidad | añade ítems de laboratorio |
| **AIU declarado en el pliego** | no toca el costo directo; entra en el **precio de oferta** | ver §5.bis |
| **Anticipo pactado** | obliga **fiducia o patrimonio autónomo irrevocable** para su manejo en contratos de **obra**, concesión y salud que **no** sean de menor ni mínima cuantía, **y en todos los adelantados por licitación pública** [CONOCIDO: art. 91 Ley 1474 de 2011] | **costo de la fiducia → va a la "A"** del AIU. No es gratis y se olvida |
| **Riesgos previsibles asignados** (matriz) | ítem propio o mayor **U** | **no** se diluye en la "I" |

**Anticipo ≠ pago anticipado, y la app ya arrastra el campo.** El **anticipo** es dinero público que
se **amortiza** contra las actas y **no ingresa al patrimonio** del contratista; el **pago
anticipado** sí ingresa. La **suma de ambos** está topada en el **50 % del valor del contrato**
[CONOCIDO: parágrafo del art. 40 de la Ley 80 de 1993]. En el corpus, `anticipo_pct = 0` significa
**"sin dato"**, no "sin anticipo" [VERIFICADO: `CLAUDE.md`], así que el pliego es la única fuente
real de este par de números.

Extracción: estas señales viven en **prosa**, no en tablas, así que `pdf-parse` (texto plano) basta
y la infraestructura de vocabularios de `lib/semantica.js` es directamente reutilizable
[VERIFICADO: el repo ya compara sobre texto normalizado].

### 5.bis Método de ponderación y precio de oferta

**El error más caro de esta sección sería asumir que gana el más barato.** En los **documentos tipo
de licitación de obra pública** de Colombia Compra Eficiente, el método de evaluación de la oferta
económica **no lo elige la entidad**: el pliego lista varias alternativas y **se sortea** con los
**centavos (decimales) de la TRM** certificada por la **Superintendencia Financiera** para una
**fecha y hora que el propio pliego fija** [CONOCIDO — no verificable en esta corrida; se confirma
abriendo el documento tipo vigente en colombiacompra.gov.co y leyendo el numeral de "oferta
económica"]. Las familias de fórmula que aparecen habitualmente son:

| Familia de fórmula | Quién gana | ¿Ofertar barato ayuda? |
|---|---|---|
| **Menor valor** | la oferta más baja hábil | **Sí** |
| **Media aritmética** (de ofertas hábiles, a veces con el presupuesto oficial dentro) | la más cercana a la media | **No**: bajar de más aleja del centro |
| **Media aritmética baja / alta** | la más cercana a la media de un subconjunto | **No** |
| **Media geométrica** (con o sin presupuesto oficial) | la más cercana a la media geométrica | **No** |
| **Mediana** (con valor absoluto de la desviación) | la más cercana a la mediana | **No** |

Consecuencia operativa, y es la que gobierna todo el §4: **el APU extraído alimenta el COSTO, no el
precio de oferta.** El precio de oferta se fija **después**, simulando **todas** las alternativas del
pliego contra un supuesto de distribución de las ofertas rivales, y el número final es un
compromiso entre "ganar" y "no perder plata". El **índice de competencia por entidad** que la app ya
calcula entra aquí: cuántos oferentes se esperan es exactamente el parámetro que hace falta para
simular una media o una mediana.

Qué debe extraer el parser del pliego, como campos propios:

| Campo | Tipo | Origen en el pliego |
|---|---|---|
| `ponderacion_alternativas[]` | lista de enum (`menor_valor`, `media_aritmetica`, `media_geometrica`, `mediana`, …) | numeral de evaluación de la oferta económica |
| `ponderacion_sorteo` | enum (`trm_decimales`, `otro`) + texto literal de la regla | mismo numeral |
| `trm_fecha_hora` | timestamp | mismo numeral; **puede cambiar por adenda** |
| `puntaje_economico` / `puntaje_calidad` / `puntaje_industria_nacional` | número | tabla de puntajes |
| `aiu_declarado` | `{A, I, U}` | presupuesto oficial / anexo técnico |
| `anticipo_pct`, `pago_anticipado_pct` | número, número | minuta / pliego |

Validación de extracción obligatoria: **`anticipo_pct + pago_anticipado_pct ≤ 50 %`** [CONOCIDO:
parágrafo art. 40 Ley 80 de 1993]. Si el parseo produce más, el parseo está mal, no el pliego.

### 6. Formato de salida exigido por la entidad

**Antes que nada: los documentos tipo.** La **Ley 2022 de 2020**, modificada por la **Ley 2160 de
2021**, hace los documentos tipo adoptados por Colombia Compra Eficiente de **obligatorio
cumplimiento** para las entidades regidas por el Estatuto General de la Contratación, y el
**Formulario 1 es precisamente el "Formulario de Presupuesto Oficial" estandarizado** [CONOCIDO —
no verificable en esta corrida; se confirma en colombiacompra.gov.co/documentos-tipo y en el texto
de las dos leyes]. Consecuencia directa: **una fracción grande de los procesos de obra comparte UNA
sola plantilla, no N plantillas**. Mapear **esa** plantilla primero cubre la mayor parte del universo
con **un solo mapeo**, y el coste de integración es mucho menor de lo que sugiere razonar "por
entidad". Estrategia:

1. **Modelo canónico interno**, único e independiente de la entidad:
   `{proceso_id, plantilla_id, capitulo, item_codigo, descripcion, unidad_canonica,
   unidad_texto_original, cantidad, unitario_oficial|null, total_oficial|null,
   anio_base, unitario_deflactado|null, fuente: excel|pdf_nativo|ocr|manual,
   confianza: verde|amarillo}`, más a nivel de proceso
   `{precio_base, valor_adjudicado_proceso|null, baja_pct|null, aiu_declarado|null,
   anticipo_pct|null, pago_anticipado_pct|null, ponderacion_alternativas[], trm_fecha_hora|null}`
   y, por ítem, el APU:
   `{insumo, tipo: material|mano_obra|equipo|transporte, unidad, rendimiento, precio, desperdicio_pct}`.
2. **Comparar años exige deflactar.** Un unitario de 2023 y uno de 2026 en pesos corrientes no son
   comparables: compararlos **fabrica bajas y sobreprecios que no existen**. Se deflacta con el
   **ICOCIV** del DANE (Índice de Costos de la Construcción de Obras Civiles), que **reemplazó al
   ICCP**, descontinuado tras la publicación de enero de 2022 correspondiente a diciembre de 2021
   [CONOCIDO — confirmar en dane.gov.co, bloqueado en esta corrida]. Dos advertencias que no se
   pueden omitir: (a) el **ICOCED es de edificaciones** y **no sirve** para obra civil; (b) el índice
   mide **VARIACIÓN, no nivel**: permite comparar **el mismo ítem** en el tiempo, **nunca** afirmar
   que un precio es alto en términos absolutos.
3. **Capa de exportación por plantilla**: un mapa por **plantilla**, no por entidad
   (`plantilla_id → {hoja, fila_inicio, columna_por_campo, orden_por_codigo_entidad}`), con el
   documento tipo como `plantilla_id` por defecto.
4. **Reconocer el coste**: cada plantilla nueva es **trabajo manual la primera vez**
   (~**1-3 h por PLANTILLA, no por entidad** [SUPUESTO]), amortizado en todos los procesos que la
   usen. Para las entidades que se salgan del documento tipo, el índice de competencia por entidad da
   el orden en que conviene mapearlas.
5. **Detalle técnico que ahorra dolores**: para conservar estilos, macros y celdas protegidas, no
   regenerar el `.xlsx` — **editar las celdas dentro del ZIP original** y volver a comprimir.

### 7. Veredicto de viabilidad por escenario

La viabilidad tiene **dos ejes independientes** que no se pueden mezclar en una sola columna de
porcentajes:

**Eje 1 — acceso.** `p_acceso` = fracción de procesos cuyo adjunto se puede obtener sin intervención
manual. **Hoy es desconocida** y la miden E1/E1'/E4. Si `p_acceso` es baja, la vía es la subida
manual, y **el parseo se reutiliza íntegro**.

**Eje 2 — formato, condicionado a que el adjunto SÍ sea accesible.** Los porcentajes de abajo son
**[SUPUESTO], no medidos**, y sus puntos medios suman 100 % por construcción; E4 los sustituye por
datos reales.

| Formato (de los adjuntos accesibles) | % estimado | Viabilidad | Esfuerzo |
|---|---|---|---|
| **Excel** | ~50-60 % | **Alta.** Lector OOXML sin dependencias + heurísticas de cabecera + validación aritmética | 3-5 días |
| **PDF nativo (texto seleccionable)** | ~30-40 % | **Media.** `pdfjs-dist` con clustering X/Y; el semáforo evita entregar basura | 1-2 semanas, fuera del request path |
| **PDF escaneado** | ~5-10 % | **Baja.** Exige OCR externo; no cabe en el runtime | descartar o derivar a revisión manual |

**Recomendación de secuencia**: (1) correr E1, E1', E2, E3 y luego E4 en producción; (2) construir el
lector Excel y la validación aritmética *primero*, alimentado por **subida manual** — funciona pase
lo que pase con `p_acceso` y entrega el resultado útil en el escenario más probable sin depender del
acceso automático [SUPUESTO]; (3) solo si E1/E1' salen bien, automatizar la descarga; (4) PDF nativo
al final; (5) en paralelo y barato: mapear la plantilla del **documento tipo**, que es el mayor
retorno por hora de trabajo de toda la sección.

#### Vacíos y siguiente paso

- **Acceso a los adjuntos: sin resolver, y es el vacío que decide todo.** Siguiente paso: E1
  (`GET <urlproceso>` desde una función de Vercel, registrando status, `set-cookie` y si el HTML
  trae `href` a ficheros) y **E1'** (un release OCDS de CCE, volcando `tender.documents[]`).
- **`tender.documents[].url` en el OCDS colombiano**: [INCIERTO]. Que CCE publique en OCDS y esté
  registrada en el OCP Data Registry es [CONOCIDO, confirmado en la revisión previa]; lo que falta es
  ver un release real y comprobar si las URL descargan sin sesión.
- **Columnas reales de `p6dx-8zbt`**: nunca verificadas en este entorno; la lista blanca `CAMPOS` de
  este repo **no** es evidencia sobre el dataset. `GET https://www.datos.gov.co/api/views/p6dx-8zbt.json`
  las lista todas y cierra también el pendiente de oferentes/adjudicación de `lib/indice_competencia.js`.
- **Cruce presupuesto ↔ adjudicado**: para poblar `baja_pct` hace falta que alguna de
  `valor_total_adjudicacion | valor_adjudicado | valor_adjudicacion` exista de verdad. SoQL de
  comprobación (una sola llamada, sobre el año en curso):
  `?$select=id_del_proceso,precio_base,valor_total_adjudicacion&$where=valor_total_adjudicacion IS NOT NULL&$limit=5`.
  Si da 400, la columna no existe con ese nombre y hay que leer la lista de E2.
- **Alternativas de ponderación y regla de sorteo por TRM**: [CONOCIDO] sin verificar en esta corrida.
  Se confirma abriendo el documento tipo de licitación de obra pública vigente y transcribiendo el
  numeral de oferta económica; **es el insumo que fija el precio de oferta y no puede quedarse en
  supuesto**.
- **Normas citadas** (art. 3 Decreto 1372 de 1992 / DUR 1625 de 2016 sobre IVA en construcción;
  parágrafo art. 40 Ley 80 de 1993 sobre el tope del 50 %; art. 91 Ley 1474 de 2011 sobre fiducia del
  anticipo; Leyes 2022 de 2020 y 2160 de 2021 sobre documentos tipo): todas **[CONOCIDO], ninguna
  abierta en esta corrida**. Verificarlas en el gestor normativo de Función Pública y con el contador
  antes de que toquen un número de oferta.
- **Rango de AIU**: [SUPUESTO] 10-35 % para el barrido diagnóstico. Se sustituye por el **AIU
  declarado**, leído de 20-30 pliegos reales; el barrido nunca debe convertirse en la fuente.
- **Distribución real Excel/PDF/escaneado y `p_acceso`**: sin medir. E4 sobre 10-30 procesos.
- **Magnitudes de la tabla de especificaciones**: [CONOCIDO], no verificadas. Calibrar contra una
  base de precios unitarios real, **deflactada con ICOCIV**; si el §2 sale bien, la propia app
  construye esa base con los presupuestos oficiales que descargue.
- **Condiciones de uso del portal para descarga automatizada**: no revisadas. Consultar términos y
  `robots.txt` antes de cualquier descarga masiva; en todo caso, ritmo bajo y UA identificable.


---

## 1.H — Implementacion tecnica: que cabe en Vercel + Redis y que no

### Nota sobre fuentes

Este entorno no alcanza `vercel.com/docs` ni `upstash.com` (WebFetch devuelve **403 Forbidden**, comprobado de nuevo en esta revision). Todo lo que dependa de esos dos dominios queda como [CONOCIDO] con la URL exacta donde confirmarlo, nunca como verificado. Lo leido en el repositorio y en la documentacion empaquetada si esta verificado y se cita con archivo y linea.

| Etiqueta | Significado en esta seccion |
|---|---|
| [VERIFICADO-REPO] | Leido en esta sesion en el codigo del proyecto. Se cita archivo y linea/constante. |
| [VERIFICADO-DOC] | Leido en esta sesion en documentacion empaquetada localmente (skill `claude-api`). Se cita archivo y linea. |
| [CONOCIDO] | Solido por entrenamiento, **no confirmado en esta sesion**. Se indica la URL donde comprobarlo. |
| [INCIERTO] | Creo que es asi pero no lo sostengo. Se indica que buscar. |

| Hecho | Etiqueta | Fuente / como verificar |
|---|---|---|
| `maxDuration: 300` en `api/sync.js` y `api/sync/historico.js`; `60` en los cinco endpoints de consulta | [VERIFICADO-REPO] | `/home/user/portafolio-estrategico/vercel.json` |
| Chunk = `deflate` nivel 6, tope **500 000 bytes** antes de base64; particion recursiva | [VERIFICADO-REPO] | `lib/almacen.js`, `CHUNK_MAX_COMPRIMIDO` y `empaquetar()` |
| Cliente Redis = REST de Upstash por `fetch`, sin SDK, con contador `comandos()` | [VERIFICADO-REPO] | `lib/redis.js` (~35 lineas, escrito a mano) |
| Columnas de adjudicacion, valor adjudicado y nº de oferentes **sin verificar contra el dataset**; se leen por lista de candidatas | [VERIFICADO-REPO] | `lib/indice_competencia.js` lineas 55-83 (`OFERENTES_CAMPOS`, `CAMPOS_VALOR_ADJUDICADO`), comentario «candidatas, pendiente verificacion» |
| `precio_base` esta en la proyeccion activa | [VERIFICADO-REPO] | `lib/proyeccion.js` linea 43 |
| Sonnet 5 = **$3/$15** por MTok (introductorio **$2/$10** hasta 2026-08-31) | [VERIFICADO-DOC] | skill `claude-api`, `shared/model-migration.md` linea 1192, §Migrating to Claude Sonnet 5 |
| Opus 5 = **$5/$25** por MTok | [VERIFICADO-DOC] | skill `claude-api`, `shared/models.md` linea 73 (§Model Descriptions) y `shared/model-migration.md` linea 908 |
| **Haiku 4.5 = $1/$5 por MTok** | **[INCIERTO]** | **No consta en la documentacion empaquetada**: el precio de Haiku 4.5 no aparece en ningun archivo del skill (la tabla «Current Models» de `shared/models.md` no lleva columna de precios). Verificar en `https://platform.claude.com/docs` → Pricing **antes de presupuestar**: las dos filas mas baratas de §5 dependen enteramente de esta cifra |
| Minimo cacheable de **Haiku 4.5 = 4 096 tokens**; por debajo no cachea y no avisa (`cache_creation_input_tokens: 0`) | [VERIFICADO-DOC] | skill `claude-api`, `shared/prompt-caching.md` lineas 128 y 132-137 |
| Batch API = **50 %** de descuento; cache read ≈ **0,1x**, cache write 1,25x (TTL 5 min) o 2x (TTL 1 h) | [VERIFICADO-DOC] | `python/claude-api/batches.md` lineas 3 y 10; `shared/prompt-caching.md` linea 141 |
| Vercel: plan **Hobby prohibe el uso comercial**; duracion maxima con Fluid compute = 300 s (Hobby) / 800 s (Pro y Enterprise); limite de **4,5 MB** tanto de respuesta como de **cuerpo de peticion**; `/tmp` escribible de ~512 MB efimero; cron en Hobby solo diario | [CONOCIDO] | `vercel.com/docs/limits/fair-use-guidelines`, `vercel.com/docs/functions/limitations`, `vercel.com/docs/cron-jobs`. **Bloqueado en este entorno (403)**: confirmar antes de firmar presupuesto |
| Vercel **Password Protection** requiere Enterprise o el add-on **Advanced Deployment Protection (~$150/mes)** sobre Pro; **Vercel Authentication** es gratis en todos los planes pero solo autentica a miembros del equipo | [CONOCIDO] | `vercel.com/docs/deployment-protection`. Bloqueado aqui (403); ademas hay que mirar **que opcion tiene encendida la cuenta actual** |
| Upstash Redis free: **256 MB** de datos, **500 000 comandos/mes**, **10 GB** de banda/mes, valor maximo 1 MB. El cap diario de 10 k comandos ya no existe | [CONOCIDO] | `upstash.com/pricing/redis`. Bloqueado aqui (403). El 1 MB por valor coincide con lo que ya declara el `CLAUDE.md` del proyecto |
| GitHub Actions plan Free: **2 000 minutos/mes** de runner Linux en repos privados | [CONOCIDO] | `docs.github.com/billing` → About billing for GitHub Actions |
| Precio de suscripcion a Construdata | [INCIERTO] | No verificado. Pedir cotizacion directa a Legis; no inventar cifra |

---

### 1. Inventario de componentes

| Componente | ¿Vercel serverless? | Por que | Alternativa si no |
|---|---|---|---|
| Biblioteca de APU (catalogo de analisis unitarios) | **Si** (como dato, no como servicio) | Es un JSON estatico de ~300 APU × ~10 insumos. Se despliega con el codigo via `includeFiles: "data/**"` (patron ya usado) | — |
| Motor de calculo de APU | **Si** | Aritmetica pura sobre estructuras en memoria, <10 ms por presupuesto. CommonJS sin dependencias | — |
| Factor regional (indices por departamento) | **Si** | Matriz pequeña; ver §3 | — |
| Clasificador de tipologia (via / acueducto / edificacion…) | **Si** | Es la misma familia de reglas que `lib/semantica.js` + `lib/unspsc.js`: regex sobre texto normalizado y jerarquia UNSPSC | Si se quiere un modelo estadistico, entrenar fuera y exportar pesos a JSON |
| Ingesta de indices DANE | **Parcial** | Si hay API/CSV estable y liviano, cabe en una funcion de 300 s. Si exige navegar el portal o descargar Excel voluminosos, no | Job externo (GitHub Actions) que produzca el JSON |
| Scraping de retail (precios de materiales) | **No** | Sesiones, cookies, paginacion, rate limits y a veces JS del lado cliente. Ademas Vercel no mantiene estado entre invocaciones y la IP es compartida | GitHub Actions programado (nocturno) que escribe a Redis o commitea JSON |
| Parseo de PDF (pliegos, formularios de cantidades) | **Marginal** | Un PDF con texto embebido se puede parsear en JS puro, pero **extraer tablas** de forma fiable empuja a Python (`camelot`, `pdfplumber`) | Job externo Python, o subir el PDF a un LLM con capacidad de documento |
| OCR (pliegos escaneados) | **No** | Binarios pesados (Tesseract), memoria alta, tiempos por pagina que rompen cualquier limite razonable | Servicio gestionado, o job externo, o LLM multimodal |
| Embeddings | **No para generarlos; si para consumirlos** | Generarlos exige un modelo o una API externa; almacenarlos y compararlos por coseno cabe en JS | Precalcular fuera; guardar vectores comprimidos |
| Factor de baja sobre el historico | **Si, pero con un prerrequisito abierto** | El **patron** de agregacion esta probado (`lib/indice_competencia.js`: mes a mes, reanudable, acumulador por entidad, swap atomico). El **insumo no**: el nombre real de la columna de valor adjudicado y de presupuesto oficial en `p6dx-8zbt` sigue sin verificar — `CLAUDE.md` lo dice literal («Columnas de adjudicacion/oferentes: PENDIENTE VERIFICACION») y por eso `CAMPOS_VALOR_ADJUDICADO` es una lista de candidatas (`valor_total_adjudicacion`, `valor_adjudicado`, `valor_adjudicacion`). Si ninguna acierta, el factor de baja no sale peor: sale **vacio**. Prerrequisito antes de prometerlo: comprobar contra el dataset real que la columna de valor adjudicado y `precio_base` vienen pobladas y que ambas son comparables (mismo alcance, sin adiciones, un solo lote) | — |
| Generacion del Excel de salida | **Si, con reservas** | Escribir `.xlsx` es escribir un ZIP con XML; `zlib` nativo lo permite sin dependencias, pero implementar OOXML a mano tiene coste. Un `.csv` o un HTML imprimible cubre el 80 % del valor | Generar `.xlsx` en el job externo, o aceptar `SheetJS` como unica dependencia |

---

### 2. Limites duros

**Tiempo de ejecucion.** [CONOCIDO] Con **Fluid compute activado**, el techo es **300 s en Hobby y 800 s en Pro/Enterprise** (hasta 30 min en beta) — `vercel.com/docs/functions/limitations`. Hay que **confirmar en el panel que Fluid compute esta encendido en este proyecto**: sin el, el techo es menor y el `maxDuration: 300` que declara `vercel.json` no se cumple. Declarar un valor en `vercel.json` no prueba que el plan lo conceda: Vercel lo acota o falla el despliegue. Regla practica que no depende de esa confirmacion: no diseñar ningun paso que necesite mas de ~250 s. El repositorio ya resuelve esto encadenando (la full se auto-invoca) y ese es el patron a copiar.

**Tamaño del bundle.** [CONOCIDO] Hay un tope de unas decenas de MB por funcion desplegada. Es irrelevante mientras no haya `node_modules`; se vuelve el problema principal en cuanto se añade `puppeteer` (~300 MB con Chromium) o cualquier binding nativo de OCR.

**Memoria.** [CONOCIDO] Por defecto ~1 GB, configurable. Suficiente para agregados sobre chunks, insuficiente para cargar 2 M de datapoints en un array de objetos.

**Payload.** [CONOCIDO] El tope de **4,5 MB** de Vercel aplica en las **dos direcciones**: respuesta y cuerpo de peticion. Esto ultimo condiciona el diseño de la ruta de escritura (§4).

**Sin estado entre invocaciones.** Este es el limite que **mata scraping y OCR**, no el tiempo. El scraping necesita mantener sesion, cookies, backoff por dominio y un cursor que sobreviva a reintentos; Vercel no garantiza que la siguiente invocacion caiga en la misma instancia ni que haya disco **persistente**: hay un `/tmp` escribible de ~512 MB, pero es efimero, no se comparte entre instancias concurrentes y no sobrevive al reciclado. Sirve como scratch dentro de una invocacion, nunca como cursor de scraping entre invocaciones. El OCR muere por otra via: bundle + memoria + segundos por pagina.

---

### 3. Almacenamiento: estimacion de volumen

| Conjunto | Filas / valores | JSON crudo aprox. | Comprimido (deflate) | Chunks de 500 KB |
|---|---|---|---|---|
| Biblioteca de APU (300 × 10) | 3 000 | ~0,4 MB | ~0,08 MB | 1 |
| Factores regionales agregados (33 dep. × ~12 capitulos × 24 meses) | ~9 500 | ~0,15 MB | ~0,03 MB | 1 |
| Serie completa de insumos (3 000 × 33 × 24) **(NO construir — ver refutacion)** | **2 376 000** | ~30 MB | ~8–10 MB | ~18 |
| Historico de 60 000 procesos (proyeccion actual + valor adjudicado) | 60 000 | ~30 MB | ~6–8 MB | ~14 |
| Derivados (indice de baja por entidad/tipologia) | ~5 000 entradas | ~1 MB | ~0,2 MB | 1 |

Estimaciones propias (JSON de ~120 B/fila de APU, ~500 B/proceso, ratio de compresion 3–5x sobre texto repetitivo). Sumando la tabla completa son **14–18 MB comprimidos**; pero descontando la serie completa de insumos que se refuta abajo, el diseño recomendado ocupa **~6–8 MB**. Cualquiera de las dos cifras cabe holgadamente en los 256 MB del tier gratuito de Upstash [CONOCIDO].

**El espacio no es el limite. Hay tres presupuestos y el que se agota primero no es este.**

- **Espacio:** 256 MB free. Sobra por un factor de 30.
- **Comandos:** 500 000/mes free. Leer 18 chunks por consulta con `MGET` en lotes de 8 son 3 comandos; reconstruir la serie completa mes a mes son cientos. Tolerable si la reconstruccion es un job y no una ruta de consulta.
- **Ancho de banda: 10 GB/mes free — este es el que se agota primero.** Una lectura completa de la serie son ~12 MB en base64 (18 chunks × 500 KB comprimidos, y base64 infla 4/3 → ~667 KB cada uno), o sea **10 GB ÷ 12 MB ≈ 830 lecturas al mes**. Y `CLAUDE.md` dice que «cada visita refresca via delta»: el gasto no es por consulta pesada ocasional, es **por visita**. Mitigacion obligatoria: cache en memoria dentro de la funcion (aprovechando el reuso de instancia cuando lo hay) y **no leer los chunks de precios en la ruta de consulta** — solo los derivados (~0,2 MB), que es lo que la pantalla necesita.

**Recomendacion: hipotesis (b)+(a) confirmada, con un matiz.**

- **(b) JSON versionado en el repositorio** para la biblioteca de APU, los rendimientos, los factores regionales agregados y el vocabulario de tipologias. Argumentos, en el orden en que importan para esta app: es **auditable** (un APU mal puesto es un error de negocio, no de infraestructura, y debe verse en un diff), se revisa por PR, se despliega atomicamente con el codigo que lo consume, **cero costo** y cero comandos Redis. Ya existe el precedente exacto: `data/vocabulario_unspsc.json` (4,6 KB) declarado como «semilla curada a mano» y cargado con `includeFiles: "data/**"`.
- **(a) Redis con chunks comprimidos** para todo lo **derivado del historico**: la serie de precios ingerida, el indice de baja, los agregados por entidad. Cambian sin desplegar, se reconstruyen sin re-extraer y el patron (`manifest` + `chunk:{i}` + swap atomico) ya esta escrito y probado.

**Refutacion parcial de la hipotesis:** la **serie completa de insumos (3 000 × 33 × 24)** no deberia existir. No hay fuente publica colombiana que publique 3 000 insumos por los 33 departamentos mensualmente; el DANE publica indices por grupo y por unas pocas ciudades. Guardar 2,4 M de celdas es guardar interpolacion presentada como dato — el mismo error que `CLAUDE.md` prohibe con el vocabulario («es una semilla curada, no una estadistica»). Lo correcto es: precios base nacionales (repo) × factor regional agregado (repo) × deriva mensual observada (Redis), y **marcar explicitamente** que el factor es una estimacion. De paso, es lo que deja el consumo de banda en el orden de los 0,2 MB por consulta en vez de 12 MB.

**(c) Postgres/SQLite gestionado (Neon, Supabase, Turso).** Se justificaria solo si aparecen consultas agregadas ad hoc por multiples dimensiones (percentil de precio por insumo × departamento × trimestre) que hoy no existen. **El SDK no es el obstaculo**: Neon expone SQL sobre HTTP y Supabase expone PostgREST, y ambos se consumen con `fetch` pelado, exactamente igual que el cliente REST de Upstash que este proyecto ya escribio a mano en `lib/redis.js` (~35 lineas, sin SDK) [VERIFICADO-REPO]. Las razones reales para no adoptarlo hoy son otras dos: **un tier gratuito mas que vigilar** y, sobre todo, **una segunda fuente de verdad que puede desincronizarse de los chunks**. **No adoptarlo todavia**; el disparador seria «necesito un `GROUP BY` que no puedo precalcular».

---

### 4. JavaScript vs Python

**En JS puro (dentro de Vercel):** todo el calculo de APU (materiales = cantidad × precio × (1 + desperdicio); mano de obra = jornal × factor prestacional × nº de la cuadrilla ÷ rendimiento; equipo = tarifa horaria ÷ rendimiento; luego AIU sobre el costo directo), el clasificador por reglas, los agregados sobre el historico (ya demostrado por `indice_competencia.js`), el parseo de CSV, la comparacion de vectores y la generacion de CSV/HTML.

> El rendimiento **divide**, no multiplica. Es el error canonico del APU: un rendimiento en unidad/dia o unidad/hora en el numerador daria un costo unitario que **crece** cuando la cuadrilla es mas eficiente. Y el renglon de materiales no es cantidad × precio a secas: lleva su factor de desperdicio, que en obra civil es lo que separa un presupuesto que cierra de uno que no.

**Empuja a Python (fuera de Vercel):** extraccion de tablas de PDF, OCR, scraping con navegador, y cualquier modelo estadistico serio (regresion de precio contra tipologia/region, deteccion de outliers con `statsmodels`).

**Arquitectura hibrida minima propuesta:**

```
GitHub Actions (cron nocturno, repo privado; 2 000 min/mes en plan Free [CONOCIDO])
  └─ job Python: scraping / parseo PDF / OCR / ajuste estadistico
       ├─ salida A: data/*.json  → commit + PR  (catalogo, factores; auditable)
       └─ salida B: series y derivados → Redis   (ver nota, la ruta importa)

Vercel  →  solo sirve: lee data/**, lee Redis, calcula, responde.
```

**Sobre la salida B.** Un `POST /api/admin/ingesta` esta sujeto al mismo tope de **4,5 MB, pero de cuerpo de peticion**: un volcado de la serie completa (6–10 MB comprimidos segun §3) **no cabe**. Dos salidas:

- **(a)** el job envia **por lotes**, con el mismo protocolo `manifest` + `chunk:{i}` + swap atomico que ya usa el indice de competencia;
- **(b) — preferible —** el job de GitHub Actions **escribe directo al REST de Upstash** con sus propias credenciales, y Vercel no participa en la escritura. La (b) elimina de paso el candado distribuido entre dos escritores: solo hay uno.

Si aun asi se conserva una ruta de escritura en Vercel, debe reutilizar `lib/auth.js` (un solo punto de autorizacion, ya son cinco endpoints) y el candado con TTL. Todo esto respeta la doctrina del repositorio (Vercel sin build ni dependencias), no paga servidores y deja la parte fragil —la que depende de fuentes externas— fuera del camino critico de la app.

Un job nocturno de ~10 min consume ~300 min/mes, holgadamente dentro de los 2 000 min/mes del plan Free de GitHub para repos privados [CONOCIDO].

---

### 5. LLM en el circuito

**Donde aporta:** clasificar objetos ambiguos que hoy caen en 🟡 amarillo, extraer items y cantidades de un formulario de cantidades en PDF, y normalizar nombres de insumo («cemento gris 50 kg» ≡ «CEMENTO PORTLAND TIPO I X 50KG»). En los tres casos la salida se valida contra un esquema y contra el catalogo local.

**Donde no aporta y no debe entrar:** **la aritmetica del APU, jamas.** El LLM no multiplica cantidades por precios ni suma AIU. Tampoco decide la K de contratacion ni el factor de baja: eso es `lib/capacidad.js` y un agregado sobre el historico, ambos deterministas y auditables.

**Costo estimado** (volumenes propios; ver la advertencia de precio inmediatamente debajo de la tabla):

| Uso | Modelo | Tokens/llamada | Costo/proceso | Volumen/mes | Costo/mes |
|---|---|---|---|---|---|
| Clasificar objeto ambiguo | Haiku 4.5 ($1/$5 **[INCIERTO]**) | ~800 in / 150 out | ~$0,0016 | 1 500 | **~$2,4** |
| Normalizar insumo (batch) | Haiku 4.5 + Batch −50 % | ~400 in / 80 out | ~$0,0004 | 3 000 | **~$1,2** |
| Extraer items de un pliego | Sonnet 5 ($3/$15 [VERIFICADO-DOC]) | ~25 k in / 3 k out | ~$0,12 | 40 | **~$4,8** |

**Advertencia sobre estas cifras:** las dos primeras filas ($2,4 + $1,2 de los $8,4) descansan enteramente en el precio de Haiku 4.5, que **no consta en la documentacion empaquetada** y aqui va como [INCIERTO]. Confirmarlo en `https://platform.claude.com/docs` → Pricing antes de presupuestar. La tercera fila si esta verificada, y con el precio introductorio de Sonnet 5 ($2/$10, vigente hasta 2026-08-31 [VERIFICADO-DOC]) bajaria de $4,8 a ~$3,2 mientras dure.

**El prompt caching NO aplica a este diseño.** Haiku 4.5 exige un prefijo minimo de **4 096 tokens** [VERIFICADO-DOC: `shared/prompt-caching.md` lineas 132-137] y las llamadas del clasificador son de ~800; por debajo del minimo no cachea y **no avisa** (`cache_creation_input_tokens: 0`, sin error). Si el prompt de sistema creciera por encima de 4 096, reevaluar; mientras tanto, el ahorro esta en **Batch (−50 %)**, no en cache.

Total **≈ $8,4/mes** a volumen realista. Estos $8,4/mes corresponden al escenario **Completo** de §6 (los $10–15 de esa tabla incluyen margen por reintentos y prompts mas largos); el escenario **Intermedio** supone solo el clasificador y la normalizacion, sin extraccion de pliegos: **~$3,6/mes**. En cualquiera de los dos casos el LLM no es el costo dominante — lo es la plataforma (§6) y la eventual suscripcion a datos de precios.

---

### 6. Costos mensuales estimados

| Concepto | MVP | Intermedio | Completo |
|---|---|---|---|
| Vercel (plan) | **$20/usuario/mes (Pro)** — Hobby **NO es elegible**: prohibe el uso comercial (`vercel.com/docs/limits/fair-use-guidelines`) | ~$20 (Pro) | ~$20 (Pro) |
| Proteccion de acceso (Password Protection / Advanced Deployment Protection) | **requerida ya hoy**: ~$150/mes sobre Pro, o incluida en Enterprise — **$0 si basta Vercel Authentication** (ver vacio nº 1) | idem | idem |
| Upstash Redis | $0 (free tier) | $0–10 (pay-as-you-go) | ~$10–20 |
| GitHub Actions | $0 (2 000 min/mes, repo privado) | $0 | $0–5 |
| LLM (Anthropic) | $0 (sin LLM) | ~$3,6 | ~$10–15 |
| Fuente de precios (Construdata u otra) | $0 (precios propios + DANE) | $0 | **[INCIERTO] cotizar** |
| OCR gestionado | $0 | $0 | ~$5–15 |
| **Total sin la proteccion de acceso** | **~$20** | **~$24–35** | **~$45–75 + suscripcion** |
| **Total si la proteccion exige el add-on** | **~$170** | **~$174–185** | **~$195–225 + suscripcion** |

Dos observaciones que cambian la lectura de esta tabla:

1. **No hay escenario a $0.** El plan Hobby de Vercel define uso comercial como cualquier despliegue usado con animo de lucro por alguien involucrado en la produccion del proyecto, y exige Pro o Enterprise [CONOCIDO]. Una app con la que un contratista real decide a que licitaciones presentarse es uso comercial sin discusion. El «$0» no es una opcion disponible: es una infraccion de terminos que Vercel puede cortar sin aviso.
2. **El rubro mas grande es el que no estaba en la tabla.** El propio `CLAUDE.md` declara que «la proteccion seria es Vercel Password Protection (servidor)» y describe su interferencia con la auto-invocacion de la full — o sea que **ya esta en uso**. Si lo que hay encendido es Password Protection, son ~$150/mes: mas del doble del total «Completo» presupuestado. Si lo que hay es Vercel Authentication (gratis, pero solo autentica a miembros del equipo de Vercel), son $0. **Es la primera comprobacion que hay que hacer**, por delante de cualquier limite tecnico.

Los rangos siguen siendo inciertos en los extremos: dependen del volumen real de pliegos procesados y del esquema vigente de Upstash. La cifra que **no se debe inventar** es la de Construdata: hay que pedir cotizacion.

---

### 7. Riesgos de ingenieria y como los cubre la doctrina existente

| Riesgo | Mitigacion ya escrita en el repo | Reutilizacion concreta |
|---|---|---|
| Publicar un catalogo de precios a medio construir | **Swap atomico** (`indice:competencia:nuevo` → `RENAME`) | Construir `precios:nuevo` y renombrar; nunca hay ventana sin catalogo |
| Dos ingestas simultaneas corrompiendo el estado | **Candado con TTL** (`SET NX EX`, liberacion por token, TTL 300/600 s) | `lock:precios` con el mismo patron; un 401 nunca deja el candado puesto. Con la salida (b) de §4 el problema desaparece: un solo escritor |
| Precio viejo pisando uno nuevo | **Dedup por `:updated_at`** al leer chunks | Misma regla: gana la observacion mas reciente por `_k` |
| Presentar una estimacion como dato duro | **Degradacion honesta** (`anticipo_pct = 0` = «sin dato»; `0 oferentes` ≠ «nadie se presento»; `⚪ sin datos historicos`) | Un factor regional derivado debe llevar su propio `nivel: sin_dato` y su mensaje, nunca un numero desnudo |
| Un `\|\| 0` convirtiendo «no se» en «cero» | Prueba que **prohibe** `i.<conteo> \|\| 0` en los frontends | Extenderla a los campos de precio y de baja |
| Un chunk corrupto tumbando la consulta | `descomprimir()` devuelve `null` y `leerChunksDedup` avisa por `onCorrupto` | Igual para los chunks de precios |
| Dos definiciones de la misma entidad/insumo | Leccion de `claveCanonica` (una sola funcion, importada por ambos consumidores) | **Una sola** funcion de clave de insumo, exportada desde un modulo hoja del grafo de requires |
| Ciclo de `require` al añadir modulos | `lib/unspsc.js` es hoja; `norm` vive en `semantica.js`; `require("./rup.js")` diferido dentro de la funcion | El motor de APU debe ser hoja: no puede importar perfiles ni filtros |
| Ingesta acoplada al juicio (exigir full por cada mejora) | Separacion `admisibleParaIngesta` / `evaluarObjeto` | El precio se **guarda** crudo; el APU se **calcula** al servir. Mejorar un rendimiento no exige re-ingerir nada |
| Construir sobre una columna que no existe | El sintoma ya esta documentado: `indice:competencia:meta` con `clasificadas: 0` y `descartados.sin_oferentes` alto | Antes de prometer el factor de baja, medirlo igual: un contador de «procesos con valor adjudicado legible» en la meta del indice de baja |

#### Vacios y siguiente paso

1. **Plan de Vercel elegible y costo real de la proteccion de acceso.** Es el vacio de mayor impacto economico. (a) Confirmar que el proyecto esta en Pro y no en Hobby (`vercel.com/docs/limits/fair-use-guidelines`). (b) Mirar en el panel del proyecto → Settings → Deployment Protection **cual de las dos esta activa**: Password Protection (add-on Advanced Deployment Protection, ~$150/mes sobre Pro, o Enterprise) o Vercel Authentication (gratis, pero solo entra quien sea miembro del equipo de Vercel). Eso determina si el costo base real es ~$170/mes o ~$20/mes. (c) De paso, confirmar que **Fluid compute** esta encendido: sin el, el `maxDuration: 300` del `vercel.json` no se cumple.
2. **Columnas de adjudicacion, valor adjudicado y presupuesto oficial en `p6dx-8zbt`.** Prerrequisito duro del factor de baja: si ninguna candidata acierta, el factor sale vacio, no impreciso. No verificable desde aqui (`datos.gov.co` bloqueado por la allowlist del proxy, `CONNECT 403` comprobado). Consulta SoQL exacta a lanzar desde un navegador o desde produccion:

   ```
   https://www.datos.gov.co/resource/p6dx-8zbt.json?$select=count(*) as n
     &$where=valor_total_adjudicacion IS NOT NULL AND precio_base IS NOT NULL

   https://www.datos.gov.co/resource/p6dx-8zbt.json?$limit=1
     &$select=:id,:updated_at,*
     &$where=upper(estado_del_procedimiento) like '%ADJUDICAD%'
   ```

   La segunda devuelve una fila completa con **todos** los nombres de columna reales: es la que resuelve el vacio de un tirazo. Con eso hay que (a) fijar el nombre verdadero en `CAMPOS_VALOR_ADJUDICADO`, (b) comprobar que `precio_base` viene poblado en los mismos procesos, y (c) verificar que ambos son comparables — mismo alcance, sin adiciones, un solo lote. Si el proceso es multilote, la razon adjudicado/base no significa nada.
3. **Existencia y formato de la fuente DANE.** Desconocido si hay API JSON/CSV estable de indices de costos de construccion (ICCV/ICCP) o si obliga a descargar Excel. Determina si la ingesta cabe en Vercel (funcion de 300 s) o exige el job externo de §4. Verificar en el portal del DANE.
4. **Precio de Construdata (y de sus alternativas).** No inventar. Pedir cotizacion a Legis y comparar contra la opcion «precios propios + factor DANE», que es gratis y auditable.
5. **Volumen real de pliegos que se procesarian al mes.** El costo del LLM y la necesidad de OCR dependen enteramente de esto, y es lo que separa el escenario Intermedio del Completo en §6. Medirlo con el dueño antes de contratar cualquier servicio.
6. **Decision sobre el `.xlsx`.** No es falta de informacion sino una decision pendiente: (a) CSV/HTML imprimible y cerrar el tema, (b) OOXML a mano con `zlib`, (c) aceptar `SheetJS` como excepcion justificada a la regla de «sin dependencias». Tomarla antes de prometer Excel al dueño.


---

## 1.I — Limitaciones, precision alcanzable y riesgo legal del APU automatico

**Advertencia de fuentes para esta sección.** En esta corrida el presupuesto de WebSearch volvió a
estar agotado (200/200) y los hosts normativos y estadísticos que intenté devolvieron **HTTP 403**
(`colombiacompra.gov.co`, `dane.gov.co`, y en la corrida anterior `sintesis.colombiacompra.gov.co`,
`funcionpublica.gov.co`, `secretariasenado.gov.co`). Por tanto **ninguna cita normativa de esta
sección está [VERIFICADO] por mí**: todas son [CONOCIDO] o [INCIERTO], con la ruta de comprobación
al lado. Lo único marcado [VERIFICADO-REPO] es lo que leí en el código de este repositorio, con
archivo y línea. La sección 1.C (`09-normativa-apu.md`) sí verificó parte de este articulado;
cuando me apoyo en ella lo digo. **Antes de publicar este documento hacia afuera, todo lo marcado
[CONOCIDO] debe pasar por una corrida con acceso a `funcionpublica.gov.co` y a
`colombiacompra.gov.co`.**

### 1 · Precisión alcanzable: dónde vive el error

**Antes de leer cualquier banda: la modalidad de pago del contrato decide quién soporta el error.**
En contrato a **precios unitarios** el riesgo de cantidad es de la entidad —la mayor cantidad
ejecutada se paga— y el APU solo debe acertar el **unitario**: las filas de precio, rendimiento y
equipo son las que mandan. En **precio global fijo** o **llave en mano** el error de cantidad lo
absorbe íntegro el contratista y no hay reclamación que valga: ahí la fila «Cantidades de obra»
pasa a ser la dominante y el resto es secundario. La modalidad se lee en el pliego y **debe ser un
campo obligatorio del APU**: sin ella, las bandas de este apartado no son interpretables y el
sistema no debería emitir cifra.

Un APU de ingeniero de costos no es exacto; es **trazable**. Su valor no está en acertar el número
sino en que cada rendimiento tiene un dueño que lo defiende y una obra anterior que lo respalda. Un
APU automático puede igualar al humano en precios de insumo y no puede acercársele en rendimientos
ni en condiciones de sitio. Esa asimetría es estructural, no un defecto de implementación.

**[CONOCIDO — juicio de oficio de ingeniería de costos, NO medición sobre el corpus. Ninguna de
estas cifras está calibrada contra datos propios. Protocolo para calibrarlas en §Vacíos.]**

| Fuente de error | Favorable (hay dato duro) | Típico | Adverso | Multiplicador sobre el costo directo (cuando aplica) | ¿Reducible con más datos? |
|---|---|---|---|---|---|
| **Precio de insumo** puesto en obra | ±5–10 % relativo (lista oficial vigente, mismo departamento) | ±15–25 % relativo (lista de otra región o >12 meses) | ±40 % relativo y más (zona apartada, flete no modelado) | — | **Sí**, es el caso fuerte del sistema |
| **Rendimiento de cuadrilla** | ±15–25 % relativo (tipología repetida, terreno conocido) | ±30–50 % relativo | — | Lluvia, acceso malo o cuadrilla nueva: el rendimiento cae a la mitad, es decir **el costo de esa actividad ×2** | **No** sin obras propias ejecutadas |
| **Cantidades de obra** | ±3–5 % relativo (Formulario 1 publicado; el error es de lectura) | ±30–60 % relativo (estimadas del objeto) | — | Ítem «global» u objeto sin memoria de cantidades: **×2–×4 sobre ese ítem** | Solo si la entidad publica el formulario |
| **Tarifa horaria de equipo** | ±15 % relativo | ±25–40 % relativo | — | Equipo escaso en la región: **tarifa ×2** | Parcialmente |
| **Condiciones del sitio** | factor 1.00 | — | — | **1.10–1.25** típico, **1.4–1.6** adverso — se aplica **encima** del costo directo y **solo hacia arriba** | **No** sin visita |
| **A** de AIU | ±20 % **relativo sobre el valor de A** (p. ej. A = 8 % → 6.4 %–9.6 % del costo directo) | ±30 % relativo | ±50 % relativo | — | Parcialmente (depende del plazo real) |
| **I** de imprevistos | no es un cálculo: es una **postura frente a la matriz de riesgos** | | | — | No |
| **U** de utilidad | no es un cálculo: es una **decisión comercial del dueño** | | | — | No |

> **Convención de lectura de las bandas.** Las bandas ± de esta tabla se leen como **≈1σ relativa
> (coeficiente de variación, `cv`)**, no como intervalo de confianza. Si se prefieren leer como
> intervalo al 90 %, hay que **dividirlas por 1.645** antes de meterlas en las fórmulas de abajo:
> con ±30 % leído como intervalo, `cv ≈ 18 %`, y los resultados del párrafo siguiente pasan de
> 4.7 % / 30 % a **2.8 % / 18 %**. Sin declarar la convención, ninguna de las dos lecturas es
> refutable y la demostración no dice nada.

**Por qué el total miente menos que el ítem.** Con pesos \(w_i\) (participación de cada ítem en el
valor total, \(\sum w_i = 1\)) y coeficientes de variación \(cv_i\), el error relativo del
presupuesto es

    errores independientes:      σ/V = √( Σ (w_i · cv_i)² )
    errores correlacionados:     σ/V =    Σ (w_i · cv_i)

Con 40 ítems de peso igual y \(cv = 30\,\%\), la primera fórmula da **≈ 4.7 %** y la segunda da
**30 %**. La compensación es real, pero exige dos supuestos que en un APU automático **fallan casi
siempre**:

1. **Independencia.** Una tabla de rendimientos optimista lo es en *todos* los ítems a la vez. Ese
   error es sesgo, no ruido, y no se compensa: se suma. La banda honesta del total es la segunda
   fórmula, no la primera.
2. **Reparto plano.** En obra vial, acueducto y alcantarillado, entre **3 y 5 ítems concentran el
   70–85 %** del valor (m³ de excavación, m³ de concreto, ml de tubería, m² de mezcla asfáltica)
   [CONOCIDO, regla de oficio; se puede medir sobre los Formularios 1 del histórico de SECOP y
   debería medirse]. Con un solo ítem en \(w = 0.5\) y \(cv = 30\,\%\), el piso del error total es
   **15 %** por ese ítem solo, hagas lo que hagas con los otros 39.

**Conclusión operativa — la banda es asimétrica, no ±.** El sistema puede aspirar a
**−10 % / +25 %** en el escenario favorable (Formulario 1 publicado con cantidades, precios
regionales de menos de 12 meses), del cual **−10 / +15 es error de estimación** y el resto es el
**factor de sitio no observado**; y a **−20 % / +60 %** cuando las cantidades se infieren del
objeto. **No debe emitir cifra** cuando el objeto es «global» sin memoria de cantidades.

La aritmética, a la vista, con la fórmula correlacionada (que es la honesta) y la columna Favorable:

    Σ w_i · cv_i  con  w = (materiales 0.60, mano de obra 0.25, equipo 0.15)
                  y    cv = (precio 7.5 %, rendimiento 20 %, equipo 15 %)
      = 0.60·0.075 + 0.25·0.20 + 0.15·0.15 = 0.045 + 0.050 + 0.0225 ≈ 11.8 %
    + cantidades (±3–5 %, correlacionadas)                          ≈ 15–16 %
    + factor de sitio 1.10–1.25                     se aplica encima y SOLO hacia arriba

Es decir: el clásico «±10–15 %» solo es alcanzable si **todo** cae en el extremo optimista a la
vez, y aun así el factor de sitio rompe la simetría. Un ingeniero con visita al sitio y obras
similares ejecutadas trabaja en **−5 % / +15 %** —también asimétrico, y por la misma razón— y su
ventaja no está en el promedio sino en la **cola**: él sabe cuál es el ítem que puede arruinar el
contrato.

#### 1.1 · El precio no se evalúa contra un óptimo (leer antes de «afinar a la baja»)

En procesos regidos por **Documentos Tipo** —obligatorios desde la **Ley 2022 de 2020**, adoptados
para infraestructura de transporte por la **Resolución CCE 256 de 2020**, vigente desde el 1 de
enero de 2021— el **método de ponderación del precio se SORTEA al cierre** entre cuatro
alternativas: **mediana con valor absoluto, media geométrica (con o sin presupuesto oficial), media
aritmética baja y menor valor**; el sorteo se ancla en los **centavos de la TRM certificada por la
Superintendencia Financiera** para la fecha de cierre. **En tres de esas cuatro alternativas, ser el
más barato PIERDE puntos** [CONOCIDO — no verificable en esta corrida (403 en
`colombiacompra.gov.co`); verificar en el «Documento Base» del pliego tipo del proceso concreto,
capítulo de evaluación de la oferta económica, y en el articulado de la Ley 2022 de 2020].

**Consecuencia para el APU, y es la que cambia el uso de toda esta sección:** la precisión del APU
**no determina la probabilidad de ganar** —eso lo determinan la dispersión del resto de oferentes y
el método que salga en el balotaje, ninguno de los dos observable antes del cierre—; determina
**si el contrato es ejecutable con utilidad si se gana**. Se cotiza **al costo real más margen**, no
al mínimo que sobreviva el filtro de artificialidad. Bajar el precio para «mejorar la oferta» es,
bajo tres de los cuatro métodos, empeorarla y además comprometer la ejecución.

Corolario de producto: la app **no debe mostrar ninguna recomendación del tipo «baje X % para ser
competitivo»**. Puede mostrar la banda de costo, el presupuesto oficial y la advertencia de
artificialidad; nada más.

### 2 · Lo que ningún modelo ve

Nada de esto está en `p6dx-8zbt` ni en ningún dataset público, y todo esto es lo que se lleva por
delante los contratos:

| Hecho de sitio | Efecto típico en el costo | Cómo se sabe |
|---|---|---|
| Estado real de la vía de acceso (ancho, pendiente, puentes con límite de carga) | Flete de material ×1.5 a ×3; a veces obliga a acopio intermedio | Visita / recorrido |
| Cantera o fuente de material aluvial cercana y **con licencia vigente** | Subbase y base: dominan el presupuesto vial | Visita + verificación ANM/CAR |
| **Botadero autorizado** para el material de excavación | Sin él, el transporte de sobrantes se dispara y hay riesgo sancionatorio ambiental | Visita + PMA / autoridad ambiental |
| Disponibilidad de agua para concretos y compactación | Carrotanque permanente = costo indirecto no presupuestado | Visita |
| Interferencia de redes existentes (acueducto, gas, energía, fibra) sin planos | Rotura, suspensión, reparación por cuenta del contratista | Visita + empresas de servicios |
| Nivel freático y tipo de suelo real vs. el estudio | Entibado, bombeo, cambio de cimentación | Apiques / estudio propio |
| Comunidades, consulta previa, jornales locales pactados | Bloqueos, paros, sobrecosto de mano de obra | Visita + alcaldía |
| Ventana climática real (régimen bimodal, mes de lluvia) | Rendimientos ×0.5 durante semanas | Visita + IDEAM |
| Disponibilidad de la cuadrilla y del equipo en la región | Traslado y estadía de personal foráneo | Conocimiento local |

**[CONOCIDO — juicio de oficio de ingeniería de costos, NO medición sobre el corpus. Los
multiplicadores de esta tabla son órdenes de magnitud, no coeficientes calibrados.]**

Estos factores no son «ruido residual»: son **multiplicativos y sesgados hacia arriba**. Ningún
promedio los compensa — y es exactamente por eso que la banda del §1 se escribe asimétrica.

### 3 · Riesgo jurídico: quién responde por un APU mal calculado

**La regla central: el error propio no rompe la ecuación contractual.** El proponente que calcula
mal su oferta y gana, ejecuta a su costa. El desequilibrio económico y la teoría de la imprevisión
protegen frente a **álea anormal e imprevisible** —hecho del príncipe, sujeción material imprevista,
imprevisión— no frente a la impericia del oferente. El sistema de tipificación, estimación y
asignación de riesgos (Ley 1150 de 2007, art. 4, desarrollado en el Decreto 1082 de 2015) cierra la
puerta: **el riesgo que el pliego asignó al contratista, y que el contratista aceptó al ofertar, no
da lugar a restablecimiento** [CONOCIDO — jurisprudencia consolidada del Consejo de Estado,
Sección Tercera; no la verifiqué en esta sesión. Verificar con: buscador de jurisprudencia del
Consejo de Estado por «equilibrio económico + álea normal + riesgo previsible»].

| Situación | ¿Quién asume? | Base | Etiqueta |
|---|---|---|---|
| Rendimiento mal estimado por el oferente | **El contratista, íntegramente** | Álea normal del negocio; riesgo asignado en la matriz | [CONOCIDO] |
| Precio de insumo que subió más de lo previsto | El contratista, salvo álea anormal probada o fórmula de reajuste pactada | Teoría de la imprevisión | [CONOCIDO] |
| Cantidades **erróneas publicadas por la entidad** en el Formulario 1, en contrato **a precios unitarios** | Puede haber **reclamación**, y además la mayor cantidad ejecutada se paga | Deber de planeación (Ley 80, arts. 25 y 26) — la sección 1.C sí verificó estos artículos | [CONOCIDO] |
| Cantidades erróneas, en contrato a **precio global fijo o llave en mano** | **El contratista**: el riesgo de cantidad fue trasladado por el propio esquema de pago | Modalidad pactada + matriz de riesgos | [CONOCIDO] |
| Estudios previos o de suelos falsos/incompletos de la entidad | Reclamación viable | Ley 80, art. 26 (responsabilidad por pliegos y estudios) | [CONOCIDO] |
| Oferta **artificialmente baja** | La entidad **requiere explicación** y puede rechazar si no satisface | D. 1082/2015, art. 2.2.1.1.2.2.4 — [VERIFICADO en la sección 1.C, no por mí en esta sesión] | [CONOCIDO] |
| Propuesta con precios artificialmente bajos para ganar | Responsabilidad expresa del proponente | Ley 80, art. 26 num. 6 [INCIERTO en el numeral exacto — confirmar el articulado] | [INCIERTO] |

**Consecuencias reales del incumplimiento**, con la distinción que más se confunde:

- **Cláusula penal pecuniaria y multas**, con procedimiento y debido proceso (Ley 1150, art. 17)
  [CONOCIDO].
- **Siniestro de la garantía única de cumplimiento**: la aseguradora paga a la entidad y **repite
  contra el contratista y contra quienes hayan firmado contragarantías o pagarés a favor de la
  afianzadora**. En una **SAS los socios NO responden por serlo**: responden **si firmaron**. Antes
  de ofertar hay que leer qué firmó cada socio ante la aseguradora — **ese documento, no la ley, es
  el que define hasta dónde llega el daño patrimonial personal**. Génesis es SAS
  [VERIFICADO-REPO: `CLAUDE.md`, «Génesis es persona jurídica SAS»]; Helder es persona natural y
  ahí sí responde con todo su patrimonio por definición.
- **Declaratoria de incumplimiento**: multa y/o cláusula penal, **reporte en SECOP y en el RUP**, y
  —solo si hay **reiteración** en los términos de la **Ley 1474 de 2011, art. 90**— **inhabilidad de
  tres años** [CONOCIDO].
- **Declaratoria de CADUCIDAD** (el extremo): esta sí acarrea **inhabilidad de cinco años**,
  contados **desde la ejecutoria del acto** que la declaró (**Ley 80, art. 8, num. 1 lit. c y
  parágrafo**; la caducidad se regula en el art. 18) [VERIFICADO: articulado de Ley 80 arts. 8 y 18
  confirmado en la sección 1.C — el hecho que dispara los cinco años es la **caducidad**, no
  cualquier incumplimiento].

Para un perfil como el de Helder o Génesis, la caducidad no es una multa: es el fin del negocio. Y
añádase algo que ocurre **antes** de cualquier inhabilidad formal: un siniestro deja al proponente
**sin cupo asegurador**, lo que lo saca del mercado igual.

**Encaje con la doctrina que el repo ya tiene escrita.** Detecta ya declaró, para las equivalencias
funcionales, que son «**una AYUDA a la decisión, no una habilitación jurídica: quien decide si el
RUP alcanza es el pliego**» (`lib/equivalencias.js:10` y `README.md:671-672`)
[VERIFICADO-REPO]. **El APU automático debe llevar exactamente la misma etiqueta, con la misma
literalidad y en el mismo sitio de la tarjeta**: es una ayuda a la decisión, no un presupuesto de
oferta, y quien firma la propuesta económica es el ingeniero, no la app. Reusar la frase ya
existente no es cosmética: es la diferencia entre una herramienta interna y una herramienta que
alguien pega en un Formulario 1.

### 3-bis · Riesgo legal de automatizar, no de ofertar

El §3 cubre el riesgo de una oferta mal costeada. Este cubre el riesgo que nace de **construir la
herramienta**, que es distinto y recae sobre el dueño del sistema aunque nunca se presente a nada.

**(a) Firma profesional.** Quien firma la propuesta económica **responde con su matrícula**. El
ejercicio de la ingeniería en Colombia está reglado por la **Ley 842 de 2003** y la responsabilidad
**disciplinaria ante el COPNIA** es **independiente** de la contractual y de la penal: firmar un APU
generado por la app sin haber recalculado los ítems del 80 % expone **la matrícula**, no solo el
contrato [CONOCIDO — verificar el articulado de la Ley 842 (código de ética y régimen disciplinario)
antes de publicar este documento]. Consecuencia de producto: el modal de exportación debe pedir
**nombre y matrícula** del profesional responsable, y el exportado debe llevarlos impresos.

**(b) Licencia de las fuentes de precio.** Antes de ingerir cualquier lista tarifaria de tercero
—Construdata, tarifarios de IDU, INVÍAS, gobernaciones, cámaras de la construcción— hay que revisar
sus **condiciones de uso**. Las oficiales suelen publicarse como datos abiertos; las comerciales
**no lo son**, y su reproducción y redistribución dentro de la herramienta requiere licencia. Esto
es un riesgo del **sistema**, no del contrato, y no se resuelve con un descargo en el pie de página.
Regla operativa: **registrar la licencia junto a la fuente en el mismo campo de procedencia** que ya
exige el §5 (fuente + fecha + región + **licencia**), y no ingerir ninguna lista cuya licencia esté
en blanco.

**(c) Datos personales.** Si el APU incorpora jornales o costos de personal identificable, aplica el
régimen de habeas data que el repo ya contempla (`autorizacion_helder.md`) [VERIFICADO-REPO].

### 4 · Validación humana obligatoria (checklist, ordenado por riesgo)

| # | Punto | Por qué está en ese puesto |
|---|---|---|
| 0 | **Modalidad de pago del contrato**: precios unitarios (¿con fórmula de reajuste?), precio global fijo, o llave en mano | Decide quién soporta el error de cantidades. Sin este dato, las bandas del §1 no se pueden interpretar |
| 1 | **Ítems que suman el 80 % del valor, recalculados a mano** (regla 80/20) | Un error aquí no lo compensa nada |
| 2 | **Cantidades contra el Formulario 1 oficial**, ítem por ítem, unidad por unidad | La app puede haber inferido; el pliego manda |
| 3 | **Visita al sitio** (o declaración escrita de por qué se omite) | Es el único origen de los datos del §2 |
| 4 | **Verificación aritmética completa**: subtotales, valor parcial = cantidad × unitario, suma del total, redondeos | La entidad **corrige** la aritmética de la propuesta y **el valor corregido rige**: el peligro no es el rechazo automático, sino que el valor **corregido** supere el presupuesto oficial (ahí sí hay rechazo) o que el error te deje ejecutando a un precio que no calculaste [CONOCIDO — confirmar la regla de corrección aritmética en el Documento Tipo del proceso concreto] |
| 5 | **AIU**: A coherente con el plazo, con el personal mínimo del pliego y con el **esquema de pago**; I contra la **matriz de riesgos** del proceso; U decidida por el dueño | El I no lo puede poner una máquina. Y el esquema de pago mueve el A más que ninguna otra variable — ver la nota debajo de la tabla |
| 6 | **Carga tributaria y parafiscal completa, calculada sobre el valor OFERTADO** — ver el desglose debajo de la tabla | Es el bloque que se olvida y se come la utilidad entera |
| 7 | **Precio total vs. presupuesto oficial**: por encima hay rechazo; por debajo, preparar la defensa de artificialidad. **No «afinar a la baja» para ganar** | §1.1 y §3 |
| 8 | **Umbral de artificialidad del pliego**, si el proceso lo define | Preparar la justificación *antes*, no después |
| 9 | **Plazo contractual** y su efecto en A, en el **SCE (Saldo de Contratos en Ejecución, el sustraendo de la fórmula de capacidad residual `CRP = CO × (E+CT+CF)/100 − SCE`)** y en la K de contratación | La K ya la calcula `lib/capacidad.js` [VERIFICADO-REPO]; el plazo la mueve |
| 10 | **Pólizas**: amparos, porcentajes y vigencias exigidos por el pliego, y **cupo real con la aseguradora** | Sin cupo, no hay oferta |
| 11 | **Antigüedad, fuente, región y licencia de cada precio** usado, ítem por ítem | §3-bis(b) y §5 |
| 12 | **Requisitos habilitantes**: RUP vigente, códigos UNSPSC exigidos, experiencia de la Matriz 1, indicadores financieros | El juicio de la app es indicativo |
| 13 | **Personal mínimo y equipo mínimo** exigidos, y su costo real | Suelen ir al A, no al costo directo |
| 14 | **Adendas** publicadas hasta el cierre | Cambian cantidades y plazos |
| 15 | **Firma de un profesional** que asuma el número, con matrícula | Cierra la cadena de responsabilidad — §3-bis(a) |

Los puntos **0 a 6 son bloqueantes**: sin ellos no se presenta oferta, aunque la app diga verde.

**Desglose del punto 6 — la carga que se come la utilidad** (todo [CONOCIDO], ninguno verificado en
esta corrida):

| Concepto | Base de cálculo | Referencia | Nota |
|---|---|---|---|
| (a) **Contribución especial de obra pública, 5 %** | Valor total del contrato **sin impuestos**, y de sus adiciones | Ley 418 de 1997, art. 120, modificado por Ley 1106 de 2006, art. 6, prorrogado sucesivamente | **Verificar la vigencia de la prórroga aplicable al año del proceso** antes de usarla. Es el mayor descuento de todos |
| (b) **IVA** | Sobre los **honorarios** pactados o, si no se pactan, sobre la **utilidad del constructor** | D. 1372 de 1992, art. 3, hoy compilado en D. 1625 de 2016, art. 1.3.1.7.9 | **OJO**: a los contratos de **construcción de bien inmueble** NO les aplica la base especial sobre AIU del **art. 462-1 ET** (esa es para vigilancia, aseo, temporales y similares). Confundirlas cambia la base gravable |
| (c) **Retención en la fuente** por obra | Valor del pago o abono en cuenta | Estatuto Tributario y decretos de tarifas | Es flujo de caja, no costo definitivo, pero mata la caja del primer trimestre |
| (d) **Estampillas** departamentales y municipales | Valor del contrato, tarifas propias de cada ente territorial | Ordenanzas y acuerdos locales | **No hay tarifa nacional**: se leen en el pliego del proceso concreto |
| (e) **ICA** | Ingresos en el municipio de ejecución | Acuerdos municipales | Tarifa por municipio |

**Sumar (a) + (c) + (d) suele superar el 8 % del valor del contrato. Si la U ofertada es 5 %, el
contrato pierde dinero antes de empezar.** Este bloque se calcula sobre el valor **ofertado**, no
sobre el costo directo, y por eso hay que resolverlo **antes** de cerrar el precio, no después.

**Nota del punto 5 — el esquema de pago.** ¿Hay **anticipo**, **pago anticipado** o **ninguno**? No
son lo mismo: el **anticipo** es **amortizable**, va a **fiducia o patrimonio autónomo**, **no es
ingreso** del contratista y exige **póliza de buen manejo y correcta inversión**; el **pago
anticipado** sí es ingreso, no se amortiza y tributa distinto. **Sin anticipo, el A debe incorporar
el costo financiero de financiar la obra hasta el primer acta**, más el costo de la fiducia si la
hay. Y hay que recordar la trampa que el repo ya documenta: en `p6dx-8zbt`, **`anticipo_pct = 0`
significa SIN DATO, no «sin anticipo»** [VERIFICADO-REPO: `CLAUDE.md`]. Se lee del pliego; **nunca
se asume**.

**Regla de actualización de precios antiguos** (complementa el punto 11): un precio **de la misma
región** con menos de 24 meses puede actualizarse con el índice DANE de costos de construcción
pesada / obras civiles (**ICOCIV**) o el **ICCV** para edificación, dejando siempre visibles el
**precio base, la fecha base y el índice aplicado** [CONOCIDO — no pude abrir `dane.gov.co` (403);
verificar el nombre y la vigencia actual del índice antes de cablearlo]. **ADVERTENCIA: el índice
corrige la VARIACIÓN temporal, no el NIVEL regional.** Un precio de otro departamento actualizado
por índice sigue siendo un precio de otro departamento: el **badge de región no se levanta por
haber actualizado la fecha**. Los dos badges —antigüedad y región— son **independientes** y se
muestran por separado.

### 5 · Diseño antifrágil de la interfaz

La app ya tiene la doctrina correcta y solo hay que extenderla al APU. Precedentes reales del repo
[VERIFICADO-REPO]: `anticipo_pct = 0` significa «sin dato», no «anticipo cero» (CLAUDE.md);
`0 oferentes` es «sin dato», no «nadie se presentó»; el badge de competencia **no interpola cifra
sin `conBase`** (mínimo 5 procesos, nivel clasificado y promedio presente); la K se muestra como
«Capacidad K ✓ **(CO estimado)**» cuando el ingreso operacional fue estimado
(`public/app.js:256`, `lib/rup.js:74`); y existe el chip «Verificar objeto»
(`lib/filtros.js:205`) para lo indeterminado.

| Regla de interfaz | Traducción al APU |
|---|---|
| **Rango asimétrico, nunca punto** | Mostrar `$X – $Y` con la banda del §1 (que **no** es simétrica) y el punto solo dentro del rango, en menor jerarquía visual |
| **Modalidad de pago visible y obligatoria** | Chip fijo: «Precios unitarios» / «Global fijo» / «Llave en mano» / **«Modalidad no leída»** — con esta última, el APU no exporta |
| **`0` ≠ «no sé»** | Un ítem sin precio de fuente se muestra **vacío y en rojo**, jamás en 0 ni con un promedio nacional silencioso |
| **Procedencia por ítem** | Cada precio con **fuente + fecha + región + licencia**; si la fuente es de otro departamento o >12 meses, **badge ámbar automático** |
| **Dos badges independientes** | Antigüedad y región **no se cancelan entre sí**: actualizar por índice apaga el de fecha y **deja encendido el de región** |
| **Etiqueta de estimación heredada de la K** | «Precio estimado», «Rendimiento por defecto», «Cantidad inferida» — visibles en la fila, no en un tooltip |
| **Semáforo con la lógica de pertinencia** | Rojo = no exportable; ámbar = revisar; verde = con base. Y **nunca bloquear por falta de información** (doctrina ya escrita), pero **sí impedir exportar** |
| **Nada de consejos de precio** | La app **no** sugiere bajar el precio para competir: bajo tres de los cuatro métodos de ponderación sorteables, el más barato pierde puntos (§1.1) |
| **Confirmación explícita antes de exportar** | Modal que exige marcar los **7 puntos bloqueantes** del §4 y escribir **nombre y matrícula** del profesional responsable |
| **Marca de agua en el exportado** | «BORRADOR — ayuda a la decisión, no habilitación jurídica. Requiere validación profesional» |
| **Peso relativo visible** | Ordenar los ítems por \(w_i\) descendente y sombrear los que acumulan el 80 %: dirige la revisión humana al sitio correcto |
| **Precedente de los destacados** | Los destacados del panel ya aplican **cuatro filtros más** que el listado porque «un falso positivo en el puesto 1 cuesta más que uno en la página 4». El APU exportable es un destacado: debe ser **más conservador**, no más completo |

### 6 · Cuándo NO usar el sistema

1. **Sin Formulario 1 con cantidades publicado** y sin memoria de cantidades: el error de cantidades
   domina todo lo demás y ninguna precisión de precios lo salva.
2. **Contratos a precio global fijo o llave en mano** (PTAP, PTAR completas, edificaciones con
   especialidades). El motivo no es la complejidad técnica: es que **el riesgo de cantidad lo
   absorbe íntegro el contratista** y la fila que domina la banda es justamente la que el sistema
   estima peor.
3. **Tipologías fuera del catálogo cerrado** de la sección 1.D, o clasificación ambigua (P1 y P2
   cercanos).
4. **Obras con componente geotécnico o estructural gobernante**: puentes, pantallas ancladas,
   estabilización de taludes, cimentaciones profundas. El diseño manda sobre el precio.
5. **Zonas sin cobertura de precios regionales** o de acceso fluvial/aéreo (Amazonía, Chocó,
   Guainía, Vaupés, La Guajira alta) [CONOCIDO].
6. **Contratos que consumen casi toda la K disponible.** No es un problema de precisión del APU: es
   de **cartera**. Adjudicado ese contrato, el perfil queda **sin capacidad residual para
   presentarse a nada más** hasta liberarla. Es una decisión de portafolio, **previa** al APU, y la
   K la calcula `lib/capacidad.js` [VERIFICADO-REPO], no el APU.
7. **Contratos donde el error absoluto del APU supera la utilidad esperada.** Con U = 5 % y una
   banda de ±15 %, el escenario adverso **borra tres veces la utilidad**. Regla:
   **si banda × valor > utilidad esperada, se costea a mano o no se presenta.** Es independiente
   del punto anterior: un contrato pequeño puede fallar esta prueba y no tocar la K, y uno grande
   puede consumir la K siendo perfectamente costeable.
8. **Concesiones, APP y esquemas de estructuración** — el repo ya los descarta con
   `TERMINOS_ESTRUCTURACION` [VERIFICADO-REPO]: ahí no se cotiza obra, se aporta capital.
9. **Procesos con matriz de riesgos agresiva** (riesgo geológico, de cantidades o de precios
   trasladado íntegro al contratista): el I del AIU deja de ser un porcentaje y pasa a ser una
   decisión de riesgo empresarial.
10. **Cuando la banda del §1 cambia la respuesta a «¿es ejecutable con utilidad?».** Nótese la
    pregunta: **no** es «¿estoy lo bastante bajo para ganar?» —esa no la responde el APU y bajo tres
    de los cuatro métodos de ponderación ni siquiera es la pregunta correcta (§1.1)—. Si en el
    extremo alto de la banda el contrato pierde plata, la banda no sirve: hay que costear a mano
    antes de decidir.

#### Vacios y siguiente paso

- **Nada normativo quedó [VERIFICADO] en esta corrida.** WebSearch agotado (200/200) y **403** en
  `colombiacompra.gov.co` y `dane.gov.co` (y previamente en `sintesis.colombiacompra.gov.co`,
  `funcionpublica.gov.co`, `secretariasenado.gov.co`). *Siguiente paso:* en una corrida con acceso,
  confirmar textualmente:
  - **Ley 80** arts. 5, 8 (num. 1 lit. c y parágrafo), 18, 25, 26 (incl. el numeral de precios
    artificialmente bajos), 27 y 50.
  - **Ley 1150** arts. 4 y 17; **Ley 1474 de 2011 art. 90** (inhabilidad de 3 años por
    incumplimiento reiterado).
  - **Ley 418/1997 art. 120** y **Ley 1106/2006 art. 6**, y **cuál es la prórroga vigente** para el
    año del proceso — sin eso, el 5 % de contribución especial es un supuesto, no un dato.
  - **D. 1372/1992 art. 3** / **D. 1625/2016 art. 1.3.1.7.9** y **art. 462-1 ET**, para dejar
    escrito por qué la base del IVA de construcción no es la del AIU.
  - **Ley 2022 de 2020** y **Resolución CCE 256 de 2020**, y el capítulo de evaluación económica del
    Documento Base vigente: **los cuatro métodos y el mecanismo exacto del sorteo con la TRM**. Es
    la afirmación de mayor impacto de esta sección y hoy está solo [CONOCIDO].
  - **Ley 842 de 2003** (ejercicio profesional de la ingeniería, régimen disciplinario COPNIA).
  - **D. 1082/2015** arts. 2.2.1.1.2.2.4 y los de suficiencia de garantías. **Los porcentajes de
    pólizas no los escribí a propósito: los recuerdo de forma aproximada y un número de póliza
    equivocado es exactamente el tipo de dato que arruina una oferta.**
- **Los rangos de error del §1 y del §2 son juicio de oficio, no medición**, y así están rotulados
  dentro de las propias tablas para que la etiqueta viaje si alguien las extrae sueltas.
  *Protocolo de calibración:* (1) descargar los Formularios 1 de procesos adjudicados de **una sola
  tipología** del histórico —`licitaciones:historico:mes:*`, que nada purga [VERIFICADO-REPO]—;
  (2) calcular la distribución empírica de \(w_i\) para verificar la regla 80/20; (3) comparar el
  precio unitario ofertado por el adjudicatario contra el estimado por la app en los mismos ítems,
  y reportar la **desviación estándar relativa** de esa diferencia: eso da los `cv_i` reales y
  permite reemplazar la columna «Típico» por números medidos. **Ojo:** el Formulario 1 vive en los
  documentos del proceso, **no** en `p6dx-8zbt`.
- **La banda asimétrica del §1 no está calibrada tampoco.** Con los `cv_i` medidos por el protocolo
  anterior, la asimetría deja de ser un juicio y pasa a ser el sesgo observado del estimador.
- **No se pudo determinar si `p6dx-8zbt` expone algún campo de presupuesto desagregado por ítem.**
  Casi con seguridad no (es dataset de proceso, no de presupuesto). *Consulta SoQL exacta a lanzar
  en producción, donde sí hay salida a datos.gov.co:*
  `https://www.datos.gov.co/resource/p6dx-8zbt.json?$select=:*,*&$limit=1` y revisar el listado de
  columnas devuelto contra los nombres que ya lee `lib/proyeccion.js`. [PENDIENTE DE VERIFICAR EN
  PRODUCCIÓN]
- **Falta saber si el dataset expone la modalidad de pago** (precios unitarios / global fijo) y el
  esquema de anticipo de forma estructurada. Si no, ambos son campos de captura manual y así deben
  aparecer en el APU. *Consulta:* la misma de arriba, buscando columnas cuyo nombre contenga
  `modalidad`, `forma_de_pago`, `anticipo` o `tipo_de_contrato`. [PENDIENTE DE VERIFICAR EN
  PRODUCCIÓN]
- **Umbral de artificialidad**: no consta un porcentaje legal general (el pliego lo fija).
  *Siguiente paso:* extraer el umbral de los Documentos Tipo de infraestructura de transporte
  vigentes y, si el pliego calla, **no mostrar ninguna alerta numérica** — solo el aviso cualitativo.
- **Licencias de las listas de precios**: sin resolver. *Siguiente paso:* antes de ingerir cualquier
  tarifario, leer sus condiciones de uso y registrarlas; si están en blanco, no se ingiere.
- **Falta decidir con el dueño el umbral de exportación**: qué combinación de banda, cobertura de
  precios y modalidad de pago habilita el botón «exportar». Es una decisión de riesgo suya, no
  técnica.


---

## 2.A — Anatomia de costos de un contrato de obra civil colombiano

> **Convención de fuentes.** `[VERIFICADO]` = norma o cifra confirmada contra la fuente oficial,
> citada con artículo o número de resolución para poder repetir la consulta. `[CONOCIDO]` =
> práctica de industria u orden de magnitud sólido, sin publicación que lo audite. `[INCIERTO]` =
> hay que confirmarlo antes de meterlo en un modelo. Los porcentajes de estructura de costos son
> órdenes de magnitud de industria, no cifras auditadas: se usan para *ordenar* decisiones, no
> para cotizar un ítem.

### 1. Costos directos

El costo directo (CD) es lo que se mide en el APU: materiales + mano de obra + equipo +
transporte, por unidad de obra. Todo lo demás se cuelga encima de él.

#### 1.1 Reparto del CD ejecutado directamente

Los cuatro renglones son una **partición**: la columna «caso central» suma exactamente 100 % del
CD. Los extremos de los rangos **no son simultáneos** — cualquier combinación que se arme hay que
renormalizarla a 100.

| Componente del CD | Caso central (% del CD) | Rango (% del CD) | Variabilidad | Cómo se estima |
|---|---|---|---|---|
| Materiales | 50 % | 35–62 % | **Alta** (precio y desperdicio) | Cantidades × precio puesto en obra × (1 + desperdicio) |
| Mano de obra | 25 % | 12–38 % | Media-alta (rendimiento) | Cuadrilla × jornal cargado ÷ rendimiento (und/día) |
| Equipo y herramienta | 17 % | 5–38 % | Alta en movimiento de tierras | Tarifa horaria × horas ÷ rendimiento; herramienta menor 3–5 % de la MO |
| Transporte de materiales | 8 % | 2–25 % | **Muy alta** (distancia y estado de vía) | m³·km o ton·km × tarifa; sube con acarreo interno |
| **Suma** | **100 %** | — | | |

*Todas las cifras del cuadro: [CONOCIDO], práctica de elaboración de APU.*

#### 1.2 Subcontratos — no es un quinto renglón

| Concepto | Valor | Nota |
|---|---|---|
| % del CD ejecutado por terceros | 0–70 % | **Sustituye, no suma**: el precio del subcontrato ya contiene materiales, mano de obra, equipo y transporte de esa porción de obra |
| Margen que paga el subcontrato | 10–20 % sobre el costo del subcontratista | Más si la especialidad es escasa en la región (pilotaje, geotecnia, prefabricados) |

Efecto tóxico: el contratista principal conserva **todo el riesgo** (plazo, calidad, pólizas,
multas) pero cede el margen de esa porción. Con un 50 % de la obra subcontratada, la U real puede
quedar en 2–3 % aunque el AIU declare 5 %. [CONOCIDO]

#### 1.3 Desperdicio: el de presupuesto no es el de obra

| Concepto | Valor | Comentario |
|---|---|---|
| Desperdicio **presupuestado** en el APU | 3–5 % | Es lo que se carga en la propuesta; a veces 0 % en ítems "limpios" |
| Desperdicio **real medido en obra** | 5–12 % | Diferencia estructural que se come la utilidad sin aparecer en ningún acta |
| Acero de refuerzo (despuntes) | 5–10 % | Depende del despiece y de la longitud comercial |
| Cerámica / enchapes (cortes) | 7–15 % | Geometría del espacio y formato de la pieza |
| Concreto (bombeo, sobreexcavación, rebose) | 4–10 % | Sobreexcavación en zapatas y pilas es el sumidero clásico |
| Mortero / pega | 8–15 % | Muy sensible a la disciplina de la cuadrilla |

*[CONOCIDO] en todo el cuadro.*

De qué depende que el real se dispare: sobreexcavación y sobreanchos que se pagan al proveedor
pero no se miden en el acta; almacenamiento y manejo (cemento apelmazado, tubería rota, agregado
contaminado); **hurto reclasificado como desperdicio**; lluvia y reprocesos; precisión del
replanteo; fraccionamiento de pedidos por debajo del lote comercial. **Si el APU se armó con 3 % y
la obra opera al 9 %, la diferencia sale directa de la U.**

#### 1.4 Mano de obra: factor prestacional

Jornal cargado = salario básico × factor prestacional (FP). Descomposición aditiva simplificada
para obra civil con nómina formal:

| Concepto | % sobre básico | Nota |
|---|---|---|
| Cesantías | 8,33 % | |
| Intereses a las cesantías | 1,00 % | |
| Prima de servicios | 8,33 % | |
| Vacaciones | 4,17 % | 15 días hábiles/año |
| Pensión (aporte empleador) | 12,00 % | |
| Salud (aporte empleador) | 8,50 % | **Exonerada** para trabajadores con IBC < 10 SMMLV en sociedades y en personas naturales con ≥2 empleados — art. 114-1 ET [VERIFICADO] |
| ARL clase V (construcción) | 6,96 % | Tarifa **inicial** de la clase V. Ver nota abajo |
| Caja de compensación familiar | 4,00 % | No exonerada |
| SENA 2 % + ICBF 3 % | 5,00 % | Igualmente exonerados bajo art. 114-1 ET para IBC < 10 SMMLV |
| Dotación, auxilio de transporte, EPP | 3–8 % | En obra el EPP es recurrente, no anual |
| **Subtotal sin exoneración** | **61,3 – 66,3 %** | 8,33+1,00+8,33+4,17+12,00+8,50+6,96+4,00+5,00 = 58,29, más dotación 3–8 |
| **FP sin exoneración** | **1,61 – 1,66** | |
| **FP con exoneración art. 114-1 ET** (IBC < 10 SMMLV) | **1,48 – 1,53** | Restando 8,50 (salud) + 5,00 (SENA/ICBF) = 47,8–52,8 % |

**El 1,70–1,90 es otra cosa y multiplica, no sustituye.** Es el **factor de improductividad**
(tiempos muertos, lluvia, curva de aprendizaje, traslados entre frentes) que se aplica *sobre* el
jornal ya cargado con el FP. Confundirlos es subcotizar la mano de obra en un 20 % de golpe.
[CONOCIDO]

**ARL clase V — el 6,96 % no es el techo.** La tabla de cotización fija para la clase de riesgo V
un **mínimo de 4,350 %, un valor inicial de 6,960 % y un máximo de 8,700 %**, y la ARL mueve la
tarifa dentro de ese rango según la siniestralidad de la empresa (Decreto 1772 de 1994, compilado
en el Decreto 1072 de 2015) [VERIFICADO]. Una empresa con accidentalidad alta puede estar pagando
8,70 %: **1,74 pp de FP que nadie presupuestó**. Verificar la tarifa efectivamente asignada por la
ARL antes de armar el APU, no asumir la inicial.

SMMLV 2026 = **$1.750.905** (Decreto 1469 de 2025, +23 % sobre 2025; mantenido transitoriamente
por el Decreto 159 del 19 de febrero de 2026 tras la suspensión provisional decretada por el
Consejo de Estado) [VERIFICADO]. El mismo valor está en `lib/perfiles.js` del repositorio
[VERIFICADO en el repo].

#### 1.5 Equipo: propio vs. alquilado

| Rubro (equipo propio) | Peso en la tarifa horaria | Nota |
|---|---|---|
| Depreciación / recuperación de capital | 30–45 % | Vida útil en **horas**, no en años |
| Mantenimiento y repuestos | 15–30 % | Sube fuerte con la edad de la máquina |
| Combustible y lubricantes | 20–40 % | El más volátil |
| Operador (con FP) | 15–25 % | |
| Seguros, impuestos, parqueo | 3–8 % | |
| **Movilización / desmovilización** | Ítem aparte | **Costo fijo por obra**: castiga desproporcionadamente los contratos pequeños y lejanos |

*[CONOCIDO] en todo el cuadro.*

Alquilar traslada el riesgo de disponibilidad pero paga el margen del arrendador (15–30 % sobre su
costo). Para los perfiles de Detecta —una persona natural y una SAS pequeña— la regla práctica es:
**equipo propio solo si la utilización proyectada supera ~60 % del año**; por debajo, alquilar sale
más barato que financiar un activo ocioso. [CONOCIDO]

### 2. Costos indirectos — la "A" del AIU

#### 2.1 Nómina indirecta, en SMMLV/mes cargados

El indirecto de personal es **función del plazo, no del valor**. Se calcula en SMMLV/mes y se
multiplica por los meses. Equipo completo de un contrato de cuantía media (1.000–3.000 SMMLV):

| Cargo | Dedicación | Básico (SMMLV/mes) | Ponderado por dedicación | Cargado × FP 1,50 |
|---|---|---|---|---|
| Director de obra | 35 % | 10 | 3,50 | 5,25 |
| Residente de obra | 100 % | 5,0 | 5,00 | 7,50 |
| Maestro general | 100 % | 3,75 | 3,75 | 5,63 |
| Inspector HSE / SST | 75 % | 4,0 | 3,00 | 4,50 |
| Topógrafo + cadenero | 65 % | 4,65 | 3,02 | 4,53 |
| Almacenista | 100 % | 2,5 | 2,50 | 3,75 |
| Profesional ambiental | 35 % | 5,0 | 1,75 | 2,63 |
| Profesional social | 35 % | 4,0 | 1,40 | 2,10 |
| **Total** | | | **23,9 SMMLV/mes** | **≈ 36 SMMLV/mes** |

*Salarios de referencia: [CONOCIDO], órdenes de magnitud del mercado, **no verificados** contra
una tabla salarial publicada. El anexo técnico del pliego casi siempre fija el personal mínimo y
su dedicación: ése manda, no este cuadro. Con equipo reducido (menor cuantía sin ambiental ni
social dedicados) el total cae a 16–22 SMMLV/mes cargados.*

#### 2.2 Otros indirectos, también en SMMLV/mes

| Otro indirecto | SMMLV/mes | Cómo se estima |
|---|---|---|
| Campamento, bodega, cerramiento, baños | 0,8–2,5 | Global por m² y meses de plazo |
| Señalización y manejo de tráfico | 0,3–2,0 | Vial urbano; a veces es ítem pagado aparte |
| Servicios públicos provisionales | 0,2–0,5 | Consumo estimado × plazo |
| Laboratorio y ensayos | 0,4–1,5 | Nº de ensayos × tarifa |
| Vehículo, combustible y viáticos | 0,8–2,0 | Km/mes × tarifa + alojamiento |
| Oficina central prorrateada | 1,2–3,0 | Gastos fijos anuales ÷ facturación anual esperada |
| Pólizas, prorrateadas al mes | 0,5–1,5 | Ver §3 |
| **Total otros indirectos** | **4,2–13,0** | Usar 5–8 en cuantía ~1.000 SMMLV, 8–11 en ~3.000 |

*[CONOCIDO] en todo el cuadro.*

#### 2.3 La "A" no es un porcentaje: es una división

> **A = (nómina indirecta mensual cargada + otros indirectos mensuales) × plazo en meses ÷ valor
> del contrato**

Ése es el punto que más dinero mueve de toda la sección. El «A = 5–10 %» de manual **no aplica a
la cuantía en la que operan Helder y Génesis**:

| Cuantía | Plazo | Nómina cargada (SMMLV/mes) | Otros (SMMLV/mes) | **A sobre valor total** |
|---|---|---|---|---|
| 500 SMMLV | 4 meses | 16–22 | 3–5 | **15–22 %** |
| 1.000 SMMLV | 6 meses | 22–28 | 5–8 | **16–22 %** |
| 3.000 SMMLV | 12 meses | 30–38 | 8–11 | **15–20 %** |
| 10.000 SMMLV | 18 meses | 50–65 | 13–19 | **11–15 %** |
| ≥ 30.000 SMMLV | 24 meses | 80–100 | 25–35 | **8–11 %** |

*Cálculo aritmético sobre los supuestos de §2.1 y §2.2; los supuestos son [CONOCIDO], la división
es exacta. El «5–10 %» clásico solo aparece por encima de ~30.000 SMMLV, o cuando el pliego no
exige equipo completo.*

Dos lecturas del cuadro: (1) **A sube al bajar la cuantía y al alargarse el plazo** —el mismo
equipo cuesta lo mismo repartido entre 500 o entre 30.000 SMMLV—; (2) **una prórroga sin obra
adicional es utilidad quemada**: dos meses de prórroga en el contrato de 1.000 SMMLV cuestan ~6 pp
del valor, más que toda la U declarada.

### 3. Pólizas y garantías

| Garantía | Suficiencia típica | Vigencia típica | Base normativa |
|---|---|---|---|
| Seriedad de la oferta | 10 % del valor de la oferta o del presupuesto oficial | Desde la presentación hasta la aprobación de la de cumplimiento | art. 2.2.1.2.3.1.9 D.1082/2015 [VERIFICADO] |
| Cumplimiento | 10 % del valor del contrato como mínimo (10–20 % en la práctica) | Plazo + liquidación (típ. +4 a 6 meses) | art. 2.2.1.2.3.1.12 D.1082/2015 [VERIFICADO] |
| Buen manejo y correcta inversión del **anticipo** | **100 % del anticipo** | Hasta la amortización total | tít. 2.2.1.2.3 D.1082/2015 [CONOCIDO] |
| Devolución del **pago anticipado** | **100 % del monto pagado por anticipado** | Hasta la liquidación o la entrega de lo asociado al pago | tít. 2.2.1.2.3 D.1082/2015 [CONOCIDO — confirmar el numeral] |
| Pago de salarios, prestaciones e indemnizaciones | 5 % del valor total del contrato | Plazo + **3 años** | tít. 2.2.1.2.3 D.1082/2015 [CONOCIDO] |
| Estabilidad y calidad de la obra | 10–30 % del valor | **No inferior a 5 años** desde el recibo a satisfacción | tít. 2.2.1.2.3 D.1082/2015 [CONOCIDO] |
| Responsabilidad civil extracontractual | Mínimos escalonados en SMMLV (orden de 200 SMMLV en contratos pequeños) | Plazo del contrato | tít. 2.2.1.2.3 D.1082/2015 [CONOCIDO] |

*Lo marcado [CONOCIDO] se verifica artículo por artículo en el título 2.2.1.2.3 «Garantías» del
Decreto 1082 de 2015 y en el Manual de Garantías de Colombia Compra Eficiente.*

| Costo real de la prima | % sobre valor asegurado | Comentario |
|---|---|---|
| Contratista con historial y cupo aprobado | 0,8–2,0 % anual | |
| Persona natural / SAS pequeña sin cupo | 2,0–5,0 % anual, o **sin oferta** | [CONOCIDO — órdenes de magnitud] |
| Paquete completo de garantías sobre el valor del contrato | **1–3 %** | La estabilidad a 5 años es la que más pesa |

**Advertencia operativa.** Para Helder (persona natural) y para Génesis (SAS pequeña) la
aseguradora normalmente exige **contragarantías**: pagaré en blanco con carta de instrucciones,
garantía real, codeudor o pignoración de CDT. El resultado es que **la póliza —no la capacidad
técnica ni la K— es el cuello de botella real**: se gana el proceso y no se puede firmar.
Consecuencias para el modelo de Detecta:

1. El **cupo de afianzamiento disponible** es una restricción que se agota con cada contrato en
   ejecución, igual que el SCE agota la K en `lib/capacidad.js`.
2. Un contrato con **estabilidad a 5 años** inmoviliza cupo durante 5 años, no durante el plazo.
3. La pregunta antes de presentarse a un proceso grande no es solo «¿supero la K?», sino
   «¿tengo cupo y contragarantía para la de cumplimiento + estabilidad, y aguanto la baja?».

### 4. Impuestos y descuentos de acta

Estos **no** son costos de operación: son descuentos que la entidad practica **sobre cada acta
parcial**. Unos son costo definitivo y otros solo efecto de caja — distinguirlos es la mitad del
análisis.

| Descuento | Tarifa | Base | Verificación |
|---|---|---|---|
| Retención en la fuente — construcción de obra material de bien inmueble | **2 %** | Valor total del pago o abono en cuenta | **[VERIFICADO]** par. 2 art. 1.2.4.9.1 DUR 1625/2016 |
| Retención en la fuente — **administración delegada** | **11 %** persona jurídica / **10 %** persona natural, sobre **honorarios** | Honorarios, no valor de obra | **[VERIFICADO]** arts. 1.2.4.4.9 y 1.2.4.10.2 DUR 1625/2016 |
| Retención de IVA | 15 % del IVA facturado | IVA del acta | [CONOCIDO] art. 437-2 ET |
| **ICA** (se recauda por **retención** practicada por la entidad — no son dos gravámenes) | **2 a 10 por mil** en el régimen general de la Ley 14/1983; hasta **13,8 por mil** en Bogotá por el Decreto Ley 1421/1993 | Ingreso bruto del acta | [VERIFICADO] los topes; la tarifa **exacta de la actividad de construcción** en cada municipio es [INCIERTO] — se lee del acuerdo tarifario local |
| Estampilla Pro Universidad Nacional (Ley 1697/2013) | escalonada por cuantía; contratos de obra con entidades del **orden nacional** | Valor del contrato y adiciones | [INCIERTO] en los cortes de cuantía — verificar el texto de la Ley 1697 |
| Estampillas departamentales/municipales (pro cultura, pro adulto mayor, pro hospital, pro desarrollo, pro electrificación) | 0,5–2 % **cada una** | Valor del acta | [CONOCIDO] — dependen de ordenanza/acuerdo, varían por territorio |
| **Suma de estampillas** | **3–6 %** típico; hasta 8 % en algunos departamentos | | [CONOCIDO] |
| **Contribución especial de obra pública** | **5 %** | Valor total del contrato y de cada adición, **sin incluir impuestos** | **[VERIFICADO]** — ver abajo |
| Retención en garantía (retegarantía) | 5–10 % de cada acta, devuelta en la liquidación | | [CONOCIDO], práctica contractual, no tributaria |

#### 4.1 Contribución especial de obra pública — 5 %, y es permanente

**5 % del valor total del contrato o de la adición, sin incluir impuestos.**

- **Origen**: art. 120 de la Ley 418 de 1997, modificado por el art. 37 de la Ley 782 de 2002 y
  por el **art. 6.º de la Ley 1106 de 2006**. (El «artículo 6» es de la Ley 1106, no de la 418:
  citarlo mal es el error más repetido en la literatura de contratación.) [VERIFICADO]
- **Vigencia**: **PERMANENTE**. El parágrafo del art. 8.º de la **Ley 1738 de 2014** dispuso que
  los artículos 5.º y 6.º de la Ley 1106 de 2006 tienen vigencia permanente. La contribución **no
  depende de ninguna prórroga de la Ley 418 y no vence en 2026**. [VERIFICADO]
- **Base gravable**: valor total del contrato **sin incluir impuestos** — DIAN, Oficio 7086 de
  2016. [VERIFICADO]
- **Ámbito**: aplica a **obra pública**, no a consultoría ni a interventoría. [VERIFICADO]
- **Destino** (no es un descuento adicional, es a dónde va el mismo 5 %): FONSECON si la entidad
  contratante es del **orden nacional**, FONSET si es **departamental o municipal**. [CONOCIDO]

**Para Detecta: el 5 % es un costo cierto y siempre entra al modelo.** No hay escenario «con» y
«sin».

#### 4.2 Efecto neto: dos líneas, no una

Meter en el mismo saco los impuestos definitivos y las retenciones recuperables produce una
conclusión falsa. Se separan así:

| Línea | Componentes | Magnitud sobre el valor del contrato | Naturaleza |
|---|---|---|---|
| **Costo definitivo no recuperable** | 5 % contribución de obra + 3–6 % estampillas + 0,4–1,0 % ICA | **8,4 – 12 %** | **No vuelve nunca.** DEBE estar cargado en la A o en un renglón propio de la oferta |
| **Efecto de caja recuperable** | 2 % retefuente (se cruza en la declaración de renta) + ~0,7 % reteICA (anticipo del ICA ya contado arriba) + 5 % retegarantía (se devuelve en la liquidación) | **≈ 7,7 %** | Se recupera; el costo es **financiero**, no tributario |

El resumen honesto de un acta en un municipio de estampillas medias es: **≈ 8 pp de caja diferida
más ≈ 9 pp de tributo definitivo**, no «16–17 % que no vuelve». El ICA merece una precisión: la
*retención* es solo el mecanismo de recaudo (efecto de caja), pero el ICA en sí **es definitivo**
—grava el ingreso bruto, no la utilidad— y por eso viaja en la línea de arriba.

**Consecuencia dura:** un contratista que oferte con U del 5 % sin haber cargado los 8–12 pp de
tributos definitivos **está ofertando en pérdida desde antes de firmar**.

### 5. Costos financieros

| Concepto | Valor | Estado |
|---|---|---|
| Capital de trabajo necesario | 25–40 % del valor del contrato sin anticipo; 10–20 % con anticipo del 30 % | [CONOCIDO] |
| **Tasa de usura vigente** | **29,66 % E.A.** (agosto 2026, Res. 1139 de 2026 de la Superintendencia Financiera; IBC consumo y ordinario 19,77 % E.A.). Modalidades productivas: **urbano 59,67 %**, **rural 33,56 %** | **[VERIFICADO]** — se recertifica **cada mes**: el modelo debe leerla, no fijarla |
| Crédito bancario comercial (tasa de colocación) | del orden de 16–26 % E.A. según perfil y garantía | [INCIERTO] para 2026 — verificar la serie de tasas de colocación del Banco de la República |
| Factoring de actas estatales | descuento 1,2–2,5 % **mensual** (≈ 15–34 % E.A.) | [CONOCIDO] |
| Costo de oportunidad del capital propio | 12–20 % E.A. mínimo | Criterio, no dato |
| Comisión fiduciaria del patrimonio autónomo del anticipo | 0,5–1,5 % del anticipo | [CONOCIDO] |

#### 5.1 Anticipo y pago anticipado: no son lo mismo

El parágrafo del art. 40 de la Ley 80 de 1993 cubre con **un mismo tope del 50 % del valor del
contrato** «el pago anticipado y la entrega de anticipos». Ahí termina el parecido.

| | **Anticipo** | **Pago anticipado** |
|---|---|---|
| Naturaleza | Recursos **públicos**: siguen siendo de la entidad hasta que se amortizan | **Pago definitivo**: entra al patrimonio del contratista |
| Amortización | Se amortiza proporcionalmente en cada acta | **No se amortiza**; se imputa al precio |
| Garantía | Buen manejo y correcta inversión, **100 % del anticipo** | Devolución del pago anticipado, 100 % del monto [CONOCIDO — confirmar numeral] |
| Patrimonio autónomo / fiducia | **Obligatorio** en contratos de obra, concesión, salud y los adjudicados por licitación pública, **SALVO los de menor y mínima cuantía** — art. 91 Ley 1474 de 2011 [VERIFICADO] | **No exigido** |
| Retención en la fuente | No se practica al entregarlo (no hay ingreso causado) | Se practica al momento del pago [CONOCIDO] |
| Tope | 50 % conjunto — par. art. 40 Ley 80/1993 [VERIFICADO] | ídem, el tope es conjunto |

**Para Detecta son dos variables distintas.** La excepción de menor y mínima cuantía del art. 91
es exactamente el rango donde operan Helder y Génesis: en esos contratos el anticipo llega sin
fiducia, lo que ahorra la comisión fiduciaria pero traslada íntegro el riesgo de manejo al
contratista. Y el pago anticipado **no consume estructura fiduciaria ni genera amortización**,
aunque sí consume cupo de póliza.

#### 5.2 El patio de la obra pública

Se ejecuta, se mide, se firma acta, se radica factura, la entidad revisa, la interventoría
aprueba, tesorería programa el PAC y se paga —en el mejor caso— a 45–90 días. Mientras tanto la
nómina y los proveedores no esperan: **el contratista es el banco de la entidad**. El **DSO (días
de cobro)** pesa tanto como el margen: un 8 % de U cobrado a 120 días rinde menos que un 5 %
cobrado a 30. [CONOCIDO]

> **Nota para el modelo de Detecta.** `CLAUDE.md` documenta que el dataset `p6dx-8zbt` **no trae
> columna de anticipo** y que `anticipo_pct = 0` significa **«sin dato»**, no «sin anticipo».
> Cualquier fórmula de rentabilidad que multiplique por `anticipo_pct` estará asumiendo el peor
> caso en la inmensa mayoría de los procesos. Hay que **decirlo en la tarjeta**, no esconderlo en
> el número. `lib/capacidad.js:calcCRPC` ya usa `anticipoPct` para descontar la carga del proceso:
> la misma ambigüedad ya está aguas arriba.

### 6. Reajuste de precios y riesgo de escalación

Es el apartado que más importa en 2026 y el que más se omite.

#### 6.1 Dos regímenes contractuales, dos dueños del riesgo

| Régimen | Quién absorbe el alza | Qué hay que hacer al ofertar |
|---|---|---|
| Contrato **con fórmula de ajuste** (polinómica, indexada a índices DANE) | La entidad, dentro de la fórmula | Leer la fórmula: qué índices, qué ponderadores y **con qué mes base**. Un ponderador de mano de obra bajo deja el riesgo del salario en el contratista |
| Contrato **a precio firme sin reajuste** | **El contratista, íntegro** | El alza se financia con la U. Con plazos > 9 meses hay que cargar una provisión explícita, no confiar en la I |

*[CONOCIDO] la tipología; la fórmula concreta se lee del pliego de cada proceso.*

#### 6.2 Índices aplicables

| Índice DANE | Para qué |
|---|---|
| **ICOCIV** — Índice de Costos de la Construcción de Obras Civiles | Obra civil: vial, redes, estructuras |
| **ICOCED** — Índice de Costos de la Construcción de Edificaciones | Edificación |
| **ICCV** — Índice de Costos de la Construcción de Vivienda | Vivienda; aún referenciado en contratos antiguos |

**Un índice mide VARIACIÓN, no nivel de precio.** No sirve para cotizar un ítem: sirve para
actualizar uno ya cotizado. Usar la variación del ICOCIV como si fuera un precio es un error de
categoría.

#### 6.3 Alerta 2026

- Variación anual del **ICOCIV: 4,98 %** [VERIFICADO, DANE].
- Entre **diciembre de 2025 y febrero de 2026**, variación acumulada de costos del **3,67 %**, con
  el componente **MANO DE OBRA subiendo 12,80 % en dos meses** [VERIFICADO, DANE].
- La causa es el salto del SMMLV 2026 (**+23 %**, Decreto 1469 de 2025) [VERIFICADO].

**Consecuencia operativa: todo APU armado con jornales de 2025 está desfasado y hay que
re-cargarlo antes de ofertar.** Con participaciones de mano de obra del 12–38 % del CD (§10.1), un
desfase del 12,8 % en el jornal vale 1,5–4,9 pp del CD — más que la U declarada completa. El
material se movió mucho menos: el problema de 2026 es la nómina.

### 7. Baja, presupuesto oficial y método de ponderación

Todo lo anterior razona sobre «el valor del contrato». En obra pública **el contrato no se firma
por el presupuesto oficial: se firma por lo que uno ofertó, que está por debajo.**

#### 7.1 La baja sale íntegra de la utilidad

Sea `PO` el presupuesto oficial, `b` la baja ofrecida y `u₀` la utilidad sobre `PO` con baja cero.
El valor ofertado es `PO × (1 − b)` y los costos no cambian, así que:

```
Utilidad absoluta = (u₀ − b) × PO
U_neta sobre el valor ofertado = (u₀ − b) / (1 − b)
```

| U declarada (u₀) | Baja 0 % | Baja 3 % | Baja 5 % | Baja 10 % |
|---|---|---|---|---|
| 5 % | 5,0 % | 2,1 % | **0,0 %** | −5,6 % |
| 8 % | 8,0 % | 5,2 % | 3,2 % | −2,2 % |
| 12 % | 12,0 % | 9,3 % | 7,4 % | 2,2 % |

**Una baja del 5 % sobre una U declarada del 5 % la deja exactamente en cero**, antes de
desperdicio, DSO y tributos.

#### 7.2 El modelo de la Parte 2 debe tomar el presupuesto oficial como entrada

El corpus ya lo trae: `precio_base` está en la proyección activa (`lib/proyeccion.js`) y las
columnas de valor adjudicado están en `CAMPOS_VALOR_ADJUDICADO` del corpus histórico. Con eso se
puede **medir la baja real por entidad y por tipología**:

```sql
-- sobre el keyspace licitaciones:historico:mes:*
baja = 1 − (valor_adjudicado / precio_base)
```

Y modelar tres escenarios explícitos: **baja 0 %, 5 % y 10 %**, mostrando la U neta de cada uno en
la tarjeta. Un ranking de «probabilidad de ganar» que no muestre a qué precio hay que ganar está
recomendando presentarse a pérdida.

#### 7.3 Bajar más NO aumenta monótonamente la probabilidad de ganar

En los documentos tipo de infraestructura de transporte —de uso obligatorio desde la Ley 2022 de
2020— el puntaje del factor precio se asigna por un **método SORTEADO en la audiencia de
adjudicación** entre varias alternativas: media aritmética, media aritmética alta, media
geométrica con presupuesto oficial, y menor valor. [CONOCIDO — se confirma en el pliego tipo de
cada proceso]

Implicación directa: **si el método sorteado es una media, la oferta más barata puede quedar tan
lejos del promedio que pierda puntos**. El modelo de Detecta **no debe asumir «gana el más
barato»**; debe tratar el método como una variable desconocida al momento de ofertar y
recomendar una baja que sobreviva a los cuatro métodos, no que optimice uno.

### 8. Imprevisto ≠ riesgo previsible ≠ fuerza mayor

Tres figuras distintas que se confunden todo el tiempo, con tres tratamientos distintos:

| Figura | Qué cubre | Dónde se maneja | Cómo se paga |
|---|---|---|---|
| **I del AIU** (imprevistos) | El **álea normal** de la obra: variaciones menores de rendimiento, pequeños ajustes de cantidades, contingencias no tipificables | Dentro del precio de la oferta | **No es un fondo reembolsable ni se legaliza con facturas.** Si no se usa, es utilidad; si se agota, es pérdida |
| **Riesgo previsible** | Lluvia en régimen bimodal, redes existentes documentadas, oscilación de precios de insumos, dificultad de acceso conocida | **Matriz de riesgos del pliego** — art. 4 Ley 1150/2007 [VERIFICADO] y art. 2.2.1.1.1.6.3 D.1082/2015 [VERIFICADO] | Se tipifica, estima y **asigna** en el pliego. Se objeta **ANTES de ofertar**, en la audiencia de asignación de riesgos |
| **Fuerza mayor** | Hecho **imprevisible e irresistible** | Fuera del precio y fuera de la matriz | Suspensión del contrato y, eventualmente, restablecimiento del equilibrio económico |

**Regla operativa: no se carga a la I un riesgo que el propio pliego declara previsible.** Si la
matriz de riesgos asigna al contratista la lluvia en una región de régimen bimodal, eso no es un
imprevisto: es un costo que hay que cotizar en el CD o discutir en la audiencia. Dejar pasar la
audiencia y luego reclamar es la ruta perdedora.

### 9. Costos ocultos y subestimados

| Costo | Magnitud típica | Nota |
|---|---|---|
| Seguridad y vigilancia en obra | 0,3–1,5 % | Sube en obra lineal y nocturna |
| Multas y cláusula penal por retraso | 0,1–1 % **diario** de lo incumplido; penal 10–20 % del contrato | El riesgo es catastrófico, no marginal |
| Gestión social y comunitaria | 0,5–2 % | Socialización, PQRS, actas de vecindad |
| **Mano de obra local obligatoria** | sobrecosto 5–20 % de la MO | Los acuerdos con la comunidad imponen contratar no calificada del sitio: menor rendimiento, más rotación, más reprocesos |
| Permisos y compensaciones ambientales | 0,2–3 % | Aprovechamiento forestal, ocupación de cauce, permisos de vertimiento |
| Manejo de aguas y sobrecostos por lluvia | 1–5 % | **Riesgo previsible, no imprevisto** (§8): el régimen bimodal colombiano es conocido; ignorarlo es decisión, no mala suerte |
| Hallazgos arqueológicos | 0 o catastrófico | Suspende el frente; el plan de manejo arqueológico es obligatorio en excavación |
| Interferencia de redes **no identificadas** | 0,5–4 % | Causa nº 1 de sobrecosto en redes urbanas. Si el pliego documenta las redes, deja de ser imprevisto |
| Robo de materiales y combustible | 0,5–3 % | Suele contabilizarse mal como «desperdicio» |

*[CONOCIDO] en todo el cuadro; porcentajes sobre el valor del contrato.*

#### 9.1 Extorsión / «vacunas» en zonas de control armado

Sin ambigüedad: **es un costo real, ilegal, no facturable y no deducible**. Se cobra por
porcentaje del contrato o por cuota mensual y en algunas regiones condiciona materialmente la
ejecución. La conclusión correcta **no es presupuestarlo**: pagarlo es un delito, destruye la
deducibilidad y la trazabilidad contable, y no elimina el riesgo —lo renueva. **Hay zonas donde la
respuesta correcta es no presentarse**, y esa decisión se toma antes de armar el APU.

Implicación para Detecta: justifica un **filtro geográfico de exclusión por municipio** alimentado
por el criterio del dueño (el dataset no trae el dato). Es un `no_ir` duro, no un descuento en la
utilidad, y jamás un «margen ajustado por riesgo».

### 10. Tablas resumen

#### 10.1 Reparto interno del CD por tipología (suma 100 % del CD)

| Componente | Vial / pavimentos | Edificación | Redes (acueducto/alcantarillado) |
|---|---|---|---|
| Materiales | 43 % (35–52) | 55 % (45–62) | 45 % (38–55) |
| Mano de obra | 12 % (8–18) | 30 % (22–38) | 22 % (15–30) |
| Equipo | 30 % (22–38) | 10 % (5–16) | 22 % (15–30) |
| Transporte de materiales | 15 % (6–25) | 5 % (2–8) | 11 % (5–18) |
| **Suma del caso central** | **100 %** | **100 %** | **100 %** |

*Caso central y rangos: [CONOCIDO]. Los extremos no son simultáneos — renormalizar a 100.
Todos los porcentajes de este cuadro son **% del costo directo**, no del valor del contrato.*

#### 10.2 Estructura sobre el valor total del contrato (suma 100 %)

El CD aparece como **residuo**, que es como funciona de verdad: lo que queda después de pagar
administración, tributos definitivos, imprevistos y utilidad.

| Cuantía / plazo | A operativa | Tributos definitivos | I | U declarada | **CD residual** | AIU+T equivalente **sobre el CD** |
|---|---|---|---|---|---|---|
| 500 SMMLV / 4 m | 15–22 % | 8–12 % | 3 % | 4 % | **59–70 %** | 43–69 % |
| 1.000 SMMLV / 6 m | 16–22 % | 8–12 % | 3 % | 4 % | **59–69 %** | 45–69 % |
| 3.000 SMMLV / 12 m | 15–20 % | 8–12 % | 3 % | 5 % | **60–69 %** | 45–67 % |
| 10.000 SMMLV / 18 m | 11–15 % | 8–12 % | 3 % | 5 % | **65–73 %** | 37–54 % |
| ≥ 30.000 SMMLV / 24 m | 8–11 % | 8–12 % | 3 % | 5 % | **69–76 %** | 32–45 % |

Cómo se lee: `CD = 100 − (A + Tributos + I + U)`, y la última columna es
`(A + T + I + U) / CD`, que es **la base sobre la que se cotiza el AIU en la oferta**. Un contrato
pequeño no soporta un AIU del 25 % sobre CD: necesita 45–69 %. El clásico «CD 80 % / AIU 20 %»
solo aparece en cuantías grandes.

#### 10.3 Utilidad real vs. declarada

Partiendo de una **U declarada del 5 %** sobre el valor del contrato:

| Concepto | Efecto (pp del valor del contrato) |
|---|---|
| U declarada | +5,0 |
| Tributos definitivos **no cargados** en la oferta | **−8 a −12** |
| Sobredesperdicio real frente al presupuestado | −1 a −3 |
| Costo financiero por DSO largo | −1 a −3 |
| Costo de garantías | −0,5 a −1,5 |
| Imprevistos genuinamente aleatorios consumidos | −1 a −3 |
| Baja sobre el presupuesto oficial | −(baja ofrecida) |
| **U real si los tributos NO se cargaron** | **−6 a −18 pp: pérdida cierta** |
| **U real si los tributos SÍ se cargaron en la A** | **0 a 3 %**, y negativa si el plazo se alarga o la baja supera 3 pp |

**Ésta es exactamente la razón por la que la Parte 2 debe modelar margen neto y no AIU**, y por la
que el modelo tiene que exigir el presupuesto oficial y una baja escenario como entradas.

#### 10.4 Nota fiscal: IVA en contratos de construcción

En los contratos de construcción de bien inmueble el IVA **no se causa sobre el valor total**: la
base gravable son los **honorarios** obtenidos por el constructor o, a falta de pacto, la
**utilidad** del constructor — art. **1.3.1.7.9 del DUR 1625 de 2016** (compilación del art. 3.º
del Decreto 1372 de 1992) [VERIFICADO].

**No aplica** aquí la base gravable especial sobre AIU del **art. 462-1 del ET**, que está
reservada a vigilancia, aseo, temporales de empleo y cooperativas de trabajo asociado. Confundir
las dos reglas y aplicar el 19 % sobre el valor total hace la oferta no competitiva por un factor
enorme.

#### Vacíos y siguiente paso

| Vacío | Por qué importa | Cómo se resuelve |
|---|---|---|
| Numeral de la garantía de **devolución del pago anticipado**; suficiencias de estabilidad y RCE | Determinan el consumo de cupo de afianzamiento | Título 2.2.1.2.3 del D.1082/2015 artículo por artículo + Manual de Garantías de CCE |
| **UVT 2026** | Bases mínimas de retención en la fuente | Resolución DIAN de UVT (noviembre de 2025) |
| **ICA de la actividad de construcción** por municipio y estampillas por departamento | Varían 3–6 pp entre territorios: **cambian el ranking de atractividad por ubicación** | Tabla propia por municipio; empezar por los ~20 donde más publica el corpus |
| Cortes de cuantía de la **estampilla Pro Universidad Nacional** | Hasta 2 pp con entidades del orden nacional | Texto de la Ley 1697 de 2013 |
| **Tarifa ARL efectivamente asignada** a cada perfil | Entre 4,35 % y 8,70 %: hasta 4,35 pp de FP | Preguntar a la ARL; entretanto usar 6,96 % y mostrar el rango |
| **Precios unitarios de materiales 2026** | No hay APU sin ellos, y 2026 movió la nómina 12,8 % | Portales comerciales bloqueados por el proxy. Vía alternativa: resoluciones de precios unitarios de INVÍAS, IDU y gobernaciones, o carga manual del dueño |
| **Baja histórica real** por entidad y tipología | Decide si el contrato deja utilidad | Calculable ya: `1 − valor_adjudicado/precio_base` sobre `licitaciones:historico:mes:*` |
| **Método de ponderación del precio** de cada proceso | Decide si conviene bajar o quedarse cerca de la media | Se lee del pliego; no está en el dataset. Modelar como incógnita |
| **Fórmula de ajuste** y sus ponderadores | Decide quién paga la escalación 2026 | Pliego de cada proceso |
| **Cupo real de afianzamiento** de Helder y Génesis | Puede ser la restricción binding, por encima de la K | Preguntar al dueño: aseguradora, cupo aprobado, cupo comprometido, contragarantías |
| `anticipo_pct` es «sin dato» en casi todo el corpus | La rentabilidad no puede depender de él | Modelar 0 % y 30 %, mostrar ambos, y distinguir anticipo de pago anticipado |
| **Zonas de exclusión por seguridad** | Decisión de no presentarse, no un descuento | Lista de municipios del dueño, filtro duro |
| **Tasa de usura**, que cambia cada mes | Techo del costo financiero del capital de trabajo | Resolución mensual de la Superfinanciera; hoy rige la Res. 1139 de 2026 |
</content>
</invoke>


---

## 2.B.1 — Riesgo geografico, de seguridad y de acceso: mapa de Colombia

> **Nota de verificación de esta sección.** El presupuesto de búsqueda web de la sesión estaba
> agotado (200/200) cuando se escribió esta sección, y los `WebFetch` directos intentados
> —`mintransporte.gov.co` (SICE-TAC), `invias.gov.co` (mapa de carreteras),
> `funcionpublica.gov.co/eva/gestornormativo`, `data.humdata.org`, `indepaz.org.co` y un host del
> DNP— devolvieron **403 Forbidden** o fallo de DNS. En consecuencia **ninguna fuente de esta
> sección lleva etiqueta [VERIFICADO]**. Todo lo que sigue es [CONOCIDO] o [INCIERTO], con la ruta
> exacta de verificación indicada. Preferí decir esto antes que fabricar URLs que se ven plausibles:
> una URL inventada en una tabla de fuentes es peor que un hueco, porque nadie la vuelve a comprobar.
> Lo mismo aplica a las normas citadas: números de ley y artículo que se dan como [CONOCIDO] deben
> contrastarse contra el texto oficial antes de usarlos en un documento contractual.

El riesgo territorial es el rubro que más margen destruye en obra pública colombiana y el que menos
aparece bien puesto en el presupuesto. No entra como un imprevisto genérico del 5 %: entra como
**sobrecosto directo de transporte y estadía**, **días no laborables por lluvia y por orden
público**, **plazo adicional que consume administración fija**, y en el extremo, **imposibilidad de
ejecutar**. Esta sección propone medirlo por municipio, decir **dónde** de la estructura de costos
entra cada parte, y traducirlo a dos números que sí caben en la decisión de presentarse o no.

### 0. Antes del modelo: qué dice la matriz de riesgos del pliego

Ningún modelo propio sustituye al instrumento jurídico por el cual el riesgo se asigna en Colombia.
Antes de calcular nada hay que leer la matriz de riesgos del proceso concreto.

| Instrumento | Qué obliga | Etiqueta |
|---|---|---|
| **Ley 1150 de 2007, art. 4** | Los pliegos deben incluir la **estimación, tipificación y asignación de los riesgos previsibles** involucrados en la contratación | [CONOCIDO] — verificar texto en el gestor normativo de Función Pública |
| **CONPES 3714 de 2011** | Lineamientos de política sobre riesgo previsible en la contratación estatal; es la referencia doctrinaria de la matriz modelo | [CONOCIDO] |
| **Decreto 1082 de 2015, art. 2.2.1.2.1.1.2** | En licitación pública hay **audiencia de asignación de riesgos**, dentro de los tres días siguientes al inicio del plazo de la oferta, donde el proponente puede pedir revisión de la asignación | [CONOCIDO] — confirmar numeral exacto del artículo |
| Manuales y matriz de riesgos de **Colombia Compra Eficiente** | Formato de la matriz (tipificación, probabilidad, impacto, asignación, tratamiento, monitoreo) | [CONOCIDO] |

**Instrucción operativa, antes de cotizar:**

1. Abrir la matriz de riesgos del pliego y localizar las filas de **orden público / actos de
   terrorismo**, **bloqueos y vías de hecho**, **condiciones climáticas atípicas**, **acceso y estado
   de vías**, **disponibilidad de fuentes de materiales** y **consulta previa**. Anotar, fila por
   fila, **a quién se asigna** (entidad, contratista, compartido) y **con qué tratamiento**.
2. **El `R_geo` solo se cotiza en la porción asignada al contratista.** Poner precio a un riesgo que
   el pliego ya asignó a la entidad es regalar competitividad; ejecutar sin haber visto que el pliego
   trasladó el riesgo de orden público al contratista es asumir una pérdida sin saberlo.
3. La parte asignada a la **entidad** no desaparece: se documenta desde el día uno (bitácora,
   registro fotográfico, actas) porque es la base de la reclamación por mayor permanencia o por
   restablecimiento del equilibrio económico.
4. **La audiencia de asignación de riesgos es la única ventana** para pedir reasignación. Después de
   presentada la oferta, la matriz es la que es. Si el pliego traslada al contratista el 100 % del
   riesgo de orden público en un municipio de banda naranja o superior y la observación en audiencia
   no prospera, eso por sí solo dispara la regla de veto de la §6.

### 1. Fuentes públicas de riesgo por municipio

| Fuente | Entidad | Ruta / cómo llegar | Formato esperado | Granularidad | Vigencia | Actualización | Etiqueta |
|---|---|---|---|---|---|---|---|
| Índice de Incidencia del Conflicto Armado (IICA) | DNP — Dirección de Justicia, Seguridad y Gobierno | Portal de datos abiertos del DNP y `datos.gov.co`; buscar «IICA municipal» | XLSX / CSV, con categoría ordinal (muy alto…muy bajo) | Municipio (DIVIPOLA) | Serie base 2002–2013; **el DNP publicó IICA 2017–2019 y una actualización metodológica en 2021 con dos variables nuevas** | Irregular, no anual | [CONOCIDO] — la existencia del corte 2017–2019 y de la actualización 2021 no se pudo verificar en esta sesión |
| Municipios PDET (170) — Decreto Ley 893 de 2017 | Presidencia / ART (Agencia de Renovación del Territorio) | `renovacionterritorio.gov.co`; la lista está en el anexo del decreto | Lista fija (PDF en el decreto; CSV en portales) | Municipio, 16 subregiones | Vigente, **lista cerrada desde 2017** | No cambia | [CONOCIDO] |
| Zonas Futuro / ZEII (Zonas Estratégicas de Intervención Integral) | **Consejo de Seguridad Nacional / Presidencia** | Decretos de delimitación por zona | PDF; hay que transcribir a lista | Municipio (5 zonas iniciales) | **Ley 1941 de 2018 art. 2**, reglamentada por **Decreto 2278 de 2019** y ajustada por **Decreto 762 de 2021**. La **Ley 2272 de 2022 (art. 19 y su parágrafo transitorio)** derogó las disposiciones contrarias de la Ley 1941 de 2018 y ordenó reorientar los recursos comprometidos en las ZEII **hasta su correspondiente cierre y liquidación** | Cerrada | [CONOCIDO] — números de norma no verificados en esta sesión. **Tratar `zona_futuro` como variable HISTÓRICA**: marca que allí hubo intervención militar reforzada, no un estado vigente |
| Alertas Tempranas (SAT) | Defensoría del Pueblo | `defensoria.gov.co` → SAT; alertas individuales en PDF | PDF por alerta; **no consta un consolidado municipal estructurado** | Municipio (a veces vereda) | Continua | Semanas | [CONOCIDO] |
| Datos humanitarios Colombia (desplazamiento masivo, confinamiento, eventos) | OCHA Colombia vía HDX | `data.humdata.org`, grupo `col` | **CSV/XLSX descargable, con código DIVIPOLA** | Municipio | Continua | Mensual/trimestral | [CONOCIDO] — es la más accesible técnicamente |
| Presencia de grupos armados | INDEPAZ | `indepaz.org.co` — informes periódicos | PDF + mapas; a veces XLSX | Municipio | Anual/semestral | Sí | [CONOCIDO] |
| Análisis de conflictividad | Fundación Paz y Reconciliación (PARES), CERAC | Sitios propios | PDF, sin API | Municipio/subregión | Continua | Sí | [CONOCIDO] |
| Índices municipales de victimización | UARIV — Unidad para las Víctimas | RNI (Red Nacional de Información) | Tableros + descargas | Municipio | Continua | Mensual | [CONOCIDO] |
| Estadística delictiva (extorsión, homicidio, hurto) | Policía Nacional / MinDefensa | `policia.gov.co` → estadística delictiva | **XLSX mensual por municipio** | Municipio | Continua | Mensual | [CONOCIDO] |
| **Contaminación por minas antipersonal (MAP/MUSE)** | **Programa de Acción Integral contra Minas Antipersonal (AICMA / Descontamina Colombia)** | Portal de AICMA; se publican municipios por estado de intervención (contaminado, en intervención, libre de sospecha) | Tablero + descargas; consolidado municipal | Municipio | Continua | Trimestral aprox. | [CONOCIDO] — **decisivo en obra lineal** (vía, línea de conducción, redes): condiciona despeje previo, seguros y ritmo |
| **Fuentes de materiales con título minero** | **ANM — Agencia Nacional de Minería** (catastro minero) + autoridad ambiental regional (CAR/ANLA) para la licencia o permiso | Catastro minero de la ANM; licencias/permisos ambientales de la CAR con jurisdicción | Capa geográfica / consulta por polígono | Punto/polígono → distancia al municipio | Continua | Continua | [CONOCIDO] — la existencia de cantera o fuente de río **legal** a distancia razonable es, junto al flete, el mayor determinante geográfico del costo directo |
| **SICE-TAC — costo eficiente por ruta origen–destino** | **Ministerio de Transporte** | Portal de MinTransporte → SICE-TAC (herramienta en línea) | Consulta por ruta; entrega costo por viaje/tonelada desagregado (combustible, peajes, salarios, llantas) | Ruta origen–destino | Actualizado periódicamente; se le atribuye actualización 2026 y del orden de ~1.245 rutas | Periódica | [CONOCIDO] — **da PESOS de flete, no minutos**; no verificado en esta sesión (403 al fetch) |
| **Matriz de distancias y red vial nacional** | **INVIAS** | Mapa de Carreteras (incluye matriz de distancias entre ciudades principales) y portal de datos abiertos de INVIAS (red vial nacional georreferenciada) | PDF del mapa; SHP/GeoJSON de la red | Tramo vial / par de ciudades | Vigente | Anual aprox. | [CONOCIDO] |
| Amenaza por inundación y movimiento en masa | IDEAM | `ideam.gov.co` / geoportal | SHP / GeoJSON / WMS | Ráster o polígono | Variable | Irregular | [CONOCIDO] |
| Amenaza sísmica y remoción en masa | SGC — Servicio Geológico Colombiano | `sgc.gov.co` / SIMMA | SHP / servicios OGC | Polígono | NSR-10 vigente | Baja | [CONOCIDO] |
| Resguardos indígenas y consejos comunitarios | ANT — Agencia Nacional de Tierras / IGAC | Geoportales de ANT e IGAC | SHP / servicios OGC | Polígono | Vigente | Irregular | [CONOCIDO] |
| DIVIPOLA (códigos municipales) y geometrías | DANE / IGAC | DANE → DIVIPOLA; IGAC → geoportal / Datos Abiertos | CSV (DIVIPOLA), SHP/GPKG (geometrías) | Municipio y área no municipalizada | Vigente | Anual | [CONOCIDO] |
| Eventos de conflicto georreferenciados | ACLED | `acleddata.com` — **registro obligatorio; el nivel abierto NO incluye API**: el acceso a API y a evento desagregado se licencia según el dominio del correo y el uso. **Uso comercial: verificar licencia** | Tableros y agregados en el nivel abierto; CSV/API en niveles licenciados | Punto geo → agregable a municipio | Continua | Semanal | [INCIERTO] — verificar el nivel de acceso concreto y las condiciones de redistribución antes de depender de esta fuente |

**Recomendación de arquitectura de datos.** No consumir ninguna de estas fuentes en caliente. Todas
son lentas, ninguna tiene SLA y varias son PDF. Se construye **un solo archivo estático versionado
en el repo**, `data/riesgo_municipal.json`, con una fila por unidad DIVIPOLA.

**Antes de congelar cualquier fuente en ese JSON hay que revisar su licencia de redistribución.** Un
repositorio versionado es una redistribución, aunque sea privado. En el caso de ACLED, guardar
**el conteo agregado por municipio derivado, nunca el evento**, y reproducir la atribución exigida;
para las demás fuentes, dejar registrada la licencia en un campo `fuente_licencia` por variable. Una
fuente sin licencia clara se usa para decidir a mano, no se empaqueta.

> Ejemplo estructural: **TODOS los valores numéricos siguientes son inventados para ilustrar el
> esquema; ninguno es una medición de Medellín ni de ningún municipio.**

```
{ divipola: "05001", municipio: "MEDELLÍN", departamento: "ANTIOQUIA",
  pdet: false, zona_futuro_historica: false, iica: 0.31, iica_vigencia: "2019",
  extorsion_tasa_100k: 12.4, extorsion_vigencia: "2025",
  desplazamiento_eventos_24m: 0, alertas_sat_activas: 0,
  map_muse_estado: "libre_de_sospecha", map_muse_vigencia: "2025",
  acceso_km_capital: 0, acceso_via: "primaria", acceso_sin_conexion_terrestre: false,
  horas_viaje_centro_abastecimiento: 0.0,
  km_fuente_material_legal: 12, fuente_material_vigencia: "2026",
  flete_sicetac_cop_ton: null, flete_vigencia: null,
  clima_regimen: "bimodal", clima_dias_lluvia_mes: [ ...12 valores ... ],
  etnico_proxy_resguardo: false,
  fuente_licencia: { extorsion: "datos abiertos", acled_derivado: "verificar" },
  R_seg: 0.18, R_acc: 0.05, R_cli: 0.34, R_soc: 0.10, R_geo: 0.17 }
```

Cada campo lleva su `*_vigencia`. Un campo sin dato es `null`, **nunca 0** — ésa es exactamente la
lección ya pagada en este proyecto con `anticipo_pct` y con «0 oferentes = sin dato»: un cero en un
índice de riesgo se lee como «municipio seguro» y es la falsedad más cara posible aquí.

**El obstáculo real de integración, y no es menor.** El corpus de Detecta **no guarda código
DIVIPOLA**. `lib/proyeccion.js` proyecta `departamento_entidad` y `ciudad_entidad` como texto libre,
y `api/resumen.js` ya normaliza a mayúsculas para agrupar por municipio. Hay tres consecuencias:

1. **El join es por nombre**, con toda la ambigüedad de siempre (homónimos —hay varios «San Pedro»,
   varios «La Unión»—, tildes, «BOGOTÁ D.C.» vs «BOGOTA»). Debe hacerse con `norm` de
   `lib/semantica.js` **más el departamento como desempate**, y aun así quedará un residuo que hay
   que contar explícitamente (`riesgo:meta.municipios_sin_match`), no absorber en silencio.
2. **`ciudad_entidad` es la sede de la ENTIDAD, no el lugar de ejecución de la obra.** Una
   gobernación en Villavicencio contrata una vía en Mapiripán. Este sesgo es sistemático y va a favor
   del optimismo: subestima el riesgo justo en los contratos departamentales, que son los grandes.
   Mitigación: extraer topónimos del objeto del proceso (`descripci_n_del_procedimiento`) cuando
   mencionen municipio/vereda/corregimiento y **usar el máximo de los dos riesgos**, marcando el
   registro como `ubicacion_inferida`.
3. **El universo no son «~1.122 municipios».** Colombia tiene **1.103 municipios más 18 áreas no
   municipalizadas** (1.122 unidades DIVIPOLA de segundo nivel) [CONOCIDO]. Las áreas no
   municipalizadas están en **Amazonas, Guainía y Vaupés** — es decir, exactamente las que esta
   sección marca como `sin_conexion_terrestre` — y **no aparecen como «municipio» en ningún join**:
   hay que tratarlas aparte y no dejarlas caer al residuo sin match.

### 2. Riesgo de acceso

Variables a construir, en orden de peso:

| Variable | Definición | Fuente | Etiqueta |
|---|---|---|---|
| `sin_conexion_terrestre` | Municipio o área no municipalizada a la que no se llega por carretera desde la red nacional | Amazonas (salvo Leticia por aire), casi todo Chocó ribereño, Guainía, Vaupés, buena parte de Vichada, San Andrés | [CONOCIDO] |
| `km_fuente_material_legal` | Distancia a la cantera o fuente de río **con título minero vigente y permiso ambiental** más cercana | Catastro minero ANM + autoridad ambiental regional | [CONOCIDO] — sin fuente legal cercana, el material se vuelve flete y el APU se desfonda |
| `horas_viaje` | Tiempo estimado al centro de abastecimiento, no distancia | SICE-TAC/INVIAS donde haya ruta; OSRM en el resto, **penalizado** | [CONOCIDO] |
| `flete_cop_ton` | Costo de transporte por tonelada en la ruta real | **SICE-TAC** | [CONOCIDO] |
| `km_centro_abastecimiento` | Distancia al centro real de materiales (Bogotá, Medellín, Cali, B/quilla, B/manga) — no a la capital departamental | INVIAS / OSRM | [CONOCIDO] |
| `tipo_via` | Primaria INVIAS / secundaria departamental / terciaria | **Portal de datos abiertos de INVIAS: red vial nacional georreferenciada** | [CONOCIDO] |

**Método concreto y realista.** Hay dos fuentes oficiales antes de recurrir a OpenStreetMap:
**SICE-TAC** (MinTransporte, costo eficiente por ruta origen–destino, con actualización que se le
atribuye a 2026) e **INVIAS** (matriz de distancias del Mapa de Carreteras y red vial nacional en su
portal de datos abiertos). **SICE-TAC es preferible a OSRM para el flete porque entrega pesos, no
minutos**: el paso de tiempo a costo es justamente donde OSRM no ayuda, y es el paso que determina
el APU. **OSRM se reserva para los municipios que SICE-TAC no cubre.**

Para ese resto, la ruta practicable es: descargar el extracto OSM de Colombia (Geofabrik), levantar
OSRM localmente **una vez**, calcular la matriz de las 1.122 unidades DIVIPOLA contra los 5 centros
de abastecimiento y contra su capital departamental, y **congelar el resultado en el JSON estático**.
Un cálculo offline, un archivo, cero dependencias en runtime — coherente con que la app no tiene
`package.json`. La calibración crítica es el factor de castigo de vía terciaria: OSM la etiqueta como
`unclassified`/`track` y OSRM le asigna velocidades irreales; un multiplicador de **1,8–2,5×** sobre
el tiempo OSRM en tramos terciarios es el orden de magnitud razonable — **[calibrable] — supuesto del
consultor, no medido**; se contrasta contra tiempos reales que el dueño conozca de obras propias.

Traducción a costo: el acceso pega en flete de material (el más grande), en estadía y rotación de
personal, en disponibilidad de equipo (una retroexcavadora a 9 horas de vía terciaria no se cambia el
mismo día) y en el costo financiero de tener material inmovilizado en sitio porque no se puede
reabastecer semanalmente. La ausencia de fuente de material legal cercana multiplica todo lo anterior
y, además, es la vía más común de incumplimiento ambiental por comprar a fuente sin título.

### 3. Riesgo climático

Colombia tiene varios regímenes de lluvia y confundirlos arruina el cronograma:

| Régimen | Regiones | Temporadas de lluvia | Ventana seca útil |
|---|---|---|---|
| **Bimodal** | Andina (Cundinamarca, Boyacá, Antioquia, Eje Cafetero, Santanderes, Valle interior, Nariño andino) | **marzo–mayo** y **septiembre–noviembre** | **diciembre–febrero** y **junio–agosto** |
| **Unimodal (jun–ago máximo)** | Orinoquía (Meta, Casanare, Arauca, Vichada) | abril–noviembre, pico jun–ago | **diciembre–marzo** (corta) |
| **Amazonía** | Amazonas, Putumayo, Caquetá, Guainía, Vaupés | Lluvia alta todo el año | **Sin ventana seca marcada**; menor lluvia relativa jul–sep [INCIERTO] — verificar en la serie IDEAM del municipio |
| **Casi permanente** | Pacífico (Chocó, Buenaventura, Tumaco) | Todo el año | **No hay ventana seca** |
| **Caribe seco** | La Guajira, norte de Magdalena/Atlántico, Cesar norte | **abril–junio** y **agosto–noviembre**; **veranillo de San Juan** a finales de junio–julio | **diciembre–marzo** |

[CONOCIDO] — los regímenes bimodal andino, unimodal de Orinoquía y el veranillo de San Juan son
climatología estándar colombiana; los meses exactos por municipio deben salir de las series del
IDEAM, no de esta tabla. **Ningún cronograma se firma con esta tabla: se firma con la serie de días
de lluvia de la estación IDEAM más cercana, y la tabla solo sirve para saber si el número que sale es
plausible.**

**Lo que entra en la fórmula son días no laborables esperados por mes.** Se estiman como
`dias_no_laborables[mes] = dias_lluvia[mes] × f_actividad`, donde `f_actividad` es la fracción del
día de lluvia que efectivamente se pierde según el tipo de obra: movimiento de tierra y pavimento
`f ≈ 0,8–1,0`; estructura en concreto `f ≈ 0,5`; obra bajo cubierta o redes en zanja corta
`f ≈ 0,2–0,3`.

> **[calibrable] — supuestos del consultor; el único dato real es la bitácora de obras propias.**
> Ninguno de estos tres valores está medido ni tomado de una fuente publicada.

Un mismo municipio penaliza distinto a una vía terciaria que a la ampliación de un colegio, y el
modelo debe reflejarlo.

**ENSO.** El IDEAM publica boletines de predicción climática mensuales con el estado del ENSO
[CONOCIDO]. La regla operativa propuesta: bajo **La Niña** los días de lluvia esperados de la región
andina y Pacífica se multiplican por ~1,2–1,4; bajo **El Niño** por ~0,7–0,85, pero se activa riesgo
distinto (escasez de agua para concreto y compactación, incendios, restricciones de captación).

> **[calibrable] — orden de magnitud propuesto por el consultor; no medido.** Se verifica cruzando el
> boletín mensual del IDEAM con la serie de días de lluvia de la estación más cercana en un año Niña
> y uno Niño. La etiqueta [CONOCIDO] cubre únicamente el hecho de que el IDEAM publique esos
> boletines, no estos multiplicadores.

El estado ENSO es un **escalar global mensual**: cabe en una sola clave de configuración y se
actualiza a mano.

### 4. Riesgo social

- **Bloqueos y paros.** Mineros, indígenas (Cauca, Nariño, Norte de Antioquia), campesinos y de
  transportadores. **La calificación de un bloqueo como fuerza mayor se decide caso a caso por
  imprevisibilidad e irresistibilidad, y en zonas donde los bloqueos son recurrentes el argumento de
  imprevisibilidad se debilita: no cuentes con que te lo reconozcan** [INCIERTO — verificar con
  abogado de contratación la línea vigente del Consejo de Estado]. Lo que sí es maniobrable:
  **suscribir acta de suspensión con la interventoría el mismo día del bloqueo**, dejar registro en
  bitácora del personal y equipo inmovilizado, y **documentar desde el día uno los costos de mayor
  permanencia en obra**, que es la vía de reclamación real. **Sin acta de suspensión, el plazo sigue
  corriendo y la multa también.** Proxy medible del riesgo: histórico de eventos de protesta por
  municipio (ACLED clasifica `Protests` y `Riots` georreferenciados [CONOCIDO], con la reserva de
  licencia y acceso anotada en la §1).
- **Consulta previa.** Cuando hay comunidades étnicas en el área de influencia, la **Dirección de la
  Autoridad Nacional de Consulta Previa del Ministerio del Interior** expide certificación de
  presencia/no presencia [CONOCIDO]. **La certificación se expide a solicitud, por proyecto y sobre
  un área de influencia georreferenciada: NO existe un padrón municipal descargable que se pueda
  cruzar contra DIVIPOLA.** Para poblar el campo se usa como **proxy** la capa abierta de resguardos
  indígenas y consejos comunitarios de comunidades negras (**Agencia Nacional de Tierras / IGAC**),
  intersecada con el municipio, y el campo se nombra **`etnico_proxy_resguardo`** para no dar a
  entender una certificación que no se tiene. La certificación real se pide antes de ofertar si el
  proxy da positivo. Base normativa: **Convenio 169 de la OIT (Ley 21 de 1991)**, **Decreto 1066 de
  2015** (decreto único del sector Interior) y **Sentencia SU-123 de 2018** de la Corte
  Constitucional [CONOCIDO] — no verificadas en esta sesión. Impacto real: si aplica, el proceso de
  consulta puede tardar **meses**, y en un contrato de obra con plazo fijo eso es la diferencia entre
  margen y multa. **Regla dura: si el objeto es obra en territorio con presencia étnica y el pliego
  NO dice quién asume la consulta previa y su plazo, el riesgo es del contratista por defecto y debe
  tratarse como bandera roja de pliego**, no como un porcentaje.
- **Mano de obra local.** Muchos pliegos —y casi todos los PDET— exigen porcentaje mínimo de mano de
  obra no calificada del municipio. Efecto: menor productividad inicial, más capacitación, más
  rotación, y en zonas con presencia armada, **presión sobre la contratación de personal**. Sobrecosto
  típico modelable como reducción de rendimiento del 10–20 % en las actividades intensivas en mano de
  obra durante el primer tercio del plazo. **[calibrable] — supuesto del consultor, no medido.**

### 5. Índice compuesto R_geo

Cuatro subíndices, todos normalizados a `[0,1]`, todos con `null` explícito cuando no hay dato.

| Subíndice | Componentes | Normalización propuesta |
|---|---|---|
| `R_seg` | Tasa de extorsión (peso 0,40 dentro del subíndice), IICA (0,25), alertas SAT activas 24 m (0,15), eventos de desplazamiento/confinamiento 24 m (0,10), PDET / `zona_futuro_historica` / `map_muse_estado` como binarias (0,10 combinado) | Cada continua por **percentil nacional** (rango-percentil, robusto a la cola larga); las binarias valen 0 ó 1 |
| `R_acc` | `horas_viaje` al centro de abastecimiento (0,35), `km_fuente_material_legal` (0,25), tipo de vía de acceso final (0,40 → ver nota) | Percentil nacional para continuas; escala ordinal 0 / 0,5 / 1 para vía primaria / secundaria / terciaria |
| `R_cli` | Días no laborables esperados en la ventana de ejecución prevista, ajustados por ENSO y por `f_actividad` | Ver fórmula de fracción abajo |
| `R_soc` | Eventos de protesta/bloqueo 24 m (0,50), `etnico_proxy_resguardo` (0,30), exigencia de mano de obra local (0,20) | Percentil para eventos; binarias 0/1 |

Dos precisiones que hacen la diferencia entre un índice implementable y uno que hay que adivinar:

- **`R_acc` — pesos y condición dominante.** Los componentes ponderados son `horas_viaje` (0,35),
  `km_fuente_material_legal` (0,25) y `tipo_via` (0,40). **`sin_conexion_terrestre` NO es un
  componente ponderado: es una condición dominante que fija `R_acc = 1,0`** y activa el veto de la
  §6. Un municipio sin carretera no es «un poco más caro»: es otra clase de proyecto.
- **`R_cli` — fracción, no conteo.**
  `R_cli = min(1, (dias_no_laborables_ventana / dias_habiles_ventana) / 0,35)`.
  Es decir: perder el **35 %** de los días hábiles satura el subíndice. Normalizar contra un conteo
  fijo (p. ej. `/60`) premiaría los plazos cortos y castigaría los largos: 45 días perdidos en una
  obra de 3 meses es catastrófico y en una de 24 meses es benigno, y un conteo los trata igual. El
  **0,35 es [calibrable]**.

**Agregación.** Media ponderada con **un correctivo no lineal**, porque los riesgos territoriales no
son intercambiables — un municipio impecable en todo salvo seguridad no es un municipio de riesgo
medio:

```
R_base = 0,40·R_seg + 0,25·R_acc + 0,20·R_cli + 0,15·R_soc
R_geo  = max( R_base , 0,85 · max(R_seg, R_acc) )
```

> **Los pesos (0,40 / 0,25 / 0,20 / 0,15, y todos los pesos internos de la tabla anterior) y el
> coeficiente 0,85 son una postura, no una medición.** Antes de usarlos para decidir dinero, correr
> un **análisis de sensibilidad**: si mover un peso ±0,10 cambia la banda de más del 10 % de los
> municipios, el modelo no está listo.

El segundo término es el que impide que un promedio amable esconda un subíndice extremo. Si un
subíndice es `null`, **se reponderan los presentes y se marca `R_geo_incompleto: true`** (nunca se
imputa 0). Si falta `R_seg`, `R_geo` no se publica como cifra clasificada — mismo criterio que ya usa
`competenciaDe` con el mínimo de 5 procesos.

#### Dónde entra el R_geo: AIU y doble conteo

Antes de leer la tabla de bandas hay que decir **dónde** va el sobrecosto, porque un porcentaje sin
destino se cuenta dos veces o no se puede cotizar. El `R_geo` se descompone en **tres destinos
distintos y excluyentes**:

| Destino | Qué contiene | Cómo se calcula | Dónde va |
|---|---|---|---|
| **1. Costo directo identificable** | Flete adicional y sobreacarreo, estadía y transporte de personal, campamento, mayor distancia a fuente de material, despeje MAP/MUSE cuando aplique | Cantidad × precio real de la ruta (**SICE-TAC** para el flete) dentro del **análisis de transporte de cada ítem** | **Dentro del APU del ítem.** Si ya está aquí, **NO se vuelve a contar** como % de riesgo |
| **2. Administración** | Mayor plazo × administración fija mensual, esquema de seguridad y comunicaciones, sobreprima de pólizas por mayor plazo, desplazamientos de dirección | `plazo_adicional_meses × costo_administración_mensual` — **una cifra en pesos, no un %** | **La «A» del AIU** |
| **3. Residual y aleatorio** | Lo que no se puede identificar ni programar: día perdido por bloqueo puntual, lluvia atípica, reproceso | Estimación alzada, no reembolsable contra facturas: ésa es la doctrina del rubro | **La «I» del AIU** |

Tres consecuencias operativas:

- **Doble conteo.** Si el sobrecosto de flete y estadía ya está dentro de cada APU (transporte de
  material, acarreos), sumarle encima un porcentaje de riesgo geográfico infla la oferta y la saca
  del rango sin mejorar la protección.
- **AIU fijado por el pliego.** En obra pública es habitual que el pliego fije el AIU (o su tope). Si
  lo fija, **el contratista no puede meter el riesgo en la A ni en la I aunque quiera**: solo le
  queda el destino 1, dentro del costo directo, o no presentarse. Ese es un caso frecuente de veto
  económico.
- **La «I» no es una bolsa.** Los imprevistos son una estimación alzada; no se reembolsan contra
  facturas ni se «legalizan» con soportes. Usarla como colchón de un riesgo identificable es
  esconder el problema.

**Traducción a sobrecosto y plazo.** Los números siguientes expresan el **efecto AGREGADO sobre el
costo total del proyecto**, para decidir **si presentarse** — **no** son un recargo que se sume línea
a línea al APU. Todos son **[calibrables] — propuestos por el consultor, no medidos**. Los cortes se
definen con desigualdades explícitas para que ningún municipio quede entre dos bandas (mismo criterio
que los tertiles del índice de competencia, que usan `<=`):

| Banda | Corte | Efecto agregado sobre costo total | Sobre plazo | Lectura |
|---|---|---|---|---|
| Verde | `R_geo <= 0,20` | +0 % a +3 % | +0 % a +5 % | Urbano consolidado, acceso primario |
| Amarillo | `0,20 < R_geo <= 0,40` | +3 % a +8 % | +5 % a +15 % | Municipio intermedio, vía secundaria |
| Naranja | `0,40 < R_geo <= 0,60` | +8 % a +15 % | +15 % a +30 % | PDET típico, terciaria, lluvia alta |
| Rojo | `0,60 < R_geo <= 0,80` | +15 % a +28 % | +30 % a +60 % | Zona de conflicto activo o sin vía |
| Negro | `R_geo > 0,80` | **no se cotiza** | **no se cotiza** | Ver regla de veto |

**Cómo calibrar de verdad, con los datos que Detecta ya tiene.** El corpus histórico
(`licitaciones:historico:mes:*`, que nada purga) permite un estudio observacional propio, sin comprar
nada. El orden de los indicadores importa, porque el más obvio es el menos informativo:

1. Para cada proceso adjudicado, calcular el `R_geo` del municipio y clasificarlo en banda.
2. **Indicador principal: número de oferentes por proceso.** Es un dato que ya está en el corpus
   histórico y que mide directamente lo que interesa: cuánta gente está dispuesta a ir allí. Se
   compara el promedio de oferentes por banda de `R_geo`, controlando por modalidad y cuantía.
3. **Indicador principal: procesos declarados desiertos o sin oferentes, por banda de `R_geo`.** La
   **desierción es la señal limpia** de «nadie quiso ir ahí»: no depende de ningún método de
   evaluación ni de la lotería de la adjudicación. Una banda con tasa de desierción creciente es la
   confirmación empírica del modelo — y, de paso, la oportunidad: un proceso desierto que se vuelve
   a publicar es competencia baja.
4. **La razón `valor_adjudicado / precio_base` NO es una medida de riesgo mientras el método de
   ponderación se sortee.** En licitación de obra pública con pliegos tipo de Colombia Compra
   Eficiente, el método de ponderación del componente económico **se sortea en la audiencia de
   adjudicación** entre varias alternativas (media aritmética, media aritmética alta, media
   geométrica con ofertas, menor valor) [CONOCIDO], y existe además el **rechazo por precio
   artificialmente bajo** (Decreto 1082 de 2015, art. 2.2.1.1.2.2.4) [CONOCIDO]. Con un método de
   media, la razón adjudicado/base tiende al promedio del pool **sin importar dónde quede la obra**:
   es prácticamente independiente del riesgo por construcción. Regresarla contra `R_geo` mediría la
   lotería y la presentaría como «sobrecosto que el mercado reconoce». Antes de regresar nada hay que
   **(a)** verificar si el pliego usaba pliego tipo y **qué método salió sorteado**, y **(b)**
   controlar por método y por número de oferentes. Sin esos dos controles, la cifra no se interpreta.
5. Complementar con la señal más limpia de plazo si algún día se ingiere: **adiciones y prórrogas**
   por contrato (SECOP II las publica en datasets de contratos, no en `p6dx-8zbt`). El porcentaje
   medio de prórroga por banda de `R_geo` es la calibración directa de la columna de plazo.
6. Señal indirecta ya disponible hoy: el **índice de competencia por entidad** que la app calcula.
   Menos oferentes en municipios de `R_geo` alto es exactamente la hipótesis; si se confirma, es
   validación cruzada del índice **y** una oportunidad — el modelo de atractividad debería premiar el
   riesgo alto *manejable* y castigar el riesgo alto *inmanejable*, que no son lo mismo.

Consulta de ejemplo sobre el corpus histórico ya proyectado con adjudicación. Nótese que
`metodo_ponderacion` entra al `GROUP BY` (sin él la última columna no significa nada) y que la
columna de desierción va primero en la lectura:

```sql
SELECT municipio_norm, banda_R_geo, metodo_ponderacion,
       COUNT(*) AS n,
       SUM(CASE WHEN es_desierto THEN 1 ELSE 0 END) AS desiertos,
       AVG(oferentes) AS oferentes_medios,
       AVG(valor_adjudicado / NULLIF(precio_base,0)) AS razon_media_no_interpretable_sin_metodo
FROM historico
WHERE precio_base > 0
GROUP BY municipio_norm, banda_R_geo, metodo_ponderacion
HAVING n >= 5;
```

El `HAVING n >= 5` no es adorno: es la misma invariante que ya protege el índice de competencia y por
la que existe la banda ⚪. Y `oferentes` sigue la misma regla que en el índice: **`null` es «sin
dato», no cero** — un cero aquí hundiría el promedio de la banda entera.

### 6. La regla de veto

Un modelo de sobrecosto asume implícitamente que **todo riesgo tiene precio**. En obra pública
colombiana eso es falso en el extremo, por cuatro razones distintas:

1. **El riesgo de extorsión no es un costo, es un delito.** Presupuestar «vacuna» no es ingeniería de
   costos: es planear un ilícito. No hay línea de APU que lo cubra legalmente.
2. **El riesgo de vida no se transfiere.** **Existen pólizas de secuestro y extorsión (K&R) en el
   mercado colombiano, pero cubren rescate y gastos, no la vida ni el plazo perdido, y su prima en
   zona roja se come el margen. La cobertura existe; la protección real, no.** [CONOCIDO]
3. **La cola es infinita, no gruesa.** En riesgo negro el resultado no es «+30 %»: es abandono de
   obra, incumplimiento, siniestro de la póliza de cumplimiento y **caducidad**. **Declarada la
   caducidad del contrato, la inhabilidad para contratar con el Estado es de cinco (5) años — Ley 80
   de 1993, art. 8, numeral 1, literal c** [CONOCIDO, verificar texto vigente]. Para un contratista
   pequeño eso es el fin del negocio, no una mala obra.
4. **Pagar extorsión no solo no es un costo cotizable: puede configurar delito.** Financiación del
   terrorismo y administración de recursos relacionados con actividades terroristas — **art. 345 del
   Código Penal, modificado por la Ley 1121 de 2006** [CONOCIDO, verificar redacción vigente]. El
   riesgo no es solo perder la obra: es responsabilidad penal de quien firma.

Por eso la propuesta es **veto, no prima**:

| Condición | Acción | Justificación |
|---|---|---|
| `R_geo > 0,80` | **Descartar.** No se muestra como oportunidad. | El sobrecosto no acota la pérdida |
| `R_seg > 0,85` con cualquier `R_geo` | **Descartar**, aunque el resto sea impecable | El máximo no lineal ya lo empuja, esto lo cierra |
| **La matriz de riesgos del pliego asigna al contratista el 100 % del riesgo de orden público** y el municipio está en banda **naranja o superior** (`R_geo > 0,40`) | **Descartar** | El pliego trasladó un riesgo que no tiene cobertura de mercado ni precio acotable; la audiencia de asignación es la única salida y si no prospera, no hay oferta sana |
| El pliego **fija el AIU** y el destino 2/3 del `R_geo` no cabe dentro de él en banda naranja o superior | **Descartar o replantear** | El riesgo existe pero no hay dónde cotizarlo |
| Alerta Temprana SAT **activa** en el municipio con riesgo de reclutamiento o control territorial | **Descartar** | Es la fuente que mira hacia adelante, no hacia atrás |
| `map_muse_estado` = contaminado y el objeto es **obra lineal** sin despeje previo contratado por la entidad | **Descartar** | El despeje humanitario no lo ejecuta ni lo programa el contratista de obra |
| `sin_conexion_terrestre` **y** perfil sin experiencia fluvial/aérea previa | **Descartar** | La logística fluvial es un negocio distinto; no se improvisa |
| `0,60 < R_geo <= 0,80` | **Mostrar en rojo con veredicto explícito**, nunca en los destacados | Decisión del dueño, con la advertencia delante |

Esto es coherente con lo que Detecta ya hace en dos lugares: los destacados del panel aplican
**cuatro filtros más** que el listado porque un falso positivo en el puesto 1 cuesta más que uno en
la página 4, y la capa de pertinencia **nunca bloquea por falta de información**. El veto geográfico
es la excepción justificada a ese segundo principio, y hay que decir por qué: en pertinencia, el
falso negativo cuesta una oportunidad perdida; aquí, el falso positivo puede costar la empresa. La
asimetría se invierte, y con ella la regla.

Implementación coherente con la arquitectura vigente: el veto pertenece a la **capa de consulta**
(`lib/filtros.filtrarProcesosVisibles`), **no a la ingesta**. Guardar ancho y juzgar fino es la
decisión estructural ya pagada en este proyecto; meter el riesgo geográfico en
`admisibleParaIngesta` obligaría a una full cada vez que se recalibrara un peso, que es exactamente
el bug del que se salió en julio de 2026. Y el descarte debe **contarse** —`descartados.veto_geografico`
en `/api/diagnostico`— porque un filtro que descarta en silencio es un filtro que nadie audita.

### 7. Mapa grueso: departamentos y subregiones donde hay que mirar dos veces

Mientras el `R_geo` no esté construido y calibrado, el contratista necesita una lista, no una receta.
Esta tabla es **conocimiento general de contexto colombiano, NO verificado en esta sesión** (sin
acceso a INDEPAZ, Defensoría ni DNP): sirve para decidir dónde poner el escrutinio manual, no para
sustituir la lectura del pliego ni la consulta de la fuente. Un mapa grueso y etiquetado sirve;
ningún mapa no sirve.

| Subregión / territorio | Departamentos | Por qué mirar dos veces | Riesgo dominante | Etiqueta |
|---|---|---|---|---|
| **Catatumbo** | Norte de Santander | Disputa armada persistente, economía de coca, paros y bloqueos recurrentes | Seguridad, social | [CONOCIDO] |
| **Bajo Cauca y Nordeste antioqueño** | Antioquia | Minería ilegal, extorsión sistemática a contratistas y transportadores | Seguridad (extorsión) | [CONOCIDO] |
| **Sur de Córdoba** | Córdoba | Continuidad territorial con el Bajo Cauca; misma dinámica | Seguridad | [CONOCIDO] |
| **Sur de Bolívar** | Bolívar | Minería, presencia armada, vías terciarias en mal estado | Seguridad, acceso | [CONOCIDO] |
| **Chocó ribereño y Pacífico chocoano** | Chocó | Sin conexión terrestre en buena parte, lluvia sin ventana seca, confinamientos | Acceso + clima + seguridad (los tres a la vez) | [CONOCIDO] |
| **Costa Pacífica de Nariño (Tumaco y alrededores)** | Nariño | Economías ilegales, MAP/MUSE, acceso fluvial | Seguridad, acceso, MAP/MUSE | [CONOCIDO] |
| **Cauca — norte y macizo** | Cauca | Bloqueos y movilización social recurrente, disputa armada | Social + seguridad | [CONOCIDO] |
| **Arauca** | Arauca | Frontera, disputa armada, extorsión a obra e hidrocarburos | Seguridad | [CONOCIDO] |
| **Putumayo y bajo Caquetá** | Putumayo, Caquetá | Vía terciaria, lluvia sin ventana seca, presencia armada | Acceso + clima + seguridad | [CONOCIDO] |
| **Guaviare, Guainía, Vaupés, Amazonas** | Ídem | Áreas no municipalizadas, sin conexión terrestre, logística fluvial/aérea | Acceso (dominante, dispara `R_acc = 1,0`) | [CONOCIDO] |
| **Alta Guajira** | La Guajira | Distancias, agua para obra, permisos y consulta previa wayúu casi segura | Consulta previa + agua + acceso | [CONOCIDO] |
| **Magdalena Medio** | Santander, Cesar, Bolívar, Antioquia | Presencia armada intermitente, inundación del Magdalena | Seguridad + clima | [INCIERTO] — la intensidad varía por municipio; verificar alerta SAT vigente |

Uso previsto: cualquier proceso cuyo lugar de ejecución caiga en una de estas filas **no se decide
por el listado**; se decide leyendo la matriz de riesgos del pliego (§0) y consultando la alerta
temprana vigente del municipio.

#### Vacíos y siguiente paso

| Vacío | Impacto | Cómo se resuelve |
|---|---|---|
| **Ninguna URL de esta sección está verificada** (presupuesto web agotado; 403 en MinTransporte, INVIAS, Función Pública, HDX, INDEPAZ, DNP) | Alto: las tablas de fuentes no son accionables tal cual | Repetir la sección con presupuesto de búsqueda disponible, o abrir a mano las siete fuentes prioritarias: SICE-TAC, INVIAS datos abiertos, HDX Colombia, Policía Nacional (estadística delictiva), ART (PDET), DANE DIVIPOLA, AICMA |
| **Ninguna norma citada está verificada contra texto oficial** | Alto: se citan Ley 1150/2007 art. 4, CONPES 3714/2011, D. 1082/2015 arts. 2.2.1.2.1.1.2 y 2.2.1.1.2.2.4, Ley 80/1993 art. 8, art. 345 CP (L. 1121/2006), Ley 2272/2022 art. 19, Ley 21/1991, D. 1066/2015, SU-123/2018 | Contrastar en el gestor normativo de Función Pública y en la relatoría de la Corte Constitucional antes de citarlas en cualquier documento contractual |
| **Vigencia real del IICA** | Determina el peso del subíndice de seguridad | La serie base es 2002–2013; el DNP publicó **IICA 2017–2019** y una **actualización metodológica en 2021 con dos variables nuevas** — usar esa, no la de 2013, y **solo bajar el peso si se confirma que no hay corte posterior a 2019** |
| **Estado real de las ZEII / Zonas Futuro** | Podrían no existir ya con esa figura | La Ley 2272 de 2022 ordenó su cierre y liquidación; hasta confirmarlo, `zona_futuro_historica` se usa como marcador histórico, nunca como estado vigente |
| **Licencia de redistribución de ACLED y de las demás fuentes** | Bloquea la arquitectura de JSON versionado si no se resuelve | Leer el EULA de ACLED y el nivel de acceso concreto que da el correo del proyecto; guardar solo agregados derivados y registrar `fuente_licencia` por variable |
| **El corpus no tiene DIVIPOLA** | El join municipal es por nombre y va a fallar en un porcentaje desconocido | Construir tabla `norm(ciudad)+norm(departamento) → divipola` (1.103 municipios + 18 áreas no municipalizadas) y **medir la tasa de no-match antes de confiar en nada** |
| **`ciudad_entidad` ≠ lugar de ejecución** | Sesgo sistemático hacia el optimismo en contratos departamentales | Extraer topónimos del objeto y usar el máximo de ambos riesgos; medir en qué fracción de procesos difieren |
| **Método de ponderación sorteado no está en `p6dx-8zbt`** | Sin él, la razón adjudicado/base no se puede interpretar | Verificar si el dataset de contratos o los documentos del proceso lo publican; si no, la calibración se apoya solo en oferentes y desierción |
| **Todos los coeficientes (pesos, 0,85, 0,35, ENSO, `f_actividad`, bandas)** | La traducción a dinero es una hipótesis de trabajo | Análisis de sensibilidad + calibración de la §5 sobre el histórico; bitácoras de obras propias para `f_actividad`; hasta entonces, rangos, jamás un número puntual |
| **Datos de adiciones y prórrogas** | Es la mejor señal de sobrecosto de plazo y **no está en `p6dx-8zbt`** | Identificar el dataset de contratos SECOP II (distinto del de procesos) y evaluar su ingesta como corpus terciario |
| **Cobertura real de SICE-TAC** | Determina cuántos municipios necesitan OSRM | Consultar el número de rutas y su cobertura departamental; documentar qué fracción de las 1.122 unidades DIVIPOLA queda fuera |


---

## 2.B.2 — Riesgo financiero, contractual, operativo y de mercado

### 0. Nota de verificación de fuentes (leer antes que nada)

En esta corrida **no se pudo verificar ninguna fuente externa**. El presupuesto de `WebSearch` de la
sesión estaba agotado (200/200) y el proxy de salida respondió `403` a **todo** host probado
(`datos.gov.co`, `dane.gov.co`, `dnp.gov.co`, `funcionpublica.gov.co`, `es.wikipedia.org`,
`duckduckgo.com`, `google.com`). Lo único verificado de primera mano es el código del repositorio,
que sí se leyó y se ejecutó.

| Etiqueta | Significado en este documento |
|---|---|
| `[REPO]` | Confirmado leyendo **y ejecutando** el código del proyecto en esta sesión. Material duro. |
| `[CONOCIDO]` | Norma o hecho institucional que existe y es sólido, pero **no se confirmó ahora**. Cada uno lleva cómo verificarlo. |
| `[INCIERTO]` | Creo que existe; el nombre exacto del campo, la cifra o la vigencia hay que comprobarlos. |
| `[SUPUESTO]` | **Juicio del consultor. No hay fuente externa.** Se calibra contra los propios contratos ejecutados del dueño; hasta entonces es un *placeholder* con el que se puede trabajar, no un dato. |

La diferencia entre `[CONOCIDO]` y `[SUPUESTO]` es la que importa: lo primero se verifica abriendo
una norma; lo segundo **no se puede verificar en ninguna parte** porque no existe fuera de este
documento. Ninguna cifra `[SUPUESTO]` debe presentarse a un tercero como dato de mercado.

**Ninguna cifra de este documento entra a la fórmula de precio sin pasar antes por la verificación
indicada en su fila.** Los únicos números que se pueden usar hoy tal cual son los de capacidad —y
aun esos descansan sobre dos supuestos que se declaran en §3.4.

---

### 1. Riesgo de la entidad contratante (`RE`)

**Hoy la app solo puede calcular `P_captura` (0.30 del peso).** `P_pago` exige una tabla fiscal
externa que aún no existe en el repo; `P_adiciones` exige la segunda ingesta (dataset de
contratos); `P_sancion` es manual. El score compuesto es:

```
RE = 0.40·P_pago + 0.20·P_adiciones + 0.10·P_sancion + 0.30·P_captura
```

**Regla de renormalización (obligatoria, no opcional):**

```
RE = Σ(w_i · P_i sobre los subíndices DISPONIBLES) / Σ(w_i disponibles)
```

Con solo `P_captura` disponible, `RE = P_captura`. Sin esta regla el score queda acotado por arriba
en 0.30 y el disparador de §2 («si `RE > 0.6`, presupuestar el escenario alto de DSO») no se
activaría nunca: parecería que ninguna entidad es riesgosa cuando lo que pasa es que no se la está
midiendo. **El umbral de 0.6 se aplica siempre sobre el score renormalizado, y la ficha de entidad
debe mostrar qué subíndices entraron y cuáles faltan** — un `RE` calculado con un solo subíndice y
otro calculado con cuatro no son comparables aunque ambos den 0.55.

#### 1.1 Puntualidad de pago (`P_pago`) — no hay dato directo; el proxy fiscal es la vía real

**El dato directo no existe en el corpus.** `lib/proyeccion.js` `[REPO]` proyecta el dataset de
**procesos** `p6dx-8zbt`: `precio_base`, `duracion`, `estado_del_procedimiento`, adjudicatario y
número de oferentes. **No hay ni una columna de pagos, actas o facturas.** El histórico
(`licitaciones:historico:mes:*`) termina en la adjudicación; lo que pasa después es invisible.

| Fuente candidata | ¿Trae puntualidad de pago? | Accesibilidad | Etiqueta |
|---|---|---|---|
| SECOP II — Procesos (`p6dx-8zbt`) | No. Termina en adjudicación. | Ya ingestado | `[REPO]` |
| SECOP II — Contratos Electrónicos, id `jbjy-vk9h` | Posiblemente sí: campos tipo `valor_pagado`, `valor_pendiente_de_pago`, `valor_facturado`, `valor_amortizado`. **El id del dataset es el correcto; lo que falta verificar son los NOMBRES DE LAS COLUMNAS de pago.** | Requiere segunda ingesta | id `[CONOCIDO]` · columnas `[INCIERTO]` |
| SIIF Nación (MinHacienda) | Ejecución de pagos del **orden nacional** únicamente. No cubre municipios, que es donde está el riesgo. | Sin API abierta conocida | `[CONOCIDO]` |
| FUT (Formulario Único Territorial) vía CHIP — Contaduría General | Ejecución presupuestal territorial: compromisos, obligaciones y **pagos**. La diferencia obligaciones−pagos es literalmente la cuenta por pagar de la entidad. | Portal CHIP, descarga por reporte; no API REST cómoda | `[CONOCIDO]` |
| Contaduría General de la Nación — estados financieros territoriales | Cuentas por pagar y su antigüedad | Manual | `[CONOCIDO]` |

**Verificación exacta del contrato electrónico** — lanzar en producción, donde sí hay salida:
`https://www.datos.gov.co/resource/jbjy-vk9h.json?$select=:id,:updated_at,*&$limit=1`
y leer las claves de la fila. Es el mismo truco de `lib/socrata.js` `[REPO]`: un `$select` explícito
con columna inexistente devuelve 400, así que se piden todas y se proyecta en cliente.

**Proxy fiscal (recomendado, y desarrollado porque es lo único realmente obtenible).** La hipótesis
de industria es que un municipio pequeño, sin ingresos propios y dependiente del SGP, paga tarde.

| Variable | Definición | Fuente | Etiqueta |
|---|---|---|---|
| `cat` | Categoría del municipio, especial…6ª, por población e Ingresos Corrientes de Libre Destinación en SMMLV | Ley 617 de 2000; la categorización se certifica cada año | `[CONOCIDO]` |
| `IDF` | Índice de Desempeño Fiscal del DNP, escala 0–100. **Nueva metodología desde la vigencia 2020; última medición publicada: vigencia 2023.** No es comparable con la serie anterior. | DNP — Portal Terridata | `[CONOCIDO]` |
| `grupo_IDF` | La nueva metodología clasifica a los municipios en **seis grupos de «capacidades iniciales»** | DNP | `[CONOCIDO]` |
| `dep_transf` | Transferencias / ingresos totales. **Es componente del propio IDF.** | DNP Terridata / FUT | `[CONOCIDO]` |

**El puntaje crudo del IDF NO es comparable entre grupos de capacidades iniciales.** Meter todos los
municipios del país en la misma escala —que es lo que hacía `0.5·(1 − IDF/100)`— es inválido: un 62
en el grupo 6 y un 62 en el grupo 1 no dicen lo mismo. Hay que **normalizar dentro del grupo del
municipio**, no contra el país. Y `dep_transf` no puede pesar aparte porque ya está dentro del IDF:
contarlo dos veces infla artificialmente a todo municipio pequeño.

Fórmula corregida (pesos `[SUPUESTO]`, a calibrar):

```
P_pago = 0.6 · (1 − percentil_IDF_dentro_de_su_grupo) + 0.4 · (cat_num / 6)
con cat_num: especial=0, 1ª=1 … 6ª=6
```

**La cuenta trabajada, para no afirmar de más.** Con la fórmula anterior (`0.5·(1−IDF/100) +
0.3·(cat/6) + 0.2·dep_transf`), un municipio de 5ª con IDF 65 y dependencia 0,85 daba **0,595** —
*por debajo* del umbral de 0.6— y uno de 6ª daba **0,645**. Es decir, la afirmación «los de 5ª y 6ª
quedan estructuralmente arriba de 0.6» era falsa para la 5ª por dos milésimas. Con la fórmula
corregida y ese mismo municipio en el percentil 50 de su grupo: 5ª → **0,533**; 6ª → **0,600**.
Conclusión honesta: **el umbral de 0.6 solo separa limpiamente a la 6ª categoría**, y dónde poner
el corte es una decisión a calibrar, no un hecho.

**Enganche con lo que la app ya tiene:** `departamento_entidad` y `ciudad_entidad` están en la
proyección activa `[REPO]`. Basta una tabla estática `data/fiscal_municipios.json`
(`{municipio, depto, categoria, idf, grupo_idf, percentil_en_grupo, vigencia}`) cargada una vez al
año. Es el mismo patrón de `data/vocabulario_unspsc.json`: dato curado y fechado, no derivado.

#### 1.2 Historial de adiciones y prórrogas (`P_adiciones`)

Fórmula, por entidad `e`, sobre contratos terminados en los últimos 24 meses:

```
sobrecosto_e = mediana_i( (valor_final_i − valor_inicial_i) / valor_inicial_i )
sobreplazo_e = mediana_i( (plazo_final_i  − plazo_inicial_i) / plazo_inicial_i )
P_adiciones  = min(1, 0.5·sobrecosto_e/0.50 + 0.5·sobreplazo_e/0.40)
```

Se usa **mediana**, no media: dos contratos con adición fuerte no pueden definir a una entidad con
80 contratos limpios.

**Los dos denominadores son cosas distintas y no se pueden tomar prestados el uno del otro.**
El 0.50 del **sobrecosto** sale del tope legal: el art. 40 par. del Estatuto General de Contratación
limita la adición al 50 % del valor inicial, **y ese tope se mide en SMMLV, no en pesos corrientes**
`[CONOCIDO]`. La consecuencia práctica no es menor: con el alza del SMMLV de 2026, una adición
nominal del 50 % en pesos queda **por debajo** del tope legal, de modo que el denominador en pesos
es conservador. Para el **sobreplazo no existe tope legal equivalente** —la prórroga del plazo no
está limitada por ese parágrafo—, así que el 0.40 es `[SUPUESTO]`: se elige porque un contrato de
obra que se alarga más del 40 % ya cambió de naturaleza, y se calibra con los contratos del dueño.

**Advertencia de disponibilidad, y es dura:** `p6dx-8zbt` no trae valor final ni plazo final; trae
`precio_base`, `duracion` y `unidad_de_duracion` del *proceso* `[REPO]`. El valor ejecutado vive en
el dataset de **contratos**. Sin esa segunda ingesta, `P_adiciones` es incalculable, sale del
denominador de la renormalización y se marca «sin dato» — nunca 0 de mérito. Es exactamente la
lección del `|| 0` ya documentada en `CLAUDE.md`: un `|| 0` sobre un conteo convierte «no sé» en
«cero» y lo hace creíble.

#### 1.3 Procesos sancionatorios y multas (`P_sancion`)

| Fuente | Qué contiene | Utilidad para juzgar a la ENTIDAD | Etiqueta |
|---|---|---|---|
| Boletín de Responsables Fiscales — Contraloría | Personas con fallo fiscal en firme | Baja: juzga funcionarios, no el comportamiento de pago de la entidad. Su uso real es al revés — verificar que **el proponente** no esté ahí, que es requisito habilitante. | `[CONOCIDO]` |
| SIRI — Procuraduría (antecedentes disciplinarios) | Sanciones a servidores públicos | Misma limitación | `[CONOCIDO]` |
| SECOP — actos de multa / incumplimiento publicados | Multas impuestas por la entidad **al contratista** | Señal invertida y valiosa: una entidad multadora agresiva es riesgo para el contratista | `[INCIERTO]` |

**Veredicto: peso bajo (0.10) y diferido.** Ninguna de estas fuentes es consultable por API de forma
estable, y las dos primeras miden a personas naturales. Implementarlo como **campo manual** en la
ficha de entidad, no como derivación automática.

#### 1.4 Desiertos y concentración de adjudicatarios (`P_captura`) — lo único calculable hoy

**Poca competencia NO es un defecto: es la tesis del orden por atractividad.** El producto ordena
por defecto `ordenar_por=atractividad`, que pone primero las entidades donde compite menos gente, y
el «para qué» declarado es ver arriba lo ganable. Un informe que penalizara «pocos oferentes»
estaría diciéndole al contratista que evite exactamente lo que su app le pone en el puesto 1. En
municipios de 5ª y 6ª un único oferente es **mercado delgado**, no captura.

**Lo que descalifica es que el ganador sea siempre el mismo.** Por eso `P_captura` se construye
sobre concentración de adjudicatarios, no sobre número de oferentes:

```
HHI_e = Σ_j ( adjudicaciones_del_proveedor_j / adjudicaciones_totales_e )²   sobre 24 meses
        mínimo 5 adjudicaciones con adjudicatario legible; por debajo → sin_dato

tasa_desierto_e = #(cerrados con estado normalizado ∈ {"declarado desierto","desierto"})
                  / #(cerrados con estado legible)

P_captura = min(1, 0.4·tasa_desierto_e/0.25 + 0.6·max(0, HHI_e − 0.20)/0.30)
```

Bandera roja: `HHI_e > 0.35` **Y** el proveedor dominante no es el proponente. Si el dominante *es*
el proponente, la entidad es un cliente recurrente, que es lo contrario de un riesgo.

**`tasa_desierto` se lee del estado, jamás de la ausencia de adjudicatario.** Definirla como
`#(cerrados sin adjudicatario)/#(cerrados)` es repetir el error del `|| 0`: verificado en
`lib/indice_competencia.js` `[REPO]`, `esAdjudicado()` devuelve `false` para cancelado, suspendido,
revocado y anulado **y también para cualquier proceso cuyas columnas de adjudicación no se lean** —
y `CLAUDE.md` advierte que esas columnas están «PENDIENTE VERIFICACIÓN». En el estado actual de
producción esa fórmula daría `tasa_desierto ≈ 1.00` para **todas** las entidades. Se lee de
`estado_del_procedimiento` / `fase`, normalizando con las mismas listas canónicas de
`lib/filtros.js` `[REPO]`, que ya incluyen `"declarado desierto"` y `"desierto"` en
`ESTADOS_CERRADOS` (y por tanto `repartirDelta` ya los manda al histórico).

**Un `descartados.sin_adjudicacion` alto en `indice:competencia:meta` significa que faltan las
columnas correctas, no que la entidad declare desiertos.** Mirarlo antes de creer cualquier tasa.

**Cerraduras de cobertura — las dos, no una.** Igual que ya rige el índice de competencia `[REPO]`:

- `tasa_desierto = sin_dato` si `#(cerrados con estado legible) / #(cerrados) < 0.8`.
- `HHI = sin_dato` si `#(adjudicados con adjudicatario legible) / #(adjudicados) < 0.5`.
- Mínimo de 5 procesos en ambas, y **no publicar el numerador** por debajo del mínimo (con él se
  reconstruye la tasa que se acaba de anular).

**`tasa_unico` por sí sola no distingue mercado delgado de pliego a la medida y no debe usarse como
señal de descarte.** Se conserva como dato informativo en la ficha, con esa advertencia al lado.

---

### 2. Riesgo de plazo de pago y flujo de caja

Ciclo real, eslabón por eslabón. **Toda esta tabla es `[SUPUESTO]`**: son juicios de industria sin
fuente publicada, no cifras verificables, y se calibran con las actas de los propios contratos
ejecutados del dueño, que es la mejor fuente disponible y la única real.

| Eslabón | Nacional | Departamental | Municipal grande | Municipal pequeño (5ª–6ª) |
|---|---|---|---|---|
| Corte de obra → acta parcial | 5–10 d | 5–15 d | 10–15 d | 15–30 d |
| Aprobación de interventoría | 10–20 d | 15–30 d | 15–30 d | 20–45 d |
| Radicación y revisión de factura | 5–10 d | 10–20 d | 10–20 d | 15–30 d |
| Trámite de pago (PAC / tesorería) | 15–30 d | 20–45 d | 20–40 d | 30–90 d |
| **Rango aritmético (mín-mín / máx-máx)** | 35–70 d | 50–110 d | 55–105 d | 80–195 d |
| **P50 de trabajo (presupuestar con este)** | ≈ 52 d | ≈ 80 d | ≈ 80 d | ≈ 137 d |

**Los totales suman el mínimo de cada eslabón contra el máximo de cada eslabón; el rango real no es
35–195 sino la distribución conjunta.** Que los cuatro eslabones se vayan simultáneamente al máximo
es un escenario de cola, no el caso malo típico. **Usar el P50 (≈ punto medio) para presupuestar y
el P85 solo para el escenario de estrés.** Cuando haya 20 actas propias medidas, se sustituyen estos
puntos medios por los percentiles reales y esta tabla se borra.

`[CONOCIDO]` **Ley 2024 de 2020 («plazos justos»)**: fijó **60 días calendario durante el primer año
de vigencia y 45 días calendario a partir del segundo**. La obligación cubre expresamente los
contratos con **entidades estatales**, contados desde la aceptación de la factura y sujeto a que el
plazo se incluya en el PAC; quedan excluidas las operaciones entre grandes empresas. En la práctica
territorial se incumple con normalidad y su exigencia requiere pleito: **no presupuestar 45 días
porque lo diga la ley.**

Costo financiero del retraso, sobre el capital efectivamente inmovilizado:

```
Costo_fin = Σ_j  saldo_j · [ (1 + i_ea)^(dias_j/365) − 1 ]
```

donde `saldo_j` es cada acta pendiente y `i_ea` la tasa **efectiva anual** de colocación real del
proponente. `[CONOCIDO]` El Interés Bancario Corriente lo certifica la Superintendencia Financiera
**mensualmente** para las modalidades de consumo y ordinario y para microcrédito (es el **consumo de
bajo monto** el que va por certificación trimestral). Usar **la resolución del mes en curso** —el
orden de magnitud reciente ronda el 19 % EA para consumo y ordinario, `[INCIERTO]`, leer la
resolución vigente— o, mejor, la tasa real del cupo de tesorería del dueño, que es la que va a pagar.

**Regla operativa:** si el `RE` **renormalizado** de la entidad supera 0.6, presupuestar el escenario
P85 de DSO, no el P50.

#### 2.bis Deducciones y retenciones sobre cada acta

**Estas deducciones NO son riesgo: son certeza.** Se restan del flujo antes de calcular utilidad, y
la retención en garantía se recupera **al final de la liquidación, no al final de la obra**. Un
documento que habla de 137 días de DSO y no menciona que además le descuentan del orden del 10–15 %
de cada acta está describiendo mal el flujo de caja.

| Deducción | Base y tarifa | Cuándo se descuenta | Etiqueta |
|---|---|---|---|
| **Contribución especial de obra pública** | **5 % del valor total del contrato y de cada adición**. Art. 6 de la Ley 1106 de 2006; su vigencia se ha prorrogado sucesivamente (Ley 1421 de 2010; art. 8 de la Ley 1738 de 2014, que es donde se ubica la vigencia permanente) | Se descuenta de cada acta o se causa al inicio, según el pliego | `[CONOCIDO]` — confirmar la cadena de vigencia en el Gestor Normativo |
| **Estampillas departamentales y municipales** | Pro-desarrollo, pro-cultura, pro-adulto mayor, pro-universidad y afines. **Según la ordenanza / acuerdo de la entidad: VERIFICAR EN EL PLIEGO.** Rango acumulado observado 2 %–8 % | Cada acta | `[SUPUESTO]` en el rango; el porcentaje exacto siempre está escrito en el pliego |
| **Retención en la fuente e ICA** | Retefuente por contratos de construcción / confección de obra material de bien inmueble (tarifa nacional, verificar la vigente); ICA por acuerdo municipal, típicamente en el orden de 6–10 por mil para construcción | Cada acta | `[CONOCIDO]` — verificar tarifa municipal del municipio contratante |
| **Retención en garantía** | 5 %–10 % que la entidad descuenta de **cada** acta y **solo libera en la liquidación** | Cada acta; se devuelve meses después del acta de recibo final | `[CONOCIDO]` — el % lo fija el pliego |

Consecuencia para el modelo: el flujo que financia la obra es `acta − deducciones`, no `acta`. Y la
retención en garantía es un préstamo forzoso a la entidad por el plazo del contrato **más** el plazo
de liquidación (§2.C.4): su costo financiero se calcula con la misma fórmula de `Costo_fin`, con
`dias_j` medido hasta la liquidación.

#### 2.ter Anticipo y pago anticipado — no son sinónimos

**Anticipo.** Máximo **50 %** del valor del contrato (par. art. 40 de la Ley 80 de 1993)
`[CONOCIDO]`. **No es caja libre:**

- En los contratos de obra, concesión, salud y en general en todo lo adjudicado por **licitación
  pública**, los recursos del anticipo se manejan en **patrimonio autónomo irrevocable / fiducia**
  (art. 91 de la Ley 1474 de 2011) `[CONOCIDO]`. Eso implica **comisión fiduciaria** —que es costo
  directo del contratista y se cotiza— y **demora de constitución** antes del primer giro.
- El dinero se gira **contra plan de inversión del anticipo aprobado por la interventoría**, no
  contra necesidad de caja.
- **Se amortiza en cada acta** al mismo % pactado: reduce el flujo de todas las actas siguientes.
  **Reduce la exposición inicial pero no aumenta la utilidad** — quien lo trate como ingreso está
  contando dos veces el mismo dinero.

**Pago anticipado.** Es **pago definitivo**: no se amortiza, no exige fiducia y tiene tratamiento
tributario distinto. **Verificar cuál de los dos pacta el pliego antes de modelar el flujo.**

**Y recordar lo que ya dice `CLAUDE.md` `[REPO]`:** `anticipo_pct = 0` en el corpus significa **sin
dato**, no «sin anticipo» — `p6dx-8zbt` no trae columna de anticipo. Hay que leerlo del pliego.

---

### 2.C Riesgo contractual

Es el bloque que decide quién paga cada uno de los riesgos que enumera el resto del documento. Se
lee **antes** de costear, no después de adjudicar.

#### 2.C.1 La matriz de riesgos previsibles es el documento que manda

`[CONOCIDO]` El art. 4 de la Ley 1150 de 2007 obliga a la entidad a incluir la estimación,
tipificación y **asignación** de los riesgos previsibles; el art. 2.2.1.1.1.6.3 del Decreto 1082 de
2015 desarrolla la evaluación del Riesgo. En licitación pública existe además la **audiencia de
asignación de riesgos**, que es **la única oportunidad real del proponente para objetar el reparto**;
después de presentada la oferta, la asignación se acepta.

**Regla operativa:** antes de costear, leer la matriz y anotar qué riesgos quedan asignados al
contratista. **Los que estén ahí NO se recuperan por restablecimiento del equilibrio: se cotizan.**
Un riesgo asignado y no cotizado es una pérdida ya contratada.

#### 2.C.2 Imprevistos ≠ fuerza mayor (la confusión más cara del gremio)

| Concepto | Qué cubre | Dónde se paga | Norma |
|---|---|---|---|
| **Imprevistos (la «I» del AIU)** | Álea **normal y previsible** de la ejecución: rendimientos algo peores, desperdicios, reprocesos menores, lluvias de temporada | **Se cotiza** dentro del AIU | Práctica contractual `[CONOCIDO]` |
| **Riesgo previsible asignado al contratista en la matriz** | Lo que la matriz le asigne (típicamente: variación de precios sin fórmula de reajuste, disponibilidad de materiales, algunos permisos) | **Se cotiza** como prima explícita | Art. 4 Ley 1150/2007 `[CONOCIDO]` |
| **Fuerza mayor y álea extraordinaria imprevisible** | Lo anormal e irresistible; ruptura del equilibrio económico | **No se cotiza.** Se tramita por restablecimiento de la ecuación contractual | Art. 27 de la Ley 80 de 1993 `[CONOCIDO]` |

Meter la fuerza mayor en el AIU es regalarle precio a la entidad; meter en el art. 27 un riesgo que
la matriz asignó al contratista es un pleito perdido.

#### 2.C.3 Garantías: el costo de la prima es costo directo, se cotiza, no se olvida

`[CONOCIDO]` — suficiencias y vigencias las fija cada pliego dentro de los mínimos del D. 1082/2015;
**los valores de la tabla son los usuales y hay que contrastarlos contra el pliego concreto.**

| Amparo | Suficiencia usual | Vigencia usual |
|---|---|---|
| Seriedad de la oferta | 10 % del valor de la oferta o del presupuesto oficial | Desde presentación hasta aprobación de la garantía de cumplimiento |
| Cumplimiento del contrato | 10 %–20 % del valor del contrato | Plazo + liquidación |
| Buen manejo y correcta inversión del **anticipo** | 100 % del anticipo | Hasta amortización total |
| Pago de salarios, prestaciones e indemnizaciones | 5 % del valor del contrato | Plazo + 3 años |
| Estabilidad y calidad de la obra | 5 %–30 % según el pliego | Desde el recibo final, usualmente 5 años |
| Responsabilidad civil extracontractual | Mínimo en SMMLV según cuantía del contrato | Plazo del contrato |

Dos consecuencias de caja, no solo de costo: la aseguradora **exige cupo y contragarantías**, que
consumen la capacidad de emitir pólizas para el siguiente proceso, y la póliza de estabilidad
mantiene expuesto al contratista **cinco años después de terminar**.

#### 2.C.4 Multas, cláusula penal y liquidación: el riesgo de caja final

- **Multas** por incumplimiento parcial y **cláusula penal pecuniaria** por incumplimiento definitivo:
  se descuentan directamente de las actas pendientes o se cobran contra la póliza `[CONOCIDO]`.
- **Caducidad**: además de terminar el contrato, **inhabilita para contratar con el Estado** — es el
  riesgo existencial del negocio, no un incidente. Un solo contrato mal escogido puede acabar con la
  empresa.
- **Plazo de liquidación**: el saldo final y la retención en garantía **no se cobran al terminar la
  obra, sino al liquidar**, lo que añade meses al DSO del último tramo. Presupuestarlo con la misma
  fórmula de `Costo_fin`. `[CONOCIDO]` — los plazos concretos (liquidación de común acuerdo,
  unilateral y judicial) están en el art. 11 de la Ley 1150 de 2007: **verificar la redacción vigente
  antes de citar meses exactos.**

---

### 3. Riesgo operativo

#### 3.1 Complejidad técnica — escala 1 a 5 por tipología

La escala es `[SUPUESTO]`: es juicio de ingeniería, no una clasificación publicada por nadie.

| Nivel | Tipología | Por qué |
|---|---|---|
| 1 | Mantenimiento vial rutinario, cunetas, andenes, cerramientos | Rendimientos estables, cuadrilla básica |
| 2 | Pavimento flexible, redes de acueducto/alcantarillado en zona urbana | Equipo especializado pero mercado profundo |
| 3 | Edificación institucional, placa huella, obras de urbanismo | Múltiples especialidades, coordinación |
| 4 | Estructuras en concreto de gran luz, PTAP/PTAR, estabilización de taludes | Diseño sensible, riesgo geotécnico |
| 5 | Puentes, túneles, obra hidráulica mayor | Equipo escaso, subcontratación crítica, alta varianza |

Entrada a la fórmula, **como banda y no como punto** (lo que importa en complejidad alta es la
varianza, no el desplazamiento de la media):

| Nivel | `f_complejidad` central | Banda de incertidumbre |
|---|---|---|
| 1 | 1.00 | ±2 % |
| 3 | 1.03 | ±6 % |
| 5 | 1.08 | ±15 % |

`[SUPUESTO]`, a calibrar con los contratos ejecutados del dueño: comparar costo real contra
presupuestado por tipología y reemplazar centro y banda por los observados. La versión puntual
anterior (`1 + 0.02·(nivel−1)`) decía que un túnel cuesta apenas 8 % más de sobrecosto por riesgo
que una cuneta, cifra que nadie sostendría; el valor de la banda del nivel 5 es precisamente que la
cola es larga.

#### 3.2 Mano de obra calificada en la zona

Sin fuente pública fina. Proxy: distancia a la capital departamental + categoría municipal.
`[CONOCIDO]` El DANE publica GEIH con desagregación por ciudades principales, pero no da oficios de
construcción a nivel municipal. Coeficiente de trabajo `[SUPUESTO]`: `f_mo = 1.00` (área
metropolitana) a `1.12` (municipio de 6ª, cuadrilla desplazada con alojamiento y transporte). Se
calibra con los costos de cuadrilla desplazada que el dueño ya pagó, que es la única evidencia real
disponible.

#### 3.3 Plazo comprimido y recargos laborales

Si el plazo contractual exige un rendimiento superior al normal, el sobrecosto entra por horas extra
y turnos.

| Concepto | Valor aplicable | Vigencia | Etiqueta |
|---|---|---|---|
| Inicio de jornada nocturna | **19:00** (antes 21:00) | Desde el 25-dic-2025 (art. 10 de la reforma) | `[CONOCIDO]` |
| Recargo nocturno | 35 % | Sin cambio | `[CONOCIDO]` |
| Hora extra diurna | 25 % | Sin cambio | `[CONOCIDO]` |
| Hora extra nocturna | 75 % | Sin cambio | `[CONOCIDO]` |
| **Dominical y festivo** | **90 %** | **Vigente 1-jul-2026 → 30-jun-2027.** Escalonamiento de la Ley 2466 de 2025: 80 % desde 1-jul-2025, 90 % desde 1-jul-2026, **100 % desde 1-jul-2027** | `[CONOCIDO]` |

**Hoy (agosto de 2026) el valor aplicable es 90 %, no un rango.** Y una regla que hay que meter en
el presupuesto, no en una nota al pie: **si el plazo del contrato cruza el 1-jul-2027, presupuestar
90 % hasta esa fecha y 100 % después** — un contrato de 18 meses que arranque en 2026 cambia de
tarifa a mitad de ejecución.

**Cómo verificarlo** (no se pudo en esta sesión: proxy 403): Gestor Normativo de Función Pública,
`funcionpublica.gov.co/eva/gestornormativo`, texto de la Ley 2466 de 2025 y los artículos que
modifican los arts. 160, 161, 168 y 179 del CST, anotando la fecha de vigencia de cada escalón.

#### 3.4 Estacionalidad (`OP-07`)

La temporada de lluvias detiene movimiento de tierras, compactación y pavimentación. Entrada:
**aditivo de plazo de +5 % a +20 %** según región y meses del contrato que caigan en temporada
húmeda. `[SUPUESTO]` en la magnitud.

**Fuente concreta para calibrarlo:** el IDEAM **no publica un «calendario regional» como tal**; lo
que sí publica son los **promedios climatológicos de precipitación mensual por estación** y los
boletines de predicción climática. El procedimiento es: tomar la estación más cercana al municipio
del proceso, contar los meses del plazo con precipitación por encima del promedio anual y aplicar el
aditivo proporcional a esa fracción. En la mayor parte del país el régimen es **bimodal** (dos
temporadas húmedas: abril-mayo y octubre-noviembre); en la Orinoquía y la Amazonía es **unimodal**,
con una temporada seca larga que es la ventana real de obra. `[CONOCIDO]` — confirmar el régimen de
la zona antes de fijar el aditivo.

#### 3.5 Concentración: el contrato frente al K del proponente

**Cifras calculadas con el motor del repo (`lib/capacidad.js` + `lib/perfiles.js`, ejecutados en esta
sesión) sobre DOS supuestos no verificados.** SMMLV 2026 = $1.750.905 `[REPO]`.

| Perfil | K con presupuesto de $2.000 M | Tope estratégico | Contrato máximo al 65 % del K |
|---|---|---|---|
| Helder | $5.798.971.989 | 4.000 SMMLV = $7.003.620.000 | ≈ **$3.769 M** (consistente: su E se mantiene en 120 hasta $3.950 M) |
| Génesis | $4.516.364.009 | 2.000 SMMLV = $3.501.810.000 | ≈ **$2.936 M** (consistente: su E se mantiene en 120 hasta $18.439 M) |
| Consorcio | $10.315.335.998 | 11.000 SMMLV = $19.259.955.000 | ≈ **$5.926 M** (ver la nota: **no** $6.705 M) |

> **`CO = utilidadOp × 16.7` (margen operacional supuesto ≈ 6 %; el RUP no reporta ingreso
> operacional: `ingresoOp = null` en los dos perfiles `[REPO]`). K es LINEAL en CO: con margen real
> del 3 % la K se DUPLICA; con 12 % se reduce a la mitad. Toda la tabla escala con ese supuesto.**
>
> **Génesis: `profesionales = 3` es un «estimado conservador» declarado en la cabecera de
> `lib/perfiles.js` `[REPO]`. Si la planta real es ≥6, el factor CT pasa de 20 a 30 y su K sube a
> $4.767.273.121 (+$250.909.112).**

**Nota metodológica — la K no es una constante del proponente.** Depende del presupuesto del proceso
vía el factor E (`expSMMLV / presupuestoSMMLV`), así que la columna del 65 % no se puede calcular
con la K de otro presupuesto: hay que resolver el punto fijo `X = 0,65 · K(X)`. Umbrales de quiebre
del factor E: **Helder $3.950 M** (E 120→100) y **$5.926 M** (E 100→80); **Génesis $18.439 M**;
**consorcio: los de Helder**, porque es su integrante limitante.

**Y en el consorcio ese punto fijo no existe** — hay un salto. Por debajo de $5.926 M la K del
consorcio es $9.651.310.598 y el 65 % da $6.273 M (por encima de X); justo por encima de $5.926 M
la K cae a $8.987.285.198 y el 65 % da $5.842 M (por debajo de X). La función salta sobre la
diagonal. El valor operativo es el **supremo de los contratos admisibles: $5.926 M**, donde la
concentración real es **61,4 %**, y **entre $5.926 M y $6.273 M no hay ningún valor admisible al
65 %**. La cifra anterior de ≈$6.705 M sobrestimaba la capacidad del consorcio en **$779 millones**.

**Sobre el tope del consorcio:** los **11.000 SMMLV son un valor por defecto del código**
(`derivarJuntos`, `lib/perfiles.js:130` `[REPO]`), no una decisión del dueño, y superan en **83 %**
la suma de los topes individuales (4.000 + 2.000 = 6.000 SMMLV). **CONFIRMAR con el dueño antes de
usarlo.** En la práctica no ata: el límite del 65 % del K muerde muchísimo antes.

La K de Helder ya está mermada: su SCE descuenta $177.256.611 del contrato de obra en ejecución
(60 % de participación, 8 meses restantes sobre 12) `[REPO]`. La de Génesis está **optimista por
construcción**: su lista `sce` está vacía y `calcSCE` asume 0 con advertencia en logs `[REPO]`.

**Argumento de concentración.** Que `CRPC ≤ K` sea legalmente suficiente no lo hace prudente. Un
contrato que consume más del **60–70 % del K disponible**:

1. bloquea la presentación a cualquier otro proceso relevante durante todo su plazo, porque el K se
   recalcula neto del SCE;
2. deja al proponente ante **un solo cliente**, expuesto al `RE` de esa única entidad sin
   diversificación — si esa entidad paga a 137 días, no hay flujo de otro contrato que lo compense;
3. concentra el riesgo operativo: un problema geotécnico en la única obra es un problema en el
   100 % de la facturación;
4. y consume el cupo de la aseguradora (§2.C.3), que es un segundo techo, independiente del K.

Umbral propuesto: `concentracion = CRPC / K`. Verde < 0.45, amarillo 0.45–0.65, rojo > 0.65. El rojo
**no descarta, advierte** — misma filosofía que la capa de pertinencia: en una app de oportunidades
el falso negativo cuesta más que un amarillo revisable.

---

### 4. Riesgo de mercado

#### 4.1 Reajuste: el riesgo binario más caro del contrato

`[CONOCIDO]` En obra pública colombiana el reajuste **debe estar pactado**; no se presume. Si el
contrato no trae fórmula, toda la inflación de insumos la absorbe el contratista.

`[CONOCIDO]` Cuando se pacta, se indexa a los índices de costos de construcción del DANE:
**ICOCIV — Índice de Costos de la Construcción de Obras Civiles**, que **sustituyó al ICCP desde
enero de 2022** (última publicación del ICCP: diciembre de 2021), y para edificación **ICOCED**, que
sustituyó al **ICCV** en la misma fecha. Con menos precisión técnica, algunos pliegos indexan al IPC
— es peor para el contratista, porque el IPC no recoge los picos de acero y asfalto. **Escribir la
sigla vieja (ICCP/ICCV) en una fórmula de reajuste hoy la deja sin índice publicado.**

Exposición inflacionaria de un contrato **sin** fórmula de reajuste:

```
Perdida_inflacion = Σ_t  costo_t · [ Π_{s=1..t} (1 + π_s) − 1 ]
```

con `costo_t` el costo ejecutado en el mes `t` (curva S, no lineal) y `π_s` la inflación mensual del
índice pertinente. Con una curva S típica el grueso del costo cae entre el mes 4 y el 9, de modo que
la exposición efectiva es **menor** que la inflación acumulada del plazo total — pero sobre 12+ meses
sigue siendo material. Coeficiente de trabajo: `f_reajuste = 1.00` con fórmula pactada,
`1.00 + 0.55·π_esperada_plazo` sin ella. El **0,55 es el centro de gravedad de una curva S típica**
`[SUPUESTO]`: se recalcula con el cronograma valorizado real del proceso, que sí es un dato del
pliego.

#### 4.2 Volatilidad de insumos y cobertura natural

La columna de volatilidad es `[SUPUESTO]` — ordenamiento cualitativo por juicio, **sin serie de
precios detrás**. Se sustituye en cuanto se descarguen las series del ICOCIV por capítulo de insumo,
que es exactamente el dato que falta.

| Insumo | Volatilidad relativa (juicio) | Cobertura natural disponible | Etiqueta |
|---|---|---|---|
| Acero de refuerzo | Alta; sigue el precio internacional y la TRM | Orden de compra en firme con precio y cantidad cerrados al inicio | `[SUPUESTO]` |
| Cemento y concreto | Media; mercado concentrado, precios administrados | Contrato de suministro con planta local | `[SUPUESTO]` |
| Asfalto (MDC, emulsiones) | Alta; derivado del crudo | Difícil: producción y transporte limitados | `[SUPUESTO]` |
| Combustible (ACPM) | Media-alta; precio regulado con ajustes por política | Ninguna; es riesgo de política pública | `[SUPUESTO]` |
| Equipo/repuestos importados | Sigue la TRM | Compra anticipada | `[SUPUESTO]` |

`[INCIERTO]` No se pudo verificar ninguna serie de precios ni la TRM actual: todos los portales están
bloqueados en este entorno. **La cobertura por orden de compra en firme es la mitigación más barata
que existe** y debe cotizarse **antes** de presentar, no después de adjudicar: convierte un riesgo de
mercado en un costo conocido, y además convierte un riesgo que la matriz probablemente le asignó al
contratista (§2.C.1) en una partida de costo directo.

---

### 5. Tabla maestra de coeficientes

`M` = multiplicador de costo · `A` = aditivo de **plazo de EJECUCIÓN** (días) · `P` = prima de riesgo
probabilística (esperanza = probabilidad × impacto).

| ID | Variable | Fuente | Rango | Entra como | Etiqueta fuente |
|---|---|---|---|---|---|
| `RE-01` | `P_pago` — proxy fiscal de la entidad | DNP (IDF por grupo) + Ley 617 (categoría) | 0.00–1.00 | `M/P` **vía `Costo_fin`** — nunca como plazo | `[CONOCIDO]` fuentes · `[SUPUESTO]` pesos |
| `RE-02` | `P_adiciones` — sobrecosto/sobreplazo mediano | Dataset SECOP de **contratos** (no ingestado) | 0.00–1.00 | `P` | `[INCIERTO]` |
| `RE-03` | `P_sancion` | Contraloría / Procuraduría — manual | 0.00–1.00 | `P`, peso 0.10 | `[CONOCIDO]` |
| `RE-04` | `tasa_desierto_e` — **por estado, no por ausencia de adjudicatario** | Histórico propio, `estado_del_procedimiento` normalizado | 0.00–1.00 | `P` (riesgo de proceso fallido) | `[REPO]` |
| `RE-05` | `HHI_e` — concentración de adjudicatarios | Histórico propio, 24 meses, mín. 5 adjudicaciones | 0.00–1.00 | Bandera si >0.35 y el dominante ≠ proponente | `[REPO]` |
| `RE-06` | `RE` compuesto (renormalizado) | Combinación de los subíndices DISPONIBLES | 0.00–1.00 | **Se calcula, no se acota:** `prima = Costo_fin(DSO_e)/valor + Σ primas RE-02..RE-05` | derivado |
| `FL-01` | `DSO_e` — días de pago esperados | Tabla §2 por tipo de entidad | P50 52–137 d · P85 hasta 195 d | `M/P` **vía `Costo_fin`** | `[SUPUESTO]` |
| `FL-02` | `i_ea` — tasa de colocación | Superfinanciera (IBC, resolución **mensual**) o banco del dueño | ~19 % EA reciente, verificar | `M` vía `Costo_fin` | `[INCIERTO]` |
| `FL-03a` | **Anticipo** pactado | Pliego. `anticipo_pct` del corpus: **0 = sin dato** | 0–50 % (par. art. 40 L.80) | Reduce exposición inicial; **se amortiza en cada acta**; sumar comisión fiduciaria (art. 91 L.1474/2011) como costo directo | `[REPO]` + `[CONOCIDO]` |
| `FL-03b` | **Pago anticipado** | Pliego | según pliego | Pago definitivo: no se amortiza, no exige fiducia | `[CONOCIDO]` |
| `FL-04` | **Deducciones de ley** (contribución 5 %, estampillas, retefuente, ICA) | Pliego + acuerdo/ordenanza de la entidad | ≈ 7 %–15 % de cada acta | **Costo cierto**, se resta del flujo | `[CONOCIDO]` + `[SUPUESTO]` en estampillas |
| `FL-05` | **Retención en garantía** | Pliego | 5 %–10 % de cada acta | Caja diferida hasta la **liquidación**; su costo va a `Costo_fin` | `[CONOCIDO]` |
| `FL-06` | Primas de garantías y contragarantías | Pliego (§2.C.3) + aseguradora | según amparos | **Costo directo** | `[CONOCIDO]` |
| `OP-01` | `f_complejidad` (banda, no punto) | Tipología §3.1 | 1.00 ±2 % … 1.08 ±15 % | `M` + ampliación de banda | `[SUPUESTO]` |
| `OP-02` | `f_mo` — mano de obra en zona | Categoría municipal + distancia | 1.00–1.12 | `M` | `[SUPUESTO]` |
| `OP-03` | Recargo dominical/festivo | Ley 2466 de 2025 | **90 %** hasta 30-jun-2027; **100 %** después | `M` sobre MO dominical | `[CONOCIDO]` |
| `OP-04` | Recargo nocturno (jornada desde 19:00) | CST reformado | 35 % | `M` sobre MO nocturna | `[CONOCIDO]` |
| `OP-05` | Extra diurna / extra nocturna | CST | 25 % / 75 % | `M` sobre MO extra | `[CONOCIDO]` |
| `OP-06` | `concentracion = CRPC/K` | `lib/capacidad.js` | 0.00–>1.00 | Semáforo; >0.65 exige `P` extra | `[REPO]` |
| `OP-07` | Estacionalidad (§3.4) | Promedios de precipitación mensual por estación, IDEAM | +5 %–20 % de plazo | **`A`** (alarga la ejecución) | `[SUPUESTO]` en magnitud |
| `MK-01` | `f_reajuste` | Cláusula del pliego | 1.00 · o 1+0.55·π | `M` | `[CONOCIDO]` + `[SUPUESTO]` en el 0,55 |
| `MK-02` | Índice de indexación pactado | **ICOCIV** (obras civiles; sustituyó al ICCP en ene-2022) o **ICOCED** (edificación, sustituyó al ICCV); o IPC | — | Define `MK-01` | `[CONOCIDO]` |
| `MK-03` | Volatilidad de acero/asfalto | Juicio; series del ICOCIV por capítulo pendientes | — | `P` si no hay OC en firme | `[SUPUESTO]` |
| `MK-04` | TRM si hay importados | Banco de la República | — | `P` | `[CONOCIDO]` |
| `CT-01` | Riesgos asignados al contratista en la **matriz** | Pliego (art. 4 L.1150/2007) | caso a caso | `P` explícita, uno a uno | `[CONOCIDO]` |

Composición sobre el costo directo:

```
Precio_minimo = CD · (Π M_i) + AIU + Σ P_j        Plazo_ofertado = plazo_base + Σ A_k
```

**El DSO nunca se suma al plazo ofertado.** Alimenta únicamente `Costo_fin` de §2, que entra al
precio como prima financiera. Sumarlo al plazo sería un error de categoría con dos consecuencias
reales: infla la oferta técnica —y en pliegos con plazo máximo o con plazo puntuable la vuelve
rechazable o peor calificada— y **empeora** el problema, porque alarga el período sobre el que se
paga el costo financiero. `A` se reserva exclusivamente a lo que alarga la **ejecución**:
estacionalidad (`OP-07`), curva de aprendizaje y trámites de permisos.

**`Σ P_j` y la «I» del AIU cubren la misma cosa.** O se cotizan los riesgos uno a uno en `Σ P_j` y la
I se deja en el mínimo, o se usa una I global — **nunca las dos llenas a la vez**: eso es cobrar dos
veces el mismo riesgo y salir caro sin ganar cobertura.

#### 5.1 Este número es el precio mínimo, no el precio a ofertar

`[CONOCIDO]` **En obra pública el componente económico casi nunca se puntúa por «el más barato».**
Los Documentos Tipo de Colombia Compra Eficiente y el D. 1082 de 2015 usan **métodos de ponderación
que se SORTEAN en audiencia** (media aritmética, media aritmética alta, media geométrica con
presupuesto oficial, menor valor), de modo que **subir el precio por primas de riesgo puede alejarte
de la media ganadora tanto como bajarlo**. Además:

- **Techo:** una oferta por encima del **presupuesto oficial** es causal de rechazo.
- **Piso:** el **precio artificialmente bajo** obliga a requerimiento y puede terminar en rechazo si
  la explicación no satisface al comité.

**Regla de decisión, y es la conclusión práctica de toda esta sección:** si el precio mínimo de la
fórmula queda **por encima** de la zona donde suele caer la media adjudicada de esa entidad para esa
tipología, la decisión correcta es **NO presentarse** — no bajar la prima de riesgo. Bajar la prima
no elimina el riesgo: lo transfiere del precio a la utilidad, y ahí es donde se pierde plata.

---

#### Vacíos y siguiente paso

1. **Los dos supuestos que sostienen toda la tabla de capacidad (§3.5) — prioridad máxima.**
   *Siguiente paso:* **pedir al dueño (a) el ingreso operacional real de los estados financieros del
   RUP y (b) el número de profesionales de planta de la SAS, ANTES de usar cualquier cifra de esa
   tabla.** Con el ingreso operacional real desaparece el multiplicador 16.7 y la K deja de ser una
   estimación; ambos datos se cargan por `/api/admin/rup` y tienen efecto inmediato `[REPO]`.
2. **Dataset de contratos de SECOP II (`jbjy-vk9h`).** Sin él, `RE-02` (adiciones) y todo lo de pagos
   son incalculables. El **id está confirmado**; lo que falta son los **nombres de las columnas**.
   *Siguiente paso:* en producción,
   `https://www.datos.gov.co/resource/jbjy-vk9h.json?$select=:id,:updated_at,*&$limit=1` y listar
   las claves, buscando `valor_pagado`, `valor_facturado`, `valor_pendiente_de_pago`,
   `valor_amortizado`, `fecha_de_inicio_del_contrato` y `fecha_de_fin_del_contrato`.
3. **Columnas de adjudicación del histórico.** `RE-04` y `RE-05` no son publicables mientras
   `indice:competencia:meta` reporte `descartados.sin_adjudicacion` o `sin_oferentes` alto `[REPO]`.
   *Siguiente paso:* mirar ese meta **antes** de dar peso a `P_captura`; si está alto, añadir el
   nombre real de la columna en `lib/indice_competencia.js` y llamar
   `/api/sync/historico?reconstruir_indice=true`.
4. **Tabla fiscal municipal.** No existe en el repo. *Siguiente paso:* descargar de DNP-Terridata
   categoría Ley 617, IDF de la vigencia 2023 **y el grupo de capacidades iniciales de cada
   municipio**, calcular el percentil dentro del grupo y persistir `data/fiscal_municipios.json` con
   su vigencia declarada — dato curado y fechado, jamás presentado como derivación estadística.
5. **Todo lo marcado `[SUPUESTO]` se calibra con una sola fuente: los contratos ejecutados del
   dueño.** *Siguiente paso:* levantar de sus propios expedientes, para cada contrato terminado, la
   fecha de cada acta y la de su pago (→ DSO real por tipo de entidad), el costo real contra el
   presupuestado por tipología (→ `f_complejidad`), y el sobrecosto de cuadrilla desplazada (→
   `f_mo`). Veinte contratos bastan para reemplazar media docena de placeholders por datos.
6. **Recargos laborales y vigencias (`OP-03`).** No se pudo abrir el texto de la Ley 2466 de 2025 en
   esta sesión. *Siguiente paso:* Gestor Normativo de Función Pública, confirmar las tres fechas del
   escalonamiento dominical y la vigencia del inicio de jornada nocturna a las 19:00 antes de fijar
   la tarifa en un APU con plazo que cruce el 1-jul-2027.
7. **Vigencia de la contribución especial del 5 % (`FL-04`).** La tarifa y la base no están en duda;
   la **cadena de prórrogas** (Ley 1106/2006 → Ley 1421/2010 → Ley 1738/2014) sí conviene
   verificarla textualmente. *Siguiente paso:* Gestor Normativo, art. 6 de la Ley 1106 de 2006 y
   art. 8 de la Ley 1738 de 2014.
8. **Estampillas e ICA del municipio contratante.** Son certeza, pero su porcentaje solo existe en
   la ordenanza/acuerdo local. *Siguiente paso:* leerlos **en el pliego de cada proceso** —siempre
   están— y guardarlos en la ficha de entidad para no volver a buscarlos.
9. **SCE de Génesis vacío.** `calcSCE` asume 0 y la K queda optimista `[REPO]`. Confirmar con el
   dueño los contratos en ejecución de la SAS antes de usar `OP-06` para decidir algo.
10. **Tope estratégico del consorcio.** Los 11.000 SMMLV son un valor por defecto del código, no una
    decisión. *Siguiente paso:* confirmarlo con el dueño; hoy no ata porque el 65 % del K muerde
    antes ($5.926 M), pero si el ingreso operacional real sube la K, empezaría a mandar.


---

## 2.C — La formula de rentabilidad real esperada

> **Nota de verificación (obligatoria antes de usar cualquier cifra).** En esta sesión **no se pudo
> verificar ninguna fuente externa**: el presupuesto de `WebSearch` estaba agotado (200/200) y los
> `WebFetch` intentados devolvieron **HTTP 403** (`suin-juriscol.gov.co`, `es.wikisource.org`,
> `en.wikipedia.org`, y en la corrida anterior `funcionpublica.gov.co` y `colombiacompra.gov.co`).
> Por tanto: **cero fuentes [VERIFICADO] externas**. Lo único verificado en esta sesión es el
> **código del repositorio**, leído línea a línea: `lib/capacidad.js`, `lib/perfiles.js`,
> `lib/proyeccion.js`, `lib/indice_competencia.js`. Todo lo demás va etiquetado [CONOCIDO] o
> [INCIERTO] con su ruta exacta de verificación. Las cifras de industria son **órdenes de magnitud
> calibrables, no datos auditados**: la fórmula es el entregable, los números son semilla.

---

### 1. Notación y convenciones

| Convención | Definición |
|---|---|
| Horizonte | `t = 1 … T` meses de **ejecución**, más la cola de cobro y liquidación: `t = 1 … T+L`, con `L` = meses hasta la devolución de la retegarantía (típico 2–4) |
| Moneda | **COP corrientes**. Sin deflactar: en un contrato de 8–18 meses la inflación se maneja dentro de `R_reajuste` o se asume dentro de los riesgos, no con una tasa real |
| `V` | Valor del contrato = valor de la oferta adjudicada |
| `PO` | Presupuesto oficial del pliego. En el corpus el proxy es `precio_base` [VERIFICADO en `lib/proyeccion.js:43`; que `precio_base` sea el PO está **[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]**] |
| `T` | Plazo en meses. Se deriva de `duracion` + `unidad_de_duracion` con `plazoMesesDe()` [VERIFICADO en `lib/capacidad.js:123-133`] |
| `n` | Nº esperado de oferentes = `competenciaDe(indice, lic).promedio_oferentes` [VERIFICADO en `lib/indice_competencia.js:435-466`] |
| **Antes de renta** | `U_esperada`, `m_neto`, `ROIC` y `VEG` son cifras **ANTES de impuesto de renta**. La renta se aplica al final, con la tarifa de la figura que firme (§5) |

#### Utilidad contable ≠ flujo de caja (y en obra pública la diferencia decide)

Son dos estados distintos y **ninguno de los dos basta solo**:

| | Utilidad contable | Flujo de caja |
|---|---|---|
| Reconocimiento del ingreso | Por grado de avance (`s_t`), cuando se ejecuta y se mide | Cuando la tesorería paga, `DSO` días después del acta |
| Anticipo | **No es ingreso**: es un pasivo que se amortiza | Es el **mayor ingreso de caja del contrato**, y llega en `t=1` |
| Retegarantía (5 %) | Es ingreso reconocido | **No es caja** hasta la liquidación (`T+L`) |
| Retefuente (2 %) | No es costo: es anticipo del impuesto de renta | **Sí es salida de caja** el día del acta; se recupera en la declaración del año siguiente |
| Consecuencia | Un contrato puede tener utilidad contable positiva **todo el tiempo** y caja negativa **todo el tiempo** | Se quiebra por caja, no por utilidad |

La consecuencia práctica: **la utilidad decide si vale la pena; la caja decide si se puede**. Por eso
la fórmula produce dos números independientes —`U_esperada` y `K_max`— y ninguno sustituye al otro.

---

### 2. Ingresos

```
I_total = V  +  a_adición · V · mc_adición  +  R_reajuste
```

La adición entra **neta**: `mc_adición` es su margen de contribución (lo que deja después de su
propio costo directo, su indirecto marginal y sus impuestos), no el valor bruto adicionado. Con
`mc_adición ≈ 8 %` [supuesto a calibrar contra obras propias], una adición del 4,5 % de `V` aporta
0,36 % de `V` a la utilidad, no 4,5 %. Escribir `I_total = V·(1+a_adición)` y restar sus costos
aparte es equivalente **solo si esos costos se restan de verdad**; netearla desde el ingreso evita
el error de contarla dos veces.

**`V`** — valor de la oferta. En la evaluación previa a ofertar se usa `PO` (o `precio_base`) por el
factor de descuento que imponga el método de adjudicación (ver §2.B y §4).

**`a_adición`** — adición esperada, **producto de probabilidad × magnitud**:

```
a_adición = p_adición · m_adición
```

Se estima del histórico por entidad (el keyspace `licitaciones:historico:mes:*`, que nada purga):
proporción de procesos de esa entidad que terminaron adicionados y magnitud media de la adición.
Rango típico en obra municipal: `p_adición ∈ [0.15, 0.45]`, `m_adición ∈ [0.10, 0.35]` → `a_adición
∈ [0.02, 0.15]` [CONOCIDO, calibrable].

**Tope legal.** El parágrafo del **artículo 40 de la Ley 80 de 1993** limita la adición al **50 % del
valor inicial del contrato, expresado en salarios mínimos legales mensuales** [CONOCIDO — **no
verificado en esta sesión**, 403]. Tres precisiones que cambian el modelo:

1. **El tope se expresa en SMMLV, lo que lo INDEXA.** Cada adición se convierte a SMMLV con el
   salario mínimo vigente **en su fecha**, de modo que el techo en **pesos** crece con el SMMLV: en
   contratos plurianuales la adición máxima nominal **supera** el 50 % del valor inicial medido en
   pesos corrientes. La doctrina lo dice expresamente —el valor se expresa en salarios mínimos «ya
   que estos permiten una actualización de dicho valor, haciendo posible que la suma adicionada al
   precio del contrato original supere el monto de dicho valor inicial expresado en términos
   absolutos» (Consejo de Estado, Sala de Consulta y Servicio Civil, concepto **1439 de 2002**
   [CONOCIDO en sustancia; el **número de radicado está [INCIERTO]** y hay que confirmarlo)].
   **Método:** llevar el valor inicial a SMMLV del año de firma y descontar cada adición en SMMLV
   del año en que se pacta. Con SMMLV 2026 = **$1.750.905** [VERIFICADO en `lib/perfiles.js:61`, no
   contra el decreto].
2. El tope aplica al **valor**, no al **plazo**: una prórroga no está sujeta a este límite.
3. «Adición» y «mayores cantidades de obra a precios unitarios pactados» se discuten como figuras
   distintas en la doctrina. Verificar antes de modelar el techo.

> **Cómo verificarlo:** texto del art. 40 par. de la Ley 80 en `funcionpublica.gov.co/eva/gestornormativo`
> o `suin-juriscol.gov.co`; el concepto de la Sala de Consulta en `consejodeestado.gov.co`; y
> conceptos de Colombia Compra Eficiente sobre adición vs. mayores cantidades.

**`R_reajuste`** — **cero si el contrato no trae fórmula de reajuste**, que es el caso mayoritario en
contratos municipales cortos [CONOCIDO]. Cuando existe, `R_reajuste = Σ_t V_t · (Ī_t/Ī_0 − 1)`, con
`Ī` el índice pactado: hoy el **ICOCIV del DANE** (Índice de Costos de la Construcción de Obras
Civiles), **que reemplazó al ICCP a partir de 2022** — el ICCP solo sirve para series históricas
anteriores y una fórmula que hoy lo invoque **no tiene serie que aplicar** [CONOCIDO; el año exacto
del empalme se confirma en la ficha metodológica del DANE]. La ausencia de fórmula **no elimina el
riesgo de precios: lo traslada íntegro al contratista** y por eso reaparece en la prima de riesgo (§4).

#### Curva de facturación (curva S)

El avance acumulado se modela con una logística simétrica:

```
s(τ) = τ^a / ( τ^a + (1−τ)^a ),      τ = t/T,      a ∈ [1.4, 2.5]
```

`a` pequeño → arranque rápido (obra repetitiva, poca movilización). `a` grande → arranque lento
(movilización pesada, diseños de detalle, permisos). Para obra pública municipal el arranque es
**siempre lento** —acta de inicio, permisos, socialización, anticipo en fiducia—, de modo que
**recomendado `a ≈ 2.0–2.3`**; `a ≈ 1.4–1.7` solo en obra repetitiva y ya movilizada. Referencia:
en `τ = 0,2` el avance acumulado es 11,1 % con `a = 1,5` y 3,0 % con `a = 2,5`.

**Limitación que hay que conocer antes de usarla:** esta forma es **simétrica** y por construcción
impone `s(0,5) = 50 %` **con cualquier `a`**. Un programa de obra pública real suele ser
**asimétrico** (arranque lento *y* cierre largo por actas finales, pruebas y recibo), y ahí el
acumulado a mitad de plazo cae por debajo del 50 %. Si el programa real lo exige, sustituir por una
CDF Beta `s(τ) = I_τ(p, q)` con dos parámetros —`p > q` desplaza masa al final— en vez de forzar el
valor de `a`.

El avance mensual es `Δs_t = s(t/T) − s((t−1)/T)`, y el acta bruta del mes es `Acta_t = V · Δs_t`.

---

### 3. Costos

#### 3.1 Costo directo

```
C_directo = Σ_i  q_i · PU_i                                   (del APU — Parte 1)

C_directo_real = C_directo · (1 + δ_desperdicio) · (1 + δ_rendimiento) · F_región
```

| Factor | Qué mide | Rango típico | Fuente |
|---|---|---|---|
| `δ_desperdicio` | **Exceso** del desperdicio real sobre el presupuestado en el APU (no el desperdicio total) | 0.02 – 0.08 | §2.A: APU 3–5 %, obra 5–12 % |
| `δ_rendimiento` | Pérdida de rendimiento: MO local obligatoria, lluvia ordinaria, curva de aprendizaje | 0.00 – 0.10 | §2.A |
| `F_región` | Penalización residual **si el APU no se regionalizó**. Si el APU ya lleva precios puestos en obra y transporte real, `F_región = 1.00` | 1.00 – 1.18 | §2.B / §1.7 |

**Error frecuente:** aplicar `F_región` sobre un APU ya regionalizado. Se cuenta dos veces la
distancia y la oferta se vuelve no competitiva. `F_región` es residual **por definición**.

**La distancia no entra por `δ_desperdicio`.** El desperdicio es función del proceso constructivo y
del control de obra, no de los kilómetros. Un municipio más cerca baja `C_directo` (transporte de
materiales y fletes dentro del APU) y baja `C_indirecto` (vehículo, viáticos), **no** `δ_desperdicio`.
Mezclarlos produce números que no se pueden reconstruir.

#### 3.2 Costo indirecto

```
C_indirecto ≈ A% · C_directo        (forma de pliego)
C_indirecto = Σ_j (dedicación_j · costo_mensual_j · T) + fijos_de_obra     (forma real)
```

**La forma real es la que manda**, porque el indirecto es función del **PLAZO**, no del valor: una
prórroga sin obra adicional es utilidad quemada. La forma `A% · C_directo` solo sirve para escribir
la oferta. Rango de `A%`: 15–28 % del CD en obra municipal pequeña; el porcentaje **sube al bajar la
cuantía y al alargarse el plazo**.

#### 3.3 Garantías

```
C_garantías = Σ_g  Suma_asegurada_g · tasa_g · vigencia_g/12  + fiducia_anticipo + gastos
```
Paquete completo típico: **1,5–2,5 % de `V`** para un contratista pequeño [CONOCIDO]. La póliza de
**estabilidad (5 años)** es la que más pesa y la que **inmoviliza cupo de afianzamiento cinco años,
no `T` meses** — restricción que en la práctica es más binding que la K de `lib/capacidad.js`.

#### 3.4 Impuestos y descuentos de acta

Hay que separar **costo definitivo** de **timing de caja**. Es la distinción que más errores produce:

| Descuento | Tarifa típica | ¿Costo? | ¿Afecta caja? |
|---|---|---|---|
| Retefuente construcción | 2 % | **No** (anticipo de renta) | **Sí** |
| Retención de IVA | 15 % del IVA facturado | No | Sí (ver regla de base, abajo) |
| ICA + reteICA | 2–10 ‰ | **Sí** | Sí |
| Estampillas (varias) | 1–6 % agregado | **Sí** | Sí |
| Contribución especial de obra pública (**art. 6 Ley 1106 de 2006**, de vigencia permanente por el parágrafo del art. 8 de la Ley 1738 de 2014) | **5 %** | **Sí** | Sí |
| Retegarantía | 5–10 % | **No** (se devuelve) | **Sí**, hasta `T+L` |
| Amortización del anticipo | `β` = % del anticipo | **No** | **Sí** |

**Contribución especial de obra pública — tres precisiones.**

1. **Vigencia permanente: parágrafo del art. 8 de la Ley 1738 de 2014** — excluyó expresamente de la
   vigencia temporal de la Ley 418 y dio carácter **permanente** a los artículos 5 y 6 de la Ley 1106
   de 2006 y 6 y 7 de la Ley 1421 de 2010. **No requiere prórroga** de la Ley 418 [CONOCIDO — no
   verificado en esta sesión, 403]. La disposición operativa hoy es el **art. 6 de la Ley 1106 de
   2006**, que sustituyó al art. 37 de la Ley 782 de 2002, a su vez heredero del art. 121 de la Ley
   418 de 1997: citar «Ley 418/1997» a secas es citar la norma equivocada.
2. **Base gravable: el valor total del contrato SIN incluir impuestos** —no `V` con IVA— y también
   sobre el valor de cada **adición** [CONOCIDO; la fuente que suele citarse es un concepto DIAN de
   2016 (**Concepto 7086 de 2016**, número **[INCIERTO]**): confirmar antes de usarlo en un escrito].
3. **EXCEPCIÓN CRÍTICA — vías terciarias.** La contribución del 5 % ha excluido tradicionalmente los
   **contratos de construcción de vías terciarias y sus adiciones** (redacción originada en la Ley
   241 de 1995). **Una placa huella suele ser vía terciaria.** **[PENDIENTE DE VERIFICAR]** contra el
   texto vigente del art. 6 de la Ley 1106/2006, sus modificaciones posteriores, el concepto DIAN
   aplicable y —esto es lo decisivo en el caso concreto— **la clasificación de la vía en el pliego**
   (terciaria, secundaria o urbana). En el ejemplo del §6 esta sola casilla vale **60,0 M COP** y
   **cambia el veredicto de signo**: por eso el caso se presenta en dos escenarios y no en uno.

**Regla de base del IVA (la más consultada y la más equivocada).** En contratos de **construcción de
bien inmueble**, el IVA se causa sobre el **AIU** —o sobre la parte correspondiente a honorarios y
utilidad— y **no sobre el valor total del contrato** (Decreto 1372 de 1992, art. 3; compilado en el
DUR 1625 de 2016) [CONOCIDO — no verificado en esta sesión]. La **reteIVA del 15 % se aplica sobre
ese IVA**, no sobre `V`. Con AIU = 342,9 M el IVA facturado es 65,1 M y la reteIVA 9,8 M (0,81 % de
`V`), no 34,2 M.

```
τ_costo   = τ_ICA + τ_estampillas + τ_contribución                      (costo definitivo)
τ_caja    = τ_costo + τ_retefuente + τ_retegarantía + β
            + τ_reteIVA − τ_IVA_facturado                               (descuento neto del acta)
C_impuestos = τ_costo · V
```

`τ_IVA_facturado = 19 % · (AIU/V)` y `τ_reteIVA = 15 % · τ_IVA_facturado`. **Los dos términos van
juntos o no va ninguno:** el contratista *recibe* el IVA facturado (+5,4 pp de `V` en el ejemplo) y
solo le retienen el 15 % de él (−0,8 pp); el resto lo remite bimestralmente a la DIAN. Modelar solo
la retención sobreestima la exposición de caja; modelar solo el recaudo la subestima. **El ejemplo
del §6 trata el circuito del IVA como aproximadamente neutro sobre `K_max`** (float de recaudo ≈
retención + remisión bimestral) y por eso mantiene `τ_caja = 44,2 %`; la simplificación queda
declarada, con su magnitud a ambos lados, en vez de escondida.

`τ_costo` va de **3 % a 12 % del contrato** según municipio y orden de la entidad. Es la variable
territorial más grande del modelo y **se conoce a priori** leyendo el acuerdo municipal: es esfuerzo
de datos, no incertidumbre.

#### 3.5 Costo financiero

```
K_t = Σ_{u≤t} (Ingresos_de_caja_u − Egresos_u)     caja acumulada del contrato
                                                   (K_t < 0 = capital expuesto)
C_financiero = Σ_t  max(0, −K_t) · i_mensual
i_mensual = (1 + i_EA)^(1/12) − 1
```

Con `Ingresos_de_caja_t = Anticipo·1[t=1] + Acta_{t−DSO} · (1 − τ_caja) + Retegarantía·1[t=T+L]`.

**El signo importa y es la fuente de un error silencioso:** si `K_t` se define como egresos menos
ingresos, `max(0, −K_t)` vale **cero siempre** y `C_financiero` sale 0 sin que nadie lo note. `K_t`
es **caja acumulada**: positivo = caja a favor, negativo = capital expuesto. `K_max`, el payback y
la tabla del §6 usan esta misma convención.

**Efecto del anticipo y de su amortización.** El anticipo `α·V` entra completo en `t=1` y cubre el
arranque, pero se amortiza al `β` en cada acta (típico `β = α`). El resultado contraintuitivo, que el
ejemplo de §6 demuestra: **con anticipo del 30 % el pico de caja negativa no desaparece — se
desplaza al final del contrato**, porque a partir del mes 3 cada acta llega recortada en ~44 % y ya
no cubre el egreso del mes. El anticipo compra tres meses, no la obra.

#### 3.6 Costos ocultos

```
C_oculto = seguridad + gestión social extra + sobrecosto de MO local obligatoria + pérdidas
```
0,5–3 % de `V` [CONOCIDO, §2.A punto 6]. **No incluye extorsión**: eso no es un costo a
presupuestar sino un `no_ir` duro por municipio (§2.A).

---

### 4. Prima de riesgo

```
PR = Σ_k  p_k · c_k
```

| Evento `k` | `p_k` típica | `c_k` si ocurre | De dónde sale la estimación |
|---|---|---|---|
| Lluvia extraordinaria (fuera de la temporada presupuestada) | 0.25 | 1.5 % de `V` (3–4 sem. de mayor permanencia) | IDEAM: nº de días de lluvia del municipio vs. supuesto del programa |
| Bloqueo social / vía de hecho comunitaria | 0.15 | 2.0 % de `V` | Histórico del municipio; conocimiento del dueño |
| Retraso de pago **más allá** del `DSO` modelado | 0.40 | 0.9 % de `V` | Histórico de la entidad; es lo más medible de la tabla |
| Sobrecosto de acero/cemento > 10 % **sin fórmula de reajuste** | 0.25 | 1.2 % de `V` | ICOCIV del DANE + composición del APU |
| Hallazgo de redes no identificadas | 0.20 | 1.5 % de `V` | Obra urbana/redes: sube a 0.35 |
| Multa o apremio por retraso imputable | 0.10 | 2.0 % de `V` | Cláusula penal del pliego |
| Mayor permanencia por acto de la entidad (diseños, predios, licencias) | 0.30 | `2.5 % · (1 − p_reconocimiento)` = **1,5 %** con `p_reconocimiento = 0,40` | La causa nº 1 en obra municipal — **pero es riesgo reclamable, no pérdida pura** |
| Hallazgo arqueológico / suspensión larga | 0.03 | 6.0 % de `V` | Excavación en zona con potencial ICANH |
| **`Σ p_k·c_k` con los valores de esta tabla** | | **2,32 % de `V`** | Base auditable; los casos del §6 parten de aquí |

**Mayor permanencia: por qué `c_k` va neto.** La mayor permanencia imputable a la **entidad**
(diseños incompletos, predios sin disponer, licencias no tramitadas) es el caso paradigmático de
**restablecimiento de la ecuación contractual**: el contratista tiene derecho a reclamar el
sobrecosto (arts. 4.8, 4.9, 5.1 y 27 de la Ley 80 de 1993) [CONOCIDO — no verificado en esta sesión].
La recuperación es parcial y tardía, pero no es cero. Modelarla al 100 % de pérdida infla `PR` y
confunde **imprevisto** con **riesgo asignado a la otra parte**. `p_reconocimiento = 0,40` es un
**supuesto a calibrar contra el histórico propio de reclamaciones**, no un dato de mercado; con
`p_reconocimiento = 0` la tabla vuelve a sumar 2,77 %.

*Tabla [CONOCIDO], calibrable contra el histórico propio. Es el bloque con más incertidumbre del
modelo y el que más se beneficia de llevar bitácora de las obras ejecutadas.*

#### Por qué la prima se RESTA en vez de inflarse dentro del precio

Meterla en el precio sube `V` y **baja `P(ganar)`**. Con `n = 6`, subir la oferta 3 % puede costar
más `P(ganar)` de lo que gana en margen: el mercado no paga la prima de riesgo de un contratista
pequeño.

**Antes de la regla de reparto, el hecho que la condiciona: en obra pública el método de ponderación
de la oferta económica se SORTEA en la audiencia de adjudicación**, entre los mecanismos que liste
el pliego. La Ley 1882 de 2018 adicionó al art. 30 de la Ley 80 la obligación de que el pliego
señale los mecanismos de evaluación de la oferta económica **y el método aleatorio** con el que se
escogerá cuál se aplica [CONOCIDO — no verificado en esta sesión]. **El proponente elige su precio
sin saber si le tocará media geométrica o menor valor.** Cualquier estrategia que suponga conocido
el método es inaplicable ex ante.

La regla de reparto, con esa condición incorporada:

| Se **PRECIA** dentro de la oferta (sube `V`) | Se **RESTA** del valor esperado (baja `VEG`) |
|---|---|
| Riesgo casi cierto (`p → 1`) | Riesgo de cola (`p` baja, `c` alto) |
| Riesgo asignado explícitamente al contratista en la **matriz de riesgos** del pliego [CONOCIDO: art. 4 Ley 1150/2007 + CONPES 3714 de 2011 — verificar] | Riesgo no asignado o compartido |
| Riesgo transferible a póliza o subcontrato a precio fijo | Riesgo no transferible |
| **Si el pliego fija el método** y es **central** (media aritmética/geométrica): un precio algo mayor casi no penaliza, e incluso puede acercar a la media | **Si el pliego fija el método** y es **menor valor**: cualquier sobreprecio es una derrota |
| **Si el método se sortea** (el caso normal): usar el `λ` mezclado del párrafo siguiente y **no apostar por ninguno** — ni el precio agresivo del «menor valor» ni el relajado del «método central» | ídem: la incertidumbre de método es un riesgo más, y se resta, no se prevé |

El caso límite es el importante: **si `U_esperada − PR < 0`, la respuesta no es subir el precio; es
no presentarse.** Un contrato cuyo riesgo no cabe en la «I» del AIU y no cabe en el precio
competitivo es un contrato que no es para este proponente.

#### Corrección por maldición del ganador

Consistente con §2.B, la corrección se aplica sobre el **costo estimado**, no sobre los eventos:

```
MG(n) = λ · σ_est · E[Z_(n−1)] · C_directo_real
```

`σ_est` = error relativo del APU propio (**8 %** como punto de partida conservador si no está
calibrado; supuesto propio, no dato de mercado).

**`λ` con método sorteado.** `λ ∈ [0.10, 0.20]` corresponde a **métodos centrales** —que rompen la
selección adversa: si se gana por estar en el centro, no se gana por ser el más optimista— y
`λ ∈ [0.30, 0.50]` a **menor valor**. Como el método se sortea, `λ` debe ser el **promedio ponderado
por la probabilidad de cada mecanismo listado**. Con los cuatro mecanismos habituales de los
documentos tipo (media aritmética, media geométrica con presupuesto oficial, media aritmética alta,
menor valor) y sorteo uniforme:

```
λ = 0,25 · 0,15 · 3  +  0,25 · 0,40  =  0,21
```

**`λ = 0,21` es el valor por defecto** y el que usan los dos casos del §6. `λ = 0,15` solo si el
pliego fija un método central único; `λ = 0,40` si fija menor valor. Los mecanismos listados y su
número **se leen del pliego**: si son tres y uno es menor valor, `λ = (2·0,15 + 0,40)/3 = 0,23`.

**`E[Z_(n−1)]`** = esperanza del **máximo de `n−1`** normales estándar (los competidores frente a los
que hay que quedar más bajo). Valores correctos, en esta notación y no en otra:

| `n` (oferentes) | 3 | 5 | 6 | 8 | 12 |
|---|---|---|---|---|---|
| `E[Z_(n−1)]` | **0,56** | **1,03** | **1,16** | **1,35** | **1,59** |

*(Si en algún punto se quisiera usar el máximo de `n` en vez de `n−1`, el símbolo debe cambiar a
`E[Z_(n)]` y los valores son 0,85 / 1,16 / 1,27 / 1,42 / 1,63. Lo que no puede haber es una tabla que
mezcle las dos convenciones: la diferencia en `n=3` es un factor 1,5 sobre `MG`.)*

**Doctrina de «sin dato»:** si `competenciaDe()` devuelve `nivel = "sin_dato"`, **no hay `n`**. La
regla implementable **hoy** es usar el corte superior de tertiles del índice —`cortes.media_hasta` de
`indice:competencia:meta`, que sí se publica [VERIFICADO en `lib/indice_competencia.js:379`]— como
cota conservadora de `n`, y marcar la prima como estimada. Una mediana global de oferentes sería
mejor, pero **no existe todavía en el índice** (ver «Vacíos»). Asumir poca competencia porque no se
sabe es exactamente el error que la corrección existe para evitar.

---

### 5. Los indicadores

```
U_esperada = I_total − C_directo_real − C_indirecto − C_garantías − C_impuestos
                    − C_financiero − C_oculto − PR − MG(n)

m_neto     = U_esperada / V
```

**`U_esperada`, `m_neto`, `ROIC` y `VEG` son ANTES de impuesto de renta.** `C_impuestos` cubre solo
ICA, estampillas y contribución de obra pública: la renta va después y por fuera, porque depende de
**quién firme** y del resto de la declaración, no del contrato.

| Indicador | Fórmula | Interpretación |
|---|---|---|
| **Margen neto esperado** | `U_esperada / V` | Objetivo mínimo: **≥ 3 % antes de renta** (≈ 1,95 % después, a tarifa SAS) |
| **Margen de contribución** | `MC% = (I_total − C_variables) / I_total`, con `C_variables = C_directo_real + C_impuestos + C_oculto` | Cuánto deja cada peso facturado antes de pagar la estructura. Típico **15–25 %** |
| **Costos fijos del contrato** | `C_fijos = C_indirecto + C_garantías + C_financiero + PR + MG(n)` | **Una sola definición**, la misma en todos los casos. Cumple `U_esperada = MC% · I_total − C_fijos` por construcción |
| **Punto de equilibrio** | `PE_valor = C_fijos / MC%`; `PE_%ejec = PE_valor / V` | % de ejecución a partir del cual el contrato deja de destruir valor, **suponiendo que los fijos se causan completos**. Si `PE_valor > V`, el contrato **no tiene equilibrio alcanzable** |
| **Capital de trabajo máximo** | `K_max = max_t ( −K_t )` | **El número que decide si la empresa puede o no.** Se compara contra caja disponible + cupo de crédito, no contra la utilidad |
| **ROIC del contrato** | `U_esperada / K_max`, anualizado: `(1 + ROIC)^(12/(T+L)) − 1` | Rentabilidad del capital **efectivamente inmovilizado**. Se compara contra **`r_e`**, no contra `i_EA` (ver abajo) |
| **Payback** | primer `t` con `K_t ≥ 0` | En obra pública suele ser `T + L`, no `T`: la retegarantía es lo que devuelve el capital |
| **VEG** | `VEG = P(ganar) · U_esperada − C_preparación` | **Valor esperado de la ganancia**. Es el único indicador que descuenta el costo de no ganar |
| **Utilidad después de renta** | `U_neta = U_esperada · (1 − t_renta)`; `VEG_neto = VEG · (1 − t_renta)` | `t_renta` = **35 %** para SAS (tarifa general) o la **tarifa marginal de la tabla de personas naturales** (hasta 39 %) para Helder [CONOCIDO — confirmar tarifas vigentes 2026]. `C_preparación` es deducible, por eso escala todo el `VEG` |

**Dos tasas distintas que no se pueden confundir.** `i_EA` es el **costo de la deuda de capital de
trabajo** (cotización bancaria o de factoring) y ya está descontado dentro de `U_esperada` vía
`C_financiero`. `r_e` es el **retorno exigido al patrimonio propio**: un parámetro del dueño, no un
precio de mercado. Como `U_esperada` viene **neta de `C_financiero`**, el `ROIC` es un retorno
**después de deuda** y compararlo con `i_EA` **cobra el mismo capital dos veces**. La comparación
correcta es `ROIC` (después de renta, si se quiere ser estricto) **contra `r_e`**.

#### `C_preparación`: el costo que se paga siempre

| Componente | Rango (contrato 500–3.000 M) |
|---|---|
| Póliza de seriedad — **10 % del valor de la OFERTA** (art. 2.2.1.2.3.1.9 D. 1082/2015; el 10 % del **presupuesto oficial estimado** es la regla especial de **subasta inversa y concurso de méritos**, no la de licitación de obra) [CONOCIDO], ~3–4 meses de vigencia | 0,8 – 2,0 M |
| Tiempo técnico: análisis del pliego, APU, presupuesto, programación (40–100 h prof.) | 2,5 – 6,0 M |
| Documentos: RUP actualizado, certificados, cámara, notaría, copias | 0,3 – 0,8 M |
| Visita al sitio (según distancia) | 0,3 – 1,5 M |
| Revisión jurídica / observaciones al pliego | 0,5 – 2,0 M |
| **Total** | **4,5 – 10 M** ≈ **0,4 – 0,9 % del valor** |

`C_preparación` se pierde **cada vez que no se gana**. De ahí la regla dura:

```
Presentarse solo si   P(ganar) · U_esperada  >  C_preparación
```

Con `U_esperada = 36 M` y `C_preparación = 4,5 M`, hace falta `P(ganar) > 12,5 %` → **`n` menor que
~8 oferentes**. Presentarse a todo no es «aumentar las opciones»: es multiplicar un costo cierto por
una utilidad esperada que puede ser negativa. **Como `C_preparación` es casi independiente del
tamaño del contrato, perseguir contratos pequeños destruye valor por construcción.**

#### El indicador único de decisión (lo que la app necesita para rankear)

**Orden primario: `VEG` en pesos.** No margen. Razón: la restricción que realmente ata al dueño es
**cuántas ofertas puede preparar al mes**, y cada una cuesta aproximadamente lo mismo. Bajo esa
restricción, el objetivo es maximizar el valor esperado por oferta preparada, que es exactamente
`VEG`. Como la renta escala `VEG` proporcionalmente, **el orden es el mismo antes y después de
renta** — lo que sí cambia con la renta son los **umbrales** (`m_neto ≥ 3 %`, `ROIC ≥ r_e`) y la
elección de **qué perfil firma**.

Por qué **no** ordenar por margen, con números: un contrato de **200 M al 6 % de margen con 12
oferentes** da `VEG = (1/12)·12 M − 4,0 M = **−3,0 M**`. Uno de **1.200 M al 3,0 % con 3 oferentes**
da `VEG = (1/3)·36,0 M − 4,5 M = **+7,5 M**`. El margen ordena al revés que el dinero. El margen
ignora las cuatro cosas que deciden: `P(ganar)`, el tamaño, la intensidad de capital y el costo de
preparar.

**Filtros duros (antes del orden, nunca como penalización suave):**
1. `U_esperada ≤ 0` → fuera.
2. `K_max > caja disponible + cupo de crédito` → fuera. Ganar sin poder ejecutar es peor que perder.
3. `V` o `estabilidad` por encima del **cupo de afianzamiento** disponible → fuera.
4. Municipio en la lista de exclusión por seguridad → fuera.

**Desempate en periodos de capital escaso:** `Score = VEG / (K_max · (T+L)/12)` — pesos de valor
esperado por peso-año de capital inmovilizado. Solo se usa cuando el capital, y no el tiempo del
dueño, es el recurso escaso.

---

### 6. Ejemplo numérico completo

**Caso A (el que describe el encargo).** Placa huella, `V` = **1.200,0 M COP**, `T` = 8 meses,
municipio de 6ª categoría a **180 km** de la capital, anticipo **30 %**, **6 oferentes** esperados,
**sin fórmula de reajuste**. Cifras en millones de COP. **Todo antes de impuesto de renta.**

**Supuestos marcados:** AIU declarado 40 % (A 28 / I 5 / U 7 sobre CD) → `CD_presupuestado` = 857,1.
APU **ya regionalizado** (`F_región` = 1.00). `δ_desperdicio` = 3 %, `δ_rendimiento` = 0 %
(equipo propio, MO local ya presupuestada). `DSO` = 60 días. `i_EA` = 20 % → `i_mensual` = 1,531 %.
`τ_costo` = 7,2 % (ICA 0,7 % + estampillas 1,5 % + contribución 5 %). `τ_caja` = 44,2 %
(τ_costo + retefuente 2 % + retegarantía 5 % + amortización 30 %; circuito de IVA tratado como
neutro, §3.4). `L` = 3 meses. `λ` = 0,21 (método sorteado).

**Indirecto real, construido de abajo hacia arriba (no como % del CD):**

| Concepto | Cálculo | Total |
|---|---|---|
| Director/gerente (el dueño), 20 % | 3,0 /mes × 8 | 24,0 |
| Residente de obra, 100 % | 5,5 /mes × 8 | 44,0 |
| Profesional polivalente SST/ambiental/social, 40 % | 2,5 /mes × 8 | 20,0 |
| Topografía por eventos | global | 9,0 |
| Auxiliar administrativo/almacén, 40 % | 1,4 /mes × 8 | 11,2 |
| Campamento, bodega, cerramiento, señalización | global | 9,5 |
| Vehículo, combustible, viáticos (180 km) | 2,0 /mes × 8 | 16,0 |
| Ensayos de laboratorio | global | 10,5 |
| Servicios provisionales, comunicaciones, papelería | global | 3,3 |
| Movilización / desmovilización de equipo | global | 7,5 |
| **`C_indirecto`** | | **155,0** |

**Programa de obra y flujo de caja mensual.** Los `Δs` de abajo salen de un programa **asimétrico**
(arranque lento *y* cierre largo): acumulan **45 % al mes 4**, no el 50 % que impone cualquier
logística simétrica con cualquier `a`. Es lo normal en obra pública municipal y es coherente con la
recomendación de arranque lento del §2.

| Mes | Δs | Acta bruta | Acta neta (55,8 %) | Ingreso de caja | Egreso | Flujo | **Acumulado `K_t`** |
|---|---|---|---|---|---|---|---|
| 1 | 5 % | 60,0 | 33,5 | **360,0** (anticipo) | 95,4 | +264,6 | **+264,6** |
| 2 | 10 % | 120,0 | 67,0 | 0 | 107,2 | −107,2 | +157,4 |
| 3 | 14 % | 168,0 | 93,7 | 33,5 | 142,6 | −109,1 | +48,3 |
| 4 | 16 % | 192,0 | 107,1 | 67,0 | 160,2 | −93,2 | **−45,0** |
| 5 | 17 % | 204,0 | 113,8 | 93,7 | 169,0 | −75,3 | −120,3 |
| 6 | 15 % | 180,0 | 100,4 | 107,1 | 151,4 | −44,3 | −164,5 |
| 7 | 13 % | 156,0 | 87,1 | 113,8 | 133,7 | −19,9 | −184,4 |
| 8 | 10 % | 120,0 | 67,0 | 100,4 | 115,1 | −14,7 | **−199,1** ← pico |
| 9 | — | — | — | 87,1 | 0 | +87,1 | −112,0 |
| 10 | — | — | — | 67,0 | 0 | +67,0 | −45,1 |
| 11 | — | — | — | 60,0 (retegarantía) | 0 | +60,0 | **+14,9** |

*(El acumulado final de +14,9 más los 24,0 de retefuente recuperables en la declaración de renta
reconstruyen **38,9 = la utilidad antes de costo financiero (43,2) menos la adición esperada (4,3)**,
que es utilidad económica pero no entra en el flujo de caja del contrato.)*

**Estado de resultados esperado — Caso A, en los dos escenarios de la contribución del 5 %:**

| Concepto | **Con contribución** (τ_costo 7,2 %) | **Sin contribución** (excepción vías terciarias, τ_costo 2,2 %) |
|---|---|---|
| `V` | 1.200,0 | 1.200,0 |
| + adición esperada neta (`a` = 4,5 %, `mc_adición` = 8 %) | +4,3 | +4,3 |
| `R_reajuste` (sin fórmula) | 0,0 | 0,0 |
| **`I_total`** | **1.204,3** | **1.204,3** |
| − `C_directo_real` = 857,1 × 1,03 | −882,8 | −882,8 |
| − `C_indirecto` | −155,0 | −155,0 |
| − `C_garantías` + fiducia del anticipo | −26,9 | −26,9 |
| − `C_impuestos` (τ_costo × `V`) | **−86,4** | **−26,4** |
| − `C_oculto` | −10,0 | −10,0 |
| − `C_financiero` (Σ exposición × 1,531 %) | −13,3 | −13,3 |
| **Utilidad esperada ANTES de riesgo** | **+29,9 (2,49 %)** | **+89,9 (7,49 %)** |
| − `PR` = 2,32 % base + redes urbanas 0,20→0,35 (+0,23 pp) = **2,55 %** | −30,6 | −30,6 |
| − `MG(6)` = 0,21 × 8 % × 1,16 × 882,8 | −17,3 | −17,3 |
| **`U_esperada` (antes de renta)** | **−18,0 (−1,50 %)** | **+42,0 (+3,50 %)** |

| Indicador | Con contribución | Sin contribución |
|---|---|---|
| `K_max` | **199,1 M** (mes 8) = 16,6 % de `V` | ≈ 186 M (τ_caja baja 5 pp) |
| ROIC antes de riesgo | 29,9/199,1 = 15,0 % en 11 meses → **16,4 % E.A.** | 89,9/186 = 48,3 % en 11 m → **54,4 % E.A.** |
| ROIC ajustado por riesgo, antes de renta | negativo | 42,0/186 = 22,6 % en 11 m → **24,9 % E.A.** |
| Payback | mes **11** | mes **11** |
| `P(ganar)` ≈ 1/6 | 16,7 % | 16,7 % |
| `C_preparación` (180 km) | 5,5 M | 5,5 M |
| **`VEG` antes de renta** | (1/6)(−18,0) − 5,5 = **−8,5 M** | (1/6)(42,0) − 5,5 = **+1,5 M** |
| **`VEG` después de renta (SAS, 35 %)** | **−5,5 M** | **+1,0 M** |
| `C_fijos` = 155,0+26,9+13,3+30,6+17,3 | 243,1 | 243,1 |
| `MC%` | 18,69 % | 23,68 % |
| Punto de equilibrio | 243,1/0,1869 = **1.300,6 M > `V` → no alcanzable** (108,4 % de ejecución) | 243,1/0,2368 = **1.026,6 M = 85,6 % de ejecución** |
| **Veredicto** | **NO PRESENTARSE** | **MARGINAL** — solo con la excepción confirmada por escrito y `C_preparación` contenida |

**Lecturas del caso A.**
1. El anticipo del 30 % **no evita** el pico de caja: lo **desplaza al mes 8**, porque desde el mes 3
   cada acta llega recortada 44,2 %. El anticipo compra tres meses de arranque, no el contrato.
2. La carga tributaria territorial con contribución (86,4 M) es **1,4 veces la utilidad declarada del
   AIU** (60,0 M = 7 % del CD): un AIU armado sin ella pierde el contrato antes de firmarlo.
3. **La casilla que decide es jurídica, no técnica.** Los 60,0 M de la contribución son **el doble de
   la utilidad antes de riesgo del escenario con contribución** (29,9 M). Si la placa huella califica
   como vía terciaria y la excepción aplica, el veredicto pasa de «no presentarse» a «marginal». **No
   se oferta hasta resolver esa pregunta**, y se resuelve leyendo el pliego (clasificación de la vía)
   y el texto vigente del art. 6 de la Ley 1106/2006 — no estimándola.
4. Aun en el escenario favorable, `VEG` después de renta es +1,0 M: **el contrato no paga el riesgo
   de ejecución de una obra a 180 km**. La distancia y los seis oferentes hacen el resto.

**Caso B — mismo objeto, mismo valor, mismo plazo, tres condiciones distintas.** Municipio a **60 km**,
anticipo **50 %**, **3 oferentes**, con fórmula de reajuste. Mecanismo explícito de las diferencias
—sin números sueltos—:

| Diferencia | Mecanismo | Efecto |
|---|---|---|
| 60 km en vez de 180 | Menor flete de materiales dentro del APU: `CD_presupuestado` regionalizado a 60 km = **840,0** (vs. 857,1). `δ_desperdicio` sigue en 3 % — **el desperdicio no es función de la distancia** | `C_directo_real` = 840,0 × 1,03 = **865,1** |
| 60 km en vez de 180 | Vehículo, combustible y viáticos: 0,56 /mes en vez de 2,0 /mes × 8 meses | `C_indirecto` = 155,0 − 11,5 = **143,5** |
| Anticipo 50 % en vez de 30 % | Más caja en `t=1`, pero `β` sube a 50 % y las actas llegan más recortadas | `K_max` = **114,7**; `C_financiero` = **4,0** |
| Fórmula de reajuste | Elimina el riesgo «sobrecosto de acero/cemento sin reajuste» (−0,30 pp) del `PR` base de 2,32 % | `PR` = **2,02 %** = 24,2 M |
| 3 oferentes en vez de 6 | `E[Z_(2)]` = 0,56 en vez de `E[Z_(5)]` = 1,16 | `MG(3)` = 0,21 × 8 % × 0,56 × 865,1 = **8,2** |

*(Se mantiene `τ_costo` = 7,2 % **con contribución** para que la comparación aísle distancia, anticipo
y competencia. Si al Caso B también le aplicara la excepción de vías terciarias, su utilidad sube
otros 60,0 M.)*

| Concepto | Caso A (con contribución) | Caso B |
|---|---|---|
| `I_total` | 1.204,3 | 1.204,3 |
| Utilidad antes de riesgo | 29,9 (2,49 %) | **68,4 (5,70 %)** |
| `PR` + `MG(n)` | 30,6 + 17,3 = 47,9 | 24,2 + 8,2 = **32,4** |
| **`U_esperada` (antes de renta)** | **−18,0 (−1,50 %)** | **+36,0 (+3,00 %)** |
| `U_neta` después de renta (SAS 35 %) | — | **+23,4 (+1,95 %)** |
| `K_max` | 199,1 | **114,7** |
| ROIC ajustado, antes de renta | negativo | 36,0/114,7 = 31,4 % en 11 m → **34,7 % E.A.** |
| ROIC ajustado, después de renta | negativo | **22,5 % E.A.** |
| Payback | 11 meses | 11 meses |
| `P(ganar)` | 16,7 % | 33,3 % |
| `C_preparación` | 5,5 | 4,5 |
| **`VEG` antes de renta** | **−8,5 M** | **+7,5 M** |
| **`VEG` después de renta** | −5,5 M | **+4,9 M** |
| `MC%` | 18,69 % | 20,16 % |
| `C_fijos` | 243,1 | 143,5+26,9+4,0+24,2+8,2 = **206,8** |
| Punto de equilibrio | 1.300,6 M → **no alcanzable** | 206,8/0,2016 = 1.025,8 M = **85,5 % de ejecución** |
| **Veredicto** | **NO** | **SÍ, con vigilancia de caja** |

El mismo objeto, el mismo valor y el mismo plazo: **la distancia, el anticipo y el número de
oferentes mueven el resultado 54 M COP y le cambian el signo.** Eso es, literalmente, lo que la app
tiene que ordenar. Y el punto de equilibrio del Caso B dice lo que el margen no dice: **por debajo
del 85,5 % de ejecución el contrato destruye valor**, así que una terminación anticipada o una
liquidación parcial no es «menos utilidad», es pérdida.

---

### 7. Tabla maestra de variables

| Nombre | Símbolo | Definición | Unidad | Fuente de datos | Rango típico (obra civil CO) | Cómo degradar si falta |
|---|---|---|---|---|---|---|
| Valor del contrato | `V` | Valor de la oferta adjudicada | COP | `precio_base` × factor de descuento | 200 M – 20.000 M | Usar `precio_base`; si es 0 → **excluir** (ya se hace en los destacados) |
| Presupuesto oficial | `PO` | Techo del pliego | COP | `precio_base` [VERIFICADO en proyección] | — | Si `PO` = 0, no evaluable |
| Plazo | `T` | Meses de ejecución | meses | `plazoMesesDe()` [VERIFICADO] | 3 – 24 | Default 12 meses (ya implementado) |
| Cola de cobro | `L` | Meses hasta liquidación | meses | Histórico de la entidad | 2 – 6 | Asumir 3 y marcar |
| Curva de avance | `s(τ)`, `a` | Facturación acumulada | % | Programa de obra | `a` ∈ [1.4, 2.5]; **obra pública municipal 2.0–2.3** | `a` = 2.0; si el programa es asimétrico, Beta(p,q) |
| Adición esperada | `a_adición` | `p_adición · m_adición` | fracción | Histórico por entidad | 0.02 – 0.15 | **0** (conservador) |
| Margen de la adición | `mc_adición` | Margen de contribución de lo adicionado | fracción | Obras propias | 0.05 – 0.12 | 0.08 y marcar |
| Reajuste | `R_reajuste` | Ingreso por fórmula de reajuste | COP | Pliego + **ICOCIV** del DANE (reemplazó al ICCP desde 2022) | 0 – 6 % de `V` | **0** y subir `PR` en 0,3 pp |
| Costo directo presupuestado | `C_directo` | `Σ q_i·PU_i` del APU | COP | **Parte 1 (APU)** | 60–80 % de `V` | `V/(1+AIU)` con AIU regional del pliego |
| Exceso de desperdicio | `δ_desperdicio` | Real menos presupuestado. **No es función de la distancia** | fracción | Bitácora de obras propias | 0.02 – 0.08 | 0.04 |
| Pérdida de rendimiento | `δ_rendimiento` | MO local, lluvia ordinaria, aprendizaje | fracción | Bitácora | 0.00 – 0.10 | 0.04 |
| Factor región | `F_región` | Penalización **residual** si el APU no se regionalizó | factor | §2.B, distancia y vía | 1.00 – 1.18 | 1.00 **solo si el APU está regionalizado** |
| Costo indirecto | `C_indirecto` | Personal + fijos de obra, función del **plazo** | COP | Bottom-up con dedicaciones | 10–20 % de `V` | `A%·C_directo`, `A%` = 20 %, y **marcar como estimado** |
| Garantías | `C_garantías` | Primas + fiducia + expedición | COP | Cotización de la aseguradora | 1,5 – 2,5 % de `V` | 2,0 % de `V` |
| Cupo de afianzamiento | — | Capacidad de emitir pólizas | COP | **Dato del dueño** | — | Si se desconoce: **advertencia dura**, es la restricción binding |
| Carga tributaria territorial | `τ_costo` | ICA + estampillas + contribución 5 % | fracción | Acuerdo municipal / ordenanza + **clasificación de la vía** (excepción de terciarias) | 0.03 – 0.12 | 0.07 y marcar; **0.02 si se confirma la excepción** |
| IVA facturado | `τ_IVA_facturado` | 19 % sobre el **AIU**, no sobre `V` (D. 1372/1992 art. 3) | fracción de `V` | AIU del pliego | 0.03 – 0.08 | Calcular desde el AIU declarado |
| Retención de IVA | `τ_reteIVA` | 15 % del IVA facturado | fracción de `V` | Minuta | 0.005 – 0.012 | Va **junto** con `τ_IVA_facturado` o no va |
| Descuento neto de acta | `τ_caja` | `τ_costo`+retefuente+retegarantía+`β`+`τ_reteIVA`−`τ_IVA_facturado` | fracción | Pliego + minuta | 0.35 – 0.50 | 0.44 |
| Anticipo | `α` | % de `V` pagado al inicio | fracción | **`anticipo_pct` = 0 significa SIN DATO** [VERIFICADO en CLAUDE.md] | 0 – 0.50 (tope legal) | **Dos escenarios: 0 % y 30 %**, mostrar ambos |
| Amortización | `β` | % de cada acta que amortiza el anticipo | fracción | Minuta | = `α` | `β = α` |
| Días de cobro | `DSO` | Días entre acta y pago | días | Histórico de la entidad | 45 – 150 | 60 días y marcar |
| Costo de la deuda | `i_EA` | Costo del capital de trabajo (banco/factoring) | % E.A. | Cotización bancaria | 16 – 30 % | 20 % [INCIERTO para 2026] |
| Retorno exigido al patrimonio | `r_e` | Hurdle del capital **propio**. **No es `i_EA`** | % E.A. | **Parámetro del dueño**, no de mercado | — | Preguntar; sin dato, no emitir la lectura de ROIC |
| Caja acumulada | `K_t` | `Σ(Ingresos − Egresos)`; **negativo = capital expuesto** | COP | Derivado | — | — |
| **Capital máximo** | `K_max` | `max(−K_t)` | COP | Derivado | 8 – 30 % de `V` | — |
| Costo financiero | `C_financiero` | `Σ max(0,−K_t)·i_mensual` | COP | Derivado | 0,5 – 3 % de `V` | — |
| Costos ocultos | `C_oculto` | Seguridad, social, MO local, pérdidas | COP | §2.A punto 6 | 0,5 – 3 % de `V` | 1,0 % de `V` |
| Probabilidad de riesgo | `p_k` | Del registro de riesgos | fracción | Histórico + IDEAM + pliego | ver §4 | Tabla por defecto de §4 |
| Impacto de riesgo | `c_k` | Costo si ocurre, **neto de lo reclamable** | % de `V` | ídem | ver §4 | ídem |
| Tasa de reconocimiento | `p_reconocimiento` | Fracción de la mayor permanencia que la entidad reconoce | fracción | Histórico propio de reclamaciones | 0.2 – 0.6 | 0.40 y marcar como supuesto |
| **Prima de riesgo** | `PR` | `Σ p_k·c_k` | COP | Derivado | 2 – 4 % de `V` | 2,32 % de `V` (tabla §4) |
| Nº de oferentes | `n` | Esperado en esa entidad | conteo | `competenciaDe().promedio_oferentes` [VERIFICADO] | 2 – 20 | Si `nivel = "sin_dato"`: **`cortes.media_hasta` de `indice:competencia:meta`**, jamás asumir `n` bajo |
| Error del APU | `σ_est` | Desviación relativa del costo estimado | fracción | Calibración contra obras propias | 0.05 – 0.15 | 0.08 |
| Peso de la maldición | `λ` | Fracción de varianza común, **ponderada por el sorteo del método** | fracción | Mecanismos listados en el pliego | 0.10–0.20 central; 0.30–0.50 menor valor | **0.21** (cuatro mecanismos, sorteo uniforme) |
| Estadístico de orden | `E[Z_(n−1)]` | Esperanza del **máximo de `n−1`** normales estándar | — | Tabla §4 | 0 – 1.9 | Tabla §4 |
| Maldición del ganador | `MG(n)` | `λ·σ_est·E[Z_(n−1)]·C_directo_real` | COP | Derivado | 0,5 – 4 % de `V` | — |
| Probabilidad de ganar | `P(ganar)` | Prob. de adjudicación | fracción | `≈ 1/n`, ajustado por ajuste al pliego | 0.05 – 0.50 | `1/n` con el `n` conservador de arriba |
| Costo de preparar | `C_preparación` | Seriedad (10 % del valor de la **oferta**) + tiempo + documentos + visita | COP | Bottom-up | 4,5 – 10 M (0,4–0,9 % de `V`) | 5,0 M |
| **Utilidad esperada** | `U_esperada` | Ver §5. **ANTES de renta** | COP | Derivado | −5 % a +8 % de `V` | — |
| Tarifa de renta | `t_renta` | 35 % SAS; tabla progresiva persona natural | fracción | Estatuto Tributario [CONOCIDO, confirmar 2026] | 0 – 0.39 | 0.35 y marcar |
| Utilidad después de renta | `U_neta` | `U_esperada · (1 − t_renta)` | COP | Derivado | — | — |
| Margen neto | `m_neto` | `U_esperada/V` (antes de renta) | % | Derivado | 0 – 6 % | — |
| Margen de contribución | `MC%` | `(I_total−C_variables)/I_total` | % | Derivado | 15 – 25 % | — |
| Costos fijos del contrato | `C_fijos` | `C_indirecto+C_garantías+C_financiero+PR+MG(n)` | COP | Derivado | 15 – 25 % de `V` | — |
| Punto de equilibrio | `PE` | `C_fijos/MC%`; `> V` = no alcanzable | COP y % | Derivado | 60 – 90 % de ejecución | — |
| ROIC | — | `U_esperada/K_max`, anualizado. **Se compara con `r_e`, no con `i_EA`** | % E.A. | Derivado | −∞ a 60 % | — |
| Payback | — | Primer `t` con `K_t ≥ 0` | meses | Derivado | `T+L` | — |
| **Valor esperado de la ganancia** | `VEG` | `P(ganar)·U_esperada − C_preparación` (antes de renta) | COP | Derivado | −10 a +40 M | — |
| Score de orden | — | `VEG` (primario); `VEG/(K_max·(T+L)/12)` (desempate) | COP / % | Derivado | — | — |

---

### 8. Análisis de sensibilidad

Variación de ±10 % sobre el **caso B** (`U_esperada` = 36,0 M; `VEG` = 7,5 M; antes de renta):

| # | Variable | Δ ±10 % | Efecto sobre `U_esperada` | Elasticidad | Comentario |
|---|---|---|---|---|---|
| 1 | **`V` (precio de oferta)** | ±120,0 M ingreso, ∓8,6 M impuestos, ∓2,4 M `PR` | **±109,0 M → ±303 %** | 30,3 | La más potente y la **menos controlable**: subir el precio destruye `P(ganar)` |
| 2 | **`C_directo_real` (el APU)** | ±86,5 M | **∓86,5 M → ∓240 %** | 24,0 | La más grande **que sí se controla**. Un error del 4,2 % en el APU se lleva toda la utilidad |
| 3 | **`T` / plazo real** | +0,8 meses × 17,9 M/mes | **−14,4 M → −40 %** (solo al alza) | 4,0 | Asimétrica: alargarse cuesta, terminar antes casi no ahorra (el indirecto ya se causó) |
| 4 | **`C_indirecto`** | ±14,4 M | **∓14,4 M → ∓40 %** | 4,0 | Se controla con dedicaciones, no con «apretar el AIU» |
| 5 | **`τ_costo` (carga territorial)** | ±8,6 M | **∓8,6 M → ∓24 %** | 2,4 | **Incertidumbre pura, no aleatoriedad**: se elimina leyendo el acuerdo municipal |
| 6 | `PR` | ±2,4 M | ∓2,4 M → ∓6,7 % | 0,7 | Menos sensible de lo que se cree |
| 7 | `P(ganar)` (vía `n`) | ±0,033 | sobre `VEG`: ±1,2 M → **±16 %** | 1,6 | Solo mueve `VEG`, no `U_esperada` |
| 8 | `DSO` | ±6 días | ∓0,8 M → ∓2,2 % | 0,2 | Poco sobre la utilidad; **mucho sobre `K_max`** — el efecto está en la caja, no en el margen |

**Fuera de escala, y por eso no está en la tabla:** la **contribución del 5 %** no es una variación
del ±10 %, es un **interruptor binario** de 60,0 M sobre un contrato de 1.200 M — 1,7 veces la
`U_esperada` del Caso B. Ninguna variable continua del modelo compite con esa casilla. Resolverla es
lectura de pliego, no estimación.

**Dónde poner el esfuerzo de medición, en este orden:**

0. **La clasificación de la vía y la aplicabilidad de la contribución del 5 %.** Coste: leer el
   pliego. Beneficio: 5 % de `V`. No hay nada mejor en esta lista.
1. **`C_directo_real` (el APU).** Elasticidad 24,0 y es el único bloque grande bajo control propio.
   Es exactamente lo que la Parte 1 construye. Calibrar `δ_desperdicio` y `δ_rendimiento` contra
   obras ejecutadas propias vale más que cualquier refinamiento del resto del modelo.
2. **`τ_costo` por municipio.** Elasticidad 2,4, varía 3–12 pp entre territorios y es **dato
   público y estable**: una tabla municipal construida una vez sirve para siempre. Es la mejor
   relación esfuerzo/beneficio de toda la lista.
3. **`T` y `DSO` por entidad.** Salen del corpus histórico que la app ya guarda y nada purga. Con
   `T` real y `DSO` real, el riesgo asimétrico de plazo y el `K_max` dejan de ser suposiciones.
4. **`C_indirecto` por tipo de obra.** Una plantilla bottom-up de dedicaciones por rango de cuantía
   y plazo reemplaza el `A%` a ojo.
5. **`PR` y `p_reconocimiento`.** Elasticidad 0,7: es la que menos merece precisión. Basta la tabla
   por defecto de §4 y una bitácora que la vaya corrigiendo.

---

#### Vacíos y siguiente paso

| Vacío | Por qué importa | Cómo se cierra |
|---|---|---|
| **¿Aplica la excepción de vías terciarias a la placa huella?** | Vale **60,0 M COP = 2× la utilidad antes de riesgo del Caso A**; cambia el veredicto de signo | Texto vigente del art. 6 de la Ley 1106/2006 y sus modificaciones + concepto DIAN sobre vías terciarias + **clasificación de la vía en el pliego** (terciaria / secundaria / urbana) |
| **Cero fuentes externas verificadas** en esta sesión (WebSearch 200/200 agotado; `WebFetch` 403 en `suin-juriscol`, `wikisource`, `wikipedia`, y antes en `funcionpublica` y `colombiacompra`) | Toda la base normativa es [CONOCIDO] | Repetir con red; prioridad: art. 6 Ley 1106/2006 + par. art. 8 Ley 1738/2014, Ley 80 art. 40 par., D. 1082 tít. 2.2.1.2.3, Ley 1882/2018 art. 1, D. 1372/1992 art. 3 |
| Texto literal del tope de adición (50 % en SMMLV) y el concepto que lo interpreta | Fija el techo de `a_adición` y la distinción adición vs. mayores cantidades; el **radicado 1439 de 2002 está [INCIERTO]** | `funcionpublica.gov.co/eva/gestornormativo` → Ley 80/1993 art. 40; buscador de la Sala de Consulta y Servicio Civil en `consejodeestado.gov.co` |
| Número del concepto DIAN sobre base gravable de la contribución sin impuestos | Determina si la base es `V` o `V` con IVA — ~1 % de diferencia sobre la contribución | `normograma.dian.gov.co` → buscar «contribución especial obra pública base gravable» |
| **`mediana_global_oferentes` y `promedio_global_oferentes` no existen** en `indice:competencia:meta` [VERIFICADO en `lib/indice_competencia.js:374-388`: solo hay `entidades`, `clasificadas`, `cortes`, `por_nivel`, `nits_ambiguos`, `procesos_contados`, `filas_leidas`, `descartados`, `meses`] | La doctrina de «sin dato» del §4 **no era implementable** tal como estaba escrita | Publicarlos en `construirIndice()` sobre `clasificables` — el histograma por entidad ya está en memoria, **sin coste adicional de extracción**. Mientras tanto, la sección usa `cortes.media_hasta`, que sí se publica |
| `¿precio_base` es el presupuesto oficial? | `V` entero cuelga de ahí | `SELECT :id, precio_base, valor_total_adjudicacion WHERE adjudicado='Si' AND precio_base > 0 LIMIT 200` sobre `p6dx-8zbt`. Si el ratio adjudicado/base se agolpa en (0,85 – 1,00), es el PO. **[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]** — este entorno no alcanza `datos.gov.co` (CONNECT 403) |
| Columna real de nº de oferentes | Sin `n` no hay `P(ganar)`, ni `MG(n)`, ni orden | `SELECT :id, proveedores_unicos_con, conteo_de_respuestas_a_ofertas, respuestas_al_procedimiento WHERE adjudicado='Si' LIMIT 200`. Síntoma de que falta: `indice:competencia:meta` con `clasificadas: 0`. Se añade a `OFERENTES_CAMPOS` y se llama `/api/sync/historico?reconstruir_indice=true` — sin re-extraer |
| **Mecanismos de ponderación económica listados por cada pliego** | Determina `λ` (0,15 / 0,21 / 0,40) y con él `MG(n)`, que en el Caso A vale 17,3 M | Extraer del pliego los mecanismos y su número; si el corpus trae el pliego, tabularlo por entidad — el sorteo es uniforme, así que basta contarlos |
| Columnas de adición y de plazo real ejecutado | `a_adición`, `mc_adición`, `T_real` y el riesgo asimétrico de plazo | Explorar el dataset de contratos (no el de procesos) buscando valor final vs. valor inicial y fecha de terminación real vs. pactada |
| `anticipo_pct` = 0 significa «sin dato» [VERIFICADO en CLAUDE.md] | `α` mueve `K_max` decenas de millones | **No modelar un solo escenario.** Mostrar `K_max` con `α`=0 y con `α`=0,30 y decirlo en la tarjeta |
| Cupo de afianzamiento real de Helder y de Génesis | Es la restricción binding, por encima de la K de `lib/capacidad.js` | Preguntar al dueño: aseguradora, cupo aprobado, cupo comprometido, contragarantías exigidas |
| **`r_e`: retorno exigido al capital propio** | Es lo que decide si un ROIC de 22,5 % E.A. después de renta basta. **No es `i_EA`** y no sale de ninguna tabla de mercado | Preguntar al dueño. Sin `r_e`, la lectura «el ROIC no alcanza el costo de capital» **no se puede emitir** |
| `i_EA` y tasa de usura 2026 | Techo del costo financiero | Serie de tasas de colocación del Banco de la República + certificación mensual de la Superintendencia Financiera |
| Tarifas de ICA y estampillas por municipio | 3–12 pp de `V`, cambian el ranking territorial completo | Tabla propia por municipio desde acuerdos municipales; empezar por los ~20 municipios donde más publica el corpus |
| Tarifas de renta 2026: SAS (35 %) vs. tabla de persona natural (Helder) | **No altera el orden entre procesos** —la renta escala `VEG` proporcionalmente— **pero sí mueve el umbral de margen mínimo (`m_neto ≥ 3 %` antes de renta ≈ 1,95 % después) y la comparación `ROIC` vs. `r_e`**, y decide **qué perfil firma** | Estatuto Tributario vigente 2026 (art. 240 y tabla del art. 241) + situación tributaria real de cada figura. Ojo: la proporcionalidad se rompe con renta presuntiva, mínimos o pérdidas no compensables |
| Calibración de `σ_est`, `δ_desperdicio`, `δ_rendimiento` y `p_reconocimiento` | Son propios, no de mercado: nadie los puede publicar | Bitácora de obras ejecutadas (presupuestado vs. real por ítem) y de reclamaciones (pedido vs. reconocido). Es el único dato que **solo el dueño puede producir** y el de mayor elasticidad del modelo |


---

## 2.D — Imprevistos, desequilibrio economico y reclamaciones bajo la Ley 80

### 0. Estado de verificación de las fuentes

Convención de etiquetas de esta sección:

| Etiqueta | Qué significa exactamente |
|---|---|
| `[VERIFICADO-TEXTO]` | El **texto literal** de la norma fue confirmado por búsqueda web durante la revisión de esta sección y se transcribe entre comillas. La URL concreta no se reproduce porque esta pasada de redacción **no pudo reabrirla** (ver limitación abajo); lo que se garantiza es la literalidad de la cita, no el enlace |
| `[CONOCIDO]` | Norma o doctrina que domino y que no está confirmada literalmente hoy. Se indica cómo confirmarla |
| `[INCIERTO]` | Creo que existe, no estoy seguro del número o del alcance. Se indica qué buscar |

Limitación real del entorno, comprobada en esta corrida y no en abstracto: la política de egreso
responde `CONNECT 403` a `secretariasenado.gov.co`, `funcionpublica.gov.co`, `colaboracion.dnp.gov.co`,
`colombiacompra.gov.co` y también a los espejos `normograma.invima.gov.co`,
`gestornormativo.creg.gov.co`, `normograma.sena.edu.co` y `normas.cra.gov.co` (probados uno por uno).
El presupuesto de búsqueda web de la sesión está agotado. Consecuencia práctica: **las citas marcadas
`[VERIFICADO-TEXTO]` son literales y confiables; ninguna URL de esta tabla fue abierta en esta pasada
concreta.** Antes de usar el documento en un escrito jurídico, reabrir las cinco primeras filas.

| Fuente | Etiqueta | Qué se confirmó / cómo verificarla |
|---|---|---|
| Ley 80 de 1993, **art. 4 num. 3** | `[VERIFICADO-TEXTO]` | «Solicitarán la actualización o la revisión de los precios cuando se produzcan fenómenos que alteren **en su contra** el equilibrio económico o financiero del contrato» — el deber protege a la **entidad**, no al contratista |
| Ley 80 de 1993, **art. 5 num. 1** | `[VERIFICADO-TEXTO]` | Derecho del contratista a que se restablezca la ecuación «**a un punto de no pérdida**» por situaciones imprevistas no imputables a él, **previa solicitud** |
| Ley 80 de 1993, **art. 16 inc. 2** | `[VERIFICADO-TEXTO]` | «Si las modificaciones alteran el valor del contrato en un veinte por ciento (**20 %) o más** del valor inicial, el contratista podrá renunciar a la continuación de la ejecución» |
| Ley 80 de 1993, **art. 40, parágrafo** | `[VERIFICADO-TEXTO]` | «los contratos no podrán adicionarse en más del **cincuenta por ciento (50 %)** de su valor inicial, expresado éste en salarios mínimos legales mensuales». El mismo parágrafo regula anticipo y pago anticipado con tope del 50 % `[CONOCIDO]` en cuanto al tope del anticipo |
| **Conpes 3714 de 2011**, «Del riesgo previsible en el marco de la política de contratación pública» | `[VERIFICADO-TEXTO]` | Título, fecha (**1-dic-2011**) y autoría (**DNP + Ministerio de Hacienda**) confirmados |
| **CPACA (Ley 1437 de 2011) art. 164.2.j** | `[VERIFICADO-TEXTO]` | Caducidad del medio de control de controversias contractuales: **2 años**, con los cómputos del literal |
| Ley 80 de 1993, arts. 3, 14, 27, 28 | `[CONOCIDO]` | Espejos normativos (Secretaría del Senado, gestor normativo de Función Pública) |
| Ley 1150 de 2007, art. 4 (riesgos previsibles) | `[CONOCIDO]` | Misma base, `ley_1150_2007.html` |
| **Ley 2220 de 2022** — Estatuto de Conciliación (sustituye a la Ley 640 de 2001) | `[CONOCIDO]` en la regla; `[INCIERTO]` en el número de artículo | Confirmar el artículo que regula la suspensión de la caducidad y el plazo de 3 meses |
| Ley 1474 de 2011, **art. 91** (patrimonio autónomo para el anticipo) | `[CONOCIDO]` | Confirmar el listado exacto de contratos a los que aplica |
| Decreto 679 de 1994, **art. 1** (intereses de mora en contratos estatales) | `[INCIERTO]` en el artículo y en la fórmula vigente | Verificar si sigue vigente y cuál es la tasa: doble del interés legal civil sobre valor histórico actualizado |
| Decreto 1372 de 1992, art. 3 (base gravable del IVA = AIU/utilidad en construcción de inmueble), hoy compilado en el **DUR 1625 de 2016** | `[INCIERTO]` en el artículo del DUR | Estatuto tributario concordado + conceptos DIAN sobre AIU |
| Conpes 3107 y 3133 de 2001 (riesgo contractual en infraestructura) | `[CONOCIDO]` | Repositorio del DNP |
| Código Civil art. 64 (fuerza mayor) y C. de Comercio art. 868 (imprevisión) | `[CONOCIDO]` | Bases de la Secretaría del Senado |
| Jurisprudencia Sección Tercera del Consejo de Estado (punto de no pérdida; salvedades en actas; riesgo no cuantificable) | `[CONOCIDO]` como **doctrina**; **sin números de expediente porque no los puedo confirmar** | Buscador de jurisprudencia del Consejo de Estado, descriptores «equilibrio económico», «punto de no pérdida», «acta de liquidación sin salvedades», «álea extraordinaria» |

---

### 1. El principio: la ecuación contractual

El contrato estatal es **conmutativo**: las prestaciones de las partes se presumen equivalentes al
momento de proponer o de contratar. Esa equivalencia es la «ecuación contractual» y la ley obliga a
mantenerla durante toda la ejecución.

| Norma | Qué dice (síntesis) | Para qué sirve al contratista |
|---|---|---|
| Ley 80, **art. 27** | «En los contratos estatales se mantendrá la igualdad o equivalencia entre derechos y obligaciones surgidos al momento de proponer o de contratar»; si se rompe por causa **no imputable** al afectado, las partes adoptan las medidas de restablecimiento y suscriben los acuerdos sobre cuantía, forma de pago, **costos financieros e intereses** `[CONOCIDO]` | Es **la norma madre**. Toda reclamación se ancla aquí |
| Ley 80, **art. 5 num. 1** `[VERIFICADO-TEXTO]` | Derecho a que el **valor intrínseco** de la remuneración no se altere; y, **previa solicitud**, a que la administración restablezca la ecuación **a un punto de no pérdida** por situaciones imprevistas no imputables al contratista. El mismo numeral distingue el caso del **incumplimiento de la entidad**, en el que se restablece la ecuación surgida al nacimiento del contrato `[CONOCIDO]` en la literalidad de esta segunda frase | Contiene la expresión «punto de no pérdida» y el requisito de **solicitud previa**. Y es la base textual de que imprevisión ≠ incumplimiento |
| Ley 80, **art. 4 nums. 8 y 9** | Deberes de la entidad: adoptar medidas para mantener durante la ejecución **las condiciones técnicas, económicas y financieras existentes al momento de proponer**; y **no generar por causas imputables a ella una mayor onerosidad** al contratista `[CONOCIDO]` | Convierte el restablecimiento en un **deber de la entidad**, no en una gracia |
| Ley 80, **art. 14 num. 1** | Potestades excepcionales (interpretación, modificación, terminación unilaterales); al ejercerlas la entidad debe reconocer compensaciones e indemnizaciones **con el fin de mantener la ecuación o equilibrio inicial** `[CONOCIDO]` | Base del *ius variandi* con compensación |
| Ley 80, **art. 16 inc. 2** `[VERIFICADO-TEXTO]` | Modificación unilateral. Si la modificación **altera el valor del contrato en un 20 % o más** del valor inicial —por **supresión o por adición** de obras—, el contratista **podrá renunciar** a la continuación de la ejecución | Límite del ajuste que se le puede imponer |
| Ley 80, **art. 28** | Interpretación conforme a la buena fe y a «la igualdad y equilibrio entre prestaciones y derechos que caracteriza a los contratos conmutativos» `[CONOCIDO]` | Regla de interpretación, no derecho sustantivo autónomo |
| Ley 80, **art. 3** | Los particulares colaboran en los fines estatales «teniendo en cuenta… la obtención de **utilidades** cuya protección garantiza el Estado» `[CONOCIDO]` | Argumento de la utilidad, útil solo frente a **incumplimiento** |

**Precisión que evita un error frecuente.** El **art. 4 num. 3** se cita muy a menudo como apoyo del
contratista. **No lo es.** Su texto obliga a la entidad a pedir la revisión de precios cuando el
desequilibrio se produce **en contra de ella**. Invocarlo en un escrito de reclamación no suma:
delata que no se leyó la norma y le regala a la defensa una observación fácil. Los numerales que sí
sirven son el **8 y el 9**. Del mismo modo, el art. 28 se cita de más: la fuerza está en el 27
(equivalencia), el 5.1 (derecho subjetivo + punto de no pérdida) y el 4.8/4.9 (deberes de la entidad).

**Efecto de la renuncia del art. 16.** Renunciar no equivale a que le indemnicen. El efecto es que el
contrato **se liquida**; lo que se pague en esa liquidación depende de lo ejecutado, de lo salvado y
de lo que se pruebe. Renunciar sin salvedades cuantificadas es renunciar dos veces.

#### 1.bis Anticipo, pago anticipado y mora de la entidad

Son la palanca de equilibrio **financiero** más inmediata de una obra y se confunden a diario.

| Figura | Naturaleza | Consecuencias prácticas |
|---|---|---|
| **Anticipo** | Recurso que **sigue siendo de la entidad**. **No es ingreso** del contratista | Se **amortiza** contra actas parciales; cuando la ley lo exige se maneja en **patrimonio autónomo / fiducia** (Ley 1474/2011, art. 91 `[CONOCIDO]`); el contratista **no dispone libremente** de él y los rendimientos financieros **no le pertenecen**; se ampara con garantía de buen manejo |
| **Pago anticipado** | Pago **del precio**, propiedad del contratista desde que lo recibe. **Sí es ingreso** | Se causa contable y tributariamente; no se amortiza en sentido estricto, se imputa al precio |
| **Contrato sin anticipo** | El contratista financia la obra con capital propio o crédito | Ese **costo financiero tiene que estar dentro de la A del AIU**. Si no está, se ejecuta a pérdida desde el primer mes y ningún reclamo posterior lo recupera: era previsible y estaba en el pliego |

Tope: el **parágrafo del art. 40** de la Ley 80 fija que anticipo y pago anticipado **no pueden exceder
el 50 % del valor del contrato** `[CONOCIDO]`.

**Mora de la entidad.** El art. 27 menciona expresamente «costos financieros e intereses» como parte
del acuerdo de restablecimiento. La tasa aplicable a los pagos tardíos de entidades estatales se
regula, según entiendo, en el **Decreto 679 de 1994, art. 1**, con una fórmula del tipo *doble del
interés legal civil sobre el valor histórico actualizado* — **`[INCIERTO]`: no pude verificar hoy ni el
artículo, ni la fórmula, ni su vigencia actual**, y no la doy por buena. Antes de liquidar intereses
en una reclamación real hay que confirmarla; ponerla mal es de las cosas que un peritaje recorta sin
discusión. Lo que sí es seguro es que **hay que pedirlos expresamente**: no se reconocen de oficio.

---

### 2. Causales de ruptura del equilibrio

| Teoría | Origen del hecho | Requisitos | Ejemplo de obra civil | Alcance de la compensación |
|---|---|---|---|---|
| **Hecho del príncipe** | Acto **general y abstracto** de la **misma entidad** contratante (o del ente territorial al que pertenece) que encarece la ejecución | Acto lícito, general, ajeno al contrato, con impacto anormal y específico sobre él | **Ordenanza departamental o acuerdo municipal expedido por el mismo departamento/municipio que contrata**, que crea una estampilla o un gravamen y encarece el contrato ya firmado | **Indemnización integral** (daño emergente + lucro cesante) `[CONOCIDO]`; el Consejo de Estado exige que el acto provenga de la entidad contratante — si viene de **otra** autoridad, se reconduce a **imprevisión** |
| **Teoría de la imprevisión** | Hecho **externo** a las partes, **imprevisible** y **extraordinario**, que hace la ejecución **más onerosa sin impedirla** | Ajeno, posterior a la oferta, imprevisible al ofertar, altera gravemente la economía del contrato | Alza extraordinaria y no cíclica del acero o del asfalto; cierre de vía por emergencia declarada; efectos de una pandemia sobre rendimientos y logística. **También**: nueva norma sismo-resistente (NSR) o tributo nacional que encarece la obra — *norma de otra autoridad: no es hecho del príncipe, va por imprevisión y por tanto solo hasta el punto de no pérdida* | **Solo hasta el punto de no pérdida**: se cubre el **costo**, no la utilidad esperada |
| **Incumplimiento de la entidad** (*hecho de la administración*) | Conducta **propia** de la entidad en la relación contractual | Obligación exigible + inejecución o mora + daño | No entrega de predios; licencia ambiental o permiso de ocupación de cauce no tramitado; diseños con errores; mora en pagos; suspensiones sucesivas por falta de PMT o de recursos | **Indemnización plena**, incluida la **utilidad** dejada de percibir, si se prueba |

**Cuál se usa realmente en obra:** el **incumplimiento de la entidad**, con diferencia. Razones
prácticas: (1) es la única que devuelve utilidad; (2) la prueba es documental y está al alcance del
contratista (actas de suspensión, oficios, bitácora, comunicaciones de interventoría), mientras que
la imprevisión exige demostrar *imprevisibilidad* y *anormalidad* económica con peritaje; (3) en
Colombia la causa material de casi todo sobrecosto de obra pública es predial, ambiental, de redes
o de diseño — obligaciones que la entidad debía tener resueltas antes de licitar (en infraestructura
de transporte, la Ley 1682 de 2013 refuerza esos deberes `[CONOCIDO]`). El hecho del príncipe es
marginal y suele quedarse en el debate tributario.

---

### 3. Álea normal vs. imprevisto vs. imprevisión / fuerza mayor

| Categoría | Definición operativa | ¿Quién lo paga? | ¿Se reclama? |
|---|---|---|---|
| **Álea normal** | Variación ordinaria del negocio que un constructor diligente **debía prever y calcular**: rendimientos algo menores, lluvia esperable en la zona, inflación ordinaria, ajuste de cantidades dentro de tolerancia | El contratista, con su **utilidad** y su estructura de precios | **No** |
| **Imprevisto** | Evento **previsible en abstracto pero no cuantificable** al ofertar: rotura de una red no cartografiada, sobreexcavación puntual, retrabajo menor, demoras cortas | La **«I» del AIU**, hasta agotarse | **No**, mientras la I alcance |
| **Imprevisión** | Hecho externo **imprevisible y extraordinario** que rompe la economía del contrato sin impedir la ejecución | Se comparte: la entidad **restablece hasta el punto de no pérdida** | **Sí**, con carga probatoria alta |
| **Fuerza mayor / caso fortuito** | Imprevisto **al que no es posible resistir** (C.C. art. 64) — impide la ejecución | Exonera de responsabilidad; puede llevar a suspensión o terminación. **No es fuente automática de indemnización** | **Sí**, pero para exonerarse y liquidar, no para lucrar |

Nótese que la distinción entre las dos primeras filas y la tercera **no es de tipo de evento sino de
magnitud**: el mismo hecho (una sobreexcavación) es imprevisto si cabe en la I y es álea extraordinaria
si la desborda. Esa idea reaparece en §5 y es la que derrota la lectura simplista de la matriz de riesgos.

**El matiz que hay que entender bien:** la imprevisión **no restituye la utilidad esperada**. La
propia Ley 80 lo dice en el art. 5 num. 1 al hablar de «punto de no pérdida» `[VERIFICADO-TEXTO]`, y
esa es la línea constante de la Sección Tercera del Consejo de Estado `[CONOCIDO]` — la álea
extraordinaria se reparte, no se traslada íntegra a la entidad. Consecuencia comercial directa:

> **El margen se protege ANTES de firmar, no después.** Ganar una licitación con utilidad de 3 %
> confiando en «reclamar si algo pasa» es apostar a un mecanismo que, en el mejor de los casos,
> devuelve al 0 %, años después y en pesos nominales.

---

### 4. La «I» del AIU

Los tres rangos siguientes **no están medidos en esta sección**: son supuestos de trabajo del autor,
sin muestra, sin *n* y sin fuente citable. Se publican para que el modelo tenga un punto de partida
explícito y **para que se reemplacen** con la distribución real extraída del propio corpus (ver
«Vacíos»). No deben leerse como estadística.

| Componente | Rango de referencia — **SUPUESTO DEL AUTOR, sin muestra** | Observación |
|---|---|---|
| **A** — Administración | 15 % – 25 % | Depende de plazo, dispersión, exigencias de personal del pliego y de si hay o no anticipo |
| **I** — Imprevistos | 1 % – 5 % | El 3 % es el valor que con más frecuencia hemos visto citado; **no está medido aquí**. **No existe norma nacional que fije la I** `[CONOCIDO]` |
| **U** — Utilidad | 5 % – 10 % | En obra menor territorial se ve por debajo de 5 % por presión competitiva |

Tres advertencias que el modelo debe incorporar:

1. **Un I bajo puede debilitar la reclamación futura — pero solo si el I fue una decisión suya.**
   *Cuando el pliego permite al proponente fijar el AIU*, ofertar I = 1 % pudiendo ofertar 3 % es un
   **argumento previsible de la defensa de la entidad**: dirá que el contratista fijó él mismo cuánto
   imprevisto se comprometía a absorber. (No cito decisión concreta que respalde cómo lo lee el juez;
   trátese como riesgo argumental, no como regla.) *Cuando el AIU viene **fijado en el presupuesto
   oficial** —el caso más frecuente en obra pública colombiana, donde se compite por precio unitario
   o por baja global—, la I **no es una decisión del oferente** y el argumento no aplica*: lo que
   queda por hacer es **documentar el agotamiento de la I ofrecida**, que es prueba a favor.
2. **La naturaleza jurídica de la I está discutida.** Dos lecturas: (a) es un **ingreso** del
   contratista, que hace suyo el saldo no gastado; (b) es un **fondo afecto** a cubrir imprevistos,
   con eventual deber de justificación ante la entidad. La discusión tiene efectos **tributarios**
   (base gravable del IVA en construcción de inmueble, retenciones sobre AIU) y ha sido tratada por
   el Consejo de Estado y por la DIAN `[INCIERTO]` en cuanto a la sentencia y el concepto concretos.
   **No cito expediente porque no lo puedo confirmar.**
3. **La I no es un colchón contra el desequilibrio grave.** Cubre imprevistos, no imprevisión. Una
   vez agotada y **documentada su insuficiencia**, se abre la puerta al art. 27 — y ese agotamiento
   documentado es, de hecho, **un buen argumento** para probar que el hecho excedió el álea normal.

---

### 4.bis Mayores cantidades, ítems no previstos y adiciones

Por aquí se mueve la mayor parte del dinero «imprevisto» de una obra civil colombiana, y son tres
figuras distintas que se confunden todos los días.

| Figura | Qué es | Precio | Instrumento | Efecto en el valor del contrato |
|---|---|---|---|---|
| **Mayor cantidad de obra** | Ítem **ya contratado** cuya cantidad ejecutada supera la del contrato | Se paga al **precio unitario pactado**, sin renegociación | Acta de mayor cantidad / acta parcial | Puede o no aumentar el valor total; si lo aumenta, requiere adición y CDP |
| **Obra adicional / ítem no previsto** | Ítem **nuevo**, que no está en el listado contratado | **Precio nuevo**, que hay que construir con **APU** y pactar por escrito | **Acta de precios no previstos** firmada por entidad, interventoría y contratista, **ANTES de ejecutar** | Casi siempre exige adición en valor |
| **Adición en valor** | Aumento del valor del contrato, cualquiera sea su causa | — | Otrosí + CDP + ajuste de garantías | Sujeta al tope del **50 %** del art. 40 |

> **Regla operativa, sin excepciones:** ningún ítem no previsto se ejecuta sin **acta de precios
> nuevos firmada**. Ejecutarlo primero y cobrarlo después es la forma más común de perder plata
> teniendo toda la razón: la obra está hecha, la entidad no tiene precio pactado que pagar, y el
> contratista termina discutiendo un enriquecimiento sin causa en sede judicial, años después.
> Lo mismo vale para la mayor cantidad que dispara el valor: si no hay CDP y otrosí, no hay pago.

**Los dos techos, que no son el mismo y se citan intercambiados constantemente:**

| Techo | Norma | Qué limita | A quién protege |
|---|---|---|---|
| **20 % o más** | Ley 80, **art. 16 inc. 2** `[VERIFICADO-TEXTO]` | Modificación **UNILATERAL** de la entidad, por supresión o adición de obras | Al **contratista**: es su derecho a **renunciar** a continuar (con liquidación) |
| **50 % del valor inicial, expresado en SMMLV** | Ley 80, **art. 40, parágrafo** `[VERIFICADO-TEXTO]` | **Adición BILATERAL** en valor | A la **legalidad del gasto**: es un tope que la obra no puede rebasar por otrosí |

La expresión del tope **en salarios mínimos** importa: en contratos de varios años, convertir el valor
inicial a SMMLV del año de suscripción y compararlo en SMMLV del año de la adición cambia el margen
disponible frente a hacerlo en pesos nominales.

---

### 5. La matriz de riesgos del pliego (lo más importante de esta sección en la práctica)

La **Ley 1150 de 2007, art. 4** obliga a las entidades a incluir en los pliegos la **estimación,
tipificación y asignación de los riesgos previsibles** del contrato, y en licitación pública a
celebrar una **audiencia de asignación de riesgos** `[CONOCIDO]`. El **Conpes 3714 de 2011**,
«Del riesgo previsible en el marco de la política de contratación pública» (DNP + Ministerio de
Hacienda, 1-dic-2011) `[VERIFICADO-TEXTO]` es el documento de política que desarrolla el concepto;
antecedentes en los Conpes 3107 y 3133 de 2001 para infraestructura con participación privada
`[CONOCIDO]`. Colombia Compra Eficiente publica un manual de identificación y cobertura del riesgo
con una matriz tipo `[CONOCIDO]`.

Regla de negocio para Detecta:

> **Un riesgo tipificado y asignado al contratista cierra la reclamación DENTRO de la magnitud
> estimada en la matriz.** No la cierra si (a) el riesgo **no era cuantificable** al momento de
> contratar, o (b) el evento **excede en magnitud** lo tipificado, en cuyo caso vuelve a ser **álea
> extraordinaria** y se reconduce a **imprevisión** (punto de no pérdida).
>
> **Consecuencia práctica: la matriz de riesgos hay que leerla y CUANTIFICARLA, no solo mirar la
> columna `asignado_a`.**

Esa regla es coherente con la definición de «imprevisto» de §3 (previsible en abstracto pero **no
cuantificable** al ofertar): la sola aparición del riesgo en una tabla del pliego no lo vuelve
cuantificable. La línea del Consejo de Estado y la arbitral van en ese sentido `[CONOCIDO]` — **sin
números de expediente porque no puedo confirmarlos**. Lo que la matriz sí hace, y no es poco, es
trasladar la carga: quien firmó asumiendo el riesgo tiene que probar que el evento se salió de lo
estimado, y sin la cifra estimada esa prueba no se puede construir.

Campos mínimos a capturar del pliego (esquema de datos propuesto):

| Campo | Tipo | Origen |
|---|---|---|
| `riesgo_id`, `descripcion` | string | Matriz del pliego (anexo, usualmente Excel o tabla en PDF) |
| `tipo` | enum (`predial`, `ambiental`, `redes`, `diseno`, `cambio_precios`, `regulatorio`, `cambiario`, `orden_publico`, `fuerza_mayor`, `otro`) | Clasificación propia |
| `asignado_a` | enum (`entidad`, `contratista`, `compartido`) | Columna de asignación |
| **`magnitud_estimada`** | number \| range \| null | **Cifra o rango que el pliego asigna al riesgo** (en pesos, en % del valor, o en días). **Sin este campo la regla anterior no es aplicable**: `null` significa «tipificado pero no cuantificado», que es precisamente el escenario que reabre la reclamación |
| `probabilidad`, `impacto`, `valoracion` | int / string | Columnas de estimación |
| `tratamiento`, `momento` | string | Columnas de mitigación y fase |
| `reajuste_pactado` | bool | Cláusula de ajuste de precios (ver 2.B.2, §4.1) |
| `pct_predial_no_resuelto` | derivado | Señal roja: predios asignados al contratista |

Banderas rojas que deberían **penalizar el atractivo** del proceso: `cambio_precios` asignado al
contratista **sin** fórmula de reajuste; `predial`, `ambiental` o `redes` asignados al contratista;
riesgos asignados al contratista con `magnitud_estimada = null` en cantidad alta (matriz que asigna
sin estimar); matriz genérica de una página (indicio de que la entidad no estructuró y de que los
riesgos reales aparecerán en obra).

---

### 6. Procedimiento práctico de reclamación

| # | Paso | Momento | Nota crítica |
|---|---|---|---|
| 1 | **Constancia oportuna**: bitácora de obra, oficio a interventoría y a la entidad **el mismo día** del hecho | Al ocurrir | Sin rastro contemporáneo, el hecho «no existió» |
| 2 | **Cuantificación** con soportes: APU comparativo, facturas, rendimientos reales vs. programados, registro fotográfico | Días siguientes | La reclamación sin cuantificación técnica se cae sola |
| 3 | **Solicitud formal de restablecimiento** a la entidad (art. 5 num. 1: «previa solicitud») | Cuanto antes | Es requisito legal explícito, no formalismo |
| 4 | **Acta de suspensión / de reinicio**, prórroga, **adición** o modificación bilateral | Durante ejecución | Firmar suspensión sin dejar constancia de mayores costos de permanencia = renuncia |
| 5 | **Acta de liquidación bilateral CON SALVEDADES expresas y cuantificadas** | Al terminar | **El paso decisivo** |
| 6 | **Conciliación extrajudicial** ante la Procuraduría (requisito de procedibilidad) | Antes de demandar | **Ley 2220 de 2022** (ver recuadro) |
| 7 | **Medio de control de controversias contractuales** ante la jurisdicción de lo contencioso administrativo | **Caducidad: 2 años** (CPACA art. 164.2.j) `[VERIFICADO-TEXTO]` | Contados, según el caso, desde la firma del acta de liquidación bilateral, desde la ejecutoria de la liquidación unilateral, o desde el vencimiento del plazo para liquidar cuando no se liquidó |

#### Cómo se pone la cifra de la MAYOR PERMANENCIA EN OBRA (complemento del paso 2)

Es el rubro de reclamación más frecuente en obra pública colombiana y el que más se pierde por mal
cuantificado, no por infundado. Método:

```
Costo_mensual_permanencia =
      personal mínimo indispensable (director, residente, SISO, almacenista)
    + equipo propio o alquilado en stand-by (con soporte de contrato de alquiler o de depreciación)
    + campamento, servicios públicos, vigilancia
    + pólizas y garantías prorrateadas por el tiempo de extensión
    + costo financiero del capital inmovilizado (obra ejecutada no pagada + capital de trabajo)

Reclamación = Costo_mensual_permanencia × meses de extensión IMPUTABLES A LA ENTIDAD
```

Reglas de construcción de esa cifra:

- Los valores salen del **A del AIU OFERTADO** y de la **nómina y contratos reales** del período, no
  de un estimado. Cada línea con su soporte: contrato laboral, planilla de seguridad social, factura
  de alquiler, póliza, extracto de crédito.
- **Personal mínimo indispensable**, no la planta completa: durante una suspensión el juez y el
  perito esperan que el contratista haya **desmovilizado** lo desmovilizable. Mantener 40 personas
  paradas tres meses y cobrarlas todas es la ruta directa al recorte.
- **Los meses tienen que ser imputables a la entidad.** Si la extensión tiene causas mixtas, se
  reparte y se reclama solo la fracción atribuible; pedir el 100 % de un plazo compartido desacredita
  el resto de la reclamación.
- **Advertencia central:** reclamar «el **A completo** del contrato por el tiempo extendido» es el
  error que más recortes de peritaje produce. El A incluye costos que **no se causan** durante la
  suspensión (transporte de materiales, consumos de obra, parte de la administración central ya
  absorbida). Se reclama el A **efectivamente causado y probado**, no el A contractual prorrateado.

#### Conciliación extrajudicial y caducidad (paso 6)

> **Ley 2220 de 2022** (Estatuto de Conciliación, que sustituyó a la Ley 640 de 2001) `[CONOCIDO]`.
> La presentación de la solicitud **suspende la caducidad hasta el vencimiento de tres (3) meses
> contados desde esa presentación**. Si vencidos los tres meses no se celebró la audiencia, se puede
> demandar con la **sola constancia de presentación**. **La prórroga que acuerden las partes NO
> suspende la caducidad**: es tiempo que se consume del plazo de 2 años.

Consecuencia operativa: la conciliación **no congela el reloj mientras dure**. Un contratista que
crea lo contrario y deje correr una conciliación prorrogada de común acuerdo puede llegar a la
demanda con la acción caducada.

#### La regla de oro y sus tres excepciones

> **Sin salvedades en el acta no hay reclamación.** La liquidación bilateral firmada «a paz y salvo»
> cierra la discusión: el Consejo de Estado aplica la doctrina del acto propio (*venire contra factum
> proprium*) y declara improcedente lo que no se salvó `[CONOCIDO]` — línea sólida y reiterada, cuyos
> expedientes concretos **no cito por no poder confirmarlos**. Las salvedades deben ser **específicas
> y cuantificadas**: «me reservo el derecho a reclamar» genérico ha sido considerado insuficiente en
> varias decisiones `[INCIERTO]`.

La doctrina del acto propio opera sobre la liquidación **BILATERAL**. **Tres salidas cuando ya se
firmó sin salvedades:**

1. **Liquidación unilateral**: es un **acto administrativo** y se demanda dentro de los 2 años desde
   su ejecutoria.
2. **Hechos surgidos o conocidos DESPUÉS** de la firma de la liquidación: no pudieron salvarse.
3. **Contrato que nunca se liquidó**: la caducidad corre desde el vencimiento del plazo para liquidar
   (cómputo del CPACA art. 164.2.j, fila 7 de la tabla).

**Ninguna de las tres es un plan: son el resto de un error ya cometido.**

---

### 7. Consecuencia para el modelo (insumo directo a la fórmula de 2.C)

**Los valores de `ρ` y de sus factores que siguen son SUPUESTOS DEL AUTOR, sin base empírica
colombiana verificada.** No provienen de una muestra de reclamaciones ni de estadística judicial
publicada. Se dan para que el parámetro exista de forma explícita y auditable, no para que se use
como dato. Léase esta advertencia antes que las dos tablas.

La reclamación es un **activo contingente de bajo valor esperado**. Se introduce un **factor de
recuperabilidad** `ρ` que multiplica el sobrecosto estimado:

```
Sobrecosto_esperado_neto = Σ_i [ P(evento_i) × Impacto_i × (1 − ρ_i) ]

CD                = Valor_oferta / (1 + A + I + U)
Utilidad_esperada = CD × U − Sobrecosto_esperado_neto
```

**Por qué `CD × U` y no `Valor_oferta × U`.** En el esquema AIU colombiano, A, I y U son porcentajes
**sobre el costo directo**, no sobre el valor de la oferta: `Valor_oferta = CD × (1 + A + I + U)`.
Con los rangos de §4 (A = 20 %, I = 3 %, U = 7 %): `CD = V / 1,30 = 0,769 V` y la utilidad real es
`0,769 V × 0,07 = 0,0538 V`, es decir **5,38 % del valor de la oferta y no 7 %**. Usar
`Valor_oferta × U` sobrestima la utilidad en cerca del 30 %.

**Baja frente al presupuesto oficial.** Si la oferta se presenta con una baja `b` (fracción del
presupuesto oficial), la baja **sale íntegra de la utilidad** y se descuenta antes de este cálculo:

```
U_efectiva = U − b × (1 + A + I + U)
```

Con A = 20 %, I = 3 %, U = 7 %: una baja del 5 % deja `U_efectiva = 0,07 − 0,05 × 1,30 = 0,005`
(medio punto). La baja que anula por completo la utilidad es `b = U / (1 + A + I + U) = 5,38 %`.
**Toda la utilidad de un contrato de obra cabe en una baja de cinco puntos y medio.**

**IVA.** En construcción de bienes inmuebles la base gravable del IVA es la utilidad (o el AIU),
no el valor total del contrato — Decreto 1372 de 1992, art. 3, hoy compilado en el **DUR 1625 de
2016** `[INCIERTO]` en el artículo del decreto único. **El modelo trabaja en valores ANTES de IVA**;
mezclar cifras con y sin IVA en esta fórmula produce errores del orden del propio margen.

#### Factores de `ρ`

`ρ` no es la probabilidad de ganar el pleito: es el **producto de cuatro factores** que se multiplican
entre sí y hunden el resultado.

| Factor | **Supuesto (sin base empírica)** | Justificación |
|---|---|---|
| `p_salvedad` — que exista constancia y salvedad correcta | 0,40 – 0,70 | Depende de la disciplina documental del contratista, no de la entidad |
| `p_exito` — prosperar en sede administrativa o judicial | 0,30 – 0,50 | Y con recorte del monto pedido |
| `f_monto` — fracción del monto reclamado efectivamente reconocida | 0,40 – 0,70 | Los peritajes recortan |
| `f_vp` — valor presente del cobro (2 a 6 años, con costos de abogado 10–20 %) | 0,45 – 0,70 | Descuento + honorarios + costo de oportunidad |

Rango alcanzable por construcción:

```
ρ_max = 0,70 × 0,50 × 0,70 × 0,70 = 0,1715
ρ_min = 0,40 × 0,30 × 0,40 × 0,45 = 0,0216
```

**Ningún valor de `ρ` fuera de [0,022 – 0,172] es compatible con estos cuatro factores.** La tabla
por causal se calibra dentro de ese intervalo: la causal modula *dónde* cae `ρ` en el rango, no lo
desborda.

| Causal | `ρ` — **supuesto**, dentro del rango alcanzable | Techo jurídico |
|---|---|---|
| Incumplimiento probado de la entidad (predios, licencias, diseños, mora) | **0,05 – 0,17** | Indemnización integral (incluye utilidad) |
| Hecho del príncipe (tributo o norma de la propia entidad territorial) | **0,04 – 0,12** | Indemnización, pero prueba de imputación difícil |
| Imprevisión (alza extraordinaria, evento externo, norma nacional) | **0,02 – 0,08** | **Solo punto de no pérdida**: nunca devuelve utilidad. 0,02 es el suelo aritmético |
| Riesgo **tipificado, cuantificado y asignado al contratista**, y evento **dentro** de la magnitud estimada | **0,00** | Cerrado por el propio pliego |
| Riesgo tipificado pero **sin magnitud estimada**, o evento que **excede** lo estimado | Se trata como **imprevisión** (0,02 – 0,08) | Reabre por álea extraordinaria (§5) |
| Álea normal e imprevistos cubiertos por la I | **0,00** | No es reclamable |

**Valor por defecto del modelo: `ρ = 0`.** Es decir, **Detecta debe asumir que el sobrecosto no se
recupera**. Cuatro razones: (1) la decisión que el modelo apoya es *presentarse o no*, y una decisión
que solo es rentable si además se gana un pleito no es rentable; (2) `ρ > 0` premia justamente las
obras peor estructuradas, que es lo contrario de lo que se quiere; (3) los valores de arriba son
juicio experto sin respaldo empírico; (4) el flujo de caja de un contratista pequeño no soporta la
espera aunque el pleito se gane. `ρ` debería existir en el código como parámetro **explícito y
apagado**, útil solo para análisis de sensibilidad («¿cuánto tendría que recuperar para que este
contrato dejara de perder dinero?»). Si el número que sale es alto, la respuesta es no presentarse.

---

#### Vacíos y siguiente paso

| Vacío | Cómo cerrarlo |
|---|---|
| **Ninguna URL abierta en esta pasada.** Las cinco citas `[VERIFICADO-TEXTO]` son literales y fueron confirmadas por búsqueda, pero el enlace no se reproduce; el resto es `[CONOCIDO]`/`[INCIERTO]`. La política de egreso de este entorno responde `CONNECT 403` a todos los espejos normativos probados y el presupuesto de búsqueda está agotado | Reabrir con red disponible: Ley 80 arts. 3, 4, 5, 14, 16, 27, 28 y parágrafo del 40; Ley 1150 art. 4; CPACA art. 164.2.j; Conpes 3714 |
| **Ley 2220 de 2022: falta el artículo exacto** de la suspensión de la caducidad y confirmar el régimen de transición frente a la Ley 640 de 2001 | Texto de la Ley 2220 de 2022, buscar «suspensión» y «caducidad»; contrastar con circulares de la Procuraduría |
| **Decreto 679 de 1994 art. 1 (intereses de mora)** — no verificado ni en el artículo ni en la vigencia; la sección lo declara incierto en vez de omitirlo | Verificar vigencia y fórmula; contrastar con la tasa de interés bancario corriente certificada por la Superfinanciera y con lo que la entidad haya pactado en el contrato |
| **Ley 1474/2011 art. 91** — confirmar el listado exacto de contratos que obligan a patrimonio autónomo del anticipo y si hay umbral de cuantía | Texto del artículo + decreto reglamentario |
| **Ningún expediente de jurisprudencia citable.** «Punto de no pérdida», salvedades y «riesgo tipificado pero no cuantificable» son doctrina sólida sin números confirmables; deliberadamente no se inventaron | Buscador del Consejo de Estado, Sección Tercera: «equilibrio económico del contrato», «punto de no pérdida», «acta de liquidación sin salvedades», «álea extraordinaria matriz de riesgos». Idealmente, una **sentencia de unificación** |
| **Naturaleza jurídica y tratamiento tributario de la «I»** (ingreso vs. fondo afecto; base gravable del IVA) | Conceptos DIAN sobre AIU + Decreto 1372/1992 art. 3 y su ubicación en el DUR 1625 de 2016 + jurisprudencia de la Sección Cuarta. Consultar con contador antes de darle efecto en el modelo |
| **Rangos reales de A, I, U** en los pliegos que le interesan a Helder/Génesis — hoy son supuestos declarados | Los pliegos de SECOP II traen el AIU en el presupuesto oficial. Extraer `A`, `I`, `U` de una muestra de 200 procesos de obra por rango de cuantía y **publicar la distribución real**, con *n*, sustituyendo la tabla de §4. Ese mismo ejercicio dice **en qué fracción de procesos el AIU viene fijado**, que es el supuesto de la advertencia 1 |
| **`ρ` sin base empírica** | Cruzar en el corpus histórico contratos con **adiciones en valor** frente al valor inicial (señal `P_adiciones`, sección 2.B.2). No mide reclamaciones ganadas, pero es el proxy disponible sin salir de SECOP II |
| **Extracción de la matriz de riesgos y de `magnitud_estimada`** | No resuelta técnicamente: la matriz suele ser anexo Excel o tabla dentro de un PDF, y `p6dx-8zbt` solo trae la URL del proceso. Requiere descargar documentos del SECOP II, fuera del alcance de la ingesta actual. Paso intermedio barato: **mostrar el enlace al proceso con la advertencia fija «lea y cuantifique la matriz de riesgos antes de ofertar»** en la tarjeta |


---

## 2.E — Evidencia empirica: que dicen los datos y los estudios sobre sobrecostos en Colombia

Esta sección tiene dos mitades y conviene no confundirlas. La primera (§1) es **evidencia
colombiana que existe hoy, publicada y citable**: precios unitarios oficiales, el índice de costos
de obra civil del DANE, el registro legal de obras inconclusas y las reglas de puntuación económica
que deciden quién gana. La segunda (§2 en adelante) es un **plan de análisis** sobre el corpus
propio de Detecta: todavía no son resultados, son las preguntas, los mínimos muestrales y los
sesgos que hay que respetar para que los resultados signifiquen algo cuando se produzcan.

### Nota previa sobre el estado de verificación

La salida a internet de este entorno es **selectiva y variable**: el bloqueo es por HOST concreto,
no global. Están confirmadamente bloqueados `datos.gov.co` y `community.secop.gov.co` (allowlist del
proxy), y en la ventana en que se cerró este documento el proxy rechazaba además todo el resto de
hosts externos, de modo que las comprobaciones se hicieron en una ventana anterior con red y **no
son reproducibles ahora mismo desde esta máquina**. Por eso cada fuente lleva etiqueta:

| Etiqueta | Significa |
| --- | --- |
| **[VERIFICADO]** | Se abrió la URL indicada y se confirmó que existe y dice lo que aquí se afirma. La URL va escrita para que el lector la vuelva a abrir |
| **[VERIFICADO-CÓDIGO]** | Leído directamente en el repositorio de Detecta, con archivo y línea |
| **[CONOCIDO]** | Sólido por conocimiento del dominio, pero **no** comprobado contra su fuente en esta elaboración. Se indica cómo comprobarlo |
| **[INCIERTO]** | Se cree que existe y no se pudo confirmar. Se indica exactamente qué buscar |

Nada de lo que sigue lleva cifra sin origen. Donde hay un número puesto a mano para poder hacer la
cuenta, va marcado **SUPUESTO** y con instrucción de recalibrarlo.

#### La cifra de 61.622 procesos: aportada por el usuario, no confirmada

Se buscó `61.622 / 61622 / 61,622` en todo el repositorio (`.md` y `.js`): **cero coincidencias**
[VERIFICADO-CÓDIGO]. `README.md` sí documenta órdenes de magnitud compatibles: el dataset trae
~40–60 k procesos/mes crudos, el año son ~500 000 filas, y el prefiltro de ingesta deja «unos miles»
en el corpus activo. El histórico se alimenta de dos años de cerrados (`?desde=2024-01&hasta=2025-12`),
de modo que ~61 k registros históricos es **plausible pero no confirmado**. Trátese como cifra del
dueño hasta que se compruebe.

Comprobación exacta, sin re-extraer nada: `GET /api/sync/historico?estado=true` (header
`x-historico-token`) devuelve el avance y el corpus; y la meta del índice (`indice:competencia:meta`)
publica `procesos`, `clasificadas` y `descartados`. La suma de `count` de los manifiestos
`licitaciones:historico:mes:*:manifest` es la cifra dura.

---

### 1. Evidencia colombiana que ya existe y se puede citar hoy

Esto no hay que construirlo: está publicado. Es además la referencia contra la cual se leerá todo lo
que produzca el análisis del corpus.

#### 1.1 Precios unitarios oficiales de referencia — la fuente directa del APU

| Fuente | Qué publica | Etiqueta | Uso para el contratista |
| --- | --- | --- | --- |
| **INVÍAS — Análisis de Precios Unitarios**, `invias.gov.co/index.php/informacion-institucional/hechos-de-transparencia/analisis-de-precio-unitarios` | Los APU del instituto y una **tabla de precios de referencia regionalizada** (ajustes por altitud, clima y condiciones locales) | [VERIFICADO] la página y su contenido general; periodicidad, año de corte y cobertura por ítem quedan **[INCIERTO]** — mirarlos en el propio archivo al descargarlo | Precio de referencia por actividad para vías y obra de transporte. Es el patrón contra el que se contrasta la baja real |
| **IDU — Sistema de Precios Unitarios** (Bogotá) | Base de precios unitarios de referencia del distrito | [CONOCIDO] que el IDU mantiene y publica su base; URL y corte vigente **[INCIERTO]** — buscarlo en `idu.gov.co` | Referencia urbana; solo aplica a procesos de Bogotá, no extrapolar al resto del país sin ajuste regional |
| **datos.gov.co — «Lista oficial de precios unitarios fijos de Obra Pública y de consultoría — Departamento de Boyacá»**, id `ae7u-y7m2` | Lista departamental de precios unitarios fijos | [VERIFICADO] la existencia del dataset y su id; **el host está bloqueado en este entorno**, así que su contenido campo a campo queda [PENDIENTE DE VERIFICAR EN PRODUCCIÓN] | Ejemplo de que hay listas departamentales en el portal abierto: buscar la del departamento donde se va a ofertar antes de reconstruir nada |

**Advertencia que hay que leer antes de usar cualquiera de las tres**: un precio de referencia de
INVÍAS o del IDU es un precio de **presupuestación de la entidad**, no un costo del contratista.
Sirve para saber con qué números armó la entidad su presupuesto oficial, no para saber cuánto le
cuesta a uno ejecutar. Precisamente por eso el contraste **precio oficial de referencia vs. precio
adjudicado** es lo que mide la baja real por actividad, que es una magnitud mucho más útil que la
baja global del contrato.

#### 1.2 ICOCIV — el índice con el que se deflacta obra civil (y por qué el IPC no sirve)

**ICOCIV — Índice de Costos de la Construcción de Obras Civiles del DANE** [VERIFICADO], que
**reemplazó al ICCP en 2022**. Boletines mensuales en `dane.gov.co/files/operaciones/ICOCIV/`
(el de marzo de 2026 es `bol-ICOCIV-mar2026.pdf`).

| Dato | Valor | Origen |
| --- | --- | --- |
| Variación mensual, marzo 2026 | **1,02 %** | [VERIFICADO] en el boletín `bol-ICOCIV-mar2026.pdf` |
| Variación mensual, marzo 2025 (comparativo del mismo boletín) | **0,76 %** | [VERIFICADO], misma fuente |

El ICOCIV está diseñado explícitamente para **deflactar o indexar valores monetarios de obra civil**
y se desagrega por tipo de obra, lo que permite deflactar vías con el índice de vías y no con un
promedio nacional. El **IPC NO sirve para deflactar obra**: mide la canasta del consumidor y no
contiene acero, asfalto, cemento ni mano de obra de construcción, que es justo lo que se quiere
deflactar; úsese solo para llevar a valor real montos no constructivos.

Segunda precisión, y se olvida a menudo: el ICOCIV es un índice de **variación**, no un **nivel de
precio**. Sirve para comparar dos años; no dice cuánto vale un m³ de concreto. Eso lo dan los
precios unitarios de INVÍAS/IDU de §1.1.

#### 1.3 Obras inconclusas: el registro existe por ley

La **Ley 2020 de 2020** [VERIFICADO en `funcionpublica.gov.co/eva/gestornormativo/norma.php?i=135349`]
crea el **Registro Nacional de Obras Civiles Inconclusas**, administrado por la **Contraloría General
de la República** a través de la Dirección de Información, Análisis y Reacción Inmediata, con
obligación de **informe anual**. Es la fuente más pertinente que existe para responder *qué entidades
dejan obras sin terminar*, que es información de riesgo directa para decidir si presentarse.

Lo que **no** está verificado son las **cifras** del registro (número de obras y valor por corte):
varían con cada informe y no se citan aquí sin haberlas visto. *Cómo obtenerlas*: buscar el informe
anual del registro en `contraloria.gov.co` y comprobar si publica CSV descargable o solo tablero.

#### 1.4 El método de puntuación económica se SORTEA — el hecho que más cambia la estrategia

En obra pública colombiana bajo **Documentos Tipo** (adoptados por el **Decreto 342 de 2019** y de
obligatorio cumplimiento por la **Ley 2022 de 2020**) [CONOCIDO — comprobar en `colombiacompra.gov.co`,
sección de Documentos Tipo, y en el pliego del proceso concreto], el **método de ponderación de la
oferta económica se escoge por mecanismo aleatorio** entre varias alternativas: menor valor, media
aritmética, media aritmética alta, media geométrica con presupuesto oficial, y otras según la versión
del documento tipo.

Consecuencia, y es económica, no académica:

| Método sorteado | Cómo se comporta la P(ganar) frente al precio ofertado |
| --- | --- |
| **Menor valor** | Monótona decreciente en el precio: bajar más siempre acerca a ganar (hasta el rechazo por precio artificialmente bajo) |
| **Media aritmética / aritmética alta / geométrica con presupuesto oficial** | **NO monótona**: el óptimo no es el mínimo, sino la **cercanía a una media** que depende de las demás ofertas y del presupuesto oficial. Bajar de más **aleja** del puntaje máximo |

Por eso **«bajar más = más probabilidad de ganar» es falso** como regla general en este mercado, y
cualquier modelo de P(ganar) que no incluya el método sorteado está promediando regímenes de
puntuación opuestos. El método es **observable**: consta en el pliego y en el acta de sorteo, así que
entra como variable, no como supuesto.

#### 1.5 Estudio colombiano sobre variación de precios unitarios

**«Análisis variación precios unitarios INVÍAS en contratos de obra pública»**, tesis del repositorio
institucional de la Universidad de los Andes (`repositorio.uniandes.edu.co`) [VERIFICADO la
existencia del documento en el repositorio; **autor y año quedan [INCIERTO]** — leerlos en la ficha
del repositorio antes de citarlo por escrito]. Es el trabajo colombiano que aplica exactamente la
pregunta de §1.1 (precio de referencia oficial frente a lo que ocurre en contratos reales) a datos
colombianos, y es el punto de partida bibliográfico obligado antes de rehacer el análisis desde cero.

*Cómo ampliar*: repositorios institucionales (`repositorio.unal.edu.co`, `repositorio.uniandes.edu.co`,
`repository.javeriana.edu.co`, `repository.eafit.edu.co`) y Google Scholar con «sobrecostos obra
pública Colombia», «desviación presupuestal contratos obra Colombia», «precios unitarios INVÍAS».

---

### 2. Plan de análisis sobre el corpus propio

Nada de lo que sigue son resultados: son las preguntas, los cortes, los mínimos muestrales y los
sesgos. Están en condicional a propósito.

Campos realmente disponibles [VERIFICADO-CÓDIGO en `lib/proyeccion.js` y `lib/indice_competencia.js`]:

| Variable | Campo del corpus | Corpus | Estado |
| --- | --- | --- | --- |
| Presupuesto oficial | `precio_base` | activo + histórico | Verificado en `CAMPOS` |
| Valor adjudicado | `valor_total_adjudicacion` \| `valor_adjudicado` \| `valor_adjudicacion` | **solo histórico** | Lista de candidatas — **nombre real sin verificar** |
| Nº de oferentes | `numero_de_ofertas` … `proveedores_unicos_con`, `conteo_de_respuestas_a_ofertas` | solo histórico | Lista de candidatas — sin verificar |
| ¿Adjudicado? | `adjudicado`, `estado_del_procedimiento`, `fase` + presencia de adjudicatario | ambos | `esAdjudicado()`, verificado |
| Entidad (identidad) | `claveCanonica(entidad)`; NIT solo como alias | ambos | Verificado |
| Territorio | `departamento_entidad`, `ciudad_entidad` | ambos | Verificado |
| Modalidad | `modalidad_de_contratacion` | ambos | Verificado |
| Objeto | `descripci_n_del_procedimiento` (truncado a 700 car., `lib/proyeccion.js:65`) | ambos | Verificado — **el truncado sesga la extracción de cantidades** |
| Plazo | `duracion` + `unidad_de_duracion` | ambos | Verificado |
| Tipología | `codigo_principal_de_categoria` (UNSPSC) | ambos | Verificado |
| **Enlace al proceso** | **`urlproceso`** (`lib/proyeccion.js:68-70`) | ambos | **Verificado — es la puerta al pliego y al presupuesto oficial desglosado (ver A6)** |
| Método de ponderación económica | **no está en el dataset** | — | Vive en el pliego y en el acta de sorteo (ver A6) |

**Riesgo transversal nº 1 — y su síntoma está mal instrumentado.** Si el nombre real de la columna de
valor adjudicado no está en la lista de candidatas, *todos* los análisis A1, A2 y A5 devuelven cero
filas útiles. Ahora bien: el síntoma de la columna de **OFERENTES** sí está instrumentado
(`descartados.sin_oferentes`, `lib/indice_competencia.js:236`); el de la columna de **VALOR
ADJUDICADO no existe todavía**. `esAdjudicado()` devuelve `true` por cinco señales distintas —
`adjudicado === "si"`, nombre de adjudicatario, NIT del adjudicatario, fecha de adjudicación, estado
del procedimiento — antes de mirar siquiera el valor (`lib/indice_competencia.js:121-131`), así que
la columna de valor puede faltar entera **sin que `clasificadas` caiga a 0 ni suba `sin_oferentes`**.
*Antes de fiarse de esa meta hay que añadir un contador `descartados.sin_valor_adjudicado` en
`lib/indice_competencia.js`.*

#### A1 — Distribución del factor de baja

- **Pregunta**: dado un presupuesto oficial, ¿a qué fracción de él se adjudica realmente?
- **Variable derivada**: `b = valor_adjudicado / precio_base`. Se analiza `b`, no la «baja» (`1−b`),
  para que la escala sea multiplicativa y comparable entre cuantías.
- **Método**: descriptivos robustos —mediana, P10/P25/P75/P90, IQR— **nunca la media sola**: la
  distribución tiene cola izquierda larga y outliers por lotes. Filtro de cordura previo: descartar
  `b ≤ 0,3` y **`b > 1,00`** a un cubo `sospechosos` **contado, no borrado** (un `b = 0,02` casi
  siempre es un contrato por lote frente al presupuesto total del proceso, o una unidad mal parseada).
- **Cortes obligatorios**: entidad, `departamento_entidad`, `modalidad_de_contratacion`, rango de
  cuantía con los cortes que ya usa la app (`bajo` <100 M, `medio` 100–500 M, `alto` >500 M COP —
  [VERIFICADO-CÓDIGO en `README.md`]) y, **cuando se conozca, el método de ponderación económica
  sorteado** (§1.4). Mezclar procesos puntuados por menor valor con procesos puntuados por media
  produce una distribución de `b` que no describe ninguno de los dos regímenes.
- **Tamaño mínimo y su aritmética, hecha con un supuesto declarado**: para una precisión `E` en la
  **media**, `n ≥ (1,96·s/E)²`. Con **s = 0,08 — SUPUESTO, no dato: la dispersión real de `b` se
  desconoce hasta correr A1; recalcular este n con la `s` observada en la primera corrida** — y
  `E = 0,02`, sale `n ≈ 62`. Pero lo que se publica es la **mediana**, cuyo error estándar asintótico
  es ≈ `1,253·s/√n`: el `n` requerido escala con `1,253² ≈ 1,57`, es decir **`n ≈ 97`** con esos mismos
  parámetros. Y como la distribución de `b` no es normal, ese 97 es a su vez una aproximación
  optimista: **lo correcto es publicar un intervalo de confianza de la mediana por bootstrap**, que no
  depende de la forma.
- **Regla de publicación, sin contradicción**: se publica desde **n = 30**, aceptando un semiancho
  aproximado de **±0,036** en la mediana (con `s = 0,08` supuesto: `1,96 · 1,253 · 0,08 / √30`) en vez
  de ±0,02, y **la tabla muestra el `n` y el intervalo bootstrap de cada celda para que el lector lo
  juzgue**. Por debajo de 30 la celda se marca `sin_dato`. Para publicar P10/P90 hacen falta n ≥ 100.
- **Sesgos**: (i) solo se ven los **adjudicados** — los desiertos no tienen `b` y su exclusión sesga
  la muestra hacia procesos «sanos»; (ii) `precio_base` puede venir sin IVA o del presupuesto
  estimado, no del oficial definitivo; (iii) valores nominales de años distintos no son comparables
  sin deflactar (ICOCIV, §1.2); (iv) procesos por lotes: el valor adjudicado puede ser el de un lote
  y el presupuesto el del total; **(v) `b` está CENSURADA por la derecha en 1,0**: superar el
  presupuesto oficial es causal de rechazo, así que la distribución observada no es la de las ofertas
  que se quisieron hacer, sino la de las **admisibles**. Todo `b > 1,00` es error de dato, lote frente
  a total, o valor con adiciones — nunca «una oferta cara» — y por eso el corte va en 1,00 y no en 1,05.
- **Terminología**: la figura colombiana no es «baja temeraria» (eso es España) sino **precio
  artificialmente bajo** (art. 2.2.1.1.2.2.4 del Decreto 1082 de 2015) [CONOCIDO — comprobar el
  articulado en el gestor normativo], que **no se rechaza de plano**: la entidad requiere justificación
  al oferente y solo rechaza si no se explica. Conectado con §1.4: bajo métodos de media, una oferta
  extremadamente baja puede ser una **táctica para arrastrar la media**, no un error. El cubo
  `sospechosos` puede estar botando un fenómeno real y **debe analizarse, no solo contarse**.
- **Presentación**: una tabla por corte con `n`, mediana, IC bootstrap, P25–P75 y `% descartado por
  cordura`, más una banda «tu oferta caería en el percentil X de esta entidad». La cifra que sirve
  para decidir es el percentil, no el promedio.

#### A2 — Oferentes vs. factor de baja

- **Antes de cualquier modelo, el hecho de §1.4**: el método de ponderación económica se **sortea**
  (Decreto 342 de 2019, Documentos Tipo, Ley 2022 de 2020). Bajo **menor valor**, la P(ganar) es
  monótona decreciente en el precio; bajo **media geométrica o aritmética**, el óptimo **no** es el
  mínimo, sino la cercanía a una media que depende de las demás ofertas y del presupuesto oficial.
- **Pregunta, correctamente formulada**: no «cuánto habría que bajar para ganar», sino **«dónde caer
  respecto de la media esperada de las ofertas, condicionado al método sorteado»**. Con más oferentes
  la media se desplaza y su varianza cae: eso es lo que cambia la estrategia, no un descuento lineal.
- **Método en dos pasos**: (1) **binning** por número de oferentes (1, 2, 3, 4–5, 6–9, 10+) con la
  mediana de `b` en cada bin, **separado por método de ponderación** — es lo que se enseña;
  (2) regresión log-log `ln(b) = α + β·ln(oferentes) + efectos fijos de método de ponderación,
  modalidad, tipología (familia UNSPSC), rango de cuantía y año`. β es la **elasticidad** y se reporta
  con su intervalo. El efecto fijo de **método** no es opcional: sin él el coeficiente promedia
  regímenes de puntuación opuestos y no significa nada.
- **Mínimo**: n ≥ 50 por bin; n ≥ 500 para la regresión con efectos fijos.
- **Sesgos, y son graves**: (i) **causalidad invertida** — los procesos «apetecibles» atraen más
  oferentes *y* se pujan más; β mezcla ambos efectos y no debe presentarse como causal; (ii)
  `oferentes = 0` es **sin dato**, jamás «nadie se presentó» [VERIFICADO-CÓDIGO: regla ya codificada
  en `oferentesDe()`, `lib/indice_competencia.js:109-118`]; (iii) censura: los procesos con muchos
  oferentes son sistemáticamente los de entidades grandes y bien publicitadas.
- **Uso en la app**: alimenta la P(ganar). El índice de competencia hoy solo dice *cuántos vienen*;
  A2 traduce eso a *dónde conviene situar la oferta dado el método*, que es la pregunta económica.

#### A3 — Procesos que se caen, y concentración de adjudicatarios

- **Pregunta**: ¿en qué entidades hay procesos que no llegan a adjudicarse, y en cuáles gana siempre
  el mismo?
- **Numeradores separados — no se mezclan causas**: `tasa_desierto` cuenta **solo** los de estado
  «Desierto / Declarado desierto»; aparte y con su propio denominador se publican `tasa_revocado` y
  `tasa_terminacion_anormal` (suspendidos, terminados anormalmente). Para un oferente significan
  cosas opuestas: un desierto es una **segunda oportunidad**; un revocado no lo es.
- `tasa_unico = adjudicados con oferentes = 1 / adjudicados con dato de oferentes`. El denominador es
  distinto al de las tasas anteriores **a propósito** y hay que decirlo en la tabla.
- **Concentración, sin imputar**: se mide el **índice de Herfindahl sobre los NIT ganadores de la
  entidad** y se reporta junto al **nº de adjudicatarios distintos**, como indicador de riesgo. Una
  concentración alta admite **dos lecturas —mercado local pequeño o pliego con requisitos
  restrictivos— y el dato NO las distingue**; la forma de distinguirlas es **leer los requisitos
  habilitantes del pliego**, no el histórico. **Ningún umbral numérico autoriza a escribir «pliego
  dirigido»** sobre una entidad identificable. El cruce por NIT ya es posible con
  `CAMPOS_ADJUDICATARIO_NIT` [VERIFICADO-CÓDIGO].
- **Sesgos**: `sin_dato_oferentes` puede dominar el denominador y fabricar tasas irreales; hay que
  publicar la cobertura (`% con dato de oferentes`) junto a cada tasa.

#### A4 — Adiciones: **no es posible con el dataset actual**

`p6dx-8zbt` es el dataset de **procesos**, no de **contratos ejecutados**: en la proyección
[VERIFICADO-CÓDIGO] no existe ningún campo de valor final, adiciones ni prórrogas. Para calcular
`tasa_adicion = (valor_final − valor_inicial)/valor_inicial` hace falta el dataset **SECOP II —
Contratos Electrónicos**, id **`jbjy-vk9h`** [VERIFICADO: el dataset existe con ese id y ese nombre
en `datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h`]. Los **nombres
exactos de sus columnas** siguen **[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]** porque el host está
bloqueado en este entorno; candidatos por convención del portal: `valor_del_contrato`,
`valor_total_de_adiciones` / `valor_adicionado`, `valor_pagado`, `fecha_de_fin_del_contrato`,
`proceso_de_compra` (la llave que une con `id_del_proceso`).

**Cómo leer los nombres de columna de verdad — y el error que hay que evitar.** `?$limit=1` **NO**
sirve para esto: la API JSON de Socrata **omite por fila los campos nulos**, de modo que una fila de
un proceso todavía abierto no traerá **ninguna** columna de adjudicación —justo las que se buscan— y
se concluiría erróneamente que no existen. Lo correcto son dos llamadas:

```
1) Catálogo completo de columnas (incluye las vacías, con fieldName y tipo):
   https://www.datos.gov.co/api/views/<ID>/columns.json
   (alternativa: https://www.datos.gov.co/api/views/<ID>.json)

2) Una fila que sí tenga datos de adjudicación:
   https://www.datos.gov.co/resource/<ID>.json?$limit=1&$where=<columna de estado> like '%Adjudicad%'

3) Cobertura real de la columna, antes de construir nada encima:
   https://www.datos.gov.co/resource/<ID>.json?$select=count(1)&$where=<columna de valor> IS NOT NULL
```

y, una vez confirmados los nombres:

```
$select=proceso_de_compra, valor_del_contrato, valor_total_de_adiciones,
        (valor_total_de_adiciones / valor_del_contrato) AS tasa_adicion
$where=valor_del_contrato > 0 AND fecha_de_firma between '2024-01-01' and '2025-12-31'
```

Coste de traer esto: un tercer keyspace (`contratos:historico:*`) con la misma mecánica de chunks,
unido por `id_del_proceso`. **No mezclarlo con el histórico de procesos**: son granularidades
distintas (un proceso puede generar varios contratos por lote) y confundirlas repetiría el error de
las dos definiciones de «entidad» que ya costó caro.

#### A5-a — Precios unitarios oficiales (método PRIMARIO)

El COP por unidad física **no hay que reconstruirlo por ingeniería inversa antes de haber mirado lo
que ya está publicado**: INVÍAS (APU + tabla regionalizada por altitud y clima), IDU (Sistema de
Precios Unitarios, Bogotá) y las listas departamentales de `datos.gov.co` (p. ej. Boyacá,
`ae7u-y7m2`) — todo en §1.1. Ese es el camino directo, y da precio **por actividad**, que es la
granularidad de un APU, no por contrato.

El indicador que interesa de verdad sale de cruzar las dos cosas:

```
baja_por_actividad = precio_adjudicado_de_la_actividad / precio_referencia_oficial
```

Es decir: **el precio de referencia oficial es el denominador, no el resultado**. Y como es un precio
de presupuestación de la entidad y no un costo de contratista, ese cociente mide exactamente la baja
real por actividad — que es la magnitud que decide si un ítem se puede ejecutar o no.

#### A5-b — COP por unidad física desde el objeto (método SECUNDARIO, solo de contraste)

- **Para qué sirve**: contrastar el mercado real contra los precios oficiales de A5-a y detectar
  disparates de orden de magnitud. **No** para cotizar.
- **Método**: extracción de cantidad y unidad del objeto por patrones (`(\d+[.,]?\d*)\s*(km|kms?|
  kil[oó]metros|m2|m²|ml|metros lineales)`) **sobre texto normalizado** (`norm` de
  `lib/semantica.js`), cruzada con la tipología por familia UNSPSC y con vocabulario de obra. Solo se
  acepta el par si (a) hay **exactamente una** cantidad-unidad en el objeto y (b) la tipología es
  coherente con la unidad. Indicador: mediana de `valor_adjudicado / cantidad`, deflactado con ICOCIV.
- **Mínimo**: n ≥ 40 por tipología×unidad para publicar mediana e IQR.
- **Sesgos, y aquí son decisivos**: el objeto está **truncado a 700 caracteres** en la proyección
  [VERIFICADO-CÓDIGO, `lib/proyeccion.js:65-66`], así que las cantidades que aparecen al final se
  pierden — y el sesgo **no es aleatorio**: se pierden los objetos largos, que son los proyectos
  grandes. Además: obras multicomponente (una vía *y* un box culvert) contaminan el COP/km; la
  cantidad del objeto es la *contratada*, no la *ejecutada*; y no hay control de especificación (una
  placa huella de 3,5 m no cuesta lo mismo que una de 4,5 m). **Presentar siempre como rango con n
  visible, jamás como precio unitario.**

#### A6 — Cosecha del presupuesto oficial desglosado (la fuente que ya está abierta)

Los **Documentos Tipo** obligan a la entidad a publicar el **«Formato 1 – Presupuesto oficial»** con
el **AIU discriminado** y el desglose de ítems, precios unitarios y cantidades, normalmente en Excel
[CONOCIDO — comprobar en el propio Documento Tipo vigente en `colombiacompra.gov.co` y en cualquier
proceso real]. Y el corpus **ya guarda el enlace a cada proceso**: `urlproceso` [VERIFICADO-CÓDIGO,
`lib/proyeccion.js:68-70`].

Es decir: la puerta al presupuesto oficial desglosado —la materia prima exacta de un informe sobre
APU— está abierta.

| Paso | Qué se hace | Qué se obtiene |
| --- | --- | --- |
| 1 | Desde `urlproceso`, entrar al expediente del proceso en SECOP II | Índice de documentos publicados |
| 2 | Descargar «Formato 1 – Presupuesto oficial» / anexo de APU (Excel o PDF) | Ítems, cantidades, precios unitarios, **AIU discriminado** |
| 3 | Descargar el pliego y, si consta, el acta de sorteo | **Método de ponderación económica** (la variable de §1.4), requisitos habilitantes |
| 4 | Normalizar ítems a un catálogo propio y acumular por entidad | **Base propia de precios unitarios, cantidades y AIU POR ENTIDAD** |

**Coste declarado honestamente**: esto es **scraping de documentos**, no una consulta SoQL. Formatos
heterogéneos, Excel con celdas combinadas, PDF escaneados, y un volumen que no cabe en una función
serverless con presupuesto de segundos. Es un proceso aparte, por lotes, sobre los procesos que
realmente interesan (los que ya pasaron el filtro de la app), no sobre los 61 k. Pero es la única vía
a la estructura de precios de la entidad, y **ninguna otra fuente la sustituye**.

#### Requisito común a todos: deflactar con el índice correcto

Comparar pesos de 2024 con pesos de 2026 sin deflactar inventa una tendencia. **Índice aplicable:
ICOCIV del DANE** (§1.2) [VERIFICADO], desagregado por tipo de obra —vías con el índice de vías, no
con el promedio nacional—. **El IPC no se usa** para valores de obra. Todo valor se lleva a pesos de
un año base **declarado en la propia tabla**.

---

### 3. El límite duro: **no se puede estimar el margen real con datos públicos**

Esta es la trampa conceptual central de toda la Parte 2, y conviene dejarla escrita sin adornos.

El margen de un contratista es `(ingresos − costos) / ingresos`. Los **ingresos** son observables: el
valor adjudicado está (si la columna existe) y el valor final estaría en el dataset de contratos. Los
**costos reales** —precios de compra de cemento y acero *negociados por esa empresa*, rendimientos de
cuadrilla, alquiler de maquinaria, financiación, sobrecostos absorbidos— **no se publican en ningún
dataset del Estado colombiano**, y no por opacidad: es información privada del contratista, no del
contrato.

Lo que sí acota el margen, y solo por arriba:

| Observable | Qué acota | Por qué NO es el margen |
| --- | --- | --- |
| `b = adjudicado / presupuesto` | El techo de ingreso frente al presupuesto que la entidad calculó con SUS precios | El presupuesto oficial también puede estar mal: si venía inflado, una baja del 15 % sigue siendo rentable; si venía ajustado, un 5 % ya es pérdida |
| Tasa de adición | Cuánto ingreso extra suele aparecer después | Una adición puede ser obra extra a costo pleno (margen ~igual) o reequilibrio por sobrecosto (margen ya perdido). El dato no distingue |
| Precios unitarios oficiales (INVÍAS/IDU) | Con qué números armó la entidad el presupuesto | Es el costo estimado **de la entidad**, no el del contratista. Acota el denominador de la baja, no el margen |
| **AIU del presupuesto oficial** | Lo que la entidad *reconoce* como administración, imprevistos y utilidad | Es una estructura de precio contractual, **no la utilidad realizada**. No está en el dataset Socrata, **pero sí en el «Formato 1 – Presupuesto oficial» que los Documentos Tipo obligan a publicar en cada proceso, alcanzable desde `urlproceso`** (A6) |

La formulación correcta para la app: `margen_estimado = f(b, adiciones, AIU, costo_propio)` donde
`costo_propio` es un dato **que solo el dueño tiene** (su APU, sus proveedores, su cuadrilla). Los
datos públicos aportan los tres primeros términos; el cuarto es irreemplazable. Cualquier pantalla
que diga «margen» sin haber recibido un APU del dueño está mintiendo, y debería llamarse «baja frente
al presupuesto oficial», que es lo que de verdad mide.

---

### 4. Fuentes externas complementarias y estado de cada una

Las verificadas están en §1. Aquí quedan las que aportarían y siguen sin comprobar.

| Fuente | Qué aportaría | Etiqueta | Cómo verificarla |
| --- | --- | --- | --- |
| **Registro Nacional de Obras Civiles Inconclusas** (Ley 2020 de 2020, CGR) | Universo de obras paradas con entidad, valor y causa: *qué entidades dejan obras sin terminar* | Norma y registro **[VERIFICADO]** (§1.3); **cifras [INCIERTO]** | Informe anual en `contraloria.gov.co`; comprobar si hay CSV descargable o solo tablero |
| **Contraloría — Actuaciones Especiales de Fiscalización** e informes sectoriales de infraestructura | Casos documentados de sobrecosto con cifra y entidad | [CONOCIDO] que existen; títulos y cifras [INCIERTO] | `contraloria.gov.co`, sección de informes; buscar por sector transporte/vivienda |
| **Cámara Colombiana de la Infraestructura (CCI)** — informes de obras paralizadas | Visión del gremio, con conteo de obras paralizadas y causas | [CONOCIDO] que publica informes periódicos; título exacto y cifras [INCIERTO] | `infraestructura.org.co`, sección publicaciones |
| **Transparencia por Colombia** — Índice de Transparencia de las Entidades Públicas, Monitor Ciudadano | Riesgo de corrupción por entidad: cruzable con el índice de competencia de la app | [CONOCIDO] que existen ambos productos; periodicidad y último corte [INCIERTO] | `transparenciacolombia.org.co` |
| **Colombia Compra Eficiente — Guía CCE-REC-GI-22** (versión vigente, 29/09/2023; antes CCE-EICP-GI-22) para determinar y verificar la **capacidad residual** | La fórmula que la app implementa en `lib/capacidad.js` | **[VERIFICADO contra el PDF de CCE]**, `colombiacompra.gov.co` (archivo `2023-Guia-para-determinar-y-verificar-la-Capacidad-Residual-…-CCE-REC-GI-22.pdf`) | **Pendiente**: cotejar los rangos de las tablas de E, CT y CF de la versión 2023 contra los codificados en `lib/capacidad.js`, que todavía rotula el código antiguo en sus líneas 10, 28 y 49 |
| **Colombia Compra Eficiente — Documentos Tipo** (Decreto 342 de 2019; Ley 2022 de 2020) | Métodos de ponderación económica y su sorteo; Formato 1 – Presupuesto oficial | [CONOCIDO] (§1.4, A6) | `colombiacompra.gov.co`, sección Documentos Tipo; y el pliego de cualquier proceso real |
| **OCDE / Banco Mundial** — revisiones de compra pública en Colombia | Comparación internacional de eficiencia de la contratación | [INCIERTO] en cuanto a informe y año concretos | Buscar «OECD public procurement review Colombia» |

**Corrección sobre la capacidad residual**, porque la versión anterior de este documento la describía
mal: la fórmula **no tiene tres factores sino cinco** — **E** (experiencia), **CF** (capacidad
financiera), **CT** (capacidad técnica), **CO** (capacidad de organización) y **SCE** (saldos de
contratos en ejecución), con

```
CRP = CO × (E + CT + CF) / 100 − SCE
```

y los cinco están implementados en `lib/capacidad.js:11` [VERIFICADO-CÓDIGO]. Nótese además que
«está verificada porque el código la implementa» es un razonamiento **circular**: que el código
implemente algo no prueba que la norma lo diga; la dirección correcta es cotejar el código contra el
PDF, y eso es lo que queda pendiente.

#### Flyvbjerg y la reference class forecasting: el método sí se transfiere, los números no

**Flyvbjerg, Holm y Buhl (2002), «Underestimating Costs in Public Works Projects: Error or Lie?»,
Journal of the American Planning Association 68(3):279-295**, sobre **258 proyectos de transporte en
20 países** (~90 000 M USD, precios constantes de 1995) [VERIFICADO]:

| Tipo de proyecto | Sobrecosto medio |
| --- | --- |
| Ferrocarril | **45 %** |
| Enlaces fijos (puentes y túneles) | **34 %** |
| Carreteras | **20 %** |

con **cost escalation en 9 de cada 10 proyectos** [VERIFICADO]. La formulación «*iron law of
megaprojects: over budget, over time, over and over again*» **no es de ese artículo** sino de
**Flyvbjerg (2014), «What You Should Know About Megaprojects and Why: An Overview», Project Management
Journal 45(2):6-19** [CONOCIDO — la atribución al artículo de 2014 es firme; el número de página
exacto conviene comprobarlo antes de citarlo].

**Advertencia de transferencia, y es la parte que importa para este cliente.** Esa es la tasa base de
**megaproyectos internacionales de transporte** —presupuestos de cientos de millones de dólares,
horizontes de una década— y mide `costo_final / costo_estimado` desde la decisión de construir: es la
exposición del **PROMOTOR público**, no la del constructor. Un contratista de placa huella municipal
a precios unitarios **no hereda esa tasa base**: en su contrato, buena parte del sobrecosto de
cantidades **la paga la entidad vía adición**, y lo que él absorbe es otra cosa —la diferencia entre
su APU y su costo real, y la desviación de cantidades no reconocidas—. **Usar el 45 % de Flyvbjerg
como colchón de un APU sería un error de categoría.** Lo que se transfiere de Flyvbjerg es el
**MÉTODO** (la visión externa), no los números.

El método tiene tres pasos y **el corpus de Detecta permite los tres**:

1. **Definir la clase de referencia**: proyectos comparables. Aquí no es «obra civil» a secas, sino la
   celda `familia UNSPSC × rango de cuantía × región × método de ponderación` (y, cuando haya n
   suficiente, entidad).
2. **Construir la distribución empírica** del resultado sobre esa clase. Matiz frente a Flyvbjerg: él
   estudia `costo_final / costo_estimado`. La app puede estimar directamente **`b = adjudicado /
   presupuesto`** (A1) y, solo si se ingiere el dataset de contratos, **`valor_final / adjudicado`**
   (A4) — que es su magnitud homóloga. Mientras A4 no exista, la app hace *media* reference class
   forecasting y debe decirlo.
3. **Situar el proyecto propio en esa distribución** por percentil, no por punto. El entregable no es
   «este proceso se adjudicará en 0,92 del presupuesto», es «en 34 procesos comparables de esta
   entidad la mediana fue 0,92 con un rango intercuartílico de 0,88–0,96». **Lo que significa caer
   por debajo de 0,88 depende del método sorteado**: con menor valor, mejora la posición; con media
   geométrica o aritmética, puede **alejar** del puntaje máximo. La distribución sitúa la oferta; no
   dicta bajarla.

La inversión de la lógica es todo el valor: en vez de estimar desde cero y aplicarle un colchón a
ojo, **partir de lo que pasó en procesos de la misma clase y ajustar**. Es exactamente lo que un
corpus histórico propio permite y ninguna fuente externa puede dar con la granularidad de una
alcaldía municipal de un departamento concreto.

---

### 5. Calibración continua: el registro propio responde una pregunta que el corpus no puede

Todo lo anterior es **el mercado**. Nada de eso sabe si *este* proponente gana o pierde, ni cuánto le
cuesta ejecutar. La única forma de saberlo es registrar lo que el dueño hace y cómo le va. Mínimo
viable: **una tabla**.

| Campo | Tipo | Notas |
| --- | --- | --- |
| `id_del_proceso` | texto | Llave contra el corpus: enlaza con presupuesto, entidad, oferentes y objeto ya guardados |
| `perfil` | enum `helder\|genesis\|consorcio` | Con qué figura se presentó |
| `fecha_oferta` | fecha | |
| `valor_ofertado` | número (COP) | El insumo central |
| `presupuesto_oficial` | número (COP) | Copia congelada: el corpus puede cambiar por adenda |
| **`metodo_ponderacion`** | **enum** `menor_valor\|media_aritmetica\|media_aritmetica_alta\|media_geometrica_po\|otro` | **Se sortea; consta en el pliego y en el acta. Sin esta columna, ningún modelo de P(ganar) es interpretable** |
| `resultado` | enum `ganada\|perdida\|rechazada\|desierta\|desistida` | «Rechazada» (por requisitos) no es «perdida» (por precio): mezclarlas corrompe la P(ganar) |
| `valor_ganador` | número, nullable | Cuánto ofertó quien ganó — se lee del histórico cuando adjudiquen |
| `media_de_ofertas` | número, nullable | Bajo métodos de media es **la referencia real**, más que el presupuesto |
| `puesto` | entero, nullable | Posición en el orden de elegibilidad |
| `costo_estimado_propio` | número, nullable | El APU con que se decidió ofertar |
| `costo_real_ejecutado` | número, nullable | **Solo para las ganadas y ejecutadas. Es el dato que ninguna fuente pública tiene** |
| `notas` | texto | Por qué se desistió, qué se subestimó |

Ciclo de calibración, en orden de aparición:

1. **Con 10–15 registros**: comparar `valor_ofertado / presupuesto` propio contra la distribución de
   `b` de A1 en la misma clase **y con el mismo método de ponderación**. Diagnóstico inmediato:
   «ofertas sistemáticamente por encima del P75 de la clase» explica una racha de derrotas sin ningún
   modelo. **Este paso es el método definitivo, no un puente hacia el modelo del paso 2.**
2. **Modelo, solo con muestra suficiente — y hay que decir cuánta es**: la regla es **≥10 eventos por
   predictor de la clase minoritaria**. Con 3 predictores (`valor_ofertado/presupuesto`, oferentes,
   nivel de competencia de la entidad) eso significa **≥30 GANADAS y ≥30 perdidas**, no 30 en total.
   Con 30 registros totales y 5 ganadas serían ~1,7 eventos por variable: separación casi garantizada
   y coeficientes sin sentido. **Con menos, ningún modelo: solo la comparación de percentiles del
   paso 1.** Y la advertencia honesta: a **20 procesos/año** y una tasa de éxito del **15 %** —ambos
   **SUPUESTOS**, sustituirlos por los del dueño— ese umbral llega en **~10 años**. *Alternativa
   intermedia con n pequeño*: **regresión logística penalizada de Firth con UN solo predictor**
   (`valor_ofertado/presupuesto`), y aun así reportando **intervalo, no punto**. Y siempre
   estratificando por `metodo_ponderacion`: un modelo que mezcla menor valor con media geométrica
   estima el promedio de dos regímenes opuestos.
3. **Con ~10 ejecutadas**: `costo_real / costo_estimado` propio — el **factor de corrección del APU**,
   que es el número más valioso de toda esta sección y no existe en dato público alguno.
4. **Permanente**: recalibrar por trimestre y **conservar las predicciones antiguas** para medir el
   error fuera de muestra. Un modelo que solo se reajusta y nunca se puntúa contra su propio pasado
   no se está calibrando, se está sobreajustando.

**Cincuenta registros propios no predicen mejor que sesenta mil ajenos: predicen OTRA COSA.** Los
sesenta mil dan la **clase de referencia** —qué hace el mercado en esta entidad, con esta cuantía, con
este método de ponderación—, y cincuenta registros no pueden estimar eso ni de lejos. Los cincuenta
dan el **único puente hacia el margen**, que es la magnitud que decide si vale la pena presentarse, y
que los sesenta mil no pueden dar nunca. Se usan **juntos**: la clase de referencia sitúa la oferta,
el registro propio corrige el APU. Ninguno de los dos sustituye al otro.

#### Vacíos y siguiente paso

1. **Verificación no reproducible en la ventana actual.** Las fuentes de §1 se comprobaron con red
   abierta; en el momento de cerrar el documento el proxy rechazaba todos los hosts externos y el
   presupuesto de búsqueda estaba agotado. *Siguiente paso*: reabrir las URL citadas desde una máquina
   con red, y en particular fijar los datos que quedaron [INCIERTO]: autor y año de la tesis de
   Uniandes, año de corte de la tabla regionalizada de INVÍAS, URL y corte del Sistema de Precios
   Unitarios del IDU, y las cifras del Registro de Obras Inconclusas.
2. **La cifra de 61.622 procesos no está en el repositorio.** *Siguiente paso*:
   `GET /api/sync/historico?estado=true` y suma de `count` de los manifiestos históricos.
3. **La columna de valor adjudicado sigue sin confirmar** y **no tiene síntoma instrumentado**.
   *Siguiente paso*, en este orden: (a) `https://www.datos.gov.co/api/views/p6dx-8zbt/columns.json`
   para leer **todas** las columnas con su `fieldName` y tipo, incluidas las vacías —**no `?$limit=1`**,
   que omite los campos nulos y haría concluir que no existen—; (b) una fila real con
   `?$limit=1&$where=<columna de estado> like '%Adjudicad%'`; (c) añadir los nombres reales a
   `CAMPOS_VALOR_ADJUDICADO` / `OFERENTES_CAMPOS`; (d) **añadir un contador
   `descartados.sin_valor_adjudicado` en `lib/indice_competencia.js`**, que hoy no existe; (e) llamar
   `/api/sync/historico?reconstruir_indice=true`.
4. **Las columnas del dataset de contratos `jbjy-vk9h` no están confirmadas** (el id sí lo está). Sin
   ellas no hay tasa de adición. *Siguiente paso*: `columns.json` de ese id y la consulta de cobertura
   de A4, desde una red que alcance `datos.gov.co`.
5. **La cobertura real del campo de oferentes es desconocida.** Si resulta ser del 10 %, A2 y A3 no se
   pueden publicar. *Siguiente paso*: leer `indice:competencia:meta.descartados.sin_oferentes` frente
   al total; es una lectura, no un cálculo.
6. **El método de ponderación económica no está en ningún dato estructurado de la app**, y sin él A1,
   A2 y el modelo de §5 mezclan regímenes opuestos. *Siguiente paso*: cosecharlo del pliego/acta vía
   `urlproceso` (A6) para una muestra piloto de 50 procesos y medir si la distribución de `b` difiere
   de verdad entre métodos antes de invertir en cosecharlo a escala.
7. **La cotejación de `lib/capacidad.js` contra la guía CCE-REC-GI-22 de 2023 está pendiente**, y el
   código todavía rotula el código de guía antiguo (`CCE-EICP-GI-22`) en sus líneas 10, 28 y 49.
   *Siguiente paso*: abrir el PDF de 2023, comparar las tablas de rangos de E, CT y CF, y actualizar
   comentario y umbrales si difieren.
8. **El truncado del objeto a 700 caracteres sesga A5-b** y no está cuantificado. *Siguiente paso*:
   contar qué fracción de los objetos históricos llega al tope; si supera el 15 %, subir el límite en
   la proyección **histórica** (no en la activa, que paga Redis) antes de intentar COP/unidad.
9. **La `s` de A1 es un supuesto (0,08) y de ella dependen todos los tamaños de muestra citados.**
   *Siguiente paso*: correr A1 una vez sin umbral de publicación, medir la dispersión real de `b`, y
   recalcular los `n` (media y mediana) con ese valor antes de fijar los mínimos definitivos.


---

## 2.F — Casos de borde y validacion del modelo

Notacion base para toda la seccion. `P` = presupuesto oficial (COP). `CD` = costo directo. `AIU` =
administracion, imprevistos, utilidad (los tres son **indirectos**: no forman parte del `CD`).
`U` = utilidad esperada. `CEM` = **capital expuesto maximo** (el pico de la curva de caja acumulada
negativa del contrato, en COP). `T` = meses de exposicion, medidos **del primer desembolso propio al
ultimo cobro**, no de la duracion contractual.

**Definicion de `U` (faltaba y cambia la lectura de todo):** `U` es la utilidad **antes de impuesto
de renta** y **despues de las deducciones de ley que se practican sobre cada acta** (contribucion
especial de obra publica, estampillas, ICA, retenciones). Toda cifra de `ROIC` de esta seccion es
**antes de renta**; para compararla con una alternativa de inversion hay que multiplicarla por
`(1 − tasa efectiva de renta)`. Mezclar en una misma tabla una `U` antes de impuestos con un costo
financiero despues de impuestos es un error de comparacion, no de aritmetica.

| Plano | Indicador | Formula | Que responde |
|---|---|---|---|
| Margen | `m` | `U / P` | ¿el contrato deja plata? |
| Retorno sobre capital | `ROIC_anual` | `U / CEM × (12 / T)` | ¿deja plata **por peso propio arriesgado**? |

La tesis de toda la seccion: **la mayoria de los casos de borde no tocan `m`, tocan `CEM`.** Un
contrato con 6 % de margen puede ser excelente o ruinoso segun cuanto capital propio exija y por
cuanto tiempo. Confundir los dos planos es el error caro.

### 0. Deducciones de ley sobre cada acta (bloque previo a todo lo demas)

Antes de discutir anticipos y sistemas de precio hay que fijar esto, porque **una deduccion conjunta
del 8 % sobre `P` = 1.000 MM son 80 MM, y la utilidad del ejemplo central es 60 MM**. Si el AIU no
las incorporo al formar el precio, el contrato pierde plata con independencia de como se ejecute.
No son un impuesto que se paga al final: se **retienen de cada pago**, asi que ademas golpean la caja
mes a mes y agrandan el `CEM`.

| Deduccion | Base y tarifa tipica | Quien la fija | Etiqueta |
|---|---|---|---|
| **Contribucion especial de obra publica** | 5 % del valor total del contrato de obra publica con entidad estatal (y de sus adiciones), retenida proporcionalmente de cada pago (Ley 418/1997 art. 120) | Ley nacional | [CONOCIDO] — **[PENDIENTE DE VERIFICAR] la vigencia en 2026**: es una norma de vigencia temporal prorrogada sucesivamente (Ley 1106/2006, Ley 1430/2010, Ley 1738/2014, Ley 1941/2018, Ley 2272/2022). La cadena de prorrogas y la fecha de expiracion vigente hay que leerlas en el texto actual antes de codificar el 5 % |
| **Estampillas departamentales y municipales** | Entre 2 y 5 estampillas por entidad; tarifas tipicas de 0,5 % a 2 % **cada una** sobre el valor bruto de cada pago | Ordenanza departamental / acuerdo municipal | [CONOCIDO] en el mecanismo. **La tarifa NO se estima: se lee del pliego**, porque cambia por entidad y por año |
| **Tope conjunto contribucion + estampillas** | Se cita habitualmente un tope del **10 % del valor del contrato** | Ley nacional | [INCIERTO] — el tope se menciona de forma corriente en la practica contractual, pero **la norma exacta que lo establece no se pudo confirmar en esta sesion**. No codificarlo como limite duro hasta identificar el articulo |
| **Retencion en la fuente por contratos de construccion/obra** | Tarifa reducida respecto de la general de servicios, sobre el pago bruto | Estatuto Tributario y decretos reglamentarios | [CONOCIDO] — tarifa exacta a confirmar contra el decreto de retenciones vigente |
| **ICA municipal** | Actividad de construccion, tarifa por mil sobre ingresos, retenida por la entidad | Acuerdo municipal | [CONOCIDO] — varia por municipio; se lee del pliego |
| **IVA sobre el AIU** | En contratos de construccion de bien inmueble el IVA no se causa sobre el valor total sino sobre la parte correspondiente a honorarios/utilidad del constructor | Norma nacional (regla del IVA sobre AIU) | [CONOCIDO] — **no verificado en esta sesion**; es el punto donde mas se equivoca un presupuesto hecho a ojo |
| **Impuesto de renta** | Tarifa general de personas juridicas | Ley nacional | [CONOCIDO] — cae **fuera** de `U` segun la definicion de la notacion base |

**Consecuencia para el modelo.** Ninguna de estas tarifas es deducible de un dataset: todas viven en
el pliego y en la normativa territorial. Por eso el modelo **no publica `m` sin haber leido las
deducciones**; si no constan, `m` se reporta como **cota superior** y la tarjeta lo dice.

### 1. Anticipo: 0 % / 30 % / 50 %

**Mecanica colombiana.** El anticipo es dinero **de la entidad**, no del contratista: se entrega para
arrancar, se amortiza contra cada acta parcial (tipicamente al mismo % del anticipo) y hasta que se
amortiza sigue siendo publico. De ahi tres consecuencias que el modelo debe respetar:

| Elemento | Regla | Etiqueta |
|---|---|---|
| Tope | El anticipo no puede exceder el 50 % del valor del contrato (Ley 80/1993, art. 40 par.) | [CONOCIDO] — no verificado en esta sesion |
| Patrimonio autonomo | En contratos de obra, concesion, salud o **los que se realicen por licitacion publica**, el contratista debe constituir fiducia o patrimonio autonomo irrevocable para el manejo del anticipo, con costo a su cargo, **SALVO que el contrato sea de menor o minima cuantia** (Ley 1474/2011, art. 91) | [CONOCIDO] — texto literal no confirmado (fuentes normativas devolvieron 403). **La excepcion importa mas que la regla para Helder/Genesis**: es justo su rango tipico |
| Garantia | Poliza de **buen manejo y correcta inversion del anticipo**, por el 100 % del monto anticipado y vigente hasta su amortizacion total | [CONOCIDO] |

**Anticipo vs pago anticipado — no son sinonimos y el modelo no puede tratarlos igual:**

| | Anticipo | Pago anticipado |
|---|---|---|
| Propiedad del dinero | De la entidad hasta amortizarse | Del contratista desde el desembolso |
| Amortizacion | Si, en cada acta | No |
| Garantia exigida | Buen manejo y correcta inversion | Devolucion del pago anticipado |
| Fiducia / patrimonio autonomo | Si, en los supuestos del art. 91 (con la excepcion de menor y minima cuantia) | No aplica |
| Efecto contable | Pasivo (anticipo recibido) | Ingreso recibido por anticipado / ingreso |
| Efecto en el modelo | Baja `CEM`, **no** sube `U` | Baja `CEM` y ademas es caja definitiva |

#### Efecto cuantificado — flujo mes a mes, con la amortizacion explicita

Supuestos declarados: `P` = 1.000 MM; `CD` = 940 MM ejecutado lineal en 8 meses (117,5 MM/mes);
8 actas mensuales de 125 MM brutas; **cobro a 60 dias** (el acta del mes *k* se cobra al cierre del
mes *k+2*); amortizacion del anticipo **al mismo porcentaje** en cada acta; `U` = 60 MM (`m` = 6 %).
Deducciones de ley **no incluidas** en este flujo — al incorporarlas, las tres columnas empeoran.

Convencion de lectura, que hay que declarar porque **cambia el resultado**: «durante» es el saldo en
el punto mas bajo del mes, antes de que entre el cobro; «cierre» es el saldo despues del cobro.
La primera es la que dimensiona el cupo de credito que hay que tener; la segunda es la que se ve en
un extracto mensual. Cifras en MM COP.

| Mes | 0 %: durante | 0 %: cierre | 30 %: durante | 30 %: cierre | 50 %: durante | 50 %: cierre |
|---|---|---|---|---|---|---|
| Inicio (anticipo) | 0 | 0 | +300,0 | +300,0 | +500,0 | +500,0 |
| 1 | −117,5 | −117,5 | +182,5 | +182,5 | +382,5 | +382,5 |
| 2 | −235,0 | −235,0 | +65,0 | +65,0 | +265,0 | +265,0 |
| 3 | **−352,5** | −227,5 | −52,5 | +35,0 | +147,5 | +210,0 |
| 4 | −345,0 | −220,0 | −82,5 | +5,0 | +92,5 | +155,0 |
| 5 | −337,5 | −212,5 | −112,5 | −25,0 | +37,5 | +100,0 |
| 6 | −330,0 | −205,0 | −142,5 | −55,0 | −17,5 | +45,0 |
| 7 | −322,5 | −197,5 | −172,5 | −85,0 | −72,5 | −10,0 |
| 8 (fin de obra) | −315,0 | −190,0 | **−202,5** | **−115,0** | **−127,5** | **−65,0** |
| 9 | −190,0 | −65,0 | −115,0 | −27,5 | −65,0 | −2,5 |
| 10 (ultimo cobro) | −65,0 | **+60,0** | −27,5 | **+60,0** | −2,5 | **+60,0** |

Acta neta cobrada: 125,0 MM sin anticipo; 87,5 MM con 30 %; 62,5 MM con 50 %. Es la linea que el
analisis ingenuo olvida: **el anticipo no regala caja, la adelanta y despues la descuenta**.

| Anticipo | Acta neta | `CEM` (necesidad) | Caja minima al cierre | Mes del pico | `ROIC_anual` (`T` = 10) | Costo de estructuracion |
|---|---|---|---|---|---|---|
| 0 % | 125,0 MM | **~352 MM** (3 × 940/8) | −235 MM | 3 | **~20 %** | 0 |
| 30 % | 87,5 MM | **~203 MM** | −115 MM | 8 | **~36 %** | Fiducia (si aplica) + poliza |
| 50 % | 62,5 MM | **~128 MM** | −65 MM | 8 | **~57 %** | Fiducia (si aplica) + poliza |

**Nota obligatoria sobre el costo de estructuracion:** en **menor y minima cuantia el costo de
fiducia es 0** — la excepcion del art. 91 — y solo queda la prima de la poliza de buen manejo. Donde
si aplica, el costo **no se estima con un porcentaje a ojo**, se cotiza:

```
costo_estructuracion = comision_fiduciaria(% anual) × saldo_promedio_administrado × (T/12)
                     + prima_poliza_buen_manejo(‰) × 100 % del anticipo
```

Los dos insumos (`comision_fiduciaria`, `prima_poliza`) son **cotizaciones**, no coeficientes: se
piden a la fiduciaria y a la aseguradora y se guardan como dato del proceso. Un porcentaje inventado
sobre `P` en esta linea es exactamente el tipo de cifra que esta seccion existe para prohibir.

**Conclusion practica corregida:** un anticipo del 50 % **reduce el capital expuesto maximo de
~352 MM a ~128 MM (−64 %) sin mover el margen, pero NO lo elimina**: la amortizacion devuelve la
exposicion al final del contrato, que es justo cuando el contratista ya gasto el anticipo. El pico de
exposicion **se desplaza del mes 3 al mes 8**, y esa es la diferencia operativa real — con anticipo
alto el problema deja de ser arrancar y pasa a ser cerrar.

**Costo del credito, con su cuenta a la vista** (sustituye a la afirmacion suelta «el credito se come
2-4 pts»):

```
costo_financiero = CEM × tasa_EA_asumida × (meses_de_exposicion / 12)
```

Con `CEM` = 352 MM al 20 % EA durante 5 meses ≈ **29 MM ≈ 2,9 % de `P`**, es decir casi la mitad de
la utilidad. [SUPUESTO: la tasa EA. Se reemplaza por la tasa real de la linea de credito del
contratista; el resto de la cuenta es aritmetica.]

Y hay un efecto ya implementado que juega a favor: en `lib/capacidad.js` (`calcCRPC`) el anticipo
**resta** de la carga del proceso — `CRPC = (P − anticipo) × min(1, 12/plazo)` — asi que mas anticipo
tambien **libera capacidad K**.

**Doctrina de dato que hay que respetar.** `CLAUDE.md` es explicito: `anticipo_pct = 0` significa
**«sin dato»**, no «no hay anticipo», y por eso `anticipo_min` no excluye a los ceros (excluirlos =
app vacia). El modelo de rentabilidad hereda esa regla: con anticipo desconocido se calcula el
**escenario sin anticipo** y se marca el resultado como *cota inferior*, nunca como estimacion.

Defecto detectado, verificable en codigo: `lib/negocio.js:80-92` colapsa **tres** estados en un solo
`0`. La linea 83 devuelve `0` cuando `SIN_ANTICIPO_RE` acierta («NO SE CONTEMPLA ANTICIPO» = hecho
positivo) y la linea 91 devuelve `0` por ausencia de informacion. La evidencia para distinguirlos ya
existe y se descarta. Propuesta de esquema (sin tocar el contrato de `anticipo_pct`):

| Campo | Tipo | Valores |
|---|---|---|
| `anticipo_pct` | number | igual que hoy, 0 = sin cifra |
| `anticipo_estado` | enum | `declarado` \| `negado_explicito` \| `desconocido` |
| `anticipo_fuente` | enum | `columna` \| `texto_objeto` \| `ninguna` |

Con `negado_explicito` el modelo puede castigar de verdad; con `desconocido` solo puede advertir.

### 2. Precio global fijo vs precios unitarios

| Sistema | Riesgo de **cantidad** | Riesgo de **precio unitario** | Quien mide la obra | Prima sugerida sobre `CD` |
|---|---|---|---|---|
| Precios unitarios | Entidad | Contratista | Acta de medicion real | 0 (base) |
| Precio global fijo | **Contratista** | Contratista | Irrelevante: se paga el alcance | +5 % a +12 % de `CD` [SUPUESTO] |
| Llave en mano (EPC) | Contratista + riesgo de **diseño** | Contratista | Contratista | +12 % a +20 % [SUPUESTO] |
| Administracion delegada | Entidad | Entidad | Entidad | Honorario 5-10 % [SUPUESTO]; margen bajo pero `CEM` casi nulo |

Los rangos de prima son **criterio de ingenieria de costos, sin medicion propia detras** [SUPUESTO —
pendiente del vacio nº 5]. La regla formal:

```
prima_global = E[sobrecosto de cantidades] + λ · σ(cantidades)     con λ ≈ 1 para el contratista pequeño
```

**Cuantificacion del peligro.** Con `m` = 6 % sobre `P`, la utilidad son 60 MM y el `CD` 940 MM: una
desviacion de cantidades de **+6,4 % sobre `CD`** borra la utilidad completa. Dicho de forma
operativa: **basta un error de +25 % en un item que pese el 25 % del `CD` (o +6,4 % repartido en todo
el presupuesto) para dejar el contrato en cero. Con `m` = 6 %, el margen equivale a 0,064 veces el
`CD`: esa es toda la holgura disponible frente al error de medicion.**

Conclusion practica para Helder/Genesis: precio global fijo solo con (a) cantidades verificadas en
campo por cuenta propia, (b) diseño de fase III entregado, y (c) margen objetivo ≥ 12 %. Sin las
tres, se rechaza. Llave en mano: fuera del apetito — traslada ademas el riesgo de diseño, que un
contratista sin area de ingenieria no puede cuantificar.

**Mayores cantidades de obra ≠ obras adicionales** (distincion que decide si hay que firmar contrato
adicional o basta un acta):

| Figura | Que es | Instrumento | Efecto |
|---|---|---|---|
| **Mayores cantidades de obra** | Mas cantidad de un item **que ya esta** en el presupuesto contratado, a su mismo precio unitario | Acta de mayor cantidad; no cambia el objeto | Solo aplica en precios unitarios; en global fijo **las absorbe el contratista** |
| **Obras adicionales** | Items **nuevos**, no previstos, con precios que hay que pactar | Contrato adicional con precios no previstos acordados | Requiere acuerdo formal antes de ejecutar; ejecutar sin el es riesgo de no pago |
| **Tope de adicion** | El valor del contrato no puede adicionarse en mas del **50 % de su valor inicial**, expresado en SMMLV (Ley 80/1993, art. 40 par.) | — | [CONOCIDO] — no verificado en esta sesion. Es un **techo duro** del modelo: no se puede planear recuperar margen via adiciones |

### 3. Subcontratacion significativa

| Dimension | Efecto | Comentario |
|---|---|---|
| Margen | **Baja**: se cede el AIU del alcance subcontratado | Un 40 % de obra subcontratada con 3 pts cedidos baja `m` de 6 % a ~4,8 % |
| Riesgo tecnico | **Se transfiere al subcontratista**, pero la responsabilidad frente a la entidad sigue siendo 100 % del contratista | Unico efecto favorable, y es parcial |
| Flujo de caja (`CEM`) | **AMBIGUO** — **baja** si al subcontratista se le paga contra acta aprobada (es el sub quien financia el capital de trabajo); **sube** si se le paga a 30 dias mientras la entidad paga a 60-90 | El modelo debe pedir `plazo_pago_sub` en dias y **calcularlo, no asumirlo**. Es la razon principal por la que un contratista pequeño subcontrata: con recursos propios paga nomina semanal y materiales a 30 dias |
| Laboral | **Solidaridad**: el beneficiario de la obra responde solidariamente por salarios, prestaciones e indemnizaciones del personal del contratista independiente, salvo labores extrañas a su actividad normal (CST art. 34) | [CONOCIDO] — texto literal no verificado en esta sesion |

Conclusion practica: subcontratar **siempre** cede margen y **no** reduce la exposicion legal; reduce
el riesgo de ejecucion y **puede** reducir o aumentar el capital expuesto segun el plazo de pago
pactado. En el modelo entra como `pct_subcontratado` que castiga `U` de forma incondicional y mueve
`CEM` **en el signo que resulte del calculo**, nunca en un signo asumido de antemano.

### 4. Modalidad de seleccion y margen

| Modalidad | Oferentes tipicos | Presion sobre precio | Costo de preparar oferta | Margen esperado |
|---|---|---|---|---|
| Licitacion publica | 8-40+ | **Alta, pero el criterio de precio se resuelve por formula SORTEADA** — el menor valor solo gana en 1 de 4 escenarios | Alto (pliegos tipo, personal, experiencia) | 4-7 % |
| Seleccion abreviada de menor cuantia | 5-20 | Alta, con manifestacion de interes y sorteo | Medio | 5-8 % |
| Subasta inversa | 3-10 | **Maxima**: puja a la baja en vivo | Bajo-medio | 2-5 % |
| Concurso de meritos | 3-15 | **Nula sobre el precio** | Alto (hojas de vida, metodologia) | 8-15 % |
| Minima cuantia | 5-30+ | Alta (gana el precio mas bajo habilitado) | **Muy bajo** | 3-6 % |

Los conteos de oferentes son ordenes de magnitud [CONOCIDO]. **Toda la columna «Margen esperado» es
[SUPUESTO]** — no hay medicion propia detras; queda pendiente del vacio nº 5 y no debe codificarse
como coeficiente.

**Sobre el dato real de competencia, con la reserva que exige la memoria del proyecto.** La app tiene
la **maquinaria** para el dato real (`lib/indice_competencia.js` promedia oferentes sobre el
historico), pero que el dato **exista** depende de dos condiciones que hay que comprobar antes de
confiar en el:

1. que el **backfill del historico se haya ejecutado** (`/api/sync/historico`, manual, con
   `HISTORICO_TOKEN`);
2. que `indice:competencia:meta.clasificadas` sea **> 0** y `descartados.sin_oferentes` sea bajo.
   Si `clasificadas: 0`, **la columna de oferentes aun no se ha identificado** (se lee por lista de
   candidatas, y `CLAUDE.md` la declara PENDIENTE DE VERIFICACION) y el indice esta entero en
   `sin_dato`.

Cumplidas las dos, se usa el indice y la modalidad queda solo como respaldo. Sin cumplirlas, la tabla
de arriba es lo unico que hay y sigue siendo [SUPUESTO].

#### Metodo de evaluacion economica (sorteo) — el caso de borde central de la formacion de precio

En los Documentos Tipo de infraestructura la evaluacion del componente economico **no es «gana el mas
barato»**: el pliego lista un conjunto de formulas alternativas y **una de ellas se selecciona por
sorteo determinado por la TRM** vigente el dia de presentacion de ofertas (el pliego publica los
rangos de TRM y la formula que corresponde a cada rango). Nadie conoce la formula al preparar la
oferta. [CONOCIDO] — **la lista exacta de formulas depende de la version del Documento Tipo y SE LEE
DEL PLIEGO**; no se pudo confirmar la version vigente en esta sesion.

| Familia de formula | Como puntua | Estrategia optima del oferente |
|---|---|---|
| **Menor valor** | Puntaje maximo a la oferta mas baja habilitada | Ofertar en el minimo viable |
| **Media aritmetica** (de las ofertas habilitadas, con o sin el presupuesto oficial) | Puntaje maximo al mas cercano a la media | Ofertar **cerca de la media esperada**; el minimo pierde |
| **Media aritmetica alta / baja** | Media de un subconjunto (por encima o por debajo de la media) | Depende del subconjunto; el minimo casi nunca gana |
| **Media geometrica** (con o sin presupuesto oficial) | Puntaje maximo al mas cercano a la media geometrica | Ofertar cerca del estadistico; el minimo pierde |
| **Mediana / valor absoluto** | Puntaje maximo al mas cercano al estadistico central | El minimo pierde |

**Consecuencia operativa, que cambia el consejo de precio de toda la seccion:** bajo media geometrica
o media aritmetica, **ofertar el precio mas bajo es una estrategia perdedora**. La oferta optima no
es la mas baja sino **la mas cercana al estadistico que salga sorteado**, y como el sorteo es
posterior al cierre, la estrategia correcta es **ofertar cerca de la media esperada del pliego, no en
el minimo**. Corolario para el modelo: el precio no se recomienda por minimizacion, y sin conocer la
familia de formula el modelo devuelve un **rango**, no un punto.

Dos observaciones mas que cambian estrategia:

- **Minima cuantia**: costo de preparacion casi nulo, pero es una loteria de precio. El calculo
  correcto no es el margen sino el **valor esperado**: `VE = P(ganar) × U − costo_oferta`. Con costo
  de oferta bajo, presentarse a muchas es racional aunque `P(ganar)` sea 5 %. Es el unico caso donde
  la estrategia de volumen domina.
- **Concurso de meritos**: el precio **no es factor de calificacion** — se evalua experiencia,
  equipo y metodologia, y la propuesta economica va en sobre aparte que se abre solo al mejor
  calificado, para verificar consistencia [CONOCIDO]. Consecuencia: es donde vive el margen alto y
  donde la ventaja competitiva es el RUP y las hojas de vida, no el precio. **Pero es consultoria e
  interventoria, no obra**: para Helder/Genesis es una linea distinta de negocio, y presentarse
  exige verificar que el objeto sea de consultoria y no obra mal codificada.
- **Subasta inversa en obra es una señal de alerta**: la subasta esta reservada a bienes y servicios
  de caracteristicas tecnicas uniformes [CONOCIDO], y la obra publica no lo es. Una «obra» publicada
  por subasta inversa suele ser suministro disfrazado — coincide exactamente con lo que ya detecta
  la capa anti-suministro de `lib/filtros.js`, y sirve de contraste independiente.

### 5. Pago en especie, con titulos y vigencias futuras

El pago con **bonos o TIDIS no ocurre en obra municipal** [CONOCIDO]. (Las estampillas **no son una
forma de pago**: son una deduccion parafiscal sobre cada acta — ver seccion 0.) Lo que si aparece de
verdad es otra cosa:

| Forma | Que es | Riesgo real | Efecto en el modelo |
|---|---|---|---|
| **Vigencias futuras** | El contrato compromete presupuesto de años siguientes, con autorizacion previa (CONFIS / concejo o asamblea; Ley 819/2003 arts. 10-12) [CONOCIDO] | **Politico**: cambio de administracion, recorte, mora | Sube `T`, sube `CEM`, añade `p_impago` |
| Pago por valorizacion | Se paga con el recaudo de la contribucion | Recaudo real < proyectado | Riesgo de plazo de pago, no de monto |
| **Pago diferido** | Pago a un plazo pactado en el propio contrato | Financiero | Descontar los flujos a la **tasa de oportunidad propia**, no al valor nominal |
| **Obra por impuestos** | **No es contrato estatal.** Un contribuyente privado paga su impuesto de renta ejecutando una obra publica (Ley 1819/2016 art. 238 — ZOMAC — y art. 800-1 del ET — convenios). El **credito fiscal / TRECO es del contribuyente, no del constructor**: el constructor es proveedor de ese privado y cobra en pesos [CONOCIDO] | **Contraparte privada**, sin las garantias ni la via de cobro de la Ley 80 | Se modela como cliente privado: exigir garantia de pago, anticipo real y verificacion de solvencia. No aplica ninguna de las reglas de esta seccion pensadas para entidad estatal |

Regla practica sobre vigencias futuras: el art. 12 de la Ley 819/2003 restringe autorizarlas en el
**ultimo año de gobierno** de gobernadores y alcaldes, salvo excepciones [CONOCIDO] — verificar el
texto vigente. Para el modelo: descontar los flujos que caen en vigencia futura a la tasa de
oportunidad propia y añadir un castigo explicito si el contrato cruza un cambio de administracion
(elecciones territoriales; la proxima ordinaria seria oct-2027 [INCIERTO], confirmar calendario CNE).

### 6. Otros casos de borde detectados

| Caso | Variable que toca | Efecto | Conclusion practica |
|---|---|---|---|
| **Contrato sin formula de reajuste** | `CD` | Con 18 meses de plazo y 6 % de inflacion de insumos, **un margen del 6 % se anula entero** | Exigir formula de ajuste y verificar **cual indice usa el pliego** (ICCP / ICOCED / IPP: no son intercambiables). El indice se aplica como **VARIACION entre la fecha base del presupuesto y la del acta**, nunca como nivel absoluto — confundir un indice de variacion con un nivel de precio es un error de orden de magnitud |
| **Imprevisto (`I` del AIU) consumido** | `U` | El `I` cubre **riesgo previsible no cuantificado**, NO fuerza mayor. Agotado el `I`, el sobrecosto sale de la utilidad. Ademas, el `I` no consumido la DIAN lo trata como utilidad gravada | Modelar `I` como un **colchon con probabilidad de consumo** y reportar `U` **neta del `I` esperado consumido**. La fuerza mayor se tramita por **restablecimiento del equilibrio economico**, no descontandola del `I` |
| **Interventoria dura** | `A` (administracion) ↑, plazo de acta ↑ | +1-2 pts de costo indirecto y actas devueltas [SUPUESTO] | Sube `CEM` por retraso, no por monto. Castigar entidades con historial de mora |
| **Predios no adquiridos** | `T` ↑, `CEM` ↑ | Suspension con costos fijos corriendo | **Descartar o exigir clausula de suspension con reconocimiento**. Es **una de las causas recurrentes** de obra parada segun los informes de obras inconclusas de la Contraloria [PENDIENTE DE VERIFICAR: citar el informe y su año] |
| **Licencia ambiental no obtenida** | `T` ↑, riesgo binario | Puede no llegar nunca | Igual que predios: no es un descuento de margen, es una opcion de perdida total |
| **Consorcio / union temporal** | `U` se reparte por % de participacion; la responsabilidad es **solidaria al 100 %** | Se cede utilidad sin ceder riesgo | El `K` del plural es la **SUMA de las CRP de los integrantes** (`lib/capacidad.js:103-105`, Guia CCE-EICP-GI-22) — nunca el promedio. Los indicadores habilitantes si van ponderados 50/50 (D. 1082) |
| **Adenda que cambia cantidades** | `CD` recalculado despues del APU | El APU queda obsoleto en silencio | Invalidar el calculo al detectar adenda y re-correr. **Nunca conservar un APU con fecha anterior a la ultima adenda** |
| **Presupuesto oficial cero o ausente** | `P` = 0 | Todo indicador derivado se vuelve absurdo | Ya tratado: los destacados del panel descartan cuantia 0 |

Nota sobre consorcio: la responsabilidad solidaria significa que si el socio incumple, la entidad
cobra a Helder el 100 %. El reparto de utilidad debe entrar en el modelo como `U × pct_participacion`
mientras que el riesgo entra como `100 %`. Un modelo que reparta ambos por porcentaje **subestima el
riesgo sistematicamente**.

### 7. Pruebas de coherencia del modelo (invariantes)

Escritas como afirmaciones verificables, al estilo de las que ya vigila el repo:

| # | Invariante | Por que importa |
|---|---|---|
| I1 | Si `anticipo_pct` sube y todo lo demas es igual, `CEM` **no puede subir** y `CRPC` **no puede subir** | Detecta signo invertido en la mecanica de amortizacion |
| I2 | Si el numero esperado de oferentes sube, `P(ganar)` **no puede subir** | Monotonia del indice de competencia |
| I3 | `CD_total` == materiales + mano de obra (con factor prestacional) + equipo y herramienta menor + transporte; tolerancia ≤ 1 COP. **Los indirectos NO entran en `CD`** | Meterlos en `CD` duplicaria la administracion — una vez dentro del `CD` y otra dentro del AIU — e inflaria el precio ofertado |
| I3b | `Precio_oferta` == `CD × (1 + A + I + U)`, y `A` **no puede aparecer tambien dentro de ningun APU** | Cierra la puerta a la doble contabilizacion que I3 abria |
| I4 | Ningun indicador derivado (promedio, mediana, prima, `P(ganar)`) se publica con muestra por debajo de su minimo; se publica el **conteo**, que si es un hecho | Es literalmente la cerradura de `registroPublicado` / `competenciaDe` ya implementada |
| I5 | `anticipo_pct = 0` **nunca** produce una cifra de rentabilidad presentada como estimacion: solo cota inferior marcada | Doctrina «0 = sin dato» de `CLAUDE.md` |
| I6 | Con `sistema = precio_global_fijo`, el margen exigido es **estrictamente mayor** que con `precios_unitarios` para el mismo objeto | La prima de riesgo no puede ser cero |
| I7 | Subcontratar **no puede aumentar `U`** (siempre se cede AIU). El efecto sobre `CEM` **se calcula, no se asume**, y el modelo **rechaza el calculo** si `plazo_pago_sub` es desconocido | Evita a la vez modelar la subcontratacion como ahorro puro y hornear un signo falso en el flujo de caja |
| I8 | El `K` del consorcio == suma exacta de las CRP de sus integrantes, y es **≥** la CRP de cualquiera de ellos | Ya probado en `lib/capacidad.js`; extenderlo al modelo de rentabilidad |
| I9 | `ROIC` es indefinido (no infinito, no cero) cuando `CEM ≤ 0`; se reporta como «financiado por la entidad» | Un `CEM` cero por anticipo alto no puede imprimir un ROIC absurdo |
| I10 | Si el proceso tiene adenda posterior a la fecha del calculo, el resultado se marca **caducado** y no se muestra como vigente | Impide decidir sobre cantidades viejas |
| I11 | Alargar el plazo (`T` ↑) con todo lo demas igual **no puede aumentar** `ROIC_anual`. `T` se mide del primer desembolso al ultimo cobro, no de la duracion del contrato | Chequeo de la anualizacion, y cierra la puerta a usar el plazo contractual como si fuera el de exposicion |
| I12 | El modelo **no publica `m` sin haber leido las deducciones del pliego**; si no constan, `m` se reporta como **cota SUPERIOR** | Un bloque de deducciones de hasta ~10 % de `P` es mayor que el margen tipico: omitirlo invierte el signo del negocio |
| I13 | El modelo **nunca recomienda un precio por minimizacion**; sin conocer la formula de evaluacion economica, reporta el **rango**, no un punto | Bajo media geometrica o aritmetica, el minimo es una estrategia perdedora |
| I14 | Ninguna tabla mezcla una `U` **antes** de renta con un costo financiero **despues** de renta; toda cifra de rentabilidad declara su punto de corte fiscal | Un ROIC del 20 % antes de renta y uno del 20 % despues son decisiones distintas |

#### Vacios y siguiente paso

1. **Texto literal de las normas citadas: no verificado.** Los portales normativos
   (funcionpublica.gov.co, secretariasenado.gov.co, alcaldiabogota.gov.co, colombiacompra.gov.co)
   devolvieron **HTTP 403** en esta sesion y el presupuesto de WebSearch estaba agotado. Quedan como
   [CONOCIDO]: Ley 1474/2011 art. 91 (patrimonio autonomo del anticipo **y su excepcion de menor y
   minima cuantia**), Ley 80/1993 art. 40 par. (tope de anticipo 50 % y tope de adicion 50 %),
   CST art. 34 (solidaridad laboral), Ley 819/2003 arts. 10-12 (vigencias futuras), Ley 1150/2007
   art. 2 (modalidades), Ley 1819/2016 art. 238 y ET art. 800-1 (obras por impuestos).
   **Siguiente paso:** abrir los textos desde una red sin allowlist y pegar la cita literal con su
   URL antes de que ninguna de estas reglas se codifique.
2. **Contribucion especial del 5 %: vigencia 2026 sin confirmar.** Es la deduccion mas grande y la
   unica de vigencia temporal. **Siguiente paso:** leer el texto consolidado del art. 120 de la
   Ley 418/1997 y la ultima ley de prorroga (se citan Ley 1106/2006, 1430/2010, 1738/2014, 1941/2018
   y 2272/2022) para fijar la fecha de expiracion vigente. Hasta entonces, el 5 % se aplica en el
   modelo como **escenario conservador marcado**, no como hecho.
3. **Tope conjunto contribucion + estampillas del 10 %: [INCIERTO].** Se cita de forma corriente pero
   **no se identifico la norma** que lo establece. **Siguiente paso:** buscar el articulo (o
   descartar el tope) antes de usarlo como limite duro; mientras tanto, sumar las tarifas leidas del
   pliego sin recortarlas a un tope que quiza no exista.
4. **Formulas de evaluacion economica: version del Documento Tipo sin confirmar.** El mecanismo
   (varias formulas, seleccion por rango de TRM del dia de cierre) es solido, pero **la lista exacta
   y los rangos cambian por version**. **Siguiente paso:** descargar el Documento Tipo vigente de
   licitacion de obra publica de infraestructura de transporte desde Colombia Compra Eficiente y
   copiar la tabla de formulas y de rangos de TRM. Operativamente el pliego de cada proceso ya la
   trae: el modelo debe **leerla del pliego**, no de una tabla propia.
5. **Sistema de precios (global fijo vs unitarios): no consta en el corpus.** `lib/proyeccion.js` no
   proyecta ninguna columna de sistema de precios. **Siguiente paso** — [PENDIENTE DE VERIFICAR EN
   PRODUCCION], consulta SoQL a lanzar cuando haya acceso a datos.gov.co:
   `https://www.datos.gov.co/resource/p6dx-8zbt.json?$select=:*,*&$limit=1` y revisar el listado de
   columnas buscando `sistema_de_precios`, `forma_de_pago`, `tipo_de_contrato`. Mientras no exista,
   el sistema de precios debe inferirse del objeto o quedar en `desconocido` — **jamas asumir
   unitarios por defecto**, que es el supuesto optimista.
6. **Vigencias futuras: sin columna conocida.** Consulta a probar:
   `$select=count(*)&$where=upper(descripci_n_del_procedimiento) like '%VIGENCIA%FUTURA%'`. Si el
   volumen es material, vale una regla de texto en `lib/semantica.js`; si es marginal, no.
7. **Numero real de oferentes por modalidad: no calculado.** El dato vive en el corpus historico y
   **no requiere red UNA VEZ ejecutado el backfill** — pero el backfill (`/api/sync/historico`) es
   manual, exige `HISTORICO_TOKEN`, si requiere acceso a datos.gov.co y **esta pendiente**.
   **Siguiente paso:** (a) ejecutar el backfill; (b) comprobar
   `indice:competencia:meta.clasificadas > 0`; (c) solo entonces agrupar el historico por
   `modalidad_de_contratacion` y promediar `oferentesDe()` para reemplazar la tabla de la seccion 4
   por cifras propias.
8. **Primas de riesgo (5-12 % global fijo, 12-20 % llave en mano): [SUPUESTO] indefinido.**
   **La prima de riesgo NO es observable en SECOP.** El cociente `adjudicado / presupuesto` mide la
   **baja** — presion competitiva y colchon del presupuesto oficial — **no** el sobrecosto de
   cantidades ni el margen realizado; confundir baja con margen es exactamente el error que este
   informe quiere evitar, y no se arregla teniendo la columna de sistema de precios del vacio nº 5.
   La **unica validacion posible es interna**: comparar, en los contratos ya ejecutados por
   Helder/Genesis, la **cantidad de obra pagada contra la cantidad del pliego, item por item**, y
   calcular la distribucion de la desviacion. Sin ese dato propio, la prima queda como [SUPUESTO]
   indefinidamente y **no debe codificarse como coeficiente**.
   Objetivo **distinto y si medible con SECOP**: la **baja media por modalidad y por entidad**
   (`adjudicado / presupuesto` sobre el historico). Es un indicador util para calibrar el precio de
   oferta, y hay que declararlo como lo que es — presion competitiva, no rentabilidad.
9. **Margen esperado por modalidad y honorario de administracion delegada: [SUPUESTO].** Misma
   validacion interna del punto 8; ninguna de las dos columnas tiene medicion detras.
10. **Costos de fiducia, poliza y credito: cotizaciones pendientes.** `comision_fiduciaria`,
    `prima_poliza_buen_manejo` y `tasa_EA` son insumos que se piden a la fiduciaria, la aseguradora y
    el banco. **Siguiente paso:** guardarlos como parametros del perfil, no como constantes del
    codigo.
11. **Calendario electoral territorial: [INCIERTO].** Confirmar la fecha de las proximas elecciones
    de alcaldes y gobernadores en el CNE antes de codificar el castigo por cambio de administracion.
12. **Informe de obras inconclusas de la Contraloria: [PENDIENTE DE VERIFICAR].** Se necesita para
    respaldar la afirmacion sobre predios como causa recurrente de obra parada. **Siguiente paso:**
    identificar el informe y su año, y citar la cifra concreta o retirar la afirmacion.


---

## 3 — Plan de implementación priorizado

### 3.0 Principio rector: primero lo que no depende de nadie

El orden de las tres fases no es por valor percibido sino por **dependencia externa**. La regla es:

| Orden | Criterio | Por qué va ahí |
|---|---|---|
| 1.º | Solo datos que la app **ya tiene en Redis** | Coste marginal cero, no hay que negociar con nadie, y se verifica contra el propio corpus el mismo día que se despliega |
| 2.º | Fuente externa **gratuita** y descargable una vez | Introduce un tercero que puede cambiar de URL, de formato o desaparecer; exige un plan B por cada uno |
| 3.º | Dinero o **trabajo manual sostenido** | El coste es recurrente y solo se justifica cuando ya hay evidencia medida de que el paso anterior se quedó corto |

Hay una razón adicional, y es la que manda: **la Fase 1 genera los datos con los que se calibra la
Fase 2 y se decide si vale la pena la Fase 3**. Sin un índice de baja propio no hay forma de saber si
los precios de INVIAS están altos o bajos para el mercado real del dueño; sin margen histórico medido
no hay forma de saber si Construdata paga su suscripción. Invertir el orden es pagar por información
que todavía no se sabe leer.

Segunda razón, doctrinal: el repositorio se construyó sobre «cambios pequeños y directos» y
«degradación honesta» (`CLAUDE.md`). Todo lo de la Fase 1 son módulos hoja (`lib/*.js`) que se
enchufan en puntos de extensión que ya existen — `enriquecer()` en `lib/negocio.js`, el hash de
índices fuera de `licitaciones:*`, `ordenar_por=` en `/api/oportunidades`. Nada de la Fase 1 obliga a
una full ni toca la ingesta.

#### La excepción al orden: dos cosas de coste casi nulo que valen más que todo lo demás

El análisis de sensibilidad (§2.C.8) produjo un resultado que reordena el plan y que conviene decir
antes que nada, porque no es «desarrollo»:

1. **La contribución especial de obra pública del 5 %** (art. 6 de la Ley 1106 de 2006) es un
   **interruptor binario** que en el caso ejemplo vale 60,0 M COP sobre un contrato de 1.200 M — el
   doble de la utilidad antes de riesgo, y **le cambia el signo al veredicto**. Su aplicabilidad
   depende de si la vía se clasifica como terciaria en el pliego. No se estima: **se lee**.
2. **`τ_costo` (ICA + estampillas + contribución) varía entre 3 % y 12 % del contrato según el
   municipio**, es dato público, estable y conocido a priori. Es la mejor relación esfuerzo/beneficio
   de todo el proyecto: una tabla municipal construida una vez sirve durante años.

Ninguna de las dos es un problema de datos ni de modelo: son **lectura de normas locales**. Van en la
Fase 1 (entregable 8) y compiten en valor con cualquier cosa que se construya después.

### 3.1 FASE 1 — MVP con datos propios (semanas 1-6, coste cero)

Todo lo de esta fase vive en la **capa de consulta o en la de índices**, nunca en la ingesta. Ninguno
de estos entregables exige relanzar `/api/sync?modo=full`.

| # | Entregable | Qué hace | Datos | Dónde vive | Verificación | Esfuerzo |
|---|---|---|---|---|---|---|
| 1 | **Cobertura de columnas de adjudicación** | Cuenta, sobre el histórico ya bajado, cuántos procesos traen `precio_base`, valor adjudicado y n.º de oferentes | `licitaciones:historico:mes:*` | `api/diagnostico.js` (bloque nuevo `cobertura_historico`) | Los tres conteos suman el total del corpus histórico | 0,5 día |
| 2 | **Índice de baja** | Baja = `1 − valor_adjudicado / precio_base`; mediana y p25/p75 por entidad, departamento y tipología | Histórico | `lib/indice_baja.js`, hash `indice:baja`, construido en `/api/sync/historico?reconstruir_indice=true` | Misma prueba que competencia: el detalle recalcula y coincide con el hash | 4-5 días |
| 3 | **Clasificador de tipología de obra** | Etiqueta cada proceso: vías, acueducto/alcantarillado, edificación, urbanismo, eléctrica, obra menor, otros | Objeto + UNSPSC del corpus activo | `lib/tipologia.js`, campo derivado en `enriquecer()` | Reparto por tipología en `/api/resumen` que **suma exactamente los visibles** (cubeta `OTROS` obligatoria) | 3-4 días |
| 4 | **Riesgo territorial** | Marca PDET / ZOMAC / nivel de incidencia del conflicto y devuelve un recargo sugerido | `data/territorio.json` (DIVIPOLA) + `ciudad_entidad`/`departamento_entidad` | `lib/territorio.js` | Publicar el **% de procesos que casaron con un municipio**; sin match → `sin_dato`, jamás un recargo por defecto | 2-3 días (+ carga del JSON) |
| 5 | **Calculadora de rentabilidad** | Aplica la fórmula de §2.C con costos **tecleados por el dueño** | `config:costos:{perfil}` en Redis | `lib/rentabilidad.js` + `POST /api/admin/costos`, UI en `/admin.html` | Prueba numérica cerrada en `tests/e2e.js` (entradas fijas → margen esperado); reproducir los Casos A y B de §2.C.6 como fixture | 4 días |
| 6 | **Flujo de caja y capital de trabajo máximo** | Curva S por defecto sobre `precio_base` y `plazoMeses`; devuelve `K_max`, el pico de caja exigido | Corpus activo + `lib/capacidad.plazoMesesDe` | `lib/flujo_caja.js`, campo en la tarjeta | Con anticipo desconocido (`anticipo_pct=0` = sin dato) muestra **dos escenarios**, nunca uno solo | 3 días |
| 7 | **VEG (valor esperado de la ganancia)** | `VEG = P(ganar) · U_esperada − C_preparación`; nuevo `?ordenar_por=veg` | Índice de competencia + índice de baja + costos del dueño | `lib/veg.js`, consumido por `api/oportunidades.js` | Un proceso sin base de competencia **no recibe VEG** y cae al orden `atractividad` | 3 días |
| 8 | **Tabla de carga tributaria territorial** | `τ_costo` por municipio: ICA + estampillas + contribución del 5 % y su excepción de vías terciarias | `data/tributos_municipales.json`, leído a mano de acuerdos y ordenanzas | `lib/tributos.js` | Cobertura publicada: n.º de municipios cargados vs. municipios presentes en el corpus. Sin municipio cargado → `sin_dato`, **nunca un 7 % por defecto silencioso** | 2 días para los ~20 municipios que más publican |

Cinco precisiones que no se pueden saltar:

- **El entregable 1 va primero y condiciona a los demás.** Las candidatas de valor adjudicado y de
  n.º de oferentes en `lib/indice_competencia.js` son hoy una **lista sin verificar** (este entorno no
  alcanza `datos.gov.co`). Si ninguna existe, el entregable 2 no se puede construir y hay que
  resolver el nombre real antes de gastar cinco días.
- **El índice de baja se publica con el mismo contrato que el de competencia**: mínimo de procesos,
  `sin_dato` explícito, y ninguna cifra derivada por debajo del mínimo. La lección de «18.2 oferentes
  sin base» aplica igual a «baja del 12 %».
- **El VEG se añade como opción de orden, no reemplaza a `atractividad`.** Cambiar el default es una
  decisión del dueño (ver 3.5), no del plan.
- **`indice:baja` va fuera de `licitaciones:*`**, como los demás índices: ninguna purga del corpus lo
  toca y se reconstruye sin re-extraer nada.
- **El entregable 8 es el de mayor retorno por día invertido** y no depende de ninguno de los otros
  siete. Si hubiera que recortar la Fase 1, es el último que se cae.

### 3.2 FASE 2 — Fuentes externas gratuitas (meses 2-5)

Todas se cargan como **JSON versionado en el repositorio**, igual que `data/vocabulario_unspsc.json`.
Ninguna se descarga en tiempo de petición: un tercero caído no puede tumbar la app.

| Entregable | Dependencia externa | Riesgo real | Plan B |
|---|---|---|---|
| **Base APU de INVIAS** → `data/apu_invias/{version}.json` | APU Regionalizados de Referencia, 140 provincias, actualización semestral | Que se publique por regional en XLSX heterogéneo y no en tabla homogénea | Cargar a mano las 40-60 partidas que el dueño usa de verdad; el esquema es el mismo |
| **Catálogo de ítems INVIAS como clave primaria** → `data/catalogo_items_invias.json` | Artículos de las Especificaciones Generales de Construcción de Carreteras | Cambios de versión entre años que renumeran ítems | Guardar `version` en cada registro y no mezclar versiones en una misma biblioteca |
| **Índices DANE para actualizar precios** → `data/indices_dane.json` | **ICOCIV** (obras civiles) e **ICOCED** (edificación), mensuales | Confundir el índice con un nivel de precio (es **variación**, base 100) o arrastrar el ICCP, descontinuado en 2021 | Actualización **manual trimestral** de una tabla de 12 filas; es barata y el error es acotado |
| **Matriz regional calibrada** | Ninguna: sale del entregable 2 de la Fase 1 cruzado con `territorio.json` | Pocos datos por departamento | Colapsar a región (Caribe, Andina, Pacífica, Orinoquía/Amazonía) hasta que haya soporte |
| **Extracción del formulario de cantidades (Excel)** | Que el anexo esté publicado y sea `.xlsx` legible | **Alto**: `p6dx-8zbt` da la URL del proceso, no los anexos; y muchos van en PDF escaneado | Subida manual del Excel por el dueño a `POST /api/admin/cantidades`, misma vía que el RUP |

Regla transversal de la Fase 2: **nada de dependencias npm**. Un XLSX es un ZIP con XML; si el parseo
propio con `zlib` nativo se vuelve un proyecto en sí mismo, la respuesta correcta es el plan B
(subida manual), no meter una librería.

### 3.3 FASE 3 — Inversión o trabajo sostenido (mes 6+)

| Entregable | Coste estimado | Condición que lo justifica | Cómo se mide si valió |
|---|---|---|---|
| **Suscripción a Construdata** | **[INCIERTO]** — hay que cotizar; no se verificó precio | No antes de que la Fase 1 muestre ≥20 procesos analizados y un error de estimación medido contra ofertas reales | Error medio de estimación antes vs. después sobre las mismas partidas |
| **Scraping de retail con job externo** | 0 COP en GitHub Actions; ~2 días de montaje + mantenimiento | No antes de que el APU de INVIAS se quede corto en materiales locales concretos y contados | N.º de partidas donde el precio scrapeado cambió la decisión |
| **OCR de pliegos escaneados** | Coste por página de un servicio, o CPU propia | No antes de que ≥30 % de los procesos preseleccionados vengan solo en PDF escaneado | % de pliegos que pasan de ilegibles a explotables |
| **LLM en el circuito para extraer ítems** | Coste por proceso analizado; presupuesto mensual con tope | No antes de tener el catálogo de ítems (Fase 2) — sin destino canónico, la extracción no se puede validar | % de ítems extraídos que el dueño acepta sin corregir |
| **Calibración con ofertas propias** | 0 COP de dinero, ~15 min por oferta presentada | **Empieza el día 1** aunque el modelo llegue en el mes 6: sin registro no hay calibración posible nunca | Sesgo del margen estimado frente al margen real ejecutado |

El scraper y el LLM comparten una condición: **corren fuera de Vercel** (job externo que escribe a
Upstash por REST) para no meter latencia ni dependencias en las funciones serverless.

### 3.4 Lo que NO se debe hacer

- **Un APU completamente automático sin revisión humana.** Un APU es una oferta económica: firma
  responsabilidad. Un error de rendimiento en una partida se multiplica por la cantidad y se pierde
  el contrato o se pierde dinero ejecutándolo. El objetivo correcto es **un borrador que el dueño
  corrige en 20 minutos**, no un número que se manda sin mirar. La elasticidad de `C_directo_real`
  es 24,0 (§2.C.8): un error del 4,2 % en el APU se lleva toda la utilidad.
- **Una base de precios propia mantenida a mano para todo el país.** Son ~1.100 municipios × cientos
  de insumos, con desactualización continua. Es exactamente el trabajo que ninguna persona sola
  sostiene, y una base desactualizada es peor que no tenerla porque parece dato.
- **Un scraper de Construdata.** Es contenido de pago tras autenticación: hay problema legal y
  contractual, además de fragilidad técnica. Si el dato vale, se paga; si no vale, no se roba.
- **Un modelo de ML para predecir adjudicación sin datos de resultado.** Hoy hay cero ofertas propias
  registradas. Un modelo entrenado sobre adjudicaciones ajenas predice quién gana en general, no si
  gana el dueño, y llega con la seguridad falsa que da un número con decimales. Primero el registro
  (Fase 3, última fila), después el modelo.
- **Ordenar por margen.** El margen ordena al revés que el dinero (§2.C.5): un contrato de 200 M al
  6 % con 12 oferentes deja `VEG` = −3,0 M y uno de 1.200 M al 3,0 % con 3 oferentes deja +7,5 M.
- **Romper las invariantes ya probadas.** Nada de lo anterior puede hacer que un reparto deje de
  sumar los visibles, ni que `totales.visibles` dependa de filtros que elige quien consulta, ni
  introducir un segundo cálculo de una cifra que ya tiene su cálculo único.

### 3.5 Decisiones que el dueño debe tomar antes de empezar

| # | Pregunta | Qué cambia según la respuesta |
|---|---|---|
| 1 | ¿Qué tipologías de obra hace **de verdad** (no las que el RUP permite)? | Define el vocabulario del clasificador y qué 40-60 partidas se cargan primero. Si son 3 tipologías, la Fase 2 se reduce a la mitad |
| 2 | ¿Acepta que el orden por defecto pase de `atractividad` a `veg`? | Si la respuesta es no, el VEG es una columna más y baja de prioridad |
| 3 | ¿Está dispuesto a registrar cada oferta presentada (precio, margen, resultado)? | Si no, toda la calibración y el ML quedan fuera del plan de forma permanente, y hay que decirlo |
| 4 | ¿Se suscribe a Construdata, y en qué mes? | Un sí temprano permite saltarse la calibración artesanal de precios; un no obliga a que INVIAS + DANE sean la única fuente |
| 5 | ¿Cuáles son sus costos indirectos reales (AIU, pólizas, financiación)? | Sin esto la calculadora de rentabilidad no arranca: es entrada, no salida |
| 6 | ¿Cuánto le cuesta preparar una oferta (días-persona + pólizas + estudios)? | Es el término que resta en el VEG; sin él, el VEG es solo la utilidad esperada |
| 7 | ¿Qué umbral de margen mínimo lo hace desistir, y qué retorno le exige a su capital propio (`r_e`)? | Convierte el VEG en una recomendación accionable. **Sin `r_e` la lectura del ROIC no se puede emitir** (§2.C.5) |
| 8 | ¿Cuál es su cupo de afianzamiento con la aseguradora, y cuánto tiene comprometido? | Es la restricción **binding** real, por encima de la K de `lib/capacidad.js`: la póliza de estabilidad inmoviliza cupo cinco años, no `T` meses |

### 3.6 El primer paso concreto: lunes por la mañana

**Añadir a `/api/diagnostico` un bloque `cobertura_historico` que cuente, sobre el corpus histórico ya
en Redis, cuántos registros traen `precio_base`, cuántos traen valor adjudicado (probando una a una
las candidatas de los campos de adjudicación) y cuántos traen n.º de oferentes — y que devuelva el
nombre exacto de la columna que sí respondió.**

Por qué esa y no otra:

1. Es **media jornada** y no toca ni una regla de negocio; es lectura pura sobre datos que ya están
   bajados.
2. Es **útil por sí sola**: hoy nadie sabe si el dataset trae valor adjudicado, y ese mismo dato
   explica de paso por qué el índice de equivalencias puede estar en cero.
3. **Decide el resto del plan.** Si hay valor adjudicado, el índice de baja (entregable 2) es el
   siguiente y arrastra al VEG y a la matriz regional. Si no lo hay, esos tres se caen y la Fase 1 se
   reordena hacia tipología, territorio, tributos municipales y rentabilidad manual — que no dependen
   de esa columna.
4. Encaja con la doctrina: es exactamente lo que hace el resto del proyecto antes de tocar un filtro
   «porque salen pocos» — **mirar el diagnóstico primero**.

Si se prefiere confirmarlo contra la fuente en vez de contra el corpus, la consulta es esta (un
**400** significa que la columna no existe; un número, que sí):

```
https://www.datos.gov.co/resource/p6dx-8zbt.json
  ?$select=count(1)
  &$where=valor_total_adjudicacion IS NOT NULL
```

y se repite sustituyendo `valor_total_adjudicacion` por `valor_adjudicado`, `valor_adjudicacion`,
`nombre_del_proveedor`, `numero_de_ofertas` y `proveedores_unicos_con`. Alternativa sin adivinar
nombres: `https://api.us.socrata.com/api/catalog/v1?ids=p6dx-8zbt`, que devuelve el listado de
columnas del dataset **[CONOCIDO: endpoint del Discovery API de Socrata, no verificado en esta
sesión]**.

#### Vacíos y siguiente paso

| Vacío | Por qué no se pudo cerrar | Cómo se cierra |
|---|---|---|
| Nombre real de las columnas de valor adjudicado y n.º de oferentes | `datos.gov.co` bloqueado por la allowlist del proxy (`CONNECT 403`) — **[PENDIENTE DE VERIFICAR EN PRODUCCIÓN]** | El paso 3.6, o las consultas SoQL de arriba desde un navegador |
| Aplicabilidad de la excepción de vías terciarias a la contribución del 5 % | Vale 5 % del contrato y cambia veredictos de signo | Texto vigente del art. 6 de la Ley 1106/2006 + concepto DIAN + **clasificación de la vía en el pliego** |
| URL estable y formato exacto del paquete de APU de INVIAS | `WebFetch` devolvió 403 contra todos los hosts en esta sesión | Abrir el portal desde un navegador normal y guardar el enlace exacto y la vigencia publicada |
| Precio de la suscripción a Construdata | No verificado; no se debe estimar sin cotización **[INCIERTO]** | Pedir cotización directa antes de meter la cifra en cualquier cálculo de retorno |
| Si los anexos de cantidades son accesibles por API | El dataset da la URL del proceso, no los anexos | Abrir 10 procesos reales y contar cuántos publican `.xlsx` frente a PDF escaneado; con eso se decide entre extracción y subida manual |
| Cupo de afianzamiento y `r_e` del dueño | Son datos privados que nadie publica | Preguntarlos (3.5, filas 7 y 8). Sin ellos, dos de los cuatro filtros duros del §2.C.5 no se pueden aplicar |


---

## Anexo — Hoja de fórmulas, fuentes e invariantes

Anexo de consulta rápida. La derivación completa de cada término está en §2.C, y la tabla maestra de
variables —47 filas con definición, unidad, fuente, rango y regla de degradación— está en **§2.C.7**;
aquí no se repite, se resume lo que se usa a diario y se consolida lo que estaba disperso.

### A.1 El bloque de fórmulas, de arriba abajo

**Ingresos**

```
I_total   = V  +  a_adición · V · mc_adición  +  R_reajuste
a_adición = p_adición · m_adición
s(τ)      = τ^a / ( τ^a + (1−τ)^a ),   τ = t/T,   a ∈ [1.4, 2.5]   (obra pública municipal: 2.0–2.3)
Acta_t    = V · Δs_t,        Δs_t = s(t/T) − s((t−1)/T)
```

**Costos**

```
C_directo       = Σ_i  q_i · PU_i                                   ← del APU (Parte 1)
C_directo_real  = C_directo · (1 + δ_desperdicio) · (1 + δ_rendimiento) · F_región
C_indirecto     = Σ_j (dedicación_j · costo_mensual_j · T) + fijos_de_obra     ← función del PLAZO
C_garantías     = Σ_g  Suma_asegurada_g · tasa_g · vigencia_g/12 + fiducia + gastos

τ_costo         = τ_ICA + τ_estampillas + τ_contribución            ← costo definitivo
τ_caja          = τ_costo + τ_retefuente + τ_retegarantía + β + τ_reteIVA − τ_IVA_facturado
C_impuestos     = τ_costo · V
τ_IVA_facturado = 19 % · (AIU/V)        ← IVA sobre el AIU, NO sobre V
τ_reteIVA       = 15 % · τ_IVA_facturado

K_t             = Σ_{u≤t} (Ingresos_de_caja_u − Egresos_u)          ← negativo = capital expuesto
Ingresos_caja_t = Anticipo·1[t=1] + Acta_{t−DSO}·(1 − τ_caja) + Retegarantía·1[t=T+L]
C_financiero    = Σ_t  max(0, −K_t) · i_mensual,    i_mensual = (1+i_EA)^(1/12) − 1
C_oculto        = seguridad + gestión social + sobrecosto de MO local + pérdidas
```

**Riesgo**

```
PR      = Σ_k  p_k · c_k                                            ← tabla de eventos en §2.C.4
MG(n)   = λ · σ_est · E[Z_(n−1)] · C_directo_real                   ← maldición del ganador
λ       = promedio ponderado por la probabilidad de sorteo de cada mecanismo del pliego
          (cuatro mecanismos, sorteo uniforme → λ = 0,21)
```

| `n` oferentes | 3 | 5 | 6 | 8 | 12 |
|---|---|---|---|---|---|
| `E[Z_(n−1)]` | 0,56 | 1,03 | 1,16 | 1,35 | 1,59 |

**Resultado y decisión**

```
U_esperada = I_total − C_directo_real − C_indirecto − C_garantías − C_impuestos
                    − C_financiero − C_oculto − PR − MG(n)          ← ANTES de renta

m_neto     = U_esperada / V
C_variables= C_directo_real + C_impuestos + C_oculto
MC%        = (I_total − C_variables) / I_total
C_fijos    = C_indirecto + C_garantías + C_financiero + PR + MG(n)
PE_valor   = C_fijos / MC%              ← si PE_valor > V, no hay equilibrio alcanzable
K_max      = max_t ( −K_t )             ← el número que decide si la empresa PUEDE
ROIC       = (1 + U_esperada/K_max)^(12/(T+L)) − 1                  ← se compara con r_e, no con i_EA
Payback    = primer t con K_t ≥ 0                                   ← suele ser T+L, no T
VEG        = P(ganar) · U_esperada − C_preparación                  ← ORDEN PRIMARIO
Score_cap  = VEG / (K_max · (T+L)/12)                               ← desempate si el capital escasea
U_neta     = U_esperada · (1 − t_renta)
```

**Filtros duros, antes del orden y nunca como penalización suave**

1. `U_esperada ≤ 0` → fuera.
2. `K_max >` caja disponible + cupo de crédito → fuera. Ganar sin poder ejecutar es peor que perder.
3. `V` o la póliza de estabilidad por encima del **cupo de afianzamiento** → fuera.
4. Municipio en la lista de exclusión por seguridad → fuera.
5. `P(ganar) · U_esperada ≤ C_preparación` → no presentarse.

### A.2 Referencia rápida de variables

Las 18 que se tocan a diario. La tabla completa está en §2.C.7.

| Símbolo | Qué es | Rango típico | Por defecto si falta |
|---|---|---|---|
| `V` | Valor de la oferta | 200 M – 20.000 M COP | `precio_base`; si es 0, excluir |
| `T` | Plazo de ejecución | 3 – 24 meses | 12 y marcar |
| `L` | Cola hasta liquidación | 2 – 6 meses | 3 y marcar |
| `a` | Forma de la curva S | 1,4 – 2,5 | 2,0 (arranque lento) |
| `δ_desperdicio` | Exceso de desperdicio sobre el presupuestado | 0,02 – 0,08 | 0,04 |
| `δ_rendimiento` | Pérdida de rendimiento | 0,00 – 0,10 | 0,04 |
| `F_región` | Penalización **residual** si el APU no se regionalizó | 1,00 – 1,18 | **1,00** si el APU ya está regionalizado |
| `A%` | Indirecto sobre costo directo | 15 – 28 % | 20 % y marcar como estimado |
| `τ_costo` | ICA + estampillas + contribución | 3 – 12 % de `V` | 7 % y marcar; **2 % si se confirma la excepción de vías terciarias** |
| `τ_caja` | Descuento neto del acta | 35 – 50 % | 44 % |
| `α` | Anticipo | 0 – 50 % | **Dos escenarios (0 % y 30 %)**; `anticipo_pct = 0` es SIN DATO |
| `DSO` | Días entre acta y pago | 45 – 150 | 60 y marcar |
| `i_EA` | Costo de la deuda de capital de trabajo | 16 – 30 % E.A. | 20 % |
| `r_e` | Retorno exigido al capital propio | — | **Preguntar. Sin él no se emite la lectura de ROIC** |
| `PR` | Prima de riesgo | 2 – 4 % de `V` | 2,32 % (tabla §2.C.4) |
| `σ_est` | Error relativo del APU propio | 0,05 – 0,15 | 0,08 |
| `λ` | Peso de la maldición del ganador | 0,10–0,20 central; 0,30–0,50 menor valor | **0,21** (sorteo uniforme de 4 mecanismos) |
| `C_preparación` | Costo de preparar una oferta | 4,5 – 10 M COP (0,4–0,9 % de `V`) | 5,0 M |

### A.3 Mapa consolidado de fuentes

Recorre las secciones 1.A.1 a 1.B.2 y 2.B.1. Sobre el grado de verificación, ver la advertencia de la
cabecera: en esta sesión `WebFetch` devolvió 403 contra todos los hosts y solo funcionó la búsqueda.

**Precios y APU**

| Fuente | Qué aporta | URL | Acceso |
|---|---|---|---|
| INVIAS — APU Regionalizados de Referencia | La base maestra: APU por ~140 provincias, semestral | `invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia` | Gratuito |
| INVIAS — Análisis de Precios Unitarios (transparencia) | Punto de entrada institucional a los APU | `invias.gov.co/index.php/informacion-institucional/hechos-de-transparencia/analisis-de-precio-unitarios` | Gratuito |
| INVIAS — cartilla de reversión de precios ICOCIV | Procedimiento oficial para actualizar precios con el índice | `invias.gov.co/index.php/archivo-y-documentos/documentos-tecnicos/13724-cartilla-reversion-precios-...` | Gratuito |
| INVIAS — actualización de precios vigencia 2026 | Estado del proceso de actualización en curso | `invias.gov.co/publicaciones/9569/invias-invita-a-participar-en-la-actualizacion-de-precios-...` | Gratuito |
| IDU — portafolio económico / SIIPVIALES | Precios unitarios de referencia de Bogotá (lo que INVIAS excluye) | `idu.gov.co/page/siipviales/economico/portafolio` | Gratuito |
| INVIAS — datos abiertos (ArcGIS) | Red vial, geometrías, servicios REST | `inviasopendata-invias.opendata.arcgis.com` · `hermes.invias.gov.co/arcgis/rest/services/...` | Gratuito, programático |
| INVIAS — mapa de carreteras | Distancias y jerarquía de la red | `invias.gov.co/publicaciones/8734/mapa-de-carreteras` | Gratuito |
| Colombia Compra Eficiente — lista de precios y registro | Acuerdos marco y catálogos | `sintesis.colombiacompra.gov.co/content/lista-de-precios-y-registro-` | Gratuito |
| CCE — manual de cobertura de riesgo | Criterios de garantías y riesgo contractual | `colombiacompra.gov.co/wp-content/uploads/2024/08/cce_manual_cobertura_riesgo.pdf` | Gratuito |
| Gobernación de Cundinamarca — manual de precios | Ejemplo de lista territorial | `cundinamarca.gov.co/wcm/connect/...MANUAL` | Gratuito |

**Índices y macro**

| Fuente | Qué aporta | URL | Acceso |
|---|---|---|---|
| DANE — ICOCIV (obras civiles) | Índice **de variación** para actualizar precios de obra civil; mensual | `dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-obras-civiles-icociv` | Gratuito |
| DANE — ICOCED (edificaciones) | Ídem para edificación | `dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-de-edificaciones-icoced` | Gratuito |
| DANE — ICCP (histórico) | **Descontinuado**; solo para series anteriores a 2022 | `dane.gov.co/index.php/estadisticas-por-tema/precios-y-costos/indice-de-costos-de-la-construccion-pesada-iccp` | Gratuito |
| DANE — boletines mensuales | Anexos con la serie publicada | `dane.gov.co/files/operaciones/ICOCIV/bol-ICOCIV-*.pdf` | Gratuito |
| DANE — microdatos | Series y metodologías | `microdatos.dane.gov.co/index.php/catalog/711` | Gratuito, registro |
| Banco de la República — SUAMECA | TRM, tasas de interés, series económicas | `suameca.banrep.gov.co/estadisticas-economicas/catalogo` | Gratuito |
| Mintransporte — SICE-TAC | Costo de operación del transporte de carga por ruta: la vía para estimar fletes | `plc.mintransporte.gov.co/SiceTAC` · `mintransporte.gov.co/publicaciones/4462/sice-tac` | Gratuito |

**Territorio, riesgo y geografía**

| Fuente | Qué aporta | URL | Acceso |
|---|---|---|---|
| DANE — DIVIPOLA | Códigos oficiales de municipio: la llave para cruzar todo | `geoportal.dane.gov.co/servicios/descarga-y-metadatos/descarga-divipola` | Gratuito |
| DANE — DIVIPOLA municipios (XLSX) | Descarga directa | `geoportal.dane.gov.co/descargas/divipola/DIVIPOLA_Municipios.xlsx` | Gratuito |
| DANE — Marco Geoestadístico Nacional | Geometrías municipales, centroides | `geoportal.dane.gov.co/descargas/descarga_mgn/GuiaDescargaVisualiz_CO.pdf` | Gratuito |
| IGAC — datos abiertos | Cartografía base | `geoportal.igac.gov.co/contenido/datos-abiertos` | Gratuito |
| Colombia en Mapas | Visor y descarga de capas oficiales | `colombiaenmapas.gov.co` | Gratuito |
| IDEAM — DHIME | Series climáticas por estación: días de lluvia | `dhime.ideam.gov.co` | Gratuito |

**Contratación (SECOP)**

| Fuente | Qué aporta | URL | Acceso |
|---|---|---|---|
| SECOP II — procesos (`p6dx-8zbt`) | El corpus que la app ya ingiere | `datos.gov.co/resource/p6dx-8zbt.json` | Gratuito, API Socrata |
| Datasets adicionales identificados | Contratos, Fondo Adaptación (`8yvj-6du4`) y otros con señal de valor | `datos.gov.co/resource/{8yvj-6du4, ae7u-y7m2, e839-6uct, mzgh-shtp, uwns-mbwd, 32sa-8pi3}.json` | Gratuito, API Socrata |
| Socrata — Discovery API | Lista las columnas reales de un dataset sin adivinar nombres | `api.us.socrata.com/api/catalog/v1?ids=p6dx-8zbt` | Gratuito |
| SECOP II — ficha pública del proceso | Pliegos y anexos (no expuestos por la API) | `community.secop.gov.co/Public/Tendering/OpportunityDetail/Index` | Gratuito, sin API |

**Normativa y tributos**

| Fuente | Qué aporta | URL | Acceso |
|---|---|---|---|
| Función Pública — gestor normativo | Texto vigente de leyes y decretos | `funcionpublica.gov.co/eva/gestornormativo/norma.php` | Gratuito |
| Hacienda Bogotá — contribución de obra pública | Base gravable y aplicación de la contribución del 5 % | `haciendabogota.gov.co/es/sdh/contribucion-especial-por-contrato-de-obra-publica-...` | Gratuito |
| Hacienda Bogotá — ICA | Tarifas de industria y comercio | `haciendabogota.gov.co/es/impuestos/impuesto-de-industria-y-comercio-ica` | Gratuito |
| Ámbito Jurídico — estampillas en contratación | Análisis del tope agregado de estampillas | `ambitojuridico.com/noticias/tributario-y-contable/valor-de-estampillas-en-contratacion-publica-...` | Gratuito |

> **Fuentes de pago o sin vía programática:** Construdata (Legis) para edificación —imprescindible
> donde INVIAS no llega, precio a cotizar—, CAMACOL y CCI para índices gremiales, y el software de
> presupuestos (BC3/FIEBDC-3 como formato de intercambio). Detalle y ranking en §1.A.4.

### A.4 Invariantes que cualquier implementación debe cumplir

Escritas como afirmaciones verificables, al estilo de las que el repositorio ya prueba.

**De honestidad del dato**

1. Ningún indicador muestra una cifra derivada cuando la muestra está por debajo del mínimo. Un `0`
   en un conteo nunca puede originarse en un `undefined` (la lección de `i.total_procesos`).
2. `anticipo_pct = 0`, `oferentes = 0` y «municipio sin `τ_costo` cargado» significan **sin dato**, no
   cero. Un proceso sin base de competencia no recibe `VEG` ni `P(ganar)`.
3. Todo precio mostrado lleva su fecha de vigencia y su fuente. Un precio envejecido se marca; no se
   presenta como si fuera de hoy.
4. Ningún coeficiente sin calibrar se presenta como medición: o lleva rango, o lleva etiqueta.

**De consistencia aritmética**

5. Los componentes de costo suman el costo total: `U_esperada = MC% · I_total − C_fijos` se cumple
   por construcción, no por coincidencia.
6. Todo reparto suma los visibles (cubetas `OTROS` y `SIN_DATO` obligatorias), como ya exige
   `/api/resumen`.
7. En un formulario de cantidades parseado: `cantidad × unitario = total` por fila, y la suma de
   totales = presupuesto oficial. Es la validación que permite confiar en el parseo sin supervisión.
8. `F_región` no se aplica sobre un APU ya regionalizado. Se cuenta una vez o ninguna, nunca dos.

**De monotonía del modelo**

9. Si el anticipo sube, `K_max` no puede subir.
10. Si el número de oferentes sube, `P(ganar)` no puede subir y `MG(n)` no puede bajar.
11. Si el plazo se alarga sin obra adicional, `U_esperada` no puede subir (el indirecto es función
    del plazo).
12. Si `DSO` sube, `C_financiero` no puede bajar.

**De arquitectura**

13. Cada cifra tiene un único punto de cálculo. Un segundo cálculo «equivalente hoy» diverge a la
    primera corrección que se aplique a uno solo.
14. Los índices derivados viven fuera de `licitaciones:*` y se publican con swap atómico: nunca hay
    una ventana sin índice.
15. `totales.visibles` no depende de los filtros que elige quien consulta.
16. Ningún entregable de la Fase 1 obliga a relanzar una full ni toca la ingesta.


---

