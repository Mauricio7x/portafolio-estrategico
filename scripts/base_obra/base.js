"use strict";
/* Base nacional de obra · FASE 1: base limpia, una fila por proceso (17-oct-2026).
   Uso:  node scripts/base_obra/base.js <carpeta_del_inventario>
   Lee lo que dejó inventario.js (p6dx_obra.json y ofertas_cruzadas.json, sueltos o .gz, y
   resumen.json para los ids «sin medir»), baja de jbjy la dirección de ejecución de los
   adjudicados y escribe en la MISMA carpeta base.jsonl.gz (todas las filas, también las
   excluidas con su motivo) y resumen_base.json (conteos, umbrales y señales). Solo mide. */
const fs = require("fs");
const path = require("path");
const zlib = require("zlib");
const { crearCliente, escSoQL } = require("../../lib/socrata");
const L = require("./limpieza");
const F = require("./fila");

const log = (m) => process.stderr.write(m + "\n");
const leerJson = (dir, nombre) => {
  const p = path.join(dir, nombre), pz = p + ".gz";
  if (fs.existsSync(p)) return JSON.parse(fs.readFileSync(p, "utf8"));
  if (fs.existsSync(pz)) return JSON.parse(zlib.gunzipSync(fs.readFileSync(pz)).toString("utf8"));
  return null;
};
const inc = (o, k, n = 1) => { o[k] = (o[k] || 0) + n; };

/* TODOS los valores de contrato de cada proceso (el rescate bajo el 50 % los suma): uno ilegible
   entra como null, que el rescate lee como «no sé» y no rescata. PURA salvo el Map que llena. */
function juntarContratos(filas, contratos = new Map()) {
  for (const x of filas || []) {
    if (!x || !x.proceso_de_compra) continue;
    if (!contratos.has(x.proceso_de_compra)) contratos.set(x.proceso_de_compra, []);
    contratos.get(x.proceso_de_compra).push(L.numeroONull(x.valor_del_contrato));
  }
  return contratos;
}

async function lugares(ids) {
  const C = crearCliente({ baseUrl: "https://www.datos.gov.co/resource/jbjy-vk9h.json", log });
  const out = new Map(); const fallos = [];
  // TODOS los valores de contrato por proceso (el rescate bajo el 50 % los mira todos; `out` guarda la primera fila)
  const contratos = new Map();
  for (let i = 0; i < ids.length; i += 80) {
    const lote = ids.slice(i, i + 80);
    try {
      const r = await C.pedir({ $select: "proceso_de_compra,direcci_n_de_ejecuci_n_del_contrato,proveedor_adjudicado,documento_proveedor,valor_del_contrato",
        $where: `proceso_de_compra in (${lote.map((x) => `'${escSoQL(x)}'`).join(",")})`, $limit: 5000 }, "jbjy lote");
      if (!Array.isArray(r)) throw new Error("jbjy: respuesta no es lista");
      if (r.length >= 5000) throw new Error("jbjy: lote con 5000 filas o más, se pudo cortar");
      for (const x of r) if (!out.has(x.proceso_de_compra)) out.set(x.proceso_de_compra, x);
      juntarContratos(r, contratos);
    } catch (e) { fallos.push({ ids: lote.length, status: e.status || null, error: e.detalle || e.message }); for (const id of lote) out.set(id, undefined); }
  }
  return { out, fallos, contratos };
}

