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
   · Un archivo que no es PDF (hoja de cálculo, Word, comprimido) NO se lee: se
     lista como «no legible» con su motivo y se manda a SECOP II. Prometer que se
     leyó una hoja de cálculo que no se abrió sería una cifra inventada.
   · «Sin dato» ≠ «cero»: un anticipo que el texto NIEGA es `estado:"no"` con su
     cita; uno que no aparece es `sin_dato`. Y los hechos llevan siempre el
     documento y la página de donde salieron: sin cita no hay hecho.
   · Lo que el índice no trae (procesos anteriores a 2025, SECOP I, tienda
     virtual) es un RESULTADO con motivo, no un error: el usuario sigue pudiendo
     cargar el pliego a mano y todo lo demás funciona igual. */
"use strict";

const VERSION = 1;
const MAX_ARCHIVOS_INDICE = 150;
const MAX_DOCS_PLAN = 12;
const MAX_PLIEGOS_PLAN = 3;
/* 3 MB, no los 12 del proxy: el PDF vuelve al navegador en base64 (×1,37) dentro de
   una respuesta de Vercel que se corta en 4,5 MB (MEMORIA: «Límites Vercel/Upstash»).
   Un documento mayor se lista con su motivo y su enlace: no se promete leerlo. */
const MAX_BYTES_DOC = 3 * 1024 * 1024;
const MAX_HITOS = 12;
const MAX_DEDUCCIONES = 12;
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
  resolucion: { legible: "Resolución o acto administrativo", orden: 10 },
  analisis_sector: { legible: "Análisis del sector o estudio de mercado", orden: 11 },
  informe_evaluacion: { legible: "Informe de evaluación", orden: 12 },
  pliego_borrador: { legible: "Proyecto de pliego (borrador)", orden: 13 },
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
  ["presupuesto", /presupuesto|cantidades de obra|formulario\s*(?:1|uno|no\.?\s*1)\b|oferta economica/],
  ["anexo_tecnico", /anexo.*tecnic|especificacion|\bapu\b|analisis de precios/],
  ["cronograma", /cronograma/],
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
  docx: { motivo: "documento de Word" }, doc: { motivo: "documento de Word" }, odt: { motivo: "documento de Word" },
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
    else if (a.bytes != null && a.bytes > MAX_BYTES_DOC) motivo = `pesa más de ${MAX_BYTES_DOC / 1024 / 1024} MB: la aplicación no puede traerlo; ábralo en SECOP II`;
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
  for (const [id, h] of Object.entries(extraerHabilitantes(t) || {})) numericos[id] = { id, etiqueta: h.etiqueta, valor: h.valor, tipo: h.tipo, evidencia: h.evidencia, pagina: h.pagina == null ? null : h.pagina };
  let hitos = [], deducciones = [];
  try { hitos = (extraerHitos(t).hitos || []).slice(0, MAX_HITOS); } catch { hitos = []; }
  try { deducciones = (leerDeducciones(t).conceptos || []).slice(0, MAX_DEDUCCIONES).map((c) => ({ id: c.id, etiqueta: c.etiqueta, pct: c.pct, naturaleza: c.naturaleza, base: c.base })); } catch { deducciones = []; }
  const ant = (detecciones.anticipo_o_pago_anticipado || [])[0] || null;
  const anticipo = !ant ? { estado: "sin_dato", linea: null, pagina: null }
    : SIN_ANTICIPO_RE.test(plegar(ant.linea)) ? { estado: "no", linea: ant.linea, pagina: ant.pagina }
      : { estado: "si", linea: ant.linea, pagina: ant.pagina };
  return { version: hechosVersion(), tipo, paginas: contarPaginas(t), caracteres: t.length, detecciones, requisitos_numericos: numericos, hitos, deducciones, anticipo };
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
  const pendientes = plan.filter((id) => !leidos[id] && !ilegibles[id]).map((id) => archivos.find((a) => a.id_documento === id)).filter(Boolean);
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
const PRIORIDAD_FUENTE = ["pliego", "adenda", "pliego_borrador", "estudio_previo", "anexo_tecnico", "presupuesto", "cronograma", "respuesta_observaciones", "aviso", "resolucion", "matriz_riesgos", "analisis_sector", "informe_evaluacion", "formato", "otro"];
const CAMPO_PERFIL = Object.freeze({ capital_trabajo: "capitalTrabajo", patrimonio: "patrimonio", liquidez: "liquidez", endeudamiento: "endeudamiento", cobertura: "coberturaIntereses", experiencia_smmlv: "expSMMLV" });
const ETIQUETA_LLANA = Object.freeze({ capital_trabajo: "Capital de trabajo exigido", patrimonio: "Patrimonio exigido", liquidez: "Liquidez mínima exigida", endeudamiento: "Endeudamiento máximo permitido", cobertura: "Cobertura de intereses mínima exigida", experiencia_smmlv: "Experiencia exigida (en salarios mínimos)", plazo_meses: "Plazo de ejecución que fija el documento" });
const ORDEN_DETECCIONES = ["causal_de_rechazo", "visita_obligatoria", "personal", "equipos_o_laboratorio", "certificaciones", "garantias", "forma_de_pago", "multas", "item_sin_valor", "licencia_o_permiso", "marca_sin_equivalente", "subcontratista_o_proveedor_impuesto"];
const DETECCIONES_RIESGO = new Set(["multas", "item_sin_valor", "marca_sin_equivalente", "subcontratista_o_proveedor_impuesto", "licencia_o_permiso"]);
const etiquetaDoc = (x) => `${x.tipo_legible || (TIPOS[x.tipo] || TIPOS.otro).legible}${x.nombre ? ` (${x.nombre})` : ""}`;

