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
- **Probado con los 30 del piloto (26-oct-2026, § 10 y § 11):** con las tablas en imagen leídas, 23 de 30 documentos
  dicen quién quedó hábil. Con esos hábiles y el método real, el motor de precio acierta al ganador en 8 de 10. En los 2
  que fallan, el precio sale bien y el ganador lo decidieron los puntos distintos del precio: la captura los guarda.
- **Construido (§ 11):** la ventana de la entidad lee las evaluaciones de sus procesos cerrados y dice cuántas ofertas
  rechazó, por qué, y si el ganador lo decidió el precio o los otros puntos, solo con datos verificados cita por cita.
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
  SECOP II.
  - Desde las sesiones de trabajo, SECOP II respondió 403 el 20-oct-2026. El 26-oct respondió 200 una vez y 403
    («Azure WAF») al pedido siguiente. Por eso la captura corre en producción o con documentos que el dueño baje.
  - Además, la aplicación hoy NO lee estos documentos sola: `ORDEN_MAX_PLAN = 9` en `lib/documentos_proceso.js`.
    El informe de evaluación tiene orden 12 y la resolución, 10, y salen como «no se lee solo: ábralo en SECOP II
    si lo necesita». Leerlos pide cambiar el plan de lectura, que es otro encargo.
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
   - Corregido el 26-oct-2026 con el piloto (§ 10 y § 11): acertó en 8 de 10. En los 2 que fallan no era la lectura:
     el ganador lo decidieron los puntos distintos del precio.
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

## 9. La prueba de 30 procesos, lista para bajar (26-oct-2026)

`node tools/analisis/adjudicacion/piloto_nivel3.js <carpeta> <salida.json> 15 2026` → `tools/analisis/nivel3_piloto_2026-10-26.json`.

Son 15 licitaciones y 15 menores cuantías «usables» adjudicadas en 2026, de la base con las reglas corregidas,
con la misma semilla de la sección 2. De cada una se eligió UN documento:
- primero el informe de evaluación;
- si no hay, la resolución de adjudicación;
- si tampoco, el acta.

Dentro del mismo tipo va el último que cargó la entidad. Los procesos sin ninguno de los tres se saltaron:
3 en licitación y 3 en menor cuantía.

Qué documentos salieron:
- **Licitación:** 3 informes, 9 resoluciones y 3 actas.
- **Menor cuantía:** 1 informe y 14 resoluciones.

Los enlaces son los que publica el índice abierto (`dmgg-8hin`). Se probó UNO desde la sesión, el 26-oct-2026 a
las 03:57 UTC: la resolución de CO1.BDOS.10071999 bajó como PDF (HTTP 200, 1.339.431 bytes). El siguiente pedido,
un minuto después, lo bloqueó el muro de SECOP II («Azure WAF», HTTP 403). Por eso estos 30 los baja una persona.

