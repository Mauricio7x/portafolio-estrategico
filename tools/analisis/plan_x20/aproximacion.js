"use strict";
/* ============================================================================
   Plan x20 · ¿Qué tan cerca se anticipa el precio al que se adjudica, por modalidad? (12-nov-2026)
   ----------------------------------------------------------------------------
   Pregunta del dueño: «¿hay posibilidad de mejorar los % de aproximación al precio que debería Helder ofertar por
   modalidad?». Solo MIDE, fuera de la aplicación. El blanco es el precio GANADOR en % del presupuesto oficial
   (valor adjudicado ÷ precio_base), que es lo único que los datos abiertos publican de todos los procesos.

     node tools/analisis/plan_x20/aproximacion.js <carpeta con obra_*.json> [AAAA-MM-DD]

   (Los obra_*.json los baja la consulta escrita en la cabecera de poblacion.js.)

   Aprende con lo recibido antes de 2026 y prueba con 2026; el historial de cada entidad se actualiza con cada
   proceso de prueba DESPUÉS de anunciarlo (como medir.js). Compara referencias:
     nacional        la mediana de la modalidad en el país
     tamano          la mediana de la modalidad y el tramo de presupuesto
     entidad         la mediana de la entidad en la modalidad con 5 o más adjudicados (si no, la de tamaño): es lo que
                     hoy enseña Detekta («los que ganaron aquí bajaron cerca de X %», lib/indice_baja)
     competencia     la mediana de la modalidad y el tramo EN LA CLASE de competencia que el historial anuncia
                     (una o dos ofertas si el anuncio de lib/competencia_por_tamano es ≥ 0,5; tres o más si no)
     entidad_comp    la de la entidad en esa misma clase (5 o más), si no, la de competencia
     oraculo         la mediana de la clase REAL de ofertas (1, 2, 3-4, 5-9, 10+): no se conoce antes; es el techo
   Métrica: error absoluto en puntos del presupuesto (media y mediana) y parte de procesos a ±1 y ±2 puntos.
   Usa las funciones REALES de la aplicación: modalidadDe, tramoTamano y anunciarPoca.
   ============================================================================ */
const fs = require("fs");
const path = require("path");
const RAIZ = path.join(__dirname, "..", "..", "..");
const CT = require(path.join(RAIZ, "lib", "competencia_por_tamano.js"));
const { modalidadDe } = require(path.join(RAIZ, "lib", "filtros_lista.js"));

const CORTE = "2026-01-01";
const MIN_ENTIDAD = 5;
const mediana = (v) => { if (!v.length) return null; const a = v.slice().sort((x, y) => x - y), n = a.length; return n % 2 ? a[(n - 1) / 2] : (a[n / 2 - 1] + a[n / 2]) / 2; };
const r2 = (x) => (x == null ? null : Math.round(x * 100) / 100);
const clase = (n) => (n === 1 ? "1" : n === 2 ? "2" : n <= 4 ? "3-4" : n <= 9 ? "5-9" : "10+");
const meter = (o, k, x) => { (o[k] || (o[k] = [])).push(x); };

function filas(dir) {
  const porId = new Map();
  for (const f of fs.readdirSync(dir).filter((x) => /^obra_\d+\.json$/.test(x))) {
    for (const r of JSON.parse(fs.readFileSync(path.join(dir, f), "utf8"))) {
      if (String(r.adjudicado).toLowerCase() !== "si" || !r.id_del_portafolio) continue;
      const n = parseInt(r.respuestas_al_procedimiento, 10), pb = Number(r.precio_base), va = Number(r.valor_total_adjudicacion);
      if (!(n >= 1) || !(pb > 0) || !(va > 0)) continue;
      const pct = (va * 100) / pb;
      if (pct < 70 || pct > 100.0001) continue;   // otro presupuesto (borrador, lote) o un dato raro: fuera, como medir.js
      const x = { id: r.id_del_portafolio, ent: r.nit_entidad, dep: String(r.departamento_entidad || "").toUpperCase(), mod: modalidadDe(r), t: CT.tramoTamano(pb), n, pct, f: r.fecha_de_recepcion_de || "" };
      const ant = porId.get(x.id);
      if (!ant || x.n > ant.n) porId.set(x.id, x);
    }
  }
  return [...porId.values()].filter((x) => x.f && x.t != null).sort((a, b) => (a.f < b.f ? -1 : a.f > b.f ? 1 : 0));
}

