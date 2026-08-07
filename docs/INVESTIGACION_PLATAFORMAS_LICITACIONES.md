# Investigación · Las cinco mejores plataformas de licitación pública del mundo

> Qué hace excelente a una plataforma de licitaciones, qué ofrecen las que mandan hoy, y qué
> podemos copiar, adaptar o mejorar en **Portafolio Estratégico**.
>
> Ago 2026 · Investigación de producto y UX. **No se implementó nada**: este documento recomienda.

---

## 0. Advertencia de método — leer antes de usar una cifra de aquí

Este entorno **no puede abrir ninguna de las plataformas estudiadas**. El proxy de salida bloqueó
todos los dominios que se intentaron: `ted.europa.eu`, `sam.gov`, `deltek.com`, `highergov.com`,
`mercadopublico.cl`, `colombiacompra.gov.co`, `datos.gov.co` e incluso `wikipedia.org`
(`EGRESS_BLOCKED` en los siete). Es la misma restricción ya documentada en
`docs/COMPLEMENTO_ANALISTA_LICITACIONES.md`, ahora un poco más ancha.

Consecuencia, dicha sin disimulo:

| Nivel de confianza | Qué lo sostiene | Cómo se marca |
| --- | --- | --- |
| **Alta** | Hecho estructural repetido por varias fuentes independientes y coherente con la naturaleza del sistema (ej.: TED se filtra por CPV y NUTS; SAM.gov tiene «Save Search» y «Follow») | sin marca |
| **Media** | Una sola fuente secundaria, normalmente un blog de un competidor o un comparador comercial | 🟡 |
| **Baja / marketing** | Cifra de un vendedor sobre sí mismo o sobre el dolor que dice resolver | 🚩 |

Tres cosas que **no** se hicieron y hay que saberlo:

1. **Nadie abrió las interfaces.** No hay capturas ni recorridos propios. Las descripciones de UX
   salen de documentación, reseñas (G2, Capterra, Gartner Peer Insights vía resúmenes de búsqueda) y
   de comparadores comerciales, que **tienen interés en que la plataforma que describen se vea mal**
   cuando son competencia. Se ha intentado usar solo lo que varias fuentes con intereses opuestos
   repiten.
2. **Los precios de las plataformas privadas son de terceros**, no de sus tarifarios: GovWin IQ no
   publica precio. Las horquillas ($12k–$42k/año) proceden de comparadores que venden alternativas.
   🟡 Sirven para el orden de magnitud, no para una negociación.
3. **Las cifras retóricas se marcan y no se usan para calibrar nada.** El mismo criterio que se
   aplicó al Manual del Analista («el 40 % de los procesos se define en el traslado» y compañía) se
   aplica aquí: 🚩 «el 85 % de las empresas pierde oportunidades por no tener filtros inteligentes»
   es marketing de un vendedor de filtros inteligentes.

**Regla operativa:** ninguna cifra de este documento entra en el código sin abrir antes su fuente
desde un entorno con salida a internet.

---

## 1. Resumen ejecutivo

### 1.1 El hallazgo central: el hueco que nadie ocupa

Las plataformas del mundo se reparten en tres capas que **casi no se tocan entre sí**:

```
   CAPA 1 · PUBLICACIÓN OFICIAL          CAPA 2 · INTELIGENCIA          CAPA 3 · COSTEO
   (gobierno, gratis, obligatoria)       (privada, cara, anglosajona)   (software de obra)

   SAM.gov · TED · SECOP II              GovWin IQ · HigherGov          STACK · PlanSwift
   Mercado Público · PNCP · PLACSP       GovTribe · Licitaciones.info   ProEst · Beck · Bluebeam

   "¿qué se publicó?"                    "¿a qué me presento?"          "¿cuánto cuesta hacerlo?"
        │                                      │                              │
        └──────── API / raspado ───────────────┘                              │
                                        ▲                                     │
                                        └────── ✗ NADIE CRUZA ESTA LÍNEA ─────┘
```

- **La capa 1 no decide nada.** Publica. SECOP II, TED y SAM.gov son sistemas de *publicidad y
  transacción*, diseñados para que la entidad cumpla la ley, no para que un contratista elija.
- **La capa 2 decide, pero a ciegas del costo.** GovWin IQ y HigherGov puntúan encaje, estiman
  probabilidad de ganar y venden *labor pricing data* — precios de mano de obra de referencia—, pero
  **ninguna arma un presupuesto unitario**. Su pregunta acaba en «¿me presento?».
- **La capa 3 cuesta el presupuesto, pero no sabe qué licitaciones existen.** El software de
  estimación de obra (US$1.500–8.000 por estimador/año 🟡) parte de un pliego que alguien ya decidió
  perseguir.

**Portafolio Estratégico es hoy la única herramienta que se conoce que recorre la línea entera**: de
«esta licitación existe» a «encaja con tu RUP y tu K» a «cuesta esto» a «oferta a este precio». El
lector de pliegos (`lib/apu_pliego.js`) es literalmente el puente que falta en el diagrama: convierte
el Formulario 1 de la capa 1 en las cantidades que necesita la capa 3.

Eso no es una ventaja de diseño: es una **ventaja de categoría**, y es lo que hay que proteger y
comunicar. Todo lo demás de este informe son detalles de ejecución comparados con eso.

### 1.2 Las cinco, en una tabla

| | **SAM.gov** | **TED** | **Mercado Público** | **GovWin IQ** | **SECOP II** |
| --- | --- | --- | --- | --- | --- |
| País/región | EE. UU. federal | UE + EEE | Chile | EE. UU. + Canadá | Colombia |
| Naturaleza | Oficial, gratis | Oficial, gratis | Oficial, gratis | Privada, cara | Oficial, gratis |
| Volumen | >24 000 avisos/mes 🟡 | >700 000 avisos/año | 899 352 órdenes de compra (2025) | agrega los anteriores | ~500 k filas/año (medido por nosotros) |
| Presentación | Tabla/lista | Lista + facetas | Lista + fichas | Tabla densa | Tabla |
| Búsqueda guardada | ✅ | ✅ (5 perfiles) | ✅ (con cuenta) | ✅ | 🟡 limitada |
| Alertas por correo | ✅ | ✅ + RSS | ✅ | ✅ | 🟡 solo del proceso propio |
| Seguir un proceso | ✅ *Follow* | 🟡 vía alerta | ✅ | ✅ pipeline | ✅ dentro del proceso |
| Competencia visible | ✅ *Interested Vendors List* | ✅ nº de ofertas recibidas (post) | ✅ histórico | ✅ incumbente + teaming | 🟡 lista de oferentes al publicarse |
| Predicción / probabilidad | ⬜ | ⬜ | ⬜ | ✅ *smart fit score* | ⬜ |
| Precios / costeo | ⬜ | ⬜ | 🟡 catálogo Convenio Marco | 🟡 *labor pricing* | 🟡 TVEC |
| API abierta | ✅ | ✅ sin clave | ✅ | ⬜ (de pago) | ✅ Socrata / OCDS |
| Diseño | Institucional (USWDS) | Institucional europeo | Institucional antiguo | «*clunky, dated*» 🟡 | Antiguo, inestable |
| Precio | Gratis | Gratis | Gratis | US$12k–42k/año 🟡 | Gratis por ley |

---

## 2. SAM.gov — Estados Unidos

**1. Nombre y URL** · System for Award Management · `https://sam.gov` (módulo *Contract
Opportunities*: `sam.gov/opportunities`).

**2. País/región** · Gobierno federal de Estados Unidos. Es el sistema único: absorbió FBO
(FedBizOpps), CCR, FPDS y —en curso— eSRS. Un solo dominio para registro de proveedor, avisos,
adjudicaciones y exclusiones.

**3. Qué hace** · Es a la vez el **registro obligatorio** del proveedor (UEI, CAGE) y el **tablón
oficial** de oportunidades federales. Sin registro en SAM.gov no se puede cobrar del gobierno
federal; sin mirar SAM.gov no se sabe qué se está comprando.

**4. Funcionalidades principales**

- Búsqueda de oportunidades por palabra clave, **NAICS** (actividad), **PSC** (producto/servicio),
  tipo de *set-aside* (reservas para pequeña empresa, veteranos, 8(a)…), agencia, lugar y fecha
  límite de respuesta.
- Filtro por **fecha de respuesta**, que descarta lo que ya no admite ofertas.
- Tipos de aviso diferenciados: *presolicitation*, *solicitation*, *award notice*, *sources sought*,
  *sole source*. **Cada tipo es una etapa distinta del ciclo** y se puede filtrar por ella.
- **Save Search** con nombre, y un menú *Actions* por búsqueda guardada: activar/desactivar
  notificación por correo, descargar resultados, renombrar, duplicar, borrar.
- **Follow**: lista corta de procesos seguidos; avisa de cambios de estado, respuestas a preguntas y
  adendas.
- **Interested Vendors List**: los proveedores pueden inscribirse públicamente en un proceso, y
  cualquiera con cuenta puede ver la lista.
- **Contract Award Data** (ex-FPDS) integrado: quién ganó, cuánto, con qué vehículo.
- API pública y descargas masivas.

**5. Diseño y UX** · Institucional, construido sobre el **U.S. Web Design System** (USWDS): 40+
componentes accesibles, WCAG 2.0 AA y Sección 508 por defecto, presente en 94 agencias y ~160 sitios.
Es **sobrio, accesible y consistente** — y deliberadamente aburrido. Navegación: buscador arriba,
facetas a la izquierda, resultados en lista con título, agencia, tipo de aviso y fecha límite.
No hay tablero, ni gráficos, ni nada que se parezca a analítica.

El punto débil de UX no es la estética sino **el volumen sin curaduría**: >24 000 avisos nuevos al
mes 🟡. La guía de uso más repetida por consultores no es «busca mejor» sino «**usa búsquedas
guardadas, no notificaciones sueltas**» — es decir, la propia comunidad reconoce que el flujo por
defecto ahoga.

