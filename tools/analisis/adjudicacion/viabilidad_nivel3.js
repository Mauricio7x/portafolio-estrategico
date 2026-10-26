"use strict";
/* Probabilidad de adjudicación · NIVEL 3: ¿publica cada proceso el documento que dice quién quedó hábil?
   (26-oct-2026). Solo LEE datos abiertos.
   Uso:  node tools/analisis/adjudicacion/viabilidad_nivel3.js <carpeta_de_la_base> <salida.json> [por_modalidad=100] [año=2026]
   Toma una muestra con semilla fija (cifras.azar) de los procesos «usables» (fase0.usableMotor) adjudicados
   en el año dado, pide su índice de archivos a dmgg-8hin («SECOP II - Archivos Descarga Historico 2026») y
   clasifica cada archivo con `clasificarArchivo` (lib/documentos_proceso), la misma regla de la aplicación.
   Cuenta qué procesos traen un informe de evaluación, una resolución de adjudicación o un acta, y cuáles
   de esos son legibles. Una consulta que falla deja el proceso «sin_medir», jamás «sin documentos». */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { crearCliente, escSoQL } = require("../../../lib/socrata");
const Docs = require("../../../lib/documentos_proceso");
const { azar } = require("../../../scripts/base_obra/cifras");
const { usableMotor } = require("./fase0");

const SEMILLA = 20261026;
const log = (m) => process.stderr.write(m + "\n");

/* Qué papel cumple el archivo para el Nivel 3. El tipo lo pone el clasificador de la aplicación; los dos
   únicos añadidos son dentro de sus tipos: la resolución que ADJUDICA y el acta de cierre, audiencia o evaluación. */
function papel(a) {
  const n = Docs.nombrePlegado(a.nombre || "");
  if (a.tipo === "informe_evaluacion") return "informe_evaluacion";
  if (a.tipo === "resolucion" && /adjudic/.test(n)) return "resolucion_adjudicacion";
  if (/\bacta\b/.test(n) && /(cierre|audiencia|adjudic|evaluac|apertura)/.test(n)) return "acta";
  if (/(habilitant|ponderab|verificacion de requisitos)/.test(n)) return "habilitantes_o_ponderables";
  return null;
}

function muestra(usables, k, semilla) {
  const r = azar(semilla), a = usables.slice().sort((x, y) => x.portafolio.localeCompare(y.portafolio));
  for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; }
  return a.slice(0, k);
}

async function main() {
  const [dir, salida, kTxt, anoTxt] = process.argv.slice(2);
  if (!dir || !salida) { log("uso: node tools/analisis/adjudicacion/viabilidad_nivel3.js <carpeta_de_la_base> <salida.json> [por_modalidad=100] [año=2026]"); process.exit(2); }
  const k = Number(kTxt) || 100, ano = anoTxt || "2026";
  const base = zlib.gunzipSync(fs.readFileSync(path.join(dir, "base.jsonl.gz"))).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const C = crearCliente({ baseUrl: "https://www.datos.gov.co/resource/dmgg-8hin.json", log });
  const R = { generado: new Date().toISOString(), fuente: "dmgg-8hin", semilla: SEMILLA, ano_adjudicacion: ano, por_modalidad: {} };
  for (const m of ["licitacion", "menor_cuantia"]) {
    const us = base.filter((x) => x.modalidad === m && usableMotor(x) && String(x.fecha_adjudicacion || "").startsWith(ano));
    const sel = muestra(us, k, SEMILLA);
    const c = { universo: us.length, muestra: sel.length, sin_medir: 0, con_indice: 0, archivos: 0, con_alguno: 0, con_alguno_legible: 0,
      por_papel: { informe_evaluacion: 0, resolucion_adjudicacion: 0, acta: 0, habilitantes_o_ponderables: 0 }, ejemplos: [] };
    for (const x of sel) {
      let filas;
      try { filas = await C.pedir({ $select: "id_documento,nombre_archivo,tamanno_archivo,extensi_n,fecha_carga", $where: `proceso='${escSoQL(x.portafolio)}'`, $limit: 2000 }, "dmgg", { plazoMs: 60000 }); }
      catch (e) { c.sin_medir++; continue; }
      if (filas.length) c.con_indice++;
      c.archivos += filas.length;
      const arch = filas.map((f) => Docs.clasificarArchivo(f, { cierre: String(x.fecha_cierre || "").slice(0, 10) || null }));
      const papeles = new Set(), legibles = new Set();
      for (const a of arch) { const p = papel(a); if (!p) continue; papeles.add(p); if (a.legible) legibles.add(p);
        if (c.ejemplos.length < 8 && !c.ejemplos.some((e) => e.papel === p)) c.ejemplos.push({ portafolio: x.portafolio, papel: p, nombre: a.nombre, extension: a.extension }); }
      for (const p of papeles) c.por_papel[p]++;
      if (papeles.size) c.con_alguno++;
      if (legibles.size) c.con_alguno_legible++;
    }
    R.por_modalidad[m] = c;
    log(`${m}: ${c.con_alguno} de ${c.muestra} con algún documento de evaluación o adjudicación`);
  }
  fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  log(`listo: ${salida}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.stack || e.message}`); process.exit(1); });
module.exports = { papel, muestra, SEMILLA };
