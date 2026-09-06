# Atractividad de una licitación — análisis iterativo y diseño

> Foto del 21-ago-2026. El estado se mide con `node tests/estado.js`; las rutas, con `node tests/mapa.js`.
> Las líneas citadas como `lib/handlers/procesos/sync.js:NNN` son las del antiguo router suelto `api/sync`
> (agosto de 2026), plegado en `api/procesos.js` (op=sync) en la Fase 0; las coordenadas de hoy las da
> `node tests/mapa.js sync`.

> Documento de **análisis y diseño**. No contiene código de implementación: fórmulas, pseudocódigo,
> arquitectura de datos y plan por etapas. El código se escribe después, sobre esta recomendación.
>
> Convenciones de origen usadas en todo el documento:
> **[CÓD]** verificado ejecutando el código de este repositorio · **[MED]** medido con benchmarks
> propios · **[V]** verificado contra fuente normativa externa · **[NV]** no verificado —
> confirmar antes de codificarlo como regla dura · **[DUEÑO]** constante que aporta el dueño.
>
> Viabilidad: **(a)** calculable hoy con lo guardado · **(b)** requiere ampliar la proyección o la
> ingesta · **(c)** requiere otro dataset · **(d)** imposible o estadísticamente inválido.

---

## 0. Resumen ejecutivo — los cinco hechos que cambian el problema

El encargo parte de que «la app almacena un historial rico de procesos». Antes de modelar nada hubo
que verificar esa premisa contra el código, y **no se sostiene**. Los cinco hallazgos siguientes
reordenan todo lo demás:

1. **No hay historial: hay una foto viva.** La full de higiene mensual descarta los procesos cerrados
   de origen (`lib/handlers/procesos/sync.js:213` → `:112`), reescribe el manifest de cada mes con `base:0` y **borra
   los chunks sobrantes** (`lib/handlers/procesos/sync.js:225-232`). Vida esperada de un proceso adjudicado o desierto
   en el corpus: **≈15 días, máximo ≈30**. Todo lo que el delta acumula, la full lo tira.
2. **No hay adjudicatarios.** La proyección son 21 columnas (`lib/handlers/procesos/sync.js:65-78`). No se guarda
   nombre ni NIT del ganador, ni valor adjudicado, ni fecha de adjudicación. Solo el flag
   `adjudicado`. La dimensión E del encargo no es difícil: hoy es **imposible**.
3. **La señal que más pesa en el puntaje actual no existe cuando hay que decidir.**
   `nivel_competencia` sale de `respuestas_al_procedimiento` (`lib/negocio.js:103-106`), que es un
   dato **ex-post**. En un proceso abierto vale 0, y `nivelCompetencia(0) = "baja" = 100`
   (`lib/negocio.js:39,107-111,153`). Como `api/oportunidades.js:141` sirve solo abiertos, ese 30 %
   del peso es prácticamente constante en todo lo servido: **no ordena nada**.
4. **El puntaje se sella en la ingesta y es idéntico para los tres perfiles.** `enriquecer` corre en
   `lib/handlers/procesos/sync.js:114`, antes de escribir el chunk; el perfil solo actúa como filtro binario
   (`api/oportunidades.js:148`). Helder (tope 4.000 SMMLV), Génesis (2.000) y el consorcio (11.000)
   reciben **el mismo orden**, y recalibrar un peso no afecta a ninguna fila guardada hasta la
   siguiente full: hasta 30 días de deriva.
5. **La app habilita procesos que quiebran a la empresa.** `evaluarRup` sobre un proceso con objeto
   válido y **sin `precio_base`** devuelve `{ok:true, capacidad_ok:true, crpc_cop:0}` [CÓD], porque
   `factorE` retorna 120 sin presupuesto (`lib/capacidad.js:63`) y `0 ≤ K`. Y para Génesis,
   `crp()` devuelve **4.516 M constante** para cualquier presupuesto bajo su tope de 3.502 M [CÓD]:
   el chip «Capacidad K ✓» es verde el 100 % del tiempo. Es decoración, no información.

**Conclusión que gobierna el diseño**: el valor no está en reordenar mejor una lista, está en
**descartar bien** (puertas) y en **asignar capacidad finita** (cartera). La estimación de
competencia es un refinamiento del orden que se enciende por escalones y cuya ausencia degrada a un
supuesto declarado por el dueño — nunca a un número fabricado.

---

## 1. Punto de partida verificado

### 1.1 Qué hay realmente en Redis

| Campo guardado | Presencia | Nota dura |
|---|---|---|
| `:id`, `:updated_at` | siempre (salvo degradación a offset) | `:id` se regenera en re-publicaciones; por eso `_k` prefiere `id_del_proceso` |
| `nombre_del_procedimiento` | siempre | **no truncado** — portador principal de señal semántica |
| `descripci_n_del_procedimiento` | alta | **truncada a 700 caracteres** (`lib/handlers/procesos/sync.js:82-84`): toda la semántica (blacklist, anti-suministro, anticipo) se evalúa sobre texto mutilado, y la forma de pago suele ir al final |
| `entidad`, `nit_entidad` | alta | `nit_entidad` **no se usa en ninguna regla** [CÓD]: único identificador limpio de comprador disponible |
| `departamento_entidad`, `ciudad_entidad` | alta | sede del **comprador**, no lugar de obra |
| `modalidad_de_contratacion` | siempre | catálogo con sufijos variables; hoy se casa por `includes` y se tira el token que casó |
| `estado_del_procedimiento`, `fase`, `adjudicado` | variable | único rastro de resultado |
| `fecha_de_publicacion_del` | siempre | llave de particionado mensual |
| `precio_base` | alta | **string**; `num("412.500.000")` → **412,5** [CÓD] |
| `duracion` + `unidad_de_duracion` | media | default 12 meses si falta |
| `codigo_principal_de_categoria`, `categorias_adicionales` | media / baja | se concatenan y se extrae toda corrida de 8 dígitos (`lib/filtros.js:100-103`) |
| `tipo_de_contrato` | media | **capturado y jamás usado** [CÓD] |
| contadores de ofertas | ≈nulos en abiertos | ex-post por construcción |
| `fecha_cierre` | **cobertura desconocida** | barrido regex sobre nombres de columna no garantizados; nadie la ha medido |

**Fallbacks muertos** (el campo se busca pero `proyectar` lo descartó antes): `valor_total`,
`cuantia_definitiva`, `cuantia_proceso`, `valor_total_adjudicacion` en `lib/negocio.js:95`;
`numero_de_ofertas`, `proponentes` en `lib/negocio.js:103-106`; `valor_total`/`cuantia_definitiva`
en `lib/rup.js:33`. Consecuencia: **todo el edificio descansa sobre un único campo, `precio_base`**,
parseado por una función que no tolera separadores de miles.

### 1.2 Tres sesgos estructurales que ninguna fórmula puede corregir

- **Censura de selección**: el prefiltro descarta >95 % del dataset (`lib/handlers/procesos/sync.js:111-113`).
  Cualquier lectura del corpus como «competencia del mercado» es falsa. Sirve —y sirve bien— para
  «entre lo que a mí me sirve, ¿dónde hay menos gente?».
- **Censura del observable**: el contador de ofertas solo se puebla al abrir/evaluar. Un proceso al
  que nadie se presenta se declara desierto y **nunca aporta observación**. La media del contador no
  estima `E[N]`, estima `E[N | N > 0]`.
- **Ventana anual**: `mesesDelAno()` (`lib/socrata.js:30-36`). Verificado [MED] que el 2 de enero
  devuelve **un solo mes**: la app se vacía justo en los dos meses en que se planea el año.

---

# Iteración 1 — Análisis inicial

## Enfoque propuesto

Conservar la forma que la app ya tiene —media ponderada de componentes 0-100— y **arreglar sus
insumos**: sustituir el dato ex-post de competencia por una línea base histórica, dar peso a la
ubicación (hoy solo filtro) y añadir urgencia (hoy calculada y descartada).

```
atractividad = 0,15·A + 0,20·Q + 0,30·C + 0,15·L + 0,20·U      ∈ [0,100]
```

| Componente | Definición |
|---|---|
| `A` anticipo | 50 si «sin dato»; `100·min(1, pct/20)` si declarado |
| `Q` cuantía | 40 / 80 / 100 / 50 por tramos, con **techo** sobre el tope de Génesis (3.500 M) |
| `C` competencia | `100 / (1 + r_ent·r_fam)`, línea base histórica |
| `L` ubicación | 100 / 40 según `ubicacion_valida` |
| `U` urgencia | días hasta `fecha_cierre`, calculada en consulta |

**Línea base de competencia**, con encogimiento bayesiano simple hacia la media global:

