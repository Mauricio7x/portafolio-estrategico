# Tokens y variables de entorno · guía desde cero

**Para quién es esto:** para el dueño de Detekta, sin conocimientos técnicos y sin terminal. Todo se
hace con clics en dos páginas web (Vercel y Upstash) y pegando URLs en Chrome. Nada de programar.

**Fecha:** 20-ago-2026. Las rutas de los menús de Vercel, Upstash, datos.gov.co y OCR.space son las
que estaban vigentes al escribir esto; **no se pudieron confirmar en vivo desde el entorno de
desarrollo** (el proxy responde 403 a todos los sitios externos, incluida la propia app). Si un menú
cambió de nombre, lo que hay que buscar va dicho en cada paso.

---

## 0. Lo primero: la causa más probable de que «los tokens no cuadren»

La aplicación lleva el token de escritura **escrito dentro del código del navegador**, en tres
archivos (`public/app.js`, `public/onboarding.js`, `public/pliego.js`):

```js
const TOKEN = "MiExtraccion2025";
```

Eso significa que la variable `HISTORICO_TOKEN` de Vercel tiene que valer **exactamente**:

```
MiExtraccion2025
```

Ni una cadena larga y aleatoria, ni otra cosa. Si en Vercel hay un valor distinto, **la aplicación
entera se queda a medias**: la lista de licitaciones se ve sin cifras, el tablero de Mi empresa no
carga, no se puede subir el RUP, no se puede calcular un APU. Y **no sale ningún error visible en
pantalla** — simplemente faltan datos.

> **De dónde vino la confusión, y la corrección ya aplicada.** El `README.md` traía desde hace
> meses la frase «Definir `HISTORICO_TOKEN` (una cadena larga y aleatoria)», en la sección *Cómo
> ejecutar la extracción histórica inicial*, paso 1. Esa instrucción es **anterior** a la decisión
> de integrar el token en el frontend (ago 2026) y era la trampa número uno: seguirla al pie de la
> letra rompe el despliegue. Si alguna vez se siguió, ahí está el problema.
>
> **Ese paso 1 ya está corregido en `README.md`** (21-ago-2026, al unificar las ramas en `main`):
> la sesión que escribió esta guía no tenía permiso de escritura sobre el README, así que la
> corrección quedó redactada aquí hasta poder aplicarse. Hoy las dos fuentes dicen lo mismo; si
> alguna vez volvieran a discrepar, **manda esta guía**, que es la que se escribió mirando el código.

**Ese literal no es un secreto.** Cualquiera que abra el código fuente de la página lo ve. La
protección real del sitio es **Vercel Password Protection** (el muro que pide contraseña antes de
entrar) más el gate de clave `231105` del navegador. No hay que angustiarse por él; hay que hacer
que **cuadre**.

Si algún día se quiere cambiar por otro valor, hay que cambiarlo **en los seis sitios a la vez** —las
tres líneas del código, este documento, el `README.md` y la variable de Vercel— y en el orden que
explica §10 («Rotar `HISTORICO_TOKEN`»). Cambiarlo solo en Vercel rompe la aplicación; la suite
automática exige que los tres archivos y los dos documentos lleven el mismo valor.

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

## 2. Parte A · GitHub: no necesita ningún token

**En GitHub no hay que crear, pegar ni configurar ningún token.** Punto.

Por qué, en concreto:

- El repositorio **no tiene GitHub Actions** (no existe la carpeta `.github/workflows/`), así que no
  hay ningún proceso automático de GitHub que necesite credenciales.
- El repositorio **no tiene secretos** (*Settings → Secrets and variables*) y no hace falta que los
  tenga.
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
| `HISTORICO_TOKEN` | **SÍ** | Llave de todo lo protegido | `503` en todo lo protegido; la app se ve a medias |
| `SOCRATA_APP_TOKEN` | Recomendada | Sube el cupo de descargas de datos.gov.co | Funciona igual, pero ~100 peticiones/hora en vez de ~1.000 |
| `OCRSPACE_API_KEY` | Opcional | Leer pliegos **escaneados** (fotos) | Los pliegos con texto se leen igual; los escaneados no |
| `VERCEL_AUTOMATION_BYPASS_SECRET` | Solo si hay Password Protection | Que la sincronización pueda llamarse a sí misma | La extracción larga se corta a mitad |

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

### 3.2 · `HISTORICO_TOKEN` — la llave de la aplicación

