# Probabilidad de adjudicación · Fase 0: qué datos abiertos hay para saber quién gana una obra

> Para: dueño · Estado: informe fechado · Sustituido por: —

> Foto del **25-oct-2026**, hecha CON internet (datos.gov.co respondió HTTP 200). Las cifras salen de
> `tools/analisis/fase0_ficha_datos.json`, que trae el SHA-256 de cada archivo leído y los comandos para
> rehacerlas. Los datos no van al repositorio. El porqué de las decisiones está en `docs/MEMORIA.md`,
> sección «Probabilidad de adjudicación, Fase 0: las ofertas abiertas sí existen desde 2020…». Esta fase no
> cambia nada de la aplicación.

## 0. En una pantalla

- Hay ofertas abiertas, oferente por oferente, desde 2020 hasta el 24-oct-2026. Están en dos bases:
  `wi7w-2nvm` (desde 2024) y `b28v-edj8` (hasta 2023). Las «vistas por año» 2020-2023 están vacías: son
  filtros de la base de 2024 en adelante.
- Ninguna base dice qué oferta quedó habilitada, cuál se rechazó ni cuál ganó. El ganador sale del proceso
  (`p6dx-8zbt`). En los procesos con ofertas válidas y sin lotes, su oferta aparece en 4.587 de 4.905
  licitaciones (94 %) y en 10.286 de 10.627 menores cuantías (97 %).
- Procesos de obra adjudicados entre 2020 y 2026 con 3 o más ofertas válidas, ganador emparejado y
  competencia de precio: **2.619 de licitación** y **4.052 de menor cuantía**. Es un piso. El auditor encontró
  que tres reglas de la base apartan procesos que sí sirven; corregidas, licitación subiría a unos 3.230
  [inferencia: los arreglos se solapan]. Cambiarlas es decisión del dueño (sección 8).
- Hay un hueco: unos 850 procesos adjudicados entre sep-2022 y feb-2023 no tienen ninguna oferta publicada,
  y SECOP II les marca 0 respuestas. Fuera de ese hueco solo hay otro grupo pequeño (22 procesos, ago-oct-2023).
  En 2020, 2021 y 2024-2026, ninguna licitación ni menor cuantía adjudicada y consultada queda sin ofertas.
- El 17-oct-2026, con datos de 2024 a 2026, el ganador real no se pudo reproducir con las fórmulas. Quedó
  primero con algún método en ~57 % de menor cuantía y ~39 % de licitación. Hay dos causas probables. No se sabe
  quién quedó habilitado. Y fuera de los documentos tipo, la fórmula es la de cada pliego (sección 6)
  [inferencia].

## 1. Qué base sirve y cuál no

| Base | Qué es | Filas | Años | Sirve |
|---|---|---|---|---|
| `p6dx-8zbt` | procesos, una fila por fase | 9.377.332 | 2015-2026 | sí: precio base, adjudicatario, valor adjudicado, modalidad |
| `wi7w-2nvm` | ofertas desde 2024 | 51.236.830 | 2023-12-31 a 2026-10-24 | sí: oferente, NIT y valor de cada oferta |
| `b28v-edj8` | ofertas hasta 2023 | 44.519.591 | 2015-2023 | sí, para 2020-2023 |
| `atkq-fc9r`, `pp6p-gvye`, `yk6j-79e6`, `vz4x-85r3` | vistas «Ofertas 2020 a 2023» | 0, 0, 0 y 4 | — | no: son filtros de `wi7w-2nvm`, que empieza en 2024 |
| `hgi6-6wh3` | proponentes por proceso | 2.352.116 | 2015-2026 | complemento: la llave es el `CO1.REQ` de la fase, no el portafolio |
| `jbjy-vk9h` | contratos | **1.000** el 25-oct-2026 | — | hoy no: ver la nota |
| `qmzu-gj57` | proveedores registrados | 1.627.308 | 2015-2026 | identidad del oferente por código o NIT |
| `32sa-8pi3` | TRM | 8.374 | 1991-2026 | sí: elige el método de evaluación |

Las filas no son ofertas. Una oferta se repite en muchas filas: en licitación, la descarga agrupada juntó
9.959.120 filas repetidas. Una oferta es la combinación de proceso, oferente y valor.

