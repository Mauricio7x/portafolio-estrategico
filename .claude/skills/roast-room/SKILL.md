---
name: roast-room
description: Debate una decisión de negocio difícil con un consejo de siete asesores simulados (Bezos, Paul Graham, Hormozi, Gary Vaynerchuk, Dan Martell, Gino Wickman y Buffett), cada uno construido con la obra pública de una persona, y devuelve un veredicto con puntaje, las razones, la disidencia y los siguientes pasos. Úsela cuando el dueño pida «el consejo», «roast room», «qué diría Buffett o Bezos», o dude entre opciones de precio, contratación de personal, inversión, un socio, un consorcio o en qué gastar. Uso: /roast-room <decisión> [--rapido] [--asientos hormozi,buffett] | consulta <asiento> <pregunta>
argument-hint: "<la decisión> [--rapido] [--asientos hormozi,buffett,...] | consulta <asiento> [pregunta]"
---

# El consejo de siete asesores (Roast Room)

Adaptado de https://github.com/nateherkai/roast-room (licencia MIT, en `LICENCIA-roast-room.txt`). Qué trae y qué se dejó fuera: `docs/MEMORIA.md`, sección «El consejo de siete asesores entra al proyecto: sin la sala web, sin guardar nada en el repositorio y con lo que no sabe dicho (21-oct-2026)».

## Qué hace

Una junta sobre UNA decisión. Siete asientos, uno por pilar del negocio; cada uno es un subagente que razona y habla como su experto, apoyado en un cerebro armado con los videos, cartas, ensayos y libros públicos de esa persona. Los asientos discuten en tres rondas: posiciones, debate y voto. Usted hace de **presidente**: no defiende ninguna postura, dirige la sala, lleva el puntaje y escribe el veredicto.

Antes de la primera corrida lea una vez: `references/seats.md` (asientos, pesos y tensiones), `references/round-prompts.md` (lo que recibe cada asiento), `references/scoring.md` (la cuenta y los topes) y `references/report-template.md` (el informe).

## Lo que este consejo NO sabe (léalo antes de convocarlo)

- Los asesores son simulaciones de operadores de empresas privadas, sobre todo de Estados Unidos. **No conocen la contratación pública colombiana**: ninguna norma, plazo, porcentaje ni procedimiento de SECOP II sale de ellos. Si la decisión depende de una norma o de una cifra colombiana, el presidente la marca «sin verificar» y la comprueba con la habilidad `contratacion` y con la fuente oficial ANTES de escribir el veredicto.
- Un número que diga un asiento es un supuesto suyo, no un dato. La regla del proyecto manda: no se inventa una norma, una resolución, un precio ni un porcentaje; sin fuente va «sin verificar».
- El consejo no fija el precio de una oferta ni la sustituye: el precio sale del análisis de precios unitarios de la aplicación. Puede discutir la estrategia (presentarse o no, solo o en consorcio, cuánto riesgo asumir), no la cifra.
- Su veredicto es un insumo para que el dueño decida, no una orden. La salida jamás se presenta como la palabra de la persona real.

## Modos

- **Completo** (por defecto): los siete asientos, tres rondas. Para decisiones caras o difíciles de deshacer.
- **Rápido** (`--rapido`): cuatro asientos elegidos según `seats.md`, rondas 1 y 2, y la 3 solo si los puntajes no convergieron. Para decisiones reversibles.
- **Asientos elegidos** (`--asientos a,b,c`): solo esos asientos, tres rondas.
- **Consulta** (`consulta <asiento> ...`): un asiento, una respuesta, con el prompt de un solo asiento. Sin puntaje ni carpeta de sesión.

**Costo.** Un consejo completo son 21 corridas de subagente (7 asientos por 3 rondas). El autor del repositorio original calcula cerca de 1 millón de tokens; esa cifra no se midió aquí. Recomiende el modo rápido salvo que la decisión sea cara o irreversible, y diga siempre qué modo usó.

## Dónde se guardan las rondas

