# PLAN SaaS · De herramienta interna a producto por suscripción
### Consultoría ejecutada con `docs/PROMPT_CONSULTORIA_SAAS.md` · 24-ago-2026
### Sillas aplicadas: premisa · jurídica · económico-financiera · arquitectura · ciencia de datos · seguridad · producto · adversaria · honestidad

---

## RESUMEN PARA EL DUEÑO (una página, sin jerga)

**Detekta no se puede vender hoy, y la razón no es que falte un botón de pagar.**

Son cinco cosas, y cuatro se arreglan con trabajo conocido:

1. **Si dos empresas pagan, la segunda ve el negocio de la primera.** Los contratos ejecutados, las
   alianzas y la estructura de costos se guardan hoy en **una sola casilla para todo el sistema**.
   Está medido, casilla por casilla, en `docs/ARQUITECTURA_MULTITENANT.md`. Esto es lo más grande.
2. **No hay cuentas.** La llave de la aplicación está escrita a la vista dentro de la propia página:
   quien mire el código fuente la lee. Sirve para un dueño; no sirve para clientes.
3. **El alojamiento actual prohíbe el uso comercial.** El plan gratuito de Vercel no admite sitios
   que cobren. Se resuelve pagando el plan Pro: **US$ 20 al mes**. Es el problema más barato de la lista.
4. **Hay una fuente de precios cuya licencia prohíbe el uso comercial sin autorización** (INVIAS), y
   lo declara el propio repositorio. Hay que pedirla por escrito. Los datos de SECOP, en cambio,
   **sí permiten uso comercial** con atribución — eso está verificado y es una buena noticia.
5. **No hay respaldo del histórico.** Es el activo más valioso del producto —dos años de procesos
   adjudicados que ninguna purga toca— y no consta ningún procedimiento para recuperarlo si se pierde.

**Lo que sí está listo y vale más de lo que parece:** el embudo comercial **ya existe y no cobra
nada**. Cualquiera sube su certificado de proponente, obtiene su diagnóstico y recibe un perfil que
dura 45 días. Eso es exactamente una prueba gratuita, construida y funcionando, a la que solo le
falta un final y un precio.

**Precio recomendado:** tres planes, **$190.000 · $420.000 · $850.000 al mes**, con dos meses gratis
al pagar el año. La franja está anclada en lo que cobra la competencia verificada —de $240.000 por
treinta días hasta $890.000 al mes el plan de entrada de Licitum— y en el valor de un solo contrato
ganado. **El precio es una recomendación, no una medición**: se confirma con los primeros diez
clientes, y en `docs/PRECIO_Y_UNIT_ECONOMICS.md` está el método completo y cómo se confirma.

**Cuándo se puede cobrar:** con dedicación de una persona, **de diez a catorce semanas**. El camino
crítico no es el cobro —eso son dos semanas— sino separar los datos de cada empresa.

**Lo que no se puede prometer todavía:** que la probabilidad de ganar es correcta. El propio
repositorio lo dice: `P(ganar)` **no es falsable** sin un registro de a qué se presentó el cliente y
qué pasó. La buena noticia es que **ese registro ya se recoge** —«Me presenté / Ganado / Perdido» en
Mis procesos— y nadie lo está usando. Vender convierte el modelo en medible por primera vez.

---

## 1. PASO 0 · AUDITORÍA DE PREMISAS

