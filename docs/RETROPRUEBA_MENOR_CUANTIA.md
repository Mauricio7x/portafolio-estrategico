# Retro-prueba de menor cuantía: qué precio habría propuesto Detekta y en qué puesto habría quedado

> Para: dueño · Estado: informe fechado (25-oct-2026) · Sustituido por: —

Generado por `node scripts/base_obra/retroprueba.js --escribir`: no se edita a mano. Las cifras de las secciones 1, 2, 3 y 5 salen de llamar a las funciones que la aplicación usa (el centro de mercado de `lib/indice_baja`, el precio sugerido de `lib/apu/optimizador`, el piso de `lib/apu/rentabilidad`, las cuatro fórmulas del pliego de `scripts/base_obra/metodos.js`); la sección 4 es texto fijo con lo que midió otro subagente sobre datos que no están en este repositorio, y se rotula así.

Vocabulario: **VEG** es «lo que deja por intento» (probabilidad de ganar × utilidad − costo de preparar); **p_base** es la probabilidad declarada antes del precio (1 entre los hábiles); **σ** es la dispersión de las ofertas; **P25/P75** son los cuartos de la baja histórica; la **cascada** es el orden en que la aplicación busca el centro (entidad y familia → entidad → departamento y familia); **p6dx** es el conjunto de datos abiertos de SECOP II con los procesos; **TRM** es la tasa de cambio con cuyos centavos el pliego sortea el método.

## 1. Qué se midió

- **Qué precio propondría Detekta hoy** para cada proceso: el óptimo de Precios con el centro de mercado de la entidad construido con las mismas reglas del índice de baja sobre las adjudicaciones de obra de esa entidad desde octubre de 2024 (`historico_entidades.jsonl.gz`, una fila por proceso: `indiceDesdeFilas` deduplica por `id_del_proceso` como la aplicación, con la última fila vista por proceso; producción conserva la de sello de actualización más reciente, que no siempre es la última del archivo). El costo del APU real no está (vive en producción), así que se barren cinco escenarios de costo directo sobre el presupuesto oficial: 70 %, 75 %, 80 %, 85 %, 90 %, con AIU 20/5/5 y 6 meses de plazo, los tres declarados.
- **En qué puesto quedaría** ese precio entre los hábiles reales con cada uno de los 4 métodos del pliego (mediana, media geométrica, media aritmética baja, menor valor), con el método que de verdad se sorteó, y «gana en k de 4»: la opción de quedar primero si el método sale al azar.
- **Si baja del costo**, con dos preguntas distintas: «bajo el precio con AIU completo» (gana menos que su AIU) y «bajo costo directo + administración» (pierde plata: no cubre lo que cuesta ejecutar); y el piso que decide (`precioPiso`, σ = 15 %), impreso en % del presupuesto.
- **Controles**: los dos de Santa Elena tienen que reproducirse (la oferta real del dueño 5.º de 5 y el ganador real primero con la geométrica); en los demás casos el ganador real se contrasta con el método real y, cuando no queda primero por precio (puntos de calidad, un error de la entidad), se dice como hecho: el puesto por precio de la propuesta sigue valiendo, porque mide la misma fórmula.

Histórico con el que se construyó el centro: 2.783 filas de p6dx, 1.490 con baja medible (descartes: sin_precio_base 0, sin_adjudicado 0, adjudicatario_no_definido 1279, bajo_30_pct 10, sobre_110_pct 4), 399 entidades.

## 2. Los casos reales

### 2.1. Santa Elena · Cali, Secretaría de Infraestructura · 4151.010.32.1.1255-2026

Presupuesto oficial $1.581.425.810 · 4 rivales hábiles (93,3 %, 93,92 %, 94,12 %, 95,56 %) · método real: geometrica (TRM 3.264,39).

Centro de mercado que usaría Detekta: baja mediana 11 % (P25 8 % · P75 49 %), 7 contratos, nivel «alto», medido en entidad (todas las modalidades). La entidad entera trae: licitacion publica 4 · minima cuantia 1 · seleccion abreviada 2.

