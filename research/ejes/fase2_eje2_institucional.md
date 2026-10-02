# Fase 2 · Eje 2 (Planeación, estudios previos, presupuesto oficial y matriz de riesgos) · lente institucional · notas del lector

> Para: sesión · Estado: referencia · Sustituido por: —

Lector: «lector fase2 eje2-institucional». Alcance: obra pública, interventoría y consultoría. Rango F-0221 a F-0280. **Reanudación:** el rango estaba vacío al empezar (la corrida anterior se cortó antes de guardar fichas); esta corrida escribió **58 fichas, F-0221 a F-0278**, y dejó libres F-0279 y F-0280. Solo GET. Ninguna ficha lleva `verificacion_adversaria`.

## 1. Tiempos
- Inicio: 2026-10-02 13:29:48 UTC. Fin: 2026-10-02 13:51 UTC aprox. (unos 21 minutos de reloj).

## 2. Cómo terminó
**Tope de 40 fuentes abiertas.** Contando todo lo abierto —incluidos los decretos y leyes leídos solo para cotejar reformas y los documentos descartados por no pertinentes— se abrieron 55 fuentes; 26 de ellas sostienen fichas. No fue el tiempo (21 de 90 minutos) y **no hubo saturación**: entre las últimas diez fuentes con ficha todavía aparecieron problemas nuevos (la ventana corta entre el pliego definitivo y la recepción de ofertas, la oferta «artificialmente baja» medida contra el estudio del sector de la propia entidad, el plazo planeado con turnos de 24 horas). Quedaron sin leer temas de la lista (ver 6).

## 3. Fuentes intentadas y abiertas por tipo (contadas por fuente distinta)
| Tipo | Intentadas | Abiertas | Con ficha |
|---|---|---|---|
| `ley` | 6 | 6 | 4 (Ley 1150, Ley 80, Ley 1474, Ley 1682); Ley 1882 y Ley 2069 solo para cotejo |
| `decreto` | 14 | 14 | 3 (Decreto 1082 vía relatoría, Decreto 0997 de 2026, Decreto 399 de 2021); los otros 11 (1860, 2106, 579, 442, 142, 310, 680, 594, 392, 342, 287) se abrieron solo para cotejar si reforman los artículos citados |
| `doc_tipo` | 4 | 3 | 3 (dos matrices de riesgos y el documento base de interventoría de infraestructura social); la Resolución 952 de 2025 se descargó pero es un PDF sin texto |
| `cce_guia` | 6 | 6 | 5 (manual M-ICR-01, guía de estudios del sector V3, guía de obra pública 2026, guía de ofertas artificialmente bajas, CONPES 3714 clasificado aquí); el borrador «comentarios» de la guía de obra (nov-2025) se leyó y se descartó por la versión firmada |
| `cce_concepto` | 14 | 14 | 6 (C-059, C-398A, C-857, C-944, C-1208, C-1280 de 2026); C-1242, C-1366, C-1381, C-1294, C-493, C-352, C-1101 y C-003 se abrieron solo para elegir |
| `juris` | 2 | 2 | 1 (Consejo de Estado, 12-abr-2024, exp. 68440); una sentencia de 2016 (exp. 35.763, INVÍAS contra un consultor) se descargó y no se usó |
| `control` | 4 | 2 | 1 (Contraloría, obras inconclusas, 2011); la Directiva 3 de 2024 de la Procuraduría (espejo de la CRA) se abrió y no es de este eje |
| `internacional` | 2 | 2 | 0 (dos notas sectoriales del Banco Mundial sobre transporte y anticorrupción: no tratan planeación de obra) |
| `gremio` | 4 | 3 | 1 (Transparencia por Colombia, cuaderno 22 de 2014); un pronunciamiento de la CCI sobre inclusión y las recomendaciones de Transparencia sobre la OCDE se abrieron y no son de este eje |
| `practica` | 1 | 1 | 1 (guía GU-DP-017 del IDU, versión 3) |
| `dato` | 2 | 2 | 1 (conjunto p6dx-8zbt de procesos; el diccionario del PAA 9sue-ezhx se leyó sin ficha) |
| `academia` | 0 | 0 | 0 (por la lente) |