| # | Modalidad | Proceso | Entidad | Precio base | Documento | Archivo | Enlace |
|---|---|---|---|---|---|---|---|
| 1 | Licitación | CO1.BDOS.9109608 | ALCALDÍA MUNICIPAL DE CHAPARRAL | $33.717.108.487 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION PLACA HUELLA CHAPARRAL.pdf (0,5 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=747848932&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 2 | Licitación | CO1.BDOS.10038295 | ALCALDIA DE MOCOA | $6.300.609.605 | Informe de evaluación | 17. INFORME  DE EVALUACION  FINAL PROCESO LP-001 de 2026.pdf (30,4 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=805430468&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 3 | Licitación | CO1.BDOS.10134286 | MUNICIPIO DE VILLA DE LEYVA// | $2.500.000.000 | Resolución de adjudicación | AJUSTE - RESOLUCION DE ADJUDICACION - LP-AMVL-002-2026.pdf (3,9 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=862157216&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 4 | Licitación | CO1.BDOS.10437199 | AGUAS DE MANIZALES | $1.087.051.250 | Acta | ACTA DE APERTURA LP-04-2026.pdf (0,8 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=832856745&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 5 | Licitación | CO1.BDOS.10531682 | ALCALDIA DE SAN MARTIN  META | $510.400.054 | Acta | ACTA DE AUCIENCIA APERTURA SOBRE 2.pdf (24,7 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=855192498&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 6 | Licitación | CO1.BDOS.9036443 | INVIAS | $92.538.000.000 | Resolución de adjudicación | 3798_RESOLUCION_DE_ADJUDICACION_LICITACIÓN_PÚBLICA_v1 LP-038-2025.pdf (0,5 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=806826061&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 7 | Licitación | CO1.BDOS.10332686 | CORPORACION AUTONOMA REGIONAL DE LA FRON | $4.615.438.058 | Acta | MPA-01-F-03_ACTA_EVALUACION_CALIDAD - FINAL - 25-8-2026.pdf (0,3 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=847671358&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 8 | Licitación | CO1.BDOS.10347154 | MUNICIPIO DE NEIVA | $12.307.831.776 | Resolución de adjudicación | 7. RESOLUCION 164 DE 2026 Adjudicación.pdf (1,8 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=862150519&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 9 | Licitación | CO1.BDOS.10374336 | GOBERNACION DEL DEPARTAMENTO DEL CESAR | $44.575.110.710 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION.pdf (1,6 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=859790872&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 10 | Licitación | CO1.BDOS.10291410 | MUNICIPIO DE YONDO | $2.299.810.414 | Informe de evaluación | INFORME DE EVALUACION.pdf (4,0 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=846841346&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 11 | Licitación | CO1.BDOS.10054238 | HOSPITAL MILITAR CENTRAL | $856.960.000 | Resolución de adjudicación | RESOLUCIÓN DE ADJUDICACIÓN LP-001-2026.pdf (0,8 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=811209159&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 12 | Licitación | CO1.BDOS.9224444 | ALCALDIA DE FLORIDABLANCA | $1.549.491.219 | Resolución de adjudicación | 26- Resolución Adjudicación - FLO-INFRA-LP-010-2025.pdf (0,5 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=761264843&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 13 | Licitación | CO1.BDOS.9139173 | INVIAS | $153.714.557.697 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION LICITACION  PUBLICA 49-2025 V2.pdf (0,4 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=806824777&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 14 | Licitación | CO1.BDOS.10115915 | MUNICIPIO DE ASTREA | $1.869.153.654 | Resolución de adjudicación | Resolucion de adjudicacion LP-N° 001-2026.pdf (0,2 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=828668017&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 15 | Licitación | CO1.BDOS.9052682 | INVIAS | $118.582.489.309 | Informe de evaluación | Informe Evaluacion Oferta Economica LP-DEO-SGI-041-2025.pdf (0,5 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=796876129&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 16 | Menor cuantía | CO1.BDOS.10498331 | AEROCIVIL | $367.500.000 | Resolución de adjudicación | RESOLUCION ADJUDICACION (2).pdf (0,6 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=857664212&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 17 | Menor cuantía | CO1.BDOS.9972021 | MUNICIPIO DE VILLAGÓMEZ* | $355.794.400 | Resolución de adjudicación | Resolucion Adjudicacion samc 04 (2).pdf (0,2 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=765337412&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 18 | Menor cuantía | CO1.BDOS.10750260 | INSTITUTO DE FINANCIAMIENTO PROMOCIÓN Y  | $481.950.635 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION.pdf (0,4 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=874716367&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 19 | Menor cuantía | CO1.BDOS.10434222 | AEROCIVIL | $1.050.855.152 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION 110 PLATO-signed.pdf (1,7 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=838344526&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 20 | Menor cuantía | CO1.BDOS.10380872 | ALCALDÍA MUNICIPAL COTA | $375.960.770 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION.pdf (0,9 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=829320220&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 21 | Menor cuantía | CO1.BDOS.10285684 | AEROCIVIL | $800.000.000 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION PROCESO 26001209 H4 DE 2026.pdf (1,0 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=818282963&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 22 | Menor cuantía | CO1.BDOS.10486764 | AEROCIVIL | $1.000.000.000 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION 114  - SISTEMAS ELECTRICOS TOLU.pdf (1,6 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=845624446&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 23 | Menor cuantía | CO1.BDOS.10631874 | ALCALDIA MUNICIPAL DE BRICEÑO BOYACA | $487.739.534 | Resolución de adjudicación | MB-CO-SAMC-009-2026 Acto Administrativo de Adjudicación.pdf (5,1 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=855852045&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 24 | Menor cuantía | CO1.BDOS.10184721 | ARMADA NACIONAL ESCUELA NAVAL DE CADETES | $600.000.000 | Resolución de adjudicación | RESOLUCIÓN DE ADJUDICACIÓN.pdf (0,4 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=801818764&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 25 | Menor cuantía | CO1.BDOS.10131395 | AEROCIVIL | $1.249.780.060 | Resolución de adjudicación | RESOLUCION ADJUDICACION CERRAMIENTO V.pdf (0,5 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=807569269&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 26 | Menor cuantía | CO1.BDOS.10252244 | ALCALDIA MUNICIPAL FUSAGASUGA | $291.786.944 | Resolución de adjudicación | RESOLUCION DE ADJUDICACION.pdf (0,2 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=811798789&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 27 | Menor cuantía | CO1.BDOS.10251767 | FONDO ROTATORIO DE LA REGISTRADURIA | $578.958.622 | Resolución de adjudicación | ResolucionAdjudicacionObrasAgrupaciónChocó.pdf (0,3 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=811889238&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 28 | Menor cuantía | CO1.BDOS.10116502 | DEPARTAMENTO DE SANTANDER | $1.508.481.923 | Informe de evaluación | 17. Informe de Evaluacion Tecnico Definitivo - Surata.pdf (0,6 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=805827424&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 29 | Menor cuantía | CO1.BDOS.9282110 | ALCALDIA DE FLORIDABLANCA | $305.813.941 | Resolución de adjudicación | 29- Resolución Adjudicación -  FLO-INFRA-SA-MC-007-2025.pdf (0,2 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=743022911&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |
| 30 | Menor cuantía | CO1.BDOS.10481013 | FONDO ROTATORIO DE LA REGISTRADURIA | $411.815.442 | Resolución de adjudicación | ResolucionAdjudicacionSAMC032de2026ObraBuenaV.pdf (0,2 MB) | [PDF](https://community.secop.gov.co/Public/Archive/RetrieveFile/Index?DocumentId=846271333&InCommunity=False&InPaymentGateway=False&DocUniqueIdentifier=) |

**Cómo bajarlos, para que la sesión los lea.** Los nombres de los botones de Chrome y de Google Drive NO están
verificados en esta conversación. Si en su pantalla se llaman distinto, busque el ícono de descarga (una flecha
hacia abajo) y el botón «Nuevo» de Drive.
1. En un computador, abra este documento en GitHub y toque el enlace «PDF» de la fila 1.
   - Debe ver que Chrome descarga un archivo PDF, sin abrir ninguna página.
   - Si en cambio ve una página que dice «Azure WAF» o «403», espere unos minutos y vuelva a tocar el enlace. SECOP
     II frena a quien baja muchos seguidos.
2. Repita el paso 1 con las filas 2 a 30, sin apuro: uno cada minuto basta.
   - Debe quedar con 30 archivos PDF en la carpeta «Descargas».
   - Si algún enlace dice que el archivo no existe, anote el número de la fila y siga con la próxima.
3. Abra en Chrome la carpeta «procesos» de su Drive, donde están las subcarpetas A, C, D, F y H:
   https://drive.google.com/drive/folders/1s56YMZiNlrYZHaMY7i8L_HgFrch6kNHJ (enlace y nombre comprobados desde la
   sesión el 26-oct-2026). Cree dentro una carpeta llamada «Piloto Nivel 3».
   - Debe ver la carpeta nueva, vacía, junto a A, C, D, F y H.
4. Arrastre los 30 PDF de «Descargas» a esa carpeta.
   - Debe ver los 30 archivos dentro.
   - Si alguno no sube, vuelva a arrastrarlo solo.
5. Escriba en la sesión «los 30 están en Drive».
   - La sesión puede ver esa carpeta y leer sus PDF, también los escaneados. Se comprobó el 26-oct-2026 con 2
     resoluciones de adjudicación de las fichas:
     - **A (Pasto, SA-2026-9), con texto:** salió la tabla de 8 oferentes con 6 «HABILITADO» y 2 «RECHAZADO», el
       día de la TRM («06 de octubre de 2026») y el puntaje del ganador (99,667). NO salieron el valor de la TRM
       ni los puntajes de cada oferente, que probablemente eran imágenes [inferencia].
     - **E (Caldas, SAMC-SI-020-2026), escaneada según las fichas:** salieron la TRM con su valor («$3.213,97») y
       el orden de elegibilidad de los 8 hábiles de 9 ofertas, con sus valores.
   - Con los 30, mide por proceso: si trae la lista de hábiles y los puntajes, el método y la TRM aplicados, y si
     con esos hábiles el motor pone primero al ganador real.

**Lo que esta lista ya dice.** En menor cuantía, casi todo lo disponible son resoluciones de adjudicación
(14 de 15). Si las resoluciones no traen los hábiles, el Nivel 3 de menor cuantía dependerá de otros documentos de
SECOP II que no están en el índice abierto [inferencia; la prueba lo confirma o lo tumba].
La prueba lo tumbó en parte: 9 de las 14 resoluciones de menor cuantía traen quién quedó hábil (§ 10).

## 10. Lo que dieron los 30 (26-oct-2026)

**Cómo se midió.** El dueño subió los 30 PDF a la carpeta «Piloto Nivel 3» de su Drive.
- Se leyeron con Google Drive, que devuelve el texto (con OCR en los escaneados que lo traen). Tres lectores de 10
  archivos cada uno anotaron, con una cita literal por dato: las ofertas, quién quedó hábil y por qué no, los
  puntajes, el método, la TRM y el adjudicatario.
- La sesión releyó 5 contra el texto (filas 6, 19, 22, 28 y 30) y coinciden en todo.
- Cada TRM se buscó en la serie oficial de datos.gov.co (32sa-8pi3).
- Lo leído queda en `tools/analisis/nivel3_piloto_lectura_2026-10-26.json`. Todas las cifras de esta sección
  salen de `node tools/analisis/adjudicacion/prueba_captura.js tools/analisis/nivel3_piloto_lectura_2026-10-26.json`,
  que corre el motor de precio de `scripts/base_obra/metodos.js` sobre los hábiles leídos.

**Qué traen los documentos.**
- **Quién quedó hábil:** 20 de 30.
  - En 14 lo dicen explícito.
  - En 6 se deduce: la tabla de puntaje, el puntaje mayor que 0, o «solo X subsanó».
  - Corponor es parcial: el acta es de antes de abrir el precio.
  - Los 9 restantes no lo traen.
- **Puntaje del precio de todos los hábiles:** 11, más Cesar a medias por el OCR. Otros 3 traen solo el total y 4,
  solo el del ganador.
- **Método o TRM:** 14.
  - Las 13 TRM casan con la serie oficial: 11 traen el valor y 2 solo los centavos.
  - Donde el documento dice método y TRM (11 casos), 10 casan con la tabla de los documentos tipo. Cota no: dice
    «media aritmética» con centavos 11.
- **Valores de las ofertas:** 80 de 82 casan al peso con `wi7w-2nvm`. Las 2 diferencias son de Suratá, de 27 y
  4.197 pesos.
- Los adjudicatarios y sus valores casan con `p6dx-8zbt` en todos los que lo traen. Hay variantes de nombre:
  «AZNE SAS» por «A&N INGENIERÍA», y «PTL» frente a «MGN» dentro de la misma resolución de Plato.

**Por qué faltan datos.**
- En 9 documentos al menos una tabla no sale en el texto, probablemente porque la entidad la pegó como imagen:
  filas 2, 11, 15, 16, 17, 19, 21, 22 y 25. Mocoa (fila 2) son 113 páginas sin texto. Las cinco resoluciones de
  Aerocivil tienen al menos una tabla así; en tres (16, 21 y 25) ni siquiera sale la de quién quedó hábil.
- En 3 escaneos el OCR deja cifras dudosas: filas 9, 14 y 26.
- Dos documentos no eran los que servían: el acta de apertura de Aguas de Manizales y un formulario de Yondó sin
  nombres.
- La sección 9 suponía que las resoluciones de menor cuantía quizá no traerían quién quedó hábil. La prueba lo
  tumba en parte: 9 de las 14 lo traen.

**La prueba de la captura (§ 6.1).** Se hizo en los 9 procesos con 2 o más hábiles y un método que dice el
documento o que sale de su TRM. **El motor pone primero al ganador real en 6 de 9**: 5 de 6 en licitación y 1 de 3
en menor cuantía.
- Donde el documento publica los puntajes, el motor los reproduce:
  - Villa de Leyva: 38 de 38 al séptimo decimal.
  - Hospital Militar: 13 de 13.
  - Suratá: 3 de 3 a dos decimales.
- **Cesar y Suratá:** el precio se calcula bien, pero el ganador lo decidieron los puntos distintos del precio.
  - En Cesar, la ganadora quedó cuarta de 4 en precio.
  - En Suratá, quedó tercera de 3. Los otros dos perdieron 20 puntos (criterios ambientales y sociales, Formatos
    14A y 14B), y la ganadora perdió 20 en servicios nacionales.
  - Es el mismo hecho de Pasto en las fichas, donde la oferta más baja perdió 20 puntos por el Formato 14.
- **Plato:** con los 42 que cumplen, el motor da a otro. Sin CSJ GROUP, que ofreció el 81,9 % del presupuesto, da
  al ganador real. La tabla de ponderables no sale en el texto, así que que CSJ quedara fuera es una inferencia sin
  confirmar.
  - **Corregido el mismo día (§ 11): la inferencia era falsa.** Leída la tabla de ponderación de la imagen, CSJ GROUP
    sí está entre los hábiles. La lista que estaba mal era la de la tabla de habilitación de la misma resolución. Con
    los 42 de la tabla de ponderación, el motor acierta.

**Cuando el documento no dice el método.**
- **Se deduce de los puntajes:**
  - Astrea: menor valor, 4 de 5 exactos; el quinto difiere en un dígito del OCR.
  - Fusagasugá: aritmética baja, 2 de 2.
  - En los dos el motor pone primero al ganador real.
- **Neiva y Escuela Naval:** los que no ganaron casan con la media geométrica. Al ganador la entidad le dio el
  puntaje máximo, aunque la fórmula le da un poco menos. No cambia quién gana.
- **Registraduría:** usa un pliego propio con 79,5 puntos de precio.
  - En Buenaventura la fórmula es media aritmética con castigo doble por encima de la media. Se reproduce exacta y
    no es ninguno de los 4 métodos.
  - En Chocó ninguna fórmula probada casa.

**La TRM que nombra la entidad.** En 2 casos (Hospital Militar y Floridablanca LP), «la TRM del día X» es el
certificado expedido ese día, que rige el día siguiente.
- En Floridablanca eso cambió el método: la TRM vigente el 20 de febrero (3.695,72) daba aritmética baja, y la que
  usó (3.691,34) dio geométrica.
- El motor debe tomar la TRM que nombra el documento, no recalcularla por fecha.

**Qué cambia en este diseño.**
- **§ 6.1:** si el motor no reproduce al ganador, no siempre es que la lectura esté mal. En 2 de 9 lo decidieron
  los puntos distintos del precio.
- **§ 3:** la captura tiene que guardar, por oferta, también el puntaje total y sus componentes, no solo si quedó
  hábil.
- **§ 5:** para dar «de cada 100 veces, gana tantas», el simulador necesita además la frecuencia con que los rivales
  pierden puntos fuera del precio.
- Son 9 procesos: es evidencia, no una estadística.

**Lo que decide el dueño, además de lo de la § 8.**
1. **Cómo leer los documentos en imagen,** que son una tercera parte. Hay dos caminos:
   - Convertirlos con Drive: crea copias en su Drive, así que escribe fuera de la sesión y pide su visto bueno.
   - Un servicio de OCR en producción: la cuota de OCR.space no está verificada (§ 7).
2. **Si la captura incluye los puntos distintos del precio.** Es lo que falta para que la probabilidad sea creíble
   donde esos puntos no los saca todo el mundo.

| # | Entidad | Hábiles | Puntaje del precio | Método o TRM | Motor |
|---|---|---|---|---|---|
| 1 | Chaparral | Deducido: 1, el ganador | Solo el ganador | Geométrica · 3.670,47 | Un solo hábil |
| 2 | Mocoa | Sin dato (113 páginas en imagen) | — | — | — |
| 3 | Villa de Leyva | Deducidos: 38 con puntaje | Los 38 | Mediana · 3.126,08 | Acierta; 38 de 38 puntajes exactos |
| 4 | Aguas de Manizales | Sin dato (acta de apertura) | — | — | — |
| 5 | San Martín (Meta) | 1 de 3 | Sí | Geométrica · 3.099,48 | Un solo hábil |
| 6 | INVIAS 038 | Deducidos: 9 con puntaje | Solo el total | Mediana · centavos 09 | Acierta (valores de wi7w) |
| 7 | Corponor | Parcial: antes del precio | — | — | Sin ganador |
| 8 | Neiva | 4 de 8 | Sí | Geométrica · 3.109,30 | Acierta; 3 de 4 exactos |
| 9 | Gobernación del Cesar | Deducidos: 4 de 13 | Parcial (OCR) | Geométrica · 3.100,45 | Falla: ganó la 4.ª en precio, por otros puntos |
| 10 | Yondó | Sin dato (formulario sin nombres) | — | — | — |
| 11 | Hospital Militar | 13 de 16 | Sí | Aritmética baja · 3.631,57 | Acierta; 13 de 13 exactos |
| 12 | Floridablanca LP-010 | Sin dato | Solo el ganador | Geométrica · 3.691,34 | — |
| 13 | INVIAS 049 | Deducidos: 9 con puntaje | Solo el total | Mediana · centavos 00 | Acierta (valores de wi7w) |
| 14 | Astrea | 6 de 8 (1 con la oferta económica «no válida») | Sí (OCR) | No dice | Menor valor: 4 de 5 exactos, acierta |
| 15 | INVIAS 041 | 12 de 21 | No | No dice | Solo la aritmética baja acierta |
| 16 | Aerocivil Rionegro | Sin dato (tabla en imagen) | — | — | — |
| 17 | Villagómez | Sin dato (tabla en imagen) | — | — | — |
| 18 | INFI-Manizales | 2 de 4 | Solo el total | No dice | Los 4 métodos dan el mismo |
| 19 | Aerocivil Plato | 42 de 49 | No (imagen) | 3.204,51 → aritmética baja | Falla con 42 de la habilitación; con la tabla de ponderación acierta (§ 11) |
| 20 | Cota | 1 de 3 | Sí | «Media aritmética» · 3.252,11 | Un solo hábil |
| 21 | Aerocivil H4 | Sin dato (tablas en imagen) | — | — | — |
| 22 | Aerocivil Tolú | 34 de 38 | No (imagen) | 3.053,48 → geométrica | Acierta (valores de wi7w) |
| 23 | Briceño | Sin dato (solo el ganador) | Solo el ganador | No dice | — |
| 24 | Escuela Naval | 3 de 3 | Sí | No dice | Geométrica: 2 de 3 exactos, acierta |
| 25 | Aerocivil Cerramiento | Sin dato (tablas en imagen) | Solo el ganador | Menor valor, sin TRM | — |
| 26 | Fusagasugá | 4 de 8 | Sí (OCR) | No dice | Aritmética baja: 2 de 2, acierta |
| 27 | Registraduría (Chocó) | 3 de 5 | Sí | No dice | Ninguna fórmula casa |
| 28 | Gobernación de Santander (Suratá) | 3 de 4 | Sí | Mediana · 3.678,15 | Falla: ganó la 3.ª en precio, por otros puntos |
| 29 | Floridablanca SA-MC-007 | Deducido: 1 | No | No dice | Un solo hábil |
| 30 | Registraduría (Buenaventura) | 4 de 5 | Sí | Fórmula propia | La fórmula propia casa exacta y acierta |

## 11. Las tablas en imagen, los puntos fuera del precio y la captura en la aplicación (26-oct-2026)

El dueño pidió hacer las tres decisiones de la § 10 en el orden ideal y construir lo necesario. El orden fue:
1. Leer las tablas en imagen del piloto: da más casos y responde lo de Plato.
2. Medir los puntos fuera del precio: fija qué guarda cada oferta.
3. Construir la captura en la aplicación.

**1 · Las tablas en imagen.** Se bajaron los PDF de su Drive y se extrajeron las imágenes de cada página. Las tablas
se leyeron de la imagen, en la sesión y con dos lectores, sin copiar nada al Drive del dueño. Cada transcripción se
comprobó de tres formas:
- el motor reproduce sus puntajes de precio;
- los valores casan al peso con `wi7w-2nvm`;
- la suma de cada fila da su total.

Lo que dio cada documento:
- **Aerocivil Plato (19):** 42 de 42 puntajes con la media aritmética baja y el ganador real primero. **Corrige la
  § 10:**
  - CSJ GROUP sí estaba entre los hábiles.
  - La tabla de ponderación no trae al consorcio TERMINAL Y TORRE PLATO SB, que la de habilitación daba por CUMPLE.
  - Trae a AERO PLATO 1357, que aquella daba por RECHAZADO.
  - Manda la tabla que puntúa.
- **Aerocivil Tolú (22):** 34 de 34 con la media geométrica, que es la que dice su tabla, y el ganador real primero.
- **Aerocivil H4 (21):** 29 de 29 con la media geométrica, con «TRM 25 de junio $ 3,428.32» (oficial ese día), y el
  ganador real primero.
- **Aerocivil Rionegro (16):** 34 de 34 con la mediana (la resolución no nombra el método), y el ganador real primero.
- **Aerocivil Cerramiento (25):** 47 de 47 con la media aritmética baja, y el ganador real primero.
  - La resolución dice «método de menor valor»: el documento se contradice.
  - 20 de las 67 ofertas recibidas no están en la tabla final, y el documento no dice por qué.
- **Hospital Militar (11):** las imágenes confirman los valores del sobre económico y el certificado de la TRM
  («Generado el 27 de mayo de 2026», fecha «28/05/2026», «$3,631.57»).
- **INVIAS 041 (15):** sus dos imágenes son las fórmulas del valor mínimo aceptable, sin cifras.
- **Mocoa (2):** no se pudo bajar. Drive respondió «File too large for download, over limit of 10 MB».

Las cifras, de `prueba_captura.js` sobre `tools/analisis/nivel3_piloto_lectura_2026-10-26.json`:
- **Quién quedó hábil:** 23 de 30 documentos (17 explícito y 6 deducido). Corponor es parcial y 6 no lo traen.
- **Puntaje del precio de todos los hábiles:** 16, más Cesar a medias.
- **Método o TRM:** 15. Las 14 TRM casan con la serie oficial, y donde hay método y TRM, 13 de 14 casan con la tabla
  de los documentos tipo; Cota no.
- **Valores leídos:** 259 de 268 casan al peso con `wi7w-2nvm`. Las 9 diferencias son 7 «correcciones aritméticas» de
  Cerramiento y 2 de Suratá.
- **La prueba de la captura (§ 6.1):** el motor pone primero al ganador real en **8 de 10**. Los 2 que fallan, Cesar y
  Suratá, los decidieron los puntos fuera del precio.
- **Sin método escrito:** en Rionegro, Cerramiento y Fusagasugá el método se deduce exacto de los puntajes.

**2 · Los puntos fuera del precio.** Se midieron en 10 procesos con el puntaje de precio y el total de todos los hábiles.
- En 9 de los 10, no todos sacaron los mismos puntos fuera del precio.
- Perdieron puntos 30 de 213 ofertas hábiles: «mujeres» 12, «industria nacional» 10, «Mipyme» 5 y «calidad» 1 (por
  criterio, donde la tabla trae el desglose).
- La de mejor puntaje de precio perdió puntos en 1 proceso, Suratá, y eso le quitó el contrato. En Cesar pasó lo
  mismo, pero el OCR no deja ver el desglose completo.
- Por eso la captura guarda, de cada oferta, el puntaje de precio, el total y los puntos por criterio, cada uno con su
  cita.

**3 · La captura, en la aplicación.**
- **Dónde corre:**
  - El navegador del dueño baja y lee el documento por la misma vía de Mis procesos: `op=descargar`, pdf.js y el OCR,
    este solo en las páginas que pintan una imagen (`__pliegoLeerPdfMixto`).
  - Con más páginas con imagen que cupo (30), el OCR va primero a las de menos texto: los logos hacen que toda página
    pinte una imagen.
  - Guarda el texto en `op=evaluacion`, un `op` nuevo del router `pliego`.
  - Cada madrugada, una sesión de Claude Code (`/evaluaciones`, tarea programada) lee los textos en cola y devuelve,
    por oferta, el estado, el motivo, los puntajes y los puntos fuera del precio, cada uno con su cita.
  - `lib/evaluacion.js` verifica cada dato contra el texto y guarda solo lo que se sostiene:
    - la cita tiene que estar en el texto y nombrar al oferente;
    - la cifra tiene que estar completa en la cita;
    - un estado necesita una palabra que lo respalde, y una de rechazo gana a un puntaje;
    - una cita de más de 200 caracteres se aparta entera;
    - «ganó sin el mejor puntaje de precio» y los puntos fuera del precio solo cuentan procesos completos: ninguna
      oferta apartada, ninguna sin estado y ninguna página con imagen sin leer.
- **Qué entidades van primero:** las que el dueño abra desde una tarjeta, que son las de los procesos que mira. En cada
  ventana de entidad, el botón lee hasta 5 procesos cerrados desde 2025, que es lo que cubre el índice de datos.gov.co.
- **Qué ve el usuario, en la ventana de la entidad («Lo que dicen sus evaluaciones»):**
  - cuántas ofertas rechazó y por qué;
  - en cuántos procesos ganó una oferta sin el mejor puntaje de precio;
  - en cuántos alguna oferta hábil perdió puntos fuera del precio, y en qué criterio;
  - plegado, el botón para leer más.
  - Todo como «X de N». Lo que no se sabe es «sin dato» y no cuenta.
- **No se toca:** el plan de lectura del pliego, la guía y el dictamen no leen estos documentos.

**Sin verificar:**
- la cuota diaria de OCR.space, anotada como 500 y sin verificar;
- el tiempo que tarda en un teléfono leer una evaluación grande;
- el texto de Mocoa;
- por qué Cerramiento dejó 20 ofertas fuera de su tabla final.

| # | Entidad | Antes (§ 10) | Con las tablas en imagen |
|---|---|---|---|
| 16 | Aerocivil Rionegro | Sin dato | 34 hábiles · mediana, deducida · acierta |
| 19 | Aerocivil Plato | Falla con 42 | 42 hábiles · aritmética baja · acierta |
| 21 | Aerocivil H4 | Sin dato | 29 hábiles · geométrica · acierta |
| 22 | Aerocivil Tolú | Acierta (valores de wi7w) | 34 hábiles · geométrica · 34 de 34 puntajes exactos |
| 25 | Aerocivil Cerramiento | Sin dato | 47 evaluadas · aritmética baja, aunque la resolución dice menor valor · acierta |
