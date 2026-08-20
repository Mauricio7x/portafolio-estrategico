# Inventario de fuentes de datos y auditorías de la Fase 0

Documento vivo. Cada fila responde «¿de dónde sale esto y en qué estado de verificación está?».
Regla del proyecto: **un 403/404 anotado aquí es una observación CON FECHA, no una propiedad del
entorno** — antes de dar una fuente por perdida, volver a llamarla.

## 1. Auditoría de la Fase 0 (2026-08-15): las dos «roturas» del encargo, medidas

### 1.1 «Se filtra por `fase` con expresiones regulares en vez de `estado_del_procedimiento`» — FALSO

El encargo daba por hecho que el filtrado de estado usaba regex sobre `fase`. La auditoría del
código real (`lib/filtros.js:142` y `:159`) muestra que desde hace tiempo:

- Se lee **`estado_del_procedimiento` PRIMERO** y `fase` solo como respaldo, exactamente el orden
  de candidatas que pide la capa defensiva (§5.4 del encargo).
- La comparación es contra **listas canónicas normalizadas** (`ESTADOS_ABIERTOS`,
  `ESTADOS_CERRADOS`), no regex libres, con la regla «estado desconocido = CERRADO» y el
  matiz documentado de que «seleccionado» no puede entrar por prefijo con la fase «Selección».
- El reloj (`cierre_vencido`) cierra además todo proceso con `fecha_cierre` vencida, diga lo que
  diga el estado declarado.

**Medición antes/después: idéntica por construcción — no se cambió ningún filtro.** No hay
diferencia que documentar porque el estado auditado ya era el estado pedido. Cambiarlo «para
cumplir el encargo» habría sido tocar un filtro sin necesidad, que es exactamente lo que la regla
«mide antes y después» existe para impedir.

### 1.2 «Fuentes de perfiles y UNSPSC duplicadas en varios archivos» — FALSO

- `lib/perfiles.js` es la única fuente de los perfiles (`PERFILES_FALLBACK` como respaldo del
  repositorio; lo que el dueño carga por la API manda sobre esos valores).
- Las whitelists UNSPSC viven UNA vez en `lib/unspsc.js` y `lib/perfiles.js` las **importa**
  (`lib/perfiles.js:58`). No hay segunda copia en el repositorio.
- La separación en dos archivos es deliberada y no debe «unificarse»: `lib/unspsc.js` es hoja del
  grafo de requires; hacer que importara perfiles cerraría el ciclo `perfiles → unspsc → perfiles`
  (decisión documentada en CLAUDE.md, sección «Dashboard y RUP por archivo»).

### 1.3 Conteo de funciones serverless

Antes: 12 archivos bajo `api/` (el techo del plan Hobby). Después: **6 routers** (`procesos`,
`inteligencia`, `perfil`, `admin`, `apu`, `pliego`), con la lógica intacta en `lib/handlers/` y
**todas** las rutas viejas respondiendo igual vía `rewrites` de `vercel.json`. La suite fija el
conteo exacto (`=== 6`) y las mismas peticiones de siempre (URLs viejas incluidas) pasan 4/4.

## 2. Inventario de fuentes

