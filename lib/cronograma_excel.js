/* ============================================================================
   lib/cronograma_excel · EL CRONOGRAMA EN HOJA DE CÁLCULO, LEÍDO CON PUERTA (3-nov-2026)
   ----------------------------------------------------------------------------
   En 4 de 5 cronogramas reales de menor cuantía medidos (detekta-lector,
   muestra/fichas_A-E) el cronograma es el «Anexo2 Cronograma Menor Cuantia V3»
   de Colombia Compra en .xlsm: hoja «Cronograma-Licitación Pública», la
   actividad en la columna C y su fecha en la D. Sus fechas no llegaban a la
   línea de tiempo, a los avisos ni a «lo próximo que vence». Aquí se leen en el
   servidor (op=descargar, formato «cronograma»), por el mismo camino que el
   Formulario 1 en Excel (lib/formulario_excel): el mismo lector de libros
   (public/xlsx_lectura), la misma descompresión con topes, y una PUERTA.

   QUÉ NO SE HACE AQUÍ: decidir qué hito es cada fila ni qué fecha vale. Cada
   fila sale como un renglón «rótulo + fecha» con su ancla (hoja y celda) y entra
   a `lib/cronograma.extraerHitosDeLineas`: el MISMO lector de los cronogramas en
   PDF, con sus órdenes, rangos y horas. Un segundo lector divergiría.

   LA PUERTA. Solo se da por leída UNA hoja donde al menos MIN_HITOS hitos
   DISTINTOS del cronograma (los rótulos de `lib/cronograma.HITOS`, no una lista
   nueva) tienen en la celda de AL LADO una fecha legible. Una matriz de riesgos,
   un presupuesto o la programación de la obra no pasan: sus filas no son
   actividades del proceso. Lo que no pasa no entrega ninguna fecha, solo el
   motivo («no se da por leído»): el falso positivo es una fecha creíble y
   equivocada en un plazo.

   LAS FECHAS DE EXCEL. El lector de libros no convierte fechas: entrega el
   NÚMERO DE SERIE (días desde el 30-dic-1899, sistema 1900). Se convierte SOLO
   en la columna de la fecha de la hoja elegida y SOLO si cae entre el
   1-ene-2015 (SECOP II) y el 31-dic-2099 (el techo del lector de fechas); fuera
   de ahí no es una fecha del proceso y la fila queda sin fecha. La parte decimal
   (la hora) NO se toma: el formato de la celda decide si se ve, el lector no lo
   lee, y una hora que nadie vio en pantalla no se afirma. Un libro con el
   sistema de 1904 (Mac) no se da por leído: sus series darían fechas corridas
   cuatro años. El texto («Hasta el 03 de julio de 2026», «15 de julio de 2026,
   hora: 8:00 am», «N/A») pasa tal cual por el lector de fechas de siempre.

   DEFENSAS. El libro viene de SECOP II, o sea de fuera: descompresión con tope
   (la de lib/formulario_excel), filas devueltas con tope (MAX_FILAS) y textos
   recortados; todo error es { ok:false, motivo }, nunca una excepción.
   ========================================================================== */
"use strict";

const XL = require("../public/xlsx_lectura.js");
const Cron = require("./cronograma.js");

const VERSION_LECTOR = 2;             // la de ESTE lector: un cronograma leído con otra se vuelve a leer (lib/documentos_proceso.cronogramaVigente). 2 (4-nov-2026): cambió qué filas chocan y cada fila se lee sola
const MIN_HITOS = 4;                  // hitos DISTINTOS con su fecha para dar la hoja por leída: los reales traen 14 o 15
const MAX_FILAS = 40;                 // filas que se guardan: el cronograma tipo trae ~25 actividades y solo se guardan las que nombran un hito
const MAX_FILAS_HOJA = 300;           // filas que se miran de cada hoja: el cronograma va arriba; un libro de 800 filas de festivos no cambia nada
const MAX_COLUMNAS_HOJA = 26;         // columnas que se miran (A–Z)
/* UN TEXTO MÁS LARGO QUE SU TOPE NO SE RECORTA: SE DESCARTA (revisión adversaria del 3-nov-2026, reproducido). El primer tope era de
   80 caracteres y se aplicaba ANTES de leer la fecha: «A partir de la publicación del pliego definitivo, esto es, del 06/07/2026 al
   15/07/2026» quedaba en «… del 06/07/2026 al 15/» y el plazo salía nueve días ANTES. Un pedazo de texto no se lee nunca. */
