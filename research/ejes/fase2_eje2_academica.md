# Fase 2 · Eje 2 (Planeación, estudios previos, presupuesto oficial y matriz de riesgos) · lente académica · notas del lector

> Para: sesión · Estado: referencia · Sustituido por: —

Lector: «lector fase2 eje2-academica». Alcance: obra pública, interventoría y consultoría. Rango F-0281 a F-0340. Eje de problemas.

## 1. Tiempos y cómo terminó
- Inicio: 2026-10-02 13:51:03 UTC. Fin: 2026-10-02 14:08:11 UTC (reloj de la máquina; unos 17 minutos).
- Reanudación: el rango estaba vacío (ninguna ficha F-0281 a F-0340 al empezar), así que se escribió desde F-0281. Resultado: 58 fichas (F-0281 a F-0338); F-0339 y F-0340 quedan libres.
- Cómo terminó: **saturación**. Las 10 últimas fuentes leídas (k2, l3, m1, m2, n1, n2, o1, j3, j4, e5; tres tipos: academia, control e internacional) no trajeron ningún problema nuevo según la taxonomía (etapa, decisión, módulo): repiten estudios previos incompletos, presupuesto mal estimado, riesgos trasladados y adiciones. Una sola cosa marginal (un contrato firmado con el municipio de ejecución equivocado, F-0336) cabe en el problema ya existente de «estudios previos con errores». No fue el tope de 40 fuentes ni los 90 minutos.
- Salvedad sobre el tope: se descargaron 42 archivos (40 de academia, 1 de control, 1 internacional). De ellos, 6 se descartaron con solo leer la portada (fuera de alcance: México, APP, veeduría, corrupción, vivienda de interés social, tema distinto); leídos con sustancia: 36. El tope de 40 se rebasó por 2 descargas de solo portada; no fue la causa de parada.
- Todas las fichas son de fuentes con estado_lectura `parcial` (la sección o párrafo citado), salvo las que dicen otra cosa en su campo.

## 2. Fuentes intentadas y abiertas por tipo
Claves: tipos de la taxonomía.
- `academia`: intentadas 51, abiertas 40. Con ficha: 24 (tesis de maestría y de especialización de Nacional, Uniandes, UPB y Militar; artículos de Opinión Jurídica, IUSTA, Ingeniería y Ciencia, Vialuris, Dyna, Administración & Desarrollo, Revista Digital de Derecho Administrativo). Abiertas sin ficha: 16 (ver sección 6).
- `control`: intentadas 1, abiertas 1 (informe de auditoría de la Contraloría sobre obras inconclusas, 2011; 2 fichas).
- `internacional`: intentadas 1, abiertas 1 (Banco Mundial, Benchmarking Infrastructure Development 2020; sin ficha: no trae nada de planeación de obra que sea específico de Colombia).
- `ley`, `decreto`, `doc_tipo`, `cce_guia`, `cce_concepto`, `juris`, `gremio`, `practica`, `dato`: 0 en esta lente. (La jurisprudencia aparece solo a través de lo que dicen los artículos, A6; ninguna sentencia se abrió.)

## 3. Fuentes no abiertas (error literal)
- Repositorio de la Universidad Santo Tomás (3 URL, tesis de presupuesto oficial y de factores de retraso en Neiva): HTTP 403, HTML «Attention Required! | Cloudflare … Sorry, you have been blocked. You are unable to access usta.edu.co». Reintentado una vez con la misma URL: igual.
- Repositorio de la Universidad Libre (3 URL: estudios previos en obra pública, evolución de la matriz de riesgo, documentos tipo de transporte): HTTP 200 con muro «Making sure you're not a bot! … Anubis could not load its JavaScript».
- Revista de Derecho Administrativo de la Universidad Externado (ficha de «Las fallas de planeación y su incidencia en el contrato estatal de obra»): HTTP 200 con «Bot Detection Please wait while we check if you are a Human … BunkerWeb».
- Repositorio de la Universidad Piloto (matriz de riesgo en contratación estatal): HTTP 500 (página XHTML de error de servidor) y, en otra URL del mismo repositorio, HTTP 200 con cuerpo vacío (0 bytes).
- Repositorio de Uniandes, handle `1992/34107` (matriz de riesgos: metodología de análisis de datos): HTTP 200 con «Bot Detection Please prove that you are Human».
- Repositorio de la Javeriana (item de «Efectos de las variaciones de los precios en los contratos de obra pública»): HTTP 200, aplicación Angular sin contenido (título «DSpace»).
- Nota: las tesis de Santo Tomás y Libre que serían centrales para el eje (presupuesto oficial de obra pública, estudios previos) quedaron fuera por muro anti-robot; el eje las pide y no se pudo leerlas.

## 4. Problemas candidatos
Formato: título · etapa · decisión · tipo de contrato · fichas · consecuencia en plata (solo si la fuente la da) · señal en datos abiertos de SECOP II.