## 4. Fuentes no abiertas (error literal) y observaciones de acceso
- `https://www.contraloria.gov.co/documents/20125/344141/OBRAS+INCONCLUSAS.pdf/…` con agente de navegador: «403 Forbidden · Microsoft-Azure-Application-Gateway/v2». Con `curl` simple abrió (200, 14 páginas). Anotar: para contraloria.gov.co el agente de navegador estorba; para SECOP es al revés.
- `https://infraestructura.org.co/cci-solicita-los-entes-contratantes-actualizar-los-presupuestos-de-los-proyectos-previa-la` (URL truncada por el buscador; también probé con el resto del título): «Página no encontrada» (404). No abierta: solo se sabe por el buscador que existe un comunicado de la CCI de 2022 sobre presupuestos desactualizados; no sostiene ninguna ficha.
- `https://apps.procuraduria.gov.co/gp/gp/operador_preventivo_pgn.html`: «curl: (60) SSL certificate problem: unable to get local issuer certificate». No se desactivó la verificación; no abierta.
- `https://www.colombiacompra.gov.co/wp-content/uploads/2025/12/Resolucion-952-de-2025.pdf`: descargó (12 páginas) pero `pdftotext` no devuelve texto (escaneado). No se hizo OCR; no leída.
- `CCE-DES-MA-02 Manual metodológico del sistema de administración de riesgos V6` (colombiacompra.gov.co): aparece en la búsqueda de medios; es el sistema de riesgos internos de la agencia, no el manual de riesgos del proceso de contratación; no abierto.
- Fuentes de prensa que devolvió el buscador (Portafolio, El Colombiano, Infobae, El Tiempo, Semana, Radio Nacional y otras): vistas solo como pista, no abiertas ni usadas.

## 5. Problemas candidatos
| Título | Etapa | Decisión | Contrato | Fichas | Consecuencia en plata (si la fuente la da) | Señal en datos abiertos de SECOP II |
|---|---|---|---|---|---|---|
| Estudios y diseños incompletos o desactualizados al abrir el proceso: adiciones, prórrogas y mayor permanencia; el contratista gana el incumplimiento y pierde la plata si no prueba el sobrecosto | E1 (origen) y E4 | D4 | obra | F-0229, F-0239, F-0240, F-0250, F-0252, F-0268 | Un contratista reclamó $6.280.527.764 por mayores cantidades y el Consejo de Estado los negó por falta de prueba, aunque declaró el incumplimiento de la entidad (F-0252); la Contraloría atribuyó adiciones injustificadas a estudios previos deficientes (F-0239, 2011, muestra pequeña) | No detectable en el conjunto de procesos; en el de contratos, adiciones y prórrogas por contrato (sin verificar) |
| El presupuesto oficial funciona como techo duro: ofertar por encima es causal de rechazo, y un presupuesto mal armado (precios, cantidades, garantías, AIU) sale del estudio del sector | E1 y E2 | D2 y D3 | obra, interventoría, consultoría | F-0265, F-0233, F-0235, F-0246, F-0275, F-0276 | La fuente no da cifra; la guía de estudios del sector dice que el presupuesto no puede apoyarse solo en la cotización más baja | `precio_base` existe en el conjunto de procesos (p6dx-8zbt); comparar con `valor_total_adjudicacion` no se midió |
| Riesgo de cantidades y de diseño trasladado al oferente en precio global, y confusión entre precio global y precios unitarios con cantidades referenciales | E1 y E2 | D2 y D4 | obra | F-0241, F-0242, F-0243, F-0244, F-0273 | No da cifra; la guía dice que en precio global no se reconocen sobrecostos por errores de cantidades «salvo hechos imprevisibles», y que el oferente puede observar la mala estructuración del presupuesto en la etapa de observaciones | No detectable: la forma de pago no es columna del conjunto de procesos |
| Matriz de riesgos con regla por defecto contra el contratista y traslados sin límite (cláusulas ineficaces si cierran el reclamo de equilibrio o eximen a la entidad de sus datos y estudios) | E1 y E2 | D4 | todos | F-0228, F-0231, F-0232, F-0238, F-0248, F-0249, F-0251, F-0253, F-0254, F-0255, F-0264, F-0266, F-0272 | No da cifra; el CONPES 3714 y la sentencia de 2024 anulan por ineficaz una cláusula de pliego que descargaba la demora predial al contratista | No detectable (no hay columna de matriz de riesgos ni de fecha de la audiencia en lo leído) |
| AIU: la ley no regula los imprevistos; cada entidad pone su porcentaje; se confunden imprevistos, ítems no previstos y mayores cantidades, y nacen falsas expectativas de cobro | E1 y E4 | D2 y D4 | obra | F-0236, F-0237, F-0256, F-0257, F-0258, F-0275, F-0277 | El IDU separa una bolsa de mayores cantidades e ítems no previstos de hasta 15 % del presupuesto oficial (hasta 30 % si el contrato incluye estudios y diseños), como política propia de una entidad (F-0257) | No detectable |
| Oferta «artificialmente baja» medida contra el costo estimado por la propia entidad: un estudio del sector sobrestimado vuelve sospechosa una oferta normal | E2 | D2 y D3 | todos | F-0271, F-0233 | Con menos de 5 ofertas, aclaración a las que quedan 20 % o más por debajo del costo estimado (F-0271) | `precio_base` frente a oferta adjudicada: sin verificar |
| Ventanas cortas entre la publicación de la fase de selección y la recepción de ofertas | E2 | D1 | obra | F-0260, F-0259, F-0222, F-0223, F-0227, F-0267 | No aplica | Sí, medida: en 1.867 licitaciones públicas de obra de 2026, 17,5 % con 10 días o menos y 52,3 % con 14 o menos entre la fase de selección y la fecha de recepción (F-0260); la fase Borrador aparece en 35,5 % de las licitaciones de obra (F-0259) |
| Respuestas a observaciones del proyecto de pliego que pasan a integrar el pliego y estudio previo publicado: lo que no se observa a tiempo no se discute | E1 | D1 | todos | F-0222, F-0223, F-0227, F-0267 | No aplica | Parcial: solo la fase inicial del proceso (F-0259), no las observaciones |
| Decreto 0997 de 2026: los nuevos análisis de planeación (ciclo de vida, sostenibilidad, proporcionalidad) rigen por escalones de 6 a 15 meses desde una publicación cuya fecha no se halló | E1 | D1 | todos | F-0225, F-0226, F-0230, F-0263 | No aplica | No detectable; la fecha del Diario Oficial queda sin verificar (la tiene el eje 1) |
| Valor estimado de consultoría: el precio base es 0 en 14,3 % de los concursos de méritos de consultoría de 2026 (207 de 1.448), frente a 0,3 % en interventoría y 0,07 % en licitación de obra | E1 | D2 | consultoría | F-0224, F-0261 | No da cifra | Sí: `precio_base = 0` (F-0261); un cero es ausencia de dato, no presupuesto cero |
| El ejemplo oficial del factor multiplicador de una consultoría no cuadra consigo mismo (2,19 impreso, 2,42 con las partidas) | E1 | D2 | consultoría | F-0247 | Diferencia de cerca de 10 % del valor de la consultoría entre 2,19 y 2,42 | No detectable |
| Predios y turnos: la adquisición predial es del Estado en transporte y la ley manda planear con tres turnos de 24 horas; un plazo calculado así no es comparable | E1 | D4 | obra | F-0269, F-0270, F-0251 | No da cifra | No detectable |

