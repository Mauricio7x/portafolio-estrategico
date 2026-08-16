# Probabilidad de ganar — auditoría de la fórmula vigente y propuesta de mejora

> Documento de **análisis y propuesta**, con su plan por fases. Se escribió antes de tocar el
> código; **dos de sus pasos ya están implementados** — ver el bloque de ESTADO justo debajo.
> Los §1-§7 son el DIAGNÓSTICO tal como se levantó y se leen en pasado: dicen por qué se hizo cada
> cosa, no cómo está el código hoy.
>
> Convenciones de origen, como en `docs/ATRACTIVIDAD.md`:
> **[CÓD]** verificado ejecutando el código real de este repositorio · **[SIM]** simulación con
> supuestos declarados y semilla fija · **[DOC]** documentado y decidido en `CLAUDE.md` /
> `README.md` · **[NM]** no medido — nadie lo ha comprobado todavía.
>
> Este entorno **no alcanza Redis de producción ni `datos.gov.co`** (allowlist del proxy). Ninguna
> cifra de aquí es una medición del corpus real, y las que provienen de simulación lo dicen.

> ## ESTADO DE IMPLEMENTACIÓN (ago 2026 · actualizado el 16-ago)
>
> El documento se escribió como propuesta y **la Fase A está en el código salvo A7**. Se marca aquí
> arriba porque un plan que no dice qué parte ya se hizo se lee mal en las dos direcciones.
>
> | | Paso | Estado |
> |---|---|---|
> | **A1** | Retirar el ajuste por tertil de competencia | ✅ hecho |
> | **A1b** | Suavizar la baja a una rampa continua (mitad barata de A4) | ✅ hecho, y **superado por A4** (la rampa ya no existe) |
> | **A2** ✅ | Publicar `μ`/`τ̂²`/`m` en la meta y `rivales_estimados`/`peso_datos`/`rivales_desv` por entidad | ✅ **hecho** (`lib/indice_competencia`: `estimarEncogimiento`, `encogerEntidad`; meta `encogimiento`; también `por_anio` por entidad, la mitad barata de B2) |
> | **A3** ✅ | Encogimiento: `trazaP` usa `rivales_estimados` | ✅ **hecho** — el acantilado de los 5 procesos se acabó; `fuente:"entidad"` + `encogido:true` + `peso_datos` |
> | **A4** ✅ | Sustituir `f_baja` por `f_precio = mult(min(b_max, b_mkt))` con la curva de rentabilidad | ✅ **hecho** — `factorPrecio` llama a `lib/apu/rentabilidad.multiplicadorPrecio` (curva extraída de `pGanarPorPrecio`; una sola). **Sin `b_max` declarada el factor es 1** (neutro): el centro del mercado ya no penaliza ni premia. `b_max` entra por `?baja_max=` en el listado (solo con token) |
> | **A5** ✅ | Separar `p` de `p_sin_precio`; el editor consume la segunda | ✅ **hecho** — `estimarPDetalle.p_sin_precio`; `lib/handlers/apu/editor.js` pasa `p_sin_precio` como `p_base` a `desdePresupuesto` y al optimizador |
> | **A6** ✅ | Banda `p_lo`/`p_hi` + `ordenar_por=ve_conservador` como opción | ✅ **hecho** — banda del 90 % (±1,645·σ de la posterior) en `estimarPDetalle`, en el desglose (`banda_90`) y en el tooltip; `ve_conservador` ordena por `cuantía × p_lo` (opción, no default) |
> | A7 | Medir `f_colisión` sobre el histórico (§9.3) | ⬜ pendiente |
> | B2 | Antigüedad por celda | 🟡 el acumulador ya guarda `por_anio` {año: {n, suma}} y el detalle de competencia (`/api/inteligencia?op=entidad`) publica `reparto_por_anio`; **todavía no segmenta** el estimador |
>
> **Cuatro desviaciones respecto de la propuesta, deliberadas y medidas:**
> 1. **`m = max(μ, σ̂²_dentro)/τ̂²`, no `μ/τ̂²`.** El doc asume Poisson (varianza dentro = media); los
>    conteos reales de oferentes están sobredispersos y asumir menos ruido del observado sobrepesa el
>    dato propio de una entidad de dos procesos. Se toma el mayor: nunca menos ruido del que hay.
> 2. **La heterogeneidad se estima sobre las entidades con base (n ≥ 5)** y el encogimiento se aplica a
>    todas. Estimarla con las de 1-4 procesos fue el primer intento y la suite lo cazó: el ruido
>    muestral de muchas entidades pequeñas (s²/n con n = 2) superaba la varianza entre entidades y
>    `τ̂²` salía ≤ 0 aunque las grandes difirieran de sobra (3, 8 y 18 oferentes).
> 3. **El prior es el GLOBAL del índice (μ), no el departamento** (B7 sigue pendiente): `r̂` se calcula al
>    construir el índice y ahí no está el promedio departamental, que se deriva al servir sobre el corpus
>    ACTIVO. El departamento sigue siendo el respaldo para entidades ausentes del índice.
> 4. **`b̂_mkt` no se encoge hacia `b_ref` de la modalidad** (§3.3): sin `b_max` el factor es 1 y el
>    encogimiento no cambiaría nada; con `b_max` se usa la mediana de la celda tal como la publica
>    `bajaDeMercado` (mínimo 5, ya refinada por modalidad) y su IQR como dispersión. Y **`b_max` no
>    sale todavía del APU del proceso automáticamente**: entra declarada por `?baja_max=`; enlazar
>    `precioPiso().baja_maxima_admisible_pct` de un borrador guardado al listado es el siguiente paso.
> 5. **El tope `min(b_max, mediana)` es deliberado y ASIMÉTRICO respecto del editor** (lo señaló la
>    revisión adversaria): `b_max` es hasta dónde el dueño PUEDE bajar, no lo que va a ofertar; la
>    tarjeta asume que, si puede, ofertará en el centro (jugada dominante en 3 de 4 métodos) y no
>    premia una baja más agresiva que nadie decidió. El editor de APU conoce la baja REAL ofertada y
>    la evalúa sin tope, en las dos direcciones, con la MISMA curva. Y con `τ̂² ≤ 0` NO hay banda
>    (`rivales_desv: null`): una banda de ancho cero sería certeza absoluta justo donde menos
>    información individualizada hay.
>
> **Compatibilidad, verificada con prueba:** un hash de `indice:competencia` anterior a A2 (sin
> `rivales_estimados`) hace que `competenciaDe` y `trazaP` respondan **exactamente como antes** —
> desplegar no exige reconstruir; reconstruir enciende el encogimiento y la banda
> (`/api/procesos?op=historico&reconstruir_indice=true`). Lo que SÍ cambia al desplegar, sin
> reconstruir, es la retirada de la rampa: medido sobre el listado real del 16-ago-2026 (775 filas de
> Helder, 682 de Génesis), `p` media pasa de 0,254 a 0,240 (−5,5 %: el ×1,10 alcanzaba al 69 % de las
> filas y el ×0,85 al 16 %), el orden por VE se conserva (Spearman 0,998 / 0,997; top-20 20/20 y 17/20)
> y ningún proceso se mueve más de 0,066 en `p`.
>
> **En la suite (corpus sintético):** μ = 4,42, m = 0,54; una entidad con 4 procesos y promedio 2 pasa
> de p = 0,167 (respaldo) a 0,304, contra 0,309 con 5 procesos — el salto ×2,60 quedó en 1,5 %.
>
> **En producción (16-ago-2026, índice reconstruido):** μ = 4,18 · τ̂² = 9,51 · σ̂²_dentro = 62,5 ·
> **m = 6,57** (2 062 entidades con base, 104 702 procesos). Con `μ/τ̂²` literal m sería 0,44 — la
> desviación 1 no fue cosmética. Impacto sobre el listado real: `p` media 0,254 → 0,227 (Helder) y
> 0,266 → 0,237 (Génesis), Spearman del orden por VE 0,995/0,994, banda mediana 3 pp (p90 9 pp). Los
> mayores cambios son entidades de 1-5 procesos con promedio 1 que antes daban p = 0,50 y ahora 0,26.

