# EMPEZAR AQUÍ · Guía de cero para convertir Detekta en un negocio
### 24-ago-2026 · Escrita para leerse sin conocimientos técnicos ni jurídicos

---

## ANTES DE NADA: QUÉ ES ESTE DOCUMENTO Y QUÉ NO ES

**Qué es.** La guía de arranque. Usted hoy tiene **código funcionando y nada más**: no hay empresa, no
hay cuenta de banco, no hay forma de cobrar. Este documento le dice, en orden y con palabras normales,
qué hacer desde el primer día.

**Qué no es.** No es asesoría jurídica ni contable. Hay tres momentos en los que **tiene que hablar con
un profesional**, y están marcados así: 🧑‍⚖️ **ABOGADO** · 🧮 **CONTADOR**. Cuando vea uno de esos
símbolos, no improvise.

**Cómo se lee.** De arriba abajo, una vez. Después se usa como lista: se hace un paso, se marca, se
pasa al siguiente. **No hay que entender todo el documento para empezar el primer paso.**

**Una advertencia sobre las cifras.** Todos los precios y tarifas que aparecen aquí están verificados a
agosto de 2026 y con su fuente al final. **Los precios cambian cada año, casi siempre en enero.**
Confirme antes de pagar.

---

# PARTE 0 · ENTENDER LA SITUACIÓN EN CINCO MINUTOS

## ¿Qué tiene hoy?

Una aplicación que funciona, publicada en internet, protegida con una contraseña que usted comparte
con quien quiere que entre. La usa usted. **Está construida como una herramienta personal**, y eso se
nota en tres cosas concretas:

1. **Los datos de "la empresa" están guardados una sola vez, para todo el sistema.** Sus contratos
   ejecutados, sus consorcios y su estructura de costos viven en un solo cajón. Mientras el único
   usuario sea usted, funciona perfecto. **El día que entre un segundo cliente, ese cliente abre el
   mismo cajón y ve lo suyo.**
2. **No existen usuarios.** No hay forma de que alguien se registre, ponga una contraseña propia y
   tenga su propio espacio. Hay una sola llave, y está escrita a la vista dentro de la página: quien
   sepa mirar el código fuente, la lee.
3. **No hay forma de cobrar.** Ni una línea. Ni pasarela, ni planes, ni facturas.

## ¿Qué falta para que sea un negocio?

Cuatro cosas, en este orden. **El orden importa y no se puede cambiar:**

```
1. UNA EMPRESA que pueda facturar          ← trámite, 1 a 3 días
2. SEPARAR a los clientes entre sí         ← programación, lo más largo
3. CUENTAS de usuario con contraseña       ← programación
4. COBRAR                                  ← programación + trámite bancario
```

**Por qué no se puede cambiar el orden.** No se puede cobrar sin factura (paso 1). No se puede tener
clientes sin separarlos (paso 2), porque el primero vería los datos del segundo. No se puede cobrar a
alguien que no sabemos quién es (paso 3). El paso 4 va último por fuerza.

## ¿Cuánto tarda y cuánto cuesta?

| | |
|---|---|
| **Tiempo de programación** | 11 a 16 semanas si trabaja tiempo completo; el doble si es a ratos |
| **Costo de arranque (una vez)** | **$300.000 a $700.000** entre cámara de comercio y trámites |
| **Costo mensual fijo** | **US$ 20 a 40** (unos $90.000 a $180.000, según el dólar del día) |
| **Costo por cliente nuevo** | **Prácticamente cero.** Cien clientes gastan menos de un dólar al mes de servidor |
| **Marca registrada (opcional)** | $1.347.500 por categoría, si decide protegerla |

**La conclusión importante:** esto **no es un negocio caro de montar**. Lo caro es su tiempo. Y lo que
de verdad limita cuántos clientes puede tener no es el servidor: **es cuántas personas puede atender
usted solo.**

---

# PARTE 1 · SU SITUACIÓN CON ENTERRITORIO, CONTESTADA

> **Esta parte es la más delicada del documento.** Léala completa antes de constituir nada.
> Y al final hay una recomendación concreta que le sugiero seguir aunque le parezca excesiva.

## 1.1 · Primero, una corrección: ENTerritorio no es lo que usted cree

Usted escribió que ENTerritorio es "una entidad de economía mixta". **No lo es.**

**ENTerritorio es una Empresa Industrial y Comercial del Estado**, de carácter financiero, con
personería jurídica y patrimonio propio, **vinculada al Departamento Nacional de Planeación** y
vigilada por la Superintendencia Financiera. Antes se llamaba FONADE y se transformó por el
**Decreto 495 del 20 de marzo de 2019**.

**En castellano:** es una empresa **100 % del Estado**, no una mezcla de capital público y privado.
Una sociedad de economía mixta es otra cosa: es aquella donde hay accionistas privados junto al
Estado.

