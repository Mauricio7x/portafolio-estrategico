# Fase 2 · Eje 7 (SECOP II, datos abiertos, cambios de la plataforma y señales de alerta) · lente institucional

> Para: sesión · Estado: referencia · Sustituido por: —

Lector: «lector fase2 eje7-institucional». Rango de ids: F-0821 a F-0880 (se escribieron las 60: F-0821 a F-0880; rango lleno).

## Tiempos y cierre

| Dato | Valor |
|---|---|
| Inicio (`date -u`) | Mon Oct 19 18:11:03 UTC 2026 |
| Fin (`date -u`) | Mon Oct 19 18:36:12 UTC 2026 |
| Cómo terminó | **Tope de fuentes** (40 abiertas): se contaron 45 abiertas porque cada ficha de metadatos de un conjunto de datos.gov.co cuenta como una fuente (19 conjuntos); se pasó del tope en 5 por ese conteo y se dejó de abrir fuentes nuevas en cuanto se advirtió. No paró por saturación ni por tiempo (unos 25 minutos de reloj). |
| Rango | Estaba vacío al llegar (no había fichas F-0821 a F-0880): no se reanudó nada, se escribió desde F-0821. |
| Contexto | Una corrida anterior se cortó por el límite de la sesión; no dejó fichas de este rango. |

Nota de método: las cifras de los conjuntos de datos abiertos salen de consultas GET a la API SODA (`$query=…`) hechas el 2026-10-19; los conjuntos se actualizan a diario, así que los conteos derivan. Cada ficha `dato` lleva la URL exacta de la consulta (o del JSON `api/views`) que respondió. Ningún POST. No se copió ningún nombre ni documento de persona natural.

## Fuentes intentadas y abiertas, por tipo

Claves = tipos de la taxonomía. «Abiertas» = descargadas y leídas en la parte pertinente (aunque no dieran ficha).

| Tipo | Intentadas | Abiertas | Observación |
|---|---|---|---|
| dato | 20 | 20 | 19 JSON `api/views` de conjuntos de datos.gov.co y el catálogo (API de descubrimiento); 12 con ficha propia de metadatos y 11 fichas de consultas SODA de conteo sobre p6dx-8zbt, jbjy-vk9h, wi7w-2nvm y e2u2-swiw |
| cce_guia | 20 | 18 | páginas de la base de conocimiento de CCE (manuales de proveedor y de entidad), protocolo de indisponibilidad (PDF escaneado, leído con OCR), páginas de ayudas, release y datos abiertos |
| practica | 9 | 4 | «Nuevo SECOP», noticia del Sistema de Alertas Tempranas, comunicado de febrero de 2025 (copia en Ámbito Jurídico), y una página de formación virtual sin utilidad; 5 más se descargaron y no se leyeron |
| internacional | 2 | 2 | estudio BID/Fedesarrollo (alojado por el IMCO) y caso del Banco Mundial |
| gremio | 1 | 1 | informe de la Cámara de Comercio de Medellín |
| ley, decreto, doc_tipo, cce_concepto, juris, control, academia | 0 | 0 | no se leyó ninguna: el eje 7 no es normativo y la academia corresponde al otro lector del eje |

Total abiertas: 45. Fichas: 27 `dato`, 20 `cce_guia`, 7 `practica`, 5 `internacional`, 1 `gremio` (60). Las consultas SODA de conteo son sobre conjuntos ya contados como fuente; no suman fuentes.

## Fuentes no abiertas

| URL | Error literal / motivo |
|---|---|
| https://preproduccion.colombiacompra.gov.co/sites/cce_public/files/cce_documentos/cce_manual_datos_abiertos.pdf | HTTP 502 («Bad Gateway»; respuesta de 547 bytes en HTML, no PDF). Reintento en el host de producción `www.colombiacompra.gov.co/sites/cce_public/files/cce_documentos/cce_manual_datos_abiertos.pdf`: HTTP 404 |
| https://www.colombiacompra.gov.co/base-conocimiento/desactivacion-consorcios-ut-secop-ii | HTTP 404 |
| https://www.colombiacompra.gov.co/transparencia/funcionarios-y-contratistas (enlace `?p=2616`) | Descargada (200), no leída: fuera de tema |
| https://www.colombiacompra.gov.co/transparencia/tema-de-consulta-normas-politicas-programas-o-proyectos-y-resumen-del-mismo-2026 (enlace `?p=25739`) | Descargada (200), no leída: fuera de tema |
| https://formacionvirtual.colombiacompra.gov.co/mod/page/view.php?id=2255, `id=2256` y `id=2259` | Descargadas (200), no leídas: secciones de la escuela de formación para otros públicos |

