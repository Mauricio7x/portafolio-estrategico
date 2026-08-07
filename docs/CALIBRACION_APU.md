# Calibración del catálogo APU con el Presupuesto Nogal 4 (ago 2026)

## La fuente

**«Presupuesto Nogal 4.xlsx»** — Proforma No. 4 del proceso **UPN-VAD-CP-009-2025**
(Universidad Pedagógica Nacional, sede El Nogal, Bogotá): *«Realizar las adecuaciones
generales en las áreas de cafetería y salones en las instalaciones de Nogal»*.
Contrato **ADJUDICADO** al **Consorcio Infraestructura 1A** (R.L. Ing. Helder Gustavo
Rodríguez Santana — el dueño de esta app), 2025. No es una revista de precios ni una
estimación: es un presupuesto **que ganó un proceso real**, con su hoja «APU» de
3 885 filas desglosando cada ítem en materiales, equipo, transportes y mano de obra.

Por eso los insumos e ítems calibrados llevan **`fuente: "adjudicado"`** — un cuarto
origen junto a los `recuperado` / `derivado` / `estimado` que ya documenta
`docs/APU_Y_RENTABILIDAD.md`, y el más fuerte de los cuatro.

## Qué entró al catálogo (`data/apu_catalogo.json` v2.0.0)

| Bloque | Antes | Ahora | Detalle |
|---|---|---|---|
| Ítems | 17 (`INV-*`, `EDI-*`) | **174** | +157 ítems `NOG-*` con su composición completa |
| Insumos | 48 | **437** | +389 insumos con precio real de obra en Bogotá 2025 |
| Regiones | 5 | 5 | Sin cambios (hay prueba que exige exactamente 5) |
| AIU del contrato | — | `_meta.calibracion.aiu_del_contrato` | **A 19,17 % · I 1,5 % · U 5,33 % + IVA 19 % sobre la utilidad** |

Los 17 ítems previos **no cambian de precio** (verificado ítem a ítem al ensamblar):
la calibración AÑADE, no pisa.

## Método (y por qué cada decisión)

- **La verdad de cada APU es el RANGO de su fórmula de costo directo.** La hoja del
  pliego calcula `VR COSTO DIRECTO = ROUND(SUM(Ea:Eb)/2, 0)` (el ÷2 corrige que el
  rango incluye líneas y subtotales). Se leyó ese rango bloque a bloque y solo se
  tomaron las líneas que el propio pliego suma. Con proximidad textual, líneas como
  «EQUIPO CASSETTE 360…» o «MATERIALES ELÉCTRICOS DE CONTROL…» se confundían con
  cabeceras de sección y desaparecían del ítem (el APU del aire acondicionado perdía
  $14,9 M de los $21 M).
- **Cuadrillas: el pliego cotiza el día CON prestaciones** (1 OF + 1 AY =
  $368.915,68/día). El motor aplica el factor prestacional regional (1,55) sobre el
  jornal base, así que el catálogo guarda `precio ÷ 1,55` y conserva el literal en
  `precio_dia_con_prestaciones`. Hay prueba de que la recomposición devuelve el
  valor del pliego a ±$2/día. Estas cuadrillas **no declaran `componentes`**: el
  pliego no publica el desglose de jornales y inventarlo rompería la validación que
  exige que una cuadrilla sume sus componentes.
- **Transporte: los FLETES del Nogal son valores cerrados por ítem** (no $/m³-km).
  Van con `distancia_km = 1` y la cantidad del pliego, reproduciendo su aritmética
  exacta. La doctrina «cantidad_por_unidad en m³» sigue vigente para el acarreo
  `tr_acarreo_material` de los ítems INV-* (la prueba del acero < 1 % lo vigila).
- **Precios regionales: DERIVADOS con los factores**, como todos los demás. El
  precio base es el real de Bogotá (la obra es en Bogotá, factor 1,00); las otras
  cuatro regiones salen del factor por tipo de insumo, marcadas `derivado`.
- **Mano de obra/equipo:** `rendimiento = 1 / (días por unidad del pliego)`.
  **Materiales:** `cantidad_por_unidad` tal cual, `desperdicio = 0` (el pliego ya lo
  incorpora en su cantidad).

## Reproducción verificada (hay prueba en `tests/e2e.js`)

Con el **motor real** (`costoDirecto` de `lib/apu/catalogo.js`), región
`bogota_sabana`, contra el `VR COSTO DIRECTO` publicado en el pliego:

- **149 de 157 exactos al peso** · 7 a ±$1 (redondeo del jornal base ÷1,55).
- **NOG-B57: +$55 (+0,14 %), la única desviación, declarada y clavada en prueba.**
  Su APU original trae una línea de equipo con **cantidad NEGATIVA** (andamio
  −0,00069 día — un ajuste del autor del pliego para cuadrar contra un objetivo).
  El esquema exige rendimiento > 0 (un rendimiento negativo o cero es una división
  sin sentido), así que la línea se descartó y la diferencia se dice en vez de
  esconderse.
- **Líneas a peso medio (NOG-C78, C79, C80):** en esos tres bloques el subtotal del
  pliego OMITE una línea (p. ej. el alquiler del certificador FLUKE), con lo que su
  fórmula `SUM/2` la cuenta a MEDIO peso. Se reproduce SU aritmética con peso 0,5
  exactamente en esas líneas, listadas en `_meta.calibracion.lineas_a_peso_medio`.
  El costo publicado (que es el adjudicado) manda sobre la «corrección» que a
  nosotros nos parecería obvia.
- **El APU A3 lista materiales que su propia fórmula excluye** (tapabocas, bolsas…):
  el rango de su CD arranca en la sección de equipo. Se respetó el rango: esos
  materiales NO están en el ítem NOG-A3, porque no están en su precio.
- Una línea con cantidad 0 en el pliego se descartó (contada en la extracción).

## Efecto en producción

- La semilla es la fuente inmediata: **el editor calcula con los 174 ítems sin
  necesidad de carga**. Para servir el catálogo por `/api/apu/catalogo` (Redis),
  tras desplegar hay que pulsar **«Cargar catálogo APU»** en `/admin.html` — la
  versión pasó a `2.0.0`, así que la carga escribe sin `forzar`.
- La carga ahora escribe los ~620 hashes **por lotes de 16 con `Promise.all`**
  (antes era secuencial: ~600 comandos REST a ~50-80 ms cada uno rozaban el
  `maxDuration` de 60 s de la función).
- El mapeo de la importación (`lib/apu/importar.js`) casa descripciones de
  formularios eléctricos y de adecuaciones contra estos 157 APU reales — es lo que
  convierte «Cargar ítems desde Excel» en precios, no en huecos.