1. **Presupuesto oficial con errores aritméticos o de ítems que la entidad corrige tras las observaciones, compensando otros precios** · E1 · D2 · obra · F-0307, F-0299, F-0317 · plata: la fuente no da pesos; reporta que se corrigió el 16,20 % de los APUs en 7 de 16 licitaciones del INVIAS (2016-2017) y 5,32 % en 5 de 11 de 2021 (los conteos de procesos cuadran con la tabla de la fuente; los porcentajes de APUs no se pudieron recalcular) · señal: no detectable (el presupuesto por ítem va en anexo; solo el valor total del proceso es columna abierta).
2. **Precios del presupuesto oficial que no coinciden con el precio de referencia oficial ni con el mercado, y presupuestos de consultoría que son solo el monto disponible** · E1 · D2 · obra y consultoría · F-0301, F-0317, F-0326, F-0320 · plata: un ítem pasa de $110.854,57 (referencia) a $286.490 (oficial), es decir 2,58 veces (recalculado); sin más cifra · señal: no detectable.
3. **Precio unitario sin cantidades publicadas (el valor total puede subir si se baja el precio)** · E2 · D2 · obra · F-0318 · plata: sin cifra · señal: no detectable.
4. **Ofertas desbalanceadas: descuento concentrado en ítems poco representativos (hasta 60 % por ítem) y reglas de piso por ítem (90 %-100 % del oficial) que pueden causar rechazo** · E2 · D2/D3 · obra · F-0303, F-0319 · plata: sin cifra en pesos · señal: no detectable con columnas de procesos (solo valor total).
5. **Matriz de riesgos que traslada al contratista riesgos imprevisibles o propios de la entidad, o cubre riesgos de la entidad con los imprevistos del AIU** · E1/E4 · D4 · obra · F-0289, F-0292, F-0288, F-0287, F-0290, F-0291 · plata: pérdida del componente de imprevistos del AIU; sin cifra · señal: no detectable.
6. **Audiencia de riesgos y observaciones al proyecto de pliego que casi nadie usa: el oferente acepta la distribución al presentar oferta** · E1/E2 · D3/D4 · obra · F-0285, F-0286, F-0291, F-0298 · plata: sin cifra · señal: conteo de observaciones por proceso no verificado en datos abiertos.
7. **Nulidad o responsabilidad por falta de planeación: el contratista pierde la utilidad y devuelve el anticipo, o comparte responsabilidad si pudo advertir la falla** · E1/E4 · D1/D4 · obra · F-0281, F-0282, F-0312, F-0313 · plata: utilidad proyectada y anticipo indexado (sin cifra) · señal: no detectable.
8. **Estudios y diseños insuficientes y cambios de diseño que producen sobrecostos, adiciones y prórrogas** · E1/E4 · D4 · obra e interventoría · F-0293, F-0294, F-0296, F-0305, F-0310, F-0311, F-0332, F-0333, F-0334, F-0335 · plata: túnel piloto 29,7 % de sobrecosto y túnel principal 47,6 % (recalculados; la fuente dice 29,8 % y 49 %) · señal: valor adicionado y plazo adicionado por contrato (dataset de contratos) podrían verse; no verificado.
9. **Adición como regla (tope del 50 % usado de forma generalizada) y prórrogas masivas** · E4 · D4 · obra · F-0308, F-0327, F-0328, F-0329 · plata: tope 50 % del valor inicial; las cifras de la fuente de 217 contratos viales se contradicen entre capítulos (29 % frente a 20 % de sobrecostos) y no se repiten · señal: relación valor adicionado/valor inicial por contrato; no verificado.
10. **Procesos que se caen después de convocados (tiempo y dinero de preparar oferta perdidos)** · E2 · D1 · todos (licitación y concurso de méritos incluidos) · F-0314, F-0315, F-0316 · plata: sin cifra; 7,2 % a 8,9 % según modalidad en el sector de construcción (SECOP I, 2017) · señal: estado del proceso (desierto, cancelado, suspendido) es columna de procesos; no verificado.
11. **Pliegos con reglas de evaluación poco claras y habilitantes discrecionales o desproporcionados** · E1/E2 · D1/D3 · obra · F-0309, F-0330, F-0331 · plata: sin cifra · señal: no detectable.
12. **Presupuesto de interventoría y consultoría insuficiente (factor multiplicador bajo, honorarios sin referencia, costos indirectos sin estudio)** · E1 · D2 · interventoría y consultoría · F-0321, F-0322, F-0323, F-0324, F-0326 · plata: tope de 2,4 sobre el costo del personal en el 63 % de los presupuestos por factor multiplicador de un municipio (no recalculable) · señal: no detectable.
13. **Interventoría con pocos oferentes y requisitos financieros incoherentes con el monto** · E2 · D1 · interventoría · F-0306, F-0325 · plata: sin cifra; 5 de 6 procesos de un municipio con un solo oferente (recalculado) · señal: número de ofertas por proceso (dataset de ofertas) sí podría verse; no verificado.
14. **Riesgo de precio durante la ejecución asumido por el contratista (contratos de 4 a 12 meses, sin reajuste en la lectura de la fuente)** · E4 · D4 · obra · F-0302, F-0283 · plata: sin cifra · señal: no detectable.

