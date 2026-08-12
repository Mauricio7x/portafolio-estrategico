# Fuentes de precio del APU · qué se intentó, qué respondió y qué falta

**Fecha de las pruebas:** 2026-08-12 · **Rama:** `feature/apu-precios`

Este documento existe por una regla del dueño: **«nunca digas simplemente *no se puede*; siempre dejá el
camino marcado para cuando se pueda»**. Cada fuente lleva la evidencia literal de lo que respondió, no un
recuerdo de lo que respondía antes.

---

## 0 · DOS COSAS QUE LA DOCUMENTACIÓN DABA POR IMPOSIBLES Y NO LO SON

`CLAUDE.md` afirmaba —y lo repetía en varios sitios— que este entorno **no alcanza `datos.gov.co`**
(«allowlist del proxy, `CONNECT 403`») y que el índice de las Especificaciones INVÍAS **«nunca se pudo abrir
(403)»**. **Las dos cosas son falsas hoy.** Verificado:

```
200  https://www.datos.gov.co/resource/p6dx-8zbt.json?$limit=1     ← datos reales
200  https://www.invias.gov.co/                                     (343.786 bytes)
403  https://www.contratos.gov.co                                   ← este sí sigue bloqueado
```

**Lección que hay que dejar escrita:** un 403 registrado en la documentación es una **observación con fecha**,
no una propiedad del entorno. Antes de dar una fuente por perdida hay que volver a llamarla — y antes de dar
por buena una URL que devuelve 404, hay que buscar la ruta real en la navegación del sitio, que es
exactamente lo que había pasado con INVIAS.

---

## FUENTE A · SECOP II histórico — **DISPONIBLE Y VERIFICADA**

Dataset `p6dx-8zbt`. Ya está en Redis (`licitaciones:historico:mes:*`) y además **se puede consultar en vivo
desde este entorno**.

### Verificación de las columnas de adjudicación (cierra un pendiente del proyecto)

`CLAUDE.md` marcaba las columnas de adjudicación y de oferentes como **«PENDIENTE VERIFICACIÓN»**. Se
consultó una fila real adjudicada (`$where=adjudicado='Si'`, 55 columnas) y **las candidatas que ya usaba
`lib/indice_competencia.js` son las correctas**:

| Campo real en `p6dx-8zbt` | Valor de ejemplo | Ya estaba en |
|---|---|---|
| `valor_total_adjudicacion` | `37842000` | `CAMPOS_VALOR_ADJUDICADO` |
| `nombre_del_proveedor` | `Gestión de Seguridad Electrónica S.A.` | `CAMPOS_ADJUDICATARIO` |
| `nit_del_proveedor_adjudicado` | `No Definido` | `CAMPOS_ADJUDICATARIO_NIT` |
| `fecha_adjudicacion` | `2025-08-21T00:00:00.000` | `CAMPOS_FECHA_ADJUDICACION` |
| `respuestas_al_procedimiento` | `3` | `OFERENTES_CAMPOS` |
| `proveedores_unicos_con` | `3` | `OFERENTES_CAMPOS` |
| `id_adjudicacion` | `CO1.AWD.2334549` | `CAMPOS_ADJUDICACION` |

**Dos detalles que importan:** en esa misma fila `conteo_de_respuestas_a_ofertas` vale **0** mientras
`respuestas_al_procedimiento` vale **3** — son columnas distintas y no intercambiables, así que el ORDEN de
las candidatas decide. Y `nit_del_proveedor_adjudicado` puede llegar como la cadena `"No Definido"`, que **no
es un NIT y tampoco es un `null`**: quien la lea tiene que tratarla como ausencia.

### Qué se puede y qué NO se puede hacer con esto

**SE PUEDE:** una referencia de mercado sobre el **CONTRATO COMPLETO** por familia UNSPSC y departamento —
implementada en `lib/apu/precios.referenciaDeMercado`, con mediana (no promedio: un contrato de $40.000 M
mueve un promedio y no mueve una mediana) y mínimo de 5 procesos.

