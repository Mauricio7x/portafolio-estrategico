# Tokens y variables de entorno · guía desde cero

> Para: dueño · Estado: referencia · Sustituido por: —

**Para quién es esto:** para el dueño de Detekta, sin conocimientos técnicos y sin terminal. Todo se
hace con clics en dos páginas web (Vercel y Upstash) y pegando URLs en Chrome. Nada de programar.

**Fecha:** 20-ago-2026. Las rutas de los menús de Vercel, Upstash, datos.gov.co y OCR.space son las
que estaban vigentes al escribir esto; **no se pudieron confirmar en vivo desde el entorno de
desarrollo** (el proxy responde 403 a todos los sitios externos, incluida la propia app). Si un menú
cambió de nombre, lo que hay que buscar va dicho en cada paso.

---

## 0. Lo primero: usted entra con su correo y su contraseña (desde el 17-oct-2026)

**Hasta el 17-oct-2026** la llave de la aplicación (`HISTORICO_TOKEN`) iba escrita dentro del código
de la página, y cualquiera que abriera el código fuente la leía y podía usar todo lo protegido. Ya
no: **la página no lleva ninguna llave**. Usted entra con **su correo y su contraseña**, una sola
vez, y ese Chrome lo recuerda **30 días**. Hay **una sola cuenta**, la suya, y nadie más puede
crear otra.

`HISTORICO_TOKEN` sigue existiendo, pero ahora es **una contraseña de verdad** que solo vive en
Vercel (y en GitHub y en el entorno de Claude Code, si los usa): sirve para crear su cuenta la
primera vez y para lo que funciona sin navegador (los flujos de GitHub, las rutinas de Claude Code).
Su valor **no va en ningún documento, chat ni archivo del repositorio**: si alguna vez lo ve escrito
en uno, cámbielo (§10).

### 0.1 · La puesta en marcha, en este orden (una sola vez)

1. **Despliegue** este cambio (se despliega solo al fusionarlo en `main`). Mientras en Vercel siga la
   llave vieja —la que estuvo escrita en el código de la página—, la pantalla «Crear su cuenta» **se
   niega sola** y le dice que primero la cambie: nadie que la haya leído puede crear la cuenta.
2. **Cambie `HISTORICO_TOKEN` en Vercel** por una cadena nueva, larga y aleatoria (§3.2), **anótela
   en un lugar privado ANTES de guardarla** y **vuelva a desplegar** (§5). Vercel no la vuelve a
   mostrar: una variable de tipo «Secret» —la del candado— no se puede ver ni copiar después de
   guardarla, solo reemplazar (documentación de Vercel, «Config and Secret environment variables»,
   leída el 18-oct-2026). En esta cuenta es una variable **compartida del equipo** (medido el
   17-oct-2026): «All Projects» → «Environment Variables» → pestaña «Shared» → los tres puntos «⋯»
   de su fila → «Edit» → el valor nuevo → «Save».
3. **Cree su cuenta** con esa llave nueva (§0.1 bis, abajo).
4. **GitHub**: ponga el mismo valor en el secreto `HISTORICO_TOKEN`, si lo creó (flujo de la carga
   completa; §10).
5. **Claude Code**: ponga el mismo valor en la variable de entorno `HISTORICO_TOKEN` del entorno de
   sus rutinas y de las skills `/dictamen` y `/precios` (claude.ai/code → el entorno → **Edit**).
6. **El muro de Vercel sigue puesto** («Vercel Authentication» en «All Deployments»): no lo quite.
   El pase `VERCEL_AUTOMATION_BYPASS_SECRET` (§3.5) debe estar en los secretos de GitHub y en el
   entorno de Claude Code, junto a `HISTORICO_TOKEN`: sin él, flujos, rutinas y skills chocan con el
   muro antes de llegar a la aplicación.
7. Con el muro puesto, quien abra la aplicación necesita además acceso al proyecto en Vercel: su
   correo y contraseña de Detekta solo sirven después de pasar el muro. Usted, dueño del proyecto,
   pasa solo si su Chrome tiene abierta la sesión de Vercel (si no, Vercel le pide entrar y lo
   devuelve a la aplicación); cualquier otra persona ve la pantalla de entrar de Vercel y, como
   mucho, «pedir acceso» (documentación de Vercel, «Restrict access to deployments with Vercel
   Authentication», leída el 18-oct-2026). Medido el mismo día en la vista previa: sin el pase,
   302 hacia `vercel.com/sso-api`.

### 0.1 bis · Crear su cuenta (sin terminal)

1. Tenga a mano la llave que anotó en el paso 2 de §0.1. **No se puede copiar de Vercel**: allí no
   se vuelve a ver. Si no la anotó, póngale una nueva en Vercel (§0.1, paso 2), anótela y vuelva a
   desplegar.
2. Abra la aplicación en Chrome → **Entrar con clave**. Como todavía no hay cuenta, la pantalla dice
   «Todavía no hay ninguna cuenta» y le pide cuatro cosas:
   - **Llave del servidor (la de la configuración del sitio)**: pegue la de su nota (paso 1).
   - **Su correo**.
   - **Contraseña (10 caracteres o más)**: distinta de la llave. Una frase que recuerde («la obra de la calle diez») sirve
     mejor que una palabra corta con símbolos.
   - **Repita la contraseña**.
3. Pulse **Crear su cuenta**. Entra directo a la aplicación.

Desde ese momento esa pantalla **queda cerrada para siempre**: aunque alguien tenga la llave, ya no
puede crear otra cuenta (la aplicación responde «La cuenta de esta aplicación ya existe»).

**Dos capas, desde el 17-oct-2026.** Delante de todo sigue **el muro de Vercel**: «Vercel
Authentication» en todo el sitio («All Deployments»), que pide iniciar sesión en Vercel antes de
entrar. Es gratis en el plan Hobby; la contraseña de Vercel («Password Protection») no existe en
Hobby (§9). Detrás del muro, **su sesión de dueño** (correo y contraseña): ninguna llave vive en la
página. (Lo que antes se escribía aquí —«el gate de clave del navegador no protege nada»— valía para la
clave que comparaba la pantalla; la entrada con correo y contraseña la comprueba el servidor.)

### 0.2 · Entrar, salir y lo que pasa si se equivoca

- **Entrar**: **Entrar con clave** → su correo y su contraseña → **Entrar**. Ese Chrome lo recuerda
  30 días; después vuelve a pedírselo.
- **Salir**: el enlace **Salir**, arriba a la derecha junto al perfil. Cierra la sesión en el
  servidor: aunque alguien hubiera copiado algo de ese Chrome, deja de valer en ese instante.
- **Si se equivoca varias veces seguidas** (5 con su correo desde la misma conexión, 20 desde la misma conexión, o 50 con su correo desde todas),
  la entrada se pausa unos minutos y la pantalla dice cuántos. Es a propósito: así nadie puede
  probar contraseñas sin fin.
- **Si su sesión termina con la aplicación abierta**, la pantalla de entrar aparece encima; entre de
  nuevo y vuelva a pulsar lo que estaba haciendo.
- **Si olvida la contraseña**: no hay correo de recuperación. Entre a <https://console.upstash.com>
  → su base → **Data Browser**, busque la clave `cuenta:dueno` y **bórrela**. Las sesiones viejas
  dejan de valer solas y la pantalla «Crear su cuenta» vuelve a aparecer: créela otra vez con la
  llave de Vercel (§0.1 bis).

### 0.3 · Las URL que pega en Chrome

Las direcciones de esta guía (`/api/sync?…`, `/api/admin?op=respaldo…`) se pegan **en el mismo
Chrome donde ya entró a la aplicación**: la sesión viaja sola y no hace falta añadir nada. Desde
otro navegador, o si no ha entrado, se puede añadir `&token=SU_LLAVE` al final (su llave de Vercel
en lugar de `SU_LLAVE`); esa llave queda en el historial del navegador, así que es mejor entrar.

---