**Nota sobre `jbjy-vk9h`.** El 25-oct-2026 respondió `count(*) = 1000`, medido dos veces con HTTP 200, y
solo 91 contratos firmados en 2025. Sus filas se actualizaron ese día a las 05:48 UTC: parece una recarga a
medias [inferencia; se confirma repitiendo el conteo otro día]. En esta corrida apagó el rescate de
ofertas por debajo del 50 % (0 rescates; el 17-oct fueron 12, todos de mínima cuantía). Eso sí mueve (b) y
(c): el auditor midió un techo de 52 procesos, 46 de ellos de mínima. Una primera versión de este informe
decía que no tocaba ninguna columna, y era falso.

## 2. Calidad de las ofertas

- **Moneda.** Todas las filas de las dos bases dicen «COP».
- **Confidencial.** Las filas «Confidencial» traen valor 0: 145.840 (2024), 132.408 (2025) y 93.551 (2026)
  en `wi7w-2nvm`. Se descartan: ese 0 significa «no se publica», no «ofertó cero».
- **Marcadores.** Valor 1: 207.297 filas en 2024 y 231.629 en 2018. Valor 999.999.999: 3.080 filas en 2023
  y 1.914 en 2025. Un billón de pesos o más: entre 2.099 (2021) y 8.532 (2023) filas por año entre 2020 y
  2026. Ninguna fila con valor negativo.
- **NIT.** «No Definido» aparece en cientos de miles de filas por año. En licitación, 39.551 de las 67.155
  ofertas válidas no traen NIT, y 36.362 de ellas (92 %) son consorcios o uniones temporales. El oferente se
  identifica por su nombre, unido con el NIT cuando lo hay.
- **Fuera de rango.** En licitación se descartaron 2.175 ofertas por encima del precio base y 6.570 por
  debajo del 50 % (por lo general son otra medida: un unitario o un valor en miles).
- **Código UNSPSC.** Desde 2023, la fila «Presentación de oferta» de menor cuantía trae «UNSPECIFIED» en vez
  del código. En 9.440 procesos el código se toma de otra fase del mismo proceso.

## 3. El universo: qué es obra civil aquí

Se toman los procesos que SECOP II declara de tipo «Obra», en licitación pública y en selección abreviada de
menor cuantía. La mínima cuantía va aparte. Quedan fuera el concurso de méritos, la contratación directa y
el régimen especial.

El código UNSPSC sirve para revisar ese criterio. Lo justifican dos hechos:

- **Dentro del tipo «Obra», casi todo es construcción.** En licitación, 5.078 de 6.567 adjudicados (los
  6.550 de la tabla más 17 adjudicados fuera de 2020-2026) son de
  los segmentos 72 (edificación, construcción y mantenimiento) o 95 (terrenos, estructuras y vías). Otros
  696 son de los segmentos 81 (ingeniería) o 77 (servicios ambientales): objeto mixto, se marcan y no se
  excluyen. Quedan 793 de otros segmentos (70, 83, 30, 80…): obra que la entidad codificó por el uso o el
  material [inferencia].
- **Fuera del tipo «Obra» hay códigos de obra.** 8.239 filas con UNSPSC 72 o 95 en esas modalidades están
  como «Prestación de servicios», 874 como «Suministros» y 612 como «Compraventa», frente a 46.273 de tipo
  «Obra». Son filas de fases, no procesos, y la consulta solo ve las filas que traen código. El auditor contó
  167 portafolios adjudicados con 7214 o 95 fuera del tipo «Obra». Entre ellos hay obra real, como el
  mantenimiento rutinario de vías del INVIAS (CO1.BDOS.5230611). Pesan cerca del 2 %, y entrarían solo si el
  dueño lo decide, porque cambian la población.

## 4. Cobertura por año (adjudicados, por año de adjudicación)

(a) valor adjudicado y precio base, con lo adjudicado sin pasar el precio base · (b) 3 o más ofertas válidas
y sin lotes · (c) la oferta del adjudicatario está entre las válidas, exactamente una · (d) dentro de (b),
cuántos procesos tienen todas las ofertas con NIT · «Usables» = (b) y (c), sin inconsistencia y con
competencia de precio.

### Licitación pública

