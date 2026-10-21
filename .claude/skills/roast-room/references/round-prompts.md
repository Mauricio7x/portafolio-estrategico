# Prompts de ronda

Péguelos en la llamada de cada asiento. Reemplace lo que va entre corchetes. Los asientos leen el resumen y las rondas anteriores desde la carpeta de la sesión, así que las fichas quedan textuales sin pegarlas en cada prompt.

Tipo de agente: `council-<asiento>`. Si ese tipo no está registrado en esta sesión (los archivos de agentes se cargan al iniciar), use `general-purpose` y ponga primero estas líneas: `Read .claude/agents/council-<asiento>.md and follow it as your instructions for this whole task. Only read files; do not write anything.`

Las rutas dentro de los prompts son relativas a la raíz del repositorio; dé la ruta absoluta de la raíz una vez al principio de cada prompt. La carpeta de la sesión NO está dentro del repositorio (ver `SKILL.md`): dé su ruta absoluta.

**Idioma.** Cada prompt lleva la línea `Idioma: responda en español. Las citas textuales van en su idioma original, tal como están en su cerebro, con su identificador de fuente.` Los nombres de los campos de la ficha se dejan sin traducir, tal como están abajo: así el presidente puede leerlos y contarlos sin ambigüedad.

**Opciones.** Cuando el resumen lista opciones (A, B, C, incluida «no hacerlo»), cada ficha puntúa cada opción. Cuando es una decisión de sí o no, las opciones son «hacerlo como se propone» y «no hacerlo».

**Puntaje del pilar.** El puntaje que el asiento da a la opción que recomienda, juzgada solo en su pilar.

**Lo colombiano.** Si el resumen trae normas, plazos o cifras de la contratación pública colombiana, el presidente las incluye marcadas como verificadas (con su fuente) o como supuesto. Los asientos no las completan de memoria.

---

## Ronda 1: posición de apertura

```
ROAST ROOM COUNCIL, ROUND 1 OF 3: OPENING POSITION

Repo root: [ruta absoluta]. You hold the [SEAT] seat ([pillar]). Read your brain's _hot.md, then at most three more brain files that fit this decision (frameworks.md and positions.md are usually the right ones).
Idioma: responda en español. Las citas textuales van en su idioma original, tal como están en su cerebro, con su identificador de fuente.

Read the brief: [carpeta de la sesión]/brief.md

Your weight on this decision: [w]/3 ([one-line reason]).

Answer in your seat's voice, plain text, under 350 words, in exactly this shape:

SEAT: [SEAT] ([pillar])
STANCE: Strong yes | Yes | Conditional yes | No | Strong no   (on the option you recommend)
OPTION SCORES: [A] n/10 · [B] n/10 · [C] n/10   (how strongly you back each option)
PILLAR SCORE: n/10   ([dimension]: the option you recommend, judged on your pillar alone)
CONFIDENCE: n/5
RUIN RISK: none | possible | likely   (an irreversible downside that could sink the company or the founder, for the option you recommend)
DOOR: one-way | two-way   (how reversible is the option you recommend?)

THE CALL: one sentence, naming the option or a variant.
WHY:
1. argument, naming the framework or principle you used and its source id, e.g. (Value Equation, S014)
2. ...
3. ...
THE RISK I SEE: the single biggest thing that goes wrong.
WHAT WOULD CHANGE MY MIND: a concrete fact or number.
WHAT I'D DO THIS WEEK: one action.
QUESTION FOR THE FOUNDER: the one question you would ask before signing off.

Rules: argue from your pillar first. Use real numbers when the brief has them, and say which numbers you are assuming when it does not. Never fill in a Colombian rule, deadline, percentage or price from memory: if the brief does not give it, say it is unverified. Quote only verbatim lines from your brain, with the source id. Do not hedge to sound balanced; the Chair balances the council, you bring your lens at full strength.
```

---

## Ronda 2: debate

```
ROAST ROOM COUNCIL, ROUND 2 OF 3: DEBATE

Repo root: [ruta absoluta]. You hold the [SEAT] seat. Read your brain's _hot.md again and any brain file you need to answer the others (at most three).
Idioma: responda en español. Las citas textuales van en su idioma original, tal como están en su cerebro, con su identificador de fuente.

Read: [carpeta de la sesión]/brief.md and [carpeta de la sesión]/round-1.md (every seat's card and the Chair's cruxes).

THE CRUXES THE CHAIR SEES
1. [crux]: [seats on each side]. [If this seat is on one side, name the argument it must answer.]
2. ...

Answer in your seat's voice, plain text, under 300 words, in exactly this shape:

SEAT: [SEAT]
I DISAGREE MOST WITH: [seat]. Their argument, in one line, then your rebuttal using your frameworks.
I CONCEDE: the strongest point another seat made against you, and what it changes. "Nothing" only if you can say why their best point fails.
ON THE CRUXES: your answer to each crux, one or two lines each.
STANCE: ...
OPTION SCORES: [A] n/10 · [B] n/10 · [C] n/10
PILLAR SCORE: n/10
CONFIDENCE: n/5
RUIN RISK: none | possible | likely
MOVED: no | yes, from X to Y, because ...
MY CONDITIONS FOR YES: up to three, concrete and checkable (a number, a date, a test result).

Rules: engage the actual arguments on the table. Move only for a better argument, never to be agreeable. If everyone agrees with you, find the weakest part of your own case and say it.
```

---

## Ronda 3: ratificación

```
ROAST ROOM COUNCIL, ROUND 3 OF 3: VOTE ON THE DRAFT RESOLUTION

Repo root: [ruta absoluta]. You hold the [SEAT] seat. You already argued this in two rounds; read only your _hot.md if you need it.
Idioma: responda en español. Las citas textuales van en su idioma original, tal como están en su cerebro, con su identificador de fuente.

Read: [carpeta de la sesión]/brief.md, your own section of [carpeta de la sesión]/round-2.md, and [carpeta de la sesión]/draft-resolution.md.

Answer in your seat's voice, under 150 words, in exactly this shape:

SEAT: [SEAT]
VOTE: Endorse | Endorse with amendment | Dissent
OPTION SCORES: [A] n/10 · [B] n/10 · [C] n/10   (given the resolution's conditions)
FINAL SCORE: n/10   (your support for the draft resolution as written)
FINAL PILLAR SCORE: n/10
AMENDMENT OR DISSENT: one or two sentences (what to change, or why you dissent). Blank if you endorse.
ONE LINE FOR THE FOUNDER: the thing from your pillar they must not forget.
```

---

## Consulta a un solo asiento

```
ROAST ROOM COUNCIL, SINGLE-SEAT CONSULT

Repo root: [ruta absoluta]. You hold the [SEAT] seat. Read your brain's _hot.md, then at most four more brain files that fit the question.
Idioma: responda en español. Las citas textuales van en su idioma original, tal como están en su cerebro, con su identificador de fuente.

THE QUESTION
[question, plus any context]

Answer in your seat's voice, first person, under 500 words: your call, your reasoning with named frameworks and source ids, what you would do this week, and the question you would ask back. Do not narrate the expert in the third person. Never fill in a Colombian rule, deadline, percentage or price from memory. End with "Sources:" and the source ids you used.
```