**Qué es.** Una sola llave que protege **todo** lo que no es la lista pública: el tablero de Mi
empresa, la carga del RUP, la experiencia, la auditoría de códigos, los índices, el editor de precios
y la extracción de datos. El nombre es histórico (nació para la extracción del histórico) pero hoy
abre todo.

**De dónde sale.** De ningún sitio: **la elige usted**. Y por lo dicho en el punto 0, hoy tiene que
valer exactamente:

```
MiExtraccion2025
```

- **Nombre de la variable:** `HISTORICO_TOKEN`
- **Valor:** `MiExtraccion2025`
- Sin comillas. Sin espacios. Respetando mayúsculas y minúsculas (`M` mayúscula, `E` mayúscula).

**Cómo se comprueba que quedó bien:** pegar esta URL en Chrome (estando ya dentro del sitio, es
decir, después de haber pasado la contraseña de Vercel si está activa):

```
https://portafolio-estrategico.vercel.app/api/resumen?perfil=helder&token=MiExtraccion2025
```

- Si responde un texto largo con cifras → **correcto**.
- Si responde `503` diciendo «HISTORICO_TOKEN no está definida» → la variable **no existe**.
- Si responde `401 Token inválido` → la variable existe **con otro valor**. Ese es el caso de «no
  cuadran»: hay que cambiarla a `MiExtraccion2025` y volver a desplegar.

---

### 3.3 · `SOCRATA_APP_TOKEN` — el cupo de datos.gov.co

**Qué es.** Todos los datos de licitaciones salen de `datos.gov.co`, que funciona sobre una
plataforma llamada Socrata. Sin token, Socrata deja hacer **unas 100 peticiones por hora**; con
token, **unas 1.000**. No es una contraseña de nada suyo: es un identificador de aplicación para que
no lo confundan con tráfico anónimo.

**Es opcional.** Sin ella la app funciona, solo que la sincronización puede quedarse corta en días de
mucho movimiento.

**De dónde se saca:**

1. Entrar a <https://www.datos.gov.co> y **crear una cuenta** o iniciar sesión (arriba a la derecha,
   *Iniciar sesión* / *Sign In*).
2. Ir al perfil: clic en el nombre de usuario → **Perfil** → **Configuración del desarrollador**
   (en inglés: *Developer Settings*). La ruta directa suele ser
   `https://www.datos.gov.co/profile/edit/developer_settings`.
3. Pulsar **Create New App Token** / *Crear nuevo token de aplicación*.
4. Le pedirá un nombre y una descripción de la aplicación: escriba `Detekta` y
   «Consulta de procesos de contratación pública». La URL puede quedar en blanco o poner
   `https://portafolio-estrategico.vercel.app`.
5. Al guardar aparece el **App Token**: una cadena de letras y números. Ese es el valor.

- **Nombre de la variable:** `SOCRATA_APP_TOKEN`
- **Valor:** el *App Token* (NO el *Secret Token*, si le muestra los dos)

**⚠️ Aquí ya hubo un incidente real y conviene no repetirlo.** El 16-ago-2026 producción estuvo
**14 horas sin sincronizar** porque el valor pegado no era el correcto: Socrata responde `403
«Invalid app_token specified»` a cualquier token que no reconozca. Desde entonces la app se defiende
sola —si el token es rechazado, reintenta sin él y sigue funcionando— pero **avisa**. Se ve así:

```
https://portafolio-estrategico.vercel.app/api/sync?modo=auto
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

### 3.5 · `VERCEL_AUTOMATION_BYPASS_SECRET` — solo si el sitio pide contraseña

**Qué es.** Si el proyecto tiene activada **Password Protection** (el muro de Vercel que pide una
contraseña antes de ver el sitio), ese muro bloquea **también** las llamadas que la aplicación se
hace a sí misma. Y la sincronización necesita hacérselas: baja los datos en tandas de 45 segundos y
al terminar cada tanda se vuelve a llamar para seguir con la siguiente. Con el muro en medio, **la
cadena muere a la primera tanda** y la extracción se queda a medias sin dar ningún error.

Este secreto es el pase que deja atravesar el muro a esas llamadas internas.

**De dónde se saca:**

1. Vercel → el proyecto → **Settings** → **Deployment Protection**.
2. Buscar el bloque **Protection Bypass for Automation**.
3. Pulsar el botón para **generar** el secreto (si ya existe, hay un botón de copiar).
4. Vercel normalmente crea sola la variable de entorno con el nombre
   `VERCEL_AUTOMATION_BYPASS_SECRET`. **Comprobar en *Settings → Environment Variables* que
   aparece.** Si no aparece, copiar el valor y añadirla a mano con ese nombre exacto.

**¿Cómo sé si tengo Password Protection activa?** Abra
`https://portafolio-estrategico.vercel.app` en una ventana de incógnito. Si le pide una contraseña
antes de ver nada, está activa.

