"use strict";
/* Probabilidad de adjudicación · ¿«dos contratistas distintos = lote»? La guarda, MEDIDA y sin ponerla (26-oct-2026).
   Uso:  node tools/analisis/adjudicacion/contratistas_distintos.js <carpeta_de_la_base> <salida.json> [carpeta_2024]
   Pide a jbjy-vk9h los contratos de cada proceso usable (fase0.usableMotor) de licitación, menor cuantía y
   mínima, une a los contratistas con la regla de la base (limpieza.proveedoresUnidos: NIT válido o nombre) y
   cuenta los procesos con DOS o más contratistas distintos: lo que haría un lote que p6dx no declara
   (`numero_de_lotes` 0). Para cada uno mira si la suma de los contratos pasa el precio base y si el
   adjudicatario de p6dx está entre los contratistas. Después estima qué movería la guarda si se pusiera: los
   usables, el techo (techo.js) y, con la carpeta de 2024 en adelante, el conteo de la alerta de precio bajo
   (cifras.umbralAlerta). NO cambia ninguna regla. Una tanda que falla deja sus procesos «sin_medir», jamás 0. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { crearCliente, escSoQL } = require("../../../lib/socrata");
const L = require("../../../scripts/base_obra/limpieza");
const { umbralAlerta } = require("../../../scripts/base_obra/cifras");
const { usableMotor } = require("./fase0");
const { techo } = require("./techo");

const MODS = ["licitacion", "menor_cuantia", "minima"];
const TANDA = 80;
const log = (m) => process.stderr.write(m + "\n");
const leerBase = (dir) => zlib.gunzipSync(fs.readFileSync(path.join(dir, "base.jsonl.gz"))).toString("utf8").split("\n").filter(Boolean).map((l) => JSON.parse(l));
const anulado = (e) => /cancel|anula|termin.*anticip/i.test(String(e || ""));

/* Contratistas distintos de UN proceso, con la identidad unida de la base. Los contratos cancelados o anulados se
   cuentan aparte: un contrato que no se firmó no es otro lote. */
function contratistas(contratos, ganador) {
  const filas = contratos.map((c) => ({ nit_del_proveedor: c.documento_proveedor, nombre_proveedor: c.proveedor_adjudicado, _c: c }));
  const g = ganador ? { nit_del_proveedor: ganador.nit, nombre_proveedor: ganador.nombre } : null;
  const prov = L.proveedoresUnidos(g ? [...filas, g] : filas);
  const vigentes = filas.filter((f) => !anulado(f._c.estado_contrato));
  const ids = (fs_) => new Set(fs_.map((f) => prov(f)).filter(Boolean));
  const idG = g ? prov(g) : null;
  return { todos: ids(filas).size, vigentes: ids(vigentes).size, ganador_entre_ellos: idG ? ids(filas).has(idG) : null,
    suma_vigentes: vigentes.reduce((s, f) => { const v = L.numeroONull(f._c.valor_del_contrato); return v === null || s === null ? null : s + v; }, 0) };
}

