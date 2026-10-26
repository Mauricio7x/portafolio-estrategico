/* lib/tabla_experiencia.js · LA TABLA DE EXPERIENCIA QUE PUBLICA EL PLIEGO TIPO (27-sep-2026)
   ─────────────────────────────────────────────────────────────────────────────
   Los pliegos tipo de obra no fijan la experiencia con una cifra en salarios
   mínimos en una línea: la fijan con una TABLA del numeral «Relación de los
   contratos frente al presupuesto oficial» (3.5.7, 3.5.8 o 3.5.9 según el pliego):

       Número de contratos con los   Valor mínimo a certificar
       cuales el Proponente cumple   (como % del Presupuesto Oficial de obra
       la experiencia acreditada     expresado en SMMLV)
       De 1 hasta 2                  75%
       De 3 hasta 4                  120%
       Hasta 5                       150%

   Medido en los tres pliegos completos del dueño abiertos el 27-sep-2026
   (CO1.REQ.11039338 pág. 37, CO1.REQ.10968059 pág. 55, CO1.REQ.11066532 pág. 43):
   los tres la traen igual. El lector de cifras no la veía (no hay «N SMMLV» en
   ninguna línea) y el bloque «¿Puede presentarse?» decía «no se leyó».

   Es la MISMA regla que `lib/reparto.proporcionExigida` aplica sin pliego leído;
   leída, pasa de supuesto a dato publicado con su página, y si un pliego trae
   otros porcentajes mandan los suyos.

   Solo lee; no juzga ni convierte a salarios (eso lo hace quien tiene el
   presupuesto: lib/documentos_proceso con lib/reparto.experienciaSola). Ante la
   duda, null: una tabla a medio leer no se completa con la del pliego tipo.
   Función PURA: solo requiere ./paginas.js (hoja del grafo). */
"use strict";

const ANCLA_RE = /valor\s+m[ií]nimo\s+a\s+certificar/i;
// una fila: «De 1 hasta 2 75%», «1 a 2 75 %», o la última «Hasta 5 150%» / «5 o más 150%»
const FILA_RE = /(?:\bde\s+)?\b(\d{1,2})\s+(?:hasta|a)\s+(\d{1,2})\s+(\d{2,3}(?:[.,]\d+)?)\s*%|\b(?:hasta|desde|m[aá]s\s+de)\s+(\d{1,2})\s+(?:contratos?\s+)?(\d{2,3}(?:[.,]\d+)?)\s*%|\b(\d{1,2})\s+(?:contratos?\s+)?o\s+m[aá]s\s+(\d{2,3}(?:[.,]\d+)?)\s*%/gi;
// la primera fila tiene que estar cerca del encabezado: más lejos es otra cosa
const MAX_HASTA_PRIMERA = 400;
const MAX_FILAS = 5;
const pctDe = (s) => Number(String(s).replace(",", "."));
/* LA TABLA PARTIDA POR EL SALTO DE PÁGINA (25-oct-2026, Fase 0 de detekta-lector). En Manizales (CO1.REQ.10287523, menor cuantía) y Teruel
   (CO1.REQ.11165702, licitación) la tabla sigue en la página siguiente: entre «De 3 hasta 4 120%» y «Hasta 5 150%» van el pie y la cabecera
   de la página del documento tipo («Código CCE-EICP-GI-02 Página 43 de 78 Versión 6», «DOCUMENTO BASE», el título) y el ENCABEZADO de la tabla
   repetido, y la regla «entre dos filas no puede haber texto» la cortaba en «De 3 hasta 4»; `validar` la tiraba por acabar cerrada, así que
   la casilla quedaba «sin dato» con la tabla entera en el pliego. Lo que hay entre dos filas se admite SOLO si cada palabra es del membrete
   del documento tipo o del encabezado de la tabla; una palabra de prosa («deberá», «formato») sigue cortando la tabla. Cualquier otra regla
   —aceptar «cualquier texto corto»— habría leído un «120 %» con cinco contratos donde el pliego pide 150 % (revisión adversaria del 27-sep). */
