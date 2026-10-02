# Piloto (Fase 1) · Resultados medidos

> Para: sesión · Estado: informe fechado · Sustituido por: —

Fecha: 2-oct-2026. Ejes 4 (RUP, experiencia, capacidad residual, plurales, UNSPSC) y 9 (oferta
económica y APU), más 5 procesos de SECOP II escogidos por sorteo. Toda cifra de este documento sale
de `research/muestra/metricas_piloto.json` (guion `research/muestra/metricas_piloto.js`), de
`research/muestra/piloto_flujos.json` (salidas de los agentes, tal cual) o de
`research/muestra/sorteo_piloto.json`. Las tasas de la muestra describen 4 procesos, no el universo.

## 1. Cómo se hizo

- Diez agentes en tres flujos paralelos (eje 4, eje 9, muestra): por eje, un lector institucional y
  uno académico; por cada lector, un verificador adversario distinto que reabrió la fuente de una
  muestra reproducible de sus fichas (FNV-1a con semilla, 30 % con mínimo 4) sin ver el informe del
  lector; en la muestra SECOP, un verificador que recontó a ciegas 2 de los 5 procesos.
- Un primer flujo con los cinco lectores en fila se detuvo a los 14 minutos porque el contenedor solo
  corre dos agentes a la vez por flujo; sus 9 fichas (CE-F-0200 a 0208) se conservaron.
- Una ficha por par (documento, localizador). Chequeo de forma: `research/muestra/chequeo_fichas.js`.

## 2. Ritmo y costo

| Agente | Minutos | Fichas | Fichas por hora | Documentos abiertos | Fuentes que fallaron | Minutos del verificador |
|---|---|---|---|---|---|---|
| eje4-institucional | 23,9 | 45 | 113,1 | 49 | 5 | 3 |
| eje4-academico | 36,1 | 30 | 49,9 | 21 | 9 | 3,8 |
| eje9-institucional | 18,9 | 45 | 142,5 | 32 | 2 | 3,1 |
| eje9-academico | 17,5 | 30 | 103,1 | 17 | 9 | 2,6 |
| muestra-secop | 12,8 | 5 | 23,4 | 0 | 1 | 1,8 |

La fila de la muestra dice 0 documentos porque su esquema no pedía ese campo: bajó 6 archivos distintos de 5 expedientes y leyó 5 (4 PDF y 1 Excel); el sexto está escaneado sin texto.

- Tiempo de reloj: los tres flujos tardaron 16, 24 y 30 minutos, en paralelo.
- Tokens de los subagentes de los tres flujos: 2.020.090 (≈ 11.340 por ficha de eje con su
  verificación al 30 %). El flujo detenido no dejó registro de su consumo: no medido.
- El costo en pesos no se puede medir desde aquí.

## 3. Verificación

**Muestra aleatoria (la que da la tasa):**

| Lote | Verificadas | Fallan | Tasa | IC 95 % |
|---|---|---|---|---|
| eje4-institucional | 14 | 3 | 21,4 % | 7,6-47,6 % |
| eje4-academico | 9 | 4 | 44,4 % | 18,9-73,3 % |
| eje9-institucional | 14 | 0 | 0 % | 0-21,5 % |
| eje9-academico | 9 | 1 | 11,1 % | 2-43,5 % |
| **Total** | 46 | 8 | 17,4 % | 9,1-30,7 % |

Los 8 errores son del mismo tipo, «no_sostiene»: la afirmación dice más que la cita. Cuatro son
menores (la afirmación usa la frase vecina: CE-F-0006, 0007, 0011, 0617) y cuatro son serios (presentan
una opción del autor como regla o una cifra que la tabla del mismo artículo contradice: CE-F-0200,
0205, 0206, 0209, todas del lector académico del eje 4). Las 8 se corrigieron estrechando la
afirmación a su cita; cada ficha guarda en `revisiones` el veredicto, la corrección y el texto anterior.
Tres de los cuatro lotes pasan del 5 %: por la regla del encargo se revisan enteros.