| Año | Adjudicados | (a) | (b) | (c) | (d) | Usables |
|---|---|---|---|---|---|---|
| 2020 | 335 | 335 (100,0 %) | 157 (47 %) | 191 (57 %) | 3 de 157 | 128 (38 %) |
| 2021 | 874 | 870 (99,5 %) | 395 (45 %) | 620 (71 %) | 14 de 395 | 294 (34 %) |
| 2022 | 1.297 | 1.287 (99,2 %) | 557 (43 %) | 855 (66 %) | 18 de 557 | 443 (34 %) |
| 2023 | 1.307 | 1.305 (99,8 %) | 732 (56 %) | 985 (75 %) | 25 de 732 | 595 (46 %) |
| 2024 | 753 | 751 (99,7 %) | 401 (53 %) | 529 (70 %) | 20 de 401 | 337 (45 %) |
| 2025 | 1.170 | 1.163 (99,4 %) | 538 (46 %) | 795 (68 %) | 20 de 538 | 424 (36 %) |
| 2026 | 814 | 811 (99,6 %) | 438 (54 %) | 599 (74 %) | 10 de 438 | 398 (49 %) |
| **Total** | **6.550** | **6.522** | **3.218** | **4.574** | **110** | **2.619** |

### Selección abreviada de menor cuantía

| Año | Adjudicados | (a) | (b) | (c) | (d) | Usables |
|---|---|---|---|---|---|---|
| 2020 | 679 | 675 (99,4 %) | 426 (63 %) | 552 (81 %) | 168 de 426 | 341 (50 %) |
| 2021 | 1.253 | 1.245 (99,4 %) | 673 (54 %) | 1.116 (89 %) | 307 de 673 | 574 (46 %) |
| 2022 | 1.652 | 1.646 (99,6 %) | 565 (34 %) | 1.078 (65 %) | 274 de 565 | 473 (29 %) |
| 2023 | 2.143 | 2.134 (99,6 %) | 858 (40 %) | 1.855 (87 %) | 420 de 858 | 724 (34 %) |
| 2024 | 1.813 | 1.805 (99,6 %) | 797 (44 %) | 1.598 (88 %) | 336 de 797 | 667 (37 %) |
| 2025 | 2.743 | 2.736 (99,7 %) | 868 (32 %) | 2.419 (88 %) | 354 de 868 | 745 (27 %) |
| 2026 | 1.848 | 1.838 (99,5 %) | 629 (34 %) | 1.636 (89 %) | 278 de 629 | 528 (29 %) |
| **Total** | **12.131** | **12.079** | **4.816** | **10.254** | **2.137** | **4.052** |

### Mínima cuantía (aparte)

| Año | Adjudicados | (a) | (b) | (c) | Usables |
|---|---|---|---|---|---|
| 2020-2026 | 8.191 | 8.163 | 4.031 | 7.148 | 3.526 |

Límites de estas tablas:

- **2020 está incompleto por el borde.** Un proceso cuya única fila es de 2019 no entra.
- **2026 llega al 24-oct.**
- **El hueco de 2022.** Entre sep-2022 y feb-2023, 135 licitaciones, 402 menores cuantías y 279 mínimas
  adjudicadas en 2022 no tienen ninguna oferta publicada. Se comprobó en vivo con CO1.BDOS.3121807: 0 filas en
  las dos bases de ofertas, 0 respuestas en p6dx y adjudicado a un consorcio por $285.637.500. El auditor
  comprobó que el hueco también está en `hgi6-6wh3` (proponentes): es de la fuente, no de la descarga.
- **Lo que no se consultó.** Los procesos sin precio base o con varios precios base no se consultaron, y no
  cuentan como «sin ofertas».
- **«Seleccionado» sin adjudicación.** 820 procesos (226 de licitación, 390 de menor cuantía y 204 de mínima)
  tienen estado «Seleccionado», `adjudicado` = No y respuestas, sin ganador ni valor en ninguna fila. Quedan
  fuera de la tabla. Si se adjudicaron, no se sabe: la base de contratos está caída.
- **Los «usables» son un piso, no la cifra final** (ver la sección 8): tres reglas de la base dejan fuera
  procesos que sí sirven.

## 5. Lo que estos datos permiten afirmar y lo que no

- **Sí.** Para cada proceso adjudicado: cuántos ofertaron, con cuánto, en qué puesto quedó el ganador por
  precio y a qué porcentaje del presupuesto se adjudicó. Es una banda histórica de adjudicación, con
  cobertura medida (Nivel 1).
- **No, todavía.** Una probabilidad de ganar. Para eso hay que saber quién quedó habilitado, porque las
  fórmulas solo se aplican a las ofertas hábiles, y eso no está en ninguna base abierta.

## 6. Qué regla de precio rigió en cada proceso (verificación normativa)