| Fuente | Identificador | Para qué | Estado verificado |
|---|---|---|---|
| SECOP II — Procesos | `p6dx-8zbt` (datos.gov.co) | Licitaciones activas + histórico adjudicado | **En uso.** Columnas de adjudicación/oferentes verificadas contra datos reales (2026-08); evidencia en `docs/APU_FUENTES.md`. 59 campos; keyset por `:id`. |
| SECOP II — PAA | `9sue-ezhx` | Planeación anticipada (12 meses) | **En uso.** Columnas verificadas contra la fuente real 2026-08-12 (`nombre_entidad`, `categorias_unspsc`, `valor_total_esperado`, mes en texto + `annio`). Tasa de acierto medida: 88 % (cota inferior, vigencia 2025). |
| SECOP II — Contratos Electrónicos | `jbjy-vk9h` | Ejecución del contrato: valor pagado, facturado, días adicionados, estado | **Integrado el 2026-08-16 (`lib/ejecucion`, vista de entidad) y el 2026-08-17 (`lib/socio`, por `documento_proveedor` + representante legal).** Nota original 2026-08-15 (§5.2), cuando NO se integró a propósito: su `valor_del_contrato` es idéntico al `valor_total_adjudicacion` de `p6dx-8zbt` en 8/8 procesos cruzados, así que para la BAJA no aporta nada nuevo; lo que aporta (adiciones, pagos) es la fase de ejecución, fuera del alcance de la F3. Unión: `proceso_de_compra` = `id_del_portafolio` de p6dx. |
| Proponentes por Proceso | `hgi6-6wh3` | Quiénes se presentaron (lista de proponentes por proceso) | **VERIFICADO 2026-08-15 (§5.1).** 2,28 M filas, hasta 2026-08-14. Unión: `id_procedimiento` = `id_del_proceso` (`_k`). **0 filas para procesos ABIERTOS**: los proponentes solo aparecen tras la apertura de ofertas → el nº de oferentes de un proceso abierto es «Sin referencia» por construcción. En adjudicados su conteo == `respuestas_al_procedimiento` de p6dx (8/8): aporta NOMBRES, no un conteo distinto. |
| Proveedores Registrados | `qmzu-gj57` | Sugerencia de socios de consorcio | Futuro. |
| Procuraduría — Antecedentes de SIRI | `iaeu-rcn6` | Sanciones disciplinarias certificables (due diligence del socio) | **En uso desde 2026-08-17** (`lib/socio`). 43 k filas, actualizado a diario; solo cédulas; `numero_identificacion` viene con espacios de relleno a la derecha → `starts_with` + igualdad recortada. Es el dataset, NO el certificado. |
| CCE — Multas y Sanciones SECOP I | `4n4q-k399` | Multas por contratista (regla del art. 90 Ley 1474) | **En uso desde 2026-08-17** (`lib/socio`). 1 707 filas (2026: 3; el grueso 2015-2020); `documento_contratista` a veces con DV pegado; trae filas de «Z ENTIDAD DE PRUEBA» que se descartan. SECOP II NO publica dataset equivalente. |
| GDELT DOC 2.0 + Google News RSS | API directa | Riesgo de orden público por municipio | Parcial: la app etiqueta ZONA por departamento (`lib/accesibilidad.js`, bandas declaradas «estimado»). El «motor por municipio» que el encargo da por hecho NO existe como tal. |
| INVIAS APU Regionalizados | API ArcGIS `hermes2.invias.gov.co` | Referencia oficial de insumos | **En uso** (`data/apu_invias.json`, vigencia 2025-1; la 2025-2 está corrupta EN ORIGEN — medido, no re-descubrir). Licencia: uso comercial exige autorización. |
| Retail (Homecenter, Easy, fabricantes) | Capturador manual | Techo negociable por insumo | **En uso** (`data/apu_retail.json`), 100 % trazable; 8 departamentos sin cobertura, declarados. |
| DANE ICOCIV / ICCV | — | Reajuste de precios | En validación; el entorno recibe 403 en varias fuentes oficiales — no citar sin abrir la fuente. |
| Relatoría CCE | relatoria.colombiacompra.gov.co | Conceptos citables | Futuro. 403 desde este entorno (observación con fecha ago 2026). |

## 3. Reglas de acceso que no hay que re-aprender

- Todo acceso a columnas de Socrata pasa por listas de **candidatas en orden de preferencia**
  (`lib/indice_competencia.js`, `lib/paa.js` con censo + sonda). Nunca leer un campo a pelo.
- Un **400 de Socrata jamás se reintenta**; 429/5xx con backoff + jitter honrando `Retry-After`.
- `conteo_de_respuestas_a_ofertas` puede valer 0 en la misma fila donde
  `respuestas_al_procedimiento` vale 3 — el ORDEN de las candidatas decide.