## 1. Conceptos en 30 segundos

**¿Qué es una «variable de entorno»?** Un par *nombre = valor* que se guarda en Vercel, fuera del
código. El programa pregunta por el nombre y Vercel le entrega el valor. Sirve para que las
contraseñas no queden escritas en GitHub.

**Las tres reglas que más se olvidan:**

1. **El nombre va en MAYÚSCULAS y con guion bajo, exacto.** `HISTORICO_TOKEN` sí;
   `Historico_Token` o `HISTORICO TOKEN` no. No es «parecido»: es idéntico o no funciona.
2. **Una variable nueva no hace nada hasta que se vuelve a desplegar.** Vercel las inyecta al
   *construir* el sitio. Pegarla y cerrar la pestaña no cambia nada: hay que darle **Redeploy**
   (paso 4 de esta guía).
3. **El valor se pega limpio.** Sin comillas, sin espacios al principio ni al final, sin salto de
   línea. Un espacio invisible al final hace que el token «no cuadre» y no se ve por ninguna parte.

---

## 2. Parte A · GitHub: un solo secreto, y solo si quiere el segundo disparo

**En GitHub no hay ningún token que crear para que la aplicación funcione.** Hay un único secreto
opcional, y es una copia de una variable que ya tiene en Vercel.

Por qué, en concreto:

- El repositorio tiene **dos flujos de GitHub Actions** (desde el 6-sep-2026):
  `.github/workflows/suite.yml` corre la suite de pruebas en cada cambio y enseña un veredicto verde
  o rojo en la pestaña *Actions* y en cada *pull request* — **no necesita ninguna credencial**: las
  pruebas corren sin red, con imitaciones locales de datos.gov.co y de Upstash. Y
  `.github/workflows/sync.yml` repite, como respaldo, las dos actualizaciones diarias que dispara
  Vercel (7:50 a. m. y 8:00 p. m. de Colombia, horario del dueño desde el 30-sep-2026).
- **El único secreto** es el del segundo disparo: si usted creó `CRON_SECRET` en Vercel (§3.6), el
  mismo valor tiene que estar en GitHub → el repositorio → **Settings** → **Secrets and variables**
  → **Actions** → **New repository secret**, nombre `CRON_SECRET`, valor: el mismo de Vercel →
  **Add secret**. Sin él ese flujo sale rojo cada tarde con el motivo escrito, y la actualización de
  la mañana sigue funcionando igual.
- Lo único que conecta GitHub con Vercel es la **integración de Git de Vercel**: se autoriza una vez
  con la cuenta de GitHub y a partir de ahí cada `push` a la rama principal despliega solo. Eso no es
  un token que haya que copiar y pegar: se autoriza con un botón.

**Cómo verificar que esa conexión está viva** (1 minuto):

1. Entrar a <https://vercel.com> → el proyecto **portafolio-estrategico**.
2. **Settings → Git**.
3. Tiene que decir `Mauricio7x/portafolio-estrategico` como *Connected Git Repository*.
4. Si dice «Disconnected» o pide reconectar: pulsar **Connect** y autorizar con la cuenta de GitHub.

Si en la pestaña **Deployments** del proyecto los despliegues aparecen con el mensaje de los commits
recientes, la conexión funciona y no hay nada que tocar.

> Si alguna vez se ve un error de GitHub del tipo «no se pudo acceder al repositorio», el arreglo es
> **reautorizar la app de Vercel en GitHub** (GitHub → foto de perfil → *Settings* → *Applications* →
> *Vercel* → *Configure* → dar acceso al repositorio), no crear un *personal access token*.

---

## 3. Parte B · Vercel: las variables, una por una

Resumen de todo lo que existe. Solo las tres primeras son obligatorias.

| Nombre exacto de la variable | ¿Obligatoria? | Para qué sirve | Qué pasa si falta |
| --- | --- | --- | --- |
| `UPSTASH_REDIS_REST_URL` | **SÍ** | Dirección de la base de datos | La app no guarda ni lee nada: `503 Faltan UPSTASH…` |
| `UPSTASH_REDIS_REST_TOKEN` | **SÍ** | Contraseña de la base de datos | Igual que la anterior |
| `HISTORICO_TOKEN` | **SÍ** | Crear su cuenta la primera vez, y llave del servidor (flujos, rutinas) | No se puede crear la cuenta; `503` a lo que llegue sin sesión |
| `SOCRATA_APP_TOKEN` | Recomendada; necesaria en cuanto la usen varias personas a la vez | Identifica a la aplicación ante datos.gov.co, que así limita menos las consultas; el portal no publica cuántas por hora permite, con llave ni sin ella (manual del desarrollador de Datos Abiertos Colombia, CO_417, num. 4.1, consultado el 26-sep-2026) | Funciona igual hasta que datos.gov.co limite, y cuando lo agota la app dice «datos.gov.co limitó las consultas por unos minutos; vuelva a intentarlo» |
| `OCRSPACE_API_KEY` | Opcional | Leer pliegos **escaneados** (fotos) | Los pliegos con texto se leen igual; los escaneados no |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Obligatoria con el muro de Vercel (§3.5) | El pase del muro: las llamadas que la aplicación se hace a sí misma, las tareas de GitHub y las rutinas de Claude | La extracción larga se corta a mitad; las tareas de GitHub y las rutinas reciben 302 (o 401 si piden JSON) con «Protected by Vercel Authentication» |
| `ANTHROPIC_API_KEY` | Opcional (hoy no se usa, por decisión del dueño) | Que el dictamen del pliego lo escriba un modelo de Anthropic desde el servidor | Nada se rompe: el dictamen sale por reglas o desde una sesión de Claude Code (§3.7) |

---

### 3.1 · `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` — la base de datos

**Qué son.** Detekta guarda todas las licitaciones en Upstash, una base de datos en la nube. Estas
dos variables son la dirección y la contraseña. Van siempre **juntas**: una sin la otra no sirve.

**De dónde se sacan, paso a paso:**

1. Entrar a <https://console.upstash.com> con la cuenta con la que se creó la base
   (probablemente la misma de GitHub o de Google).
2. En la lista de bases de datos, hacer clic sobre la del proyecto (será una base de tipo **Redis**).
3. Bajar hasta el recuadro **REST API** (en algunas versiones se llama *Connect* → pestaña **REST**).
4. Ahí hay dos valores. Cada uno tiene un botón de copiar y un ojito para revelarlo:
   - `UPSTASH_REDIS_REST_URL` → algo como `https://us1-algo-12345.upstash.io`
   - `UPSTASH_REDIS_REST_TOKEN` → una cadena larga de letras y números
5. Copiar el primero, pegarlo en Vercel (paso 4 de esta guía) con el nombre
   `UPSTASH_REDIS_REST_URL`. Repetir con el segundo y el nombre `UPSTASH_REDIS_REST_TOKEN`.

**⚠️ El error clásico aquí:** copiar la **cadena de conexión de Redis** en vez de la REST. Si el
valor empieza por `redis://` o `rediss://`, **está mal**. Tiene que empezar por `https://` y terminar
en `.upstash.io`. La app habla con Upstash por HTTP, no por el protocolo de Redis.

**Si no existe todavía ninguna base de datos:** en Upstash → **Create Database** → tipo *Redis* →
región cercana (por ejemplo `us-east-1`) → plan **Free**. Al crearla aparecen los dos valores en el
mismo recuadro REST API.

**Alternativa que también funciona.** Si la base se creó desde el marketplace de Vercel
(*Storage → Upstash*), Vercel puede haber creado sola las variables con otros nombres:
`KV_REST_API_URL` y `KV_REST_API_TOKEN`. **El código acepta esos dos nombres como respaldo**, así que
si ya están ahí y funcionan, no hay que hacer nada. Lo que **no** hay que hacer es tener las cuatro
con valores de bases distintas: mandan las `UPSTASH_*` y las otras quedan ignoradas, lo que confunde
al depurar. Si hay duplicados, borre el par que no use.

