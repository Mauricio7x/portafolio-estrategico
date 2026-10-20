/* lib/documentos_proceso.js · LOS DOCUMENTOS DE UN PROCESO, LEÍDOS SOLOS (3-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño: «cuando el usuario guarda un proceso, la plataforma empieza
   a descargar todos los documentos, los interpreta, y ahí sí le da respuestas
   claras, verdaderas y personalizadas de ESE proceso». Hasta hoy el único texto
   que la aplicación leía era el PDF que el usuario cargaba a mano en Precios.

   LO MEDIDO EL 3-sep-2026 (con fecha, porque es una observación y no una ley):
   · La página pública del proceso en SECOP II (OpportunityDetail) redirige a
     un reCAPTCHA de Google: desde un servidor NO se puede listar ahí los
     documentos.
   · La descarga directa de cada archivo (Public/Archive/RetrieveFile/Index?
     DocumentId=…) NO está detrás del reCAPTCHA: responde 200 application/pdf
     con Content-Disposition (medido con el pliego real de CO1.REQ.10379092).
   · datos.gov.co publica el ÍNDICE de archivos por proceso: el dataset
     dmgg-8hin «SECOP II - Archivos Descarga Desde 2025» (id_documento,
     nombre_archivo, extensión, tamaño, fecha_carga, url_descarga_documento),
     con la columna `proceso` = el `id_del_portafolio` (CO1.BDOS.…) de p6dx.
     Cubre archivos cargados desde el 1-ene-2025 y va ~3 días por detrás.
   Así que la cadena es: id_del_proceso → p6dx (id_del_portafolio) → dmgg-8hin
   (la lista) → RetrieveFile (los bytes, por el proxy SSRF-endurecido de
   lib/apu_descargar) → pdf.js EN EL NAVEGADOR (como todo el módulo APU: sin
   dependencias en Node) → el texto vuelve al servidor, que lo guarda y lo
   INTERPRETA con los lectores que ya existen.

   Este módulo es la capa PURA (ni red ni Redis): clasifica los archivos del
   índice, decide cuáles se leen y en qué orden, y saca los HECHOS de cada texto.

   Reglas que no hay que re-aprender:
   · NO REIMPLEMENTA NINGÚN LECTOR: los detectores son los de lib/dictamen_reglas
     (`detectar`), los requisitos con cifra los de lib/diff (`extraerHabilitantes`,
     `cumpleRequisito`), las fechas las de lib/cronograma (`extraerHitos`) y los
     descuentos los de lib/deducciones. Una segunda regex divergiría a la
     primera corrección. Los require van DIFERIDOS: diff y cronograma viven en
     ciclos que este módulo no puede atarse en tiempo de carga.
   · El índice mezcla los archivos DE LA ENTIDAD (pliego, adendas, estudios) con
     los que suben LOS PROPONENTES con su oferta (RUP, antecedentes, garantía de
     seriedad…): se separan por nombre y por fecha (lo que se sube después del
     cierre y no es un acto de la entidad es una oferta). Un documento de un
     competidor no es una regla del proceso.
   · Un archivo que no es PDF ni Word .docx (hoja de cálculo, comprimido, imagen)
     NO se lee: se lista como «no legible» con su motivo y se manda a SECOP II.
     Prometer que se leyó una hoja de cálculo que no se abrió sería una cifra
     inventada. El .docx se lee desde el 27-sep-2026 (lib/docx.js), sin página.
   · «Sin dato» ≠ «cero»: un anticipo que el texto NIEGA es `estado:"no"` con su
     cita; uno que no aparece es `sin_dato`. Y los hechos llevan siempre el
     documento y la página de donde salieron: sin cita no hay hecho.
   · Lo que el índice no trae (procesos anteriores a 2025, SECOP I, tienda
     virtual) es un RESULTADO con motivo, no un error: el usuario sigue pudiendo
     cargar el pliego a mano y todo lo demás funciona igual. */
"use strict";

const VERSION = 21;                        // 21: el Formulario de la oferta económica en Excel se reconoce también por «oferta econom…», «propuesta económica», «PropEconomica» y «ofrecimiento económico», y un Excel de presupuesto subido DESPUÉS del cierre es de un proponente (19-oct-2026) · 20: el Formulario 1 en Excel (tipo «presupuesto», .xlsx/.xlsm) entra al plan y se lee en el servidor (lib/formulario_excel); 19:                        // 19: el nombre se pliega con sus separadores («DocBase_…», «Documento_base_…», «%20», «Documentos Base», erratas): esos documentos base se leen solos (18-oct-2026) · 18: la tabla 1.1 de licitación pública: título sin número o «…UBICACIÓN Y ESPECIFICACIONES», fin en «DOCUMENTOS DEL PROCESO» sin número y centavos con punto (ronda 5 de detekta-lector, 17-oct-2026) · 17: el presupuesto de la tabla 1.1 del pliego, para avisar si SECOP II publica otro (lib/presupuesto_pliego, 17-oct-2026) · 16: la fila partida de la tabla de códigos de la experiencia («72 … nombre … 14 11», Fase 0 del 17-oct-2026) · 15: la garantía de seriedad con la tabla lejos del título (ventana de 1.600 que se alarga y no parte rótulos), «Seriedad de la oferta» / «póliza de seriedad» como título, y fuera los umbrales de corrección (28-sep-2026) · 14: el porcentaje de la garantía de seriedad y el de las Mipyme (lib/garantia_seriedad, 28-sep-2026) · 13: la tabla de experiencia del pliego tipo con su página y el tipo de obra de la experiencia general y específica, copiado del pliego (lib/tabla_experiencia, 27-sep-2026; la 12 de esa rama se fundió aquí) · 11: el «Documento Base» del pliego tipo se lee (su tipo propio), la plantilla en blanco no dice nada, y el anticipo mira las líneas vecinas (27-sep-2026) · 10: la fórmula del capital de trabajo exigido (lib/capital_trabajo) junto al rango de la Matriz 2 (27-sep-2026) · 9: el rango de presupuesto de la Matriz 2 y los lotes (27-sep-2026) · 8: la tabla de indicadores de Mipyme aparte, «Liquidez ≥ 3,00» en tabla y la Matriz 2 al plan (27-sep-2026) · 7: el plan mete los PDF de hasta 20 MB (por trozos) y los .docx (27-sep-2026) · 6: «cada uno con el siguiente código» y «la totalidad de la siguiente codificación» (27-sep-2026) · 5: los códigos con que se pide la experiencia (26-sep-2026) · 4: cláusula de participación mínima y fórmula del plural (26-sep-2026) · 3: citas literales por tema (4-sep-2026, noche) · 2: experiencia general y específica como hechos propios

/* ── LAS CITAS LITERALES DEL PLIEGO, POR TEMA (4-sep-2026, noche) ──
   Encargo del dueño: «necesita saber qué experiencia le piden de manera
   específica y general, estados financieros y si tiene anticipo o no; cita
   qué dice el pliego, y que lo que cites sea real». No es una cifra sacada
   con una regex: es el PÁRRAFO del documento, tal cual, con su página. Por
   tema se elige la línea ancla con más cara de cláusula (prosa con cifras,
   nunca una línea del índice) y se copian las líneas que siguen hasta ~700
   caracteres o hasta el siguiente encabezado numerado. Lo que no aparece con
   esas palabras se declara `null`: no se resume ni se parafrasea. */
const TEMAS_CITA = Object.freeze([
  { clave: "experiencia_especifica", titulo: "Experiencia específica", re: /experiencia\s+espec[ií]fica/i },
  { clave: "experiencia_general", titulo: "Experiencia general", re: /experiencia\s+general/i },
  { clave: "financieros", titulo: "Indicadores financieros", re: /[ií]ndice\s+de\s+liquidez|nivel\s+de\s+endeudamiento|raz[oó]n\s+de\s+cobertura|cobertura\s+de\s+intereses|capital\s+de\s+trabajo|capacidad\s+financiera|indicadores?\s+(?:de\s+capacidad\s+)?financier/i },
  { clave: "organizacional", titulo: "Capacidad organizacional", re: /capacidad\s+organizacional|rentabilidad\s+(?:del|sobre\s+el)\s+patrimonio|rentabilidad\s+(?:del|sobre\s+el)\s+activo/i },
  { clave: "anticipo", titulo: "Anticipo o pago anticipado", re: /\banticipos?\b|pago\s+anticipado/i },
]);
const MAX_CITA = 700;
const MAX_LINEAS_CITA = 8;
function lineasConPaginaDe(texto) {
  const salida = []; let pagina = null;
  for (const cruda of String(texto || "").replace(/\r\n?/g, "\n").split("\n")) {
    const m = cruda.match(/^[ \t]*\f(\d*)[ \t]*$/);
    if (m) { pagina = m[1] ? Number(m[1]) : (pagina == null ? 1 : pagina + 1); continue; }
    const l = cruda.replace(/\f/g, "").replace(/[ \t ]+/g, " ").trim();
    salida.push({ linea: l, pagina });
  }
  return salida;
}
const palabras = (l) => l.split(/\s+/).filter(Boolean).length;
const esLineaDeIndice = (l) => /\.{4,}\s*\d+\s*$/.test(l) || (/\s\d{1,3}\s*$/.test(l) && palabras(l) <= 10);
const esEncabezado = (l) => /^\d+(?:\.\d+){0,3}\.?\s+[A-ZÁÉÍÓÚÑ]/.test(l) || (l === l.toUpperCase() && /[A-ZÁÉÍÓÚÑ]{3}/.test(l) && palabras(l) <= 10);
function citasDeTexto(texto) {
  const lineas = lineasConPaginaDe(texto);
  const { niegaAnticipo } = require("./dictamen_reglas.js");
  const citas = {};
  for (const tema of TEMAS_CITA) {
    let mejor = null;
    for (let i = 0; i < lineas.length; i++) {
      const l = lineas[i].linea;
      if (!l || !tema.re.test(l)) continue;
      let p = 0;
      if (esLineaDeIndice(l)) p -= 5;
      if (palabras(l) >= 8) p += 2;
      if (/\d/.test(l)) p += 1;
      if (/(SMMLV|SMLMV|salarios? m[ií]nimos|%|\$|mayor o igual|menor o igual|igual o superior|≥|≤|contratos?)/i.test(l)) p += 2;
      if (esEncabezado(l)) p -= 1;
      if (tema.clave === "anticipo" && niegaAnticipo(l)) p += 2;
      if (!mejor || p > mejor.p) mejor = { i, p };
    }
    if (!mejor || mejor.p < 0) { citas[tema.clave] = null; continue; }
    /* el pasaje: la línea ancla y las que siguen, hasta el tope o el siguiente encabezado */
    const partes = [lineas[mejor.i].linea];
    let largo = partes[0].length;
    for (let j = mejor.i + 1; j < lineas.length && partes.length < MAX_LINEAS_CITA && largo < MAX_CITA; j++) {
      const l = lineas[j].linea;
      if (!l) { if (partes.length >= 2) break; continue; }
      if (esEncabezado(l) && partes.length >= 1 && palabras(partes.join(" ")) >= 12) break;
      if (esLineaDeIndice(l)) break;
      partes.push(l); largo += l.length + 1;
    }
    let textoCita = partes.join(" ").replace(/\s+/g, " ").trim();
    if (textoCita.length > MAX_CITA) textoCita = textoCita.slice(0, MAX_CITA).replace(/\s+\S*$/, "") + "…";
    citas[tema.clave] = { texto: textoCita, pagina: lineas[mejor.i].pagina, ancla: lineas[mejor.i].linea.slice(0, 200) };
  }
  return citas;
}
const MAX_ARCHIVOS_INDICE = 150;
const MAX_DOCS_PLAN = 12;
const MAX_PLIEGOS_PLAN = 3;
/* 20 MB: el tope del documento que el proxy (`op=descargar`) trae POR TROZOS de
   3 MB (27-sep-2026; hasta entonces era 3 MB, el de un PDF entero en una respuesta
   de Vercel que se corta en 4,5 MB). Es la MISMA constante que aplica el proxy,
   importada de lib/cuerpo.js: el 6-sep-2026 el proxy prometía 12 MB y este plan 3,
   y el hueco entre los dos era un fallo mudo. Un documento mayor se lista con su
   motivo y su enlace: no se promete leerlo. `MAX_BYTES_DOC` conserva su nombre. */
const { TOPE_DOCUMENTO: MAX_BYTES_DOC } = require("./cuerpo.js");
/* EL TEXTO QUE SE GUARDA DE CADA DOCUMENTO DEL PROCESO (27-sep-2026): 1,5 millones de
   caracteres. Hasta hoy era el de las versiones del vigía de adendas (lib/diff.MAX_TEXTO,
   400 KB, que sigue ahí: guarda CINCO versiones del pliego por proceso), y un estudio
   previo de 303 páginas (CO1.REQ.7979440, 884 mil caracteres) se leía hasta la mitad: se
   perdían el endeudamiento, la cobertura y la tabla de códigos de la experiencia, que
   venían después. Medido con ese texto entero: 0,7 s de lectura y 147 KB comprimidos. */
const MAX_TEXTO_DOC = 1536 * 1024;
/* un documento guardado CORTADO con un tope menor que el de hoy se vuelve a leer. Se mira
   el TOPE con que se guardó (`tope_caracteres`), no su largo: el texto normalizado de uno
   que el navegador ya cortó queda un poco por debajo del tope, y mirar el largo lo mandaba
   a releer en bucle (medido con la prueba, 27-sep-2026). Sin el campo, es de antes. */
const releerPorCorte = (x) => !!x && x.recortado === true && !(Number(x.tope_caracteres) >= MAX_TEXTO_DOC);
/* un ESCANEO guardado a medias (20-oct-2026): el OCR dejó páginas sin reconocer y el navegador de antes guardaba el texto de las otras como «Leído» («PRESUPUESTO OFICIAL.pdf»
   de 6 páginas con 1). Solo lo que salió de un OCR (en un PDF con texto, «páginas» y «páginas_total» pueden diferir por una página en blanco), y NO lo cortado por el
   tope de caracteres (`recortado`: un escaneo de 700 páginas completo pero largo quedaba con 618 y se habría vuelto a leer con OCR en cada visita). Las páginas que el
   servicio procesó y no traían texto (`paginas_sin_texto`) no cuentan como pendientes: se muestran. NO se vuelve a leer solo (cuota de OCR y bucles): se vuelve a leer cuando el
   usuario pulsa «Volver a buscar» (`docs.relecturas`), y si esa relectura falla se CONSERVA el texto que ya estaba guardado (documentos.js). */
