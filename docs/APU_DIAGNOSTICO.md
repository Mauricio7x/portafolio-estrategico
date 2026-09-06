# Diagnóstico del módulo APU frente a la especificación «APU profesional»

**Fecha:** 2026-08-12 · **Rama:** `feature/apu-profesional`

> Foto del 12-ago-2026. El estado se mide con `node tests/estado.js`; las rutas, con `node tests/mapa.js`.
> Corregido en sitio el 6-sep-2026 (M-DOC-03): los APU del INVIAS de §3 ya están en el árbol; la cita a
> `d69cfe8` apunta a la copia de `docs/archivo/`.

Este documento es el resultado de la FASE 1 del encargo: contrastar la especificación (Secciones A–G) contra
el estado REAL del repositorio antes de escribir código. Se conserva porque cinco de las brechas que el
encargo daba por abiertas **ya estaban cerradas**, y tres de las que pedía cerrar **no se pueden cerrar con
los datos disponibles**: quien retome esto necesita saber cuál es cuál para no volver a implementar lo hecho
ni prometer lo que no hay.

---

## 0 · Premisas del encargo que no coincidían con el repositorio

| Premisa del encargo | Realidad verificada |
|---|---|
| «El APU actual solo muestra un precio unitario copiado de un Excel histórico» | **Falso.** `lib/apu/calculo.js` ya devolvía `detalle.insumos`: cada línea con tipo, cantidad efectiva, precio regional, origen y valor, salida de `costoDirecto()` — el mismo cálculo que produjo el total. |
| «Los precios no están regionalizados» | **Falso.** `data/apu_regional.json` + `regionDeDepartamento` cubren 5 regiones y 14 de los 33 departamentos; los otros 19 salen `sin_base` **declarándolo**, sin factor 1,00 de relleno. |
| «La exportación Excel es pobre / no hay dos hojas» | **Falso.** `public/apu_libro.js` ya generaba «Presupuesto» y «APU» con fórmulas `=D×E`, cierre A/I/U + IVA sobre la utilidad, firmas y marcadores de color. |
| «La interfaz es confusa / no hay flujo de 3 pasos» | **Falso.** `public/index.html` ya tenía los tres pasos rotulados (1 ¿Qué vas a construir? · 2 ¿Dónde? · 3 Ítems y cálculo) con la configuración avanzada dentro de un `<details>` plegado. |
| «Módulo existente: `lib/apu/xlsx.js`» | **No existe.** El exportador son `public/xlsx.js` (escritura ZIP/OOXML a mano) + `public/apu_libro.js` (formato). Es la **tercera vez** que un encargo cita este archivo inexistente. |
| «Catálogo con 174 ítems y 437 insumos» | Correcto. 157 de los 174 son `NOG-*`, del contrato adjudicado. |

**Regla que esto deja escrita:** antes de dar por abierta una brecha que el encargo describe, mirarla. Y antes
de dar por perdida una fuente que el encargo cita, mirar la historia de git (así se recuperó `modulo_apu.html`
del commit `d69cfe8`; desde el 6-sep-2026 la copia vive en `docs/archivo/modulo_apu_2026-05.html`, porque ese
commit no es ancestro de `main` y solo lo conservan ramas remotas).

---

## 1 · Brechas REALES encontradas y cerradas en esta rama

### D · Trazabilidad: el badge decía «sin verificar» sobre un precio verificado

`precioEnRegion` (`lib/apu/catalogo.js:186`) ya decidía, insumo por insumo, entre una **cotización real**
cargada en `precios_cotizados` y **derivar** el precio base por el factor de la región, y lo publicaba en
`linea.origen_precio`. Ese dato **moría en el desglose**: `clasificarOrigen` solo miraba `item.fuente`, así
que un ítem con todos sus insumos cotizados salía rotulado 🟡 *«Derivado regional — precio no verificado»*.
Trazabilidad al revés, en el módulo donde la trazabilidad es el producto.