**¿Y esto por qué importa?** Porque el tipo de entidad determina qué reglas de contratación le
aplican y bajo qué régimen trabaja. Si usted le explica a un abogado que es "de economía mixta",
va a analizar su caso bajo unas normas que no son las suyas. **Dígalo bien: Empresa Industrial y
Comercial del Estado, vinculada al DNP.**

## 1.2 · ¿Ser contratista por OPS le impide crear una empresa?

**No.** Y esto está sólidamente establecido:

- **Un contratista de prestación de servicios no es un servidor público.** No es titular de un empleo
  público, y por eso queda **fuera** del artículo 128 de la Constitución, que es el que prohíbe a los
  servidores públicos recibir más de una asignación del tesoro.
- **Las prohibiciones para contratar con el Estado —las "inhabilidades"— son taxativas y de
  interpretación restrictiva.** Eso significa que solo existen las que están escritas en la ley, una
  por una, y **no se pueden extender por analogía ni por parecido**. Si su caso no está en la lista,
  no hay inhabilidad.
- **No existe ninguna norma** que le impida a un contratista de prestación de servicios tener varios
  contratos, ni con la misma entidad ni con varias, siempre que sea idóneo.

**Y hay un punto que resuelve casi todo:** las inhabilidades regulan **quién puede contratar CON el
Estado**. Su empresa no va a contratar con el Estado: **va a venderle un programa de computador a
empresas privadas** —contratistas de obra— que pagan una suscripción mensual. Por ese lado **no hay
inhabilidad que analizar**, porque no hay contrato estatal.

## 1.3 · Los cuatro riesgos que sí tiene, en orden de gravedad

### 🔴 Riesgo 1 · La información de ENTerritorio — **el que de verdad importa**

ENTerritorio **estructura y ejecuta proyectos de infraestructura** para municipios y departamentos.
Dicho de otro modo: **es una entidad que abre procesos de contratación de obra**. Y Detekta es una
herramienta que le dice a los contratistas **a qué procesos presentarse**.

Si por su trabajo usted conoce procesos **antes de que se publiquen**, y esa información entrara en el
producto —**o incluso si alguien pudiera pensar razonablemente que entró**—, eso es grave. No es un
tecnicismo: es el terreno de los acuerdos restrictivos de la competencia, que en Colombia son delito.

**La buena noticia es que su defensa ya está construida, y es sólida.** Detekta se alimenta
**exclusivamente de fuentes públicas**: los datos abiertos del Estado, que cualquiera puede descargar.
Todo el proyecto está documentado con qué dato sale de dónde, con qué fecha y bajo qué licencia. **Eso
no es un detalle técnico: es la prueba de que su producto no usa información privilegiada.**

**Lo que tiene que hacer:**
1. **Nunca** meter en el producto un dato que venga de ENTerritorio y no sea público.
2. **Nunca** usar el producto para favorecer a un contratista en un proceso de ENTerritorio.
3. **Dejar por escrito** —en el sitio web y en los términos— que los datos salen de fuentes públicas,
   con el nombre de cada fuente. Ya está en el plan (es la tarea F1-2).
4. Si algún día un cliente le pide "información de adentro", **decir que no, por escrito**, y guardar
   el mensaje.

> **La regla del oficio, que ya está en el manual de licitaciones de este mismo proyecto:**
> **«¿me incomodaría que esto se publicara?»** Si la respuesta es sí, no se hace. Canal formal siempre.

### 🟠 Riesgo 2 · Lo que diga su propio contrato

Aquí está la respuesta que más le va a servir, y es más simple de lo que parece: **la respuesta está en
su contrato, y usted lo tiene.**

- **La exclusividad no se presume.** Si su contrato no dice expresamente que usted se dedica en
  exclusiva a ENTerritorio, **no está obligado a la exclusividad**. Pero si lo dice, lo dice.
- Muchos contratos estatales traen además cláusulas de **conflicto de intereses**, de **manejo de
  información** y remisión a un **código de integridad** de la entidad.

**Qué hacer, hoy mismo, y le toma veinte minutos:** abra el PDF de su contrato y busque estas palabras
con Control+F: `exclusiv` · `dedicación` · `conflicto` · `confidencial` · `reserva` · `integridad` ·
`incompatib` · `otras actividades`. Copie lo que encuentre en un archivo aparte. **Eso es lo que le va
a llevar al abogado**, y con eso la consulta le sale mucho más barata y mucho más útil.

### 🟠 Riesgo 3 · Si usted se presenta a licitaciones de ENTerritorio

Distinto del anterior. Si su empresa de obra (los perfiles que hoy están cargados en Detekta) se
presenta a un proceso **de ENTerritorio** mientras usted es contratista de ENTerritorio:

- **No es automáticamente una inhabilidad** — insisto: son taxativas.
- **Pero es exactamente el caso que la entidad tiene el deber de mirar.** La doctrina oficial dice que
  la entidad debe identificar cualquier situación de **"concurrencia de intereses antagónicos"** en el
  contratista. Un ejemplo típico que citan es el mismo contratista haciendo obra y supervisión.

**Recomendación:** mientras dure el contrato de prestación de servicios, **no se presente a procesos de
ENTerritorio**. A otras entidades, sí, sin problema. Es una restricción pequeña —ENTerritorio es una
entidad entre cientos— y le ahorra una discusión que no le conviene tener.

### 🟡 Riesgo 4 · La declaración de bienes y conflictos de interés

La **Ley 2013 de 2019** obliga a ciertos servidores públicos **y contratistas** a declarar bienes,
rentas y conflictos de interés en una plataforma del Estado, con actualización anual y **comunicando
cualquier cambio dentro de los dos meses siguientes**.

**Si usted es sujeto obligado** —eso lo confirma su entidad, no yo—, entonces constituir una sociedad
es exactamente uno de esos cambios que hay que registrar.

**Qué hacer:** pregúntele por escrito al supervisor de su contrato o a Talento Humano de ENTerritorio
si usted está en la lista de obligados. Si lo está, registre la sociedad cuando la cree. **Declarar no
tiene ningún costo; omitirlo sí.**

## 1.4 · Lo que le recomiendo hacer, y por qué aunque parezca excesivo

**Avise por escrito, antes de constituir la sociedad.**

Un correo al supervisor de su contrato, con copia a quien corresponda, más o menos así:

> *Asunto: Aviso de constitución de sociedad — [su nombre], contrato N.º [xxx]*
>
> *Cordial saludo. En cumplimiento de mis deberes de transparencia, informo que voy a constituir una
> sociedad dedicada al desarrollo y comercialización de programas de computador, cuyo objeto es
> ofrecer, mediante suscripción, una herramienta de análisis de información pública de contratación
> estatal dirigida a empresas privadas del sector de infraestructura.*
>
> *Dejo constancia de que: (i) la sociedad no celebrará contratos con ENTerritorio; (ii) el producto se
> alimenta exclusivamente de fuentes de información pública y de acceso abierto; (iii) no se utilizará
> información conocida en razón de mi contrato; y (iv) esta actividad no interfiere con el objeto ni
> con la disponibilidad pactada en mi contrato.*
>
> *Quedo atento a cualquier observación o requerimiento.*

**Por qué hacerlo aunque nadie se lo pida.** Un aviso previo, con radicado, convierte una sospecha
futura en un papel que usted mostró **antes** de que hubiera nada que ocultar. Cuesta diez minutos. Si
alguna vez alguien pregunta, ese correo responde solo. Y si le contestan algo que usted no esperaba,
se entera **ahora** y no cuando ya tenga clientes.

## 1.5 · 🧑‍⚖️ ABOGADO · Las cinco preguntas exactas

Llévele esto, ya escrito, y las cláusulas que sacó en el Riesgo 2:

1. *Soy contratista de prestación de servicios de ENTerritorio (Empresa Industrial y Comercial del
   Estado vinculada al DNP, Decreto 495 de 2019). ¿Puedo constituir y ser accionista de una SAS que
   vende software por suscripción a empresas privadas?*
2. *¿Alguna de estas cláusulas de mi contrato [las que copió] me lo impide o me obliga a algo?*
3. *¿Soy sujeto obligado de la Ley 2013 de 2019? Si lo soy, ¿cómo registro la sociedad?*
4. *Mi empresa de obra, ¿puede presentarse a procesos de otras entidades mientras dure mi contrato?
   ¿Y a procesos de ENTerritorio?*
5. *¿Qué debo dejar por escrito para demostrar que el producto solo usa información pública?*

**Costo aproximado:** una consulta puntual con un abogado de contratación estatal. No necesita
contratar a nadie por meses: necesita **un concepto escrito de dos páginas**. Pídalo así, por escrito,
y guárdelo.

---

# PARTE 2 · CREAR LA EMPRESA, PASO A PASO

> **¿Hay que crearla?** Sí, se lo recomiendo. Podría facturar como persona natural, pero entonces
> **usted responde con su patrimonio personal** por cualquier problema del producto — y el producto
> produce cifras con las que otros fijan precios de ofertas. La sociedad separa las dos cosas.
> Y como **toda sociedad comercial está obligada a facturar electrónicamente desde su primera venta**,
> no hay ninguna ventaja en empezar como persona natural y migrar después: el trámite habría que
> hacerlo igual, y migrar obliga a rehacer contratos con clientes que ya firmaron.