| Premisa del encargo | Veredicto | Evidencia |
|---|---|---|
| «Que la página funcione al 100 %» | **Reformulada.** «Cero errores» no es prometible; sí lo es «ningún cambio sale sin pasar el protocolo». Traducido a criterios en `docs/CHECKLIST_PRODUCCION.md` | Doctrina del repositorio: la suite es la única fuente de verdad automática |
| «Que se pueda vender por suscripción» | **Falso hoy.** Cinco bloqueadores, cuatro técnicos y uno jurídico | §2 de este documento |
| «Todo lo que no tenemos hay que crearlo» | **Cierto, con un matiz caro:** parte de lo que parece faltar **ya existe sin usar** (embudo gratuito, registro de resultados, protocolos de calibración escritos) | `lib/perfil_dinamico.js:95`, `lib/seguimiento.js:44`, `docs/PROBABILIDAD_MEJORADA.md:712` |
| «No pueden existir errores» | **Inalcanzable como promesa, alcanzable como método** | §12 del prompt de consultoría |
| «Vercel Hobby limita a 12 funciones y eso ata» | **Falso.** `api/` está en **6 de 12** | `ls api/` → 6 archivos; `tests/e2e.js` fija el conteo |
| «El token protege la API» | **Falso.** Está integrado en el frontend a la vista de cualquiera; la protección real es Password Protection de Vercel | `CLAUDE.md § «Página única y token integrado»` |
| «Este entorno no alcanza las fuentes» | **Cierto hoy, y fechado.** El proxy responde 403 en CONNECT a `datos.gov.co`, `invias.gov.co`, `sic.gov.co` y `vercel.com` — medido el **24-ago-2026 12:17Z**. El buscador web **sí** funciona y por ahí se verificó lo jurídico y lo de precio | `curl "$HTTPS_PROXY/__agentproxy/status"` |

---

## 2. LOS CINCO BLOQUEADORES DE VENTA

> **Bloqueador** = mientras siga así, cobrar es imprudente o ilegal. No es una mejora pendiente.

### B1 · El alojamiento gratuito prohíbe cobrar
**Medido:** el plan Hobby de Vercel restringe el uso a personal y no comercial; un sitio que vende
está en incumplimiento desde el día que enciende el cobro, y Vercel puede suspender el proyecto.
**Coste de arreglarlo:** US$ 20/mes por asiento (plan Pro).
**Efecto lateral que hay que mirar:** `vercel.json` declara `maxDuration: 300` para `api/procesos.js`,
pero `lib/handlers/procesos/sync.js:69` fija el presupuesto en 45 s **«cabe en el plan Hobby (60 s)»**.
Las dos cosas no pueden ser ciertas a la vez: o se está en Hobby y el 300 se ignora en silencio, o se
está en Pro y la sincronización desaprovecha cinco sextos del tiempo disponible. **Resolverlo es una
consulta al panel, y cambia cuánto tarda la carga completa.**

### B2 · Con dos clientes, el segundo lee el negocio del primero
**Medido, clave por clave:**

| Clave | Qué guarda | Alcance hoy | Con dos clientes |
|---|---|---|---|
| `config:experiencia` (`lib/almacen.js:153`) | Los contratos que la empresa ya ejecutó | **Una sola, global** | El segundo cliente ve la obra del primero |
| `config:experiencia:terminos` | El vocabulario destilado de esos contratos | **Global** | Su especialidad, deducible |
| `config:consorcios` (`lib/consorcio.js:47`) | Con quién se alía | **Global** | Sus socios, a la vista |
| `apu:parametros` (`lib/parametros.js:27`) | Su nómina y su estructura de costo | **Global** | Se puede reconstruir su precio |

**Lo que sí está bien y no hay que tocar:** `licitaciones:*`, `indice:competencia*`, `indice:baja:*`,
`paa:acierto` son **el mercado**, no el cliente: compartirlos es correcto y es lo que hace barato el
producto. `apu:precios:{perfil}`, `apu:presupuesto:{perfil}:{id}`, `seguimiento:{perfil}` y
`cobertura:{perfil}:{modo}` **ya están aislados**. El trabajo es acotado, no una reescritura.

### B3 · No hay cuentas, y la llave está a la vista
`const TOKEN = "MiExtraccion2025"` vive en `public/app.js`, `public/onboarding.js` y
`public/pliego.js`. Es una decisión consciente y correcta **para un solo usuario**: el dueño no tiene
terminal. Deja de serlo el día que hay clientes.

