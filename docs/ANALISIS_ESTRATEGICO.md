# Análisis estratégico de Detecta · agosto 2026

Diagnóstico integral de producto contra la filosofía definitiva del dueño: **«problemas e
incógnitas difíciles, simplificadas para personas normales, que no necesiten un curso académico
o experiencia para poder licitar»**. Criterio operativo: *si para entender un número hace falta
leer un párrafo, el número está mal elegido*; prueba de fuego: *¿mi abuela lo entendería?*

Método: tres revisiones independientes (frontend principal, editor APU + lector de pliegos,
cadena RUP-PDF) ejecutadas sobre el código real con referencias `archivo:línea`, más la suite
completa (4/4 verde antes y después de los cambios de esta sesión). Lo que no se pudo verificar
está marcado como tal, con la forma de verificarlo.

**Puntuaciones**: `V` = valor para «ganar más contratos con margen» (0-5) · `E` = entendible por
una persona sin formación técnica (0-5).

---

## 1 · Diagnóstico por módulo

### 1.1 Landing / onboarding (RUP en PDF) — V 5 · E 4

**Qué hace.** Pantalla única: «Convertí tu RUP en contratos», botón «Subir RUP (PDF)». pdf.js
extrae el texto en el navegador, al servidor viaja solo texto, y si al certificado le falta un
dato (típico de persona natural) se piden solo las casillas faltantes en vez de rechazar.

**Qué sobra/esconder.** Jerga en el momento de máxima atención: «N códigos UNSPSC reconocidos»
(`onboarding.js:241,297`) debería ser «Reconocimos N tipos de obra que podés ejecutar»;
«Capacidad de contratación estimada» → «Podés presentarte a obras de hasta $X»; «Acceso con
clave (perfiles existentes)» → «Ya tengo clave».

**Qué falta.** (a) Ruta alternativa si el PDF no sirve (escaneado): hoy es un callejón sin
salida; (b) pedir ubicación y tipo de obra preferida — los dos filtros que más ruido quitarían;
(c) el paso de experiencia (CSV) vive en Mi empresa y el usuario nuevo nunca lo ve.

**Roto/inconsistente.** Voseo y usted mezclados en la misma sesión (la landing vosea, el gate y
Precios ustedean). Redirección con `setTimeout` de 1,8 s sin poder saltarla.

### 1.2 Dashboard de licitaciones — V 3 · E 2

**Qué hace.** Panel de 9 controles + botón, lista de tarjetas, sección PAA aparte.

**El problema central**: el panel de filtros pesa más que los resultados y ninguno de los 9
controles responde «¿a cuál me presento el lunes?». El orden por defecto (`atractividad`) hace
el trabajo real; el resto es ruido para el 90 % de las sesiones. Jerga visible: «valor
esperado», «UNSPSC», «RUP, K o caja», «PAA», «dataset p6dx-8zbt» en el pie.

**Propuesta** (impacto alto, esfuerzo medio): 2 controles visibles (texto + «las mejores para
mí») y el resto tras «Filtros avanzados». Eliminar el select asc/desc y el checkbox UNSPSC
(decisión de ingeniería expuesta como pregunta). Renombrar: «Anticipo mínimo declarado» → «Que
paguen adelantado al menos»; PAA → «Obras que van a salir».

**Qué falta.** Contador de cierre («cierra en 4 días»), guardar/descartar una licitación,
alertas de nuevas oportunidades, estado vacío accionable (hoy no dice qué filtro afloja).

**Roto.** `f-anticipo` arranca en 20: la primera visita ya viene filtrada sin que el usuario lo
sepa (es el default de negocio del dueño — decisión suya si se muestra u oculta). Dos
definiciones distintas de «más atractivas» en la misma pantalla (`index.html:378` vs `:475`).
Nota de depuración en producción (`app.js:844`: «nombres de columna sin verificar…»).

### 1.3 Tarjeta de licitación — V 4 · E 2

**Lo mejor del producto**: el bloque de probabilidad en frecuencia natural («Aquí suelen
competir 4 empresas» / «De cada 6 procesos como este, gana 1») con el valor esperado enunciado
como promedio sobre intentos. **Lo que lo entierra**: hasta 15 chips por tarjeta con tres
símbolos matemáticos distintos (`✓ ~ ≈ ✗ ?`), «K» sin explicar en ninguna parte, «Baja típica:
8,5 %» (jerga + porcentaje), «APU» como etiqueta de la acción principal.

