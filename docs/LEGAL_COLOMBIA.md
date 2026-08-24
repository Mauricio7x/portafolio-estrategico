# Anexo A · Frente jurídico y regulatorio (Colombia)
### Consultoría SaaS Detekta · 24-ago-2026 · silla jurídica + honestidad

> **ADVERTENCIA DE MÉTODO, y es la más importante de este documento.**
> Nada de lo que sigue es asesoría jurídica. Este entorno **no pudo abrir los portales oficiales**
> (`sic.gov.co`, `funcionpublica.gov.co` y `datos.gov.co` responden 403 en el proxy, medido el
> 24-ago-2026 a las 12:17Z), así que la verificación se hizo con un **buscador web**, que devuelve
> extractos y no el texto de la norma. Cada fila declara su estado: **VERIFICADO** (fuente
> secundaria concordante y específica), **HIPÓTESIS** (hay que abrir la norma) o **PARA ABOGADO**.
> Una norma mal citada es peor que una ausente: se lee como verificada. Esa regla vale igual aquí
> que en la pantalla que fija un precio de oferta.

---

## 1. TABLA MAESTRA

| ID | Tema | Qué exige | Estado | ¿Bloquea la venta? | Acción |
|---|---|---|---|---|---|
| **L-1** | Alojamiento con uso comercial | El plan gratuito de Vercel restringe el uso a personal y no comercial; un sitio que cobra incumple desde que enciende el cobro y puede ser suspendido | **VERIFICADO** | **SÍ** | Contratar Pro (US$ 20/asiento/mes). Fase 0 |
| **L-2** | Registro de bases de datos (RNBD) ante la SIC | Obliga a **sociedades y entidades sin ánimo de lucro con activos > 100.000 UVT** y a personas jurídicas públicas. Micro y pequeñas empresas y personas naturales **no están obligadas** | **VERIFICADO** | **NO** | Ninguna hoy. Revisar si los activos superan el umbral |
| **L-3** | Datos personales de terceros en el corpus | El Decreto 1377 de 2013 art. 10 exime de autorización los datos **de naturaleza pública**. NIT, razón social y adjudicaciones de SECOP encajan | **VERIFICADO** en lo general · **PARA ABOGADO** en la ficha del socio | **NO**, salvo L-3b | Documentarlo en la política de tratamiento |
| **L-3b** | Sanciones, inhabilidades y multas de terceros (SIRI, multas SECOP I) | Publicar a un cliente el historial sancionatorio de otra persona, **cobrando por ello**, es el punto de mayor exposición del producto | **PARA ABOGADO** | **Probablemente sí para ese módulo** | Ver §3 |
| **L-4** | Datos del propio cliente | Su RUP, sus contratos, sus presupuestos, y desde la Fase 5 **su historial de a qué se presentó y si ganó** | **HIPÓTESIS** | **NO**, pero define el diseño | Política de tratamiento + finalidad de uso agregado **antes** de recoger |
| **L-5** | Infraestructura fuera de Colombia | Vercel y Upstash procesan fuera del país: hay régimen de transferencia y transmisión internacional | **HIPÓTESIS** | **NO** si se declara y se contrata bien | Declararlo en la política; contrato de encargo con los proveedores |
| **L-6** | Licencia de los datos de SECOP | `datos.gov.co` publica bajo **Creative Commons Atribución-CompartirIgual 4.0**; el portal declara uso, explotación y transformación libres para crear aplicaciones de terceros. **Uso comercial permitido con atribución** | **VERIFICADO** · el alcance de «CompartirIgual» → **PARA ABOGADO** | **NO** | Atribución visible en pantalla. Ver §2 |
| **L-7** | Licencia INVIAS | Los documentos del INVIAS **prohíben el uso comercial sin autorización**; lo declara el propio repositorio con el correo de contacto | **VERIFICADO en el repositorio** | **SÍ, para ese banco** | Solicitar autorización el primer día; entre tanto, retirar el banco del producto de pago |
| **L-8** | Precios de tienda capturados de comercios | Capturados con una herramienta manual, con fuente, ciudad y fecha. Vender un derivado cambia el análisis: hay términos de uso de terceros | **PARA ABOGADO** | **Posible** | Evaluar; alternativa: mostrar solo el enlace y la fecha, sin redistribuir la cifra |
| **L-9** | Bancos oficiales IDU · FFIE · ICCU · EPC | Publicados por entidades públicas; falta comprobar si alguno replica la restricción del INVIAS | **NO VERIFICADO** | **Desconocido** | Auditar los cuatro antes de la Fase 4 |
| **L-10** | Derecho de retracto | Ley 1480 de 2011 art. 47: en ventas a distancia se entiende pactado el retracto, **cinco días hábiles** (no calendario), con devolución del dinero | **VERIFICADO** | **NO**, si se implementa | Cláusula + procedimiento operativo |
| **L-11** | Reversión del pago | Contemplada en el art. 51 de la misma ley | **HIPÓTESIS** | **NO** | Procedimiento con la pasarela |
| **L-12** | Facturación electrónica | **Toda sociedad comercial está obligada desde su primera venta**, sin importar tamaño ni ingresos. Persona natural: depende de topes y del RUT | **VERIFICADO** | **SÍ**, desde el primer cobro | Habilitarse ante la DIAN en la Fase 0–1 |
| **L-13** | IVA | Tarifa general del 19 % sobre el servicio | **VERIFICADO** en lo general · tarifa aplicable al caso → **PARA CONTADOR** | **NO** | Decidir si el precio se muestra con IVA incluido |
| **L-14** | Responsabilidad por la cifra | La aplicación produce un precio de oferta y una probabilidad | **PARA ABOGADO** | **NO**, pero es el riesgo más caro | Ver §3 |
| **L-15** | Marca «Detekta» | Solicitud en línea ante la SIC: **$1.347.500** por clase; clase adicional **$674.000** (Resolución 77243 de 2025, vigente desde el 1-ene-2026). Hay tarifas reducidas acreditando MIPYME | **VERIFICADO** | **NO** | Búsqueda de antecedentes **antes** de imprimir el nombre |
| **L-16** | Registro del software ante la DNDA | No obligatorio; da fecha cierta de autoría | **HIPÓTESIS** | **NO** | Opcional, barato, recomendable |
| **L-17** | **El dueño es contratista por prestación de servicios de ENTerritorio** | Ver §7. La premisa de partida era falsa: ENTerritorio **no es sociedad de economía mixta**, es **Empresa Industrial y Comercial del Estado** vinculada al DNP (Decreto 495 de 2019) | **VERIFICADO** en la naturaleza y en el régimen general · **PARA ABOGADO** en el caso concreto | **NO** para vender software a privados | §7 |
| **L-18** | Constitución de la sociedad | Documento privado, sin notaría; matrícula $75.000–$120.000 más formulario de $4.300; NIT gratis; 1–3 días hábiles | **VERIFICADO** | **SÍ** (es el vehículo que factura) | Paso a paso en `docs/EMPEZAR_AQUI.md` Parte 2 |