## Lo que va a crear: una SAS

**SAS** significa **Sociedad por Acciones Simplificada**. Traducido:

- **Puede tener un solo dueño.** No necesita socios. Esto es importante: mucha gente cree que necesita
  un socio para crear empresa. No.
- **Se crea con un documento privado**, sin ir a notaría, salvo casos especiales.
- **Su responsabilidad se limita a lo que aporte.** Si la empresa tiene un problema, no le tocan la
  casa. *(Con excepciones: fraude, o no pagar impuestos y seguridad social.)*
- **Se hace en 1 a 3 días hábiles.**

## PASO 2.1 · Elegir el nombre y comprobar que esté libre

**Qué hace.** Entra a la página del **RUES** (Registro Único Empresarial y Social) y busca el nombre
que quiere. El RUES es el listado nacional de todas las empresas registradas.

**Cómo.** Busque en internet "RUES consulta nombre", entre al sitio del RUES y escriba el nombre.

**Qué está buscando.** Que **no exista otra empresa con ese nombre**. El nombre de la sociedad no tiene
que ser "Detekta": puede llamarse como usted quiera y **operar comercialmente bajo la marca Detekta**.
Son dos cosas distintas y conviene entenderlo:

| | Qué es | Dónde se registra |
|---|---|---|
| **Razón social** | El nombre legal de la empresa, el que va en la factura | Cámara de Comercio |
| **Marca** | El nombre con el que el público la conoce | Superintendencia de Industria y Comercio (opcional) |

**Ojo con esto:** que el nombre esté libre en el RUES **no significa** que la marca esté libre. Son dos
registros distintos, en dos entidades distintas. Lo de la marca va en el Paso 4.3.

**⏱️ 15 minutos · 💰 gratis**

---

## PASO 2.2 · Definir cinco datos antes de escribir nada

Escríbalos en un papel. Sin ellos no puede avanzar:

**1. Objeto social — a qué se dedica la empresa.**
Se puede poner "cualquier actividad lícita", que es lo más flexible y lo que hace casi todo el mundo.
Si prefiere describirlo, algo como: *desarrollo, comercialización y licenciamiento de programas de
computador; prestación de servicios de análisis y tratamiento de información; consultoría en
tecnología.*

**2. Capital.** Es la plata con la que arranca la empresa. **No tiene que ser mucha** — puede ser
$1.000.000. Dos advertencias:
- **El costo del registro depende del capital**: a más capital, más caro el trámite.
- **El capital sí importa después**: si algún día quiere venderle a entidades grandes, un capital de mil
  pesos se ve mal. Un punto de partida razonable son **$5.000.000 a $10.000.000**.

**3. Domicilio.** La ciudad donde queda la empresa. Determina a qué Cámara de Comercio va.

**4. Representante legal.** Quien firma por la empresa. Puede ser usted mismo.

**5. Actividad económica (código CIIU).** Es un número que clasifica a qué se dedica. Para software, el
principal suele ser **6201 — actividades de desarrollo de sistemas informáticos**, y como secundarios
**6202** (consultoría informática) y **6311** (procesamiento de datos y hospedaje). **Confírmelo en la
Cámara de Comercio**, que es donde se lo van a validar de todos modos.

**⏱️ 30 minutos · 💰 gratis**

---

## PASO 2.3 · Redactar el documento de constitución

**Qué es.** Un documento de dos o tres páginas que dice: quién crea la empresa, cómo se llama, dónde
queda, a qué se dedica, cuánto capital tiene, quién la representa y cuánto dura.

**Cómo hacerlo, de más fácil a más caro:**

| Vía | Costo | Cuándo conviene |
|---|---|---|
| **Formato de la Cámara de Comercio** | Gratis | **Es la que le recomiendo.** Las cámaras dan modelos y asesoría gratis. Para una SAS de un solo dueño, sobra |
| Plataforma en línea | $150.000 – $500.000 | Si quiere que se lo hagan todo |
| Abogado | Desde $500.000 | Si va a tener socios, o reglas especiales de reparto |

**Con un solo dueño y un objeto simple, el formato de la cámara alcanza perfectamente.** Guarde el
abogado para las cinco preguntas de la Parte 1, que es donde de verdad lo necesita.

**⏱️ 1 a 2 horas · 💰 $0 – $500.000**

---

## PASO 2.4 · Registrar en la Cámara de Comercio

**Qué hace.** Lleva el documento a la Cámara de Comercio de su ciudad —o lo sube por su portal—, llena
el formulario del RUES y paga.

**Qué sale de ahí:**
- La **matrícula mercantil**: su empresa existe.
- El **certificado de existencia y representación legal**: el papel que prueba que existe. Se lo van a
  pedir en el banco y en la pasarela de pagos. **Pida dos o tres copias.**

