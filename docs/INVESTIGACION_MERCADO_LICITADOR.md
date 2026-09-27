# Investigación de mercado · Qué necesita de verdad quien licita obra en Colombia, y la ruta de Detekta

> Para: dueño · Estado: informe fechado · Sustituido por: —

> Fecha: 26 y 27-sep-2026. Encargo del dueño: «qué le importa a un ingeniero civil o a quien quiere licitar,
> qué le genera reprocesos y tedio, por qué pagaría; calcular todo en tiempo y dinero; un plan de
> implementación y una infraestructura; cosas que no he pensado, llevadas al día a día». La decisión de
> empezar a implementar la toma el dueño: este documento no cambia nada de la aplicación.

## 0. Método y límites (leer antes de usar una cifra)

- **Fuentes**: 110 transcripciones de videos colombianos de YouTube (asesores, abogados, gremios,
  corredores de seguros, contratistas), páginas web leídas completas (Colombia Compra Eficiente, gremios,
  prensa, las páginas de precios de los competidores, una tesis de 2026 con encuesta a 64 empresas), y
  mediciones propias en los datos abiertos del SECOP (datos.gov.co). En total, 351 fuentes distintas de
  134 dominios. 51 agentes trabajaron en paralelo; cada cifra de horas y pesos pasó por tres revisores
  escépticos y cada defecto de la aplicación, por un verificador que intentó reproducirlo y refutarlo.
- **Observación con fecha**: el 26-sep-2026 la lectura de páginas web y datos.gov.co respondieron desde
  el entorno de las sesiones. En agosto y septiembre estaban bloqueadas; por eso la investigación anterior
  (docs/reforma_datos/A5-necesidades-ingeniero.md) trabajó con resúmenes del buscador. Esa observación
  cambia la premisa de la pregunta 9 del plan de reforma:
  docs/PLAN_REFORMA_DATOS.md § «7. Lo que decide el dueño antes de empezar».
- **Rótulos**: «medido» = consulta propia a datos.gov.co con su universo; «citado» = lo dice una fuente
  (un video cuenta como citado, no como medido); «estimado» = derivado con su cuenta. **Ningún ahorro de
  Detekta está medido**: no hay registro de uso. Donde este documento dice «techo», es el máximo posible,
  no lo que pasa.
- **Límite de las horas**: ninguna fuente colombiana mide horas-persona por oferta. La única cifra
  publicada (5 a 8 días hábiles por oferta de licitación) es de un vendedor de software sin método
  (PresuCosto). Se usa como tope, nunca como medida.

## 1. Lo primero: lo que hoy puede costarle una oferta a quien usa Detekta

La investigación encontró 16 defectos en pantallas que dan cifras. Un verificador adversario intentó
reproducir y refutar cada uno contra el árbol: **14 confirmados, 2 parciales, 0 refutados**. Los de más
riesgo, porque dicen «adelante» o «no vaya» sin saberlo:

| # | Qué ve el usuario | Por qué está mal | Dónde |
|---|---|---|---|
| 1 | Precios → «Revisar antes de subir»: punto verde y «Su oferta está lista para presentar» con un precio por ítem hasta 20 % **por encima** del unitario oficial | La validación del precio por ítem usa hacia arriba el umbral pensado para el precio artificialmente bajo | `lib/formulario1.js:400` |
| 2 | La misma revisión dice «lista» cuando las filas, recalculadas como las recalcula la entidad, suman más que el presupuesto oficial | Compara el total declarado (`precio_final`), no la suma de cantidad × precio unitario redondeado | `lib/formulario1.js:253` y `:261` |
| 3 | Dictamen del pliego: «No conviene presentarse» | Compara solo el contrato más grande del perfil con una experiencia que el pliego deja sumar en varios contratos: descarta procesos que sí podría ganar | `lib/dictamen.js:523` y `:544` |
| 4 | Licitaciones: el mismo proceso sale dos veces, a veces con dos fechas de cierre | SECOP II publica un identificador por fase del mismo expediente y la lista no los agrupa | `lib/proyeccion.js:84` (el identificador del expediente se guarda y no se usa para agrupar) |
| 5 | Guía del proceso: capacidad «Cumple» con cero contratos en ejecución cargados | Una lista vacía («no sé») se calcula como saldo cero | `lib/capacidad.js:106` a `:112` |
| 6 | Guía: indicadores financieros «No cumple» sin haber leído el pliego | Compara contra una referencia fija presentada como «de los pliegos tipo» | `lib/guia_proceso.js:97` |
| 7 | Deducciones: se pierde en silencio la segunda estampilla cuando van en la misma línea | Cada concepto se busca una sola vez por línea | `lib/deducciones.js:142` a `:145` |
| 8 | Precios → «Lo que deja por intento»: resta $5.000.000 de preparar la oferta en toda modalidad | Valor fijo sin fuente; en mínima cuantía (proceso mediano $39,7 millones) es el 12,6 % del contrato | `lib/apu/rentabilidad.js:84` |

