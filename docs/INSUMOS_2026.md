# Insumos de precios 2026 · censo, contraste y qué hacer con ellos

Análisis de los 22 archivos que el dueño aportó y que quedaron guardados «para análisis posterior»
en `docs/insumos_2026_pendiente/` (commits `8cb79fe`, `61d3c4c`, `5e2c3a6`, `9a26236`, `1a83491`).
Ninguno estaba leído todavía: los commits solo los acopiaron.

> **Estado (ago 2026): tres de los cinco ya están integrados.** El censo y los contrastes de este
> documento se hicieron primero; después, y por decisión del dueño, se integraron **EPC, FFIE e
> ICCU** como bancos oficiales de ítems. Lo que cada uno aporta y cómo se resolvió está en §7.
> Siguen SIN integrar el factor prestacional (§4) y los insumos del FFIE (§2.5), y siguen
> descartados Boyacá y el APU 2023 por vigencia (§2.6).

Este documento dice qué es cada archivo, qué mide, qué se contrastó contra las fuentes que la app YA
usa, y en qué orden convenía integrarlos.

Herramienta usada para los PDF: `tests/pdf_texto.js` (manual, Node puro, sin dependencias — la app
sigue leyendo pliegos con pdf.js en el navegador).

---

## 1. Tres premisas del proyecto que estos archivos desmienten

Están escritas en `CLAUDE.md` y hay que corregirlas, porque son la razón por la que estos huecos
llevaban meses abiertos.

| Lo que decía la memoria | Lo que hay medido |
|---|---|
| «FFIE (no publica precios)» | **Publica**: 1 051 ítems de edificación con precio tope, **× 33 departamentos**, vigencia 2026 |
| «ICCU/Cundinamarca 2025 bloqueado (403)» | Está la lista **2026** completa: 15 provincias, 58 municipios, ~1 000 ítems cada una |
| «La edificación pura sigue con los 157 del Nogal» | Hay **tres** bancos de edificación 2026 (FFIE nacional, ICCU municipal, EPC con composición) |

Es la misma lección ya escrita para `datos.gov.co` e `invias.gov.co`: **un «no se puede» anotado en
la documentación es una observación con fecha, no una propiedad del mundo.** Aquí ni siquiera hubo
que volver a llamar a la fuente — el dueño la trajo, y el archivo llevaba días en el repositorio sin
que nadie lo abriera.

---

## 2. Censo de los 22 archivos

### 2.1 FFIE · precio tope de edificación, cobertura nacional ★

`Listado_Precios_Tope_Dpto_Vigencia_2026.xlsx` — hoja «PRECIO TOPE POR DPTO 2026».

- **1 174 filas · 1 051 ítems con precio · 33 columnas de departamento** (los 32 + Bogotá).
- Capítulos: preliminares, demoliciones, cimientos, estructuras, mampostería, cubiertas, acabados.
- Cada columna es un «GRUPO No. N» del FFIE (Fondo de Financiamiento de la Infraestructura
  Educativa) y el rótulo interno es `PRECIO TOPE FFIE`.

Es la única fuente del lote que **cubre los 33 departamentos**, incluidos los 8 que hoy salen
`sin captura retail` (Amazonas, Arauca, Caquetá, Guainía, Guaviare, San Andrés, Vaupés, Vichada) y
los 19 que no tienen factor regional en el catálogo.

⚠️ **Es un precio TOPE, no un precio de mercado.** Es el techo que el FFIE reconoce en sus
proyectos; leerlo como «lo que cuesta» sería el error de categoría que el módulo ya evita con
`techo_de_insumo` en la cascada de precios. Si se integra, va con su propio nivel declarado.

### 2.2 ICCU 2026 · Gobernación de Cundinamarca, por municipio ★

`LISTA_DE_PRECIOS_ICCU_2026.pdf` — «LISTA DE PRECIOS CONSTRUCCIÓN, URBANISMO Y VÍAS (2026)».

- **371 páginas con texto**, leídas en 2,6 s con `tests/pdf_texto.js`.
- **15 provincias · 58 municipios · ~1 000 ítems por provincia · 28-33 capítulos.**
- 15 028 filas de ítem reconocidas; 5 708 líneas no reconocidas son descripciones partidas en dos
  renglones (el caso que `lib/apu_pliego` ya resuelve) y 742 son cabeceras.