**Cuánto cuesta (Bogotá, 2026):**

| Concepto | Valor |
|---|---|
| Matrícula mercantil, SAS con capital hasta $32,5 millones | **$75.000 – $120.000** |
| Formulario RUES | **$4.300** |
| Certificado de existencia y representación | **≈ $12.100** cada uno |
| **Total aproximado del trámite** | **$100.000 – $150.000** |

> **La tarifa se calcula sobre los activos**, con una fórmula que arranca en unos $24.220 más un
> componente variable. Por eso **declarar más capital cuesta más**.

**⏱️ 1 a 3 días hábiles · 💰 $100.000 – $150.000**

---

## PASO 2.5 · Sacar el NIT y el RUT

**Qué es.** El **NIT** es la cédula de la empresa. El **RUT** es su registro ante la DIAN, donde queda
escrito qué impuestos le corresponden.

**La buena noticia:** por convenio entre las Cámaras y la DIAN, esto **se hace en la misma Cámara de
Comercio, en la misma ventanilla**, y **el NIT es gratis**. No tiene que ir a otro lado.

**Lo que tiene que quedar bien en el RUT** —y aquí sí ponga atención, porque corregirlo después es una
molestia—: las **responsabilidades** (los códigos que dicen si es responsable de IVA, si debe declarar
renta, si debe facturar electrónicamente) y la **actividad económica**. 🧮 **CONTADOR:** si tiene duda,
esta es la primera consulta que vale la pena.

**⏱️ Mismo trámite · 💰 gratis**

---

## PASO 2.6 · Habilitarse para facturar electrónicamente

**Qué es.** Autorizarse ante la DIAN para emitir facturas electrónicas.

**Por qué no se puede saltar.** **Toda sociedad comercial está obligada desde su primera venta**, sin
importar tamaño ni ingresos. **Una SAS constituida ayer ya está obligada.** Sin esto no puede cobrarle
legalmente a nadie.

**Cómo.** Se entra al portal de la DIAN, se habilita como facturador electrónico, se elige el servicio
gratuito de la DIAN o un proveedor tecnológico, y **se emite una factura de prueba**.

**No lo deje "para cuando haya clientes".** El trámite tarda, y su primer cliente no va a esperar.

**⏱️ 1 día de trabajo más los tiempos de la DIAN · 💰 gratis con el servicio de la DIAN**

---

## PASO 2.7 · Abrir la cuenta bancaria

**Qué necesita:** certificado de existencia y representación (reciente, menos de 30 días), RUT, su
cédula, y a veces un estudio de seguridad.

**Un consejo que ahorra dolores:** pregunte **antes de elegir banco** cuál trabaja mejor con la
pasarela de pagos que va a usar. Si va a usar Wompi —que es de Bancolombia—, tener cuenta ahí
normalmente simplifica y acelera el desembolso.

**⏱️ 3 a 15 días, según el banco · 💰 según el banco**

---

## RESUMEN DE LA PARTE 2

```
1. Nombre libre en RUES              15 min      gratis
2. Cinco datos                       30 min      gratis
3. Documento de constitución         1–2 h       $0–$500.000
4. Cámara de Comercio                1–3 días    $100.000–$150.000
5. NIT y RUT                         mismo día   gratis
6. Facturación electrónica           1 día + DIAN gratis
7. Cuenta bancaria                   3–15 días   variable
                                     ─────────────────────────
                          TOTAL      2–4 semanas $100.000–$700.000
```

**Se puede empezar el lunes y tener empresa el jueves.** Lo que tarda es el banco.

---

# PARTE 3 · LO QUE SIGUE DESPUÉS DE TENER LA EMPRESA

## PASO 3.1 · Contratar el alojamiento comercial — **lo más urgente de todo**

**El problema, en una frase:** la aplicación está hoy en el **plan gratuito** de Vercel, y **ese plan
prohíbe el uso comercial**. Un sitio que cobra está incumpliendo desde el día que enciende el cobro, y
el proveedor puede suspender el proyecto.

**La solución:** contratar el plan Pro, **US$ 20 al mes** (unos $90.000).

**Es el problema más barato de toda la lista y el de peores consecuencias si se ignora:** no falla una
función, **se cae el sitio entero**, y justo el día que el negocio empieza a funcionar.

**Aproveche y haga esto mientras está ahí:** entre a la configuración del proyecto y anote **cuánto
tiempo máximo puede durar una función**. Hay una contradicción en la configuración actual —el archivo
declara 300 segundos y el código asume 60— y de eso depende cuánto tarda la actualización de datos.

**⏱️ 30 minutos · 💰 US$ 20/mes**

---

## PASO 3.2 · Respaldar la información — **lo más importante que nadie hace**

