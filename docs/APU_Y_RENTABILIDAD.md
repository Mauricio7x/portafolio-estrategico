# APU y rentabilidad

> **Estado de este documento.** El encargo de la Fase 2 lo daba por existente y por lectura
> obligatoria. **No existía**: `docs/APU_Y_RENTABILIDAD.md` no está en ningún ref de este
> repositorio, y `lib/apu/catalogo.js` —el resultado declarado de la Fase 1— tampoco. Se escribe
> aquí, junto con el catálogo, para que la Fase 2 tenga sobre qué apoyarse y para que la Fase 3
> tenga de dónde partir. Lo que sigue distingue en todo momento **lo que ya está en el código** de
> **lo que es plan**, porque un documento que promete lo que no existe es exactamente la clase de
> fuente de error que este repositorio evita.

---

## 1 · Por qué la app necesita un APU

`Detecta` decide **a qué presentarse**. Hasta ahora esa decisión se tomaba con cuatro puertas
(`lib/puertas.js`), la probabilidad de ganar (`lib/probabilidad.js`) y el mercado
(`lib/indice_competencia.js`, `lib/indice_baja.js`). Todo eso responde *«¿puedo?»* y *«¿me lo
puedo llevar?»*. Ninguna responde la tercera pregunta, que es la que decide de verdad:

> **¿me deja dinero?**

`CLAUDE.md` ya lo declara como hueco abierto, en dos filas de la tabla de aplicación del manual:

| Concepto del manual | Estado |
|---|---|
| **Costos ocultos → calculadora de rentabilidad** | ⬜ *No existe ninguna calculadora de rentabilidad. Hoy la cuantía se muestra como si fuera ingreso.* |
| **Precio bajo incertidumbre → banda de descuento** | ⬜ → ✅ ya resuelto por `lib/indice_baja.js` |

La cuantía publicada **no es ingreso**: es el techo del presupuesto oficial. Entre ese número y la
utilidad hay costo directo, AIU, la contribución del 5 %, estampillas, retenciones, pólizas y el
costo financiero de que el Estado pague tarde. El manual dedica un capítulo entero a ello
(«Los costos que casi nadie suma») y su regla no negociable es **flujo de caja mes a mes antes de
fijar el precio**.

El APU es la pieza que falta para poder hacer esa cuenta.

---

## 2 · Qué es un APU, en los términos que usa el código

**Análisis de Precios Unitarios.** Para cada ítem de obra descompone el precio de UNA unidad de
medida. La estructura es la de INVIAS/IDU y es la que ya usaba el módulo APU de la app monolítica
anterior a la reescritura de julio de 2026:

```
Costo Directo = Mano de Obra + Materiales + Equipo/Herramienta + Transporte
Precio Unitario = Costo Directo × (1 + AIU)
```

- **Mano de obra** = jornal total ÷ rendimiento, con jornal total = jornal base × factor
  prestacional (≈ 1.55 en obra pública colombiana).
- **Materiales** = precio × cantidad × (1 + desperdicio).
- **Equipo** = tarifa/día ÷ rendimiento.
- **Transporte** = tarifa × cantidad × distancia.
- **AIU** = Administración (12–20 %) + Imprevistos (3–5 %, *es seguro, no utilidad*) + Utilidad
  (5–10 %).

Y el presupuesto de la obra es `Σ (cantidad_de_obra × precio_unitario)` sobre todos los ítems.

De ahí salen las **tres incógnitas** y el reparto en fases:

| Incógnita | De dónde sale | Fase |
|---|---|---|
| **Qué ítems** lleva la obra | del objeto contractual | **1 y 2 — hecho** |
| **Cuánta cantidad** de cada uno | del pliego (planos, formulario 1) | **imposible sin el pliego** |
| **A qué precio** unitario | de precios regionalizados + ICOCIV | **3 — plan** |

---

## 3 · Fase 1 · El catálogo (`lib/apu/catalogo.js`) — hecho

