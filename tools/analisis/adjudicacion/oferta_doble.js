"use strict";
/* Probabilidad de adjudicación · ¿«lote por ofertas» o una oferta registrada dos veces? (26-oct-2026). Solo LEE.
   Uso:  node tools/analisis/adjudicacion/oferta_doble.js <carpeta_de_la_base> <salida.json>
   Toma los procesos que la base apartó como `lote_por_ofertas` (un oferente con 2+ valores válidos),
   vuelve a pedir sus ofertas a wi7w-2nvm y b28v-edj8 agrupadas CON `identificador_de_la_oferta`, y mide:
   cuántos oferentes tienen dos valores por proceso, si cada valor trae su propio identificador (dos
   ofertas registradas) o el mismo (un valor ambiguo), y, cuando uno de los dos valores es lo adjudicado,
   si la adjudicada fue la oferta MÁS NUEVA (identificador CO1.RPL mayor) o la más vieja. Resultado del
   26-oct-2026 (`tools/analisis/oferta_doble_2026-10-26.json`): el orden no dice cuál vale (23 frente a 29), y
   la revisión adversaria mostró que el identificador propio por valor NO separa una oferta doble de un lote
   (en los lotes reales cada valor también trae el suyo). Lo que sostiene la regla de limpieza.js son los
   contratos de jbjy (un solo contrato en 500 de 513 procesos liberados). Una consulta que falla deja sus
   procesos «sin_medir». */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { crearCliente, escSoQL } = require("../../../lib/socrata");
const L = require("../../../scripts/base_obra/limpieza");

const DS = ["wi7w-2nvm", "b28v-edj8"];
const GRUPO = "id_del_proceso_de_compra,identificador_de_la_oferta,nit_del_proveedor,c_digo_proveedor,nombre_proveedor,valor_de_la_oferta";
const log = (m) => process.stderr.write(m + "\n");
const numRpl = (s) => { const m = /(\d+)\s*$/.exec(String(s || "")); return m ? Number(m[1]) : null; };