**Propuesta**: de 15 chips a 3 (cierra en X días · cuánto vale · cuánta gente compite);
colapsar las 4 puertas en una línea («Cumplís los requisitos» / «Te falta capacidad
financiera»); botón «APU» → «Calcular mi precio». Falta cualquier acción de seguimiento
(guardar, descartar, «ya me presenté»).

**Corregido en esta sesión**: `cuantia_cop || 0` pintaba **«$0»** cuando la cuantía no venía
(violaba la invariante R1 declarada en la cabecera del propio archivo) — ahora dice «Cuantía no
publicada»; «cuantía medio» → «cuantía media»; y `motivoProbabilidad` —la frase de una línea
con el factor principal, escrita y probada— era **código muerto**: ahora se pinta cuando trae
señal propia (poca competencia, prórroga, colisión de cierres, baja).

### 1.4 Modal de desglose de probabilidad — V 2 (usuario) / 5 (auditoría) · E 0

Herramienta de defensa/auditoría excelente; instrumento de decisión nulo: tabla de 5 columnas
con fórmulas en monospace, pares clave:valor crudos del backend, «pp» sin glosar, «Confianza».
Que el porcentaje viva aquí es **decisión documentada del dueño** (la respuesta de 1 s y la de
30 s en el mismo sitio) — no se toca sin su permiso. Lo que sí es mejorable: encabezar con la
misma frecuencia natural de la tarjeta, mover la tabla completa a un `<details>` «Ver el cálculo
completo», y traducir el 401 («HISTORICO_TOKEN no coincide…») a lenguaje de personas. Falta la
conexión con la acción: seis pasos de aritmética y ningún «por eso te conviene ofertar a $X».

**Corregido en esta sesión**: el punto del semáforo era un ● negro idéntico en los 5 niveles;
ahora `fraseProbabilidad` publica la clase de color y el modal la pinta.

### 1.5 Editor APU — V 3 · E 3,5

