# Asientos

| Asiento | Agente | Pilar | Es dueño de la pregunta | Cerebro |
|---|---|---|---|---|
| Bezos | `council-bezos` | Estrategia y decisiones | ¿Es esta la apuesta correcta y qué tan reversible es? | `brains/jeff-bezos/` |
| Graham | `council-graham` | Producto y empresas nuevas | ¿La gente de verdad quiere esto y está creciendo? | `brains/paul-graham/` |
| Hormozi | `council-hormozi` | Ofertas, precios y ventas | ¿La gente pagará, cuánto, y cómo se cierra la venta? | `brains/alex-hormozi/` |
| Gary V | `council-garyvee` | Mercadeo y atención | ¿De dónde sale la atención y está subvalorada? | `brains/gary-vaynerchuk/` |
| Martell | `council-martell` | Personas, contratación y tiempo del fundador | ¿Quién hace esto y cuánto le cuesta al calendario del dueño? | `brains/dan-martell/` |
| Wickman | `council-wickman` | Operación y crecimiento | ¿El negocio puede correr esto sin que el dueño lo sostenga todo? | `brains/gino-wickman/` |
| Buffett | `council-buffett` | Dinero y capital | ¿Qué le hace esto a la caja, al riesgo y al valor de largo plazo? | `brains/warren-buffett/` |

Las rutas de los cerebros son relativas a `.claude/skills/roast-room/`.

## Pesos de relevancia

El presidente fija un peso por asiento para cada decisión, antes de la ronda 1, y escribe el motivo en una línea. Los pesos vuelven honesto el puntaje final: una decisión de precio debe apoyarse en Hormozi, una de contratación de personal en Martell.

| Peso | Significa |
|---|---|
| 3 | La decisión vive en el pilar del asiento |
| 2 | El pilar resulta afectado de forma material |
| 1 | El pilar se toca en los bordes |

Todo asiento tiene al menos 1. Uno o dos asientos reciben un 3, ni más ni menos.

## Consejo rápido

`--rapido` convoca a cuatro: los dos asientos de mayor peso, Buffett o Bezos (el que no esté dentro, como control del lado negativo) y el asiento con más probabilidad de discrepar de los demás (el presidente dice por qué). Úselo para decisiones reversibles y de bajo riesgo. Consejo completo para todo lo que el dueño no pueda deshacer con facilidad.

## Tensiones naturales que cabe esperar

- Bezos y Buffett (horizonte largo, primero el lado negativo) contra Hormozi y Gary V (velocidad hacia la caja, volumen, actuar ya).
- Graham (hacer cosas que no escalan, estar cerca de los usuarios) contra Wickman (sistemas, procesos, responsabilidad).
- Buffett (quedarse en su círculo de competencia, evitar el endeudamiento) contra Gary V (apostar ya por la plataforma subvalorada).
- Martell (comprar tiempo propio, contratar pronto) contra Graham y Buffett (mantenerse pequeño y austero hasta que funcione).

Si la ronda 1 vuelve unánime, el presidente debe sospechar y presionar en la ronda 2 al asiento cuyo pilar está más en riesgo.

## Lo que ningún asiento cubre (lo pone el presidente en el resumen)

La contratación pública colombiana: normas, plazos, requisitos habilitantes, capacidad residual, SECOP II. Si la decisión depende de eso, va como hecho verificado en el resumen del caso (con su fuente) o como supuesto marcado, y se comprueba antes del veredicto.
