# Las cuatro acciones sobre Detekta · qué eliminar, reducir, incrementar y crear, y cómo partir el producto en dependencias

> Para: dueño · Estado: informe fechado · Sustituido por: —

> Escrito el 14 de septiembre de 2026 sobre el árbol de `main` (5db53f7). Responde el encargo del
> dueño: las cuatro preguntas del esquema estratégico (eliminar, reducir, incrementar, crear) a
> nivel de producto —no de botones sueltos— y cómo segmentar Detekta «por dependencias» para que
> cambiar una cosa no obligue a leer la página entera.
>
> **Regla de lectura.** Toda cifra lleva su origen: **medido** (un comando ejecutado en esta
> sesión), **calculado** (fórmula visible) o **no medible desde aquí**. Ningún porcentaje es a ojo,
> y «sin dato» nunca se presenta como cero. Nada de este documento está implementado: es el
> diagnóstico y el plan. Cada punto que se ejecute vuelve a pasar por el ciclo entero, con su
> prueba que falla contra el árbol anterior.

## Cómo se hizo

Veintinueve agentes en dos fases, cada uno con las coordenadas ya resueltas y obligado a ejecutar
antes de afirmar.

1. **Inventario** (siete agentes, uno por dominio: licitaciones, empresa, procesos y pliego,
   precios, inteligencia de mercado, administración y salidas, y la propia página). Levantaron qué
   sabe hacer hoy el producto, con evidencia ejecutada por capacidad.
2. **Cuatro lentes** sobre ese inventario: el contratista con quince años licitando, el que acaba
   de sacar su registro de proponente, el dueño que tiene que vender esto, y la competencia.
   Produjeron 35 propuestas.
3. **Dos diseños de segmentación** con ejes distintos: por la pregunta del contratista y por quién
   manda sobre cada cifra.
4. **Refutación adversaria** (catorce agentes): cada hecho que sostiene una recomendación se
   entregó a un agente cuyo encargo era **tumbarlo**. Los catorce volvieron «parcial»: ninguno
   sobrevivió intacto y ninguno se cayó del todo. Las correcciones están incorporadas abajo y son
   la parte más valiosa de este documento.
5. **Crítica de completitud** (un agente) y **síntesis única de las dependencias** (un agente).

Lo que esto NO es: una medición de producción. El entorno de la sesión no alcanza el sitio
publicado ni la base de datos en vivo; todo sale de ejecutar código contra el árbol.

## 1 · El producto contado por dependencias

Detekta hace hoy seis cosas. No son «pestañas»: son seis preguntas del contratista, cada una dueña
de unas cifras que las demás le piden y nunca recalculan.

| Dependencia | La pregunta que contesta | Manda sobre | Dónde se ve hoy |
|---|---|---|---|
| **La vitrina** | ¿A qué me presento hoy? | Cuántas licitaciones hay, cuáles, cuándo cierran y en qué orden salen | La lista central, su barra de filtros y su Excel |
| **Mi empresa** | ¿Quién soy y puedo presentarme a este proceso? | Registro de proponente, patrimonio, capacidad de facturar, el veredicto por proceso y los consorcios | La pestaña Mi empresa, la subida del registro, el simulador de consorcio y el punto de color de cada fila |
| **El mercado** | ¿Cuánta pelea hay y a cómo adjudican? | Cuántos se presentan por entidad, cuánto descontaron los ganadores, quién gana, cómo ejecuta esa entidad, los planes anuales | Las fichas de entidad y competidor, y dos columnas de la vitrina |
| **El precio** | ¿A qué precio oferto? | Qué cuesta cada actividad y de dónde sale cada precio, el precio recomendado, el piso, la ganancia y la caja | La pestaña Precios, el editor, el Excel del presupuesto y la justificación |
| **El pliego** | ¿Qué exige este documento? | Lo que dice el pliego con su cita y su página: fechas, descuentos, documentos, adendas y dictamen | El expediente de un proceso guardado |
| **Mis procesos** | ¿En qué voy con los que aparté? | Qué guardó usted, en qué paso va, qué falta y cuándo, y los avisos | La pestaña Mis procesos, el calendario y el correo diario |