---

## 2. LA ATRIBUCIÓN NO ES UN PIE DE PÁGINA

`datos.gov.co` permite el uso comercial **a cambio de reconocer la autoría del conjunto de datos**.
Detekta hoy **no atribuye en pantalla**. Es la obligación más fácil de cumplir y la más fácil de
olvidar, y es exactamente el tipo de incumplimiento que se descubre cuando ya hay clientes.

**Se resuelve así:** cada cifra derivada de una fuente pública ya viaja con su procedencia en la
respuesta (el módulo de fuentes del editor de precios lo hace con los cinco bancos). Falta la línea
visible: **de dónde salen los datos, bajo qué licencia y con qué fecha de corte**, en la portada y en
el pie de la lista. No es cosmética: es la condición de la licencia.

**Lo que hay que preguntarle al abogado —y no adivinar—** es el alcance del «CompartirIgual» de la
CC BY-SA 4.0 sobre un producto que **deriva estadísticas** de esos datos. Las dos lecturas posibles
tienen consecuencias muy distintas: si la cláusula alcanza a los índices publicados, obligaría a
compartirlos bajo la misma licencia; si solo alcanza a la redistribución de la base, no. **Esta
consultoría no resuelve esa pregunta y no debe fingir que sí.**

---

## 3. LOS DOS RIESGOS QUE NO SE ARREGLAN CON UN DOCUMENTO

