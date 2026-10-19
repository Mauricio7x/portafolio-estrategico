# Muestra SECOP II · Fase 2 · lote 4 (posiciones 30 a 39 del arreglo `muestra`)

> Para: sesión · Estado: referencia · Sustituido por: —

- **Inicio (UTC):** 2026-10-19 18:17:53 (`date -u`).
- **Fin (UTC):** 2026-10-19 18:46 (`date -u` al cierre de la escritura).
- **Procesos del lote:** CO1.REQ.10238675, 10591370, 10324001, 10304141, 10357652, 10104576, 10238859, 10395718, 10242516, 10266309.
- **Corrida anterior:** no había `fase2/<id>.json` de este lote. Sí había descargas y textos de una sesión anterior en el directorio de trabajo; no se usaron: se volvió a descargar todo y se extrajo de nuevo.

## Qué se leyó
- Instrucciones (`AGENTES_INSTRUCCIONES.md` §4 bis), `TAXONOMIA.md`, `ESQUEMA_FICHA.json`, `muestra_secop/METODO.md`, `muestra_fase2.json` (solo posiciones 30 a 39) y el JSON del piloto `CO1.REQ.10276184.json` como referencia de forma. Nada más del repositorio.
- Informes de evaluación: 14 documentos únicos descargados en secuencia, con 4 s de pausa (WAF: 403 en el primer intento en 4 informes, y en 1 pliego; un reintento tras 10 s. 838241355 dio 403 dos veces).
- Índices `dmgg-8hin` (adendas) y `p6dx-8zbt` (campos) para los diez procesos.
- Pliegos definitivos del índice (7 PDF) para los documentos tipo: 747258422 (escaneado, no leído), 761165368, 761768409, 773654061, 779292579, 786247124, 819863367.

## Por proceso (tiempo aproximado, estimado a ojo; no medido)
| Proceso | Informes leídos | Min. aprox. |
|---|---|---|
| CO1.REQ.10238675 | 1 (jurídica, 21 p.), completa en lo leído | 7 |
| CO1.REQ.10591370 | 0 (403 ×2). Pliego leído | 8 |
| CO1.REQ.10324001 | 1 (18 p.), parcial | 9 |
| CO1.REQ.10304141 | 1 escaneado (6 p.), OCR, parcial | 16 |
| CO1.REQ.10357652 | 1 (7 p.), completa | 12 |
| CO1.REQ.10104576 | 1 (11 p.), completa (económico) | 8 |
| CO1.REQ.10238859 | 2 (definitivo 20 p., preliminar 11 p.), parcial | 25 |
| CO1.REQ.10395718 | 1 (494 p.), parcial por secciones | 35 |
| CO1.REQ.10242516 | 2 (definitivo 14 p., preliminar 11 p.), parcial | 15 |
| CO1.REQ.10266309 | 3 (definitivo 5 p., oficio 12 p., preliminar 10 p.), parcial | 15 |

## Escaneados y OCR
- Escaneados con informe: **1** (804788508, 6 p.). OCR con tesseract `spa` a 110 ppp. Las páginas 2 a 5 estaban rotadas 90° y se volvieron a leer rotadas. Las cifras de tabla de ese documento quedan como dudosas.
- Escaneado de pliego (no leído): 1 (747258422, 76 p., 10104576).

## Qué fue difícil de contar
- **Consolidado de 53 filas** (CO1.REQ.10395718, p. 490-494): el texto envuelto cambiaba el orden de las celdas. Se asignó el resultado final por la posición vertical de cada celda (coordenadas `pdftotext -bbox`) y se cuadró con las listas de p. 411-413, 452-453 y 490 (todas subconjunto de los 14 rechazados).
- **Tabla resumen de 161 filas** (CO1.REQ.10238859): las filas con el nombre en dos líneas dejaban los resultados en la línea de arriba. Quedaron 161 filas con seis resultados cada una. La tabla preliminar solo se pudo leer en 56 de 161 filas: no se usa para cifras.
- **Informe de 10242516:** la columna final de «NO HABILITADO» aparece partida en dos líneas («NO» / «HABILITADO»).
- **Informe de 10304141:** un informe adicional de OCR, sin total de proponentes; el índice lo repite seis veces.
- **Informe de 10104576:** es el informe económico; no hay informe de requisitos habilitantes en el índice.

## Incidencias
- 838241355 (Región Metropolitana): informe no abierto. Error literal: HTTP 403, cuerpo HTML «Azure WAF» de 9.313 bytes, en dos intentos. No hay ficha; sus conteos quedan en `null`.
- p6dx: 36 filas idénticas para 10304141 (duplicado); categorías adicionales «No definido» en los diez procesos (dudoso); duración 0 en 10242516; respuestas 0 en 10266309, con 16 proponentes en el informe (dudoso); modalidad de 10357652 dice «licitación pública» y el informe «selección abreviada de menor cuantía».
- 10304141: la suma de los presupuestos por lote leída por OCR no coincide exactamente con `precio_base` (diferencia de 479.670): no se afirma cuál es correcta.
- 10395718: los conteos son de archivos en el índice; hay dos adendas numeradas (8 archivos).
- 10238859: el índice trae «Adenda No3» sin una adenda 2.
- 10266309: el oficio 794009883 es un escrito de un proponente que disputa la calificación del preliminar; no se usa para contar ni se registran sus datos personales.
- Documentos tipo sin verificar: 10238675 y 10266309 (documento base solo en .docx, no abierto); 10304141 (sin pliego definitivo en el índice); 10104576 (pliego escaneado, no leído). 10591370: el pliego abierto no contiene la expresión «documento tipo» (cero coincidencias).

## Fichas y JSON escritos
- Fichas `F-1271` a `F-1279` (eje «muestra», una por proceso con informe abierto). Los ids F-1271 a F-1300 estaban libres al empezar. No hay ficha para CO1.REQ.10591370 porque su informe no se abrió.
- Archivos `fase2/<id>.json` para los diez procesos (sin nombres de personas ni de proponentes; solo conteos, causas y hechos).

## Estado
- Ningún POST hacia fuera. Solo GET. No se modificó ningún otro archivo del repositorio.
- Cierre (UTC): 2026-10-19 18:46.