**Síntoma de que falta:** la extracción histórica avanza un mes y se detiene. Al consultar el estado
(ver §7) dice `candado.tomado: false` y `extraccion.terminada: false`. Con la variable puesta, la
cadena continúa sola.

---

### 3.6 · `CRON_SECRET` — la guarda de la sincronización (opcional, recomendada)

**Qué es.** La sincronización diaria (`/api/sync`, que Vercel dispara con un cron a las 08:30 UTC)
nació pública: cualquiera que conociera la URL podía lanzarla contra SECOP II y gastar el cupo de
Redis y de Vercel del proyecto. Con esta variable puesta, `/api/sync` solo acepta tres llamadores:
el cron de Vercel (que, según la documentación de Vercel, envía la cabecera
`Authorization: Bearer <CRON_SECRET>` a cada invocación cuando la variable existe), quien lleve la
llave de la aplicación (la marca y «Actualizar datos» ya la mandan) y la propia cadena de tandas. A
todo lo demás responde `401` diciendo qué hacer.

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

1. Pegar en Chrome `https://portafolio-estrategico.vercel.app/api/procesos?op=salud`: tiene que
   decir `"sincronizacion_protegida": true`.
2. Pegar `https://portafolio-estrategico.vercel.app/api/sync?modo=auto` **sin** `&token=`: tiene
   que responder `401` (antes respondía `200`).
3. Al día siguiente, otra vez `op=salud`: `ultima_sincronizacion` tiene que ser de esa mañana. Si
   no lo es, el cron no está pasando la guarda: quite la variable, vuelva a desplegar y avise —la
   marca (que lleva la llave) sigue sincronizando mientras tanto.

**Efecto en las URL que tenga pegadas en Chrome:** `/api/sync?modo=full` y `/api/sync?modo=auto`
necesitan ahora `&token=MiExtraccion2025` al final (§8 ya lo trae). Sin la variable, ese `&token=`
no estorba.

---

## 4. Parte C · Cómo pegar una variable en Vercel (con clics)

Este procedimiento es el mismo para las seis.

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
Chrome, en una pestaña donde ya haya pasado la contraseña del sitio.

### Prueba 1 · ¿El sitio está arriba?

```
https://portafolio-estrategico.vercel.app
```

Debe verse la portada de Detekta. Si sale un error de Vercel, el problema es el despliegue, no los
tokens: mire en *Deployments* si el último salió en rojo.

### Prueba 2 · ¿La base de datos está conectada?

```
https://portafolio-estrategico.vercel.app/api/sync?modo=auto
```

| Lo que responde | Qué significa |
| --- | --- |
| `"ok":true` y un montón de cifras | **Correcto.** Redis conectado y sincronizando |
| `"error":"Faltan UPSTASH_REDIS_REST_URL / UPSTASH_REDIS_REST_TOKEN"` | Faltan una o las dos variables, o no se redesplegó |
| `"app_token_rechazado"` en algún punto | Redis va bien, pero el `SOCRATA_APP_TOKEN` está mal (§3.3) |

*(Esta llamada puede tardar hasta un minuto: está bajando datos de verdad.)*

### Prueba 3 · ¿La llave cuadra?

```
https://portafolio-estrategico.vercel.app/api/resumen?perfil=helder&token=MiExtraccion2025
```

| Lo que responde | Qué significa | Arreglo |
| --- | --- | --- |
| Cifras (`totales`, `visibles`…) | **Correcto** | — |
| `503 · HISTORICO_TOKEN no está definida` | La variable no existe en este despliegue | Crearla (§3.2) y **redesplegar** (§5) |
| `401 · Token inválido` | Existe, pero con otro valor | Editarla a `MiExtraccion2025` y **redesplegar** |
| Una página HTML pidiendo contraseña | Es el muro de Vercel, no un error de token | Iniciar sesión en Vercel en esa misma pestaña |

### Prueba 4 · ¿La aplicación se ve completa?

Abrir el sitio y entrar con la clave `231105`. Debe verse:

- La pestaña **Mi empresa** con cifras (no vacía).
- La pestaña **Licitaciones** con tarjetas que muestran chips verdes y cifras de dinero.
- Si las tarjetas salen **sin cifras de dinero**, el token sigue sin cuadrar: repita la prueba 3.

---

## 7. Parte F · Tabla de síntomas → causa → arreglo

| Lo que usted ve | Causa casi segura | Qué hacer |
| --- | --- | --- |
| La app carga pero **sin ninguna cifra de dinero** en las tarjetas | `HISTORICO_TOKEN` distinto de `MiExtraccion2025` | §3.2 + redeploy |
| «Mi empresa» vacía o dando vueltas | Lo mismo | §3.2 + redeploy |
| No deja subir el RUP / no calcula precios | Lo mismo | §3.2 + redeploy |
| Todo responde `503 Faltan UPSTASH…` | Falta la base de datos o el valor empieza por `redis://` | §3.1 + redeploy |
| Cambió una variable y **no pasó nada** | No se volvió a desplegar | §5 |
| Funciona en producción pero no en una URL de vista previa | La variable solo se marcó para `Production` | Marcar las tres casillas (§4) + redeploy |
| La sincronización dice «agotados 5 intentos (HTTP 403)» | `SOCRATA_APP_TOKEN` inválido | Corregirlo **o borrarlo** (§3.3) + redeploy |
| El lector de pliegos dice que no puede leer un escaneado | Falta `OCRSPACE_API_KEY` | §3.4 (opcional) |
| La extracción histórica se para a mitad y no sigue sola | Password Protection cortando la auto-llamada | §3.5, o volver a pegar la misma URL: **continúa, no reinicia** |
| Los cambios del código no llegan al sitio | La conexión con GitHub | §2 |

**Para diagnosticar la extracción sin terminal**, esta URL solo lee y no toca nada:

```
https://portafolio-estrategico.vercel.app/api/sync/historico?token=MiExtraccion2025&estado=true
```

Responde si hay una tanda corriendo, por qué mes va y qué hacer a continuación. **Léala antes de
resetear nada**: casi siempre la respuesta correcta es volver a llamar la misma URL de extracción,
porque es reanudable.

---

## 8. Parte G · Después de configurar: los dos disparos de puesta en marcha

Una sola vez, cuando las tres variables obligatorias ya estén bien y el sitio redesplegado.

**Disparo 1 — recargar todo el año en curso** (obligatorio si nunca se hizo o si se cambiaron las
reglas de ingesta):

```
https://portafolio-estrategico.vercel.app/api/sync?modo=full&token=MiExtraccion2025
```

(El `&token=` es la llave de la aplicación: hace falta si `CRON_SECRET` está puesto —§3.6— y no
estorba si no lo está.) Se auto-encadena en tandas. Desde el panel de Mi empresa → *Sistema* → **Iniciar sincronización**
hace lo mismo con un botón, y encadena las tandas siguientes solo.

**Disparo 2 — bajar los dos años de histórico** (es lo que hace que la app ordene por probabilidad
de ganar; sin esto todo sale en ⚪ «sin datos históricos»):

```
https://portafolio-estrategico.vercel.app/api/sync/historico?desde=2024-01&hasta=2025-12&token=MiExtraccion2025
```

Tarda. Va respondiendo `done:false` mientras quede trabajo; se vuelve a pegar la misma URL y
continúa donde quedó. Cuando responde `done:true`, terminó.

---

## 9. Parte H · Seguridad: qué vigilar y qué no

**Lo que sí importa:**

- **Mantener activa Vercel Password Protection.** Es la protección real del sitio, porque el token
  de escritura está a la vista en el código.
- **No pegar `UPSTASH_REDIS_REST_TOKEN` ni `OCRSPACE_API_KEY` en ningún chat, correo ni archivo del
  repositorio.** Esas dos sí son contraseñas de verdad. Solo van en Vercel.
- **Rotar `SOCRATA_APP_TOKEN`** si alguna vez se pegó en una URL pública.

**Lo que no vale la pena:**

- Preocuparse porque `MiExtraccion2025` esté en el código. Ya está decidido y documentado: el
  usuario no teclea tokens, y la puerta es el muro de Vercel.
- Crear *personal access tokens* de GitHub. No se usan.

**Un detalle que sí conviene recordar:** cuando se dispara algo con `?token=…` pegado en Chrome, ese
token queda escrito en el historial del navegador y en los registros de acceso de Vercel. Es un
precio asumido a propósito (es la única vía sin terminal) y está documentado. Si el token dejara de
ser el literal público de hoy, habría que rotarlo después de cada uso de esa vía.

