# Fase 2 · Eje 9 (Oferta económica y APU, segunda vuelta) · lente académica

> Para: sesión · Estado: notas del lector (19-oct-2026) · Sustituido por: —

Agente `lector fase2 eje9-academica`. Fichas escritas: **F-1121 a F-1180** (60, rango lleno) en
`research/fichas/`. Reanudación: al empezar no había fichas en el rango (la corrida anterior se cortó antes de
escribir); se empezó en el primer id libre, F-1121.

- **Inicio:** 2026-10-19 18:42:52 UTC
- **Fin:** 2026-10-19 19:11:49 UTC
- Lectura previa: `AGENTES_INSTRUCCIONES.md`, `TAXONOMIA.md`, `ESQUEMA_FICHA.json`, `FASE2_EJES.md` (cabecera y eje 9),
  más las tres fichas del piloto que había que rehacer (F-067, F-068, F-076). No se leyó nada más del repositorio.
- Validación: las 60 pasan `JSON.parse`, traen los campos obligatorios y los valores permitidos del esquema, ninguna
  cita pasa de 300 caracteres, ninguna contiene la grafía antigua de la marca, y cada `cita_textual` se comprobó por
  programa como subcadena (espacios normalizados) del texto descargado, con la página del PDF calculada sobre el
  mismo texto (`pagina_pdf`; las citas que cruzan página se marcaron). Ninguna ficha lleva `verificacion_adversaria`.

## 1. Fuentes intentadas y abiertas, por tipo

| Tipo (taxonomía) | Intentadas | Abiertas con texto | Fichas |
|---|---|---|---|
| ley | 2 | 2 (Estatuto Tributario y Ley 80, compilaciones de alcaldiabogota con notas de vigencia) | 2 |
| decreto | 9 | 9 (Decretos 1082/2015 art. 2.2.1.1.2.2.4, 399/2021, 1860/2021, 0997/2026, 287/2026, 579/2021, 680/2021, 2474/2008 y 1510/2013 en la relatoría; el 0997, 287, 579 y 680 y el 2474 y el 1510 solo para cotejar reformas o la cadena de derogatorias) | 3 |
| doc_tipo | 16 | 11 (documento base v4 de licitación de obra de transporte con su Res. 465 de 2024; control de versiones; documento base de licitación de obra social v2; interventoría de transporte v3; consultoría de transporte v2; documentos base de interventoría y de consultoría sociales; v3 de obra de transporte; Res. 161 de 2021 en el Gestor Normativo de la CRA; memoria de la Res. 161; listado maestro) | 29 |
| cce_guia | 2 | 2 (guía de ofertas artificialmente bajas, versión del 16-dic-2024 y la de 2018) | 2 |
| cce_concepto | 5 | 5 (C-1411, C-1327, C-1245, C-1241, C-1120 de 2026) | 4 |
| control | 5 | 1 (oficio DIAN 4761 de 2019) | 1 |
| academia | 15 | 15 (11 con ficha: Arias 2015, Zorro 2025, Rojas y Bohórquez 2010, Contreras 2017, Ulloa 2017, Tenza 2021, Mendoza 2022, Gómez 2025, y las tres rehechas Orozco 2015, Nieto 2021, Matallana 2009; 4 abiertas sin ficha, ver abajo) | 19 |
| juris · internacional · gremio · practica · dato | 0 | 0 | 0 |

Buscadores usados (solo GET): API de medios y de páginas de Colombia Compra, API de conceptos y de normativa de la
relatoría, API DSpace de los repositorios de Andes, Militar y Nacional (bffrepositorio), y WebSearch (4 consultas;
devolvieron conceptos de la relatoría, que se abrieron por su página, y ninguna fuente académica nueva).

Abiertas y sin ficha (academia): Rojas Rueda 2019 (pliegos tipo y colusión: teoría, no toca precio), Díaz Jiménez 2020
(vías primarias y competencia: segmentación de proponentes), Sánchez Martínez 2021 (prácticas restrictivas, descargada,
no leída a fondo) y una copia de Márquez 2016 que el piloto ya había leído (F-071).

