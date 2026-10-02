/* research/muestra/metricas_piloto.js · Las cifras del PC1, contadas y no escritas a mano
   ----------------------------------------------------------------------------
   Entrada: research/muestra/piloto_flujos.json (las salidas de los flujos del
   piloto, copiadas tal cual) y las fichas de research/fichas/. Salida: un JSON
   con fichas por hora, documentos por tipo, tasa de error al verificar (con su
   intervalo de Wilson al 95 %), cobertura de las listas cerradas, saturación y
   tokens. Cada cifra dice su base.

   Uso: node research/muestra/metricas_piloto.js > research/muestra/metricas_piloto.json */
"use strict";
const fs = require("fs");
const path = require("path");

const R = path.join(__dirname, "..");
const flujos = JSON.parse(fs.readFileSync(path.join(__dirname, "piloto_flujos.json"), "utf8"));
const fichas = fs.readdirSync(path.join(R, "fichas")).filter((f) => f.endsWith(".json"))
  .map((f) => JSON.parse(fs.readFileSync(path.join(R, "fichas", f), "utf8")));

const minutos = (a, b) => (Date.parse(b) - Date.parse(a)) / 60000;
const wilson = (k, n, z = 1.96) => {
  if (!n) return null;
  const p = k / n, d = 1 + z * z / n;
  const c = (p + z * z / (2 * n)) / d, m = (z * Math.sqrt(p * (1 - p) / n + z * z / (4 * n * n))) / d;
  return { tasa: +(p * 100).toFixed(1), ic95: [+(Math.max(0, c - m) * 100).toFixed(1), +(Math.min(1, c + m) * 100).toFixed(1)], k, n };
};

const porAgente = [];
const veredictos = [];
const extraMin = flujos.minutos_extra || {};
for (const r of flujos.resultados.filter(Boolean)) {
  const l = r.lectura;
  if (!l) { porAgente.push({ clave: r.clave, sin_resultado: true }); continue; }
  const min = minutos(l.inicio, l.fin) + (extraMin[r.clave] || 0);
  const ids = (l.fichas || []);
  const enDisco = ids.filter((id) => fichas.some((f) => f.id === id)).length;
  const docs = new Set((l.documentos_abiertos || []).map((d) => d.url));
  porAgente.push({
    clave: r.clave, minutos: +min.toFixed(1), fichas_reportadas: ids.length, fichas_en_disco: enDisco,
    fichas_por_hora: min > 0 ? +(enDisco / (min / 60)).toFixed(1) : null,
    documentos_abiertos: docs.size, fallidas: (l.fallidas || []).length,
    verificador_minutos: r.verificacion ? +minutos(r.verificacion.inicio, r.verificacion.fin).toFixed(1) : null,
  });
  for (const v of (r.verificacion && r.verificacion.veredictos) || []) veredictos.push({ ...v, clave: r.clave });
}

const comprobables = veredictos.filter((v) => v.veredicto !== "no_comprobable");
const errores = comprobables.filter((v) => v.veredicto !== "correcta");
const porVeredicto = {};
for (const v of veredictos) porVeredicto[v.veredicto] = (porVeredicto[v.veredicto] || 0) + 1;
const errorPorLote = {};
for (const v of comprobables) { const e = (errorPorLote[v.clave] ||= { k: 0, n: 0 }); e.n++; if (v.veredicto !== "correcta") e.k++; }

const tipos = {}, autoridad = {}, naturaleza = {}, ejes = {};
for (const f of fichas) {
  tipos[f.tipo] = (tipos[f.tipo] || 0) + 1;
  autoridad[f.nivel_autoridad] = (autoridad[f.nivel_autoridad] || 0) + 1;
  naturaleza[f.naturaleza] = (naturaleza[f.naturaleza] || 0) + 1;
  ejes[f.eje] = (ejes[f.eje] || 0) + 1;
}
const docsPorTipo = {};
const vistos = new Set();
for (const f of fichas) { const k = f.url; if (vistos.has(k)) continue; vistos.add(k); docsPorTipo[f.tipo] = (docsPorTipo[f.tipo] || 0) + 1; }

const cobertura = {};
for (const r of flujos.resultados.filter(Boolean)) for (const c of (r.lectura && r.lectura.cobertura) || []) {
  const prev = cobertura[c.item];
  if (!prev || (prev !== "ficha" && c.estado === "ficha")) cobertura[c.item] = c.estado;
}
const resumenCob = {};
for (const e of Object.values(cobertura)) resumenCob[e] = (resumenCob[e] || 0) + 1;

const saturacion = {};
for (const r of flujos.resultados.filter(Boolean)) {
  const s = (r.lectura && r.lectura.secuencia_fuentes) || [];
  if (!s.length) continue;
  const ultimas10 = s.slice(-10);
  saturacion[r.clave] = { fuentes: s.length, nuevas: s.filter((x) => x.problema_nuevo).length, nuevas_en_las_10_ultimas: ultimas10.filter((x) => x.problema_nuevo).length, tipos_en_las_10_ultimas: new Set(ultimas10.map((x) => x.tipo)).size };
}

const totalMin = porAgente.reduce((a, x) => a + (x.minutos || 0) + (x.verificador_minutos || 0), 0);
const salida = {
  fichas_en_disco: fichas.length,
  documentos_distintos: vistos.size,
  documentos_por_tipo: docsPorTipo,
  fichas_por_tipo: tipos, fichas_por_autoridad: autoridad, fichas_por_naturaleza: naturaleza, fichas_por_eje: ejes,
  por_agente: porAgente,
  minutos_agente_totales: +totalMin.toFixed(1),
  fichas_por_hora_agente_global: totalMin ? +(fichas.length / (totalMin / 60)).toFixed(1) : null,
  verificacion: { veredictos: veredictos.length, por_veredicto: porVeredicto, error_sobre_comprobables: wilson(errores.length, comprobables.length), error_por_lote: Object.fromEntries(Object.entries(errorPorLote).map(([k, e]) => [k, wilson(e.k, e.n)])) },
  cobertura_listas: { por_item: cobertura, resumen: resumenCob },
  saturacion,
  tokens_salida: flujos.tokens || null,
};
process.stdout.write(JSON.stringify(salida, null, 2) + "\n");
