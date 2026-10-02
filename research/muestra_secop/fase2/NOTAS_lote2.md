# Muestra SECOP II · Fase 2 · lote 2 (procesos 10-19 de `muestra_fase2.json`) · notas del agente

> Para: sesión · Estado: referencia · Sustituido por: —

- **Inicio (esta corrida):** 2026-10-02 13:42:28 UTC · **Fin:** 2026-10-02 14:12 UTC (reanudación; una corrida anterior se cortó por el límite de la sesión y dejó en el scratchpad los 17 PDF de informes, 10 pliegos, las consultas a `p6dx-8zbt` y `dmgg-8hin` y las imágenes `pdftoppm` de los escaneados; no había ningún JSON de proceso ni ficha escrita en el rango, así que todo lo que hay en `fase2/` para este lote y las fichas F-1211 a F-1220 son de esta corrida).
- **Lector:** agente muestra fase2 lote 2. Fichas F-1211 a F-1220 (una por proceso); F-1221 a F-1240 quedan libres.

## Qué se leyó y qué no

| Proceso | Tipo / modalidad | Informes (págs.) | Escaneado | Lectura | Minutos |
|---|---|---|---|---|---|
| CO1.REQ.10413582 | Consultoría · MC | 1 (4) | sí | completa (imagen) | 5 |
| CO1.REQ.10232386 | Interventoría · MC | 2 (7+7) | no | completa + diff | 7 |
| CO1.REQ.10178516 | Interventoría · CM abierto | 3 (98+49+102) | no | parcial: resúmenes, celdas NO, fichas de los dos NO CUMPLE | 16 |
| CO1.REQ.10962200 | Consultoría · MC | 1 (12) | no | completa | 5 |
| CO1.REQ.10186566 | Consultoría · CM abierto | 1 (8) | no | completa | 6 |
| CO1.REQ.10329233 | Consultoría (dudoso) · MC | 2 (20+19) | no | parcial: veredictos, personal, observaciones | 11 |
| CO1.REQ.10938462 | Obra · SAMC | 1 (9) | sí | completa (imagen) | 6 |
| CO1.REQ.10592103 | Obra · SAMC | 4 ids = 2 archivos (7+7) | sí | completa (imagen) | 7 |
| CO1.REQ.10613815 | Obra · MC | 1 (2) | sí | completa (imagen) | 4 |
| CO1.REQ.10269471 | Obra · SAMC | 1 (5) | sí | completa (imagen) | 5 |

- 17 ids de informe en el índice, 15 archivos distintos (en CO1.REQ.10592103 dos pares con md5 idéntico). 249 páginas con texto nativo leídas con `pdftotext -layout` (dirigidas por grep en los dos procesos largos); 34 páginas escaneadas leídas por imagen.
- **Informes escaneados: 6 de 15 archivos (5 de 10 procesos)**: 792852166, 857971768, 828883330, 828883329, 825665556, 769846115. Los pliegos de esos mismos procesos también son escaneados (4 de 10).
- **OCR:** `tesseract -l spa` no terminó. La primera pasada (46 procesos en paralelo) agotó los 600 s del comando; la segunda (4 en paralelo, en segundo plano) compartía los 4 núcleos con el OCR de otro agente (carga 36-99) y en 15 minutos no cerró una sola página; se detuvo. Las citas de los escaneados son **transcripción de la imagen** (`pdftoppm -r 110 -png`) y lo dicen en el localizador y en `notas`.
- Pliegos: se leyó la primera o las dos primeras páginas de cada uno (texto o imagen) y, en los de texto, un grep por «documento tipo», «versión», «resolución», «CCE-EICP». No se abrió ninguna resolución de adopción de documentos tipo.
- Minutos: son los de esta corrida (lectura, conteo y escritura); la descarga la hizo la corrida anterior (sin registro de tiempo).
- No se leyó nada más del repositorio que lo indicado en el encargo. Ningún POST hacia fuera; las únicas consultas de red de esta corrida fueron las comprobaciones de que los archivos ya estaban descargados (no se repitió ninguna descarga).

## Qué fue difícil de contar

