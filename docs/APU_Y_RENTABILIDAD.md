# APU y rentabilidad — investigación de fuentes de precios

> **Cómo nació este documento.** El encargo de la base de datos de precios APU lo daba por
> existente y obligatorio de leer. **No existía**: no está en `main`, no está en la historia de
> `docs/` y no lo trae ninguna rama. Lo que sí existía —y se recuperó— es
> `modulo_apu.html`, una calculadora de APU **borrada en el commit `d69cfe8`** (28 may 2026) que
> lleva dentro toda la investigación de precios del proyecto: estructura oficial, precios base
> regionalizados, factores por ciudad y ajuste por inflación sectorial del DANE.
>
> Este archivo consolida esa investigación recuperada y separa, línea por línea, **lo verificado de
> lo estimado**. Cuando abajo se dice «recuperado» significa: el número estaba escrito en
> `modulo_apu.html` y se puede volver a leer con `git show d69cfe8^:modulo_apu.html`.

---

## 1 · La estructura del APU (verificada, no negociable)

Es la estructura oficial INVIAS/IDU y es la que reproduce el catálogo:

```
Costo Directo = Mano de Obra + Materiales + Equipo/Herramienta + Transporte
Precio Unitario = Costo Directo × (1 + AIU)
```

Con las cuatro fórmulas de capítulo, tal como estaban en el módulo recuperado:

| Capítulo | Fórmula | Qué significa `rendimiento` |
|---|---|---|
| **Mano de obra** | `(jornal_base × factor_prestacional) ÷ rendimiento` | unidades de obra por **día** de cuadrilla |
| **Materiales** | `precio × cantidad × (1 + desperdicio)` | — (usa cantidad y desperdicio) |
| **Equipo** | `tarifa ÷ rendimiento` | unidades por **día u hora**, según la unidad en que se tarifa el equipo |
| **Transporte** | `tarifa × cantidad × distancia` | — (cantidad en **m³ de material**, distancia en km) |

**Factor prestacional: 1,55** sobre el jornal base (recuperado). Es prestaciones sociales, parafiscales
y ARL sobre el salario; **no varía por región** porque lo fija la ley, no el mercado.

### 🚩 Un error de la fuente recuperada que NO se replicó

En `modulo_apu.html` la plantilla de acero de refuerzo lleva
`{n:'Acarreo materiales', tarifa:1200, cant:1.05, dist:15}`, es decir **$18.900 de transporte por
kilogramo de acero** — más del doble que el propio acero. La tarifa de acarreo está en **$/m³-km** y
la plantilla le pasaba kilogramos como si fueran metros cúbicos.

En este catálogo la regla es explícita y única: **`cantidad_por_unidad` de una línea de transporte
está siempre en m³ de material movido por unidad del ítem.** Para el acero son
`1,05 kg ÷ 7.850 kg/m³ ≈ 0,00013 m³`, o sea unos **$2,5/kg**, que es lo correcto. Un APU de acero con
el 78 % del costo en acarreo habría llevado a fijar precio muy por encima del mercado y a perder
todos los procesos donde el acero pesa.

---

## 2 · Precios base recuperados (Bogotá)

Estos **sí** son datos del proyecto, no estimaciones. La base del módulo era **~marzo 2025**.

| Insumo | Unidad | Precio mar-2025 (recuperado) |
|---|---|---|
| Cemento gris | saco 50 kg | 32.000 |
| Arena de río | m³ | 78.000 |
| Triturado 3/4" | m³ | 92.000 |
| Acero de refuerzo 60.000 PSI | kg | 4.200 |
| Agua | m³ | 9.000 |
| Ladrillo tolete común | und | 850 |
| Jornal oficial de construcción | día | 95.000 |
| Jornal ayudante | día | 68.000 |
| Cuadrilla 1 oficial + 3 ayudantes | día | 299.000 |
| Cuadrilla 1 oficial + 1 ayudante | día | 163.000 |
| Mezcladora 1 saco | día | 85.000 |
| Vibrador de concreto | día | 65.000 |
| Acarreo de materiales | m³-km | 1.200 |

