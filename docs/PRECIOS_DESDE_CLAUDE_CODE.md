# Precios · cómo funciona «Buscar» y quién lo atiende

> Para: dueño · Estado: referencia · Sustituido por: —

**Fecha:** 4-sep-2026 (tercera pasada) · corregido el 12-sep-2026 (la rutina horaria no existía) · **reescrito el
13-sep-2026: «Buscar» despierta la rutina por HTTP y el chat es el puente**. **Para:** el dueño de Detekta (sin
terminal: todo son URL y clics).

## Qué hace el usuario

1. **Paso 1 · Cargue el pliego o su análisis de precios**: suelta el PDF del pliego o el Excel/CSV con su
   APU (con o sin precios) en la zona «Suelte aquí el archivo». Los ítems entran a la lista.
2. **Paso 2 · Buscar los precios y armar los APU**: revisa la lista, escribe dónde es la obra (departamento,
   ciudad, qué obra es, condiciones del sitio) y pulsa **«Buscar»**. La pantalla dice lo que pasó de verdad:
   **«Su solicitud quedó registrada»** y, según el caso, que «la búsqueda arrancó» (la rutina fue despertada),
   que «nadie la atiende sola» (sin rutina configurada: se abre el puente por chat) o que «la búsqueda
   automática no arrancó» con el motivo. Cuando la sesión empieza: **«Buscando… completado x % (n de m ítems)»**
   con una barra. Puede cerrar la página: el resultado queda con el borrador.
3. Cuando termina, aparece cada ítem con su **costo directo** y su desglose (materiales, mano de obra,
   equipo, transporte, herramienta menor, con fuentes, rendimiento y supuestos), el **Análisis** (base de
   precios, fuentes, alertas de mercado) y el botón **«Usar estos N precios y calcular»**, que aplica los
   precios y muestra el **Paso 3 · Su precio** (con AIU, y el botón «Descargar mi presupuesto (Excel)»).
   Un precio que ya venía en su archivo se respeta.

## Si carga su propio APU (9-nov-2026)

En el paso 1 también se puede soltar un Excel (o CSV) con **sus análisis de precios unitarios**: una hoja por ítem
(como los APU de Empresas Públicas de Cundinamarca) o varios análisis en una hoja (como el libro que exporta Detekta).
La aplicación reconoce que son análisis y no un formulario de cantidades, y:

1. Lee cada análisis: el ítem (código, descripción, unidad) y sus insumos por sección (materiales, equipo, mano de
   obra, transporte), con la cantidad, el desperdicio, el rendimiento y el precio que traigan.
2. Si el libro trae también el formulario de cantidades, cada ítem del formulario se queda con el análisis que casa
   por código (o por la descripción completa y la misma unidad). Si no lo trae, cada análisis es una fila **sin
   cantidad de obra**: hay que escribirla en la tabla.
3. Un análisis con todos sus precios y las cuentas cuadradas entra con su total como precio. Uno a medias entra
   **sin precio** (no toma el precio de ningún banco) y se completa con «Buscar».
4. «Buscar» (o el chat) recibe el análisis con la orden de **conservar sus insumos, cantidades y precios**, poner
   precio de mercado con fuente solo a lo que no lo trae, añadir lo que falte y avisar, sin corregirlo, un rendimiento
   fuera de rango. La aplicación **aparta** la respuesta que quite un insumo suyo o cambie su cantidad o su precio, y
   marca cada línea como **«suyo»**, **«precio buscado»** o **«añadido»**, en pantalla y en la hoja «APU» del Excel.

La columna «RENDIMIENTO» no se adivina: en unos archivos multiplica (materiales) y en otros divide (mano de obra). La
aplicación lo deduce de las cifras de la fila (valor ÷ precio). Cuando la fila no trae valor, la cantidad queda «sin
dato» y el encargo lo dice.

## Sus APU vuelven solos: la biblioteca (10-nov-2026)

Cada vez que usted **guarda** un borrador, Detekta aprende el APU **completo** de las filas que lo traen: el que usted
cargó en su Excel (completo y cuadrado) o el que buscó la IA y usted aceptó con «Usar estos N precios». La próxima
vez que esa **misma actividad** (la misma descripción y la misma unidad) aparezca en cualquier presupuesto suyo,
«Calcular» la arma con ese APU, sin Claude, y la tabla dice Su APU con la fecha en que lo aceptó.

- Un precio que usted teclee, el de su archivo y el precio corregido por código mandan sobre la biblioteca.
- Los precios del APU son los de la fecha en que lo aceptó: no se reajustan solos, y si tienen más de 6 meses la
  pantalla le pide revisarlos.