```
λ_ent(e) = (s_e + m·μ) / (n_e + m)          λ_fam(f) = (s_f + m·μ) / (n_f + m)     m = 10
r = clamp(λ / μ, 0,4 , 2,5)                 λ_esperada = μ · r_ent · r_fam
C = 100 / (1 + r_ent·r_fam)                 (sin datos ⇒ C = 50 exacto)
```

**El hallazgo que hace todo esto viable sin tocar la ingesta**: `paginaMes` filtra **solo** por
`fecha_de_publicacion_del` (`lib/socrata.js:104`). La full ya descarga el año completo —cerrados
incluidos, con estado terminal y contador resuelto— y los tira en memoria en `lib/handlers/procesos/sync.js:112`.
**Contar antes de tirar cuesta 0 lecturas de Socrata y 0 de Redis.** Se acumula en dos claves con
prefijo propio (`licitaciones:competencia:{YYYY}` y su `:delta`), inmunes a la poda de la full
porque esta usa `patronMeses = "licitaciones:mes:*"` (`lib/almacen.js:30`, `lib/handlers/procesos/sync.js:248`).

## Fortalezas

- Sustituye un componente **inerte** (competencia ex-post, constante 100 en lo servido) por uno con
  información real, sin cambiar la proyección ni el esquema de chunks.
- Coste marginal ridículo: ~1 µs/fila de acumulación, +3 comandos Redis por full, +2 por delta.
- Añade el `reglas_hash` (`lib/unspsc.js` + `lib/semantica.js` + `lib/filtros.js`): si cambian las
  reglas, la tabla no es comparable y se marca «sin línea base» en vez de mentir.
- Es un cambio pequeño y directo sobre el código actual, en la línea de trabajo del repositorio.

## Debilidades y riesgos

1. **La estructura aditiva está mal aquí.** Una suma es compensatoria: un proceso que cierra en
   **2 días** saca 68,5 y sale en primera página. La imposibilidad material debe ser **puerta**, no
   penalización. Peor: un proceso que apenas pasa el K obtiene `Q = 100` y sube — el ranking premia
   sistemáticamente el mayor riesgo de descalificación.
2. **El 30 % del peso descansa sobre una muestra que probablemente no existe.** ~3.800 observaciones
   sobre ~1.200-1.500 entidades ⇒ **~2,5-3 por entidad**. Con `m = 10`, la credibilidad de una
   entidad con `n = 3` es 0,23: el estimador devuelve el prior global para el 85-90 % de las
   entidades. Riesgo real de **re-implementar el defecto que se quería arreglar** —un componente
   casi constante— con 200 líneas más de código y una falsa sensación de rigor. Y `m = 10` es
   arbitrario: falta la prueba de existencia (`τ² ≤ 0` ⇒ la dimensión no existe y hay que tirarla).
3. **`r_ent · r_fam` es doble conteo.** Las entidades se especializan: la misma señal entra dos
   veces. El `clamp` es un parche cosmético contra un sesgo estructural.
4. **El denominador está contaminado en tres direcciones**: los ceros mezclan «desierto» con
   «no reportado»; la base es del corpus, no del mercado; y `respuestas_al_procedimiento` incluye
   respuestas de la propia entidad y agrega todos los lotes de un multilote (`numero_de_lotes` no
   está proyectado: P99 = 14, máx 100 [V]).
5. **Sigue sellado en la ingesta**: mismo orden para los tres perfiles, hasta 30 días de deriva y
   mezcla de añadas de calibración en una misma lista ordenada — no es reproducible.
6. **`U` puede ser una constante y nadie lo sabe**: la cobertura de `fecha_cierre` nunca se midió.
   Añadir un componente del 20 % antes de instrumentar es construir sobre una suposición. Además usa
   días calendario, no hábiles.
7. **`L` amplifica tres defectos verificados** [CÓD]: `"CAUCA"` casa con `"Valle del Cauca"`;
   `"SANTANDER"` con `"Norte de Santander"`; y el default `"BOGOTÁ D.C."` premia Bogotá para un
   contratista de Purificación e Ibagué.
8. **`A` mide redacción y afloja el filtro de K.** El anticipo detectado por regex sobre texto
   truncado entra en `calcCRPC` vía `lib/rup.js:46`: un falso positivo del 30 % **infla el puntaje y
   relaja el chequeo de capacidad en el mismo porcentaje**. Un dato ruidoso con dos usos acoplados.
9. **La discriminación del ranking vive en el componente menos fiable.** `A` casi constante, `Q` con
   5 valores, `L` con 2, `U` con 5: la única variable continua es `C`, la más ruidosa.
10. **El 1 de enero la métrica se vacía** y `C = 50` para todo el corpus durante el primer trimestre.
11. **Responde a la pregunta equivocada.** «Atractividad» ordena cuál se ve mejor; la decisión real
    es **dónde gasto la semana-hombre**. Y ninguna versión modela que presentarse a A consume el K
    disponible para B: cada fila se evalúa contra el K completo como si fuera la única. El
    repositorio se llama `portafolio-estrategico` y esto sigue produciendo una lista, no una cartera.

## Qué mejoraría en la siguiente iteración

Cambiar la **forma** del modelo: puertas multiplicativas en vez de suma compensatoria; separar
probabilidad, valor y coste; estimar la competencia **ex-ante** con predictores observables antes
del cierre en vez de leer un dato que no existe todavía; medir antes de ponderar; y mover el juicio
de la ingesta a la consulta para que dependa del perfil y se pueda recalibrar el mismo día.

---

# Iteración 2 — Refinamiento

## Enfoque propuesto (evolución)

Se **elimina el escalar** y se sustituye por cuatro objetos que nunca se promedian:

```
PUERTAS   → {pasa · no pasa · SIN DATO}     ¿es elegible, ejecutable, financiable?
P(ganar)  → probabilidad [0,1] con intervalo
VALOR     → COP de margen de contribución
COSTE     → COP + días-ingeniero (el recurso escaso real)

ORDEN     →  VE/D = ( P(ganar)·V − C ) / D           [COP de margen esperado por día-ingeniero]
UI        →  N* = nº de rivales habilitados a partir del cual VE ≤ 0
```

**Las puertas son el hallazgo, no el orden.** Medido [CÓD] sobre los perfiles reales:

| perfil | tope declarado | techo real a 12 m | techo real a 24 m | ¿quién ata? |
|---|---|---|---|---|
| helder | 7.004 M | **5.135 M** | 7.004 M | K a plazo corto, tope a plazo largo |
| genesis | 3.502 M | 3.502 M | 3.502 M | **el tope siempre** — K = 4.516 M constante |
| juntos | 19.260 M | **8.987 M** | 16.647 M | K, salvo a 36 meses |

- **G2 · Capacidad**, con dos correcciones no negociables: anticipo **forzado a 0** en `calcCRPC`
  (desacopla el dato ruidoso de sus dos usos) y `B ≤ 0 ⇒ SIN DATO`, nunca `pasa`.
- **G3 · Caja — puerta nueva, y la que de verdad ata** (a):
  `caja_requerida ≈ B·(1−a)/plazoMeses · ciclo_cobro_meses` contra `Σ patrimonio · apalancamiento +
  línea de crédito`. Medido [CÓD]: Génesis con 3.100 M a 10 meses necesita 620 M contra 211 M ⇒
  **cerrada (2,93×)**; con 420 M a 5 meses ⇒ abierta (0,79×).
- **G4 · Tiempo**: días **hábiles** hasta el cierre contra días-ingeniero por modalidad. Y el bug de
  hoy: `api/oportunidades.js:136-149` filtra por estado y **jamás mira la fecha**.
- **G5 · Veto del dueño** sobre `nit_entidad`, que hoy se guarda y no lee nadie.

**`P(ganar)` con estructura causal explícita y forma cerrada** (no simulación):

```
P(ganar) = P_hab · E[1/(1+M)] ,   M ~ BinNeg(λ_ef, k)
E[1/(1+M)] = (p − p^k)/((1−p)(k−1)) ,  p = k/(k+λ)      (k = 1 y k → ∞ tienen su forma)
```

Verificado contra Monte Carlo de 60.000 réplicas [SIM]. Se **rechaza** el atajo `1/(1+λ)`
(subestima 18 % a λ=4) y **Poisson** (subestima 26 % frente a BinNeg k=2): con la sobredispersión
documentada del contador (mediana 0, P99 28, máx 231 [V]) la familia correcta es la binomial
negativa. El hurdle queda implícito: `E[1/(1+M)]` ya contiene `P(M=0)·1`, así que **una celda con
alta tasa de desierto sube `P(ganar)` por la fórmula**, no por una regla ad-hoc.