/** Los hechos de todos los documentos leídos, cada uno con su documento y su página.
    `perfilObj` (opcional) permite decir «cumple» / «no cumple» con la regla de lib/diff. */
function loQueDicen(docs, { perfilObj = null } = {}) {
  const d = docs || {};
  const leidos = Object.entries(d.leidos || {}).map(([id, x]) => ({ id_documento: id, ...x })).filter((x) => x && x.hechos);
  if (!leidos.length) return { hechos: [], documentos: [] };
  /* dentro de un mismo tipo, el más RECIENTE primero (por fecha de carga en SECOP II;
     si no la hay, por cuándo se leyó): la última adenda es la que vale */
  leidos.sort((a, b) => PRIORIDAD_FUENTE.indexOf(a.tipo) - PRIORIDAD_FUENTE.indexOf(b.tipo) || String(b.fecha_carga || b.leido_el || "").localeCompare(String(a.fecha_carga || a.leido_el || "")));
  const { REQUISITOS, cumpleRequisito, fmtValorRequisito } = require("./diff.js");
  const { DETECTORES } = require("./dictamen_reglas.js");
  const hechos = [];
  const hecho = (h) => hechos.push({ estado: null, cita: null, pagina: null, ...h });

  // anticipo: el primer documento (por prioridad) que lo afirma o lo niega
  const conAnticipo = leidos.find((x) => x.hechos.anticipo && x.hechos.anticipo.estado !== "sin_dato");
  if (conAnticipo) {
    const a = conAnticipo.hechos.anticipo;
    hecho({ clave: "anticipo", titulo: a.estado === "no" ? "No hay anticipo" : "Hay anticipo o pago anticipado",
      texto: a.estado === "no" ? "El documento dice que no se entrega anticipo: usted financia el arranque de la obra hasta el primer pago." : "El documento contempla anticipo o pago anticipado: confirme el porcentaje, si va a fiducia y cómo se descuenta de cada acta.",
      documento: etiquetaDoc(conAnticipo), pagina: a.pagina, cita: a.linea, estado: a.estado === "no" ? "riesgo" : "revisar", anticipo: a.estado });
  }
  // requisitos con cifra: el primero por prioridad. Si la adenda MÁS RECIENTE trae otra
  // cifra, ESA es la que se juzga (dato publicado más nuevo) y se dice de dónde venía.
  const textoDe = (campo, cumple, propioLegible) => !campo ? "Es un dato del contrato, no de su empresa: úselo para el flujo de caja y el plazo."
    : cumple === "si" ? `Su cifra (${propioLegible}) cumple lo que exige el documento.`
      : cumple === "no" ? `Su cifra (${propioLegible}) no llega a lo que exige el documento: verifíquelo en su registro de proponente y en el pliego antes de descartarse.`
        : "La aplicación no tiene esa cifra de su empresa: compárela usted con su registro de proponente.";
  const estadoDe = (campo, cumple) => (!campo ? "dato" : cumple === "si" ? "cumple" : cumple === "no" ? "no_cumple" : "revisar");
  const vistos = new Set(), cambiados = new Set();
  for (const x of leidos) {
    for (const [id, h] of Object.entries(x.hechos.requisitos_numericos || {})) {
      if (h.valor == null) continue;
      const req = REQUISITOS.find((r) => r.id === id) || null;
      const campo = CAMPO_PERFIL[id] || null;
      const propio = campo && perfilObj ? perfilObj[campo] : null;
      const cumple = campo ? cumpleRequisito(req, propio, h.valor) : null;
      const propioLegible = cumple === "si" || cumple === "no" ? fmtValorRequisito(Number(propio), h.tipo) : null;
      if (!vistos.has(id)) {
        vistos.add(id);
        hecho({ clave: `requisito_${id}`, requisito: id, titulo: ETIQUETA_LLANA[id] || h.etiqueta, valor: h.valor, valor_legible: fmtValorRequisito(h.valor, h.tipo), tipo_valor: h.tipo,
          texto: textoDe(campo, cumple, propioLegible), documento: etiquetaDoc(x), pagina: h.pagina, cita: h.evidencia, estado: estadoDe(campo, cumple) });
      } else if (x.tipo === "adenda" && !cambiados.has(id)) {
        const previo = hechos.find((f) => f.clave === `requisito_${id}`);
        if (previo && previo.documento !== etiquetaDoc(x) && Math.abs(Number(previo.valor) - Number(h.valor)) > 1e-9) {
          cambiados.add(id);
          const antes = `${previo.valor_legible} (${previo.documento}${previo.pagina != null ? `, pág. ${previo.pagina}` : ""})`;
          Object.assign(previo, { valor: h.valor, valor_legible: fmtValorRequisito(h.valor, h.tipo), documento: etiquetaDoc(x), pagina: h.pagina, cita: h.evidencia, estado: estadoDe(campo, cumple),
            texto: `${textoDe(campo, cumple, propioLegible)} Una adenda lo cambió: antes era ${antes}; vale la adenda.`, cambiado_por_adenda: true, valor_anterior_legible: previo.valor_legible });
        }
      }
    }
  }
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
  // fechas leídas
  const conHitos = leidos.find((x) => Array.isArray(x.hechos.hitos) && x.hechos.hitos.length);
  if (conHitos) hecho({ clave: "fechas", titulo: "Fechas que fija el documento", texto: conHitos.hechos.hitos.slice(0, 6).map((h) => `${String(h.etiqueta).split(":")[0]}: ${h.fecha}`).join(" · "), documento: etiquetaDoc(conHitos), pagina: conHitos.hechos.hitos[0].pagina, cita: conHitos.hechos.hitos[0].evidencia, estado: "dato", hitos: conHitos.hechos.hitos.slice(0, 6) });
  return { hechos, documentos: leidos.map((x) => ({ id_documento: x.id_documento, nombre: x.nombre, tipo: x.tipo, tipo_legible: x.tipo_legible || (TIPOS[x.tipo] || TIPOS.otro).legible, paginas: x.paginas, leido_el: x.leido_el || null })) };
}

module.exports = { VERSION, hechosVersion, TIPOS, MAX_DOCS_PLAN, MAX_PLIEGOS_PLAN, MAX_BYTES_DOC, claveDocs, claveDoc, clasificarArchivo, deduplicar, planDeLectura, hechosDeTexto, resumenLectura, loQueDicen, contarPaginas };
