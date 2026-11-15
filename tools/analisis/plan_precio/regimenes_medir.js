"use strict";
/* ============================================================================
   Plan precio · ¿En qué parte de los procesos de obra el precio compite de verdad? (14-nov-2026)
   ----------------------------------------------------------------------------
   Solo MIDE, fuera de la aplicación. Por modalidad: qué parte de los procesos adjudicados recibió
   una oferta, una o dos, de 3 a 9 y 10 o más, y a cuánto se adjudicó (% del presupuesto) en cada caso.
   Usa la misma carpeta de datos que invitados_medir.js (la consulta está en su cabecera) y la función
   REAL `modalidadDe` de lib/filtros_lista (devuelve «abreviada» para la menor cuantía).

     node tools/analisis/plan_precio/regimenes_medir.js <carpeta> [AAAA-MM-DD] [desde=2025-11-01]

   Control: en menor cuantía debe dar cerca del 50,9 % con una oferta y 67,8 % con una o dos que midió
   docs/PLAN_X20.md el 11-nov-2026 (p6dx-8zbt se reemplaza entero en cada carga: parecidas, no idénticas).
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..", "..");
const { modalidadDe } = require(path.join(RAIZ, "lib", "filtros_lista.js"));

const numero = (v) => { if (v == null || v === "") return null; const x = Number(v); return Number.isFinite(x) ? x : null; };
const mediana = (v) => { if (!v.length) return null; const a = v.slice().sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);

function main() {
  const dir = process.argv[2];
  if (!dir) { console.error("uso: node tools/analisis/plan_precio/regimenes_medir.js <carpeta> [AAAA-MM-DD] [desde]"); process.exit(1); }
  const fecha = process.argv[3] || new Date().toISOString().slice(0, 10);
  const desde = process.argv[4] || "2025-11-01";
  const porId = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => /^obra_\d+\.json$/.test(x))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
      if (String(r.adjudicado).toLowerCase() !== "si" || !r.id_del_portafolio) continue;
      const n = numero(r.respuestas_al_procedimiento);
      if (n == null || n < 1 || !r.fecha_de_recepcion_de || r.fecha_de_recepcion_de < desde) continue;
      const pb = numero(r.precio_base), va = numero(r.valor_total_adjudicacion);
      const pct = pb != null && pb > 0 && va != null && va > 0 ? (va * 100) / pb : null;
      const ant = porId.get(r.id_del_portafolio);
      /* El piso: 70 % del presupuesto en todas las modalidades menos en mínima cuantía, donde ese piso deja
         fuera adjudicaciones reales (8,2 %, medido en minima_medir.js) y se usa 30 %, como allí. */
      const m = modalidadDe(r), piso = m === "minima" ? 30 : 70;
      if (!ant || n > ant.n) porId.set(r.id_del_portafolio, { m, n, pct: pct != null && pct >= piso && pct <= 100.0001 ? pct : null });
    }
  }
  const grupos = {};
  for (const p of porId.values()) (grupos[p.m] || (grupos[p.m] = [])).push(p);
  const salida = { que_es: "Obra adjudicada por modalidad: reparto por número de ofertas y precio de adjudicación en % del presupuesto oficial (entre 70 % y 100 %; en mínima cuantía, entre 30 % y 100 %).", consulta: fecha, fuente: "datos.gov.co · p6dx-8zbt", recepcion_desde: desde, por_modalidad: {} };
  for (const [m, v] of Object.entries(grupos).sort((a, b) => b[1].length - a[1].length)) {
    const parte = (f) => r2((v.filter(f).length * 100) / v.length);
    const adj = (f) => { const x = v.filter((p) => f(p) && p.pct != null).map((p) => p.pct); return { procesos: x.length, mediana: r2(mediana(x)) }; };
    salida.por_modalidad[m] = {
      procesos: v.length,
      una_oferta_pct: parte((p) => p.n === 1), una_o_dos_pct: parte((p) => p.n <= 2), de_3_a_9_pct: parte((p) => p.n >= 3 && p.n <= 9), diez_o_mas_pct: parte((p) => p.n >= 10),
      adjudicado_con_una_o_dos: adj((p) => p.n <= 2), adjudicado_con_tres_o_mas: adj((p) => p.n >= 3),
    };
  }
  const destino = path.join(__dirname, `resultados_regimenes_${fecha}.json`);
  fs.writeFileSync(destino, JSON.stringify(salida, null, 1) + "\n");
  console.log("modalidad · procesos · 1 oferta % · 1-2 % · 3-9 % · 10+ % · adjudicado (mediana) con 1-2 · con 3+");
  for (const [m, x] of Object.entries(salida.por_modalidad)) console.log(m.padEnd(11), String(x.procesos).padStart(5), String(x.una_oferta_pct).padStart(7), String(x.una_o_dos_pct).padStart(7), String(x.de_3_a_9_pct).padStart(7), String(x.diez_o_mas_pct).padStart(7), "  ", x.adjudicado_con_una_o_dos.mediana, x.adjudicado_con_tres_o_mas.mediana);
  console.log("escrito:", destino);
}
main();
