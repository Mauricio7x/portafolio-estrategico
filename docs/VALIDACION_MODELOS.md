# Anexo E · Ciencia de datos: calibración, validación y vigilancia
### Consultoría SaaS Detekta · 24-ago-2026 · silla de ciencia de datos + honestidad

---

## 1. EL HECHO INCÓMODO, DICHO PRIMERO

**Detekta vende una probabilidad que hoy no se puede comprobar.** No es una sospecha de esta
consultoría: lo demuestra el propio repositorio.

> *«El corpus dice quién ganó, no a qué procesos se presentó el dueño. Sin denominador no hay tasa de
> victoria, y sin tasa de victoria `P(ganar)` no es falsable.»*
> — docs/PROBABILIDAD_MEJORADA.md § «0.2 Los ~11 667 procesos con par completo»

La tabla de ese mismo documento marca la validación de `P(ganar)` en **rojo: «imposible sin registro
de decisiones del dueño»**. Y **no existe ni una sola medida de calibración en el código**: se buscó
`brier`, `calibrac`, `reliability` y `log loss` en `lib/` y en `tests/`, y no hay ninguna.

Lo que sí hay, y es mucho, son **factores calibrables uno a uno**, y de hecho tres ya se calibraron:
la colisión de cierres se midió y bajó de un supuesto de 1,15 a un **1,06 medido**; el efecto de la
ventana de la ley de garantías se midió y salió **al revés** de lo que se suponía; el encogimiento
hacia la media se estimó con datos reales. **Esa disciplina es el activo.** Lo que falta es la última
pieza, y vender es justamente lo que la trae.

---

## 2. LA ETIQUETA QUE FALTA YA SE ESTÁ RECOGIENDO

`lib/seguimiento.js:44`:

```
ESTADOS = ["interesa", "preparando", "presentado", "ganado", "perdido", "descartado"]
```

**Eso es exactamente el par que falta.** «Me presenté» da el denominador; «Ganado» y «Perdido» dan el
numerador. Con un solo dueño no alcanza para nada — son unas pocas decisiones al año. **Con cien
clientes activos, en una temporada hay miles.**

### 2.1 · Consecuencias, en orden de importancia

1. **Es la ventaja competitiva defendible del producto.** Los datos de SECOP los baja cualquiera; el
   registro de qué decidió el contratista y cómo le fue **no lo tiene nadie más**, y mejora solo con
   el uso. Ninguna de las plataformas comparables lo tiene, porque ninguna acompaña la decisión hasta
   el resultado.
2. **Obliga a decidir la privacidad HOY, no cuando haya datos.** Ese registro es información
   comercial sensible. La finalidad «uso agregado y anonimizado para mejorar el modelo» **va escrita
   en la política de tratamiento antes de recoger la primera fila**, y con posibilidad de negarse sin
   perder el servicio. Recoger primero y pedir permiso después es lo que no se puede hacer.
3. **Impone qué se promete mientras tanto** (§5).

### 2.2 · Lo que hay que añadir para que sirva (poco, y hay que hacerlo bien)

| Falta | Por qué |
|---|---|
| Anotar **cuándo** cambia el estado, no solo cuál es | Sin fecha no se puede separar entrenamiento de validación por tiempo, y sin eso la validación se contamina sola |
| Distinguir «no me presenté» de «no lo marqué» | Es «sin dato ≠ cero» aplicado a la etiqueta. Un guardado sin desenlace **no es una derrota** |
| Guardar la `p` que se le enseñó **en el momento de decidir** | Sin la predicción de entonces, no hay nada contra qué comparar. **Este es el único cambio que hay que hacer antes del primer cliente**: lo que no se guarde ahora no se recupera |

---

## 3. LO QUE SE PUEDE MEDIR YA, SIN ESPERAR A NINGÚN CLIENTE

docs/PROBABILIDAD_MEJORADA.md § «9. Cómo se calibra de verdad — protocolos concretos» deja **tres protocolos escritos** que corren **sobre el corpus
ya bajado, sin extraer una sola fila de SECOP**:

| Protocolo | Qué calibra | Estado |
|---|---|---|
| §9.1 · Retro-prueba temporal de rivales | Los rivales esperados de una entidad contra los oferentes realmente observados después | **Ejecutable hoy.** Es el más importante |
| §9.2 · Retro-prueba temporal de la baja | La baja esperada contra la observada después | **Ejecutable hoy** |
| §9.3 · Efecto de la colisión de cierres | Ya ejecutado: 1,15 supuesto → **1,06 medido** | Hecho |

**Recomendación: ejecutar 9.1 y 9.2 en la Fase 1, antes de vender.** Son los dos números que
alimentan todo lo demás y no dependen de tener clientes. Si los rivales esperados calibran bien, la
mitad de la cadena está respaldada y **eso sí se puede escribir en la página de precios**.

---

## 4. QUÉ SE HACE SI SALE MAL (decidido ANTES de medir)

Fijar el criterio después de ver el dato es elegir el criterio que confirma lo que uno quería.
**Se decide ahora:**

| Resultado de la retro-prueba de rivales | Qué se hace |
|---|---|
| El error medio queda dentro de la banda del 90 % que ya publica el modelo | **Nada.** El modelo está respaldado y se puede decir |
| Se pasa, pero de forma consistente en una dirección | **Se corrige el sesgo** y se vuelve a medir. No se ensancha la banda para tapar el sesgo |
| Se pasa sin patrón, con error grande | **Se ensancha la banda** y la interfaz enseña el rango, no el punto |
| El modelo no mejora al promedio general | **Se retira el número de la tarjeta** y quedan los hechos medidos: cuántos compiten y sobre cuántos procesos |