**El desequilibrio, medido.** El precio pesa alrededor del 29 % de todo el código y sus datos ocupan
el 97 % de la carpeta de datos; la vitrina y el mercado juntos pesan menos. Y en la pantalla, un
solo archivo —el que dibuja la página— tiene 10.962 líneas y pesa más que todas las demás pantallas
sumadas.

## 2 · Eliminar · qué da por sentado la industria que a su cliente no le importa

### 2.1 El registro con correo y contraseña

Toda plataforma de este mercado empieza pidiendo una cuenta. Detekta no la necesita: **la identidad
del contratista colombiano ya existe y es su registro de proponente**. Ese camino está construido,
probado y funciona hoy sin clave; lo único apagado son los dos botones que lo ofrecen en la
portada. El registro con correo y contraseña, en cambio, no está terminado: aunque se active,
responde que el alta y el inicio de sesión todavía no están conectados.

- **Qué se elimina:** la idea de que hace falta una cuenta para tener producto.
- **Qué cuesta:** hay que resolver antes de quién son los datos de cada perfil (apartado 6.1). Sin
  eso, quitar la clave compartida apaga toda la escritura del producto, no solo la puerta.
- **Por qué no es obvio:** la reacción normal es *abrir el registro*. Aquí hay que hacer lo
  contrario, y lo contrario ya está escrito.

### 2.2 El veredicto que no puede decir que no

La industria vende el motor de recomendación: el semáforo, el «score de ajuste». Es lo menos
diferenciado que puede tener Detekta y lo que más cuesta si sale creíble y equivocado.

Medido: de las cuatro marcas de requisitos que ve el contratista, **solo tres deciden**. La cuarta,
la de competencia, está construida para dar siempre por cumplido y no puede volver inviable ningún
proceso. La aplicación ya lo tiene en cuenta donde más se nota —la frase de veredicto de cada
tarjeta se calcula solo con las otras tres—, pero al desplegar «Más detalles» la cuarta marca tiene
la misma forma y los mismos colores que las tres que sí deciden. Y hay algo peor, que la refutación
encontró y el diagnóstico inicial no: **cuando de esa entidad no hay histórico, esa marca sale en
verde y con visto bueno**, mientras su propia explicación dice que no hay datos suficientes. Es una
ausencia de información pintada como requisito cumplido, que es la regla dura de la casa al revés
(`CLAUDE.md § «Reglas duras»`).

- **Qué se elimina:** la cuarta marca como marca. La competencia sigue en la tarjeta, donde ya está
  bien: con su propio indicador, su color y su detalle al hacer clic.
- **Lo que NO se elimina:** el criterio. Ese mismo veredicto es el filtro que viene encendido por
  defecto y es lo que hace corta la lista. Quitarlo alargaría justo la lista que el apartado 3
  quiere acortar.

### 2.3 El curso de licitaciones dentro de la pantalla donde se decide

La pantalla de decisión no puede ser a la vez la pantalla de formación. El caso más caro está
medido: el catálogo de frases del titular tiene 3.552 frases distintas y ocupa 288.159 bytes, **cerca
del 14 % de todo lo que el navegador se descarga al abrir**. Su único uso es la frase que rota cada
quince segundos en la pantalla previa a entrar, y se descarga siempre —también para quien ya tiene
la sesión abierta y no llegará a ver ninguna—.

- **Qué se elimina:** el material que enseña en las pantallas donde se decide. El vocabulario llano
  se conserva; el curso, no.
- **Qué cuesta:** la portada pierde su gancho y hay que sustituirlo por un hecho del mercado.

### 2.4 La caducidad de lo que el usuario escribió

Esto no lo vio ninguna lente y es lo más barato de arreglar. Medido contra las constantes reales:
el perfil creado por el alta pública vive **45 días**; el presupuesto que el contratista costeó
actividad por actividad, **30**; el dictamen del pliego, **30**. Al llegar a 300 perfiles, el alta de
un desconocido desaloja al más viejo. Y hay un agujero peor: la lista de claves que ese desalojo
borra **no incluye los procesos guardados**, que se escriben sin fecha de caducidad y quedan en la
base para siempre, sin ningún dueño que pueda volver a alcanzarlos.

- **Qué se elimina:** que el producto olvide a su usuario en mes y medio.
- **Por qué importa más de lo que parece:** todo lo acumulativo que propone este documento —el
  marcador de aciertos, la tabla de descuentos por entidad, cualquier historia por año— necesita
  meses del mismo usuario. Hoy el producto no tiene ni su correo ni una clave suya: quien pierde el
  enlace pierde el trabajo, sin aviso y sin recuperación.