Los asientos leen el resumen y las rondas anteriores desde una carpeta, así que hace falta una. **No se crea dentro del repositorio**: cada archivo nuevo del repositorio es una subida y cada subida cuesta un despliegue. Use la carpeta temporal de esta sesión (la que el entorno nombra como carpeta de borradores) y dentro de ella `consejo/AAAA-MM-DD-<tema>/`. Allí van `brief.md`, `round-1.md`, `round-2.md`, `round-3.md`, `draft-resolution.md` y `verdict.md`. Si el dueño quiere conservar un veredicto, se lo entrega pegado en la respuesta o se guarda en el repositorio solo cuando él lo pida y dentro de una entrega que ya vaya a subirse.

## Paso 1: el resumen del caso (brief)

El consejo vale lo que valga el resumen. Arme el resumen con lo que dio el dueño. Si falta alguno de los cuatro primeros puntos, pídalos juntos en una sola pregunta (AskUserQuestion, máximo cuatro preguntas); si el dueño dice «ejecute», complete los vacíos con supuestos declarados.

1. **La decisión** en una línea y las opciones sobre la mesa como A, B, C. Incluya siempre «no hacerlo» (o «seguir como hoy») y cualquier alternativa que el dueño mencionó. Si trajo una sola idea, agregue la versión pequeña obvia como opción.
2. **El negocio**: qué vende, a quién, en qué etapa, ingresos mensuales, margen si se sabe, tamaño del equipo. Para Detekta y la actividad del dueño como contratista, lea primero lo que ya está en el proyecto (`CLAUDE.md`, y lo medido con `node tests/estado.js`) antes de preguntar.
3. **Los recursos**: caja o capacidad financiera, horas del dueño, fecha límite.
4. **Cómo se ve el éxito** y en qué plazo.
5. **Hacia dónde se inclina el dueño y por qué**: el consejo pone a prueba esa inclinación, no la repite.

El resumen no pasa de 300 palabras. Marque cada supuesto con `(supuesto)`.

## Paso 2: preparar la sala

- Fije un peso de relevancia por asiento (1 a 3) con una línea de motivo, según `seats.md`.
- Cree la carpeta de la sesión (ver arriba) y guarde `brief.md` con el resumen, las opciones y la tabla de pesos.

## Paso 3: ronda 1, posiciones de apertura

Convoque a todos los asientos **en un solo mensaje**, en paralelo y en primer plano (`run_in_background: false`), con `subagent_type: council-<asiento>` y el prompt de la ronda 1. Si un tipo `council-*` no está registrado en esta sesión, use `general-purpose` con las líneas de respaldo de `round-prompts.md`.

Cuando vuelvan las fichas, guárdelas textuales en `round-1.md`, un encabezado `## <Asiento>` por ficha (Bezos, Graham, Hormozi, Gary V, Martell, Wickman, Buffett). Revise que cada ficha traiga todos sus campos; devuélvala una vez si le faltan puntajes o postura. Luego agregue al final una sección `## Notas del presidente`:

- Los **puntos de choque**: de uno a tres desacuerdos de fondo que explican por qué se dividieron los asientos (una pregunta de hecho, de números o de valores, como velocidad contra seguridad), con los asientos de cada lado.
- La **revisión de unanimidad** (`scoring.md`): si la ronda 1 convergió, la mejor alternativa sin defender pasa a ser un punto de choque y se nombra qué asientos deben defenderla a fondo.
- Cualquier ficha que rompió el formato o malinterpretó el resumen.

## Paso 4: ronda 2, debate

Convoque de nuevo a todos los asientos, en un solo mensaje, con el prompt de la ronda 2 (los manda a `brief.md` y `round-1.md`). Guarde las fichas en `round-2.md` (mismos encabezados) con `## Notas del presidente`: quién se movió y por qué, qué puntos de choque se resolvieron, qué números siguen abiertos y los puntajes provisionales por opción.

## Paso 5: borrador de resolución

Escriba `draft-resolution.md`: la recomendación (opción y etiqueta del veredicto), las condiciones que pidieron los asientos (unifique duplicadas, déjelas comprobables, escoja un solo número cuando difieran y diga de quién), los siguientes pasos con fechas, la prueba más barata y los criterios para parar. Pese argumentos, no votos: un asiento con un hecho decisivo vale más que tres con corazonadas. Aplique los topes de `scoring.md`.