Los demás confirmados, de menor riesgo: «No declaró desierto ninguno de sus N procesos» es un cero de
construcción (SECOP II no publica ese estado en ninguna fila: 0 de 146.417 filas de obra, consulta del
26-sep-2026); «Suspendidos» cuenta solo los suspendidos de hoy y subestima unas 3,6 veces; «Pagado en los
terminados: 100 %» sale sin su base; la lista de antecedentes no menciona el REDAM; la fecha de
vencimiento de un documento del expediente no entra al correo ni a «Piden atención»; el vigía de adendas
dice «Usted ya no cumple» cuando el presupuesto antes no estaba publicado. Parciales: el plan de lectura
de documentos confunde archivos de los proponentes con los de la entidad cuando se suben el día del
cierre, y el aviso de un cierre prorrogado dice «No le afecta» sin recordar la vigencia de la póliza.

Y dos hechos de operación comprobados en producción el 27-sep-2026: **el correo diario no está
configurado** (op=salud: `"configurado": false`, faltan `CORREO_API_KEY`, `CORREO_REMITENTE` y
`CORREO_DESTINO`), así que las alertas solo existen si el usuario abre la aplicación; y, según el
verificador, encenderlo tal cual mandaría al buzón del dueño los avisos de los visitantes (el recorrido
de perfiles incluye los `rup_…` y hay un solo destinatario).

## 2. Lo que le importa a quien licita (los dolores, de más a menos caro)

De 107 dolores consolidados (30 de prioridad alta), estos son los que más fuentes independientes repiten
y más plata mueven. «Detekta hoy»: resuelto, parcial o falta, verificado en el árbol.

| Dolor, en palabras del contratista | Evidencia | Cuánto le cuesta | Detekta hoy |
|---|---|---|---|
| «Me presento a muchas y casi nunca gano; cada oferta perdida la pago» | 10 videos, 4 páginas, 4 mediciones | Licitación de obra: 19 ofertas por contrato adjudicado; gana el 5,2 % de las ofertas (medido). En licitación, 808 a 1.292 horas-persona por contrato ganado (estimado) | Parcial: filtra lo viable y dice cuánta gente se presenta; no le dice su propia tasa ni lo que le cuesta ganar |
| «Me sacaron por un papel» | 3 videos, 5 páginas, 1 medición | Al menos 37 % de proponentes rechazados o no habilitados en 8 informes de evaluación de 2025 (medido, muestra pequeña); descalificación declarada: micro 55 %, pequeña 40 %, mediana 25 % (tesis) | Parcial: lista genérica, no la de ESE pliego |
| «Descubro tarde que no cumplo la experiencia o los indicadores» | 7 videos, 2 páginas | Una oferta de licitación perdida: $1,65 a $4,19 millones (estimado) | Parcial, y con el defecto 3 |
| «Tengo que leer todos los documentos para saber si sirve» | 7 videos, 2 páginas, 1 medición | Mediana 17 documentos por expediente; 32 en licitación (medido). La aplicación lee sola entre el 17 % y el 22 % | Parcial: lee después de guardar, no Word ni Excel |
| «Cuando me entero ya cerró, o no me da el tiempo» | 6 videos, 2 mediciones | Mínima cuantía: 4 días calendario de publicación a cierre; menor cuantía: 8 desde el pliego definitivo; licitación: 13 (medido) | Parcial: la lista y el cronograma lo dicen; el correo que avisa está apagado |
| «Gano y financio la obra hasta el primer pago» | 9 videos, 5 mediciones | 105 días de mediana del acta de inicio al primer pago en licitación de obra; según la entidad, de 27 a 271 días (medido). Solo el 1,5 % de los contratos registra anticipo | Parcial: supone 60 días fijos para todas las entidades y la pantalla no deja cambiarlo |
| «La obra se para o se alarga y la administración corre por mi cuenta» | 2 videos, 4 mediciones | 61 % de los contratos de licitación de obra se prorroga (mediana 87 días) (medido) | Parcial: prórrogas por entidad, con el defecto de «Suspendidos» |
| «No sé a qué precio ofertar» | 6 videos, 2 mediciones | El 53 % de las ofertas de licitación cae entre el 93,5 % y el 95,5 % del presupuesto (medido): se fija por porcentaje | Parcial: baja de la entidad y precio sugerido; falta dónde quedaron todas las ofertas |
| «La póliza de seriedad no llegó, o la adenda movió el cierre y quedó corta» | 7 videos | La prima no vuelve aunque no gane; el cupo de la aseguradora queda bloqueado unos cuatro meses por cada seriedad (citado por un corredor) | Falta |
| «Se me vence el RUP o un certificado» | 4 videos, 7 páginas | Renovar el RUP cuesta $831.000 al año (tarifa 2026); sin firmeza, no licita | Parcial: alarma en Mi empresa, sin correo |

