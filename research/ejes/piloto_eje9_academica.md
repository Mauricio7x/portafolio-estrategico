# Piloto · eje 9 (Oferta económica y APU) · lente académica

> Para: sesión · Estado: notas del piloto (2-oct-2026) · Sustituido por: —

Agente lector `lector eje9-academica`. Fichas escritas: **F-061 a F-080** (20) en `research/fichas/`.
Validación: las 20 pasan `JSON.parse` con node, cumplen los campos obligatorios y los valores
permitidos de `ESQUEMA_FICHA.json`, ninguna trae la grafía antigua de la marca, y cada
`cita_textual` se comprobó como subcadena literal (espacios normalizados) del texto descargado
con `curl` + `pdftotext` o del HTML descargado. Citas de 204 a 309 caracteres.

- **Inicio:** 2026-10-02 03:21:02 UTC
- **Fin:** 2026-10-02 03:40:43 UTC
- Lectura previa obligatoria: `research/AGENTES_INSTRUCCIONES.md`, `research/TAXONOMIA.md`,
  `research/fichas/ESQUEMA_FICHA.json` (enteras). No se leyó nada más del repositorio.

## 1. Fuentes intentadas y abiertas, por tipo

| Tipo | Intentadas | Abiertas (con texto) | Con ficha |
|---|---|---|---|
| academia (tesis y artículos) | 19 | 11 | 9 fuentes → 16 fichas (F-065 a F-080) |
| ley (texto compilado) | 2 | 2 | 2 fuentes → 4 fichas (F-061 a F-064) |
| buscadores de repositorio (API DSpace) | 4 (Militar, UPB, Javeriana, Externado) | 2 respondieron (Militar: 2.695 resultados; UPB: 194, ninguno pertinente) | — |

Abiertas con ficha (academia): Orozco Rodríguez 2015 (UNAL, métodos de evaluación y colusión) · Nieto Taborda
2021 (Andes, APU INVIAS) · Márquez Arenas 2016 (UNAL, imprevistos del AIU) · Celis Franco 2014 (UIS, AIU y factor
multiplicador) · Mesa Lozano y Muñoz Vargas 2019 (Revista IUSTA vía Redalyc, planeación y precios) · Matallana
Camacho 2009 (RDDA Externado vía Redalyc, propuesta artificialmente baja) · Ramírez Rusinque 2014 (RDDA Externado
vía Dialnet, menor valor) · Camargo Estupiñan 2024 (Militar, precios artificialmente bajos en mínima cuantía) ·
Ávila Doria y Benavides 2017 (Univ. La Gran Colombia, ítems no previstos; repositorio fuera de la lista del
encargo, pero accesible y pertinente al tema (f)).

Abiertas y descartadas por no pertinentes al eje: Safar 2016, «¿Hay ventajas en el mecanismo de subasta…?»
(Redalyc 503859180013) · Editorial RDDA núm. 31, 2024 (Redalyc 503877922001).

Ley (fuera del lente académico, pero el punto (e) del encargo pedía leer el art. 30 y contar sus parágrafos):
Ley 80 de 1993, texto compilado con notas de vigencia (alcaldiabogota.gov.co, i=304) · Ley 1882 de 2018
(alcaldiabogota.gov.co, i=73590).

## 2. No abiertas, con el error literal