La lectura está en `tools/analisis/normas_metodos.json`: 22 versiones de documentos tipo, cada una con su
documento oficial de Colombia Compra Eficiente, su numeral y su vigencia. Lo que cambia la Fase 1:

- **La versión se elige por la fecha del aviso de convocatoria, no por la de adjudicación.** Entre el
  27-nov-2020 y el 31-dic-2020 la entidad podía adoptar por anticipado la versión nueva: en ese tramo hay que
  leer el pliego.
- **No siempre hubo 4 métodos.**
  - Licitación de transporte V1 (hasta el 9-mar-2020): cinco métodos, en tramos de 0,20. Uno de ellos mete el
    presupuesto oficial dentro de la media.
  - Menor cuantía de transporte V1 (17-feb-2020 a 31-dic-2020): solo dos: «De 0.00 a 0.50», media aritmética
    baja; «De 0.51 a 0.99», menor valor. Lo comprobó también la sesión principal en el documento descargado
    (descarga 29962 de Colombia Compra Eficiente, Capítulo IV).
  - Desde 2021: las 4 fórmulas que ya tiene `scripts/base_obra/metodos.js`.
- **Puntaje máximo del precio.** 70 en 2020, 60 desde 2021, 59,5 desde el 29-ago-2022, y 48,5 (licitación) y
  49,5 (menor cuantía) en las versiones actuales. Solo cambia el redondeo al séptimo decimal, no el orden.
- **El día de la TRM cambia por versión.** Según la versión es el de la audiencia, el día hábil siguiente a
  la apertura, el segundo día hábil después del cierre o el segundo día hábil después del traslado del informe.
  Ninguna de esas fechas está en los datos abiertos: se estima.
- **Empates.** Hasta el 27-jun-2021 se resolvían por balotas, que no se pueden reconstruir.
- **Oferta única.** Omitir la TRM y el método solo está escrito en licitación de transporte V4 y en
  infraestructura social. Los conceptos C-1778 de 2025 y C-1400 de 2026 lo confirman para un solo proponente
  habilitado.
- **Lo más importante: fuera de los documentos tipo, ninguna norma fija el método.** El Decreto 1082 de 2015,
  art. 2.2.1.1.2.2.2, deja la fórmula a cada pliego. En menor cuantía solo hubo documento tipo de transporte
  hasta el 16-feb-2026; los de infraestructura social de menor y mínima cuantía rigen desde esa fecha.
  - Entre los procesos usables, la familia UNSPSC 7214 es el 20 % en menor cuantía (825 de 4.063) y el 36 % en
    licitación (958 de 2.629). Es la que, por inferencia, corresponde a vías; el nombre de las familias está
    sin verificar.
  - En el resto, la regla es la del pliego de cada entidad, que muchas copian del documento tipo
    [inferencia; se confirma leyendo pliegos].

**Dos premisas del encargo que no se sostienen:**
- La Ley 2022 de 2020 modificó el art. 4 de la Ley 1882 de 2018, que es el que añade el parágrafo 7 al
  art. 2 de la Ley 1150 de 2007. No modificó la Ley 1150 directamente.
- El concepto C-982 de 2025 trata la regla de las 3:00 p. m. y los precios artificialmente bajos. No habla de
  la oferta única.

**Sin verificar:** la fecha de la Resolución 116 de 2020, el contenido de la Resolución 142 de 2020 (PDF
escaneado), las subversiones intermedias de agua y de infraestructura social, y el Decreto 1082 de 2015
cotejado en SUIN-Juriscol o Función Pública. Los dos sitios fallaron desde esta sesión: «curl: (60) SSL
certificate problem: unable to get local issuer certificate» y «HTTP 503 Service Unavailable».

## 7. Cómo se comprobaron estas cifras

- **Verificador independiente** (subagente que solo vio los datos crudos y una especificación escrita, sin el
  código). Recalculó la tabla en Python (`tools/analisis/verificador/`).
  - Primera comparación: 26 celdas distintas de 126. Destapó un error de `fase0.js` en la columna (a): también
    descontaba los procesos con lo adjudicado a más del 1 % de la oferta del ganador. Con eso, (a) salía entre
    2 y 17 puntos más baja según el año y la modalidad. Corregido.
  - Después: 5 celdas distintas de 144, explicadas por 6 procesos.
    - Dos están adjudicados por encima del precio base: la especificación omitía esa regla.
    - Dos tienen ofertas que difieren en 1 centavo o en 10 pesos, y se leen «sin competencia de precio».
    - Dos tienen la misma unión temporal escrita «U.T. X» y «UT X». La base las cuenta como dos oferentes y el
      verificador, como una (lote). Cuál es la cierta está sin verificar; afecta a 2 licitaciones de 2021.