- `nit_del_proveedor_adjudicado` puede llegar como la cadena `"No Definido"`, que no es un NIT ni
  un `null`.
- Token de Socrata (App Token): va en variables de entorno de Vercel, jamás en el código. Si un
  token se compartió por un canal inseguro, se considera comprometido y se regenera.

## 4. Pre-auditoría de la Fase 1 (2026-08-15): «el divisor de horas del catálogo» — NO EXISTE

El plan de la Fase 1 (motor de costo real) manda **auditar el divisor de horas del catálogo antes
de tocarlo**, porque la Ley 2101/2021 baja la jornada máxima a **42 h semanales desde el
15-jul-2026** (≈ 210 h/mes, 8,4 h/día en semana de 5 días). Medido contra `data/apu_catalogo.json`
y `lib/apu/*.js`:

- **No hay ningún divisor de horas ni ninguna jornada en el repositorio.** La mano de obra se
  cotiza **por DÍA** (15 insumos `mano_obra` en `dia`, 3 en `glb`; 174/174 ítems llevan una
  línea de mano de obra) y el motor calcula `cantidad ÷ rendimiento` en **días por unidad de
  obra** (`lib/apu/catalogo.js:236`). El equipo va 40 por día, **5 por hora**, y el resto por
  unidad/global. Ni `calculo.js` ni `catalogo.js` dividen por 8, por 7,33 ni por 210: la
  advertencia de `CLAUDE.md` («no existe ninguna jornada en el repositorio; elegir 7,33 h u 8 h
  mueve la mano de obra ~9 %») sigue siendo cierta. **Corregir un divisor que no existe sería la
  tercera premisa falsa del prompt maestro** (tras «regex sobre `fase`» y «perfiles duplicados»).
- **Lo que SÍ toca la Ley 2101 es el CONTENIDO del día**: los jornales y las nueve cuadrillas
  calibradas con el Nogal (Bogotá, 2025, régimen de 44 h) pagan un día que desde el 15-jul-2026
  rinde 8,4 h en vez de 8,8 h. Si el jornal diario no cambia, **el costo por hora efectiva sube
  ≈ 4,8 %** (44/42 − 1) y, a rendimiento por día constante, el catálogo **subestima la mano de
  obra en esa proporción**. Es un factor de PARÁMETRO (aplicable sobre las 18 líneas de MO y sobre
  las 40 de equipo cotizadas por día si el equipo se paga por jornada), no una división.
- **La cerradura que impide colar una jornada por la puerta de atrás**: cinco equipos se tarifan
  por hora y 40 por día en el mismo catálogo; cualquier «costo horario» exigiría inventar la
  jornada que los une, y la prueba del módulo ya prohíbe publicarlo. Un parámetro editable
  (`apu:parametros`, como pide la F1) tiene que declarar **horas/día y horas/semana con su fecha
  de vigencia legal**, y el motor debe seguir SIN dividir: solo aplicar el factor declarado y
  publicarlo en `ajuste_regional`/`normativa` para que la cifra viaje con su origen.
- Prestacional: 1,55 en las cinco regiones (supuesto declarado, no dato — ver «normativa» en
  `CLAUDE.md`); la Ley 2101 no lo mueve.

Consecuencia para la sesión de F1: **empezar por el parámetro de jornada (vigencia + factor), no
por buscar el divisor.** Hecho en la Fase 1 (2026-08-15): `lib/parametros.js` + `lib/costos.js` +
`apu:parametros`; el despeje con cifras, las fórmulas, el impacto medido y el estado de verificación
de cada parámetro están en **`docs/metodologia.md`**.


## 5. Verificación de las dos fuentes de la Fase 3 contra producción (2026-08-15)

Regla del proyecto aplicada: **volver a llamar a la fuente antes de darla por perdida**. Las dos
respondieron **200** desde este entorno (`https://www.datos.gov.co/api/views/{id}.json` y
`/resource/{id}.json`); el 403 anotado en versiones anteriores era una observación con fecha.