## 2. No abiertas, con el error literal

| Fuente | URL intentada | Error literal |
|---|---|---|
| Resolución 539 de 2025 (adopta la v2 de licitación de obra social) | https://www.colombiacompra.gov.co/documentos-tipo/descarga/29545/ | HTTP 200, PDF de 14 páginas; `pdftotext` devolvió 0 líneas: PDF escaneado sin capa de texto. No se pasó por OCR |
| Resolución 725 de 2024 (adopta la v3 de interventoría de transporte) | https://www.colombiacompra.gov.co/documentos-tipo/descarga/29413/ | HTTP 200, PDF de 6 páginas; `pdftotext` devolvió 0 líneas (escaneado) |
| Resolución 726 de 2024 (adopta la v2 de consultoría de transporte) | https://www.colombiacompra.gov.co/documentos-tipo/descarga/29818/ | HTTP 200, PDF de 6 páginas; `pdftotext` devolvió 0 líneas (escaneado) |
| Estatuto Tributario en el normograma de la DIAN (cuatro rutas probadas) | https://normograma.dian.gov.co/dian/compilacion/docs/estatuto_tributario_pr016.htm (y pr017, pr018, pr019) | HTTP 404, cuerpo de 1245 bytes |
| Resolución 161 de 2021 en Ámbito Jurídico | https://ambitojuridico.com/sites/default/files/2021-06/res-161-21%28colombiacompra%29.pdf | HTTP 403, cuerpo de 919 bytes (se usó el texto del Gestor Normativo de la CRA y la memoria de Colombia Compra) |
| Repositorio de la UPB (API DSpace) | https://repositorio.upb.edu.co/server/api/discover/search/objects?query=… (4 consultas) | `curl: (56) CONNECT tunnel failed, response 502` |
| Listados «Documentos tipo vigentes» y «repositorio» de Colombia Compra | https://www.colombiacompra.gov.co/documentos-tipo/vigentes/ | HTTP 200 pero sin los enlaces (armados por JavaScript); se llegó a los archivos por las páginas de nodo `?sector=…&nodo=…`, que sí responden |

No se intentó en esta pasada: Redalyc, Dialnet, SciELO, EAFIT, Externado, Javeriana, La Sabana (los muros del piloto no se
reintentaron; el artículo de Zambrano et al. 2018 sobre fórmulas de selección en el Valle del Cauca sigue sin abrir).

## 3. Respuestas a lo que el encargo pedía (lista cerrada)

1. **Documento base v4 de licitación de obra de transporte** (aviso desde el 3-feb-2025, Res. 465 de 2024) y el de **infraestructura
   social v2** (desde el 16-feb-2026): leídos los numerales de oferta económica. Método de puntaje: cuatro
   (mediana con valor absoluto, media geométrica, media aritmética baja, menor valor) según los centavos de la TRM
   (F-1121); TRM por centavos y por hora de pronunciamiento (F-1122, F-1123); siete decimales y puntajes negativos a cero
   (F-1124); corrección aritmética y ajuste al peso (F-1125, F-1126); causales de rechazo económicas (F-1128 a F-1132);
   puntaje 48,5 (F-1135). Para social v2 se leyeron los mismos numerales (F-1140, F-1141). **Las resoluciones 539/2025, 725/2024 y
   726/2024 son PDF escaneados y no se leyeron.**
2. **IVA sobre la utilidad en obra:** la premisa del encargo era falsa. El art. 462-1 del Estatuto Tributario (texto con Leyes
   1607/2012, 1819/2016 y 2277/2022) cubre aseo y cafetería, vigilancia, servicios temporales y cooperativas de trabajo
   asociado, no obra (F-1151). La regla de obra viene del art. 3 del Decreto 1372 de 1992 según la DIAN (F-1153, `[sin verificar]`, el
   decreto no se abrió) y la describe un artículo de 2010 (F-1168).