const MAX_ROTULO = 200;
const MAX_VALOR = 300;
const MAX_HOJA = 31;                  // Excel no deja nombrar una hoja con más de 31 caracteres
/* la ventana creíble de un número de serie: del 1-ene-2015 al 31-dic-2099 */
const SERIE_MIN = 42005;              // 2015-01-01 (el mismo número que trae la hoja «Festivos» del Anexo 2 real para el 1-ene-2015)
const SERIE_MAX = 73050;              // 2099-12-31 (calculado: días desde el 30-dic-1899)
const EPOCA_1900 = Date.UTC(1899, 11, 30);
const CELDA_RE = /^[A-Z]{1,3}[1-9]\d{0,6}$/;
/* una fecha guardada como texto ISO (celdas t="d"): el día, sin la hora, como en un número de serie */
const ISO_RE = /^(\d{4})-(\d{2})-(\d{2})(?:[T ]\d{2}:\d{2}(?::\d{2}(?:\.\d+)?)?(?:Z|[+-]\d{2}:?\d{2})?)?$/;

const limpio = (s) => String(s).replace(/\s+/g, " ").trim();
/* el texto limpio si cabe entero en su tope; si no, null: nunca un pedazo */
const cabe = (s, n) => { const t = limpio(s); return t && t.length <= n ? t : null; };

/* El valor de la celda de la fecha, como texto que el lector de fechas entiende.
   Un número solo es fecha dentro de la ventana; lo demás (un 3, un 45 %, una
   cifra de pesos) no es fecha. El texto se limpia de tabuladores y saltos de
   línea (vistos en el Anexo 2 real: «06 de julio de 2026\t\t»). */
function valorDeCelda(v) {
  if (typeof v === "number") {
    if (!Number.isFinite(v) || v < SERIE_MIN || v >= SERIE_MAX + 1) return null;
    const d = new Date(EPOCA_1900 + Math.floor(v) * 86400000);
    return `${String(d.getUTCDate()).padStart(2, "0")}/${String(d.getUTCMonth() + 1).padStart(2, "0")}/${d.getUTCFullYear()}`;
  }
  if (typeof v === "string") {
    const t = cabe(v, MAX_VALOR);
    if (!t) return null;
    const iso = ISO_RE.exec(t);
    return iso ? `${iso[3]}/${iso[2]}/${iso[1]}` : t;
  }
  return null;
}
/* ¿la celda trae una fecha legible? (para saber si OTRA columna también trae fechas) */
const traeFecha = (v) => { const t = valorDeCelda(v); return t != null && Cron.fechaEnLinea(t) != null; };

/* ¿el rótulo nombra un hito del cronograma? Los rótulos son los de lib/cronograma.HITOS. */
const nombraHito = (r) => typeof r === "string" && Cron.HITOS.some((h) => h.re.test(r));

/* La cita que se enseña: el rótulo y SU fecha. El renglón entero («Traslado para
   observaciones al informe de evaluación de las ofertas (plazo máximo para
   presentación de subsanaciones) 21/09/2026») pasa de los 100 caracteres que se
   guardan y el recorte se comía justo la fecha: se acorta el rótulo, nunca el valor. */
const MAX_CITA = 100;
function citaDe(f) {
  const r = String(f.r), v = String(f.v);
  return `${r} ${v}`.length <= MAX_CITA ? `${r} ${v}` : `${r.slice(0, Math.max(10, MAX_CITA - v.length - 2))}… ${v}`;
}

/* el hito que da UNA fila mirada SOLA, sin las de arriba: en una hoja cada fila es una actividad, así que esta es su lectura fiel */
const hitoSolo = (f) => Cron.extraerHitosDeLineas([{ linea: `${f.r} ${f.v}` }]).hitos[0] || null;

