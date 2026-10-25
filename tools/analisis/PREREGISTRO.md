# Pre-registro de hipótesis · investigación de la fórmula de adjudicación

> Para: sesión · Estado: informe fechado · Sustituido por: —

Escrito el 21-oct-2026 a las 04:40 UTC, ANTES de abrir `base.jsonl.gz` de la corrida desde 2019 (la corrida
seguía bajando ofertas en ese momento: lote 541 de 699 de `wi7w-2nvm`). Lo único visto antes: las cifras de la
base del 17-oct-2026 que ya están en `docs/MEMORIA.md` y en `lib/apu/piso_techo.js` (piso 93,3 %/93,4 %,
acierto 57 %/39 %, reparto de centavos de la TRM, umbrales de la alerta). Esas cifras no se re-prueban como
hipótesis nuevas: se replican y se comparan.

## Definiciones fijas

- **Universo**: `tipo_de_contrato='Obra'`, adjudicado, modalidad licitación pública o selección abreviada de menor
  cuantía (mínima cuantía aparte, solo para H2, H9 y el umbral). Una fila por `id_del_portafolio`
  (`limpieza.elegirFila`). Exclusiones en cascada: no adjudicado · sin precio base · lotes (precio base
  distinto o `numero_de_lotes` > 1) · sin ofertas en datos abiertos · lote por ofertas · cero ofertas válidas ·
  inconsistencia (adjudicado sobre el precio base o distinto en > 1 % de la oferta del ganador) · sin ganador
  emparejado (solo para lo que necesita al ganador).
- **Variables**: `r_adj = valor_adjudicado / precio_base`; `r_i = oferta_i / precio_base`; `n = ofertas válidas`;
  posición del ganador: rango de menor a mayor (1 = la más baja), `z = (r_g − media) / σ_muestral`, distancia a la
  mediana en puntos; `baja = 100·(1 − r)`. Ventanas: 2024–2026 (principal), 2022–2026 y 2019–2026 (escenarios),
  por año de adjudicación.
- **Comparables de una entidad**: solo procesos ANTERIORES a la fecha de adjudicación del proceso evaluado (sin
  mirar el futuro); mínimo 5 (`MIN_PROCESOS` de Detekta).
- **Errores estándar**: remuestreo por bloques de ENTIDAD (`codigo_entidad`), 2.000 réplicas, semilla 20261021.
- **Pruebas múltiples**: Benjamini–Hochberg al 5 % sobre todas las pruebas de H1–H11 juntas; una hipótesis
  «sobrevive» solo si su p ajustada < 0,05 Y el tamaño del efecto supera el umbral declarado abajo.
- **Sin probabilidad desnuda** en el informe para el dueño: «de cada 100 procesos…».

## Hipótesis (métrica · umbral de relevancia · dirección esperada)

