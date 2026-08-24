# Anexo G · Registro de riesgos
### Consultoría SaaS Detekta · 24-ago-2026 · silla adversaria

> Ordenado por **impacto × probabilidad**. La columna que más importa es la última: **la señal de
> alerta temprana**, porque es lo que convierte un riesgo en algo que se ve venir.

| # | Riesgo | Prob. | Impacto | Mitigación | Señal de alerta temprana |
|---|---|---|---|---|---|
| **R-1** | **Un cliente ve los datos de otro** | Alta si se lanza sin la Fase 2 | **Terminal.** Pérdida de confianza irrecuperable en un gremio pequeño donde todos se conocen, más exposición legal | Fase 2 completa + A-1..A-5 en verde con mutación demostrada | Cualquier consulta de soporte del tipo «me aparecieron unos contratos que no son míos» **ya es tarde** |
| **R-2** | **Se retira Password Protection antes de tener cuentas** | Media — es un error de secuencia, no de diseño | **Terminal.** La aplicación queda totalmente abierta: el token está a la vista en el código | Regla dura de `SEGURIDAD_Y_CUENTAS` §1, y S-1 en la lista | Que alguien proponga «quitarlo un rato para enseñárselo a un cliente» |
| **R-3** | **Se pierde el histórico y no hay respaldo** | Baja | **Muy alto.** Dos años de inteligencia; el corpus activo se rehace en horas, el histórico no | D-1: respaldo restaurado con fecha | No hay ninguna. **Es un riesgo que no avisa** — por eso el respaldo es de Fase 0 |
| **R-4** | **Un cliente oferta con una cifra de Detekta y pierde plata** | Media (es un negocio de márgenes finos) | Alto: reclamación, y con razón si la cifra afirmaba de más | Descargo visible · límite de responsabilidad · **la disciplina de declarar la incertidumbre, que ya está en el código** | Un cliente que pregunta «¿esto es lo que voy a ganar?» sobre una cifra marcada como cota superior |
| **R-5** | **El INVIAS no autoriza el uso comercial** | Media | Medio: se pierde un banco de precios de los cinco | Pedirla el primer día; producto de pago sin ese banco | Silencio administrativo a las cuatro semanas |
| **R-6** | **La probabilidad no calibra cuando por fin se mide** | Media-alta (nadie la ha medido) | Medio: hay que retirar el número de la tarjeta | El criterio de §4 de `VALIDACION_MODELOS` **decidido antes de medir** | Las retro-pruebas 9.1 y 9.2, que se ejecutan **antes** de vender |
| **R-7** | **SECOP cambia una columna y la ingesta se rompe** | **Alta — ya pasó tres veces** | Alto mientras dura: el producto se queda sin datos frescos | Comparación diaria del censo (D-3) + degradación declarada | Un motivo de descarte que salta de golpe; cero filas aceptadas |
| **R-8** | **El soporte desborda a una persona** | **Alta si el producto funciona** | Alto: la calidad cae justo cuando llegan clientes | Límite consciente de clientes por plan · documentación · la caja de «¿por qué no está este proceso?» ya reduce tickets | Más de una consulta al día que exija mirar el código |
| **R-9** | **El precio está mal puesto** | Alta (es un supuesto declarado) | Medio: se corrige, con incomodidad | Piloto de tres precios (Fase 5) con criterio fijado antes | Más de 7 de 10 renuevan → está bajo; menos de 4 → el problema no es el precio |
| **R-10** | **La pasarela no soporta la recurrencia como se esperaba** | Media | Medio: cobro manual mientras se resuelve | **Verificarlo antes de integrar**, no durante | La documentación habla de «pagos» y no de «suscripciones» |
| **R-11** | **El módulo de antecedentes del socio genera una reclamación de un tercero** | Baja, pero no nula | Alto: es sobre alguien que no es cliente y no aceptó nada | Fuera del plan de pago hasta que un abogado se pronuncie (L-8) | La primera solicitud de corrección de un tercero |
| **R-12** | **Un competidor copia el producto** | Media | Bajo a medio | Los datos son públicos; **lo que no se copia es el registro de resultados de los clientes** (`VALIDACION_MODELOS` §2) | Aparición de una plataforma con APU y bancos oficiales |
| **R-13** | **`maxDuration` está capado y la carga completa no termina** | Media (hay una contradicción medida en el repositorio) | Medio: sincronizaciones eternas encadenadas | Resolverlo en Fase 0 mirando el panel | Tandas que se encadenan sin avanzar |
| **R-14** | **Alta masiva contra la puerta de entrada** | Baja hoy, sube al ser conocido | Medio: los visitantes legítimos pierden su perfil por desalojo | Límite por IP y por ventana (S-5) | El tope de 300 perfiles lleno con altas seguidas |
| **R-15** | **Se rompe la regla de cero dependencias «ya que estamos»** | Media | Medio a largo plazo: el proyecto pierde lo que lo hace mantenible por una persona | Una excepción, aislada y declarada: el cobro | Una segunda dependencia propuesta «porque ya hay una» |

---

## Los tres que hay que mirar cada semana

**R-1** porque no se recupera. **R-7** porque ya pasó tres veces y volverá a pasar. **R-8** porque es
el que llega justo cuando todo lo demás sale bien, y es el único que **el éxito hace más probable**.