**NO SE PUEDE:** sacar de aquí el **precio unitario de un ítem**. `p6dx-8zbt` publica el valor adjudicado del
contrato entero. De ahí sale cuánto costó un kilómetro de placa huella; **no** cuánto cuesta el m³ de
excavación que va dentro. Meter un promedio de contrato en la columna «valor unitario» produce un número con
cara de dato que nadie puede auditar. Por eso el nivel `mercado` de la cascada **se consulta y declara
siempre que no aplica a un ítem**, con prueba que lo fija: es la cerradura contra un futuro «completemos la
cascada».

---

## FUENTE B · Pliegos de condiciones adjudicados — **NO DISPONIBLE**

- **Qué hay:** `urlproceso` **sí** viaja en la proyección histórica (`lib/proyeccion.js`).
- **Por qué no sirve todavía:** apunta a la **página del proceso en SECOP II**, que es HTML detrás del portal
  — no a un PDF. Y `https://www.contratos.gov.co` responde **403** desde este entorno (probado arriba).
- **Alternativa usada:** ninguna; el nivel existe en la cascada y **declara** por qué no respondió.
- **Qué haría falta:** resolver de `urlproceso` la lista de documentos del proceso (SECOP II expone un API de
  documentos por `id_del_proceso`) y bajar el pliego con `/api/apu/descargar`, que **ya tiene** el control
  SSRF completo (resuelve el nombre, valida la IP, revalida cada redirección, verifica la firma `%PDF-`).
  El lector de tablas (`lib/apu_pliego.js`) **ya existe y ya funciona**. La pieza que falta es solo el paso
  de `urlproceso` → URL del PDF.

---

## FUENTE C · INVIAS · APU Regionalizados de Referencia — **ALCANZABLE, y la ruta quedó encontrada**

Esto es lo que el encargo daba por imposible. **No lo es: la URL que se venía usando estaba mal.**

- **Página real:**
  `https://www.invias.gov.co/publicaciones/4149/analisis-de-precios-unitarios-apu-regionalizados-de-referencia/`
  → **200**, 237.969 bytes.
- **Mecanismo de descarga:** `https://www.invias.gov.co/loader.php?lServicio=Tools2&lTipo=descargas&lFuncion=descargar&idFile=<N>`

**Descargados y verificados** (firma `%PDF-1.7` comprobada byte a byte):

| `idFile` | Nombre real (de `content-disposition`) | Bytes |
|---|---|---|
| `1019` | `Listado de provincias Análisis de Precios Unitarios 2021.pdf` | 667.386 |
| `1015` | `Resolución 4561 de 29 de noviembre de 2022.pdf` | 363.416 |
| `1016` | `Resolución 2451 del 15 de julio de 2022.pdf` | 249.633 |

La **Resolución 4561/2022** es exactamente el documento que `CLAUDE.md` da como *«nunca se pudo abrir
(403)»*, y es la razón por la que hoy **ningún código `INV-` se publica** y el artículo probable viaja en
`articulo_invias_candidato`. **Se puede abrir.**

### El obstáculo que había, RESUELTO

Los tres PDF usan **fuentes Type0/CID**, así que la extracción cruda de los operadores de texto devuelve
basura (se midió: 371.685 caracteres ilegibles). **No era un bloqueo de acceso sino de decodificación**, y
está resuelto: `tests/extraer_provincias_invias.js` es un extractor en **Node puro, sin dependencias**, que

1. decodifica las CMaps **`/ToUnicode`** (sin eso el texto no es ASCII y sale ilegible);
2. lee **solo** los streams referenciados por `/Contents` de cada página — barrer todos mete los programas de
   fuente (`FontFile2`), que son binarios y traen `TJ` por casualidad;
3. sigue el **cursor de texto** (`Tm`/`Td`/`TD`/`T*`) y reconstruye la fila por **COORDENADA**.

El punto 3 no es un lujo: **el orden del stream no es el orden visual.** En esta tabla las celdas de
departamento vienen agrupadas aparte de sus filas de provincia, así que leer «en orden» asocia provincias al
**departamento equivocado**. Es la misma técnica que `lib/apu_pliego.js` ya usa con los pliegos.

### Lo que salió: `data/apu_invias_provincias.json`

**32 departamentos · 140 provincias · 130 con nombre.** Regenerable con
`node tests/extraer_provincias_invias.js` (baja el PDF y reproduce el archivo **byte a byte**).

