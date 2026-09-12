# Precios · cómo funciona «Buscar» y quién lo atiende

> Para: dueño · Estado: referencia · Sustituido por: —

**Fecha:** 4-sep-2026 (tercera pasada) · **corregido el 12-sep-2026**: la rutina que este documento daba por viva no existe. **Para:** el dueño de Detekta (sin terminal: todo son URL y clics).

## Qué hace el usuario

1. **Paso 1 · Cargue el pliego o su análisis de precios**: suelta el PDF del pliego o el Excel/CSV con su
   APU (con o sin precios) en la zona «Suelte aquí el archivo». Los ítems entran a la lista.
2. **Paso 2 · Buscar los precios y armar los APU**: revisa la lista, escribe dónde es la obra (departamento,
   ciudad, qué obra es, condiciones del sitio) y pulsa **«Buscar»**. La pantalla dice **«Su solicitud quedó
   registrada»** y, cuando la sesión empieza, **«Buscando… completado x % (n de m ítems)»** con una barra. Puede cerrar la página: el resultado queda
   con el borrador.
3. Cuando termina, aparece cada ítem con su **costo directo** y su desglose (materiales, mano de obra,
   equipo, transporte, herramienta menor, con fuentes, rendimiento y supuestos), el **Análisis** (base de
   precios, fuentes, alertas de mercado) y el botón **«Usar estos N precios y calcular»**, que aplica los
   precios y muestra el **Paso 3 · Su precio** (con AIU, y el botón «Descargar mi presupuesto (Excel)»).
   Un precio que ya venía en su archivo se respeta.

## Quién atiende «Buscar»

El servidor no tiene clave de API. La orden la ejecuta una **sesión de Claude Code** con la suscripción del
dueño, siguiendo el prompt de ingeniero de costos (está en `lib/apu/precios_ia.js`, con el contexto de la
obra puesto automáticamente: lugar, fecha, salario mínimo y factor prestacional).

**Hoy se atiende A MANO, y solo a mano**: abra https://claude.ai/code con el repositorio
Mauricio7x/portafolio-estrategico (rama main) y escriba `/precios`. Para un solo borrador:
`/precios <id_del_borrador> helder`.

**Por qué no hay rutina, y qué decía este documento.** Hasta el 12-sep-2026 esta misma sección afirmaba
que una rutina en la nube («Detekta · atender la cola de Precios», creada el 4-sep-2026) corría cada hora
y atendía la cola sola. **No existe**: el listado de rutinas de la cuenta devuelve cero rutinas
recurrentes y ese identificador no aparece en ninguna. La memoria del 6-sep ya había decidido lo
contrario —«programarla como rutina consume la suscripción y por eso no se dejó activada»—, así que
durante ocho días el documento y la pantalla prometieron un servicio que la memoria daba por apagado.
La pantalla dejó de prometerlo el mismo día. La lección, que vale para cualquier automatismo futuro:
**una promesa cuyo cumplidor vive FUERA del repositorio caduca sin que ninguna prueba se entere**; lo
único que una cerradura puede defender es que la promesa no vuelva sola.

**Qué haría falta para que fuese automática**, el día que se decida:

1. **Abrir la red del entorno.** Medido el 12-sep-2026 desde una sesión en la nube: `curl` a
   `portafolio-estrategico.vercel.app` responde **403 del proxy de egreso** (denegación de política, no
   fallo de TLS), y lo mismo `www.datos.gov.co` y `community.secop.gov.co`; la herramienta de lectura web
   devuelve `EGRESS_BLOCKED` contra los mismos dominios. Con la red así, **ni `/precios` ni `/dictamen`
   pueden ejecutarse**: las dos empiezan pidiéndole el expediente al servidor. Se abre en
   claude.ai/code → el entorno → **Red: Custom** → dominios permitidos, manteniendo la lista por defecto.