Lo que **no** es dolor del que decide a qué presentarse (se descartó con motivo): operar la plataforma
SECOP II por el usuario, las actas y la liquidación después de firmar, y la redacción de propuestas
técnicas (la calidad decide pocas adjudicaciones en obra con documentos tipo).

## 3. El mercado, medido

| Hecho | Cifra | Fuente |
|---|---|---|
| Procesos competitivos de obra publicados en 2025 | 7.928, con un presupuesto total de $39,5 billones | p6dx-8zbt, contando expedientes y no fases |
| Procesos nuevos por día hábil (todo el país) | 29 de mediana; 158 por semana; 238 abiertos a la vez | p6dx-8zbt |
| Procesos nuevos por semana en una zona | Bogotá 22 · Bogotá y Cundinamarca 38 · departamento mediano 2 | p6dx-8zbt |
| Oferentes por proceso adjudicado | Mediana 2; el 40,4 % tuvo un solo oferente; licitación de obra, mediana 9 | p6dx-8zbt |
| Empresas y personas que ofertaron obra en 2025 | 11.535 (los consorcios abiertos a sus integrantes); el 89,6 % de las que aparecen en el registro de proveedores de SECOP II se declara pyme | hgi6-6wh3 × ceth-n4bn |
| Cuántas ofertan con frecuencia | 3 a 5 al año: 1.691 empresas (gana el 20,0 % de sus ofertas) · 6 a 11: 1.230 (12,8 %) · 12 a 23: 871 (6,1 %) · 24 o más: 802 (4,0 %) | hgi6-6wh3 × p6dx-8zbt |
| Contrato mediano firmado | $280,6 millones en modalidades competitivas | jbjy-vk9h |
| Estacionalidad | El 60,6 % de los contratos de obra de 2025 se firmó entre septiembre y diciembre | jbjy-vk9h |
| Uso de software de pliegos | 18 % de 64 empresas encuestadas | Tesis del Politécnico Grancolombiano, 2026 |

**La competencia, leída el 26-sep-2026** (páginas abiertas; precios mensuales):

| Producto | Qué vende | Precio |
|---|---|---|
| LicitarUS Pro | Análisis del pliego con página, cruce con el RUP, consorcio con la fórmula del pliego, capacidad residual de terceros, quién gana por entidad, simulador de oferta, formatos | $690.000 con IVA (30 análisis al mes; su página de planes dice 21); anual $5.900.000 |
| LicitIA · LicitaYa · Leadcitaciones | Alertas, extracción del RUP, riesgos del pliego, simulador de administración, imprevistos y utilidad | $15.900 a $299.000 · $49.999 a $129.999 · $18.750 a $25.000 |
| Fromus · Licitadores.app · LicitaMatch · Alicia | Suites intermedias | $199.000 + IVA · $200.000 a $350.000 · $195.000 a $390.000 más implementación · $72.000 a $330.000 |
| PresuCosto | Presupuesto con 700 APU en 22 ciudades, módulo SECOP | $39.900 a $149.900 |