Control — la oferta real del dueño ($1.530.029.470, 96,75 %): mediana 5.º de 5 · geometrica 5.º de 5 · aritmetica_baja 5.º de 5 · menor_valor 5.º de 5; con el método real (geometrica) 5.º de 5.

Control — el ganador real (CONCRETAR 2026, 94,12 %) con el método real: queda primero por precio (reproducido).

APU propio: **sin dato** (el APU de la oferta vive en producción (Redis), que esta sesión no toca: el costo real se declara sin dato y se barren escenarios). Si el dueño pega su costo directo en `apu_propio.costo_directo`, sale como primera fila.

| Costo directo / presupuesto | Precio propuesto | % del presupuesto | Mediana | Geométrica | Aritm. baja | Menor valor | Gana en k de 4 | Con el método real | Bajo el precio con AIU completo | Bajo costo + administración (pierde plata) | Bajo el piso (σ 15 %) | Bajo mediana − σ de las ofertas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 % | $1.565.611.552 | 99 % | 5.º de 5 | 5.º de 5 | 5.º de 5 | 5.º de 5 | 0 de 4 | 5.º de 5 | no | no | no (piso 94 %) | no |
| 75 % | $1.565.611.552 | 99 % | 5.º de 5 | 5.º de 5 | 5.º de 5 | 5.º de 5 | 0 de 4 | 5.º de 5 | no | no | sí (piso 101 %) | no |
| 80 % | $1.565.611.552 | 99 % | 5.º de 5 | 5.º de 5 | 5.º de 5 | 5.º de 5 | 0 de 4 | 5.º de 5 | sí | no | sí (piso 108 %) | no |
| 85 % | $1.565.611.552 (pérdida en todo el rango) | 99 % | 5.º de 5 | 5.º de 5 | 5.º de 5 | 5.º de 5 | 0 de 4 | 5.º de 5 | sí | sí | sí (piso 115 %) | no |
| 90 % | $1.565.611.552 (pérdida en todo el rango) | 99 % | 5.º de 5 | 5.º de 5 | 5.º de 5 | 5.º de 5 | 0 de 4 | 5.º de 5 | sí | sí | sí (piso 121 %) | no |

Lectura: el descuento óptimo es el mismo en los cinco escenarios (1 %); la banda conservador–agresivo del primer escenario va de 99 % a 98,5 % del presupuesto. La probabilidad que el modelo le pone al precio propuesto es 18,1 % / 18,1 % / 18,1 % / 18,1 % / 18,1 % (p_base declarado 20 % × el multiplicador de precio).

### 2.2. A · Alcaldía de Pasto · SA-2026-9 (mejoramiento vial Genoy, Gualmatán, Jongovito y Morasurco)

Presupuesto oficial $1.076.606.477 · 6 rivales hábiles (93,17 %, 93,8 %, 94,28 %, 94,32 %, 94,38 %, 95,32 %) · método real: menor_valor (TRM 3.209,78).

Centro de mercado que usaría Detekta: baja mediana 4 % (P25 4 % · P75 5 %), 10 contratos, nivel «medio», medido en entidad (seleccion abreviada). La entidad entera trae: minima cuantia 7 (mediana 22 %) · seleccion abreviada 10 (mediana 4 %) · licitacion publica 1.

Control — el ganador real (GV INGENIERIA INTEGRAL SAS, 93,8 %) con el método real: **no queda primero por precio**. El ganador real quedó 2.º por precio (menor valor): PRAXIS, la más barata, perdió 20 puntos de calidad por alterar el Formato 14. El puesto por precio no basta para ganar: lo demás tiene que ir completo.

APU propio: **sin dato** (no hubo oferta propia: no hay APU). Si el dueño pega su costo directo en `apu_propio.costo_directo`, sale como primera fila.