/** Las fechas de unas filas ya leídas ({r, v, c}) de la hoja `hoja`, por el MISMO lector de los PDF, FILA POR FILA.
    UNA FILA NO SE LLEVA EL HITO DE OTRA (4-nov-2026, medido sobre los 50 rótulos reales y reproducido en la revisión adversaria):
    pasadas todas juntas, el lector de los PDF no vuelve a dar un hito ya tomado y prueba el siguiente que case. Así «Plazo para
    presentar observaciones al proyecto de Pliego…», escrita dos veces con la MISMA fecha (la puerta la dejaba pasar), daba en la
    segunda el plazo de observaciones AL PLIEGO con la fecha del proyecto, citado con su celda, y la fila de verdad de ese plazo,
    más abajo, se perdía. En un PDF los renglones pegan dos filas y ese recorrido hace falta; en una hoja cada fila es UNA actividad:
    se lee SOLA, y de cada hito manda la primera fila que lo trae. */
function hitosDeFilas(filas, hoja) {
  const lista = Array.isArray(filas) ? filas : [];
  const hitos = [], vistos = new Set();
  let sinFecha = 0;
  for (const f of lista) {
    const r = Cron.extraerHitosDeLineas([{ linea: `${f.r} ${f.v}`, pagina: null, hoja, celda: f.c }]);
    sinFecha += r.lineas_hito_sin_fecha;
    const h = r.hitos[0];
    if (!h || vistos.has(h.id)) continue;
    vistos.add(h.id);
    hitos.push({ ...h, evidencia: citaDe(f) });
  }
  return { hitos, lineas_hito_sin_fecha: sinFecha };
}

const fraseCuantas = (n) => (n === 0 ? "ninguna actividad del cronograma trae" : n === 1 ? "solo una actividad del cronograma trae" : `solo ${n} actividades del cronograma traen`);

/** LA PUERTA, sobre filas ya tipadas. La usan el lector (aquí) y el servidor al recibir
    lo que manda el navegador (lib/documentos_proceso.cronogramaDeExcel): la misma regla dos veces. */