### 3.1 · La ficha del socio y del competidor (L-3b)

El módulo consulta sanciones disciplinarias y multas y las muestra a un cliente **sobre un tercero
que no es cliente**. El repositorio ya hizo lo correcto por diseño: el semáforo **nunca dice
«limpio»**, distingue lo vigente de lo histórico, declara sobre qué fuentes opina y manda pedir los
certificados oficiales. Eso es una defensa real y hay que conservarla intacta.

Lo que **cambia al cobrar** es que deja de ser una consulta que alguien hace sobre datos públicos y
pasa a ser **un servicio de reporte sobre personas, prestado por precio**. Preguntas para el abogado,
en este orden:

1. ¿Prestar ese servicio a cambio de dinero cambia la calificación de la actividad?
2. ¿Hay un plazo de caducidad del dato desfavorable que obligue a dejar de mostrarlo?
3. ¿Basta con el descargo actual o hace falta consentimiento del consultado —que sería inviable— o
   un canal para que el afectado pida corrección?

**Recomendación mientras no haya respuesta:** el módulo **no entra en el producto de pago**. Se
mantiene para el dueño, que es su uso original. Retirar un módulo de un plan es barato; retirarlo
después de haberlo vendido, no.

### 3.2 · La cifra con la que el cliente fija su oferta (L-14)

Un cliente que oferta con un precio de Detekta y pierde plata va a mirar de dónde salió la cifra. Tres
capas, y las tres hacen falta:

1. **Descargo visible donde se muestra el número**, no enterrado en un enlace. La doctrina del
   repositorio ya lo dice para las equivalencias («ayuda a la decisión, no habilitación jurídica»):
   se extiende al precio y a la probabilidad.
2. **Límite de responsabilidad en los términos**, proporcionado al precio del plan.
3. **La honestidad que ya está en el código como argumento jurídico.** El producto declara cuándo un
   margen es cota superior, cuándo una baja no tiene base, cuándo un precio es referencia y no
   cotización. **Esa disciplina es la mejor defensa que existe** y hay que decirlo así al abogado:
   no se está vendiendo una predicción, se está vendiendo información con su procedencia.

**Corolario de producto:** cualquier cambio futuro que borre una declaración de incertidumbre para
que la pantalla «se vea mejor» **aumenta la exposición jurídica**. No es solo doctrina interna.

---

## 4. LOS SEIS DOCUMENTOS QUE HAY QUE PRODUCIR

| Documento | Qué debe decir, como mínimo | Quién lo firma |
|---|---|---|
| **Términos y condiciones del servicio** | Qué es y qué no es Detekta · planes y límites · renovación automática y cómo se cancela · retracto de cinco días hábiles · reembolso · límite de responsabilidad · ley aplicable | Abogado |
| **Política de tratamiento de datos** | Responsable · finalidades (incluida **la de usar el historial de resultados de forma agregada**) · datos de terceros y su fuente pública · transferencia internacional · derechos y canal · plazo de conservación | Abogado |
| **Aviso de privacidad** | Versión corta, en el alta | Abogado |
| **Descargo de responsabilidad** | En pantalla, donde se muestra el precio y la probabilidad | Dueño + abogado |
| **Atribución de fuentes** | Fuente, licencia y fecha de corte, visible | Dueño |
| **Contrato de encargo con proveedores** | Vercel, Upstash, pasarela | Abogado |

---

## 5. SECUENCIA (qué antes que qué)