## 3 · Reducir · qué estamos ofreciendo muy por encima de lo que hace falta

### 3.1 La tarjeta ya llegó a su techo

Una tarjeta pinta 26 campos distintos de la fila, y el censo del propio proyecto cuenta 37 filas de
«lo que se ve». Cada dato nuevo que entra ahí ya no suma: resta. Existe un plan abierto para esto
—`docs/PLAN_REFORMA_DATOS.md § «7. Lo que decide el dueño antes de empezar»`— esperando once
decisiones suyas. No decidirlo es decidir que la tarjeta siga creciendo.

### 3.2 Un solo juego de filtros, y declarado

Hay dos juegos. Los siete que se anuncian, y ocho «Avanzados» plegados que **actúan por fuera del
contador**: con ellos puestos, el número del botón «Filtros» sigue en cero y la pantalla anuncia
«N oportunidades», como si usted no hubiera filtrado nada.

Uno de ellos hace daño de verdad, y está reproducido ejecutando la función real: el **anticipo
mínimo viene puesto en 20 % desde el primer momento**, sin que usted lo haya elegido, y no es solo
la casilla —la aplicación aplica ese 20 % por su cuenta al armar la lista, el tablero y sus
conteos—. Un proceso que publique un anticipo del 10 % no aparece; baje el mínimo a cero y aparece.
«Quitar todos» no lo desactiva, el aviso de «si quita este filtro aparecen tantos» nunca lo propone,
y si usted lo baja a cero, al recargar vuelve a 20 %. Remate: **deja pasar al que declara que NO paga
anticipo y aparta al que sí paga algo por debajo del 20 %**.

Cuántos procesos reales está apartando no se sabe: exige medirlo sobre los datos en vivo.

- **Lo que se reduce:** de quince controles a un solo juego declarado, con el anticipo naciendo en
  cero. Un filtro que usted nunca pidió no puede seguir descartando en su nombre.
- **Aviso honesto:** el día que nazca en cero, la lista **cambia de tamaño** y aparecen procesos que
  hoy no salen.

### 3.3 Los bancos de precios: de motor a contraste

Los precios de referencia oficiales se recogieron entre el 16 y el 18 de agosto de 2026 y desde
entonces no se han vuelto a recoger: no hay ninguna tarea automática que los renueve, y renovarlos
exige trabajo técnico fuera de la aplicación —volver a bajar cada lista, a veces a partir de
archivos que hay que conseguir a mano, y publicar el resultado—. La aplicación ya confiesa parte de
eso en pantalla («el semestre cerró hace 76 días»), pero solo de tres de las cinco listas, y de
ninguna dice cuántos días hace que se recogió.

Mientras tanto, el nivel de precio que manda sobre todos los demás es **el suyo**: los precios que
usted corrige a mano. Es lo único que mejora con el uso y lo único que un competidor con nómina
editorial no puede copiar.

- **Lo que se reduce:** los bancos dejan de ser el motor y pasan a ser el contraste contra el que se
  revisa su propia lista de precios.
- **Qué cuesta:** quien empieza se queda sin precio de arranque si se retiran; hay que conservarlos
  como semilla, con su fecha encima, no eliminarlos.

### 3.4 Los supuestos que deciden sin que nadie los vea

Esto tampoco lo vio ninguna lente, y es donde más daño se puede hacer. Detrás de cada cifra de plata
hay siete constantes fijas que el usuario no ve ni puede tocar: que la entidad paga a 60 días, un
interés del 20 % anual, un 12 % de costos indirectos, una prima de riesgo del 2,32 %, tres meses de
cola de liquidación, un 5 % de utilidad mínima y cinco millones de costo de preparar la oferta. Seis
de las siete no aparecen ni una vez en las pantallas.

Medido ejecutando el flujo de caja real: **cambiar solo el supuesto de los 60 días mueve la plata que
hay que poner de 169.500.000 a 638.365.385 pesos**, y el costo financiero de 6,3 a 38 millones. Y la
aplicación **ya mide cómo paga y cómo ejecuta cada entidad** —prórrogas, suspensiones, porcentaje
pagado— y lo enseña en la ficha de la entidad, sin que entre jamás en ese cálculo.

