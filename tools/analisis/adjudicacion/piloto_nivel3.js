"use strict";
/* Probabilidad de adjudicación · NIVEL 3: la lista de la PRUEBA de 30 procesos (26-oct-2026). Solo LEE datos abiertos.
   Uso:  node tools/analisis/adjudicacion/piloto_nivel3.js <carpeta_de_la_base> <salida.json> [por_modalidad=15] [año=2026]
   De los procesos «usables» (fase0.usableMotor) adjudicados en el año, toma una muestra con la semilla y la
   función de viabilidad_nivel3.js (`muestra`, `papel`: llamadas, no copiadas), pide su índice de archivos a
   dmgg-8hin y elige UN documento por proceso para leer a mano: el informe de evaluación; si no hay, la
   resolución de adjudicación; si no, el acta. Un proceso sin ninguno se salta y entra el siguiente de la
   muestra (se cuenta). NO descarga nada de SECOP II: desde las sesiones responde 200 y después 403 del
   «Azure WAF» (26-oct-2026), y eso no se sortea. Una consulta que falla deja el proceso «sin_medir». */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { crearCliente, escSoQL } = require("../../../lib/socrata");
const Docs = require("../../../lib/documentos_proceso");
const { usableMotor } = require("./fase0");
const { muestra, papel, SEMILLA } = require("./viabilidad_nivel3");

const PRIORIDAD = ["informe_evaluacion", "resolucion_adjudicacion", "acta"];
const log = (m) => process.stderr.write(m + "\n");

/* El documento que se lee primero: por papel en el orden de PRIORIDAD; dentro del mismo papel, el último que la
   entidad cargó (un informe definitivo reemplaza al preliminar). Solo legibles (PDF u hoja). */
function elegirDocumento(archivos) {
  for (const p of PRIORIDAD) {
    const c = archivos.filter((a) => papel(a) === p && a.legible).sort((x, y) => String(y.fecha_carga || "").localeCompare(String(x.fecha_carga || "")));
    if (c.length) return { papel: p, ...c[0], otros_del_mismo_papel: c.length - 1 };
  }
  return null;
}

async function main() {
  const [dir, salida, kTxt, anoTxt] = process.argv.slice(2);
  if (!dir || !salida) { log("uso: node tools/analisis/adjudicacion/piloto_nivel3.js <carpeta_de_la_base> <salida.json> [por_modalidad=15] [año=2026]"); process.exit(2); }
  const k = Number(kTxt) || 15, ano = anoTxt || "2026";
  const base = zlib.gunzipSync(fs.readFileSync(path.join(dir, "base.jsonl.gz"))).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const C = crearCliente({ baseUrl: "https://www.datos.gov.co/resource/dmgg-8hin.json", log });
  const R = { generado: new Date().toISOString(), fuente: "dmgg-8hin", semilla: SEMILLA, ano_adjudicacion: ano, prioridad: PRIORIDAD, procesos: [], resumen: {} };
  for (const m of ["licitacion", "menor_cuantia"]) {
    const us = base.filter((x) => x.modalidad === m && usableMotor(x) && String(x.fecha_adjudicacion || "").startsWith(ano));
    const orden = muestra(us, us.length, SEMILLA);   // la muestra entera en su orden fijo; se toma hasta completar k
    const r = { universo: us.length, elegidos: 0, saltados_sin_documento: 0, sin_medir: 0, por_papel: {} };
    for (const x of orden) {
      if (r.elegidos >= k) break;
      let filas;
      try { filas = await C.pedir({ $select: "id_documento,nombre_archivo,tamanno_archivo,extensi_n,fecha_carga,url_descarga_documento", $where: `proceso='${escSoQL(x.portafolio)}'`, $limit: 2000 }, "dmgg", { plazoMs: 60000 }); }
      catch (e) { r.sin_medir++; continue; }
      const doc = elegirDocumento(filas.map((f) => Docs.clasificarArchivo(f, { cierre: String(x.fecha_cierre || "").slice(0, 10) || null })));
      if (!doc) { r.saltados_sin_documento++; continue; }
      r.elegidos++; r.por_papel[doc.papel] = (r.por_papel[doc.papel] || 0) + 1;
      R.procesos.push({ n: R.procesos.length + 1, modalidad: m, portafolio: x.portafolio, id_proceso: x.id_proceso, entidad: x.entidad,
        departamento: x.departamento_entidad, precio_base: x.precio_base, valor_adjudicado: x.valor_adjudicado, ofertas_validas: x.n_validas,
        fecha_adjudicacion: String(x.fecha_adjudicacion || "").slice(0, 10),
        documento: { papel: doc.papel, nombre: doc.nombre, extension: doc.extension, bytes: doc.bytes, fecha_carga: doc.fecha_carga, url: doc.url, otros_del_mismo_papel: doc.otros_del_mismo_papel } });
    }
    R.resumen[m] = r;
    log(`${m}: ${r.elegidos} elegidos, ${r.saltados_sin_documento} saltados sin documento, ${r.sin_medir} sin medir`);
  }
  fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  log(`listo: ${salida}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.stack || e.message}`); process.exit(1); });
module.exports = { elegirDocumento, PRIORIDAD };