**98 ítems** en **11 capítulos**, en el orden de ejecución de una obra (que es el orden en que se
leen los capítulos de un presupuesto): preliminares, movimiento de tierras, estructuras y
concretos, pavimentos y vías, hidráulica y sanitaria, edificación y acabados, eléctrico e
iluminación, urbanismo y espacio público, señalización y seguridad vial, ambiental/SST/social, y
estudios/diseños/interventoría.

Cada ítem es `{ item_id, descripcion, unidad, capitulo }`. La **unidad es la de medida y pago**
(m³, m², ml, kg, und, glb, mes) porque es la que gobierna un APU: el precio unitario se expresa por
ella.

Tres cosas que conviene tener claras sobre este archivo:

- **`item_id` es la llave estable.** Viaja a Redis, al diccionario, al mapeo y a la selección que
  el dueño guarde. Se añaden ítems; **no se rebautizan** los que ya existen.
- **Es conocimiento CURADO, no una estadística.** Sale de la estructura de pago habitual de INVIAS
  e IDU y del `modulo_apu.html` que la app tuvo antes de la reescritura (de ahí vienen ya el
  concreto de 21 MPa, el muro en ladrillo tolete y el acero de refuerzo, con su descomposición
  completa). Está dicho en la cabecera del archivo y no debe presentarse de otro modo — misma
  regla que `data/vocabulario_unspsc.json`.
- **No trae precios ni rendimientos.** Un ítem dice qué se ejecuta y en qué unidad se paga.
  Cuánto vale es la Fase 3. Mezclarlo aquí convertiría un catálogo estable en una tabla de precios
  que caduca cada semestre.

Los capítulos **ambiental/SST/social** existen a propósito como ítems propios (PMA, plan de manejo
de tránsito, SST, gestión social): son justo los costos que el Cap. 11 del manual señala como los
que «casi nadie suma», y tenerlos en la lista es lo que hace que se vean al armar el presupuesto.

---

## 4 · Fase 2 · El motor de inferencia (`lib/apu/inferencia.js`) — hecho

```js
inferirItems(objeto, unspsc, departamento, opts)
  → { items: [{ item_id, descripcion, unidad, cantidad_sugerida, confianza, … }], … }
```

### 4.1 Las dos rutas

```
confianza = 0.7 × especificidad_unspsc  +  0.3 × fuerza_texto     (tope 1)
entra si  confianza ≥ 0.3
```

1. **UNSPSC → ítems** (peso base **0.7**). Se busca del prefijo más específico al más general
   (producto → clase → familia → segmento) leyendo el **nivel** con
   `lib/unspsc.normalizarCodigo`. Nunca con un `slice` a mano: eso sería una segunda definición de
   «familia» conviviendo con la del repositorio.
2. **Texto → ítems** (peso adicional **0.3**). El objeto se normaliza (`norm`: sin tildes, ñ→n,
   minúsculas), se tokeniza con las stopwords de `lib/experiencia` y se generan n-gramas, que se
   buscan en el diccionario.

### 4.2 Seis decisiones que no hay que re-aprender

- **El umbral se compara con «≥», no con «>».** El encargo fija texto = 0.3 y umbral = 0.3. Con
  «>», un objeto reconocido **solo** por el término más inequívoco del diccionario («placa
  huella», peso 1) daría exactamente 0.30 y quedaría fuera por un empate: **la ruta de texto
  entera moriría en silencio**, justo en los objetos que el motor mejor entiende.

- **La especificidad GRADÚA el 0.7; no lo sustituye.** Clase o producto valen el 0.7 completo, la
  familia 0.9 de ese peso y el segmento 0.7. En `lib/unspsc` está **prohibido** subir el
  emparejamiento hasta el segmento, porque ahí se decide si el dueño está **habilitado** y «72»
  casaría «servicios de construcción» con cualquier cosa. Aquí no se habilita nada: se sugiere qué
  revisar, con casillas para desmarcar. Por eso el segmento sí se usa —igual que `lib/indice_baja`
  lo usa para **agrupar**— pero entra valiendo menos. *La diferencia entre las dos situaciones es
  lo que está en juego.*

- **La fuerza del texto es un OR RUIDOSO, no una suma.** `1 − Π(1 − peso)`. Sumar dejaría que seis
  términos de peso 0.2 valieran más que «alcantarillado».