Cerrado: `calculo.js` publica `origen_insumos` (participación **por valor**, no por número de líneas) y
`clasificarOrigen` estrena el estado 🟡 **«Cotización de proveedor»**, que exige que **no quede ninguna línea
derivada** — con una sola, parte del precio sigue sin verificar y decir «cotizado» prometería de más.

**Y la primera versión de esa puerta tenía el defecto que venía a arreglar.** Abría con
`cotizado_pct === 100`, pero ese porcentaje viaja **redondeado a dos decimales**: una línea derivada de **$1**
junto a una cotizada de **$3.350.400** da 99,99997 %, que `red()` sube a un **100 exacto**. El ítem se
rotulaba «Cotización de proveedor» —verificado— con parte del precio sin verificar, y la proporción no es de
laboratorio: es la de un insumo incidental barato (agua, tornillería) al lado de una línea cara. Lo encontró
una revisión adversaria. Hoy la puerta abre con **`lineas_derivadas === 0`**, que es la cuenta exacta, y
`cotizado_pct` **solo informa**. La lección generaliza: **una cifra redondeada para MOSTRAR no puede
DECIDIR** — es `numero()` como guarda de «sin dato» (`lib/probabilidad`) en otro disfraz.

### E · El cierre del presupuesto podía contar cada peso dos veces

No había subtotal por capítulo (el encargo lo pide) y COSTOS DIRECTOS sumaba el **rango entero** de filas de
ítem. Añadir subtotales sobre ese cierre habría producido un presupuesto **exactamente al doble** sin que
nada se viera raro — el defecto clásico del presupuesto armado a mano. Hoy cada capítulo lleva
`=SUM(G_a:G_b)` y COSTOS DIRECTOS suma la **lista de celdas de subtotal**, con prueba de que cada referencia
apunta a una fila de subtotal y no a una de ítem.

### E · «ÍTEM» y «CÓDIGO» compartían columna

Son dos cosas distintas: el ítem es la **posición** (1.1, 1.2, 2.1 — lo que el pliego usa para referirse a
una fila y lo que la entidad compara entre oferentes) y el código es la **identidad** en el catálogo (NOG-A2,
INV-201.1). Compartiendo columna, dos presupuestos con los mismos ítems en distinto orden no se podían
cotejar fila a fila. Hoy son columnas A y B (R3).

### E · Los factores del APU viajaban dentro del texto de la descripción

Desperdicio, rendimiento, distancia y recargo prestacional se escribían como nota entre paréntesis dentro de
la descripción. Se leen, pero **no se pueden ordenar ni filtrar**, que es lo primero que hace quien audita.
Hoy van en dos columnas propias (F y G) por sección, con su rótulo verdadero para lo que tienen debajo. La
hoja APU además estrena el espacio de **firma del ingeniero de costos**: la entidad pide el análisis firmado
aparte y una hoja sin firma se devuelve.

### E · El nombre del archivo se decidía dentro del manejador del botón

No se podía probar y el generador de Node producía un archivo con otro nombre que el de la aplicación. Hoy
`APULibro.nombreArchivo` es el punto único: `APU_<proyecto>_<fecha>.xlsx`, saneando los caracteres que el
sistema de archivos rechaza en silencio.

### G · No existía ninguna de las cinco validaciones

Cerrado en `lib/apu/validaciones.js`. **Ninguna bloquea la exportación** (R6): una herramienta que se niega a
exportar acaba usándose por fuera, que es el peor final posible para el control.

---

## 2 · Dos reglas del encargo que se implementaron DISTINTO, a propósito

### G.1 · Los umbrales del AIU

El encargo pide advertir si **A > 30 %, I < 1 %, U > 10 %**. Esas tres cifras ya viven en el repositorio,
mejor documentadas, en `lib/apu/normativa.AIU`: **A 12–20 %, I 3–5 %, U 5–10 %**, citadas al cap. 11 del
Manual del Analista. Escribirlas otra vez sería una segunda fuente de verdad de tres números que deciden un
precio (R2/R3).