**6. Datos que muestra de cada licitación** · Título, agencia y oficina emisora, número de
solicitud, tipo de aviso, NAICS, PSC, *set-aside*, lugar de ejecución, fechas (publicación,
preguntas, cierre), contacto del oficial de contratación, **documentos adjuntos** (PWS/SOW, donde
vive el requisito de verdad), historial de adendas y —si existe— la lista de interesados.
No publica presupuesto oficial de forma sistemática.

**7. Herramientas de análisis** · **Prácticamente ninguna dentro del módulo de oportunidades.** Hay
datos de adjudicación consultables (FPDS integrado) y descargas, pero no hay probabilidad, ni
gráficos, ni comparativas, ni scoring. Todo el análisis lo hace el ecosistema privado *encima* de
su API. Esa ausencia es exactamente la razón de existir de la capa 2.

**8. Puntos fuertes**

- **Fuente única y canónica.** Un identificador de empresa, un tablón, una verdad.
- **Accesibilidad real**, no declarada: el USWDS resuelve contraste, teclado y lectores de pantalla
  antes de que nadie lo pida.
- **La `Interested Vendors List` es la mejor señal de competencia *ex-ante* que publica un gobierno
  en el mundo**: se sabe quién está mirando el proceso **antes** de ofertar. Ninguna otra de las
  cinco tiene equivalente.
- **Tipología de avisos.** Distinguir *sources sought* de *solicitation* da meses de anticipación.

**9. Puntos débiles**

- **Volumen sin relevancia.** Sin criterio propio, la búsqueda devuelve ruido.
- **Registro doloroso**: UEI duplicados, CAGE duplicados, validación de dirección. 🟡 Encuestas de
  vendedores de servicios de registro hablan de 73 % de contratistas con retrasos y 12 días hábiles
  de resolución media — 🚩 cifra de parte interesada.
- **Cambios de layout sin aviso** que confunden en las dos direcciones: unos creen que cambió la
  norma y otros que ya no hay que revisar nada.
- Cero ayuda para decidir.

**10. Qué podemos copiar/adaptar**

| Idea | Adaptación a Portafolio Estratégico | Coste |
| --- | --- | --- |
| **Búsqueda guardada como objeto con acciones** | Guardar el conjunto de filtros con nombre en `config:busquedas:{perfil}`, con activar/desactivar aviso | Bajo |
| **`Follow` / seguimiento** | Marcar procesos y detectar cambios: la app ya deduplica por `:updated_at`, así que «este proceso cambió» sale gratis del dedup | Bajo |
| **Tipología de avisos = anticipación** | Nuestro equivalente es el **PAA** (§9.1-E). SAM.gov demuestra que separar «lo que van a comprar» de «lo que ya publicaron» vale dinero | Alto |
| **Interested Vendors List** | En Colombia SECOP II publica la lista de oferentes *cuando la entidad la publica*. Vale la pena medir cuántos procesos la traen antes del cierre | Medio |
| **Accesibilidad por defecto** | Nuestro rediseño Apple Glass es más bonito y **más frágil**: `backdrop-filter` sobre texto es justo lo que el USWDS no permitiría. Ver §9.2 y §9.5 | Bajo |

---

## 3. TED — Tenders Electronic Daily · Unión Europea

**1. Nombre y URL** · Tenders Electronic Daily, suplemento del Diario Oficial de la UE ·
`https://ted.europa.eu`.

**2. País/región** · 27 estados miembros + EEE + países candidatos y terceros. Publica lo que supera
los umbrales comunitarios; por debajo, cada país publica en su portal nacional (PLACSP en España,
etc.).

**3. Qué hace** · Es el **boletín oficial europeo de contratación**. Todo anuncio que supere umbral
tiene que publicarse ahí para ser válido. >700 000 anuncios al año; ~3,1 millones de anuncios de
adjudicación entre 2012 y 2022. 🚩 Una fuente secundaria cifra ese acumulado en «5,1 mil millones de
euros», lo que es imposible por tres órdenes de magnitud — ejemplo perfecto de por qué §0 existe.

**4. Funcionalidades principales**

- **Tres niveles de búsqueda**: rápida, avanzada y **experta**, esta última con lenguaje de consulta
  por campos (permite construir consultas que un buscador normal no expresa).
- Filtros: **CPV** (~9 000 clasificaciones producto/servicio, el equivalente europeo del UNSPSC),
  **NUTS** (región), país, tipo de contrato (obras/servicios/suministros), tipo de procedimiento
  (abierto, restringido, negociado), tipo de anuncio, valor y fechas.
- **Browse by Business Opportunity**: navegación por tipo de oportunidad sin registrarse.
- **Cinco perfiles de búsqueda guardados** por usuario registrado, con **alerta por correo y RSS**.
- **API sin clave**, JSON/XML, paginación hasta 15 000 anuncios y *scroll* ilimitado. Descargas
  masivas diarias y mensuales en XML.
- **eForms**: desde 2024 el formato obligatorio. Modelo de datos jerárquico y consistente, con SDK
  propio y documentación para desarrolladores.

**5. Diseño y UX** · Renovado en 2023-2024 junto con eForms: interfaz más limpia, buscador más
potente y contenido simplificado. Sigue siendo **institucional europeo**: multilingüe (24 idiomas),
denso, con jerga jurídica. La navegación por facetas es correcta; la ficha del anuncio es larga y
formularia porque **reproduce el formulario legal**, no una lectura de negocio.

Lo mejor de su UX es conceptual: **TED trata a los reutilizadores de datos como usuarios de primera
clase**. Tiene portal de desarrolladores, SDK, eventos anuales (*TED-together*) y talleres con
quienes construyen encima. Es el único de los cinco que asume que su interfaz **no es el destino
final del dato**.

**6. Datos que muestra** · Comprador y país; objeto; CPV; NUTS; tipo y valor estimado del contrato;
división en lotes; **criterios de adjudicación** (con su ponderación); plazos; requisitos de
participación; y, en el anuncio de adjudicación, **adjudicatario, valor adjudicado y NÚMERO DE
OFERTAS RECIBIDAS**.

Ese último campo merece énfasis: **TED publica de forma estructurada y obligatoria cuántos se
presentaron**. Es la materia prima del indicador europeo de «licitación con un solo oferente», que se
usa oficialmente como medida de competencia y como bandera roja de corrupción. Nuestro
`lib/indice_competencia.js` hace exactamente eso — pero teniendo que adivinar el nombre de la columna
en el dataset colombiano (ver `lib/columnas_historicas.js`). **En Europa ese dato es un campo del
formulario; en Colombia es una arqueología.**

**7. Herramientas de análisis** · En el portal, pocas. Fuera del portal, un ecosistema entero:
OpenTender (35 jurisdicciones), TED-DATA, el *Single Market Scoreboard* de la Comisión con
indicadores de competencia. La estrategia es explícita: **el análisis lo hace quien quiera, con el
dato abierto**.

**8. Puntos fuertes**

- **Estandarización.** eForms es la lección de producto más importante de las cinco: cuando el
  formulario es un modelo de datos, todo lo demás (búsqueda, API, análisis, IA) se vuelve barato.
- **API sin clave y sin fricción.** No hay registro, no hay cuota, no hay negociación.
- **Publicar la competencia como campo obligatorio.**
- **Criterios de adjudicación estructurados**: se sabe *cómo se va a evaluar* antes de ofertar.

**9. Puntos débiles**

- **Solo por encima de umbral.** El grueso de los contratos pequeños no está.
- **Multilingüe pero no traducido**: el anuncio está en el idioma del comprador; el resumen, no
  siempre.
- **Cinco búsquedas guardadas** es un límite arbitrario y bajo.
- **Ficha jurídica, no de negocio.** Nadie ha traducido el formulario a «qué significa esto para mí».
- Sin ninguna capa de decisión: TED no te dirá jamás que un pliego huele a sastre.

**10. Qué podemos copiar/adaptar**

| Idea | Adaptación | Nota |
| --- | --- | --- |
| **Búsqueda por texto libre** | 🚩 **`/api/oportunidades` no tiene ningún parámetro de texto** (verificado: doce parámetros documentados, ninguno de palabra clave). Las cinco plataformas abren con una caja de búsqueda. Ver §9.1-F | **Es la carencia más barata de todas** |
| **Búsqueda experta con lenguaje de consulta** | El endpoint acepta doce parámetros y la pantalla expone **nueve** (faltan `match` e `incluir_cerradas`). Falta además una «consulta avanzada» que construya la URL y **se pueda guardar y compartir** | La URL ya es el estado; hoy no se ofrece copiarla |
| **Criterios de adjudicación estructurados** | 🚩 `p6dx-8zbt` no los trae. Solo se obtendrían del pliego → es trabajo del lector de pliegos, no de la ingesta | Documentar como límite |
| **El número de oferentes como campo de primera** | Ya lo hacemos, y es nuestro activo. Lo que falta es **decir en pantalla que en Colombia ese dato es incompleto**, como hace `columnas_historicas` en el diagnóstico | Bajo |
| **Tratar al reutilizador como usuario** | No aplica (app privada), pero sí su corolario: **la URL con filtros es la API del usuario**. Botón «copiar enlace de esta búsqueda» | Muy bajo |

---

## 4. Mercado Público — ChileCompra · Chile

**1. Nombre y URL** · Mercado Público (`https://www.mercadopublico.cl`), operado por la Dirección
ChileCompra (`https://www.chilecompra.cl`). Datos: `https://datos-abiertos.chilecompra.cl` y
`analiza.cl`.

**2. País/región** · Chile, todo el Estado. Referente reconocido de Latinoamérica en compras
públicas y el caso que más citan OCP y el BID.

**3. Qué hace** · Plataforma transaccional única: licitaciones, **Compra Ágil** (compras menores
rápidas), **Convenios Marco** (catálogo con precios ya negociados), órdenes de compra y contratos.
En 2025: 1 140 organismos compradores y **899 352 órdenes de compra**; ChileCompra reporta ahorros
de **US$381 millones** en el año.