**Qué hay que respaldar.** El histórico de procesos ya adjudicados: **dos años de datos** que ninguna
limpieza del sistema borra. De ahí sale todo lo que hace valiosa la aplicación — cuánta gente compite
en cada entidad y cuánto descuentan los que ganan.

**Por qué es urgente.** **No existe ningún respaldo hoy.** Y este es el único riesgo de toda la lista
que **no avisa**: no hay síntomas previos. El día que se pierda, ya está perdido.

**Cómo:**
1. Exportar todo ese histórico a un archivo.
2. Guardarlo **fuera** del servicio donde vive (en su computador y en una nube personal).
3. **Y esto es lo que casi nadie hace: volver a cargarlo en una base de prueba y comprobar que sirve.**
4. Anotar la fecha.

> **Un respaldo que nunca se restauró no es un respaldo. Es un archivo del que nadie sabe si sirve.**

**Repetir una vez al mes.** Ponga el recordatorio en el teléfono hoy.

**⏱️ Medio día la primera vez, 15 minutos las siguientes · 💰 gratis**

---

## PASO 3.3 · Escribir al INVIAS

**Qué pasa.** Una de las cinco fuentes de precios de obra que usa la aplicación es del INVIAS, y **sus
documentos prohíben el uso comercial sin autorización**. Está escrito en la documentación del propio
proyecto, con el correo de contacto.

**Qué hacer:** escribir a `preciosunitarios@invias.gov.co` pidiendo autorización de uso comercial.
Explicar quién es, para qué la quiere, y que va con atribución y vigencia declaradas. **Guardar el
radicado.**

**Por qué el primer día.** Depende de un tercero y puede tardar semanas. **Y no hay que esperar la
respuesta:** el producto de pago se diseña desde ya **sin ese banco**. Quedan otros cuatro. Si llega la
autorización, se añade.

**⏱️ 30 minutos · 💰 gratis**

---

## PASO 3.4 · Elegir la pasarela de pagos

**Qué es.** El servicio que cobra la tarjeta del cliente cada mes y le pasa la plata a su cuenta.

**Lo que hay que verificar ANTES de elegir** —y es donde más gente se equivoca—: que **de verdad cobre
sola cada mes, sin que el cliente tenga que hacer nada**. Muchas pasarelas "tienen suscripciones" en el
sentido de guardar la tarjeta, y aun así le mandan al cliente un aviso para que pague. **Eso no es una
suscripción: es un recordatorio de pago**, y con eso pierde la mitad de los clientes cada mes.

**Lo verificado hasta ahora:** **Wompi** (de Bancolombia) ofrece cobros recurrentes guardando de forma
segura tarjetas y Nequi, con comisión de **alrededor del 2,5 %** y **1,49 % por PSE**, que es la mejor
tarifa de PSE del mercado según la comparativa consultada. *Esas cifras salen de referencias públicas,
no de la página oficial de tarifas: confírmelas antes de firmar.*

**Qué preguntar, por escrito, antes de vincularse:**
1. ¿El cobro mensual es automático, sin acción del cliente?
2. ¿Qué pasa cuando se vence la tarjeta del cliente?
3. ¿Comisión exacta por tarjeta, por PSE y por Nequi?
4. ¿En cuántos días desembolsa?
5. ¿Qué papeles piden para vincular una SAS nueva?

**⏱️ 1 día de averiguación + vinculación · 💰 comisión por transacción**

---

# PARTE 4 · TRES COSAS QUE CONVIENE HACER PRONTO

## 4.1 · El dominio

Hoy la aplicación vive en una dirección del proveedor. **Un producto que cobra necesita su propia
dirección** — es lo primero que mira quien va a pagar.

Cuesta entre $40.000 y $150.000 al año. Cómprelo **a nombre de la empresa**, no suyo. Y **antes de
comprarlo, mire lo de la marca** (4.3): no tiene sentido comprar un dominio con un nombre que después
no puede usar.

## 4.2 · El correo del negocio

Un correo con su dominio, no uno gratuito. En un oficio donde la seriedad se juzga por los detalles,
**esto lo notan**.

## 4.3 · La marca — mírela antes de imprimir nada

**Registrar la marca es opcional. Averiguar si está libre, no.**

**Costo verificado (Resolución 77243 de 2025, vigente desde el 1-ene-2026):**

| Trámite | Valor |
|---|---|
| Solicitud de registro de marca en línea, por categoría | **$1.347.500** |
| Categoría adicional en la misma solicitud | **$674.000** |
| En físico | $1.638.500 |

Hay tarifas reducidas acreditando que es micro, pequeña o mediana empresa.

**Lo importante:** **haga primero la búsqueda de antecedentes.** Si el nombre está ocupado y usted
solicita igual, **la tasa no se devuelve**. Y peor: si ya imprimió, ya compró dominio y ya tiene
clientes, cambiar de nombre cuesta mucho más que la tasa.