| Fuente | URL intentada | Error literal |
|---|---|---|
| Zambrano et al. 2018, «Fórmulas de selección económica de contratistas… Valle del Cauca» (SciELO Colombia) | http://www.scielo.org.co/scielo.php?script=sci_arttext&pid=S1909-83672018000200060 | HTTP 503, cuerpo: «upstream connect error or disconnect/reset before headers. retried and the latest reset reason: connection timeout» (dos intentos) |
| El mismo artículo en la revista Entre Ciencia e Ingeniería (UCP) | https://revistas.ucp.edu.co/index.php/entrecienciaeingenieria/article/view/121 | HTTP 500, cuerpo vacío (dos intentos) |
| El mismo artículo en Dialnet | https://dialnet.unirioja.es/servlet/articulo?codigo=9347314 | HTTP 200 pero solo la ficha bibliográfica: sin enlace a texto completo (no sostiene ficha) |
| EAFIT, «Modelo de optimización y estandarización de las evaluaciones…» | https://repository.eafit.edu.co/server/api/core/bitstreams/4dd5d3a7-3c34-4f67-bf7f-ab0550387d3a/content | HTTP 200 con HTML de 860 bytes: «Request unsuccessful. Incapsula incident ID: 1023000092130732488-…» (dos intentos) |
| Revista Eurolatinoamericana de Derecho Administrativo (oct-2024), vía DOAJ | https://doaj.org/article/3054656b57ad47bfb7dc792fcee08542 | HTTP 403 |
| Univ. de La Sabana, «Análisis de las fórmulas matemáticas de ponderación…» | https://intellectum.unisabana.edu.co/server/api/core/bitstreams/7bdf9f5f-b57f-52b7-e053-7e0910accd73/content | HTTP 200 con página «Bot Detection» (15 KB de HTML, sin PDF) |
| Externado (OpenEdition Books), «Análisis económico de los procedimientos de selección de contratistas…» | https://books.openedition.org/uec/392?lang=en | HTTP 200 con desafío anti-bot (JSON «challenge … difficulty 2»), sin contenido |
| Javeriana, Peña Noguera 2019, «Efectos de las variaciones de los precios en los contratos de obra pública… precios globales y unitarios» | https://repository.javeriana.edu.co/handle/10554/44286 (y /server/api, /rest, /discover) | HTTP 200 con la cáscara Angular de DSpace (724 bytes, `<ds-app></ds-app>`), sin SSR ni API accesible; puerto 8443: «curl: (35) Recv failure: Connection reset by peer» |
| Externado, buscador del repositorio bdigital | https://bdigital.uexternado.edu.co/search?query=… y /server/api/discover/… | «Bot Detection» (HTML de 12 KB) |

## 3. Problemas candidatos (vistos desde el contratista)

| Título | Etapa | Decisión | Tipo de contrato | Fichas | Consecuencia en plata (si la da la fuente) |
|---|---|---|---|---|---|
| El puntaje económico se decide en la audiencia con un método que la ley solo llama «aleatorio»: los métodos concretos y cómo se toma la TRM viven en el documento tipo, no en la ley | E2 | D2 | obra | F-061, F-064, F-065, F-066 | Orozco: en 21 de 96 grandes licitaciones (2010-2014) el método salió de la TRM; Nieto: descuentos por actividad hasta 60% |
| Posible contradicción sobre la «media aritmética alta»: Nieto (2021) afirma que la Resolución 161 de 2021 la retiró de los documentos tipo; el encargo la lista como vigente | E2 | D2 | obra | F-068 | — (si el método no existe, cualquier simulación que lo incluya reparte mal las probabilidades) |
| APU del presupuesto oficial con errores que la entidad corrige sin mover el total: ítems que quedan bajo el mercado y que, firmado el contrato, son riesgo del contratista | E1/E3 | D2/D4 | obra | F-070, F-075, F-074 | Nieto: los ítems rebajados «no sean cotizados»; Mesa y Muñoz: renegociar el unitario antes de firmar o desistir |
| El «I» del AIU: hay entidades que todavía exigen justificar los imprevistos como si fueran costo directo | E4 | D4 | obra | F-071 | — |
| El AIU no tiene tope ni composición fijados por la ley de contratación; su regulación es tributaria (IVA) | E2 | D2 | obra | F-072 | — |
| En consultoría e interventoría el precio no se arma con AIU sino con factor multiplicador sobre costos de personal | E2 | D2 | consultoría, interventoría | F-073 | Celis: tarifas de referencia 2,2%-3,5% (Decreto 609 de 1976, sin verificar) |
| Precio artificialmente bajo sin piso objetivo: la entidad define el umbral y pide aclaración al más barato; riesgo de rechazo | E2 | D2/D3 | todos | F-076, F-077, F-078 | Camargo: 44% de 38 procesos de mínima cuantía (DNP, 2023) con solicitud de aclaración; brechas presupuesto-adjudicación hasta 69% |
| Ítems no previstos: precio acordado y autorizado por escrito antes de ejecutar; mayores cantidades a precios unitarios sin contrato adicional; el precio global no es rígido | E4 | D4 | obra | F-079, F-080 | Tope de adición 50% del valor inicial (según los autores) |
| Las adiciones son la norma en grandes contratos: el valor final superó el presupuesto oficial en 78,3% (muestra 2010-2014) | E4 | D4 | todos | F-067 | +78,3% agregado (de $10,69 a $19,96 billones en 96 procesos) |
| Dos sobres: el sobre 2 lleva únicamente la oferta económica; lo demás va en el sobre 1 | E2 | D3 | obra | F-062, F-063 | — |