**4. Funcionalidades principales**

- Buscador público **sin cuenta**: licitaciones, órdenes de compra, contrataciones directas,
  consultas al mercado y **fichas de proveedor**.
- Filtros por ID, nombre, rubro, región y organismo comprador.
- Con cuenta de proveedor: guardar búsquedas, seguir procesos, recibir notificaciones, ofertar y
  descargar documentos.
- **Ficha única de proveedor** con la información legal, financiera y técnica de la empresa en un
  solo sitio — el equivalente chileno del RUP, pero *dentro* de la plataforma.
- **API pública** de Mercado Público; **nueva API de Compra Ágil** (2026) y una siguiente versión de
  las APIs prevista para el 2.º trimestre de 2026.
- **Datos Abiertos** con visualizaciones ciudadanas: qué compran, a quién, cuánto, cuántas
  licitaciones se declaran desiertas.
- **Analiza.cl**, desarrollado con el BID: análisis de compras públicas para proveedores,
  compradores e investigadores.
- **Observatorio ChileCompra**: detecta **vínculos societarios entre empresas** cruzando declaraciones
  juradas de socios y accionistas del Registro de Proveedores, más un panel analítico semestral del
  comportamiento de compra de cada organismo.

**5. Diseño y UX** · La cara pública se ha modernizado (home con accesos por tarea, buscador
prominente), pero el núcleo transaccional arrastra una plataforma antigua de formularios largos.
Está en marcha la **Plataforma Modular**, en pruebas *white label*, descrita por la propia agencia
como la mayor transformación tecnológica del sistema desde su creación: base común y módulos por
procedimiento, para desplegar por partes.

**6. Datos que muestra** · Ficha de licitación con organismo, ID, estado, fechas, bases, preguntas y
respuestas, ofertas y adjudicación; **ficha de proveedor**; órdenes de compra con montos. La ficha de
proveedor es una diferencia real: convierte al oferente en una entidad consultable, no en un nombre
suelto en un acta.

**7. Herramientas de análisis** · Las mejores de las cinco *entre las oficiales*, y están **fuera**
de la plataforma transaccional a propósito:

- **Datos Abiertos** con visualizaciones para no técnicos.
- **Analiza.cl** para análisis de mercado.
- **Observatorio** con detección de conflicto de interés por red societaria.
- **Monitoreo automatizado con IA** (2025): +207 % de reportes a órganos de control, >13 000
  notificaciones de alerta.
- **Para 2026**: alertas en línea que **advierten o bloquean una oferta en el momento de ingresarla**
  si detectan parentesco o sociedad prohibida; identificación automática por IA del producto que
  corresponde a cada descripción, enlazándolo con referencias de Convenio Marco y retail; y análisis
  asistido de bases de licitación.

**8. Puntos fuertes**

- **Cultura de dato abierto con co-creación**: el portal de datos abiertos se diseñó con sociedad
  civil en mesas mensuales. Es la única de las cinco que documenta haber preguntado a los usuarios.
- **La detección de red societaria** es una capacidad que ninguna otra tiene y que es *inteligencia
  de competencia disfrazada de probidad*: saber qué empresas comparten socios es saber quién compite
  de verdad contra quién.
- **Bloquear en el momento del error**, no después. Es la lección de UX más valiosa de esta
  plataforma: la validación que llega en la evaluación es un rechazo; la que llega al teclear es un
  producto.
- **Ficha de proveedor** como objeto de primera clase.

**9. Puntos débiles**

- Núcleo transaccional envejecido, en migración.
- La inteligencia está **repartida en tres sitios distintos** (Mercado Público, Datos Abiertos,
  Analiza.cl, Observatorio): el proveedor tiene que saber que existen.
- La IA anunciada apunta casi toda a **probidad y control**, poco al proveedor que quiere ganar.
- 🟡 Sin acceso directo no se pudo verificar la calidad real del buscador para un proveedor.

**10. Qué podemos copiar/adaptar**

| Idea | Adaptación | Prioridad |
| --- | --- | --- |
| **Validar en el momento del acto, no después** | Nuestro equivalente: los **9 errores que descalifican** del manual. Un checklist vivo en la ficha del proceso, con la regla de las 24 h como cuenta atrás | **Alta** |
| **Red de adjudicatarios** | El histórico ya guarda `adjudicatario`. Un índice `entidad → adjudicatarios recurrentes` es el 80 % del valor del Observatorio con el dato que ya está en Redis | **Alta** (§9.1-C) |
| **Ficha de proveedor** | Publicar la ficha del competidor: qué ganó, en qué entidades, con qué baja | Media |
| **Una sola casa para la inteligencia** | ChileCompra la dispersó y nosotros la tenemos junta. **No romper eso**: es una ventaja real de la página única | — |

---

## 5. Deltek GovWin IQ — inteligencia privada · EE. UU. y Canadá

*(con HigherGov y GovTribe como contraste, porque los tres definen el estado del arte de la capa 2)*

**1. Nombre y URL** · Deltek GovWin IQ · `https://www.deltek.com/products/govwin/`.
Contrastes: HigherGov (`highergov.com`), GovTribe (`govtribe.com`).

**2. País/región** · EE. UU. (federal + estatal/local «SLED») y Canadá.

**3. Qué hace** · Vende **anticipación y contexto**. No republica avisos: los enriquece con el
trabajo de **más de 150 analistas humanos** que llaman a oficinas de programa y sacan a la luz
oportunidades **años antes** de que exista un aviso público. Es capture management, no búsqueda.

**4. Funcionalidades principales**

- **Oportunidades pre-RFP** con seguimiento del analista desde previsión hasta adjudicación.
- **Notas de analista** por oportunidad (el diferenciador reconocido — y reservado a los planes
  altos).
- **Inteligencia competitiva**: análisis del **incumbente**, precios de mano de obra, descubrimiento
  de **socios para consorcio** (*teaming*).
- **Dela AI / Ask Dela**: resúmenes inteligentes de documentos y **puntuación de encaje**
  (*smart fit scores*) para calificar leads. Se está extendiendo a avisos SAM, SBIR/STTR y perfiles
  de empresa.
- Esquemas de propuesta y **matrices de cumplimiento** generadas.
- Analítica de gasto federal; perfiles de agencia y de empresa con visibilidad de adjudicaciones.
- Alertas configurables, seguimiento de oportunidades, integración nativa con el CRM/ERP de Deltek.

*HigherGov*: búsquedas y alertas ilimitadas, **pipelines** de captura, perfiles de adjudicatario
personalizables, base de personas de proveedores, datos de precios de mano de obra, herramienta de
solicitudes FOIA, **API incluida en todos los planes**, y una capa de IA. US$500/año 1 usuario ·
US$2 500/año hasta 10 🟡, autoservicio y con prueba gratuita.
*GovTribe*: recomendaciones por *machine learning* y **Beacon**, un grafo de contactos que mapea
oficiales de contratación y personal de programa 🟡.

**5. Diseño y UX** · Aquí está la lección más útil del informe, y es negativa. Las reseñas coinciden
de forma llamativa 🟡:

> «*clunky*», «*dated*», «*click-heavy*»; software empresarial clásico, con datos ricos pero difícil
> de navegar para un usuario nuevo; **semanas de uso y onboarding formal** antes de que la gente deje
> de rebotar. Fricción notable en búsquedas multi-término y filtros complejos. Ver las notas del
> analista exige entrar en cada oportunidad: **los usuarios piden un `hover`**.

Es decir: **la plataforma más cara y más completa del mundo pierde valor por no enseñar en la lista
lo que obliga a buscar en la ficha**. HigherGov ha crecido siendo «el sitio donde aterriza la gente
que se va de GovWin» 🟡, y su ventaja declarada no es más dato: es menos fricción y precio
transparente.

**6. Datos que muestra** · Todo lo de SAM.gov más: previsión (fecha estimada, presupuesto estimado,
oficina responsable), incumbente y fecha de recompetición, historial de adjudicaciones del
competidor, contactos, vehículos contractuales, y la nota del analista.

**7. Herramientas de análisis** · Las más completas del mercado: puntuación de encaje, analítica de
gasto, análisis de recompetición, perfiles comparados, resúmenes por IA.

Sobre la **probabilidad de ganar**, la doctrina del sector (no de un producto concreto) es explícita
y coincide con la nuestra 🟡:

- `PoA = Pgo × Pwin` — probabilidad de que el proceso **salga** por probabilidad de **ganarlo**.
- Modelos de **factores ponderados**: incumbencia, relación con el cliente, encaje de capacidades,
  posición competitiva.
- Umbrales de decisión: **<40 % → no-go; 41-65 % → revisión ejecutiva**.

Nuestro `lib/probabilidad.js` es de la misma familia, con dos diferencias a nuestro favor y una en
contra:
- ✅ **La nuestra se calcula sola** desde el histórico; la de ellos se teclea a mano en un
  formulario de scoring.
- ✅ **La nuestra se explica en seis pasos con aritmética escrita** (`lib/probabilidad_desglose.js`).
  Ninguna plataforma revisada publica cómo llega a su número.
- ⚠️ **La de ellos incorpora la relación con el cliente y la incumbencia**, que son los dos factores
  que más pesan de verdad y que nosotros no modelamos.

**8. Puntos fuertes**

- **Anticipación humana.** Es lo único que no se puede sacar de una API, y por eso cuesta
  US$12 000–42 000/año 🟡.
- **Incumbente y recompetición**: saber quién tiene el contrato hoy y cuándo vence.
- **Encaje puntuado** que convierte una lista en una cola de trabajo.

**9. Puntos débiles**

- **Precio opaco y alto**, cotización obligatoria.
- **UX pesada** y curva de aprendizaje de semanas.
- **Lo mejor está detrás del plan caro** (notas de analista).
- 🟡 Calidad de dato desigual fuera del mercado federal, y oportunidades que exigen suscripciones de
  terceros para verse completas.

