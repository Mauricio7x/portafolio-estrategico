# Banco de prueba · el APU parecido, medido sin Claude

> Para: sesión · Estado: referencia (generado) · Sustituido por: —

**Generado por** `node tests/apu_banco_prueba.js --escribir` el 2026-11-10. Ninguna cifra de este documento se escribe a mano: si el código o los bancos cambian, se vuelve a generar.

**Qué mide.** Por cada uno de los APU reales con composición (contrato Nogal adjudicado, INVIAS, EPC) se esconde ese ítem, la regla de mapeo de la importación busca su vecino entre los demás bancos, y el motor de «Calcular» costea los dos en CUNDINAMARCA. El error es |vecino − real| ÷ real. Es lo que le pasaría hoy a un ítem que el usuario carga y que no está en los bancos.

**Qué no mide.** La composición línea por línea, ni ítems que no se parecen a nada del corpus. Los APU generados por Claude no entran.

## Total

| Todo | Casos | Con vecino | Comparables | Error mediano | Error p90 | Dentro de ±10 % | Dentro de ±25 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| Todos los casos | 1123 | 1074 | 1046 | 20,9 % | 204,5 % | 34 % | 55 % |

## Por nivel del mapeo

«Firme» es lo que «Calcular» cobra solo; «revisar» espera la casilla del usuario; «personalizado» no tiene vecino.

| Nivel | Casos | Con vecino | Comparables | Error mediano | Error p90 | Dentro de ±10 % | Dentro de ±25 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| firme | 368 | 368 | 368 | 12,3 % | 68,3 % | 45 % | 67 % |
| revisar | 706 | 706 | 678 | 26,5 % | 424,7 % | 28 % | 49 % |
| personalizado | 49 | 0 | 0 | — | — | — | — |

## Por confianza del vecino

| Confianza | Casos | Con vecino | Comparables | Error mediano | Error p90 | Dentro de ±10 % | Dentro de ±25 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| 0,80 o más | 213 | 213 | 213 | 25 % | 906,3 % | 35 % | 50 % |
| 0,60 a 0,79 | 617 | 617 | 613 | 14,2 % | 78,6 % | 39 % | 65 % |
| 0,35 a 0,59 | 244 | 244 | 220 | 42,6 % | 566,3 % | 17 % | 32 % |
| menos de 0,35 | 0 | 0 | 0 | — | — | — | — |

## Por banco del ítem escondido

| Banco | Casos | Con vecino | Comparables | Error mediano | Error p90 | Dentro de ±10 % | Dentro de ±25 % |
|---|---:|---:|---:|---:|---:|---:|---:|
| nogal | 157 | 142 | 134 | 21,4 % | 99,7 % | 37 % | 55 % |
| invias | 526 | 497 | 484 | 13 % | 162,7 % | 42 % | 63 % |
| epc | 440 | 435 | 428 | 28 % | 440,6 % | 23 % | 46 % |

## Cómo leerlo

- Un error mediano bajo con un p90 alto quiere decir que el vecino suele acertar pero a veces se equivoca mucho: por eso «revisar» no cobra solo.
- Esta es la línea base de la capa «APU parecido». Una capa nueva (plantillas por familia, modelo abierto) se acepta solo si mejora estas cifras con el mismo banco.
