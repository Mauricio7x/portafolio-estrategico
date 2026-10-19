# Notas del agente muestra fase 2, lote 3 (posiciones 20 a 29 del arreglo `muestra`)

- **Inicio (UTC):** 2026-10-19 17:58:42 (`date -u`).
- **Fin (UTC):** véase la última línea de esta nota (se anota con `date -u` al cerrar).
- **Encargo:** diez procesos SECOP II, ids de ficha F-1261 a F-1270, eje «muestra», leida_por «agente muestra fase2 lote 3».

## Qué se leyó y qué no

- Lectura previa, enteros: `research/AGENTES_INSTRUCCIONES.md` (en especial § 4 bis), `research/TAXONOMIA.md`, `research/fichas/ESQUEMA_FICHA.json`, `research/muestra_secop/METODO.md`.
- `research/muestra_secop/muestra_fase2.json`: solo las posiciones 20 a 29 (índices desde 0).
- Forma de referencia: `research/muestra_secop/piloto/CO1.REQ.10276184.json` (solo la estructura; no se usaron sus datos).
- Búsquedas de nombres, sin abrir contenido: listado de nombres en `research/muestra_secop/fase2/` (para comprobar reanudación) y en `research/fichas/` (para encontrar ids libres). No se abrió ningún JSON ni nota de otro lote.
- No se leyó ningún otro archivo del repositorio.

## Reanudación

- Ninguno de los diez procesos tenía JSON en `fase2/`, y los ids F-1261 a F-1270 estaban libres. No hubo nada que reanudar.
- En el scratchpad había carpetas de descargas de una corrida anterior con los mismos ids. Se volvieron a descargar desde cero y no se reutilizó ningún archivo viejo.

## Fuentes intentadas y abiertas

- **Informes de evaluación (SECOP II, GET con agente de navegador):** 16 descargas en secuencia con 4 s de pausa. Son 14 PDF distintos; dos pares son el mismo archivo por md5 (863563373 = 863563367; 863563374 = 863563369). Todas respondieron 200 en el primer intento, salvo un pliego de referencia (848390201) que dio 403 del WAF y 200 tras 10 s. Ningún informe quedó sin abrir.
- **Pliegos de referencia:** un pliego por proceso (10 PDF) para declarar el documento tipo y buscar su versión. Un reintento.
- **datos.gov.co:** `p6dx-8zbt` (10 consultas) y `dmgg-8hin` (10 consultas), GET. Todas respondieron.
- **No abiertas:** ninguna.
- **Carpeta de descargas:** `/tmp/claude-0/-home-user-portafolio-estrategico/ee90ee14-beff-5323-8ba2-f1a6a072aaa7/scratchpad/muestra_f2/` (un subdirectorio por proceso; PDF, texto y OCR).

## Escaneados

- Un informe escaneado de catorce: `858895367` (proceso CO1.REQ.10986606, nueve páginas). Se pasó con `pdftoppm -r 110` y `tesseract -l spa`. Las cifras y las columnas clave se verificaron en imagen (páginas 1, 2 y 9). Un valor se leyó mal en el OCR («563.995.670») y la imagen lo corrige a «63.995.670», igual que el texto en palabras del mismo párrafo.
- Los demás informes tienen capa de texto nativa.

## Minutos por proceso (estimación de la sesión; no se cronometró cada proceso)

| Posición | Proceso | Min. aprox. |
|---|---|---|
| 20 | CO1.REQ.10796061 | 1 |
| 21 | CO1.REQ.10469607 | 2 |
| 22 | CO1.REQ.10076052 | 3 |
| 23 | CO1.REQ.10986606 | 2 |
| 24 | CO1.REQ.11027623 | 1 |
| 25 | CO1.REQ.10877179 | 1 |
| 26 | CO1.REQ.10715584 | 1 |
| 27 | CO1.REQ.10269664 | 2 |
| 28 | CO1.REQ.10957953 | 1 |
| 29 | CO1.REQ.10244553 | 2 |