**Verificación dirigida** (no aleatoria: no entra en la tasa). Antes de contarle al dueño los hallazgos, otro verificador reabrió las 18 fichas sin verificar que los sostienen: 15 correctas, 2 «no_sostiene» y 1 «vigencia_mal».
- CE-F-0029: la norma fija la fecha para *presentar* la renovación del RUP (quinto día hábil de abril), no para tenerla hecha. Corregida.
- CE-F-0412: el 20 % por debajo del costo estimado es la «comparación absoluta» de la guía de CCE, que solo se recomienda con claridad de costos y menos de cinco ofertas; no es un umbral general. Corregida.
- CE-F-0039: el Título VIII de la Circular Única de la SIC está derogado (Resolución SIC 28173 de 2022, art. 4); las cámaras de comercio las vigila la Superintendencia de Sociedades desde el 1-ene-2022. Marcada derogada, y su hermana CE-F-0038 (misma fuente) también. Con eso la entrada L4-14 de la lista cerrada vuelve a «sin verificar»: la fuente vigente (Circular Externa 100-000002 de 2022 de la Superintendencia de Sociedades) no se abrió.
- Confirmadas, entre otras: el Decreto 0997 de 2026 (caución del 10 % de la utilidad operacional para impugnar un RUP; reporte al RUP de la condena civil por un contrato estatal), la clase 72141300 deshabilitada en el CSV oficial de CCE, y la regla de la TRM de los documentos tipo vigentes (cuatro franjas de 25 centavos; en menor cuantía, la TRM del día hábil siguiente o del segundo al pronunciamiento).
- Tokens de este verificador: 255.371; 16 minutos.

**Muestra SECOP, recuento a ciegas** (CO1.BDOS.10300262 y CO1.BDOS.10561074): coincide en proponentes,
habilitados, rechazos y causas; difiere en una subsanación que el lector dejó «sin dato» (el informe no
lo dice) y el verificador contó 0. Vale el «sin dato».

## 4. Fuentes y fichas

| Tipo de documento | Documentos distintos | Fichas |
|---|---|---|
| academia | 21 | 56 |
| documento_tipo | 9 | 29 |
| guia_cce | 6 | 11 |
| decreto | 5 | 23 |
| herramienta_oficial | 5 | 7 |
| concepto_cce | 5 | 5 |
| documento_proceso | 5 | 5 |
| ley | 4 | 10 |
| jurisprudencia | 2 | 2 |
| circular_otra | 1 | 2 |
| resolucion | 1 | 1 |
| multilateral | 1 | 2 |
| organo_control | 1 | 2 |
| **Total** | 66 | 155 |

De las 31 entradas de las listas cerradas de los ejes 4 y 9 (`research/LISTAS_CERRADAS.md`), 30 tienen
al menos una ficha vigente del lector institucional y 1 (L4-14) volvió a «sin verificar» tras la verificación dirigida; varias con salvedad escrita en la ficha (por ejemplo, el
número del Diario Oficial del Decreto 0997 de 2026 y que la versión UNv260801 del clasificador ya opere
en SECOP II y en el RUP quedan sin verificar).

**Saturación de problemas** (ningún eje saturó: el criterio es que las 10 últimas fuentes, de al
menos 2 tipos, no traigan ningún problema nuevo):

| Lector | Fuentes en orden | Con problema nuevo | Nuevas en las 10 últimas | Tipos en las 10 últimas |
|---|---|---|---|---|
| eje4-institucional | 45 | 14 | 2 | 4 |
| eje4-academico | 15 | 8 | 3 | 1 |
| eje9-institucional | 28 | 9 | 2 | 5 |
| eje9-academico | 24 | 13 | 7 | 5 |

## 5. Muestra de SECOP II

Sorteo: universo de 4.115 expedientes de obra con aviso del 1-ene al 30-sep-2026 (896 de licitación de
obra, 12 de licitación, 2.209 de menor cuantía, 21 de menor cuantía sin manifestación, 977 de mínima
cuantía). Se revisaron 16 en el orden del sorteo: 11 no tienen un archivo cuyo nombre diga «informe» y
«evaluación» (31,3 % sí lo tienen). De los 5 escogidos, 1 está escaneado sin texto y en el entorno no
hay OCR: se leyeron 4.

