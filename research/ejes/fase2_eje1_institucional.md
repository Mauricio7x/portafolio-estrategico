# Fase 2 · Eje 1 (Marco vigente) · lente institucional

> Para: sesión · Estado: referencia · Sustituido por: —

Lector: «lector fase2 eje1-institucional». Rango de fichas: F-0101 a F-0160 (60 fichas, rango lleno; el rango estaba vacío al empezar, no había fichas de la corrida cortada que respetar).

- Inicio (UTC): 2026-10-02T13:27:01Z
- Fin (UTC): 2026-10-02T13:50:32Z
- Cómo terminó: tope de ids (60 fichas). La lista cerrada se cubrió salvo lo declarado abajo como «sin cubrir».

## Fuentes intentadas y abiertas por tipo (claves de la taxonomía)

Cuenta de documentos distintos abiertos (descargados y leídos al menos en la parte citada) y de intentos que fallaron. «Abierta» incluye las que quedaron sin ficha por el tope de ids.

| tipo | intentadas | abiertas |
|---|---|---|
| ley | 7 | 6 (Ley 1150 en relatoría y en alcaldiabogota, Ley 2069, Ley 996, Ley 2195, Ley 80) |
| decreto | 10 | 7 (0997 en relatoría y en alcaldiabogota, 287, 1469 de 2025, 159 de 2026, 1860 de 2021, 1037 de 2026 sin relación) |
| doc_tipo | 11 | 10 (control de versiones, vigentes, proyectos, listado general, resoluciones 463, 464, 465, 539, 725, 726) |
| cce_guia | 13 | 11 (circulares 002/2026, 003/2026, 006/2025, 001/2026, 008/2025, 007/2025, 003/2024, 004/2025, 005/2025; guía de régimen especial; guía de documentos tipo no) |
| cce_concepto | 4 | 2 (C-222 de 2026, C-405 de 2026) |
| juris | 1 | 1 (el auto del Consejo de Estado del 12-feb-2026 en alcaldiabogota, i=192123: abierto, sin ficha por el tope de ids; no se leyó entero) |
| control | 0 | 0 |
| internacional | 0 | 0 |
| gremio | 0 | 0 |
| academia | 0 | 0 (lente institucional) |
| practica | 22 | 20 (comunicados de Colombia Compra 23847, 26775, 23228, 27105, 16411; cinco convocatorias de participación ciudadana; fichas de la Cámara de Representantes y la ponencia del proyecto 270 de 2025 Cámara; ponencia del 554; nota de prensa La República como pista) |
| dato | 0 | 0 |

Fuentes sin ficha por tope de ids (abiertas): auto del Consejo de Estado (juris), Circular 007 de 2025 (OCR; expediente electrónico en SECOP II), Circular 008 de 2025 (reporte Ley 2069), Circular 005 de 2025, Decreto 1860 de 2021 (solo para el procedimiento de mínima cuantía, citado en F-0146), comunicados 23228, 27105 y 16411, Guía para el proceso sancionatorio y borrador de la guía de garantías (solo la página de convocatoria, F-0156).

## No abiertas (error literal)

- `https://www.colombiacompra.gov.co/normativa-y-relatoria/documentos-tipo-v2` → HTTP 404 («Página no encontrada», mensaje del nuevo portal).
- `https://www.colombiacompra.gov.co/wp-content/uploads/2025/06/Circular-Externa-002-2025-Actualizacicion-de-Manuales-T-302-de-2017-V-2.0-Rev-ARSC` → HTTP 404 (la circular 002 de 2025 quedó sin leer).
- `https://www.colombiacompra.gov.co/wp-json/wp/v2/documento?search=...` → `rest_no_route` (HTTP 404): ese tipo de contenido no existe en la API; se usó `/wp/v2/search` y `/wp/v2/circular`, que sí responden.
- `https://dapre.presidencia.gov.co/normativa/normativa/DECRETO%20997%20DEL%204%20DE%20AGOSTO%20DE%202026.pdf` → HTTP 200 pero el cuerpo es HTML de verificación anti-robot («Please enable JavaScript to view the page content... Validacion»), no el PDF; el listado `https://dapre.presidencia.gov.co/normativa/normativa` responde igual. El nombre del archivo del decreto («DECRETO No. 0997 DEL 4 DE AGOSTO DE 2026.pdf») se lee en la relatoría de Colombia Compra.
- `https://svrpubindc.imprenta.gov.co/diario/` → el primer intento mostró `curl: (35) Recv failure: Connection reset by peer`; el siguiente respondió 200 con solo el formulario de búsqueda (consulta por POST: «no consultable desde aquí»). Número y fecha del Diario Oficial del Decreto 0997 y del 287: sin verificar.
- `https://www.suin-juriscol.gov.co` → `curl: (60) SSL certificate problem: unable to get local issuer certificate` (ya listado como fallido en las instrucciones comunes).
- Textos de las resoluciones 540, 952 y 953 de 2025 (documentos tipo de infraestructura social), 275 de 2022 (agua y saneamiento) y 358 de 2023 (convenios solidarios): no se localizó su URL de archivo; solo se leyeron comunicados y el control de versiones.
- El texto de los propios documentos tipo (pliego base, matrices, anexos) y el del proyecto de decreto que modifica el Decreto 1082 (anexos «Descargar»): no se abrieron.

