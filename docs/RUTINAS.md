# Rutinas programadas · qué pueden hacer, qué no, y cómo se crea una que funcione

> Para: dueño · Estado: referencia · Sustituido por: —

**Fecha:** 13-sep-2026. Todo lo que sigue está MEDIDO ese día; lo que no se midió se dice.

**Medido el 26-sep-2026: en la cuenta no hay ninguna rutina programada.** La única rutina viva es
«Detekta · atender la cola de Precios», sin horario (la despierta «Buscar»). Los tres encargos de
abajo están escritos, no creados: hasta que el dueño los cree en la web, nadie corre la suite de
madrugada, nadie mira producción por la mañana y nadie avisa en diciembre del salario mínimo.

Una rutina es una sesión de Claude Code que arranca sola a una hora fija, corre en la nube y deja su
resultado en la lista de sesiones. Sirve para el trabajo que se repite y que nadie recuerda: mirar si
producción sigue viva, correr la suite de madrugada, o acordarse en diciembre de que sale el decreto
del salario mínimo.

## Lo primero, porque cuesta caro no saberlo

**Una rutina creada desde dentro de una sesión NO FUNCIONA.** La herramienta que una sesión tiene para
crearlas no puede adjuntar el repositorio, así que la rutina se guarda con la lista de repositorios
VACÍA. La sesión que dispara arranca sin árbol, sin `CLAUDE.md` y sin nada que verificar: piensa un
rato y se apaga.

Y termina en **verde**. Ese «SUCCEEDED» solo dice que la sesión arrancó y salió sin error de
infraestructura — no que hiciera el trabajo. Es el fallo mudo de siempre, esta vez fuera del código.

Lo medido el 13-sep-2026, cuatro disparos de rutinas creadas así:

| Disparo | Duró | Qué dejó |
|---|---|---|
| «La suite y el navegador de madrugada», a mano | 68 s | nada |
| La misma, por su horario (06:03:14 → 06:04:33) | 79 s | nada · estado «SUCCEEDED» |
| Una comprobación, pidiéndole empujar una rama | 121 s | nada |
| Una comprobación, pidiéndole abrir una incidencia | 291 s | nada |
| **Una sesión creada con el repositorio adjunto** | ~2 min | **abrió la incidencia que se le pidió** |

La suite sola tarda unos cuatro minutos: ochenta segundos no alcanzan ni para empezarla.

## Cómo se crea una que sí funcione

Se crea **en la web**, que es donde existe el selector de repositorios:

1. **claude.ai/code/routines** → **New routine**.
2. Nombre y **encargo**. El encargo es UNA línea que apunta aquí, no una copia del bloque: una copia
   pegada en claude.ai se queda vieja a la primera corrección y nadie lo nota. Para la rutina 1:
   «Lea docs/RUTINAS.md § «1 · La suite y el navegador de madrugada — diaria, 1:00 en Colombia» y
   ejecute tal cual el encargo de su bloque de código; si no tiene el repositorio, diga que la
   rutina no tiene repositorio adjunto y que se añade en claude.ai/code/routines → esta rutina →
   lápiz → Repositorios.» Las otras dos, igual, con su título.
3. **Repositorios** → `Mauricio7x/portafolio-estrategico`. **Este es el paso que lo cambia todo.**
4. **Entorno**: el que haya. Si la rutina tiene que hablar con Detekta o con fuentes colombianas,
   antes hay que abrirle la red (ver «Lo que falta del entorno»).
5. **Trigger** → **Schedule**, con la hora en su zona horaria (la convierte sola).
6. **Connectors**: déjelos. Sin ellos la sesión no tiene las herramientas de GitHub.
7. **Create**, y después **Run now** para comprobarlo: si tarda minutos en vez de segundos, funciona.

## Lo que falta del entorno

- **La red.** El entorno «Default» solo alcanza GitHub, Anthropic y los registros de paquetes.
  `portafolio-estrategico.vercel.app`, `datos.gov.co`, `community.secop.gov.co` y las tiendas de
  precios responden **403 del proxy de egreso** (medido el 12 y el 13-sep-2026). Con la red así, ni
  la skill `/precios` ni la `/dictamen` pueden ejecutarse: las dos empiezan pidiéndole el expediente
  al servidor. Se abre en claude.ai/code → el entorno → **Red: Custom** → dominios permitidos,
  marcando «incluir la lista por defecto».
- **El secreto `CRON_SECRET` en GitHub.** Sin él, el flujo «Actualización de la tarde» responde 401 y
  falla todos los días. Se crea en Settings → Secrets and variables → Actions, con el MISMO valor que
  ya tiene la variable `CRON_SECRET` de Vercel.

## Qué escribir en el encargo, y qué no