## 5. Temas cubiertos y sin cubrir (lista de la lente)
Cubiertos (con ficha, desde lo que dicen los trabajos académicos, A6):
- Estudios previos incompletos como causa de sobrecostos, adiciones y prórrogas (F-0293, F-0294, F-0305, F-0310, F-0332, F-0334, F-0335).
- Presupuesto oficial de obra y su construcción con APU (F-0307, F-0299, F-0301, F-0317, F-0318, F-0333).
- AIU y su componente de imprevistos (F-0289, F-0290, F-0320).
- Matriz de riesgos y audiencia de riesgos (F-0285, F-0286, F-0287, F-0288, F-0291, F-0292, F-0297, F-0298, F-0337).
- Proyecto de pliego y observaciones (F-0285, F-0291, F-0299, F-0309).
- Planeación, nulidad y responsabilidad del contratista (F-0281, F-0282, F-0312, F-0313).
- Presupuestos de interventoría y consultoría (F-0321 a F-0326, F-0304, F-0306, F-0324, F-0325).
- Procesos fallidos tras la convocatoria (F-0314 a F-0316).
Sin cubrir (declarados):
1. Texto vigente de los artículos 2.2.1.1.1.6.1 a 6.3 y 2.2.1.1.2.1.1 del Decreto 1082 con sus reformas: es del lente institucional; aquí solo aparece lo que un artículo de 2016 dice de ellos (F-0337, anterior a la reforma).
2. Texto del CONPES 3714 y de las matrices de riesgo de los documentos tipo vigentes: no se abrieron.
3. Plazo del proyecto de pliego y de las observaciones, y el aviso de convocatoria (texto vigente): ninguna fuente académica abierta los analiza.
4. «Plazos cortos» para ofertar y presupuestos «desactualizados» con una cifra medida: solo hay lo del INVIAS (F-0301) y una tesis de Santo Tomás que no abrió (muro).
5. Ninguna fuente es posterior a 2022: toda ficha es anterior a las reformas de 2025-2026 y a los documentos tipo vigentes; ninguna sirve para afirmar el régimen actual (reverificar).
6. Sentencias del Consejo de Estado leídas en su texto: ninguna (solo a través de los artículos; ver F-0281, F-0282, F-0313).
7. Interventoría y consultoría: solo muestras municipales pequeñas (Socorro, Saravena, Valle del Cauca) y una tesis de 2015; no hay evidencia sobre los documentos tipo de interventoría y consultoría.

## 6. Fuentes abiertas sin ficha (por qué)
Tesis de la UNAD sobre responsabilidad fiscal por planeación (casos hipotéticos de la autora); tesis de la Militar sobre planeación y siniestro (principios, sin dato); artículo español sobre riesgos imprevistos en obras (otro país); artículo de 2003 sobre órdenes de cambio (anterior a la Ley 1150); artículo sobre riesgos en contratación de servicios profesionales (otro objeto); tesis del Politécnico Grancolombiano sobre ofertas rechazadas (cifras de terceros sin tabla de base, algunas inverosímiles; no se usó ninguna); plan de negocio de consultoría presupuestal (2024, afirmaciones de emprendedor); comentario de 2009 a la reforma de la Ley 80 (anterior a la Ley 1150 vigente); tesis de la Militar sobre anualidad y reservas (2012, anterior al régimen actual); tesis de pliego tipo (confunde el decreto y la ley que lo reglamenta); Banco Mundial (sin dato de Colombia sobre planeación de obra). Solo portada: veeduría de proyectos, interventoría y anticorrupción, indirectos de vivienda de interés social, corrupción en contratación, MIPYMES en México, APP del Valle.

## 7. Hallazgos que conviene que la sesión sepa
- Dos cifras de las fuentes no cuadran y no se repiten como hecho: sobrecosto del túnel principal (49 % frente a 47,6 % recalculado, F-0311) y 29 % frente a 20 % de sobrecostos en el mismo estudio de 217 contratos viales (F-0327). Un porcentaje del 80 % de debilidades se quedó en 85 % al sumar las categorías (F-0332).
- La evidencia más útil para el producto es de oferta: los precios oficiales no coinciden con la lista de referencia (2,58 veces en un ítem), se corrigen tras observaciones y hay ofertas que concentran el descuento en ítems poco representativos (F-0301, F-0307, F-0303); ninguno de esos tres es detectable en los datos abiertos de SECOP II con las columnas de procesos.
- Lo que los trabajos dicen de normas (Decreto 1510 de 2013, Decreto 1082 de 2015 en la numeración de 2016, Ley 80 art. 40) es lo que ellos afirman; se marcó «anterior a la reforma; reverificar» donde corresponde.