**Lectura:** buscar y avisar ya es mercancía barata. Decidir con el pliego ya lo vende LicitarUS. Lo que
nadie publica: cuánto tarda en pagar cada entidad, la tasa de éxito propia de cada empresa y un precio
por ítem con banco oficial y su fuente.

> **Corregido el 27-sep-2026**: «dónde quedaron todas las ofertas de un proceso» SÍ se vende. Calculada
> (Yopal, constructora.calculada.com) lo ofrece desde febrero de 2025 en su Excel «SECOP Unificado» por
> $153.000 de pago único, y su aplicación calculada.com ($120.000 al mes) arma la propuesta con los
> formatos del pliego llenos; no busca procesos ni da precio. Con cuánto ofertaron todos (R-11) es lo
> mínimo del mercado, no una ventaja.

## 4. Tiempo y dinero, por tipo de empresa

**Horas que hoy le dedica una empresa a licitar, por mes** (buscar, leer, decidir, papeles, capacidad,
precio y presentar; mezcla de modalidades medida por tramo). El extremo bajo supone precio por
porcentaje y hora pagada; el alto, costeo completo y hora productiva ($31.634 la hora de analista,
$38.422 la de presupuestador).

| Empresa que oferta al año | Empresas | Horas hoy al mes | Techo de lo que Detekta ya puede ahorrar | Techo con las mejoras de la ruta | El plan Profesional pide… |
|---|---|---|---|---|---|
| 3 a 5 | 1.691 | 7 a 25 h ($0,17 a 0,84 M) | 2,2 a 8,4 h ($52.000 a $278.000) | 4,2 a 15,8 h (hasta $528.000) | más que el techo: no se paga por horas |
| 6 a 11 | 1.230 | 16 a 47 h ($0,37 a 1,58 M) | 5,2 a 14,0 h ($121.000 a $465.000) | 9,2 a 29,4 h (hasta $987.000) | el 90 % del techo |
| 12 a 23 | 871 | 30 a 90 h ($0,70 a 3,02 M) | 8,7 a 22,7 h ($203.000 a $763.000) | 16,9 a 55,5 h (hasta $1,88 M) | el 55 % |
| 24 o más | 802 | 62 a 202 h ($1,46 a 6,80 M) | 14,4 a 43,1 h ($335.000 a $1,48 M) | 34,1 a 123,4 h (hasta $4,21 M) | el 28 % |

El piso demostrable de todo ahorro es cero hasta medir el uso. En los tramos chicos, la mayor parte del
techo es revisar fichas que no sirven; costear solo domina desde 12 ofertas al año y solo si se costea
completo.

**Plata en juego (no horas), por empresa y año** — «en juego» no es «protegida»: no está medido qué
parte evita Detekta, y las filas se solapan (no se suman):

| Concepto | 3 a 5 | 6 a 11 | 12 a 23 | 24 o más |
|---|---|---|---|---|
| Primas de seriedad de ofertas que no se ganan | $0,47 a 2,30 M | $1,04 a 5,13 M | $2,69 a 13,36 M | $6,92 a 34,47 M |
| Costo financiero de una entidad que paga más tarde que los 60 días que supone Detekta (licitación, mediana) | $0,86 M | $2,63 M | $7,35 M | $12,64 M |
| Lo mismo en la cuarta parte de entidades más lentas (p75) | $4,8 M | $14,8 M | $41,4 M | $71,2 M |

Por evento: una licitación sin opción que se deja de presentar ahorra $0,52 a 2,79 millones (parte de la
empresa en consorcio; solo la prima, $0,21 a 1,18 millones, es plata de bolsillo). Estampillas y
retenciones no costeadas por 2 puntos del presupuesto son de $28,8 a $99,8 millones en una licitación
mediana ganada (sin frecuencia medida). Pasarse del techo es rarísimo (3 de 8.924 ofertas de licitación de 2025): no se vende como
protección.

**Conclusión de precio**: por horas, Profesional ($420.000 + IVA) solo se paga solo en las 802 empresas
que ofertan 24 o más veces al año. Para las 2.921 de 3 a 11 ofertas, lo que se vende es plata: no
presentarse donde no se gana, saber cuánto tarda en pagar la entidad y no perder la oferta por un papel.
Eso es una hipótesis que el piloto tiene que medir.