**10. Qué podemos copiar/adaptar**

| Idea | Adaptación | Prioridad |
| --- | --- | --- |
| **Análisis de incumbente / adjudicatarios recurrentes** | El histórico ya lo permite. Es la señal #11 de pliego sastre del manual **con nombre y apellido** | **Alta** |
| **Pipeline de captura** (estado por oportunidad) | `interesado → preparando → presentada → ganada/perdida`, y el postmortem del mandamiento 19 pegado al estado final | **Alta** |
| **Encaje puntuado como cola de trabajo** | Ya tenemos puertas + probabilidad. Falta el **orden de trabajo**: qué mirar hoy | Media |
| **Enseñar en la lista lo que obliga a abrir la ficha** | Su defecto documentado. En nuestra tarjeta: baja del mercado, competencia y probabilidad ya están; el **veredicto del objeto** y el motivo, no siempre | Media |
| **Precio transparente y autoservicio** (HigherGov) | Si Portafolio Estratégico llegara a venderse, el modelo a copiar es HigherGov, no GovWin | — |
| ❌ **No copiar**: densidad empresarial que exige formación | Ver §9.3 | — |

---

## 6. SECOP II — Colombia · nuestra fuente

**1. Nombre y URL** · Sistema Electrónico de Contratación Pública II ·
`https://community.secop.gov.co` (transaccional), `https://www.colombiacompra.gov.co` (agencia),
`https://www.datos.gov.co` (datos abiertos). Operado por la ANCP - Colombia Compra Eficiente sobre
tecnología de Vortal 🟡.

**2. País/región** · Colombia, todo el Estado. Conviven SECOP I (publicidad), SECOP II
(transaccional) y TVEC (Tienda Virtual del Estado Colombiano).

**3. Qué hace** · Gestiona en línea el proceso completo: la entidad publica y evalúa, el proveedor
oferta, y **cualquiera consulta sin usuario ni clave**.

**4. Funcionalidades principales**

- **Búsqueda pública sin cuenta** por entidad, número de proceso, descripción del objeto, **códigos
  UNSPSC**, modalidad, estado y fechas (creación, publicación, presentación de ofertas, apertura).
  Con **Búsqueda Avanzada** para combinarlos.
- Ficha de proceso con **cronograma** (observaciones, ofertas, adendas, informe de evaluación),
  **configuración financiera** (plan de pagos, anticipos, garantías exigidas), documentos y mensajes.
- Plataforma en **tiempo real**: habilita y deshabilita acciones según el cronograma configurado.
- **Lista de oferentes** cuando la entidad la publica.
- Mensajería interna — con la trampa documentada en el manual: **los correos externos no cuentan**.
- **Datos abiertos** en Socrata (`p6dx-8zbt` procesos, `jbjy-vk9h` contratos electrónicos) y
  procesamiento en **OCDS**.

**5. Diseño y UX** · El punto débil reconocido **por la propia agencia**. El análisis técnico de la
ANCP señala problemas de rendimiento y disponibilidad, retrasos en la gestión contractual y altos
costos de mantenimiento; los incidentes pasaron de **4 552 (2022) a más de 17 000 (2023)** —🟡 la
fuente secundaria trunca la cifra como «17.78», así que el orden de magnitud es fiable y el dígito
final no—. Se señala además que hay aplicaciones tecnológicamente obsoletas y que las plataformas
**no garantizan el cumplimiento de estándares W3C**. La operación de SECOP I + II + TVEC costó más de
**COP 25 000 millones** en 2024.

**Está en curso el «Nuevo SECOP»**: primera versión prevista para el segundo semestre de 2025 y
estabilización durante 2026, priorizando **contratación directa** porque concentra **más del 75 % de
las transacciones**. Promete al proveedor «interfaz más intuitiva, mejores filtros de búsqueda y
mayor estabilidad». 🚩 El calendario es políticamente controvertido: hay prensa que cuestiona
implementarlo justo antes de las elecciones de 2026.

**6. Datos que muestra** · Objeto, entidad, modalidad, estado y fase, cuantía/presupuesto oficial,
plazo, ubicación, cronograma, códigos UNSPSC, documentos, y —tras el cierre— adjudicatario y valor
adjudicado. El dataset abierto tiene **59 campos**, con límites de ~1 000 peticiones/hora con App
Token y 200 filas por petición.

**7. Herramientas de análisis** · **Ninguna para el proveedor.** Hay datos abiertos y tableros de
transparencia, pero cero apoyo a la decisión de «a qué me presento». Toda la analítica que existe en
Colombia está en la capa privada (Licitaciones.info, LicitarUS, Alicia, Fromus, LicitaMatch) o la
construye uno mismo — que es exactamente lo que hace esta app.

**8. Puntos fuertes**

- **Consulta pública total sin registro.** Más abierto que SAM.gov, que exige cuenta para seguir.
- **Datos abiertos reales, en Socrata y OCDS**, con dataset de procesos *y* de contratos ejecutados.
- **Transaccional de punta a punta**, con cronograma que gobierna la plataforma.
- **Gratis por ley**, y eso no va a cambiar.

**9. Puntos débiles**

- **Usabilidad e inestabilidad reconocidas oficialmente.**
- **El buscador es de cumplimiento, no de negocio**: filtra por lo que la ley obliga a publicar, no
  por lo que sirve para decidir. No hay «encaje con mi empresa», ni cuantía por rango útil, ni
  ordenación por nada relevante.
- **Sin alertas por perfil.** Las notificaciones son del proceso en el que ya participas.
- **Calidad de dato**: la propia agencia advierte que **las entidades pueden compartir NIT** y que
  los campos de fecha tienen muchos nulos — las dos cosas que nos costaron correcciones
  (`claveCanonica`, `cierre_vencido`).
- **Sin anticipo**: el dataset no trae columna de anticipo, con lo que el flujo de caja no se puede
  evaluar desde el dato.

**10. Qué podemos copiar/adaptar**

No hay nada que copiar de su interfaz. Lo que hay que hacer es lo contrario: **ser lo que SECOP II
no puede ser**. Pero sí hay tres consecuencias operativas:

| Hallazgo | Consecuencia para nosotros |
| --- | --- |
| **Llega el «Nuevo SECOP»** (2025-2026) | 🚩 **Riesgo de producto de primer orden.** Si cambia la plataforma, puede cambiar el dataset. La app depende de `p6dx-8zbt` y de nombres de columna que ya se leen por lista de candidatas. Conviene **vigilar el anuncio y probar el nuevo dataset en cuanto exista** |
| **La contratación directa es >75 % de las transacciones** | Confirma que nuestra lista blanca de modalidades competitivas descarta el grueso del volumen **con razón**: ahí no hay concurso |
| **La ficha tiene cronograma y configuración financiera** | Son los dos bloques que nuestra tarjeta no muestra y que deciden: fechas de observaciones/adendas y **anticipo y garantías exigidas** |

---

## 7. Anexo A — otras plataformas revisadas

| Plataforma | País | Lo que aporta al análisis |
| --- | --- | --- |
| **PNCP** (`pncp.gov.br`) | Brasil | Portal **único de publicidad** de la Ley 14.133/2021: reúne editales, actas, contratos, **preços praticados**, catálogo y sanciones de Unión, estados y municipios. Consulta gratuita **sin registro**, con API. Clave: **separa publicidad de operación** — se consulta en PNCP y se oferta en Compras.gov.br o el sistema de cada ente. Es el modelo opuesto a SECOP II, que hace las dos cosas |
| **PLACSP** (España) | España | Filtra por tipo de contrato, estado, importe, **CPV**, órgano y plazo. Su crítica documentada es exactamente la nuestra sobre SECOP II: *«excelente como fuente oficial, pero su diseño no está pensado para una empresa que quiere identificar oportunidades de forma proactiva; no permite alertas por perfil de empresa —solo suscripción por expediente concreto—, no filtra por encaje real con la actividad y no integra las plataformas autonómicas»* 🟡 |
| **HigherGov / GovTribe** | EE. UU. | Ver §5. El modelo de negocio a imitar si esto se vendiera: precio público, autoservicio, API incluida |
| **Licitaciones.info · LicitarUS · Alicia · Fromus · LicitaMatch** | Colombia | La competencia directa. Se reparten en **agregadores de alertas** (monitorean SECOP II y avisan por perfil) y **analizadores con IA** (leen los documentos y los cruzan con tu perfil). Precios 🟡: Licitaciones.info COP $240 000–$2 000 000 según periodo; LicitarUS alertas gratis + $150 000 por documento analizado; Fromus $199 000/mes. **Ninguno costea la obra.** Y todos coinciden en algo que conviene repetir: la oferta se presenta en SECOP II, siempre |
| **OpenTender / TED-DATA** | UE | Analítica encima del dato abierto: demuestra que la capa de análisis no necesita permiso de la plataforma oficial |

---

## 8. Anexo B — las seis preguntas transversales del encargo

### 8.1 ¿Cómo presentan las licitaciones: tarjetas, tabla o lista?

**Ninguna de las cinco usa tarjetas.** Todas usan **lista o tabla densa**, y no es casualidad: el
usuario profesional escanea 50-200 filas al día y necesita comparar en vertical (fecha, cuantía,
entidad). La tarjeta es buena para 5-10 elementos con una decisión por elemento; la tabla, para
comparar muchos.

Nuestra app es **solo tarjetas**. Es más bonita y **peor para el uso diario en escritorio**. Ver
§9.2-B.

### 8.2 ¿Tienen alertas? ¿Cómo funcionan?

Las cinco sí, con dos patrones:

1. **Búsqueda guardada + notificación** (SAM.gov, TED, HigherGov): el usuario define el criterio una
   vez y el sistema le manda lo nuevo que encaja.
2. **Seguimiento de un proceso** (SAM.gov *Follow*, SECOP II, Mercado Público): avisa de cambios
   —adendas, respuestas, cambio de fecha— en algo que ya interesa.