**La cuarta fila es la que importa.** Está escrita para que, si llega, no se discuta.

---

## 5. QUÉ SE PUEDE PROMETER MIENTRAS TANTO

La filosofía del producto ya resolvió esto sin saber que resolvía un problema de validación: **la
tarjeta no dice «probabilidad»**, dice el hecho medido y luego la frecuencia natural. Un porcentaje
invita a sumarlo entre procesos; «de cada seis como este, gana uno» no.

**Se puede afirmar, porque está medido:** cuántas empresas suelen competir en esa entidad y sobre
cuántos procesos · cuánto descontaron los que ganaron ahí · de qué banco oficial salió cada precio y
con qué vigencia · cuándo vence el plazo de manifestación de interés.

**No se puede afirmar, y no se afirma:** que la aplicación predice si va a ganar · un porcentaje de
acierto · que el precio recomendado maximiza algo comprobado.

**Esto es también la mejor defensa jurídica del producto** (`docs/LEGAL_COLOMBIA.md` §3.2): no se
vende una predicción, se vende información con su procedencia.

---

## 6. VIGILANCIA DE LA DERIVA

La fuente **ya cambió tres veces** con consecuencias medidas: el orden aceptado en el `$select` dejó
producción sin sincronizar 14 horas; las columnas del PAA eran otras y la vista servía vacío; una
`fase` rezagada mataba convocatorias publicadas **sin dejar rastro en ningún sitio**.

**Lo que ya existe:** `lib/censo_ingesta.js` cuenta los descartes por motivo y por literal de
modalidad, con la invariante `leídas = aceptadas + descartadas` — que es justo lo que detecta un
descarte nuevo sin registrar. `lib/rastreo.js` responde «¿por qué no está este proceso?».

**Lo que falta, y es barato:** guardar el censo de cada día y **comparar con el anterior**. Si un
motivo salta de golpe, o si un literal de modalidad nuevo aparece con volumen, **avisar**. Sin eso, la
próxima deriva se descubre cuando un cliente pregunta por su licitación — que es exactamente como se
descubrió la última.

**Umbrales (supuestos, a ajustar con dos semanas de datos):** cualquier motivo que se mueva más de un
50 % respecto a la media de siete días · cualquier caída de más del 30 % en filas aceptadas ·
cualquier literal de modalidad nuevo con más de 100 filas · cero filas aceptadas en una
sincronización, que es la alarma que no puede fallar.

---

## 7. EL LECTOR DE PLIEGOS: LA DECISIÓN APARCADA SE REABRE

El banco de pruebas da **100 % sobre un corpus sintético escrito por el autor del parser**: mide
previsión, no cobertura. La tasa real **sigue sin medir**, y así está declarado en el repositorio. El
dueño lo aparcó, **y en contexto interno era razonable**: si una cantidad sale mal, la ve él.

**Al vender cambia quién paga el error.** Una cantidad mal leída en el presupuesto de un cliente es
plata suya, y en este módulo **el falso positivo cuesta más que el falso negativo**.

**Recomendación:**
1. **Se reabre**, porque cambió el contexto que justificaba aparcarlo.
2. **Necesita 15–20 pliegos reales de SECOP II**, variados en entidad y formato. Los aporta el dueño
   o se recogen del propio piloto, que es la vía natural: **cada cliente que sube un pliego está
   aportando corpus real** — con su permiso y anonimizado.
3. **Mientras no esté medido:** el lector se ofrece declarando que la lectura **hay que revisarla**,
   que es lo que el semáforo de dos ejes ya hace. Lo que no se puede es publicar el 100 % del banco
   sintético como si fuera cobertura.

---

## 8. MÉTRICAS DE PRODUCTO (distintas de las del modelo)

**Regla: una métrica que no cambia ninguna decisión no se recoge.** Cada una con la decisión que dispara:

| Métrica | Decisión que toma |
|---|---|
| Llega a ver su lista tras subir el certificado | Si baja, el problema está en la puerta de entrada |
| Guarda al menos un proceso en la primera semana | Predice si va a renovar; si es baja, el producto no enganchó |
| Exporta al menos un presupuesto al mes | Es **la** métrica del plan Profesional: si no exporta, no está usando lo que paga |
| Marca un desenlace (ganado/perdido) | Alimenta el modelo **y** mide si el cliente confía lo bastante para contarlo |
| Renueva al mes 4 | La única que valida el precio |

**Sin analítica de terceros.** Todo lo anterior se cuenta con lo que ya está en Redis, sin
dependencias y sin enviar el comportamiento de un contratista a un tercero — lo cual, además, es
coherente con lo que se le promete en la política de tratamiento.

---

## 9. TRES COLUMNAS

**MEDIDO** — no existe ninguna medida de calibración en el código · los seis estados de seguimiento ·
los tres protocolos escritos en §9 del documento de probabilidad · la colisión ya calibrada a 1,06 ·
las tres derivas históricas de la fuente · el censo de ingesta y su invariante.

**SUPUESTO** — que cien clientes activos dan volumen suficiente de etiquetas en una temporada · los
umbrales de alarma de deriva · que 15–20 pliegos bastan para medir el lector · que el piloto sirve
como fuente de corpus real.

**NO VERIFICABLE DESDE AQUÍ** — el resultado de las retro-pruebas 9.1 y 9.2, que exigen el corpus de
producción y **no se han ejecutado** · si el modelo calibra o no, que es precisamente lo que este
anexo dice que hay que medir y no adelanta.