async function main() {
  const [dir, salida, dir2024] = process.argv.slice(2);
  if (!dir || !salida) { log("uso: node tools/analisis/adjudicacion/contratistas_distintos.js <carpeta_de_la_base> <salida.json> [carpeta_2024]"); process.exit(2); }
  const base = leerBase(dir);
  const filasP = JSON.parse(fs.readFileSync(path.join(dir, "p6dx_obra.json"), "utf8"));
  const lotesDe = new Map();
  for (const f of filasP) { const n = L.numeroONull(f.numero_de_lotes); if (n !== null) lotesDe.set(f.id_del_portafolio, Math.max(lotesDe.get(f.id_del_portafolio) ?? 0, n)); }
  const us = base.filter((x) => MODS.includes(x.modalidad) && usableMotor(x));
  const C = crearCliente({ baseUrl: "https://www.datos.gov.co/resource/jbjy-vk9h.json", log });
  const contratosDe = new Map(), sinMedir = new Set();
  const ids = us.map((x) => x.portafolio);
  for (let i = 0; i < ids.length; i += TANDA) {
    const lote = ids.slice(i, i + TANDA);
    if (i % (TANDA * 20) === 0) log(`jbjy: ${i}/${ids.length}`);
    try {
      const r = await C.pedir({ $select: "proceso_de_compra,id_contrato,proveedor_adjudicado,documento_proveedor,valor_del_contrato,estado_contrato",
        $where: `proceso_de_compra in (${lote.map((x) => `'${escSoQL(x)}'`).join(",")})`, $limit: 5000 }, "jbjy tanda", { plazoMs: 120000 });
      if (!Array.isArray(r) || r.length >= 5000) throw new Error(`respuesta no usable (${Array.isArray(r) ? r.length + " filas, tope" : "no es lista"})`);
      for (const c of r) { if (!contratosDe.has(c.proceso_de_compra)) contratosDe.set(c.proceso_de_compra, []); contratosDe.get(c.proceso_de_compra).push(c); }
    } catch (e) { for (const id of lote) sinMedir.add(id); log(`SIN MEDIR ${lote.length} ids: ${e.detalle || e.message}`); }
  }
  const R = { generado: new Date().toISOString(), fuente: "jbjy-vk9h", por_modalidad: {}, ejemplos: [] };
  const guarda = new Set();   // procesos que la guarda apartaría
  for (const m of MODS) {
    const c = { usables: 0, sin_medir: 0, sin_contrato: 0, con_contrato: 0, un_contratista: 0, dos_o_mas_contratistas: 0, dos_o_mas_vigentes: 0,
      de_esos_numero_de_lotes_0: 0, de_esos_suma_sobre_precio_base: 0, de_esos_ganador_entre_ellos: 0 };
    for (const x of us.filter((y) => y.modalidad === m)) {
      c.usables++;
      if (sinMedir.has(x.portafolio)) { c.sin_medir++; continue; }
      const cs = contratosDe.get(x.portafolio) || [];
      if (!cs.length) { c.sin_contrato++; continue; }
      c.con_contrato++;
      const k = contratistas(cs, { nit: x.ganador_nit, nombre: x.ganador });
      if (k.todos >= 2) c.dos_o_mas_contratistas++; else c.un_contratista++;
      if (k.vigentes < 2) continue;
      c.dos_o_mas_vigentes++; guarda.add(x.portafolio);
      if ((lotesDe.get(x.portafolio) ?? 0) <= 1) c.de_esos_numero_de_lotes_0++;
      if (k.suma_vigentes !== null && x.precio_base > 0 && k.suma_vigentes > x.precio_base + 1) c.de_esos_suma_sobre_precio_base++;
      if (k.ganador_entre_ellos) c.de_esos_ganador_entre_ellos++;
      if (R.ejemplos.length < 12) R.ejemplos.push({ portafolio: x.portafolio, modalidad: m, precio_base: x.precio_base, valor_adjudicado: x.valor_adjudicado, ganador: x.ganador,
        contratos: cs.map((y) => ({ id: y.id_contrato, contratista: y.proveedor_adjudicado, documento: y.documento_proveedor, valor: y.valor_del_contrato, estado: y.estado_contrato })) });
    }
    R.por_modalidad[m] = c;
  }
  /* Qué movería la guarda: usables y techo (2020 en adelante) y, si se da la carpeta, el conteo de la alerta. */
  const sinGuarda = base, conGuarda = base.filter((x) => !guarda.has(x.portafolio));
  const t0 = techo(sinGuarda), t1 = techo(conGuarda);
  R.efecto = { procesos_que_apartaria: guarda.size,
    techo: Object.fromEntries(["licitacion", "menor_cuantia"].map((m) => [m, { antes: { procesos: t0[m].total.procesos, techo_pct: t0[m].total.pct.techo }, con_guarda: { procesos: t1[m].total.procesos, techo_pct: t1[m].total.pct.techo } }])) };
  if (dir2024) {
    const b24 = leerBase(dir2024), uA = b24.filter((x) => x.competencia), uB = uA.filter((x) => !guarda.has(x.portafolio));
    const resumen = (u) => Object.fromEntries(Object.entries(umbralAlerta(u)).map(([mm, filas]) => [mm, (filas || []).filter((f) => [70, 88].includes(f.corte_pct)).map((f) => ({ corte_pct: f.corte_pct, ganadoras: f.todas.ganadoras, bajo_el_corte: f.todas.bajo_el_corte }))]));
    R.efecto.alerta_2024 = { antes: resumen(uA), con_guarda: resumen(uB), nota: "La guarda se calcula con los contratos de la base desde 2020; un proceso de 2024 en adelante que no esté en ella no se aparta." };
  }
  fs.writeFileSync(salida, JSON.stringify(R, null, 1) + "\n");
  log(`listo: ${salida}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.stack || e.message}`); process.exit(1); });
module.exports = { contratistas, anulado };