async function main() {
  const [dir, salida] = process.argv.slice(2);
  if (!dir || !salida) { log("uso: node tools/analisis/adjudicacion/oferta_doble.js <carpeta_de_la_base> <salida.json>"); process.exit(2); }
  const base = zlib.gunzipSync(fs.readFileSync(path.join(dir, "base.jsonl.gz"))).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
  const objetivo = base.filter((x) => x.excluido === "lote_por_ofertas" && (x.modalidad === "licitacion" || x.modalidad === "menor_cuantia"));
  const porId = new Map(objetivo.map((x) => [x.portafolio, x]));
  const grupos = new Map(); const sinMedir = new Set();
  for (const ds of DS) {
    const C = crearCliente({ baseUrl: `https://www.datos.gov.co/resource/${ds}.json`, log });
    const ids = [...porId.keys()];
    for (let i = 0; i < ids.length; i += 20) {
      const lote = ids.slice(i, i + 20);
      try {
        const r = await C.pedir({ $select: `${GRUPO},count(*) AS n`, $where: `id_del_proceso_de_compra in (${lote.map((x) => `'${escSoQL(x)}'`).join(",")})`, $group: GRUPO, $limit: 50000 }, `${ds} ${lote.length} ids`, { plazoMs: 120000 });
        for (const o of r) { const k = o.id_del_proceso_de_compra; if (!grupos.has(k)) grupos.set(k, []); grupos.get(k).push({ ...o, _ds: ds }); }
      } catch (e) { for (const id of lote) sinMedir.add(id); log(`SIN MEDIR ${ds} ${lote.length} ids: ${e.detalle || e.message}`); }
    }
  }
  const R = { generado: new Date().toISOString(), procesos: objetivo.length, sin_medir: sinMedir.size, por_proceso: { un_oferente_doble: 0, dos_o_mas_oferentes_dobles: 0, sin_doble_al_releer: 0 },
    oferentes_dobles: 0, con_dos_identificadores: 0, mismo_identificador_dos_valores: 0,
    ganador_doble: { casos: 0, adjudicada_la_mas_nueva: 0, adjudicada_la_mas_vieja: 0, no_se_puede_ordenar: 0 }, distancia_entre_valores_pct: [], ejemplos: [] };
  for (const [id, x] of porId) {
    if (sinMedir.has(id)) continue;
    const os = grupos.get(id) || [];
    const prov = L.proveedoresUnidos(os);
    const porProv = new Map();   // proveedor → Map(valor → Set(identificadores))
    for (const o of os) {
      const v = L.numeroONull(o.valor_de_la_oferta); const p = prov(o);
      if (v === null || v <= 0 || !p || /confidencial/i.test(String(o.nombre_proveedor || ""))) continue;
      if (x.precio_base > 0 && (v > x.precio_base + 1 || v < 0.5 * x.precio_base)) continue;   // el mismo rango de las válidas (con la tolerancia nueva)
      if (!porProv.has(p)) porProv.set(p, new Map());
      const m = porProv.get(p); if (!m.has(v)) m.set(v, new Set()); m.get(v).add(String(o.identificador_de_la_oferta || ""));
    }
    const dobles = [...porProv.entries()].filter(([, m]) => m.size > 1);
    if (!dobles.length) { R.por_proceso.sin_doble_al_releer++; continue; }
    const parte = dobles.length / porProv.size;   // qué parte de los oferentes trae dos valores: en un lote no declarado, casi todos
    const cubeta = parte >= 0.5 ? "la_mitad_o_mas" : parte >= 0.25 ? "entre_un_cuarto_y_la_mitad" : "menos_de_un_cuarto";
    const kk = dobles.length === 1 ? "uno" : "dos_o_mas"; R.parte_doble = R.parte_doble || {}; R.parte_doble[kk] = R.parte_doble[kk] || {}; R.parte_doble[kk][cubeta] = (R.parte_doble[kk][cubeta] || 0) + 1;
    if (dobles.length === 1) R.por_proceso.un_oferente_doble++; else R.por_proceso.dos_o_mas_oferentes_dobles++;
    for (const [p, m] of dobles) {
      R.oferentes_dobles++;
      const pares = [...m.entries()].map(([v, ids]) => ({ v, ids: [...ids] }));
      const todos = new Set(pares.flatMap((q) => q.ids));
      if (pares.every((q) => q.ids.length === 1) && todos.size === pares.length) R.con_dos_identificadores++; else R.mismo_identificador_dos_valores++;
      const vs = pares.map((q) => q.v).sort((a, b) => a - b); R.distancia_entre_valores_pct.push(+(100 * (vs[vs.length - 1] - vs[0]) / vs[0]).toFixed(2));
      const adj = x.valor_adjudicado;
      const gan = adj != null ? pares.find((q) => Math.abs(q.v - adj) <= 1) : null;
      if (gan && pares.length === 2 && todos.size === 2) {
        R.ganador_doble.casos++;
        const otra = pares.find((q) => q !== gan); const a = numRpl(gan.ids[0]), b = numRpl(otra.ids[0]);
        if (a === null || b === null) R.ganador_doble.no_se_puede_ordenar++; else if (a > b) R.ganador_doble.adjudicada_la_mas_nueva++; else R.ganador_doble.adjudicada_la_mas_vieja++;
        if (R.ejemplos.length < 8) R.ejemplos.push({ portafolio: id, proveedor: p, adjudicada: gan, otra });
      }
    }
  }
  const d = R.distancia_entre_valores_pct.slice().sort((a, b) => a - b);
  R.distancia_mediana_pct = d.length ? d[Math.floor((d.length - 1) / 2)] : null; delete R.distancia_entre_valores_pct;
  fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  log(`listo: ${salida}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.stack || e.message}`); process.exit(1); });