| Costo directo / presupuesto | Precio propuesto | % del presupuesto | Mediana | Geométrica | Aritm. baja | Menor valor | Gana en k de 4 | Con el método real | Bajo el precio con AIU completo | Bajo costo + administración (pierde plata) | Bajo el piso (σ 15 %) | Bajo mediana − σ de las ofertas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 % | $1.017.393.121 | 94,5 % | 4.º de 7 | 4.º de 7 | 6.º de 7 | 6.º de 7 | 0 de 4 | 6.º de 7 | no | no | sí (piso 95 %) | no |
| 75 % | $1.022.776.153 | 95 % | 5.º de 7 | 5.º de 7 | 6.º de 7 | 6.º de 7 | 0 de 4 | 6.º de 7 | sí | no | sí (piso 102 %) | no |
| 80 % | $1.076.606.477 | 100 % | 7.º de 7 | 7.º de 7 | 7.º de 7 | 7.º de 7 | 0 de 4 | 7.º de 7 | sí | no | sí (piso 109 %) | no |
| 85 % | $1.076.606.477 (pérdida en todo el rango) | 100 % | 7.º de 7 | 7.º de 7 | 7.º de 7 | 7.º de 7 | 0 de 4 | 7.º de 7 | sí | sí | sí (piso 115 %) | no |
| 90 % | $1.076.606.477 (pérdida en todo el rango) | 100 % | 7.º de 7 | 7.º de 7 | 7.º de 7 | 7.º de 7 | 0 de 4 | 7.º de 7 | sí | sí | sí (piso 122 %) | no |

Lectura: el descuento óptimo va de 0 % a 5,5 %; la banda conservador–agresivo del primer escenario va de 94,5 % a 94 % del presupuesto. La probabilidad que el modelo le pone al precio propuesto es 25,9 % / 22,3 % / 1 % / 1 % / 1 % (p_base declarado 14,3 % × el multiplicador de precio).

### 2.3. B · Gobernación de Caldas · SAMC-SI-027-2026 (pavimentación vía Aranzazu–Salamina)

Presupuesto oficial $675.274.065 · 3 rivales hábiles (92,78 %, 92,8 %, 93,6 %) · método real: aritmetica_baja (TRM 3.349,63).

Centro de mercado que usaría Detekta: baja mediana 7 % (P25 2 % · P75 8 %), 16 contratos, nivel «alto», medido en entidad (seleccion abreviada). La entidad entera trae: seleccion abreviada 16 (mediana 7 %) · licitacion publica 12 (mediana 6 %) · minima cuantia 9 (mediana 21 %).

Control — el ganador real (PROCIVING SAS, 92,8 %) con el método real: queda primero por precio (reproducido).

APU propio: **sin dato** (no hubo oferta propia: no hay APU). Si el dueño pega su costo directo en `apu_propio.costo_directo`, sale como primera fila.

| Costo directo / presupuesto | Precio propuesto | % del presupuesto | Mediana | Geométrica | Aritm. baja | Menor valor | Gana en k de 4 | Con el método real | Bajo el precio con AIU completo | Bajo costo + administración (pierde plata) | Bajo el piso (σ 15 %) | Bajo mediana − σ de las ofertas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 % | $641.510.362 | 95 % | 4.º de 4 | 4.º de 4 | 4.º de 4 | 4.º de 4 | 0 de 4 | 4.º de 4 | no | no | no (piso 94 %) | no |
| 75 % | $655.015.843 | 97 % | 4.º de 4 | 4.º de 4 | 4.º de 4 | 4.º de 4 | 0 de 4 | 4.º de 4 | sí | no | sí (piso 101 %) | no |
| 80 % | $675.274.065 | 100 % | 4.º de 4 | 4.º de 4 | 4.º de 4 | 4.º de 4 | 0 de 4 | 4.º de 4 | sí | no | sí (piso 108 %) | no |
| 85 % | $675.274.065 (pérdida en todo el rango) | 100 % | 4.º de 4 | 4.º de 4 | 4.º de 4 | 4.º de 4 | 0 de 4 | 4.º de 4 | sí | sí | sí (piso 114 %) | no |
| 90 % | $675.274.065 (pérdida en todo el rango) | 100 % | 4.º de 4 | 4.º de 4 | 4.º de 4 | 4.º de 4 | 0 de 4 | 4.º de 4 | sí | sí | sí (piso 121 %) | no |