- **Los términos se escriben como se dicen y se comparan como se tokenizan.** «pozo de inspección»
  se canoniza a `pozo inspeccion`, porque el tokenizador quita las stopwords y un n-grama del
  objeto **jamás** contendría el «de». Sin esa canonicalización, toda entrada con preposición
  sería letra muerta: casaría cero veces y nadie lo notaría.

- **La CANTIDAD es siempre `null`.** No es un hueco por llenar: sin el pliego —sin planos, sin
  cantidades de obra, sin el formulario 1— no hay forma de estimar cuántos m³ de excavación lleva
  una vía, y `p6dx-8zbt` no publica nada de eso. Es la misma regla que gobierna `anticipo_pct = 0`
  («sin dato», no «sin anticipo») y el contador de oferentes («0 = sin dato», no «nadie se
  presentó»). El campo viaja explícito y con `cantidad_sugerida_motivo` al lado, **para que la
  ausencia sea una afirmación y no un olvido**.

- **El departamento no cambia los ítems.** Se acepta, se normaliza y se devuelve, pero la
  geografía cambia lo que las cosas **cuestan**, no lo que hay que ejecutar. Es el gancho de la
  Fase 3. Inventar aquí una diferencia regional de *alcance* sería fabricar información que nadie
  midió.

### 4.3 La consecuencia del umbral que NO hay que «arreglar»

Como el techo de la ruta de texto es 0.3 y el umbral es 0.3, **por texto solo pasan los términos
decisivos** (peso 1): `0.3 × fuerza ≥ 0.3` exige fuerza = 1, y ni dos términos de peso 0.9 juntos
llegan (0.297).

Parece un efecto colateral y es la regla que se quiere: sin código UNSPSC el objeto es la única
evidencia, y el repositorio ya decidió una vez —para la ruta de texto del juicio del RUP— que ahí
«un 🟡 no es evidencia de nada». Los términos flojos no son inútiles: en cuanto hay un código
delante aportan sobre esos 0.63–0.7 y mueven el orden, que es para lo que están. Si algún día se
quiere que un término de 0.9 sugiera por sí solo, lo que hay que mover es **su peso** en el
diccionario —dato, discutible, auditable— y **no el umbral**, que es lo que sostiene que la lista
no se llene de ruido.

### 4.4 Las tres puertas de entrada (y los defectos reales que las motivaron)

El motor **no reinventa** ninguna noción de «esto no es obra»: llama a las reglas que ya existen.
Tres definiciones paralelas de «obra» divergirían a la primera corrección.

1. **`BLACKLIST_OBJETO`** (`lib/semantica`), sobre texto **CRUDO** —lleva `[oó]` y flag `i`;
   cambiarle la base de comparación sería una regresión silenciosa—. Hace falta porque
   «ADQUISICIÓN DE CANINOS ANTINARCÓTICOS» **no** trae ningún término no pertinente, y en el
   corpus real viene publicada con un **72141000** (código de vías) que le habría regalado un APU
   de carretera entero.
2. **`evaluarPertinencia`** (`lib/filtros`). «PRESTACIÓN DEL SERVICIO DE INTERNET DEDICADO», con un
   código del segmento **80** (gerencia), sugería «interventoría». No es un fallo del mapeo: el 80
   está en los RUP porque ahí viven la gerencia de proyectos y la interventoría, y es exactamente
   el agujero por el que ya se colaron impresión, alimentos e internet en el juicio del RUP.
3. **`esSuministroPuro`** (`lib/filtros`). El mapeo cubre **a propósito** segmentos de bienes (30
   materiales, 40 tubería, 26 eléctricos), porque una obra publicada con un `4017` sí lleva
   tubería. El precio de esa cobertura es que una **compra pura** con el mismo código se llevaría
   un APU de red entero. La regla ya existente lo distingue sin ambigüedad: solo dispara si
   **ningún** código ancla obra (segmento ≥ 70 que no sea de servicios no constructivos) **y** el
   texto es de adquisición **sin** ningún verbo de obra. Por eso «SUMINISTRO DE TUBERÍA» cae y
   «SUMINISTRO **E INSTALACIÓN** DE TUBERÍA» pasa.