const PALABRAS_MEMBRETE = new Set(("numero contratos con los cuales el proponente cumple la experiencia acreditada valor minimo a certificar como del "
  + "presupuesto oficial de obra expresado en smmlv codigo version pagina no documento base pliego condiciones licitacion seleccion abreviada "
  + "menor cuantia infraestructura transporte publica cce eicp gi fm idi").split(/\s+/));
function esMembreteOEncabezado(entre) {
  const palabras = String(entre || "").normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().split(/[^a-z0-9%]+/).filter(Boolean);
  return palabras.every((p) => PALABRAS_MEMBRETE.has(p) || p === "%" || /^\d{1,3}$/.test(p) || /^v\d$/.test(p));
}
// más allá de la primera fila la ventana admite el membrete de una página entera entre dos filas
const LARGO_VENTANA = MAX_HASTA_PRIMERA + 700;

/** La tabla de experiencia de un texto con marcadores de página, o null.
    {tramos: [{desde, hasta, pct}], pagina, cita}; la última fila vale también
    para los contratos adicionales (Mipyme, empresas de mujeres) que el pliego suma a ella. */
function leerTablaExperiencia(texto) {
  const { lineasConPagina } = require("./paginas.js");
  const lineas = lineasConPagina(texto).map((x) => ({ linea: String(x.linea).replace(/[ \t ]+/g, " ").trim(), pagina: x.pagina })).filter((x) => x.linea);
  // el texto seguido, sabiendo dónde empieza cada línea (para la página y la cita)
  let junto = "";
  const inicio = [];
  for (const l of lineas) { inicio.push(junto.length); junto += `${l.linea} `; }
  const lineaEn = (pos) => { let i = 0; while (i + 1 < inicio.length && inicio[i + 1] <= pos) i++; return i; };
  for (const a of junto.matchAll(new RegExp(ANCLA_RE.source, "gi"))) {
    const desdeAncla = a.index + a[0].length;
    const ventana = junto.slice(desdeAncla, desdeAncla + LARGO_VENTANA);
    const filas = [];
    let fin = -1;
    const re = new RegExp(FILA_RE.source, "gi");
    let m;
    while ((m = re.exec(ventana))) {
      /* «Página 56 Hasta 5 150%»: el número de página pegado a la última fila casaba como «56 hasta 5 150%» (una fila al revés) y
         tumbaba la tabla entera; una fila con el «hasta» menor que el «desde» no es una fila: se vuelve a buscar desde el carácter siguiente */
      if (m[1] != null && Number(m[1]) > Number(m[2])) {
        /* …pero solo si lo que queda tras quitarle el número de página ES la fila «Hasta N»: «De 4 hasta 3 120%» (un OCR que giró
           la fila) o «4 a 3 120 %» no se saltan, cortan la tabla, porque saltarlos dejaba leer «De 1 hasta 2 · De 2 hasta 3 · Hasta 5»
           con la fila del 120 % perdida y el 150 % en su sitio (revisión adversaria del 25-oct-2026) */
        const re2 = new RegExp(FILA_RE.source, "gi");
        re2.lastIndex = m.index + 1;
        const m2 = re2.exec(ventana);
        if (!/^de\s/i.test(m[0]) && m2 && m2[4] != null && m2.index < m.index + m[0].length) { re.lastIndex = m.index + 1; continue; }
        break;
      }
      if (!filas.length && m.index > MAX_HASTA_PRIMERA) break;
      // entre dos filas no puede haber PROSA: la tabla se acaba en la primera; el membrete de la página y el encabezado repetido no son prosa
      if (filas.length && ventana.slice(fin, m.index).trim() && !esMembreteOEncabezado(ventana.slice(fin, m.index))) break;
      if (m[1] != null) filas.push({ desde: Number(m[1]), hasta: Number(m[2]), pct: pctDe(m[3]), pos: m.index });
      else if (m[4] != null) filas.push({ desde: null, hasta: Number(m[4]), pct: pctDe(m[5]), pos: m.index, ultima: true });
      else filas.push({ desde: Number(m[6]), hasta: null, pct: pctDe(m[7]), pos: m.index, ultima: true });
      fin = m.index + m[0].length;
      if (filas[filas.length - 1].ultima || filas.length >= MAX_FILAS) break;
    }
    const tramos = validar(filas);
    const encabezado = filas.length ? ventana.slice(0, filas[0].pos) : "";
    /* el encabezado dice contra qué se mide (el presupuesto oficial) y no trae porcentajes:
       un «75%» ANTES de la primera fila es la columna girada por el extractor, y leerla
       daría cada porcentaje a la fila siguiente (revisión adversaria, 27-sep-2026) */
    if (!tramos || !/presupuesto/i.test(encabezado) || /\d\s*%/.test(encabezado)) continue;
    const primera = lineas[lineaEn(desdeAncla + filas[0].pos)];
    const ultima = lineas[lineaEn(desdeAncla + filas[filas.length - 1].pos)];
    // la cita es una línea LITERAL del documento (la de la primera fila), no un pegado de varias
    return { tramos, pagina: primera.pagina == null ? null : primera.pagina, pagina_hasta: ultima.pagina == null ? null : ultima.pagina, cita: primera.linea.slice(0, 200) };
  }
  return null;
}