### 5.1 `hgi6-6wh3` — Proponentes por Proceso SECOP II

- **Esquema (9 columnas):** `id_procedimiento` (text, `CO1.REQ.…`), `fecha_publicaci_n`
  (calendar_date), `nombre_procedimiento`, `nit_entidad` (number), `codigo_entidad` (number),
  `entidad_compradora`, `proveedor`, `nit_proveedor` (text — **puede llegar como `"No Definido"`**,
  el mismo literal-trampa que `nit_del_proveedor_adjudicado` en p6dx), `codigo_proveedor`.
- **Volumen y frescura:** 2 281 832 filas; `fecha_publicaci_n` de 2015-02-14 a 2026-08-14;
  `rowsUpdatedAt` 2026-08-15 08:14 UTC.
- **Clave de unión con el corpus:** `id_procedimiento` == `id_del_proceso` de `p6dx-8zbt` (es el
  `_k` que ya guarda Redis). Una fila por proponente: el nº de oferentes = filas por id.
- **Medición decisiva:** para 3 procesos ABIERTOS del listado real (`CO1.REQ.10809019`,
  `CO1.REQ.10762419`, `CO1.REQ.10589391`, cierre 19–24 ago 2026) → **0 filas**. Para 8 procesos
  ADJUDICADOS recientes (jun–ago 2026, obra, > $200 M) el conteo de hgi6 coincidió **8/8** con
  `respuestas_al_procedimiento` **y** con `proveedores_unicos_con` de p6dx (1, 5, 3, 1, 1, 6, 5, 1).
- **Consecuencia de arquitectura:** el nº de oferentes de un proceso abierto NO EXISTE en ninguna
  fuente pública hasta la apertura; el panel Piso/Techo lo dice («Sin referencia») y enseña en su
  lugar CUÁNTOS SUELEN presentarse a esa entidad (histórico, n ≥ 5, que ya calcula
  `lib/indice_competencia`). Lo que hgi6 aporta y p6dx no es la LISTA DE NOMBRES (contra quién se
  compite). **Integrado el 16-ago-2026 (`lib/proponentes.js`)**: la vista de entidad de
  `/api/inteligencia?op=entidad` publica `proponentes` — consulta AGRUPADA en vivo a hgi6 por los
  `id_procedimiento` de los procesos de la entidad que ya están en el corpus (nunca por NIT: los NIT
  se comparten entre regionales), top de quienes más se presentan con NIT (o «sin NIT» cuando llega
  «No Definido»), veces y última vez; best-effort con tiempo acotado (fallo → `ok:false` con motivo,
  el detalle sale igual). Medido en producción con el IDU: 249 procesos consultados, 123 con
  proponentes, 497 empresas distintas; el modal lo pinta como «Quiénes se presentan aquí».

### 5.2 `jbjy-vk9h` — SECOP II Contratos Electrónicos

- **Esquema (76 columnas), las relevantes:** `proceso_de_compra` (`CO1.BDOS.…`), `id_contrato`
  (`CO1.PCCNTR.…`), `referencia_del_contrato`, `estado_contrato` (En ejecución · Modificado ·
  Aprobado · Cancelado · En aprobación…), `modalidad_de_contratacion`, `tipo_de_contrato` («Obra»),
  `valor_del_contrato`, `valor_pagado`, `valor_facturado`, `valor_pendiente_de_pago`,
  `dias_adicionados`, `fecha_de_firma`, `fecha_de_inicio_del_contrato`, `fecha_de_fin_del_contrato`,
  `codigo_de_categoria_principal` (`V1.72141000`), `nombre_entidad`, `nit_entidad`, `departamento`,
  `proveedor_adjudicado`, `documento_proveedor`, `urlproceso`. **No trae presupuesto oficial.**