const escaneoAMedias = (x) => !!x && x.origen === "ocr" && x.recortado !== true && Number.isInteger(x.paginas) && Number.isInteger(x.paginas_total)
  && x.paginas + (Number.isInteger(x.paginas_sin_texto) && x.paginas_sin_texto > 0 ? x.paginas_sin_texto : 0) < x.paginas_total;
const MAX_HITOS = 12;
const MAX_DEDUCCIONES = 12;
const MAX_CLAUSULAS = 8;
const MAX_LECTURAS_CODIGOS = 6;           // tablas de códigos de experiencia por documento (general, específica, lotes)
const ORDEN_MAX_PLAN = 9;                  // resoluciones, análisis del sector, informes, formatos y «otros» no se leen solos

/* la versión de los HECHOS guardados: la de este módulo más la de las reglas del
   dictamen. Cuando cambia, op=documentos (GET) rehace los hechos desde el texto
   guardado, sin volver a descargar nada (require diferido: dictamen_reglas se
   carga junto a lectores que viven en ciclos). */
const hechosVersion = () => `${VERSION}|${require("./dictamen_reglas.js").REGLAS_VERSION}`;
const claveDocs = (id) => `pliego:${id}:docs`;
const claveDoc = (id, idDoc) => `pliego:${id}:doc:${idDoc}`;
const claveF1 = (id, idDoc) => `pliego:${id}:f1:${idDoc}`;   // los ítems de un Formulario 1 en Excel que pasó la puerta (lib/formulario_excel)

const plegar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/\s+/g, " ").trim();
const num = (v) => { if (v === null || v === undefined || v === "") return null; const n = Number(v); return Number.isFinite(n) ? n : null; };
const dia = (f) => { const s = String(f || "").slice(0, 10); return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : null; };

/* ── qué es cada archivo, por su nombre ───────────────────────────────────── */
const TIPOS = Object.freeze({
  pliego: { legible: "Pliego de condiciones", orden: 1 },
  adenda: { legible: "Adenda", orden: 2 },
  estudio_previo: { legible: "Estudios previos", orden: 3 },
  anexo_tecnico: { legible: "Anexo técnico o especificaciones", orden: 4 },
  presupuesto: { legible: "Presupuesto oficial o cantidades", orden: 5 },
  cronograma: { legible: "Cronograma", orden: 6 },
  respuesta_observaciones: { legible: "Respuesta a observaciones", orden: 7 },
  aviso: { legible: "Aviso de convocatoria", orden: 8 },
  matriz_riesgos: { legible: "Matriz de riesgos", orden: 9 },
  /* la Matriz 2 del pliego tipo: los indicadores financieros y organizacionales que
     el pliego no copia (27-sep-2026, CO1.REQ.11042791). Se lee sola: orden ≤ 9 */
  matriz_indicadores: { legible: "Matriz de indicadores financieros", orden: 4 },
  /* EL «DOCUMENTO BASE» DEL PLIEGO TIPO (27-sep-2026): en los procesos de pliego tipo es el
     pliego mismo —la cláusula del anticipo, la fórmula del capital de trabajo, la experiencia—
     y caía en «Otro documento», fuera del plan: la negación del anticipo de la pág. 79
     (CO1.REQ.10995743) y la de la pág. 74 (CO1.REQ.11037442) no se leían. Tipo propio y no
     «pliego»: no entra en el vigía de adendas (dos documentos distintos alternándose como
     «versiones» darían cambios falsos). Algunas entidades suben la PLANTILLA EN BLANCO de
     Colombia Compra con ese nombre (CO1.REQ.11042743, setenta «[Incluir …]»): `hechosDeTexto`
     la reconoce y no le saca nada. */
  documento_base: { legible: "Documento base del pliego tipo", orden: 3 },
  resolucion: { legible: "Resolución o acto administrativo", orden: 10 },
  analisis_sector: { legible: "Análisis del sector o estudio de mercado", orden: 11 },
  informe_evaluacion: { legible: "Informe de evaluación", orden: 12 },
  pliego_borrador: { legible: "Proyecto de pliego (borrador)", orden: 13 },
  /* EL CICLO DEL AVISO DE INTERÉS TIENE SU TIPO (22-sep-2026): el formato para
     avisar, la lista de interesados y el acta del sorteo caían en «Otro
     documento» u «Formato», y el expediente no podía enseñar en su sitio los
     papeles de la etapa «avisé · en espera del sorteo». Orden 14 a propósito:
     por encima del tope del plan de lectura (9), así el acta no se descarga ni
     se le sacan hechos que no tiene. */
  manifestacion: { legible: "Aviso de interés (manifestación), lista de interesados o sorteo", orden: 14 },
  formato: { legible: "Formato o formulario", orden: 20 },
  otro: { legible: "Otro documento", orden: 30 },
});
/* el ORDEN importa: «respuesta a observaciones al pliego» es respuesta, no pliego */
const RE_TIPO = [
  ["adenda", /\badendas?\b/],
  ["respuesta_observaciones", /respuesta.*observacion|observacion.*respuesta/],
  ["informe_evaluacion", /informe.*(evaluacion|verificacion)|evaluacion.*(ofertas|propuestas|requisitos)/],
  ["documento_base", /\bdocumento\s+base\b|^[\W\d_]*documento\s+tipo\b/],
  ["estudio_previo", /estudios?\s+previos?/],
  ["analisis_sector", /analisis.*sector|estudio.*(sector|mercado)|sondeo de mercado/],
  ["matriz_riesgos", /matriz.*riesgo/],
  ["matriz_indicadores", /matriz.*indicador|indicadores\s+financieros/],
  ["presupuesto", /presupuesto|cantidades de obra|formulario\s*(?:1|uno|no\.?\s*1)\b|oferta economica/],
  ["anexo_tecnico", /anexo.*tecnic|especificacion|\bapu\b|analisis de precios/],
  ["cronograma", /cronograma/],
  // antes de «aviso», «pliego» y «formato»: «formato de manifestación de interés» es del aviso de interés
  ["manifestacion", /manifestaci?on(?:es)?\s+de\s+interes|\bsorteos?\b|lista\s+de\s+interesados/],
  ["aviso", /\baviso\b/],
  ["resolucion", /resolucion|decreto|acto administrativo/],
  ["otro", /\bcdp\b|disponibilidad presupuestal|\bpsm\b/],
  ["pliego", /pliego|condiciones|invitacion|terminos de referencia/],
  ["formato", /formato|formulario|minuta|\banexo\b|carta/],
];
const RE_BORRADOR = /pre\s*-?\s*pliego|proyecto de pliego|proyecto\b|borrador/;
/* EL FORMULARIO DE LA OFERTA ECONÓMICA EN EXCEL (19-oct-2026). El Excel solo se lee si el nombre lo clasifica «presupuesto», y el
   nombre decía «oferta economica» COMPLETO: «FORMATO OFERTA ECONOM MODIFI CON PLIEGO DF.xlsx» (abreviado) caía en «pliego», y la familia
   oficial del documento tipo —`Form_PropEconomica_ISocialMenCV1.xlsx`, «Formato Propuesta Economica», «OFRECIMIENTO ECONÓMICO»— en
   «otro» o «formato»: medidos 37 archivos distintos sin clasificar en los 423 procesos de obra abiertos del 19-oct-2026 (de 1.101 Excel
   de la entidad; 255 ya se leían). Solo hojas de cálculo: un PDF con ese nombre puede ser el formulario en blanco y entraría como si
   fuera el presupuesto oficial. Y SOLO donde el tipo es «otro», «formato» o «pliego»: una adenda en Excel sigue siendo adenda.
   Lo que se reconoce por el nombre NO se da por bueno: pasa por la misma puerta de siempre (cuadre contra el total y fila a fila). */
const RE_OFERTA_ECONOMICA = /ofert\w*\s*econom|propuesta\s*econom|prop\s*econom|propeconom|ofrecimiento\s*econom/;
/* …y lo que lleva ese nombre pero NO es el formulario (revisión adversaria, reproducido): «Formato evaluación propuesta económica», «Cuadro comparativo
   ofertas económicas», «Formato resumen ofertas económicas recibidas», «Formato ponderación…», «Acta de apertura…», «…diligenciado Consorcio…». Una matriz
   de evaluación entraba al plan y, aunque la puerta la rechazara, la guía enseñaba «Formulario 1 en Excel que no se da por leído» de un archivo que no lo es. */
const RE_NO_ES_EL_FORMULARIO = /evaluaci|ponderaci|puntaje|\bacta\b|comparativ|recibid|calidad|diligenciad|consolidad|resumen|informe|cuadro|\bfactor/;
/* lo que suben los proponentes con la oferta, por nombre */
const RE_PROPONENTE = /\b(?:rup|rut|antecedentes|carta de presentacion|garantia de seriedad|parafiscales|pacto de probidad|compromiso\W+(?:de\W+)?transparencia|no aplica|union temporal|consorcio|hoja de vida|cedula|tarjeta profesional|estados financieros|inhabilidades|paz y salvo|acuerdo de confidencialidad|industria nacional|discapaci\w*|emprendimiento|mujer(?:es)?|multas y sanciones|certificacion(?:es)?\W+(?:de\W+)?(?:relacion\W+de\W+)?contratos|relacion de contratos|decreto 1072|calidad del personal|requisitos tecnicos parte|propuesta (?:tecnica|economica)|certificado de existencia|camara de comercio|apostilla|revisor fiscal|contador)\b|^n\.?\s?a\.?$/;
const EXTENSIONES = Object.freeze({
  pdf: { legible: true }, txt: { legible: true },
  xlsx: { motivo: "hoja de cálculo" }, xls: { motivo: "hoja de cálculo" }, xlsm: { motivo: "hoja de cálculo" }, csv: { motivo: "hoja de cálculo" },
  // el .docx se lee en el servidor (lib/docx.js, 27-sep-2026); el .doc de Word 97 y el .odt no
  docx: { legible: true }, doc: { motivo: "documento de Word antiguo (.doc)" }, odt: { motivo: "documento de OpenDocument (.odt)" },
  zip: { motivo: "archivo comprimido" }, rar: { motivo: "archivo comprimido" }, "7z": { motivo: "archivo comprimido" },
  jpg: { motivo: "imagen" }, jpeg: { motivo: "imagen" }, png: { motivo: "imagen" }, tif: { motivo: "imagen" }, tiff: { motivo: "imagen" },
  dwg: { motivo: "plano" }, dxf: { motivo: "plano" }, pptx: { motivo: "presentación" },
});

function sinExtension(nombre) { return String(nombre || "").replace(/\.[A-Za-z0-9]{1,5}$/, ""); }
/* EL NOMBRE PLEGADO, CON SUS SEPARADORES Y LOS NOMBRES NUEVOS DE COLOMBIA COMPRA (18-oct-2026). «DocBase_LicitacionObra_
   ISocialLV2.pdf», «Documento_base_Licitacion_Obra_Publica.pdf», «06_Documento Base…», «DOCUMENTO%20BASE», «Documentos Base»
   o la errata «DOCUEMENTO BASE» salían «otro»: el `\b` y el `\s+` de RE_TIPO no pasan por «_», «%20» ni «-», y la lectura
   automática no leía ese documento base (7 de 232 procesos de la muestra, 5 de 33 abiertos, y en aumento: 2.ª revisión
   adversaria de la carga en Precios). Una sola función para el clasificador, el borrador y «es versión del pliego»: tres
   plegados distintos del mismo nombre divergen a la primera corrección */
const nombrePlegado = (nombre) => plegar(sinExtension(nombre).replace(/%20/gi, " "))
  .replace(/_+/g, " ")
  .replace(/(\p{L})[-.](?=\p{L})/gu, "$1 ")
  .replace(/\bdoc\s?base\b/g, "documento base")
  .replace(/\bdocumentos\s+base\b/g, "documento base")
  .replace(/\bdocu(?:emento|emnto|mneto|metno)\b|\bdocumeto\b/g, "documento")
  .replace(/\s+/g, " ").trim();