/* contiguas desde 1, porcentajes crecientes y plausibles, al menos dos filas, y la
   última ABIERTA («Hasta 5», «5 o más»): una tabla que acaba en «De 3 hasta 4» es una
   tabla cortada (un salto de página, «Hasta cinco (5)», un OCR con «15O%»), y leerla
   exigiría el 120 % con cinco contratos donde el pliego pide 150 % (revisión adversaria).
   La fila «Hasta 5» empieza donde acabó la anterior. */
function validar(filas) {
  if (filas.length < 2 || !filas[filas.length - 1].ultima) return null;
  const tramos = [];
  for (let i = 0; i < filas.length; i++) {
    const f = filas[i];
    const desde = f.desde != null ? f.desde : i > 0 ? tramos[i - 1].hasta + 1 : 1;
    const hasta = f.hasta;
    if (!Number.isInteger(desde) || (hasta != null && (!Number.isInteger(hasta) || hasta < desde))) return null;
    if (i === 0 && desde !== 1) return null;
    if (i > 0 && (tramos[i - 1].hasta == null || desde !== tramos[i - 1].hasta + 1 || f.pct <= tramos[i - 1].pct)) return null;
    if (!(f.pct >= 10 && f.pct <= 500)) return null;
    tramos.push({ desde, hasta, pct: f.pct });
  }
  return tramos;
}

/** La proporción del presupuesto que exige la tabla con `n` contratos (la última fila
    vale para los que pasen de ella). */
function proporcionDeTabla(tramos, n) {
  if (!Array.isArray(tramos) || !tramos.length || !(n >= 1)) return null;
  const t = tramos.find((x) => n >= x.desde && (x.hasta == null || n <= x.hasta)) || (n > tramos[tramos.length - 1].desde ? tramos[tramos.length - 1] : null);
  return t ? t.pct / 100 : null;
}

/* ── EL TIPO DE OBRA QUE PIDE LA EXPERIENCIA (27-sep-2026) ──────────────────────
   La tabla dice CUÁNTO; el numeral «Características de los contratos presentados para
   acreditar la experiencia exigida» dice DE QUÉ: la general («CONSTRUCCIÓN O
   RECONSTRUCCIÓN … DE VÍAS URBANAS») y la específica («Por lo menos uno (1) de los
   contratos … debe acreditar la intervención de la estructura de pavimento»). No es una
   cifra que la aplicación pueda comparar —su registro no dice qué obra tuvo cada
   contrato—: se COPIA literal, con su página, para que el dueño la confirme sin abrir el
   PDF. Medido en los tres pliegos del dueño, tres formas: «GENERAL: …» / «ESPECÍFICA: …»
   (CO1.REQ.11039338), «Experiencia Especifica: …» con varias actividades (10968059) y
   «II. EXPERIENCIA ESPECIFICA:» en prosa (11066532, que dejó sin llenar el «(F%)» de la
   plantilla: se copia tal cual, no se completa). Ante la duda, null. */