- **Volumen (obra):** 52 186 contratos, firmas de 2016-09-23 a 2026-08-14.
- **Clave de unión con el corpus:** `proceso_de_compra` == **`id_del_portafolio`** de `p6dx-8zbt`
  (columna que el corpus HOY NO PROYECTA: integrar jbjy exigiría añadirla a `lib/proyeccion` y una
  full). Varias filas por proceso cuando hay varios contratos (p. ej. `CO1.REQ.10693674`).
- **Medición decisiva:** en los mismos 8 procesos adjudicados, `valor_del_contrato` de jbjy ==
  `valor_total_adjudicacion` de p6dx **8/8** (al centavo: 178 228 778 511 · 33 597 500 863,77 ·
  554 640 044,55 …), con `valor_pagado = 0` en todos (contratos recién firmados).
- **Consecuencia de arquitectura:** la «baja verdadera» que el plan maestro pedía sacar de jbjy
  **es la que ya calcula `lib/indice_baja` desde p6dx** (`1 − valor_total_adjudicacion /
  precio_base`); integrar jbjy para eso duplicaría el índice con otro nombre. Lo que jbjy sí añade
  —adiciones en días, valor pagado vs. contratado, estado de ejecución— es la métrica de «cómo se
  ejecuta» (Cap. 11 del manual: el Estado paga tarde), útil para el flujo de caja y para el due
  diligence de entidades, no para el techo. **Integrado el 16-ago-2026 (`lib/ejecucion.js`)**: la
  vista de entidad publica `ejecucion` — consulta en vivo por `nit_entidad` + `tipo_de_contrato='Obra'`
  en la ventana de 24 meses, FILTRADA por el nombre canónico de la entidad (los NIT se comparten: los
  contratos firmados bajo otro nombre se declaran en `otros_nombres_con_este_nit` y no se suman);
  prórrogas (`dias_adicionados` > 0: n, %, mediana), suspendidos, reparto de `estado_contrato`, valor
  contratado; **pagos SOLO si la entidad registra alguno**. Medido antes de integrar (obra firmada
  desde 2024): solo 845 de 1 752 entidades registran algún pago y en «terminado» solo el 64 % lo trae →
  `valor_pagado = 0` es SIN DATO (la regla de `anticipo_pct = 0`); `dias_adicionados` sí está poblado
  (75 % de los «Modificado»). No hay adición de VALOR en el dataset (`valor_del_contrato` es el vigente):
  no se inventa. Medido con el IDU: 64 contratos, 30 procesos, 22 % con prórroga (mediana 81,5 días,
  máx. 456), 0 suspendidos, sin pagos registrados. El modal lo pinta como «Cómo ejecuta sus contratos».

### 5.3 Qué usa entonces el panel Piso/Techo (Fase 3)

| Dato | Fuente real | Regla |
|---|---|---|
| Presupuesto oficial | `p6dx-8zbt` `precio_base` (ya en el corpus) | Sin él no hay panel (`aplicable:false`, motivo). |
| Costo del usuario | Motor APU (`lib/apu/calculo` + parámetros de F1) | Costo directo × (1 + A + I + U mínima) ÷ (1 − contribución 5 % − deducciones cargadas). |
| Baja histórica | `lib/indice_baja` (p6dx, adjudicados) | Cascada entidad+familia → entidad → departamento+familia, **solo con n ≥ 5**; si no, «Sin referencia» y NO hay techo. El índice por segmento (mínimo 3) NO se usa. |
| Nº de oferentes | `lib/indice_competencia` (p6dx) | Promedio por entidad con n ≥ 5; del proceso abierto no existe (hgi6 = 0 filas) → «Sin referencia», jamás 0. |
| Umbral temerario | Regla de referencia: 80 % del presupuesto | La media − σ de las ofertas del proceso no se conoce antes del cierre (hgi6 no trae precios). Declarado como referencia, no como norma. |

## 6. Censo de columnas de `p6dx-8zbt` para los filtros (Fase 8 · 2026-08-16)

