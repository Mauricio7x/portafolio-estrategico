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
    const ventana = junto.slice(desdeAncla, desdeAncla + MAX_HASTA_PRIMERA + 200);
    const filas = [];
    let fin = -1;
    for (const m of ventana.matchAll(FILA_RE)) {
      if (!filas.length && m.index > MAX_HASTA_PRIMERA) break;
      // entre dos filas no puede haber texto: la tabla se acaba en la primera prosa
      if (filas.length && ventana.slice(fin, m.index).trim()) break;
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

module.exports = { leerTablaExperiencia, proporcionDeTabla };