Páginas abiertas que no trajeron contenido propio (solo una infografía incrustada): «Requisitos para acceder al SECOP II», «Crear y presentar una Oferta en SECOP II», «Adendas en los procesos de contratación» y «Enviar subsanación a los Documentos del Proceso». No dieron ficha.

## Problemas candidatos

Convención: «señal en datos abiertos» = lo que se puede leer en los conjuntos de datos.gov.co de SECOP II; «no detectable» = no hay columna que lo revele. Las consecuencias en plata que ninguna fuente cuantifica se dicen así; no se estiman.

**PC-A · Cierre de la oferta sin red de seguridad en la plataforma**
- Etapa/decisión/contrato: E2 · D3 · todos.
- Qué pasa: el cronómetro de SECOP II llega a cero y no deja enviar; la oferta solo se modifica o retira antes del cierre; CCE reconoce una escalada de incidentes (4.552 en 2022, 17.787 en 2023, 12.239 en 2024). El único salvavidas es el protocolo de indisponibilidad: certificado de falla general o caso de soporte, y aviso por correo a la entidad ANTES de la hora de cierre; el correo posterior no vale.
- Fichas: F-0854, F-0848, F-0875, F-0876, F-0878, F-0860.
- Plata: la fuente no la da (se pierde el costo de armar la oferta y la oportunidad).
- Señal en datos abiertos: no detectable las fallas; solo se podría mirar si las ofertas se registran cerca del cierre (`fecha_de_registro` de wi7w-2nvm frente a `fecha_de_recepcion_de` de p6dx-8zbt), sin que eso pruebe una falla.

**PC-B · Oferta enviada desde la cuenta equivocada (consorcio o unión temporal)**
- E2 · D3/D1 · todos.
- Qué pasa: la oferta de un proponente plural enviada desde la cuenta de un integrante «no será tenida en cuenta»; cada integrante necesita cuenta con usuarios, el grupo se crea en la plataforma con porcentajes y líder antes del cierre.
- Fichas: F-0855, F-0864, F-0836.
- Plata: no la da la fuente.
- Señal: parcial. ceth-n4bn publica grupos con participación y líder; wi7w-2nvm publica `nit_del_proveedor` por oferta; cruzando se vería una oferta a nombre de un integrante cuando el grupo existía (no se probó el cruce).

**PC-C · El precio que decide es el digitado en la plataforma, no el del anexo**
- E2 · D2 · obra (también aplica a los otros tipos).
- Qué pasa: si el anexo de oferta económica difiere del valor de la lista de precios, la entidad evalúa con el valor de la plataforma, que además «determina el valor a adjudicar»; la plantilla Excel para más de 20 ítems no admite columnas ni fórmulas nuevas y exige «Nivel» en cero. En una falla, la oferta que entra por correo se carga como «oferta externa» y el sobre económico cerrado no se abre.
- Fichas: F-0856, F-0859, F-0877.
- Plata: la fuente no cuantifica; el efecto es directo sobre el precio de la oferta.
- Señal: no detectable (el anexo no es un dato abierto); `valor_de_la_oferta` de wi7w-2nvm muestra el valor cargado, no el anexo.

**PC-D · Adenda que llega después de enviar la oferta**
- E2 · D3 · todos.
- Qué pasa: una adenda al cuestionario obliga a retirar y volver a presentar; si no se hace, la oferta anterior «no será válida» y no puede adjudicarse; la plataforma no deja ofertar hasta «Aplicar modificación».
- Fichas: F-0857, F-0858, F-0838, F-0839.
- Plata: no la da la fuente.
- Señal: parcial. El conjunto de modificaciones a procesos (e2u2-swiw) no sirve (sin datos desde el 2021-02-15); sí el cronograma nuevo f3ev-294c y los documentos cargados (dmgg-8hin, `fecha_carga` y `nombre_archivo`); no se probó cuántas adendas caen en las últimas horas.