/** Clasifica UN archivo del índice: tipo, legibilidad, si es de la entidad. `cierre` = "AAAA-MM-DD" o null. */
function clasificarArchivo(a, { cierre = null } = {}) {
  const nombre = String((a && (a.nombre_archivo || a.nombre)) || "").trim();
  const n = nombrePlegado(nombre);
  const ext = plegar(a && a.extensi_n ? a.extensi_n : (nombre.match(/\.([A-Za-z0-9]{1,5})$/) || [])[1] || "").replace(/^\./, "");
  let tipo = "otro";
  for (const [t, re] of RE_TIPO) { if (re.test(n)) { tipo = t; break; } }
  if (tipo === "pliego" && RE_BORRADOR.test(n)) tipo = "pliego_borrador";
  /* el tipo POR NOMBRE, antes de la regla del Excel: `porFecha` (más abajo) separa las ofertas de los proponentes por el tipo «otro»/«formato»
     y una oferta económica de un COMPETIDOR subida tras el cierre no puede pasar por formulario de la entidad */
  const tipoPorNombre = tipo;
  /* un cierre que no es AAAA-MM-DD es un cierre DESCONOCIDO (comparar «2026-9-1» con «2026-10-05» como cadenas da cualquier cosa) */
  const cierreValido = typeof cierre === "string" && /^\d{4}-\d{2}-\d{2}$/.test(cierre) ? cierre : null;
  const fechaCarga = dia(a && a.fecha_carga);
  /* La regla NUEVA solo actúa con el origen CIERTO: cierre y fecha de carga conocidos y la carga ESTRICTAMENTE anterior al cierre (la entidad publica sus
     formularios con el pliego, antes de cerrar). Una oferta de un competidor subida el día del cierre o sin fecha conocida no puede pasar por formulario
     de la entidad: el falso positivo en precios es el caro, y lo que no se reconoce queda como estaba (sin leer, listado como «no se lee solo»). */
  const nuevaPorNombre = (ext === "xlsx" || ext === "xlsm") && (tipo === "otro" || tipo === "formato" || tipo === "pliego") && RE_OFERTA_ECONOMICA.test(n) && !RE_NO_ES_EL_FORMULARIO.test(n)
    && !!cierreValido && !!fechaCarga && fechaCarga < cierreValido;
  if (nuevaPorNombre) tipo = "presupuesto";
  const e = EXTENSIONES[ext] || null;
  /* EL FORMULARIO 1 EN EXCEL se lee solo (19-oct-2026): solo el tipo «presupuesto» y solo .xlsx/.xlsm. El resto de hojas de cálculo
     (cronogramas, matrices, formatos: 1.388 archivos medidos en 532 procesos abiertos) sigue sin leerse: sin una regla por tipo, un
     «ítem» leído de una hoja cualquiera sería una cifra creíble y equivocada. */
  const formularioExcel = tipo === "presupuesto" && (ext === "xlsx" || ext === "xlsm");
  const legible = !!(e && e.legible) || formularioExcel;
  const motivoIlegible = legible ? null : e ? e.motivo : ext ? `formato no legible (.${ext})` : "sin extensión";
  const fecha = fechaCarga;
  /* de la entidad salvo que el nombre sea de una oferta, o que sea un documento
     sin tipo subido DESPUÉS del cierre (las ofertas se abren al cerrar) */
  const porNombre = RE_PROPONENTE.test(n) && !/formato|formulario/.test(n);
  /* y un Excel de PRESUPUESTO subido DESPUÉS del cierre tampoco es de la entidad (19-oct-2026, medido en 120 procesos de obra cerrados desde el
     15-ago: «Presupuesto obra + dotación.xlsx» subido 28 días después del cierre se contaba como el presupuesto de la entidad, y la guía
     podía enseñar como «Formulario 1» el total de la oferta de un competidor). La entidad publica sus formularios con el pliego; lo que
     aparece tras el cierre es una oferta. */
  const excelDePresupuesto = (ext === "xlsx" || ext === "xlsm") && tipo === "presupuesto";
  const porFecha = (tipoPorNombre === "otro" || tipoPorNombre === "formato" || excelDePresupuesto) && !!cierreValido && !!fecha && fecha > cierreValido;
  const bytes = num(a && (a.tamanno_archivo != null ? a.tamanno_archivo : a.bytes));
  const url = a && a.url_descarga_documento && typeof a.url_descarga_documento === "object" ? String(a.url_descarga_documento.url || "") : String((a && (a.url_descarga_documento || a.url)) || "");
  return {
    id_documento: String((a && a.id_documento) || "").trim() || null,
    nombre: nombre.slice(0, 160) || null, extension: ext || null, bytes, fecha_carga: fecha,
    url: /^https:\/\/community\.secop\.gov\.co\//.test(url) ? url : null,
    tipo, tipo_legible: TIPOS[tipo].legible, orden: TIPOS[tipo].orden,
    legible, motivo_ilegible: motivoIlegible,
    cola: nuevaPorNombre,   // reconocido SOLO por la regla de nombres nueva: va al final del plan y nunca desplaza una lectura que ya existía
    de_la_entidad: !(porNombre || porFecha),
  };
}

/** El mismo archivo subido dos veces (otra fase, otra carpeta): se queda el último. */
function deduplicar(archivos) {
  const porClave = new Map();
  for (const a of archivos) {
    const k = `${plegar(a.nombre)}|${a.bytes == null ? "?" : a.bytes}`;
    const previo = porClave.get(k);
    if (!previo || String(a.id_documento) > String(previo.id_documento)) porClave.set(k, a);
  }
  return [...porClave.values()];
}

/* ── el Formulario 1 en Excel, tal como llega del navegador (19-oct-2026) ───────────────────────────
   El navegador pidió el libro a op=descargar (formato «xlsx», que lo leyó en el servidor con
   lib/formulario_excel) y lo devuelve a op=documentos. Un cliente puede mandar cualquier cosa, así que
   `publicable` NO se cree: los ítems que llegaron se pasan otra vez por la MISMA puerta del lector
   (cuadre contra el total + cantidad × precio = total en cada fila). Si algo no pasa, queda el motivo y
   NINGUNA cifra. Devuelve { ok:true, resumen, filas|null } o { ok:false, error } (un 400). Sin red ni
   Redis. Los requires van diferidos: lib/formulario_excel arrastra el lector de hojas. */
function formularioDeExcel(x) {
  if (!x || typeof x !== "object" || x.ok !== true) return { ok: false, error: "«formulario_excel» debe ser lo que devolvió op=descargar con formato xlsx (el campo «lectura»)." };
  /* lo que llega del cliente se tipa, no se convierte: `String({toString: 1})` lanza (y el servidor respondería 500 en vez de 400), y «300000» como cadena no es un total */
  const texto = (v, n) => (typeof v === "string" ? v.slice(0, n) : typeof v === "number" && Number.isFinite(v) ? String(v).slice(0, n) : null);
  const hoja = texto(x.hoja, 80);
  const total = typeof x.total === "number" && Number.isFinite(x.total) && x.total > 0 ? x.total : null;
  const filaTotal = Number.isInteger(x.fila_total) && x.fila_total > 0 && x.fila_total < 1e7 ? x.fila_total : null;
  const sin = (motivo, extra = {}) => ({ ok: true, filas: null, resumen: { publicable: false, motivo: texto(motivo, 300) || "no se pudo comprobar", hoja, filas_n: Number.isInteger(x.filas_n) ? x.filas_n : null, filas_verificadas: 0, total, fila_total: filaTotal, ...extra } });
  if (x.publicable !== true) return sin(x.motivo);
  const FE = require("./formulario_excel.js"), XL = require("../public/xlsx_lectura.js");
  if (!Array.isArray(x.filas) || !x.filas.length) return { ok: false, error: "«formulario_excel» dice que se puede publicar pero no trae ítems." };
  if (x.filas.length > FE.MAX_FILAS) return { ok: false, error: `«formulario_excel» trae más de ${FE.MAX_FILAS} ítems.` };
  if (total == null) return sin("el total del formulario no llegó o no es un número");
  const items = x.filas.map((f) => FE.itemDe(f && typeof f === "object" ? f : {}));
  const cuadre = XL.cuadreDeControl(items, { valor: total, etiqueta: "VALOR TOTAL" });
  const v = XL.verificarFormulario({ filas: items, cuadre });
  if (!v.publicable) return sin(`al volver a comprobarlo en el servidor: ${v.motivo}`, { filas_n: items.length, filas_verificadas: v.filas_verificadas });
  return { ok: true, filas: items, resumen: { publicable: true, motivo: null, hoja, filas_n: items.length, filas_verificadas: v.filas_verificadas, total, fila_total: filaTotal } };
}

/** Qué se lee y en qué orden. Devuelve todos los archivos clasificados (con `en_plan`
    y `motivo_omision`), el plan (ids en orden) y el resumen. */
function planDeLectura(filas, { cierre = null } = {}) {
  const todos = (Array.isArray(filas) ? filas : []).map((f) => clasificarArchivo(f, { cierre })).filter((a) => a.id_documento && a.nombre);
  const publicados = todos.length;
  const distintos = deduplicar(todos);
  const hayPliego = distintos.some((a) => a.tipo === "pliego" && a.legible && a.de_la_entidad && a.url);
  /* sin pliego definitivo con ese nombre, el borrador ES el pliego que hay (muchas
     entidades suben «prepliego» y nunca renombran el definitivo): se lee primero */
  if (!hayPliego) for (const a of distintos) if (a.tipo === "pliego_borrador") a.orden = TIPOS.pliego.orden;
  const archivos = distintos
    /* `cola` primero: un Excel reconocido SOLO por la regla de nombres nueva se lee detrás de todo lo que ya se leía (el cambio solo puede AÑADIR lecturas;
       reproducido: seis «Formato Propuesta Economica Lote N» sacaban del plan al presupuesto oficial, el cronograma, el aviso y la matriz de riesgos) */
    .sort((a, b) => (a.cola ? 1 : 0) - (b.cola ? 1 : 0) || a.orden - b.orden || String(a.fecha_carga || "").localeCompare(String(b.fecha_carga || "")) || String(a.id_documento).localeCompare(String(b.id_documento)))
    .slice(0, MAX_ARCHIVOS_INDICE);
  const plan = [];
  /* del documento base se lee UNA versión, la más nueva: el borrador y el definitivo juntos
     sacaban por el tope el presupuesto y el aviso (CO1.REQ.10995743, revisión adversaria) */
  const bases = archivos.filter((a) => a.tipo === "documento_base" && a.de_la_entidad && a.legible && a.url && !(a.bytes != null && a.bytes > MAX_BYTES_DOC));
  const baseElegida = bases.length ? bases[bases.length - 1].id_documento : null;
  /* LAS VERSIONES DEL PLIEGO QUE SE LEEN SON LAS MÁS NUEVAS (18-oct-2026, reproducido): el orden va del más viejo al
     más nuevo y el tope cortaba por el principio, así que con cuatro versiones quedaba fuera la ÚLTIMA —la que rige—
     con el motivo «ya se leen las últimas versiones», que era falso. Se eligen de antemano las MAX_PLIEGOS_PLAN más
     nuevas entre las que se podrían leer; el orden de lectura sigue siendo del más viejo al más nuevo. */
  const leiblePliego = (a) => (a.tipo === "pliego" || a.tipo === "pliego_borrador") && a.de_la_entidad && a.legible && a.url
    && !(a.bytes != null && a.bytes > MAX_BYTES_DOC) && !(a.orden > ORDEN_MAX_PLAN) && !(a.tipo === "pliego_borrador" && hayPliego);
  const pliegosElegidos = new Set(archivos.filter(leiblePliego).slice(-MAX_PLIEGOS_PLAN).map((a) => a.id_documento));
  /* los pliegos van del MÁS VIEJO al más nuevo (así lo ordena el sort por fecha):
     cada uno es una versión del vigía de adendas y la última es la que lee el
     dictamen */
  for (const a of archivos) {
    let motivo = null;
    if (!a.de_la_entidad) motivo = "lo subió un proponente con su oferta";
    else if (!a.legible) motivo = a.motivo_ilegible;
    else if (!a.url) motivo = "el índice no trae la dirección de descarga";
    else if (a.bytes != null && a.bytes > MAX_BYTES_DOC) motivo = `pesa más de ${MAX_BYTES_DOC / 1024 / 1024} MB: la aplicación no lo lee sola; ábralo en SECOP II`;
    else if (a.orden > ORDEN_MAX_PLAN) motivo = "no se lee solo: ábralo en SECOP II si lo necesita";
    else if (a.tipo === "pliego_borrador" && hayPliego) motivo = "hay pliego definitivo: el borrador no cuenta";
    else if (a.tipo === "documento_base" && a.id_documento !== baseElegida) motivo = "ya se lee la versión más nueva del documento base";
    else if ((a.tipo === "pliego" || a.tipo === "pliego_borrador") && !pliegosElegidos.has(a.id_documento)) motivo = `es una versión más vieja del pliego: se leen las ${MAX_PLIEGOS_PLAN} más nuevas`;
    else if (plan.length >= MAX_DOCS_PLAN) motivo = "tope de documentos leídos solos";
    a.en_plan = !motivo; a.motivo_omision = motivo;
    if (!motivo) plan.push(a.id_documento);
  }
  const resumen = {
    publicados, distintos: archivos.length, de_la_entidad: archivos.filter((a) => a.de_la_entidad).length, de_proponentes: archivos.filter((a) => !a.de_la_entidad).length,
    en_plan: plan.length, no_legibles: archivos.filter((a) => a.de_la_entidad && !a.legible).length, adendas: archivos.filter((a) => a.tipo === "adenda").length,
  };
  return { archivos, plan, resumen };
}

/* ── los HECHOS de un texto, con página ───────────────────────────────────── */
function contarPaginas(texto) { return (String(texto || "").match(/^[ \t]*\f\d*[ \t]*$/gm) || []).length; }

/** Lo que la aplicación sabe sacar de un texto con marcadores de página. Llama
    a los lectores que ya existen; no interpreta nada por su cuenta. */
/* la PLANTILLA EN BLANCO de Colombia Compra (27-sep-2026): «[Incluir plazo]», «[Nombre de la
   Entidad]»… Un documento diligenciado deja alguno suelto (medido: 0 o 1 en cinco documentos
   base reales); la plantilla trae decenas. Leerla metería el texto modelo como si fuera el del
   proceso («hasta la amortización del anticipo»). */
const MIN_MARCADORES_PLANTILLA = 8;
/* …solo en el DOCUMENTO BASE y en su PRIMERA MITAD: un pliego diligenciado trae al final los
   formatos para el proponente con «[Nombre de la Entidad Estatal]», «[Incluir el número de
   identificación]»… (32 pliegos del corpus con 8 o más: la revisión adversaria vio borrar los
   indicadores de CO1.REQ.10470989 y el «no hay anticipo» de CO1.REQ.8011114) */