Los tres pasos («¿Qué vas a construir? / ¿Dónde? / Calcular y exportar») son excelentes. Los
tres métodos de entrada (detección desde el objeto, búsqueda con autocompletar, Excel)
conviven bien tras retirar el desplegable de 174 ítems (PR #57).

**Techo real**: catálogo de 174 ítems y 14/33 departamentos con región cotizada; la inferencia
produce un esqueleto (mediana 4 ítems, 3 tipologías en 0), no un presupuesto.

**Qué esconder**: «Códigos UNSPSC (opcional)» pegado al botón principal; «Modo AIU aditivo vs
compuesto» no es una decisión de contratista; el selector «Helder/Génesis/Consorcio» no dice
nada a un tercero; el grid de Ajustes separa la A de la I y la U con dos controles ajenos.

**Roto (encontrado por revisión, pendiente lo no trivial)**:
- ✅ *(corregido)* `CLASES_ORIGEN` sin la clave `propio`: «Tu precio» —la fuente más fuerte de
  la cascada— se pintaba ámbar como un derivado regional.
- ✅ *(corregido)* Filas inferidas huérfanas cuando la segunda detección devuelve 0 ítems.
- ✅ *(corregido)* «Aplicar este descuento» escribía en un campo dentro del `<details>` de
  Ajustes **cerrado**: la acción era invisible. Ahora lo abre.
- ✅ *(corregido)* `null <= 0` pintaba en rojo una utilidad esperada «—» (sin dato).
- ⬜ **El botón APU no reinicia el editor**: abrir una segunda tarjeta arrastra filas, resumen y
  precio sugerido del proceso anterior — cifras viejas con aspecto de nuevas. Es el arreglo
  pendiente más importante de la pestaña (esfuerzo medio: hay que decidir qué estado se
  conserva y qué se limpia, y probarlo).
- ⬜ La promesa «los precios que corrija quedan guardados» solo se cumple al pulsar Guardar.
- ⬜ Sin detección de duplicados al añadir ítems; sin deshacer al quitar una fila.

### 1.6 Optimizador de precio sugerido — V 5 · E 2

La función más valiosa de la app y está bien construida (distingue los dos descuentos, se niega
a recomendar sin centro de mercado). Pero: el titular debería ser la conclusión («Ofertá con un
X % de descuento: $NNN») y `optimizador.mensaje` —la mejor prosa del módulo, ya calculada en el
servidor— **solo se pinta cuando falla**. «VEG», «meseta», «pp», «granularidad_utilizada» y
«σ 8 %/15 %» llegan crudos a la pantalla. Conservador/Óptimo/Agresivo → «Más seguro /
Recomendado / Más agresivo». La curva no sombrea la meseta que la nota describe en palabras.

### 1.7 Lector de pliegos PDF — V 1,5 hoy / 5 potencial · E 2

El parser es de lo más trabajado del repo y el resultado **no llega a ninguna parte**:

- **Es un callejón sin salida**: no existe «Usar estos ítems en mi presupuesto». El contratista
  extrae 60 ítems del formulario y tiene que reteclearlos en el paso 3.
- **Los dos catálogos no se tocan**: `catalogo_apu.json` (reconocimiento, códigos `LOC-*`) y
  `apu_catalogo.json` (precios, `INV-*`/`NOG-*`) tienen 0 códigos en común y no hay campo
  puente, así que incluso con el botón, cada fila entraría «personalizada, sin precio».
  *(Nota: CLAUDE.md afirma que el código del catálogo de precios se emite cuando el ítem existe
  allí; la revisión ejecutó ambos catálogos y no encontró intersección — hay que reconciliar
  esa afirmación con el dato.)*
- El JSON que exporta no se puede reimportar (el importador solo acepta xlsx/csv).
- Mensajes que hablan de una UI retirada («Guarde primero el token de acceso, arriba») — código
  hoy inalcanzable, pero documentación falsa dentro del fuente.

**Cerrar el puente pliego→APU es la mejora individual de más valor de todo el análisis**
(esfuerzo alto: tabla de equivalencias entre catálogos + botón + prueba).

**Corregido en esta sesión**: el semáforo 🟢🟡🔴 (emoji del sistema) pasó a punto tipográfico
con el color del chip, y «parseo poco fiable» → «lectura poco fiable: verifique contra el PDF».

### 1.8 Pestaña Mi empresa — V 2 · E 1 (arriba) / 0 (Sistema)

El pliegue de «Sistema» fue la decisión correcta y quedó incompleta: el bloque **«Puesta en
producción, sin terminal»** (tres pasos Génesis, `cargar_experiencia.sh`, «Sincronización
Full») sigue **fuera** del pliegue, visible para cualquier usuario. Además: textarea de JSON con
placeholder de 8 campos, `<pre>` con el JSON crudo del RUP, «Exportar a JSON», y los nombres de
las empresas del dueño en la barra superior de las tres pestañas (por diseño para el gate del
dueño, pero un usuario con clave los ve).

**Propuestas**: mover «Puesta en producción» dentro de Sistema (esfuerzo bajo, pero toca un
bloque con historia de defectos de visibilidad — hacerlo con su prueba); vista del RUP en 4
líneas de lenguaje natural en vez de JSON; alerta de vigencia del RUP («tu RUP vence el X») —
la única alarma de esta pestaña que puede costar contratos; renombrar columnas de cobertura
(Criticidad/Similitud → Urgencia / Se parece a lo tuyo).

**Roto**: `href="#bitacora"` apunta a un nodo dentro de TRES `<details>` cerrados; tres
selectores de perfil desincronizados con valores incompatibles (`juntos` vs `consorcio`).

### 1.9 Panel avanzado (sincronización, índices, auditoría) — V 2 · E 0

Ya vive dentro de `<details id="seccion-sistema">` (nace cerrado), que es donde debe estar.
«Idempotente», «candado con TTL», «cursor», «tandas» son texto para el dueño-operador, no para
el contratista; mientras estén plegados, cumplen. No tocar: cada botón de ahí tiene invariantes
con prueba (1.ª tanda full / siguientes auto, etc.).

### 1.10 Carga de RUP (PDF y manual) — V 5 · E 3

**La preocupación A del dueño estaba ya resuelta** (ver §2.A). La carga manual por JSON es de
operador, no de usuario final — correcta donde está, mal expuesta (textarea JSON visible).

**Corregido en esta sesión** (universalización de bajo riesgo): el extractor lee ahora «razón
corriente» (¡el propio mensaje al usuario la prometía sin que la regex la leyera!),
«S.M.M.L.V.», «SMLMV» y «cobertura de gastos financieros»; el 400 de validación dejó de hablar
en rutas internas («perfiles.rup_x.indicadores.liquidez debe ser mayor que 0») y ahora dice
«“Índice de liquidez” debe ser mayor que 0 (en el certificado se leyó: …)»; y cuatro mensajes
mandaban al usuario a `/admin.html`, una página retirada — ahora a la pestaña «Mi empresa».

**Pendiente (riesgo medio, documentado)**: un indicador legítimamente en 0 (utilidad
operacional de un año de pérdidas) todavía produce rechazo — la salida limpia es tratarlo como
«pedible»; asociar rótulo→valor cuando el certificado los pone en filas distintas (layout
tabular RUES); anclar el NIT al entorno de la razón social (hoy puede capturar el NIT de la
propia Cámara del pie de página); declarar qué línea casó cada indicador (multi-año).

### 1.11 Experiencia laboral — V 4 · E 1

El valor es real (prioriza la auditoría de cobertura con la obra que el usuario SÍ sabe hacer)
pero la UI es de operador: CSV con formato estándar + textarea JSON + los tres pasos de Génesis.
Para el usuario final falta un formulario simple («Agregá un contrato que ya ejecutaste»:
entidad, objeto, valor, año) que alimente el mismo endpoint. Esfuerzo medio.

---

## 2 · Preocupaciones del usuario: veredictos

### A. «El RUP de Helder falla, el de Génesis funciona» — REAL, YA CORREGIDO (hoy)

Confirmado y **ya estaba corregido en `main` el mismo día** (commit `c9ebe44`, 2026-08-12), con
una prueba que cita el reporte textual. Causa: el certificado de **persona natural** sale de la
Cámara sin la línea «Utilidad operacional» (quien no lleva libros no la reporta) y el extractor
rechazaba el certificado ENTERO por un número que ese formato no imprime. Génesis (SAS) sí la
trae. Ahora se acepta lo leído y se piden solo las casillas faltantes.

**Qué se hizo además en esta sesión** para hacerlo universal (bajo riesgo): variantes reales de
rótulos (razón corriente, S.M.M.L.V., SMLMV, cobertura de gastos financieros), 400 de
validación en lenguaje de personas, mensajes sin `/admin.html`.

**Qué haría falta para verificarlo de verdad**: el dueño debe **reintentar con el PDF de
Helder contra el despliegue de hoy**. Si vuelve a fallar, el artefacto de diagnóstico mínimo es
el TEXTO extraído (no el PDF): un botón de depuración que lo descargue reproduciría el fallo
exacto en `extraerRupDeTexto` sin navegador. Y un corpus de 2-3 certificados RUES reales como
fixtures — hoy los 4 fixtures los escribió el autor del parser.

### B. «La probabilidad es confusa y engañosa» — REAL, YA RESUELTO EN LA TARJETA; afinado hoy

La tarjeta ya NO muestra porcentaje: muestra el hecho medido («Aquí suelen competir 4
empresas») y la **frecuencia natural** («De cada 6 procesos como este, gana 1») — exactamente
la reformulación que la literatura de comunicación de riesgo recomienda, y con la fuente
declarada. El porcentaje sobrevive solo donde es una cuenta y no un mensaje (desglose auditable
y editor APU): decisión documentada del dueño.

**Lo que faltaba y se hizo hoy**: la frase del factor principal (`motivoProbabilidad`) estaba
escrita y probada pero **nunca se pintaba** — ahora aparece cuando trae señal propia («Poca
competencia en esta entidad», «El cierre fue prorrogado…»). Y el punto del semáforo del modal
ahora distingue niveles por color.

**Pendiente (decisión de producto, no implementar sin el dueño)**: el modal de desglose sigue
siendo para auditores; la propuesta es encabezarlo con la frecuencia natural y plegar la tabla.

### C. «Los emojis se ven baratos» — REAL EN RESIDUOS, CORREGIDO

La salida de emojis se hizo en agosto, pero la prueba solo vigilaba el rango U+1F300–1FAFF y
**siete glifos BMP con presentación emoji por defecto se colaron**: ⚪ (×4), ➕ (×2), ⏰, ✅ y el
semáforo 🟢🟡🔴 de `pliego.js` (archivo que ni siquiera estaba vigilado). Además `badgeOrigen`
pintaba en pantalla los marcadores emoji destinados al Excel. Todo reemplazado por el sistema
ya vigente (punto tipográfico ● + clase de color del tema, o texto llano) y la prueba ampliada
para que no puedan volver. `apu_libro.js` sigue fuera a propósito: sus marcadores viajan al
Excel exportado, otro medio y otra decisión documentada.

### D. «Portafolio → Detecta» — YA ESTABA HECHO; quedaba un residuo

La marca visible es consistentemente «Detecta» (`<title>`, landing, gate, barra) y hay prueba.
Quedaban dos menciones en comentarios de código: la cabecera de `app.js` (corregida hoy) y el
comentario del `<title>` que cita el nombre viejo **a propósito** para explicar por qué se fue
(se conserva). El repositorio se sigue llamando `portafolio-estrategico`: renombrarlo es
decisión del dueño (rompe URLs de Vercel/GitHub; GitHub redirige, Vercel hay que revisarlo).

### E. «Administración demasiado compleja» — PARCIALMENTE RESUELTO

La partición ya existe: arriba lo del usuario (Tu RUP · Obra que ya ejecutaste · Códigos que te
faltan), abajo `<details id="seccion-sistema">` cerrado. **Quedó fuera del pliegue el bloque
«Puesta en producción, sin terminal»** (tres pasos Génesis) — es el residuo más visible y
moverlo es la siguiente mejora de esa pestaña (esfuerzo bajo-medio: el bloque tiene historia de
defectos de visibilidad y hay que mover también su prueba). Propuesta de reparto completa en
§1.8. No se movió hoy: toca invariantes probadas del encadenado Génesis y merece su propia
sesión con la suite delante.

### F. «El desplegable de 174 ítems es inusable» — YA RESUELTO (PR #57, sesión anterior)

El `<select>` no existe y la suite lo prohíbe. Hoy: detección desde el objeto + búsqueda con
autocompletar + carga de Excel con vista previa y mapeo manual de respaldo. La combinación es
la correcta. Las mejoras pendientes son de pulido: selector de hoja cuando el xlsx trae varias,
detección de duplicados al añadir, y el puente desde el lector de pliegos (§1.7).

---

## 3 · Matriz de priorización

Esfuerzo en sesiones de ~30 min. «Hecho hoy» = incluido en esta rama.

### Impacto alto · esfuerzo bajo → HECHO HOY ✅

| # | Mejora | Sesiones |
|---|---|---|
| 1 | Extractor RUP universal: variantes de rótulos + 400 legible + mensajes sin `/admin.html` | 1 |
| 2 | Emojis residuales fuera (⚪ ➕ ⏰ ✅ 🟢🟡🔴 + `badgeOrigen`) y prueba ampliada a `pliego.js` | 1 |
| 3 | `motivoProbabilidad` cableado a la tarjeta (era código muerto) | 0,5 |
| 4 | `cuantia_cop \|\| 0` → «Cuantía no publicada»; «cuantía medio» → «media» | 0,5 |
| 5 | Punto del semáforo con color en el modal (`fraseProbabilidad.clase`) | 0,5 |
| 6 | `CLASES_ORIGEN.propio` (azul) — «Tu precio» ya no se ve como derivado dudoso | 0,5 |
| 7 | «Aplicar descuento» abre el `<details>` de Ajustes (acción visible) | 0,5 |
| 8 | Filas inferidas huérfanas + utilidad esperada `null` en rojo | 0,5 |

### Impacto alto · esfuerzo medio → esta semana

| # | Mejora | Sesiones | Nota |
|---|---|---|---|
| 9 | Reset del editor APU al abrir un proceso nuevo (cifras viejas con aspecto de nuevas) | 2 | El defecto activo más peligroso |
| 10 | Mover «Puesta en producción» dentro de Sistema + su prueba | 1-2 | §2.E |
| 11 | Dashboard: 2 controles visibles + «Filtros avanzados» plegado + renombres | 3 | §1.2 |
| 12 | Tarjeta: de 15 chips a 3 + puertas en una línea + botón «Calcular mi precio» | 3 | §1.3 |
| 13 | RUP: indicador legítimamente en 0 no rechaza; rótulo→valor en filas distintas | 2-3 | §1.10 |
| 14 | Optimizador: titular con `optimizador.mensaje`, renombres, jerga fuera | 2 | §1.6 |
| 15 | Alerta de vigencia del RUP en Mi empresa | 1 | La alarma que falta |
| 16 | Errores 401/red en lenguaje de personas (6 mensajes, dos frontends) | 1 | «HISTORICO_TOKEN…» |

### Impacto alto · esfuerzo alto → planificar

| # | Mejora | Sesiones | Nota |
|---|---|---|---|
| 17 | Puente lector de pliegos → editor APU (tabla `LOC-*`↔`INV-*` + botón + prueba) | 4-6 | La mejora individual de más valor |
| 18 | Guardar/descartar/seguir licitaciones (primera acción de seguimiento) | 4-6 | Cambia la app de lista a herramienta |
| 19 | Modal de desglose encabezado por frecuencia + tabla plegada | 2-3 | Decisión del dueño (porcentaje) |
| 20 | Formulario simple de experiencia (sin CSV/JSON) | 3 | §1.11 |
| 21 | Onboarding v2: ubicación + tipo de obra + experiencia en el flujo | 4 | §1.1 |
| 22 | Unificar selectores de perfil (`juntos` vs `consorcio`) y voseo/usted | 3 | Consistencia global |
| 23 | Alertas de nuevas oportunidades que pasan tus filtros (correo; el cron diario ya existe) | 4-6 | El mayor ahorro operativo pendiente: hoy todo el valor exige entrar a diario (`docs/ACCESIBILIDAD.md` §5) |

### Impacto bajo → no hacer

- Regionalizar el AIU o inventar desglose horario de equipo (fabricaría precisión no medida).
- Comentarios de celda en el Excel (dos modos de fallo que rompen el libro entero — ya documentado).
- Ocultar `financiacion_requerida` u otros derivables de datos públicos.
- Cambiar el default `f-anticipo=20` sin preguntar al dueño (es su criterio de negocio).
- Renombrar el repositorio (rompe URLs; solo si el dueño lo pide).

---

## 4 · Plan de implementación sugerido

1. **Hoy** (esta rama): lote 1-8 ✅ + este documento. Suite 4/4.
2. **Sesión siguiente**: #9 (reset del editor) — es el único defecto activo que produce cifras
   equivocadas creíbles, la categoría que este proyecto trata como la más cara.
3. **Misma semana**: #10 y #16 (residuos de jerga/operador), luego #11-12 (la pestaña de
   entrada, donde vive el 90 % de las sesiones), con verificación en navegador real (el arnés
   CDP ya existe y la memoria del proyecto documenta cómo).