Consulta REAL desde este entorno (`https://www.datos.gov.co/resource/p6dx-8zbt.json`, HTTP 200),
dos muestras: **A)** 3 000 filas publicadas en los últimos 45 días (todas las modalidades) y
**B)** 4 000 filas de los últimos 90 días **restringidas a las modalidades competitivas** que la
app ingiere (licitación, selección abreviada, subasta, concurso de méritos, mínima cuantía,
régimen especial con ofertas). Guion: `censo_p6dx.js` / `censo_comp.js` de la sesión (fetch +
conteo de no vacíos). «Cobertura» = % de filas con la columna no vacía.

| Concepto del filtro | Columna REAL | Cobertura A | Cobertura B | Candidatas del plan v4 que **NO EXISTEN** |
|---|---|---|---|---|
| Objeto | `nombre_del_procedimiento`, `descripci_n_del_procedimiento` | 100 % | 100 % | `descripcion_del_proceso` |
| Cuánto vale | `precio_base` | 100 % | 100 % | `cuant_a_del_proceso` |
| En qué va | `estado_del_procedimiento` (100 %), `fase` (98,7 %), `estado_de_apertura_del_proceso` (100 %), `estado_resumen` (100 %) | | | — |
| Lo que sabe hacer (UNSPSC) | `codigo_principal_de_categoria` | 100 % | 100 % | `c_digo_principal_de_categoria`, `codigo_de_categoria_principal` |
| Cómo lo adjudican | `modalidad_de_contratacion` | 100 % | 100 % | `modalidad_de_contrataci_n`, `tipo_de_proceso` |
| Entidad | `entidad` | 100 % | 100 % | `nombre_de_la_entidad`, `nombre_entidad` |
| NIT de la entidad | `nit_entidad` | 100 % | 100 % | `nit_de_la_entidad` |
| Dónde queda (departamento) | `departamento_entidad` — **es un NOMBRE, no un código DANE**; 7,6 % vale «No Definido» | 100 % | 100 % | `departamento`, `departamento_de_la_entidad` |
| Dónde queda (ciudad) | `ciudad_entidad` — también con «No Definido» | 100 % | 100 % | `ciudad` |
| Cuándo hay que entregar la oferta | `fecha_de_recepcion_de` (nombre TRUNCADO por Socrata) y `fecha_de_apertura_de_respuesta` | **8,0 % / 6,0 %** | **100 % / 100 %** | `fecha_de_recepcion_de_respuestas`, `fecha_de_presentacion_de_ofertas` |
| Publicación | `fecha_de_publicacion_del`, `fecha_de_ultima_publicaci` | 100 % | 100 % | `fecha_de_publicacion_del_proceso` (`fecha_de_publicacion` existe pero 0,4 %) |
| Qué tipo de trabajo es | `tipo_de_contrato` (Obra · Interventoría · Consultoría · Suministros · Compraventa · Prestación de servicios · …) | 100 % | 100 % | — |
| Manifestación de interés (Fase 9) | `fase = «Manifestación de interés (Menor Cuantía)»` (333 de 1 593 abiertos en B), `proveedores_que_manifestaron` | | 99,8 % / 100 % | — |

**Lecturas que cambian decisiones:**

- La baja cobertura de la fecha de cierre en la muestra A es un ARTEFACTO de la mezcla: la
  contratación directa y el régimen especial sin ofertas (92 % de A) no tienen recepción de ofertas.
  En lo que la app ingiere (B) la fecha viene el **100 %** de las veces, y por eso el filtro «Cuándo
  hay que entregar la oferta» se apoya en ella sin esconder nada. `lib/negocio.fechaCierre` ya la
  resolvía por candidatas + red de seguridad `fecha*recep*`; no hubo que tocarla.
- `departamento_entidad` es texto («Distrito Capital de Bogotá», «Tolima», «No Definido»). El filtro
  acepta **código DANE o nombre** (`?dep=73` ≡ `?dep=Tolima`), traduce con la tabla de
  `public/filtros.js` (misma normalización que `lib/accesibilidad.clave`, con prueba) y trata «No
  Definido» como `sin_dato`: no entra en ningún departamento y se cuenta aparte en las facetas.
