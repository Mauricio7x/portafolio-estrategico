# Puntaje

Todos los números salen de las fichas de los asientos. El presidente calcula, nunca inventa. Use la última ronda que se corrió (la 3 si se corrió, si no la 2).

## Puntaje por opción (el número principal)

Cada ficha puntúa cada opción de 0 a 10. Para cada opción:

`puntaje de la opción = suma(peso x puntaje del asiento para esa opción) / suma(pesos)`, con un decimal.

La **opción recomendada** es la de mayor puntaje, salvo que un tope de abajo la retire. Muestre la cuenta de cada opción en una línea, por ejemplo: `B (3x6 + 2x7 + 2x8 + 2x6) / 9 = 6,7`.

## Bandas del veredicto (sobre el puntaje de la opción recomendada)

| Puntaje de la opción | Veredicto |
|---|---|
| 7,5 a 10 | ADELANTE |
| 6,0 a 7,4 | ADELANTE CON CONDICIONES |
| 4,5 a 5,9 | REHACER |
| menos de 4,5 | NO HACERLO |

Dos etiquetas reemplazan a la banda cuando encajan mejor, y el informe dice por qué:

- **ESPERAR**: la opción recomendada es buena pero depende de un requisito que todavía no se cumple (el resultado de una prueba, caja, una contratación). ESPERAR siempre nombra el disparador y la fecha que lo convierten en ADELANTE, y qué pasa si el disparador falla.
- **NO HACERLO** también aplica cuando «no hacerlo» es en sí la opción de mayor puntaje.

## Apoyo a la resolución

El FINAL SCORE de la ronda 3 es el apoyo de cada asiento al borrador de resolución tal como está escrito. Informe su promedio ponderado como «Apoyo a la resolución». Mide qué tan bien el plan del presidente recogió a la sala, no si la idea es buena.

## Topes (se aplican después de la banda y se declaran en el informe)

1. **Tope por ruina.** Cualquier asiento que termine en `RUIN RISK: likely` sobre la opción recomendada limita el veredicto a REHACER hasta que la resolución nombre una mitigación que ese asiento respalde. Un asiento en riesgo de ruina pesa más que seis entusiastas.
2. **Tope por puerta de un solo sentido.** Si la opción recomendada es una puerta de un solo sentido (lo dice Bezos o la mayoría de los asientos) y la dispersión sobre ella es de 4 o más, el tope es ADELANTE CON CONDICIONES y la prueba más barata pasa a ser requisito previo.
3. **Revisión de unanimidad.** Si la opción preferida de todos los asientos es la misma y sus puntajes para ella quedan a menos de 1 punto en la ronda 1, el presidente nombra la mejor alternativa sin defender como punto de choque en la ronda 2 y pide a los asientos cuyos pilares están más en riesgo que la defiendan a fondo.

## Dispersión y confianza

- `dispersión` = puntaje más alto menos el más bajo de los asientos sobre la opción recomendada.
- `confianza del consejo` = confianza promedio de los asientos x 2, redondeada, menos 1 si la dispersión es 5 o más. Escala de 1 a 10.
- Informe las dos. Un 7,0 con dispersión 1 es otra respuesta que un 7,0 con dispersión 6. Estos redondeos son para mostrar: la banda se decide con el puntaje sin redondear.

## Cuadro por pilar

Una columna por asiento: su FINAL PILLAR SCORE, que es el juicio de ese asiento sobre la opción recomendada solo en su pilar. Todo pilar en 4 o menos lleva una corrección con nombre en «Qué hacer ahora», aunque el veredicto sea ADELANTE.

| Pilar | Etiqueta de la dimensión |
|---|---|
| Estrategia y decisiones (Bezos) | Encaje estratégico y reversibilidad |
| Producto y empresas nuevas (Graham) | Demanda real y crecimiento |
| Ofertas, precios y ventas (Hormozi) | Fuerza de la oferta y economía unitaria |
| Mercadeo y atención (Gary V) | Atención y distribución |
| Personas, contratación y tiempo del fundador (Martell) | Capacidad del equipo y tiempo del dueño |
| Operación y crecimiento (Wickman) | Preparación operativa |
| Dinero y capital (Buffett) | Lado negativo y eficiencia del capital |