0. **Leer el propio contrato con ENTerritorio y avisar por escrito** (§7.5). Va antes que constituir.
1. **Decidir el vehículo que factura.** Bloquea todo lo demás; es la pregunta 1 de `docs/PLAN_SAAS.md` §9.
2. **Contratar Pro** (L-1) y **pedir la autorización al INVIAS** (L-7). Los dos el primer día: uno
   cuesta veinte dólares y el otro depende de un tercero.
3. **Habilitarse en facturación electrónica** (L-12). No se cobra sin esto.
4. **Encargar los seis documentos** con la lista de §4 y las tres preguntas de §3.1.
5. **Auditar L-8 y L-9** antes de encender el plan que incluye precios.
6. **Buscar antecedentes de la marca** antes de gastar en el registro.

---

## 7. LA SITUACIÓN PARTICULAR DEL DUEÑO: CONTRATISTA POR OPS DE ENTERRITORIO

> Se analiza aparte porque **no es un tema del producto: es un tema de la persona**, y porque la
> premisa con la que llegó la pregunta era incorrecta.

### 7.1 · Corrección de la premisa

La consulta decía «una entidad de economía mixta como lo es ENTerritorio S.A.». **No lo es.**
ENTerritorio es una **Empresa Industrial y Comercial del Estado**, de carácter financiero, con
personería jurídica y patrimonio propio, **vinculada al Departamento Nacional de Planeación** y
vigilada por la Superintendencia Financiera; nació de la transformación de FONADE por el **Decreto 495
del 20 de marzo de 2019**. Una sociedad de economía mixta tiene capital privado junto al público;
ENTerritorio es **íntegramente estatal**.

**Importa porque decide qué régimen se analiza.** Llevarle al abogado una calificación equivocada le
hace revisar normas que no son las del caso.

### 7.2 · Lo que está establecido, y no admite mucha discusión

| Afirmación | Estado |
|---|---|
| Un contratista de prestación de servicios **no es servidor público** ni titular de empleo público, y queda fuera del art. 128 de la Constitución | **VERIFICADO** |
| Las inhabilidades e incompatibilidades son **taxativas y de interpretación restrictiva**: no admiten analogía ni extensión | **VERIFICADO** |
| **No existe norma** que impida a un contratista tener varios contratos de prestación de servicios, con la misma entidad o con varias, siendo idóneo | **VERIFICADO** |
| La **exclusividad no se presume**: debe pactarse expresamente | **VERIFICADO** |
| La entidad **tiene el deber** de identificar conflictos de interés por «concurrencia de intereses antagónicos» en el contratista | **VERIFICADO** |
| La **Ley 2013 de 2019** obliga a ciertos servidores **y contratistas** a declarar bienes, rentas y conflictos de interés, con actualización anual y comunicación de todo cambio en dos meses | **VERIFICADO** · el alcance para este contrato concreto, **PARA LA ENTIDAD** |

### 7.3 · Por qué el régimen de inhabilidades casi no toca a este negocio

Las inhabilidades regulan **quién puede contratar CON el Estado**. La sociedad que se va a constituir
**no contrata con el Estado**: vende suscripciones de software a **empresas privadas**. No hay contrato
estatal, luego no hay inhabilidad que analizar por esa vía.

### 7.4 · Los cuatro riesgos que sí existen

| # | Riesgo | Gravedad | Mitigación |
|---|---|---|---|
| **1** | **Información no pública de ENTerritorio.** La entidad **estructura y ejecuta proyectos de infraestructura**, es decir, **abre procesos de obra**; y el producto dice a qué procesos presentarse. Conocer procesos antes de su publicación —o que alguien pueda pensarlo razonablemente— toca el terreno de los acuerdos restrictivos de la competencia | **Alta** | **La defensa ya está construida:** el producto se alimenta **solo de fuentes públicas** y todo el repositorio documenta qué dato sale de dónde, con fecha y licencia. La tarea F1-2 lo pone **en pantalla**, que es lo que faltaba |
| **2** | **Las cláusulas del propio contrato** (exclusividad, conflicto de intereses, reserva de información, código de integridad) | Media | **La respuesta está en su contrato.** Extraer las cláusulas y llevarlas al abogado |
| **3** | **Presentarse a procesos de ENTerritorio** con su empresa de obra mientras dura el contrato | Media | **No es inhabilidad automática**, pero es el caso típico de intereses antagónicos. Recomendación: **abstenerse mientras dure el contrato**. A otras entidades, sin problema |
| **4** | **Omitir la declaración de la Ley 2013 de 2019** si es sujeto obligado | Baja-media | Preguntar por escrito a la entidad si lo es; si lo es, registrar la sociedad. **Declarar no cuesta nada; omitir sí** |

