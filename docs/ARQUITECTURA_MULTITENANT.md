# Anexo C · Arquitectura multi-inquilino, escalabilidad y datos
### Consultoría SaaS Detekta · 24-ago-2026 · silla de arquitectura + datos + adversaria

---

## 1. EL DIAGNÓSTICO EN UNA FRASE

**Al sistema no le falta aislamiento: le falta un nivel.** Hoy `perfil` hace dos trabajos a la vez
—identifica *un registro de proponente* y hace de *dueño de los datos*— y eso funciona mientras todos
los perfiles sean del mismo señor. No funciona con clientes, porque hay datos que **pertenecen a la
empresa y no a un perfil**: sus contratos ejecutados, sus consorcios, su estructura de costo.

Por eso `config:experiencia` es una sola clave global: **es un dato de empresa, y no existe el
concepto de empresa.** Prefijarlo con `perfil` no lo arregla — lo duplicaría entre los perfiles del
mismo cliente y volvería a desincronizarse.

**La corrección es introducir la cuenta (`empresa`) como dueño, y colgar de ella los perfiles.**

```
cuenta (empresa)  ──┬── perfiles   (helder, genesis, juntos, cons_…, rup_…)
                    ├── experiencia ejecutada
                    ├── consorcios
                    ├── parámetros de costo
                    └── precios corregidos, presupuestos, seguimiento
```

---

## 2. AUDITORÍA CLAVE POR CLAVE (medida)

### 2.1 · Mercado — compartido, y así debe seguir

`licitaciones:activo:mes:*` · `licitaciones:historico:mes:*` · `indice:competencia*` ·
`indice:baja:*` · `paa:acierto` · `manifestacion:*` · `calendario:festivos:*` · `apu:catalogo:*` ·
`apu:items:*` · `apu:insumos:*` · `apu:factores_region:*` · `portada:*`

**Compartirlos es correcto y es lo que hace barato el producto:** una sola sincronización sirve a
todos los clientes. El coste no crece con el número de clientes, y eso es lo que da el 95 % de margen
de `docs/PRECIO_Y_UNIT_ECONOMICS.md` §4. **No se toca ni una.**

### 2.2 · Ya aislado por perfil — correcto

| Clave | Contenido |
|---|---|
| `apu:precios:{perfil}` | Los precios que el cliente corrigió a mano |
| `apu:presupuesto:{perfil}:{id}` | Sus borradores de presupuesto |
| `config:unspsc:{perfil}:{que}` | Sus listas de códigos |
| `cobertura:{perfil}:{modo}` | Su auditoría de huecos del registro |
| `seguimiento:{perfil}` | Sus procesos guardados |
| `resumen:{perfil}` · `pulso:{perfil}` | Cachés de sus paneles |
| `config:perfiles:{id}` | Cada perfil dinámico `rup_…`, con TTL |

### 2.3 · Los cuatro que bloquean la venta

| Clave | `archivo:línea` | Qué guarda | Naturaleza real | Qué hacer |
|---|---|---|---|---|
| `config:experiencia` | `lib/almacen.js:153` | Contratos ejecutados | **Empresa** | → `emp:{cuenta}:experiencia` |
| `config:experiencia:terminos` | `lib/almacen.js` | Vocabulario destilado de esos contratos | **Empresa** (derivado) | → `emp:{cuenta}:experiencia:terminos` |
| `config:consorcios` | `lib/consorcio.js:47` | Con quién se alía | **Empresa** | → `emp:{cuenta}:consorcios` |
| `apu:parametros` | `lib/parametros.js:27` | Nómina, prestacional, jornada, administración | **Empresa** | → `emp:{cuenta}:parametros`, con caída a los valores por defecto del repositorio |

### 2.4 · El caso especial: `config:perfiles`

`lib/almacen.js:137` guarda **un solo JSON con todos los perfiles del dueño** (helder, genesis,
juntos). Con cuentas, el registro de proponente de cada cliente **no puede vivir en un JSON
compartido**: es su documento financiero.

**Y hay un detalle que rompe si se hace mal:** `lib/perfiles.js` exporta `PERFILES` **síncrono y con
la misma identidad de objeto** porque media aplicación lo captura al requerir. La carga de un RUP
**reemplaza sus propiedades, nunca el objeto**. Cualquier diseño que convierta `PERFILES` en algo que
se resuelve por petición tiene que respetar esa invariante o rompe el matching, las puertas y el
panel a la vez, **en silencio**. La ruta segura es la que ya existe para los perfiles dinámicos:
`lib/perfil_dinamico.js` **inyecta** el perfil en `PERFILES` por petición y lo retira. **Se extiende
ese mecanismo; no se inventa otro.**

### 2.5 · Cachés cuyo sello hay que revisar

El repositorio ya pagó este defecto una vez: el pulso cacheaba **por perfil, no por credencial**, y
una respuesta calculada con token servía las finanzas al siguiente sin token. Está corregido. Con
cuentas hay que revisar **todos** los sellos:

| Caché | Sello hoy | Qué falta |
|---|---|---|
| `resumen:{perfil}` (300 s) | perfil | cuenta |
| `pulso:{perfil}` (10 min) | perfil + credencial | cuenta |
| `cobertura:{perfil}:{modo}` (1 h) | perfil + modo | cuenta |
| `diagnostico:{hash}` (24 h) | hash del perfil derivado | verificar que el hash no colisione entre cuentas |
| `consorcio:sim:{hash}` (1 h) | integrantes + proceso + hora | cuenta |
| `indice:detalle:*` · `indice:desglose_p:*` | sello del índice, perfil, baja máxima | son de mercado + perfil: revisar caso a caso |

**Regla:** si el contenido depende de la cuenta o de la credencial, **los dos van en el sello**.
Un sello incompleto es una fuga que además se sirve rápido, que es lo peor.

---

## 3. LA MIGRACIÓN, SIN DEJAR AL DUEÑO FUERA

En producción hay datos vivos bajo las claves viejas. La suite **no ve ese estado**: solo conoce el
del repositorio. Es exactamente la lección que ya costó un defecto —el catálogo cargado antes de una
renumeración—, y por eso la migración se diseña con **lectura tolerante**, no con un corte:

1. **Se crea la cuenta cero** con los datos del dueño.
2. **Lectura tolerante:** se busca `emp:{cuenta}:X`; si no está, se cae a la clave legada `X` y **se
   declara** en la respuesta de qué sitio salió. Es la misma técnica de `claveLegado` en el índice de
   competencia, que existe justamente porque `indice:competencia` no se purga nunca.
3. **La escritura va siempre a la clave nueva.** La primera vez que el dueño guarda algo, migra solo.
4. **La clave legada no se borra hasta que una lectura confirme** que ya no la usa nadie.
5. **Nunca se escribe en la legada desde el código nuevo.** Escribir en los dos sitios crea dos
   verdades, que es el defecto que este proyecto ya pagó varias veces.

**Puerta de salida de la fase:** una prueba que crea **dos inquilinos**, escribe en uno y comprueba
que el otro no ve nada — y que **falla si se revierte el arreglo**. Sin esa mutación demostrada, la
fase no está cerrada; una prueba que pasa contra el árbol anterior es un adorno.

---

## 4. MODELO DE CAPACIDAD

### 4.1 · Lo medido

- Una petición del listado: **1 `scan`** (`lib/handlers/procesos/listar.js:205`) + **1 `mget` por
  cada 8 trozos** (`lib/almacen.js:278`, `lote = 8`) + ~5 lecturas de índices y sellos.
- Con 100 trozos → **≈ 19 comandos**. Sesión típica: **40–60**.
- Catálogo de precios: **10,2 MB en `data/`** servidos en **2,2 MB**, con tope de plataforma de
  4,5 MB y una prueba que falla por encima de 3,5 MB (`tests/e2e.js:11871`).
- Presupuesto de sincronización: **45 s** (`lib/handlers/procesos/sync.js:69`), con el comentario
  «cabe en el plan Hobby (60 s)», mientras `vercel.json` declara `maxDuration: 300`.

### 4.2 · Proyección

| Clientes | Comandos Redis/mes (lectura) | Coste Redis | Dónde se rompe primero |
|---|---|---|---|
| 10 | ~10.000 | despreciable | En nada |
| 50 | ~50.000 | despreciable | En nada |
| 500 | ~500.000 | ≈ US$ 1 | En **la capacidad de soporte de una persona**, mucho antes |
| 5.000 | ~5.000.000 | ≈ US$ 10 | En el tiempo de respuesta del listado si el corpus crece: el `scan` recorre el keyspace entero |

**La lectura correcta de esta tabla:** la infraestructura **no es la restricción**. Lo que se agota es
la atención de una persona. Cualquier plan que prometa escalar a 500 clientes sin equipo está
prometiendo un soporte que no existe.

### 4.3 · Las dos contradicciones que hay que resolver

1. **`maxDuration: 300` contra un presupuesto de 45 s.** O se está en Hobby y el 300 se ignora, o se
   está en Pro y la sincronización usa un sexto del tiempo disponible. **Es una consulta al panel y
   cambia cuánto tarda la carga completa.** Al pasar a Pro (obligatorio por L-1), subir el
   presupuesto acorta la ingesta y reduce el número de tandas encadenadas.
2. **El `scan` del listado crece con el keyspace.** Hoy no molesta. Con más años de histórico y más
   inquilinos, es el primer sitio donde se degrada el tiempo de respuesta. **No se optimiza ahora**
   —sería complejidad sin problema— pero se vigila con una métrica.

---

## 5. LA PROMESA QUE NO SE PUEDE ROMPER PARA AHORRAR

El juicio corre **al servir**, no al ingerir, y eso es deliberado: afinar el matching o cargar un RUP
tiene **efecto inmediato**. La tentación al escalar es precalcular `p_ganar` y el veredicto por
proceso y perfil.

