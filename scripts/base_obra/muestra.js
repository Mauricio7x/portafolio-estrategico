"use strict";
/* Base nacional de obra · FASE 3: muestra de validación (17-oct-2026). Solo MIDE.
   Uso:  node scripts/base_obra/muestra.js <carpeta> [n=30] [semilla=20261017]
   Toma n procesos USABLES al azar (semilla fija y declarada), repartidos por modalidad en
   proporción a su tamaño (mayor resto), y cruza cada uno con su contrato en jbjy-vk9h:
   ¿el contratista es el ganador?, ¿el valor del contrato es el adjudicado? OJO: jbjy, p6dx y
   wi7w son exportaciones del MISMO SECOP II (el contrato hereda proveedor y valor de la
   adjudicación): esto mide COHERENCIA INTERNA y que la base lea bien, no que los datos sean
   ciertos (revisión adversaria, 17-oct-2026). El censo de todos los procesos lo hace base.js
   (`censo_contrato` en resumen_base.json). La página pública de SECOP no se puede revisar desde la sesión: responde
   «HTTP 403» y, con agente de navegador, redirige a un reCAPTCHA (medido el 17-oct-2026), que no
   se sortea. Escribe muestra.json en la carpeta. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const L = require("./limpieza");
const { azar } = require("./cifras");

/* Selección PURA: n procesos sin repetir, por modalidad en proporción (resto al más grande). */
function seleccionar(filas, n, semilla) {
  const grupos = new Map();
  for (const x of filas) { if (!grupos.has(x.modalidad)) grupos.set(x.modalidad, []); grupos.get(x.modalidad).push(x); }
  const mods = [...grupos.keys()].sort();
  const total = filas.length;
  const cupo = new Map(mods.map((m) => [m, Math.floor((n * grupos.get(m).length) / total)]));
  let falta = n - [...cupo.values()].reduce((s, v) => s + v, 0);
  // el sobrante va por MAYOR RESTO (con 50/26/24 y n=10: 5/3/2, no 6/2/2)
  const resto = (m) => (n * grupos.get(m).length) / total - Math.floor((n * grupos.get(m).length) / total);
  for (const m of mods.slice().sort((a, b) => resto(b) - resto(a) || grupos.get(b).length - grupos.get(a).length)) { if (falta <= 0) break; cupo.set(m, cupo.get(m) + 1); falta--; }
  const r = azar(semilla), out = [];
  for (const m of mods) {
    const g = grupos.get(m).slice().sort((a, b) => (a.portafolio < b.portafolio ? -1 : 1));   // orden estable antes de barajar
    for (let i = g.length - 1; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [g[i], g[j]] = [g[j], g[i]]; }
    out.push(...g.slice(0, Math.min(cupo.get(m), g.length)));
  }
  return out;
}

/* Comparación PURA de un proceso de la base con su contrato de jbjy (o null si no hay). */
function compararConContrato(x, c) {
  if (!c) return { contrato: false };
  const valor = L.numeroONull(c.valor_del_contrato);
  const nitC = L.nitValido(c.documento_proveedor), nitG = x.ganador_nit;
  const mismoGanador = nitC && nitG ? nitC === nitG
    : (c.proveedor_adjudicado && x.ganador ? L.nombreComparable(c.proveedor_adjudicado) === L.nombreComparable(x.ganador) : null);
  return {
    contrato: true,
    mismo_ganador: mismoGanador,
    valor_contrato: valor,
    valor_igual_adjudicado: valor === null || x.valor_adjudicado === null ? null : Math.abs(valor - x.valor_adjudicado) <= 1,
    diferencia_valor_pct: valor === null || !x.valor_adjudicado ? null : +(100 * (valor - x.valor_adjudicado) / x.valor_adjudicado).toFixed(2),
  };
}

/* Una fila de la muestra (PURA). Con jbjy caído (`error`), «sin medir» y contratos null. */
function filaDeMuestra(x, cs, error) {
  return { portafolio: x.portafolio, modalidad: x.modalidad, competencia: x.competencia, departamento: x.departamento_ejecucion || x.departamento_entidad,
      precio_base: x.precio_base, n_validas: x.n_validas, respuestas_publicadas: x.respuestas_publicadas, fraccion_adjudicada: x.pct_adjudicado,
      con_piso: L.competencia(x.n_validas) === "real", ganador_identificado: !!x.ganador_id, oferta_ganadora_hallada: !!x.oferta_ganadora,
      inconsistencia: x.inconsistencia, senales: x.senales,
      // jbjy caído: «sin medir», jamás «0 contratos»
      contratos_en_jbjy: error ? null : cs.length, ...(error ? { contrato: "sin_medir" } : compararConContrato(x, cs[0] || null)) };
}

async function main() {
  const dir = process.argv[2];
  const n = Number(process.argv[3] || 30), semilla = Number(process.argv[4] || 20261017);
  if (!dir) { process.stderr.write("uso: node scripts/base_obra/muestra.js <carpeta> [n] [semilla]\n"); process.exit(2); }
  const base = zlib.gunzipSync(fs.readFileSync(path.join(dir, "base.jsonl.gz"))).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const muestra = seleccionar(base.filter((x) => x.competencia), n, semilla);
  const { crearCliente, escSoQL } = require("../../lib/socrata");
  const C = crearCliente({ baseUrl: "https://www.datos.gov.co/resource/jbjy-vk9h.json", log: (m) => process.stderr.write(m + "\n") });
  let contratos = [], error = null;
  try {
    contratos = await C.pedir({ $select: "proceso_de_compra,id_contrato,proveedor_adjudicado,documento_proveedor,valor_del_contrato,departamento,ciudad,direcci_n_de_ejecuci_n_del_contrato,estado_contrato",
      $where: `proceso_de_compra in (${muestra.map((x) => `'${escSoQL(x.portafolio)}'`).join(",")})`, $limit: 1000 }, "jbjy muestra");
  } catch (e) { error = { status: e.status || null, error: e.detalle || e.message }; }
  const porProceso = new Map();
  for (const c of contratos) { if (!porProceso.has(c.proceso_de_compra)) porProceso.set(c.proceso_de_compra, []); porProceso.get(c.proceso_de_compra).push(c); }
  const filas = muestra.map((x) => filaDeMuestra(x, porProceso.get(x.portafolio) || [], error));
  fs.writeFileSync(path.join(dir, "muestra.json"), JSON.stringify({ semilla, n, generado: new Date().toISOString(), error_jbjy: error, filas }, null, 1));
  process.stderr.write(`listo: ${path.join(dir, "muestra.json")}\n`);
}

if (require.main === module) main().catch((e) => { process.stderr.write(`FALLO: ${e.detalle || e.message}\n`); process.exit(1); });
module.exports = { seleccionar, compararConContrato, filaDeMuestra };
