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
   - La sesión puede ver esa carpeta (comprobado el 26-oct-2026). Lee los archivos y mide, por proceso: si trae
     la lista de hábiles y los puntajes, si es un escaneo, y el método y la TRM aplicados.
   - Leer los PDF escaneados desde Drive está sin verificar.

**Lo que esta lista ya dice.** En menor cuantía, casi todo lo disponible son resoluciones de adjudicación
(14 de 15). Si las resoluciones no traen los hábiles, el Nivel 3 de menor cuantía dependerá de otros documentos de
SECOP II que no están en el índice abierto [inferencia; la prueba lo confirma o lo tumba].