function puerta(filas, hoja) {
  if (!Array.isArray(filas) || !filas.length) return { publicable: false, motivo: "ninguna fila trae una actividad del cronograma con su fecha al lado", hitos: [] };
  if (filas.length > MAX_FILAS) return { publicable: false, motivo: `trae ${filas.length} filas, más de las ${MAX_FILAS} de un cronograma del proceso`, hitos: [] };
  for (const f of filas) {
    if (!f || typeof f.r !== "string" || !f.r.trim() || typeof f.v !== "string" || !f.v.trim() || !CELDA_RE.test(String(f.c || ""))) return { publicable: false, motivo: "una fila no trae su actividad, su valor y su celda", hitos: [] };
    if (f.r.length > MAX_ROTULO || f.v.length > MAX_VALOR) return { publicable: false, motivo: `la fila de la celda ${f.c} trae un texto más largo de lo que escribe un cronograma`, hitos: [] };
    if (!nombraHito(f.r)) return { publicable: false, motivo: `la fila de la celda ${f.c} no nombra una actividad del cronograma`, hitos: [] };
  }
  /* todas las fechas en UNA columna: la de al lado de los rótulos */
  const columnas = new Set(filas.map((f) => String(f.c).replace(/\d+$/, "")));
  if (columnas.size !== 1) return { publicable: false, motivo: "las fechas no están en una sola columna", hitos: [] };
  if (new Set(filas.map((f) => f.c)).size !== filas.length) return { publicable: false, motivo: "dos filas citan la misma celda", hitos: [] };
  const h = typeof hoja === "string" && hoja.trim() && hoja.length <= MAX_HOJA ? hoja : null;
  if (!h) return { publicable: false, motivo: "no se sabe de qué hoja salen las fechas", hitos: [] };
  /* LA MISMA ACTIVIDAD ESCRITA DOS VECES CON FECHAS DISTINTAS: no se adivina cuál rige (revisión adversaria del 3-nov-2026, reproducido).
     El lector se queda con la PRIMERA fila de cada hito, y con el cierre viejo copiado encima del nuevo el plazo salía el viejo, citado
     con su celda. Cada fila se mira SOLA, con el mismo lector; la misma fecha dos veces (el cierre y la diligencia de apertura de
     ofertas del Anexo 2, el mismo día) no es un conflicto.
     QUÉ CHOCA (4-nov-2026, medido en producción y revisado con una segunda lectura adversaria): con «el mismo hito» se rechazaban
     13 de 36 anexos públicos sanos, porque la licitación pública trae actividades distintas que caen en un mismo hito con días
     distintos —el aviso de convocatoria y los avisos que le siguen (6); la audiencia de adjudicación y la publicación del acto (5);
     la entrega de la oferta y otra actividad del cierre (2)—. Pero aflojarlo para todo («solo si se repite el rótulo») dejaba pasar
     con la fecha VIEJA el plazo que una adenda escribe en otra fila («… (Adenda 1)», «Nuevo plazo para presentar observaciones…»,
     un traslado «prorrogado»), y esos plazos no los publica SECOP II: nada los corrige. Así que:
     · LA MISMA ACTIVIDAD con dos fechas choca siempre (el rótulo, sin mayúsculas, tildes, signos ni espacios de más);
     · UN PLAZO con dos fechas choca aunque los rótulos difieran —el error caro aquí es dar un plazo falso—, salvo el CIERRE, que
       SECOP II publica y manda (lib/cronograma.combinarHitos): la fecha del anexo solo viaja como «otra fecha»;
     · un EVENTO (aviso, adjudicación, respuestas, informes) y el cierre toman la primera fila, que en la plantilla es la del hito. */
  const rotulo = (r) => require("./documentos_proceso.js").plegar(r).replace(/[^a-z0-9]+/g, " ").trim();   // diferido: documentos_proceso llama a este módulo
  const choca = (ya, f, frase) => ({ publicable: false, motivo: `${frase} (celdas ${ya.c} y ${f.c}): no se adivina cuál rige`, hitos: [] });
  const porRotulo = new Map(), porPlazo = new Map();
  for (const f of filas) {
    const uno = hitoSolo(f);
    if (!uno) continue;
    const clave = rotulo(f.r);
    const ya = porRotulo.get(clave);
    if (ya && ya.fecha !== uno.fecha) return choca(ya, f, `la misma actividad, «${Cron.HITO_POR_ID[ya.id].corta}», trae dos fechas distintas`);
    if (!ya) porRotulo.set(clave, { id: uno.id, fecha: uno.fecha, c: f.c });
    if (Cron.HITO_POR_ID[uno.id].tipo !== "plazo" || uno.id === "cierre") continue;
    const plazo = porPlazo.get(uno.id);
    if (plazo && plazo.fecha !== uno.fecha) return choca(plazo, f, `dos filas dan fechas distintas para el plazo «${Cron.HITO_POR_ID[uno.id].corta}»`);
    if (!plazo) porPlazo.set(uno.id, { fecha: uno.fecha, c: f.c });
  }
  const { hitos } = hitosDeFilas(filas, h);
  if (hitos.length < MIN_HITOS) return { publicable: false, motivo: `${fraseCuantas(hitos.length)} su fecha al lado; hacen falta al menos ${MIN_HITOS} para dar la hoja por leída`, hitos: [] };
  return { publicable: true, motivo: null, hitos };
}

/* LO QUE ESTÁ OCULTO NO SE LEE (revisión adversaria del 3-nov-2026, reproducido): el lector de libros no mira la visibilidad, y una
   hoja oculta con el cronograma viejo puesta antes de la visible, una fila oculta con el cierre viejo o la columna original oculta
   ganaban. Aquí se leen del XML del libro: las hojas con state="hidden" o "veryHidden", y las filas y columnas con hidden="1".
   También el sistema de fechas de 1904, con comillas dobles o simples. Sin poder leerlo, nada se da por oculto. */