- Capítulos: los de edificación completos (mampostería, pañetes, cubiertas, carpintería, pisos,
  cielo raso, pinturas, aparatos sanitarios) **más** acueducto, alcantarillado, andenes y vías.

**Es más granular que cualquier fuente que la app tenga hoy**: el INVIAS llega a provincia y el IDU
solo cubre Bogotá; esto da precio **por municipio**. La cabecera declara que los precios
«contemplan suministro, instalación y transporte».

### 2.3 EPC · APU con composición completa ★

`APUsEPC2026_Feb.xlsx` — Empresas Públicas de Cundinamarca, feb 2026, provincia ALMEIDAS
(municipio VILLAPINZÓN).

- **454 hojas**: 440 APU individuales (una por numeral) + maestras (ACTIVIDADES 526, RENDIMIENTOS
  527, MATERIALES 942, EQUIPO 35, TRANSPORTES, mano de obra).
- Cada APU trae las cuatro secciones con código de insumo, unidad, valor unitario, rendimiento y
  valor total: **I. EQUIPO · II. MATERIAL · III. TRANSPORTE · IV. MANO DE OBRA**.

**La aritmética es exactamente la del motor de este proyecto**, verificada sobre el ítem 1.1.1:

```
ESTACA DE MADERA      3 452,19 × 2,4   =  8 285   (material × cantidad)
PUNTILLA 2"          10 567,24 × 0,05  =    528
                                 SUBTOTAL  8 813  ✓
ESTACIÓN TOTAL       26 330,98 ÷ 174   =    151   (equipo ÷ rendimiento)
HERRAMIENTA MENOR         2 826 × 0,05 =    141   (% de la mano de obra)
                                 SUBTOTAL    292  ✓
CUADRILLA TOPOGRAFÍA   491 678 ÷ 174   =  2 826   (MO ÷ rendimiento)
                              TOTAL COSTO 11 931  ✓
```

Es el mismo esqueleto que `lib/apu/catalogo.costoDirecto` ya calcula (MO y equipo dividen por
rendimiento, materiales multiplican, herramienta menor como porcentaje de la MO). **No haría falta
inventar ninguna fórmula nueva para consumirlo.**

Cubre agua y saneamiento (redes, zanjas, cauces, estructuras), que es donde el catálogo actual
—157 ítems de un contrato de edificación— está más flojo.

### 2.4 Doce cartillas provinciales de EPC · el precio por municipio

`ALTOMAGDALENA` · `BAJOMAGDALENA` · `CARTILLAUBATE` · `GUALIVA` · `GUAVIO` · `MAGDALENACENTRO` ·
`MEDINA` · `RIONEGRO` · `SABANACENTRO` · `SOACHA` · `SUMAPAZ` · `TEQUENDAMA` (`.pdf`).

Son la **regionalización** de §2.3: los mismos ítems de EPC, con su precio por municipio. El xlsx
solo trae ALMEIDAS; estas doce cubren el resto de Cundinamarca.

Su texto tiene un defecto de origen, documentado en §5: las letras salen sustituidas. **Las cifras
y los nombres de municipio salen correctos**, y la unión con el xlsx por numeral funciona:

```
numeral   descripción LIMPIA (del xlsx)            ALMEIDAS   UBATÉ
1.1.1     LOCALIZACIÓN Y REPLANTEO REDES            11 931    12 214
1.1.2     LOCALIZACIÓN Y REPLANTEO ESTRUCTURAS      15 197    15 500
1.1.3     MANEJO DE AGUAS EN ZANJA, CUALQUIER ANCHO 18 315    18 315
2.1.1     DEMOLICIÓN DE ESTRUCTURAS EN CONCRETO    130 468   130 468
```

**346 de 346 filas con numeral casaron (100 %).** O sea: la descripción se toma del Excel, el precio
del PDF, y la clave de unión es el numeral. El texto corrupto deja de importar.

### 2.5 Insumos, cuadrillas y factor prestacional 2026

`Listado_Herramientas_Equipos_Insumos_2026.xlsx` — **HERRAMIENTA 1 000 filas** y **MATERIALES
1 795 filas**, con categoría (eléctricos, hidrosanitario…), unidad y valor 2026. Es un banco de
insumos, no de ítems: alimentaría la misma capa que `data/apu_retail.json` y `apu_invias.json`,
pero con precio de referencia oficial en vez de vitrina.