- **El encargo se ejecuta sin nadie mirando y sin pedir permiso**: no hay diálogos de aprobación
  durante una corrida. Lo que no quiera que pase, dígalo en el encargo.
- **Empiece comprobando que hay repositorio.** Si no lo hay, que termine diciéndolo, no dando vueltas.
  Un aviso que dice la verdad vale más que una corrida en verde que no hizo nada.
- **Cada disparo es una sesión nueva**: no recuerda el anterior. Lo que haya que comparar con ayer
  tiene que viajar en el propio aviso, o vivir en el repositorio.
- **Una rutina no aprueba nada.** No sustituye la suite ni vuelve MEDIDO lo que nadie ejecutó.
- **No copies las reglas duras dentro del encargo: llámalas.** Estos encargos remiten a CLAUDE.md
  § «Reglas duras». Cuatro copias de una
  regla divergen a la primera corrección — que es justo lo que pasó el 13-sep-2026 con la frase «el
  curl lo bloquea el clasificador, no insistas por ahí», que se quedó vieja el mismo día en tres
  sitios a la vez.

---

# Los tres encargos

## 1 · La suite y el navegador de madrugada — diaria, 1:00 en Colombia

Existe porque `.github/workflows/suite.yml` corre en cada push y cada pull request pero **no tiene
horario y no abre ningún navegador**: un rojo por tiempo hoy no lo ve nadie, y la cerca de navegador
que CLAUDE.md exige no la corre ninguna máquina sola.

```
Eres una sesión programada de Detekta. Nadie está mirando. Tu encargo: ¿main sigue verde esta
madrugada, incluido lo que GitHub NO comprueba?

PASO 0 · ¿TIENES EL REPOSITORIO?
Ejecuta: test -f CLAUDE.md && pwd || find / -maxdepth 4 -name CLAUDE.md -not -path "*/node_modules/*" 2>/dev/null | head -3
Si no aparece ninguno, esta rutina está mal configurada y no puedes hacer nada. Termina
inmediatamente diciendo que no tiene repositorio adjunto y que se añade en
claude.ai/code/routines → esta rutina → lápiz → Repositorios. No lo disimules ni des vueltas.
Si sí aparece, entra en ese directorio: CLAUDE.md manda y se lee.

CONTEXTO MEDIDO, no lo redescubras
- La suite es enteramente offline y tarda unos 4 minutos por corrida.
- Esta rutina no necesita red: la suite corre sin red y el navegador sirve public/ en local.
- Las reglas duras del proyecto están en CLAUDE.md § «Reglas duras»: se leen de ahí y no se repiten
  aquí. Las que más te van a hacer falta son la de escribir hacia fuera y la del bloqueo del
  clasificador.

QUÉ HACER
1. node tests/estado.js. Anota el sha de main que verificas.
2. La suite con el patrón que exige CLAUDE.md (el código se mira SIN tuberías):
   node tests/e2e.js > /tmp/suite.txt 2>&1; echo CODIGO=$?; tail -5 /tmp/suite.txt
   Debe terminar 4/4 con código 0. Después node tests/apu_bench.js.
3. EL NAVEGADOR REAL, que ninguna prueba de Node ve. Playwright está global:
   require("/opt/node22/lib/node_modules/playwright") — no instales nada. Sirve public/ con
   python3 -m http.server 8099 y carga http://127.0.0.1:8099/index.html en Chromium a 390 y 1280 px,
   claro y oscuro. Comprueba consola sin errores (los 404 de /api/ son esperados en un servidor
   estático), sin desborde horizontal, ninguna letra bajo 11 px y ningún pulsable bajo 24 px.
   TRAMPA MEDIDA: un elemento que mide 0×0 NO es un aprobado — está en un panel oculto. Destapa sus
   ancestros antes de creerte la cifra, o di que no se pudo medir. Una ceguera que no se anuncia se
   lee como aprobación.
4. Segunda corrida con otro reloj: E2E_REDIS_LENTO_MS=4 node tests/e2e.js. El 7-sep-2026 tres
   defectos llegaron a main con la suite local en verde y solo se vieron en una máquina lenta.

CÓMO CERRAR
Si todo está verde: no abras rama, no escribas en la memoria, no toques un fichero. Cuatro líneas:
sha verificado, código y rótulo final de la suite, apu_bench, anchos medidos. Nada más.
Si algo está rojo: repróducelo antes de nombrarlo («flake» no es una causa raíz). Si la causa es
clara y el arreglo pequeño y estás segura: arréglalo, suite ENTERA a 4/4, comprueba que la cerradura
muerde por mutación, escribe al FINAL de docs/MEMORIA.md una sección con fecha que empiece por «En
una línea:», corre node tests/mapa.js --escribir y mete índice y mapa en el MISMO commit; sube a una
rama claude/… y abre el pull request. Nunca a main. Si el arreglo es grande o exige decidir algo del
negocio, NO toques el código: di qué falla, la reproducción exacta y qué propones.
Nunca saltes, desactives ni marques como pendiente una prueba para poner la suite en verde.
```