Las tres **solo se aplican si hay texto**. Si el llamante manda un código a secas no hay objeto que
evaluar, y tratar esa ausencia como «no pertinente» sería cerrar por ignorancia — la regla de
faltantes de las cuatro puertas dice justo lo contrario.

### 4.5 Redis manda, el código respalda

| Clave | Qué guarda |
|---|---|
| `apu:mapeo_unspsc` | prefijo UNSPSC → `item_id[]` |
| `apu:diccionario_terminos` | término → `{ peso, items[], origen }` |
| `apu:conocimiento:version` | sello (ISO + sufijo aleatorio) escrito **al final** |

Si no hay nada publicado o Redis no responde, se usan las **semillas** del catálogo y **nunca se
lanza**: es la misma lección que `lib/perfiles.js` conserva con `PERFILES_FALLBACK`. El motor
declara siempre de dónde salió cada tabla en `conocimiento.origen`, porque «el motor no sugirió
nada» tiene dos causas muy distintas: el objeto no se parece a nada, o nadie publicó el
conocimiento todavía.

El sello lleva sufijo aleatorio además del ISO: dos publicaciones en el mismo milisegundo darían el
mismo sello y la segunda pasaría desapercibida.

### 4.6 Aprender del histórico (`?derivar=true`)

Un término suelto extraído del histórico **no sabe a qué ítem pertenece**: hace falta un puente. El
puente es el **código UNSPSC** con el que la entidad publicó el proceso — el mapeo ya dice qué
ítems implica ese código, así que un término que acompaña sistemáticamente a esos códigos acompaña
a sus ítems. Es la misma forma que ya tienen `lib/equivalencias` (lift sobre adjudicatarios) y el
vocabulario por familia de `lib/texto_unspsc`.

`lift = P(término | ítem) / P(término)`, con soporte ≥ 8 y lift ≥ 2. Tres cautelas heredadas:

- lo derivado **se mezcla** con la semilla, jamás la sustituye (una derivación flaca no puede dejar
  sin señal a lo que ya funcionaba);
- lo derivado **pesa menos** que lo curado (0.4 frente a 1): estadística ≠ oficio;
- si el término también está en el vocabulario de la experiencia del dueño
  (`config:experiencia:terminos`) sube a 0.5: dos fuentes independientes que coinciden valen más
  que una.

Un 0 aquí tiene causas distinguibles (`sin_historico`, `sin_codigos_mapeados`,
`redis_inaccesible`) y por eso el resultado las publica con su siguiente paso, en vez de devolver
un número pelado.

**Dos pasadas, y la primera existe por memoria.** `ítem → (término → n)` haría que cada proceso
metiera todos sus n-gramas en cada uno de sus ítems mapeados, y un proceso de vía mapea 22 ítems:
el vocabulario entero duplicado 22 veces. Sobre un histórico real eso son millones de entradas y la
función se queda sin memoria — *en el corpus de prueba no se nota, que es justo por lo que hay que
escribirlo*. La primera pasada cuenta cada término una vez y **poda**: un término que no alcanza el
soporte mínimo en todo el corpus no puede alcanzarlo dentro de ningún ítem. Lo que el tope recorta
se **informa** (`terminos_podados_por_tope`): un recorte silencioso se lee como «esto es todo lo
que había».

**Y lo que la derivación NO tiene, dicho en voz alta:** recorre el histórico entero en una sola
invocación, sin presupuesto de tiempo, sin reanudación y sin candado — igual que
`/api/admin/cobertura-rup`, y por el mismo motivo (corre a petición, y publicar es idempotente, así
que dos derivaciones simultáneas no corrompen nada). Lo que puede pasar es que un histórico muy
grande agote los 60 s de la función. Cuando ocurra, lo que hay que hacer es lo que ya hacen
`/api/sync` y el índice de baja —presupuesto + progreso reanudable—, no subir el `maxDuration`.

### 4.7 El endpoint