**La asignación provincia → departamento se AUTOVERIFICA**, y por eso no es una conjetura: la celda de cada
departamento trae su cantidad de provincias y, cuando esa cantidad es 1, lleva **pegado el número global** de
su provincia. Si la cola se puede partir en `(c, p)` con `p == acumulado + c`, el corte es el correcto — y
cuadra en los **32**. Contraste independiente en la suite: Antioquia tiene **9** subregiones (Bajo Cauca,
Magdalena Medio, Oriente, Occidente…) y Boyacá **13** provincias. Si el parseo corriera las columnas, cae.

**10 nombres quedan en `null` a propósito.** Son departamentos de UNA provincia, donde la celda del número se
fusionó con la del departamento en el PDF. **Un texto real en la fila equivocada es peor que un hueco** (R1)
— la misma regla que rige la extracción de la experiencia. El departamento sí se conoce y sí viaja.

### Lo que falta para encender el badge INVIAS

1. ~~El mapa provincia → departamento~~ **hecho** (`data/apu_invias_provincias.json`).
2. De la **Res. 4561/2022** (ya descargada, `idFile=1015`) sale la numeración oficial de las Especificaciones,
   que permitiría **publicar códigos `INV-`** en vez de `articulo_invias_candidato`. El extractor ya sirve
   para leerla.
3. **Las tablas de precio por provincia NO estaban entre los tres archivos de esa página.** Hay que revisar el
   resto de `idFile` de la publicación y las páginas hermanas (`/publicaciones/4237`). **Esto es lo único que
   bloquea hoy.**
4. Cargarlas en `data/apu_invias/<provincia>.json` con el esquema de `data/apu_catalogo.json`
   (`insumos[]` + `items[]`), `fuente:"invias"` y `_meta.semestre`, y añadir la rama en `precioEnRegion`.
5. Ojo con la granularidad: el INVIAS cotiza por **PROVINCIA (140)**, no por departamento (32) ni por las
   **5 regiones** del catálogo actual. El mapa del punto 1 es justo el puente que faltaba.

**Hasta que el paso 4 esté hecho, el badge INVIAS NO se emite.** Rotular «INVIAS» un precio que no lo es
sería el peor error posible en una herramienta con la que se fija el precio de una oferta.

---

## FUENTE D · El propio contratista — **IMPLEMENTADA. Es la más valiosa.**

Y no es un premio de consolación: **son los precios de SU proveedor, SU región y SU mercado**, que es
estrictamente mejor que cualquier referencia nacional promediada.

- **Nivel 1 de la cascada**, manda sobre todo lo demás.
- Se guarda en `apu:precios:{perfil}` (hash: `item_id → {precio, guardado_el, region, origen}`) cada vez que
  el usuario corrige un precio y guarda el presupuesto.
- **Sin TTL**, aunque el borrador sí lo tenga: un borrador es trabajo en curso y un precio de mercado es
  conocimiento. La fecha viaja dentro para poder ver cuán viejo es.
- Solo se aprende lo que casa con un ítem del catálogo (`item_id`): un precio pegado a una fila suelta de un
  Excel no tiene a qué ítem volver, y guardarlo crearía entradas que nadie podría corregir después.
- Es **por contratista**: hay prueba de que los precios de un perfil no se ven desde otro.

**Es la única fuente que mejora sola con el uso.**

---

## FUENTES E y F · Construdata, CAMACOL, Tienda Virtual del Estado — **NO INTENTADAS EN SERIO**

- **Construdata (Legis)** es de **pago y con licencia**. Incorporar su tarifario a un producto sería un
  problema de licencia, no técnico: queda **fuera de alcance por decisión**, no por imposibilidad.
- **CAMACOL** (`https://www.camacol.co` → 301) publica **índices** de costos, no precios unitarios. Un índice
  sirve para **actualizar** un precio base en el tiempo —que es justo lo que el catálogo ya hace con el
  ICOCIV del DANE— no para fijar el precio de un ítem.
- **Tienda Virtual del Estado Colombiano**: útil para materiales estandarizados (cemento, acero, tubería) y
  vale la pena mirarla. **No se probó** en esta pasada.