4. **Planificar con el dueño**: #17 (puente de pliegos — definir el mapeo entre catálogos ítem
   a ítem, que es trabajo de criterio de obra, no solo de código) y #18-19 (decisiones de
   producto).

## 5 · Limitaciones encontradas (dicho, no disimulado)

- **No tenemos el PDF de Helder**: la causa raíz se identificó por git + análisis estático y
  está corregida y probada con fixture sintético, pero la verificación final exige que el dueño
  reintente contra el despliegue de hoy. Si falla, pedir el texto extraído (no el PDF).
- **Los fixtures del extractor RUP los escribió el autor del parser** (la misma limitación que
  el proyecto ya documenta para `apu_bench`): sin un corpus de certificados RUES reales, la
  «universalidad» es una cota, no una medición.
- **INVIAS/fuentes oficiales de precios siguen en 403 desde este entorno**: el badge «INVIAS
  verificado» y el desglose horario de equipo siguen sin poder alimentarse (ya documentado en
  CLAUDE.md; nada nuevo que hacer).
- **La afirmación de CLAUDE.md sobre la emisión del código del catálogo de precios en el lector
  de pliegos no se sostiene contra los datos actuales** (0 códigos en común entre los dos
  catálogos): reconciliar al implementar #17.
- **El análisis de UX es de lectura de código, no de usuarios**: las puntuaciones E son juicio
  experto contra la filosofía declarada. La verificación real es ver a un contratista usar la
  app 10 minutos.

## 6 · Próximos pasos recomendados

1. Que el dueño **reintente el RUP de Helder** en producción y, si falla, mande el texto extraído.
2. Priorizar #9 (reset del editor APU) antes de que alguien presupueste con filas de otro proceso.
3. Decidir con el dueño las tres decisiones de producto abiertas: modal de desglose (§2.B),
   default de anticipo (§1.2), y el alcance del puente de pliegos (#17).
4. Conseguir 2-3 certificados RUES reales (persona natural y jurídica, cámaras distintas) como
   fixtures del extractor.
5. Verificación en navegador real de esta rama tras el despliegue (arnés CDP documentado en la
   memoria del proyecto).