**PC-E · Subsanación por mensajes y documentos «obligatorios»**
- E2 · D3 · obra (manual de licitación de obra) y todos.
- Qué pasa: la entidad pide subsanar por la sección de mensajes de SECOP II y el proveedor responde por el mismo canal; la plataforma no deja enviar la oferta si falta algo marcado obligatorio, y el manual para entidades dice que lo obligatorio es lo no subsanable. La confidencialidad de documentos la acepta o rechaza la entidad.
- Fichas: F-0862, F-0863.
- Plata: no la da la fuente.
- Señal: no detectable (los mensajes y las marcas de obligatoriedad no son datos abiertos).

**PC-F · Validación de la planilla de seguridad social (persona natural)**
- E2 · D3 · todos.
- Qué pasa: SECOP II consulta un servicio del Ministerio de Salud; un pago reciente tarda 2 a 4 días hábiles en reflejarse; un tipo de documento «NIT» en persona natural o un espacio en el número dan el mensaje «El servicio web no se encuentra disponible».
- Ficha: F-0865.
- Plata: no la da la fuente.
- Señal: no detectable.

**PC-G · Filtros que esconden o inflan procesos por calidad del dato** (la fuente es el propio conjunto de procesos de SECOP II, p6dx-8zbt, al 2026-10-19)
- E0/E2 · D1 · obra (con interventoría y consultoría donde se dice).
- Qué pasa: (1) `precio_base` = 0 en 351.148 de 9.346.525 procesos (3,76 %), en consultoría 9,1 %, obra 0,9 %, interventoría 0,9 %; (2) 19.383 filas repetidas en obra (13,0 %); (3) la licitación de obra se etiqueta de dos formas («Licitación pública Obra Publica» 31.813 y «Licitación pública» 1.512) y la selección abreviada de menor cuantía de otras dos; (4) 48.691 procesos de obra en estado «Presentación de oferta», 6.722 con fecha de recepción anterior a 2026; (5) `tipo_de_contrato` trae valores como «Decreto 092 de 2017» (1.313.413), «No» (94.975) y «No Especificado» (84.404); (6) procesos de ensayo («Subasta de prueba» 4.755 filas). Un filtro que dependa de una sola etiqueta pierde procesos (falso negativo) y un precio base 0 no es un presupuesto cero.
- Fichas: F-0822, F-0823, F-0824, F-0825, F-0826, F-0828, F-0829, F-0852, F-0880 (un mismo NIT de entidad con hasta 78 nombres distintos en procesos de obra: agrupar por NIT puede mezclar unidades).
- Plata: no la da la fuente; el efecto es no ver un proceso o ver un presupuesto 0 como dato.
- Señal: todas las anteriores son observables con las consultas citadas en las fichas.

**PC-H · El adjudicatario no se puede identificar en los procesos, y hay ceros en contratos y ofertas**
- E2/E4 · D1/D2 · obra.
- Qué pasa: 31.944 de 51.888 procesos de obra adjudicados (61,6 %) tienen «No Definido» en el NIT del adjudicatario; en contratos, 15.657 de 5.643.434 traen «No Definido» como documento y `valor_del_contrato` = 0 afecta a 3,8 % de los de consultoría; 366.594 de 49.874.763 ofertas (0,74 %) valen 0. Para saber quién ganó y a qué precio hay que cruzar procesos, contratos (jbjy-vk9h), ofertas (wi7w-2nvm) y SECOP Integrado (rpmr-utcd). Un cero no debe entrar a un promedio de precios de la competencia.
- Fichas: F-0827, F-0831, F-0833, F-0834, F-0835, F-0844, F-0879 (la marca «Confidencial» no aparece como proveedor: el vacío es «No Definido»).
- Plata: no la da la fuente.
- Señal: observable con los conteos de las fichas.