**Dos premisas del plan de precios, corregidas**: el «margen neto 6 % [MEDIDO]» de
docs/PRECIO_Y_UNIT_ECONOMICS.md es la utilidad mínima para no perder (6,32 %), no una medición; y el
contrato de $82 millones con que se calculó el valor para el cliente es un tercio del presupuesto
mediano de 2025 ($250 millones). La tabla de precios de la competencia de ese documento tenía cuatro
errores de fondo (la tabla de arriba es la vigente).

**Una verdad incómoda sobre el costeo**: en 20 Formularios 1 reales, el lector de Precios deja en firme
el 37,2 % de los ítems (el banco de pruebas sintético dice 81,6 %), y ese 37,2 % depende del banco del
INVIAS, cuya licencia prohíbe el uso comercial sin autorización; sin él baja a cerca del 18 %. La
autorización ya está planeada y sin pedir:
docs/PLAN_DE_ACCION.md § «F0-3 · Solicitar por escrito la autorización de uso comercial al INVIAS».
Además, el servidor rechaza importar más de 400 filas y 2 de esos 20 formularios tienen más de mil.

## 5. La ruta

Regla de orden: primero lo que hoy da una cifra falsa y creíble; después lo que solo Detekta puede
sacar de datos públicos; después el camino al cobro. Cada iniciativa que toca un precio, la capacidad,
las puertas o el veredicto del dictamen se planea con el dueño antes de tocar código y lleva prueba por
mutación.

### 5.1 Ahora (0 a 30 días · unas 7 sesiones y 10 minutos del dueño)

| Iniciativa | Qué ve el usuario | Por qué la pagarían | Esfuerzo |
|---|---|---|---|
| R-01 La revisión del precio suma como la entidad | «Le quedan $X al techo», y ámbar desde el primer peso por encima del unitario oficial; nunca «lista» con revisiones pendientes | Evita la oferta rechazada por pesos y la que se sube sin comparar | 2 a 3 sesiones |
| R-02 Decidir sin descartar ni tranquilizar de más | Experiencia sumable dice «confírmelo»; indicadores sin pliego dicen «compare con el pliego»; capacidad sin contratos cargados lo dice; REDAM en la lista; desiertos «sin dato» | En oportunidades el error caro es descartar lo que sí se podía ganar | 2 sesiones |
| R-04 Cada proceso una sola vez | Una ficha por expediente, con su fase y su cierre verdaderos | Menos fichas repetidas y ningún aviso de cierre tardío | 1 sesión |
| R-03 Guardar con cuánto ofertó | Al marcar «Me presenté», el valor ofertado | Sin ese dato no se calibra el precio sugerido que vende Profesional; cada día sin guardarlo es un dato que no vuelve | Media sesión |
| R-05 El correo de la mañana, encendido | Lo que cierra, lo que cambió y lo que vence, sin mezclar visitantes | Hoy no le llega a nadie | Media sesión + 10 minutos en Vercel |
| Medir el uso | Nada visible: cuenta cuánto tarda decidir y costear | Sin esto ningún ahorro se podrá afirmar en abril | Media sesión |

### 5.2 Después (1 a 3 meses · unas 15 a 17 sesiones, más el arranque del cobro)

| Iniciativa | Qué ve el usuario | Dato | Esfuerzo | Plan del árbol que la contiene |
|---|---|---|---|---|
| R-07 Su historial real en SECOP | «Presentó N ofertas de obra en 12 meses y ganó M; de las empresas que ofertan como usted, K de cada 10 no ganaron ninguna» (la distribución, no un promedio) | hgi6-6wh3 + ceth-n4bn por NIT | 2 sesiones | relacionada con D-47 |
| R-06 Cuánto tarda en pagar esta entidad | «Esta entidad hace el primer pago a los N días (mediana de M contratos)», y esa demora, editable, en Precios y en la caja | uymx-8p3j, u99c-7mfm | 3 sesiones | D-66 |
| Retro-pruebas de la probabilidad y la baja | Nada visible: el error medido que la página de precios podrá publicar | hgi6-6wh3, p6dx-8zbt | 2,5 a 3 jornadas | F1-5 y F1-6 |
| R-09 Cuánto puede facturar de verdad | La capacidad con sus contratos en ejecución traídos de SECOP y el balance leído del RUP en PDF | jbjy-vk9h por NIT | 2 a 3 sesiones | D-60 |
| R-11 Con cuánto ofertaron todos | Dónde quedó la ganadora y cada oferta en esta entidad | wi7w-2nvm | 2 sesiones (luego la simulación de los métodos con la TRM) | D-65 |
| R-08 Los papeles de ESTE pliego | Lista marcada «se puede corregir» / «no se corrige», y aviso del informe de evaluación | Pliego ya leído; lector de Word nuevo | 3 a 4 sesiones | relacionada con D-58 |
| R-10 Poder cobrar | Cuentas, aislamiento entre clientes, cobro | — | 36 a 49 jornadas | docs/PLAN_DE_ACCION.md, fases 0 a 4 |