Lectura: el descuento óptimo va de 0 % a 5 %; la banda conservador–agresivo del primer escenario va de 96 % a 94 % del presupuesto. La probabilidad que el modelo le pone al precio propuesto es 21,4 % / 15,7 % / 6,8 % / 6,8 % / 6,8 % (p_base declarado 25 % × el multiplicador de precio).

### 2.4. C · Floridablanca · FLO-INFRA-SA-MC-001-2026 (vía Ruitoque–Tres Esquinas)

Presupuesto oficial $1.004.015.042 · 2 rivales hábiles (97,51 %, 99,95 %) · método real: mediana (TRM 3.678,15).

Centro de mercado que usaría Detekta: baja mediana 0 % (P25 0 % · P75 2 %), 5 contratos, nivel «bajo», medido en entidad (seleccion abreviada). La entidad entera trae: licitacion publica 9 (mediana 4 %) · seleccion abreviada 5 (mediana 0 %) · minima cuantia 2.

Control — el ganador real (CONSORCIO JGV FLORIDA, 99,95 %) con el método real: **no queda primero por precio**. Anomalía documentada (detekta-lector, anomalias/c_explicacion.md): la evaluación puntuó a JGV con la oferta de otro proponente (984.249.295); con su oferta real (1.003.514.996) el primero por el pliego era MONTAG. El caso entra con los valores reales: el control del ganador NO se reproduce, y eso es un hecho de la entidad, no de la retro-prueba.

APU propio: **sin dato** (no hubo oferta propia: no hay APU). Si el dueño pega su costo directo en `apu_propio.costo_directo`, sale como primera fila.

| Costo directo / presupuesto | Precio propuesto | % del presupuesto | Mediana | Geométrica | Aritm. baja | Menor valor | Gana en k de 4 | Con el método real | Bajo el precio con AIU completo | Bajo costo + administración (pierde plata) | Bajo el piso (σ 15 %) | Bajo mediana − σ de las ofertas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 % | $973.894.591 | 97 % | 2.º de 3 | 2.º de 3 | 2.º de 3 | **1.º** | 1 de 4 | 2.º de 3 | no | no | no (piso 93 %) | no |
| 75 % | $978.914.666 | 97,5 % | 2.º de 3 | 2.º de 3 | 2.º de 3 | **1.º** | 1 de 4 | 2.º de 3 | sí | no | sí (piso 100 %) | no |
| 80 % | $1.004.015.042 | 100 % | 2.º de 3 | 2.º de 3 | 3.º de 3 | 3.º de 3 | 0 de 4 | 2.º de 3 | sí | no | sí (piso 107 %) | no |
| 85 % | $1.004.015.042 (pérdida en todo el rango) | 100 % | 2.º de 3 | 2.º de 3 | 3.º de 3 | 3.º de 3 | 0 de 4 | 2.º de 3 | sí | sí | sí (piso 113 %) | no |
| 90 % | $1.004.015.042 (pérdida en todo el rango) | 100 % | 2.º de 3 | 2.º de 3 | 3.º de 3 | 3.º de 3 | 0 de 4 | 2.º de 3 | sí | sí | sí (piso 120 %) | no |

Lectura: el descuento óptimo va de 0 % a 3 %; la banda conservador–agresivo del primer escenario va de 97,5 % a 96,5 % del presupuesto. La probabilidad que el modelo le pone al precio propuesto es 60,3 % / 57,2 % / 33,3 % / 33,3 % / 33,3 % (p_base declarado 33,3 % × el multiplicador de precio).

### 2.5. D · Turbaco · SAMC-006-2026 (pavimento rígido barrio Las Mercedes)