- **Lo que se reduce:** el número de supuestos. Cada uno que se sustituya por lo que la aplicación ya
  midió convierte un techo en una cifra.
- **Por qué es la regla de la casa:** una cifra redondeada para mostrar no puede decidir; aquí una
  cifra **supuesta** decide.

### 3.5 Lo construido y apagado: o se enciende o se archiva

El censo de lo apagado no es pequeño: el registro con correo y contraseña, la portada pública
(su arranque no puede ejecutarse porque el elemento que pide no existe), una operación de cotización
sin un solo llamador, el dictamen con modelo (que no corre sin una clave de programación que el
proyecto decidió no tener), y un puñado de piezas más. Todo eso pesa en cada cambio y en cada
corrida de pruebas, y no lo paga nadie.

- **La regla que se propone es comercial, no de estilo:** lo que no entre en un plan este mes se
  archiva con su fecha. Nada se borra; la crónica conserva el porqué.

## 4 · Incrementar · qué llevar muy por encima del estándar

### 4.1 El precio recomendado, al frente

Esto es lo único de Detekta que no se puede comprar en ninguna otra plataforma, y hoy viaja plegado.

La refutación corrigió el diagnóstico y conviene leerlo con cuidado, porque la versión ingenua hace
daño: **el mejor precio no es el piso**. Ejecutando el optimizador real sobre un caso de mil millones
con setecientos de costo directo, el valor esperado de la ganancia es máximo ofertando con un **5 %
de descuento** sobre el presupuesto oficial; y el motor de probabilidad, ejecutado, multiplica por
1,88 la opción de ganar al pasar de un 8 % a un 20 % de baja. Es decir: el modelo premia bajar y el
piso es el único freno. Poner «hasta dónde puedo bajar sin perder» como cifra principal es enseñarle
al contratista a ofertar justo donde peor se gana.

- **Lo que sube al frente:** el precio recomendado con su banda. El piso, solo como límite rojo.
- **Dónde está hoy:** solo dentro del editor de precios, para quien ya costeó el presupuesto
  actividad por actividad. En la lista, que es donde se decide, no está ninguna de las dos cifras.
- **Condición:** esto va **después** de arreglar los supuestos del apartado 3.4. Publicar una cifra
  bien maquetada construida sobre siete constantes que nadie vio es exactamente el daño que esta
  casa dice no hacer.

### 4.2 El rival con nombre propio, donde se decide

La primera pregunta ante un proceso es «¿quién gana aquí y con qué baja?»: de ahí sale si es un
nicho, un mercado abierto o un pliego hecho a la medida. El producto tiene esa respuesta construida
—quién gana, con qué concentración, cuánto tarda la entidad en adjudicar, cuántos declara
desiertos— y la enseña casi siempre dentro de ventanas emergentes. En la lista, lo que se ve es un
promedio y un adjetivo. Un nombre repetido seis veces en quince procesos hace retirarse en diez
segundos; un promedio de 2,0 no hace nada.

- **Qué cuesta:** poner nombres propios obliga a una regla de identidad (la misma empresa con tres
  razones sociales) y a escribir siempre las dos lecturas posibles —nicho ganable o pliego a la
  medida—, nunca la acusación.

### 4.3 La honestidad, convertida en producto verificable

Detekta ya prefiere decir «sin dato» a inventar. Ese es el eje donde conviene ser extremo, porque es
el único donde la competencia no puede seguir sin publicar sus propios errores. Tres frentes
medidos:

- **La frescura del precio** es hoy una confesión («el semestre cerró hace tantos días») en vez de una
  promesa. Debería ser la cláusula que se vende: usted no paga por tener precios, paga por poder
  defender ante una entidad de dónde salió cada uno y de cuándo es.
- **Las palabras del servidor.** La revisión automática que impide que asomen siglas del oficio solo
  mira los archivos que dibujan la página. El titular de cada licitación está bien escrito («Esta
  obra no encaja con su RUP», «Supera su capacidad de contratación»), pero la explicación de por qué
  no le alcanza —la que aparece al abrir «Más detalles»— conserva siglas como CRPC, capacidad
  residual y UNSPSC. La vista sin clave tampoco las quita: solo oculta las cifras de dinero.