No se pierde nada: las bandas del manual son **estrictamente más estrechas** que los cortes del encargo en
los tres casos (A > 20 dispara antes que A > 30; I < 3 antes que I < 1; U > 10 es el **mismo** corte). Todo
lo que el encargo quería ver marcado queda marcado, y por una cifra rastreable hasta su fuente. Hay prueba de
esa relación de laxitud, para que nadie «complete» el encargo añadiendo una segunda tabla de umbrales.

**Corolario que importa:** el AIU real del contrato Nogal 4 —adjudicado— fue **19,17 / 1,50 / 5,33**, con su
«I» por debajo de la banda. Un contrato que se ganó dispara esta validación. Por eso la severidad máxima es
«atención» y nunca «error».

### G.4 · El 5 % que no se puede calcular

El encargo pide advertir si los ítems sin precio «representan más del 5 % del **valor total**». Ese
porcentaje **no es computable**, y no por falta de código: un ítem sin precio no tiene valor *por
definición* —es lo que significa «sin precio»— así que su participación en el total es justamente la cifra
que no existe. Calcularla exigiría inventarles un precio, que es lo único que este módulo tiene prohibido
(R1).

Implementado: el umbral del 5 % se aplica a la participación por **número de ítems**, el hallazgo dice con
todas las letras que es una proporción de ítems y no de dinero, y `valor_faltante` viaja en **`null`, jamás
en 0** — un 0 ahí diría «no falta dinero», que es lo contrario de lo que pasa. El total del presupuesto se
declara como **cota inferior**.

---

## 3 · Lo que NO se puede cerrar con los datos disponibles

### C.2 y D · APU Regionalizados de Referencia del INVIAS — **disponibles desde ago 2026**

> **Corrección 6-sep-2026.** El banco existe en el árbol: `data/apu_invias_items.json` (≈ 3 MB; 2 988 475 bytes
> medidos ese día) leído por `lib/apu/invias_items.js`, niveles `invias` e `invias_apu` de la cascada de
> `lib/apu/precios.js`. Lo que sigue es el diagnóstico del 12-ago-2026, cuando no estaba, y se conserva porque
> dice qué haría falta y por qué se decidió no inventar el rótulo.

El encargo los da como opcionales («si se necesitan, documentar exactamente qué archivos se requieren»). Este
entorno recibe **403** en `colombiacompra.gov.co`, `funcionpublica.gov.co` y los portales del INVIAS, y el
índice oficial de las Especificaciones INVÍAS 2022 (Res. 4561/2022) **nunca se pudo abrir** — razón por la
que el proyecto ya tiene la regla de que **ningún código `INV-` se publica** y el artículo probable viaja en
`articulo_invias_candidato`.

**El badge 🟢 «INVIAS 2025-2 · [Provincia]» NO se emite.** Rotular «INVIAS» un precio que no lo es sería el
peor error posible en una herramienta con la que se fija un precio de oferta.

**Qué haría falta para encenderlo:**

1. **Archivo:** los *APU Regionalizados de Referencia* que el INVIAS publica por **territorial** (no por
   departamento) y por semestre, en `.xlsx`. Nombre típico: `APU_Regionalizados_<Territorial>_<AAAA>-<S>.xlsx`.
2. **Contenido mínimo por fila:** código del ítem según las Especificaciones Generales de Construcción de
   Carreteras (p. ej. `201.1`), descripción, **unidad de pago**, y el precio unitario **con su desglose** en
   materiales / mano de obra / equipo / transporte. Sin el desglose el dato no sirve para este módulo: se
   convertiría en un precio sin APU, que es exactamente lo que la herramienta existe para no entregar.
3. **Dónde ponerlo:** `data/apu_invias/<territorial>.json`, con el mismo esquema de `data/apu_catalogo.json`
   (`insumos[]` + `items[]`), `fuente: "invias"` y un `_meta.semestre` (`"2025-2"`).