function esPlantillaEnBlanco(texto, tipo) {
  if (tipo !== "documento_base") return false;
  const t = String(texto || "");
  const m = t.slice(0, Math.ceil(t.length / 2)).match(/\[(?:incluir|nombre de la entidad|indicar|seleccionar|se[ñn]alar)\b[^\]\n]{0,120}\]/gi);
  return !!m && m.length >= MIN_MARCADORES_PLANTILLA;
}
function hechosDeTexto(texto, { tipo = "otro" } = {}) {
  if (esPlantillaEnBlanco(texto, tipo)) {
    const vacio = hechosDeTexto("", { tipo });
    return { ...vacio, paginas: contarPaginas(String(texto)), caracteres: String(texto).length, plantilla_en_blanco: true };
  }
  const t = String(texto || "");
  const { detectar, niegaAnticipo } = require("./dictamen_reglas.js");
  const { extraerHabilitantes } = require("./diff.js");
  const { extraerHitos } = require("./cronograma.js");
  const { leerDeducciones } = require("./deducciones.js");
  const detecciones = {};
  for (const [k, v] of detectar(t)) detecciones[k] = v;
  const numericos = {};
  const deNumerico = (id, h) => ({ id, etiqueta: h.etiqueta, valor: h.valor, tipo: h.tipo, evidencia: h.evidencia, pagina: h.pagina == null ? null : h.pagina, tabla: h.tabla || null, ...(Array.isArray(h.valores) ? { valores: h.valores } : {}), ...(h.limite_rango_smmlv ? { limite_rango_smmlv: h.limite_rango_smmlv } : {}) });
  for (const [id, h] of Object.entries(extraerHabilitantes(t) || {})) numericos[id] = deNumerico(id, h);
  /* la tabla de MIPYME aparte (27-sep-2026): las cifras que el documento fija solo para
     ellas; la guía las usa si el RUP dice que la empresa es Mipyme (lib/perfiles.esMipyme) */
  const numericosMipyme = {};
  for (const [id, h] of Object.entries(extraerHabilitantes(t, { mipyme: true }) || {})) if (h.tabla === "mipyme") numericosMipyme[id] = deNumerico(id, h);
  let hitos = [], deducciones = [];
  try { hitos = (extraerHitos(t).hitos || []).slice(0, MAX_HITOS); } catch { hitos = []; }
  try { deducciones = (leerDeducciones(t).conceptos || []).slice(0, MAX_DEDUCCIONES).map((c) => ({ id: c.id, etiqueta: c.etiqueta, pct: c.pct, naturaleza: c.naturaleza, base: c.base })); } catch { deducciones = []; }
  const ant = (detecciones.anticipo_o_pago_anticipado || [])[0] || null;
  /* `niega` lo decide detectar mirando las líneas vecinas (la parte numerada puede estar en la de abajo): la cita sola
     se vuelve a leer solo si no lo trae (detecciones anteriores a ese campo) */
  /* «mencion»: solo el índice, un título o una fórmula (peso ≤ 1): el pliego TIENE un
     apartado de anticipo, pero no se leyó qué dice — no es «sí» */
  const anticipo = !ant ? { estado: "sin_dato", linea: null, pagina: null }
    : ant.niega === true || (ant.niega == null && niegaAnticipo(plegar(ant.linea))) ? { estado: "no", linea: ant.linea, pagina: ant.pagina }
      : (ant.peso != null && ant.peso <= 1) ? { estado: "mencion", linea: ant.linea, pagina: ant.pagina }
        : { estado: "si", linea: ant.linea, pagina: ant.pagina };
  /* lo que el documento dice del REPARTO de un consorcio (lib/participacion):
     best-effort como los hitos, y `null` —no [] — si el lector falló, porque
     [] quiere decir «se leyó y no hay cláusula» */
  const { leerParticipacion, leerMetodoPlural } = require("./participacion.js");
  let participacion = null, metodoPlural = null;
  try { participacion = leerParticipacion(t).slice(0, MAX_CLAUSULAS); } catch { participacion = null; }
  try { metodoPlural = leerMetodoPlural(t); } catch { metodoPlural = null; }
  /* los códigos con que el pliego pide la experiencia (lib/codigos_experiencia):
     [] = se leyó y no los trae; null = el lector falló */
  let codigosExperiencia = null;
  try {
    const todas = require("./codigos_experiencia.js").leerCodigosExperiencia(t);
    codigosExperiencia = todas.slice(0, MAX_LECTURAS_CODIGOS);
    // más tablas que el tope (un pliego con muchos lotes): la unión quedaría corta, y se marca
    if (todas.length > MAX_LECTURAS_CODIGOS) codigosExperiencia[MAX_LECTURAS_CODIGOS - 1] = { ...codigosExperiencia[MAX_LECTURAS_CODIGOS - 1], completa: false };
  } catch { codigosExperiencia = null; }
  /* la FÓRMULA del capital de trabajo exigido (lib/capital_trabajo, 27-sep-2026):
     en los pliegos tipo es una fórmula, no una cifra, y el lector de cifras no la
     ve. null si el lector falló (no es «no la declara») */
  let capitalTrabajo = null;
  try { capitalTrabajo = require("./capital_trabajo.js").leerFormulaCapital(t); } catch { capitalTrabajo = null; }
  /* el porcentaje de la garantía de seriedad y el de las Mipyme (lib/garantia_seriedad): null = no se leyó */
  let garantiaSeriedad = null;
  try { garantiaSeriedad = require("./garantia_seriedad.js").leerGarantiaSeriedad(t); } catch { garantiaSeriedad = null; }
  /* el presupuesto que dice la tabla 1.1 del pliego, para AVISAR si SECOP II publica otro (lib/presupuesto_pliego, 17-oct-2026) */
  let presupuestoPliego = null;
  if (["pliego", "pliego_borrador", "documento_base", "adenda"].includes(tipo)) { try { presupuestoPliego = require("./presupuesto_pliego.js").leerPresupuestoDelPliego(t); } catch { presupuestoPliego = null; } }
  /* la TABLA de experiencia del pliego tipo (lib/tabla_experiencia, 27-sep-2026):
     null si no la trae o si el lector falló; nunca se completa con la del pliego tipo */
  let tablaExperiencia = null;
  try { tablaExperiencia = require("./tabla_experiencia.js").leerTablaExperiencia(t); } catch { tablaExperiencia = null; }
  // y el TIPO DE OBRA que pide cada experiencia, copiado literal (null si no lo trae o si falló)
  let condicionExperiencia = null;
  try { condicionExperiencia = require("./tabla_experiencia.js").leerCondicionExperiencia(t); } catch { condicionExperiencia = null; }
  return { version: hechosVersion(), tipo, paginas: contarPaginas(t), caracteres: t.length, detecciones, requisitos_numericos: numericos, requisitos_mipyme: numericosMipyme, lotes: require("./diff.js").lotesDe(t), hitos, deducciones, anticipo, citas: citasDeTexto(t), participacion, metodo_plural: metodoPlural, codigos_experiencia: codigosExperiencia, capital_trabajo: capitalTrabajo, tabla_experiencia: tablaExperiencia, condicion_experiencia: condicionExperiencia, garantia_seriedad: garantiaSeriedad, presupuesto_pliego: presupuestoPliego };
}

/* ── el reconocimiento de texto (OCR) SATURADO se reintenta solo (27-sep-2026) ──
   OCR.space gratuito responde «E571: Free OCR API overloaded… Temporary
   condition» durante horas, y el escaneo quedaba «no se pudo leer» hasta que el
   dueño pulsara «Volver a buscar documentos» (que no sabe cuándo pulsar). Un
   documento que falló POR SATURACIÓN guarda `reintentar_desde` y vuelve a
   `pendientes` pasada esa hora: Mis procesos lo lee solo la próxima vez que se
   abra. La espera se DOBLA en cada saturación seguida (30 min, 1 h, 2 h… hasta
   12 h): un servicio caído todo el día no puede gastar cupo ni la pestaña del
   dueño cada vez que abre la página. Una fecha ilegible no reintenta (se
   queda para el «Volver a buscar» manual, como cualquier fallo). */
const ESPERA_SATURADO_MIN = 30;
const ESPERA_SATURADO_MAX_MIN = 12 * 60;
function reintentoTrasSaturacion(previo, ahoraMs) {
  const n = previo && previo.saturado === true && Number.isInteger(previo.intentos) && previo.intentos > 0 ? previo.intentos + 1 : 1;
  const min = Math.min(ESPERA_SATURADO_MIN * 2 ** (n - 1), ESPERA_SATURADO_MAX_MIN);
  return { saturado: true, intentos: n, reintentar_desde: new Date(ahoraMs + min * 60000).toISOString() };
}
const reintentable = (x, ahoraMs) => !!(x && x.saturado === true && x.definitivo !== true && Date.parse(x.reintentar_desde) <= ahoraMs);

/* ── el estado de la lectura de un proceso ────────────────────────────────── */
/** `docs` = lo guardado bajo claveDocs: {indice, leidos, ilegibles} o null. */
/** ¿Este resultado de Formulario 1 en Excel se obtuvo con las reglas de esta versión? Sin `version` (o con otra) no vale: se relee. */
const formularioVigente = (f) => !!f && f.version === VERSION;

function resumenLectura(docs, ahoraMs = Date.now()) {
  const d = docs || {};
  const indice = d.indice || null;
  const leidos = d.leidos || {}, ilegibles = d.ilegibles || {}, formularios = d.formularios || {};
  if (!indice) return { estado: "sin_indice", publicados: null, en_plan: null, leidos: 0, ilegibles: 0, por_actualizar: 0, pendientes: [], consultado_el: null, motivo: null };
  const archivos = Array.isArray(indice.archivos) ? indice.archivos : [];
  const plan = Array.isArray(indice.plan) ? indice.plan : [];
  /* un Formulario 1 en Excel ya leído (publicable o no) tampoco está pendiente: su resultado vive en `formularios`, aparte de los textos.
     SOLO si se leyó con las reglas de ESTA versión (`formularioVigente`): uno leído con reglas anteriores —un total que hoy no pasaría la
     puerta, una hoja que hoy se descartaría— vuelve a estar pendiente y se lee otra vez; sin esto quedaba «leído» para siempre (19-oct-2026). */
  const pendientes = plan.filter((id) => !formularioVigente(formularios[id]) && (!leidos[id] || releerPorCorte(leidos[id]) || !!(d.relecturas && d.relecturas[id])) && (!ilegibles[id] || reintentable(ilegibles[id], ahoraMs))).map((id) => archivos.find((a) => a.id_documento === id)).filter(Boolean);
  /* hechos de una versión anterior de las reglas: «por leer» para que el navegador
     pida el índice y el servidor los rehaga desde el texto guardado */
  const porActualizar = Object.values(leidos).filter((x) => !x || !x.hechos || x.hechos.version !== hechosVersion()).length;
  const estado = !archivos.length ? "sin_archivos" : pendientes.length || porActualizar ? "por_leer" : "leido";
  /* `leidos` e `ilegibles` cuentan TODO lo guardado, esté o no en el plan de hoy (un
     índice refrescado puede sacar del plan un documento que ya se leyó: lo leído no
     se pierde); `pendientes` sí es solo el plan */
  return { estado, publicados: (indice.resumen && indice.resumen.publicados) != null ? indice.resumen.publicados : archivos.length, en_plan: plan.length,
    leidos: Object.keys(leidos).length, ilegibles: Object.keys(ilegibles).length, por_actualizar: porActualizar, pendientes, consultado_el: indice.consultado_el || null, motivo: indice.motivo || null };
}

/* ── lo que dicen los documentos, para la guía ────────────────────────────── */
const PRIORIDAD_FUENTE = ["pliego", "adenda", "documento_base", "pliego_borrador", "matriz_indicadores", "estudio_previo", "anexo_tecnico", "presupuesto", "cronograma", "respuesta_observaciones", "aviso", "resolucion", "matriz_riesgos", "analisis_sector", "informe_evaluacion", "formato", "otro"];
const CAMPO_PERFIL = Object.freeze({ rentabilidad_patrimonio: "rentabilidadPatrimonio", rentabilidad_activo: "rentabilidadActivo", capital_trabajo: "capitalTrabajo", patrimonio: "patrimonio", liquidez: "liquidez", endeudamiento: "endeudamiento", cobertura: "coberturaIntereses", experiencia_smmlv: "expSMMLV", experiencia_general: "expSMMLV", experiencia_especifica: "expSMMLV" });
const ETIQUETA_LLANA = Object.freeze({ rentabilidad_patrimonio: "Rentabilidad del patrimonio mínima exigida", rentabilidad_activo: "Rentabilidad del activo mínima exigida", capital_trabajo: "Capital de trabajo exigido", patrimonio: "Patrimonio exigido", liquidez: "Liquidez mínima exigida", endeudamiento: "Endeudamiento máximo permitido", cobertura: "Cobertura de intereses mínima exigida", experiencia_smmlv: "Experiencia exigida (en salarios mínimos)", experiencia_general: "Experiencia general exigida (en salarios mínimos)", experiencia_especifica: "Experiencia específica exigida (en salarios mínimos)", plazo_meses: "Plazo de ejecución que fija el documento" });
const ORDEN_DETECCIONES = ["causal_de_rechazo", "visita_obligatoria", "personal", "equipos_o_laboratorio", "certificaciones", "garantias", "forma_de_pago", "multas", "item_sin_valor", "licencia_o_permiso", "marca_sin_equivalente", "subcontratista_o_proveedor_impuesto"];
const DETECCIONES_RIESGO = new Set(["multas", "item_sin_valor", "marca_sin_equivalente", "subcontratista_o_proveedor_impuesto", "licencia_o_permiso"]);
/* un «Documento base borrador.pdf» o «DOCUMENTO BASE PROYECTO DE PLIEGO» se clasifica documento_base, pero es un
   borrador (segunda revisión adversaria del presupuesto): el nombre manda, con la misma RE_BORRADOR de clasificarArchivo */
const esBorradorDoc = (y) => y.tipo === "pliego_borrador" || (y.tipo === "documento_base" && RE_BORRADOR.test(nombrePlegado(y.nombre || "")));

/* ── EL DOCUMENTO QUE ES «EL PLIEGO» (18-oct-2026) ──────────────────────────────────────────────────────────
   Una sola regla para el vigía de adendas (qué se registra como versión del pliego) y para el texto que leen el
   dictamen, el cronograma y los descuentos (lib/handlers/pliego/cronograma.textoGuardado). Medido en 228 licitaciones de
   obra de 2026 (índices de dmgg-8hin, corte 18-oct-2026): en 85 el documento base (el pliego tipo) se leía pero no entraba
   al vigía, y el dictamen respondía «Todavía no hay texto guardado de este pliego»; en 7 el último texto del vigía era un
   anexo o unas observaciones con «pliego» en el nombre («OBSERVACIONES PLIEGO DEF…» leídas DESPUÉS del pliego
   definitivo, «ANEXOS PLIEGO DE CONDICIONES.docx», «OFICIO PREGUNTAS Y RESPUESTAS…»). */
const RE_NO_ES_VERSION = /formato|formulario|anexo|apendice|minuta|observacion|respuesta|oficio|glosario|matri(?:z|ces)/;
/* …solo ANTES del nombre del pliego: «OBSERVACIONES PLIEGO DEF…», «ANEXOS PLIEGO DE CONDICIONES» son otra cosa; «Pliego
   definitivo ajustado con observaciones», «PLIEGO DE CONDICIONES DEFINITIVO CON ANEXOS» o «Documento base definitivo con
   formularios» SON el pliego (revisión adversaria: excluirlos dejaba leer la versión anterior) */