- **La guía de qué falta y para cuándo** está calculada, es barata y solo la ve quien ya sabe pulsar
  «Guardar». Es justo lo que hace cerrar el portátil sabiendo qué hacer mañana.

### 4.4 Lo que sale de la aplicación es el único canal de venta que no le consume tiempo

El Excel de la lista tiene 18 columnas en dos hojas, y **nueve de esas columnas no salen del portal
público**: son la evaluación que hace Detekta con sus datos. El archivo vale bastante más que la
ficha que cualquiera baja. Pero no lleva, en ninguna de sus dos hojas, las cifras con las que usted
decide cuando mira la pantalla: cada cuántos procesos se gana uno y cuánta plata deja el contrato.
De las tres cifras que la aplicación pone juntas en cada licitación, el archivo se lleva una. En la
reunión donde se fija el precio, usted llega sin las otras dos.

## 5 · Crear · qué no ofrece nadie todavía

### 5.1 Qué descuenta de verdad cada entidad

Detekta ya lee del pliego los descuentos de cada pago —estampillas, retenciones, la contribución de
obra pública— con su porcentaje, la frase literal y la página; los guarda con el proceso y los
enseña en su ficha. Faltan tres cosas, y la tercera es la que nadie tiene:

1. En la ficha del proceso los descuentos aparecen **sin la cita ni la página**: se pierden al
   guardar, así que ahí no se pueden auditar como sí se auditan los requisitos.
2. Ese total **no entra solo en el precio**: el porcentaje se sigue escribiendo a mano, y mientras no
   se escriba, la ganancia que usted ve es un techo, no una cifra cerrada.
3. **No hay ningún acumulado por entidad.** Cada pliego leído por cualquier usuario podría ir
   construyendo la tabla de qué descuenta cada municipio y cada gobernación —que no publica nadie—,
   con su evidencia y su fecha.

Corrección honesta frente al diagnóstico inicial: no son «diez puntos de margen en riesgo». De lo que
se lee, la contribución del 5 % ya la descuenta la aplicación por su cuenta y la retención en la
fuente se cruza después; lo que de verdad se pierde es bastante menor. En la corrida de prueba, de un
10,3 % leído, lo aplicable era 2,8 %.

### 5.2 Cuántos días da esta entidad para ofertar

Ninguna plataforma publica el **plazo**: todas publican la fecha de cierre. Y el plazo es a la vez la
pregunta que más bloquea a quien empieza («¿alcanzo a armar la oferta?») y la señal más barata de
pliego hecho a la medida —el que da el mínimo, o el que abre el 23 de diciembre—.

Medido por censo ejecutado sobre las 1.152 funciones publicadas del servidor: ese número no existe
en ninguna parte. Y no hace falta ninguna fuente nueva: las dos fechas ya llegan con cada proceso y
el calendario colombiano de festivos ya está dentro, funcionando y con pruebas. Falta la resta.

Dos cautelas de la refutación: un proceso puede quedar guardado sin fecha de cierre y una fecha con
año imposible se trata como ausente, así que el resultado tiene que poder salir «sin dato» y nunca
cero; y ya hay tres cuentas de «días» en el producto, así que este no puede llamarse parecido a
ninguna.

### 5.3 El marcador: dijimos «1 de 9», ¿qué pasó?

Cuando usted guarda un proceso, la aplicación anota en ese momento la opción de ganar que le mostró,
con su banda y los rivales esperados, y más adelante le añade el resultado real con su fecha en
cuanto usted lo marca ganado o perdido. Ese par está guardado, viaja al navegador en cada carga y
sale íntegro en la copia de sus datos. **Ninguna pantalla lo mira.**

La aplicación ya le dice cuántas ganó de las que presentó; lo que no hace es ponerlo al lado de lo
que le había previsto. Ninguna plataforma de este mercado publica si acertó: todas piden confianza.

- **Qué cuesta:** puede salir mal en público, y con pocos procesos la muestra es minúscula: se
  publica siempre con su n y jamás como porcentaje.
- **Condición:** exige antes quitar la caducidad del apartado 2.4. Si no, nace midiendo mes y medio
  y borrándose solo.

### 5.4 El cupo de la aseguradora