## 6. Cobertura de la lista del eje
**Cubiertos (al menos una ficha):** contenido del estudio previo y análisis del sector (arts. 2.2.1.1.1.6.1 y 2.2.1.1.2.1.1, con las reformas de los Decretos 399 de 2021 y 0997 de 2026: F-0221, F-0224, F-0225, F-0226, F-0230, F-0233, F-0234); cómo se calcula el presupuesto oficial de obra con APU y AIU, forma de pago, factor multiplicador y bases de precios (F-0233, F-0235, F-0236, F-0237, F-0241 a F-0247, F-0256 a F-0258, F-0273, F-0275 a F-0277); matriz de riesgos (Ley 1150 art. 4, Decreto 1082 arts. 2.2.1.1.1.6.3 y 2.2.1.2.1.1.2, manual M-ICR-01, CONPES 3714, matrices de los documentos tipo de infraestructura social, jurisprudencia de 2024: F-0228, F-0231 a F-0232, F-0238, F-0248, F-0249, F-0251, F-0253 a F-0255, F-0264, F-0266, F-0272); proyecto de pliego y plazo de observaciones (Ley 1150 art. 8, Decreto 1082 arts. 2.2.1.1.1.7.1 y 2.2.1.1.2.1.4, concepto C-398A: F-0222, F-0223, F-0227, F-0267); aviso de convocatoria (F-0262); contenido del pliego (F-0263); problemas reales (F-0239, F-0250, F-0252, F-0259 a F-0261, F-0271, F-0274).