---

# PARTE 5 · SUS PRIMERAS CUATRO SEMANAS

## Semana 1 — trámites y desbloqueo

| Día | Qué hace | Tiempo |
|---|---|---|
| **Lunes** | Lee su contrato con ENTerritorio y copia las cláusulas (Parte 1, Riesgo 2). Escribe el aviso al supervisor (1.4) | 1 h |
| **Lunes** | **Contrata el plan comercial de alojamiento.** US$ 20 que compran legalidad | 30 min |
| **Lunes** | Escribe al INVIAS | 30 min |
| **Martes** | Cita con el abogado, con las cinco preguntas ya escritas | 1 h |
| **Martes** | Busca el nombre en RUES y la marca en la SIC | 1 h |
| **Miércoles** | Define los cinco datos y redacta el documento con el formato de la cámara | 2 h |
| **Jueves** | Cámara de Comercio: matrícula, NIT y RUT | media jornada |
| **Viernes** | **Respalda el histórico y lo restaura.** No lo deje para después | media jornada |

**Al terminar la semana 1 usted tiene: empresa, NIT, alojamiento legal, respaldo probado y respuesta
del abogado.**

## Semana 2 — lo que arranca en paralelo

- Habilitación de facturación electrónica ante la DIAN.
- Apertura de cuenta bancaria.
- Averiguación de la pasarela, con las cinco preguntas por escrito.
- **Y empieza la programación**, por la tarea que tiene fecha límite (Parte 6).

## Semanas 3 y 4 — programación

Aquí empieza el trabajo largo: separar los datos de los clientes. Está en
`docs/PLAN_DE_ACCION.md`, fase 2, tarea por tarea.

---

# PARTE 6 · LA ÚNICA COSA QUE NO PUEDE ESPERAR

Todo lo de este documento cuesta lo mismo hoy que dentro de tres meses. **Menos una.**

**Hay que empezar a guardar, desde ya, la probabilidad que la aplicación le muestra al usuario en el
momento en que decide si se presenta a un proceso.**

**Por qué, sin tecnicismos.** La aplicación estima qué opción tiene de ganar cada licitación. **Hoy
nadie puede saber si esa estimación es buena**, porque para comprobarlo haría falta saber a qué se
presentó la gente y cómo le fue — y eso no lo dice ningún dato público.

Pero la aplicación **ya le pregunta al usuario** en qué va cada proceso: *me interesa · preparando ·
me presenté · ganado · perdido*. **Ese es exactamente el dato que falta.**

Solo hay un problema: para comparar hace falta **saber qué le dijo la aplicación en aquel momento**. Si
no se guarda entonces, después ya no se puede reconstruir.

**Consecuencia:** cada día que pase sin guardarlo es **un día de datos que no vuelve**. Y esto no es un
detalle técnico: **es lo único de todo el producto que un competidor no puede copiar.** Los datos
públicos los descarga cualquiera; el registro de qué decidieron cientos de contratistas y cómo les fue,
no lo tiene nadie más — y mejora solo con el uso.

**Es la tarea F0-7 del plan.** Un día de trabajo. Hágala en la semana 2.

---

# PARTE 7 · GLOSARIO

**Cámara de Comercio** — Entidad donde se registran las empresas. Hay una por región.

**CIIU** — Un número que clasifica a qué se dedica una empresa. Para software suele ser 6201.

**Datos abiertos** — Información que el Estado publica gratis para que cualquiera la use, incluso para
vender. Es de donde salen todos los datos de Detekta.

**DIAN** — La entidad de impuestos de Colombia. Ante ella se saca el RUT, se habilita la facturación y
se declaran los impuestos.

**Dominio** — La dirección de un sitio en internet.

**EICE (Empresa Industrial y Comercial del Estado)** — Empresa 100 % del Estado que funciona con reglas
parecidas a las de una empresa privada. **ENTerritorio es una de estas.**

**Facturación electrónica** — Emitir facturas por el sistema de la DIAN. Obligatoria para toda sociedad.

**Inhabilidad** — Prohibición legal para contratar con el Estado. **Solo existen las que están escritas
en la ley, una por una**, y no se pueden extender por parecido.

**Marca** — El nombre comercial. Se registra en la SIC, aparte del nombre legal.

**Matrícula mercantil** — El registro de la empresa en la Cámara de Comercio. Se renueva cada año.

**NIT** — La cédula de la empresa.

**OPS (Orden de Prestación de Servicios)** — Contrato por el que alguien le presta servicios al Estado
**sin ser empleado público**, sin prestaciones y sin relación laboral.

**Nequi** — Billetera digital de Bancolombia. Muchos clientes prefieren pagar por ahí.