El sector de alertas comerciales converge en dos cadencias 🟡: **instantánea para lo caro**, **resumen
diario para lo rutinario**; y en varios canales (correo, móvil, WhatsApp, API).

**Portafolio Estratégico no tiene ninguna de las dos.** Se verificó: no hay ni una línea de correo,
notificación o suscripción en `api/`, `lib/` ni `public/`. **Es la carencia más grande frente a las
cinco.**

### 8.3 ¿Tienen análisis de competencia? ¿Cómo lo muestran?

| Plataforma | Qué muestra | Cuándo |
| --- | --- | --- |
| SAM.gov | Lista de interesados; histórico de adjudicaciones | **Antes** del cierre (interesados) |
| TED | **Número de ofertas recibidas** (campo obligatorio) | Después |
| Mercado Público | Histórico + **red societaria** entre empresas | Después / permanente |
| GovWin IQ | Incumbente, recompetición, perfil del competidor, socios | **Antes**, con trabajo humano |
| SECOP II | Lista de oferentes cuando la entidad la publica | Variable |
| **Nosotros** | **Promedio de oferentes por entidad** (2 años), tertiles, badge auditable con los procesos que lo sostienen y los excluidos con su motivo | **Antes**, calculado |

Nuestro modelo es **estructuralmente el más avanzado de los oficiales** y el único que publica su
propia auditoría. Lo que nos falta es la mitad nominal: **quién** gana, no solo **cuántos** se
presentan. El dato está en Redis.

### 8.4 ¿Tienen calculadora de precios o APU?

**Ninguna.** Es el hallazgo del §1.1 y conviene decirlo con precisión, sin exagerarlo:

- **Cero de las cinco** construye un presupuesto unitario.
- GovWin y HigherGov venden **precios de mano de obra de referencia** (*labor pricing*): un insumo,
  no un APU.
- Mercado Público (Convenio Marco) y TVEC publican **precios de catálogo** de bienes: tampoco es
  costear una obra.
- El costeo vive en otra categoría de software (STACK, PlanSwift, ProEst, Beck, Bluebeam), que **no
  conecta con ningún feed de licitaciones** y cobra US$1 500–8 000 por estimador/año 🟡.
- La práctica que sí está extendida ahí y **nosotros no tenemos** es el **benchmarking contra el
  histórico propio**: comparar el estimado actual contra los proyectos ya ejecutados de la empresa
  (costo por m², rendimientos reales) como control de calidad del presupuesto. Nosotros tenemos
  `experiencia_genesis_106.json` con 106 contratos ejecutados — pero solo lo usamos para vocabulario,
  no para precios.

### 8.5 ¿El diseño es moderno o anticuado?

| | Estética | Modernidad real |
| --- | --- | --- |
| SAM.gov | Institucional USWDS | **Moderno donde importa**: accesible, responsive, consistente. Feo a propósito |
| TED | Institucional europeo | Renovado 2023-24. Denso |
| Mercado Público | Portal público modernizado, núcleo antiguo | En migración |
| GovWin IQ | Empresarial de los 2010 | 🟡 «*clunky, dated, click-heavy*» |
| SECOP II | Antiguo | Reconocido como problema por su propia agencia |
| **Nosotros** | **Apple Glass 2026** | La más moderna de todas, sin discusión |

Sobre el *glassmorphism*, el consenso técnico de 2026 es matizado y nos toca directamente: el
patrón dominante en producción es **híbrido** —diseño plano como lenguaje principal y vidrio
**selectivo** en elementos de alto impacto—, porque el contraste sobre fondo translúcido es
**dinámico** y no se puede garantizar WCAG (4,5:1 en texto, 3:1 en componentes). Recomiendan además
solidificar el vidrio cuando el sistema operativo pide *Reduce Transparency*.

Nuestra implementación ya acertó en lo importante (`backdrop-filter` **solo** en tarjetas de nivel
superior, no anidado). Lo que falta es la deferencia a `prefers-reduced-transparency`. Ver §9.5.

### 8.6 ¿Qué hace que un usuario vuelva todos los días?

Ninguna plataforma oficial genera hábito: se visitan cuando hace falta. Las que sí lo generan
comparten **cuatro** mecanismos:

1. **Algo nuevo desde tu última visita**, contado y visible. El resumen diario por correo existe para
   traerte de vuelta, no para sustituirte la visita.
2. **Trabajo acumulado dentro**: pipeline, procesos seguidos, notas. Volver es barato porque lo tuyo
   está ahí.
3. **Un reloj**: fechas de cierre que corren. La urgencia es el motor.
4. **Una respuesta que no puedes obtener en otro sitio**: la nota del analista, el incumbente, la
   baja del mercado.

Portafolio Estratégico tiene hoy **el 4 con nota alta** (probabilidad explicada, baja del mercado,
puertas, APU) y **nada de 1, 2 y 3**. Esa es, en una frase, la agenda de producto.

---

## 9. RECOMENDACIONES PARA PORTAFOLIO ESTRATÉGICO

> **Restricción que manda sobre todas.** El plan Hobby de Vercel admite **12 funciones** y el
> repositorio está exactamente en 12 (verificado: `find api -name '*.js'` devuelve 12). **Un archivo
> más y falla el despliegue entero, no el endpoint nuevo.** Toda recomendación de abajo se pliega en
> un endpoint existente, con el precedente ya establecido de `?vista=probabilidad`,
> `?origen=repositorio` y `api/apu/[accion].js`. Y sigue sin haber `package.json`.

### 9.1 Top 5 funcionalidades que deberíamos implementar YA

---

#### A. Búsqueda guardada + resumen diario por correo — *la carencia más grande*

**Por qué.** Las cinco lo tienen y es el único mecanismo probado de retorno. Hoy la app **exige
recordar entrar**. El cron diario de Vercel Hobby —que hasta ahora era una limitación— es
exactamente la cadencia correcta para un digest.

**Cómo, sin romper nada.**
- Guardar el conjunto de filtros con nombre en `config:busquedas:{perfil}`. **La URL ya es el
  estado**: guardar una búsqueda es guardar una query string.
- Enviar el digest desde **`/api/resumen?vista=digest`** (endpoint existente, ya calcula los
  visibles con la misma cascada). Cero funciones nuevas.
- El correo sale con `fetch` a una API HTTP de envío (Resend, Brevo). Sin SDK, sin `package.json`.
- **El digest lleva el veredicto, no la coincidencia**: probabilidad en frase, puertas, baja del
  mercado y días al cierre. Un correo con 40 filas sin criterio es el error de SAM.gov (§9.3-C).
- Tope duro de N procesos por correo, ordenados por lo que ya ordena la app.

**Riesgo.** El correo es la puerta de la fatiga de alertas. Regla: **si el digest está vacío, no se
manda** — «hoy no hay nada» dicho todos los días entrena a ignorar.

---

#### B. Seguimiento y pipeline: `interesado → preparando → presentada → ganada/perdida`