| Llamada | Qué hace |
|---|---|
| `POST /api/apu/inferir` | infiere `{ objeto, unspsc, departamento }` |
| `GET  /api/apu/inferir` | estado del conocimiento — **solo lee** |
| `POST /api/apu/inferir?sembrar=true` | publica las semillas en Redis |
| `POST /api/apu/inferir?derivar=true` | aprende del histórico y publica |

Protegido con el mismo `HISTORICO_TOKEN` que el resto de `/api/admin`. **Aquí el token no es
opcional**, al revés que en `/api/oportunidades`: aquello es la lista pública a la que se presenta
un cliente, y esto es la herramienta con la que el dueño arma su precio.

Las tres acciones viven en el mismo endpoint porque **el que escribe una tabla tiene que ser el
que la posee** — la misma discusión que ya se resolvió poniendo la reconstrucción del índice de
baja en `/api/indice-baja?reconstruir=true` y **no** en `/api/diagnostico`, cuya promesa de «solo
lee» es justo lo que permite llamarlo cuando algo va mal.

**No se siembra sola al inferir.** Sería un camino de lectura que escribe. El motor ya funciona sin
Redis y lo declara; el GET dice si falta sembrar y con qué llamada exacta se arregla.

### 4.8 Precisión medida

Sobre **5 objetos con la forma de los reales de SECOP II**: **100 %** (25/25, 22/22, 7/7, 1/1,
13/13) de lo sugerido cae dentro del conjunto de ítems plausibles declarado para cada uno.

> ⚠️ **Cómo hay que leer ese número, y por qué solo no vale.** Las listas de «plausibles» las
> escribió quien escribió el diccionario, así que cubren de sobra lo que el motor puede devolver:
> la fracción sale 100 % **casi por construcción**. Es **parcialmente circular** y sirve para
> detectar contradicciones internas, no como validación independiente.

Por eso cada caso declara además **dos listas falsificables**, que son las que de verdad pueden
tumbar la prueba:

| Lista | Qué | Cuántos |
|---|---|---|
| `debe` | ítems que **tienen** que salir (recall) | 14 |
| `jamas` | ítems que ese objeto **no puede llevar nunca** — se escriben desde el oficio («una vía no lleva ventanería»; «una interventoría no ejecuta ni un m³ de concreto»), no mirando el mapeo | 31 |

Y la medida que **no elige quien escribe la prueba** es la del corpus completo, en el paso
`g-quinquies`: **384/384** objetos de obra civil producen ítems · **64/64** de los que no son obra
no producen ninguno.

**Las pruebas están verificadas por mutación.** Diez cambios deliberados al código de producción
—quitar el `break` del prefijo más específico, desactivar la blacklist, poner la cantidad en 0,
apagar la pertinencia, medir el lift sobre universos distintos, revertir la tabla no pasada a la
semilla, subir el peso de lo derivado a 1, quitar el tope de 1 MB, cambiar el `≥` del umbral por
`>`, canonizar sin tokenizar— **hacen fallar la suite**, cada uno con su mensaje. Cuatro de ellos
sobrevivían antes de esta ronda.

---

## 5 · Fase 3 · Precios y rentabilidad — plan

Lo que sigue **no está implementado**.

### 5.1 Lo que ya existe y se puede reutilizar

- **Regionalización.** El `modulo_apu.html` anterior a la reescritura traía índices de costo
  relativo para las **32 capitales** (Bogotá = 1.00; Quibdó 1.18; Leticia 1.35; San Andrés 1.45).
  Está en la historia de git y es el punto de partida natural del parámetro `departamento` que el
  motor ya acepta y devuelve sin usar.
- **Inflación sectorial.** El **ICOCIV** del DANE, por tipología de obra (vías, hidráulica,
  acueducto, eléctrica, fibra, pistas…). El módulo viejo ya aplicaba `1 + varAnual/100` sobre los
  precios base. `CLAUDE.md` además señala el disparador natural de una alerta: un contrato sin
  cláusula de reajuste que cruza diciembre pierde margen por construcción, y `plazoMesesDe` ya
  normaliza el plazo.
- **La banda de descuento.** `lib/indice_baja.js` ya responde *a cuánto se adjudica* por entidad y
  por tipo de obra (`1 − adjudicado/precio_base`, mediana global típica del 7–8 %). Es la mitad de
  precio de la decisión y ya está resuelta.

