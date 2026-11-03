/* lib/entregables.js · LO QUE EL PLIEGO PIDE ENTREGAR CON LA OFERTA, CON SU PÁGINA (3-nov-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Encargo del dueño: por proceso, la lista de lo que exige el pliego para presentar
   la oferta (formatos, anexos, certificados, garantía, requisitos habilitantes),
   cada fila con cita y página. «Aquí lo caro es que falte un requisito»: ante la
   duda la fila SALE, marcada «por confirmar», en vez de quedarse fuera.

   No es un segundo lector: lo llama `lib/documentos_proceso.hechosDeTexto` con el
   mismo texto (líneas de pdf.js con sus marcadores `\f<n>`, lib/paginas) y su
   resultado viaja en los hechos de cada documento (`hechos.entregables`).

   LO MEDIDO ANTES DE ESCRIBIR ESTO (Fase 0, 3-nov-2026, 14 pliegos reales de A–E y
   de la ronda 7 de detekta-lector, con una verdad leída a ciegas por lectores que
   no vieron este código): el lector de hoy no sacaba NI UN formato ni un anexo. Y
   la lista de formatos del pliego tipo NO es fija: el «Formato 8» es «Factores de
   desempate» en el de menor cuantía de transporte (v3) y «Vinculación de personas
   con discapacidad» en el de licitación de infraestructura social (v2); el
   «Formato 14» es «Criterios ambientales» en uno y «Acreditación de Mipyme» en
   otro. Por eso la IDENTIDAD de una fila va por su NOMBRE, no solo por su número
   (`clave`): una adenda que renumera no deja la marca del usuario huérfana.

   TRES VÍAS, cada fila dice de cuál salió (`origen`):
     · «rotulo»: «Formato N – nombre», «Anexo N – nombre», «Formulario N – …»,
       «Matriz N – …», con las letras (2A, 9B, 10H), en cualquier página. Es la
       vía principal: el pliego nombra lo que hay que diligenciar.
     · «lista»: el mismo rótulo, pero SOLO en el capítulo «Lista de anexos,
       formatos, matrices y formularios». Una fila que solo está ahí sale «por
       confirmar»: el texto no dice cuándo se entrega (en 3 de los pliegos medidos
       el Formato 13 de Mipyme estaba en la lista y el texto nunca lo pedía).
     · «frase»: «deberá aportar / allegar / presentar / adjuntar…» con un
       documento delante (certificado, copia, declaración, acta, poder…). Lo que
       se reconoce (RUP, existencia y representación, RUT, REDAM, poder…) va con
       su nombre de siempre; lo demás, con las palabras del pliego y «por
       confirmar».

   LO QUE NO ES DEL PROPONENTE NO SE MEZCLA. Los anexos y matrices que publica la
   entidad para que se lean (anexo técnico, cronograma, glosario, minuta, matriz de
   riesgos, matrices de experiencia e indicadores) van aparte, en `de_la_entidad`,
   con su página: decírselos al usuario sin pedirle que los «consiga». Un anexo cuyo
   nombre no se reconoce ni como del proponente ni como de la entidad sale en la
   lista, «por confirmar». Y lo que el CONTRATISTA entrega después de adjudicar
   (garantía única, hojas de vida para la interventoría, programa de obra) no es
   «para presentar la oferta»: una frase con señales de después de adjudicar no
   crea fila.

   LA CITA ES LITERAL. `cita` es un trozo del texto de ESA página (sus líneas unidas
   con un espacio y los espacios plegados): la suite comprueba, pliego por pliego,
   que cada cita está en la página que dice. */
"use strict";

const { lineasConPagina } = require("./paginas.js");

const MAX_FILAS = 120;   // r7_06 trae 75; un tope que corta en silencio se come los certificados del final (revisión adversaria): se sube y, si salta, se DICE (`recortada`, lib/entregar)
const MAX_CITA = 160;
const MAX_OTRAS = 6;
const MAX_ENTIDAD = 20;

const plegar = (s) => String(s || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
const espacios = (s) => String(s || "").replace(/[\s ]+/g, " ").trim();

/* ── las páginas: sus líneas unidas, para que un nombre partido en dos líneas se lea entero ── */
function paginasDe(texto) {
  const porPagina = new Map();
  const orden = [];
  for (const { linea, pagina } of lineasConPagina(texto)) {
    const k = pagina == null ? "_" : pagina;
    if (!porPagina.has(k)) { porPagina.set(k, []); orden.push(k); }
    const l = espacios(String(linea || "").replace(/\f/g, ""));
    if (l) porPagina.get(k).push(l);
  }
  return orden.map((k) => ({ pagina: k === "_" ? null : k, texto: porPagina.get(k).join(" ") }));
}

/* ── el nombre normalizado: la identidad de una fila ─────────────────────────────────────────────
   minúsculas sin tildes, sin signos, sin palabras vacías y con un plural sencillo quitado
   («Factores de desempate» = «Factor de desempate»), las seis primeras palabras */
const VACIAS = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "u", "e", "en", "con", "para", "por", "a", "al", "su", "sus", "un", "una", "lo", "que"]);
function singular(w) {
  if (w.length > 5 && /[rlndzj]es$/.test(w)) return w.slice(0, -2);
  if (w.length > 4 && /s$/.test(w) && !/(is|us)$/.test(w)) return w.slice(0, -1);
  return w;
}
function claveNombre(nombre) {
  const ws = plegar(nombre).replace(/[^a-z0-9ñ ]+/g, " ").split(/\s+/).filter((w) => w && !VACIAS.has(w)).map(singular);
  return ws.slice(0, 6).join("-").slice(0, 90);
}
/* cuánto se parecen dos nombres (palabras en común sobre las del más corto): para seguir
   una marca cuando el nombre cambió poco de una versión a otra */
function parecido(a, b) {
  const A = new Set(String(a || "").split("-").filter(Boolean)), B = new Set(String(b || "").split("-").filter(Boolean));
  if (!A.size || !B.size) return 0;
  let n = 0; for (const w of A) if (B.has(w)) n++;
  return n / Math.min(A.size, B.size);
}

/* ── los rótulos «Formato N – nombre» ─────────────────────────────────────────────────────────── */
/* la letra va pegada («9A», «2B-») o, separada, en mayúscula y seguida de un guion o un cierre («Formato 8 A –», «Formato 8 C»):
   «Formato 3 a la» no es el 3A */