---

## 0. Dos correcciones al encargo, antes de proponer nada

### 0.1 La baja de mercado YA está en la fórmula. Lo que falta no es incorporarla

El encargo describe la fórmula vigente como «`P_base` + ajustes por competencia, prórroga y
colisión» y presenta la baja como un dato que «esta fórmula no aprovecha». **No era así ya en ago
2026**: `lib/probabilidad.js` definía `FACTOR_BAJA_ALTA = 0.85` y `FACTOR_BAJA_BAJA = 1.10` con
cortes en 5 % y 2 %, y `api/oportunidades.js:408-410` le pasa el objeto `baja` en cada evaluación.
Eran **seis** ajustes, no cuatro, y la cabecera del módulo los enumeraba. (Hoy son **tres**: se
retiró el tertil de competencia y los dos escalones de la baja se fundieron en una rampa.)

Esto cambia el encargo de sitio, y para mejor: el problema no es que falte la señal, es **cómo
entra** — con dos escalones sobre una mediana ruidosa, y con una semántica que se contradice con
`lib/apu/rentabilidad`. Se demuestra en §2.5.

Lo que sí falta del todo, y es exactamente lo que pide el encargo, es **la dispersión, el tamaño de
muestra y la antigüedad**. Ninguno de los tres entra hoy en ninguna parte [CÓD].

### 0.2 Los ~11 667 procesos con par completo **no son un conjunto de validación**

Esa cifra es `procesos_con_par_completo` de `lib/columnas_historicas.js:168`: procesos del corpus
**histórico** que traen `precio_base` y `valor_total_adjudicacion` en la MISMA fila. Aplicarles la
fórmula nueva no valida nada, porque **no existe la etiqueta**: el corpus dice quién ganó, no a qué
procesos se presentó el dueño. Sin denominador no hay tasa de victoria, y sin tasa de victoria
`P(ganar)` no es falsable. Es la misma conclusión que `docs/ATRACTIVIDAD.md` R3 [DOC].

Lo que esos 11 667 sí permiten —y es mucho— son **dos calibraciones reales**:

| Qué se puede calibrar | Contra qué dato | Estado |
|---|---|---|
| Los **rivales esperados** de una entidad | el nº de oferentes realmente observado en sus procesos posteriores | 🟢 medible hoy, sin extraer nada |
| La **baja esperada** de una celda | la baja realmente observada en sus procesos posteriores | 🟢 medible hoy |
| El efecto de la **colisión de cierres** | oferentes de procesos que colisionan vs. los que no | 🟢 medible hoy (§9.3) |
| El efecto de la **prórroga** | oferentes de procesos prorrogados vs. no prorrogados | 🔴 el flag no se persiste al histórico (§8, Fase B) |
| `P(ganar)` **en sí misma** | victorias propias | 🔴 imposible sin registro de decisiones del dueño |

**La consecuencia de diseño es la tesis de todo este documento**: si solo dos piezas de la fórmula
son calibrables, mejorar la fórmula significa **reducir el número de constantes no calibrables, no
añadir más**. Eran nueve al levantar la auditoría; A1 se llevó dos por delante y quedan siete. La
propuesta completa las deja en dos, y las dos con plan de medición.

---

## 1. La fórmula que había hasta ago 2026, explicada

> Es el punto de partida de la auditoría, no el estado del código. Los pasos A1 y A1b ya la
> cambiaron: hoy `f_comp` no existe y `f_baja` es una rampa continua.

```
rivales r ←  cascada:  promedio de oferentes de LA ENTIDAD (índice, ≥5 procesos)
                    →  promedio ponderado de SU DEPARTAMENTO
                    →  PROMEDIO_CONSERVADOR = 5

P = clamp( 1/(1+r) · f_comp · f_prórroga · f_colisión · f_baja , 0,01 , 0,95 )
```

| Factor | Valor | Cuándo | Origen del dato |
|---|---|---|---|
| `1/(1+r)` | — | siempre | reparto uniforme entre `r` rivales y yo |
| `f_comp` | **×1,30** / ×1,00 / **×0,70** | tertil «baja» / «media» / «alta» de la entidad | `indice:competencia` |
| `f_prórroga` | **×1,20** | el cierre se movió hacia adelante entre versiones | `_cierre_prorrogado`, derivado en el dedup |
| `f_colisión` | **×1,15** | la entidad cierra ≥2 procesos el mismo día | corpus activo, en memoria |
| `f_baja` | **×0,85** si mediana > 5 % · **×1,10** si < 2 % | la entidad descuenta mucho / poco | `indice:baja` |

Nueve constantes libres (`5`, `1,30`, `0,70`, `1,20`, `1,15`, `0,85`, `1,10`, `5 %`, `2 %`),
**ninguna calibrada** — el propio módulo lo declara: «son SUPUESTOS declarados, no coeficientes
ajustados». Esa honestidad es correcta; el problema es la cantidad. Tras A1 y A1b quedan **siete**
(`1,30` y `0,70` desaparecieron); `0,85`, `1,10`, `2 %` y `5 %` siguen vivos como extremos y codos
de la rampa, y **suavizar no es calibrar**.

---

## 2. Auditoría, factor por factor

Todo lo de esta sección está **ejecutado contra el código del repositorio** [CÓD], no razonado.

### 2.1 · `rivales` — la cascada está bien; el CORTE EN 5 es el defecto más caro

`competenciaDe` anula toda cifra derivada por debajo de `MIN_PROCESOS = 5`, así que la entidad cae
al respaldo. El resultado es un salto de acantilado:

| procesos de la entidad | promedio real | rivales usados | fuente | **p** |
|---|---|---|---|---|
| 3 | 2,0 | 5 | conservador | **0,1667** |
| 4 | 2,0 | 5 | conservador | **0,1667** |
| 5 | 2,0 | 2 | entidad | **0,4333** |
| 6 | 2,0 | 2 | entidad | **0,4333** |

**Un proceso más en el histórico multiplica la probabilidad por 2,60** [CÓD], sin que haya cambiado
nada del mercado. La regla del mínimo es correcta *para publicar un promedio* —es la lección de
«18,2 oferentes sin base» [DOC]— pero se está usando además como **estimador**, y ahí un umbral
duro es la peor opción posible: tira a la basura la información de 3 procesos y la sustituye por
una constante inventada.

Y no es un caso raro: en la simulación, **22 % de los procesos servidos salen con
`fuente: "conservador"`** [SIM] — uno de cada cinco.

### 2.2 · `f_comp` (×1,30 / ×0,70) — DOBLE CONTEO, y con cortes que dependen de terceros

`nivel` es el tertil del **mismo promedio** que ya está dentro de `rivales`. No es una segunda
señal: es la primera, aplicada dos veces.

| rivales | `1/(1+r)` | nivel | factor | p final |
|---|---|---|---|---|
| 2 | 0,3333 | baja | ×1,30 | 0,4333 |
| 3 | 0,2500 | baja | ×1,30 | 0,3250 |
| 4 | 0,2000 | media | ×1,00 | 0,2000 |
| 8 | 0,1111 | alta | ×0,70 | 0,0778 |

Tres consecuencias verificadas:

1. **Salto en el corte**: `r = 3,0` da `p = 0,3250` y `r = 3,5` da `p = 0,2222` — **−32 % de
   probabilidad por medio rival** [CÓD].
2. **La misma cantidad de rivales da dos probabilidades distintas según de dónde venga el dato**:
   2 rivales vía entidad → `0,4333`; 2 rivales vía departamento → `0,3333`, porque el respaldo no
   trae `nivel` y no recibe el ×1,30. **×1,30 de diferencia por el origen, no por el mercado** [CÓD].
3. **Los tertiles son RELATIVOS.** La misma entidad con los mismos 3,4 oferentes es «media»
   (`p = 0,2273`) en un mercado disperso y «baja» (`p = 0,2955`) en uno apretado [CÓD]. **La
   probabilidad de un proceso depende de entidades que no tienen nada que ver con él**, y cambia
   sola cada vez que se reconstruye el índice.