**Invariante recuperada y verificable:** las cuadrillas son exactamente la suma de sus jornales
(`299.000 = 95.000 + 3 × 68.000` y `163.000 = 95.000 + 68.000`). El catálogo la conserva y hay una
prueba que la vigila: si alguien toca un jornal y no la cuadrilla, la suite falla.

### Rendimientos y composiciones recuperados

Tres APU completos venían con la fuente y entran al catálogo **sin retocar**:

- **Concreto 21 MPa (3.000 PSI), m³** — cuadrilla 1+3 rend. 8 m³/día; 7 sacos de cemento, 0,55 m³ de
  arena, 0,85 m³ de triturado (5 % desperdicio), 0,18 m³ de agua; mezcladora y vibrador rend. 8;
  acarreo 1 m³ × 15 km.
- **Muro en ladrillo tolete, m²** — cuadrilla 1+1 rend. 12 m²/día; 58 ladrillos, 0,4 sacos de
  cemento, 0,04 m³ de arena (5 % desperdicio).
- **Acero de refuerzo, kg** — cuadrilla de figurado rend. 120 kg/día; 1,05 kg con 3 % de desperdicio.

---

## 3 · Ajuste por inflación sectorial — ICOCIV (DANE)

Recuperado tal cual, incluido el periodo del boletín cargado:

- **Boletín: marzo 2026 · variación anual general de ingeniería civil: 4,70 %**
- Fuente citada en el propio módulo: DANE, Índice de Costos de la Construcción de Infraestructura de
  Ingeniería Civil (ICOCIV), sucesor del ICCP.

| Tipología | Variación anual |
|---|---|
| General (ingeniería civil) | 4,70 % |
| Vías / carreteras | 4,26 % |
| Obras hidráulicas / control de inundaciones | 3,70 % |
| Plantas de tratamiento de agua potable | 1,18 % |
| Líneas eléctricas media/baja tensión | 9,33 % |
| Subestaciones eléctricas | 9,01 % |
| Fibra óptica / telecomunicaciones | 8,57 % |
| Construcciones en minas y plantas industriales | 4,56 % |
| Pistas de aterrizaje | 3,95 % |

**Uso en el catálogo:** los precios recuperados de marzo 2025 se llevan a la base vigente
multiplicándolos por **1,047** (la variación general). Por eso el cemento entra como 33.504 y no como
32.000. El factor y la fecha del boletín viajan en `_meta` del catálogo: una cifra sin su origen no
se puede discutir.

---

## 4 · Regionalización

### Lo recuperado: índice de costo por ciudad, relativo a Bogotá = 1,00

El módulo traía las 32 capitales. Las que interesan a las cinco regiones del encargo:

| Ciudad | Índice | Ciudad | Índice |
|---|---|---|---|
| Bogotá D.C. | 1,00 | Barranquilla | 1,05 |
| Medellín | 1,02 | Cartagena | 1,07 |
| Bucaramanga | 0,99 | Santa Marta | 1,06 |
| Cúcuta | 0,96 | Valledupar | 1,05 |
| Pereira | 0,97 | Montería | 1,04 |
| Manizales | 0,98 | Sincelejo | 1,04 |
| Armenia | 0,96 | Riohacha | 1,09 |

(La tabla completa incluye los sobrecostos de transporte de las capitales amazónicas e insulares:
Quibdó 1,18 · Leticia 1,35 · Mitú 1,40 · San Andrés 1,45. Están fuera de las cinco regiones pedidas
pero son la evidencia de que el índice es logístico, no arbitrario.)

### Lo derivado: cuatro factores por región 🟡 ESTIMADO

El encargo pide `factor_materiales`, `factor_mano_obra`, `factor_equipo` y `factor_transporte`; la
fuente recuperada solo tiene **un** índice compuesto por ciudad. La desagregación es **razonada, no
medida**, y se sostiene en tres hechos del mercado colombiano:

- **Materiales**: suben donde el agregado escasea o viaja lejos. En la Costa la arena de río es
  escasa y el triturado se trae de canteras interiores.
- **Mano de obra**: sigue el mercado laboral local. Bogotá y Medellín pagan por encima; el Eje
  Cafetero y los Santanderes, por debajo.
- **Equipo**: el alquiler es más barato donde el parque está concentrado (Bogotá, Medellín) y más
  caro en la periferia.