**La corrección estadística central**: el contador mide `E[N | N > 0]`. Bajo BinNeg(k=2) el sesgo es
**+178 % a λ=0,5; +80 % a λ=1; +13 % a λ=4; +1 % a λ=15** — sobreestima muchísimo justo en las
celdas de baja competencia, que son las únicas que interesan. De ahí la descomposición hurdle
`λ̂ = (1−p̂₀)·μ̂`, donde `p̂₀` se estima **sin** el campo censurado, desde el estado terminal.

**`N*` invierte el problema de estimación**: en vez de fingir que se conoce λ, se publica el número
de rivales a partir del cual el proceso deja de convenir, y se le pregunta al dueño — que sí lo sabe.

## Fortalezas

- El error caro deja de ser posible: ningún proceso no financiable o no preparable a tiempo puede
  subir por acumulación de otros méritos.
- G3 es **información nueva sin un solo dato nuevo**: `precio_base` y `duracion` ya están
  proyectados, el patrimonio ya está en `lib/perfiles.js`.
- El número de UI tiene unidades y es falsable: `VE/D` se contrasta contra la nómina; `N*` contra lo
  que el dueño ya sabe de su mercado.
- La forma cerrada cuesta dos líneas y evita el error de familia (factor 1,36 sobre `P(ganar)`).

## Debilidades y riesgos

De las cuatro críticas adversariales (estadístico, dueño, ingeniero, abogado), las que sobreviven:

1. **`eInv(0, k) = NaN`** [CÓD], y λ = 0 es exactamente lo que produce el hurdle cuando `p̂₀ = 1`
   —la celda que más interesa al negocio—. Un `NaN` en el comparador **no explota**: el `sort` lo
   trata como «iguales» y la lista degrada al orden de lectura de los chunks, con 200 OK.
2. **Doble conteo full + delta** (factor ~4) y **el acumulador no sobrevive la degradación
   keyset→offset** (`lib/handlers/procesos/sync.js:203` reinicia el mes; un acumulador sin reset cuenta dos veces sin
   error ni log — y esa rama no tiene un solo test).
3. **Dos de las cuatro granularidades tabuladas no caben en un valor de Redis**, y el síntoma sería
   «datos de hace 6 días», no un error.
4. **La llave de celda es la modalidad cruda**: `norm()` produce cadenas distintas para «Licitación
   Pública», «Licitación Pública Obra Pública» y «Licitación pública de obra» [MED]. Divide `n` por
   ~2, ensancha la cota y todo baja de prioridad de forma uniforme: el sistema **parece prudente en
   vez de roto**.
5. **Ninguna clave nueva tiene ciclo de vida**, y el SCAN de cada consulta las paga.
6. **Riesgo jurídico gravísimo**: ganar un proceso que no se puede financiar y no firmarlo produce
   efectividad de la garantía **más inhabilidad de 5 años** (Ley 80/1993 art. 8.1.e [V]). Eso no es
   un `VE` negativo: para Génesis (patrimonio 211 M) es el fin de la empresa. Y ofrecer el **mismo
   proceso bajo tres perfiles** (`public/index.html:57-59`) hace trivial una conducta que es causal
   de rechazo y, si media concertación, delito (Código Penal art. 410A [V]).
7. **Datos financieros de una persona natural identificada servidos sin autenticación**:
   `api/oportunidades.js:168` expone `k_cop`, `crpc_cop`, `tope_cop` y `co_estimado` sin credencial;
   la clave `231105` vive en el cliente (`public/app.js:14`).
8. **Errores de derecho**: el K es figura de obra pública (Ley 1682/2013 art. 72 [V]) y se está
   aplicando a concurso de méritos; «Consorcio / Unión Temporal» son dos figuras con régimen de
   responsabilidad distinto; y en consorcio cada integrante responde por el **100 %**, no por su
   50 % (Ley 80 art. 7 [V]).

## Qué mejoraría en la siguiente iteración

Convertir el diseño en algo **desplegable por escalones**, donde cada escalón tenga su propia
validación y su propio comportamiento de caída; blindar los modos de fallo silencioso (`NaN`,
doble conteo, degradación, claves huérfanas); incorporar el bloque jurídico como **restricción, no
como preferencia**; y —lo que falta del todo— pasar de lista a **cartera**.

---

# Iteración 3 — Convergencia

## Enfoque propuesto (versión refinada final)

Una sola regla de arquitectura resuelve el conflicto entre las cuatro críticas:

> **El valor está en las PUERTAS y en la CARTERA, ambas calculables hoy sobre datos ya guardados.
> La estimación de competencia es un refinamiento del orden que se enciende por escalones y cuya
> ausencia degrada a un supuesto declarado por el dueño, nunca a un número fabricado.**

### Los cuatro objetos, y por qué no se colapsan

```
ELEGIBILIDAD   G1..G6 ∈ {pasa · no pasa · SIN DATO}
PROBABILIDAD   P(ganar) = P_hab · E[1/(1+M)]           con intervalo
VALOR          V = m · B_ef                            COP de margen de contribución
COSTE          C = c_dp·D + π·B_ef + viáticos + c_est  COP + D días-ingeniero

ORDEN          VE/D = (P·V − C)/D                      [COP/día-ingeniero]
NÚMERO DE UI   N*   = nº de rivales habilitados a partir del cual VE ≤ 0
ASIGNACIÓN     cartera sujeta a K, días-ingeniero, caja y calendario
```

Cinco razones, ninguna estética: (1) la compensación entre unidades distintas es un error de
categoría; (2) **el peor caso es absorbente, no promediable** — la inhabilidad de 5 años entra como
restricción, jamás como término de una esperanza; (3) un 0-100 sin unidades no es falsable;
(4) con imputación de neutros, el orden acaba ordenando por **qué campos están llenos**;
(5) la Ley 1581/2012 art. 4.d [V] prohíbe tratar datos «parciales, incompletos o que induzcan a
error» — y hoy `anticipo_pct = 0` se pinta como «Anticipo no declarado» y `nivel_competencia` como
chip verde cuando ambos son **ausencias**.

Dimensión de lo que se sustituye [CÓD]: el puntaje actual toma **12 valores distintos** con anticipo
binario, y su tercer componente es constante. El desempate real lo hace la fecha de publicación
(`api/oportunidades.js:158-160`): **la priorización de hoy es un orden cronológico dentro de una
docena de cubetas.**

### La escalera de evidencia

Cada escalón se enciende **solo si su propia validación pasa**; si no, se cae al inferior — nunca a
un neutro inventado.

```
Escalón 3   λ̂ por celda con hurdle + shrinkage           enciende si τ̂² > 0 ∧ w ≥ 0,5 ∧ REGLAS_VERSION
Escalón 2   λ̂ = λ_base(modalidad) · ψ(v̇)                 enciende si cobertura(v̇) ≥ 0,8 ∧ corr ≥ 0,3
Escalón 1   λ_base(modalidad, rango) — CONSTANTE DEL DUEÑO, etiquetada «supuesto suyo — edítelo»
Escalón 0   no se muestra P(ganar); solo N*, y se pregunta
```

### Cartera — el paso de lista a asignación

```
maximizar  Σ VE_i·x_i
sujeto a   Σ p_i·CRPC_i·x_i ≤ K − SCE                     (capacidad esperada)
           P( Σ Z_i·CRPC_i·x_i > K ) ≤ 0,15               (capacidad probabilística)
           Σ_{i ∈ semana w} D_i·x_i ≤ D_w    ∀w           (días-ingeniero)
           Σ_{i ∈ mes t} p_i·caja_i ≤ CAP_fin(t)  ∀t      (caja)
           Σ_perfiles x_{i,perfil} ≤ 1       ∀i           (un proceso = un proponente)
```

NP-duro pero N es 20-200: greedy por densidad + intercambio local + Monte Carlo de la restricción
probabilística cuesta **0,80 ms** [MED]. El entregable no es la solución, es el **precio sombra
del K**: «comprometer 1.000 M de capacidad aquí le cuesta X de valor esperado en otra parte».

## Fortalezas

- **El error caro deja de ser posible**, y está medido: dos de los tres casos reales del dueño se
  caen por G2/G3, mientras la suma de la iteración 1 les daba 64,5 / 68,5 / 67,5 — cuatro puntos
  entre tres decisiones empresariales que no se parecen en nada.
- **La incertidumbre penaliza en vez de premiar**: se ordena por la **cota superior de λ**. En
  simulación, ordenar por media cruda a nivel entidad prometía λ = 1,10 y entregaba 2,55 (×2,3).
- **Hay una prueba de existencia y su resultado negativo es un entregable**: si `τ̂² ≤ 0`, la
  dimensión no existe, se elimina y se dice en la cabecera — porque cuando λ es constante `VE/D` se
  reduce a `m·B/D` y **la app vuelve a ordenar por tamaño**; el usuario tiene derecho a saberlo.