### 5.3 Más adelante (3 a 6 meses)

Papeles de la empresa y póliza de cada oferta con fechas que avisan (R-12, recortado); el precio con las
reglas de ESTE pliego: tope de administración, pólizas y descuentos que la entidad cobró en otros
procesos (R-14); la edad de los precios propios y el tiempo real de costear (R-15); la adenda que cambia
el formulario (R-13). Buscar socio fuera de los conocidos (R-16) y el pliego a la medida de otro (R-17)
quedan fuera del horizonte: LicitarUS ya hace lo primero, y lo segundo no tiene evidencia de pago.

### 5.4 Infraestructura (todo cabe en los 6 routers; ninguna dependencia)

- Una consulta por NIT (hgi6-6wh3, ceth-n4bn, jbjy-vk9h) que llama lo que ya existe en `lib/socio.js`;
  op nueva con un nombre sin parecido a `op=historico` (por ejemplo, `op=trayectoria` en api/perfil.js).
- Un normalizador por conjunto nuevo: un 0, «Confidencial» o una fecha futura se vuelven «sin dato» con
  su motivo, desde la primera línea.
- Índices semanales por entidad (`indice:pagos`) escritos por una op reanudable de api/procesos.js y
  disparados por un flujo semanal de GitHub, no por un tercer cron de Vercel (el cupo de cron del plan
  no está verificado).
- Todo dato del cliente nace con clave por perfil (`…:{perfil}`), para no agrandar la migración a
  varios clientes.
- Lector de Word en el servidor, reutilizando el lector de archivos comprimidos de
  `public/xlsx_lectura.js`.
- Parámetros con fuente y fecha para la tasa de crédito pyme (Superintendencia Financiera) y para el
  costo de preparar una oferta, que da el usuario.
- Contador de uso en Redis (`uso:{perfil}`), sin analítica de terceros.
- Vercel Pro (US$20 al mes) para poder cobrar; las rutinas de dictamen y de madrugada, creadas por el
  dueño.

## 6. Cosas que probablemente no ha pensado

1. **El contratista fija el precio por porcentaje**: más de la mitad de las ofertas de licitación cae
   entre el 93,5 % y el 95,5 % del presupuesto. El valor no está en armar cien APU, sino en saber dónde
   poner ese porcentaje en ESTA entidad y no pasarse del techo.
2. **La queja número uno del gremio tiene dato público y nadie lo vende**: cuánto tarda cada entidad en
   pagar (de 27 a 271 días según la entidad).
3. **La probabilidad de ganar se puede validar hoy** con quién se presentó y quién ganó, publicado para
   todo el mercado; no hace falta esperar a los clientes.
4. **El momento de vender es abril** (renovación del RUP, cuando el contratista busca ayuda), y el de
   construir es ahora: el 60,6 % de los contratos se firma entre septiembre y diciembre.
5. **Los $5 millones fijos de «preparar la oferta» desaconsejan casi toda mínima cuantía**, que es la
   modalidad de los que empiezan.
6. **El gremio regala sustitutos**: la Cámara Colombiana de la Infraestructura publica un boletín
   semanal gratis y el 85 % de sus afiliados son pymes. Aliarse puede vender más que competirle; CAMACOL
   nombra «inteligencia de licitaciones y análisis de pliegos» como caso de uso priorizado de su hoja de
   ruta de julio de 2026.