El hueco más grande del producto, y no lo vio ninguna lente. Las tres condiciones que deciden miden
capacidad de papel: registro, capacidad de facturar y patrimonio. La que deja a un contratista fuera
en la práctica es **la aseguradora**: sin póliza de seriedad no se presenta, y la póliza de estabilidad
inmoviliza cupo durante años, de modo que ganar un contrato puede impedirle presentarse al siguiente.

Medido por censo ejecutado: **cero** de las 1.196 funciones publicadas del servidor menciona cupo,
póliza, afianzamiento o aseguradora. El material de dominio del propio repositorio ya lo declara la
restricción que de verdad ata, por encima de la capacidad de contratación, y quedó como pregunta sin
responder. Su costo tampoco entra: las pólizas del contrato están situadas entre el 1 % y el 3 % del
valor, y ninguna cifra de ganancia lo resta.

Se pregunta una vez, se descuenta con cada proceso guardado, y su costo entra en el margen.

### 5.5 El aviso que nombra la cifra, y el sobre de la oferta

Avisar de adendas lo hacen todas las plataformas y el propio portal público: ahí Detekta pierde.
Pero **nadie dice qué cambió**. Aquí está construido: el vigía compara nueve requisitos numéricos
entre dos versiones del pliego, con su página, y reevalúa contra su perfil. La diferencia entre un
aviso que se ignora y uno que cambia lo que usted hace esa mañana es la unidad del aviso: de
documento a cifra, y de cifra a consecuencia para usted.

Y el tramo final no lo cubre nadie: el producto acompaña hasta «me conviene» y suelta al contratista
justo donde se pierde una oferta por un papel vencido. Las piezas existen repartidas —el guardián de
los motivos de rechazo, la justificación del precio, el índice de documentos, el cronograma— y
algunas no las pide ninguna pantalla.

## 6 · Lo que bloquea a todo lo demás, y en qué orden conviene hacerlo

Tres cosas hay que resolver **antes** que las veintitantas de arriba, porque sin ellas las demás se
construyen sobre arena.

### 6.1 De quién es cada dato

Medido ejecutando: el guardián comprueba **la llave, nunca al dueño**. Con la llave, cualquiera lee y
escribe el casillero de cualquier perfil; y esa llave es una sola para todo el sitio y viaja escrita
dentro del programa que se sirve a cualquier visitante. El correo diario, además, tiene un único
destinatario fijado en el despliegue.

Consecuencia: **hoy no puede existir un segundo usuario con datos propios**. Es el único problema que
empeora solo —cada semana se escriben más datos bajo una llave que no ata a nadie— y es la condición
para poder eliminar la clave compartida sin apagar toda la escritura del producto.

### 6.2 Que no se borre lo que el usuario escribió

El apartado 2.4. Es barato, no toca ninguna pantalla y desbloquea todo lo acumulativo.

### 6.3 Una medición mínima de uso

No hay ninguna: cero apariciones de medición de uso en los 130 archivos del servidor. Este documento
propone eliminar o reducir una docena de cosas sin un solo dato de qué abre alguien. Recortar sin
medición es apostar, y en oportunidades el falso caro es el negativo: quitar algo que sí se usaba no
deja rastro. Dos semanas de datos bastan para saber si alguien toca los filtros avanzados y si «Más
detalles» se abre siempre —si se abre siempre, no es un pliegue: es la tarjeta de verdad—.

### 6.4 El orden recomendado

1. La identidad por perfil (6.1).
2. Quitar la caducidad de lo que el usuario escribió (6.2).
3. La medición mínima de uso (6.3), **antes** de eliminar y reducir, no después.
4. Los supuestos del dinero a la vista y sustituidos por lo medido (3.4), empezando por los días de
   pago, más el anticipo mínimo en cero y las deducciones leídas del pliego.
5. El precio recomendado al frente, con el piso como límite rojo (4.1).
6. El cupo de la aseguradora (5.4).
7. Solo entonces, el resto: el marcador, la tabla por entidad, los días para ofertar, el sobre de la
   oferta, el correo encendido y las palabras del servidor.

## 7 · La segmentación en dependencias

El encargo: «que al momento de hacer cambios no se tenga que leer toda la estructura de la página
web». La buena noticia está medida: **la costura ya existe, solo falta declararla**. La pantalla de
Precios y la de Mis procesos no se llaman entre sí ni una vez, en ningún sentido; Precios y
Licitaciones se llaman cuatro veces una vez descontado el juego de ayudas comunes.