- **Cuesta casi nada, medido**: puertas + `P(ganar)` + orden sobre 30.000 filas = **14,8 ms** [MED];
  acumulador **39,7 KB** [MED]; hecho terminal **48 B comprimidos** [MED].
- **Es reversible**: `puntaje_ponderado` sobrevive intacto y el orden nuevo entra como opción de URL
  antes de ser default — el A/B es una URL, no un despliegue.

## Debilidades y riesgos residuales (aceptados)

| # | Riesgo | Por qué se acepta | Señal que obliga a revisarlo |
|---|---|---|---|
| R1 | **El orden sigue dominado por el tamaño**: barriendo λ de 1 a 20, el orden entre 420 M y 3.100 M no se invierte | Quien decide son las puertas; el valor está en descartar, no en reordenar | Si el orden con λ estimado difiere del orden con λ constante en <10 % de los pares del top-50, se apaga el Escalón 3 |
| R2 | `m` (margen) es **circular** —gobierna el K vía `CO = utilidadOp × 16,7` y el valor esperado— y `k` no está medido (mueve `N*` un factor 3) | Son constantes del dueño o del mercado, no del dataset; la banda de `N*` las expone | `ingresoOp` real: verificar que `N*` no se mueve >30 % |
| R3 | **No hay etiqueta (verdad de terreno)** | La única posible —el registro de decisiones del dueño— da decenas de casos al año | A los 20 registros, contrastar `N*` respondido contra oferentes reales |
| R4 | `fecha_cierre` puede tener cobertura ínfima | G4a captura el bug real sin depender de la cobertura | Instrumentación de Etapa 1; si <70 %, G4b nunca se enciende |
| R5 | **La ubicación es la del comprador, no la de la obra**: (d) | Mitigado con `ordenentidad` neutro para Nacional | Dos casos reportados de «obra cerca que la app puso lejos» ⇒ gazetteer |
| R6 | La línea base es del corpus, no del mercado | Para la pregunta real la censura es benigna | Ninguna: es permanente y se escribe en pantalla |
| R7 | **La dimensión entidad no se estima nunca** (n ≈ 2; una mediana de ofertas creíble exigiría ~27 años) | La entidad se conserva como llave del conocimiento del dueño y como **conteo** de recurrencia | Tras 2 años, `τ̂²_entidad > 0` con n ≥ 30 en ≥20 entidades — y aun así jamás como ranking |
| R8 | **Estacionalidad interanual imposible** con este corpus, y 2026 es irrepetible (prohibición de contratación directa 31-ene → 31-may/21-jun [V]) | (d) con datos propios | El almacén acumula hacia adelante; a los 24 meses, estacionalidad por segmento |
| R9 | λ estimada en el primer semestre está fuera de su población en el segundo | Se estratifica por modalidad y se restringe a publicados hace >90 días | `μ̂` de un semestre difiere del otro >1,5× en celdas grandes ⇒ congelar |
| R10 | `num()` no tolera separadores de miles: **no da `NaN`, da un número plausible y pequeño** | Cambiar el parser a ciegas podría romper el formato real, que nadie ha visto | **Canario `/\d\.\d{3}\./` obligatorio**, con alarma roja |
| R11 | **No se recomienda precio, nunca** | El método de ponderación económica se **sortea con los decimales de la TRM después del cierre** en sectores con Documento Tipo [V]; en concurso de méritos el precio no es factor [V]; en mínima cuantía es 100 % por norma | Permanente |
| R12 | `P_hab` es una **cota superior** (no ve inhabilidades, RUP vigente, experiencia específica, indicadores del pliego) | Se convierte en **checklist**, no en probabilidad | Un rechazo por habilitación en un proceso marcado viable ⇒ ampliar la checklist |
| R13 | Consorcio y UT no se separan hasta que el dueño decida | Advertencia de solidaridad visible | Primera vez que se marque «preparando» con perfil `juntos` |
| R14 | **Habituación a las alertas**: 20 alertas/semana al 20 % de precisión queman ~32 h en una empresa de 1-4 personas | Presupuesto fijo de **≤3 alertas/semana** ordenadas por valor esperado, no por umbral | Tres alertas ignoradas seguidas ⇒ bajar a 1 |
| R15 | Las claves nuevas no tienen recolector salvo el que se les diseñe | Cardinalidad fija o acotada + poda anual explícita | Conteo de claves publicado en `meta` > 300 |

---

# Solución final recomendada

> Esta sección incorpora las correcciones de la verificación adversarial y del crítico de
> completitud. Donde la iteración 3 se equivocó, aquí está corregido y marcado **⚠ corrección**.

## 1. Métrica(s) elegida(s) y justificación

**No hay una métrica: hay cuatro objetos y un orden.** Se rechaza explícitamente cualquier escalar
0-100 con pesos.

| Objeto | Definición | Por qué |
|---|---|---|
| **Puertas** `G1..G6` | `{pasa · no pasa · SIN DATO}` + motivo | El error caro es de elegibilidad, no de orden. Un `SIN DATO` **nunca vale 0 ni 1**: segrega la lista |
| **`P(ganar)`** | `P_hab · E[1/(1+M)]`, `M ~ BinNeg(λ_ef, k)` | Estructura causal explícita; forma cerrada de dos líneas; el hurdle («gano porque no vino nadie») queda **dentro** de la fórmula |
| **`V`** | `m · B_ef` | `m` es (d) desde datos públicos: constante del dueño, declarada aparte de `CO` para romper la circularidad |
| **`C`, `D`** | `c_dp·D + π·B_ef + viáticos + c_est` ; `D` en días-ingeniero | El coste de licitar es la variable que nadie modela y la que de verdad decide |
| **Orden** | `VE/D = (P·V − C)/D` | El recurso escaso no es el dinero: son los días-ingeniero. Tres mínimas cuantías que caben en una semana pueden valer más que una licitación grande |
| **`N*`** | rivales a partir de los cuales `VE ≤ 0` | **Invierte el problema**: convierte el parámetro no calibrable en una pregunta que el dueño sí sabe responder |

`N*` calculado sobre los perfiles reales [CÓD] (m = 6 %, día-ing. 600 k, π = 0,2 %):

| proceso | coste de ofertar | **N\* (k=2)** | k=1 | k=5 | m=15 % |
|---|---|---|---|---|---|
| mínima cuantía 90 M | 1,0 M | **12,8** | 22,6 | 9,5 | 33,6 |
| selección abreviada 420 M | 3,2 M | **14,6** | 26,5 | 10,6 | 37,9 |
| licitación 3.100 M | 12,2 M | **29,5** | 64,5 | 20,0 | 75,2 |
| licitación 8.900 M | 23,8 M | **43,9** | 105,5 | 29,0 | 111,2 |
| concurso de méritos 600 M | 8,4 M | **7,6** | 11,4 | 6,0 | 20,4 |

Dos hallazgos de negocio que salen solos de la tabla: **el concurso de méritos tiene `N*` bajísimo**
(12 días-ingeniero sobre 600 M es carísimo) ⇒ la consultoría solo vale en mercados delgados; y `N*`
**crece fuertemente con el tamaño** ⇒ los contratos grandes toleran mucha más competencia, justo lo
contrario del instinto de «huir de las licitaciones grandes».

## 2. Granularidad óptima

| Dimensión | Decisión | Razón |
|---|---|---|
| **Celda de λ** | `modalidad_canónica × rango de cuantía` = **32 celdas**, con jerarquía de fallback `celda → modalidad → global → constante del dueño`, subiendo mientras `w < 0,5` | 32 celdas × 12 meses × 11 contadores = **39,7 KB** [MED]; con ~4.000-10.000 hechos terminales/año dan 125-310 obs/celda |
| **Eje UNSPSC** | ⚠ **corrección**: no se descarta por extrapolación. Un eje de **segmento a 2 dígitos** (72 / 81 / 95 / resto) son 96-128 celdas ≈ 120-160 KB — **cabe**. Se decide **midiendo**, no razonando | Es la dimensión con el mecanismo causal más fuerte: para competir hay que tener la clase en el RUP |
| **Eje entidad** | **Nunca se estima.** Se conserva como llave del veto del dueño (G5) y como **conteo** de recurrencia — que es un hecho, no una tasa, y no necesita muestra | n ≈ 2 por entidad |
| **Eje departamento** | Descartado como celda: 1.056 celdas = **1,04 MB** [MED], por encima del tope de Upstash | Entra como **coste en COP**, no como celda |
| **Modalidad** | **Canónica**, no cruda, publicando el conteo de `otras` en `meta` | La cruda divide `n` por ~2 sin síntoma; si `otras` crece, la lista blanca se quedó atrás y hoy eso es indetectable |
| **Clase UNSPSC** | ⚠ **añadido**: distinguir **principal** de **adicionales**. Hoy se concatenan y se acepta con `.some()` (`lib/filtros.js:100-103,132`): un proceso cuya clase principal está **fuera** del RUP pasa por una secundaria — y la experiencia habilitante se exige casi siempre sobre la principal | Cada falso positivo cuesta 1-3 h de lectura de pliego, el recurso que R14 declara escaso |