7. **Las cifras de las empresas del dueño viajan dentro del código** (`lib/perfiles.js`): hay que
   sacarlas antes de abrir la aplicación a nadie.
8. **El plan anual de LicitarUS sale más barato al mes que Detekta Profesional pagado mes a mes**
   ($491.667 frente a $499.800): hay que empujar el anual ($416.500 al mes con IVA).

## 7. Lo que no hay que hacer

- Cobrar por buscar y avisar: ya vale entre $15.900 y $25.000 al mes.
- Operar SECOP II por el usuario, leer las ofertas de los competidores para tumbarlos, o seguir la obra
  después de firmar.
- Poner una tasa de prima de póliza por defecto: ninguna aseguradora la publica y dos corredores
  discrepan.
- Vender la probabilidad de ganar como promesa, o publicar en la venta las horas ahorradas que dan los
  vendedores.
- Encender el correo sin el filtro de destinatarios, o añadir WhatsApp o un tercer cron antes de que el
  correo funcione.
- Reescribir como nuevas las fichas D-xx ya planeadas: se citan y se ejecutan.

## 8. Lo que decide el dueño

1. ¿Aprueba que se planeen primero los arreglos que mueven veredictos (sección 1, filas 1 a 8)?
   Recomendación: sí; cada sesión presenta qué cifra se mueve y cómo se prueba.
2. ¿Enciende el correo de la mañana? Recomendación: sí, después del filtro de destinatarios; son tres
   variables en Vercel.
3. ¿Cuánto le cuesta preparar una oferta, por modalidad? Recomendación: usted da su cifra; la aplicación
   deja de usar los $5 millones fijos.
4. ¿Adelanta las tandas 16 y 18 del plan de reforma (capacidad de verdad, con cuánto ofertaron todos,
   cuánto tarda en pagar la entidad)? Recomendación: sí; datos.gov.co responde hoy.
5. ¿Pide la autorización de uso comercial al INVIAS? Recomendación: sí, antes de vender Profesional.
6. ¿Cuándo empieza a cobrar? Recomendación: construir ahora y un piloto pagado en abril de 2027.

## 9. Fuentes principales

Datos abiertos (datos.gov.co, consultados el 26-sep-2026): procesos `p6dx-8zbt`, contratos `jbjy-vk9h`,
proponentes `hgi6-6wh3`, integrantes de proponentes plurales `ceth-n4bn`, pagos `uymx-8p3j`,
ofertas `wi7w-2nvm`, índice de documentos `dmgg-8hin`, Plan Anual de Adquisiciones `9sue-ezhx`, tasas de
crédito `qzsc-9esp` (Superintendencia Financiera).

Web leída: tesis del Politécnico Grancolombiano con encuesta a 64 empresas
(https://alejandria.poligran.edu.co/server/api/core/bitstreams/1be8581c-8a67-4f16-b472-358298e625f6/content);
informe de contratación de la Sociedad Colombiana de Ingenieros
(https://sci.org.co/wp-content/uploads/file/volumen1_informe_contratacion_2019.pdf); Cámara Colombiana
de la Infraestructura (https://infraestructura.org.co); documentos tipo de Colombia Compra Eficiente
(https://www.colombiacompra.gov.co); planes de LicitarUS (https://www.licitarus.com/planes y
https://www.licitarus.com/novedades); PresuCosto
(https://presucosto.com/blog/licitaciones-secop-colombia-2026); tarifas del registro de proponentes 2026
(https://www.camado.org.co/web2/wp-content/uploads/2026/01/Tabla-Tarifas-Registro-de-Proponentes-2026.pdf);
salarios en Computrabajo y elempleo.

Videos más citados (subtítulos automáticos; quien habla suele vender un curso o un servicio, y eso se
anotó): https://www.youtube.com/watch?v=yQ-HxG7snPE (errores en ofertas económicas),
https://www.youtube.com/watch?v=4J2p60Mh0HI (pólizas con un corredor),
https://www.youtube.com/watch?v=5nxUUo5Cx94 (licitaciones públicas en Colombia),
https://www.youtube.com/watch?v=U-S89UqvJ0Y (una oferta de mínima cuantía de principio a fin),
https://www.youtube.com/watch?v=2YhJB8NqmM0 (Cámara Colombiana de la Infraestructura).