---

## 10. Rotar `HISTORICO_TOKEN` (los seis sitios, en orden)

El valor vive en **seis sitios** y tienen que cambiar juntos; si no, la aplicación «se sirve a medias
y sin error visible» (§0). Desde el 6-sep-2026 la suite automática ya no fija el literal: lo LEE de
los tres archivos de `public/`, exige que los tres coincidan y que este documento y el `README.md`
lleven el mismo valor. Una rotación a medias pone la suite en rojo antes de llegar a producción.

| # | Sitio | Qué cambiar |
| --- | --- | --- |
| 1 | `public/app.js` | la línea `const TOKEN = "…";` |
| 2 | `public/onboarding.js` | la misma línea |
| 3 | `public/pliego.js` | la misma línea |
| 4 | `docs/CONFIGURACION_TOKENS.md` (este documento) y `README.md` | todas las menciones del valor viejo |
| 5 | Vercel → *Settings → Environment Variables* → `HISTORICO_TOKEN` | el valor nuevo |
| 6 | El despliegue | **Redeploy** (§5): la variable solo entra en despliegues nuevos |

**El orden importa**, porque cada despliegue lleva el valor del código Y el de la variable, y tienen
que coincidir en el mismo despliegue:

1. Cambiar la variable en Vercel al valor nuevo **sin** redesplegar todavía (no entra en vigor hasta
   el próximo despliegue).
2. En una sesión de Claude Code: cambiar los sitios 1-4, correr `node tests/e2e.js` (tiene que
   terminar 4/4: si un archivo o un documento se quedó con el valor viejo, la suite lo dice) y hacer
   el commit.
3. El push a `main` despliega solo, ya con los dos valores nuevos a la vez.
4. Comprobar con la **Prueba 3** de §6 usando el valor nuevo en `&token=`.

Si se hace al revés (código primero, variable después), entre los dos pasos la aplicación entera
responde `401` y no sale ninguna cifra. Y el valor viejo queda en la historia pública de git para
siempre: por eso el literal no es un secreto y la puerta real sigue siendo el muro de Vercel (§9).

---

## Anexo · Variables que existen en el código pero NO hay que tocar

Aparecen si alguien lee el código y pueden asustar. **Todas tienen un valor por defecto correcto y
solo existen para las pruebas automáticas.** No hay que crearlas en Vercel:

`SECOP_BASE_URL` · `PAA_BASE_URL` · `PROPONENTES_BASE_URL` · `EJECUCION_BASE_URL` · `SIRI_BASE_URL` ·
`MULTAS_BASE_URL` · `SECOP_PAGE` · `SECOP_BACKOFF_MS` · `PAA_PAGE` · `PAA_MAX_FILAS` ·
`PAA_PRESUPUESTO_MS` · `PAA_ACIERTO_MAX_FILAS` · `PAA_ACIERTO_PRESUPUESTO_MS` · `SOCIO_TIEMPO_MS` ·
`PROPONENTES_TIEMPO_MS` · `EJECUCION_TIEMPO_MS` · `SEGUIMIENTO_TIEMPO_MS` · `UBICACION_VALIDA` ·
`E2E_STACK` · `DUMP`

Y dos que pone Vercel sola y no se tocan nunca: `VERCEL` y `NODE_ENV`.

---

## Hoja de ruta para copiar y pegar

Si tuviera que empezar hoy desde cero, en este orden y nada más:

1. Upstash → copiar `UPSTASH_REDIS_REST_URL` y `UPSTASH_REDIS_REST_TOKEN` (§3.1).
2. Vercel → *Settings → Environment Variables* → pegar esas dos, las tres casillas marcadas (§4).
3. Añadir `HISTORICO_TOKEN` = `MiExtraccion2025` (§3.2).
4. *(Opcional)* Añadir `SOCRATA_APP_TOKEN` y `OCRSPACE_API_KEY` (§3.3, §3.4).
5. *(Si el sitio pide contraseña)* Generar `VERCEL_AUTOMATION_BYPASS_SECRET` (§3.5).
6. *(Recomendado)* Añadir `CRON_SECRET` con una cadena aleatoria larga (§3.6).
7. **Deployments → … → Redeploy**, sin caché (§5).
8. Correr las cuatro pruebas de §6.
9. Disparar la sincronización completa y el histórico (§8).