- `tipo_de_contrato` es la señal primaria del filtro «Qué tipo de trabajo es», corregida por el
  objeto: un «Suministros» con verbo de obra («suministro e instalación de tubería») es OBRA, y una
  «Prestación de servicios» que dice «construcción de placa huella» también.
- Los literales de `modalidad_de_contratacion` varían («Selección Abreviada de Menor Cuantía»,
  «Seleccion Abreviada Menor Cuantia Sin Manifestacion Interes», «Licitación pública Obra Publica»):
  se casan por raíz normalizada, y lo que no casa va a «otra» y se cuenta.
- **Línea base medida en producción antes de encender los filtros** (corpus real, 2026-08-16):
  Helder 831 visibles → obra 496 · interventoría 121 · servicios 105 · consultoría 53 ·
  **suministro 56 (6,7 %)**; Génesis 723 → suministro 41 (5,7 %). Los «suministros» son compras de
  verdad (computadores, UPS, morrales, equipos biomédicos), así que el defecto «suministro apagado»
  del plan se aplica: esconde < 10 % y se enciende con un clic. En cambio **preajustar la zona a
  Bogotá/Ibagué habría escondido el 41 %** (Helder: cerca 488 · media 320 · lejos 10) — supera con
  mucho el 10 % del protocolo, así que la zona NO se preajusta: queda como un clic opt-in («Solo
  cerca de mi zona», que es el `?zona=facil` de siempre).

## 7. Manifestación de interés: la norma y lo que el dataset SÍ y NO dice (Fase 9 · 2026-08-16)

**Norma vigente, contrastada.** Decreto 1082 de 2015, art. 2.2.1.2.1.2.20 («Procedimiento para la
selección abreviada de menor cuantía»), transcrito literalmente en la nota al pie 7 del **concepto
C-537 de 2025 de Colombia Compra Eficiente** (PDF público, leído desde este entorno; los portales
oficiales de normativa —suin-juriscol, funcionpublica— no respondieron): «1. En un término no mayor a
**tres (3) días hábiles** contados a partir de la fecha de apertura del Proceso de Contratación los
interesados deben manifestar su intención de participar, a través del mecanismo establecido para el
efecto en los pliegos de condiciones. 2. Si la Entidad Estatal recibe **más de diez (10)**
manifestaciones de interés puede continuar el proceso o hacer un **sorteo** para seleccionar máximo
diez (10) interesados… La Entidad Estatal debe establecer en los pliegos de condiciones si hay lugar a
sorteo y la forma en la cual lo hará. 3. Si hay lugar a sorteo, el plazo para la presentación de las
ofertas empezará a correr el día hábil siguiente a la fecha en la cual la Entidad Estatal informe a
los interesados el resultado del sorteo. 4. La Entidad Estatal debe publicar el informe de evaluación
de ofertas durante tres (3) días hábiles». La copia de la portada y `lib/portada.js` usan
exactamente ese plazo (3 hábiles) y ese umbral de sorteo (10).

**Censo real de `p6dx-8zbt`** (2 000 filas con `fase like 'Manifestaci%'` publicadas desde mayo de
2026, guion `censo_manif.js` de la sesión):

| Hallazgo | Consecuencia |
|---|---|
| `fase = «Manifestación de interés (Menor Cuantía)»` es el **rótulo del tipo de proceso** (SECOP II lo pega incluso al título); 1 929 de las 2 000 están en `estado_del_procedimiento = Evaluación` | NO sirve para saber si el plazo de manifestación está corriendo |
| `proveedores_que_manifestaron` = 0 en las 2 000 filas | NO sirve para «cuántos ya avisaron» ni para prever el sorteo |
| `fecha_de_recepcion_de` cae 6–14 días calendario después de la publicación (moda 7–8) | Es el cierre de **OFERTAS**, no el de manifestación (que sería ≤ 3 hábiles ≈ 3–5 calendario) |
| Ninguna columna trae la fecha límite de manifestación | El peldaño 1 de la cascada del plan (cronograma parseado, Fase 5) no existe todavía y el 2 (campo del dataset) no aplica |