const RE_NOMBRE_DEL_PLIEGO = /pliego|condiciones|invitacion|terminos de referencia|documento\s+(?:base|tipo)/;
const esVersionDelPliego = (y) => {
  if (!y || !(y.tipo === "pliego" || y.tipo === "pliego_borrador" || y.tipo === "documento_base")) return false;
  const n = nombrePlegado(y.nombre || "");
  const m = RE_NOMBRE_DEL_PLIEGO.exec(n);
  return !RE_NO_ES_VERSION.test(m ? n.slice(0, m.index) : n);
};
/* los documentos LEÍDOS que pueden dar el texto del pliego, del que manda al último: el definitivo antes que el borrador,
   el más reciente en SECOP II (fecha de carga), a igual fecha el pliego antes que el documento base (el orden de
   PRIORIDAD_FUENTE, el de los hechos) y, por último, el leído después. La plantilla en blanco de Colombia Compra no cuenta */
function candidatosAlTextoDelPliego(docs) {
  const orden = (x) => PRIORIDAD_FUENTE.indexOf(x.tipo);
  return Object.entries((docs || {}).leidos || {}).map(([id, x]) => ({ ...x, id_documento: id }))
    .filter((x) => x && esVersionDelPliego(x) && !(x.hechos && x.hechos.plantilla_en_blanco))
    .sort((a, b) => Number(esBorradorDoc(a)) - Number(esBorradorDoc(b))
      || String(b.fecha_carga || "").localeCompare(String(a.fecha_carga || ""))
      || orden(a) - orden(b)
      || String(b.leido_el || "").localeCompare(String(a.leido_el || "")));
}

/* un pliego o documento base DEFINITIVO del índice, publicado en SECOP II después del elegido, que no se leyó (más de
   20 MB, comprimido, escaneo sin texto, fuera del plan): el texto del dictamen es de una versión anterior y hay que decirlo.
   El más nuevo, con su motivo; `pendiente` si está en el plan de lectura y todavía no se intentó (no es «no se pudo»);
   null si no hay */
function definitivoMasNuevoSinLeer(docs, elegido) {
  const d = docs || {};
  const leidos = d.leidos || {};
  const fecha = String((elegido && elegido.fecha_carga) || "").slice(0, 10);
  if (!fecha) return null;
  const ilegibles = d.ilegibles || {};
  const fuera = ((d.indice && Array.isArray(d.indice.archivos)) ? d.indice.archivos : [])
    .filter((a) => a && a.de_la_entidad !== false && !leidos[a.id_documento] && esVersionDelPliego(a) && !esBorradorDoc(a)
      && String(a.fecha_carga || "").slice(0, 10) > fecha)
    .sort((a, b) => String(b.fecha_carga || "").localeCompare(String(a.fecha_carga || "")));
  if (!fuera.length) return null;
  const a = fuera[0];
  const il = ilegibles[a.id_documento];
  const plan = (d.indice && Array.isArray(d.indice.plan)) ? d.indice.plan.map(String) : [];
  const pendiente = !il && !a.motivo_omision && plan.includes(String(a.id_documento));
  return { nombre: a.nombre || null, fecha_carga: String(a.fecha_carga).slice(0, 10), motivo: (il && il.motivo) || a.motivo_omision || null, pendiente };
}

const etiquetaDoc = (x) => `${x.tipo_legible || (TIPOS[x.tipo] || TIPOS.otro).legible}${x.nombre ? ` (${x.nombre})` : ""}`;

/* EL REPARTO QUE EXIGEN LOS DOCUMENTOS (26-sep-2026). Junta las cláusulas de
   participación de TODOS los documentos leídos —la unión, no el primero: Yumbo y
   la ESE de Casanare la traen solo en los estudios previos— y la fórmula de los
   indicadores del plural. `leidos` cuenta los documentos cuya lectura ya trae
   estos dos campos (versión 4 o posterior): con 0, nadie sabe si hay cláusula, y
   quien llama no puede decir «no la encontré».
     clausulas: [{forma, porcentaje, mayoritaria, cita, pagina, documento}]
     metodo:    {metodo, cita, pagina, documento} | {metodo: null, contradictorio: true, citas} | null */
function participacionDe(docs) {
  const d = docs || {};
  const leidos = Object.entries(d.leidos || {}).map(([id, x]) => ({ id_documento: id, ...x }))
    .filter((x) => x && x.hechos && Array.isArray(x.hechos.participacion));
  leidos.sort((a, b) => PRIORIDAD_FUENTE.indexOf(a.tipo) - PRIORIDAD_FUENTE.indexOf(b.tipo) || String(b.fecha_carga || b.leido_el || "").localeCompare(String(a.fecha_carga || a.leido_el || "")));
  const vistas = new Set(), clausulas = [];
  for (const x of leidos) {
    for (const c of x.hechos.participacion) {
      const clave = `${c.forma}|${c.porcentaje}|${!!c.mayoritaria}${c.forma === "otro" ? `|${String(c.cita || "").slice(0, 160)}` : ""}`;
      if (vistas.has(clave)) continue;
      vistas.add(clave);
      clausulas.push({ ...c, mayoritaria: !!c.mayoritaria, documento: etiquetaDoc(x) });
    }
  }
  /* la fórmula: si dos documentos dicen fórmulas distintas, no se afirma ninguna */
  const metodos = leidos.filter((x) => x.hechos.metodo_plural).map((x) => ({ ...x.hechos.metodo_plural, documento: etiquetaDoc(x) }));
  const distintos = [...new Set(metodos.map((m) => m.metodo || "contradictorio"))];
  const metodo = !metodos.length ? null
    : distintos.length === 1 && distintos[0] !== "contradictorio" ? metodos[0]
      : { metodo: null, contradictorio: true, citas: metodos.flatMap((m) => (m.citas ? m.citas.map((c) => ({ ...c, documento: m.documento })) : [m])).slice(0, 4) };
  /* los leídos con reglas viejas (o con el lector caído): lo que traigan no se
     sabe, y mientras existan la recomendación es provisional */
  const sinReleer = Object.values(d.leidos || {}).filter((x) => x && x.hechos && !Array.isArray(x.hechos.participacion)).length;
  return { leidos: leidos.length, sin_releer: sinReleer, documentos: leidos.map((x) => etiquetaDoc(x)), clausulas, metodo, codigos: codigosDe(d) };
}

/* LOS CÓDIGOS DE LA EXPERIENCIA que piden los documentos (26-sep-2026): la
   UNIÓN de todas las listas leídas (lib/codigos_experiencia.unirLecturas), cada
   lectura con su documento. Con la unión la cota de lib/reparto sigue siendo
   una cota superior. `leidos` cuenta los documentos leídos con la versión 5 o
   posterior; los de antes no dicen nada de códigos (`sin_releer`), y con ellos
   la experiencia se sigue midiendo con el segmento 72 entero. */
function codigosDe(docs) {
  const d = docs || {};
  const leidos = Object.entries(d.leidos || {}).map(([id, x]) => ({ id_documento: id, ...x }))
    .filter((x) => x && x.hechos && Array.isArray(x.hechos.codigos_experiencia));
  leidos.sort((a, b) => PRIORIDAD_FUENTE.indexOf(a.tipo) - PRIORIDAD_FUENTE.indexOf(b.tipo) || String(b.fecha_carga || b.leido_el || "").localeCompare(String(a.fecha_carga || a.leido_el || "")));
  const { unirLecturas } = require("./codigos_experiencia.js");
  const union = unirLecturas(leidos.flatMap((x) => x.hechos.codigos_experiencia.map((l) => ({ ...l, documento: etiquetaDoc(x) }))));
  const sinReleer = Object.values(d.leidos || {}).filter((x) => x && x.hechos && !Array.isArray(x.hechos.codigos_experiencia)).length;
  return { leidos: leidos.length, sin_releer: sinReleer, ...(union || { codigos: null, lecturas: [], solo_segmento: false, exigente: null }) };
}

/* EL CAPITAL DE TRABAJO EXIGIDO, CON LA FÓRMULA DEL PLIEGO (27-sep-2026, N31).
   Los pliegos tipo no traen una cifra: traen una fórmula («CTd = (POE - Anticipo
   o Pago anticipado) x 33%»), y el lector de cifras de lib/diff no la ve. Manda
   el documento de más prioridad que la declara (la adenda más reciente gana al
   pliego, como con las cifras); el cálculo y la frase son de lib/capital_trabajo.
   · Sin cifra leída, la calculada entra como `requisito_capital_trabajo` (la
     ficha, el requisito «financieros» y la acción del socio la leen de ahí) y se
     juzga con `juicioRequisito` cuando el cálculo es exacto; si no lo es (el
     anticipo no se sabe) el juicio es el de lib/capital_trabajo.
   · Con cifra leída en una línea (dato publicado), manda ella; si la fórmula
     exacta da otra cifra, o la leída pasa de lo más que la fórmula puede pedir,
     se manda a confirmar con las dos.
   Devuelve la lectura para la guía (qué dice la casilla cuando no hay cifra). */
/* LA GARANTÍA DE SERIEDAD ENTRE DOCUMENTOS (28-sep-2026, revisión adversaria). La ADENDA más
   reciente que la fija gana, como con las cifras y el capital de trabajo; si no hay, cada clase
   (general / Mipyme) sale del primer documento por prioridad que la trae —el pliego puede traer
   solo la de las Mipyme y el estudio previo la de todos—, y si dos documentos dan cifras
   generales DISTINTAS no se escoge una: van juntas y la guía toma la mayor. Cada cifra lleva su
   documento. */
function garantiaDeDocumentos(leidos) {
  const con = leidos.filter((x) => x.hechos && x.hechos.garantia_seriedad);
  if (!con.length) return null;
  const fecha = (x) => String(x.fecha_carga || x.leido_el || "");
  const adendas = con.filter((x) => x.tipo === "adenda").sort((a, b) => fecha(b).localeCompare(fecha(a)));
  const conDoc = (x, v) => (v ? { ...v, documento: etiquetaDoc(x) } : null);
  const deAdenda = (clase) => { const x = adendas.find((y) => y.hechos.garantia_seriedad[clase]); return x ? conDoc(x, x.hechos.garantia_seriedad[clase]) : null; };
  const resto = con.filter((x) => x.tipo !== "adenda");
  let general = deAdenda("general"), ambiguo = false, leidasGeneral = general ? [general.pct] : [];
  if (!general) {
    const valores = new Set();
    for (const x of resto) for (const v of (x.hechos.garantia_seriedad.leidas && x.hechos.garantia_seriedad.leidas.general) || (x.hechos.garantia_seriedad.general ? [x.hechos.garantia_seriedad.general.pct] : [])) valores.add(v);
    leidasGeneral = [...valores];
    const primero = resto.find((x) => x.hechos.garantia_seriedad.general);
    if (valores.size === 1 && primero) general = conDoc(primero, primero.hechos.garantia_seriedad.general);
    else if (valores.size > 1) ambiguo = true;
  }
  let mipyme = deAdenda("mipyme");
  if (!mipyme) { const x = resto.find((y) => y.hechos.garantia_seriedad.mipyme); mipyme = x ? conDoc(x, x.hechos.garantia_seriedad.mipyme) : null; }
  // un documento con cifras que no se pudieron separar y ninguna elegida: se dice, no se cae a la referencia
  if (!general && !mipyme && con.some((x) => x.hechos.garantia_seriedad.ambiguo)) ambiguo = true;
  if (!general && !mipyme && !ambiguo) return null;
  return { general, mipyme, ambiguo, leidas: { general: leidasGeneral }, documento: general ? general.documento : mipyme ? mipyme.documento : etiquetaDoc(con[0]) };
}

function capitalDeDocumentos(leidos, { hechos, hecho, perfilObj, presupuestoCOP, plazoMeses, anticipoPctObjeto, conAnticipo, fmtValorRequisito, metodoLeido = null, clausulas = null }) {
  const Ct = require("./capital_trabajo.js");
  const conLectura = leidos.filter((x) => x.hechos.capital_trabajo && typeof x.hechos.capital_trabajo === "object");
  if (!conLectura.length) return null;
  const adendas = conLectura.filter((x) => x.tipo === "adenda" && x.hechos.capital_trabajo.estado === "leida");
  const fuente = adendas[0] || conLectura.find((x) => x.hechos.capital_trabajo.estado === "leida") || conLectura.find((x) => x.hechos.capital_trabajo.estado === "ilegible") || conLectura[0];
  const lectura = fuente.hechos.capital_trabajo;
  const propio = perfilObj ? perfilObj.capitalTrabajo : null;
  const r = Ct.capitalDelExpediente({ lectura, presupuesto: presupuestoCOP, plazoMeses, anticipo: { pliego: conAnticipo ? conAnticipo.hechos.anticipo.estado : null, pctObjeto: anticipoPctObjeto }, propio });
  const documento = etiquetaDoc(fuente);
  const salida = { ...r, documento, leidos: conLectura.length };
  if (r.estado !== "calculado") return salida;
  const leido = hechos.find((f) => f.clave === "requisito_capital_trabajo");
  if (leido) {
    const distinta = r.exacto ? Math.abs(Number(leido.valor) - r.valor) > 1 : Number(leido.valor) > r.valor_sin_anticipo + 1;
    if (distinta && leido.estado !== "revisar") {
      Object.assign(leido, { estado: "revisar", confirmar: true, texto: `El documento trae ${leido.valor_legible} en una línea, y con la fórmula del pliego (${r.formula_legible}) sale ${fmtValorRequisito(r.valor, "dinero")}${r.exacto ? "" : " como mucho"}: confirme cuál vale en el pliego.` });
    }
    return { ...salida, con_cifra_leida: true };
  }
  const { REQUISITOS, juicioRequisito } = require("./diff.js");
  const req = REQUISITOS.find((q) => q.id === "capital_trabajo");
  // exacto: la MISMA regla de cumplimiento que las demás cifras; si no, la de lib/capital_trabajo
  const juzgar = (p) => (r.exacto ? juicioRequisito(req, p, r.valor).estado
    : Ct.capitalDelExpediente({ lectura, presupuesto: presupuestoCOP, plazoMeses, anticipo: { pliego: conAnticipo ? conAnticipo.hechos.anticipo.estado : null, pctObjeto: anticipoPctObjeto }, propio: p }).juicio || "sin_dato");
  /* un CONSORCIO: el capital de trabajo del plural con la fórmula del pliego (o con las tres), con el
     MISMO juicio de arriba para cada cifra (lib/reparto.casillaFinancieraPlural, 27-sep-2026, N21) */
  const pl = require("./reparto.js").casillaFinancieraPlural({ perfil: perfilObj, campo: "capitalTrabajo", juzgar, metodoLeido, clausulas, fmt: (v) => fmtValorRequisito(Number(v), "dinero") });
  const juicio = pl ? pl.estado : r.exacto ? juzgar(propio) : r.juicio;
  // una fórmula leída con reconocimiento de texto se confirma, como cualquier cifra de un escaneo
  const ocr = fuente.origen === "ocr" && (juicio === "si" || juicio === "no");
  const estado = ocr ? "revisar" : juicio === "si" ? "cumple" : juicio === "no" ? "no_cumple" : "revisar";
  const textoCt = pl ? `${r.pide} ${pl.texto}` : r.texto;
  hecho({ clave: "requisito_capital_trabajo", requisito: "capital_trabajo", titulo: ETIQUETA_LLANA.capital_trabajo, valor: r.valor, valor_legible: fmtValorRequisito(r.valor, "dinero"), tipo_valor: "dinero",
    texto: ocr ? `Leída con reconocimiento de texto de un escaneo: confirme la fórmula en el documento. ${textoCt}` : textoCt,
    ...(pl ? { plural: { metodo_leido: pl.metodo_leido, metodos: pl.metodos, por_metodo: pl.por_metodo, valor: pl.valor, repartos_que_llegan: pl.repartos_que_llegan || null, barrido_reparto: pl.barrido_reparto || null, integrante_barrido: pl.integrante_barrido || null } } : {}),
    documento, pagina: r.pagina, cita: r.cita, estado, calculado_con_formula: r.formula_legible,
    // en un consorcio, «revisar» porque las fórmulas no coinciden no es una cifra por confirmar en el documento; el anticipo sí
    ...(estado === "revisar" && juicio !== "sin_dato" && (!pl || pl.por_metodo.some((x) => x.estado === "revisar")) ? { confirmar: true } : {}) });
  return salida;
}