### 5.2 Lo que hay que construir

1. **Tabla de precios base** (`apu:precios`), regionalizada y con fecha, con la misma disciplina
   que el conocimiento de la Fase 2: semilla en código, Redis manda, sello al final, y **declarar
   siempre** de cuándo son los precios. Un precio sin fecha es un precio falso.
2. **Composición por ítem** (cuadrillas, rendimientos, insumos, desperdicios). El módulo viejo
   traía tres plantillas completas —concreto de 21 MPa, muro en ladrillo tolete, acero de
   refuerzo— que son el modelo exacto de la estructura de datos.
3. **La calculadora de rentabilidad**, que es lo que de verdad falta y lo que `CLAUDE.md` marca
   como ⬜. Sobre el precio ofertado hay que restar, **como mínimo**:
   - **contribución especial de obra pública: 5 %** sobre el valor total *sin impuestos*, que
     **aplica también a las adiciones** y es **permanente** — «el olvido más caro del país»;
   - **estampillas** departamentales y municipales (0.5–5 % acumulado, *verificar siempre*);
   - retención en la fuente y ReteICA;
   - pólizas y garantías (1–3 %);
   - **costo financiero del capital de trabajo** — el Estado paga tarde, y financiar el 40 % al 2 %
     mensual durante 6 meses son ≈ **5 puntos de margen**;
   - ensayos y laboratorios (0.5–2 %), PMA/señalización/SST (1–3 %), liquidación (0.5 %).
4. **Flujo de caja mes a mes**, que el manual declara **regla no negociable antes de fijar el
   precio**. Conecta con **P3 · CAJA** de `lib/puertas.js`, que ya calcula
   `patrimonio ≥ (cuantía − anticipo) × 0,20`. La calculadora convertiría esa puerta binaria en
   una curva.
5. **Etiquetar «a precio global» vs. «a precios unitarios»** en la tarjeta. Es la variable de
   riesgo que el manual omite y el complemento corrige: en global el riesgo de cantidades es del
   contratista y **no se reconocen mayores cantidades**; en unitarios las cantidades del pliego son
   un estimativo y las mayores cantidades ordenadas **deben reconocerse** (y una mayor cantidad
   **no** es una adición, así que el tope del 50 % no la limita). Es detectable en el texto del
   objeto.

### 5.3 Lo que la Fase 3 NO va a poder hacer, y conviene decirlo ya

**Las cantidades de obra seguirán siendo `null`.** Vienen en el pliego (planos y formulario 1), y
el dataset `p6dx-8zbt` no publica documentos: solo `urlproceso`. Sin cantidades, la Fase 3 puede
dar el **precio unitario** de cada ítem —que es mucho— pero **no el presupuesto total** de la obra.

Para llegar al presupuesto habría que raspar SECOP II, lo que está fuera de la arquitectura actual
(sin dependencias, serverless, respuesta ≤ 4.5 MB). El camino realista es el que ya está abierto:
que el dueño pegue las cantidades del pliego sobre los ítems que el motor le sugirió, que es
exactamente para lo que la tabla tiene casillas y exportación.

---

## 6 · Dónde vive cada cosa

| Archivo | Qué |
|---|---|
| `lib/apu/catalogo.js` | ítems, capítulos, y las dos semillas (datos; hoja del grafo de requires) |
| `lib/apu/inferencia.js` | el motor, la persistencia `apu:*` y la derivación del histórico |
| `api/apu/inferir.js` | endpoint POST/GET protegido |
| `public/admin.html`, `public/admin.js` | sección «Inferencia de ítems APU» |
| `tests/e2e.js` | bloque de unidad «inferencia APU» + paso `g-quinquies` |

**Nota sobre el frontend:** la selección de ítems vive en un `Set` **fuera del DOM**. La tabla se
repinta con `innerHTML` —igual que la de cobertura— y eso borra el estado de cualquier `<input>`
que estuviera dentro; si las casillas fueran la única memoria de lo marcado, «Marcar todos»
seguido de un repintado perdería la selección sin que nadie lo notase.