const CABECERA_CARACTERISTICAS_RE = /caracter[ií]sticas\s+de\s+los\s+contratos\s+presentados/i;
const ETIQUETA_RE = /^(?:[ivx]+\.|[a-h]\.)?\s*(?:experiencia\s+)?(general|espec[ií]fica)\s*:\s*(.*)$/i;
// dónde se acaba un párrafo: otra etiqueta, una nota, un literal o un numeral nuevo
const CORTE_RE = /^(?:(?:[ivx]+\.|[a-h]\.)?\s*(?:experiencia\s+)?(?:general|espec[ií]fica)\s*:|actividad\s+(?:principal|secundaria)|nota\s*\d*\s*:|[a-h]\.\s|[ivx]+\.\s|\d+(?:\.\d+)+\.?\s)/i;
const MAX_CONDICION = 600;
const MAX_LINEAS_CONDICION = 12;
const plegar = (x) => String(x).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\d+/g, "#").replace(/\s+/g, " ").trim();

/** {general, especifica, mas_actividades} con {texto, pagina, recortado} cada una, o null. */
function leerCondicionExperiencia(texto) {
  const { lineasConPagina } = require("./paginas.js");
  const lineas = lineasConPagina(texto).map((x) => ({ linea: String(x.linea).replace(/[ \t ]+/g, " ").trim(), pagina: x.pagina })).filter((x) => x.linea);
  // encabezados y pies: la misma línea (con los números plegados) en tres páginas o más
  const paginasDe = new Map();
  for (const l of lineas) { const k = plegar(l.linea); if (!paginasDe.has(k)) paginasDe.set(k, new Set()); paginasDe.get(k).add(l.pagina); }
  const ruido = (l) => l.pagina != null && paginasDe.get(plegar(l.linea)).size >= 3;
  /* la cabecera del CUERPO, no la del índice (que lleva puntos o el número de página al final):
     la última aparición que no sea una línea de índice */
  let inicio = -1;
  for (let i = 0; i < lineas.length; i++) if (CABECERA_CARACTERISTICAS_RE.test(lineas[i].linea) && !/\.{4,}|\s\d{1,3}$/.test(lineas[i].linea)) inicio = i;
  if (inicio < 0) return null;
  const fin = Math.min(lineas.length, inicio + 200);
  const halladas = { general: null, especifica: null };
  let especificas = 0;
  for (let i = inicio + 1; i < fin; i++) {
    if (ruido(lineas[i])) continue;
    // el numeral siguiente cierra la sección
    if (/^\d+(?:\.\d+){1,3}\.?\s+\S/.test(lineas[i].linea) && i > inicio + 1) break;
    const m = ETIQUETA_RE.exec(lineas[i].linea);
    if (!m) continue;
    const cual = /^general/i.test(m[1]) ? "general" : "especifica";
    if (cual === "especifica") especificas++;
    if (halladas[cual]) continue;
    const partes = m[2] ? [m[2]] : [];
    let recortado = false, n = 0;
    for (let j = i + 1; j < fin && n < MAX_LINEAS_CONDICION; j++) {
      if (ruido(lineas[j])) continue;
      if (CORTE_RE.test(lineas[j].linea)) break;
      partes.push(lineas[j].linea); n++;
      if (partes.join(" ").length >= MAX_CONDICION) { recortado = true; break; }
    }
    let t = partes.join(" ").replace(/\s+/g, " ").trim();
    if (t.length > MAX_CONDICION) { t = t.slice(0, MAX_CONDICION).replace(/\s+\S*$/, ""); recortado = true; }
    // sin texto propio (una etiqueta sola, un encabezado de tabla) no hay condición que copiar
    if (t.length < 20) continue;
    halladas[cual] = { texto: t, pagina: lineas[i].pagina == null ? null : lineas[i].pagina, recortado };
  }
  if (!halladas.general && !halladas.especifica) return null;
  return { ...halladas, mas_actividades: especificas > 1 };
}

module.exports = { leerTablaExperiencia, proporcionDeTabla, leerCondicionExperiencia };