- La biblioteca entra en la copia de sus datos.

## El modelo abierto: «Buscar» sin Claude (apagado hasta que usted lo encienda)

Con tres variables en Vercel, «Buscar» deja de esperar a Claude y arma los APU con un **modelo de lenguaje abierto**
(por ejemplo, Qwen3-32B, licencia Apache-2.0) servido por un proveedor de pago por uso:

| Variable | Qué va |
|---|---|
| `MODELO_APU_URL` | la dirección de chat del proveedor (compatible con la API de OpenAI; por ejemplo, la de DeepInfra) |
| `MODELO_APU_CLAVE` | la clave del proveedor (es una contraseña: solo en Vercel) |
| `MODELO_APU_NOMBRE` | el modelo, por ejemplo `Qwen/Qwen3-32B` |

Cómo trabaja: por cada ítem busca los 5 **APU reales** más parecidos y de la misma unidad (INVIAS, EPC, contrato
Nogal), los costea con el motor en el departamento de la obra y le da al modelo una **lista cerrada** de insumos con
su precio. El modelo solo elige insumos de esa lista y pone cantidades; **ningún precio lo escribe el modelo**. Lo
que vuelve pasa por la misma verificación que la sesión y el chat. Sin APU reales de la misma unidad, el ítem
queda sin precio y se dice. Las filas que traen su propio APU no las toca: esas las completa la sesión o el chat.

Costo de referencia (no medido en uso real): DeepInfra publicaba el 10-nov-2026 0,08 USD por millón de tokens de
entrada y 0,28 de salida para Qwen3-32B; un APU de unos 3.000 tokens de ida y 3.000 de vuelta ronda 0,001 USD.
La calidad en español con APU colombianos **no está medida**: antes de usarlo para ofertar, pruébelo con 30 ítems
suyos contra lo que arma Claude.

## Quién atiende «Buscar»: tres vías, de la más automática a la más manual

El servidor no tiene clave de API y no la necesita: los APU los escribe **una sesión de Claude Code con la
suscripción del dueño** (decisión del 3-sep-2026) o **el chat que el dueño ya usa**. La aplicación pone el
contexto (obra, lugar, salario mínimo, factor prestacional), los ítems y la forma exacta de la respuesta, y
**verifica** lo que vuelve (aritmética, unidad, fuente de cada material). Nada entra al costo sin un clic.

### Vía 1 · «Buscar» despierta la rutina (automática; hay que configurarla una vez)

Las rutinas de Claude Code admiten un **disparo por HTTP**: `POST https://api.anthropic.com/v1/claude_code/routines/<id>/fire`
con el token de esa rutina. Cuando el usuario pulsa «Buscar», el servidor deja la solicitud en cola y, si
tiene `RUTINA_PRECIOS_URL` y `RUTINA_PRECIOS_TOKEN`, dispara la rutina con el texto
`id_borrador=<id> perfil=<perfil>`; la sesión que se abre ejecuta `/precios <id> <perfil>`, manda el
progreso y devuelve los APU. El texto llega a la rutina dentro de un bloque `routine-fire-payload` marcado
como dato: un identificador y un perfil, nada más.

**Cómo dejarla configurada (una vez, con clics)** — el paso a paso con los botones literales está en
`docs/CONFIGURACION_TOKENS.md` § «3.9 · `RUTINA_PRECIOS_URL` y `RUTINA_PRECIOS_TOKEN`». En resumen:
1. <https://claude.ai/code/routines> → la rutina **«Servicio al cliente · Precios»** (creada el
   13-sep-2026 desde la sesión, sin horario: solo corre cuando «Buscar» la llama). Lápiz → en
   **«Select repositories»** tiene que estar `Mauricio7x/portafolio-estrategico`: medido, salió SIN él, y
   sin repositorio la sesión no tiene la habilidad `/precios`.
2. Lápiz → **«Select a trigger»** → **«Add another trigger»** → **«API»** → copiar la **URL** →
   **«Generate token»** → copiar el token.
3. Un entorno propio con la red abierta, no el «Default» que comparten las demás rutinas: en
   <https://claude.ai/code>, el botón de nube encima del cuadro de mensaje → **«Add cloud environment»** →
   nombre **Detekta · Precios** → **«Network access»**: **«Full»** → **«Create environment»**; y en la rutina,
   elegir ese entorno, **Detekta · Precios** (con la red por defecto la sesión no alcanza la aplicación: 403 del proxy de egreso,
   medido el 12-sep-2026).
4. Vercel → las dos variables → **Redeploy**.