---

### 3.2 · `HISTORICO_TOKEN` — la llave del servidor

**Qué es.** La llave de todo lo que no es la lista pública cuando lo pide algo que **no es un
navegador**: el flujo de GitHub de la carga completa, las rutinas y las skills de Claude Code
(`/dictamen`, `/precios`) y una URL con `&token=` pegada en la barra. Y es la que se escribe UNA vez
para **crear su cuenta** (§0.1). En la aplicación usted entra con correo y contraseña: la página no
la lleva ni la ve. El nombre es histórico (nació para la extracción del histórico).

**De dónde sale.** **La elige usted**: una cadena larga y aleatoria, de 32 caracteres o más (sirve
cualquier generador de contraseñas). Es una contraseña de verdad: no va en el código, ni en un
documento, ni en un chat.

- **Nombre de la variable:** `HISTORICO_TOKEN`
- **Valor:** su cadena aleatoria. Sin comillas ni espacios.
- Si usa el flujo de GitHub de la carga completa, el mismo valor va en GitHub → **Settings → Secrets
  and variables → Actions** → secreto `HISTORICO_TOKEN`.
- Si usa las rutinas o skills de Claude Code, el mismo valor va en el entorno de Claude Code
  (claude.ai/code → el entorno → **Edit** → variables de entorno), con el nombre `HISTORICO_TOKEN`.

**Cómo se comprueba que quedó bien:** entre a la aplicación (después de haber iniciado sesión en
Vercel para pasar el muro) y pegue en ese mismo Chrome:

```
https://detekta-app.vercel.app/api/resumen?perfil=helder
```

- Si responde un texto largo con cifras → **correcto** (entró con su sesión).
- Si responde `401` → no ha entrado en ese Chrome: entre primero (§0.2).
- Si responde `503` diciendo «HISTORICO_TOKEN no está definida» → la variable **no existe** (sin
  ella tampoco se puede crear la cuenta).

---

### 3.3 · `SOCRATA_APP_TOKEN` — el cupo de datos.gov.co

**Qué es.** Todos los datos de licitaciones salen de `datos.gov.co`, que funciona sobre una
plataforma llamada Socrata. **datos.gov.co no publica cuántas consultas por hora permite, con llave ni
sin ella** (manual del desarrollador de Datos Abiertos Colombia, CO_417, num. 4.1, consultado el 26-sep-2026): no hay fuente colombiana para ninguna cifra de cupo, y por eso aquí no se da ninguna
—las «unas 100 por hora» que circulaban antes tampoco tenían fuente—. No es una contraseña de nada suyo: es un
identificador de aplicación para que no lo confundan con tráfico anónimo.

**Es opcional mientras la use una sola persona.** Sin ella la app funciona; cuando datos.gov.co
limita, la pantalla dice «datos.gov.co limitó las consultas por unos minutos; vuelva a intentarlo».
Pero cada proceso guardado que se abre en Mis procesos cuesta hasta 4 consultas (quiénes se presentaron,
veces ante la entidad, ganadas y contratos vigentes; medido en el código el 6-sep-2026) y la
sincronización diaria baja páginas de 5 000 filas: **en cuanto la usen varias personas a la vez,
configúrela**.

**De dónde se saca:**

1. Entrar a <https://www.datos.gov.co> y **crear una cuenta** o iniciar sesión (arriba a la derecha,
   *Iniciar sesión* / *Sign In*).
2. Ir al perfil: clic en el nombre de usuario → **Perfil** → **Configuración del desarrollador**
   (en inglés: *Developer Settings*). La ruta directa suele ser
   `https://www.datos.gov.co/profile/edit/developer_settings`.
3. Pulsar **Create New App Token** / *Crear nuevo token de aplicación*.
4. Le pedirá un nombre y una descripción de la aplicación: escriba `Detekta` y
   «Consulta de procesos de contratación pública». La URL puede quedar en blanco o poner
   `https://detekta-app.vercel.app`.
5. Al guardar aparece el **App Token**: una cadena de letras y números. Ese es el valor.

- **Nombre de la variable:** `SOCRATA_APP_TOKEN`
- **Valor:** el *App Token* (NO el *Secret Token*, si le muestra los dos)

**⚠️ Aquí ya hubo un incidente real y conviene no repetirlo.** El 16-ago-2026 producción estuvo
**14 horas sin sincronizar** porque el valor pegado no era el correcto: Socrata responde `403
«Invalid app_token specified»` a cualquier token que no reconozca. Desde entonces la app se defiende
sola —si el token es rechazado, reintenta sin él y sigue funcionando— pero **avisa**. Se ve así:

```
https://detekta-app.vercel.app/api/sync?modo=auto
```

Si en la respuesta aparece `"app_token_rechazado"`, el token está mal. **Y entonces es preferible
borrar la variable a dejarla mal puesta**: sin variable la app trabaja con el cupo pequeño y sin
sobresaltos; con una variable equivocada gasta un reintento en cada consulta.

---

### 3.4 · `OCRSPACE_API_KEY` — leer pliegos escaneados

**Qué es.** El lector de pliegos abre el PDF en el propio navegador. Eso funciona con cualquier PDF
que tenga texto. Pero algunos pliegos son **fotos escaneadas**: el PDF no tiene letras, tiene una
imagen de las letras. Para esos, la app manda las páginas a un servicio gratuito (OCR.space) que las
lee y devuelve el texto.

**Es opcional.** Sin ella todo funciona salvo esa función concreta, y la app lo dice con un mensaje
claro en vez de fallar.

**De dónde se saca:**

1. Entrar a <https://ocr.space/ocrapi>.
2. En el formulario **Register for free API key** (registro gratuito), poner el correo electrónico.
3. Llega un correo con la clave (una cadena tipo `K81234567988957`).

- **Nombre de la variable:** `OCRSPACE_API_KEY`
- **Valor:** la clave del correo

El plan gratuito da **25.000 peticiones al mes**, de sobra para este uso. La clave **nunca sale al
navegador**: la usa el servidor y, si OCR.space devuelve un error que la repite dentro del texto, la
app la tacha antes de mostrarlo.

---

### 3.5 · `VERCEL_AUTOMATION_BYPASS_SECRET` — el pase del muro de Vercel

**Qué es.** Con el muro de Vercel en todo el sitio («Vercel Authentication» en «All Deployments»,
decisión del dueño del 17-oct-2026), toda llamada que no venga de un navegador con la sesión de
Vercel iniciada recibe **302 «Protected by Vercel Authentication»**, o **401 «Protected deployment»** si
pide JSON (medido el 17-oct en una versión de prueba). Eso incluye:

- las llamadas que la aplicación se hace a sí misma: la sincronización y el histórico bajan en
  tandas de 45 segundos y cada tanda llama a la siguiente; sin el pase **la cadena muere a la primera
  tanda** sin dar ningún error;
- las tareas de GitHub que llaman a producción (`sync.yml`, `latido.yml`, `carga_completa.yml`);
- las rutinas de Claude (Precios, dictamen, el vigilante de la mañana y la del primero de mes).

Este secreto es el pase que deja atravesar el muro a todas ellas. Va en **tres sitios** con el mismo
valor: Vercel (que lo crea), GitHub (secreto del repositorio con ese mismo nombre) y las variables
de entorno del entorno de Claude donde corren las rutinas («Detekta con internet»). Sin el secreto,
curl no manda la cabecera y todo sigue como sin muro.

Medido el 17-oct-2026 con el muro puesto: el latido de GitHub y el «Run» de una tarea programada de
Vercel responden 200, y sin el pase la producción responde 302. Las tareas de Vercel pasan el muro
por su cuenta: no llevan nada de esto.

**De dónde se saca (Vercel):**