## 3. Fórmula del score compuesto

```
──────────────── PUERTAS (todas (a), en la consulta, con los parámetros del perfil) ────────────────
G1 objeto        evaluarObjeto(lic, perfil)          + clase a nivel 6+"00"  (⚠ Etapa 1, no 0)
                 + exigir la clase PRINCIPAL en el RUP, o marcar «encaje débil»
G2 capacidad     B_ef = precio_base / max(1, numero_de_lotes)
                 CRPC = calcCRPC(B_ef, 0, plazoMesesDe(lic))      ← anticipo FORZADO a 0
                 pasa  ⇔ CRPC ≤ crp(perfil, B_ef) ∧ B_ef ≤ tope·SMMLV
                 SIN DATO si B_ef ≤ 0        NO APLICA si tipo_de_contrato ∈ {Consultoría, Interventoría}
                 holgura = 1 − CRPC/crp(...)          ← se muestra, no se promedia
                 rótulo: «CRPC conservador — criterio interno», nunca «CRPC según pliego»
G3 caja          caja_req ≈ B_ef·(1−a)/plazoMeses · ciclo_cobro_meses
                 cap_fin = Σ patrimonio(INTEGRANTES) · apalancamiento + línea de crédito
                 ⚠ SUMA de patrimonios (1.318 M), no el ponderado 50/50 de lib/perfiles.js:98 (659 M)
                 ⚠ y se evalúa además POR INTEGRANTE: en consorcio cada uno responde por el 100 %
G4 tiempo        G4a ⚠ MARCA, no filtro duro: fecha_cierre < ahoraColombia() ⇒ etiqueta
                     «cierre vencido según el dato capturado — verifique» + cubo separado
                     ⚠ comparar contra hora Colombia (UTC-5): Date.parse de un timestamp flotante
                     adelanta 5 h [MED] y borraría del listado los procesos que cierran HOY
                 G4b días hábiles(hoy, cierre) ≥ D_m        (no se enciende hasta medir cobertura)
G5 veto          nit_normalizado → {veto, motivo, dias_pago}   + contador «el veto ocultó N procesos»
G6 Mipyme        ⚠ SOLO {pasa · SIN DATO}: el lugar de EJECUCIÓN no existe como columna, así que
                 la rama de exclusión por domicilio no es computable — se degrada a
                 «verifique en el pliego el departamento de ejecución»
                 ⚠ la limitación exige solicitudes de Mipymes un día hábil antes de la apertura:
                 es un hecho POSTERIOR a la publicación ⇒ jamás multiplicador de λ, solo aviso

──────────────── PROBABILIDAD ────────────────
P(ganar) = P_hab · E[1/(1+M)]                    M ~ BinNeg(λ_ef, k)
E[1/(1+M)] = (p − p^k)/((1−p)(k−1)) , p = k/(k+λ)        k=1: (p/(1−p))·ln(1/p)
GUARDA: si !(λ > 1e-6) → 1.    Nada no finito llega al sort (Number.isFinite obligatorio)

λ_ef = λ̂(celda) · h · ψ(v̇)

λ̂(celda) = (1 − p̂₀ᶜᵒʳʳ) · μ̂                     ← descomposición hurdle
⚠ CORRECCIÓN DE IDENTIFICACIÓN (el defecto más grave de la iteración 3):
  «desierto» ⇏ «N = 0». Se declara desierto también con todos los oferentes inhabilitados,
  con todas las ofertas sobre el presupuesto oficial, por errores del pliego o por pérdida de
  disponibilidad presupuestal. p̂₀ = desiertos/terminales mide P(desierto), lo SOBREESTIMA,
  y el error va en la dirección peligrosa: p̂₀ ↑ ⇒ λ̂ ↓ ⇒ P(ganar) ↑ ⇒ VE ↑ ⇒ N* ↑,
  con más fuerza justo en las celdas de baja competencia, que son la primera página.
  Y ordenar por la cota superior NO cubre esto: es un intervalo de error MUESTRAL, y un sesgo
  de identificación no encoge con n — cuanta más historia, más estrecha la banda alrededor del
  número equivocado.
  REGLA: p̂₀ᶜᵒʳʳ se estima SOLO sobre desiertos con el contador AUSENTE o en CERO;
         los desiertos con N > 0 son observaciones ordinarias de μ̂;
         se publica la fracción de desiertos no clasificable, y si supera ~30 %
         el Escalón 3 NO se enciende.

Shrinkage por momentos CON corrección del ruido de muestreo (sin ella se publica ruido con
cara de señal):   τ̂² = s²_obs − s²_ruido ;  m = μ(1−μ)/τ̂² − 1 ;  w_c = n_c/(n_c+m)
Se ORDENA por la cota superior de λ:  μ̃_c + 1,645·√(s_c + m·μ)/(n_c + m)
PRUEBA DE EXISTENCIA: τ̂² ≤ 0 ⇒ la dimensión no existe, se elimina, y se dice en la cabecera.

⚠ ψ(v̇): la mediana por celda NO sale de sumas y sumas de cuadrados. O se usa la media (sesgada
  por la cola larga, que es justo lo que se quiere normalizar) o se añade un histograma de
  cubetas log por celda — y se vuelve a medir el tamaño del acumulador antes de aceptarlo.

──────────────── VALOR, COSTE, ORDEN ────────────────
V = m · B_ef                                     m [DUEÑO], declarado aparte de CO
C = c_dp·D + π(modalidad)·B_ef + viáticos(depto, ordenentidad) + c_est(sector)
    π·B_ef rompe «más grande es mejor» desde el lado del coste; la distancia entra como COSTE
    en COP, no como componente aditivo ni como filtro binario
VE/D = (P(ganar)·V − C)/D
N*   = solve_M  E[1/(1+M)]·m·B = C               se muestra como banda: «≈15 (rango 11–27)»
```

**El riesgo de ganar-sin-poder-firmar NO es un término de `C`.** Formalmente sería
`P(ganar)·P(no firmar|ganar)·(0,10·B + pérdida_por_inhabilidad)`, y como esa pérdida no es finita
para este negocio, la conclusión operativa es la **puerta dura G3**. Se documenta así en el código
para que un futuro «afinamiento» no lo convierta en un peso.

## 4. Estrategia de actualización

| Qué | Dónde se calcula | Cuándo | Por qué ahí |
|---|---|---|---|
| Proyección, filtros, `enriquecer` reducido a **hechos** | `transformar()` (`lib/handlers/procesos/sync.js:107-117`) | cada full/delta | sin cambios de contrato |
| Acumuladores por celda y mes | dentro de `p.acum[mes]` en `licitaciones:progreso` | **solo la full** | ya se escribe página a página y es reanudable: **+0 claves, +0 comandos** |
| Publicación a `licitaciones:agregados` | cierre de la full | 1 SET | ⚠ **bajo control de presupuesto o en invocación encadenada**: hoy el bloque de cierre corre **fuera** del `while` que vigila `presupuestoMs` (`lib/handlers/procesos/sync.js:240-269`) y con un techo real de 60 s la invocación moriría sin publicar y sin señal |
| Hechos terminales | full **y** delta, append-only | flush al cerrar mes y en el corte por presupuesto (⚠ en el delta el punto de flush es entre `lib/handlers/procesos/sync.js:316` y `:324`, no `:191`) | dedup en lectura por `(_k, evento)`, igual que ya hacen los chunks |
| **Todas las puertas, `P(ganar)`, `V`, `C`, `VE/D`, `N*`, cartera** | `api/oportunidades.js` | **cada consulta** | dependen del perfil y de hoy; recalibrar deja de exigir una full |
| `v̇` normalizada | consulta | cada consulta | es un acumulado: sellarla la deja envejecer |

**Regla dura**: nada que exija comparar la fila entrante contra el corpus ya guardado cabe en el
sync — obligaría a leer los chunks dentro de una función que ya arrastra las filas crudas del delta
sin proyectar (`lib/handlers/procesos/sync.js:281,306`), con riesgo de OOM justo cuando más se necesita recuperar.