/* LA EXPERIENCIA POR LA TABLA DEL PLIEGO TIPO (27-sep-2026, CO1.REQ.11039338). Cuando
   ninguna línea trae la experiencia en salarios mínimos pero un documento trae la tabla
   «número de contratos → % del presupuesto oficial» (lib/tabla_experiencia), la
   experiencia exigida es esa tabla por el presupuesto PUBLICADO: el dato es del pliego
   (con su página) y la multiplicación es la que el pliego manda hacer. Se juzga con la
   regla de siempre (lib/reparto.experienciaSola) y la tabla leída, que fija la exigida
   con cada número de contratos. Una cifra leída en una línea manda sobre la tabla
   (no se tocan). Sin presupuesto o por lotes (el presupuesto del lote no se sabe), no
   hay cifra: se calla, y la casilla sigue «no se leyó». */
function experienciaDeTabla(leidos, { hechos, hecho, perfilObj, presupuestoSMMLV, contexto }) {
  if (hechos.some((f) => f.clave === "requisito_experiencia_general" || f.clave === "requisito_experiencia_smmlv")) return;
  if (!(presupuestoSMMLV > 0)) return;
  const conT = leidos.filter((y) => y.hechos.tabla_experiencia && Array.isArray(y.hechos.tabla_experiencia.tramos) && y.hechos.tabla_experiencia.tramos.length);
  // la adenda MÁS RECIENTE que trae otra tabla es la que vale (como el capital de trabajo)
  const x = conT.find((y) => y.tipo === "adenda") || conT[0];
  if (!x) return;
  const t = x.hechos.tabla_experiencia;
  const { REQUISITOS, juicioRequisito, experienciaSumadaDe, fmtValorRequisito } = require("./diff.js");
  // redondeada solo para MOSTRAR: la cifra que decide (`valor`) viaja cruda
  const s = (v) => fmtValorRequisito(Math.round(v * 100) / 100, "smmlv");
  const req = REQUISITOS.find((r) => r.id === "experiencia_general");
  const exigida = (t.tramos[0].pct / 100) * presupuestoSMMLV;
  const propio = perfilObj ? perfilObj.expSMMLV : null;
  const juicio = juicioRequisito(req, propio, exigida, contexto ? { ...contexto, tablaExperiencia: t.tramos } : null);
  const exp = experienciaSumadaDe(juicio);
  const cuantos = (r) => (r.hasta == null ? `con ${r.desde} o más contratos` : r.hasta === r.desde ? `con ${r.desde} contrato${r.desde === 1 ? "" : "s"}` : r.hasta === r.desde + 1 ? `con ${r.desde} o ${r.hasta} contratos` : `con ${r.desde} a ${r.hasta} contratos`);
  const filas = t.tramos.map((r, i) => `${cuantos(r)}, ${s((r.pct / 100) * presupuestoSMMLV)} (${String(r.pct).replace(".", ",")} %${i === 0 ? " del presupuesto" : ""})`);
  const tramosLegible = `Sus contratos deben sumar: ${filas.join("; ")}`;
  const mayor = exp && exp.mayor_contrato_smmlv != null ? ` (${s(exp.mayor_contrato_smmlv)}${exp.mayor_por_su_porcentaje ? ", por su porcentaje de participación" : ""})` : "";
  const nContratos = (i) => (i === 1 ? "un contrato" : `${i} contratos`);
  const juicioTexto = !juicio || juicio.estado === "sin_dato" ? "La aplicación no tiene la experiencia de su empresa: compárela con su registro de proponente."
    : juicio.estado === "si" ? `Su contrato más grande${mayor} llega solo a lo que pide con un contrato. Confirme en el pliego que sea del tipo de obra y de los códigos que pide.`
      : juicio.estado === "revisar" && exp && exp.alcanza_con != null ? (exp.medida === "segmento72"
        ? `Con ${exp.alcanza_con === 1 ? "su contrato más grande" : `sus ${exp.alcanza_con} mayores contratos`} llega a lo que pide con ${nContratos(exp.alcanza_con)} (${s(exp.exigida_con_esos_smmlv)}). Confirme en el pliego que sean del tipo de obra y de los códigos que pide.`
        : `Su registro no trae la lista de sus contratos: con ${nContratos(exp.alcanza_con)} del tamaño del más grande${mayor} podría llegar a lo que pide con ${nContratos(exp.alcanza_con)} (${s(exp.exigida_con_esos_smmlv)}). Compárelo con su registro.`)
        : juicio.estado === "no" ? `${exp && exp.suman_smmlv != null ? `Ni sumando sus ${exp.contratos} mayores contratos (${s(exp.suman_smmlv)}) llega` : `Ni con ${exp ? nContratos(exp.contratos) : "sus contratos"} del tamaño del más grande${mayor} llegaría`} a lo que pide${exp && exp.contratos ? ` con ${nContratos(exp.contratos)} (${s(require("./tabla_experiencia.js").proporcionDeTabla(t.tramos, exp.contratos) * presupuestoSMMLV)})` : ""}. Un socio puede aportar la experiencia que falta.`
          : "Compare sus contratos con la tabla del pliego.";
  // leída con reconocimiento de texto: se confirma, como cualquier cifra de un escaneo
  const ocr = x.origen === "ocr";
  const estado = ocr || !juicio ? "revisar" : juicio.estado === "si" ? "cumple" : juicio.estado === "no" ? "no_cumple" : "revisar";
  hecho({ clave: "requisito_experiencia_general", requisito: "experiencia_general", titulo: "Experiencia exigida (tabla del pliego por número de contratos)",
    valor: exigida, valor_legible: s(exigida), tipo_valor: "smmlv",
    texto: `${ocr ? "Leída con reconocimiento de texto de un escaneo: confirme la tabla en el documento. " : ""}${tramosLegible}, calculado con el presupuesto publicado (${s(presupuestoSMMLV)} al salario mínimo vigente). ${juicioTexto}`,
    documento: etiquetaDoc(x), pagina: t.pagina == null ? null : t.pagina, cita: t.cita || null, estado,
    tramos: t.tramos, tramos_legible: tramosLegible, juicio_texto: `${ocr ? "Leída con reconocimiento de texto: confirme la tabla. " : ""}${juicioTexto}`, desde_tabla: true, ...(exp ? { experiencia_sumada: exp } : {}), ...(ocr ? { confirmar: true } : {}) });
}

/* EL TIPO DE OBRA DE LA EXPERIENCIA, COPIADO DEL PLIEGO (27-sep-2026). No se juzga: el
   registro no dice qué obra tuvo cada contrato. Va como hecho «revisar» con el texto literal
   y su página; la adenda más reciente que lo trae gana, como la tabla. */
function condicionDeExperiencia(leidos, { hecho }) {
  const conC = leidos.filter((y) => y.hechos.condicion_experiencia && (y.hechos.condicion_experiencia.general || y.hechos.condicion_experiencia.especifica));
  const x = conC.find((y) => y.tipo === "adenda") || conC[0];
  if (!x) return;
  const c = x.hechos.condicion_experiencia;
  for (const [cual, titulo] of [["general", "Tipo de obra que pide la experiencia general"], ["especifica", "Lo que pide la experiencia específica"]]) {
    const q = c[cual];
    if (!q || !q.texto) continue;
    hecho({ clave: `condicion_experiencia_${cual}`, titulo, texto: q.texto, recortado: !!q.recortado, mas_actividades: cual === "especifica" && !!c.mas_actividades,
      documento: etiquetaDoc(x), pagina: q.pagina == null ? null : q.pagina, cita: q.texto.slice(0, 200), estado: "revisar" });
  }
}

/** Los hechos de todos los documentos leídos, cada uno con su documento y su página.
    `perfilObj` (opcional) permite decir «cumple» / «no cumple» con la regla de lib/diff. */
/* EL PRESUPUESTO DEL PLIEGO FRENTE AL DE SECOP II (17-oct-2026, Fase 2, visto bueno del dueño): solo AVISA,
   no cambia la cifra con que se calculan la K, el capital de trabajo o la experiencia. SECOP II corta los
   centavos: una diferencia de hasta $1 no es diferencia. El aviso va PRIMERO: es el que cambia la oferta.
   Revisión adversaria del mismo día (cada caso con su cerradura):
     · la ADENDA más reciente con cifra gana al pliego, como en la garantía y los requisitos; una adenda sin
       cifra legible no deja dar por buena la del pliego: «revisar», sin ordenar cuál usar;
     · con un pliego definitivo o documento base LEÍDO, el borrador no habla (aunque el definitivo no rinda cifra);
     · por LOTES no se avisa (dos lotes iguales dejaban una sola cifra: «−50 %» falso);
     · una diferencia de más del 50 % es más probablemente una lectura equivocada que un cambio de la entidad:
       «revisar» y que lo compruebe en el pliego, no «Riesgo». */
function elegirPresupuestoPliego(leidos) {
  if (leidos.some((x) => Number(x.hechos && x.hechos.lotes) >= 2)) return null;
  const conCifra = (y) => y.hechos.presupuesto_pliego && y.hechos.presupuesto_pliego.presupuesto && y.hechos.presupuesto_pliego.presupuesto.valor != null;
  const fecha = (y) => String(y.fecha_carga || y.leido_el || "");
  const adendas = leidos.filter((y) => y.tipo === "adenda").sort((a, b) => fecha(b).localeCompare(fecha(a)));
  const esBorrador = esBorradorDoc;
  const hayDefinitivo = leidos.some((y) => (y.tipo === "pliego" || y.tipo === "documento_base") && !esBorrador(y));
  /* UNA VERSIÓN MÁS NUEVA DEL PLIEGO SIN LA TABLA NO DEJA QUE LA CIFRA DE LA VIEJA FIJE EL TECHO (18-oct-2026,
     visto bueno del dueño). Reproducido: pliego definitivo con $900 M y, después, un pliego modificado sin la tabla;
     con SECOP II en $1.000 M el techo de Precios quedaba en los $900 M del viejo. El orden de `leidos` NO se toca:
     loQueDicen ya lo trae por tipo (PRIORIDAD_FUENTE) y, dentro del tipo, del más nuevo al más viejo; reordenar solo
     por fecha subía el techo cuando un documento base más nuevo le ganaba al pliego (revisión adversaria). Se mira
     solo el MISMO tipo, por el día de carga en SECOP II (no por la hora de lectura); el mismo día cuenta como
     posterior: no se sabe cuál rige, y en precios lo caro es el falso positivo. */
  /* la adenda más reciente QUE TRAE la cifra: una de cronograma, posterior, no tapa a la que cambió el presupuesto.
     QUÉ documento da la cifra NO cambia con este arreglo (segunda revisión adversaria: elegirla entre las versiones
     del pliego subía el techo cuando unas «observaciones» traían una cifra menor); solo se añade la comprobación de
     abajo, que únicamente puede mandar el techo a SECOP II con el aviso. */
  const x = adendas.find(conCifra)
    || leidos.find((y) => conCifra(y) && y.tipo !== "adenda" && !(hayDefinitivo && esBorrador(y)));
  const candidatos = leidos.filter((y) => y.tipo !== "adenda" && esVersionDelPliego(y) && !(hayDefinitivo && esBorrador(y)));
  if (!x) return null;
  const diaCarga = (y) => String(y.fecha_carga || "").slice(0, 10);
  const versionSinCifra = x.tipo !== "adenda" && !!diaCarga(x)
    && candidatos.some((y) => y !== x && y.tipo === x.tipo && !conCifra(y) && !!diaCarga(y) && diaCarga(y) >= diaCarga(x));
  return { x, p: x.hechos.presupuesto_pliego.presupuesto, borrador: esBorrador(x), adendaSinCifra: x.tipo !== "adenda" && adendas.length > 0, versionSinCifra };
}
const esDudosa = (valor, secop) => valor < secop * 0.5 || valor > secop * 1.5;

/* EL TOPE DE LA OFERTA (17-oct-2026, visto bueno del dueño): la cifra MÁS BAJA entre el presupuesto de SECOP II y
   el del pliego definitivo (o la adenda más reciente que la trae). Pasarse de cualquiera de las dos deja la oferta
   por fuera, así que el tope solo puede BAJAR, nunca subir. NO se usa la cifra del pliego si es de un borrador, si
   hay una adenda posterior sin la tabla, si es dudosa (más del 50 % de diferencia) o si el proceso va por lotes:
   entonces el tope es el de SECOP II y el aviso sigue en la cabecera. Lo usa Precios para llenar su techo. */