1. Vercel → el proyecto → **Settings** → **Deployment Protection**.
2. En el bloque **Protection Bypass for Automation**, pulsar **Add Secret**. Se abre la ventana
   **Add Bypass**, con dos cuadros:
   - el **primero es el valor del pase**, no un nombre: **déjelo vacío** y Vercel lo crea solo
     (así lo hizo el dueño el 17-oct-2026); si se escribe algo, Vercel exige exactamente 32
     caracteres («Secret must be 32 characters…»);
   - el **segundo es una nota** para recordar para qué es (por ejemplo, «GitHub y rutinas»).
3. Pulsar **Add Bypass** y copiar el pase de la fila nueva. No regenerarlo ni borrarlo después:
   invalida el pase en lo ya desplegado.
4. Vercel pone ese pase como variable de sistema `VERCEL_AUTOMATION_BYPASS_SECRET` en cada
   despliegue **nuevo**, si está marcada la casilla **Enable access to System Environment
   Variables** (página **Environment Variables** del PROYECTO, al final; marcada el 17-oct-2026).
   Después de crearlo hay que **volver a desplegar** (§5). Con eso la aplicación lo manda en las
   llamadas que se hace a sí misma.

**Dónde se guarda además:**

- **GitHub:** «Settings» → «Secrets and variables» → «Actions» → «New repository secret», con el nombre
  `VERCEL_AUTOMATION_BYPASS_SECRET`.
- **Claude:** claude.ai/code → el nombre del entorno «Detekta con internet» en la barra de arriba de
  la sesión → **Edit** → ventana «Editar entorno de nube» → cuadro **«Variables de entorno»** (el de
  abajo, formato `.env`): una línea `VERCEL_AUTOMATION_BYPASS_SECRET=` con el pase pegado después
  del `=` → «Guardar cambios». **No** en «Secretos de red» («Agregar secreto»), que pide un tipo de
  autorización y no es lo que leen las rutinas. La toma la sesión nueva siguiente, no la abierta.

**¿Cómo sé si el muro está activo?** Abra `https://detekta-app.vercel.app` en una ventana de
incógnito. Si le pide iniciar sesión en Vercel antes de ver nada, está activo.

**Síntoma de que falta:** la extracción histórica avanza un mes y se detiene. Al consultar el estado
(ver §7) dice `candado.tomado: false` y `extraccion.terminada: false`. Con la variable puesta, la
cadena continúa sola.

---

### 3.6 · `CRON_SECRET` — la guarda de la sincronización (opcional, recomendada)

**Qué es.** La sincronización (`/api/sync`, que Vercel dispara con dos crons: 7:50 a. m. y 8:00 p. m. de Colombia)
nació pública: cualquiera que conociera la URL podía lanzarla contra SECOP II y gastar el cupo de
Redis y de Vercel del proyecto. Con esta variable puesta, `/api/sync` solo acepta tres llamadores:
el cron de Vercel (que, según la documentación de Vercel, envía la cabecera
`Authorization: Bearer <CRON_SECRET>` a cada invocación cuando la variable existe), usted con su
sesión iniciada (la marca y «Actualizar datos» la llevan) o quien lleve la llave del servidor, y la
propia cadena de tandas. A todo lo demás responde `401` diciendo qué hacer.

**Sin la variable no cambia nada**: la sincronización sigue pública como hasta hoy, y
`/api/procesos?op=salud` lo dice con `"sincronizacion_protegida": false`.

**De dónde sale.** De ningún sitio: la elige usted. Una cadena larga y aleatoria (32 caracteres o
más; sirve cualquier generador de contraseñas). Esta sí es una contraseña: no va en el código ni en
ningún chat.

- **Nombre de la variable:** `CRON_SECRET` (exactamente así: es el nombre que Vercel reconoce para
  enviarlo al cron).
- **Valor:** la cadena aleatoria.
- Entorno *Production* (y los demás si quiere) → **Save** → **Redeploy** (§5).

**Cómo se comprueba que quedó bien:**

1. Pegar en Chrome `https://detekta-app.vercel.app/api/procesos?op=salud`: tiene que
   decir `"sincronizacion_protegida": true`.
2. Pegar `https://detekta-app.vercel.app/api/sync?modo=auto` en un navegador donde **no** haya
   entrado (una ventana de incógnito): tiene que responder `401` (antes respondía `200`).
3. Al día siguiente, otra vez `op=salud`: `ultima_sincronizacion` tiene que ser de esa mañana. Si
   no lo es, el cron no está pasando la guarda: quite la variable, vuelva a desplegar y avise —la
   marca (que lleva la llave) sigue sincronizando mientras tanto.

**Efecto en las URL que tenga pegadas en Chrome:** `/api/sync?modo=auto` necesita una credencial:
péguela en el Chrome donde ya entró a la aplicación (§0.3). La carga completa ya no se pega: va con
el botón de GitHub del §8, porque `modo=full` la empieza de cero en cada llamada.

---

### 3.7 · `ANTHROPIC_API_KEY` — el motor del dictamen del pliego (opcional; hoy no se usa)

**Qué es.** El dictamen de un pliego (la caja «Lo que exige este pliego» de Mis procesos y del lector)
puede escribirlo un modelo de Anthropic llamado desde el servidor. Para eso el servidor necesita una
clave de API de Anthropic, que se paga por uso. **Hoy la aplicación trabaja sin ella, por decisión del
dueño (3-sep-2026):** sin clave, el dictamen sale por reglas —lo que la aplicación ya mide y lee del
pliego— o lo escribe una sesión de Claude Code con la suscripción, sin cobro por uso
(`docs/DICTAMEN_DESDE_CLAUDE_CODE.md`). Ninguna pantalla se rompe sin la variable: la aplicación dice de
qué motor viene cada dictamen.

**Si algún día se quiere encender:** la clave se crea en la consola de Anthropic
(<https://console.anthropic.com>, sección *API Keys*; la ruta del menú no se pudo confirmar desde este
entorno) y es una contraseña de verdad: solo va en Vercel, nunca en un chat ni en el código. Nombre
exacto: `ANTHROPIC_API_KEY`. Tras pegarla, **Redeploy** (§5). Para apagarlo otra vez basta con borrar la
variable y redesplegar.

Con la clave puesta entran en juego cinco variables más, **todas con un valor por defecto correcto que
no hay que tocar** (están en el anexo del final, con lo que hace cada una).

---

### 3.8 · `CORREO_API_KEY`, `CORREO_REMITENTE` y `CORREO_DESTINO` — el aviso diario por correo (opcional)

**Qué es.** Cada mañana la aplicación puede mandarle un correo con lo que cierra hoy o mañana, lo que
cambió en un pliego y el plazo para avisar que le interesa: exactamente lo mismo que le enseña el
centro de alertas de la pestaña Mis procesos. Lo dispara un segundo cron de Vercel
(`/api/avisos`, 11:00 UTC ≈ 6 de la mañana en Colombia). El correo solo sale cuando hay algo que
avisar: un día sin correo es un día sin avisos.

**Sin estas variables no se rompe nada**: la aplicación funciona igual, el centro de alertas sigue
en su sitio y la dirección `/api/avisos` responde diciendo qué falta y qué se habría enviado.

**De dónde salen.** De un proveedor de correo por interfaz web (la aplicación habla con Resend; su
plan gratuito y sus condiciones los confirma usted en la página del proveedor, porque desde la
sesión de trabajo no se pudo abrir ninguna página de precios). Los pasos:

1. Abrir <https://resend.com> → **Sign up** y crear la cuenta.
2. En el panel del proveedor, **Domains** → **Add Domain**: escriba el dominio desde el que quiere
   que salga el correo y siga las instrucciones que le dé para verificarlo. Si no tiene dominio
   propio, el proveedor le indica una dirección de pruebas que sirve para empezar; ese es el valor
   de `CORREO_REMITENTE` y hay que copiarlo tal cual del panel, sin inventarlo.
3. En **API Keys** → **Create API Key**: nombre `Detekta`, permiso de envío → **Add**. Copie la
   clave: solo se enseña una vez.

**Cómo se pegan en Vercel** (§4 lo explica con clics): <https://vercel.com/dashboard> → el proyecto
→ **Settings** → **Environment Variables** → **Add New**, una por una:

- **`CORREO_API_KEY`** — la clave que acaba de copiar. Es una contraseña: no va en el código ni en
  ningún chat.
- **`CORREO_REMITENTE`** — la dirección desde la que sale el aviso, copiada del panel del proveedor
  (por ejemplo `avisos@sudominio.com`). El proveedor rechaza cualquier otra.
- **`CORREO_DESTINO`** — su dirección de correo, a la que quiere que llegue el aviso.
- **`CRON_SECRET`** (§3.6) — **hace falta también para esto**: el aviso exige credencial siempre
  (manda correo y su respuesta enseña sus procesos guardados), y sin `CRON_SECRET` el cron de cada
  mañana no tiene cómo identificarse. Si ya la creó, no hay que hacer nada más.

Entorno *Production* → **Save** → **Deployments** → **Redeploy** (§5): las variables de entorno solo
entran en despliegues nuevos.

**Cómo se comprueba que quedó bien.** Pegue en el Chrome donde ya entró a la aplicación (§0.3):

```
https://detekta-app.vercel.app/api/avisos?enviar=no
```

`enviar=no` calcula el aviso y le enseña el texto SIN mandarlo, en `vista_previa`. Si en `correo`
aparece `"configurado": false`, la lista `falta` dice qué variable no llegó y `que_hacer` qué hacer.
Quitando `&enviar=no` el correo sale de verdad; el mismo día no se envía dos veces, y si el
proveedor falla la respuesta lo cuenta en `fallos` y el aviso se puede reintentar.

**Una advertencia sobre la hora.** En el plan gratuito de Vercel el cron cae en cualquier minuto de
la hora programada, así que el correo dice «cada mañana» y no promete una hora exacta. El día que
cuenta («cierra hoy», «cierra mañana») es siempre el día de Colombia, no la hora del disparo.

---

### 3.9 · `RUTINA_PRECIOS_URL` y `RUTINA_PRECIOS_TOKEN` — «Buscar» despierta la rutina de Precios (opcional)

**Qué son.** Cuando el usuario pulsa **«Buscar»** en Precios, la aplicación puede DESPERTAR por HTTP una
rutina de Claude Code de su cuenta (la suscripción que ya paga, sin clave de API): esa sesión atiende la
cola con la habilidad `/precios` y devuelve los APU. Sin estas dos variables, «Buscar» deja la solicitud
registrada y la pantalla ofrece el puente por chat («Copiar el encargo» → pegar la respuesta), que
funciona sin configurar nada. Cómo funciona el circuito completo: `docs/PRECIOS_DESDE_CLAUDE_CODE.md`.

**De dónde salen (con clics).**
1. Abra <https://claude.ai/code/routines> → pulse la rutina **«Servicio al cliente · Precios»**
   (si no existe, créela con **New routine** y el texto del apartado «La rutina» de
   `docs/PRECIOS_DESDE_CLAUDE_CODE.md`, con trigger **API**).
2. **Adjunte el repositorio, que NO es opcional**: pulse el **lápiz** (**Edit routine**) → en el apartado de
   repositorios (**Select repositories**) tiene que estar `Mauricio7x/portafolio-estrategico`; si no está,
   añádalo. Medido el 13-sep-2026: la rutina creada desde la sesión salió SIN repositorio adjunto, y sin él
   la sesión no tiene la habilidad `/precios` ni CLAUDE.md.
3. En la misma pantalla de edición, baje hasta **Select a trigger** → **Add another trigger** → **API**. La
   ventana enseña la **URL** (termina en `/fire`): cópiela, es `RUTINA_PRECIOS_URL`.
4. En la misma ventana pulse **Generate token** y copie el token EN ESE MOMENTO (se enseña una sola vez; si lo
   pierde, **Regenerate**): es `RUTINA_PRECIOS_TOKEN`. Es una contraseña de verdad: solo va en Vercel, nunca en
   un chat ni en el código; **Revoke** lo anula.
5. **Un entorno propio para esta rutina, con la red abierta.** No abra la red del entorno **Default**: lo
   comparten las otras rutinas y toda sesión en la nube. En <https://claude.ai/code>, pulse el botón de nube
   que hay encima del cuadro de mensaje (el selector de entornos) → **Add cloud environment** → nombre
   «Detekta · Precios» → **Network access**: **Full** → **Create environment**. Vuelva a la rutina → lápiz →
   bajo las instrucciones, el icono de nube con el nombre del entorno → elija «Detekta · Precios» → guarde.
   Sin red abierta la sesión no alcanza `detekta-app.vercel.app` ni las tiendas de materiales
   (medido el 12-sep-2026: 403 del proxy de egreso) y la solicitud queda «sin atender» a la media hora.
6. Pegue las dos variables en Vercel (§4) con esos nombres exactos y vuelva a desplegar (§5).

