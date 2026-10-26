# Probabilidad de adjudicación · Nivel 3: capturar quién quedó hábil para poder calcular la probabilidad de ganar

> Para: dueño · Estado: pendiente del dueño · Sustituido por: —

> Diseño del **26-oct-2026**. No cambia la aplicación. Parte de `docs/ADJUDICACION_FASE0_2026-10-25.md`, cuya
> sección 10 midió que ningún motor con datos abiertos acierta más del 44,1 % en licitación ni del 59,2 % en
> menor cuantía. Las cifras de aquí salen de `tools/analisis/adjudicacion/viabilidad_nivel3.js` (muestra con
> semilla fija) y de las fichas A-E (`detekta-lector/muestra/fichas_A-E`).

## 0. En una pantalla

- Para pasar de «a cuánto se adjudica» a «con este precio, gana tantas veces de cada 100» falta un dato: qué
  ofertas quedaron hábiles. No está en ninguna base abierta, pero sí en los documentos que la entidad publica
  después del cierre.
- **Medido (2026, 100 procesos por modalidad):** 89 de 100 licitaciones y 77 de 100 menores cuantías publican
  al menos uno de estos documentos: informe de evaluación, resolución de adjudicación o acta.
- **Probado a mano en 5 procesos:** se leyó quién quedó hábil, el porqué de cada rechazo y el método que salió
  por la TRM. Fueron rechazadas 12 de 32 ofertas.
- La tasa de rechazo de una entidad con un margen de ±15 puntos pide unas 43 ofertas leídas. Con un margen de
  ±10, unas 97. En licitación, 307 entidades ya suman 43 ofertas en la base 2020-2026 (con las reglas
  corregidas el 26-oct-2026). Las demás se apoyan en el departamento y en la modalidad.

## 1. Qué dato falta y dónde está

Por oferta hacen falta:
- quién es el oferente;
- si quedó hábil, y el motivo si no;
- el puntaje del precio y el puntaje total;
- el método aplicado y la TRM usada.

Las fichas A-E los sacaron de estos documentos:
- la calificación final;
- la verificación final (hoja de cálculo);
- la evaluación consolidada;
- la resolución de adjudicación.

Lo que se vio en esos 5 procesos de menor cuantía de 2026:

| Proceso | Ofertas (hábiles) | Causa de rechazo más frecuente | Método por TRM |
|---|---|---|---|
| A · Pasto | 8 (6) | papeles de capacidad residual ×2 | menor valor (0,78), como dice la tabla |
| B · Caldas | 6 (3) | papeles (formato de otro proceso, certificado del contador) | media aritmética baja (0,63), como dice la tabla |
| C · Floridablanca | 4 (2) | personal en nómina y capacidad residual | mediana (0,15), como dice la tabla |
| D · Turbaco | 5 (1) | no ser Mipyme de Turbaco ×3 | no consta: un solo hábil |
| E · Caldas | 9 (8) | experiencia específica ×1 | menor valor (0,97), como dice la tabla |

Las 12 ofertas rechazadas de 32 dan una tasa de 37,5 %, con un intervalo de 95 % (Wilson) de 22,9 % a 54,7 %.
Son 5 procesos: no sirve como cifra, sí como prueba de que el dato existe y se puede leer.

## 2. Cuántos procesos publican el documento (medido el 26-oct-2026)

`node tools/analisis/adjudicacion/viabilidad_nivel3.js <carpeta> <salida.json> 100 2026`

La muestra son 100 procesos «usables», adjudicados en 2026, por modalidad (semilla 20261026; tomados de la base
del 25-oct-2026, antes de corregir las reglas de limpieza). Su índice se
pide a `dmgg-8hin` («SECOP II - Archivos Descarga Historico 2026»), y cada archivo se clasifica con
`clasificarArchivo`, la misma regla de la aplicación.

| | Licitación | Menor cuantía |
|---|---|---|
| Con índice de archivos | 100 de 100 | 100 de 100 |
| Informe de evaluación | 17 | 12 |
| Resolución de adjudicación | 81 | 69 |
| Acta de cierre, audiencia o evaluación | 35 | 7 |
| Al menos uno de esos documentos | **89** | **77** |
| Al menos uno legible (PDF u hoja) | 89 | 76 |

Límites:
- **Sin verificar:** que cada resolución traiga la lista de hábiles con sus puntajes. En las fichas A-E sí la
  traía, pero son 5 procesos.
- El índice abierto es el de 2026. Para años anteriores habría que buscar el índice de cada año
  [sin verificar si existe].
- La categoría «habilitantes o ponderables» confunde formatos con resultados: «Formatos Financieros
  Habilitantes .zip» es un formato. Por eso no se suma al «al menos uno».

## 3. Cómo se capturaría, con lo que Detekta ya tiene

- **El índice y la descarga:** `lib/handlers/pliego/documentos.js`, que en producción ya baja archivos de
  SECOP II. Desde las sesiones de trabajo, SECOP II responde 403 (20-oct-2026), así que la captura corre en
  producción o con documentos que el dueño baje.
