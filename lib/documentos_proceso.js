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

const VERSION = 11;                        // 11: la tabla de experiencia del pliego tipo, con su página (lib/tabla_experiencia, 27-sep-2026) · 10: la fórmula del capital de trabajo exigido (lib/capital_trabajo) junto al rango de la Matriz 2 (27-sep-2026) · 9: el rango de presupuesto de la Matriz 2 y los lotes (27-sep-2026) · 8: la tabla de indicadores de Mipyme aparte, «Liquidez ≥ 3,00» en tabla y la Matriz 2 al plan (27-sep-2026) · 7: el plan mete los PDF de hasta 20 MB (por trozos) y los .docx (27-sep-2026) · 6: «cada uno con el siguiente código» y «la totalidad de la siguiente codificación» (27-sep-2026) · 5: los códigos con que se pide la experiencia (26-sep-2026) · 4: cláusula de participación mínima y fórmula del plural (26-sep-2026) · 3: citas literales por tema (4-sep-2026, noche) · 2: experiencia general y específica como hechos propios

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
  const { SIN_ANTICIPO_RE } = require("./dictamen_reglas.js");
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
      if (tema.clave === "anticipo" && SIN_ANTICIPO_RE.test(l)) p += 2;
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

/** Clasifica UN archivo del índice: tipo, legibilidad, si es de la entidad. `cierre` = "AAAA-MM-DD" o null. */
function clasificarArchivo(a, { cierre = null } = {}) {
  const nombre = String((a && (a.nombre_archivo || a.nombre)) || "").trim();
  const n = plegar(sinExtension(nombre));
  const ext = plegar(a && a.extensi_n ? a.extensi_n : (nombre.match(/\.([A-Za-z0-9]{1,5})$/) || [])[1] || "").replace(/^\./, "");
  let tipo = "otro";
  for (const [t, re] of RE_TIPO) { if (re.test(n)) { tipo = t; break; } }
  if (tipo === "pliego" && RE_BORRADOR.test(n)) tipo = "pliego_borrador";
  const e = EXTENSIONES[ext] || null;
  const legible = !!(e && e.legible);
  const motivoIlegible = legible ? null : e ? e.motivo : ext ? `formato no legible (.${ext})` : "sin extensión";
  const fecha = dia(a && a.fecha_carga);
  /* de la entidad salvo que el nombre sea de una oferta, o que sea un documento
     sin tipo subido DESPUÉS del cierre (las ofertas se abren al cerrar) */
  const porNombre = RE_PROPONENTE.test(n) && !/formato|formulario/.test(n);
  const porFecha = (tipo === "otro" || tipo === "formato") && !!cierre && !!fecha && fecha > cierre;
  const bytes = num(a && (a.tamanno_archivo != null ? a.tamanno_archivo : a.bytes));
  const url = a && a.url_descarga_documento && typeof a.url_descarga_documento === "object" ? String(a.url_descarga_documento.url || "") : String((a && (a.url_descarga_documento || a.url)) || "");
  return {
    id_documento: String((a && a.id_documento) || "").trim() || null,
    nombre: nombre.slice(0, 160) || null, extension: ext || null, bytes, fecha_carga: fecha,
    url: /^https:\/\/community\.secop\.gov\.co\//.test(url) ? url : null,
    tipo, tipo_legible: TIPOS[tipo].legible, orden: TIPOS[tipo].orden,
    legible, motivo_ilegible: motivoIlegible,
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
    .sort((a, b) => a.orden - b.orden || String(a.fecha_carga || "").localeCompare(String(b.fecha_carga || "")) || String(a.id_documento).localeCompare(String(b.id_documento)))
    .slice(0, MAX_ARCHIVOS_INDICE);
  const plan = [];
  let pliegos = 0;
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
    else if ((a.tipo === "pliego" || a.tipo === "pliego_borrador") && pliegos >= MAX_PLIEGOS_PLAN) motivo = "ya se leen las últimas versiones del pliego";
    else if (plan.length >= MAX_DOCS_PLAN) motivo = "tope de documentos leídos solos";
    a.en_plan = !motivo; a.motivo_omision = motivo;
    if (!motivo) { plan.push(a.id_documento); if (a.tipo === "pliego" || a.tipo === "pliego_borrador") pliegos++; }
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
function hechosDeTexto(texto, { tipo = "otro" } = {}) {
  const t = String(texto || "");
  const { detectar, SIN_ANTICIPO_RE } = require("./dictamen_reglas.js");
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
  /* «mencion»: solo el índice, un título o una fórmula (peso ≤ 1): el pliego TIENE un
     apartado de anticipo, pero no se leyó qué dice — no es «sí» */
  const anticipo = !ant ? { estado: "sin_dato", linea: null, pagina: null }
    : SIN_ANTICIPO_RE.test(plegar(ant.linea)) ? { estado: "no", linea: ant.linea, pagina: ant.pagina }
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
  /* la TABLA de experiencia del pliego tipo (lib/tabla_experiencia, 27-sep-2026):
     null si no la trae o si el lector falló; nunca se completa con la del pliego tipo */
  let tablaExperiencia = null;
  try { tablaExperiencia = require("./tabla_experiencia.js").leerTablaExperiencia(t); } catch { tablaExperiencia = null; }
  return { version: hechosVersion(), tipo, paginas: contarPaginas(t), caracteres: t.length, detecciones, requisitos_numericos: numericos, requisitos_mipyme: numericosMipyme, lotes: require("./diff.js").lotesDe(t), hitos, deducciones, anticipo, citas: citasDeTexto(t), participacion, metodo_plural: metodoPlural, codigos_experiencia: codigosExperiencia, capital_trabajo: capitalTrabajo, tabla_experiencia: tablaExperiencia };
}

/* ── el estado de la lectura de un proceso ────────────────────────────────── */
/** `docs` = lo guardado bajo claveDocs: {indice, leidos, ilegibles} o null. */
function resumenLectura(docs) {
  const d = docs || {};
  const indice = d.indice || null;
  const leidos = d.leidos || {}, ilegibles = d.ilegibles || {};
  if (!indice) return { estado: "sin_indice", publicados: null, en_plan: null, leidos: 0, ilegibles: 0, por_actualizar: 0, pendientes: [], consultado_el: null, motivo: null };
  const archivos = Array.isArray(indice.archivos) ? indice.archivos : [];
  const plan = Array.isArray(indice.plan) ? indice.plan : [];
  const pendientes = plan.filter((id) => (!leidos[id] || releerPorCorte(leidos[id])) && !ilegibles[id]).map((id) => archivos.find((a) => a.id_documento === id)).filter(Boolean);
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
const PRIORIDAD_FUENTE = ["pliego", "adenda", "pliego_borrador", "matriz_indicadores", "estudio_previo", "anexo_tecnico", "presupuesto", "cronograma", "respuesta_observaciones", "aviso", "resolucion", "matriz_riesgos", "analisis_sector", "informe_evaluacion", "formato", "otro"];
const CAMPO_PERFIL = Object.freeze({ capital_trabajo: "capitalTrabajo", patrimonio: "patrimonio", liquidez: "liquidez", endeudamiento: "endeudamiento", cobertura: "coberturaIntereses", experiencia_smmlv: "expSMMLV", experiencia_general: "expSMMLV", experiencia_especifica: "expSMMLV" });
const ETIQUETA_LLANA = Object.freeze({ capital_trabajo: "Capital de trabajo exigido", patrimonio: "Patrimonio exigido", liquidez: "Liquidez mínima exigida", endeudamiento: "Endeudamiento máximo permitido", cobertura: "Cobertura de intereses mínima exigida", experiencia_smmlv: "Experiencia exigida (en salarios mínimos)", experiencia_general: "Experiencia general exigida (en salarios mínimos)", experiencia_especifica: "Experiencia específica exigida (en salarios mínimos)", plazo_meses: "Plazo de ejecución que fija el documento" });
const ORDEN_DETECCIONES = ["causal_de_rechazo", "visita_obligatoria", "personal", "equipos_o_laboratorio", "certificaciones", "garantias", "forma_de_pago", "multas", "item_sin_valor", "licencia_o_permiso", "marca_sin_equivalente", "subcontratista_o_proveedor_impuesto"];
const DETECCIONES_RIESGO = new Set(["multas", "item_sin_valor", "marca_sin_equivalente", "subcontratista_o_proveedor_impuesto", "licencia_o_permiso"]);
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
function capitalDeDocumentos(leidos, { hechos, hecho, perfilObj, presupuestoCOP, plazoMeses, anticipoPctObjeto, conAnticipo, fmtValorRequisito }) {
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
  const juicio = r.exacto ? juicioRequisito(req, propio, r.valor).estado : r.juicio;
  // una fórmula leída con reconocimiento de texto se confirma, como cualquier cifra de un escaneo
  const ocr = fuente.origen === "ocr" && (juicio === "si" || juicio === "no");
  const estado = ocr ? "revisar" : juicio === "si" ? "cumple" : juicio === "no" ? "no_cumple" : "revisar";
  hecho({ clave: "requisito_capital_trabajo", requisito: "capital_trabajo", titulo: ETIQUETA_LLANA.capital_trabajo, valor: r.valor, valor_legible: fmtValorRequisito(r.valor, "dinero"), tipo_valor: "dinero",
    texto: ocr ? `Leída con reconocimiento de texto de un escaneo: confirme la fórmula en el documento. ${r.texto}` : r.texto,
    documento, pagina: r.pagina, cita: r.cita, estado, calculado_con_formula: r.formula_legible, ...(estado === "revisar" && juicio !== "sin_dato" ? { confirmar: true } : {}) });
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

/** Los hechos de todos los documentos leídos, cada uno con su documento y su página.
    `perfilObj` (opcional) permite decir «cumple» / «no cumple» con la regla de lib/diff. */
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

  // anticipo: el primer documento (por prioridad) que lo afirma o lo niega
  const conAnticipo = leidos.find((x) => x.hechos.anticipo && x.hechos.anticipo.estado !== "sin_dato");
  if (conAnticipo) {
    const a = conAnticipo.hechos.anticipo;
    hecho({ clave: "anticipo", titulo: a.estado === "no" ? "No hay anticipo" : a.estado === "mencion" ? "El documento tiene un apartado sobre el anticipo" : "Hay anticipo o pago anticipado",
      texto: a.estado === "no" ? "El documento dice que no se entrega anticipo: usted financia el arranque de la obra hasta el primer pago."
        : a.estado === "mencion" ? "La aplicación solo vio el título, el índice o una fórmula, no la cláusula: léala ahí antes de fijar el precio."
          : "El documento contempla anticipo o pago anticipado: confirme el porcentaje, si va a fiducia y cómo se descuenta de cada acta.",
      documento: etiquetaDoc(conAnticipo), pagina: a.pagina, cita: a.linea, estado: a.estado === "no" ? "riesgo" : "revisar", anticipo: a.estado });
  }
  // requisitos con cifra: el primero por prioridad. Si la adenda MÁS RECIENTE trae otra
  // cifra, ESA es la que se juzga (dato publicado más nuevo) y se dice de dónde venía.
  const textoDe = (campo, cumple, propioLegible, sumada = null, exigida = null) => !campo ? "Es un dato del contrato, no de su empresa: úselo para el flujo de caja y el plazo."
    : sumada ? fraseExperiencia(cumple, sumada, exigida)
    : cumple === "si" ? `Su cifra (${propioLegible}) cumple lo que exige el documento.`
      : cumple === "no" ? `Su cifra (${propioLegible}) no llega a lo que exige el documento: verifíquelo en su registro de proponente y en el pliego antes de descartarse.`
        : "La aplicación no tiene esa cifra de su empresa: compárela usted con su registro de proponente.";
  const estadoDe = (campo, cumple) => (!campo ? "dato" : cumple === "si" ? "cumple" : cumple === "no" ? "no_cumple" : "revisar");
  const vistos = new Set(), cambiados = new Set();
  /* ¿Mipyme? Lo dice el RUP (lib/perfiles.esMipyme): true, false o null si no consta */
  const mipyme = perfilObj ? require("./perfiles.js").esMipyme(perfilObj) : null;
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
      const propio = campo && perfilObj ? perfilObj[campo] : null;
      const juicio = campo ? juicioRequisito(req, propio, h.valor, contexto) : null;
      let cumple = juicio ? juicio.estado : null;
      const propioLegible = cumple === "si" || cumple === "no" ? fmtValorRequisito(Number(propio), h.tipo) : null;
      /* lo que la experiencia suma viaja crudo (decide la acción de la casilla) */
      const exp = experienciaSumadaDe(juicio);
      const sumada = exp ? { experiencia_sumada: exp } : {};
      let texto = textoDe(campo, cumple, propioLegible, exp, h.valor), confirmar = false;
      const aConfirmar = (t) => { texto = t; cumple = null; confirmar = true; };
      if (h.valores && campo) aConfirmar(`El documento fija varias cifras en esa fila (${h.valores.map((v) => fmtValorRequisito(v, h.tipo)).join(" y ")}), por ejemplo por rangos de presupuesto: confirme cuál le aplica.${porLotes && h.limite_rango_smmlv ? " El proceso va por lotes: el rango lo fija el presupuesto del lote al que se presente." : ""}`);
      else if (mipyme == null && hmR && hgR && hmR.valor !== hgR.valor && campo && juicioRequisito(req, propio, hmR.valor, contexto).estado !== cumple) {
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
          texto, documento: etiquetaDoc(x), pagina: h.pagina, cita: h.evidencia, estado: estadoDe(campo, cumple), ...sumada, ...(confirmar ? { confirmar: true } : {}), ...(h.tabla ? { tabla: h.tabla } : {}) });
      } else if (x.tipo === "adenda" && !cambiados.has(id)) {
        const previo = hechos.find((f) => f.clave === `requisito_${id}`);
        /* una adenda que repite UNA sola tabla no pisa la cifra de la otra (revisión adversaria) */
        const otraTabla = previo && previo.tabla && h.tabla && previo.tabla !== h.tabla;
        if (previo && !otraTabla && previo.documento !== etiquetaDoc(x) && Math.abs(Number(previo.valor) - Number(h.valor)) > 1e-9) {
          cambiados.add(id);
          const antes = `${previo.valor_legible} (${previo.documento}${previo.pagina != null ? `, pág. ${previo.pagina}` : ""})`;
          if (previo.experiencia_sumada) delete previo.experiencia_sumada;
          Object.assign(previo, { valor: h.valor, valor_legible: fmtValorRequisito(h.valor, h.tipo), documento: etiquetaDoc(x), pagina: h.pagina, cita: h.evidencia, estado: estadoDe(campo, cumple), confirmar, ...sumada,
            texto: `${texto} Una adenda lo cambió: antes era ${antes}; vale la adenda.`, cambiado_por_adenda: true, valor_anterior_legible: previo.valor_legible });
        }
      }
    }
  }
  experienciaDeTabla(leidos, { hechos, hecho, perfilObj, presupuestoSMMLV, contexto });
  const capitalTrabajo = capitalDeDocumentos(leidos, { hechos, hecho, perfilObj, presupuestoCOP, plazoMeses, anticipoPctObjeto, conAnticipo, fmtValorRequisito });
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
  // el reparto de un consorcio: cada cláusula de participación mínima, y la fórmula del plural
  const rep = participacionDe(d);
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
  return { por_lotes: porLotes, hechos, citas, capital_trabajo: capitalTrabajo, documentos: leidos.map((x) => ({ id_documento: x.id_documento, nombre: x.nombre, tipo: x.tipo, tipo_legible: x.tipo_legible || (TIPOS[x.tipo] || TIPOS.otro).legible, paginas: x.paginas, paginas_total: x.paginas_total != null ? x.paginas_total : null, recortado: x.recortado === true, origen: x.origen === "ocr" ? "ocr" : "texto", leido_el: x.leido_el || null })) };
}

module.exports = { participacionDe, MAX_TEXTO_DOC, releerPorCorte, VERSION, hechosVersion, TIPOS, TEMAS_CITA, MAX_DOCS_PLAN, MAX_PLIEGOS_PLAN, MAX_BYTES_DOC, claveDocs, claveDoc, clasificarArchivo, deduplicar, planDeLectura, hechosDeTexto, citasDeTexto, resumenLectura, loQueDicen, contarPaginas };