### B4 · Un cliente puede pedir el perfil de otro cambiando un parámetro
**Medido:** `lib/handlers/procesos/listar.js:349` → `let perfil = String(q.perfil || "").toLowerCase();`
El perfil llega por la query y **nadie comprueba que quien pide sea su dueño**. Hoy es inofensivo
porque todos los perfiles son del mismo señor. Con cuentas, es acceso directo al perfil ajeno.

### B5 · No hay respaldo del activo principal
El keyspace histórico es, por diseño, lo único que **ninguna purga toca** — y es la base del índice de
competencia, del de baja y de toda la inteligencia del producto. No consta en el repositorio ningún
procedimiento de respaldo ni de restauración. **Un respaldo que nunca se restauró no es un respaldo.**

### B6 · Las licencias de las fuentes, y una que sí bloquea
- **SECOP / datos.gov.co: uso comercial PERMITIDO.** Los datos se publican bajo Creative Commons
  Atribución-CompartirIgual 4.0 y el portal declara que pueden usarse, explotarse y transformarse
  libremente para crear aplicaciones de terceros. **Obliga a atribuir**, y el «CompartirIgual» hay que
  hacérselo mirar por un abogado (ver `docs/LEGAL_COLOMBIA.md` L-6).
- **INVIAS: prohíbe el uso comercial sin autorización.** Lo declara el propio repositorio, con el
  correo de contacto. **Es el único bloqueador jurídico duro de la lista, y se resuelve pidiéndola.**
- **Precios de tienda capturados de comercios:** riesgo distinto al vender; ver L-7.

---

## 3. LO QUE **NO** ES UN PROBLEMA (y evita trabajo inútil)

Una consultoría floja mete estos cuatro por defecto. **Ninguno aplica:**

1. **Registrar las bases de datos ante la SIC (RNBD).** Solo obliga a sociedades y entidades sin
   ánimo de lucro con **activos por encima de 100.000 UVT** y a personas jurídicas públicas. Una SAS
   pequeña y una persona natural **no están obligadas**. Verificado con la propia SIC.
2. **Pedir autorización a cada empresa que aparece en el corpus.** El Decreto 1377 de 2013 exime de
   autorización los datos de naturaleza pública. La ficha del competidor merece cuidado por otra
   razón —ver L-3—, pero no por ahí.
3. **Migrar de plan por número de funciones.** `api/` está en 6 de 12.
4. **Reescribir la arquitectura para multi-inquilino.** Ocho claves ya están aisladas y cuatro no.
   Es una corrección quirúrgica, no una reescritura.

---

## 4. LO QUE YA EXISTE Y NO SE ESTÁ COBRANDO

| Activo construido | Dónde | Por qué importa al vender |
|---|---|---|
| **Embudo gratuito completo** | `lib/perfil_dinamico.js`, tope 300 perfiles vivos, TTL 45 días (`lib/almacen.js:231`) | Cualquiera sube su certificado y obtiene su diagnóstico **sin credencial**. Es una prueba gratuita en producción a la que solo le falta un final y un precio |
| **Registro del resultado real** | `lib/seguimiento.js:44` → `interesa · preparando · presentado · ganado · perdido · descartado` | Es **la etiqueta que hoy no existe** para validar la probabilidad. Ver §6 |
| **Protocolos de calibración escritos** | `docs/PROBABILIDAD_MEJORADA.md:712` §9.1–9.3 | Tres retro-pruebas que corren **sobre el corpus ya bajado**, sin extraer una fila |
| **Censo de ingesta y caja de diagnóstico** | `lib/censo_ingesta.js`, `lib/rastreo.js` | Soporte al cliente: «¿por qué no está este proceso?» ya tiene respuesta auditable |
| **Cinco bancos oficiales de precios** | 10,2 MB en `data/`, servidos en 2,2 MB | Es lo que ninguna plataforma de alertas tiene, y justifica el plan alto |

---

## 5. LO QUE HAY QUE CREAR (inventario, sin adjetivos)