El efecto neto está medido: `f_comp` **no añade información, añade dispersión**. En la simulación
la desviación típica de `p` con `f_comp` es 0,121 contra 0,104 de la probabilidad verdadera — la
fórmula está **más segura de sí misma que la realidad** [SIM].

### 2.3 · `f_prórroga` (×1,20) — el mejor motivado de todos, y hoy no calibrable

Es la única señal de competencia **observable antes del cierre** (el contador de oferentes es
ex-post y vale 0 en todo proceso abierto). El mecanismo causal es direccional y creíble: una
entidad mueve el cierre casi siempre porque no llegaron ofertas.

**Se conserva tal cual.** Su problema no es el diseño sino que el flag se deriva en la lectura del
corpus **activo** (`lib/almacen.js:276-280`) y `repartirDelta` **no lo estampa** en la proyección
histórica [CÓD] — así que no hay forma de comprobar a posteriori si un proceso prorrogado acabó con
menos oferentes. Es una línea de código y ~6 meses de espera (§8, Fase B).

### 2.4 · `f_colisión` (×1,15) — bien motivado y **calibrable HOY**

Mismo mecanismo causal: los rivales son firmas de 1 a 20 personas con el mismo cuello de botella de
ingeniería; si la entidad cierra cuatro procesos el jueves, se reparten.

A diferencia de la prórroga, **esta sí se puede medir con lo que ya está bajado**: el histórico
conserva las columnas de fecha de cierre (`lib/proyeccion.js:72-74` las preserva por regex) y el nº
de oferentes. Agrupar por `(entidad, día de cierre)` y comparar el promedio de oferentes de los
procesos que colisionan contra los que no es una consulta sobre el corpus existente. **Se conserva,
con la calibración como tarea de Fase A** (§9.3).

### 2.5 · `f_baja` (×0,85 / ×1,10) — tres defectos, y el tercero es grave

**(a) Escalones sobre una mediana ruidosa.** La mediana se publica con resolución de 1 punto
porcentual (histograma de enteros [DOC]), y los cortes son duros:

| baja mediana | p | |
|---|---|---|
| 1,9 % | 0,2750 | |
| 2,0 % | 0,2500 | **−9,1 % por 0,1 punto** [CÓD] |
| 4,9 % | 0,2500 | |
| 5,1 % | 0,2125 | **−15,0 % por 0,2 puntos** [CÓD] |

**(b) Los cortes son ABSOLUTOS sobre una magnitud cuyo centro depende de la modalidad.** El propio
índice documenta que la mínima cuantía se adjudica una y otra vez por el presupuesto oficial y
arrastra la mediana global a 0 % [DOC]. Un 4 % de baja es **mucho** en mínima cuantía y **poco** en
licitación pública, y los cortes 2 %/5 % no lo distinguen. El índice **ya publica** la referencia
por modalidad (`indice:baja:meta.por_modalidad`) y la fórmula no la mira.

**(c) El defecto grave: penaliza estar en el centro del mercado, y cuenta el precio dos veces.**

`api/apu/[accion].js:352` pasa `estimarPDetalle(...).p` como `p_base` a `pGanarPorPrecio`, que
vuelve a multiplicar por el efecto del precio. Verificado [CÓD]:

```
entidad con baja mediana 8 % → p_base = 0,2125   (base 0,25 × 0,85)
el dueño oferta EXACTAMENTE en la mediana (8 %) → multiplicador 1 → p = 0,2125
```

Pero la doctrina del propio módulo dice que **ofertar en el centro devuelve exactamente la
probabilidad base** —hay una prueba que lo exige (`tests/e2e.js:7031`)— y aquí el centro cuesta
**15 % de probabilidad**. Peor, en el listado:

```
dos entidades con la MISMA competencia, cada oferente en SU centro de mercado:
    entidad que descuenta 8 %  →  p = 0,2125
    entidad que descuenta 3 %  →  p = 0,2500
```

Eso es **falso como probabilidad de ganar**. Si estoy en el centro de mi mercado, mi posición
frente a los rivales es idéntica en los dos casos; lo que cambia es **cuánto margen me queda**, no
cuántas veces gano. El ×0,85 es una penalización de MARGEN disfrazada de probabilidad — exactamente
el error de categoría que este repositorio rechaza en todas partes («compensar aquí es un error de
categoría», `api/oportunidades.js:55`). La cabecera intenta salvarlo diciendo que la lectura es
«P(ganar a un precio que valga la pena)», pero entonces **falta la mitad de la definición**: qué
precio vale la pena depende de MI estructura de costos, que la fórmula no mira.

**El ×1,10 se retira sin sustituto.** «Se puede ofertar cerca del oficial» es una buena noticia
para el margen y **no** una probabilidad más alta de ganar.

### 2.6 · `clamp` y apilamiento

Cuando se escribió esta auditoría, los cuatro factores al alza se multiplicaban:
`1,30 × 1,20 × 1,10 × 1,15 = ×1,9734`, que sobre una base de 0,50 daba 0,9867 y se recortaba a
0,95 [CÓD]. Nada garantiza que el producto de cuatro supuestos independientes tenga sentido; el
`clamp` es una red, no un diseño. Se conserva.

**Tras A1 el apilamiento es `1,20 × 1,10 × 1,15 = ×1,518`** [CÓD], que sobre esa misma base de 0,50
da 0,759 y **ya no toca el techo**: el `clamp` solo muerde desde una base ≥ 0,6258, o sea con menos
de 0,6 rivales esperados — que el índice no puede producir, porque solo cuenta procesos con al
menos un oferente. Es decir: **hoy el techo de 0,95 es red muerta**, y eso es una mejora silenciosa
(un recorte activo significaba que la cuenta se salía de rango por acumulación de supuestos).

### Veredicto resumido

| Factor | ¿Justificado con los datos? | Veredicto |
|---|---|---|
| cascada de rivales | sí, salvo el corte duro en 5 | **arreglar** — encogimiento continuo |
| `f_comp` ×1,30/×0,70 | **no** — es el mismo dato dos veces, con cortes relativos | ✅ **retirado** (A1, ago 2026) |
| `f_prórroga` ×1,20 | mecanismo sólido, magnitud no medida | **conservar** + plan de medición (Fase B) |
| `f_colisión` ×1,15 | mecanismo sólido, magnitud no medida | **conservar** + **medir ya** (Fase A) |
| `f_baja` ×0,85/×1,10 | **no** — escalones, cortes absolutos, penaliza el centro, doble cuenta | 🟡 **escalones eliminados** (A1b); penalizar el centro y la doble cuenta **siguen vivos** → A4/A5 |
| `clamp` | red de seguridad, no modelo | conservar |

---

## 3. La fórmula propuesta

### 3.0 · Principio rector

> **Cada cambio tiene que quitar una constante no calibrable, o convertirla en algo que se pueda
> medir o que el dueño pueda responder.** Añadir factores a una fórmula que nadie puede validar la
> hace parecer más precisa y la deja igual de ciega.

### 3.1 · Paso 1 — Rivales esperados con ENCOGIMIENTO, no con umbral

```
n_e   = procesos contables de la entidad (los que ya cuenta el índice)
r̄_e   = promedio de oferentes de esos procesos
μ     = prior en cascada:  departamento (si tiene base) → GLOBAL → PROMEDIO_CONSERVADOR = 5
m     = fuerza del prior, en «procesos equivalentes»   ← SE ESTIMA, no se inventa

w  = n_e / (n_e + m)                      ← peso de los datos propios ∈ [0,1)
r̂  = w · r̄_e + (1 − w) · μ                ← media posterior gamma-Poisson
```

`m` sale del **método de los momentos** sobre el propio índice, con los acumuladores que ya existen:

```
τ̂²  = s²(promedios entre entidades)  −  ruido muestral esperado
m   = μ / τ̂²
```

Tres propiedades que ninguna versión con umbral tiene:

- **Continuidad.** No hay salto en `n_e = 5`. Una entidad con 4 procesos usa sus 4 procesos,
  pesados por lo que valen.
- **Degradación correcta.** Con `n_e = 0`, `w = 0` y `r̂ = μ`: exactamente el comportamiento de hoy.
- **Prueba de existencia incorporada.** Si `τ̂² ≤ 0`, la varianza entre entidades no supera al ruido
  de muestreo: **la dimensión «entidad» no existe**, `m = ∞`, todo se encoge al prior y la app
  tiene que decirlo. Verificado en simulación: con `τ² = 0` real, `τ̂² = −0,03` y el estimador se
  comporta como debe [SIM]. Es la prueba de existencia que `docs/ATRACTIVIDAD.md` §3 pedía, ahora
  calculable sin un dato nuevo.

**Dónde vive el cálculo, y por qué importa.** `r̂` y `w` se calculan **al CONSTRUIR el índice** y se
publican como campos propios (`rivales_estimados`, `peso_datos`). **`promedio` sigue viajando en
`null` por debajo del mínimo y el badge sigue en ⚪**: son dos objetos distintos para dos preguntas
distintas —«¿cuál es el promedio medido de esta entidad?» frente a «¿cuántos rivales espero?»— y
mezclarlos resucitaría el defecto de «18,2 oferentes sin base». La misma separación que
`granularidad_utilizada` / `modalidad_utilizada` en el índice de baja [DOC].

**Compatibilidad, que es lo que de verdad puede romperse.** `indice:competencia` **no se purga
nunca**. Un hash escrito por la versión actual no trae `rivales_estimados` ni `peso_datos`, y
`indice:competencia:meta` no trae `μ` ni `m`. Sin esos campos, `competenciaDe` **responde
exactamente como hoy**. Desplegar no exige reconstruir nada; reconstruir enciende la mejora. Misma
lección que `claveLegado` y que `por_modalidad` [DOC].

### 3.2 · Paso 2 — Probabilidad base

```
P_base = 1 / (1 + r̂)
```

Sin cambios en Fase A. `docs/ATRACTIVIDAD.md` propone la forma cerrada con binomial negativa y
tiene razón, pero el parámetro de dispersión `k` no está medido y fingirlo añade precisión falsa
[DOC]. **Pasa a Fase B con una novedad**: el acumulador del índice ya guarda un **histograma de
oferentes por entidad** (`lib/indice_competencia.js:243`), así que `k` **es estimable** en cuanto
alguien lo publique. La magnitud del error que se está aceptando está medida (§5.5): entre 3 % y
27 % de subestimación de `P`, y **siempre en la misma dirección**.

### 3.3 · Paso 3 — El factor de precio (A4, pendiente)

> A1b ya sustituyó los dos escalones por una rampa continua, que es la mitad barata de este paso.
> Lo que sigue pendiente es la otra mitad: **dejar de penalizar el centro del mercado**.

La corrección conceptual: **lo que mueve la probabilidad no es dónde está el centro del mercado,
sino a qué distancia de él puedo ofertar sin perder plata.**

```
b_mkt  = baja mediana de la celda (cascada entidad_familia → entidad → depto_familia,
                                   refinada por modalidad)              ← ya existe
n_b    = procesos de esa celda                                          ← ya existe
b_ref  = baja mediana GLOBAL de la misma modalidad                      ← ya existe en la meta
σ      = (P75 − P25) / 1,349 de la celda, con suelo                     ← ya existe

w_b    = n_b / (n_b + m_b)                     ← misma técnica que w, con su propio m_b
b̂_mkt  = w_b · b_mkt + (1 − w_b) · b_ref       ← encogido hacia el centro DE SU MODALIDAD
σ̂      = w_b · σ     + (1 − w_b) · σ_ref

b_max  = baja máxima que el dueño puede aceptar sin perder plata
         · si hay presupuesto APU del proceso → precioPiso().baja_maxima_admisible_pct  (CALCULADO)
         · si no                              → constante DECLARADA del dueño
         · si no está declarada                → b̂_mkt  ⇒  f_precio = 1  (neutro, no penaliza)

f_precio = mult( min(b_max, b̂_mkt) )
```

donde `mult()` es **la misma curva de mezcla que ya está implementada** en
`lib/apu/rentabilidad.pGanarPorPrecio` — 25 % «menor valor» + 75 % métodos centrales, normalizada a
1 en la mediana del mercado. **No se escribe una segunda teoría de cómo el precio afecta a la
probabilidad**: si hubiera dos, divergirían a la primera corrección aplicada a una sola, y serían
pesos. Es la lección de `total_procesos` / `procesos_contados`, aquí en pesos.

Qué resuelve, punto por punto:

- `b_max ≥ b̂_mkt` → **f = 1**. Puedo jugar en el centro: ninguna penalización. Desaparece el
  castigo por estar en el centro del mercado (§2.5c) y **desaparece la doble cuenta con el editor**.
- `b_max < b̂_mkt` → tengo que ofertar **por encima** del centro para no perder plata, y la curva
  dice cuánta probabilidad cuesta. Eso sí es probabilidad de ganar.
- **Aquí entra la dispersión que pide el encargo, y entra donde significa algo**: `σ̂` es la
  pendiente de la curva. Mercado apretado (IQR estrecho) → todos aterrizan en el mismo descuento →
  salirse cuesta caro. Mercado disperso → apartarse del centro cuesta poco. Un escalón fijo no
  puede representar eso.
- **Y entra la confianza**: `w_b` encoge tanto la mediana como la dispersión hacia la referencia de
  la modalidad. Una celda de 5 procesos apenas mueve la aguja; una de 200 la mueve entera.

**Requisito de integración, no negociable.** `estimarPDetalle` debe publicar **`p`** y
**`p_sin_precio`** por separado, y `/api/apu/rentabilidad` debe consumir `p_sin_precio` como su
`p_base`. Si consumiera `p`, el efecto del precio se aplicaría dos veces —que es el defecto que
existe hoy (§2.5c) — solo que en versión continua y por tanto más difícil de ver.

### 3.4 · Paso 4 — Las dos señales ex-ante, intactas

```
f_prórroga = 1,20 si el cierre se movió hacia adelante
f_colisión = 1,15 si la entidad cierra ≥2 procesos ese día
```

Se conservan con su valor actual **y con su plan de medición** (§9.3, §8-B). Cambiarles el número
hoy sería sustituir un supuesto declarado por otro supuesto declarado.

### 3.5 · Paso 5 — La banda, que hoy no existe

La posterior de `r̂` tiene varianza cerrada, así que la incertidumbre se publica en vez de esconderse:

```
Var(r̂) = (n_e·r̄_e + m·μ) / (n_e + m)²
p_lo = 1/(1 + r̂ + 1,645·√Var) · f_precio · …        p_hi = 1/(1 + r̂ − 1,645·√Var) · f_precio · …
```

Amplitud medida [SIM]: **±0,088** para una entidad de 1-4 procesos, **±0,051** para 5-9, **±0,016**
para 30+. Esa es la respuesta honesta a «diferenciar pocos datos de muchos datos»: no un
multiplicador, **una banda**.

Y habilita lo que `docs/ATRACTIVIDAD.md` recomendaba y hoy no se puede hacer: **ordenar por la cota
inferior**, de modo que la incertidumbre penalice en vez de premiar. Se propone como
`ordenar_por=ve_conservador`, **opción antes que default**, promovido con evidencia y no por
decreto — igual que se promovió el orden por atractividad [DOC].

### 3.6 · La fórmula completa

```
P = clamp( 1/(1 + r̂) · f_precio · f_prórroga · f_colisión ,  0,01 , 0,95 )

r̂        = w·r̄_e + (1−w)·μ            w = n_e/(n_e+m)        m = μ/τ̂²   (estimado)
f_precio = mult( min(b_max, b̂_mkt) )   con σ̂ del IQR encogido  (mult = lib/apu/rentabilidad)
```

