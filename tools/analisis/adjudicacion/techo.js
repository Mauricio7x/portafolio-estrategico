"use strict";
/* Probabilidad de adjudicación · el TECHO de cualquier motor con datos abiertos (26-oct-2026). Solo MIDE.
   Uso:  node tools/analisis/adjudicacion/techo.js <carpeta_de_la_base> <salida.json>
   Lee base.jsonl.gz (scripts/base_obra/base.js) y, en la población de la Fase 1 (`usableMotor` de
   fase0.js), cuenta por modalidad y año en cuántos procesos la oferta del ganador real queda primera
   —sola o empatada— con ALGUNO de los 4 métodos (`metodos.primeros`, con el puntaje máximo de
   `metodos.PUNTAJE_MAXIMO`, como cifras.js). Ningún motor que elija método y TRM puede acertar más que
   eso si las ofertas hábiles son las publicadas: es una cota superior, no un acierto. Dos escenarios:
   todas las válidas, y sin la oferta más baja que NO es la del ganador (la sensibilidad a un rechazo).
   B0 = la oferta del ganador es la más baja. Sin red, sin azar. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const M = require("../../../scripts/base_obra/metodos");
const { usableMotor } = require("./fase0");

const MODS = ["licitacion", "menor_cuantia"];
const ANOS = ["2020", "2021", "2022", "2023", "2024", "2025", "2026"];
const pct = (a, b) => (b > 0 ? Math.round((1000 * a) / b) / 10 : null);

/* ¿La oferta i queda primera (sola o empatada) con algún método? */
function algunMetodo(valores, i, max) {
  return M.METODOS.some((m) => { const g = M.primeros(valores, m, max); return !!g && g.includes(i); });
}
/* Las válidas sin la más baja que no es la del ganador, y el nuevo índice del ganador (null si no quedan 3). */
function sinLaMasBaja(valores, ig) {
  const otras = valores.map((q, i) => [q, i]).filter(([, i]) => i !== ig).sort((p, q) => p[0] - q[0]);
  if (otras.length < 2) return null;
  const quitar = otras[0][1];
  return { valores: valores.filter((_, i) => i !== quitar), ig: ig > quitar ? ig - 1 : ig };
}

function techoDeProceso(x) {
  const v = x.ofertas_validas.map((o) => o.pct);
  const ig = v.findIndex((q) => Math.abs(q - x.oferta_ganadora.pct) < 1e-12);
  if (ig < 0) return null;
  const max = M.PUNTAJE_MAXIMO[x.modalidad] || 1;
  const r = { techo: algunMetodo(v, ig, max), b0: v[ig] === Math.min(...v), sin_baja: null, b0_sin_baja: null };
  const s = sinLaMasBaja(v, ig);
  if (s) { r.sin_baja = algunMetodo(s.valores, s.ig, max); r.b0_sin_baja = s.valores[s.ig] === Math.min(...s.valores); }
  return r;
}

function techo(base) {
  const celda = () => ({ procesos: 0, techo: 0, b0: 0, con_escenario_2: 0, techo_sin_baja: 0, b0_sin_baja: 0 });
  const T = {};
  for (const m of MODS) { T[m] = { total: celda() }; for (const a of ANOS) T[m][a] = celda(); }
  for (const x of base) {
    if (!MODS.includes(x.modalidad) || !usableMotor(x)) continue;
    const r = techoDeProceso(x); if (!r) continue;
    const a = String(x.fecha_adjudicacion || "").slice(0, 4);
    for (const c of [T[x.modalidad].total, ...(ANOS.includes(a) ? [T[x.modalidad][a]] : [])]) {
      c.procesos++; if (r.techo) c.techo++; if (r.b0) c.b0++;
      if (r.sin_baja !== null) { c.con_escenario_2++; if (r.sin_baja) c.techo_sin_baja++; if (r.b0_sin_baja) c.b0_sin_baja++; }
    }
  }
  for (const m of MODS) for (const c of Object.values(T[m])) c.pct = { techo: pct(c.techo, c.procesos), b0: pct(c.b0, c.procesos),
    techo_sin_baja: pct(c.techo_sin_baja, c.con_escenario_2), b0_sin_baja: pct(c.b0_sin_baja, c.con_escenario_2) };
  return T;
}

function main() {
  const [dir, salida] = process.argv.slice(2);
  if (!dir || !salida) { process.stderr.write("uso: node tools/analisis/adjudicacion/techo.js <carpeta_de_la_base> <salida.json>\n"); process.exit(2); }
  const base = zlib.gunzipSync(fs.readFileSync(path.join(dir, "base.jsonl.gz"))).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const R = { generado: new Date().toISOString(), definicion: "Cota superior: la oferta del ganador queda primera (sola o empatada) con algún método, sobre la población usableMotor de fase0.js. Escenario 2: sin la oferta más baja que no es la del ganador.", techo: techo(base) };
  fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  process.stderr.write(`listo: ${salida}\n`);
}

if (require.main === module) main();
module.exports = { techo, techoDeProceso, algunMetodo, sinLaMasBaja };