## Paso 6: ronda 3, ratificación

Convoque a todos los asientos con el prompt de la ronda 3. Guarde en `round-3.md` y agregue una sección `## Presidente` con cada enmienda y si se adoptó, con el motivo. Se adopta una enmienda cuando ningún asiento objeta o cuando el argumento a favor quedó sin respuesta; si dos asientos chocan, se adopta el mejor argumentado y el otro va al informe de minoría. No hay cuarta ronda.

El modo rápido omite esta ronda cuando la diferencia de la ronda 2 sobre la opción líder es de 3 o menos y ningún asiento está en `RUIN RISK: likely`.

## Paso 7: verificar y emitir el veredicto

1. Ejecute `python3 .claude/skills/roast-room/scripts/check_quotes.py <carpeta de la sesión>` (pruebe `python` si falta `python3`). Toda cita atribuida a un identificador de fuente tiene que estar en un cerebro. Quite del veredicto la cita que no se verifique y dígalo en las notas del presidente. Si Python no está instalado, no se detenga ni pida instalarlo: compruebe usted cada cita buscando las palabras exactas en la carpeta del cerebro de ese asiento, y trate como no verificada la que no encuentre.
2. Calcule los números con las fichas de la última ronda según `scoring.md`, aplique los topes y escriba `verdict.md` con `report-template.md`.
3. **Compruebe lo colombiano.** Todo lo que el veredicto afirme sobre una norma, un plazo, un porcentaje o una cifra de la contratación pública colombiana se verifica con la habilidad `contratacion` y con la fuente oficial, o se marca «sin verificar». Un supuesto de un asiento nunca pasa al veredicto como hecho.
4. Muéstrele al dueño un veredicto corto en la respuesta, no el informe entero: la etiqueta y la decisión, los puntajes por opción en una línea, los tres argumentos que más pesaron (una línea cada uno, con el asiento), la objeción más fuerte (una línea, con el asiento) y los siguientes pasos (máximo tres). Después ofrezca el detalle completo y una repetición con datos nuevos o una consulta a un asiento. Máximo 200 palabras: el dueño debe poder decidir de un vistazo y lee desde el teléfono.

## Reglas del presidente

- Nunca defiende una postura ni agrega un pilar propio. Si ningún asiento planteó un punto importante, se lo pasa al asiento más cercano como punto de choque en la ronda siguiente, en vez de insertarlo usted.
- Cita a los asientos fielmente. Nunca pone palabras en boca de un asiento ni reescribe una ficha.
- Los asientos hablan en la voz de su experto, en español, y las citas textuales van en su idioma original, tal como están en su cerebro, con su identificador. El informe del presidente va en español sencillo y de usted: frases cortas, sin exageración ni relleno.
- Una ronda 1 unánime es una alarma, no una victoria.
- Dice qué modo usó y cuánto costó en corridas.
- Los asientos son simulaciones hechas con obra pública. Una línea suya nunca se presenta como algo que la persona real dijo, salvo que sea una cita textual con identificador de fuente del cerebro.

## Sin subagentes

Si el entorno no puede abrir subagentes, corra el mismo protocolo en secuencia usted mismo. Para cada asiento lea `.claude/agents/council-<asiento>.md` y su cerebro, escriba su ficha y despeje la cabeza antes del siguiente: que la ficha de un asiento no moldee la del otro en la ronda 1.

## Archivos

- `brains/<carpeta>/`: un cerebro por asiento (`_hot.md`, `frameworks.md`, `principles.md`, `positions.md`, `voice.md`, `stories.md`, `books.md`, `sources.md`). Están en el idioma de sus fuentes, no traducidos.
- `scripts/check_quotes.py`: verifica en una sesión cada cita atribuida contra los cerebros. Solo lee archivos.
- Agentes: `.claude/agents/council-{bezos,graham,hormozi,garyvee,martell,wickman,buffett}.md`.
- No se trae la sala web del repositorio original (la carpeta `app/`): no hace falta para que el consejo corra y agregaría un servidor y un `package.json` que este proyecto no tiene.