| Variable | Qué es | De dónde sale | ¿Nueva? |
|---|---|---|---|
| `n_e`, `r̄_e` | conteo y promedio de oferentes de la entidad | `indice:competencia` (acumulador) | no |
| `μ` | prior: departamento → global → 5 | el global es **nuevo en la meta** | parcial |
| `τ̂²`, `m` | heterogeneidad entre entidades y fuerza del prior | **derivados al construir el índice** | sí |
| `w` | peso de los datos propios de la entidad | derivado | sí |
| `b_mkt`, `n_b`, `P25`, `P75` | baja de la celda, su muestra y su dispersión | `indice:baja` | no |
| `b_ref`, `σ_ref` | baja y dispersión globales **de la modalidad** | `indice:baja:meta.por_modalidad` | no (sin usar) |
| `b_max` | baja máxima que el dueño soporta | APU (`precioPiso`) o constante del dueño | sí |
| `mult()` | curva de precio | `lib/apu/rentabilidad.pGanarPorPrecio` | no (reutilizada) |

**Constantes libres no calibrables: de 9 a 2** (`f_prórroga`, `f_colisión`), y las dos con plan de
medición. A1 y A1b ya se llevaron `1,30` y `0,70`, así que hoy van **7**; `0,85`, `1,10`, `2 %` y
`5 %` siguen vivos como extremos y codos de la rampa. `m` y `m_b` se estiman de los datos; `b_max` se calcula del APU o lo declara el dueño;
los cortes 2 %/5 % y los factores 1,30/0,70/0,85/1,10 desaparecen.

### 3.7 · Qué se publica en `p_ganar_detalle`

Todo lo que hace falta para discutir la cifra sin abrir el código: `p`, `p_sin_precio`, `p_lo`,
`p_hi`, `rivales_esperados`, `peso_datos` (w), `fuente`, `prior_utilizado`, `m`, `f_precio`,
`b_max_utilizada` y su origen (`apu` | `declarada` | `neutra`), y la lista de ajustes con su motivo
—como ya hace hoy—. Una probabilidad sin su origen no se puede auditar ni discutir [DOC].

---

## 4. Justificación de cada factor nuevo

| Factor nuevo | Variable y origen | Por qué mejora la decisión (negocio) | Cómo se calibra |
|---|---|---|---|
| **Encogimiento de rivales** (`w`, `m`) | `n_e`, `r̄_e` del acumulador que ya existe; `m = μ/τ̂²` estimado al construir el índice | Hoy, 22 % de los procesos servidos usan «5 rivales» inventados aunque su entidad tenga 3 o 4 procesos observados, y un proceso más multiplica `p` por 2,6. El dueño decide dónde gasta la semana-hombre con esa cifra | **Backtest temporal** (§9.1): construir el índice con 2024, predecir el nº de oferentes de 2025, medir MAE y pendiente de calibración. Es medible **hoy** sobre los 11 667 |
| **Prueba de existencia** (`τ̂² ≤ 0`) | varianza entre entidades vs. ruido muestral | Si la entidad no discrimina, el orden vuelve a ser por tamaño de contrato y **el dueño tiene derecho a saberlo** antes de fiarse de una banda de competencia | Se autocalibra: es el resultado del propio estimador. Se publica en `indice:competencia:meta` |
| **Referencia de baja POR MODALIDAD** (`b_ref`) | `indice:baja:meta.por_modalidad` — ya construido, sin consumidor | Un 4 % de baja es mucho en mínima cuantía (mediana 0 %) y poco en licitación pública. Los cortes 2 %/5 % tratan igual dos mercados distintos, justo en los procesos grandes, que se ganan o pierden por precio | Contra la baja realmente observada por modalidad en el semestre siguiente (§9.2) |
| **Dispersión como pendiente** (`σ̂` del IQR) | `baja_p25`, `baja_p75` de la celda — ya publicados, sin consumidor | Apartarse del centro cuesta mucho donde todos aterrizan en el mismo descuento y poco donde el mercado está disperso. Es la diferencia entre «aquí puedo pelear con margen» y «aquí o entro al centro o no entro» | La curva ya está calibrada en su forma (`π = 0,25`, `n_ref = 6`, declarados). `σ̂` es un dato, no un parámetro |
| **Confianza como encogimiento** (`w_b`) | `procesos_contados` de la celda de baja | Una mediana de 5 procesos y una de 200 no pueden mover la decisión igual. Hoy mueven **exactamente igual**: 5 y 500 procesos dan la misma `p` [CÓD] | Sale del mismo estimador de momentos que `m` |
| **`b_max` del dueño / del APU** | `precioPiso().baja_maxima_admisible_pct` (calculado) o constante declarada | Convierte un parámetro no calibrable en **una pregunta que el dueño sí sabe responder** —la misma jugada que `N*` en `docs/ATRACTIVIDAD.md`—, y ata la probabilidad del listado a la estructura de costos real | Se **calcula** en cuanto hay presupuesto APU. Sin presupuesto es una declaración explícita, no un supuesto escondido |
| **Banda `p_lo`/`p_hi`** | varianza de la posterior | La incertidumbre deja de ser invisible. Hoy «5 rivales inventados» y «2,0 rivales medidos sobre 200 procesos» se pintan con la misma tipografía | No necesita calibración: es la varianza del propio estimador. Se **valida** con cobertura empírica en el backtest (¿cae el observado dentro de la banda el 90 % de las veces?) |

---

## 5. Impacto estimado

### 5.1 · Qué es esto y qué no es

**No es una medición del corpus real.** Es una simulación con supuestos declarados y semilla fija,
construida sobre el **código real del repositorio**: el índice se publica con
`indice_competencia.registroPublicado` + `cortesTertiles`, la `p` actual sale de
`probabilidad.estimarPDetalle` y el multiplicador de precio de `apu/rentabilidad.pGanarPorPrecio`.
Nada reimplementado. Población: 1 400 entidades, 3 000 procesos activos asignados **ponderando por
volumen de publicación**, `μ = 4,5`, `τ² = 6,0`, colas largas en `n_e` y cuantía. La probabilidad
«verdadera» de cada proceso es `1/(1+λ_e)` con el `λ` real de su entidad, que la simulación conoce
y la fórmula no.

### 5.2 · Distribución de `p` [SIM]

| | media | mediana | p10 | p90 | **sd** |
|---|---|---|---|---|---|
| PREVIA (hasta ago 2026) | 0,217 | 0,179 | 0,081 | 0,411 | **0,130** |
| PROPUESTA | 0,199 | 0,188 | 0,110 | 0,302 | **0,077** |
| VERDADERA | 0,211 | 0,188 | 0,110 | 0,341 | **0,099** |

**Respuesta directa a la pregunta del encargo**: la probabilidad sería **ligeramente más baja en
media** (0,217 → 0,199), **igual en mediana** (0,179 → 0,188, de hecho más cerca de la verdadera) y
claramente **MENOS dispersa** (sd 0,130 → 0,077). La fórmula actual **no es demasiado
conservadora: es demasiado segura de sí misma** — se dispersa más que la realidad (0,130 contra
0,099) y lo hace en la dirección equivocada, porque el ×1,30/×0,70 estira las colas de entidades
cuya posición ya estaba en el `1/(1+r)`.

Que la propuesta quede **por debajo** de la dispersión verdadera es el comportamiento correcto de
un estimador encogido: una media posterior siempre es menos dispersa que la verdad. Por eso la
dispersión se publica **como banda** (§3.5) y no se mete en el punto.

### 5.3 · Error contra la probabilidad verdadera [SIM]

| | MAE | RMSE | sesgo |
|---|---|---|---|
| PREVIA (hasta ago 2026) | 0,0571 | 0,0830 | +0,0065 |
| PROPUESTA | **0,0339** | **0,0546** | −0,0111 |
| | **−40,6 %** | **−34,2 %** | |

Por tamaño de muestra de la entidad:

| procesos de la entidad | procesos servidos | MAE previa | MAE propuesta | mejora |
|---|---|---|---|---|
| 1-4 | 663 | 0,0761 | 0,0461 | **39 %** |
| 5-9 | 692 | 0,0650 | 0,0351 | **46 %** |
| 10-29 | 1 214 | 0,0493 | 0,0292 | **41 %** |
| 30+ | 431 | 0,0373 | 0,0267 | **28 %** |