**⚠️ CORRECCIÓN DEL 20-AGO-2026 — LA DECISIÓN DE ABAJO ERA LA MITAD DE LA VERDAD.** El censo es
correcto y sigue valiendo; lo que estaba mal es lo que se hacía con él. Calcular «apertura + 3 días
hábiles» y publicarlo como **fecha de vencimiento** confunde el TECHO legal con el plazo: la norma
transcrita arriba dice «en un término **no mayor a** tres (3) días hábiles», y quien fija el plazo
concreto es la entidad, en el pliego. Medido con un caso real: **MM-SA-MC-008-2026** (MUNICIPIO DE
MOTAVITA), apertura viernes 14-ago-2026, cierre de ofertas el 21. La app dijo «vence mañana, jueves
20»; SECOP II el 19 mostraba `ClosedForReplies`, «¿Sorteo realizado? Sí» y la última manifestación
del **martes 18 a las 11:24 AM** — la entidad fijó **UN** día hábil, no tres.

Hoy lo que se publica es una **VENTANA**: `puede_cerrar_desde` (apertura + 1 hábil) y
`vence_a_mas_tardar` (apertura + 3 hábiles), con un `estado` de tres valores (`abierta` ·
`por_confirmar` · `vencida` · `sin_fecha`). **No hay cuenta atrás sin la fecha del cronograma del
pliego.** Además, por el num. 3 del mismo artículo (con sorteo, el plazo de ofertas empieza el día
hábil siguiente al informe), el techo se recorta a `cierre_de_ofertas − 1 hábil` y una ventana
imposible se declara en vez de afirmarse. Detalle y cerraduras en `CLAUDE.md`, sección «EL PLAZO DE
MANIFESTACIÓN NO ES DE TRES DÍAS: TRES ES EL TECHO».

**Decisión original (la parte que se conserva):** los dos extremos de la ventana se CALCULAN
(peldaño 3 del plan) con `lib/habiles.js` (festivos Ley 51/1983 + Pascua) —apertura + 1 hábil y
apertura + 3 hábiles—, tomando como apertura `fecha_de_publicacion_del` (supuesto declarado en la
respuesta y en pantalla), y viajan **siempre** con `origenFecha: "ventana_calculada"` y la frase
«La ley fija un máximo, no un plazo: confírmelo en el cronograma».

**Y el peldaño 1 YA ESTÁ CABLEADO (20-ago-2026):** `lib/cronograma` extrae del texto del pliego el
hito `manifestacion` —la fecha límite REAL, la que fija la entidad—, `/api/pliego?op=cronograma` la
persiste al leerla (`manifestacion:cronograma`, un campo por proceso, con poda) y el listado y Mis
procesos la consumen con **un solo comando**. Con ella el estado pasa a `confirmada` y la tarjeta
vuelve a contar hacia atrás. Sin pliego leído, nada cambia. La fecha del pliego se acepta **solo si
cae entre el día siguiente a la apertura y el techo legal**: fuera de ese rango se descarta con su
motivo, porque un pliego puede rotular «manifestación de interés» la línea de PUBLICACIÓN y eso
produciría una fecha confiada y falsa — el mismo defecto con otra etiqueta. La
lista «abierto ahora» son las abreviadas de menor cuantía (excluida la variante «Sin Manifestacion
Interes», que existe en el dataset) cuyo plazo calculado no venció; los días de oficina que quedan se
recalculan con la fecha de HOY en Colombia al servir. «Próximos a abrir» sale del PAA (`9sue-ezhx`)
al construir la portada; si no responde, `proximos:null` → «Sin referencia», jamás 0.