function topeOferta(leidos, presupuestoCOP) {
  const secop = Number(presupuestoCOP) > 0 ? Number(presupuestoCOP) : null;
  const e = elegirPresupuestoPliego(leidos);
  /* sin cifra de SECOP II no hay contra qué contrastar la lectura: no se fija techo (antes el campo quedaba vacío y así
     sigue). Y basta con que el pliego diga MENOS, aunque sea por centavos: SECOP II los corta, así que la tolerancia
     solo hace falta hacia arriba (revisión adversaria) */
  if (secop == null) return null;
  const delPliego = e && !e.borrador && !e.adendaSinCifra && !e.versionSinCifra && !esDudosa(e.p.valor, secop);
  if (delPliego && e.p.valor < secop) {
    return { valor: e.p.valor, fuente: "pliego", secop, pagina: e.p.pagina != null ? e.p.pagina : null, documento: etiquetaDoc(e.x) };
  }
  return { valor: secop, fuente: "secop", secop, pagina: null, documento: null };
}

function presupuestoDelPliego(leidos, { presupuestoCOP, hechos, fmtValorRequisito }) {
  const e = elegirPresupuestoPliego(leidos);
  if (!e) return;
  const { x, p, borrador, adendaSinCifra, versionSinCifra } = e;
  const secop = Number(presupuestoCOP) > 0 ? Number(presupuestoCOP) : null;
  if (secop != null && Math.abs(p.valor - secop) <= 1) return;
  const quien = borrador ? "El proyecto de pliego (borrador)" : x.tipo === "adenda" ? "La adenda más reciente" : "El pliego";
  const base = { cita: p.cita, pagina: p.pagina != null ? p.pagina : null, documento: etiquetaDoc(x), presupuesto_pliego: p.valor, presupuesto_secop: secop, clave: "presupuesto_pliego" };
  if (secop == null) {
    hechos.unshift({ ...base, titulo: "Presupuesto oficial según el pliego", estado: "dato", texto: `${quien} dice ${fmtValorRequisito(p.valor, "dinero")}; SECOP II no publica el presupuesto de este proceso.` });
    return;
  }
  const dif = p.valor - secop;
  const pct = dif / secop * 100;
  const cuanto = `una diferencia de ${fmtValorRequisito(Math.abs(dif), "dinero")}${Math.abs(pct) >= 0.1 ? ` (${pct > 0 ? "+" : "−"}${Math.abs(pct).toFixed(1).replace(".", ",")} %)` : ""}`;
  const dudosa = esDudosa(p.valor, secop);
  const texto = dudosa
    ? `La aplicación leyó ${fmtValorRequisito(p.valor, "dinero")} en la tabla del presupuesto y SECOP II publica ${fmtValorRequisito(secop, "dinero")}: la diferencia es tan grande que puede ser una lectura equivocada. Compruebe la cifra en el pliego.`
    : `${quien} dice ${fmtValorRequisito(p.valor, "dinero")} y SECOP II publica ${fmtValorRequisito(secop, "dinero")}, ${cuanto}. Las cuentas de la aplicación usan la de SECOP II. ${borrador ? "Espere el pliego definitivo y confirme la cifra antes de fijar su precio." : adendaSinCifra ? "Hay una adenda posterior que no trae la tabla del presupuesto: revise si lo cambió y confirme con la entidad cuál cifra rige antes de fijar su precio." : versionSinCifra ? "Hay una versión más nueva del pliego que no trae la tabla del presupuesto: revise si lo cambió y confirme con la entidad cuál cifra rige antes de fijar su precio." : "Confirme con la entidad cuál cifra rige antes de fijar su precio."}`;
  hechos.unshift({ ...base, titulo: "El pliego y SECOP II no coinciden en el presupuesto", /* «dato» solo si el pliego dice MÁS: si dice menos, una oferta al techo de SECOP II se pasa del presupuesto
     oficial y se rechaza (segunda revisión adversaria) */
    estado: Math.abs(pct) < 0.1 && !dudosa && dif > 0 ? "dato" : dudosa || borrador || adendaSinCifra || versionSinCifra ? "revisar" : "riesgo", texto });
}