### 7.1 Seis dependencias, no siete

Son las seis del apartado 1. Se consideró separar «el semáforo» (¿puedo presentarme a este proceso?)
de «mi empresa» (¿quién soy?), y se descartó con el criterio del dueño: poder señalar una pieza y
decir de quién es sin abrir nada. La pieza de la capacidad de facturar admite dos respuestas
defendibles, y **una frontera que admite dos respuestas no es una frontera**.

### 7.2 Lo que no es de nadie

Hay nueve cosas que no pueden pertenecer a ninguna dependencia, y es donde están hoy los problemas:

- **El lector del archivo guardado.** Cuatro funciones escondidas dentro del archivo que arma la
  lista; siete sitios de tres zonas distintas van a buscarlas ahí. Si mañana cambia la vitrina, se
  rompen el pliego y mis procesos.
- **La bodega y la llave** (guardar, leer, comprobar quién entra): las únicas tres piezas que usan las
  seis dependencias sin excepción.
- **Cómo se cuenta un día hábil en Colombia**, con sus festivos: diecisiete sitios lo preguntan. Dos
  calendarios darían dos fechas de cierre para el mismo proceso.
- **Cómo se saca una mediana**: ya se declara a sí misma «la única», y nació precisamente porque
  vivían cinco copias que ya divergían.
- **Cómo se escribe y se compara un código de clasificación de obra**: veintidós sitios.
- **Los nombres de las columnas del portal público**: el día que renombren una, se cambia en un sitio.
- **Las cifras de ley y de referencia:** son siete, repartidas por siete archivos de siete
  dependencias distintas, y **una de ellas está escrita dos veces** con el mismo valor en dos sitios,
  con solo una de las dos copias sujeta por una prueba. Es exactamente el caso prohibido: dos
  cuentas iguales hoy que se separan a la primera corrección.
- **Las palabras y los formatos de pantalla**: once pantallas se escribieron cada una su manera de
  pintar una cifra en pesos y una fecha, y al menos dos pares son copias idénticas. Dos de esas
  copias escriben un cero donde no hay dato.
- **La página de la que sale una cita del pliego**: siete sitios la necesitan.

### 7.3 El plan, en diez pasos

Un paso por sesión, la suite entera en verde antes de cada guardado, y la decisión escrita en la
crónica en el mismo guardado. Los pasos son independientes salvo donde se dice.

| # | Paso | Qué gana | Riesgo | Cuesta |
|---|---|---|---|---|
| 1 | **Escribir en cada pieza de quién es.** Cada archivo del servidor ya tiene una primera línea que dice qué hace; se le añade delante el nombre de su dependencia. No se mueve ni se renombra nada. | Abrir cualquier archivo y saber de quién es sin leer nada más | Muy bajo | 1 sesión |
| 2 | **Que el buscador diga la dependencia.** La herramienta ya lee esa primera línea; se le enseña a agrupar por ella y a responder «enséñame todo lo de Precios». | Preguntar qué hay en Precios y recibir la lista en dos segundos | Muy bajo | 1 sesión |
| 3 | **Poner la cerca, con las puertas de hoy declaradas.** Una comprobación que avisa cuando una dependencia mete la mano en las tripas de otra; los cruces de hoy se declaran con su motivo. No bloquea: cuenta. | Nadie abre un cruce nuevo sin enterarse, y usted tiene un número que baja | Bajo | 1 sesión |
| 4 | **Sacar el lector del archivo guardado de su escondite.** Se mueven las cuatro funciones juntas, con su memoria puesta. | El pliego y mis procesos dejan de depender de la vitrina | Medio: si se reparten o pierden su memoria, el producto se vuelve lento | 1 sesión |
| 5 | **Sacar el conteo de la puerta de entrada.** Tres sitios entran a cogerlo prestado de donde no es. | Tocar la puerta de entrada deja de cambiar la cifra del tablero | Bajo, con red ya puesta | 1 sesión |
| 6 | **El estante de las cifras de ley.** Las siete a un sitio, cada una con su norma y su fecha, y se arregla la que está duplicada. | Cambia el salario mínimo y se cambia en un sitio | Medio: son números que fijan ofertas | 1 a 2 sesiones |
| 7 | **Cortar los cuatro cables de un solo hilo.** Cuatro piezas grandes de las que los demás solo usan una cosa reciben una ventanilla estrecha. | Donde más se desenreda por menos trabajo | Bajo | 1 sesión |
| 8 | **Un solo juego de formatos en pantalla.** Los formatos van donde ya viven las palabras comunes. | La misma cifra se ve igual en todas partes; se cierra el riesgo del cero falso | Medio: hay que abrirlo en un navegador real | 1 a 2 sesiones |
| 9 | **Agrupar en carpetas lo que ya es de uno solo.** Entre veintiuna y veinticinco piezas. | Abrir una carpeta y ver Precios completo | Alto: mover un archivo cambia su dirección, y hay cientos escritas en las pruebas y en la crónica | 2 a 3 sesiones |
| 10 | **(Opcional, y al final) Partir el archivo grande de la pantalla.** 10.962 líneas donde conviven las seis dependencias. | Dejar de abrir el archivo más grande para tocar cualquier cosa | El más alto: produce fallos que ninguna prueba de las nuestras ve | 3 o más sesiones |