El sesgo residual de la propuesta (−0,011) **no es un defecto suelto**: es la brecha de Jensen de
§5.5, y la corrige la Fase B.

### 5.4 · Ablación — qué aporta cada cambio por separado [SIM]

Sin esto la propuesta sería un paquete de tómalo-o-déjalo y el plan de fases no se podría ordenar.
*(Corrida independiente, otras extracciones aleatorias: comparar dentro de la tabla, no contra §5.3.)*

| variante | MAE | RMSE | sd(p) | mejora |
|---|---|---|---|---|
| **A** · PREVIA hasta ago 2026 (corte en 5 + tertiles) | 0,0511 | 0,0707 | 0,1213 | — |
| **B** · quitar **solo los tertiles** — ⬅ **es lo que corre hoy** (A1) | 0,0376 | 0,0636 | 0,0741 | **27 %** |
| **C** · quitar **solo el corte** (promedio crudo aunque n<5) | 0,0515 | 0,0706 | 0,1384 | **−1 %** |
| **D** · promedio crudo, sin tertiles, sin encoger | 0,0308 | 0,0498 | 0,0852 | **40 %** |
| **E** · PROPUESTA (encogimiento + sin tertiles) | 0,0315 | 0,0528 | 0,0711 | **38 %** |
| **F** · propuesta con piso de seguridad `m ≥ 3` | 0,0382 | 0,0653 | 0,0572 | 25 % |
| *verdadera (referencia)* | — | — | *0,1035* | — |

Tres lecturas, y las tres cambian el plan:

1. **Retirar los tertiles era el cambio más barato y el segundo más grande** (−27 %): tres líneas de
   código, ningún dato nuevo, ninguna reconstrucción del índice. Por eso fue el primero que se
   ejecutó (A1, ago 2026).
2. **Quitar el corte en 5 POR SÍ SOLO EMPEORA** (−1 %, es decir, un pelo peor). Usar un promedio de
   2 procesos en crudo es ruido, y los tertiles lo amplifican. **No se puede hacer C sin B o sin el
   encogimiento** — es la trampa en la que caería quien leyera §2.1 y solo bajara `MIN_PROCESOS`.
3. **El encogimiento no gana casi nada sobre el promedio crudo cuando `τ²` es grande** (E 0,0315
   contra D 0,0308). **Su valor no es el MAE: es el seguro.** Con `τ²` pequeño la diferencia se
   dispara (§5.5), nunca publica un promedio de un proceso como si fuera una medición, y trae la
   prueba de existencia dentro. Se propone **por doctrina y por robustez, no por rendimiento**, y
   así hay que defenderlo.

### 5.5 · Sensibilidad a lo que la simulación inventa [SIM]

`τ²` (heterogeneidad real entre entidades) es el supuesto que en producción **se mide**. Si la
mejora solo existiera con `τ²` grande, la propuesta sería un artefacto:

| τ² real | τ̂² medida | m estimada | ¿existe la dimensión? | mejora del MAE |
|---|---|---|---|---|
| 0 | −0,03 | ∞ | **NO → todo al prior** | 95 % |
| 0,25 | 0,26 | 17,3 | sí | 74 % |
| 1 | 0,98 | 4,6 | sí | 64 % |
| 2 | 2,23 | 2,1 | sí | 60 % |
| 6 | 5,64 | 0,8 | sí | 38 % |
| 10 | 10,01 | 0,5 | sí | 31 % |

**La mejora se sostiene en todo el rango** (31 %-95 %) y el estimador de `m` recupera el `τ²`
verdadero en todos los casos. No es un artefacto del supuesto.

**Brecha de Jensen** — `1/(1+E[λ])` subestima `E[1/(1+λ)]` porque la función es convexa:

| τ² | `E[1/(1+λ)]` real | `1/(1+μ)` | subestimación |
|---|---|---|---|
| 1 | 0,1878 | 0,1818 | 3,2 % |
| 4 | 0,2071 | 0,1818 | 12,2 % |
| 10 | 0,2481 | 0,1818 | **26,7 %** |

Coincide con la magnitud que `docs/ATRACTIVIDAD.md` obtuvo por Monte Carlo para la corrección
binomial negativa (18-26 %) [DOC]: **son dos efectos distintos —heterogeneidad entre entidades y
sobredispersión dentro de cada una— apuntando en la misma dirección**. La fórmula, actual y
propuesta, **subestima `P` de forma sistemática**, y esa es la deuda de la Fase B.

**Sensibilidad a `b_max`** (la constante del dueño), que es la que más manda sobre `f_precio`:

| `b_max` | media de p | procesos penalizados por precio |
|---|---|---|
| 3 % | 0,189 | **51 %** |
| 5 % | 0,199 | 15 % |
| 8 % | 0,203 | 3 % |
| 12 % | 0,205 | 0 % |

Es un parámetro **con mucha palanca**, y por eso no puede tener un default silencioso: o lo calcula
el APU, o lo declara el dueño, o `f_precio = 1` y la app dice que no está penalizando por precio.

### 5.6 · Impacto en el ORDEN, que es para lo que se usa [SIM]

| | rotación del top | VE verdadero capturado — actual | — propuesta |
|---|---|---|---|
| top-20 por valor esperado | 20 % (16/20 coinciden) | 92,1 % del óptimo | **96,1 %** |
| top-50 | 24 % (38/50) | 95,7 % | **98,2 %** |

**El orden no se da la vuelta** —lo domina la cuantía, como `docs/ATRACTIVIDAD.md` R1 advirtió— pero
uno de cada cinco procesos del top-20 cambia, y el top nuevo captura más valor esperado real. Es
exactamente la magnitud que justifica un **A/B por URL antes de cambiar el default**.

---

## 6. Ventajas sobre la actual

1. **Menos parámetros no calibrables: de 9 a 2**, y los dos con plan de medición. Es la única
   ventaja que importa a largo plazo.
2. **Desaparecen tres discontinuidades verificadas**: ×2,60 en el quinto proceso, −32 % por medio
   rival en el corte del tertil, −15 % por dos décimas de baja. **Dos ya cayeron** con A1 y A1b;
   queda viva la ×2,60 del quinto proceso, que es lo que cierran A2/A3.
3. **La probabilidad de un proceso deja de depender de otras entidades.** Los tertiles son
   relativos y se recalculan con cada reconstrucción; `r̂` solo mira a la entidad y a su prior.
4. **La incertidumbre se publica** (`p_lo`, `p_hi`, `peso_datos`) en vez de esconderse detrás de un
   número con cuatro decimales.
5. **Una sola teoría del precio en todo el repositorio.** `f_precio` llama a `pGanarPorPrecio`; hoy
   hay dos mecanismos que se pisan y cobran el precio dos veces (§2.5c).
6. **Deja de castigar el centro del mercado**, que es el único sitio donde el propio módulo dice que
   no debe haber penalización.
7. **Consume dos datos ya construidos y sin consumidor**: `por_modalidad` de la meta de baja y los
   percentiles P25/P75 de cada celda.
8. **Trae su propia prueba de existencia**: si la dimensión entidad no discrimina, el sistema lo
   dice en vez de seguir publicando bandas de competencia.
9. **Es reversible y compatible**: sin los campos nuevos en el hash, el comportamiento es
   idénticamente el de hoy; desplegar no exige reconstruir el índice.

---

## 7. Limitaciones y riesgos