`Analisis_ManoDeObra_FactorPrestacional_Cuadrillas_2026.xlsx` — hojas «FP» y «CUADRILLAS». Trae el
factor prestacional **calculado y desglosado** para 2026, y esto toca un pendiente explícito del
proyecto (ver §4).

`Listado_Precios_EstudiosYDisenos_2026.xlsx` — estudios y diseños por m², sistema convencional
frente a modular. No es obra: sirve para procesos de consultoría, que la app sí lista.

### 2.6 Boyacá, y por qué NO sirve tal cual

`Lista_oficial_precios_unitarios_Boyaca_20260818.csv` — 1 255 ítems: 635 edificaciones, 321
saneamiento, 207 vías, 37 sueldos, 30 gasoductos, 25 análisis básicos.

El nombre del archivo lleva la fecha de descarga (18-ago-2026), **no la de la lista**. Las 1 255
filas coinciden exactamente con el dataset `ae7u-y7m2` que `CLAUDE.md` ya tenía fichado como **de
2022**, y el contraste de §3 lo confirma por el lado del precio. **Sigue siendo la lista vieja**: la
descarga reciente no la actualizó.

### 2.7 Lo demás

- `Visor_BPR_2026I_FaseI_29072026.xlsx` — **ya integrado** (es la fuente de `data/apu_idu_items.json`,
  IDU 2026-I). Está aquí por duplicado; no hay nada que hacer.
- `APU_2023_Construccion_Infraestructura_V5_del_15sep23.pdf` — APU de 2023. Tres años de rezago;
  mismo problema que Boyacá y sin la ventaja de la cobertura. Baja prioridad.
- `Capacitacion_Presentacion_ItemsNoPrevistos.pptx` — material de capacitación sobre ítems no
  previstos. **No es una fuente de precios**, pero su tema sí es de negocio (un ítem no previsto es
  justo lo que obliga a construir un APU nuevo a mitad de obra).

---

## 3. Contraste de precios entre fuentes

Antes de integrar nada hay que preguntar lo que ya salvó al proyecto una vez con la vigencia 2025-2
del INVIAS: **¿estos precios son creíbles?** Medianas por ancla, en pesos.

| Ancla | FFIE Cund. | ICCU Cund. | FFIE Boyacá | Boyacá CSV | Nogal (Bogotá) |
|---|---|---|---|---|---|
| Pañete / repello (m²) | 30 914 | **30 911** | 28 895 | 22 676 | 40 150 |
| Mampostería ladrillo (m²) | 139 112 | **140 820** | 130 026 | 54 423 | — |
| Concreto 21 MPa (m³) | 995 697 | **918 121** | 930 663 | 816 987 | — |

**1. ICCU y FFIE se validan mutuamente.** Son dos entidades independientes, misma vigencia y mismo
departamento, y coinciden: pañete ×1,00, mampostería ×1,01, concreto ×0,92. Dos fuentes que no se
copian entre sí y dan el mismo número son la mejor evidencia disponible de que ambas están vivas.

**2. Boyacá CSV está sistemáticamente por debajo** del FFIE 2026 del **mismo departamento**: ×0,88
en concreto, ×0,78 en pañete, ×0,60 en excavación, ×0,42 en mampostería. Es la firma de una lista
vieja, y confirma la advertencia que ya estaba escrita: usarla tal cual **subestimaría el costo**,
que en este módulo es el error caro.

**3. El contrato adjudicado está por ENCIMA del precio tope FFIE** (pañete: Nogal $40 150 contra
$30 607 en Bogotá). Es coherente con lo que cada cifra significa —un tope de referencia para obra
educativa no es lo que se pagó en un contrato real— y es un recordatorio de que el FFIE no puede
entrar a la cascada como si fuera una cotización.

### Límite del método, dicho antes de que alguien cite estas cifras

El emparejamiento se hizo **por palabras clave**, no con el mapeo real del proyecto
(`lib/apu_mapeo`). Es tosco y produce ratios sin sentido cuando mezcla ítems distintos: la
«excavación manual» salió ×0,36 porque enfrentó una excavación de zanja a 1 m con una excavación
general, y el pañete de Boyacá arrastra filas de *demolición* de pañete. **Los ratios extremos de
esa tabla son ruido de emparejamiento, no evidencia de precio.** Los tres de arriba se sostienen
porque las coincidencias son numerosas (99-219 filas) y consistentes entre sí. Una integración de
verdad tiene que casar los ítems con las primitivas del proyecto, que es justo lo que evita que
existan dos definiciones de «se parecen».