**Por qué.** Es el mecanismo 2 del §8.6 y lo tienen las cinco. Además cierra tres cosas que el
manual exige y la app no soporta: **la regla de las 24 horas** (mandamiento 1), la vigilancia de
adendas (error #6) y el **postmortem** (mandamiento 19).

**Cómo.**
- Clave `seguimiento:{perfil}` con `{id_proceso: {estado, nota, fecha}}`. Escritura plegada como
  acción del endpoint de administración existente.
- En el listado, un filtro «solo seguidos» y un chip de estado en la tarjeta.
- **Detección de cambio gratis**: el dedup de lectura ya recorre todas las versiones de cada `_k` por
  `:updated_at` (`lib/almacen.leerChunksDedup`, bandera `senales` — la misma vía que dio la señal de
  prórroga). «Este proceso cambió desde que lo seguiste» no cuesta una lectura nueva.
- El estado final `ganada/perdida` con la baja real del ganador **alimenta la calibración** que
  `docs/PROBABILIDAD_MEJORADA.md` deja pendiente por no tener etiquetas. Hoy no hay ninguna etiqueta
  en todo el sistema; este es el único sitio donde pueden aparecer.

---

#### C. Perfil de adjudicatarios por entidad — *el dato ya está en Redis*

**Por qué.** Es lo que GovWin cobra a US$12 000/año llamándolo *incumbent analysis*, lo que
ChileCompra construyó como Observatorio, y **la señal #11 de pliego sastre del manual** convertida en
algo verificable. Nuestro badge dice *cuántos* compiten; esto dice **quiénes**.

**Cómo.**
- `licitaciones:historico:mes:*` ya guarda `adjudicatario` y **ninguna purga lo toca**.
- Índice derivado `indice:adjudicatarios` en la misma pasada que reconstruye competencia y baja
  (`?reconstruir_todo=true`), con **el mismo swap atómico** (`:nuevo` → RENAME) y la misma
  `claveCanonica` de entidad — no una segunda definición de entidad.
- Se sirve como **`/api/competencia-detalle?vista=adjudicatarios`**: encaja con el contrato del
  endpoint («de dónde sale ese número») y no gasta función.
- En pantalla: «En esta entidad, 3 empresas se llevaron 11 de los últimos 14 procesos» — con el
  detalle auditable, como ya hace el modal de competencia.

**Lo que hay que decir en pantalla, sin ambigüedad.** Concentración alta **es ambigua**, igual que
baja competencia: puede ser un nicho especializado **o** un pliego sastre. El manual sostiene las dos
lecturas y la app tiene que sostener las dos también.

---

#### D. Ficha del proceso propia, con cronograma y checklist de descalificación

**Por qué.** Hoy la tarjeta enlaza a SECOP II y ahí se acaba nuestro producto. Las cinco tienen ficha
interna. Y es donde caben las dos cosas que SECOP II sí publica y nosotros no mostramos:
**cronograma** (observaciones, adendas, cierre) y **configuración financiera** (anticipo, garantías).

**Cómo.**
- Vista de detalle dentro de la pestaña `#/licitaciones` (sin página nueva: la app es una sola
  página desde ago 2026).
- **Cuenta atrás al cierre con la regla de las 24 horas**: la alerta se enciende el día anterior,
  no el mismo día. Con la hora Colombia ya resuelta en `cierre_vencido` (UTC-5 flotante) — comparar
  contra `Date.now()` a secas adelantaría el aviso cinco horas.
- **Checklist de los 9 errores que descalifican**, marcable, guardado con el seguimiento (B).
- Los costos ocultos del Cap. 11 enlazados al APU del proceso, que ya existe.

**Precaución de honestidad.** La ficha solo puede mostrar lo que el dataset trae. `p6dx-8zbt` **no
trae anticipo** — y `anticipo_pct = 0` significa «sin dato», no «sin anticipo». La ficha tiene que
decir «sin dato», nunca dejar un 0 que se lea como cero pesos. Es la regla de siempre, en una
pantalla nueva.

---

#### E. Plan Anual de Adquisiciones (PAA) — *la ventaja de seis meses*

**Por qué.** GovWin cobra decenas de miles de dólares al año por **anticipación**, y lo hace con 150
analistas telefoneando. En Colombia esa anticipación **es un dataset público que casi nadie lee**:
el PAA se publica el 31 de enero con objeto, valor, mes previsto y modalidad de todo el año. El
manual lo llama *seis meses de ventaja* y `CLAUDE.md` lo tiene marcado ⬜ desde julio.

Es, con diferencia, **la funcionalidad de mayor valor por peso de código** del listado: no compite
con nadie en Colombia y replica el único diferenciador que el mercado global paga caro.

**Cómo.**
- Dataset candidato: **`9sue-ezhx` — «SECOPII - Plan Anual De Adquisiciones Detalle»** en
  `datos.gov.co`. 🚩 **Sin verificar desde este entorno** (`datos.gov.co` bloqueado): antes de
  escribir una línea hay que abrirlo y censar sus columnas, exactamente como se hizo con
  `lib/columnas_historicas.js` para las columnas de adjudicación.
- Keyspace propio `paa:mes:*`, con el mismo criterio que el histórico: **no lo purga nadie**.
- Se ingiere con el `?modo=` de `/api/sync` o con `/api/sync/historico` — **ninguna función nueva**.
- El juicio se reutiliza entero: el PAA trae objeto y códigos, así que `evaluarObjeto` y el matching
  UNSPSC funcionan tal cual.
- En pantalla, **separado y rotulado**: «previsto, aún no publicado». Mezclar una previsión con un
  proceso abierto sería la peor forma posible de equivocarse.

**Riesgo real.** El PAA es un plan: se incumple, se mueve y se modifica. La app tendría que decir
qué porcentaje del PAA del año anterior acabó publicándose — y eso **se puede medir** cruzando
`paa:*` con el histórico. Publicar la previsión sin su tasa de acierto sería vender humo.

---

---

#### F. (Fuera de concurso) La caja de búsqueda que no existe

No es una funcionalidad nueva: es **un campo que falta** y que las cinco plataformas ponen lo
primero. Se descubrió verificando el código para escribir este informe y merece salir aparte porque
el diagnóstico es incómodo: **`/api/oportunidades` no acepta ningún parámetro de texto libre**. Sus
doce parámetros son perfil, anticipo, cuantía, competencia, ubicación, tier de match, dos toggles,
viabilidad, orden y paginación. **Ninguno es una palabra clave.**

Hoy es imposible escribir «placa huella», «acueducto» o el nombre de un municipio y ver qué hay.
Con 40 procesos servidos apenas se nota; el día que el PAA (E) multiplique el corpus, se notará
mucho.

Cuesta poco y hay que hacerlo con dos precauciones de la casa:
- **Comparar sobre texto normalizado** con `norm` de `lib/semantica.js` (sin tildes, ñ→n), como el
  resto de vocabularios nuevos. Escribir «diseño» y no encontrar «diseno» sería un fallo silencioso.
- **Filtrar, no puntuar.** La búsqueda por texto no puede alterar el orden por atractividad ni
  colarse en la probabilidad: es un filtro más de la consulta, fuera de la cascada de
  `filtrarProcesosVisibles` — igual que cuantía, competencia y ubicación, y por la misma razón
  (`totales.visibles` del panel no puede depender de lo que el dueño teclee en la pantalla).

---

**Las cinco (más la de cinco minutos), ordenadas por relación valor/esfuerzo:**

| # | Funcionalidad | Valor | Esfuerzo | Funciones nuevas |
| --- | --- | --- | --- | --- |
| F | Búsqueda por texto | Medio (**alto tras E**) | **Muy bajo** | 0 |
| C | Adjudicatarios por entidad | Alto | **Bajo** (dato ya en Redis) | 0 |
| B | Seguimiento + pipeline | Alto | Bajo | 0 |
| A | Búsqueda guardada + digest | **Muy alto** | Medio (envío externo) | 0 |
| D | Ficha propia + checklist | Medio-alto | Medio | 0 |
| E | PAA | **Muy alto** | Alto (fuente nueva) | 0 |

### 9.2 Top 3 patrones de diseño que deberíamos copiar

---

#### A. La bandeja de novedades: «qué cambió desde tu última visita»

**De dónde sale.** Del *daily digest* de los servicios de alertas y del filtro «actualizado
recientemente» de SAM.gov, combinados. Es el mecanismo 1 del §8.6 y **el único que convierte una
consulta en un hábito**.

**Cómo se ve.** Al abrir `#/licitaciones`, antes de la lista: *«7 procesos nuevos · 2 que sigues
cambiaron · 3 cierran esta semana»*, cada cifra siendo un filtro de un clic.

**Por qué encaja aquí y no es un adorno.** La app ya sabe la respuesta: deduplica por `:updated_at`
y guarda `last_sync`. Solo falta un `ultima_visita` en `localStorage` y un `?desde=` en la consulta.

**La trampa que hay que evitar, y es la de esta casa.** Si no hay novedades, el bloque **no puede
decir «0»**: tiene que decir «nada nuevo desde el martes», que es un hecho distinto y verdadero.
Un 0 sin fecha se lee como «la app no encontró nada» — el «no sé» contra el «cero» otra vez.

---

#### B. Vista de tabla densa en escritorio, tarjetas en móvil

**De dónde sale.** De las cinco: **ninguna usa tarjetas** para listas largas (§8.1).

**Por qué.** La tarjeta obliga a leer en zigzag y ocupa 8-10 veces el alto de una fila. Para 40
procesos al día, escanear una columna de fechas de cierre en vertical es una operación de segundos;
en tarjetas es de minutos. La barra inferior móvil que ya existe demuestra que la app acepta dos
diseños según el dispositivo — esto es lo mismo, en la lista.

**Cómo, sin reescribir medio frontend.** Un conmutador tarjetas/tabla que renderiza los **mismos
datos** desde la **misma respuesta**. Las columnas: objeto, entidad, cuantía, cierre (con días),
probabilidad en frase, competencia, baja. Ordenable por cabecera reusando los `ordenar_por` que el
endpoint ya acepta.

**Precaución de este proyecto.** El `<style>` traduce utilidades claras (`bg-white`,
`text-gray-500`) a la paleta Apple; una tabla nueva tiene que escribirse **con ese mismo vocabulario
de clases**, no con colores literales, o se saldrá del tema en modo oscuro. Y la tabla debe caber en
un contenedor con `overflow-x: auto`, nunca hacer scrollear la página.

---

#### C. Facetas que cuentan, y un «cero resultados» que propone la salida

**De dónde sale.** De TED y SAM.gov: los filtros dicen **cuántos resultados dejan** antes de
aplicarse.

**Por qué es más que cosmético aquí.** Hoy, si el dueño mueve tres filtros y la lista se vacía, no
tiene forma de saber **cuál** la vació. Y la app **ya calculó esa respuesta**: `/api/diagnostico`
publica el embudo paso a paso con contrafactuales (`ganancia_por_jerarquia`,
`ganancia_por_texto`, `visibles_sin_capa_pertinencia`). Esa inteligencia está encerrada en un
endpoint con token que solo se mira cuando algo va mal.

**Cómo se ve.** Cada filtro con su conteo; y cuando el resultado es 0: *«Ninguno pasa. El filtro de
cuantía descarta 34; el de ubicación, 12. Suelta uno.»*, con el botón que lo suelta.

**El principio, que es doctrina de la casa.** *«Antes de tocar un filtro porque salen pocos,
mirarlo»* está escrito para nosotros en `CLAUDE.md`. Esto lo pone donde está el usuario.

---

### 9.3 Top 3 errores que cometen estas plataformas y que debemos evitar

---

#### A. Construir para el que publica, no para el que decide

**Quién lo comete.** SECOP II, PLACSP, TED y —en menor medida— SAM.gov. La crítica a PLACSP lo dice
mejor que nadie: *«excelente como fuente oficial, pero su diseño no está pensado para una empresa que
quiere identificar oportunidades de forma proactiva»* 🟡. Los filtros existen porque son los campos
del formulario legal, no porque alguien decida con ellos.

**Cómo se nos colaría.** Cada vez que se añada un filtro «porque el dataset trae ese campo». El
dataset tiene **59 campos** y casi ninguno cambia una decisión. La prueba a aplicar antes de exponer
cualquier filtro nuevo: **¿qué decisión distinta toma el dueño según el valor de este campo?** Si no
hay respuesta en una frase, no va a la pantalla.

**Corolario incómodo.** `nivel_competencia` ya nos pasó: era un desplegable de tres opciones donde
una no filtraba nada y las otras dos vaciaban la lista, alimentado por un campo constante. Fue
exactamente este error, cometido en casa.

---

#### B. Potencia a costa de la curva de aprendizaje

**Quién lo comete.** GovWin IQ, de forma documentada y repetida: 🟡 «*clunky*», «*click-heavy*»,
**semanas y onboarding formal** antes de que la gente deje de rebotar, notas de analista que exigen
entrar en cada oportunidad.

**Por qué nos importa más que a nadie.** El usuario de esta app es **un contratista con un portátil
institucional sin terminal**. Ya hay decisiones tomadas por esa restricción: `/admin.html` encadenando
la full desde el navegador, el token integrado, la carga del RUP por PDF. Una función que exija
aprender no se va a usar: se va a abandonar.

**La regla que se deriva.** Cada funcionalidad nueva tiene que ser **utilizable sin explicación en el
primer intento**, o venir con su explicación pegada en pantalla. Y su corolario: si algo hay que
explicar dos veces, el defecto está en el diseño, no en el usuario.

---

#### C. Alertas de alto volumen y baja precisión (y su gemelo: el «match» sin explicación)

**Quién lo comete.** Todas las de suscripción. SAM.gov publica >24 000 avisos al mes 🟡 y su propia
comunidad recomienda no fiarse de las notificaciones por defecto. Los agregadores colombianos
compiten por «avisarte de todo».

**Cómo mata el producto.** No con una queja: con silencio. El usuario deja de abrir los correos, la
app deja de existir para él, y **nadie se entera** porque no hay señal de error. Es un fallo
silencioso, la clase que este repositorio ya ha pagado tres veces.

**El gemelo, que es peor.** Un aviso que dice «esto encaja contigo» **sin decir por qué** es
indiscutible: el usuario no puede corregirlo ni confiar en él. Nuestro veredicto graduado por tier y
la probabilidad explicada en seis pasos existen justo para eso — **y tienen que viajar dentro de la
alerta**, no quedarse esperando en la web.

**La regla que se deriva.** Una alerta se manda si —y solo si— el proceso **pasa las puertas** y el
correo **incluye el motivo**. Y el volumen se mide: si un digest supera N filas de forma sostenida,
el problema no es el correo, es que el criterio no está filtrando.

---

### 9.4 Benchmark: ¿dónde está nuestra app frente a las cinco?

**Advertencia de comparación justa.** Portafolio Estratégico es una app privada, mono-usuario, de un
sector (obra civil) y un país, construida sobre un plan gratuito. SAM.gov y TED son infraestructura
nacional y supranacional. **Comparar alcance es absurdo; comparar la capa de decisión es lo que tiene
sentido**, y es donde el resultado sorprende.

| Dimensión | Posición | Detalle |
| --- | --- | --- |
| **Diseño visual** | 🥇 **MEJOR que las 5** | Apple Glass 2026, claro/oscuro, página única, móvil real. Ninguna oficial se acerca; GovWin es «*dated*» reconocido. **Con un asterisco**: no cumplimos accesibilidad como el USWDS, y ellos sí (§9.5) |
| **Presentación de la lista** | 🥉 **PEOR** | Solo tarjetas. Las cinco usan tabla o lista densa porque funciona mejor para volumen |
| **Búsqueda (texto)** | 🥉 **PEOR** | 🚩 **No existe.** Las cinco abren con una caja de palabra clave; el endpoint no tiene ni un parámetro de texto (§9.1-F) |
| **Filtros y ordenación** | 🥇 **MEJOR en ordenación, igual en filtros** | Filtros comparables (cuantía, ubicación, competencia, anticipo) y una **ordenación que nadie tiene**: por atractividad, valor esperado, probabilidad o baja del mercado. Peor en: sin búsqueda guardada, sin conteo por faceta, sin consulta experta |
| **Alertas y notificaciones** | 🥉 **MUY PEOR** | **Cero.** Las cinco las tienen. Carencia nº 1 |
| **Seguimiento / pipeline** | 🥉 **MUY PEOR** | **Cero.** Las cinco lo tienen |
| **Datos por proceso** | 🥈 **IGUAL** | Menos campos crudos que la ficha de SECOP II, pero con **enriquecimiento que ninguna tiene**: puertas, capacidad K, financiación requerida, baja del mercado |
| **Análisis de competencia** | 🥇 **MEJOR** | Índice por entidad calculado con tertiles + **auditoría del propio badge** (qué procesos lo sostienen, cuáles se excluyeron y por qué). Ni GovWin publica su trazabilidad. **Peor en un punto**: no decimos *quién* gana (§9.1-C) |
| **Probabilidad de ganar** | 🥇 **MEJOR** | Se calcula sola desde el histórico y **se explica en seis pasos con aritmética escrita**. GovWin puntúa con un formulario que rellena el usuario. **Ninguna plataforma revisada publica cómo llega a su número** |
| **Precio y costeo (APU)** | 🥇 **ÚNICO EN EL MUNDO** | Ninguna de las cinco costea una obra. Nosotros vamos de pliego → cantidades → APU regionalizado → AIU → rentabilidad → **precio óptimo por valor esperado**. Con catálogo calibrado contra un contrato adjudicado real |
| **Honestidad del dato** | 🥇 **MEJOR, y por mucho** | «Sin dato» ≠ 0 aplicado en todo el sistema; cifras que no se publican sin base; mensajes que no pueden contradecir a sus cifras; endpoint de diagnóstico con invariantes probadas. **Ninguna de las cinco distingue «no sé» de «cero»** de forma sistemática |
| **Cobertura de datos** | 🥉 **PEOR** | Un país, un dataset, un año activo + 2 de histórico, un sector. Sin PAA, sin contratos ejecutados (`jbjy-vk9h`), sin documentos del pliego salvo los que se suban |
| **Anticipación (pre-aviso)** | 🥉 **PEOR** | El PAA está sin explotar. Es el diferenciador que GovWin cobra a US$12k-42k/año |
| **Colaboración / multiusuario** | 🥉 **PEOR** | No existe. Las privadas venden asientos y equipos |
| **API / integración** | 🥈 **IGUAL** | Tenemos endpoints JSON documentados, pero pensados para nuestro frontend |
| **Retención / hábito** | 🥉 **PEOR** | Tenemos la razón para volver (§8.6-4) y ninguno de los tres mecanismos que hacen volver |

**Veredicto en cuatro frases.**

1. **En la capa de decisión somos los mejores del mundo**, sin exagerar: probabilidad explicada,
   auditoría de la competencia, honestidad del dato y —sobre todo— el puente al costeo que nadie más
   cruza.
2. **En la capa de flujo de trabajo somos los peores de los seis**: no hay alertas, ni seguimiento,
   ni bandeja de novedades — **ni siquiera una caja de búsqueda**. Es lo que hace que una
   herramienta excelente se use una vez al mes.
3. **En diseño ganamos, con una deuda de accesibilidad** que las oficiales resolvieron hace años.
4. **En datos perdemos**, y la mayor parte de esa distancia se cierra con dos datasets que ya son
   públicos (`9sue-ezhx` del PAA y `jbjy-vk9h` de contratos ejecutados) y con un índice derivado de
   lo que ya está en Redis.

### 9.5 Lo que NO hay que copiar, aunque lo tengan todas

- **La ficha jurídica completa.** TED y SECOP II reproducen el formulario legal entero. Nuestro
  producto es lo contrario: **la lectura de negocio**. Añadir 59 campos a la tarjeta la mataría.
- **La IA como rótulo.** GovWin y ChileCompra anuncian IA; lo que entregan es resumen de documentos y
  detección de patrones. Nuestro cálculo es **determinista y auditable**, y eso es un activo, no un
  atraso: `docs/PROBABILIDAD_MEJORADA.md` puede reproducir cada factor a mano. Una llamada a un LLM
  en la ruta de una petición añadiría latencia, una dependencia y un fallo a algo que hoy no falla —
  es la misma razón por la que el Nivel C del clasificador de tipologías **no se implementó**.
- **El scoring compensatorio.** El sector usa modelos de factores ponderados que suman. Nosotros
  retiramos `puntaje_ponderado` como criterio **a propósito**: no poder financiar una obra no se
  compensa con cuantía alta. Las cuatro puertas son mejores y no hay que volver atrás por parecerse
  al mercado.
- **El vidrio en todas partes.** El consenso de 2026 es híbrido y selectivo. Nuestra implementación
  ya lo respeta (solo tarjetas de nivel superior). **Lo que falta y hay que añadir**: honrar
  `prefers-reduced-transparency` solidificando el vidrio, y verificar el contraste del texto sobre
  las tarjetas translúcidas contra 4,5:1. Es la única deuda de diseño concreta que deja este
  informe.
- **Registro obligatorio para ver.** SAM.gov exige cuenta para seguir procesos; SECOP II y PNCP no
  exigen nada para consultar, y aciertan. Nuestra landing de onboarding (RUP en PDF sin token) va en
  la dirección correcta: **no pedir credencial a quien llega a ver si esto le sirve**.

---

## 10. Fuentes

Todas consultadas en agosto de 2026 mediante búsqueda web. **Ninguna se abrió directamente** — ver
§0.

**SAM.gov / Estados Unidos**
- [Contract Opportunities | SAM.gov](https://sam.gov/opportunities)
- [How to Use SAM.gov to Find and Win Government Contracts 2026 — GovDash](https://www.govdash.com/blog/how-to-use-sam-gov-to-find-government-contracts)
- [How to Use SAM.gov to Find Federal Contract Opportunities — GovCon Chamber](https://www.govconchamber.com/how-to-use-sam-gov-to-find-federal-contract-opportunities)
- [How to Save Searches and Set Up Notifications (PDF)](https://s3.amazonaws.com/falextracts/Documentation/Search/Save_Searches_and_Notify.pdf)
- [Instructions for Viewing the Interested Vendors List (PDF)](https://imlive.s3.amazonaws.com/Federal%20Government/ID259143262991461748267313140921586169964/Instructions%20for%20Viewing%20Interested%20Vendors%20List%20UPDATED%2003AUG21.pdf)
- [Not Just the FAR, SAM.gov Gets Overhauled Too — Government Contracts Legal Forum](https://www.governmentcontractslegalforum.com/2025/09/articles/far/not-just-the-far-sam-gov-gets-overhauled-too/)
- [U.S. Web Design System (USWDS)](https://designsystem.digital.gov/) · [Accessible Design Using USWDS — Section508.gov](https://www.section508.gov/develop/accessible-design-using-uswds/)

**TED / Unión Europea**
- [TED — Tenders Electronic Daily](https://ted.europa.eu/en/) · [Bienvenidos al nuevo TED](https://ted.europa.eu/es/news/welcome-to-the-new-ted)
- [Browse TED notices by Business Opportunity](https://ted.europa.eu/en/browse-by-business-opportunity) · [TED Developer Portal](https://developer.ted.europa.eu/) · [eForms SDK](https://ted.europa.eu/en/simap/eforms) · [Documents, forms & notices — TED Developer Docs](https://docs.ted.europa.eu/eforms/latest/schema/documents-forms-and-notices.html)
- [How to Search TED Tenders: Filters, CPV Codes & Tips (2026) — Jorpex](https://jorpex.com/guides/how-to-search-ted-tenders/) · [TED Tenders: 700K+ EU Procurement Notices — Jorpex](https://jorpex.com/sources/ted/)
- [What Is TED? EU Tenders Explained — Patterno](https://www.patterno.de/en/resources/blog/what-is-ted-tenders-electronic-daily)
- [Europe: Tenders Electronic Daily (OpenTender) — OCP Data Registry](https://data.open-contracting.org/en/publication/150) · [Access to public procurement — Single Market Scoreboard](https://single-market-scoreboard.ec.europa.eu/business-framework-conditions/public-procurement_en)

**ChileCompra / Mercado Público**
- [Mercado Público](https://www.mercadopublico.cl/) · [Búsqueda Avanzada](https://www.mercadopublico.cl/portal/Modules/Site/Busquedas/BuscadorAvanzado.aspx?qs=1) · [API de Mercado Público](https://www.chilecompra.cl/api/)
- [Cuenta Pública Participativa 2026: ahorros de US$381 millones y nuevas herramientas con IA](https://www.chilecompra.cl/2026/07/cuenta-publica-participativa-de-chilecompra-destaca-ahorros-por-us-381-millones-en-2025-y-presenta-nuevas-herramientas-con-inteligencia-artificial-para-2026/)
- [Avances en IA, transparencia y compras estratégicas — Expo Compras Públicas 2026](https://www.chilecompra.cl/2026/07/chilecompra-presento-avances-en-inteligencia-artificial-transparencia-y-compras-estrategicas-durante-el-primer-dia-de-la-expo-compras-publicas/)
- [Analiza los datos de compras públicas](https://www.chilecompra.cl/analiza-los-datos-de-compras-publicas/) · [Observatorio ChileCompra](https://www.chilecompra.cl/observatorio-de-compras-publicas/) · [El observatorio de compras visible a la ciudadanía — OCP](https://www.open-contracting.org/es/2024/11/04/el-observatorio-de-compras-visible-a-la-ciudadania-en-chile/)
- [Nueva API de Compra Ágil](https://www.chilecompra.cl/2026/05/nueva-api-de-compra-agil-mejora-el-acceso-y-analisis-de-datos-de-compras-publicas/) · [Evolución de las APIs](https://www.chilecompra.cl/2026/03/chilecompra-impulsa-la-evolucion-de-sus-apis-con-taller-de-co-creacion/)
- [Mercado Público: inscripción, licitaciones y órdenes de compra — LicitaLab](https://www.licitalab.cl/blog/mercado-publico-que-es-como-funciona-como-inscribirte)

**GovWin IQ / inteligencia privada**
- [GovWin IQ — Deltek](https://www.deltek.com/products/govwin/) · [Win Federal Contracts with Analyst Insights](https://www.deltek.com/products/govwin/federal/) · [Unleashing AI & Enhancing UX with GovWin IQ](https://www.deltek.com/resources/articles/govwin-ai-ux-innovation/)
- [GovWin IQ Reviews & Ratings 2026 — Gartner Peer Insights](https://www.gartner.com/reviews/product/govwin-iq) · [GovWin IQ Reviews — G2](https://www.g2.com/products/govwin-iq/reviews) · [GovWin IQ — Capterra](https://www.capterra.com/p/154858/GovWin-IQ/)
- [7 Best GovWin IQ Alternatives and Competitors (2026) — Fed-Spend](https://fed-spend.com/blog/govwin-alternatives-and-competitors-2026) · [GovWin IQ Pricing 2026 — Fed-Spend](https://fed-spend.com/blog/govwin-iq-pricing-2026-deltek-cost-alternatives) · [GovWin IQ Pricing — Civic IQ](https://blogs.civiciq.com/2026/06/16/govwin-iq-pricing-2026/)
- [HigherGov](https://www.highergov.com/) · [Search Basics — HigherGov Docs](https://docs.highergov.com/highergov-basics/search-basics)
- [What Is PWin? — GovEagle](https://www.goveagle.com/blog/what-is-pwin-probability-of-win-guide) · [Pwin: The Complete Guide — Procurement Sciences](https://www.procurementsciences.com/blog/pwin) · [AI-Powered Bid/No-Bid Decision Tools — McCarren](https://www.mccarren.ai/blogs/ai-in-govcon/ai-powered-bid-no-bid-decision-tools-government-contractors/)

**SECOP II / Colombia**
- [SECOP II — Colombia Compra Eficiente](https://www.colombiacompra.gov.co/secop/secop-ii) · [Búsqueda pública](https://www.colombiacompra.gov.co/secop/secop-ii/busqueda-publica) · [Búsqueda de procesos de SECOP II](https://www.colombiacompra.gov.co/base-conocimiento/busqueda-de-procesos-de-secop-ii)
- [Colombia alista un nuevo sistema de compras públicas (SECOP)](https://www.colombiacompra.gov.co/archivos/16418) · [Nuevo SECOP](https://operaciones.colombiacompra.gov.co/ciudadanos/nuevo-secop)
- [Estas son las posturas sobre el nuevo Secop — Asuntos Legales](https://www.asuntoslegales.com.co/actualidad/estas-son-las-posturas-sobre-el-nuevo-secop-que-entrara-en-vigencia-desde-diciembre-4089582) · [Sistema que reemplazará a SECOP será implementado previo a elecciones de 2026 — El Colombiano](https://www.elcolombiano.com/colombia/sistema-que-reemplazara-a-secop-sera-implementado-previo-a-elecciones-de-2026-CO26820222)
- [SECOP II - Procesos de Contratación (p6dx-8zbt)](https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Procesos-de-Contrataci-n/p6dx-8zbt) · [SECOP II - Contratos Electrónicos (jbjy-vk9h)](https://www.datos.gov.co/Estad-sticas-Nacionales/SECOP-II-Contratos-Electr-nicos/jbjy-vk9h) · [SECOPII - Plan Anual De Adquisiciones Detalle (9sue-ezhx)](https://www.datos.gov.co/Gastos-Gubernamentales/SECOPII-Plan-Anual-De-Adquisiciones-Detalle/9sue-ezhx)
- [Manual para el uso de Datos Abiertos del SECOP (PDF)](https://operaciones.colombiacompra.gov.co/sites/cce_public/files/cce_documentos/cce_manual_datos_abiertos.pdf) · [ANCP-CCE-Analitica/datos_abiertos — GitHub](https://github.com/ANCP-CCE-Analitica/datos_abiertos/blob/main/SOCRATA_Consulta.ipynb)
- [SECOP II no funciona: causas, soluciones y alternativas — LicitaMatch](https://licitamatch.co/blog/indisponibilidad-secop-ii/) · [Mejores plataformas para encontrar y ganar licitaciones en Colombia 2026 — Fromus](https://www.fromus.tech/blog/mejores-plataformas-licitaciones-colombia-2026)

**Otras plataformas y transversales**
- [PNCP — Portal Gov.br](https://www.gov.br/pncp/pt-br/pncp) · [PNCP 2026: guia completo — e-licitagov](https://e-licitagov.com.br/informativos/pncp-portal-nacional-contratacoes-publicas) · [Do portal oficial ao ecossistema digital — Observatório da Nova Lei de Licitações](https://www.novaleilicitacao.com.br/2026/01/20/do-portal-oficial-ao-ecossistema-digital-pncp-e-plataformas-privadas-nas-contratacoes-publicas/)
- [PLACSP — Gobierto](https://www.gobierto.es/blog/plataforma-de-contratacion-del-sector-publico-placsp) · [Cómo buscar licitaciones públicas en España 2026 — Boletín Claro](https://boletinclaro.es/blog/como-buscar-licitaciones-2026)
- [Open Contracting Partnership](https://www.open-contracting.org/es/) · [Tres estrategias para diseñar un sistema electrónico de compras públicas — OCP](https://www.open-contracting.org/es/2026/02/11/tres-estrategias-para-disenar-un-sistema-electronico-de-compras-publicas-lecciones-aprendidas-en-nuevo-leon/)
- [Best tender alert services — Jorpex](https://jorpex.com/compare/best-tender-alert-services/) · [Tender alerts filter — Tracker Intelligence](https://www.trackerintelligence.com/resources/procurement-news/tender-alerts-filter/)
- [Glassmorphism: Definition and Best Practices — Nielsen Norman Group](https://www.nngroup.com/articles/glassmorphism/) · [Glassmorphism Meets Accessibility — Axess Lab](https://axesslab.com/glassmorphism-meets-accessibility-can-frosted-glass-be-inclusive/) · [Glassmorphism Web Design: How to Use It (and When to Avoid It)](https://www.neelnetworks.com/blog/glassmorphism-web-design-guide-2026/)
- [Construction Cost Benchmarking: 2026 Complete Guide — CNBA](https://cnba.us/2026/05/05/construction-cost-benchmarking-guide/) · [The Complete Guide to Construction Estimating Software (2026) — Beck Technology](https://www.beck-technology.com/blog/complete-guide-construction-estimating-software) · [Construction Bidding Software Pricing 2026 — Mercator.ai](https://www.mercator.ai/articles/construction-bidding-software-pricing-2026)