const atributo = (s, n) => { const m = new RegExp(`(?:^|\\s)${n.replace(":", "\\:")}\\s*=\\s*(?:"([^"]*)"|'([^']*)')`).exec(s); return m ? (m[1] != null ? m[1] : m[2]) : null; };
const verdadero = (v) => /^(?:1|true)$/i.test(String(v == null ? "" : v));
async function estructura(bytes, inflar) {
  const out = { fecha1904: false, ocultas: new Set(), filasOcultas: new Map(), columnasOcultas: new Map() };
  try {
    const zip = XL.leerZip(bytes);
    const texto = async (n) => { const b = await zip.extraer(n, inflar); return b ? new TextDecoder("utf-8").decode(b) : null; };
    const wb = await texto("xl/workbook.xml");
    if (!wb) return out;
    const pr = /<workbookPr\b([^>]*)>/.exec(wb);
    out.fecha1904 = !!pr && verdadero(atributo(pr[1], "date1904"));
    const rels = (await texto("xl/_rels/workbook.xml.rels")) || "";
    const relPorId = {};
    for (const m of rels.matchAll(/<Relationship\b([^>]*)>/g)) { const id = atributo(m[1], "Id"), t = atributo(m[1], "Target"); if (id && t) relPorId[id] = t; }
    let i = 0;
    for (const m of wb.matchAll(/<sheet\b([^>]*?)\/>/g)) {
      i++;
      const nombre = XL.desescaparXml(atributo(m[1], "name") || `Hoja${i}`);
      if (/^(?:hidden|veryHidden)$/.test(atributo(m[1], "state") || "")) out.ocultas.add(nombre);
      const rid = atributo(m[1], "r:id");
      const destino = (rid && relPorId[rid] ? relPorId[rid] : `worksheets/sheet${i}.xml`).replace(/^\//, "").replace(/^xl\//, "");
      const xml = await texto(`xl/${destino}`);
      if (!xml) continue;
      const filas = new Set(), cols = new Set();
      for (const r of xml.matchAll(/<row\b([^>]*)>/g)) if (verdadero(atributo(r[1], "hidden"))) { const n = Number(atributo(r[1], "r")); if (Number.isInteger(n) && n > 0) filas.add(n); }
      for (const c of xml.matchAll(/<col\b([^>]*)>/g)) if (verdadero(atributo(c[1], "hidden"))) {
        const a = Number(atributo(c[1], "min")), b = Number(atributo(c[1], "max"));
        if (Number.isInteger(a) && Number.isInteger(b) && a >= 1 && b >= a) for (let k = a; k <= Math.min(b, MAX_COLUMNAS_HOJA + 6); k++) cols.add(k - 1);
      }
      out.filasOcultas.set(nombre, filas); out.columnasOcultas.set(nombre, cols);
    }
  } catch { /* sin poder leer la estructura, nada se da por oculto */ }
  return out;
}

/* Las filas candidatas de UNA hoja con el rótulo en la columna `j`: rótulo que nombra
   un hito y, en la celda de al lado (j + 1), un valor. Se recorren en el orden de la hoja,
   sin las filas ocultas. Un rótulo o un valor más largo que su tope no es una fila: se descarta. */
function filasDeColumna(hoja, j, letra, filasOcultas) {
  const out = [];
  const filas = hoja.filas.slice(0, MAX_FILAS_HOJA);
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    if (!f || filasOcultas.has(i + 1) || !nombraHito(f[j])) continue;
    const r = cabe(f[j], MAX_ROTULO), v = valorDeCelda(f[j + 1]);
    if (r == null || v == null) continue;
    out.push({ r, v, c: `${letra(j + 1)}${i + 1}` });
  }
  return out;
}

/** Lee un .xlsx/.xlsm (Buffer) y devuelve:
    { ok:false, motivo }                                   no es un libro legible
    { ok:true, publicable:false, motivo, hoja, n_hojas, filas:[] }   se leyó pero no se da por leído: ninguna fecha
    { ok:true, publicable:true, motivo:null, hoja, n_hojas, filas:[{r, v, c}], fechas_n } */