**Pasarela de pagos** — Servicio que cobra tarjetas por internet. **Wompi** (de Bancolombia), Mercado
Pago, ePayco y PayU son las más usadas en Colombia.

**PSE** — Forma de pagar por internet debitando directamente de la cuenta bancaria, sin tarjeta. Cobra
menos comisión que una tarjeta, pero **no sirve para cobros automáticos mensuales**: el cliente tiene
que autorizar cada pago.

**Razón social** — El nombre legal de la empresa. Termina en "SAS".

**RUES** — Listado nacional de empresas registradas.

**RUT** — El registro de la empresa ante la DIAN.

**SAS (Sociedad por Acciones Simplificada)** — El tipo de empresa más simple de Colombia. Puede tener
un solo dueño y se crea sin notaría.

**SIC (Superintendencia de Industria y Comercio)** — Entre otras cosas, registra las marcas y vigila la
protección de datos personales.

**Servidor público** — Empleado del Estado. **Un contratista por OPS no lo es**, y esa diferencia es la
que le permite a usted crear empresa.

**Suscripción** — Cobro que se repite cada mes automáticamente, **sin que el cliente tenga que hacer
nada**. Si el cliente tiene que autorizar cada mes, no es una suscripción: es un recordatorio de pago.

**Vercel** — La empresa donde está alojada la aplicación en internet. Su plan gratuito **no permite
cobrar**; por eso hay que pasar al de pago.

---

# PARTE 8 · CUÁNDO PARAR Y PREGUNTAR

**🧑‍⚖️ ABOGADO** — Las cinco preguntas de la Parte 1.5 · Los términos y condiciones · La política de
datos personales · El descargo de responsabilidad · **Y antes de vender el módulo que consulta
antecedentes de terceros**, que es el punto de más riesgo de todo el producto.

**🧮 CONTADOR** — Las responsabilidades del RUT · Si el precio se muestra con IVA o sin él · Las
retenciones que le van a practicar sus clientes · La declaración de renta de la sociedad.

**Nadie** — Todo lo demás de este documento. Los trámites de la Parte 2 los hace usted, en línea o en
ventanilla, sin intermediarios y sin pagarle a nadie por gestionarlos.

---

# LOS OTROS DOCUMENTOS

| Si quiere saber… | Lea |
|---|---|
| **Qué hacer primero** (esto) | `docs/EMPEZAR_AQUI.md` |
| Todas las tareas, con detalle técnico | `docs/PLAN_DE_ACCION.md` |
| Por qué hay que hacerlo así | `docs/PLAN_SAAS.md` |
| Qué exige la ley | `docs/LEGAL_COLOMBIA.md` |
| Cuánto cobrar | `docs/PRECIO_Y_UNIT_ECONOMICS.md` |
| Qué puede salir mal | `docs/RIESGOS.md` |
| Qué revisar antes de abrir | `docs/CHECKLIST_PRODUCCION.md` |

---

## FUENTES

- [Decreto 495 de 2019 · Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=91114) · [ENTerritorio](https://www.enterritorio.gov.co/web/node/936)
- [Ley 80 de 1993, art. 8](https://sintesis.colombiacompra.gov.co/norma/LEY%2080%20DE%201993/46) · [Ley 80 · Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=304)
- [Concepto 054111 de 2020 · Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=118260) · [Concepto 255281 de 2022](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=196508)
- [Concepto C-327 de 2024 · Colombia Compra Eficiente](https://relatoria.colombiacompra.gov.co/conceptos/c-327/) · [Guía de contratación de prestación de servicios · CCE](https://operaciones.colombiacompra.gov.co/sites/cce_public/files/files_2020/cce-eicp-gi-21_guia_contratacion_prestacion_de_servicios_v1_03-03-2023_1.pdf)
- [Ley 2013 de 2019 · Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=104572)
- [Tarifas de las cámaras de comercio 2026 · Ámbito Jurídico](https://www.ambitojuridico.com/noticias/tributario/mercantil-propiedad-intelectual-y-arbitraje/estas-son-las-tarifas-de-las)
- [Obligados a facturar electrónicamente 2026](https://dian.com.co/obligados-facturacion-electronica-colombia-2026/)
- [Tasas de propiedad industrial SIC 2026](https://www.ramosabogados.co/uncategorized/tasas-actualizadas-sic-2026-cuanto-cuestan-los-tramites-de-propiedad-industrial-en-colombia/)
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) · [Wompi · planes y tarifas](https://wompi.com/es/co/planes-tarifas/)

**Verificado el 24-ago-2026.** Los portales oficiales colombianos no se pudieron abrir directamente
desde el entorno donde se preparó esta guía; la verificación se hizo por buscador y las fuentes son las
de arriba. **Confirme cualquier cifra antes de pagarla, y cualquier norma antes de decidir con ella.**