Una corrección medida sobre la promesa: si se cuenta solo quién llama a cada pieza directamente, la
mitad del servidor ya es de una sola dependencia; si se sigue la cadena entera —que es como se rompe
algo de verdad— esa mitad baja a una cuarta parte, justo por el escondite del paso 4. No cambia el
plan; cambia lo que se puede prometer.

### 7.4 Lo que no se toca

- Los seis archivos de entrada del servidor: lo nuevo se pliega dentro de los que hay.
- Las dos copias del formateador de cifras cortas: están duplicadas a propósito, con su motivo
  escrito y con una prueba que obliga a que coincidan.
- La única mediana y la única fórmula de capacidad: el plan las mueve de estante, jamás crea una
  segunda.
- **La asimetría de la duda**: ante la falta de información, la vitrina enseña en ámbar y el precio se
  calla. Son dos criterios opuestos, deliberados, y unificarlos por elegancia rompe el producto por
  los dos lados.
- Las tres reglas de forma que ya costaron un fallo mudo cada una: el arranque va al final, las
  llamadas que cerrarían un círculo van dentro de la función, y leer la respuesta va aparte de
  pedirla.
- No se mueve ni se renombra nada hasta que la cerca del paso 3 esté contando.
- Ninguna palabra que el contratista vea en pantalla: toda esta reorganización es muda para él.

## 8 · Medido, supuesto y no verificable desde aquí

**Medido** (comando ejecutado sobre el árbol 5db53f7 o efe3776, 14-sep-2026): el tamaño y el reparto
del código y de los datos; que la cuarta marca de requisitos devuelve siempre «cumple» y sale verde
sin histórico; que un proceso con 10 % de anticipo desaparece de la lista con los valores por defecto
y reaparece con el mínimo en cero; las 18 columnas del Excel y las cuatro cifras que no lleva; que el
pronóstico congelado y su desenlace no los lee ninguna pantalla; las fechas de captura de los bancos
de precios y la ausencia de tarea que los renueve; que el alta pública funciona sin clave y que el
registro con correo responde que no está conectado; las caducidades de 45, 30 y 30 días y el desalojo
a los 300 perfiles; que el guardián comprueba la llave y no al dueño; que no existe ninguna función
sobre cupo de aseguradora ni sobre días para ofertar; que cambiar el supuesto de pago a 60 días mueve
la caja necesaria a casi cuatro veces; que el óptimo del propio motor está en un 5 % de descuento.

**Supuesto** (declarado, no medido): que quitar el curso de la pantalla de decisión mejora la
decisión; que los nombres propios de competidores en la lista se leen como información y no como
acusación; que dos semanas de medición de uso bastan para decidir qué recortar; el orden del
apartado 6.4, que es un juicio sobre dependencias, no una medición. Las sesiones estimadas en el
apartado 7.3 son estimaciones, no mediciones.

**No verificable desde aquí:** cuántos procesos reales aparta hoy el filtro de anticipo (exige los
datos en vivo); si el aviso por correo de hoy salió (la aplicación tampoco puede responderlo);
cualquier cifra de uso real, porque no existe medición; y el comportamiento en producción, que esta
sesión no alcanza.