1. **«Habilitados» cuando el índice no trae todos los informes.** En CO1.REQ.10178516 (47 oferentes) el índice solo captura dos informes jurídicos y el primer financiero; el de experiencia y el financiero final no llevan «informe» + «evalua» en el nombre. Quedó `habilitados: null`, `no_habilitados: 2` (mínimo). Un conteo «46» habría sido una cifra creíble y falsa.
2. **Subsanaciones «por ítem» o «por proponente».** Los informes del ICCU no listan requerimientos: se contaron celdas NO del primer informe (18) y se anotó la cuenta por proponentes (11). En Dibulla se contó por ítem marcado SUBSANAR (5). En los MC de un solo informe, `null`: nada que contar no es cero.
3. **Preliminar y definitivo con el mismo nombre de archivo** (ICCU: dos «INFORME FINAL EVALUACION JURIDICA…», uno es el primero por su título interno) y **el mismo archivo con dos ids** (Chigorodó, dos veces). Sin md5 y sin abrir la p.1 se cuentan informes de más.
4. **Informes que transcriben la invitación entera** (Dibulla: 20 páginas para dos oferentes): el veredicto está en una celda y la columna de requisitos es ruido; además una celda contradice el texto (experiencia específica NO CUMPLE cuando el párrafo dice que cumple).
5. **El tipo de contrato del dataset no siempre es el del objeto**: CO1.REQ.10329233 figura «Consultoría» y es un servicio de apoyo a la Secretaría de Hacienda; se marca dudoso en `p6dx_8zbt` y se deja en la muestra porque la selección se hizo por el valor del campo.
6. **«No evaluado» no es «no habilitado»**: en mínima cuantía solo se verifica la oferta de menor precio (Santa María); se añadió `no_evaluados: 1` en ese JSON.

## Hechos que vale la pena mirar desde el contratista (candidatos a problema)

- **Rechazo por aritmética de costos indirectos** (CO1.REQ.10329233, F-1216): la oferta de menor precio cae en el definitivo por no calcular estampillas, retefuente e ICA como el 15,70 % de los costos directos; el preliminar la había dado por buena. E2 · D2 · todos · módulo M-F1 (el formulario que se radica debe calcular los indirectos con la fórmula del estudio del sector). Consecuencia: se adjudicó la oferta igual al presupuesto, $5.637.699 más cara que la rechazada.
- **El REDAM y las medidas correctivas abiertas tumban al único no habilitado de 47** (CO1.REQ.10178516, F-1213). E2 · D3 · todos · M-DICT.
- **Oferta sin un solo documento de experiencia y aun así habilitada tras el traslado** (CO1.REQ.10592103, F-1218): la subsanación cubre incluso la omisión total del Formato 3. E2 · D3 · obra · M-EXP.
- **Pliegos con indicadores calcados del único oferente** (CO1.REQ.10269471, F-1220: seis indicadores exactamente iguales a los del RUP del adjudicatario) y **ofertas al 99,9-100 % del presupuesto con un solo proponente** (7 de los 10 procesos tienen un solo oferente; 5 ofertaron entre el 99,8 % y el 100 %). E1-E2 · D1 · obra/consultoría · M-INT, M-TARJ.
- **La certificación bancaria como «documento obligatorio» subsanable** (CO1.REQ.10186566, F-1215) y **la carta de presentación con naturaleza jurídica errada** (Dibulla) son causas menores que, sin traslado, serían rechazo. E2 · D3 · todos · M-DICT.
- **Omitir contratos en ejecución en el K residual = rechazo** según el pliego de San Andrés (F-1217). E2 · D3 · obra · M-K.
- **`codigo_principal_de_categoria` = UNSPECIFIED en 3 de 4 procesos de obra por SAMC** y `categorias_adicionales` = «No definido» en los 10: el clasificador del dataset no sirve para filtrar obra en estos casos. E0 · D1 · obra · M-ING, M-RUP.

## Incidencias

- OCR no completado (ver arriba): escaneado = true en 5 procesos, citas por transcripción de imagen.
- `research/muestra_secop/muestra_fase2.json` (no se modificó) trae en `nombre_archivo` del informe de CO1.REQ.10186566 la razón social del proponente; en el JSON de proceso se omitió.
- Erratas de los informes anotadas en cada JSON («Ley 1801 de 2026», «$48.790.0000», «DIDIEMBRE», «PREELIMINAR», tres grafías de un mismo número de proceso, valor en letras distinto del valor en cifras).
- p6dx: una fila triplicada (CO1.REQ.10186566) y `respuestas_al_procedimiento` = 4 frente a 1 oferta evaluada en ese mismo proceso; `duracion` = 0 en CO1.REQ.10329233; plazo 5 meses frente a 3 del informe en CO1.REQ.10269471.
- Adendas: 3 de 10 procesos con un archivo «adenda» en el índice (Tibasosa, Santander y APEV, donde la única fila es el pliego que la incorpora).
- Documentos tipo declarados con versión: 2 de 10 (ICCU: CCE-EICP-GI-24 v01 del 28-dic-2023; Chigorodó: menor cuantía de infraestructura social v1 del 21-ago-2025). Probables sin declarar: 2 (San Andrés, Puerto Boyacá). Sin documento tipo: 6 (todos los MC y el CM de avalúos; Pisba conserva corchetes de plantilla de un documento tipo).