**Dos correcciones obligatorias del acumulador**, ambas por modos de fallo silencioso verificados:
reset de `p.acum[mes]` en la degradación keyset→offset (`lib/handlers/procesos/sync.js:203`, rama que hoy **no tiene
un solo test**: el mock solo inyecta 429 y 500); y **solo la full acumula** — el delta re-transforma
filas que la full ya contó, con ~4 transiciones por proceso, lo que ponderaría cada proceso por su
número de adendas.

## 5. Arquitectura de datos

**Principio rector**: fuera de `licitaciones:mes:*` no se crea una clave por entidad de negocio.
Toda clave nueva tiene **cardinalidad fija o acotada por año**, ⚠ **y valor acotado** — porque
`api/oportunidades.js:60` ejecuta `SCAN` **siempre**, incluso con memo caliente.

```
licitaciones:agregados              1 clave · JSON ~40 KB · SET solo al cerrar la full
                                    celdas modalidad_canónica × rango × mes, coberturas,
                                    embudo de descarte, canario, REGLAS_VERSION, medido_en
licitaciones:agregados:previo       1 clave · prior durante el primer trimestre del año nuevo
licitaciones:hechos:{YYYY}:manifest 1 clave/año
licitaciones:hechos:{YYYY}:chunk:i  ⚠ 3-4 claves/año (no 1: ver amplificación abajo)
detecta:marcas                      1 clave · estado por proceso + decisiones del dueño
                                    prefijo FUERA de licitaciones: inmune incluso a patronTodo
                                    ⚠ read-modify-write SIN transacción: exige candado por token
                                      (patrón de lib/handlers/procesos/sync.js:366), poda explícita, export fuera
                                      de Upstash — es la ÚNICA clave no reconstruible del sistema —
                                      y limpieza en tests/e2e.js:452, donde hoy sobreviviría entre
                                      iteraciones y contaminaría la siguiente
```

Total en estado estacionario con 3 años de retención: **≤18 claves nuevas** contra ~205 actuales.
El SCAN sigue en 1 ronda.

**Almacén histórico — un hecho terminal por `(_k, evento)`**, no la trayectoria completa:

```
{ k:_k, t::updated_at, e:{adj|des|can|rev|anu}, ne:nit_entidad, d:departamento,
  m:modalidad_canónica, c:clase UNSPSC principal, pb:precio_base, l:numero_de_lotes,
  n:proveedores_unicos_con, u:respuestas_al_procedimiento, v:visualizaciones_del,
  fp:publicación, fc:cierre, tc:tipo_de_contrato, va:valor_adjudicado (solo Etapa 3) }
```

Precedencia deliberada `proveedores_unicos_con` **antes** que `respuestas_al_procedimiento`
—invirtiendo `lib/negocio.js:103-106`— porque la definición oficial del segundo incluye las
respuestas de la propia entidad, un efecto **de entidad** que contamina justo lo que se quiere
medir; correlacionan 0,9846 [V], así que el cambio no cuesta muestra. Y se cuentan **tres cubetas**
(ausente / cero / >0), no dos: con dos no se distingue campo vacío de cero real.

**Inmunidad verificada** [CÓD]: la poda de la full usa `patronMeses = "licitaciones:mes:*"` y la
consulta `patronChunks`; `licitaciones:hechos:*` y `licitaciones:agregados` no casan con ninguno.
Aserción obligatoria en el e2e: *tras una full completa, `licitaciones:hechos:*` sigue existiendo
con el mismo conteo.*

⚠ **Dimensionamiento corregido**: la full de higiene **re-emite todo el acumulado del año** cada
30 días. Amplificación medida: 12 fulls sobre 4.000 hechos finales = **26.000 escrituras/año,
6,5×** [MED]; con las transiciones del delta, ~32.000 ⇒ **1,25-1,5 MB/año, 3-4 chunks**, no 1. O se
dimensiona con ese factor, o la full emite solo los `(_k, evento)` ausentes del manifest — lo que
exige leer el almacén **al inicio** de la full y choca con el presupuesto del bloque de cierre.

⚠ **Corrección de alcance que abarata todo el plan**: `paginaMes` filtra **solo** por
`fecha_de_publicacion_del` (`lib/socrata.js:102-117`). La full relee los 12 meses del año y ve el
**estado final de todos los terminales** con su contador. Por tanto **`p̂₀`, `μ̂`, `Σ N`, `Σ N²` y
`τ̂²` del año vigente salen del acumulador de la Etapa 1, sin una sola clave nueva**. El almacén
histórico queda reducido a lo que solo él habilita: **serie multi-año**, **vigilancia
desierto → re-proceso a través de la ventana de 30 días entre fulls**, y la correlación de
`visualizaciones_del` medida sobre pares. Eso saca la pieza más cara del camino crítico.

**Ciclo de vida**: retención 3 años fijada **antes** de crear el almacén; poda anual en el bloque
donde la full detecta cambio de año; compactación propia si un año supera 6 chunks;
**`REGLAS_VERSION` en cada hecho** (un cambio en `lib/unspsc.js` / `lib/semantica.js` /
`lib/filtros.js` cambia **qué filas hay**, no solo sus campos: series con versión distinta no son
comparables y el estimador debe negarse a publicar λ en vez de publicar uno inválido); y
**left-truncation declarado** (excluir del cálculo lo publicado antes del arranque del almacén, o
durante ~3 meses la muestra sobre-representa ciclos cortos).

**Coste total en comandos Redis:**

| Operación | Hoy | Con esta arquitectura |
|---|---|---|
| Consulta caliente | 2 | **3** (+1 GET de agregados, memoizable con el mismo sello ⇒ efectivo 2) |
| Consulta fría | 11-26 | **5-6** ⚠ loteando por **bytes estimados (~24 claves) con concurrencia acotada a 3**, no `Promise.all` sobre todos los lotes: tras `compactarMes` un chunk sube a ~162 KB y el peor caso teórico son 667 KB |
| Delta | ~26 | ~29 |
| Full | ~50 | ~60 |

## 6. Lista priorizada de insights accionables

Ordenados por (valor × factibilidad) / coste. **Ninguno requiere código nuevo de ingesta hasta el
nº 13.**