---

## 4. El factor prestacional: hay fuente 2026, y mide otra cosa

`CLAUDE.md` es explícito en que el **1,55 es un supuesto, no un dato**, recuperado de un comentario
de un archivo borrado, y que el rótulo «recuperado» engaña. El archivo de cuadrillas trae por fin un
cálculo con desglose para 2026:

| Componente (anual, jornal mínimo) | Valor |
|---|---|
| Cesantías, intereses, prima, vacaciones | según jornal |
| **Dotación anual** (3 dotaciones) | 831 639 |
| **Elementos de bioseguridad** | 1 620 000 |
| Seguro social patronal | 4 038 988 |
| **SENA e ICBF** | **0** (exonerados) |
| Caja de compensación | 852 107 |
| Aporte adicional SENA · FIC | 525 272 |
| **FACTOR SOBRE SUELDO MENSUAL** | **2,19** (rango 2,09–2,31 según sueldo) |

Cifras de contexto que trae el mismo archivo y que **coinciden con las del proyecto**: SMMLV 2026
$1 750 905 ✓, auxilio de transporte $8 303,17/día, jornal mínimo $58 363,5, **días reales trabajados
= 295**.

⚠️ **2,19 NO es «el 1,55 corregido», y confundirlos sería un error caro.** Miden cosas distintas:

- El 1,55 del catálogo es el recargo prestacional sobre el jornal, y `lib/apu/normativa.js` ya
  documenta que su suma cae entre el 44,79 % exonerado y el 58,29 % nominal, **declarando que la
  dotación y el auxilio de transporte quedan fuera**.
- El 2,19 de este archivo **sí los incluye** (dotación, bioseguridad, FIC) y además está calculado
  sobre **días reales trabajados (295 de 365)**, o sea que lleva dentro el efecto de pagar el año y
  trabajar diez meses: solo ese factor son 365 ÷ 295 ≈ 1,24.

Neutralizando el efecto de días no trabajados, 2,19 ÷ 1,24 ≈ **1,77**, y de ahí habría que descontar
dotación y bioseguridad para poder compararlo con el 1,55. **No se hace esa cuenta aquí**: sería
exactamente el tipo de derivación a ojo que este módulo tiene prohibida. Lo que sí queda es que
**existe una fuente 2026 con desglose completo** para sustituir un supuesto sin fuente, y que
tocarlo mueve los 157 ítems `NOG-*` (la calibración es circular, ya está medido: ≈1 % de media,
2,89 % en el peor caso).

---

## 5. El defecto de las cartillas provinciales, y por qué no es del extractor

Las doce cartillas de §2.4 usan fuentes Type0/Identity-H **con** ToUnicode, así que deberían leerse
limpias. Salen así:

```
LOYALIZAYIÓN Y REPLANTEO REDES        (LOCALIZACIÓN…)   C → Y
MANEÓO DE AGUAS EN ZANÓA              (MANEJO…)         J → Ó
DEMOLIYIÓN DE ESTRUYTURAS EN YONYRETO (DEMOLICIÓN…)     C → Y
```

El primer sospechoso era el extractor: unificar los CMaps de todas las fuentes de un archivo es
incorrecto, porque `/F1` **no es una identidad global** —en estos PDF apunta a objetos distintos
según la página—. Se implementó la resolución correcta (por página y por recurso, siguiendo
`/Type /Page → /Resources → /Font → /ToUnicode`) y las páginas pasaron a resolver sus propias tablas
(22/23 y 29/29). **El texto no cambió.**

Conclusión: **el ToUnicode del archivo está mal en origen.** La sustitución es determinista y
sistemática, no aleatoria, que es la firma de un subset mal generado; cualquier lector —incluido
Adobe— copia exactamente lo mismo. No hay nada que arreglar desde este lado.

Lo que sí es aprovechable, y basta: **las cifras y los municipios salen correctos**, y la unión por
numeral con el Excel de EPC casa al 100 %. La descripción se toma del Excel, que la tiene limpia.

---

## 6. Qué integrar, en qué orden y con qué cuidado

Recomendación, de mayor a menor relación valor/riesgo. **Ninguno está hecho.**