**Medido en contra:** precalcular por perfil multiplica el trabajo de la sincronización por el número
de clientes —justo lo que hoy es constante y da el 95 % de margen— y **mata la promesa que hace
vendible el onboarding**: el cliente sube su certificado y ve su lista al instante. Con precálculo,
vería «disponible en unos minutos».

**Recomendación: no se precalcula.** Si algún día el tiempo de respuesta obliga, lo que se precalcula
es lo que **no depende del perfil** (índices de mercado, que ya se precalculan), nunca el veredicto.

---

## 6. FUENTES DE DATOS: LICENCIA, DERIVA Y CONTINUIDAD

### 6.1 · Inventario

| Fuente | Aporta | Modo | Licencia | Si desaparece |
|---|---|---|---|---|
| SECOP II `p6dx-8zbt` | El corpus | Ingesta | CC BY-SA 4.0, comercial permitido con atribución | **El producto se muere.** Riesgo concentrado |
| Histórico (mismo dataset) | Competencia y baja | Keyspace propio, **nada lo purga** | Igual | Se pierde la inteligencia. **Sin respaldo hoy** |
| `jbjy-vk9h` · `hgi6-6wh3` · `9sue-ezhx` · `iaeu-rcn6` · `4n4q-k399` | Ejecución, proponentes, PAA, sanciones | En vivo, best-effort, 6 s | Igual | Degrada, no rompe. **Ya está bien diseñado** |
| INVIAS | Precios de insumo y 526 APU | JSON capturado | **Prohíbe uso comercial sin autorización** | Ver L-7 |
| IDU · FFIE · ICCU · EPC | Cuatro bancos | JSON capturado | **Sin auditar** (L-9) | Ver L-9 |
| Comercios (retail) | Techo por insumo | JSON capturado | **Sin auditar** (L-8) | Ver L-8 |

### 6.2 · Deriva: ya ocurrió tres veces

SECOP cambió el orden aceptado en el `$select` y dejó producción sin sincronizar **14 horas**; las
columnas del PAA resultaron ser otras y la vista servía vacío; una `fase` rezagada mataba
convocatorias publicadas sin dejar rastro. **La deriva no es hipotética en esta fuente.**

**Vigilancia mínima, con lo que ya existe:** el censo de ingesta (`lib/censo_ingesta.js`) ya cuenta
descartes por motivo y por literal de modalidad, y la invariante `leídas = aceptadas + descartadas`
ya detecta un descarte nuevo sin registrar. Falta lo barato: **comparar el censo de hoy con el de
ayer y avisar si un motivo salta de golpe**. Sin eso, la próxima deriva se descubre cuando un cliente
pregunta por qué no está su licitación.

### 6.3 · Continuidad — el hueco más grave

**No consta ningún respaldo.** El histórico es el activo: dos años de procesos adjudicados que
ninguna purga toca, y de él salen el índice de competencia y el de baja.

Lo mínimo, y en este orden:
1. **Exportación completa a un archivo fuera de Upstash**, semanal.
2. **Una restauración de verdad, con fecha anotada.** Un respaldo que nunca se restauró no es un respaldo.
3. **Objetivo de recuperación declarado** en los términos: cuánto se puede perder y cuánto se tarda.
4. **Comprobar qué ofrece el proveedor** en el plan contratado — no se puede dar por supuesto.

---

## 7. LA REGLA DE CERO DEPENDENCIAS, DECIDIDA

| Necesidad nueva | ¿Se resuelve sin dependencias? | Veredicto |
|---|---|---|
| Cuentas y sesión | Sí: `crypto` nativo ya hace comparación en tiempo constante en `lib/auth.js` | **Se mantiene la regla** |
| Observabilidad | Sí: registro estructurado en JSON a la salida estándar más un panel propio con lo que ya se cuenta | **Se mantiene** |
| Respaldo | Sí: lectura y escritura de un archivo con `zlib` | **Se mantiene** |
| Cobro | **No.** La pasarela exige su cliente, su firma de webhooks y su idempotencia | **Se rompe la regla, solo aquí** |

**Recomendación:** la regla sobrevive con **una sola excepción, aislada en su módulo y declarada**.
Es coherente con la historia del proyecto: se rompió con criterio para el lector de PDF en el
navegador y se documentó por qué. Lo que no se hace es abrir la puerta «ya que estamos».

---

## 8. TRES COLUMNAS

**MEDIDO** — las cuatro claves globales con `archivo:línea` · las ocho ya aisladas · `lote = 8` ·
un `scan` por listado · 2,2 MB de catálogo con prueba a 3,5 · presupuesto de 45 s contra
`maxDuration: 300` · la invariante síncrona de `PERFILES` · el censo de ingesta y su invariante.

**SUPUESTO** — 100 trozos de corpus · 20 sesiones por cliente · que el `scan` es el primer punto de
degradación · que la migración con lectura tolerante basta sin ventana de mantenimiento.

**NO VERIFICABLE DESDE AQUÍ** — el consumo real de Redis en producción · la duración máxima efectiva
de las funciones (`vercel.com` bloqueado) · si Upstash ofrece respaldo en el plan contratado · las
licencias de IDU, FFIE, ICCU, EPC y de los comercios.