3. **Precio de ítems no previstos** (C-1411, C-1327, C-1245, C-1241, C-1120): ninguno fija una fórmula. C-1245 (y C-1241, que
   es el mismo extracto) dice que, para ítems sin precio pactado, conviene un análisis de mercado con criterios objetivos
   (F-1154); C-1411 que el reajuste no consume el tope de 50% (F-1155); C-1120 que la variación de cantidades en precios
   unitarios es riesgo del contratista (F-1156); C-1327 es sobre registro presupuestal (F-1152). Una cláusula real de
   contrato con la regla de pricing (mismo AIU, 3 días hábiles) está en F-1166.
4. **Topes por precio unitario frente al oficial:** causal opcional, solo para los ítems que la entidad nombre, con el AIU
   incluido en el valor unitario oficial (F-1128, F-1141); más no ofrecer o ofrecer en cero (F-1129) y exceder el presupuesto
   oficial (F-1130). La academia no aporta un tope numérico; una propuesta de piso de 80% en mínima cuantía (F-1172) no es regla.
5. **Concurso de méritos (texto vigente) y mínima cuantía:** art. 2.2.1.2.1.3.2 en el texto del Decreto 399 de 2021: solo criterios
   de experiencia y formación, informe de 3 días y adjudicación al mayor puntaje, sin regla sobre la oferta económica
   (F-1149); los documentos tipo de interventoría y consultoría de transporte no puntúan precio, exigen oferta acorde con el
   presupuesto oficial y traen la causal del factor multiplicador (F-1142 a F-1147). Mínima cuantía (Decreto 1860 de 2021): se acepta
   la oferta de menor precio que cumpla (F-1150).
6. **AIU en concurso de méritos y en interventoría:** no hay AIU, hay factor multiplicador (F-1164, F-1165, F-1144, F-1146). En obra
   el AIU tiene tope fijado por la entidad (F-1132).
7. **Rehacer (D13):** F-067 → **F-1157** (cifra recalculada: 86,7%, no 78,3%); F-068 → **F-1158** (con F-1159 y F-1160 como cotejo);
   F-076 → **F-1161**. No se añadió `rehecha_por` en las viejas porque el encargo prohíbe modificar otros archivos: la
   sesión debe agregarlo (F-067 → F-1157, F-068 → F-1158, F-076 → F-1161). **F-046, F-048, F-049 y F-054 son del lente institucional
   y no se rehicieron aquí.**

## 4. Problemas candidatos (vistos desde el contratista)

