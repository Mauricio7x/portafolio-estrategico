"use strict";
/* Base nacional de obra · cuántas ofertas GANARON a cada precio (28-oct-2026). Solo MIDE.
   Uso:  node scripts/base_obra/frecuencia_precio.js <carpeta_de_la_base> [salida.json]
         (lee base.jsonl.gz de scripts/base_obra/base.js; escribe data/frecuencia_precio.json)

   Por qué existe: el dueño pidió «el % de adjudicación según el precio que presente». Medido el
   28-oct-2026 (docs/MEMORIA.md, sección del mismo día): en licitación y en menor cuantía, el precio
   como % del presupuesto, solo, no predice quién gana mejor que el azar («1 de cada N oferentes»),
   aprendiendo con 2020-2025 y probando en 2026. Esta tabla es ese hecho, contado: por modalidad,
   por cuántos oferentes tuvo el proceso y por franja de 2 puntos del presupuesto, cuántas ofertas
   hubo, cuántas ganaron y cuántas habrían ganado si todas tuvieran la misma opción (la suma de
   1/n). La aplicación la lee (lib/frecuencia_precio) para decir el hecho junto al precio; no la
   convierte en una curva ni en una probabilidad.

   Población: la de la prueba del motor (`usableMotor` de tools/analisis/adjudicacion/fase0: 3 o
   más ofertas válidas, ganador emparejado, competencia de precio, sin inconsistencia), solo
   licitación y menor cuantía. La regla se LLAMA, no se copia. Sin red y sin azar: la misma base
   da la misma tabla, y la huella del archivo de entrada viaja dentro. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const crypto = require("crypto");
const { usableMotor } = require("../../tools/analisis/adjudicacion/fase0");

const FORMATO = 1;
const MODALIDADES = ["licitacion", "menor_cuantia"];
const FRANJA_PP = 2;
const PCT_MIN = 50, PCT_MAX = 110;            // fuera de esto la oferta se cuenta en la franja del borde
const ANO_PRUEBA = "2026";                    // la verificación aprende con los años anteriores
const ENCOGER_K = 20;                         // la tabla de la verificación se encoge hacia 1/n con este peso

/* El tramo de oferentes: los mismos cortes del resto de la aplicación para «cuántos compiten». */
const grupoDe = (n) => (n <= 4 ? "3-4" : n <= 9 ? "5-9" : "10+");
const GRUPOS = Object.freeze(["3-4", "5-9", "10+"]);
/* La franja: el piso par en puntos porcentuales (0,951 → 94, que es «del 94 al 96 %»). */
function franjaDe(pct) {
  const p = Math.min(Math.max(100 * pct, PCT_MIN), PCT_MAX - 1e-9);
  return Math.floor(p / FRANJA_PP) * FRANJA_PP;
}

/* Cada oferta válida de cada proceso utilizable: su precio en % del presupuesto, si ganó y su 1/n. */
function ofertasDe(base) {
  const out = [];
  for (const x of base) {
    if (!MODALIDADES.includes(x.modalidad) || !usableMotor(x)) continue;
    const v = x.ofertas_validas.map((o) => o.pct);
    const ig = v.findIndex((q) => Math.abs(q - x.oferta_ganadora.pct) < 1e-12);
    if (ig < 0) continue;                       // la ganadora no se encuentra entre las válidas: no se adivina
    const ano = String(x.fecha_adjudicacion || "").slice(0, 4);
    if (!/^\d{4}$/.test(ano)) continue;
    v.forEach((pct, i) => out.push({ mod: x.modalidad, ano, n: v.length, pct, gano: i === ig ? 1 : 0, proceso: x.portafolio }));
  }
  return out;
}

function celdaVacia() { return { ofertas: 0, ganaron: 0, azar: 0 }; }
function sumar(c, o) { c.ofertas++; c.ganaron += o.gano; c.azar += 1 / o.n; }

/* La tabla: modalidad → tramo de oferentes («*» = todos) → franja → {ofertas, ganaron, azar}. */
function tabla(ofertas) {
  const t = {};
  for (const m of MODALIDADES) { t[m] = { "*": {} }; for (const g of GRUPOS) t[m][g] = {}; }
  for (const o of ofertas) {
    const f = franjaDe(o.pct);
    for (const g of [grupoDe(o.n), "*"]) { const c = t[o.mod][g][f] || (t[o.mod][g][f] = celdaVacia()); sumar(c, o); }
  }
  for (const m of MODALIDADES) for (const g of Object.keys(t[m])) for (const c of Object.values(t[m][g])) c.azar = +c.azar.toFixed(3);
  return t;
}