**PC-I · Conjuntos partidos, muertos o nuevos**
- E0 · D1/D3 · todos.
- Qué pasa: las ofertas están partidas en dos conjuntos (antes y después del 2024-01-01); los documentos del proceso, en cinco (hasta 2021, 2022, 2023, 2024 y desde 2025); el conjunto de modificaciones a procesos no tiene filas desde 2021 aunque el catálogo muestre fecha de 2026; hay conjuntos nuevos (cronograma f3ev-294c publicado el 2026-08-31; proveedores registrados qmzu-gj57 del 2026-09-03) y conjuntos de ejecución, modificaciones, suspensiones, garantías y adiciones que no estaban en el encargo.
- Fichas: F-0832, F-0833, F-0838, F-0839, F-0840, F-0841, F-0842, F-0843, F-0844, F-0845.
- Plata: no la da la fuente.
- Señal: observable en los metadatos citados.

**PC-J · Cambio de plataforma (nuevo SECOP) sin migración de datos**
- E0 · D1 · todos (licitación pública de obra y concurso de méritos en la ventana prevista).
- Qué pasa: CCE anunció en febrero de 2025 un SECOP nuevo, sin migración masiva de datos, con las plataformas anteriores solo para consulta; su cronograma pone la licitación pública y los concursos de méritos entre julio y noviembre de 2026 (la fecha de esta lectura cae dentro). No se encontró ni un comunicado de 2026 que lo confirme ni un listado legible de releases de SECOP II de 2025 y 2026. Sobre el UNSPSC, el pie del sitio muestra cifras de una versión nueva que no cuadran y comunicados titulados «Prueba»: no son citables.
- Fichas: F-0846, F-0847, F-0866, F-0867, F-0868.
- Plata: ninguna fuente la cuantifica para el contratista.
- Señal: no detectable hoy; si el plan se cumple, se vería como procesos nuevos de licitación sin fila en p6dx-8zbt (hipótesis, no verificada).

**PC-K · Límites de acceso: captcha, 403 y falta de responsable de la calidad**
- E0 · D1 · todos.
- Qué pasa: el buscador público de SECOP II pide captcha; el 403 Forbidden se resuelve con un caso en la mesa de servicio (formato firmado, cédula o certificado de existencia, y declarar si hay VPN, proxy o conexión desde fuera de Colombia); CCE dice que no responde por la veracidad ni la calidad de lo que registran las entidades; la Cámara de Comercio de Medellín y el estudio BID/Fedesarrollo dicen lo mismo con otras palabras.
- Fichas: F-0851, F-0852, F-0853, F-0869, F-0874.
- Plata: no la da la fuente.
- Señal: no detectable.

**PC-L · Señales de alerta que otros miran sobre el contratista y la entidad**
- E2/E4 · D1 · todos.
- Qué pasa: CCE anunció (mayo de 2025) alertas por proceso con único proponente, contratación directa, contratos que pasan la anualidad y proveedores con muchos contratos activos a la vez; el caso del Banco Mundial cita un 56 % de oferente único en contratos regionales de 2017 (cifra de un tercero, anterior a los documentos tipo obligatorios). No hay umbrales públicos.
- Fichas: F-0849, F-0850, F-0873, F-0872.
- Plata: no la da la fuente.
- Señal: sí. Oferentes por proceso (`respuestas_al_procedimiento`, `proveedores_unicos_con` en p6dx-8zbt; filas por proceso en wi7w-2nvm y hgi6-6wh3); contratos activos por proveedor y vencimiento después del 31 de diciembre (`fecha_de_fin_del_contrato` y `fecha_de_firma` en jbjy-vk9h). Las alertas de CCE mismas no se publican.

**PC-M · Modalidad registrada que no corresponde**
- E0/E2 · D1 · obra.
- Qué pasa: el estudio BID/Fedesarrollo halló contratos del ICBF registrados como interadministrativos con contratistas que no son entidades estatales (877 contratos, $464.119.964.665) y procesos de vías registrados como concurso de méritos. Un filtro por modalidad hereda esos errores. Datos de 2014 a abril de 2019.
- Fichas: F-0870, F-0871.
- Plata: la del ICBF, de otra clase de contrato; no aplica a obra.
- Señal: observable solo si se compara modalidad con tipo de contrato (por ejemplo, tipo Obra con concurso de méritos); no se midió hoy.

## Temas cubiertos