**Cómo saber que quedó bien.** Precios → cargue un archivo con ítems → **«Buscar»**: la pantalla dice «Su
solicitud quedó registrada … y la búsqueda arrancó»; en <https://claude.ai/code> aparece una sesión nueva
con el nombre de la rutina, y después «Buscando… completado x %». Si dice «la búsqueda automática no
arrancó: …», la pantalla da el motivo en palabras llanas; el detalle técnico (el código de respuesta y
qué variable revisar) está en la cola, que se ve pegando esta dirección en el Chrome donde ya entró (§0.3):
`https://detekta-app.vercel.app/api/apu?op=ia&pendientes=1` → en cada
solicitud, `despertada.detalle` («401 … regenérelo» → paso 4; «403 … permission_error» → las rutinas
están desactivadas para la cuenta; «429 … tope diario» → espere al siguiente periodo o active los
créditos de uso en <https://claude.ai/settings/usage>). «No respondió a tiempo» es indeterminado: la
sesión puede haber arrancado; mire <https://claude.ai/code> antes de volver a pulsar.

**Cuánto gasta.** Cada «Buscar» es una sesión de Claude Code: descuenta de la suscripción como una sesión
normal y cuenta para el tope diario de corridas de rutinas (se ve en <https://claude.ai/code/routines>).
Un segundo «Buscar» sobre el mismo borrador en los quince minutos siguientes NO abre otra sesión.

### 3.10 · `RUTINA_DICTAMEN_URL` y `RUTINA_DICTAMEN_TOKEN` — el dictamen del pliego desde un botón (opcional)

**Qué son.** Con estas dos variables, la caja «Dictamen del pliego» enseña el botón **«Leer el pliego
completo con inteligencia artificial»**: la aplicación DESPIERTA por HTTP una rutina de Claude Code de su
cuenta (la suscripción que ya paga, sin clave de API), esa sesión escribe el dictamen con la habilidad
`/dictamen` y la aplicación lo verifica cita por cita y lo enseña en la misma caja. Sin ellas el botón no
aparece y el dictamen completo se pide como siempre, desde Claude Code con `/dictamen`
(`docs/DICTAMEN_DESDE_CLAUDE_CODE.md`).

**De dónde salen (con clics)** — los mismos pasos que §3.9, con otra rutina:
1. Abra <https://claude.ai/code/routines> → **New routine** → nombre **«Servicio al cliente · Dictamen»** → en
   las instrucciones pegue el texto del apartado «La rutina» de `docs/DICTAMEN_DESDE_CLAUDE_CODE.md`.
2. **Adjunte el repositorio** `Mauricio7x/portafolio-estrategico` (sin él la sesión no tiene `/dictamen`).
3. **Select a trigger** → **API** → copie la **URL** (termina en `/fire`): es `RUTINA_DICTAMEN_URL`.
   **Generate token** → cópielo en ese momento: es `RUTINA_DICTAMEN_TOKEN` (una contraseña: solo en Vercel).
4. **Entorno con la red abierta**: elija el mismo entorno «Detekta · Precios» de §3.9 (la sesión tiene que
   alcanzar `detekta-app.vercel.app`; con el entorno por defecto responde 403).
5. Pegue las dos variables en Vercel (§4) y vuelva a desplegar (§5).

**Cómo saber que quedó bien.** Abra un proceso con el pliego cargado → «Dictamen del pliego»: aparece
**«Leer el pliego completo con inteligencia artificial»**. Al pulsarlo, la caja dice «Lectura completa
pedida a las …»; en <https://claude.ai/code> aparece una sesión nueva con el nombre de la rutina, y a los
pocos minutos **«Ver si ya está lista»** enseña el dictamen, que termina con «Dictamen escrito en una sesión
de Claude Code…». Si la caja dice «La lectura completa no arrancó: …», el motivo va en palabras llanas; el
detalle técnico (el código de respuesta y qué variable revisar) sale en el campo `pedido_sesion.detalle`
pegando en el Chrome donde ya entró (§0.3) `https://detekta-app.vercel.app/api/pliego?op=dictamen&id_proceso=<ID>&perfil=helder`
justo después de pedirla (la marca dura media hora).

**Cuánto gasta.** Cada lectura completa es una sesión de Claude Code: descuenta de la suscripción y cuenta
para el tope diario de corridas de rutinas. Un segundo clic en la media hora siguiente NO abre otra sesión,
y si el dictamen de sesión de esa versión del pliego ya existe, el botón lo enseña sin despertar nada.

---

### 3.11 · `OBJETOS_ENDPOINT`, `OBJETOS_BUCKET`, `OBJETOS_ACCESS_KEY_ID` y `OBJETOS_SECRET_ACCESS_KEY` — la copia nocturna fuera de Upstash (recomendada)

**Qué es.** Cada noche la aplicación copia el histórico y los datos que usted teclea (registro,
perfiles, contratos, consorcios, precios, borradores, Mis procesos) a un almacén de archivos que
NO es Upstash. Parte del histórico no se puede volver a bajar de SECOP (las señales de prórroga
que la aplicación anota desde el 16-ago-2026): sin esta copia, si Upstash perdiera la base, eso se
perdería para siempre. La dispara un tercer cron de Vercel (`/api/respaldo`, 07:15 UTC ≈ 2:15 de la
madrugada en Colombia).

**Sin estas variables no se rompe nada**, pero no hay copia: `/api/respaldo` responde 503 diciendo
qué variable falta, y `op=salud` lo publica en `respaldo.falta`.

**De dónde salen.** De Cloudflare R2 (o de cualquier almacén compatible con S3). Los pasos, según la
documentación de Cloudflare actualizada el 18-ago-2026 (su panel no se vio desde la sesión de trabajo):

1. Abrir <https://dash.cloudflare.com/>, crear la cuenta si no la tiene, e ir a **R2 object storage**.
   Cloudflare exige activar R2 (con tarjeta) antes de crear llaves; sus primeros 10 GB al mes son
   gratis y la copia de Detekta pesa del orden de 100 MB (supuesto: el tamaño real del histórico no
   se ha medido).
2. **Create bucket** → nombre, por ejemplo `detekta-copia` → crear. Ese nombre es `OBJETOS_BUCKET`.
3. En **Account Details**, junto a **API Tokens**, **Manage** → **Create User API token** (o
   **Create Account API token**). En **Permissions**, **Object Read and Write**, limitado al almacén
   del paso 2. Crear.
4. Copie los dos valores que enseña: **Access Key ID** y **Secret Access Key**. El secreto solo se
   enseña una vez.
5. El punto de entrada es `https://<ID de su cuenta>.r2.cloudflarestorage.com`: el ID de la cuenta
   aparece en el panel de Cloudflare (en R2, **Account Details**).

**Cómo se pegan en Vercel** (§4 lo explica con clics), una por una:

- **`OBJETOS_ENDPOINT`** — el punto de entrada del paso 5.
- **`OBJETOS_BUCKET`** — el nombre del paso 2.
- **`OBJETOS_ACCESS_KEY_ID`** — el **Access Key ID** del paso 4.
- **`OBJETOS_SECRET_ACCESS_KEY`** — el **Secret Access Key** del paso 4. Es una contraseña: no va en
  el código ni en ningún chat.
- **`CRON_SECRET`** (§3.6) — hace falta para que el cron de la noche se identifique; si ya la creó,
  no hay que hacer nada más.

Entorno *Production* → **Save** → **Deployments** → **Redeploy** (§5).

**Cómo se comprueba que quedó bien.** Pegue en el Chrome donde ya entró a la aplicación (§0.3):

```
https://detekta-app.vercel.app/api/admin?op=respaldo
```

La primera vez copia el histórico mes por mes; si no le alcanza el tiempo, dice cuántos meses quedan y
los copia la noche siguiente (o al volver a abrir la dirección). Después, pruebe la copia:

```
https://detekta-app.vercel.app/api/admin?op=respaldo&prueba=1
```

La prueba baja cada archivo, comprueba su huella y cuenta sus filas. «La copia sirve» es la única
respuesta que dice que se puede restaurar; si algo falla, `problemas` nombra el mes y qué le pasa.
`&estado=1` enseña qué hay copiado y de cuándo sin tocar el almacén.

**Una advertencia.** Si pasan 48 horas sin una copia completa, `op=salud` se pone en rojo y lo dice:
una copia que dejó de hacerse en silencio es no tener copia.

---

## 4. Parte C · Cómo pegar una variable en Vercel (con clics)

Este procedimiento es el mismo para todas.

1. Entrar a <https://vercel.com> e iniciar sesión.
2. En la lista de proyectos, clic en **portafolio-estrategico**.
3. Arriba, pestaña **Settings**.
4. En el menú de la izquierda, **Environment Variables**.
5. Rellenar el formulario:
   - **Key** (o *Name*): el nombre exacto, en mayúsculas. Ejemplo: `HISTORICO_TOKEN`
   - **Value**: el valor, pegado limpio. **Sin comillas y sin espacios al final.**
   - **Environments**: marcar **las tres casillas** — `Production`, `Preview` y `Development`.
6. **Save** / *Add*.
7. Repetir con la siguiente.

**Sobre las tres casillas.** Vercel tiene tres entornos separados. Si solo marca `Production` pero
está probando en una URL de vista previa (una dirección larga con números, de las que Vercel genera
para cada commit), la variable **no existe ahí** y parecerá que el token no cuadra. Marcar las tres
evita el 90 % de los sustos.

**Para cambiar una que ya existe:** en la lista, los tres puntitos `…` a la derecha de la variable →
**Edit** → cambiar el valor → **Save**. Vercel no muestra el valor guardado por seguridad; si tiene
dudas de lo que hay, **bórrela y créela de nuevo**: es más rápido que adivinar.

---

## 5. Parte D · El paso que casi todos se saltan: volver a desplegar

**Una variable nueva o modificada no surte efecto hasta el siguiente despliegue.** Los despliegues ya
existentes siguen con los valores viejos, para siempre.

Cómo forzarlo, sin terminal:

1. Vercel → proyecto → pestaña **Deployments**.
2. En el despliegue de arriba (el más reciente, marcado *Production*), los tres puntitos `…` a la
   derecha.
3. **Redeploy**.
4. En el diálogo que aparece, **dejar DESMARCADA** la casilla *Use existing Build Cache* (así se
   reconstruye limpio) y pulsar **Redeploy**.
5. Esperar 1–2 minutos a que el estado pase a **Ready**.

Recién ahí las variables nuevas están vivas.

---

## 6. Parte E · Comprobar que todo quedó bien (4 pruebas, 5 minutos)

Hágalas **en este orden**. Cada una supone que la anterior salió bien. Solo hay que pegar la URL en
Chrome, en una pestaña donde ya haya iniciado sesión en Vercel para pasar el muro y, desde la
prueba 3, donde ya haya entrado con su correo y contraseña.

### Prueba 1 · ¿El sitio está arriba?

```
https://detekta-app.vercel.app
```

Debe verse la portada de Detekta. Si sale un error de Vercel, el problema es el despliegue, no los
tokens: mire en *Deployments* si el último salió en rojo.

### Prueba 2 · ¿La base de datos está conectada?

```
https://detekta-app.vercel.app/api/sync?modo=auto
```

| Lo que responde | Qué significa |
| --- | --- |
| `"ok":true` y un montón de cifras | **Correcto.** Redis conectado y sincronizando |
| `"error":"Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN"` | Faltan una o las dos variables, o no se redesplegó |
| `"app_token_rechazado"` en algún punto | Redis va bien, pero el `SOCRATA_APP_TOKEN` está mal (§3.3) |

*(Esta llamada puede tardar hasta un minuto: está bajando datos de verdad.)*

### Prueba 3 · ¿Entró con su cuenta?

Entre a la aplicación (§0.2) y, en ese mismo Chrome:

```
https://detekta-app.vercel.app/api/resumen?perfil=helder
```

| Lo que responde | Qué significa | Arreglo |
| --- | --- | --- |
| Cifras (`totales`, `visibles`…) | **Correcto** | — |
| `401 · Token ausente` o «Su sesión terminó» | No entró en ese Chrome, o la sesión caducó | Entrar de nuevo (§0.2) |
| `503 · HISTORICO_TOKEN no está definida` | La variable no existe en este despliegue | Crearla (§3.2) y **redesplegar** (§5) |
| Una página que pide iniciar sesión en Vercel, o un 302 «Protected by Vercel Authentication» | Es el muro de Vercel, no un error de token | En el navegador: iniciar sesión en Vercel en esa misma pestaña. En una tarea de GitHub o una rutina: el pase (§3.5) |

### Prueba 4 · ¿La aplicación se ve completa?

Abrir el sitio y entrar con su correo y su contraseña. Debe verse:

- La pestaña **Mi empresa** con cifras (no vacía).
- La pestaña **Licitaciones** con tarjetas que muestran chips verdes y cifras de dinero.
- Si las tarjetas salen **sin cifras de dinero**, no entró con su cuenta: repita la prueba 3.

---

## 7. Parte F · Tabla de síntomas → causa → arreglo

| Lo que usted ve | Causa casi segura | Qué hacer |
| --- | --- | --- |
| La app carga pero **sin ninguna cifra de dinero** en las tarjetas | No entró con su cuenta en ese Chrome | Entrar (§0.2) |
| «Mi empresa» vacía o la pantalla de entrar aparece encima | La sesión caducó (30 días) o se cerró | Entrar de nuevo (§0.2) |
| «Crear su cuenta» dice que la llave no coincide | La escrita no es la que se guardó en `HISTORICO_TOKEN`, o se cambió en Vercel sin volver a desplegar | Escribirla igual a la de su nota (Vercel no la muestra); si no la tiene, ponerle una nueva en Vercel y anotarla (§0.1, paso 2); si la cambió, volver a desplegar (§5) |
| «Crear su cuenta» dice que la llave es la que estuvo escrita en el código | Todavía no se cambió `HISTORICO_TOKEN` | Cambiarla en Vercel y volver a desplegar (§0.1, paso 2) |
| «Demasiados intentos seguidos» | Cinco contraseñas malas seguidas con ese correo | Esperar los minutos que dice la pantalla |
| Todo responde `503 Faltan UPSTASH…` | Falta la base de datos o el valor empieza por `redis://` | §3.1 + redeploy |
| Cambió una variable y **no pasó nada** | No se volvió a desplegar | §5 |
| Funciona en producción pero no en una URL de vista previa | La variable solo se marcó para `Production` | Marcar las tres casillas (§4) + redeploy |
| La sincronización dice «agotados 5 intentos (HTTP 403)» | `SOCRATA_APP_TOKEN` inválido | Corregirlo **o borrarlo** (§3.3) + redeploy |
| El lector de pliegos dice que no puede leer un escaneado | Falta `OCRSPACE_API_KEY` | §3.4 (opcional) |
| La extracción histórica se para a mitad y no sigue sola | El muro de Vercel cortando la auto-llamada | §3.5, o volver a pegar la misma URL: **continúa, no reinicia** |
| Los cambios del código no llegan al sitio | La conexión con GitHub | §2 |

**Para diagnosticar la extracción sin terminal**, esta URL solo lee y no toca nada:

```
https://detekta-app.vercel.app/api/sync/historico?estado=true
```

Responde si hay una tanda corriendo, por qué mes va y qué hacer a continuación. **Léala antes de
resetear nada**: casi siempre la respuesta correcta es volver a llamar la misma URL de extracción,
porque es reanudable.

---

## 8. Parte G · Después de configurar: los dos disparos de puesta en marcha

Una sola vez, cuando las tres variables obligatorias ya estén bien y el sitio redesplegado. Los dos
disparos —cargar el año en curso y bajar el histórico, que es lo que hace que la app ordene por
probabilidad de ganar (sin él todo sale en ⚪ «sin datos históricos»)— van en **un solo botón de
GitHub**, «Carga completa (un botón)» (`.github/workflows/carga_completa.yml`). Llama tramo a tramo
hasta terminar y enseña el avance de cada uno. El año va con `modo=auto`: si nunca se cargó, hace la
carga completa; si ya se cargó, lo pone al día o continúa la que haya quedado a medias. Para
**recargar el año desde enero** (obligatorio tras cambiar una regla de ingesta) está el botón de la
pantalla «Carga completa (reinicia desde enero)», en el panel «Sincronización con SECOP II
(avanzado)».

- En el computador: pestaña «Actions» → «Carga completa (un botón)» → «Run workflow» → botón verde
  «Run workflow».
- En la app de GitHub del celular: repositorio → «Acciones» → «Carga completa (un botón)» →
  «Ejecutar flujo de trabajo».

Necesita los secretos `CRON_SECRET` y `HISTORICO_TOKEN` en GitHub; si falta alguno, el propio flujo
dice cómo crearlo.

**Por qué el botón y no una URL pegada (17-oct-2026).** Las dos URL que iban aquí empezaban de cero
lo que ya había avanzado:

- `/api/sync?modo=full` vuelve a empezar la carga del año en CADA llamada (medido el 26-sep: 200
  llamadas sin pasar de enero). El botón usa `modo=auto`, que continúa una carga a medias.
- `/api/sync/historico` con un rango distinto del guardado empezaba otra extracción desde el primer
  mes (pasó el 17-oct con `desde=2024-01&hasta=2025-12`, el rango de esta guía). Ahora el servidor
  responde 409 y no empieza nada; el botón lee el rango guardado y continúa ese.

Si aun así hay que hacerlo a mano: primero la URL de diagnóstico del §7, que solo lee, y después la
de extracción con el rango EXACTO que esa respuesta da en `extraccion.desde` y `extraccion.hasta`
(`/api/sync/historico?desde=…&hasta=…`, pegada en el Chrome donde ya entró a la aplicación). Va
respondiendo `done:false` mientras quede trabajo; se vuelve a pegar la misma URL y continúa donde
quedó. Cuando responde `done:true`, terminó.

---

## 9. Parte H · Seguridad: qué vigilar y qué no

**Lo que sí importa:**

- **Su contraseña de Detekta y `HISTORICO_TOKEN` son contraseñas de verdad.** No van en ningún
  chat, correo, documento ni archivo del repositorio. `HISTORICO_TOKEN` solo vive en Vercel (y en
  GitHub y en el entorno de Claude Code si los usa).
- **Mantener activo el muro de Vercel**: «Vercel Authentication» en «All Deployments» (Settings →
  Deployment Protection). Es la primera de las dos capas; la segunda es su sesión. Con «Standard
  Protection» —la que trae un proyecto nuevo— la dirección de producción queda abierta: así estuvo
  la cuenta nueva del 16 al 17-oct-2026 (medido). La contraseña de Vercel no existe en el plan
  Hobby; en Pro cuesta $20 al mes por proyecto (documentación de Vercel, consultada el 17-oct-2026).
  **Lo vigilan dos sondas** que llaman a la portada SIN el pase: el paso «¿El muro de Vercel sigue
  puesto?» del latido de GitHub (la corrida sale en rojo si la portada responde 200) y el vigilante
  de la mañana (lo dice en su primera línea).
- **No pegar `UPSTASH_REDIS_REST_TOKEN` ni `OCRSPACE_API_KEY` en ningún chat, correo ni archivo del
  repositorio.** Solo van en Vercel.
- **Mantener Vercel Password Protection mientras lo tenga puesto**: hoy ya no es la única puerta
  (la sesión protege lo suyo en el servidor), pero quitarla es una decisión aparte, con su propio
  plan (docs/PLAN_DE_ACCION.md, F3-11).
- **Rotar `SOCRATA_APP_TOKEN`** si alguna vez se pegó en una URL pública.

**Lo que no vale la pena:**

- Crear *personal access tokens* de GitHub. No se usan.

**Un detalle que sí conviene recordar:** cuando se pega una URL con `&token=…` en Chrome, la llave
queda escrita en el historial del navegador y en los registros de acceso de Vercel. Por eso esta
guía pide pegar las URL en el Chrome donde ya entró, sin `&token=` (§0.3). Si alguna vez la usó así,
rótela (§10).

---

## 10. Rotar `HISTORICO_TOKEN`

Desde el 17-oct-2026 la llave **no está en el código**, así que rotarla ya no toca el repositorio:
la suite automática exige justo lo contrario —que ningún archivo de `public/` lleve una credencial
ni la cabecera de la llave—. Rotarla no le cierra la sesión: su cuenta no depende de la llave.

| # | Sitio | Qué cambiar |
| --- | --- | --- |
| 1 | Vercel → *Settings → Environment Variables* → `HISTORICO_TOKEN` | el valor nuevo (una cadena larga y aleatoria) |
| 2 | El despliegue | **Redeploy** (§5): la variable solo entra en despliegues nuevos |
| 3 | GitHub → *Settings → Secrets and variables → Actions* → `HISTORICO_TOKEN` | el mismo valor, si creó ese secreto (flujo de la carga completa) |
| 4 | claude.ai/code → el entorno → *Edit* → variables de entorno → `HISTORICO_TOKEN` | el mismo valor, si usa las rutinas o las skills `/dictamen` y `/precios` |

Hasta que haga el paso 3 o el 4, el flujo o la rutina correspondiente responden `401` y lo dicen;
la aplicación en su navegador sigue funcionando igual.

---

## Anexo · Variables que existen en el código pero NO hay que tocar

Aparecen si alguien lee el código y pueden asustar. **Todas tienen un valor por defecto correcto y
solo existen para las pruebas automáticas.** No hay que crearlas en Vercel:

`SECOP_BASE_URL` · `PAA_BASE_URL` · `PROPONENTES_BASE_URL` · `EJECUCION_BASE_URL` · `OFERTAS_BASE_URL` · `SIRI_BASE_URL` ·
`MULTAS_BASE_URL` · `GRUPOS_BASE_URL` · `MODIFICACIONES_BASE_URL` · `SECOP_PAGE` · `SECOP_BACKOFF_MS` · `PAA_PAGE` · `PAA_MAX_FILAS` ·
`PAA_PRESUPUESTO_MS` · `PAA_ACIERTO_MAX_FILAS` · `PAA_ACIERTO_PRESUPUESTO_MS` · `SOCIO_TIEMPO_MS` ·
`PROPONENTES_TIEMPO_MS` · `EJECUCION_TIEMPO_MS` · `CONTRATOS_TIEMPO_MS` · `SEGUIMIENTO_TIEMPO_MS` · `UBICACION_VALIDA` ·
`E2E_STACK` · `DUMP` · `CORREO_API_URL` (el punto final del proveedor de correo; sin ella se usa el
del proveedor documentado en §3.8)

Y dos que pone Vercel sola y no se tocan nunca: `VERCEL` y `NODE_ENV`.

**Las del dictamen del pliego y del lector de documentos** (existen desde septiembre de 2026; solo
importan si `ANTHROPIC_API_KEY` está puesta, salvo las dos últimas). Ninguna hay que crearla:

| Nombre exacto | Para qué sirve | Si no está |
| --- | --- | --- |
| `DICTAMEN_MODELO` | Qué modelo de Anthropic escribe el dictamen | Se usa el modelo que trae el código |
| `DICTAMEN_ESFUERZO` | Cuánto razona el modelo antes de escribir (`low`, `medium` o `high`; otro valor se ignora) | `medium` |
| `DICTAMEN_PRESUPUESTO_MS` | Tiempo máximo, en milisegundos, que el servidor espera al modelo | 290 000 (por debajo del límite de la función de Vercel) |
| `DICTAMEN_CUOTA_DIA` | Cuántos dictámenes por día puede pedir la aplicación al modelo (freno de gasto) | 15 |
| `DICTAMEN_RESPALDO` | Si el modelo está saturado, dejar que Anthropic responda con un modelo de respaldo (`0` lo apaga) | Encendido |
| `DOCUMENTOS_TIEMPO_MS` | Tiempo máximo, en milisegundos, para leer la lista de documentos de un proceso en datos.gov.co | 8 000 |
| `ARCHIVOS_BASE_URL` | Dirección del listado de documentos de SECOP II en datos.gov.co (solo para las pruebas automáticas) | La dirección real |

**La del modal de competencia histórica** (existe desde el 14 de septiembre de 2026). Tampoco hay que
crearla:

| Nombre exacto | Para qué sirve | Si no está |
| --- | --- | --- |
| `DETALLE_PRESUPUESTO_MS` | Cuánto tiempo, en milisegundos, se da el servidor para revisar el histórico cuando usted abre la competencia de una entidad. Si se le acaba, responde igual: enseña las cifras que el índice ya tenía calculadas sobre todo el histórico y avisa de que la lista de procesos no se pudo armar | 35 000 (por debajo del minuto en que Vercel corta esa función) |

**La de la copia nocturna** (existe desde el 27 de septiembre de 2026). Tampoco hay que crearla:

| Nombre exacto | Para qué sirve | Si no está |
| --- | --- | --- |
| `OBJETOS_REGION` | La región que se firma en cada petición al almacén de archivos | `auto`, que es la de Cloudflare R2 |
| `RESPALDO_PRESUPUESTO_MS` | Cuánto tiempo, en milisegundos, se da cada vuelta de la copia antes de dejar lo que falte para la siguiente | 240 000 (por debajo de los 300 s de la función) |

La suite automática **censa** cada variable que el código del servidor lee y exige que esté descrita
en este documento: una variable nueva sin su fila aquí pone la suite en rojo.

---

## Hoja de ruta para copiar y pegar

Si tuviera que empezar hoy desde cero, en este orden y nada más:

1. Upstash → copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (§3.1).
2. Vercel → *Settings → Environment Variables* → pegar esas dos, las tres casillas marcadas (§4).
3. Añadir `HISTORICO_TOKEN` con una cadena larga y aleatoria (§3.2).
4. *(Opcional)* Añadir `SOCRATA_APP_TOKEN` y `OCRSPACE_API_KEY` (§3.3, §3.4). `ANTHROPIC_API_KEY` (§3.7)
   solo si el dueño decide encender el motor de pago del dictamen; hoy no.
5. Generar `VERCEL_AUTOMATION_BYPASS_SECRET` y ponerlo también en GitHub y en el entorno de Claude (§3.5).
6. *(Recomendado)* Añadir `CRON_SECRET` con una cadena aleatoria larga (§3.6).
7. **Deployments → … → Redeploy**, sin caché (§5).
8. Abrir la aplicación y **crear su cuenta** con esa llave (§0.1).
9. Correr las cuatro pruebas de §6.
10. Disparar la sincronización completa y el histórico con el botón de GitHub (§8).