## 2 · El vigilante de la mañana — diaria, 7:00 en Colombia

Después de los dos crons de Vercel (sincronización 08:30 UTC, correo de avisos 11:00 UTC). **Necesita
la red abierta**; sin eso no puede hacer nada. Responde una sola pregunta: ¿hay algo roto que haya que
saber antes de empezar el día?

```
Eres el vigilante de la mañana de Detekta. Nadie está mirando. Respondes UNA pregunta: ¿hay algo roto
que el dueño deba saber antes de empezar el día? Si no lo hay, dilo en una línea y termina.

PASO 0 · ¿TIENES EL REPOSITORIO?
test -f CLAUDE.md && pwd || find / -maxdepth 4 -name CLAUDE.md -not -path "*/node_modules/*" 2>/dev/null | head -3
Si no aparece ninguno no puedes hacer nada: la llave de la aplicación sale de public/app.js, que está
en el repositorio. Termina diciendo que la rutina no tiene repositorio adjunto y dónde se añade.

PASO 0 bis · ¿SE ABRE LA PUERTA?
curl -s -o /dev/null -w "%{http_code}\n" --max-time 20 "https://portafolio-estrategico.vercel.app/api/procesos?op=salud"
Si responde 000 o 403 del proxy de egreso, para y di solo: «La red del entorno sigue cerrada: abra
claude.ai/code → el entorno → Red: Custom y permita portafolio-estrategico.vercel.app.»

LA LLAVE sale del repositorio, como hacen las skills. No la imprimas nunca:
TOKEN=$(grep -o 'const TOKEN = "[^"]*"' public/app.js | head -1 | cut -d'"' -f2)

QUÉ MIRAR · todo es LECTURA: ni un POST, ninguna sincronización
1. GET /api/procesos?op=salud — ok, motivo, edad_horas (umbral 30), ultimo_error,
   historico_hace_dias, aviso_por_correo.
   LO QUE MÁS IMPORTA: ok:true NO significa que la aplicación esté bien. Está medido que salud no
   mira el TAMAÑO del corpus: si SECOP renombra una columna del prefiltro, la sincronización descarta
   todas las filas, termina bien, escribe un corte fresco, y el latido sigue verde con la aplicación
   vacía.
2. Por eso el tamaño, con la llave: GET /api/diagnostico?perfil=helder → total_activo. Si es 0 o
   absurdamente bajo, es alarma aunque salud diga que va bien. Di la cifra SIEMPRE: cada disparo es
   una sesión nueva y no recuerdas ayer, así que la cifra viaja en el aviso y el dueño ve la deriva.
3. La cola de Precios: GET /api/apu?op=ia&pendientes=1 (cabecera x-historico-token) → en_cola y
   solicitado_el. Una solicitud de más de tres horas es una PERSONA esperando un precio: dilo con su
   antigüedad y el nombre del presupuesto.
4. El correo: GET /api/avisos?token=…&enviar=no → enviados, omitidos, fallos. Responde 200 CON
   ok:false cuando el proveedor falla: un 200 no es un éxito. Y perfiles_revisados: 0 se ve igual que
   un día tranquilo — dilo tal cual, sin interpretarlo.
5. GitHub, con las herramientas mcp__github__*: la última corrida de «Suite» y la de «Actualización
   de la tarde». Si alguna está en failure, di la causa en una frase.

CÓMO CERRAR
- Todo bien: UNA línea con total_activo, edad_horas, en_cola, historico_hace_dias. Nada más.
- Algo mal: qué está roto, desde cuándo si se puede saber, qué se rompe para el usuario, y el paso
  concreto para arreglarlo — con la URL completa y el nombre literal del botón si hay que tocar una
  pantalla.
- No arregles código ni abras ramas: tu trabajo es ver y avisar.
- Nunca inventes una cifra ni un motivo. Lo que no puedas medir va como «no medido», con el porqué.
```

## 3 · El primero de mes — el calendario del oficio

Doce corridas al año. Existe porque hay cifras que caducan solas en una fecha del calendario
colombiano, y cuando caducan no dejan un hueco: dejan un número equivocado, creíble y bien maquetado.