const RE_ROTULO = /\b(formatos?|anexos?|formularios?|matri(?:z|ces)|ap[eé]ndices?)\s*(?:(?:n[oº°]|n[uú]m(?:ero)?)\.?\s*)?(\d{1,2})(?:([a-hA-H])|\s([A-H])(?=\s*[-–—»”".,)]|\s*$))?(?![\d.,]\d)(?![\d%])\b/gi;
const TIPO_DE = (p) => { const s = plegar(p); return s.startsWith("format") ? "formato" : s.startsWith("anex") ? "anexo" : s.startsWith("formul") ? "formulario" : s.startsWith("matri") ? "matriz" : "apendice"; };
const ETIQUETA_TIPO = Object.freeze({ formato: "Formato", anexo: "Anexo", formulario: "Formulario", matriz: "Matriz", apendice: "Apéndice", documento: "", garantia: "" });
/* donde se corta el nombre de un rótulo: un verbo de la frase, un signo, otro rótulo, un número de lista */
const CORTE_PALABRA = new Set(["debera", "deberan", "debe", "deben", "debidamente", "diligenciado", "diligenciada", "diligenciados", "suscrito", "suscrita", "firmado", "firmada",
  "mediante", "donde", "cual", "cuales", "segun", "conforme", "cuando", "sera", "seran", "se", "es", "son", "sin", "establecido", "establecida", "previsto", "prevista",
  "aportar", "aportarse", "presentar", "presentarse", "allegar", "allegarse", "adjuntar", "adjuntarse", "anexar", "diligenciar", "diligenciarse", "suscribir", "entregar",
  "acreditar", "incluir", "cargar", "contenido", "contenida", "adjunto", "adjunta", "deberá", "codigo", "pagina", "version"]);
const TIPOS_PALABRA = new Set(["anexo", "anexos", "formato", "formatos", "formulario", "formularios", "matriz", "matrices", "apendice"]);
const CONECTORES_FINALES = new Set(["de", "del", "la", "las", "el", "los", "y", "o", "u", "e", "en", "con", "para", "por", "a", "al", "su", "sus", "que", "-"]);
function nombreTrasRotulo(resto) {
  const m = /^\s*(["“«]?)\s*([-–—:.]|)\s*/.exec(resto);
  const conSeparador = !!(m && m[2]);
  let s = resto.slice(m ? m[0].length : 0);
  s = s.split(/[.;:“”"«»()[\]]|,\s/)[0];
  const ws = s.split(/\s+/).filter(Boolean);
  const out = [];
  for (const w of ws) {
    const p = plegar(w).replace(/[^a-z0-9ñ-]/g, "");
    if (!p) break;
    if (/^\d+[a-h]?$/.test(p) && out.length) break;        // el número del renglón siguiente de una lista
    /* «Formulario 1 – Formulario de Presupuesto Oficial»: la palabra del tipo solo corta si trae número detrás (otro rótulo) */
    if (TIPOS_PALABRA.has(p) ? (out.length && /^\d/.test(ws[out.length + 1] || "")) : CORTE_PALABRA.has(p)) break;
    if (/^[-–—]+$/.test(w)) break;
    out.push(w);
    if (out.length >= 14) break;
  }
  while (out.length && CONECTORES_FINALES.has(plegar(out[out.length - 1]))) out.pop();
  /* sin separador («del Formato 3 debidamente…», «el Formato 9A, la…») solo vale un nombre que empieza con mayúscula */
  if (!conSeparador && (!out.length || !/^[A-ZÁÉÍÓÚÑ]/.test(out[0]))) return "";
  return out.join(" ").replace(/[-–—,\s]+$/, "");
}

/* el nombre que va delante de «(Anexo No. N)»: desde el número del apartado o el comienzo de la frase hasta el paréntesis */
function nombreAntesDeRotulo(t, pos) {
  const antes = t.slice(Math.max(0, pos - 160), pos);
  if (!/\(\s*$/.test(antes)) return "";
  let s = antes.replace(/\(\s*$/, "").replace(/\s+$/, "");
  const corte = Math.max(s.lastIndexOf(". "), s.lastIndexOf(": "), s.lastIndexOf("; "));
  if (corte >= 0) s = s.slice(corte + 2);
  s = s.replace(/^.*?\b\d+(?:\.\d+)+\.?\s+/, "").replace(/^[\d.)\s-]+/, "").trim();
  const ws = s.split(/\s+/).filter(Boolean).slice(-12);
  if (ws.length < 2 || ws.length > 12) return "";
  let n = ws.join(" ");
  if (n === n.toUpperCase()) n = n[0] + n.slice(1).toLowerCase();
  return /^[A-ZÁÉÍÓÚÑa-záéíóúñ]/.test(n) ? n[0].toUpperCase() + n.slice(1) : "";
}

/* ── lo que no es del proponente, y lo que dice para qué sirve ─────────────────────────────────── */
const RE_DE_ENTIDAD = /t[eé]cnic|especificaci|cronograma|glosario|minuta|\bcontrato\b|riesgo|estudios?\s+previo|an[aá]lisis\s+del\s+sector|\bplanos?\b|pacto\s+de\s+transparencia|indicadores\s+financieros|experiencia\s+(?:exigida|requerida)|^experiencia$|bienes\s+nacionales|presupuesto\s+oficial\s+detallado|apu\s+oficial/i;
const RE_DEL_PROPONENTE = /carta|presentaci[oó]n|conformaci[oó]n|consorci|uni[oó]n\s+temporal|plural|experiencia|capacidad|pagos?|seguridad\s+social|aportes|calidad|desempate|puntaje|industria|nacional|autorizaci[oó]n|datos\s+personales|emprendimiento|mujeres|mipyme|discapacidad|situaciones\s+de\s+control|compromiso|declaraci[oó]n|certific|oferta|propuesta|formulario\s+de\s+presupuesto|presupuesto\s+oficial|manifestaci[oó]n|vinculaci[oó]n|participaci[oó]n|gerencia|maquinaria|sostenibilidad|ambiental|promoci[oó]n|incorporaci[oó]n|personal|equipo|hoja\s+de\s+vida/i;

const CONDICION_POR_NOMBRE = [
  [/plural|consorci|uni[oó]n(?:es)?\s+temporal|\bUT\b/i, "Solo si se presenta en consorcio o unión temporal."],
  [/extranjer/i, "Solo para proponentes extranjeros."],
  [/desempate|vinculaci[oó]n\s+de\s+(?:personas|poblaci)|participaci[oó]n\s+mayoritaria|cabeza\s+de\s+familia|reincorporaci|reintegraci|ind[ií]gena|afro|pagos\s+realizados/i, "Solo si hay que desempatar."],
  [/puntaje|calidad|industria\s+nacional|servicios\s+nacionales|componente\s+nacional|emprendimiento|empresas\s+de\s+mujeres|sostenibilidad|ambiental|gerencia\s+de\s+proyectos|maquinaria|discapacidad/i, "Para obtener puntaje."],
  [/mipyme/i, "Solo si va a acreditar que es Mipyme."],
  [/manifestaci[oó]n\s+de\s+inter[eé]s/i, "Para avisar que le interesa (manifestación de interés), si el proceso la pide."],
];
/* SI EL NOMBRE CASA CON DOS REGLAS, NO SE ELIGE A CIEGAS (revisión adversaria, 3-nov-2026): «Formato 8 – Vinculación de
   personas con discapacidad» da UN PUNTO en 8 de los 14 pliegos medidos y salía «Solo si hay que desempatar» porque la regla
   de desempate iba primero; en la sección «Según su caso» eso invita a marcarlo «No aplica» y perder el punto. Decide la
   frase donde el pliego lo pide (punto o desempate); si tampoco lo dice, una condición neutra que manda a confirmar */
const CONDICION_NEUTRA = "Para puntaje o para desempatar: confirme en el pliego para qué lo piden.";
function condicionPorNombre(nombre, frase = "") {
  const casan = [...new Set(CONDICION_POR_NOMBRE.filter(([re]) => re.test(nombre)).map(([, f]) => f))];
  if (casan.length <= 1) return casan[0] || null;
  const dePuntaje = casan.includes("Para obtener puntaje."), deDesempate = casan.includes("Solo si hay que desempatar.");
  if (dePuntaje && deDesempate && casan.length === 2) {
    const p = /\bpuntos?\b|puntaje|puntuaci/i.test(frase), d = /desempat/i.test(frase);
    return p && !d ? "Para obtener puntaje." : d && !p ? "Solo si hay que desempatar." : CONDICION_NEUTRA;
  }
  return CONDICION_NEUTRA;
}

/* ── las frases «deberá aportar…» ──────────────────────────────────────────────────────────────── */
const VERBOS = "aportar(?:se)?|allegar(?:se)?|presentar(?:se)?|adjuntar(?:se)?|anexar(?:se)?|acompa[nñ]ar(?:se)?|entregar(?:se)?|incluir(?:se)?|acreditar(?:se)?|diligenciar(?:se)?|suscribir(?:se)?|cargar(?:se)?|remitir(?:se)?|apostillar(?:se)?|legalizar(?:se)?|traducir(?:se)?|declarar|certificar(?:se)?|constituir(?:se)?|otorgar(?:se)?|solicitar|aportando|allegando|adjuntando|anexando|presentando";
const RE_EXIGE = new RegExp(`\\b(?:deber[aá]n?|debe(?:n)?|tendr[aá]n?\\s+que|es\\s+necesario|se\\s+requiere|se\\s+exige|es\\s+obligatorio|podr[aá]n?|puede(?:n)?)\\s+(?:\\S+\\s+){0,3}?(?:${VERBOS})\\b|\\b(?:aportar[aá]n?|allegar[aá]n?|adjuntar[aá]n?|anexar[aá]n?|presentar[aá]n?|acompa[nñ]ar[aá]n?)\\b|\\bmediante\\s+(?:la\\s+presentaci[oó]n|el\\s+aporte|la\\s+entrega)\\s+de\\b|\\b(?:aporte|allegue|adjunte|anexe|presente)\\s+(?:el|la|los|las|copia|certificad|un|una)\\b`, "i");
/* después de adjudicar: no es para presentar la oferta */
/* FUERTES: la frase es del adjudicatario o del contrato firmado (salvo que hable de la seriedad, que cubre hasta la
   garantía de cumplimiento). DÉBILES («ejecución del contrato»): solo si la frase no habla del proponente ni de la oferta
   —«…mantendrá dicho personal por el término de ejecución del contrato, para lo cual deberá diligenciar el Formato 8 B»
   es del proponente— */
const RE_DESPUES_DEBIL = /ejecuci[oó]n\s+del\s+contrato|interventor[ií]a\s+(?:deber|aprobar|revisar)/i;
/* «garantía de cumplimiento» NO está aquí a propósito (medido el 3-nov-2026): no quitaba ninguna fila en los 14 pliegos
   —las garantías que no son la de seriedad ya no crean fila genérica— y tumbaría una frase que, de paso, pida un
   documento del oferente. Una señal que no protege nada y puede esconder un requisito sobra */
const RE_DESPUES = /adjudicatari|suscripci[oó]n\s+del\s+contrato|perfeccionamiento|legalizaci[oó]n\s+del\s+contrato|acta\s+de\s+inicio|firma\s+del\s+contrato|cada\s+pago|cuenta\s+de\s+cobro|dentro\s+de\s+los\s+\S+\s+(?:\(\d+\)\s+)?d[ií]as\s+(?:h[aá]biles\s+)?(?:siguientes|posteriores)\s+a\s+la\s+(?:adjudicaci|suscripci|firma|notificaci)/i;
const RE_DEL_OFERENTE = /proponente|oferente|interesad|oferta|propuesta|participante/i;
/* lo que se reconoce: su nombre de siempre y su identidad estable */
const CATALOGO = Object.freeze([
  { clave: "rup", nombre: "Certificado del Registro Único de Proponentes (RUP)", re: /registro\s+[uú]nico\s+de\s+proponentes|\bRUP\b/i },
  { clave: "existencia-representacion", nombre: "Certificado de existencia y representación legal", re: /existencia\s+y\s+representaci[oó]n\s+legal/i },
  { clave: "documento-identidad", nombre: "Documento de identidad", re: /documento\s+de\s+identi(?:dad|ficaci[oó]n)|c[eé]dula\s+de\s+(?:ciudadan[ií]a|extranjer[ií]a)|\bpasaporte\b/i },
  { clave: "rut", nombre: "Registro Único Tributario (RUT)", re: /registro\s+[uú]nico\s+tributario|\bRUT\b/i },
  { clave: "redam", nombre: "Certificado del Registro de Deudores Alimentarios Morosos (REDAM)", re: /\bREDAM\b|deudores\s+alimentarios/i },
  { clave: "garantia-seriedad", nombre: "Garantía de seriedad de la oferta", re: /garant[ií]a\s+de\s+(?:la\s+)?seriedad|p[oó]liza\s+de\s+seriedad|seriedad\s+de\s+la\s+(?:oferta|propuesta)/i },
  { clave: "poder", nombre: "Poder del apoderado", condicion: "Solo si la oferta la presenta un apoderado.", re: /\bpoder\s+(?:especial|general|debidamente|otorgado|conferido|para)|\bapoderad[oa]\b/i },
  { clave: "autorizacion-organo-social", nombre: "Autorización del órgano social (acta de junta de socios o asamblea)", re: /[oó]rgano\s+(?:social|competente|de\s+direcci[oó]n)|junta\s+(?:directiva|de\s+socios)|asamblea\s+(?:general\s+)?de\s+accionistas/i },
  { clave: "matricula-profesional", nombre: "Matrícula o tarjeta profesional y su certificado de vigencia", re: /matr[ií]cula\s+profesional|tarjeta\s+profesional|\bCOPNIA\b|consejo\s+profesional/i },
  { clave: "seguridad-social", nombre: "Certificación de pagos de seguridad social y aportes parafiscales", re: /seguridad\s+social|parafiscales|planilla\s+(?:integrada|de\s+(?:pago|aportes))|afiliaci[oó]n\s+a\s+(?:los\s+sistemas|salud)|salud\s+y\s+pensi/i },
  { clave: "estados-financieros", nombre: "Estados financieros", re: /estados\s+financieros|estado\s+de\s+resultados|balance\s+general/i },
  { clave: "revisor-fiscal", nombre: "Certificación del revisor fiscal o del contador", re: /revisor\s+fiscal/i },
  { clave: "soportes-experiencia", nombre: "Soportes de la experiencia (certificaciones, actas de liquidación o de recibo final)", re: /acta\s+de\s+(?:liquidaci[oó]n|recibo|terminaci[oó]n|entrega|inicio)|orden\s+de\s+inicio|certificaci[oó]n(?:es)?\s+(?:de\s+)?(?:la\s+)?(?:experiencia|los\s+contratos|del\s+contrato|del\s+subcontrato|expedida\s+por\s+la\s+entidad)|copia\s+del\s+contrato/i },
  { clave: "traduccion", nombre: "Traducción oficial de los documentos en idioma extranjero", condicion: "Solo para documentos en otro idioma.", re: /traducci[oó]n\s+oficial|traducid[oa]s?\s+(?:al|oficialmente)/i },
  { clave: "apostilla", nombre: "Apostilla o legalización de los documentos expedidos en el exterior", condicion: "Solo para documentos expedidos en el exterior.", re: /apostill|legalizaci[oó]n\s+(?:de\s+(?:los\s+)?documentos|consular)|consularizaci/i },
  { clave: "visa", nombre: "Visa de residencia", condicion: "Solo para personas naturales extranjeras.", re: /\bvisa\b/i },
  { clave: "convalidacion", nombre: "Convalidación de títulos obtenidos en el exterior", condicion: "Solo para títulos obtenidos en el exterior.", re: /convalida/i },
  { clave: "hojas-vida", nombre: "Hojas de vida del personal", re: /hojas?\s+de\s+vida/i },
  { clave: "titulos-academicos", nombre: "Acta de grado, diploma o títulos del profesional", re: /acta\s+de\s+grado|\bdiploma/i },
  { clave: "certificado-ministerio-trabajo", nombre: "Certificación del Ministerio del Trabajo", re: /ministerio\s+del\s+trabajo/i },
  { clave: "certificado-ministerio-interior", nombre: "Certificación del Ministerio del Interior", re: /ministerio\s+del\s+interior/i },
  { clave: "antecedentes", nombre: "Certificados de antecedentes", re: /antecedentes\s+(?:disciplinarios|fiscales|judiciales|penales)|procuradur[ií]a|contralor[ií]a\s+general|polic[ií]a\s+nacional/i },
  { clave: "oferta-economica", nombre: "Oferta económica", re: /oferta\s+econ[oó]mica|propuesta\s+econ[oó]mica/i },
  { clave: "acto-creacion", nombre: "Acto de creación de la entidad", condicion: "Solo si el proponente es una entidad estatal.", re: /acto\s+de\s+creaci[oó]n/i },
  { clave: "documento-conformacion-plural", nombre: "Documento de conformación del consorcio o unión temporal", condicion: "Solo si se presenta en consorcio o unión temporal.", re: /documento\s+(?:de\s+conformaci[oó]n|constitutivo)|acuerdo\s+(?:de\s+)?consorci|contrato\s+de\s+(?:consorcio|uni[oó]n\s+temporal)/i },
  { clave: "compromiso-anticorrupcion", nombre: "Compromiso anticorrupción o de transparencia", re: /compromiso\s+(?:anticorrupci[oó]n|de\s+transparencia)/i },
  { clave: "constancia-visita", nombre: "Constancia de la visita de obra", re: /(?:certificad[oa]|constancia|acta)\s+de\s+(?:asistencia\s+a\s+la\s+)?visita|visita\s+(?:de\s+obra|al\s+sitio|t[eé]cnica)\s+(?:es\s+)?obligatoria/i },
  { clave: "responsabilidad-fiscal", nombre: "Declaración de no tener responsabilidad fiscal", re: /no\s+(?:son|ser|es|estar|est[aá]n?)\s+(?:reportad\w+\s+como\s+)?responsables?\s+fiscal|bolet[ií]n\s+de\s+responsables\s+fiscales/i },
  { clave: "ejercicio-ingenieria", nombre: "Soportes de que la empresa cumple el artículo 17 de la Ley 842 de 2003", re: /ley\s+842/i },
  { clave: "soportes-subcontratos", nombre: "Soportes de la experiencia en subcontratos (certificación del subcontrato y del contrato principal)", condicion: "Solo si acredita experiencia en subcontratos.", re: /subcontrat/i },
  { clave: "medida-proteccion", nombre: "Medida de protección por violencia intrafamiliar", re: /violencia\s+intrafamiliar|medida\s+de\s+protecci[oó]n/i },
  { clave: "propuesta-alternativa", nombre: "Propuesta alternativa", condicion: "Solo si presenta una propuesta alternativa.", re: /(?:propuesta|oferta)s?\s+alternativa/i },
  { clave: "autorizacion-datos-personales", nombre: "Autorización para el tratamiento de datos personales", re: /tratamiento\s+de\s+(?:los\s+)?datos\s+personales/i },
  { clave: "mujer-cabeza-familia", nombre: "Declaración de la condición de mujer cabeza de familia", re: /cabeza\s+de\s+familia/i },
  { clave: "personas-mayores", nombre: "Certificación de trabajadores mayores no pensionados", re: /pensi[oó]n\s+de\s+vejez|(?:personas?|adultos?)\s+mayores?\s+(?:no\s+)?(?:beneficiari|pensionad)/i },
  { clave: "tamano-empresarial", nombre: "Certificación del tamaño empresarial (Mipyme)", re: /tama[nñ]o\s+empresarial/i },
  { clave: "pagos-mipyme", nombre: "Certificación de pagos a Mipymes, cooperativas o asociaciones mutuales", re: /pagos?\s+(?:realizados\s+)?a\s+(?:las\s+)?mipymes?|asociaciones\s+mutuales/i },
  { clave: "criterios-desempate", nombre: "Documentos para acreditar los criterios de desempate", condicion: "Solo si hay que desempatar.", re: /(?:acreditaci[oó]n\s+de\s+los\s+)?criterios?\s+de\s+desempate/i },
  { clave: "confidencialidad", nombre: "Solicitud de confidencialidad, con su justificación", condicion: "Solo si la oferta trae información reservada.", re: /confidencialidad/i },
  { clave: "registro-pais-origen", nombre: "Inscripción en el registro mercantil del país de origen", condicion: "Solo para personas jurídicas extranjeras.", re: /registro\s+(?:mercantil\s+)?del\s+pa[ií]s\s+(?:de\s+(?:su\s+)?(?:domicilio|origen))/i },
  { clave: "rit", nombre: "Registro de Información Tributaria (RIT)", re: /registro\s+de\s+informaci[oó]n\s+tributaria|\bRIT\b/ },
  { clave: "trato-nacional", nombre: "Certificación de trato nacional por reciprocidad (Ministerio de Relaciones Exteriores)", re: /relaciones\s+exteriores|reciprocidad/i },
  { clave: "carta-disponibilidad", nombre: "Carta de disponibilidad del personal", re: /cartas?\s+de\s+(?:disponibilidad|compromiso)\s+(?:del?\s+)?(?:profesional|personal|director|residente)?/i },
  { clave: "matricula-mercantil", nombre: "Certificado de matrícula mercantil", re: /matr[ií]cula\s+mercantil/i },
  { clave: "aval-ingeniero", nombre: "Aval de la oferta por un ingeniero (con su matrícula y certificado de vigencia)", condicion: "Solo si quien firma la oferta no es ingeniero.", re: /avalad[ao]s?\s+por\s+(?:un|el)\s+ingenier|aval\s+de\s+(?:un|el)\s+ingenier|abonad[ao]s?\s+por\s+(?:un|el)\s+ingenier/i },
  { clave: "licencia-construccion", nombre: "Copia de la licencia de construcción o de urbanismo", re: /licencias?\s+de\s+(?:construcci[oó]n|urbanismo)/i },
  { clave: "joven-icbf", nombre: "Acreditación de joven egresado del Sistema de Protección del ICBF", re: /\bICBF\b|bienestar\s+familiar/i },
  { clave: "declaracion-juramentada", nombre: "Declaración juramentada", re: /declaraci[oó]n\s+juramentada|bajo\s+la\s+gravedad\s+de(?:l)?\s+juramento/i },
]);
/* un documento cualquiera, si la frase no nombra uno del catálogo */
const RE_DOC_GENERICO = /\b(?:certificad[oa]s?|certificaci[oó]n(?:es)?|constancias?|copias?|declaraci[oó]n(?:es)?|actas?|documentos?|cartas?|autorizaci[oó]n(?:es)?|resoluci[oó]n(?:es)?|p[oó]lizas?|garant[ií]as?|planillas?|soportes?)\b/i;
/* la cláusula con que ABRE la frase y la condiciona («En caso de que…», «Si…», «Cuando…»): «Para la verificación de esta
   circunstancia» es un propósito y no entra (revisión adversaria), y una cláusula de menos de cuatro palabras («Cuando la
   Especialización») es un corte, no una condición */
const RE_COND_INICIAL_CRUDA = /^((?:en\s+(?:el\s+)?caso\s+(?:de\s+que|de|en\s+que)|si|cuando|trat[aá]ndose\s+de|de\s+tratarse\s+de|solo\s+(?:cuando|si))\b[^,.;]{3,140}),/i;
const RE_COND_INICIAL = { exec: (t) => { const c = RE_COND_INICIAL_CRUDA.exec(t); return c && c[1].trim().split(/\s+/).length >= 4 ? c : null; } };

/* las oraciones de una página, con su posición: «.», «;» o «:» seguidos de mayúscula, número o viñeta */
function oraciones(t) {
  const out = []; let ini = 0;
  const re = /[.;:](?=\s+(?:[A-ZÁÉÍÓÚÑ¿"“«(•▪●\-–]|\d+[.)]\s))|\s(?=(?:[a-z]|\d{1,2})[.)]\s+[A-ZÁÉÍÓÚÑ])/g;
  let m;
  while ((m = re.exec(t))) { const fin = m.index + 1; if (fin - ini > 3) out.push({ ini, fin }); ini = fin; while (ini < t.length && t[ini] === " ") ini++; }
  if (t.length - ini > 3) out.push({ ini, fin: t.length });
  return out;
}
/* la cita: la oración (o su trozo alrededor de la posición), tal cual está en la página */
function citaDe(t, o, pos) {
  let a = o.ini, b = o.fin;
  if (b - a > MAX_CITA) {
    a = Math.max(o.ini, pos - 70);
    if (a > o.ini) { const sp = t.indexOf(" ", a); if (sp > 0 && sp < pos) a = sp + 1; }
    b = Math.min(o.fin, a + MAX_CITA);
    if (b < o.fin) { const sp = t.lastIndexOf(" ", b); if (sp > pos) b = sp; }
  }
  return t.slice(a, b).trim();
}
const oracionEn = (os, pos) => os.find((o) => pos >= o.ini && pos < o.fin) || { ini: Math.max(0, pos - 100), fin: pos + 120 };
const esIndice = (t, pos) => /^[^.]{0,120}?\.{4,}\s*\d{1,3}\b/.test(t.slice(pos, pos + 160));

const VAGAS = /^(?:requerid|aportad|presentad|valid|establecid|anterior|inciso|numeral|literal|cada|uno|una|ello|ella|mismo|misma|siguiente|continuacion|definid|respectiv|soporte|tipo|pre|impres|momento|simple|independiente|forma|correspondiente|necesari|exigid|mencionad|senalad|indicad|anexo|adjunt|original|digital|fisic|pertinente|idone|legible|completo|vigente|antes|despues|durante|dentro|fuera|este|esta|estos|estas|ese|esa|dicho|dicha|todo|toda|demas|otro|otra|que|cual|donde|sobre|electronic|equivalente|expedid|firmad|suscrit|debid|relacionad|proceso|termino|adicional|copia|contractual|pactad|constitutiv|propuesta|oferta|certificacion|respuesta|repuesta|observacion|participacion|asi)/;
/* el nombre de un documento que la frase pide sin nombrarlo del catálogo: desde la palabra hasta un corte */
function nombreGenerico(frase) {
  const m = RE_DOC_GENERICO.exec(frase);
  if (!m) return null;
  const ws = frase.slice(m.index).split(/[.;:()"“”«»]|,\s/)[0].split(/\s+/).filter(Boolean);
  const out = [];
  for (const w of ws) {
    const p = plegar(w).replace(/[^a-z0-9ñ]/g, "");
    if (out.length && (CORTE_PALABRA.has(p) || ["que", "cual", "donde", "segun", "con", "dentro", "mediante", "conforme", "so", "si"].includes(p))) break;
    out.push(w);
    if (out.length >= 10) break;
  }
  while (out.length && (CONECTORES_FINALES.has(plegar(out[out.length - 1])) || out[out.length - 1].length === 1)) out.pop();
  const s = out.join(" ").replace(/[,\s]+$/, "");
  /* lo que va detrás de la palabra del documento tiene que nombrar algo: «documentos requeridos en el momento»,
     «certificados del inciso anterior» o «documentos de cada uno de ellos» no le dicen al usuario qué conseguir */
  const sig = plegar(s).replace(/[^a-z0-9ñ ]+/g, " ").split(/\s+/).filter((w) => w && !VACIAS.has(w)).slice(1);
  if (!sig.length || VAGAS.test(sig[0])) return null;
  /* una garantía que no es la de seriedad (esa la reconoce el catálogo) es del contrato: después de adjudicar */
  if (/^(?:garant|poliza)/.test(plegar(s))) return null;
  return s.length >= 8 ? s[0].toUpperCase() + s.slice(1) : null;
}

/* ═════════ LA LECTURA ═════════ */
function leerEntregables(texto) {
  const paginas = paginasDe(texto);
  /* la lista del capítulo IX: su página y desde dónde. Es la ÚLTIMA vez que sale el título: la primera suele ser
     el índice del principio («CAPITULO IX LISTA DE ANEXOS, FORMATOS, MATRICES Y FORMULARIOS 78», sin puntos) */
  let lista = null;
  paginas.forEach((pg, idx) => {
    const re = /(?:LISTA(?:DO)?\s+DE\s+ANEXOS|ANEXOS,\s*FORMATOS,?\s*MATRICES|FORMATOS,\s*MATRICES\s+Y\s+FORMULARIOS)/gi;
    let m;
    while ((m = re.exec(pg.texto))) if (!esIndice(pg.texto, m.index)) lista = { pagina: pg.pagina, pos: m.index, idx };
  });
  const enLista = (iPag, pos) => !!lista && (iPag > lista.idx || (iPag === lista.idx && pos >= lista.pos));

  /* 1 · los rótulos */
  const porRotulo = new Map();   // tipo|numero → { tipo, numero, menciones: [] }
  paginas.forEach((pg, iPag) => {
    const t = pg.texto; const os = oraciones(t);
    RE_ROTULO.lastIndex = 0;
    let m;
    while ((m = RE_ROTULO.exec(t))) {
      /* con /i la letra separada también casa en minúscula («Formato 3 a –»): esa no es letra, y el nombre empieza antes */
      const letraSuelta = m[4] && m[4] === m[4].toUpperCase() ? m[4] : "";
      const finRotulo = m.index + m[0].length - (m[4] && !letraSuelta ? m[0].length - m[0].replace(/\s[a-h]$/, "").length : 0);
      const numero = (m[2] + (m[3] || letraSuelta || "")).toUpperCase().replace(/^0+(?=\d)/, "");
      if (Number(m[2]) < 1 || Number(m[2]) > 40) continue;
      if (esIndice(t, m.index)) continue;
      /* «9.4 FORMULARIOS 1. Formulario 1– …»: un plural seguido de «1.» es el título de la lista con su viñeta */
      if (/s$/i.test(m[1]) && /^\s*[.)]/.test(t.slice(m.index + m[0].length, m.index + m[0].length + 3))) continue;
      if (/^formatos?$/i.test(m[1]) && /^\s*(?:excel|word|pdf|xlsx?|docx?)\b/i.test(t.slice(m.index + m[0].length, m.index + m[0].length + 8))) continue;
      const tipo = TIPO_DE(m[1]);
      /* «Carta de presentación de la propuesta (ANEXO No. 1)»: en los pliegos propios el nombre va DELANTE, entre paréntesis */
      const nombre = nombreTrasRotulo(t.slice(finRotulo, finRotulo + 260)) || nombreAntesDeRotulo(t, m.index);
      const o = oracionEn(os, m.index);
      const frase = t.slice(o.ini, o.fin);
      const k = `${tipo}|${numero}`;
      if (!porRotulo.has(k)) porRotulo.set(k, { tipo, numero, menciones: [] });
      /* `entorno`: lo que rodea la mención (400 caracteres antes), para saber si da PUNTOS o desempata: en Hábitat (pág. 82)
         «asignará un (1) punto» está en la frase anterior a «debe presentar: i) el Formato 8» */
      porRotulo.get(k).menciones.push({ pagina: pg.pagina, nombre, lista: enLista(iPag, m.index), exige: RE_EXIGE.test(frase), cita: citaDe(t, o, m.index), frase, entorno: t.slice(Math.max(0, o.ini - 400), o.fin) });
      /* «(ANEXO No. 7 y No. 8)»: el segundo número es del mismo tipo, con el mismo nombre de delante */
      const sigue = /^\s*(?:,|y|e)\s*(?:n[oº°]|n[uú]m(?:ero)?)\.?\s*(\d{1,2})([A-H])?\b/i.exec(t.slice(finRotulo, finRotulo + 30));
      if (sigue) {
        const n2 = (sigue[1] + (sigue[2] || "")).toUpperCase();
        const k2 = `${tipo}|${n2}`;
        if (!porRotulo.has(k2)) porRotulo.set(k2, { tipo, numero: n2, menciones: [] });
        porRotulo.get(k2).menciones.push({ pagina: pg.pagina, nombre: nombreAntesDeRotulo(t, m.index), lista: enLista(iPag, m.index), exige: RE_EXIGE.test(frase), cita: citaDe(t, o, m.index), frase });
      }
    }
  });
  const filas = [], deLaEntidad = [];
  for (const { tipo, numero, menciones } of porRotulo.values()) {
    /* el nombre: el de la lista si lo trae (es el más limpio), si no el más repetido */
    const deLista = menciones.find((x) => x.lista && x.nombre);
    const cuenta = new Map();
    for (const x of menciones) {
      const c = x.nombre ? claveNombre(x.nombre) : "";
      if (!c) continue;
      if (!cuenta.has(c)) cuenta.set(c, { n: 0, nombre: x.nombre });
      cuenta.get(c).n++;
    }
    const masVisto = [...cuenta.values()].sort((a, b) => b.n - a.n || a.nombre.length - b.nombre.length)[0] || null;
    /* la sigla de la lista («(Formato 2B- UT)») cede ante el nombre entero del texto («Uniones Temporales») */
    const nombre = (deLista && deLista.nombre && !(deLista.nombre.length <= 3 && masVisto && masVisto.nombre.length > 3) ? deLista.nombre : null) || (masVisto && masVisto.nombre) || "";
    const clave = claveNombre(nombre);
    /* dos nombres que no se parecen para el mismo número: el pliego se contradice o hay dos versiones mezcladas */
    const otros = [...cuenta.entries()].filter(([c]) => c !== clave && parecido(c, clave) < 0.34 && c.split("-").length >= 2 && clave.split("-").length >= 2 && !c.startsWith(clave) && !clave.startsWith(c));
    const cuerpo = menciones.filter((x) => !x.lista);
    const mejor = cuerpo.find((x) => x.exige && x.nombre && claveNombre(x.nombre) === clave) || cuerpo.find((x) => x.exige) || cuerpo.find((x) => x.nombre && claveNombre(x.nombre) === clave) || cuerpo[0] || deLista || menciones[0];
    const paginasOtras = [...new Set(menciones.map((x) => x.pagina).filter((p) => p != null && p !== mejor.pagina))].slice(0, MAX_OTRAS);
    const deEntidad = (tipo === "matriz" || tipo === "anexo" || tipo === "apendice") && nombre && RE_DE_ENTIDAD.test(nombre) && !(tipo === "anexo" && /carta|conformaci|compromiso|declaraci|certific|oferta|propuesta/i.test(nombre));
    if (deEntidad || (tipo === "matriz" && !nombre)) { deLaEntidad.push({ tipo, numero, nombre: nombre || null, pagina: mejor.pagina }); continue; }
    /* la DUDA va como código (la frase la arma lib/entregar.js, en un solo sitio): pesa menos en los hechos guardados */
    let duda = null;
    if (!cuerpo.length) duda = "solo_lista";
    else if ((tipo === "anexo" || tipo === "apendice" || tipo === "matriz") && !(nombre && RE_DEL_PROPONENTE.test(nombre))) duda = nombre ? "anexo_dudoso" : "sin_nombre";
    else if (!nombre) duda = "sin_nombre";
    if (otros.length) duda = "dos_nombres";
    const condFrase = (() => { const c = RE_COND_INICIAL.exec(mejor.frase || ""); return c ? `${c[1][0].toUpperCase()}${c[1].slice(1)}.` : null; })();
    filas.push({
      tipo, numero, nombre: nombre || null, clave, pagina: mejor.pagina, cita: mejor.cita, otras_paginas: paginasOtras,
      origen: cuerpo.length ? "rotulo" : "lista", duda, ...(otros.length ? { otro_nombre: otros[0][1].nombre } : {}),
      /* del NOMBRE, no de la frase: «extranjero» en la frase del 9A no hace del 9A un formato de extranjeros */
      condicion: condicionPorNombre(nombre, menciones.filter((x) => !x.lista).map((x) => x.entorno).join(" ")) || condFrase,
    });
  }

  /* 2 · las frases «deberá aportar…» */
  const porFrase = new Map();
  /* LA LISTA BAJO «deberá aportar los siguientes documentos:» (Floridablanca, pág. 22): cada viñeta hereda la exigencia
     del encabezado hasta que una frase deja de ser viñeta. Se arrastra de una página a la siguiente */
  let heredada = null;
  const RE_VINETA = /^\s*(?:[•▪●◦·\-–]|[a-z]\)|\d{1,2}[.)])\s+/;
  paginas.forEach((pg) => {
    const t = pg.texto; const os = oraciones(t);
    for (const o of os) {
      const frase = t.slice(o.ini, o.fin);
      const propio = RE_EXIGE.exec(frase);
      const mE = propio || (heredada && RE_VINETA.test(frase) ? heredada : null);
      if (propio) heredada = /:\s*$/.test(frase.trim()) ? { index: 0, 0: "" } : null;
      else if (!RE_VINETA.test(frase)) heredada = null;
      if ((RE_DESPUES.test(frase) && !/seriedad/i.test(frase)) || (!RE_DEL_OFERENTE.test(frase) && (/contratista/i.test(frase) || RE_DESPUES_DEBIL.test(frase)))) continue;
      /* un documento CONOCIDO que el pliego nombra sin el verbo («REGISTRO ÚNICO TRIBUTARIO (RUT).», «Acto de creación
         de la entidad estatal.», una lista bajo «deberá allegar:») también cuenta: sale «por confirmar» si ninguna
         frase lo pide con el verbo. Lo que no se reconoce necesita el verbo. */
      if (!mE) {
        for (const c of CATALOGO) if (c.re.test(frase)) {
          if (!porFrase.has(c.clave)) porFrase.set(c.clave, { clave: c.clave, nombre: c.nombre, conocido: true, menciones: [] });
          porFrase.get(c.clave).menciones.push({ pagina: pg.pagina, cita: citaDe(t, o, o.ini + Math.max(0, frase.search(c.re))), condicion: c.condicion || null, exige: false });
        }
        continue;
      }
      RE_ROTULO.lastIndex = 0;
      const tieneRotulo = RE_ROTULO.test(frase);
      const encontrados = CATALOGO.filter((c) => c.re.test(frase));
      const condIni = (() => { const c = RE_COND_INICIAL.exec(frase); return c ? `${c[1][0].toUpperCase()}${c[1].slice(1)}.` : null; })();
      /* LA CONDICIÓN, SOLO SI ES SEGURA: una condición equivocada («Poder del apoderado: solo en consorcio») le
         esconde al usuario un requisito que sí le toca, que es el error caro aquí. Vale la del propio documento
         (un poder es de quien actúa por apoderado) o la cláusula con que ABRE la frase, copiada del pliego */
      const anotar = (clave, nombre, conocido, propia = null) => {
        if (!porFrase.has(clave)) porFrase.set(clave, { clave, nombre, conocido, menciones: [] });
        porFrase.get(clave).menciones.push({ pagina: pg.pagina, cita: citaDe(t, o, o.ini + mE.index), condicion: propia || condIni, exige: true });
      };
      for (const c of encontrados) anotar(c.clave, c.nombre, true, c.condicion || null);
      if (!encontrados.length && !tieneRotulo) {
        /* el documento tiene que estar DESPUÉS del verbo (lo que se pide), o la frase es pasiva («La garantía deberá aportarse») */
        const tras = frase.slice(mE.index + mE[0].length);
        const nom = nombreGenerico(tras) || (/(?:se|rse)\b/.test(mE[0]) ? nombreGenerico(frase.slice(0, mE.index + 1)) : null);
        if (nom) { const k = claveNombre(nom); if (k && k.split("-").length >= 2) anotar(k, nom, false); }
      }
    }
  });
  const rotulosPorClave = new Set(filas.map((f) => f.clave));
  /* el documento que ES un formato del pliego no se repite: «documento de conformación» es el Formato 2 */
  const MISMO_QUE_FORMATO = { "documento-conformacion-plural": /conformaci[oó]n|consorci|uni[oó]n(?:es)?\s+temporal/i, "criterios-desempate": /desempate/i, "autorizacion-datos-personales": /datos\s+personales/i };
  for (const g of porFrase.values()) {
    if (rotulosPorClave.has(g.clave)) continue;   // ya es un formato con ese nombre
    if (MISMO_QUE_FORMATO[g.clave] && filas.some((f) => f.tipo === "formato" && MISMO_QUE_FORMATO[g.clave].test(f.nombre || ""))) continue;
    const exigen = g.menciones.filter((x) => x.exige);
    const base = exigen.length ? exigen : g.menciones;
    const m0 = base.find((x) => !x.condicion) || base[0];
    /* TODAS las menciones, con verbo o sin él: una sola frase condicionada no manda sobre las que no lo están (revisión
       adversaria: «Soportes de la experiencia» salía «En caso de que no requiera autorización para subcontratar» en 13 pliegos) */
    const condiciones = new Set(g.menciones.map((x) => x.condicion));
    const tipo = g.clave === "garantia-seriedad" ? "garantia" : "documento";
    filas.push({
      tipo, numero: null, nombre: g.nombre, clave: g.clave,
      pagina: m0.pagina, cita: m0.cita, otras_paginas: [...new Set(g.menciones.map((x) => x.pagina).filter((p) => p != null && p !== m0.pagina))].slice(0, MAX_OTRAS),
      origen: "frase", duda: !g.conocido ? "no_reconocido" : !exigen.length ? "sin_verbo" : null,
      /* una condición solo si TODAS las menciones la llevan: si una lo pide sin condición, se pide sin condición */
      condicion: condiciones.has(null) || condiciones.size > 1 ? null : m0.condicion,
    });
  }
  /* el orden: formatos, formularios, anexos, garantía y documentos; dentro, por número o por página */
  const ordenTipo = { formato: 0, formulario: 1, anexo: 2, apendice: 3, matriz: 4, garantia: 5, documento: 6 };
  const numOrden = (n) => { const m = /^(\d+)([A-Z]?)$/.exec(String(n || "")); return m ? Number(m[1]) * 100 + (m[2] ? m[2].charCodeAt(0) - 64 : 0) : 1e6; };
  filas.sort((a, b) => ordenTipo[a.tipo] - ordenTipo[b.tipo] || numOrden(a.numero) - numOrden(b.numero) || (a.pagina || 1e6) - (b.pagina || 1e6));
  const recortada = filas.length > MAX_FILAS;
  return {
    filas: filas.slice(0, MAX_FILAS), recortada,
    lista_de_anexos: lista ? { pagina: lista.pagina } : null,
    de_la_entidad: deLaEntidad.slice(0, MAX_ENTIDAD),
  };
}

/* la identidad de una fila (tipo + número + nombre normalizado) y su título, derivados: no se guardan */
const idDe = (f) => `${f.tipo}|${String(f.numero || "").toLowerCase()}|${f.clave || ""}`;
const tituloDe = (f) => (f.numero ? `${ETIQUETA_TIPO[f.tipo] || ""} ${f.numero}${f.nombre ? ` – ${f.nombre}` : ""}`.trim() : (f.nombre || ""));
const DUDAS = Object.freeze(["solo_lista", "anexo_dudoso", "sin_nombre", "dos_nombres", "no_reconocido", "sin_verbo"]);

module.exports = { leerEntregables, claveNombre, parecido, paginasDe, nombreTrasRotulo, idDe, tituloDe, DUDAS, CATALOGO, MAX_FILAS, MAX_CITA };