**Lo que la aplicación hace y no hace con el disparo.** Un segundo «Buscar» sobre el mismo borrador dentro
de los quince minutos siguientes **no abre otra sesión** (cada disparo gasta una corrida del día; el candado
es atómico en Redis, así que dos pulsaciones a la vez tampoco), y una sesión que está trabajando (progreso
de hace menos de dos horas) no se pisa. Si el disparo falla (token rechazado, cuota agotada, red), la
solicitud queda registrada igual y la pantalla dice el motivo en palabras llanas. Una solicitud despertada que
**media hora después** sigue sin señales, o una sesión que lleva **dos horas** sin mandar progreso, se marca
«sin atender»: la sesión no llegó o enmudeció (red del entorno cerrada, cuota, token caducado). El token de la rutina nunca sale en
un mensaje. Y el disparo es una OBSERVACIÓN, no una promesa: una sesión abierta puede terminar sin hacer
el trabajo (una corrida «verde» en claude.ai/code/routines solo dice que la sesión arrancó y terminó sin
error de infraestructura); por eso la pantalla enseña el avance real y no un plazo.

**Cuánto gasta.** Cada «Buscar» descuenta de la suscripción como una sesión normal y cuenta para el tope
diario de corridas de rutinas (<https://claude.ai/code/routines>). Es la objeción que apagó la rutina
horaria del 4-sep-2026 (revisar la cola cada hora gastaba sin trabajo); despertarla solo cuando hay una
solicitud la resuelve.

### La rutina

Su encargo es un puntero, no una copia: las instrucciones viven en `.claude/skills/precios/SKILL.md`,
versionadas y atadas por la suite, y una copia en claude.ai quedaría vieja a la primera corrección
(26-sep-2026). Si hay que crearla a mano (**«New routine»** en <https://claude.ai/code/routines>,
repositorio `Mauricio7x/portafolio-estrategico`, trigger **API**), su texto es este:

```
Usted es la rutina «Servicio al cliente · Precios»: la dispara el botón «Buscar» de la pestaña
Precios. Ejecute la habilidad /precios del repositorio Mauricio7x/portafolio-estrategico tal como la
describe .claude/skills/precios/SKILL.md, incluido el párrafo que dice cómo leer el bloque
routine-fire-payload cuando la sesión la abre una rutina. No toque código ni abra ramas o pull requests: su trabajo
es atender la cola. Si no tiene el repositorio, diga en una línea que la rutina no tiene repositorio
adjunto y que se añade en claude.ai/code/routines → esta rutina → lápiz → Repositorios, y termine.
```

### Vía 2 · El puente por chat (funciona hoy, sin configurar nada)

Es lo que el dueño ya hace a mano, con la aplicación poniendo lo que cuesta reunir. En el paso 2, bajo el
botón Buscar, el pliegue **«Hacerlo con su chat de inteligencia artificial»**:
1. **«Copiar el encargo»**: la aplicación guarda el borrador y copia al portapapeles el prompt de ingeniero
   de costos con el contexto puesto (obra, lugar, fecha, moneda, salario mínimo, factor prestacional), la
   lista de ítems (los títulos de capítulo fuera; los que ya traen precio, dichos) y la forma exacta de la
   respuesta. Si el navegador no deja copiar solo, el texto queda en un cuadro seleccionado para Ctrl+C.
2. Péguelo en el chat que use (por ejemplo, el de su suscripción) y espere la respuesta.
3. Pegue la respuesta completa en **«Respuesta del chat»**: al pegar, la aplicación saca el objeto de entre
   el saludo y las vallas de código, lo pasa por la MISMA verificación
   que la de una sesión (aritmética con 1,5 % de tolerancia, unidad de la fila, fuente de cada material) y
   enseña los APU bajo el botón Buscar, con **«Usar estos N precios y calcular»**. Lo que no cuadra se
   aparta con su motivo; si el chat contestó con tablas y no con el objeto, la pantalla dice qué pedirle.
   Cada respuesta pegada reemplaza a la anterior.

Por HTTP: `GET /api/apu?op=ia&encargo=1&id=<id>&perfil=<perfil>` devuelve el texto; `POST /api/apu?op=ia` con
`{perfil, id, motor: "pegado", texto}` recibe la respuesta.

### Vía 3 · `/precios` a mano en una sesión de Claude Code

Abra <https://claude.ai/code> con el repositorio (rama main) y escriba `/precios`; para un solo borrador,
`/precios <id_del_borrador> helder`. Exige que el entorno de esa sesión alcance la aplicación (Network
access: Full o Custom con `detekta-app.vercel.app`) y, con el muro de Vercel en todo el sitio (17-oct-2026),
que tenga `VERCEL_AUTOMATION_BYPASS_SECRET` entre sus variables de entorno: sin ese pase la aplicación responde 302
«Protected by Vercel Authentication». La misma variable la necesita el entorno de las rutinas.

## Ver la cola sin abrir Claude Code

```
https://detekta-app.vercel.app/api/apu?op=ia&pendientes=1&token=<SU_TOKEN>
```

Responde `total`, `en_cola` y cada solicitud con estado (`en_cola`, `buscando` con `progreso`, `listo`) y, desde el
13-sep-2026, `despertada` (null: sin rutina configurada; `ok`, `el`, `sesion_url`, y si falló `motivo` —el de la
pantalla, en palabras llanas— y `detalle` —el técnico, con el código de respuesta y qué variable revisar—;
`indeterminada: true` cuando el disparo expiró y la sesión puede haber arrancado igual).

## Cuánto tarda: no se promete, se mide (5-sep-2026)

La pantalla **no dice ningún plazo**. Decía «suele ser en menos de una hora», que era el periodo con el que
una rutina revisaba la cola —el ajuste del programador—, no un tiempo medido: nunca se calculó la mediana ni el
percentil 90 de lo que de verdad tarda. Lo que la pantalla dice ahora es el hecho: la solicitud quedó
registrada, si la rutina se despertó, y el avance real cuando la sesión empieza.

Los dos sellos para medirlo **ya se escriben en cada solicitud** y sobreviven 30 días con el borrador:

- `solicitado_el` — cuando el usuario pulsó «Buscar» (lo escribe `POST /api/apu?op=ia` con `solicitar:true`).
- `respondida_el` — cuando la propuesta quedó guardada (lo escribe el `POST` con `propuesta` o con `texto` pegado).

Con esos dos campos de varias solicitudes atendidas se calculan la mediana y el percentil 90 (`respondida_el
− solicitado_el`). **Solo cuando esa cifra exista y esté escrita con su fecha de medición** puede volver un
plazo a la pantalla, y entonces se dice como hecho medido («la mayoría, en menos de N minutos»), nunca como
promesa.

Mientras tanto, `GET /api/apu?op=ia&id=…&perfil=…` devuelve además `edad_min` (los minutos que lleva la
solicitud en cola, o `null` si no se sabe cuándo entró) y marca el estado **`sin_atender`** cuando pasa de
`umbral_sin_atender_min`: 180 minutos (tres horas) si nadie fue despertado, **30 minutos si la rutina sí lo
fue** y no ha dado señales. La pantalla lo enseña con lo que hay que hacer. La cola (`&pendientes=1`) no
cambia: allí la solicitud sigue siendo `en_cola`, que es lo que busca quien la atiende.

## Lo que la aplicación verifica antes de enseñar un APU

- La aritmética de cada componente y del subtotal (tolerancia 1,5 %): lo que no cuadra se aparta y el ítem
  queda sin precio, con el motivo.
- La unidad del ítem (un APU en m² para una fila en m³ se aparta).
- Cada material trae la fuente de su precio (nombre; dirección web y fecha cuando existen).
- Nada entra al costo hasta que el usuario pulsa «Usar estos N precios y calcular».
- Si el ítem traía el APU del usuario: que no falte ninguno de sus insumos, que su cantidad, su desperdicio, su precio y el porcentaje de la herramienta menor no hayan cambiado (0,5 % de tolerancia de redondeo), y que todo precio buscado traiga fuente. El origen de cada línea lo decide la aplicación, no la respuesta.

## Lo que NO hace

- No busca precios desde el servidor: busca la sesión o el chat. El servidor solo DESPIERTA a la rutina.
- No inventa: lo que no se pudo calcular vuelve sin precio y con su supuesto.
- No garantiza un precio de proveedor: son precios promedio de mercado con fuente; verifique antes de
  presentar.
- No llama a la API de Anthropic con clave: decisión del dueño (3-sep-2026). Si algún día se quisiera que el
  servidor lo hiciera solo y sin sesión, el cliente HTTP ya existe en `lib/dictamen.js` (motor «modelo» del
  dictamen) y se pagaría por uso.

## Dónde vive en el código

Las coordenadas exactas las da `node tests/mapa.js ia` (módulos, quién los llama, la `op` que llega
hasta ellos y las secciones de la memoria que hay que leer antes de tocarlos). Este documento no las
repite: una lista de rutas y funciones es un dato de ESTADO y miente a la primera reestructuración —
ya pasó con «tres pestañas» y con los routers sueltos que la Fase 0 plegó (6-sep-2026).