**Sin cubrir:**
- Procuraduría: ningún informe sobre planeación contractual (el sitio de apps de la Procuraduría falló por certificado y la Directiva 3 de 2024 trata planes de desarrollo, no contratación).
- Contraloría: solo un informe de 2011 (seis entidades de defensa y justicia); informes recientes sobre estudios y diseños, y el registro de obras inconclusas, no se abrieron (solo prensa).
- Presupuestos desactualizados: el pronunciamiento de la CCI (2022) no abrió (404); sin dato propio sobre desfase entre presupuesto oficial y precio de mercado.
- Bases oficiales de precios de obra (INVÍAS, IDU, UPIT): solo se sabe que la guía las cita; no se abrieron ni se comparó ningún APU.
- Documentos tipo de obra de infraestructura de transporte y sus matrices de riesgos; matriz de interventoría de transporte e infraestructura social (solo se abrió la matriz de obra y de consultoría de infraestructura social).
- Plazo mínimo de la licitación y avisos previos de apertura (el C-398A menciona avisos de 10 o 20 días y el plazo de licitación de la Ley 80 art. 30; no se abrió el texto vigente: sin verificar).
- Plan Anual de Adquisiciones (conjunto 9sue-ezhx): solo se leyó el diccionario; no se cruzó con los procesos.
- Banco Mundial y OCDE: dos notas del Banco Mundial abiertas sin contenido sobre planeación de obra; OCDE no abre desde aquí.
- Ley 1742 de 2014 (modifica el art. 20 de la Ley 1682) no se abrió.

## 7. Advertencias para quien use estas fichas
- **Vigencia del Decreto 0997 de 2026:** el texto de estudios previos y análisis del sector que rige hoy para casi todas las entidades es el del Decreto 399 de 2021 (F-0224, F-0225); el del 0997 entra por escalones desde una fecha de Diario Oficial no hallada (el rótulo del PDF dice 4-ago-2026). El art. 8 (pliegos) entra antes (día siguiente a la publicación, art. 14). Ninguna ficha da por vigente el texto nuevo.
- **La relatoría de Colombia Compra no consolida el Decreto 1082:** los artículos 2.2.1.1.1.6.3, 2.2.1.1.2.1.2, 2.2.1.1.2.1.4, 2.2.1.1.1.7.1 y 2.2.1.2.1.1.2 están transcritos del texto original; se cotejó que ninguno de los decretos abiertos los reforma, pero **no se abrieron todos los decretos modificatorios**, por eso `vigencia_verificada` es un objeto con la lista de lo cotejado y sus límites en `reformas_cotejadas`, no una verificación completa.
- **Manual de riesgos (2017):** el concepto C-1208 de 2026 recuerda que el Consejo de Estado lo dejó sin fuerza obligatoria; es una guía.
- **Hipótesis del eje 3 sobre el AIU desglosado «obligatorio» en la Ley 80:** ninguna fuente abierta de este eje lo atribuye a la Ley 80; Colombia Compra lo trata como decisión de la entidad según el sistema de precios (F-0236, F-0237). No se agotó la búsqueda en la ley; el eje 3 debe comprobarlo.
- **Cifra que no cuadra:** F-0247 (factor multiplicador 2,19 frente a 2,42). F-0257 (IDU, 15 %) trae un rango de la AACE que no coincide con su propia tabla (de -5 % a +15 % en el texto, de 0 % a +15 % en la tabla).
- **Datos de SECOP II (F-0259 a F-0261):** son consultas por GET del 2-oct-2026 sobre procesos publicados del 5-ene al 30-sep-2026; cambian con cada actualización del conjunto (última: 2026-10-01 20:16 UTC). Las fechas de fase no dicen cuánto duró el borrador del pliego.
- **Sin nombres de personas:** las carátulas de varias fuentes (guía del IDU, documento base, informe de la Contraloría) traen nombres de funcionarios; no se registraron. De la sentencia de 2024 se registra la entidad y no el contratista ni el perito; el ponente aparece como atribución bibliográfica.
- **Clasificación pendiente para el PC1:** el CONPES 3714 no tiene tipo en la taxonomía (se usó `cce_guia`, A3); los gremios y los órganos de control tampoco tienen nivel A (se usó A7 y A6 con nota en cada ficha).
- **Reproducción de pie de página:** las páginas citadas de PDF son las del archivo (`pdfinfo`); en la guía de obra pública 2026 la numeración impresa coincide con la del archivo.