| Título | Etapa | Decisión | Tipo de contrato | Fichas | Consecuencia en plata (si la fuente la da) | Señal observable en SECOP II |
|---|---|---|---|---|---|---|
| El puntaje económico depende de un sorteo (centavos de la TRM, hora de la audiencia, festivo en EE. UU.) entre cuatro métodos; ofertar «al promedio» o «al menor valor» es una apuesta | E2 | D2 | obra | F-1121, F-1122, F-1123, F-1124, F-1140, F-1177, F-1171 | En el Invías 2008-2013 el cambio de subasta inversa a método aleatorio redujo mucho el descuento frente al presupuesto oficial sin bajar las adiciones (F-1177, sin cifra) | No detectable en los datos agregados; sí en el acta de audiencia y el informe de evaluación del proceso (documento, no dataset) |
| La «media aritmética alta» ya no puntúa precio en obra (v3 y v4 no la traen); en interventoría sigue viva pero para puntuar la experiencia; una atribución académica a la Res. 161 de 2021 no está respaldada por su texto | E2 | D2 | obra, interventoria | F-1158, F-1159, F-1160, F-1121, F-1142 | Un simulador que la use reparte mal las probabilidades de ganar | No detectable |
| Rechazo por un solo ítem: tope opcional por precio unitario (el oficial incluye AIU), AIU sobre el total de la entidad, precio unitario en cero, ítems alterados | E2 | D3 | obra | F-1128, F-1129, F-1131, F-1132, F-1141 | Rechazo de la oferta completa | No detectable con datos abiertos: exige el Formulario 1 y la oferta del proceso |
| La corrección aritmética puede dejar una oferta que cabía en el techo por encima del presupuesto oficial, y entonces se rechaza; el ajuste al peso es la única otra corrección | E2 | D3 | obra, interventoria | F-1125, F-1126, F-1130, F-1143 | Rechazo si el valor corregido supera el presupuesto (en interventoría es subsanable) | No detectable |
| Precio artificialmente bajo sin umbral legal: el rechazo depende del criterio de la entidad; la guía usa 20% por debajo del costo estimado (menos de 5 ofertas) o mediana y desviación (5 o más); una tesis propone un piso de 80% en mínima cuantía | E2 | D3 | todos | F-1127, F-1148, F-1162, F-1163, F-1172, F-1161, F-1145, F-1146 | Rechazo con riesgo de desequilibrio alegado después si se adjudica bajo el punto de no pérdida (F-1161) | Parcial: valor ofertado frente al presupuesto en los datos de adjudicación; la solicitud de aclaración no está en los datos abiertos |
| Los APU publicados son de referencia, pero el adjudicatario debe entregar los suyos y estos no pueden diferir de los precios unitarios de la oferta; el error u omisión es de él | E1/E3 | D2/D4 | obra | F-1133, F-1134 | Sin reconocimiento adicional | No detectable |
| Ítems no previstos: sin fórmula legal, precio por análisis (mismo AIU, plazo de 3 días hábiles para el APU), tope de 50% en adiciones que cuenta mayores cantidades e ítems nuevos pero no el reajuste pactado | E4 | D2/D4 | obra | F-1154, F-1155, F-1156, F-1166, F-1167, F-1180, F-1152 | Multa considerada de $911.040.000 por APU de ítems adicionales entregados tarde (F-1167); preconstrucción que costó $618.227.586 y se pagó $345.588.547, con $272.639.039 asumidos por el contratista (F-1178) | Parcial: valor y plazo adicionados por contrato en los datos de ejecución; no el precio de cada ítem |
| Estudios y diseños donados, cedidos o de origen desconocido: más variación de alcance en la ejecución (48 de 54 contratos con variación); la tesis lo lee como causalidad pero la comparación mezcla grupos de tamaño 63 y 10 | E1/E4 | D4 | obra | F-1175, F-1176 | 5 contratos con sobrecostos de 73 (4 con estudios donados) | No detectable |
| IVA de una oferta de obra: el art. 462-1 del ET no es la norma; la base es la utilidad (Decreto 1372 de 1992 según la DIAN) solo en construcción propiamente dicha | E2 | D2 | obra | F-1151, F-1153, F-1168 | Cambia la base gravable del IVA que se carga a la oferta | No detectable |
| En concurso de méritos el precio no puntúa; la oferta debe estar acorde con el presupuesto; el valor se construye con factor multiplicador (no AIU) y olvidar aplicarlo es causal de rechazo | E2 | D2/D3 | consultoria, interventoria | F-1149, F-1142, F-1143, F-1144, F-1146, F-1147, F-1164, F-1165, F-1173 | Factores de 1,92 a 2,32 en una simulación de 2015; entidades usan 2,2 a 2,6 (F-1165) | Parcial: valor adjudicado frente al presupuesto oficial |
| Reajuste pactado y riesgo de cantidades en precios unitarios: el reajuste no consume el tope de adición y la variación de cantidades es álea normal del contratista | E4 | D4 | obra | F-1155, F-1156, F-1179 | Orden de magnitud en un contrato vial: ajustes esperados de $3.832 millones (2025) a $19.564 millones (2029) (F-1179, salida de un modelo) | No detectable |
| Una cifra de la literatura sobre adiciones no cuadra con sus propios datos: «78,3% más» es 86,7% | E4 | D4 | todos | F-1157 | +86,7% agregado en 96 licitaciones (muestra 2010-2014) | No detectable |

## 5. Temas cubiertos y sin cubrir

**Cubiertos** (los seis temas de la lista): (1) documento base v4 de transporte con sus métodos, TRM, corrección aritmética y causales
económicas, y el de social v2 en los mismos numerales; (2) IVA sobre la utilidad en obra, con la premisa corregida; (3) las cinco consultas
de 2026; (4) topes por precio unitario; (5) concurso de méritos con el texto vigente del Decreto 399 de 2021 y mínima cuantía con el
Decreto 1860 de 2021; (6) AIU en concurso de méritos e interventoría; y las tres fichas del lente académico rehechas.