| # | Hipótesis | Métrica | Umbral para «cuenta» | Dirección |
|---|---|---|---|---|
| H1 | r_adj es estable por entidad (n ≥ 5), por departamento y por modalidad | Varianza explicada (R²) de r_adj por efectos de entidad fuera de muestra (validación cruzada por proceso dentro de la ventana) frente a la media global; ancho del IQR dentro de entidad vs global | R² fuera de muestra ≥ 0,10; IQR dentro de entidad ≤ 70 % del global | Entidad explica más que departamento |
| H2 | Más oferentes → mayor baja | Pendiente de `baja_ganadora` sobre log(n) (regresión con IC por bloques); mediana de la baja por tramo 1 · 2 · 3–4 · 5–9 · 10+ | Pendiente > 0 con IC que excluye 0 y diferencia de mediana 1 vs 10+ ≥ 3 puntos | Positiva |
| H3 | Acumulación de ofertas cerca de la media/mediana del proceso y cerca del umbral de la guía (media − σ, 80 %, 88 %) | Histograma de `(r_i − mediana_proceso)` en pasos de 0,5 puntos; exceso de masa en ±0,5 puntos frente a los vecinos ±1,5; ídem alrededor de 0,80, 0,88 y de `mediana − σ` | Exceso ≥ 25 % sobre el promedio de las celdas vecinas con IC que excluye 0 | Masa cerca de la mediana; poca o ninguna cerca de 80 % |
| H4 | Posición del ganador bajo cada método | Distribución del rango del ganador y de su `z`; proporción de ganadores que son la oferta MÁS BAJA; proporción que queda primera con cada método fijo (replica del acierto del 17-oct) | Se reporta; «cuenta» si la proporción «más baja gana» difiere de la que daría un método al azar en ≥ 10 puntos | En licitación/menor cuantía el ganador NO suele ser el más bajo |
| H5 | Dígitos (Benford en el primer dígito; últimos dígitos) como control de calidad | Chi² de Benford sobre `valor_de_la_oferta` válido; frecuencia de valores terminados en 000.000 y en 000 | Solo control: una desviación grande se reporta como calidad, no como regla | — |
| H6 | Los centavos de la TRM se reparten parejo (el método es un sorteo justo) | Chi² sobre los 4 rangos de centavos en las fechas de TRM 2024–2026 (serie 32sa-8pi3) | No se rechaza el reparto parejo (p > 0,05) | Parejo |
| H7 | Departamento y municipio mejoran la predicción fuera de muestra de r_adj frente a entidad + modalidad + tamaño | Diferencia de error absoluto medio fuera de muestra (validación por bloques: dejar un departamento fuera y, aparte, por año) entre el modelo con y sin geografía | Mejora ≥ 0,5 puntos de r_adj (0,005) con IC por bloques que excluye 0 | Pequeña o nula |
| H8 | Ventaja local: el oferente del mismo departamento de la obra gana más | Tasa de victoria de oferentes locales vs foráneos dentro del proceso (logit condicional con indicador «local») sobre la fracción con domicilio conocido (`qmzu`); cobertura declarada | Razón de momios ≥ 1,3 con IC que excluye 1; cobertura ≥ 30 % de ofertas con domicilio | Positiva |
| H9 | Efecto del tamaño (terciles del precio base por modalidad) y de la versión del documento tipo (aviso antes/después del 3-feb-2025 en transporte; 16-feb-2026 en social) | Mediana de r_adj y de n por tercil; diferencia antes/después de cada fecha | Diferencia ≥ 2 puntos con IC que excluye 0 | Procesos grandes: más oferentes y más baja |
| H10 | Calendario: diciembre y Ley de Garantías | Mediana de r_adj y de n por mes de cierre; ventana de garantías [fechas por verificar en norma antes de correr] vs resto | Diferencia ≥ 2 puntos con IC que excluye 0 | Más procesos y menos oferentes en diciembre |
| H11 | Reincidencia: el mismo ganador repite en la misma entidad | Proporción de procesos cuyo ganador ya había ganado ≥ 2 veces antes en la entidad; comparación con lo esperado por azar dado el número de oferentes | Solo señal de control; no entra al optimizador | — |
| H12 | Otras reglas del estadístico | Deben anotarse AQUÍ con fecha antes de probarlas | — | — |

## Criterios de éxito de la fórmula (sección 6 del prompt; el dueño no fijó otros el 21-oct, se toman los sugeridos)

- Tasa de adjudicación simulada fuera de muestra ≥ B2 + 3 puntos porcentuales, IC 95 % por remuestreo de procesos
  agrupado por entidad que excluya 0.
- Pendiente de calibración entre 0,8 y 1,2 (regresión de la frecuencia observada sobre la probabilidad predicha
  en deciles).
- Sin cambio de signo del efecto entre años; sin empeorar más de 3 puntos en ningún segmento con ≥ 200 procesos.
- Margen esperado ≥ el declarado; riesgo de quedar bajo «mediana − σ» del proceso ≤ 10 % (tope declarado por la
  sesión; el dueño puede moverlo: D5).
- Todo reproducible con un comando y semilla fija; datos con hash.

## Líneas base

- **B0**: ofertar el menor precio admisible (el piso del dueño).
- **B1**: ofertar `precio_base × mediana(r_adj)` de los comparables ANTERIORES de la entidad (n ≥ 5); sin ellos,
  del departamento; sin ellos, del país y modalidad.
- **B2**: lo que Detekta hace hoy: techo competitivo = `precio_base × (1 − baja_mediana)` con la cascada
  entidad+familia → entidad → departamento+familia (`lib/indice_baja.bajaDeMercado`, mínimo 5, histograma de puntos
  enteros), y la alerta por modalidad (88 % / 88 % / 70 %). Se reimplementa SOLO la cascada de baja (misma
  definición) sobre la base, porque el índice de producción vive en Redis y no está en la sesión: se declara como
  réplica.