| Expediente | Modalidad | Informe | Proponentes | Habilitados | Rechazados o no habilitados | Causas | Subsanaciones pedidas | Archivos de adenda |
|---|---|---|---|---|---|---|---|---|
| CO1.BDOS.10556929 | Selección Abreviada de Menor Cuantía | escaneado sin texto: no se cuenta | — | — | — | — | sin dato | 4 |
| CO1.BDOS.10300262 | Selección Abreviada de Menor Cuantía | leído | 13 | 9 | 4 | economico_precio 2, financiero 2 | 4 | 0 |
| CO1.BDOS.10369426 | Selección Abreviada de Menor Cuantía | leído | 2 | 1 | 1 | juridico 1 | 2 | 2 |
| CO1.BDOS.10259833 | Selección Abreviada de Menor Cuantía | leído | 2 | 1 | 1 | financiero 1 | 5 | 0 |
| CO1.BDOS.10561074 | Mínima cuantía | leído | 1 | 1 | 0 | — | sin dato | 0 |

**Cuán diligenciado viene cada campo** (sobre las 9.637 filas del universo; `count()` da 100 % en todos
porque SECOP rellena con «No definido», «UNSPECIFIED» o 0, así que se cuentan los valores útiles):

| Campo de p6dx-8zbt | Filas con valor útil | Nota |
|---|---|---|
| precio_base | 99,97 % de 9637 | count() = 100 %. 3 filas en 0 (sin dato) y 5 por debajo de $1.000.000. Ninguna negativa. |
| duracion | 83 % de 9637 | count() = 100 %. 1.636 filas en 0 (1.600 en día(s), 36 en Mes(es)). Una obra con plazo 0 no es un dato, así que esas filas cuentan como sin dato. |
| unidad_de_duracion | 100 % de 9637 | Mes(es) 5.816, día(s) 3.777, Semana(s) 40, Año(s) 3, Hora(s) 1. Viene aunque la duración sea 0. |
| fecha_de_recepcion_de | 100 % de 9637 | Ninguna es anterior a 2000 ni anterior a la fecha de publicación del aviso. |
| codigo_principal_de_categoria | 78,8 % de 9637 | count() = 100 %. 2.040 filas dicen UNSPECIFIED. En la fase Presentación de oferta son 1.783 de 2.764 (64,5 %): en esa fase el código hay que tomarlo de la fila de otra fase del mismo expediente. |
| categorias_adicionales | 0 % de 9637 | count() = 100 %, pero las 9.637 filas dicen «No definido». En este universo el campo no sirve. |
| descripci_n_del_procedimiento | 99 % de 9637 | 98 filas dicen «No definido» y 104 tienen menos de 20 caracteres. |
| proveedores_unicos_con | 47,1 % de 9637 | 5.095 filas en 0: 5.093 en estado Evaluación (fases antes de la oferta, donde el 0 quiere decir «no aplica», no «cero proponentes») y 2 en Seleccionado. |
| respuestas_al_procedimiento | 47,2 % de 9637 | 5.093 filas en 0, todas en Evaluación. En Seleccionado ninguna fila está en 0. Coincide con el informe en 3 de los 4 procesos leídos; en San Mateo dice 3 y el informe enumera 2. |
| valor_total_adjudicacion | 43,7 % de 9637 | 5.426 filas en 0: las 5.268 de Evaluación (todavía sin adjudicar) y 158 de Seleccionado. Contando solo Seleccionado: 4.211 de 4.369 (96,4 %). Aguadas está Seleccionado con 0. |
| urlproceso | 100 % de 9637 | Las 9.637 apuntan a community.secop.gov.co (se comprobó con urlproceso.url). |

Sesgos declarados: el filtro por nombre de archivo deja fuera informes con otro nombre; los escaneados
se pierden sin OCR; `tipo_de_contrato = 'Obra'` deja entrar servicios (Mompós es rocería y limpieza);
ninguno de los 5 es de licitación.

## 6. Acceso a fuentes (lo que falló, con fecha)

- Presidencia (`dapre.presidencia.gov.co`): sin agente de navegador responde una página antibots en vez
  del PDF; con agente de navegador o por la relatoría de CCE se leyó el Decreto 0997 de 2026.
- `RetrieveFile` de SECOP II: 403 en 6 de 14 intentos (desafío JavaScript del cortafuegos de Azure);
  los reintentos pasaron.
- Un informe escaneado sin texto: sin `tesseract` ni `ocrmypdf` en el entorno.
- SciELO sigue reiniciando la conexión; Redalyc y los repositorios de la Universidad de Medellín, la
  UNAD y Uniandes respondieron.