**① EPC · APU con composición (§2.3 + §2.4).** El de mayor valor: es la única fuente del lote con
composición completa, su aritmética ya coincide con el motor, cubre agua y saneamiento (el hueco
real del catálogo) y trae 440 APU. La regionalización sale de las doce cartillas uniendo por
numeral. Es el análogo de lo que ya se hizo con `apu_invias_items.json`, con la ventaja de que aquí
no hay que descubrir el formato: está verificado arriba.

**② FFIE · cobertura nacional (§2.1).** El único que cubre los 33 departamentos, incluidos los 8 sin
retail y los 19 sin factor regional. Barato de leer (un xlsx, una hoja). Entra como **nivel propio
de la cascada, declarado como precio TOPE** —nunca como cotización— igual que `retail` viaja como
`techo_de_insumo` y el INVIAS como `referencia_oficial_insumo`. Sin composición: los ítems saldrían
`sin_apu`, como los del IDU.

**③ ICCU · granularidad municipal (§2.2).** 15 000 filas ya legibles. Aporta la granularidad más
fina de todo el proyecto y valida al FFIE. Cuesta más que ② porque hay que resolver las
descripciones partidas en dos renglones antes de casar ítems.

**④ Factor prestacional 2026 (§4).** No es un banco de precios sino un parámetro, y toca el motor
entero. Alto valor —sustituye un supuesto sin fuente— y alto cuidado: exige decidir explícitamente
qué componentes entran (dotación y bioseguridad hoy están fuera) y volver a medir los 157 ítems
`NOG-*`. Va por `lib/parametros.js`, que existe justamente para esto.

**⑤ Insumos FFIE (§2.5).** 2 795 precios de insumo con unidad y categoría. Complementa
`apu_retail`/`apu_invias` en la capa de insumo.

**Boyacá (§2.6) y APU 2023 (§2.7) NO se integran** mientras no haya una vigencia nueva: el contraste
mostró que subestiman, y traerlos a 2026 con un índice sería fabricar precisión. Quedan fichados con
esa condición, como ya estaban.

### Tres reglas que la integración no puede saltarse

1. **Cada precio viaja con su fuente, su vigencia y su ámbito**, y con el nivel de la cascada
   declarado. Un tope del FFIE, una referencia del ICCU y una cotización no son la misma cosa, y la
   respuesta tiene que decir cuál es.
2. **Los ítems se casan con `lib/apu_mapeo`**, no con una segunda definición de similitud. El
   contraste de §3 usó palabras clave porque era exploratorio, y ya se vio lo que produce.
3. **Contrastar contra el mercado antes de publicar**, como exige la cabecera de
   `tests/capturar_invias.js`. La vigencia corrupta del INVIAS se cazó mirando medianas, no
   confiando en que «lo oficial es bueno».

---

## 7. La integración, y los tres defectos que encontró

Se integraron ①, ② y ③ siguiendo el patrón de los dos bancos que ya existían (INVIAS e IDU): un
capturador manual → un JSON en `data/` → un módulo hoja en `lib/apu/` → nivel propio en la cascada
de precios → mapeo en el importador → badge en pantalla y en el Excel.

| Banco | Ítems | Cobertura | Composición | Nivel |
|---|---|---|---|---|
| **EPC** | 440 | Cundinamarca (prov. Almeidas) | **sí, completa** | `epc_apu` |
| **FFIE** | 1 042 | **los 33 departamentos** | no (precio TOPE) | `ffie_apu` |
| **ICCU** | 1 234 | Cundinamarca, **58 municipios** | no | `iccu_apu` |

La cascada quedó: `usuario → pliego → mercado → retail → invias → catálogo → invias_apu → epc_apu →
idu_apu → ffie_apu → iccu_apu → sin_precio`. El FFIE va detrás de los demás **a propósito**: es un
techo reconocido por una entidad, no un precio de mercado, así que cualquier otra fuente que
responda es mejor.

**Los cinco bancos caben en una respuesta: 2,23 MB de los 4,5 MB que admite Vercel.** Hay una prueba
que lo mide y que prohíbe además que un banco cuele precios en el catálogo servido. Un sexto banco
acercaría la respuesta al límite, y ese fallo solo se vería en producción; lo que se recorta
entonces son CAMPOS, no ítems.

### Tres defectos que la integración destapó, todos del mismo tipo

Los tres son la misma familia —**un dato real en la fila equivocada, que parece dato bueno**— y los
tres los cazó un control cruzado, no una lectura del código:

1. **EPC · una hoja mal numerada.** La hoja «7.15.13» declara internamente «7.15.3» (copiaron la hoja
   sin actualizar la celda) y son dos ítems distintos con la misma descripción. Indexando por el
   numeral interno, la composición de uno pisaba la del otro y un ítem salía con un precio que no era
   el suyo: **$5,5 M contra $3,9 M**. La identidad de una hoja es su NOMBRE, y el control que lo caza
   es comparar el total de cada APU contra el precio que el catálogo publica para ese numeral.

2. **FFIE · el código 76 devolvía el precio de Norte de Santander.** El FFIE escribe varios
   departamentos pegados («VALLEDELCAUCA») y `Filtros.departamento` no los reconoce; la primera
   versión los indexaba con la clave que devolvía esa función, que para ellos era **vacía**, y las
   entradas vacías se sobrescribían entre sí. Una clave vacía nunca es una clave — es la familia del
   `|| 0`. Se resolvió declarando el código DANE de los 33 a mano en el capturador, que **aborta** si
   una vigencia futura renombra una columna.

3. **ICCU · la numeración reinicia en cada capítulo.** «1,9» es *DEMOLICIÓN ESCALERAS EN CONCRETO* en
   preliminares y *COLLAR DE DERIVACIÓN PVC* en acueducto: uniendo las provincias por numeral a secas
   se fusionaban ítems distintos. Con la clave capítulo+numeral las discrepancias bajaron de 230 a
   59, y esas 59 **se descartan** en vez de fusionarse: ahí no se sabe cuál de los dos ítems es.

### Verificado en navegador real

Además de la suite (4/4), se abrió la página en Chromium contra un arnés que sirve `public/` y
responde `/api/*` con los módulos reales — la práctica que este proyecto ya fijó, porque hay fallos
que solo se ven ahí:

| Comprobación | Resultado |
|---|---|
| Los cinco bancos llegan al catálogo | 174 · 526 · 440 · 3 172 · 1 042 · 1 234 |
| Presupuesto con los tres nuevos | epc 11 931 · ffie 16 859 · iccu 3 234 038 |
| EPC trae desglose, los otros no | 5 insumos · 0 insumos |
| El FFIE avisa que es un TOPE | sí |
| Badges | «EPC 2026-02 · ALMEIDAS» · «FFIE 2026 · tope · CUNDINAMARCA» · «ICCU 2026 · Cundinamarca» |
| El buscador ofrece los ítems nuevos | sí — «LOCALIZACIÓN Y REPLANTEO REDES EPC:1.1.1 · ML» |
| Errores de consola | ninguno |
| Importador con 300 filas × 5 bancos | 1,6 s (el tope de la prueba es 15 s) |

Dos falsos positivos del arnés que conviene no volver a perseguir: `clasificarOrigen` necesita el
presupuesto REAL como segundo argumento (con `{}` responde `sin_referencia`, que parece un fallo del
badge y no lo es), y `CATALOGO` vive dentro del IIFE de `app.js`, así que no es `window.CATALOGO` —
el buscador se comprueba por el DOM.

### Lo que se decidió NO hacer, y por qué

- **Las 11 cartillas provinciales de EPC quedan fuera** (solo entró Ubaté, la única con numeral en
  sus filas). Se intentaron las dos vías alternativas y las dos se descartaron midiendo: descifrar la
  sustitución de letras **pierde información** (no es biyectiva: `Y` viene de `C` y de `Y`; aplicada a
  Alto Magdalena casa el 33 %), y alinear por orden es peor, porque las cartillas omiten ítems
  distintos del libro y un desfase de una fila asigna el precio de un ítem a otro. Lo que se pierde
  está acotado: entre provincias los precios de EPC difieren ~1-2 % y muchos son idénticos.
- **El precio por MUNICIPIO del ICCU se sirve solo cuando la fila publica un precio por cada
  municipio de su provincia**; si no, cae a la mediana provincial o departamental y **dice a cuál**.
  El motor conoce el departamento de la obra, no el municipio, así que en la práctica responde la
  mediana — el municipio queda disponible en el módulo para quien lo sepa.

---

## 8. Licencia

Ninguno de estos documentos declara licencia de uso comercial. El INVIAS ya obligó a dejarlo escrito
en `_meta`; **FFIE, ICCU y EPC hay que revisarlos igual antes de comercializar Detekta con sus
datos.** Son entidades públicas y los precios son públicos, pero «público» no es «licenciado».