- **Transporte**: distancia a plantas de cemento, canteras y puertos.

| Región | materiales | mano de obra | equipo | transporte | índice compuesto | índice recuperado |
|---|---|---|---|---|---|---|
| Bogotá / Sabana | 1,00 | 1,00 | 1,00 | 1,00 | **1,000** | 1,00 |
| Medellín / Antioquia | 1,01 | 1,04 | 0,98 | 1,05 | **1,016** | 1,02 |
| Costa Atlántica | 1,10 | 0,97 | 1,08 | 1,12 | **1,059** | 1,05 (Barranquilla) |
| Eje Cafetero | 0,97 | 0,93 | 1,02 | 1,04 | **0,972** | 0,97 (Pereira) |
| Santanderes | 0,99 | 0,94 | 1,01 | 1,05 | **0,983** | 0,99 (Bucaramanga) |

La columna «índice recuperado» es siempre el de la **ciudad cabecera**, no un promedio de la región:
el campo se llama `indice_ciudad_recuperado` y tiene que contener lo que su nombre dice. Poner ahí el
promedio de las siete capitales de la Costa (1,057) habría metido un dato derivado en un campo que
anuncia un dato recuperado — y el contraste dejaría de ser contra la fuente. Que el compuesto de la
Costa (1,059) quede por encima de Barranquilla es correcto y esperable: la región incluye Riohacha
(1,09) y Cartagena (1,07).

**La cerradura de esta estimación:** el índice compuesto se recalcula con la estructura típica de
costos de obra civil (**45 % materiales · 30 % mano de obra · 18 % equipo · 7 % transporte**) y tiene
que caer **a menos de 0,015 del índice recuperado de la ciudad cabecera**. Hay una prueba que lo
comprueba región por región. Si alguien retoca un factor «a ojo», la suite lo detiene: los cuatro
factores no pueden separarse del único dato duro que los respalda.

### AIU: no se regionaliza, y decir lo contrario sería inventar precisión

El campo `aiu_tipico` existe porque el encargo lo pide, pero lleva **el mismo valor en las cinco
regiones**: `A 15 % · I 5 % · U 5 %` (el default recuperado del módulo, dentro de las bandas del
manual: A 12–20 %, I 3–5 %, U 5–10 %). El AIU lo fija el pliego y el riesgo del contrato, no la
geografía. Publicar un gradiente regional de AIU sería fabricar una precisión que nadie midió.

---

## 5 · Lo que este catálogo NO es

- **No es una cotización.** Es una referencia de arranque para saber si un proceso vale la pena.
  Antes de presentar oferta hay que cotizar. El propio módulo recuperado lo advertía y la advertencia
  se conserva en la respuesta del endpoint.
- **No incluye los costos ocultos del Capítulo 11 del manual** —contribución del 5 % (Ley 418/1997),
  estampillas, retenciones, pólizas, costo financiero del capital de trabajo, ensayos, PMA/SST,
  liquidación—. El APU es costo directo + AIU; esos van encima y son justamente «el olvido más caro
  del país». Son la Fase 2.
- **No calcula precios todavía.** Esta entrega es la **base de datos**: insumos, ítems, factores y su
  carga en Redis. La calculadora que resuelve las cuatro fórmulas de la sección 1 y la rentabilidad
  contra la cuantía publicada del proceso es la Fase 2.

---

## 6 · Referencias del propio repositorio

- `docs/GUIA_ANALISTA_LICITACIONES.md` Cap. 11 — APU, AIU, costos ocultos, flujo de caja.
- `docs/COMPLEMENTO_ANALISTA_LICITACIONES.md` — reajuste de precios (ICOCIV), precios unitarios vs.
  precio global (en global **no** se reconocen mayores cantidades; en unitarios sí, y una mayor
  cantidad **no** es una adición), contribución del 5 % sobre el valor sin impuestos y también sobre
  las adiciones.
- `CLAUDE.md` — SMMLV 2026 `$1.750.905`. Sirve de contraste: el jornal de ayudante del catálogo
  (71.196/día × 24 días ≈ $1,71 M/mes) queda justo bajo el mínimo, que es donde debe estar.
