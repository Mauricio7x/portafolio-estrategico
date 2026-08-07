# Diferencias declaradas · APU generado vs archivos de referencia (ago 2026)

Registro honesto de TODA diferencia entre `tests/electrico_nogal_apu.xlsx` (el APU
generado por el flujo «Cargar ítems desde Excel»), el archivo de ítems
(«electrico nogal.xlsx») y el archivo de referencia de formato y precios
(«Presupuesto Nogal 4.xlsx»). Lo que no está aquí, coincide.

## 1 · Contra «electrico nogal.xlsx» (los ítems y sus precios)

- **El costo directo total reproduce el archivo AL PESO: $111.614.712.** Las 54
  filas de ítem se leyeron completas (4 bloques: Cafetería, Salón 200, Caseta aire
  acondicionado, Salón 216) y los 53 precios del archivo entraron TAL CUAL
  (`origen_precio: "archivo"`): la política del módulo es que el precio del
  usuario manda y se declara, no se «corrige».
- **1 ítem sin precio** («PENDIENTE-POSIBLE USO DE RIEL Y LUMINARIA SYLVANIA»,
  24 und, $0 en el archivo): un 0 **no** es un precio. Va marcado en ROJO, con sus
  celdas de dinero vacías, y **no suma** al total. Con la regla anterior («0 =
  precio») habrían sido $0 sumando en silencio; con un mapeo automático laxo
  habrían sido $2,9 M inventados del catálogo.
- **El archivo trae inconsistencias internas y se conservan** (el archivo es la
  evidencia): el mismo «breaker enchufable 1x20 A» vale $32.908 en Cafetería y
  $41.688 en Salón 200/216; la «tomacorriente en muro» vale $301.516 en Cafetería
  y $613.836 en la Caseta. El generado replica cada fila con su precio, no
  promedia.
- **El archivo no trae bloque de AIU** (cierra con una suma simple). El generado
  aplica el AIU **real del contrato Nogal adjudicado** (A 19,17 · I 1,5 · U 5,33 +
  IVA 19 % sobre la utilidad), que es la estructura de la referencia de formato:
  TOTAL final **$141.764.859**.

## 2 · Precio del archivo vs referencia del catálogo (declarado ítem a ítem)

Donde el mapeo encontró un ítem análogo del catálogo calibrado, el Excel y la API
publican `cd_catalogo` al lado del precio del archivo. Diferencias notables
(todas visibles en la hoja «APU» del generado):

| Ítem del archivo | Archivo | Catálogo (ref.) | Δ | Lectura |
|---|---|---|---|---|
| Canaleta metálica 15×5 | $74.596 | $122.568 (NOG-C80) | −39 % | Alcance distinto: el APU de referencia incluye traslado de cableado existente |
| Salida tomacorriente en canaleta | $320.488 | $183.729 (NOG-A20) | +74 % | La salida del archivo incluye troquel y canaleta; la de referencia es salida de alumbrado |
| Breaker enchufable 1×20 A | $32.908 | $70.851 (NOG-A29) | −54 % | La referencia es un ítem de suministro+instalación con más cargas |
| Luminaria LED 60×60 P27916 | $131.640 | $137.445 (NOG-A21) | −4 % | Prácticamente el mismo precio: la calibración es coherente donde el alcance coincide |
| Cable de cobre No 12 | $17.552 | $37.515 (NOG-B58) | −53 % | La referencia (B58) es un tramo con tubería EMT incluida |

Ninguna de estas diferencias «corrige» el precio del archivo: son mapeos nivel
`revisar` (referencia aproximada), marcados como tales. La única coincidencia
`firme` con precio propio (canaleta) también conserva el precio del archivo.

## 3 · Contra «Presupuesto Nogal 4.xlsx» (el formato)

Reproducido: columnas ÍTEM/DESCRIPCIÓN/UND./CANT./VALOR UNITARIO/VALOR TOTAL con
fórmula `=D×E`, capítulos como filas propias, cierre COSTOS DIRECTOS →
Administración → Imprevistos → Utilidad → **IVA sobre la utilidad** → COSTOS
INDIRECTOS → TOTAL (con fórmulas y valor cacheado), bloque de firmas
(Elaboró/Revisó/Aprobó) y hoja «APU» con MATERIALES / EQUIPO y HERRAMIENTAS /
TRANSPORTES / MANO de OBRA, subtotales y VR COSTO DIRECTO por ítem.

Diferencias deliberadas:

- **La referencia suma `SUM(rango)/2`** (mete líneas y subtotales en el mismo rango
  y divide). El generado suma las líneas directamente — mismo resultado, sin el
  artefacto, y sin heredar los tres bloques donde ese truco contaba una línea a
  medio peso (ver `docs/CALIBRACION_APU.md`).
- **Etiquetas del cierre más explícitas** («IVA sobre la utilidad (19 %)» en vez de
  «IVA» a secas) y una **leyenda de marcadores** al pie: la referencia no necesita
  marcadores porque todos sus ítems tienen APU; el generado distingue ámbar
  (precio del archivo, sin APU de respaldo) y rojo (sin precio).
- **Los ítems con precio del archivo no llevan APU inventado**: la referencia
  desglosa el 100 % de sus ítems porque sus APU existen; fabricar composiciones
  para cuadrar los precios del eléctrico sería inventar cantidades. El bloque de
  cada ítem dice de dónde sale su precio y, si hay ítem análogo en el catálogo, la
  referencia declarada.
- **Firmas sin nombres**: la referencia trae los nombres del consorcio y de la
  supervisión; el generado deja los rótulos con espacio para firmar.

## 4 · Verificación de fórmulas — límite del entorno, dicho y no disimulado

LibreOffice no arranca en este contenedor (timeout en frío incluso a 500 s), así
que la pasada de recálculo automático no se pudo ejecutar aquí. Lo que SÍ vigila
la suite (`tests/e2e.js`, bloque de unidad de importación):

- ningún `<f>` contiene `=` inicial (el defecto `==D7*E7` se produjo y se cerró
  con prueba);
- toda fórmula viaja con su **valor cacheado**, y ese valor es el del MOTOR: la
  identidad `cantidad × unitario = total` tiene prueba propia, y el TOTAL leído
  del libro se compara contra `precio_venta + IVA(U)` del motor;
- el libro se relee entero con `public/xlsx_lectura.js` (ZIP + XML) y las
  cifras del cierre coinciden con el resumen del cálculo.

Al abrir el archivo en Excel/LibreOffice de escritorio, el recálculo de `=D×E`,
`SUM` y `ROUND` reproduce exactamente los valores cacheados o el archivo tiene un
defecto que hay que reportar.

## 5 · Precisión de los precios del catálogo (resumen)

- 157 APU del contrato adjudicado reproducidos: **149 exactos al peso, 7 a ±$1,
  1 a +$55 declarado** (línea negativa del pliego que el esquema no admite).
- Los precios `NOG-*` son de **Bogotá 2025** (obra real). En otras regiones se
  derivan por factor y así se declaran (`precio_origen_*: "derivado"`).
- Los 17 ítems INV/EDI previos conservan exactamente sus precios anteriores.