**Sin cubrir o a medias:**
- Resoluciones 539/2025, 725/2024 y 726/2024 (escaneadas); la fecha de entrada en vigencia de social v2 sale de la página de Colombia Compra.
- Formulario 1 (hojas de Excel) de los documentos tipo: las notas de la propuesta económica por precios unitarios no se abrieron.
- Documentos tipo de selección abreviada y de mínima cuantía de transporte y de infraestructura social (numeral de oferta económica): no leídos.
- Ley 2022 de 2020 y arts. 2 y 4 de la Ley 1882 de 2018; Ley 1150 art. 5; Decreto 1625 de 2016 art. 1.3.1.7.9 y doctrina de la DIAN de 2026 sobre AIU y retención.
- Reformas al Decreto 1082: se cotejaron seis decretos modificatorios, no todas las reformas; la vigencia del art. 2.2.1.1.2.2.4 y del art. 2.2.1.2.1.5.2 queda con esa salvedad (dicha en `reformas_cotejadas`).
- Guías de documentos tipo de transporte (GI-04, GI-12) y la memoria justificativa de la Res. 465 (descargada, solo consultada con búsquedas).
- Literatura académica específica sobre corrección aritmética, ofertas en concurso de méritos y topes por ítem: ninguna fuente abierta la trata.
- Fuentes de Redalyc, Dialnet, SciELO y de los repositorios con muro (ver sección 2).
- F-046, F-048, F-049 y F-054 (lente institucional).

## 6. Incidencias y observaciones

- **Premisas del encargo corregidas:** (a) el IVA sobre la utilidad en obra no está en el art. 462-1 del ET (F-1151); (b) la «media aritmética alta» no está
  entre los métodos de obra desde la v3 y la Res. 161 de 2021 no la retiró (F-1158, F-1159, F-1160).
- **Cifras que no cuadraron** (marcadas en `cifra_comprobada`): Orozco 78,3% frente a 86,7% (F-1157); Arias rotula como % lo que son multiplicadores (F-1165);
  Tenza da dos cifras distintas para el mismo costo (nota de F-1174: 185,6 y 187,6 millones) y trunca 78,9% a 78% (F-1178); Mendoza compara proporciones de grupos de tamaño distinto (F-1175, F-1176).
- **Corrección durante la sesión:** el localizador de F-1137 decía «p. 3» y la verificación programada dio la p. 4 del PDF; se corrigió. El título de F-1147 se ajustó para no afirmar que el archivo de dic-2025 sea la v2 vigente.
- El documento base de infraestructura social v2 se leyó en su versión de dic-2025/feb-2026 (descarga/29837); el borrador de abril de 2025 que apareció en la API de medios (zip 19812) solo se listó y no se usó.
- Los textos de la relatoría de Colombia Compra para los conceptos son extractos (descriptores y párrafos), sin la consulta ni la firma; la fecha que muestran es la de la relatoría. C-1241 y C-1245 traen el mismo extracto.
- La relatoría del Decreto 1082 sigue mostrando el texto de 2015 de los artículos del concurso de méritos (anterior al Decreto 399 de 2021); no sirve para la vigencia.
- La carpeta temporal de la sesión estaba compartida con descargas de sesiones anteriores; solo se usaron archivos descargados en esta sesión.
- No se hizo ningún POST, no se modificó ningún archivo fuera de `research/fichas/F-1121…F-1180.json` y este archivo, y no se hizo commit.

## 7. Cómo terminó

**Rango lleno** (60 de 60 ids) y **lista completa** en lo que las fuentes abiertas permitieron: cada uno de los seis temas tiene al menos una ficha o una
declaración de «sin fuente». Se llegó al tope de ids antes de saturar la búsqueda académica: quedaron sin ficha cuatro fuentes abiertas y no se reintentaron los muros del piloto.
