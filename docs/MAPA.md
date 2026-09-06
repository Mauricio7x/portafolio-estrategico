<!-- GENERADO por `node tests/mapa.js --escribir` · NO editar a mano: se regenera y se pierde.
     Es una FOTO para leer en GitHub; la fuente de verdad es ejecutar la herramienta. -->

```
== MAPA DE DETEKTA · generado del árbol el 2026-09-06 ==
(no editar a mano: sale de `node tests/mapa.js --escribir`. Para ir a un sitio concreto,
 `node tests/mapa.js <término>` da la ruta, la línea y el sed exacto — más barato que leer esto)

· SUPERFICIE HTTP — 30 op declaradas en los mapas de los routers:
  /api/admin?op=  rup · experiencia · cobertura · cargar-catalogo · exportar · importar
  /api/perfil?op=  resumen · diagnostico · entrada · pulso · consorcio · consorcio-simular · seguimiento
  /api/pliego?op=  extraer-texto · parsear · descargar · formulario1 · diff · cronograma · deducciones · dictamen · documentos
  /api/procesos?op=  sync · historico · listar · baja · entidades · portada · manifestacion · salud
  (api/apu.js e api/inteligencia.js despachan por accion/vista desde su handler:
   `node tests/estado.js` los enumera midiendo)

· api/ — 6 módulos:
  admin.js                    Router del dominio ADMIN (Fase 0 · consolidación a 6 funciones)
  apu.js                      Router del dominio APU (Fase 0 · consolidación a 6 funciones)
  inteligencia.js             Router del dominio INTELIGENCIA (Fase 0 · 6 funciones)
  perfil.js                   Router del dominio PERFIL (Fase 0 · consolidación a 6 funciones)
  pliego.js                   Router del dominio PLIEGO (Fase 0 · consolidación a 6 funciones)
  procesos.js                 Router del dominio PROCESOS (Fase 0 · consolidación a 6 funciones)

· lib/ — 68 módulos:
  accesibilidad.js            Accesibilidad operativa de la zona de la obra
  adendas.js                  Vigía de adendas · lo que el DATASET dice que cambió (Fase 5)
  almacen.js                  Esquema de claves Redis + compresión de chunks
  apu_catalogo.js             Tipologías de obra e ítems del catálogo APU
  apu_descargar.js            Traer el PDF de un pliego para que pdf.js pueda leerlo
  apu_extraer.js              Del texto de un pliego a la lista de ítems y cantidades
  apu_mapeo.js                De la descripción del pliego al ítem del catálogo APU
  apu_ocr.js                  OCR de páginas escaneadas vía OCR.space (respaldo, no vía principal)
  apu_pliego.js               Extraer ítem + unidad + cantidad de la tabla de un pliego
  auth.js                     Un solo guardián para los endpoints protegidos
  baja_maxima.js              hasta dónde puede bajar el dueño en CADA proceso (A4)
  capacidad.js                K de contratación (capacidad residual) — FÓRMULA ÚNICA
  censo_ingesta.js            Por qué NO entró un proceso al corpus
  cobertura_rup.js            ¿Qué códigos UNSPSC le FALTAN al RUP?
  columnas_historicas.js      ¿Qué columnas trae DE VERDAD el corpus histórico?
  competencia_detalle.js      Los procesos que SOSTIENEN el badge de competencia
  config_rup.js               Validación del RUP que sube el dueño (archivo JSON)
  consorcio.js                Consorcio a la medida (Fase 10 · Detekta v4)
  copia_datos.js              Copia de los datos que introduce el usuario (6-sep-2026, M-INF-15)
  costos.js                   el motor de costo real vive en public/costos.js (UMD) y aquí
  cronograma.js               Cronograma del proceso con avisos T-7 / T-3 / T-1 (Fase 5)
  cuerpo.js                   Leer el cuerpo JSON de una petición, una sola vez
  deducciones.js              Qué le van a descontar de cada pago, leído del PLIEGO
  dictamen.js                 Dictamen del pliego (proyecto «Don Héctor», 2-sep-2026) — PURO
  dictamen_reglas.js          EL DICTAMEN POR REGLAS, SIN MODELO (proyecto «Don Héctor», 3-sep-2026)
  diff.js                     Vigía de adendas · texto del pliego (Fase 5 del plan v3)
  documentos_proceso.js       LOS DOCUMENTOS DE UN PROCESO, LEÍDOS SOLOS (3-sep-2026)
  ejecucion.js                Cómo EJECUTA sus contratos de obra una entidad (jbjy-vk9h)
  equivalencias.js            Qué clases UNSPSC son AFINES en el mercado real
  error_interno.js            La respuesta JSON de un fallo que nadie capturó (6-sep-2026)
  experiencia.js              La experiencia REALMENTE ejecutada como vocabulario
  filtros.js                  Filtros canónicos: estado, modalidad, objeto y PERTINENCIA
  filtros_lista.js            Aplicación en el SERVIDOR de los siete filtros del
  formulario1.js              Guardián del Formulario 1 (Fase 4 del plan v3)
  ganancia.js                 ¿CUÁNTA PLATA DEJA ESTE CONTRATO?
  glosario.js                 la marca y el glosario viven en public/glosario.js (UMD) y
  guia_proceso.js             LA GUÍA «DON HÉCTOR» DE UN PROCESO GUARDADO (sep 2026)
  habiles.js                  Días hábiles y festivos de Colombia (Fase 9 · Detekta v4)
  indice_baja.js              ¿Cuánto descuentan los ganadores frente al presupuesto?
  indice_competencia.js       ¿En qué entidades se presenta menos gente?
  lenguaje_pantalla.js        las DOS cercas de lenguaje de pantalla, en una sola copia
  manifestacion.js            La MANIFESTACIÓN DE INTERÉS de la selección abreviada de
  negocio.js                  Reglas de negocio: enriquecer(licitacion)
  paa.js                      Plan Anual de Adquisiciones (dataset Socrata `9sue-ezhx`)
  paa_acierto.js              ¿Cuánto de lo que el PAA anuncia acaba saliendo?
  paginas.js                  la PÁGINA viaja con el texto del pliego (ago 2026)
  parametros.js               Parámetros normativos del costo real, VERSIONADOS (Fase 1)
  perfil_dinamico.js          Perfiles creados por onboarding (RUP subido en PDF)
  perfil_manual.js            Perfil APROXIMADO desde tres datos (Fase 2)
  perfil_resolver.js          el perfil que pide una petición, resuelto en UN solo sitio
  perfiles.js                 FUENTE ÚNICA DE VERDAD de los tres perfiles del negocio
  portada.js                  El pulso del mercado y la manifestación de interés (Fase 9 · Detekta v4)
  probabilidad.js             P(ganar) estimada con lo que YA hay en Redis
  probabilidad_desglose.js    POR QUÉ ese 23 %, paso por paso
  proponentes.js              Quiénes se PRESENTAN a los procesos de una entidad
  proyeccion.js               De fila cruda de Socrata a registro guardable
  publico.js                  lib/publico · Qué puede ver un cliente SIN credencial
  puertas.js                  Las cuatro puertas de viabilidad de un proceso
  rastreo.js                  «¿Por qué no está este proceso?»
  redis.js                    Cliente mínimo de Upstash Redis vía API REST — sin SDK ni deps
  rup.js                      Validación RUP por perfil → rup_valido(licitacion, perfil)
  rup_pdf.js                  Extraer un perfil de RUP del TEXTO de un certificado en PDF
  seguimiento.js              MIS PROCESOS: guardar, seguir y estudiar a la competencia (ago 2026)
  semantica.js                Clasificación semántica del objeto contractual
  socio.js                    Verifique a su socio antes de firmar (due diligence de 20 minutos)
  socrata.js                  Acceso al dataset p6dx-8zbt de SECOP II (API Socrata / SoQL)
  texto_unspsc.js             El OBJETO como co-señal cuando el código no alcanza
  unspsc.js                   Whitelists de los RUP + MATCHING JERÁRQUICO por niveles

· lib/apu/ — 20 módulos:
  calculo.js                  Del costo directo al precio de oferta
  catalogo.js                 Catálogo de precios APU en Redis
  epc_items.js                LOS APU DE EPC COMO ÍTEMS COSTEABLES (ago 2026)
  ffie_items.js               EL PRECIO TOPE DE EDIFICACIÓN DEL FFIE (ago 2026)
  fuentes.js                  De dónde sale cada precio, con su URL y su vigencia
  iccu_items.js               LA LISTA DE PRECIOS DEL ICCU (Cundinamarca, ago 2026)
  idu_items.js                LOS PRECIOS DE REFERENCIA DEL IDU COMO ÍTEMS COSTEABLES (ago 2026)
  importar.js                 Filas de un Excel importado → ítems del catálogo de PRECIOS
  inferencia.js               Del objeto del proceso a los ítems de obra
  invias.js                   Referencia oficial INVIAS por insumo, por provincia
  invias_items.js             LOS APU DE REFERENCIA DEL INVIAS COMO ÍTEMS COSTEABLES (ago 2026)
  normativa.js                Qué hay DETRÁS de los factores que multiplican el APU
  optimizador.js              ¿A QUÉ PRECIO HAY QUE OFERTAR?
  piso_techo.js               (sin cabecera)
  precios.js                  La cascada de fuentes de precio
  precios_ia.js               Los APU generados por una SESIÓN de Claude Code (4-sep-2026)
  rentabilidad.js             Precio competitivo, flujo de caja, VEG y payback
  retail.js                   Techo de tienda y de lista de fabricante, por insumo
  tipologias.js               Las 22 tipologías de obra y el mapa departamento→región
  validaciones.js             Las cinco puertas de control del presupuesto

· lib/handlers/admin/ — 6 módulos:
  cargar_catalogo.js          Puebla Redis con el catálogo de precios APU
  cobertura.js                Qué códigos UNSPSC le faltan al RUP
  experiencia.js              Los contratos que el dueño YA ejecutó
  exportar.js                 (sin cabecera)
  importar.js                 (sin cabecera)
  rup.js                      Cargar, consultar y eliminar el RUP del dueño (archivo JSON)

· lib/handlers/apu/ — 1 módulos:
  editor.js                   (sin cabecera)

· lib/handlers/inteligencia/ — 1 módulos:
  detalle.js                  Consultas de SOLO LECTURA sobre el mercado

· lib/handlers/perfil/ — 6 módulos:
  consorcio.js                /api/perfil?op=consorcio | op=consorcio-simular (Fase 10)
  diagnostico.js              ¿En qué paso de la cascada se pierden los procesos?
  entrada.js                  /api/perfil?op=diagnostico (POST) · PUERTA DE ENTRADA DE 60 SEGUNDOS (Fase 2)
  pulso.js                    GET /api/perfil?op=pulso&perfil=… (ago 2026)
  resumen.js                  El dashboard: ¿qué SON los procesos que hoy se ven?
  seguimiento.js              /api/perfil?op=seguimiento (ago 2026)

· lib/handlers/pliego/ — 6 módulos:
  cronograma.js               /api/pliego?op=cronograma (Fase 5)
  deducciones.js              /api/pliego?op=deducciones · Qué le van a descontar, leído del pliego
  dictamen.js                 /api/pliego?op=dictamen (proyecto «Don Héctor», 2-sep-2026)
  diff.js                     /api/pliego?op=diff (Fase 5 · vigía del TEXTO del pliego)
  documentos.js               /api/pliego?op=documentos (3-sep-2026)
  formulario1.js              POST /api/pliego?op=formulario1 (Fase 4)

· lib/handlers/procesos/ — 8 módulos:
  baja.js                     El índice de baja de mercado, completo o por entidad
  entidades.js                GET /api/procesos?op=entidades&q=alcald
  historico.js                Backfill del corpus histórico + índice de competencia
  listar.js                   Consulta de oportunidades viables desde la caché Redis
  manifestacion.js            GET /api/procesos?op=manifestacion&estado=abierto|proximo
  portada.js                  GET /api/procesos?op=portada
  salud.js                    ¿La sincronización está viva? (GET /api/procesos?op=salud · público, solo lee)
  sync.js                     Sincronización SECOP II → Upstash Redis (full + delta, reanudable)

· FRONTEND public/ — 16 módulos:
  app.js                      Frontend unificado (una página, tres pestañas)
  apu_libro.js                El presupuesto calculado → libro Excel con formato Nogal
  calendario.js               EL CALENDARIO DE CIERRES (encargo del ingeniero, 31-ago-2026)
  costos.js                   Motor de costo de mano de obra y costos indirectos (Fase 1)
  filtros.js                  Vocabulario y estado de los SIETE filtros (Fase 8 · Detekta v4)
  frases.js                   LAS FRASES DE LA PORTADA (ago 2026)
  ganancia.js                 LA CUENTA DE «CUÁNTA PLATA DEJA ESTE CONTRATO»
  glosario.js                 Marca y glosario (Fase 7 · Detekta v4)
  justificacion.js            Justificación del valor de la oferta — documento exportable (Fase 3, ago 2026).
  lista_libro.js              La lista filtrada de licitaciones → libro Excel
  onboarding.js               Onboarding — subir el RUP en PDF y salir con un perfil andando
  pliego.js                   APU — lectura del formulario de cantidades de un pliego
  portada.js                  La portada: el pulso del mercado (Fase 9 · Detekta v4)
  pulso.js                    EL PULSO PERSONALIZADO del tablero (ago 2026)
  xlsx.js                     Escritor .xlsx (OOXML) propio, sin dependencias
  xlsx_lectura.js             Lector .xlsx / .csv propio, sin dependencias

· MEMORIA · docs/MEMORIA.md — 146 secciones (4 con marcador de superación; el índice entero, derivado: docs/MEMORIA_INDICE.md). Las 10 más nuevas:
  L  8798  Lote «B6a-readme-y-citas» de la consultoría del 4-sep · M-DOC-05, M-DOC-08 (6-sep-2026)
  L  8879  Lote «B6b-memoria-util» de la consultoría del 4-sep · M-DOC-06 (6-sep-2026)
  L  8966  Lote «B7a-tablero-mis-procesos» de la consultoría del 4-sep · M-DGF-09, M-DGF-11, M-DGF-15 (
  L  9095  Lote «B7b-tablero-mercado» de la consultoría del 4-sep · M-DGF-13, M-DGF-14, M-DGF-20 (6-sep
  L  9227  Lote «B8a-consorcio-y-excel» de la consultoría del 4-sep · M-COMP-02, M-COMP-04 (6-sep-2026)
  L  9335  Lote «B8b-busqueda-frases» de la consultoría del 4-sep · M-COMP-05 (6-sep-2026)
  L  9412  Lote «B9a-entidad-graficos» de la consultoría del 4-sep · M-DGF-06, M-DGF-10 (6-sep-2026)
  L  9548  Lote «B9b-competencia-departamento» de la consultoría del 4-sep · M-COMP-01, M-DGF-08 (6-sep
  L  9719  Lote «B10a-exportar-importar» de la consultoría del 4-sep · M-INF-15 (6-sep-2026)
  L  9837  Remates «R3-remates-pantalla» de la ola 2 · B7a-H1/H2/H3, B7b-H1/H2/H3, B8a-H1/H2/H3/H4, B8b

· DOCUMENTOS docs/ — 43 (y 1 en docs/archivo/, superados: `--archivo` los lista):
  ACCESIBILIDAD.md                        Accesibilidad de la zona · metodología (ago 2026)
  ANALISIS_ESTRATEGICO.md                 Análisis estratégico de Detekta · agosto 2026
  APU_DIAGNOSTICO.md                      Diagnóstico del módulo APU frente a la especificación «APU profesional»
  APU_FUENTES.md                          Fuentes de precio del APU · qué se intentó, qué respondió y qué falta
  APU_INFORME_COMPLETO.md                 APU automatizado y rentabilidad real de contratos de obra pública en Colombia
  APU_Y_RENTABILIDAD.md                   APU y rentabilidad — investigación de fuentes de precios
  ARQUITECTURA_MULTITENANT.md             Anexo C · Arquitectura multi-inquilino, escalabilidad y datos
  ATRACTIVIDAD.md                         Atractividad de una licitación — análisis iterativo y diseño
  AUDITORIA_INTEGRAL.md                   Auditoría integral · Detekta
  AUDITORIA_INVESTIGACION_EXTERNA.md      Auditoría de la investigación externa (ago 2026)
  AUDITORIA_MODULO_APU.md                 Consultoría y auditoría del módulo APU (24-ago-2026)
  BANCO_PRECIOS_2026-08-26.md             Banco de Precios Verificable · censo y contraste del informe del 26-ago-2026
  CALIBRACION_APU.md                      Calibración del catálogo APU con el Presupuesto Nogal 4 (ago 2026)
  CHECKLIST_PRODUCCION.md                 Anexo F · Lista de verificación previa a producción
  COMPLEMENTO_ANALISTA_LICITACIONES.md    Complemento crítico al Manual del Analista de Licitaciones
  CONFIGURACION_TOKENS.md                 Tokens y variables de entorno · guía desde cero
  CONSULTORIA_2026-09-04_RESUMEN.md       Consultoría integral sobre Detekta · resumen para el dueño (antes → mejora)
  datos.md                                Inventario de fuentes de datos y auditorías de la Fase 0
  DICTAMEN_DESDE_CLAUDE_CODE.md           Dictamen del pliego con la suscripción de Claude Code (sin clave de API) · 3-sep-202
  DIFERENCIAS_APU.md                      Diferencias declaradas · APU generado vs archivos de referencia (ago 2026)
  DON_HECTOR_DICTAMEN_DEL_PLIEGO.md       Don Héctor · el dictamen del pliego (investigación y diseño · 2-sep-2026)
  EMPEZAR_AQUI.md                         EMPEZAR AQUÍ · Guía de cero para convertir Detekta en un negocio
  GUIA_ANALISTA_LICITACIONES.md           Manual del Analista de Licitaciones
  insumos_2026_pendiente/LEEME.md         Insumos de precios 2026 · las FUENTES de los bancos del módulo APU
  INSUMOS_2026.md                         Insumos de precios 2026 · censo, contraste y qué hacer con ellos
  INVESTIGACION_COMPETENCIA_APU.md        Investigación de competencia del módulo APU · cómo operan, de dónde sacan los datos 
  INVESTIGACION_DISENO_WEB.md             Investigación · Cómo están hechas las mejores páginas web del mundo (4-sep-2026)
  INVESTIGACION_PLATAFORMAS_LICITACIONES.md  Investigación · Las cinco mejores plataformas de licitación pública del mundo
  LEGAL_COLOMBIA.md                       Anexo A · Frente jurídico y regulatorio (Colombia)
  marca.md                                Marca · Detekta (Fase 7 del plan maestro v4 · ago 2026)
  metodologia.md                          Metodología de cálculo del costo real (Fase 1 · Detekta v3)
  PERFILES.md                             Perfiles del negocio — resumen técnico
  PLAN_DE_ACCION.md                       PLAN DE ACCIÓN · Detekta, de herramienta interna a producto por suscripción
  PLAN_SAAS.md                            PLAN SaaS · De herramienta interna a producto por suscripción
  PRECIO_Y_UNIT_ECONOMICS.md              Anexo B · Modelo de negocio, precio y economía unitaria
  PRECIOS_DESDE_CLAUDE_CODE.md            Precios · cómo funciona «Buscar» y quién lo atiende
  PROBABILIDAD_MEJORADA.md                Probabilidad de ganar — auditoría de la fórmula vigente y propuesta de mejora
  PROMPT_CONSULTORIA_SAAS.md              PROMPT MAESTRO · CONSEJO CONSULTOR DE DETEKTA
  PROMPT_INICIAL.md                       PROMPT INICIAL DE DETEKTA · protocolo vivo
  RAMAS_RETIRADAS.md                      Ramas superadas al unificar en `main` (21-ago-2026)
  RIESGOS.md                              Anexo G · Registro de riesgos
  SEGURIDAD_Y_CUENTAS.md                  Anexo D · Identidad, autorización, seguridad y cobro
  VALIDACION_MODELOS.md                   Anexo E · Ciencia de datos: calibración, validación y vigilancia
```