### 7.5 · La recomendación operativa

**Avisar por escrito al supervisor del contrato antes de constituir la sociedad**, dejando constancia
de que (i) la sociedad no contratará con ENTerritorio, (ii) el producto usa solo información pública,
(iii) no se usará información conocida en razón del contrato y (iv) no interfiere con el objeto
pactado. **Modelo de texto en `docs/EMPEZAR_AQUI.md` §1.4.**

Un aviso previo con radicado convierte una sospecha futura en un papel que se mostró **antes** de que
hubiera nada que ocultar. Es la regla que el propio manual del oficio ya fija: **«¿me incomodaría que
esto se publicara?»** — y canal formal siempre.

### 7.6 · Las cinco preguntas para el abogado

Están redactadas, listas para copiar, en `docs/EMPEZAR_AQUI.md` §1.5. Lo que se le pide es **un
concepto escrito de dos páginas**, no una asesoría por meses.

---

## 8. TRES COLUMNAS

**VERIFICADO (buscador, 24-ago-2026)** — L-1 · L-2 · L-6 en lo esencial · L-10 · L-12 · L-13 en lo
general · L-15 con cifras y resolución · L-3 en la exención de datos públicos · **L-17: naturaleza de
ENTerritorio, condición no-servidor-público del contratista, taxatividad de las inhabilidades, no
presunción de exclusividad, deber de la entidad de mirar conflictos de interés** · L-18 con tarifas.

**HIPÓTESIS A CONFIRMAR** — L-4 · L-5 · L-11 · L-16 · el alcance del «CompartirIgual» · la tarifa de
IVA aplicable al caso concreto.

**NO VERIFICABLE DESDE AQUÍ** — todo L-3b y L-14, que son criterio jurídico y no consulta de norma ·
L-9, que exige abrir cuatro licencias · la disponibilidad de la marca · el texto literal de cada
artículo, porque los portales oficiales están bloqueados en este entorno.

---

## Fuentes

- [SIC · RNBD](https://www.sic.gov.co/registro-nacional-de-bases-de-datos) · [Decreto 090 de 2018 · SIC](https://www.sic.gov.co/gobierno-nacional-reduce-universo-de-obligados-a-cumplir-el-registro-de-bases-de-datos-ante-superintendencia-de-industria-y-comercio) · [Análisis Holland & Knight](https://www.hklaw.com/en/insights/publications/2018/08/nuevos-requisitos-para-el-registro-nacional-de-bas)
- [Decreto 1377 de 2013](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646) · [Ley 1480 de 2011](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306) · [Ámbito Jurídico · los cinco días son hábiles](https://www.ambitojuridico.com/noticias/mercantil/mercantil-propiedad-intelectual-y-arbitraje/los-cinco-dias-para-ejercer-el)
- [Términos de uso · datos.gov.co](https://herramientas.datos.gov.co/terminos) · [Licencia de datos abiertos](https://www.cdav.gov.co/publicaciones/130563/licencia-de-datos-abiertos/)
- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby)
- [DIAN · obligados a facturar electrónicamente 2026](https://dian.com.co/obligados-facturacion-electronica-colombia-2026/)
- [SIC · tasas de propiedad industrial 2026](https://www.ramosabogados.co/uncategorized/tasas-actualizadas-sic-2026-cuanto-cuestan-los-tramites-de-propiedad-industrial-en-colombia/)