Presupuesto oficial $511.587.015 · 1 rival hábil (99,84 %) · método real: sin dato.

Centro de mercado que usaría Detekta: baja mediana 3 % (P25 1 % · P75 5 %), 7 contratos, nivel «medio», medido en entidad (todas las modalidades). La entidad entera trae: seleccion abreviada 3 · minima cuantia 2 · licitacion publica 2.

Control — el ganador real (INVEROBRAS CIVILES SAS, 99,84 %) con el método real: sin método real. Un solo hábil: ganó la oferta más cara de las cinco porque las otras cuatro quedaron fuera por habilitación (Mipyme de Turbaco). Sin rivales hábiles no hay puesto que medir: el caso se queda como control de que el precio no decide cuando los papeles deciden.

APU propio: **sin dato** (no hubo oferta propia: no hay APU). Si el dueño pega su costo directo en `apu_propio.costo_directo`, sale como primera fila.

| Costo directo / presupuesto | Precio propuesto | % del presupuesto | Mediana | Geométrica | Aritm. baja | Menor valor | Gana en k de 4 | Con el método real | Bajo el precio con AIU completo | Bajo costo + administración (pierde plata) | Bajo el piso (σ 15 %) | Bajo mediana − σ de las ofertas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 % | $498.797.340 | 97,5 % | **1.º** | **1.º** | **1.º** | **1.º** | 4 de 4 | — | no | no | no (piso 92 %) | no |
| 75 % | $503.913.210 | 98,5 % | **1.º** | **1.º** | **1.º** | **1.º** | 4 de 4 | — | no | no | sí (piso 99 %) | no |
| 80 % | $511.587.015 | 100 % | 2.º de 2 | 2.º de 2 | 2.º de 2 | 2.º de 2 | 0 de 4 | — | sí | no | sí (piso 105 %) | no |
| 85 % | $511.587.015 (pérdida en todo el rango) | 100 % | 2.º de 2 | 2.º de 2 | 2.º de 2 | 2.º de 2 | 0 de 4 | — | sí | sí | sí (piso 112 %) | no |
| 90 % | $511.587.015 (pérdida en todo el rango) | 100 % | 2.º de 2 | 2.º de 2 | 2.º de 2 | 2.º de 2 | 0 de 4 | — | sí | sí | sí (piso 118 %) | no |

Lectura: el descuento óptimo va de 0 % a 2,5 %; la banda conservador–agresivo del primer escenario va de 98 % a 92,5 % del presupuesto. La probabilidad que el modelo le pone al precio propuesto es 47,8 % / 41,7 % / 28,2 % / 28,2 % / 28,2 % (p_base declarado 50 % × el multiplicador de precio).

### 2.6. E · Gobernación de Caldas · SAMC-SI-020-2026 (vía Varsovia–Puente Quebrada La Honda, Filadelfia)

Presupuesto oficial $993.687.600 · 8 rivales hábiles (88,9 %, 92,77 %, 93,06 %, 93,18 %, 93,22 %, 93,4 %, 93,56 %, 93,89 %) · método real: menor_valor (TRM 3.213,97).

Centro de mercado que usaría Detekta: baja mediana 7 % (P25 2 % · P75 8 %), 16 contratos, nivel «alto», medido en entidad (seleccion abreviada). La entidad entera trae: seleccion abreviada 16 (mediana 7 %) · licitacion publica 12 (mediana 6 %) · minima cuantia 9 (mediana 21 %).

Control — el ganador real (GENERAL SERVICIOS S&G S.A.S, 88,9 %) con el método real: queda primero por precio (reproducido). El ganador (88,90 %) quedó bajo el «valor mínimo» que la propia entidad calculó (mediana − σ muestral, 91,61 %) y no consta solicitud de justificación. Con menor valor y aritmética baja gana; con mediana o geométrica habría quedado último.

APU propio: **sin dato** (no hubo oferta propia: no hay APU). Si el dueño pega su costo directo en `apu_propio.costo_directo`, sale como primera fila.