**Jurídico:** vehículo que factura · términos de suscripción · política de tratamiento y aviso de
privacidad · descargo de responsabilidad visible · política de retracto y reembolso · autorización
del INVIAS · atribución de fuentes en pantalla · registro de marca.

**Producto:** cuentas · planes con límites · fin de la prueba gratuita · portal del cliente ·
recibos · recuperación de contraseña · exportación y borrado de datos del cliente.

**Técnico:** aislamiento por inquilino · autenticación · autorización por recurso · cuotas ·
registro de auditoría · observabilidad y alertas · respaldo con restauración probada · entorno
previo a producción · reversión.

**Datos:** validación de la probabilidad · vigilancia de deriva de columnas · panel de salud del dato.

**Operación:** canal de soporte · tiempo de respuesta comprometido · página de estado · procedimiento
de incidentes · documentación de usuario.

---

## 6. LA PIEZA ESTRATÉGICA QUE NADIE HA VISTO

`docs/PROBABILIDAD_MEJORADA.md:98` lo dice con todas sus letras: los 11 667 procesos con par completo
**no son un conjunto de validación**, porque *«el corpus dice quién ganó, no a qué procesos se
presentó el dueño. Sin denominador no hay tasa de victoria, y sin tasa de victoria `P(ganar)` no es
falsable»*. La tabla de ese documento marca la validación de `P(ganar)` en **rojo: imposible sin
registro de decisiones del dueño**.

**Vender lo vuelve posible.** Cada cliente que marca «Me presenté» y luego «Ganado» o «Perdido»
aporta exactamente el par que falta. Con cien clientes activos, en una temporada hay miles de
decisiones etiquetadas.

Consecuencias, en orden:

1. **Es la ventaja competitiva defendible del producto.** Los datos de SECOP los tiene cualquiera; el
   registro de qué hizo el contratista y cómo le fue **no lo tiene nadie más**, y mejora solo con el uso.
2. **Obliga a una decisión de privacidad hoy, no cuando haya datos.** Ese registro es información
   comercial sensible del cliente. Lo que se puede usar de forma agregada, y con qué consentimiento,
   se define en `docs/LEGAL_COLOMBIA.md` L-4 **antes** de recoger nada.
3. **Impone qué se promete mientras tanto.** Hasta que calibre, la interfaz sigue vendiendo el
   **hecho medido** («~2 empresas suelen competir, en 65 procesos») y no el modelo. La página de
   precios no puede decir «predecimos si gana».

---

## 7. LA RUTA (fases con puerta de salida)

> Ninguna fase empieza sin cerrar la anterior. La duración supone **una persona a dedicación
> completa** y va en rango porque hay trámites externos.

### Fase 0 · Decidir y desbloquear (semana 1)
Contestar las preguntas de §9 · contratar Vercel Pro y **resolver la contradicción del `maxDuration`**
· escribir a `preciosunitarios@invias.gov.co` pidiendo la autorización · hacer el primer respaldo del
histórico **y restaurarlo** en una instancia de prueba.
**Puerta:** hay vehículo que factura decidido, el alojamiento admite cobro y existe un respaldo
restaurado con fecha. **Vendible al terminar: nada.**

### Fase 1 · Mínimo jurídico (semanas 2–4, en paralelo con la 2)
Los seis documentos de `docs/LEGAL_COLOMBIA.md` §4 · atribución de fuentes en pantalla · descargo
visible donde se muestra el precio y la probabilidad.
**Puerta:** un abogado colombiano revisó y firmó los términos, la política de datos y el descargo.
**Vendible: nada todavía.**

### Fase 2 · Aislamiento por inquilino (semanas 2–6) ← **camino crítico**
Las cuatro claves de B2 pasan a llevar inquilino · revisión de todos los sellos de caché · migración
de lo que hoy hay en producción sin perder al dueño · **prueba de dos inquilinos** en la suite.
**Puerta:** la prueba de aislamiento pasa y **falla si se revierte el arreglo**. Sin esa mutación
demostrada, la fase no está cerrada. **Vendible: nada, pero ya no es imprudente.**