| # | Insight / capacidad | Viab. | Coste | Por qué está aquí |
|---|---|---|---|---|
| 1 | **Puerta de caja (G3)** — «necesita financiar 620 M y tiene 211 M» | (a) | horas | El único error que quiebra la empresa. Información nueva sin un dato nuevo |
| 2 | **Datos del dueño**: `ingresoOp` real, `sce` de cada perfil, NIT, margen, días-ingeniero, prima, línea de crédito, `rup_vigencia_hasta`, `es_mipyme` | (a) | 1 conversación | **El ítem más barato y de mayor retorno de todo el backlog.** Hoy `sce` de Génesis es `[]` y su K es estructuralmente optimista, avisado en un `console.warn` que nadie ve |
| 3 | **Marca de cierre vencido + hora Colombia** | (a) | horas | Hoy se sirven como abiertos procesos cuya fecha pasó. La primera vez que el dueño abre el enlace y SECOP le dice que cerró hace nueve días, la herramienta pierde la mitad de su crédito |
| 4 | **Desacoplar el anticipo del filtro de K** | (a) | 1 línea | Un falso positivo de regex sobre texto truncado infla el puntaje **y** afloja el K en el mismo porcentaje |
| 5 | **`SIN DATO` como estado, no como cero** (`B_ef ≤ 0` ⇒ no `pasa`) | (a) | horas | Hoy un proceso sin `precio_base` recibe chip verde de capacidad sobre nada |
| 6 | **Contabilidad de cartera**: K ya comprometido por lo que se prepara, `CRPC/K` pintado (ya se calcula en `lib/rup.js:56` y **no se muestra**), choque de calendario | (a) | 1 día | «Cuatro cierran el jueves: alcanza para dos» es el consejo más accionable de toda la app |
| 7 | **Bloqueo «un proceso = un proponente»** | (a) | horas | Causal de rechazo de ambas ofertas; con concertación, delito [V] |
| 8 | **`N*` con banda + pregunta al dueño** | (a) | 1 día | Convierte el parámetro no calibrable en una pregunta, y la respuesta se registra: es la **única etiqueta** que este sistema puede llegar a tener |
| 9 | **Sensibilidad inversa del RUP** — «su restricción activa es X; moverla de A a B abre N procesos por $Y» | (a) | 1 día | Medido [CÓD]: la restricción de Génesis **no es el RUP, es su propio `topeSMMLV = 2000`**, una decisión, no un límite legal. Y subir `profesionales` de 3 a 6 solo añade ~251 M de K que **hoy no ata nada**: es la inversión con retorno cero que la nota de `lib/perfiles.js` sugiere |
| 10 | **Cuantificar «consorcio sí o no»** | (a) | horas | 143 clases comunes, **50 exclusivas de Helder, 200 de Génesis** [CÓD]. Los procesos que fallan por separado y pasan para `juntos` **son** el valor del consorcio; los que pasan para ambos son donde el consorcio **destruye** valor (duplica coste y solidariza el riesgo sin abrir nada) |
| 11 | **Clase principal vs. adicionales** | (a) | 3 líneas | Un proceso cuya clase principal está fuera del RUP hoy pasa por una secundaria, y la experiencia habilitante se exige sobre la principal |
| 12 | **Volumen mensual no censurado — ya está en Redis y nadie lo lee** | (a) | horas | `contarMes` cuenta *todas* las filas del mes sin filtro y su resultado vive en `meta.porMes[mes].esperados` (`lib/handlers/procesos/sync.js:182,227,234`). Con 7 puntos y la fecha de fin de la prohibición de contratación directa se verifica la represa **hoy, sin bajar una fila** |
| 13 | **Tres columnas a `CAMPOS`**: `numero_de_lotes`, `visualizaciones_del`, `ordenentidad` | (b) | medio día + 1 full | Ya viajan en la respuesta (`$select=":id,:updated_at,*"`): añadirlas **no cambia una sola petición a Socrata**. `numero_de_lotes` corrige `B_ef` y con él VALOR, COSTE, G2 y G3 a la vez — es un bug de negocio, no un refinamiento |
| 14 | **Instrumentación como puerta de decisión**: cobertura de `fecha_cierre`, contador en 3 cubetas, canario de separador de miles, embudo de descarte, histograma de modalidad canónica | (b) | medio día | **Nada de la Etapa 2 se escribe antes de leer estos números.** Si el contador está *ausente* casi siempre, la Etapa 2 se cancela entera — que es un resultado, no un fracaso |
| 15 | **Prórroga del cierre = competencia ex-ante observable** | (a) | ~2 líneas | El delta escribe append-only y el dedup de lectura recorre **todas** las versiones de cada `_k`. Un `fecha_cierre` distinto entre versiones ⇒ **el cierre se movió**, y una entidad prorroga casi siempre porque no llegaron ofertas suficientes. Es la señal de baja competencia más limpia disponible, y llega **antes** del cierre |
| 16 | **Colisión de cierres como predictor de rivales** | (a) | µs | Los rivales tienen la misma restricción de días-ingeniero: los procesos comparables que cierran en ±3 días hábiles son un predictor **negativo** de rivales. Es el único predictor con mecanismo causal direccional y verificable a posteriori |
| 17 | **Vigilancia desierto → re-proceso** | (b) | 1 día | Un desierto habilita selección abreviada con menos competencia: **señal de compra**. Emparejamiento por `nit_entidad` + Jaccard de trigramas ≥ 0,6 sobre `nombre_del_procedimiento` (**no truncado**) + `\|log(pb_A/pb_B)\| ≤ ln(1,25)` + ventana 120 días. Hoy el sistema destruye esa información cada 30 días |
| 18 | **Distribuciones de lo DESCARTADO** | (a) | un `Map` | El prefiltro es el único punto por el que pasa el dataset completo. Qué entidades, departamentos y clases publican volumen que descartamos **por RUP** responde «¿qué clases debería añadir a mi RUP?» — literalmente el nombre del repositorio |
| 19 | **Burn rate implícito** `precio_base / plazoMeses` contra la mediana de su clase | (a) | horas | Único indicador ex-ante de «presupuesto irreal», que el marco normativo lista como causa típica de desierto; y sirve de puerta de **frentes de obra**, la restricción real de una empresa de 1-4 personas |
| 20 | **Ciclo de cobro y SCE reales con el propio NIT** (`jbjy-vk9h`) | (c) offline | manual | Arregla la puerta más frágil (`ciclo_cobro_meses` es hoy una constante inventada que **determina G3**) y el número que hoy miente en silencio (`sce = []` para Génesis). Runtime cero |
| 21 | **Densidad del mercado local** — cuántos contratistas distintos ganaron obra de clase 72 en Tolima en 3 años (`jbjy-vk9h` / `rpmr-utcd`) | (c) offline | manual | Conteo agregado, no nominal, legalmente limpio: el **mejor proxy de λ geográfica** que existe, y es la misma descarga que el nº 20 |
| 22 | **Consulta agregada `count(*)` + `$group` contra Socrata** | (c) | 1 llamada HTTP | No toca el corpus: cuenta el **universo**, sin descargar filas ni escribir en Redis. Convierte de (d) a (a): estacionalidad multi-año, volumen por entidad y departamento, mezcla de modalidades y el `k` de sobredispersión global |
| 23 | **1-3 puntos por vinculación de personas con discapacidad** (D. 287 de 2026 [V]) | — | un contrato laboral | En un mercado donde los empates se deciden por decimales, es el punto más barato del pliego |
| 24 | **Segundo reloj: ventana de observaciones al proyecto de pliego** (10 días hábiles en licitación, 5 en abreviada y concurso [V]) | (b) | horas | El único momento en que un requisito restrictivo se puede **cambiar** en vez de sufrir |

## 7. Limitaciones aceptadas y riesgos residuales

Además de R1-R15 de la iteración 3, las que la verificación adversarial obliga a declarar:

- **El sesgo de identificación de `p̂₀` no se elimina, se acota.** Ni siquiera con la corrección de
  §3 se separa «nadie se presentó» de «todos quedaron inhabilitados». Se acepta con la regla de
  no encender el Escalón 3 si la fracción no clasificable es alta.
- **La Etapa 0 no es «cero riesgo de corpus».** ⚠ El ajuste de clase a 6+`"00"` toca
  `evaluarObjeto`, que **es el prefiltro de la sincronización** (`lib/rup.js:73-75` →
  `lib/handlers/procesos/sync.js:113`): cambia qué filas se guardan y activa la regla de `CLAUDE.md` de relanzar la
  full. Por eso **se mueve a la Etapa 1**, junto con la full que esa etapa ya prevé. Todo lo demás
  de la Etapa 0 sí es inocuo para el corpus.
- **`/api/oportunidades` sin autenticación es la única deuda no aplazable.** Expone `k_cop`,
  `crpc_cop`, `tope_cop` y `co_estimado`, derivados del patrimonio, la utilidad operacional y la
  liquidez de una **persona natural identificada por nombre completo**, sin ninguna credencial de
  servidor. Autenticar **antes** de añadir un solo dato financiero nuevo o el NIT.
- **`_mem` no tiene techo ni política de desalojo** (35-70 MB retenidos por instancia caliente).
- **El coste se contabiliza por consulta y nunca se multiplica por frecuencia**: `public/app.js:97`
  dispara `/api/sync?modo=auto` en cada render y cada cambio de filtro re-ejecuta la búsqueda. Con
  más puertas el dueño **toca más filtros, no menos**. Falta la cifra de comandos/mes contra el cupo
  del tier gratuito.
- **La discrepancia `vercel.json` (`maxDuration: 300`) vs. el comentario de `lib/handlers/procesos/sync.js:51`
  («cabe en 60 s») está sin resolver**, y de ella depende si el bloque de cierre de la full alcanza
  a publicar los agregados.

**Lo que sigue prohibido en toda etapa**: recomendar precio de oferta · estimar el K, los
indicadores o las clases RUP de un competidor (viven en RUES/Confecámaras, no en datos abiertos
[V]) · publicar cualquier línea base «de mercado» o ranking de entidades por competencia o desierto
· fichas nominales de rivales o métricas de «agresividad» · cualquier índice de direccionamiento
con nombre propio · persistir una etiqueta acusatoria · ingerir `nombre_del_adjudicador` ·
extracción NLP de requisitos desde un objeto truncado a 700 caracteres.

**Lista negra de redacción, vinculante**: nunca «direccionado / amañado / hecho a la medida»; nunca
«esta entidad favorece a X»; nunca «riesgo de corrupción»; nunca «competencia baja» cuando el
contador es 0 (es *sin dato*); nunca «Capacidad K ✓» mientras `ingresoOp` sea `null` y `sce` esté
vacío — el rótulo es **«Capacidad K estimada — no sirve para acreditar»**; nunca un nombre de
funcionario. Sustituto para las señales de riesgo: *«Ventana de preparación por debajo de la
mediana de su modalidad (N días). Verifique el pliego antes de invertir en la oferta.»*

## 8. Plan por etapas