| # | Riesgo | Por qué se acepta / cómo se acota | Señal que obliga a revisar |
|---|---|---|---|
| L1 | **No hay etiqueta de victoria y no la habrá pronto.** `P` sigue sin ser falsable como probabilidad | Se calibran las dos piezas que sí son observables (rivales, baja). La fórmula se defiende por *estructura*, no por ajuste | Registro de decisiones del dueño ≥20 casos ⇒ primera medición real |
| L2 | **`τ̂²` hereda TODA la contaminación del contador**: censura `E[N\|N≥1]`, agregación de multilote (`numero_de_lotes` no está proyectado), errores de identidad de entidad. Si se infla, `m` se hunde y el encogimiento no encoge | Piso declarado `m ≥ m_min` y `m` publicada en la meta. **El piso cuesta**: con `τ²` alto baja la mejora del 38 % al 25 % [SIM]. Se pone en 3 y se baja cuando se verifique la cobertura del contador | `m` estimada < 1 con un `μ` alto ⇒ sospechar contaminación antes que heterogeneidad |
| L3 | **El sesgo de Jensen no se corrige en Fase A** (3-27 % de subestimación según `τ²`) | Es un sesgo *conocido, medido y en una sola dirección*: la app es pesimista, que es el lado correcto para equivocarse en una decisión de inversión | Se cierra en Fase B con la forma cerrada BinNeg, que ya está derivada |
| L4 | **`b_max` tiene mucha palanca y hoy nadie la ha declarado** (51 % de procesos penalizados con 3 %, 0 % con 12 %) | Sin declarar ⇒ `f_precio = 1` y la respuesta lo dice. Nunca un default silencioso | La primera vez que el dueño lo declare, re-medir §5.5 con su valor |
| L5 | **El ciclo electoral contamina el índice y sigue sin modelarse** [DOC]: el promedio de 2 años mezcla la ventana de la ley de garantías 2026 (8 nov 2025 – 31 may 2026), donde las entidades **tuvieron que competir** | Es preexistente y la propuesta no lo empeora. Pero sí lo hace **visible**: la antigüedad por celda es Fase B, y sin ella no se puede desestacionalizar | Reparto temporal por celda ⇒ si el pico es grande, segmentar el índice por período |
| L6 | **`promediosPorDepartamento` no se encoge**: es una media de medias de entidad, con el mismo problema en un nivel más arriba | Efecto de segundo orden: el departamento solo actúa como prior, y un prior ruidoso pesa `(1−w)` | Si `w` medio < 0,3 en producción, el prior manda y hay que encogerlo también |
| L7 | **La banda es una posterior del MODELO, no un intervalo de confianza del mundo.** No cubre inhabilidades, RUP vencido, experiencia específica ni indicadores del pliego | Es el mismo límite que ya declara el techo de 0,95 [DOC]. La banda mide ignorancia sobre `λ`, no sobre el pliego | Un rechazo por habilitación en un proceso con banda estrecha ⇒ el rótulo miente y hay que cambiarlo |
| L8 | **Retirar `f_comp` baja `p` a las entidades de poca competencia** (−23 %, que son la tesis comercial de la app, Palanca 4) | El orden por VE apenas cambia (§5.6) y el nicho sigue arriba **por el `1/(1+r̂)`, que ya lo separa**. Lo que se retira es el estiramiento, no la señal | ⚠️ **Se desplegó DIRECTO, sin A/B ni flag** — el plan prometía un A/B y no lo hubo, y conviene decirlo en vez de dejar la promesa escrita. Revertir es `git revert` del commit de A1. Señal para hacerlo: que el top-20 empiece a traer procesos «que no miraría» |
| L9 | **Un `p` menos disperso puede leerse como «la app ya no distingue»** | Se acompaña de la banda y de `peso_datos`: distinguir es mostrar cuánto se sabe, no separar más las cifras | Ninguna: es un cambio de lectura, y va en el `como_leerlo` |
| L10 | **La reconstrucción del índice es obligatoria para encender la mejora**, y en producción se lanza a mano desde el navegador | `?reconstruir_indice=true` no re-extrae nada y ya existe. Sin reconstruir, comportamiento idéntico al de hoy | Ninguna |

**Lo que esta propuesta NO hace, dicho explícitamente:** no recomienda precio de oferta, no estima
la capacidad de un competidor, no publica ranking de entidades, no introduce ningún modelo cuyo
resultado no se pueda reproducir a mano con los campos que viajan en la respuesta. Las prohibiciones
de `docs/ATRACTIVIDAD.md` §7 siguen vigentes íntegras.

---

## 8. Plan de implementación en dos fases

### Fase A — con los datos que ya están en Redis

Ordenada por (mejora medida ÷ coste). **A1 es la única que no exige reconstruir el índice.**

| # | Cambio | Dónde | Mejora [SIM] | Coste | Prueba que lo ata |
|---|---|---|---|---|---|
| **A1** ✅ | **Retirar `f_comp` (×1,30/×0,70)** — **HECHO** (ago 2026) | `lib/probabilidad.js` | **−27 % MAE** | 3 líneas | ✅ El ajuste `competencia_*` ya no aparece en ningún desglose (prueba sobre los tres niveles y sobre el corpus entero); ✅ el mismo nº de rivales da la misma `p` venga de la entidad o del departamento; ✅ A.10 y la monotonía intactas |
| **A1b** ✅ | **Suavizar `f_baja` a una rampa continua** — **HECHO** (ago 2026). No estaba en el plan original como paso propio: es la mitad barata de A4, la que quita el SALTO sin tocar la semántica ni `lib/apu/rentabilidad` | `lib/probabilidad.js` | elimina los saltos de −9,1 % y −15,0 %; **no** cambia nada fuera de la banda [2, 5] | 1 h | ✅ Continuidad de la FUNCIÓN (salto máximo < 0,002); ✅ monotonía no creciente; ✅ en el dominio REAL (mediana entera) el peldaño más alto cae del 15,0 % al **8,9 %** — la rampa suaviza la función, no el dato; ✅ los bordes 2 y 5 **cambian** (comparación estricta → inclusiva) y quedan fijados; ✅ `sin_dato` ⇒ ningún ajuste, con la guarda **en el camino real** (`numero(null)` es 0 y la dejaba muerta); ✅ `base × Π factores = p` |
| **A2** | Publicar `μ_global`, `τ̂²` y `m` en `indice:competencia:meta`; publicar `rivales_estimados` y `peso_datos` por entidad. **`promedio` sigue en `null` bajo el mínimo** | `lib/indice_competencia.js` | habilita A3 | medio día + reconstruir índice | Que un hash SIN los campos nuevos dé exactamente la `p` de hoy (compatibilidad, como `claveLegado`); que `promedio` siga anulado bajo el mínimo |
| **A3** | **Encogimiento**: `competenciaDe` devuelve `r̂` y `w`; `estimarPDetalle` los usa | `lib/indice_competencia.js`, `lib/probabilidad.js` | **−38 % MAE** acumulado; elimina el salto ×2,60 | 1 día | Continuidad: `p(n=4)` y `p(n=5)` con el mismo promedio difieren <10 %; `w` monótona en `n`; `τ̂² ≤ 0` ⇒ todo al prior y se declara |
| **A4** | **Sustituir `f_baja` por `f_precio`**, llamando a `pGanarPorPrecio`; encoger `b̂_mkt` y `σ̂` hacia `b_ref` de la modalidad. **Pendiente**: A1b ya quitó los escalones, pero **el castigo al centro sigue ahí** — la rampa suavizó el salto, no la semántica | `lib/probabilidad.js` | elimina el castigo al centro | 1 día | Con `b_max ≥ b̂_mkt` ⇒ `f_precio = 1` exacto; **prohibido** que `lib/probabilidad` reimplemente la curva |
| **A5** | **Separar `p` de `p_sin_precio`** y que `/api/apu/rentabilidad` consuma la segunda | `lib/probabilidad.js`, `api/apu/[accion].js` | corrige la doble cuenta de precio | horas | Ofertar en la mediana devuelve la base **sin ningún factor de precio aplicado** (hoy la prueba pasa contra un `p_base` ya penalizado) |
| **A6** | **Banda `p_lo`/`p_hi`** + `ordenar_por=ve_conservador` como **opción** | `lib/probabilidad.js`, `api/oportunidades.js` | hace visible la incertidumbre | medio día | `p_lo ≤ p ≤ p_hi` siempre; amplitud decreciente en `n_e`; el default **no** cambia |
| **A7** | **Medir `f_colisión` sobre el histórico** (§9.3) y ajustarla o retirarla | script de diagnóstico | convierte un supuesto en un dato | horas | La cifra publicada en la meta con su `n` |