### Fase 3 · Cuentas y autorización (semanas 6–9)
Registro, sesión, recuperación · el perfil deja de venir de la query sin comprobación
(`listar.js:349`) · cuotas sobre la escritura pública · registro de auditoría · migración de los
perfiles vivos sin echar a nadie.
**Puerta:** un cliente no puede leer el perfil de otro ni cambiando el parámetro. **Vendible: se
podría cobrar a mano, con factura manual.**

### Fase 4 · Cobro (semanas 9–11)
Pasarela con cobro recurrente real · planes y límites · fin de la prueba · recibos · facturación
electrónica · degradación por impago.
**Puerta:** el ciclo completo probado en el entorno de pruebas de la pasarela, **incluido el fallo de
pago y la baja**. **Vendible: sí, a los primeros clientes.**

### Fase 5 · Piloto medido (semanas 11–14)
Diez contratistas, tres meses, con precio y con seguimiento explícito de qué usan y qué pagarían.
**Puerta:** los supuestos de precio de `docs/PRECIO_Y_UNIT_ECONOMICS.md` se convierten en mediciones.

### Fase 6 · Apertura
Solo tras la lista de `docs/CHECKLIST_PRODUCCION.md` **con decisión firmada de seguir o parar**.

---

## 8. EL PRIMER DÍA (cinco cosas, desde el navegador, sin esperar a nadie)

1. **Contratar Vercel Pro** y comprobar en el panel qué duración máxima admite de verdad la función
   `api/procesos.js`. Es lo único de la lista que compra legalidad por US$ 20.
2. **Escribir al INVIAS** pidiendo autorización de uso comercial de los APU Regionalizados
   (`preciosunitarios@invias.gov.co`). El trámite tarda; se empieza el primer día.
3. **Exportar el histórico y guardarlo fuera de Upstash.** Aunque sea a mano, aunque sea una vez.
4. **Decidir quién factura** —persona natural o sociedad— y anotarlo. Bloquea la Fase 1 entera.
5. **Buscar «Detekta» en el registro de marcas de la SIC** antes de imprimir nada con ese nombre.

---

## 9. LAS SEIS PREGUNTAS QUE SOLO EL DUEÑO PUEDE RESPONDER

| # | Pregunta | Por qué bloquea | Recomendación |
|---|---|---|---|
| 1 | ¿Quién factura: usted como persona natural, Génesis SAS, o una sociedad nueva? | Determina obligación de facturar electrónicamente, IVA y responsabilidad personal | **Sociedad**: separa el patrimonio personal del riesgo del producto, y una SAS ya está obligada a facturar desde la primera venta, así que no hay ventaja en esperar |
| 2 | ¿Cuánto puede gastar al mes en infraestructura antes del primer cliente? | Fija si se contrata Pro y respaldo ya o se espera | **US$ 40–60/mes** cubre Pro más el consumo de Redis del arranque |
| 3 | ¿Vende mientras llega la autorización del INVIAS, retirando ese banco, o espera? | Es el único bloqueador con plazo ajeno | **Retirar el banco INVIAS del producto de pago** hasta tener el papel; quedan cuatro bancos |
| 4 | ¿Acepta romper la regla de cero dependencias, y para qué? | Observabilidad y cobro son los dos candidatos reales | **Sí, y solo para el cobro.** La observabilidad se resuelve con lo nativo |
| 5 | ¿Tiene cinco a diez contratistas dispuestos a pagar por un piloto? | Sin ellos, el precio sigue siendo un supuesto | Si no los tiene, la Fase 5 se alarga y el precio se lanza sin medir |
| 6 | ¿Cuántas horas semanales puede dedicar a atender clientes? | **Es la restricción que de verdad limita el crecimiento**, no la infraestructura | Con menos de cinco horas, el plan alto no se vende: promete un soporte que no existe |