- Datasets de datos.gov.co: los siete del encargo (procesos p6dx-8zbt, documentos dmgg-8hin, contratos jbjy-vk9h, ofertas wi7w-2nvm, proponentes hgi6-6wh3, consorcios ceth-n4bn, PAA 9sue-ezhx) con número de columnas y descripción, y doce más que el encargo no listaba (histórico de ofertas, cronograma, modificaciones a procesos, ejecución, suspensiones, modificaciones a contratos, adiciones, garantías, multas SECOP I, proveedores registrados, SECOP Integrado, BPIN).
- Señales de alerta en el dato: precio_base 0, «No Definido» (NIT del adjudicatario, tipo de contrato, estado), duplicados, procesos de prueba, ceros en contratos y ofertas, conteos del 2026-10-19.
- Cambios de plataforma: nuevo SECOP (plan, cronograma), incidentes de la plataforma, histórico de cambios (sin listado legible).
- Manuales para el proveedor: presentar ofertas (cronómetro, adendas, plantilla Excel, sobres, proponente plural), subsanación y confidencialidad (manual de entidad), validación de planilla de seguridad social, protocolo de indisponibilidad.
- Límites: captcha, 403 Forbidden, responsabilidad por la calidad.

## Temas sin cubrir

- **NIT compartidos**: solo se midió el caso de un mismo NIT de entidad con varios nombres (F-0880); no se midió un mismo NIT o documento de proveedor con varios nombres, ni procesos de prueba por NIT. **«Confidencial»**: resultado negativo (F-0879), sin explicar cómo se publica la confidencialidad en los datos.
- Releases de SECOP II de 2025 y 2026 (qué cambió para el proveedor): no se halló un listado legible; la página «Histórico de Cambios y Mejoras» remite a otra cuya última actualización es de octubre de 2024. Pueden estar en contenido incrustado que no se descargó.
- Manuales de «Presentar observaciones», «Manifestar interés», «Incumplimientos», «Concurso de méritos abierto», «Búsqueda pública» y «Gestión contractual»: listados en la página de manuales, no abiertos.
- Diccionario de columnas más allá de la descripción de cada columna que ofrece `api/views`: solo se leyó el de los conjuntos citados; varios conjuntos (hgi6-6wh3) casi no traen descripciones.
- Control (Contraloría, Procuraduría, SIC) y gremios sobre señales de alerta en SECOP: ninguna fuente abierta; la única referencia a la Contraloría es el origen declarado del conjunto de suspensiones.
- La clave que une procesos con ofertas, proponentes y contratos (formato de `id_del_proceso`, `id_del_proceso_de_compra`, `proceso_de_compra`): no se comprobó con una consulta.
- Qué proporción de procesos de obra, interventoría y consultoría activos hoy aparece en cada conjunto: no se midió.
- Documentos tipo, circulares y normas sobre SECOP II como obligatorio (Ley 1150 art. 3 y reformas): fuera del eje por ser normativo; el estudio BID lo menciona y no se cotejó.

## Resultado de las consultas de «Confidencial» y NIT compartidos

- «Confidencial» como proveedor en procesos (obra, interventoría, consultoría) y en contratos (todos los tipos): 0 filas en ambos (F-0879). La primera consulta sobre todos los tipos de procesos falló con «Empty reply from server» (HTTP 000) y se reemplazó por la de los tres tipos del alcance.
- NIT de entidad con más de un nombre en procesos de obra: 78, 32, 30, 22 y 16 nombres en los cinco primeros NIT (F-0880); causa sin determinar.

## Incidencias del lector

- El primer intento de guardar fichas con cita partida falló por diferencias de espacios y de mayúsculas inicial; se corrigieron antes de guardar. Las fichas que se escribieron de una tanda fallida se borraron y se volvieron a generar completas (todas estas eran del propio rango).
- Una nota de la ficha F-0837 quedó con una frase de borrador; se corrigió.
- El texto del protocolo de indisponibilidad se obtuvo por OCR (PDF escaneado de 32 páginas): las citas del protocolo pueden traer signos de OCR (corchetes por paréntesis).
- Carga alta de la máquina (promedio de carga 9 en 4 núcleos) durante el OCR; no afectó los resultados.
- Una consulta de conteo sobre ofertas devolvió «Empty reply from server» en la primera vez y respondió al reintento.