## Problemas candidatos que vio

La señal «detectable» se refiere a datos abiertos de SECOP II (procesos, adjudicaciones, adiciones, multas); donde no se verificó la existencia del campo se dice «no verificada».

1. **El pliego tipo todavía no trae las preferencias del Decreto 287 de 2026.** Etapa E2 · decisión D1 · todos. Fichas: F-0113, F-0114, F-0115, F-0120, F-0121. Un proceso con documento tipo debe seguir la versión vigente aunque el decreto ya rige (Circular Externa 003 de 2026); el puntaje adicional (2 % del total de puntos, licitación y concurso de méritos) y los habilitantes diferenciales solo operan donde la entidad no esté atada al documento tipo. Consecuencia en plata: ninguna cifra en pesos; el efecto es de puntos (hasta el 2 %). Señal: no detectable (los marcadores de SECOP para estas medidas los debe crear Colombia Compra; el decreto da dos años).
2. **Multa en firme: 2 puntos menos y un año en el RUP.** Etapa E2/E5 · D3 · todos. Fichas: F-0103, F-0127, F-0160. Con el Decreto 0997 el reporte mensual a las cámaras de comercio es regla expresa; la Ley 2195 (art. 58) resta el 2 % del total de puntos a quien tuvo multa o cláusula penal en el último año. Señal: parcial; hay datos abiertos de multas y sanciones de SECOP, no verificados aquí.
3. **Impugnar el RUP de un competidor cuesta una caución.** Etapa E2 · D3 · todos. Ficha: F-0102. 10 % de la utilidad operacional del inscrito (1 % de los ingresos operacionales si no hay utilidad positiva), vigente hasta un año después de la decisión. Consecuencia en plata: sí, esa caución. Señal: no detectable.
4. **Reglas del Decreto 0997 con fecha de aplicación distinta según el tipo de entidad, y sin fecha de Diario Oficial verificada.** Etapa E2 · D3 · todos. Fichas: F-0101, F-0110. Cuatro, nueve, doce o quince meses; lo de los documentos tipo queda fuera de la gradualidad. Un mismo requisito puede exigirse en un proceso de una entidad nacional y no en uno de un municipio pequeño. Señal: detectable en principio (fecha de publicación del proceso y categoría de la entidad), no verificada.
5. **La versión del documento tipo depende de la fecha del aviso de convocatoria.** Etapa E2 · D3 · obra, interventoría y consultoría. Fichas: F-0129 a F-0134, F-0138 a F-0142. Transporte: V.4 de licitación desde el 3-feb-2025; infraestructura social: V.2 desde el 16-feb-2026. Las reglas de experiencia y capacidad cambian entre versiones; las de agua y saneamiento siguen en V.1 con modificaciones. Señal: detectable (fecha de publicación del proceso en SECOP II frente a las fechas de corte).
6. **Una licitación desierta con documentos tipo reaparece como selección abreviada con la misma Matriz 1 de experiencia.** Etapa E2 · D1 · obra. Ficha: F-0136. Señal: detectable por entidad y objeto consecutivos; no verificada.
7. **Entidades de régimen especial: el RUP no se les puede exigir, pero los documentos tipo sí aplican a contratos derivados de entidades del Estatuto.** Etapa E2 · D1 · todos. Fichas: F-0124, F-0125, F-0126, F-0159. Cambia quién puede presentarse y bajo qué reglas. Señal: modalidad «régimen especial» en SECOP II, no verificada.
8. **Umbrales en SMMLV y litigio del decreto del salario mínimo.** Etapa E0 · D1 · todos. Fichas: F-0145 a F-0149. SMMLV 2026 = $1.750.905 (dos decretos con la misma cifra; la suspensión fue revocada según la nota de vigencia de MinTIC y prensa, sin leer el auto de revocatoria). Menor cuantía de 280 SMMLV = $490.253.400 (entidad con presupuesto menor de 120.000 SMMLV) hasta 1.000 SMMLV = $1.750.905.000 (cálculos del lector, ficha F-0145); mínima cuantía, 10 % de esos valores. Un valor de proceso cerca del umbral cambia la modalidad (selección abreviada frente a licitación). Señal: detectable (valor del proceso frente al umbral de la entidad).
9. **Adición limitada al 50 % del valor inicial en SMMLV, aunque se llame otrosí o mayores cantidades.** Etapa E4 · D4 · obra. Ficha: F-0150. Ejemplo: un contrato de 1.000 SMMLV admite hasta 500 SMMLV de adición ($875.452.500 con el SMMLV 2026). Señal: detectable en los datos de adiciones de SECOP II, no verificada.
10. **Condiciones especiales de ejecución del Decreto 287 atadas a cada pago.** Etapa E4 · D4 · todos. Ficha: F-0117. El contratista presenta soportes con cada solicitud de pago; el incumplimiento injustificado puede ser causal. Señal: no detectable.
11. **Dos reglas distintas de proponente plural para personas con discapacidad** (desempate: 10 % de nómina, 25 % de participación y de experiencia; Decreto 287: número mínimo y planta del integrante de mayor participación; habilitantes: integrante con al menos 10 %). Etapa E2 · D1 · todos. Fichas: F-0116, F-0122. Riesgo: unificar en un solo cálculo. Señal: no detectable.
12. **Ley de Garantías: la veda alcanza la contratación directa, no la licitación, el concurso de méritos, la selección abreviada ni la mínima cuantía.** Etapa E2 · D1 · todos. Fichas: F-0151 a F-0155. En 2026 corrió del 31-ene al 31-may o 21-jun (según segunda vuelta); a 2-oct-2026 no hay veda en curso. Señal: detectable (modalidad directa por fecha), no verificada.