/* LA VERIFICACIÓN, fuera de muestra: la tabla aprendida con los años anteriores a 2026 (encogida hacia
   1/n con peso ENCOGER_K) frente a «1 de cada N», en las ofertas de 2026. Brier por oferta; la mejora
   negativa quiere decir que la tabla predice PEOR que el azar. */
function verificar(ofertas) {
  const entrena = ofertas.filter((o) => o.ano < ANO_PRUEBA), prueba = ofertas.filter((o) => o.ano === ANO_PRUEBA);
  const t = tabla(entrena);
  const out = {};
  for (const m of MODALIDADES) {
    const P = prueba.filter((o) => o.mod === m);
    let s = 0, s0 = 0;
    for (const o of P) {
      const c = t[m][grupoDe(o.n)][franjaDe(o.pct)];
      const azar = 1 / o.n;
      const p = c ? (c.ganaron + ENCOGER_K * azar) / (c.ofertas + ENCOGER_K) : azar;
      s += (p - o.gano) ** 2; s0 += (azar - o.gano) ** 2;
    }
    out[m] = P.length ? {
      ofertas_prueba: P.length, procesos_prueba: new Set(P.map((o) => o.proceso)).size,
      brier_tabla: +(s / P.length).toFixed(5), brier_azar: +(s0 / P.length).toFixed(5),
      mejora_pct: +(100 * (s0 - s) / s0).toFixed(1),
    } : null;
  }
  return { aprende: `hasta ${Number(ANO_PRUEBA) - 1}`, prueba: ANO_PRUEBA, encoger_k: ENCOGER_K, por_modalidad: out };
}

function construir(base, { huella = null, generado = new Date().toISOString().slice(0, 10) } = {}) {
  const ofertas = ofertasDe(base);
  const anos = ofertas.map((o) => o.ano).sort();
  const resumen = {};
  for (const m of MODALIDADES) {
    const om = ofertas.filter((o) => o.mod === m);
    /* en cuántos procesos ganó la oferta MÁS BAJA (28-oct-2026): el hecho con el que la guía de Mis procesos dice
       «no tire el precio al piso», en vez de un mecanismo que, medido, predice peor que el azar */
    const porProceso = new Map();
    for (const o of om) { if (!porProceso.has(o.proceso)) porProceso.set(o.proceso, []); porProceso.get(o.proceso).push(o); }
    let ganoLaMasBaja = 0;
    for (const ofs of porProceso.values()) {
      const min = Math.min(...ofs.map((o) => o.pct));
      if (ofs.some((o) => o.gano && Math.abs(o.pct - min) < 1e-12)) ganoLaMasBaja++;
    }
    resumen[m] = { procesos: porProceso.size, ofertas: om.length, gano_la_mas_baja: ganoLaMasBaja };
  }
  return {
    formato: FORMATO, generado, base_sha256: huella,
    fuente: "Base nacional de obra (scripts/base_obra), ofertas oferente por oferente de SECOP II (datos abiertos wi7w-2nvm y b28v-edj8) cruzadas con el proceso (p6dx-8zbt).",
    poblacion: "Licitaciones y menores cuantías de obra adjudicadas con 3 o más ofertas válidas, ganador emparejado y competencia de precio (usableMotor de tools/analisis/adjudicacion/fase0).",
    periodo: anos.length ? { desde: anos[0], hasta: anos[anos.length - 1] } : null,
    franja_pp: FRANJA_PP, grupos: GRUPOS,
    resumen, verificacion: verificar(ofertas), celdas: tabla(ofertas),
  };
}

module.exports = { FORMATO, MODALIDADES, FRANJA_PP, GRUPOS, grupoDe, franjaDe, ofertasDe, tabla, verificar, construir };

if (require.main === module) {
  const [carpeta, salida = path.join(__dirname, "..", "..", "data", "frecuencia_precio.json")] = process.argv.slice(2);
  if (!carpeta) { console.error("Uso: node scripts/base_obra/frecuencia_precio.js <carpeta_de_la_base> [salida.json]"); process.exit(2); }
  const archivo = path.join(carpeta, "base.jsonl.gz");
  const crudo = fs.readFileSync(archivo);
  const base = zlib.gunzipSync(crudo).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const r = construir(base, { huella: crypto.createHash("sha256").update(crudo).digest("hex") });
  fs.writeFileSync(salida, JSON.stringify(r) + "\n");
  console.log(JSON.stringify({ salida, periodo: r.periodo, resumen: r.resumen, verificacion: r.verificacion.por_modalidad }));
}