---

## Estado de la cascada tal como quedó

| Nivel | Estado | Nota |
|---|---|---|
| 1 · `usuario` | ✅ funcionando | Aprende de cada corrección. Hay prueba de que persiste entre sesiones. |
| 2 · `pliego` | ⬜ declarado | Falta `urlproceso` → URL del PDF. Todo lo demás ya existe. |
| 3 · `mercado` | 🟡 implementado, **fuera de la cascada de ítems** | Contrasta el TOTAL. No es —ni puede ser— un precio unitario. |
| 4 · `catalogo` | ✅ funcionando | Nogal 4 + factor regional. |
| 5 · `sin_precio` | ✅ funcionando | No suma al total; se pide el precio. Un $0 sería inventado. |

---

## Los códigos `INV-` del catálogo, verificados por primera vez (ago 2026)

`data/invias_articulos.json` — **105 artículos** con capítulo, número y título, extraídos de la
**Res. 4561/2022** con el mismo extractor de `tests/extraer_provincias_invias.js`.

El proyecto **no publica códigos `INV-`** porque su numeración estaba *sin verificar* y el índice oficial se
daba por inalcanzable. Ya no lo está, y el cruce contra el catálogo **encontró tres códigos mal**:

| Código en el catálogo | Descripción | Apunta al artículo | Que oficialmente es | Debería ser |
|---|---|---|---|---|
| `INV-201.1` | Desmonte y limpieza en bosque | 201 | Demolición y remoción | **200** — Desmonte y limpieza |
| `INV-661.1` | Cuneta revestida en concreto | 661 | Tubería de concreto reforzado | **671** — Cunetas revestidas en concreto |
| `INV-673.1` | Alcantarilla en tubería de concreto reforzado | 673 | Subdrenes con geotextil y material granular | **661** — Tubería de concreto reforzado |

Los otros ocho numerados coinciden (210, 220, 320, 330, 450, 500, 630, 640). `INV-PH.1` (placa huella) **no
es** un artículo INVIAS y no se cruza.

**Esto es exactamente el daño que la regla contenía:** un artículo INVIAS equivocado en un presupuesto es una
**cita falsa a la norma técnica**, y la entidad la lee.

**CORREGIDOS (ago 2026).** `INV-201.1 → INV-200.1`, `INV-661.1 → INV-671.1`, `INV-673.1 → INV-661.1`.

⚠️ **Es un INTERCAMBIO, no tres renombres sueltos:** `INV-661.1` es a la vez origen y destino, así que
aplicarlos en secuencia haría que el 673 pisara al 661 antes de que este llegara a ser 671. Se sustituyen en
UNA sola pasada.

**Los códigos viejos siguen resolviendo** (`CODIGOS_RENUMERADOS` + `itemPorCodigo` en `lib/apu/catalogo.js`,
punto único usado por `calculo` y por `precios`): los borradores (`apu:presupuesto:*`) y los precios propios
del contratista (`apu:precios:*`) guardan el `item_id` y **nadie los purga** (R11). El **código vigente gana
sobre el alias** — si no, `INV-661.1` (hoy la alcantarilla) se iría al 671 y la corrección habría creado un
error nuevo.

**Y queda un código AMBIGUO, que es el riesgo fino de todo esto:** un precio guardado bajo `INV-661.1`
significa **cuneta** si es anterior a la corrección y **alcantarilla** si es posterior. Aplicar el precio de
una cuneta a una alcantarilla no se ve — sale un número plausible. Se desambigua con `guardado_el`, que ya
viajaba en cada registro, y **sin fecha no se arriesga**: preferir un precio posiblemente equivocado a no
tener precio sería el peor canje de este módulo. Hay prueba de los siete casos.

**Cómo NO detectarlos:** se intentó comparar el vocabulario de la descripción con el del título oficial y no
sirve — da falso positivo en «Terraplén» vs «Terraplenes» y falso **negativo** en «Cuneta revestida en
CONCRETO» vs «Tubería de CONCRETO reforzado», que comparten justo la palabra que no distingue nada. Una
heurística floja aquí no es un atajo: es la forma de dar por bueno un código equivocado.