function medir(F, mod) {
  const D = F.filter((x) => x.mod === mod), A = D.filter((x) => x.f < CORTE), P = D.filter((x) => x.f >= CORTE);
  const nac = mediana(A.map((x) => x.pct));
  const porTam = {}, porTamClase = {}, porTamComp = {}, cuentas = { tot: [0, 0], tam: {}, dep: {}, ent: {}, entT: {} };
  const sumar = (o, k, x) => { const c = o[k] || (o[k] = [0, 0]); c[0]++; if (x.n <= 2) c[1]++; };
  for (const x of A) {
    meter(porTam, x.t, x.pct); meter(porTamClase, `${x.t}|${clase(x.n)}`, x.pct); meter(porTamComp, `${x.t}|${x.n <= 2 ? "poca" : "mucha"}`, x.pct);
    cuentas.tot[0]++; if (x.n <= 2) cuentas.tot[1]++;
    sumar(cuentas.tam, x.t, x); sumar(cuentas.dep, `${x.dep}|${x.t}`, x); sumar(cuentas.ent, x.ent, x); sumar(cuentas.entT, `${x.ent}|${x.t}`, x);
  }
  const ent = {}, entComp = {};
  for (const x of A) { meter(ent, x.ent, x.pct); meter(entComp, `${x.ent}|${x.n <= 2 ? "poca" : "mucha"}`, x.pct); }
  const med = (o, k) => (o[k] && o[k].length ? mediana(o[k]) : null);
  const err = { nacional: [], tamano: [], entidad: [], competencia: [], entidad_comp: [], oraculo: [] };
  for (const x of P) {
    const tam = med(porTam, x.t) ?? nac;
    const a = CT.anunciarPoca({ modalidad: cuentas.tot, tamano: cuentas.tam[x.t], depto: cuentas.dep[`${x.dep}|${x.t}`], entidad: cuentas.ent[x.ent], entidadTam: cuentas.entT[`${x.ent}|${x.t}`] });
    const claseAnunciada = a && a.entidad != null && a.entidad >= 0.5 ? "poca" : "mucha";
    const comp = med(porTamComp, `${x.t}|${claseAnunciada}`) ?? tam;
    const e = ent[x.ent] && ent[x.ent].length >= MIN_ENTIDAD ? mediana(ent[x.ent]) : tam;
    const ec = entComp[`${x.ent}|${claseAnunciada}`] && entComp[`${x.ent}|${claseAnunciada}`].length >= MIN_ENTIDAD ? mediana(entComp[`${x.ent}|${claseAnunciada}`]) : comp;
    const orac = med(porTamClase, `${x.t}|${clase(x.n)}`) ?? tam;
    for (const [k, v] of Object.entries({ nacional: nac, tamano: tam, entidad: e, competencia: comp, entidad_comp: ec, oraculo: orac })) err[k].push({ e: Math.abs(v - x.pct), poca: claseAnunciada === "poca", nReal: x.n });
    // el historial de la entidad aprende de este proceso DESPUÉS de anunciarlo
    meter(ent, x.ent, x.pct); meter(entComp, `${x.ent}|${x.n <= 2 ? "poca" : "mucha"}`, x.pct);
    sumar(cuentas.ent, x.ent, x); sumar(cuentas.entT, `${x.ent}|${x.t}`, x);
  }
  const resumen = (v) => (v.length ? { procesos: v.length, error_medio: r2(v.reduce((s, y) => s + y.e, 0) / v.length), error_mediano: r2(mediana(v.map((y) => y.e))),
    a_1_punto_pct: r2((100 * v.filter((y) => y.e <= 1).length) / v.length), a_2_puntos_pct: r2((100 * v.filter((y) => y.e <= 2).length) / v.length) } : null);
  return {
    aprende: A.length, prueba: P.length,
    todas: Object.fromEntries(Object.entries(err).map(([k, v]) => [k, resumen(v)])),
    // donde de verdad llegaron 3 o más ofertas: ahí el precio decide
    con_3_o_mas_ofertas: Object.fromEntries(Object.entries(err).map(([k, v]) => [k, resumen(v.filter((y) => y.nReal >= 3))])),
  };
}

if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) { console.error("uso: node tools/analisis/plan_x20/aproximacion.js <carpeta> [AAAA-MM-DD]"); process.exit(2); }
  const F = filas(dir);
  const R = { consulta: process.argv[3] || null, procesos: F.length, corte_prueba: CORTE, min_entidad: MIN_ENTIDAD, por_modalidad: {} };
  for (const m of ["abreviada", "minima", "licitacion", "especial"]) R.por_modalidad[m] = medir(F, m);
  console.log(JSON.stringify(R, null, 1));
}
module.exports = { filas, medir, clase };