- **Comprobaciones en vivo.**
  - El hueco de 2022 (3 procesos con count 0 en las dos bases).
  - `jbjy-vk9h` con 1.000 filas.
  - Las vistas anuales vacías.
  - Todas las llaves de cruce, con una muestra real cada una:
    - las ofertas y los contratos casan con el portafolio (`CO1.BDOS…`);
    - los proponentes de `hgi6-6wh3`, con la fase (`CO1.REQ…`).
- **Auditor adversarial.** Ver la sección 8.

## 8. Lo que encontró el auditor adversarial

Lo hizo un subagente que intentó tumbar cada cifra, con una reproducción ejecutada por hallazgo. La sesión
principal volvió a reproducir los hallazgos 1 y 2. Van ordenados por cuánto mueven las cifras.

| # | Hallazgo | Veredicto | Efecto medido |
|---|---|---|---|
| 1 | «Varios precios base = lotes» aparta presupuestos que se **ajustaron entre fases**. Ejemplo: CO1.BDOS.4866609, $1.488.813.904 en observaciones y $1.491.889.110 en ofertas, 0 lotes y un solo adjudicatario. Son 390 de 508 licitaciones y 274 de 291 menores cuantías. | Confirmado | Licitación: usables +199. Menor cuantía: +138. |
| 2 | «Un oferente con dos valores = lote» aparta **ofertas registradas dos veces**. Ejemplo: CONSORCIO MTR en CO1.BDOS.7853548, con CO1.RPL.4782370 ($15.716.097.925) y CO1.RPL.4792463 ($15.927.000.000) el mismo día. Saca justo los procesos de más competencia: mediana de 52 ofertas, frente a 14 en los incluidos. | Confirmado | Licitación: usables +276 (+10,5 %). |
| 3 | «Por encima del precio base» sin tolerancia. p6dx no trae centavos en el precio base, y 1.620 ofertas lo pasan por menos de 1 peso. En 821 de ellas, la oferta es justo lo adjudicado. | Confirmado | Ganador emparejado (c) +653. Usables +59. |
| 4 | El adjudicatario sale con otro nombre en p6dx (un miembro del consorcio), pero lo adjudicado coincide al peso con una sola oferta (191 procesos). | Dudoso: no se puede cruzar con los contratos | (c) +191 |
| 5 | En 328 procesos, lo adjudicado es el precio base: p6dx anota el presupuesto como valor adjudicado, y hoy salen como «inconsistencia». | Dudoso | Hasta +328 usables, si se aceptan |
| 6 | La frase «`jbjy` no toca (a)–(d)» era falsa. | Confirmado, corregido | Techo de (b) y (c): +52 |
| 7 | Los conteos de calidad por año eran grupos de la consulta, no ofertas: el código de SECOP cambia dentro de una misma oferta (1.039.658 grupos para 215.375 combinaciones de oferente y valor). | Confirmado, etiqueta corregida | Ninguno sobre (a)–(d) |
| 8 | 820 procesos «Seleccionado» sin adjudicar. | Dudoso | Fuera de la tabla, alrededor del 4 % en licitación |
| 9 | El (d) bajo de licitación es un error de la regla. | No se sostiene: son consorcios sin NIT | Ninguno |
| 10-11 | El hueco de 2022 o los faltantes vienen de la descarga. | No se sostiene. El hueco también está en `hgi6-6wh3`; y en 30 de 30 procesos el conteo en vivo coincide. | Ninguno |
| 12 | El universo por tipo «Obra» deja fuera obra real (98 portafolios de «prestación de servicios», como el mantenimiento de vías del INVIAS, CO1.BDOS.5230611). | Dudoso | Alrededor del 2 % |

**Por qué no se corrigieron aquí los hallazgos 1 a 5.** Las reglas están en `scripts/base_obra/limpieza.js` y
`fila.js`. De ellas sale también el corte de la alerta de precio bajo que usa la aplicación
(`TEMERARIO_POR_MODALIDAD` en `lib/apu/piso_techo.js`), así que cambiarlas mueve una cifra que decide
dinero y pide el visto bueno del dueño. Hay además una razón técnica: en el hallazgo 2 falta decidir cuál de
las dos ofertas cuenta (al CONSORCIO MTR le adjudicaron la primera, según el auditor). Eso se lee del
identificador de la oferta, que la consulta agrupada de hoy no trae.