4. **Qué código habría que escribir:** un mapa territorial INVIAS → departamento (las territoriales **no**
   coinciden con las 5 regiones del catálogo actual: son 26), y una rama en `precioEnRegion` que prefiera el
   precio INVIAS sobre la derivación por factor. El estado `invias` de `clasificarOrigen` ya tiene su hueco
   descrito en el comentario de la función.
5. **Antes de cargarlo:** verificar la numeración contra el índice oficial. La razón por la que hoy no se
   publica ningún `INV-` es que **numeración y unidades de pago están sin verificar**.

### D · Badge 🟠 «Histórico SECOP · [N] procesos» — **IMPOSIBLE con `p6dx-8zbt`**

El dataset publica el valor **adjudicado del contrato entero**, no precios unitarios por ítem. No hay de
dónde sacar un precio unitario del histórico. El estado no se emite y no se puede alimentar con lo que hay.
(El histórico sí sirve para la **baja de mercado** —cuánto descuenta el ganador sobre el presupuesto
oficial—, que es otra pregunta y ya está implementada en `lib/indice_baja.js`.)

### A.3 · Costo horario de equipo desglosado en depreciación / combustible / mantenimiento

El catálogo cotiza el equipo con **una tarifa por día u hora**, que es como lo cotiza el contrato adjudicado
que lo calibró. Descomponerla en depreciación, combustible y mantenimiento exigiría datos que no están en
ninguna fuente del repositorio: valor de reposición, vida útil, consumo y tarifa de combustible por máquina.
**Repartir la tarifa entre los tres conceptos con porcentajes inventados sería tres cifras falsas donde hoy
hay una verdadera.** Lo que sí se publica es el **rendimiento** y la tarifa aplicada, en columna propia.

Para cerrarlo haría falta una tabla `data/apu_equipos.json` con, por máquina: valor de reposición, vida útil
en horas, consumo horario de combustible y % de mantenimiento sobre depreciación — y una comprobación de que
la suma reproduce la tarifa que hoy usa el catálogo, o el catálogo empezaría a dar otros precios en silencio.

---

## 4 · Estado final por sección de la especificación

`✅` implementado · `🟡` parcial y declarado · `⬜` no se puede con los datos disponibles

| Sección | Estado | Nota |
|---|---|---|
| A.1 Materiales con desperdicio y fuente | ✅ | Desperdicio en columna propia y solo cuando es > 0 |
| A.2 Mano de obra, cuadrilla, rendimiento, prestacional | 🟡 | Factor prestacional en columna propia y desglosado en 10 componentes en «Normativa aplicada»; el catálogo **no publica la composición de las cuadrillas del Nogal** (el pliego no trae los jornales) |
| A.3 Equipo con costo horario desglosado | 🟡 | Tarifa y rendimiento sí; depreciación/combustible/mantenimiento **no** (§3) |
| A.4 Transporte con distancia | ✅ | Distancia en columna propia; el `1` de los fletes cerrados **no** se pinta (no es un dato del pliego) |
| A.5 Total costo directo | ✅ | |
| B AIU + IVA sobre utilidad + precio final | ✅ | Aditivo por defecto; el IVA se muestra y **no** se suma al precio del motor, y **sí** al TOTAL del Excel — las dos mitades dichas |
| C.1 Factores regionales | ✅ | 14/33 departamentos; los demás `sin_base` declarado |
| C.2 APU Regionalizados INVIAS | ⬜ | §3 |
| C.3 Badge «requiere verificación» | ✅ | 🟡 «Derivado regional — Precio no verificado: requiere cotización» |
| D Trazabilidad (7 badges) | 🟡 | **6 estados** emitidos; INVIAS e Histórico SECOP no se pueden alimentar (§3) |
| E Exportación de dos hojas | ✅ | Con subtotal por capítulo, 7 columnas, factores en columna y firma |
| F Flujo de 3 pasos | ✅ | Ya existía; se le añadió el bloque de validaciones |
| G.1–G.5 Validaciones | ✅ | Con dos desviaciones declaradas (§2) |