2. **Despertar por evento, no por reloj.** Una rutina admite un disparo por HTTP
   (`POST …/routines/<id>/fire` con su propio token): `op=ia` puede despertarla en el momento en que el
   usuario pulsa «Buscar», y así solo se gasta suscripción cuando hay trabajo real —que era justamente la
   objeción que la apagó—. El token se genera a mano en claude.ai/code/routines: no lo crea la sesión.
3. **Tres salvaguardas, porque el servidor NO tiene candado** (medido: dos envíos simultáneos se aceptan
   los dos y gana el último): tomar solo `en_cola`; reclamarla con `progreso {hecho:0}` antes de empezar,
   que la saca de la cola y hace de candado de facto; y no tocar una `buscando` salvo que su
   `progreso.actualizado_el` pase de dos horas. Sin ellas, dos sesiones duplican el trabajo y un progreso
   tardío deja al usuario viendo «Buscando… 20 %» sobre un resultado que ya está guardado.

## Ver la cola sin abrir Claude Code

```
https://portafolio-estrategico.vercel.app/api/apu?op=ia&pendientes=1&token=<SU_TOKEN>
```

Responde `total`, `en_cola` y cada solicitud con estado (`en_cola`, `buscando` con `progreso`, `listo`).

## Cuánto tarda: no se promete, se mide (5-sep-2026)

La pantalla **no dice ningún plazo**. Decía «suele ser en menos de una hora», que era el periodo con el que
la rutina revisa la cola —el ajuste del programador—, no un tiempo medido: nunca se calculó la mediana ni el
percentil 90 de lo que de verdad tarda. Lo que la pantalla dice ahora es el hecho: la solicitud quedó
registrada y el resultado llega con su fuente cuando se atiende la cola.

Los dos sellos para medirlo **ya se escriben en cada solicitud** y sobreviven 30 días con el borrador:

- `solicitado_el` — cuando el usuario pulsó «Buscar» (lo escribe `POST /api/apu?op=ia` con `solicitar:true`).
- `respondida_el` — cuando la propuesta quedó guardada (lo escribe el `POST` con `propuesta`).

Con esos dos campos de varias solicitudes atendidas se calculan la mediana y el percentil 90 (`respondida_el
− solicitado_el`). **Solo cuando esa cifra exista y esté escrita con su fecha de medición** puede volver un
plazo a la pantalla, y entonces se dice como hecho medido («la mayoría, en menos de N minutos»), nunca como
promesa.

Mientras tanto, `GET /api/apu?op=ia&id=…&perfil=…` devuelve además `edad_min` (los minutos que lleva la
solicitud en cola, o `null` si no se sabe cuándo entró) y marca el estado **`sin_atender`** cuando pasa de
`umbral_sin_atender_min` (180 minutos = tres horas sin que nadie la atienda). La pantalla lo enseña con
lo que hay que hacer. La cola (`&pendientes=1`) no cambia: allí la solicitud sigue siendo `en_cola`, que
es lo que busca quien la atiende.

## Lo que la aplicación verifica antes de enseñar un APU

- La aritmética de cada componente y del subtotal (tolerancia 1,5 %): lo que no cuadra se aparta y el ítem
  queda sin precio, con el motivo.
- La unidad del ítem (un APU en m² para una fila en m³ se aparta).
- Cada material trae la fuente de su precio (nombre; dirección web y fecha cuando existen).
- Nada entra al costo hasta que el usuario pulsa «Usar estos N precios y calcular».

## Lo que NO hace

- No busca precios desde el servidor: busca la sesión.
- No inventa: lo que no se pudo calcular vuelve sin precio y con su supuesto.
- No garantiza un precio de proveedor: son precios promedio de mercado con fuente; verifique antes de
  presentar.

## Dónde vive en el código

Las coordenadas exactas las da `node tests/mapa.js ia` (módulos, quién los llama, la `op` que llega
hasta ellos y las secciones de la memoria que hay que leer antes de tocarlos). Este documento no las
repite: una lista de rutas y funciones es un dato de ESTADO y miente a la primera reestructuración —
ya pasó con «tres pestañas» y con los routers sueltos que la Fase 0 plegó (6-sep-2026).