**Invariantes que no se pueden romper en ninguno de los siete pasos:**
`p ∈ [0,01 , 0,95]` · nada no finito llega al `sort` · A.10 (más oferentes ⇒ `P` no sube) ·
`ve = round(p × cuantía)` · `embudo.visibles = viables + fallan_p3` en `/api/diagnostico` ·
`p` en la mediana del mercado = `p_base` en `/api/apu/rentabilidad` · el reparto por tier sigue
sumando los visibles.

### Fase B — requiere recolectar datos nuevos o validación externa

| # | Cambio | Qué dato falta | Por qué merece la pena | Espera |
|---|---|---|---|---|
| **B1** | **Corregir la brecha de Jensen** con `E[1/(1+M)]`, `M ~ BinNeg(λ, k)` | `k`, la sobredispersión. **El histograma por entidad YA se acumula** (`indice_competencia.js:243`); falta publicarlo agregado | Es un sesgo **medido**: 3-27 % de subestimación sistemática de `P` según `τ²`. La forma cerrada ya está derivada en `docs/ATRACTIVIDAD.md` | 1 reconstrucción del índice |
| **B2** | **Antigüedad por celda** (`n` por año, o min/max mes) | el acumulador **no guarda ninguna fecha** [CÓD]: no hay forma de saber si los 40 procesos de una entidad son de 2024 o de 2026 | No es solo obsolescencia: la ley de garantías 2026 es un **quiebre estructural conocido** que el promedio de 2 años mezcla sin saberlo [DOC]. Sin fecha por celda no se puede ni medir ni corregir | 1 reconstrucción |
| **B3** | **Calibrar `f_prórroga`** | el flag `_cierre_prorrogado` **no se persiste** al histórico (`repartirDelta` no lo estampa) | Es la única señal ex-ante que existe, y su magnitud (1,20) es un supuesto puro | ~6 meses de acumulación tras el cambio |
| **B4** | **Backtest temporal completo** (§9.1) como diagnóstico recurrente | nada — solo el script | Es lo único que convierte «la fórmula parece mejor» en «la fórmula acierta más». Debe correr en cada cambio de `m`, `μ` o de las candidatas de columna | ninguna |
| **B5** | **Verificar las columnas de oferentes** contra la fuente | acceso a `datos.gov.co` (403 en este entorno) [DOC] | Si la columna efectiva es el derivado `oferentes` y no una columna de la fuente, todo el edificio descansa sobre una lectura no verificada. Ya lo avisa `columnas_historicas` | 1 consulta desde una red con salida |
| **B6** | **Etiqueta propia**: registro de decisiones y resultados del dueño | endpoint POST autenticado + disciplina de uso | Es la **única** forma de calibrar `P` como probabilidad. Con 50 registros hay tasa de victoria con banda; con 20, ya se puede contrastar el `N*` | años, y empieza el día que se cree |
| **B7** | **Encoger también el prior por departamento** (L6) | nada — el mismo estimador un nivel arriba | Solo importa si `w` medio resulta bajo en producción | ninguna |

---

## 9. Cómo se calibra de verdad — protocolos concretos

Los tres corren **sobre el corpus ya bajado**, sin extraer una sola fila de SECOP.

### 9.1 · Backtest temporal de los rivales (el importante)

```
1. Partir licitaciones:historico:mes:* por fecha: ENTRENAMIENTO = 2024, PRUEBA = 2025.
2. Construir el índice SOLO con 2024 → μ, τ̂², m, y r̂(entidad) para cada entidad.
3. Para cada proceso de 2025 con nº de oferentes observado:
       predicho = r̂(su entidad)      observado = oferentes reales
4. Publicar:  MAE · RMSE · sesgo · pendiente de calibración (regresión observado ~ predicho:
   1,0 = calibrado, <1 = la app exagera las diferencias entre entidades)
   · cobertura de la banda al 90 % (¿cae el observado dentro el 90 % de las veces?)
5. Comparar contra tres referencias obligatorias:
       (a) la fórmula vigente (corte en 5, SIN tertiles desde A1)
       (b) el promedio global μ para todos          ← si (b) gana, la dimensión entidad no existe
       (c) el promedio crudo de la entidad, sin encoger
```

**El punto 5(b) es la parte que no se puede saltar.** Si predecir con la media global acierta tanto
como predecir por entidad, el índice de competencia no está midiendo nada y toda la Palanca 4
descansa sobre ruido. Es un resultado posible, es barato de obtener, y **es un entregable**, no un
fracaso.

### 9.2 · Backtest temporal de la baja

Idéntico, con `b_mkt` predicho contra la baja realmente observada en 2025, abierto **por
modalidad**. Responde de paso si el refinamiento por modalidad aporta algo o si la cifra mezclada
predice igual de bien.

### 9.3 · Efecto de la colisión de cierres (calibra `f_colisión`, hoy 1,15)

```
Sobre el histórico: agrupar por (claveCanonica(entidad), día de fecha_cierre).
   grupo_colisión   = procesos cuyo (entidad, día) tiene ≥2 procesos
   grupo_control    = el resto de la MISMA entidad
   estadístico      = promedio de oferentes del control ÷ promedio del grupo colisión
```

Si el cociente es ≈1,15 el factor está bien puesto; si es ≈1,00 el efecto no existe y **el factor se
retira**. Estratificar por entidad es obligatorio: sin eso se estaría midiendo que las entidades
grandes (que cierran muchos procesos el mismo día) reciben más ofertas, que es lo contrario de lo
que se quiere medir.

---

## Anexo — reproducibilidad de las cifras

Todas las cifras `[CÓD]` salen de llamar a `lib/probabilidad.js`, `lib/indice_competencia.js` y
`lib/apu/rentabilidad.js` con los valores que aparecen en cada tabla; se pueden reproducir con
`node -e` contra el repositorio sin Redis ni red.

Las cifras `[SIM]` salen de tres guiones de simulación con **semilla fija `20260806`** (PRNG
Mulberry32 determinista) y estos supuestos, todos declarados y todos discutibles:

| Supuesto | Valor | Por qué ese |
|---|---|---|
| entidades | 1 400 | orden de magnitud citado en `docs/ATRACTIVIDAD.md` §1 |
| procesos por entidad | log-normal, cola larga (mediana ≈3) | la forma medida allí: muchas entidades pequeñas, pocas grandes |
| `μ` (oferentes) | 4,5 | **inventado** — es `E[N \| N ≥ 1]`, censurado por construcción |
| `τ²` | 6,0 en el caso base, barrido 0-10 | **inventado**, y por eso §5.5 lo barre entero |
| oferentes | Poisson(λ_e) truncada en ≥1 | la censura está documentada: un proceso sin ofertas se declara desierto y no aporta observación |
| baja por entidad | mezcla con 45 % de ceros | reproduce el hecho documentado «la mediana global es 0 %» sin inventar la forma fina |
| procesos activos | 3 000, asignados **ponderando por volumen** | con asignación uniforme se sobre-representan las entidades pequeñas y la mejora sale inflada |
| `b_max` | 5 % en el caso base, barrido 3-12 % | banda de descuento del ganador en obra según el manual (5-12 %) |

**Lo que la simulación NO puede decir**: si `μ` y `τ²` reales se parecen a los supuestos. Los dos
salen del backtest de §9.1 en una tarde, y hasta entonces las magnitudes de §5 son órdenes de
magnitud, no predicciones.

---

*Auditoría ejecutada contra el código real del repositorio (ago 2026): ocho verificaciones de la
fórmula vigente, una simulación de impacto con ablación y barrido de sensibilidad, y una traza de la
interacción entre `lib/probabilidad` y `lib/apu/rentabilidad`. Las cifras marcadas [CÓD] se
obtuvieron ejecutando este repositorio; las marcadas [SIM], simulando sobre él.*