| Etapa | Qué | Desbloquea | Coste | Cómo se valida |
|---|---|---|---|---|
| **0** — sin tocar la ingesta | `lib/costos.js`, `lib/entidades_conocidas.js`, `lib/frentes.js` (planos); anticipo `0` en `calcCRPC`; las seis puertas; `VE/D` y `N*`; `ordenar_por=ve_dia` como **opción, sin cambiar el default**; `ANTICIPO_MIN_DEFAULT` 20 → 0; guarda `Number.isFinite`; lote de MGET acotado; `detecta:marcas` con candado; UI (tres hechos, cubo SIN DATO, pie legal, checklist) | **El 80 % del valor**: los dos de tres casos reales que se caen por puertas, el bug de la fecha, el orden dependiente del perfil, la contabilidad de cartera | ~1 día · 0 claves de cardinalidad variable · 14,8 ms sobre 30 k filas [MED] | 4 aserciones nuevas en el e2e + A/B por URL dos semanas; promoción a default solo si el orden nuevo produce **menos** procesos «que no miraría» en el top-20 |
| **1** — ampliar proyección + instrumentar | 3 columnas a `CAMPOS` + lista negra explícita de campos de persona natural; acumuladores en `p.acum` con reset en `:203`; `modalidad_canonica()`; clase a 6+`"00"`; ventana deslizante de 13-14 meses en `mesesDelAno()`; **toda la instrumentación** | `B_ef` correcto; Escalón 2 de λ; **`p̂₀` y `μ̂` del año vigente ya salen aquí**; y la puerta de decisión de la Etapa 2 | medio día + 1 full · ~0,8 s de CPU por full [MED] | **Es una puerta, no una métrica**: si el contador está ausente casi siempre, la Etapa 2 se cancela y `LAMBDA_BASE` se queda para siempre |
| **2** — almacén histórico | `estado_terminal()` desde una tabla única `{abierto\|vivo\|terminal}` (⚠ **desconocido → `vivo`**, para preservar «desconocido = cerrado» sin contaminar el denominador de `p̂₀`); emisión de hechos; poda y compactación; Escalón 3; **vigilancia desierto → re-proceso**; registro de decisiones con endpoint POST autenticado | λ calibrado; serie que sobrevive a la full; la alerta de mayor valor comercial por línea de código | 2-3 días · ≤5 claves/año · 1,25-1,5 MB/año | Aserción de que la full **no** borra los hechos; `τ̂² > 0` con intervalo excluyendo el cero; `w ≥ 0,5` en la mitad de las celdas; backtest temporal **como diagnóstico, no como gate** |
| **3** — otros datasets y cartera | Prior de anticipo y ciclo de cobro desde `jbjy-vk9h` (offline, runtime cero); bloque de adjudicación anónimo; PAA `9sue-ezhx`; optimización de cartera con precio sombra; serie multi-año por `$group` | La mitad de las dimensiones E, G y H | alto y **manual** | El cruce de llave, con 100 procesos comprobados uno a uno **antes** de escribir una línea |

## 9. Recomendaciones para futuras iteraciones (más allá del alcance actual)

1. **Modelo aditivo sobre `log(1+N)`** en vez de medias marginales, para desconfundir
   entidad ↔ objeto ↔ cuantía ↔ geografía. Exige el almacén con ≥2 años.
2. **Etiqueta propia**: con ≥50 decisiones registradas, `P(habilitado)` medida y tasa de victoria
   con IC ±13 pp. Es el único dato que ningún competidor tiene.
3. **Calendario de capacidad a 18 meses**: el SCE decae (`lib/capacidad.js:83`), así que la pregunta
   correcta es «¿paso el K **en el mes en que se firmaría**?», no «¿paso el K hoy?».
4. **Cópula gaussiana de un factor** para la correlación estocástica entre victorias, encendida solo
   con ≥50 decisiones propias.
5. **Gazetteer de lugar de obra** sobre el texto, con desambiguación por departamento — limitado por
   la truncación a 700 caracteres, donde el alcance suele ir al final.
6. **Separar consorcio de unión temporal** en `lib/perfiles.js` cuando el dueño decida la figura.
7. **Estacionalidad real** a los 24 meses de almacén, con indicadora de periodo electoral.

---

## Anexo — Veredicto por dimensión del encargo

| Dim. | Pregunta | Veredicto | Qué se hace |
|---|---|---|---|
| **A** | Competencia histórica por entidad | **(d) como tasa** (n ≈ 2/entidad; una mediana creíble exigiría ~27 años). **(a) como conteo** | La entidad **no se estima nunca**. Se conserva como llave del veto del dueño, como conteo de recurrencia y como control futuro. ⚠ Pendiente: `nombre_de_la_unidad_de` desambigua «un NIT ≠ una unidad de compra»; y la **mezcla de modalidades** de una entidad es un hecho duro que sale del prefiltro (las 38 de 40 filas de contratación directa que ya vemos y descartamos) |
| **B** | Competencia por UNSPSC | **(a) parcial** | Celda de segmento a 2 dígitos: **medir antes de descartar** (96-128 celdas ≈ cabe). Y el análisis RUP × corpus es (a) hoy: cuántas de las 393 clases aparecen alguna vez (las que no, son peso muerto), y cuánto descarta la capa anti-suministro sobre las **226 de 393 clases (58 %)** que son segmentos de bienes |
| **C** | Competencia geográfica | **(d) como oferentes** con `p6dx-8zbt`; **(c) barato** vía densidad de contratistas en `jbjy-vk9h` | La distancia entra como **coste en COP**, no como filtro binario ni como sumando. ⚠ Corregir los falsos positivos de `ubicacionValida` (`"CAUCA"` ↔ `"Valle del Cauca"`) |
| **D** | Estacionalidad y momento oportuno | **(d) interanual** con este corpus; **(a) intra-anual** — y el dato **ya está en Redis** (`meta.porMes[].esperados`) sin que nadie lo lea; **(c) barato** vía `$group` | Se publica el volumen mensual no censurado y se contrasta con la ley de garantías 2026 (prohibición de contratación directa 31-ene → 31-may/21-jun [V]) y la anualidad presupuestal (carrera de diciembre) |
| **E** | Ganadores y adjudicación | **(d) hoy** — no hay una sola columna de adjudicatario; **(b/c)** con proyección + `jbjy-vk9h` | Se reformula: dispersión de ofertas, relación adjudicado/presupuesto, tasa de proponente único, share de proponente **plural** (el argumento cuantitativo del consorcio). ⚠ Y **el historial propio no es un tercero**: los contratos de Helder y Génesis están bajo su propio NIT |
| **F** | Desiertos y cancelaciones | **(b)** — el corpus los pierde cada 30 días | Un desierto es **señal de compra**, no de descarte. ⚠ Desierto y cancelado implican acciones **opuestas** y no pueden tratarse igual; y con `numero_de_lotes` aparece el **desierto parcial**, que el flag `adjudicado` no puede representar |
| **G** | Comportamiento de la entidad | pagos/adiciones **(c)** — viven en contratos, no en procesos; volumen **(a)** | ⚠ `ciclo_cobro_meses`, que **determina la puerta G3**, es hoy una constante inventada y se puede **medir** con el propio NIT. Y si las entidades prorrogan sistemáticamente (`dias_adicionados`), el K queda comprometido más tiempo y **la restricción de cartera está sesgada a optimista por construcción** |
| **H** | Competidores | **(d)** nominal; **(c)** agregado | Nunca fichas nominales ni métricas de agresividad. Sí estructura de mercado agregada: ganadores distintos por clase × departamento, concentración, share de plural |
| **I** | Tendencias y anomalías | **(a)** parcial | Canario del parser, coberturas y embudo (vigilan el pipeline) + dos detectores de mercado baratos: **burn rate implícito** contra la mediana de la clase, y **objeto repetido** por trigramas (republicaciones y lotes clonados que hoy inflan `total`) |
| **J** | Consideraciones prácticas | — | Todo medido: 14,8 ms de consulta, 39,7 KB de acumulador, 48 B/hecho, ≤18 claves nuevas, 1 ronda de SCAN. ⚠ Pendientes: comandos/mes × frecuencia de render, techo de `_mem`, y el bloque de cierre de la full fuera de presupuesto |
| **K** | Exploración creativa | — | 24 ítems priorizados en §6. Los cuatro que ninguna iteración vio: **prórroga del cierre**, **colisión de cierres**, **sensibilidad inversa del RUP** y **cuantificación del consorcio** — todos (a), todos sobre datos que ya están en memoria |

---

*Documento producido mediante análisis iterativo con verificación adversarial: auditoría del corpus,
inventario de fuentes SECOP II, marco normativo, cinco análisis de dimensión, tres iteraciones de
diseño con cuatro críticas adversariales (estadística, de negocio, de implementación y jurídica), un
crítico de completitud y una verificación de factibilidad contra el código real. Las cifras marcadas
[CÓD] y [MED] se obtuvieron ejecutando este repositorio.*