function loQueDicen(docs, { perfilObj = null, presupuestoCOP = null, tipoContrato = null, plazoMeses = null, anticipoPctObjeto = null } = {}) {
  const d = docs || {};
  const leidos = Object.entries(d.leidos || {}).map(([id, x]) => ({ id_documento: id, ...x })).filter((x) => x && x.hechos);
  if (!leidos.length) return { hechos: [], citas: TEMAS_CITA.map((t) => ({ clave: t.clave, titulo: t.titulo, texto: null, pagina: null, documento: null, id_documento: null })), documentos: [], capital_trabajo: null };
  /* dentro de un mismo tipo, el más RECIENTE primero (por fecha de carga en SECOP II;
     si no la hay, por cuándo se leyó): la última adenda es la que vale */
  leidos.sort((a, b) => PRIORIDAD_FUENTE.indexOf(a.tipo) - PRIORIDAD_FUENTE.indexOf(b.tipo) || String(b.fecha_carga || b.leido_el || "").localeCompare(String(a.fecha_carga || a.leido_el || "")));
  const { REQUISITOS, juicioRequisito, fmtValorRequisito, experienciaSumadaDe, fraseExperiencia, valorSegunRango } = require("./diff.js");
  const { SMMLV } = require("./perfiles.js");
  /* la experiencia se juzga sumando contratos (lib/reparto.experienciaSola, 27-sep-2026) */
  /* un proceso POR LOTES no elige el rango con el presupuesto total (revisión adversaria):
     el rango lo fija el lote al que se presente, que la app no sabe */
  const porLotes = leidos.some((x) => Number(x.hechos && x.hechos.lotes) >= 2);
  const presupuestoSMMLV = !porLotes && Number(presupuestoCOP) > 0 ? Number(presupuestoCOP) / SMMLV : null;
  const contexto = perfilObj ? { perfil: perfilObj, presupuestoSMMLV, tipoContrato } : null;
  const { DETECTORES } = require("./dictamen_reglas.js");
  const hechos = [];
  const hecho = (h) => hechos.push({ estado: null, cita: null, pagina: null, ...h });

  /* anticipo: el primer documento (por prioridad) que lo AFIRMA o lo NIEGA; una simple
     mención (título, índice, fórmula) solo si ninguno decide (27-sep-2026: el pliego que
     solo lo menciona tapaba al anexo técnico que lo niega, CO1.REQ.11037442). Y si dos
     documentos se contradicen, no se escoge uno: se dicen los dos y se manda a confirmar */
  const decide = (x) => x.hechos.anticipo && (x.hechos.anticipo.estado === "si" || x.hechos.anticipo.estado === "no");
  /* quién puede CONTRADECIR a quién: un documento de OTRO tipo y que no sea un borrador. El
     borrador y la versión vieja del mismo tipo siguen guardados aunque salgan del plan, y
     «contradecían» al definitivo (revisión adversaria, 27-sep-2026) */
  const puedeContradecir = (a, b) => !!a && !!b && a !== b && b.tipo !== "pliego_borrador" && a.tipo !== "pliego_borrador" && a.tipo !== b.tipo;
  const conAnticipo = leidos.find(decide) || leidos.find((x) => x.hechos.anticipo && x.hechos.anticipo.estado !== "sin_dato");
  if (conAnticipo) {
    const a = conAnticipo.hechos.anticipo;
    const contrario = decide(conAnticipo) ? leidos.find((x) => puedeContradecir(conAnticipo, x) && decide(x) && x.hechos.anticipo.estado !== a.estado) : null;
    if (contrario) {
      const c = contrario.hechos.anticipo;
      const dondeDice = (x, y) => `${etiquetaDoc(x)}${y.pagina != null ? `, pág. ${y.pagina}` : ""}`;
      hecho({ clave: "anticipo", titulo: "Los documentos no coinciden sobre el anticipo",
        texto: `${dondeDice(conAnticipo, a)} ${a.estado === "no" ? "dice que no hay" : "dice que hay"}; ${dondeDice(contrario, c)} ${c.estado === "no" ? "dice que no hay" : "dice que hay"}. Confírmelo en el pliego definitivo y sus adendas antes de fijar el precio.`,
        documento: etiquetaDoc(conAnticipo), pagina: a.pagina, cita: a.linea, estado: "revisar", anticipo: "mencion",
        contradice: { documento: etiquetaDoc(contrario), pagina: c.pagina, cita: c.linea } });
    } else {
      hecho({ clave: "anticipo", titulo: a.estado === "no" ? "No hay anticipo" : a.estado === "mencion" ? "El documento tiene un apartado sobre el anticipo" : "Hay anticipo o pago anticipado",
        texto: a.estado === "no" ? "El documento dice que no se entrega anticipo: usted financia el arranque de la obra hasta el primer pago."
          : a.estado === "mencion" ? "La aplicación solo vio el título, el índice o una fórmula, no la cláusula: léala ahí antes de fijar el precio."
            : "El documento contempla anticipo o pago anticipado: confirme el porcentaje, si va a fiducia y cómo se descuenta de cada acta.",
        documento: etiquetaDoc(conAnticipo), pagina: a.pagina, cita: a.linea, estado: a.estado === "no" ? "riesgo" : "revisar", anticipo: a.estado });
    }
  }
  // requisitos con cifra: el primero por prioridad. Si la adenda MÁS RECIENTE trae otra
  // cifra, ESA es la que se juzga (dato publicado más nuevo) y se dice de dónde venía.
  const textoDe = (campo, cumple, propioLegible, sumada = null, exigida = null) => !campo ? "Es un dato del contrato, no de su empresa: úselo para el flujo de caja y el plazo."
    : sumada ? fraseExperiencia(cumple, sumada, exigida)
    : cumple === "si" ? `Su cifra (${propioLegible}) cumple lo que exige el documento.`
      : cumple === "no" ? `Su cifra (${propioLegible}) no llega a lo que exige el documento: verifíquelo en su registro de proponente y en el pliego antes de descartarse.`
        : "La aplicación no tiene esa cifra de su empresa: compárela usted con su registro de proponente.";
  const estadoDe = (campo, cumple) => (!campo ? "dato" : cumple === "si" ? "cumple" : cumple === "no" ? "no_cumple" : "revisar");
  const vistos = new Set(), cambiados = new Set(), contradichos = new Set();
  /* ¿Mipyme? Lo dice el RUP (lib/perfiles.esMipyme): true, false o null si no consta */
  const mipyme = perfilObj ? require("./perfiles.js").esMipyme(perfilObj) : null;
  /* UN CONSORCIO SE JUZGA CON LA FÓRMULA DEL PLIEGO (27-sep-2026, N21). La cifra del perfil
     plural sale de sumar los balances (el pliego tipo); si el pliego leído declara otra
     fórmula, manda la suya, y si no declara ninguna, «cumple» solo con las tres
     (lib/reparto.casillaFinancieraPlural, la regla del reparto). La experiencia no entra:
     la juzga lib/reparto.experienciaSola. */
  const rep = participacionDe(d);
  const metodoLeido = rep.metodo && rep.metodo.metodo ? rep.metodo : null;
  const { casillaFinancieraPlural } = require("./reparto.js");
  const { cumpleRequisito } = require("./diff.js");
  const pluralDe = (req, campo, exigido, tipo) => (campo && req && req.perfil !== "expSMMLV"
    ? casillaFinancieraPlural({ perfil: perfilObj, campo, sentido: req.sentido, exige: exigido, metodoLeido, cumpleRequisito, clausulas: rep.clausulas, fmt: (v) => fmtValorRequisito(Number(v), tipo) }) : null);
  for (const x of leidos) {
    const generales = x.hechos.requisitos_numericos || {}, deMipyme = x.hechos.requisitos_mipyme || {};
    for (const id of [...new Set([...Object.keys(generales), ...Object.keys(deMipyme)])]) {
      const hm = deMipyme[id] || null, hg = generales[id] || null;
      /* la tabla que le toca: la de Mipyme si el RUP dice que lo es; la de los demás si
         dice que no (una cifra SOLO de Mipyme no le aplica); sin el dato, la general, y
         todo lo que dependa del tamaño se manda a confirmar (en la guía cuesta el falso
         negativo, y una cifra de Mipyme sin saber si lo es no da «cumple»: revisión
         adversaria, 27-sep-2026) */
      const h0 = mipyme === true ? hm || hg : mipyme === false ? hg : hg || hm;
      if (!h0 || h0.valor == null) continue;
      /* la columna del rango de presupuesto de la Matriz 2, elegida con el presupuesto
         PUBLICADO (lib/diff.valorSegunRango); sin poder elegirla, la fila sigue ambigua */
      const conRango = (y) => { const r = y ? valorSegunRango(y, presupuestoSMMLV) : null; return r ? { ...y, valor: r.valor, valores: undefined, rango: r } : y; };
      const h = conRango(h0), hmR = conRango(hm), hgR = conRango(hg);
      const porRango = h.rango || null;
      const req = REQUISITOS.find((r) => r.id === id) || null;
      const campo = CAMPO_PERFIL[id] || null;
      const pl = pluralDe(req, campo, h.valor, h.tipo);
      // en un consorcio, la cifra que se enseña es la de la fórmula del pliego (o la del pliego tipo)
      const propio = pl ? pl.valor : campo && perfilObj ? perfilObj[campo] : null;
      const juicio = pl ? { estado: pl.estado } : campo ? juicioRequisito(req, propio, h.valor, contexto) : null;
      const juzgaCon = (v) => { const q = pluralDe(req, campo, v, h.tipo); return q ? q.estado : juicioRequisito(req, propio, v, contexto).estado; };
      const delPlural = pl ? { plural: { metodo_leido: pl.metodo_leido, metodos: pl.metodos, por_metodo: pl.por_metodo, valor: pl.valor, repartos_que_llegan: pl.repartos_que_llegan || null, barrido_reparto: pl.barrido_reparto || null, integrante_barrido: pl.integrante_barrido || null } } : {};
      let cumple = juicio ? juicio.estado : null;
      const propioLegible = cumple === "si" || cumple === "no" ? fmtValorRequisito(Number(propio), h.tipo) : null;
      /* lo que la experiencia suma viaja crudo (decide la acción de la casilla) */
      const exp = experienciaSumadaDe(juicio);
      const sumada = exp ? { experiencia_sumada: exp } : {};
      let texto = pl ? pl.texto : textoDe(campo, cumple, propioLegible, exp, h.valor), confirmar = false;
      const aConfirmar = (t) => { texto = t; cumple = null; confirmar = true; };
      if (h.valores && campo) aConfirmar(`El documento fija varias cifras en esa fila (${h.valores.map((v) => fmtValorRequisito(v, h.tipo)).join(" y ")}), por ejemplo por rangos de presupuesto: confirme cuál le aplica.${porLotes && h.limite_rango_smmlv ? " El proceso va por lotes: el rango lo fija el presupuesto del lote al que se presente." : ""}`);
      else if (mipyme == null && hmR && hgR && hmR.valor !== hgR.valor && campo && juzgaCon(hmR.valor) !== cumple) {
        aConfirmar(`Depende de si su empresa es Mipyme: el documento pide ${fmtValorRequisito(hmR.valor, hmR.tipo)} a las Mipyme y ${fmtValorRequisito(hgR.valor, hgR.tipo)} a las demás, y su registro no dice el tamaño de la empresa.`);
      } else if (mipyme == null && h0 === hm && campo) aConfirmar(`Es la cifra que el documento fija para las Mipyme, y su registro no dice el tamaño de su empresa: confirme si le aplica.`);
      else if (mipyme !== false && h0 === hg && hg.tabla === "demas" && cumple === "no") aConfirmar(`Es la cifra que el documento fija para los proponentes que no son Mipyme${mipyme === true ? ", y la de las Mipyme no se leyó" : ", y su registro no dice el tamaño de su empresa"}: busque en el documento la que le aplica.`);
      else if (mipyme === true && h0 === hm) texto = `${texto} Es la cifra que el documento fija para las Mipyme, y su registro dice que su empresa lo es.`;
      if (porRango && !confirmar && campo) texto = `${texto} El presupuesto es de ${porRango.presupuesto_smmlv.toLocaleString("es-CO")} salarios mínimos: rango ${porRango.rango} de la matriz (${porRango.rango === 1 ? "menos de" : "desde"} ${porRango.limite.toLocaleString("es-CO")}).`;
      /* una cifra leída con OCR se CONFIRMA: el reconocimiento de texto se equivoca más que
         un PDF nativo (27-sep-2026), así que nunca da «cumple» ni «no cumple» por sí sola */
      if (x.origen === "ocr" && campo && (cumple === "si" || cumple === "no")) {
        texto = `Leída con reconocimiento de texto de un escaneo: confirme la cifra en el documento. ${texto}`;
        cumple = null; confirmar = true;
      }
      /* para una Mipyme, la cifra de SU tabla gana a la de los demás aunque llegue de un
         documento de menor prioridad (una adenda que repite solo la de los demás se lee
         antes que la Matriz 2: revisión adversaria, 27-sep-2026) */
      const previoDemas = mipyme === true && h.tabla === "mipyme" ? hechos.findIndex((f) => f.clave === `requisito_${id}` && f.tabla === "demas") : -1;
      if (previoDemas >= 0) { hechos.splice(previoDemas, 1); vistos.delete(id); }
      if (!vistos.has(id)) {
        vistos.add(id);
        hecho({ clave: `requisito_${id}`, requisito: id, titulo: ETIQUETA_LLANA[id] || h.etiqueta, valor: h.valor, valor_legible: fmtValorRequisito(h.valor, h.tipo), tipo_valor: h.tipo,
          texto, documento: etiquetaDoc(x), pagina: h.pagina, cita: h.evidencia, estado: estadoDe(campo, cumple), ...sumada, ...delPlural, ...(confirmar ? { confirmar: true } : {}), ...(h.tabla ? { tabla: h.tabla } : {}) });
      } else if (x.tipo === "adenda" && !cambiados.has(id)) {
        const previo = hechos.find((f) => f.clave === `requisito_${id}`);
        /* una adenda que repite UNA sola tabla no pisa la cifra de la otra (revisión adversaria) */
        const otraTabla = previo && previo.tabla && h.tabla && previo.tabla !== h.tabla;
        if (previo && !otraTabla && previo.documento !== etiquetaDoc(x) && Math.abs(Number(previo.valor) - Number(h.valor)) > 1e-9) {
          cambiados.add(id);
          const antes = `${previo.valor_legible} (${previo.documento}${previo.pagina != null ? `, pág. ${previo.pagina}` : ""})`;
          if (previo.experiencia_sumada) delete previo.experiencia_sumada;
          Object.assign(previo, { valor: h.valor, valor_legible: fmtValorRequisito(h.valor, h.tipo), documento: etiquetaDoc(x), pagina: h.pagina, cita: h.evidencia, estado: estadoDe(campo, cumple), confirmar, ...sumada, ...delPlural,
            texto: `${texto} Una adenda lo cambió: antes era ${antes}; vale la adenda.`, cambiado_por_adenda: true, valor_anterior_legible: previo.valor_legible });
        }
      } else if (x.tipo !== "adenda" && !contradichos.has(id) && !cambiados.has(id) && !h.valores) {
        /* DOS DOCUMENTOS QUE NO COINCIDEN (27-sep-2026): la Matriz 2 pide 0,70 de endeudamiento
           y el estudio previo 0,65 (CO1.REQ.11012120). Vale la cifra del documento de más
           prioridad, pero se dice la otra; y si con la otra el juicio cambia, se manda a
           confirmar en vez de decidir. Una tabla distinta (Mipyme / los demás) no es contradicción */
        const previo = hechos.find((f) => f.clave === `requisito_${id}`);
        const otraTabla = previo && previo.tabla && h.tabla && previo.tabla !== h.tabla;
        const fuentePrevia = previo ? leidos.find((y) => etiquetaDoc(y) === previo.documento) : null;
        if (previo && !otraTabla && puedeContradecir(fuentePrevia, x) && Math.abs(Number(previo.valor) - Number(h.valor)) > 1e-9) {
          contradichos.add(id);
          const donde = `${etiquetaDoc(x)}${h.pagina != null ? `, pág. ${h.pagina}` : ""}`;
          const otroJuicio = campo ? juicioRequisito(req, propio, h.valor, contexto).estado : null;
          const previoJuicio = previo.estado === "cumple" ? "si" : previo.estado === "no_cumple" ? "no" : null;
          previo.contradice = { documento: etiquetaDoc(x), pagina: h.pagina, valor: h.valor, valor_legible: fmtValorRequisito(h.valor, h.tipo), cita: h.evidencia };
          previo.texto = `${previo.texto} Otro documento dice otra cifra: ${fmtValorRequisito(h.valor, h.tipo)} (${donde}). Confirme en el pliego definitivo cuál vale.`;
          if (previoJuicio && otroJuicio !== previoJuicio) { previo.estado = "revisar"; previo.confirmar = true; }
        }
      }
    }
  }
  experienciaDeTabla(leidos, { hechos, hecho, perfilObj, presupuestoSMMLV, contexto });
  condicionDeExperiencia(leidos, { hecho });
  presupuestoDelPliego(leidos, { presupuestoCOP, hechos, fmtValorRequisito });
  const capitalTrabajo = capitalDeDocumentos(leidos, { hechos, hecho, perfilObj, presupuestoCOP, plazoMeses, anticipoPctObjeto, conAnticipo, fmtValorRequisito, metodoLeido, clausulas: rep.clausulas });
  // detecciones: causales, visita, personal, equipos, garantías, multas, licencias…
  for (const tipo of ORDEN_DETECCIONES) {
    const det = DETECTORES.find((k) => k.tipo === tipo); if (!det) continue;
    const x = leidos.find((y) => (y.hechos.detecciones || {})[tipo] && y.hechos.detecciones[tipo].length);
    if (!x) continue;
    const l = x.hechos.detecciones[tipo][0];
    hecho({ clave: tipo, titulo: det.texto.replace(/\.$/, "").replace(/^El pliego /, "El documento "), texto: det.pendiente, documento: etiquetaDoc(x), pagina: l.pagina, cita: l.linea, estado: DETECCIONES_RIESGO.has(tipo) ? "riesgo" : "revisar" });
  }
  // descuentos en cada pago
  const conDed = leidos.find((x) => Array.isArray(x.hechos.deducciones) && x.hechos.deducciones.length);
  if (conDed) hecho({ clave: "deducciones", titulo: "Descuentos que le aplican en cada pago", texto: conDed.hechos.deducciones.map((c) => `${c.etiqueta}${c.pct != null ? ` (${Number(c.pct).toLocaleString("es-CO", { maximumFractionDigits: 2 })} %)` : ""}`).join(" · "), documento: etiquetaDoc(conDed), estado: "dato", deducciones: conDed.hechos.deducciones });
  // el reparto de un consorcio: cada cláusula de participación mínima, y la fórmula del plural (`rep`, arriba)
  const { fraseClausula } = require("./participacion.js");
  for (const c of rep.clausulas) {
    hecho({ clave: "participacion_minima", titulo: "Si va en consorcio: participación mínima", texto: fraseClausula(c), documento: c.documento, pagina: c.pagina, cita: c.cita, estado: "revisar", clausula: c });
  }
  /* los códigos de la experiencia: una frase por lectura, con su cita; la MISMA
     lista en el borrador y en los estudios previos se dice una vez (la del
     documento que manda), medido en producción el 26-sep-2026 (CO1.REQ.11039338) */
  const listasVistas = new Set();
  for (const l of (rep.codigos && rep.codigos.lecturas) || []) {
    const claveLista = `${l.regla}|${l.n}|${[...(l.codigos || [])].sort().join(",")}`;
    if (listasVistas.has(claveLista)) continue;
    listasVistas.add(claveLista);
    const { fraseCodigos } = require("./codigos_experiencia.js");
    /* un código que ninguna de las empresas tiene suele ser basura del texto (el
       «Código Postal» del membrete, un número de página pegado): se dice */
    let raros = [];
    try { raros = require("./reparto.js").clasesSospechosas({ codigos: l.codigos || [], lecturas: [l] }); } catch { raros = []; }
    const ojo = raros.length ? ` Ojo: ${raros.join(", ")} no ${raros.length > 1 ? "parecen bien leídos" : "parece bien leído"}: compárelo con la cita.` : "";
    hecho({ clave: "codigos_experiencia", titulo: "Códigos que deben tener los contratos de experiencia", texto: `${fraseCodigos(l)}${ojo}`, documento: l.documento, pagina: l.pagina, cita: l.cita, estado: "revisar", lectura: l });
  }
  if (rep.metodo && rep.metodo.metodo) {
    const { METODOS_INDICADORES } = require("./perfiles.js");
    hecho({ clave: "metodo_plural", titulo: "Si va en consorcio: cómo se calculan los indicadores", texto: METODOS_INDICADORES[rep.metodo.metodo] || null, documento: rep.metodo.documento, pagina: rep.metodo.pagina, cita: rep.metodo.cita, estado: "dato", metodo: rep.metodo.metodo });
  }
  // fechas leídas
  const conHitos = leidos.find((x) => Array.isArray(x.hechos.hitos) && x.hechos.hitos.length);
  if (conHitos) hecho({ clave: "fechas", titulo: "Fechas que fija el documento", texto: conHitos.hechos.hitos.slice(0, 6).map((h) => `${String(h.etiqueta).split(":")[0]}: ${h.fecha}`).join(" · "), documento: etiquetaDoc(conHitos), pagina: conHitos.hechos.hitos[0].pagina, cita: conHitos.hechos.hitos[0].evidencia, estado: "dato", hitos: conHitos.hechos.hitos.slice(0, 6) });
  /* las citas literales por tema: el primer documento (por prioridad: el pliego antes que
     el estudio previo) que las trae; la adenda más reciente NO sustituye la cita del pliego
     (habla de cambios puntuales), pero si el pliego no la trae y la adenda sí, vale la adenda */
  const citas = TEMAS_CITA.map((tema) => {
    const x = leidos.find((y) => y.hechos.citas && y.hechos.citas[tema.clave]);
    const c = x ? x.hechos.citas[tema.clave] : null;
    return { clave: tema.clave, titulo: tema.titulo, texto: c ? c.texto : null, pagina: c ? c.pagina : null, documento: x ? etiquetaDoc(x) : null, id_documento: x ? x.id_documento : null };
  });
  const garantiaSeriedad = garantiaDeDocumentos(leidos);
  return { por_lotes: porLotes, hechos, citas, capital_trabajo: capitalTrabajo, garantia_seriedad: garantiaSeriedad, tope_oferta: topeOferta(leidos, presupuestoCOP), documentos: leidos.map((x) => ({ id_documento: x.id_documento, nombre: x.nombre, tipo: x.tipo, tipo_legible: x.tipo_legible || (TIPOS[x.tipo] || TIPOS.otro).legible, paginas: x.paginas, paginas_total: x.paginas_total != null ? x.paginas_total : null, paginas_sin_texto: Number.isInteger(x.paginas_sin_texto) && x.paginas_sin_texto > 0 ? x.paginas_sin_texto : 0,
  a_medias: escaneoAMedias(x), relectura_fallida: x.relectura_fallida ? String(x.relectura_fallida.motivo || "no se pudo volver a leer").slice(0, 200) : null, recortado: x.recortado === true, origen: x.origen === "ocr" ? "ocr" : "texto", leido_el: x.leido_el || null })) };
}

module.exports = { escaneoAMedias, formularioDeExcel, formularioVigente, esBorradorDoc, nombrePlegado, esVersionDelPliego, candidatosAlTextoDelPliego, definitivoMasNuevoSinLeer, topeOferta, participacionDe, MAX_TEXTO_DOC, releerPorCorte, reintentoTrasSaturacion, reintentable, ESPERA_SATURADO_MIN, ESPERA_SATURADO_MAX_MIN, VERSION, hechosVersion, TIPOS, TEMAS_CITA, MAX_DOCS_PLAN, MAX_PLIEGOS_PLAN, MAX_BYTES_DOC, claveDocs, claveDoc, claveF1, clasificarArchivo, deduplicar, planDeLectura, hechosDeTexto, citasDeTexto, resumenLectura, loQueDicen, contarPaginas };