| Costo directo / presupuesto | Precio propuesto | % del presupuesto | Mediana | Geométrica | Aritm. baja | Menor valor | Gana en k de 4 | Con el método real | Bajo el precio con AIU completo | Bajo costo + administración (pierde plata) | Bajo el piso (σ 15 %) | Bajo mediana − σ de las ofertas |
|---|---|---|---|---|---|---|---|---|---|---|---|---|
| 70 % | $944.003.220 | 95 % | 8.º de 9 | 8.º de 9 | 9.º de 9 | 9.º de 9 | 0 de 4 | 9.º de 9 | no | no | sí (piso 95 %) | no |
| 75 % | $963.876.972 | 97 % | 8.º de 9 | 8.º de 9 | 9.º de 9 | 9.º de 9 | 0 de 4 | 9.º de 9 | sí | no | sí (piso 102 %) | no |
| 80 % | $993.687.600 | 100 % | 9.º de 9 | 9.º de 9 | 9.º de 9 | 9.º de 9 | 0 de 4 | 9.º de 9 | sí | no | sí (piso 109 %) | no |
| 85 % | $993.687.600 (pérdida en todo el rango) | 100 % | 9.º de 9 | 9.º de 9 | 9.º de 9 | 9.º de 9 | 0 de 4 | 9.º de 9 | sí | sí | sí (piso 116 %) | no |
| 90 % | $993.687.600 (pérdida en todo el rango) | 100 % | 9.º de 9 | 9.º de 9 | 9.º de 9 | 9.º de 9 | 0 de 4 | 9.º de 9 | sí | sí | sí (piso 123 %) | no |

Lectura: el descuento óptimo va de 0 % a 5 %; la banda conservador–agresivo del primer escenario va de 96 % a 94 % del presupuesto. La probabilidad que el modelo le pone al precio propuesto es 9,5 % / 7 % / 3 % / 3 % / 3 % (p_base declarado 11,1 % × el multiplicador de precio).

### 2.7. Lo que dicen los casos juntos

En los 4 procesos con competencia real (3 o más rivales hábiles) hay 20 filas con precio: 8 son escenarios donde ningún precio es rentable (el costo con su AIU supera el presupuesto y el «óptimo» es la pérdida menor, marcadas en la tabla) y 12 son propuestas con punto rentable. De las 12 propuestas **ninguna** queda primera con ningún método, y de las 20 filas ninguna con algún método y 0 con el método que de verdad se sorteó. Los ganadores reales de esos procesos ofertaron entre 88,9 % y 94,12 % del presupuesto; las filas con precio van de 94,5 % a 100 %. El descuento óptimo cae en el borde de menos descuento en 6 de las 12 propuestas con punto rentable (14 de las 20 filas): la probabilidad del modelo cambia tan poco a lo largo del barrido que el margen decide la mayoría de las veces, no siempre.

## 3. Los 64 procesos de menor cuantía del Valle (2024–2026)

64 procesos con 3 o más ofertas publicadas (detekta-lector, `valle_samc_64.json`); 36 sin entidad identificable (el origen corta el nombre a 40 caracteres y no casa con ninguna del histórico, o casa con varias) y 21 con entidad pero sin centro de mercado en el histórico (menos de 5 contratos con baja medible); sin centro Detekta no sugiere precio y el proceso no entra en la fila. Todas las ofertas publicadas se toman como hábiles: es el límite de los datos abiertos, declarado. Presupuesto sintético de $1.000.000.000 (las fórmulas del pliego comparan porcentajes, así que el valor no cambia los puestos).