## Temas de la lista cerrada

### Cubiertos
- Tema 1, Decreto 0997 de 2026: los 13 artículos de fondo (arts. 1 a 13) y el art. 14 de vigencia, con texto literal en F-0101 a F-0111; fecha de expedición 4-ago-2026.
- Tema 2, Decreto 287 de 2026: definiciones (art. 2.2.1.2.4.2.6), puntaje del 2 % con tabla, habilitantes diferenciales, condiciones de ejecución, compras accesibles, vigencia y la circular que lo interpreta (F-0112 a F-0122).
- Tema 3, documentos tipo: control de versiones oficial, transporte (resoluciones 463, 464, 465, 725, 726 con avisos desde el 3-feb-2025), infraestructura social (resolución 539 y comunicado de las 540, 952 y 953 con avisos desde el 16-feb-2026), agua y saneamiento (V.1 con modificaciones), borradores no vigentes y la regla legal de obligatoriedad (F-0123, F-0129 a F-0144).
- Tema 4, circulares 2025 y 2026: 006/2025 y 001/2026 (garantías), 002/2026 (reportes), 003/2026 (discapacidad). Leídas sin ficha: 007/2025, 008/2025 y 005/2025.
- Tema 5, proyectos de reforma (marcados no vigentes): proyecto de decreto del Decreto 1082, proyecto de ley 554 de 2025 (archivado), proyecto de ley 270 de 2025 y borradores de documentos tipo de agua (F-0144, F-0156 a F-0158).
- Tema 6, régimen especial: Ley 1150 art. 13 y Ley 2195 arts. 53 y 56, guía de Colombia Compra y circular 002/2026 (F-0124 a F-0128, F-0159).
- Tema 7, umbrales 2026: menor y mínima cuantía, SMMLV y litigio (F-0145 a F-0150).
- Tema 8, Ley de Garantías y ciclo electoral de 2026 (F-0151 a F-0155).

### Sin cubrir (declarados)
- Número y fecha del Diario Oficial del Decreto 0997 y del Decreto 287 (sin fuente abierta por GET); por eso no se calcularon las fechas de aplicación escalonadas del Decreto 0997.
- Texto de las resoluciones 540, 952, 953 de 2025, 275 de 2022 y 358 de 2023, y de los documentos tipo mismos (pliegos, matrices): no se cotejó qué de lo del Decreto 0997 y el 287 ya está incorporado.
- Si Colombia Compra ya incorporó el Decreto 287 a los documentos tipo por resolución: el control de versiones no muestra versión posterior al 16-feb-2026, pero su fecha de actualización no se ve.
- Circulares externas 001 y 003 de 2025 (contenido) y 002 de 2025 (404): sin leer.
- Texto del proyecto de decreto que modifica el Decreto 1082 y estado actual del proyecto de ley 270 de 2025 Cámara (cambió la legislatura el 20-jul-2026).
- Lectura del auto del Consejo de Estado y de la providencia que revocó la suspensión del Decreto 1469 de 2025 (fuente primaria); solo hay la nota de vigencia de MinTIC y una nota de prensa del 17-jul-2026.
- Calendario electoral oficial (Registraduría) y fechas de la próxima veda (elecciones territoriales de 2027).
- Manuales de contratación de entidades de régimen especial concretas y concepto C-332 de 2025.
- Decreto 1082 consolidado: la página de la relatoría no sirve como texto vigente; no se encontró un consolidado abierto. Las fichas del Decreto 0997 y el 287 cotejan reformas solo contra lo que la relatoría muestra como más reciente.

## Hallazgos que el dueño debe saber

- La nota de la API de la relatoría y la de MinTIC dicen que la suspensión del decreto del salario mínimo fue levantada; Colombia Compra (C-222 y C-405) no lo menciona. Las cuantías no cambian porque el valor es el mismo, pero un SMMLV distinto cambiaría todos los umbrales.
- La Circular 006 de 2025 de Colombia Compra está fechada el 25-sep-2025; la Circular 001 de 2026 la cita como del 5 de septiembre.
- El texto de la Resolución 463 de 2024 (PDF) trae la fecha de aplicación ilegible; el 3-feb-2025 viene del registro de versiones.
- El Decreto 0997 dice que los documentos tipo siguen sus normas anteriores hasta nueva versión: para obra con documento tipo, los nuevos habilitantes y causales del Decreto 0997 no cambian el pliego por ahora.