## Qué fue difícil de contar

1. **CO1.REQ.10244553 (73 proponentes, concurso de interventoría).** El PDF es un informe de traslado; las tablas de jurídica y experiencia tienen marcas CUMPLE/NO CUMPLE y las causas están en anexos que no vienen en el archivo. Los 21 «no habilitados» son provisionales; los 2 rechazos (literales H y A del numeral 1.15) no se transcriben.
2. **CO1.REQ.10076052 (ICCU, tres informes).** Los informes no coinciden: el jurídico rechaza a dos proponentes que el financiero marca CUMPLE, y el técnico asigna puntaje a uno de los rechazados. Las subsanaciones son sellos de texto; no hay oficio de requerimiento.
3. **CO1.REQ.10269664 (Cali, cinco ofertas).** Las causas están repartidas en 26 páginas, y el preliminar y el final difieren. La unión temporal tiene dos causas (conflicto de interés y requisitos técnicos) tomadas de las pp. 5-6.
4. **CO1.REQ.10986606 (Puerto Asís, escaneado).** El texto dice «las dos propuestas», pero la lista de ofertas y el resumen muestran una sola.
5. **CO1.REQ.10469607 (Peque).** La tabla de capacidad financiera marca NO CUMPLE en endeudamiento para una empresa que el propio cálculo declara cumplida (0,166 frente a 0,70).

## Incidencias y hallazgos para el dueño (sin nombres)

- **CO1.REQ.11027623 (Zipaquirá):** la oferta del informe jurídico es 310.921.130,66; el pliego fija el presupuesto oficial en 260.000.000 (p. 36). La oferta supera el presupuesto en cerca de 19,6 % y el informe recomienda adjudicar sin mencionarlo. No se leyó acta de cierre ni oferta; sin verificar la causa.
- **p6dx (datos.gov.co):** `categorias_adicionales` es «No definido» en los diez procesos, y `codigo_principal_de_categoria` es UNSPECIFIED en siete. Se marcan como dudosos (sistemático en el dataset, no de un proceso).
- **Versiones de documento tipo:** ningún pliego ni documento tipo declara una versión identificable. En dos casos el pliego cita una resolución para un artículo concreto (Peque: Resolución 248 de 2020, art. 4, agua potable; Puerto Rico: Resolución 540 de 2025, bienes adicionales), sin relación con la versión del documento tipo. En otros casos el pliego remite a «la resolución que adopta los documentos tipo» sin número. El campo queda en null.
- **Alcance del documento tipo en Peque:** el objeto es mejoramiento de vivienda y el pliego limita los documentos tipo a agua potable y saneamiento básico; sin resolver.
- **Cali (CO1.REQ.10269664):** p6dx trae seis filas idénticas y duracion 0; el índice trae dos adendas duplicadas (ADENDA No. 1).
- **ICCU (CO1.REQ.10076052):** las adendas del índice son la No. 3 con cuatro archivos; no constan las adendas 1 y 2.

## Entregables del lote

- JSON de proceso (diez): `research/muestra_secop/fase2/CO1.REQ.10796061.json`, `CO1.REQ.10469607.json`, `CO1.REQ.10076052.json`, `CO1.REQ.10986606.json`, `CO1.REQ.11027623.json`, `CO1.REQ.10877179.json`, `CO1.REQ.10715584.json`, `CO1.REQ.10269664.json`, `CO1.REQ.10957953.json`, `CO1.REQ.10244553.json`.
- Fichas tipo dato (diez): `research/fichas/F-1261.json` a `F-1270.json`.
- Esta nota: `research/muestra_secop/fase2/NOTAS_lote3.md`.
- Ningún otro archivo del repositorio fue modificado. No hubo POST hacia fuera; todas las peticiones fueron GET.

## Cierre

- Fin (UTC): véase la línea siguiente.
- **Fin (UTC):** 2026-10-19T18:16:53Z (`date -u`).