## 7. Ajustes que deja el piloto

Los de ficha, taxonomía y umbrales están en `research/PILOTO_INSTRUCCIONES.md` § 5 y rigen desde la
Fase 2. El más importante: la cita tiene que contener todo lo que dice la afirmación, y la verificación
pasa al 100 % en academia y práctica.

## 8. Tamaño N de la muestra y de la Fase 2 (estimado con lo medido aquí)

Insumos medidos en el piloto, con base muy pequeña (16 expedientes revisados, 4 informes leídos): el
31,3 % de los expedientes trae un archivo con «informe» y «evaluación» en el nombre; el 80 % de esos se
puede leer sin OCR; cada informe leído trae en promedio 4,5 proponentes y 1,5 rechazos o no
habilitaciones; el flujo de la muestra gastó unos 80.000 tokens por informe leído (cota alta: incluye
el recuento a ciegas y la medición del diligenciamiento). La semiamplitud del intervalo al 95 % se
calcula en el peor caso (p = 0,5). Guion y salida: espacio de trabajo de la sesión, `calculo_N.txt`.

| N (informes leídos) | Rechazos esperados | Precisión en la parte de una causa | Precisión en la tasa de rechazo por proponente | Expedientes a revisar | Tokens estimados |
|---|---|---|---|---|---|
| 30 | 45 | ± 14,6 pp | ± 8,4 pp | ≈ 120 | ≈ 2,4 M |
| 60 | 90 | ± 10,3 pp | ± 6,0 pp | ≈ 240 | ≈ 4,8 M |
| 100 | 150 | ± 8,0 pp | ± 4,6 pp | ≈ 400 | ≈ 8,0 M |

Supuestos declarados (no medidos): que las proporciones del piloto se mantengan, y que la muestra se
estratifique por modalidad (ninguno de los 5 del piloto fue de licitación).

Fase 2: con 11.340 tokens por ficha (lectura más verificación al 30 %, medido en los ejes 4 y 9), siete
ejes nuevos de 75 fichas costarían unos 6,0 M tokens; la verificación al 100 % que pide el § 5 de las
instrucciones lo sube en una cantidad que el piloto no permite medir (los verificadores tardaron de 2,6
a 3,8 minutos por lote de 9 a 14 fichas, frente a 17 a 36 minutos de los lectores).

## 9. Pistas para la Fase 3 (contra el código de Detekta; nada se implementa)

Hallazgos de fichas que chocan con lo que el repositorio dice o hace hoy. Se reproducen contra el código
en la Fase 3 antes de proponer nada:

- **La regla del sorteo del método económico.** El destilado de dominio de `docs/MEMORIA.md` (sección
  «CONOCIMIENTO DE DOMINIO: CONTRATACIÓN PÚBLICA COLOMBIANA») todavía dice «primer decimal de la TRM»;
  `lib/guia_proceso.js` ya declara retirada esa regla y `lib/apu/rentabilidad.js` habla de «la TRM de la
  fecha que fija el pliego». Los documentos tipo vigentes usan cuatro franjas de 25 centavos y la TRM del
  día hábil siguiente o del segundo al pronunciamiento (CE-F-0414, 0415, 0416, 0431, 0432; verificadas).
  Queda por reproducir si el código modela esas franjas.
- **La versión del clasificador UNSPSC.** `lib/unspsc.js` no distingue versiones; CCE publica la
  UNv260801 y un CSV de códigos deshabilitados donde está la clase 72141300 (CE-F-0010, 0012, 0013,
  0014; verificadas). Efecto posible en el cruce RUP ↔ proceso.
- **El Decreto 0997 de 2026.** Nada en el árbol lo conoce; cambia el RUP (caución, reporte de condenas)
  y el análisis del sector de forma progresiva, y deja los procesos de documento tipo con sus reglas
  hasta que CCE los actualice (CE-F-0001, 0002, 0005, 0006).
- **El umbral del 20 %** de precio artificialmente bajo vale solo en la comparación absoluta de la guía
  (CE-F-0412, corregida); el documento de Drive «GUIA_Subsanabilidad_y_Causales_de_Rechazo» lo da como
  umbral orientador general.