---

## 10. LO QUE ESTA CONSULTORÍA NO PUDO VERIFICAR

| No verificable desde aquí | Por qué | Cómo se cierra |
|---|---|---|
| Las páginas de tarifas de la competencia | El proxy bloquea `licitarus.com`, `licitaciones.info`, `ialicitaciones.com`, `vercel.com`. Las cifras vienen de **extractos del buscador**, no de la fuente | Abrirlas desde el navegador del dueño y pegar las cifras |
| Si «Detekta» está libre como marca | Requiere consulta en el sistema de la SIC | Búsqueda de antecedentes antes de solicitar |
| Cuántos comandos de Redis cuesta de verdad una petición | Depende del número de trozos del corpus en producción, que vive en Upstash | Medir con el panel de Upstash una semana |
| Qué duración máxima aplica de verdad a las funciones | `vercel.com` bloqueado | Panel de Vercel |
| Todo lo jurídico | Un buscador no sustituye a un abogado | Revisión profesional antes de la Fase 1 |

---

## 11. TRES COLUMNAS

**MEDIDO** — 6 routers · 102 módulos · las cuatro claves globales con su `archivo:línea` · el perfil
que llega por query sin comprobación · el token integrado · ausencia total de cobro, cuentas,
observabilidad y respaldo · 10,2 MB de bancos servidos en 2,2 MB · presupuesto de 45 s frente a
`maxDuration: 300` · los seis estados de Mis procesos · el proxy en 403 el 24-ago-2026 12:17Z.

**VERIFICADO CONTRA FUENTE EXTERNA (buscador, 24-ago-2026)** — Hobby prohíbe uso comercial · Pro
desde US$ 20/asiento · RNBD solo por encima de 100.000 UVT · retracto de cinco días hábiles ·
datos.gov.co bajo CC BY-SA 4.0 con uso comercial permitido · Decreto 1377 art. 10 · facturación
electrónica obligatoria para toda sociedad · Upstash a US$ 0,20 por 100 000 comandos · precios de
Licitum, LicitarUS y licitaciones.info.

**SUPUESTO** — los tres precios recomendados · la duración de cada fase · el porcentaje del valor
atribuible a la herramienta · la tasa de conversión y de abandono · que el cliente aceptará que su
registro de resultados se use de forma agregada.

**NO VERIFICABLE DESDE AQUÍ** — lo de la §10.

---

## Fuentes externas consultadas

- [Vercel Hobby Plan](https://vercel.com/docs/plans/hobby) · [Vercel Pro Plan](https://vercel.com/docs/plans/pro-plan)
- [SIC · Registro Nacional de Bases de Datos](https://www.sic.gov.co/registro-nacional-de-bases-de-datos) · [Decreto 090 de 2018](https://www.sic.gov.co/gobierno-nacional-reduce-universo-de-obligados-a-cumplir-el-registro-de-bases-de-datos-ante-superintendencia-de-industria-y-comercio)
- [Decreto 1377 de 2013 · Función Pública](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=53646) · [Ley 1480 de 2011](https://www.funcionpublica.gov.co/eva/gestornormativo/norma.php?i=44306)
- [Términos de uso · datos.gov.co](https://herramientas.datos.gov.co/terminos)
- [Upstash Redis Pricing](https://upstash.com/pricing/redis)
- [Wompi · Planes y tarifas](https://wompi.com/es/co/planes-tarifas/)
- [licitaciones.info · planes](https://licitaciones.info/colombia/planes) · [LicitarUS](https://www.licitarus.com/) · [Comparativa de plataformas 2026](https://www.fromus.tech/blog/mejores-plataformas-licitaciones-colombia-2026)
- [SIC · tasas de propiedad industrial 2026](https://www.ambitojuridico.com/noticias/comercial/mercantil-propiedad-intelectual-y-arbitraje/sic-actualiza-tasas-de-propiedad)