async function leerCronogramaExcel(buf) {
  const { esZip } = require("./docx.js");
  const { inflador } = require("./formulario_excel.js");
  const base = { version: VERSION_LECTOR };
  if (!esZip(buf)) return { ...base, ok: false, motivo: "no es un libro de Excel .xlsx (puede ser un .xls antiguo o un archivo protegido)" };
  const bytes = new Uint8Array(buf);
  let libro;
  try { libro = await XL.leerLibro(bytes, { inflar: inflador() }); }
  catch (e) { return { ...base, ok: false, motivo: `no se pudo abrir el libro: ${String((e && e.message) || e).slice(0, 160)}` }; }
  const nHojas = libro.hojas.length;
  const sin = (motivo, hoja = null) => ({ ...base, ok: true, publicable: false, motivo, hoja, n_hojas: nHojas, filas: [] });
  const est = await estructura(bytes, inflador());
  if (est.fecha1904) return sin("el libro usa el sistema de fechas de 1904 (Excel de Mac): sus fechas no se pueden leer sin adivinar");
  const letra = require("../public/xlsx.js").letraColumna;   // diferido: el escritor de libros solo hace falta para nombrar la celda
  /* cada hoja VISIBLE y cada columna de rótulos con su fecha al lado (las dos visibles) es una candidata */
  const candidatas = [];
  for (const hoja of libro.hojas) {
    if (est.ocultas.has(hoja.nombre)) continue;
    const filasOcultas = est.filasOcultas.get(hoja.nombre) || new Set(), colsOcultas = est.columnasOcultas.get(hoja.nombre) || new Set();
    const ancho = Math.min(MAX_COLUMNAS_HOJA, hoja.filas.reduce((m, f) => Math.max(m, f ? f.length : 0), 0));
    for (let j = 0; j + 1 < ancho; j++) {
      if (colsOcultas.has(j) || colsOcultas.has(j + 1)) continue;
      const filas = filasDeColumna(hoja, j, letra, filasOcultas).slice(0, MAX_FILAS);
      if (!filas.length) continue;
      const nombre = limpio(hoja.nombre);
      const hitos = hitosDeFilas(filas, nombre.slice(0, MAX_HOJA)).hitos;
      candidatas.push({ hoja: nombre, hojaObj: hoja, j, filas, hitos, colsOcultas });
    }
  }
  if (!candidatas.length) return sin("ninguna hoja trae las actividades del cronograma con su fecha al lado");
  const mejor = candidatas.reduce((m, c) => (c.hitos.length > m.hitos.length ? c : m));
  if (mejor.hoja.length > MAX_HOJA) return sin("el nombre de la hoja pasa de los 31 caracteres que admite Excel: no se sabe de qué hoja salen las fechas");
  /* DOS CRONOGRAMAS EN EL MISMO LIBRO que dicen fechas distintas («Cronograma inicial» y «Cronograma Adenda 1»): no se adivina
     cuál rige (revisión adversaria, reproducido: ganaba la primera hoja). Si dicen lo mismo, da igual cuál se cite. */
  for (const c of candidatas) {
    if (c === mejor || c.hitos.length < MIN_HITOS) continue;
    const fechaDe = new Map(c.hitos.map((x) => [x.id, x.fecha]));
    const choca = mejor.hitos.find((x) => fechaDe.has(x.id) && fechaDe.get(x.id) !== x.fecha);
    if (choca) return sin(`el libro trae más de un cronograma con fechas distintas (hojas «${mejor.hoja}» y «${c.hoja}», «${Cron.HITO_POR_ID[choca.id].corta}»): no se adivina cuál rige`, mejor.hoja);
  }
  /* FECHAS EN MÁS DE UNA COLUMNA («Fecha inicio | Fecha fin», «Fecha | Fecha ajustada por la adenda 1»): la de al lado no tiene por
     qué ser la que rige (revisión adversaria, reproducido: el cierre salía el del inicio, 12 días antes). Si en dos o más filas de
     actividades OTRA columna visible cercana también trae una fecha, no se adivina. */
  const filasDe = mejor.filas.map((f) => Number(String(f.c).replace(/^[A-Z]+/, "")));
  for (let k = Math.max(0, mejor.j - 3); k <= mejor.j + 5; k++) {
    if (k === mejor.j || k === mejor.j + 1 || mejor.colsOcultas.has(k)) continue;
    const conFecha = filasDe.filter((n) => { const f = mejor.hojaObj.filas[n - 1]; return f && traeFecha(f[k]); }).length;
    if (conFecha >= 2) return sin(`trae fechas en más de una columna (la ${letra(mejor.j + 1)} y la ${letra(k)}): puede ser la fecha original y la de una adenda, o el inicio y el fin; no se adivina cuál rige`, mejor.hoja);
  }
  const p = puerta(mejor.filas, mejor.hoja);
  if (!p.publicable) return sin(p.motivo, mejor.hoja);
  return { ...base, ok: true, publicable: true, motivo: null, hoja: mejor.hoja, n_hojas: nHojas, filas: mejor.filas, fechas_n: p.hitos.length };
}

module.exports = { leerCronogramaExcel, puerta, hitosDeFilas, valorDeCelda, nombraHito, VERSION_LECTOR, MIN_HITOS, MAX_FILAS, MAX_ROTULO, MAX_VALOR, MAX_HOJA, SERIE_MIN, SERIE_MAX };