## 9. CHECKPOINT C1: qué nivel de afirmación permiten estos datos

**Resumen (10 puntos):**
1. Las ofertas, oferente por oferente, existen de 2020 a 2026, salvo el hueco de sep-2022 a feb-2023.
2. Hay 2.619 licitaciones y 4.052 menores cuantías con 3 o más ofertas, ganador emparejado y competencia de
   precio. Es un piso: tres reglas de la base apartan procesos buenos (sección 8).
3. No existe en ninguna base quién quedó habilitado, y las fórmulas solo se aplican a las ofertas hábiles.
4. La regla del precio se conoce de antemano solo donde rigió un documento tipo. En menor cuantía, hasta feb-2026,
   eso es transporte: cerca del 20 % de los usables [inferencia por la familia UNSPSC 7214].
5. El 17-oct, con 4 métodos fijos y datos de 2024-2026, el ganador quedó primero con algún método en ~57 % (menor
   cuantía) y ~39 % (licitación).
6. **Nivel 1, sí y hoy.** Una banda histórica de a cuánto se adjudica, por modalidad y año, con cobertura medida:
   (a) cubre más del 99 % y cada año tiene al menos 128 usables.
7. **Nivel 2, no demostrado.** Que haya ofertas por oferente no basta: la probabilidad calibrada exige que el motor
   reproduzca al ganador, y la medición previa dice que no.
8. **Nivel 3.** Capturar el informe de evaluación del traslado de cada proceso, con habilitados y puntajes. Se probó
   a mano en 5 procesos (`detekta-lector/muestra/fichas_A-E`). Se suma el registro propio de «presentado / ganado /
   perdido» (`docs/VALIDACION_MODELOS.md` § 2).
9. Decisión que se pide: si se hace la Fase 1, con qué alcance (opciones abajo), y si las reglas de los
   hallazgos 1 a 3 se corrigen en la base antes de medir. Corregirlas mueve también la tabla de la alerta de
   precio bajo, que el vigía mensual avisaría.
10. Los umbrales de abajo se propusieron conociendo el resultado del 17-oct: **no son ciegos**.

**Opciones:**

| Opción | Qué se gana | Qué cuesta |
|---|---|---|
| **A. Fase 1 con la regla de cada versión** | Se sabe, con datos de 2020-2026, si el motor pasa del 57 % y del 39 % cuando cada proceso usa la versión de su fecha de aviso (incluidos los 2 métodos de 2020). Se mide en los dos escenarios y contra B0. | Una sesión. Puede confirmar que no alcanza, y ese también es un resultado válido. |
| **B. Directo al Nivel 3** | Diseño de la captura del informe de evaluación y de la muestra mínima por entidad: ataca la causa (la habilitación) y no el síntoma. | No re-mide el motor. La captura necesita leer documentos de SECOP II, que hoy responde 403 desde las sesiones (20-oct-2026). |
| **C. Quedarse en el Nivel 1** | La banda histórica puede ir a la aplicación en un encargo aparte. | No dice nada de la probabilidad de ganar. |

**Umbrales propuestos para confirmar:**
- **C2 (motor).** En los procesos con versión verificada y 3 o más ofertas, el motor con el método de la TRM
  reproduce al ganador (primero y solo) en el 70 % o más. Además le gana a B0 («gana la más baja») por 10 puntos
  o más, con un IC95 por remuestreo con semilla fija que no cruce 0, y con al menos 200 procesos por modalidad.
  Si no se cumple, se pasa al Nivel 3.
- **Fase 2 (calibración, si llega).** Entrenar hasta 2025 y probar en 2026. Error de calibración de 5 puntos o
  menos. Brier con una mejora de 0,10 o más frente a la tasa base 1/n. Al menos 300 procesos de prueba por modalidad.
- **Nivel 1 (banda).** El 80 % o más de los adjudicados con valor y presupuesto, y al menos 30 usables por
  modalidad y año. Hoy se cumple.

**Límites declarados:**
- La habilitación no se observa.
- Las fechas de la TRM (audiencia, traslado) se estiman, porque no se publican.
- El contrafactual de una oferta propia supone que los rivales no reaccionan.