| Precio evaluado | Procesos con precio | % del presupuesto (mediana) | Gana con mediana | Con geométrica | Con aritm. baja | Con menor valor | Primero si el método se sortea | Bajo mediana − σ de las ofertas | Bajo costo + AIU |
|---|---|---|---|---|---|---|---|---|---|
| costo 70 % | 7 | 100 % | 0 % | 0 % | 0 % | 0 % | 0 % de cada 100 | 0 % | 0 |
| costo 75 % | 7 | 100 % | 0 % | 0 % | 0 % | 0 % | 0 % de cada 100 | 0 % | 0 |
| costo 80 % | 7 | 100 % | 0 % | 0 % | 0 % | 0 % | 0 % de cada 100 | 0 % | 7 |
| costo 85 % | 7 | 100 % | 0 % | 0 % | 0 % | 0 % | 0 % de cada 100 | 0 % | 7 |
| costo 90 % | 7 | 100 % | 0 % | 0 % | 0 % | 0 % | 0 % de cada 100 | 0 % | 7 |
| control 96,75 % | 64 | 96,75 % | 21,9 % | 26,6 % | 10,9 % | 15,6 % | 18,8 % de cada 100 | 20,3 % | 0 |
| control 95 % | 64 | 95 % | 15,6 % | 23,4 % | 34,4 % | 28,1 % | 25,4 % de cada 100 | 31,3 % | 0 |
| control 93,4 % | 64 | 93,4 % | 6,3 % | 12,5 % | 29,7 % | 46,9 % | 23,8 % de cada 100 | 51,6 % | 0 |

Las filas «control» no son propuestas de Detekta: son precios fijos para comparar: 96,75 % (la regla con la que se ofertó Santa Elena), 95 % (un valor redondo entre los ganadores de los casos) y 93,4 % (el arranque del tramo con el que la aritmética baja ganaba en Santa Elena según `caso_santa_elena/LECCIONES.md` del lector).

### 3.1. La curva del simulador de la base nacional sobre estos 64

La misma función con la que la base nacional publica «de cada 100 procesos, en cuántos un precio queda primero» (`cifras.curvaSimulador`): con el método sorteado, y contando solo los que además no quedan bajo mediana − σ de las ofertas.

| Precio (% del presupuesto) | Primero (sorteado) de cada 100 | Primero y sobre el piso de cada 100 | Bajo el piso de cada 100 |
|---|---|---|---|
| 90 % | 33,6 % | 8,2 % | 81,3 % |
| 90,5 % | 32,4 % | 8,6 % | 76,6 % |
| 91 % | 30,5 % | 7,8 % | 75 % |
| 91,5 % | 30,9 % | 9,8 % | 70,3 % |
| 92 % | 29,3 % | 9,8 % | 65,6 % |
| 92,5 % | 28,1 % | 9 % | 64,1 % |
| 93 % | 26,6 % | 10,5 % | 54,7 % |
| 93,5 % | 23,4 % | 10,2 % | 50 % |
| 94 % | 25 % | 13,3 % | 43,8 % |
| 94,5 % | 26,2 % | 16 % | 37,5 % |
| 95 % | 25,4 % | 15,6 % | 31,3 % |
| 95,5 % | 21,9 % | 13,7 % | 28,1 % |
| 96 % | 20,3 % | 11,7 % | 28,1 % |
| 96,5 % | 18,4 % | 12,9 % | 20,3 % |
| 97 % | 16 % | 11,3 % | 17,2 % |
| 97,5 % | 11,3 % | 7,8 % | 10,9 % |
| 98 % | 9 % | 5,9 % | 10,9 % |
| 98,5 % | 6,6 % | 5,9 % | 1,6 % |
| 99 % | 4,7 % | 3,9 % | 1,6 % |
| 99,5 % | 0,8 % | 0,4 % | 1,6 % |
| 100 % | 0 % | 0 % | 0 % |

## 4. Lo que la Fase 1 midió sobre el centro de mercado (25-oct-2026) — texto fijo, no regenerado

Hechos medidos por un subagente el 25-oct-2026 con las funciones reales de `lib/indice_baja` sobre las filas CRUDAS de p6dx (datos.gov.co, con lotes), que NO están en este repositorio: estas viñetas no se recalculan con el script y se copian aquí con esa salvedad. Explican por qué el centro de la entidad no sirve para fijar el precio de una menor cuantía con competencia:

- **Los lotes envenenan el centro.** p6dx publica cada proceso de k lotes como filas proveedor × lote con el `precio_base` del proceso ENTERO: en la Secretaría de Infraestructura de Cali, 499 de 516 filas crudas son de 7 procesos con lotes, y un lote de 2 o 3 pasa la guarda del 30 % del índice (ratio adjudicado/base: lotes de 2, mediana 0,465; de 3, 0,292; de 4, 0,216). Sin deduplicar, el centro de Cali sale en 53 % de baja (77 contratos) y Detekta propondría el 57 % del presupuesto, por debajo del costo directo, con el valor esperado negativo en todo el rango. Deduplicado por proceso, como hace la aplicación, el centro queda entre 9 % y 20 % según qué fila de lote sobreviva: inestable. Sin los procesos con lotes: 9 % con 5 contratos.
- **El índice descarta a los consorcios que ganan.** `adjudicatarioReal` exige un NIT y p6dx publica «No Definido» en el NIT de los consorcios y uniones temporales: en Cali se descarta el 55 %–59 % de las filas que traen un nombre real de proveedor. Santa Elena está adjudicado en p6dx bajo otro identificador del mismo expediente (CO1.REQ.11022478: $1.488.426.655 a CONCRETAR 2026, NIT «No Definido», 24-sep-2026) y el índice lo descarta por eso.
- **No hay cubeta de menor cuantía.** La modalidad canónica agrupa toda «selección abreviada» (con y sin manifestación); en Cali esa cubeta tiene 3 procesos con baja medible y no llega al mínimo de 5: el refinamiento por modalidad no actúa y la cascada responde con la entidad entera, mezclando licitaciones por lotes y mínimas cuantías.
- **Con un centro limpio la propuesta cambia de signo.** Con el centro de Cali sin lotes (9 %, 5 contratos) y costo directo del 70 % del presupuesto, el optimizador habría dado el 91,5 % (primero con menor valor, 5.º con mediana y geométrica); con el 75 %, el 94 % (primero con la mediana). Medido con el P25/P75 de ese centro limpio, que no está en el árbol: con otros cuartos salen otros valores. El centro decide la propuesta más que el costo.
- **La probabilidad del modelo es plana donde la real cae** (esta viñeta sí se cuenta desde el resultado). En los casos con competencia real, a las filas con precio entre el 95 % y el 99 % del presupuesto el modelo les pone 7 %–22,3 % de opción y a las del 100 %, 1 %–6,8 %; en los 64 del Valle el 99 % queda primero en 4,7 de cada 100 y el 100 % en 0. Por eso el óptimo del valor esperado se va al borde de menos descuento: el margen manda y la probabilidad no lo frena.

## 5. Límites de esta medición

- El costo del APU real de cada oferta **no está**: Santa Elena vive en producción (Redis) y de A–E no hay APU propio. «Bajaba del costo» se responde por escenario de costo, no por la obra.
- El centro de mercado se construyó con las filas de p6dx de las entidades de los casos (adjudicados de obra con fecha de adjudicación desde oct-2024, una fila por proceso), con las reglas del índice; producción recorre su propio histórico (publicados desde ene-2024, todas las modalidades competitivas con objeto de obra, deduplicado por el sello de actualización) y puede tener otro conteo y otra fila de lote superviviente. La granularidad usada va dicha en cada caso. El registro real de producción no se consultó: el encargo no toca Redis.
- Los hábiles de los casos salen de los informes de evaluación; en los 64 del Valle no se sabe quién quedó hábil y se toman todas las publicadas.
- `p_base` es declarado (1 entre los hábiles): en el rango que aquí se usa (11 %–50 %) el descuento óptimo no cambia con él (la suite lo prueba para el optimizador en su rango); con valores extremos (0,8 o más) sí cambia. El VEG sí depende de él, y por eso no se publica aquí como cifra de decisión.
- El IVA sobre la utilidad va en null: el descuento se mide sobre el precio, no sobre el total con IVA que compara la entidad.