async function main() {
  const dir = process.argv[2];
  if (!dir) { log("uso: node scripts/base_obra/base.js <carpeta_del_inventario>"); process.exit(2); }
  const filas = leerJson(dir, "p6dx_obra.json"), ofertas = leerJson(dir, "ofertas_cruzadas.json"), resumen = leerJson(dir, "resumen.json");
  if (!filas || !ofertas) throw new Error(`faltan p6dx_obra.json u ofertas_cruzadas.json (o su .gz) en ${dir}`);
  const ofertasDe = new Map(ofertas);
  const sinMedir = new Set(((resumen && resumen.fallos_ofertas) || []).map((x) => x.id).filter(Boolean));
  const grupos = new Map();
  for (const f of filas) { if (!f.id_del_portafolio) continue; if (!grupos.has(f.id_del_portafolio)) grupos.set(f.id_del_portafolio, []); grupos.get(f.id_del_portafolio).push(f); }
  const adj = [...grupos].filter(([, fs_]) => L.elegirFila(fs_).adjudicado === "Si").map(([k]) => k);
  const { out: lugar, fallos: fallosJ, contratos } = await lugares(adj);
  const base = [];
  for (const [k, fs_] of grupos) base.push(F.filaDeProceso({ portafolio: k, filas: fs_, ofertas: ofertasDe.get(k), lugar: lugar.get(k) || null, sinMedirOfertas: sinMedir.has(k), valoresContrato: contratos.get(k) || null }));
  const { umbralPlazo, victorias } = F.senales(base);

  // Resumen: exclusiones, competencia y señales por modalidad, partidas por competencia
  const R = { corte_procesos: resumen && resumen.fuentes && resumen.fuentes.procesos && resumen.fuentes.procesos.corte,
    corte_ofertas: resumen && resumen.fuentes && resumen.fuentes.ofertas && resumen.fuentes.ofertas.corte, generado: new Date().toISOString(),
    procesos: base.length, umbral_plazo_corto_dias: umbralPlazo, n_ganador_repetido: F.N_GANADOR_REPETIDO,
    interes: { minimo: F.INTERES_MIN, ofertas_max: F.OFERTAS_MAX_CON_INTERES }, jbjy_fallos: fallosJ, por_modalidad: {} };
  for (const x of base) {
    const m = R.por_modalidad[x.modalidad] || (R.por_modalidad[x.modalidad] = { total: 0, excluidos: {}, real: 0, baja: 0, senales: { real: {}, baja: {} },
      ganador_identificado: 0, oferta_ganadora_hallada: 0, ubicacion_desde_direccion: 0, usables: 0 });
    m.total++;
    if (x.excluido) { inc(m.excluidos, x.excluido); continue; }
    m.usables++; m[x.competencia]++;
    if (x.ganador_id) m.ganador_identificado++;
    if (x.oferta_ganadora) m.oferta_ganadora_hallada++;
    if (x.ubicacion_fuente) m.ubicacion_desde_direccion++;
    for (const [s, v] of Object.entries(x.senales)) { const t = m.senales[x.competencia][s] || (m.senales[x.competencia][s] = { si: 0, no: 0, sin_dato: 0 }); t[v === null ? "sin_dato" : v ? "si" : "no"]++; }
  }
  // Sensibilidad del N del ganador repetido (cuántas parejas entidad–ganador alcanzan N)
  R.sensibilidad_ganador_repetido = Object.fromEntries([2, 3, 4, 5].map((n) => [n, [...victorias.values()].filter((v) => v >= n).length]));
  R.parejas_entidad_ganador = victorias.size;
  // Proporción REAL marcada por cada señal y modalidad (con días enteros el percentil empata)
  R.proporcion_marcada = {};
  for (const [m, v] of Object.entries(R.por_modalidad)) {
    R.proporcion_marcada[m] = {};
    for (const s of ["una_oferta", "adjudicado_99_con_una", "plazo_corto", "ganador_repetido", "interes_sin_ofertas"]) {
      const si = ["real", "baja"].reduce((a, c) => a + ((v.senales[c][s] || {}).si || 0), 0);
      const con = ["real", "baja"].reduce((a, c) => a + ((v.senales[c][s] || {}).si || 0) + ((v.senales[c][s] || {}).no || 0), 0);
      R.proporcion_marcada[m][s] = { marcados: si, con_dato: con, pct: con ? Math.round(1000 * si / con) / 10 : null };
    }
  }
  /* Censo del contrato (en vez de la muestra de 30): ¿el contratista de jbjy es el ganador de p6dx
     y el valor del contrato es el adjudicado? Mismo SECOP II: coherencia interna, no validación
     externa. Un valor mayor suele ser adición (en la muestra, 9 de 9 con modificación registrada). */
  const { compararConContrato } = require("./muestra");
  const censo = { procesos: 0, sin_contrato: 0, sin_medir: 0, ganador: { si: 0, no: 0, sin_dato: 0 }, valor: { igual: 0, mayor: 0, menor: 0, sin_dato: 0 } };
  for (const x of base) {
    if (!x.competencia) continue;
    censo.procesos++;
    const c = lugar.get(x.portafolio);
    if (c === undefined && lugar.has(x.portafolio)) { censo.sin_medir++; continue; }
    if (!c) { censo.sin_contrato++; continue; }
    const k = compararConContrato(x, c);
    censo.ganador[k.mismo_ganador === null ? "sin_dato" : k.mismo_ganador ? "si" : "no"]++;
    censo.valor[k.valor_igual_adjudicado === null ? "sin_dato" : k.valor_igual_adjudicado ? "igual" : k.diferencia_valor_pct > 0 ? "mayor" : "menor"]++;
  }
  R.censo_contrato = censo;
  R.validas_frente_a_respuestas = base.filter((x) => x.competencia).reduce((a, x) => {
    const r = x.respuestas_publicadas; a[r === null ? "sin_dato" : x.n_validas === r ? "iguales" : x.n_validas < r ? "menos_validas" : "mas_validas"]++; return a;
  }, { iguales: 0, menos_validas: 0, mas_validas: 0, sin_dato: 0 });
  R.inconsistencias = base.reduce((a, x) => { if (x.inconsistencia) a[x.inconsistencia] = (a[x.inconsistencia] || 0) + 1; return a; }, {});

  fs.writeFileSync(path.join(dir, "base.jsonl.gz"), zlib.gzipSync(base.map((x) => JSON.stringify(x)).join("\n")));
  fs.writeFileSync(path.join(dir, "resumen_base.json"), JSON.stringify(R, null, 1));
  log(`listo: ${base.length} procesos · ${path.join(dir, "base.jsonl.gz")}`);
}

if (require.main === module) main().catch((e) => { log(`FALLO: ${e.detalle || e.message}`); process.exit(1); });
module.exports = { leerJson, juntarContratos };