```
Eres la rutina mensual de Detekta: el calendario del oficio de las licitaciones en Colombia.

PASO 0 · ¿TIENES EL REPOSITORIO?
test -f CLAUDE.md && pwd || find / -maxdepth 4 -name CLAUDE.md -not -path "*/node_modules/*" 2>/dev/null | head -3
Si no aparece ninguno no puedes hacer nada —todo lo tuyo se lee de ficheros del repositorio—.
Termina diciendo que la rutina no tiene repositorio adjunto y dónde se añade.

MIRA QUÉ MES ES Y HAZ SOLO LO QUE TOCA. Si no toca nada, dilo en una línea y termina.

TODOS LOS MESES
- Frescura de los catálogos: _meta de data/apu_retail.json y data/apu_invias.json trae su fecha de
  captura. Si pasa de 60 días, dilo con la fecha y los días. Se refrescan con
  node tests/capturar_retail.js y node tests/capturar_invias.js — herramientas MANUALES con red que
  COMMITEAN su resultado: no las corras sin comprobar antes que la red alcanza esas tiendas, y si las
  corres, abre pull request con el diff y señala todo salto de precio superior al 25 %, que en un
  catálogo es sospecha, no dato.
- restanMeses en lib/perfiles.js: los contratos en ejecución llevan un número de meses ESCRITO A
  MANO, sin fecha de anclaje, y ese saldo se resta de la capacidad residual. El calendario avanza y
  el número no: la capacidad comprometida se sobrestima y la aplicación esconde procesos que el dueño
  sí podría tomar — y aquí el falso caro es el negativo. Recuérdaselo con las cifras de hoy y
  pregúntale las de verdad. No las cambies por tu cuenta.

DICIEMBRE · el salario mínimo del año siguiente
El decreto de salario mínimo y auxilio de transporte sale a mediados o finales de diciembre. Búscalo
en fuente oficial y cita número de decreto y fecha. Si ya salió: lib/perfiles.js tiene SMMLV como
literal y lib/parametros.js tiene DEFAULTS.smmlv editable desde «Mi empresa». ESTÁ ESCRITO DOS VECES,
y está medido que cambiar el parámetro mueve los APU pero NO la capacidad residual ni el dictamen
—que además publica origen_smmlv: «el configurado en la aplicación» sin serlo—. Abre pull request en
rama claude/… que actualice los dos sitios y el auxilio de transporte, con la cita de la fuente, y di
que la duplicidad sigue ahí. Si el decreto no ha salido, dilo y NO inventes ninguna cifra.

ENERO · la vigencia nueva
Comprueba que el salario mínimo y el auxilio de transporte del año en curso son los que están en el
código. Si diciembre no lo cerró, ciérralo ahora: el 1 de enero cada K, cada tope de RUP y cada mano
de obra de APU ya deciden con la cifra del año pasado. El Plan Anual de Adquisiciones se publica
antes del 31 de enero.

FEBRERO · el PAA
Mandamiento 5 del analista: «descargar el PAA en febrero y armar el calendario del año» — da seis
meses de ventaja sobre quien se entera el día del aviso. La aplicación ya lo consulta en vivo
(/api/paa): repasa que responde y que trae los próximos doce meses; si la fuente cambió de forma, dilo.

MARZO · el RUP
Se renueva antes del quinto día hábil de abril: avisa con la fecha límite exacta de este año,
contando los días hábiles. /api/admin/cobertura-rup responde CON QUÉ códigos conviene renovarlo. Mira
también la fecha de expedición de los certificados citados en lib/perfiles.js: con más de un año, los
indicadores son de un corte viejo.

REGLAS QUE NO SE NEGOCIAN
- Nunca inventes una norma, un decreto, un número ni un porcentaje: sin fuente va como «no se pudo
  verificar», con su motivo. Cita la reforma vigente, no la ley original modificada.
- Si el proxy responde 403, dilo en una línea y sigue con lo que sí puedas hacer desde el
  repositorio. Cómo se anota un bloqueo lo dice CLAUDE.md § «Reglas duras»; aquí no se copia.
- Cualquier cambio va en rama claude/… con pull request y la suite en 4/4. Nunca a main.
- Si escribes en docs/MEMORIA.md: al FINAL, con fecha, empezando por «En una línea:», y
  node tests/mapa.js --escribir en el MISMO commit.
```

## Lo que NO conviene poner en una rutina

- **Dictámenes con horario.** Un cron gastaría suscripción en pliegos que nadie pidió. El dictamen sí
  tiene su rutina, pero SIN horario: la despierta el botón de lectura completa cuando el dueño la pide
  (`docs/DICTAMEN_DESDE_CLAUDE_CODE.md` § «Desde un botón, sin abrir Claude Code (opcional)»).
- **Refrescar datos.** Eso es un cron de Vercel o un flujo de GitHub, no una sesión de Claude.
- **El arranque de sesión** (`mapa.js` + `estado.js`, 0,31 s): eso es un hook, no una rutina.