## 4. Respuesta al punto (e): art. 30 de la Ley 80 hoy

Leído en el compilado de alcaldiabogota.gov.co (2-oct-2026): doce numerales (el 11 derogado por el art. 32 de la
Ley 1150 de 2007) y **tres parágrafos**: uno **sin número** (el original, con su segundo inciso sobre el
«concurso» derogado) y los parágrafos **2° y 3°** adicionados por el art. 1 de la Ley 1882 de 2018. No hay
ningún «parágrafo 1°» rotulado así. El parágrafo 3° manda evaluar la oferta económica en la audiencia efectiva de
adjudicación «a través del mecanismo escogido mediante el método aleatorio que se establezca en los pliegos de
condiciones»: la ley no nombra la TRM ni la media aritmética, geométrica o el menor valor (fichas F-061, F-063,
F-064).

## 5. Qué quedó sin cubrir

- **(c) Corrección aritmética**: ninguna fuente académica abierta la trata; lo que apareció eran pliegos y
  manuales de entidad (A7), fuera del lente de este encargo.
- **(b) IVA sobre la utilidad en obra** (la regla concreta) y **cómo tratan el AIU los documentos tipo**: solo
  la afirmación de Celis de que el AIU nació como figura tributaria; la norma tributaria no se abrió.
- **(d) Decreto 1082 de 2015, art. 2.2.1.1.2.2.4**: no se abrió (lente académico); Matallana razona sobre el
  Decreto 2474 de 2008, anterior a la reforma, y así quedó marcado.
- **(e) Documentos tipo de obra**: fórmulas, rangos de la TRM y cómo se toma; no se abrieron. El artículo
  académico que los estudiaba (Zambrano et al. 2018, Valle del Cauca) falló en sus tres sedes.
- **(g) Oferta económica en concurso de méritos**: solo el factor multiplicador (Celis); si el precio puntúa o
  no, sin fuente abierta. Mínima cuantía: solo la evidencia de Camargo sobre aclaraciones.
- **(h) Topes por precio unitario**: sin fuente. Precio global frente a unitario: parcial (F-079, F-080); la
  tesis de la Javeriana que lo trata (Peña Noguera 2019) no se pudo abrir.
- Ley 1882 de 2018: solo el art. 1; los arts. 2 (responsabilidad de consultores e interventores) y 4
  (documentos tipo) quedaron sin leer.

## 6. Incidencias y observaciones para el PC1

- Cuatro de las nueve fuentes académicas con ficha son anteriores a 2018 (Matallana 2009, Celis 2014, Ramírez
  2014, Orozco 2015): se usaron porque las de 2018 en adelante sobre esos subtemas no respondieron; cada ficha
  lo dice en `vigencia_verificada`.
- Camargo 2024 es un ensayo de especialización y Ávila y Benavides 2017 es un trabajo de especialización en una
  universidad fuera de la lista del encargo: peso académico bajo, declarado en la ficha.
- **Campo `autor` y datos personales**: el esquema exige `autor` y la regla 5 de AGENTES_INSTRUCCIONES prohíbe
  nombres de personas naturales **de SECOP**. En las tesis se registró la autoría bibliográfica (apellidos e
  iniciales), que es atribución académica pública y no dato de SECOP. Si el dueño prefiere anonimizar autores
  de tesis, es un cambio mecánico sobre 16 fichas.
- Las citas que cruzan un salto de página o una nota al pie se partieron con «[…]» (F-069, F-077) y el
  localizador lo dice.
- Durante la escritura aparecieron en el árbol las fichas F-021 a F-040 de otro agente (sin rastrear en git);
  no se tocaron ni se leyeron.
- Ritmo medido: 20 fichas de 11 fuentes abiertas en unos 20 minutos de reloj, con las 20 citas verificadas por
  programa contra el texto descargado; el cuello de botella fue la red (8 fuentes no abiertas), no la lectura.
- No se modificó ningún otro archivo del repositorio; no se hizo commit ni ninguna escritura hacia fuera.