## Partición temporal (adaptada a los datos: `wi7w` empieza en 2024)

- Principal: entrenamiento 2024 → validación 2025 → prueba 2026 (hasta el 20-oct-2026).
- Escenario histórico (si `b28v` da cobertura usable): entrenamiento ≤ 2023 → validación 2024 → prueba 2025–2026,
  como pedía el prompt. La prueba 2026 no se mira hasta el final.

## H12 · reglas añadidas el 21-oct-2026 a las 05:35 UTC, DESPUÉS de ver la validación 2025 de B0–B2 y F_opt (se declara)

Lo visto: el optimizador por comparables con la regla del piso elige casi siempre entre 96 % y 97 % del precio base
(desviación 1,7 puntos, igual en licitación y menor cuantía, igual con historia desde 2019 o desde 2024), y la
réplica de B2 oferta exactamente el 100 % en la mitad de los procesos (mediana de baja de 0 puntos enteros). Para
saber si la «fórmula» es algo más que una constante nacional, se añaden al backtest, con la misma métrica y antes
de correrlas:
- **C95, C96.5, C98**: constantes (95 %, 96,5 %, 98 % del precio base) sin mirar ningún comparable.
- **P25_entidad**: el percentil 25 del r_adj de los comparables anteriores de la entidad (≥ 5; si no departamento; si no país).
- **Piso_comparables**: la mediana del piso (mediana − σ de cada proceso) de los comparables anteriores, más 0,5 puntos.
- **B2_exacta**: la misma cascada de B2 pero con la mediana exacta de la baja en vez del histograma de puntos enteros
  (mide cuánto del resultado de B2 es el redondeo).
Criterio: si ninguna regla con comparables supera a la mejor constante en ≥ 3 puntos (IC por entidad que excluya 0)
en los procesos con 3 o más ofertas, la respuesta es «no hay regla por entidad ni ubicación más allá de un nivel
nacional» (resultado B del prompt).

## H13 · valor esperado con costo supuesto, declarada el 25-oct-2026 ANTES de correr `valor_esperado.py`

Lo visto antes de declararla: toda la comparación anterior cuenta «ganadas por cada 100» (resultado B en 2024 y 2025). Esa métrica
favorece bajar el precio sin límite; la decisión del dueño es ganar PESOS con margen ≥ 0. Aún no se ha visto ninguna cifra de valor.
- **Valor de una oferta b** (fracción del precio base) con costo c (fracción del precio base): P(gana | b) × (b − c), con la P «con piso» del backtest.
- **c es un supuesto** hasta que el dueño dé el suyo: rejilla 70 %–93 %, tabla en 78/82/86/90 %. Utilidad mínima supuesta: 2 puntos del precio base
  (si la estrategia propone menos, se sube a c + 2; si no cabe bajo el 100 %, no se oferta).
- **Estrategias:** B2 (referencia de Detekta, réplica), B0 (88 %), B1, constantes 95/96,5/98, Piso_comparables, `V_const_ano_anterior` (la constante que
  maximiza el valor en el año anterior, ≥ 3 ofertas), `V_const_oraculo` (la mejor dentro de la muestra: cota superior, no se puede usar), `V_comparables`
  (argmax de P×(b−c) sobre los comparables anteriores: el análogo del optimizador de Detekta con P de comparables).
- **Criterios de decisión** (procesos con 3 o más ofertas, IC por entidad, validación 2025, 2024 como segunda mirada):
  1. «Cambiar la referencia de Detekta por una constante»: `V_const_ano_anterior − B2` con IC que excluya 0 en 2025 y 2024 para los costos 82 % y 86 %.
  2. «Desarrollar una regla con comparables»: `V_comparables − V_const_ano_anterior` con IC que excluya 0 en 2025 y mismo signo en 2024 para 82 % y 86 %.
  3. Lo que no cumpla queda «mostrar como dato» o «descartar»; no se afina nada tras ver el resultado.
- **Límite declarado:** no replica `lib/probabilidad` ni `lib/apu/optimizador` (la P de Detekta con su factor de baja); compara el NIVEL de precio que Detekta toma
  como referencia (B2), no la salida exacta del optimizador. Replicarla es un pendiente propio.