- **La lectura con citas comprobadas:** el lector de `detekta-lector` (`lector/verificar_citas.py`), que en
  las fichas A-E verificó 215 de 215 citas sin un rechazo.
- **La auditoría de lo leído:** `op=auditoria`, que ya marca los escaneos pobres.
- **Lo que se guarda por oferta:** el oferente, si quedó hábil, el motivo, los puntajes, el método, la TRM y la
  cita (documento, página y frase). Un dato sin cita no se guarda: «sin dato» no es «hábil».
- **Dónde correría:** como `op` del router `pliego`, o como tanda fuera de línea. Se decide en el encargo que la
  construya, porque toca producción.

## 4. Cuántos procesos hay que leer

La tasa de rechazo de rivales se estima por entidad. El tamaño de muestra para un semiancho e con 95 % es
n = ⌈1,96² · p(1 − p) / e²⌉, calculado con código:

| Semiancho | p = 0,5 (lo más exigente) | p = 0,375 (las fichas) |
|---|---|---|
| ±15 puntos | 43 ofertas | 41 ofertas |
| ±10 puntos | 97 ofertas | 91 ofertas |

La mediana de ofertas válidas por proceso es 16 en licitación y 6 en menor cuantía. Por eso, 43 ofertas son
unos 3 procesos de licitación o unos 7 de menor cuantía. En la base 2020-2026, con las reglas de limpieza
corregidas el 26-oct-2026:

| | Entidades | Con 43 ofertas o más | Con 97 o más |
|---|---|---|---|
| Licitación | 642 | 307 (2.769 procesos) | 162 (2.264 procesos) |
| Menor cuantía | 769 | 138 (2.888 procesos) | 53 (2.117 procesos) |

Una entidad sin muestra propia se apoya en su departamento y luego en la modalidad. Es la misma regla de
mínimo 30 que ya usa `scripts/base_obra/cifras.js` (`porGrupo`), y se llama, no se copia. La pantalla dice cuál
de los tres usó.

## 5. Cómo saldría la probabilidad

Para un precio propio dado, es la frecuencia con que esa oferta queda primera, promediando sobre:
1. **El método.** Los 4 métodos, cada uno con 1 de 4: los centavos de la TRM se reparten parejo (medido el
   17-oct-2026). El de cada proceso se elige con la versión de su fecha de aviso
   (`tools/analisis/normas_metodos.json`), y el cálculo va con `scripts/base_obra/metodos.js`.
2. **Los rivales.** Cuántos y con qué precios, tomados del histórico del mismo grupo (entidad o departamento,
   modalidad y tamaño).
3. **Quién de ellos queda hábil.** Con la tasa capturada de la entidad.

Va por simulación con semilla fija, y se muestra como frecuencia («de cada 100 veces, gana tantas»), no como
«probabilidad». Supuestos que se dicen en pantalla: la oferta propia es hábil (lo controla el contratista) y
los rivales no cambian su precio por la oferta propia.

## 6. Cómo se sabrá si funciona

1. **Prueba de la captura.** Con los hábiles y el método reales de un proceso, el motor debe reproducir al
   ganador casi siempre. Si no, la lectura está mal, no el modelo.
2. **Calibración.** Se entrena hasta 2025 y se prueba en 2026. Umbrales del C1: error de calibración de 5 puntos
   o menos, Brier con una mejora de 0,10 o más frente a 1/n, y al menos 300 procesos de prueba por modalidad.
3. **El registro propio** (`docs/VALIDACION_MODELOS.md` § 2: presentado, ganado o perdido) es la prueba final
   con las ofertas reales del dueño.

## 7. Costos y riesgos

- **La cuota de OCR.** Muchos de estos documentos son escaneos. La cuota gratuita de OCR.space está anotada como
  500 por día, sin verificar.
- **Lecturas malas.** Una tabla de puntajes leída mal da una tasa creíble y falsa. La regla es «sin cita no
  entra», y la auditoría de lo leído se aplica igual que a los pliegos.
- **El 403 de SECOP II desde las sesiones.** El desarrollo se prueba con documentos que baje el dueño; la
  captura masiva solo puede correr en producción.
- **El tiempo de lectura.** Hoy un documento puede tardar minutos (pendiente del 20-oct-2026). Leer unos 300
  procesos para la prueba de calibración pide la cola por cron (fase 5 del plan de raíz del 19-oct).

## 8. Lo que decide el dueño

1. **Si se construye la captura.**
   - Opción recomendada: empezar con una prueba de 30 procesos de licitación y de menor cuantía de 2026, sobre
     documentos bajados a mano, para medir cuántas resoluciones traen los hábiles y con qué exactitud se leen.
   - Alternativa: ir directo a producción.
2. **Dónde corre:** un `op` nuevo del router `pliego`, o una tanda fuera de la aplicación.
3. **Qué entidades van primero:** las de su zona (Bogotá, Cundinamarca y Tolima, que ya usa el simulador del
   17-oct) o las de más procesos.
